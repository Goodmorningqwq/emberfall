"""Cut the PixelLab UI kit sheet into named pieces.

Finds connected opaque regions on the sheet, sorts them, and saves the ones we
use as individual PNGs under public/assets/ui/. Prints every region so new
pieces can be mapped by index.
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/ui/panel-stone-raw.png"
OUT = ROOT / "public/assets/ui"

im = Image.open(SRC).convert("RGBA")
W, H = im.size
px = im.load()
seen = [[False] * W for _ in range(H)]
regions = []
for y in range(H):
    for x in range(W):
        if seen[y][x] or px[x, y][3] < 8:
            continue
        # BFS over opaque pixels (8-connected)
        q = deque([(x, y)])
        seen[y][x] = True
        x0 = x1 = x
        y0 = y1 = y
        n = 0
        while q:
            cx, cy = q.popleft()
            n += 1
            x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and px[nx, ny][3] >= 8:
                        seen[ny][nx] = True
                        q.append((nx, ny))
        if n > 30:
            regions.append((x0, y0, x1 + 1, y1 + 1))

regions.sort(key=lambda r: (r[1] // 8, r[0]))
for i, r in enumerate(regions):
    print(i, r, f"{r[2]-r[0]}x{r[3]-r[1]}")


def save(name, box):
    im.crop(box).save(OUT / f"{name}.png", optimize=True)
    print("saved", name, box)


# --- mapping (by size/position; adjust if the sheet layout changes)
def pick(pred):
    return next(r for r in regions if pred(r))


big = pick(lambda r: r[2] - r[0] >= 70 and r[3] - r[1] >= 70)  # first large square panel
save("panel", big)
small_sq = pick(lambda r: 14 <= r[2] - r[0] <= 20 and 14 <= r[3] - r[1] <= 20)
save("slot", small_sq)
wide = pick(lambda r: r[2] - r[0] >= 100 and 12 <= r[3] - r[1] <= 24)
save("bar", wide)
