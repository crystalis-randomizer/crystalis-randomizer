import {Terrain} from './condition.js'; // NOTE: cycle
import {Location} from '../rom/location.js';
import {UnionFind} from '../unionfind.js';

// Implemented by Entrance, Exit, Spawn, etc...
interface Coordinate {
  x: number;
  y: number;
}

// 24-bit unique ID for a single tile:
//   LLLLLLLL YYYYXXXX yyyyxxxx
// where L is 8-bit location ID, (Y, X) is screen, and (y, x) is tile.
export type TileId = number & {__tileId__: never};

export function TileId(x: number): TileId { return x as TileId; }

export namespace TileId {
  export function from({id}: Location, {x, y}: Coordinate): TileId {
    const xs = x >>> 8;
    const xt = (x >>> 4) & 0xf;
    const ys = y >>> 8;
    const yt = (y >>> 4) & 0xf;
    return (id << 16 | ys << 12 | xs << 8 | yt << 4 | xt) as TileId;
  }

  export function add(tile: TileId, dy: number, dx: number): TileId {
    let t: number = tile;
    if (dy) {
      let y = (t & 0xf0) + (dy << 4);
      while (y >= 0xf0) {
        if ((t & 0xf000) >= 0xf000) return -1 as TileId;
        y -= 0xf0;
        t += 0x1000;
      }
      while (y < 0) {
        if (!(t & 0xf000)) return -1 as TileId;
        y += 0xf0
        t -= 0x1000;
      }
      t = t & ~0xf0 | y;
    }
    if (dx) {
      let x = (t & 0xf) + dx;
      while (x >= 0x10) {
        if ((t & 0xf00) >= 0x700) return -1 as TileId;
        x -= 0x10;
        t += 0x100;
      }
      while (x < 0) {
        if (!(t & 0xf00)) return -1 as TileId;
        x += 0x10
        t -= 0x100;
      }
      t = t & ~0xf | x;
    }
    return t as TileId;
  }
}

// 16-bit unique ID for a single screen:
//   LLLLLLLL YYYYXXXX
// where L is 8-bit location ID, (Y, X) is screen.
export type ScreenId = number & {__screenId__: never};

export function ScreenId(x: number): ScreenId { return x as ScreenId; }

export namespace ScreenId {
  export const from: {(tile: TileId): ScreenId;
                      (loc: Location, coordin: Coordinate): ScreenId} =
    (tileOrLoc: TileId | Location, coord?: Coordinate): ScreenId => {
      if (typeof tileOrLoc === 'number' || !coord) {
        return (Number(tileOrLoc) >>> 8) as ScreenId;
      }
      const loc = tileOrLoc as Location;
      return (loc.id << 8 | (coord.y >>> 8) << 4 | coord.x >>> 8) as ScreenId;
    };
  export function fromTile(tile: TileId): ScreenId {
    return (tile >>> 8) as ScreenId;
  }
}

// 48-bit connection between two tiles.
export type TilePair = number & {__tilePair__: never};

export function TilePair(x: number): TilePair { return x as TilePair; }

export namespace TilePair {
  export function of(from: TileId, to: TileId): TilePair {
    return (from * (1 << 24) + to) as TilePair;
  }

  export function split(pair: TilePair): [TileId, TileId] {
    return [Math.floor(pair / (1 << 24)) as TileId,
            pair % (1 << 24) as TileId];
  }
}

export class Neighbors {
  // high 24 = from, low 24 = to
  private readonly south = new Set<TilePair>();
  private readonly other = new Set<TilePair>();
  constructor(private readonly tiles: UnionFind<TileId>, private readonly exits: Set<TileId>) {}

  // NOTE: lo < hi is required, so that lo->hi is south if vertical
  addAdjacent(lo: TileId, hi: TileId, vertical: boolean): void {
    const lo1 = this.tiles.find(lo);
    const hi1 = this.tiles.find(hi);
    if (!this.exits.has(hi)) {
      this.other.add(TilePair.of(hi1, lo1));
    }
    if (!this.exits.has(lo)) {
      (vertical ? this.south : this.other).add(TilePair.of(lo1, hi1));
    }
  }

  addExit(from: TileId, to: TileId): void {
    from = this.tiles.find(from);
    to = this.tiles.find(to);
    this.other.add(TilePair.of(from, to));
  }

  * [Symbol.iterator](): IterableIterator<{from: TileId, to: TileId, south: boolean}> {
    const seen = new Set();
    let south = true;
    for (const exit of concat(this.south, [-1 as TilePair], this.other)) {
      if (exit === -1) {
        south = false;
        continue;
      }
      let [from, to] = TilePair.split(exit);
      from = this.tiles.find(from);
      to = this.tiles.find(to);
      const normalized = TilePair.of(from, to);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      yield {from, to, south};
    }
  }
}

function * concat<T>(...iters: Array<Iterable<T>>): IterableIterator<T> {
  for (const iter of iters) {
    yield * iter;
  }
}

export interface Geometry {
  terrains: Map<TileId, Terrain>;
  domains: UnionFind<TileId>;
  edges: Iterable<[TileId, TileId, boolean]>;
}

// type BuildGeometry = (rom: Rom, overlay: Overlay) => Geometry;
// type ComputeRoutes = (g: Geometry) => Routes;
// type Routes = Map<TileId, MutableRequirement>;
// type AddChecks = (g: Geometry, r: Routes, checks: Check[]): Graph;

// probably combine geometry and condition into files types.
// then geometry will have geometry and these functions
// -> World? (maybe Routes => World)
