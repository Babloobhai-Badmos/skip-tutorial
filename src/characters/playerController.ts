import Phaser from 'phaser';

export const PLAYER_SPEED = 220;
export const PLAYER_JUMP = 520;

type KeyName = 'left' | 'right' | 'up' | 'a' | 'd' | 'w' | 'space';

export interface PlayerFrame {
  left: boolean;
  right: boolean;
  grounded: boolean;
  jumped: boolean;
  /** Left was just pressed this frame. */
  lookedLeft: boolean;
}

/** Shared platformer movement for the player (tutorial, hall, later levels). */
export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key>;
  enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('keyboard required');
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      left: K.LEFT,
      right: K.RIGHT,
      up: K.UP,
      a: K.A,
      d: K.D,
      w: K.W,
      space: K.SPACE,
    }) as Record<KeyName, Phaser.Input.Keyboard.Key>;
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Reads input and moves. `extraVx` is for treadmills, conveyor belts, etc. */
  update(extraVx = 0): PlayerFrame {
    const k = this.keys;
    const JD = Phaser.Input.Keyboard.JustDown;
    const grounded = this.body.blocked.down || this.body.touching.down;
    // JustDown must be polled every frame or it fires late, so read it first.
    const lookedLeft = JD(k.left) || JD(k.a);
    const jumpPressed = JD(k.up) || JD(k.w) || JD(k.space);
    if (!this.enabled) {
      this.sprite.setVelocityX(0);
      return { left: false, right: false, grounded, jumped: false, lookedLeft: false };
    }
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const input = (right ? 1 : 0) - (left ? 1 : 0);
    this.sprite.setVelocityX(input * PLAYER_SPEED + extraVx);
    if (input !== 0) this.sprite.setFlipX(input < 0);
    const jumped = jumpPressed && grounded;
    if (jumped) this.sprite.setVelocityY(-PLAYER_JUMP);
    return { left, right, grounded, jumped, lookedLeft };
  }

  placeAt(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }
}
