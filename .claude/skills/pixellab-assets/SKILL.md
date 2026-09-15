---
name: pixellab-assets
description: Generating and importing PixelLab art for Emberfall — tilesets (chaining, flat vs raised edges), 1-direction objects, boss bar frames, style references, what the generator refuses or ignores, and the download/normalise scripts. Use for any new sprite, prop, tileset or UI frame.
---

# PixelLab for Emberfall

Budget: `get_balance` first; **stop below 700 generations** (skill rule). Tier 1 = 8 concurrent jobs. Costs
seen: 1-dir object 5–6, tileset 3–4, character v3 clip ~1/direction, UI kit 20–40.

## Prompts that worked (and the trap)
- **Flat ground transitions**: pass `enhance:false`. The enhancer rewrote "no kerb, no shadow" into
  "mid-height wall of jagged organic edge" and shipped a raised ledge (town v5). Say "completely flat, same
  ground level, no wall, no kerb, no ledge, no drop shadow" and use `transition_size 0.25`, `shape_style
  round`. Reuse both base tile ids (`lower_base_tile_id`, `upper_base_tile_id`) so only the edge changes.
- **Chaining**: floors chained from `d9e25abe-d183-4e0f-bb77-0f78d8317400` (dungeon flagstone); lawn is
  `29e697b4-b544-4448-a9bd-4c6607814e1b`; crypt wall `6f602e12-66d8-4da6-8550-21218efe1072`. A chained floor
  comes back identical — recolour the sheet in PIL if the dungeon needs its own mood.
- **Style references**: `style_image.url` pointing at the deployed asset
  (`https://emberfall-alpha.vercel.app/assets/...`) — typed base64 gets truncated in transit and 422s.
- **Orientation is ignored**: asking for a side-on gate returned the front gate again. Compose variants in PIL
  from the existing sprite instead (`tools/make_side_gate.py`).
- **Flat fills fail**: a seamless water tile 422s ("Source PNG is fully transparent" after background
  removal). Draw tiling fills in Python (`tools/draw_water.py`, 4-frame loop with a torus-wrapped ripple).
- **Boss bar frames**: 192x32, `view:"side"`, "transparent channel between the rails", style ref = the treant
  bar. Measure the channel: longest alpha-0 run per row (PIL) → `[x, y, w, h]` in `BOSS_BARS`.
- Recolours for enemy variants (blue slime) are a hue shift of the PNG **and every clip frame**; register the
  clips as `<texture>-hop-loop` / `<texture>-splat` so the class can pick them by texture name.

- **style_image must fit the target canvas**: a 64px reference for a 32px object is rejected ("must fit the
  native canvas") — pick a reference the same size or smaller (bush.png for 32px props, anchor.png for 32x48).
- Descriptive floors drift: "dark basalt" came back slate blue. Recolour in PIL by hue band (`tools/draw_lava.py`
  warms blues to ash) instead of re-rolling; keep `<name>-raw.png` so the step is repeatable.
- Recolour variants (magma slime, fire bat) are hue shifts of the base PNG **and** its clips; a shift of a
  purple sprite to "orange" needs trial (wings turned green at +0.28, brown at +0.16) — always look at the sheet.
- Boss-consistent sprites: `style_image` = the boss itself with "copy him faithfully, only remove X" gave a
  matching shieldless knight; the same trick should work for damage states.

## Fetching
- Objects: `python tools/fetch_objects.py name=object_id …` → `public/assets/sprites/props/name.png`;
  clips: `--anim clip=obj/anim:frames`. Backblaze needs a curl-like User-Agent (the script sets it).
- Tilesets: `curl -A curl/8.4.0 https://api.pixellab.ai/mcp/tilesets/<id>/image?inline=true` and
  `/metadata` → `public/assets/tiles/<name>.{png,json}` (no auth needed for these two).
- Wren clips: `tools/fetch_wren.py`, then `tools/normalize_frames.py` (v3 clips are 68px, templates 48px).
- Always build a review strip in `docs/sprite-review/` (x3/x4 NEAREST) and look at it before wiring.

## Naming / registration
Prop textures preload from the lists in `DungeonScene.preload` and `HubScene.preload` (both scenes preload
what they draw; a missing key renders a green box). Icons live in `public/assets/ui/icons/` and load as
`icon-<name>`. Enemy/door/water clips: `ENEMY_CLIPS` + `ENEMY_FPS` (folder name == clip key, frames `0.png…`).
