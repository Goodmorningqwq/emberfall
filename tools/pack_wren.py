"""Pack every Wren frame (assets/sprites/wren/**) into one atlas: wren-atlas.png + wren-atlas.json
(Phaser JSON-hash). Frame names match heroAssets' keys: wren-<folder>-<dir>-<i> and wren-rot-<dir>.
One request instead of ~250; run again after fetching new clips."""
import os, json, math
from PIL import Image

ROOT = "public/assets/sprites/wren"
frames = []
for folder in sorted(os.listdir(ROOT)):
    fp = os.path.join(ROOT, folder)
    if not os.path.isdir(fp):
        continue
    if folder == "rotations":
        for f in sorted(os.listdir(fp)):
            frames.append((f"wren-rot-{f[:-4]}", os.path.join(fp, f)))
        continue
    for d in sorted(os.listdir(fp)):
        dp = os.path.join(fp, d)
        if not os.path.isdir(dp):
            continue
        for f in sorted(os.listdir(dp), key=lambda n: int(n[:-4])):
            frames.append((f"wren-{folder}-{d}-{f[:-4]}", os.path.join(dp, f)))

imgs = [(name, Image.open(p).convert("RGBA")) for name, p in frames]
w = max(i.width for _, i in imgs)
h = max(i.height for _, i in imgs)
cols = int(math.ceil(math.sqrt(len(imgs))))
rows = int(math.ceil(len(imgs) / cols))
sheet = Image.new("RGBA", (cols * w, rows * h), (0, 0, 0, 0))
data = {"frames": {}, "meta": {"app": "tools/pack_wren.py", "size": {"w": cols * w, "h": rows * h}, "scale": "1"}}
for i, (name, im) in enumerate(imgs):
    x, y = (i % cols) * w, (i // cols) * h
    # keep every frame on the shared canvas so origins/feet stay put
    sheet.alpha_composite(im, (x + (w - im.width) // 2, y + (h - im.height) // 2))
    data["frames"][name] = {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False, "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
sheet.save("public/assets/sprites/wren-atlas.png", optimize=True)
json.dump(data, open("public/assets/sprites/wren-atlas.json", "w"), separators=(",", ":"))
print(len(imgs), "frames ->", sheet.size, os.path.getsize("public/assets/sprites/wren-atlas.png") // 1024, "KB")
