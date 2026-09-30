import { defaultSettings, type Settings } from '../settings/accessibility';
import { hashString } from './rng';

/**
 * The persisted save shape (spec section 4). Bump SCHEMA_VERSION and add a
 * step in saveMigration.ts whenever this changes shape.
 */
export const SCHEMA_VERSION = 2;
export const MAX_DEATH_LOG = 1000;

export type { Settings };

export type HorrorLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DeathLogEntry {
  /** Sequential death id (1-based). Twist #6 maps these to OTP digits. */
  id: number;
  x: number;
  y: number;
  scene: string;
  cause: string;
  timestamp: number;
  /** The break phase played for this death (its body stays in the level). */
  breakPlayed?: boolean;
}

export const PINTU_LOSS_ITEMS = ['nameTag', 'leftLeg', 'rightLeg', 'uiPanel', 'voiceLine'] as const;
export type PintuLossItem = (typeof PINTU_LOSS_ITEMS)[number];

export interface PintuLossEntry {
  item: PintuLossItem;
  /** e.g. which voice line id was lost. */
  detail?: string;
  cause: string;
  timestamp: number;
}

export interface CaseFile {
  number: number;
  name: string;
  /** Epoch ms. Case #0 is deliberately dated before firstLaunch. */
  date: number;
  recap: string;
}

export interface Confession {
  caseNumber: number;
  speaker: string;
  text: string;
  timestamp: number;
}

export interface Flags {
  skippedTutorial: boolean;
  calledPintuCount: number;
  aurDikhaoClicks: number;
  leftRoomCount: number;
  doorsKicked: number;
  seenContentNotice: boolean;
  /** How many times [SKIP] was pressed. */
  skipCount: number;
}

export const TUTORIAL_STATIONS = ['walk', 'jump', 'lookLeft', 'wall'] as const;
export type TutorialStation = (typeof TUTORIAL_STATIONS)[number];

export interface TutorialProgress {
  stationsDone: TutorialStation[];
  certificateEarned: boolean;
  /** Confident-walking progress, so leaving the room doesn't wipe it. */
  walkProgressMs: number;
}

export interface GameState {
  schemaVersion: number;
  /** Epoch ms of the very first launch on this device. */
  firstLaunch: number;
  lastPlayed: number;
  timePlayedMs: number;
  /** Per-save seed, so RNG-driven content is stable for one player. */
  seed: number;
  deathCount: number;
  deathLog: DeathLogEntry[];
  pintuLoss: PintuLossEntry[];
  /** "Marks". Starts at 100, drops on every checkpoint load. */
  percentage: number;
  gadbadCount: number;
  caseFiles: CaseFile[];
  confessions: Confession[];
  flags: Flags;
  tutorial: TutorialProgress;
  settings: Settings;
  /** Managed ONLY by HorrorDirector (enforced by lint + runtime check). */
  horrorLevel: HorrorLevel;
}

/** What ordinary game code is allowed to mutate. */
export type MutableGameState = Omit<GameState, 'horrorLevel' | 'schemaVersion'>;

export function defaultFlags(): Flags {
  return {
    skippedTutorial: false,
    calledPintuCount: 0,
    aurDikhaoClicks: 0,
    leftRoomCount: 0,
    doorsKicked: 0,
    seenContentNotice: false,
    skipCount: 0,
  };
}

export function defaultTutorial(): TutorialProgress {
  return { stationsDone: [], certificateEarned: false, walkProgressMs: 0 };
}

export function createDefaultState(now: number): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    firstLaunch: now,
    lastPlayed: now,
    timePlayedMs: 0,
    seed: hashString(`skip-tutorial:${now}`),
    deathCount: 0,
    deathLog: [],
    pintuLoss: [],
    percentage: 100,
    gadbadCount: 0,
    caseFiles: [],
    confessions: [],
    flags: defaultFlags(),
    tutorial: defaultTutorial(),
    settings: defaultSettings(),
    horrorLevel: 0,
  };
}
