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
  },
  pasti: {
    sera: [
      { id: 'pasto1', nome: 'Pasto 1 (06:00)', desc: '2 uova intere + 250g albume + 35g fiocchi d\'avena' },
      { id: 'pasto2', nome: 'Pasto 2 (11:00)', desc: '260g pollo crudo + 60g riso crudo + 15g olio EVO' },
      { id: 'pasto3', nome: 'Pasto 3 pre-workout (15:30)', desc: '165g pollo crudo + 42g pasta cruda + 10g olio EVO' },
      { id: 'pasto4', nome: 'Pasto 4 post-workout (19:00)', desc: '273g carne rossa magra cruda + 61g couscous crudo + 8g olio EVO' }
    ],
    riposo: [
      { id: 'pasto1', nome: 'Pasto 1 (06:00)', desc: '2 uova intere + 250g albume + 35g fiocchi d\'avena' },
      { id: 'pasto2', nome: 'Pasto 2 (11:00)', desc: '260g pollo crudo + 60g riso crudo + 15g olio EVO' },
      { id: 'pasto3', nome: 'Pasto 3 (15:30)', desc: '165g pollo crudo + 42g pasta cruda + 10g olio EVO' },
      { id: 'pasto4', nome: 'Pasto 4 (19:00)', desc: '273g carne rossa magra cruda + 61g couscous crudo + 8g olio EVO' }
    ],
    mattina: [
      { id: 'pasto1', nome: 'Pasto 1 post-workout (subito dopo l\'allenamento)', desc: '50g crema di riso + 60g whey — zero cottura' },
      { id: 'pasto2', nome: 'Pasto 2 (11:00)', desc: '260g pollo crudo + 60g riso crudo + 15g olio EVO' },
      { id: 'pasto3', nome: 'Pasto 3 (15:30)', desc: '165g pollo crudo + 42g pasta cruda + 10g olio EVO' },
      { id: 'pasto4', nome: 'Pasto 4 (19:00, cena)', desc: '273g carne rossa magra cruda + 61g couscous crudo + 20g olio EVO (8g + 12g compensazione grassi)' }
    ]
  }
};
