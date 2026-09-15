"""Crypt water: a 4-frame 32x32 tileable water loop (PixelLab refused a flat fill), plus a
cool-tinted copy of the crypt tileset so the floor reads wetter than Whisperwood's.
Writes public/assets/sprites/props/anim/water-loop/<i>.png."""
import os, random
from PIL import Image

random.seed(7)
OUT = "public/assets/sprites/props/anim/water-loop"
os.makedirs(OUT, exist_ok=True)
S = 32
BASE = (30, 62, 82, 255)
DEEP = (22, 48, 66, 255)
LIGHT = (58, 104, 124, 255)
GLINT = (120, 170, 186, 255)

# ripple segments: (x, y, length) on a torus so the tile wraps on all sides
ripples = [(random.randrange(S), random.randrange(S), random.choice((3, 4, 5, 6))) for _ in range(9)]
darks = [(random.randrange(S), random.randrange(S), random.choice((2, 3, 4))) for _ in range(6)]
frames = 4
for f in range(frames):
    im = Image.new("RGBA", (S, S), BASE)
    px = im.load()
    # slow drift: ripples slide one pixel per frame, glints blink on alternate frames
    for i, (x, y, ln) in enumerate(darks):
        yy = (y + f) % S
        for k in range(ln):
            px[(x + k) % S, yy] = DEEP
    for i, (x, y, ln) in enumerate(ripples):
        xx = (x + f) % S
        for k in range(ln):
            px[(xx + k) % S, y] = LIGHT
        if (i + f) % 2 == 0:
            px[(xx + ln - 1) % S, y] = GLINT
    im.save(f"{OUT}/{f}.png")
print("water frames", frames)

# preview strip
sheet = Image.new("RGBA", (S * 3 * frames + 8 * (frames + 1), S * 3 + 16), (60, 66, 80, 255))
for f in range(frames):
    sheet.alpha_composite(Image.open(f"{OUT}/{f}.png").resize((S * 3, S * 3), Image.NEAREST), (8 + f * (S * 3 + 8), 8))
# tiled check
tiled = Image.new("RGBA", (S * 4, S * 3))
for y in range(3):
    for x in range(4):
        tiled.alpha_composite(Image.open(f"{OUT}/0.png"), (x * S, y * S))
os.makedirs("docs/sprite-review", exist_ok=True)
big = Image.new("RGBA", (max(sheet.width, tiled.width * 2), sheet.height + tiled.height * 2 + 8), (60, 66, 80, 255))
big.alpha_composite(sheet, (0, 0))
big.alpha_composite(tiled.resize((tiled.width * 2, tiled.height * 2), Image.NEAREST), (0, sheet.height + 8))
big.save("docs/sprite-review/crypt-water.png")

# --- the tileset came back with Whisperwood's floor (same base tile); cool it so the crypt reads damp
import colorsys
raw = Image.open("public/assets/tiles/crypt-raw.png").convert("RGBA")
px = raw.load()
for y in range(raw.height):
    for x in range(raw.width):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        # greens swing toward teal, everything a touch darker and greyer
        if 0.15 < h < 0.45:
            h = h + 0.12
        l *= 0.86
        s *= 0.8
        r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
        px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
raw.save("public/assets/tiles/crypt.png")
print("crypt tileset cooled")
