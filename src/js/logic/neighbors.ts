import {UnionFind} from '../unionfind.js';
import {iters} from '../util.js';
import {TileId} from './tileid.js';
import {TilePair} from './tilepair.js';

interface Neighbor {
  from: TileId;
  to: TileId;
  south: boolean;
}

// Utility class for keeping track of neighboring tiles.
// Stores south-only neighbors separately from other directions, for
// the purpose of handling south-pushing triggers and statues.
// Requires an already-built UnionFind so that entire tile groups can
// be handled together.
export class Neighbors implements Iterable<Neighbor> {
  // high 24 = from, low 24 = to
  private readonly south = new Set<TilePair>();
  private readonly other = new Set<TilePair>();
  constructor(private readonly tiles: UnionFind<TileId>,
              private readonly exits: Set<TileId>) {}

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

  // Adds a one-way edge between two tiles, usually in different locations.
  addExit(from: TileId, to: TileId): void {
    from = this.tiles.find(from);
    to = this.tiles.find(to);
    this.other.add(TilePair.of(from, to));
  }

  * [Symbol.iterator](): IterableIterator<Neighbor> {
    const seen = new Set();
    let south = true;
    for (const exit of iters.concat(this.south, [-1 as TilePair], this.other)) {
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
