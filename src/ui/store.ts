import { create } from "zustand";

export type Facing = "south" | "north" | "east" | "west";

interface GameState {
  hearts: number; // in half-hearts
  maxHearts: number;
  gold: number;
  keys: number;
  facing: Facing;
  action: "idle" | "walk" | "attack" | "roll";
  damage: (halfHearts: number) => void;
  setFacing: (f: Facing) => void;
  setAction: (a: GameState["action"]) => void;
  addGold: (n: number) => void;
}

export const useGame = create<GameState>((set) => ({
  hearts: 6,
  maxHearts: 6,
  gold: 0,
  keys: 0,
  facing: "south",
  action: "idle",
  damage: (n) => set((s) => ({ hearts: Math.max(0, s.hearts - n) })),
  setFacing: (facing) => set({ facing }),
  setAction: (action) => set({ action }),
  addGold: (n) => set((s) => ({ gold: s.gold + n })),
}));
