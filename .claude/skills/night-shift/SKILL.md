---
name: night-shift
description: Unattended build loop for Emberfall — keep shipping small, verified, committed increments from the backlog below while the user is away. Use with /loop night-shift (self-paced) or when the user says "keep working while I sleep".
---

# Night shift

The user is asleep. Nobody will answer questions. Work through the backlog in order,
one increment per wake-up, and leave things better than you found them. Stop only when
the user returns, the PixelLab budget floor is hit, or every item is done.

## Rules (non-negotiable)

1. **One increment per cycle**, small enough to finish and verify in one go. Never leave `main` broken.
2. **Verify before commit**: `npx tsc --noEmit -p .` and `npm run build` pass; for UI changes run
   `__hudOverlaps()` states (tools/playtest.js) at 2x and 3x; for gameplay changes run the scripted
   checks (`__boot()`, `__run()`, `__vhold()`, `__fight()`, `goto()`). The browser pane may be hidden —
   drive Phaser with `__run(ms)` (virtual time), not real waits.
3. **Commit + push after every accepted increment** (auto-deploys). Message says what the player will notice.
4. **Log every cycle** in `docs/NIGHT_LOG.md`: what shipped, what was skipped and why, PixelLab spend,
   plus a review image in `docs/sprite-review/` for anything visual. The user reads this first thing.
5. **PixelLab floor: stop generating below 700 generations remaining** (check `get_balance`). Reuse
   style references (`tools/fetch_objects.py`, base64 `style_image` of an existing prop). Normalise hero
   frames with `tools/normalize_frames.py`.
6. **Decisions already made stay made**: pixel-art UI only, bump-to-open, hotbar bottom-centre with its
   stone panel, minimap top-right with the room name under it, lessons beside Wren, Zelda scroll rooms,
   boomerang as the D1 tool. Don't re-litigate; don't redesign shipped screens.
7. **Design first, build second** for anything new (hub, NPCs, boss intro): draft it (design canvas or a
   review PNG) and note it in the log, then build. Unresolved taste questions go in the log's "Ask" list
   — pick the conservative option and move on.
8. Don't touch: save format compatibility (bump SAVE_VERSION only if unavoidable, note it), the repo's
   public/private state, Vercel settings, anything outside this repo.

## Backlog (in order; skip an item only if blocked, and say so in the log)

1. **Boss presentation** — intro: camera pan up to the Treant, eyes/core light up, root-quake shake,
   name banner, boss door seals behind Wren; death: flash, roots retract, shard rises with a flourish,
   door unseals. Phase-2 tell (bark darkens, faster sway).
2. **Wren hurt + death clips** (4 dirs, PixelLab v3 on the existing character, normalise to 68px). Wire
   `hurt()` and `die()` to them; death screen waits for the clip.
3. **Enemy frames** — slime hop/squash and death splat, sprite wing flutter, mushroom spore puff as real
   frames via `animate_object` (1 direction, flip for facing). Keep the tween feel where frames don't land.
4. **Room transition polish** — locked door swings open (2-frame), door-frame arch on open doorways,
   Wren auto-walks 1 tile in after a scroll, torches flicker with a light halo.
5. **Story beats** — new-game opening (3 short plates over the title world: the Ember split, three shards,
   Wren sets out), dungeon-complete screen (shard count 1/3, playtime, "return to Emberfall" stub),
   signpost lore pass (one extra sign per room max).
6. **Title screen life** — ember particles, slow camera drift over the entrance room, save card polish.
7. **Feel pass** — low-HP heart pulse + vignette, potion/bomb use feedback, key-count flash on gain/spend,
   screen-shake intensity option in pause (persisted).
8. **Minimal audio** — WebAudio synth SFX (hit, hurt, pickup, door, chest, boomerang whoosh, boss stun),
   master/SFX volume in pause. No music yet.
9. **M3 hub design** — design canvas: Emberfall town map (40x30 tiles), blacksmith / apothecary / elder /
   save shrine placement, dungeon exit gates; PixelLab: three NPC sprites (idle, down only) styled on Wren.
   Then build the hub scene with walk-in dialogue and the dungeon entrance, keeping the dungeon scene intact.
10. **Shop + upgrades** (sword tiers, armor, heart container) if 9 lands before the user is back.

## Cycle checklist

- [ ] Read `docs/NIGHT_LOG.md` tail and `git log -3` — know where you are.
- [ ] Pick the next backlog item (or the next sub-step of it).
- [ ] Build it; verify; commit; push.
- [ ] Append to the log (time, item, result, spend, screenshot path).
- [ ] Schedule the next wake-up at the minimum delay — there is nothing to wait for.
