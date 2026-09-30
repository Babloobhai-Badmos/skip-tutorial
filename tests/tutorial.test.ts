import { describe, expect, it } from 'vitest';
import tipsContent from '../src/content/tips.json';
import { createRng } from '../src/core/rng';
import { fakeTimestamp, pickTip } from '../src/core/tips';
import {
  ConfidentWalk,
  formatClock,
  STOP_GRACE_MS,
  STOP_PENALTY_MS,
  WALK_REQUIRED_MS,
} from '../src/tutorial/confidentWalk';
import { SAFE_ROOM_RECOVERY_MS, SafeRoomTimer } from '../src/tutorial/safeRoom';

const WALK = { onTreadmill: true, walking: true, grounded: true };
const STILL = { onTreadmill: true, walking: false, grounded: true };

describe('ConfidentWalk', () => {
  it('only counts on the treadmill, walking, grounded', () => {
    const w = new ConfidentWalk();
    w.update(1000, { ...WALK, onTreadmill: false });
    w.update(1000, { ...WALK, grounded: false });
    expect(w.progressMs).toBe(0);
    expect(w.update(1000, WALK)).toEqual([{ type: 'started' }]);
    expect(w.progressMs).toBe(1000);
  });

  it('penalises stopping after a grace period', () => {
    const w = new ConfidentWalk(20_000);
    w.update(100, WALK);
    expect(w.update(STOP_GRACE_MS - 1, STILL)).toEqual([]);
    const ev = w.update(1, STILL);
    expect(ev).toEqual([{ type: 'stopped', penaltyMs: STOP_PENALTY_MS }]);
    expect(w.progressMs).toBe(20_100 - STOP_PENALTY_MS);
  });

  it('penalty never goes below zero', () => {
    const w = new ConfidentWalk();
    w.update(3000, WALK);
    w.update(STOP_GRACE_MS, STILL);
    expect(w.progressMs).toBe(0);
  });

  it('emits milestones every 30s and done at 3:00', () => {
    const w = new ConfidentWalk();
    const events = [];
    for (let t = 0; t < WALK_REQUIRED_MS + 1000; t += 500) events.push(...w.update(500, WALK));
    expect(events.filter((e) => e.type === 'milestone').map((e) => 'atMs' in e && e.atMs)).toEqual([
      30_000, 60_000, 90_000, 120_000, 150_000,
    ]);
    expect(events.at(-1)).toEqual({ type: 'done' });
    expect(w.done).toBe(true);
    expect(w.update(500, STILL)).toEqual([]);
  });

  it('dev speed multiplier', () => {
    const w = new ConfidentWalk(0, 20);
    w.update(1000, WALK);
    expect(w.progressMs).toBe(20_000);
  });

  it('resumes from saved progress', () => {
    expect(new ConfidentWalk(WALK_REQUIRED_MS).done).toBe(true);
    expect(new ConfidentWalk(999_999).progressMs).toBe(WALK_REQUIRED_MS);
  });

  it('formats a clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_400)).toBe('1:05');
    expect(formatClock(WALK_REQUIRED_MS)).toBe('3:00');
  });
});

describe('SafeRoomTimer', () => {
  it('rewards once per visit after staying', () => {
    const t = new SafeRoomTimer();
    expect(t.update(SAFE_ROOM_RECOVERY_MS - 1)).toBe(false);
    expect(t.update(1)).toBe(true);
    expect(t.update(100_000)).toBe(false);
  });
});

describe('tips', () => {
  it('picks deterministically and avoids recent tips', () => {
    const tips = tipsContent.tips;
    const a = pickTip(tips, createRng(4), ['t_forward']);
    expect(a).toEqual(pickTip(tips, createRng(4), ['t_forward']));
    const recent = tips.slice(0, -1).map((t) => t.id);
    expect(pickTip(tips, createRng(4), recent).id).toBe(tips.at(-1)?.id);
  });

  it('fake timestamps look like chat times', () => {
    expect(fakeTimestamp(createRng(2))).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
  });
});
