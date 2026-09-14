"""Download 1-direction PixelLab objects into public/assets/sprites/props/<name>.png.
Usage: python tools/fetch_objects.py name=object_id [name=object_id ...]"""
import sys, urllib.request
from PIL import Image
USER = "735334e4-86fc-4c88-aa12-4c7402143914"
UA = {"User-Agent": "curl/8.4.0"}
for arg in ([] if "--anim" in sys.argv else sys.argv[1:]):
    name, oid = arg.split("=")
    url = f"https://backblaze.pixellab.ai/file/pixellab-characters/objects/{USER}/{oid}/rotations/unknown.png"
    out = f"public/assets/sprites/props/{name}.png"
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()
    open(out, "wb").write(data)
    im = Image.open(out)
    print(name, im.size, im.mode)

# --- animations: python tools/fetch_objects.py --anim clip=object_id/anim_id:frames ...
#     lands at public/assets/sprites/props/anim/<clip>/<i>.png + a review strip in docs/sprite-review/
if __name__ == "__main__" and "--anim" in sys.argv:
    import os
    for arg in sys.argv[sys.argv.index("--anim") + 1:]:
        clip, rest = arg.split("=")
        ids, _, n = rest.partition(":")
        oid, aid = ids.split("/")
        d = f"public/assets/sprites/props/anim/{clip}"
        os.makedirs(d, exist_ok=True)
        frames = []
        for i in range(int(n)):
            url = f"https://backblaze.pixellab.ai/file/pixellab-characters/objects/{USER}/{oid}/animations/{aid}/unknown/{i}.png"
            out = f"{d}/{i}.png"
            open(out, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read())
            frames.append(Image.open(out).convert("RGBA"))
        S = 4
        w, h = frames[0].size
        sheet = Image.new("RGBA", ((w * S + 4) * len(frames) + 4, h * S + 8), (70, 80, 64, 255))
        for i, im in enumerate(frames):
            sheet.alpha_composite(im.resize((w * S, h * S), Image.NEAREST), (4 + i * (w * S + 4), 4))
        sheet.save(f"docs/sprite-review/anim-{clip}.png")
        print(clip, len(frames), "frames", frames[0].size)
