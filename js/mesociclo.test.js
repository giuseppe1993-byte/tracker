import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaSettimana, calcolaFase, applicaDeload } from './mesociclo.js';

test('calcolaSettimana: lo stesso giorno di inizio è settimana 1', () => {
  assert.equal(calcolaSettimana('2026-09-08', '2026-09-08'), 1);
});

test('calcolaSettimana: 7 giorni dopo è settimana 2', () => {
  assert.equal(calcolaSettimana('2026-09-08', '2026-09-15'), 2);
});

test('calcolaSettimana: 30 giorni dopo è settimana 5', () => {
  assert.equal(calcolaSettimana('2026-09-08', '2026-10-08'), 5);
});

test('calcolaFase: settimane 1-2 sono fase1', () => {
  assert.equal(calcolaFase(1), 'fase1');
  assert.equal(calcolaFase(2), 'fase1');
});

test('calcolaFase: settimane 3-4 sono fase2', () => {
  assert.equal(calcolaFase(3), 'fase2');
  assert.equal(calcolaFase(4), 'fase2');
});

test('calcolaFase: settimana 5 è deload', () => {
  assert.equal(calcolaFase(5), 'deload');
});

test('calcolaFase: oltre settimana 5 è mesociclo2 (placeholder)', () => {
  assert.equal(calcolaFase(6), 'mesociclo2');
});

test('applicaDeload riduce le serie di circa il 30%, minimo 1', () => {
  assert.equal(applicaDeload(4), 3);
  assert.equal(applicaDeload(3), 2);
  assert.equal(applicaDeload(2), 1);
  assert.equal(applicaDeload(1), 1);
});
