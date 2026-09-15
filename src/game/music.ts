import { useGame } from "../ui/store";
import { audioContext, noiseBuffer } from "./audio";

/**
 * Procedural chiptune. No audio files: a four-voice step sequencer (square lead,
 * triangle bass, detuned-saw pad, noise/sine drums) plays hand-written 16-step
 * patterns over a chord loop, scheduled a little ahead of the clock the way
 * Web Audio wants. One track per situation; switching waits for the bar line and
 * crossfades, so town → dungeon → fight → boss never cuts mid-phrase.
 */
export type MusicMode = "title" | "town" | "explore" | "fight" | "boss" | "none";

interface Note {
  step: number; // 0..15 within the bar
  midi: number; // absolute pitch, or relative to the bar's root when `rel`
  len: number; // in steps
  rel?: boolean;
}
interface Track {
  bpm: number;
  /** chord roots per bar (midi), the loop length is this array */
  roots: number[];
  /** chord quality per bar: intervals over the root for the pad */
  chords: number[][];
  lead: Note[][]; // per bar (cycles)
  bass: Note[][];
  drums: { kick: string; snare: string; hat: string }[]; // 16-char strings per bar, "x" hits
  leadGain: number;
  padGain: number;
  bassGain: number;
  drumGain: number;
}

const m = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const K = (s: string): string => s; // drum pattern helper for readability

// ---- the tracks -------------------------------------------------------------

/** A minor, slow: two notes hanging in the air over a low drone. */
const TITLE: Track = {
  bpm: 66,
  roots: [57, 53, 60, 55], // A F C G
  chords: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]],
  lead: [
    [{ step: 0, midi: 76, len: 6 }, { step: 8, midi: 74, len: 4 }, { step: 12, midi: 72, len: 4 }],
    [{ step: 0, midi: 72, len: 8 }, { step: 10, midi: 69, len: 6 }],
    [{ step: 0, midi: 67, len: 4 }, { step: 4, midi: 72, len: 4 }, { step: 8, midi: 76, len: 8 }],
    [{ step: 0, midi: 74, len: 12 }],
  ],
  bass: [[{ step: 0, midi: 0, len: 16, rel: true }]],
  drums: [{ kick: K("................"), snare: K("................"), hat: K("................") }],
  leadGain: 0.16,
  padGain: 0.1,
  bassGain: 0.14,
  drumGain: 0,
};

/** C major, lilting: the town at dusk. */
const TOWN: Track = {
  bpm: 96,
  roots: [48, 43, 45, 41], // C G A F
  chords: [[0, 4, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]],
  lead: [
    [{ step: 0, midi: 72, len: 3 }, { step: 4, midi: 76, len: 3 }, { step: 8, midi: 79, len: 4 }, { step: 12, midi: 76, len: 2 }, { step: 14, midi: 74, len: 2 }],
    [{ step: 0, midi: 71, len: 6 }, { step: 8, midi: 74, len: 4 }, { step: 12, midi: 71, len: 4 }],
    [{ step: 0, midi: 69, len: 3 }, { step: 4, midi: 72, len: 3 }, { step: 8, midi: 76, len: 4 }, { step: 12, midi: 74, len: 4 }],
    [{ step: 0, midi: 72, len: 8 }, { step: 8, midi: 69, len: 4 }, { step: 12, midi: 67, len: 4 }],
  ],
  bass: [[{ step: 0, midi: 0, len: 4, rel: true }, { step: 6, midi: 7, len: 2, rel: true }, { step: 8, midi: 0, len: 4, rel: true }, { step: 14, midi: 12, len: 2, rel: true }]],
  drums: [{ kick: K("x.......x......."), snare: K("................"), hat: K("..x...x...x...x.") }],
  leadGain: 0.13,
  padGain: 0.08,
  bassGain: 0.14,
  drumGain: 0.35,
};

/** D minor, sparse: the dungeon between fights. */
const EXPLORE: Track = {
  bpm: 84,
  roots: [50, 46, 53, 48], // D Bb F C
  chords: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]],
  lead: [
    [{ step: 0, midi: 74, len: 4 }, { step: 6, midi: 77, len: 2 }, { step: 10, midi: 74, len: 6 }],
    [{ step: 2, midi: 70, len: 4 }, { step: 12, midi: 72, len: 4 }],
    [{ step: 0, midi: 69, len: 8 }],
    [{ step: 4, midi: 67, len: 4 }, { step: 8, midi: 70, len: 2 }, { step: 12, midi: 69, len: 4 }],
  ],
  bass: [[{ step: 0, midi: 0, len: 8, rel: true }, { step: 8, midi: 0, len: 6, rel: true }]],
  drums: [{ kick: K("x..............."), snare: K("................"), hat: K("....x.......x...") }],
  leadGain: 0.1,
  padGain: 0.11,
  bassGain: 0.13,
  drumGain: 0.25,
};

/** E minor, driving: something is coming at her. */
const FIGHT: Track = {
  bpm: 132,
  roots: [52, 48, 50, 47], // E C D B
  chords: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 3, 7]],
  lead: [
    [{ step: 0, midi: 76, len: 2 }, { step: 2, midi: 79, len: 2 }, { step: 4, midi: 83, len: 3 }, { step: 8, midi: 79, len: 2 }, { step: 10, midi: 76, len: 2 }, { step: 12, midi: 74, len: 4 }],
    [{ step: 0, midi: 72, len: 2 }, { step: 2, midi: 76, len: 2 }, { step: 4, midi: 79, len: 3 }, { step: 8, midi: 76, len: 4 }, { step: 12, midi: 74, len: 2 }, { step: 14, midi: 72, len: 2 }],
    [{ step: 0, midi: 74, len: 2 }, { step: 2, midi: 78, len: 2 }, { step: 4, midi: 81, len: 3 }, { step: 8, midi: 78, len: 2 }, { step: 10, midi: 74, len: 2 }, { step: 12, midi: 71, len: 4 }],
    [{ step: 0, midi: 71, len: 4 }, { step: 4, midi: 74, len: 2 }, { step: 6, midi: 78, len: 2 }, { step: 8, midi: 79, len: 6 }],
  ],
  bass: [[{ step: 0, midi: 0, len: 2, rel: true }, { step: 2, midi: 0, len: 2, rel: true }, { step: 4, midi: 12, len: 2, rel: true }, { step: 6, midi: 0, len: 2, rel: true }, { step: 8, midi: 0, len: 2, rel: true }, { step: 10, midi: 7, len: 2, rel: true }, { step: 12, midi: 12, len: 2, rel: true }, { step: 14, midi: 10, len: 2, rel: true }]],
  drums: [{ kick: K("x...x...x...x.x."), snare: K("....x.......x..."), hat: K("x.x.x.x.x.x.x.xx") }],
  leadGain: 0.13,
  padGain: 0.06,
  bassGain: 0.16,
  drumGain: 0.5,
};

/** C minor, heavy: the boss. */
const BOSS: Track = {
  bpm: 150,
  roots: [48, 44, 46, 43], // C Ab Bb G
  chords: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]],
  lead: [
    [{ step: 0, midi: 72, len: 1 }, { step: 1, midi: 72, len: 1 }, { step: 2, midi: 75, len: 2 }, { step: 4, midi: 79, len: 2 }, { step: 6, midi: 78, len: 2 }, { step: 8, midi: 75, len: 4 }, { step: 12, midi: 72, len: 2 }, { step: 14, midi: 70, len: 2 }],
    [{ step: 0, midi: 68, len: 2 }, { step: 2, midi: 72, len: 2 }, { step: 4, midi: 75, len: 4 }, { step: 8, midi: 80, len: 4 }, { step: 12, midi: 79, len: 4 }],
    [{ step: 0, midi: 70, len: 1 }, { step: 1, midi: 70, len: 1 }, { step: 2, midi: 74, len: 2 }, { step: 4, midi: 77, len: 2 }, { step: 6, midi: 75, len: 2 }, { step: 8, midi: 74, len: 4 }, { step: 12, midi: 70, len: 4 }],
    [{ step: 0, midi: 67, len: 2 }, { step: 2, midi: 71, len: 2 }, { step: 4, midi: 74, len: 2 }, { step: 6, midi: 79, len: 2 }, { step: 8, midi: 83, len: 8 }],
  ],
  bass: [[{ step: 0, midi: 0, len: 1, rel: true }, { step: 1, midi: 0, len: 1, rel: true }, { step: 2, midi: 0, len: 2, rel: true }, { step: 4, midi: 0, len: 1, rel: true }, { step: 5, midi: 0, len: 1, rel: true }, { step: 6, midi: 12, len: 2, rel: true }, { step: 8, midi: 0, len: 1, rel: true }, { step: 9, midi: 0, len: 1, rel: true }, { step: 10, midi: 0, len: 2, rel: true }, { step: 12, midi: 7, len: 2, rel: true }, { step: 14, midi: 10, len: 2, rel: true }]],
  drums: [{ kick: K("x...x...x...x..."), snare: K("....x.......x..x"), hat: K("..x...x...x...x.") }],
  leadGain: 0.14,
  padGain: 0.07,
  bassGain: 0.18,
  drumGain: 0.6,
};

const TRACKS: Record<Exclude<MusicMode, "none">, Track> = { title: TITLE, town: TOWN, explore: EXPLORE, fight: FIGHT, boss: BOSS };

// ---- the sequencer ----------------------------------------------------------

let mode: MusicMode = "none";
let wanted: MusicMode = "none";
let bus: GainNode | null = null;
let timer: number | undefined;
let nextStepTime = 0;
let step = 0; // absolute step counter
let current: Track | null = null;
let pending: Track | null = null;
let pendingUrgent = false;
let ducked = false;

const LOOKAHEAD = 0.18; // s of audio scheduled ahead
const TICK = 40; // ms

function musicVol() {
  const s = useGame.getState().settings;
  return (s.music ?? 0.6) * 0.5 * (ducked ? 0.35 : 1);
}

function ensureBus() {
  const c = audioContext();
  if (!c) return null;
  if (!bus) {
    bus = c.createGain();
    bus.gain.value = 0.0001;
    bus.connect(c.destination);
  }
  return c;
}

/** Ask for a mode. Takes effect at the next bar line (immediately if nothing is playing). */
export function setMusic(next: MusicMode) {
  wanted = next;
  const c = ensureBus();
  if (!c || c.state === "suspended") return; // picked up by resumeMusic() on the first gesture
  if (next === "none") return stopMusic();
  const track = TRACKS[next];
  if (!current) {
    current = track;
    mode = next;
    pending = null;
    step = 0;
    nextStepTime = c.currentTime + 0.05;
    bus!.gain.cancelScheduledValues(c.currentTime);
    bus!.gain.setValueAtTime(0.0001, c.currentTime);
    bus!.gain.setTargetAtTime(musicVol(), c.currentTime, 0.6);
    if (timer === undefined) timer = window.setInterval(tick, TICK);
    return;
  }
  if (mode === next) {
    pending = null;
    return;
  }
  pending = track;
  pendingUrgent = next === "fight" || next === "boss"; // danger doesn't wait for the bar line
  mode = next;
}

/** Called from the first-gesture unlock: start whatever was asked for before the context could run. */
export function resumeMusic() {
  const c = ensureBus();
  if (!c) return;
  const go = () => {
    if (wanted !== "none" && !current) setMusic(wanted);
  };
  if (c.state === "suspended") void c.resume().then(go);
  else go();
}

export function stopMusic() {
  const c = audioContext();
  if (bus && c) {
    bus.gain.cancelScheduledValues(c.currentTime);
    bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.4);
  }
  current = null;
  pending = null;
  mode = "none";
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

/** Playtest hook: what the sequencer thinks it is doing. */
export function musicState() {
  const c = audioContext();
  return { mode, wanted, playing: !!current, pending: !!pending, ctx: c?.state ?? "none", ducked };
}

/** Lower the bed under dialogue / menus without stopping it. */
export function duckMusic(on: boolean) {
  ducked = on;
  const c = audioContext();
  if (bus && c && current) bus.gain.setTargetAtTime(musicVol(), c.currentTime, 0.25);
}

function tick() {
  const c = audioContext();
  if (!c || !current || !bus) return;
  const stepDur = 60 / current.bpm / 4;
  while (nextStepTime < c.currentTime + LOOKAHEAD) {
    const bars = current.roots.length;
    const barIdx = Math.floor(step / 16) % bars;
    const s16 = step % 16;
    // a pending track takes over on the bar line, with a short dip so the key change doesn't smear
    if (pending && (s16 === 0 || (pendingUrgent && s16 % 4 === 0))) {
      current = pending;
      pending = null;
      step = 0;
      bus.gain.cancelScheduledValues(nextStepTime);
      bus.gain.setValueAtTime(musicVol() * 0.3, nextStepTime);
      bus.gain.setTargetAtTime(musicVol(), nextStepTime, 0.5);
      continue;
    }
    scheduleStep(c, current, barIdx, s16, nextStepTime, stepDur);
    nextStepTime += stepDur;
    step++;
  }
}

function scheduleStep(c: BaseAudioContext, t: Track, bar: number, s16: number, at: number, stepDur: number) {
  const root = t.roots[bar];
  // pad: whole-bar chord
  if (s16 === 0 && t.padGain > 0) {
    const barLen = stepDur * 16;
    for (const iv of t.chords[bar]) pad(c, m(root + 12 + iv), at, barLen, t.padGain);
  }
  for (const n of t.lead[bar % t.lead.length]) if (n.step === s16) lead(c, m(n.rel ? root + n.midi : n.midi), at, n.len * stepDur, t.leadGain);
  for (const n of t.bass[bar % t.bass.length]) if (n.step === s16) bass(c, m(n.rel ? root + n.midi : n.midi), at, n.len * stepDur, t.bassGain);
  const d = t.drums[bar % t.drums.length];
  if (d.kick[s16] === "x") kick(c, at, t.drumGain);
  if (d.snare[s16] === "x") snare(c, at, t.drumGain);
  if (d.hat[s16] === "x") hat(c, at, t.drumGain * 0.5);
}

// ---- voices -----------------------------------------------------------------

/** Where voices play: the live bus, or an offline render's own bus while renderPreview runs. */
let activeBus: GainNode | null = null;
let activeNoise: AudioBuffer | null = null;
function out() {
  return activeBus ?? bus;
}
function noiseFor(c: BaseAudioContext) {
  if (activeNoise) return activeNoise;
  const nb = noiseBuffer();
  return nb && nb.sampleRate === c.sampleRate ? nb : null;
}

function lead(c: BaseAudioContext, f: number, at: number, dur: number, gain: number) {
  const bus = out();
  if (!bus) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(f, at);
  // a touch of vibrato after the attack
  const v = c.createOscillator();
  const vg = c.createGain();
  v.frequency.value = 5.5;
  vg.gain.setValueAtTime(0, at);
  vg.gain.linearRampToValueAtTime(f * 0.006, at + Math.min(0.25, dur));
  v.connect(vg).connect(o.frequency);
  const end = at + dur * 0.92;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.01);
  g.gain.setTargetAtTime(gain * 0.6, at + 0.05, 0.12);
  g.gain.setTargetAtTime(0.0001, end - 0.03, 0.02);
  o.connect(g).connect(bus);
  o.start(at);
  v.start(at);
  o.stop(end + 0.1);
  v.stop(end + 0.1);
}

function bass(c: BaseAudioContext, f: number, at: number, dur: number, gain: number) {
  const bus = out();
  if (!bus) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(f, at);
  const end = at + dur * 0.9;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.008);
  g.gain.setTargetAtTime(0.0001, end - 0.04, 0.03);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(end + 0.1);
}

function pad(c: BaseAudioContext, f: number, at: number, dur: number, gain: number) {
  const bus = out();
  if (!bus) return;
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.4);
  g.gain.setTargetAtTime(0.0001, at + dur - 0.3, 0.15);
  for (const det of [-6, 6]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f, at);
    o.detune.value = det;
    o.connect(lp);
    o.start(at);
    o.stop(at + dur + 0.2);
  }
  lp.connect(g).connect(bus);
}

function kick(c: BaseAudioContext, at: number, gain: number) {
  const bus = out();
  if (!bus) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, at);
  o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + 0.2);
}

function snare(c: BaseAudioContext, at: number, gain: number) {
  const bus = out();
  const nb = noiseFor(c);
  if (!bus || !nb) return;
  const src = c.createBufferSource();
  src.buffer = nb;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1800;
  const g = c.createGain();
  g.gain.setValueAtTime(gain * 0.5, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  src.connect(f).connect(g).connect(bus);
  src.start(at);
  src.stop(at + 0.15);
}

function hat(c: BaseAudioContext, at: number, gain: number) {
  const bus = out();
  const nb = noiseFor(c);
  if (!bus || !nb) return;
  const src = c.createBufferSource();
  src.buffer = nb;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(gain * 0.35, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
  src.connect(f).connect(g).connect(bus);
  src.start(at);
  src.stop(at + 0.06);
}

/**
 * Playtest/review: render `bars` bars of a track offline and hand back the samples
 * (mono Float32), so a WAV can be written without anyone listening in the loop.
 */
export async function renderPreview(which: Exclude<MusicMode, "none">, bars = 8): Promise<{ sampleRate: number; samples: Float32Array }> {
  const t = TRACKS[which];
  const rate = 22050;
  const stepDur = 60 / t.bpm / 4;
  const total = stepDur * 16 * bars + 1;
  const oc = new OfflineAudioContext(1, Math.ceil(total * rate), rate);
  const g = oc.createGain();
  g.gain.value = 0.5;
  g.connect(oc.destination);
  const nb = oc.createBuffer(1, rate, rate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  activeBus = g;
  activeNoise = nb;
  try {
    for (let st = 0; st < 16 * bars; st++) scheduleStep(oc, t, Math.floor(st / 16) % t.roots.length, st % 16, 0.05 + st * stepDur, stepDur);
  } finally {
    activeBus = null;
    activeNoise = null;
  }
  const buf = await oc.startRendering();
  return { sampleRate: rate, samples: buf.getChannelData(0) };
}

// keep the level in step with the setting; mute while the tab is hidden (the scheduler stalls anyway)
useGame.subscribe((s, prev) => {
  if (s.settings.music !== prev.settings.music) {
    const c = audioContext();
    if (bus && c && current) bus.gain.setTargetAtTime(musicVol(), c.currentTime, 0.2);
  }
});
document.addEventListener("visibilitychange", () => {
  const c = audioContext();
  if (!bus || !c) return;
  if (document.hidden) bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.1);
  else if (current) {
    nextStepTime = c.currentTime + 0.05; // don't try to catch up on the missed bars
    bus.gain.setTargetAtTime(musicVol(), c.currentTime, 0.3);
  }
});
