import { createRoot } from "react-dom/client";
import { HUD } from "./ui/HUD";
import { createGame } from "./game/config";

createRoot(document.getElementById("ui")!).render(<HUD />);
createGame(document.getElementById("game")!);
