import { loadData, saveData } from './storage.js';
import { datiDefault } from './dati-default.js';

const state = { data: null };

function persist() {
  saveData(state.data);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

async function renderAll() {
  const { renderOggi } = await import('./oggi.js');
  const { renderAllenamento } = await import('./allenamento.js');
  const { renderStorico } = await import('./storico.js');
  renderOggi(document.getElementById('tab-oggi'), state.data, persist);
  renderAllenamento(document.getElementById('tab-allenamento'), state.data, persist);
  renderStorico(document.getElementById('tab-storico'), state.data);
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
    saveData(state.data);
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
