import { datiDefault } from './dati-default.js';
import { calcolaSettimana, calcolaFase, applicaDeload } from './mesociclo.js';
import { calcolaProgressione } from './progressione.js';

function oggiISO() {
  return new Date().toISOString().slice(0, 10);
}

function sessioniDisponibili(fase) {
  if (fase === 'fase1') return datiDefault.sessioniPerFase.fase1;
  if (fase === 'fase2') return datiDefault.sessioniPerFase.fase2;
  if (fase === 'deload') return datiDefault.sessioniPerFase.fase2;
  return [];
}

function tracciaProgressione(esercizioConfig) {
  return esercizioConfig.tracciaProgressione !== false;
}

function renderEsercizio(esercizioConfig, esercizioStato, serieProgrammate, isDeload, onSalva) {
  const conPeso = tracciaProgressione(esercizioConfig);
  const unita = conPeso ? 'reps' : 'sec/reps';
  const li = document.createElement('li');
  const inputsReps = Array.from({ length: serieProgrammate }, (_, i) => `
    <input type="number" class="rep-input" data-serie="${i}" placeholder="Serie ${i + 1} (target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax})" min="0">
  `).join('');

  const riepilogo = conPeso
    ? `ultimo peso: ${esercizioStato.ultimoPeso}kg${isDeload ? ' (scarico: carico invariato)' : ''}, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`
    : `a corpo libero, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`;

  li.innerHTML = `
    <strong>${esercizioConfig.nome}</strong> — ${riepilogo}
    <div>${inputsReps}</div>
    <input type="number" class="rpe-input" placeholder="RPE (1-10)" min="1" max="10">
    <input type="text" class="nota-input" placeholder="Nota (facoltativa)">
    <button type="button" class="btn-salva">Salva sessione</button>
    <div class="esito"></div>
  `;

  const btnSalva = li.querySelector('.btn-salva');
  // Protezione dal doppio tap su mobile: due click ravvicinati inserirebbero
  // due voci nello storico e applicherebbero la progressione due volte.
  let giaSalvato = false;

  btnSalva.addEventListener('click', () => {
    if (giaSalvato) return;
    const reps = Array.from(li.querySelectorAll('.rep-input')).map((inp) => Number(inp.value) || 0);
    if (reps.some((r) => r === 0)) {
      li.querySelector('.esito').textContent = 'Inserisci le reps per tutte le serie prima di salvare.';
      return;
    }
    const rpe = Number(li.querySelector('.rpe-input').value) || null;
    const nota = li.querySelector('.nota-input').value.trim();

    let messaggio;
    if (!conPeso) {
      // Esercizio senza carico: si registra solo la prestazione, nessun peso da aggiornare.
      esercizioStato.storico.push({ data: oggiISO(), peso: null, reps, rpe, nota });
      messaggio = 'Sessione salvata (esercizio a corpo libero, nessun carico da aggiornare).';
    } else if (isDeload) {
      // Settimana di scarico: la sessione si registra, ma il carico resta invariato
      // e i fallimenti consecutivi non si toccano (altrimenti lo scarico non scarica).
      esercizioStato.storico.push({ data: oggiISO(), peso: esercizioStato.ultimoPeso, reps, rpe, nota });
      messaggio = `Sessione di scarico salvata, peso invariato (${esercizioStato.ultimoPeso}kg).`;
    } else {
      const risultato = calcolaProgressione(esercizioStato, { reps });
      esercizioStato.storico.push({ data: oggiISO(), peso: esercizioStato.ultimoPeso, reps, rpe, nota });
      esercizioStato.ultimoPeso = risultato.nuovoPeso;
      esercizioStato.fallimentiConsecutivi = risultato.nuoviFallimentiConsecutivi;

      const messaggi = {
        aumenta: `Sessione salvata. La prossima volta: +peso → ${risultato.nuovoPeso}kg.`,
        diminuisci: `Sessione salvata. La prossima volta: -peso → ${risultato.nuovoPeso}kg.`,
        invariato: `Sessione salvata. La prossima volta: stesso peso (${risultato.nuovoPeso}kg).`
      };
      messaggio = messaggi[risultato.azione];
    }

    giaSalvato = true;
    btnSalva.disabled = true;
    btnSalva.textContent = 'Sessione salvata';
    li.classList.add('salvato');

    li.querySelector('.esito').textContent = messaggio;
    onSalva();
  });

  return li;
}

function renderSessione(container, titolo, sessione, data, persist, riduciSerie, aggiornaAlternanza) {
  const div = document.createElement('div');
  div.innerHTML = `<h3>${titolo}</h3>`;
  const lista = document.createElement('ul');
  sessione.esercizi.forEach(({ id, serie }) => {
    const esercizioConfig = datiDefault.esercizi[id];
    const esercizioStato = data.esercizi[id];
    const serieEffettive = riduciSerie ? applicaDeload(serie) : serie;
    lista.appendChild(renderEsercizio(esercizioConfig, esercizioStato, serieEffettive, riduciSerie, () => {
      if (aggiornaAlternanza) {
        // Ricorda quale sessione Upper/Lower è stata fatta per ultima, così la
        // volta dopo l'app propone l'altra invece di lasciare all'utente la scelta a caso.
        data.mesociclo.ultimaSessioneFase2 = sessione.nome;
      }
      persist();
    }));
  });
  div.appendChild(lista);
  container.appendChild(div);
}

export function renderAllenamento(container, data, persist) {
  container.innerHTML = '';
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
