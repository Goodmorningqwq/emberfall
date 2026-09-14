import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Slime. State machine:
 *   wander → (player near) telegraph → lunge → recover → wander
 * Touching it only hurts during `lunge`; being hit knocks it into `stunned`.
 * Mossback is the same machine scaled up, and splits into two slimes on death.
 */
type SlimeState = "wander" | "telegraph" | "lunge" | "recover" | "stunned";

const AGGRO_RANGE = 130;
const WANDER_SPEED = 28;
const LUNGE_SPEED = 190;
const TELEGRAPH_MS = 420;
const LUNGE_MS = 260;
const RECOVER_MS = 900;
const STUN_MS = 450;

export interface SlimeOptions {
  scale?: number;
  hp?: number;
  split?: boolean;
  bounty?: number;
}

export class Slime extends Enemy {
  private state: SlimeState = "wander";
  private stateUntil = 0;
  private breathe?: Phaser.Tweens.Tween;
  private opts: Required<SlimeOptions>;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number, opts: SlimeOptions = {}) {
    super(scene, group, x, y, "slime", opts.hp ?? 2);
    this.opts = { scale: opts.scale ?? 1, hp: opts.hp ?? 2, split: opts.split ?? false, bounty: opts.bounty ?? 3 };
    this.bounty = this.opts.bounty;
    const s = this.sprite;
    s.setScale(this.opts.scale);
    s.body!.setSize(s.width * 0.7, s.height * 0.5).setOffset(s.width * 0.15, s.height * 0.5);
    this.startBreathing();
  }

  get isAttacking() {
    return this.state === "lunge";
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active || this.isDead) return;
    s.setDepth(s.y);
    if (this.isStunned) {
      s.setVelocity(0, 0);
      return;
    }
    const d = Phaser.Math.Distance.Between(s.x, s.y, px, py);
    const k = this.opts.scale;

    switch (this.state) {
      case "wander":
        if (d < AGGRO_RANGE * k) {
          this.enter("telegraph", now + TELEGRAPH_MS);
          // the tell: squash down + red glints
          s.setVelocity(0, 0);
          this.breathe?.pause();
          this.scene.tweens.add({ targets: s, scaleX: 1.25 * k, scaleY: 0.7 * k, duration: TELEGRAPH_MS * 0.8, ease: "Quad.easeIn" });
          this.glint();
        } else if (d > 24) {
          const v = new Phaser.Math.Vector2(px - s.x, py - s.y).normalize().scale(WANDER_SPEED * 0.6);
          s.setVelocity(v.x, v.y);
        }
        break;
      case "telegraph":
        if (now >= this.stateUntil) {
          this.enter("lunge", now + LUNGE_MS);
          s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
          s.setScale(0.85 * k, 1.2 * k); // stretch on launch
          this.scene.tweens.add({ targets: s, scaleX: k, scaleY: k, duration: LUNGE_MS, ease: "Quad.easeOut" });
          const v = new Phaser.Math.Vector2(px - s.x, py - s.y).normalize().scale(LUNGE_SPEED * (0.8 + 0.2 * k));
          s.setVelocity(v.x, v.y);
        }
        break;
      case "lunge":
        if (now >= this.stateUntil) {
          this.enter("recover", now + RECOVER_MS);
          s.setVelocity(0, 0);
          this.breathe?.resume();
        }
        break;
      case "recover":
      case "stunned":
        if (now >= this.stateUntil) this.enter("wander", 0);
        break;
    }
  }

  protected onHit() {
    this.enter("stunned", this.scene.time.now + STUN_MS);
    this.scene.tweens.killTweensOf(this.sprite);
    this.breathe?.resume();
    this.sprite.setScale(this.opts.scale);
  }

  protected onStun() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.breathe?.pause();
    this.sprite.setScale(this.opts.scale);
    this.enter("recover", this.stunnedUntil);
  }

  protected onDeath() {
    if (!this.opts.split) return;
    const s = this.sprite;
    for (const dx of [-14, 14]) {
      this.scene.spawnEnemy("slime", s.x + dx, s.y, { fromSplit: true });
    }
  }

  /** The tell: two short red glints, then one right before the lunge. Additive so the green stays green. */
  private glint() {
    const s = this.sprite;
    const on = () => s.active && s.setTint(0x8a1c1c).setTintMode(Phaser.TintModes.ADD);
    const off = () => s.active && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    for (const [t, fn] of [[0, on], [70, off], [150, on], [220, off], [TELEGRAPH_MS - 90, on], [TELEGRAPH_MS - 10, off]] as const) {
      this.scene.time.delayedCall(t, fn);
    }
  }

  private enter(state: SlimeState, until: number) {
    this.state = state;
    this.stateUntil = until;
  }

  private startBreathing() {
    const k = this.opts.scale;
    this.breathe = this.scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: k, to: 0.9 * k },
      scaleX: { from: k, to: 1.08 * k },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 400,
    });
  }
}
