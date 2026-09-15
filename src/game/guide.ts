import Phaser from "phaser";
import { useGame, type Guide } from "../ui/store";
import { QUEST, questIndex, type QuestState } from "./quests";
import { TILE } from "./room";

/** The store, read the way the quest wants it. */
export function questStateOf(): QuestState {
  const st = useGame.getState();
  return { flags: st.flags, place: st.place, has: (id) => st.items.some((i) => i.id === id && i.qty > 0), shards: st.items.find((i) => i.id === "shard")?.qty ?? 0, counters: st.counters };
}

/**
 * The on-screen GPS: a chevron beside Wren pointing at the objective and a short trail of
 * dots ahead of her, plus the store's `guide` for the HUD tracker and minimap marker.
 * Scenes decide *where* (a world point) and call point(); this draws.
 */
export class GuideDrawer {
  private mark: Phaser.GameObjects.Image;
  private shown = false;

  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists("qmark")) {
      // a small gold square with a dark rim: the same mark the minimap uses for the objective room
      const g = scene.add.graphics();
      g.fillStyle(0x2a1a10, 1).fillRect(0, 0, 10, 10);
      g.fillStyle(0xffd166, 1).fillRect(2, 2, 6, 6);
      g.fillStyle(0xfff2b0, 1).fillRect(3, 3, 2, 2);
      g.generateTexture("qmark", 10, 10);
      g.destroy();
    }
    this.mark = scene.add.image(0, 0, "qmark").setDepth(9500).setAlpha(0);
  }

  /**
   * Point from Wren (px,py) toward a world point. On screen: the mark hangs over the thing itself.
   * Off screen: it sits at the edge of the view in that direction (the Star Rail way). The HUD gets
   * the reading for the tracker line and the minimap marker.
   */
  point(px: number, py: number, tx: number, ty: number, where: string, roomId?: string, anchor?: string) {
    const dx = tx - px, dy = ty - py;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const tiles = Math.round(dist / TILE);
    // quantised so the HUD only re-renders when the reading actually changes
    useGame.getState().setGuide({ angle: Math.round(angle * 16) / 16, tiles, roomId, where, anchor });
    const st = useGame.getState();
    const on = dist > 20 && st.screen === "game" && st.settings.guide;
    const cam = this.scene.cameras.main;
    const M = 14;
    const inView = tx > cam.scrollX + M && tx < cam.scrollX + cam.width - M && ty > cam.scrollY + M + 40 && ty < cam.scrollY + cam.height - M - 44;
    let mx: number, my: number;
    if (inView) {
      mx = tx;
      my = ty - 18 - Math.sin(this.scene.time.now / 160) * 3; // hovers over the thing
    } else {
      // clamp the ray from Wren to the view's inner rectangle (below the top HUD, above the hotbar)
      const left = cam.scrollX + M, right = cam.scrollX + cam.width - M, top = cam.scrollY + M + 40, bottom = cam.scrollY + cam.height - M - 44;
      const cx = Phaser.Math.Clamp(px, left, right), cy = Phaser.Math.Clamp(py, top, bottom);
      let t = Infinity;
      if (dx > 0) t = Math.min(t, (right - cx) / dx);
      if (dx < 0) t = Math.min(t, (left - cx) / dx);
      if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
      if (dy < 0) t = Math.min(t, (top - cy) / dy);
      if (!isFinite(t)) t = 0;
      mx = Phaser.Math.Clamp(cx + dx * t, left, right);
      my = Phaser.Math.Clamp(cy + dy * t, top, bottom);
    }
    this.mark.setPosition(mx, my).setAlpha(on ? 0.75 + 0.25 * Math.sin(this.scene.time.now / 220) : 0);
    this.shown = on;
  }

  hide() {
    if (!this.shown && this.mark.alpha === 0) return;
    this.mark.setAlpha(0);
    this.shown = false;
    useGame.getState().setGuide(null);
  }

  destroy() {
    this.mark.destroy();
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
  if (st.banner || st.dialogue || st.narration || st.shop || st.boss?.intro || st.journalOpen || st.bagOpen || st.paused) return;
  st.setFlag(`quest:${step.id}`);
  st.showBanner({ kind: "quest", title: step.title, sub: step.objective });
  scene.time.delayedCall(2600, () => {
    const g = useGame.getState();
    if (g.banner?.kind === "quest") g.showBanner(null);
    g.setNarration(step.story);
    scene.time.delayedCall(6500, () => useGame.getState().narration === step.story && useGame.getState().setNarration(null));
  });
}
