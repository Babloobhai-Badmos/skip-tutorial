import type Phaser from 'phaser';
import ui from '../../content/ui.json';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT } from '../../ui/theme';

const t = ui.tutorial;

export const FLOOR_Y = 640;
export const TREADMILL = { x: 330, width: 290, top: FLOOR_Y - 22 };
export const JUMP_SPOT_X = 710;
export const LOOK_LEFT_X = 830;
export const WALL = { x: 975, width: 30, height: 88 };
export const DOOR = { x: 1205, width: 76, height: 150 };
export const PINTU_X = 110;
export const PLAYER_START_X = 210;

export interface Room {
  solids: Phaser.Physics.Arcade.StaticGroup;
  treadmill: Phaser.GameObjects.Rectangle;
  belt: Phaser.GameObjects.TileSprite;
  wall: Phaser.GameObjects.Rectangle;
  doorZone: Phaser.GameObjects.Zone;
  treadmillClock: Phaser.GameObjects.Text;
  doorPrompt: Phaser.GameObjects.Text;
}

/** Builds the (cozy, safe, definitely safe) tutorial room. */
export function buildRoom(scene: Phaser.Scene): Room {
  scene.cameras.main.setBackgroundColor(0x2a2433);
  const g = scene.add.graphics();
  // Wallpaper stripes + skirting.
  for (let x = 0; x < GAME_WIDTH; x += 64) g.fillStyle(0x2f2939, 1).fillRect(x, 0, 32, FLOOR_Y);
  g.fillStyle(0x3b3346, 1).fillRect(0, FLOOR_Y - 14, GAME_WIDTH, 14);
  // Window (it is always the same time outside).
  g.fillStyle(0x0f1c2e, 1).fillRect(520, 120, 150, 110);
  g.lineStyle(6, 0x5b4a3a, 1).strokeRect(520, 120, 150, 110);
  g.lineStyle(3, 0x5b4a3a, 1).lineBetween(595, 120, 595, 230).lineBetween(520, 175, 670, 175);
  g.fillStyle(0xf5f1d0, 1).fillCircle(640, 145, 10);
  // Framed poster.
  g.fillStyle(0xe8dcc0, 1).fillRect(1000, 150, 170, 90);
  g.lineStyle(5, 0x6b4f2a, 1).strokeRect(1000, 150, 170, 90);
  scene.add
    .text(1085, 195, t.wallPoster, { ...TEXT.small, color: '#3a2c12', align: 'center' })
    .setOrigin(0.5);

  const solids = scene.physics.add.staticGroup();
  const floor = scene.add
    .rectangle(0, FLOOR_Y, GAME_WIDTH, GAME_HEIGHT - FLOOR_Y, 0x3d3548)
    .setOrigin(0);
  solids.add(floor);

  // Station 1: treadmill.
  const treadmill = scene.add
    .rectangle(TREADMILL.x, TREADMILL.top, TREADMILL.width, 22, 0x555555)
    .setOrigin(0);
  solids.add(treadmill);
  const belt = scene.add
    .tileSprite(TREADMILL.x + 6, TREADMILL.top + 1, TREADMILL.width - 12, 12, 'belt')
    .setOrigin(0);
  const console_ = scene.add
    .rectangle(TREADMILL.x + TREADMILL.width - 20, TREADMILL.top - 70, 12, 70, 0x777777)
    .setOrigin(0);
  const clockBg = scene.add
    .rectangle(TREADMILL.x + TREADMILL.width - 50, TREADMILL.top - 92, 110, 34, 0x111111)
    .setStrokeStyle(2, 0x777777);
  const treadmillClock = scene.add
    .text(clockBg.x, clockBg.y, '0:00 / 3:00', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#6dff8e',
    })
    .setOrigin(0.5);
  void console_;

  // Station 2: jump mark on the floor.
  g.lineStyle(4, 0xffcc33, 0.8)
    .lineBetween(JUMP_SPOT_X - 16, FLOOR_Y + 4, JUMP_SPOT_X + 16, FLOOR_Y + 20)
    .lineBetween(JUMP_SPOT_X + 16, FLOOR_Y + 4, JUMP_SPOT_X - 16, FLOOR_Y + 20);

  // Station 4: a wall. Just a wall. Please apologise to it.
  const wall = scene.add
    .rectangle(WALL.x, FLOOR_Y - WALL.height, WALL.width, WALL.height, 0x8a7560)
    .setOrigin(0)
    .setStrokeStyle(2, 0x5e4c3b);
  solids.add(wall);

  // Exit door.
  const doorX = DOOR.x - DOOR.width / 2;
  const doorTop = FLOOR_Y - DOOR.height;
  scene.add
    .rectangle(doorX - 6, doorTop - 6, DOOR.width + 12, DOOR.height + 6, 0x4a3522)
    .setOrigin(0);
  scene.add.rectangle(doorX, doorTop, DOOR.width, DOOR.height, 0x7a5230).setOrigin(0);
  scene.add.circle(doorX + DOOR.width - 14, doorTop + DOOR.height / 2, 5, 0xd9b44a);
  scene.add
    .text(DOOR.x, doorTop - 26, t.door, { ...TEXT.small, color: COLORS.text })
    .setOrigin(0.5);
  const doorZone = scene.add.zone(DOOR.x, FLOOR_Y - DOOR.height / 2, DOOR.width + 30, DOOR.height);
  scene.physics.add.existing(doorZone, true);
  const doorPrompt = scene.add
    .text(DOOR.x - 40, doorTop - 56, t.doorPrompt, { ...TEXT.small, color: COLORS.accent })
    .setOrigin(0.5)
    .setVisible(false);

  // Plaques above each station.
  const plaque = (x: number, text: string, y = 330) => {
    const txt = scene.add
      .text(x, y, text, { ...TEXT.small, color: '#3a2c12', align: 'center' })
      .setOrigin(0.5);
    const bg = scene.add
      .rectangle(x, y, txt.width + 24, txt.height + 14, 0xd8c9a3)
      .setStrokeStyle(3, 0x6b4f2a);
    txt.setDepth(bg.depth + 1);
  };
  plaque(TREADMILL.x + TREADMILL.width / 2, t.plaques.walk);
  plaque(JUMP_SPOT_X, t.plaques.jump, 400);
  plaque(LOOK_LEFT_X + 20, t.plaques.lookLeft, 290);
  plaque(WALL.x + WALL.width / 2, t.plaques.wall, 470);

  return { solids, treadmill, belt, wall, doorZone, treadmillClock, doorPrompt };
}
