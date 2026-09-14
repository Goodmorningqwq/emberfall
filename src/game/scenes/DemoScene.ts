import Phaser from "phaser";
import { autotile, buildWangLookup, type TilesetMeta } from "../wang";
import { PLAYER_SPAWN, PROPS, ROOM_H, ROOM_W, SLIME_SPAWNS, TILE, buildRoomVertices, wallRects } from "../room";
import { Player } from "../entities/Player";
import { HERO } from "../entities/heroAssets";
import { useGame } from "../../ui/store";

/**
 * Pre-M0 demo: one Whisperwood room, Wren, a couple of slimes, props.
 * Proves the asset pipeline (PixelLab tileset + character) and the feel of
 * moving/attacking before anything else gets built.
 */
export class DemoScene extends Phaser.Scene {
  private player!: Player;
  private slimes!: Phaser.Physics.Arcade.Group;

  constructor() {
    super("Demo");
  }

  preload() {
    this.load.spritesheet("tiles", "assets/tiles/whisperwood.png", { frameWidth: TILE, frameHeight: TILE });
    this.load.json("tiles-meta", "assets/tiles/whisperwood.json");
    for (const p of ["door", "torch", "block", "chest", "slime"]) {
      this.load.image(p, `assets/sprites/props/${p}.png`);
    }
    HERO.preload(this);
  }

  create() {
    this.buildTerrain();
    this.buildWalls();
    this.buildProps();
    this.player = new Player(this, PLAYER_SPAWN.tx * TILE, PLAYER_SPAWN.ty * TILE);
    this.buildSlimes();
    this.cameras.main.setBounds(0, 0, ROOM_W * TILE, ROOM_H * TILE);
    this.cameras.main.fadeIn(600, 15, 17, 15);
  }

  update(_time: number, delta: number) {
    this.player.update(delta);
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    for (const child of this.slimes.children) {
      const s = child as Phaser.Physics.Arcade.Sprite;
      s.setDepth(s.y);
      if (!s.active || this.time.now < (s.getData("stunUntil") ?? 0)) continue;
      // lazy chase: drift toward the player when she's close
      const d = Phaser.Math.Distance.Between(s.x, s.y, px, py);
      if (d < 180 && d > 20) {
        const v = new Phaser.Math.Vector2(px - s.x, py - s.y).normalize().scale(32);
        s.setVelocity(v.x, v.y);
      }
    }
  }

  private buildTerrain() {
    const meta = this.cache.json.get("tiles-meta") as TilesetMeta;
    const lookup = buildWangLookup(meta);
    const frames = autotile(buildRoomVertices(), lookup);
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) {
        this.add.image(x * TILE, y * TILE, "tiles", frames[y][x]).setOrigin(0).setDepth(-1000);
      }
    }
  }

  private buildWalls() {
    const walls = this.physics.add.staticGroup();
    for (const r of wallRects()) {
      const z = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      walls.add(z);
    }
    this.data.set("walls", walls);
  }

  private buildProps() {
    const solids = this.physics.add.staticGroup();
    for (const p of PROPS) {
      if (!this.textures.exists(p.key)) continue;
      const x = p.tx * TILE;
      const y = p.ty * TILE;
      const img = this.add.image(x, y, p.key).setOrigin(0, 0);
      // depth-sort by the prop's foot line so the player can walk behind it
      img.setDepth(y + img.height);
      if (p.solid) {
        const z = this.add.zone(x + img.width / 2, y + img.height * 0.7, img.width, img.height * 0.6);
        solids.add(z);
      }
    }
    this.data.set("solids", solids);
  }

  private buildSlimes() {
    this.slimes = this.physics.add.group();
    for (const s of SLIME_SPAWNS) {
      if (!this.textures.exists("slime")) break;
      const slime = this.slimes.create(s.tx * TILE, s.ty * TILE, "slime") as Phaser.Physics.Arcade.Sprite;
      slime.setOrigin(0.5, 1);
      slime.body!.setSize(slime.width * 0.7, slime.height * 0.5).setOffset(slime.width * 0.15, slime.height * 0.5);
      slime.setData("hp", 2);
      slime.setPushable(false);
      slime.setDrag(900, 900);
      // idle hop: a squash-and-stretch tween, no spritesheet needed for the demo
      this.tweens.add({
        targets: slime,
        scaleY: { from: 1, to: 0.85 },
        scaleX: { from: 1, to: 1.12 },
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * 400,
      });
    }
    this.physics.add.collider(this.slimes, this.data.get("walls"));
    this.physics.add.collider(this.slimes, this.data.get("solids"));
    this.physics.add.collider(this.player.sprite, this.slimes, () => this.player.hurt());
    this.physics.add.overlap(this.player.hitbox, this.slimes, (_hb, obj) => this.hitSlime(obj as Phaser.Physics.Arcade.Sprite));
  }

  private hitSlime(slime: Phaser.Physics.Arcade.Sprite) {
    if (!this.player.attackActive || slime.getData("hitThisSwing")) return;
    slime.setData("hitThisSwing", true);
    const hp = (slime.getData("hp") as number) - 1;
    slime.setData("hp", hp);

    // feedback: flash, knockback, hit-stop, shake, damage number
    slime.setTint(0xfff2b0).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => slime.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    const dir = new Phaser.Math.Vector2(slime.x - this.player.sprite.x, slime.y - this.player.sprite.y).normalize();
    slime.setVelocity(dir.x * 200, dir.y * 200); // drag brings it to rest
    slime.setData("stunUntil", this.time.now + 500);
    this.cameras.main.shake(80, 0.004);
    this.hitStop(60);
    this.damageNumber(slime.x, slime.y - slime.height, 1);

    if (hp <= 0) {
      this.tweens.add({
        targets: slime,
        alpha: 0,
        scale: 0.2,
        duration: 220,
        ease: "Quad.easeIn",
        onComplete: () => slime.destroy(),
      });
      useGame.getState().addGold(3);
    }
  }

  private hitStop(ms: number) {
    this.physics.world.pause();
    this.anims.pauseAll();
    this.time.delayedCall(ms, () => {
      this.physics.world.resume();
      this.anims.resumeAll();
    });
  }

  private damageNumber(x: number, y: number, amount: number) {
    const t = this.add
      .text(x, y, `-${amount}`, {
        fontFamily: "Pixelify Sans",
        fontSize: "14px",
        color: "#fff2b0",
        stroke: "#7a2e10",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(10000)
      .setResolution(2);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 600, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }

  /** Called by Player when a swing starts so each slime can be hit once per swing. */
  resetSwingHits() {
    for (const c of this.slimes.children) c.setData("hitThisSwing", false);
  }
}
