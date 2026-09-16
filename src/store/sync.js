/* ==========================================================================
   src/store/sync.js
   Sincronización del estado comercial de los leads entre dispositivos.

   Problema que resuelve: si Jorge marca "Rechazado" desde su teléfono, Moises
   tiene que verlo desde el suyo. `localStorage` no alcanza porque es por
   navegador.

   Diseño: un backend intercambiable con dos operaciones.

     subscribe(onChange) -> unsubscribe    // empuja el mapa completo de estados
     write(leadId, record) -> Promise      // publica el cambio de un lead

   Hay dos implementaciones:
     · LocalBackend     — localStorage + BroadcastChannel. Sincroniza entre
                          pestañas del mismo dispositivo. Es el fallback y
                          además el caché offline.
     · FirestoreBackend — Firestore con `onSnapshot`: tiempo real entre
                          dispositivos. Se activa desde src/config.js.

   Un registro por lead (no un documento único con todos) para que dos
   personas que marcan leads distintos al mismo tiempo no se pisen.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  var CACHE_KEY = 'bytes.leads.status.v1';   // caché local / backend local
  var USER_KEY  = 'bytes.user.v1';           // quién está operando este equipo
  var CHANNEL   = 'bytes.leads.sync';

  var backend = null;
  var unsubscribe = null;
  var statusListeners = [];
  var current = { mode: 'local', state: 'idle', error: null };

  /* ----------------------------------------------------- almacenamiento local */
  function readCache() {
    try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}') || {}; }
    catch (err) { return {}; }   // modo privado o storage bloqueado
  }
  function writeCache(map) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(map)); }
    catch (err) { /* sin caché: la app sigue funcionando en memoria */ }
  }

  /**
   * Quién firma los cambios.
   *
   * Con sesión iniciada sale de la cuenta y no se puede falsear. Sin Firebase
   * (modo local) cae al desplegable "Soy" de la cabecera, que es declarativo.
   */
  function identity(name) {
    if (name === undefined) {
      if (Bytes.auth) {
        var session = Bytes.auth.getState();
        if (session.name) return session.name;
        if (Bytes.firebase && Bytes.firebase.requiresAuth()) return '';
      }
      try { return window.localStorage.getItem(USER_KEY) || ''; }
      catch (err) { return ''; }
    }
    try { window.localStorage.setItem(USER_KEY, name); } catch (err) { /* noop */ }
    return name;
  }

  /* ------------------------------------------------------------ estado del canal */
  function setState(state, error) {
    if (current.state === state && current.error === (error || null)) return;
    current.state = state;
    current.error = error || null;
    statusListeners.forEach(function (fn) { fn(getStatus()); });
  }
  function getStatus() {
    return { mode: current.mode, state: current.state, error: current.error };
  }
  function onStatus(fn) {
    statusListeners.push(fn);
    fn(getStatus());
    return function () {
      statusListeners = statusListeners.filter(function (l) { return l !== fn; });
    };
  }

  /* ------------------------------------------------------------- backend local */
  function LocalBackend() {
    var channel = null;
    try { channel = new window.BroadcastChannel(CHANNEL); } catch (err) { channel = null; }

    return {
      name: 'local',
      subscribe: function (onChange) {
        onChange(readCache());
        setState('local-only');
        var relay = function () { onChange(readCache()); };
        if (channel) channel.addEventListener('message', relay);
        // `storage` cubre las pestañas donde BroadcastChannel no esté disponible
        window.addEventListener('storage', relay);
        return function () {
          if (channel) channel.removeEventListener('message', relay);
          window.removeEventListener('storage', relay);
        };
      },
      write: function (leadId, record) {
        var map = readCache();
        map[leadId] = record;
        writeCache(map);
        if (channel) channel.postMessage({ leadId: leadId });
        return Promise.resolve();
      }
    };
  }

  /* --------------------------------------------------------- backend Firestore */
  function FirestoreBackend(config) {
    var mods = null;
    var db = null;
    var path = config.collection || 'leadStatus';

    // Instancia compartida con Auth: ver src/store/firebase.js
    var ready = Bytes.firebase.load().then(function (p) {
      mods = p.fs;
      db = p.db;
    });

    return {
      name: 'firestore',
      subscribe: function (onChange) {
        var stop = function () { /* aún no suscripto */ };
        setState('connecting');
        ready.then(function () {
          stop = mods.onSnapshot(mods.collection(db, path), function (snap) {
            var map = {};
            snap.forEach(function (docSnap) { map[docSnap.id] = docSnap.data(); });
            onChange(map);
            setState('live');
          }, function (err) {
            setState('error', err && err.message);
          });
        }).catch(function (err) {
          setState('error', err && err.message);
        });
        return function () { stop(); };
      },
      write: function (leadId, record) {
        // Optimista: el cambio ya se aplicó local; si falla, se avisa.
        var map = readCache();
        map[leadId] = record;
        writeCache(map);
        return ready.then(function () {
          return mods.setDoc(mods.doc(db, path, leadId), record, { merge: true });
        }).catch(function (err) {
          setState('error', err && err.message);
          throw err;
        });
      }
    };
  }

  /* ----------------------------------------------------------------- API pública */

  /** Elige el backend según src/config.js. */
  function create() {
    if (Bytes.firebase.isEnabled()) {
      current.mode = 'firestore';
      return FirestoreBackend(window.BYTES_SYNC_CONFIG || {});
    }
    current.mode = 'local';
    return LocalBackend();
  }

  /**
   * Primera sincronización: publica lo que este equipo marcó sin conexión —o
   * antes de que existiera el canal compartido— si el servidor no lo tiene o
   * lo tiene más viejo.
   *
   * Sin esto, conectar por primera vez contra una base vacía borraría los
   * cambios que ya estaban guardados en el dispositivo.
   *
   * @param {Object} remote  el mapa que acaba de llegar del backend
   * @returns {Object} el mapa reconciliado
   */
  function reconcile(remote) {
    var local = readCache();
    var merged = Object.assign({}, remote);
    Object.keys(local).forEach(function (leadId) {
      var mine = local[leadId];
      var theirs = remote[leadId];
      if (!mine || !mine.status) return;
      if (theirs && (theirs.ts || 0) >= (mine.ts || 0)) return;   // el servidor manda
      merged[leadId] = mine;
      backend.write(leadId, mine);
    });
    return merged;
  }

  /**
   * Arranca la sincronización.
   * @param {Function} onChange  recibe el mapa { leadId: {status, updatedAt, updatedBy, ts} }
   */
  function start(onChange) {
    if (!backend) backend = create();
    if (unsubscribe) unsubscribe();

    var first = true;
    unsubscribe = backend.subscribe(function (remote) {
      remote = remote || {};
      if (first) {
        first = false;
        remote = reconcile(remote);
      }
      writeCache(remote);     // espejo offline para el próximo arranque
      onChange(remote);
    });
    return function () { if (unsubscribe) unsubscribe(); unsubscribe = null; };
  }

  /** Publica el cambio de estado de un lead. */
  function push(leadId, record) {
    if (!backend) backend = create();
    return backend.write(leadId, record);
  }

  /** Corta la suscripción y olvida el backend (se usa al cerrar sesión). */
  function stop() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    backend = null;
    setState('idle');
  }

  /** Inyecta un backend propio (lo usan las pruebas y un backend alternativo). */
  function useBackend(custom, mode) {
    backend = custom;
    current.mode = mode || 'custom';
    return backend;
  }

  Bytes.sync = {
    start: start,
    stop: stop,
    push: push,
    identity: identity,
    onStatus: onStatus,
    getStatus: getStatus,
    useBackend: useBackend,
    readCache: readCache,
    CACHE_KEY: CACHE_KEY,
    USER_KEY: USER_KEY
  };
})(window.Bytes);
