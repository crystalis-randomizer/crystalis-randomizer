import {Terrain} from './terrain.js';
import {TileEffects} from './tileeffects.js';
import {Rom} from '../rom.js';
import {UnionFind} from '../unionfind.js';

// A tile is a 24-bit number:
//   <loc><ys><xs><yt><xt>
// We do a giant flood-fill of the entire game, starting at $000055 or whatever.
// Filling is a union-find, so we start by assigning each element itself, but
// when we find a neighbor, we join them.

export class LocationGraph {

  // All tiles unioned by same reachability.
  private readonly tiles = new UnionFind<number>();

  // Exits between groups of different reachability.
  // Optional third element is list of requirements to use the exit.
  // private readonly exits = new Array<[number, number, number[][]?]>();

  // Blocks for any given tile group.
  // private readonly blocks = new Array<[number, number[][]]>();

  constructor(readonly rom: Rom, start = 0) {    
    // 1. start with entrance 0 at the start location, add it to the tiles and queue.
    // 2. for tile T in the queue
    //    - for each passable neighbor N of T:
    //      - if N has the same passage as T, union them
    //      - if N has different passage, add an exit from T to N
    //      - if N is not yet seen, add it to the queue
    // passage can be one of:
    //  - open
    //  - blocked(item/trigger - both are just numbers...)
    //  - one-way 

    // Start by getting a full map of all terrains and triggers
    const terrains = new Map<number, Terrain>();

    for (const location of rom.locations) {
      const ext = location.extended ? 0x100 : 0;
      const locBits = location.id << 16;
      const tileset = rom.tilesets[location.tileset];
      const tileEffects = rom.tileEffects[location.tileEffects];

      // Add terrains
      for (let y = 0, height = location.height; y < height; y++) {
        const row = location.screens[y];
        const rowBits = locBits | (y << 12);
        for (let x = 0, width = location.width; x < width; x++) {
          const screen = rom.screens[row[x] | ext];
          const scrBits = rowBits | (x << 8);
          const flagYx = y << 4 | x;
          const flag = location.flags.find(f => f.yx === flagYx);
          const flagTerrain = flag && {enter: [[flag.flag]]};
          const flagFlyTerrain = flag && {enter: [[flag.flag], Terrain.FLY.enter[0]]};
          for (let t = 0; t < 0xf0; t++) {
            const tid = scrBits | t;
            const tile = screen.tiles[t];
            const effects = tileEffects.effects[tile] & 0x26;
            let terrain: Terrain | undefined = Terrain.OPEN;
            if (effects & TileEffects.SLOPE) {
              terrain = effects & TileEffects.NO_WALK ? Terrain.WATERFALL : Terrain.SLOPE;
            } else if (tile < 0x20 && tileset.alternates[tile] !== tile && flagTerrain &&
                       !(tileEffects.effects[tileset.alternates[tile]] & TileEffects.NO_WALK)) {
              terrain = effects & TileEffects.IMPASSIBLE ? flagTerrain : flagFlyTerrain;
            } else if (effects & TileEffects.IMPASSIBLE) {
              terrain = undefined;
            } else if (effects & TileEffects.NO_WALK) {
              terrain = Terrain.FLY;
            }
            if (terrain) terrains.set(tid, terrain);
          }          
        }
      }

      // Add exits
      for (const exit of location.exits) {
        if (exit.entrance === 0x20) {
          terrains.set(parseCoord(location.id, exit), Terrain.SEAMLESS);
        }
      }

      // Find "terrain triggers" that prevent movement one way or another
      for (const spawn of location.spawns) {
        if (spawn.isTrigger()) {
          // For triggers, which tiles do we mark?
          // The trigger hitbox is 2 tiles wide and 1 tile tall, but it does not
          // line up nicely to the tile grid.  Also, the player hitbox is only
          // $c wide (though it's $14 tall) so there's some slight disparity.
          // It seems like probably marking it as (x-1, y-1) .. (x, y) makes the
          // most sense, with the caveat that triggers shifted right by a half
          // tile should go from x .. x+1 instead.
          const trigger = TRIGGERS[spawn.id];
          // TODO - consider checking trigger's action: $19 -> push-down message
          if (trigger) {
            let {x: x0, y: y0} = spawn;
            x0 += 8;
            for (const dx of [-16, 0]) {
              for (const dy of [-16, 0]) {
                terrains.set(parseCoord(location.id, {x: x0 + dx, y: y0 + dy}), trigger);
              }
            }
          }
        }
      }
    }

    // At this point we've got a full mapping of all terrains per location.
    // Now we do a giant unionfind and establish connections between same areas.
    for (const [tile, terrain] of terrains) {
      const x1 = tileAdd(tile, 0, 1);
      if (terrains.get(x1) === terrain) this.tiles.union([tile, x1]);
      const y1 = tileAdd(tile, 1, 0);
      if (terrains.get(y1) === terrain) this.tiles.union([tile, y1]);
    }

    // Add exits to a map.  We do this *after* the initial unionfind so that
    // two-way exits can be unioned easily.
    const exitSet = new Set<number>();
    for (const location of rom.locations) {
      for (const exit of location.exits) {
        const {dest, entrance} = exit;
        const from = this.tiles.find(parseCoord(location.id, exit));
        const to =
            this.tiles.find(
                // Handle seamless exits
                entrance === 0x20 ?
                    from & 0xffff | (dest << 16) :
                    parseCoord(dest, rom.locations[dest].entrances[entrance]));
        exitSet.add(from * (1 << 24) + to);
        // exitMap.set(this.tiles.find(from), this.tiles.find(to));
      }
    }
    for (const exit of exitSet) {
      const from = Math.floor(exit / (1 << 24));
      const to = exit % (1 << 24);
      if (terrains.get(from) !== terrains.get(to)) continue;
      const reverse = to * (1 << 24) + from;
      if (exitSet.has(reverse)) {
        this.tiles.union([from, to]);
        exitSet.delete(exit);
        exitSet.delete(reverse);
      }
    }

    // Now look for all different-terrain neighbors and track connections.
    const neighbors = new Neighbors(this.tiles);
    for (const [tile, terrain] of terrains) {
      const x1 = tileAdd(tile, 0, 1);
      const tx1 = terrains.get(x1);
      if (tx1 && tx1 !== terrain) neighbors.addAdjacent(tile, x1, true);
      const y1 = tileAdd(tile, 1, 0);
      const ty1 = terrains.get(y1);
      if (ty1 && ty1 !== terrain) neighbors.addAdjacent(tile, y1, true);
    }

    // Also add all the remaining exits.  We decompose and recompose them to
    // take advantage of any new unions from the previous exit step.
    for (const exit of exitSet) {
      const from = Math.floor(exit / (1 << 24));
      const to = exit % (1 << 24);
      neighbors.addExit(from, to);
    }

    // const entrance = rom.locations[start].entrances[0];
    // this.addEntrance(parseCoord(start, entrance));
  }
}



// Adds the given delta to the tile address.
function tileAdd(tile: number, dy: number, dx: number): number {
  if (dy) {
    let y = (tile & 0xf0) + (dy << 4);
    while (y >= 0xf0) {
      if ((tile & 0xf000) >= 0xf000) return -1;
      y -= 0xf0;
      tile += 0x1000;
    }
    while (y < 0) {
      if (!(tile & 0xf000)) return -1;
      y += 0xf0
      tile -= 0x1000;
    }
    tile = tile & ~0xf0 | y;
  }
  if (dx) {
    let x = (tile & 0xf) + dx;
    while (x >= 0x10) {
      if ((tile & 0xf00) >= 0x700) return -1;
      x -= 0x10;
      tile += 0x100;
    }
    while (x < 0) {
      if (!(tile & 0xf00)) return -1;
      x += 0x10
      tile -= 0x100;
    }
    tile = tile & ~0xf | x;
  }
  return tile;
}


class Neighbors {
  // high 24 = from, low 24 = to
  private readonly south = new Set<number>();
  private readonly other = new Set<number>();
  constructor(private readonly tiles: UnionFind<number>) {}

  // NOTE: lo < hi is required, so that lo->hi is south if vertical
  addAdjacent(lo: number, hi: number, vertical: boolean): void {
    lo = this.tiles.find(lo);
    hi = this.tiles.find(hi);
    this.other.add(hi * (1 << 24) + lo);
    (vertical ? this.south : this.other).add(lo * (1 << 24) + hi);
  }

  addExit(from: number, to: number): void {
    from = this.tiles.find(from);
    to = this.tiles.find(to);
    this.other.add(from * (1 << 24) + to);
  }

  * [Symbol.iterator](): IterableIterator<{from: number, to: number, south: boolean}> {
    const seen = new Set();
    let south = true;
    for (const exit of concat(this.south, [-1], this.other)) {
      if (exit === -1) {
        south = false;
        continue;
      }
      const from = this.tiles.find(Math.floor(exit / (1 << 24)));
      const to = this.tiles.find(exit % (1 << 24));
      const normalized = from * (1 << 24) + to;
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

interface Coordinate {
  x: number;
  y: number;
}

function parseCoord(location: number, {x, y}: Coordinate): number {
  // Works with both entrances and exits
  const xs = x >>> 8;
  const xt = (x >>> 4) & 0xf;
  const ys = y >>> 8;
  const yt = (y >>> 4) & 0xf;
  return location << 16 | ys << 12 | xs << 8 | yt << 4 | xt;
}

enum Events {
  // different number?  from flag?
  talkedToLeafRabbit = -1,
}

const TRIGGERS: {[id: number]: Terrain} = {
  0x86: {
    exit: [[Events.talkedToLeafRabbit]],
    exitSouth: [[]], // open
  },
};
