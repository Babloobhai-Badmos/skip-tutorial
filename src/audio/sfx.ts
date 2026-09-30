import type { SfxCategory } from '../settings/accessibility';
import type { Channel } from './mixer';
import { HOME_PRESETS } from './presetsHome';
import { STINGS_PRESETS } from './presetsStings';
import { VOICES_PRESETS } from './presetsVoices';

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
  'player_voice',
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
  ...STINGS_PRESETS,
  ...HOME_PRESETS,
  ...VOICES_PRESETS,
};
