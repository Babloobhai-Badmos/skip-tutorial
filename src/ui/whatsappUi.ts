import type Phaser from 'phaser';
import { TEXT } from './theme';

/**
 * Original family-chat style panel: bubbles, ticks, typing indicator,
 * timestamps, "Forwarded many times". No real app's branding or logo.
 */
export type Ticks = 'none' | 'grey' | 'blue';

export interface ChatMessage {
  from: 'them' | 'me';
  text: string;
  time: string;
  ticks?: Ticks;
  forwarded?: boolean;
}

const C = {
  bg: 0x0b141a,
  header: 0x1f2c34,
  them: 0x202c33,
  me: 0x005c4b,
  text: '#e9edef',
  meta: '#8696a0',
  blue: '#53bdeb',
};

export interface MessageHandle {
  setTicks(t: Ticks): void;
}

export class ChatPanel {
  readonly container: Phaser.GameObjects.Container;
  private y: number;
  private typingDots?: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    top: number,
    private readonly w: number,
    h: number,
    title: string,
    status: string,
  ) {
    this.container = scene.add.container(x, top);
    const bg = scene.add.rectangle(0, 0, w, h, C.bg).setOrigin(0).setStrokeStyle(2, 0x2a3942);
    const header = scene.add.rectangle(0, 0, w, 58, C.header).setOrigin(0);
    const avatar = scene.add.circle(32, 29, 18, 0x3b6ea5);
    const face = scene.add.text(32, 29, '😅', { fontSize: '18px' }).setOrigin(0.5);
    const name = scene.add.text(60, 12, title, { ...TEXT.body, fontSize: '19px', color: C.text });
    const st = scene.add.text(60, 36, status, { ...TEXT.small, fontSize: '13px', color: C.meta });
    this.container.add([bg, header, avatar, face, name, st]);
    this.y = 74;
  }

  add(msg: ChatMessage): MessageHandle {
    const s = this.scene;
    const maxW = this.w * 0.72;
    const pad = 10;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let innerY = pad;
    if (msg.forwarded) {
      parts.push(
        s.add.text(pad, innerY, '↪↪ Forwarded many times', {
          ...TEXT.small,
          fontSize: '12px',
          fontStyle: 'italic',
          color: C.meta,
        }),
      );
      innerY += 18;
    }
    const body = s.add.text(pad, innerY, msg.text, {
      ...TEXT.body,
      fontSize: '17px',
      color: C.text,
      wordWrap: { width: maxW - pad * 2 },
    });
    parts.push(body);
    const meta = s.add.text(0, 0, msg.time, { ...TEXT.small, fontSize: '11px', color: C.meta });
    const ticks = s.add.text(0, 0, '', { ...TEXT.small, fontSize: '12px', color: C.meta });
    const bw = Math.max(body.width + pad * 2, meta.width + 44, 90);
    const bh = innerY + body.height + 22;
    meta.setPosition(bw - pad - meta.width - (msg.from === 'me' ? 20 : 0), bh - 17);
    ticks.setPosition(bw - pad - 16, bh - 18);
    const bx = msg.from === 'me' ? this.w - bw - 14 : 14;
    const bubble = s.add
      .graphics()
      .fillStyle(msg.from === 'me' ? C.me : C.them, 1)
      .fillRoundedRect(0, 0, bw, bh, 8);
    const group = s.add.container(bx, this.y, [bubble, ...parts, meta, ticks]);
    this.container.add(group);
    this.y += bh + 10;
    const setTicks = (t: Ticks) => {
      ticks.setText(t === 'none' ? '' : '✓✓').setColor(t === 'blue' ? C.blue : C.meta);
    };
    setTicks(msg.ticks ?? 'none');
    group.setAlpha(0);
    s.tweens.add({ targets: group, alpha: 1, duration: 180 });
    return { setTicks };
  }

  /** Starts "X is typing..." - returns a stop function (which may never be called). */
  showTyping(label: string): () => void {
    this.typingDots?.destroy();
    const t = this.scene.add.text(16, this.y + 4, label, {
      ...TEXT.small,
      fontStyle: 'italic',
      color: '#25d366',
    });
    this.container.add(t);
    this.typingDots = t;
    let n = 0;
    const ev = this.scene.time.addEvent({
      delay: 420,
      loop: true,
      callback: () => t.setText(label + '.'.repeat((n = (n + 1) % 4))),
    });
    return () => {
      ev.remove();
      t.destroy();
    };
  }
}
