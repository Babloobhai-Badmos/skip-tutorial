import Phaser from 'phaser';
import ui from '../content/ui.json';
import { PINTU_LINES, PintuActor } from '../characters/pintuActor';
import { losableIds } from '../characters/pintu';
import { PintuView } from '../characters/pintuView';
import { DEV_SPEED } from '../core/devFlags';
import { getStore } from '../core/gameState';
import { applyLoss, hasLost, recoverVoiceLine } from '../core/pintuLoss';
import { createRng } from '../core/rng';
import { TUTORIAL_STATIONS, type TutorialStation } from '../core/stateSchema';
import { ConfidentWalk, formatClock, WALK_REQUIRED_MS } from '../tutorial/confidentWalk';
import { SafeRoomTimer } from '../tutorial/safeRoom';
import { showCertificate } from '../ui/certificate';
import { SubtitleBar } from '../ui/subtitleBar';
import { GAME_WIDTH, TEXT } from '../ui/theme';
import { GameplayScene } from './GameplayScene';
import { goTo } from './navigate';
import { buildSkipButton, TutorialChecklist } from './tutorial/hud';
import {
  buildRoom,
  DOOR,
  FLOOR_Y,
  PINTU_X,
  PLAYER_START_X,
  TREADMILL,
  type Room,
} from './tutorial/room';

const t = ui.tutorial;
const SPEED = 220;
const JUMP = 520;
const EXTRA_LOSABLE = losableIds(PINTU_LINES);

type Keys = Record<
  'left' | 'right' | 'up' | 'a' | 'd' | 'w' | 'space' | 'e' | 'enter' | 'k',
  Phaser.Input.Keyboard.Key
>;

export class TutorialScene extends GameplayScene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private room!: Room;
  private pintu!: PintuActor;
  private subtitles!: SubtitleBar;
  private keys!: Keys;
  private walk!: ConfidentWalk;
  private safeRoom!: SafeRoomTimer;
  private checklist!: TutorialChecklist;
  /** Input is frozen during the certificate and the skip beat. */
  private frozen = false;
  private leaving = false;
  private cooldowns = { jump: 0, wall: 0 };
  private doorLineSaid = false;
  private allDoneSaid = false;
  private walkSavedMs = 0;
  private pendingRecovered: string | null = null;

  constructor() {
    super('TutorialScene');
  }

  create(): void {
    const store = getStore();
    this.frozen = false;
    this.leaving = false;
    this.doorLineSaid = false;
    this.allDoneSaid = store.state.tutorial.stationsDone.length === TUTORIAL_STATIONS.length;
    this.pendingRecovered = null;

    this.room = buildRoom(this);
    this.subtitles = new SubtitleBar(this);
    const view = new PintuView(this, PINTU_X, FLOOR_Y);
    const visit = store.state.flags.leftRoomCount + store.state.flags.skipCount;
    this.pintu = new PintuActor(
      this,
      view,
      this.subtitles,
      createRng(store.state.seed).fork(`pintu:${visit}`),
    );

    this.player = this.physics.add.sprite(PLAYER_START_X, FLOOR_Y - 40, 'player');
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.room.solids);

    this.walk = new ConfidentWalk(store.state.tutorial.walkProgressMs, DEV_SPEED);
    this.walkSavedMs = this.walk.progressMs;
    this.safeRoom = new SafeRoomTimer(DEV_SPEED);

    const kb = this.input.keyboard;
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
      e: K.E,
      enter: K.ENTER,
      k: K.K,
    }) as Keys;

    this.checklist = new TutorialChecklist(this);
    this.checklist.setVisible(!hasLost(store.state.pintuLoss, 'uiPanel'));
    this.updateChecklist();
    buildSkipButton(this, () => this.skip());
    this.add.text(GAME_WIDTH / 2, 20, t.hint, TEXT.small).setOrigin(0.5, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.saveWalk(true));
    this.setupPause();

    const returning = store.state.flags.leftRoomCount > 0 || store.state.flags.skipCount > 0;
    this.time.delayedCall(600, () => this.pintu.say(returning ? 'return' : 'greet'));
  }

  update(_time: number, dtMs: number): void {
    const dt = Math.min(dtMs, 100);
    this.pintu.update(dt);
    this.room.belt.tilePositionX += dt * 0.22;
    this.cooldowns.jump -= dt;
    this.cooldowns.wall -= dt;
    if (this.frozen) {
      this.player.setVelocityX(0);
      return;
    }

    this.movePlayer(dt);
    this.checkDoor();
    this.checkWall();

    if (this.safeRoom.update(dt)) {
      this.pendingRecovered = recoverVoiceLine(getStore());
      this.pintu.refreshBody();
    }
    if (this.pintu.quietMs > 14_000 && !this.pintu.brain.busy) {
      // A recovered line resurfaces here first - out of context, unexplained.
      if (this.pendingRecovered) {
        this.pintu.sayLine(this.pendingRecovered);
        this.pendingRecovered = null;
      } else {
        this.pintu.say('idle');
      }
    }
  }

  // ---------------------------------------------------------------- movement

  private movePlayer(dt: number): void {
    const k = this.keys;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const grounded = body.blocked.down || body.touching.down;
    const onTreadmill =
      grounded &&
      body.bottom <= TREADMILL.top + 2 &&
      this.player.x > TREADMILL.x &&
      this.player.x < TREADMILL.x + TREADMILL.width;

    const input = (right ? 1 : 0) - (left ? 1 : 0);
    this.player.setVelocityX(input * SPEED + (onTreadmill ? -SPEED : 0));
    if (input !== 0) this.player.setFlipX(input < 0);

    if (Phaser.Input.Keyboard.JustDown(k.left) || Phaser.Input.Keyboard.JustDown(k.a)) {
      this.completeStation('lookLeft', 'look_left');
    }
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(k.up) ||
      Phaser.Input.Keyboard.JustDown(k.w) ||
      Phaser.Input.Keyboard.JustDown(k.space);
    if (jumpPressed && grounded) {
      this.player.setVelocityY(-JUMP);
      if (
        !this.completeStation('jump', 'jump') &&
        this.cooldowns.jump <= 0 &&
        Math.random() < 0.3
      ) {
        this.pintu.sayIfFree('jump');
        this.cooldowns.jump = 6000;
      }
    }
    if (Phaser.Input.Keyboard.JustDown(k.k)) this.skip();

    for (const ev of this.walk.update(dt, { onTreadmill, walking: right && !left, grounded })) {
      if (ev.type === 'started' && this.walk.progressMs < 1000) this.pintu.sayIfFree('walk_start');
      if (ev.type === 'milestone') this.pintu.sayIfFree('walk_progress');
      if (ev.type === 'stopped' && ev.penaltyMs > 0) this.pintu.say('walk_stop');
      if (ev.type === 'done') this.finishWalk();
    }
    this.room.treadmillClock.setText(
      `${formatClock(this.walk.progressMs)} / ${formatClock(WALK_REQUIRED_MS)}`,
    );
    this.updateChecklist();
    this.saveWalk(false);
  }

  private updateChecklist(): void {
    this.checklist.update(getStore().state.tutorial.stationsDone, this.walk.progressMs);
  }

  private checkWall(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const touchingWall =
      (body.touching.right || body.touching.left || body.blocked.right) &&
      Math.abs(this.player.x - this.room.wall.x) < 60;
    if (!touchingWall) return;
    if (!this.completeStation('wall', 'wall') && this.cooldowns.wall <= 0) {
      this.pintu.sayIfFree('wall');
    }
    this.cooldowns.wall = 8000;
  }

  private checkDoor(): void {
    const near = Math.abs(this.player.x - DOOR.x) < 170;
    if (near && !this.doorLineSaid) {
      this.doorLineSaid = true;
      this.pintu.say('door_near');
    }
    const atDoor = this.physics.overlap(this.player, this.room.doorZone);
    this.room.doorPrompt.setVisible(atDoor);
    if (
      atDoor &&
      (Phaser.Input.Keyboard.JustDown(this.keys.e) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter))
    ) {
      this.leaveRoom();
    }
  }

  // ---------------------------------------------------------------- stations

  /** Marks a station done. Returns true if this was the first time. */
  private completeStation(station: TutorialStation, context: string): boolean {
    const store = getStore();
    if (store.state.tutorial.stationsDone.includes(station)) return false;
    store.update(`tutorial:${station}`, (d) => {
      d.tutorial.stationsDone.push(station);
    });
    if (station !== 'walk') this.pintu.say(context);
    this.maybeAllDone();
    return true;
  }

  private finishWalk(): void {
    this.saveWalk(true);
    const store = getStore();
    this.completeStation('walk', 'walk_done');
    const hold = this.pintu.say('walk_done');
    this.frozen = true;
    this.time.delayedCall(Math.min(hold, 3500), () => {
      store.update('tutorial:certificate', (d) => {
        d.tutorial.certificateEarned = true;
      });
      this.pintu.say('certificate');
      const signedBy = hasLost(store.state.pintuLoss, 'nameTag') ? '' : 'Pintu';
      showCertificate(this, {
        signedBy,
        onClose: () => {
          this.frozen = false;
          this.maybeAllDone();
        },
      });
    });
  }

  private maybeAllDone(): void {
    const s = getStore().state.tutorial;
    if (this.allDoneSaid || this.frozen) return;
    if (s.stationsDone.length === TUTORIAL_STATIONS.length && s.certificateEarned) {
      this.allDoneSaid = true;
      this.time.delayedCall(2500, () => this.pintu.say('all_done'));
    }
  }

  private saveWalk(force: boolean): void {
    const ms = Math.round(this.walk.progressMs);
    if (!force && Math.abs(ms - this.walkSavedMs) < 5000) return;
    this.walkSavedMs = ms;
    getStore().update('tutorial:walk', (d) => {
      d.tutorial.walkProgressMs = ms;
    });
  }

  // ---------------------------------------------------------------- leaving

  private leaveRoom(): void {
    if (this.leaving) return;
    this.leaving = true;
    getStore().update('tutorial:leave', (d) => {
      d.flags.leftRoomCount += 1;
    });
    goTo(this, 'Level1Hall');
  }

  /**
   * [SKIP]: the Act 2 turn. Pintu loses something (never announced), the
   * jokes carry on - scared now. Deadpan: a beat of silence, one line, gone.
   */
  private skip(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.frozen = true;
    this.subtitles.clear();
    const store = getStore();
    const firstSkip = store.state.flags.skipCount === 0;
    this.time.delayedCall(700, () => {
      applyLoss(store, 'skip', EXTRA_LOSABLE);
      store.update('tutorial:skip', (d) => {
        d.flags.skippedTutorial = true;
        d.flags.skipCount += 1;
        d.flags.leftRoomCount += 1;
      });
      this.pintu.refreshBody();
      this.checklist.setVisible(!hasLost(store.state.pintuLoss, 'uiPanel'));
      const hold = this.pintu.say('skip', firstSkip ? 'anxious' : 'scared');
      this.time.delayedCall(Math.max(2200, Math.min(hold, 4200)), () => goTo(this, 'Level1Hall'));
    });
  }
}
