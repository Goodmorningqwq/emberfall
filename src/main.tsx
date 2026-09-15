import { createRoot } from "react-dom/client";
import { HUD } from "./ui/HUD";
import { createGame } from "./game/config";
import { unlockAudio } from "./game/audio";
import { resumeMusic, setMusic, stopMusic, duckMusic } from "./game/music";
import { useGame } from "./ui/store";

if (import.meta.env.DEV) {
  // an exception inside Phaser's step aborts the render silently; make it loud
  window.addEventListener("error", (e) => console.error("[uncaught]", e.error?.stack ?? e.message));
}

// browsers only start audio after a gesture; any first click/key does it
for (const ev of ["pointerdown", "keydown"]) window.addEventListener(ev, () => { unlockAudio(); resumeMusic(); }, { once: true });
// music follows the screen: the title theme on the menus, silence on death; menus and talk duck whatever plays
useGame.subscribe((s, prev) => {
  if (s.screen !== prev.screen) {
    if (s.screen === "title" || s.screen === "intro") setMusic("title");
    else if (s.screen === "dead") stopMusic();
  }
  const quiet = s.paused || s.bagOpen || !!s.shop || !!s.dialogue || s.screen === "complete";
  const wasQuiet = prev.paused || prev.bagOpen || !!prev.shop || !!prev.dialogue || prev.screen === "complete";
  if (quiet !== wasQuiet) duckMusic(quiet);
});
if (useGame.getState().screen === "title") setMusic("title");
createRoot(document.getElementById("ui")!).render(<HUD />);
const game = createGame(document.getElementById("game")!);
if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = game; // console access for playtesting
