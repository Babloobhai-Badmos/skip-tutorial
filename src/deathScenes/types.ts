import type Phaser from 'phaser';
import type { PlayOpts, SfxName } from '../audio/sfx';
import type { GameStore } from '../core/gameState';
import type { Rng } from '../core/rng';
import type { DeathLogEntry, GameState, HorrorLevel } from '../core/stateSchema';
import type { SubtitleBar } from '../ui/subtitleBar';

export interface DeathContext {
  /** The Death overlay scene. All Phaser access goes through here. */
  scene: Phaser.Scene;
  store: GameStore;
  rng: Rng;
  death: DeathLogEntry;
  level: HorrorLevel;
  subtitles: SubtitleBar;
  sfx(name: SfxName, opts?: PlayOpts): number;
  /** Scene-clock wait: freezes while paused. */
  wait(ms: number): Promise<void>;
  /** Resolves on any key / click (after minMs), or after maxMs if given. */
  waitForInput(minMs?: number, maxMs?: number): Promise<void>;
  /** Everything a phase draws goes in here; cleared between phases. */
  layer: Phaser.GameObjects.Container;
  /** Pintu's speaker label ('' once his name tag is gone). */
  pintuName: string;
  /** Set by a break phase to respawn at the death spot (D01). */
  outcome: { respawnAtDeathSpot: boolean };
}

/** Spec section 3, plus two routing fields. */
export interface DeathScene {
  id: string;
  unlockCondition(state: Readonly<GameState>): boolean;
  runLaugh(ctx: DeathContext): Promise<void>;
  runBreak(ctx: DeathContext): Promise<void>;
  /** 0-5 */
  horrorLevelRequired: number;
  /** Death causes this scene owns (e.g. 'fall'). */
  causes: readonly string[];
  /** Can play for any cause when nothing specific fits. */
  general: boolean;
}
