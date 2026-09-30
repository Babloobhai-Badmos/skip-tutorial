import { normalizeSettings } from '../settings/accessibility';
import {
  createDefaultState,
  defaultFlags,
  PINTU_LOSS_ITEMS,
  SCHEMA_VERSION,
  type CaseFile,
  type Confession,
  type DeathLogEntry,
  type Flags,
  type GameState,
  type HorrorLevel,
  type PintuLossEntry,
} from './stateSchema';

type Raw = Record<string, unknown>;

/**
 * One step per schema bump: MIGRATIONS[n] turns a v(n) save into v(n+1).
 * v0 = the pre-versioned prototype save ({ deaths, settings, ... }).
 * To add v2: bump SCHEMA_VERSION and add MIGRATIONS[1].
 */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  0: (raw) => {
    const { deaths, ...rest } = raw;
    return {
      ...rest,
      deathCount: typeof deaths === 'number' ? deaths : rest.deathCount,
      schemaVersion: 1,
    };
  },
};

export type MigrationResult =
  | { kind: 'ok'; state: GameState; migrated: boolean }
  | { kind: 'future-version'; version: number }
  | { kind: 'invalid' };

export function migrateSave(parsed: unknown, now: number): MigrationResult {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { kind: 'invalid' };
  }
  let raw = parsed as Raw;
  const startVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (!Number.isInteger(startVersion) || startVersion < 0) return { kind: 'invalid' };
  if (startVersion > SCHEMA_VERSION) return { kind: 'future-version', version: startVersion };

  for (let v = startVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { kind: 'invalid' };
    raw = step(raw);
  }
  return { kind: 'ok', state: normalizeState(raw, now), migrated: startVersion !== SCHEMA_VERSION };
}

// ---- normalization: fill gaps with defaults, drop garbage, clamp ranges ----

const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);
const arr = (v: unknown): Raw[] =>
  Array.isArray(v) ? v.filter((x): x is Raw => typeof x === 'object' && x !== null) : [];

function normalizeFlags(v: unknown): Flags {
  const d = defaultFlags();
  const r = (typeof v === 'object' && v !== null ? v : {}) as Raw;
  const count = (x: unknown) => Math.floor(num(x, 0, 0));
  return {
    skippedTutorial: typeof r.skippedTutorial === 'boolean' ? r.skippedTutorial : d.skippedTutorial,
    calledPintuCount: count(r.calledPintuCount),
    aurDikhaoClicks: count(r.aurDikhaoClicks),
    leftRoomCount: count(r.leftRoomCount),
    doorsKicked: count(r.doorsKicked),
    seenContentNotice:
      typeof r.seenContentNotice === 'boolean' ? r.seenContentNotice : d.seenContentNotice,
  };
}

export function normalizeState(raw: Raw, now: number): GameState {
  const d = createDefaultState(now);
  const firstLaunch = num(raw.firstLaunch, d.firstLaunch, 0);

  const deathLog: DeathLogEntry[] = arr(raw.deathLog).map((e, i) => ({
    id: Math.floor(num(e.id, i + 1, 1)),
    x: num(e.x, 0),
    y: num(e.y, 0),
    scene: str(e.scene, 'unknown'),
    cause: str(e.cause, 'unknown'),
    timestamp: num(e.timestamp, now, 0),
  }));

  const pintuLoss: PintuLossEntry[] = arr(raw.pintuLoss)
    .filter((e) => (PINTU_LOSS_ITEMS as readonly unknown[]).includes(e.item))
    .map((e) => ({
      item: e.item as PintuLossEntry['item'],
      ...(typeof e.detail === 'string' ? { detail: e.detail } : {}),
      cause: str(e.cause, 'unknown'),
      timestamp: num(e.timestamp, now, 0),
    }));

  const caseFiles: CaseFile[] = arr(raw.caseFiles).map((e) => ({
    number: Math.floor(num(e.number, 0, 0)),
    name: str(e.name, ''),
    date: num(e.date, now, 0),
    recap: str(e.recap, ''),
  }));

  const confessions: Confession[] = arr(raw.confessions).map((e) => ({
    caseNumber: Math.floor(num(e.caseNumber, 0, 0)),
    speaker: str(e.speaker, ''),
    text: str(e.text, ''),
    timestamp: num(e.timestamp, now, 0),
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    firstLaunch,
    lastPlayed: num(raw.lastPlayed, firstLaunch, 0),
    timePlayedMs: num(raw.timePlayedMs, 0, 0),
    seed: Math.floor(num(raw.seed, d.seed, 0, 0xffffffff)),
    deathCount: Math.max(Math.floor(num(raw.deathCount, 0, 0)), deathLog.length),
    deathLog,
    pintuLoss,
    percentage: num(raw.percentage, 100, 0, 100),
    gadbadCount: Math.floor(num(raw.gadbadCount, 0, 0)),
    caseFiles,
    confessions,
    flags: normalizeFlags(raw.flags),
    settings: normalizeSettings(raw.settings),
    horrorLevel: Math.round(num(raw.horrorLevel, 0, 0, 5)) as HorrorLevel,
  };
}
