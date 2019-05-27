import {Entity, Rom} from './entity.js';
import {seq, tuple} from './util.js';
import {Writer} from './writer.js';

export class Screen extends Entity {

  base: number;
  tiles: number[]; // always 15x16

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.base = (id > 0xff ? 0x40 + id : id) << 8;
    // metatile index
    this.tiles = tuple(rom.prg, this.base, 0xf0);
  }

  tile(y: number, x: number): number {
    return this.tiles[y << 4 | x];
  }

  // metatile(y, x): Metatile {
  //   return this.rom.metatiles[this.tiles[y][x]];
  // }

  allTilesSet(): Set<number> {
    return new Set(this.tiles);
  }

  write(writer: Writer): void {
    writer.rom.subarray(this.base, this.base + 0xf0).set(this.tiles);
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
