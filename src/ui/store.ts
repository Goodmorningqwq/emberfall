import { create } from "zustand";

export type Facing = "south" | "north" | "east" | "west";
export type ItemId = "sword" | "potion" | "bomb" | "key";

export interface Item {
  id: ItemId;
  name: string;
  qty: number;
  hint?: string;
}

/** What survives a reload. Bump SAVE_VERSION when the shape changes. */
export interface SaveData {
  version: number;
  hearts: number;
  maxHearts: number;
  gold: number;
  keys: number;
  items: Item[];
  playtimeMs: number;
  savedAt: number;
}
const SAVE_KEY = "emberfall.save.1";
const SAVE_VERSION = 1;

const START_ITEMS: Item[] = [
  { id: "sword", name: "Iron Sword", qty: 1, hint: "2 dmg · equipped" },
  { id: "potion", name: "Potion", qty: 2, hint: "Heals 3 hearts" },
  { id: "bomb", name: "Bomb", qty: 3, hint: "Breaks cracked walls" },
];

interface GameState {
  screen: "title" | "game";
  hearts: number; // in half-hearts
  maxHearts: number;
  gold: number;
  keys: number;
  facing: Facing;
  action: "idle" | "walk" | "sprint" | "attack" | "recover" | "dash";
  items: Item[];
  bagOpen: boolean;
  paused: boolean;
  playtimeMs: number;
  sessionStart: number;
  damage: (halfHearts: number) => void;
  setFacing: (f: Facing) => void;
  setAction: (a: GameState["action"]) => void;
  addGold: (n: number) => void;
  toggleBag: (open?: boolean) => void;
  togglePause: (on?: boolean) => void;
  newGame: () => void;
  continueGame: () => void;
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
      playtimeMs: s.playtimeMs + (s.sessionStart ? Date.now() - s.sessionStart : 0),
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode etc.) — play on without saving */
  }
}

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  hearts: 6,
  maxHearts: 6,
  gold: 0,
  keys: 0,
  facing: "south",
  action: "idle",
  items: START_ITEMS,
  bagOpen: false,
  paused: false,
  playtimeMs: 0,
  sessionStart: 0,
  damage: (n) => set((s) => ({ hearts: Math.max(0, s.hearts - n) })),
  setFacing: (facing) => set({ facing }),
  setAction: (action) => set({ action }),
  addGold: (n) => set((s) => ({ gold: s.gold + n })),
  toggleBag: (open) => set((s) => ({ bagOpen: open ?? !s.bagOpen })),
  togglePause: (on) => set((s) => ({ paused: on ?? !s.paused })),
  newGame: () =>
    set({ screen: "game", hearts: 6, maxHearts: 6, gold: 0, keys: 0, items: START_ITEMS, playtimeMs: 0, sessionStart: Date.now(), bagOpen: false, paused: false }),
  continueGame: () => {
    const d = readSave();
    if (!d) return get().newGame();
    set({ screen: "game", hearts: d.hearts, maxHearts: d.maxHearts, gold: d.gold, keys: d.keys, items: d.items, playtimeMs: d.playtimeMs, sessionStart: Date.now(), bagOpen: false, paused: false });
  },
  quitToTitle: () => {
    writeSave(get());
    set({ screen: "title", paused: false, bagOpen: false });
  },
}));

// auto-save whenever progress-relevant state changes while playing
let saveTimer: number | undefined;
useGame.subscribe((s, prev) => {
  if (s.screen !== "game") return;
  if (s.hearts === prev.hearts && s.gold === prev.gold && s.keys === prev.keys && s.items === prev.items) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => writeSave(useGame.getState()), 300);
});
window.addEventListener("beforeunload", () => {
  const s = useGame.getState();
  if (s.screen === "game") writeSave(s);
});
