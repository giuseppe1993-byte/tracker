// `tracciaProgressione: false` = esercizio senza carico esterno (es. plank, dove
// rangeMin/rangeMax sono secondi di tenuta e non ripetizioni): niente doppia
// progressione, niente "ultimo peso", si registrano solo reps/RPE/nota.
export const datiDefault = {
  esercizi: {
    squat: { nome: 'Squat (bilanciere)', rangeMin: 6, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    panca: { nome: 'Panca piana (bilanciere)', rangeMin: 6, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    rematore: { nome: 'Rematore bilanciere', rangeMin: 8, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    militarypress: { nome: 'Military Press (manubri)', rangeMin: 8, rangeMax: 10, tipo: 'manubri', ultimoPeso: 8, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    affondi: { nome: 'Affondi camminati (manubri)', rangeMin: 10, rangeMax: 12, tipo: 'manubri', ultimoPeso: 8, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    latmachine: { nome: 'Lat machine / Trazioni al cavo', rangeMin: 10, rangeMax: 12, tipo: 'manubri', ultimoPeso: 20, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    staccorumeno: { nome: 'Stacco rumeno (bilanciere)', rangeMin: 8, rangeMax: 10, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    goodmorning: { nome: 'Good morning (bilanciere)', rangeMin: 10, rangeMax: 12, tipo: 'bilanciere', ultimoPeso: 10, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    calfraise: { nome: 'Calf raise', rangeMin: 15, rangeMax: 20, tipo: 'manubri', ultimoPeso: 10, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    plank: { nome: 'Plank (secondi di tenuta)', rangeMin: 30, rangeMax: 45, tipo: 'manubri', ultimoPeso: 0, fallimentiConsecutivi: 0, tracciaProgressione: false, storico: [] },
    curlbicipiti: { nome: 'Curl bicipiti (manubri)', rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 6, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    pushdown: { nome: 'Push down tricipiti (cavo)', rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 6, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    alzatelaterali: { nome: 'Alzate laterali (manubri)', rangeMin: 12, rangeMax: 15, tipo: 'manubri', ultimoPeso: 4, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] },
    shrug: { nome: 'Shrug (bilanciere)', rangeMin: 12, rangeMax: 15, tipo: 'bilanciere', ultimoPeso: 20, fallimentiConsecutivi: 0, tracciaProgressione: true, storico: [] }
  },
  sessioniPerFase: {
    fase1: [
      { nome: 'Full Body', esercizi: [
        { id: 'squat', serie: 3 }, { id: 'panca', serie: 3 }, { id: 'rematore', serie: 3 },
        { id: 'militarypress', serie: 3 }, { id: 'affondi', serie: 3 }, { id: 'plank', serie: 3 }
      ] }
    ],
    fase2: [
      { nome: 'Upper', esercizi: [
        { id: 'panca', serie: 4 }, { id: 'rematore', serie: 4 }, { id: 'militarypress', serie: 3 },
        { id: 'latmachine', serie: 3 }, { id: 'curlbicipiti', serie: 2 }, { id: 'pushdown', serie: 2 }
      ] },
      { nome: 'Lower', esercizi: [
        { id: 'squat', serie: 4 }, { id: 'staccorumeno', serie: 3 }, { id: 'affondi', serie: 3 },
        { id: 'goodmorning', serie: 3 }, { id: 'calfraise', serie: 3 }, { id: 'plank', serie: 3 }
      ] }
    ]
  },
  sessioniExtra: {
    extraA: { nome: 'Extra A — Braccia/Core', esercizi: [
      { id: 'curlbicipiti', serie: 3 }, { id: 'pushdown', serie: 3 }, { id: 'calfraise', serie: 3 }, { id: 'plank', serie: 3 }
    ] },
    extraB: { nome: 'Extra B — Spalle/Core', esercizi: [
      { id: 'alzatelaterali', serie: 3 }, { id: 'shrug', serie: 3 }, { id: 'calfraise', serie: 3 }
    ] }
  }
  // La vecchia checklist a 4 pasti fissi (campo `pasti`) è stata sostituita dal
  // motore pasti adattivo — vedi js/database-alimenti.js e js/budget.js.
};
