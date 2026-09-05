import { datiDefault } from './dati-default.js';
import { contaPastiLoggati } from './giorno-oggi.js';

function coloreToken(nome, fallback) {
  const valore = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return valore || fallback;
}

function disegnaGraficoPeso(canvas, punti) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (punti.length < 2) {
    ctx.fillStyle = coloreToken('--color-muted-foreground', '#666');
    ctx.fillText('Dati insufficienti per il grafico (minimo 2 pesate)', 10, h / 2);
    return;
  }
  const pesi = punti.map((p) => p.peso);
  const min = Math.min(...pesi) - 0.5;
  const max = Math.max(...pesi) + 0.5;
  const passoX = w / (punti.length - 1);

  ctx.beginPath();
  punti.forEach((p, i) => {
    const x = i * passoX;
    const y = h - ((p.peso - min) / (max - min)) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = coloreToken('--color-primary', '#F97316');
  ctx.lineWidth = 2;
  ctx.stroke();
}

function esportaBackup(data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert(`Errore durante l'esportazione: ${e.message}`);
  }
}

export function renderStorico(container, data) {
  const giorniConPeso = Object.entries(data.pasti)
    .filter(([, g]) => g.peso != null)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data_, g]) => ({ data: data_, peso: g.peso }));

  const giorniTotali = Object.keys(data.pasti).length;
  const giorniAderenti = Object.values(data.pasti).filter((g) => contaPastiLoggati(g) >= 4).length;

  container.innerHTML = `
    <section class="card">
      <h2>Peso corporeo</h2>
      <canvas id="grafico-peso" width="320" height="150"></canvas>
    </section>
    <section class="card">
      <h2>Aderenza pasti</h2>
      <p>${giorniAderenti} / ${giorniTotali} giorni con tutti e 4 i pasti completati</p>
    </section>
    <section class="card">
      <h2>Storico carichi</h2>
      <ul id="lista-carichi"></ul>
    </section>
    <button id="btn-backup" type="button">Esporta backup</button>
  `;

  disegnaGraficoPeso(container.querySelector('#grafico-peso'), giorniConPeso);

  // Costruzione via DOM + textContent: `nota` è testo libero digitato
  // dall'utente e non deve MAI finire in una template string assegnata a
  // innerHTML (stesso accorgimento già adottato in js/oggi.js per gli extra).
  const listaCarichi = container.querySelector('#lista-carichi');
  const vociCarichi = Object.entries(data.esercizi).filter(([, e]) => e.storico.length > 0);

  if (vociCarichi.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Nessun allenamento registrato ancora.';
    listaCarichi.appendChild(li);
  } else {
    vociCarichi.forEach(([id, e]) => {
      const ultima = e.storico[e.storico.length - 1];
      const conPeso = datiDefault.esercizi[id]?.tracciaProgressione !== false;

      const li = document.createElement('li');
      const nome = document.createElement('strong');
      nome.textContent = e.nome;
      li.appendChild(nome);

      const dettagli = [];
      if (conPeso) dettagli.push(`${e.ultimoPeso}kg`);
      dettagli.push(`ultima sessione ${ultima.data}`);
      dettagli.push(`reps ${ultima.reps.join('/')}`);
      if (ultima.rpe != null) dettagli.push(`RPE ${ultima.rpe}`);
      li.appendChild(document.createTextNode(`: ${dettagli.join(' — ')}`));

      if (ultima.nota) {
        const nota = document.createElement('div');
        nota.className = 'nota';
        nota.textContent = `Nota: ${ultima.nota}`;
        li.appendChild(nota);
      }

      listaCarichi.appendChild(li);
    });
  }

  container.querySelector('#btn-backup').addEventListener('click', () => esportaBackup(data));
}
