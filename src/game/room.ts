import type { Terrain } from "./wang";

export const TILE = 32;
export const ROOM_W = 20; // tiles
export const ROOM_H = 12;

/**
 * Demo room: Whisperwood Hollow antechamber.
 * Vertex grid is (ROOM_H+1) x (ROOM_W+1). 1 = wall, 0 = floor.
 * Top wall is two tiles thick so the door has somewhere to sit.
 */
export function buildRoomVertices(): Terrain[][] {
  const rows: Terrain[][] = [];
  for (let y = 0; y <= ROOM_H; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x <= ROOM_W; x++) {
      const wall = x === 0 || x === ROOM_W || y <= 2 || y >= ROOM_H;
      row.push(wall ? 1 : 0);
    }
    rows.push(row);
  }
  return rows;
}

/** Axis-aligned world rects the player can't enter (walls). */
export function wallRects(): { x: number; y: number; w: number; h: number }[] {
  const W = ROOM_W * TILE;
  const H = ROOM_H * TILE;
  return [
    { x: 0, y: 0, w: W, h: TILE * 2.6 }, // top wall + its face
    { x: 0, y: H - TILE * 0.6, w: W, h: TILE }, // bottom wall
    { x: 0, y: 0, w: TILE * 0.6, h: H }, // left
    { x: W - TILE * 0.6, y: 0, w: TILE, h: H }, // right
  ];
}

export interface PropSpec {
  key: string;
  tx: number; // tile x of the prop's top-left
  ty: number;
  solid: boolean;
}

export const PROPS: PropSpec[] = [
  { key: "door", tx: 9, ty: 1, solid: true },
  { key: "torch", tx: 7, ty: 1.4, solid: false },
  { key: "torch", tx: 12, ty: 1.4, solid: false },
  { key: "block", tx: 5, ty: 4, solid: true },
  { key: "block", tx: 6, ty: 7, solid: true },
  { key: "chest", tx: 15, ty: 3, solid: true },
];

export const PLAYER_SPAWN = { tx: 9.5, ty: 6 };
export const SLIME_SPAWNS = [
  { tx: 12.5, ty: 6.5 },
  { tx: 4.5, ty: 8.5 },
];
