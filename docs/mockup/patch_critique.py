"""One-off patch applying the design-critique fixes to build_artboards.py."""
from pathlib import Path

p = Path(__file__).parent / "build_artboards.py"
s = p.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)


# pixel font never below 14px; kbd 14
rep('min-width: 20px; height: 20px; padding: 0 5px; border-radius: 4px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); color: #cfd2c6; font-family: "Pixelify Sans", monospace; font-size: 13px; }',
    'min-width: 22px; height: 22px; padding: 0 6px; border-radius: 4px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); color: #cfd2c6; font-family: "Pixelify Sans", monospace; font-size: 14px; }')
rep('.eyebrow { font-family: "Pixelify Sans", monospace; font-size: 13px;',
    '.eyebrow { font-family: "Pixelify Sans", monospace; font-size: 14px;')
# quantity distinct from key badge + a status chip
rep('.slot .qty { position: absolute; right: 5px; bottom: 3px; font-family: "Pixelify Sans", monospace; font-size: 13px; color: #cfd2c6; }',
    '.slot .qty { position: absolute; right: 4px; bottom: 2px; font-family: "Pixelify Sans", monospace; font-size: 16px; font-weight: 700; color: #ede9df; text-shadow: 0 1px 0 #000; }\n'
    '    .chip { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 999px; background: rgba(127,184,164,0.14); color: #7fb8a4; font-weight: 600; font-size: 13px; border: 1px solid rgba(127,184,164,0.35); }')
rep('<span class="qty">2</span>', '<span class="qty">×2</span>')
rep('<span class="qty">3</span>', '<span class="qty">×3</span>')
# potion icon neutral
rep('{icon("potion", 26, "#9fd3c7")}', '{icon("potion", 26, "#cfd2c6")}')
rep('inv_slot("potion", "#9fd3c7", 2)', 'inv_slot("potion", "#cfd2c6", 2)')
# minimap / eyebrows at 14
rep('<span class="eyebrow" style="font-size:11px;">Whisperwood Hollow</span>', '<span class="eyebrow">Whisperwood Hollow</span>')
rep('<span class="eyebrow" style="font-size:12px;">Whisperwood Hollow</span>', '<span class="eyebrow">Whisperwood Hollow</span>')
rep('<span class="eyebrow" style="font-size:11px;">Dungeon tool · Whisperwood Hollow</span>', '<span class="eyebrow">Dungeon tool · Whisperwood Hollow</span>')
# room name card -> lower third
rep('<div style="position:absolute; left:0; right:0; top:22px; display:flex; justify-content:center; pointer-events:none;">',
    '<div style="position:absolute; left:0; right:0; top:560px; display:flex; justify-content:center; pointer-events:none;">')
# inventory: no HUD under modal, equipped -> chip + unequip
rep('  {scene("room.png", dim=0.55, blur=3)}\n  {hud(["full", "full", "full", "half"], 142, 1)}',
    '  {scene("room.png", dim=0.55, blur=3)}')
rep('        <div class="btn primary">Equipped</div>\n        <div class="btn ghost" style="gap:10px;"><span class="kbd">Esc</span> Back</div>',
    '        <div class="chip">{icon("boomerang", 14, "#7fb8a4")} Equipped · <span class="kbd" style="height:18px; min-width:18px; font-size:13px;">L</span></div>\n'
    '        <div class="btn ghost" style="height:38px; font-size:14px;">Unequip</div>')
# dialogue: no HUD, shorter panel, compact choices, speaker name in Plex
rep('  {scene("hub.png", dim=0.18)}\n  {hud(["full", "full", "full", "half"], 142, 0)}\n'
    '  <div class="panel" style="position:absolute; left:120px; right:120px; bottom:40px; border-radius:12px; padding:22px 26px; display:flex; gap:22px; align-items:flex-start;">\n'
    '    <div style="width:104px; height:104px; border-radius:10px; overflow:hidden; background:#4a4650; flex-shrink:0; border:1px solid rgba(255,255,255,0.10);"><img src="elder_portrait.png" alt="" style="width:104px; height:104px; image-rendering: pixelated;"></div>\n'
    '    <div style="display:flex; flex-direction:column; gap:12px; flex-grow:1;">\n'
    '      <div style="display:flex; align-items:baseline; gap:12px;">\n'
    '        <span class="px" style="font-size:22px; color:#e8763a;">Elder Maren</span>\n'
    '        <span class="muted" style="font-size:13px;">Emberfall square</span>\n'
    '      </div>\n'
    '      <p style="margin:0; font-size:19px; line-height:1.5; max-width:62ch; color:#ede9df;">',
    '  {scene("hub.png", dim=0.18)}\n'
    '  <div class="panel" style="position:absolute; left:120px; right:120px; bottom:36px; border-radius:12px; padding:18px 22px; display:flex; gap:20px; align-items:flex-start;">\n'
    '    <div style="width:88px; height:88px; border-radius:8px; overflow:hidden; background:#4a4650; flex-shrink:0; border:1px solid rgba(255,255,255,0.10);"><img src="elder_portrait.png" alt="" style="width:88px; height:88px; image-rendering: pixelated;"></div>\n'
    '    <div style="display:flex; flex-direction:column; gap:10px; flex-grow:1;">\n'
    '      <span style="font-size:18px; font-weight:600; color:#e8763a;">Elder Maren</span>\n'
    '      <p style="margin:0; font-size:18px; line-height:1.45; max-width:62ch; color:#ede9df;">')
rep('      <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">\n'
    '        <div class="btn ghost" style="justify-content:flex-start; border-color:#e8763a; background:rgba(232,118,58,0.10);">{icon("arrow", 16, "#e8763a")} Where exactly is the gate?</div>\n'
    '        <div class="btn ghost" style="justify-content:flex-start;"><span style="width:16px;"></span> Tell me about the Ember.</div>\n'
    '        <div class="btn ghost" style="justify-content:flex-start;"><span style="width:16px;"></span> I\'ll be going.</div>\n'
    '      </div>',
    '      <div style="display:flex; gap:8px; margin-top:2px; flex-wrap:wrap;">\n'
    '        <div class="btn ghost" style="height:36px; font-size:14px; border-color:#e8763a; background:rgba(232,118,58,0.10);">{icon("arrow", 14, "#e8763a")} Where exactly is the gate?</div>\n'
    '        <div class="btn ghost" style="height:36px; font-size:14px;">Tell me about the Ember.</div>\n'
    '        <div class="btn ghost" style="height:36px; font-size:14px;">I\'ll be going.</div>\n'
    '      </div>')
# shop: dim only the button; radius 12; a little less tall
rep('    dim = " opacity:0.55;" if state == "poor" else ""', '    dim = ""')
rep('top:70px; bottom:70px; border-radius:14px;', 'top:90px; bottom:90px; border-radius:12px;')
rep('<span class="px" style="font-size:13px; opacity:0.6;">v0.1 prototype</span>', '<span class="px" style="font-size:14px; opacity:0.6;">v0.1 prototype</span>')

p.write_text(s, encoding="utf-8")
print("patched")
