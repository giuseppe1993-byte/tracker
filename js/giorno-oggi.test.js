import test from 'node:test';
import assert from 'node:assert/strict';
import { oggiISO, getGiornoOggi, isPostWorkoutOra } from './giorno-oggi.js';

test('oggiISO restituisce una data in formato YYYY-MM-DD', () => {
  assert.match(oggiISO(), /^\d{4}-\d{2}-\d{2}$/);
});

test('getGiornoOggi crea un record di default se assente', () => {
  const data = { pasti: {} };
  const giorno = getGiornoOggi(data);
  assert.deepEqual(giorno, { peso: null, pastiLoggati: 0, alimenti: [], eventiAllenamento: [], extra: [] });
});

test('getGiornoOggi è idempotente: seconda chiamata restituisce lo stesso oggetto', () => {
  const data = { pasti: {} };
  const primo = getGiornoOggi(data);
  primo.peso = 80;
  const secondo = getGiornoOggi(data);
  assert.equal(secondo, primo);
  assert.equal(secondo.peso, 80);
});

test('getGiornoOggi aggiunge extra=[] a un record esistente che non lo ha', () => {
  const chiave = oggiISO();
  const data = { pasti: { [chiave]: { peso: 80, pastiLoggati: 0, alimenti: [], eventiAllenamento: [] } } };
  const giorno = getGiornoOggi(data);
  assert.deepEqual(giorno.extra, []);
});

test('isPostWorkoutOra: false se nessun evento allenamento', () => {
  const giorno = { eventiAllenamento: [], alimenti: [] };
  assert.equal(isPostWorkoutOra(giorno), false);
});

test('isPostWorkoutOra: false se l\'ultimo evento è "inizio-allenamento"', () => {
  const giorno = { eventiAllenamento: [{ ora: '10:00', tipo: 'inizio-allenamento' }], alimenti: [] };
  assert.equal(isPostWorkoutOra(giorno), false);
});

test('isPostWorkoutOra: true se post-workout iniziato e nessun alimento ancora loggato', () => {
  const giorno = { eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }], alimenti: [] };
  assert.equal(isPostWorkoutOra(giorno), true);
});

test('isPostWorkoutOra: true se il post-workout è più recente dell\'ultimo alimento loggato', () => {
  const giorno = {
    eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }],
    alimenti: [{ ora: '10:30', alimentoId: 'pollo', grammiCrudi: 100 }]
  };
  assert.equal(isPostWorkoutOra(giorno), true);
});

test('isPostWorkoutOra: false se è già stato loggato un alimento dopo il post-workout', () => {
  const giorno = {
    eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }],
    alimenti: [{ ora: '11:30', alimentoId: 'pollo', grammiCrudi: 100 }]
  };
  assert.equal(isPostWorkoutOra(giorno), false);
});
