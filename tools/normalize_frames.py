"""Pad every Wren frame onto one shared canvas so all clips share a pivot.

PixelLab renders template clips (idle/walk) and rotations on the character's
native 48x48 canvas, but v3 custom clips (attack, roll, transitions) on a
68x68 canvas — the same art padded by 10px on each side. Mixing them in-engine
with a bottom-centre origin makes the feet jump. This pads the 48s to 68 so
every frame lines up; it's idempotent.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public/assets/sprites/wren"
CANVAS = 68


def normalize(path: Path) -> bool:
    im = Image.open(path).convert("RGBA")
    if im.size == (CANVAS, CANVAS):
        return False
    # PixelLab keeps the figure centred whatever the canvas, so centre-pad
    # smaller frames and centre-crop larger ones (e.g. the 72x68 interpolations).
    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    dx = (CANVAS - im.width) // 2
    dy = (CANVAS - im.height) // 2
    if dx < 0 or dy < 0:
        im = im.crop((max(0, -dx), max(0, -dy), max(0, -dx) + min(im.width, CANVAS), max(0, -dy) + min(im.height, CANVAS)))
        dx, dy = max(0, dx), max(0, dy)
    out.alpha_composite(im, (dx, dy))
    out.save(path, optimize=True)
    return True


if __name__ == "__main__":
    n = sum(normalize(p) for p in ROOT.rglob("*.png"))
    print(f"padded {n} frames to {CANVAS}x{CANVAS}")
