import type Phaser from 'phaser';
import content from '../content/deaths.json';
import { SQUAD_NAMES } from '../cid/format';
import type { DeathLogEntry } from '../core/stateSchema';
import { backdrop, CX } from './helpers';
import type { DeathContext, DeathScene } from './types';

const c = content.d10;

/** The report's fields for a death. Pure, so it can be tested. */
export function reportFields(death: DeathLogEntry): [string, string][] {
  return c.fields.map(([k, v]) => [k ?? '', (v ?? '').replace('{x}', String(death.x))]);
}

/** Break: the time of death drifts from the past into the future. */
export function timeDrift(): string[] {
  return [...c.drift];
}

const TIME_FIELD = 'Maut ka samay';

/**
 * D10 Postmortem Report. Laugh: precise nonsense from Dr. Salunkhe.
 * Break: "kal hui" -> "abhi hogi". Case unsolved. Suspect is watching.
 */
export const d10: DeathScene = {
  id: 'd10_postmortem',
  horrorLevelRequired: 2,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 2,

  async runLaugh(ctx) {
    await drawReport(ctx, false);
    ctx.subtitles.say(SQUAD_NAMES.salunkhe, c.watch, { holdMs: 3000 });
    await ctx.waitForInput(1200, 4000);
  },

  async runBreak(ctx) {
    const timeText = await drawReport(ctx, true);
    for (const t of timeDrift().slice(1)) {
      await ctx.wait(1700);
      ctx.sfx('typing_tick');
      timeText?.setText(t);
    }
    await ctx.wait(1500);
    const s = ctx.scene;
    const last = s.add
      .text(CX, 560, c.unsolved, {
        fontFamily: '"Courier New", monospace',
        fontSize: '22px',
        color: '#7a1f1f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    ctx.layer.add(last);
    await ctx.wait(2500);
    await ctx.waitForInput(600, 4000);
  },
};

/** Draws the report paper; returns the "time of death" value text. */
async function drawReport(ctx: DeathContext, instant: boolean) {
  const s = ctx.scene;
  backdrop(ctx, 0x000000, 0.8);
  const paper = s.add.rectangle(CX, 350, 620, 560, 0xf4efe0).setStrokeStyle(2, 0x9a927e);
  const mono = { fontFamily: '"Courier New", monospace', color: '#222222' };
  const title = s.add
    .text(CX, 110, c.title, { ...mono, fontSize: '28px', fontStyle: 'bold' })
    .setOrigin(0.5);
  ctx.layer.add([paper, title]);
  let timeText: Phaser.GameObjects.Text | undefined;
  let y = 170;
  for (const [k, v] of reportFields(ctx.death)) {
    const key = s.add.text(CX - 280, y, `${k}:`, { ...mono, fontSize: '19px' });
    const val = s.add.text(CX - 40, y, v, {
      ...mono,
      fontSize: '19px',
      fontStyle: 'bold',
      wordWrap: { width: 310 },
    });
    ctx.layer.add([key, val]);
    if (k === TIME_FIELD) timeText = val;
    y += val.height + 22;
    if (!instant) {
      ctx.sfx('typing_tick');
      await ctx.wait(450);
    }
  }
  ctx.layer.add(
    s.add
      .text(CX + 150, 600, c.signed, { ...mono, fontSize: '16px', fontStyle: 'italic' })
      .setOrigin(0.5),
  );
  return timeText;
}
