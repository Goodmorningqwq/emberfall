import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Crypt skeleton: a slow, deliberate chaser. Walks at Wren, and inside arm's
 * reach the shield arm rises (the tell) before a short sword lunge. Only the
 * lunge hurts. The Captain is the same machine, bigger, tougher and quicker
 * to swing.
 */
type State = "walk" | "telegraph" | "lunge" | "recover" | "stunned";

export interface SkeletonOptions {
  captain?: boolean;
}

export class Skeleton extends Enemy {
  private state: State = "walk";
  private stateUntil = 0;
  private captain: boolean;
  private speed: number;
  private k: number;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number, opts: SkeletonOptions = {}) {
    super(scene, group, x, y, "skeleton", opts.captain ? 10 : 3);
    this.captain = !!opts.captain;
    this.bounty = this.captain ? 25 : 5;
    this.k = this.captain ? 1.4 : 1;
    this.speed = this.captain ? 62 : 48;
    const s = this.sprite;
    s.setScale(this.k);
    s.body!.setSize(18, 14).setOffset(7, 18);
    if (this.captain) s.setTint(0xc8d0e0).setTintMode(Phaser.TintModes.MULTIPLY);
    // a slow bony sway while it walks
    scene.tweens.add({ targets: s, angle: { from: -3, to: 3 }, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.stateUntil = scene.time.now + 500 + Math.random() * 500;
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
    const to = new Phaser.Math.Vector2(px - s.x, py - 6 - s.y);
    const d = to.length();
    switch (this.state) {
      case "walk":
        if (now < this.stateUntil) break; // a breath before it notices her
        if (d < 46 * this.k) {
          this.state = "telegraph";
          this.stateUntil = now + (this.captain ? 340 : 440);
          s.setVelocity(0, 0);
          // the shield arm rises: it draws up tall and pales
          this.scene.tweens.add({ targets: s, scaleY: 1.12 * this.k, scaleX: 0.94 * this.k, duration: 200, ease: "Quad.easeOut" });
          s.setTint(0x505870).setTintMode(Phaser.TintModes.ADD);
        } else if (d > 20) {
          const v = to.normalize().scale(this.speed);
          s.setVelocity(v.x, v.y);
          s.setFlipX(v.x < 0);
        } else s.setVelocity(0, 0);
        break;
      case "telegraph":
        if (now >= this.stateUntil) {
          this.state = "lunge";
          this.stateUntil = now + 230;
          this.restTint();
          s.setScale(1.15 * this.k, 0.9 * this.k);
          this.scene.tweens.add({ targets: s, scaleX: this.k, scaleY: this.k, duration: 230, ease: "Quad.easeOut" });
          const v = to.normalize().scale(this.captain ? 210 : 175);
          s.setVelocity(v.x, v.y);
          s.setFlipX(v.x < 0);
        }
        break;
      case "lunge":
        if (now >= this.stateUntil) {
          this.state = "recover";
          this.stateUntil = now + (this.captain ? 500 : 760);
          s.setVelocity(0, 0);
        }
        break;
      case "recover":
      case "stunned":
        if (now >= this.stateUntil) {
          this.state = "walk";
          this.stateUntil = 0;
        }
        break;
    }
  }

  private restTint() {
    const s = this.sprite;
    if (this.captain) s.setTint(0xc8d0e0).setTintMode(Phaser.TintModes.MULTIPLY);
    else s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  protected onHit() {
    this.state = "stunned";
    this.stateUntil = this.scene.time.now + (this.captain ? 220 : 380);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(this.k).setAngle(0);
    this.scene.time.delayedCall(80, () => this.sprite.active && !this.isStunned && this.restTint());
  }

  protected onStun() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(this.k).setAngle(0);
    this.state = "recover";
    this.stateUntil = this.stunnedUntil;
  }

  protected onDeath() {
    // it comes apart: a scatter of bone-white motes
    this.scene.puff(this.sprite.x, this.sprite.y - 12, 0xf0e8d8, this.captain ? 22 : 12);
  }
}
