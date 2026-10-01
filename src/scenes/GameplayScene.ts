import Phaser from 'phaser';
import { events } from '../core/events';
import type { SceneKey } from '../core/sceneFlow';

/**
 * Base for every scene where the player is playing. Guarantees pause is always
 * available (Esc / P), and auto-pauses when the tab/window loses focus.
 */
export abstract class GameplayScene extends Phaser.Scene {
  protected setupPause(): void {
    this.pausePending = false;
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', this.openPause, this);
    kb?.on('keydown-P', this.openPause, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.openPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.openPause, this);
    });
  }

  private pausePending = false;

  /**
   * Hook run before the pause menu opens. Return a delay in ms to postpone
   * (never cancel) it - D12's "pausing hangs up the call". Default: none.
   */
  protected beforePause(): number {
    return 0;
  }

  openPause(): void {
    if (!this.scene.isActive() || this.pausePending) return;
    const delay = this.beforePause();
    if (delay > 0) {
      this.pausePending = true;
      this.time.delayedCall(delay, () => {
        this.pausePending = false;
        this.doPause();
      });
      return;
    }
    this.doPause();
  }

  private doPause(): void {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause', { from: this.scene.key as SceneKey });
    events.emit('pause:opened');
  }
}
