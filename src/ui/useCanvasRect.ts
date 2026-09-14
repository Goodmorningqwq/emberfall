import { useEffect, useState } from "react";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Tracks the on-screen rect of the Phaser canvas so UI can anchor to the game
 * frame instead of the browser window (the canvas is letterboxed by FIT).
 */
export function useCanvasRect(): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    let canvas: HTMLCanvasElement | null = null;
    let ro: ResizeObserver | null = null;
    const measure = () => {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };
    const attach = () => {
      canvas = document.querySelector("#game canvas");
      if (!canvas) return false;
      ro = new ResizeObserver(measure);
      ro.observe(canvas);
      window.addEventListener("resize", measure);
      measure();
      return true;
    };
    // Phaser creates the canvas after React mounts; poll briefly until it exists
    const timer = setInterval(() => attach() && clearInterval(timer), 50);
    return () => {
      clearInterval(timer);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return rect;
}

/**
 * Integer UI scale: pixel-art chrome is authored at 1x and scaled by a whole
 * number so pixels stay square. 560px of frame ≈ one step (1280 → 2x, 1920 → 3x).
 */
/** Integer UI scale locked to the game's own pixel scale (canvas px per game px), so 1 UI px = 1 game px. */
export function uiScale(rect: Rect | null): number {
  if (!rect) return 2;
  return Math.min(4, Math.max(1, Math.round(rect.width / 640)));
}
