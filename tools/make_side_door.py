"""A locked door seen edge-on for side doorways (west/east walls): the front door's planks and lock
squashed to a narrow slab between two stone jamb caps, 24x64, drawn in the wall gap."""
from PIL import Image
d = Image.open("public/assets/sprites/props/door-locked-side.png").convert("RGBA")
planks = d.crop((18, 14, 46, 60)).resize((16, 50), Image.NEAREST)      # planks + padlock, squashed
cap = d.crop((10, 0, 54, 8))                                             # a strip of arch stone
capL = cap.resize((22, 8), Image.NEAREST)
out = Image.new("RGBA", (24, 64), (0, 0, 0, 0))
out.alpha_composite(capL, (1, 0))
out.alpha_composite(planks, (4, 7))
out.alpha_composite(capL, (1, 56))
# dark edge so it reads as a slab standing in the gap
px = out.load()
for y in range(7, 57):
    px[3, y] = (30, 26, 24, 255)
    px[20, y] = (30, 26, 24, 255)
out.save("public/assets/sprites/props/door-locked-edge.png")
out.resize((96, 256), Image.NEAREST).save("docs/sprite-review/door-edge.png")
print("door-locked-edge 24x64")
