"""DRAFT — Cinder Depths (dungeon 3). Writes docs/mockup/cinder-map.png (and a draft JSON under docs/,
not src/) for the user to veto before rooms are built. Same 20x12 format as the crypt plus:
  % lava (impassable, never drains)   v fire vent (periodic flame burst on a timer, telegraphed)
  B brazier (unlit; light every brazier in the room with the Fire Rod -> solveReward)
  T thorn barricade (blocks a doorway; burn it with the Fire Rod)   E ember plate (step-on, like the crypt)
  m magma slime (splits, leaves a brief fire puddle)   f fire bat   g cinderling (armoured front, like a
  small knight: hit from behind or after a rod shot heats it)   G Cinder Golem (boss)
"""
import json
from PIL import Image, ImageDraw, ImageFont

R = {}


def room(id, gx, gy, name, purpose, rows, **extra):
    assert len(rows) == 12 and all(len(r) == 20 for r in rows), id
    R[id] = {"id": id, "gx": gx, "gy": gy, "name": name, "purpose": purpose, "map": rows, **extra}


room("entrance", 0, 2, "Slag Mouth", "start", [
    "####################",
    "####################",
    "######t##..##t######",
    "#..................#",
    "#..S...............#",
    "#.....%%...........#",
    "#.....%%............",
    "#...................",
    "#..........p.......#",
    "#........@.........#",
    "#..................#",
    "#########..#########",
], signs=["The mountain has been burning since the Ember broke. Where the vents breathe, count the breaths: they rest between."])

room("vent-gallery", 1, 2, "Vent Gallery", "puzzle", [
    "#########..#########",
    "#########..#########",
    "######t##..##t######",
    "#..................#",
    "#...v.....v.....v..#",
    "#..................#",
    "....................",
    "....................",
    "#..................#",
    "#...v.....v.....v..#",
    "#.................E#",
    "####################",
], solveReward="chest:key")

room("forge-hall", 2, 2, "Forge Hall", "fight", [
    "####################",
    "####################",
    "######t########t####",
    "#..................#",
    "#....g........g....#",
    "#..................#",
    "..........%%.......#",
    "..........%%.......#",
    "#..................#",
    "#........m.........#",
    "#..................#",
    "####################",
], clearReward="key")

room("cinder-crossing", 1, 1, "Cinder Crossing", "fight", [
    "#########..#########",
    "#########..#########",
    "######t##ZZ##t######",
    "#..................#",
    "#..%%..........%%..#",
    "#..%%....f.....%%..#",
    "L...................",
    "L...................",
    "#..%%....f.....%%..#",
    "#..%%..........%%..#",
    "#..................#",
    "#########..#########",
])

room("smelter", 0, 1, "The Smelter", "miniboss", [
    "#########..#########",
    "#########..#########",
    "#########LL#########",
    "#..%%%%%%%%%%%%%%..#",
    "#.........c........#",
    "#..................#",
    "#........gg.........",
    "#...................",
    "#..................#",
    "#..%%%%%%%%%%%%%%..#",
    "#..................#",
    "####################",
], clearReward="chest:firerod", sub="Two cinderlings guard the forge")

room("brazier-vault", 2, 1, "Brazier Vault", "puzzle", [
    "####################",
    "####################",
    "######t########t####",
    "#..B..........B....#",
    "#.........c........#",
    "#......%%%%%%......#",
    "......%%%%%%%.......",
    "......%%%%%%%.......",
    "#..................#",
    "#..B..........B....#",
    "#..................#",
    "####################",
], solveReward="chest:bosskey")

room("bat-chimney", 3, 1, "Bat Chimney", "fight", [
    "#########WW#########",
    "#########WW#########",
    "#########WW#########",
    "#..f...........f...#",
    "#........p.........#",
    "#.....%%....%%.....#",
    "......%%..f.%%.....#",
    "......%%....%%.....#",
    "#..f...........f...#",
    "#.........m........#",
    "#..................#",
    "####################",
], clearReward="key")

room("thorn-gate", 0, 0, "Thorn Gate", "puzzle", [
    "####################",
    "####################",
    "######t########t####",
    "#..................#",
    "#..%%%%%%%%%%%%%...#",
    "#..%%%%%%%%%%%%%...#",
    "#..%%%%%%%%%%%%%..C#",
    "#..%%%%%%%%%%%%%...#",
    "#..%%%%%%%%%%%%%...#",
    "#..E...............#",
    "#..................#",
    "#########TT#########",
], chests=["heart"], solveReward="drain")

room("boss", 1, 0, "Heart of the Cinder", "boss", [
    "####################",
    "####################",
    "####t##########t####",
    "#..................#",
    "#..%%..........%%..#",
    "#..%%..........%%..#",
    "#..................#",
    "#..................#",
    "#..%%..........%%..#",
    "#..%%..........%%..#",
    "#..................#",
    "#########..#########",
], objects=[{"kind": "cindergolem", "x": 10, "y": 4.8}])

room("ashen-treasury", 3, 0, "Ashen Treasury", "treasure", [
    "####################",
    "####################",
    "######t######t######",
    "#..................#",
    "#..................#",
    "#.......C..C.......#",
    "#..................#",
    "#..v............v..#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#########WW#########",
], chests=["potion", "gold"])

order = ["entrance", "vent-gallery", "forge-hall", "cinder-crossing", "smelter", "brazier-vault", "bat-chimney", "thorn-gate", "boss", "ashen-treasury"]
data = {
    "id": "cinder",
    "name": "Cinder Depths",
    "cols": 4,
    "rows": 3,
    "entrance": {"room": "entrance", "tx": 9.5, "ty": 8.2},
    "tileset": "cinder",
    "legend": {
        "#": "wall", ".": "floor", "%": "lava", "v": "vent", "B": "brazier", "T": "thorns", "E": "plate",
        "L": "door-locked", "Z": "door-boss", "W": "wall-cracked",
        "@": "spawn", "t": "torch", "p": "bones", "S": "sign",
        "C": "chest", "c": "chest-hidden", "m": "magmaslime", "f": "firebat", "g": "cinderling",
    },
    "rooms": [R[i] for i in order],
}
json.dump(data, open("docs/mockup/cinder-depths.draft.json", "w", encoding="utf-8"), indent=2)

T, GAP, LABEL_H = 8, 200, 64
RW, RH = 20 * T, 12 * T
W = data["cols"] * (RW + GAP) + GAP
H = data["rows"] * (RH + LABEL_H + GAP) + GAP
im = Image.new("RGB", (W, H), (24, 18, 18))
dr = ImageDraw.Draw(im)
try:
    F = ImageFont.truetype("public/assets/fonts/EmberfallPixel.ttf", 16)
except Exception:
    F = ImageFont.load_default()
COL = {"#": (70, 52, 52), ".": (112, 100, 96), "%": (230, 90, 40), "v": (255, 160, 60), "B": (255, 210, 90), "T": (110, 70, 40), "E": (200, 120, 60),
       "t": (255, 170, 60), "L": (200, 160, 60), "Z": (190, 70, 60), "W": (120, 90, 70), "@": (240, 240, 240), "p": (220, 210, 190), "S": (160, 120, 70),
       "C": (230, 190, 80), "c": (200, 160, 60), "m": (255, 120, 80), "f": (200, 110, 90), "g": (170, 150, 140)}
NOTE = {"entrance": "sign: vents breathe on a timer", "vent-gallery": "cross between vent bursts : plate : key chest",
        "forge-hall": "2 cinderlings + magma slime : key", "cinder-crossing": "fire bats : W locked, N boss",
        "smelter": "2 cinderlings mini-boss : FIRE ROD", "brazier-vault": "rod lights 4 braziers : Boss key",
        "bat-chimney": "bats over lava : key : crack N", "thorn-gate": "plate cools lava, burn thorns S : heart",
        "boss": "Cinder Golem: rod overheats the core : shard 3/3", "ashen-treasury": "bomb passage : potion + gold"}
for i, rid in enumerate(order):
    r = R[rid]
    ox, oy = GAP + r["gx"] * (RW + GAP), GAP + r["gy"] * (RH + LABEL_H + GAP)
    for y, row in enumerate(r["map"]):
        for x, ch in enumerate(row):
            base = COL["#"] if ch in "#tW" else COL["."]
            dr.rectangle([ox + x * T, oy + y * T, ox + x * T + T - 1, oy + y * T + T - 1], fill=base)
            if ch not in "#. ":
                dr.rectangle([ox + x * T + 1, oy + y * T + 1, ox + x * T + T - 2, oy + y * T + T - 2], fill=COL.get(ch, (255, 0, 255)))
    for o in r.get("objects", []):
        cx, cy = ox + o["x"] * T, oy + o["y"] * T
        dr.rectangle([cx - 10, cy - 10, cx + 10, cy + 10], outline=(255, 120, 60), width=2)
    dr.rectangle([ox - 1, oy - 1, ox + RW, oy + RH], outline=(120, 90, 90))
    dr.text((ox, oy + RH + 6), f"R{i + 1} {r['name']}", font=F, fill=(240, 230, 200))
    dr.text((ox, oy + RH + 24), NOTE[rid], font=F, fill=(190, 180, 170))
im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
im.save("docs/mockup/cinder-map.png")
print("cinder draft", im.size)
