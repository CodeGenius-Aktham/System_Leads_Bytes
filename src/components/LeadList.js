/* ==========================================================================
   src/components/LeadList.js
   Columna izquierda — lista de leads del sector seleccionado, ya filtrada por
   el store (estado + búsqueda). Al hacer clic se abre la ficha en el panel
   derecho (acción `selectLead`).
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;
  var fmt = Bytes.format;

  function create() {
    var el = h('div', { class: 'lead-list', role: 'list' });

    Bytes.dom.delegate(el, 'click', '.lead-item', function (ev, item) {
      Bytes.store.actions.selectLead(item.dataset.lead);
    });

    /** Indicadores de canales disponibles (WhatsApp / Maps / IG / Web). */
    function channelTags(lead) {
      var channels = [
        { ch: 'wa',   on: !!lead.phone,          name: 'whatsapp',  label: 'WhatsApp' },
        { ch: 'maps', on: !!lead.address,        name: 'mapPin',    label: 'Google Maps' },
        { ch: 'ig',   on: !!lead.instagram,      name: 'instagram', label: 'Instagram' },
        { ch: 'web',  on: !!lead.website,        name: 'globe',     label: lead.website ? 'Sitio web' : 'No tiene página web' }
      ];
      return h('span', { class: 'channel-tags' }, channels.map(function (c) {
        return h('span', {
          class: 'channel-tag',
          title: c.label,
          dataset: { ch: c.ch, on: c.on ? '1' : '0' }
        }, icon(c.name));
      }));
    }

    function leadItem(lead, isSelected) {
      return h('button', {
        class: 'lead-item' + (isSelected ? ' is-selected' : ''),
        type: 'button',
        role: 'listitem',
        'aria-pressed': isSelected ? 'true' : 'false',
        dataset: { lead: lead.id }
      },
        h('span', { class: 'lead-item__avatar', text: fmt.initials(lead.name) }),
        h('span', { class: 'lead-item__body' },
          h('span', { class: 'lead-item__name', text: lead.name }),
          h('span', { class: 'lead-item__sub' },
            h('span', { text: lead.phone }),
            h('span', { class: 'sep', text: '•' }),
            h('span', { class: 'lead-item__age', text: fmt.relativeDate(lead.updatedAt) })
          )
        ),
        h('span', { class: 'lead-item__right' },
          channelTags(lead),
          h('span', { class: 'status-dot', dataset: { status: lead.status }, title: (Bytes.store.selectors.statusById(lead.status) || {}).label }),
          h('span', { class: 'lead-item__chevron' }, icon('chevron'))
        )
      );
    }

    function render(state) {
      var leads = Bytes.store.selectors.filteredLeads();

      if (!leads.length) {
        var status = Bytes.store.selectors.statusById(state.statusFilter);
        return Bytes.dom.mount(el, h('div', { class: 'empty-state' },
          h('div', { class: 'empty-state__icon' }, icon('inbox')),
          h('p', { class: 'empty-state__title', text: state.search ? 'Sin resultados para la búsqueda' : 'Sin leads en este estado' }),
          h('p', {
            class: 'empty-state__text',
            text: state.search
              ? 'Probá con otro nombre, teléfono o dirección.'
              : (status ? 'Este sector no tiene leads en “' + status.label + '”. Cambiá el filtro para ver el resto.'
                        : 'Todavía no hay leads registrados en este sector.')
          })
        ));
      }

      Bytes.dom.mount(el, leads.map(function (lead) {
        return leadItem(lead, lead.id === state.selectedLeadId);
      }));
    }

    return { el: el, render: render };
  }

  Bytes.LeadList = { create: create };
})(window.Bytes);
