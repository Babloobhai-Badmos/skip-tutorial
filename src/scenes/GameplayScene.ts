import Phaser from 'phaser';
import { events } from '../core/events';
import type { SceneKey } from '../core/sceneFlow';

/**
 * Base for every scene where the player is playing. Guarantees pause is always
 * available (Esc / P), and auto-pauses when the tab/window loses focus.
 */
export abstract class GameplayScene extends Phaser.Scene {
  protected setupPause(): void {
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', this.openPause, this);
    kb?.on('keydown-P', this.openPause, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.openPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.openPause, this);
    });
  }

  openPause(): void {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause', { from: this.scene.key as SceneKey });
    events.emit('pause:opened');
  }
}
