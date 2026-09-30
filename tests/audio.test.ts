import { describe, expect, it } from 'vitest';
import sfxContent from '../src/content/sfx.json';
import { FAMOUS_RINGTONE_REFERENCE, intervals, JINGLE, midiToHz } from '../src/audio/melody';
import { defaultMixerState, effectiveGain, JUMPSCARE_CAP } from '../src/audio/mixer';
import { SFX, SFX_NAMES } from '../src/audio/sfx';
import { defaultSettings } from '../src/settings/accessibility';

describe('mixer', () => {
  const settings = { ...defaultSettings(), masterVolume: 1 };
  const mixer = defaultMixerState();

  it('multiplies master, channel and volume', () => {
    expect(effectiveGain(settings, mixer, { channel: 'voice', category: 'voices' })).toBe(1);
    expect(
      effectiveGain({ ...settings, masterVolume: 0.5 }, mixer, {
        channel: 'sfx',
        category: 'ui',
        volume: 0.5,
      }),
    ).toBeCloseTo(0.5 * 0.9 * 0.5);
  });

  it('muted categories are silent', () => {
    const muted = { ...settings, mutedSfxCategories: ['stings' as const] };
    expect(effectiveGain(muted, mixer, { channel: 'sfx', category: 'stings' })).toBe(0);
    expect(effectiveGain(muted, mixer, { channel: 'sfx', category: 'ui' })).toBeGreaterThan(0);
  });

  it('caps jump-scare stings instead of removing them', () => {
    const q = { channel: 'sfx' as const, category: 'stings' as const, jumpscare: true };
    const full = effectiveGain(settings, mixer, q);
    const capped = effectiveGain({ ...settings, reduceJumpscares: true }, mixer, q);
    expect(capped).toBeCloseTo(full * JUMPSCARE_CAP);
    expect(capped).toBeGreaterThan(0);
  });

  it('can mute a single audience voice', () => {
    const m = { ...mixer, mutedAudienceVoices: new Set([3]) };
    const q = { channel: 'sitcom_audience' as const, category: 'audience' as const };
    expect(effectiveGain(settings, m, { ...q, voiceIndex: 3 })).toBe(0);
    expect(effectiveGain(settings, m, { ...q, voiceIndex: 4 })).toBeGreaterThan(0);
  });
});

describe('sfx presets', () => {
  it('all ten spec presets exist', () => {
    for (const name of [
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
    ]) {
      expect(SFX_NAMES).toContain(name);
    }
  });

  it('every captioned sound has a caption for sound-off play', () => {
    const captions = sfxContent.captions as Record<string, string>;
    for (const name of SFX_NAMES) {
      if (SFX[name].captioned) expect(captions[name], name).toBeTruthy();
    }
  });
});

describe('jingle', () => {
  it('is 8 notes', () => {
    expect(JINGLE).toHaveLength(8);
  });

  it('shares no run of 3 intervals with the famous ringtone', () => {
    const ours = intervals(JINGLE.map(([n]) => n)).join(',');
    const theirs = intervals(FAMOUS_RINGTONE_REFERENCE);
    for (let i = 0; i + 3 <= theirs.length; i++) {
      const run = theirs.slice(i, i + 3).join(',');
      expect(ours.includes(run), `shared run ${run}`).toBe(false);
    }
  });

  it('midiToHz', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });
});
