import { create } from "zustand";

export type Facing = "south" | "north" | "east" | "west";
export type ItemId = "sword" | "potion" | "bomb" | "key";

export interface Item {
  id: ItemId;
  name: string;
  qty: number;
  hint?: string;
}

interface GameState {
  hearts: number; // in half-hearts
  maxHearts: number;
  gold: number;
  keys: number;
  facing: Facing;
  action: "idle" | "walk" | "sprint" | "attack" | "recover" | "dash";
  items: Item[];
  bagOpen: boolean;
  paused: boolean;
  damage: (halfHearts: number) => void;
  setFacing: (f: Facing) => void;
  setAction: (a: GameState["action"]) => void;
  addGold: (n: number) => void;
  toggleBag: (open?: boolean) => void;
  togglePause: (on?: boolean) => void;
}

export const useGame = create<GameState>((set) => ({
  hearts: 6,
  maxHearts: 6,
  gold: 0,
  keys: 0,
  facing: "south",
  action: "idle",
  items: [
    { id: "sword", name: "Iron Sword", qty: 1, hint: "2 dmg · equipped" },
    { id: "potion", name: "Potion", qty: 2, hint: "Heals 3 hearts" },
    { id: "bomb", name: "Bomb", qty: 3, hint: "Breaks cracked walls" },
  ],
  bagOpen: false,
  paused: false,
  damage: (n) => set((s) => ({ hearts: Math.max(0, s.hearts - n) })),
  setFacing: (facing) => set({ facing }),
  setAction: (action) => set({ action }),
  addGold: (n) => set((s) => ({ gold: s.gold + n })),
  toggleBag: (open) => set((s) => ({ bagOpen: open ?? !s.bagOpen })),
  togglePause: (on) => set((s) => ({ paused: on ?? !s.paused })),
}));
