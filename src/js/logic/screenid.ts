import {Location} from '../rom/location';
import {TileId} from './tileid';

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

// Implemented by Entrance, Exit, Spawn, etc...
interface Coordinate {
  x: number;
  y: number;
}
