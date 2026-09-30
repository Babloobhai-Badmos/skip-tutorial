import Phaser from 'phaser';
import ui from '../content/ui.json';
import { getStore } from '../core/gameState';
import { updateHorrorLevel } from '../core/horrorDirector';
import { goTo } from './navigate';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, ui.boot.loading, TEXT.small).setOrigin(0.5);
    const store = getStore();
    updateHorrorLevel(store);
    this.makeTextures();
    goTo(this, 'ContentNotice');
  }

  /** Placeholder art, all drawn in code. Swappable later. */
  private makeTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Pintu: tall anxious rectangle-man with a big round head.
    g.fillStyle(0x3b6ea5).fillRoundedRect(22, 70, 56, 90, 10); // shirt
    g.fillStyle(0x2b2b33).fillRect(28, 160, 16, 40).fillRect(56, 160, 16, 40); // legs
    g.fillStyle(0xc68b59).fillCircle(50, 42, 34); // head
    g.fillStyle(0x1a1a1a).fillRect(22, 10, 56, 14); // hair
    g.fillStyle(0xffffff).fillCircle(38, 42, 9).fillCircle(62, 42, 9); // eyes
    g.fillStyle(0x111111).fillCircle(38, 44, 4).fillCircle(62, 44, 4); // pupils
    g.lineStyle(3, 0x5a2d1a).beginPath().moveTo(38, 62).lineTo(50, 58).lineTo(62, 62).strokePath();
    g.fillStyle(0x8fd3ff).fillCircle(84, 30, 5).fillTriangle(79, 29, 89, 29, 84, 18); // sweat
    g.generateTexture('pintu', 100, 200);
    g.clear();

    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
    g.generateTexture('px', 4, 4);
    g.destroy();

    this.cameras.main.setBackgroundColor(COLORS.bg);
  }
}
