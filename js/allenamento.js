import { datiDefault } from './dati-default.js';
import { calcolaSettimana, calcolaFase, applicaDeload } from './mesociclo.js';
import { calcolaProgressione } from './progressione.js';
import { oraAttuale, getGiornoOggi, oggiISO } from './giorno-oggi.js';
import { iconManubrio, iconSpunta } from './icons.js';

function sessioniDisponibili(fase) {
  if (fase === 'fase1') return datiDefault.sessioniPerFase.fase1;
  if (fase === 'fase2') return datiDefault.sessioniPerFase.fase2;
  if (fase === 'deload') return datiDefault.sessioniPerFase.fase2;
  return [];
}

function tracciaProgressione(esercizioConfig) {
  return esercizioConfig.tracciaProgressione !== false;
}

function salvatoOggi(esercizioStato) {
  return esercizioStato.storico.some((s) => s.data === oggiISO());
}

function renderEsercizio(esercizioConfig, esercizioStato, serieProgrammate, isDeload, giaFatto, onSalva) {
  const conPeso = tracciaProgressione(esercizioConfig);
  const unita = conPeso ? 'reps' : 'sec/reps';
  const dettaglio = document.createElement('details');
  dettaglio.className = 'sezione esercizio';

  const righeSerie = Array.from({ length: serieProgrammate }, (_, i) => `
    <div class="serie-riga">
      ${conPeso ? `<label>Peso S${i + 1} (kg)<input type="number" class="peso-input" data-serie="${i}" min="0" step="0.5" value="${esercizioStato.ultimoPeso}" inputmode="decimal"></label>` : ''}
      <label>${conPeso ? `Reps S${i + 1}` : `Serie ${i + 1}`} (target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax})<input type="number" class="rep-input" data-serie="${i}" min="0" inputmode="numeric"></label>
    </div>
  `).join('');

  const riepilogo = conPeso
    ? `ultimo peso: ${esercizioStato.ultimoPeso}kg${isDeload ? ' (scarico: carico invariato)' : ''}, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`
    : `a corpo libero, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`;

  dettaglio.innerHTML = `
    <summary>
      <span class="esercizio-titolo">
        ${esercizioConfig.nome}
        ${conPeso ? `<span class="nota">${esercizioStato.ultimoPeso}kg</span>` : ''}
        ${giaFatto ? `<span class="badge ok">${iconSpunta()} fatto</span>` : ''}
      </span>
    </summary>
    <div class="contenuto">
      <p class="nota">${riepilogo}</p>
      ${righeSerie}
      <label>RPE (1-10)<input type="number" class="rpe-input" min="1" max="10" inputmode="numeric"></label>
      <label>Nota (facoltativa)<input type="text" class="nota-input"></label>
      <button type="button" class="btn-salva primario">Salva sessione</button>
      <div class="esito nota"></div>
    </div>
  `;

  // Il peso della prima serie si copia sulle altre finché non vengono modificate
  // a mano (drop set): si parte tutte uguali, si corregge solo quello che cambia.
  if (conPeso) {
    const inputsPesoEl = Array.from(dettaglio.querySelectorAll('.peso-input'));
    inputsPesoEl.slice(1).forEach((input) => {
      input.addEventListener('input', () => {
        input.dataset.modificato = 'true';
      });
    });
    if (inputsPesoEl.length > 1) {
      inputsPesoEl[0].addEventListener('input', () => {
        const valore = inputsPesoEl[0].value;
        inputsPesoEl.slice(1).forEach((input) => {
          if (!input.dataset.modificato) input.value = valore;
        });
      });
    }
  }

  const btnSalva = dettaglio.querySelector('.btn-salva');
  // Protezione dal doppio tap su mobile: due click ravvicinati inserirebbero
  // due voci nello storico e applicherebbero la progressione due volte.
  let giaSalvato = false;

  btnSalva.addEventListener('click', () => {
    if (giaSalvato) return;
    const reps = Array.from(dettaglio.querySelectorAll('.rep-input')).map((inp) => Number(inp.value) || 0);
    if (reps.some((r) => r === 0)) {
      dettaglio.querySelector('.esito').textContent = 'Inserisci le reps per tutte le serie prima di salvare.';
      return;
    }
    const pesi = conPeso ? Array.from(dettaglio.querySelectorAll('.peso-input')).map((inp) => Number(inp.value) || 0) : [];
    if (conPeso && pesi.some((p) => p === 0)) {
      dettaglio.querySelector('.esito').textContent = 'Inserisci il peso per tutte le serie prima di salvare.';
      return;
    }
    const rpe = Number(dettaglio.querySelector('.rpe-input').value) || null;
    const nota = dettaglio.querySelector('.nota-input').value.trim();

    let messaggio;
    if (!conPeso) {
      // Esercizio senza carico: si registra solo la prestazione, nessun peso da aggiornare.
      esercizioStato.storico.push({ data: oggiISO(), peso: null, reps, rpe, nota });
      messaggio = 'Sessione salvata (esercizio a corpo libero, nessun carico da aggiornare).';
    } else {
      // Il peso della prima serie diventa la nuova base (es. si riparte più
      // leggeri dopo una pausa) — la progressione parte sempre da lì, non dal
      // vecchio valore memorizzato se l'utente lo ha corretto.
      esercizioStato.ultimoPeso = pesi[0];

      if (isDeload) {
        // Settimana di scarico: la sessione si registra, ma il carico resta
        // invariato (quello appena impostato) e i fallimenti non si toccano.
        esercizioStato.storico.push({ data: oggiISO(), peso: pesi[0], pesiSerie: pesi, reps, rpe, nota });
        messaggio = `Sessione di scarico salvata, peso invariato (${pesi[0]}kg).`;
      } else {
        // La doppia progressione valuta solo la prima serie (il "vero" carico di
        // lavoro): le serie successive possono essere un drop set a peso ridotto
        // e non devono essere lette come "hai polverizzato il target".
        const risultato = calcolaProgressione(esercizioStato, { reps: [reps[0]] });
        esercizioStato.storico.push({ data: oggiISO(), peso: pesi[0], pesiSerie: pesi, reps, rpe, nota });
        esercizioStato.ultimoPeso = risultato.nuovoPeso;
        esercizioStato.fallimentiConsecutivi = risultato.nuoviFallimentiConsecutivi;

        const messaggi = {
          aumenta: `Sessione salvata. La prossima volta: +peso → ${risultato.nuovoPeso}kg.`,
          diminuisci: `Sessione salvata. La prossima volta: -peso → ${risultato.nuovoPeso}kg.`,
          invariato: `Sessione salvata. La prossima volta: stesso peso (${risultato.nuovoPeso}kg).`
        };
        messaggio = messaggi[risultato.azione];
      }
    }

    giaSalvato = true;
    btnSalva.disabled = true;
    btnSalva.textContent = 'Sessione salvata';

    dettaglio.querySelector('.esito').textContent = messaggio;
    onSalva();
  });

  return dettaglio;
}

function renderSessione(container, titolo, sessione, data, persist, riduciSerie, aggiornaAlternanza) {
  const div = document.createElement('div');
  div.innerHTML = `<h3>${titolo}</h3>`;
  const lista = document.createElement('div');
  lista.className = 'lista-esercizi';
  const dettagli = [];

  sessione.esercizi.forEach(({ id, serie }) => {
    const esercizioConfig = datiDefault.esercizi[id];
    const esercizioStato = data.esercizi[id];
    const serieEffettive = riduciSerie ? applicaDeload(serie) : serie;
    const giaFatto = salvatoOggi(esercizioStato);

    const dettaglio = renderEsercizio(esercizioConfig, esercizioStato, serieEffettive, riduciSerie, giaFatto, () => {
      if (aggiornaAlternanza) {
        // Ricorda quale sessione Upper/Lower è stata fatta per ultima, così la
        // volta dopo l'app propone l'altra invece di lasciare all'utente la scelta a caso.
        data.mesociclo.ultimaSessioneFase2 = sessione.nome;
      }
      persist();
      dettaglio.open = false;
      dettaglio.classList.add('salvato');
      const prossimo = dettagli.find((d) => d !== dettaglio && !d.classList.contains('salvato') && !d.open);
      if (prossimo) prossimo.open = true;
    });

    if (giaFatto) dettaglio.classList.add('salvato');
    dettagli.push(dettaglio);
    lista.appendChild(dettaglio);
  });

  const primoApribile = dettagli.find((d) => !d.classList.contains('salvato'));
  if (primoApribile) primoApribile.open = true;

  div.appendChild(lista);
  container.appendChild(div);
}

export function renderAllenamento(container, data, persist) {
  container.innerHTML = '';
  const giorno = getGiornoOggi(data);

  const azioni = document.createElement('div');
  azioni.className = 'card';
  azioni.innerHTML = `
    <button id="btn-inizio-allenamento" type="button" class="primario">${iconManubrio()} Mi sto allenando ora</button>
    <button id="btn-fine-allenamento" type="button">Ho finito di allenarmi</button>
  `;
  container.appendChild(azioni);
  azioni.querySelector('#btn-inizio-allenamento').addEventListener('click', () => {
    giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'inizio-allenamento' });
    persist();
  });
  azioni.querySelector('#btn-fine-allenamento').addEventListener('click', () => {
    giorno.eventiAllenamento.push({ ora: oraAttuale(), tipo: 'post-workout-iniziato' });
    persist();
  });

  const settimana = calcolaSettimana(data.mesociclo.dataInizio, oggiISO());
  const fase = calcolaFase(settimana);
  const isDeload = fase === 'deload';
  const isFase2 = fase === 'fase2' || fase === 'deload';

  const intestazione = document.createElement('p');
  intestazione.textContent = `Mesociclo 1 — Settimana ${settimana} (${fase})`;
  container.appendChild(intestazione);

  const sessioni = sessioniDisponibili(fase);
  if (sessioni.length === 0) {
    // Oltre la settimana 5 (mesociclo2) non ci sono ancora sessioni definite:
    // meglio dirlo che mostrare una sezione vuota senza spiegazione.
    const avviso = document.createElement('p');
    avviso.textContent = 'Mesociclo 1 completato — Mesociclo 2 da definire. Nel frattempo puoi usare le sessioni extra qui sotto.';
    container.appendChild(avviso);
  } else if (isFase2 && sessioni.length > 1) {
    // Alterna Upper/Lower in base all'ultima sessione fase2 salvata (non alla
    // fase, che dura settimane): se ieri hai fatto Upper, oggi propone Lower.
    const ultima = data.mesociclo.ultimaSessioneFase2;
    const suggerita = sessioni.find((s) => s.nome !== ultima) || sessioni[0];
    const altre = sessioni.filter((s) => s !== suggerita);
    renderSessione(container, `${suggerita.nome} (consigliata oggi)`, suggerita, data, persist, isDeload, true);
    altre.forEach((sessione) => {
      renderSessione(container, `${sessione.nome} (alternativa)`, sessione, data, persist, isDeload, true);
    });
  } else {
    sessioni.forEach((sessione) => {
      renderSessione(container, sessione.nome, sessione, data, persist, isDeload, false);
    });
  }

  const titoloExtra = document.createElement('h2');
  titoloExtra.textContent = 'Sessioni extra leggere (facoltative)';
  container.appendChild(titoloExtra);

  Object.values(datiDefault.sessioniExtra).forEach((sessione) => {
    renderSessione(container, sessione.nome, sessione, data, persist, false, false);
  });
}
