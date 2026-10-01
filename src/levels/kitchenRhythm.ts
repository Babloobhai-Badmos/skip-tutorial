/**
 * Level 2 (Rasode): pressure cookers whistle on a learnable beat pattern.
 * One bar = BEATS_PER_BAR beats. A cooker telegraphs (its weight wobbles)
 * for one beat before it whistles.
 */
export const BEAT_MS = 700;
export const BEATS_PER_BAR = 4;
export const BAR_MS = BEAT_MS * BEATS_PER_BAR;

export interface CookerPattern {
  /** 0-based beats in the bar on which this cooker whistles. */
  beats: readonly number[];
}

export type CookerPhase = 'quiet' | 'telegraph' | 'whistle';

export function beatAt(tMs: number): number {
  return Math.floor((((tMs % BAR_MS) + BAR_MS) % BAR_MS) / BEAT_MS);
}

export function cookerPhase(pattern: CookerPattern, tMs: number): CookerPhase {
  const beat = beatAt(tMs);
  if (pattern.beats.includes(beat)) return 'whistle';
  const next = (beat + 1) % BEATS_PER_BAR;
  if (pattern.beats.includes(next)) return 'telegraph';
  return 'quiet';
}

/** Is there at least one safe beat? (Every pattern must be passable.) */
export function hasSafeBeat(pattern: CookerPattern): boolean {
  return pattern.beats.length < BEATS_PER_BAR;
}
