"""Side-on town gate for roads that run east-west (the crypt gate): two full pillars cut from the
front-facing gate sprite, stacked top and bottom with a 32px road gap between, sign on the top post.
Canvas 64x132; the hub draws it 34px above the gate anchor so the gap sits on the road rows."""
from PIL import Image
g = Image.open("public/assets/sprites/props/gate.png").convert("RGBA")
post = g.crop((0, 12, 14, 62))          # the left pillar: stone cap, moss, foot (14x50)
sign = g.crop((14, 15, 41, 29))         # the hanging wooden sign, 27x14
out = Image.new("RGBA", (64, 132), (0, 0, 0, 0))
out.alpha_composite(post, (34, 0))      # top post: y 0..50
out.alpha_composite(post, (34, 82))     # bottom post: y 82..132, road gap y 50..82
out.alpha_composite(sign, (44, 4))      # sign hangs off the top post's east face
out.save("public/assets/sprites/props/gate-side.png")
out.resize((256, 528), Image.NEAREST).save("docs/sprite-review/gate-side.png")
print("gate-side written")
