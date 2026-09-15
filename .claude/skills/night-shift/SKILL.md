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

## The cycle (the user's five beats — every wake-up runs all five, in order)

1. **Brainstorm** — 3–6 candidate increments from what shipped last, the log's "Ask" list, the user's taste
   notes (memory) and the skills. Write them in the log entry as one line each.
2. **Plan** — pick one; say what changes, which files, what "done" looks like, how it will be verified.
3. **Reality check** — what could go wrong (budget, unknown asset shape, a rule in a skill, save
   compatibility, the user's stated taste). If the check kills the pick, take the next candidate.
4. **Action** — build it small, verify with the playtest tools, commit + push.
5. **Perfection** — look at it once more as the user would (screenshots, contact sheets, overlap checker,
   copy read aloud): fix what's off, then log the cycle and refresh any skill that learned something.

## Backlog seeds (brainstorm from these; the main quest is complete end to end)

- **Regression playthrough script** (`tools/regression.js`): a fresh save → Tam → all three dungeons →
  finale, asserting flags/items/screens at each beat; run before every push of a gameplay change.
- **Gamepad** (Phaser Gamepad plugin): left stick move, A attack, B dash, X tool, Y potion, RB bomb, Start
  pause, aim = right stick or facing; HUD key hints switch when a pad is used.
- **Side quests** on the quest system: Maren wants mushroom caps (drops), Orrin wants slag chips (cinder),
  Tam's memory (find three signs); each with tracker/journal support (`side: true`, shown under the main one).
- **Room polish**: vents/lava art pass, the Whisperwood tree border, crack decals, the treasure rooms'
  reward feel (chest open flourish), title screen state after the finale.
- **Balance pass** with the regression script's numbers (hearts lost per room at tier 1/2/3 sword,
  time-to-kill per boss window) and a difficulty setting if it's lopsided.
- **World map** screen (hold M → full dungeon map with room names) and a shrine "saved" confirmation.

Skills to lean on: `emberfall-dungeon`, `emberfall-playtest`, `pixellab-assets`, `emberfall-overlap-qa`,
`emberfall-audio`, `quest-guidance`.

## Cycle checklist

- [ ] Read `docs/NIGHT_LOG.md` tail and `git log -3` — know where you are.
- [ ] Brainstorm → plan → reality check (write them down) → action → perfection.
- [ ] Verify; commit; push; log (time, item, result, spend, screenshot path); refresh skills.
- [ ] Schedule the next wake-up at the minimum delay — there is nothing to wait for.
