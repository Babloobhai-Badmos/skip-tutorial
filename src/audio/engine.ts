import { events } from '../core/events';
import { getStore } from '../core/gameState';
import { defaultMixerState, effectiveGain, type Channel, type MixerState } from './mixer';
import { SFX, type PlayOpts, type SfxName } from './sfx';

/**
 * Owns the AudioContext. Created lazily and resumed on the first user gesture
 * (the content notice's Continue). If Web Audio is unavailable the game still
 * runs: every play() becomes a no-op and subtitles carry the sound.
 */
export class AudioEngine {
  readonly mixer: MixerState = defaultMixerState();
  private readonly buses = new Map<Channel, GainNode>();

  constructor(readonly ctx: AudioContext) {
    for (const ch of Object.keys(this.mixer.channelGain) as Channel[]) {
      const g = ctx.createGain();
      g.connect(ctx.destination);
      this.buses.set(ch, g);
    }
  }

  play(name: SfxName, opts: PlayOpts = {}): number {
    const preset = SFX[name];
    const gain = effectiveGain(getStore().state.settings, this.mixer, {
      channel: preset.channel,
      category: preset.category,
      voiceIndex: opts.voiceIndex,
      jumpscare: preset.jumpscare,
      volume: opts.volume,
    });
    // Captions fire even when muted: the game must be playable with sound off.
    if (preset.captioned) events.emit('sfx:played', { name });
    if (gain <= 0 || this.ctx.state !== 'running') return 0;
    const bus = this.buses.get(preset.channel);
    if (!bus) return 0;
    const out = this.ctx.createGain();
    out.gain.value = gain;
    out.connect(bus);
    const t0 = this.ctx.currentTime + 0.01;
    const dur = preset.render(this.ctx, out, t0, opts);
    setTimeout(() => out.disconnect(), (dur + 0.5) * 1000);
    return dur;
  }

  setAudienceVoiceMuted(index: number, muted: boolean): void {
    const next = new Set(this.mixer.mutedAudienceVoices);
    if (muted) next.add(index);
    else next.delete(index);
    this.mixer.mutedAudienceVoices = next;
  }
}

let engine: AudioEngine | null | undefined;

function create(): AudioEngine | null {
  try {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new AudioEngine(new Ctor()) : null;
  } catch {
    return null;
  }
}

/** Call from a user gesture (click / key). Safe to call repeatedly. */
export function unlockAudio(): void {
  engine ??= create();
  void engine?.ctx.resume().catch(() => undefined);
}

/** Plays a sound if audio is available; returns its length in seconds (0 if silent). */
export function sfx(name: SfxName, opts?: PlayOpts): number {
  if (engine === undefined) engine = create();
  if (!engine) {
    if (SFX[name].captioned) events.emit('sfx:played', { name });
    return 0;
  }
  return engine.play(name, opts);
}

export function getAudio(): AudioEngine | null {
  return engine ?? null;
}
