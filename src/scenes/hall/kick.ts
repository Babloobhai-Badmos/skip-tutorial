import type Phaser from 'phaser';
import content from '../../content/deaths.json';
import { sfx } from '../../audio/engine';
import { SQUAD_NAMES } from '../../cid/format';
import { getStore } from '../../core/gameState';
import type { SubtitleBar } from '../../ui/subtitleBar';
import { FLOOR_Y, type LockedDoor } from './layout';

const h = content.hall;
export const SLOWMO_MS = 4000;

/**
 * Daya kicks a locked door: 4 seconds of slow-mo, a bass-boosted CRACK
 * (reused for things that don't crack), and a tally mark in the tutorial room.
 * Resolves with 'deadly' if what was behind the door lands on you.
 */
export async function kickDoor(
  scene: Phaser.Scene,
  door: LockedDoor,
  subtitles: SubtitleBar,
  playerX: number,
): Promise<'safe' | 'deadly'> {
  const wait = (ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, () => r()));
  const settings = getStore().state.settings;
  const daya = scene.add.image(playerX - 220, FLOOR_Y - 85, 'squad_daya').setDepth(50);
  scene.tweens.add({ targets: daya, x: door.x - 90, duration: 500, ease: 'Quad.out' });
  await wait(550);

  // Slow-mo: everything but the scene clock crawls.
  scene.tweens.timeScale = 0.25;
  scene.physics.world.timeScale = 4;
  subtitles.say(SQUAD_NAMES.daya, h.dayaWatch, { rate: 0.4, holdMs: 1500 });
  scene.tweens.add({ targets: daya, x: door.x - 60, angle: -8, duration: 1000 });
  await wait(SLOWMO_MS);
  scene.tweens.timeScale = 1;
  scene.physics.world.timeScale = 1;

  sfx('bass_crack', { pitch: 0.6 });
  scene.cameras.main.shake(250, settings.reduceJumpscares ? 0.004 : 0.014);
  scene.tweens.add({ targets: door.panel, scaleX: 0.08, duration: 180, ease: 'Quad.out' });
  door.open = true;
  getStore().update('door:kicked', (d) => {
    d.flags.doorsKicked += 1;
  });
  scene.tweens.add({
    targets: daya,
    alpha: 0,
    x: daya.x - 120,
    duration: 600,
    delay: 500,
    onComplete: () => daya.destroy(),
  });

  if (!door.deadly) {
    subtitles.say('', h.almirahGag, { holdMs: 2400 });
    return 'safe';
  }
  // Store room: every steel utensil in the house, at once.
  subtitles.say('', h.bartan, { holdMs: 1800 });
  for (let i = 0; i < 9; i++) {
    const b = scene.add
      .circle(door.x - 30 + (i % 3) * 30, FLOOR_Y - 150 - i * 12, 12, 0xc0c4cc)
      .setStrokeStyle(2, 0x7c8088);
    scene.tweens.add({
      targets: b,
      x: playerX + (i - 4) * 8,
      y: FLOOR_Y - 14,
      duration: 420 + i * 40,
      ease: 'Quad.in',
    });
  }
  await wait(650);
  return 'deadly';
}
