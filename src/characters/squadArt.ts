import type Phaser from 'phaser';

/**
 * Head-and-shoulders portraits for the squad, drawn in code. Original
 * geometric characters - no real likenesses. 140x170 each.
 */
export const PORTRAIT_W = 140;
export const PORTRAIT_H = 170;

type G = Phaser.GameObjects.Graphics;

function shoulders(g: G, color: number, width = 120) {
  g.fillStyle(color, 1).fillRoundedRect((PORTRAIT_W - width) / 2, 118, width, 60, 18);
}
function head(g: G, skin = 0xc68b59, r = 38) {
  g.fillStyle(skin, 1).fillCircle(70, 72, r);
}
function eyes(g: G, dx = 14, y = 68, pupil = 3.5, lookX = 0) {
  g.fillStyle(0xffffff, 1)
    .fillCircle(70 - dx, y, 7)
    .fillCircle(70 + dx, y, 7);
  g.fillStyle(0x111111, 1)
    .fillCircle(70 - dx + lookX, y + 1, pupil)
    .fillCircle(70 + dx + lookX, y + 1, pupil);
}
function mustache(g: G, w = 34, h = 8, y = 90, color = 0x1a1a1a) {
  g.fillStyle(color, 1)
    .fillEllipse(70 - w / 4, y, w / 2 + 4, h)
    .fillEllipse(70 + w / 4, y, w / 2 + 4, h);
}

export function drawSquadTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const gen = (key: string, draw: () => void) => {
    g.clear();
    draw();
    g.generateTexture(key, PORTRAIT_W, PORTRAIT_H);
  };

  // ACP: grey suit, grey hair, a moustache that has seen things.
  gen('squad_acp', () => {
    shoulders(g, 0x5a5f6b, 124);
    g.fillStyle(0xffffff, 1).fillTriangle(56, 118, 84, 118, 70, 150);
    g.fillStyle(0x8e1b1b, 1).fillRect(66, 124, 8, 30);
    head(g);
    g.fillStyle(0x9a9a9a, 1).fillEllipse(70, 40, 76, 26);
    g.lineStyle(4, 0x3a3a3a, 1).lineBetween(46, 56, 62, 60).lineBetween(94, 56, 78, 60);
    eyes(g);
    mustache(g, 44, 10);
  });

  // Daya: broad, maroon shirt, calm like a closed door.
  gen('squad_daya', () => {
    shoulders(g, 0x7a1f2b, 136);
    head(g, 0xb87a4b, 40);
    g.fillStyle(0x1a1a1a, 1).fillEllipse(70, 38, 70, 20);
    eyes(g, 14, 70, 3);
    mustache(g, 30, 7, 92);
  });

  // Salunkhe: lab coat, spectacles, one strand of hair.
  gen('squad_salunkhe', () => {
    shoulders(g, 0xf2f2f2, 118);
    g.fillStyle(0x3b6ea5, 1).fillTriangle(60, 118, 80, 118, 70, 140);
    head(g, 0xd09a6a, 36);
    g.lineStyle(2, 0x1a1a1a, 1).lineBetween(64, 38, 80, 34);
    eyes(g, 13, 70, 3);
    g.lineStyle(3, 0x1a1a1a, 1)
      .strokeCircle(57, 70, 11)
      .strokeCircle(83, 70, 11)
      .lineBetween(68, 70, 72, 70);
    g.lineStyle(3, 0x5a2d1a, 1).lineBetween(60, 94, 80, 94);
  });

  // Freddy Uncle: green shirt, bushy hair, head slightly tilted towards a theory.
  gen('squad_freddy', () => {
    shoulders(g, 0x3f7d3a, 110);
    head(g, 0xc68b59, 35);
    g.fillStyle(0x2b2b2b, 1).fillCircle(50, 42, 14).fillCircle(70, 36, 16).fillCircle(90, 42, 14);
    eyes(g, 12, 72, 3.5, 2);
    g.fillStyle(0xe08a8a, 1).fillCircle(48, 86, 6).fillCircle(92, 86, 6);
    g.lineStyle(3, 0x5a2d1a, 1)
      .beginPath()
      .arc(70, 86, 12, 0.2, Math.PI - 0.2)
      .strokePath();
  });

  // You. And you again, with one thing different.
  const player = (wrong: boolean) => () => {
    shoulders(g, 0x2fb3a4, 104);
    head(g, 0xe0a97a, 36);
    if (wrong) {
      // Looking straight out. Slightly too wide. Nothing else changed.
      eyes(g, 13, 70, 4.6, 0);
    } else {
      eyes(g, 13, 70, 3.5, 3);
    }
    g.lineStyle(3, 0x5a2d1a, 1).lineBetween(62, 92, 78, 92);
  };
  gen('portrait_player', player(false));
  gen('portrait_player_wrong', player(true));
  g.destroy();
}

/** A fake moustache taped onto whatever the squad just accused. */
export function tapeMustache(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(0x111111, 1).fillEllipse(-14, 0, 30, 10).fillEllipse(14, 0, 30, 10);
  const tapeA = scene.add.rectangle(-22, -2, 16, 7, 0xf1e6b8, 0.9).setAngle(-25);
  const tapeB = scene.add.rectangle(22, -2, 16, 7, 0xf1e6b8, 0.9).setAngle(25);
  return scene.add.container(x, y, [g, tapeA, tapeB]).setScale(scale);
}
