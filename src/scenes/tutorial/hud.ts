import type Phaser from 'phaser';
import ui from '../../content/ui.json';
import { TUTORIAL_STATIONS, type TutorialStation } from '../../core/stateSchema';
import { formatClock } from '../../tutorial/confidentWalk';
import { COLORS, GAME_WIDTH, TEXT } from '../../ui/theme';

const t = ui.tutorial;

/** The station checklist. This is the "UI panel" Pintu can lose. */
export class TutorialChecklist {
  readonly container: Phaser.GameObjects.Container;
  private readonly rows = new Map<TutorialStation, Phaser.GameObjects.Text>();

  constructor(scene: Phaser.Scene) {
    const items: Phaser.GameObjects.GameObject[] = [
      scene.add
        .rectangle(0, 0, 300, 150, 0x000000, 0.45)
        .setOrigin(0)
        .setStrokeStyle(1, COLORS.panelEdge),
      scene.add.text(12, 8, t.panelHeading, {
        ...TEXT.small,
        color: COLORS.accent,
        fontStyle: 'bold',
      }),
    ];
    TUTORIAL_STATIONS.forEach((station, i) => {
      const row = scene.add.text(12, 34 + i * 26, '', { ...TEXT.small, color: COLORS.text });
      this.rows.set(station, row);
      items.push(row);
    });
    this.container = scene.add.container(16, 48, items).setDepth(800);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  update(done: readonly TutorialStation[], walkMs: number): void {
    for (const [station, row] of this.rows) {
      const mark = done.includes(station) ? '☑' : '☐';
      const extra =
        station === 'walk' && !done.includes('walk') ? `  ${formatClock(walkMs)}/3:00` : '';
      row.setText(`${mark} ${t.stations[station]}${extra}`);
    }
  }
}

/** [SKIP]. Tempting. Always visible. Always. */
export function buildSkipButton(scene: Phaser.Scene, onSkip: () => void): void {
  const btn = scene.add
    .text(GAME_WIDTH - 24, 56, t.skip, {
      ...TEXT.menu,
      fontStyle: 'bold',
      color: '#111111',
      backgroundColor: '#ffcc33',
      padding: { x: 14, y: 8 },
    })
    .setOrigin(1, 0.5)
    .setDepth(850)
    .setInteractive({ useHandCursor: true });
  scene.tweens.add({
    targets: btn,
    scale: 1.06,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });
  btn.on('pointerdown', onSkip);
}
