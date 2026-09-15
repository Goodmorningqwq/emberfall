import { create } from "zustand";
import { SHOPS } from "./shop";

export type Facing = "south" | "north" | "east" | "west";
export type ItemId = "sword" | "potion" | "bomb" | "key" | "boomerang" | "bosskey" | "shard";

export interface Item {
  id: ItemId;
  name: string;
  qty: number;
  hint?: string;
}

/** Player preferences, persisted on their own (survive New game). */
export interface Settings {
  shake: 0 | 0.5 | 1;
  sfx: number; // 0..1
}
const SETTINGS_KEY = "emberfall.settings";
export function readSettings(): Settings {
  try {
    return { shake: 1, sfx: 0.8, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>) };
  } catch {
    return { shake: 1, sfx: 0.8 };
  }
}

/** Transient "You got X" / boss / room-name plate shown by the HUD. */
export interface Banner {
  kind: "item" | "boss" | "room";
  title: string;
  sub?: string;
  icon?: ItemId | "heart";
}

export type LessonId = "move" | "dash" | "attack" | "potion" | "throw" | "bomb";
/** The contextual tutorial tag beside Wren. `keys` = which of W/A/S/D are still to press. */
export interface Lesson {
  id: LessonId;
  keys?: string[];
}

/** A small pixel tag anchored to something in the world (block, door, pickup...). x/y are camera-space game px (0-640, 0-384). */
export interface WorldTag {
  text: string;
  x: number;
  y: number;
  icon?: string; // /assets/... path
  kind?: "push" | "locked" | "info";
}

export interface Dialogue {
  title: string;
  text: string;
}

/** What survives a reload. Bump SAVE_VERSION when the shape changes. */
export interface SaveData {
  version: number;
  hearts: number;
  maxHearts: number;
  gold: number;
  keys: number;
  items: Item[];
  flags: string[];
  lessons: string[];
  room: string;
  place: Place;
  swordTier: number;
  playtimeMs: number;
  savedAt: number;
}
const SAVE_KEY = "emberfall.save.1";
const SAVE_VERSION = 5;
export type Place = "hub" | "whisperwood";

const START_ITEMS: Item[] = [
  { id: "sword", name: "Iron Sword", qty: 1, hint: "1 dmg · equipped" },
  { id: "potion", name: "Potion", qty: 2, hint: "Heals 3 hearts" },
  { id: "bomb", name: "Bomb", qty: 3, hint: "Breaks cracked walls" },
];

export const ITEM_META: Record<ItemId, { name: string; hint: string }> = {
  sword: { name: "Iron Sword", hint: "1 dmg · equipped" },
  potion: { name: "Potion", hint: "Heals 3 hearts" },
  bomb: { name: "Bomb", hint: "Breaks cracked walls" },
  key: { name: "Small Key", hint: "Opens a locked door" },
  boomerang: { name: "Boomerang", hint: "RMB · stuns, fetches, rings crystals" },
  bosskey: { name: "Boss Key", hint: "Opens the way to the Heart of the Hollow" },
  shard: { name: "Ember Shard", hint: "One of three. Bring the flame home." },
};

interface GameState {
  screen: "title" | "intro" | "game" | "dead" | "complete";
  hearts: number; // in half-hearts
  maxHearts: number;
  gold: number;
  keys: number;
  facing: Facing;
  action: "idle" | "walk" | "sprint" | "attack" | "recover" | "dash" | "hurt" | "dead";
  items: Item[];
  /** persistent world state: "chest:<dungeon>/<room>/<n>", "door:<room>:<dir>", "cleared:<room>", "solved:<room>", "boss:<dungeon>" */
  flags: string[];
  room: string; // current room id
  place: Place; // which scene the save lives in
  swordTier: number; // 1..3 = damage per strike
  shop: { vendor: keyof typeof SHOPS; bought?: string } | null;
  roomName: string;
  dungeonName: string;
  bagOpen: boolean;
  paused: boolean;
  banner: Banner | null;
  /** boss HP while a boss fight is on, else null */
  boss: { name: string; hp: number; max: number; status: string; sub?: string; intro?: boolean } | null;
  lessons: string[]; // completed tutorial lessons (saved)
  lesson: Lesson | null; // the one showing now
  tag: WorldTag | null;
  dialogue: Dialogue | null;
  /** narrator caption (room lore) — shows without holding the game */
  narration: string | null;
  settings: Settings;
  playtimeMs: number;
  sessionStart: number;
  damage: (halfHearts: number) => void;
  heal: (halfHearts: number) => void;
  setFacing: (f: Facing) => void;
  setAction: (a: GameState["action"]) => void;
  addGold: (n: number) => void;
  addKeys: (n: number) => void;
  giveItem: (id: ItemId, qty?: number) => void;
  useItem: (id: ItemId, qty?: number) => boolean;
  hasItem: (id: ItemId) => boolean;
  setFlag: (f: string) => void;
  hasFlag: (f: string) => boolean;
  setRoom: (id: string, name: string, dungeonName: string) => void;
  setPlace: (p: Place) => void;
  openShop: (vendor: keyof typeof SHOPS) => void;
  closeShop: () => void;
  /** returns why it failed, or null on success */
  buy: (entryId: string) => string | null;
  showBanner: (b: Banner | null) => void;
  setBoss: (b: GameState["boss"]) => void;
  setLesson: (l: Lesson | null) => void;
  finishLesson: (id: LessonId) => void;
  setTag: (t: WorldTag | null) => void;
  setDialogue: (d: Dialogue | null) => void;
  setNarration: (t: string | null) => void;
  setSettings: (s: Partial<Settings>) => void;
  addMaxHearts: (halfHearts: number) => void;
  toggleBag: (open?: boolean) => void;
  togglePause: (on?: boolean) => void;
  newGame: () => void;
  startGame: () => void; // after the intro plates
  continueGame: () => void;
  completeDungeon: () => void;
  keepExploring: () => void;
  die: () => void;
  respawn: () => void;
  quitToTitle: () => void;
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === SAVE_VERSION ? data : null;
  } catch {
    return null;
  }
}

function writeSave(s: GameState) {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      hearts: s.hearts,
      maxHearts: s.maxHearts,
      gold: s.gold,
      keys: s.keys,
      items: s.items,
      flags: s.flags,
      lessons: s.lessons,
      room: s.room,
      place: s.place,
      swordTier: s.swordTier,
      playtimeMs: s.playtimeMs + (s.sessionStart ? Date.now() - s.sessionStart : 0),
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode etc.) — play on without saving */
  }
}

const fresh = () => ({
  hearts: 6,
  maxHearts: 6,
  gold: 0,
  keys: 0,
  items: START_ITEMS.map((i) => ({ ...i })),
  flags: [] as string[],
  lessons: [] as string[],
  room: "entrance",
  place: "hub" as Place,
  swordTier: 1,
  shop: null,
  playtimeMs: 0,
});

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  ...fresh(),
  facing: "south",
  action: "idle",
  roomName: "",
  dungeonName: "",
  bagOpen: false,
  paused: false,
  banner: null,
  boss: null,
  lesson: null,
  tag: null,
  dialogue: null,
  narration: null,
  settings: readSettings(),
  sessionStart: 0,
  damage: (n) => set((s) => ({ hearts: Math.max(0, s.hearts - n) })),
  heal: (n) => set((s) => ({ hearts: Math.min(s.maxHearts, s.hearts + n) })),
  setFacing: (facing) => set({ facing }),
  setAction: (action) => set({ action }),
  addGold: (n) => set((s) => ({ gold: s.gold + n })),
  addKeys: (n) => set((s) => ({ keys: Math.max(0, s.keys + n) })),
  giveItem: (id, qty = 1) =>
    set((s) => {
      const items = s.items.map((i) => ({ ...i }));
      const it = items.find((i) => i.id === id);
      if (it) it.qty += qty;
      else items.push({ id, qty, ...ITEM_META[id] });
      return { items };
    }),
  useItem: (id, qty = 1) => {
    const it = get().items.find((i) => i.id === id);
    if (!it || it.qty < qty) return false;
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: i.qty - qty } : i)).filter((i) => i.qty > 0 || i.id === "sword") }));
    return true;
  },
  hasItem: (id) => get().items.some((i) => i.id === id && i.qty > 0),
  setFlag: (f) => set((s) => (s.flags.includes(f) ? {} : { flags: [...s.flags, f] })),
  hasFlag: (f) => get().flags.includes(f),
  setRoom: (room, roomName, dungeonName) => set({ room, roomName, dungeonName }),
  setPlace: (place) => set({ place }),
  openShop: (vendor) => set({ shop: { vendor } }),
  closeShop: () => set({ shop: null }),
  buy: (entryId) => {
    const s = get();
    if (!s.shop) return "no shop";
    const entry = SHOPS[s.shop.vendor].entries.find((e) => e.id === entryId);
    if (!entry) return "no such item";
    if (entry.give) {
      const have = s.items.find((i) => i.id === entry.give!.item)?.qty ?? 0;
      if (have >= entry.give.max) return "You can't carry more";
    }
    if (entry.upgrade === "sword2" && s.swordTier >= 2) return "Already forged";
    if (entry.upgrade === "sword3" && (s.swordTier >= 3 || s.swordTier < 2)) return s.swordTier >= 3 ? "Already forged" : "Temper it first";
    if (entry.upgrade === "heart" && s.hasFlag("bought:heart")) return "Only had the one";
    if (s.gold < entry.price) return "Not enough gold";
    set({ gold: s.gold - entry.price, shop: { ...s.shop, bought: entryId } });
    if (entry.give) get().giveItem(entry.give.item, entry.give.qty);
    if (entry.upgrade === "sword2") set({ swordTier: 2, items: get().items.map((i) => (i.id === "sword" ? { ...i, name: "Tempered Sword", hint: "2 dmg · equipped" } : i)) });
    if (entry.upgrade === "sword3") set({ swordTier: 3, items: get().items.map((i) => (i.id === "sword" ? { ...i, name: "Ember-forged Sword", hint: "3 dmg · equipped" } : i)) });
    if (entry.upgrade === "heart") {
      get().setFlag("bought:heart");
      get().addMaxHearts(2);
    }
    return null;
  },
  showBanner: (banner) => set({ banner }),
  setBoss: (boss) => set({ boss }),
  setLesson: (lesson) => set({ lesson }),
  finishLesson: (id) => set((s) => ({ lessons: s.lessons.includes(id) ? s.lessons : [...s.lessons, id], lesson: s.lesson?.id === id ? null : s.lesson })),
  setTag: (tag) => set({ tag }),
  setDialogue: (dialogue) => set({ dialogue }),
  setNarration: (narration) => set({ narration }),
  setSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* fine */
      }
      return { settings };
    }),
  addMaxHearts: (n) => set((s) => ({ maxHearts: s.maxHearts + n, hearts: s.maxHearts + n })),
  toggleBag: (open) => set((s) => ({ bagOpen: open ?? !s.bagOpen })),
  togglePause: (on) => set((s) => ({ paused: on ?? !s.paused })),
  newGame: () => set({ screen: "intro", ...fresh(), sessionStart: Date.now(), bagOpen: false, paused: false, banner: null, boss: null, lesson: null, tag: null, dialogue: null, shop: null }),
  startGame: () => set({ screen: "game" }),
  completeDungeon: () => set({ screen: "complete", banner: null, tag: null, lesson: null }),
  keepExploring: () => set({ screen: "game" }),
  continueGame: () => {
    const d = readSave();
    if (!d) return get().newGame();
    set({
      screen: "game",
      hearts: Math.max(2, d.hearts),
      maxHearts: d.maxHearts,
      gold: d.gold,
      keys: d.keys,
      items: d.items,
      flags: d.flags,
      lessons: d.lessons ?? [],
      room: d.room,
      place: d.place ?? "hub",
      swordTier: d.swordTier ?? 1,
      shop: null,
      playtimeMs: d.playtimeMs,
      sessionStart: Date.now(),
      bagOpen: false,
      paused: false,
      banner: null,
      boss: null,
      lesson: null,
      tag: null,
      dialogue: null,
    });
  },
  die: () => set({ screen: "dead", bagOpen: false, paused: false, boss: null, banner: null, lesson: null, tag: null, dialogue: null }),
  respawn: () => set((s) => ({ screen: "game", hearts: s.maxHearts, room: "entrance", place: "whisperwood" })),
  quitToTitle: () => {
    writeSave(get());
    set({ screen: "title", paused: false, bagOpen: false, boss: null, banner: null, lesson: null, tag: null, dialogue: null });
  },
}));

// auto-save whenever progress-relevant state changes while playing
let saveTimer: number | undefined;
useGame.subscribe((s, prev) => {
  if (s.screen !== "game" && s.screen !== "complete") return;
  if (s.hearts === prev.hearts && s.gold === prev.gold && s.keys === prev.keys && s.items === prev.items && s.flags === prev.flags && s.room === prev.room && s.lessons === prev.lessons && s.place === prev.place && s.swordTier === prev.swordTier) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => writeSave(useGame.getState()), 300);
});
window.addEventListener("beforeunload", () => {
  const s = useGame.getState();
  if (s.screen === "game") writeSave(s);
});
