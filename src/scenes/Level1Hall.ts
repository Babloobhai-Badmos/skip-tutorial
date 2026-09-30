import Phaser from 'phaser';
import content from '../content/deaths.json';
import { sfx } from '../audio/engine';
import { PlayerController } from '../characters/playerController';
import { corpsesIn, recordDeath, type DeathInput } from '../core/deaths';
import { events } from '../core/events';
import { getStore } from '../core/gameState';
import { updateHorrorLevel } from '../core/horrorDirector';
import cid from '../content/cid.json';
import { createGadbadHud } from '../ui/gadbadHud';
import { flashOrFade } from '../ui/effects';
import { SubtitleBar } from '../ui/subtitleBar';
import { GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import { isRespawn } from './Death';
import { GameplayScene } from './GameplayScene';
import {
  BACK_DOOR_X,
  BANGLES,
  buildHall,
  CHECKPOINT_X,
  COOKER,
  HALL_OBJECTS,
  FLOOR_Y,
  HALL_WIDTH,
  NEXT_DOOR_X,
  PIT,
  type HallLayout,
} from './hall/layout';
import { kickDoor } from './hall/kick';
import { goTo } from './navigate';
import { onThisVisit } from './sceneEvents';

const KEY = 'Level1Hall';
/** Cooker cycle: quiet, then a whistle you must not be standing in. */
const COOKER_PERIOD = 3600;
const COOKER_WHISTLE = { from: 2400, to: 3500 };

/**
 * M3 Hall prototype (M5 turns it into the full level): somewhere to die.
 * Pit -> D01, cooker whistle -> D02, broken bangles -> general deaths.
 */
export class Level1Hall extends GameplayScene {
  private player!: PlayerController;
  private hall!: HallLayout;
  private subtitles!: SubtitleBar;
  private corpses!: Phaser.GameObjects.Group;
  private dying = false;
  private leaving = false;
  private lastSafe = { x: CHECKPOINT_X, y: FLOOR_Y - 40 };
  private cookerClock = 0;
  private whistling = false;
  private doorKeys!: Phaser.Input.Keyboard.Key[];
  private kickKey!: Phaser.Input.Keyboard.Key;
  private kicking = false;

  constructor() {
    super(KEY);
  }

  create(): void {
    this.dying = false;
    this.leaving = false;
    this.kicking = false;
    this.cookerClock = 0;
    this.whistling = false;
    this.lastSafe = { x: CHECKPOINT_X, y: FLOOR_Y - 40 };

    // A quit during Daya's slow-mo must not leave the next visit in slow motion.
    this.tweens.timeScale = 1;
    this.physics.world.timeScale = 1;
    this.physics.world.setBounds(0, 0, HALL_WIDTH, GAME_HEIGHT + 300);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.hall = buildHall(this);
    this.corpses = this.add.group();
    this.drawCorpses();

    this.player = new PlayerController(this, CHECKPOINT_X, FLOOR_Y - 40);
    this.physics.add.collider(this.player.sprite, this.hall.solids);
    this.cameras.main.setBounds(0, 0, HALL_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    this.subtitles = new SubtitleBar(this);
    this.add
      .text(GAME_WIDTH / 2, 20, content.hall.hint, TEXT.small)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.doorKeys = [K.E, K.ENTER].map((k) => this.input.keyboard!.addKey(k));
    this.kickKey = this.input.keyboard!.addKey(K.F);
    createGadbadHud(this);

    // Coming back from a Death overlay.
    onThisVisit(this, Phaser.Scenes.Events.RESUME, (_sys: unknown, data: unknown) => {
      if (isRespawn(data)) this.respawn(data.respawnAtDeathSpot);
    });
    this.setupPause();
  }

  update(_t: number, dtMs: number): void {
    const dt = Math.min(dtMs, 100);
    this.updateCooker(dt);
    if (this.dying || this.leaving || this.kicking) return;

    const frame = this.player.update();
    const { x, y } = this.player.sprite;

    if (y > GAME_HEIGHT + 40) return this.die({ x, y, scene: KEY, cause: 'fall' });
    const onFloor = frame.grounded && this.player.body.bottom >= FLOOR_Y - 2;
    if (onFloor && x > BANGLES.from - 6 && x < BANGLES.to + 6) {
      return this.die({ x, y, scene: KEY, cause: 'bangles' });
    }
    if (this.whistling && Math.abs(x - COOKER.x) < 55 && y > FLOOR_Y - COOKER.h - 150) {
      return this.die({ x, y, scene: KEY, cause: 'cooker' });
    }
    const nearHazard =
      (x > PIT.from - 50 && x < PIT.to + 50) ||
      (x > BANGLES.from - 60 && x < BANGLES.to + 60) ||
      Math.abs(x - COOKER.x) < 90;
    if (frame.grounded && !nearHazard) this.lastSafe = { x, y };

    this.checkDoors();
    this.checkLockedDoors();
  }

  private checkLockedDoors(): void {
    const door = this.hall.lockedDoors.find(
      (d) => !d.open && this.physics.overlap(this.player.sprite, d.zone),
    );
    if (door) this.hall.doorPrompt.setText(content.hall.lockedPrompt).setX(door.x).setVisible(true);
    if (!door || !Phaser.Input.Keyboard.JustDown(this.kickKey)) return;
    this.kicking = true;
    this.player.enabled = false;
    this.player.sprite.setVelocity(0, 0);
    this.hall.doorPrompt.setVisible(false);
    void kickDoor(this, door, this.subtitles, this.player.sprite.x).then((result) => {
      this.kicking = false;
      this.player.enabled = true;
      if (result === 'deadly') {
        const { x, y } = this.player.sprite;
        this.die({ x, y, scene: KEY, cause: 'door' });
      }
    });
  }

  private updateCooker(dt: number): void {
    this.cookerClock = (this.cookerClock + dt) % COOKER_PERIOD;
    const now = this.cookerClock >= COOKER_WHISTLE.from && this.cookerClock < COOKER_WHISTLE.to;
    if (now && !this.whistling) {
      sfx('whistle', { volume: 0.5 });
      this.tweens.add({
        targets: this.hall.cooker,
        y: this.hall.cooker.y - 8,
        duration: 90,
        yoyo: true,
        repeat: 3,
      });
      this.puff();
    }
    this.whistling = now;
  }

  private puff(): void {
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

  private checkDoors(): void {
    const atBack = this.physics.overlap(this.player.sprite, this.hall.backDoor);
    const atNext = this.physics.overlap(this.player.sprite, this.hall.nextDoor);
    const prompt = this.hall.doorPrompt;
    prompt
      .setText(content.hall.doorPrompt)
      .setVisible(atBack || atNext)
      .setX(atBack ? BACK_DOOR_X : NEXT_DOOR_X);
    if (!(atBack || atNext) || !this.doorKeys.some((k) => Phaser.Input.Keyboard.JustDown(k)))
      return;
    this.leaving = true;
    goTo(this, atBack ? 'TutorialScene' : 'Level2Kitchen');
  }

  // ---------------------------------------------------------------- death

  private die(input: DeathInput): void {
    if (this.dying) return;
    this.dying = true;
    const store = getStore();
    const entry = recordDeath(store, input);
    events.emit('death:recorded', { id: entry.id, cause: entry.cause });
    updateHorrorLevel(store);
    flashOrFade(this, 0xffffff, 180);
    this.player.sprite.setVisible(false);
    this.player.sprite.body!.enable = false;
    this.time.delayedCall(380, () => {
      // Order matters: scene ops are queued, and the level must already be
      // paused when the Death overlay's create() runs.
      this.scene.pause();
      this.scene.launch('Death', {
        from: KEY,
        entryId: entry.id,
        objects: HALL_OBJECTS.map((o) => ({ label: cid.objects[o.key], x: o.x })),
      });
      this.scene.bringToTop('Death');
      this.scene.bringToTop('Pause');
    });
  }

  private respawn(atDeathSpot: boolean): void {
    const spot = atDeathSpot ? this.lastSafe : { x: CHECKPOINT_X, y: FLOOR_Y - 40 };
    this.player.sprite.body!.enable = true;
    this.player.placeAt(spot.x, spot.y);
    this.player.sprite.setVisible(true);
    this.drawCorpses();
    this.dying = false;
    // Twist #1 begins: someone quietly counts. No speaker. No explanation.
    const state = getStore().state;
    if (state.horrorLevel >= 1) {
      const word = content.count[state.deathCount - 1] ?? String(state.deathCount);
      this.time.delayedCall(900, () =>
        this.subtitles.say('', `(...${word}.)`, { rate: 0.4, holdMs: 1600 }),
      );
    }
  }

  /** Bodies from deaths whose break phase played. They stay. */
  private drawCorpses(): void {
    this.corpses.clear(true, true);
    for (const d of corpsesIn(getStore().state, KEY)) {
      const y = Math.min(d.y, d.cause === 'fall' ? GAME_HEIGHT - 18 : FLOOR_Y - 14);
      const body = this.add.image(d.x, y, 'player').setAngle(90).setTint(0x6d6d6d).setAlpha(0.85);
      this.corpses.add(body);
    }
  }
}
