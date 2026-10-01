import content from '../content/deaths.json';
import { factsFor } from '../cid/engine';
import { fill, SQUAD_NAMES } from '../cid/format';
import type { Facts } from '../cid/types';
import { backdrop, CX, memeText } from './helpers';
import type { DeathContext, DeathScene } from './types';

const c = content.d11;

/** Freddy's theories, right this time. Pure, so it can be tested. */
export function rightTheories(f: Facts): string[] {
  // Never pin a zero ("0 darwaze" is true, but it isn't evidence).
  const fallback = [...c.rightFallback];
  return c.right.map((t) => {
    const zero = (['calledPintu', 'doorsKicked', 'skips'] as const).some(
      (k) => t.includes(`{${k}}`) && f[k] === 0,
    );
    return zero ? (fallback.shift() ?? fill(t, { ...f })) : fill(t, { ...f });
  });
}

const SLOTS = [
  { x: CX - 380, y: 200 },
  { x: CX + 380, y: 200 },
  { x: CX - 380, y: 470 },
  { x: CX + 380, y: 470 },
];

function board(ctx: DeathContext, texts: readonly string[]) {
  const s = ctx.scene;
  ctx.layer.add(s.add.rectangle(CX, 340, 1100, 560, 0x8b6b4a).setStrokeStyle(10, 0x5a3f22));
  memeText(ctx, CX, 90, c.title, 30);
  const g = s.add.graphics().lineStyle(3, 0xc62828, 0.9);
  SLOTS.forEach((p) => g.lineBetween(p.x, p.y, CX, 340));
  ctx.layer.add(g);
  return SLOTS.map((p, i) => {
    const card = s.add
      .rectangle(p.x, p.y, 240, 90, 0xf1e6c8)
      .setStrokeStyle(2, 0x3a2c12)
      .setAngle(i % 2 ? 3 : -3);
    const t = s.add
      .text(p.x, p.y, texts[i] ?? '', {
        fontSize: '19px',
        color: '#3a2c12',
        align: 'center',
        wordWrap: { width: 220 },
      })
      .setOrigin(0.5)
      .setAngle(card.angle);
    ctx.layer.add([card, t, s.add.circle(p.x, p.y - 42, 6, 0xd32f2f)]);
    return t;
  });
}

/**
 * D11 Freddy Mode. Laugh: wrong theories (cat, cooker, Wi-Fi).
 * Break: they become right, and the middle of the board is a picture of your
 * own screen at the moment you died (rendered locally, never uploaded).
 */
export const d11: DeathScene = {
  id: 'd11_freddy',
  horrorLevelRequired: 3,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 6,

  async runLaugh(ctx) {
    backdrop(ctx, 0x000000, 0.8);
    board(ctx, c.wrong);
    const freddy = ctx.scene.add.image(CX, 340, 'squad_freddy');
    ctx.layer.add(freddy);
    ctx.subtitles.say(SQUAD_NAMES.freddy, c.freddyLaugh, { holdMs: 2500 });
    await ctx.wait(3500);
    await ctx.waitForInput(600, 3000);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x000000, 0.85);
    const cards = board(ctx, c.wrong);
    const right = rightTheories(factsFor(ctx.store.state, ctx.death));
    for (let i = 0; i < cards.length; i++) {
      await ctx.wait(1300);
      ctx.sfx('typing_tick');
      cards[i]?.setText(right[i] ?? '');
    }
    await ctx.wait(1200);
    if (s.textures.exists('last_frame')) {
      const shot = s.add.image(CX, 340, 'last_frame').setDisplaySize(320, 180).setAngle(2);
      ctx.layer.add([s.add.rectangle(CX, 340, 334, 194, 0xffffff).setAngle(2), shot]);
      ctx.layer.add(
        s.add
          .text(CX, 450, c.screenshot, { fontSize: '16px', color: '#b01e1e', fontStyle: 'bold' })
          .setOrigin(0.5),
      );
    }
    await ctx.wait(1500);
    ctx.subtitles.say(SQUAD_NAMES.freddy, c.freddyBreak, { rate: 0.5, holdMs: 3500 });
    await ctx.wait(3500);
    await ctx.waitForInput(600, 4000);
  },
};
