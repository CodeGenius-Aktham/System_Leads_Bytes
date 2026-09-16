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

    var views = {
      leads: { root: leadsRoot, api: Bytes.LeadsView.create(leadsRoot) },
      clasificados: { root: classifiedRoot, api: Bytes.ClassifiedView.create(classifiedRoot) }
    };

    function render(state) {
      header.render(state);
      Object.keys(views).forEach(function (name) {
        var view = views[name];
        var isActive = state.view === name;
        view.root.classList.toggle('is-hidden', !isActive);
        if (isActive) view.api.render(state);
      });
    }

    store.subscribe(render);

    // Estado inicial: abrimos la primera carpeta con datos para que el
    // prototipo muestre contenido desde el primer render.
    var firstSector = store.selectors.visibleSectors()[0];
    if (firstSector) store.actions.selectSector(firstSector.id);
    else render(store.getState());

    // Atajo: Escape cierra la ficha o vuelve al listado de sectores.
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      var state = store.getState();
      if (state.view === 'leads' && state.selectedLeadId) store.actions.closeLead();
      else if (state.view === 'clasificados' && state.classifiedSectorId) store.actions.closeClassifiedSector();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.Bytes);
