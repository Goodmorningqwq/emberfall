"""Draws public/assets/ui/townmap.png - the journal's map of Emberfall, 3 px per tile, straight from
src/game/data/emberfall-town.json. Terrain and fixed props only; Wren, the NPCs, the gates' state and
the objective are drawn over it by the HUD. Pure pixel work, no AI."""
import json
from PIL import Image, ImageDraw

d = json.load(open("src/game/data/emberfall-town.json"))
S = 3
W, H = d["cols"] * S, d["rows"] * S
GRASS = (104, 116, 88)
GRASS2 = (98, 110, 82)
PATH = (150, 146, 128)
PATH_EDGE = (124, 120, 104)
TREE = (54, 74, 50)
TREE2 = (46, 64, 44)
INK = (237, 233, 223)
STONE = (91, 102, 91)
EMBER = (232, 118, 58)
HOUSE = {"E": (92, 104, 132), "F": (150, 84, 60), "A": (168, 128, 70)}
ROOF = {"E": (64, 74, 100), "F": (110, 58, 42), "A": (128, 94, 50)}

im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dr = ImageDraw.Draw(im)
m = d["map"]
for ty, row in enumerate(m):
    for tx, ch in enumerate(row):
        x, y = tx * S, ty * S
        if ch == "T":
            dr.rectangle([x, y, x + S - 1, y + S - 1], fill=TREE if (tx + ty) % 2 else TREE2)
            continue
        dr.rectangle([x, y, x + S - 1, y + S - 1], fill=GRASS if (tx * 7 + ty * 3) % 5 else GRASS2)
        if ch == "=":
            dr.rectangle([x, y, x + S - 1, y + S - 1], fill=PATH)
            # a darker lip where the path meets grass, so the roads read as sunk flagstone
            if ty > 0 and m[ty - 1][tx] != "=":
                dr.line([(x, y), (x + S - 1, y)], fill=PATH_EDGE)
            if tx > 0 and m[ty][tx - 1] != "=":
                dr.line([(x, y), (x, y + S - 1)], fill=PATH_EDGE)
# houses are 4x4 tiles anchored at their legend char (top-left)
for ty, row in enumerate(m):
    for tx, ch in enumerate(row):
        x, y = tx * S, ty * S
        if ch in HOUSE:
            dr.rectangle([x, y, x + 4 * S - 1, y + 4 * S - 1], fill=HOUSE[ch])
            dr.rectangle([x, y, x + 4 * S - 1, y + 2 * S - 1], fill=ROOF[ch])
            dr.rectangle([x + 5, y + 8, x + 6, y + 4 * S - 1], fill=(40, 30, 24))  # the door
        elif ch == "P":
            dr.rectangle([x - 1, y - 1, x + S, y + S], fill=STONE)
            dr.point((x + 1, y + 1), EMBER)
        elif ch == "S":
            dr.rectangle([x, y - 2, x + S - 1, y + S - 1], fill=(176, 186, 176))
        elif ch == "w":
            dr.rectangle([x, y, x + S - 1, y + S - 1], fill=STONE)
            dr.point((x + 1, y + 1), (60, 90, 110))
        elif ch == "l":
            dr.point((x + 1, y + 1), (255, 220, 140))
        elif ch in "us":
            dr.rectangle([x, y + 1, x + S - 1, y + S - 1], fill=(84, 104, 72) if ch == "u" else (120, 122, 114))
        elif ch == "r":
            dr.rectangle([x, y + 1, x + S - 1, y + S - 1], fill=(112, 112, 104))
        elif ch == "c":
            dr.rectangle([x, y, x + S - 1, y + S - 1], fill=(140, 104, 62))
        elif ch == "T":
            pass
# lone trees inside the border
for ty, row in enumerate(m):
    for tx, ch in enumerate(row):
        if ch == "T" and 2 <= ty <= d["rows"] - 3 and 2 <= tx <= d["cols"] - 3:
            x, y = tx * S, ty * S
            dr.rectangle([x, y, x + S - 1, y + S - 1], fill=TREE)
            dr.point((x + 1, y), (72, 96, 66))
im.save("public/assets/ui/townmap.png")
print("townmap.png", im.size)
