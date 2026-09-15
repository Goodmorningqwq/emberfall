import Phaser from "phaser";
import type { DungeonScene } from "../scenes/DungeonScene";
import type { Enemy } from "./Enemy";
import { sfx } from "../audio";

/**
 * Dungeon 2 tool. The hook flies toward the cursor on a chain for RANGE px.
 * Latch an anchor post and it reels Wren across (water, pits); latch a foe
 * and it reels the foe to her instead. Bosses decide for themselves what a
 * hook does to them (the Bone Knight loses his shield).
 */
const SPEED = 420;
const RANGE = 320;
const REEL_SPEED = 380;

type Phase = "fly" | "reelPlayer" | "retract" | "done";

export class Grapple {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  done = false;
  private phase: Phase = "fly";
  private chain: Phaser.GameObjects.Graphics;
  private startX: number;
  private startY: number;
  private target?: { x: number; y: number };
  private reel?: Phaser.Tweens.Tween;
  private hitSet = new Set<object>();

  constructor(private scene: DungeonScene, x: number, y: number, dir: Phaser.Math.Vector2) {
    this.startX = x;
    this.startY = y;
    this.sprite = scene.physics.add.sprite(x, y, "hook").setDepth(y + 20).setScale(0.8);
    this.sprite.setCircle(9, 7, 7);
    this.sprite.setRotation(Math.atan2(dir.y, dir.x) - Math.PI / 2);
    this.sprite.setVelocity(dir.x * SPEED, dir.y * SPEED);
    this.chain = scene.add.graphics().setDepth(y + 19);
  }

  /** Once per target per throw. */
  canHit(target: object) {
    if (this.hitSet.has(target)) return false;
    this.hitSet.add(target);
    return true;
  }

  get flying() {
    return this.phase === "fly";
  }
  /** Wren is being reeled: off the floor as far as hazards are concerned. */
  get reeling() {
    return this.phase === "reelPlayer";
  }

  /** The hook bit into an anchor post: Wren gets reeled to it (a scripted glide, like a room scroll). */
  latchAnchor(ax: number, ay: number) {
    if (this.phase !== "fly") return;
    this.phase = "reelPlayer";
    this.target = { x: ax, y: ay };
    sfx("hook");
    const s = this.sprite;
    s.setVelocity(0, 0);
    s.setPosition(ax, ay - 10);
    const player = this.scene.player;
    const p = player.sprite;
    const body = p.body as Phaser.Physics.Arcade.Body;
    player.hold(99999);
    player.grace(900);
    body.setVelocity(0, 0);
    body.enable = false; // over the water, not through the fence around it
    // she lands just past the post, on the shore it stands on
    const dir = new Phaser.Math.Vector2(ax - p.x, ay + 14 - p.y).normalize();
    const tx = ax + dir.x * 28, ty = ay + 14 + dir.y * 28;
    const d = Phaser.Math.Distance.Between(p.x, p.y, tx, ty);
    player.walkScripted(Math.abs(tx - p.x) > Math.abs(ty - p.y) ? (tx > p.x ? "east" : "west") : ty > p.y ? "south" : "north");
    this.reel = this.scene.tweens.add({
      targets: p,
      x: tx,
      y: ty,
      duration: Math.max(120, (d / REEL_SPEED) * 1000),
      ease: "Quad.easeIn",
      onComplete: () => {
        if (!p.active || !p.body) return;
        body.enable = true;
        body.reset(p.x, p.y);
        player.hold(0);
        player.grace(300);
        this.finish();
      },
    });
  }

  /** The hook bit into a foe: it comes to her. */
  latchEnemy(e: Enemy) {
    if (this.phase !== "fly") return;
    sfx("stun");
    const p = this.scene.player.sprite;
    e.grappled(p.x, p.y);
    this.retract();
  }

  retract() {
    if (this.phase === "done") return;
    this.phase = "retract";
    this.sprite.setVelocity(0, 0);
    (this.sprite.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
  }

  update(px: number, py: number) {
    const s = this.sprite;
    if (this.done || !s.active) return;
    const body = s.body as Phaser.Physics.Arcade.Body;
    switch (this.phase) {
      case "fly":
        if (Phaser.Math.Distance.Between(this.startX, this.startY, s.x, s.y) >= RANGE || body.blocked.none === false) this.retract();
        break;
      case "reelPlayer":
        break; // the tween is driving her
      case "retract": {
        const v = new Phaser.Math.Vector2(px - s.x, py - s.y);
        if (v.length() < 14) {
          this.finish();
          return;
        }
        v.normalize().scale(REEL_SPEED * 1.4);
        s.setVelocity(v.x, v.y);
        break;
      }
    }
    s.setDepth(s.y + 20);
    this.drawChain(px, py);
  }

  private drawChain(px: number, py: number) {
    const g = this.chain;
    g.clear();
    const s = this.sprite;
    const dx = s.x - px, dy = s.y - py;
    const len = Math.hypot(dx, dy);
    if (len < 4) return;
    // links: alternating pale/dark dashes, so it reads as a chain and not a rope
    const n = Math.max(1, Math.floor(len / 5));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 0.7) / n;
      g.lineStyle(2, i % 2 ? 0x8a8a96 : 0x3a3a46, 1);
      g.beginPath();
      g.moveTo(px + dx * t0, py + dy * t0);
      g.lineTo(px + dx * t1, py + dy * t1);
      g.strokePath();
    }
    g.setDepth(Math.max(s.y, py) + 19);
  }

  private finish() {
    this.phase = "done";
    this.done = true;
    this.scene.player.walkScripted(null);
    this.chain.destroy();
    this.sprite.destroy();
  }

  destroy() {
    if (this.phase === "reelPlayer") {
      this.reel?.stop();
      const p = this.scene.player.sprite;
      const pb = p.body as Phaser.Physics.Arcade.Body | undefined;
      if (pb) {
        pb.enable = true;
        pb.reset(p.x, p.y);
      }
      this.scene.player.hold(0);
      this.scene.player.walkScripted(null);
    }
    this.phase = "done";
    this.done = true;
    this.chain.destroy();
    this.sprite.destroy();
  }
}
