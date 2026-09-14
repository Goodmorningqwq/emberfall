import Phaser from "phaser";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Base for everything the sword can hit. Subclasses own the state machine;
 * this handles the shared feedback (flash, knockback, death dissolve, stun)
 * and the contract the scene relies on.
 */
export abstract class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  hitThisSwing = false;
  /** gold dropped on death */
  bounty = 3;
  protected scene: DungeonScene;
  protected stunnedUntil = 0;
  protected dead = false;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number, texture: string, hp: number) {
    this.scene = scene;
    this.hp = hp;
    this.sprite = group.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setPushable(false);
    this.sprite.setDrag(900, 900);
    this.sprite.setData("enemy", this);
  }

  /** True while touching this enemy should hurt the player. */
  abstract get isAttacking(): boolean;
  abstract update(now: number, px: number, py: number): void;

  get isDead() {
    return this.dead;
  }
  /** World circles that hurt the player right now (spore clouds, root spikes...). */
  get hazards(): { x: number; y: number; r: number }[] {
    return [];
  }
  get isStunned() {
    return this.scene.time.now < this.stunnedUntil;
  }

  /** Sword connected. Returns true if it died. */
  takeHit(fromX: number, fromY: number, damage = 1): boolean {
    if (this.dead) return false;
    this.hp -= damage;
    this.hitThisSwing = true;
    this.onHit();
    const s = this.sprite;
    s.setTint(0xfff2b0).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => s.active && !this.isStunned && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    const dir = new Phaser.Math.Vector2(s.x - fromX, s.y - fromY).normalize();
    s.setVelocity(dir.x * 200, dir.y * 200); // drag brings it to rest
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  /** Boomerang connected. Default: stunned for a while. */
  boomerangHit(ms = 2000) {
    if (this.dead) return;
    this.stun(ms);
  }

  stun(ms: number) {
    this.stunnedUntil = this.scene.time.now + ms;
    this.sprite.setVelocity(0, 0);
    this.sprite.setTint(0xa8c8ff).setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.time.delayedCall(ms, () => this.sprite.active && !this.isStunned && this.sprite.clearTint());
    this.onStun();
  }

  protected onHit() {}
  protected onStun() {}
  protected onDeath() {}

  protected die() {
    this.dead = true;
    this.onDeath();
    const s = this.sprite;
    this.scene.tweens.killTweensOf(s);
    s.setVelocity(0, 0);
    (s.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({ targets: s, alpha: 0, scale: 0.2, duration: 220, ease: "Quad.easeIn", onComplete: () => s.destroy() });
  }

  destroy() {
    this.dead = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}
