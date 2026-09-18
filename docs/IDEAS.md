# Emberfall — ideas, gap analysis, verdicts

Suggestions only; nothing under `src/` changed by this review. Grounded against `main` @ `81c9e5d` ("Wren's voice off by default") — same commit as the last two passes, clean tree except these two untracked docs; regression re-counted at 34 `ok()` sites, unchanged. Budget went to applying the plan's fresh #47-#52 verdicts, restoring #47's body (the last pass kept its index row but lost its section), re-measuring the SFX table (my earlier "46" was a bad count — it is 58), and three new probes.
**Plan coverage**: #1-#52 + S all judged (keep 33 / shrink 14 / drop 5, `IMPLEMENTATION-PLAN.md` Scoreboard + this-pass sections). **#53-#55 are new this pass.** Judged entries stay one-line: evidence, verdict, plan-authorised scope; reasoning lives in the plan.

## Feedback to planner

- Fact-correction, mine: I told you the SFX table was 46 rows; scripted recount of the `const SFX` block says **58** (union and table both), so the long-standing 58 was right. Your scoreboard cites no row count, so nothing of yours moves — my fact line is fixed.
- #50: `tone` is module-private (`audio.ts` L259), so the fallback lands as a tiny exported `heartbeat()` in `audio.ts`, per your Easy line — no new SFX row.
- #51 scope question: with Start no longer meaning journal on pad, do you want the pad `K.journal` badge changed to `"M"` (`HUD.tsx` L503) or simply not rendered (the quest eyebrow already hides it on pad, L606)? Either is one line; pick one so the next pass can't drift.
- #52: applying your fold list verbatim; note `writeSave` already tolerates `sessionStart: 0` (`store.ts` L232 `s.sessionStart ? … : 0`), so your expression needs no change. Confirming shape, not arguing.
- Your #50-#52 verdicts landed between my first read and this write and are applied below; the only remaining lag is that you haven't seen **#53-#55**.

## Index

| id | title | effort | verdict |
|----|-------|--------|---------|
| 43 | Death plate says "Whisperwood" everywhere | S | keep |
| 25 | Bomb lesson can never start | S | keep |
| 40 | The fire rod's hit is the only silent one | S | keep |
| 44 | A gamepad cannot close a sign box | S | keep |
| 14 | New-game overwrite confirm | S | keep |
| 19 | Old/corrupt save says nothing | S | keep |
| 47 | The save is written in place, no shadow copy | S | keep |
| 24 | Autosave misses death + Complete | S | keep |
| 32 | A failed save is invisible | S | keep |
| 15 | Auto-pause on tab hide | S | keep |
| 45 | The ambient bed ignores tab-hide | S | keep |
| 17 | Motion/shake settings lie | S | keep |
| 18 | Dialogue should freeze the room | S | keep |
| 29 | A broken boot looks black | S | keep |
| 28 | Unused Google font, render-blocking | S | keep |
| 49 | Deployed alpha has no favicon | S | keep (link existing PNG) |
| 41 | Wren's clips prefetch while voice is off | S | shrink (Wren only) |
| 39 | Build stamp on the title | S | keep |
| 36 | Nothing parses `?debug=1` | S | keep, overlay dropped |
| 31 | Dev-only room-data validation | S | keep |
| 3 | Gamepad-aware HUD hints | S | keep |
| 7 | Chest coin-pop only | S | keep, shrunk |
| S | Shrine "saved" flash | S | keep |
| 13 | Sign coverage in crypt + cinder | S | keep |
| 34 | Town has nothing to read | S | keep |
| 42 | Title shows `savedAt` | S | keep |
| 46 | Later-dungeon death SFX | S | shrink (two rows) |
| 10 | Retune 4 synth SFX | S | shrink |
| 11 | Kill tally in the journal | S | shrink |
| 22 | Intro plates in the journal | S | shrink |
| 1 | Difficulty (damage + heart-drop) | S | keep, shrunk |
| 2 | Touch: disclaimer only | S | shrink |
| 4 | NG+ | M | keep, shrunk |
| 9 | Post-finale boss trials | S-M | shrink |
| 20 | Post-finale gold: one flavour buy | S | shrink |
| 21 | One chute, one dungeon | S-M | shrink |
| 16 | Save export/import | S-M | keep |
| 8 | Props atlas: verify, don't rebuild | S | keep |
| 5 | Telemetry under its own key | S | keep, shrunk |
| 26 | Regression extras, dev only | S | shrink |
| 27 | Depth guard now, Layer later | S | shrink |
| 33 | Screen-reader HUD | S | shrink (labels only) |
| 35 | Dead `facing`/`action` writes | S | shrink (no selectors) |
| 38 | Per-dungeon enemy clips | S | shrink, fold into #8 |
| 48 | Wren's swing draws no arc | S | shrink (silent graphics path) |
| 50 | Voice-off default killed the low-HP cue | S | keep |
| 51 | The pause menu is a pad one-way door | S | shrink (unpause + bag only) |
| 52 | Playtime counts wall-clock time | S | keep (fold on transitions) |
| 53 | A blocked bomb still prints its damage number | S | unjudged |
| 54 | A locked door refuses in silence | S | unjudged |
| 55 | One 1.8 MB chunk re-ships for every edit | S | unjudged |
| — | #6, #12, #23, #30, #37 | — | dropped, see bottom |

**Do first**, verbatim from the plan: 43, 25, 40, 44, 14, 19, 47, 24, 32, 15, 45, 17, 18, 29, 28, 49, 41, 39, 36, 31, then 3 / 7 / S / 48 / 8 / 13 / 34 / 42 / 46, then 1 / 22 / 11 / 4 / 35. Stop before 2's stick, 9, 16-as-a-project, 20, 21, 26b, 27's Layer rewrite, 33-as-a-canvas-RPG, 38-as-an-atlas. Never: 6, 12, 23, 30, 37, muting townsfolk, new death-SFX samples, a 4th dungeon, remote telemetry, enemy-count difficulty, sample SFX without files, `__game` on the Vercel bundle, IndexedDB/File-System saves, a PixelLab favicon, `slashArc`'s `whoosh` on Wren.

## Bugs and save-safety

### 43. Every death plate says "WHISPERWOOD HOLLOW"
`HUD.tsx` L575 hardcodes the eyebrow and L577's subtitle ("The Hollow keeps what it takes") is Hollow-specific too; `completeEyebrow` carries all three (`dungeons.ts` L45/61/78) and `respawn()` returns to that dungeon's entrance (`store.ts` L400), so the plate lies at the one moment a player reads it. Authorised scope: `dungeonFor(place).completeEyebrow` + a place-neutral second line ("Your keys and treasures are safe.") — two strings. `src/ui/HUD.tsx`. **S · keep.**

### 25. The bomb lesson can never fire
`"bomb"` is wired end to end (`LessonId` `store.ts` L41, coach copy `HUD.tsx` L54/L58, readiness guard `DungeonScene.ts` L1429, completion L1900), but `startLesson` has six callers (L247/607/1532/1545/1550/1887) and the chain table (L1454) holds only `move→dash` — nothing starts bomb, so 8 cracked-wall tiles across the three dungeons sit behind `unlock:bomb` the player was never taught. Measured: `unlocks.bomb = "east-crystal"` (`dungeons.ts` L47; room exists, `whisperwood.json` L158) but the cracked walls themselves are in `treasure` — one room away — so teach on flag-set, same shape as the potion hook (L1887). `DungeonScene.ts`. **S · keep.**

### 40. The fire rod's hit is the only silent one
The sword route owns `sfx(blocked ? "clang" : "hit")`, per-species hurt, `shake`, `hitStop(60)`, `damageNumber` (`DungeonScene.ts` L906-912); bomb/boomerang/grapple all hit-stop (L1925/L1851, L1827). The rod's overlap (L1681-1691) does heat → `takeHit` → number → `burst()` with no sfx, no hit-stop (zero `sfx(` in `FireBolt.ts`), and the Golem's bark branch (L1683) is silent too. Authorised scope: `sfx("hit")` + `hitStop(30)` on both branches; `burst()` stays puff-only; no new row unless #10 is open. `DungeonScene.ts`. **S · keep.**

### 44. A gamepad cannot close a sign box
Dialogue dismisses on DOM `keydown`/click only (`HUD.tsx` L111-127); `readPad` reads buttons 0/2/3/5/4/9/8 and never `st.dialogue` (`Player.ts` L371-377), so a pad player is stuck in a sign line and A queues a swing meanwhile. Authorised scope: while `st.dialogue`, A(0) closes (250 ms open grace) and does **not** set `wantAttack`; ignore throw(2) while up; hint reads the `K` map; **Start stays pause** (keyboard Esc already does both). `Player.ts`, `HUD.tsx`. **S · keep.** Same `readPad` pass as #3/#51.

### 14. New game silently overwrites a finished save
`Title.tsx` L46 calls `newGame()` bare; no `confirm` anywhere in `src/`; `screen:"intro"` isn't saved, so the burn lands on the next `startGame()`. Fix: local `confirming` state — first click arms, second runs — copy from the `chapter.title`/finale strings the file already computes. `Title.tsx`. **S · keep.**

### 19. An old or corrupt save vanishes without a word
`readSave()` returns `null` on version mismatch (`store.ts` L210) or any parse throw (L211-213); Continue renders only `{save && …}` (`Title.tsx` L28); worse, `continueGame()` falls back to `newGame()` on a failed read (L370-371). Fix: `peekSave()` → `absent | corrupt | old | restored`, one muted line + "Clear it" (Clear removes **both** `SAVE_KEY` and `.bak`, never calls `newGame()`), no silent Continue fallback. `store.ts`, `Title.tsx`. **S · keep.** Do before #16 / #32 / #42 / #47.

### 47. The save is written in place, no shadow copy (body restored — the last pass lost it)
`writeSave` is one `setItem` on one key (`store.ts` L235, `SAVE_KEY` L93); no `.bak` anywhere. The plan corrects the framing: `setItem` is all-or-nothing, so the real exposure is a garbage live key (extension, hand-edit, a future bad write), not a mid-write truncation; quota is #32, accidental clobber is #14/#19. Authorised scope (plan L1246-1249): hold `prev`, write main first, then — only if `prev` parses with `version === SAVE_VERSION` — `setItem(SAVE_KEY + ".bak", prev)` in its own try; on a main parse-throw, `readSave`/`peekSave` try `.bak`, repair main, and report `"restored"`; bak's own quota throw stays silent (#32's rule 4); no third key, no version bump. `store.ts`. **S · keep.** Sequence with #19.

### 24. Autosave drops death and the last beat
The debounced writer runs on `screen === "game" || "complete"`, the unload flush is narrower (`store.ts` L417 game-only), and `die()` sets `screen:"dead"` (L399). Fix: widen to `screen !== "title" && screen !== "intro"`, flush on `visibilitychange → hidden`. `store.ts`. **S · keep.** One listener with #15/#45.

### 32. A failed save is invisible
`writeSave()` swallows every failure (`store.ts` L236-237; the settings write at L350-352 swallows the same way); Safari private mode never persists and the shrine keeps narrating "Saved." (`HubScene.ts` L358). Scope: `saveFailed` set in that catch, cleared on the next good write, one muted line in #29's slot, quiet the shrine copy while set; #47's bak failure must not set the flag if main wrote. `store.ts`, `HUD.tsx`. **S · keep.**

### 15. No auto-pause on blur/hidden
`music.ts` L436-444 mutes the music bus on hide, but the freeze predicate (`DungeonScene.ts` L236) omits blur and `config.ts` has no `autoPause`, so Wren keeps getting hit alt-tabbed. On `document.hidden` while `screen === "game" && !paused && !dead`, `togglePause(true)`; don't unpause on return; prefer `visibilitychange` to `blur`. `HUD.tsx` or `store.ts`. **S · keep.** Also what stops #52's clock during AFK.

### 45. The ambient bed keeps playing with the tab hidden
The only `visibilitychange` in `src/` (`music.ts` L436-444) ramps the **music** bus; the per-place bed has its own gain into master (`audio.ts` L111-116). Scope: export `duckAmbient(on)` ramping `ambient.gain` (null-guard — `ambient` is null on the title), call from the existing hide/show — **tab-hide only**, pause-muting is out. `audio.ts` + one call in `music.ts`. **S · keep.** Three ideas, one listener.

### 17. Half the always-on motion ignores both motion settings
`ui.css` honours `prefers-reduced-motion` in exactly two blocks (L70, L157); every infinite loop sits outside them — vignette L63, `.mm.here` L98, `.mm-quest` L274, `.wm-room.here` L305/L324, `.tm-gate.open` L316, caret L142, `.bossstatus` L221/L222. Two raw call sites bypass `DungeonScene.shake` (L1092-1094): `Treant.ts` L183 and `DungeonScene.ts` L1167. Fix: one more reduce block + route both through `scene.shake`; optional `matchMedia` default for `settings.shake`. Feeds #50's silent-with-reduce-motion case. **S · keep.**

### 18. Reading a signpost mid-fight costs you a heart
The bump runs `player.hold(99999)` (`DungeonScene.ts` L1471-1473) but `shouldFreeze` (L236) omits `dialogue`. Scope: skip enemy + hazard updates while `st.dialogue` — don't extend `shouldFreeze`: `setFrozen` (L2117-2123) also pauses `time.paused`, stranding boss-intro `delayedCall` chains. Re-run the regression's talk/sign steps. **S · keep.**

### 29. A broken boot looks like a black screen with a menu on it
`.ready` is added at the **end** of `create()` (`ui.css` L25-26; `DungeonScene.ts` L231), error reporting is DEV-only (`main.tsx` L9-11), no React boundary. Fix: `.ready` first thing in `create()`, one unconditional listener, one muted "Something broke — reload" line behind `isDebug()` plus #39's stamp. **S · keep.** The slot #32 reuses.

### 28. A render-blocking font nobody uses
`index.html` L7-8 preconnects + loads Pixelify Sans *and* IBM Plex Sans; zero Plex hits in `src/`, the only stack is `"Emberfall Pixel", "Pixelify Sans", monospace` (`ui.css` L33), self-hosted. Plan's scope is stronger than mine: delete **both** Google tags (Pixelify too — the TTF is the real face, the fallback becomes `monospace`), no vendoring. Same `<head>` pass as #49. `index.html`, `ui.css`. **S · keep.**

### 49. The deployed alpha has no favicon
`index.html` has zero `rel="icon"` (verified: head is `preconnect` + one font `<link>` + one stylesheet) and `public/` ships only `assets/`. Plan: **keep** as one tag pointing at an existing PNG — `<link rel="icon" href="/assets/ui/icons/shard.png" />` (`icons/shard.png` verified on disk; drop my hearts.png/downscale idea — a new raster is a new file). Same head edit as #28. **S · keep.**

### 39. The deployed alpha can't say which build it is
`v0.1 prototype` (`Title.tsx` L50) is the only version string; package.json is `0.0.1`, `vite.config.ts` defines nothing, no CI. Fix: Vite `define` of package version + commit sha at build time (or `VITE_APP_VERSION`), `"dev"` fallback, declared in `vite-env.d.ts`, rendered in `title-version` and appended to #29's line. No GitHub Actions just to print a hash. **S · keep.**

### 36. Nothing parses `?debug=1`, though four ideas assume it
Zero hits for `location.search`/`URLSearchParams`; the only `debug` is `arcade: { debug: false }` (`config.ts` L23). Authorised scope (no overlay HUD): `src/game/debug.ts` exporting `isDebug()`, a 2 s `actualFps` console log from `main.tsx`; `__game` stays DEV-only. **S · keep.** Gate for #27's number and #5's readout.

### 31. Nothing checks that a room's text arrays line up with its tiles
`room.chests?.[p.index] ?? "gold"` (`DungeonScene.ts` L559) turns an extra `C` into a free 30-gold chest; `signs?.[p.index] ?? "..."` (L567) prints a literal; the placement switch (L438-594) has no `default:` — a typo'd legend char places nothing silently. Data is consistent today. Fix: dev-only asserts in the `Dungeon` constructor beside the map-size throw. **S · keep.**

## Content and writing

### 13. Sign coverage in the two later dungeons
Re-measured again with node: Whisperwood 8 rooms / 7 signed / 8 strings, crypt 10 / 2 / 2 (+1 empty `signs: []`), cinder 10 / 1 / 1 (+1). Longest existing caption is 122 chars (`sunken-crypt/entrance`) → 3.4 s of typing at 28 ms/char inside the 6.5 s hold, so new copy has room. Content-only: one or two `signs` per room in the two later JSONs, drop the empty arrays; don't extend `side:signs`. **S · keep.**

### 34. Town has nothing to read
Zero readable props in town (`HubScene.ts` "sign" → the gate-art comment only), so the shrine's save-model line ("Rested. The shrine keeps your progress.", L356) is the only readable text and it fires unlabeled. Scope: `sign` legend char + two boards + `PROPS` entry + `checkSigns` shared — the plan flags **not** zero-code. Four lines of copy max. `emberfall-town.json`, `HubScene.ts`. **S · keep.**

### 42. The save knows when it saved; the title never says so
`writeSave` stamps `savedAt` (`store.ts` L233), unread, while the Continue card renders gold · playtime (`Title.tsx` L34). Append ` · saved {fmtAgo}` to that meta row — a clock, not save health. Sequence after #19. `Title.tsx`. **S · keep.**

### 46. Enemy deaths sound wrong in dungeons 2-3
`onEnemyDied` picks the sound by three-way `instanceof` (`DungeonScene.ts` L922): the mushroom dies with a slime wet-pop right after its own `sfx("spore")`, bat/firebat die with the sprite chime. Scope: switch on `e.sprite.texture.key` (pattern L907), `mushroom → "spore"` (verified 500 ms one-shot, `audio.ts` L539), `bat`/`firebat → "sprite"` or `"bat-hurt"`, default to today's chain, share the key map with #11. No new samples. **S · shrink.**

### 22. The premise can be read once and never again
Intro plates render only on `screen === "intro"`, Esc skips (`HUD.tsx` L143-156). The journal already carries per-quest `title`/`objective`/`story` (L742-746). Scope: one short block, the three plates verbatim, no recap engine at n=3. `HUD.tsx`. **S · shrink.**

### 11. Kill tally in the journal
Writer: `st.bump("kill:" + e.sprite.texture.key)` from the single death path (L920-929), riding persisted `counters`; texture-key → stable id map (shared with #46); hide zeros; no dex. **S · shrink.**

### 4. Post-finale loop: NG+, not a 4th dungeon
`newGamePlus()`: keep items/tiers/gold/hearts/lessons, strip dungeon-only `cleared:`/`visited:`/`chest:`/`solved:`/`boss:`/`shard:`/`key:`/`door:`/`unlock:`, keep `finale`, add `ngplus` as a flag, not a SAVE_VERSION bump; button on the Complete plate; one line each for Tam/Maren/Orrin. No modifiers before #1, no respawned bosses (#9). **M · keep (shrunk).**

### 9. Post-finale boss trials only
Re-entry gated at L428. Scope: `finale`-gated three buttons, transient `replayBoss` honoured by `enterRoom`, "Trial complete" with no shard. Pad note: #51's shrink now makes the pause panel reachable on pad, which this depends on. **S-M · shrink.**

### 20. Post-finale gold: one flavour buy
Gold keeps flowing while all seven shop rows are capped/one-shot (`shop.ts` L20-32); the deduct question is closed (`store.ts` L322-323). Scope: one repeatable Orrin row (`ingot`, 50, no `upgrade`), optionally `finale`-gated. **S · shrink.**

### 21. Every dungeon is the same shape
All three are 4×3 with the same purpose histogram (8/10/10 rooms — re-confirmed via `gx/gy` this pass); nothing to move *through* except `L`/`Z`. Scope: **one** Cinder chute from a cleared late room back toward the entrance, opening on `cleared:<room>` — a `"shortcut"` case in the placement switch (L438) + `cinder-depths.json`. **S-M · shrink.**

## Feel, audio, HUD

### 3. Gamepad-aware HUD hints
The pad works (`Player.ts` L364) and `Coach` + hotbar swap on `inputMode` (`HUD.tsx` L503 `K` map, `PAD_KEYS` ~L54), but the pause list (L661-672), `DialogueBox` continue ("E"), journal badge and `ITEM_META` hints ("RMB") are hardcoded keyboard. Scope: lift `K` so pause, dialogue, journal, hotbar and the quest eyebrow all read it; pad shows the pad legend only; "arrows work too" (absorbed from dropped #12); the unplugged-pad edge (L346-350) is a one-line companion. Dismissal is #44; per #51's verdict the pad legend must stop claiming Start-as-journal. `HUD.tsx`. **S · keep.**

### 7. Chest coin-pop
Only the gold case is flat. 6-8 `icon-coin` tweens at the chest, random vx, gravity ~400, `setDepth(chest + 3)`, ~500 ms on `contents === "gold"`. The 1300 ms banner hold (L432) must stay — the regression's `openChests` waits on it. `DungeonScene.ts` (`addChest` L727). **S · keep (shrunk).**

### S. Shrine "saved" flash
`HubScene.ts` L352-359 chimes, heals, toasts, narrates — no flash. `cameras.main.flash(200, 255, 242, 176)`, skipped under reduced-motion, goes quiet when #32's `saveFailed` is set. **S · keep.**

### 48. Wren's swing draws no arc — on a miss
Enemy swings draw `slashArc` (`DungeonScene.ts` L1225; `BoneKnight.ts` L177, `Skeleton.ts` L106), so the art exists. The plan's shrink accepted, with two corrections that are right: the sprite clip *is* the swing (7 frames/facing + squash + `sfx("swing")`, `Player.ts` L388-399), so this is **miss-legibility**, and `slashArc` as-is plays `sfx("whoosh")` (L1232) — stacking it on `swing` is a new sound. Authorised scope: graphics-only `slashArc` path (`{ silent?: boolean; color?: number }`, default stays noisy), called on the **rising edge of `attackActive`** (`Player.ts` L181, not the windup `resetSwingHits` hook), radius ~`SWORD.reach`, ember tint, once per swing, gated by #17's settings, `PlayerHost` gains `slashArc?` and HubScene no-ops it (L481-484 pattern). `Player.ts`, `DungeonScene.ts`, `HubScene.ts`. **S · shrink.**

### 53. A blocked bomb still prints its damage number — NEW
`onExplosion` calls `e.takeHit(x, y, 2)` and unconditionally draws `-2` (`DungeonScene.ts` L1929-1932 — the returned boolean is used only for `died`), while the sword gates the same number on `!blocked` (L903, L912). Bomb the Bone Knight / Cinder Golem / Treant while guarded and you get "-2" floating up in the same frame as the status line "The shield takes it" / "The crust drinks steel" (they `return false` without damage: `BoneKnight.ts` L282-285, `CinderGolem.ts` L229-232, `Treant.ts` L220-223) — the feedback layer contradicts the mechanic, and on a Cinderling the 2 px nudge (`Skeleton.ts` L134-138) reads as a clean hit with no signal at all. Fix: print the number only when `takeHit` returned true, mirroring the sword, plus the sword's `sfx("clang")` on blocked. No change to bomb damage rules, no boss numbers beyond today's behaviour. `DungeonScene.ts`. **S.**

### 54. A locked door refuses in silence — NEW
`touchDoor`'s reject paths — `toast("icon-key", "Locked - needs a small key")` (L1349) and the boss-key twin (L1352) — are visual only: no `sfx(`, no nudge, while the *success* path is loud (`sfx(door.kind === "boss" ? "boss-door" : "door")`, L1356) and every other physical refusal in the game sounds (`"block"` for a block push, L1625; `clang` on a shield, L906). Walking a locked door repeatedly is the game's most repeated no-op. Fix: `sfx("block")` (row exists, `audio.ts` L540) on rejection + a ~2 px `door.image` tween nudge; no new sample, no shake. `DungeonScene.ts`. **S.**

### 10. Retune four synth SFX, don't chase samples
No sample files exist (`public/assets` has no `sfx/` dir), so swapping is asset-blocked; and the `SFX` table — **58 rows**, re-counted from `const SFX` (`audio.ts` L517-599) with a script, matching the `SfxName` union, every row with a call site — has no prune candidate either. v1: retune the `hit`, `hurt`, `chest`, `swing` envelopes in `audio.ts` only. **S · shrink.**

### 1. Difficulty setting
Two knobs: incoming damage in `Player.hurt` (after the armour glance, L253-268) and the heart-drop roll (`DungeonScene.ts` L928 `Math.random() < 0.2`). Easy/Normal/Hard as one pause row on `settings` — no save-format risk, no enemy-count scaling. `store.ts`, `HUD.tsx`, `Player.ts`, `DungeonScene.ts`. **S · keep (shrunk).** Do #5 first.

### 2. Touch: ship a disclaimer, not a stick
`Player.ts` L102-104 turns every `pointerdown` into attack state and forces `inputMode: "kb"`. Interim: one muted line on `Title.tsx` + the pause controls blurb. **S · shrink.**

### 50. Voice off by default killed the only low-HP audio cue
`81c9e5d` made `voice: false` the default (`store.ts` L27/L29) and `speak()` early-returns when off (`audio.ts` L389); the hearts ≤ 2 warning is `speak("lowhp")` and nothing else (`Player.ts` L272-274), while #17's fix will also still the visual loops — default settings + reduce-motion is a silent death sentence. Plan correction accepted: visuals do exist today, so "only cue" was overstated; the fix stands as **keep**. Authorised scope: in the L272 branch, when `!settings.voice`, fire two short beats on the same 25 s throttle and 450 ms delay — as a tiny exported `heartbeat()` in `audio.ts` (`tone` is module-private, L259), reusing the `hurt` row's fallback pattern (L520); no new table row, no default flip, no NPC mute (#41's verdict holds). `Player.ts`, `audio.ts`. **S · keep.**

### 51. The pause menu is a gamepad one-way door
Start pauses (`Player.ts` L376) but `paused` freezes the scene (predicate L236) and both `update`s return while frozen (`DungeonScene.ts` L2132-2133, `HubScene.ts` L579-580), so `Player.update` — the only pad poll — stops; Resume is a DOM button and Esc is keyboard-only. The plan's shrink is right and my journal half was wrong: `K.journal` and `K.pause` are both `"Start"` (L503), so Start can't mean both. Authorised scope: a `pollMenuPad()` called **before** the frozen guard in both scenes, reading button 9 (unpause) and 8 (close bag if open) only, no `wantAttack`/`wantThrow`; fix `K.journal` so the pad legend stops promising Start (see Feedback, line 3 — change the badge or hide it); the plan verified `time.paused` doesn't stop `scene.update`, so the pre-guard poll is enough, no rAF. Out: journal on pad, pause-panel buttons. `Player.ts`, `DungeonScene.ts`, `HubScene.ts`, `HUD.tsx`. **S · shrink.**

### 52. The playtime clock counts wall-clock time
`playtimeMs` folds `Date.now() - sessionStart` at every write (`store.ts` L232), stamped at `newGame`/`continueGame` (L365/L389), so Title (`Title.tsx` L34) and Complete (`HUD.tsx` L200) count pause, the dead plate, and overnight AFK; #5's run length inherits it. My "roll forward on the autosave subscriber" hook was wrong — that subscriber (L409-413) isn't a tick and never fires on `paused`. Authorised scope: fold-and-clear on `togglePause(true)`, `die`, `completeDungeon`, `quitToTitle`; re-stamp on `togglePause(false)`, `startGame`, `respawn`; `writeSave` already tolerates `sessionStart: 0`; dialogue/shop/bag keep the clock (that's play); pair with #15 so a hidden tab stops it. `store.ts`. **S · keep.**

## Robustness, perf, tooling

### 16. Copy/paste save code
One localStorage key on a Vercel alpha. `exportSave()`/`importSave()` — base64 of the existing JSON via `navigator.clipboard` with `<textarea>` fallback, version-checked, size-capped, no `eval` — plus two title buttons reusing #14's two-step. The plan's caveats stand: import must re-read (`Title.tsx` L13 `useMemo(readSave, [])`); sequence **after #19, #24 and #47** (bak is the importer's last-good fallback). `store.ts`, `Title.tsx`. **S-M · keep.**

### 8. Props atlas: verify, don't rebuild
Mostly shipped (`propAtlas.ts` + `pack_props.py`; `preload` already no-ops the prop list, `DungeonScene.ts` L134-137). Remaining: re-run the packer and diff stems; move the `DialogueBox` `<img>` target (`HUD.tsx` L128) under `assets/ui/`; don't delete source PNGs. #38 is the rest. **S · keep.**

### 38. Per-dungeon enemy clips
`preload` loops all 76 enemy-clip frames whatever the place (`DungeonScene.ts` L140, `ENEMY_CLIPS` L30); Whisperwood needs 38, crypt/cinder 28. Folded into #8: always load door clips, key water/lava off the legend, species clips only if `def.rooms` places them; no atlas rebuild. **S · shrink.**

### 5. Telemetry under its own key
`counters` + `bump()` persist (`store.ts` L361) but `fresh()` wipes them on New Game (L249). Separate `emberfall.telemetry` (deaths per place, hearts lost per room, boss durations, run length once #52's clock is honest) and `console.table` it under `isDebug()`. **S · keep (shrunk).** Feeds #1.

### 26. The 34 checks don't cover the side systems
Re-counted: 34 `ok()` assertions (`tools/regression.js`) — zero assertions on `lessons`, `paused`, `bagOpen`, `journalOpen`, `settings`. Scope: dev-only `__regress({ extra: true })` — lessons completed (which would have caught #25), settings round-trip, one buy per row, bag/journal leave `paused` false; no `__game` in prod. `tools/regression.js`. **S · shrink.**

### 27. Depth-sort cost: do the guard, defer the rewrite
One `Image` per dungeon tile (L266-272; town 768, Whisperwood 2,160, Cinder 2,880), nothing culls it, every entity `setDepth`s unconditionally. Scope: `if (s.depth !== d)` guards; Layer/RenderTexture waits for #36's console number. **S · shrink.**

### 35. Dead `facing` / `action` writes
`Player.syncStore` pushes both on every turn/attack edge (L462-465); the HUD reads neither; each write walks the autosave subscriber's 12-field check. Scope: stop the writes, delete the fields (L123-124, L262-263, L283-284), leave the seven bare `useGame()` subscribers. **S · shrink.**

### 33. The HUD is invisible to a screen reader
Zero `aria`/`role`/`sr-only` in `src/ui/`; narrator and world tag are anonymous `<div>s; hotbar `Slot` wraps `<img alt="">` (`HUD.tsx` L13-17); the focus rule removes its own ring (`ui.css` L166). Scope: `aria-live="polite"` on narrator + tag, slot labels, a real `:focus-visible` outline; no SR movement mode, no canvas description. **S · shrink.**

### 55. One 1.8 MB chunk re-ships for every edit — NEW
`dist/assets` ships exactly one JS file, `index-CmDijXiE.js` at **1,833,286 B** (measured), and `node_modules/phaser/dist/phaser.min.js` alone is 1,375,976 B — ~75% of the deployed file is a library that never changes, so every one-line store/HUD edit redownloads the whole bundle. `vite.config.ts` sets `build: { target: "es2022" }` and no `manualChunks`. Fix: `rollupOptions.output.manualChunks` splitting `phaser` (optionally `react`/`react-dom`) into their own hashed chunks so app edits ship a small delta. Out of scope: Phaser submodule tree-shaking (a separate L idea), external CDN `<script>` (breaks the single-origin deploy), CDN compression (Vercel already gzips). `vite.config.ts`. **S.**

### 41. Wren's clips prefetch while voice is off
Every fresh install now runs with `voice: false` (`store.ts` L27/L29), yet `unlockAudio()` → `preloadVoice()` anyway (`audio.ts` L56, L336-338), fetching 12 Wren MP3s (~125 KB) that `speak()` discards; and the pause toggle that turns voice **on** never preloads, so the first line is late — the plan calls that half a real bug. Scope: `if (settings.voice) preloadVoice()` + preload on the off→on flip in the pause button (`HUD.tsx` L695); `speakNpc` untouched (townsfolk keep theirs by design; lazy one-hash-per-line). `audio.ts`, `HUD.tsx`. **S · shrink (Wren only).**

## Verified facts (re-measured or re-grepped at 81c9e5d — do not re-derive)

- **Regression: 34 checks** (re-counted again this pass). No CI: no `.github`, `package.json` is dev/build/preview only (`build` = `tsc --noEmit && vite build`, so types are checked), no lint config. Origin is `github.com/Goodmorningqwq/emberfall`, so #39 can read `VERCEL_GIT_COMMIT_SHA`.
- **The `SFX` table is 58 rows** (`const SFX`, `audio.ts` L517-599; the `SfxName` union L9-15 is the same 58) — re-counted by script this pass; the last pass's "46" was a bad count and the original "58" was right. Every row has a call site, incl. the ternaries at `DungeonScene.ts` L907/L922/L973/L1356. Voice `CUES` = 7 (L303), NPC = 12 clips / voice dir 25 files 739.6 KB. `tone`/`noise`/`say` are module-private (L259/L497/L415) — #50's fallback must be exported from `audio.ts`.
- **Boss-key hints are truthful** — verified closed: all three boss rooms sit directly north of their hinted landmark (`Heart of the Hollow` gx1/gy0 vs `The Crossroads` gx1/gy1; `Hall of the Bone Knight` vs `The Crossing`; `Heart of the Cinder` vs `Cinder Crossing`) — don't re-audit the "north of" copy.
- **Cracked walls**: exactly 8 wall tiles per dungeon, two sites each — whisperwood `treasure`×2, crypt `flooded-chapel`×1 + `reliquary`×2, cinder `thorn-gate`×1 + `ashen-treasury`×2; `unlocks.bomb = "east-crystal"` names a room with no wall of its own (#25's hook site).
- **`visibilitychange` appears exactly once** (`music.ts` L436), music only → #45/#15/#24 share one listener. Music duck follows `paused || bagOpen || journalOpen || shop || dialogue || complete` (`main.tsx` L22-24) already.
- **Save surface**: one `setItem` on one key (`store.ts` L235), no `.bak`, no `storage` listener (two tabs: last writer wins); parse throw → `null` (L211-213); `continueGame()` falls back to `newGame()` (L370-371); `quitToTitle()` flushes (L401-404). `writeSave` already guards `sessionStart ? … : 0` (L232), which #52's fold relies on. Toasts dedupe inside 700 ms and self-clear at 1100 ms (L1384-1393) — one rejection line at a time.
- **Pad surface**: `readPad` is the only pad poll (buttons 0/2/3/5/4/9/8, `Player.ts` L371-377), both `update`s return before it while frozen (`DungeonScene.ts` L2133, `HubScene.ts` L580), and Phaser `time.paused` does not stop `scene.update` → #51's pre-guard poll works. Keyboard Esc always works (HUD L522-528).
- **Death plate**: eyebrow (L575) **and** subtitle (L577) are both Hollow copy; `respawn()` returns to the right dungeon (`store.ts` L400) → #43 is two strings.
- **dist/**: one JS chunk (1,833,286 B) + one CSS (24,273 B); `public/assets` sprites 360 files / 1.48 MB, tiles 16 / 191 KB, ui 26 / 41 KB (incl. `icons/shard.png` for #49), voice 25 / 739.6 KB; no `sfx/`, no favicon → #55, #49.
- **`slashArc` is enemy-only** (L1225; `BoneKnight.ts` L177, `Skeleton.ts` L106) and plays `whoosh` (L1232); player `attackActive` flips at `Player.ts` L181 inside `SWORD.activeFrom..activeTo` → #48. **`spore` is a 500 ms one-shot** (L539) → #46. Enemies die through one path (`Enemy.die` → `onEnemyDied` L920); bosses through `bossDefeated` (L1318-1332). `boomerangHit` is a stun, not damage (`Enemy.ts` L86-89) — "numbers on all tools" died there. **`onExplosion` ignores `takeHit`'s boolean** (L1929-1932) → #53.
- **Sign coverage**: Whisperwood 8/7/8, crypt 10/2/2 (+1 empty), cinder 10/1/1 (+1) — measure with node, not `ConvertFrom-Json` (case-colliding legend keys); room data has `gx/gy` grid coords, maps are ASCII under `map`, so placement probes must read the strings. `HubScene.ts` "sign" → the gate-art comment only (#34).
- **Cleared rooms stay cleared; only mushrooms regrow** (L590-592). #17's two shake leaks (`Treant.ts` L183, `DungeonScene.ts` L1167) are the only ones. Vent flame audio fires only within 160 px at ignition (L1801) — by design, don't re-propose per-vent loops.
- **Potions are guarded** (L1904-1917, `HubScene.ts` L495), shop rejections surface (`.shop-msg`), tool-swap is taught (`RMB · Q`). A row with neither `give` nor `upgrade` still deducts gold (`store.ts` L322-323). **`?debug=1` still doesn't exist** — every "behind debug" is conditional on #36.

## Dropped (say so once; don't pad back in)

- **#6 Data-driven weapons**, **#12 Key-rebind panel** (survivors in #3), **#23 Localisation-readiness**, **#30 Partial autotile** (folds into #27), **#37 HUD text-scale** (integer pixel face + 129 `var(--s)` uses; page zoom is the honest lever).
- Scope trims the plan holds: #11's dex, #20's plaza cosmetics, #21's all-three rollout, #2's stick, #9's mid-quest rematch, #26b (`__game` in prod), #27's Layer rewrite, #33 beyond live regions + labels, #35 beyond the dead fields, #36 beyond `isDebug()` + console, #38 as an atlas rebuild, #41's NPC half, #46 beyond a texture-key map, #45 beyond tab-hide, #48's `whoosh` on Wren, #49 beyond linking an existing PNG, #51's journal-on-Start, #47 beyond one `.bak` key.
- Out of scope by the plan and the PixelLab floor (~700 gens): a 4th dungeon, remote telemetry, accounts/cloud saves, enemy-count difficulty, a sample SFX library, i18n, a virtual stick before the ask is answered, IndexedDB/File-System saves.
- Ideas that died on evidence this pass (facts, not entries): boss-key "north of" copy is true (all three verified via `gx/gy`); every SFX row has a call site (58/58, so no prune idea); the longest sign caption types in 3.4 s inside its 6.5 s hold (no truncation bug); narration and toast are separate channels (no collision); Phaser handles WebGL context loss itself (no `contextlost` listener needed in `src/`).

## Asks for the user

1. Desktop-only alpha, or is mobile worth a virtual stick? (Interim: #2's disclaimer.) Related: does anyone actually play on pad? #51/#54 say the pad path dead-ends at the pause menu today.
2. NG+ (#4, chosen) vs. a 4th dungeon as the next big push.
3. Difficulty knobs: damage + heart-drop (#1, chosen) — also a starting-hearts delta?

## For the planner's next pass

Verdicts #47-#52 applied in place above; nothing above re-argues a settled call. Six open items for you: the three new S entries — **#53** (blocked bomb prints a damage number it didn't deal), **#54** (locked-door rejection is silent while success is loud), **#55** (`manualChunks` so the 1.38 MB Phaser payload stops re-shipping per edit) — plus the `K.journal` one-liner in Feedback. One scope correction of mine retired: the SFX table is 58, my 46 was wrong. This file is **shorter** than last pass: see line count below; your snapshot at `ED6159…` is behind by one version.
