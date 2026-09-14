/**
 * Weapon timing/shape data. One entry for now (the sword); the shape is what a
 * data-driven weapon system would key off later.
 *
 * Timeline of a swing (ms): windup frames → swing frames, hitbox live inside
 * [activeFrom, activeTo]. Recovery plays after and can be cancelled by moving.
 */
export const SWORD = {
  windupMs: [25, 30, 35], // attack-in frames 1..3 (frame 0 is a hard cut from idle; skipped)
  swingMs: [40, 40, 40, 45, 55, 50], // attack frames 1..6
  recoverMs: [45, 45, 50, 55], // attack-out frames 0..3
  activeFrom: 130,
  activeTo: 255,
  lunge: 60, // px/s forward during the first frames
  reach: 20, // px the arc's centre sits ahead of the body
  arc: { long: 44, short: 30 }, // hitbox size across / along the facing axis
};
export const SWORD_MS = [...SWORD.windupMs, ...SWORD.swingMs].reduce((a, b) => a + b, 0);
export const SWORD_RECOVER_MS = SWORD.recoverMs.reduce((a, b) => a + b, 0);
