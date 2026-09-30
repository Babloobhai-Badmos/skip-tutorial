import Phaser from 'phaser';

/**
 * Subscribe to a scene's own events for the current visit only.
 * A scene's EventEmitter survives restarts, so a plain `scene.events.on`
 * in create() stacks another listener on every visit - and the stale ones
 * poke objects that were destroyed on the previous shutdown.
 */
export function onThisVisit(
  scene: Phaser.Scene,
  event: string,
  fn: (...args: unknown[]) => void,
): void {
  scene.events.on(event, fn);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(event, fn));
}
