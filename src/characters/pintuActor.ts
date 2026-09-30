import type Phaser from 'phaser';
import pintuContent from '../content/pintu.json';
import ui from '../content/ui.json';
import { sfx } from '../audio/engine';
import { getStore } from '../core/gameState';
import { hasLost, lostVoiceLines } from '../core/pintuLoss';
import type { Rng } from '../core/rng';
import type { SubtitleBar } from '../ui/subtitleBar';
import {
  degrade,
  PintuBrain,
  selectLine,
  speechRate,
  type PintuLine,
  type PintuMood,
} from './pintu';
import type { PintuView } from './pintuView';

export const PINTU_LINES = pintuContent.lines as PintuLine[];

/** Shared across scene visits so he doesn't greet you with the same line every time. */
const recent: string[] = [];

/** Glue between Pintu's brain, his body, the subtitle bar and his voice blips. */
export class PintuActor {
  readonly brain = new PintuBrain();
  /** ms since he last said anything (drives idle chatter). */
  quietMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly view: PintuView,
    private readonly subtitles: SubtitleBar,
    private readonly rng: Rng,
  ) {
    this.refreshBody();
  }

  /** Re-read losses from the store (after a skip, a recovery, etc). */
  refreshBody(): void {
    const losses = getStore().state.pintuLoss;
    this.view.applyLosses(losses);
    this.subtitles.panelEnabled = !hasLost(losses, 'uiPanel');
  }

  /**
   * Say something for this moment. Before the Act 2 turn he avoids scared
   * lines; after it he prefers them. Returns how long it holds (ms).
   */
  say(context: string, mood?: PintuMood): number {
    const state = getStore().state;
    const skipped = state.flags.skippedTutorial;
    const line = selectLine(PINTU_LINES, {
      context,
      mood: mood ?? (skipped ? 'scared' : undefined),
      avoidMoods: skipped ? [] : ['scared'],
      lossCount: state.pintuLoss.length,
      lostIds: lostVoiceLines(state.pintuLoss),
      recent,
      rng: this.rng,
    });
    return this.speak(line);
  }

  /** Say one exact line (e.g. a voice line that just came back). */
  sayLine(id: string): number {
    return this.speak(PINTU_LINES.find((l) => l.id === id) ?? null);
  }

  /** Only talk if he isn't already talking. */
  sayIfFree(context: string, mood?: PintuMood): number {
    return this.brain.busy ? 0 : this.say(context, mood);
  }

  update(dtMs: number): void {
    this.quietMs += dtMs;
    this.view.animate(this.brain.update(dtMs), dtMs);
  }

  private speak(line: PintuLine | null): number {
    const losses = getStore().state.pintuLoss;
    const lossCount = losses.length;
    const speaker = hasLost(losses, 'nameTag') ? '' : pintuContent.speaker;
    this.quietMs = 0;
    if (!line) {
      // Nothing left to say here. Silence, never an explanation.
      this.brain.panic(1200);
      this.subtitles.say(speaker, ui.tutorial.silence, { rate: 0.3 });
      return 1500;
    }
    recent.push(line.id);
    if (recent.length > 6) recent.shift();
    const holdMs = this.brain.say(line, lossCount);
    const rate = speechRate(lossCount);
    const pitchBase = 1.15 - lossCount * 0.04;
    this.subtitles.say(speaker, degrade(line.text, lossCount), {
      rate,
      holdMs: 1800,
      onBlip: () => sfx('pintu_blip', { pitch: pitchBase + this.rng.next() * 0.2 }),
    });
    return holdMs;
  }

  get sceneRef(): Phaser.Scene {
    return this.scene;
  }
}
