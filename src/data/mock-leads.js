/* ==========================================================================
   src/data/mock-leads.js
   Datos de prueba (mock). Esta capa simula la respuesta de la API:
   reemplazar `SECTORS` / `LEADS` por un fetch no requiere tocar la UI.

   NOTA DE NEGOCIO: el catálogo `SECTORS` incluye rubros SIN leads a propósito
   (ej. "Veterinarias", "Hoteles"). El store los filtra: una carpeta solo se
   muestra si el rubro tiene investigaciones/datos registrados.
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

  /** Catálogo de sectores/rubros disponibles en el CRM. */
  var SECTORS = [
    { id: 'inmobiliarias', name: 'Inmobiliarias', icon: 'folder' },
    { id: 'hospitales',    name: 'Hospitales',    icon: 'folder' },
    { id: 'clinicas',      name: 'Clínicas',      icon: 'folder' },
    { id: 'gimnasios',     name: 'Gimnasios',     icon: 'folder' },
    { id: 'gastronomia',   name: 'Gastronomía',   icon: 'folder' },
    { id: 'odontologia',   name: 'Odontología',   icon: 'folder' },
    { id: 'veterinarias',  name: 'Veterinarias',  icon: 'folder' }, // sin datos -> carpeta oculta
    { id: 'hoteles',       name: 'Hoteles',       icon: 'folder' }  // sin datos -> carpeta oculta
  ];

  /**
   * Factory de leads: mantiene el mock legible.
   * @param {Array} row [id, sector, name, phone, address, instagram, website, status, date, note]
   */
  function lead(id, sector, name, phone, address, instagram, website, status, updatedAt, note) {
    return {
      id: id,
      sectorId: sector,
      name: name,
      phone: phone,
      address: address,
      city: 'Buenos Aires, Argentina',
      mapsUrl: null,          // si la investigación trae la URL exacta, se usa esa
      instagram: instagram,   // null => botón de Instagram deshabilitado
      website: website,       // null => "No tiene página web"
      status: status,
      updatedAt: updatedAt,
      note: note || ''
    };
  }

  var LEADS = [
    /* ---------------- Inmobiliarias ---------------- */
    lead('inm-01', 'inmobiliarias', 'Inmobiliaria Del Sur',        '+54 9 11 4521 8890', 'Av. Rivadavia 4820',       '@inmodelsur',        'inmobiliariadelsur.com.ar', 'sin_contactar', '2026-09-10', 'Investigación inicial: 3 sucursales, web desactualizada.'),
    lead('inm-02', 'inmobiliarias', 'Grupo Habitat Propiedades',   '+54 9 11 6733 2210', 'Cerrito 1250, Piso 4',      '@habitatprop',       null,                        'contactado',    '2026-09-12', 'Se envió propuesta de landing + CRM. Esperando respuesta del socio.'),
    lead('inm-03', 'inmobiliarias', 'Torres & Asociados',          '+54 9 11 5588 4417', 'Av. Santa Fe 3390',         '@torresasociados',   'torresyasociados.com',      'cliente',       '2026-09-05', 'Cerrado: sitio institucional + portal de propiedades.'),
    lead('inm-04', 'inmobiliarias', 'Nuevo Horizonte Bienes Raíces','+54 9 11 3092 7754', 'Bulnes 880',               null,                 null,                        'rechazado',     '2026-08-28', 'Trabajan con una agencia interna. Recontactar en 2027.'),
    lead('inm-05', 'inmobiliarias', 'Costa Urbana Desarrollos',    '+54 9 11 7741 3365', 'Juana Manso 205, Puerto Madero', '@costaurbana',  'costaurbana.com.ar',        'contactado',    '2026-09-14', 'Pidieron presupuesto detallado para app de inversores.'),
    lead('inm-06', 'inmobiliarias', 'Propiedades Belgrano R',      '+54 9 11 2288 9104', 'Superí 1790',               '@propbelgranor',     null,                        'sin_contactar', '2026-09-15', 'Alta rotación de avisos, buen candidato para automatizar.'),
    lead('inm-07', 'inmobiliarias', 'Alquileres Express',          '+54 9 11 4419 6628', 'Av. Córdoba 2850',          null,                 'alquileresexpress.ar',      'cliente',       '2026-08-22', 'Cerrado: rediseño + integración con WhatsApp Business.'),

    /* ---------------- Hospitales ---------------- */
    lead('hos-01', 'hospitales',    'Hospital Privado San Lucas',  '+54 9 11 4788 1200', 'Av. Pueyrredón 1640',       '@hsanlucas',         'sanlucas.org.ar',           'contactado',    '2026-09-13', 'Reunión con dirección médica agendada para el 22/09.'),
    lead('hos-02', 'hospitales',    'Centro Hospitalario Norte',   '+54 9 11 4033 5590', 'Av. Maipú 2350, Olivos',    null,                 'chnorte.com.ar',            'sin_contactar', '2026-09-11', 'Turnos 100% telefónicos: oportunidad de portal de turnos.'),
    lead('hos-03', 'hospitales',    'Hospital Italiano Regional',  '+54 9 11 5512 7788', 'Gascón 450',                '@hitalianoreg',      null,                        'cliente',       '2026-07-30', 'Cerrado: sistema de gestión de turnos + historia clínica.'),
    lead('hos-04', 'hospitales',    'Sanatorio Metropolitano',     '+54 9 11 6690 4432', 'Av. Belgrano 1746',         '@sanatoriometro',    'metropolitano.med.ar',      'rechazado',     '2026-08-18', 'Presupuesto fuera de su ciclo anual. Volver en Q1.'),
    lead('hos-05', 'hospitales',    'Hospital de Día Aurora',      '+54 9 11 3376 2215', 'Av. Directorio 3120',       null,                 null,                        'sin_contactar', '2026-09-16', 'Sin presencia digital detectada. Lead de alto potencial.'),

    /* ---------------- Clínicas ---------------- */
    lead('cli-01', 'clinicas',      'Clínica Oftalmológica Visión','+54 9 11 4890 3312', 'Av. Callao 1180',           '@clinicavision',     'clinicavision.com.ar',      'cliente',       '2026-09-02', 'Cerrado: web + reserva de consultas online.'),
    lead('cli-02', 'clinicas',      'Clínica Dermatológica Piel+', '+54 9 11 2245 8871', 'Arenales 2340',             '@pielmas',           null,                        'contactado',    '2026-09-15', 'Interesados en campaña + web. Piden casos de éxito.'),
    lead('cli-03', 'clinicas',      'Centro Médico Integral CMI',  '+54 9 11 5567 9920', 'Av. Nazca 1455',            null,                 'cmintegral.com',            'sin_contactar', '2026-09-09', 'Detectado en investigación de rubro salud zona oeste.'),
    lead('cli-04', 'clinicas',      'Clínica de Rehabilitación Movere', '+54 9 11 6612 3078', 'Concepción Arenal 2680', '@movere.rehab',   null,                        'sin_contactar', '2026-09-14', 'Solo Instagram, sin web. Muy buena base de seguidores.'),
    lead('cli-05', 'clinicas',      'Clínica Cardiológica del Plata','+54 9 11 4470 1163','Av. Las Heras 2900',        '@cardioplata',       'cardiodelplata.com.ar',     'rechazado',     '2026-08-05', 'Renovaron con proveedor actual por 24 meses.'),
    lead('cli-06', 'clinicas',      'Instituto Kinésico Reactiva',  '+54 9 11 3391 5542', 'Av. Federico Lacroze 2180', '@reactiva.kine',    null,                        'contactado',    '2026-09-16', 'Enviado presupuesto de web + turnos. Responden esta semana.'),

    /* ---------------- Gimnasios ---------------- */
    lead('gym-01', 'gimnasios',     'PowerFit Palermo',            '+54 9 11 6721 4408', 'Av. Juan B. Justo 1890',    '@powerfit.palermo',  'powerfit.com.ar',           'cliente',       '2026-09-08', 'Cerrado: app de socios + gestión de clases.'),
    lead('gym-02', 'gimnasios',     'Iron House Gym',              '+54 9 11 5580 2294', 'Av. Rivadavia 8820',        '@ironhousegym',      null,                        'contactado',    '2026-09-12', 'Quieren sistema de pagos y control de acceso.'),
    lead('gym-03', 'gimnasios',     'Estudio Funcional Nucleo',    '+54 9 11 2260 7719', 'Honduras 4550',             '@nucleo.funcional',  null,                        'sin_contactar', '2026-09-15', 'Reservas por DM: oportunidad clara de automatización.'),
    lead('gym-04', 'gimnasios',     'Crossbox Villa Urquiza',      '+54 9 11 4438 6650', 'Av. Triunvirato 4210',      '@crossbox.vu',       'crossboxvu.com',            'sin_contactar', '2026-09-16', 'Web hecha en constructor, muy lenta en mobile.'),
    lead('gym-05', 'gimnasios',     'Sport Center Caballito',      '+54 9 11 3317 8823', 'Av. La Plata 1120',         null,                 null,                        'rechazado',     '2026-08-26', 'Cierran una sede, sin presupuesto este año.'),
    lead('gym-06', 'gimnasios',     'Aqua Club Natación',          '+54 9 11 6654 1190', 'Av. Directorio 2455',       '@aquaclub.nat',      'aquaclub.com.ar',           'cliente',       '2026-08-30', 'Cerrado: web + inscripción a colonias online.'),
    lead('gym-07', 'gimnasios',     'Studio Pilates Reforma',      '+54 9 11 2871 3345', 'Gurruchaga 1580',           '@reforma.pilates',   null,                        'contactado',    '2026-09-14', 'Esperando confirmación de la socia fundadora.'),

    /* ---------------- Gastronomía ---------------- */
    lead('gas-01', 'gastronomia',   'Parrilla Don Ernesto',        '+54 9 11 4512 3390', 'Av. Corrientes 5480',       '@donernesto.parrilla', null,                      'sin_contactar', '2026-09-16', 'Sin web ni menú digital. Alto volumen de delivery.'),
    lead('gas-02', 'gastronomia',   'Café Botánico',               '+54 9 11 6690 7712', 'Av. Santa Fe 3951',         '@cafebotanico',      'cafebotanico.ar',           'cliente',       '2026-09-01', 'Cerrado: e-commerce de café de especialidad.'),
    lead('gas-03', 'gastronomia',   'Sushi Nikkei Bar',            '+54 9 11 5543 2286', 'Thames 1690',               '@nikkeibar',         null,                        'contactado',    '2026-09-13', 'Quieren pedidos propios para dejar las apps de delivery.'),
    lead('gas-04', 'gastronomia',   'Pizzería La Cantina',         '+54 9 11 3348 9917', 'Av. Juan B. Alberdi 3320',  null,                 null,                        'rechazado',     '2026-08-20', 'Prefieren seguir solo con las apps de delivery.'),
    lead('gas-05', 'gastronomia',   'Bodegón El Encuentro',        '+54 9 11 2219 6604', 'Brasil 1240',               '@elencuentro.bodegon', null,                      'sin_contactar', '2026-09-15', 'Investigación de rubro gastronómico zona sur.'),

    /* ---------------- Odontología ---------------- */
    lead('odo-01', 'odontologia',   'Odontología Integral Sonrisa','+54 9 11 4776 5521', 'Av. Cabildo 2280',          '@sonrisa.integral',  'sonrisaintegral.com.ar',    'contactado',    '2026-09-15', 'Pidieron demo del sistema de turnos con recordatorios.'),
    lead('odo-02', 'odontologia',   'Centro Dental Norte',         '+54 9 11 6612 8890', 'Av. Libertador 6270',       null,                 null,                        'sin_contactar', '2026-09-14', 'Solo teléfono fijo publicado. Web inexistente.'),
    lead('odo-03', 'odontologia',   'Implantes Dentales Premium',  '+54 9 11 5529 3341', 'Av. Pueyrredón 1235',       '@implantespremium',  'implantespremium.com',      'cliente',       '2026-08-27', 'Cerrado: web + campaña de captación de pacientes.'),
    lead('odo-04', 'odontologia',   'Ortodoncia Kids Belgrano',    '+54 9 11 3374 1128', 'Vuelta de Obligado 2450',   '@ortokids.belgrano', null,                        'sin_contactar', '2026-09-16', 'Muy activos en Instagram, sin sitio propio.')
  ];

  Bytes.data = { STATUSES: STATUSES, SECTORS: SECTORS, LEADS: LEADS };
})(window.Bytes);
