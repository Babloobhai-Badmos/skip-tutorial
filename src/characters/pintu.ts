import type { Rng } from '../core/rng';

export const PINTU_MOODS = ['anxious', 'proud', 'apologetic', 'scared'] as const;
export type PintuMood = (typeof PINTU_MOODS)[number];

export interface PintuLine {
  id: string;
  context: string;
  mood: PintuMood;
  text: string;
  /** Inclusive range of pintuLoss.length where this line can be said. */
  minLoss?: number;
  maxLoss?: number;
  /** Can be taken away by the loss system. */
  losable?: boolean;
}

export interface LineQuery {
  context: string;
  /** Preferred mood; falls back to any mood if nothing matches. */
  mood?: PintuMood;
  lossCount: number;
  lostIds: ReadonlySet<string>;
  /** Moods to avoid unless nothing else is available (e.g. 'scared' before Act 2). */
  avoidMoods?: readonly PintuMood[];
  /** Recently said ids, avoided when there is any alternative. */
  recent?: readonly string[];
  rng: Rng;
}

export function lineAvailable(line: PintuLine, lossCount: number, lostIds: ReadonlySet<string>) {
  return (
    lossCount >= (line.minLoss ?? 0) &&
    lossCount <= (line.maxLoss ?? Infinity) &&
    !lostIds.has(line.id)
  );
}

/**
 * Picks what Pintu says. null means he has nothing left for this moment -
 * the caller shows silence ("..."), never an explanation.
 */
export function selectLine(lines: readonly PintuLine[], q: LineQuery): PintuLine | null {
  const all = lines.filter(
    (l) => l.context === q.context && lineAvailable(l, q.lossCount, q.lostIds),
  );
  if (all.length === 0) return null;
  const calm = all.filter((l) => !q.avoidMoods?.includes(l.mood));
  const pool = calm.length > 0 ? calm : all;
  const moodPool = q.mood ? pool.filter((l) => l.mood === q.mood) : [];
  const base = moodPool.length > 0 ? moodPool : pool;
  const fresh = base.filter((l) => !q.recent?.includes(l.id));
  return q.rng.pick(fresh.length > 0 ? fresh : base);
}

/**
 * Pintu's speech degrades with loss: fewer words, then slower, then breathing.
 * Deterministic so it can be tested.
 */
export function degrade(text: string, lossCount: number): string {
  if (lossCount <= 1) return text;
  const words = text.split(/\s+/).filter(Boolean);
  if (lossCount >= 8 || words.length === 0) return '(saans)';
  // Trailing punctuation would stack with the ellipses ("gaye.... Main").
  const trail = (ws: string[]) => ws.map((w) => w.replace(/[.,!?]+$/, '')).join('... ') + '...';
  if (lossCount >= 6) return trail(words.slice(0, 2));
  if (lossCount >= 4) return trail(words.slice(0, Math.max(2, Math.ceil(words.length * 0.5))));
  const keep = Math.max(2, Math.ceil(words.length * 0.75));
  if (keep >= words.length) return text;
  return `${words
    .slice(0, keep)
    .join(' ')
    .replace(/[.,!?]+$/, '')}...`;
}

/** Typing speed multiplier for subtitles/blips: he slows down as he loses things. */
export function speechRate(lossCount: number): number {
  return Math.max(0.35, 1 - lossCount * 0.08);
}

/** Ids of lines that can be lost, in content order (feeds the loss system). */
export function losableIds(lines: readonly PintuLine[]): string[] {
  return lines.filter((l) => l.losable).map((l) => l.id);
}

// ---- tiny state machine for his body language ----

export type PintuState = 'idle' | 'talking' | 'panicking' | 'apologizing';

export class PintuBrain {
  state: PintuState = 'idle';
  private remainingMs = 0;

  /** Start speaking; returns how long the line holds on screen. */
  say(line: PintuLine, lossCount: number): number {
    this.state =
      line.mood === 'apologetic' ? 'apologizing' : line.mood === 'scared' ? 'panicking' : 'talking';
    const chars = degrade(line.text, lossCount).length;
    this.remainingMs = Math.max(1800, (chars * 55) / speechRate(lossCount) + 1400);
    return this.remainingMs;
  }

  panic(durationMs = 1500): void {
    this.state = 'panicking';
    this.remainingMs = durationMs;
  }

  update(dtMs: number): PintuState {
    if (this.state !== 'idle') {
      this.remainingMs -= dtMs;
      if (this.remainingMs <= 0) this.state = 'idle';
    }
    return this.state;
  }

  get busy(): boolean {
    return this.state !== 'idle';
  }
}
