/**
 * Twist #2: the tutorial is the safest room. Staying continuously for a while
 * quietly gives Pintu back one voice line - once per visit, never announced.
 */
export const SAFE_ROOM_RECOVERY_MS = 60_000;

export class SafeRoomTimer {
  private stayedMs = 0;
  private rewarded = false;

  constructor(private readonly speed = 1) {}

  /** Returns true exactly once per visit, when the reward is due. */
  update(dtMs: number): boolean {
    if (this.rewarded) return false;
    this.stayedMs += dtMs * this.speed;
    if (this.stayedMs >= SAFE_ROOM_RECOVERY_MS) {
      this.rewarded = true;
      return true;
    }
    return false;
  }

  get elapsedMs(): number {
    return this.stayedMs;
  }
}
