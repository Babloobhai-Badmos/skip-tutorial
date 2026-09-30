import content from '../content/deaths.json';
import { SQUAD_NAMES } from '../cid/format';
import { addGadbad } from '../cid/gadbadCounter';
import { backdrop, CX, CY, memeText } from './helpers';
import type { DeathScene } from './types';

const c = content.d09;

/**
 * D09 Kuch Toh Gadbad Hai. Laugh: the ACP finds gadbad in everything and the
 * counter races. Break: it counts when nothing is wrong. The only thing that
 * changed is your face.
 */
export const d09: DeathScene = {
  id: 'd09_gadbad',
  horrorLevelRequired: 2,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 3,

  async runLaugh(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x0d1a2b, 0.94);
    const acp = s.add.image(CX - 200, CY + 20, 'squad_acp').setScale(1.4);
    const counter = memeText(ctx, CX + 230, CY - 40, '', 54);
    ctx.layer.add(acp);
    const show = () =>
      counter.setText(c.counter.replace('{n}', String(ctx.store.state.gadbadCount)));
    show();
    ctx.sfx('sting_zoom');
    const things = ctx.rng.shuffle(c.things).slice(0, 3);
    for (const thing of things) {
      await ctx.wait(900);
      ctx.subtitles.say(SQUAD_NAMES.acp, thing + c.suffix, { holdMs: 3000 });
      addGadbad(ctx.store, 1, 'd09');
      show();
      s.tweens.add({ targets: counter, scale: 1.25, duration: 90, yoyo: true });
      await ctx.wait(1300);
    }
    await ctx.waitForInput(600, 2500);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x0d1a2b, 0.96);
    const acp = s.add.image(CX - 200, CY + 20, 'squad_acp').setScale(1.4);
    const you = s.add.image(CX + 200, CY + 20, 'portrait_player').setScale(1.4);
    const counter = memeText(
      ctx,
      CX,
      110,
      c.counter.replace('{n}', String(ctx.store.state.gadbadCount)),
      40,
    );
    ctx.layer.add([acp, you]);
    // Nothing happens. For a while.
    await ctx.wait(3000);
    // The counter moves by itself. No line, no sound.
    addGadbad(ctx.store, 1, 'd09:nothing');
    counter.setText(c.counter.replace('{n}', String(ctx.store.state.gadbadCount)));
    await ctx.wait(2000);
    // Only your face changed.
    you.setTexture('portrait_player_wrong');
    await ctx.wait(2500);
    ctx.subtitles.say(SQUAD_NAMES.acp, c.breakLine, { rate: 0.5, holdMs: 4000 });
    await ctx.wait(2500);
    await ctx.waitForInput(600, 4000);
  },
};
