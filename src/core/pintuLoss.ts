import type { GameStore } from './gameState';
import type { PintuLossEntry, PintuLossItem } from './stateSchema';

/**
 * What Pintu loses, in order. The game NEVER announces a loss: it only shows
 * up as an absence (name tag gone, a leg gone, a line he no longer says).
 */
export interface LossStep {
  item: PintuLossItem;
  /** For voiceLine: the dialogue line id that goes silent. */
  detail?: string;
}

export const LOSS_SEQUENCE: readonly LossStep[] = [
  { item: 'nameTag' },
  { item: 'voiceLine', detail: 'greet_hello' },
  { item: 'voiceLine', detail: 'walk_praise' },
  { item: 'uiPanel' },
  { item: 'voiceLine', detail: 'jump_speed' },
  { item: 'leftLeg' },
  { item: 'voiceLine', detail: 'wall_sorry' },
  { item: 'rightLeg' },
];

const sameStep = (a: LossStep, b: LossStep) => a.item === b.item && a.detail === b.detail;

/**
 * The first step in the sequence Pintu still has. After the fixed sequence,
 * any remaining losable voice lines go, in the order given. null = nothing left.
 */
export function nextLoss(
  current: readonly PintuLossEntry[],
  extraVoiceLines: readonly string[] = [],
): LossStep | null {
  const steps: LossStep[] = [
    ...LOSS_SEQUENCE,
    ...extraVoiceLines.map((id): LossStep => ({ item: 'voiceLine', detail: id })),
  ];
  return steps.find((step) => !current.some((entry) => sameStep(entry, step))) ?? null;
}

export function hasLost(
  current: readonly PintuLossEntry[],
  item: PintuLossItem,
  detail?: string,
): boolean {
  return current.some((e) => e.item === item && (detail === undefined || e.detail === detail));
}

export function lostVoiceLines(current: readonly PintuLossEntry[]): Set<string> {
  return new Set(
    current.filter((e) => e.item === 'voiceLine' && e.detail).map((e) => e.detail as string),
  );
}

/** Takes the next thing from Pintu. Returns what was taken (for the caller only). */
export function applyLoss(
  store: GameStore,
  cause: string,
  extraVoiceLines: readonly string[] = [],
  now = Date.now(),
): LossStep | null {
  const step = nextLoss(store.state.pintuLoss, extraVoiceLines);
  if (!step) return null;
  store.update(`pintu:loss:${cause}`, (d) => {
    d.pintuLoss.push({ ...step, cause, timestamp: now });
  });
  return step;
}

/**
 * The tutorial room's quiet reward: the most recently lost voice line comes back.
 * Only voice lines recover - limbs and the name tag do not.
 */
export function recoverVoiceLine(store: GameStore): string | null {
  const losses = store.state.pintuLoss;
  for (let i = losses.length - 1; i >= 0; i--) {
    const entry = losses[i];
    if (entry?.item === 'voiceLine' && entry.detail) {
      const id = entry.detail;
      store.update('pintu:recover', (d) => {
        d.pintuLoss.splice(i, 1);
      });
      return id;
    }
  }
  return null;
}
