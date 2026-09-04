export function oggiISO() {
  return new Date().toISOString().slice(0, 10);
}

export function oraAttuale() {
  return new Date().toTimeString().slice(0, 5);
}

export function getGiornoOggi(data) {
  const chiave = oggiISO();
  if (!data.pasti[chiave]) {
    data.pasti[chiave] = { peso: null, pastiLoggati: 0, alimenti: [], eventiAllenamento: [] };
  }
  const giorno = data.pasti[chiave];
  if (!Array.isArray(giorno.extra)) giorno.extra = [];
  return giorno;
}

export function isPostWorkoutOra(giorno) {
  if (giorno.eventiAllenamento.length === 0) return false;
  const ultimoEvento = giorno.eventiAllenamento[giorno.eventiAllenamento.length - 1];
  if (ultimoEvento.tipo !== 'post-workout-iniziato') return false;
  if (giorno.alimenti.length === 0) return true;
  const ultimoAlimento = giorno.alimenti[giorno.alimenti.length - 1];
  return ultimoEvento.ora > ultimoAlimento.ora;
}
