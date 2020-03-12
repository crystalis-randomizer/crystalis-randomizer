import {Module} from '../asm/module.js';
import {Rom} from '../rom.js';
import {Entity} from './entity.js';
import { tuple, hex} from './util.js';
import { Assembler } from '../asm/assembler.js';

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

  assemble(a: Assembler) {
    if (this.id < 0x100) {
      a.segment((this.id >> 5).toString(16).padStart(2, '0'));
      a.org(0x8000 | (this.id & 0x3f) << 8);
      a.byte(...this.tiles);
      return;
    }
    // Extended screens - figure out which variant we're on
    // 0a => 14000
    const segment = !this.rom.compressedMapData ? '0a' : hex(this.id >> 8);
    a.segment(segment);
    let org = (this.id & 0xff) << 8 | 0x8000;
    if (this.rom.compressedMapData && (this.id & 0x100)) org |= 0x2000;
    a.org(org);
    // NOTE: reuse last 2 rows of '0a' screens for global metadata.
    a.byte(...(segment === '0a' ? this.tiles.slice(0, 0xc0) : this.tiles));
  }

//   write(writer: Writer): void {
//     let base = this.id << 8;
//     if (this.id > 0xff) {
//       if (!this.rom.compressedMapData) {
//         base += 0x4000;
//       } else {
//         base = (this.id & 0xff00) << 5 | (this.id & 0xff) << 8;
//       }
//     }
//     // this.id << 8 : (this.id > 0xff ? 0x40 + this.id : this.id) << 8;
//     if ((base & 0xfe000) !== 0x14000) {
//       writer.rom.subarray(base, base + 0xf0).set(this.tiles);
// >>>>>>> add NO_DEPLOY file
//     } else {
//       a.segment('0a'); // 14000
//       a.org(0x8000 | (this.id & 0x3) << 8)
//       // we reuse the last 2 rows of extended screens (covered by HUD) for
// <<<<<<< HEAD



//   setTiles(start: number, tiles: Array<Array<number|null>>) {
//     for (const row of tiles) {
//       for (let i = 0; i < row.length; i++) {
//         const tile = row[i];
//         if (tile != null) this.tiles[start + i] = tile;
//       }
//       start += 16;
// ||||||| constructed merge base
//       // global flags in the rom.
//       for (let i = 0; i < 0xc0; i++) {
//         writer.rom[this.base + i] = this.tiles[i];
//       }
// =======
//       // global flags in the rom.  -- only for page 10...!?

//       // TODO - only do this for page 10

//       writer.rom.subarray(base, base + 0xc0).set(this.tiles.slice(0, 0xc0));
// >>>>>>> add NO_DEPLOY file
//     }
//   }

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

  write(): Module[] {
    const a = this.rom.assembler();
    if (this.rom.compressedMapData) {
      for (let s = 0; s < 0x100; s++) {
        const scr = this[s];
        if (scr.used) scr.assemble(a);
      }
      for (let p = 1; p < 0x40; p++) {
        for (let s = 0; s < 0x20; s++) {
          const scr = this[p << 8 | s];
          if (scr && scr.used) scr.assemble(a);
        }
      }
    } else {
      for (const screen of this) {
        screen.assemble(a);
      }
    }
    return [a.module()];
  }
}
