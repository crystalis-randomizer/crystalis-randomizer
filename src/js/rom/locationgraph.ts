import {Entrance, Location} from './location.js';
import {Screen} from './screen.js';
import {Passage, Tileset} from './tileset.js';
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
  private readonly blocks = new Array<[number, number]>();

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

    function getTerrain(tile: number): number {
      const location = tile >>> 16;
      const ys = (tile >>> 12) & 0xf;
      const xs = (tile >>> 8) & 0xf;
      // const yt = (tile >>> 4) & 0xf;
      // const xt = tile & 0xf;
      const tyx = tile & 0xff;
      const location = rom.locations[tile >>> 16];
      const screen = rom.screen(location.screens[ys][xs]);
      const tile = screen.tiles[
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


function parseEntrance(location: number, entrance: Entrance): number {
  const {x, y} = entrance;
  const xs = x >>> 8;
  const xt = (x >>> 4) & 0xf;
  const ys = y >>> 8;
  const yt = (y >>> 4) & 0xf;
  return location << 16 | ys << 12 | xs << 8 | yt << 4 | xt;
}
