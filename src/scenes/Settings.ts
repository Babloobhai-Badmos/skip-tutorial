import Phaser from 'phaser';
import ui from '../content/ui.json';
import { Menu } from '../ui/menu';
import { settingsMenuItems } from '../ui/settingsItems';
import { COLORS, GAME_WIDTH, TEXT } from '../ui/theme';
import { goTo } from './navigate';

interface SettingsData {
  /** Opened from the pause overlay rather than the title screen. */
  fromPause?: boolean;
}

export class Settings extends Phaser.Scene {
  private fromPause = false;

  constructor() {
    super('Settings');
  }

  init(data: SettingsData): void {
    this.fromPause = data.fromPause === true;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, 720, COLORS.bg).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 70, ui.settings.heading, TEXT.heading).setOrigin(0.5);

    new Menu(
      this,
      [
        ...settingsMenuItems(),
        { label: () => '', heading: true },
        { label: () => ui.settings.back, onSelect: () => this.back() },
      ],
      { x: 250, y: 170, spacing: 42, align: 'left' },
    ).refresh();

    this.input.keyboard?.on('keydown-ESC', () => this.back());
  }

  private back(): void {
    if (this.fromPause) {
      this.scene.stop();
      this.scene.wake('Pause');
    } else {
      goTo(this, 'Title');
    }
  }
}
