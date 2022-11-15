import {TileId} from './tileid';

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
