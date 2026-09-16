/* ==========================================================================
   src/components/LeadsView.js
   Vista "Leads" — dos columnas:
     · IZQUIERDA : barra de filtros por estado + lista de leads
     · DERECHA   : carpetas por sector (nivel 1)  →  ficha del lead (nivel 2)
   El panel derecho es un único contenedor que alterna entre ambos niveles.
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;

  function create(root) {
    var store = Bytes.store;

    /* ------------------------- hijos ------------------------- */
    var filterBar = Bytes.StatusFilterBar.create();
    var leadList = Bytes.LeadList.create();
    var leadDetail = Bytes.LeadDetail.create();
    var folders = Bytes.SectorFolders.create({
      onSelect: function (sectorId) { store.actions.selectSector(sectorId); },
      getActiveId: function (state) { return state.selectedSectorId; }
    });

    /* --------------------- columna izquierda --------------------- */
    var leftTitle = h('h2', { class: 'panel__title' });
    var leftSubtitle = h('p', { class: 'panel__subtitle' });
    var searchInput = h('input', {
      class: 'search-input', type: 'search',
      placeholder: 'Buscar por nombre, teléfono o dirección…',
      'aria-label': 'Buscar leads'
    });
    searchInput.addEventListener('input', function () {
      store.actions.setSearch(searchInput.value);
    });

    var searchWrap = h('div', { class: 'search-field', style: { marginTop: '12px' } }, icon('search'), searchInput);
    var leftHead = h('div', { class: 'panel__head' }, leftTitle, leftSubtitle, searchWrap);
    var leftBody = h('div', { class: 'panel__body panel__body--flush scroll-y' }, leadList.el);
    var leftPanel = h('section', { class: 'panel panel--left', 'aria-label': 'Lista de leads' }, leftHead, filterBar.el, leftBody);

    /* ---------------------- columna derecha ---------------------- */
    var rightTitle = h('h2', { class: 'panel__title' });
    var rightSubtitle = h('p', { class: 'panel__subtitle' });
    var rightHead = h('div', { class: 'panel__head' }, rightTitle, rightSubtitle);
    var rightBody = h('div', { class: 'panel__body scroll-y' });
    var rightPanel = h('aside', { class: 'panel panel--right', 'aria-label': 'Sectores y ficha del lead' }, rightHead, rightBody);

    root.appendChild(h('div', { class: 'leads-layout' }, leftPanel, rightPanel));

    /* -------------------------- render -------------------------- */
    function render(state) {
      renderLeft(state);
      renderRight(state);
    }

    function renderLeft(state) {
      var sector = store.selectors.sectorById(state.selectedSectorId);

      Bytes.dom.mount(leftTitle, [icon('users', 'icon--lg'), h('span', { text: sector ? 'Leads · ' + sector.name : 'Leads' })]);

      if (!sector) {
        leftSubtitle.textContent = 'Elegí una carpeta de sector en el panel derecho para ver sus leads.';
        searchWrap.classList.add('is-hidden');
        filterBar.el.classList.add('is-hidden');
        Bytes.dom.mount(leftBody, h('div', { class: 'empty-state' },
          h('div', { class: 'empty-state__icon' }, icon('folder')),
          h('p', { class: 'empty-state__title', text: 'Ningún sector seleccionado' }),
          h('p', { class: 'empty-state__text', text: 'Las carpetas de la derecha agrupan los leads por rubro. Seleccioná una para trabajar sobre su lista.' })
        ));
        return;
      }

      searchWrap.classList.remove('is-hidden');
      filterBar.el.classList.remove('is-hidden');

      var visible = store.selectors.filteredLeads().length;
      var total = store.selectors.leadsBySector(sector.id).length;
      leftSubtitle.textContent = 'Mostrando ' + visible + ' de ' + total + ' leads del rubro.';

      filterBar.render(state);
      if (leftBody.firstChild !== leadList.el) Bytes.dom.mount(leftBody, leadList.el);
      leadList.render(state);
    }

    function renderRight(state) {
      var showingDetail = !!state.selectedLeadId;

      if (showingDetail) {
        Bytes.dom.mount(rightTitle, [icon('users', 'icon--lg'), h('span', { text: 'Ficha del lead' })]);
        rightSubtitle.textContent = 'Datos de contacto, accesos directos y estado comercial.';
        if (rightBody.firstChild !== leadDetail.el) Bytes.dom.mount(rightBody, leadDetail.el);
        leadDetail.render(state);
        return;
      }

      var sectors = store.selectors.visibleSectors();
      Bytes.dom.mount(rightTitle, [icon('folder', 'icon--lg'), h('span', { text: 'Sectores' })]);
      rightSubtitle.textContent = sectors.length + ' rubros con investigaciones registradas.';
      if (rightBody.firstChild !== folders.el) Bytes.dom.mount(rightBody, folders.el);
      folders.render(state);
    }

    /** Mantiene el input sincronizado cuando el store limpia la búsqueda. */
    function syncSearch(state) {
      if (searchInput.value !== state.search) searchInput.value = state.search;
    }

    return {
      render: function (state) { render(state); syncSearch(state); }
    };
  }

  Bytes.LeadsView = { create: create };
})(window.Bytes);
