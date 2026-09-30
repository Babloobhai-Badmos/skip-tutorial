import Phaser from 'phaser';
import ui from '../content/ui.json';
import { getStore } from '../core/gameState';
import { Menu } from '../ui/menu';
import { GAME_HEIGHT, GAME_WIDTH, TEXT, COLORS } from '../ui/theme';
import { goTo } from './navigate';

const t = ui.title;

export class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const store = getStore();
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(cx, 130, t.name, TEXT.title).setOrigin(0.5);
    this.add.text(cx, 200, t.subtitle, { ...TEXT.body, color: COLORS.dim }).setOrigin(0.5);

    // Pintu, nervously hovering by the menu. He is fine. He says he is fine.
    const pintu = this.add.image(1040, 470, 'pintu');
    this.tweens.add({
      targets: pintu,
      y: 462,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const hasProgress = store.state.deathCount > 0 || store.state.timePlayedMs > 0;
    new Menu(
      this,
      [
        {
          label: () => (hasProgress ? t.continue : t.start),
          onSelect: () => goTo(this, 'TutorialScene'),
        },
        { label: () => t.settings, onSelect: () => goTo(this, 'Settings') },
        {
          label: () => (store.state.caseFiles.length > 0 ? t.caseFiles : t.caseFilesEmpty),
          // Case file menu arrives with the CID engine (M4).
          enabled: () => false,
        },
        { label: () => t.contentNotice, onSelect: () => goTo(this, 'ContentNotice') },
      ],
      { x: cx, y: 330, spacing: 56 },
    ).refresh();

    this.add.text(cx, GAME_HEIGHT - 40, t.footer, TEXT.small).setOrigin(0.5);
  }
}
