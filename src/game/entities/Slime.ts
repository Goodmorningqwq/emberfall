import Phaser from "phaser";

/**
 * Demo slime. State machine:
 *   wander → (player near) telegraph → lunge → recover → wander
 * Touching it only hurts during `lunge`; being hit knocks it into `stunned`.
 */
type SlimeState = "wander" | "telegraph" | "lunge" | "recover" | "stunned";

const AGGRO_RANGE = 130;
const WANDER_SPEED = 28;
const LUNGE_SPEED = 190;
const TELEGRAPH_MS = 420;
const LUNGE_MS = 260;
const RECOVER_MS = 900;
const STUN_MS = 450;

export class Slime {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  hp = 2;
  hitThisSwing = false;

  private scene: Phaser.Scene;
  private state: SlimeState = "wander";
  private stateUntil = 0;
  private breathe?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number) {
    this.scene = scene;
    this.sprite = group.create(x, y, "slime") as Phaser.Physics.Arcade.Sprite;
    this.sprite.setOrigin(0.5, 1);
    this.sprite.body!.setSize(this.sprite.width * 0.7, this.sprite.height * 0.5).setOffset(this.sprite.width * 0.15, this.sprite.height * 0.5);
    this.sprite.setPushable(false);
    this.sprite.setDrag(900, 900);
    this.sprite.setData("slime", this);
    this.startBreathing();
  }

  get isAttacking() {
    return this.state === "lunge";
  }

  update(now: number, px: number, py: number) {
    const s = this.sprite;
    if (!s.active) return;
    s.setDepth(s.y);
    const d = Phaser.Math.Distance.Between(s.x, s.y, px, py);

    switch (this.state) {
      case "wander":
        if (d < AGGRO_RANGE) {
          this.enter("telegraph", now + TELEGRAPH_MS);
          // the tell: squash down + red glints
          s.setVelocity(0, 0);
          this.breathe?.pause();
          this.scene.tweens.add({ targets: s, scaleX: 1.25, scaleY: 0.7, duration: TELEGRAPH_MS * 0.8, ease: "Quad.easeIn" });
          this.glint();
        } else if (d > 24) {
          const v = new Phaser.Math.Vector2(px - s.x, py - s.y).normalize().scale(WANDER_SPEED * 0.6);
          s.setVelocity(v.x, v.y);
        }
        break;
      case "telegraph":
        if (now >= this.stateUntil) {
          this.enter("lunge", now + LUNGE_MS);
          s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
          s.setScale(0.85, 1.2); // stretch on launch
          this.scene.tweens.add({ targets: s, scaleX: 1, scaleY: 1, duration: LUNGE_MS, ease: "Quad.easeOut" });
          const v = new Phaser.Math.Vector2(px - s.x, py - s.y).normalize().scale(LUNGE_SPEED);
          s.setVelocity(v.x, v.y);
        }
        break;
      case "lunge":
        if (now >= this.stateUntil) {
          this.enter("recover", now + RECOVER_MS);
          s.setVelocity(0, 0);
          this.breathe?.resume();
        }
        break;
      case "recover":
      case "stunned":
        if (now >= this.stateUntil) this.enter("wander", 0);
        break;
    }
  }

  /** Called by the scene when the sword connects. Returns true if it died. */
  takeHit(fromX: number, fromY: number, now: number): boolean {
    this.hp -= 1;
    this.hitThisSwing = true;
    this.enter("stunned", now + STUN_MS);
    this.scene.tweens.killTweensOf(this.sprite);
    this.breathe?.resume();
    const s = this.sprite;
    s.setScale(1, 1);
    s.setTint(0xfff2b0).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => s.active && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    const dir = new Phaser.Math.Vector2(s.x - fromX, s.y - fromY).normalize();
    s.setVelocity(dir.x * 200, dir.y * 200); // drag brings it to rest
    if (this.hp <= 0) {
      this.state = "stunned";
      this.stateUntil = Infinity;
      this.scene.tweens.add({
        targets: s,
        alpha: 0,
        scale: 0.2,
        duration: 220,
        ease: "Quad.easeIn",
        onComplete: () => s.destroy(),
      });
      return true;
    }
    return false;
  }

  /** The tell: two short red glints, then one right before the lunge. Additive so the green stays green. */
  private glint() {
    const s = this.sprite;
    const on = () => s.active && s.setTint(0x8a1c1c).setTintMode(Phaser.TintModes.ADD);
    const off = () => s.active && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    for (const [t, fn] of [[0, on], [70, off], [150, on], [220, off], [TELEGRAPH_MS - 90, on], [TELEGRAPH_MS - 10, off]] as const) {
      this.scene.time.delayedCall(t, fn);
    }
  }

  private enter(state: SlimeState, until: number) {
    this.state = state;
    this.stateUntil = until;
  }

  private startBreathing() {
    this.breathe = this.scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: 1, to: 0.9 },
      scaleX: { from: 1, to: 1.08 },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 400,
    });
  }
}
