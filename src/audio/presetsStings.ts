import type { SfxPreset } from './sfx';
import { noise, tone } from './synth';

/** Stings and hits: the betrayal tools. */
export const STINGS_PRESETS = {
  sting_zoom: {
    channel: 'sfx',
    category: 'stings',
    jumpscare: true,
    captioned: true,
    // pitch < 1 also slows it down: the same sting, overstaying (D01 break).
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      noise(ctx, dest, {
        t0,
        attack: 0.35 / p,
        hold: 0.05 / p,
        release: 0.15 / p,
        peak: 0.5,
        filter: 'bandpass',
        freq: 300 * p,
        freqEnd: 4000 * p,
        q: 2,
      });
      [110, 147, 196].forEach((f, i) => {
        const t = t0 + (0.55 + i * 0.26) / p;
        tone(ctx, dest, {
          type: 'sawtooth',
          freq: f * p,
          t0: t,
          hold: 0.08 / p,
          release: 0.25 / p,
          peak: 0.45,
        });
        tone(ctx, dest, {
          type: 'square',
          freq: (f / 2) * p,
          t0: t,
          hold: 0.06 / p,
          release: 0.2 / p,
          peak: 0.3,
        });
        noise(ctx, dest, {
          t0: t,
          hold: 0.02,
          release: 0.12 / p,
          peak: 0.4,
          filter: 'lowpass',
          freq: 900 * p,
        });
      });
      return 1.4 / p;
    },
  },

  // Daya's kick. Reused for things that are not cracking.
  bass_crack: {
    channel: 'sfx',
    category: 'stings',
    jumpscare: true,
    captioned: true,
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      tone(ctx, dest, { freq: 90 * p, freqEnd: 32 * p, t0, hold: 0.05, release: 0.6, peak: 0.55 });
      noise(ctx, dest, {
        t0,
        hold: 0.01,
        release: 0.18,
        peak: 0.35,
        filter: 'highpass',
        freq: 1800,
      });
      noise(ctx, dest, {
        t0: t0 + 0.02,
        hold: 0.03,
        release: 0.3,
        peak: 0.2,
        filter: 'lowpass',
        freq: 400,
      });
      return 0.8;
    },
  },

  heartbeat: {
    channel: 'sfx',
    category: 'ambience',
    captioned: true,
    render(ctx, dest, t0) {
      tone(ctx, dest, {
        freq: 62,
        freqEnd: 45,
        t0,
        attack: 0.01,
        hold: 0.04,
        release: 0.15,
        peak: 0.8,
      });
      tone(ctx, dest, {
        freq: 55,
        freqEnd: 40,
        t0: t0 + 0.22,
        attack: 0.01,
        hold: 0.03,
        release: 0.18,
        peak: 0.6,
      });
      return 0.5;
    },
  },
} satisfies Record<string, SfxPreset>;
