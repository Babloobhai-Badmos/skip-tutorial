import Phaser from 'phaser';
import levels from '../content/levels.json';
import { getStore } from '../core/gameState';
import { onThisVisit } from '../scenes/sceneEvents';
import { TEXT } from './theme';

/** Top-left "MARKS: N%". Every checkpoint load takes some away. */
export function createPercentageHud(scene: Phaser.Scene): Phaser.GameObjects.Text {
  const label = () => levels.hud.marks.replace('{p}', String(getStore().state.percentage));
  const t = scene.add
    .text(20, 20, label(), { ...TEXT.small, color: '#9fe39f', fontStyle: 'bold' })
    .setScrollFactor(0)
    .setDepth(800);
  let last = getStore().state.percentage;
  const refresh = () => {
    const now = getStore().state.percentage;
    t.setText(label());
    if (now < last) {
      t.setColor('#ff8a7a');
      scene.tweens.add({
        targets: t,
        scale: 1.25,
        duration: 120,
        yoyo: true,
        onComplete: () => t.setColor('#9fe39f'),
      });
    }
    last = now;
  };
  onThisVisit(scene, Phaser.Scenes.Events.UPDATE, () => {
    if (getStore().state.percentage !== last) refresh();
  });
  return t;
}
