import ui from '../content/ui.json';
import { flashOrFade } from '../ui/effects';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';
import { GameplayScene } from './GameplayScene';
import { goTo } from './navigate';

const t = ui.tutorialStub;

/** M1 stub: proves the gameplay-scene plumbing (pause, flow, persistence). */
export class TutorialScene extends GameplayScene {
  private lineIndex = 0;

  constructor() {
    super('TutorialScene');
  }

  create(): void {
    this.lineIndex = 0;
    this.cameras.main.setBackgroundColor(0x1d1b24);
    this.add.rectangle(0, GAME_HEIGHT - 80, GAME_WIDTH, 80, 0x2d2a36).setOrigin(0); // floor
    this.add.text(40, 30, t.heading, TEXT.heading);

    this.add.image(320, GAME_HEIGHT - 180, 'pintu');
    this.add.text(270, GAME_HEIGHT - 300, t.pintu, { ...TEXT.small, color: COLORS.accent });

    const bubble = this.add
      .text(420, 220, t.lines[0] ?? '', { ...TEXT.body, wordWrap: { width: 700 } })
      .setOrigin(0, 0.5);

    const door = this.add
      .text(GAME_WIDTH - 60, GAME_HEIGHT - 120, t.next, TEXT.menu)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    const openDoor = () => goTo(this, 'Level1Hall');
    door.on('pointerdown', openDoor);
    this.input.keyboard?.on('keydown-RIGHT', openDoor);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, t.hint, TEXT.small).setOrigin(0.5);

    const advance = () => {
      this.lineIndex = (this.lineIndex + 1) % t.lines.length;
      bubble.setText(t.lines[this.lineIndex] ?? '');
    };
    this.input.keyboard?.on('keydown-ENTER', advance);
    this.input.keyboard?.on('keydown-SPACE', advance);

    flashOrFade(this, 0xffffff, 200);
    this.setupPause();
  }
}
