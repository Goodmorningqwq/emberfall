import { createRoot } from "react-dom/client";
import { HUD } from "./ui/HUD";
import { createGame } from "./game/config";
import { unlockAudio } from "./game/audio";
import { resumeMusic, setMusic, stopMusic, duckMusic } from "./game/music";
import { stopNpc } from "./game/audio";
import { useGame } from "./ui/store";
import { isDebug } from "./game/debug";

// an exception inside Phaser's step aborts the render silently: log it, and if the game never got as far
// as showing its canvas, say so on screen instead of leaving a black square under the menu
window.addEventListener("error", (e) => {
  console.error("[uncaught]", e.error?.stack ?? e.message);
  const canvas = document.querySelector("#game canvas");
  if ((canvas && !canvas.classList.contains("ready")) || isDebug()) bootError(String(e.message ?? "error"));
});
function bootError(msg: string) {
  if (document.getElementById("boot-error")) return;
  const el = document.createElement("div");
  el.id = "boot-error";
  el.textContent = `Something broke - reload the page. (${__APP_VERSION__}${isDebug() ? ` - ${msg}` : ""})`;
  document.getElementById("app")?.appendChild(el);
}

// browsers only start audio after a gesture; any first click/key does it
for (const ev of ["pointerdown", "keydown"]) window.addEventListener(ev, () => { unlockAudio(); resumeMusic(); }, { once: true });
// music follows the screen: the title theme on the menus, silence on death; menus and talk duck whatever plays
useGame.subscribe((s, prev) => {
  if (s.screen !== prev.screen) {
    if (s.screen === "title" || s.screen === "intro") setMusic("title");
    else if (s.screen === "dead") stopMusic();
  }
  const quiet = s.paused || s.bagOpen || s.journalOpen || !!s.shop || !!s.dialogue || s.screen === "complete";
  const wasQuiet = prev.paused || prev.bagOpen || prev.journalOpen || !!prev.shop || !!prev.dialogue || prev.screen === "complete";
  if (quiet !== wasQuiet) duckMusic(quiet);
  // closing the box cuts the townsperson off mid-line
  if (!s.dialogue && prev.dialogue) stopNpc();
});
if (useGame.getState().screen === "title") setMusic("title");
createRoot(document.getElementById("ui")!).render(<HUD />);
const game = createGame(document.getElementById("game")!);
if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = game; // console access for playtesting
if (isDebug()) {
  // a plain number every 2 s: the one input #27's depth-sort question needs
  window.setInterval(() => console.log(`[emberfall ${__APP_VERSION__}] fps ${game.loop.actualFps.toFixed(0)}`), 2000);
}
