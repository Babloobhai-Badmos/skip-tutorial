import Phaser from 'phaser';
import content from '../content/deaths.json';
import { events } from '../core/events';
import { onThisVisit } from '../scenes/sceneEvents';
import { getStore } from '../core/gameState';
import { GAME_WIDTH, TEXT } from './theme';

/** Top-right "GADBAD: N". Counts every time the ACP says it. */
export function createGadbadHud(scene: Phaser.Scene): Phaser.GameObjects.Text {
  const label = () => content.d09.counter.replace('{n}', String(getStore().state.gadbadCount));
  const t = scene.add
    .text(GAME_WIDTH - 20, 20, label(), { ...TEXT.small, color: '#ff8a7a', fontStyle: 'bold' })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(800);
  const off = events.on('gadbad:changed', () => {
    t.setText(label());
    if (scene.sys.isActive())
      scene.tweens.add({ targets: t, scale: 1.2, duration: 90, yoyo: true });
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  // Also refresh after returning from a Death overlay (counter moved meanwhile).
  onThisVisit(scene, Phaser.Scenes.Events.RESUME, () => t.setText(label()));
  return t;
}
