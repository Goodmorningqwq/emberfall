---
name: emberfall-playtest
description: Scripted verification of Emberfall in the in-app browser — boot into any place/room, drive Wren with virtual time, fight, grapple, check HUD overlaps and take frame captures. Use before every commit that touches gameplay, scenes or the HUD, and whenever the browser pane is hidden (RAF stalls).
---

# Emberfall scripted playtest

Everything lives in `tools/playtest.js` (loaded into the page with `await import("/tools/playtest.js?v=N")` —
bump `N` after editing it, Vite caches the module). Run with `mcp__Claude_Browser__javascript_tool`; the dev
server is `preview_start {name:"emberfall-dev"}` (never Bash).

## Boot recipe (copy, don't improvise)

```js
// 1) seed a save so you start where you need to be (version must match SAVE_VERSION in store.ts)
localStorage.setItem("emberfall.save.1", JSON.stringify({ version: 5, hearts: 12, maxHearts: 12, gold: 150, keys: 0,
  items: [{id:"sword",name:"Iron Sword",qty:1},{id:"potion",name:"Potion",qty:3},{id:"bomb",name:"Bomb",qty:3},{id:"boomerang",name:"Boomerang",qty:1}],
  flags: ["unlock:potion","unlock:bomb","hint:key"], lessons: ["move","dash","attack","potion","throw","bomb"],
  room: "entrance", place: "crypt", swordTier: 2, playtimeMs: 0 }));
// 2) fresh page, then:
await import("/tools/playtest.js?v=11");
const started = await window.__start("cistern");   // waits for Hub → continueGame → Dungeon (real time for loads), goto room
```

`__start(roomId?)` returns `[dungeonId, roomId]`. It exists because `continueGame()` called before the Hub's
`create()` has subscribed does nothing (the Hub then sits in town with `place:"crypt"`). If you must do it by
hand: wait for `scene.settings.status === 5` (RUNNING) with **real** sleeps between `__run(100)` steps.

## Time: real vs virtual

- Hidden pane ⇒ `requestAnimationFrame` stalls. `__run(ms)` steps `game.loop.step()` over a MessageChannel and
  **skews `Date.now()`** by the same amount (Phaser 4's TweenManager clocks itself off `Date.now`, not the loop
  delta — without the skew tweens crawl at ~14% speed and every reel/scroll/fade looks broken).
- Asset loading is network time: `__run` cannot make XHR finish. Loop `await __sleep(250); await __run(100)`.
- Keys: `__vhold(code, keyCode, ms)` (virtual) — `__key`/`__hold` use real sleeps and **miss JustDown when hidden**.
- Teleport with `__tp(wx, wy)`; aim with `__aim(wx, wy)` (moves the pointer in camera space).
- Enemies move: clamp teleports to the room rect or Wren walks out the doorway mid-test and `clearRoomStuff()`
  destroys the boss (`isDead === true` with full hp is the tell).

## Checks that have caught real bugs

| Check | How |
|---|---|
| HUD overlaps | `__hudOverlaps()` → `[]` expected. Run in: boss intro (`boss.intro === true`), boss bar, dialogue + coach + tag, shop, item banner, narration, at 2x and 3x scale. |
| Room banner / narration copy | `document.querySelector(".minimap-name")`, `.complete .eyebrow`, `__store.getState().narration` |
| Fights | `__fight()` (real time) or the virtual loop: teleport under the enemy, `__aim` above it, `__vhold("KeyJ",74,60)`, `__run(520)` |
| Boss loop | front hit → `boss.status` says blocked; `sc.throwBoomerang(dir)` with `tool:"grapple"` → `state:"exposed"`; hits reduce `store.boss.hp`; death sets `boss:<dungeon>` flag and drops `"shard"` in `sc.pickupGroup` |
| Puzzles | `store.hasFlag("solved:<room>")`, `sc.water.length` (0 after a drain), `sc.anchors`, `sc.grapple?.phase` |
| Hub ↔ dungeon | walk out the entrance's south doorway → Hub `from: gate-<id>`; walk into a gate → Dungeon with `meta.id` |
| Frame capture | `await __snap("name")` → `docs/mockup/frames/name.png` (game canvas only); `computer.screenshot` for HUD |

Prefer `sc.throwBoomerang({x,y})` / `sc.goto(id)` / store actions over key events when you are testing the
system, and key events when you are testing the input path — both matter, they fail differently.

## Full-game regression (run before pushing any gameplay change)
```js
await import("/tools/playtest.js?v=N"); await window.__boot();            // wait for the Hub to be RUNNING first
await import("/tools/regression.js?v=N");
window.__regressResult = null; window.__regressPromise = window.__regress().then(r => (window.__regressResult = r));
// ~6–7 minutes; poll window.__regressResult in later calls (the tool call itself times out at 45 s)
```
34 beats from a fresh save to the finale (Tam, gates, every key/tool/boss-key, three bosses through their
windows, shard → complete → home, Orrin's sword, the finale). Expected `{passed: 34, failed: []}`. A crashed
section is reported as "<section> — crashed (message)" instead of stopping the run. Editing files under
`tools/` makes Vite reload the page: re-import and re-boot after an edit.

## Regression rule
Anything that touches `Enemy`, `DungeonScene`'s boss/hit paths or the store must re-run the full regression (or at
least all three boss fights through their windows) — the crypt work silently left the Treant without
`isBoss`, so its bar stopped updating. Seed the save **after** the page has loaded (the `beforeunload`
auto-save overwrites a save you wrote before a reload), then `quitToTitle()` → `continueGame()`.

## Traps met while testing
- Keyboard map: J/K/L are the keyboard attack/dash/throw keys, Q swaps tools, Tab bag, **M journal**, 1/2
  consumables. A new HUD hotkey on J froze the game mid-test (journal opened, physics paused) — check
  `Player.ts` keys before binding anything.
- After editing a React module, HMR keeps the *old* keydown effect alive until a full reload; if the store
  shows `journalOpen/bagOpen` you didn't ask for, reload the page.
- `__sc()` is the Dungeon scene; in town use `window.__game.scene.getScene("Hub")` and its `player.sprite`.
- Teleporting under an enemy that faces you tests its front; to test guards/backs compute the spot from its
  `facing` vector (`b.sprite.x - facing.x * 90`).
- Scripted fights can drop Wren's hearts to 0 → screen "dead" → everything freezes; check `screen` when a loop
  stalls and `respawn()`.

## Before declaring done

`npx tsc --noEmit -p .` and `npx vite build` pass; the relevant checks above ran on **this** build (HMR of a
scene module reloads the page and wipes `window.__*` — re-import and re-boot); screenshot anything visual
into `docs/sprite-review/` and reference it in `docs/NIGHT_LOG.md`.
