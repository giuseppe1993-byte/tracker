import { databaseAlimenti, rapportiCotturaCrudo, combosPasto, targetGiornaliero } from './database-alimenti.js';
import { calcolaConsumato, calcolaRimasto, suggerisciPasto } from './budget.js';
import { oraAttuale, getGiornoOggi, isPostWorkoutOra } from './giorno-oggi.js';

function formatoNumero(n) {
  return Math.round(n * 10) / 10;
}

export function renderOggi(container, data, persist) {
  const giorno = getGiornoOggi(data);

  let indiceComboNormale = 0;
  let indiceComboPostWorkout = 0;
  const cottiVisualizzati = new Set(); // indici di `alimenti` mostrati come "cotto" (solo UI, non persistito)

  container.innerHTML = `
    <div>
      <label>Peso di oggi (kg): <input id="peso-oggi" type="number" step="0.1" inputmode="decimal"></label>
      <button id="btn-peso" type="button">Salva peso</button>
      <span id="esito-peso"></span>
    </div>

    <h2>Cosa mangiare adesso</h2>
    <div id="suggerimento"></div>

    <h2>Budget di oggi</h2>
    <div id="riepilogo-budget"></div>

    <div>
      <button id="btn-inizio-allenamento" type="button">Mi sto allenando ora</button>
      <button id="btn-fine-allenamento" type="button">Ho finito di allenarmi</button>
    </div>

    <h2>Aggiungi manualmente</h2>
    <div>
      <select id="log-alimento"></select>
      <input id="log-grammi" type="number" placeholder="grammi" min="0">
      <select id="log-modalita">
        <option value="crudo">Crudo</option>
        <option value="cotto">Cotto</option>
      </select>
      <button id="btn-log-manuale" type="button">Aggiungi</button>
    </div>

    <h2>Mangiato oggi</h2>
    <ul id="lista-alimenti"></ul>

    <h2>Nota fuori piano</h2>
    <div>
      <input id="extra-testo" placeholder="Aggiungi cibo/nota fuori piano">
      <button id="btn-extra" type="button">+ Aggiungi</button>
    </div>
    <ul id="lista-extra"></ul>
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

  function renderSuggerimento() {
    const { rimasto } = statoAttuale();
    const postWorkout = isPostWorkoutOra(giorno);
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

    const div = container.querySelector('#suggerimento');
    div.innerHTML = `
      <p>${postWorkout ? '<strong>Post-workout</strong> — ' : ''}${parti.join(' + ')}</p>
      ${suggerimento.nota ? `<p><em>${suggerimento.nota}</em></p>` : ''}
      <button id="btn-aggiungi-suggerimento" type="button">Aggiungi al log</button>
      <button id="btn-cambia-proposta" type="button">Cambia proposta</button>
    `;

    div.querySelector('#btn-aggiungi-suggerimento').addEventListener('click', () => {
      const ora = oraAttuale();
      giorno.alimenti.push({ ora, alimentoId: suggerimento.proteina.alimentoId, grammiCrudi: suggerimento.proteina.grammiCrudi, modalitaInserita: 'crudo' });
      if (suggerimento.carbo) {
        giorno.alimenti.push({ ora, alimentoId: suggerimento.carbo.alimentoId, grammiCrudi: suggerimento.carbo.grammiCrudi, modalitaInserita: 'crudo' });
      }
      giorno.pastiLoggati += 1;
      persist();
      renderTutto();
    });

    div.querySelector('#btn-cambia-proposta').addEventListener('click', () => {
      if (postWorkout) indiceComboPostWorkout += 1;
      else indiceComboNormale += 1;
      renderSuggerimento();
    });
  }

  function renderBudget() {
    const { consumato, rimasto } = statoAttuale();
    container.querySelector('#riepilogo-budget').innerHTML = `
      <p>Consumato oggi: ${formatoNumero(consumato.kcal)} kcal | ${formatoNumero(consumato.p)}g P | ${formatoNumero(consumato.f)}g F | ${formatoNumero(consumato.c)}g C</p>
      <p>Ti restano: ${formatoNumero(rimasto.kcal)} kcal | ${formatoNumero(rimasto.p)}g P | ${formatoNumero(rimasto.f)}g F | ${formatoNumero(rimasto.c)}g C</p>
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

      if (rapporto) {
        const btnToggle = document.createElement('button');
        btnToggle.type = 'button';
        btnToggle.textContent = mostraCotto ? 'mostra crudo' : 'mostra cotto';
        btnToggle.addEventListener('click', () => {
          if (cottiVisualizzati.has(i)) cottiVisualizzati.delete(i);
          else cottiVisualizzati.add(i);
          renderListaAlimenti();
        });
        li.appendChild(btnToggle);
      }

      const btnRimuovi = document.createElement('button');
      btnRimuovi.type = 'button';
      btnRimuovi.textContent = 'rimuovi';
      btnRimuovi.addEventListener('click', () => {
        giorno.alimenti.splice(i, 1);
        persist();
        renderTutto();
      });
      li.appendChild(btnRimuovi);

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
    renderSuggerimento();
    renderBudget();
    renderListaAlimenti();
  }

  function salvaPeso() {
    const input = container.querySelector('#peso-oggi');
    giorno.peso = input.value ? Number(input.value) : null;
    persist();
    container.querySelector('#esito-peso').textContent = giorno.peso != null ? `Salvato: ${giorno.peso}kg` : '';
  }
  container.querySelector('#peso-oggi').addEventListener('change', salvaPeso);
  container.querySelector('#btn-peso').addEventListener('click', salvaPeso);

  container.querySelector('#btn-inizio-allenamento').addEventListener('click', () => {
    giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'inizio-allenamento' });
    persist();
  });

  container.querySelector('#btn-fine-allenamento').addEventListener('click', () => {
    giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'post-workout-iniziato' });
    persist();
    renderTutto();
  });

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
