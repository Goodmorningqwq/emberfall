import Phaser from "phaser";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Dungeon 1 tool. Flies toward the cursor for RANGE px (or until it hits a
 * wall), then homes back to the player. Stuns what it touches, pops sprites,
 * rings crystal switches and fetches pickups on the way back.
 */
const SPEED = 330;
const RETURN_SPEED = 380;
const RANGE = 150;

export class Boomerang {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  returning = false;
  done = false;
  /** pickups snagged mid-flight ride along until it lands in the player's hand */
  private cargo: Phaser.GameObjects.Image[] = [];
  private startX: number;
  private startY: number;
  private hitSet = new Set<object>();

  constructor(private scene: DungeonScene, x: number, y: number, dir: Phaser.Math.Vector2) {
    this.startX = x;
    this.startY = y;
    this.sprite = scene.physics.add.sprite(x, y, "boomerang").setDepth(y + 20);
    this.sprite.setCircle(9, 3, 3);
    this.sprite.setVelocity(dir.x * SPEED, dir.y * SPEED);
    scene.tweens.add({ targets: this.sprite, angle: 360, duration: 260, repeat: -1 });
  }

  /** Once per target per throw. */
  canHit(target: object) {
    if (this.hitSet.has(target)) return false;
    this.hitSet.add(target);
    return true;
  }

  carry(item: Phaser.GameObjects.Image) {
    this.cargo.push(item);
    this.turnBack();
  }

  turnBack() {
    if (this.returning) return;
    this.returning = true;
    this.hitSet.clear(); // it can stun again on the way home
  }

  update(px: number, py: number) {
    const s = this.sprite;
    if (this.done || !s.active) return;
    const body = s.body as Phaser.Physics.Arcade.Body;
    if (!this.returning) {
      if (Phaser.Math.Distance.Between(this.startX, this.startY, s.x, s.y) >= RANGE || body.blocked.none === false) this.turnBack();
    }
    if (this.returning) {
      const v = new Phaser.Math.Vector2(px - s.x, py - s.y);
      const d = v.length();
      if (d < 14) {
        this.finish();
        return;
      }
      v.normalize().scale(RETURN_SPEED);
      s.setVelocity(v.x, v.y);
      // walls don't stop the return trip
      body.checkCollision.none = true;
    }
    s.setDepth(s.y + 20);
    for (const c of this.cargo) c.setPosition(s.x, s.y - 6).setDepth(s.y + 21);
  }

  private finish() {
    this.done = true;
    for (const c of this.cargo) this.scene.collectPickup(c);
    this.cargo = [];
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }

  destroy() {
    this.done = true;
    for (const c of this.cargo) c.destroy();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}
