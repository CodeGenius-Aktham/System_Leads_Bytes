# System Leads Bytes

Sistema de organización de leads para **Bytes Technology**. Aplicación web
funcional (HTML + CSS + JavaScript vanilla, sin build ni dependencias).

Base cargada con **80 prospectos** (`src/data/leads.js`), provenientes de la
investigación de rubros de `prospectos.pdf`.

## Cómo ejecutarlo

```bash
# Opción 1 — abrir directo (no requiere servidor)
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows

# Opción 2 — servidor estático (recomendado para desarrollo)
npx serve .
```

No hay `npm install`, ni bundler, ni framework: el prototipo se abre con doble
clic. Los scripts se cargan como scripts clásicos (no módulos ES) justamente
para que funcione bajo el protocolo `file://`.

---

## Estructura del proyecto

```
System_Leads_Bytes/
├── index.html                      # Shell: cabecera + pantalla inicial + vistas
├── assets/
│   ├── isotipo.svg                 # Marca Bytes (trazo fino) — logo central
│   ├── isotipo-ui.svg              # Misma marca, trazo engrosado — cabecera a 38px
│   └── favicon.svg
├── styles/
│   ├── base.css                    # Reset + design tokens (colores de estado, radios, sombras)
│   ├── layout.css                  # Cabecera, shell de vistas, grilla de 2 columnas
│   └── components.css              # Carpetas, filtros, lista, ficha, KPIs, Kanban
└── src/
    ├── main.js                     # Bootstrap: init del store + suscripción de vistas
    ├── config.js                   # Configuración de sincronización (Firebase)
    ├── data/
    │   └── leads.js                # STATUSES, SECTORS y LEADS (vacío)
    ├── store/
    │   ├── store.js                # Estado único + acciones + selectores
    │   └── sync.js                 # Sincronización entre dispositivos (backend intercambiable)
    ├── utils/
    │   ├── dom.js                  # h(), icon(), mount(), delegate(), toast()
    │   └── format.js               # Enlaces WhatsApp/Maps/IG/Web, fechas, iniciales
    └── components/
        ├── Header.js               # Navegación principal (Leads / Clasificados)
        ├── LeadsView.js            # Módulo 1 — orquesta las dos columnas
        │   ├── StatusFilterBar.js  #   izquierda: 4 botones de estado + "Todos"
        │   ├── LeadList.js         #   izquierda: lista de leads del sector
        │   ├── SectorFolders.js    #   derecha nivel 1: carpetas por rubro
        │   └── LeadDetail.js       #   derecha nivel 2: ficha + acciones + estado
        └── ClassifiedView.js       # Módulo 2 — panel analítico
            ├── KpiPanel.js         #   contadores en tiempo real (5 KPIs)
            └── KanbanBoard.js      #   4 columnas de condición con sus leads
```

---

## Arquitectura

**Store observable** (`src/store/store.js`) como única fuente de verdad.
Los componentes nunca se comunican entre sí: despachan acciones y se
re-renderizan cuando el store emite.

```
   Componente  ──despacha──►  store.actions  ──muta──►  state
        ▲                                                 │
        └──────────── render(state) ◄──── emit() ◄─────────┘
```

Cada componente es una factory `create() → { el, render(state) }`:

- **`el`** — su nodo raíz, creado una sola vez al montar.
- **`render(state)`** — proyecta el estado sobre ese nodo (idempotente).

`main.js` sólo re-renderiza la vista activa. Los listeners se registran una vez
sobre el nodo raíz mediante **delegación de eventos** (`dom.delegate`), por lo
que re-renderizar el contenido nunca deja handlers colgando.

### Estado de la aplicación

| Campo                | Uso                                                        |
|----------------------|------------------------------------------------------------|
| `view`               | `null` (pantalla inicial) \| `'leads'` \| `'clasificados'`   |
| `selectedSectorId`   | Carpeta abierta en la vista Leads                          |
| `selectedLeadId`     | Ficha abierta (nivel 2 del panel derecho); `null` → carpetas |
| `statusFilter`       | `'todos'` \| `'sin_contactar'` \| `'contactado'` \| `'cliente'` \| `'rechazado'` |
| `search`             | Término de búsqueda de la columna izquierda                |
| `classifiedSectorId` | Sector abierto en la vista Clasificados                    |
| `leads`              | Dataset de trabajo (copia del mock + overrides locales)    |

### Selectores destacados

- `visibleSectors()` — aplica la **regla de negocio**: una carpeta sólo existe si
  el rubro tiene leads registrados. Los rubros vacíos del catálogo quedan fuera.
- `filteredLeads()` — sector + filtro de estado + búsqueda.
- `countsFor(leads)` — base de los KPIs: `total` y los 4 contadores por estado.
- `groupByStatus(leads)` — arma las 4 columnas del Kanban.

### Persistencia y sincronización

El estado comercial de cada lead se sincroniza por `src/store/sync.js`, que
expone un backend intercambiable con dos operaciones:

```js
subscribe(onChange) -> unsubscribe   // empuja el mapa completo de estados
write(leadId, record) -> Promise     // publica el cambio de un lead
```

Hay dos implementaciones:

| Backend            | Alcance                                   | Cuándo se usa                     |
|--------------------|-------------------------------------------|-----------------------------------|
| `LocalBackend`     | Pestañas del **mismo** dispositivo        | Por defecto, y como caché offline |
| `FirestoreBackend` | **Todos** los dispositivos, en tiempo real | Al configurar `src/config.js`     |

Ver la sección **Sincronización entre dispositivos** para activarlo.

Detalles del diseño:

- **Un registro por lead**, no un documento único con todos: dos personas que
  marcan leads distintos al mismo tiempo no se pisan.
- **Escritura optimista**: el cambio se aplica local y se renderiza al
  instante; después se publica. Si la red falla, el indicador de la cabecera
  pasa a "Sin conexión" y el cambio queda guardado en el equipo.
- **Conflictos por última escritura** (`ts` en milisegundos). Un eco remoto
  viejo no puede pisar un cambio local más nuevo.
- **Caché offline**: cada mapa recibido se espeja en `localStorage`, así el
  primer render no espera a la red.
- **Reconciliación al conectar**: en la primera sincronización, lo que el
  equipo marcó sin conexión —o antes de que existiera el canal compartido— se
  publica si el servidor no lo tiene o lo tiene más viejo. Sin esto, conectar
  contra una base vacía borraría los cambios ya guardados en el dispositivo.
- **Atribución**: cada cambio guarda `updatedBy`, tomado del selector "Soy"
  de la cabecera (se guarda por dispositivo). La ficha muestra quién dejó el
  lead en ese estado.

---

## Pantalla inicial

Al abrir el sistema **no hay ningún botón presionado** y el área central muestra
únicamente el logo de Bytes. Recién al pulsar `Leads` o `Clasificados` se carga
el módulo correspondiente. El isotipo de la cabecera (o `Esc`) devuelve a esta
pantalla.

---

## Módulo 1 · Vista "Leads"

Dos columnas, según la especificación:

| Columna       | Contenido                                                            |
|---------------|----------------------------------------------------------------------|
| **Izquierda** | Buscador, barra de filtros por estado y lista de leads del sector    |
| **Derecha**   | **Nivel 1:** carpetas por sector → **Nivel 2:** ficha del lead       |

1. La columna derecha arranca con las **carpetas dinámicas por rubro**. Cada
   carpeta muestra su total, sus clientes cerrados y una mini barra con la
   composición por estado. Con la base vacía no se muestra ninguna.
2. Al seleccionar una carpeta, la columna izquierda despliega su lista de leads.
3. Los **4 botones de estado con código de color** filtran la lista para mostrar
   *únicamente* los leads de ese estado (más un botón "Todos" para volver).
4. Al hacer clic en un lead, **la ficha reemplaza a las carpetas** en la columna
   derecha. `Volver a sectores` (o `Esc`) regresa al nivel 1.

### Ficha del lead

- Nombre del negocio, rubro y píldora de estado.
- Teléfono con dirección y botón de copiado.
- **Botonera de acción rápida:**
  - **WhatsApp** → abre el chat con el **mensaje de inicio** redactado para
    ese prospecto (campo `message`). Si un lead no lo tiene, cae al genérico
    `Hola! Hablo con [Nombre del negocio]`. El mensaje completo se muestra en
    la ficha, con botón para copiarlo, antes de abrir la conversación.
  - **Google Maps** → URL guardada del lead, o búsqueda por nombre + dirección.
  - **Instagram** → perfil del negocio; si no tiene, el botón queda inactivo.
  - **Sitio Web** → su página. Si no posee, el botón se muestra deshabilitado
    (borde punteado) con el texto explícito **"No tiene página web"**.
- **Selector rápido de estado**: los 4 botones de color cambian el estado en
  tiempo real. El cambio se refleja al instante en la lista, en las carpetas, en
  los KPIs y en el Kanban.

### Códigos de estado

| Color      | Estado                  | Significado                                            |
|------------|-------------------------|--------------------------------------------------------|
| 🔘 Gris     | `sin_contactar`         | Aún no se les escribió ni gestionó                     |
| 🟡 Amarillo | `contactado`            | Ya se les escribió / esperando respuesta               |
| 🟢 Verde    | `cliente`               | Cerraron la venta exitosamente                         |
| 🔴 Rojo     | `rechazado`             | Rechazaron la propuesta o declinaron la venta          |

---

## Módulo 2 · Vista "Clasificados"

Panel analítico y organizativo en dos niveles:

- **Nivel 1** — KPIs de la base completa + contenedores por rubro. Cuando hay
  datos cargados, al pie se informan los rubros del catálogo **sin**
  investigaciones (carpeta oculta), para dejar visible la regla de negocio.
- **Nivel 2** — al seleccionar un sector: KPIs del rubro + las **4 columnas de
  condición** (Sin contactar, En proceso, Cliente, Rechazado) con todos sus
  leads. Cada tarjeta abre la ficha completa en la vista Leads.

### Panel de métricas (KPIs en tiempo real)

| KPI              | Descripción                                    |
|------------------|------------------------------------------------|
| Total de leads   | Leads registrados en el alcance actual         |
| Sin accionar     | Estado gris                                    |
| En espera        | Estado amarillo                                |
| Clientes         | Estado verde                                   |
| Rechazados       | Estado rojo                                    |

Cada KPI incluye su porcentaje sobre el total, y debajo se dibuja una barra de
composición con la distribución del rubro. Todo se recalcula en cada emisión del
store, por lo que cambiar un estado actualiza los contadores al instante.

---

## Datos cargados

`src/data/leads.js` expone `STATUSES`, `SECTORS` y `LEADS`. Esta capa simula la
respuesta de la API: sustituirla por un `fetch` no requiere tocar la interfaz.

**80 prospectos** cargados desde `prospectos.pdf`, todos en estado
`sin_contactar` y todos sin página web — que es justamente la premisa comercial
de la investigación.

| Rubro                    | Leads | Actividades del origen                                          |
|--------------------------|------:|-----------------------------------------------------------------|
| Estudios de tatuajes     |    42 | Estudio de tatuajes · Tienda de piercings y tatuajes · Tatuador |
| Barberías                |    25 | Barbería                                                        |
| Estética y peluquería    |     6 | Centro de estética · Peluquería · Spa de uñas                   |
| Manicura y uñas          |     6 | Salón de manicura y pedicura · Spa/Manicura                     |
| Pastelería y repostería  |     1 | Pastelería/Repostería                                           |

Reparto por responsable: **Jesus 20 · Moises 20 · Jorge 20 · Thiago 20**.
Países: Colombia (49, `+57`) y Venezuela (31, `+58`).

Tres campos propios de esta carga se suman a la forma base del lead:

| Campo      | Uso                                                                  |
|------------|----------------------------------------------------------------------|
| `owner`    | Responsable asignado en la investigación                             |
| `activity` | Actividad textual del negocio, tal como figura en el origen          |
| `message`  | Mensaje de inicio redactado para ese prospecto; lo usa el botón de WhatsApp |

### Calidad de los datos

Un registro llegó con datos incompletos desde el origen y se cargó **tal cual**,
sin inventar nada:

- **Inked Tatto Studio** (Bucaramanga): en la columna de Instagram trae un post
  (`post/Ch3AB6rp0MY`) en lugar de un usuario, y el teléfono `+57 76945564`
  tiene 10 dígitos en vez de los 12 habituales de un móvil colombiano, así que
  el enlace de WhatsApp probablemente no funcione. Conviene verificarlo.

```js
// forma de cada lead
{
  id:        'inm-01',                 // identificador único
  sectorId:  'inmobiliarias',          // debe existir en SECTORS
  name:      'Inmobiliaria Del Sur',   // nombre del negocio
  phone:     '+54 9 11 4521 8890',     // se normaliza para wa.me
  address:   'Av. Rivadavia 4820',
  city:      'Buenos Aires, Argentina',
  mapsUrl:   null,                     // null → búsqueda por nombre + dirección
  instagram: '@inmodelsur',            // null → botón de Instagram inactivo
  website:   'inmodelsur.com.ar',      // null → "No tiene página web"
  status:    'sin_contactar',          // sin_contactar | contactado | cliente | rechazado
  updatedAt: '2026-09-10',             // ISO corto (YYYY-MM-DD)
  note:      'Notas de la investigación.'
}
```

En cuanto un lead tenga un `sectorId`, la carpeta de ese rubro aparece sola.

---

## Atajos y detalles de UX

- `Esc` cierra la ficha del lead, vuelve al listado de sectores o, si no hay
  nada abierto, regresa a la pantalla inicial.
- Búsqueda por nombre, teléfono o dirección, insensible a acentos y mayúsculas.
- Estados vacíos explicativos en cada panel (sin sector, sin resultados, sin
  leads en el estado filtrado).
- Toasts de confirmación al cambiar un estado o copiar un teléfono.
- Estado inicial limpio: sin módulo cargado ni filtros aplicados.
- Navegación por teclado y `aria-pressed` / `aria-label` en controles.
- Responsive: en móvil las carpetas se muestran primero y el tablero Kanban pasa
  a una columna.

## Sincronización entre dispositivos

Sin configurar, cada teléfono ve solo sus propios cambios. Para que un
"Rechazado" marcado por una persona aparezca en todos los dispositivos:

1. Crear un proyecto en <https://console.firebase.google.com>
2. **Build › Firestore Database › Crear base de datos**
3. **Configuración del proyecto › Tus apps › Web (`</>`)** y registrar la app
4. Copiar los valores de `firebaseConfig` en `src/config.js` y poner
   `enabled: true`
5. Aplicar las reglas de seguridad (abajo) en **Firestore › Reglas**

El indicador de la cabecera pasa de *"Solo este equipo"* a *"En vivo"* cuando
la conexión queda establecida.

### ⚠️ Antes de activarlo: control de acceso

**El sitio es público y el repositorio también.** Con las reglas abiertas que
Firebase sugiere por defecto, cualquiera que encuentre la URL podría leer y
borrar el pipeline completo, con los 80 teléfonos de los prospectos adentro.

Estas reglas limitan el daño —restringen la colección, los campos y los
valores posibles— pero **no son control de acceso**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leadStatus/{leadId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasOnly(
                        ['status', 'updatedAt', 'updatedBy', 'ts'])
                   && request.resource.data.status in
                        ['sin_contactar', 'contactado', 'cliente', 'rechazado']
                   && request.resource.data.ts is int;
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

Para un uso real conviene sumar **Authentication › Email/Password** con una
cuenta por vendedor y cambiar las dos primeras condiciones a
`if request.auth != null`. Eso además da una atribución confiable: hoy el
selector "Soy" es declarativo y cualquiera puede elegir cualquier nombre.

### Usar otro backend

El contrato son dos funciones. Para Supabase, una API propia o cualquier otra
cosa, se implementa `subscribe` / `write` y se inyecta:

```js
Bytes.sync.useBackend(miBackend, 'mi-modo');
```

El resto del sistema no cambia.

---

## Publicar cambios (GitHub Pages)

El sitio se sirve desde `main` en
`https://codegenius-aktham.github.io/System_Leads_Bytes/`.

GitHub Pages envía el HTML y los estáticos con `Cache-Control: max-age=600`,
así que el navegador puede seguir mostrando la versión anterior hasta 10
minutos después de un deploy. Para evitarlo, `index.html` referencia sus
recursos con un parámetro de versión:

```html
<link rel="stylesheet" href="styles/base.css?v=20260916e" />
<script src="src/main.js?v=20260916e"></script>
```

**Al publicar un cambio, subí ese identificador** (por ejemplo a `20260917a`)
con un reemplazo global en `index.html`. Así cada deploy fuerza al navegador a
descargar los archivos nuevos y nadie ve una versión vieja.

---

## Personalización

- **Marca**: `assets/isotipo.svg` es una reconstrucción vectorial del isotipo de
  Bytes (anillos concéntricos con cortes alternados). `isotipo-ui.svg` es la
  misma figura con el trazo engrosado, para que lea nítida a 38px en la
  cabecera. Si tenés el SVG oficial, reemplazá ambos archivos.
- **Wordmark**: el texto "Bytes" de la pantalla inicial se compone en HTML con
  Inter 900 italic (`.brand-hero__word` en `styles/layout.css`), como
  aproximación a la tipografía de la marca. Para usar el lockup oficial,
  sustituí el bloque `.brand-hero` de `index.html` por un único `<img>`.
- **Colores**: todos los valores viven como custom properties en
  `styles/base.css`. El verde institucional es `--brand-600: #1A5C14`; los
  colores de estado (`--st-gray`, `--st-amber`, `--st-green`, `--st-red`) son
  funcionales y no deberían cambiarse.
- **Rubros**: agregar una entrada a `SECTORS`; la carpeta aparecerá sola en
  cuanto ese rubro tenga su primer lead.
