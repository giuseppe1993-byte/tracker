const STORAGE_KEY = 'fitnessTrackerData';

export function getDefaultData(datiDefault) {
  return {
    mesociclo: { dataInizio: null },
    esercizi: structuredClone(datiDefault.esercizi),
    pasti: {}
  };
}

function resolveBackend(storageBackend) {
  if (storageBackend !== undefined) return storageBackend;
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function loadData(datiDefault, storageBackend) {
  const backend = resolveBackend(storageBackend);
  if (!backend) {
    throw new Error('Storage non disponibile su questo dispositivo/browser.');
  }
  const raw = backend.getItem(STORAGE_KEY);
  if (!raw) return getDefaultData(datiDefault);
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error('Dati salvati corrotti, impossibile leggerli.');
  }
}

export function saveData(data, storageBackend) {
  const backend = resolveBackend(storageBackend);
  if (!backend) {
    throw new Error('Storage non disponibile su questo dispositivo/browser.');
  }
  backend.setItem(STORAGE_KEY, JSON.stringify(data));
}
