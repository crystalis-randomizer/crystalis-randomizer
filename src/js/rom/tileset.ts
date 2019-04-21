import {Entity, Rom} from './entity.js';
import {seq, tuple} from './util.js';

// Mappping from metatile ID to tile quads and palette number.
export class Tileset extends Entity {

  tileBase: number;
  attrBase: number;
  alternatesBase: number;

  tiles: number[][];    // tile info, outer is 4 quadrants (TL, TR, BL, BR)
  attrs: number[];      // palette info
  alternates: number[]; // 32-element mapping for flag-based alternates
  

  constructor(rom: Rom, id: number) {
    // `id` is MapData[1][3], ranges from $80..$bc in increments of 4.
    super(rom, id);
    const map = id & 0x3f;
    this.tileBase = 0x10000 | map << 8;
    this.attrBase = 0x13000 | map << 4;
    this.alternatesBase = 0x13e00 | map << 3;
    this.tiles = seq(4, q => tuple(rom.prg, this.tileBase | q << 8 , 256));
    this.attrs = seq(256, i => rom.prg[this.attrBase | i >> 2] >> ((i & 3) << 1) & 3);
    this.alternates = tuple(rom.prg, this.alternatesBase, 32);
  }

  write(rom: Rom = this.rom) {
    for (let i = 0; i < 0x100; i++) {
      if (i < 0x20) {
        rom[this.alternatesBase + i] = this.alternates[i];
      }
      for (let j = 0; j < 4; j++) {
        rom[this.tileBase + (j << 8) + i] = this.tiles[j][i];
      }
    }
    for (let i = 0; i < 0x40; i++) {
      const j = i << 2;
      rom[this.attrBase + i] =
          (this.attrs[j] & 3) | (this.attrs[j + 1] & 3) << 2 |
          (this.attrs[j + 2] & 3) << 4 | (this.attrs[j + 3] & 3) << 6;
    }
  }
}
