/* ==========================================================================
   src/store/auth.js
   Inicio de sesión con Firebase Authentication (email + contraseña).

   Para qué: el sistema tiene los teléfonos de 80 prospectos en una URL
   pública. Sin sesión, cualquiera que la encuentre los lee y puede cambiar
   estados. Con sesión, además, la autoría de cada cambio deja de ser
   declarativa: `updatedBy` sale de la cuenta, no de un desplegable.

   Sin Firebase configurado el módulo queda inactivo y el sistema funciona
   como antes (modo local, sin puerta de entrada).
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  var listeners = [];
  var state = { ready: false, user: null, error: null };
  var pieces = null;

  function config() { return window.BYTES_SYNC_CONFIG || {}; }

  /**
   * Nombre a mostrar y a sellar en cada cambio. Orden de preferencia:
   *   1. el mapa `userNames` de config.js (control explícito)
   *   2. el displayName de la cuenta
   *   3. la parte local del email, capitalizada
   * Debe coincidir con los `owner` de los leads para que el filtro
   * "solo mis leads" funcione.
   */
  function nameFor(user) {
    if (!user) return '';
    var email = (user.email || '').toLowerCase();
    var map = config().userNames || {};
    if (map[email]) return map[email];
    if (user.displayName) return user.displayName;
    var local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
  }

  function emit() {
    listeners.forEach(function (fn) { fn(getState()); });
  }

  function getState() {
    return {
      ready: state.ready,
      user: state.user,
      name: nameFor(state.user),
      error: state.error
    };
  }

  /** Se suscribe a los cambios de sesión. Dispara con el estado actual. */
  function onUser(fn) {
    listeners.push(fn);
    fn(getState());
    return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  /**
   * Arranca el observador de sesión. Firebase recuerda la sesión en el
   * dispositivo, así que al volver no hay que escribir la contraseña.
   */
  function start() {
    if (!Bytes.firebase.requiresAuth()) {
      state.ready = true;
      emit();
      return;
    }
    Bytes.firebase.load().then(function (p) {
      pieces = p;
      p.authMod.onAuthStateChanged(p.auth, function (user) {
        state.user = user || null;
        state.ready = true;
        state.error = null;
        emit();
      }, function (err) {
        state.ready = true;
        state.error = err && err.message;
        emit();
      });
    }).catch(function (err) {
      // Sin SDK no se puede validar la sesión: la puerta queda cerrada y el
      // motivo se informa en pantalla.
      state.ready = true;
      state.error = err && err.message;
      emit();
    });
  }

  /**
   * Inicia sesión.
   * @returns {Promise} se rechaza con un mensaje ya traducido
   */
  function signIn(email, password) {
    return Bytes.firebase.load().then(function (p) {
      return p.authMod.signInWithEmailAndPassword(p.auth, email.trim(), password);
    }).catch(function (err) {
      throw new Error(messageFor(err));
    });
  }

  /** Cierra la sesión y borra el caché local de datos del equipo. */
  function signOut() {
    try { window.localStorage.removeItem(Bytes.sync.CACHE_KEY); } catch (err) { /* noop */ }
    if (!pieces) return Promise.resolve();
    return pieces.authMod.signOut(pieces.auth);
  }

  /** Traduce los códigos de Firebase a algo que se entienda. */
  function messageFor(err) {
    var code = (err && err.code) || '';
    var MAP = {
      'auth/invalid-email': 'El correo no tiene un formato válido.',
      'auth/user-disabled': 'Esta cuenta está deshabilitada.',
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'La contraseña no es correcta.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Esperá unos minutos.',
      'auth/network-request-failed': 'Sin conexión. Revisá la red e intentá de nuevo.',
      'auth/missing-password': 'Escribí la contraseña.',
      'auth/operation-not-allowed':
        'El método "Correo electrónico/contraseña" no está habilitado en Firebase ' +
        '(Authentication › Sign-in method).',
      'auth/unauthorized-domain':
        'Este dominio no está autorizado en Firebase. Agregalo en ' +
        'Authentication › Settings › Dominios autorizados.',
      'auth/internal-error': 'Firebase devolvió un error interno. Reintentá en un momento.'
    };
    if (MAP[code]) return MAP[code];
    return (err && err.message) || 'No se pudo iniciar sesión.';
  }

  Bytes.auth = {
    start: start,
    onUser: onUser,
    getState: getState,
    signIn: signIn,
    signOut: signOut,
    nameFor: nameFor
  };
})(window.Bytes);
