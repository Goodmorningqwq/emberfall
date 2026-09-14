"""Writes the five Emberfall look-mockup artboards (*.dc.html) + canvas.json."""
import json
from pathlib import Path

OUT = Path(__file__).parent

HEAD = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
  <style>
    body { margin: 0; background: #0f110f; font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif; color: #ede9df; }
    a { color: #e8763a; } a:hover { color: #f19a68; }
    .px { font-family: "Pixelify Sans", "IBM Plex Mono", monospace; }
    .panel { background: rgba(16, 19, 17, 0.88); border: 1px solid rgba(255,255,255,0.09); box-shadow: 0 12px 40px rgba(0,0,0,0.45); }
    .kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 4px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); color: #cfd2c6; font-family: "Pixelify Sans", monospace; font-size: 14px; }
    .stat { font-family: "Pixelify Sans", monospace; font-variant-numeric: tabular-nums; }
    .slot { width: 64px; height: 64px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10); display: flex; align-items: center; justify-content: center; position: relative; }
    .slot.sel { border-color: #e8763a; box-shadow: 0 0 0 2px rgba(232,118,58,0.35), inset 0 0 18px rgba(232,118,58,0.15); }
    .slot .qty { position: absolute; right: 4px; bottom: 2px; font-family: "Pixelify Sans", monospace; font-size: 16px; font-weight: 700; color: #ede9df; text-shadow: 0 1px 0 #000; }
    .chip { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 999px; background: rgba(127,184,164,0.14); color: #7fb8a4; font-weight: 600; font-size: 13px; border: 1px solid rgba(127,184,164,0.35); }
    .btn { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 18px; border-radius: 6px; font-weight: 600; font-size: 15px; letter-spacing: 0.01em; }
    .btn.primary { background: #e8763a; color: #1b0f08; }
    .btn.ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: #ede9df; }
    .btn.disabled { background: rgba(255,255,255,0.04); color: #6f756c; border: 1px solid rgba(255,255,255,0.06); }
    .eyebrow { font-family: "Pixelify Sans", monospace; font-size: 14px; letter-spacing: 0.10em; text-transform: uppercase; color: #e8763a; }
    .muted { color: #a8aa9c; }
    .hearts { display: flex; gap: 4px; }
  </style>
</helmet>
"""

TAIL = """</x-dc>
</body>
</html>
"""


# ---------- inline SVG icons (stroke-based, 24px grid) ----------
def heart(state="full", size=26):
    """state: full | half | empty. Slightly pixel-ish heart."""
    fill = "#e0483f"
    empty = "#3b3f3b"
    if state == "full":
        body = f'<path d="M12 21 3 12.5V6l3-3h3l3 3 3-3h3l3 3v6.5z" fill="{fill}"/>'
    elif state == "half":
        body = (f'<path d="M12 21 3 12.5V6l3-3h3l3 3 3-3h3l3 3v6.5z" fill="{empty}"/>'
                f'<path d="M12 21 3 12.5V6l3-3h3l3 3v15z" fill="{fill}"/>')
    else:
        body = f'<path d="M12 21 3 12.5V6l3-3h3l3 3 3-3h3l3 3v6.5z" fill="{empty}"/>'
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" aria-hidden="true">'
            f'<path d="M12 21 3 12.5V6l3-3h3l3 3 3-3h3l3 3v6.5z" fill="none" stroke="#1a0c0a" stroke-width="2" stroke-linejoin="round"/>{body}</svg>')


def icon(name, size=24, color="#ede9df"):
    s = f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    paths = {
        "coin": '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5h3.5a1.5 1.5 0 0 1 0 3H9.5"/>',
        "key": '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M18 12v3M15 12v2"/>',
        "potion": '<path d="M10 3h4M11 3v4.5L6.5 14a4.5 4.5 0 0 0 4 6.5h3a4.5 4.5 0 0 0 4-6.5L13 7.5V3"/><path d="M8 15h8" />',
        "bomb": '<circle cx="11" cy="14" r="6.5"/><path d="M14.5 9.5 17 7M17 7l1.5-1.5M18.5 4.5l1 1"/>',
        "boomerang": '<path d="M4 6c5-1 10 1 13 5 1 2 2 5 2 8-3-1-6-3-8-6C9 11 6 9 4 6z"/>',
        "grapple": '<path d="M4 4l9 9M13 13a4 4 0 1 0 5.7 5.7"/><path d="M13 13l6-1-1 6"/>',
        "shard": '<path d="M12 2l5 8-5 12-5-12z"/><path d="M7 10h10"/>',
        "sword": '<path d="M14.5 4.5 20 3l-1.5 5.5L8 19l-3-3z"/><path d="M5 16l-2 2M8 19l-2 2M12 12l3 3"/>',
        "shield": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
        "map": '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
        "chest": '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 12h18M12 12v3"/>',
        "gear": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
        "play": '<path d="M7 4l13 8-13 8z"/>',
        "plus": '<path d="M12 5v14M5 12h14"/>',
        "close": '<path d="M6 6l12 12M18 6 6 18"/>',
        "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
        "skull": '<path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4.3 3 5.5V19h8v-3.5c1.8-1.2 3-3 3-5.5a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="10.5" r="1.2"/><circle cx="14.5" cy="10.5" r="1.2"/>',
    }
    return s + paths[name] + "</svg>"


def hud(hearts_states, gold, keys, tool="boomerang", tool_name="Boomerang"):
    hearts_html = "".join(heart(s) for s in hearts_states)
    return f"""
  <!-- HUD: top-left vitals -->
  <div style="position:absolute; left:28px; top:24px; display:flex; flex-direction:column; gap:10px;">
    <div class="hearts">{hearts_html}</div>
    <div style="display:flex; gap:14px; align-items:center;">
      <div style="display:flex; align-items:center; gap:6px;">{icon("coin", 20, "#e2b24a")}<span class="stat" style="font-size:20px; color:#e2b24a;">{gold}</span></div>
      <div style="display:flex; align-items:center; gap:6px;">{icon("key", 20, "#cfd2c6")}<span class="stat" style="font-size:20px; color:#cfd2c6;">×{keys}</span></div>
    </div>
  </div>
  <!-- HUD: bottom-left tool + consumables -->
  <div style="position:absolute; left:28px; bottom:24px; display:flex; gap:14px; align-items:flex-end;">
    <div style="display:flex; flex-direction:column; gap:6px; align-items:center;">
      <div class="slot sel" style="width:72px; height:72px;">{icon(tool, 34, "#ede9df")}<span class="kbd" style="position:absolute; left:-6px; top:-6px;">L</span></div>
      <span class="px" style="font-size:13px; color:#cfd2c6;">{tool_name}</span>
    </div>
    <div class="slot" style="width:56px; height:56px;">{icon("potion", 26, "#cfd2c6")}<span class="qty">×2</span><span class="kbd" style="position:absolute; left:-6px; top:-6px;">1</span></div>
    <div class="slot" style="width:56px; height:56px;">{icon("bomb", 26, "#cfd2c6")}<span class="qty">×3</span><span class="kbd" style="position:absolute; left:-6px; top:-6px;">2</span></div>
  </div>
"""


def minimap():
    # 5x3 grid of rooms, visited/current/unknown
    cells = []
    layout = [
        ["u", "v", "v", "u", "u"],
        ["u", "v", "c", "v", "b"],
        ["u", "u", "v", "u", "u"],
    ]
    for r in layout:
        for c in r:
            bg = {"u": "rgba(255,255,255,0.04)", "v": "rgba(255,255,255,0.22)", "c": "#e8763a", "b": "rgba(224,72,63,0.55)"}[c]
            extra = 'border:1px solid rgba(255,255,255,0.10);' if c == "u" else ''
            inner = icon("skull", 12, "#ede9df") if c == "b" else ""
            cells.append(f'<div style="width:22px; height:16px; border-radius:2px; background:{bg}; {extra} display:flex; align-items:center; justify-content:center;">{inner}</div>')
    return f"""
  <div class="panel" style="position:absolute; right:28px; top:24px; padding:10px 12px; border-radius:8px; display:flex; flex-direction:column; gap:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
      <span class="eyebrow">Whisperwood Hollow</span>
      <span class="kbd">M</span>
    </div>
    <div style="display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:3px;">{''.join(cells)}</div>
  </div>
"""


def scene(img, dim=0.0, blur=0):
    f = []
    if blur:
        f.append(f"blur({blur}px)")
    filt = f' filter: {" ".join(f)};' if f else ""
    overlay = f'<div style="position:absolute; inset:0; background:rgba(8,10,8,{dim});"></div>' if dim else ""
    return f'<img src="{img}" alt="" style="position:absolute; inset:0; width:1280px; height:720px; image-rendering: pixelated;{filt}">{overlay}'


def wrap(inner):
    return HEAD + f'<div style="position:relative; width:1280px; height:720px; overflow:hidden; background:#0f110f;">\n{inner}\n</div>\n' + TAIL


# ---------- 1. Title ----------
title = wrap(f"""
  {scene("room.png", dim=0.0)}
  <div style="position:absolute; inset:0; background: linear-gradient(90deg, rgba(8,10,8,0.92) 0%, rgba(8,10,8,0.78) 42%, rgba(8,10,8,0.25) 100%);"></div>
  <div style="position:absolute; inset:0; box-shadow: inset 0 0 180px rgba(0,0,0,0.75);"></div>
  <div style="position:absolute; left:96px; top:150px; display:flex; flex-direction:column; gap:6px;">
    <span class="eyebrow">A top-down action RPG</span>
    <div class="px" style="font-size:112px; font-weight:700; line-height:0.95; letter-spacing:0.02em; color:#ede9df; text-shadow: 0 4px 0 #7a2e10, 0 10px 30px rgba(232,118,58,0.35);">EMBER<span style="color:#e8763a;">FALL</span></div>
    <span class="muted" style="font-size:17px; max-width:44ch; margin-top:6px;">Three shards. Three dungeons. Bring the flame home.</span>
  </div>
  <div style="position:absolute; left:96px; bottom:96px; display:flex; flex-direction:column; gap:10px; width:380px;">
    <div class="panel" style="border-radius:8px; padding:14px 16px; display:flex; align-items:center; gap:14px; border-color:#e8763a;">
      <div style="width:48px; height:48px; border-radius:6px; overflow:hidden; background:#3c4a55; flex-shrink:0;"><img src="hero_portrait.png" alt="" style="width:48px; height:48px; image-rendering: pixelated;"></div>
      <div style="display:flex; flex-direction:column; gap:4px; flex-grow:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:600; font-size:16px;">Continue</span><span class="kbd">Enter</span></div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="hearts">{heart("full", 16)}{heart("full", 16)}{heart("full", 16)}{heart("half", 16)}</div>
          <span class="muted" style="font-size:13px; display:inline-flex; align-items:center; gap:4px;">{icon("shard", 14, "#e8763a")} 1 / 3</span>
          <span class="muted" style="font-size:13px;">1h 12m</span>
        </div>
      </div>
    </div>
    <div class="btn ghost" style="justify-content:space-between;"><span>New game</span><span class="muted" style="font-size:13px;">Slot 2 · empty</span></div>
    <div class="btn ghost" style="justify-content:space-between;"><span style="display:inline-flex; align-items:center; gap:8px;">{icon("gear", 18, "#cfd2c6")} Settings</span></div>
  </div>
  <div style="position:absolute; right:32px; bottom:24px; display:flex; gap:14px; align-items:center;" class="muted">
    <span style="font-size:13px;"><span class="kbd">↑</span> <span class="kbd">↓</span> select</span>
    <span style="font-size:13px;"><span class="kbd">Enter</span> confirm</span>
    <span class="px" style="font-size:14px; opacity:0.6;">v0.1 prototype</span>
  </div>
""")

# ---------- 2. Gameplay (Main) ----------
main = wrap(f"""
  {scene("room.png")}
  <!-- combat feedback: damage number + hit flash near the slime at (~780,395) -->
  <div class="px" style="position:absolute; left:806px; top:352px; font-size:30px; font-weight:700; color:#fff2b0; text-shadow: 0 3px 0 #7a2e10, 0 0 12px rgba(232,118,58,0.6); letter-spacing:0.02em;">-2</div>
  <!-- dungeon room name card, mid-fade -->
  <div style="position:absolute; left:0; right:0; top:560px; display:flex; justify-content:center; pointer-events:none;">
    <div style="display:flex; flex-direction:column; align-items:center; gap:2px; opacity:0.85;">
      <span class="eyebrow">Whisperwood Hollow</span>
      <span class="px" style="font-size:22px; color:#ede9df; text-shadow: 0 2px 0 rgba(0,0,0,0.6);">Mossy Antechamber</span>
    </div>
  </div>
  {hud(["full", "full", "full", "half"], 142, 1)}
  {minimap()}
  <!-- contextual hint near the chest -->
  <div class="panel" style="position:absolute; left:1000px; top:170px; padding:6px 10px; border-radius:6px; display:flex; align-items:center; gap:8px; font-size:13px;">
    <span class="kbd">E</span><span>Open</span>
  </div>
""")

# ---------- 3. Inventory ----------
def inv_slot(name=None, color="#ede9df", qty=None, sel=False):
    cls = "slot sel" if sel else "slot"
    inner = icon(name, 30, color) if name else ""
    q = f'<span class="qty">{qty}</span>' if qty else ""
    return f'<div class="{cls}">{inner}{q}</div>'


slots = [
    inv_slot("boomerang", sel=True), inv_slot("potion", "#cfd2c6", 2), inv_slot("bomb", "#cfd2c6", 3), inv_slot("key", "#cfd2c6", 1), inv_slot("shard", "#e8763a", 1),
    inv_slot("map", "#cfd2c6"), inv_slot(), inv_slot(), inv_slot(), inv_slot(),
    inv_slot(), inv_slot(), inv_slot(), inv_slot(), inv_slot(),
]
inventory = wrap(f"""
  {scene("room.png", dim=0.55, blur=3)}
  <!-- left: character card -->
  <div class="panel" style="position:absolute; left:120px; top:90px; width:300px; border-radius:10px; padding:20px; display:flex; flex-direction:column; gap:16px;">
    <div style="display:flex; gap:14px; align-items:center;">
      <div style="width:72px; height:72px; border-radius:8px; overflow:hidden; background:#3c4a55; flex-shrink:0;"><img src="hero_portrait.png" alt="" style="width:72px; height:72px; image-rendering: pixelated;"></div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <span class="px" style="font-size:22px;">Warden</span>
        <span class="muted" style="font-size:13px;">Emberfall · Day 3</span>
      </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;"><span class="muted" style="font-size:13px;">Health</span><div class="hearts">{heart("full", 18)}{heart("full", 18)}{heart("full", 18)}{heart("half", 18)}</div></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span class="muted" style="font-size:13px;">Sword</span><span style="display:inline-flex; align-items:center; gap:6px; font-size:14px;">{icon("sword", 16, "#cfd2c6")} Iron · <span class="stat">2</span> dmg</span></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span class="muted" style="font-size:13px;">Armor</span><span style="display:inline-flex; align-items:center; gap:6px; font-size:14px;">{icon("shield", 16, "#cfd2c6")} Leather</span></div>
      <div style="display:flex; justify-content:space-between; align-items:center;"><span class="muted" style="font-size:13px;">Shards</span><span style="display:inline-flex; align-items:center; gap:6px; font-size:14px;">{icon("shard", 16, "#e8763a")} <span class="stat">1</span> / 3</span></div>
    </div>
  </div>
  <!-- right: inventory panel (slid in) -->
  <div class="panel" style="position:absolute; right:0; top:0; bottom:0; width:520px; border-radius:0; border-right:0; padding:28px 32px; display:flex; flex-direction:column; gap:20px;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span class="px" style="font-size:26px;">Inventory</span>
      <div style="display:flex; align-items:center; gap:8px;"><span class="kbd">Tab</span><span class="muted" style="font-size:13px;">close</span></div>
    </div>
    <div style="display:flex; gap:6px;">
      <div style="padding:6px 12px; border-radius:6px; background:rgba(232,118,58,0.16); color:#e8763a; font-weight:600; font-size:14px;">Items</div>
      <div class="muted" style="padding:6px 12px; border-radius:6px; font-size:14px;">Tools</div>
      <div class="muted" style="padding:6px 12px; border-radius:6px; font-size:14px;">Equipment</div>
    </div>
    <div style="display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:10px;">{''.join(slots)}</div>
    <!-- selected item detail -->
    <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:18px; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="slot" style="width:48px; height:48px;">{icon("boomerang", 26)}</div>
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="font-weight:600; font-size:17px;">Boomerang</span>
          <span class="eyebrow">Dungeon tool · Whisperwood Hollow</span>
        </div>
      </div>
      <p style="margin:0; font-size:14.5px; line-height:1.5; color:#cfd2c6;">Stuns enemies on hit and fetches distant items. Returns to you on its own.</p>
      <div style="display:flex; gap:10px; margin-top:4px;">
        <div class="chip">{icon("boomerang", 14, "#7fb8a4")} Equipped · <span class="kbd" style="height:18px; min-width:18px; font-size:13px;">L</span></div>
        <div class="btn ghost" style="height:38px; font-size:14px;">Unequip</div>
      </div>
    </div>
  </div>
""")

# ---------- 4. Dialogue ----------
dialogue = wrap(f"""
  {scene("hub.png", dim=0.18)}
  <div class="panel" style="position:absolute; left:120px; right:120px; bottom:36px; border-radius:12px; padding:18px 22px; display:flex; gap:20px; align-items:flex-start;">
    <div style="width:88px; height:88px; border-radius:8px; overflow:hidden; background:#4a4650; flex-shrink:0; border:1px solid rgba(255,255,255,0.10);"><img src="elder_portrait.png" alt="" style="width:88px; height:88px; image-rendering: pixelated;"></div>
    <div style="display:flex; flex-direction:column; gap:10px; flex-grow:1;">
      <span style="font-size:18px; font-weight:600; color:#e8763a;">Elder Maren</span>
      <p style="margin:0; font-size:18px; line-height:1.45; max-width:62ch; color:#ede9df;">The first shard fell into Whisperwood, past the old gate. The roots have grown over it since. Take this, and mind the spores<span style="display:inline-block; width:10px; height:20px; background:#e8763a; margin-left:4px; vertical-align:-3px;"></span></p>
      <div style="display:flex; gap:8px; margin-top:2px; flex-wrap:wrap;">
        <div class="btn ghost" style="height:36px; font-size:14px; border-color:#e8763a; background:rgba(232,118,58,0.10);">{icon("arrow", 14, "#e8763a")} Where exactly is the gate?</div>
        <div class="btn ghost" style="height:36px; font-size:14px;">Tell me about the Ember.</div>
        <div class="btn ghost" style="height:36px; font-size:14px;">I'll be going.</div>
      </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; align-self:flex-end;" class="muted">
      <span style="font-size:13px;"><span class="kbd">E</span> next</span>
      <span style="font-size:13px;"><span class="kbd">Esc</span> skip</span>
    </div>
  </div>
""")

# ---------- 5. Shop ----------
def shop_card(name, icn, price, delta, state):
    # state: owned | buy | poor
    if state == "owned":
        foot = '<div class="btn disabled" style="height:38px; font-size:14px;">Owned</div>'
        border = "rgba(255,255,255,0.08)"
    elif state == "buy":
        foot = f'<div class="btn primary" style="height:38px; font-size:14px;">Buy · {icon("coin", 16, "#1b0f08")} {price}</div>'
        border = "#e8763a"
    else:
        foot = f'<div class="btn disabled" style="height:38px; font-size:14px;">{icon("coin", 16, "#6f756c")} {price} · need {price - 142} more</div>'
        border = "rgba(255,255,255,0.08)"
    dim = ""
    return f"""
      <div style="border-radius:10px; border:1px solid {border}; background:rgba(255,255,255,0.03); padding:16px; display:flex; flex-direction:column; gap:12px;{dim}">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="slot" style="width:52px; height:52px;">{icon(icn, 28)}</div>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-weight:600; font-size:16px;">{name}</span>
            <span style="font-size:13px; color:#7fb8a4;">{delta}</span>
          </div>
        </div>
        {foot}
      </div>"""


shop = wrap(f"""
  {scene("hub.png", dim=0.6, blur=3)}
  <div class="panel" style="position:absolute; left:160px; right:160px; top:90px; bottom:90px; border-radius:12px; padding:28px 32px; display:flex; flex-direction:column; gap:22px;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span class="eyebrow">Blacksmith</span>
        <span class="px" style="font-size:28px;">Tomas' Forge</span>
      </div>
      <div style="display:flex; align-items:center; gap:18px;">
        <div style="display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:8px; background:rgba(226,178,74,0.10); border:1px solid rgba(226,178,74,0.35);">{icon("coin", 20, "#e2b24a")}<span class="stat" style="font-size:22px; color:#e2b24a;">142</span></div>
        <div style="display:flex; align-items:center; gap:8px;"><span class="kbd">Esc</span><span class="muted" style="font-size:13px;">leave</span></div>
      </div>
    </div>
    <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:14px;">
      {shop_card("Iron Sword", "sword", 0, "2 dmg · equipped", "owned")}
      {shop_card("Steel Sword", "sword", 120, "+2 dmg  →  4 dmg", "buy")}
      {shop_card("Ember Blade", "sword", 340, "+4 dmg · needs 2 shards", "poor")}
      {shop_card("Leather Armor", "shield", 0, "equipped", "owned")}
      {shop_card("Chain Armor", "shield", 220, "−½ heart per hit", "poor")}
      {shop_card("Heart Container", "plus", 300, "+1 max heart", "poor")}
    </div>
    <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end;">
      <p class="muted" style="margin:0; font-size:14px; max-width:60ch; line-height:1.5;">"Steel holds an edge the iron never will. Bring me a shard and I'll show you what a real forge can do."</p>
      <span class="muted" style="font-size:13px;"><span class="kbd">←</span> <span class="kbd">→</span> browse · <span class="kbd">E</span> buy</span>
    </div>
  </div>
""")

files = {
    "Title.dc.html": title,
    "Main.dc.html": main,
    "Inventory.dc.html": inventory,
    "Dialogue.dc.html": dialogue,
    "Shop.dc.html": shop,
}
for name, content in files.items():
    (OUT / name).write_text(content, encoding="utf-8")

canvas = {
    "artboards": [
        {"file": "Title.dc.html", "title": "Title screen", "x": 0, "y": 0, "w": 1280, "h": 720},
        {"file": "Main.dc.html", "title": "Gameplay + HUD", "x": 1400, "y": 0, "w": 1280, "h": 720},
        {"file": "Inventory.dc.html", "title": "Inventory open", "x": 2800, "y": 0, "w": 1280, "h": 720},
        {"file": "Dialogue.dc.html", "title": "Dialogue", "x": 0, "y": 900, "w": 1280, "h": 720},
        {"file": "Shop.dc.html", "title": "Blacksmith shop", "x": 1400, "y": 900, "w": 1280, "h": 720},
    ],
    "annotations": [
        {"id": "placeholder-art", "x": 2800, "y": 900, "w": 420,
         "text": "Placeholder pixel art.\nRoom, town, hero, slime and portraits here are drawn procedurally so the UI has a scene under it. PixelLab-generated sprites and tilesets replace them in the pre-M0 demo.\n\nWhat this mockup is deciding: HUD layout, panel style, type pairing (Pixelify Sans display + IBM Plex Sans UI), the ember/moss/gold accents, and how menus sit over the game."},
    ],
    "launch": {"view": "canvas"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2), encoding="utf-8")
print("wrote", ", ".join(files), "canvas.json")
