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
import { FireBolt } from "../entities/FireBolt";
import { CinderGolem, CINDERGOLEM_HP } from "../entities/CinderGolem";
import { Bomb } from "../entities/Bomb";
import { HERO } from "../entities/heroAssets";
import { useGame, type ItemId, type LessonId } from "../../ui/store";
import { DUNGEONS, dungeonFor, type DungeonMeta } from "../data/dungeons";
import { sfx, setAmbient, speak } from "../audio";
import { preloadPropAtlas, registerPropAtlas } from "../propAtlas";
import { setMusic } from "../music";
import { GuideDrawer, announceQuest, questStateOf } from "../guide";
import { questStep, thingTile } from "../quests";

type Dir = "north" | "south" | "east" | "west";

/** clip name -> frame count. "-loop" suffix loops. */
const ENEMY_CLIPS: Record<string, number> = { "slime-hop-loop": 6, "slime-splat": 6, "blueslime-hop-loop": 6, "blueslime-splat": 6, "magmaslime-hop-loop": 6, "magmaslime-splat": 6, "sprite-hover-loop": 6, "mushroom-spore": 8, "door-locked-open": 6, "door-boss-open": 6, "water-loop": 4, "lava-loop": 4 };
const ENEMY_FPS: Record<string, number> = { "slime-hop-loop": 9, "slime-splat": 14, "blueslime-hop-loop": 9, "blueslime-splat": 14, "magmaslime-hop-loop": 9, "magmaslime-splat": 14, "sprite-hover-loop": 12, "mushroom-spore": 7.3, "door-locked-open": 10, "door-boss-open": 8, "water-loop": 2.5, "lava-loop": 3 };
/** Boss plate text + HP per boss object kind. */
const BOSSES: Record<string, { name: string; sub: string; hp: number; flash: number; phase2: string; blocked: (hasTool: boolean) => string; stunned: string; opening: string; guarded: string }> = {
  treant: { name: "ELDER TREANT", sub: "Warden of the Hollow", hp: TREANT_HP, flash: 0xffb060, phase2: "IT DIGS IN DEEPER", blocked: (t) => (t ? "Bark shrugs off steel - ring the core when it opens" : "Bark shrugs off steel"), stunned: "STUNNED - STRIKE THE CORE", opening: "THE CORE SHOWS - RING IT", guarded: "The bark is shut - wait for the slam" },
  boneknight: { name: "BONE KNIGHT", sub: "Captain of the Drowned", hp: BONEKNIGHT_HP, flash: 0x9ad0ff, phase2: "HE QUICKENS", blocked: (t) => (t ? "The shield takes it - hook it when his arm drops" : "The shield takes it - get behind him"), stunned: "SHIELD DOWN - STRIKE", opening: "HIS ARM DROPS - HOOK THE SHIELD", guarded: "The hook glances off - wait for his swing" },
  cindergolem: { name: "CINDER GOLEM", sub: "Heart of the Cinder", hp: CINDERGOLEM_HP, flash: 0xff9a4a, phase2: "THE CRUST SPLITS", blocked: (t) => (t ? "The crust drinks steel - fire its back" : "The crust drinks steel"), stunned: "IT GLOWS - STRIKE", opening: "", guarded: "The vent is on its back" },
};
const DIRS: Record<Dir, { dx: number; dy: number }> = { north: { dx: 0, dy: -1 }, south: { dx: 0, dy: 1 }, east: { dx: 1, dy: 0 }, west: { dx: -1, dy: 0 } };

interface Door {
  id: string;
  kind: "locked" | "boss";
  image: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
  vertical: boolean;
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
  private bolts: FireBolt[] = [];
  private vents: { x: number; y: number; img: Phaser.GameObjects.Image; em: Phaser.GameObjects.Particles.ParticleEmitter; glow: Phaser.GameObjects.Image }[] = [];
  private braziers: { x: number; y: number; zone: Phaser.GameObjects.Zone; img: Phaser.GameObjects.Image; lit: boolean; flame?: Phaser.GameObjects.Particles.ParticleEmitter }[] = [];
  private thorns?: { img: Phaser.GameObjects.Image; zone: Phaser.GameObjects.Zone; cx: number; cy: number; flag: string };
  private firePuddles: { x: number; y: number; until: number; img: Phaser.GameObjects.Image }[] = [];
  private guide?: GuideDrawer;
  private createdAt = 0;
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
    preloadPropAtlas(this);
    // every dungeon's tileset: the scene is restarted (not re-created) when the place changes
    for (const m of Object.values(DUNGEONS)) {
      this.load.spritesheet(`tiles-${m.tileset}`, `assets/tiles/${m.tileset}.png`, { frameWidth: TILE, frameHeight: TILE });
      this.load.json(`tiles-meta-${m.tileset}`, `assets/tiles/${m.tileset}.json`);
    }
    for (const p of ["door", "torch", "block", "chest", "chest-open", "slime", "blueslime", "sprite", "mushroom", "treant", "root", "door-locked", "door-locked-w", "door-locked-e", "door-boss", "door-boss-w", "door-boss-e", "stump", "crystal", "plate", "crack", "heart-container", "signpost", "bomb", "boomerang", "archway", "skeleton", "bat", "boneknight", "boneknight-noshield", "shield-ground", "sarcophagus", "bones", "anchor", "pit-tile", "hook", "stone", "decor-leaves", "decor-tuft", "decor-shrooms", "decor-puddle", "decor-moss", "decor-rubble", "decor-puddle-dark", "decor-candle", "cinderling", "cindergolem", "magmaslime", "firebat", "brazier", "thorns", "vent", "slag"]) {
      // the atlas carries all of these (tools/pack_props.py); a prop missing from it renders as the green box
      void p;
    }
    for (const i of ["key", "boomerang", "bomb", "shard", "potion", "coin", "bosskey", "grapple", "firerod"]) if (!this.textures.exists(`icon-${i}`)) this.load.image(`icon-${i}`, `assets/ui/icons/${i}.png`);
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
    this.bolts = [];
    this.vents = [];
    this.braziers = [];
    this.thorns = undefined;
    this.firePuddles = [];
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
    // first thing: the canvas fades in even if something below throws (a black square hides every clue)
    this.game.canvas.classList.add("ready");
    registerPropAtlas(this);
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
    setAmbient(this.meta.id === "crypt" ? "crypt" : this.meta.id === "cinder" ? "cinder" : "whisperwood");
    if (useGame.getState().screen === "game") this.cameras.main.fadeIn(400, 8, 10, 8);
    this.wireCollisions();
    this.guide = new GuideDrawer(this);
    this.createdAt = this.time.now;
    this.enterRoom(entRoom, true);

    // React panels freeze the world while open. Not scene.pause(): in Phaser 4
    // that stops rendering too and the canvas clears to black.
    // the title/intro screens keep the world alive behind them (attract mode); only the menus freeze it
    const shouldFreeze = (s: ReturnType<typeof useGame.getState>) => s.bagOpen || s.journalOpen || s.paused || !!s.shop || s.screen === "dead" || s.screen === "complete";
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
      this.guide?.destroy();
      useGame.getState().setGuide(null);
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
            // the front door turned to face into the room (the Zelda way): arch toward the floor
            const x = a.tx * TILE, y = a.ty * TILE;
            const westWall = a.tx % ROOM_W === 0;
            image = this.add.image(x - 8, y, `${kind}-${westWall ? "w" : "e"}`).setOrigin(0).setDepth(y + 64);
            zone = this.add.zone(x + 16, y + 32, 34, 64);
          } else {
            const x = a.tx * TILE, y = (a.ty - 1) * TILE;
            image = this.add.image(x, y, kind).setOrigin(0).setDepth(y + 48);
            zone = this.add.zone(x + 32, y + 36, 64, 40);
          }
          zone.setData("door", id);
          this.doorGroup.add(zone);
          this.doors.push({ id, kind: kind === "door-boss" ? "boss" : "locked", image, zone, vertical });
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
    if (l && (l.id === "attack" || l.id === "potion")) useGame.getState().setLesson(null);
    this.pendingLessons = this.pendingLessons.filter((id) => id !== "attack" && id !== "potion");
    useGame.getState().setNarration(null);
    useGame.getState().setQuestNote(null);
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
    for (const b of this.bolts) b.destroy();
    this.bolts = [];
    for (const v of this.vents) v.em.destroy();
    this.vents = [];
    for (const b of this.braziers) b.flame?.destroy();
    this.braziers = [];
    this.thorns = undefined;
    for (const f of this.firePuddles) f.img.destroy();
    this.firePuddles = [];
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
          const zone = this.fenceZone(p.tx, p.ty);
          this.waterGroup.add(zone);
          this.water.push({ sprite: spr, zone });
          break;
        }
        case "pit": {
          this.roomStuff.push(this.add.image(x, y, "pit-tile").setOrigin(0).setDepth(-998));
          this.waterGroup.add(this.fenceZone(p.tx, p.ty));
          break;
        }
        case "lava": {
          // molten until the room's plate cools it to slag; fire bats and magma slimes cross it
          if (drained) {
            this.roomStuff.push(this.add.image(x, y, "slag").setOrigin(0).setDepth(-998));
            break;
          }
          const spr = this.add.sprite(x, y, "lava-loop-0").setOrigin(0).setDepth(-998);
          if (this.anims.exists("lava-loop")) spr.play({ key: "lava-loop", startFrame: (p.tx * 3 + p.ty) % 4 });
          this.roomStuff.push(spr);
          const zone = this.fenceZone(p.tx, p.ty);
          this.waterGroup.add(zone);
          this.water.push({ sprite: spr, zone });
          break;
        }
        case "vent": {
          const img = this.add.image(x, y, "vent").setOrigin(0).setDepth(-997);
          this.roomStuff.push(img);
          const em = this.add.particles(x + 16, y + 10, "spore", {
            speedY: { min: -140, max: -80 }, speedX: { min: -14, max: 14 }, lifespan: { min: 220, max: 420 }, scale: { start: 1.1, end: 0 },
            tint: [0xff6a2a, 0xffa040, 0xffe08a], alpha: { start: 0.95, end: 0 }, frequency: 14, blendMode: Phaser.BlendModes.ADD, emitting: false,
          }).setDepth(y + 40);
          this.roomStuff.push(em);
          // the mouth's glow on the floor: a faint ember at rest, swelling through the warning, blazing with the flame
          const glow = this.add.image(x + 16, y + 16, "halo").setTint(0xff6a20).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.1).setScale(1.2).setDepth(-998);
          this.roomStuff.push(glow);
          this.vents.push({ x: x + 16, y: y + 16, img, em, glow });
          break;
        }
        case "brazier": {
          const img = this.add.image(x, y - 16, "brazier").setOrigin(0).setDepth(y + 32);
          this.roomStuff.push(img);
          this.solids.add(this.add.zone(x + 16, y + 22, 26, 18));
          this.solidTiles.add(`${p.tx},${p.ty}`);
          const zone = this.add.zone(x + 16, y + 4, 30, 40);
          this.physics.add.existing(zone, true);
          this.roomStuff.push(zone);
          const b = { x: x + 16, y: y - 6, zone, img, lit: solved, flame: undefined as Phaser.GameObjects.Particles.ParticleEmitter | undefined };
          this.braziers.push(b);
          if (solved) this.lightBrazier(b, true);
          break;
        }
        case "thorns": {
          if (p.index !== 0 || st.hasFlag(`thorns:${room.id}`)) break;
          const img = this.add.image(x, y - 4, "thorns").setOrigin(0).setDepth(y + 28);
          this.roomStuff.push(img);
          const zone = this.add.zone(x + 32, y + 12, 64, 26);
          this.solids.add(zone);
          this.thorns = { img, zone, cx: x + 32, cy: y + 12, flag: `thorns:${room.id}` };
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
        case "magmaslime":
        case "firebat":
        case "cinderling":
          // every room stays cleared once you've cleared it (saved), not just the reward rooms;
          // mushrooms are plants and grow back (Maren's caps depend on it)
          if (!cleared || p.kind === "mushroom") spawns.push({ kind: p.kind, x: x + 16, y: y + 30 });
          break;
      }
    }
    this.scatterDecor(room);
    // a key earned earlier but never picked up waits mid-room when the map gives it no spot
    if (cleared && room.clearReward === "key" && !st.hasFlag(`key:${room.id}`) && !room.placements.some((p) => p.kind === "key-drop")) this.spawnPickup("key", room.x + room.w / 2, room.y + room.h * 0.6);
    // the water's edge: a pale rim where floor meets water, so the fence reads
    if (this.water.length) this.drawWaterRims(room);
    if (!bossHere && st.screen === "game") setMusic(spawns.some((sp) => sp.kind !== "mushroom") ? "fight" : "explore");
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

  /**
   * Floor dressing: leaves, tufts, moss, rubble on empty floor tiles, seeded by the room so it's
   * the same every visit. Never on doorway lanes or on a tile something else uses; never solid.
   */
  private scatterDecor(room: Room) {
    const set = this.meta.decor.filter((t) => this.textures.exists(t));
    if (!set.length) return;
    let seed = 0;
    for (const ch of room.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const used = new Set(room.placements.map((p) => `${p.tx - room.gx * ROOM_W},${p.ty - room.gy * ROOM_H}`));
    if (room.purpose === "boss") return this.dressBossHall(room, set, rnd, used);
    const taken: { x: number; y: number }[] = [];
    for (let ty = 3; ty < ROOM_H - 1; ty++) {
      for (let tx = 1; tx < ROOM_W - 1; tx++) {
        const ch = room.map[ty][tx];
        if (ch !== ".") continue;
        // keep the lanes through the doorways clear so the trail and the walk read
        if ((tx === 9 || tx === 10) && (ty <= 4 || ty >= ROOM_H - 3)) continue;
        if ((ty === 6 || ty === 7) && (tx <= 2 || tx >= ROOM_W - 3)) continue;
        if (used.has(`${tx},${ty}`) || rnd() > this.meta.decorDensity) continue;
        if (taken.some((t) => Math.abs(t.x - tx) <= 1 && Math.abs(t.y - ty) <= 1)) continue;
        taken.push({ x: tx, y: ty });
        const tex = set[Math.floor(rnd() * set.length)];
        const flat = tex.includes("leaves") || tex.includes("puddle") || tex.includes("moss");
        const img = this.add.image(room.x + tx * TILE + (rnd() * 6 - 3), room.y + ty * TILE + (rnd() * 6 - 3), tex).setOrigin(0).setDepth(-998).setAlpha(flat ? 0.82 : 0.95).setFlipX(rnd() < 0.5);
        this.roomStuff.push(img);
      }
    }
  }

  /**
   * The boss hall is an arena, not another room: the middle is worn bare (a darker oval where the
   * fight happens, ringed in the boss's colour), and the dungeon's litter is pushed to the edge of
   * it - leaves and caps around the Treant, bones and candles around the Knight, rubble around the Golem.
   */
  private dressBossHall(room: Room, set: string[], rnd: () => number, used: Set<string>) {
    const bossKind = room.placements.find((p) => BOSSES[p.kind])?.kind;
    const ring = bossKind ? BOSSES[bossKind].flash : 0xffffff;
    const cx = room.x + ROOM_W * TILE * 0.5, cy = room.y + 7 * TILE;
    const rx = 7.2 * TILE, ry = 3.4 * TILE;
    const g = this.add.graphics().setDepth(-999);
    g.fillStyle(0x000000, 0.1).fillEllipse(cx, cy, rx * 2, ry * 2);
    g.fillStyle(0x000000, 0.06).fillEllipse(cx, cy, rx * 1.5, ry * 1.5);
    g.lineStyle(2, ring, 0.14).strokeEllipse(cx, cy, rx * 2 + 6, ry * 2 + 6);
    this.roomStuff.push(g);
    // the litter: around the oval's edge, spaced, never on the south lane or a used tile
    const taken: { x: number; y: number }[] = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const a = ((i + rnd() * 0.6) / count) * Math.PI * 2;
      const r = 1.08 + rnd() * 0.22;
      const px = cx + Math.cos(a) * rx * r, py = cy + Math.sin(a) * ry * r;
      const tx = Math.floor((px - room.x) / TILE), ty = Math.floor((py - room.y) / TILE);
      if (tx < 1 || tx > ROOM_W - 2 || ty < 3 || ty > ROOM_H - 2) continue;
      if ((tx === 9 || tx === 10) && ty >= ROOM_H - 3) continue;
      // not on, or right beside, anything placed (a lava pool, an anchor post) - the sprites straddle tiles
      if ([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => used.has(`${tx + ox},${ty + oy}`))) continue;
      if (this.solidTiles.has(`${tx + room.gx * ROOM_W},${ty + room.gy * ROOM_H}`)) continue;
      if (taken.some((t) => t.x === tx && t.y === ty)) continue;
      taken.push({ x: tx, y: ty });
      const tex = set[Math.floor(rnd() * set.length)];
      const flat = tex.includes("leaves") || tex.includes("puddle") || tex.includes("moss");
      const img = this.add.image(px - 16, py - 16, tex).setOrigin(0).setDepth(-998).setAlpha(flat ? 0.82 : 0.95).setFlipX(rnd() < 0.5);
      this.roomStuff.push(img);
    }
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
      case "magmaslime":
        e = new Slime(this, this.enemyGroup, x, y, opts.fromSplit ? { hp: 1, scale: 0.7, bounty: 1, texture: "magmaslime" } : { texture: "magmaslime", hp: 3, bounty: 5 });
        break;
      case "firebat":
        e = new ForestSprite(this, this.enemyGroup, x, y, "firebat");
        break;
      case "cinderling":
        e = new Skeleton(this, this.enemyGroup, x, y, { cinder: true });
        break;
      case "cindergolem":
        e = new CinderGolem(this, this.enemyGroup, x, y);
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
        speak("shard");
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
    if (!blocked && !e.isBoss) sfx(e instanceof Slime ? "slime-hurt" : e instanceof Skeleton ? "bone-hit" : e instanceof ForestSprite ? (e.sprite.texture.key === "bat" ? "bat-hurt" : "sprite-hurt") : "slime-hurt");
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
    // side-quest tallies: only while the quest is on, so the count reads from when it was asked for
    if (e instanceof Mushroom && st.hasFlag("side:caps:on") && !st.hasFlag("side:caps:done")) this.tally("caps", 4, "cap");
    if (e instanceof Skeleton && e.sprite.texture.key === "cinderling" && st.hasFlag("side:slag:on") && !st.hasFlag("side:slag:done")) this.tally("slag", 5, "slag chip");
    if (!e.isBoss && Math.random() < 0.2 && st.hearts < st.maxHearts) this.spawnPickup("heart", e.sprite.x, e.sprite.y);
    this.checkRoomCleared();
  }

  /** One more for a side quest: a small tag by Wren with the running count. */
  private tally(counter: string, need: number, what: string) {
    const st = useGame.getState();
    if ((st.counters[counter] ?? 0) >= need) return;
    st.bump(counter);
    const n = useGame.getState().counters[counter];
    sfx("pickup");
    this.toast("icon-coin", `${what} ${n}/${need}`);
  }

  private checkRoomCleared() {
    const room = this.room;
    if (this.enemies.some((x) => !x.isDead)) return;
    const st = useGame.getState();
    if (st.hasFlag(`cleared:${room.id}`)) return;
    st.setFlag(`cleared:${room.id}`);
    setMusic("explore");
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
    const lava = this.meta.id === "cinder";
    sfx(lava ? "crust" : "drain");
    this.time.delayedCall(200, () => {
      if (this.room !== room) return;
      this.shake(900, 0.003);
      for (const [i, w] of this.water.entries()) {
        if (lava) {
          // it darkens and crusts over instead of sinking
          this.time.delayedCall(200 + (i % 7) * 60, () => {
            if (!w.sprite.active) return;
            w.sprite.stop();
            w.sprite.setTexture("slag");
            this.puff(w.sprite.x + 16, w.sprite.y + 16, 0x6a6462, 2);
          });
        } else this.tweens.add({ targets: w.sprite, alpha: 0, duration: 700, delay: 200 + (i % 7) * 60, ease: "Quad.easeIn", onComplete: () => w.sprite.destroy() });
      }
      for (const r of this.waterRims) {
        this.tweens.killTweensOf(r);
        this.tweens.add({ targets: r, alpha: 0, duration: 600, delay: 300 });
      }
      // the crust kills the light; the scorched bank stays
      for (const g of this.lavaGlow) {
        this.tweens.killTweensOf(g);
        this.tweens.add({ targets: g, alpha: 0, duration: 900, delay: 300 });
      }
      this.time.delayedCall(950, () => {
        if (this.room !== room) return;
        this.waterGroup.clear(true, true);
        this.water = [];
        const line = lava ? "The lava crusts over. It will hold your weight." : "The water sinks into the stone. The way is open.";
        useGame.getState().setNarration(line);
        this.time.delayedCall(3200, () => useGame.getState().narration === line && useGame.getState().setNarration(null));
      });
    });
  }

  private waterRims: Phaser.GameObjects.Rectangle[] = [];
  /** the parts of a lava pool that die when it crusts over: the ember lip at the edge and the glow on the floor */
  private lavaGlow: Phaser.GameObjects.GameObject[] = [];
  /**
   * The pool's edge. Water: a thin pale rim so the tile fence reads as a shoreline. Lava: a scorched
   * bank on the floor around it, a hot ember line where the floor drops away, and an additive glow
   * that breathes over the surrounding stone so the pool lights the room.
   */
  private drawWaterRims(room: Room) {
    this.waterRims = [];
    this.lavaGlow = [];
    const liquid = this.meta.id === "cinder" ? "lava" : "water";
    const isWater = (tx: number, ty: number) => this.dungeon.kindAt(tx, ty) === liquid;
    const open = (tx: number, ty: number) => !isWater(tx, ty) && !this.dungeon.isWall(tx, ty);
    const rect = (x: number, y: number, w: number, h: number, color: number, alpha: number, depth = -997) => {
      const r = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0).setDepth(depth);
      this.roomStuff.push(r);
      return r;
    };
    for (const p of room.placements) {
      if (p.kind !== liquid) continue;
      const x = p.tx * TILE, y = p.ty * TILE;
      const n = open(p.tx, p.ty - 1), s = open(p.tx, p.ty + 1), w = open(p.tx - 1, p.ty), e = open(p.tx + 1, p.ty);
      // the bank sits on the floor outside the tile (4 px of charred / wet stone), the lip just inside:
      // an ember line on lava, a pale foam line on water (which dies with the pool when it drains)
      const BANK = 4, lava = liquid === "lava";
      const bank = lava ? 0x2a1a14 : 0x1a2c34, lip = lava ? 0xffb060 : 0xa8d4e0, lipA = lava ? 0.7 : 0.5;
      const lips = lava ? this.lavaGlow : this.waterRims;
      if (n) { rect(x - (w ? BANK : 0), y - BANK, TILE + (w ? BANK : 0) + (e ? BANK : 0), BANK, bank, 0.85); lips.push(rect(x, y, TILE, 1, lip, lipA, -996)); }
      if (s) { rect(x - (w ? BANK : 0), y + TILE, TILE + (w ? BANK : 0) + (e ? BANK : 0), BANK, bank, 0.85); lips.push(rect(x, y + TILE - 1, TILE, 1, lip, lipA, -996)); }
      if (w) { rect(x - BANK, y, BANK, TILE, bank, 0.85); lips.push(rect(x, y, 1, TILE, lip, lipA, -996)); }
      if (e) { rect(x + TILE, y, BANK, TILE, bank, 0.85); lips.push(rect(x + TILE - 1, y, 1, TILE, lip, lipA, -996)); }
      if (!lava) continue;
      // the glow: a soft halo under each bank edge, drawn beneath the lava sprite so only the floor
      // catches it (the pool itself keeps its own colour), breathing out of step with its neighbours
      const edges: [boolean, number, number][] = [[n, x + 16, y], [s, x + 16, y + TILE], [w, x, y + 16], [e, x + TILE, y + 16]];
      for (const [on, hx, hy] of edges) {
        if (!on) continue;
        const halo = this.add.image(hx, hy, "halo").setTint(0xff6a20).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setScale(1.6).setDepth(-999);
        this.roomStuff.push(halo);
        this.lavaGlow.push(halo);
        this.tweens.add({ targets: halo, alpha: 0.85, scale: 1.75, duration: 700 + ((hx * 7 + hy * 3) % 5) * 90, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: ((hx + hy) / 16) % 4 * 120 });
      }
    }
    // water laps: the foam line breathes slowly
    if (liquid === "water" && this.waterRims.length) this.tweens.add({ targets: this.waterRims, alpha: 0.2, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  /**
   * A blocking zone for a water/lava/pit tile. Where the tile touches a wall the zone grows into it, so
   * the thin walkable strip under a wall face can't be used to sneak around the pool.
   */
  private fenceZone(tx: number, ty: number) {
    let x = tx * TILE, y = ty * TILE, w = TILE, h = TILE;
    if (this.dungeon.isWall(tx, ty - 1)) {
      y -= 20;
      h += 20;
    }
    if (this.dungeon.isWall(tx, ty + 1)) h += 20;
    if (this.dungeon.isWall(tx - 1, ty)) {
      x -= 20;
      w += 20;
    }
    if (this.dungeon.isWall(tx + 1, ty)) w += 20;
    return this.add.zone(x + w / 2, y + h / 2, w, h);
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
      setMusic("boss");
      this.time.delayedCall(700, () => speak("boss"));
      this.shake(420, 0.012);
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
    const slabs = this.meta.id !== "whisperwood";
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

  private groundShield?: Phaser.GameObjects.Image;
  /** The Bone Knight's shield, hooked off his arm: it spins away and lies on the flagstones until he recovers. */
  shieldFlies(x: number, y: number, facing: Phaser.Math.Vector2) {
    this.groundShield?.destroy();
    const p = this.player.sprite;
    const dir = new Phaser.Math.Vector2(p.x - x, p.y - y).normalize();
    const tex = this.textures.exists("shield-ground") ? "shield-ground" : "block";
    const img = this.add.image(x + facing.x * 10, y - 30, tex).setOrigin(0.5, 0.5).setDepth(y + 2);
    this.groundShield = img;
    this.roomStuff.push(img);
    // it flies toward her a little way (the hook pulled it), tumbling, then lands and settles
    const lx = Phaser.Math.Clamp(x + dir.x * 70, this.room.x + 40, this.room.x + this.room.w - 40);
    const ly = Phaser.Math.Clamp(y + dir.y * 50, this.room.y + 110, this.room.y + this.room.h - 30);
    // it lands on its side, flat on the stone (drawn under everything that walks over it)
    this.tweens.add({ targets: img, x: lx, y: ly, angle: 720 + 78, duration: 480, ease: "Quad.easeOut", onComplete: () => { img.setAngle(78).setDepth(-990); this.puff(lx, ly - 6, 0x9aa0b0, 6); } });
    this.puff(x, y - 24, 0x9aa0b0, 12);
    this.shake(120, 0.005);
  }

  /** Recovery: the shield slides back to his hand. */
  shieldReturns(x: number, y: number, then: () => void) {
    const img = this.groundShield;
    this.groundShield = undefined;
    if (!img || !img.active) return then();
    img.setDepth(y + 2);
    this.tweens.add({ targets: img, x, y: y - 30, angle: -360, duration: 320, ease: "Quad.easeIn", onComplete: () => { img.destroy(); then(); } });
  }

  /** The quake tell: a status line, and every anchor post in the room pulses so the way out is readable. */
  quakeWarning(ms: number) {
    const st = useGame.getState();
    if (st.boss) st.setBoss({ ...st.boss, status: "QUAKE - HOOK A POST" });
    this.time.delayedCall(ms + 700, () => useGame.getState().boss?.status === "QUAKE - HOOK A POST" && useGame.getState().setBoss({ ...useGame.getState().boss!, status: "" }));
    if (!st.hasFlag("hint:quake")) {
      st.setFlag("hint:quake");
      this.toast("icon-grapple", "Hook a post before it lands!");
    }
    for (const a of this.anchors) {
      const ring = this.add.circle(a.x, a.y + 14, 30, 0x9ad0ff, 0.12).setStrokeStyle(2, 0x9ad0ff, 0.9).setDepth(-990);
      this.tweens.add({ targets: ring, scale: 1.25, alpha: 0.4, duration: 260, yoyo: true, repeat: Math.floor(ms / 520), onComplete: () => ring.destroy() });
    }
    this.shake(ms, 0.0015);
  }

  /** The quake lands: a shockwave over the whole floor. Safe on the hook or beside a post. */
  quakeHit(x: number, y: number, dmg: number) {
    sfx("bomb");
    this.shake(500, 0.014);
    this.hitStop(80);
    const wave = this.add.circle(x, y - 10, 20, 0x000000, 0).setStrokeStyle(4, 0xc8d0e0, 0.9).setDepth(9000);
    this.tweens.add({ targets: wave, scale: 20, alpha: 0, duration: 550, ease: "Quad.easeOut", onComplete: () => wave.destroy() });
    for (let i = 0; i < 10; i++) this.puff(this.room.x + 40 + Math.random() * (this.room.w - 80), this.room.y + 110 + Math.random() * (this.room.h - 140), 0x9aa0b0, 5);
    const p = this.player.sprite;
    const onHook = !!this.grapple && !this.grapple.done && this.grapple.reeling;
    const byPost = this.anchors.some((a) => Phaser.Math.Distance.Between(a.x, a.y + 14, p.x, p.y) < 52);
    if (onHook || byPost) {
      this.toast("icon-grapple", byPost ? "Safe on the post" : "Safe on the hook");
      return;
    }
    this.player.hurt(x, y, dmg);
  }

  bossStatus(status: "stunned" | "recovered" | "bark" | "opening" | "guarded") {
    const st = useGame.getState();
    if (!st.boss) return;
    const info = BOSSES[this.meta.boss];
    const hasTool = st.hasItem(this.meta.tool ?? "boomerang");
    const text = status === "stunned" ? info.stunned : status === "bark" ? info.blocked(hasTool) : status === "opening" ? info.opening : status === "guarded" ? info.guarded : "";
    if (status === "stunned") sfx("yell");
    if (status === "opening") sfx("lesson");
    if (status === "opening" && !text) return;
    st.setBoss({ ...st.boss, status: text });
    if (status === "bark" || status === "guarded" || status === "opening") this.time.delayedCall(status === "opening" ? 1800 : 1400, () => useGame.getState().boss?.status === text && useGame.getState().setBoss({ ...useGame.getState().boss!, status: "" }));
    // a pulsing ring on the ember core while it's open to attack
    this.bossRing?.destroy();
    this.bossRing = undefined;
    if (status === "stunned" && this.boss) {
      const t = this.boss.sprite;
      this.bossRing = this.add.circle(t.x, t.y - (this.meta.boss === "treant" ? 40 : this.meta.boss === "cindergolem" ? 34 : 30), 12, 0x000000, 0).setStrokeStyle(2, info.flash, 1).setDepth(t.depth + 1);
      this.tweens.add({ targets: this.bossRing, scale: 1.5, alpha: 0, duration: 700, repeat: -1, ease: "Quad.easeOut" });
    }
  }

  bossDefeated(t: Enemy) {
    const st = useGame.getState();
    st.setFlag(`boss:${this.dungeon.def.id}`);
    st.setFlag(`cleared:${this.room.id}`);
    st.setBoss(null);
    sfx("roar");
    setMusic("none");
    this.time.delayedCall(900, () => sfx("victory"));
    this.time.delayedCall(4000, () => setMusic("explore"));
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
    // a refusal you can hear and see: the door rattles in its frame
    const refuse = (icon: string, text: string) => {
      sfx("block");
      if (!this.tweens.getTweensOf(door.image).length) this.tweens.add({ targets: door.image, x: door.image.x + (door.vertical ? 0 : 2), y: door.image.y + (door.vertical ? 2 : 0), duration: 40, yoyo: true, repeat: 1 });
      return this.toast(icon, text, true, at);
    };
    if (door.kind === "locked") {
      if (st.keys <= 0) return refuse("icon-key", "Locked - needs a small key");
      st.addKeys(-1);
    } else {
      if (!st.hasItem("bosskey")) return refuse("icon-bosskey", "Locked - needs the Boss Key");
      st.useItem("bosskey");
    }
    st.setFlag(door.id);
    sfx(door.kind === "boss" ? "boss-door" : "door");
    this.doors = this.doors.filter((d) => d !== door);
    door.zone.destroy();
    const clip = door.kind === "boss" ? "door-boss-open" : "door-locked-open";
    const vertical = door.vertical; // side doors have no swing clip
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
    let px = ((wx - cam.scrollX) / cam.width) * 100;
    let py = ((wy - cam.scrollY) / cam.height) * 100;
    if (name === "boss") {
      // the status line hangs off the boss: keep it clear of the bar (top centre) and the minimap (top right)
      px = Phaser.Math.Clamp(px, 12, 66);
      py = Math.max(py, 26);
    }
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
    if (id === "firerod" && !st.hasItem("firerod")) return;
    if (id === "potion" && (!st.hasItem("potion") || !st.hasFlag("unlock:potion"))) return;
    if (st.lesson) {
      this.pendingLessons.push(id);
      return;
    }
    st.setLesson({ id, keys: id === "move" ? ["W", "A", "S", "D"] : undefined });
    sfx("lesson");
    sfx("hm");
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
      // Tam's side quest: three different signs in the Hollow
      if (this.meta.id === "whisperwood" && useGame.getState().hasFlag("side:signs:on") && !useGame.getState().hasFlag("side:signs:done") && !useGame.getState().hasFlag(`read:${this.room.id}`)) {
        useGame.getState().setFlag(`read:${this.room.id}`);
        this.tally("signs", 3, "sign");
      }
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
    // the lid pops: a squash, a beat of hit-stop, a shaft of light and a sparkle burst; gold fountains
    this.tweens.add({ targets: c.image, scaleY: 0.85, duration: 60, yoyo: true });
    this.hitStop(40);
    const cx = c.image.x + 16, cy = c.image.y + 8;
    const shaft = this.add.rectangle(cx, cy - 20, 14, 60, 0xfff2b0, 0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.image.depth + 2).setScale(0.3, 0.2);
    this.tweens.add({ targets: shaft, scaleX: 1, scaleY: 1, alpha: 0, duration: 520, ease: "Quad.easeOut", onComplete: () => shaft.destroy() });
    this.puff(cx, cy, 0xfff2b0, 14);
    const sparks = this.add.particles(cx, cy, "spore", {
      speed: { min: 40, max: 110 }, angle: { min: 200, max: 340 }, gravityY: 160, lifespan: { min: 500, max: 900 }, scale: { start: 0.9, end: 0 },
      tint: c.contents === "gold" ? [0xffd166, 0xfff2b0, 0xe8a030] : [0xfff2b0, 0xffffff, 0xffd090], alpha: { start: 1, end: 0 }, emitting: false, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(c.image.depth + 3);
    sparks.explode(c.contents === "gold" ? 26 : 14);
    this.time.delayedCall(1200, () => sparks.destroy());
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
      case "firerod":
        st.giveItem("firerod");
        banner = { title: "Fire Rod", sub: "Right-click to fire. Lights braziers, burns thorns, heats slag - and the golem's back.", icon: "firerod" };
        this.time.delayedCall(2600, () => this.startLesson("firerod"));
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
    const owned = (["boomerang", "grapple", "firerod"] as const).filter((t) => st.hasItem(t));
    if (owned.length < 2) return;
    const next = owned[(owned.indexOf(st.tool) + 1) % owned.length];
    st.setTool(next);
    sfx("ui");
    this.toast(`icon-${next}`, next === "grapple" ? "Grapple hook in hand" : next === "firerod" ? "Fire rod in hand" : "Boomerang in hand");
  }

  /** RMB: whichever tool is in hand. */
  throwBoomerang(dir: Phaser.Math.Vector2) {
    const tool = useGame.getState().tool;
    if (tool === "grapple") return this.fireGrapple(dir);
    if (tool === "firerod") return this.fireRod(dir);
    return this.throwBoomerangReal(dir);
  }

  /** The Fire Rod: an ember bolt that lights, burns and heats. Two in the air at most. */
  private fireRod(dir: Phaser.Math.Vector2) {
    this.bolts = this.bolts.filter((b) => !b.done);
    if (this.bolts.length >= 2) return false;
    const p = this.player.sprite;
    const bolt = new FireBolt(this, p.x + dir.x * 12, p.y - 14 + dir.y * 12, dir);
    this.bolts.push(bolt);
    sfx("rod");
    this.finishLesson("firerod");
    this.physics.add.collider(bolt.sprite, this.walls);
    this.physics.add.overlap(bolt.sprite, this.enemyGroup, (_b, obj) => {
      const e = (obj as Phaser.GameObjects.GameObject).getData("enemy") as Enemy;
      if (!e || e.isDead || bolt.done || !bolt.canHit(e)) return;
      // the bolt lands like a blade does: a hit sound and a beat of hit-stop (the crust clangs)
      if (e instanceof CinderGolem) {
        const back = e.backHit(bolt.sprite.x, bolt.sprite.y);
        if (back) e.overheat();
        else this.bossStatus("bark");
        sfx(back ? "hit" : "clang");
        this.hitStop(30);
        bolt.burst();
        return;
      }
      if (e instanceof Skeleton) e.heat(2600);
      e.hitThisSwing = false;
      const blocked = e.blocksNow;
      const died = e.takeHit(bolt.sprite.x, bolt.sprite.y, 1);
      sfx(blocked ? "clang" : "hit");
      this.hitStop(30);
      if (!blocked) this.damageNumber(e.sprite.x, e.sprite.y - e.sprite.displayHeight, 1);
      if (died) this.onEnemyDied(e);
      bolt.burst();
    });
    for (const b of this.braziers) {
      this.physics.add.overlap(bolt.sprite, b.zone, () => {
        if (bolt.done || b.lit) return;
        this.lightBrazier(b);
        bolt.burst();
      });
    }
    if (this.thorns) {
      const t = this.thorns;
      this.physics.add.overlap(bolt.sprite, t.zone, () => {
        if (bolt.done || !this.thorns) return;
        bolt.burst();
        this.burnThorns();
      });
    }
    return true;
  }

  /** A brazier catches: flame, glow, and when every one in the room burns the room is solved. */
  private lightBrazier(b: (typeof this.braziers)[number], silent = false) {
    b.lit = true;
    b.img.setTint(0xffc080).setTintMode(Phaser.TintModes.MULTIPLY);
    b.flame = this.add.particles(b.x, b.y - 2, "spore", {
      speedY: { min: -40, max: -20 }, speedX: { min: -6, max: 6 }, lifespan: { min: 260, max: 460 }, scale: { start: 1.2, end: 0 },
      tint: [0xff6a2a, 0xffa040, 0xffe08a], alpha: { start: 0.9, end: 0 }, frequency: 40, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(b.img.depth + 1);
    this.roomStuff.push(b.flame);
    if (silent) return;
    sfx("ignite");
    this.puff(b.x, b.y - 4, 0xffb060, 10);
    this.shake(50, 0.002);
    const lit = this.braziers.filter((x) => x.lit).length;
    if (this.braziers.every((x) => x.lit)) {
      useGame.getState().setQuestNote(null);
      this.solveRoom();
    } else {
      this.toast("icon-firerod", `${lit} of ${this.braziers.length} lit`);
      useGame.getState().setQuestNote(`${lit} of ${this.braziers.length} braziers lit`);
    }
  }

  private burnThorns() {
    const t = this.thorns;
    if (!t) return;
    this.thorns = undefined;
    useGame.getState().setFlag(t.flag);
    sfx("burn");
    this.solids.remove(t.zone, true, true);
    t.img.setTint(0xff8a3a).setTintMode(Phaser.TintModes.ADD);
    this.tweens.add({ targets: t.img, alpha: 0, y: "+=4", duration: 700, delay: 200, ease: "Quad.easeIn", onComplete: () => t.img.destroy() });
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 90, () => this.puff(t.cx - 24 + Math.random() * 48, t.cy - 6, 0xff9a4a, 6));
    this.shake(120, 0.004);
  }

  /** A patch of fire on the floor (magma slime landings, golem splashes). */
  firePuddle(x: number, y: number, ms: number) {
    const img = this.add.image(x, y - 2, "halo").setTint(0xff7a30).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7).setScale(0.9, 0.55).setDepth(-996);
    this.tweens.add({ targets: img, alpha: 0.35, scale: 0.8, duration: 160, yoyo: true, repeat: -1 });
    this.roomStuff.push(img);
    this.firePuddles.push({ x, y, until: this.time.now + ms, img });
    this.time.delayedCall(ms, () => {
      this.tweens.killTweensOf(img);
      this.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => img.destroy() });
    });
  }

  /** A golem's magma splash: a warned spot, then a burst that hurts and leaves fire. */
  magmaSplash(x: number, y: number, fromX: number, fromY: number) {
    const WARN = 520;
    const warn = this.add.circle(x, y - 4, 16, 0xff6a2a, 0.25).setStrokeStyle(2, 0xff9a4a, 0.9).setDepth(-990).setScale(0.5);
    this.tweens.add({ targets: warn, scale: 1, alpha: 0.8, duration: WARN, ease: "Quad.easeIn" });
    // the lump in the air
    const lump = this.add.image(fromX, fromY, "ember").setDepth(9000).setScale(1.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: lump, x, duration: WARN, ease: "Linear" });
    this.tweens.add({ targets: lump, y: fromY - 60, duration: WARN / 2, ease: "Quad.easeOut", yoyo: true, onComplete: () => lump.destroy() });
    this.time.delayedCall(WARN, () => {
      warn.destroy();
      sfx("splash");
      this.puff(x, y - 4, 0xff9a4a, 12);
      const p = this.player.sprite;
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < 22) this.hurtPlayer(x, y, 1);
      this.firePuddle(x, y, 1600);
    });
  }

  /** Bosses and hazards hurt through here so the rule (grace, armour) stays in one place. */
  hurtPlayer(x: number, y: number, dmg: number) {
    this.player.hurt(x, y, dmg);
  }

  /** Vents breathe on a shared 3 s cycle: 2 s rest, a 0.4 s glow, 0.6 s of flame. */
  private updateVents(now: number) {
    if (!this.vents.length) return;
    const t = now % 3000;
    const warn = t >= 2000 && t < 2400, flame = t >= 2400;
    const p = this.player.sprite;
    // the glow is computed from the cycle, not tweened, so every vent in the room breathes as one
    const k = warn ? (t - 2000) / 400 : 0;
    const glowA = flame ? 0.72 + 0.16 * Math.sin(now / 38) : warn ? 0.1 + 0.55 * k : 0.09 + 0.04 * Math.sin(now / 320);
    const glowS = flame ? 1.9 : warn ? 1.2 + 0.6 * k : 1.2;
    for (const v of this.vents) {
      if (warn) v.img.setTint(0x603010).setTintMode(Phaser.TintModes.ADD);
      else v.img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      v.glow.setAlpha(glowA).setScale(glowS);
      if (flame !== v.em.emitting) {
        if (flame) {
          v.em.start();
          if (Phaser.Math.Distance.Between(v.x, v.y, p.x, p.y) < 160) sfx("vent");
        } else v.em.stop();
      }
      if (flame && Phaser.Math.Distance.Between(v.x, v.y, p.x, p.y - 6) < 18) this.hurtPlayer(v.x, v.y + 10, 1);
    }
  }

  private updateFire(now: number) {
    if (!this.firePuddles.length) return;
    const p = this.player.sprite;
    this.firePuddles = this.firePuddles.filter((f) => now < f.until);
    for (const f of this.firePuddles) if (Phaser.Math.Distance.Between(f.x, f.y, p.x, p.y) < 15) this.hurtPlayer(f.x, f.y, 1);
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
        const lit = this.crystals.filter((x) => x.lit).length;
        if (lit < this.crystals.length) useGame.getState().setQuestNote(`${lit} of ${this.crystals.length} crystals ringing`);
        else {
          useGame.getState().setQuestNote(null);
          this.solveRoom();
        }
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
        // a guarded boss or a shield-bearer takes nothing: say so (clang), and print no number it didn't deal
        const blocked = e.blocksNow;
        const died = e.takeHit(x, y, 2);
        if (blocked) sfx("clang");
        else this.damageNumber(s.x, s.y - s.displayHeight, 2);
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

  /**
   * The GPS. The objective is either in this dungeon (walk the doorway graph to its room, then
   * to the thing itself) or somewhere else (walk to the entrance and out).
   */
  private updateGuide(px: number, py: number) {
    if (!this.guide) return;
    announceQuest(this, this.time.now - this.createdAt);
    const st = useGame.getState();
    const step = questStep(questStateOf());
    if (!step || st.screen !== "game" || this.transitioning) return this.guide.hide();
    const t = step.target;
    let targetRoom: Room;
    let thing: { x: number; y: number } | null = null;
    let where: string;
    if (t.place !== this.meta.id) {
      targetRoom = this.dungeon.room(this.dungeon.def.entrance.room);
      thing = { x: targetRoom.x + targetRoom.w / 2, y: targetRoom.y + targetRoom.h + 8 }; // the way out
      where = t.place === "hub" ? "back in town" : t.place === "whisperwood" ? "in the Hollow" : "in the Crypt";
    } else {
      targetRoom = this.dungeon.room(t.room ?? this.dungeon.def.entrance.room);
      if (t.thing) {
        const tt = thingTile(this.dungeon.def, targetRoom.id, t.thing);
        if (tt) thing = { x: targetRoom.x + tt.tx * TILE + 16, y: targetRoom.y + tt.ty * TILE + 16 };
      }
      where = "here";
    }
    if (targetRoom === this.room && thing) return this.guide.point(px, py, thing.x, thing.y, where === "here" ? "here" : where, targetRoom.id);
    if (targetRoom === this.room) return this.guide.hide();
    const hop = this.dungeon.nextHop(this.room, targetRoom);
    if (!hop) {
      // no open walk yet (a cracked wall, an unopened door): point the way as the crow flies
      const cx = targetRoom.x + targetRoom.w / 2, cy = targetRoom.y + targetRoom.h / 2;
      return this.guide.point(px, py, cx, cy, where === "here" ? "beyond the wall" : where, targetRoom.id);
    }
    this.guide.point(px, py, hop.x, hop.y, where === "here" ? `${hop.hops} room${hop.hops > 1 ? "s" : ""} away` : where, targetRoom.id);
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
    this.player?.pollMenuPad();
    if (this.frozen) return;
    try {
      this.dt = delta;
      const now = this.time.now;
      const p = this.player.sprite;
      this.player.update(delta);
      if (this.transitioning) return;
      // a sign box holds Wren, so it holds the room too: no enemy moves, no hazard bites while she reads
      const reading = !!useGame.getState().dialogue;
      if (!reading) {
        for (const e of this.enemies) e.update(now, p.x, p.y);
        // area hazards (spore clouds, root spikes)
        for (const e of this.enemies) {
          for (const hz of e.hazards) {
            if (Phaser.Math.Distance.Between(hz.x, hz.y, p.x, p.y - 8) < hz.r + 4) this.player.hurt(hz.x, hz.y);
          }
        }
      }
      this.boomerang?.update(p.x, p.y - 14);
      this.grapple?.update(p.x, p.y - 14);
      if (this.grapple?.done) this.grapple = undefined;
      for (const b of this.bolts) b.update();
      this.bolts = this.bolts.filter((b) => !b.done);
      if (!reading) {
        this.updateVents(now);
        this.updateFire(now);
      }
      this.checkPlates();
      // the potion lesson only makes sense while she's hurt: at full hearts it can't be completed, so it goes
      {
        const g = useGame.getState();
        if (g.lesson?.id === "potion" && g.hearts >= g.maxHearts) g.setLesson(null);
      }
      this.updateGuide(p.x, p.y);
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
