"""Render docs/mockup/whisperwood-map.png from src/game/data/whisperwood.json."""
import json
from PIL import Image, ImageDraw, ImageFont

d = json.load(open("src/game/data/whisperwood.json"))
T = 8            # px per tile
GAP = 96
LABEL_H = 64
RW, RH = 20 * T, 12 * T
W = d["cols"] * (RW + GAP) + GAP
H = d["rows"] * (RH + LABEL_H + GAP) + GAP
im = Image.new("RGB", (W, H), (22, 24, 22))
dr = ImageDraw.Draw(im)
try:
    F = ImageFont.truetype("public/assets/fonts/EmberfallPixel.ttf", 16)
    Fs = ImageFont.truetype("public/assets/fonts/EmberfallPixel.ttf", 16)
except Exception:
    F = Fs = ImageFont.load_default()

COL = {
    "#": (58, 66, 58), ".": (112, 122, 96), "W": (120, 90, 70),
    "L": (200, 160, 60), "Z": (190, 70, 60), "@": (240, 240, 240),
    "t": (255, 170, 60), "o": (96, 70, 46), "B": (150, 140, 120), "X": (90, 150, 200),
    "Y": (110, 200, 240), "C": (230, 190, 80), "c": (200, 160, 60), "k": (240, 220, 90),
    "s": (110, 200, 110), "f": (170, 255, 200), "m": (190, 120, 200), "M": (60, 150, 60),
}
GATE = {"entrance": "N: locked (key)", "crossroads": "N: boss door · E: locked (key)", "east-crystal": "N: cracked wall (bomb)"}
REWARD = {"west-fight": "clear → small key", "east-puzzle": "block on plate → small key",
          "west-miniboss": "clear → Boomerang", "east-crystal": "boomerang the crystal → Boss key",
          "boss": "Elder Treant → Ember shard", "treasure": "heart container + gold", "crossroads": "2 sprites, 1 mushroom",
          "entrance": "no enemies · start here"}

for r in d["rooms"]:
    ox = GAP + r["gx"] * (RW + GAP)
    oy = GAP + r["gy"] * (RH + LABEL_H + GAP)
    for y, row in enumerate(r["map"]):
        for x, ch in enumerate(row):
            base = COL["#"] if ch in "#tW" else COL["."]
            dr.rectangle([ox + x * T, oy + y * T, ox + x * T + T - 1, oy + y * T + T - 1], fill=base)
            if ch not in "#.":
                c = COL.get(ch, (255, 0, 255))
                dr.rectangle([ox + x * T + 1, oy + y * T + 1, ox + x * T + T - 2, oy + y * T + T - 2], fill=c)
    for o in r.get("objects", []):
        cx, cy = ox + o["x"] * T, oy + o["y"] * T
        dr.rectangle([cx - 12, cy - 12, cx + 12, cy + 12], outline=(220, 90, 70), width=2)
    dr.rectangle([ox - 1, oy - 1, ox + RW, oy + RH], outline=(90, 100, 90))
    n = ["entrance", "west-fight", "east-puzzle", "crossroads", "west-miniboss", "east-crystal", "boss", "treasure"].index(r["id"]) + 1
    dr.text((ox, oy + RH + 6), f"R{n} {r['name']}", font=F, fill=(240, 230, 200))
    dr.text((ox, oy + RH + 24), REWARD.get(r["id"], ""), font=Fs, fill=(190, 190, 170))
    if r["id"] in GATE:
        dr.text((ox, oy + RH + 42), GATE[r["id"]], font=Fs, fill=(220, 170, 90))

# legend
lx, ly = GAP, GAP + 0 * (RH + LABEL_H + GAP)
items = [("s", "slime"), ("f", "sprite"), ("m", "mushroom"), ("M", "Mossback"), ("B", "push block"), ("X", "plate"),
         ("Y", "crystal"), ("o", "stump"), ("C", "chest"), ("c", "hidden chest"), ("k", "key drop"), ("L", "locked"), ("Z", "boss door"), ("W", "cracked")]
for i, (ch, name) in enumerate(items):
    y = ly + i * 14
    dr.rectangle([lx, y, lx + 12, y + 12], fill=COL[ch])
    dr.text((lx + 18, y - 2), name, font=Fs, fill=(200, 200, 190))

im = im.resize((W * 2, H * 2), Image.NEAREST)
im.save("docs/mockup/whisperwood-map.png")
print(im.size)
