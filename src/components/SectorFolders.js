/* ==========================================================================
   src/components/SectorFolders.js
   Panel Nivel 1 — carpetas dinámicas por sector/rubro.
   Regla: solo se renderiza una carpeta si el rubro tiene leads registrados.
   Reutilizable: se usa en la columna derecha de "Leads" y en "Clasificados".
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;
  var fmt = Bytes.format;

  /**
   * @param {Object} options
   * @param {Function} options.onSelect        callback(sectorId)
   * @param {Function} options.getActiveId     devuelve el sector activo del state
   * @param {boolean}  [options.columns]       grilla multicolumna (Clasificados)
   * @param {boolean}  [options.showEmptyNote] informar rubros sin datos
   */
  function create(options) {
    var el = h('div', { class: 'folder-grid' + (options.columns ? ' folder-grid--cols' : '') });

    Bytes.dom.delegate(el, 'click', '.folder-card', function (ev, card) {
      options.onSelect(card.dataset.sector);
    });

    function folderCard(sector, isActive) {
      var counts = sector.counts;
      return h('button', {
        class: 'folder-card' + (isActive ? ' is-active' : ''),
        type: 'button',
        'aria-pressed': isActive ? 'true' : 'false',
        dataset: { sector: sector.id }
      },
        h('span', { class: 'folder-card__icon' }, icon(isActive ? 'folderOpen' : 'folder', 'icon--lg')),
        h('span', { class: 'folder-card__body' },
          h('span', { class: 'folder-card__name', text: sector.name }),
          h('span', {
            class: 'folder-card__meta',
            text: counts.total + (counts.total === 1 ? ' lead' : ' leads') + ' · ' + counts.cliente + ' cliente' + (counts.cliente === 1 ? '' : 's')
          }),
          // Mini barra de composición por estado (lectura rápida del rubro)
          h('span', { class: 'folder-card__bars', 'aria-hidden': 'true' },
            Bytes.data.STATUSES
              .filter(function (status) { return counts[status.id] > 0; })
              .map(function (status) {
                return h('span', {
                  class: 'folder-card__bar',
                  dataset: { status: status.id },
                  style: { width: fmt.percent(counts[status.id], counts.total) + '%' }
                });
              })
          )
        ),
        h('span', { class: 'folder-card__count', text: counts.total })
      );
    }

    function render(state) {
      var sectors = Bytes.store.selectors.visibleSectors();
      var activeId = options.getActiveId(state);

      if (!sectors.length) {
        return Bytes.dom.mount(el, emptyState());
      }

      var nodes = sectors.map(function (sector) { return folderCard(sector, sector.id === activeId); });

      // Con la base vacía la nota listaría el catálogo entero: no aporta.
      if (options.showEmptyNote && Bytes.store.selectors.globalCounts().total > 0) {
        var hidden = Bytes.store.selectors.emptySectors();
        if (hidden.length) {
          nodes.push(h('p', {
            class: 'section-head__text',
            style: { gridColumn: '1 / -1', marginTop: '4px' },
            text: 'Rubros del catálogo sin investigaciones registradas (carpeta oculta): ' +
                  hidden.map(function (s) { return s.name; }).join(', ') + '.'
          }));
        }
      }

      Bytes.dom.mount(el, nodes);
    }

    function emptyState() {
      return h('div', { class: 'empty-state' },
        h('div', { class: 'empty-state__icon' }, icon('folder')),
        h('p', { class: 'empty-state__title', text: 'Sin rubros con datos' }),
        h('p', { class: 'empty-state__text', text: 'Las carpetas aparecen automáticamente cuando se registra la primera investigación de un sector.' })
      );
    }

    return { el: el, render: render };
  }

  Bytes.SectorFolders = { create: create };
})(window.Bytes);
