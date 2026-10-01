import content from '../content/deaths.json';
import { getAudio } from '../audio/engine';
import type { DeathLogEntry } from '../core/stateSchema';
import type { MenuItem } from '../ui/menu';
import { backdrop, CX, memeText } from './helpers';
import type { DeathScene } from './types';

const c = content.d06;

/**
 * The audience, revealed: one channel per earlier death (offline these are
 * your own; in M8 they include other players'). Pure, so it can be tested.
 */
export function audienceVoices(
  log: readonly DeathLogEntry[],
  max = 6,
): { index: number; label: string }[] {
  return log
    .slice(0, -1) // not the death that just happened
    .slice(-max)
    .map((d, index) => ({
      index,
      label: c.voice
        .replace('{n}', String(d.id))
        .replace('{x}', String(d.x))
        .replace('{cause}', d.cause),
    }));
}

/**
 * D06 Laugh Track. Laugh: the audience that's been laughing at every death
 * gets its moment. Break: the hidden mixer. Mute one, and under the laugh
 * someone is screaming.
 */
export const d06: DeathScene = {
  id: 'd06_laughTrack',
  horrorLevelRequired: 2,
  causes: [],
  general: true,
  unlockCondition: (s) => s.deathCount >= 3,

  async runLaugh(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x000000, 0.8);
    const sign = s.add.rectangle(CX, 300, 420, 110, 0x330000).setStrokeStyle(4, 0x661111);
    ctx.layer.add(sign);
    const text = memeText(ctx, CX, 300, c.sign, 56).setColor('#ff3b3b');
    for (let i = 0; i < 3; i++) {
      text.setAlpha(1);
      for (let v = 0; v < 6; v++)
        s.time.delayedCall(v * 90, () => ctx.sfx('sitcom_laugh', { voiceIndex: v }));
      await ctx.wait(1300);
      text.setAlpha(0.3);
      await ctx.wait(300);
    }
    await ctx.waitForInput(500, 2000);
  },

  async runBreak(ctx) {
    const s = ctx.scene;
    backdrop(ctx, 0x000000, 0.9);
    memeText(ctx, CX, 80, c.mixerTitle, 40);
    const voices = audienceVoices(ctx.store.state.deathLog);
    const engine = getAudio();
    const muted = new Set<number>();
    // The audience keeps laughing the whole time.
    const loop = s.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () =>
        voices.forEach((v) =>
          s.time.delayedCall(v.index * 80, () =>
            ctx.sfx('sitcom_laugh', { voiceIndex: v.index, volume: 0.6 }),
          ),
        ),
    });
    // Lazy: the menu pulls in Phaser, and this module must load in Node tests.
    const { Menu } = await import('../ui/menu');
    await new Promise<void>((done) => {
      const items: MenuItem[] = voices.length
        ? voices.map((v) => ({
            label: () => `${muted.has(v.index) ? c.muted : c.live}   ${v.label}`,
            onSelect: () => {
              if (muted.has(v.index)) return;
              muted.add(v.index);
              engine?.setAudienceVoiceMuted(v.index, true);
              ctx.sfx('scream', { volume: 0.5 });
            },
          }))
        : [{ label: () => c.nobody, heading: true }];
      items.push(
        { label: () => '', heading: true },
        { label: () => '[ OK ]', onSelect: () => done() },
      );
      const menu = new Menu(s, items, {
        x: CX - 300,
        y: 170,
        spacing: 44,
        align: 'left',
        depth: 950,
      });
      menu.refresh();
      ctx.layer.add(
        s.add.text(CX, 620, c.hint, { fontSize: '14px', color: '#8a8799' }).setOrigin(0.5),
      );
      s.time.delayedCall(25_000, () => done());
    });
    loop.remove();
    // Put the audience back the way it was. They'll be at the next one.
    muted.forEach((i) => engine?.setAudienceVoiceMuted(i, false));
  },
};
