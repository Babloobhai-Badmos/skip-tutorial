import pintuContent from '../content/pintu.json';
import { sfx } from '../audio/engine';
import { markBreakPlayed, pickDeathScene, shouldRunBreak } from '../core/deaths';
import { getStore } from '../core/gameState';
import { hasLost } from '../core/pintuLoss';
import { createRng } from '../core/rng';
import type { SceneKey } from '../core/sceneFlow';
import { nextCaseNumber } from '../cid/caseFiles';
import { buildInvestigation, factsFor, nearestObject } from '../cid/engine';
import { runInvestigation } from '../cid/investigation';
import { DEATH_SCENES } from '../deathScenes';
import type { DeathContext } from '../deathScenes/types';
import { SubtitleBar } from '../ui/subtitleBar';
import { GameplayScene } from './GameplayScene';

export interface SceneObject {
  label: string;
  x: number;
}

export interface DeathData {
  from: SceneKey;
  entryId: number;
  /** Inanimate objects in the level: the CID's suspects. */
  objects?: SceneObject[];
}

export interface RespawnData {
  fromDeath: true;
  respawnAtDeathSpot: boolean;
}

/** Keys that must never count as "continue" (they open the pause menu). */
const PAUSE_KEYS = new Set(['Escape', 'p', 'P']);
let lastSceneId: string | undefined;

/**
 * Overlay launched on top of a paused level. Plays the death's laugh phase,
 * then the CID investigation, then the break phase if the HorrorDirector
 * allows it, then hands control back to the level.
 */
export class Death extends GameplayScene {
  private from: SceneKey = 'Title';
  private entryId = 0;
  private objects: SceneObject[] = [];
  /** Which death scene is playing (read by browser tests). */
  playedId = '';
  /** Which CID module wrote the investigation (read by browser tests). */
  playedMode = '';
  private runToken = 0;

  constructor() {
    super('Death');
  }

  init(d: DeathData): void {
    this.from = d.from;
    this.entryId = d.entryId;
    this.objects = d.objects ?? [];
  }

  create(): void {
    this.setupPause();
    void this.run(++this.runToken);
  }

  private async run(token: number): Promise<void> {
    const store = getStore();
    const state = store.state;
    const death = state.deathLog.find((d) => d.id === this.entryId);
    if (!death) return this.finish(token, false);

    const rng = createRng(state.seed).fork(`death:${death.id}`);
    const scene = pickDeathScene(DEATH_SCENES, state, death.cause, rng, lastSceneId);
    lastSceneId = scene.id;
    this.playedId = scene.id;
    const subtitles = new SubtitleBar(this);
    const layer = this.add.container(0, 0);

    const ctx: DeathContext = {
      scene: this,
      store,
      rng,
      death,
      level: state.horrorLevel,
      subtitles,
      sfx,
      layer,
      pintuName: hasLost(state.pintuLoss, 'nameTag') ? '' : pintuContent.speaker,
      outcome: { respawnAtDeathSpot: false },
      wait: (ms) => new Promise((resolve) => this.time.delayedCall(ms, () => resolve())),
      waitForInput: (minMs = 0, maxMs) => this.waitForInput(minMs, maxMs),
    };

    await scene.runLaugh(ctx);
    layer.removeAll(true);
    subtitles.clear();
    // The CID investigates every death, BEFORE the break phase.
    const inv = buildInvestigation(
      {
        death,
        nearestObject: nearestObject(this.objects, death.x),
        caseNumber: nextCaseNumber(store.state),
        horrorLevel: ctx.level,
        facts: factsFor(store.state, death),
      },
      rng.fork('cid'),
    );
    this.playedMode = inv.mode;
    await runInvestigation(ctx, inv);
    layer.removeAll(true);
    subtitles.clear();
    if (shouldRunBreak(scene, ctx.level)) {
      await ctx.wait(500);
      await scene.runBreak(ctx);
      markBreakPlayed(store, death.id);
    }
    this.finish(token, ctx.outcome.respawnAtDeathSpot);
  }

  private waitForInput(minMs: number, maxMs?: number): Promise<void> {
    return new Promise((resolve) => {
      const start = this.time.now;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.input.keyboard?.off('keydown', onKey);
        this.input.off('pointerdown', onPointer);
        timer?.remove();
        resolve();
      };
      const ready = () => this.time.now - start >= minMs;
      const onKey = (e: KeyboardEvent) => {
        if (!PAUSE_KEYS.has(e.key) && ready()) finish();
      };
      const onPointer = () => ready() && finish();
      this.input.keyboard?.on('keydown', onKey);
      this.input.on('pointerdown', onPointer);
      const timer = maxMs !== undefined ? this.time.delayedCall(maxMs, finish) : undefined;
    });
  }

  private finish(token: number, respawnAtDeathSpot: boolean): void {
    if (token !== this.runToken || !this.scene.isActive()) return;
    this.cameras.main.setZoom(1);
    const data: RespawnData = { fromDeath: true, respawnAtDeathSpot };
    this.scene.resume(this.from, data);
    this.scene.stop();
  }
}

export const isRespawn = (data: unknown): data is RespawnData =>
  typeof data === 'object' && data !== null && (data as RespawnData).fromDeath === true;
