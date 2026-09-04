import test from 'node:test';
import assert from 'node:assert/strict';
import { iconCasa, iconBilancia, iconForchetta, iconManubrio, iconGrafico, iconSpunta } from './icons.js';

const tutteLeIcone = { iconCasa, iconBilancia, iconForchetta, iconManubrio, iconGrafico, iconSpunta };

for (const [nome, fn] of Object.entries(tutteLeIcone)) {
  test(`${nome} restituisce un <svg> valido con viewBox e senza colori hardcoded`, () => {
    const markup = fn();
    assert.match(markup, /^<svg /);
    assert.match(markup, /viewBox="0 0 24 24"/);
    assert.match(markup, /stroke="currentColor"/);
    assert.doesNotMatch(markup, /#[0-9a-fA-F]{3,6}/);
  });
}
