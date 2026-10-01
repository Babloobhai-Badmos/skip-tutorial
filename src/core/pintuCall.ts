import { degrade } from '../characters/pintu';
import type { GameStore } from './gameState';
import { applyLoss } from './pintuLoss';

/**
 * Phone a Friend (D05 / the in-level lifeline). Each call is "Free".
 * Each call silently costs Pintu something. By call 5 he says nothing.
 */
export const SILENT_FROM_CALL = 5;

export interface CallResult {
  /** 1-based call number. */
  call: number;
  /** What the subtitles show. */
  text: string;
  /** Pintu has nothing left to say: just the breath. */
  silent: boolean;
}

/** Pure: what Pintu says on call `n`, given his losses. */
export function callLine(
  scripts: readonly string[],
  breath: string,
  n: number,
  lossCount: number,
): CallResult {
  if (n >= SILENT_FROM_CALL) return { call: n, text: breath, silent: true };
  const base = scripts[Math.min(n - 1, scripts.length - 1)] ?? breath;
  const text = degrade(base, lossCount);
  return { call: n, text, silent: text === '(saans)' };
}

/** Makes the call: counts it, takes the price, returns the line. */
export function callPintu(
  store: GameStore,
  scripts: readonly string[],
  breath: string,
  extraVoiceLines: readonly string[] = [],
): CallResult {
  store.update('lifeline:call', (d) => {
    d.flags.calledPintuCount += 1;
  });
  const n = store.state.flags.calledPintuCount;
  // He answers first; the price is taken after he hangs up.
  const result = callLine(scripts, breath, n, store.state.pintuLoss.length);
  applyLoss(store, 'lifeline', extraVoiceLines);
  return result;
}
