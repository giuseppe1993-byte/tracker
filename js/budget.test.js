import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaConsumato, calcolaRimasto, suggerisciPasto } from './budget.js';

const db = {
  pollo: { nome: 'Petto di pollo', kcal: 120, p: 22.5, f: 2.6, c: 0 },
  riso: { nome: 'Riso bianco', kcal: 360, p: 6.61, f: 0.58, c: 79.3 },
  whey: { nome: 'Whey', kcal: 352, p: 78.1, f: 1.56, c: 6.25 },
  cremaDiRiso: { nome: 'Crema di riso', kcal: 359, p: 6.94, f: 1.3, c: 79.8 }
};

test('calcolaConsumato somma correttamente più alimenti loggati', () => {
  const alimenti = [
    { alimentoId: 'pollo', grammiCrudi: 200 },
    { alimentoId: 'riso', grammiCrudi: 100 }
  ];
  const risultato = calcolaConsumato(alimenti, db);
  assert.equal(risultato.kcal, 600);
  assert.ok(Math.abs(risultato.p - 51.61) < 0.001);
  assert.ok(Math.abs(risultato.f - 5.78) < 0.001);
  assert.ok(Math.abs(risultato.c - 79.3) < 0.001);
});

test('calcolaConsumato su lista vuota restituisce tutti zero', () => {
  const risultato = calcolaConsumato([], db);
  assert.deepEqual(risultato, { kcal: 0, p: 0, f: 0, c: 0 });
});

test('calcolaRimasto sottrae il consumato dal target', () => {
  const target = { kcal: 2145, p: 214, f: 72, c: 161 };
  const consumato = { kcal: 600, p: 51.61, f: 5.78, c: 79.3 };
  const rimasto = calcolaRimasto(target, consumato);
  assert.equal(rimasto.kcal, 1545);
  assert.ok(Math.abs(rimasto.p - 162.39) < 0.001);
  assert.ok(Math.abs(rimasto.f - 66.22) < 0.001);
  assert.ok(Math.abs(rimasto.c - 81.7) < 0.001);
});

test('suggerisciPasto normale (0 pasti loggati, 4 rimanenti): proteine spalmate uniformi', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'pollo', carbo: 'riso', grassoZero: false };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.equal(r.proteina.grammiCrudi, 235);
  assert.equal(r.carbo.grammiCrudi, 50);
  assert.equal(r.nota, null);
});

test('suggerisciPasto con grassoG nella combo: propone olio EVO in quota fissa (non spalmata)', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'pollo', carbo: 'riso', grassoZero: false, grassoG: 15 };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.deepEqual(r.grasso, { alimentoId: 'olioEvo', grammiCrudi: 15 });
});

test('suggerisciPasto senza grassoG nella combo: grasso resta null', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'pollo', carbo: 'riso', grassoZero: false };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.equal(r.grasso, null);
});

test('suggerisciPasto con grassoZero: niente olio anche se la combo ha grassoG', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'whey', carbo: 'cremaDiRiso', grassoZero: true, grassoG: 15 };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: true, combo, databaseAlimenti: db });
  assert.equal(r.grasso, null);
});

test('suggerisciPasto post-workout: quota carbo 1.5x rispetto a un pasto normale', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'whey', carbo: 'cremaDiRiso', grassoZero: true };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: true, combo, databaseAlimenti: db });
  assert.equal(r.proteina.grammiCrudi, 65);
  assert.equal(r.carbo.grammiCrudi, 65);
  assert.equal(r.nota, 'Pasto post-workout: niente olio/grassi aggiunti.');
});

test('suggerisciPasto con pastiLoggatiOggi oltre 4: pasti rimanenti resta almeno 1', () => {
  const rimasto = { kcal: 100, p: 20, f: 5, c: 10 };
  const combo = { proteina: 'pollo', carbo: 'riso', grassoZero: false };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 5, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.equal(r.proteina.grammiCrudi, 85);
  assert.equal(r.carbo.grammiCrudi, 10);
});

test('suggerisciPasto senza carbo nella combo: carbo resta null', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'pollo', carbo: null, grassoZero: false };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.equal(r.carbo, null);
  assert.ok(r.proteina.grammiCrudi > 0);
});

test('suggerisciPasto con budget già superato (rimasto negativo): grammi a zero, mai negativi', () => {
  const rimasto = { kcal: -50, p: -5, f: -2, c: -10 };
  const combo = { proteina: 'pollo', carbo: 'riso', grassoZero: false };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.equal(r.proteina.grammiCrudi, 0);
  assert.equal(r.carbo.grammiCrudi, 0);
});

test('suggerisciPasto arrotonda sempre per difetto al multiplo di 5', () => {
  const rimasto = { kcal: 2145, p: 214, f: 72, c: 161 };
  const combo = { proteina: 'pollo', carbo: 'riso', grassoZero: false };
  const r = suggerisciPasto({ rimasto, pastiLoggatiOggi: 0, isPostWorkout: false, combo, databaseAlimenti: db });
  assert.equal(r.proteina.grammiCrudi % 5, 0);
  assert.equal(r.carbo.grammiCrudi % 5, 0);
});
