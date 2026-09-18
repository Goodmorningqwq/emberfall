# Emberfall — ideas implementation plan

noop_streak: 0

## Source snapshot

- UTC: 2026-09-18T12:15:00Z
- SHA256: 5F008D971D38D515C5924D2B5953366A47EF24A7E1B7D4A15F6B014379ECEADC
- Bytes: 31705
- Source path: `C:\Users\tsang_9vomfkf\Downloads\game\docs\IDEAS.md`
- IDEAS.md self-grounds against `main` @ `81c9e5d` (2026-09-17), regression 34/34
- Source compressed (one-line evidence per judged idea). Numbered ideas now #1–#52 plus shrine flash.
- This fire judges **#50–#52**. Verdicts for #1–#49 + S are unchanged (#47–#49 already judged last fire; IDEAS still labels them unjudged because it had not seen that snapshot). SFX table is **46 rows**, not 58 (re-counted). Sign coverage and 34 checks re-measured, unchanged. No `Feedback to planner` block.

Skip rule for the next fire: if this SHA256 still matches `IDEAS.md` **and** "Feedback to planner" is empty or already answered here, write nothing.

## Response to feedback

none — IDEAS.md has no "Feedback to planner" section this pass. Nothing to accept, reject, or settle.

## How to read this plan

- Paper only. Do not apply these steps under `Downloads/game/` except this file.
- Counts: **52 numbered ideas + 1 shrine flash**. The three "Asks for the user" stay questions, not features.
- Verdicts: **keep 32 / shrink 16 / drop 5**.
- Realism across those 53: **yes 36 / partial 12 / no 5**.
- Several items are already partly shipped or already shrunk in IDEAS.md. Remaining work is named so implementers do not redo them.
- This pass is a critic, not a backlog cheer. Bugs and save-safety beat content multipliers. Enablers with nothing to enable get dropped.

---

## Scoreboard

| # | Idea | Verdict | Realism |
|---|------|---------|---------|
| 1 | Difficulty setting | keep (already shrunk) | yes |
| 2 | Touch controls | shrink (disclaimer only) | partial |
| 3 | Gamepad HUD hints | keep | yes |
| 4 | NG+ / post-finale | keep (already shrunk) | partial |
| 5 | Telemetry | keep (already shrunk) | yes |
| 6 | Data-driven weapons | drop | no (as a task now) |
| 7 | Chest coin-pop | keep (already shrunk) | yes |
| 8 | Props atlas leftover | keep (verify, not rebuild) | yes |
| 9 | Boss replay | shrink (post-finale only) | partial |
| 10 | SFX samples | shrink (synth retune) | partial |
| 11 | Bestiary | shrink (kill counts, no dex) | yes |
| 12 | Key rebinding | drop | no |
| 13 | Sign coverage | keep | yes |
| 14 | New-game confirm | keep | yes |
| 15 | Auto-pause on hide | keep | yes |
| 16 | Save export/import | keep | yes |
| 17 | Motion-setting leaks | keep | yes |
| 18 | Dialogue freezes the room | keep | yes |
| 19 | Old/corrupt save line | keep | yes |
| 20 | Post-finale gold sink | shrink (one flavour buy) | partial |
| 21 | One-way dungeon shortcuts | shrink (one dungeon trial) | partial |
| 22 | Story-so-far journal | shrink (paste intro plates) | yes |
| 23 | Localisation-readiness | drop | no |
| 24 | Autosave on Complete / hide | keep | yes |
| 25 | Bomb lesson never starts | keep | yes |
| 26 | Regression extras / prod harness | shrink (dev extras only) | partial |
| 27 | Tile-list / depth-sort cost | shrink (measure + depth guard) | partial |
| 28 | Unused Google font | keep | yes |
| 29 | Prod boot failure is silent | keep | yes |
| 30 | Full autotile on wall break | drop | no (until #27 measures a hitch) |
| 31 | Dev room-data validation | keep | yes |
| 32 | Silent save failure | keep | yes |
| 33 | Screen-reader HUD | shrink (live regions + alts) | partial |
| 34 | Town signs | keep | yes |
| 35 | Whole-store HUD subs | shrink (drop dead facing/action) | yes |
| 36 | `?debug=1` flag | keep (flag + console; no overlay) | yes |
| 37 | HUD text-scale setting | drop | no |
| 38 | Per-dungeon clip preload | shrink (skip unused clips) | partial |
| 39 | Build stamp on title | keep | yes |
| 40 | Fire-rod hit is silent | keep | yes |
| 41 | Voice prefetch while voice is off | shrink (Wren preload only) | yes |
| 42 | Title shows savedAt | keep | yes |
| 43 | Death plate always says Whisperwood | keep | yes |
| 44 | Pad cannot close a sign box | keep | yes |
| 45 | Ambient bed ignores tab-hide | keep | yes |
| 46 | Later-dungeon death SFX | shrink (texture key, existing rows) | yes |
| 47 | Save shadow copy (`.bak`) | keep | yes |
| 48 | Wren swing arc | shrink (draw only, no whoosh) | partial |
| 49 | Favicon | keep (link an existing PNG) | yes |
| 50 | Voice-off default silenced low-HP audio | keep | yes |
| 51 | Pad cannot leave pause | shrink (Start unpauses only; journal is not Start) | partial |
| 52 | Playtime is wall-clock | keep (fold on pause/leave-game; not a subscriber "tick") | yes |
| S | Shrine saved flash | keep | yes |

**Do next, if anyone implements:** 43, 25, 40, 44, 51, 14, 19, 47, 24, 32, 15, 45, 17, 18, 29, 28, 49, 41, 50, 39, 36, 31, then 3 / 7 / S / 48 / 8 / 13 / 34 / 42 / 52 / 46, then 1 / 22 / 11 / 4 / 35. Stop before 2's stick, 9, 16-as-a-project, 20, 21, 26b, 27's Layer rewrite, 33-as-a-canvas-RPG, 38-as-an-atlas. Never: 6, 12, 23, 30, 37, mute townsfolk because Wren's voice is off, new death-SFX samples, a 4th dungeon, remote telemetry, enemy-count difficulty, sample SFX without files, `__game` on the Vercel bundle, IndexedDB/File-System saves, PixelLab favicon, `slashArc`'s `whoosh` on Wren, Start-opens-journal, a heartbeat `SFX` row unless you are already in `audio.ts`.

---

## 1. Difficulty setting

**Verdict: keep.** Already shrunk in IDEAS.md to incoming damage + heart-drop chance. That is the right size.

**Grounding:** The night-shift backlog parked this for "if it's lopsided." There is still no `difficulty` string in `src/`. Pause already cycles Music / Sound / Quest guide / Voice / Screen shake, and settings live on `emberfall.settings`, not the save. Player value is real (one-sitting testers vs people who bounce on the Treant). Scope is a solo afternoon. It does not displace content if it stays two multipliers. Enemy-count scaling would.

**Smallest shippable:** Easy / Normal / Hard in pause. Hard = 2× incoming half-hearts, fewer heart drops. Easy = more heart drops, incoming stays 1. No starting-hearts cut unless the user picks that ask.

**Realism: yes.** `Player.hurt` and `DungeonScene.onEnemyDied` (`Math.random() < 0.2`) are the two knobs.

### Implementation difficulties

- **Easy:** `settings.difficulty: "easy" | "normal" | "hard"` default `"normal"`. Pause row. Multiply incoming after armour glance. Swap the 0.2 heart-drop constant.
- **Medium:** Starting hearts on `newGame` only (easy 8, hard 4). Do not rewrite existing saves. Hard starting-hearts is harsher than damage×2 — leave off unless asked.
- **Hard:** Enemy-count / density. Breaks ASCII rooms, `tools/regression.js` fight loops, mushroom-cap spawns.
- **Hard:** Per-enemy damage tables. Most contact still uses default `dmg = 1`.

### Plan (do not apply)

1. `src/ui/store.ts` — add `difficulty` to `Settings` and `readSettings()` defaults. No `SAVE_VERSION` bump.
2. `src/ui/HUD.tsx` — one `.pause-settings` row, cycle Easy → Normal → Hard.
3. Helper `diffMul()`: easy `{ incoming: 1, heartDrop: 0.4 }`, normal `{ 1, 0.2 }`, hard `{ 2, 0.08 }`.
4. `Player.ts` `hurt()` — `damage(Math.max(1, Math.round(dmg * incoming)))` after armour.
5. `DungeonScene.ts` `onEnemyDied` — use `heartDrop` instead of `0.2`.
6. Do not touch regression defaults.

---

## 2. Touch controls

**Verdict: shrink.** The virtual stick is not a "medium" job. Until the user answers the desktop-only ask, ship a disclaimer, not a control scheme.

**Grounding:** Vercel will get phones. The game is `Scale.FIT` + zoom 2, React HUD with `#ui { pointer-events: none }`, and `Player.ts` treats every `pointerdown` as mouse attack and forces `inputMode: "kb"`. A stick + Attack + Dash that does not fight the HUD, the bag, dialogue, or multi-touch is a week of fiddly work and will still feel worse than WASD. That displaces actual bugs on this list. Fun/fit: this is a mouse-aim action RPG; phone play is a different game.

**Smallest shippable:** Title + pause line "Keyboard or gamepad. Desktop recommended." Optional: ignore coarse-pointer clicks so phones do not wildly swing. Drop the stick until the user says invest.

**Realism: partial.** Disclaimer: yes. Stick: technically possible, not a good use of this project right now.

### Implementation difficulties

- **Easy (this verdict):** Copy on `Title.tsx` / pause. No gameplay change.
- **Medium:** HTML stick + two buttons, `inputMode: "touch"`, `activePointers >= 3`, stop `pointerdown` from becoming attack.
- **Hard:** Full action set, safe-area, two-stick aim, not eating HUD clicks, Phaser objects vs `Scale.FIT`.

### Plan (do not apply)

1. `Title.tsx` — muted line under the menu.
2. Pause controls blurb: same sentence.
3. Do not add overlay buttons. Do not change `Player.ts` until the ask is answered yes.

---

## 3. Gamepad-aware HUD hints

**Verdict: keep.** Small, already half done, actually visible to pad players.

**Grounding:** Pad movement/actions work (`Player.ts`). Coach + hotbar already swap on `inputMode`. Remaining hardcoded keyboard: pause list, `DialogueBox` `"E"`, journal `"M"`, bag `ITEM_META` `"RMB"`. High polish, low scope. Does not invent systems. Pause copy should also say arrows work (`createCursorKeys()` already does) — that is the leftover of dropped #12. Unplug: `Player.pad()` returns undefined when `gp.total === 0` and nothing listens for `gamepaddisconnected`, so hints can stick on pad after unplug. One-line companion, not a new idea.

**Smallest shippable:** Pause + dialogue + journal follow the existing `K` map. Pad Start currently cannot unpause (#51) — hint strings without that poll are a lie.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Pause `.controls` shows the pad legend when `inputMode === "pad"`. Dialogue continue `pad ? "A" : "E"`. Journal close uses `K.journal`.
- **Medium:** `ITEM_META` dual strings / `hintFor(id, mode)`. Do not rewrite saved item `hint` fields.
- **Hard:** Xbox vs Nintendo vs PlayStation glyphs. Not needed; current A/B/X/Y match `readPad`.

### Plan (do not apply)

1. Lift `K` in `HUD.tsx` so Coach, hotbar, pause, dialogue, journal, quest eyebrow share it.
2. `DialogueBox` continue hint follows `K`.
3. Pause: pad → pad legend only; kb → WASD/LMB and drop the redundant Pad row.
4. Optional bag hints. Pause line: arrows work too.
5. On `gamepaddisconnected` (or `pad()` undefined for a frame), `setInputMode("kb")`.
6. Dialogue dismiss on pad is **#44**, not a hint-string job. Do both in the same pass if you touch `readPad`.

---

## 4. Post-finale loop (NG+)

**Verdict: keep** the already-shrunk version: `newGamePlus()` flag wipe + Complete button + three NPC lines. Not a 4th dungeon. Not NG+ combat modifiers.

**Grounding:** Complete copy already admits "new roads will open in later builds." Town wander after the plinth is thin but honest. NG+ reuses rooms and flags; a 4th dungeon is ~700 PixelLab gens and is the wrong answer to the user ask. Player value is a second lap, not new identity. Scope is medium because flag policy is easy to get wrong (wipe `chest:`/`boss:`/`shard:` and you also have to not brick QUEST derivation). Displaces a new dungeon, which is the point.

**Smallest shippable:** Button on Complete. Keep items/tiers/gold/hearts/lessons. Strip dungeon flags. `ngplus` as a flag, not `SAVE_VERSION` 6. One Tam / Maren / Orrin line when `finale` is set.

**Realism: partial.** Flag wipe is real. "The town reacts" beyond three strings is not. Chest re-loot is a side effect of the wipe, not extra systems.

### Implementation difficulties

- **Easy:** Finale NPC strings. Drop the "later builds" sentence.
- **Medium:** `newGamePlus()` in `store.ts`. Prefix strip: `cleared:`, `visited:` (dungeon rooms only — keep `visited:shrine` / town), `chest:`, `solved:`, `boss:`, `shard:`, `key:`, `door:`, `unlock:`. Keep `finale` and add `ngplus`. Return to hub.
- **Medium:** Per-dungeon reset without full NG+. Not in v1.
- **Hard:** NG+ HP/drops before any weapon table. Out of scope.
- **No:** 4th dungeon.

### Plan (do not apply)

1. `store.ts` — `newGamePlus()` as above.
2. `HUD.tsx` `Complete` — "New Game+" next to Keep exploring.
3. `HubScene.ts` — one finale line each, never before `mainPending` / side-quest priority.
4. Do not auto-respawn bosses (that is #9). Do not add NG+ to the 34-check path.

---

## 5. Telemetry / play-depth data

**Verdict: keep** the already-shrunk local log. Not a HUD panel. Not a backend.

**Grounding:** `counters` + `bump()` already persist, but `fresh()` wipes them, so they cannot be the balance log. `playtimeMs` exists. Regression already tables hearts-lost per beat. Player value is near zero — this is for the person tuning #1. Scope is small if it stays `localStorage` + `?debug=1`. Worth doing before guessing at Easy/Hard numbers. Not worth a stats screen.

**Smallest shippable:** `emberfall.telemetry` key. Deaths per place, hearts lost per room, boss durations. `console.table` on `?debug=1`. Run-length inherits **#52** — do not log wall-clock as "playtime" until that fold exists.

**Realism: yes.**

### Implementation difficulties

- **Easy:** `bump` analogues off `SaveData`. Hook `die`, `damage`, boss start/`boss:<id>`.
- **Medium:** Separate blob so New Game does not wipe history.
- **Hard:** Remote telemetry / accounts. Not requested.

### Plan (do not apply)

1. New `src/game/telemetry.ts` (or a few functions in `store.ts`) writing `localStorage` key `emberfall.telemetry`.
2. Hooks: `die`/`respawn` + place, `damage` + current room, boss intro start and flag set.
3. Readout: `?debug=1` `console.table`. No pause panel.
4. Leave `tools/regression.js` as the scripted source of truth.

---

## 6. Data-driven weapons

**Verdict: drop.** An enabler with nothing to enable. Do not spend a cycle on it.

**Grounding:** `weapons.ts` already tables sword timing. Boomerang / fire-rod / grapple use file-level constants. Sword *damage* is `store.swordTier`, not the table. Collapsing three numbers into one file does not change a swing, a shop price, or a drop. A generic projectile factory is fantasy until a 4th tool exists, and a 4th tool is not on this list. Time spent here displaces #14/#18.

**Smallest version:** Leave the comment. Move constants the day a 4th tool is actually authored.

**Realism: no** as a current task. The table-of-numbers version is yes-and-pointless.

### Implementation difficulties

- **Easy:** Copy SPEED/RANGE into `weapons.ts`. Player-facing delta: none.
- **Medium:** One `WEAPONS` record consumed by entities + `ITEM_META` + shop.
- **Hard:** Generic factory + loot table.

No plan. Do not apply.

---

## 7. Chest-open flourish / reward feel

**Verdict: keep** the leftover coin-pop only. The rest already shipped.

**Grounding:** `openChest` already squash-tweens, `hitStop(40)`, light shaft, spark burst, rising icon, 1300 ms hold, `sfx("chest")`. What remains is "gold fountains" still being spores, not coins. Pure game-feel, no new art (`icon-coin` is loaded). Must not add hold time (`regression.js` `openChests` waits ~1600 ms).

**Smallest shippable:** 6–8 `icon-coin` tweens on `contents === "gold"`, ~500 ms, gravity. Keep the 1300 ms hold.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Coin images at `(cx, cy)`, random vx, gravity ~400, `setDepth(chest+3)`.
- **Medium:** Per-contents flourish. Banner already differentiates; do not stack hold.
- **Hard:** New chest-open frames (PixelLab). Not needed.

### Plan (do not apply)

1. In `DungeonScene.openChest`, after the spark explode, if gold: spawn coins as above.
2. Hold stays 1300 ms.
3. No new art. Hub shop buys stay `sfx("chest")` only.

---

## 8. Props atlas leftover

**Verdict: keep** as verify-not-build. Do not re-litigate the atlas.

**Grounding:** `propAtlas.ts` + `pack_props.py` are live; both scenes' preloads `void p` the static list. Remaining requests (measured in IDEAS): 70 anim frames via `ENEMY_CLIPS`, Hub portraits/icons, and `HUD.tsx` HTML `<img src="/assets/sprites/props/signpost.png">`. Packing the 70 clips is a different atlas layout. Optional only if load time is actually bad.

**Smallest shippable:** Re-pack static props if a stem is missing. Point the signpost `<img>` at a UI copy. Leave anim clips.

**Realism: yes — mostly shipped.**

### Implementation difficulties

- **Easy:** Re-run packer; fix the one HTML `<img>`.
- **Medium:** Pack `ENEMY_CLIPS` (frame counts live in `DungeonScene.ts` L30–31). Skip unless measured.
- **Hard:** Deleting source PNGs from `public/` — packer and PixelLab scripts expect them.

### Plan (do not apply)

1. `python tools/pack_props.py` and check stems vs `void p` + hub `PROPS`.
2. Dialogue signpost `<img>` → `/assets/ui/…` copy (HTML cannot use the Phaser atlas).
3. Leave anim clips and NPC portraits as individual loads.

---

## 9. Boss replay hooks

**Verdict: shrink.** Post-finale trial only. No shard, no `completeDungeon`, no mid-quest rematch.

**Grounding:** Trophy on the minimap already exists (`DungeonMap` skull mutes after `boss:<place>`). Re-entry is gated at `enterRoom` (`bossHere` requires `!hasFlag(boss:<id>)`). A rematch is fun once; it is a QUEST landmine if it fires during the story. Needs #4's town to still be alive, but does not need NG+ combat. Displaces writing (#13) if treated as a "content" item.

**Smallest shippable:** After `finale`, three buttons. Transient `replayBoss`. Skip rewards.

**Realism: partial.** The spawn path exists. Reward/QUEST gating is the actual work.

### Implementation difficulties

- **Easy:** Journal caption "Defeated" on the boss hall. Trophy is done.
- **Medium:** Transient `replayBoss: Place | null`. `enterRoom` honors it. `onEnemyDied` skips shard + `completeDungeon`. Death already dumps Wren at that dungeon's entrance.
- **Hard:** In-run replay before finale (`QUEST` `done: flag("boss:…")`, Tam's shard lines).
- **Hard:** NG+ scaled bosses (needs #1, still not #6).

### Plan (do not apply)

1. Enable only when `flags.includes("finale")`.
2. Hub pause or Complete: three buttons.
3. `DungeonScene.enterRoom` — if `replayBoss === this.dungeon.def.id` and this is the boss room, treat as `bossHere` even with the flag. On kill: "Trial complete", clear `replayBoss`, do not `giveItem("shard")`.
4. Keep persistent `boss:<id>`. No 4th boss.

---

## 10. SFX stand-ins

**Verdict: shrink** to retuning four synth entries. Sample swap is blocked.

**Grounding:** `sfx(name)` indexes `SFX` in `audio.ts`. `public/assets/` has fonts, sprites, tiles, ui, voice — no `sfx/`. Docs have preview WAVs under `docs/audio-review/`, which are not game assets. The table is **46 rows** (`audio.ts` L517–567, `hit`…`heat`) — the old "58" count was stale; every row still has a call site. Wholesale replacement is a content project pretending to be a drop-in. Player hears hit/hurt/chest/swing constantly; those four envelopes are the whole idea.

**Smallest shippable:** Edit `hit`, `hurt`, `chest`, `swing` in the table. Zero new files, zero call-site changes.

**Realism: partial.** Code path for samples is easy; assets do not exist.

### Implementation difficulties

- **Easy:** Retune four synth entries.
- **Medium:** `load.audio` + buffer with synth fallback. Needs licensed/generated WAVs under `public/assets/sfx/`.
- **Hard:** Replace the whole table, variations, spatialization.

### Plan (do not apply)

1. Retune `hit`, `hurt`, `chest`, `swing` in `src/game/audio.ts` only.
2. Do not add a loader branch until files exist.
3. Do not change `sfx("hit")` call sites.

---

## 11. Bestiary / kill tally

**Verdict: shrink.** Kill counts in the journal. No lore dex, no PixelLab portraits, no new save field.

**Grounding:** Completionists like tallies. The three dungeons plus re-fights give the number somewhere to go. IDEAS overclaims `e.kind` — `Enemy` has **no** `kind` field; `onEnemyDied` branches on `instanceof` and `sprite.texture.key`. `bump("kill:<key>")` from that one death path is still cheap and rides existing `counters`. Invented lore lines are a writing project that duplicates #13. A Pokédex UI is padding.

**Smallest shippable:** `bump` on death by texture key (or a 10-line map of constructor → id). One journal block: name + count. Reuse the enemy sprite as an `<img>` if a static PNG exists; otherwise text only.

**Realism: yes** for counts. No for a bestiary-as-product.

### Implementation difficulties

- **Easy:** `onEnemyDied` → `bump("kill:" + texture.key)` except bosses (or include them). Journal list of known keys with count > 0.
- **Medium:** Stable ids (`slime` vs `blueslime` vs `magmaslime`) so a palette-swap is not a new species. Hide zeros until first kill.
- **Hard:** Lore entries, drop tables, "seen vs new" stamps, PixelLab busts.

### Plan (do not apply)

1. `DungeonScene.onEnemyDied` — `st.bump("kill:" + e.sprite.texture.key)` for non-bosses. Bosses optional one-count.
2. `HUD.tsx` journal — section "Defeated" reading `counters` keys that start with `kill:`.
3. No new save field. No lore strings. No shop tie-in (#20).

---

## 12. Key rebinding

**Verdict: drop.** Hostile-to-AZERTY is overstated. A remap panel is a real input rewrite.

**Grounding:** Move is WASD **and** arrow keys (`Player.ts` `createCursorKeys()`). Attack is LMB or J, dash Shift or K, tool RMB or L. Pad already works. HUD hints (#3) and `tools/regression.js` `__vhold` both assume the current codes. A controls panel that writes "keymap objects" has to thread Player, HUD `K`, lessons, Title Enter, Tab/M/Esc in `HUD.tsx`, and regression. Injury/accessibility is a real class of need; the fix that actually matches this game is already there (arrows + mouse + pad), not a rebind UI.

**Smallest version that could ship:** Document arrows in the pause list (that is #3). Full remap: drop.

**Realism: no** as scoped. A pause line "Arrows work too" is yes-and-belongs-in-#3.

### Implementation difficulties

- **Easy:** Pause copy mentions arrows.
- **Medium:** Remap WASD only, persist on settings, fight HUD strings.
- **Hard:** Remap everything including mouse buttons, pad, and regression.

No plan. Do not apply.

---

## 13. Lore coverage (signs in crypt / cinder)

**Verdict: keep.** Best content-per-hour on the list. The system already ships.

**Grounding:** Signs are `signs[]` + `S` in the legend + `checkSigns`. Whisperwood has coverage; Sunken Crypt has 2 rooms with text (`entrance`, `ossuary`) plus an empty `signs: []`; Cinder has `entrance` plus an empty array. Later dungeons play like mute machine rooms. Zero code, zero PixelLab, signpost already in the atlas. Pairs with Tam's Hollow-only side quest — do **not** extend that quest to crypt/cinder in v1 (would change `side:signs` balance).

**Smallest shippable:** One sign string in every crypt/cinder room that has an `S` or can take one without blocking a fight. Empty `signs: []` rooms either get a string or lose the dead array.

**Realism: yes.** Pure JSON.

### Implementation difficulties

- **Easy:** Write 8–12 short lines in `sunken-crypt.json` / `cinder-depths.json`. Match voice of Whisperwood (practical, not a lore dump).
- **Medium:** Place new `S` tiles in rooms that have none. Must not sit on spawn, vents, lava, or puzzle plates.
- **Hard:** A new collectible lore system. Not this idea.

### Plan (do not apply)

1. Count `S` vs `signs.length` per room in both JSONs.
2. Fill missing strings. Add at most one `S` per silent room, on a wall-adjacent tile.
3. Do not touch `quests.ts`. Do not invent a journal lore tab (see #22).

---

## 14. New game silently overwrites a finished save

**Verdict: keep.** This is a bug, not a feature idea.

**Grounding:** `Title.tsx` L46 `onClick={newGame}` → `store.newGame()` → `fresh()` → autosave within 300 ms while `screen === "intro"` is *not* saved, but the next `startGame()` will persist a blank run and the Continue card is already gone. One click burns a 4h finale. No `confirm` anywhere in `src/`. Worse once #4 exists (NG+ sits next to New game). Player value: not losing the run. Scope: S. Displaces nothing worth keeping.

**Smallest shippable:** If `readSave()` is non-null, the button becomes a two-step using the existing `title-continue` meta ("Start over? This replaces \<chapter\>").

**Realism: yes.**

### Implementation difficulties

- **Easy:** Local `confirming` state on the Title button. Second click calls `newGame()`.
- **Medium:** Also offer "Cancel". Do not add slots.
- **Hard:** Multi-slot saves. Out of scope.

### Plan (do not apply)

1. `Title.tsx` — if `save`, first click arms, second click `newGame()`. Copy uses `chapter.title` / finale line already computed.
2. No `store.ts` change required unless you want a labelled helper string.
3. NG+ button (#4) lives on Complete, not here.

---

## 15. Auto-pause on tab hide / blur

**Verdict: keep.** Real fail while alt-tabbing.

**Grounding:** `music.ts` L436 mutes the bus on `visibilitychange`. Gameplay clock does not. `shouldFreeze` is bag/journal/pause/shop/dead/complete. Wren idles, enemies do not. Phone Safari background-kills; desktop side-by-side is enough. Reuse `togglePause(true)` and the existing overlay.

**Smallest shippable:** `document.visibilitychange` → hidden, if `screen === "game"`, `togglePause(true)`. Do not unpause on visible (player hits Esc). Skip if already paused/dead/complete/dialogue/shop.

**Realism: yes.**

### Implementation difficulties

- **Easy:** One listener next to the music one, or in `HUD.tsx`.
- **Medium:** Also `window.blur`. Blur fires when DevTools opens — annoying during debug. Prefer `visibilitychange` only.
- **Hard:** Phaser `autoPause` at config level also stops rendering; the comment in `DungeonScene` already rejected `scene.pause()` because the canvas goes black. Stay on the React freeze path.

### Plan (do not apply)

1. Listener in `HUD.tsx` (has `togglePause`) or `store.ts`.
2. Condition: `document.hidden && screen === "game" && !paused && !dead`.
3. Pair the *save flush* with #24, not this file's pause logic.
4. Pair the *ambient mute* with #45 on the same `visibilitychange` listener.

---

## 16. Copy / paste save code

**Verdict: keep.** Right size for a Vercel localStorage alpha. Not cloud.

**Grounding:** One key `emberfall.save.1`. Settings survive; the run does not. Second device / cleared site = gone. Base64 of existing `SaveData` is the honest portable blob. Clipboard permissions and bad pastes are the cost. Do **after** #19 so import can reuse absent/corrupt/old. Do **after** #24 so the blob is current. #47's `.bak` is a last-good fallback for the importer, not a second export format. Do **after** #47 so a corrupt paste that clobbers main can still fall back to `.bak`.

**Smallest shippable:** Title "Copy save" / "Paste save". `btoa(unescape(encodeURIComponent(json)))` and reverse. Reject `version !== SAVE_VERSION`. Confirm before overwrite (same two-step as #14).

**Realism: yes.** No backend.

### Implementation difficulties

- **Easy:** Export path. `navigator.clipboard.writeText`. Fallback: a `<textarea>` if clipboard is denied.
- **Medium:** Import parse + version check + confirm. Do not `eval`. Cap size. Ignore settings-key confusion.
- **Hard:** Migrations across `SAVE_VERSION`. That is #19's three-way read, not a migrator in v1.
- **Hard:** Cloud, accounts, sync. Drop.

### Plan (do not apply)

1. `store.ts` — `exportSave(): string | null` from `readSave()`; `importSave(raw: string): "ok" | "bad" | "old"` writing `SAVE_KEY` only on ok.
2. `Title.tsx` — two buttons under the menu.
3. On ok, `continueGame()` or reload the Continue card (`useMemo(readSave, [])` currently runs once — import must re-read).

---

## 17. Reduced-motion and screen-shake leaks

**Verdict: keep.** Settings that lie are bugs.

**Grounding:** `prefers-reduced-motion` covers two blocks (`ui.css` L70, L157). Infinite loops outside them: low-heart `.vignette`, `.mm.here`, `.mm-quest`, `.wm-room.here` + glyph, `.tm-gate.open`, `.tm-wren`, dialogue `.caret`. Shake helper `DungeonScene.shake` multiplies `settings.shake`; Treant L183 and boss-intro `cam.shake(420, 0.012)` (L1167) bypass it. "Off" is false during the Treant and every boss intro. Fit is accessibility, not juice. S effort. Pairs with #3 (HUD should follow the device).

**Smallest shippable:** One more `@media (prefers-reduced-motion: reduce)` for those selectors (caret can become static `_`). Route the two shake calls through `this.shake(...)`. Skip the `matchMedia` default for v1 if it surprises existing Full-shake users.

**Realism: yes.**

### Implementation difficulties

- **Easy:** CSS media block. `Treant.ts` already types `scene: DungeonScene`; call `scene.shake(70, 0.003)`. Boss intro: `this.shake(420, 0.012)`.
- **Medium:** `matchMedia` → default `settings.shake = 0`. Only when the user has never set shake (no key in the JSON).
- **Hard:** Killing every tweened torch/halo loop for reduced motion. Those are world anims, not HUD; out of v1.

### Plan (do not apply)

1. `ui.css` — extend the reduce block: `.vignette, .mm.here, .mm-quest, .wm-room.here, .wm-room.here .px-glyph, .tm-gate.open, .tm-wren, .dialogue .caret { animation: none; }`.
2. `Treant.ts` L183 and `DungeonScene.ts` L1167 → `this.shake` / `scene.shake`.
3. Optional `readSettings()`: if `window.matchMedia("(prefers-reduced-motion: reduce)").matches` and stored JSON has no `shake`, default 0.

---

## 18. Dialogue should freeze the room

**Verdict: keep.** Reading a sign is currently a trap.

**Grounding:** `checkSigns` `hold(99999)` + zero velocity; control returns when dialogue closes. `shouldFreeze` (L236) is `bagOpen || journalOpen || paused || shop || dead || complete` — **not** `dialogue`. Enemies, vents, lava keep moving. Hub has the same predicate and does not matter. This punishes the exploration #13 is trying to add. Fit is table-stakes for a signpost RPG.

**Smallest shippable:** `|| !!s.dialogue` in `shouldFreeze`, but **do not** freeze during the boss-intro `delayedCall` chain. Signs in a live boss room should either not exist or not open.

**Realism: yes**, with the freeze-vs-timers caveat.

### Implementation difficulties

- **Easy:** Add `|| !!s.dialogue` to L236. `setFrozen` pauses physics, tweens, **and** `time.paused` — that is what kills `delayedCall`.
- **Medium:** Freeze only `this.enemies` / player input, leave `this.time` running. Safer around intros and hold timers.
- **Hard:** Dialogue mid-boss. Don't. If a boss room has an `S`, remove it.

### Plan (do not apply)

1. Prefer: in `DungeonScene.update` / enemy loop, skip enemy + hazard updates while `st.dialogue` (player already held). Leave `setFrozen` alone so intros keep their timers.
2. If you instead extend `shouldFreeze`, gate with `!this.boss` (intro uses `setBoss` at 2100 ms).
3. Re-check `tools/regression.js` `talk`/sign steps still clear `st().dialogue` on a key.
4. `HubScene` can add `dialogue` to freeze; town has no enemies, so it is optional polish.

---

## 19. Old or corrupt save vanishes without a word

**Verdict: keep.** Do this before #16 and before any `SAVE_VERSION` bump.

**Grounding:** `readSave()` returns `null` on `version !== SAVE_VERSION` and on JSON throw. Title only renders Continue `{save && …}`. Player reads "save gone" and clicks New game (#14), which then really deletes the string. The raw key is still in localStorage — meta (gold, playtime) can be parsed defensively even when version mismatches.

**Smallest shippable:** `readSave()` → `{ ok: SaveData } | { kind: "old" | "corrupt", gold?: number, playtimeMs?: number } | null`. Title muted line + "Clear it". No migrator.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Try `JSON.parse`, if object-with-gold show the line even when version mismatches.
- **Medium:** Distinguish corrupt vs old. Clear button `localStorage.removeItem(SAVE_KEY)`.
- **Hard:** Field-by-field migration to v6. Not until something actually needs a bump (`ngplus` as a flag does not).

### Plan (do not apply)

1. `store.ts` — `peekSave()` separate from `readSave()` so continue still requires version 5. `continueGame()` must **not** call `newGame()` on a failed read (`store.ts` L370–371 does today).
2. `Title.tsx` — if peek is old/corrupt, muted line "A save from an earlier build is here (N gold, Th Tm)" + Clear.
3. Wire Clear to `removeItem(SAVE_KEY)` **and** `removeItem(SAVE_KEY + ".bak")` and drop the line. Do not call `newGame()`.
4. `.bak` restore copy is **#47**, reported through this same `peekSave` (`"restored"` / corrupt-but-bak). Do not invent a third key here.

---

## 20. Post-finale gold has nothing left to buy

**Verdict: shrink.** One repeatable flavour purchase. No plaza banners, no trophy plaques, no paid bestiary.

**Grounding:** After Orrin's seven capped/one-shot lines, gold is a score. That is fine for an alpha whose Complete screen already says later builds. A banner for the plaza needs art, a hub placement, and a save flag for a thing nobody asked to look at. A renamed blade is a string; it pretends to be progression. Gold-priced lore is #11 padding. Player value of a gold sink is "the number went down." Weak idea. Do not build a cosmetics layer.

**Smallest shippable:** One Orrin entry `{ id: "ingot", price: 50, give: none }` that always succeeds, toasts "Orrin sets another ingot aside." Optionally refuse before `finale` so the main shop does not dilute. No `upgrade` arm.

**Realism: partial.** The buy path can take a new row. World-visible cosmetics: no, without art.

### Implementation difficulties

- **Easy:** Repeatable `ShopEntry` with no `give`/`upgrade`. **Verified this source:** `buy()` deducts gold at `store.ts` L322–323 then applies give/upgrade only if present. Add a toast.
- **Medium:** New `upgrade` type that sets a flag and changes hub décor. Needs a sprite and a `HubScene` branch.
- **Hard:** Real cosmetics wardrobe. Out of scope.

### Plan (do not apply)

1. `shop.ts` — one blacksmith row, no max, no give. Show only if `finale` (Complete has already happened) *or* always, if you want a sink earlier.
2. `store.ts` `buy()` — if no give/upgrade, gold subtract + bought flash is enough. Confirm current code path allows that (it subtracts then only applies give/upgrade if present).
3. No HUD shop-card redesign. No plaza prop.

---

## 21. One-way dungeon shortcuts

**Verdict: shrink.** One shortcut in one dungeon as a trial. Not a new traversal layer across all three.

**Grounding:** All three dungeons are 4×3 with the same purpose histogram. Content already differs; geometry does not. Players notice backtracking more in Cinder (lava + vents) than in Whisperwood. A new legend char is a real `DungeonScene` `switch (p.kind)` case, collision, camera, and three JSON edits if you do all three. Easy to strand Wren (one-way with no return). Emberfall-dungeon skill work, not a quick win. "Cheapest level-design variety" is true relative to a 4th dungeon, not relative to writing signs.

**Smallest shippable:** One chute in Cinder from a cleared late room back toward entrance. Reuse an existing floor/edge tile. Opens on `cleared:<room>`. No new PixelLab sprite unless the reused tile is unreadable.

**Realism: partial.** The placement switch is real. Authoring a one-way that cannot soft-lock is the risk.

### Implementation difficulties

- **Easy:** A door that appears once `cleared:` is set, leading to a known neighbour — that is almost a one-way *unlock*, which locked doors already do in reverse.
- **Medium:** New legend char, `WALLISH`/doc, `switch` case, two-room JSON edit, camera scroll through the chute.
- **Hard:** Drops that change `ty` inside the same room, pits vs `pit-tile` in crypt, lava-safe chutes, teaching the player this glyph.

### Plan (do not apply)

1. Pick Cinder, one pair of rooms with a long walk back (e.g. a cleared fight room → a tile that `goto`s a nearer room).
2. `DungeonScene.ts` — new kind `"shortcut"`: solid until `cleared:<thisRoom>`, then a zone that `enterRoom`s the target. Reuse `archway` or `door` art.
3. `cinder-depths.json` only. Do not touch Whisperwood/Crypt until someone plays the Cinder one and does not get stuck.
4. Add nothing to regression's 34 checks; optional later.

---

## 22. Story so far in the journal

**Verdict: shrink.** Paste the three intro plates into the journal. Do not build a recap engine.

**Grounding:** IDEAS says "the premise can be read once and never again." True of `INTRO` in `HUD.tsx` L143–147 (`screen === "intro"`, Esc skips). False of "the journal has no lore" — each `QUEST` step already shows `title`, `objective`, and `story` (`HUD.tsx` L742–746). The missing piece is the three opening plates, not a new narrative system. Lifting `INTRO` to a shared module is churn for three strings.

**Smallest shippable:** A short "The splitting" block at the top of the journal with those three texts verbatim. Optionally one line per *done* QUEST step — already there as struck-through `journal-story`.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Copy `INTRO` into the journal JSX (or export the const from `HUD.tsx`).
- **Medium:** Shared module for Title / journal / recap. Unnecessary at n=3.
- **Hard:** Branching recap that tracks which dungeons / which ending. There is one ending.

### Plan (do not apply)

1. `HUD.tsx` journal — a `journal-side` block above SIDE QUESTS: the three `INTRO` texts.
2. Do not change `quests.ts`. Do not add a Title recap.

---

## 23. Localisation-readiness

**Verdict: drop.** No second language is planned. A `strings.ts` map is architecture theatre.

**Grounding:** Prose lives in HUD, `DungeonScene` banners, `ITEM_META`, `shop.ts`, and room JSON signs. That is normal for a 3-dungeon English alpha. Extracting JSON-carried strings "so one day German" without a translator, a picker, or a test locale is busywork that will rot. The two `max-width`s (`.minimap-name` 120px, `.quest` 190px) are English layout choices; they are not a localisation program. If a string already clips in English, that is a CSS bug — fix that string's layout, don't invent i18n.

**Smallest version that could ship:** Widen those two max-widths if QA shows clipping. That is not this idea.

**Realism: no.**

### Implementation difficulties

- **Easy:** CSS `max-width: min(calc(190px * var(--s)), 40%)`. Harmless, unrelated to i18n.
- **Medium:** `strings.ts` for signs/banners. Touches every room JSON load path. Zero player-facing change.
- **Hard:** Real catalogues, language picker, font coverage for the pixel face.

No plan. Do not apply.

---

## 24. Autosave can drop the last beat

**Verdict: keep.** Three-line bugfix. Do with #15's hide plumbing.

**Grounding:** Debounced writer runs on `screen === "game" || "complete"` (`store.ts` L410). `beforeunload` only flushes `screen === "game"` (L415–417). Close from the Complete plate can lose a `finale` flag still inside the 300 ms window. `die()` sets `screen: "dead"` (L399), so the subscriber's L410 guard skips death entirely — close-after-death loses the run since the last room write. No store-side `visibilitychange` flush (only music mute). Mobile Safari background-kills tabs. #16 and #19 both assume the disk copy is current.

**Smallest shippable:** Widen unload **and** the debounce guard to `screen !== "title" && screen !== "intro"` (covers game / complete / dead). Same `writeSave` on `hidden`.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Two condition tweaks in `store.ts`.
- **Medium:** Hidden-while-title should not write a blank. The widened guard already excludes title/intro.
- **Hard:** File-style temp+rename. Overkill for one localStorage key. The cheap last-good copy is **#47**, not this idea.

### Plan (do not apply)

1. `store.ts` subscribe guard and `beforeunload` — `if (s.screen !== "title" && s.screen !== "intro")`.
2. Add `visibilitychange` → `hidden` with the same guard (flush; do not debounce).
3. Keep the 300 ms debounce as-is. Do not write on title/intro.

---

## S. Shrine "saved" confirmation flash

**Verdict: keep.** Listed quick win, still missing.

**Grounding:** Hub shrine (`HubScene.ts` L352–359) already chimes, heals, toasts, narrates `"Saved."` for 1600 ms. No `cameras.main.flash`. Backlog asked for a flash. Juice, not systems. Accessible confirmation is the toast + narration; flash is extra.

**Smallest shippable:** `cameras.main.flash` ~200 ms cream/ember after heal. Respect #17: go through `this.shake`? Flash is not shake — but if `prefers-reduced-motion`, skip the flash and keep the toast.

**Realism: yes.**

### Implementation difficulties

- **Easy:** `this.cameras.main.flash(200, 255, 242, 176)` in the shrine branch. Optional shrine tint yoyo.
- **Medium:** Unique save glyph. Unnecessary.

### Plan (do not apply)

1. `HubScene.ts` shrine branch, after heal: flash ~180–250 ms.
2. Skip flash when `matchMedia("(prefers-reduced-motion: reduce)")` or `settings.shake === 0`.
3. Leave toast + `"Saved."`.

---

## 25. The bomb tutorial can never fire

**Verdict: keep.** This is a bug, not a feature. The coach copy is already written.

**Grounding:** `LessonId` includes `"bomb"`. Coach text is `"Drop a bomb by the cracked wall"` (`HUD.tsx` L54). `startLesson("bomb")` refuses until `unlock:bomb` (L1429). `placeBomb` calls `finishLesson("bomb")` (L1900). `startLesson` is called for move, attack, throw, firerod, grapple, potion — **never bomb**. Unlock itself does fire: `enterRoom` L611 `setFlag("unlock:" + k)` when `room.id === meta.unlocks.bomb` (`east-crystal`, `dungeons.ts` L47). The hotbar slot unlocks. The cracked walls sit there. The player starts with 3 bombs. Potion has a dedicated `onPlayerHurt` hook; bomb has no equivalent. Player value is high (the one starting tool nobody explains). Scope is one call. Displaces nothing.

**Smallest shippable:** `startLesson("bomb")` next to the unlock flag set, same beat as entering `east-crystal`.

**Realism: yes.** The function and the copy exist.

### Implementation difficulties

- **Easy:** After L611, if `k === "bomb"` (or `room.id === this.meta.unlocks.bomb`), `this.startLesson("bomb")`. Guard already no-ops if the flag/item is missing or the lesson is done.
- **Medium:** Also fire on first `wall-cracked` room in crypt/cinder (`bat-roost` / `bat-chimney`). Not needed if Whisperwood taught it; `lessons` persist.
- **Hard:** A full "tools" tutorial sequence. Not this idea.
- **Note:** `tools/regression.js` asserts nothing about lessons. Do not expand the 34-check path to cover this (see #26). Optional later.

### Plan (do not apply)

1. `DungeonScene.ts` `enterRoom`, after the unlock loop (~L611): `if (room.id === this.meta.unlocks?.bomb) this.startLesson("bomb")`.
2. Do not change `startLesson` guards, HUD copy, or hotbar lock.
3. Do not add a regression assertion to the 34-beat path.

---

## 26. Regression extras / prod harness

**Verdict: shrink.** Opt-in extra checks in **dev**. Do not expose `__game` on the Vercel bundle.

**Grounding:** The 34 checks walk the main quest. Shop coverage is one `buy("sword2")`. No lessons, pause, bag, journal, or `settings`. It heals between fights, so #1 cannot fail it. That is fine: the suite is a story smoke test, not a unit suite. Inflating it into "cover everything" will make it brittle and slow. Exposing `__game`/`__store` behind `?debug=1` in **production** is a different product: `playtest.js` does `import("/src/ui/store.ts")`, which does not exist on the built site, so "run the same script against Vercel" is a rewrite, not a flag. Player value of extra asserts: zero. Developer value: some. Displaces actual bugs if treated as a project.

**Smallest shippable:** `__regress({ extra: true })` in `tools/regression.js` only, still pasted into the **dev** page. One buy per remaining shop row, bag/journal open-close, settings round-trip. Leave `import.meta.env.DEV` on `window.__game`.

**Realism: partial.** Extra dev asserts: yes. Prod harness: no without a bundled runner.

### Implementation difficulties

- **Easy:** Second section in `regression.js` gated on `extra`. Keep the 34 `ok()` count stable when `extra` is off.
- **Medium:** `?debug=1` exposing store on prod, plus a built copy of the harness. Touches `main.tsx`, `vite.config`, CSP if any. Not worth it for an alpha.
- **Hard:** CI that boots the Vercel URL and drives Wren. Out of scope.

### Plan (do not apply)

1. `tools/regression.js` — `extra` section: Maren potion buy, Orrin armour1, `toggleBag`/`toggleJournal` leave `paused === false`, `setSettings` round-trip. Do not `ok()` those on the default path.
2. Do not change `main.tsx` `import.meta.env.DEV` guard.
3. Do not rewrite `playtest.js` imports.

---

## 27. ~2,200–2,900 tile Images, depth-sorted every frame

**Verdict: shrink.** Measure first. A one-line depth guard is the only change that is cheap enough to do blind. Layer / RenderTexture waits on a real FPS number.

**Grounding:** `buildTerrain` really does one `Image` per dungeon tile at depth `-1000` (`DungeonScene.ts` L266–272). Town 32×24 = 768; Whisperwood 3×3×20×12 = 2,160; Cinder 4×3 = 2,880. Entities `setDepth` every `update` (Player L459 and the enemy/projectile files listed). Phaser coalesces one sort per frame, so one dirty sprite still sorts the whole list. NIGHT_LOG has **no** frame-rate complaint. `pixelArt` + `zoom: 2` at ~1280×768 is the expected canvas. A Layer (static tiles, never re-sorted) is the right structural fix **if** the sort shows up in a profile. Doing it now is a scene rewrite that can break depth vs props, water rims, and `retileAround` frame swaps. Player value today: unknown, possibly zero. Displaces every gameplay bug on this list.

**Smallest shippable:** `?debug=1` overlay or `console` of `game.loop.actualFps` (dev only). Optional: `if (s.depth !== d) s.setDepth(d)` on the entity updates. If Cinder sits at 60, **drop** the rest of this idea (and #30).

**Realism: partial.** The counts are real. The problem is unmeasured.

### Implementation difficulties

- **Easy:** FPS readout in DEV. Depth-write guard (helps only when nothing moves; one walker still sorts).
- **Medium:** Put `tileImages` in a Phaser `Layer` at a fixed depth. `retileAround` must still `setFrame` on those images. Hub terrain too.
- **Hard:** Per-room `RenderTexture` bake. Breaks `retileAround` / crack breaks unless you re-bake the window. Camera scroll must still show the whole dungeon (rooms are one continuous world).

### Plan (do not apply)

1. DEV-only: if `location.search` includes `debug=1`, log `actualFps` every 2s from `main.tsx` (where `__game` already exists).
2. Optional guard on `Player.update` and enemy `update`s: skip `setDepth` when unchanged.
3. Stop. No Layer, no RenderTexture, no tilemap conversion, until a capture shows Cinder under ~50 fps on the target machine.

---

## 28. Title loads an unused Google font

**Verdict: keep.** Dead third-party request on every cold load.

**Grounding:** `index.html` L7–8 preconnects and pulls `Pixelify+Sans` **and** `IBM+Plex+Sans` at three weights. `IBM Plex Sans` is in no `font-family` (`grep -i plex src/` empty). The live stack is `"Emberfall Pixel", "Pixelify Sans", monospace` (`ui.css` L33). Emberfall Pixel is already self-hosted (12 KB, `font-display: block`). Pixelify only matters if that TTF fails. The Google stylesheet is render-blocking and fails closed on ad-block / offline. Player value: faster, more reliable first paint. Scope: delete two tags. Self-hosting Pixelify is extra and unnecessary if the TTF is the real face.

**Smallest shippable:** Remove the `preconnect` and the Google `stylesheet` from `index.html`. Leave the CSS stack; the real fallback becomes `monospace`. Do not vendor Pixelify Sans. Same `<head>` pass as **#49**'s favicon `<link>`.

**Realism: yes.** Zero visual change when the TTF loads, which is the normal path.

### Implementation difficulties

- **Easy:** Delete `index.html` L7–8. Optionally drop `"Pixelify Sans"` from `ui.css` L33 so the stack is honest.
- **Medium:** Self-host Pixelify Sans under `public/assets/fonts/`. Needs an OFL file and a `@font-face`. Not required.
- **Hard:** None.

### Plan (do not apply)

1. `index.html` — delete both Google font `<link>`s.
2. `ui.css` — `font-family: "Emberfall Pixel", monospace;`
3. Do not add font files. Same head edit as **#49** (favicon `<link>`). Do not vendor Pixelify.

---

## 29. Shipped build: a throw looks like a black canvas + a menu

**Verdict: keep.** Failed states the player cannot read. Pair with #19.

**Grounding:** Canvas starts `opacity: 0` until `.ready` at the **end** of `create()` (`ui.css` L25–26; `DungeonScene` L231, `HubScene` L149). `window "error"` is DEV-only (`main.tsx` L9–11). No React error boundary. `Dungeon` constructor throws on map size (`dungeon.ts` L79) and missing room (`L106`). A throw mid-create leaves the canvas invisible; production has no console the player will open. Adding `.ready` at the **start** of `create` is the wrong fix — you would fade in a half-built, unsorted room. Catch and message instead.

**Smallest shippable:** Always-on `error` / `unhandledrejection` listener that sets a one-line HUD string. `create()` wrapped so `.ready` still applies in a `finally` (show whatever did draw). Do not print stack traces on the HUD; `?debug=1` can.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Prod `error` listener → `useGame.setTag` or a small `bootError` field HUD shows as muted text. `finally { canvas.classList.add("ready") }`.
- **Medium:** Catch `Dungeon` constructor throws in scene `create` and set "This dungeon is corrupt — reload" instead of dying half-booted.
- **Hard:** Full React error boundary + Phaser scene recovery + continue from last room. Out of scope.

### Plan (do not apply)

1. `store.ts` — optional `bootError: string | null`.
2. `main.tsx` — register `error` / `unhandledrejection` **unconditionally**; `set({ bootError })`. Keep the DEV `console.error`.
3. `HUD.tsx` — if `bootError`, one muted line on title/game: "Something broke on this screen — reload."
4. `DungeonScene.create` / `HubScene.create` — `try { … } finally { this.game.canvas.classList.add("ready") }`. Do not move `.ready` to the start.
5. No error boundary component unless a later throw in React actually blanks the HUD.

---

## 30. Breaking one wall recomputes the whole autotile grid

**Verdict: drop.** Unmeasured hitch, one event per room. Fold into #27's profile; do not pre-optimise `wang.ts`.

**Grounding:** `retileAround` (`DungeonScene.ts` L276–283) really calls `autotile(this.dungeon.vertices(), this.lookup)` then paints a radius window, then `breakCrack` calls `rebuildWalls()` which rebuilds every collision zone. Cinder is 2,880 tiles / ~3,009 vertices. That sounds large and is still likely sub-millisecond in JS. It runs when a bomb opens a crack, not every frame. Partial `verticesIn(rect)` is real work in `dungeon.ts` / `wang.ts` for a maybe-hitch nobody has reported. Doing it now displaces #25/#29.

**Smallest version:** If #27's readout shows a spike on `breakCrack`, then window the autotile. Until then, nothing.

**Realism: no** as a current task. The code path is real; the cost is not shown.

### Implementation difficulties

- **Easy:** Profile `retileAround` with `console.time` behind `?debug=1`.
- **Medium:** `verticesIn` + partial `autotile` + rebuild only intersecting wall rects. Easy to get a one-tile halo wrong (Wang keys need neighbours).
- **Hard:** Incremental collision mesh. Not needed.

No plan. If #27 ever shows a hitch, reopen this as a shrink of `retileAround` only.

---

## 31. Dev-only room-data validation

**Verdict: keep.** The two silent fallbacks (`chests?.[i] ?? "gold"`, `signs?.[i] ?? "..."`) are exactly how a JSON typo ships. Authoring rooms is the repeated edit.

**Grounding:** Not a live bug today (counts match). `Dungeon` already throws on map size. Placement `switch` has no `default`, so an unknown legend kind paints nothing. Dev-only cost is zero in prod. Player value is indirect (fewer "..." signs in a night-shift dungeon edit). Scope is S. Does not displace gameplay if it stays in the constructor behind `import.meta.env.DEV`.

**Smallest shippable:** In `Dungeon` constructor, after building placements: `signs.length >= S-count`, `chests.length === C-count` (not hidden `c`), known `clearReward`/`solveReward`. Throw like the map-size error so regression/boot fails closed in DEV.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Count `S`/`C` per room vs array lengths. Throw with room id.
- **Medium:** Allow-list of legend kinds vs `DungeonScene`/`HubScene` switch cases. That list will rot when a case is added — put the allow-list next to the switch or accept `wall`/`floor`/`spawn`/`grass`/`path` as structural.
- **Hard:** A schema / JSON Schema for room files. No.

### Plan (do not apply)

1. `src/game/dungeon.ts` constructor, `if (import.meta.env.DEV)`: for each room, count legend kinds `sign`/`chest` from placements (or from map chars), compare to `signs[]`/`chests[]`.
2. Reject unknown `clearReward`/`solveReward` against a tiny set (`key`, `chest:…`, item ids).
3. Do not run in prod. Do not add to `tools/regression.js` (boot in DEV already throws).

---

## 32. A save that stops working is invisible

**Verdict: keep.** This is the only item that can silently eat a finished run.

**Grounding:** `writeSave` swallows every failure (`store.ts` L236–237). `setSettings` does the same. Private-mode Safari never persists; a full origin throws `QuotaExceededError` and then every later write fails too. The shrine still narrates `"Saved."` Shrine / autosave / #16 / #19 all assume the disk copy is current. Player value is not losing four hours. Scope is a flag + one HUD line (share #29's slot). Does not invent cloud.

**Smallest shippable:** `saveFailed` on the store, set in the existing catch, cleared on the next successful write. One muted HUD line. Do not toast every frame.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Boolean + HUD line. Retry is just "the next `writeSave` already runs".
- **Medium:** Distinguish quota vs private mode vs thrown JSON. Not needed; one line is enough.
- **Hard:** Fallback download-file if localStorage is dead. That is #16's export, offered from the same banner. Parse-throw recovery from a previous blob is **#47**, not a second HUD line.

### Plan (do not apply)

1. `store.ts` — `saveFailed: boolean`. `writeSave` returns ok/fail; set the flag. Successful write clears it.
2. `HUD.tsx` — reuse #29's muted error slot: "Progress is not saving on this browser."
3. Do not change shrine copy until the flag is set (then skip the lying `"Saved."` narration).
4. #47's extra `setItem(.bak)` can itself throw quota — that must **not** set `saveFailed` if the main key already wrote. Main success clears the flag; bak failure is silent.

---

## 33. The HUD is invisible to a screen reader

**Verdict: shrink.** Live regions and labels, not a screen-reader-playable canvas game.

**Grounding:** Zero `aria` / `role` / `sr-only` in `src/ui`. Narrator and toasts are anonymous `<div>`s. Hotbar `Icon` defaults `alt=""`. Focus ring is `outline: none` plus a 20% brightness bump. That last one is a real keyboard-only bug. The rest of "AT can play Emberfall" is a lie: combat, aim, and the Phaser canvas have no accessible equivalent. Do not pad this into a second control scheme. Pairs with #17 as device-follows-settings, not as an accessibility product.

**Smallest shippable:** `aria-live="polite"` on narrator + world-tag. Slot `aria-label` with name + qty. Restore a visible `:focus-visible` outline on `.pxbtn`. Stop.

**Realism: partial.** Labels: yes. Playing the dungeon with a screen reader: no.

### Implementation difficulties

- **Easy:** Three attributes and one CSS outline.
- **Medium:** Focus trap for pause/bag/shop. Not v1.
- **Hard:** Describing the room, enemies, and aim for AT. Out of scope for a pixel action RPG.

### Plan (do not apply)

1. `HUD.tsx` — `aria-live="polite"` on `.narrator` and `.wtag`. `Slot`/`Icon`: `alt` or `aria-label` from `ITEM_META` + qty + selected.
2. `ui.css` — drop `outline: none` on `:focus-visible`; 2px `--ember` outline.
3. Do not add a screen-reader movement mode.

---

## 34. Town has nothing to read

**Verdict: keep.** Same job as #13, one screen further. Not a new lore system.

**Grounding:** Hub legend has no readable prop. `HubScene.ts` "sign" is gate *art* (L268), not `checkSigns`. The shrine's save model is a 1400 ms toast after you already walked into an unlabeled flame. `signpost.png` is already in the atlas. Player value: two boards (shrine + closed gates) that say what the toasts already say, persistently. Scope is S but **not** zero-code — town needs a `sign` kind and a bump path, which dungeon already has. Do not write an essay. Do not extend Tam's Hollow sign quest.

**Smallest shippable:** Two signposts. Shrine: rest/save. Gates: closed-road line. Reuse dungeon dialogue box.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Copy `checkSigns` into Hub, or share a tiny helper. JSON: one legend char + two strings.
- **Medium:** A `signs[]` array on the town file (town JSON is not a `DungeonDef`). Place tiles by the shrine and the locked gates without blocking NPC zones.
- **Hard:** Town-wide lore trail. No.

### Plan (do not apply)

1. `emberfall-town.json` — add a `sign` legend char and two `S` tiles (shrine, one closed gate).
2. `HubScene.ts` — `PROPS` entry + bump → `setDialogue`, same hold/release as dungeon.
3. Four lines of copy, max. Do not touch `quests.ts`.

---

## 35. Every store change re-renders the whole HUD

**Verdict: shrink.** Delete the dead `facing`/`action` writes. Do not rewrite every `useGame()` call until #36 shows a React hitch.

**Grounding:** `Player.syncStore` pushes `facing`/`action` into zustand on every turn/attack edge (`Player.ts` L462–465). HUD never reads either field (the `facing`/`action` hits in `HUD.tsx` are CSS class `pause-actions`). Each write also walks the autosave subscriber's 12-field check. Seven `useGame()` calls without selectors are real but normal for this HUD size; they are not proven jank. NIGHT_LOG has no React-FPS complaint. Selector-izing seven components is a regression magnet (miss a field, UI goes stale).

**Smallest shippable:** Stop calling `setFacing`/`setAction`. Optionally delete the fields. Leave the seven subscribers.

**Realism: yes** for the dead fields. Partial for "the whole HUD is the problem".

### Implementation difficulties

- **Easy:** Delete `syncStore`'s facing/action writes, then the store fields if nothing else reads them.
- **Medium:** `useGame((s) => …)` on DialogueBox, Title-adjacent, HUD, maps. Easy to miss a field.
- **Hard:** Context-splitting the store. No.

### Plan (do not apply)

1. `Player.ts` — drop `syncStore` writes for `facing`/`action` (or the whole helper if that's all it does).
2. `store.ts` — remove `facing`/`action` / setters if grep is clean.
3. Do not selector-rewrite HUD until a `?debug=1` overlay (#36) shows React as the cost.

---

## 36. Nothing parses `?debug=1`

**Verdict: keep** the flag. **Shrink** the overlay: `console` is enough. Four other ideas cite a flag that does not exist (`grep location.search src/` is empty; only `arcade.debug: false`).

**Grounding:** #5, #27, #29, and the dropped #26b all say "behind `?debug=1`". Without a parser those sentences are fiction. A shared `isDebug()` is an afternoon. A live overlay with fps / totalDrawn / counters / telemetry is a debug HUD, i.e. a new feature. Player value is zero. Developer value of the flag is real. Do not ship `__game` on prod because the flag is on.

**Smallest shippable:** `src/game/debug.ts` exporting `isDebug()`. `main.tsx` logs `actualFps` every 2s when true. Telemetry `#5` `console.table`s when true. Stop.

**Realism: yes.**

### Implementation difficulties

- **Easy:** `URLSearchParams(location.search).has("debug")`.
- **Medium:** On-canvas overlay. Extra HUD overlap QA. Skip.
- **Hard:** Prod `__game` behind the flag. Already dropped as #26b.

### Plan (do not apply)

1. `src/game/debug.ts` — `export const isDebug = () => new URLSearchParams(location.search).has("debug")`.
2. `main.tsx` — if `isDebug()`, `setInterval` log `game.loop.actualFps` (and `renderer.totalDrawn` if that field exists on this Phaser build — check before using).
3. `#5` / `#29` read `isDebug()` instead of inventing a HUD panel.
4. Leave `window.__game` DEV-only.

---

## 37. HUD text-scale setting

**Verdict: drop.** The pixel face is authored at 16px × integer `--s`. A 1.25/1.5 `--fs` will look like a stretched bitmap and overflow panels that are sized in `--s`.

**Grounding:** `uiScale` is integer on purpose (`useCanvasRect.ts` L49–52; `ui.css` L32–36 "bitmap font only ever renders at 16px × an integer"). 129 `var(--s)` uses couple chrome and type. OS font-size only affects `em`/`rem`; this UI does not use those for type (the ten `em` hits are `letter-spacing`). Page zoom already grows world + HUD together — that is the honest lever. A sixth pause row that only scales text will clip dialogue, shop cards, and the quest tracker. Player value is theoretical. Time cost eats #1's pause-row slot for a setting that fights the art.

**Smallest version that could ship:** Tell people to zoom the page. That is not a code change.

**Realism: no.** Integer pixel type plus 1.5× font-size is a different look.

### Implementation difficulties

- **Easy:** A setting nobody can use without clipping.
- **Medium:** Reflow every panel for 1.5× type. That's a HUD redesign.
- **Hard:** A second bitmap size. PixelLab.

No plan. Do not apply.

---

## 38. Every dungeon loads all twelve enemy clips

**Verdict: shrink.** Skip clips this place cannot spawn. Do not pack them. Do not block on #36.

**Grounding:** `preload` loops all 70 frames (`DungeonScene.ts` L139–140). Counts check out: Whisperwood 38/70, crypt/cinder 28/70 if you only count slime/sprite/mushroom/doors/water/lava. Scene restart on place change means a later dungeon would skip Whisperwood's slimes — good. After the first dungeon, the browser cache probably makes this a nothing-burger. Cold load of Whisperwood still fetches crypt magma and cinder lava it will never show. Player value is first-paint on a slow link. Scope is a lookup table. Risk: forgetting a clip that a room actually uses (silent missing anim). Fold into #8 as "remaining requests", not a new system.

**Smallest shippable:** Always load door clips. Load `water-loop` / `lava-loop` from the tileset/legend. Load slime/sprite/mushroom/blueslime/magmaslime only if that kind is placed in `def.rooms`. Leave portraits alone.

**Realism: partial.** The overfetch is real; the cost is unmeasured.

### Implementation difficulties

- **Easy:** `speciesToClips` map + scan placements in `preload`.
- **Medium:** Scene is one `Dungeon` class restarted across places — `this.meta` is available in `preload` after `init`. Confirm `init` has set `def` before `preload` runs (Phaser: `init` then `preload`). If not, key off the pending place on the store.
- **Hard:** Packing the 70 frames (#8's optional half). Skip.

### Plan (do not apply)

1. `DungeonScene.preload` — build a `Set` of clip names from `this.def` (or `dungeonFor(useGame.getState().place).def`) placements + legend water/lava + both door clips.
2. Loop `ENEMY_CLIPS` and `load.image` only if the set has that clip.
3. Do not delete PNGs. Do not wait on an FPS readout.

---

## 39. The deployed alpha can't say which build it is

**Verdict: keep.** One stamp. Makes #29's error line and every player report usable.

**Grounding:** `Title.tsx` L50 is the literal `v0.1 prototype`. `package.json` is `0.0.1`. `vite.config.ts` defines nothing. No CI. NIGHT_LOG cites commits; Vercel visitors cannot. Player value is support, not gameplay. Scope is `define` + one span. Do not build GitHub Actions just to print a hash.

**Smallest shippable:** `import.meta.env.VITE_APP_VERSION` or a Vite `define` of package version + `git rev-parse --short HEAD` at build time, with a `"dev"` fallback in `vite`. Show it in `title-version`. Repeat in #29's line.

**Realism: yes.** Vercel sets `VERCEL_GIT_COMMIT_SHA` if you want it; git at build time works locally.

### Implementation difficulties

- **Easy:** `define: { __APP_VERSION__: JSON.stringify(...) }` in `vite.config.ts`. `Title.tsx` reads it. `src/vite-env.d.ts` already exists for types.
- **Medium:** `git` missing in some build images — fall back to `package.json` version only.
- **Hard:** A CI pipeline. Not this idea.

### Plan (do not apply)

1. `vite.config.ts` — `define` `__APP_VERSION__` as `` `${pkg.version}+${sha}` `` (`VERCEL_GIT_COMMIT_SHA` or `execSync("git rev-parse --short HEAD")` or `"dev"`).
2. `src/vite-env.d.ts` — `declare const __APP_VERSION__: string`.
3. `Title.tsx` — `{__APP_VERSION__}` instead of `v0.1 prototype`.
4. #29 error line can append it. No GitHub workflow.

---

## 40. The fire rod's hit is the only silent one

**Verdict: keep.** Real combat-feel hole, one call site.

**Grounding:** Sword adds `sfx("hit")` / clang, shake, hit-stop, damage number (`DungeonScene.ts` L906–912). Bomb and boomerang hit-stop; grapple hit-stops on latch. Fire-rod overlap (`L1678–1692`) does `takeHit` + `damageNumber` + `burst()` with **no** `sfx` and **no** `hitStop`. `FireBolt.ts` has zero `sfx(` calls. `Enemy.takeHit` already flashes, so this is the missing sibling cues, not a new flash system. Player value: the tool whose pitch is "ranged fire" currently reads as a floating number. Scope is two lines. Do not invent a `fire-hit` envelope unless #10 is already open.

**Smallest shippable:** `sfx("hit")` + `this.hitStop(30)` in the fire-rod enemy overlap, matching boomerang weight.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Two calls in the overlap block. Cinder Golem back-hit / bark branch should get a sound too (`sfx("hit")` or `"whoosh"`), not stay silent.
- **Medium:** A distinct `fire-hit` synth row. Only if you are already in `audio.ts` for #10.
- **Hard:** Per-enemy fire sfx. No. Melee already special-cases slime/skeleton; do not duplicate that table here.

### Plan (do not apply)

1. `DungeonScene.ts` fire-rod overlap — after a real `takeHit`, `sfx("hit")` and `hitStop(30)`. On the Golem `backHit` / bark branches, at least `sfx("hit")` or `"clang"`.
2. Leave `FireBolt.burst()` as puff-only.
3. Regression firerod/brazier step should still pass (30 ms is inside existing waits). Do not add a new check to the 34-path.

---

## 41. Voice clips download even though voice is off

**Verdict: shrink.** Gate **Wren's** `preloadVoice()`. Do not mute townsfolk.

**Grounding:** Default is `voice: false` (`store.ts` L22 comment: *"Wren's voice … off for now — the townsfolk keep theirs"*). `unlockAudio()` → `preloadVoice()` anyway (`audio.ts` L56, L336–337), fetching 12 Wren MP3s (~125 KB) that `speak()` will discard. Pause toggle sets the flag and never preloads, so turning voice **on** makes the first line late — the thing the warm-cache comment was for. That half is a real bug.

The NPC half is inflated. `speakNpc` has no `settings.voice` check **on purpose**: townsfolk keep their clips. It lazy-loads **one** hash per line, not the whole 615 KB npc folder. Gating `speakNpc` on Wren's toggle would silence Tam/Maren/Orrin and fight the setting's own comment. Evicting decoded buffers is a memory fantasy for 13 short MP3s. The same default now also kills the low-HP *spoken* line — that audio hole is **#50**, not a reason to flip `voice` back on.

**Smallest shippable:** `if (settings.voice) preloadVoice()` in `unlockAudio`. On pause, when switching voice from off → on, call `preloadVoice()`. Leave `speakNpc` alone.

**Realism: yes** for Wren prefetch. **No** for "voice off means the town is mute."

### Implementation difficulties

- **Easy:** Two call-site guards. `HUD.tsx` pause voice button.
- **Medium:** Subscribe to `settings.voice` and preload/stop. Optional; the button is enough.
- **Hard:** Mute NPCs / evict buffers / a second volume slider. Out of scope.

### Plan (do not apply)

1. `audio.ts` `unlockAudio` — `if (useGame.getState().settings.voice) preloadVoice()`.
2. `HUD.tsx` voice toggle — after `setSettings({ voice: true })`, `preloadVoice()`.
3. Do not add `settings.voice` to `speakNpc`. Do not delete files under `public/assets/voice/`.

---

## 42. The save knows when it saved; the title never says so

**Verdict: keep.** One field already on the blob, one extra clause on a line that exists.

**Grounding:** `savedAt` is written (`store.ts` L91, L233) and never read. Continue already shows gold · playtime (`Title.tsx` L34). "Saved 4m ago" is honest and cheap. The brainstorm overclaims it: a timestamp cannot tell "writes have been failing all session" (#32) or "old vs corrupt" (#19). Those stay their own flags. This is a clock on the card, not a save-health diagnostic.

**Smallest shippable:** Append ` · saved {relative}` using the local `fmtTime` (or a `fmtAgo`). After #32, the same row can add " · not saving" from `saveFailed`.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Read `save.savedAt` in `Title.tsx`. Relative minutes/hours is enough; do not print a full datetime.
- **Medium:** Live-updating "saved 4m ago" while sitting on title. Skip; static at mount is fine (`useMemo(readSave)` already is).
- **Hard:** Using `savedAt` as a migrator / staleness protocol. That is #19.

### Plan (do not apply)

1. `Title.tsx` Continue meta — `{fmtAgo(save.savedAt)}` next to gold/playtime.
2. Sequence after #19 so old/corrupt cards can show it too (peek still has `savedAt` if JSON parsed).
3. Do not invent extra save-health logic here.

---

## 43. Every death plate says "WHISPERWOOD HOLLOW"

**Verdict: keep.** Copy bug. The correct strings already live on `DungeonMeta`.

**Grounding:** Death branch (`HUD.tsx` L575) hardcodes the Whisperwood eyebrow. Subtitle L577 ("The Hollow keeps what it takes") is also Hollow-specific. Complete plate already uses `meta.completeEyebrow` (`HUD.tsx` L192; `dungeons.ts` has all three). `respawn()` returns to that dungeon's entrance (`store.ts` L400), so the plate is the player's orientation and it currently lies in crypt/cinder. `dungeonFor` is already imported. Player value: not thinking you died in the wrong biome. Scope: two strings. Cheapest item in the file.

**Smallest shippable:** `{dungeonFor(place).completeEyebrow}` plus a place-neutral second line ("Your keys and treasures are safe.").

**Realism: yes.**

### Implementation difficulties

- **Easy:** Swap the eyebrow. Neutral subtitle.
- **Medium:** Per-dungeon death flavour (`cleansed`-style). Unnecessary; death is not a story beat.
- **Hard:** None.

### Plan (do not apply)

1. `HUD.tsx` dead branch — eyebrow `dungeonFor(place).completeEyebrow` (hub edge: if `place === "hub"`, say `"EMBERFALL"` or skip; `respawn` from hub is rare).
2. Subtitle: drop "The Hollow keeps…"; keep "Your keys and treasures are safe."
3. Do not add death copy to `dungeons.ts` unless you already have three good lines.

---

## 44. A gamepad cannot close a sign box

**Verdict: keep.** Pad players cannot leave a sign or NPC line. Companion to #3, not a new input scheme.

**Grounding:** `DialogueBox` advances/closes on `window` `keydown` (skipping Esc/Tab) or a click (`HUD.tsx` L111–127). Hint is hardcoded `"E"`. `Player.ts` never reads `dialogue`. Pad A (button 0) sets `wantAttack`; Start (9) toggles pause; there is no dismiss. `hold(99999)` on a sign stops walking, but A still queues an attack for when the box closes, and the box never closes from the pad. Keyboard Esc in HUD already closes dialogue before pause; pad Start does not. Player value: the control scheme #3 exists to serve actually works on signs. Scope: one branch in `readPad` plus the hint string. Do not add a rebind panel (#12).

**Smallest shippable:** While `st.dialogue`, pad A (and maybe B) advance/close the same way as a key, and do **not** set `wantAttack`. Hint uses `K` (`A` on pad). 250 ms grace so the bump that opened it does not also close it.

**Realism: yes.**

### Implementation difficulties

- **Easy:** `readPad`: if `st.dialogue` and `padPressed(0)`, `setDialogue(null)` or a small “advance typewriter” if you want parity with keyboard. Clear `wantAttack`.
- **Medium:** Two-step: first A finishes the typewriter, second A closes — matching keyboard. Needs a store tick or a callback into HUD; easier to always close (lossy vs keyboard, fine for v1).
- **Hard:** Mapping every HUD keydown (bag, journal, pause) through the pad. Pause/bag already have buttons. Stop at dialogue.

### Plan (do not apply)

1. `Player.readPad` — if `st.dialogue`, A (0) closes (or advances); do not `wantAttack`. Ignore throw (2) while the box is up.
2. `HUD.tsx` `DialogueBox` hint — `pad ? "A" : "E"` from the shared `K` map (#3).
3. Same 250 ms open grace: ignore pad A until `time.now` is 250 ms past `setDialogue`. A scene timestamp on the player is enough.
4. Do not make Start close the box (Start stays pause). Keyboard Esc already does both in HUD; pad can pause on top of dialogue.
5. Pause-while-frozen is **#51**. Same `readPad`, later in the same pass if you already have it open — do not leave Start as a one-way door.

---

## 45. The ambient bed keeps playing with the tab hidden

**Verdict: keep.** Music already ducks on hide; wind/cave/lava does not. Same event as #15/#24.

**Grounding:** Only `visibilitychange` in `src/` is `music.ts` L436–444, ramping the **music** `bus`. Ambient has its own `gain` into `master` (`audio.ts` L111–116); the only other writer is the SFX-volume subscriber (L214). Alt-tab therefore stops the chiptune and leaves the bed running — headphones, battery, “the game is still going.” Player value is not leaking cave noise onto the desktop. Scope: one extra ramp. `ambient` may be null (title has no bed) — guard it.

**Smallest shippable:** On hide, `ambient.gain` → 0.0001. On show, back to `ambientVol()`. Do it from the existing music listener (import the ambient gain) or a twin listener in `audio.ts`.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Export a `duckAmbient(hidden: boolean)` from `audio.ts` and call it from the music `visibilitychange` handler, or duplicate the listener next to L214.
- **Medium:** Also stop ambient LFO timers while hidden. Unnecessary if gain is ~0.
- **Hard:** Tying ambient to `togglePause`. Pause already ducks **music** via `duckMusic` in `main.tsx`; ambient keeps going in pause today. Do not expand this idea to “pause mutes the cave.” Tab-hide only.

### Plan (do not apply)

1. `audio.ts` — `duckAmbient(on: boolean)` ramping `ambient.gain` if `ambient` exists.
2. Call it from `music.ts` `visibilitychange` (same hide/show as the bus) **or** a listener beside the sfx-volume subscriber.
3. Do not stop the noise source; just the gain. Do not change pause behaviour.

---

## 46. Enemy deaths sound wrong in dungeons 2–3

**Verdict: shrink.** Texture-key branch for the species that are actually wrong. Palette-swap slimes may keep the slime pop. No new samples.

**Grounding:** `onEnemyDied` (`DungeonScene.ts` L922) is `ForestSprite → "sprite"`, `Skeleton → "bones"`, else `"slime"`. `Slime` is one class with three textures, so blueslime/magmaslime sharing `"slime"` is honest, not a bug. Real mismatches: **mushroom** (else-branch → slime wet-pop after a `spore` puff), **firebat** / **bat** (`ForestSprite` → forest sprite chime). Cinderling is a `Skeleton` and already gets `"bones"`. Hit-side already branches on `texture.key === "bat"` (L907). Player value is small; this is a one-line table, not a sound pack. Do not invent `magma-die` rows unless #10 is open. Pair the key map with #11's kill ids.

**Smallest shippable:** `const k = e.sprite.texture.key`; `mushroom → "spore"` (closed: `audio.ts` L539 is `noise(0.5, …)`, 500 ms one-shot, safe), `bat`/`firebat → "sprite"` or `"bat-hurt"` if that row is one-shot-safe, else leave. Stop.

**Realism: yes** as a key branch. **No** as “dungeons 2–3 sound broken.”

### Implementation difficulties

- **Easy:** Switch on `texture.key` in `onEnemyDied` with a 4-entry map, defaulting to the current instanceof chain.
- **Medium:** New synth rows per species. Only if you are already in `audio.ts` for #10, and even then maybe not.
- **Hard:** Unique death stingers for every enemy. No.

### Plan (do not apply)

1. `DungeonScene.onEnemyDied` — pick sfx from `texture.key`: `mushroom` → `"spore"` (`audio.ts` L539 is `noise(0.5, …)`, 500 ms one-shot — closed), `bat`/`firebat` → `"sprite"`. Leave `slime`/`blueslime`/`magmaslime` on `"slime"`.
2. Share the key list with #11's `kill:` ids if that ships in the same pass.
3. No new files. Do not add this to the 34-check path.

---

## 47. The save is written in place, no shadow copy

**Verdict: keep.** One extra key next to the existing write. Sequence with #19. Do not invent IndexedDB.

**Grounding:** `writeSave` is a single `localStorage.setItem(SAVE_KEY, JSON.stringify(data))` (`store.ts` L235). `SAVE_KEY` is `"emberfall.save.1"` (L93). `grep bak|backup` in `src/` is empty. `readSave` maps parse-throw and `version !== 5` to `null` (L210–213). That last mapping is why #19 exists.

The brainstorm overclaims the failure. HTML `setItem` is specified as all-or-nothing: `QuotaExceededError` leaves the previous value. A "tab killed mid-setItem truncated blob" is a filesystem story; it is not the normal browser path. Quota is **#32**. Accidental `newGame()` clobber is **#14/#19** (`continueGame` L370–371 still calls `newGame()` on a failed read). Two tabs: last writer wins, and a same-origin `.bak` does not reconcile them.

What `.bak` actually buys: a parse-throw on the live key (extension, DevTools, hand-edit, a future bug that writes garbage) can still load the previous good blob. Save-systems skill: keep last-good, fall back on parse error. Player value is real but rare. Scope is S and it lives in the file #19/#32 already open. Extra ~2 KB is not a quota concern unless #32 is already firing — then the bak write must not block the main write.

**Smallest shippable:** Hold `prev = getItem(SAVE_KEY)`. Write main first. Then, only if `prev` JSON-parses with `version === SAVE_VERSION`, `setItem(SAVE_KEY + ".bak", prev)` in its own try. `readSave`/`peekSave`: on main parse-throw, try `.bak` with the same version check; if bak is good, **repair** main (`setItem(SAVE_KEY, bak)`) so the next 300 ms write cannot copy garbage over last-good. `peekSave` reports `"restored"`. Never restore from `""`. Never bak a blob that does not parse.

**Realism: yes.**

### Implementation difficulties

- **Easy:** Two `setItem`s and a fallback read. ~2 KB blob.
- **Medium:** Bak `setItem` throws (quota). Own try, after main success; do not let the copy eat the real save or set `saveFailed` (#32). Do not bak a `prev` that fails parse — that would replace last-good with garbage, then the next restore is useless. Clear both keys from #19's Clear button.
- **Hard:** Treating bak as a second slot, or migrating to IndexedDB / File System Access because "localStorage isn't atomic." Out of scope. Two-tab last-writer-wins is accepted.

### Plan (do not apply)

1. `store.ts` `writeSave` — `const prev = localStorage.getItem(SAVE_KEY)`; write main as today; **then**, in its own try, if `prev` parses and `version === SAVE_VERSION`, `setItem(SAVE_KEY + ".bak", prev)`. Do not bak-first: a quota throw on the copy must not skip the real write, and a corrupt `prev` must not overwrite last-good.
2. `readSave` / `peekSave` (#19) — if main throws, parse `.bak` the same way. Version-checked. Empty bak is absent, not corrupt. On a good bak hit, `setItem(SAVE_KEY, bak)` to repair main before returning.
3. Title line via #19: "Restored from last-good copy" only when bak was used. Clear removes **both** keys.
4. Do not add a third key. Do not bump `SAVE_VERSION`. Do not change the 300 ms debounce. Two-tab last-writer-wins stays accepted.

---

## 48. Wren's swing draws no arc

**Verdict: shrink.** One silent graphics sweep on the active-frame rising edge. Do **not** call `slashArc` as it exists.

**Grounding:** Enemy swings draw `slashArc` (`DungeonScene.ts` L1225; callers `BoneKnight.ts` L177, `Skeleton.ts` L106). Wren's swing already has `play("attack")`, `sfx("swing")`, every-third `sfx("effort")`, and a squash tween (`Player.ts` L388–399), plus a 7-frame attack clip per facing. "The only one that draws nothing" is false — the sprite *is* the swing. The real gap is a miss: audio whooshes, the clip plays, and there is no range cue in a busy room.

`slashArc` is the wrong function to reuse blindly. It `sfx("whoosh")` (L1232) — Bone Knight / skeleton cue, also used at L1819/L1843. Stacking that on `sfx("swing")` is a new sound, not a visual. `PlayerHost` (`Player.ts` L9–21) has `resetSwingHits` and `shake`, not `slashArc`. Hub already no-ops `resetSwingHits` (`HubScene.ts` L484); town swings would crash if you call a missing host method.

Active window is `SWORD.activeFrom..activeTo` (130–255 ms, `weapons.ts`). `resetSwingHits` runs at swing *start* (windup), so drawing there is early. Draw once when `attackActive` goes false → true.

**Smallest shippable:** A `slashArc` graphics-only path (no `whoosh`), ember tint, radius ~`SWORD.reach`, once per swing, skipped when `settings.shake === 0` or reduced-motion (same gate as #17). Hub no-op. Stop.

**Realism: partial.** The call site is real. The "missing swing visual" claim is overstated; this is miss-legibility polish, not a combat bug. After #40 (hit audio) and the existing clip, it is juice, not a blocker.

### Implementation difficulties

- **Easy:** Graphics arc + fade, tint `0xffb060` / Wren ember, `setDepth(y+40)` as now.
- **Medium:** Host method vs optional callback. Hub must compile. Do not fire on recover/`attack-out`.
- **Hard:** A new swing VFX sheet (PixelLab). Not needed; enemies already read as a stroked arc.
- **No:** Calling the current `slashArc` and inheriting `whoosh`.

### Plan (do not apply)

1. `DungeonScene.slashArc` — optional `{ silent?: boolean; color?: number }`; `silent` skips `sfx("whoosh")`. Default stays noisy for Bone Knight / Skeleton.
2. `PlayerHost` — `slashArc?(x, y, angle, radius?)`. `HubScene` no-op (or omit; Player must guard).
3. `Player.ts` attack update — on the rising edge of `attackActive`, `this.scene.slashArc?.(sx, sy, facingAngle, SWORD.reach)` with `silent: true` and ember color. Once per swing.
4. Skip when reduced-motion / `settings.shake === 0`. Do not add a regression check.

---

## 49. The deployed alpha has no favicon

**Verdict: keep** as a one-line head tag pointing at an **existing** PNG. No new raster.

**Grounding:** `index.html` has title, two Google font links, `ui.css` — no `rel="icon"` (confirmed). `public/` is only `assets/`. `public/assets/ui/` is bar/hearts/lock/minimap/panels/slot/townmap plus `icons/` (shard, sword, coin, …). No `favicon.ico`. The Vercel tab is the browser default. That is real and cheap.

The brainstorm inflates it ("hours looking at the tab", "the difference between a game and some localhost") and then asks for **new art** ("one 32×32 from existing tileset art"). A downscale is still a new file under `public/`. `hearts.png` is a sheet — a bad tab icon. `icons/shard.png` and `sprites/props/shrine.png` already exist and read as Emberfall.

Same `index.html` as #28. Do with that delete, not as its own PixelLab errand. Player value is tab identity. Scope is one tag. Displaces nothing if it stays a link.

**Smallest shippable:** `<link rel="icon" href="/assets/ui/icons/shard.png" />` (or shrine). No ico, no apple-touch-icon, no SVG, no new PNG.

**Realism: yes.**

### Implementation difficulties

- **Easy:** One `<link>` in `index.html`. Vite serves `public/` at `/`.
- **Medium:** A dedicated 32×32 crop. Unnecessary; browsers scale the shard.
- **Hard:** A PixelLab logo / maskable PWA icons. Out of scope.

### Plan (do not apply)

1. `index.html` — add `<link rel="icon" href="/assets/ui/icons/shard.png" />` in the same pass as #28's font-link delete.
2. Do not add files under `public/`. Do not touch `assets/ui/hearts.png`.
3. Optional `apple-touch-icon`: skip.

---

## 50. Voice off by default killed the only low-HP cue

**Verdict: keep.** Default `voice: false` made the spoken line a no-op. A synth fallback, same 25 s throttle. Do not flip the default back on.

**Grounding:** `81c9e5d` set `voice: false` (`store.ts` L27/L29). `speak()` returns immediately when voice is off (`audio.ts` L389). The hearts ≤ 2 warning is only `speak("lowhp")` after a 450 ms delay (`Player.ts` L272–274). `hurt` already shows the house pattern: `say("hurt")` plus `if (!voice) tone(...)` (`audio.ts` L520). Visuals (vignette, beating hearts) still fire, so "the only cue" is overstated — unless #17's reduced-motion block also kills those loops, in which case default-settings + reduce-motion is silent. Player value: you are about to die. Scope is S. Do not reopen #41's NPC mute. Do not add a `lowhp` SFX row unless you are already in `audio.ts`.

**Smallest shippable:** In the existing L272 branch, after `speak("lowhp")`, if `!settings.voice`, two short `tone()` beats (reuse the hurt fallback pitches). Keep `lastLowHpLine` / 25 s / 450 ms delay. Voice-on still uses the clip only.

**Realism: yes.** The early-return is the whole bug.

### Implementation difficulties

- **Easy:** `if (!useGame.getState().settings.voice) { tone("sine", [170, 60], …); tone("sine", [170, 60], …, 0.25); }` in `Player.ts`, or a 4-line helper in `audio.ts`. Import `tone` if it is not exported (it may be module-private — then put the fallback next to `hurt` as `sfx("heart")` twice, which already exists, rather than exporting internals).
- **Medium:** A dedicated `lowhp` SFX row. Only if `tone` is not exported and `heart` reads as a pickup. Prefer a tiny exported `heartbeat()` over a new table name.
- **Hard:** Turning `voice` default true, or a second "alerts" slider. Out of scope. The commit already chose off.
- **No:** Firing `speak("lowhp")` anyway so it "falls through." `speak` has no synth path.

### Plan (do not apply)

1. `Player.ts` L272–274 — keep the throttle and delay. Call `speak("lowhp")` when voice is on; when off, a two-beat synth (exported helper or existing `sfx` that is not voice-gated).
2. Do not change `readSettings()` default. Do not touch `speakNpc`. Do not add a regression beat.
3. Pair mentally with #17: if both ship, reduced-motion players still get this beep.

---

## 51. The pause menu is a gamepad one-way door

**Verdict: shrink.** Start must unpause. Do not map Start to the journal. Bag/Back has the same freeze trap — close it too.

**Grounding:** `readPad` button 9 calls `togglePause` (`Player.ts` L376). `paused` is in `shouldFreeze` (`DungeonScene.ts` L236, `HubScene.ts` L154). Both `update`s return while frozen (`DungeonScene.ts` L2132–2133, `HubScene.ts` L579–580), and `Player.update` is the **only** `getGamepads` / `readPad` poll in `src/`. Resume is a focused DOM button (`HUD.tsx` L707) that ignores pad A; Esc is keyboard-only (L522–528). That is a real trap: a pad player cannot leave pause without a keyboard or mouse.

The journal half is a different, weaker claim. `K.journal` and `K.pause` are **both** `"Start"` (`HUD.tsx` L503). Keyboard uses M vs Esc. Start cannot mean both. The journal opener is the `M` keydown (L517); there is no pad journal today. "Let Start-in-pause open the journal as K promises" would make pause irreversible again or toggle-fight with unpause. The pause panel already lists `M` for the journal (L671) and has no Journal button. Bag is the same freeze door (button 8 → `toggleBag`, L377, then frozen). Honour Back while frozen too.

**Smallest shippable:** While frozen for pause or bag, poll pad **Start** (and **Back** if bag is open) only — no `wantAttack` / `wantThrow`. Start toggles pause off. Back closes the bag. Fix `K.journal` so it is not `"Start"` (leave journal on M, or a pause-panel button later). Hub must get the same poll.

**Realism: partial.** Unpause-on-Start: yes. "The pad legend is complete" / journal-on-Start: no, without a free button.

### Implementation difficulties

- **Easy:** Before `if (this.frozen) return`, call a `player.pollMenuPad()` that only reads buttons 9 and 8. Or poll from HUD `requestAnimationFrame` while `paused || bagOpen` so Phaser `time.paused` cannot stall it (`setFrozen` sets `this.time.paused = true` at L2117–2118 — `delayedCall` is dead, but `update` still runs on the scene unless the game loop is paused; **scene `update` still fires when `time.paused`**, because that flag stops clocks/tweens, not the scene step). Confirm: Phaser `time.paused` does **not** skip `scene.update`. The early `if (this.frozen) return` is the actual cut. So a pre-guard poll in both scenes is enough; no rAF needed.
- **Medium:** Full `readPad` while frozen would queue a swing on A (Resume is auto-focused; pad A is also attack). Must strip everything except Start/Back.
- **Hard:** Pad focus navigation of pause settings (#3's leftover, not this idea). Journal on a chord / Select. Out of v1.
- **No:** Start-opens-journal. Dual-binding is how the one-way door comes back.

### Plan (do not apply)

1. `Player.ts` — `pollMenuPad()`: if `paused`, Start (9) → `togglePause()`. If `bagOpen`, Back (8) → `toggleBag(false)`. Never set `wantAttack`.
2. `DungeonScene.update` and `HubScene.update` — call it **before** the frozen return. Do not unfreeze the world.
3. `HUD.tsx` `K` — `journal` stays `"M"` on pad (or omit). Pause legend: Start pause/resume, not journal. Optional: a "Journal" pause-panel button, not a Start remap.
4. Same pass as #44 if `readPad` is already open. Do not wait on #3's hint pass; the trap ships today.

---

## 52. The playtime clock counts wall-clock time

**Verdict: keep.** Fold live time on pause / leave-game. The proposed "subscriber tick" does not exist.

**Grounding:** `writeSave` always adds `Date.now() - sessionStart` (`store.ts` L232). `sessionStart` is set at `newGame` / `continueGame` (L365/L389) and never adjusted. Title Continue (`Title.tsx` L34) and Complete (`HUD.tsx` L200) therefore count pause, the dead plate, and a tab left open overnight. #5's run length would inherit the lie.

The brainstorm's fix is wrong: the autosave subscriber (L409–413) is **not a tick**. It fires on hearts/gold/keys/items/flags/room/lessons/counters/place/tiers — **not** on `paused`, and not on a timer. While paused, those fields do not change, so "roll `sessionStart` forward on the existing subscriber" never runs. AFK pause would still accrue.

Player value is modest (an honest "4h" vs lunch-AFK). Scope is still S if it stays a fold in the store. Pair with #15 so a hidden tab auto-pauses and the clock stops. Do not pause the clock for dialogue/shop/bag — that is still play.

**Smallest shippable:** Live delta only while `!paused && screen === "game"`. On `togglePause(true)`, `die`, `completeDungeon`, `quitToTitle`: fold `Date.now() - sessionStart` into `playtimeMs` and clear `sessionStart`. On `togglePause(false)` / `startGame` / `respawn`: `sessionStart = Date.now()`. `writeSave` uses `playtimeMs + (sessionStart ? Date.now() - sessionStart : 0)`.

**Realism: yes.** Wrong proposed hook; right store folds.

### Implementation difficulties

- **Easy:** Guard the live add in `writeSave`. Fold/clear `sessionStart` in `togglePause` / `die` / `completeDungeon`.
- **Medium:** Hidden-tab overnight without #15 still inflates. Do #15 first or also fold on `visibilitychange` hidden (same listener as #24). Do not double-fold if both fire.
- **Hard:** Per-room / per-boss active time for #5. Separate, later, behind `isDebug()`. Not this idea.

### Plan (do not apply)

1. `store.ts` `writeSave` — `live = s.sessionStart && !s.paused && s.screen === "game" ? Date.now() - s.sessionStart : 0`.
2. `togglePause` — if turning on, `playtimeMs += live`, `sessionStart = 0`; if turning off, `sessionStart = Date.now()`.
3. `die` / `completeDungeon` / `quitToTitle` — same fold, then `sessionStart = 0`. `respawn` / `startGame` / `continueGame` already stamp `sessionStart`.
4. Do not add a setInterval. Do not use the autosave subscriber as a clock. Do not freeze during `dialogue` / `shop` / `bagOpen`.

---

## Out of scope (do not pad back in)

- 4th dungeon / "new roads" as content (PixelLab floor ~700 gens).
- Remote telemetry, accounts, cloud saves.
- Enemy-count difficulty.
- Extra tools / generic weapon factory.
- Sample SFX library without files in `public/assets/sfx/`.
- Key rebind panel.
- i18n catalogue / language picker.
- Mid-quest boss rematches.
- Plaza cosmetics / trophy plaques.
- Virtual stick until the user answers the ask.
- `window.__game` on the production Vercel bundle.
- Phaser Layer / RenderTexture tile bake until FPS is measured.
- Partial autotile (#30) until a profile shows a hitch.
- HUD `--fs` text-scale setting (#37) — fights the integer pixel font.
- Screen-reader movement / canvas description (#33 beyond live regions).
- Debug overlay HUD (#36 beyond `isDebug()` + console).
- Selector-rewriting every `useGame()` call (#35 beyond dropping dead facing/action).
- Muting Tam/Maren/Orrin because Wren's `settings.voice` is off (#41b). The setting comment already says townsfolk keep theirs.
- New death-SFX samples / per-species stingers (#46 beyond a texture-key map of existing rows).
- Muting the ambient bed on pause (#45 is tab-hide only).
- IndexedDB / File System Access / a second named save slot (#47 is one `.bak` key).
- Calling `slashArc` as-is on Wren (#48) — that function plays `sfx("whoosh")` (`DungeonScene.ts` L1232) on top of `sfx("swing")`.
- A PixelLab / commissioned favicon, apple-touch-icon set, or new 32×32 raster (#49 links an existing PNG).
- Flipping `voice` default back to true (#50 is a synth fallback, not a settings revert).
- Start-opens-journal / pad focus-walking the pause settings (#51 is Start-unpause + Back-close-bag).
- A playtime `setInterval` or "subscriber tick" (#52 folds on pause/leave-game only).

## Open questions (from IDEAS.md; not extra features)

1. Desktop-only alpha vs virtual-stick investment → this plan ships a disclaimer (#2 shrink). Stick waits on a yes. Related: pad is already wired, but #51 means pause is a keyboard trap today — that is a bugfix, not a "does anyone play pad" research project.
2. NG+ vs 4th dungeon → NG+ (#4 keep); 4th dungeon out of scope.
3. Difficulty knobs → incoming damage + heart-drop (#1 keep); starting-hearts optional; enemy-count deferred.
