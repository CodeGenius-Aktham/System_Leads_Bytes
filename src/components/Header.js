/* ==========================================================================
   src/components/Header.js
   Cabecera estática: logo + navegación principal (Leads / Clasificados).
   Solo despacha acciones; el estado activo se deriva del store.
   ========================================================================== */
(function (Bytes) {
  'use strict';

  function create(root) {
    var store = Bytes.store;
    var buttons = Array.prototype.slice.call(root.querySelectorAll('.nav-btn'));
    var totalBadge = document.getElementById('global-total');
    var brand = root.querySelector('.brand');

    // El isotipo de la cabecera devuelve a la pantalla inicial.
    if (brand) brand.addEventListener('click', function () { store.actions.goHome(); });

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        store.actions.setView(btn.dataset.view);
      });
    });

    function render(state) {
      buttons.forEach(function (btn) {
        var active = btn.dataset.view === state.view;
        btn.classList.toggle('is-active', active);
        if (active) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      });
      if (totalBadge) totalBadge.textContent = String(store.selectors.globalCounts().total);
    }

    return { render: render };
  }

  Bytes.Header = { create: create };
})(window.Bytes);
