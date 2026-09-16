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

  /** Identidad del operador: se adjunta a cada cambio para saber quién lo hizo. */
  function identity(name) {
    if (name === undefined) {
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

    // El SDK se carga sólo si la sincronización está activada.
    var ready = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
    ]).then(function (loaded) {
      mods = loaded[1];
      db = mods.getFirestore(loaded[0].initializeApp(config.firebase));
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
            writeCache(map);          // espejo offline para el próximo arranque
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
    var cfg = window.BYTES_SYNC_CONFIG || {};
    if (cfg.enabled && cfg.firebase && cfg.firebase.projectId) {
      current.mode = 'firestore';
      return FirestoreBackend(cfg);
    }
    current.mode = 'local';
    return LocalBackend();
  }

  /**
   * Arranca la sincronización.
   * @param {Function} onChange  recibe el mapa { leadId: {status, updatedAt, updatedBy, ts} }
   */
  function start(onChange) {
    if (!backend) backend = create();
    if (unsubscribe) unsubscribe();
    unsubscribe = backend.subscribe(onChange);
    return function () { if (unsubscribe) unsubscribe(); unsubscribe = null; };
  }

  /** Publica el cambio de estado de un lead. */
  function push(leadId, record) {
    if (!backend) backend = create();
    return backend.write(leadId, record);
  }

  /** Inyecta un backend propio (lo usan las pruebas y un backend alternativo). */
  function useBackend(custom, mode) {
    backend = custom;
    current.mode = mode || 'custom';
    return backend;
  }

  Bytes.sync = {
    start: start,
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
