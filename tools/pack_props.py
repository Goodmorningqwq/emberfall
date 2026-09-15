"""Pack the prop sprites (assets/sprites/props/*.png, not the anim clips) into one atlas:
props-atlas.png + props-atlas.json (Phaser JSON-hash, frame name = file stem). Frames keep their
own sizes (no shared canvas) so origins are unchanged. Run after fetching a new prop."""
import os, json
from PIL import Image

ROOT = "public/assets/sprites/props"
names = sorted(f[:-4] for f in os.listdir(ROOT) if f.endswith(".png"))
imgs = [(n, Image.open(os.path.join(ROOT, n + ".png")).convert("RGBA")) for n in names]
# simple shelf packing, tallest first per row, 2px gutters so bilinear sampling never bleeds
imgs.sort(key=lambda t: (-t[1].height, t[0]))
W = 1024
x = y = row_h = 0
places = {}
for n, im in imgs:
    if x + im.width + 2 > W:
        x = 0
        y += row_h + 2
        row_h = 0
    places[n] = (x, y)
    x += im.width + 2
    row_h = max(row_h, im.height)
H = y + row_h
sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
data = {"frames": {}, "meta": {"app": "tools/pack_props.py", "size": {"w": W, "h": H}, "scale": "1"}}
for n, im in imgs:
    px, py = places[n]
    sheet.alpha_composite(im, (px, py))
    data["frames"][n] = {"frame": {"x": px, "y": py, "w": im.width, "h": im.height}, "rotated": False, "trimmed": False, "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height}, "sourceSize": {"w": im.width, "h": im.height}}
sheet.save("public/assets/sprites/props-atlas.png", optimize=True)
json.dump(data, open("public/assets/sprites/props-atlas.json", "w"), separators=(",", ":"))
print(len(imgs), "props ->", sheet.size, os.path.getsize("public/assets/sprites/props-atlas.png") // 1024, "KB")
