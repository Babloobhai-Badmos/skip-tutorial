import type Phaser from 'phaser';
import content from '../content/cid.json';
import { tapeMustache } from '../characters/squadArt';
import { getStore } from '../core/gameState';
import type { DeathContext } from '../deathScenes/types';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import { fileCase } from './caseFiles';
import { capitalize, SQUAD_NAMES } from './format';
import { addGadbad } from './gadbadCounter';
import type { Investigation, SquadMember } from './types';

const SPOTS: Record<SquadMember, { x: number; y: number }> = {
  daya: { x: 250, y: 250 },
  acp: { x: 450, y: 230 },
  salunkhe: { x: 650, y: 250 },
  freddy: { x: 850, y: 270 },
};
/** The sting's three rising hits (see sfx.ts sting_zoom). */
const HIT_MS = [550, 810, 1070];

/**
 * The Chodu CID investigation (spec section 9). Same voices, stings and
 * layout whether the LogicModule or the TruthModule wrote the script.
 */
export async function runInvestigation(ctx: DeathContext, inv: Investigation): Promise<void> {
  const s = ctx.scene;
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    ctx.layer.add(o);
    return o;
  };

  // The office: dark blue, a cork case board, a bad lamp.
  add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d1a2b, 0.96).setOrigin(0));
  add(s.add.rectangle(1080, 250, 300, 260, 0x8b6b4a).setStrokeStyle(8, 0x5a3f22));
  add(
    s.add
      .text(1080, 140, `CASE #${inv.caseNumber}`, {
        ...TEXT.small,
        color: '#2a1a0a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
  add(
    s.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 110, content.skipHint, TEXT.small).setOrigin(1, 0.5),
  );

  // 1. Dramatic zoom sting: ACP, Daya, Salunkhe - one face per hit.
  const portraits = new Map<SquadMember, Phaser.GameObjects.Image>();
  for (const who of ['freddy', 'daya', 'acp', 'salunkhe'] as const) {
    const p = add(s.add.image(SPOTS[who].x, SPOTS[who].y, `squad_${who}`).setAlpha(0));
    portraits.set(who, p);
    add(
      s.add
        .text(SPOTS[who].x, SPOTS[who].y + 100, SQUAD_NAMES[who], {
          ...TEXT.small,
          color: COLORS.dim,
        })
        .setOrigin(0.5),
    );
  }
  const pop = ctx.store.state.settings.reduceJumpscares ? 1.12 : 1.5;
  ctx.sfx('sting_zoom');
  (['acp', 'daya', 'salunkhe'] as const).forEach((who, i) => {
    s.time.delayedCall(HIT_MS[i] ?? 0, () => {
      const p = portraits.get(who);
      if (!p) return;
      p.setAlpha(1).setScale(pop);
      s.tweens.add({ targets: p, scale: 1, duration: 220, ease: 'Quad.out' });
    });
  });
  await ctx.wait(1500);

  const focus = (who: SquadMember | null) => {
    for (const [k, p] of portraits) {
      if (k === 'freddy' && who !== 'freddy' && p.alpha === 0) continue;
      p.setAlpha(who === null ? 0.25 : k === who ? 1 : 0.45);
    }
  };
  const readMs = (text: string) => 900 + text.length * 45;
  const say = async (speaker: string, text: string, blip?: () => void) => {
    ctx.subtitles.say(speaker, text, { holdMs: 60_000, onBlip: blip });
    await ctx.waitForInput(300, readMs(text));
  };

  let suspectCard: Phaser.GameObjects.Container | undefined;

  // 2-3. The investigation, the accusation, "sach bol do", the confession.
  for (const line of inv.lines) {
    if (line.speaker === 'suspect') {
      focus(null);
      if (suspectCard)
        s.tweens.add({
          targets: suspectCard,
          x: suspectCard.x + 3,
          duration: 50,
          yoyo: true,
          repeat: 5,
        });
      const voice = inv.suspect.isPlayer
        ? () => ctx.sfx('player_voice', { pitch: 0.9 + ctx.rng.next() * 0.2 })
        : () => ctx.sfx('pintu_blip', { pitch: 0.55 + ctx.rng.next() * 0.1 });
      await say(capitalize(inv.suspect.label), line.text, voice);
      continue;
    }
    if (line.speaker === 'unasked') {
      // Nobody asked. Everyone is still looking at the suspect.
      focus(null);
      await ctx.wait(1400);
      await say('', line.text, () => ctx.sfx('player_voice', { pitch: 0.8 }));
      continue;
    }
    if (line.speaker === 'freddy') {
      portraits.get('freddy')?.setAlpha(1);
    }
    focus(line.speaker);
    if (line.kind === 'opening') addGadbad(getStore());
    await say(SQUAD_NAMES[line.speaker], line.text);
    if (line.kind === 'accuse') suspectCard = add(showSuspect(ctx, inv));
    if (line.kind === 'demand') {
      ctx.subtitles.clear();
      await ctx.wait(inv.confessionPauseMs);
    }
  }

  // 4. Case filed.
  fileCase(ctx.store, inv);
  const stamp = add(
    s.add
      .text(1080, 330, `${content.stamp.replace('{n}', String(inv.caseNumber))}\n${inv.caseName}`, {
        fontFamily: 'Impact, "Arial Black", sans-serif',
        fontSize: '24px',
        color: '#b01e1e',
        align: 'center',
        stroke: '#b01e1e',
        strokeThickness: 1,
        wordWrap: { width: 260 },
      })
      .setOrigin(0.5)
      .setAngle(-12)
      .setScale(1.6)
      .setAlpha(0),
  );
  s.tweens.add({ targets: stamp, scale: 1, alpha: 0.9, duration: 160, ease: 'Quad.in' });
  ctx.sfx('bass_crack', { volume: 0.35, pitch: 1.4 });
  await ctx.waitForInput(500, 2200);
  ctx.subtitles.clear();
}

/** The suspect on the case board, with a moustache taped on. */
function showSuspect(ctx: DeathContext, inv: Investigation): Phaser.GameObjects.Container {
  const s = ctx.scene;
  const parts: Phaser.GameObjects.GameObject[] = [];
  if (inv.suspect.isPlayer) {
    parts.push(s.add.image(0, 0, 'portrait_player').setScale(0.9));
  } else {
    parts.push(s.add.rectangle(0, 0, 200, 110, 0xf1e6c8).setStrokeStyle(3, 0x3a2c12));
    parts.push(
      s.add
        .text(0, -10, inv.suspect.label.toUpperCase(), {
          ...TEXT.body,
          fontSize: '20px',
          color: '#3a2c12',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5),
    );
  }
  const card = s.add.container(1080, 250, parts).setAngle(3);
  const m = tapeMustache(s, 0, inv.suspect.isPlayer ? 14 : 30, 0.9).setAlpha(0);
  card.add(m);
  s.tweens.add({ targets: m, alpha: 1, y: m.y + 4, duration: 250, delay: 400 });
  return card;
}
