import {Entity, Rom} from './entity.js';
import {TileEffects} from './tileeffects.js';
import {seq, tuple} from './util.js';
import {Writer} from './writer.js';

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

  write(writer: Writer) {
    for (let i = 0; i < 0x100; i++) {
      if (i < 0x20) {
        writer.rom[this.alternatesBase + i] = this.alternates[i];
      }
      for (let j = 0; j < 4; j++) {
        writer.rom[this.tileBase + (j << 8) + i] = this.tiles[j][i];
      }
    }
    for (let i = 0; i < 0x40; i++) {
      const j = i << 2;
      writer.rom[this.attrBase + i] =
          (this.attrs[j] & 3) | (this.attrs[j + 1] & 3) << 2 |
          (this.attrs[j + 2] & 3) << 4 | (this.attrs[j + 3] & 3) << 6;
    }
  }

  effects(): TileEffects {
    // NOTE: it's possible this could get out of sync...
    let index = (this.id >>> 2) & 0xf;
    if (this.id === 0xa8) index = 2;
    if (this.id === 0xac) index--;
    return this.rom.tileEffects[index];
  }

  passage(tileId: number, tileEffects = this.effects()): Terrain {
    const effects = tileEffects.effects;
    // Note: for this purpose, pits can be traversed because there should always
    // be a platform across it.  The dolphin counts as flying, and we have
    // special logic to translate that.
    const bits = effects[tileId] & 0x26;
    if (!bits) return Passage.ALWAYS;
    // Note: this will lose the flight bit from angry sea waterfall, but
    // that's probably fine.
    if (bits & 0x20) return Passage.SLOPE;
    // TODO - require the 0x08 bit before checking alternate?
    if (tileId < 0x20 && this.alternates[tileId] !== tileId) {
      const altBits = effects[this.alternates[tileId]] & 0x26;
      if (!altBits) return Passage.FLAG;
    }
    if (!(bits & 0x04)) return Passage.FLY;
    return Passage.NEVER;
  }
}


export enum Passage {
  ALWAYS = 0,
  SLOPE = 1,
  FLAG = 2,
  FLY = 3,
  NEVER = 4,
}
