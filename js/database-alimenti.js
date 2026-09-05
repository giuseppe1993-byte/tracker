// Valori USDA reali per 100g a crudo/secco (stesso standard del piano: si pesa
// sempre a crudo, il valore nutrizionale non cambia con la cottura).
export const databaseAlimenti = {
  pollo: { nome: 'Petto di pollo', kcal: 120, p: 22.5, f: 2.6, c: 0, tipo: 'proteina' },
  carneRossa: { nome: 'Carne rossa macinata 95%', kcal: 137, p: 21.4, f: 5.0, c: 0, tipo: 'proteina' },
  uovaIntere: { nome: 'Uova intere', kcal: 143, p: 12.6, f: 9.51, c: 0.72, tipo: 'proteina' },
  albume: { nome: 'Albume liquido', kcal: 52, p: 10.9, f: 0.17, c: 0.73, tipo: 'proteina' },
  whey: { nome: 'Whey (proteina in polvere)', kcal: 352, p: 78.1, f: 1.56, c: 6.25, tipo: 'proteina' },
  riso: { nome: 'Riso bianco', kcal: 360, p: 6.61, f: 0.58, c: 79.3, tipo: 'carbo' },
  pasta: { nome: 'Pasta', kcal: 371, p: 13.0, f: 1.51, c: 74.7, tipo: 'carbo' },
  couscous: { nome: 'Couscous', kcal: 376, p: 12.8, f: 0.64, c: 77.4, tipo: 'carbo' },
  cremaDiRiso: { nome: 'Crema di riso', kcal: 359, p: 6.94, f: 1.3, c: 79.8, tipo: 'carbo' },
  avena: { nome: 'Fiocchi d\'avena', kcal: 389, p: 16.9, f: 6.9, c: 66.3, tipo: 'carbo' },
  olioEvo: { nome: 'Olio EVO', kcal: 884, p: 0, f: 100, c: 0, tipo: 'grasso' }
};

// Cotto = crudo * rapporto. Riso/pasta/couscous assorbono acqua in cottura
// (pesano di più da cotti, rapporto >1); pollo/carne rossa la perdono (pesano
// di meno da cotti, rapporto <1 — rese di cottura realistiche ~73-79%).
// Corretto dopo un test reale: i valori precedenti di pollo/carne rossa erano
// invertiti (mostravano il cotto più pesante del crudo, fisicamente sbagliato).
// Alimenti assenti da questa mappa (uova, albume, whey, avena, cremaDiRiso,
// olioEvo): peso invariato tra crudo e cotto, nessuno switch mostrato per quelli.
export const rapportiCotturaCrudo = {
  pollo: 0.727,
  riso: 2.83,
  pasta: 2.36,
  carneRossa: 0.787,
  couscous: 3.36
};

// Combo predefinite per il motore di raccomandazione, in ordine di rotazione.
// grassoG: grammi fissi di olio EVO da abbinare (dal piano validato, non
// spalmati dinamicamente come proteine/carbo — l'olio è una quota costante
// per tipo di pasto nel piano originale).
export const combosPasto = {
  normale: [
    { proteina: 'pollo', carbo: 'riso', grassoZero: false, grassoG: 15 },
    { proteina: 'pollo', carbo: 'pasta', grassoZero: false, grassoG: 10 },
    { proteina: 'carneRossa', carbo: 'couscous', grassoZero: false, grassoG: 8 }
  ],
  postWorkout: [
    { proteina: 'whey', carbo: 'cremaDiRiso', grassoZero: true },
    { proteina: 'pollo', carbo: 'riso', grassoZero: true }
  ]
};

// Ricetta fissa di colazione dal piano validato — non passa dal motore di
// spalmatura dinamica: il piano la vuole intenzionalmente più leggera di
// proteine rispetto agli altri pasti, un'unica fonte proteica (a scelta tra
// uova/albume) non riesce a coprire in modo realistico una quota "uniforme"
// di proteine giornaliere (vedi commit che ha introdotto questa costante).
export const colazioneFissa = {
  voci: [
    { alimentoId: 'uovaIntere', grammiCrudi: 110 },
    { alimentoId: 'albume', grammiCrudi: 250 },
    { alimentoId: 'avena', grammiCrudi: 35 }
  ]
};

export const targetGiornaliero = { kcal: 2145, p: 214, f: 72, c: 161 };
