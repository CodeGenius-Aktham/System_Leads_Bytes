/* ==========================================================================
   src/components/ClassifiedView.js
   Vista "Clasificados" — panel analítico y organizativo.
     Nivel 1: carpetas/contenedores por rubro (+ KPIs globales de la base)
     Nivel 2: KPIs del sector + las 4 columnas de condición con sus leads
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;

  function create(root) {
    var store = Bytes.store;

    var kpis = Bytes.KpiPanel.create();
    var kanban = Bytes.KanbanBoard.create();
    var folders = Bytes.SectorFolders.create({
      columns: true,
      showEmptyNote: true,
      onSelect: function (sectorId) { store.actions.selectClassifiedSector(sectorId); },
      getActiveId: function (state) { return state.classifiedSectorId; }
    });

    /* --------------------------- cabecera --------------------------- */
    var headTitle = h('h2', { class: 'section-head__title' });
    var headText = h('p', { class: 'section-head__text' });

    var backBtn = h('button', { class: 'ghost-btn', type: 'button' }, icon('arrowLeft'), h('span', { text: 'Todos los sectores' }));
    backBtn.addEventListener('click', function () { store.actions.closeClassifiedSector(); });

    var actions = h('div', { class: 'section-head__actions' }, backBtn);
    var head = h('div', { class: 'section-head' }, h('div', null, headTitle, headText), actions);

    /* ---------------------------- cuerpo ---------------------------- */
    var kpiPanel = h('section', { class: 'panel' },
      h('div', { class: 'panel__head' },
        h('h3', { class: 'panel__title' }, icon('trending', 'icon--lg'), h('span', { text: 'Métricas en tiempo real' })),
        h('p', { class: 'panel__subtitle', id: 'kpi-scope' })
      ),
      h('div', { class: 'panel__body' }, kpis.el)
    );
    var kpiScope = kpiPanel.querySelector('#kpi-scope');

    var boardWrap = h('div', null);

    root.appendChild(h('div', { class: 'classified-layout' }, head, kpiPanel, boardWrap));

    /* ---------------------------- render ---------------------------- */
    function render(state) {
      var sector = store.selectors.sectorById(state.classifiedSectorId);
      backBtn.classList.toggle('is-hidden', !sector);

      if (!sector) {
        headTitle.textContent = 'Clasificados por sector';
        headText.textContent = 'Resumen global de la base y acceso al tablero de condiciones de cada rubro.';
        kpiScope.textContent = 'Base completa · todos los rubros con datos registrados.';
        kpis.render(store.selectors.globalCounts());

        Bytes.dom.mount(boardWrap, h('section', { class: 'panel' },
          h('div', { class: 'panel__head' },
            h('h3', { class: 'panel__title' }, icon('folder', 'icon--lg'), h('span', { text: 'Sectores clasificados' })),
            h('p', { class: 'panel__subtitle', text: 'Seleccioná un rubro para ver sus 4 columnas de condición.' })
          ),
          h('div', { class: 'panel__body' }, folders.el)
        ));
        folders.render(state);
        return;
      }

      var leads = store.selectors.leadsBySector(sector.id);
      headTitle.textContent = 'Clasificados · ' + sector.name;
      headText.textContent = leads.length + ' leads distribuidos en las 4 condiciones comerciales.';
      kpiScope.textContent = 'Rubro: ' + sector.name + '.';
      kpis.render(store.selectors.countsFor(leads));

      Bytes.dom.mount(boardWrap, kanban.el);
      kanban.render(leads);
    }

    return { render: render };
  }

  Bytes.ClassifiedView = { create: create };
})(window.Bytes);
