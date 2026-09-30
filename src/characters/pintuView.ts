import Phaser from 'phaser';
import pintuContent from '../content/pintu.json';
import { hasLost } from '../core/pintuLoss';
import type { PintuLossEntry } from '../core/stateSchema';
import { COLORS, TEXT } from '../ui/theme';
import type { PintuState } from './pintu';

/**
 * Pintu drawn from separate parts, so the loss system can quietly remove them.
 * Origin is the point between his feet.
 */
export class PintuView extends Phaser.GameObjects.Container {
  private readonly head: Phaser.GameObjects.Image;
  private readonly torso: Phaser.GameObjects.Image;
  private readonly legL: Phaser.GameObjects.Image;
  private readonly legR: Phaser.GameObjects.Image;
  private readonly nameTag: Phaser.GameObjects.Text;
  private t = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.legL = scene.add.image(-11, -20, 'pintu_leg');
    this.legR = scene.add.image(11, -20, 'pintu_leg');
    this.torso = scene.add.image(0, -84, 'pintu_body');
    this.head = scene.add.image(0, -158, 'pintu_head');
    this.nameTag = scene.add
      .text(0, -222, pintuContent.speaker, { ...TEXT.small, color: COLORS.accent })
      .setOrigin(0.5);
    this.add([this.legL, this.legR, this.torso, this.head, this.nameTag]);
    scene.add.existing(this);
  }

  /** Reflect what he has lost. Never animated, never announced: it's just gone. */
  applyLosses(losses: readonly PintuLossEntry[]): void {
    this.nameTag.setVisible(!hasLost(losses, 'nameTag'));
    this.legL.setVisible(!hasLost(losses, 'leftLeg'));
    this.legR.setVisible(!hasLost(losses, 'rightLeg'));
  }

  /** Body language per brain state. Call every frame. */
  animate(state: PintuState, dtMs: number): void {
    this.t += dtMs / 1000;
    const t = this.t;
    let bob = Math.sin(t * 3) * 1.5; // nervous idle sway
    let shake = 0;
    let bow = 0;
    if (state === 'talking') bob = Math.sin(t * 14) * 2.5;
    if (state === 'panicking') shake = Math.sin(t * 60) * 2.5;
    if (state === 'apologizing') bow = 14;
    this.head.setPosition(shake + bow * 0.9, -158 + bob + bow * 0.4);
    this.torso.setPosition(shake * 0.5, -84 + bob * 0.4).setAngle(bow * 0.6);
  }
}
