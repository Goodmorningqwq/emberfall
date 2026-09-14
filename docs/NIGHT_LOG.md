# Night log

Unattended work while the user sleeps (2026-09-15). Rules and backlog: `.claude/skills/night-shift/SKILL.md`.
Read top to bottom; each entry is one committed increment. "Ask" items are taste questions I decided conservatively.

| Time | Item | Result | PixelLab spend |
|---|---|---|---|
| 00:xx | 1 · Boss presentation | Intro: Wren held 3.4s, steps clear, roots seal the south doorway, camera leans in 1.5x on the Treant while its core flashes amber x3, quake, BOSS banner (now lower third so it never covers the Treant), camera back, bar appears, first attack delayed. Death: white-out, roots let go, shard rises. Phase 2 tell: bark darkens, faster sway, "IT DIGS IN DEEPER". Fixed a real bug: the Treant never flagged itself dead (could be hit after death). Hotbar scale fixed on tiny windows (`--sh` capped at `--s`). Scripted run: intro/fight/death states, 0 HUD overlaps at 2x. | 0 |
| 01:xx | 2 · Wren hurt + death clips | PixelLab templates taking-punch (hurt, 6f, 8 dirs — the template forced 8) and falling-back-death (death, 7f, 4 dirs); normalised to 68px. Getting hit now plays a 260ms flinch facing the attacker (cancels a swing in progress); dying plays the collapse and holds the last frame before the death screen. Bonus: last heart beats when you're at 1 heart. Review: docs/sprite-review/wren-hurt-sheet.png, wren-death-sheet.png. Scripted: hurt/death states verified. | 12 |
