"""Builds the M2 UX-pass artboards (HUD relayout, tutorial prompts, interactions,
signs, boss text) over real game frames captured from the running game.
Every artboard is 1280x768 = the 640x384 game frame at 2x, so 1 game px = 2 css px
and the pixel UI renders at --s = 2, exactly like the live HUD on a 1280-wide window.
Run from the repo root: python docs/mockup/ux/build.py
"""
import json
from pathlib import Path

OUT = Path(__file__).parent
FONT = (OUT / "font.b64").read_text()
S = 2  # UI scale


def px(n):
    return f"{n * S}px"


HEAD = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    @font-face {{ font-family: "Emberfall Pixel"; src: url(data:font/ttf;base64,{FONT}) format("truetype"); font-weight: 700; }}
    body {{ margin: 0; background: #0f110f; }}
    .f {{ font-family: "Emberfall Pixel", monospace; -webkit-font-smoothing: none; color: #ede9df; line-height: 1; }}
    .px {{ image-rendering: pixelated; }}
    a {{ color: #e8763a; }} a:hover {{ color: #f2a06a; }}
    @keyframes blink {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: .35; }} }}
    @keyframes bob {{ 0%, 100% {{ transform: translateY(0); }} 50% {{ transform: translateY(-{S * 2}px); }} }}
    @keyframes ring {{ 0% {{ transform: scale(.85); opacity: .9; }} 100% {{ transform: scale(1.15); opacity: 0; }} }}
  </style>
</helmet>
"""
TAIL = "</x-dc>\n</body>\n</html>\n"


NOTES = []


def frame(bg, inner, note=None):
    n = ""
    if note:
        NOTES.append(note.replace("<b style=\"color:#e8763a\">", "").replace("</b>", "").replace("<i>", "").replace("</i>", ""))
    return (
        HEAD
        + f'<div style="position:relative; width:1280px; height:768px; overflow:hidden; background:#0f110f;">\n'
        + f'<img class="px" src="{bg}" alt="" style="position:absolute; left:0; top:0; width:1280px; height:768px;">\n'
        + inner
        + n
        + "\n</div>\n"
        + TAIL
    )


# ---------------------------------------------------------------- atoms

def panel(inner, style="", slice_="panel"):
    b = 10 if slice_ == "panel" else 5
    return f'<div class="px" style="border:{px(b)} solid transparent; border-image:url(./ui-{slice_}.png) {b} fill stretch; {style}">{inner}</div>'


def kbd(label, big=False):
    fs = 32 if big else 16
    return f'<span class="f" style="display:inline-flex; align-items:center; justify-content:center; height:{px(14 if big else 12)}; padding:0 {px(3)}; background:#0f120f; border:{S}px solid #5b665b; color:#cfd2c6; font-size:{fs}px; white-space:nowrap;">{label}</span>'


def heart(state):
    pos = {"full": 0, "half": -16, "empty": -32}[state]
    return f'<span class="px" style="display:inline-block; width:{px(16)}; height:{px(16)}; background:url(./ui-hearts.png) no-repeat {px(pos)} 0; background-size:{px(48)} {px(16)};"></span>'


def icon(name, size=24):
    return f'<img class="px" src="icon-{name}.png" alt="" style="width:{px(size)}; height:{px(size)}; display:block;">'


def text(t, size=1, color="#ede9df", style=""):
    return f'<span class="f" style="font-size:{16 * size}px; color:{color}; {style}">{t}</span>'


def vitals(hearts=("full", "full", "half", "empty"), gold=21, keys=1, style=""):
    hs = "".join(heart(h) for h in hearts)
    return f"""
  <div style="position:absolute; left:{px(12)}; top:{px(10)}; display:flex; flex-direction:column; gap:{px(4)}; {style}">
    <div style="display:flex; gap:{px(2)};">{hs}</div>
    <div style="display:flex; gap:{px(8)}; align-items:center; text-shadow:0 {S}px 0 #101410;">
      <span style="display:inline-flex; align-items:center; gap:{px(3)};">{icon("coin", 16)}{text(str(gold), 2, "#e2b24a")}</span>
      <span style="display:inline-flex; align-items:center; gap:{px(3)};">{icon("key", 16)}{text(f"x{keys}", 2)}</span>
    </div>
  </div>"""


def slot(ic, key="", qty=None, sel=False, empty=False, compact=False):
    size = 18 if compact else 22
    isz = 16 if compact else 24
    inner = icon(ic, isz) if ic else ""
    if empty and ic:
        inner = f'<span style="opacity:.35; display:block;">{inner}</span>'
    q = f'<span class="f" style="position:absolute; right:{px(-2)}; bottom:{px(-4)}; font-size:16px; text-shadow:0 {S}px 0 #101410, {S}px 0 0 #101410, -{S}px 0 0 #101410, 0 -{S}px 0 #101410;">x{qty}</span>' if qty else ""
    k = ""
    if key:
        if compact:
            k = f'<span class="f" style="position:absolute; left:{px(-3)}; top:{px(-5)}; font-size:16px; color:#cfd2c6; background:#0f120f; border:{S}px solid #5b665b; padding:0 {px(2)}; line-height:1;">{key}</span>'
        else:
            k = f'<span style="position:absolute; left:{px(-6)}; top:{px(-8)};">{kbd(key)}</span>'
    outline = f"outline:{S}px solid #e8763a; outline-offset:-{S}px; filter:brightness(1.15);" if sel else ""
    return panel(inner + q + k, f"position:relative; width:{px(size)}; height:{px(size)}; display:flex; align-items:center; justify-content:center; {outline}", "slot")


def hotbar(style="", compact=False, boomerang=True):
    gap = px(3 if compact else 4)
    div = f'<div style="width:{S}px; height:{px(20)}; background:#5b665b; margin:0 {px(2)};"></div>'
    return panel(
        f'<div style="display:flex; gap:{gap}; align-items:center; padding:{px(2)} {px(4)};">'
        + slot("sword", "LMB", sel=True, compact=compact)
        + div
        + slot("potion", "1", 2, compact=compact)
        + slot("bomb", "2", 3, compact=compact)
        + slot("boomerang", "RMB", empty=not boomerang, compact=compact)
        + div
        + slot("bag", "Tab", compact=compact)
        + "</div>",
        f"position:absolute; {style}",
    )


def namecard_one_line(style, room="The Crossroads"):
    return panel(
        f'<div style="display:flex; gap:{px(6)}; align-items:baseline; padding:0 {px(8)};">{text("WHISPERWOOD HOLLOW", 1, "#e8763a")}{text(room, 1)}</div>',
        f"position:absolute; {style}",
        "slot",
    )


def tag(inner, x, y, style="", anchor="left"):
    """Small floating pixel tag (slot chrome) at game-px position, e.g. beside Wren."""
    tr = "translate(-50%, 0)" if anchor == "center" else ""
    return panel(
        f'<div style="display:flex; gap:{px(4)}; align-items:center; padding:0 {px(3)}; white-space:nowrap;">{inner}</div>',
        f"position:absolute; left:{px(x)}; top:{px(y)}; transform:{tr}; {style}",
        "slot",
    )


def keycross(pressed=()):
    def k(l):
        dim = "opacity:.35;" if l in pressed else ""
        return f'<span style="{dim}">{kbd(l)}</span>'
    return f"""<div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:{S}px; align-items:center; justify-items:center;">
      <span></span>{k("W")}<span></span>{k("A")}{k("S")}{k("D")}</div>"""


def ring(x, y, r, color="#ff6b5a"):
    return f'<div style="position:absolute; left:{px(x - r)}; top:{px(y - r)}; width:{px(2 * r)}; height:{px(2 * r)}; border:{S}px solid {color}; border-radius:50%; animation: ring 1s ease-out infinite;"></div>'


def arrow(x, y, dirn="right", color="#fff2b0"):
    rot = {"right": 0, "left": 180, "up": -90, "down": 90}[dirn]
    return f'<svg viewBox="0 0 8 8" style="position:absolute; left:{px(x - 4)}; top:{px(y - 4)}; width:{px(8)}; height:{px(8)}; transform:rotate({rot}deg); shape-rendering:crispEdges; animation: bob .8s ease-in-out infinite;"><path d="M1 3h4V1l3 3-3 3V5H1z" fill="{color}" stroke="#2a1a10" stroke-width="0.6"/></svg>'


def signpost(x, y):
    """Placeholder mossy signpost (real sprite comes from PixelLab): board + post, drawn in game px."""
    return f"""<div style="position:absolute; left:{px(x)}; top:{px(y)};">
      <div style="width:{px(22)}; height:{px(13)}; background:#6a4a2e; border:{S}px solid #2a1a10; box-shadow: inset 0 {S}px 0 #8a6a42; display:flex; align-items:center; justify-content:center;"><span style="display:block; width:{px(12)}; height:{S}px; background:#2a1a10; box-shadow:0 {px(3)} 0 #2a1a10, 0 -{px(3)} 0 #2a1a10;"></span></div>
      <div style="width:{px(4)}; height:{px(9)}; background:#4a3220; margin-left:{px(9)}; border-left:{S}px solid #2a1a10;"></div>
    </div>"""


# ---------------------------------------------------------------- page 1: HUD

hud_wall = frame(
    "bg-crossroads.png",
    vitals()
    + hotbar(f"right:{px(10)}; top:{px(8)};", compact=True)
    + namecard_one_line(f"left:50%; bottom:{px(4)}; transform:translateX(-50%);"),
    "<b style=\"color:#e8763a\">A · Wall band.</b> Everything persistent sits in the 3-tile top wall, never on the floor. Hotbar top-right, compact (icons 16px, key labels tucked in the corner). Room name is one line over the bottom wall, gone in 2.5s.",
)

hud_corners = frame(
    "bg-crossroads.png",
    vitals()
    + hotbar(f"right:{px(8)}; bottom:{px(6)};", compact=True)
    + namecard_one_line(f"left:{px(8)}; bottom:{px(4)};"),
    "<b style=\"color:#e8763a\">B · Corners.</b> Hotbar stays at the bottom where the hand expects it, but shrunk into the bottom-right corner over the wall. Name card bottom-left. Centre of the screen is always clear.",
)

# ---------------------------------------------------------------- page 2: tutorial prompts

# entrance frame: Wren feet at game (320, 262)
WX, WY = 320, 262

tut_float = frame(
    "bg-entrance.png",
    tag(keycross(pressed=("W",)) + text("Move", 1, "#ede9df"), WX + 22, WY - 62)
    + tag(kbd("Shift") + text("Dash", 1, "#a8aa9c"), WX + 22, WY - 30, "opacity:.45;")
    + f'<div class="f" style="position:absolute; left:{px(WX + 22)}; top:{px(WY - 8)}; font-size:16px; color:#a8aa9c;">next: after you move</div>',
    "<b style=\"color:#e8763a\">Option 1 · Beside Wren.</b> A small tag floats at her shoulder. Each key dims the moment you press it; when all four are dim the tag pops away and the next lesson (Shift · Dash) fades in. Always in your eyeline, never over the action.",
)

tut_ground = frame(
    "bg-entrance.png",
    # chalk keys on the floor around her
    "".join(
        f'<div class="f" style="position:absolute; left:{px(WX + dx - 8)}; top:{px(WY + dy - 8)}; width:{px(16)}; height:{px(16)}; display:flex; align-items:center; justify-content:center; font-size:32px; color:rgba(255,242,176,{a}); text-shadow:0 0 {px(3)} rgba(0,0,0,.35);">{l}</div>'
        for l, dx, dy, a in (("W", 0, -44, .35), ("A", -40, -12, .9), ("S", 0, 20, .9), ("D", 40, -12, .9))
    )
    + f'<div class="f" style="position:absolute; left:{px(WX)}; top:{px(WY + 40)}; transform:translateX(-50%); font-size:16px; color:#fff2b0; text-shadow:0 {S}px 0 #101410;">move</div>',
    "<b style=\"color:#e8763a\">Option 2 · On the floor.</b> The keys are painted on the flagstones around her like chalk (W already faded: she stepped up). No UI chrome at all - it reads as part of the world, and it works the same for the first slime (a red ring on it, LMB on the floor between them).",
)

tut_coach = frame(
    "bg-entrance.png",
    panel(
        f'<div style="display:flex; gap:{px(8)}; align-items:center; padding:0 {px(6)};">'
        + kbd("WASD") + text("Move", 1)
        + f'<span style="display:inline-flex; gap:{px(2)}; margin-left:{px(4)};">'
        + "".join(f'<span style="width:{px(4)}; height:{px(4)}; background:{c};"></span>' for c in ("#e8763a", "#5b665b", "#5b665b"))
        + "</span></div>",
        f"position:absolute; left:50%; top:{px(10)}; transform:translateX(-50%);",
        "slot",
    ),
    "<b style=\"color:#e8763a\">Option 3 · Coach strip.</b> One slim strip in the top wall band, one lesson at a time (move → strike → dash), three dots for progress. Cleanest, but furthest from where you're looking - easy to miss the moment it changes.",
)

# warren frame: Wren feet (86, 178); slime at (176, 158)
first_enemy = frame(
    "bg-warren.png",
    ring(176, 148, 16)
    + tag(kbd("LMB") + text("Strike toward the cursor", 1), 86 + 22, 178 - 62)
    + tag(kbd("Shift") + text("Dash out of its leap", 1, "#a8aa9c"), 86 + 22, 178 - 30, "opacity:.45;")
    + f'<div class="f" style="position:absolute; left:{px(176)}; top:{px(168)}; transform:translateX(-50%); font-size:16px; color:#ffb8a8; text-shadow:0 {S}px 0 #101410;">glints red before it leaps</div>',
    "<b style=\"color:#e8763a\">First enemy (Option 1 style).</b> The moment a slime is on screen for the first time: a ring on it, the LMB lesson at her shoulder. It clears on the first hit; the dash lesson fires the first time the slime glints red.",
)

# ---------------------------------------------------------------- page 3: interactions, signs, boss

# cellar frame: block centre (208, 208); Wren feet (174, 214)
interactions = frame(
    "bg-cellar.png",
    arrow(232, 208, "right")
    + tag(text("Push", 1, "#fff2b0"), 208, 178, anchor="center")
    + tag(kbd("0/1") + text("Locked", 1, "#ffb8a8"), 480, 40, "display:none;")
    # chest sparkle (hidden chest reward spot at (16,4) -> (528, 144))
    + ring(400, 176, 14, "#fff2b0")
    + f'<div class="f" style="position:absolute; left:{px(400)}; top:{px(198)}; transform:translateX(-50%); font-size:16px; color:#e2b24a; text-shadow:0 {S}px 0 #101410;">the rune plate wants weight</div>',
    "<b style=\"color:#e8763a\">Interactions, bump-to-open kept.</b> Nothing needs a button: chests and doors still open on touch. Only two things get a floating cue - a block shows <i>Push</i> with an arrow when you lean on it, and a locked door shows <i>Locked · 0/1</i> keys. Puzzle targets (the plate) pulse once when you enter the room.",
)

# entrance frame: signpost left of the spawn at (272, 246)
dialogue = frame(
    "bg-entrance.png",
    signpost(268, 232)
    + panel(
        f'<div style="display:flex; gap:{px(10)}; align-items:flex-start; padding:{px(2)} {px(4)};">'
        + f'<div style="width:{px(24)}; height:{px(24)}; background:#6a4a2e; border:{S}px solid #2a1a10; flex:none;"></div>'
        + f'<div style="display:flex; flex-direction:column; gap:{px(4)};">'
        + text("MOSS-CARVED SIGN", 1, "#e8763a")
        + text("Wardens move with WASD and strike toward the cursor. Tap Shift to dash - hold it to run. Slimes glint red before they leap.<span style=\"animation:blink .6s step-end infinite\">_</span>", 1, "#ede9df", "line-height:1.4; max-width:44ch;")
        + f'<span style="display:flex; gap:{px(4)}; align-items:center; margin-top:{px(2)};">{kbd("E")}{text("continue", 1, "#a8aa9c")}</span>'
        + "</div></div>",
        f"position:absolute; left:50%; bottom:{px(10)}; transform:translateX(-50%); width:{px(320)};",
    ),
    "<b style=\"color:#e8763a\">Sign A · Dialogue panel.</b> Walk into a signpost and the panel types the text out at the bottom; the world holds. Same panel the town NPCs will use in M3 (with a portrait in the square). Text is authored per sign in the room JSON.",
)

bubble = frame(
    "bg-entrance.png",
    signpost(268, 232)
    + panel(
        text("Two keys lie in the Hollow's wings - the warren west, the cellar east.", 1, "#ede9df", "line-height:1.4; max-width:30ch; display:block;"),
        f"position:absolute; left:{px(279)}; bottom:{px(768 // S - 216)}; transform:translateX(-50%); padding:0 {px(2)};",
        "slot",
    )
    + f'<div style="position:absolute; left:{px(279 - 3)}; top:{px(224)}; width:0; height:0; border-left:{px(3)} solid transparent; border-right:{px(3)} solid transparent; border-top:{px(4)} solid #5b665b;"></div>',
    "<b style=\"color:#e8763a\">Sign B · Speech bubble.</b> The sign speaks in a small bubble while you stand next to it; step away and it closes. No hold, no button - lighter, but only fits a line or two, so longer lore stays on the panel.",
)

# boss frame: treant centre-bottom (320, 147), Wren (320, 217)
boss_bar = frame(
    "bg-boss.png",
    vitals(("full", "full", "full", "half", "empty"), 109, 0)
    + f'<div style="position:absolute; left:50%; top:{px(8)}; transform:translateX(-50%); width:{px(220)}; display:flex; flex-direction:column; align-items:center; gap:{px(3)};">'
    + text("ELDER TREANT", 2, "#ffd2c4", f"text-shadow:0 {S}px 0 #101410;")
    + panel(f'<div style="height:{px(8)}; width:79%; background:#c93b2e; box-shadow: inset 0 {S}px 0 #f07a5a;"></div>', f"width:100%; border-width:{px(9)} {px(12)}; box-sizing:border-box;", "bar")
    + f'<div style="background:rgba(8,10,8,.85); padding:{px(2)} {px(8)}; border:{S}px solid #5b665b;">{text("STUNNED - STRIKE THE CORE", 2, "#e8763a")}</div>'
    + "</div>",
    "<b style=\"color:#e8763a\">Boss A · Bigger bar.</b> Name and status at title size (32px at this scale, 2× what shipped), status on a dark strip so it reads over stone. Bar 8px tall inside the frame instead of 2.",
)

boss_float = frame(
    "bg-boss.png",
    vitals(("full", "full", "full", "half", "empty"), 109, 0)
    + f'<div style="position:absolute; left:50%; top:{px(8)}; transform:translateX(-50%); width:{px(180)}; display:flex; flex-direction:column; align-items:center; gap:{px(2)};">'
    + text("Elder Treant", 1, "#ffd2c4", f"text-shadow:0 {S}px 0 #101410;")
    + panel(f'<div style="height:{px(6)}; width:79%; background:#c93b2e; box-shadow: inset 0 {S}px 0 #f07a5a;"></div>', f"width:100%; border-width:{px(9)} {px(12)}; box-sizing:border-box;", "bar")
    + "</div>"
    + f'<div style="position:absolute; left:{px(392)}; top:{px(96)}; background:rgba(8,10,8,.85); padding:{px(2)} {px(8)}; border:{S}px solid #e8763a; animation: bob .8s ease-in-out infinite;">{text("STUNNED - STRIKE THE CORE", 2, "#e8763a")}</div>'
    + arrow(384, 110, "left", "#e8763a")
    + ring(320, 108, 12, "#ffb060"),
    "<b style=\"color:#e8763a\">Boss B · Text on the boss.</b> The bar stays modest; the status floats over the Treant's head with a ring on the glowing core - the cue is where your eyes already are. \"Its bark shrugs off steel - try the boomerang\" appears the same way on the first clang.",
)

boards = {
    "HudWallBand": hud_wall,
    "HudCorners": hud_corners,
    "TutorialFloat": tut_float,
    "TutorialGround": tut_ground,
    "TutorialCoach": tut_coach,
    "FirstEnemy": first_enemy,
    "Interactions": interactions,
    "SignDialogue": dialogue,
    "SignBubble": bubble,
    "BossBar": boss_bar,
    "BossFloat": boss_float,
}
boards["Main"] = boards.pop("HudWallBand")
for name, html in boards.items():
    (OUT / f"{name}.dc.html").write_text(html, encoding="utf-8")

W, H, GX, GY = 1280, 768, 1400, 900
layout = [
    ("Main", "HUD A · Wall band (recommended)", 0, 0, "page-1"),
    ("HudCorners", "HUD B · Corners", 1, 0, "page-1"),
    ("TutorialFloat", "Tutorial 1 · Beside Wren (recommended)", 0, 0, "page-2"),
    ("TutorialGround", "Tutorial 2 · On the floor", 1, 0, "page-2"),
    ("TutorialCoach", "Tutorial 3 · Coach strip", 2, 0, "page-2"),
    ("FirstEnemy", "First enemy · Strike + Dash lessons", 0, 1, "page-2"),
    ("Interactions", "Interactions (bump kept)", 0, 0, "page-3"),
    ("SignDialogue", "Sign A · Dialogue panel (recommended)", 1, 0, "page-3"),
    ("SignBubble", "Sign B · Speech bubble", 2, 0, "page-3"),
    ("BossBar", "Boss A · Bigger bar", 0, 1, "page-3"),
    ("BossFloat", "Boss B · Text on the boss (recommended)", 1, 1, "page-3"),
]
canvas = {
    "pages": [{"id": "page-1", "name": "HUD layout"}, {"id": "page-2", "name": "Tutorial prompts"}, {"id": "page-3", "name": "Interactions · Signs · Boss"}],
    "artboards": [{"file": f"{n}.dc.html", "title": t, "x": gx * GX, "y": gy * GY, "w": W, "h": H, "page": p} for n, t, gx, gy, p in layout],
    "annotations": [
        *[
            {"id": f"note-{n.lower()}", "x": gx * GX, "y": gy * GY + H + 24, "w": 640, "page": p, "text": NOTES[i]}
            for i, (n, t, gx, gy, p) in enumerate(layout)
        ],
        {"id": "hud-brief", "x": 0, "y": -200, "w": 520, "page": "page-1", "text": "HUD relayout. Both options move every persistent element off the floor and lock UI scale to the game's own pixel scale (1 UI px = 1 game px, so on a 2000px window it is 3x, not 4x). Pick A or B; mixes are fine (e.g. A's top-right hotbar with B's bottom-left name card)."},
        {"id": "tut-brief", "x": 0, "y": -200, "w": 520, "page": "page-2", "text": "Contextual tutorial. Each lesson appears near Wren only when it applies and clears itself the moment you do the thing: WASD (clears per key), LMB (first slime on screen, clears on first hit), Shift (first red glint, clears on first dash), RMB (boomerang chest, clears on first throw), 2 (first cracked wall). Never a modal, never a wall of text; the pause screen keeps the full list."},
        {"id": "int-brief", "x": 0, "y": -200, "w": 520, "page": "page-3", "text": "Interactions stay bump-to-open. Signposts are the one new object: a placeholder sprite here, real one from PixelLab. Sign copy per room: R1 controls + the two-keys hint, R3 rune plate, R4 sprite/mushroom tells, R6 crystal + hollow wall."},
    ],
    "launch": {"view": "canvas", "page": "page-1"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2), encoding="utf-8")
print("wrote", len(boards), "artboards")
