const INCREMENTO = { bilanciere: 2.5, manubri: 1.5 };

export function calcolaProgressione(esercizio, sessione) {
  const { rangeMin, rangeMax, tipo, ultimoPeso, fallimentiConsecutivi } = esercizio;
  const incremento = INCREMENTO[tipo];
  const tutteAlMassimo = sessione.reps.every((r) => r >= rangeMax);
  const almenoUnaSottoMinimo = sessione.reps.some((r) => r < rangeMin);

  if (tutteAlMassimo) {
    return { nuovoPeso: ultimoPeso + incremento, nuoviFallimentiConsecutivi: 0, azione: 'aumenta' };
  }

  if (almenoUnaSottoMinimo) {
    const nuoviFallimenti = fallimentiConsecutivi + 1;
    if (nuoviFallimenti >= 2) {
      return { nuovoPeso: ultimoPeso - incremento, nuoviFallimentiConsecutivi: 0, azione: 'diminuisci' };
    }
    return { nuovoPeso: ultimoPeso, nuoviFallimentiConsecutivi: nuoviFallimenti, azione: 'invariato' };
  }

  return { nuovoPeso: ultimoPeso, nuoviFallimentiConsecutivi: 0, azione: 'invariato' };
}
