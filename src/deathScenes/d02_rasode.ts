import content from '../content/deaths.json';
import type { DeathContext, DeathScene } from './types';
import { backdrop, CX, CY, memeText } from './helpers';

const c = content.d02;

export interface WhistleStep {
  pitch: number;
  volume: number;
  /** Silent whistles still animate steam, but make no sound and no caption. */
  silent: boolean;
  /** How far the cooker hops (px). */
  hop: number;
}

/** Laugh: three whistles, each louder and sillier. Break adds a 4th: silence. */
export function whistleSteps(breakPhase: boolean): WhistleStep[] {
  const laugh: WhistleStep[] = [
    { pitch: 1, volume: 0.6, silent: false, hop: 8 },
    { pitch: 1.18, volume: 0.8, silent: false, hop: 16 },
    { pitch: 1.42, volume: 1, silent: false, hop: 30 },
  ];
  return breakPhase ? [...laugh, { pitch: 1.6, volume: 0, silent: true, hop: 0 }] : laugh;
}

function drawCooker(ctx: DeathContext) {
  const s = ctx.scene;
  const x = CX;
  const y = CY + 90;
  const body = s.add.rectangle(x, y, 150, 110, 0xb9bcc2).setStrokeStyle(3, 0x777a80);
  const handle = s.add.rectangle(x + 120, y - 40, 110, 14, 0x222222);
  const lid = s.add.container(x, y - 60, [
    s.add.ellipse(0, 0, 160, 26, 0xa8abb1).setStrokeStyle(3, 0x777a80),
    s.add.rectangle(0, -22, 22, 26, 0x333333), // the whistle weight
  ]);
  const gap = s.add.rectangle(x, y - 55, 146, 2, 0x000000).setOrigin(0.5, 1);
  const group = s.add.container(0, 0, [handle, body, gap, lid]);
  ctx.layer.add(group);
  return { group, lid, gap, whistleTop: { x, y: y - 96 } };
}

function steam(ctx: DeathContext, x: number, y: number) {
  for (let i = 0; i < 5; i++) {
    const puff = ctx.scene.add.circle(x + (i - 2) * 6, y, 10 + i * 2, 0xffffff, 0.5);
    ctx.layer.add(puff);
    ctx.scene.tweens.add({
      targets: puff,
      y: y - 90 - i * 18,
      alpha: 0,
      scale: 2,
      duration: 900 + i * 120,
      onComplete: () => puff.destroy(),
    });
  }
}

async function playWhistles(
  ctx: DeathContext,
  steps: WhistleStep[],
  cooker: ReturnType<typeof drawCooker>,
) {
  for (const step of steps) {
    steam(ctx, cooker.whistleTop.x, cooker.whistleTop.y);
    if (!step.silent) {
      ctx.sfx('whistle', { pitch: step.pitch, volume: step.volume });
      ctx.scene.tweens.add({
        targets: cooker.group,
        y: -step.hop,
        duration: 120,
        yoyo: true,
        ease: 'Quad.out',
      });
    }
    await ctx.wait(step.silent ? 2400 : 1500);
  }
}

/**
 * D02 Rasode Mein Kaun Tha. Laugh: the whistles get louder and sillier.
 * Break: the 4th whistle is silence. The lid lifts from inside. Black. "Serves 1."
 */
export const d02: DeathScene = {
  id: 'd02_rasode',
  horrorLevelRequired: 2,
  causes: ['cooker'],
  general: false,
  unlockCondition: () => true,

  async runLaugh(ctx) {
    backdrop(ctx, 0x3a2a1a, 0.92);
    const title = memeText(ctx, CX, 120, c.card, 60);
    const cooker = drawCooker(ctx);
    await playWhistles(ctx, whistleSteps(false), cooker);
    memeText(ctx, CX, CY + 250, c.punch, 26);
    await ctx.waitForInput(800, 3500);
    void title;
  },

  async runBreak(ctx) {
    backdrop(ctx, 0x3a2a1a, 0.92);
    memeText(ctx, CX, 120, c.card, 60);
    const cooker = drawCooker(ctx);
    const steps = whistleSteps(true);
    // Replay quickly up to the 3rd, then the silent 4th gets the full stage.
    await playWhistles(ctx, steps, cooker);
    // The lid lifts. From inside. Slowly.
    ctx.scene.tweens.add({
      targets: cooker.lid,
      y: cooker.lid.y - 26,
      duration: 3200,
      ease: 'Sine.inOut',
    });
    ctx.scene.tweens.add({ targets: cooker.gap, scaleY: 14, duration: 3200, ease: 'Sine.inOut' });
    await ctx.wait(3400);
    // Cut to black. No fade: a cut.
    backdrop(ctx, 0x000000, 1);
    const serves = ctx.scene.add
      .text(CX, CY, c.servesOne, {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#d8d0bd',
      })
      .setOrigin(0.5);
    ctx.layer.add(serves);
    await ctx.wait(1200);
    await ctx.waitForInput(600, 3000);
  },
};
