"""Author + render the Emberfall town (hub) map: writes src/game/data/emberfall-town.json
and docs/mockup/town-map.png. 40x30 tiles. '.' grass, '=' dirt path, 'T' tree, letters = anchors."""
import json
from PIL import Image, ImageDraw, ImageFont

W, H = 40, 30
g = [["." for _ in range(W)] for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


# tree border, two deep, with a few gaps for the gates
fill(0, 0, W - 1, 1, "T")
fill(0, H - 2, W - 1, H - 1, "T")
fill(0, 0, 1, H - 1, "T")
fill(W - 2, 0, W - 1, H - 1, "T")
# plaza + paths
fill(15, 11, 24, 18, "=")            # central plaza
fill(19, 7, 20, 11, "=")             # north to the elder
fill(19, 18, 20, 22, "=")            # south to the shrine
fill(24, 14, 37, 15, "=")            # east to the Whisperwood gate
fill(2, 14, 15, 15, "=")             # west to the crypt gate
fill(9, 8, 10, 14, "=")              # apothecary spur
fill(29, 8, 30, 14, "=")             # forge spur
fill(6, 18, 7, 27, "=")              # south-west to the cinder gate
fill(7, 18, 15, 18, "=")
# buildings (3x3 anchors; the sprite is 96x96 drawn from the anchor's top-left)
g[4][17] = "E"   # elder's house, rows 4-6, cols 17-19
g[5][28] = "F"   # forge, rows 5-7
g[5][8] = "A"    # apothecary, rows 5-7
g[22][18] = "S"  # shrine, rows 22-24 (64x64 -> 2x2)
g[13][19] = "P"  # ember plinth (48x64 -> ~1.5x2)
g[14][37] = "1"  # Whisperwood gate (east)
g[14][2] = "2"   # Sunken Crypt gate (west, sealed)
g[27][6] = "3"   # Cinder Depths gate (south-west, sealed)
# npcs and spawn
g[9][29] = "b"   # blacksmith
g[9][9] = "a"    # apothecary
g[8][18] = "e"   # elder
g[17][19] = "@"
# scattered trees + a well-worn stump or two
for x, y in [(5, 4), (12, 3), (33, 3), (35, 8), (4, 22), (12, 24), (26, 24), (33, 21), (34, 26), (14, 8), (25, 9), (3, 9)]:
    g[y][x] = "T"

rows = ["".join(r) for r in g]
data = {
    "id": "emberfall",
    "name": "Emberfall",
    "cols": W,
    "rows": H,
    "spawn": {"tx": 19.5, "ty": 18},
    "legend": {
        ".": "grass", "=": "path", "T": "tree",
        "E": "house-elder", "F": "house-forge", "A": "house-apothecary", "S": "shrine", "P": "plinth",
        "1": "gate-whisperwood", "2": "gate-crypt", "3": "gate-cinder",
        "b": "npc-blacksmith", "a": "npc-apothecary", "e": "npc-elder", "@": "spawn",
    },
    "map": rows,
    "npcs": {
        "npc-blacksmith": {"name": "Orrin", "title": "BLACKSMITH", "lines": ["Back from the Hollow with all your fingers. Good. Bring me gold and I'll put an edge on that sword you'd not believe."]},
        "npc-apothecary": {"name": "Maren", "title": "APOTHECARY", "lines": ["Potions for coin, dear. Bombs too, if you promise not to use them indoors."]},
        "npc-elder": {"name": "Tam", "title": "ELDER", "lines": ["The Ember cracked in three. One shard sleeps under Whisperwood, east of here. Bring it home and the town will breathe again."]},
    },
}
json.dump(data, open("src/game/data/emberfall-town.json", "w", encoding="utf-8"), indent=2)

# render
T = 8
im = Image.new("RGB", (W * T + 240, H * T + 40), (22, 24, 22))
d = ImageDraw.Draw(im)
COL = {".": (96, 140, 80), "=": (150, 120, 84), "T": (40, 78, 48), "E": (200, 160, 60), "F": (200, 110, 60), "A": (120, 200, 120), "S": (110, 200, 240), "P": (240, 120, 60), "1": (230, 190, 80), "2": (90, 90, 120), "3": (120, 60, 60), "b": (240, 240, 240), "a": (240, 240, 240), "e": (240, 240, 240), "@": (255, 255, 255)}
for y, row in enumerate(rows):
    for x, ch in enumerate(row):
        c = COL.get(ch, (255, 0, 255))
        d.rectangle([20 + x * T, 20 + y * T, 20 + x * T + T - 1, 20 + y * T + T - 1], fill=c)
try:
    F = ImageFont.truetype("public/assets/fonts/EmberfallPixel.ttf", 16)
except Exception:
    F = ImageFont.load_default()
legend = [("E", "Elder's house"), ("F", "Forge (Orrin)"), ("A", "Apothecary (Maren)"), ("S", "Save shrine"), ("P", "Ember plinth (unlit)"), ("1", "Gate: Whisperwood"), ("2", "Gate: Sunken Crypt (sealed)"), ("3", "Gate: Cinder Depths (sealed)"), ("=", "dirt path"), ("T", "trees")]
for i, (ch, name) in enumerate(legend):
    y = 24 + i * 20
    d.rectangle([W * T + 30, y, W * T + 42, y + 12], fill=COL[ch])
    d.text((W * T + 48, y - 2), name, font=F, fill=(220, 220, 200))
im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
im.save("docs/mockup/town-map.png")
print("wrote town json + map", im.size)
