import type Phaser from 'phaser';
import cid from '../content/cid.json';
import levels from '../content/levels.json';
import { sfx } from '../audio/engine';
import type { PlayerFrame } from '../characters/playerController';
import { beatAt, cookerPhase, type CookerPhase } from '../levels/kitchenRhythm';
import {
  KITCHEN_CHECKPOINTS,
  KITCHEN_COOKERS,
  KITCHEN_FLOOR_Y as FLOOR_Y,
  KITCHEN_GAPS,
  KITCHEN_WIDTH,
} from '../levels/kitchenLayoutData';
import { GAME_HEIGHT, TEXT } from '../ui/theme';
import type { SceneObject } from './Death';
import { LevelScene, type BuiltLevel } from './LevelScene';

const KEY = 'Level2Kitchen';
const STOVE_H = 46;
const STEAM_HALF_W = 46;
const STEAM_TOP = FLOOR_Y - 260;
const BACK_X = 70;
const NEXT_X = KITCHEN_WIDTH - 80;

interface CookerView {
  x: number;
  weight: Phaser.GameObjects.Rectangle;
  steam: Phaser.GameObjects.Rectangle;
  phase: CookerPhase;
}

/**
 * Level 2 - Rasode: a rhythm platformer. Every cooker whistles on its own
 * beat; its weight wobbles one beat before. The kitchen is always empty.
 */
export class Level2Kitchen extends LevelScene {
  protected readonly levelKey = KEY;
  protected readonly levelWidth = KITCHEN_WIDTH;
  protected readonly checkpoints = KITCHEN_CHECKPOINTS;
  private clock = 0;
  private lastBeat = -1;
  private cookers: CookerView[] = [];

  constructor() {
    super(KEY);
  }

  protected hint(): string {
    return levels.kitchen.hint;
  }

  protected objects(): SceneObject[] {
    return [
      { label: cid.objects.door, x: BACK_X },
      { label: cid.objects.chai, x: 300 },
      { label: cid.objects.radio, x: 700 },
      ...KITCHEN_COOKERS.map((c) => ({ label: cid.objects.cooker, x: c.x })),
      { label: cid.objects.tawa, x: 1560 },
      ...KITCHEN_GAPS.map((g) => ({ label: cid.objects.pit, x: (g.from + g.to) / 2 })),
      { label: cid.objects.door, x: NEXT_X },
    ];
  }

  protected buildLevel(): BuiltLevel {
    this.cameras.main.setBackgroundColor(0x2e3a35);
    const g = this.add.graphics();
    // Tiles, a shelf of masala dabbas, an empty chair, chai that never cools.
    for (let x = 0; x < KITCHEN_WIDTH; x += 48) {
      for (let y = 300; y < FLOOR_Y; y += 48) {
        g.fillStyle((x / 48 + y / 48) % 2 ? 0x3a4842 : 0x34413b, 1).fillRect(x, y, 48, 48);
      }
    }
    for (let x = 200; x < KITCHEN_WIDTH - 200; x += 520) {
      g.fillStyle(0x6b4f2a, 1).fillRect(x, 200, 260, 10);
      for (let i = 0; i < 6; i++) g.fillStyle(0xb9bcc2, 1).fillRect(x + 12 + i * 42, 170, 28, 30);
    }
    g.fillStyle(0x7a5230, 1)
      .fillRect(640, FLOOR_Y - 70, 50, 8)
      .fillRect(645, FLOOR_Y - 62, 6, 62)
      .fillRect(680, FLOOR_Y - 62, 6, 62);
    this.add.circle(300, FLOOR_Y - 12, 10, 0xd8c3a5);
    const chaiSteam = this.add.circle(300, FLOOR_Y - 34, 5, 0xffffff, 0.4);
    this.tweens.add({ targets: chaiSteam, y: FLOOR_Y - 70, alpha: 0, duration: 1400, repeat: -1 });
    this.add.rectangle(700, FLOOR_Y - 160, 60, 34, 0x5b3d24).setStrokeStyle(2, 0x3a2716);
    this.add.text(1560, FLOOR_Y + 14, levels.kitchen.tawa, TEXT.small).setOrigin(0.5, 0);

    const solids = this.physics.add.staticGroup();
    let from = 0;
    for (const gap of KITCHEN_GAPS) {
      solids.add(
        this.add
          .rectangle(from, FLOOR_Y, gap.from - from, GAME_HEIGHT - FLOOR_Y, 0x5a4a3a)
          .setOrigin(0),
      );
      this.add.rectangle(gap.from, FLOOR_Y, gap.to - gap.from, 200, 0x050505).setOrigin(0);
      from = gap.to;
    }
    solids.add(
      this.add
        .rectangle(from, FLOOR_Y, KITCHEN_WIDTH - from, GAME_HEIGHT - FLOOR_Y, 0x5a4a3a)
        .setOrigin(0),
    );

    this.cookers = KITCHEN_COOKERS.map((c) => {
      solids.add(
        this.add.rectangle(c.x - 40, FLOOR_Y - STOVE_H, 80, STOVE_H, 0x2b2b2b).setOrigin(0),
      );
      this.add.rectangle(c.x, FLOOR_Y - STOVE_H - 24, 54, 44, 0xb9bcc2).setStrokeStyle(2, 0x777a80);
      this.add.ellipse(c.x, FLOOR_Y - STOVE_H - 46, 60, 10, 0xa8abb1);
      const weight = this.add.rectangle(c.x, FLOOR_Y - STOVE_H - 56, 10, 12, 0x333333);
      const steam = this.add
        .rectangle(
          c.x,
          STEAM_TOP,
          STEAM_HALF_W * 2,
          FLOOR_Y - STOVE_H - 56 - STEAM_TOP,
          0xffffff,
          0.35,
        )
        .setOrigin(0.5, 0)
        .setVisible(false);
      return { x: c.x, weight, steam, phase: 'quiet' as CookerPhase };
    });

    const door = (x: number, label: string) => {
      this.add
        .rectangle(x - 38, FLOOR_Y - 150, 76, 150, 0x7a5230)
        .setOrigin(0)
        .setStrokeStyle(4, 0x4a3522);
      this.add.text(x, FLOOR_Y - 176, label, TEXT.small).setOrigin(0.5);
      const zone = this.add.zone(x, FLOOR_Y - 75, 100, 150);
      this.physics.add.existing(zone, true);
      return zone;
    };
    return {
      solids,
      exits: [
        { zone: door(BACK_X, levels.kitchen.back), x: BACK_X, to: 'Level1Hall' },
        { zone: door(NEXT_X, levels.kitchen.next), x: NEXT_X, to: 'Level3Wedding' },
      ],
    };
  }

  protected onLevelCreate(): void {
    this.clock = 0;
    this.lastBeat = -1;
    this.time.delayedCall(1500, () => this.subtitles.caption(levels.kitchen.empty, 3000));
  }

  protected levelUpdate(dt: number): void {
    this.clock += dt;
    const beat = beatAt(this.clock);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      // The kitchen's own metronome: the beat you learn the cookers by.
      sfx('typing_tick', { volume: beat === 0 ? 0.9 : 0.4 });
    }
    KITCHEN_COOKERS.forEach((c, i) => {
      const view = this.cookers[i];
      if (!view) return;
      const phase = cookerPhase(c.pattern, this.clock);
      if (phase === 'whistle' && view.phase !== 'whistle') {
        sfx('whistle', { volume: 0.45, pitch: 0.9 + i * 0.05 });
      }
      view.phase = phase;
      view.steam.setVisible(phase === 'whistle');
      const wobble = phase === 'telegraph' ? Math.sin(this.clock / 30) * 3 : 0;
      view.weight.setX(c.x + wobble);
    });
  }

  protected hazard(_frame: PlayerFrame, x: number, y: number): string | null {
    for (const c of this.cookers) {
      if (c.phase === 'whistle' && Math.abs(x - c.x) < STEAM_HALF_W && y > STEAM_TOP)
        return 'cooker';
    }
    return null;
  }

  protected nearHazard(x: number): boolean {
    return (
      this.cookers.some((c) => Math.abs(x - c.x) < STEAM_HALF_W + 40) ||
      KITCHEN_GAPS.some((g) => x > g.from - 50 && x < g.to + 50)
    );
  }
}
