import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Bone Knight, boss of the Sunken Crypt. A walking wall: he advances behind
 * a tower shield that turns every blow from the front, and swings a greatsword
 * when Wren is in reach. Now and then he lowers the shield and charges.
 * The grapple hook rips the shield from his arm for a few seconds - then he's
 * open. Hits from behind always count. Phase 2 below half HP: quicker, and he
 * charges twice.
 */
type State = "idle" | "advance" | "windup" | "swing" | "chargeTell" | "charge" | "exposed" | "dead";

export const BONEKNIGHT_HP = 30;
const EXPOSED_MS = 3600;
const EXPOSED_MS_P2 = 2600;

interface Hazard {
  x: number;
  y: number;
  r: number;
}

export class BoneKnight extends Enemy {
  private state: State = "idle";
  private stateUntil = 0;
  private facing = new Phaser.Math.Vector2(0, 1);
  private swingHz?: { hz: Hazard; until: number };
  private swingsSinceCharge = 0;
  private phase2Announced = false;
  private stomp?: Phaser.Tweens.Tween;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    super(scene, group, x, y, "boneknight", BONEKNIGHT_HP);
    this.isBoss = true;
    this.bounty = 60;
    const s = this.sprite;
    s.body!.setSize(34, 24).setOffset(15, 40);
    s.setImmovable(true);
    s.setDrag(0, 0);
    this.stateUntil = scene.time.now + 1200;
  }

  get isAttacking() {
    return this.state === "charge";
  }

  get isStunned() {
    return this.state === "exposed";
  }

  get phase2() {
    return this.hp <= BONEKNIGHT_HP / 2;
  }

  /** The shield is up and turned toward her: steel from that side just rings. */
  get blocksNow() {
    if (this.state === "exposed" || this.state === "charge") return false;
    const p = this.scene.playerPos();
    const s = this.sprite;
    const to = new Phaser.Math.Vector2(p.x - s.x, p.y - (s.y - 24)).normalize();
    return to.dot(this.facing) > 0.15; // roughly the front 160 degrees
  }

  get hazards(): Hazard[] {
    const now = this.scene.time.now;
    return this.swingHz && now < this.swingHz.until ? [this.swingHz.hz] : [];
  }

  delayStart(ms: number) {
    this.state = "idle";
    this.stateUntil = this.scene.time.now + ms;
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active || this.isDead) return;
    s.setDepth(s.y);
    const to = new Phaser.Math.Vector2(px - s.x, py - (s.y - 24));
    const d = to.length();
    switch (this.state) {
      case "idle":
        s.setVelocity(0, 0);
        if (now >= this.stateUntil) this.state = "advance";
        break;
      case "advance": {
        // shield first, slow and sure
        const v = to.clone().normalize();
        this.facing.copy(v);
        s.setFlipX(v.x < 0);
        if (d < 58) {
          s.setVelocity(0, 0);
          this.startSwing(now);
        } else {
          const sp = this.phase2 ? 58 : 44;
          s.setVelocity(v.x * sp, v.y * sp);
          if (!this.stomp) this.stomp = this.scene.tweens.add({ targets: s, scaleY: 0.97, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        break;
      }
      case "windup":
      case "chargeTell":
        s.setVelocity(0, 0);
        break;
      case "swing":
        if (now >= this.stateUntil) this.rest(now, this.phase2 ? 500 : 800);
        break;
      case "charge":
        if (now >= this.stateUntil || (s.body as Phaser.Physics.Arcade.Body).blocked.none === false) {
          s.setVelocity(0, 0);
          if ((s.body as Phaser.Physics.Arcade.Body).blocked.none === false) this.scene.shake(160, 0.006);
          this.rest(now, 900);
        }
        break;
      case "exposed":
        s.setVelocity(0, 0);
        if (now >= this.stateUntil) {
          this.shieldBack();
          this.rest(now, 500);
        }
        break;
    }
  }

  private rest(now: number, ms: number) {
    this.state = "idle";
    this.stateUntil = now + ms;
    this.stomp?.stop();
    this.stomp = undefined;
    this.sprite.setScale(1);
    this.checkPhase2();
  }

  private startSwing(now: number) {
    this.stomp?.stop();
    this.stomp = undefined;
    this.sprite.setScale(1);
    // every third swing he charges instead
    this.swingsSinceCharge++;
    if (this.swingsSinceCharge >= (this.phase2 ? 2 : 3)) {
      this.swingsSinceCharge = 0;
      return this.startCharge(now);
    }
    this.state = "windup";
    const WIND = this.phase2 ? 380 : 520;
    this.stateUntil = now + WIND;
    const s = this.sprite;
    // the greatsword goes up: he leans back and the blade catches the light
    this.scene.tweens.add({ targets: s, scaleY: 1.08, scaleX: 0.95, duration: WIND, ease: "Quad.easeIn" });
    s.setTint(0x404860).setTintMode(Phaser.TintModes.ADD);
    this.scene.time.delayedCall(WIND, () => {
      if (this.isDead || this.state !== "windup") return;
      s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      this.state = "swing";
      this.stateUntil = now + WIND + 260;
      this.scene.tweens.add({ targets: s, scaleY: 0.94, scaleX: 1.08, duration: 90, yoyo: true, ease: "Quad.easeOut" });
      this.scene.shake(90, 0.004);
      // the arc lands in front of him
      const f = this.facing;
      const hz = { x: s.x + f.x * 34, y: s.y - 20 + f.y * 30, r: 26 };
      this.swingHz = { hz, until: this.scene.time.now + 220 };
      this.scene.slashArc(hz.x, hz.y, Math.atan2(f.y, f.x));
    });
  }

  private startCharge(now: number) {
    this.state = "chargeTell";
    const TELL = this.phase2 ? 520 : 680;
    this.stateUntil = now + TELL;
    const s = this.sprite;
    s.setTint(0x603030).setTintMode(Phaser.TintModes.ADD);
    this.scene.tweens.add({ targets: s, x: "+=2", duration: 50, yoyo: true, repeat: Math.floor(TELL / 100) });
    this.scene.time.delayedCall(TELL, () => {
      if (this.isDead || this.state !== "chargeTell") return;
      s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      const p = this.scene.playerPos();
      const v = new Phaser.Math.Vector2(p.x - s.x, p.y - (s.y - 24)).normalize();
      this.facing.copy(v);
      s.setFlipX(v.x < 0);
      this.state = "charge";
      this.stateUntil = this.scene.time.now + 520;
      s.setVelocity(v.x * 280, v.y * 280);
      this.scene.shake(120, 0.004);
      // dust kicked up behind him for the length of the charge
      for (let i = 0; i < 5; i++) this.scene.time.delayedCall(i * 100, () => this.state === "charge" && this.scene.puff(s.x - v.x * 14, s.y - 2, 0x9aa0b0, 4));
    });
  }

  /** Grappled: the shield tears off his arm and he staggers, wide open. */
  grappled() {
    if (this.isDead || this.state === "exposed") return;
    this.scene.tweens.killTweensOf(this.sprite);
    this.stomp = undefined;
    this.swingHz = undefined;
    this.state = "exposed";
    this.stateUntil = this.scene.time.now + (this.phase2 ? EXPOSED_MS_P2 : EXPOSED_MS);
    const s = this.sprite;
    s.setScale(1).setVelocity(0, 0);
    s.setTint(0xa8c8ff).setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.tweens.add({ targets: s, x: "+=3", duration: 45, yoyo: true, repeat: 5 });
    // the shield skids away and comes back when he recovers
    this.scene.shieldFlies(s.x, s.y, this.facing);
    this.scene.bossStatus("stunned");
  }

  private shieldBack() {
    const s = this.sprite;
    s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.bossStatus("recovered");
  }

  private checkPhase2() {
    if (this.phase2Announced || !this.phase2) return;
    this.phase2Announced = true;
    this.scene.bossPhase2();
  }

  /** From the front with the shield up: a clang and nothing else. */
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
    this.scene.time.delayedCall(70, () => s.active && (this.state === "exposed" ? s.setTint(0xa8c8ff).setTintMode(Phaser.TintModes.MULTIPLY) : s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY)));
    this.scene.tweens.add({ targets: s, x: s.x + (fromX < s.x ? 3 : -3), duration: 50, yoyo: true });
    void fromY;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  /** The boomerang just rattles off the armour. */
  boomerangHit() {
    if (this.isDead) return;
    this.scene.tweens.add({ targets: this.sprite, x: "+=2", duration: 40, yoyo: true });
    this.scene.bossStatus("bark");
  }

  protected onDeath() {
    this.state = "dead";
    this.stomp?.stop();
    this.scene.bossDefeated(this);
  }

  /** A slower, heavier death than the base dissolve: he drops to his knees and crumbles. */
  protected die() {
    this.dead = true;
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    this.onDeath();
    const s = this.sprite;
    this.scene.tweens.killTweensOf(s);
    s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({ targets: s, x: "+=4", duration: 60, yoyo: true, repeat: 8 });
    this.scene.tweens.add({ targets: s, scaleY: 0.7, duration: 500, delay: 500, ease: "Quad.easeIn" });
    this.scene.tweens.add({ targets: s, alpha: 0, scaleY: 0.3, duration: 900, delay: 900, ease: "Quad.easeIn", onComplete: () => s.destroy() });
    this.scene.time.delayedCall(700, () => this.scene.puff(s.x, s.y - 20, 0xf0e8d8, 30));
  }
}
