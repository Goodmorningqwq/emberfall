import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Forest sprite: a fast, fragile wisp. Hovers around the player at arm's
 * length, then freezes with a bright flare and darts straight at them.
 * Only the dart hurts. One hit kills it; the boomerang kills it outright.
 */
type State = "hover" | "telegraph" | "dart" | "recover";

const HOVER_DIST = 90;
const HOVER_SPEED = 70;
const DART_SPEED = 330;
const TELEGRAPH_MS = 320;
const DART_MS = 240;
const RECOVER_MS = 700;

export class ForestSprite extends Enemy {
  private state: State = "hover";
  private stateUntil = 0;
  private nextDartAt = 0;
  private phase = Math.random() * Math.PI * 2;
  private bob?: Phaser.Tweens.Tween;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    super(scene, group, x, y, "sprite", 1);
    this.bounty = 2;
    const s = this.sprite;
    s.body!.setSize(16, 16).setOffset(8, 8);
    this.nextDartAt = scene.time.now + 900 + Math.random() * 800;
    // flicker, not a y-bob: tweening y would fight the physics body
    this.bob = scene.tweens.add({ targets: s, alpha: 0.7, duration: 380 + Math.random() * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  get isAttacking() {
    return this.state === "dart";
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active || this.isDead) return;
    s.setDepth(s.y + 8);
    if (this.isStunned) {
      s.setVelocity(0, 0);
      return;
    }
    const to = new Phaser.Math.Vector2(px - s.x, py - 14 - s.y);
    const d = to.length();
    switch (this.state) {
      case "hover": {
        // circle-ish drift that keeps ~HOVER_DIST away, with a sine wobble
        this.phase += 0.03;
        const tangent = new Phaser.Math.Vector2(-to.y, to.x).normalize();
        const radial = to.clone().normalize().scale(Phaser.Math.Clamp((d - HOVER_DIST) / 40, -1, 1));
        const v = tangent.scale(Math.sin(this.phase) * 0.9).add(radial).normalize().scale(HOVER_SPEED);
        s.setVelocity(v.x, v.y);
        s.setFlipX(v.x < 0);
        if (now >= this.nextDartAt && d < 200) {
          this.state = "telegraph";
          this.stateUntil = now + TELEGRAPH_MS;
          s.setVelocity(0, 0);
          this.bob?.pause();
          s.setTint(0xffffff).setTintMode(Phaser.TintModes.ADD);
          this.scene.tweens.add({ targets: s, scaleX: 0.8, scaleY: 1.25, duration: TELEGRAPH_MS, ease: "Quad.easeIn" });
        }
        break;
      }
      case "telegraph":
        if (now >= this.stateUntil) {
          this.state = "dart";
          this.stateUntil = now + DART_MS;
          s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
          s.setScale(1.3, 0.75);
          this.scene.tweens.add({ targets: s, scaleX: 1, scaleY: 1, duration: DART_MS, ease: "Quad.easeOut" });
          const v = to.normalize().scale(DART_SPEED);
          s.setVelocity(v.x, v.y);
          s.setFlipX(v.x < 0);
        }
        break;
      case "dart":
        if (now >= this.stateUntil) {
          this.state = "recover";
          this.stateUntil = now + RECOVER_MS;
          s.setVelocity(0, 0);
          this.bob?.resume();
        }
        break;
      case "recover":
        if (now >= this.stateUntil) {
          this.state = "hover";
          this.nextDartAt = now + 1200 + Math.random() * 900;
        }
        break;
    }
  }

  boomerangHit() {
    // fragile: the boomerang pops it
    this.takeHit(this.sprite.x, this.sprite.y + 1, 1);
  }

  protected onHit() {
    this.state = "recover";
    this.stateUntil = this.scene.time.now + 300;
  }

  protected onStun() {
    this.state = "recover";
    this.stateUntil = this.stunnedUntil;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(1);
  }
}
