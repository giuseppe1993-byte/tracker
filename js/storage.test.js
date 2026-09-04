// js/storage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultData, loadData, saveData } from './storage.js';
import { datiDefault } from './dati-default.js';

function fakeBackend() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v)
  };
}

test('getDefaultData restituisce la struttura base', () => {
  const data = getDefaultData(datiDefault);
  assert.equal(data.mesociclo.dataInizio, null);
  assert.deepEqual(data.pasti, {});
  assert.ok(data.esercizi.squat);
  assert.equal(data.esercizi.squat.rangeMin, 6);
  assert.deepEqual(data.profilo, { sesso: null, eta: null, altezzaCm: null, livelloAttivita: 'sedentario' });
});

test('loadData su un salvataggio senza profilo (installazioni precedenti) usa i default', () => {
  const backend = fakeBackend();
  backend.setItem(
    'fitnessTrackerData',
    JSON.stringify({ mesociclo: { dataInizio: '2026-09-01' }, esercizi: {}, pasti: {} })
  );
  const data = loadData(datiDefault, backend);
  assert.deepEqual(data.profilo, { sesso: null, eta: null, altezzaCm: null, livelloAttivita: 'sedentario' });
});

test('loadData preserva il profilo su un round-trip salva/ricarica', () => {
  const backend = fakeBackend();
  const data = getDefaultData(datiDefault);
  data.profilo = { sesso: 'M', eta: 30, altezzaCm: 180, livelloAttivita: 'moderato' };
  saveData(data, backend);
  const ricaricato = loadData(datiDefault, backend);
  assert.deepEqual(ricaricato.profilo, { sesso: 'M', eta: 30, altezzaCm: 180, livelloAttivita: 'moderato' });
});

test('loadData su backend vuoto restituisce i default', () => {
  const backend = fakeBackend();
  const data = loadData(datiDefault, backend);
  assert.equal(data.mesociclo.dataInizio, null);
});

test('saveData poi loadData fa un round-trip corretto', () => {
  const backend = fakeBackend();
  const data = getDefaultData(datiDefault);
  data.mesociclo.dataInizio = '2026-09-08';
  saveData(data, backend);
  const ricaricato = loadData(datiDefault, backend);
  assert.equal(ricaricato.mesociclo.dataInizio, '2026-09-08');
});

test('loadData con JSON corrotto lancia un errore leggibile', () => {
  const backend = fakeBackend();
  backend.setItem('fitnessTrackerData', '{ non valido');
  assert.throws(() => loadData(datiDefault, backend), /corrotti/);
});

test('loadData senza storage disponibile lancia un errore leggibile', () => {
  assert.throws(() => loadData(datiDefault, null), /non disponibile/);
});

test('loadData aggiunge i default per un esercizio nuovo e conserva quelli esistenti', () => {
  const backend = fakeBackend();
  // Simula un'installazione vecchia: solo due esercizi salvati, con stato utente.
  backend.setItem(
    'fitnessTrackerData',
    JSON.stringify({
      mesociclo: { dataInizio: '2026-09-08' },
      esercizi: {
        squat: { nome: 'Squat (bilanciere)', rangeMin: 6, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 62.5, fallimentiConsecutivi: 1, storico: [{ data: '2026-09-10', peso: 60, reps: [8, 8, 7], rpe: 8, nota: 'ok' }] },
        panca: { nome: 'Panca piana (bilanciere)', rangeMin: 6, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 45, fallimentiConsecutivi: 0, storico: [] }
      },
      pasti: { '2026-09-10': { tipoGiorno: 'sera', fatti: ['pasto1'], extra: [], peso: 80 } }
    })
  );

  const data = loadData(datiDefault, backend);

  // Stato utente preservato sugli esercizi già presenti.
  assert.equal(data.esercizi.squat.ultimoPeso, 62.5);
  assert.equal(data.esercizi.squat.fallimentiConsecutivi, 1);
  assert.equal(data.esercizi.squat.storico.length, 1);
  assert.equal(data.esercizi.panca.ultimoPeso, 45);

  // Esercizi presenti in dati-default ma assenti dai dati salvati: valori di default.
  for (const id of Object.keys(datiDefault.esercizi)) {
    assert.ok(data.esercizi[id], `esercizio mancante dopo il merge: ${id}`);
  }
  assert.equal(data.esercizi.plank.ultimoPeso, datiDefault.esercizi.plank.ultimoPeso);
  assert.deepEqual(data.esercizi.plank.storico, []);
  assert.equal(data.esercizi.plank.tracciaProgressione, false);

  // La configurazione arriva sempre da dati-default (niente drift di schema).
  assert.equal(data.esercizi.squat.tracciaProgressione, true);
  assert.equal(data.esercizi.squat.rangeMax, datiDefault.esercizi.squat.rangeMax);

  // Il resto dei dati resta intatto.
  assert.equal(data.mesociclo.dataInizio, '2026-09-08');
  assert.equal(data.pasti['2026-09-10'].peso, 80);
});

test('loadData con una chiave di primo livello mancante lancia l\'errore di dati corrotti', () => {
  for (const chiaveMancante of ['mesociclo', 'esercizi', 'pasti']) {
    const backend = fakeBackend();
    const completo = { mesociclo: { dataInizio: null }, esercizi: {}, pasti: {} };
    delete completo[chiaveMancante];
    backend.setItem('fitnessTrackerData', JSON.stringify(completo));
    assert.throws(() => loadData(datiDefault, backend), /corrotti/, `chiave mancante: ${chiaveMancante}`);
  }
});

test('loadData con JSON valido ma di forma sbagliata lancia l\'errore di dati corrotti', () => {
  const backend = fakeBackend();
  backend.setItem('fitnessTrackerData', JSON.stringify({ a: 1 }));
  assert.throws(() => loadData(datiDefault, backend), /corrotti/);
});

test('loadData migra un giorno nel vecchio formato (checklist) al nuovo formato (log alimenti)', () => {
  const backend = fakeBackend();
  backend.setItem(
    'fitnessTrackerData',
    JSON.stringify({
      mesociclo: { dataInizio: '2026-09-08' },
      esercizi: {},
      pasti: {
        '2026-09-01': { tipoGiorno: 'sera', fatti: ['pasto1', 'pasto2'], extra: [{ testo: 'nota vecchia' }], peso: 80.4 }
      }
    })
  );

  const data = loadData(datiDefault, backend);
  const giorno = data.pasti['2026-09-01'];

  assert.equal(giorno.peso, 80.4);
  assert.equal(giorno.pastiLoggati, 0);
  assert.deepEqual(giorno.alimenti, []);
  assert.deepEqual(giorno.eventiAllenamento, []);
  assert.ok(!('tipoGiorno' in giorno));
  assert.ok(!('fatti' in giorno));
});

test('loadData lascia intatto un giorno già nel formato nuovo', () => {
  const backend = fakeBackend();
  backend.setItem(
    'fitnessTrackerData',
    JSON.stringify({
      mesociclo: { dataInizio: '2026-09-08' },
      esercizi: {},
      pasti: {
        '2026-09-03': {
          peso: 78.3,
          pastiLoggati: 2,
          alimenti: [{ ora: '12:30', alimentoId: 'pollo', grammiCrudi: 200, modalitaInserita: 'crudo' }],
          eventiAllenamento: [{ ora: '18:00', tipo: 'post-workout-iniziato' }],
          extra: [{ testo: 'couscous 150g' }],
          sessioneCompletata: { tipo: 'Upper', nota: '' }
        }
      }
    })
  );

  const data = loadData(datiDefault, backend);
  const giorno = data.pasti['2026-09-03'];

  assert.equal(giorno.pastiLoggati, 2);
  assert.equal(giorno.alimenti.length, 1);
  assert.equal(giorno.eventiAllenamento.length, 1);
  // Regressione: `extra` e `sessioneCompletata` venivano scartati a ogni
  // ricarica perché normalizzaGiorno non li includeva nel whitelisting.
  assert.deepEqual(giorno.extra, [{ testo: 'couscous 150g' }]);
  assert.deepEqual(giorno.sessioneCompletata, { tipo: 'Upper', nota: '' });
});

test('loadData preserva extra e sessioneCompletata su un round-trip salva/ricarica', () => {
  const backend = fakeBackend();
  const data = getDefaultData(datiDefault);
  data.pasti['2026-09-04'] = {
    peso: 80,
    pastiLoggati: 1,
    alimenti: [],
    eventiAllenamento: [],
    extra: [{ testo: 'nota di test' }],
    sessioneCompletata: { tipo: 'Lower', nota: 'poco tempo' }
  };
  saveData(data, backend);
  const ricaricato = loadData(datiDefault, backend);
  assert.deepEqual(ricaricato.pasti['2026-09-04'].extra, [{ testo: 'nota di test' }]);
  assert.deepEqual(ricaricato.pasti['2026-09-04'].sessioneCompletata, { tipo: 'Lower', nota: 'poco tempo' });
});

test('loadData con sessioneCompletata malformato la sostituisce con null', () => {
  const backend = fakeBackend();
  backend.setItem(
    'fitnessTrackerData',
    JSON.stringify({
      mesociclo: { dataInizio: '2026-09-08' },
      esercizi: {},
      pasti: {
        '2026-09-05': { peso: 80, pastiLoggati: 0, alimenti: [], eventiAllenamento: [], sessioneCompletata: 'non valido' }
      }
    })
  );
  const data = loadData(datiDefault, backend);
  assert.equal(data.pasti['2026-09-05'].sessioneCompletata, null);
});
