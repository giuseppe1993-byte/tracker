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
  if (giorno.sessioneCompletata === undefined) giorno.sessioneCompletata = null;
  return giorno;
}

// Aggiunge `ore` a un orario "HH:MM", con wrap-around oltre la mezzanotte
// (usato per calcolare gli slot dei 4 pasti a partire dal primo del giorno).
export function orarioPiuOre(ora, ore) {
  const [h, m] = ora.split(':').map(Number);
  const totaleMinuti = (((h * 60 + m + ore * 60) % (24 * 60)) + 24 * 60) % (24 * 60);
  const nuoveOre = Math.floor(totaleMinuti / 60);
  const nuoviMinuti = totaleMinuti % 60;
  return `${String(nuoveOre).padStart(2, '0')}:${String(nuoviMinuti).padStart(2, '0')}`;
}

// Numero di pasti loggati oggi, derivato dagli orari distinti in `alimenti`
// invece di un contatore separato: un contatore incrementato solo in avanti
// si disallinea non appena si rimuove una voce dalla lista (bug osservato:
// cancellando tutto il log, il contatore restava alto e il motore di
// suggerimento finiva per proporre l'intero budget giornaliero in un colpo
// solo). Ogni azione di log (proposta accettata o inserimento manuale) scrive
// tutte le sue voci con lo stesso `ora`, quindi contare gli orari distinti
// equivale a contare le azioni di log, sempre in sincronia con la lista vera.
export function contaPastiLoggati(giorno) {
  return new Set(giorno.alimenti.map((voce) => voce.ora)).size;
}

export function isPostWorkoutOra(giorno) {
  if (giorno.eventiAllenamento.length === 0) return false;
  const ultimoEvento = giorno.eventiAllenamento[giorno.eventiAllenamento.length - 1];
  if (ultimoEvento.tipo !== 'post-workout-iniziato') return false;
  if (giorno.alimenti.length === 0) return true;
  const ultimoAlimento = giorno.alimenti[giorno.alimenti.length - 1];
  return ultimoEvento.ora > ultimoAlimento.ora;
}
