# Emberfall QA — source of truth

Pass/fail for what is **actually shipped**. Design milestones in `GAME_DESIGN.md` that are not in code are marked **N/A / future**. Shipped content that has outpaced the doc (hub, D2/D3, finale) is checked here against the live game, not against stale M3–M6 checkboxes.

**Live:** https://emberfall-alpha.vercel.app/  
**Gate:** `npm test` (static contracts + TypeScript). Full playthrough: `npm run test:regression`.

---

## How to run

```bash
npm install
npm test                 # durable automated gate (must stay green)
npm run test:static      # design/shipped contracts only
npm run test:typecheck   # tsc --noEmit
npm run test:regression  # Playwright → tools/regression.js (34 beats)
npm run dev              # then in console: await import("/tools/playtest.js"); await import("/tools/regression.js"); await window.__regress()
```

Regression needs Chromium (`npx playwright install chromium` once). It boots Vite, runs a fresh-save → finale scripted playthrough, and fails if any beat fails.

---

## Existing automation (inventory)

| Asset | Command / entry | What it covers |
|---|---|---|
| `tools/playtest.js` | Dev console `__boot` / `__run` / `__hudOverlaps` | Manual harness: virtual time, TP, combat helpers, HUD overlap probe |
| `tools/regression.js` | `window.__regress()` after playtest | **34 beats** fresh save → Tam → Whisperwood → Crypt → Cinder → finale |
| Commits | message suffix `regression 34/34` | Human confirmation the suite was green after the change |

There was **no** `npm test` script before this QA pass. The gate below wraps and extends that suite rather than inventing a parallel one.

---

## Coverage map vs `GAME_DESIGN.md` milestones

Legend: **Auto** = `npm test` / regression · **Manual** = play / eyeball · **N/A** = not shipped (do not invent)

### M0 — Project setup ✅ shipped

| Check | Mode | Notes |
|---|---|---|
| Vite + TS + React + Phaser project boots | Auto | `test:typecheck` + regression boot |
| Title + save slots / new game | Auto | regression `fresh start in town` |
| Pixel UI chrome assets present | Auto | static: `panel.png`, hearts, icons |
| Deploy URL documented | Manual | README / design doc |

### M1 — Feel prototype ✅ shipped

| Check | Mode | Notes |
|---|---|---|
| Wren moves (WASD/arrows) | Auto + Manual | static control contract; feel is manual |
| Attack (J / LMB), roll/dash (K / Shift) | Auto + Manual | static bindings in HUD/Player; crispness manual |
| Hit-stop / shake / damage numbers | Manual | pillar feel |
| Slime (or equivalent) fightable | Auto | regression clears west-fight |

### M2 — Dungeon 1 vertical slice ✅ shipped

| Check | Mode | Notes |
|---|---|---|
| Whisperwood rooms + scroll | Auto | regression path + static JSON rooms |
| Keys / locked doors / chests | Auto | regression beats |
| Push blocks / plates / crystal | Auto | crystal → boss key beat |
| Boomerang + Mossback den | Auto | `boomerang from the mossback's den` |
| Elder Treant + shard | Auto | Treant intro/defeat + shard 1 |
| Death / save | Manual + Auto | save path exercised by newGame; death UX manual |

### M3 — Hub + persistence (design: open; **code: largely shipped**)

| Check | Mode | Notes |
|---|---|---|
| Town hub scene | Auto | regression town beats |
| Elder (Tam), blacksmith (Orrin), apothecary (Maren) | Auto / Manual | Tam talk auto; shops partial auto (sword buy) |
| Gates east/west/south gated by shards | Auto | regression gate opens |
| Inventory / shop / minimap / journal | Manual + light Auto | UI present; layout/overlap via `__hudOverlaps` manual |
| Auto-save | Manual | not asserted in regression |

### M4 — Dungeons 2 & 3 (design: open; **code: shipped with divergences**)

| Check | Mode | Notes |
|---|---|---|
| Sunken Crypt + Grapple + Bone Knight | Auto | regression Crypt section |
| Cinder Depths + Fire Rod + Cinder Golem | Auto | regression Cinder section (**not** Ember Wyrm / fire gauntlet from design doc) |
| Town finale / plinth | Auto | `finale` beat |

### M5 / M6 — Polish / ship — **N/A / future** for unshipped items

| Check | Mode | Notes |
|---|---|---|
| Full audio pack / itch.io / difficulty options | N/A | future |
| Gamepad | Manual | code present; not in regression |
| Side quests (Maren's Caps, etc.) | Manual | shipped; not in the 34-beat main-path suite |
| Perf / bug bash | Manual | M6 |

### Design pillars (always-on)

| Pillar | Mode |
|---|---|
| Crisp combat | Manual playtest |
| Rooms as puzzle/fight | Auto (critical path) + Manual (optional rooms) |
| Feelable progression (one tool per dungeon) | Auto (boomerang → grapple → firerod) |
| Modern React UI | Manual + static asset presence |

### Known design-doc vs code divergences (do not “fix” by inventing doc features)

- D3 tool: **Fire Rod** in code (`firerod`), not “Fire gauntlet”.
- D3 boss: **Cinder Golem**, not “Ember Wyrm”.
- Maps: authored JSON rooms, not Tiled `.tmj`.
- Stack notes in the design doc (Tailwind / Framer / Howler / Vitest) may not match the current tree — QA checks the **repo**, not aspirational stack lines.

---

## Regression beat list (34)

Must all pass under `npm run test:regression` / `__regress()`:

1. fresh start in town  
2. Tam talks  
3. quest step 2 after Tam  
4. east gate → Whisperwood  
5. west-fight cleared, potion unlocked  
6. first key picked up  
7. boomerang from the mossback's den  
8. boss key from the crystal room  
9. Treant intro  
10. Treant defeated  
11. shard 1 + complete screen  
12. back in town by the east gate  
13. Tam after shard 1  
14. Orrin sells the tempered sword  
15. west gate open  
16. west gate → Crypt  
17. Drowned Hall drained  
18. ossuary key  
19. Crossing west door unlocked  
20. grapple from the Captain  
21. hooked across the cistern  
22. boss key from the cistern  
23. Bone Knight intro  
24. Bone Knight defeated  
25. shard 2  
26. south gate open after shard 2  
27. south gate → Cinder  
28. vent gallery plate → key  
29. Fire Rod from the Smelter  
30. boss key from the braziers  
31. Cinder Golem intro  
32. Cinder Golem defeated  
33. shard 3  
34. finale  

---

## Manual smoke (5–10 min) before a release

- [ ] Title → New Game → town loads; WASD move, J attack, K roll, E/bump interact, Tab bag, Esc pause, M journal  
- [ ] `__hudOverlaps()` empty on title, town, combat room, boss intro  
- [ ] Optional: one side-quest offer (Maren / Orrin / Warden notes)  
- [ ] Gamepad connect: hints flip to pad glyphs  
- [ ] Reload Continue restores place + flags  

---

## Adding a check

1. Prefer a new `ok(...)` beat in `tools/regression.js` if it is main-path and automatable.  
2. Prefer an assertion in `tools/qa-static.mjs` if it is a file/contract invariant.  
3. Document it in **this file** (coverage map + beat list if applicable).  
4. Keep balance numbers alone unless a bugfix requires them.
