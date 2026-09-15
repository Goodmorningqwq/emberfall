# Cinder Depths — design draft (dungeon 3, not built)

Map: `docs/mockup/cinder-map.png` (from `tools/make_cinder.py`; draft JSON in `docs/mockup/`, not `src/`).
Ten rooms, 4x3, same conventions as the crypt. Third and last shard. Town gate: south-west ("Cinder gate").

## Gimmick: the mountain breathes
- **Lava** (`%`): impassable, never drains — except in Thorn Gate, where the ember plate cools a pool into
  walkable slag (reuses the crypt's `drain` reward with a different look).
- **Vents** (`v`): fire bursts on a shared 3 s cycle — 2 s rest, 0.4 s warning glow, 0.6 s flame column
  (hazard circle). Cross between breaths. The entrance sign teaches it.
- **Braziers** (`B`): light all four with the Fire Rod to solve the Brazier Vault (crystal puzzle from D1 with
  a new verb).
- **Thorns** (`T`): a barricade on a doorway; one rod shot burns it (persisted flag like a crack).

## Tool: Fire Rod (RMB, Q cycles with boomerang and hook)
Fires a short ember bolt (range ~180, speed 300). Lights braziers, burns thorns, 1 damage to enemies at range
(2 to cinderlings after which they "heat" and drop their guard for 2 s). Costs nothing. Found in The Smelter.

## Enemies
- **Magma slime**: slime machine, leaves a 1.5 s fire puddle where it lands its lunge.
- **Fire bat**: bat machine; its dart trails a short flame.
- **Cinderling** (`g`): a small armoured brute — shield front like the Bone Knight (blocks from the front),
  slow swing. Hit it from behind, or a rod shot heats it and it drops the guard.

## Boss: Cinder Golem
A molten giant with a black slag crust; steel clangs off it. It stomps (shockwave ring hazard), hurls magma
(three arcs onto warned spots), and in phase 2 the floor's lava pools erupt on a cycle.
A rod shot to the **core vent on its back** (it turns slowly; get behind it) overheats it — the crust cracks
and glows for 4 s: strike then. Three overheats to kill (30 HP, 2/strike tier 2 → ~5 hits per window).
Bar frame: obsidian slabs with a glowing crack, magma fill. Death: it cools to grey stone and crumbles; the
last shard rises from the core.

## Progression
Slag Mouth → Vent Gallery (time the vents, plate → key) → Forge Hall (key) → Cinder Crossing → west lock → The
Smelter (mini-boss, Fire Rod) → back east: Brazier Vault (boss key) → Bat Chimney (key, crack north → Ashen
Treasury) → Smelter's north lock → Thorn Gate (burn thorns, cool the lava, heart) → boss door.

## Ask the user
1. Fire Rod vs. an alternative third tool (iron boots to wade lava, or a mine-cart/rail ride)?
2. Boss: golem (get-behind-it, like the knight but with the rod) or a lava wyrm that surfaces at three pools?
3. Should the last shard end with a real finale in town (plinth relit, credits plate), or a "to be continued"?
