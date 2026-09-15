import Phaser from "phaser";

/**
 * Props ship as one atlas (tools/pack_props.py) but the scenes address them by plain texture
 * keys ("chest", "torch"…). After the atlas loads, each frame is registered as its own texture
 * whose base frame is a window onto the atlas image — no copies, no call-site changes.
 */
export const PROP_ATLAS = "props-atlas";

export function preloadPropAtlas(scene: Phaser.Scene) {
  if (!scene.textures.exists(PROP_ATLAS)) scene.load.atlas(PROP_ATLAS, "assets/sprites/props-atlas.png", "assets/sprites/props-atlas.json");
}

export function registerPropAtlas(scene: Phaser.Scene) {
  const tm = scene.textures;
  if (!tm.exists(PROP_ATLAS)) return;
  const atlas = tm.get(PROP_ATLAS);
  const src = atlas.getSourceImage() as HTMLImageElement;
  for (const name of atlas.getFrameNames()) {
    if (tm.exists(name)) continue;
    const f = atlas.get(name);
    const t = tm.addImage(name, src);
    if (!t) continue;
    // the new texture's base frame becomes the atlas window for this prop
    t.get("__BASE").setSize(f.width, f.height, f.cutX, f.cutY);
  }
}

/** True when a prop is in the atlas (so the scene can skip its own load). */
export function propInAtlas(scene: Phaser.Scene, name: string) {
  return scene.textures.exists(PROP_ATLAS) && scene.textures.get(PROP_ATLAS).has(name);
}
