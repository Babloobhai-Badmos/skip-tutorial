import type { GameStore } from './gameState';
import type { GameState, HorrorLevel } from './stateSchema';

/**
 * The tone brain (spec section 5). Pure: same inputs -> same level.
 *   0 pure comedy · 1 one wrong detail · 2 the joke overstays ·
 *   3 the joke answers back · 4 the fourth wall has a door · 5 reveal
 * This is the ONLY module allowed to call store.setHorrorLevel().
 */
export interface DirectorInput {
  deathCount: number;
  lossCount: number;
  skipCount: number;
  calledPintuCount: number;
  aurDikhaoClicks: number;
  minutesPlayed: number;
  current: HorrorLevel;
  /** "Sab theek hai" (M6): the one time the level is allowed to drop. */
  calmPhase: boolean;
  /** Final reveal (M7). */
  revealed: boolean;
}

/** Complicity weights: things the player chose for fun count the most. */
export const WEIGHTS = {
  death: 1,
  loss: 0.75,
  skip: 0.5,
  calledPintu: 0.5,
  aurDikhao: 1.5,
  perMinute: 0.05,
  maxMinutes: 120,
} as const;

/** Level N needs BOTH this score and this many deaths. Index = level. */
export const SCORE_FOR_LEVEL = [0, 3.5, 6, 10, 15] as const;
// Checkpoint loads also cost Pintu (M5), so losses pile up with deaths;
// the death gates keep the first three deaths pure comedy regardless.
export const DEATHS_FOR_LEVEL = [0, 4, 6, 9, 13] as const;

export function horrorScore(i: DirectorInput): number {
  return (
    i.deathCount * WEIGHTS.death +
    i.lossCount * WEIGHTS.loss +
    i.skipCount * WEIGHTS.skip +
    i.calledPintuCount * WEIGHTS.calledPintu +
    i.aurDikhaoClicks * WEIGHTS.aurDikhao +
    Math.min(i.minutesPlayed, WEIGHTS.maxMinutes) * WEIGHTS.perMinute
  );
}

export function computeHorrorLevel(i: DirectorInput): HorrorLevel {
  if (i.revealed) return 5;
  if (i.calmPhase) return 0;
  const score = horrorScore(i);
  let earned = 0;
  for (let level = 1; level < SCORE_FOR_LEVEL.length; level++) {
    if (
      score >= (SCORE_FOR_LEVEL[level] ?? Infinity) &&
      i.deathCount >= (DEATHS_FOR_LEVEL[level] ?? Infinity)
    ) {
      earned = level;
    }
  }
  // Never drops (outside the calm phase), never jumps to the reveal on its own.
  return Math.min(4, Math.max(earned, i.current === 5 ? 4 : i.current)) as HorrorLevel;
}

export function inputFromState(
  s: Readonly<GameState>,
  phase: { calmPhase?: boolean; revealed?: boolean } = {},
): DirectorInput {
  return {
    deathCount: s.deathCount,
    lossCount: s.pintuLoss.length,
    skipCount: s.flags.skipCount,
    calledPintuCount: s.flags.calledPintuCount,
    aurDikhaoClicks: s.flags.aurDikhaoClicks,
    minutesPlayed: s.timePlayedMs / 60_000,
    current: s.horrorLevel,
    calmPhase: phase.calmPhase ?? false,
    revealed: phase.revealed ?? false,
  };
}

export function updateHorrorLevel(store: GameStore): HorrorLevel {
  const level = computeHorrorLevel(inputFromState(store.state));
  store.setHorrorLevel(level, 'director');
  return level;
}
