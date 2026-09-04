import { databaseAlimenti, rapportiCotturaCrudo, combosPasto, targetGiornaliero } from './database-alimenti.js';
import { calcolaConsumato, calcolaRimasto, suggerisciPasto } from './budget.js';
import { oraAttuale, getGiornoOggi, orarioPiuOre } from './giorno-oggi.js';
import { prossimaAzione } from './prossima-azione.js';
import { iconForchetta, iconSpunta } from './icons.js';

const PASTI_AL_GIORNO = 4;
const ORE_TRA_PASTI = 4;

function formatoNumero(n) {
  return Math.round(n * 10) / 10;
}

export function renderOggi(container, data, persist) {
  const giorno = getGiornoOggi(data);

  let indiceComboNormale = 0;
  let indiceComboPostWorkout = 0;
  const cottiVisualizzati = new Set(); // indici di `alimenti` mostrati come "cotto" (solo UI, non persistito)

  container.innerHTML = `
    <div id="barra-fissa" class="barra-fissa">
      <div id="riepilogo-kcal"></div>
      <div id="pasti-oggi" class="pasti-oggi"></div>
      <p id="prossimo-pasto-nota" class="nota"></p>
    </div>

    <div id="card-adesso" class="card card-adesso"></div>

    <section class="card">
      <h2>Dettaglio macro</h2>
      <div id="riepilogo-macro"></div>
    </section>

    <details class="sezione" id="dettaglio-mangiato" ${giorno.alimenti.length > 0 ? 'open' : ''}>
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

    <details class="sezione" id="dettaglio-extra" ${giorno.extra.length > 0 ? 'open' : ''}>
      <summary>Note fuori piano</summary>
      <div class="contenuto">
        <input id="extra-testo" placeholder="Aggiungi cibo/nota fuori piano">
        <button id="btn-extra" type="button">+ Aggiungi</button>
        <ul id="lista-extra"></ul>
      </div>
    </details>
  `;

  const selectAlimento = container.querySelector('#log-alimento');
  selectAlimento.innerHTML = Object.entries(databaseAlimenti)
    .map(([id, a]) => `<option value="${id}">${a.nome}</option>`)
    .join('');

  function statoAttuale() {
    const consumato = calcolaConsumato(giorno.alimenti, databaseAlimenti);
    const rimasto = calcolaRimasto(targetGiornaliero, consumato);
    return { consumato, rimasto };
  }

  // Prima colazione: solo se non è già stato loggato nulla oggi ed è ancora
  // mattina presto — dal secondo pasto in poi (o dopo le 10) si torna alla
  // rotazione normale, così la stessa logica non ripropone uova+avena a pranzo.
  const ORA_LIMITE_COLAZIONE = 10;
  function isColazioneOra() {
    const ora = Number(oraAttuale().split(':')[0]);
    return giorno.pastiLoggati === 0 && ora < ORA_LIMITE_COLAZIONE;
  }

  function renderSuggerimentoIn(card, tipo) {
    const { rimasto } = statoAttuale();
    let combo;
    if (tipo === 'colazione') {
      combo = combosPasto.colazioneDefault;
    } else {
      const lista = tipo === 'post-workout' ? combosPasto.postWorkout : combosPasto.normale;
      const indice = tipo === 'post-workout' ? indiceComboPostWorkout % lista.length : indiceComboNormale % lista.length;
      combo = lista[indice];
    }

    const suggerimento = suggerisciPasto({
      rimasto,
      pastiLoggatiOggi: giorno.pastiLoggati,
      isPostWorkout: tipo === 'post-workout',
      combo,
      databaseAlimenti
    });

    // La proposta viene sempre salvata a crudo (come il resto dell'app): il
    // tasto "mostra cotto" cambia solo la visualizzazione, non i grammi loggati.
    let mostraCotto = false;
    const puoConvertire = Boolean(
      rapportiCotturaCrudo[suggerimento.proteina.alimentoId] ||
      (suggerimento.carbo && rapportiCotturaCrudo[suggerimento.carbo.alimentoId])
    );

    function descrizioneParte(alimentoId, grammiCrudi) {
      const rapporto = rapportiCotturaCrudo[alimentoId];
      const converti = mostraCotto && rapporto;
      const grammi = converti ? Math.round(grammiCrudi * rapporto) : grammiCrudi;
      return `${grammi}g ${databaseAlimenti[alimentoId].nome} (${converti ? 'cotto' : 'crudo'})`;
    }

    const etichette = { 'post-workout': 'Post-workout', colazione: 'Colazione', normale: 'Adesso' };

    function disegna() {
      const parti = [descrizioneParte(suggerimento.proteina.alimentoId, suggerimento.proteina.grammiCrudi)];
      if (suggerimento.carbo) parti.push(descrizioneParte(suggerimento.carbo.alimentoId, suggerimento.carbo.grammiCrudi));

      card.innerHTML = `
        <p class="etichetta">${etichette[tipo]}</p>
        <p>${parti.join(' + ')}</p>
        ${suggerimento.nota ? `<p class="nota">${suggerimento.nota}</p>` : ''}
        <button id="btn-aggiungi-suggerimento" type="button" class="primario">Aggiungi al log</button>
        ${puoConvertire ? `<button id="btn-cotto-suggerimento" type="button">${mostraCotto ? 'Mostra crudo' : 'Mostra cotto'}</button>` : ''}
        ${tipo !== 'colazione' ? '<button id="btn-cambia-proposta" type="button">Cambia proposta</button>' : ''}
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

      const btnCotto = card.querySelector('#btn-cotto-suggerimento');
      if (btnCotto) {
        btnCotto.addEventListener('click', () => {
          mostraCotto = !mostraCotto;
          disegna();
        });
      }

      const btnCambia = card.querySelector('#btn-cambia-proposta');
      if (btnCambia) {
        btnCambia.addEventListener('click', () => {
          if (tipo === 'post-workout') indiceComboPostWorkout += 1;
          else indiceComboNormale += 1;
          renderSuggerimentoIn(card, tipo);
        });
      }
    }

    disegna();
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

    if (azione.tipo === 'post-workout') {
      renderSuggerimentoIn(card, 'post-workout');
    } else if (isColazioneOra()) {
      renderSuggerimentoIn(card, 'colazione');
    } else {
      renderSuggerimentoIn(card, 'normale');
    }
  }

  function renderRiepilogoKcal() {
    const { consumato } = statoAttuale();
    const percentualeKcal = Math.min(100, Math.max(0, (consumato.kcal / targetGiornaliero.kcal) * 100));
    const oltre = consumato.kcal > targetGiornaliero.kcal;
    container.querySelector('#riepilogo-kcal').innerHTML = `
      <div class="progress-numero">
        <span>${formatoNumero(consumato.kcal)} / ${targetGiornaliero.kcal} kcal</span>
        <span class="badge ${oltre ? 'oltre' : 'ok'}">${oltre ? 'Oltre budget' : 'In linea'}</span>
      </div>
      <div class="progress-bar${oltre ? ' oltre-budget' : ''}"><span style="width:${percentualeKcal}%"></span></div>
    `;
  }

  // I 4 pasti si "agganciano" all'orario del primo pasto loggato oggi, +4h
  // ciascuno — se non hai ancora mangiato nulla restano senza orario. Non
  // sono legati a un tipo di pasto specifico: si riempiono in ordine man
  // mano che logghi qualcosa (dalla proposta o manualmente).
  function renderPastiOggi() {
    const primoOra = giorno.alimenti.length > 0 ? giorno.alimenti[0].ora : null;
    container.querySelector('#pasti-oggi').innerHTML = Array.from({ length: PASTI_AL_GIORNO }, (_, i) => {
      const fatto = giorno.pastiLoggati > i;
      const orario = primoOra ? orarioPiuOre(primoOra, i * ORE_TRA_PASTI) : null;
      return `
        <div class="pasto-slot${fatto ? ' fatto' : ''}">
          ${fatto ? iconSpunta() : ''}
          <span>${orario ?? `Pasto ${i + 1}`}</span>
        </div>
      `;
    }).join('');

    const nota = container.querySelector('#prossimo-pasto-nota');
    const prossimoIndice = giorno.pastiLoggati;
    nota.textContent = primoOra && prossimoIndice < PASTI_AL_GIORNO
      ? `Prossimo pasto: alle ${orarioPiuOre(primoOra, prossimoIndice * ORE_TRA_PASTI)}`
      : '';
  }

  function renderBudget() {
    const { consumato, rimasto } = statoAttuale();
    container.querySelector('#riepilogo-macro').innerHTML = `
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
    renderRiepilogoKcal();
    renderPastiOggi();
    renderBudget();
    renderListaAlimenti();
  }

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
