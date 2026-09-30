import ui from '../content/ui.json';
import { Menu } from '../ui/menu';
import { COLORS, GAME_WIDTH, TEXT } from '../ui/theme';
import { GameplayScene } from './GameplayScene';
import { goTo, type SceneData } from './navigate';

/** Stands in for any scene that hasn't been built yet. */
export class Placeholder extends GameplayScene {
  private intended = '';

  constructor() {
    super('Placeholder');
  }

  init(data: SceneData): void {
    this.intended = data.intended ?? '';
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.text(cx, 220, this.intended, TEXT.mono).setOrigin(0.5);
    this.add.text(cx, 290, ui.placeholder.heading, TEXT.heading).setOrigin(0.5);
    this.add.text(cx, 350, ui.placeholder.body, TEXT.body).setOrigin(0.5);
    new Menu(
      this,
      [
        { label: () => ui.placeholder.tutorial, onSelect: () => goTo(this, 'TutorialScene') },
        { label: () => ui.placeholder.back, onSelect: () => goTo(this, 'Title') },
      ],
      { x: cx, y: 460, spacing: 52 },
    ).refresh();
    this.setupPause();
  }
}
