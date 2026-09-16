/* ==========================================================================
   src/components/KpiPanel.js
   Panel de métricas en tiempo real: total registrado + los 4 contadores por
   estado, más una barra de composición porcentual del sector.
   Se recalcula en cada emisión del store (cambiar un estado actualiza los KPI).
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;
  var fmt = Bytes.format;

  var KPI_DEFS = [
    { key: 'total',         label: 'Total de leads', icon: 'users',    foot: 'registrados en el rubro' },
    { key: 'sin_contactar', label: 'Sin accionar',   icon: 'inbox',    foot: 'sin contactar (gris)' },
    { key: 'contactado',    label: 'En espera',      icon: 'clock',    foot: 'contactados (amarillo)' },
    { key: 'cliente',       label: 'Clientes',       icon: 'award',    foot: 'ventas cerradas (verde)' },
    { key: 'rechazado',     label: 'Rechazados',     icon: 'x',        foot: 'declinaron (rojo)' }
  ];

  function create() {
    var row = h('div', { class: 'kpi-row' });
    var bar = h('div', { class: 'composition', role: 'img' });
    var legend = h('div', { class: 'composition-legend' });
    var el = h('div', null, row, bar, legend);

    /**
     * @param {Object} counts  resultado de `selectors.countsFor(leads)`
     */
    function render(counts) {
      Bytes.dom.mount(row, KPI_DEFS.map(function (def) {
        var value = counts[def.key] || 0;
        var share = def.key === 'total' ? null : fmt.percent(value, counts.total);
        return h('article', { class: 'kpi-card', dataset: { kpi: def.key } },
          h('h4', { class: 'kpi-card__label' }, icon(def.icon), h('span', { text: def.label })),
          h('p', { class: 'kpi-card__value', text: value }),
          h('p', { class: 'kpi-card__foot', text: share === null ? def.foot : share + '% · ' + def.foot })
        );
      }));

      var segments = Bytes.data.STATUSES.filter(function (s) { return counts[s.id] > 0; });
      bar.setAttribute('aria-label', 'Composición del sector por estado');
      Bytes.dom.mount(bar, segments.map(function (status) {
        return h('span', {
          class: 'composition__seg',
          dataset: { status: status.id },
          title: status.label + ': ' + counts[status.id],
          style: { width: fmt.percent(counts[status.id], counts.total) + '%' }
        });
      }));

      Bytes.dom.mount(legend, Bytes.data.STATUSES.map(function (status) {
        return h('span', { class: 'composition-legend__item' },
          h('span', { class: 'status-dot', dataset: { status: status.id } }),
          h('span', { text: status.label + ' · ' + (counts[status.id] || 0) + ' (' + fmt.percent(counts[status.id] || 0, counts.total) + '%)' })
        );
      }));
    }

    return { el: el, render: render };
  }

  Bytes.KpiPanel = { create: create };
})(window.Bytes);
