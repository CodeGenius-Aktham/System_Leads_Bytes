/* ==========================================================================
   src/store/firebase.js
   Carga perezosa y compartida del SDK de Firebase.

   Auth y Firestore tienen que usar la MISMA instancia de la app: llamar
   `initializeApp` dos veces con el mismo nombre lanza un error. Este módulo
   la crea una sola vez y memoriza la promesa, así quien la necesite la pide
   sin coordinarse con el resto.

   El SDK se importa sólo si la sincronización está activada en config.js, de
   modo que el sistema siga abriéndose sin red ni configuración.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  var VERSION = '10.12.2';
  var CDN = 'https://www.gstatic.com/firebasejs/' + VERSION + '/';
  var pending = null;

  function config() { return window.BYTES_SYNC_CONFIG || {}; }

  /** ¿Hay un proyecto de Firebase configurado y activo? */
  function isEnabled() {
    var cfg = config();
    return !!(cfg.enabled && cfg.firebase && cfg.firebase.projectId);
  }

  /** ¿Se exige iniciar sesión? Sólo tiene sentido con Firebase activo. */
  function requiresAuth() {
    return isEnabled() && config().requireAuth !== false;
  }

  /**
   * Carga el SDK y devuelve las piezas ya inicializadas.
   * @returns {Promise<{app, fs, db, authMod, auth}>}
   */
  function load() {
    if (pending) return pending;
    if (!isEnabled()) {
      pending = Promise.reject(new Error('Firebase no está configurado'));
      return pending;
    }
    pending = Promise.all([
      import(CDN + 'firebase-app.js'),
      import(CDN + 'firebase-firestore.js'),
      import(CDN + 'firebase-auth.js')
    ]).then(function (mods) {
      var app = mods[0].initializeApp(config().firebase);
      return {
        app: app,
        fs: mods[1],
        db: mods[1].getFirestore(app),
        authMod: mods[2],
        auth: mods[2].getAuth(app)
      };
    });
    return pending;
  }

  Bytes.firebase = { load: load, isEnabled: isEnabled, requiresAuth: requiresAuth };
})(window.Bytes);
