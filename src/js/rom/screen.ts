import {Writer} from './writer.js';
import {Entity, Rom} from './entity.js';
import {seq, tuple} from './util.js';

export class Screen extends Entity {

  base: number;
  tiles: number[][]; // always 15x16

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.base = (id > 0xff ? 0x40 + id : id) << 8;
    // metatile index
    this.tiles = seq(15, y => tuple(rom.prg, this.base | y << 4, 16));
  }

  // metatile(y, x): Metatile {
  //   return this.rom.metatiles[this.tiles[y][x]];
  // }

  allTilesSet(): Set<number> {
    const tiles = new Set();
    for (const row of this.tiles) {
      for (const tile of row) {
        tiles.add(tile);
      }
    }
    return tiles;
  }

  write(writer: Writer): void {
    let i = this.base;
    for (const row of this.tiles) {
      for (const tile of row) {
        writer.rom[i++] = tile;
      }
    }
  }

  // TODO - accessors for which palettes, tilesets, and patterns are used/allowed
}

// Metatile doesn't mean much without tileset, patterns, etc.
// may need to rethink this one, make it a transient object that deps on others.
// class Metatile {
//   constructor(rom, id) {
//     this.rom = rom;
//     this.id = id;
//   }
// }
