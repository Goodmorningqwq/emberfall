"""Author the Sunken Crypt (dungeon 2): writes src/game/data/sunken-crypt.json and renders
docs/mockup/crypt-map.png. Same 20x12 ASCII room format as Whisperwood plus:
  ~ water (impassable; a room's plate drains it)   _ pit (impassable; grapple across)
  ^ grapple anchor   k skeleton   b bat   w blue slime   K skeleton captain (mini-boss)
  Q sarcophagus (solid)   p bone pile (decor)   T tutorial-ish sign positions reuse 'S'
"""
import json
from PIL import Image, ImageDraw, ImageFont

R = {}


def room(id, gx, gy, name, purpose, rows, **extra):
    assert len(rows) == 12 and all(len(r) == 20 for r in rows), id
    R[id] = {"id": id, "gx": gx, "gy": gy, "name": name, "purpose": purpose, "map": rows, **extra}


room("entrance", 0, 2, "Drowned Stair", "start", [
    "####################",
    "####################",
    "######t##..##t######",
    "#..................#",
    "#..S...............#",
    "#..................#",
    "#...................",
    "#...................",
    "#.......p..........#",
    "#........@.........#",
    "#..................#",
    "#########..#########",
], signs=["The crypt drowned when the Ember died. Where the water stands, look for a rune plate: they still remember how to drain it."])

room("drowned-hall", 1, 2, "Drowned Hall", "puzzle", [
    "#########..#########",
    "#########..#########",
    "#########..#########",
    "#..~~~~~~~~~~~~~~..#",
    "#..~~~~~~~~~~~~~~..#",
    "#..~~~~~~~~~~~~~~..#",
    "...~~~~~~~~~~~~~~...",
    "...~~~~~~~~~~~~~~...",
    "#..~~~~~~~~~~~~~~..#",
    "#.X~~~~~~~~~~~~~~..#",
    "#..~~~~~~~~~~~~~~..#",
    "####################",
], solveReward="drain")

room("ossuary", 2, 2, "Ossuary", "fight", [
    "####################",
    "####################",
    "####################",
    "#.Q..............Q.#",
    "#....k......k......#",
    "#..................#",
    "..........k........#",
    "..........p........#",
    "#..S...............#",
    "#......k.....p.....#",
    "#.Q..............Q.#",
    "####################",
], clearReward="key", signs=["They were buried standing, sword in hand. Their swings still telegraph: watch the shield arm rise."])

room("crossing", 1, 1, "The Crossing", "fight", [
    "#########..#########",
    "#########..#########",
    "######t##ZZ##t######",
    "#..................#",
    "#....b.......b.....#",
    "#..................#",
    "L...................",
    "L...................",
    "#..................#",
    "#........w.........#",
    "#..................#",
    "#########..#########",
])

room("captains-vault", 0, 1, "Captain's Vault", "miniboss", [
    "#########..#########",
    "#########..#########",
    "#########LL#########",
    "#..Q............Q..#",
    "#.........c........#",
    "#..................#",
    "#.........K.........",
    "#...................",
    "#..k...........k...#",
    "#..................#",
    "#..Q............Q..#",
    "####################",
], clearReward="chest:grapple", sub="The Captain waits")

room("cistern", 2, 1, "Cistern", "puzzle", [
    "####################",
    "####################",
    "####################",
    "#..~~~~~~~~^.......#",
    "#..~~~~~~~~........#",
    "#..~~~~~~~~...c....#",
    "...~~~~~~~~.........",
    "...~~~~~~~~.........",
    "#.^~~~~~~~~..X.....#",
    "#..~~~~~~~~........#",
    "#..~~~~~~~~..w.....#",
    "####################",
], solveReward="chest:bosskey", signs=[])

room("bat-roost", 3, 1, "Bat Roost", "fight", [
    "#########WW#########",
    "#########WW#########",
    "#########WW#########",
    "#..b...........b...#",
    "#........p.........#",
    "#..................#",
    "..........b........#",
    "...................#",
    "#..b...........b...#",
    "#.........k........#",
    "#..................#",
    "####################",
], clearReward="key")

room("flooded-chapel", 0, 0, "Flooded Chapel", "puzzle", [
    "####################",
    "####################",
    "######t########t####",
    "#..................#",
    "#..~~~~~~~~~~~~~...#",
    "#..~~~~w~~~~~~~~...#",
    "#..~~~~~~~~~w~~~..C#",
    "#..~~~~~~~~~~~~~...#",
    "#..~~~~~~~~~~~~~...#",
    "#..X...............#",
    "#..................#",
    "#########..#########",
], chests=["heart"], solveReward="drain")

room("boss", 1, 0, "Hall of the Bone Knight", "boss", [
    "####################",
    "####################",
    "####t##########t####",
    "#.^..............^.#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#.^..............^.#",
    "#########..#########",
], objects=[{"kind": "boneknight", "x": 10, "y": 4.8}], sub="Hook a post when the floor shakes")

room("reliquary", 3, 0, "Reliquary", "treasure", [
    "####################",
    "####################",
    "######t######t######",
    "#..................#",
    "#..................#",
    "#.......C..C.......#",
    "#..................#",
    "#..Q............Q..#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#########WW#########",
], chests=["gold", "potion"])

order = ["entrance", "drowned-hall", "ossuary", "crossing", "captains-vault", "cistern", "bat-roost", "flooded-chapel", "boss", "reliquary"]
data = {
    "id": "crypt",
    "name": "Sunken Crypt",
    "cols": 4,
    "rows": 3,
    "entrance": {"room": "entrance", "tx": 9.5, "ty": 8.2},
    "tileset": "crypt",
    "legend": {
        "#": "wall", ".": "floor", "~": "water", "_": "pit", "^": "anchor",
        "L": "door-locked", "Z": "door-boss", "W": "wall-cracked",
        "@": "spawn", "t": "torch", "Q": "sarcophagus", "p": "bones", "X": "plate", "S": "sign",
        "C": "chest", "c": "chest-hidden", "k": "skeleton", "b": "bat", "w": "blueslime", "K": "captain",
    },
    "rooms": [R[i] for i in order],
}
json.dump(data, open("src/game/data/sunken-crypt.json", "w", encoding="utf-8"), indent=2)

# render overview
T, GAP, LABEL_H = 8, 200, 64
RW, RH = 20 * T, 12 * T
W = data["cols"] * (RW + GAP) + GAP
H = data["rows"] * (RH + LABEL_H + GAP) + GAP
im = Image.new("RGB", (W, H), (18, 20, 24))
dr = ImageDraw.Draw(im)
try:
    F = ImageFont.truetype("public/assets/fonts/EmberfallPixel.ttf", 16)
except Exception:
    F = ImageFont.load_default()
COL = {"#": (52, 58, 70), ".": (104, 112, 100), "~": (46, 96, 120), "_": (10, 10, 14), "^": (200, 170, 90), "t": (255, 170, 60),
       "L": (200, 160, 60), "Z": (190, 70, 60), "W": (120, 90, 70), "@": (240, 240, 240), "Q": (150, 150, 160), "p": (220, 210, 190),
       "X": (90, 150, 200), "S": (160, 120, 70), "C": (230, 190, 80), "c": (200, 160, 60), "k": (230, 230, 220), "b": (150, 110, 170), "w": (110, 160, 230), "K": (255, 255, 255)}
NOTE = {"entrance": "sign: rune plates drain water", "drowned-hall": "plate drains it : N + E open", "ossuary": "3 skeletons : small key",
        "crossing": "bats, slime : W locked (ossuary key), N boss", "captains-vault": "Skeleton Captain : Grapple hook", "cistern": "grapple over, plate : Boss key",
        "bat-roost": "bats : key : crack N", "flooded-chapel": "slimes, plate : heart", "boss": "hook his shield; hook a post when he quakes : shard 2/3",
        "reliquary": "bomb passage : gold + potion"}
for i, rid in enumerate(order):
    r = R[rid]
    ox, oy = GAP + r["gx"] * (RW + GAP), GAP + r["gy"] * (RH + LABEL_H + GAP)
    for y, row in enumerate(r["map"]):
        for x, ch in enumerate(row):
            base = COL["#"] if ch in "#tW" else COL["."]
            dr.rectangle([ox + x * T, oy + y * T, ox + x * T + T - 1, oy + y * T + T - 1], fill=base)
            if ch not in "#.":
                dr.rectangle([ox + x * T + 1, oy + y * T + 1, ox + x * T + T - 2, oy + y * T + T - 2], fill=COL.get(ch, (255, 0, 255)))
    for o in r.get("objects", []):
        cx, cy = ox + o["x"] * T, oy + o["y"] * T
        dr.rectangle([cx - 10, cy - 10, cx + 10, cy + 10], outline=(220, 90, 70), width=2)
    dr.rectangle([ox - 1, oy - 1, ox + RW, oy + RH], outline=(90, 100, 110))
    dr.text((ox, oy + RH + 6), f"R{i + 1} {r['name']}", font=F, fill=(240, 230, 200))
    dr.text((ox, oy + RH + 24), NOTE[rid], font=F, fill=(190, 190, 170))
im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
im.save("docs/mockup/crypt-map.png")
print("crypt json + map", im.size)
