import Phaser from "phaser";
import { SWORD } from "./weapons";

export type Dir = "south" | "north" | "east" | "west";
export type Clip = "idle" | "walk" | "run" | "attack" | "attack-out" | "roll" | "hurt" | "death";

const DIRS: Dir[] = ["south", "north", "east", "west"];

/**
 * Frames are authored at assets/sprites/wren/<folder>/<dir>/<i>.png, one PNG per frame on a
 * shared 68x68 canvas (tools/normalize_frames.py), and packed into one atlas for the game
 * (tools/pack_wren.py → wren-atlas.png/json; frame names are the keys below).
 *
 * A clip is a list of (folder, frame index, duration ms) so a single playable
 * clip can stitch PixelLab's separate generations together — the sword swing
 * is wind-up in-betweens + the swing itself.
 */
type Src = { folder: string; index: number; ms: number };
const HURT_FRAMES = 4;
const DEATH_FRAMES = 6;

function seq(folder: string, count: number, ms: number, start = 0): Src[] {
  return Array.from({ length: count }, (_, i) => ({ folder, index: start + i, ms }));
}

const swing: Src[] = [
  ...SWORD.windupMs.map((ms, i) => ({ folder: "attack-in", index: i + 1, ms })),
  ...SWORD.swingMs.map((ms, i) => ({ folder: "attack", index: i + 1, ms })),
];
const recover: Src[] = SWORD.recoverMs.map((ms, i) => ({ folder: "attack-out", index: i, ms }));

const CLIPS: Record<Clip, { frames: Src[]; loop: boolean }> = {
  idle: { frames: seq("idle", 4, 200), loop: true },
  walk: { frames: seq("walk", 6, 100), loop: true },
  run: { frames: seq("run", 6, 70), loop: true },
  attack: { frames: swing, loop: false },
  "attack-out": { frames: recover, loop: false },
  roll: { frames: seq("roll", 6, 52, 1), loop: false },
  // PixelLab templates: taking-punch (flinch) and falling-back-death; frame counts set by tools/fetch_wren.py
  hurt: { frames: seq("hurt", HURT_FRAMES, 60, 1), loop: false },
  death: { frames: seq("death", DEATH_FRAMES, 110, 1), loop: false },
};
export const HURT_MS = HURT_FRAMES * 60;
export const DEATH_MS = DEATH_FRAMES * 110;

export const HERO = {
  /** shared frame canvas (px) and the row her feet stand on */
  canvas: 68,
  feetLine: 57,

  /** the atlas texture key */
  atlas: "wren",

  preload(scene: Phaser.Scene) {
    if (!scene.textures.exists(HERO.atlas)) scene.load.atlas(HERO.atlas, "assets/sprites/wren-atlas.png", "assets/sprites/wren-atlas.json");
  },

  createAnims(scene: Phaser.Scene) {
    const tex = scene.textures.get(HERO.atlas);
    for (const d of DIRS) {
      for (const [name, clip] of Object.entries(CLIPS) as [Clip, (typeof CLIPS)[Clip]][]) {
        const key = HERO.animKey(name, d);
        if (scene.anims.exists(key)) continue;
        const frames = clip.frames
          .filter((f) => tex.has(texKey(f, d)))
          .map((f) => ({ key: HERO.atlas, frame: texKey(f, d), duration: f.ms }));
        if (frames.length === 0) continue;
        scene.anims.create({ key, frames, repeat: clip.loop ? -1 : 0 });
      }
    }
  },

  animKey(clip: Clip, d: Dir) {
    return `wren-${clip}-${d}`;
  },

  /** The standing frame for a direction (atlas frame name). */
  frame(d: Dir) {
    return `wren-rot-${d}`;
  },
};

function texKey(f: Src, d: Dir) {
  return `wren-${f.folder}-${d}-${f.index}`;
}
