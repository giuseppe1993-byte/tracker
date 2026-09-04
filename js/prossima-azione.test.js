import test from 'node:test';
import assert from 'node:assert/strict';
import { prossimaAzione } from './prossima-azione.js';

function giornoBase(overrides = {}) {
  return { peso: 80, pastiLoggati: 0, alimenti: [], eventiAllenamento: [], extra: [], ...overrides };
}

test('peso non salvato → "pesati", priorità massima', () => {
  const giorno = giornoBase({ peso: null, eventiAllenamento: [{ ora: '10:00', tipo: 'inizio-allenamento' }] });
  assert.equal(prossimaAzione(giorno).tipo, 'pesati');
});

test('allenamento in corso (ultimo evento è inizio-allenamento) → "allenamento-in-corso"', () => {
  const giorno = giornoBase({ eventiAllenamento: [{ ora: '10:00', tipo: 'inizio-allenamento' }] });
  assert.equal(prossimaAzione(giorno).tipo, 'allenamento-in-corso');
});

test('post-workout appena iniziato, nessun pasto ancora loggato dopo → "post-workout"', () => {
  const giorno = giornoBase({ eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }] });
  assert.equal(prossimaAzione(giorno).tipo, 'post-workout');
});

test('nessun evento allenamento, peso già salvato → "prossimo-pasto"', () => {
  const giorno = giornoBase();
  assert.equal(prossimaAzione(giorno).tipo, 'prossimo-pasto');
});

test('post-workout già "consumato" (pasto loggato dopo l\'evento) → torna a "prossimo-pasto"', () => {
  const giorno = giornoBase({
    eventiAllenamento: [{ ora: '11:00', tipo: 'post-workout-iniziato' }],
    alimenti: [{ ora: '11:30', alimentoId: 'whey', grammiCrudi: 40 }]
  });
  assert.equal(prossimaAzione(giorno).tipo, 'prossimo-pasto');
});
