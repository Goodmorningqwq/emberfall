"""Cinder Depths fills drawn in Python (PixelLab refuses flat tiles): a 4-frame lava loop
(anim/lava-loop), a cooled slag tile (slag.png), and warm recolours of the slime and bat for the
magma slime / fire bat (+ their clips)."""
import os, random, colorsys
from PIL import Image

random.seed(11)
S = 32
OUT = "public/assets/sprites/props/anim/lava-loop"
os.makedirs(OUT, exist_ok=True)
CRUST = (58, 30, 26, 255)
HOT = (214, 88, 34, 255)
BRIGHT = (246, 168, 70, 255)
GLOW = (255, 226, 140, 255)
# crust plates on a torus, hot seams between them
plates = [(random.randrange(S), random.randrange(S), random.choice((3, 4, 5)), random.choice((2, 3, 4))) for _ in range(14)]
for f in range(4):
    im = Image.new("RGBA", (S, S), HOT)
    px = im.load()
    for (x, y, w, h) in plates:
        for dy in range(h):
            for dx in range(w):
                px[(x + dx) % S, (y + dy) % S] = CRUST
    # the seams pulse: bright pixels drift along them frame by frame
    for i in range(26):
        x = (random.randrange(S) + f * 2) % S
        y = random.randrange(S)
        if px[x, y] == HOT:
            px[x, y] = BRIGHT if (i + f) % 3 else GLOW
    im.save(f"{OUT}/{f}.png")

# cooled slag: the same plates, grey, with dark seams
im = Image.new("RGBA", (S, S), (74, 70, 68, 255))
px = im.load()
for (x, y, w, h) in plates:
    for dy in range(h):
        for dx in range(w):
            px[(x + dx) % S, (y + dy) % S] = (96, 92, 88, 255)
for i in range(30):
    x, y = random.randrange(S), random.randrange(S)
    if px[x, y] == (74, 70, 68, 255):
        px[x, y] = (54, 50, 48, 255)
im.save("public/assets/sprites/props/slag.png")


def shift(src, dst, dh, l=1.0, s=1.0):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, li, sa = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hls_to_rgb((h + dh) % 1.0, min(1, li * l), min(1, sa * s))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst)


P = "public/assets/sprites/props"
shift(f"{P}/slime.png", f"{P}/magmaslime.png", -0.24, 0.92, 1.5)
for clip in ["slime-hop-loop", "slime-splat"]:
    for f in sorted(os.listdir(f"{P}/anim/{clip}")):
        shift(f"{P}/anim/{clip}/{f}", f"{P}/anim/magma{clip}/{f}", -0.24, 0.92, 1.5)
shift(f"{P}/bat.png", f"{P}/firebat.png", 0.16, 1.05, 1.3)
print("lava loop, slag, magma slime, fire bat")

# --- the cinder tileset's floor came back slate blue; pull the blues to warm ash grey, keep the magma seams
raw = Image.open("public/assets/tiles/cinder-raw.png").convert("RGBA")
px = raw.load()
for y in range(raw.height):
    for x in range(raw.width):
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.5 < h < 0.75:  # blues -> near-neutral warm grey, a shade darker
            h = 0.08
            s *= 0.12
            l *= 0.8
        r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
        px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
raw.save("public/assets/tiles/cinder.png")
print("cinder tileset warmed")
