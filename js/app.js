import { loadData, saveData } from './storage.js';
import { datiDefault } from './dati-default.js';
import { renderOggi } from './oggi.js';
import { renderAllenamento } from './allenamento.js';
import { renderStorico } from './storico.js';

const state = { data: null };

function mostraErroreGlobale(messaggio) {
  let box = document.getElementById('errore-globale');
  if (!box) {
    box = document.createElement('div');
    box.id = 'errore-globale';
    box.className = 'errore';
    document.body.insertBefore(box, document.body.firstChild);
  }
  box.textContent = messaggio;
  box.hidden = false;
}

function nascondiErroreGlobale() {
  const box = document.getElementById('errore-globale');
  if (box) {
    box.textContent = '';
    box.hidden = true;
  }
}

function persist() {
  // localStorage pieno o non disponibile (es. modalità privata): il salvataggio
  // può lanciare dentro un click handler. Va mostrato, non ingoiato in silenzio.
  try {
    saveData(state.data);
    nascondiErroreGlobale();
  } catch (e) {
    mostraErroreGlobale(`Errore: impossibile salvare i dati (${e.message}). Le modifiche di questa sessione potrebbero andare perse.`);
  }
}

// Una funzione di render per ogni tab: ogni render ripulisce il proprio
// container, quindi richiamarla è idempotente e sicuro.
const renderPerTab = {
  oggi: () => renderOggi(document.getElementById('tab-oggi'), state.data, persist),
  allenamento: () => renderAllenamento(document.getElementById('tab-allenamento'), state.data, persist),
  storico: () => renderStorico(document.getElementById('tab-storico'), state.data)
};

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      // Ridisegna il tab appena attivato, così mostra sempre dati aggiornati
      // (es. un allenamento appena salvato deve comparire subito nello Storico).
      const render = renderPerTab[btn.dataset.tab];
      if (render) render();
    });
  });
}

function renderAll() {
  Object.values(renderPerTab).forEach((render) => render());
}

function init() {
  try {
    state.data = loadData(datiDefault);
  } catch (e) {
    document.body.innerHTML = `<p class="errore">Errore: ${e.message}</p>`;
    return;
  }
  if (!state.data.mesociclo.dataInizio) {
    state.data.mesociclo.dataInizio = new Date().toISOString().slice(0, 10);
    persist();
  }
  setupTabs();
  renderAll();
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
