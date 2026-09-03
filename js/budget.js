// Rapporto reale derivato dal piano originale (Pasto post-workout: 48g carbo
// vs Pasto normale: 31g carbo, su 4 pasti/2145kcal — non un valore inventato).
const PESO_CARBO_POST_WORKOUT = 1.5;
const PESO_CARBO_NORMALE = 1;
const PASTI_AL_GIORNO = 4;

export function calcolaConsumato(alimentiOggi, databaseAlimenti) {
  return alimentiOggi.reduce(
    (tot, voce) => {
      const alimento = databaseAlimenti[voce.alimentoId];
      const fattore = voce.grammiCrudi / 100;
      return {
        kcal: tot.kcal + alimento.kcal * fattore,
        p: tot.p + alimento.p * fattore,
        f: tot.f + alimento.f * fattore,
        c: tot.c + alimento.c * fattore
      };
    },
    { kcal: 0, p: 0, f: 0, c: 0 }
  );
}

export function calcolaRimasto(target, consumato) {
  return {
    kcal: target.kcal - consumato.kcal,
    p: target.p - consumato.p,
    f: target.f - consumato.f,
    c: target.c - consumato.c
  };
}

// combo = { proteina: alimentoId, carbo: alimentoId | null, grassoZero: bool }
export function suggerisciPasto({ rimasto, pastiLoggatiOggi, isPostWorkout, combo, databaseAlimenti }) {
  const pastiRimanenti = Math.max(1, PASTI_AL_GIORNO - pastiLoggatiOggi);

  // Proteine: dose costante, spalmata sui pasti rimanenti stimati.
  const pTarget = Math.max(0, rimasto.p / pastiRimanenti);

  // Carbo: quota pesata (1.5x se post-workout) sul budget rimasto.
  const pesoQuestoPasto = isPostWorkout ? PESO_CARBO_POST_WORKOUT : PESO_CARBO_NORMALE;
  const pesoTotaleStimato = isPostWorkout
    ? PESO_CARBO_POST_WORKOUT + PESO_CARBO_NORMALE * (pastiRimanenti - 1)
    : PESO_CARBO_NORMALE * pastiRimanenti;
  const cTarget = Math.max(0, rimasto.c * (pesoQuestoPasto / Math.max(1, pesoTotaleStimato)));

  const proteina = databaseAlimenti[combo.proteina];
  const carbo = combo.carbo ? databaseAlimenti[combo.carbo] : null;
  const grammiProteina = proteina.p > 0 ? (pTarget / proteina.p) * 100 : 0;
  const grammiCarbo = carbo && carbo.c > 0 ? (cTarget / carbo.c) * 100 : 0;

  const arrotonda = (g) => Math.max(0, Math.floor(g / 5) * 5);
  return {
    proteina: { alimentoId: combo.proteina, grammiCrudi: arrotonda(grammiProteina) },
    carbo: carbo ? { alimentoId: combo.carbo, grammiCrudi: arrotonda(grammiCarbo) } : null,
    nota: combo.grassoZero ? 'Pasto post-workout: niente olio/grassi aggiunti.' : null
  };
}
