/**
 * Level 3 (Shaadi Buffet). Aunties fill your plate ("Thoda aur lo beta").
 * Each plate slows you down and raises Sanskaar; jumping over an aunty
 * (refusing) is rude and costs Sanskaar. Too many plates, or no Sanskaar
 * left, and the buffet wins.
 */
export const MAX_PLATES = 5;
export const SANSKAAR_START = 60;
export const SANSKAAR_PER_PLATE = 8;
export const SANSKAAR_PER_REFUSAL = 20;
export const SPEED_PER_PLATE = 0.12;

export interface BuffetState {
  plates: number;
  sanskaar: number;
}

export type BuffetOutcome = 'ok' | 'overfed' | 'disgraced';

export function startBuffet(): BuffetState {
  return { plates: 0, sanskaar: SANSKAAR_START };
}

export function acceptPlate(s: BuffetState): BuffetState {
  return { plates: s.plates + 1, sanskaar: Math.min(100, s.sanskaar + SANSKAAR_PER_PLATE) };
}

export function refuse(s: BuffetState): BuffetState {
  return { ...s, sanskaar: Math.max(0, s.sanskaar - SANSKAAR_PER_REFUSAL) };
}

/** The washing counter: plates go back, nobody judges. (They judge.) */
export function returnPlates(s: BuffetState): BuffetState {
  return { ...s, plates: 0 };
}

export function outcome(s: BuffetState): BuffetOutcome {
  if (s.plates >= MAX_PLATES) return 'overfed';
  if (s.sanskaar <= 0) return 'disgraced';
  return 'ok';
}

export function speedFactor(s: BuffetState): number {
  return Math.max(0.3, 1 - s.plates * SPEED_PER_PLATE);
}
