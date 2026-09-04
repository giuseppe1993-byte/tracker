import { calcolaBMI, calcolaBF, calcolaBMR, calcolaTDEE } from './metabolismo.js';
import { iconBilancia } from './icons.js';

const ETICHETTE_ATTIVITA = {
  sedentario: 'Sedentario (poco o nessun esercizio)',
  leggero: 'Leggero (1-3 giorni/settimana)',
  moderato: 'Moderato (3-5 giorni/settimana)',
  intenso: 'Intenso (6-7 giorni/settimana)',
  moltoIntenso: 'Molto intenso (fisico + sport)'
};

function formatoNumero(n) {
  return Math.round(n * 10) / 10;
}

// Il peso non si inserisce qui: si riusa l'ultima pesata già loggata su
// Alimentazione, così questa schermata non duplica quel dato.
function ultimoPesoRegistrato(data) {
  const giorni = Object.entries(data.pasti)
    .filter(([, giorno]) => giorno.peso != null)
    .sort(([a], [b]) => (a < b ? 1 : -1));
  return giorni.length > 0 ? giorni[0][1].peso : null;
}

export function renderCorpo(container, data, persist) {
  const profilo = data.profilo;
  const peso = ultimoPesoRegistrato(data);

  container.innerHTML = `
    <section class="card">
      <h2>${iconBilancia()} Il tuo peso</h2>
      <p>${peso != null ? `${peso}kg (ultima pesata registrata)` : 'Nessun peso registrato ancora — vai su Alimentazione per pesarti.'}</p>
    </section>

    <section class="card">
      <h2>Profilo</h2>
      <label for="corpo-sesso">Sesso</label>
      <select id="corpo-sesso">
        <option value="">Seleziona...</option>
        <option value="M">Uomo</option>
        <option value="F">Donna</option>
      </select>
      <label for="corpo-eta">Età</label>
      <input id="corpo-eta" type="number" min="10" max="100" inputmode="numeric">
      <label for="corpo-altezza">Altezza (cm)</label>
      <input id="corpo-altezza" type="number" min="100" max="250" inputmode="numeric">
      <label for="corpo-attivita">Livello di attività</label>
      <select id="corpo-attivita">
        ${Object.entries(ETICHETTE_ATTIVITA).map(([id, testo]) => `<option value="${id}">${testo}</option>`).join('')}
      </select>
      <button id="btn-salva-profilo" type="button" class="primario">Salva</button>
      <span id="esito-profilo" class="nota"></span>
    </section>

    <section class="card" id="risultati-corpo"></section>
  `;

  container.querySelector('#corpo-sesso').value = profilo.sesso ?? '';
  container.querySelector('#corpo-eta').value = profilo.eta ?? '';
  container.querySelector('#corpo-altezza').value = profilo.altezzaCm ?? '';
  container.querySelector('#corpo-attivita').value = profilo.livelloAttivita ?? 'sedentario';

  function renderRisultati() {
    const box = container.querySelector('#risultati-corpo');
    if (peso == null || !profilo.sesso || !profilo.eta || !profilo.altezzaCm) {
      box.innerHTML = `
        <h2>Stime</h2>
        <p class="nota">Completa peso (su Alimentazione), sesso, età e altezza per vedere BMI, massa grassa stimata e fabbisogno calorico.</p>
      `;
      return;
    }

    const bmi = calcolaBMI(peso, profilo.altezzaCm);
    const bf = calcolaBF({ bmi, eta: profilo.eta, sesso: profilo.sesso });
    const bmr = calcolaBMR({ pesoKg: peso, altezzaCm: profilo.altezzaCm, eta: profilo.eta, sesso: profilo.sesso });
    const tdee = calcolaTDEE(bmr, profilo.livelloAttivita);

    box.innerHTML = `
      <h2>Stime</h2>
      <p>BMI: ${formatoNumero(bmi)}</p>
      <p>Massa grassa stimata: ${formatoNumero(bf)}%</p>
      <p>Metabolismo basale: ${formatoNumero(bmr)} kcal</p>
      <p>Fabbisogno calorico (TDEE): ${formatoNumero(tdee)} kcal</p>
      <p class="nota">Stime approssimative (formule di Deurenberg e Mifflin-St Jeor), non sostituiscono una misurazione reale.</p>
    `;
  }

  renderRisultati();

  container.querySelector('#btn-salva-profilo').addEventListener('click', () => {
    profilo.sesso = container.querySelector('#corpo-sesso').value || null;
    profilo.eta = Number(container.querySelector('#corpo-eta').value) || null;
    profilo.altezzaCm = Number(container.querySelector('#corpo-altezza').value) || null;
    profilo.livelloAttivita = container.querySelector('#corpo-attivita').value;
    persist();
    container.querySelector('#esito-profilo').textContent = 'Salvato.';
    renderRisultati();
  });
}
