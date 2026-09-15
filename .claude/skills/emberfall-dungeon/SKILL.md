---
name: emberfall-dungeon
description: How to add or extend an Emberfall dungeon — ASCII room authoring, the dungeon registry, tileset chaining, new tile kinds, enemies, a boss with its own intro/bar, the tool it teaches, and the town gate that opens it. Use for "dungeon 3 / Cinder Depths", a new room, a new enemy or boss, or a new legend character.
---

# Adding a dungeon (the Sunken Crypt is the worked example)

## 1. Author the map in Python, not by hand
`tools/make_crypt.py` → `src/game/data/sunken-crypt.json` + `docs/mockup/crypt-map.png`. Copy it for the next
dungeon. Rooms are 20x12 chars, grid `cols x rows`, `entrance` names the start room and spawn tile. Send the
rendered overview to the user before building rooms ("veto anything").

Doorway conventions the code relies on: top door = 2-wide floor at row 2 cols 9-10 (`LL`/`ZZ` for locked/boss
doors sit **on** those tiles); side doors = rows 6-7 at col 0/19 (`L` pairs stacked → side-door sprite);
bottom = row 11 cols 9-10. The entrance room's bottom doorway leads to town. Cracked walls `W` come in pairs
per passage (both rooms). `t` torches go in the wall face row.

Count locks vs keys (`clearReward:"key"`, `chests:["key"]`) — the crypt needed a third key in the reliquary.
A room with `clearReward:"key"` and no `key-drop` char drops the key at room centre (fallback exists).

## 2. Register it
`src/game/data/dungeons.ts` — one `DungeonMeta` per dungeon: `tileset`, `gate`/`gateDir` (town anchor), `boss`
(RoomObject kind), `signTitle`, `bossKeyHint`, `cleansed` (shard banner), `completeEyebrow/Next`, `unlocks`
(room ids that unlock potion/bomb). Add the id to `Place` in `store.ts`. The Hub's `gateOpen()` decides when the
gate unseals; `respawn()` keeps the current place.

DungeonScene picks `dungeonFor(store.place)` in `create()`; every tileset is preloaded (`tiles-<name>`) because
the scene is *restarted*, not re-created, when the place changes.

## 3. Tileset
Chain the floor from the dungeon base tile (`lower_base_tile_id: d9e25abe-…`) so floors match; describe the
wall as the `upper`. Save `public/assets/tiles/<name>.{png,json}` (`curl` the `…/image?inline=true` and
`/metadata` URLs — no auth needed). The Wang lookup only knows wall/floor: new tile kinds (water, pit) are
**floor for the autotiler** and get their own visuals + a static-body fence in `enterRoom` (see `case "water"`).
If the returned floor is identical to another dungeon's, post-process the sheet (`tools/draw_water.py` cools
the crypt) rather than paying for another generation.

## 4. Legend → placements
`Dungeon.kindAt(tx,ty)` returns the legend kind. New kinds are handled in `enterRoom`'s switch: props via
`addSolidProp` (32x32) or a manual image + `solids` zone (tall props draw at `y-16`), decor at depth `-998`,
enemies pushed to `spawns` (gated by `cleared:` flag), interactive things pushed to their own list and cleared
in `clearRoomStuff()`. Puzzle rewards: `solveReward` `chest:<item>` (hidden chest `c`), `key`, or `drain`
(water fence drops, narration line). Plates with no block in the room are step-on plates (`checkPlates`).

## 5. Enemies and the boss
Subclass `Enemy` (`src/game/entities/`). Contract: `isAttacking` (contact hurts), `update(now,px,py)`,
`hazards`, `takeHit`/`boomerangHit`/`grappled`, `blocksNow` (clang + no damage number), `isBoss`, `swims`.
Reuse before writing: `Slime` takes `texture` (blue slime = hue-shifted PNG + clips), `ForestSprite` takes
`"bat"`, `Skeleton` takes `{captain:true}`. Register the kind in `spawnEnemy` and in the `spawns` case list.

Boss: add a row to `BOSSES` in DungeonScene (name, sub, hp, flash colour, phase-2 line, blocked/stunned
lines), implement `delayStart(ms)` (intro hold), call `scene.bossStatus("stunned"|"recovered"|"bark")`,
`scene.bossPhase2()`, `scene.bossDefeated(this)` from `onDeath`, override `die()` for a slow death. The intro
(`bossIntro`) is generic: hold, seal the south doorway (roots / slabs by dungeon), lean-in, three flashes,
roar, plate → bar. Give the bar its own frame: PixelLab 192x32 with a transparent channel, measure the channel
with PIL (longest transparent run per row), add to `BOSS_BARS` in `HUD.tsx` keyed by the boss name.

The dungeon's tool goes on RMB (`throwBoomerang()` dispatches on `store.tool`; Q cycles owned tools). A tool
that moves Wren must drive her with a tween while `body.enable=false` + `player.hold()` + `walkScripted(dir)`
(velocity is zeroed every frame during a hold).

## 5b. What the three dungeons already give you (reuse before inventing)
Tile kinds in `enterRoom`: `water`/`lava` (static fence in `waterGroup`; `swims` enemies cross; `solveReward:"drain"`
sinks water or crusts lava to `slag`), `pit`, `anchor` (+ grapple), `vent` (shared 3 s breath cycle in `updateVents`),
`brazier` (rod lights; all lit ⇒ `solveRoom`), `thorns` (doorway barricade, `thorns:<room>` flag), `plate` (step-on
when the room has no blocks), `sarcophagus`/`bones`/decor. Tools on RMB via `throwBoomerang()` dispatch:
Boomerang, Grapple (`Grapple.ts`), Fire Rod (`FireBolt.ts`). Enemy variants by option: `Slime{texture}`,
`ForestSprite("bat"|"firebat")`, `Skeleton{captain|cinder}` (cinder = front guard until `heat()`).
Side doors (`L`/`Z` pairs on col 0/19) draw the front door art rotated to face into the room
(`door-<kind>-w/e`, made in PIL) — never a composite "edge-on" slab, the user hated it. Water/lava/pit fences
come from `fenceZone()` (grows 20 px into adjacent walls so the wall-face sliver can't bypass a pool).
Key loops: every locked door must have a key reachable *without* the tool that door guards — check the graph
(the crypt shipped with the hook behind a key that was behind the hook).
Boss pattern: **the tool only works after the boss commits** (Treant: core opens ~2.4 s after a slam; Knight:
guard drops ~1.6–2.2 s after a swing/charge; Golem: only from behind) — `bossStatus("opening"/"guarded")` say
so — then `blocksNow` + a tool that opens a window (`boomerangHit` / `grappled` / `overheat`), `bossStatus`
lines in `BOSSES`, a signature attack with a warning (quake → hook a post; stomp ring; magma splashes via
`magmaSplash`), `bossDefeated` drops the shard. Register `tool` in `DungeonMeta` so status lines mention it.

Quest steps live in `src/game/quests.ts`: add the dungeon's steps (enter, tool, boss key, boss, shard, home) with
`target` rooms/things; `thingTile` finds chests/hidden chests/boss objects from the room def, so name items the
same in `chests`/`solveReward`/`clearReward`.

## 6. Verify (see emberfall-playtest)
Seed a save in the new place, `__start(room)`, walk every doorway, solve every puzzle, fight every room,
hook every anchor, kill the boss, collect the shard → complete screen text; then walk out to town and back in
through the gate. `__hudOverlaps()` during the intro and with the bar up. Commit, push, log.
