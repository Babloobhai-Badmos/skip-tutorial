import { describe, expect, it } from 'vitest';
import {
  corpsesIn,
  markBreakPlayed,
  pickDeathScene,
  recordDeath,
  shouldRunBreak,
} from '../src/core/deaths';
import { EventBus } from '../src/core/events';
import { GameStore } from '../src/core/gameState';
import { createRng } from '../src/core/rng';
import { createMemoryStorage } from '../src/core/storage';
import { chatScript } from '../src/deathScenes/d07_blueTicks';
import { whistleSteps } from '../src/deathScenes/d02_rasode';
import { DEATH_SCENES } from '../src/deathScenes';

const makeStore = () =>
  new GameStore({ storage: createMemoryStorage(), now: () => 1, events: new EventBus() });

describe('recordDeath', () => {
  it('assigns sequential ids and counts', () => {
    const store = makeStore();
    const a = recordDeath(store, { x: 10.4, y: 20, scene: 'Level1Hall', cause: 'fall' }, 100);
    const b = recordDeath(store, { x: 30, y: 40, scene: 'Level1Hall', cause: 'cooker' }, 200);
    expect([a.id, b.id]).toEqual([1, 2]);
    expect(a.x).toBe(10);
    expect(store.state.deathCount).toBe(2);
    expect(store.state.deathLog.map((d) => d.cause)).toEqual(['fall', 'cooker']);
  });

  it('only broken deaths leave a body', () => {
    const store = makeStore();
    const a = recordDeath(store, { x: 1, y: 1, scene: 'Level1Hall', cause: 'fall' });
    recordDeath(store, { x: 2, y: 2, scene: 'Level1Hall', cause: 'fall' });
    markBreakPlayed(store, a.id);
    expect(corpsesIn(store.state, 'Level1Hall').map((d) => d.id)).toEqual([a.id]);
    expect(corpsesIn(store.state, 'Level2Kitchen')).toEqual([]);
  });
});

describe('pickDeathScene', () => {
  const state = (deathCount: number) => ({ ...makeStore().state, deathCount });

  it('cause-specific scenes win', () => {
    expect(pickDeathScene(DEATH_SCENES, state(5), 'fall', createRng(1)).id).toBe('d01_kyaSeKya');
    expect(pickDeathScene(DEATH_SCENES, state(5), 'cooker', createRng(1)).id).toBe('d02_rasode');
  });

  it('unknown causes rotate through unlocked general scenes', () => {
    // D07 unlocks at 2 deaths.
    expect(pickDeathScene(DEATH_SCENES, state(1), 'bangles', createRng(1)).id).toBe('d01_kyaSeKya');
    const seen = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      seen.add(pickDeathScene(DEATH_SCENES, state(3), 'bangles', createRng(seed)).id);
    }
    expect(seen).toEqual(new Set(['d01_kyaSeKya', 'd07_blueTicks']));
  });

  it('avoids an immediate repeat', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(
        pickDeathScene(DEATH_SCENES, state(3), 'bangles', createRng(seed), 'd07_blueTicks').id,
      ).toBe('d01_kyaSeKya');
    }
  });

  it('is deterministic per seed', () => {
    const a = pickDeathScene(DEATH_SCENES, state(4), 'x', createRng(77));
    expect(pickDeathScene(DEATH_SCENES, state(4), 'x', createRng(77)).id).toBe(a.id);
  });
});

describe('break gating', () => {
  it('breaks need the horror level', () => {
    const [d01, d02, d07] = DEATH_SCENES as [
      (typeof DEATH_SCENES)[0],
      (typeof DEATH_SCENES)[0],
      (typeof DEATH_SCENES)[0],
    ];
    expect(shouldRunBreak(d01, 0)).toBe(false);
    expect(shouldRunBreak(d01, 1)).toBe(true);
    expect(shouldRunBreak(d07, 1)).toBe(true);
    expect(shouldRunBreak(d02, 1)).toBe(false);
    expect(shouldRunBreak(d02, 2)).toBe(true);
  });

  it('every scene has a valid level and unique id', () => {
    const ids = DEATH_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of DEATH_SCENES) {
      expect(s.horrorLevelRequired).toBeGreaterThanOrEqual(0);
      expect(s.horrorLevelRequired).toBeLessThanOrEqual(5);
    }
  });
});

describe('D02 whistles', () => {
  it('laugh: three whistles, each louder and higher', () => {
    const s = whistleSteps(false);
    expect(s).toHaveLength(3);
    for (let i = 1; i < s.length; i++) {
      expect(s[i]!.pitch).toBeGreaterThan(s[i - 1]!.pitch);
      expect(s[i]!.volume).toBeGreaterThan(s[i - 1]!.volume);
    }
    expect(s.every((w) => !w.silent)).toBe(true);
  });
  it('break: the same three, then a silent fourth', () => {
    const s = whistleSteps(true);
    expect(s.slice(0, 3)).toEqual(whistleSteps(false));
    expect(s[3]).toMatchObject({ silent: true, volume: 0 });
  });
});

describe('D07 chat', () => {
  const death = {
    id: 4,
    x: 712,
    y: 600,
    scene: 'Level1Hall',
    cause: 'fall',
    timestamp: new Date(2026, 0, 1, 14, 32).getTime(),
  };
  it('laugh: Pintu tips, your 👍 gets read', () => {
    const beats = chatScript(death, false, createRng(1));
    expect(beats.at(-1)?.msg).toMatchObject({ from: 'me', ticks: 'grey' });
    expect(beats.at(-1)?.blueAfter).toBeGreaterThan(0);
    expect(beats.filter((b) => b.msg.from === 'them').length).toBeGreaterThanOrEqual(2);
    expect(beats.some((b) => b.msg.text.includes('☠'))).toBe(false);
  });
  it('break: your death arrives as a message and gets read', () => {
    const last = chatScript(death, true, createRng(1)).at(-1);
    expect(last?.msg.from).toBe('me');
    expect(last?.msg.text).toContain('x712');
    expect(last?.msg.text).toContain('14:32');
    expect(last?.blueAfter).toBeGreaterThan(0);
  });
  it('falls back to default tips for unknown causes', () => {
    const beats = chatScript({ ...death, cause: 'mystery' }, false, createRng(2));
    expect(beats[0]?.msg.text.length).toBeGreaterThan(0);
  });
});
