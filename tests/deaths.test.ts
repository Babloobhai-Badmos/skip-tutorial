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
import { reportFields, timeDrift } from '../src/deathScenes/d10_postmortem';
import { acceptControls } from '../src/deathScenes/d03_buffet';
import { groupMembers } from '../src/deathScenes/d04_groupChat';
import { audienceVoices } from '../src/deathScenes/d06_laughTrack';
import { rightTheories } from '../src/deathScenes/d11_freddy';
import { HANGUP_PAUSE_DELAY_MS } from '../src/deathScenes/d12_landline';

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
    expect(seen).toEqual(
      new Set(['d01_kyaSeKya', 'd06_laughTrack', 'd07_blueTicks', 'd09_gadbad', 'd10_postmortem']),
    );
  });

  it('avoids an immediate repeat', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(
        pickDeathScene(DEATH_SCENES, state(3), 'bangles', createRng(seed), 'd07_blueTicks').id,
      ).not.toBe('d07_blueTicks');
    }
  });

  it('unlocks general deaths gradually', () => {
    const ids = (n: number) =>
      new Set(
        Array.from(
          { length: 30 },
          (_, seed) => pickDeathScene(DEATH_SCENES, state(n), 'bangles', createRng(seed)).id,
        ),
      );
    expect(ids(1)).toEqual(new Set(['d01_kyaSeKya']));
    expect(ids(2)).toEqual(new Set(['d01_kyaSeKya', 'd07_blueTicks', 'd10_postmortem']));
  });

  it('more general deaths unlock as you keep dying', () => {
    const ids = new Set(
      Array.from(
        { length: 80 },
        (_, seed) => pickDeathScene(DEATH_SCENES, state(6), 'bangles', createRng(seed)).id,
      ),
    );
    for (const id of ['d04_groupChat', 'd05_phoneAFriend', 'd06_laughTrack', 'd11_freddy']) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('level-specific causes', () => {
    const at = (cause: string) => pickDeathScene(DEATH_SCENES, state(1), cause, createRng(1)).id;
    expect(at('buffet')).toBe('d03_buffet');
    expect(at('sanskaar')).toBe('d03_buffet');
    expect(at('landline')).toBe('d12_landline');
  });

  it('door deaths belong to Daya', () => {
    expect(pickDeathScene(DEATH_SCENES, state(1), 'door', createRng(1)).id).toBe('d08_darwazaTodo');
  });

  it('is deterministic per seed', () => {
    const a = pickDeathScene(DEATH_SCENES, state(4), 'x', createRng(77));
    expect(pickDeathScene(DEATH_SCENES, state(4), 'x', createRng(77)).id).toBe(a.id);
  });
});

describe('break gating', () => {
  it('breaks need the horror level', () => {
    const byId = (id: string) => DEATH_SCENES.find((d) => d.id === id)!;
    expect(shouldRunBreak(byId('d01_kyaSeKya'), 0)).toBe(false);
    expect(shouldRunBreak(byId('d01_kyaSeKya'), 1)).toBe(true);
    expect(shouldRunBreak(byId('d07_blueTicks'), 1)).toBe(true);
    expect(shouldRunBreak(byId('d02_rasode'), 1)).toBe(false);
    expect(shouldRunBreak(byId('d02_rasode'), 2)).toBe(true);
    // Freddy's theories only start being right later.
    expect(shouldRunBreak(byId('d11_freddy'), 2)).toBe(false);
    expect(shouldRunBreak(byId('d11_freddy'), 3)).toBe(true);
  });

  it('all twelve deaths from the catalog are registered', () => {
    expect(DEATH_SCENES.map((d) => d.id.slice(0, 3)).sort()).toEqual([
      'd01',
      'd02',
      'd03',
      'd04',
      'd05',
      'd06',
      'd07',
      'd08',
      'd09',
      'd10',
      'd11',
      'd12',
    ]);
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

describe('D10 postmortem', () => {
  const death = { id: 3, x: 1551, y: 612, scene: 'Level1Hall', cause: 'bangles', timestamp: 0 };
  it('has precise nonsense, including the real spot', () => {
    const f = Object.fromEntries(reportFields(death));
    expect(f['Ungli ka naap']).toBe('4 number');
    expect(f['Maut ka kaaran']).toBe('Bahut zyada maut');
    expect(f['Jagah']).toBe('x1551');
    expect(f['Maut ka samay']).toBe('kal hui');
  });
  it('time of death drifts from past to future', () => {
    expect(timeDrift()).toEqual(['kal hui', 'aaj hui', 'abhi hui', 'abhi hogi']);
    expect(timeDrift()[0]).toBe(Object.fromEntries(reportFields(death))['Maut ka samay']);
  });
});

describe('M5 deaths', () => {
  it('D03: every control says Accept', () => {
    const c = acceptControls();
    expect(c.length).toBeGreaterThanOrEqual(5);
    expect(new Set(c.map((k) => k.label))).toEqual(new Set(['Accept']));
    // Pause is never relabelled.
    expect(c.some((k) => k.key === 'Esc')).toBe(false);
  });

  it('D04: the group is everyone before you, then you', () => {
    const m = groupMembers(createRng(3), 'Aap');
    expect(m.at(-1)).toBe('Aap');
    expect(m.length).toBe(7);
    expect(groupMembers(createRng(3), 'Aap')).toEqual(m);
  });

  it('D06: the audience is your earlier deaths, not this one', () => {
    const log = [1, 2, 3, 4].map((id) => ({
      id,
      x: id * 100,
      y: 0,
      scene: 'L',
      cause: 'fall',
      timestamp: 0,
    }));
    const v = audienceVoices(log);
    expect(v.map((x) => x.index)).toEqual([0, 1, 2]);
    expect(v[0]?.label).toContain('#1');
    expect(v.some((x) => x.label.includes('#4'))).toBe(false);
    expect(audienceVoices(log.slice(0, 1))).toEqual([]);
  });

  it('D11: Freddy is finally right', () => {
    const t = rightTheories({
      x: 712,
      spotDeaths: 3,
      deathCount: 9,
      calledPintu: 2,
      skips: 1,
      doorsKicked: 4,
      minutes: 5,
    });
    expect(t.join(' ')).toContain('9 baar');
    expect(t.join(' ')).toContain('x712');
    expect(t.join(' ')).not.toMatch(/\{\w+\}/);
  });

  it('D11: never pins a zero', () => {
    const t = rightTheories({
      x: 5,
      spotDeaths: 1,
      deathCount: 3,
      calledPintu: 0,
      skips: 0,
      doorsKicked: 0,
      minutes: 1,
    });
    expect(t.join(' ')).not.toMatch(/\b0 (baar|darwaze)/);
    expect(t).toHaveLength(4);
  });

  it('D12: pausing hangs up but only delays the menu', () => {
    expect(HANGUP_PAUSE_DELAY_MS).toBeGreaterThan(0);
    expect(HANGUP_PAUSE_DELAY_MS).toBeLessThanOrEqual(2000);
  });
});
