"""Download 1-direction PixelLab objects into public/assets/sprites/props/<name>.png.
Usage: python tools/fetch_objects.py name=object_id [name=object_id ...]"""
import sys, urllib.request
from PIL import Image
USER = "735334e4-86fc-4c88-aa12-4c7402143914"
UA = {"User-Agent": "curl/8.4.0"}
for arg in sys.argv[1:]:
    name, oid = arg.split("=")
    url = f"https://backblaze.pixellab.ai/file/pixellab-characters/objects/{USER}/{oid}/rotations/unknown.png"
    out = f"public/assets/sprites/props/{name}.png"
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()
    open(out, "wb").write(data)
    im = Image.open(out)
    print(name, im.size, im.mode)
