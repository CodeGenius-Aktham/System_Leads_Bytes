/* ==========================================================================
   src/store/store.js
   Única fuente de verdad. Patrón store observable (state + acciones + pub/sub):
   los componentes nunca se hablan entre sí, solo despachan acciones y se
   suscriben a los cambios. Los estados de los leads persisten en localStorage.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  var STATUS_IDS = Bytes.data.STATUSES.map(function (s) { return s.id; });

  /* ---------------------------------------------------------------- estado */
  var state = {
    view: null,                 // null (pantalla inicial) | 'leads' | 'clasificados'
    // Vista Leads
    selectedSectorId: null,     // carpeta abierta (panel derecho, nivel 1)
    selectedLeadId: null,       // ficha abierta (reemplaza las carpetas)
    statusFilter: 'todos',      // 'todos' | id de estado
    search: '',
    // Vista Clasificados
    classifiedSectorId: null,
    // Alcance: true = solo los leads asignados a quien está operando
    onlyMine: false,
    // Datos
    leads: []
  };

  var listeners = [];
  var errorListeners = [];

  /* ------------------------------------------------------------- ciclo vida */

  /**
   * Construye el set de trabajo y aplica el último estado conocido desde el
   * caché local, para que el primer render no espere a la red. La capa de
   * sync sobrescribe después con lo que haya en el servidor.
   */
  function init() {
    state.leads = Bytes.data.LEADS.map(function (lead) {
      var copy = Object.assign({}, lead);
      copy._initialStatus = lead.status;
      copy.updatedBy = null;
      copy._ts = 0;                       // marca de tiempo del último cambio conocido
      return copy;
    });
    applyRemote(Bytes.sync.readCache(), true);
    return state;
  }

  /**
   * Aplica los estados que llegan del backend compartido.
   * Resolución de conflictos: gana la escritura más reciente (`ts`). Un eco
   * remoto viejo no puede pisar un cambio local más nuevo.
   * @param {Object} map    { leadId: {status, updatedAt, updatedBy, ts} }
   * @param {boolean} quiet si es true no emite (se usa durante el init)
   */
  function applyRemote(map, quiet) {
    if (!map) return false;
    var changed = false;
    state.leads.forEach(function (lead) {
      var rec = map[lead.id];
      if (!rec || STATUS_IDS.indexOf(rec.status) === -1) return;
      var ts = rec.ts || 0;
      if (ts < (lead._ts || 0)) return;                 // lo local es más nuevo
      if (lead.status === rec.status &&
          lead.updatedBy === (rec.updatedBy || null)) return;
      lead.status = rec.status;
      lead.updatedAt = rec.updatedAt || lead.updatedAt;
      lead.updatedBy = rec.updatedBy || null;
      lead._ts = ts;
      changed = true;
    });
    if (changed && !quiet) emit();
    return changed;
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

  /** Avisos que la interfaz muestra al usuario (rechazos del servidor, etc.). */
  function onError(fn) {
    errorListeners.push(fn);
    return function () {
      errorListeners = errorListeners.filter(function (l) { return l !== fn; });
    };
  }
  function notify(message) {
    errorListeners.forEach(function (fn) { fn(message); });
  }

  /* ---------------------------------------------------------------- acciones */
  var actions = {
    /**
     * Re-emite sin cambiar el estado. Lo usan las entradas que viven fuera
     * del store —la identidad del operador, la sesión— para que la interfaz
     * recalcule lo que depende de ellas.
     */
    refresh: function () { emit(); },

    setView: function (view) {
      if (state.view === view) return;
      state.view = view;
      emit();
    },

    /** Vuelve a la pantalla inicial: ningún módulo elegido, solo la marca. */
    goHome: function () {
      state.view = null;
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

    /**
     * Acota todo el sistema a los leads del responsable que está operando.
     * Al ser un solo punto —`scopedLeads()`— alcanza a carpetas, listas,
     * contadores y tablero sin tocar ningún componente.
     */
    setOnlyMine: function (value) {
      var next = !!value;
      if (state.onlyMine === next) return;
      state.onlyMine = next;
      // Si la carpeta o la ficha abiertas se quedan fuera del alcance, se cierran.
      if (state.selectedLeadId) {
        var lead = selectors.leadById(state.selectedLeadId);
        if (!lead || !selectors.inScope(lead)) state.selectedLeadId = null;
      }
      if (state.selectedSectorId &&
          !selectors.leadsBySector(state.selectedSectorId).length) {
        state.selectedSectorId = null;
      }
      if (state.classifiedSectorId &&
          !selectors.leadsBySector(state.classifiedSectorId).length) {
        state.classifiedSectorId = null;
      }
      emit();
    },

    /**
     * Cambio de estado. Se aplica local al instante (optimista), se emite y
     * después se publica para el resto de los dispositivos.
     */
    setLeadStatus: function (leadId, status) {
      if (STATUS_IDS.indexOf(status) === -1) return;
      var lead = selectors.leadById(leadId);
      if (!lead || lead.status === status) return;

      if (!selectors.canEdit(lead)) {
        notify('Este lead está asignado a ' + (lead.owner || 'otra persona') +
               '. Solo ' + (lead.owner || 'quien lo tenga asignado') + ' puede cambiar su estado.');
        return;
      }

      // Se guarda el estado anterior para poder volver atrás si el servidor
      // rechaza la escritura: sin esto la pantalla mostraría algo que no se
      // guardó, porque el eco remoto es más viejo y no la corrige.
      var previous = {
        status: lead.status, updatedAt: lead.updatedAt,
        updatedBy: lead.updatedBy, _ts: lead._ts
      };

      var record = {
        status: status,
        updatedAt: new Date().toISOString().slice(0, 10),
        updatedBy: Bytes.sync.identity() || null,
        ts: Date.now()
      };
      lead.status = record.status;
      lead.updatedAt = record.updatedAt;
      lead.updatedBy = record.updatedBy;
      lead._ts = record.ts;
      emit();

      var pushed = Bytes.sync.push(leadId, record);
      if (pushed && pushed.catch) {
        pushed.catch(function (err) {
          lead.status = previous.status;
          lead.updatedAt = previous.updatedAt;
          lead.updatedBy = previous.updatedBy;
          lead._ts = previous._ts;
          emit();
          var motivo = String((err && err.message) || 'el servidor lo rechazó')
                         .replace(/\.+$/, '');
          notify('El cambio no se guardó: ' + motivo + '.');
        });
      }
    },

    /* --- Vista Clasificados --- */
    selectClassifiedSector: function (sectorId) {
      state.classifiedSectorId = sectorId;
      emit();
    },
    closeClassifiedSector: function () {
      state.classifiedSectorId = null;
      emit();
    }
  };

  /* --------------------------------------------------------------- selectores */
  var selectors = {
    leadById: function (leadId) {
      return state.leads.filter(function (l) { return l.id === leadId; })[0] || null;
    },

    /** Responsable que está operando, si hay sesión o identidad elegida. */
    currentOwner: function () {
      return Bytes.sync.identity() || '';
    },

    /** Cuenta con acceso total (supervisión). */
    isAdmin: function () {
      var cfg = window.BYTES_SYNC_CONFIG || {};
      var admins = cfg.admins || [];
      if (!admins.length) return false;
      var session = Bytes.auth ? Bytes.auth.getState() : null;
      var email = session && session.user && session.user.email;
      return !!email && admins.indexOf(email.toLowerCase()) !== -1;
    },

    /**
     * ¿Quien está operando puede cambiar el estado de este lead?
     * Sin Firebase o con `enforceOwnership: false`, todos pueden todo.
     */
    canEdit: function (lead) {
      var cfg = window.BYTES_SYNC_CONFIG || {};
      if (!Bytes.firebase.requiresAuth() || cfg.enforceOwnership === false) return true;
      if (selectors.isAdmin()) return true;
      return !!lead && lead.owner === selectors.currentOwner();
    },

    /** ¿Este lead entra en el alcance actual? */
    inScope: function (lead) {
      if (!state.onlyMine) return true;
      var me = selectors.currentOwner();
      return !me || lead.owner === me;
    },

    /**
     * Conjunto de leads sobre el que trabaja TODO el sistema.
     * Único lugar donde se aplica el alcance "solo mis leads".
     */
    scopedLeads: function () {
      if (!state.onlyMine) return state.leads;
      return state.leads.filter(selectors.inScope);
    },

    /** ¿Tiene sentido ofrecer el filtro? Sólo si hay responsable identificado. */
    canFilterMine: function () {
      var me = selectors.currentOwner();
      if (!me) return false;
      return state.leads.some(function (l) { return l.owner === me; });
    },

    sectorById: function (sectorId) {
      return Bytes.data.SECTORS.filter(function (s) { return s.id === sectorId; })[0] || null;
    },

    leadsBySector: function (sectorId) {
      return selectors.scopedLeads().filter(function (l) { return l.sectorId === sectorId; });
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

    globalCounts: function () { return selectors.countsFor(selectors.scopedLeads()); },

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
    onError: onError,
    applyRemote: applyRemote,
    actions: actions,
    selectors: selectors
  };
})(window.Bytes);
