import type { GameStore, HorrorLevel } from './gameState';

/**
 * The tone brain (spec section 5). M1 stub: always pure comedy.
 * M3 replaces `computeHorrorLevel` with the real, unit-tested rules.
 * This is the ONLY module allowed to call store.setHorrorLevel().
 */
export function computeHorrorLevel(_state: GameStore['state']): HorrorLevel {
  return 0;
}

export function updateHorrorLevel(store: GameStore): HorrorLevel {
  const level = computeHorrorLevel(store.state);
  store.setHorrorLevel(level, 'director');
  return level;
}
