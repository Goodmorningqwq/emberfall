import Phaser from "phaser";
import { HERO, type Dir } from "./heroAssets";
import { useGame, type Facing } from "../../ui/store";
import type { DemoScene } from "../scenes/DemoScene";

const SPEED = 110;
const ROLL_SPEED = 260;
const ROLL_MS = 350;
const ROLL_COOLDOWN_MS = 400;
const ATTACK_MS = 320;
const ATTACK_ACTIVE_FROM = 60; // ms into the swing the hitbox turns on
const ATTACK_ACTIVE_TO = 200;
const HURT_IFRAMES_MS = 700;

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly hitbox: Phaser.GameObjects.Zone;
  attackActive = false;

  private scene: DemoScene;
  private keys: Record<"up" | "down" | "left" | "right" | "attack" | "roll", Phaser.Input.Keyboard.Key>;
  private arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private facing: Dir = "south";
  private state: "idle" | "walk" | "attack" | "roll" = "idle";
  private stateUntil = 0;
  private rollReadyAt = 0;
  private rollDir = new Phaser.Math.Vector2(0, 1);
  private invulnerableUntil = 0;

  constructor(scene: DemoScene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, HERO.texture("idle", "south"));
    this.sprite.setOrigin(0.5, 1);
    // feet-sized body so she can walk behind props
    this.sprite.body!.setSize(14, 10).setOffset((this.sprite.width - 14) / 2, this.sprite.height - 10);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(y);

    this.hitbox = scene.add.zone(x, y, 28, 24);
    scene.physics.add.existing(this.hitbox);
    (this.hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    scene.physics.add.collider(this.sprite, scene.data.get("walls"));
    scene.physics.add.collider(this.sprite, scene.data.get("solids"));

    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      attack: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      roll: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    };
    this.arrows = kb.createCursorKeys();
    HERO.createAnims(scene);
  }

  update(_delta: number) {
    const now = this.scene.time.now;
    const move = new Phaser.Math.Vector2(
      (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0),
      (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0),
    );
    const arrows = this.arrows;
    if (arrows.left.isDown) move.x = -1;
    if (arrows.right.isDown) move.x = 1;
    if (arrows.up.isDown) move.y = -1;
    if (arrows.down.isDown) move.y = 1;

    // committed states run out their timer
    if (this.state === "attack" || this.state === "roll") {
      if (this.state === "attack") {
        const t = ATTACK_MS - (this.stateUntil - now);
        this.attackActive = t >= ATTACK_ACTIVE_FROM && t <= ATTACK_ACTIVE_TO;
        this.placeHitbox();
      }
      if (now >= this.stateUntil) {
        this.state = "idle";
        this.attackActive = false;
        this.sprite.setVelocity(0, 0);
      } else {
        this.syncDepth();
        return;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
      this.startAttack();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.roll) && now >= this.rollReadyAt) {
      this.startRoll(move);
      return;
    }

    if (move.lengthSq() > 0) {
      move.normalize();
      this.sprite.setVelocity(move.x * SPEED, move.y * SPEED);
      this.facing = this.dirFrom(move);
      this.play("walk");
      this.state = "walk";
    } else {
      this.sprite.setVelocity(0, 0);
      this.play("idle");
      this.state = "idle";
    }
    this.syncDepth();
    this.syncStore();
  }

  hurt() {
    const now = this.scene.time.now;
    if (now < this.invulnerableUntil || this.state === "roll") return;
    this.invulnerableUntil = now + HURT_IFRAMES_MS;
    useGame.getState().damage(1);
    this.scene.cameras.main.shake(120, 0.006);
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, () => this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    this.scene.tweens.add({ targets: this.sprite, alpha: 0.35, duration: 80, yoyo: true, repeat: 4 });
  }

  private startAttack() {
    const now = this.scene.time.now;
    this.state = "attack";
    this.stateUntil = now + ATTACK_MS;
    this.attackActive = false;
    this.scene.resetSwingHits();
    // small lunge in the facing direction
    const v = this.vecFrom(this.facing).scale(70);
    this.sprite.setVelocity(v.x, v.y);
    this.scene.time.delayedCall(90, () => this.state === "attack" && this.sprite.setVelocity(0, 0));
    this.play("attack", true);
    this.syncStore();
  }

  private startRoll(move: Phaser.Math.Vector2) {
    const now = this.scene.time.now;
    this.state = "roll";
    this.stateUntil = now + ROLL_MS;
    this.rollReadyAt = now + ROLL_MS + ROLL_COOLDOWN_MS;
    this.invulnerableUntil = now + ROLL_MS;
    this.rollDir = move.lengthSq() > 0 ? move.clone().normalize() : this.vecFrom(this.facing);
    this.sprite.setVelocity(this.rollDir.x * ROLL_SPEED, this.rollDir.y * ROLL_SPEED);
    this.play("roll", true);
    this.syncStore();
  }

  private placeHitbox() {
    const v = this.vecFrom(this.facing);
    const cx = this.sprite.x + v.x * 18;
    const cy = this.sprite.y - this.sprite.height * 0.4 + v.y * 16;
    this.hitbox.setPosition(cx, cy);
    (this.hitbox.body as Phaser.Physics.Arcade.Body).reset(cx, cy);
  }

  private play(clip: "idle" | "walk" | "attack" | "roll", restart = false) {
    const key = HERO.animKey(clip, this.facing);
    if (this.scene.anims.exists(key)) {
      if (restart) this.sprite.play(key, true);
      else if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
    } else {
      // no animation for this clip — fall back to a static rotation frame
      this.sprite.stop();
      this.sprite.setTexture(HERO.texture(clip, this.facing));
    }
  }

  private syncDepth() {
    this.sprite.setDepth(this.sprite.y);
  }

  private syncStore() {
    const s = useGame.getState();
    if (s.facing !== this.facing) s.setFacing(this.facing as Facing);
    if (s.action !== this.state) s.setAction(this.state);
  }

  private dirFrom(v: Phaser.Math.Vector2): Dir {
    if (Math.abs(v.x) > Math.abs(v.y)) return v.x > 0 ? "east" : "west";
    return v.y > 0 ? "south" : "north";
  }

  private vecFrom(d: Dir): Phaser.Math.Vector2 {
    return { south: new Phaser.Math.Vector2(0, 1), north: new Phaser.Math.Vector2(0, -1), east: new Phaser.Math.Vector2(1, 0), west: new Phaser.Math.Vector2(-1, 0) }[d];
  }
}
