import content from '../content/deaths.json';
import { backdrop, CX, CY, memeText } from './helpers';
import type { DeathScene } from './types';

const c = content.d01;

/**
 * D01 Kya Se Kya Ho Gaya. Laugh: meme card + sting.
 * Break: the card stays, the sting loops and slows, a whisper. You respawn
 * where you died, next to yourself.
 */
export const d01: DeathScene = {
  id: 'd01_kyaSeKya',
  horrorLevelRequired: 1,
  causes: ['fall'],
  general: true,
  unlockCondition: () => true,

  async runLaugh(ctx) {
    backdrop(ctx, 0x000000, 0.75);
    const card = memeText(ctx, CX, CY - 40, c.card, 84);
    const sub = memeText(ctx, CX, CY + 90, c.sub, 28);
    card.setScale(0.6);
    ctx.scene.tweens.add({ targets: card, scale: 1, duration: 500, ease: 'Back.out' });
    ctx.sfx('sting_zoom');
    ctx.scene.cameras.main.zoomTo(1.08, 900);
    await ctx.wait(1500);
    ctx.subtitles.say(ctx.pintuName, c.laughLine, { holdMs: 1400 });
    await ctx.waitForInput(900, 3200);
    ctx.scene.cameras.main.zoomTo(1, 200);
    void sub;
  },

  async runBreak(ctx) {
    // Same card, same sting. It just doesn't end when it should.
    backdrop(ctx, 0x000000, 0.75);
    memeText(ctx, CX, CY - 40, c.card, 84);
    memeText(ctx, CX, CY + 90, c.sub, 28);
    for (const pitch of [0.85, 0.65, 0.45]) {
      const len = ctx.sfx('sting_zoom', { pitch });
      await ctx.wait(Math.max(1400 / pitch, len * 1000) + 300);
    }
    await ctx.wait(1200);
    ctx.sfx('whisper', { pitch: 0.9 });
    ctx.subtitles.say(ctx.pintuName, c.whisper, { rate: 0.35, holdMs: 2600 });
    await ctx.wait(3800);
    ctx.outcome.respawnAtDeathSpot = true;
  },
};
