import { isSfxMuted, type Settings, type SfxCategory } from '../settings/accessibility';

/**
 * Pure mixing rules (no Web Audio), so they can be unit-tested.
 * Channels are the spec's mixer buses; categories are the player's mute toggles.
 */
export const CHANNELS = ['music', 'sfx', 'voice', 'sitcom_audience'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface MixerState {
  channelGain: Record<Channel, number>;
  /** Per-voice mutes inside sitcom_audience (twist #6 / D06). */
  mutedAudienceVoices: ReadonlySet<number>;
}

export function defaultMixerState(): MixerState {
  return {
    channelGain: { music: 0.6, sfx: 0.9, voice: 1, sitcom_audience: 0.7 },
    mutedAudienceVoices: new Set(),
  };
}

export interface GainQuery {
  channel: Channel;
  category: SfxCategory;
  /** Only for sitcom_audience sounds. */
  voiceIndex?: number;
  /** Flashy stings are capped when reduceJumpscares is on. */
  jumpscare?: boolean;
  volume?: number;
}

export const JUMPSCARE_CAP = 0.35;

/** Final linear gain for one sound, master volume included. */
export function effectiveGain(settings: Settings, mixer: MixerState, q: GainQuery): number {
  if (isSfxMuted(settings, q.category)) return 0;
  if (
    q.channel === 'sitcom_audience' &&
    q.voiceIndex !== undefined &&
    mixer.mutedAudienceVoices.has(q.voiceIndex)
  ) {
    return 0;
  }
  const cap = q.jumpscare && settings.reduceJumpscares ? JUMPSCARE_CAP : 1;
  const g = settings.masterVolume * mixer.channelGain[q.channel] * (q.volume ?? 1) * cap;
  return Math.max(0, Math.min(1, g));
}
