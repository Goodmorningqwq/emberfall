---
name: emberfall-overlap-qa
description: The overlap and readability checklist for Emberfall — world depth sorting (Wren vs props, trees, gates), ground edges that read as ledges, and HUD elements colliding (dialogue, tags, coach, banners, boss bar, minimap name). Run after any change to scenes, props, tilesets or HUD layout, and whenever the user says something "overlaps" or "looks like it has height".
---

# Overlap QA

The user notices three families of overlap. Check all three, every time.

## A. World depth (who draws in front)
Rule everywhere: `depth = feet y` for characters, `depth = y + h - 6` (sprite bottom) for props. So:
- A prop's **solid footprint** must stop Wren before her sprite can straddle its base: props she can walk up
  to from below need `foot` bottoms at the sprite base (houses `[0.2,1.4,3.6,2.4]` tiles), tall props draw at
  `y-16` with the zone at the foot (anchor, sarcophagus).
- **Tree borders**: two rows of 48x64 trees; the wall rect keeps her feet ≥ 100 px (top) and ≤ H-74 (bottom) so
  she is in front of the top rows and above the bottom canopy, never "in" the hedge (HubScene border rects).
- **Gates you walk through sideways** are two sprites (top post at `y+16`, bottom post at `y+98`) so she sorts
  between them; a single tall sprite can't.
- Boss room: `sealDoorway` slabs/roots go in `roomStuff` with their own zones.
- Verify by walking Wren to each edge of each prop (`__tp`, `__vhold`) and screenshotting; her head may cover a
  canopy she stands under (Zelda rule) but she must never be *behind* something whose base is above her feet.

## B. Ground that reads as height
The "path is raised" complaint came from the tileset's transition, not from sprites: a dark band + stacked
stones on the lawn/path edge (PixelLab's enhancer added "mid-height wall"). Check every new transition at x3
against the flat-edge tileset (`docs/sprite-review/town-flat-vs-kerb.png`): grass feathering over stone, no
continuous dark rim, no stacked blocks. If it has a rim, regenerate with `enhance:false` (see pixellab-assets),
don't patch sprites around it.

## C. HUD
`window.__hudOverlaps()` (tools/playtest.js) intersects the boxes of `.hud .minimap-wrap .hotbar .coach .wtag
.banner .card .bossplate.intro .bossbar-* .bossstatus .dialogue` and flags anything outside the frame. Run it at
`--s` 2 and 3 in each of these states: dialogue open (+ tag + coach), shop, item banner, room banner, narration,
boss intro plate, boss bar + status, low HP vignette. Expected: `[]`.
Layout rules that keep it green: dialogue bottom = `58px*--sh + 12px*--s` (clears the hotbar); coach hidden
while a banner or tag shows; **world tags hidden while a dialogue or the bag is open**; tags flip left past 62%
width (`wren-right`/`boss-right`); hotbar ghosts when Wren walks under it; `.minimap-name` wraps at
`120px*--s` (long room names like "Hall of the Bone Knight").

## Report
Put before/after captures in `docs/sprite-review/` and one line per family in `docs/NIGHT_LOG.md`. If a family
was not checked, say so — "no overlaps found" only counts for the states actually run.
