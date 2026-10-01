import type Phaser from 'phaser';

/** Wedding aunties (sari, bindi, plate held out). Original, geometric. */
export function drawNpcTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const saris = [0xc2185b, 0xf57c00, 0x7b1fa2, 0x2e7d32];
  saris.forEach((sari, i) => {
    g.clear();
    g.fillStyle(sari, 1).fillTriangle(24, 30, 4, 96, 44, 96); // sari
    g.fillStyle(0xf3d36b, 1).fillRect(6, 88, 36, 6); // border
    g.fillStyle(sari, 1).fillRoundedRect(12, 28, 24, 30, 6);
    g.fillStyle(0xc68b59, 1).fillCircle(24, 18, 13);
    g.fillStyle(0x1a1a1a, 1).fillEllipse(24, 8, 28, 12); // hair
    g.fillStyle(0xd32f2f, 1).fillCircle(24, 13, 2); // bindi
    g.fillStyle(0x111111, 1).fillCircle(19, 18, 2).fillCircle(29, 18, 2);
    g.lineStyle(2, 0x5a2d1a, 1)
      .beginPath()
      .arc(24, 22, 5, 0.2, Math.PI - 0.2)
      .strokePath();
    g.fillStyle(0xf5f5f5, 1).fillEllipse(44, 44, 22, 7); // the plate
    g.fillStyle(0xf9a825, 1).fillCircle(42, 40, 3).fillCircle(47, 41, 3);
    g.generateTexture(`aunty_${i}`, 58, 98);
  });
  g.clear();
  g.fillStyle(0xf5f5f5, 1).fillEllipse(14, 4, 28, 8);
  g.fillStyle(0xf9a825, 1).fillCircle(10, 2, 3);
  g.fillStyle(0x8d4b2a, 1).fillCircle(17, 2, 3);
  g.generateTexture('plate', 28, 8);
  g.destroy();
}
