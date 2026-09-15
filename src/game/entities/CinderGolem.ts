import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";
import { sfx } from "../audio";

/**
 * Cinder Golem, boss of the Cinder Depths. A slow wall of cooled slag: steel rings off
 * the crust from any side. It stomps (a shockwave ring you must be outside of), hurls
 * magma (three warned splashes that leave fire), and turns to keep its face on Wren.
 * A Fire Rod bolt into the vent on its BACK overheats it: the crust cracks and glows for
 * a few seconds and the sword bites. Phase 2 under half: quicker, four splashes.
 */
type State = "idle" | "turn" | "stompTell" | "stomp" | "throwTell" | "throw" | "hot" | "dead";

export const CINDERGOLEM_HP = 30;
const HOT_MS = 4200;
const HOT_MS_P2 = 3200;

interface Hazard {
  x: number;
  y: number;
  r: number;
}

export class CinderGolem extends Enemy {
  private state: State = "idle";
  private stateUntil = 0;
  private facing = new Phaser.Math.Vector2(0, 1);
  private ring?: { hz: Hazard; until: number };
  private attacks = 0;
  private phase2Announced = false;
  private hotTint = false;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    super(scene, group, x, y, "cindergolem", CINDERGOLEM_HP);
    this.isBoss = true;
    this.bounty = 80;
    const s = this.sprite;
    s.body!.setSize(40, 40).setOffset(12, 22);
    s.setImmovable(true);
    s.setDrag(0, 0);
    this.stateUntil = scene.time.now + 1200;
    // it breathes heat
    scene.tweens.add({ targets: s, scaleY: 1.015, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  get isAttacking() {
    return false; // it never runs into her; the ring and the splashes do the hurting
  }

  get isStunned() {
    return this.state === "hot";
  }

  get phase2() {
    return this.hp <= CINDERGOLEM_HP / 2;
  }

  /** The crust: steel does nothing unless it's glowing. */
  get blocksNow() {
    return this.state !== "hot";
  }

  get hazards(): Hazard[] {
    const now = this.scene.time.now;
    return this.ring && now < this.ring.until ? [this.ring.hz] : [];
  }

  /** Where its back is, for the rod: the bolt must come from behind (dot with facing < -0.2). */
  backHit(fromX: number, fromY: number): boolean {
    const s = this.sprite;
    const to = new Phaser.Math.Vector2(fromX - s.x, fromY - (s.y - 28)).normalize();
    return to.dot(this.facing) < -0.2;
  }

  delayStart(ms: number) {
    this.state = "idle";
    this.stateUntil = this.scene.time.now + ms;
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active || this.isDead) return;
    s.setDepth(s.y);
    s.setVelocity(0, 0);
    const to = new Phaser.Math.Vector2(px - s.x, py - (s.y - 28));
    switch (this.state) {
      case "idle":
        if (now >= this.stateUntil) {
          // it turns slowly: a chance to get behind it
          const want = to.clone().normalize();
          const cur = this.facing.clone();
          const ang = Phaser.Math.Angle.Wrap(Math.atan2(want.y, want.x) - Math.atan2(cur.y, cur.x));
          if (Math.abs(ang) > 0.5) {
            this.state = "turn";
            this.stateUntil = now + (this.phase2 ? 400 : 650);
            this.scene.tweens.add({ targets: s, angle: ang > 0 ? 3 : -3, duration: 200, yoyo: true });
          } else this.startAttack(now);
        }
        break;
      case "turn":
        if (now >= this.stateUntil) {
          this.facing.copy(to.normalize());
          s.setFlipX(this.facing.x < 0);
          this.state = "idle";
          this.stateUntil = now + 250;
        }
        break;
      case "stomp":
      case "throw":
        if (now >= this.stateUntil) this.rest(now, this.phase2 ? 700 : 1100);
        break;
      case "hot":
        if (now >= this.stateUntil) {
          this.coolDown();
          this.rest(now, 600);
        }
        break;
    }
  }

  private rest(now: number, ms: number) {
    this.state = "idle";
    this.stateUntil = now + ms;
    this.checkPhase2();
  }

  private startAttack(now: number) {
    this.attacks++;
    if (this.attacks % 2 === 0) this.startThrow(now);
    else this.startStomp(now);
  }

  /** Stomp: it rises, the floor cracks, a ring races out. Stand far or take two. */
  private startStomp(now: number) {
    this.state = "stompTell";
    const TELL = this.phase2 ? 520 : 750;
    this.stateUntil = now + TELL;
    const s = this.sprite;
    sfx("growl");
    this.scene.tweens.add({ targets: s, scaleY: 1.12, scaleX: 0.94, duration: TELL, ease: "Quad.easeIn" });
    const warn = this.scene.add.circle(s.x, s.y - 6, 30, 0xff6a2a, 0.12).setStrokeStyle(2, 0xff9a4a, 0.8).setDepth(-990);
    this.scene.tweens.add({ targets: warn, scale: 3.2, alpha: 0.5, duration: TELL, ease: "Quad.easeIn", onComplete: () => warn.destroy() });
    this.scene.time.delayedCall(TELL, () => {
      if (this.isDead || this.state !== "stompTell") return;
      this.state = "stomp";
      this.stateUntil = this.scene.time.now + 600;
      this.scene.tweens.add({ targets: s, scaleY: 0.92, scaleX: 1.1, duration: 90, yoyo: true, ease: "Quad.easeOut" });
      this.scene.shake(300, 0.01);
      sfx("stomp");
      // the ring: a hazard band that expands; hurt if her distance is within the band
      const ring = this.scene.add.circle(s.x, s.y - 6, 20, 0x000000, 0).setStrokeStyle(5, 0xff9a4a, 0.95).setDepth(9000);
      const t0 = this.scene.time.now;
      this.scene.tweens.add({ targets: ring, scale: 5, alpha: 0.2, duration: 520, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
      const check = () => {
        if (this.isDead) return;
        const dt = this.scene.time.now - t0;
        if (dt > 520) return;
        const rad = 20 + (dt / 520) * 80;
        const p = this.scene.playerPos();
        const d = Phaser.Math.Distance.Between(s.x, s.y - 6, p.x, p.y - 8);
        if (Math.abs(d - rad) < 14) this.scene.hurtPlayer(s.x, s.y, 2);
        this.scene.time.delayedCall(40, check);
      };
      check();
      this.scene.puff(s.x, s.y - 4, 0x9a8a80, 16);
    });
  }

  /** Magma throw: three (four) warned splashes at and around her, each leaving fire. */
  private startThrow(now: number) {
    this.state = "throwTell";
    const TELL = this.phase2 ? 380 : 520;
    this.stateUntil = now + TELL;
    const s = this.sprite;
    s.setTint(0x603020).setTintMode(Phaser.TintModes.ADD);
    this.scene.tweens.add({ targets: s, scaleX: 0.94, scaleY: 1.06, duration: TELL, ease: "Quad.easeIn" });
    this.scene.time.delayedCall(TELL, () => {
      if (this.isDead || this.state !== "throwTell") return;
      if (!this.hotTint) s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      this.state = "throw";
      const count = this.phase2 ? 4 : 3;
      const gap = this.phase2 ? 260 : 340;
      this.stateUntil = this.scene.time.now + count * gap + 500;
      this.scene.tweens.add({ targets: s, scaleX: 1.08, scaleY: 0.95, duration: 120, yoyo: true });
      for (let i = 0; i < count; i++) {
        this.scene.time.delayedCall(i * gap, () => {
          if (this.isDead || this.state !== "throw") return;
          const p = this.scene.playerPos();
          this.scene.magmaSplash(p.x + (i > 0 ? Phaser.Math.Between(-40, 40) : 0), p.y + (i > 0 ? Phaser.Math.Between(-26, 26) : 0), s.x, s.y - 40);
        });
      }
    });
  }

  /** A rod bolt in the back: the crust cracks open. */
  overheat() {
    if (this.isDead || this.state === "hot") return;
    this.scene.tweens.killTweensOf(this.sprite);
    this.ring = undefined;
    this.state = "hot";
    this.hotTint = true;
    this.stateUntil = this.scene.time.now + (this.phase2 ? HOT_MS_P2 : HOT_MS);
    const s = this.sprite;
    s.setScale(1).setAngle(0);
    s.setTint(0xff7a30).setTintMode(Phaser.TintModes.ADD);
    this.scene.tweens.add({ targets: s, x: "+=3", duration: 45, yoyo: true, repeat: 5 });
    this.scene.puff(s.x, s.y - 30, 0xffb060, 18);
    sfx("sizzle");
    this.scene.bossStatus("stunned");
  }

  private coolDown() {
    this.hotTint = false;
    this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.puff(this.sprite.x, this.sprite.y - 30, 0x9a8a80, 10);
    this.scene.bossStatus("recovered");
  }

  private checkPhase2() {
    if (this.phase2Announced || !this.phase2) return;
    this.phase2Announced = true;
    this.scene.bossPhase2();
  }

  takeHit(fromX: number, fromY: number, damage = 1): boolean {
    if (this.isDead) return false;
    this.hitThisSwing = true;
    if (this.blocksNow) {
      this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + (fromX < this.sprite.x ? 2 : -2), duration: 40, yoyo: true });
      this.scene.bossStatus("bark");
      return false;
    }
    this.hp -= damage;
    const s = this.sprite;
    s.setTint(0xfff2b0).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => s.active && this.state === "hot" && s.setTint(0xff7a30).setTintMode(Phaser.TintModes.ADD));
    this.scene.tweens.add({ targets: s, x: s.x + (fromX < s.x ? 3 : -3), duration: 50, yoyo: true });
    void fromY;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  boomerangHit() {
    if (this.isDead) return;
    this.scene.bossStatus("bark");
  }

  grappled() {
    if (this.isDead) return;
    this.scene.tweens.add({ targets: this.sprite, x: "+=2", duration: 40, yoyo: true, repeat: 2 });
    this.scene.bossStatus("bark");
  }

  protected onDeath() {
    this.state = "dead";
    this.scene.bossDefeated(this);
  }

  /** It cools to grey and crumbles. */
  protected die() {
    this.dead = true;
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    this.onDeath();
    const s = this.sprite;
    this.scene.tweens.killTweensOf(s);
    s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({ targets: s, x: "+=4", duration: 60, yoyo: true, repeat: 8 });
    this.scene.time.delayedCall(600, () => s.active && s.setTint(0x6a6462).setTintMode(Phaser.TintModes.MULTIPLY));
    this.scene.tweens.add({ targets: s, alpha: 0, scaleY: 0.4, duration: 1000, delay: 900, ease: "Quad.easeIn", onComplete: () => s.destroy() });
    this.scene.time.delayedCall(900, () => this.scene.puff(s.x, s.y - 20, 0x9a8a80, 30));
  }
}
