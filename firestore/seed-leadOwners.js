/* ==========================================================================
   firestore/seed-leadOwners.js
   Siembra la colección `leadOwners`: un documento por lead con el
   responsable asignado en la investigación. Es la fuente que consultan las
   reglas de Firestore para decidir quién puede cambiar cada estado.

   NO toca `leadStatus`: los estados registrados quedan intactos.

   Cómo ejecutarlo (una sola vez):
     1. En Firestore > Reglas, publicar TEMPORALMENTE firestore/rules-seed.txt
     2. Abrir el sistema, iniciar sesión y abrir la consola del navegador (F12)
     3. Pegar este archivo completo y ejecutar
     4. Volver a Firestore > Reglas y publicar firestore/rules.txt (definitivas)
   ========================================================================== */
(async function () {
  var OWNERS = {
  "brb-01": "Jesus",
  "brb-02": "Jesus",
  "brb-03": "Jesus",
  "brb-04": "Jorge",
  "brb-05": "Jorge",
  "brb-06": "Jorge",
  "brb-07": "Jorge",
  "brb-08": "Jorge",
  "brb-09": "Jorge",
  "brb-10": "Moises",
  "brb-11": "Moises",
  "brb-12": "Tiago",
  "brb-13": "Tiago",
  "brb-14": "Tiago",
  "brb-15": "Tiago",
  "brb-16": "Tiago",
  "brb-17": "Tiago",
  "brb-18": "Tiago",
  "brb-19": "Tiago",
  "com-01": "Jesus",
  "com-02": "Jesus",
  "com-03": "Jesus",
  "com-04": "Jesus",
  "com-05": "Jesus",
  "com-06": "Jorge",
  "com-07": "Jorge",
  "com-08": "Jorge",
  "com-09": "Jorge",
  "com-10": "Jorge",
  "com-11": "Jorge",
  "com-12": "Jorge",
  "com-13": "Jorge",
  "com-14": "Moises",
  "com-15": "Moises",
  "com-16": "Moises",
  "com-17": "Moises",
  "com-18": "Moises",
  "com-19": "Moises",
  "com-20": "Tiago",
  "com-21": "Tiago",
  "eve-01": "Jesus",
  "eve-02": "Jorge",
  "eve-03": "Tiago",
  "eve-04": "Tiago",
  "gas-01": "Jesus",
  "gas-02": "Jesus",
  "gas-03": "Jesus",
  "gas-04": "Jesus",
  "gas-05": "Jesus",
  "gas-06": "Jesus",
  "gas-07": "Jesus",
  "gas-08": "Jesus",
  "gas-09": "Jesus",
  "gas-10": "Jesus",
  "gas-11": "Jesus",
  "gas-12": "Jesus",
  "gas-13": "Jesus",
  "gas-14": "Jorge",
  "gas-15": "Jorge",
  "gas-16": "Jorge",
  "gas-17": "Moises",
  "gas-18": "Moises",
  "gas-19": "Moises",
  "gas-20": "Moises",
  "gas-21": "Moises",
  "gas-22": "Moises",
  "gas-23": "Moises",
  "gas-24": "Moises",
  "gas-25": "Moises",
  "gas-26": "Moises",
  "gas-27": "Moises",
  "gas-28": "Tiago",
  "gas-29": "Tiago",
  "gas-30": "Tiago",
  "gas-31": "Tiago",
  "gas-32": "Tiago",
  "gas-33": "Tiago",
  "gas-34": "Tiago",
  "gas-35": "Tiago",
  "gas-36": "Tiago",
  "gas-37": "Tiago",
  "gim-01": "Jorge",
  "gim-02": "Jorge",
  "gim-03": "Jorge",
  "gim-04": "Moises",
  "gim-05": "Moises",
  "gim-06": "Tiago",
  "gim-07": "Tiago",
  "gim-08": "Tiago",
  "sal-01": "Jesus",
  "sal-02": "Jesus",
  "sal-03": "Jesus",
  "sal-04": "Jorge",
  "sal-05": "Jorge",
  "sal-06": "Jorge",
  "sal-07": "Jorge",
  "sal-08": "Jorge",
  "sal-09": "Jorge",
  "sal-10": "Moises",
  "sal-11": "Moises",
  "sal-12": "Moises",
  "sal-13": "Moises",
  "sal-14": "Tiago",
  "spa-01": "Jesus",
  "spa-02": "Jesus",
  "spa-03": "Jorge",
  "spa-04": "Jorge",
  "spa-05": "Moises",
  "spa-06": "Moises",
  "spa-07": "Moises",
  "spa-08": "Tiago",
  "vet-01": "Jesus",
  "vet-02": "Jesus",
  "vet-03": "Jorge",
  "vet-04": "Moises",
  "vet-05": "Moises",
  "vet-06": "Tiago",
  "vet-07": "Tiago",
  "vet-08": "Tiago"
};

  var p = await window.Bytes.firebase.load();
  var ids = Object.keys(OWNERS);
  var ok = 0, fail = 0;

  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    try {
      await p.fs.setDoc(p.fs.doc(p.db, 'leadOwners', id), { owner: OWNERS[id] });
      ok++;
      if (ok % 20 === 0) console.log('  ' + ok + '/' + ids.length + '...');
    } catch (err) {
      fail++;
      console.error('fallo', id, err.message);
    }
  }
  console.log('listo: ' + ok + ' asignaciones escritas, ' + fail + ' fallidas');
  if (fail) console.warn('Revisa que las reglas de siembra esten publicadas.');
})();
