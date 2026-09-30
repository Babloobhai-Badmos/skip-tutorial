import type Phaser from 'phaser';
import ui from '../content/ui.json';
import { getStore } from '../core/gameState';
import { flashStyle } from '../settings/accessibility';
import { GAME_HEIGHT, GAME_WIDTH } from './theme';

const c = ui.certificate;

export interface CertificateOptions {
  signedBy: string;
  onClose: () => void;
}

/** The laminated Participation Certificate, with a gloss sweep across it. */
export function showCertificate(scene: Phaser.Scene, opts: CertificateOptions): void {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2 - 20;
  const W = 660;
  const H = 440;
  const layer = scene.add.container(0, 0).setDepth(2000).setScrollFactor(0);

  const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0);
  const card = scene.add.rectangle(cx, cy, W, H, 0xf6efd9).setStrokeStyle(6, 0xb8912f);
  const inner = scene.add.rectangle(cx, cy, W - 36, H - 36).setStrokeStyle(2, 0xb8912f);
  const serif = 'Georgia, "Times New Roman", serif';
  const ink = '#3a2c12';
  const title = scene.add
    .text(cx, cy - 150, c.title, {
      fontFamily: serif,
      fontSize: '34px',
      color: ink,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const body = scene.add
    .text(cx, cy - 40, c.body.join('\n'), {
      fontFamily: serif,
      fontSize: '21px',
      color: ink,
      align: 'center',
      lineSpacing: 8,
    })
    .setOrigin(0.5);
  const result = scene.add
    .text(cx, cy + 70, c.result, {
      fontFamily: serif,
      fontSize: '22px',
      color: '#7a1f1f',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const seal = scene.add.circle(cx + 220, cy + 140, 42, 0xc0392b).setStrokeStyle(4, 0x8e2a20);
  const sealText = scene.add
    .text(cx + 220, cy + 140, c.seal, {
      fontFamily: serif,
      fontSize: '13px',
      color: '#fff',
      align: 'center',
    })
    .setOrigin(0.5)
    .setAngle(-12);
  const sign = scene.add
    .text(cx - 200, cy + 130, opts.signedBy, {
      fontFamily: '"Brush Script MT", cursive',
      fontSize: '30px',
      color: '#1d3b8a',
    })
    .setOrigin(0.5);
  const signLine = scene.add
    .text(cx - 200, cy + 160, c.signatureLabel, { fontFamily: serif, fontSize: '14px', color: ink })
    .setOrigin(0.5);
  const hint = scene.add
    .text(cx, cy + H / 2 + 36, c.close, { fontFamily: serif, fontSize: '16px', color: '#cfcadb' })
    .setOrigin(0.5);

  // Lamination: a glossy highlight that sweeps across the card.
  const gloss = scene.add.rectangle(cx - W, cy, 90, H * 1.6, 0xffffff, 0.35).setAngle(20);
  const maskShape = scene.make.graphics({}, false).fillRect(cx - W / 2, cy - H / 2, W, H);
  gloss.setMask(maskShape.createGeometryMask());
  const sheen = scene.add.rectangle(cx, cy, W, H, 0xffffff, 0.06);

  layer.add([
    dim,
    card,
    inner,
    title,
    body,
    result,
    seal,
    sealText,
    sign,
    signLine,
    sheen,
    gloss,
    hint,
  ]);

  if (flashStyle(getStore().state.settings) === 'flash') {
    scene.tweens.add({
      targets: gloss,
      x: cx + W,
      duration: 1100,
      ease: 'Sine.inOut',
      repeat: -1,
      repeatDelay: 1600,
    });
  } else {
    // Reduced flashing: a slow, soft sheen instead of a moving glint.
    gloss.setVisible(false);
    scene.tweens.add({ targets: sheen, alpha: 0.12, duration: 2400, yoyo: true, repeat: -1 });
  }

  layer.setAlpha(0);
  scene.tweens.add({ targets: layer, alpha: 1, duration: 300 });

  const openedAt = scene.time.now;
  const close = () => {
    if (scene.time.now - openedAt < 700) return;
    kb?.off('keydown-ENTER', close);
    kb?.off('keydown-SPACE', close);
    maskShape.destroy();
    layer.destroy();
    opts.onClose();
  };
  const kb = scene.input.keyboard;
  kb?.on('keydown-ENTER', close);
  kb?.on('keydown-SPACE', close);
  dim.setInteractive().on('pointerdown', close);
}
