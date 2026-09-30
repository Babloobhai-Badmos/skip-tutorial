import { events as globalEvents, type EventBus, type EventMap } from './events';
import { migrateSave } from './saveMigration';
import {
  createDefaultState,
  MAX_DEATH_LOG,
  type GameState,
  type HorrorLevel,
  type MutableGameState,
} from './stateSchema';
import { detectStorage, type StorageLike } from './storage';

export * from './stateSchema';

export const SAVE_KEY = 'skip-tutorial:save';
export const BACKUP_KEY = 'skip-tutorial:save:backup';

export interface GameStoreOptions {
  storage?: StorageLike;
  now?: () => number;
  events?: EventBus<EventMap>;
  /** Save to storage after every update (default true). */
  autosave?: boolean;
}

export type LoadOutcome = 'fresh' | 'loaded' | 'migrated' | 'corrupt' | 'future-version';

const PLAYTIME_SAVE_INTERVAL_MS = 10_000;

export class GameStore {
  private current: GameState;
  private readonly storage: StorageLike;
  private readonly now: () => number;
  private readonly bus: EventBus<EventMap>;
  private readonly autosave: boolean;
  private unsavedPlaytime = 0;
  readonly persistent: boolean;
  readonly loadOutcome: LoadOutcome;

  constructor(opts: GameStoreOptions = {}) {
    const detected = opts.storage ? { storage: opts.storage, persistent: true } : detectStorage();
    this.storage = detected.storage;
    this.persistent = detected.persistent;
    this.now = opts.now ?? Date.now;
    this.bus = opts.events ?? globalEvents;
    this.autosave = opts.autosave ?? true;
    const { state, outcome } = this.load();
    this.current = state;
    this.loadOutcome = outcome;
    if (outcome !== 'loaded') this.save();
  }

  get state(): Readonly<GameState> {
    return this.current;
  }

  /**
   * The only way to change state. `reason` is for debugging / the event bus.
   * horrorLevel is excluded from the draft type and checked at runtime.
   */
  update(reason: string, mutator: (draft: MutableGameState) => void): void {
    const draft = structuredClone(this.current);
    mutator(draft);
    if (draft.horrorLevel !== this.current.horrorLevel) {
      throw new Error('horrorLevel may only be changed by HorrorDirector (setHorrorLevel).');
    }
    if (draft.deathLog.length > MAX_DEATH_LOG) {
      draft.deathLog = draft.deathLog.slice(-MAX_DEATH_LOG);
    }
    this.commit(draft, reason);
  }

  /** Restricted: only src/core/horrorDirector.ts may call this (eslint rule). */
  setHorrorLevel(level: HorrorLevel, reason: string): void {
    if (level === this.current.horrorLevel) return;
    this.commit({ ...this.current, horrorLevel: level }, `horror:${reason}`);
  }

  /** Accumulates play time; persists at most every 10s to avoid thrashing storage. */
  addPlaytime(ms: number): void {
    if (!(ms > 0)) return;
    this.current = { ...this.current, timePlayedMs: this.current.timePlayedMs + ms };
    this.unsavedPlaytime += ms;
    if (this.unsavedPlaytime >= PLAYTIME_SAVE_INTERVAL_MS) this.save();
  }

  save(): void {
    this.unsavedPlaytime = 0;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.current));
    } catch (err) {
      // Quota or blocked storage: the game keeps running from memory.
      console.warn('[gameState] save failed', err);
    }
  }

  /** Wipes progress. Settings survive by default (safety prefs shouldn't reset). */
  reset({ keepSettings = true }: { keepSettings?: boolean } = {}): void {
    const fresh = createDefaultState(this.now());
    if (keepSettings) {
      fresh.settings = structuredClone(this.current.settings);
      fresh.flags.seenContentNotice = this.current.flags.seenContentNotice;
    }
    this.current = fresh;
    this.save();
    this.bus.emit('state:reset');
  }

  private commit(next: GameState, reason: string): void {
    const settingsChanged = JSON.stringify(next.settings) !== JSON.stringify(this.current.settings);
    this.current = { ...next, lastPlayed: this.now() };
    if (this.autosave) this.save();
    this.bus.emit('state:changed', { reason });
    if (settingsChanged) this.bus.emit('settings:changed', { settings: this.current.settings });
  }

  private load(): { state: GameState; outcome: LoadOutcome } {
    const now = this.now();
    let raw: string | null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch {
      raw = null;
    }
    if (raw === null) return { state: createDefaultState(now), outcome: 'fresh' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.backup(raw);
      return { state: createDefaultState(now), outcome: 'corrupt' };
    }

    const result = migrateSave(parsed, now);
    if (result.kind === 'future-version' || result.kind === 'invalid') {
      // Never silently destroy a save we can't read: keep a copy.
      this.backup(raw);
      return {
        state: createDefaultState(now),
        outcome: result.kind === 'invalid' ? 'corrupt' : 'future-version',
      };
    }
    return { state: result.state, outcome: result.migrated ? 'migrated' : 'loaded' };
  }

  private backup(raw: string): void {
    try {
      this.storage.setItem(BACKUP_KEY, raw);
    } catch {
      /* nothing else we can do */
    }
  }
}

let singleton: GameStore | undefined;

/** The game-wide store. Created lazily on first access (in Boot). */
export function getStore(): GameStore {
  singleton ??= new GameStore();
  return singleton;
}
