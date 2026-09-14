# Emberfall

Top-down action RPG. Phaser 4 + React + Vite + TypeScript. Pixel art via PixelLab.

**Play:** https://emberfall-alpha.vercel.app/ (auto-deploys from `main`)  
**Repo:** https://github.com/Goodmorningqwq/emberfall

- Design doc: `docs/GAME_DESIGN.md`
- Look mockup: `docs/mockup/` (design canvas source)
- Character concept: `docs/concept/`
- Sprite review sheets: `docs/sprite-review/`

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 — WASD/arrows move, J attack, K roll.

## Assets

`public/assets/tiles/whisperwood.{png,json}` — PixelLab Wang tileset (16 tiles, 32px), autotiled by `src/game/wang.ts`.
`public/assets/sprites/wren/` — hero rotations + per-frame animations (idle/walk/attack/roll × 4 directions).
`public/assets/sprites/props/` — chest, push block, torch, locked door, slime.

`tools/fetch_wren.py` pulls animation frames from PixelLab by animation id.
