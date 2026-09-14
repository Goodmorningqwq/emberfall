import Phaser from "phaser";
import { DemoScene } from "./scenes/DemoScene";
import { ROOM_H, ROOM_W, TILE } from "./room";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: ROOM_W * TILE,
    height: ROOM_H * TILE,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#0f110f",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: 2,
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: [DemoScene],
  });
}
