import pintuContent from '../content/pintu.json';
import content from '../content/deaths.json';
import levels from '../content/levels.json';
import { losableIds, type PintuLine } from '../characters/pintu';
import { callPintu } from '../core/pintuCall';
import { backdrop, CX, memeText } from './helpers';
import type { DeathContext, DeathScene } from './types';

const c = content.d05;
const L = levels.lifeline;
const EXTRA = losableIds(pintuContent.lines as PintuLine[]);

/** Lazy: the lifeline UI pulls in Phaser, and this module must load in Node tests. */
async function lifeline(ctx: DeathContext) {
  const { showLifeline } = await import('../ui/kbcLifeline');
  return showLifeline(ctx.scene, 50);
}

async function call(ctx: DeathContext, forceBreath: boolean): Promise<void> {
  ctx.sfx('landline_ring');
  await ctx.wait(1500);
  const r = callPintu(ctx.store, L.calls, L.breath, EXTRA);
  const silent = forceBreath || r.silent;
  if (silent) {
    ctx.sfx('whisper', { pitch: 0.45, volume: 0.25 });
    ctx.subtitles.say(ctx.pintuName, L.breath, { rate: 0.3, holdMs: 3000 });
    await ctx.wait(4200);
  } else {
    ctx.subtitles.say(ctx.pintuName, r.text, {
      holdMs: 1500,
      onBlip: () => ctx.sfx('pintu_blip', { pitch: 1.15 }),
    });
    await ctx.wait(1600 + r.text.length * 40);
  }
  ctx.subtitles.caption(L.hangup);
}

/**
 * D05 Phone a Friend. Laugh: you call Pintu, he panics adorably.
 * Break: the call costs him (it always did). He says nothing - a wet, tiny
 * breath - and the lifeline still says FREE.
 */
export const d05: DeathScene = {
  id: 'd05_phoneAFriend',
  horrorLevelRequired: 2,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 4,

  async runLaugh(ctx) {
    backdrop(ctx, 0x05021a, 0.6);
    memeText(ctx, CX, 90, c.question, 30);
    const choice = await lifeline(ctx);
    if (choice === 'phone') await call(ctx, false);
    await ctx.waitForInput(400, 1500);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x05021a, 0.8);
    memeText(ctx, CX, 90, c.question, 30);
    const choice = await lifeline(ctx);
    if (choice === 'phone') await call(ctx, true);
    // Still free. It was always free.
    const free = memeText(ctx, CX, 360, `${L.phone}  —  ${L.free}`, 34);
    s.tweens.add({ targets: free, alpha: 0.4, duration: 900, yoyo: true, repeat: 2 });
    await ctx.wait(3000);
    await ctx.waitForInput(400, 2500);
  },
};
