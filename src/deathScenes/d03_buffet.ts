import content from '../content/deaths.json';
import { backdrop, CX, memeText } from './helpers';
import type { DeathContext, DeathScene } from './types';

const c = content.d03;
const PAUSE_KEYS = new Set(['Escape', 'p', 'P']);

/** Every control, relabelled. Pure, so it can be tested. */
export function acceptControls(): { key: string; label: string }[] {
  return ['←', '→', '↑', 'Space', 'Enter', 'E'].map((key) => ({ key, label: c.accept }));
}

function lineup(ctx: DeathContext) {
  const s = ctx.scene;
  const aunties = [0, 1, 2, 3].map((i) =>
    s.add.image(CX - 330 + i * 220, 470, `aunty_${i}`).setScale(1.6),
  );
  ctx.layer.add(aunties);
  const you = s.add.image(CX, 250, 'portrait_player').setScale(0.9);
  ctx.layer.add(you);
  return { aunties, you };
}

/**
 * D03 Shaadi Buffet. Laugh: "Thoda aur lo beta", plates pile up, Sanskaar.
 * Break: every control says Accept. The aunties smile. Nobody blinks. The
 * music gets happier.
 */
export const d03: DeathScene = {
  id: 'd03_buffet',
  horrorLevelRequired: 2,
  causes: ['buffet', 'sanskaar'],
  general: false,
  unlockCondition: () => true,

  async runLaugh(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x3b1d2e, 0.92);
    memeText(ctx, CX, 70, c.card, 48);
    const { you } = lineup(ctx);
    const bar = s.add.rectangle(CX - 150, 140, 300, 16, 0xffb300).setOrigin(0, 0.5);
    const label = s.add
      .text(CX, 166, c.sanskaarLabels[0] ?? '', { fontSize: '16px', color: '#ffe082' })
      .setOrigin(0.5);
    ctx.layer.add([bar, label]);
    for (let i = 0; i < c.offers.length; i++) {
      ctx.subtitles.say('Aunty', c.offers[i] ?? '', { holdMs: 900 });
      const plate = s.add.image(CX, you.y - 80 - i * 9, 'plate').setScale(2);
      ctx.layer.add(plate);
      bar.width = 300 * (1 - (i + 1) / c.offers.length);
      label.setText(c.sanskaarLabels[Math.min(i + 1, c.sanskaarLabels.length - 1)] ?? '');
      await ctx.wait(900);
    }
    memeText(ctx, CX, 640, c.punch, 24);
    await ctx.waitForInput(800, 3500);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x3b1d2e, 0.95);
    const { you } = lineup(ctx);
    // Happier music. Faster, higher. It doesn't stop when it should.
    const { startBand } = await import('../audio/music');
    const stop = startBand(s, { tempo: 176, pitch: 1.26 });
    const prompts = acceptControls()
      .map((k) => `${k.key}: ${k.label}`)
      .join('     ');
    ctx.layer.add(
      s.add.text(CX, 120, prompts, { fontSize: '18px', color: '#ffe082' }).setOrigin(0.5),
    );
    ctx.layer.add(
      s.add.text(CX, 150, c.acceptHint, { fontSize: '14px', color: '#cfcadb' }).setOrigin(0.5),
    );
    ctx.subtitles.caption(c.smile, 6000);
    let accepted = 0;
    const onKey = (e: KeyboardEvent) => {
      if (PAUSE_KEYS.has(e.key)) return;
      accepted++;
      ctx.layer.add(s.add.image(CX, you.y - 80 - accepted * 9, 'plate').setScale(2));
    };
    s.input.keyboard?.on('keydown', onKey);
    await ctx.wait(7000);
    s.input.keyboard?.off('keydown', onKey);
    stop();
    await ctx.waitForInput(400, 2500);
  },
};
