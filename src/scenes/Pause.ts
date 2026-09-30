import Phaser from 'phaser';
import ui from '../content/ui.json';
import { events } from '../core/events';
import { canTransition, GAMEPLAY_SCENES, type SceneKey } from '../core/sceneFlow';
import { Menu } from '../ui/menu';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../ui/theme';

interface PauseData {
  from: SceneKey;
}

/** Overlay launched on top of a paused GameplayScene. Quit is always here. */
export class Pause extends Phaser.Scene {
  private from: SceneKey = 'Title';
  private openedAt = 0;

  constructor() {
    super('Pause');
  }

  init(data: PauseData): void {
    this.from = data.from;
  }

  create(): void {
    // Game-loop clock, not the scene clock: the scene clock is stale after sleep/wake.
    this.openedAt = this.game.loop.time;
    this.events.on(Phaser.Scenes.Events.WAKE, () => (this.openedAt = this.game.loop.time));
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0);
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, 460, 360, COLORS.panel)
      .setStrokeStyle(2, COLORS.panelEdge);
    this.add.text(cx, 230, ui.pause.heading, TEXT.heading).setOrigin(0.5);

    new Menu(
      this,
      [
        { label: () => ui.pause.resume, onSelect: () => this.resumeGame() },
        { label: () => ui.pause.settings, onSelect: () => this.openSettings() },
        { label: () => ui.pause.quit, onSelect: () => this.quit() },
      ],
      { x: cx, y: 320, spacing: 56 },
    ).refresh();

    this.add.text(cx, 500, ui.pause.hint, TEXT.small).setOrigin(0.5);

    const kb = this.input.keyboard;
    const resumeKey = () => {
      // Ignore the key-press that opened (or returned to) this menu.
      if (this.game.loop.time - this.openedAt > 150) this.resumeGame();
    };
    kb?.on('keydown-ESC', resumeKey);
    kb?.on('keydown-P', resumeKey);
  }

  private resumeGame(): void {
    this.scene.stop();
    this.scene.resume(this.from);
    events.emit('pause:closed');
  }

  private openSettings(): void {
    this.scene.sleep();
    this.scene.launch('Settings', { fromPause: true });
    this.scene.bringToTop('Settings');
  }

  private quit(): void {
    if (!canTransition(this.from, 'Title')) {
      console.error(`Quit from ${this.from} is not in the transition table`);
    }
    // Stop every gameplay scene, not just the one that opened the menu:
    // a Death overlay sits on top of a paused level.
    for (const key of GAMEPLAY_SCENES) {
      if (this.scene.isActive(key) || this.scene.isPaused(key) || this.scene.isSleeping(key)) {
        this.scene.stop(key);
      }
    }
    events.emit('pause:closed');
    this.scene.start('Title');
    events.emit('scene:enter', { key: 'Title' });
  }
}
