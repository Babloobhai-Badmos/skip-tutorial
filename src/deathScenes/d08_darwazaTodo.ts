import type Phaser from 'phaser';
import content from '../content/deaths.json';
import { SQUAD_NAMES } from '../cid/format';
import { drawTally } from '../scenes/tutorial/tally';
import { backdrop, CX, CY, memeText } from './helpers';
import type { DeathContext, DeathScene } from './types';

const c = content.d08;

/**
 * D08 Darwaza Tod Do. Laugh: Daya kicks a door, the door wins.
 * Break: the door opens onto the tutorial room exactly as you left it, with a
 * chalk outline of you on the floor - the wrong size.
 */
export const d08: DeathScene = {
  id: 'd08_darwazaTodo',
  horrorLevelRequired: 2,
  causes: ['door'],
  general: false,
  unlockCondition: () => true,

  async runLaugh(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x1a0f0a, 0.9);
    memeText(ctx, CX, 110, c.card, 64);
    const door = s.add.rectangle(CX + 120, CY + 80, 110, 220, 0x7a5230).setStrokeStyle(5, 0x4a3522);
    const daya = s.add.image(CX - 360, CY + 90, 'squad_daya');
    ctx.layer.add([door, daya]);
    s.tweens.add({ targets: daya, x: CX - 60, duration: 700, ease: 'Quad.out' });
    await ctx.wait(900);
    ctx.sfx('bass_crack', { pitch: 0.7 });
    s.cameras.main.shake(220, ctx.store.state.settings.reduceJumpscares ? 0.004 : 0.012);
    s.tweens.add({
      targets: door,
      angle: 80,
      x: door.x + 140,
      alpha: 0.2,
      duration: 380,
      ease: 'Quad.out',
    });
    ctx.subtitles.say(SQUAD_NAMES.daya, c.dayaLaugh, { holdMs: 2000 });
    await ctx.wait(1400);
    memeText(ctx, CX, CY + 250, c.punch, 26);
    await ctx.waitForInput(800, 3500);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x000000, 0.92);
    const fx = CX - 170;
    const fy = CY - 190;
    const fw = 340;
    const fh = 400;
    // Inside the frame: the tutorial room. Exactly as you left it.
    const room = s.add.container(0, 0);
    const g = s.add.graphics();
    for (let x = fx; x < fx + fw; x += 32) g.fillStyle(0x2f2939, 1).fillRect(x, fy, 16, fh);
    g.fillStyle(0x2a2433, 1).fillRect(fx + 16, fy, 16, fh);
    g.fillStyle(0x3d3548, 1).fillRect(fx, fy + fh - 60, fw, 60);
    g.fillStyle(0x555555, 1).fillRect(fx + 120, fy + fh - 72, 140, 12); // treadmill
    g.fillStyle(0x8a7560, 1).fillRect(fx + 290, fy + fh - 104, 14, 44); // the wall
    // Chalk outline of you. Wrong size.
    g.lineStyle(3, 0xf4f4f4, 0.9);
    g.strokeCircle(fx + 205, fy + fh - 40, 20);
    g.strokeRoundedRect(fx + 225, fy + fh - 58, 80, 34, 8);
    g.lineBetween(fx + 305, fy + fh - 48, fx + 335, fy + fh - 56);
    g.lineBetween(fx + 305, fy + fh - 34, fx + 335, fy + fh - 26);
    room.add(g);
    // Lazy: PintuView extends a Phaser class, and this module must stay
    // importable in Node tests.
    const { PintuView } = await import('../characters/pintuView');
    const pintu = new PintuView(s, fx + 70, fy + fh - 60);
    pintu.applyLosses(ctx.store.state.pintuLoss);
    pintu.setScale(0.6);
    room.add(pintu);
    const mask = s.make.graphics({}, false).fillRect(fx, fy, fw, fh);
    room.setMask(mask.createGeometryMask());
    ctx.layer.add(room);

    // The door itself, swinging open. Its inside is covered in tally marks.
    const frame = s.add.rectangle(CX, CY + 10, fw + 16, fh + 16).setStrokeStyle(8, 0x4a3522);
    const panel = s.add.container(fx, fy);
    panel.add(s.add.rectangle(0, 0, fw, fh, 0x7a5230).setOrigin(0));
    const marks = s.add.graphics();
    drawTally(marks, 30, 40, ctx.store.state.deathCount, { color: 0xe8e0d0, perRow: 8 });
    marks.setVisible(false);
    panel.add(marks);
    ctx.layer.add([frame, panel]);
    await ctx.wait(1200);
    ctx.sfx('bass_crack', { pitch: 0.5, volume: 0.6 });
    s.tweens.add({
      targets: panel,
      scaleX: 0.18,
      duration: 1600,
      ease: 'Sine.inOut',
      onUpdate: () => marks.setVisible(panel.scaleX < 0.6),
    });
    await ctx.wait(3000);
    ctx.subtitles.say(SQUAD_NAMES.daya, c.dayaBreak, { rate: 0.45, holdMs: 4000 });
    await ctx.wait(3500);
    await waitThenCleanup(ctx, mask);
  },
};

async function waitThenCleanup(ctx: DeathContext, mask: Phaser.GameObjects.Graphics) {
  await ctx.waitForInput(600, 4000);
  mask.destroy();
}
