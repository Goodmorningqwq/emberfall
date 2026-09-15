import type { Terrain } from "./wang";
import { TILE, ROOM_W, ROOM_H } from "./room";

/**
 * Dungeon data model. Rooms are authored as 20x12 ASCII maps in
 * src/game/data/<dungeon>.json (see the "legend" block there) and stitched
 * into one big tile grid so the Wang autotiler and the camera see a single
 * continuous world; the "room" is just which screen the camera is parked on.
 */

export interface RoomObject {
  kind: string;
  x: number; // tiles, fractional allowed
  y: number;
}

export interface RoomDef {
  id: string;
  gx: number;
  gy: number;
  name: string;
  purpose: string;
  /** optional second line on the room plate (defaults to the dungeon name) */
  sub?: string;
  map: string[];
  objects?: RoomObject[];
  chests?: string[]; // contents of each "C" in reading order
  signs?: string[]; // text of each "S" in reading order
  clearReward?: string; // "key" | "chest:<item>" — granted when all enemies die
  solveReward?: string; // same, granted when the room's puzzle is solved
}

export interface DungeonDef {
  id: string;
  name: string;
  cols: number;
  rows: number;
  entrance: { room: string; tx: number; ty: number };
  legend: Record<string, string>;
  rooms: RoomDef[];
  tileset?: string;
}

/** A thing placed by a legend character: enemy, prop, pickup spot… */
export interface Placement {
  kind: string;
  ch: string;
  tx: number;
  ty: number;
  index: number; // nth of this kind in the room (reading order)
}

export interface Room extends RoomDef {
  /** world-space rect */
  x: number;
  y: number;
  w: number;
  h: number;
  placements: Placement[];
}

const WALLISH = new Set(["#", "t", "W"]); // tiles that count as wall for the terrain

export class Dungeon {
  readonly def: DungeonDef;
  readonly rooms: Room[];
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** one char per tile for the whole dungeon; "#" where no room exists */
  readonly tiles: string[][];

  constructor(def: DungeonDef) {
    this.def = def;
    this.widthTiles = def.cols * ROOM_W;
    this.heightTiles = def.rows * ROOM_H;
    this.tiles = Array.from({ length: this.heightTiles }, () => Array(this.widthTiles).fill("#"));
    this.rooms = def.rooms.map((r) => {
      if (r.map.length !== ROOM_H || r.map.some((row) => row.length !== ROOM_W)) {
        throw new Error(`room ${r.id}: map must be ${ROOM_W}x${ROOM_H}`);
      }
      const counts: Record<string, number> = {};
      const placements: Placement[] = [];
      for (let y = 0; y < ROOM_H; y++) {
        for (let x = 0; x < ROOM_W; x++) {
          const ch = r.map[y][x];
          this.tiles[r.gy * ROOM_H + y][r.gx * ROOM_W + x] = ch;
          const kind = def.legend[ch];
          if (!kind || ch === "#" || ch === ".") continue;
          counts[kind] = (counts[kind] ?? 0) + 1;
          placements.push({ kind, ch, tx: r.gx * ROOM_W + x, ty: r.gy * ROOM_H + y, index: counts[kind] - 1 });
        }
      }
      return { ...r, x: r.gx * ROOM_W * TILE, y: r.gy * ROOM_H * TILE, w: ROOM_W * TILE, h: ROOM_H * TILE, placements };
    });
  }

  get widthPx() {
    return this.widthTiles * TILE;
  }
  get heightPx() {
    return this.heightTiles * TILE;
  }

  room(id: string): Room {
    const r = this.rooms.find((x) => x.id === id);
    if (!r) throw new Error(`no room ${id}`);
    return r;
  }

  roomAt(gx: number, gy: number): Room | undefined {
    return this.rooms.find((r) => r.gx === gx && r.gy === gy);
  }

  roomAtWorld(x: number, y: number): Room | undefined {
    return this.roomAt(Math.floor(x / (ROOM_W * TILE)), Math.floor(y / (ROOM_H * TILE)));
  }

  isWall(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.widthTiles || ty >= this.heightTiles) return true;
    return WALLISH.has(this.tiles[ty][tx]);
  }

  /** legend kind of a tile ("floor", "water", "wall"...), or undefined off-grid */
  kindAt(tx: number, ty: number): string | undefined {
    if (tx < 0 || ty < 0 || tx >= this.widthTiles || ty >= this.heightTiles) return undefined;
    const ch = this.tiles[ty][tx];
    return this.def.legend[ch] ?? (ch === "#" ? "wall" : ch === "." ? "floor" : undefined);
  }

  /**
   * Rooms you can walk to from `room` right now (a doorway = floor on both sides of the shared
   * wall; cracked walls count once they're broken), with the doorway's world point in `room`.
   */
  exits(room: Room): { room: Room; x: number; y: number; dir: "north" | "south" | "east" | "west" }[] {
    const out: { room: Room; x: number; y: number; dir: "north" | "south" | "east" | "west" }[] = [];
    const ox = room.gx * ROOM_W, oy = room.gy * ROOM_H;
    const open = (tx: number, ty: number) => !this.isWall(tx, ty);
    const east = this.roomAt(room.gx + 1, room.gy);
    if (east && open(ox + ROOM_W - 1, oy + 6) && open(ox + ROOM_W, oy + 6)) out.push({ room: east, x: (ox + ROOM_W) * TILE, y: (oy + 7) * TILE, dir: "east" });
    const west = this.roomAt(room.gx - 1, room.gy);
    if (west && open(ox, oy + 6) && open(ox - 1, oy + 6)) out.push({ room: west, x: ox * TILE, y: (oy + 7) * TILE, dir: "west" });
    const south = this.roomAt(room.gx, room.gy + 1);
    if (south && open(ox + 9, oy + ROOM_H - 1) && open(ox + 9, oy + ROOM_H)) out.push({ room: south, x: (ox + 10) * TILE, y: (oy + ROOM_H) * TILE, dir: "south" });
    const north = this.roomAt(room.gx, room.gy - 1);
    if (north && open(ox + 9, oy + 2) && open(ox + 9, oy - 1)) out.push({ room: north, x: (ox + 10) * TILE, y: (oy + 2) * TILE, dir: "north" });
    return out;
  }

  /** First hop of the shortest walk from `from` to `to` (BFS over doorways), or null if unreachable. */
  nextHop(from: Room, to: Room): { room: Room; x: number; y: number; hops: number } | null {
    if (from === to) return null;
    const prev = new Map<string, { via: Room; door: { x: number; y: number } }>();
    const queue: Room[] = [from];
    const seen = new Set([from.id]);
    while (queue.length) {
      const r = queue.shift()!;
      for (const e of this.exits(r)) {
        if (seen.has(e.room.id)) continue;
        seen.add(e.room.id);
        prev.set(e.room.id, { via: r, door: { x: e.x, y: e.y } });
        if (e.room === to) {
          // walk back to the first hop
          let cur = to, hops = 0, door = { x: e.x, y: e.y };
          for (;;) {
            const p = prev.get(cur.id)!;
            hops++;
            if (p.via === from) return { room: cur, x: p.door.x, y: p.door.y, hops };
            door = p.door;
            cur = p.via;
            void door;
          }
        }
        queue.push(e.room);
      }
    }
    return null;
  }

  setTile(tx: number, ty: number, ch: string) {
    this.tiles[ty][tx] = ch;
  }

  /**
   * Corner (vertex) grid for the Wang autotiler, (H+1)x(W+1). A vertex is
   * wall only when every tile touching it is wall, so a "#" tile is the wall
   * footprint and the tileset's edge pieces grow inward from it.
   */
  vertices(): Terrain[][] {
    const rows: Terrain[][] = [];
    for (let vy = 0; vy <= this.heightTiles; vy++) {
      const row: Terrain[] = [];
      for (let vx = 0; vx <= this.widthTiles; vx++) {
        const all = this.isWall(vx - 1, vy - 1) && this.isWall(vx, vy - 1) && this.isWall(vx - 1, vy) && this.isWall(vx, vy);
        row.push(all ? 1 : 0);
      }
      rows.push(row);
    }
    return rows;
  }

  /**
   * Blocking rects derived from the vertex grid: a tile blocks the 0.6-tile
   * quadrant under each wall corner (that's how thick the tileset draws the
   * wall face), or the whole tile when all four corners are wall.
   */
  collisionRects(v = this.vertices()): { x: number; y: number; w: number; h: number }[] {
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    const F = TILE * 0.6;
    for (let ty = 0; ty < this.heightTiles; ty++) {
      for (let tx = 0; tx < this.widthTiles; tx++) {
        const nw = v[ty][tx], ne = v[ty][tx + 1], sw = v[ty + 1][tx], se = v[ty + 1][tx + 1];
        const n = nw + ne + sw + se;
        if (n === 0) continue;
        const x = tx * TILE, y = ty * TILE;
        if (n === 4) {
          rects.push({ x, y, w: TILE, h: TILE });
          continue;
        }
        if (nw) rects.push({ x, y, w: F, h: F });
        if (ne) rects.push({ x: x + TILE - F, y, w: F, h: F });
        if (sw) rects.push({ x, y: y + TILE - F, w: F, h: F });
        if (se) rects.push({ x: x + TILE - F, y: y + TILE - F, w: F, h: F });
      }
    }
    return mergeRects(rects);
  }
}

/** Merge horizontally adjacent rects of equal height, then vertically. Keeps the body count sane. */
function mergeRects(rs: { x: number; y: number; w: number; h: number }[]) {
  const key = (r: { x: number; y: number; w: number; h: number }) => `${r.x},${r.y},${r.w},${r.h}`;
  let list = rs.map((r) => ({ ...r }));
  for (const axis of ["x", "y"] as const) {
    const byStart = new Map<string, (typeof list)[number]>();
    for (const r of list) byStart.set(key(r), r);
    const out: typeof list = [];
    const used = new Set<string>();
    list.sort((a, b) => (axis === "x" ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y));
    for (const r of list) {
      if (used.has(key(r))) continue;
      used.add(key(r));
      const cur = { ...r };
      for (;;) {
        const next = axis === "x" ? byStart.get(`${cur.x + cur.w},${cur.y},${r.w},${r.h}`) : byStart.get(`${cur.x},${cur.y + cur.h},${r.w},${r.h}`);
        if (!next || used.has(key(next)) || (axis === "x" ? next.h !== cur.h : next.w !== cur.w)) break;
        used.add(key(next));
        if (axis === "x") cur.w += next.w;
        else cur.h += next.h;
      }
      out.push(cur);
    }
    list = out;
  }
  return list;
}
