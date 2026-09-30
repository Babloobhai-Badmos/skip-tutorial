import Phaser from 'phaser';
import { COLORS, TEXT } from './theme';

export interface MenuItem {
  /** Called on every refresh, so labels can reflect live state (e.g. ON/OFF). */
  label: () => string;
  onSelect?: () => void;
  enabled?: () => boolean;
  /** Non-interactive section heading. */
  heading?: boolean;
}

export interface MenuOptions {
  x: number;
  y: number;
  spacing?: number;
  align?: 'left' | 'center';
  style?: Phaser.Types.GameObjects.Text.TextStyle;
}

/**
 * Vertical menu usable with keyboard (Up/Down/W/S + Enter/Space) and mouse.
 * Keyboard support is required: no scene may be mouse-only.
 */
export class Menu {
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Phaser.GameObjects.Text;
  private focus = -1;
  private readonly offs: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly items: MenuItem[],
    opts: MenuOptions,
  ) {
    const spacing = opts.spacing ?? 44;
    const originX = opts.align === 'left' ? 0 : 0.5;
    items.forEach((item, i) => {
      const t = scene.add
        .text(
          opts.x,
          opts.y + i * spacing,
          '',
          item.heading ? TEXT.small : (opts.style ?? TEXT.menu),
        )
        .setOrigin(originX, 0.5);
      if (!item.heading) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerover', () => this.setFocus(i));
        t.on('pointerdown', () => this.activate(i));
      }
      this.texts.push(t);
    });

    this.cursor = scene.add
      .text(0, 0, '>', { ...(opts.style ?? TEXT.menu), color: COLORS.accent })
      .setOrigin(1, 0.5)
      .setVisible(false);

    const kb = scene.input.keyboard;
    if (kb) {
      const bind = (event: string, fn: () => void) => {
        kb.on(event, fn);
        this.offs.push(() => kb.off(event, fn));
      };
      bind('keydown-UP', () => this.move(-1));
      bind('keydown-W', () => this.move(-1));
      bind('keydown-DOWN', () => this.move(1));
      bind('keydown-S', () => this.move(1));
      bind('keydown-ENTER', () => this.activate(this.focus));
      bind('keydown-SPACE', () => this.activate(this.focus));
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());

    this.move(1);
  }

  refresh(): void {
    this.items.forEach((item, i) => {
      const t = this.texts[i];
      if (!t) return;
      const selectable = this.isSelectable(i);
      const focused = i === this.focus;
      t.setText(item.label());
      if (!item.heading) {
        t.setColor(!selectable ? COLORS.disabled : focused ? COLORS.accent : COLORS.text);
      }
    });
    const focused = this.texts[this.focus];
    this.cursor.setVisible(!!focused);
    if (focused) {
      const left = focused.x - focused.displayWidth * focused.originX;
      this.cursor.setPosition(left - 12, focused.y);
    }
  }

  destroy(): void {
    this.offs.splice(0).forEach((off) => off());
  }

  private isSelectable(i: number): boolean {
    const item = this.items[i];
    return !!item && !item.heading && (item.enabled?.() ?? true);
  }

  private setFocus(i: number): void {
    if (!this.isSelectable(i)) return;
    this.focus = i;
    this.refresh();
  }

  private move(dir: 1 | -1): void {
    const n = this.items.length;
    for (let step = 1; step <= n; step++) {
      const i = (((this.focus + dir * step) % n) + n) % n;
      if (this.isSelectable(i)) {
        this.focus = i;
        break;
      }
    }
    this.refresh();
  }

  private activate(i: number): void {
    if (!this.isSelectable(i)) return;
    this.focus = i;
    this.items[i]?.onSelect?.();
    // The action may have stopped the scene; only refresh if we're still alive.
    if (this.scene.sys.isActive()) this.refresh();
  }
}
