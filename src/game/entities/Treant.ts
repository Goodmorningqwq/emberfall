import Phaser from "phaser";
import { Enemy } from "./Enemy";
import type { DungeonScene } from "../scenes/DungeonScene";

/**
 * Elder Treant, boss of Whisperwood Hollow. Rooted in place at the top of
 * the room. Cycles idle → (root slam | summon sprites) → idle. Its bark
 * shrugs off the sword; ring its ember core with the boomerang to stun it,
 * then cut. Phase 2 below half HP: faster, more roots.
 */
type State = "idle" | "windup" | "slam" | "summon" | "stunned" | "dead";

export const TREANT_HP = 24;
const STUN_MS = 3000;

interface Hazard {
  x: number;
  y: number;
  r: number;
}

export class Treant extends Enemy {
  private state: State = "idle";
  private stateUntil = 0;
  private spikes: { hz: Hazard; until: number }[] = [];
  private sway: Phaser.Tweens.Tween;
  private lastAttack: "slam" | "summon" = "summon";
  private phase2Announced = false;
  /** resting tint: clear in phase 1, darker bark in phase 2 */
  private baseTint: number | null = null;

  constructor(scene: DungeonScene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    super(scene, group, x, y, "treant", TREANT_HP);
    this.bounty = 40;
    const s = this.sprite;
    s.body!.setSize(68, 44).setOffset(14, 50);
    s.setImmovable(true);
    s.setDrag(0, 0);
    this.stateUntil = scene.time.now + 1600;
    this.sway = scene.tweens.add({ targets: s, scaleX: 1.02, scaleY: 0.985, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  get isAttacking() {
    return false; // its body never hurts; the roots do
  }

  /** Hold the first attack back (boss intro). */
  delayStart(ms: number) {
    this.state = "idle";
    this.stateUntil = this.scene.time.now + ms;
  }

  private restTint() {
    const s = this.sprite;
    if (this.baseTint === null) s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    else s.setTint(this.baseTint).setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Below half HP: bark darkens, sway quickens, more roots. Announced once. */
  private checkPhase2() {
    if (this.phase2Announced || !this.phase2) return;
    this.phase2Announced = true;
    this.baseTint = 0x9a7a62;
    this.sway.stop();
    this.sway = this.scene.tweens.add({ targets: this.sprite, scaleX: 1.03, scaleY: 0.98, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.scene.bossPhase2();
  }

  get isStunned() {
    return this.state === "stunned";
  }

  get phase2() {
    return this.hp <= TREANT_HP / 2;
  }

  /** Active root spikes right now. */
  get hazards(): Hazard[] {
    const now = this.scene.time.now;
    return this.spikes.filter((s) => now < s.until).map((s) => s.hz);
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active || this.isDead) return;
    s.setVelocity(0, 0);
    s.setDepth(s.y);
    this.spikes = this.spikes.filter((k) => now < k.until + 400);
    switch (this.state) {
      case "idle":
        if (now >= this.stateUntil) {
          const enemiesAlive = this.scene.enemyCount("sprite");
          const wantSummon = this.lastAttack === "slam" && enemiesAlive < (this.phase2 ? 3 : 2);
          if (wantSummon) this.startSummon(now);
          else this.startSlam(now, px, py);
        }
        break;
      case "windup":
      case "summon":
        if (now >= this.stateUntil) this.rest(now);
        break;
      case "slam":
        if (now >= this.stateUntil) this.rest(now);
        break;
      case "stunned":
        if (now >= this.stateUntil) {
          this.restTint();
          this.sway.resume();
          this.rest(now);
          this.scene.bossStatus("recovered");
          this.checkPhase2();
        }
        break;
    }
  }

  private rest(now: number) {
    this.state = "idle";
    this.stateUntil = now + (this.phase2 ? 900 : 1500);
  }

  private startSlam(now: number, px: number, py: number) {
    this.lastAttack = "slam";
    this.state = "windup";
    const WIND = 380;
    this.stateUntil = now + WIND;
    const s = this.sprite;
    // lean back and darken, then the slam: shake + a chain of roots that chase the player
    this.sway.pause();
    this.scene.tweens.add({ targets: s, scaleY: 0.92, scaleX: 1.06, duration: WIND, ease: "Quad.easeIn" });
    s.setTint(0x5a3a1a).setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.time.delayedCall(WIND, () => {
      if (this.isDead || this.state !== "windup") return;
      this.restTint();
      this.scene.tweens.add({ targets: s, scaleY: 1, scaleX: 1, duration: 140, ease: "Back.easeOut" });
      this.scene.shake(160, 0.006);
      this.state = "slam";
      const count = this.phase2 ? 5 : 3;
      const gap = this.phase2 ? 300 : 380;
      this.stateUntil = now + WIND + count * gap + 500;
      for (let i = 0; i < count; i++) {
        this.scene.time.delayedCall(i * gap, () => {
          if (this.isDead || this.state !== "slam") return;
          const p = this.scene.playerPos();
          // first root lands where the player is; later ones lead them a little
          this.rootAt(p.x + (i > 0 ? Phaser.Math.Between(-24, 24) : 0), p.y + (i > 0 ? Phaser.Math.Between(-16, 16) : 0));
        });
      }
    });
    void px;
    void py;
  }

  private rootAt(x: number, y: number) {
    const scene = this.scene;
    const WARN = 420;
    const warn = scene.add.circle(x, y - 4, 16, 0x2a1a0c, 0.45).setDepth(y - 1).setScale(0.6);
    scene.tweens.add({ targets: warn, scale: 1, alpha: 0.7, duration: WARN, ease: "Quad.easeIn" });
    scene.time.delayedCall(WARN, () => {
      warn.destroy();
      if (this.isDead) return;
      const spike = scene.add.image(x, y, "root").setOrigin(0.5, 1).setDepth(y).setScale(1, 0.1);
      scene.tweens.add({ targets: spike, scaleY: 1, duration: 110, ease: "Back.easeOut" });
      scene.cameras.main.shake(70, 0.003);
      this.spikes.push({ hz: { x, y: y - 6, r: 14 }, until: scene.time.now + 380 });
      scene.time.delayedCall(420, () => scene.tweens.add({ targets: spike, scaleY: 0, alpha: 0.6, duration: 160, ease: "Quad.easeIn", onComplete: () => spike.destroy() }));
    });
  }

  private startSummon(now: number) {
    this.lastAttack = "summon";
    this.state = "summon";
    this.stateUntil = now + 900;
    const s = this.sprite;
    this.scene.tweens.add({ targets: s, scaleY: 1.08, scaleX: 0.96, duration: 300, yoyo: true, ease: "Sine.easeInOut" });
    this.scene.time.delayedCall(320, () => {
      if (this.isDead) return;
      for (const dx of [-52, 52]) this.scene.spawnEnemy("sprite", s.x + dx, s.y - 30, { puff: true });
    });
  }

  /** Bark: no damage unless stunned — just a dull knock. */
  takeHit(fromX: number, fromY: number, damage = 1): boolean {
    if (this.isDead) return false;
    this.hitThisSwing = true;
    if (this.state !== "stunned") {
      this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + (fromX < this.sprite.x ? 2 : -2), duration: 40, yoyo: true });
      this.scene.bossStatus("bark");
      return false;
    }
    this.hp -= damage;
    const s = this.sprite;
    s.setTint(0xfff2b0).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => s.active && this.state === "stunned" && s.setTint(0xa8c8ff).setTintMode(Phaser.TintModes.MULTIPLY));
    this.scene.tweens.add({ targets: s, x: s.x + (fromX < s.x ? 3 : -3), duration: 50, yoyo: true });
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  boomerangHit() {
    if (this.isDead || this.state === "stunned") return;
    this.state = "stunned";
    this.stateUntil = this.scene.time.now + STUN_MS;
    this.sway.pause();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setScale(1);
    this.sprite.setTint(0xa8c8ff).setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.tweens.add({ targets: this.sprite, x: "+=3", duration: 45, yoyo: true, repeat: 5 });
    this.scene.bossStatus("stunned");
  }

  protected onDeath() {
    this.state = "dead";
    this.sway.stop();
    this.scene.bossDefeated(this);
  }

  /** Overridden: a slower, bigger death than the base dissolve. */
  protected die() {
    this.dead = true;
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false;
    this.onDeath();
    const s = this.sprite;
    this.scene.tweens.killTweensOf(s);
    s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.tweens.add({ targets: s, x: "+=4", duration: 60, yoyo: true, repeat: 8 });
    this.scene.tweens.add({ targets: s, alpha: 0, scaleY: 0.6, duration: 1100, delay: 500, ease: "Quad.easeIn", onComplete: () => s.destroy() });
  }
}
