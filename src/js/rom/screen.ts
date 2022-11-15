import {Assembler} from '../asm/assembler';
import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity} from './entity';
import {tuple} from './util';

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
  set2d(start: number,
        data: ReadonlyArray<ReadonlyArray<number | null | undefined>>) {
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

  /**
   * Return a 2d block from the tile array.  A size of 0x00 will
   * result in one row and one column.
   */
  get2d(start: number, size: number): number[][] {
    const x0 = start & 0xf;
    const y0 = start >>> 4;
    const xs = (size & 0xf) + 1;
    const y1 = y0 + (size >>> 4);
    const result = [];
    for (let y = y0; y <= y1; y++) {
      const i = y << 4 | x0;
      result.push(this.tiles.slice(i, i + xs));
    }
    return result;
  }

  assemble(a: Assembler) {
    const id = this.id.toString(16).padStart(2, '0');
    let tiles = this.tiles;
    if (this.rom.compressedMapData || this.id < 0x100) {
      const seg = (this.id >> 5).toString(16).padStart(2, '0');
      a.segment(seg);
      if (seg === '0a') tiles = tiles.slice(0xc0);
    } else {
      a.segment('0a');
      tiles = tiles.slice(0, 0xc0);
    }
    a.org(0x8000 | (this.id & 0x3f) << 8, `Screen_${id}`);
    a.byte(...tiles);
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
    for (const screen of this) {
      if (screen?.used) screen.assemble(a);
    }
    return [a.module()];
  }
}
