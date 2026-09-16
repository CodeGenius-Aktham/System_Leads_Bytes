/* ==========================================================================
   src/data/leads.js
   Capa de datos. Simula la respuesta de la API: reemplazar `SECTORS` / `LEADS`
   por un fetch no requiere tocar la interfaz.

   ESTADO ACTUAL: la base está VACÍA (`LEADS = []`), sin ningún dato cargado.

   NOTA DE NEGOCIO: `SECTORS` es el catálogo de rubros con los que trabaja la
   empresa, no datos de leads. Una carpeta solo se vuelve visible cuando su
   rubro tiene al menos un lead registrado, así que con la base vacía no se
   muestra ninguna.
   ========================================================================== */
window.Bytes = window.Bytes || {};

(function (Bytes) {
  'use strict';

  /** Estados comerciales del sistema — orden canónico del pipeline. */
  var STATUSES = [
    { id: 'sin_contactar', label: 'Sin contactar',   short: 'Sin contactar', color: 'gray',
      description: 'Leads a los que aún no se les escribió ni gestionó.' },
    { id: 'contactado',    label: 'En proceso',      short: 'En espera',     color: 'amber',
      description: 'Ya se les escribió o están esperando respuesta.' },
    { id: 'cliente',       label: 'Cliente',         short: 'Clientes',      color: 'green',
      description: 'Cerraron la venta exitosamente.' },
    { id: 'rechazado',     label: 'Rechazado',       short: 'Rechazados',    color: 'red',
      description: 'Rechazaron la propuesta o declinaron la venta.' }
  ];

  /** Catálogo de sectores/rubros con los que opera la empresa. */
  var SECTORS = [
    { id: 'inmobiliarias', name: 'Inmobiliarias', icon: 'folder' },
    { id: 'hospitales',    name: 'Hospitales',    icon: 'folder' },
    { id: 'clinicas',      name: 'Clínicas',      icon: 'folder' },
    { id: 'gimnasios',     name: 'Gimnasios',     icon: 'folder' },
    { id: 'gastronomia',   name: 'Gastronomía',   icon: 'folder' },
    { id: 'odontologia',   name: 'Odontología',   icon: 'folder' },
    { id: 'veterinarias',  name: 'Veterinarias',  icon: 'folder' },
    { id: 'hoteles',       name: 'Hoteles',       icon: 'folder' }
  ];

  /**
   * Leads registrados. Base vacía: se cargan desde la investigación de rubros.
   *
   * Forma de cada registro:
   *   {
   *     id:        'inm-01',                   // identificador único
   *     sectorId:  'inmobiliarias',            // debe existir en SECTORS
   *     name:      'Inmobiliaria Del Sur',     // nombre del negocio
   *     phone:     '+54 9 11 4521 8890',       // se normaliza para wa.me
   *     address:   'Av. Rivadavia 4820',
   *     city:      'Buenos Aires, Argentina',
   *     mapsUrl:   null,                       // null -> búsqueda por nombre + dirección
   *     instagram: '@inmodelsur',              // null -> botón de Instagram inactivo
   *     website:   'inmodelsur.com.ar',        // null -> "No tiene página web"
   *     status:    'sin_contactar',            // sin_contactar | contactado | cliente | rechazado
   *     updatedAt: '2026-09-10',               // ISO corto (YYYY-MM-DD)
   *     note:      'Notas de la investigación.'
   *   }
   */
  var LEADS = [];

  Bytes.data = { STATUSES: STATUSES, SECTORS: SECTORS, LEADS: LEADS };
})(window.Bytes);
