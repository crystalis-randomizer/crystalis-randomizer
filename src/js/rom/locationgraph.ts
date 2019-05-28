import {Entrance, Exit, Location} from './location.js';
import {Screen} from './screen.js';
import {Terrain} from './terrain.js';
import {TileEffects} from './tileeffects.js';
import {Tileset} from './tileset.js';
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
  private readonly exits = new Array<[number, number, number[]?]>();
  // Blocks for any given tile group.
  private readonly blocks = new Array<[number, number[]]>();

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
    // NOTE: if a tile is in the exitMap, there are no other exits!
    // This should make seamless exits work correctly?
    const exitMap = new Map<number, number>();
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
          for (let t = 0; t < 0xf0; t++) {
            const tid = scrBits | t;
            const tile = screen.tiles[t];
            const effects = tileEffects.effects[tile] & 0x26;
            let terrain: Terrain | undefined = Terrain.OPEN;
            if (effects & TileEffects.SLOPE) {
              terrain = effects & TileEffects.NO_WALK ? Terrain.WATERFALL : Terrain.SLOPE;
            } else if (tile < 0x20 && tileset.alternates[tile] !== tile && flag &&
                       !(tileEffects.effects[tileset.alternates[tile]] & TileEffects.IMPASSIBLE)) {
              terrain = {enter: [[flag.flag]]};
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
        const {dest, entrance} = exit;
        const from = parseEntrance(location.id, exit);
        const to =
            // Handle seamless exits
            entrance === 0x20 ?
                from & 0xffff | (dest << 16) :
                parseEntrance(dest, rom.locations[dest].entrances[entrance]);
        exitMap.set(from, to);
      }

      for (const spawn of location.spawns) {
        // Add flags and triggers....?
        if (spawn.isTrigger()) {
          const trigger = TRIGGERS[spawn.id];
          if (trigger) {
            // TODO - which tiles to tag?  trigger is 2 wide and 1 tall, but
            // player hitbox is slightly bigger ($c x $14)
            // It's not perfect (we'd need to model pixels, which isn't worth it)
            // but given a trigger at (x, y) set terrain (x-1, y-1) ... (x, y);
            // or (x, y-1) ... (x+1, y) if the trigger is shifted a half tile right.
          }
        }


      }

      
    }

    const neighors = new Exits(this.tiles);

    // returns 
    function getTerrain(tile: number): number {
      const ys = (tile >>> 12) & 0xf;
      const xs = (tile >>> 8) & 0xf;
      // const yt = (tile >>> 4) & 0xf;
      // const xt = tile & 0xf;
      const tyx = tile & 0xff;
      const location = rom.locations[tile >>> 16];
      const tile = screen.tiles[tyx];
      return 
    }

    function addEntrance(tile: number): void {

    }



    const entrance = rom.locations[start].entrances[0];



    this.addEntrance(parseEntrance(start, entrance));
  }

  addEntrance(tile: number): void {
    this.
  }

}


class Exits {
  // high 24 = from, low 24 = to
  private readonly south = new Set<number>();
  private readonly other = new Set<number>();
  constructor(private readonly tiles: UnionFind<number>) {}

  add(from: number, to: number): void {
    const exit = this.tiles.find(from) * (1 << 24) + this.tiles.find(to);
    // NOTE: this is not exact, but there are no triggers at the very bottom of
    // any screens.
    (to === from + 16 ? this.south : this.other).add(exit);
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

function parseEntrance(location: number, {x, y}: Entrance | Exit): number {
  // Works with both entrances and exits
  const xs = x >>> 8;
  const xt = (x >>> 4) & 0xf;
  const ys = y >>> 8;
  const yt = (y >>> 4) & 0xf;
  return location << 16 | ys << 12 | xs << 8 | yt << 4 | xt;
}
