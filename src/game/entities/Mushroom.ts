import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Mushroom: doesn't move. When the player lingers close it shudders, then
 * puffs a spore cloud that hurts anyone standing in it. Teaches spacing —
 * hit it and back off, or just walk around it.
 */
type State = "idle" | "telegraph" | "spore" | "recover";

const TRIGGER_DIST = 60;
const SPORE_RADIUS = 44;
const TELEGRAPH_MS = 450;
const SPORE_MS = 650;
const RECOVER_MS = 1100;

export class Mushroom extends Enemy {
  private state: State = "idle";
  private stateUntil = 0;
  private cloud?: Phaser.GameObjects.Arc;
  private emitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    super(scene, group, x, y, "mushroom", 3);
    this.bounty = 4;
    const s = this.sprite;
    s.body!.setSize(20, 14).setOffset(6, 18);
    s.setImmovable(true);
    scene.tweens.add({ targets: s, scaleX: 1.04, scaleY: 0.97, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  /** Contact with the body never hurts; the cloud does (checked by the scene). */
  get isAttacking() {
    return false;
  }

  get hazards() {
    if (this.state !== "spore") return [];
    return [{ x: this.sprite.x, y: this.sprite.y - 10, r: SPORE_RADIUS }];
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active || this.isDead) return;
    s.setDepth(s.y);
    s.setVelocity(0, 0);
    if (this.isStunned) return;
    const d = Phaser.Math.Distance.Between(s.x, s.y - 10, px, py - 12);
    switch (this.state) {
      case "idle":
        if (d < TRIGGER_DIST) {
          this.state = "telegraph";
          this.stateUntil = now + TELEGRAPH_MS;
          // shudder + swell (the spore clip, when present, covers telegraph + puff: 8 frames over ~1.1s)
          this.scene.tweens.add({ targets: s, x: "+=1.5", duration: 40, yoyo: true, repeat: Math.floor(TELEGRAPH_MS / 80) });
          if (this.scene.anims.exists("mushroom-spore")) s.play("mushroom-spore");
          else this.scene.tweens.add({ targets: s, scaleX: 1.15, scaleY: 1.12, duration: TELEGRAPH_MS, ease: "Quad.easeIn" });
        }
        break;
      case "telegraph":
        if (now >= this.stateUntil) {
          this.state = "spore";
          this.stateUntil = now + SPORE_MS;
          if (!this.scene.anims.exists("mushroom-spore")) this.scene.tweens.add({ targets: s, scaleX: 1, scaleY: 1, duration: 120, ease: "Back.easeOut" });
          this.puff();
        }
        break;
      case "spore":
        if (now >= this.stateUntil) {
          this.state = "recover";
          this.stateUntil = now + RECOVER_MS;
          this.cloud && this.scene.tweens.add({ targets: this.cloud, alpha: 0, scale: 1.3, duration: 250, onComplete: () => this.cloud?.destroy() });
        }
        break;
      case "recover":
        if (now >= this.stateUntil) this.state = "idle";
        break;
    }
  }

  private puff() {
    const s = this.sprite;
    this.cloud?.destroy();
    this.cloud = this.scene.add.circle(s.x, s.y - 10, SPORE_RADIUS, 0xb388c9, 0.32).setDepth(s.y + 1).setScale(0.3);
    this.scene.tweens.add({ targets: this.cloud, scale: 1, duration: 160, ease: "Quad.easeOut" });
    if (this.scene.textures.exists("spore")) {
      this.emitter?.destroy();
      this.emitter = this.scene.add.particles(s.x, s.y - 12, "spore", {
        speed: { min: 20, max: 60 },
        angle: { min: 0, max: 360 },
        lifespan: 600,
        scale: { start: 1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        quantity: 14,
        emitting: false,
      }).setDepth(s.y + 2);
      this.emitter.explode(14);
    }
  }

  protected onHit() {
    if (this.state === "telegraph") {
      // interrupting the wind-up is the reward for aggression
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(1);
      this.sprite.stop();
      this.sprite.setTexture("mushroom");
      this.state = "recover";
      this.stateUntil = this.scene.time.now + 500;
    }
  }

  protected onDeath() {
    this.cloud?.destroy();
    this.emitter?.destroy();
  }

  destroy() {
    this.cloud?.destroy();
    this.emitter?.destroy();
    super.destroy();
  }
}
