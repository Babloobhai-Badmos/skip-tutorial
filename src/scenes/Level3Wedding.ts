import type Phaser from 'phaser';
import cid from '../content/cid.json';
import levels from '../content/levels.json';
import { startBand } from '../audio/music';
import type { PlayerFrame } from '../characters/playerController';
import { createRng, type Rng } from '../core/rng';
import { getStore } from '../core/gameState';
import {
  acceptPlate,
  type BuffetState,
  MAX_PLATES,
  outcome,
  refuse,
  returnPlates,
  speedFactor,
  startBuffet,
} from '../levels/buffet';
import { GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import type { SceneObject } from './Death';
import { LevelScene, LEVEL_FLOOR_Y as FLOOR_Y, type BuiltLevel } from './LevelScene';

const KEY = 'Level3Wedding';
const WIDTH = 3000;
const BACK_X = 70;
const NEXT_X = WIDTH - 90;
const WASH_X = 1500;
const AUNTY_ROUTES = [
  { from: 420, to: 760, speed: 70 },
  { from: 820, to: 1250, speed: 90 },
  { from: 1650, to: 1950, speed: 80 },
  { from: 1980, to: 2350, speed: 100 },
  { from: 2400, to: 2780, speed: 75 },
];
const OFFER_COOLDOWN = 1600;

interface Aunty {
  sprite: Phaser.GameObjects.Image;
  from: number;
  to: number;
  speed: number;
  dir: 1 | -1;
  cooldown: number;
  jumpedThisAir: boolean;
}

/** Level 3 - Shaadi Buffet: dodge aunties with plates. Watch your Sanskaar. */
export class Level3Wedding extends LevelScene {
  protected readonly levelKey = KEY;
  protected readonly levelWidth = WIDTH;
  protected readonly checkpoints = [150, 1550, 2450];
  private aunties: Aunty[] = [];
  private buffet: BuffetState = startBuffet();
  private plateStack: Phaser.GameObjects.Image[] = [];
  private bar!: Phaser.GameObjects.Rectangle;
  private platesText!: Phaser.GameObjects.Text;
  private washZone!: Phaser.GameObjects.Zone;
  private rng!: Rng;
  private pendingDeath: string | null = null;

  constructor() {
    super(KEY);
  }

  protected hint(): string {
    return levels.wedding.hint;
  }

  protected objects(): SceneObject[] {
    return [
      { label: cid.objects.door, x: BACK_X },
      ...AUNTY_ROUTES.map((r) => ({ label: cid.objects.aunty, x: (r.from + r.to) / 2 })),
      { label: cid.objects.washCounter, x: WASH_X },
      { label: cid.objects.dhol, x: 1100 },
      { label: cid.objects.stage, x: NEXT_X },
    ];
  }

  protected buildLevel(): BuiltLevel {
    this.cameras.main.setBackgroundColor(0x3b1d2e);
    const g = this.add.graphics();
    // Tent stripes, marigold strings, fairy lights.
    for (let x = 0; x < WIDTH; x += 120) {
      g.fillStyle(0x7a1f3d, 1).fillRect(x, 0, 60, FLOOR_Y);
      g.fillStyle(0x5c1530, 1).fillRect(x + 60, 0, 60, FLOOR_Y);
    }
    for (let x = 0; x < WIDTH; x += 30) {
      g.fillStyle(x % 60 ? 0xffb300 : 0xff6f00, 1).fillCircle(x, 90 + Math.sin(x / 90) * 18, 7);
      this.add.circle(x + 15, 150 + Math.cos(x / 70) * 10, 3, 0xfff59d);
    }
    // Buffet tables along the back.
    for (let x = 300; x < WIDTH - 300; x += 600) {
      g.fillStyle(0xf5f0e6, 1).fillRect(x, FLOOR_Y - 120, 260, 60);
      for (let i = 0; i < 5; i++)
        g.fillStyle(0xb9bcc2, 1).fillEllipse(x + 30 + i * 50, FLOOR_Y - 126, 40, 12);
    }
    const solids = this.physics.add.staticGroup();
    solids.add(this.add.rectangle(0, FLOOR_Y, WIDTH, GAME_HEIGHT - FLOOR_Y, 0x8d1d3c).setOrigin(0));

    this.add.rectangle(WASH_X, FLOOR_Y - 40, 90, 80, 0x546e7a).setStrokeStyle(3, 0x37474f);
    this.add.text(WASH_X, FLOOR_Y - 96, levels.wedding.washCounter, TEXT.small).setOrigin(0.5);
    this.washZone = this.add.zone(WASH_X, FLOOR_Y - 40, 110, 90);
    this.physics.add.existing(this.washZone, true);

    // The varmala stage, and the way back.
    this.add.rectangle(NEXT_X, FLOOR_Y - 30, 160, 60, 0xffd54f).setStrokeStyle(3, 0xc49000);
    const zone = (x: number, label: string) => {
      this.add.text(x, FLOOR_Y - 176, label, TEXT.small).setOrigin(0.5);
      const z = this.add.zone(x, FLOOR_Y - 75, 100, 150);
      this.physics.add.existing(z, true);
      return z;
    };
    this.add.rectangle(BACK_X - 38, FLOOR_Y - 150, 76, 150, 0x7a5230).setOrigin(0);
    return {
      solids,
      exits: [
        { zone: zone(BACK_X, levels.wedding.back), x: BACK_X, to: 'Level2Kitchen' },
        { zone: zone(NEXT_X, levels.wedding.next), x: NEXT_X, to: 'Act3Hallway' },
      ],
    };
  }

  protected onLevelCreate(): void {
    this.rng = createRng(getStore().state.seed).fork('wedding');
    this.buffet = startBuffet();
    this.pendingDeath = null;
    this.plateStack = [];
    this.aunties = AUNTY_ROUTES.map((r, i) => ({
      sprite: this.add.image(r.from, FLOOR_Y - 49, `aunty_${i % 4}`),
      ...r,
      dir: 1,
      cooldown: 0,
      jumpedThisAir: false,
    }));
    // Sanskaar bar (top centre).
    const x = GAME_WIDTH / 2 - 100;
    this.add
      .text(x - 10, 70, levels.wedding.sanskaar, TEXT.small)
      .setOrigin(1, 0.5)
      .setScrollFactor(0);
    this.add.rectangle(x, 70, 200, 14, 0x222222).setOrigin(0, 0.5).setScrollFactor(0).setDepth(800);
    this.bar = this.add
      .rectangle(x, 70, 200, 14, 0xffb300)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(801);
    this.platesText = this.add
      .text(x + 210, 70, '', TEXT.small)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.refreshHud();
    const stop = startBand(this);
    this.events.once('shutdown', stop);
  }

  protected onRespawn(): void {
    this.buffet = startBuffet();
    this.pendingDeath = null;
    this.refreshHud();
  }

  protected levelUpdate(dt: number): void {
    for (const a of this.aunties) {
      a.sprite.x += a.dir * a.speed * (dt / 1000);
      if (a.sprite.x > a.to) a.dir = -1;
      if (a.sprite.x < a.from) a.dir = 1;
      a.sprite.setFlipX(a.dir < 0);
      a.cooldown -= dt;
    }
    // Plates ride on your head.
    this.plateStack.forEach((p, i) =>
      p
        .setPosition(this.player.sprite.x, this.player.sprite.y - 34 - i * 7)
        .setVisible(this.player.sprite.visible),
    );
  }

  protected hazard(frame: PlayerFrame, x: number, y: number): string | null {
    if (this.pendingDeath) return this.pendingDeath;
    for (const a of this.aunties) {
      const close = Math.abs(x - a.sprite.x) < 30;
      if (frame.grounded) a.jumpedThisAir = false;
      if (close && frame.grounded && a.cooldown <= 0) {
        a.cooldown = OFFER_COOLDOWN;
        this.buffet = acceptPlate(this.buffet);
        this.subtitles.say('Aunty', this.rng.pick(levels.wedding.offers), { holdMs: 1200 });
        this.afterChange();
      } else if (close && !frame.grounded && y < a.sprite.y - 40 && !a.jumpedThisAir) {
        // Jumping over an aunty is refusing. Refusing is rude.
        a.jumpedThisAir = true;
        this.buffet = refuse(this.buffet);
        this.subtitles.caption(levels.wedding.rude);
        this.afterChange();
      }
    }
    if (this.physics.overlap(this.player.sprite, this.washZone) && this.buffet.plates > 0) {
      this.buffet = returnPlates(this.buffet);
      this.subtitles.caption(levels.wedding.returned);
      this.afterChange();
    }
    return this.pendingDeath;
  }

  private afterChange(): void {
    this.refreshHud();
    const o = outcome(this.buffet);
    if (o === 'overfed') this.pendingDeath = 'buffet';
    if (o === 'disgraced') this.pendingDeath = 'sanskaar';
  }

  private refreshHud(): void {
    this.player.speedScale = speedFactor(this.buffet);
    this.bar.setSize(2 * this.buffet.sanskaar, 14);
    this.platesText.setText(
      levels.wedding.plates
        .replace('{n}', String(this.buffet.plates))
        .replace('{max}', String(MAX_PLATES)),
    );
    while (this.plateStack.length < this.buffet.plates)
      this.plateStack.push(this.add.image(0, 0, 'plate'));
    while (this.plateStack.length > this.buffet.plates) this.plateStack.pop()?.destroy();
  }
}
