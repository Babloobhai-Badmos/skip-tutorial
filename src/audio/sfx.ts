import type { SfxCategory } from '../settings/accessibility';
import { JINGLE, midiToHz } from './melody';
import type { Channel } from './mixer';
import { noise, tone } from './synth';

/** Every sound is synthesized here - no audio files. */
export const SFX_NAMES = [
  'sting_zoom',
  'bass_crack',
  'whistle',
  'nokia_ish_jingle',
  'landline_ring',
  'sitcom_laugh',
  'whisper',
  'heartbeat',
  'typing_tick',
  'xp_error_chime',
  'pintu_blip',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];

export interface PlayOpts {
  /** Pitch multiplier (1 = normal). */
  pitch?: number;
  volume?: number;
  /** sitcom_audience only: which "audience member". */
  voiceIndex?: number;
}

export interface SfxPreset {
  channel: Channel;
  category: SfxCategory;
  /** Capped when reduceJumpscares is on. */
  jumpscare?: boolean;
  /** Shown in the subtitle bar (content/sfx.json) so the game works with sound off. */
  captioned: boolean;
  /** Schedules the sound at t0 into dest; returns its length in seconds. */
  render(ctx: BaseAudioContext, dest: AudioNode, t0: number, opts: PlayOpts): number;
}

export const SFX: Record<SfxName, SfxPreset> = {
  // Zoom whoosh + three rising hits. The betrayal tool: comedy early, horror later.
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
    render(ctx, dest, t0) {
      tone(ctx, dest, { freq: 90, freqEnd: 32, t0, hold: 0.05, release: 0.6, peak: 0.55 });
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
};
