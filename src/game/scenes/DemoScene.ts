import Phaser from "phaser";
import { autotile, buildWangLookup, type TilesetMeta } from "../wang";
import { PLAYER_SPAWN, PROPS, ROOM_H, ROOM_W, SLIME_SPAWNS, TILE, buildRoomVertices, wallRects } from "../room";
import { Player } from "../entities/Player";
import { Slime } from "../entities/Slime";
import { HERO } from "../entities/heroAssets";
import { useGame } from "../../ui/store";

/**
 * Pre-M0 demo: one Whisperwood room, Wren, a couple of slimes, props.
 * Proves the asset pipeline (PixelLab tileset + character) and the feel of
 * moving/attacking before anything else gets built.
 */
export class DemoScene extends Phaser.Scene {
  private player!: Player;
  private slimeGroup!: Phaser.Physics.Arcade.Group;
  private slimes: Slime[] = [];

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
    // room entry fade is done in CSS on the canvas (Phaser 4's camera fadeIn
    // left the view black on a fresh load); just flag that we're ready
    this.game.canvas.classList.add("ready");

    // the React bag / pause panels freeze the world while open. Not
    // scene.pause(): in Phaser 4 that stops rendering too and the canvas
    // clears to black; freezing the systems keeps the last frame on screen.
    const unsub = useGame.subscribe((s, prev) => {
      const was = prev.bagOpen || prev.paused;
      const now = s.bagOpen || s.paused;
      if (was === now) return;
      this.setFrozen(now);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsub);
  }

  private frozen = false;

  private setFrozen(on: boolean) {
    this.frozen = on;
    if (on) {
      this.physics.world.pause();
      this.anims.pauseAll();
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.physics.world.resume();
      this.anims.resumeAll();
      this.tweens.resumeAll();
      this.time.paused = false;
    }
  }

  update(_time: number, delta: number) {
    if (this.frozen) return;
    try {
      this.player.update(delta);
      const now = this.time.now;
      for (const s of this.slimes) s.update(now, this.player.sprite.x, this.player.sprite.y);
    } catch (err) {
      // a throw inside update aborts the render step, which is invisible in-game; surface it once
      if (!this.data.get("updateError")) {
        this.data.set("updateError", true);
        console.error("[DemoScene.update]", (err as Error).stack ?? err);
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
      walls.add(this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
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
        solids.add(this.add.zone(x + img.width / 2, y + img.height * 0.7, img.width, img.height * 0.6));
      }
    }
    this.data.set("solids", solids);
  }

  private buildSlimes() {
    this.slimeGroup = this.physics.add.group();
    if (this.textures.exists("slime")) {
      for (const s of SLIME_SPAWNS) this.slimes.push(new Slime(this, this.slimeGroup, s.tx * TILE, s.ty * TILE));
    }
    this.physics.add.collider(this.slimeGroup, this.data.get("walls"));
    this.physics.add.collider(this.slimeGroup, this.data.get("solids"));
    // contact only hurts while the slime is mid-lunge
    this.physics.add.collider(this.player.sprite, this.slimeGroup, (_p, obj) => {
      const slime = (obj as Phaser.GameObjects.GameObject).getData("slime") as Slime;
      if (slime?.isAttacking) this.player.hurt(slime.sprite.x, slime.sprite.y);
    });
    this.physics.add.overlap(this.player.hitbox, this.slimeGroup, (_hb, obj) => {
      const slime = (obj as Phaser.GameObjects.GameObject).getData("slime") as Slime;
      if (slime) this.hitSlime(slime);
    });
  }

  private hitSlime(slime: Slime) {
    if (!this.player.attackActive || slime.hitThisSwing) return;
    const s = slime.sprite;
    const died = slime.takeHit(this.player.sprite.x, this.player.sprite.y, this.time.now);
    // feedback bundle: hit-stop, shake, damage number (flash + knockback are in takeHit)
    this.cameras.main.shake(80, 0.004);
    this.hitStop(60);
    this.damageNumber(s.x, s.y - s.height, 1);
    if (died) {
      this.slimes = this.slimes.filter((x) => x !== slime);
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
    for (const s of this.slimes) s.hitThisSwing = false;
  }
}
