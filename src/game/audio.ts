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
  | "block" | "plate" | "crystal" | "roar" | "phase" | "victory" | "death" | "ui" | "lesson" | "crack";

let ctx: AudioContext | null = null;
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

/** Call from any user-gesture handler so the context is allowed to start. */
export function unlockAudio() {
  if (!ensure() || !ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
}

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
  hit: () => { noise(0.07, 0.35, 5000, 800); tone("square", [220, 110], 0.08, 0.2); },
  clang: () => { tone("square", 880, 0.05, 0.15); tone("sawtooth", [1400, 900], 0.12, 0.12, 0.01); noise(0.05, 0.15, 6000, 2000); },
  hurt: () => { tone("sawtooth", [320, 110], 0.22, 0.25); noise(0.1, 0.12, 2000, 300); },
  dash: () => noise(0.16, 0.18, 1200, 6000, 0, "highpass"),
  pickup: () => { tone("sine", 660, 0.08, 0.25); tone("sine", 990, 0.12, 0.25, 0.07); },
  key: () => { tone("triangle", 880, 0.08, 0.22); tone("triangle", 1174, 0.08, 0.22, 0.08); tone("triangle", 1760, 0.16, 0.22, 0.16); },
  heart: () => { tone("sine", 523, 0.1, 0.22); tone("sine", 784, 0.18, 0.22, 0.09); },
  chest: () => { tone("triangle", 523, 0.1, 0.22); tone("triangle", 659, 0.1, 0.22, 0.1); tone("triangle", 784, 0.1, 0.22, 0.2); tone("triangle", 1046, 0.3, 0.25, 0.3); },
  door: () => { tone("square", [90, 60], 0.18, 0.25); noise(0.35, 0.18, 900, 200, 0.05); },
  "boss-door": () => { tone("sawtooth", [70, 40], 0.5, 0.3); noise(0.6, 0.2, 700, 120, 0.1); tone("sine", 55, 0.6, 0.25, 0.2); },
  whoosh: () => noise(0.28, 0.2, 500, 3500, 0, "bandpass"),
  catch: () => { noise(0.06, 0.2, 3000, 800); tone("triangle", 440, 0.06, 0.15); },
  stun: () => { tone("triangle", [900, 300], 0.35, 0.22); tone("triangle", [1100, 380], 0.35, 0.12, 0.03); },
  "bomb-place": () => tone("square", [200, 150], 0.06, 0.15),
  bomb: () => { noise(0.45, 0.5, 3000, 80); tone("sine", [120, 30], 0.5, 0.5); },
  potion: () => { tone("sine", [300, 600], 0.12, 0.2); tone("sine", [400, 800], 0.12, 0.2, 0.1); tone("sine", [500, 1000], 0.16, 0.2, 0.2); },
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
