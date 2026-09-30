import type Phaser from 'phaser';
import { flashStyle } from '../settings/accessibility';
import { getStore } from '../core/gameState';

/**
 * Every flash in the game goes through here. With reduceFlashing on,
 * the flash becomes a gentle fade-from-colour instead of a strobe.
 */
export function flashOrFade(scene: Phaser.Scene, color = 0xffffff, durationMs = 250): void {
  const cam = scene.cameras.main;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  if (flashStyle(getStore().state.settings) === 'flash') {
    cam.flash(durationMs, r, g, b);
  } else {
    cam.fadeFrom(Math.max(durationMs * 3, 600), r, g, b);
  }
}
