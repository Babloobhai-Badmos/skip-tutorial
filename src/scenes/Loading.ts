import Phaser from 'phaser';
import tipsContent from '../content/tips.json';
import ui from '../content/ui.json';
import { getStore } from '../core/gameState';
import { createRng } from '../core/rng';
import type { SceneKey } from '../core/sceneFlow';
import { fakeTimestamp, pickTip } from '../core/tips';
import { GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import type { SceneData } from './navigate';

interface LoadingData {
  next: SceneKey;
  data: SceneData;
}

const MIN_MS = 1200;
const AUTO_MS = 3200;
const recentTips: string[] = [];
let shown = 0;

/**
 * Loading screen styled as a forwarded family-chat message ("WhatsApp
 * University"). Original layout, no real app branding. In M8 some of these
 * tips become real death tips from other players.
 */
export class Loading extends Phaser.Scene {
  private next: SceneKey = 'Title';
  private nextData: SceneData = {};
  private leaving = false;

  constructor() {
    super('Loading');
  }

  init(d: LoadingData): void {
    this.next = d.next;
    this.nextData = d.data;
    this.leaving = false;
  }

  create(): void {
    const store = getStore();
    const rng = createRng(store.state.seed).fork(
      `tip:${shown++}:${store.state.flags.leftRoomCount}`,
    );
    const tip = pickTip(tipsContent.tips, rng, recentTips);
    recentTips.push(tip.id);
    if (recentTips.length > 4) recentTips.shift();

    this.cameras.main.setBackgroundColor(0x0e1519);
    // Faint doodle wallpaper.
    const doodles = this.add.graphics().lineStyle(1, 0x1a262c, 1);
    for (let i = 0; i < 60; i++) {
      const x = rng.int(0, GAME_WIDTH);
      const y = rng.int(0, GAME_HEIGHT);
      if (rng.chance(0.5)) doodles.strokeCircle(x, y, rng.int(6, 14));
      else doodles.strokeRect(x, y, rng.int(10, 20), rng.int(10, 20));
    }

    const x = 260;
    const width = 700;
    const sender = rng.pick(tipsContent.senders);
    const header = this.add.text(x + 20, 0, `↪↪ ${tipsContent.header}`, {
      ...TEXT.small,
      fontStyle: 'italic',
      color: '#8696a0',
    });
    const name = this.add.text(x + 20, 0, sender, {
      ...TEXT.small,
      color: '#e7a85c',
      fontStyle: 'bold',
    });
    const body = this.add.text(x + 20, 0, tip.text, {
      ...TEXT.body,
      fontSize: '22px',
      color: '#e9edef',
      wordWrap: { width: width - 40 },
    });
    const time = this.add.text(0, 0, `${fakeTimestamp(rng)}  ✓✓`, {
      ...TEXT.small,
      fontSize: '13px',
      color: '#8696a0',
    });

    const top = GAME_HEIGHT / 2 - (body.height + 110) / 2;
    header.setY(top + 14);
    name.setY(top + 38);
    body.setY(top + 64);
    time.setPosition(x + width - 20 - time.width, body.y + body.height + 10);
    const height = time.y + time.height + 12 - top;
    const bubble = this.add
      .graphics()
      .fillStyle(0x1f2c34, 1)
      .fillRoundedRect(x, top, width, height, 12);
    bubble.fillTriangle(x, top + 8, x - 14, top, x + 12, top);
    bubble.setDepth(-1);

    const loading = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, ui.loading.text, TEXT.small)
      .setOrigin(0.5);
    this.tweens.add({ targets: loading, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

    const openedAt = this.time.now;
    const go = () => {
      if (this.leaving || this.time.now - openedAt < MIN_MS) return;
      this.leaving = true;
      this.scene.start(this.next, this.nextData);
    };
    this.time.delayedCall(AUTO_MS, go);
    this.input.keyboard?.on('keydown', go);
    this.input.on('pointerdown', go);
  }
}
