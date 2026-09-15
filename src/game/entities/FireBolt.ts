import Phaser from "phaser";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Dungeon 3 tool. A short-lived ember bolt from the Fire Rod: flies straight for RANGE px,
 * lights braziers, burns thorns, heats cinderlings and the golem's back, singes anything
 * else for 1. Drawn as a small generated flame with a spark trail; no sprite needed.
 */
const SPEED = 300;
const RANGE = 190;

export class FireBolt {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  done = false;
  private startX: number;
  private startY: number;
  private hitSet = new Set<object>();
  private trail: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: DungeonScene, x: number, y: number, dir: Phaser.Math.Vector2) {
    this.startX = x;
    this.startY = y;
    if (!scene.textures.exists("ember")) {
      const g = scene.add.graphics();
      g.fillStyle(0xff8a3a, 1).fillCircle(5, 5, 5).fillStyle(0xffe08a, 1).fillCircle(5, 5, 2.5);
      g.generateTexture("ember", 10, 10);
      g.destroy();
    }
    this.sprite = scene.physics.add.sprite(x, y, "ember").setDepth(y + 20).setBlendMode(Phaser.BlendModes.ADD);
    this.sprite.setCircle(5);
    this.sprite.setVelocity(dir.x * SPEED, dir.y * SPEED);
    this.trail = scene.add.particles(0, 0, "spore", {
      follow: this.sprite,
      speed: { min: 5, max: 20 },
      lifespan: { min: 120, max: 260 },
      scale: { start: 0.6, end: 0 },
      tint: [0xff8a3a, 0xffd166],
      alpha: { start: 0.9, end: 0 },
      frequency: 18,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(y + 19);
  }

  canHit(target: object) {
    if (this.hitSet.has(target)) return false;
    this.hitSet.add(target);
    return true;
  }

  update() {
    const s = this.sprite;
    if (this.done || !s.active) return;
    const body = s.body as Phaser.Physics.Arcade.Body;
    if (Phaser.Math.Distance.Between(this.startX, this.startY, s.x, s.y) >= RANGE || body.blocked.none === false) return this.burst();
    s.setDepth(s.y + 20);
  }

  /** It lands: a small flare, then gone. */
  burst() {
    if (this.done) return;
    this.done = true;
    this.scene.puff(this.sprite.x, this.sprite.y, 0xff9a4a, 8);
    this.trail.stop();
    this.scene.time.delayedCall(300, () => this.trail.destroy());
    this.sprite.destroy();
  }

  destroy() {
    this.done = true;
    this.trail.destroy();
    this.sprite.destroy();
  }
}
