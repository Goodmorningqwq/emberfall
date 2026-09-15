import type { DungeonDef } from "./dungeon";
import { DUNGEONS } from "./data/dungeons";

/**
 * The main quest: one line of steps from the cold plinth to the last shard. Progress is
 * *derived* from the save (flags, items, place) every time it's asked for, so nothing new
 * has to be saved and an old save lands on the right step. Each step knows where it points
 * (a room, an NPC, a gate, an item) so the scenes can draw the guide.
 */
export interface QuestTarget {
  place: "hub" | "whisperwood" | "crypt" | "cinder";
  /** dungeon room id; the room's own thing (item / boss / plate) is found from the def */
  room?: string;
  /** what in the room: an item id (chest or drop), "boss", "plate", "exit" */
  thing?: string;
  /** hub anchor kind (npc-elder, gate-whisperwood...) */
  anchor?: string;
}

export interface QuestStep {
  id: string;
  title: string;
  objective: string;
  /** what the journal / narrator says when the step begins */
  story: string;
  target: QuestTarget;
  done: (s: QuestState) => boolean;
}

export interface QuestState {
  flags: string[];
  place: string;
  has: (item: string) => boolean;
  shards: number;
  counters?: Record<string, number>;
}

/**
 * Side quests: an NPC asks for something, the world tallies it, the NPC pays. Offered when its
 * `available` holds (talk to the giver), tracked under the main objective, turned in by talking again.
 */
export interface SideQuest {
  id: string;
  giver: "npc-apothecary" | "npc-blacksmith" | "npc-elder";
  title: string;
  objective: string;
  /** what the giver says when handing it out, and when it's turned in */
  offer: string;
  thanks: string;
  counter: string;
  need: number;
  available: (s: QuestState) => boolean;
  reward: { gold: number; item?: string };
}

export const SIDE_QUESTS: SideQuest[] = [
  {
    id: "caps",
    giver: "npc-apothecary",
    title: "Maren's Caps",
    objective: "Cut down mushrooms in Whisperwood Hollow",
    offer: "The Hollow's mushrooms - the big ones that puff spores. Bring me the caps of four and I'll make it worth the walk.",
    thanks: "Four caps. These will steep for a month. Here - and take a potion for the trouble.",
    counter: "caps",
    need: 4,
    available: (s) => s.flags.includes("talked:elder"),
    reward: { gold: 60, item: "potion" },
  },
  {
    id: "signs",
    giver: "npc-elder",
    title: "What the Wardens Wrote",
    objective: "Read the moss-carved signs in Whisperwood Hollow",
    offer: "The wardens carved what they knew into the Hollow's signs. Read me three of them when you're back; my eyes are done with small letters.",
    thanks: "So that's what they wrote. Old words, but they still hold. Take this for the walking.",
    counter: "signs",
    need: 3,
    available: (s) => s.flags.includes("shard:whisperwood"),
    reward: { gold: 80 },
  },
  {
    id: "slag",
    giver: "npc-blacksmith",
    title: "Orrin's Slag",
    objective: "Break cinderlings in the Cinder Depths for their slag",
    offer: "Those slag brutes under the mountain - their shells hold a metal I can't get anywhere else. Crack five and bring me what falls off.",
    thanks: "Look at that shine. I'll be at the forge all week. This is yours.",
    counter: "slag",
    need: 5,
    available: (s) => s.flags.includes("shard:crypt"),
    reward: { gold: 120 },
  },
];

export function sideState(q: SideQuest, s: QuestState): "hidden" | "offer" | "active" | "ready" | "done" {
  if (s.flags.includes(`side:${q.id}:done`)) return "done";
  if (!s.flags.includes(`side:${q.id}:on`)) return q.available(s) ? "offer" : "hidden";
  return (s.counters?.[q.counter] ?? 0) >= q.need ? "ready" : "active";
}

export function sideProgress(q: SideQuest, s: QuestState): number {
  return Math.min(q.need, s.counters?.[q.counter] ?? 0);
}

const flag = (f: string) => (s: QuestState) => s.flags.includes(f);
const item = (i: string) => (s: QuestState) => s.has(i);

export const QUEST: QuestStep[] = [
  {
    id: "elder",
    title: "The Ember Cracked",
    objective: "Speak with Elder Tam by the plinth",
    story: "The Ember that warmed Emberfall broke into three shards the night the marsh rose. Tam is the last one who remembers it burning.",
    target: { place: "hub", anchor: "npc-elder" },
    done: flag("talked:elder"),
  },
  {
    id: "east-road",
    title: "The East Road",
    objective: "Take the east gate to Whisperwood Hollow",
    story: "One shard sleeps under the Hollow. The trees there have not stopped whispering since it fell.",
    target: { place: "hub", anchor: "gate-whisperwood" },
    done: (s) => s.place === "whisperwood" || s.flags.includes("boss:whisperwood"),
  },
  {
    id: "boomerang",
    title: "A Warden's Tool",
    objective: "Find the boomerang in the Hollow's west cellar",
    story: "The old wardens rang the crystal roots with a thrown blade. One is said to lie west of the crossroads, behind a moss-back.",
    target: { place: "whisperwood", room: "west-miniboss", thing: "boomerang" },
    done: item("boomerang"),
  },
  {
    id: "wood-key",
    title: "The Heart's Key",
    objective: "Ring the crystals east of the crossroads for the Boss Key",
    story: "Every root in the Hollow grows from one heart. The wardens locked it behind a door only a ringing key can open.",
    target: { place: "whisperwood", room: "east-crystal", thing: "bosskey" },
    done: (s) => s.has("bosskey") || s.flags.includes("boss:whisperwood"),
  },
  {
    id: "treant",
    title: "Warden of the Hollow",
    objective: "Face the Elder Treant north of the crossroads",
    story: "It was a warden once. Ring its core, then cut.",
    target: { place: "whisperwood", room: "boss", thing: "boss" },
    done: flag("boss:whisperwood"),
  },
  {
    id: "shard1",
    title: "The First Shard",
    objective: "Take the Ember Shard",
    story: "It still burns. Bring it home before the Hollow closes over it again.",
    target: { place: "whisperwood", room: "boss", thing: "shard" },
    done: flag("shard:whisperwood"),
  },
  {
    id: "home1",
    title: "Bring It Home",
    objective: "Return to Emberfall and set the shard on the plinth",
    story: "The town will feel it before they see it.",
    target: { place: "hub", anchor: "npc-elder" },
    done: flag("talked:elder:1"),
  },
  {
    id: "west-road",
    title: "The Marsh Road",
    objective: "The west gate has drained. Enter the Sunken Crypt",
    story: "The crypt drowned when the Ember died. The second shard is somewhere under the water.",
    target: { place: "hub", anchor: "gate-crypt" },
    done: (s) => s.place === "crypt" || s.flags.includes("boss:crypt"),
  },
  {
    id: "drain",
    title: "Drown the Halls",
    objective: "Stand on the rune plate in the Drowned Hall to drain it",
    story: "The rune plates remember how the crypt was built dry.",
    target: { place: "crypt", room: "drowned-hall", thing: "plate" },
    done: flag("solved:drowned-hall"),
  },
  {
    id: "grapple",
    title: "The Captain's Hook",
    objective: "Take the grapple hook from the Skeleton Captain's vault",
    story: "The Captain kept the hook that raised the crypt's gates. He is still keeping it.",
    target: { place: "crypt", room: "captains-vault", thing: "grapple" },
    done: item("grapple"),
  },
  {
    id: "crypt-key",
    title: "Across the Cistern",
    objective: "Hook across the Cistern and drain it for the Boss Key",
    story: "The posts on the far shore were set for exactly this.",
    target: { place: "crypt", room: "cistern", thing: "bosskey" },
    done: (s) => (s.has("bosskey") && s.place === "crypt") || s.flags.includes("boss:crypt"),
  },
  {
    id: "knight",
    title: "Captain of the Drowned",
    objective: "Face the Bone Knight north of the Crossing",
    story: "Hook his shield away. Hook a post when the floor shakes.",
    target: { place: "crypt", room: "boss", thing: "boss" },
    done: flag("boss:crypt"),
  },
  {
    id: "shard2",
    title: "The Second Shard",
    objective: "Take the Ember Shard",
    story: "Two of three.",
    target: { place: "crypt", room: "boss", thing: "shard" },
    done: flag("shard:crypt"),
  },
  {
    id: "home2",
    title: "Home Again",
    objective: "Return to Emberfall with the second shard",
    story: "The plinth is warm now. One more.",
    target: { place: "hub", anchor: "npc-elder" },
    done: flag("talked:elder:2"),
  },
  {
    id: "south-road",
    title: "The Mountain Road",
    objective: "Take the south gate into the Cinder Depths",
    story: "Smoke on the south road. The last shard is under the mountain, and the mountain has been burning since it fell.",
    target: { place: "hub", anchor: "gate-cinder" },
    done: (s) => s.place === "cinder" || s.flags.includes("boss:cinder"),
  },
  {
    id: "firerod",
    title: "The Smelter's Rod",
    objective: "Take the Fire Rod from the cinderlings in the Smelter",
    story: "The miners lit the vents with a rod that never went out. Two of the mountain's own are guarding it.",
    target: { place: "cinder", room: "smelter", thing: "firerod" },
    done: item("firerod"),
  },
  {
    id: "cinder-key",
    title: "Four Braziers",
    objective: "Light every brazier in the Brazier Vault for the Boss Key",
    story: "The vault's braziers have been cold for a year. Fire them all and the door remembers.",
    target: { place: "cinder", room: "brazier-vault", thing: "bosskey" },
    done: (s) => (s.has("bosskey") && s.place === "cinder") || s.flags.includes("boss:cinder"),
  },
  {
    id: "golem",
    title: "Heart of the Cinder",
    objective: "Face the Cinder Golem north of the Crossing",
    story: "Its crust drinks steel. Fire the rod into the vent on its back, then cut while it glows.",
    target: { place: "cinder", room: "boss", thing: "boss" },
    done: flag("boss:cinder"),
  },
  {
    id: "shard3",
    title: "The Last Shard",
    objective: "Take the Ember Shard",
    story: "Three of three.",
    target: { place: "cinder", room: "boss", thing: "shard" },
    done: flag("shard:cinder"),
  },
  {
    id: "home3",
    title: "The Ember, Whole",
    objective: "Bring the last shard to Tam at the plinth",
    story: "The town will breathe again.",
    target: { place: "hub", anchor: "npc-elder" },
    done: flag("finale"),
  },
  {
    id: "epilogue",
    title: "Emberfall, Warm",
    objective: "Rest at the shrine, spend your gold, wander. The roads stay open.",
    story: "Three shards home. The plinth burns like it did before the marsh rose, and the town is yours.",
    target: { place: "hub", anchor: "shrine" },
    done: () => false,
  },
];

/**
 * The step after the furthest one that's done (the whole quest done ⇒ QUEST.length). Furthest,
 * not first-undone: a later milestone implies the earlier ones, so a save that skipped a
 * puzzle flag or an old save still lands on the right step.
 */
export function questIndex(s: QuestState): number {
  let idx = 0;
  for (let i = 0; i < QUEST.length; i++) if (QUEST[i].done(s)) idx = i + 1;
  return idx;
}

export function questStep(s: QuestState): QuestStep | null {
  return QUEST[questIndex(s)] ?? null;
}

/** Where a step's thing is inside its room, in tiles (room-local). */
export function thingTile(def: DungeonDef, roomId: string, thing: string): { tx: number; ty: number } | null {
  const r = def.rooms.find((x) => x.id === roomId);
  if (!r) return null;
  const find = (pred: (ch: string, x: number, y: number) => boolean) => {
    for (let y = 0; y < r.map.length; y++) for (let x = 0; x < r.map[y].length; x++) if (pred(r.map[y][x], x, y)) return { tx: x, ty: y };
    return null;
  };
  const kindOf = (ch: string) => def.legend[ch];
  if (thing === "boss" || thing === "shard") {
    const o = r.objects?.[0];
    return o ? { tx: o.x, ty: o.y } : { tx: 10, ty: 5 };
  }
  if (thing === "plate") return find((ch) => kindOf(ch) === "plate");
  // an item: a visible chest holding it, else the hidden chest / key spot, else the room centre
  if (r.chests?.includes(thing)) {
    let n = -1;
    const idx = r.chests.indexOf(thing);
    return find((ch) => kindOf(ch) === "chest" && ++n === idx);
  }
  if ((r.solveReward ?? "").endsWith(thing) || (r.clearReward ?? "").endsWith(thing)) {
    return find((ch) => kindOf(ch) === "chest-hidden" || kindOf(ch) === "key-drop") ?? { tx: 10, ty: 7 };
  }
  return { tx: 10, ty: 7 };
}

export function dungeonDefFor(place: string): DungeonDef | null {
  return place === "whisperwood" ? DUNGEONS.whisperwood.def : place === "crypt" ? DUNGEONS.crypt.def : place === "cinder" ? DUNGEONS.cinder.def : null;
}
