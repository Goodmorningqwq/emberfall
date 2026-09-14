# Game Design Document — working title "Emberfall"

_Top-down action RPG · classic fantasy · Zelda-style melee · hub + hand-made dungeons · desktop browser_

Last updated: 2026-09-14

---

## 1. Pitch

You are a young warden of a fading kingdom. The Ember, the flame that kept the dark at bay, has been split into three shards and scattered into three dungeons. Recover the shards, relight the Ember, and restore the town of Emberfall.

Short sessions, tight combat, satisfying progression. Think *Link's Awakening* structure with a modern, snappy UI.

## 2. Design pillars

1. **Combat feels crisp.** Hit-stop, screen shake, damage flashes, dodge with i-frames. Every hit reads clearly.
2. **Every room is a small puzzle or fight.** No filler corridors.
3. **Progression you can feel.** Each dungeon gives one new tool that changes how you play.
4. **Modern UX.** No canvas-drawn menus. Real UI components, smooth transitions, remappable keys, auto-save, zero friction from launch to gameplay.

## 3. Core loop

```
Hub (rest, shop, upgrade, take quest)
  -> Travel to dungeon
    -> Clear rooms (fight / puzzle / key & door)
      -> Mini-boss -> Dungeon item -> Boss -> Ember shard
  -> Return to hub, spend gold, unlock more of the town
  -> Next dungeon (opened by the shard / item you just got)
```

Session target: 15–30 minutes per dungeon. Full game ~2–3 hours for v1.

## 4. Player

| Aspect | v1 spec |
|---|---|
| Movement | 8-directional, 4-direction facing sprites (up/down/left/right). Speed ~110 px/s in world units. |
| Attack | Sword swing, 3-hit combo (light, light, heavy). Short forward lunge on each swing. Hitbox arc in facing direction. |
| Dodge | Roll in movement direction, 0.35s, invulnerable frames 0.05–0.25s. Small cooldown (0.4s). |
| Health | Hearts (start 3, max 10). Half-heart granularity. |
| Stamina | **None in v1.** Keep it simple; roll cooldown is enough. |
| Death | Respawn at last save point (hub or dungeon entrance) with full HP, keep everything. No gold loss in v1. |
| Items (consumable) | Potion (heal 3 hearts), Bomb (breaks cracked walls, AoE damage). |
| Dungeon tools | D1: **Boomerang** (stun + fetch). D2: **Grapple hook** (cross gaps, pull enemies). D3: **Fire gauntlet** (light torches, melt ice, burn vines). |
| Upgrades (hub) | Sword tiers x3 (damage), Armor tiers x2 (damage taken), Heart containers (found in dungeons + shop). |

Controls (remappable): WASD/arrows move · J / left-click attack · K / space roll · L / right-click use tool · Tab inventory · Esc pause · E interact. Gamepad supported.

## 5. World

### Hub — Emberfall town
Small (~40x30 tiles). Starts half-ruined and rebuilds visually as shards are recovered.

- **Blacksmith** — sword/armor upgrades.
- **Apothecary** — potions, bombs, heart container (expensive).
- **Elder** — story, points you at the next dungeon.
- **Save shrine** — save point + fast travel to unlocked dungeon entrances.
- 3 dungeon exits, gated: D1 open · D2 needs Boomerang · D3 needs Grapple.

### Dungeons (v1 = three)

| # | Name | Theme | Rooms | Gimmick | Tool | Boss |
|---|---|---|---|---|---|---|
| 1 | Whisperwood Hollow | Forest / overgrown ruins | 8 | Push blocks, vines, hidden paths | Boomerang | Elder Treant |
| 2 | Sunken Crypt | Catacombs / water | 10 | Water levels, floor switches, gaps | Grapple hook | Bone Knight |
| 3 | Cinder Depths | Volcanic cavern | 12 | Lava paths, torches, timed doors | Fire gauntlet | Ember Wyrm |

Room design rules:
- Rooms are screen-sized (20x12 tiles at 32px = 640x384 world, zoomed) with smooth camera scroll between rooms.
- Rooms are authored as 20x12 ASCII maps in `src/game/data/<dungeon>.json` (legend in the file; `#` is the wall footprint, doorways are 2-tile gaps, `L`/`Z`/`W` mark locked/boss/cracked doors). `tools/render_map.py` draws the overview (`docs/mockup/whisperwood-map.png`). Top wall is 3 tiles thick so door props have somewhere to sit; side walls 1 tile.
- One scene runs the whole dungeon on one stitched tile grid (`src/game/dungeon.ts`); entering a room = parking the camera + spawning that room's placements. Persistent state is a flat flag list in the store (`cleared:<room>`, `solved:<room>`, `chest:<room>:<n>`, `door:<room>:<kind>:<n>`, `crack:<room>`, `boss:<dungeon>`, `shard:<dungeon>`).
- Whisperwood Hollow layout (critical path): R1 Mossy Antechamber → R2 Slime Warren (clear → key) → R3 Rootbound Cellar (block on plate → key) → R4 Crossroads → R5 Mossback's Den (mini-boss → Boomerang) → R6 Whispering Gallery (boomerang the crystal → Boss Key) → R7 Heart of the Hollow (Elder Treant → Ember Shard). R8 Forgotten Larder is optional behind a bomb-cracked wall in R6 (heart container + gold).
- Each room has one purpose: fight, puzzle, key, or reward. Locked doors need small keys; boss door needs the big key.
- Every dungeon has a mini-boss halfway that guards the dungeon tool; the second half requires the tool.

## 6. Enemies

| Enemy | Where | Behavior | HP | Notes |
|---|---|---|---|---|
| Slime | D1 | Hops toward player, splits once on death | 2 | Tutorial enemy |
| Forest Sprite | D1 | Erratic flying, contact damage | 1 | Fast, fragile |
| Mushroom | D1 | Stationary, releases spore cloud when near | 3 | Teaches spacing |
| Skeleton | D2 | Walks toward player, sword swing with telegraph | 4 | Blockable pattern |
| Bat | D2 | Swoops from ceiling | 1 | Ambush |
| Slime (blue) | D2 | Water variant, faster | 3 | Reskin |
| Fire Imp | D3 | Ranged fireball, keeps distance | 3 | Forces approach |
| Lava Golem | D3 | Slow, heavy AoE slam, armored (needs heavy hit) | 8 | Mini-tank |
| Wraith | D3 | Phases in/out, only hittable when visible | 4 | Timing |
| **Elder Treant** (boss) | D1 | Root slam, spawns sprites; weak point exposed after boomerang stun | 30 | 2 phases |
| **Bone Knight** (boss) | D2 | Shield blocks front; grapple pulls shield away | 45 | 2 phases |
| **Ember Wyrm** (boss) | D3 | Fire breath lanes, dives; extinguish with gauntlet to expose | 60 | 3 phases |

## 7. Progression & economy

- Gold from enemies, pots, chests. Prices tuned so a full dungeon clear affords ~1 upgrade.
- Heart containers: 1 per boss + 2 hidden + 1 shop = up to 10 hearts.
- Small side content in v1: 3 hidden treasure rooms, 1 optional mini-quest in the hub (fetch item -> reward).

## 8. UI / UX (the "modern" part)

Everything below is **React**, rendered over the Phaser canvas — but skinned entirely in **pixel art** (decided 2026-09-14). Layout stays CSS (flex, anchors, safe areas); the look comes from PixelLab assets:

- **9-slice chrome**: `public/assets/ui/panel.png` (10px corners), `slot.png` (5px), `bar.png`, cut from the PixelLab UI kit (`tools/slice_ui_kit.py`).
- **Integer UI scale** `--s` (1×–4×) derived from the game frame width (`uiScale()`); every UI dimension is `calc(Npx * var(--s))` so pixels never land on half-steps. Mobile later = same skins at 2–3× with touch controls.
- **Bitmap font** "Emberfall Pixel" (PixelLab, 16px glyphs, bold) at 16px × integer only. No vector fonts in-game.
- **Icons**: 24×24 PixelLab item set in `public/assets/ui/icons/` (coin, key, potion, bomb, sword, bag, boomerang, shard, boss key, grapple + spares). HUD icon = inventory icon = world pickup.
- **Hearts**: 16×16 sprite strip (full / half / empty).
- Dim overlays instead of blur; no CSS shadows/gradients on chrome except the corner scrim behind vitals.

- **HUD** — hearts, gold, keys top-left in the wall band; hotbar bottom-centre (one scale notch smaller than the rest on big screens, key labels tucked inside the slots). UI scale `--s` = the game's own pixel scale, so 1 UI px = 1 game px.
- **Minimap** — top-right in the wall band: rooms revealed as visited, current room ember, boss room marked; the room name sits under it. (2026-09-15)
- **Room entry beat** — the room-name plate shows centred for ~1.3s while you can already move; enemies pop in only after it fades. Boss rooms announce the boss instead.
- **Tutorial** — contextual lessons as a pixel tag beside Wren, one at a time, each clears itself when done: WASD (keys dim as pressed) → Shift dash → LMB (first enemy on screen, clears on first hit) → RMB (boomerang chest) → 2 (room with a cracked wall). Signposts (`S` in the room JSON, `signs[]` text) open the dialogue panel on bump; interaction stays bump-to-open. World tags: "Push" on a leaned-on block, "Locked - needs a small key" on doors, key pickup hint.
- **Inventory** — grid with hover tooltips, drag-to-equip, keyboard navigable. Slide-in panel, game pauses.
- **Dialogue** — bottom panel, portrait, typewriter text (skippable), choice buttons.
- **Shop** — card grid, preview stats delta ("+2 dmg"), can't-afford state, purchase animation.
- **Pause menu** — Resume / Settings / Save & quit to title. Blur + dim backdrop.
- **Settings** — master/music/SFX volume, screen shake on/off, key remapping, gamepad prompts toggle, pixel-perfect vs smooth scaling, fullscreen.
- **Title screen** — animated background, Continue / New game / Settings. Continue shows save summary (hearts, shards, playtime).
- **Death screen** — brief, one button, no nag.
- **Transitions** — room scroll, dungeon-entry fade with name card, boss intro name card, shard-acquired flourish.
- **Combat feedback** — damage numbers, hit flash, hit-stop (60–80ms), screen shake (toggleable), particles, enemy death dissolve.
- **Save** — auto-save on room enter and at shrines; 3 slots; localStorage with export/import to file.
- **Accessibility** — remap everything, reduce-motion honors screen-shake setting, readable font size, colorblind-safe HUD colors.

## 9. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript | Instant HMR, typed, zero config |
| Game | Phaser 4 (Arcade physics) | Current major (4.2.x); tilemaps, animation, camera, gamepad built in; official phaserjs skills target v4 |
| UI | React 18 + Tailwind CSS | Component UI, easy animation, responsive |
| State bridge | Zustand | One store both Phaser and React read/write (HP, inventory, flags) |
| Animation (UI) | Framer Motion | Panel slide-ins, number ticks, transitions |
| Audio | Howler.js | Reliable web audio, sprites, fades |
| Maps | Tiled (.tmj) | Standard editor; Phaser imports natively; PixelLab tilesets load directly |
| Tests | Vitest | Unit tests for combat math, save/load, inventory |
| Deploy | Vercel (or Netlify) | Already connected; URL from day one |

Rendering: 32x32 tiles, 32x32 characters (48x48 bosses), camera zoom 2x, `pixelArt: true`, no anti-aliasing. Base viewport 960x540 world px -> scales to window.

### Project structure

```
game/
  docs/                 design docs, asset list
  public/assets/
    sprites/            PixelLab exports (png + json)
    tiles/              tilesets
    maps/               Tiled maps (.tmj)
    audio/
  src/
    main.tsx            React root + Phaser mount
    game/
      config.ts
      scenes/           Boot, Preload, Hub, Dungeon, UIOverlay(bridge)
      entities/         Player, Enemy base, enemies/*, bosses/*
      systems/          combat, rooms/doors, save, input, audio
      data/             enemies.json, items.json, dungeons.json
    ui/
      components/       HUD, Inventory, Dialogue, Shop, Pause, Settings, Title
      store.ts          Zustand
    shared/             types, events (Phaser <-> React)
```

## 10. Milestones

| M | Goal | Done when |
|---|---|---|
| **M0** ✅ 2026-09-14 | Project setup | Live at https://emberfall-alpha.vercel.app/ (Vercel, auto-deploy from `main`), title + save, pixel UI |
| **M1** ✅ 2026-09-14 | Feel prototype | Wren + slimes in one room; mouse attack with wind-up, dash/sprint, telegraphed enemies, hit-stop/shake/numbers. Passed playtest. |
| **M2** ✅ 2026-09-14 | Dungeon 1 vertical slice | 8 rooms (code/JSON, not Tiled), scroll transitions, doors/keys/chests/push blocks/plates/crystal switch, bombs + cracked wall, boomerang, slime/sprite/mushroom/Mossback, Elder Treant, death screen, save v2. Needs a balance playtest. |
| **M3** | Hub + persistence | Town, blacksmith, apothecary, elder dialogue, dungeon entrance/exit, inventory & shop UI, minimap |
| **M4** | Dungeons 2 & 3 | Grapple + gauntlet mechanics, 6 more enemies, 2 bosses, town rebuild states |
| **M5** | Polish | Audio, settings, minimap, transitions, gamepad, balance pass, side content |
| **M6** | Ship v1 | Bug bash, perf check, final deploy, itch.io page |

Rule: **no new features until the previous milestone's playtest passes.** M1 is the gate — if combat doesn't feel good with one enemy, nothing else matters.

## 11. PixelLab asset list (v1)

Style lock (decided 2026-09-14): 32x32, top-down 3/4 view, classic fantasy, **modern-indie pixel style** (Stardew / Moonlighter feel: softer, slightly desaturated palette, selective outlines, shading detail). Generate the hero first, then use it as the style reference for everything else.

Hero: **Wren, Warden of Emberfall** (name is a placeholder) — concept sheet at `docs/concept/wren-sheet-v2-pink.png` (v1 auburn kept for reference), style references in `docs/reference/`. Soft pink high ponytail, freckles, slate-blue travel cloak worn hood-down and flaring behind with dull-gold ember embroidery on the hem, dark leather cross-laced chest piece over cream linen, ember-orange scarf, brown belt with pouches, knee boots, fingerless gloves, short sword at the left hip. **Signature: a glowing ember-shard charm on the belt** (brightens as shards are collected; can be a Light2D source). In-game sprite proportion: **chibi, 2 heads tall** (see the sheet's GAME SPRITE inset). Palette: soft pink #E7A7C7 (shadow #D988B6) · slate blue #465A68 · ember #D1541F · leather #6A4A2E · linen #F2E9DA · dull gold #E2B24A.

Demo (pre-M0): hero + a Whisperwood Hollow room (mossy stone floor, ruin walls, vines, push block, chest, locked door).

### Characters (4-direction: down, up, left, right)
| Asset | Size | Animations |
|---|---|---|
| Hero | 32x32 | idle, walk, sword attack (3 variants for combo), roll, hurt, death |
| Blacksmith, Apothecary, Elder | 32x32 | idle (down only), talk |
| Slime, Blue slime | 32x32 | idle, hop, hurt, death (split) |
| Forest sprite, Bat | 32x32 | fly, hurt, death |
| Mushroom | 32x32 | idle, spore, hurt, death |
| Skeleton | 32x32 | idle, walk, attack, hurt, death |
| Fire imp | 32x32 | idle, walk, cast, hurt, death |
| Lava golem | 48x48 | idle, walk, slam, hurt, death |
| Wraith | 32x32 | idle, walk, phase, hurt, death |
| Elder Treant | 96x96 | idle, root slam, summon, stunned, death |
| Bone Knight | 64x64 | idle, walk, attack, shield, stunned, death |
| Ember Wyrm | 128x96 | idle, breath, dive, exposed, death |

### Tilesets (32x32, auto-tile friendly)
- Town: grass, dirt path, cobblestone, water edge, wood walls, roofs, fences, ruined vs rebuilt props
- Whisperwood: grass, moss stone, ruins wall, vines, tree canopy, water
- Sunken Crypt: stone floor, brick wall, shallow water, deep water, bones
- Cinder Depths: basalt floor, obsidian wall, lava, ash, cracked ground

### Props & items (single sprites)
Chest (closed/open), pot, cracked wall, push block, floor switch, torch (unlit/lit), door (locked/unlocked/boss), stairs, save shrine, sign, small key, big key, heart, half heart, gold coin, potion, bomb, boomerang, grapple, gauntlet, ember shard, sword x3, armor x2

### Effects
Sword slash arc, hit spark, dust puff, spore cloud, fireball, fire breath, explosion, death dissolve, shard glow

### UI (not PixelLab — CSS/Tailwind)
Portraits for hero + 3 NPCs (PixelLab 64x64 face crop is fine), item icons (reuse sprites), everything else is Tailwind.

## 12. Open questions

- Name: "Emberfall" is a placeholder.
- Music: royalty-free packs vs. generated — decide at M5.
- Difficulty options (easy/normal): probably yes, cheap to add in M5.
- Mobile support: explicitly out of scope for v1.
