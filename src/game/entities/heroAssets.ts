import Phaser from "phaser";
import { SWORD } from "./weapons";

export type Dir = "south" | "north" | "east" | "west";
export type Clip = "idle" | "walk" | "run" | "attack" | "attack-out" | "roll";

const DIRS: Dir[] = ["south", "north", "east", "west"];

/**
 * Frames live at assets/sprites/wren/<folder>/<dir>/<i>.png, one PNG per
 * frame, all on a shared 68x68 canvas (tools/normalize_frames.py).
 *
 * A clip is a list of (folder, frame index, duration ms) so a single playable
 * clip can stitch PixelLab's separate generations together — the sword swing
 * is wind-up in-betweens + the swing itself.
 */
type Src = { folder: string; index: number; ms: number };

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
};

export const HERO = {
  /** shared frame canvas (px) and the row her feet stand on */
  canvas: 68,
  feetLine: 57,

  preload(scene: Phaser.Scene) {
    const seen = new Set<string>();
    for (const d of DIRS) {
      scene.load.image(`wren-rot-${d}`, `assets/sprites/wren/rotations/${d}.png`);
      for (const clip of Object.values(CLIPS)) {
        for (const f of clip.frames) {
          const key = texKey(f, d);
          if (seen.has(key)) continue;
          seen.add(key);
          scene.load.image(key, `assets/sprites/wren/${f.folder}/${d}/${f.index}.png`);
        }
      }
    }
  },

  createAnims(scene: Phaser.Scene) {
    for (const d of DIRS) {
      for (const [name, clip] of Object.entries(CLIPS) as [Clip, (typeof CLIPS)[Clip]][]) {
        const key = HERO.animKey(name, d);
        if (scene.anims.exists(key)) continue;
        const frames = clip.frames
          .filter((f) => scene.textures.exists(texKey(f, d)))
          .map((f) => ({ key: texKey(f, d), duration: f.ms }));
        if (frames.length === 0) continue;
        scene.anims.create({ key, frames, repeat: clip.loop ? -1 : 0 });
      }
    }
  },

  animKey(clip: Clip, d: Dir) {
    return `wren-${clip}-${d}`;
  },

  /** Static texture fallback (rotation frame) for a direction. */
  texture(d: Dir) {
    return `wren-rot-${d}`;
  },
};

function texKey(f: Src, d: Dir) {
  return `wren-${f.folder}-${d}-${f.index}`;
}
