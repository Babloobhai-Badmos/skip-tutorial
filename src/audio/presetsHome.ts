import type { SfxPreset } from './sfx';
import { JINGLE, midiToHz } from './melody';
import { noise, tone } from './synth';

/** Household sounds: cooker, phones, UI. */
export const HOME_PRESETS = {
  // Pressure cooker siti: hissing band + a wobbling whistle tone.
  whistle: {
    channel: 'sfx',
    category: 'ambience',
    captioned: true,
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      noise(ctx, dest, {
        t0,
        attack: 0.15,
        hold: 0.8,
        release: 0.3,
        peak: 0.6,
        filter: 'bandpass',
        freq: 2600 * p,
        freqEnd: 3400 * p,
        q: 6,
      });
      const osc = tone(ctx, dest, {
        type: 'triangle',
        freq: 2300 * p,
        freqEnd: 2900 * p,
        t0,
        attack: 0.2,
        hold: 0.7,
        release: 0.3,
        peak: 0.12,
      });
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 9;
      depth.gain.value = 40 * p;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + 1.3);
      return 1.3;
    },
  },

  // Original 8-note ringtone-era melody (see melody.ts).
  nokia_ish_jingle: {
    channel: 'music',
    category: 'phone',
    captioned: false,
    render(ctx, dest, t0, o) {
      const eighth = 0.13;
      let t = t0;
      for (const [midi, len] of JINGLE) {
        const f = midiToHz(midi) * (o.pitch ?? 1);
        tone(ctx, dest, {
          type: 'square',
          freq: f,
          t0: t,
          attack: 0.004,
          hold: len * eighth * 0.7,
          release: 0.05,
          peak: 0.3,
        });
        t += len * eighth;
      }
      return t - t0 + 0.1;
    },
  },

  // Old landline "trring trring": 400 Hz tone chopped at 25 Hz, double ring.
  landline_ring: {
    channel: 'sfx',
    category: 'phone',
    captioned: true,
    render(ctx, dest, t0) {
      for (const start of [0, 0.6]) {
        const osc = tone(ctx, dest, {
          type: 'square',
          freq: 400,
          t0: t0 + start,
          attack: 0.01,
          hold: 0.38,
          release: 0.02,
          peak: 0.3,
        });
        const am = ctx.createOscillator();
        am.type = 'square';
        am.frequency.value = 25;
        const amDepth = ctx.createGain();
        amDepth.gain.value = 30;
        am.connect(amDepth).connect(osc.frequency);
        am.start(t0 + start);
        am.stop(t0 + start + 0.45);
      }
      return 1.1;
    },
  },

  typing_tick: {
    channel: 'sfx',
    category: 'ui',
    captioned: false,
    render(ctx, dest, t0, o) {
      noise(ctx, dest, {
        t0,
        attack: 0.001,
        hold: 0.004,
        release: 0.02,
        peak: 0.3 * (o.volume ?? 1),
        filter: 'highpass',
        freq: 3000,
      });
      return 0.03;
    },
  },

  // Original "something went wrong" chime (not any OS's real sound).
  xp_error_chime: {
    channel: 'sfx',
    category: 'ui',
    captioned: true,
    render(ctx, dest, t0) {
      tone(ctx, dest, { type: 'triangle', freq: 622, t0, hold: 0.08, release: 0.3, peak: 0.3 });
      tone(ctx, dest, {
        type: 'triangle',
        freq: 466,
        t0: t0 + 0.12,
        hold: 0.1,
        release: 0.45,
        peak: 0.3,
      });
      tone(ctx, dest, {
        type: 'sine',
        freq: 233,
        t0: t0 + 0.12,
        hold: 0.1,
        release: 0.5,
        peak: 0.15,
      });
      return 0.8;
    },
  },

  // Wedding band: a dhol hit (low thump + slap) ...
  dhol: {
    channel: 'music',
    category: 'ambience',
    captioned: false,
    render(ctx, dest, t0, o) {
      const p = o.pitch ?? 1;
      tone(ctx, dest, {
        freq: 110 * p,
        freqEnd: 60 * p,
        t0,
        attack: 0.003,
        hold: 0.02,
        release: 0.18,
        peak: 0.6,
      });
      noise(ctx, dest, {
        t0,
        attack: 0.002,
        hold: 0.01,
        release: 0.06,
        peak: 0.25,
        filter: 'bandpass',
        freq: 1800,
        q: 1.5,
      });
      return 0.25;
    },
  },
  // ... and a reedy, nasal melody note (an original tune, played by music.ts).
  shehnai: {
    channel: 'music',
    category: 'ambience',
    captioned: false,
    render(ctx, dest, t0, o) {
      const f = 523 * (o.pitch ?? 1);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 2;
      bp.Q.value = 2;
      bp.connect(dest);
      tone(ctx, bp, {
        type: 'sawtooth',
        freq: f,
        t0,
        attack: 0.03,
        hold: 0.18,
        release: 0.08,
        peak: 0.5,
      });
      tone(ctx, bp, {
        type: 'square',
        freq: f * 1.005,
        t0,
        attack: 0.03,
        hold: 0.18,
        release: 0.08,
        peak: 0.2,
      });
      return 0.3;
    },
  },
} satisfies Record<string, SfxPreset>;
