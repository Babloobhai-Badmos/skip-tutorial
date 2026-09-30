/** Small Web Audio building blocks shared by the sfx presets. */

let noiseCache: WeakMap<BaseAudioContext, AudioBuffer> | undefined;

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  noiseCache ??= new WeakMap();
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Deterministic noise (LCG) - avoids Math.random so sounds are repeatable.
    let x = 12345;
    for (let i = 0; i < data.length; i++) {
      x = (x * 1103515245 + 12345) >>> 0;
      data[i] = (x / 0xffffffff) * 2 - 1;
    }
    noiseCache.set(ctx, buf);
  }
  return buf;
}

/** Attack / hold / release envelope on a fresh GainNode. */
export function envelope(
  ctx: BaseAudioContext,
  dest: AudioNode,
  t0: number,
  attack: number,
  hold: number,
  release: number,
  peak = 1,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
  g.gain.setValueAtTime(Math.max(peak, 0.0002), t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  g.connect(dest);
  return g;
}

export function tone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  opts: {
    type?: OscillatorType;
    freq: number;
    freqEnd?: number;
    t0: number;
    attack?: number;
    hold?: number;
    release?: number;
    peak?: number;
    detune?: number;
  },
): OscillatorNode {
  const { t0, attack = 0.005, hold = 0.05, release = 0.1, peak = 0.5 } = opts;
  const env = envelope(ctx, dest, t0, attack, hold, release, peak);
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + attack + hold + release);
  }
  if (opts.detune) osc.detune.value = opts.detune;
  osc.connect(env);
  osc.start(t0);
  osc.stop(t0 + attack + hold + release + 0.05);
  return osc;
}

export function noise(
  ctx: BaseAudioContext,
  dest: AudioNode,
  opts: {
    t0: number;
    attack?: number;
    hold?: number;
    release?: number;
    peak?: number;
    filter?: BiquadFilterType;
    freq?: number;
    freqEnd?: number;
    q?: number;
  },
): AudioBufferSourceNode {
  const { t0, attack = 0.005, hold = 0.05, release = 0.1, peak = 0.5 } = opts;
  const env = envelope(ctx, dest, t0, attack, hold, release, peak);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  let node: AudioNode = src;
  if (opts.filter) {
    const f = ctx.createBiquadFilter();
    f.type = opts.filter;
    f.frequency.setValueAtTime(opts.freq ?? 1000, t0);
    if (opts.freqEnd !== undefined) {
      f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + attack + hold + release);
    }
    f.Q.value = opts.q ?? 1;
    src.connect(f);
    node = f;
  }
  node.connect(env);
  src.start(t0, (t0 * 7.3) % 1.5);
  src.stop(t0 + attack + hold + release + 0.05);
  return src;
}
