import Phaser from "phaser";

export type Dir = "south" | "north" | "east" | "west";
export type Clip = "idle" | "walk" | "attack" | "roll";

const DIRS: Dir[] = ["south", "north", "east", "west"];

/**
 * Frame counts per clip. PixelLab exports one PNG per frame at
 * assets/sprites/wren/<clip>/<dir>/<i>.png. A clip with 0 frames falls back
 * to the static rotation image so the demo runs before every animation lands.
 */
const FRAMES: Record<Clip, number> = {
  idle: 4,
  walk: 6,
  attack: 7,
  roll: 7,
};

const FPS: Record<Clip, number> = { idle: 5, walk: 10, attack: 18, roll: 16 };

export const HERO = {
  preload(scene: Phaser.Scene) {
    for (const d of DIRS) {
      scene.load.image(`wren-rot-${d}`, `assets/sprites/wren/rotations/${d}.png`);
      for (const clip of Object.keys(FRAMES) as Clip[]) {
        for (let i = 0; i < FRAMES[clip]; i++) {
          scene.load.image(`wren-${clip}-${d}-${i}`, `assets/sprites/wren/${clip}/${d}/${i}.png`);
        }
      }
    }
  },

  createAnims(scene: Phaser.Scene) {
    for (const d of DIRS) {
      for (const clip of Object.keys(FRAMES) as Clip[]) {
        const key = HERO.animKey(clip, d);
        if (scene.anims.exists(key)) continue;
        const frames = [];
        for (let i = 0; i < FRAMES[clip]; i++) {
          const tex = `wren-${clip}-${d}-${i}`;
          if (scene.textures.exists(tex)) frames.push({ key: tex });
        }
        if (frames.length === 0) continue;
        scene.anims.create({
          key,
          frames,
          frameRate: FPS[clip],
          repeat: clip === "idle" || clip === "walk" ? -1 : 0,
        });
      }
    }
  },

  animKey(clip: Clip, d: Dir) {
    return `wren-${clip}-${d}`;
  },

  /** Static texture for a clip/direction, falling back to the rotation frame. */
  texture(_clip: Clip, d: Dir) {
    return `wren-rot-${d}`;
  },
};
