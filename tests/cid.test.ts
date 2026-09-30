import { describe, expect, it, vi } from 'vitest';
import { caseTitle, fileCase, nextCaseNumber } from '../src/cid/caseFiles';
import { buildInvestigation, factsFor, nearestObject, TRUTH_LEVEL } from '../src/cid/engine';
import { fill } from '../src/cid/format';
import { addGadbad } from '../src/cid/gadbadCounter';
import { logicInvestigation } from '../src/cid/logicModule';
import { truthInvestigation } from '../src/cid/truthModule';
import type { InvestigationInput } from '../src/cid/types';
import { recordDeath } from '../src/core/deaths';
import { EventBus, events } from '../src/core/events';
import { GameStore } from '../src/core/gameState';
import { createRng } from '../src/core/rng';
import { createMemoryStorage } from '../src/core/storage';

const death = { id: 9, x: 712, y: 700, scene: 'Level1Hall', cause: 'fall', timestamp: 0 };
const input = (horrorLevel: number): InvestigationInput => ({
  death,
  nearestObject: 'pressure cooker',
  caseNumber: 9,
  horrorLevel,
  facts: {
    x: 712,
    spotDeaths: 4,
    deathCount: 9,
    calledPintu: 3,
    skips: 2,
    doorsKicked: 5,
    minutes: 17,
  },
});
const makeStore = () =>
  new GameStore({ storage: createMemoryStorage(), now: () => 1, events: new EventBus() });

describe('LogicModule', () => {
  it('is deterministic for a seed', () => {
    expect(logicInvestigation(input(0), createRng(5))).toEqual(
      logicInvestigation(input(0), createRng(5)),
    );
  });

  it('varies across seeds', () => {
    const names = new Set<string>();
    for (let s = 0; s < 30; s++)
      names.add(JSON.stringify(logicInvestigation(input(0), createRng(s)).lines));
    expect(names.size).toBeGreaterThan(5);
  });

  it('blames the nearest inanimate object and never the player', () => {
    for (let s = 0; s < 30; s++) {
      const inv = logicInvestigation(input(0), createRng(s));
      expect(inv.suspect).toEqual({ label: 'pressure cooker', isPlayer: false });
      expect(inv.lines.find((l) => l.kind === 'accuse')?.text).toContain('pressure cooker');
      // Comedy never knows real facts.
      const all = inv.lines.map((l) => l.text).join(' ');
      expect(all).not.toContain('712');
    }
  });

  it('confesses within 10 seconds of "sach bol do"', () => {
    for (let s = 0; s < 50; s++) {
      const ms = logicInvestigation(input(0), createRng(s)).confessionPauseMs;
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThan(10_000);
    }
  });
});

describe('TruthModule', () => {
  it('is accurate about real history', () => {
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) {
      const inv = truthInvestigation(input(3), createRng(s));
      expect(inv.suspect.isPlayer).toBe(true);
      seen.add(inv.lines.map((l) => l.text).join(' '));
    }
    const all = [...seen].join(' ');
    for (const fact of ['712', '4 baar', '9 baar', '3 baar', '2 baar', '5 darwaze', '17 minute']) {
      expect(all, fact).toContain(fact);
    }
  });

  it('never breaks the format: same speakers, same kinds, same order', () => {
    for (let s = 0; s < 20; s++) {
      const logic = logicInvestigation(input(0), createRng(s));
      const truth = truthInvestigation(input(3), createRng(s));
      expect(truth.lines.map((l) => [l.speaker, l.kind])).toEqual(
        logic.lines.map((l) => [l.speaker, l.kind]),
      );
      expect(Object.keys(truth).sort()).toEqual(Object.keys(logic).sort());
    }
  });

  it('mirrors the joke: "kyunki woh chup hai" becomes "kyunki aap chup ho"', () => {
    const t = truthInvestigation(input(3), createRng(1));
    expect(t.lines.find((l) => l.kind === 'because')?.text).toBe('Kyunki aap chup ho.');
    expect(t.lines.find((l) => l.kind === 'accuse')?.text).toBe('Yeh... aap hi ho.');
  });

  it('never cites a zero ("0 baar skip dabaya" is true but not scary)', () => {
    const zeros = {
      ...input(3),
      facts: { ...input(3).facts, calledPintu: 0, skips: 0, doorsKicked: 0, minutes: 0 },
    };
    for (let s = 0; s < 60; s++) {
      const text = truthInvestigation(zeros, createRng(s))
        .lines.map((l) => l.text)
        .join(' ');
      expect(text).not.toMatch(/\b0 (baar|darwaze|minute)/);
    }
  });

  it('lines start with a capital letter', () => {
    for (const level of [0, 3]) {
      for (let s = 0; s < 20; s++) {
        for (const l of buildInvestigation(input(level), createRng(s)).lines) {
          expect(l.text[0], l.text).toBe(l.text[0]!.toUpperCase());
        }
      }
    }
  });
});

describe('engine', () => {
  it('switches to truth at level 3, adds an unasked confession at 4', () => {
    expect(buildInvestigation(input(2), createRng(1)).mode).toBe('logic');
    expect(buildInvestigation(input(TRUTH_LEVEL), createRng(1)).mode).toBe('truth');
    expect(buildInvestigation(input(3), createRng(1)).lines.some((l) => l.kind === 'unasked')).toBe(
      false,
    );
    const l4 = buildInvestigation(input(4), createRng(1)).lines.at(-1);
    expect(l4).toEqual({ speaker: 'unasked', kind: 'unasked', text: 'Sach bol diya.' });
  });

  it('never leaves a {placeholder} unfilled', () => {
    for (const level of [0, 3, 4]) {
      for (let s = 0; s < 40; s++) {
        const inv = buildInvestigation(input(level), createRng(s));
        const text = [inv.caseName, inv.recap, ...inv.lines.map((l) => l.text)].join(' ');
        expect(text).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('finds the nearest object', () => {
    const objs = [
      { label: 'gaddha', x: 765 },
      { label: 'cooker', x: 1150 },
    ];
    expect(nearestObject(objs, 700)).toBe('gaddha');
    expect(nearestObject(objs, 1000)).toBe('cooker');
    expect(nearestObject([], 5)).toBe('farsh');
  });

  it('gathers facts from state', () => {
    const store = makeStore();
    recordDeath(store, { x: 700, y: 0, scene: 'Level1Hall', cause: 'fall' });
    recordDeath(store, { x: 740, y: 0, scene: 'Level1Hall', cause: 'fall' });
    recordDeath(store, { x: 1500, y: 0, scene: 'Level1Hall', cause: 'bangles' });
    const last = recordDeath(store, { x: 720, y: 0, scene: 'Level1Hall', cause: 'fall' });
    store.update('t', (d) => {
      d.flags.calledPintuCount = 2;
      d.flags.doorsKicked = 1;
      d.timePlayedMs = 5 * 60_000 + 10;
    });
    expect(factsFor(store.state, last)).toEqual({
      x: 720,
      spotDeaths: 3,
      deathCount: 4,
      calledPintu: 2,
      skips: 0,
      doorsKicked: 1,
      minutes: 5,
    });
  });

  it('fill leaves unknown keys visible', () => {
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('case files', () => {
  it('numbers cases, files confessions, titles them', () => {
    const store = makeStore();
    expect(nextCaseNumber(store.state)).toBe(1);
    const inv = buildInvestigation({ ...input(4), caseNumber: 1 }, createRng(2));
    const file = fileCase(store, inv, 50);
    expect(file.number).toBe(1);
    expect(nextCaseNumber(store.state)).toBe(2);
    expect(caseTitle(file)).toBe(`Case #1: ${inv.caseName}`);
    // The real confession + the unasked one.
    expect(store.state.confessions).toHaveLength(2);
    expect(store.state.confessions[1]?.text).toBe('Sach bol diya.');
  });
});

describe('gadbad counter', () => {
  it('counts and announces', () => {
    const store = makeStore();
    const fn = vi.fn();
    const off = events.on('gadbad:changed', fn);
    addGadbad(store);
    addGadbad(store, 3, 'd09');
    off();
    expect(store.state.gadbadCount).toBe(4);
    expect(fn).toHaveBeenLastCalledWith({ count: 4 });
  });
});
