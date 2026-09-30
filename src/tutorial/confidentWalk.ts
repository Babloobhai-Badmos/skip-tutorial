/**
 * "Confident Walking" (3 minutes, timed). Progress only counts while the player
 * is on the treadmill, grounded and walking into the belt. Stopping costs a
 * penalty - "Confidence mein break nahi hota."
 */
export const WALK_REQUIRED_MS = 180_000;
export const STOP_GRACE_MS = 600;
export const STOP_PENALTY_MS = 10_000;
export const MILESTONE_MS = 30_000;

export interface WalkInput {
  onTreadmill: boolean;
  walking: boolean;
  grounded: boolean;
}

export type WalkEvent =
  | { type: 'started' }
  | { type: 'stopped'; penaltyMs: number }
  | { type: 'milestone'; atMs: number }
  | { type: 'done' };

export class ConfidentWalk {
  progressMs: number;
  done: boolean;
  private walkingNow = false;
  private idleMs = 0;

  constructor(
    initialProgressMs = 0,
    /** Dev-only speed-up (?fast=1). */
    private readonly speed = 1,
  ) {
    this.progressMs = Math.min(initialProgressMs, WALK_REQUIRED_MS);
    this.done = this.progressMs >= WALK_REQUIRED_MS;
  }

  update(dtMs: number, input: WalkInput): WalkEvent[] {
    if (this.done) return [];
    const out: WalkEvent[] = [];
    const counting = input.onTreadmill && input.walking && input.grounded;

    if (counting) {
      if (!this.walkingNow) out.push({ type: 'started' });
      this.walkingNow = true;
      this.idleMs = 0;
      const before = this.progressMs;
      this.progressMs = Math.min(WALK_REQUIRED_MS, this.progressMs + dtMs * this.speed);
      const crossed = Math.floor(this.progressMs / MILESTONE_MS);
      if (crossed > Math.floor(before / MILESTONE_MS) && this.progressMs < WALK_REQUIRED_MS) {
        out.push({ type: 'milestone', atMs: crossed * MILESTONE_MS });
      }
      if (this.progressMs >= WALK_REQUIRED_MS) {
        this.done = true;
        this.walkingNow = false;
        out.push({ type: 'done' });
      }
    } else if (this.walkingNow) {
      this.idleMs += dtMs;
      if (this.idleMs >= STOP_GRACE_MS) {
        this.walkingNow = false;
        this.idleMs = 0;
        const penalty = Math.min(STOP_PENALTY_MS, this.progressMs);
        this.progressMs -= penalty;
        out.push({ type: 'stopped', penaltyMs: penalty });
      }
    }
    return out;
  }

  get walking(): boolean {
    return this.walkingNow;
  }
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
