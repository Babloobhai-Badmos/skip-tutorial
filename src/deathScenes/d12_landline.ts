import type Phaser from 'phaser';
import content from '../content/deaths.json';
import { backdrop, CX, CY } from './helpers';
import type { DeathContext, DeathScene } from './types';

const c = content.d12;
/** "Pausing hangs up the call": the menu opens, just this much later. */
export const HANGUP_PAUSE_DELAY_MS = 1200;

function phone(ctx: DeathContext) {
  const s = ctx.scene;
  const ph = s.add.container(CX, CY + 40, [
    s.add.rectangle(0, 0, 180, 80, 0x1c1c1c).setStrokeStyle(3, 0x333333),
    s.add.rectangle(0, -52, 220, 34, 0x111111),
    s.add.circle(0, 2, 26, 0x444444),
  ]);
  ctx.layer.add(ph);
  return ph;
}

async function ring(ctx: DeathContext, ph: Phaser.GameObjects.Container) {
  for (let i = 0; i < 2; i++) {
    ctx.sfx('landline_ring');
    ctx.scene.tweens.add({ targets: ph, angle: 5, duration: 50, yoyo: true, repeat: 6 });
    await ctx.wait(1500);
  }
}

/**
 * D12 The Landline. Laugh: tring tring, the ACP gives dramatic orders.
 * Break: the call is not for you. The ACP is talking to Pintu.
 * Pausing during the break hangs up the call; the pause menu still opens.
 */
export const d12: DeathScene = {
  id: 'd12_landline',
  horrorLevelRequired: 2,
  causes: ['landline'],
  general: false,
  unlockCondition: () => true,

  async runLaugh(ctx) {
    backdrop(ctx, 0x0d1a2b, 0.9);
    const ph = phone(ctx);
    await ring(ctx, ph);
    ctx.layer.add(ctx.scene.add.image(CX - 360, CY, 'squad_acp'));
    for (const line of c.ordersLaugh) {
      ctx.subtitles.say('', line, { holdMs: 1400 });
      await ctx.wait(1400 + line.length * 35);
    }
    await ctx.waitForInput(500, 2500);
  },

  async runBreak(ctx) {
    backdrop(ctx, 0x000000, 0.92);
    const ph = phone(ctx);
    let hungUp = false;
    ctx.setPauseInterceptor(() => {
      if (!hungUp) {
        hungUp = true;
        ctx.subtitles.say('', c.pauseNote, { holdMs: 1200 });
        ctx.subtitles.caption(c.hangup);
      }
      return HANGUP_PAUSE_DELAY_MS;
    });
    await ring(ctx, ph);
    const lines = [c.notForYou, c.acpToPintu, c.pintuReply];
    for (const line of lines) {
      if (hungUp) break;
      ctx.subtitles.say('', line, { rate: 0.6, holdMs: 2000 });
      await ctx.wait(1800 + line.length * 45);
    }
    ctx.setPauseInterceptor(null);
    if (!hungUp) ctx.subtitles.caption(c.hangup);
    await ctx.waitForInput(600, 3000);
  },
};
