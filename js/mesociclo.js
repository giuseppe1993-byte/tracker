const MS_PER_GIORNO = 24 * 60 * 60 * 1000;

export function calcolaSettimana(dataInizio, oggi) {
  const diffGiorni = Math.floor((new Date(oggi) - new Date(dataInizio)) / MS_PER_GIORNO);
  return Math.floor(diffGiorni / 7) + 1;
}

export function calcolaFase(settimana) {
  if (settimana <= 2) return 'fase1';
  if (settimana <= 4) return 'fase2';
  if (settimana === 5) return 'deload';
  return 'mesociclo2';
}

export function applicaDeload(serie) {
  return Math.max(1, Math.round(serie * 0.7));
}
