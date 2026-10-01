import type { GameStore } from './gameState';
import { applyLoss, type LossStep } from './pintuLoss';

/**
 * Twist #1: saving costs marks. Every checkpoint load drops `percentage`
 * and quietly costs Pintu something. Never announced as a loss - Pintu only
 * ever talks about the marks.
 */
export const MARKS_PER_LOAD = 5;

export function marksAfterLoad(current: number): number {
  return Math.max(0, current - MARKS_PER_LOAD);
}

export interface CheckpointLoad {
  percentage: number;
  loss: LossStep | null;
}

export function loadCheckpoint(
  store: GameStore,
  extraVoiceLines: readonly string[] = [],
  now = Date.now(),
): CheckpointLoad {
  const loss = applyLoss(store, 'checkpoint', extraVoiceLines, now);
  store.update('checkpoint:load', (d) => {
    d.percentage = marksAfterLoad(d.percentage);
  });
  return { percentage: store.state.percentage, loss };
}

/** The index of the furthest checkpoint the player has passed. */
export function furthestCheckpoint(
  checkpoints: readonly number[],
  x: number,
  current: number,
): number {
  let best = current;
  checkpoints.forEach((cx, i) => {
    if (x >= cx && i > best) best = i;
  });
  return best;
}
