import Phaser from 'phaser';
import ui from '../content/ui.json';
import { getStore } from '../core/gameState';
import { Menu } from '../ui/menu';
import { settingsMenuItems } from '../ui/settingsItems';
import { COLORS, GAME_WIDTH, TEXT } from '../ui/theme';
import { goTo } from './navigate';

const c = ui.contentNotice;

/** Startup safety screen (spec section 13). Shown on every launch. */
export class ContentNotice extends Phaser.Scene {
  constructor() {
    super('ContentNotice');
  }

  create(): void {
    const store = getStore();
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(cx, 50, c.heading, TEXT.heading).setOrigin(0.5);
    this.add.text(cx, 130, c.body.join('\n'), { ...TEXT.body, align: 'center' }).setOrigin(0.5);
    this.add
      .text(cx, 210, c.privacy, { ...TEXT.small, align: 'center', color: COLORS.accent })
      .setOrigin(0.5);
    if (!store.persistent) {
      this.add
        .text(cx, 250, c.storageWarning, { ...TEXT.small, color: COLORS.danger })
        .setOrigin(0.5);
    }

    const menu = new Menu(
      this,
      [
        ...settingsMenuItems(),
        { label: () => '', heading: true },
        { label: () => c.continue, onSelect: () => this.continue() },
      ],
      { x: 250, y: 282, spacing: 32, align: 'left', style: { ...TEXT.menu, fontSize: '20px' } },
    );
    menu.refresh();

    this.add.text(cx, 690, c.hint, TEXT.small).setOrigin(0.5);
  }

  private continue(): void {
    getStore().update('contentNotice:seen', (d) => {
      d.flags.seenContentNotice = true;
    });
    // Browsers keep audio locked until a user gesture: this click is it.
    const ctx = (this.sound as Partial<Phaser.Sound.WebAudioSoundManager>).context;
    void ctx?.resume?.().catch(() => undefined);
    goTo(this, 'Title');
  }
}
