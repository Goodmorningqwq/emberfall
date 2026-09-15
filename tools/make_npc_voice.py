"""The townsfolk's spoken lines from the same free neural TTS as Wren's (edge-tts, no key).
Every line an NPC can say is gathered from the town JSON, the elder's shard lines in HubScene.ts
and the side quests' offer/thanks in quests.ts, and rendered to
  public/assets/voice/npc/<npc>/<fnv1a of the text>.mp3
so the game finds a clip by hashing the line it is about to show (src/game/audio.ts speakNpc).
A manifest.json beside them lists hash -> text for review. Rerun after changing any line.
  python tools/make_npc_voice.py
"""
import asyncio, json, os, re
import edge_tts

VOICES = {
    "elder": ("en-GB-RyanNeural", "-12%", "-15Hz"),      # old, slow, low
    "apothecary": ("en-GB-SoniaNeural", "-4%", "+0Hz"),  # warm, motherly
    "blacksmith": ("en-GB-ThomasNeural", "+0%", "-10Hz"), # big, plain
}
OUT = "public/assets/voice/npc"


def fnv1a(text: str) -> str:
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def gather():
    lines = {k: [] for k in VOICES}
    town = json.load(open("src/game/data/emberfall-town.json", encoding="utf-8"))
    for key, npc in town["npcs"].items():
        lines[key.replace("npc-", "")] += npc["lines"]
    hub = open("src/game/scenes/HubScene.ts", encoding="utf-8").read()
    m = re.search(r"const elderLine =\n(.*?)\n\s*: npc\.lines\[0\];", hub, re.S)
    lines["elder"] += re.findall(r'\? "([^"]+)"', m.group(1))
    q = open("src/game/quests.ts", encoding="utf-8").read()
    for giver, offer, thanks in re.findall(r'giver: "npc-([a-z]+)",.*?offer: "([^"]+)",\n\s*thanks: "([^"]+)",', q, re.S):
        lines[giver] += [offer, thanks]
    return lines


async def main():
    lines = gather()
    manifest = {}
    for npc, texts in lines.items():
        voice, rate, pitch = VOICES[npc]
        os.makedirs(f"{OUT}/{npc}", exist_ok=True)
        manifest[npc] = {}
        for text in texts:
            h = fnv1a(text)
            manifest[npc][h] = text
            path = f"{OUT}/{npc}/{h}.mp3"
            if os.path.exists(path):
                continue
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(path)
            print(npc, h, os.path.getsize(path), "bytes:", text[:50])
    json.dump(manifest, open(f"{OUT}/manifest.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print({k: len(v) for k, v in manifest.items()})


asyncio.run(main())
