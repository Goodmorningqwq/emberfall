"""Author + render the Emberfall town (hub) map: writes src/game/data/emberfall-town.json
and docs/mockup/town-map.png. 32x24 tiles, dense: '.' grass, '=' flagstone path, 'T' tree,
letters = anchors (see legend). Re-run after editing; the scene reads the JSON."""
import json
from PIL import Image, ImageDraw, ImageFont

W, H = 32, 24
g = [["." for _ in range(W)] for _ in range(H)]


def fill(x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = ch


def put(x, y, ch):
    g[y][x] = ch


# tree border, two deep
fill(0, 0, W - 1, 1, "T")
fill(0, H - 2, W - 1, H - 1, "T")
fill(0, 0, 1, H - 1, "T")
fill(W - 2, 0, W - 1, H - 1, "T")
# plaza + roads
fill(12, 9, 19, 14, "=")             # plaza
fill(15, 6, 16, 9, "=")              # north to the elder's hall
fill(15, 14, 16, 18, "=")            # south to the shrine
fill(19, 11, 29, 12, "=")            # east road to the Whisperwood gate
fill(2, 11, 12, 12, "=")             # west road to the crypt gate
fill(7, 7, 8, 11, "=")               # apothecary spur
fill(24, 7, 25, 11, "=")             # forge spur
fill(5, 12, 6, 21, "=")              # south-west lane to the cinder gate
# buildings (96px = 3x3 from the anchor's top-left; doors sit on the middle column)
put(14, 3, "E")   # elder's hall: cols 14-16, door at 15 -> path 15-16
put(23, 4, "F")   # forge: cols 23-25, door at 24
put(6, 4, "A")    # apothecary: cols 6-8, door at 7
put(15, 18, "S")  # shrine 2x2
put(15, 10, "P")  # ember plinth
put(29, 11, "1")  # Whisperwood gate (east)
put(2, 11, "2")   # Sunken Crypt gate (west, sealed)
put(5, 21, "3")   # Cinder Depths gate (south-west, sealed)
# npcs and spawn
put(24, 8, "b")
put(7, 8, "a")
put(17, 7, "e")
put(15, 15, "@")
# dressing: lanterns on the plaza corners, a well, crates by the forge, bushes, ruined wall bits, tree clumps
for x, y in [(11, 8), (20, 8), (11, 15), (20, 15)]:
    put(x, y, "l")
put(19, 5, "w")
put(26, 6, "c")
put(27, 9, "c")
for x, y in [(4, 8), (10, 5), (21, 3), (27, 3), (3, 15), (10, 17), (22, 17), (27, 15), (12, 20), (20, 20), (9, 13), (22, 9)]:
    put(x, y, "u")
for x, y in [(9, 19), (23, 20), (3, 18)]:
    put(x, y, "r")
for x, y in [(3, 4), (4, 5), (11, 3), (12, 4), (28, 5), (27, 7), (3, 20), (26, 21), (28, 19), (13, 21), (19, 21), (29, 15), (2, 15), (13, 2), (18, 2), (28, 8)]:
    if g[y][x] == ".":
        put(x, y, "T")

rows = ["".join(r) for r in g]
data = {
    "id": "emberfall",
    "name": "Emberfall",
    "cols": W,
    "rows": H,
    "spawn": {"tx": 15.5, "ty": 15},
    "legend": {
        ".": "grass", "=": "path", "T": "tree",
        "E": "house-elder", "F": "house-forge", "A": "house-apothecary", "S": "shrine", "P": "plinth",
        "1": "gate-whisperwood", "2": "gate-crypt", "3": "gate-cinder",
        "b": "npc-blacksmith", "a": "npc-apothecary", "e": "npc-elder", "@": "spawn",
        "l": "lantern", "w": "well", "c": "crates", "u": "bush", "r": "ruin-wall",
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
T = 10
im = Image.new("RGB", (W * T + 260, H * T + 40), (22, 24, 22))
d = ImageDraw.Draw(im)
COL = {".": (96, 140, 80), "=": (150, 140, 110), "T": (40, 78, 48), "E": (200, 160, 60), "F": (200, 110, 60), "A": (120, 200, 120), "S": (110, 200, 240), "P": (240, 120, 60), "1": (230, 190, 80), "2": (90, 90, 120), "3": (120, 60, 60), "b": (240, 240, 240), "a": (240, 240, 240), "e": (240, 240, 240), "@": (255, 255, 255), "l": (255, 200, 90), "w": (120, 130, 140), "c": (160, 110, 70), "u": (70, 120, 60), "r": (130, 130, 120)}
for y, row in enumerate(rows):
    for x, ch in enumerate(row):
        d.rectangle([20 + x * T, 20 + y * T, 20 + x * T + T - 1, 20 + y * T + T - 1], fill=COL.get(ch, (255, 0, 255)))
try:
    F = ImageFont.truetype("public/assets/fonts/EmberfallPixel.ttf", 16)
except Exception:
    F = ImageFont.load_default()
legend = [("E", "Elder's hall"), ("F", "Forge (Orrin)"), ("A", "Apothecary (Maren)"), ("S", "Save shrine"), ("P", "Ember plinth"), ("1", "Gate: Whisperwood"), ("2", "Gate: Crypt (sealed)"), ("3", "Gate: Cinder (sealed)"), ("l", "lantern"), ("w", "well"), ("c", "crates"), ("u", "bush"), ("r", "ruined wall"), ("T", "trees")]
for i, (ch, name) in enumerate(legend):
    y = 24 + i * 16
    d.rectangle([W * T + 30, y, W * T + 42, y + 12], fill=COL[ch])
    d.text((W * T + 48, y - 2), name, font=F, fill=(220, 220, 200))
im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
im.save("docs/mockup/town-map.png")
print("wrote town json + map", im.size)
