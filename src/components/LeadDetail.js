/* ==========================================================================
   src/components/LeadDetail.js
   Ficha del lead — reemplaza las carpetas en el panel derecho.
   Contiene: identidad del negocio, teléfono, botonera de acción rápida
   (WhatsApp con mensaje predefinido, Google Maps, Instagram, Sitio Web)
   y el selector rápido de estado (gris / amarillo / verde / rojo).
   ========================================================================== */
(function (Bytes) {
  'use strict';

  var h = Bytes.dom.h;
  var icon = Bytes.dom.icon;
  var fmt = Bytes.format;

  function create() {
    var el = h('div', { class: 'lead-detail' });

    /* --- Selector rápido de estado: cambia el estado en tiempo real --- */
    Bytes.dom.delegate(el, 'click', '.status-opt', function (ev, btn) {
      var leadId = btn.dataset.lead;
      var status = btn.dataset.status;
      var lead = Bytes.store.selectors.leadById(leadId);
      if (!lead || lead.status === status) return;
      Bytes.store.actions.setLeadStatus(leadId, status);
      Bytes.dom.toast(lead.name + ' → ' + (Bytes.store.selectors.statusById(status) || {}).label);
    });

    /* --- Volver al nivel 1 (carpetas por sector) --- */
    Bytes.dom.delegate(el, 'click', '.detail-back', function () {
      Bytes.store.actions.closeLead();
    });

    /* --- Copiar teléfono --- */
    Bytes.dom.delegate(el, 'click', '.copy-btn', function (ev, btn) {
      var value = btn.dataset.value;
      var done = function () { Bytes.dom.toast('Teléfono copiado', 'copy'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, function () { fallbackCopy(value, done); });
      } else {
        fallbackCopy(value, done);
      }
    });

    function fallbackCopy(value, done) {
      var input = h('textarea', { style: { position: 'fixed', opacity: '0' } });
      input.value = value;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); done(); } catch (err) { /* noop */ }
      input.remove();
    }

    /** Botón de canal: <a> si hay enlace, <div> deshabilitado si no. */
    function actionButton(config) {
      var content = [
        h('span', { class: 'action-btn__icon' }, icon(config.icon, 'icon--lg')),
        h('span', { class: 'action-btn__text' },
          h('span', { class: 'action-btn__label', text: config.label }),
          h('span', { class: 'action-btn__sub', text: config.sub })
        )
      ];

      if (!config.href) {
        return h('div', {
          class: 'action-btn is-disabled',
          dataset: { ch: config.ch },
          'aria-disabled': 'true',
          title: config.sub
        }, content);
      }

      return h('a', {
        class: 'action-btn',
        dataset: { ch: config.ch },
        href: config.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        title: config.title || config.label
      }, content);
    }

    function statusSwitch(lead) {
      return h('div', { class: 'status-switch', role: 'group', 'aria-label': 'Cambiar estado del lead' },
        Bytes.data.STATUSES.map(function (status) {
          var current = lead.status === status.id;
          return h('button', {
            class: 'status-opt' + (current ? ' is-current' : ''),
            type: 'button',
            title: status.description,
            'aria-pressed': current ? 'true' : 'false',
            dataset: { lead: lead.id, status: status.id }
          },
            h('span', { class: 'status-opt__swatch', 'aria-hidden': 'true' }),
            h('span', { text: status.label })
          );
        })
      );
    }

    function render(state) {
      var lead = Bytes.store.selectors.leadById(state.selectedLeadId);
      if (!lead) return Bytes.dom.clear(el);

      var sector = Bytes.store.selectors.sectorById(lead.sectorId) || { name: '—' };
      var status = Bytes.store.selectors.statusById(lead.status) || { label: '—' };
      var website = fmt.websiteLink(lead);
      var instagram = fmt.instagramLink(lead);

      Bytes.dom.mount(el, [
        h('button', { class: 'detail-back', type: 'button' }, icon('arrowLeft'), h('span', { text: 'Volver a sectores' })),

        /* ---------- Identidad ---------- */
        h('div', { class: 'detail-hero' },
          h('div', { class: 'detail-hero__avatar', text: fmt.initials(lead.name) }),
          h('div', null,
            h('h2', { class: 'detail-hero__name', text: lead.name }),
            h('div', { class: 'detail-hero__sector' },
              h('span', { class: 'sector-tag' }, icon('folder'), h('span', { text: sector.name })),
              h('span', { class: 'status-pill', dataset: { status: lead.status } },
                h('span', { class: 'status-dot', dataset: { status: lead.status } }),
                h('span', { text: status.label })
              )
            )
          )
        ),

        /* ---------- Teléfono ---------- */
        h('div', { class: 'detail-block' },
          h('span', { class: 'detail-block__label', text: 'Teléfono de contacto' }),
          h('div', { class: 'phone-row' },
            h('span', { class: 'phone-row__icon' }, icon('phone')),
            h('div', null,
              h('div', { class: 'phone-row__value', text: lead.phone }),
              h('div', { class: 'phone-row__hint', text: lead.address || 'Sin dirección registrada' })
            ),
            h('button', { class: 'copy-btn', type: 'button', dataset: { value: lead.phone } },
              icon('copy'), h('span', { text: 'Copiar' })
            )
          )
        ),

        /* ---------- Botonera de acción rápida ---------- */
        h('div', { class: 'detail-block' },
          h('span', { class: 'detail-block__label', text: 'Acciones rápidas' }),
          h('div', { class: 'action-grid' },
            actionButton({
              ch: 'wa', icon: 'whatsapp', label: 'WhatsApp',
              sub: '“' + fmt.waMessage(lead.name) + '”',
              title: 'Abrir chat con el mensaje predefinido',
              href: fmt.waLink(lead)
            }),
            actionButton({
              ch: 'maps', icon: 'mapPin', label: 'Google Maps',
              sub: lead.address || 'Buscar ubicación',
              href: fmt.mapsLink(lead)
            }),
            actionButton({
              ch: 'ig', icon: 'instagram', label: 'Instagram',
              sub: instagram ? fmt.prettyHandle(lead.instagram) : 'No tiene Instagram',
              href: instagram
            }),
            actionButton({
              ch: 'web', icon: website ? 'globe' : 'globeOff', label: 'Sitio Web',
              sub: website ? fmt.prettyDomain(website) : 'No tiene página web',
              href: website
            })
          )
        ),

        /* ---------- Selector rápido de estado ---------- */
        h('div', { class: 'detail-block' },
          h('span', { class: 'detail-block__label', text: 'Estado del lead' }),
          statusSwitch(lead)
        ),

        /* ---------- Notas de la investigación ---------- */
        lead.note ? h('div', { class: 'detail-block' },
          h('span', { class: 'detail-block__label', text: 'Notas de la investigación' }),
          h('p', { class: 'detail-note', text: lead.note })
        ) : null,

        h('div', { class: 'detail-meta' },
          h('span', { class: 'detail-meta__item', html: 'Última actualización: <strong>' + fmt.shortDate(lead.updatedAt) + '</strong>' }),
          h('span', { class: 'detail-meta__item', html: 'ID interno: <strong>' + lead.id + '</strong>' })
        )
      ]);
    }

    return { el: el, render: render };
  }

  Bytes.LeadDetail = { create: create };
})(window.Bytes);
