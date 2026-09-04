import { isPostWorkoutOra } from './giorno-oggi.js';

export function prossimaAzione(giorno) {
  if (giorno.peso == null) return { tipo: 'pesati' };

  const eventi = giorno.eventiAllenamento;
  const ultimo = eventi[eventi.length - 1];
  if (ultimo && ultimo.tipo === 'inizio-allenamento') return { tipo: 'allenamento-in-corso' };

  if (isPostWorkoutOra(giorno)) return { tipo: 'post-workout' };

  return { tipo: 'prossimo-pasto' };
}
