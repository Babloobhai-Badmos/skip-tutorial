import Phaser from 'phaser';
import sfxContent from '../content/sfx.json';
import { events } from '../core/events';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from './theme';

const CAPTIONS = sfxContent.captions as Record<string, string>;

export interface SayOptions {
  /** Characters per second multiplier (Pintu slows down with loss). */
  rate?: number;
  /** How long the full line stays after typing finishes. */
  holdMs?: number;
  /** Called every couple of typed characters (voice blips). */
  onBlip?: () => void;
}

/**
 * Always-on subtitles (spec section 11/13). Every spoken line and every
 * captioned sound appears here so the game is playable with sound off.
 */
export class SubtitleBar {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly lineText: Phaser.GameObjects.Text;
  private readonly captionText: Phaser.GameObjects.Text;
  private typing?: Phaser.Time.TimerEvent;
  private hideTimer?: Phaser.Time.TimerEvent;
  private captionTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    y = GAME_HEIGHT - 52,
  ) {
    const depth = 900;
    this.panel = scene.add
      .rectangle(GAME_WIDTH / 2, y, 1040, 76, 0x000000, 0.72)
      .setStrokeStyle(1, COLORS.panelEdge)
      .setDepth(depth)
      .setScrollFactor(0)
      .setVisible(false);
    this.speakerText = scene.add
      .text(GAME_WIDTH / 2 - 500, y - 26, '', { ...TEXT.small, color: COLORS.accent })
      .setDepth(depth + 1)
      .setScrollFactor(0);
    this.lineText = scene.add
      .text(GAME_WIDTH / 2 - 500, y - 6, '', {
        ...TEXT.body,
        fontSize: '21px',
        wordWrap: { width: 1000 },
      })
      .setDepth(depth + 1)
      .setScrollFactor(0);
    this.captionText = scene.add
      .text(GAME_WIDTH / 2, y - 58, '', { ...TEXT.small, fontStyle: 'italic', color: '#cfcadb' })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setScrollFactor(0);

    const onSfx = ({ name }: { name: string }) => {
      // A paused scene under an overlay must not caption the overlay's sounds.
      if (!scene.sys.isActive()) return;
      const caption = CAPTIONS[name];
      if (caption) this.caption(caption);
    };
    const off = events.on('sfx:played', onSfx);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  /** Whether the dark backing panel is drawn (Pintu can lose his UI panel). */
  panelEnabled = true;

  say(speaker: string, text: string, opts: SayOptions = {}): void {
    this.typing?.remove();
    this.hideTimer?.remove();
    this.speakerText.setText(speaker);
    this.lineText.setText('');
    this.panel.setVisible(this.panelEnabled);
    const perChar = 32 / (opts.rate ?? 1);
    let i = 0;
    this.typing = this.scene.time.addEvent({
      delay: perChar,
      repeat: Math.max(0, text.length - 1),
      callback: () => {
        i++;
        this.lineText.setText(text.slice(0, i));
        const ch = text[i - 1] ?? ' ';
        if (i % 2 === 0 && /\S/.test(ch) && ch !== '.') opts.onBlip?.();
        if (i >= text.length) {
          this.hideTimer = this.scene.time.delayedCall(opts.holdMs ?? 2200, () => this.clear());
        }
      },
    });
    if (text.length === 0) this.clear();
  }

  caption(text: string, ms = 1800): void {
    this.captionTimer?.remove();
    this.captionText.setText(text);
    this.captionTimer = this.scene.time.delayedCall(ms, () => this.captionText.setText(''));
  }

  clear(): void {
    this.typing?.remove();
    this.speakerText.setText('');
    this.lineText.setText('');
    this.panel.setVisible(false);
  }
}
