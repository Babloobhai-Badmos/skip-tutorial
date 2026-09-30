import type Phaser from 'phaser';
import { events } from '../core/events';
import { GAMEPLAY_SCENES, planTransition, type SceneKey } from '../core/sceneFlow';

export interface SceneData {
  /** For Placeholder: which scene we actually wanted. */
  intended?: SceneKey;
  [key: string]: unknown;
}

/**
 * The only way scenes move between each other. Illegal transitions are a bug:
 * they throw in dev and fall back to Title in production. Every move into a
 * gameplay scene goes through the WhatsApp-University loading screen.
 */
export function goTo(scene: Phaser.Scene, to: SceneKey, data: SceneData = {}): void {
  const from = scene.scene.key as SceneKey;
  const plan = planTransition(from, to);
  if (!plan.ok) {
    if (import.meta.env.DEV) throw new Error(plan.reason);
    console.error(plan.reason);
    scene.scene.start('Title');
    return;
  }
  const payload = { ...data, intended: plan.intended };
  if (GAMEPLAY_SCENES.has(plan.target)) {
    scene.scene.start('Loading', { next: plan.target, data: payload });
  } else {
    scene.scene.start(plan.target, payload);
  }
  events.emit('scene:enter', { key: plan.intended });
}
