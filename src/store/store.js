/* ==========================================================================
   src/store/store.js
   Única fuente de verdad. Patrón store observable (state + acciones + pub/sub):
   los componentes nunca se hablan entre sí, solo despachan acciones y se
   suscriben a los cambios. Los estados de los leads persisten en localStorage.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  var STORAGE_KEY = 'bytes.leads.status.v1';
  var STATUS_IDS = Bytes.data.STATUSES.map(function (s) { return s.id; });

  /* ---------------------------------------------------------------- estado */
  var state = {
    view: 'leads',              // 'leads' | 'clasificados'
    // Vista Leads
    selectedSectorId: null,     // carpeta abierta (panel derecho, nivel 1)
    selectedLeadId: null,       // ficha abierta (reemplaza las carpetas)
    statusFilter: 'todos',      // 'todos' | id de estado
    search: '',
    // Vista Clasificados
    classifiedSectorId: null,
    // Datos
    leads: []
  };

  var listeners = [];

  /* ----------------------------------------------------- persistencia local */
  function loadOverrides() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      // localStorage puede estar bloqueado (modo privado, file://): seguimos en memoria.
      return {};
    }
  }

  function saveOverrides() {
    var map = {};
    state.leads.forEach(function (lead) {
      if (lead.status !== lead._initialStatus) {
        map[lead.id] = { status: lead.status, updatedAt: lead.updatedAt };
      }
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (err) { /* sin persistencia: el prototipo sigue funcionando */ }
  }

  function clearOverrides() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) { /* noop */ }
  }

  /* ------------------------------------------------------------- ciclo vida */
  function init() {
    var overrides = loadOverrides();
    state.leads = Bytes.data.LEADS.map(function (lead) {
      var copy = Object.assign({}, lead);
      copy._initialStatus = lead.status;
      var saved = overrides[lead.id];
      if (saved && STATUS_IDS.indexOf(saved.status) !== -1) {
        copy.status = saved.status;
        copy.updatedAt = saved.updatedAt || lead.updatedAt;
      }
      return copy;
    });
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  function emit() {
    listeners.forEach(function (fn) { fn(state); });
  }

  function getState() { return state; }

  /* ---------------------------------------------------------------- acciones */
  var actions = {
    setView: function (view) {
      if (state.view === view) return;
      state.view = view;
      emit();
    },

    /** Abre una carpeta de sector en la vista Leads (cierra la ficha abierta). */
    selectSector: function (sectorId) {
      state.selectedSectorId = sectorId;
      state.selectedLeadId = null;
      state.statusFilter = 'todos';
      state.search = '';
      emit();
    },

    /** Abre la ficha del lead: reemplaza las carpetas en el panel derecho. */
    selectLead: function (leadId) {
      var lead = selectors.leadById(leadId);
      if (!lead) return;
      state.selectedLeadId = leadId;
      // Permite abrir una ficha desde Clasificados manteniendo el contexto.
      if (state.selectedSectorId !== lead.sectorId) {
        state.selectedSectorId = lead.sectorId;
        state.statusFilter = 'todos';
      }
      emit();
    },

    /** Vuelve del detalle al nivel 1 (carpetas por sector). */
    closeLead: function () {
      state.selectedLeadId = null;
      emit();
    },

    setStatusFilter: function (filter) {
      state.statusFilter = filter;
      emit();
    },

    setSearch: function (term) {
      state.search = term;
      emit();
    },

    /** Cambio de estado en tiempo real (selector rápido y Kanban). */
    setLeadStatus: function (leadId, status) {
      if (STATUS_IDS.indexOf(status) === -1) return;
      var lead = selectors.leadById(leadId);
      if (!lead || lead.status === status) return;
      lead.status = status;
      lead.updatedAt = new Date().toISOString().slice(0, 10);
      saveOverrides();
      emit();
    },

    /* --- Vista Clasificados --- */
    selectClassifiedSector: function (sectorId) {
      state.classifiedSectorId = sectorId;
      emit();
    },
    closeClassifiedSector: function () {
      state.classifiedSectorId = null;
      emit();
    },

    /** Descarta los cambios locales y vuelve al set de datos de prueba. */
    resetDemo: function () {
      clearOverrides();
      init();                     // reconstruye los leads desde el mock original
      state.selectedLeadId = null;
      state.statusFilter = 'todos';
      emit();
    }
  };

  /* --------------------------------------------------------------- selectores */
  var selectors = {
    leadById: function (leadId) {
      return state.leads.filter(function (l) { return l.id === leadId; })[0] || null;
    },

    sectorById: function (sectorId) {
      return Bytes.data.SECTORS.filter(function (s) { return s.id === sectorId; })[0] || null;
    },

    leadsBySector: function (sectorId) {
      return state.leads.filter(function (l) { return l.sectorId === sectorId; });
    },

    /**
     * REGLA DE NEGOCIO: las carpetas solo son visibles si el rubro tiene
     * datos o investigaciones registradas. Los sectores vacíos no se listan.
     */
    visibleSectors: function () {
      return Bytes.data.SECTORS
        .map(function (sector) {
          var leads = selectors.leadsBySector(sector.id);
          return Object.assign({}, sector, { leads: leads, counts: selectors.countsFor(leads) });
        })
        .filter(function (sector) { return sector.leads.length > 0; })
        .sort(function (a, b) { return b.leads.length - a.leads.length || a.name.localeCompare(b.name, 'es'); });
    },

    /** Sectores del catálogo sin datos — se informan, no se listan como carpeta. */
    emptySectors: function () {
      return Bytes.data.SECTORS.filter(function (sector) {
        return selectors.leadsBySector(sector.id).length === 0;
      });
    },

    /** Contadores por estado + total (base de los KPIs). */
    countsFor: function (leads) {
      var counts = { total: leads.length };
      STATUS_IDS.forEach(function (id) { counts[id] = 0; });
      leads.forEach(function (lead) {
        if (counts[lead.status] !== undefined) counts[lead.status] += 1;
      });
      return counts;
    },

    globalCounts: function () { return selectors.countsFor(state.leads); },

    /** Lista visible en la columna izquierda: sector + filtro de estado + búsqueda. */
    filteredLeads: function () {
      if (!state.selectedSectorId) return [];
      var term = Bytes.format.normalize(state.search.trim());
      return selectors.leadsBySector(state.selectedSectorId)
        .filter(function (lead) {
          if (state.statusFilter !== 'todos' && lead.status !== state.statusFilter) return false;
          if (!term) return true;
          return Bytes.format.normalize(lead.name + ' ' + lead.phone + ' ' + lead.address).indexOf(term) !== -1;
        })
        .sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    },

    /** Agrupa los leads de un sector en las 4 columnas del Kanban. */
    groupByStatus: function (leads) {
      var groups = {};
      STATUS_IDS.forEach(function (id) { groups[id] = []; });
      leads.slice()
        .sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); })
        .forEach(function (lead) { if (groups[lead.status]) groups[lead.status].push(lead); });
      return groups;
    },

    statusById: function (statusId) {
      return Bytes.data.STATUSES.filter(function (s) { return s.id === statusId; })[0] || null;
    }
  };

  Bytes.store = {
    init: init,
    getState: getState,
    subscribe: subscribe,
    actions: actions,
    selectors: selectors,
    STORAGE_KEY: STORAGE_KEY
  };
})(window.Bytes);
