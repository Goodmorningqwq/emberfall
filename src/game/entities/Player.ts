import Phaser from "phaser";
import { HERO, type Clip, type Dir } from "./heroAssets";
import { SWORD, SWORD_MS, SWORD_RECOVER_MS } from "./weapons";
import { useGame, type Facing } from "../../ui/store";
import type { DemoScene } from "../scenes/DemoScene";

const WALK_SPEED = 110;
const SPRINT_SPEED = 185;
const DASH_SPEED = 300;
const DASH_MS = 200; // tap Shift: a short burst with i-frames…
const DASH_COOLDOWN_MS = 300;
const SPRINT_HOLD_MS = 180; // …hold Shift past this and the dash flows into a sprint
const HURT_IFRAMES_MS = 700;
const HURT_KNOCKBACK = 150;

type State = "idle" | "walk" | "sprint" | "attack" | "recover" | "dash";

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly hitbox: Phaser.GameObjects.Zone;
  attackActive = false;

  private scene: DemoScene;
  private keys: Record<"up" | "down" | "left" | "right" | "attackAlt" | "dashAlt", Phaser.Input.Keyboard.Key>;
  private arrows: Phaser.Types.Input.Keyboard.CursorKeys;
  private shift: Phaser.Input.Keyboard.Key;
  private facing: Dir = "south";
  private state: State = "idle";
  private stateUntil = 0;
  private dashReadyAt = 0;
  private shiftDownAt = 0;
  private invulnerableUntil = 0;
  private wantAttack = false;

  constructor(scene: DemoScene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, HERO.texture("south"));
    // All frames share a 68x68 canvas with the feet line at y=57; pivot there
    // so sprite.y is where she stands.
    this.sprite.setOrigin(0.5, HERO.feetLine / HERO.canvas);
    this.sprite.body!.setSize(14, 10).setOffset((HERO.canvas - 14) / 2, HERO.feetLine - 10);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(y);

    this.hitbox = scene.add.zone(x, y, SWORD.arc.long, SWORD.arc.short);
    scene.physics.add.existing(this.hitbox);
    (this.hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    scene.physics.add.collider(this.sprite, scene.data.get("walls"));
    scene.physics.add.collider(this.sprite, scene.data.get("solids"));

    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(K.W),
      down: kb.addKey(K.S),
      left: kb.addKey(K.A),
      right: kb.addKey(K.D),
      attackAlt: kb.addKey(K.J),
      dashAlt: kb.addKey(K.K),
    };
    this.arrows = kb.createCursorKeys();
    this.shift = kb.addKey(K.SHIFT);

    // Left mouse = attack toward the cursor. Buffered so a click during a
    // swing or dash queues the next swing instead of being dropped.
    scene.input.mouse?.disableContextMenu();
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.leftButtonDown()) this.wantAttack = true;
    });

    HERO.createAnims(scene);
  }

  update(_delta: number) {
    const now = this.scene.time.now;
    const move = this.readMove();
    if (Phaser.Input.Keyboard.JustDown(this.keys.attackAlt)) this.wantAttack = true;
    const shiftHeld = this.shift.isDown || this.keys.dashAlt.isDown;
    const shiftPressed = Phaser.Input.Keyboard.JustDown(this.shift) || Phaser.Input.Keyboard.JustDown(this.keys.dashAlt);
    if (shiftPressed) this.shiftDownAt = now;

    // ---- committed states
    if (this.state === "attack") {
      const t = SWORD_MS - (this.stateUntil - now);
      this.attackActive = t >= SWORD.activeFrom && t <= SWORD.activeTo;
      if (t > 120) this.sprite.setVelocity(0, 0);
      this.placeHitbox();
      if (now < this.stateUntil) return this.syncDepth();
      this.attackActive = false;
      this.sprite.setVelocity(0, 0);
      // recovery: plays the sheathe frames, but any input cancels it
      this.enter("recover", now + SWORD_RECOVER_MS);
      this.play("attack-out", true);
    }
    if (this.state === "dash") {
      if (now < this.stateUntil) return this.syncDepth();
      // still holding Shift and still steering → flow into a sprint
      if (shiftHeld && move.lengthSq() > 0 && now - this.shiftDownAt >= SPRINT_HOLD_MS) {
        this.enter("sprint", 0);
      } else {
        this.enter("idle", 0);
        this.sprite.setVelocity(0, 0);
      }
    }
    if (this.state === "recover") {
      const cancelled = move.lengthSq() > 0 || this.wantAttack || shiftPressed;
      if (!cancelled && now < this.stateUntil) return this.syncDepth();
      this.enter("idle", 0);
    }

    // ---- new actions
    if (this.wantAttack) {
      this.wantAttack = false;
      return this.startAttack();
    }
    if (shiftPressed && now >= this.dashReadyAt) return this.startDash(move);

    // ---- locomotion
    if (move.lengthSq() > 0) {
      move.normalize();
      this.facing = this.dirFrom(move);
      const sprinting = this.state === "sprint" && shiftHeld;
      const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
      this.sprite.setVelocity(move.x * speed, move.y * speed);
      this.play(sprinting ? "run" : "walk");
      this.state = sprinting ? "sprint" : "walk";
    } else {
      this.sprite.setVelocity(0, 0);
      if (this.state === "walk" || this.state === "sprint") this.settle();
      this.play("idle");
      this.state = "idle";
    }
    this.syncDepth();
    this.syncStore();
  }

  hurt(fromX: number, fromY: number) {
    const now = this.scene.time.now;
    if (now < this.invulnerableUntil || this.state === "dash") return;
    this.invulnerableUntil = now + HURT_IFRAMES_MS;
    useGame.getState().damage(1);
    this.scene.cameras.main.shake(120, 0.006);
    // separate from the attacker so a second touch isn't instant
    const away = new Phaser.Math.Vector2(this.sprite.x - fromX, this.sprite.y - fromY).normalize();
    this.sprite.setVelocity(away.x * HURT_KNOCKBACK, away.y * HURT_KNOCKBACK);
    this.scene.time.delayedCall(110, () => this.state !== "dash" && this.sprite.setVelocity(0, 0));
    this.sprite.setTint(0xff6b5a).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    this.scene.tweens.add({ targets: this.sprite, alpha: 0.35, duration: 80, yoyo: true, repeat: 4 });
  }

  private readMove(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      (this.keys.right.isDown || this.arrows.right.isDown ? 1 : 0) - (this.keys.left.isDown || this.arrows.left.isDown ? 1 : 0),
      (this.keys.down.isDown || this.arrows.down.isDown ? 1 : 0) - (this.keys.up.isDown || this.arrows.up.isDown ? 1 : 0),
    );
  }

  private startAttack() {
    const now = this.scene.time.now;
    this.enter("attack", now + SWORD_MS);
    this.attackActive = false;
    this.facing = this.dirToPointer();
    this.scene.resetSwingHits();
    // short lunge, then plant
    const v = this.vecFrom(this.facing).scale(SWORD.lunge);
    this.sprite.setVelocity(v.x, v.y);
    // anticipation squash on top of the wind-up frames
    this.sprite.setScale(1.05, 0.95);
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1, scaleY: 1, duration: 150, ease: "Back.easeOut" });
    this.play("attack", true);
    this.syncStore();
  }

  private startDash(move: Phaser.Math.Vector2) {
    const now = this.scene.time.now;
    this.enter("dash", now + DASH_MS);
    this.dashReadyAt = now + DASH_MS + DASH_COOLDOWN_MS;
    this.invulnerableUntil = now + DASH_MS;
    const dir = move.lengthSq() > 0 ? move.clone().normalize() : this.vecFrom(this.facing);
    this.facing = this.dirFrom(dir);
    this.sprite.setVelocity(dir.x * DASH_SPEED, dir.y * DASH_SPEED);
    this.sprite.setScale(1.12, 0.88);
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1, scaleY: 1, duration: DASH_MS, ease: "Quad.easeOut" });
    this.play("roll", true);
    this.syncStore();
  }

  /** Tiny settle when coming to a stop so walk→idle doesn't snap. */
  private settle() {
    this.sprite.setScale(0.97, 1.03);
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1, scaleY: 1, duration: 120, ease: "Quad.easeOut" });
  }

  private placeHitbox() {
    const v = this.vecFrom(this.facing);
    const horizontal = v.x !== 0;
    const w = horizontal ? SWORD.arc.short : SWORD.arc.long;
    const h = horizontal ? SWORD.arc.long : SWORD.arc.short;
    const cx = this.sprite.x + v.x * (SWORD.reach + w / 2);
    const cy = this.sprite.y - 16 + v.y * (SWORD.reach + h / 2);
    this.hitbox.setSize(w, h);
    const body = this.hitbox.body as Phaser.Physics.Arcade.Body;
    body.setSize(w, h);
    this.hitbox.setPosition(cx, cy);
    body.reset(cx, cy);
  }

  private play(clip: Clip, restart = false) {
    let key = HERO.animKey(clip, this.facing);
    let timeScale = 1;
    if (clip === "run" && !this.scene.anims.exists(key)) {
      key = HERO.animKey("walk", this.facing); // run frames not generated yet
      timeScale = 1.7;
    }
    if (this.scene.anims.exists(key)) {
      if (restart || this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
      this.sprite.anims.timeScale = timeScale;
    } else {
      this.sprite.stop();
      this.sprite.setTexture(HERO.texture(this.facing));
    }
  }

  private enter(state: State, until: number) {
    this.state = state;
    this.stateUntil = until;
  }

  private syncDepth() {
    this.sprite.setDepth(this.sprite.y);
  }

  private syncStore() {
    const s = useGame.getState();
    if (s.facing !== this.facing) s.setFacing(this.facing as Facing);
    if (s.action !== this.state) s.setAction(this.state);
  }

  private dirToPointer(): Dir {
    const p = this.scene.input.activePointer;
    const wp = p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const v = new Phaser.Math.Vector2(wp.x - this.sprite.x, wp.y - (this.sprite.y - 18));
    return v.lengthSq() < 4 ? this.facing : this.dirFrom(v);
  }

  private dirFrom(v: Phaser.Math.Vector2): Dir {
    if (Math.abs(v.x) > Math.abs(v.y)) return v.x > 0 ? "east" : "west";
    return v.y > 0 ? "south" : "north";
  }

  private vecFrom(d: Dir): Phaser.Math.Vector2 {
    return { south: new Phaser.Math.Vector2(0, 1), north: new Phaser.Math.Vector2(0, -1), east: new Phaser.Math.Vector2(1, 0), west: new Phaser.Math.Vector2(-1, 0) }[d];
  }
}
