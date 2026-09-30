import content from '../content/deaths.json';
import type { Rng } from '../core/rng';
import type { DeathLogEntry } from '../core/stateSchema';
import { ChatPanel, type ChatMessage } from '../ui/whatsappUi';
import { backdrop, clockTime } from './helpers';
import type { DeathScene } from './types';

const c = content.d07;
const TIPS = c.tips as Record<string, string[]>;

export interface ChatBeat {
  msg: ChatMessage;
  /** ms before this message appears */
  delay: number;
  /** ms after appearing until its ticks turn blue (me-messages only) */
  blueAfter?: number;
}

/**
 * Laugh: Pintu texts a tip about how you died; you (auto) reply 👍 and it
 * gets read. Break: your own death arrives as a message, gets read, and
 * someone starts typing. Pure, so it can be tested.
 */
export function chatScript(death: DeathLogEntry, breakPhase: boolean, rng: Rng): ChatBeat[] {
  const time = clockTime(death.timestamp);
  const tips = TIPS[death.cause] ?? TIPS.default ?? [];
  const beats: ChatBeat[] = tips.slice(0, 2 + rng.int(0, 1)).map((text, i) => ({
    msg: { from: 'them', text, time, forwarded: i === 0 && rng.chance(0.3) },
    delay: i === 0 ? 400 : 900,
  }));
  beats.push({
    msg: { from: 'me', text: c.reply, time, ticks: 'grey' },
    delay: 800,
    blueAfter: 900,
  });
  if (breakPhase) {
    beats.push({
      msg: {
        from: 'me',
        text: c.deathMessage.replace('{x}', String(death.x)).replace('{time}', time),
        time,
        ticks: 'grey',
      },
      delay: 1600,
      blueAfter: 2600,
    });
  }
  return beats;
}

/**
 * D07 Blue Ticks. Break: the two grey ticks under your death turn blue, and a
 * typing indicator starts that never finishes.
 */
export const d07: DeathScene = {
  id: 'd07_blueTicks',
  horrorLevelRequired: 1,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 2,

  async runLaugh(ctx) {
    await play(ctx, false);
  },

  async runBreak(ctx) {
    await play(ctx, true);
  },
};

async function play(ctx: Parameters<DeathScene['runLaugh']>[0], breakPhase: boolean) {
  backdrop(ctx, 0x000000, 0.55);
  const panel = new ChatPanel(ctx.scene, 390, 70, 500, 560, c.title, c.status);
  ctx.layer.add(panel.container);
  for (const beat of chatScript(ctx.death, breakPhase, ctx.rng)) {
    await ctx.wait(beat.delay);
    ctx.sfx('typing_tick');
    const handle = panel.add(beat.msg);
    if (beat.blueAfter !== undefined) {
      await ctx.wait(beat.blueAfter);
      handle.setTicks('blue');
    }
  }
  if (breakPhase) {
    await ctx.wait(1400);
    panel.showTyping(c.typing); // ...and it never finishes.
    await ctx.wait(4000);
  }
  const hint = ctx.scene.add
    .text(640, 660, c.dismiss, { fontSize: '14px', color: '#8696a0' })
    .setOrigin(0.5);
  ctx.layer.add(hint);
  await ctx.waitForInput(600, breakPhase ? undefined : 5000);
}
