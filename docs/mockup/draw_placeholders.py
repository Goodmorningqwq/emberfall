"""Procedural placeholder pixel art for the Emberfall look mockup.

These are NOT final assets. They exist so the UI mockup has a plausible
top-down scene underneath it. PixelLab-generated sprites and tilesets replace
them in the pre-M0 demo.

Output: room.png / hub.png (1280x720, 2x nearest upscale of a 640x360 scene),
hero_portrait.png, elder_portrait.png (128x128), hero_sprite.png (64x64).
"""
import random
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).parent
T = 32  # tile size at 1x
W, H = 640, 360  # 20 x 11.25 tiles
random.seed(7)


def px(d, x, y, c):
    d.point((x, y), fill=c)


def rect(d, x, y, w, h, c):
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=c)


# ---------- palette (modern-indie: soft, slightly desaturated) ----------
MOSS = ["#5c6a50", "#647356", "#56634a", "#5f6d52"]
MOSS_DARK = "#48543f"
MOSS_LIGHT = "#71805f"
STONE = ["#4c5656", "#515c5c", "#475151"]
STONE_LINE = "#3b4444"
STONE_TOP = "#2b3232"
VINE = "#3f7448"
LEAF = "#5b9758"
LEAF_L = "#7ab06f"
WOOD = "#7d5232"
WOOD_L = "#9a6a42"
GOLD = "#d8a545"
GOLD_D = "#a97a2a"
IRON = "#8b9294"
IRON_D = "#5f6667"
DOOR = "#33291f"
DOOR_L = "#4a3a2c"
SLIME = "#6fae6c"
SLIME_L = "#98cc90"
SLIME_D = "#4f8a4d"
SHADOW = (0, 0, 0, 70)


def moss_floor(d, tx, ty):
    x, y = tx * T, ty * T
    rect(d, x, y, T, T, random.choice(MOSS))
    # stone slab seams
    d.line((x, y + T - 1, x + T - 1, y + T - 1), fill=MOSS_DARK)
    d.line((x + T - 1, y, x + T - 1, y + T - 1), fill=MOSS_DARK)
    # speckles / moss tufts
    for _ in range(random.randint(2, 5)):
        sx, sy = x + random.randint(2, T - 4), y + random.randint(2, T - 4)
        c = random.choice([MOSS_LIGHT, MOSS_DARK])
        rect(d, sx, sy, random.randint(1, 3), random.randint(1, 2), c)
    if random.random() < 0.12:  # crack
        cx, cy = x + random.randint(4, 20), y + random.randint(4, 20)
        d.line((cx, cy, cx + random.randint(3, 9), cy + random.randint(-3, 4)), fill=MOSS_DARK)


def wall(d, tx, ty, top=False):
    x, y = tx * T, ty * T
    rect(d, x, y, T, T, random.choice(STONE))
    # brick courses
    for row in range(0, T, 8):
        d.line((x, y + row, x + T - 1, y + row), fill=STONE_LINE)
        off = 0 if (row // 8) % 2 == 0 else 16
        for bx in range(off, T, 32):
            d.line((x + bx, y + row, x + bx, y + row + 7), fill=STONE_LINE)
        d.line((x + off + 16 if off == 0 else x, y + row, x + off + 16 if off == 0 else x, y + row + 7), fill=STONE_LINE)
    if top:
        rect(d, x, y, T, 6, STONE_TOP)


def vine(d, x, y, length=40):
    for i in range(length):
        vx = x + int(2 * ((i // 6) % 2)) - 1
        px(d, vx, y + i, VINE)
        if i % 5 == 2:
            rect(d, vx - 2, y + i, 3, 2, LEAF)
            px(d, vx - 2, y + i, LEAF_L)
        if i % 7 == 4:
            rect(d, vx + 1, y + i, 3, 2, LEAF)


def chest(d, x, y):
    rect(d, x + 2, y + 6, 20, 14, WOOD)
    rect(d, x + 2, y + 6, 20, 5, WOOD_L)
    rect(d, x + 2, y + 11, 20, 1, GOLD_D)
    rect(d, x + 2, y + 6, 20, 1, GOLD)
    rect(d, x + 2, y + 19, 20, 1, GOLD_D)
    rect(d, x + 10, y + 10, 4, 5, GOLD)
    px(d, x + 11, y + 12, GOLD_D)
    rect(d, x + 2, y + 20, 20, 2, (0, 0, 0, 60))


def push_block(d, x, y):
    rect(d, x + 3, y + 3, 26, 26, IRON_D)
    rect(d, x + 4, y + 4, 24, 24, IRON)
    rect(d, x + 4, y + 4, 24, 3, "#a9b0b1")
    rect(d, x + 4, y + 4, 3, 24, "#a9b0b1")
    rect(d, x + 8, y + 8, 16, 16, IRON_D)
    rect(d, x + 10, y + 10, 12, 12, IRON)
    rect(d, x + 4, y + 29, 26, 2, (0, 0, 0, 70))


def door_locked(d, x, y):
    # 2 tiles wide arch in the top wall
    rect(d, x, y + 4, 64, 28, DOOR)
    rect(d, x + 4, y + 8, 56, 24, DOOR_L)
    for i in range(0, 56, 8):
        d.line((x + 4 + i, y + 8, x + 4 + i, y + 31), fill=DOOR)
    rect(d, x + 26, y + 18, 12, 10, GOLD_D)
    rect(d, x + 28, y + 14, 8, 6, GOLD)
    rect(d, x + 30, y + 16, 4, 2, GOLD_D)
    rect(d, x + 31, y + 22, 2, 4, DOOR)
    rect(d, x + 28, y + 20, 8, 6, GOLD)


def torch(d, x, y, lit=True):
    rect(d, x + 14, y + 12, 4, 12, WOOD)
    rect(d, x + 13, y + 10, 6, 3, IRON_D)
    if lit:
        rect(d, x + 12, y + 3, 8, 8, "#e0742f")
        rect(d, x + 13, y + 1, 6, 6, "#f3a640")
        rect(d, x + 14, y + 0, 4, 3, "#fbe08a")


def hero(d, x, y, facing="down"):
    """Feminine hooded warden, ~14x22 px footprint at 1x. Ember scarf."""
    CLOAK = "#465a68"
    CLOAK_D = "#354550"
    SKIN = "#e7b88f"
    HAIR = "#5a3624"
    SCARF = "#d1541f"
    SCARF_L = "#ec7a3a"
    LEATHER = "#6a4a2e"
    BOOT = "#3c2a1c"
    SWORD = "#d2d9dc"
    # shadow
    rect(d, x + 2, y + 21, 12, 3, (0, 0, 0, 70))
    # hood (down) behind head
    rect(d, x + 3, y + 5, 10, 4, CLOAK_D)
    # hair
    rect(d, x + 4, y + 1, 8, 5, HAIR)
    rect(d, x + 3, y + 3, 10, 5, HAIR)
    # face
    rect(d, x + 5, y + 3, 6, 5, SKIN)
    px(d, x + 6, y + 5, "#2b1d14")
    px(d, x + 9, y + 5, "#2b1d14")
    # scarf
    rect(d, x + 4, y + 8, 8, 3, SCARF)
    rect(d, x + 4, y + 8, 8, 1, SCARF_L)
    rect(d, x + 10, y + 10, 3, 5, SCARF)  # trailing tail
    # cloak body
    rect(d, x + 3, y + 10, 10, 9, CLOAK)
    rect(d, x + 3, y + 10, 2, 9, CLOAK_D)
    rect(d, x + 11, y + 10, 2, 9, CLOAK_D)
    # leather chest piece
    rect(d, x + 6, y + 11, 4, 6, LEATHER)
    px(d, x + 8, y + 13, GOLD)
    # legs / boots
    rect(d, x + 5, y + 18, 2, 3, BOOT)
    rect(d, x + 9, y + 18, 2, 3, BOOT)
    # sword at hip
    rect(d, x + 1, y + 12, 2, 8, SWORD)
    rect(d, x + 0, y + 11, 4, 1, GOLD_D)


def slime(d, x, y):
    rect(d, x + 3, y + 14, 14, 3, (0, 0, 0, 60))
    rect(d, x + 3, y + 6, 14, 9, SLIME)
    rect(d, x + 5, y + 4, 10, 3, SLIME)
    rect(d, x + 4, y + 13, 12, 2, SLIME_D)
    rect(d, x + 6, y + 5, 3, 2, SLIME_L)
    px(d, x + 7, y + 9, "#1f2f1f")
    px(d, x + 12, y + 9, "#1f2f1f")


def stamp(img, fn, x, y, size=(16, 24), scale=2):
    spr = Image.new("RGBA", size)
    fn(ImageDraw.Draw(spr, "RGBA"), 0, 0)
    spr = spr.resize((size[0] * scale, size[1] * scale), Image.NEAREST)
    img.alpha_composite(spr, (x, y))


def scene_room():
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img, "RGBA")
    cols, rows = 20, 12
    for ty in range(rows):
        for tx in range(cols):
            edge = tx == 0 or tx == cols - 1 or ty == 0 or ty >= 10
            if edge:
                wall(d, tx, ty, top=(ty == 0 or ty == 10))
            else:
                moss_floor(d, tx, ty)
    # thicker top wall (two courses) for depth
    for tx in range(cols):
        wall(d, tx, 1, top=False)
        rect(d, tx * T, T, T, 3, STONE_TOP)
    # door in top wall
    door_locked(d, 9 * T, 0)
    # torches flanking door
    torch(d, 7 * T, 1 * T)
    torch(d, 12 * T, 1 * T)
    # vines on left and right walls
    for vx, vy, ln in [(8, 40, 70), (20, 60, 50), (W - 12, 70, 80), (W - 24, 50, 40), (300, 34, 30), (520, 34, 44)]:
        vine(d, vx, vy, ln)
    # puzzle props
    push_block(d, 5 * T, 4 * T)
    push_block(d, 6 * T, 7 * T)
    chest(d, 15 * T, 3 * T)
    # floor switch
    rect(d, 14 * T + 8, 7 * T + 8, 16, 16, IRON_D)
    rect(d, 14 * T + 10, 7 * T + 10, 12, 12, IRON)
    # enemies + hero
    stamp(img, slime, 12 * T - 4, 6 * T - 6, size=(20, 18))
    stamp(img, slime, 4 * T, 8 * T - 8, size=(20, 18))
    stamp(img, hero, 9 * T, 4 * T + 8)
    # hit spark next to slime (a mid-combat moment)
    sx, sy = 12 * T - 4, 6 * T + 2
    for dx, dy in [(0, -3), (0, 3), (-3, 0), (3, 0), (0, 0)]:
        rect(d, sx + dx, sy + dy, 2, 2, "#fff2b0")
    return img


# ---------- hub ----------
GRASS = ["#6f8f55", "#74955a", "#6a8a51"]
GRASS_D = "#5d7a46"
COBBLE = ["#9a9386", "#a29b8e", "#928b7f"]
COBBLE_L = "#b3ab9e"
WALL_PL = "#c4b199"
WALL_PL_D = "#a8967f"
TIMBER = "#6b4a30"
ROOF = "#8a4b38"
ROOF_D = "#6e3a2b"
ROOF_L = "#a05a44"
FOUNT = "#8e9494"
FOUNT_D = "#6c7373"
WATER = "#5b93b8"
WATER_L = "#8dbfd9"


def grass(d, tx, ty):
    x, y = tx * T, ty * T
    rect(d, x, y, T, T, random.choice(GRASS))
    for _ in range(random.randint(3, 6)):
        sx, sy = x + random.randint(1, T - 3), y + random.randint(1, T - 3)
        rect(d, sx, sy, 1, 2, GRASS_D)
    if random.random() < 0.08:
        fx, fy = x + random.randint(4, 24), y + random.randint(4, 24)
        rect(d, fx, fy, 2, 2, random.choice(["#e9d26b", "#e07a7a", "#ffffff"]))


def cobble(d, tx, ty):
    x, y = tx * T, ty * T
    rect(d, x, y, T, T, random.choice(COBBLE))
    for r in range(0, T, 8):
        off = 0 if (r // 8) % 2 == 0 else 6
        for c in range(-6, T, 12):
            rect(d, x + c + off, y + r, 10, 6, random.choice(COBBLE))
            px(d, x + c + off, y + r, COBBLE_L)


def house(d, x, y, w, h, ruined=False):
    # wall
    rect(d, x, y + 22, w, h - 22, WALL_PL)
    for i in range(0, w, 24):
        rect(d, x + i, y + 22, 3, h - 22, TIMBER)
    rect(d, x, y + h - 3, w, 3, WALL_PL_D)
    # door + window
    rect(d, x + w // 2 - 7, y + h - 22, 14, 22, TIMBER)
    rect(d, x + w // 2 - 5, y + h - 20, 10, 18, "#3d2a1b")
    rect(d, x + 14, y + 32, 10, 10, "#3d2a1b")
    rect(d, x + 15, y + 33, 8, 8, "#d9c27a")
    # roof
    rect(d, x - 4, y + 12, w + 8, 12, ROOF)
    for i in range(0, w + 8, 8):
        rect(d, x - 4 + i, y + 12, 8, 2, ROOF_L)
        rect(d, x - 4 + i, y + 18, 8, 2, ROOF_D)
    rect(d, x + 6, y, w - 12, 12, ROOF)
    rect(d, x + 6, y, w - 12, 2, ROOF_L)
    if ruined:
        # missing roof section, exposed timbers
        rect(d, x + w - 40, y, 34, 24, GRASS[0])
        for i in range(0, 34, 8):
            rect(d, x + w - 40 + i, y + 2, 2, 20, TIMBER)
        rect(d, x + w - 30, y + 30, 22, 14, "#3d2a1b")


def fountain(d, x, y):
    rect(d, x, y + 6, 40, 30, FOUNT_D)
    rect(d, x + 2, y + 8, 36, 26, FOUNT)
    rect(d, x + 5, y + 11, 30, 20, WATER)
    rect(d, x + 7, y + 13, 10, 2, WATER_L)
    rect(d, x + 22, y + 22, 8, 2, WATER_L)
    rect(d, x + 17, y, 6, 14, FOUNT_D)
    rect(d, x + 14, y + 2, 12, 3, FOUNT)


def elder(d, x, y):
    ROBE = "#6e6a7a"
    ROBE_D = "#524f5c"
    rect(d, x + 2, y + 21, 12, 3, (0, 0, 0, 70))
    rect(d, x + 4, y + 1, 8, 6, "#d8d8d8")  # white hair
    rect(d, x + 5, y + 3, 6, 5, "#e7c39e")
    rect(d, x + 5, y + 8, 6, 3, "#d8d8d8")  # beard
    rect(d, x + 3, y + 10, 10, 10, ROBE)
    rect(d, x + 3, y + 10, 2, 10, ROBE_D)
    rect(d, x + 11, y + 10, 2, 10, ROBE_D)
    rect(d, x + 14, y + 4, 2, 17, WOOD)  # staff
    rect(d, x + 13, y + 2, 4, 3, GOLD)


def scene_hub():
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img, "RGBA")
    for ty in range(12):
        for tx in range(20):
            on_path = (4 <= ty <= 7) or (8 <= tx <= 11)
            (cobble if on_path else grass)(d, tx, ty)
    # houses
    house(d, 40, 8, 120, 110)
    house(d, 400, 4, 140, 118, ruined=True)
    # fountain centre
    fountain(d, 300, 150)
    # a few bushes / trees
    for bx, by in [(20, 250), (600, 240), (560, 300), (14, 320)]:
        rect(d, bx + 4, by + 20, 24, 4, (0, 0, 0, 60))
        rect(d, bx, by + 6, 30, 16, "#3f7448")
        rect(d, bx + 4, by, 22, 10, "#5b9758")
        rect(d, bx + 8, by + 2, 6, 3, "#7ab06f")
    # sign post
    rect(d, 250, 260, 3, 22, WOOD)
    rect(d, 240, 256, 24, 12, WOOD_L)
    # characters
    stamp(img, elder, 372, 176, size=(18, 24))
    stamp(img, hero, 300, 220)
    return img


def portrait(kind):
    """64x64 portrait, drawn at 32 then upscaled."""
    img = Image.new("RGBA", (32, 32))
    d = ImageDraw.Draw(img, "RGBA")
    if kind == "hero":
        rect(d, 0, 0, 32, 32, "#3c4a55")
        rect(d, 8, 22, 16, 10, "#465a68")  # cloak shoulders
        rect(d, 10, 19, 12, 4, "#d1541f")  # scarf
        rect(d, 9, 3, 14, 12, "#5a3624")  # hair
        rect(d, 10, 6, 12, 11, "#e7b88f")  # face
        rect(d, 9, 5, 14, 3, "#5a3624")
        rect(d, 8, 6, 2, 8, "#5a3624")
        rect(d, 22, 6, 2, 8, "#5a3624")
        rect(d, 12, 10, 2, 2, "#2b1d14")
        rect(d, 18, 10, 2, 2, "#2b1d14")
        rect(d, 14, 14, 4, 1, "#b37a5a")
    else:
        rect(d, 0, 0, 32, 32, "#4a4650")
        rect(d, 8, 23, 16, 9, "#6e6a7a")
        rect(d, 9, 4, 14, 8, "#d8d8d8")
        rect(d, 10, 7, 12, 10, "#e7c39e")
        rect(d, 9, 15, 14, 8, "#d8d8d8")
        rect(d, 12, 10, 2, 2, "#2b1d14")
        rect(d, 18, 10, 2, 2, "#2b1d14")
        rect(d, 8, 8, 2, 6, "#d8d8d8")
        rect(d, 22, 8, 2, 6, "#d8d8d8")
    return img.resize((128, 128), Image.NEAREST)


def hero_sprite():
    img = Image.new("RGBA", (16, 24))
    d = ImageDraw.Draw(img, "RGBA")
    hero(d, 0, 0)
    return img.resize((64, 96), Image.NEAREST)


if __name__ == "__main__":
    scene_room().resize((1280, 720), Image.NEAREST).save(OUT / "room.png", optimize=True)
    scene_hub().resize((1280, 720), Image.NEAREST).save(OUT / "hub.png", optimize=True)
    portrait("hero").save(OUT / "hero_portrait.png", optimize=True)
    portrait("elder").save(OUT / "elder_portrait.png", optimize=True)
    hero_sprite().save(OUT / "hero_sprite.png", optimize=True)
    for f in ["room.png", "hub.png", "hero_portrait.png", "elder_portrait.png", "hero_sprite.png"]:
        print(f, (OUT / f).stat().st_size, "bytes")
