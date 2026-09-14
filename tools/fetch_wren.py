"""Download Wren's PixelLab animation frames into public/assets/sprites/wren/.

Usage: python tools/fetch_wren.py <clip> <dir>=<anim_id>[:frames] ...
  e.g. python tools/fetch_wren.py walk south=de8578e8-...:6 north=76dc...:6

Frames land at public/assets/sprites/wren/<clip>/<dir>/<i>.png and a contact
sheet is written to docs/sprite-review/wren-<clip>-sheet.png for review.
"""
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHAR = "735334e4-86fc-4c88-aa12-4c7402143914/251bdf9f-810b-43d1-a686-5ff0bf91a448"
BASE = f"https://backblaze.pixellab.ai/file/pixellab-characters/{CHAR}/animations"


def fetch(clip: str, specs: list[str]) -> None:
    out_root = ROOT / "public/assets/sprites/wren" / clip
    rows = []
    for spec in specs:
        d, rest = spec.split("=")
        anim_id, _, n = rest.partition(":")
        n = int(n or 6)
        d_dir = out_root / d
        d_dir.mkdir(parents=True, exist_ok=True)
        frames = []
        for i in range(n):
            dest = d_dir / f"{i}.png"
            req = urllib.request.Request(f"{BASE}/{anim_id}/{d}/{i}.png", headers={"User-Agent": "curl/8.0"})
            dest.write_bytes(urllib.request.urlopen(req).read())
            frames.append(Image.open(dest).convert("RGBA"))
        rows.append((d, frames))
        print(f"{clip}/{d}: {n} frames")
    # contact sheet
    S = 4
    w, h = rows[0][1][0].size
    maxn = max(len(f) for _, f in rows)
    sheet = Image.new("RGBA", (w * maxn * S, h * len(rows) * S), (30, 34, 30, 255))
    for r, (_, frames) in enumerate(rows):
        for i, im in enumerate(frames):
            sheet.alpha_composite(im.resize((w * S, h * S), Image.NEAREST), (i * w * S, r * h * S))
    wip = ROOT / "docs/sprite-review"
    wip.mkdir(parents=True, exist_ok=True)
    sheet.save(wip / f"wren-{clip}-sheet.png")


if __name__ == "__main__":
    fetch(sys.argv[1], sys.argv[2:])
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).with_name("normalize_frames.py"))], check=True)
