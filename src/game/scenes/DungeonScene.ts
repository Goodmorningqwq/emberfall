import Phaser from "phaser";
import { autotile, buildWangLookup, type TilesetMeta } from "../wang";
import { ROOM_H, ROOM_W, TILE } from "../room";
import { Dungeon, type DungeonDef, type Placement, type Room } from "../dungeon";
import { Player } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Slime } from "../entities/Slime";
import { ForestSprite } from "../entities/Sprite";
import { Mushroom } from "../entities/Mushroom";
import { Treant, TREANT_HP } from "../entities/Treant";
import { Boomerang } from "../entities/Boomerang";
import { Bomb } from "../entities/Bomb";
import { HERO } from "../entities/heroAssets";
import { useGame, type ItemId, type LessonId } from "../../ui/store";
import whisperwood from "../data/whisperwood.json";

type Dir = "north" | "south" | "east" | "west";
const DIRS: Record<Dir, { dx: number; dy: number }> = { north: { dx: 0, dy: -1 }, south: { dx: 0, dy: 1 }, east: { dx: 1, dy: 0 }, west: { dx: -1, dy: 0 } };

interface Door {
  id: string;
  kind: "locked" | "boss";
  image: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
}
interface Crack {
  id: string;
  tiles: { tx: number; ty: number }[];
  decal: Phaser.GameObjects.Image;
  cx: number;
  cy: number;
}
interface Block {
  sprite: Phaser.Physics.Arcade.Sprite;
  tx: number;
  ty: number;
  moving: boolean;
  pushMs: number;
  pushDir: string;
}
interface Chest {
  id: string;
  image: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
  contents: string;
  opened: boolean;
}

/**
 * One scene runs the whole dungeon: every room's terrain is built up front
 * on one big grid, and "entering a room" means parking the camera on it and
 * spawning that room's enemies/props. Leaving through a doorway scrolls the
 * camera Zelda-style to the neighbour.
 */
export class DungeonScene extends Phaser.Scene {
  dungeon!: Dungeon;
  player!: Player;
  room!: Room;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private enemies: Enemy[] = [];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private blockGroup!: Phaser.Physics.Arcade.Group;
  private pickupGroup!: Phaser.Physics.Arcade.Group;
  private doorGroup!: Phaser.Physics.Arcade.StaticGroup;
  private chestGroup!: Phaser.Physics.Arcade.StaticGroup;
  private tileImages: Phaser.GameObjects.Image[][] = [];
  private lookup!: ReturnType<typeof buildWangLookup>;
  private doors: Door[] = [];
  private cracks: Crack[] = [];
  private blocks: Block[] = [];
  private chests: Chest[] = [];
  private plates: { tx: number; ty: number; image: Phaser.GameObjects.Image }[] = [];
  private crystals: { image: Phaser.GameObjects.Image; zone: Phaser.GameObjects.Zone; lit: boolean }[] = [];
  private roomStuff: Phaser.GameObjects.GameObject[] = [];
  private solidTiles = new Set<string>();
  private boomerang?: Boomerang;
  private bombs: Bomb[] = [];
  private transitioning = false;
  private dt = 16; // last frame delta (ms), for callbacks that run outside update
  private frozen = false;
  private treant?: Treant;
  private unsub?: () => void;
  private signs: { zone: Phaser.GameObjects.Zone; text: string }[] = [];
  private signLatched = false;
  private pendingLessons: LessonId[] = [];
  private bossRing?: Phaser.GameObjects.Arc;
  private frameEl: HTMLElement | null = null;

  constructor() {
    super("Dungeon");
  }

  preload() {
    this.load.spritesheet("tiles", "assets/tiles/whisperwood.png", { frameWidth: TILE, frameHeight: TILE });
    this.load.json("tiles-meta", "assets/tiles/whisperwood.json");
    for (const p of ["door", "torch", "block", "chest", "chest-open", "slime", "sprite", "mushroom", "treant", "root", "door-locked", "door-locked-side", "door-boss", "stump", "crystal", "plate", "crack", "heart-container", "signpost", "bomb", "boomerang"]) {
      this.load.image(p, `assets/sprites/props/${p}.png`);
    }
    for (const i of ["key", "boomerang", "bomb", "shard", "potion", "coin", "bosskey"]) this.load.image(`icon-${i}`, `assets/ui/icons/${i}.png`);
    this.load.spritesheet("hearts", "assets/ui/hearts.png", { frameWidth: 16, frameHeight: 16 });
    HERO.preload(this);
  }

  /** Runs on every (re)start: the Scene instance is reused, so per-run state must be reset here. */
  init() {
    this.enemies = [];
    this.doors = [];
    this.cracks = [];
    this.blocks = [];
    this.chests = [];
    this.plates = [];
    this.crystals = [];
    this.roomStuff = [];
    this.solidTiles = new Set();
    this.tileImages = [];
    this.bombs = [];
    this.boomerang = undefined;
    this.treant = undefined;
    this.transitioning = false;
    this.frozen = false;
    this.signs = [];
    this.pendingLessons = [];
    this.bossRing = undefined;
    this.data.remove("updateError");
  }

  create() {
    // a tiny soft dot for particles (spores, smoke, sparkles)
    if (!this.textures.exists("spore")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
      g.generateTexture("spore", 6, 6);
      g.destroy();
    }
    this.dungeon = new Dungeon(whisperwood as DungeonDef);
    const st = useGame.getState();
    // cracked walls already blown open on an earlier visit are floor now
    for (const r of this.dungeon.rooms) {
      for (const p of r.placements) if (p.kind === "wall-cracked" && st.hasFlag(`crack:${r.id}`)) this.dungeon.setTile(p.tx, p.ty, ".");
    }

    this.physics.world.setBounds(0, 0, this.dungeon.widthPx, this.dungeon.heightPx);
    this.lookup = buildWangLookup(this.cache.json.get("tiles-meta") as TilesetMeta);
    this.buildTerrain();
    this.walls = this.physics.add.staticGroup();
    this.rebuildWalls();
    this.solids = this.physics.add.staticGroup();
    this.doorGroup = this.physics.add.staticGroup();
    this.chestGroup = this.physics.add.staticGroup();
    this.blockGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();
    this.data.set("walls", this.walls);
    this.data.set("solids", this.solids);
    this.buildDoorsAndCracks();

    const ent = this.dungeon.def.entrance;
    const entRoom = this.dungeon.room(ent.room);
    this.player = new Player(this, entRoom.x + ent.tx * TILE, entRoom.y + ent.ty * TILE);
    this.wireCollisions();
    this.enterRoom(entRoom, true);
    this.game.canvas.classList.add("ready");

    // React panels freeze the world while open. Not scene.pause(): in Phaser 4
    // that stops rendering too and the canvas clears to black.
    const shouldFreeze = (s: ReturnType<typeof useGame.getState>) => s.bagOpen || s.paused || s.screen !== "game";
    this.unsub = useGame.subscribe((s, prev) => {
      if (shouldFreeze(s) !== shouldFreeze(prev)) this.setFrozen(shouldFreeze(s));
      // new game / continue / respawn: start over from the entrance with the store's flags
      // (only once we're running: a restart mid-preload wedges the loader)
      if (s.screen === "game" && prev.screen !== "game" && this.scene.isActive()) this.time.delayedCall(0, () => this.scene.restart());
      // closing a sign's dialogue hands control back
      if (!s.dialogue && prev.dialogue) this.player.hold(0);
    });
    this.time.delayedCall(400, () => this.startLesson("move"));
    this.setFrozen(shouldFreeze(st));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsub?.();
      this.enemies.forEach((e) => e.destroy());
      this.enemies = [];
      this.boomerang?.destroy();
      this.bombs.forEach((b) => b.destroy());
    });
  }

  // ---------------------------------------------------------------- terrain

  private buildTerrain() {
    const frames = autotile(this.dungeon.vertices(), this.lookup);
    this.tileImages = [];
    for (let y = 0; y < this.dungeon.heightTiles; y++) {
      const row: Phaser.GameObjects.Image[] = [];
      for (let x = 0; x < this.dungeon.widthTiles; x++) {
        row.push(this.add.image(x * TILE, y * TILE, "tiles", frames[y][x]).setOrigin(0).setDepth(-1000));
      }
      this.tileImages.push(row);
    }
  }

  private retileAround(tx: number, ty: number, radius = 3) {
    const frames = autotile(this.dungeon.vertices(), this.lookup);
    for (let y = Math.max(0, ty - radius); y < Math.min(this.dungeon.heightTiles, ty + radius + 1); y++) {
      for (let x = Math.max(0, tx - radius); x < Math.min(this.dungeon.widthTiles, tx + radius + 1); x++) {
        this.tileImages[y][x].setFrame(frames[y][x]);
      }
    }
  }

  private rebuildWalls() {
    this.walls.clear(true, true);
    for (const r of this.dungeon.collisionRects()) {
      this.walls.add(this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
    }
  }

  // ------------------------------------------------------- persistent props

  private buildDoorsAndCracks() {
    const st = useGame.getState();
    for (const room of this.dungeon.rooms) {
      const byKind = (k: string) => room.placements.filter((p) => p.kind === k);
      for (const kind of ["door-locked", "door-boss"] as const) {
        const ps = byKind(kind);
        for (let i = 0; i + 1 < ps.length; i += 2) {
          const id = `door:${room.id}:${kind}:${i / 2}`;
          if (st.hasFlag(id)) continue;
          const a = ps[i], b = ps[i + 1];
          const vertical = a.tx === b.tx; // side door: tiles stacked, prop straddles the wall
          let image: Phaser.GameObjects.Image, zone: Phaser.GameObjects.Zone;
          if (vertical) {
            const tex = this.textures.exists(`${kind}-side`) ? `${kind}-side` : "door-locked-side";
            const x = a.tx * TILE, y = a.ty * TILE;
            image = this.add.image(x, y, tex).setOrigin(0).setDepth(y + 64);
            zone = this.add.zone(x + 32, y + 32, 64, 64);
          } else {
            const x = a.tx * TILE, y = (a.ty - 1) * TILE;
            image = this.add.image(x, y, kind).setOrigin(0).setDepth(y + 48);
            zone = this.add.zone(x + 32, y + 36, 64, 40);
          }
          zone.setData("door", id);
          this.doorGroup.add(zone);
          this.doors.push({ id, kind: kind === "door-boss" ? "boss" : "locked", image, zone });
        }
      }
      const cracked = byKind("wall-cracked");
      if (cracked.length && !st.hasFlag(`crack:${room.id}`)) {
        // decal on the lowest (face) row of the cracked column
        const maxTy = Math.max(...cracked.map((p) => p.ty));
        const minTx = Math.min(...cracked.map((p) => p.tx));
        const x = minTx * TILE, y = maxTy * TILE;
        const decal = this.add.image(x, y, "crack").setOrigin(0).setDepth(y + 32).setAlpha(this.textures.exists("crack") ? 1 : 0);
        this.cracks.push({ id: `crack:${room.id}`, tiles: cracked.map((p) => ({ tx: p.tx, ty: p.ty })), decal, cx: x + 32, cy: y + 16 });
      }
    }
  }

  private breakCrack(c: Crack) {
    this.cracks = this.cracks.filter((x) => x !== c);
    useGame.getState().setFlag(c.id);
    for (const t of c.tiles) this.dungeon.setTile(t.tx, t.ty, ".");
    const mid = c.tiles[Math.floor(c.tiles.length / 2)];
    this.retileAround(mid.tx, mid.ty, 4);
    this.rebuildWalls();
    this.tweens.add({ targets: c.decal, alpha: 0, y: "+=6", duration: 200, onComplete: () => c.decal.destroy() });
    this.puff(c.cx, c.cy, 0x9a8a72, 18);
    this.cameras.main.shake(120, 0.006);
    // a passage cracked from both sides: the neighbour room's half goes too
    for (const o of [...this.cracks]) {
      const touches = o.tiles.some((a) => c.tiles.some((b) => Math.abs(a.tx - b.tx) <= 1 && Math.abs(a.ty - b.ty) <= 1));
      if (touches) this.breakCrack(o);
    }
  }

  // ------------------------------------------------------------------ rooms

  private clearRoomStuff() {
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.treant = undefined;
    for (const o of this.roomStuff) o.destroy();
    this.roomStuff = [];
    this.solids.clear(true, true);
    this.chestGroup.clear(true, true);
    this.blockGroup.clear(true, true);
    this.pickupGroup.clear(true, true);
    this.blocks = [];
    this.chests = [];
    this.plates = [];
    this.crystals = [];
    this.solidTiles.clear();
    this.signs = [];
    this.sealRoots = [];
    useGame.getState().setTag(null);
    this.bossRing?.destroy();
    this.bossRing = undefined;
    this.boomerang?.destroy();
    this.boomerang = undefined;
    for (const b of this.bombs) b.destroy();
    this.bombs = [];
  }

  private enterRoom(room: Room, first = false) {
    this.clearRoomStuff();
    this.room = room;
    const st = useGame.getState();
    st.setRoom(room.id, room.name, this.dungeon.def.name);
    this.cameras.main.setBounds(room.x, room.y, room.w, room.h);
    this.cameras.main.setScroll(room.x, room.y);

    const cleared = st.hasFlag(`cleared:${room.id}`);
    const solved = st.hasFlag(`solved:${room.id}`);
    st.setFlag(`visited:${room.id}`);
    // entry beat: the room-name plate shows centred, then the mobs pop in once it's gone.
    // The boss room announces the boss instead.
    const bossHere = (room.objects ?? []).some((o) => o.kind === "treant") && !st.hasFlag(`boss:${this.dungeon.def.id}`);
    if (!bossHere) {
      st.showBanner({ kind: "room", title: room.name, sub: this.dungeon.def.name });
      this.time.delayedCall(1300, () => useGame.getState().banner?.kind === "room" && useGame.getState().showBanner(null));
    }
    const spawnAt = first ? 300 : 1100;
    const spawns: { kind: string; x: number; y: number }[] = [];
    for (const p of room.placements) {
      const x = p.tx * TILE, y = p.ty * TILE;
      switch (p.kind) {
        case "torch": {
          const img = this.add.image(x, y - TILE * 0.6, "torch").setOrigin(0).setDepth(y + 20);
          this.roomStuff.push(img);
          this.tweens.add({ targets: img, alpha: 0.85, duration: 120 + Math.random() * 90, yoyo: true, repeat: -1 });
          break;
        }
        case "stump":
          this.addSolidProp("stump", p);
          break;
        case "crystal": {
          const img = this.addSolidProp("crystal", p);
          const zone = this.add.zone(x + 16, y + 14, 26, 26);
          this.physics.add.existing(zone, true);
          this.roomStuff.push(zone);
          const lit = solved;
          if (lit) img.setTint(0xffb060);
          this.crystals.push({ image: img, zone, lit });
          break;
        }
        case "plate": {
          const img = this.add.image(x, y, "plate").setOrigin(0).setDepth(-999);
          this.roomStuff.push(img);
          this.plates.push({ tx: p.tx, ty: p.ty, image: img });
          if (solved) img.setTint(0x9adf9a);
          break;
        }
        case "block":
          if (!solved) this.addBlock(p.tx, p.ty);
          break;
        case "chest":
          this.addChest(p, room.chests?.[p.index] ?? "gold");
          break;
        case "sign": {
          const img = this.addSolidProp("signpost", p);
          img.setDepth(y + 28);
          const zone = this.add.zone(x + 16, y + 26, 34, 22);
          this.physics.add.existing(zone, true);
          this.roomStuff.push(zone);
          this.signs.push({ zone, text: room.signs?.[p.index] ?? "..." });
          break;
        }
        case "chest-hidden": {
          const reward = room.solveReward ?? room.clearReward ?? "";
          const done = room.solveReward ? solved : cleared;
          if (done && reward) this.addChest(p, reward.startsWith("chest:") ? reward.slice(6) : reward);
          break;
        }
        case "key-drop":
          if (cleared && room.clearReward === "key" && !st.hasFlag(`key:${room.id}`)) this.spawnPickup("key", x + 16, y + 28);
          break;
        case "slime":
        case "sprite":
        case "mushroom":
        case "mossback":
          // every room stays cleared once you've cleared it (saved), not just the reward rooms
          if (!cleared) spawns.push({ kind: p.kind, x: x + 16, y: y + 30 });
          break;
      }
    }
    if (spawns.length) {
      this.time.delayedCall(spawnAt, () => {
        if (this.room !== room) return;
        for (const sp of spawns) this.spawnEnemy(sp.kind, sp.x, sp.y, { puff: true });
        this.startLesson("attack");
      });
    }
    // puzzle targets pulse once so the eye finds them
    for (const pl of this.plates) if (!solved) this.tweens.add({ targets: pl.image, scaleX: 1.12, scaleY: 1.12, duration: 260, yoyo: true, repeat: 2, delay: spawnAt });
    if (this.cracks.some((c) => c.tiles.some((t) => this.dungeon.roomAtWorld(t.tx * TILE, t.ty * TILE) === room))) this.startLesson("bomb");
    // free-placed objects (the boss)
    for (const o of room.objects ?? []) {
      if (o.kind === "treant" && bossHere) {
        this.treant = this.spawnEnemy("treant", room.x + o.x * TILE, room.y + o.y * TILE) as Treant;
        this.bossIntro(room, this.treant);
      } else if (o.kind === "treant" && st.hasFlag(`boss:${this.dungeon.def.id}`) && !st.hasFlag(`shard:${this.dungeon.def.id}`)) {
        this.spawnPickup("shard", room.x + o.x * TILE, room.y + o.y * TILE);
      }
    }
    if (!this.treant) st.setBoss(null);
    if (!first) this.puffRoomEntry();
  }

  private puffRoomEntry() {
    // enemies pop in with a small scale-up so a scroll doesn't reveal them frozen
    for (const e of this.enemies) {
      const s = e.sprite;
      const sx = s.scaleX, sy = s.scaleY;
      s.setScale(sx * 0.2, sy * 0.2);
      this.tweens.add({ targets: s, scaleX: sx, scaleY: sy, duration: 180, ease: "Back.easeOut" });
    }
  }

  private addSolidProp(tex: string, p: Placement) {
    const x = p.tx * TILE, y = p.ty * TILE;
    const img = this.add.image(x, y, tex).setOrigin(0).setDepth(y + 32);
    this.roomStuff.push(img);
    this.solids.add(this.add.zone(x + 16, y + 22, 28, 18));
    this.solidTiles.add(`${p.tx},${p.ty}`);
    return img;
  }

  private addChest(p: Placement, contents: string) {
    const id = `chest:${this.room.id}:${p.index}`;
    const opened = useGame.getState().hasFlag(id);
    const x = p.tx * TILE, y = p.ty * TILE;
    const image = this.add.image(x, y, opened && this.textures.exists("chest-open") ? "chest-open" : "chest").setOrigin(0).setDepth(y + 32);
    if (opened && !this.textures.exists("chest-open")) image.setTint(0x777777);
    const zone = this.add.zone(x + 16, y + 22, 30, 20);
    zone.setData("chestId", id);
    this.chestGroup.add(zone);
    this.roomStuff.push(image);
    this.solidTiles.add(`${p.tx},${p.ty}`);
    this.chests.push({ id, image, zone, contents, opened });
  }

  private revealHiddenChest(reward: string) {
    const p = this.room.placements.find((q) => q.kind === "chest-hidden");
    if (!p) return;
    this.addChest(p, reward.startsWith("chest:") ? reward.slice(6) : reward);
    const c = this.chests[this.chests.length - 1];
    c.image.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: c.image, scale: 1, alpha: 1, duration: 260, ease: "Back.easeOut" });
    this.puff(p.tx * TILE + 16, p.ty * TILE + 16, 0xfff2b0, 16);
    this.cameras.main.shake(60, 0.002);
  }

  private addBlock(tx: number, ty: number) {
    const s = this.blockGroup.create(tx * TILE + 16, ty * TILE + 16, "block") as Phaser.Physics.Arcade.Sprite;
    s.setImmovable(true).setDepth(ty * TILE + 32);
    s.body!.setSize(30, 30);
    this.blocks.push({ sprite: s, tx, ty, moving: false, pushMs: 0, pushDir: "" });
  }

  // ---------------------------------------------------------------- spawning

  spawnEnemy(kind: string, x: number, y: number, opts: { fromSplit?: boolean; puff?: boolean } = {}): Enemy | undefined {
    let e: Enemy | undefined;
    switch (kind) {
      case "slime":
        e = new Slime(this, this.enemyGroup, x, y, opts.fromSplit ? { hp: 1, scale: 0.7, bounty: 1 } : {});
        break;
      case "mossback":
        e = new Slime(this, this.enemyGroup, x, y, { hp: 8, scale: 1.8, split: true, bounty: 15 });
        break;
      case "sprite":
        e = new ForestSprite(this, this.enemyGroup, x, y);
        break;
      case "mushroom":
        e = new Mushroom(this, this.enemyGroup, x, y);
        break;
      case "treant":
        e = new Treant(this, this.enemyGroup, x, y);
        break;
    }
    if (!e) return;
    this.enemies.push(e);
    if (opts.puff) {
      this.puff(x, y - 10, 0xc8ffd8, 10);
      e.sprite.setScale(0.2);
      this.tweens.add({ targets: e.sprite, scale: 1, duration: 200, ease: "Back.easeOut" });
    }
    return e;
  }

  enemyCount(kind?: string) {
    return this.enemies.filter((e) => !e.isDead && (!kind || (kind === "sprite" ? e instanceof ForestSprite : true))).length;
  }

  private spawnPickup(kind: "key" | "heart" | "shard", x: number, y: number) {
    const tex = kind === "heart" ? "hearts" : `icon-${kind}`;
    const img = this.pickupGroup.create(x, y, tex, kind === "heart" ? 0 : undefined) as Phaser.Physics.Arcade.Sprite;
    img.setOrigin(0.5, 1).setDepth(y);
    img.body!.setSize(18, 18).setOffset(kind === "heart" ? -1 : 3, kind === "heart" ? -2 : 4);
    img.setData("pickup", kind);
    // pop out, then hover
    img.setScale(0.3);
    this.tweens.add({ targets: img, scale: 1, duration: 220, ease: "Back.easeOut" });
    this.tweens.add({ targets: img, y: y - 3, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: 220 });
    this.puff(x, y - 8, 0xfff2b0, 8);
    return img;
  }

  /** Overlap/boomerang delivered a pickup to the player. */
  collectPickup(img: Phaser.GameObjects.Image) {
    if (!img.active) return;
    const kind = img.getData("pickup") as string;
    const st = useGame.getState();
    this.tweens.killTweensOf(img);
    img.destroy();
    switch (kind) {
      case "key":
        st.addKeys(1);
        st.setFlag(`key:${this.room.id}`);
        this.toast("icon-key", !st.hasFlag("hint:key") ? "A small key - opens one locked door" : "+1 key");
        st.setFlag("hint:key");
        break;
      case "heart":
        st.heal(2);
        break;
      case "shard":
        st.giveItem("shard");
        st.setFlag(`shard:${this.dungeon.def.id}`);
        st.showBanner({ kind: "item", title: "Ember Shard", sub: "One of three. Whisperwood Hollow is cleansed.", icon: "shard" });
        this.player.hold(1600);
        this.time.delayedCall(2600, () => useGame.getState().banner?.kind === "item" && useGame.getState().showBanner(null));
        break;
    }
  }

  // ---------------------------------------------------------------- combat

  private wireCollisions() {
    const p = this.player.sprite;
    this.physics.add.collider(this.enemyGroup, this.walls);
    this.physics.add.collider(this.enemyGroup, this.solids);
    this.physics.add.collider(this.enemyGroup, this.blockGroup);
    this.physics.add.collider(this.enemyGroup, this.chestGroup);
    this.physics.add.collider(p, this.doorGroup, (_p, obj) => this.touchDoor((obj as Phaser.GameObjects.GameObject).getData("door")));
    this.physics.add.collider(p, this.chestGroup, (_p, obj) => this.openChest((obj as Phaser.GameObjects.GameObject).getData("chestId")));
    this.physics.add.collider(p, this.blockGroup);
    this.physics.add.overlap(p, this.pickupGroup, (_p, obj) => this.collectPickup(obj as Phaser.GameObjects.Image));
    // contact only hurts while the enemy is mid-attack
    this.physics.add.collider(p, this.enemyGroup, (_p, obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy;
      if (e?.isAttacking) this.player.hurt(e.sprite.x, e.sprite.y);
    });
    this.physics.add.overlap(this.player.hitbox, this.enemyGroup, (_hb, obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy;
      if (e) this.hitEnemy(e);
    });
    this.physics.add.overlap(this.player.hitbox, this.doorGroup, (_hb, obj) => {
      // a sword clang on a locked door is a hint, not an unlock
      void obj;
    });
  }

  private hitEnemy(e: Enemy) {
    if (!this.player.attackActive || e.hitThisSwing || e.isDead) return;
    const s = e.sprite;
    const wasStunnedBoss = e instanceof Treant;
    const died = e.takeHit(this.player.sprite.x, this.player.sprite.y, 1);
    this.finishLesson("attack");
    // feedback bundle: hit-stop, shake, damage number (flash + knockback are in takeHit)
    this.cameras.main.shake(80, 0.004);
    this.hitStop(60);
    if (!(wasStunnedBoss && !(e as Treant).isStunned)) this.damageNumber(s.x, s.y - s.displayHeight, 1);
    if (e instanceof Treant && !died) useGame.getState().setBoss({ name: "Elder Treant", hp: Math.max(0, e.hp), max: TREANT_HP, status: useGame.getState().boss?.status ?? "" });
    if (died) this.onEnemyDied(e);
  }

  private onEnemyDied(e: Enemy) {
    this.enemies = this.enemies.filter((x) => x !== e);
    const st = useGame.getState();
    st.addGold(e.bounty);
    if (!(e instanceof Treant) && Math.random() < 0.2 && st.hearts < st.maxHearts) this.spawnPickup("heart", e.sprite.x, e.sprite.y);
    this.checkRoomCleared();
  }

  private checkRoomCleared() {
    const room = this.room;
    if (this.enemies.some((x) => !x.isDead)) return;
    const st = useGame.getState();
    if (st.hasFlag(`cleared:${room.id}`)) return;
    st.setFlag(`cleared:${room.id}`);
    if (!room.clearReward) return;
    this.time.delayedCall(350, () => {
      if (this.room !== room) return;
      const k = room.placements.find((p) => p.kind === "key-drop");
      if (room.clearReward === "key" && k) this.spawnPickup("key", k.tx * TILE + 16, k.ty * TILE + 28);
      else if (room.clearReward) this.revealHiddenChest(room.clearReward);
    });
  }

  private solveRoom() {
    const room = this.room;
    const st = useGame.getState();
    if (st.hasFlag(`solved:${room.id}`)) return;
    st.setFlag(`solved:${room.id}`);
    this.cameras.main.shake(80, 0.003);
    this.time.delayedCall(300, () => this.room === room && room.solveReward && this.revealHiddenChest(room.solveReward));
  }

  hitStop(ms: number) {
    this.physics.world.pause();
    this.anims.pauseAll();
    this.time.delayedCall(ms, () => {
      if (this.frozen) return;
      this.physics.world.resume();
      this.anims.resumeAll();
    });
  }

  damageNumber(x: number, y: number, amount: number) {
    const t = this.add
      .text(x, y, `-${amount}`, { fontFamily: "Emberfall Pixel, monospace", fontSize: "16px", color: "#fff2b0", stroke: "#7a2e10", strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(10000)
      .setResolution(2);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 600, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }

  /** Called by Player when a swing starts so each enemy can be hit once per swing. */
  resetSwingHits() {
    for (const e of this.enemies) e.hitThisSwing = false;
  }

  playerPos() {
    return { x: this.player.sprite.x, y: this.player.sprite.y };
  }

  // ----------------------------------------------------------- boss hooks

  private sealRoots: Phaser.GameObjects.Image[] = [];
  private introHold = 0;

  /**
   * Boss intro: Wren is held, roots seal the way she came in, the camera leans in on
   * the Treant as its core lights and the ground quakes, the name banner drops, then
   * the fight starts. Bar and status only appear once the camera is back.
   */
  private bossIntro(room: Room, t: Treant) {
    const st = useGame.getState();
    const cam = this.cameras.main;
    const s = t.sprite;
    this.player.hold(3400);
    this.introHold = 3400;
    this.player.sprite.setVelocity(0, 0);
    // step clear of the doorway before the roots come up
    this.tweens.add({ targets: this.player.sprite, y: this.player.sprite.y - 30, duration: 450, ease: "Sine.easeInOut" });
    t.delayStart(4200);
    st.setBoss(null);
    // roots burst up in the south doorway behind her
    this.time.delayedCall(500, () => this.sealDoorway(room));
    // lean in
    this.time.delayedCall(700, () => {
      cam.pan(s.x, s.y - 44, 800, "Sine.easeInOut");
      cam.zoomTo(1.5, 800, "Sine.easeInOut");
    });
    // the core wakes: three amber flashes, then a quake
    for (const [i, d] of [1500, 1700, 1900].entries()) {
      this.time.delayedCall(d, () => {
        if (t.isDead) return;
        s.setTint(0x7a3a00).setTintMode(Phaser.TintModes.ADD);
        this.puff(s.x, s.y - 40, 0xffb060, 6 + i * 4);
        this.time.delayedCall(90, () => !t.isDead && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
      });
    }
    this.time.delayedCall(2100, () => {
      cam.shake(420, 0.012);
      st.showBanner({ kind: "boss", title: "ELDER TREANT", sub: "Warden of the Hollow" });
      this.time.delayedCall(2200, () => useGame.getState().banner?.kind === "boss" && useGame.getState().showBanner(null));
    });
    // back out, and the fight is on
    this.time.delayedCall(2900, () => {
      cam.pan(room.x + room.w / 2, room.y + room.h / 2, 600, "Sine.easeInOut");
      cam.zoomTo(1, 600, "Sine.easeInOut");
    });
    this.time.delayedCall(3500, () => {
      if (t.isDead) return;
      cam.setScroll(room.x, room.y);
      cam.setZoom(1);
      useGame.getState().setBoss({ name: "Elder Treant", hp: TREANT_HP, max: TREANT_HP, status: "" });
      this.setAnchor("boss", s.x, s.y - 62);
    });
  }

  /** Root spikes rise in the boss room's south doorway and block it. */
  private sealDoorway(room: Room) {
    this.unsealDoorway();
    this.cameras.main.shake(200, 0.006);
    for (const tx of [9, 10]) {
      const x = room.x + tx * TILE + 16;
      const y = room.y + 11 * TILE + 30;
      const img = this.add.image(x, y, "root").setOrigin(0.5, 1).setDepth(y).setScale(1, 0.1);
      this.tweens.add({ targets: img, scaleY: 1.1, duration: 220, ease: "Back.easeOut", delay: (tx - 9) * 80 });
      this.puff(x, y - 8, 0x9a8a72, 8);
      const zone = this.add.zone(x, y - 14, 30, 28);
      this.solids.add(zone);
      this.roomStuff.push(img, zone);
      this.sealRoots.push(img);
    }
  }

  private unsealDoorway() {
    for (const img of this.sealRoots) {
      if (!img.active) continue;
      this.tweens.add({ targets: img, scaleY: 0, alpha: 0.5, duration: 300, ease: "Quad.easeIn", onComplete: () => img.destroy() });
    }
    this.sealRoots = [];
    // the zones were pushed to roomStuff next to their images; rebuild solids without them
    for (const o of this.roomStuff) if (o instanceof Phaser.GameObjects.Zone && this.solids.contains(o)) this.solids.remove(o, true, true);
  }

  bossPhase2() {
    const st = useGame.getState();
    if (st.boss) st.setBoss({ ...st.boss, status: "IT DIGS IN DEEPER" });
    this.cameras.main.shake(250, 0.008);
    this.time.delayedCall(1600, () => useGame.getState().boss?.status === "IT DIGS IN DEEPER" && useGame.getState().setBoss({ ...useGame.getState().boss!, status: "" }));
  }

  bossStatus(status: "stunned" | "recovered" | "bark") {
    const st = useGame.getState();
    if (!st.boss) return;
    const hasBoomerang = st.hasItem("boomerang");
    const text = status === "stunned" ? "STUNNED - STRIKE THE CORE" : status === "bark" ? (hasBoomerang ? "Bark shrugs off steel - ring the core" : "Bark shrugs off steel") : "";
    st.setBoss({ ...st.boss, status: text });
    if (status === "bark") this.time.delayedCall(1400, () => useGame.getState().boss?.status === text && useGame.getState().setBoss({ ...useGame.getState().boss!, status: "" }));
    // a pulsing ring on the ember core while it's open to attack
    this.bossRing?.destroy();
    this.bossRing = undefined;
    if (status === "stunned" && this.treant) {
      const t = this.treant.sprite;
      this.bossRing = this.add.circle(t.x, t.y - 40, 12, 0x000000, 0).setStrokeStyle(2, 0xffb060, 1).setDepth(t.depth + 1);
      this.tweens.add({ targets: this.bossRing, scale: 1.5, alpha: 0, duration: 700, repeat: -1, ease: "Quad.easeOut" });
    }
  }

  bossDefeated(t: Treant) {
    const st = useGame.getState();
    st.setFlag(`boss:${this.dungeon.def.id}`);
    st.setFlag(`cleared:${this.room.id}`);
    st.setBoss(null);
    this.cameras.main.shake(500, 0.01);
    this.hitStop(120);
    // the summoned sprites die with their master
    for (const e of this.enemies) if (e !== t && !e.isDead) e.takeHit(e.sprite.x, e.sprite.y + 1, 99);
    this.enemies = this.enemies.filter((e) => e === t);
    st.addGold(t.bounty);
    const { x, y } = t.sprite;
    // white-out, then the roots let go of the doorway, then the shard
    const flash = this.add.rectangle(this.room.x, this.room.y, this.room.w, this.room.h, 0xfff2b0, 0.85).setOrigin(0).setDepth(20000);
    this.tweens.add({ targets: flash, alpha: 0, duration: 900, ease: "Quad.easeOut", onComplete: () => flash.destroy() });
    this.time.delayedCall(900, () => this.unsealDoorway());
    this.time.delayedCall(1700, () => this.room.purpose === "boss" && this.spawnPickup("shard", x, y - 20));
  }

  // ---------------------------------------------------------- interactions

  private touchDoor(id: string) {
    const door = this.doors.find((d) => d.id === id);
    if (!door) return;
    const st = useGame.getState();
    const at = { x: door.image.x + door.image.width / 2, y: door.image.y - 6 };
    if (door.kind === "locked") {
      if (st.keys <= 0) return this.toast("icon-key", "Locked - needs a small key", true, at);
      st.addKeys(-1);
    } else {
      if (!st.hasItem("bosskey")) return this.toast("icon-bosskey", "Locked - needs the Boss Key", true, at);
    }
    st.setFlag(door.id);
    this.doors = this.doors.filter((d) => d !== door);
    door.zone.destroy();
    door.image.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(80, () => door.image.active && door.image.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    this.tweens.add({ targets: door.image, alpha: 0, y: "-=10", duration: 320, delay: 80, ease: "Quad.easeIn", onComplete: () => door.image.destroy() });
    this.puff(door.image.x + 32, door.image.y + 24, 0xfff2b0, 12);
    this.cameras.main.shake(70, 0.003);
  }

  private lastToastAt = 0;
  /** A short pixel tag above Wren (rendered by the HUD so it uses the real UI chrome and font). */
  private toast(icon: string, text: string, negative = false, at?: { x: number; y: number }) {
    const now = this.time.now;
    if (now - this.lastToastAt < 700) return;
    this.lastToastAt = now;
    const p = at ?? { x: this.player.sprite.x, y: this.player.sprite.y - 40 };
    const cam = this.cameras.main;
    const iconPath = icon.startsWith("icon-") ? `/assets/ui/icons/${icon.slice(5)}.png` : undefined;
    useGame.getState().setTag({ text, x: p.x - cam.scrollX, y: p.y - cam.scrollY, icon: iconPath, kind: negative ? "locked" : "info" });
    this.time.delayedCall(1100, () => {
      const t = useGame.getState().tag;
      if (t && t.text === text) useGame.getState().setTag(null);
    });
  }

  /** Camera-space anchor for HUD elements that follow world objects (Wren's lesson tag, the boss status). */
  private setAnchor(name: "wren" | "boss", wx: number, wy: number) {
    if (!this.frameEl || !this.frameEl.isConnected) this.frameEl = document.querySelector("#ui .frame");
    if (!this.frameEl) return;
    const cam = this.cameras.main;
    const px = ((wx - cam.scrollX) / cam.width) * 100;
    const py = ((wy - cam.scrollY) / cam.height) * 100;
    this.frameEl.style.setProperty(`--${name}-x`, String(px));
    this.frameEl.style.setProperty(`--${name}-y`, String(py));
    // tags hang to the right by default; flip them near the right edge so they stay on screen
    this.frameEl.classList.toggle(`${name}-right`, px > 62);
    if (name === "wren") {
      // ghost the hotbar while she walks under it (the south doorway sits behind it)
      const under = py > 78 && Math.abs(px - 50) < 22;
      this.frameEl.classList.toggle("hotbar-ghost", under);
    }
  }

  // ---------------------------------------------------------------- lessons

  /** Contextual tutorial: one tag at a time beside Wren; queued if another is showing. */
  startLesson(id: LessonId) {
    const st = useGame.getState();
    if (st.lessons.includes(id) || this.pendingLessons.includes(id) || st.lesson?.id === id) return;
    if (id === "throw" && !st.hasItem("boomerang")) return;
    if (id === "bomb" && !st.hasItem("bomb")) return;
    if (st.lesson) {
      this.pendingLessons.push(id);
      return;
    }
    st.setLesson({ id, keys: id === "move" ? ["W", "A", "S", "D"] : undefined });
  }

  lessonKey(key: string) {
    const st = useGame.getState();
    const l = st.lesson;
    if (!l || l.id !== "move" || !l.keys?.includes(key)) return;
    const keys = l.keys.filter((k) => k !== key);
    if (keys.length) st.setLesson({ ...l, keys });
    else this.finishLesson("move");
  }

  finishLesson(id: LessonId) {
    const st = useGame.getState();
    if (st.lessons.includes(id)) return;
    st.finishLesson(id);
    // the next lesson in the chain, after a beat
    const chain: Partial<Record<LessonId, LessonId>> = { move: "dash" };
    const next = chain[id] ?? this.pendingLessons.shift();
    if (next) this.time.delayedCall(700, () => this.startLesson(next));
  }

  // ------------------------------------------------------------------ signs

  /** Bump a signpost to read it; step away and bump again to re-read (no re-trigger while still leaning on it). */
  private checkSigns() {
    if (useGame.getState().dialogue) return;
    const pb = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    let touchingAny = false;
    for (const s of this.signs) {
      const zb = s.zone.body as Phaser.Physics.Arcade.StaticBody;
      const touching = pb.right > zb.left - 2 && pb.left < zb.right + 2 && pb.bottom > zb.top - 2 && pb.top < zb.bottom + 2;
      if (!touching) continue;
      touchingAny = true;
      if (this.signLatched) break;
      this.signLatched = true;
      this.player.hold(99999);
      this.player.sprite.setVelocity(0, 0);
      useGame.getState().setDialogue({ title: "MOSS-CARVED SIGN", text: s.text });
      break;
    }
    if (!touchingAny) this.signLatched = false;
  }

  private openChest(id: string) {
    const c = this.chests.find((x) => x.id === id);
    if (!c || c.opened) return;
    c.opened = true;
    const st = useGame.getState();
    st.setFlag(c.id);
    if (this.textures.exists("chest-open")) c.image.setTexture("chest-open");
    else c.image.setTint(0x777777);
    this.tweens.add({ targets: c.image, scaleY: 0.85, duration: 60, yoyo: true });
    this.puff(c.image.x + 16, c.image.y + 8, 0xfff2b0, 10);
    // the item rises out of the chest and hangs there while the banner shows
    const item = c.contents;
    const tex = item === "heart" ? "heart-container" : item === "gold" ? "icon-coin" : `icon-${item}`;
    const img = this.add.image(c.image.x + 16, c.image.y + 12, this.textures.exists(tex) ? tex : "icon-coin").setDepth(c.image.depth + 1).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: img, y: img.y - 26, alpha: 1, scale: 1, duration: 320, ease: "Back.easeOut" });
    this.tweens.add({ targets: img, alpha: 0, duration: 200, delay: 1400, onComplete: () => img.destroy() });
    this.player.hold(1300);
    let banner: { title: string; sub?: string; icon?: ItemId | "heart" } | null = null;
    switch (item) {
      case "gold":
        st.addGold(30);
        banner = { title: "30 gold", sub: "Someone's savings, long forgotten." };
        break;
      case "key":
        st.addKeys(1);
        banner = { title: "Small Key", sub: "Opens one locked door.", icon: "key" };
        break;
      case "heart":
        st.addMaxHearts(2);
        banner = { title: "Heart Container", sub: "Your vitality grows.", icon: "heart" };
        break;
      case "boomerang":
        st.giveItem("boomerang");
        banner = { title: "Boomerang", sub: "Right-click to throw. Stuns foes, rings crystals, fetches loot.", icon: "boomerang" };
        this.time.delayedCall(2600, () => this.startLesson("throw"));
        break;
      case "bosskey":
        st.giveItem("bosskey");
        banner = { title: "Boss Key", sub: "The Heart of the Hollow lies north of the Crossroads.", icon: "bosskey" };
        break;
      case "potion":
        st.giveItem("potion");
        banner = { title: "Potion", icon: "potion" };
        break;
    }
    if (banner) {
      st.showBanner({ kind: "item", ...banner });
      this.time.delayedCall(2400, () => useGame.getState().banner?.kind === "item" && useGame.getState().showBanner(null));
    }
  }

  /**
   * Zelda push: lean on a block for a moment and it slides one tile, if the
   * tile beyond is free. Driven from update() by body adjacency rather than a
   * collider callback, which only fires on the frames the bodies overlap.
   */
  private updateBlocks(delta: number) {
    const pb = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const m = this.player.moveDir;
    const moving = (this.player.sprite.body as Phaser.Physics.Arcade.Body).velocity.lengthSq() > 1 || this.player.action !== "idle";
    for (const b of this.blocks) {
      if (b.moving) continue;
      // a block that has found its plate stays put
      if (this.plates.some((pl) => pl.tx === b.tx && pl.ty === b.ty)) continue;
      const bb = b.sprite.body as Phaser.Physics.Arcade.Body;
      let dir: Dir | null = null;
      if (moving && m.lengthSq() > 0) {
        const gap = 3;
        const overlapY = pb.bottom > bb.top && pb.top < bb.bottom;
        const overlapX = pb.right > bb.left && pb.left < bb.right;
        if (Math.abs(m.x) >= Math.abs(m.y)) {
          if (m.x > 0 && overlapY && Math.abs(pb.right - bb.left) <= gap) dir = "east";
          if (m.x < 0 && overlapY && Math.abs(pb.left - bb.right) <= gap) dir = "west";
        } else {
          if (m.y > 0 && overlapX && Math.abs(pb.bottom - bb.top) <= gap) dir = "south";
          if (m.y < 0 && overlapX && Math.abs(pb.top - bb.bottom) <= gap) dir = "north";
        }
      }
      if (!dir) {
        b.pushMs = Math.max(0, b.pushMs - delta);
        if (b.pushMs === 0 && useGame.getState().tag?.kind === "push") useGame.getState().setTag(null);
        continue;
      }
      if (b.pushDir !== dir) {
        b.pushDir = dir;
        b.pushMs = 0;
      }
      b.pushMs += delta;
      if (useGame.getState().tag?.kind !== "push") {
        const cam = this.cameras.main;
        useGame.getState().setTag({ text: "Push", x: b.sprite.x - cam.scrollX, y: b.sprite.y - 22 - cam.scrollY, kind: "push" });
      }
      if (b.pushMs < 140) continue;
      b.pushMs = 0;
      this.slideBlock(b, dir);
    }
  }

  private slideBlock(b: Block, dir: Dir) {
    const { dx, dy } = DIRS[dir];
    const sprite = b.sprite;
    const tx = b.tx + dx, ty = b.ty + dy;
    const blocked =
      this.dungeon.isWall(tx, ty) ||
      this.solidTiles.has(`${tx},${ty}`) ||
      this.blocks.some((o) => o !== b && o.tx === tx && o.ty === ty) ||
      // the doorway tiles are floor but lead off-screen; keep blocks inside the room
      tx < this.room.gx * ROOM_W + 1 || tx >= (this.room.gx + 1) * ROOM_W - 1 || ty < this.room.gy * ROOM_H + 3 || ty >= (this.room.gy + 1) * ROOM_H - 1;
    if (blocked) {
      this.tweens.add({ targets: sprite, x: sprite.x + dx * 1.5, y: sprite.y + dy * 1.5, duration: 40, yoyo: true });
      return;
    }
    b.moving = true;
    b.tx = tx;
    b.ty = ty;
    if (useGame.getState().tag?.kind === "push") useGame.getState().setTag(null);
    this.tweens.add({
      targets: sprite,
      x: tx * TILE + 16,
      y: ty * TILE + 16,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => {
        b.moving = false;
        sprite.setDepth(ty * TILE + 32);
        (sprite.body as Phaser.Physics.Arcade.Body).reset(sprite.x, sprite.y);
        const plate = this.plates.find((pl) => pl.tx === tx && pl.ty === ty);
        if (plate) {
          plate.image.setTint(0x9adf9a);
          this.cameras.main.shake(60, 0.002);
          this.solveRoom();
        }
      },
    });
  }

  // ------------------------------------------------------------------ tools

  throwBoomerang(dir: Phaser.Math.Vector2) {
    if (this.boomerang && !this.boomerang.done) return false;
    const p = this.player.sprite;
    this.boomerang = new Boomerang(this, p.x + dir.x * 10, p.y - 16 + dir.y * 10, dir);
    this.finishLesson("throw");
    this.physics.add.collider(this.boomerang.sprite, this.walls);
    this.physics.add.overlap(this.boomerang.sprite, this.enemyGroup, (_b, obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy;
      if (!e || e.isDead || !this.boomerang?.canHit(e)) return;
      e.boomerangHit();
      this.hitStop(30);
      if (e.isDead) this.onEnemyDied(e);
      else if (!(e instanceof Treant)) this.boomerang.turnBack();
    });
    this.physics.add.overlap(this.boomerang.sprite, this.pickupGroup, (_b, obj) => {
      const img = obj as Phaser.Physics.Arcade.Sprite;
      if (!img.active || img.getData("carried")) return;
      img.setData("carried", true);
      this.tweens.killTweensOf(img);
      (img.body as Phaser.Physics.Arcade.Body).enable = false;
      this.pickupGroup.remove(img);
      this.boomerang?.carry(img);
    });
    for (const c of this.crystals) {
      this.physics.add.overlap(this.boomerang.sprite, c.zone, () => {
        if (c.lit || !this.boomerang?.canHit(c)) return;
        c.lit = true;
        c.image.setTint(0xffb060);
        this.tweens.add({ targets: c.image, scaleX: 1.2, scaleY: 0.85, duration: 70, yoyo: true });
        this.puff(c.image.x + 16, c.image.y + 10, 0xffd090, 12);
        this.boomerang.turnBack();
        this.solveRoom();
      });
    }
    return true;
  }

  placeBomb() {
    const st = useGame.getState();
    if (!st.useItem("bomb")) return false;
    const p = this.player.sprite;
    this.bombs.push(new Bomb(this, p.x, p.y + 2));
    this.finishLesson("bomb");
    return true;
  }

  drinkPotion() {
    const st = useGame.getState();
    if (st.hearts >= st.maxHearts) {
      this.toast("icon-potion", "Already full", true);
      return false;
    }
    if (!st.useItem("potion")) return false;
    st.heal(6);
    this.puff(this.player.sprite.x, this.player.sprite.y - 20, 0xff8090, 10);
    return true;
  }

  onExplosion(x: number, y: number, r: number) {
    this.cameras.main.shake(180, 0.008);
    this.hitStop(50);
    for (const e of [...this.enemies]) {
      if (e.isDead) continue;
      const s = e.sprite;
      if (Phaser.Math.Distance.Between(x, y, s.x, s.y - s.displayHeight / 2) < r + s.displayWidth / 2) {
        e.hitThisSwing = false;
        const died = e.takeHit(x, y, 2);
        this.damageNumber(s.x, s.y - s.displayHeight, 2);
        if (died) this.onEnemyDied(e);
      }
    }
    const p = this.player.sprite;
    if (Phaser.Math.Distance.Between(x, y, p.x, p.y - 12) < r) this.player.hurt(x, y);
    for (const c of [...this.cracks]) {
      if (Phaser.Math.Distance.Between(x, y, c.cx, c.cy) < r + 24) this.breakCrack(c);
    }
  }

  puff(x: number, y: number, tint: number, n: number) {
    if (!this.textures.exists("spore")) return;
    const em = this.add.particles(x, y, "spore", {
      speed: { min: 20, max: 70 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 250, max: 450 },
      scale: { start: 0.9, end: 0 },
      tint,
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(9000);
    em.explode(n);
    this.time.delayedCall(600, () => em.destroy());
  }

  // -------------------------------------------------------------- transitions

  private checkRoomExit() {
    const p = this.player.sprite;
    const r = this.room;
    let dir: Dir | null = null;
    if (p.x < r.x) dir = "west";
    else if (p.x > r.x + r.w) dir = "east";
    else if (p.y - 10 < r.y) dir = "north";
    else if (p.y - 10 > r.y + r.h) dir = "south";
    if (!dir) return;
    const { dx, dy } = DIRS[dir];
    const next = this.dungeon.roomAt(r.gx + dx, r.gy + dy);
    if (!next) return;
    this.startTransition(next, dir);
  }

  private startTransition(next: Room, dir: Dir) {
    this.transitioning = true;
    const { dx, dy } = DIRS[dir];
    const p = this.player.sprite;
    this.player.hold(99999);
    p.setVelocity(0, 0);
    (p.body as Phaser.Physics.Arcade.Body).enable = false;
    // old room's contents go now; they'd only be seen for a split second mid-scroll
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.boomerang?.destroy();
    this.boomerang = undefined;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.dungeon.widthPx, this.dungeon.heightPx);
    const D = 520;
    this.tweens.add({ targets: cam, scrollX: next.x, scrollY: next.y, duration: D, ease: "Sine.easeInOut" });
    // walk her a little way into the new room so she clears the doorway
    this.tweens.add({
      targets: p,
      x: p.x + dx * 40,
      y: p.y + dy * 44,
      duration: D,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (!p.body || !p.active) return; // scene restarted mid-scroll
        (p.body as Phaser.Physics.Arcade.Body).enable = true;
        (p.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
        this.enterRoom(next);
        this.player.hold(this.introHold); // a boss intro may have asked to keep her still
        this.introHold = 0;
        this.player.grace(700);
        this.transitioning = false;
      },
    });
  }

  /** Playtest helper (console): __game.scene.getScene("Dungeon").goto("boss") */
  goto(id: string) {
    const r = this.dungeon.room(id);
    const p = this.player.sprite;
    this.tweens.killTweensOf(p);
    this.tweens.killTweensOf(this.cameras.main);
    this.transitioning = false;
    if (p.body) (p.body as Phaser.Physics.Arcade.Body).enable = true;
    this.player.hold(0);
    p.setPosition(r.x + r.w / 2, r.y + r.h * 0.75);
    (p.body as Phaser.Physics.Arcade.Body).reset(p.x, p.y);
    this.enterRoom(r);
  }

  // ----------------------------------------------------------------- loop

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
      this.dt = delta;
      const now = this.time.now;
      const p = this.player.sprite;
      this.player.update(delta);
      if (this.transitioning) return;
      for (const e of this.enemies) e.update(now, p.x, p.y);
      // area hazards (spore clouds, root spikes)
      for (const e of this.enemies) {
        for (const hz of e.hazards) {
          if (Phaser.Math.Distance.Between(hz.x, hz.y, p.x, p.y - 8) < hz.r + 4) this.player.hurt(hz.x, hz.y);
        }
      }
      this.boomerang?.update(p.x, p.y - 14);
      this.setAnchor("wren", p.x, p.y - 56);
      this.checkSigns();
      for (const b of this.bombs) b.update(now);
      this.bombs = this.bombs.filter((b) => !b.exploded);
      this.updateBlocks(delta);
      this.checkRoomExit();
    } catch (err) {
      // a throw inside update aborts the render step, which is invisible in-game; surface it once
      if (!this.data.get("updateError")) {
        this.data.set("updateError", true);
        console.error("[DungeonScene.update]", (err as Error).stack ?? err);
      }
    }
  }
}
