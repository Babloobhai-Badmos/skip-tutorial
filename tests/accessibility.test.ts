import { describe, expect, it } from 'vitest';
import {
  allowsJumpscare,
  defaultSettings,
  flashStyle,
  isSfxMuted,
  normalizeSettings,
  toggleSfxCategory,
} from '../src/settings/accessibility';

describe('accessibility settings', () => {
  it('defaults: no mic, no cam, subtitles on', () => {
    const s = defaultSettings();
    expect(s.micOptIn).toBe(false);
    expect(s.camOptIn).toBe(false);
    expect(s.subtitles).toBe(true);
  });

  it('reduceFlashing turns flashes into fades', () => {
    expect(flashStyle(defaultSettings())).toBe('flash');
    expect(flashStyle({ ...defaultSettings(), reduceFlashing: true })).toBe('fade');
  });

  it('reduceJumpscares disallows jump scares', () => {
    expect(allowsJumpscare(defaultSettings())).toBe(true);
    expect(allowsJumpscare({ ...defaultSettings(), reduceJumpscares: true })).toBe(false);
  });

  it('toggles sfx categories', () => {
    let s = defaultSettings();
    s = toggleSfxCategory(s, 'audience');
    expect(isSfxMuted(s, 'audience')).toBe(true);
    s = toggleSfxCategory(s, 'audience');
    expect(isSfxMuted(s, 'audience')).toBe(false);
  });

  it('subtitles cannot be switched off via a save file', () => {
    expect(normalizeSettings({ subtitles: false }).subtitles).toBe(true);
    expect(normalizeSettings({ masterVolume: 7 }).masterVolume).toBe(1);
    expect(normalizeSettings('garbage')).toEqual(defaultSettings());
  });
});
