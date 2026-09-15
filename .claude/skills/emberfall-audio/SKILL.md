---
name: emberfall-audio
description: How Emberfall's sound works and how to change it — the WebAudio synth SFX table, per-place ambience, the procedural chiptune sequencer (title/town/explore/fight/boss), Wren's voice (TTS clips with a formant-synth fallback), levels, and how to render previews nobody has to be in the room to judge. Use for any new sound, music change, voice line or "it's too quiet".
---

# Emberfall audio

No audio files except Wren's voice clips. Everything else is synthesized at play time.

## Layout
- `src/game/audio.ts` — `sfx(name)` table (`SFX`), `tone()`/`noise()` helpers, master gain → compressor →
  destination, `setAmbient(place)` beds + one-shots, the voice (`WREN` profile, `CUES`, `say()`), clip playback
  (`playClip`, `speak(line)`), and `renderSfxPreview(names)` for offline WAVs.
- `src/game/music.ts` — step sequencer: `TRACKS` (bpm, chord roots, lead/bass notes per bar, drum strings),
  `setMusic(mode)` (bar-line switch; fight/boss on the next beat), `duckMusic`, `stopMusic`, `renderPreview`.
  Hooks: Hub `create` → town; `enterRoom` → fight/explore; `checkRoomCleared` → explore; boss roar → boss;
  `bossDefeated` → none then explore; `main.tsx` → title on menus, stop on death, duck on dialogue/shop/pause/bag/journal.
- Settings: `settings.sfx`, `settings.music` (pause menu). Voice level rides `sfx` × `WREN.volume`.

## Rules learned
- Vowel bandpasses eat ~10 dB: the formant voice needed ×2.4 makeup and a compressor before anyone could hear it.
- Previews use `OfflineAudioContext` with the module's `ctx/master/noiseBuf` swapped in (`previewing` flag) so
  the same code renders to a buffer; the `/__snap` sink accepts `data:audio/wav` and writes `docs/audio-review/`.
- Level previews for the user: render, normalise to 0.8 peak in Python (`wave` + numpy), send the WAV/MP3s.
  Spectrogram sheets are enough to sanity-check structure; the user's ear decides mood.
- Voice: `tools/make_voice.py` renders cues with edge-tts (free Microsoft neural voices, no key; Maisie GB
  youthful, Ana US cute, Ava, Libby); clips land in `public/assets/voice/wren/<cue>.mp3` and beat the synth
  automatically. Run them through the user's RVC model for a bespoke timbre — same filenames, drop-in.
  Interjections ("Ah!", "Hup!", "Hm?") work better than sentences for the grunt cues; `speak()` is rate-limited
  (1.2 s) so lines don't stack; the low-HP line at most every 25 s.
- New SFX: add the name to `SfxName`, a lambda in `SFX`; monsters get a tell sound on the telegraph and a
  per-type hurt sound in `hitEnemy`; footsteps come from `Player.update` (place decides stone vs turf).
- Fire has its own helper: `crackle(dur, gain, delay)` scatters tiny bandpassed noise ticks (thinning toward the
  end) — layer it under a hiss (`noise(..., "bandpass")`) for anything burning. Cinder Depths set: `rod` (shot),
  `ignite` (brazier), `vent` (flame, only within 160 px), `burn` (thorns), `crust` (lava crusting — `drainRoom`
  picks it over `drain` in the cinder), `splash` (magma lands), `stomp` (golem foot), `sizzle` (golem overheat
  window), `heat` (cinderling's guard drops — only when it wasn't already hot, so bolts don't stack the sound).
- Level check without ears: `renderSfxPreview(names, 1.6)` then per-sound peak/RMS in the console. Reference peaks
  at preview volume: hit 0.23, bomb 0.38, crack 0.29, crystal 0.13, stun 0.11, whoosh 0.03. A hazard tell that
  repeats (vents) should sit around 0.1; a boss impact near 0.3–0.4. Preview WAV: `docs/audio-review/sfx-cinder.wav`.
- Townsfolk lines: `tools/make_npc_voice.py` gathers every NPC line (town JSON, Tam's shard lines in HubScene,
  side-quest offer/thanks in quests.ts) and writes `voice/npc/<who>/<fnv1a(text)>.mp3` + manifest.json. The game
  plays by hashing the line (`speakNpc(who, text)`), so **rerun the script after editing any NPC line** or it goes
  silent; pass the bare line (not the "(+60 gold)" decorated one). `stopNpc()` on dialogue close.
- The Voice Lab artifact (https://claude.ai/artifact/6j6SoJ4fyAF18YEWpYd426) mirrors `say()`; a pasted preset
  maps 1:1 onto `WREN`.
