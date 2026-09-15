import type { DungeonDef } from "../dungeon";
import whisperwood from "./whisperwood.json";
import crypt from "./sunken-crypt.json";

export type DungeonId = "whisperwood" | "crypt";

/** Everything about a dungeon that isn't its rooms: text, the boss, where it hangs off the town. */
export interface DungeonMeta {
  id: DungeonId;
  def: DungeonDef;
  /** spritesheet under public/assets/tiles/<tileset>.{png,json} */
  tileset: string;
  /** which town gate leads here, and which way Wren walks through it */
  gate: string;
  gateDir: "east" | "west" | "south";
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
    completeNext: "Smoke still rises from the mountain road. The Cinder Depths are not built yet.",
    unlocks: {},
    decor: ["decor-moss", "decor-moss", "decor-rubble", "decor-puddle-dark", "bones", "decor-candle"],
    decorDensity: 0.06,
  },
};

export function dungeonFor(place: string): DungeonMeta {
  return DUNGEONS[(place in DUNGEONS ? place : "whisperwood") as DungeonId];
}
