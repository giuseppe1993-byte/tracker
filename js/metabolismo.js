// Stime approssimative — formule standard (Deurenberg per la massa grassa,
// Mifflin-St Jeor per il metabolismo basale), non misurazioni reali.

export function calcolaBMI(pesoKg, altezzaCm) {
  const altezzaM = altezzaCm / 100;
  return pesoKg / (altezzaM * altezzaM);
}

export function calcolaBF({ bmi, eta, sesso }) {
  const sessoValore = sesso === 'M' ? 1 : 0;
  return 1.2 * bmi + 0.23 * eta - 10.8 * sessoValore - 5.4;
}

export function calcolaBMR({ pesoKg, altezzaCm, eta, sesso }) {
  const base = 10 * pesoKg + 6.25 * altezzaCm - 5 * eta;
  return sesso === 'M' ? base + 5 : base - 161;
}

export const MOLTIPLICATORI_ATTIVITA = {
  sedentario: 1.2,
  leggero: 1.375,
  moderato: 1.55,
  intenso: 1.725,
  moltoIntenso: 1.9
};

export function calcolaTDEE(bmr, livelloAttivita) {
  const moltiplicatore = MOLTIPLICATORI_ATTIVITA[livelloAttivita] ?? MOLTIPLICATORI_ATTIVITA.sedentario;
  return bmr * moltiplicatore;
}
