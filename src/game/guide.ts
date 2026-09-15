import Phaser from "phaser";
import { useGame, type Guide } from "../ui/store";
import { QUEST, questIndex, type QuestState } from "./quests";
import { TILE } from "./room";

/** The store, read the way the quest wants it. */
export function questStateOf(): QuestState {
  const st = useGame.getState();
  return { flags: st.flags, place: st.place, has: (id) => st.items.some((i) => i.id === id && i.qty > 0), shards: st.items.find((i) => i.id === "shard")?.qty ?? 0 };
}

/**
 * The on-screen GPS: a chevron beside Wren pointing at the objective and a short trail of
 * dots ahead of her, plus the store's `guide` for the HUD tracker and minimap marker.
 * Scenes decide *where* (a world point) and call point(); this draws.
 */
export class GuideDrawer {
  private arrow: Phaser.GameObjects.Image;
  private dots: Phaser.GameObjects.Arc[] = [];
  private shown = false;

  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists("chev")) {
      // a gold chevron with a dark rim so it reads on grass, stone and water alike
      const g = scene.add.graphics();
      g.fillStyle(0x2a1a10, 1).fillTriangle(0, 0, 16, 8, 0, 16);
      g.fillStyle(0xffd166, 1).fillTriangle(2, 3, 13, 8, 2, 13);
      g.fillStyle(0x2a1a10, 1).fillTriangle(2, 5, 7, 8, 2, 11);
      g.generateTexture("chev", 16, 16);
      g.destroy();
    }
    this.arrow = scene.add.image(0, 0, "chev").setDepth(9500).setAlpha(0);
    for (let i = 0; i < 4; i++) this.dots.push(scene.add.circle(0, 0, 2, 0xffd166, 0.8).setDepth(-990).setAlpha(0));
  }

  /** Point from Wren (px,py) toward a world point; `where`/`roomId` go to the HUD. Hide when close. */
  point(px: number, py: number, tx: number, ty: number, where: string, roomId?: string) {
    const dx = tx - px, dy = ty - py;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const tiles = Math.round(dist / TILE);
    // quantised so the HUD only re-renders when the reading actually changes
    useGame.getState().setGuide({ angle: Math.round(angle * 16) / 16, tiles, roomId, where });
    // the chevron is the loudest cue there is: only when the thing isn't in plain sight (another room, or
    // more than a screen-quarter away), and only if the player wants it. The tracker still shows the direction.
    const st = useGame.getState();
    const near = where === "here" ? dist < 6 * TILE : dist < 28;
    const on = !near && st.screen === "game" && st.settings.guide;
    this.arrow.setPosition(px + Math.cos(angle) * 34, py - 16 + Math.sin(angle) * 34).setRotation(angle);
    // the chevron breathes so it reads as "go", not as a prop
    const pulse = 0.85 + 0.15 * Math.sin(this.scene.time.now / 180);
    this.arrow.setAlpha(on ? 0.9 * pulse : 0);
    for (const [i, d] of this.dots.entries()) {
      const t = 44 + i * 14;
      d.setPosition(px + Math.cos(angle) * t, py - 2 + Math.sin(angle) * t).setAlpha(on && dist > t + 12 ? 0.55 - i * 0.1 : 0);
    }
    this.shown = on;
  }

  hide() {
    if (!this.shown && this.arrow.alpha === 0) return;
    this.arrow.setAlpha(0);
    for (const d of this.dots) d.setAlpha(0);
    this.shown = false;
    useGame.getState().setGuide(null);
  }

  destroy() {
    this.arrow.destroy();
    for (const d of this.dots) d.destroy();
  }
}

/**
 * When a new step becomes current, announce it once: the objective plate, then the story line
 * as narration. Waits for a quiet moment (no plate, no talk) so it never stacks on a room name.
 */
let lastIdx = -1;
let idxChangedAt = 0;
export function announceQuest(scene: Phaser.Scene, sinceCreateMs: number) {
  const st = useGame.getState();
  if (st.screen !== "game" || sinceCreateMs < 2600) return;
  const idx = questIndex(questStateOf());
  // a step just completed: let the tracker's strike-through read before the next plate lands
  if (idx !== lastIdx) {
    lastIdx = idx;
    idxChangedAt = scene.time.now;
    if (sinceCreateMs > 3000) return;
  }
  if (scene.time.now - idxChangedAt < 2400 && sinceCreateMs > 3000) return;
  const step = QUEST[idx];
  if (!step || st.hasFlag(`quest:${step.id}`)) return;
  if (st.banner || st.dialogue || st.narration || st.shop || st.boss?.intro) return;
  st.setFlag(`quest:${step.id}`);
  st.showBanner({ kind: "quest", title: step.title, sub: step.objective });
  scene.time.delayedCall(2600, () => {
    const g = useGame.getState();
    if (g.banner?.kind === "quest") g.showBanner(null);
    g.setNarration(step.story);
    scene.time.delayedCall(6500, () => useGame.getState().narration === step.story && useGame.getState().setNarration(null));
  });
}
