import Phaser from 'phaser';
import ui from '../content/ui.json';
import { drawNpcTextures } from '../characters/npcArt';
import { drawSquadTextures } from '../characters/squadArt';
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
    drawSquadTextures(this);
    drawNpcTextures(this);
    goTo(this, 'ContentNotice');
  }

  /** Placeholder art, all drawn in code. Swappable later. */
  private makeTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Pintu, in parts (the loss system hides parts).
    g.fillStyle(0xc68b59).fillCircle(50, 42, 34); // head
    g.fillStyle(0x1a1a1a).fillRect(22, 10, 56, 14); // hair
    g.fillStyle(0xffffff).fillCircle(38, 42, 9).fillCircle(62, 42, 9); // eyes
    g.fillStyle(0x111111).fillCircle(38, 44, 4).fillCircle(62, 44, 4); // pupils
    g.lineStyle(3, 0x5a2d1a).beginPath().moveTo(38, 62).lineTo(50, 58).lineTo(62, 62).strokePath();
    g.fillStyle(0x8fd3ff).fillCircle(84, 30, 5).fillTriangle(79, 29, 89, 29, 84, 18); // sweat
    g.generateTexture('pintu_head', 100, 80);
    g.clear();
    g.fillStyle(0x3b6ea5).fillRoundedRect(0, 0, 56, 90, 10); // shirt
    g.fillStyle(0xffffff).fillRect(26, 6, 4, 70); // shirt buttons line
    g.fillStyle(0xf2d16b).fillRect(34, 14, 14, 18); // pocket with pens
    g.generateTexture('pintu_body', 56, 90);
    g.clear();
    g.fillStyle(0x2b2b33).fillRect(0, 0, 16, 40);
    g.fillStyle(0x111111).fillRect(0, 34, 18, 6); // chappal
    g.generateTexture('pintu_leg', 18, 40);
    g.clear();

    // The player: small, round, determined.
    g.fillStyle(0x2fb3a4).fillRoundedRect(4, 22, 24, 30, 6);
    g.fillStyle(0xe0a97a).fillCircle(16, 13, 12);
    g.fillStyle(0x111111).fillCircle(20, 12, 2.5).fillCircle(26, 12, 2.5);
    g.fillStyle(0x222222).fillRect(6, 50, 8, 6).fillRect(18, 50, 8, 6);
    g.generateTexture('player', 32, 56);
    g.clear();

    // Treadmill belt tile.
    g.fillStyle(0x2a2a2a).fillRect(0, 0, 32, 20);
    g.fillStyle(0x444444).fillRect(0, 0, 6, 20);
    g.generateTexture('belt', 32, 20);
    g.clear();

    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
    g.generateTexture('px', 4, 4);
    g.destroy();

    this.cameras.main.setBackgroundColor(COLORS.bg);
  }
}
