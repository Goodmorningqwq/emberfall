import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";
import { sfx } from "../audio";

/**
 * Crypt skeleton: a slow, deliberate chaser. Walks at Wren, and inside arm's
 * reach the shield arm rises (the tell) before a short sword lunge. Only the
 * lunge hurts. The Captain is the same machine, bigger, tougher and quicker
 * to swing.
 */
type State = "walk" | "telegraph" | "lunge" | "recover" | "stunned";

export interface SkeletonOptions {
  captain?: boolean;
  /** the Cinder Depths' brute: slag body, iron shield that turns steel from the front until a rod bolt heats it */
  cinder?: boolean;
}

export class Skeleton extends Enemy {
  private state: State = "walk";
  private stateUntil = 0;
  private captain: boolean;
  private cinder: boolean;
  private speed: number;
  private k: number;
  private facing = new Phaser.Math.Vector2(0, 1);
  private heatedUntil = 0;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number, opts: SkeletonOptions = {}) {
    super(scene, group, x, y, opts.cinder ? "cinderling" : "skeleton", opts.captain ? 10 : opts.cinder ? 4 : 3);
    this.captain = !!opts.captain;
    this.cinder = !!opts.cinder;
    this.bounty = this.captain ? 25 : this.cinder ? 8 : 5;
    this.k = this.captain ? 1.4 : 1;
    this.speed = this.captain ? 62 : this.cinder ? 38 : 48;
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

  /** Cinderling: the shield turns steel from the front until it's been heated. */
  get blocksNow() {
    if (!this.cinder || this.scene.time.now < this.heatedUntil) return false;
    const p = this.scene.playerPos();
    const s = this.sprite;
    const to = new Phaser.Math.Vector2(p.x - s.x, p.y - (s.y - 10)).normalize();
    return to.dot(this.facing) > 0.2;
  }

  /** A rod bolt: the slag glows and the guard drops for a while. */
  heat(ms: number) {
    if (this.scene.time.now >= this.heatedUntil) sfx("heat");
    this.heatedUntil = this.scene.time.now + ms;
    this.sprite.setTint(0xff8a3a).setTintMode(Phaser.TintModes.ADD);
    this.scene.time.delayedCall(ms, () => this.sprite.active && this.scene.time.now >= this.heatedUntil && this.restTint());
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
          sfx("bones-tell");
        } else if (d > 20) {
          const v = to.normalize().scale(this.speed);
          s.setVelocity(v.x, v.y);
          s.setFlipX(v.x < 0);
          this.facing.copy(to.normalize());
        } else s.setVelocity(0, 0);
        break;
      case "telegraph":
        if (now >= this.stateUntil) {
          this.state = "lunge";
          this.stateUntil = now + 230;
          this.restTint();
          s.setScale(1.15 * this.k, 0.9 * this.k);
          this.scene.tweens.add({ targets: s, scaleX: this.k, scaleY: this.k, duration: 230, ease: "Quad.easeOut" });
          const v = to.normalize().scale(this.captain ? 210 : this.cinder ? 150 : 175);
          s.setVelocity(v.x, v.y);
          s.setFlipX(v.x < 0);
          this.facing.copy(to.clone().normalize());
          this.scene.slashArc(s.x + v.x * 0.08, s.y - 10 + v.y * 0.08, Math.atan2(v.y, v.x), this.captain ? 16 : 11);
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
    if (this.scene.time.now < this.heatedUntil) return s.setTint(0xff8a3a).setTintMode(Phaser.TintModes.ADD);
    if (this.captain) s.setTint(0xc8d0e0).setTintMode(Phaser.TintModes.MULTIPLY);
    else s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Steel on the shield: a knock, no damage (the scene rings the clang). */
  takeHit(fromX: number, fromY: number, damage = 1): boolean {
    if (this.blocksNow) {
      this.hitThisSwing = true;
      this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + (fromX < this.sprite.x ? 2 : -2), duration: 40, yoyo: true });
      return false;
    }
    return super.takeHit(fromX, fromY, damage);
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
