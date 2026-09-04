import test from 'node:test';
import assert from 'node:assert/strict';
import { calcolaBMI, calcolaBF, calcolaBMR, calcolaTDEE, MOLTIPLICATORI_ATTIVITA } from './metabolismo.js';

test('calcolaBMI: 80kg, 180cm', () => {
  assert.ok(Math.abs(calcolaBMI(80, 180) - 24.6914) < 0.001);
});

test('calcolaBMR: uomo 30 anni, 80kg, 180cm', () => {
  // Mifflin-St Jeor uomo: 10*peso + 6.25*altezza - 5*eta + 5
  assert.equal(calcolaBMR({ pesoKg: 80, altezzaCm: 180, eta: 30, sesso: 'M' }), 1780);
});

test('calcolaBMR: donna 25 anni, 60kg, 165cm', () => {
  // Mifflin-St Jeor donna: 10*peso + 6.25*altezza - 5*eta - 161
  assert.equal(calcolaBMR({ pesoKg: 60, altezzaCm: 165, eta: 25, sesso: 'F' }), 1345.25);
});

test('calcolaBF: usa la formula di Deurenberg con il coefficiente sesso corretto', () => {
  const bmi = calcolaBMI(80, 180);
  const bfUomo = calcolaBF({ bmi, eta: 30, sesso: 'M' });
  const bfDonna = calcolaBF({ bmi, eta: 30, sesso: 'F' });
  // A parita' di BMI ed eta', la formula stima una massa grassa piu' alta per una donna (coefficiente sesso 0 vs 1).
  assert.ok(bfDonna > bfUomo);
  assert.ok(Math.abs(bfUomo - 20.3296) < 0.001);
});

test('calcolaTDEE: applica il moltiplicatore del livello di attivita', () => {
  const bmr = 1780;
  assert.equal(calcolaTDEE(bmr, 'sedentario'), 1780 * MOLTIPLICATORI_ATTIVITA.sedentario);
  assert.equal(calcolaTDEE(bmr, 'intenso'), 1780 * MOLTIPLICATORI_ATTIVITA.intenso);
});

test('calcolaTDEE: livello sconosciuto ricade su sedentario', () => {
  assert.equal(calcolaTDEE(1780, 'inesistente'), calcolaTDEE(1780, 'sedentario'));
});
