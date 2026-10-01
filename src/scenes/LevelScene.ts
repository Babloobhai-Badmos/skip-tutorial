import Phaser from 'phaser';
import pintuContent from '../content/pintu.json';
import deathContent from '../content/deaths.json';
import levels from '../content/levels.json';
import { sfx } from '../audio/engine';
import { degrade, losableIds, type PintuLine } from '../characters/pintu';
import { PlayerController, type PlayerFrame } from '../characters/playerController';
import { furthestCheckpoint, loadCheckpoint } from '../core/checkpoints';
import { corpsesIn, recordDeath, type DeathInput } from '../core/deaths';
import { events } from '../core/events';
import { getStore } from '../core/gameState';
import { updateHorrorLevel } from '../core/horrorDirector';
import { callPintu } from '../core/pintuCall';
import { hasLost } from '../core/pintuLoss';
import type { SceneKey } from '../core/sceneFlow';
import { flashOrFade } from '../ui/effects';
import { createGadbadHud } from '../ui/gadbadHud';
import { showLifeline } from '../ui/kbcLifeline';
import { createPercentageHud } from '../ui/percentageHud';
import { SubtitleBar } from '../ui/subtitleBar';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import { isRespawn, type SceneObject } from './Death';
import { GameplayScene } from './GameplayScene';
import { goTo } from './navigate';
import { onThisVisit } from './sceneEvents';

export const LEVEL_FLOOR_Y = 640;
const EXTRA_LOSABLE = losableIds(pintuContent.lines as PintuLine[]);

export interface LevelExit {
  zone: Phaser.GameObjects.Zone;
  x: number;
  to: SceneKey;
  /** Locked exits show `lockedText` instead of opening. */
  isOpen?: () => boolean;
  lockedText?: string;
}

export interface BuiltLevel {
  solids: Phaser.Physics.Arcade.StaticGroup;
  exits: LevelExit[];
}

/**
 * Everything the playable levels share: movement, checkpoints (twist #1:
 * each load costs marks and quietly costs Pintu), deaths and respawns,
 * bodies that stay, the counting, HUDs, exits and the Phone-a-Friend lifeline.
 */
export abstract class LevelScene extends GameplayScene {
  protected abstract readonly levelKey: SceneKey;
  protected abstract readonly levelWidth: number;
  protected abstract readonly checkpoints: readonly number[];
  protected abstract hint(): string;
  protected abstract objects(): SceneObject[];
  protected abstract buildLevel(): BuiltLevel;
  /** A death cause if the player is in a hazard right now. */
  protected abstract hazard(frame: PlayerFrame, x: number, y: number): string | null;
  /** Near a hazard: don't remember this as a safe respawn spot. */
  protected nearHazard(_x: number): boolean {
    return false;
  }
  /** Runs every frame, even while dying (cookers keep whistling). */
  protected levelUpdate(_dt: number): void {}
  protected extraVx(): number {
    return 0;
  }
  /** Lets a level reinterpret a death (e.g. dying mid-phone-call). */
  protected deathCause(cause: string): string {
    return cause;
  }
  protected onLevelCreate(): void {}
  protected onRespawn(): void {}

  protected player!: PlayerController;
  protected subtitles!: SubtitleBar;
  protected prompt!: Phaser.GameObjects.Text;
  protected exits: LevelExit[] = [];
  protected dying = false;
  protected leaving = false;
  /** Input frozen (lifeline call, Daya's kick, ...). */
  protected frozen = false;
  private corpses!: Phaser.GameObjects.Group;
  private lastSafe = { x: 0, y: 0 };
  private checkpointIndex = 0;
  private diyas: Phaser.GameObjects.Arc[] = [];
  private enterKeys: Phaser.Input.Keyboard.Key[] = [];
  private lifelineKey!: Phaser.Input.Keyboard.Key;
  private marksLoads = 0;
  private requestedPrompt: { text: string; x: number } | null = null;

  create(): void {
    this.dying = false;
    this.leaving = false;
    this.frozen = false;
    this.checkpointIndex = 0;
    this.marksLoads = 0;
    // A quit mid slow-mo must not leave the next visit in slow motion.
    this.tweens.timeScale = 1;
    this.physics.world.timeScale = 1;
    this.physics.world.setBounds(0, 0, this.levelWidth, GAME_HEIGHT + 300);
    this.physics.world.setBoundsCollision(true, true, true, false);

    const built = this.buildLevel();
    this.exits = built.exits;
    this.corpses = this.add.group();
    this.drawCorpses();
    this.drawCheckpoints();

    const start = this.checkpoints[0] ?? 150;
    this.lastSafe = { x: start, y: LEVEL_FLOOR_Y - 40 };
    this.player = new PlayerController(this, start, LEVEL_FLOOR_Y - 40);
    this.physics.add.collider(this.player.sprite, built.solids);
    this.cameras.main.setBounds(0, 0, this.levelWidth, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.subtitles = new SubtitleBar(this);
    this.prompt = this.add
      .text(0, LEVEL_FLOOR_Y - 210, '', { ...TEXT.small, color: COLORS.accent })
      .setOrigin(0.5)
      .setVisible(false);
    this.add
      .text(GAME_WIDTH / 2, 20, this.hint(), TEXT.small)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    createGadbadHud(this);
    createPercentageHud(this);
    this.add
      .text(GAME_WIDTH - 20, 46, levels.hud.lifelineHint, { ...TEXT.small, fontSize: '13px' })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = this.input.keyboard!;
    this.enterKeys = [K.E, K.ENTER].map((k) => kb.addKey(k));
    this.lifelineKey = kb.addKey(K.L);

    onThisVisit(this, Phaser.Scenes.Events.RESUME, (_sys: unknown, data: unknown) => {
      if (isRespawn(data)) this.respawn(data.respawnAtDeathSpot);
    });
    this.setupPause();
    this.onLevelCreate();
  }

  update(_t: number, dtMs: number): void {
    const dt = Math.min(dtMs, 100);
    this.levelUpdate(dt);
    if (this.dying || this.leaving || this.frozen) {
      if (this.frozen) this.player.sprite.setVelocityX(0);
      return;
    }
    const frame = this.player.update(this.extraVx());
    const { x, y } = this.player.sprite;
    if (y > GAME_HEIGHT + 40) return this.die({ x, y, scene: this.levelKey, cause: 'fall' });
    const cause = this.hazard(frame, x, y);
    if (cause) return this.die({ x, y, scene: this.levelKey, cause });
    if (frame.grounded && !this.nearHazard(x)) this.lastSafe = { x, y };

    const next = furthestCheckpoint(this.checkpoints, x, this.checkpointIndex);
    if (next > this.checkpointIndex) {
      this.checkpointIndex = next;
      this.lightDiyas();
      this.subtitles.caption(levels.hud.checkpoint);
    }
    if (Phaser.Input.Keyboard.JustDown(this.lifelineKey)) void this.useLifeline();
    this.checkExits();
  }

  /** Ask for a context prompt this frame (exits win if both apply). */
  protected requestPrompt(text: string, x: number): void {
    this.requestedPrompt = { text, x };
  }

  protected justPressedEnter(): boolean {
    return this.enterKeys.some((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  private checkExits(): void {
    const exit = this.exits.find((e) => this.physics.overlap(this.player.sprite, e.zone));
    const requested = this.requestedPrompt;
    this.requestedPrompt = null;
    if (!exit) {
      this.prompt.setVisible(!!requested);
      if (requested) this.prompt.setText(requested.text).setX(requested.x);
      return;
    }
    this.prompt.setText(deathContent.hall.doorPrompt).setX(exit.x).setVisible(true);
    if (!this.justPressedEnter()) return;
    if (exit.isOpen && !exit.isOpen()) {
      if (exit.lockedText) this.subtitles.say('', exit.lockedText, { holdMs: 1800 });
      return;
    }
    this.leaving = true;
    goTo(this, exit.to);
  }

  // ---------------------------------------------------------------- death

  protected die(input: DeathInput): void {
    if (this.dying) return;
    this.dying = true;
    const store = getStore();
    const entry = recordDeath(store, { ...input, cause: this.deathCause(input.cause) });
    events.emit('death:recorded', { id: entry.id, cause: entry.cause });
    updateHorrorLevel(store);
    // D11 pins a picture of this exact moment to Freddy's board. Local only.
    this.game.renderer.snapshot((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (this.textures.exists('last_frame')) this.textures.remove('last_frame');
      this.textures.addImage('last_frame', img);
    });
    this.player.sprite.setVisible(false);
    this.player.sprite.body!.enable = false;
    this.time.delayedCall(60, () => flashOrFade(this, 0xffffff, 180));
    this.time.delayedCall(420, () => {
      // Order matters: the level must already be paused when Death's create() runs.
      this.scene.pause();
      this.scene.launch('Death', {
        from: this.levelKey,
        entryId: entry.id,
        objects: this.objects(),
      });
      this.scene.bringToTop('Death');
      this.scene.bringToTop('Pause');
    });
  }

  private respawn(atDeathSpot: boolean): void {
    const cpX = this.checkpoints[this.checkpointIndex] ?? this.checkpoints[0] ?? 150;
    const spot = atDeathSpot ? this.lastSafe : { x: cpX, y: LEVEL_FLOOR_Y - 40 };
    this.player.sprite.body!.enable = true;
    this.player.placeAt(spot.x, spot.y);
    this.player.sprite.setVisible(true);
    this.drawCorpses();
    this.dying = false;
    this.onRespawn();

    const store = getStore();
    // Twist #1: respawning at a checkpoint is a load, and loads cost marks.
    if (!atDeathSpot) loadCheckpoint(store, EXTRA_LOSABLE);
    const state = store.state;
    if (state.horrorLevel >= 1) {
      const word = deathContent.count[state.deathCount - 1] ?? String(state.deathCount);
      this.time.delayedCall(900, () =>
        this.subtitles.say('', `(...${word}.)`, { rate: 0.4, holdMs: 1400 }),
      );
    }
    if (!atDeathSpot)
      this.time.delayedCall(state.horrorLevel >= 1 ? 3000 : 900, () => this.marksLine());
  }

  /** "Itne kam marks? Log kya kahenge?" - degraded by whatever he's lost. */
  private marksLine(): void {
    const s = getStore().state;
    const lines = levels.marksLines;
    const raw = (lines[this.marksLoads++ % lines.length] ?? '').replace(
      '{p}',
      String(s.percentage),
    );
    const speaker = hasLost(s.pintuLoss, 'nameTag') ? '' : pintuContent.speaker;
    this.subtitles.say(speaker, degrade(raw, s.pintuLoss.length), {
      holdMs: 1800,
      onBlip: () => sfx('pintu_blip', { pitch: 1.1 - s.pintuLoss.length * 0.04 }),
    });
  }

  private drawCorpses(): void {
    this.corpses.clear(true, true);
    for (const d of corpsesIn(getStore().state, this.levelKey)) {
      const y = Math.min(d.y, d.cause === 'fall' ? GAME_HEIGHT - 18 : LEVEL_FLOOR_Y - 14);
      this.corpses.add(
        this.add.image(d.x, y, 'player').setAngle(90).setTint(0x6d6d6d).setAlpha(0.85),
      );
    }
  }

  // ---------------------------------------------------------------- checkpoints

  private drawCheckpoints(): void {
    this.diyas = this.checkpoints.map((x) => {
      this.add.rectangle(x, LEVEL_FLOOR_Y - 6, 22, 10, 0x8a5a2b);
      return this.add.circle(x, LEVEL_FLOOR_Y - 16, 5, 0x553311);
    });
    this.lightDiyas();
  }

  private lightDiyas(): void {
    this.diyas.forEach((d, i) => d.setFillStyle(i <= this.checkpointIndex ? 0xffb347 : 0x553311));
  }

  // ---------------------------------------------------------------- lifeline

  /** D05's in-level twin: Phone a Friend. FREE. */
  protected async useLifeline(): Promise<void> {
    if (this.frozen) return;
    this.frozen = true;
    const choice = await showLifeline(this);
    if (choice === 'phone') await this.phonePintu();
    this.frozen = false;
  }

  private async phonePintu(): Promise<void> {
    const wait = (ms: number) => new Promise<void>((r) => this.time.delayedCall(ms, () => r()));
    sfx('landline_ring');
    await wait(1400);
    const store = getStore();
    const speaker = hasLost(store.state.pintuLoss, 'nameTag') ? '' : pintuContent.speaker;
    const c = levels.lifeline;
    const result = callPintu(store, c.calls, c.breath, EXTRA_LOSABLE);
    if (result.silent) {
      sfx('whisper', { pitch: 0.45, volume: 0.25 });
      this.subtitles.say(speaker, result.text, { rate: 0.3, holdMs: 2500 });
      await wait(4500);
    } else {
      this.subtitles.say(speaker, result.text, {
        holdMs: 1500,
        onBlip: () => sfx('pintu_blip', { pitch: 1.15 }),
      });
      await wait(1500 + result.text.length * 40);
    }
    this.subtitles.caption(c.hangup);
    updateHorrorLevel(store);
  }
}
