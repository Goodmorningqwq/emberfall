---
name: quest-guidance
description: Designing and reviewing quest guidance in Emberfall (and any top-down action game) — objective wording, the tracker, journal, "new objective" beats, the GPS chevron/trail/minimap marker, when explicit guidance helps or hurts, and the QA checklist. Use when adding quest steps, changing the tracker/journal, or when the user says players feel lost or over-led.
---

# Quest guidance

## What the research says (short)
Wayfinding cues sit on a certainty ladder (Level Design Book): subtle world patterns → lighting/sightlines/signage →
breadcrumbs/scripted leads → static barriers and **always-on HUD markers (95–98%)**. HUD markers make sure nobody
is stuck, but heavy landmark+marker use turns a place into a "controlled theme park"; keep the loudest cue for when
the quieter ones can't work (another room, far away, first time). Quest UX (F. Tang, Game Developer): always show
title + goal on the main screen; show degree of completion; change the icon/sound when progress happens; give a
clear completion signal; and **never leave the player questless** — a gap after completion disengages faster
than intrusive guidance annoys. Genshin's beam only appears past ~50 m; its "Navigate" pins the map first.

## How Emberfall does it (so a change lands in the right place)
- `src/game/quests.ts` — the main quest as steps `{id, title, objective, story, target, done}`; progress is
  **derived** (`questIndex` = step after the furthest `done`), never saved. Targets name a place + room + thing
  (`thingTile` resolves chests/hidden chests/boss objects) or a town anchor. Last step is an open epilogue so the
  tracker never goes empty.
- `src/game/guide.ts` — `GuideDrawer`: a small gold square (the minimap's mark) that hovers over the objective
  when it's on screen and sits at the edge of the view in its direction when it isn't (Star Rail style; the
  user rejected a big chevron + trail as too loud); off when `settings.guide` is off and `announceQuest` (NEW OBJECTIVE plate + narrated story once per step, only
  in a quiet moment, ≥2.4 s after the previous step completed so the strike-through reads first).
- Scenes: `DungeonScene.updateGuide` (in-room → the thing; other room → `Dungeon.nextHop` BFS over open
  doorways, first hop's doorway; unreachable → as the crow flies, "beyond the wall"; other place → the way out),
  `HubScene.updateGuide` (NPC/gate anchors). Scenes set `questNote` for sub-counts ("2 of 4 braziers lit").
- HUD: tracker **under the minimap, top-right** (`.right-col`; the user wants it where the map is, like
  Genshin/Star Rail), right-aligned, 88% opacity: TITLE · n/N · M, objective, note, "right here / this room /
  2 rooms away / the east gate", strike-through flash on completion, journal (M) with done/current/next and every story
  line, minimap marker on the objective room. Pause: "Quest guide: Arrow on / Tracker only".

## Side quests
`SIDE_QUESTS` in `quests.ts`: `{id, giver, title, objective, offer, thanks, counter, need, available, reward}`.
State is derived: `side:<id>:on` / `side:<id>:done` flags + `store.counters[counter]` (saved). The Hub offers on
bump when `available` holds (plate + offer line), turns in on the next bump when the count is met (thanks +
reward), and only then opens the giver's stall. The world tallies with `DungeonScene.tally()` only while the quest
is on. Anything counted must be re-obtainable (mushrooms regrow in cleared rooms; signs are re-readable) — a side
quest the player can strand themselves on is worse than none.

## Writing objectives
Imperative, one action, with the place: "Ring the crystals east of the crossroads for the Boss Key". Name what
the player sees (a room name, a gate, a person), not a flag. Title = the chapter (2–4 words). Story = one line the
narrator can say. Keys: `objective` ≤ 70 chars so the tracker stays 2 lines at 1x.

## Adding a step
1. Decide the `done` predicate from existing flags/items (`boss:<d>`, `shard:<d>`, `solved:<room>`, `talked:...`,
   `has(item)`), or add a flag where the event happens. Later milestones must imply earlier ones.
2. Pick the `target`: for items, the room whose `chests`/`solveReward`/`clearReward` names it.
3. If the step has a count, set `questNote` from the scene while it changes, clear it on room change.
4. Run the QA below.

## QA checklist (scripted, see emberfall-playtest)
- Fresh save: tracker shows step 1 and the chevron points at Tam; the plate + story play once (flag `quest:<id>`).
- Every step: `store.guide` has `roomId` = target room and a sensible `where`; walk it — the first hop is always an
  open doorway (locked doors count, cracked walls don't until broken).
- Complete a step by flag: old objective strikes through, next plate lands ~2.5 s later, journal moves it to ✓.
- `__hudOverlaps()` with the tracker up in dialogue / shop / boss bar / banner states; at --s 2 and 3.
- Old saves: seed a save missing intermediate flags (e.g. no `solved:drowned-hall` but `boss:crypt`) and check
  `questIndex` lands after the furthest milestone.
- Guide off in settings: tracker text and minimap marker remain; chevron and dots don't.

## The dungeon map (journal, M)
- Rooms are tiles, not labels: names in cells never fit at pixel-font sizes. Glyphs carry the meaning (you, boss,
  objective, chest still shut), the caption under the grid carries the names ("The Crossing" / "Captain's Vault ·
  2 rooms away" / "back in town"), the eyebrow counts rooms seen.
- Pixel glyphs in React: `Px({rows, color, size})` in HUD.tsx — a one-pen box-shadow drawing; 2 UI px per cell
  reads at 1x, 1 px does not.
- The minimap (top-right) is the at-a-glance twin: same seen/here/boss/objective data, no text but the room name.
- Town map (journal in the hub): `tools/draw_townmap.py` draws the terrain from `emberfall-town.json` (rerun it if
  the town map changes); the HUD overlays Wren (`store.townTile`, set by HubScene each frame), NPCs and gates from
  the JSON legend, and the objective from `guide.anchor` (the hub passes its target kind to `GuideDrawer.point`).
