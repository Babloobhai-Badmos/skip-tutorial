import { describe, expect, it, vi } from 'vitest';
import { EventBus, type EventMap } from '../src/core/events';
import {
  BACKUP_KEY,
  createDefaultState,
  GameStore,
  MAX_DEATH_LOG,
  SAVE_KEY,
  SCHEMA_VERSION,
} from '../src/core/gameState';
import { migrateSave } from '../src/core/saveMigration';
import { createMemoryStorage, type StorageLike } from '../src/core/storage';

const T0 = 1_700_000_000_000;

function makeStore(storage: StorageLike = createMemoryStorage(), now = () => T0) {
  const bus = new EventBus<EventMap>();
  return { store: new GameStore({ storage, now, events: bus }), storage, bus };
}

describe('GameStore', () => {
  it('starts fresh with spec defaults', () => {
    const { store } = makeStore();
    const s = store.state;
    expect(store.loadOutcome).toBe('fresh');
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.percentage).toBe(100);
    expect(s.horrorLevel).toBe(0);
    expect(s.deathCount).toBe(0);
    expect(s.firstLaunch).toBe(T0);
    expect(s.settings.micOptIn).toBe(false);
    expect(s.settings.camOptIn).toBe(false);
    expect(s.settings.subtitles).toBe(true);
  });

  it('persists updates and reloads them', () => {
    const { store, storage } = makeStore();
    store.update('test', (d) => {
      d.deathCount = 3;
      d.flags.calledPintuCount = 2;
      d.pintuLoss.push({ item: 'nameTag', cause: 'skip', timestamp: T0 });
    });
    const reloaded = new GameStore({ storage, now: () => T0 + 1, events: new EventBus() });
    expect(reloaded.loadOutcome).toBe('loaded');
    expect(reloaded.state.deathCount).toBe(3);
    expect(reloaded.state.flags.calledPintuCount).toBe(2);
    expect(reloaded.state.pintuLoss).toHaveLength(1);
    expect(reloaded.state.firstLaunch).toBe(T0);
  });

  it('emits state:changed and settings:changed only when settings change', () => {
    const { store, bus } = makeStore();
    const changed = vi.fn();
    const settings = vi.fn();
    bus.on('state:changed', changed);
    bus.on('settings:changed', settings);
    store.update('deaths', (d) => void (d.deathCount += 1));
    expect(changed).toHaveBeenCalledWith({ reason: 'deaths' });
    expect(settings).not.toHaveBeenCalled();
    store.update('flash', (d) => void (d.settings.reduceFlashing = true));
    expect(settings).toHaveBeenCalledTimes(1);
  });

  it('refuses to let ordinary updates touch horrorLevel', () => {
    const { store } = makeStore();
    expect(() =>
      store.update('sneaky', (d) => {
        (d as unknown as { horrorLevel: number }).horrorLevel = 5;
      }),
    ).toThrow(/HorrorDirector/);
    expect(store.state.horrorLevel).toBe(0);
    store.setHorrorLevel(2, 'test');
    expect(store.state.horrorLevel).toBe(2);
  });

  it('does not mutate state if the mutator throws', () => {
    const { store } = makeStore();
    expect(() =>
      store.update('boom', (d) => {
        d.deathCount = 99;
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(store.state.deathCount).toBe(0);
  });

  it('caps the death log', () => {
    const { store } = makeStore();
    store.update('many', (d) => {
      for (let i = 1; i <= MAX_DEATH_LOG + 5; i++) {
        d.deathLog.push({ id: i, x: 0, y: 0, scene: 'x', cause: 'y', timestamp: T0 });
      }
      d.deathCount = MAX_DEATH_LOG + 5;
    });
    expect(store.state.deathLog).toHaveLength(MAX_DEATH_LOG);
    expect(store.state.deathLog[0]?.id).toBe(6);
    expect(store.state.deathCount).toBe(MAX_DEATH_LOG + 5);
  });

  it('batches playtime saves', () => {
    const storage = createMemoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    const { store } = makeStore(storage);
    setItem.mockClear();
    store.addPlaytime(4000);
    store.addPlaytime(4000);
    expect(setItem).not.toHaveBeenCalled();
    store.addPlaytime(4000);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(store.state.timePlayedMs).toBe(12_000);
  });

  it('reset keeps safety settings by default', () => {
    const { store } = makeStore();
    store.update('x', (d) => {
      d.deathCount = 7;
      d.settings.reduceJumpscares = true;
      d.flags.seenContentNotice = true;
    });
    store.reset();
    expect(store.state.deathCount).toBe(0);
    expect(store.state.settings.reduceJumpscares).toBe(true);
    expect(store.state.flags.seenContentNotice).toBe(true);
    store.reset({ keepSettings: false });
    expect(store.state.settings.reduceJumpscares).toBe(false);
  });

  it('recovers from corrupt JSON and backs it up', () => {
    const storage = createMemoryStorage({ [SAVE_KEY]: '{not json' });
    const { store } = makeStore(storage);
    expect(store.loadOutcome).toBe('corrupt');
    expect(store.state.deathCount).toBe(0);
    expect(storage.getItem(BACKUP_KEY)).toBe('{not json');
  });

  it('does not overwrite a save from a newer game version without a backup', () => {
    const future = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, deathCount: 50 });
    const storage = createMemoryStorage({ [SAVE_KEY]: future });
    const { store } = makeStore(storage);
    expect(store.loadOutcome).toBe('future-version');
    expect(storage.getItem(BACKUP_KEY)).toBe(future);
  });

  it('keeps running when storage throws', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { store } = makeStore(broken);
    store.update('x', (d) => void (d.deathCount = 1));
    expect(store.state.deathCount).toBe(1);
    warn.mockRestore();
  });
});

describe('migrateSave', () => {
  it('migrates a v0 (pre-versioned) save', () => {
    const v0 = { deaths: 4, settings: { reduceFlashing: true }, flags: { calledPintuCount: 2 } };
    const result = migrateSave(v0, T0);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.migrated).toBe(true);
    expect(result.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.state.deathCount).toBe(4);
    expect(result.state.settings.reduceFlashing).toBe(true);
    expect(result.state.settings.micOptIn).toBe(false);
    expect(result.state.flags.calledPintuCount).toBe(2);
    expect(result.state.percentage).toBe(100);
  });

  it('marks a current save as not migrated and round-trips it', () => {
    const state = createDefaultState(T0);
    const result = migrateSave(JSON.parse(JSON.stringify(state)), T0);
    expect(result).toEqual({ kind: 'ok', state, migrated: false });
  });

  it('clamps and cleans hand-edited garbage', () => {
    const result = migrateSave(
      {
        schemaVersion: 1,
        percentage: 900,
        horrorLevel: 42,
        deathCount: -3,
        pintuLoss: [{ item: 'soul', cause: 'x' }, { item: 'leftLeg' }, 'nope'],
        settings: { micOptIn: 'yes', mutedSfxCategories: ['stings', 'nonsense', 'stings'] },
        deathLog: [{ x: 10, y: 20 }],
      },
      T0,
    );
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    const s = result.state;
    expect(s.percentage).toBe(100);
    expect(s.horrorLevel).toBe(5);
    expect(s.pintuLoss.map((l) => l.item)).toEqual(['leftLeg']);
    expect(s.settings.micOptIn).toBe(false);
    expect(s.settings.mutedSfxCategories).toEqual(['stings']);
    // deathCount can never be lower than the number of logged deaths.
    expect(s.deathCount).toBe(1);
    expect(s.deathLog[0]).toMatchObject({ id: 1, x: 10, y: 20, scene: 'unknown' });
  });

  it('rejects non-object saves', () => {
    expect(migrateSave(null, T0).kind).toBe('invalid');
    expect(migrateSave([1, 2], T0).kind).toBe('invalid');
    expect(migrateSave({ schemaVersion: -1 }, T0).kind).toBe('invalid');
  });
});
