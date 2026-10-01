import { describe, expect, it } from 'vitest';
import {
  computeHorrorLevel,
  horrorScore,
  inputFromState,
  updateHorrorLevel,
  type DirectorInput,
} from '../src/core/horrorDirector';
import { EventBus } from '../src/core/events';
import { GameStore } from '../src/core/gameState';
import { createMemoryStorage } from '../src/core/storage';

const base: DirectorInput = {
  deathCount: 0,
  lossCount: 0,
  skipCount: 0,
  calledPintuCount: 0,
  aurDikhaoClicks: 0,
  minutesPlayed: 0,
  current: 0,
  calmPhase: false,
  revealed: false,
};
const lvl = (over: Partial<DirectorInput>) => computeHorrorLevel({ ...base, ...over });

describe('HorrorDirector', () => {
  it('fixed-input table', () => {
    const table: [Partial<DirectorInput>, number][] = [
      [{}, 0],
      [{ deathCount: 1 }, 0],
      [{ deathCount: 3 }, 0],
      [{ deathCount: 4 }, 1],
      [{ deathCount: 5 }, 1],
      [{ deathCount: 6 }, 2],
      [{ deathCount: 9 }, 2], // score 9 < 10
      [{ deathCount: 10 }, 3],
      [{ deathCount: 12 }, 3],
      [{ deathCount: 15 }, 4],
      [{ deathCount: 100 }, 4], // never reaches 5 by itself
      // Each death also costs Pintu at a checkpoint: losses speed things up,
      // but the first three deaths stay pure comedy.
      [{ deathCount: 3, lossCount: 3 }, 0],
      [{ deathCount: 4, lossCount: 4 }, 1],
      [{ deathCount: 6, lossCount: 6 }, 2],
      [{ deathCount: 9, lossCount: 9 }, 3],
      [{ deathCount: 13, lossCount: 13 }, 4],
      // Skipper: losses + skips speed it up, but deaths still gate each level.
      [{ deathCount: 4, lossCount: 4, skipCount: 4 }, 1],
      [{ deathCount: 6, lossCount: 4, skipCount: 4 }, 2],
      [{ deathCount: 9, lossCount: 8, skipCount: 8 }, 3],
      // Lots of play time alone doesn't scare anyone.
      [{ minutesPlayed: 1000 }, 0],
    ];

    for (const [input, expected] of table) {
      expect(lvl(input), JSON.stringify(input)).toBe(expected);
    }
  });

  it('"Aur dikhao" weighs the most (complicity)', () => {
    const one = (k: keyof DirectorInput) => horrorScore({ ...base, [k]: 1 });
    for (const k of ['deathCount', 'lossCount', 'skipCount', 'calledPintuCount'] as const) {
      expect(one('aurDikhaoClicks')).toBeGreaterThan(one(k));
    }
  });

  it('first three deaths are always pure comedy', () => {
    const maxed = { lossCount: 20, skipCount: 20, aurDikhaoClicks: 20, calledPintuCount: 20 };
    for (const deathCount of [0, 1, 2]) expect(lvl({ ...maxed, deathCount })).toBe(0);
  });

  it('never drops', () => {
    expect(lvl({ deathCount: 0, current: 3 })).toBe(3);
    expect(lvl({ deathCount: 7, current: 4 })).toBe(4);
  });

  it('calm phase is the one exception; reveal is explicit', () => {
    expect(lvl({ deathCount: 20, current: 4, calmPhase: true })).toBe(0);
    expect(lvl({ revealed: true })).toBe(5);
    expect(lvl({ deathCount: 20, current: 5 })).toBe(4);
  });

  it('score is monotonic in every input', () => {
    const keys = [
      'deathCount',
      'lossCount',
      'skipCount',
      'calledPintuCount',
      'aurDikhaoClicks',
      'minutesPlayed',
    ] as const;
    for (const k of keys) {
      expect(horrorScore({ ...base, [k]: 5 })).toBeGreaterThan(horrorScore(base));
    }
  });

  it('reduceJumpscares does not change the level (only stings are capped)', async () => {
    const store = new GameStore({ storage: createMemoryStorage(), events: new EventBus() });
    store.update('t', (d) => void (d.deathCount = 6));
    const a = computeHorrorLevel(inputFromState(store.state));
    store.update('t', (d) => void (d.settings.reduceJumpscares = true));
    expect(computeHorrorLevel(inputFromState(store.state))).toBe(a);
    expect(updateHorrorLevel(store)).toBe(2);
    expect(store.state.horrorLevel).toBe(2);
  });
});
