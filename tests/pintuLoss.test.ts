import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { GameStore } from '../src/core/gameState';
import {
  applyLoss,
  hasLost,
  LOSS_SEQUENCE,
  lostVoiceLines,
  nextLoss,
  recoverVoiceLine,
} from '../src/core/pintuLoss';
import { createMemoryStorage } from '../src/core/storage';

const makeStore = () =>
  new GameStore({ storage: createMemoryStorage(), now: () => 1, events: new EventBus() });

describe('pintu loss', () => {
  it('takes things in order, name tag first', () => {
    const store = makeStore();
    const taken = LOSS_SEQUENCE.map(() => applyLoss(store, 'test', [], 5));
    expect(taken).toEqual(LOSS_SEQUENCE);
    expect(store.state.pintuLoss[0]).toEqual({ item: 'nameTag', cause: 'test', timestamp: 5 });
    expect(hasLost(store.state.pintuLoss, 'rightLeg')).toBe(true);
  });

  it('continues into extra voice lines, then runs out', () => {
    const store = makeStore();
    LOSS_SEQUENCE.forEach(() => applyLoss(store, 't'));
    expect(applyLoss(store, 't', ['idle_4'])).toEqual({ item: 'voiceLine', detail: 'idle_4' });
    expect(applyLoss(store, 't', ['idle_4'])).toBeNull();
    expect(nextLoss(store.state.pintuLoss, ['idle_4'])).toBeNull();
  });

  it('recovers only the most recent voice line, never limbs', () => {
    const store = makeStore();
    for (let i = 0; i < 6; i++) applyLoss(store, 't'); // up to leftLeg
    expect(lostVoiceLines(store.state.pintuLoss)).toEqual(
      new Set(['greet_hello', 'walk_praise', 'jump_speed']),
    );
    expect(recoverVoiceLine(store)).toBe('jump_speed');
    expect(hasLost(store.state.pintuLoss, 'leftLeg')).toBe(true);
    expect(hasLost(store.state.pintuLoss, 'voiceLine', 'jump_speed')).toBe(false);
    // The recovered line is the next thing to go again.
    expect(nextLoss(store.state.pintuLoss)).toEqual({ item: 'voiceLine', detail: 'jump_speed' });
  });

  it('recovering with nothing lost is a no-op', () => {
    const store = makeStore();
    applyLoss(store, 't'); // name tag only
    expect(recoverVoiceLine(store)).toBeNull();
    expect(store.state.pintuLoss).toHaveLength(1);
  });
});
