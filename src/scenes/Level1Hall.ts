import Phaser from 'phaser';
import cid from '../content/cid.json';
import content from '../content/deaths.json';
import levels from '../content/levels.json';
import { sfx } from '../audio/engine';
import type { PlayerFrame } from '../characters/playerController';
import { getStore } from '../core/gameState';
import { createRng } from '../core/rng';
import { GAME_WIDTH } from '../ui/theme';
import type { SceneObject } from './Death';
import { kickDoor } from './hall/kick';
import {
  BACK_DOOR_X,
  BANGLES,
  buildHall,
  CHECKPOINTS,
  COOKER,
  FLOOR_Y,
  HALL_OBJECTS,
  HALL_WIDTH,
  NEXT_DOOR_X,
  PHONE_X,
  PIT,
  PIT2,
  type HallLayout,
} from './hall/layout';
import { LevelScene, type BuiltLevel } from './LevelScene';

const KEY = 'Level1Hall';
/** Cooker cycle: quiet, then a whistle you must not be standing in. */
const COOKER_PERIOD = 3600;
const COOKER_WHISTLE = { from: 2400, to: 3500 };
/** The landline rings for a while, then is quiet for a while. */
const PHONE_CYCLE = 16_000;
const PHONE_RING_MS = 7000;
const CALL_MS = 15_000;

/**
 * Level 1 - Hall: platforming, locked doors for Daya, a cooker, broken
 * bangles, and the landline puzzle (the kitchen only opens during a call).
 */
export class Level1Hall extends LevelScene {
  protected readonly levelKey = KEY;
  protected readonly levelWidth = HALL_WIDTH;
  protected readonly checkpoints = CHECKPOINTS;
  private hall!: HallLayout;
  private kickKey!: Phaser.Input.Keyboard.Key;
  private cookerClock = 0;
  private whistling = false;
  private phoneClock = 0;
  private callLeftMs = 0;
  private ringTimer = 0;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super(KEY);
  }

  protected hint(): string {
    return content.hall.hint;
  }

  protected objects(): SceneObject[] {
    return HALL_OBJECTS.map((o) => ({ label: cid.objects[o.key], x: o.x }));
  }

  protected buildLevel(): BuiltLevel {
    this.hall = buildHall(this);
    return {
      solids: this.hall.solids,
      exits: [
        { zone: this.hall.backDoor, x: BACK_DOOR_X, to: 'TutorialScene' },
        {
          zone: this.hall.nextDoor,
          x: NEXT_DOOR_X,
          to: 'Level2Kitchen',
          isOpen: () => this.callLeftMs > 0,
          lockedText: levels.hall.kitchenLocked,
        },
      ],
    };
  }

  protected onLevelCreate(): void {
    this.cookerClock = 0;
    this.whistling = false;
    this.phoneClock = 0;
    this.callLeftMs = 0;
    this.ringTimer = 0;
    this.kickKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.timerText = this.add
      .text(GAME_WIDTH / 2, 70, '', { fontFamily: 'monospace', fontSize: '20px', color: '#ffcc33' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800);
  }

  protected hazard(frame: PlayerFrame, x: number, y: number): string | null {
    const onFloor = frame.grounded && this.player.body.bottom >= FLOOR_Y - 2;
    if (onFloor && x > BANGLES.from - 6 && x < BANGLES.to + 6) return 'bangles';
    if (this.whistling && Math.abs(x - COOKER.x) < 55 && y > FLOOR_Y - COOKER.h - 150) {
      return 'cooker';
    }
    return null;
  }

  protected nearHazard(x: number): boolean {
    return (
      (x > PIT.from - 50 && x < PIT.to + 50) ||
      (x > PIT2.from - 50 && x < PIT2.to + 50) ||
      (x > BANGLES.from - 60 && x < BANGLES.to + 60) ||
      Math.abs(x - COOKER.x) < 90
    );
  }

  /** Dying mid-call is a landline death (D12). */
  protected deathCause(cause: string): string {
    return this.callLeftMs > 0 ? 'landline' : cause;
  }

  /** "Pausing hangs up the call." In-level, the pause itself is never delayed. */
  protected beforePause(): number {
    if (this.callLeftMs > 0 && !this.dying) {
      this.callLeftMs = 0;
      this.timerText.setText('');
      this.subtitles.say('', levels.hall.hungUp, { holdMs: 2000 });
    }
    return 0;
  }

  protected levelUpdate(dt: number): void {
    this.updateCooker(dt);
    if (this.dying || this.leaving) return;
    this.updatePhone(dt);
    if (!this.frozen) this.checkLockedDoors();
  }

  // ---------------------------------------------------------------- landline

  private updatePhone(dt: number): void {
    if (this.callLeftMs > 0) {
      this.callLeftMs = Math.max(0, this.callLeftMs - dt);
      const s = Math.ceil(this.callLeftMs / 1000);
      this.timerText.setText(
        this.callLeftMs > 0 ? levels.hall.timer.replace('{s}', String(s)) : '',
      );
      return;
    }
    this.phoneClock = (this.phoneClock + dt) % PHONE_CYCLE;
    const ringing = this.phoneClock < PHONE_RING_MS;
    if (!ringing) return;
    this.ringTimer -= dt;
    if (this.ringTimer <= 0) {
      this.ringTimer = 1600;
      sfx('landline_ring', { volume: 0.6 });
      this.tweens.add({ targets: this.hall.phone, angle: 6, duration: 50, yoyo: true, repeat: 5 });
    }
    if (!this.frozen && Math.abs(this.player.sprite.x - PHONE_X) < 70) {
      this.requestPrompt(levels.hall.answer, PHONE_X);
      if (this.justPressedEnter()) this.answerPhone();
    }
  }

  private answerPhone(): void {
    this.phoneClock = PHONE_RING_MS; // stops the ringing
    this.callLeftMs = CALL_MS;
    const s = getStore().state;
    const rng = createRng(s.seed).fork(`call:${s.deathCount}:${s.flags.leftRoomCount}`);
    this.subtitles.say('', rng.pick(levels.hall.orders), { holdMs: 3000 });
  }

  // ---------------------------------------------------------------- cooker

  private updateCooker(dt: number): void {
    this.cookerClock = (this.cookerClock + dt) % COOKER_PERIOD;
    const now = this.cookerClock >= COOKER_WHISTLE.from && this.cookerClock < COOKER_WHISTLE.to;
    if (now && !this.whistling) {
      sfx('whistle', { volume: 0.5 });
      const cooker = this.hall.cooker;
      this.tweens.add({ targets: cooker, y: cooker.y - 8, duration: 90, yoyo: true, repeat: 3 });
      for (let i = 0; i < 4; i++) {
        const p = this.add.circle(
          COOKER.x + (i - 1.5) * 8,
          FLOOR_Y - COOKER.h - 70,
          9,
          0xffffff,
          0.5,
        );
        this.tweens.add({
          targets: p,
          y: p.y - 110,
          alpha: 0,
          scale: 2.2,
          duration: 1000 + i * 90,
          onComplete: () => p.destroy(),
        });
      }
    }
    this.whistling = now;
  }

  // ---------------------------------------------------------------- Daya

  private checkLockedDoors(): void {
    const door = this.hall.lockedDoors.find(
      (d) => !d.open && this.physics.overlap(this.player.sprite, d.zone),
    );
    if (door) this.requestPrompt(content.hall.lockedPrompt, door.x);
    if (!door || !Phaser.Input.Keyboard.JustDown(this.kickKey)) return;
    this.frozen = true;
    this.player.sprite.setVelocity(0, 0);
    this.prompt.setVisible(false);
    void kickDoor(this, door, this.subtitles, this.player.sprite.x).then((result) => {
      this.frozen = false;
      if (result === 'deadly') {
        const { x, y } = this.player.sprite;
        this.die({ x, y, scene: KEY, cause: 'door' });
      }
    });
  }
}
