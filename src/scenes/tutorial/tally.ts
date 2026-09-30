import type Phaser from 'phaser';

/** Groups of five: four strokes and a slash. Wraps into rows. */
export function drawTally(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  count: number,
  opts: { color?: number; perRow?: number; h?: number } = {},
): void {
  const { color = 0xf2efe6, perRow = 4, h = 22 } = opts;
  g.lineStyle(2, color, 0.85);
  const groups = Math.ceil(count / 5);
  for (let gi = 0; gi < groups; gi++) {
    const gx = x + (gi % perRow) * 34;
    const gy = y + Math.floor(gi / perRow) * (h + 12);
    const inGroup = Math.min(5, count - gi * 5);
    for (let i = 0; i < Math.min(4, inGroup); i++)
      g.lineBetween(gx + i * 6, gy, gx + i * 6 + 1, gy + h);
    if (inGroup === 5) g.lineBetween(gx - 3, gy + h - 3, gx + 22, gy + 3);
  }
}
