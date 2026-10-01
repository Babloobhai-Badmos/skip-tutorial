import content from '../content/deaths.json';
import type { Rng } from '../core/rng';
import { ChatPanel } from '../ui/whatsappUi';
import { backdrop, clockTime } from './helpers';
import type { DeathScene } from './types';

const c = content.d04;

/**
 * The group's members. Offline: placeholder names. In M8 these become the
 * sanitized names of previous players (from death tips). Pure + seeded.
 */
export function groupMembers(
  rng: Rng,
  you: string,
  others: readonly string[] = c.placeholders,
): string[] {
  return [...rng.shuffle(others).slice(0, 6), you];
}

/**
 * D04 Family Group Chat. Laugh: the relatives react to your death.
 * Break: the member list is everyone who died before you. Then you join.
 */
export const d04: DeathScene = {
  id: 'd04_groupChat',
  horrorLevelRequired: 2,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 5,

  async runLaugh(ctx) {
    backdrop(ctx, 0x000000, 0.55);
    const time = clockTime(ctx.death.timestamp);
    const panel = new ChatPanel(
      ctx.scene,
      390,
      60,
      500,
      580,
      c.group,
      c.members.replace('{n}', '48'),
    );
    ctx.layer.add(panel.container);
    for (const [who, text] of c.laugh) {
      await ctx.wait(900);
      ctx.sfx('typing_tick');
      panel.add({ from: 'them', text: `~ ${who}\n${text}`, time, forwarded: who === 'Chachi' });
    }
    await ctx.waitForInput(800, 4000);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x000000, 0.8);
    const members = groupMembers(ctx.rng, c.you);
    const box = s.add.rectangle(640, 340, 460, 500, 0x111b21).setStrokeStyle(2, 0x2a3942);
    const title = s.add
      .text(640, 120, c.membersTitle, { fontSize: '22px', color: '#e9edef' })
      .setOrigin(0.5);
    ctx.layer.add([box, title]);
    for (let i = 0; i < members.length - 1; i++) {
      await ctx.wait(600);
      const row = s.add.text(450, 170 + i * 46, `●  ${members[i]}`, {
        fontSize: '19px',
        color: '#8696a0',
      });
      ctx.layer.add(row);
    }
    await ctx.wait(2200);
    const you = members.at(-1) ?? c.you;
    const joined = s.add
      .text(640, 520, c.joined.replace('{you}', you), {
        fontSize: '16px',
        color: '#e9edef',
        backgroundColor: '#182229',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);
    ctx.layer.add(joined);
    ctx.sfx('typing_tick');
    await ctx.wait(2500);
    await ctx.waitForInput(600, 4000);
  },
};
