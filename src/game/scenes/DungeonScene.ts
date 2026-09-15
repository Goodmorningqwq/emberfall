import Phaser from "phaser";
import { autotile, buildWangLookup, type TilesetMeta } from "../wang";
import { ROOM_H, ROOM_W, TILE } from "../room";
import { Dungeon, type Placement, type Room } from "../dungeon";
import { Player, type PlayerHost } from "../entities/Player";
import { Enemy } from "../entities/Enemy";
import { Slime } from "../entities/Slime";
import { ForestSprite } from "../entities/Sprite";
import { Mushroom } from "../entities/Mushroom";
import { Treant, TREANT_HP } from "../entities/Treant";
import { Skeleton } from "../entities/Skeleton";
import { BoneKnight, BONEKNIGHT_HP } from "../entities/BoneKnight";
import { Boomerang } from "../entities/Boomerang";
import { Grapple } from "../entities/Grapple";
import { Bomb } from "../entities/Bomb";
import { HERO } from "../entities/heroAssets";
import { useGame, type ItemId, type LessonId } from "../../ui/store";
import { DUNGEONS, dungeonFor, type DungeonMeta } from "../data/dungeons";
import { sfx } from "../audio";

type Dir = "north" | "south" | "east" | "west";

/** clip name -> frame count. "-loop" suffix loops. */
const ENEMY_CLIPS: Record<string, number> = { "slime-hop-loop": 6, "slime-splat": 6, "blueslime-hop-loop": 6, "blueslime-splat": 6, "sprite-hover-loop": 6, "mushroom-spore": 8, "door-locked-open": 6, "door-boss-open": 6, "water-loop": 4 };
const ENEMY_FPS: Record<string, number> = { "slime-hop-loop": 9, "slime-splat": 14, "blueslime-hop-loop": 9, "blueslime-splat": 14, "sprite-hover-loop": 12, "mushroom-spore": 7.3, "door-locked-open": 10, "door-boss-open": 8, "water-loop": 2.5 };
/** Boss plate text + HP per boss object kind. */
const BOSSES: Record<string, { name: string; sub: string; hp: number; flash: number; phase2: string; blocked: (hasTool: boolean) => string; stunned: string }> = {
  treant: { name: "ELDER TREANT", sub: "Warden of the Hollow", hp: TREANT_HP, flash: 0xffb060, phase2: "IT DIGS IN DEEPER", blocked: (t) => (t ? "Bark shrugs off steel - ring the core" : "Bark shrugs off steel"), stunned: "STUNNED - STRIKE THE CORE" },
  boneknight: { name: "BONE KNIGHT", sub: "Captain of the Drowned", hp: BONEKNIGHT_HP, flash: 0x9ad0ff, phase2: "HE QUICKENS", blocked: (t) => (t ? "The shield takes it - hook it away" : "The shield takes it - get behind him"), stunned: "SHIELD DOWN - STRIKE" },
};
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
export class DungeonScene extends Phaser.Scene implements PlayerHost {
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
  private boss?: Enemy;
  meta!: DungeonMeta;
  private waterGroup!: Phaser.Physics.Arcade.StaticGroup;
  private water: { sprite: Phaser.GameObjects.Sprite; zone: Phaser.GameObjects.Zone }[] = [];
  private anchors: { x: number; y: number; zone: Phaser.GameObjects.Zone }[] = [];
  private grapple?: Grapple;
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
    // every dungeon's tileset: the scene is restarted (not re-created) when the place changes
    for (const m of Object.values(DUNGEONS)) {
      this.load.spritesheet(`tiles-${m.tileset}`, `assets/tiles/${m.tileset}.png`, { frameWidth: TILE, frameHeight: TILE });
      this.load.json(`tiles-meta-${m.tileset}`, `assets/tiles/${m.tileset}.json`);
    }
    for (const p of ["door", "torch", "block", "chest", "chest-open", "slime", "blueslime", "sprite", "mushroom", "treant", "root", "door-locked", "door-locked-side", "door-boss", "stump", "crystal", "plate", "crack", "heart-container", "signpost", "bomb", "boomerang", "archway", "skeleton", "bat", "boneknight", "sarcophagus", "bones", "anchor", "pit-tile", "hook"]) {
      this.load.image(p, `assets/sprites/props/${p}.png`);
    }
    for (const i of ["key", "boomerang", "bomb", "shard", "potion", "coin", "bosskey", "grapple"]) this.load.image(`icon-${i}`, `assets/ui/icons/${i}.png`);
    // enemy clips: one PNG per frame under assets/sprites/props/anim/<clip>/<i>.png (PixelLab animate_object)
    for (const [clip, n] of Object.entries(ENEMY_CLIPS)) for (let i = 0; i < n; i++) this.load.image(`${clip}-${i}`, `assets/sprites/props/anim/${clip}/${i}.png`);
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
    this.grapple = undefined;
    this.boss = undefined;
    this.water = [];
    this.anchors = [];
    this.transitioning = false;
    this.frozen = false;
    this.signs = [];
    this.pendingLessons = [];
    this.bossRing = undefined;
    this.data.remove("updateError");
  }

  create() {
    for (const [clip, n] of Object.entries(ENEMY_CLIPS)) {
      if (this.anims.exists(clip)) continue;
      const frames = Array.from({ length: n }, (_, i) => `${clip}-${i}`).filter((k) => this.textures.exists(k)).map((key) => ({ key }));
      if (frames.length) this.anims.create({ key: clip, frames, frameRate: ENEMY_FPS[clip] ?? 8, repeat: clip.endsWith("-loop") ? -1 : 0 });
    }
    if (!this.textures.exists("halo")) {
      // soft radial glow for torches (drawn once, 48px)
      const g = this.add.graphics();
      for (let r = 24; r > 0; r -= 2) g.fillStyle(0xffa040, 0.05).fillCircle(24, 24, r);
      g.generateTexture("halo", 48, 48);
      g.destroy();
    }
    // a tiny soft dot for particles (spores, smoke, sparkles)
    if (!this.textures.exists("spore")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
      g.generateTexture("spore", 6, 6);
      g.destroy();
    }
    const st = useGame.getState();
    this.meta = dungeonFor(st.place);
    this.dungeon = new Dungeon(this.meta.def);
    // cracked walls already blown open on an earlier visit are floor now
    for (const r of this.dungeon.rooms) {
      for (const p of r.placements) if (p.kind === "wall-cracked" && st.hasFlag(`crack:${r.id}`)) this.dungeon.setTile(p.tx, p.ty, ".");
    }

    this.physics.world.setBounds(0, 0, this.dungeon.widthPx, this.dungeon.heightPx);
    this.lookup = buildWangLookup(this.cache.json.get(`tiles-meta-${this.meta.tileset}`) as TilesetMeta);
    this.buildTerrain();
    this.walls = this.physics.add.staticGroup();
    this.rebuildWalls();
    this.solids = this.physics.add.staticGroup();
    this.doorGroup = this.physics.add.staticGroup();
    this.chestGroup = this.physics.add.staticGroup();
    this.waterGroup = this.physics.add.staticGroup();
    this.blockGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();
    this.data.set("walls", this.walls);
    this.data.set("solids", this.solids);
    this.buildDoorsAndCracks();

    const ent = this.dungeon.def.entrance;
    const entRoom = this.dungeon.room(ent.room);
    this.player = new Player(this, entRoom.x + ent.tx * TILE, entRoom.y + ent.ty * TILE);
    useGame.getState().setPlace(this.meta.id);
    if (useGame.getState().screen === "game") this.cameras.main.fadeIn(400, 8, 10, 8);
    this.wireCollisions();
    this.enterRoom(entRoom, true);
    this.game.canvas.classList.add("ready");

    // React panels freeze the world while open. Not scene.pause(): in Phaser 4
    // that stops rendering too and the canvas clears to black.
    // the title/intro screens keep the world alive behind them (attract mode); only the menus freeze it
    const shouldFreeze = (s: ReturnType<typeof useGame.getState>) => s.bagOpen || s.paused || !!s.shop || s.screen === "dead" || s.screen === "complete";
    this.unsub = useGame.subscribe((s, prev) => {
      if (shouldFreeze(s) !== shouldFreeze(prev)) this.setFrozen(shouldFreeze(s));
      // new game / continue / respawn: start over from the entrance with the store's flags
      // (only once we're running: a restart mid-preload wedges the loader)
      if (s.screen === "game" && prev.screen !== "game" && prev.screen !== "complete" && this.scene.isActive()) this.time.delayedCall(0, () => (useGame.getState().place === "hub" ? this.scene.start("Hub") : this.scene.restart()));
      // back to the title: reset to the entrance in attract mode so nothing can hurt her behind the menu
      if (s.screen === "title" && prev.screen !== "title" && this.scene.isActive()) this.time.delayedCall(0, () => this.scene.restart());
      // closing a sign's dialogue hands control back
      if (!s.dialogue && prev.dialogue) this.player.hold(0);
    });
    this.time.delayedCall(400, () => this.startLesson("move"));
    this.setFrozen(shouldFreeze(st));
    if (st.screen === "title" || st.screen === "intro") this.attractMode(entRoom);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsub?.();
      this.enemies.forEach((e) => e.destroy());
      this.enemies = [];
      this.boomerang?.destroy();
      this.grapple?.destroy();
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
        row.push(this.add.image(x * TILE, y * TILE, `tiles-${this.meta.tileset}`, frames[y][x]).setOrigin(0).setDepth(-1000));
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
      // open top doorways get an empty arch (already-unlocked doors are drawn as arches too)
      if (this.textures.exists("archway")) {
        for (let tx = 1; tx < ROOM_W - 2; tx++) {
          const ax = room.gx * ROOM_W + tx, ay = room.gy * ROOM_H + 2;
          const open = (t: number) => !this.dungeon.isWall(t, ay) && !this.dungeon.isWall(t, ay - 1) && !this.dungeon.isWall(t, ay - 2);
          // a 2-wide corridor through the top wall: floor at ax..ax+1, wall either side
          if (!open(ax) || !open(ax + 1) || !this.dungeon.isWall(ax - 1, ay) || !this.dungeon.isWall(ax + 2, ay)) continue;
          const hasDoor = room.placements.some((p) => (p.kind === "door-locked" || p.kind === "door-boss") && p.ty === ay && p.tx === ax && !st.hasFlag(`door:${room.id}:${p.kind}:0`));
          const wasCracked = room.placements.some((p) => p.kind === "wall-cracked" && p.tx === ax);
          if (hasDoor || wasCracked) continue;
          const x = ax * TILE, y = (ay - 1) * TILE;
          this.add.image(x, y, "archway").setOrigin(0).setDepth(y + 48);
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
    sfx("crack");
    useGame.getState().setFlag(c.id);
    for (const t of c.tiles) this.dungeon.setTile(t.tx, t.ty, ".");
    const mid = c.tiles[Math.floor(c.tiles.length / 2)];
    this.retileAround(mid.tx, mid.ty, 4);
    this.rebuildWalls();
    this.tweens.add({ targets: c.decal, alpha: 0, y: "+=6", duration: 200, onComplete: () => c.decal.destroy() });
    this.puff(c.cx, c.cy, 0x9a8a72, 18);
    this.shake(120, 0.006);
    // a passage cracked from both sides: the neighbour room's half goes too
    for (const o of [...this.cracks]) {
      const touches = o.tiles.some((a) => c.tiles.some((b) => Math.abs(a.tx - b.tx) <= 1 && Math.abs(a.ty - b.ty) <= 1));
      if (touches) this.breakCrack(o);
    }
  }

  // ------------------------------------------------------------------ rooms

  private clearRoomStuff() {
    // situational lessons don't follow her out of the room; they re-trigger where they apply
    const l = useGame.getState().lesson;
    if (l && (l.id === "attack" || l.id === "bomb" || l.id === "potion")) useGame.getState().setLesson(null);
    this.pendingLessons = this.pendingLessons.filter((id) => id !== "attack" && id !== "bomb" && id !== "potion");
    useGame.getState().setNarration(null);
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.boss = undefined;
    for (const o of this.roomStuff) o.destroy();
    this.roomStuff = [];
    this.solids.clear(true, true);
    this.waterGroup.clear(true, true);
    this.water = [];
    this.anchors = [];
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
    this.grapple?.destroy();
    this.grapple = undefined;
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
    const bossKind = this.meta.boss;
    const bossHere = (room.objects ?? []).some((o) => o.kind === bossKind) && !st.hasFlag(`boss:${this.dungeon.def.id}`);
    const drained = room.solveReward === "drain" && solved;
    if (!bossHere) {
      st.showBanner({ kind: "room", title: room.name, sub: room.sub ?? this.dungeon.def.name });
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
          // warm halo that breathes
          const halo = this.add.image(x + 16, y + 6, "halo").setDepth(y + 19).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setScale(1.6);
          this.roomStuff.push(halo);
          this.tweens.add({ targets: halo, alpha: 0.35, scale: 1.45, duration: 160 + Math.random() * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          break;
        }
        case "stump":
          this.addSolidProp("stump", p);
          break;
        case "sarcophagus": {
          const img = this.add.image(x, y - 16, "sarcophagus").setOrigin(0).setDepth(y + 32);
          this.roomStuff.push(img);
          this.solids.add(this.add.zone(x + 16, y + 20, 28, 22));
          this.solidTiles.add(`${p.tx},${p.ty}`);
          break;
        }
        case "bones":
          this.roomStuff.push(this.add.image(x, y, "bones").setOrigin(0).setDepth(-998).setAlpha(0.9));
          break;
        case "anchor": {
          const img = this.add.image(x, y - 16, "anchor").setOrigin(0).setDepth(y + 32);
          this.roomStuff.push(img);
          this.solids.add(this.add.zone(x + 16, y + 22, 26, 18));
          this.solidTiles.add(`${p.tx},${p.ty}`);
          const zone = this.add.zone(x + 16, y + 6, 30, 40);
          this.physics.add.existing(zone, true);
          this.roomStuff.push(zone);
          this.anchors.push({ x: x + 16, y: y + 10, zone });
          break;
        }
        case "water": {
          if (drained) break;
          const spr = this.add.sprite(x, y, "water-loop-0").setOrigin(0).setDepth(-998);
          if (this.anims.exists("water-loop")) spr.play({ key: "water-loop", startFrame: (p.tx + p.ty) % 4 });
          this.roomStuff.push(spr);
          const zone = this.add.zone(x + 16, y + 16, 32, 32);
          this.waterGroup.add(zone);
          this.water.push({ sprite: spr, zone });
          break;
        }
        case "pit": {
          this.roomStuff.push(this.add.image(x, y, "pit-tile").setOrigin(0).setDepth(-998));
          this.waterGroup.add(this.add.zone(x + 16, y + 16, 32, 32));
          break;
        }
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
        case "skeleton":
        case "bat":
        case "blueslime":
        case "captain":
          // every room stays cleared once you've cleared it (saved), not just the reward rooms
          if (!cleared) spawns.push({ kind: p.kind, x: x + 16, y: y + 30 });
          break;
      }
    }
    // a key earned earlier but never picked up waits mid-room when the map gives it no spot
    if (cleared && room.clearReward === "key" && !st.hasFlag(`key:${room.id}`) && !room.placements.some((p) => p.kind === "key-drop")) this.spawnPickup("key", room.x + room.w / 2, room.y + room.h * 0.6);
    // the water's edge: a pale rim where floor meets water, so the fence reads
    if (this.water.length) this.drawWaterRims(room);
    if (spawns.length) {
      this.time.delayedCall(spawnAt, () => {
        if (this.room !== room) return;
        for (const sp of spawns) this.spawnEnemy(sp.kind, sp.x, sp.y, { puff: true });
        // the strike lesson only when something will actually come at her (mushrooms just sit there)
        if (spawns.some((sp) => sp.kind !== "mushroom")) this.startLesson("attack");
      });
    }
    // consumables unlock where they first matter: potions in the first fight, bombs by the cracked wall
    for (const [k, rid] of Object.entries(this.meta.unlocks)) if (room.id === rid && !st.hasFlag(`unlock:${k}`)) st.setFlag(`unlock:${k}`);
    // the room's lore, read aloud once, after the plate has gone (signs stay bumpable for a re-read)
    const lore = room.signs?.[0];
    if (lore && !st.hasFlag(`narrated:${room.id}`) && !bossHere) {
      st.setFlag(`narrated:${room.id}`);
      this.time.delayedCall(spawnAt + 700, () => {
        if (this.room !== room) return;
        useGame.getState().setNarration(lore);
        this.time.delayedCall(6500, () => useGame.getState().narration === lore && useGame.getState().setNarration(null));
      });
    }
    // puzzle targets pulse once so the eye finds them
    for (const pl of this.plates) if (!solved) this.tweens.add({ targets: pl.image, scaleX: 1.12, scaleY: 1.12, duration: 260, yoyo: true, repeat: 2, delay: spawnAt });
    if (this.cracks.some((c) => c.tiles.some((t) => this.dungeon.roomAtWorld(t.tx * TILE, t.ty * TILE) === room))) this.time.delayedCall(spawnAt + 200, () => this.room === room && this.startLesson("bomb"));
    // free-placed objects (the boss)
    for (const o of room.objects ?? []) {
      if (o.kind === bossKind && bossHere) {
        this.boss = this.spawnEnemy(bossKind, room.x + o.x * TILE, room.y + o.y * TILE);
        if (this.boss) this.bossIntro(room, this.boss);
      } else if (o.kind === bossKind && st.hasFlag(`boss:${this.dungeon.def.id}`) && !st.hasFlag(`shard:${this.dungeon.def.id}`)) {
        this.spawnPickup("shard", room.x + o.x * TILE, room.y + o.y * TILE);
      }
    }
    if (!this.boss) st.setBoss(null);
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
    this.shake(60, 0.002);
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
      case "blueslime":
        e = new Slime(this, this.enemyGroup, x, y, opts.fromSplit ? { hp: 1, scale: 0.7, bounty: 1, texture: "blueslime" } : { texture: "blueslime", hp: 3, bounty: 4 });
        break;
      case "skeleton":
        e = new Skeleton(this, this.enemyGroup, x, y);
        break;
      case "captain":
        e = new Skeleton(this, this.enemyGroup, x, y, { captain: true });
        break;
      case "bat":
        e = new ForestSprite(this, this.enemyGroup, x, y, "bat");
        break;
      case "boneknight":
        e = new BoneKnight(this, this.enemyGroup, x, y);
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
    sfx(kind === "key" ? "key" : kind === "shard" ? "victory" : "heart");
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
        st.showBanner({ kind: "item", title: "Ember Shard", sub: this.meta.cleansed, icon: "shard" });
        this.player.hold(3200);
        this.time.delayedCall(2600, () => {
          const g = useGame.getState();
          if (g.banner?.kind === "item") g.showBanner(null);
          g.completeDungeon();
        });
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
    this.physics.add.collider(p, this.waterGroup);
    this.physics.add.collider(this.enemyGroup, this.waterGroup, undefined, (obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy | undefined;
      return !e?.swims;
    });
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
    const blocked = e.blocksNow;
    const dmg = useGame.getState().swordTier;
    const died = e.takeHit(this.player.sprite.x, this.player.sprite.y, dmg);
    sfx(blocked ? "clang" : "hit");
    this.finishLesson("attack");
    // feedback bundle: hit-stop, shake, damage number (flash + knockback are in takeHit)
    this.shake(80, 0.004);
    this.hitStop(60);
    if (!blocked) this.damageNumber(s.x, s.y - s.displayHeight, dmg);
    if (e.isBoss && !died) {
      const b = useGame.getState().boss;
      if (b) useGame.getState().setBoss({ ...b, hp: Math.max(0, e.hp) });
    }
    if (died) this.onEnemyDied(e);
  }

  private onEnemyDied(e: Enemy) {
    this.enemies = this.enemies.filter((x) => x !== e);
    sfx(e instanceof ForestSprite ? "sprite" : e instanceof Skeleton ? "bones" : "slime");
    const st = useGame.getState();
    st.addGold(e.bounty);
    if (!e.isBoss && Math.random() < 0.2 && st.hearts < st.maxHearts) this.spawnPickup("heart", e.sprite.x, e.sprite.y);
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
      else if (room.clearReward === "key") this.spawnPickup("key", room.x + room.w / 2, room.y + room.h * 0.6);
      else if (room.clearReward) this.revealHiddenChest(room.clearReward);
    });
  }

  private solveRoom() {
    const room = this.room;
    const st = useGame.getState();
    if (st.hasFlag(`solved:${room.id}`)) return;
    st.setFlag(`solved:${room.id}`);
    this.shake(80, 0.003);
    if (room.solveReward === "drain") return this.drainRoom();
    this.time.delayedCall(300, () => this.room === room && room.solveReward && this.revealHiddenChest(room.solveReward));
  }

  /** The rune plate: the standing water sinks away and the room's fence with it. */
  private drainRoom() {
    const room = this.room;
    sfx("drain");
    this.time.delayedCall(200, () => {
      if (this.room !== room) return;
      this.shake(900, 0.003);
      for (const [i, w] of this.water.entries()) {
        this.tweens.add({ targets: w.sprite, alpha: 0, duration: 700, delay: 200 + (i % 7) * 60, ease: "Quad.easeIn", onComplete: () => w.sprite.destroy() });
      }
      for (const r of this.waterRims) this.tweens.add({ targets: r, alpha: 0, duration: 600, delay: 300 });
      this.time.delayedCall(950, () => {
        if (this.room !== room) return;
        this.waterGroup.clear(true, true);
        this.water = [];
        useGame.getState().setNarration("The water sinks into the stone. The way is open.");
        this.time.delayedCall(3200, () => useGame.getState().narration?.startsWith("The water sinks") && useGame.getState().setNarration(null));
      });
    });
  }

  private waterRims: Phaser.GameObjects.Rectangle[] = [];
  /** A thin pale rim on every floor edge of the water, so the tile fence reads as a shoreline. */
  private drawWaterRims(room: Room) {
    this.waterRims = [];
    const isWater = (tx: number, ty: number) => this.dungeon.kindAt(tx, ty) === "water";
    for (const p of room.placements) {
      if (p.kind !== "water") continue;
      const x = p.tx * TILE, y = p.ty * TILE;
      const edges: [boolean, number, number, number, number][] = [
        [!isWater(p.tx, p.ty - 1) && !this.dungeon.isWall(p.tx, p.ty - 1), x, y, TILE, 2],
        [!isWater(p.tx, p.ty + 1) && !this.dungeon.isWall(p.tx, p.ty + 1), x, y + TILE - 2, TILE, 2],
        [!isWater(p.tx - 1, p.ty) && !this.dungeon.isWall(p.tx - 1, p.ty), x, y, 2, TILE],
        [!isWater(p.tx + 1, p.ty) && !this.dungeon.isWall(p.tx + 1, p.ty), x + TILE - 2, y, 2, TILE],
      ];
      for (const [on, rx, ry, rw, rh] of edges) {
        if (!on) continue;
        const r = this.add.rectangle(rx, ry, rw, rh, 0x7aa8b8, 0.55).setOrigin(0).setDepth(-997);
        this.roomStuff.push(r);
        this.waterRims.push(r);
      }
    }
  }

  /** Rune plates with no block to push: Wren standing on one is enough. */
  private checkPlates() {
    if (!this.plates.length || this.blocks.length) return;
    const room = this.room;
    if (useGame.getState().hasFlag(`solved:${room.id}`)) return;
    const p = this.player.sprite;
    const tx = Math.floor(p.x / TILE), ty = Math.floor((p.y - 4) / TILE);
    const plate = this.plates.find((pl) => pl.tx === tx && pl.ty === ty);
    if (!plate) return;
    sfx("plate");
    plate.image.setTint(0x9adf9a);
    this.tweens.add({ targets: plate.image, scaleX: 0.9, scaleY: 0.9, duration: 80, yoyo: true });
    this.puff(plate.image.x + 16, plate.image.y + 16, 0x9adf9a, 10);
    this.solveRoom();
  }

  /** Camera shake scaled by the player's setting (Off / Low / Full). */
  shake(ms: number, intensity: number) {
    const k = useGame.getState().settings.shake;
    if (k > 0) this.cameras.main.shake(ms, intensity * k);
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
  private bossIntro(room: Room, t: Enemy) {
    const st = useGame.getState();
    const cam = this.cameras.main;
    const s = t.sprite;
    const info = BOSSES[this.meta.boss];
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
        s.setTint(info.flash === 0xffb060 ? 0x7a3a00 : 0x203a60).setTintMode(Phaser.TintModes.ADD);
        this.puff(s.x, s.y - 40, info.flash, 6 + i * 4);
        this.time.delayedCall(90, () => !t.isDead && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
      });
    }
    this.time.delayedCall(2100, () => {
      sfx("roar");
      cam.shake(420, 0.012);
      // the name plate lands mid-screen, then rides up and becomes the health bar
      useGame.getState().setBoss({ name: info.name, sub: info.sub, hp: info.hp, max: info.hp, status: "", intro: true });
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
      const b = useGame.getState().boss;
      useGame.getState().setBoss({ ...(b ?? { name: info.name, sub: info.sub, hp: info.hp, max: info.hp, status: "" }), intro: false });
      this.setAnchor("boss", s.x, s.y - 62);
    });
  }

  /** Root spikes rise in the boss room's south doorway and block it. */
  private sealDoorway(room: Room) {
    this.unsealDoorway();
    this.shake(200, 0.006);
    const slabs = this.meta.id === "crypt";
    for (const tx of [9, 10]) {
      const x = room.x + tx * TILE + 16;
      const y = room.y + 11 * TILE + 30;
      const img = this.add.image(x, y, slabs ? "block" : "root").setOrigin(0.5, 1).setDepth(y).setScale(1, 0.1);
      if (slabs) img.setTint(0x8a90a0);
      this.tweens.add({ targets: img, scaleY: 1.1, duration: 220, ease: "Back.easeOut", delay: (tx - 9) * 80 });
      this.puff(x, y - 8, slabs ? 0x9aa0b0 : 0x9a8a72, 8);
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
    sfx("phase");
    const st = useGame.getState();
    const text = BOSSES[this.meta.boss].phase2;
    if (st.boss) st.setBoss({ ...st.boss, status: text });
    this.shake(250, 0.008);
    this.time.delayedCall(1600, () => useGame.getState().boss?.status === text && useGame.getState().setBoss({ ...useGame.getState().boss!, status: "" }));
  }

  /** A sword arc drawn where a big swing lands (the Bone Knight's greatsword). */
  slashArc(x: number, y: number, angle: number, radius = 22) {
    const g = this.add.graphics().setDepth(y + 40);
    g.lineStyle(radius > 14 ? 3 : 2, 0xe8ecf4, 0.9);
    g.beginPath();
    g.arc(x, y, radius, angle - 1.1, angle + 1.1, false);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 220, ease: "Quad.easeOut", onComplete: () => g.destroy() });
    sfx("whoosh");
  }

  /** The Bone Knight's shield, hooked off his arm: it skids away, then slides back when he recovers. */
  shieldFlies(x: number, y: number, facing: Phaser.Math.Vector2) {
    // no shield sprite: a dark slab that spins away sells it
    const slab = this.add.rectangle(x + facing.x * 10, y - 22, 12, 20, 0x2a2e3a).setStrokeStyle(2, 0x8a90a0).setDepth(y + 2);
    const p = this.player.sprite;
    this.tweens.add({ targets: slab, x: x + (p.x < x ? -1 : 1) * 60, y: y - 6, angle: 540, duration: 420, ease: "Quad.easeOut" });
    this.tweens.add({ targets: slab, alpha: 0, duration: 300, delay: 1800, onComplete: () => slab.destroy() });
    this.puff(x, y - 24, 0x9aa0b0, 12);
    this.shake(120, 0.005);
  }

  bossStatus(status: "stunned" | "recovered" | "bark") {
    const st = useGame.getState();
    if (!st.boss) return;
    const info = BOSSES[this.meta.boss];
    const hasTool = st.hasItem(this.meta.boss === "treant" ? "boomerang" : "grapple");
    const text = status === "stunned" ? info.stunned : status === "bark" ? info.blocked(hasTool) : "";
    st.setBoss({ ...st.boss, status: text });
    if (status === "bark") this.time.delayedCall(1400, () => useGame.getState().boss?.status === text && useGame.getState().setBoss({ ...useGame.getState().boss!, status: "" }));
    // a pulsing ring on the ember core while it's open to attack
    this.bossRing?.destroy();
    this.bossRing = undefined;
    if (status === "stunned" && this.boss) {
      const t = this.boss.sprite;
      this.bossRing = this.add.circle(t.x, t.y - (this.meta.boss === "treant" ? 40 : 30), 12, 0x000000, 0).setStrokeStyle(2, info.flash, 1).setDepth(t.depth + 1);
      this.tweens.add({ targets: this.bossRing, scale: 1.5, alpha: 0, duration: 700, repeat: -1, ease: "Quad.easeOut" });
    }
  }

  bossDefeated(t: Enemy) {
    const st = useGame.getState();
    st.setFlag(`boss:${this.dungeon.def.id}`);
    st.setFlag(`cleared:${this.room.id}`);
    st.setBoss(null);
    sfx("roar");
    this.time.delayedCall(900, () => sfx("victory"));
    this.shake(500, 0.01);
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
    sfx(door.kind === "boss" ? "boss-door" : "door");
    this.doors = this.doors.filter((d) => d !== door);
    door.zone.destroy();
    const clip = door.kind === "boss" ? "door-boss-open" : "door-locked-open";
    const vertical = door.image.width === door.image.height; // side doors have no swing clip
    door.image.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(80, () => door.image.active && door.image.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    if (!vertical && this.anims.exists(clip)) {
      // swap the still for a sprite that swings open, then leave the empty arch behind
      const spr = this.add.sprite(door.image.x, door.image.y, door.image.texture.key).setOrigin(0).setDepth(door.image.depth);
      door.image.destroy();
      this.time.delayedCall(120, () => {
        spr.play(clip);
        spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          if (this.textures.exists("archway")) spr.setTexture("archway");
          else spr.destroy();
        });
      });
    } else {
      this.tweens.add({ targets: door.image, alpha: 0, y: "-=10", duration: 320, delay: 80, ease: "Quad.easeIn", onComplete: () => door.image.destroy() });
    }
    this.puff(door.image.x + 32, door.image.y + 24, 0xfff2b0, 12);
    this.shake(70, 0.003);
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
    if (id === "grapple" && !st.hasItem("grapple")) return;
    if (id === "bomb" && (!st.hasItem("bomb") || !st.hasFlag("unlock:bomb"))) return;
    if (id === "potion" && (!st.hasItem("potion") || !st.hasFlag("unlock:potion"))) return;
    if (st.lesson) {
      this.pendingLessons.push(id);
      return;
    }
    st.setLesson({ id, keys: id === "move" ? ["W", "A", "S", "D"] : undefined });
    sfx("lesson");
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
      useGame.getState().setDialogue({ title: this.meta.signTitle, text: s.text });
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
    sfx("chest");
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
        banner = { title: "Boss Key", sub: this.meta.bossKeyHint, icon: "bosskey" };
        break;
      case "potion":
        st.giveItem("potion");
        banner = { title: "Potion", icon: "potion" };
        break;
      case "grapple":
        st.giveItem("grapple");
        banner = { title: "Grapple Hook", sub: "Right-click to fire. Hooks anchor posts and pulls you over; hooks foes and pulls them in.", icon: "grapple" };
        this.time.delayedCall(2600, () => this.startLesson("grapple"));
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
      this.dungeon.kindAt(tx, ty) === "water" ||
      this.dungeon.kindAt(tx, ty) === "pit" ||
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
    sfx("block");
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
          sfx("plate");
          plate.image.setTint(0x9adf9a);
          this.shake(60, 0.002);
          this.solveRoom();
        }
      },
    });
  }

  // ------------------------------------------------------------------ tools

  swapTool() {
    const st = useGame.getState();
    const owned = (["boomerang", "grapple"] as const).filter((t) => st.hasItem(t));
    if (owned.length < 2) return;
    const next = owned[(owned.indexOf(st.tool) + 1) % owned.length];
    st.setTool(next);
    sfx("ui");
    this.toast(`icon-${next}`, next === "grapple" ? "Grapple hook in hand" : "Boomerang in hand");
  }

  /** RMB: whichever tool is in hand. */
  throwBoomerang(dir: Phaser.Math.Vector2) {
    if (useGame.getState().tool === "grapple") return this.fireGrapple(dir);
    return this.throwBoomerangReal(dir);
  }

  private fireGrapple(dir: Phaser.Math.Vector2) {
    if (this.grapple && !this.grapple.done) return false;
    const p = this.player.sprite;
    this.grapple = new Grapple(this, p.x + dir.x * 12, p.y - 14 + dir.y * 12, dir);
    sfx("whoosh");
    this.finishLesson("grapple");
    const g = this.grapple;
    this.physics.add.collider(g.sprite, this.walls);
    this.physics.add.overlap(g.sprite, this.enemyGroup, (_h, obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy;
      if (!e || e.isDead || !g.flying || !g.canHit(e)) return;
      g.latchEnemy(e);
      this.hitStop(30);
    });
    for (const a of this.anchors) {
      this.physics.add.overlap(g.sprite, a.zone, () => {
        if (!g.flying) return;
        g.latchAnchor(a.x, a.y);
        this.puff(a.x, a.y - 6, 0xc8d0e0, 8);
      });
    }
    return true;
  }

  private throwBoomerangReal(dir: Phaser.Math.Vector2) {
    if (this.boomerang && !this.boomerang.done) return false;
    const p = this.player.sprite;
    this.boomerang = new Boomerang(this, p.x + dir.x * 10, p.y - 16 + dir.y * 10, dir);
    sfx("whoosh");
    this.finishLesson("throw");
    this.physics.add.collider(this.boomerang.sprite, this.walls);
    this.physics.add.overlap(this.boomerang.sprite, this.enemyGroup, (_b, obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy;
      if (!e || e.isDead || !this.boomerang?.canHit(e)) return;
      e.boomerangHit();
      sfx("stun");
      this.hitStop(30);
      if (e.isDead) this.onEnemyDied(e);
      else if (!e.isBoss) this.boomerang.turnBack();
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
        sfx("crystal");
        c.image.setTint(0xffb060);
        this.tweens.add({ targets: c.image, scaleX: 1.2, scaleY: 0.85, duration: 70, yoyo: true });
        this.puff(c.image.x + 16, c.image.y + 10, 0xffd090, 12);
        this.boomerang.turnBack();
        this.solveRoom();
      });
    }
    return true;
  }

  /** Wren just took damage: the potion lesson fires the first time it would help. */
  onPlayerHurt() {
    const st = useGame.getState();
    if (st.hasFlag("unlock:potion") && st.hearts > 0 && st.hearts < st.maxHearts) this.startLesson("potion");
  }

  placeBomb() {
    const st = useGame.getState();
    if (!st.hasFlag("unlock:bomb")) {
      this.toast("icon-bomb", "Nothing here needs a bomb yet", true);
      return false;
    }
    if (!st.useItem("bomb")) return false;
    const p = this.player.sprite;
    this.bombs.push(new Bomb(this, p.x, p.y + 2));
    sfx("bomb-place");
    this.finishLesson("bomb");
    return true;
  }

  drinkPotion() {
    const st = useGame.getState();
    if (!st.hasFlag("unlock:potion")) {
      this.toast("icon-potion", "Save it for a real fight", true);
      return false;
    }
    if (st.hearts >= st.maxHearts) {
      this.toast("icon-potion", "Already full", true);
      return false;
    }
    if (!st.useItem("potion")) return false;
    st.heal(6);
    sfx("potion");
    this.finishLesson("potion");
    this.puff(this.player.sprite.x, this.player.sprite.y - 20, 0xff8090, 10);
    return true;
  }

  onExplosion(x: number, y: number, r: number) {
    sfx("bomb");
    this.shake(180, 0.008);
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
    // a sealed boss room keeps her in: a charge or a shove can push the body through the seal zones
    // in one physics step (enemy separation runs after the static one), so clamp instead of scrolling
    if (this.sealRoots.length) {
      const nx = Phaser.Math.Clamp(p.x, r.x + 12, r.x + r.w - 12), ny = Phaser.Math.Clamp(p.y, r.y + 3 * TILE + 8, r.y + r.h - 8);
      if (nx !== p.x || ny !== p.y) {
        p.setPosition(nx, ny);
        (p.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
      }
      return;
    }
    let dir: Dir | null = null;
    if (p.x < r.x) dir = "west";
    else if (p.x > r.x + r.w) dir = "east";
    else if (p.y - 10 < r.y) dir = "north";
    else if (p.y - 10 > r.y + r.h) dir = "south";
    // the entrance sits on the world's bottom edge, so the body stops there: read the doorway columns instead
    if (!dir && r.id === this.dungeon.def.entrance.room && p.y >= r.y + r.h - 2 && Math.abs(p.x - (r.x + r.w / 2)) < 30) dir = "south";
    if (!dir) return;
    const { dx, dy } = DIRS[dir];
    const next = this.dungeon.roomAt(r.gx + dx, r.gy + dy);
    if (!next) {
      // the entrance's south doorway leads home
      if (dir === "south" && r.id === this.dungeon.def.entrance.room) this.leaveForTown();
      return;
    }
    this.startTransition(next, dir);
  }

  private startTransition(next: Room, dir: Dir) {
    this.transitioning = true;
    const { dx, dy } = DIRS[dir];
    const p = this.player.sprite;
    this.player.hold(99999);
    p.setVelocity(0, 0);
    (p.body as Phaser.Physics.Arcade.Body).enable = false;
    this.player.walkScripted(dir);
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
        this.player.walkScripted(null);
        this.enterRoom(next);
        this.player.hold(this.introHold); // a boss intro may have asked to keep her still
        this.introHold = 0;
        this.player.grace(700);
        this.transitioning = false;
      },
    });
  }

  /** Title screen: Wren waits at the entrance while the camera drifts and embers rise. Ends with the restart on New game. */
  private attractMode(room: Room) {
    this.player.hold(99999);
    const cam = this.cameras.main;
    cam.setZoom(1.15);
    cam.centerOn(room.x + 300, room.y + 200);
    this.tweens.add({ targets: cam, scrollX: cam.scrollX + 70, scrollY: cam.scrollY + 26, duration: 11000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const embers = this.add.particles(0, 0, "spore", {
      x: { min: room.x + 16, max: room.x + room.w - 16 },
      y: room.y + room.h - 20,
      lifespan: { min: 4500, max: 7500 },
      speedY: { min: -14, max: -34 },
      speedX: { min: -8, max: 8 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xd1541f, 0xe8763a, 0xffb060, 0xfff2b0],
      frequency: 110,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(5000);
    this.roomStuff.push(embers);
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

  private leaveForTown() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.hold(99999);
    this.player.sprite.setVelocity(0, 0);
    this.player.walkScripted("south");
    sfx("door");
    useGame.getState().setPlace("hub");
    this.cameras.main.fadeOut(450, 8, 10, 8);
    this.tweens.add({ targets: this.player.sprite, y: this.player.sprite.y + 30, duration: 500 });
    this.time.delayedCall(520, () => this.scene.start("Hub", { from: this.meta.gate }));
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
      this.grapple?.update(p.x, p.y - 14);
      if (this.grapple?.done) this.grapple = undefined;
      this.checkPlates();
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
