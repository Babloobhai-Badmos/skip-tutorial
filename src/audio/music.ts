import type Phaser from 'phaser';
import { sfx } from './engine';

/**
 * A tiny step sequencer on the scene clock (so it pauses with the scene).
 * Used for the wedding band; D03's break plays the same loop, happier.
 */
const SHEHNAI = [0, 2, 4, 5, 4, 2, 4, 7]; // original 8-step phrase (semitones)

export function startBand(scene: Phaser.Scene, opts: { tempo?: number; pitch?: number } = {}) {
  const stepMs = 60_000 / (opts.tempo ?? 132) / 2;
  const pitch = opts.pitch ?? 1;
  let step = 0;
  const ev = scene.time.addEvent({
    delay: stepMs,
    loop: true,
    callback: () => {
      if (step % 2 === 0) sfx('dhol', { pitch: step % 4 === 0 ? 1 : 1.3, volume: 0.7 });
      if (step % 2 === 0) {
        const semis = SHEHNAI[(step / 2) % SHEHNAI.length] ?? 0;
        sfx('shehnai', { pitch: pitch * 2 ** (semis / 12), volume: 0.35 });
      }
      step++;
    },
  });
  return () => ev.remove();
}
