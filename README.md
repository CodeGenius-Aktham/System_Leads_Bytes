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
    ├── config.js                   # Configuración: Firebase, sesión, permisos, admins
    ├── data/
    │   └── leads.js                # STATUSES, SECTORS y LEADS (vacío)
    ├── store/
    │   ├── store.js                # Estado único + acciones + selectores
    │   ├── firebase.js             # Carga compartida del SDK (Auth + Firestore)
    │   ├── sync.js                 # Sincronización entre dispositivos (backend intercambiable)
    │   └── auth.js                 # Sesión con email y contraseña
    ├── utils/
    │   ├── dom.js                  # h(), icon(), mount(), delegate(), toast()
    │   └── format.js               # Enlaces WhatsApp/Maps/IG/Web, fechas, iniciales
    └── components/
        ├── LoginGate.js            # Puerta de entrada: sin sesión no se muestra nada
        ├── Header.js               # Navegación, sesión, alcance y estado del canal
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
| `onlyMine`           | Acota todo el sistema a los leads del responsable en sesión |
| `leads`              | Dataset de trabajo (copia de `leads.js` + estado compartido) |

### Selectores destacados

- `scopedLeads()` — **único** lugar donde se aplica "Solo mis leads". Por eso el
  filtro alcanza carpetas, listas, contadores y tablero sin tocar un solo
  componente.
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

**119 prospectos** cargados desde `Leads_Paginas_Web_Vendedores.pdf`
(septiembre 2026): negocios de Venezuela y Colombia con Instagram y sin página
web propia. Todos arrancan en `sin_contactar` y con `website: null`, que es la
premisa comercial de la investigación.

| Rubro | Leads |
|---|---:|
| Gastronomía | 37 |
| Comercio y servicios | 21 |
| Barberías y peluquerías | 19 |
| Salud dental y óptica | 14 |
| Estética y spa | 8 |
| Gimnasios y deporte | 8 |
| Veterinarias y mascotas | 8 |
| Eventos | 4 |

Reparto: **Moises 30 · Jorge 30 · Tiago 30 · Jesus 29**.
Países: Venezuela 60, Colombia 59.

El origen trae 110 rubros distintos para 119 negocios, demasiado granular para
carpetas útiles. Se agrupan en los 8 sectores de arriba y **el rubro textual se
conserva íntegro** en `activity`, visible en la ficha.

### Campos del lead

| Campo | Uso |
|---|---|
| `owner` | Vendedor asignado en la investigación |
| `activity` | Rubro textual, tal como figura en el origen |
| `message` | Mensaje de inicio propio. **Null en este set**: el botón de WhatsApp usa el genérico `Hola! Hablo con [negocio]` |
| `country` | Venezuela o Colombia |
| `note` | Qué dato falta, cuando el origen lo marcó incompleto |

### Registros incompletos

El origen marca 22 registros con algún dato faltante. Se cargan igual, sin
inventar nada, y la interfaz se adapta:

| Falta | Leads | Qué hace el sistema |
|---|---:|---|
| Teléfono | 6 | Botón de WhatsApp desactivado; la ficha dice "Sin teléfono registrado" |
| Instagram | 9 | Botón de Instagram desactivado |
| Dirección | 9 | Google Maps busca por nombre y ciudad, que sí están |

El faltante queda anotado en `note` y se muestra en la ficha.

### Set anterior

Este set reemplaza la investigación de 80 prospectos de septiembre. Su respaldo
completo —estado, autoría y mensajes— quedó en el PDF del 26/09/2026, junto con
un JSON restaurable.

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

## Acceso y cuentas

Con `requireAuth: true` en `src/config.js`, **el sistema no muestra nada hasta
que haya sesión**: ni la cabecera, ni los leads, ni el DOM. El login usa
Firebase Authentication con email y contraseña.

Eso resuelve dos cosas a la vez:

1. Los 80 teléfonos dejan de estar accesibles a cualquiera con la URL.
2. La autoría de cada cambio deja de ser declarativa: `updatedBy` sale de la
   cuenta, no de un desplegable, así que nadie puede firmar como otro.

### Activarlo en Firebase

1. **Authentication › Comenzar**
2. Pestaña **Sign-in method** › habilitar **Correo electrónico/contraseña**
3. Pestaña **Users** › **Agregar usuario**, uno por vendedor

El nombre que se muestra y se sella en cada cambio se deduce de la parte local
del correo (`jorge@… → Jorge`) y **tiene que coincidir con el campo `owner` de
los leads** para que funcione "Solo mis leads". Si los correos no coinciden,
usar el mapa `userNames` de `src/config.js`:

```js
userNames: {
  'j.perez@bytestechnology.com': 'Jorge'
}
```

### Reglas de Firestore con sesión

Una vez creadas las cuentas, reemplazar las reglas por estas, que además de
validar la forma de los datos **exigen estar autenticado**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leadStatus/{leadId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.data.keys().hasOnly(
                        ['status', 'updatedAt', 'updatedBy', 'ts'])
                   && request.resource.data.status in
                        ['sin_contactar', 'contactado', 'cliente', 'rechazado']
                   && request.resource.data.ts is int;
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

> Aplicar estas reglas **después** de crear las cuentas. Si se aplican antes,
> nadie podrá leer ni escribir y el indicador quedará en "Sin conexión".

### Al cerrar sesión

Se detiene la sincronización y **se borra el caché local de leads** del
dispositivo, para no dejar datos de clientes en un equipo compartido.

### Sin Firebase configurado

El sistema abre directo, sin login, en modo local — sirve para desarrollo con
doble clic en `index.html`. En ese modo reaparece el desplegable **"Soy"** de
la cabecera, que es declarativo y sólo alimenta la autoría.

---

## Cada uno toca solo sus leads

El reparto de la investigación asigna 20 leads a cada responsable. Con
`enforceOwnership: true` en `src/config.js`, **nadie puede cambiar el estado
de un lead que no le corresponde**.

Son dos capas, y la de abajo es la que manda:

| Capa | Qué hace | Se puede saltear |
|------|----------|------------------|
| Interfaz | Deshabilita el selector de estado y dice a quién está asignado | Sí (consola del navegador) |
| Reglas de Firestore | Rechaza la escritura con `PERMISSION_DENIED` | No |

Si una escritura llega a ser rechazada por el servidor, el estado local
**vuelve atrás** y se avisa el motivo. Sin eso la pantalla mostraría un cambio
que nunca se guardó: el criterio de última escritura hace que el eco remoto,
más viejo, no la corrija.

Las cuentas de `admins` (supervisión) editan los 80.

### Cómo lo sabe Firestore

Las reglas no conocen el reparto, así que vive en una colección propia:

```
leadOwners/{leadId} = { owner: 'Jorge' }
```

Se siembra **una sola vez** y después queda inmutable (`allow write: if false`).
Al escribir un estado, la regla consulta esa asignación:

```javascript
duenoDe(leadId) == nombre()   // nombre() mapea el correo de la cuenta
```

Es una colección **nueva**: no modifica ni un byte de `leadStatus`, así que los
estados ya registrados quedan intactos.

> Si falta la asignación de un lead, el `get()` de la regla falla y ese lead
> queda sin poder editarse. Hay que sembrar los 80.

### Archivos

```
firestore/
├── leadOwners.json        # las 80 asignaciones (lead -> responsable)
├── seed-leadOwners.js     # siembra la colección desde la consola del navegador
├── rules-seed.txt         # reglas TEMPORALES, solo para sembrar
└── rules.txt              # reglas definitivas
```

### Orden de aplicación

1. Publicar `firestore/rules-seed.txt`
2. Iniciar sesión en el sistema y correr `firestore/seed-leadOwners.js` en la
   consola del navegador
3. Completar en `firestore/rules.txt` el mapa de correos y la lista de admins
4. Publicar `firestore/rules.txt`
5. Completar `admins` en `src/config.js` con los mismos correos y desplegar

> El paso 5 importa: si las dos listas no coinciden, la interfaz va a permitir
> algo que el servidor después rechaza.

---

## Solo mis leads

El reparto de la investigación asigna 20 leads a cada responsable (campo
`owner`). El interruptor **"Solo mis leads"** de la cabecera acota **todo el
sistema** a los del responsable en sesión: carpetas, listas, buscador,
contadores y tablero Kanban.

Está implementado en un único punto —el selector `scopedLeads()`—, así que
ningún componente sabe que existe. Si la carpeta o la ficha abiertas quedan
fuera del alcance al activarlo, se cierran solas.

El interruptor sólo aparece si hay un responsable identificado con leads
asignados.

---

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

### Reglas mínimas (mientras no haya cuentas)

Si todavía no creaste las cuentas de Authentication, estas reglas dejan
funcionar la sincronización y limitan el daño —restringen la colección, los
campos y los valores posibles— pero **no son control de acceso**: cualquiera
con la URL puede leer los 80 teléfonos y cambiar estados. Son un paso
intermedio; las definitivas están en **Acceso y cuentas**.

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
<link rel="stylesheet" href="styles/base.css?v=20260926a" />
<script src="src/main.js?v=20260926a"></script>
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
