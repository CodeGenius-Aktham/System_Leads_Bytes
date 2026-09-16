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
    var meta = root.querySelector('.header-meta');
    var brand = root.querySelector('.brand');
    var whoSelect = root.querySelector('#who-select');
    var syncPill = root.querySelector('#sync-pill');

    // El isotipo de la cabecera devuelve a la pantalla inicial.
    if (brand) brand.addEventListener('click', function () { store.actions.goHome(); });

    /* --------- Quién opera este equipo (se adjunta a cada cambio) --------- */
    if (whoSelect) {
      var owners = [];
      Bytes.data.LEADS.forEach(function (lead) {
        if (lead.owner && owners.indexOf(lead.owner) === -1) owners.push(lead.owner);
      });
      owners.sort();

      whoSelect.appendChild(Bytes.dom.h('option', { value: '', text: 'Sin identificar' }));
      owners.forEach(function (name) {
        whoSelect.appendChild(Bytes.dom.h('option', { value: name, text: name }));
      });
      whoSelect.value = Bytes.sync.identity();
      whoSelect.addEventListener('change', function () {
        Bytes.sync.identity(whoSelect.value);
        Bytes.dom.toast(whoSelect.value ? 'Operando como ' + whoSelect.value : 'Identidad sin definir');
      });
    }

    /* ------------------- Estado del canal compartido ------------------- */
    var SYNC_LABELS = {
      idle:         { text: 'Iniciando…',        title: 'Conectando con el canal compartido.' },
      connecting:   { text: 'Conectando…',       title: 'Estableciendo la conexión con Firestore.' },
      live:         { text: 'En vivo',           title: 'Los cambios se ven en todos los dispositivos al instante.' },
      'local-only': { text: 'Solo este equipo',  title: 'Sincronización compartida sin configurar: los cambios no salen de este dispositivo. Ver src/config.js.' },
      error:        { text: 'Sin conexión',      title: 'No se pudo sincronizar. Los cambios quedan guardados en este equipo.' }
    };
    if (syncPill) {
      Bytes.sync.onStatus(function (status) {
        var info = SYNC_LABELS[status.state] || SYNC_LABELS.idle;
        syncPill.dataset.state = status.state;
        syncPill.querySelector('.sync-pill__text').textContent = info.text;
        syncPill.title = status.error ? info.title + ' (' + status.error + ')' : info.title;
      });
    }

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
      // En la pantalla inicial no se muestra nada más que la marca.
      if (meta) meta.classList.toggle('is-hidden', state.view === null);
      if (totalBadge) totalBadge.textContent = String(store.selectors.globalCounts().total);
    }

    return { render: render };
  }

  Bytes.Header = { create: create };
})(window.Bytes);
