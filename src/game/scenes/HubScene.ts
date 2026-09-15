import Phaser from "phaser";
import { autotile, buildWangLookup, type Terrain, type TilesetMeta } from "../wang";
import { TILE } from "../room";
import { Player, type PlayerHost } from "../entities/Player";
import { HERO } from "../entities/heroAssets";
import { useGame, type LessonId } from "../../ui/store";
import { sfx } from "../audio";
import town from "../data/emberfall-town.json";

interface TownDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  spawn: { tx: number; ty: number };
  legend: Record<string, string>;
  map: string[];
  npcs: Record<string, { name: string; title: string; lines: string[] }>;
}

/** Sprite size + footprint (solid rect, in tiles from the anchor) per anchor kind. */
const PROPS: Record<string, { tex: string; w: number; h: number; foot: [number, number, number, number]; depthOff?: number }> = {
  "house-elder": { tex: "house-elder", w: 96, h: 96, foot: [0, 1, 3, 2] },
  "house-forge": { tex: "house-forge", w: 96, h: 96, foot: [0, 1, 3, 2] },
  "house-apothecary": { tex: "house-apothecary", w: 96, h: 96, foot: [0, 1, 3, 2] },
  shrine: { tex: "shrine", w: 64, h: 64, foot: [0, 0.8, 2, 1.2] },
  plinth: { tex: "plinth", w: 48, h: 64, foot: [0, 1, 1.5, 1] },
  tree: { tex: "tree", w: 48, h: 64, foot: [0.3, 1.4, 0.9, 0.6] },
  "gate-whisperwood": { tex: "gate", w: 64, h: 64, foot: [0, 0, 0, 0] },
  "gate-crypt": { tex: "gate", w: 64, h: 64, foot: [0, 0, 0, 0] },
  "gate-cinder": { tex: "gate", w: 64, h: 64, foot: [0, 0, 0, 0] },
  lantern: { tex: "lantern", w: 32, h: 48, foot: [0.3, 1.1, 0.4, 0.4] },
  well: { tex: "well", w: 48, h: 48, foot: [0.1, 0.6, 1.3, 0.9] },
  crates: { tex: "crates", w: 32, h: 32, foot: [0, 0.3, 1, 0.7] },
  bush: { tex: "bush", w: 32, h: 32, foot: [0.1, 0.4, 0.8, 0.6] },
  "ruin-wall": { tex: "ruin-wall", w: 64, h: 32, foot: [0, 0.3, 2, 0.6] },
};

/**
 * Emberfall, the hub town. One free-scrolling map (40x30 tiles) built from the
 * same Wang autotiler as the dungeon: "=" tiles are the flagstone path (lower
 * terrain), everything else is grass. Buildings, trees and NPCs are solid props
 * placed from single-character anchors in the ASCII map. No enemies here.
 */
export class HubScene extends Phaser.Scene implements PlayerHost {
  player!: Player;
  private def = town as TownDef;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private npcZones: { zone: Phaser.GameObjects.Zone; key: string }[] = [];
  private gateZones: { zone: Phaser.GameObjects.Zone; kind: string }[] = [];
  private latched = false;
  private frozen = false;
  private leaving = false;
  private frameEl: HTMLElement | null = null;
  private unsub?: () => void;

  constructor() {
    super("Hub");
  }

  preload() {
    this.load.spritesheet("town-tiles", "assets/tiles/town.png", { frameWidth: TILE, frameHeight: TILE });
    this.load.json("town-meta", "assets/tiles/town.json");
    for (const p of ["house-elder", "house-forge", "house-apothecary", "shrine", "plinth", "tree", "gate", "signpost", "lantern", "well", "crates", "bush", "ruin-wall", "root", "block"]) this.load.image(p, `assets/sprites/props/${p}.png`);
    for (const n of ["blacksmith", "apothecary", "elder"]) this.load.image(`npc-${n}`, `assets/sprites/npc/${n}.png`);
    for (const i of ["potion", "bomb", "coin", "key"]) this.load.image(`icon-${i}`, `assets/ui/icons/${i}.png`);
    HERO.preload(this);
  }

  init() {
    this.npcZones = [];
    this.gateZones = [];
    this.latched = false;
    this.frozen = false;
    this.leaving = false;
  }

  create(data: { from?: string } = {}) {
    if (!this.textures.exists("spore")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
      g.generateTexture("spore", 6, 6);
      g.destroy();
    }
    if (!this.textures.exists("halo")) {
      const g = this.add.graphics();
      for (let r = 24; r > 0; r -= 2) g.fillStyle(0xffa040, 0.05).fillCircle(24, 24, r);
      g.generateTexture("halo", 48, 48);
      g.destroy();
    }
    const W = this.def.cols * TILE, H = this.def.rows * TILE;
    this.physics.world.setBounds(0, 0, W, H);
    this.buildTerrain();
    this.walls = this.physics.add.staticGroup();
    this.solids = this.physics.add.staticGroup();
    this.data.set("walls", this.walls);
    this.data.set("solids", this.solids);
    // keep her inside the tree border
    for (const r of [{ x: 0, y: 0, w: W, h: 2 * TILE + 8 }, { x: 0, y: H - 2 * TILE + 10, w: W, h: 2 * TILE }, { x: 0, y: 0, w: 2 * TILE, h: H }, { x: W - 2 * TILE, y: 0, w: 2 * TILE, h: H }]) {
      this.walls.add(this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
    }

    // spawn: fresh arrival at the plaza, or just inside the gate you came back through
    let sx = this.def.spawn.tx * TILE, sy = this.def.spawn.ty * TILE;
    const anchors = this.placements();
    if (data.from) {
      const g = anchors.find((a) => a.kind === data.from);
      if (g) {
        sx = g.tx * TILE - 24;
        sy = g.ty * TILE + 40;
      }
    }
    this.player = new Player(this, sx, sy);
    this.buildProps(anchors);
    this.physics.add.collider(this.player.sprite, this.solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setRoundPixels(true);
    this.game.canvas.classList.add("ready");

    const st = useGame.getState();
    st.setRoom("emberfall", "Emberfall", "");
    st.setBoss(null);
    const shouldFreeze = (s: ReturnType<typeof useGame.getState>) => s.bagOpen || s.paused || !!s.shop || s.screen === "dead" || s.screen === "complete";
    this.unsub = useGame.subscribe((s, prev) => {
      if (shouldFreeze(s) !== shouldFreeze(prev)) this.setFrozen(shouldFreeze(s));
      if (s.screen === "game" && prev.screen !== "game" && prev.screen !== "complete" && this.scene.isActive()) this.time.delayedCall(0, () => this.startWhereverSaved());
      if (s.screen === "title" && prev.screen !== "title" && this.scene.isActive()) this.time.delayedCall(0, () => this.scene.restart({}));
      if (!s.dialogue && prev.dialogue) this.player.hold(0);
      if (!s.shop && prev.shop) this.player.hold(0);
    });
    this.setFrozen(shouldFreeze(st));
    if (st.screen === "title" || st.screen === "intro") this.attractMode();
    else {
      st.showBanner({ kind: "room", title: "Emberfall", sub: "Home" });
      this.time.delayedCall(1300, () => useGame.getState().banner?.kind === "room" && useGame.getState().showBanner(null));
      if (!st.hasFlag("narrated:emberfall")) {
        st.setFlag("narrated:emberfall");
        this.time.delayedCall(1800, () => {
          useGame.getState().setNarration("Emberfall, half-ruined and cold. The plinth in the square has held no flame for a year. The elder's hall is north.");
          this.time.delayedCall(7000, () => useGame.getState().setNarration(null));
        });
      }
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
  }

  /** New game / continue / respawn land wherever the save says. */
  private startWhereverSaved() {
    const st = useGame.getState();
    if (st.place === "hub") this.scene.restart({});
    else this.scene.start("Dungeon");
  }

  // ---------------------------------------------------------------- build

  private placements() {
    const out: { kind: string; ch: string; tx: number; ty: number }[] = [];
    this.def.map.forEach((row, ty) =>
      [...row].forEach((ch, tx) => {
        const kind = this.def.legend[ch];
        if (kind && ch !== "." && ch !== "=") out.push({ kind, ch, tx, ty });
      }),
    );
    return out;
  }

  private isPath(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= this.def.cols || ty >= this.def.rows) return false;
    return this.def.map[ty][tx] === "=";
  }

  private buildTerrain() {
    const meta = this.cache.json.get("town-meta") as TilesetMeta;
    const lookup = buildWangLookup(meta);
    // a vertex is path (lower) when any tile touching it is path, so paths read a little wider than drawn
    const v: Terrain[][] = [];
    for (let vy = 0; vy <= this.def.rows; vy++) {
      const row: Terrain[] = [];
      for (let vx = 0; vx <= this.def.cols; vx++) {
        const path = this.isPath(vx - 1, vy - 1) || this.isPath(vx, vy - 1) || this.isPath(vx - 1, vy) || this.isPath(vx, vy);
        row.push(path ? 0 : 1);
      }
      v.push(row);
    }
    const frames = autotile(v, lookup);
    for (let y = 0; y < this.def.rows; y++) for (let x = 0; x < this.def.cols; x++) this.add.image(x * TILE, y * TILE, "town-tiles", frames[y][x]).setOrigin(0).setDepth(-1000);
  }

  private buildProps(anchors: { kind: string; ch: string; tx: number; ty: number }[]) {
    const st = useGame.getState();
    for (const a of anchors) {
      const x = a.tx * TILE, y = a.ty * TILE;
      const p = PROPS[a.kind];
      if (p) {
        const img = this.add.image(x, y, p.tex).setOrigin(0).setDepth(y + p.h - 6);
        if (a.kind.startsWith("gate")) {
          const sealed = a.kind !== "gate-whisperwood";
          if (sealed) {
            img.setTint(0x9a9aa6);
            // barred: roots choke the marsh gate, fallen stone blocks the mountain lane
            if (a.kind === "gate-crypt") {
              for (const [dx, sc] of [[14, 0.9], [30, 1.1], [46, 0.85]] as const) this.add.image(x + dx, y + 62, "root").setOrigin(0.5, 1).setScale(sc).setTint(0x8aa08a).setDepth(y + 63);
            } else {
              for (const [dx, dy] of [[8, 30], [30, 26], [20, 38]] as const) this.add.image(x + dx, y + dy, "block").setOrigin(0).setScale(0.8).setTint(0xb0a090).setDepth(y + dy + 26);
            }
            this.solids.add(this.add.zone(x + 32, y + 46, 56, 20));
          }
          // a sign hangs by each gate; the walkable gap is the middle
          const zone = this.add.zone(x + 32, y + 40, 40, 30);
          this.physics.add.existing(zone, true);
          this.gateZones.push({ zone, kind: a.kind });
          if (!sealed) {
            // subtle beckon on the open gate so the road out is readable
            this.tweens.add({ targets: img, alpha: 0.88, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          }
          continue;
        }
        const [fx, fy, fw, fh] = p.foot;
        if (fw > 0) this.solids.add(this.add.zone(x + (fx + fw / 2) * TILE, y + (fy + fh / 2) * TILE, fw * TILE, fh * TILE));
        if (a.kind === "lantern") {
          const halo = this.add.image(x + 16, y + 12, "halo").setDepth(y + p.h - 5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(1.5);
          this.tweens.add({ targets: halo, alpha: 0.32, scale: 1.35, duration: 180 + Math.random() * 140, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        if (a.kind === "shrine") {
          const zone = this.add.zone(x + 32, y + 70, 60, 20);
          this.physics.add.existing(zone, true);
          this.npcZones.push({ zone, key: "shrine" });
          const flame = this.add.image(x + 32, y + 18, "spore").setScale(4, 6).setTint(0x8ad7ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(y + p.h);
          this.tweens.add({ targets: flame, alpha: 0.6, scaleY: 7, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        if (a.kind === "plinth" && st.hasItem("shard")) {
          // one shard home: a small ember flickers on the cold plinth
          const ember = this.add.image(x + 24, y + 10, "spore").setScale(3, 4).setTint(0xffb060).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setDepth(y + p.h);
          this.tweens.add({ targets: ember, alpha: 0.9, scale: 4, duration: 300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        continue;
      }
      if (a.kind.startsWith("npc-")) {
        const img = this.add.image(x + 16, y + 32, a.kind).setOrigin(0.5, 1).setDepth(y + 32);
        this.tweens.add({ targets: img, scaleY: 0.98, scaleX: 1.02, duration: 1100 + Math.random() * 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.solids.add(this.add.zone(x + 16, y + 26, 22, 14));
        const zone = this.add.zone(x + 16, y + 24, 34, 30);
        this.physics.add.existing(zone, true);
        this.npcZones.push({ zone, key: a.kind });
      }
    }
  }

  // ---------------------------------------------------------- interactions

  private checkBumps() {
    if (useGame.getState().dialogue || this.leaving) return;
    const pb = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const touch = (z: Phaser.GameObjects.Zone) => {
      const b = z.body as Phaser.Physics.Arcade.StaticBody;
      return pb.right > b.left - 2 && pb.left < b.right + 2 && pb.bottom > b.top - 2 && pb.top < b.bottom + 2;
    };
    for (const g of this.gateZones) {
      if (!touch(g.zone)) continue;
      if (g.kind === "gate-whisperwood") return this.leaveFor("whisperwood");
      if (!this.latched) {
        this.latched = true;
        this.toast(g.kind === "gate-crypt" ? "The marsh road is flooded. Not yet." : "Smoke on the mountain road. Not yet.");
      }
      return;
    }
    let touching = false;
    for (const n of this.npcZones) {
      if (!touch(n.zone)) continue;
      touching = true;
      if (this.latched) break;
      this.latched = true;
      if (n.key === "shrine") {
        useGame.getState().setFlag("visited:shrine");
        sfx("heart");
        useGame.getState().heal(99);
        this.toast("Rested. The shrine keeps your progress.");
        break;
      }
      const npc = this.def.npcs[n.key];
      if (!npc) break;
      this.player.hold(99999);
      this.player.sprite.setVelocity(0, 0);
      const st = useGame.getState();
      if (n.key === "npc-apothecary" || n.key === "npc-blacksmith") {
        sfx("ui");
        st.openShop(n.key === "npc-apothecary" ? "apothecary" : "blacksmith");
        break;
      }
      // the elder's line changes once the shard is home
      const line = n.key === "npc-elder" && st.hasItem("shard") ? "You brought it back. One flame of three... the plinth will hold it. Rest, then look west when the marsh road drains." : npc.lines[0];
      st.setDialogue({ title: `${npc.title} · ${npc.name}`, text: line });
      break;
    }
    if (!touching) this.latched = false;
  }

  private leaveFor(place: "whisperwood") {
    this.leaving = true;
    this.player.hold(99999);
    this.player.sprite.setVelocity(0, 0);
    this.player.walkScripted("east");
    sfx("door");
    const st = useGame.getState();
    st.setPlace(place);
    const cam = this.cameras.main;
    cam.fadeOut(450, 8, 10, 8);
    this.tweens.add({ targets: this.player.sprite, x: this.player.sprite.x + 40, duration: 500 });
    this.time.delayedCall(520, () => this.scene.start("Dungeon"));
  }

  private toast(text: string) {
    const p = this.player.sprite;
    const cam = this.cameras.main;
    useGame.getState().setTag({ text, x: p.x - cam.scrollX, y: p.y - 40 - cam.scrollY, kind: "info" });
    this.time.delayedCall(1400, () => useGame.getState().tag?.text === text && useGame.getState().setTag(null));
  }

  private attractMode() {
    this.player.hold(99999);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.setZoom(1.15);
    cam.centerOn(this.def.spawn.tx * TILE, this.def.spawn.ty * TILE - 60);
    this.tweens.add({ targets: cam, scrollX: cam.scrollX + 60, scrollY: cam.scrollY - 30, duration: 12000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const embers = this.add.particles(0, 0, "spore", {
      x: { min: 100, max: this.def.cols * TILE - 100 },
      y: this.def.rows * TILE - 80,
      lifespan: { min: 4500, max: 7500 },
      speedY: { min: -14, max: -34 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xd1541f, 0xe8763a, 0xffb060, 0xfff2b0],
      frequency: 110,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(5000);
    void embers;
  }

  private setAnchor(name: "wren", wx: number, wy: number) {
    if (!this.frameEl || !this.frameEl.isConnected) this.frameEl = document.querySelector("#ui .frame");
    if (!this.frameEl) return;
    const cam = this.cameras.main;
    const px = ((wx - cam.scrollX) / cam.width) * 100;
    const py = ((wy - cam.scrollY) / cam.height) * 100;
    this.frameEl.style.setProperty(`--${name}-x`, String(px));
    this.frameEl.style.setProperty(`--${name}-y`, String(py));
    this.frameEl.classList.toggle(`${name}-right`, px > 62);
    this.frameEl.classList.toggle("hotbar-ghost", py > 78 && Math.abs(px - 50) < 22);
  }

  // --------------------------------------------------------- PlayerHost

  resetSwingHits() {}
  throwBoomerang() {
    return false;
  }
  placeBomb() {
    this.toast("Not in town.");
    return false;
  }
  drinkPotion() {
    const st = useGame.getState();
    if (st.hearts >= st.maxHearts || !st.useItem("potion")) return false;
    st.heal(6);
    sfx("potion");
    return true;
  }
  lessonKey() {}
  finishLesson(_id: LessonId) {}
  onPlayerHurt() {}
  shake(ms: number, intensity: number) {
    const k = useGame.getState().settings.shake;
    if (k > 0) this.cameras.main.shake(ms, intensity * k);
  }

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

  update(_t: number, delta: number) {
    if (this.frozen) return;
    try {
      this.player.update(delta);
      const p = this.player.sprite;
      this.setAnchor("wren", p.x, p.y - 56);
      this.checkBumps();
    } catch (err) {
      if (!this.data.get("updateError")) {
        this.data.set("updateError", true);
        console.error("[HubScene.update]", (err as Error).stack ?? err);
      }
    }
  }
}
