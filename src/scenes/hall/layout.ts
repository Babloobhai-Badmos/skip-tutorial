import type Phaser from 'phaser';
import type cid from '../../content/cid.json';
import content from '../../content/deaths.json';
import { COLORS, GAME_HEIGHT, TEXT } from '../../ui/theme';

const h = content.hall;

export const HALL_WIDTH = 2400;
export const FLOOR_Y = 640;
export const PIT = { from: 700, to: 830 };
export const COOKER = { x: 1150, w: 70, h: 60 };
export const BANGLES = { from: 1550, to: 1690 };
export const CHECKPOINTS = [170, 1250, 2080];
export const PIT2 = { from: 1780, to: 1980 };
export const TAKHT = { x: 1850, w: 60, y: FLOOR_Y - 34 };
export const PHONE_X = 1000;
export const BACK_DOOR_X = 70;
export const NEXT_DOOR_X = 2320;

/** Locked doors Daya can kick. One of them should not be kicked. */
export const LOCKED_DOORS = [
  { key: 'storeRoom', x: 470, deadly: true },
  { key: 'almirah', x: 1360, deadly: false },
] as const;
export type LockedDoorKey = (typeof LOCKED_DOORS)[number]['key'];

/** Inanimate objects: the CID's suspects (label comes from cid.json). */
export const HALL_OBJECTS: readonly { key: keyof typeof cid.objects; x: number }[] = [
  { key: 'door', x: BACK_DOOR_X },
  { key: 'storeRoom', x: 470 },
  { key: 'pit', x: (PIT.from + PIT.to) / 2 },
  { key: 'photo', x: 920 },
  { key: 'cooker', x: COOKER.x },
  { key: 'almirah', x: 1360 },
  { key: 'bangles', x: (BANGLES.from + BANGLES.to) / 2 },
  { key: 'takht', x: TAKHT.x + TAKHT.w / 2 },
  { key: 'phone', x: PHONE_X },
  { key: 'door', x: NEXT_DOOR_X },
];

export interface LockedDoor {
  key: LockedDoorKey;
  x: number;
  deadly: boolean;
  panel: Phaser.GameObjects.Rectangle;
  zone: Phaser.GameObjects.Zone;
  open: boolean;
}

export interface HallLayout {
  solids: Phaser.Physics.Arcade.StaticGroup;
  cooker: Phaser.GameObjects.Container;
  backDoor: Phaser.GameObjects.Zone;
  nextDoor: Phaser.GameObjects.Zone;
  lockedDoors: LockedDoor[];
  phone: Phaser.GameObjects.Container;
}

/** The Hall prototype: a corridor with a pit, a pressure cooker and broken bangles. */
export function buildHall(scene: Phaser.Scene): HallLayout {
  scene.cameras.main.setBackgroundColor(0x2c2a24);
  const g = scene.add.graphics();
  // Wallpaper + a row of family photos (all slightly crooked).
  for (let x = 0; x < HALL_WIDTH; x += 80) g.fillStyle(0x34312a, 1).fillRect(x, 0, 40, FLOOR_Y);
  for (let x = 260; x < HALL_WIDTH - 200; x += 330) {
    g.fillStyle(0x6b4f2a, 1).fillRect(x, 190, 90, 70);
    g.fillStyle(0xcbbd9c, 1).fillRect(x + 8, 198, 74, 54);
    g.fillStyle(0x7d7466, 1)
      .fillCircle(x + 45, 218, 10)
      .fillRect(x + 33, 230, 24, 20);
  }

  const solids = scene.physics.add.staticGroup();
  const floor = (from: number, to: number) =>
    solids.add(
      scene.add.rectangle(from, FLOOR_Y, to - from, GAME_HEIGHT - FLOOR_Y, 0x4a4238).setOrigin(0),
    );
  floor(0, PIT.from);
  floor(PIT.to, PIT2.from);
  floor(PIT2.to, HALL_WIDTH);
  scene.add.rectangle(PIT2.from, FLOOR_Y, PIT2.to - PIT2.from, 200, 0x050505).setOrigin(0);
  // A takht floating over the second pit. Nobody asks why.
  solids.add(scene.add.rectangle(TAKHT.x, TAKHT.y, TAKHT.w, 16, 0x7a5230).setOrigin(0));
  scene.add.rectangle(TAKHT.x + 4, TAKHT.y + 16, 6, 18, 0x5b3d24).setOrigin(0);
  scene.add.rectangle(TAKHT.x + TAKHT.w - 10, TAKHT.y + 16, 6, 18, 0x5b3d24).setOrigin(0);
  // The landline, on its little table with a lace cover.
  scene.add.rectangle(PHONE_X - 30, FLOOR_Y - 50, 60, 50, 0x6b4f2a).setOrigin(0);
  scene.add.rectangle(PHONE_X - 34, FLOOR_Y - 54, 68, 8, 0xf2ead8).setOrigin(0);
  const phone = scene.add.container(PHONE_X, FLOOR_Y - 66, [
    scene.add.rectangle(0, 0, 40, 18, 0x1c1c1c),
    scene.add.rectangle(0, -12, 46, 8, 0x111111),
    scene.add.circle(0, 1, 5, 0x444444),
  ]);
  // The pit: just dark. Nobody put a railing.
  scene.add.rectangle(PIT.from, FLOOR_Y, PIT.to - PIT.from, 200, 0x050505).setOrigin(0);

  // Pressure cooker on a little stool (solid, jumpable).
  const cx = COOKER.x;
  const top = FLOOR_Y - COOKER.h;
  const stool = scene.add
    .rectangle(cx - COOKER.w / 2, top, COOKER.w, COOKER.h, 0x6b4f2a)
    .setOrigin(0);
  solids.add(stool);
  const cooker = scene.add.container(cx, top, [
    scene.add.rectangle(0, -26, 60, 50, 0xb9bcc2).setStrokeStyle(2, 0x777a80),
    scene.add.ellipse(0, -52, 66, 12, 0xa8abb1),
    scene.add.rectangle(0, -62, 10, 12, 0x333333),
    scene.add.rectangle(46, -40, 40, 7, 0x222222),
  ]);
  scene.add.text(cx, FLOOR_Y + 14, h.cooker, TEXT.small).setOrigin(0.5, 0);

  // Broken bangles: pretty, glittery, lethal.
  const colors = [0xe63946, 0x2a9d8f, 0xe9c46a, 0x9b5de5, 0xf15bb5];
  for (let x = BANGLES.from, i = 0; x < BANGLES.to; x += 12, i++) {
    g.lineStyle(3, colors[i % colors.length] ?? 0xffffff, 1);
    g.beginPath()
      .arc(x, FLOOR_Y - 2, 7, Math.PI, Math.PI * 1.7)
      .strokePath();
  }
  scene.add
    .text((BANGLES.from + BANGLES.to) / 2, FLOOR_Y + 14, h.bangles, TEXT.small)
    .setOrigin(0.5, 0);

  const door = (x: number, label: string) => {
    scene.add
      .rectangle(x - 38, FLOOR_Y - 150, 76, 150, 0x7a5230)
      .setOrigin(0)
      .setStrokeStyle(4, 0x4a3522);
    scene.add.circle(x + 24, FLOOR_Y - 75, 5, 0xd9b44a);
    scene.add.text(x, FLOOR_Y - 176, label, { ...TEXT.small, color: COLORS.text }).setOrigin(0.5);
    const zone = scene.add.zone(x, FLOOR_Y - 75, 100, 150);
    scene.physics.add.existing(zone, true);
    return zone;
  };
  const backDoor = door(BACK_DOOR_X, h.backDoor);
  const nextDoor = door(NEXT_DOOR_X, h.nextDoor);

  const lockedDoors: LockedDoor[] = LOCKED_DOORS.map((d) => {
    const label = d.key === 'storeRoom' ? h.storeRoom : h.almirah;
    scene.add.rectangle(d.x, FLOOR_Y - 65, 84, 138, 0x120c08); // what's behind
    const panel = scene.add
      .rectangle(d.x - 40, FLOOR_Y - 134, 80, 134, 0x5b3d24)
      .setOrigin(0)
      .setStrokeStyle(3, 0x3a2716);
    scene.add.rectangle(d.x + 22, FLOOR_Y - 70, 12, 16, 0xb8a060); // padlock
    scene.add.text(d.x, FLOOR_Y - 156, label, { ...TEXT.small, color: COLORS.dim }).setOrigin(0.5);
    const zone = scene.add.zone(d.x, FLOOR_Y - 70, 110, 140);
    scene.physics.add.existing(zone, true);
    return { key: d.key, x: d.x, deadly: d.deadly, panel, zone, open: false };
  });

  return { solids, cooker, backDoor, nextDoor, lockedDoors, phone };
}
