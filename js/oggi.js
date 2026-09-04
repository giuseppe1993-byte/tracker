import { databaseAlimenti, rapportiCotturaCrudo, combosPasto, targetGiornaliero } from './database-alimenti.js';
import { calcolaConsumato, calcolaRimasto, suggerisciPasto } from './budget.js';
import { oraAttuale, getGiornoOggi } from './giorno-oggi.js';
import { prossimaAzione } from './prossima-azione.js';
import { iconBilancia, iconForchetta } from './icons.js';

function formatoNumero(n) {
  return Math.round(n * 10) / 10;
}

export function renderOggi(container, data, persist) {
  const giorno = getGiornoOggi(data);

  let indiceComboNormale = 0;
  let indiceComboPostWorkout = 0;
  const cottiVisualizzati = new Set(); // indici di `alimenti` mostrati come "cotto" (solo UI, non persistito)

  container.innerHTML = `
    <div id="card-adesso" class="card card-adesso"></div>

    <section class="card">
      <label for="peso-oggi">${iconBilancia()} Peso di oggi (kg)</label>
      <div class="peso-input-riga">
        <input id="peso-oggi" type="number" step="0.1" inputmode="decimal">
        <button id="btn-peso" type="button">Salva</button>
      </div>
      <span id="esito-peso" class="nota"></span>
      <h2>Budget di oggi</h2>
      <div id="riepilogo-budget"></div>
    </section>

    <details class="sezione" id="dettaglio-mangiato">
      <summary>${iconForchetta()} Mangiato oggi</summary>
      <div class="contenuto">
        <ul id="lista-alimenti"></ul>
      </div>
    </details>

    <details class="sezione" id="dettaglio-manuale">
      <summary>Aggiungi manualmente</summary>
      <div class="contenuto">
        <label for="log-alimento">Alimento</label>
        <select id="log-alimento"></select>
        <label for="log-grammi">Grammi</label>
        <input id="log-grammi" type="number" placeholder="grammi" min="0" inputmode="numeric">
        <label for="log-modalita">Modalità</label>
        <select id="log-modalita">
          <option value="crudo">Crudo</option>
          <option value="cotto">Cotto</option>
        </select>
        <button id="btn-log-manuale" type="button">Aggiungi</button>
      </div>
    </details>

    <details class="sezione" id="dettaglio-extra">
      <summary>Note fuori piano</summary>
      <div class="contenuto">
        <input id="extra-testo" placeholder="Aggiungi cibo/nota fuori piano">
        <button id="btn-extra" type="button">+ Aggiungi</button>
        <ul id="lista-extra"></ul>
      </div>
    </details>
  `;

  container.querySelector('#peso-oggi').value = giorno.peso ?? '';

  const selectAlimento = container.querySelector('#log-alimento');
  selectAlimento.innerHTML = Object.entries(databaseAlimenti)
    .map(([id, a]) => `<option value="${id}">${a.nome}</option>`)
    .join('');

  function statoAttuale() {
    const consumato = calcolaConsumato(giorno.alimenti, databaseAlimenti);
    const rimasto = calcolaRimasto(targetGiornaliero, consumato);
    return { consumato, rimasto };
  }

  function renderSuggerimentoIn(card, postWorkout) {
    const { rimasto } = statoAttuale();
    const lista = postWorkout ? combosPasto.postWorkout : combosPasto.normale;
    const indice = postWorkout ? indiceComboPostWorkout % lista.length : indiceComboNormale % lista.length;
    const combo = lista[indice];

    const suggerimento = suggerisciPasto({
      rimasto,
      pastiLoggatiOggi: giorno.pastiLoggati,
      isPostWorkout: postWorkout,
      combo,
      databaseAlimenti
    });

    const parti = [`${suggerimento.proteina.grammiCrudi}g ${databaseAlimenti[suggerimento.proteina.alimentoId].nome} (crudo)`];
    if (suggerimento.carbo) {
      parti.push(`${suggerimento.carbo.grammiCrudi}g ${databaseAlimenti[suggerimento.carbo.alimentoId].nome} (crudo)`);
    }

    card.innerHTML = `
      <p class="etichetta">${postWorkout ? 'Post-workout' : 'Adesso'}</p>
      <p>${parti.join(' + ')}</p>
      ${suggerimento.nota ? `<p class="nota">${suggerimento.nota}</p>` : ''}
      <button id="btn-aggiungi-suggerimento" type="button" class="primario">Aggiungi al log</button>
      <button id="btn-cambia-proposta" type="button">Cambia proposta</button>
    `;

    card.querySelector('#btn-aggiungi-suggerimento').addEventListener('click', () => {
      const ora = oraAttuale();
      giorno.alimenti.push({ ora, alimentoId: suggerimento.proteina.alimentoId, grammiCrudi: suggerimento.proteina.grammiCrudi, modalitaInserita: 'crudo' });
      if (suggerimento.carbo) {
        giorno.alimenti.push({ ora, alimentoId: suggerimento.carbo.alimentoId, grammiCrudi: suggerimento.carbo.grammiCrudi, modalitaInserita: 'crudo' });
      }
      giorno.pastiLoggati += 1;
      persist();
      renderTutto();
    });

    card.querySelector('#btn-cambia-proposta').addEventListener('click', () => {
      if (postWorkout) indiceComboPostWorkout += 1;
      else indiceComboNormale += 1;
      renderSuggerimentoIn(card, postWorkout);
    });
  }

  function renderCardAdesso() {
    const card = container.querySelector('#card-adesso');
    const azione = prossimaAzione(giorno);

    if (azione.tipo === 'pesati') {
      card.innerHTML = `
        <p class="etichetta">Adesso</p>
        <p>Pesati stamattina</p>
        <div class="peso-input-riga">
          <input id="peso-adesso-input" type="number" step="0.1" inputmode="decimal" aria-label="Peso di oggi in kg" placeholder="kg">
          <button id="btn-peso-adesso" type="button" class="primario">Ho fatto</button>
        </div>
      `;
      card.querySelector('#btn-peso-adesso').addEventListener('click', () => {
        const valore = Number(card.querySelector('#peso-adesso-input').value);
        if (!valore) return;
        giorno.peso = valore;
        persist();
        renderTutto();
      });
      return;
    }

    if (azione.tipo === 'allenamento-in-corso') {
      card.innerHTML = `
        <p class="etichetta">Adesso</p>
        <p>Sei in allenamento</p>
        <button id="btn-fine-allenamento-adesso" type="button" class="primario">Ho finito di allenarmi</button>
      `;
      card.querySelector('#btn-fine-allenamento-adesso').addEventListener('click', () => {
        giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'post-workout-iniziato' });
        persist();
        renderTutto();
      });
      return;
    }

    renderSuggerimentoIn(card, azione.tipo === 'post-workout');
  }

  function renderBudget() {
    const { consumato, rimasto } = statoAttuale();
    const percentualeKcal = Math.min(100, Math.max(0, (consumato.kcal / targetGiornaliero.kcal) * 100));
    const oltre = consumato.kcal > targetGiornaliero.kcal;
    container.querySelector('#riepilogo-budget').innerHTML = `
      <div class="progress-numero">
        <span>${formatoNumero(consumato.kcal)} / ${targetGiornaliero.kcal} kcal</span>
        <span class="badge ${oltre ? 'oltre' : 'ok'}">${oltre ? 'Oltre budget' : 'In linea'}</span>
      </div>
      <div class="progress-bar${oltre ? ' oltre-budget' : ''}"><span style="width:${percentualeKcal}%"></span></div>
      <p>P ${formatoNumero(consumato.p)}g · F ${formatoNumero(consumato.f)}g · C ${formatoNumero(consumato.c)}g</p>
      <p class="nota">Restano: ${formatoNumero(rimasto.kcal)} kcal · ${formatoNumero(rimasto.p)}g P · ${formatoNumero(rimasto.f)}g F · ${formatoNumero(rimasto.c)}g C</p>
    `;
  }

  function renderListaAlimenti() {
    const lista = container.querySelector('#lista-alimenti');
    lista.innerHTML = '';
    giorno.alimenti.forEach((voce, i) => {
      const alimento = databaseAlimenti[voce.alimentoId];
      const rapporto = rapportiCotturaCrudo[voce.alimentoId];
      const mostraCotto = cottiVisualizzati.has(i) && rapporto;
      const pesoMostrato = mostraCotto ? Math.round(voce.grammiCrudi * rapporto) : voce.grammiCrudi;

      const li = document.createElement('li');
      const testo = document.createTextNode(`${voce.ora} — ${pesoMostrato}g ${alimento.nome} (${mostraCotto ? 'cotto' : 'crudo'}) `);
      li.appendChild(testo);

      const azioni = document.createElement('div');
      if (rapporto) {
        const btnToggle = document.createElement('button');
        btnToggle.type = 'button';
        btnToggle.textContent = mostraCotto ? 'mostra crudo' : 'mostra cotto';
        btnToggle.addEventListener('click', () => {
          if (cottiVisualizzati.has(i)) cottiVisualizzati.delete(i);
          else cottiVisualizzati.add(i);
          renderListaAlimenti();
        });
        azioni.appendChild(btnToggle);
      }

      const btnRimuovi = document.createElement('button');
      btnRimuovi.type = 'button';
      btnRimuovi.className = 'distruttivo';
      btnRimuovi.textContent = 'rimuovi';
      btnRimuovi.addEventListener('click', () => {
        giorno.alimenti.splice(i, 1);
        persist();
        renderTutto();
      });
      azioni.appendChild(btnRimuovi);

      li.appendChild(azioni);
      lista.appendChild(li);
    });
  }

  function renderExtra() {
    const lista = container.querySelector('#lista-extra');
    lista.innerHTML = '';
    giorno.extra.forEach((e, i) => {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode(e.testo + ' '));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'distruttivo';
      btn.textContent = 'rimuovi';
      btn.addEventListener('click', () => {
        giorno.extra.splice(i, 1);
        persist();
        renderExtra();
      });
      li.appendChild(btn);
      lista.appendChild(li);
    });
  }

  function renderTutto() {
    renderCardAdesso();
    renderBudget();
    renderListaAlimenti();
  }

  function salvaPeso() {
    const input = container.querySelector('#peso-oggi');
    giorno.peso = input.value ? Number(input.value) : null;
    persist();
    container.querySelector('#esito-peso').textContent = giorno.peso != null ? `Salvato: ${giorno.peso}kg` : '';
    renderCardAdesso();
  }
  container.querySelector('#peso-oggi').addEventListener('change', salvaPeso);
  container.querySelector('#btn-peso').addEventListener('click', salvaPeso);

  container.querySelector('#btn-log-manuale').addEventListener('click', () => {
    const alimentoId = selectAlimento.value;
    const grammiInseriti = Number(container.querySelector('#log-grammi').value) || 0;
    if (grammiInseriti <= 0) return;
    const modalita = container.querySelector('#log-modalita').value;
    const rapporto = rapportiCotturaCrudo[alimentoId];
    const grammiCrudi = modalita === 'cotto' && rapporto ? Math.round(grammiInseriti / rapporto) : grammiInseriti;

    giorno.alimenti.push({ ora: oraAttuale(), alimentoId, grammiCrudi, modalitaInserita: modalita });
    giorno.pastiLoggati += 1;
    container.querySelector('#log-grammi').value = '';
    persist();
    renderTutto();
  });

  container.querySelector('#btn-extra').addEventListener('click', () => {
    const input = container.querySelector('#extra-testo');
    if (!input.value.trim()) return;
    giorno.extra.push({ testo: input.value.trim() });
    input.value = '';
    persist();
    renderExtra();
  });

  renderTutto();
  renderExtra();
}
