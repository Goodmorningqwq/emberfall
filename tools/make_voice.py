"""Wren's voice lines from a free neural TTS (Microsoft Edge voices via edge-tts, no key), one clip
per cue, written to public/assets/voice/wren/<cue>.mp3. Run an RVC pass over these afterwards if you
want a specific timbre - the game plays whatever file is there.
  python tools/make_voice.py                 # default voice
  python tools/make_voice.py en-US-AnaNeural # try another voice; compare in docs/audio-review/tts/
"""
import asyncio, sys, os
import edge_tts

VOICE = sys.argv[1] if len(sys.argv) > 1 else "en-GB-MaisieNeural"
OUT = "public/assets/voice/wren"
# cue -> (text, rate, pitch). Interjections, not sentences: the game layers them under its own SFX.
CUES = {
    "hurt": ("Ah!", "+25%", "+15Hz"),
    "hurt2": ("Ngh!", "+30%", "+10Hz"),
    "dash": ("Hup!", "+40%", "+10Hz"),
    "effort": ("Hah!", "+35%", "+5Hz"),
    "hm": ("Hm?", "+0%", "+20Hz"),
    "yell": ("Now!", "+10%", "+10Hz"),
    "potion": ("Mmm.", "-10%", "+5Hz"),
    "death": ("Aah...", "-25%", "-5Hz"),
    "hello-elder": ("Tam. It's cold in here.", "+0%", "+5Hz"),
    "shard": ("It's still burning.", "-5%", "+5Hz"),
    "lowhp": ("I can't take much more.", "+5%", "+5Hz"),
    "boss": ("Come on, then.", "+0%", "+0Hz"),
}


async def main():
    os.makedirs(OUT, exist_ok=True)
    for cue, (text, rate, pitch) in CUES.items():
        tts = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch)
        path = f"{OUT}/{cue}.mp3"
        await tts.save(path)
        print(cue, os.path.getsize(path), "bytes")


asyncio.run(main())
