import { useGame } from "../ui/store";

/**
 * Tiny WebAudio synth for placeholder SFX — no audio files, every sound is a
 * few oscillators/noise bursts shaped by envelopes. Cheap to iterate on and
 * good enough to make hits, pickups and doors *feel* like something until
 * real samples exist. The context is created on the first user gesture.
 */
export type SfxName =
  | "hit" | "clang" | "hurt" | "dash" | "pickup" | "key" | "heart" | "chest" | "door" | "boss-door"
  | "whoosh" | "catch" | "stun" | "bomb-place" | "bomb" | "potion" | "slime" | "sprite" | "spore"
  | "block" | "plate" | "crystal" | "roar" | "phase" | "victory" | "death" | "ui" | "lesson" | "crack"
  | "drain" | "squeak" | "bones" | "hook"
  | "step" | "step-grass" | "swing" | "effort" | "slime-tell" | "slime-hurt" | "bones-tell" | "bone-hit" | "bat-flap" | "bat-hurt" | "sprite-hurt" | "knight-step" | "growl" | "treant-creak";

let ctx: AudioContext | null = null;
let stepFlip = false;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  // 1s of white noise, reused by every burst
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

/** The shared context/noise for the music sequencer (null until a gesture created it). */
export function audioContext() {
  return ensure() ? ctx : null;
}
export function noiseBuffer() {
  return noiseBuf;
}

/** Call from any user-gesture handler so the context is allowed to start. */
export function unlockAudio() {
  if (!ensure() || !ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  if (wantedAmbient && !ambient) startAmbient(wantedAmbient);
}

// ------------------------------------------------------------------ ambience

export type AmbientName = "town" | "whisperwood" | "crypt";
interface AmbientRig {
  name: AmbientName;
  gain: GainNode;
  nodes: AudioNode[];
  timers: number[];
}
let ambient: AmbientRig | null = null;
let wantedAmbient: AmbientName | null = null;

function ambientVol() {
  const s = useGame.getState().settings;
  return (s.sfx ?? 1) * 0.16;
}

/**
 * A quiet bed per place: wind through leaves (wood), a hollow draught with drips (crypt), breeze and birds
 * (town). Cheap: one looping noise through a slow-swept filter, plus sparse one-shots on a jittered timer.
 * Starts on the first gesture if called before the context is allowed to run.
 */
export function setAmbient(name: AmbientName | null) {
  wantedAmbient = name;
  if (ambient && ambient.name === name) return;
  stopAmbient();
  if (!name) return;
  if (!ensure() || !ctx || ctx.state === "suspended") return; // picked up by unlockAudio
  startAmbient(name);
}

function stopAmbient() {
  if (!ambient || !ctx) return;
  const a = ambient;
  ambient = null;
  for (const t of a.timers) window.clearTimeout(t);
  a.gain.gain.cancelScheduledValues(ctx.currentTime);
  a.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  window.setTimeout(() => {
    for (const n of a.nodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    }
    a.gain.disconnect();
  }, 1500);
}

function startAmbient(name: AmbientName) {
  if (!ctx || !master || !noiseBuf) return;
  const c = ctx;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.setTargetAtTime(ambientVol(), c.currentTime, 1.2);
  gain.connect(master);
  const nodes: AudioNode[] = [];
  const timers: number[] = [];
  // the bed: looping noise, bandpassed, with a slow LFO breathing the cutoff
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  const bedGain = c.createGain();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const bed = { town: { type: "bandpass" as BiquadFilterType, freq: 700, q: 0.7, lfo: 0.08, depth: 250, g: 0.5 }, whisperwood: { type: "bandpass" as BiquadFilterType, freq: 420, q: 0.9, lfo: 0.05, depth: 220, g: 0.8 }, crypt: { type: "lowpass" as BiquadFilterType, freq: 160, q: 1.2, lfo: 0.03, depth: 60, g: 0.9 } }[name];
  f.type = bed.type;
  f.frequency.value = bed.freq;
  f.Q.value = bed.q;
  lfo.frequency.value = bed.lfo;
  lfoGain.gain.value = bed.depth;
  lfo.connect(lfoGain).connect(f.frequency);
  bedGain.gain.value = bed.g;
  src.connect(f).connect(bedGain).connect(gain);
  src.start();
  lfo.start();
  nodes.push(src, f, bedGain, lfo, lfoGain);
  // sparse one-shots into the same gain so the setting scales them too
  const shot = (fn: (t0: number, out: GainNode) => void, minMs: number, maxMs: number) => {
    const tick = () => {
      if (!ambient || ambient.name !== name) return;
      fn(c.currentTime, gain);
      timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
    };
    timers.push(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  const chirp = (t0: number, out: GainNode, base: number) => {
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const o = c.createOscillator();
      const g = c.createGain();
      const t = t0 + i * 0.09;
      o.type = "sine";
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), t);
      o.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.1);
    }
  };
  const drip = (t0: number, out: GainNode) => {
    const o = c.createOscillator();
    const g = c.createGain();
    const f0 = 900 + Math.random() * 900;
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.5, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.3);
  };
  const creak = (t0: number, out: GainNode) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(70 + Math.random() * 40, t0);
    o.frequency.linearRampToValueAtTime(55, t0 + 0.6);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t0 + 0.7);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 0.75);
  };
  if (name === "town") shot((t, o) => chirp(t, o, 2200 + Math.random() * 1200), 2500, 7000);
  if (name === "whisperwood") {
    shot((t, o) => chirp(t, o, 1500 + Math.random() * 600), 6000, 14000);
    shot(creak, 5000, 12000);
  }
  if (name === "crypt") shot(drip, 1200, 4500);
  ambient = { name, gain, nodes, timers };
}

// keep the bed's level in step with the SFX setting
useGame.subscribe((s, prev) => {
  if (s.settings.sfx !== prev.settings.sfx && ambient && ctx) ambient.gain.gain.setTargetAtTime(ambientVol(), ctx.currentTime, 0.2);
});

function vol() {
  const s = useGame.getState().settings;
  return (s.sfx ?? 1) * 0.5;
}

type Wave = OscillatorType;

/** One oscillator note: freq (or a [from, to] sweep), duration, gain envelope. */
function tone(wave: Wave, freq: number | [number, number], dur: number, gain = 0.3, delay = 0, attack = 0.005, curve: "exp" | "lin" = "exp") {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  if (Array.isArray(freq)) {
    o.frequency.setValueAtTime(freq[0], t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, freq[1]), t0 + dur);
  } else o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain * vol(), t0 + attack);
  if (curve === "exp") g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** Filtered noise burst: lowpass cutoff sweeps from `from` to `to` Hz. */
function noise(dur: number, gain = 0.3, from = 4000, to = 400, delay = 0, type: BiquadFilterType = "lowpass") {
  if (!ctx || !master || !noiseBuf) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain * vol(), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const SFX: Record<SfxName, () => void> = {
  // a blade landing: click, body thump, short ring
  hit: () => { noise(0.04, 0.4, 7000, 2500); tone("sine", [180, 70], 0.11, 0.35); tone("triangle", [900, 500], 0.06, 0.1, 0.01); },
  clang: () => { tone("square", 880, 0.05, 0.15); tone("sawtooth", [1400, 900], 0.12, 0.12, 0.01); noise(0.05, 0.15, 6000, 2000); },
  hurt: () => { tone("sawtooth", [320, 110], 0.22, 0.25); noise(0.1, 0.12, 2000, 300); },
  dash: () => noise(0.16, 0.18, 1200, 6000, 0, "highpass"),
  pickup: () => { tone("sine", 660, 0.08, 0.25); tone("sine", 990, 0.12, 0.25, 0.07); },
  key: () => { tone("triangle", 880, 0.08, 0.22); tone("triangle", 1174, 0.08, 0.22, 0.08); tone("triangle", 1760, 0.16, 0.22, 0.16); },
  heart: () => { tone("sine", 523, 0.1, 0.22); tone("sine", 784, 0.18, 0.22, 0.09); },
  chest: () => { tone("triangle", 523, 0.1, 0.22); tone("triangle", 659, 0.1, 0.22, 0.1); tone("triangle", 784, 0.1, 0.22, 0.2); tone("triangle", 1046, 0.3, 0.25, 0.3); },
  // heavy wood: latch click, then the swing and a thud
  door: () => { tone("square", 1800, 0.02, 0.1); noise(0.3, 0.14, 700, 250, 0.05); tone("sine", [110, 50], 0.28, 0.3, 0.2); noise(0.06, 0.25, 1500, 300, 0.22); },
  "boss-door": () => { tone("sawtooth", [70, 40], 0.5, 0.3); noise(0.6, 0.2, 700, 120, 0.1); tone("sine", 55, 0.6, 0.25, 0.2); },
  whoosh: () => noise(0.28, 0.2, 500, 3500, 0, "bandpass"),
  catch: () => { noise(0.06, 0.2, 3000, 800); tone("triangle", 440, 0.06, 0.15); },
  stun: () => { tone("triangle", [900, 300], 0.35, 0.22); tone("triangle", [1100, 380], 0.35, 0.12, 0.03); },
  "bomb-place": () => tone("square", [200, 150], 0.06, 0.15),
  bomb: () => { noise(0.45, 0.5, 3000, 80); tone("sine", [120, 30], 0.5, 0.5); },
  // three gulps and a sparkle
  potion: () => { for (const i of [0, 1, 2]) tone("sine", [260 + i * 60, 520 + i * 90], 0.09, 0.2, i * 0.11); tone("triangle", 1568, 0.18, 0.12, 0.36); tone("triangle", 2093, 0.24, 0.1, 0.42); },
  slime: () => { tone("sine", [200, 80], 0.18, 0.25); noise(0.12, 0.12, 1500, 300); },
  sprite: () => { tone("sine", [1400, 2400], 0.1, 0.12); tone("sine", [2400, 600], 0.14, 0.12, 0.1); },
  spore: () => noise(0.5, 0.15, 400, 1200, 0, "bandpass"),
  block: () => { tone("square", [110, 70], 0.16, 0.2); noise(0.2, 0.2, 800, 150); },
  plate: () => { tone("square", [160, 100], 0.1, 0.2); tone("sine", 660, 0.25, 0.18, 0.12); tone("sine", 880, 0.3, 0.18, 0.22); },
  crystal: () => { tone("sine", 1318, 0.4, 0.22); tone("sine", 1975, 0.5, 0.18, 0.05); tone("sine", 2637, 0.6, 0.12, 0.1); },
  roar: () => { tone("sawtooth", [60, 45], 0.7, 0.35); tone("square", [95, 70], 0.7, 0.15, 0.05); noise(0.7, 0.2, 500, 100, 0.1); },
  phase: () => { tone("sawtooth", [55, 40], 0.5, 0.3); tone("sine", 41, 0.6, 0.3, 0.1); },
  victory: () => { for (const [i, f] of [523, 659, 784, 1046, 1318].entries()) tone("triangle", f, 0.35, 0.22, i * 0.11); },
  death: () => { tone("sawtooth", [220, 40], 0.9, 0.3, 0, 0.01, "lin"); noise(0.5, 0.12, 1000, 100, 0.2); },
  ui: () => tone("square", 1200, 0.03, 0.08),
  lesson: () => { tone("sine", 880, 0.06, 0.12); tone("sine", 1320, 0.1, 0.12, 0.06); },
  crack: () => { noise(0.4, 0.4, 2500, 150); tone("square", [140, 60], 0.3, 0.3); },
  // water sinking away: a long falling gurgle under a hiss
  drain: () => { tone("sine", [220, 60], 1.1, 0.2, 0, 0.02, "lin"); tone("triangle", [330, 90], 0.9, 0.1, 0.15); noise(1.2, 0.14, 900, 300, 0.1, "bandpass"); },
  // a bat's dart
  squeak: () => { tone("square", [2800, 3600], 0.05, 0.08); tone("square", [3600, 2200], 0.07, 0.08, 0.05); },
  // a skeleton coming apart
  bones: () => { noise(0.12, 0.3, 4000, 1200); tone("square", [500, 180], 0.1, 0.12); tone("square", [700, 260], 0.08, 0.1, 0.06); tone("square", [380, 120], 0.12, 0.1, 0.12); },
  // ---- Wren
  // a boot on stone / on turf: alternating pitch so a walk doesn't tick like a clock
  step: () => { stepFlip = !stepFlip; noise(0.05, 0.16, stepFlip ? 1800 : 1400, 500); tone("sine", stepFlip ? 140 : 120, 0.04, 0.12); },
  "step-grass": () => { stepFlip = !stepFlip; noise(0.07, 0.1, stepFlip ? 900 : 700, 250, 0, "bandpass"); },
  // the blade through the air
  swing: () => noise(0.16, 0.22, 900, 4500, 0, "bandpass"),
  // a short breath of effort under a swing
  effort: () => { noise(0.09, 0.08, 500, 1200, 0, "bandpass"); tone("triangle", [330, 260], 0.09, 0.05); },
  // ---- monsters
  "slime-tell": () => { tone("sine", [180, 320], 0.12, 0.14); tone("sine", [220, 380], 0.1, 0.1, 0.06); },
  "slime-hurt": () => { tone("sine", [420, 160], 0.12, 0.2); noise(0.08, 0.1, 1200, 300); },
  "bones-tell": () => { for (const i of [0, 1, 2, 3]) tone("square", 900 + i * 130, 0.03, 0.08, i * 0.045); },
  "bone-hit": () => { noise(0.05, 0.25, 5000, 1500); tone("square", [700, 300], 0.06, 0.12); },
  "bat-flap": () => { for (const i of [0, 1, 2]) noise(0.05, 0.12, 600, 1500, i * 0.07, "bandpass"); },
  "bat-hurt": () => { tone("square", [3200, 1800], 0.09, 0.08); tone("square", [2600, 900], 0.1, 0.06, 0.05); },
  "sprite-hurt": () => { tone("sine", [1800, 2600], 0.06, 0.1); tone("sine", [2600, 1200], 0.08, 0.08, 0.05); },
  "knight-step": () => { tone("sine", [90, 50], 0.14, 0.3); noise(0.06, 0.2, 800, 200); },
  growl: () => { tone("sawtooth", [90, 70], 0.45, 0.16); tone("sawtooth", [136, 100], 0.4, 0.08, 0.03); noise(0.4, 0.06, 300, 120, 0, "bandpass"); },
  "treant-creak": () => { tone("sawtooth", [80, 130], 0.5, 0.12, 0, 0.05, "lin"); noise(0.45, 0.08, 400, 900, 0.05, "bandpass"); },
  // the grapple biting into stone
  hook: () => { tone("square", 1500, 0.03, 0.15); noise(0.08, 0.25, 5000, 1500); tone("triangle", [600, 200], 0.14, 0.12, 0.03); },
};

export function sfx(name: SfxName) {
  if (!ensure() || !ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  if (vol() <= 0) return;
  try {
    SFX[name]();
  } catch {
    /* audio is decoration; never let it break the game */
  }
}
