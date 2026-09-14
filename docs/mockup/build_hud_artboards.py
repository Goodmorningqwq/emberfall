"""HUD-scale explorations on top of the real rendered game frame.
Writes HudAnchored / HudBar / HudFollow artboards and extends canvas.json with a
second page. Run build_artboards.py first (this imports its helpers).
"""
import json
from pathlib import Path

from build_artboards import HEAD, TAIL, heart, icon, minimap

OUT = Path(__file__).parent

BG = '<img src="game-frame.png" alt="" style="position:absolute; inset:0; width:1280px; height:720px; image-rendering: pixelated;">'


def wrap(inner):
    return HEAD + f'<div style="position:relative; width:1280px; height:720px; overflow:hidden; background:#0f110f;">\n{BG}\n{inner}\n</div>\n' + TAIL


def hotbar(size=60, y_css="bottom:22px", x_css="left:50%; transform:translateX(-50%)"):
    slot = lambda inner, key, qty=None, sel=False: (
        f'<div class="slot{" sel" if sel else ""}" style="width:{size}px; height:{size}px;">{inner}'
        f'{f"<span class=qty>×{qty}</span>" if qty else ""}'
        f'<span class="kbd" style="position:absolute; left:-6px; top:-6px;">{key}</span></div>'
    )
    return f"""
  <div class="panel" style="position:absolute; {y_css}; {x_css}; display:flex; gap:10px; padding:10px 12px; border-radius:12px; align-items:center;">
    {slot(icon("boomerang", 30), "RMB", sel=True)}
    <div style="width:1px; height:{size - 16}px; background:rgba(255,255,255,0.12);"></div>
    {slot(icon("potion", 28, "#cfd2c6"), "1", 2)}
    {slot(icon("bomb", 28, "#cfd2c6"), "2", 3)}
    {slot("", "3")}
    <div style="width:1px; height:{size - 16}px; background:rgba(255,255,255,0.12);"></div>
    {slot(icon("chest", 28, "#e2b24a"), "Tab")}
  </div>"""


def vitals(scale=1.0, extra_style=""):
    hs = int(36 * scale)
    fs = int(24 * scale)
    return f"""
  <div style="display:flex; flex-direction:column; gap:{int(8 * scale)}px; {extra_style}">
    <div class="hearts" style="gap:6px;">{heart("full", hs)}{heart("full", hs)}{heart("half", hs)}{heart("empty", hs)}</div>
    <div style="display:flex; gap:18px; align-items:center;">
      <span class="stat" style="display:inline-flex; align-items:center; gap:8px; font-size:{fs}px; font-weight:700; color:#e2b24a; text-shadow:0 2px 0 rgba(0,0,0,.6);">{icon("coin", int(fs * 0.95), "#e2b24a")}142</span>
      <span class="stat" style="display:inline-flex; align-items:center; gap:8px; font-size:{fs}px; font-weight:700; color:#ede9df; text-shadow:0 2px 0 rgba(0,0,0,.6);">{icon("key", int(fs * 0.95), "#cfd2c6")}×1</span>
    </div>
  </div>"""


def hints(style):
    return f"""
  <div class="panel" style="position:absolute; {style} display:flex; gap:14px; align-items:center; padding:8px 12px; border-radius:8px; color:#a8aa9c; font-size:14px;">
    <span><span class="kbd">WASD</span> move</span>
    <span><span class="kbd">LMB</span> attack</span>
    <span><span class="kbd">Shift</span> dash · hold to sprint</span>
  </div>"""


# ---- A: anchored to the game frame, scaled up, corner scrim, hotbar bottom-centre
hud_a = wrap(f"""
  <div style="position:absolute; left:0; top:0; width:420px; height:200px; background: radial-gradient(ellipse at 0% 0%, rgba(8,10,8,0.78) 0%, rgba(8,10,8,0.0) 70%);"></div>
  <div style="position:absolute; left:28px; top:24px;">{vitals(1.0)}</div>
  {minimap()}
  {hotbar()}
  {hints("right:28px; bottom:30px;")}
  <div class="panel" style="position:absolute; left:28px; bottom:30px; padding:8px 12px; border-radius:8px; font-size:13px; color:#a8aa9c; max-width:34ch; line-height:1.4;">
    <b style="color:#ede9df;">A · Anchored &amp; scaled.</b> Everything sits inside the game frame, hearts 36px, numbers 24px bold on a corner scrim. Hints fade after 5 s.
  </div>
""")

# ---- B: one bottom bar carries vitals + hotbar + currency
hud_b = wrap(f"""
  {minimap()}
  <div class="panel" style="position:absolute; left:0; right:0; bottom:0; height:96px; border-radius:0; border-left:0; border-right:0; border-bottom:0; display:flex; align-items:center; justify-content:space-between; padding:0 32px; background:linear-gradient(180deg, rgba(16,19,17,0.55), rgba(16,19,17,0.94));">
    {vitals(0.95)}
    {hotbar(size=56, y_css="bottom:16px")}
    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; color:#a8aa9c; font-size:13px;">
      <span><span class="kbd">LMB</span> attack</span>
      <span><span class="kbd">Shift</span> dash · hold sprint</span>
    </div>
  </div>
  <div class="panel" style="position:absolute; left:28px; top:24px; padding:8px 12px; border-radius:8px; font-size:13px; color:#a8aa9c; max-width:34ch; line-height:1.4;">
    <b style="color:#ede9df;">B · Bottom bar.</b> One strip owns all status: hearts, hotbar, hints. Frees the corners; costs ~1 tile row of view.
  </div>
""")

# ---- C: vitals follow the player; corners empty
hud_c = wrap(f"""
  <div style="position:absolute; left:{608 - 40}px; top:{292 - 52}px; display:flex; flex-direction:column; align-items:center; gap:3px;">
    <div class="hearts" style="gap:3px;">{heart("full", 20)}{heart("full", 20)}{heart("half", 20)}{heart("empty", 20)}</div>
  </div>
  <div style="position:absolute; right:28px; top:24px; display:flex; gap:18px; align-items:center;">
    <span class="stat" style="display:inline-flex; align-items:center; gap:8px; font-size:22px; font-weight:700; color:#e2b24a; text-shadow:0 2px 0 rgba(0,0,0,.6);">{icon("coin", 20, "#e2b24a")}142</span>
    <span class="stat" style="display:inline-flex; align-items:center; gap:8px; font-size:22px; font-weight:700; color:#ede9df; text-shadow:0 2px 0 rgba(0,0,0,.6);">{icon("key", 20, "#cfd2c6")}×1</span>
  </div>
  {hotbar()}
  <div class="panel" style="position:absolute; left:28px; top:24px; padding:8px 12px; border-radius:8px; font-size:13px; color:#a8aa9c; max-width:34ch; line-height:1.4;">
    <b style="color:#ede9df;">C · Hearts follow Wren.</b> Health lives where your eyes already are; hotbar bottom-centre; gold/keys top-right. Cleanest, but hearts can be hidden by walls and it's unusual for the genre.
  </div>
""")

files = {"HudAnchored.dc.html": hud_a, "HudBar.dc.html": hud_b, "HudFollow.dc.html": hud_c}
for name, content in files.items():
    (OUT / name).write_text(content, encoding="utf-8")

canvas = json.loads((OUT / "canvas.json").read_text(encoding="utf-8"))
canvas["pages"] = [{"id": "page-1", "name": "Screens"}, {"id": "page-2", "name": "HUD scale"}]
for a in canvas["artboards"]:
    a.setdefault("page", "page-1")
for n in canvas.get("annotations", []):
    n.setdefault("page", "page-1")
canvas["artboards"] = [a for a in canvas["artboards"] if a["file"] not in files] + [
    {"file": "HudAnchored.dc.html", "title": "A · Anchored & scaled (recommended)", "x": 0, "y": 0, "w": 1280, "h": 720, "page": "page-2"},
    {"file": "HudBar.dc.html", "title": "B · Bottom bar", "x": 1400, "y": 0, "w": 1280, "h": 720, "page": "page-2"},
    {"file": "HudFollow.dc.html", "title": "C · Hearts follow Wren", "x": 0, "y": 900, "w": 1280, "h": 720, "page": "page-2"},
]
canvas["annotations"] = [n for n in canvas.get("annotations", []) if n["id"] != "hud-brief"] + [
    {"id": "hud-brief", "x": 1400, "y": 900, "w": 460, "page": "page-2",
     "text": "Problem: the HUD was anchored to the browser window, not the game frame, so hearts and hints sat in the letterbox far from the action, at 26px.\n\nAll three options: anchor inside the game frame, hearts >= 36px, numbers 24px bold, hotbar with tool + 3 consumables + bag (Tab opens the Inventory screen on page 1).\n\nBackground is the real rendered game frame (tools/render_room.py)."},
]
canvas["launch"] = {"view": "canvas", "page": "page-2"}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2), encoding="utf-8")
print("wrote", ", ".join(files), "+ canvas.json page-2")
