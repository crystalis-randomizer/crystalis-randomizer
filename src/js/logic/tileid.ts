import {Location} from '../rom/location';

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

// Implemented by Entrance, Exit, Spawn, etc...
interface Coordinate {
  x: number;
  y: number;
}
