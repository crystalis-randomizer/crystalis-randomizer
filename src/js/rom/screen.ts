import {Module} from '../asm/module.js';
import {Rom} from '../rom.js';
import {Entity} from './entity.js';
import {tuple} from './util.js';

export class Screen extends Entity {

  base: number;
  tiles: number[]; // always 15x16

  constructor(rom: Rom, id: number) {
    super(rom, id);
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

  write(): Module[] {
    const a = this.rom.assembler();
    if (this.id < 0x100) {
      a.segment((this.id >> 5).toString(16).padStart(2, '0'));
      a.org(0x8000 | (this.id & 0x3f) << 8);
      a.byte(...this.tiles);
    } else {
      a.segment('0a'); // 14000
      a.org(0x8000 | (this.id & 0x3) << 8)
      // we reuse the last 2 rows of extended screens (covered by HUD) for
      // global flags in the rom.
      a.byte(...this.tiles.slice(0, 0xc0));
    }
    return [a.module()];
  }

  setTiles(start: number, tiles: Array<Array<number|null>>) {
    for (const row of tiles) {
      for (let i = 0; i < row.length; i++) {
        const tile = row[i];
        if (tile != null) this.tiles[start + i] = tile;
      }
      start += 16;
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
