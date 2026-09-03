function disegnaGraficoPeso(canvas, punti) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (punti.length < 2) {
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
  ctx.strokeStyle = '#2563eb';
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
  const giorniAderenti = Object.values(data.pasti).filter((g) => g.fatti.length === 4).length;

  container.innerHTML = `
    <h2>Peso corporeo</h2>
    <canvas id="grafico-peso" width="320" height="150"></canvas>
    <h2>Aderenza pasti</h2>
    <p>${giorniAderenti} / ${giorniTotali} giorni con tutti e 4 i pasti completati</p>
    <h2>Storico carichi</h2>
    <ul id="lista-carichi"></ul>
    <button id="btn-backup" type="button">Esporta backup</button>
  `;

  disegnaGraficoPeso(container.querySelector('#grafico-peso'), giorniConPeso);

  const listaCarichi = container.querySelector('#lista-carichi');
  listaCarichi.innerHTML = Object.entries(data.esercizi)
    .filter(([, e]) => e.storico.length > 0)
    .map(([, e]) => {
      const ultima = e.storico[e.storico.length - 1];
      return `<li><strong>${e.nome}</strong>: ${e.ultimoPeso}kg (ultima sessione ${ultima.data}: reps ${ultima.reps.join('/')})</li>`;
    })
    .join('') || '<li>Nessun allenamento registrato ancora.</li>';

  container.querySelector('#btn-backup').addEventListener('click', () => esportaBackup(data));
}
