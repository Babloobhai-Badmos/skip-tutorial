import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../ui/theme';
import type { DeathContext } from './types';

export const CX = GAME_WIDTH / 2;
export const CY = GAME_HEIGHT / 2;

/** Big meme-style caption: white, heavy, black outline. */
export function memeText(
  ctx: DeathContext,
  x: number,
  y: number,
  text: string,
  size = 64,
): Phaser.GameObjects.Text {
  const t = ctx.scene.add
    .text(x, y, text, {
      fontFamily: 'Impact, "Arial Black", sans-serif',
      fontSize: `${size}px`,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: Math.round(size / 7),
      align: 'center',
    })
    .setOrigin(0.5);
  ctx.layer.add(t);
  return t;
}

export function backdrop(
  ctx: DeathContext,
  color = 0x000000,
  alpha = 0.8,
): Phaser.GameObjects.Rectangle {
  const r = ctx.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha).setOrigin(0);
  ctx.layer.add(r);
  return r;
}

export function clockTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}
