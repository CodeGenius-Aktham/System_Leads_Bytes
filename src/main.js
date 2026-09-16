/* ==========================================================================
   src/main.js
   Bootstrap: inicializa el store, instancia las vistas y las suscribe.
   Cada cambio de estado provoca el re-render de la vista activa únicamente.
   ========================================================================== */
(function (Bytes) {
  'use strict';

  function boot() {
    var store = Bytes.store;
    store.init();

    var header = Bytes.Header.create(document.getElementById('app-header'));
    var leadsRoot = document.getElementById('view-leads');
    var classifiedRoot = document.getElementById('view-clasificados');

    var homeRoot = document.getElementById('view-home');

    var views = {
      leads: { root: leadsRoot, api: Bytes.LeadsView.create(leadsRoot) },
      clasificados: { root: classifiedRoot, api: Bytes.ClassifiedView.create(classifiedRoot) }
    };

    function render(state) {
      header.render(state);
      // `view === null` -> pantalla inicial: solo la marca, sin módulo cargado.
      homeRoot.classList.toggle('is-hidden', state.view !== null);
      Object.keys(views).forEach(function (name) {
        var view = views[name];
        var isActive = state.view === name;
        view.root.classList.toggle('is-hidden', !isActive);
        if (isActive) view.api.render(state);
      });
    }

    store.subscribe(render);

    /* ------------------------- Puerta de entrada -------------------------
       Con Firebase configurado, nada se muestra ni se sincroniza hasta que
       haya sesión. Sin configurar, el sistema abre directo en modo local. */
    var gate = Bytes.LoginGate.create(document.body);
    var shell = [document.getElementById('app-header'), document.getElementById('app-root')];
    var syncing = false;

    function startSync() {
      if (syncing) return;
      syncing = true;
      // Cada mapa que llega del backend se aplica al store, que emite y
      // re-renderiza la vista activa.
      Bytes.sync.start(function (map) { store.applyRemote(map); });
    }

    function showShell(on) {
      shell.forEach(function (node) { if (node) node.classList.toggle('is-hidden', !on); });
    }

    if (Bytes.firebase.requiresAuth()) {
      Bytes.auth.onUser(function (session) {
        gate.render(session);
        showShell(!!session.user);
        if (session.user) {
          startSync();
          render(store.getState());     // refresca cabecera con la sesión
        } else {
          syncing = false;
          store.actions.goHome();       // al volver, se arranca desde la marca
          if (session.ready && !session.error) gate.focus();
        }
      });
      Bytes.auth.start();
    } else {
      gate.render({ ready: true, user: null, name: '', error: null });
      gate.el.classList.add('is-hidden');
      showShell(true);
      startSync();
    }

    // Arranque sin ningún botón presionado ni carpeta abierta.
    render(store.getState());

    // Atajo: Escape cierra la ficha o vuelve al listado de sectores.
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      var state = store.getState();
      if (state.view === 'leads' && state.selectedLeadId) store.actions.closeLead();
      else if (state.view === 'clasificados' && state.classifiedSectorId) store.actions.closeClassifiedSector();
      else if (state.view !== null) store.actions.goHome();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Bytes);
