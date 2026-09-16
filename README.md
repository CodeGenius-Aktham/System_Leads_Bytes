# System Leads Bytes

Sistema de organización de leads para **Bytes Technology**. Prototipo interactivo
funcional (HTML + CSS + JavaScript vanilla, sin build ni dependencias) con datos
de prueba para validar la navegación, el filtrado y la reactividad del sistema.

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
├── index.html                      # Shell: cabecera estática + contenedores de vista
├── assets/
│   ├── logo.svg                    # Logo Bytes Technology (placeholder editable)
│   └── favicon.svg
├── styles/
│   ├── base.css                    # Reset + design tokens (colores de estado, radios, sombras)
│   ├── layout.css                  # Cabecera, shell de vistas, grilla de 2 columnas
│   └── components.css              # Carpetas, filtros, lista, ficha, KPIs, Kanban
└── src/
    ├── main.js                     # Bootstrap: init del store + suscripción de vistas
    ├── data/
    │   └── mock-leads.js           # Mock data: STATUSES, SECTORS, LEADS
    ├── store/
    │   └── store.js                # Estado único + acciones + selectores + persistencia
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
| `view`               | `'leads'` \| `'clasificados'`                              |
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

### Persistencia

Los cambios de estado de un lead se guardan en `localStorage`
(`bytes.leads.status.v1`) y sobreviven al refresco. Sólo se persisten los leads
modificados respecto del mock; **Reiniciar demo** (vista Clasificados) limpia la
clave y restaura el dataset original. Si `localStorage` está bloqueado
(modo privado), la app sigue funcionando en memoria.

---

## Módulo 1 · Vista "Leads"

Dos columnas, según la especificación:

| Columna       | Contenido                                                            |
|---------------|----------------------------------------------------------------------|
| **Izquierda** | Buscador, barra de filtros por estado y lista de leads del sector    |
| **Derecha**   | **Nivel 1:** carpetas por sector → **Nivel 2:** ficha del lead       |

1. La columna derecha arranca con las **carpetas dinámicas por rubro**
   (Inmobiliarias, Hospitales, Clínicas, Gimnasios, Gastronomía, Odontología).
   Cada carpeta muestra su total, sus clientes cerrados y una mini barra con la
   composición por estado.
2. Al seleccionar una carpeta, la columna izquierda despliega su lista de leads.
3. Los **4 botones de estado con código de color** filtran la lista para mostrar
   *únicamente* los leads de ese estado (más un botón "Todos" para volver).
4. Al hacer clic en un lead, **la ficha reemplaza a las carpetas** en la columna
   derecha. `Volver a sectores` (o `Esc`) regresa al nivel 1.

### Ficha del lead

- Nombre del negocio, rubro y píldora de estado.
- Teléfono con dirección y botón de copiado.
- **Botonera de acción rápida:**
  - **WhatsApp** → `https://wa.me/<tel>?text=Hola!%20Hablo%20con%20<Negocio>`,
    es decir el mensaje predefinido `Hola! Hablo con [Nombre del negocio]`.
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

- **Nivel 1** — KPIs de la base completa + contenedores por rubro. Al pie se
  informan los rubros del catálogo **sin** investigaciones (carpeta oculta), para
  dejar visible la regla de negocio.
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

## Datos de prueba

`src/data/mock-leads.js` trae **34 leads** repartidos en 6 rubros con datos, más
2 rubros del catálogo intencionalmente vacíos (**Veterinarias**, **Hoteles**)
para verificar que sus carpetas no se rendericen. El set incluye leads sin sitio
web y sin Instagram para validar los estados vacíos de la botonera.

Esta capa simula la respuesta de la API: sustituir `SECTORS` / `LEADS` por un
`fetch` no requiere tocar la interfaz.

```js
// forma de un lead
{
  id, sectorId, name, phone, address, city,
  mapsUrl,            // null → se construye una búsqueda con nombre + dirección
  instagram,          // null → botón de Instagram inactivo
  website,            // null → "No tiene página web"
  status,             // sin_contactar | contactado | cliente | rechazado
  updatedAt, note
}
```

---

## Atajos y detalles de UX

- `Esc` cierra la ficha del lead o vuelve al listado de sectores.
- Búsqueda por nombre, teléfono o dirección, insensible a acentos y mayúsculas.
- Estados vacíos explicativos en cada panel (sin sector, sin resultados, sin
  leads en el estado filtrado).
- Toasts de confirmación al cambiar un estado o copiar un teléfono.
- Navegación por teclado y `aria-pressed` / `aria-label` en controles.
- Responsive: en móvil las carpetas se muestran primero y el tablero Kanban pasa
  a una columna.

## Personalización

- **Logo**: reemplazar `assets/logo.svg` por el archivo oficial de la marca. El
  actual es un placeholder construido con la tipografía del sistema.
- **Colores**: todos los valores viven como custom properties en
  `styles/base.css` (`--brand-600`, `--st-gray`, `--st-amber`, `--st-green`,
  `--st-red`).
- **Rubros**: agregar una entrada a `SECTORS`; la carpeta aparecerá sola en
  cuanto ese rubro tenga su primer lead.
