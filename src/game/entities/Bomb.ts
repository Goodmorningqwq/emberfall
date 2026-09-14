import Phaser from "phaser";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Dropped at the player's feet. Fuse flashes faster as it runs out, then a
 * blast that hurts everything in RADIUS (player included) and breaks cracked
 * walls. The scene does the damage; this owns the fuse and the visuals.
 */
export const BOMB_FUSE_MS = 1500;
export const BOMB_RADIUS = 56;

export class Bomb {
  readonly sprite: Phaser.GameObjects.Image;
  private placedAt: number;
  exploded = false;

  constructor(private scene: DungeonScene, x: number, y: number) {
    this.placedAt = scene.time.now;
    this.sprite = scene.add.image(x, y, "bomb").setOrigin(0.5, 0.9).setDepth(y);
    scene.tweens.add({ targets: this.sprite, scaleX: 1.08, scaleY: 0.94, duration: 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  update(now: number) {
    if (this.exploded) return;
    const t = now - this.placedAt;
    // blink: slow at first, frantic at the end
    const period = t < BOMB_FUSE_MS * 0.6 ? 260 : 110;
    const on = Math.floor(t / period) % 2 === 0;
    if (on) this.sprite.setTint(0xff6b5a).setTintMode(Phaser.TintModes.ADD);
    else this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    if (t >= BOMB_FUSE_MS) this.explode();
  }

  private explode() {
    this.exploded = true;
    const { x, y } = this.sprite;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
    // visuals: white flash disc → orange ring → smoke
    const flash = this.scene.add.circle(x, y - 6, BOMB_RADIUS, 0xfff2b0, 0.9).setDepth(9000).setScale(0.2);
    this.scene.tweens.add({ targets: flash, scale: 1, alpha: 0, duration: 260, ease: "Quad.easeOut", onComplete: () => flash.destroy() });
    const ring = this.scene.add.circle(x, y - 6, BOMB_RADIUS, 0x000000, 0).setStrokeStyle(3, 0xd1541f, 1).setDepth(9001).setScale(0.3);
    this.scene.tweens.add({ targets: ring, scale: 1.15, alpha: 0, duration: 380, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    if (this.scene.textures.exists("spore")) {
      const smoke = this.scene.add.particles(x, y - 6, "spore", {
        speed: { min: 30, max: 110 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 300, max: 600 },
        scale: { start: 1.4, end: 0 },
        tint: [0x555555, 0x888888, 0xd1541f],
        alpha: { start: 1, end: 0 },
        emitting: false,
      }).setDepth(9002);
      smoke.explode(22);
      this.scene.time.delayedCall(700, () => smoke.destroy());
    }
    this.scene.onExplosion(x, y - 6, BOMB_RADIUS);
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}
