import { describe, expect, it } from 'vitest';
import content from '../src/content/levels.json';
import {
  furthestCheckpoint,
  loadCheckpoint,
  MARKS_PER_LOAD,
  marksAfterLoad,
} from '../src/core/checkpoints';
import { EventBus } from '../src/core/events';
import { GameStore } from '../src/core/gameState';
import { callLine, callPintu, SILENT_FROM_CALL } from '../src/core/pintuCall';
import { createMemoryStorage } from '../src/core/storage';
import {
  acceptPlate,
  MAX_PLATES,
  outcome,
  refuse,
  returnPlates,
  speedFactor,
  startBuffet,
} from '../src/levels/buffet';
import { BAR_MS, BEAT_MS, beatAt, cookerPhase, hasSafeBeat } from '../src/levels/kitchenRhythm';
import { KITCHEN_COOKERS } from '../src/levels/kitchenLayoutData';

const makeStore = () =>
  new GameStore({ storage: createMemoryStorage(), now: () => 1, events: new EventBus() });

describe('checkpoints (twist #1: saving costs marks)', () => {
  it('each load drops marks, never below zero', () => {
    expect(marksAfterLoad(100)).toBe(100 - MARKS_PER_LOAD);
    expect(marksAfterLoad(3)).toBe(0);
  });

  it('each load quietly costs Pintu something', () => {
    const store = makeStore();
    const a = loadCheckpoint(store);
    const b = loadCheckpoint(store);
    expect(a.percentage).toBe(95);
    expect(b.percentage).toBe(90);
    expect(store.state.pintuLoss.map((l) => l.cause)).toEqual(['checkpoint', 'checkpoint']);
    expect(a.loss?.item).toBe('nameTag');
  });

  it('marks keep dropping after Pintu has nothing left', () => {
    const store = makeStore();
    for (let i = 0; i < 30; i++) loadCheckpoint(store);
    expect(store.state.percentage).toBe(0);
    expect(loadCheckpoint(store).loss).toBeNull();
  });

  it('tracks the furthest checkpoint passed', () => {
    const cps = [100, 900, 1800];
    expect(furthestCheckpoint(cps, 50, 0)).toBe(0);
    expect(furthestCheckpoint(cps, 950, 0)).toBe(1);
    expect(furthestCheckpoint(cps, 2000, 1)).toBe(2);
    // walking back doesn't un-save
    expect(furthestCheckpoint(cps, 120, 2)).toBe(2);
  });
});

describe('Phone a Friend', () => {
  const { calls, breath } = content.lifeline;

  it('gets shorter, then is only a breath from call 5, and is always free', () => {
    expect(callLine(calls, breath, 1, 0)).toEqual({ call: 1, text: calls[0], silent: false });
    expect(callLine(calls, breath, 4, 0).text).toBe('...right.');
    expect(callLine(calls, breath, SILENT_FROM_CALL, 0)).toEqual({
      call: 5,
      text: breath,
      silent: true,
    });
    expect(callLine(calls, breath, 12, 0).silent).toBe(true);
  });

  it('degrades with his losses', () => {
    expect(callLine(calls, breath, 1, 8)).toMatchObject({ text: '(saans)', silent: true });
  });

  it('each call counts and silently costs Pintu', () => {
    const store = makeStore();
    const r1 = callPintu(store, calls, breath);
    expect(r1.call).toBe(1);
    expect(store.state.flags.calledPintuCount).toBe(1);
    expect(store.state.pintuLoss).toHaveLength(1);
    expect(store.state.pintuLoss[0]?.cause).toBe('lifeline');
    for (let i = 0; i < 4; i++) callPintu(store, calls, breath);
    expect(store.state.flags.calledPintuCount).toBe(5);
    expect(store.state.pintuLoss).toHaveLength(5);
  });
});

describe('kitchen rhythm', () => {
  it('beats wrap every bar', () => {
    expect(beatAt(0)).toBe(0);
    expect(beatAt(BEAT_MS * 1.5)).toBe(1);
    expect(beatAt(BAR_MS + 10)).toBe(0);
    expect(beatAt(-10)).toBe(3);
  });

  it('telegraphs one beat before the whistle', () => {
    const p = { beats: [2] };
    expect(cookerPhase(p, 0)).toBe('quiet');
    expect(cookerPhase(p, BEAT_MS * 1 + 5)).toBe('telegraph');
    expect(cookerPhase(p, BEAT_MS * 2 + 5)).toBe('whistle');
    expect(cookerPhase(p, BEAT_MS * 3 + 5)).toBe('quiet');
  });

  it('every kitchen cooker is learnable and passable', () => {
    for (const c of KITCHEN_COOKERS) {
      expect(hasSafeBeat(c.pattern), `cooker at ${c.x}`).toBe(true);
      // Deterministic: same time, same phase.
      expect(cookerPhase(c.pattern, 1234)).toBe(cookerPhase(c.pattern, 1234 + BAR_MS * 7));
    }
  });
});

describe('buffet', () => {
  it('plates slow you down and raise Sanskaar', () => {
    const s = acceptPlate(startBuffet());
    expect(s.plates).toBe(1);
    expect(s.sanskaar).toBeGreaterThan(startBuffet().sanskaar);
    expect(speedFactor(s)).toBeLessThan(1);
  });

  it('too many plates: overfed', () => {
    let s = startBuffet();
    for (let i = 0; i < MAX_PLATES; i++) s = acceptPlate(s);
    expect(outcome(s)).toBe('overfed');
    expect(outcome(returnPlates(s))).toBe('ok');
  });

  it('refusing is rude: disgraced at zero Sanskaar', () => {
    let s = startBuffet();
    for (let i = 0; i < 10; i++) s = refuse(s);
    expect(s.sanskaar).toBe(0);
    expect(outcome(s)).toBe('disgraced');
  });

  it('speed never hits zero', () => {
    let s = startBuffet();
    for (let i = 0; i < 20; i++) s = acceptPlate(s);
    expect(speedFactor(s)).toBeGreaterThan(0);
  });
});
