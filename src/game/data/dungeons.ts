import type { DungeonDef } from "../dungeon";
import whisperwood from "./whisperwood.json";
import crypt from "./sunken-crypt.json";
import cinder from "./cinder-depths.json";

export type DungeonId = "whisperwood" | "crypt" | "cinder";

/** Everything about a dungeon that isn't its rooms: text, the boss, where it hangs off the town. */
export interface DungeonMeta {
  id: DungeonId;
  def: DungeonDef;
  /** spritesheet under public/assets/tiles/<tileset>.{png,json} */
  tileset: string;
  /** which town gate leads here, and which way Wren walks through it */
  gate: string;
  gateDir: "east" | "west" | "south";
  /** the tool this dungeon teaches (its RMB lesson) */
  tool?: "boomerang" | "grapple" | "firerod";
  /** the RoomObject kind of the boss */
  boss: string;
  signTitle: string;
  bossKeyHint: string;
  /** the shard banner's second line, and the complete plate */
  cleansed: string;
  completeEyebrow: string;
  completeNext: string;
  /** rooms where a consumable first matters: the hotbar slot unlocks on entry */
  unlocks: { potion?: string; bomb?: string };
  /** floor dressing scattered on empty tiles (texture keys under sprites/props), and how much of the floor gets some */
  decor: string[];
  decorDensity: number;
}

export const DUNGEONS: Record<DungeonId, DungeonMeta> = {
  whisperwood: {
    id: "whisperwood",
    def: whisperwood as DungeonDef,
    tileset: "whisperwood",
    gate: "gate-whisperwood",
    gateDir: "east",
    boss: "treant",
    signTitle: "MOSS-CARVED SIGN",
    bossKeyHint: "The Heart of the Hollow lies north of the Crossroads.",
    cleansed: "One of three. Whisperwood Hollow is cleansed.",
    completeEyebrow: "WHISPERWOOD HOLLOW",
    completeNext: "The Sunken Crypt waits beyond the marsh. The west gate in town has opened.",
    unlocks: { potion: "west-fight", bomb: "east-crystal" },
    decor: ["decor-leaves", "decor-leaves", "decor-tuft", "decor-tuft", "decor-shrooms", "decor-puddle", "stone"],
    decorDensity: 0.08,
  },
  crypt: {
    id: "crypt",
    def: crypt as DungeonDef,
    tileset: "crypt",
    gate: "gate-crypt",
    gateDir: "west",
    boss: "boneknight",
    signTitle: "RUNE-CUT STONE",
    bossKeyHint: "The Bone Knight keeps his hall north of the Crossing.",
    cleansed: "Two of three. The Sunken Crypt sleeps again.",
    completeEyebrow: "SUNKEN CRYPT",
    completeNext: "The smoke on the mountain road is the last shard breathing. The south gate has opened.",
    unlocks: {},
    decor: ["decor-moss", "decor-moss", "decor-rubble", "decor-puddle-dark", "bones", "decor-candle"],
    decorDensity: 0.06,
  },
  cinder: {
    id: "cinder",
    def: cinder as DungeonDef,
    tileset: "cinder",
    gate: "gate-cinder",
    gateDir: "south",
    boss: "cindergolem",
    tool: "firerod",
    signTitle: "SOOT-BLACK STONE",
    bossKeyHint: "The Heart of the Cinder burns north of the Crossing.",
    cleansed: "Three of three. The Ember is whole.",
    completeEyebrow: "CINDER DEPTHS",
    completeNext: "Bring the last shard home. Tam is waiting by the plinth.",
    unlocks: {},
    decor: ["decor-rubble", "decor-rubble", "stone", "bones", "decor-candle"],
    decorDensity: 0.05,
  },
};

export function dungeonFor(place: string): DungeonMeta {
  return DUNGEONS[(place in DUNGEONS ? place : "whisperwood") as DungeonId];
}

/** Which gate in town leads to a place (the hub reads this instead of hardcoding). */
export function gateFor(place: string): string | undefined {
  return (Object.values(DUNGEONS).find((m) => m.id === place) ?? null)?.gate;
}
