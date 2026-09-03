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

function renderEsercizio(esercizioConfig, esercizioStato, serieProgrammate, onSalva) {
  const conPeso = tracciaProgressione(esercizioConfig);
  const unita = conPeso ? 'reps' : 'sec/reps';
  const li = document.createElement('li');
  const inputsReps = Array.from({ length: serieProgrammate }, (_, i) => `
    <input type="number" class="rep-input" data-serie="${i}" placeholder="Serie ${i + 1} (target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax})" min="0">
  `).join('');

  const riepilogo = conPeso
    ? `ultimo peso: ${esercizioStato.ultimoPeso}kg, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`
    : `a corpo libero, target ${esercizioConfig.rangeMin}-${esercizioConfig.rangeMax} ${unita}, ${serieProgrammate} serie`;

  li.innerHTML = `
    <strong>${esercizioConfig.nome}</strong> — ${riepilogo}
    <div>${inputsReps}</div>
    <input type="number" class="rpe-input" placeholder="RPE (1-10)" min="1" max="10">
    <input type="text" class="nota-input" placeholder="Nota (facoltativa)">
    <button type="button" class="btn-salva">Salva sessione</button>
    <div class="esito"></div>
  `;

  li.querySelector('.btn-salva').addEventListener('click', () => {
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

    li.querySelector('.esito').textContent = messaggio;
    onSalva();
  });

  return li;
}

function renderSessione(container, titolo, sessione, data, persist, riduciSerie) {
  const div = document.createElement('div');
  div.innerHTML = `<h3>${titolo}</h3>`;
  const lista = document.createElement('ul');
  sessione.esercizi.forEach(({ id, serie }) => {
    const esercizioConfig = datiDefault.esercizi[id];
    const esercizioStato = data.esercizi[id];
    const serieEffettive = riduciSerie ? applicaDeload(serie) : serie;
    lista.appendChild(renderEsercizio(esercizioConfig, esercizioStato, serieEffettive, () => persist()));
  });
  div.appendChild(lista);
  container.appendChild(div);
}

export function renderAllenamento(container, data, persist) {
  container.innerHTML = '';
  const settimana = calcolaSettimana(data.mesociclo.dataInizio, oggiISO());
  const fase = calcolaFase(settimana);
  const isDeload = fase === 'deload';

  const intestazione = document.createElement('p');
  intestazione.textContent = `Mesociclo 1 — Settimana ${settimana} (${fase})`;
  container.appendChild(intestazione);

  sessioniDisponibili(fase).forEach((sessione) => {
    renderSessione(container, sessione.nome, sessione, data, persist, isDeload);
  });

  const titoloExtra = document.createElement('h2');
  titoloExtra.textContent = 'Sessioni extra leggere (facoltative)';
  container.appendChild(titoloExtra);

  Object.values(datiDefault.sessioniExtra).forEach((sessione) => {
    renderSessione(container, sessione.nome, sessione, data, persist, false);
  });
}
