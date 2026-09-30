import type { Rng } from './rng';

export interface Tip {
  id: string;
  text: string;
}

/** Picks a loading-screen tip, avoiding the most recent ones when possible. */
export function pickTip(tips: readonly Tip[], rng: Rng, recent: readonly string[] = []): Tip {
  const fresh = tips.filter((t) => !recent.includes(t.id));
  return rng.pick(fresh.length > 0 ? fresh : tips);
}

/** Fake chat timestamp, e.g. "10:42 pm". Stable for a given rng. */
export function fakeTimestamp(rng: Rng): string {
  const h = rng.int(1, 12);
  const m = rng.int(0, 59).toString().padStart(2, '0');
  return `${h}:${m} ${rng.chance(0.5) ? 'am' : 'pm'}`;
}
