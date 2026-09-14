import { createRoot } from "react-dom/client";
import { HUD } from "./ui/HUD";
import { createGame } from "./game/config";
import { unlockAudio } from "./game/audio";

if (import.meta.env.DEV) {
  // an exception inside Phaser's step aborts the render silently; make it loud
  window.addEventListener("error", (e) => console.error("[uncaught]", e.error?.stack ?? e.message));
}

// browsers only start audio after a gesture; any first click/key does it
for (const ev of ["pointerdown", "keydown"]) window.addEventListener(ev, unlockAudio, { once: true });
createRoot(document.getElementById("ui")!).render(<HUD />);
const game = createGame(document.getElementById("game")!);
if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = game; // console access for playtesting
