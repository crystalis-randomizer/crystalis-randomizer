import {Entity} from './entity.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

export class Screen extends Entity {

  base: number;
  tiles: number[]; // always 15x16
  used: boolean;

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.used = true; // TODO - track unused tiles?
    this.base = (id > 0xff ? 0x40 + id : id) << 8;
    // metatile index
    this.tiles = tuple(rom.prg, this.base, 0xf0);
  }

  // tile(y: number, x: number): number {
  //   return this.tiles[y << 4 | x];
  // }

  // metatile(y, x): Metatile {
  //   return this.rom.metatiles[this.tiles[y][x]];
  // }

  allTilesSet(): Set<number> {
    return new Set(this.tiles);
  }

  write(writer: Writer): void {
    if (this.id < 0x100) {
      writer.rom.subarray(this.base, this.base + 0xf0).set(this.tiles);
    } else {
      // we reuse the last 2 rows of extended screens (covered by HUD) for
      // global flags in the rom.
      for (let i = 0; i < 0xc0; i++) {
        writer.rom[this.base + i] = this.tiles[i];
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
