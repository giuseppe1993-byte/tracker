const STORAGE_KEY = 'fitnessTrackerData';
const CHIAVI_RICHIESTE = ['mesociclo', 'esercizi', 'pasti'];
const ERRORE_CORROTTI = 'Dati salvati corrotti, impossibile leggerli.';

export function getDefaultData(datiDefault) {
  return {
    mesociclo: { dataInizio: null, ultimaSessioneFase2: null },
    esercizi: structuredClone(datiDefault.esercizi),
    pasti: {}
  };
}

function resolveBackend(storageBackend) {
  if (storageBackend !== undefined) return storageBackend;
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isOggetto(valore) {
  return valore !== null && typeof valore === 'object' && !Array.isArray(valore);
}

// La configurazione (nome, range, tipo, tracciaProgressione) viene sempre da
// datiDefault: se cambia, le installazioni esistenti la ricevono. Dai dati
// salvati si conserva solo lo stato dell'utente (peso, fallimenti, storico).
function unisciEsercizi(datiDefault, salvati) {
  const risultato = isOggetto(salvati) ? { ...salvati } : {};
  for (const [id, predefinito] of Object.entries(datiDefault.esercizi)) {
    const salvato = risultato[id];
    const base = structuredClone(predefinito);
    if (!isOggetto(salvato)) {
      // Esercizio aggiunto dopo l'installazione: parte dai suoi default.
      risultato[id] = base;
      continue;
    }
    risultato[id] = {
      ...base,
      ultimoPeso: typeof salvato.ultimoPeso === 'number' ? salvato.ultimoPeso : base.ultimoPeso,
      fallimentiConsecutivi: typeof salvato.fallimentiConsecutivi === 'number' ? salvato.fallimentiConsecutivi : 0,
      storico: Array.isArray(salvato.storico) ? salvato.storico : []
    };
  }
  return risultato;
}

// Le installazioni precedenti al motore pasti adattivo salvavano
// pasti[data] = {tipoGiorno, fatti, extra, peso} (checklist a 4 pasti fissi).
// Si riconosce dal campo tipoGiorno (assente nel formato nuovo) e si converte
// al volo: si perde lo storico dei "pasti fatti" (erano solo spunte, nessun
// dato nutrizionale recuperabile), si preserva il peso già loggato.
function eFormatoVecchio(voce) {
  return isOggetto(voce) && 'tipoGiorno' in voce;
}

function normalizzaGiorno(voce) {
  if (eFormatoVecchio(voce)) {
    return {
      peso: typeof voce.peso === 'number' ? voce.peso : null,
      pastiLoggati: 0,
      alimenti: [],
      eventiAllenamento: []
    };
  }
  return {
    peso: typeof voce.peso === 'number' ? voce.peso : null,
    pastiLoggati: typeof voce.pastiLoggati === 'number' ? voce.pastiLoggati : 0,
    alimenti: Array.isArray(voce.alimenti) ? voce.alimenti : [],
    eventiAllenamento: Array.isArray(voce.eventiAllenamento) ? voce.eventiAllenamento : []
  };
}

function unisciPasti(salvati) {
  const risultato = {};
  for (const [data, voce] of Object.entries(salvati || {})) {
    if (isOggetto(voce)) risultato[data] = normalizzaGiorno(voce);
  }
  return risultato;
}

// Fonde i dati salvati sopra la struttura di default, così una modifica futura
// a dati-default.js non lascia campi undefined che farebbero crashare la UI.
function unisciConDefault(datiDefault, salvati) {
  if (!isOggetto(salvati)) throw new Error(ERRORE_CORROTTI);
  for (const chiave of CHIAVI_RICHIESTE) {
    if (!isOggetto(salvati[chiave])) throw new Error(ERRORE_CORROTTI);
  }
  const base = getDefaultData(datiDefault);
  return {
    ...salvati,
    mesociclo: { ...base.mesociclo, ...salvati.mesociclo },
    esercizi: unisciEsercizi(datiDefault, salvati.esercizi),
    pasti: unisciPasti(salvati.pasti)
  };
}

export function loadData(datiDefault, storageBackend) {
  const backend = resolveBackend(storageBackend);
  if (!backend) {
    throw new Error('Storage non disponibile su questo dispositivo/browser.');
  }
  const raw = backend.getItem(STORAGE_KEY);
  if (!raw) return getDefaultData(datiDefault);
  let salvati;
  try {
    salvati = JSON.parse(raw);
  } catch (e) {
    throw new Error(ERRORE_CORROTTI);
  }
  return unisciConDefault(datiDefault, salvati);
}

export function saveData(data, storageBackend) {
  const backend = resolveBackend(storageBackend);
  if (!backend) {
    throw new Error('Storage non disponibile su questo dispositivo/browser.');
  }
  backend.setItem(STORAGE_KEY, JSON.stringify(data));
}
