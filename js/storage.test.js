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
