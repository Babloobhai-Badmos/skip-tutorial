import type Phaser from 'phaser';
import content from '../content/levels.json';
import { Menu } from './menu';
import { GAME_HEIGHT, GAME_WIDTH, TEXT } from './theme';

const c = content.lifeline;

/**
 * Quiz-show style lifeline panel (original layout and wording).
 * Phone a Friend is always FREE. The other two were "used" before you came.
 */
export function showLifeline(scene: Phaser.Scene, depth = 1500): Promise<'phone' | 'cancel'> {
  return new Promise((resolve) => {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 40;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const fixed = <
      T extends Phaser.GameObjects.GameObject & {
        setScrollFactor(x: number): T;
        setDepth(d: number): T;
      },
    >(
      o: T,
    ) => {
      o.setScrollFactor(0).setDepth(depth);
      parts.push(o);
      return o;
    };
    fixed(scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05021a, 0.8).setOrigin(0));
    fixed(scene.add.ellipse(cx, cy, 620, 360, 0x1b0f4a).setStrokeStyle(4, 0xc9a24a));
    fixed(
      scene.add
        .text(cx, cy - 130, c.title, { ...TEXT.heading, fontSize: '30px', color: '#e8c96a' })
        .setOrigin(0.5),
    );
    // Lozenge rows (hexagon-ish ends drawn with a graphics path).
    const g = fixed(scene.add.graphics());
    [-50, 10, 70].forEach((dy) => {
      const y = cy + dy;
      g.fillStyle(0x2b1a6e, 1).lineStyle(2, 0xc9a24a, 1);
      g.beginPath();
      g.moveTo(cx - 240, y)
        .lineTo(cx - 215, y - 22)
        .lineTo(cx + 215, y - 22);
      g.lineTo(cx + 240, y)
        .lineTo(cx + 215, y + 22)
        .lineTo(cx - 215, y + 22)
        .closePath();
      g.fillPath().strokePath();
    });

    const close = (choice: 'phone' | 'cancel') => {
      menu.dispose();
      parts.forEach((p) => p.destroy());
      resolve(choice);
    };
    const menu: Menu = new Menu(
      scene,
      [
        { label: () => `${c.phone}  —  ${c.free}`, onSelect: () => close('phone') },
        { label: () => `${c.fifty}  —  ${c.used}`, enabled: () => false },
        { label: () => `${c.audience}  —  ${c.used}`, enabled: () => false },
        { label: () => '', heading: true },
        { label: () => c.cancel, onSelect: () => close('cancel') },
      ],
      {
        x: cx,
        y: cy - 50,
        spacing: 60,
        fixed: true,
        depth: depth + 1,
        style: { ...TEXT.menu, fontSize: '21px' },
      },
    );
    menu.refresh();
  });
}
