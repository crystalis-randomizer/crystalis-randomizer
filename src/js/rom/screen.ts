import {Entity} from './entity.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

export class Screen extends Entity {

  // What do we need to track?
  //  - vanilla ID (0..$102)
  //  - relocated ID (0..$201f)
  //  - tilesets it's a part of
  //    - flag info (separate from bridge/wall)?
  //    - bridge/wall/door info
  //    - stairs
  //    - edge and path info
  //    - required/allowed neighbors?
  //    - upgrade paths?
  // base: number;
  tiles: number[]; // always 15x16
  used: boolean;

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.used = true; // TODO - track unused tiles?
    const base = (id > 0xff ? 0x40 + id : id) << 8;
    // metatile index
    this.tiles = tuple(rom.prg, base, 0xf0);
  }

  clone(newId: number): Screen {
    // TODO - update the set of screens, too?
    const clone = new Screen(this.rom, newId);
    clone.used = this.used;
    clone.tiles = [...this.tiles];
    // clone.base = this.base;
    return clone;
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

  /** Write a 2d block into the tile array. */
  set2d(start: number, data: ReadonlyArray<ReadonlyArray<number | null>>) {
    const x0 = start & 0xf;
    const y0 = start >>> 4;
    for (let y = 0; y < data.length; y++) {
      const row = data[y];
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (tile != null) this.tiles[(y0 + y) << 4 | (x0 + x)] = tile;
      }
    }
  }

  write(writer: Writer): void {
    let base = this.id << 8;
    if (this.id > 0xff) {
      if (!this.rom.compressedMapData) {
        base += 0x4000;
      } else {
        base = (this.id & 0xff00) << 5 | (this.id & 0xff) << 8;
      }
    }
    // this.id << 8 : (this.id > 0xff ? 0x40 + this.id : this.id) << 8;
    if ((base & 0xfe000) !== 0x14000) {
      writer.rom.subarray(base, base + 0xf0).set(this.tiles);
    } else {
      // we reuse the last 2 rows of extended screens (covered by HUD) for
      // global flags in the rom.  -- only for page 10...!?

      // TODO - only do this for page 10

      writer.rom.subarray(base, base + 0xc0).set(this.tiles.slice(0, 0xc0);
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

export class Screens extends Array<Screen> {
  readonly unallocated: Array<Screen> = [];
  constructor(readonly rom: Rom) {
    super(0x103);
    // TODO - if maps already compacted, read that instead?
    //  - need locations to know where to look!
    for (let i = 0; i < 0x103; i++) {
      this[i] = new Screen(rom, i);
    }
  }

  // moveScreen(oldId: number, newId: number): Screen {
  //   // Entity.id is const, but maybe shouldn't be?
  // }

  getScreen(id: number): Screen {
    const arr = id < 0 ? this.unallocated : this;
    const i = id < 0 ? ~id : id;
    return arr[i] || (arr[i] = new Screen(this.rom, id));
  }

  setScreen(id: number, screen: Screen) {
    const arr = id < 0 ? this.unallocated : this;
    const i = id < 0 ? ~id : id;
    arr[i] = screen;
  }

  deleteScreen(id: number) {
    const arr = id < 0 ? this.unallocated : this;
    const i = id < 0 ? ~id : id;
    delete arr[i];
  }
}
