"""Draws public/assets/ui/minimap.png (six 14x10 room cells: none, unknown, seen, here, boss, done)
and public/assets/ui/lock.png (8x8 padlock) in the UI palette. Pure pixel work, no AI."""
from PIL import Image, ImageDraw

INK = (237, 233, 223)
DARK = (16, 20, 16)
STONE = (91, 102, 91)
STONE_LO = (58, 66, 58)
MOSS = (112, 122, 96)
MOSS_HI = (140, 150, 118)
EMBER = (232, 118, 58)
EMBER_HI = (255, 242, 176)
RED = (224, 90, 74)

W, H = 14, 10
sheet = Image.new("RGBA", (W * 6, H), (0, 0, 0, 0))
d = ImageDraw.Draw(sheet)


def cell(i, fill, edge, inner=None):
    x = i * W
    d.rectangle([x, 0, x + W - 1, H - 1], fill=edge)
    d.rectangle([x + 1, 1, x + W - 2, H - 2], fill=fill)
    if inner:
        d.rectangle([x + 2, 2, x + W - 3, H - 3], outline=inner)


# 0 none: nothing (empty grid slot)
# 1 unknown: dark slab, dotted edge
cell(1, DARK, STONE_LO)
for x in range(1 * W + 1, 2 * W - 1, 2):
    d.point((x, 0), STONE)
    d.point((x, H - 1), STONE)
# 2 seen: mossy flagstone with a lighter top-left edge
cell(2, MOSS, STONE)
d.line([(2 * W + 1, 1), (3 * W - 2, 1)], fill=MOSS_HI)
d.line([(2 * W + 1, 1), (2 * W + 1, H - 2)], fill=MOSS_HI)
d.point((2 * W + 5, 4), STONE)
d.point((2 * W + 9, 6), STONE)
# 3 here: ember slab with a bright rim
cell(3, EMBER, EMBER_HI)
d.point((3 * W + 4, 3), EMBER_HI)
d.point((3 * W + 5, 3), EMBER_HI)
d.point((3 * W + 4, 4), EMBER_HI)
# 4 boss (seen): mossy slab with a red mark
cell(4, MOSS, STONE)
cx, cy = 4 * W + 7, 5
for dx, dy in [(0, -2), (-1, -1), (0, -1), (1, -1), (-2, 0), (-1, 0), (0, 0), (1, 0), (2, 0), (-1, 1), (1, 1), (-1, 2), (1, 2)]:
    d.point((cx + dx, cy + dy), RED)
d.point((cx - 1, cy), DARK)
d.point((cx + 1, cy), DARK)
# 5 done (cleared / solved): the flagstone gone dim, so what's left to do stands out
cell(5, STONE_LO, STONE)
d.point((5 * W + 5, 4), (48, 54, 48))
d.point((5 * W + 9, 6), (48, 54, 48))
sheet.save("public/assets/ui/minimap.png")

lock = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
l = ImageDraw.Draw(lock)
# shackle
l.rectangle([2, 0, 5, 3], outline=INK)
l.point((2, 3), (0, 0, 0, 0))
l.point((5, 3), (0, 0, 0, 0))
# body
l.rectangle([1, 3, 6, 7], fill=(226, 178, 74), outline=DARK)
l.point((3, 5), DARK)
l.point((4, 5), DARK)
lock.save("public/assets/ui/lock.png")
print("minimap.png", sheet.size, "lock.png", lock.size)
