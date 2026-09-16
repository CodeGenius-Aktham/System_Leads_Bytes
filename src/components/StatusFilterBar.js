/* ==========================================================================
   src/components/StatusFilterBar.js
   Barra superior de la columna izquierda: filtro por estado con los 4 botones
   de color + "Todos". Al hacer clic, la lista muestra ÚNICAMENTE ese estado.
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;

  function create() {
    var el = h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filtrar leads por estado' });

    // Delegación: un único listener para todos los botones.
    Bytes.dom.delegate(el, 'click', '.filter-btn', function (ev, btn) {
      Bytes.store.actions.setStatusFilter(btn.dataset.filter);
    });

    function render(state) {
      var leads = Bytes.store.selectors.leadsBySector(state.selectedSectorId);
      var counts = Bytes.store.selectors.countsFor(leads);

      var options = [{ id: 'todos', label: 'Todos', count: counts.total, dot: null }].concat(
        Bytes.data.STATUSES.map(function (status) {
          return { id: status.id, label: status.label, count: counts[status.id], dot: status.id, title: status.description };
        })
      );

      Bytes.dom.mount(el, options.map(function (opt) {
        var active = state.statusFilter === opt.id;
        return h('button', {
          class: 'filter-btn' + (active ? ' is-active' : ''),
          type: 'button',
          title: opt.title || 'Mostrar todos los leads del sector',
          'aria-pressed': active ? 'true' : 'false',
          dataset: { filter: opt.id }
        },
          opt.dot ? h('span', { class: 'status-dot', dataset: { status: opt.dot } }) : icon('grid'),
          h('span', { text: opt.label }),
          h('span', { class: 'filter-btn__count', text: opt.count })
        );
      }));
    }

    return { el: el, render: render };
  }

  Bytes.StatusFilterBar = { create: create };
})(window.Bytes);
