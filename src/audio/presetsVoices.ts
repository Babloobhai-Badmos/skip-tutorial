import type { SfxPreset } from './sfx';
import { noise, tone } from './synth';

/** Voices: the audience, whispers, Pintu, you. */
export const VOICES_PRESETS = {
  // One "audience member" laughing: formant-filtered noise pulsed at ~5 Hz.
  sitcom_laugh: {
    channel: 'sitcom_audience',
    category: 'audience',
    captioned: true,
    render(ctx, dest, t0, o) {
      const v = o.voiceIndex ?? 0;
      const rate = 0.17 + (v % 5) * 0.012;
      const formant = 650 + (v % 7) * 90;
      const count = 6 + (v % 3);
      for (let i = 0; i < count; i++) {
        const t = t0 + i * rate;
        const peak = 0.9 * (1 - i / (count + 2));
        noise(ctx, dest, {
          t0: t,
          attack: 0.015,
          hold: 0.05,
          release: 0.07,
          peak,
          filter: 'bandpass',
          freq: formant,
          q: 3,
        });
        noise(ctx, dest, {
          t0: t,
          attack: 0.015,
          hold: 0.04,
          release: 0.06,
          peak: peak * 0.5,
          filter: 'bandpass',
          freq: formant * 1.9,
          q: 4,
        });
      }
      return count * rate + 0.2;
    },
  },

  // Breathy whisper: noise through two vowel formants, slow swell.
  whisper: {
    channel: 'voice',
    category: 'voices',
    captioned: true,
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      noise(ctx, dest, {
        t0,
        attack: 0.25,
        hold: 0.5,
        release: 0.6,
        peak: 0.8,
        filter: 'bandpass',
        freq: 900 * p,
        freqEnd: 700 * p,
        q: 5,
      });
      noise(ctx, dest, {
        t0,
        attack: 0.3,
        hold: 0.45,
        release: 0.6,
        peak: 0.5,
        filter: 'bandpass',
        freq: 2300 * p,
        freqEnd: 1900 * p,
        q: 6,
      });
      return 1.4;
    },
  },

  // Pintu's "voice": tiny pitched blips while his subtitle types out.
  pintu_blip: {
    channel: 'voice',
    category: 'voices',
    captioned: false,
    render(ctx, dest, t0, o) {
      const f = 520 * (o.pitch ?? 1);
      tone(ctx, dest, {
        type: 'square',
        freq: f,
        freqEnd: f * 0.85,
        t0,
        attack: 0.003,
        hold: 0.025,
        release: 0.03,
        peak: 0.15,
      });
      return 0.07;
    },
  },

  // "Your" voice for confessions: a low formant murmur, pitch-shifted and
  // entirely synthesized. Never mic audio.
  player_voice: {
    channel: 'voice',
    category: 'voices',
    captioned: false,
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      tone(ctx, dest, {
        type: 'sawtooth',
        freq: 150 * p,
        freqEnd: 128 * p,
        t0,
        attack: 0.01,
        hold: 0.05,
        release: 0.05,
        peak: 0.08,
      });
      noise(ctx, dest, {
        t0,
        attack: 0.01,
        hold: 0.05,
        release: 0.05,
        peak: 0.35,
        filter: 'bandpass',
        freq: 600 * p,
        q: 6,
      });
      noise(ctx, dest, {
        t0,
        attack: 0.01,
        hold: 0.04,
        release: 0.05,
        peak: 0.2,
        filter: 'bandpass',
        freq: 1500 * p,
        q: 8,
      });
      return 0.12;
    },
  },

  // D06: what's under one muted laugh. A long, rising, strained voice - no
  // words, nothing graphic. Capped by reduceJumpscares like any sting.
  scream: {
    channel: 'sitcom_audience',
    category: 'audience',
    jumpscare: true,
    captioned: true,
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      tone(ctx, dest, {
        type: 'sawtooth',
        freq: 380 * p,
        freqEnd: 720 * p,
        t0,
        attack: 0.4,
        hold: 1.2,
        release: 0.6,
        peak: 0.12,
      });
      noise(ctx, dest, {
        t0,
        attack: 0.4,
        hold: 1.2,
        release: 0.6,
        peak: 0.35,
        filter: 'bandpass',
        freq: 1100 * p,
        freqEnd: 1800 * p,
        q: 5,
      });
      return 2.3;
    },
  },
} satisfies Record<string, SfxPreset>;
