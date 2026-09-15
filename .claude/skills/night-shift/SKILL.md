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

Items 1–10 (boss presentation … shops) and the Sunken Crypt shipped (see `docs/NIGHT_LOG.md`). Next:

1. **Crypt polish pass** — blue slime tint check in water, drain sound (own synth, not "crack"), skeleton
   swing arc visual, bat squeak, captain name tag on entry ("SKELETON CAPTAIN" room banner sub), grapple
   lesson copy check, Bone Knight charge dust. Fix the knock-through: hurt knockback can push Wren past the
   sealed boss doorway (she ended up in the Crossing mid-fight) — clamp knockback or widen the seal zones.
2. **Hub leftovers** — tree border reads as hedge (mix 2–3 tree sprites / gaps), "bush" prop is a stone
   (real bush sprite), double-load warning ("Failed to process file … lantern") — preload each hub prop once.
3. **Cinder Depths (dungeon 3) design** — map draft only, sent to the user: fire/lava gimmick, a third tool
   (ideas: fire rod, iron boots), the last shard, the Cinder boss. Do not build rooms before a veto window.
4. **Armour tiers at Orrin** (skipped in 10): leather/iron, damage taken -1 per tier, hint text.
5. **Audio pass** — replace the synth placeholders that sound worst (hit, potion, door), add a simple ambient
   loop per place (town birds, wood wind, crypt drips) at low volume behind the SFX setting.

Skills to lean on: `emberfall-dungeon` (rooms/registry/enemies/boss), `emberfall-playtest` (scripted checks),
`pixellab-assets` (prompts, fetching, traps), `emberfall-overlap-qa` (depth + HUD checklist).

## Cycle checklist

- [ ] Read `docs/NIGHT_LOG.md` tail and `git log -3` — know where you are.
- [ ] Pick the next backlog item (or the next sub-step of it).
- [ ] Build it; verify; commit; push.
- [ ] Append to the log (time, item, result, spend, screenshot path).
- [ ] Schedule the next wake-up at the minimum delay — there is nothing to wait for.
