/* ==========================================================================
   src/config.js
   Configuración de sincronización compartida.

   SIN CONFIGURAR (como está ahora): los cambios de estado se guardan en el
   navegador y se propagan entre pestañas del MISMO dispositivo. Cada teléfono
   ve solo lo suyo.

   CONFIGURADO con Firebase: los cambios viajan a Firestore y aparecen en
   tiempo real en todos los dispositivos que tengan el sistema abierto.

   Cómo activarlo (5 pasos, ~10 minutos):
     1. Crear un proyecto en https://console.firebase.google.com
     2. Build > Firestore Database > Crear base de datos
     3. Configuración del proyecto > Tus apps > Web (</>) > registrar app
     4. Copiar los valores de `firebaseConfig` acá abajo
     5. Aplicar las reglas de seguridad que están en el README
        (sección "Sincronización entre dispositivos")

   Los valores de Firebase para web son públicos por diseño: van en el cliente
   de cualquier app web. La seguridad la dan las reglas de Firestore, no el
   secreto de estas claves.

   `measurementId` queda registrado por si más adelante se quiere Analytics,
   pero el sistema NO lo inicializa: no hace falta para sincronizar y evita
   sumar rastreo y una dependencia más.
   ========================================================================== */
window.BYTES_SYNC_CONFIG = {
  enabled: true,

  // Colección de Firestore donde vive el estado de cada lead
  collection: 'leadStatus',

  firebase: {
    apiKey: 'AIzaSyBFWZFLWJcZb2k7WC1EROzqO6Ar3HPosws',
    authDomain: 'bytes-leads.firebaseapp.com',
    projectId: 'bytes-leads',
    storageBucket: 'bytes-leads.firebasestorage.app',
    messagingSenderId: '316421079855',
    appId: '1:316421079855:web:36dc58fc8827ff0c96d7da',
    measurementId: 'G-BBQZJ50GET'
  }
};
