import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaProgressione } from './progressione.js';

const esercizioBilanciere = { rangeMin: 8, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 40, fallimentiConsecutivi: 0 };
const esercizioManubri = { rangeMin: 8, rangeMax: 10, tipo: 'manubri', ultimoPeso: 10, fallimentiConsecutivi: 0 };

test('tutte le serie al massimo del range aumenta il peso (bilanciere +2.5kg)', () => {
  const r = calcolaProgressione(esercizioBilanciere, { reps: [10, 10, 10] });
  assert.equal(r.azione, 'aumenta');
  assert.equal(r.nuovoPeso, 42.5);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});

test('tutte le serie al massimo del range aumenta il peso (manubri +1.5kg)', () => {
  const r = calcolaProgressione(esercizioManubri, { reps: [10, 10, 10] });
  assert.equal(r.azione, 'aumenta');
  assert.equal(r.nuovoPeso, 11.5);
});

test('una serie sotto il minimo, primo fallimento: peso invariato, contatore a 1', () => {
  const r = calcolaProgressione(esercizioBilanciere, { reps: [7, 9, 9] });
  assert.equal(r.azione, 'invariato');
  assert.equal(r.nuovoPeso, 40);
  assert.equal(r.nuoviFallimentiConsecutivi, 1);
});

test('una serie sotto il minimo, secondo fallimento consecutivo: peso diminuisce e contatore torna a 0', () => {
  const esercizioConUnFallimento = { ...esercizioBilanciere, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(esercizioConUnFallimento, { reps: [7, 9, 9] });
  assert.equal(r.azione, 'diminuisci');
  assert.equal(r.nuovoPeso, 37.5);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});

test('manubri, secondo fallimento consecutivo: peso diminuisce di 1.5kg', () => {
  const esercizioConUnFallimento = { ...esercizioManubri, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(esercizioConUnFallimento, { reps: [7, 9, 9] });
  assert.equal(r.azione, 'diminuisci');
  assert.equal(r.nuovoPeso, 8.5);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});

test('la diminuzione non scende mai sotto lo zero', () => {
  const manubriLeggeri = { rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 1, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(manubriLeggeri, { reps: [10, 10, 10] });
  assert.equal(r.azione, 'diminuisci');
  assert.equal(r.nuovoPeso, 0);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});

test('la diminuzione si ferma a zero anche partendo da zero', () => {
  const aCorpoLibero = { rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 0, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(aCorpoLibero, { reps: [8, 8, 8] });
  assert.equal(r.azione, 'diminuisci');
  assert.equal(r.nuovoPeso, 0);
});

test('nel mezzo del range (non tutte al massimo, nessuna sotto il minimo): invariato, contatore azzerato', () => {
  const esercizioConUnFallimento = { ...esercizioBilanciere, fallimentiConsecutivi: 1 };
  const r = calcolaProgressione(esercizioConUnFallimento, { reps: [10, 9, 8] });
  assert.equal(r.azione, 'invariato');
  assert.equal(r.nuovoPeso, 40);
  assert.equal(r.nuoviFallimentiConsecutivi, 0);
});
