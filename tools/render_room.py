"""Render the demo room (real tileset, props, Wren) to a 1280x720 PNG for
design mockups. Mirrors src/game/room.ts + wang.ts.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "public/assets"
T = 32
W, H = 20, 12  # tiles

meta = json.loads((A / "tiles/whisperwood.json").read_text())
sheet = Image.open(A / "tiles/whisperwood.png").convert("RGBA")
lookup = {}
for t in meta["tileset_data"]["tiles"]:
    c = t["corners"]
    key = tuple(1 if c[k] == "upper" else 0 for k in ("NW", "NE", "SW", "SE"))
    b = t["bounding_box"]
    lookup[key] = sheet.crop((b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]))

verts = [[1 if (x == 0 or x == W or y <= 2 or y >= H) else 0 for x in range(W + 1)] for y in range(H + 1)]
room = Image.new("RGBA", (W * T, H * T))
for y in range(H):
    for x in range(W):
        key = (verts[y][x], verts[y][x + 1], verts[y + 1][x], verts[y + 1][x + 1])
        room.alpha_composite(lookup[key], (x * T, y * T))


def put(name, tx, ty):
    im = Image.open(A / f"sprites/props/{name}.png").convert("RGBA")
    room.alpha_composite(im, (int(tx * T), int(ty * T)))


put("door", 9, 1)
put("torch", 7, 1.4)
put("torch", 12, 1.4)
put("block", 5, 4)
put("block", 6, 7)
put("chest", 15, 3)
put("slime", 12, 5.6)
put("slime", 4, 7.6)
wren = Image.open(A / "sprites/wren/idle/south/0.png").convert("RGBA")
room.alpha_composite(wren, (int(9.5 * T) - 34, int(6 * T) - 57))

# game canvas is 640x384 at zoom 2 = 1280x768; the design frame is 1280x720 so
# crop 24px top/bottom, matching what FIT shows in a 16:9 window
out = room.resize((1280, 768), Image.NEAREST).crop((0, 24, 1280, 744))
out.save(ROOT / "docs/mockup/game-frame.png", optimize=True)
print("wrote docs/mockup/game-frame.png", out.size)
