/* ==========================================================================
   src/components/KanbanBoard.js
   Vista detallada del sector: las 4 columnas de condición con todos sus leads.
   Cada tarjeta abre la ficha completa en la vista "Leads".
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;
  var fmt = Bytes.format;

  function create() {
    var el = h('div', { class: 'kanban' });

    // Clic en tarjeta → abrir la ficha del lead en la vista Leads.
    Bytes.dom.delegate(el, 'click', '.kanban-card', function (ev, card) {
      Bytes.store.actions.selectLead(card.dataset.lead);
      Bytes.store.actions.setView('leads');
    });

    function kanbanCard(lead) {
      return h('button', {
        class: 'kanban-card', type: 'button',
        title: 'Abrir la ficha de ' + lead.name,
        dataset: { lead: lead.id }
      },
        h('span', { class: 'kanban-card__name', text: lead.name }),
        h('span', { class: 'kanban-card__phone', text: lead.phone }),
        h('span', { class: 'kanban-card__foot' },
          h('span', { class: 'channel-tags' }, [
            { ch: 'ig',  on: !!lead.instagram, name: 'instagram', label: lead.instagram ? fmt.prettyHandle(lead.instagram) : 'No tiene Instagram' },
            { ch: 'web', on: !!lead.website,   name: 'globe',     label: lead.website ? fmt.prettyDomain(lead.website) : 'No tiene página web' }
          ].map(function (c) {
            return h('span', { class: 'channel-tag', title: c.label, dataset: { ch: c.ch, on: c.on ? '1' : '0' } }, icon(c.name));
          })),
          h('span', { class: 'kanban-card__date', text: fmt.relativeDate(lead.updatedAt) })
        )
      );
    }

    /**
     * @param {Array} leads  leads del sector seleccionado
     */
    function render(leads) {
      var groups = Bytes.store.selectors.groupByStatus(leads);

      Bytes.dom.mount(el, Bytes.data.STATUSES.map(function (status) {
        var items = groups[status.id];
        return h('section', { class: 'kanban-col', dataset: { status: status.id }, 'aria-label': status.label },
          h('header', { class: 'kanban-col__head' },
            h('h4', { class: 'kanban-col__title', text: status.label }),
            h('span', { class: 'kanban-col__count', text: items.length })
          ),
          h('div', { class: 'kanban-col__body scroll-y' },
            items.length
              ? items.map(kanbanCard)
              : h('p', { class: 'empty-state__text', style: { padding: '14px 6px', textAlign: 'center' }, text: 'Sin leads en esta condición.' })
          )
        );
      }));
    }

    return { el: el, render: render };
  }

  Bytes.KanbanBoard = { create: create };
})(window.Bytes);
