/**
 * Corner-based Wang autotiling for PixelLab top-down tilesets.
 *
 * A PixelLab tileset is a 4x4 sheet of 16 tiles. Each tile is identified by
 * its four corner terrains (NW/NE/SW/SE), each "lower" or "upper". We keep a
 * vertex grid of terrain values and, for each tile cell, look up the tile
 * whose corners match the four surrounding vertices.
 */

export type Terrain = 0 | 1; // 0 = lower (floor), 1 = upper (wall)

interface TileMeta {
  corners: { NW: "lower" | "upper"; NE: "lower" | "upper"; SW: "lower" | "upper"; SE: "lower" | "upper" };
  bounding_box: { x: number; y: number; width: number; height: number };
}

export interface TilesetMeta {
  tile_size: { width: number; height: number };
  tileset_data: { tiles: TileMeta[] };
}

/** Map corner signature (NW,NE,SW,SE bits) -> spritesheet frame index. */
export function buildWangLookup(meta: TilesetMeta): Map<number, number> {
  const tw = meta.tile_size.width;
  const th = meta.tile_size.height;
  const columns = 4; // PixelLab sheets are 4 wide
  const lookup = new Map<number, number>();
  for (const t of meta.tileset_data.tiles) {
    const key = cornerKey(
      t.corners.NW === "upper" ? 1 : 0,
      t.corners.NE === "upper" ? 1 : 0,
      t.corners.SW === "upper" ? 1 : 0,
      t.corners.SE === "upper" ? 1 : 0,
    );
    const col = t.bounding_box.x / tw;
    const row = t.bounding_box.y / th;
    lookup.set(key, row * columns + col);
  }
  return lookup;
}

export function cornerKey(nw: Terrain, ne: Terrain, sw: Terrain, se: Terrain): number {
  return (nw << 3) | (ne << 2) | (sw << 1) | se;
}

/**
 * Given a vertex grid (rows = tilesH + 1, cols = tilesW + 1), return a
 * tilesH x tilesW grid of frame indices.
 */
export function autotile(vertices: Terrain[][], lookup: Map<number, number>): number[][] {
  const h = vertices.length - 1;
  const w = vertices[0].length - 1;
  const out: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const key = cornerKey(vertices[y][x], vertices[y][x + 1], vertices[y + 1][x], vertices[y + 1][x + 1]);
      row.push(lookup.get(key) ?? 0);
    }
    out.push(row);
  }
  return out;
}
