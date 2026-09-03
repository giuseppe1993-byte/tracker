import { datiDefault } from './dati-default.js';

function oggiISO() {
  return new Date().toISOString().slice(0, 10);
}

export function renderOggi(container, data, persist) {
  const chiaveOggi = oggiISO();
  if (!data.pasti[chiaveOggi]) {
    data.pasti[chiaveOggi] = { tipoGiorno: 'sera', fatti: [], extra: [], peso: null };
  }
  const giorno = data.pasti[chiaveOggi];

  container.innerHTML = `
    <label>Giornata:
      <select id="tipo-giorno">
        <option value="sera">Sera</option>
        <option value="mattina">Mattina a digiuno</option>
        <option value="riposo">Riposo</option>
      </select>
    </label>
    <ul id="lista-pasti"></ul>
    <div>
      <input id="extra-testo" placeholder="Aggiungi cibo/nota fuori piano">
      <button id="btn-extra" type="button">+ Aggiungi</button>
    </div>
    <ul id="lista-extra"></ul>
    <div>
      <label>Peso di oggi (kg): <input id="peso-oggi" type="number" step="0.1" inputmode="decimal"></label>
      <button id="btn-peso" type="button">Salva peso</button>
      <span id="esito-peso"></span>
    </div>
  `;

  container.querySelector('#tipo-giorno').value = giorno.tipoGiorno;
  container.querySelector('#peso-oggi').value = giorno.peso ?? '';

  function renderPasti() {
    const pasti = datiDefault.pasti[giorno.tipoGiorno];
    const lista = container.querySelector('#lista-pasti');
    lista.innerHTML = pasti
      .map(
        (p) => `
      <li>
        <label>
          <input type="checkbox" data-pasto="${p.id}" ${giorno.fatti.includes(p.id) ? 'checked' : ''}>
          <strong>${p.nome}</strong> — ${p.desc}
        </label>
      </li>
    `
      )
      .join('');
    lista.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.pasto;
        if (cb.checked) {
          if (!giorno.fatti.includes(id)) giorno.fatti.push(id);
        } else {
          giorno.fatti = giorno.fatti.filter((x) => x !== id);
        }
        persist();
      });
    });
  }

  function renderExtra() {
    const lista = container.querySelector('#lista-extra');
    lista.innerHTML = '';

    giorno.extra.forEach((e, i) => {
      const li = document.createElement('li');

      // Add text content as plain text (not HTML)
      const text = document.createTextNode(e.testo + ' ');
      li.appendChild(text);

      // Add remove button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.i = i;
      btn.className = 'rimuovi-extra';
      btn.textContent = 'rimuovi';
      li.appendChild(btn);

      lista.appendChild(li);
    });

    lista.querySelectorAll('.rimuovi-extra').forEach((btn) => {
      btn.addEventListener('click', () => {
        giorno.extra.splice(Number(btn.dataset.i), 1);
        persist();
        renderExtra();
      });
    });
  }

  container.querySelector('#tipo-giorno').addEventListener('change', (e) => {
    giorno.tipoGiorno = e.target.value;
    giorno.fatti = [];
    persist();
    renderPasti();
  });

  container.querySelector('#btn-extra').addEventListener('click', () => {
    const input = container.querySelector('#extra-testo');
    if (!input.value.trim()) return;
    giorno.extra.push({ testo: input.value.trim() });
    input.value = '';
    persist();
    renderExtra();
  });

  function salvaPeso() {
    const input = container.querySelector('#peso-oggi');
    giorno.peso = input.value ? Number(input.value) : null;
    persist();
    const esito = container.querySelector('#esito-peso');
    esito.textContent = giorno.peso != null ? `Salvato: ${giorno.peso}kg` : '';
  }

  // Salva anche perdendo il focus (comodo su desktop), ma il pulsante è la
  // via principale — su mobile "change" da solo non dava nessuna conferma visibile.
  container.querySelector('#peso-oggi').addEventListener('change', salvaPeso);
  container.querySelector('#btn-peso').addEventListener('click', salvaPeso);

  renderPasti();
  renderExtra();
}
