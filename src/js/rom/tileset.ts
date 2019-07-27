import {Entity} from './entity.js';
import {MapScreen} from './mapscreen.js';
import {TileEffects} from './tileeffects.js';
import {seq, tuple} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

// Mappping from metatile ID to tile quads and palette number.
export class Tileset extends Entity {

  tileBase: number;
  attrBase: number;
  alternatesBase: number;

  tiles: number[][];    // tile info, outer is 4 quadrants (TL, TR, BL, BR)
  attrs: number[];      // palette info
  alternates: number[]; // 32-element mapping for flag-based alternates

  private lazyScreens?: readonly MapScreen[];

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

  get screens(): readonly MapScreen[] {
    if (this.lazyScreens) return this.lazyScreens;
    return this.lazyScreens =
        seq(256, i => new MapScreen(this.rom.screens[i], this));
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

  // passage(tileId: number, tileEffects = this.effects()): Terrain {
  //   const effects = tileEffects.effects;
  //   // Note: for this purpose, pits can be traversed because there should always
  //   // be a platform across it.  The dolphin counts as flying, and we have
  //   // special logic to translate that.
  //   const bits = effects[tileId] & 0x26;
  //   if (!bits) return Passage.ALWAYS;
  //   // Note: this will lose the flight bit from angry sea waterfall, but
  //   // that's probably fine.
  //   if (bits & 0x20) return Passage.SLOPE;
  //   // TODO - require the 0x08 bit before checking alternate?
  //   if (tileId < 0x20 && this.alternates[tileId] !== tileId) {
  //     const altBits = effects[this.alternates[tileId]] & 0x26;
  //     if (!altBits) return Passage.FLAG;
  //   }
  //   if (!(bits & 0x04)) return Passage.FLY;
  //   return Passage.NEVER;
  // }
}


// export enum Passage {
//   ALWAYS = 0,
//   SLOPE = 1,
//   FLAG = 2,
//   FLY = 3,
//   NEVER = 4,
// }

// interface PaletteHandler {
//   donor: string[];
//   receiver: string[];
// }

// const MAIN = {donor: ['main', 'trim'], receiver: ['main']};
// const TRIM = {donor: ['trim'], receiver: ['trim']};
// const NONE = {donor: [], receiver: []};
const NONE = 0;
const TRIM = 1;
const MAIN = 2;
type PaletteHandler = number;

type Palette = readonly [number, number, number, number];
type PaletteValidator = (p0: Palette, p1: Palette, p2: Palette) => boolean;

type PaletteSpec = readonly [PaletteHandler,
                             PaletteHandler,
                             PaletteHandler,
                             PaletteValidator?];

export function paletteTypes(tileset: number, location: number): PaletteSpec {
  // Pull out a few special-case locations.
  // NOTE: underground cavern $64 has middle for water, must be $1f
  switch (location) {
  case 0x1a: // tileset a0 swamp
    return [MAIN, MAIN, TRIM, (p0, p1, p2) => p0[3] === p1[3] && p1[3] === p2[3]];
  case 0x43: // tileset 94
    return [MAIN, TRIM, TRIM];
  case 0x57: // tileet 88
    // don't include the water in the normal pool...
    return [MAIN, NONE, NONE];
  case 0x60: // tileset 94
    return [MAIN, MAIN, MAIN, (p0, _p1, p2) => p0[2] === p2[2]];
  case 0x64: case 0x68: // tileset 88
    // some water in this cave uses the HUD's palette so don't shuffle it
    return [MAIN, NONE, TRIM];
  case 0x7c: // tileset 9c
    return [MAIN, TRIM, TRIM];
  }

  switch (tileset) {
  case 0x80: case 0x84:
    return [MAIN, MAIN, TRIM, (p0, p1) => p0[3] === p1[3]];
  case 0x88:
    return [MAIN, TRIM, NONE];
  case 0x8c: return [MAIN, TRIM, MAIN];
  case 0x90: return [MAIN, MAIN, MAIN];
  case 0x94: return [MAIN, TRIM, TRIM, (p0, p1) => p0[3] === p1[3]];
  case 0x98: return [TRIM, TRIM, TRIM]; // TODO - validate?!?
  case 0x9c: return [MAIN, TRIM, MAIN];
  case 0xa0: return [TRIM, TRIM, TRIM];
  case 0xa4: return [MAIN, MAIN, TRIM];
  case 0xa8: return [MAIN, MAIN, TRIM];
  case 0xac: return [MAIN, TRIM, MAIN];
  }
  throw new Error(`unxpected: ${tileset}`);
}
//   [0x98, ['door', 'room', 'rocks']], // shrine
//   // NOTE: hydra very diff: (rock/ground, bridge, river)
//   [0x9c, ['mountain/ground', 'trees', 'desert']],
//   // NOTE: this is swamp, but also includes all indoors
//   // all 3 need same bg for swamp
//   [0xa0, ['ground', 'trees', 'some haze']],
//   [0xa4, ['', '', '']], // fortress
//   [0xa8, ['', '', '']], // ice cave
//   [0xac, ['', '', '']], // endgame
// ]);

const ALLOWED_PALETTES = new Map<string, readonly number[]>([
  ['path', [...r(0x00, 0x12), ...r(0x15, 0x1b), ...r(0x1e, 0x25),
            ...r(0x26, 0x2b), ...r(0x2c, 0x30), ...r(0x39, 0x3f),
            0x42, ...r(0x44, 0x48), ...r(0x4d, 0x59), ...r(0x80, 0x84),
            0x87, ...r(0x8b, 0x93)]],
  ['mountain', [0x01, ...r(0x03, 0x07), ...r(0x08, 0x0b), 0x0c, 0x0d, 0x0e,
               ...r(0x11, 0x18), 0x19, 0x1a, 0x1c, 0x1d, 0x1e, 0x20, 0x21,
               0x23, 0x27, 0x2a, 0x2b, 0x2f, 0x31, 0x33, 0x36, 0x37, 0x38,
               0x39, 0x3c, 0x42, 0x44, 0x46, 0x4b, 0x4c, 0x4f, 0x53, 0x58,
               ...r(0x80, 0x85), 0x87, 0x88, 0x8b, 0x8e]],
  ['trees', [0x01, 0x02, 0x04, 0x06, ...r(0x07, 0x0f), ...r(0x14, 0x18),
             0x1a, 0x1c, 0x1e, 0x20, 0x23, 0x27, 0x29, 0x2a, 0x2b, 0x2e,
             0x2f, 0x31, 0x33, 0x37, 0x38, 0x39, 0x3c, 0x3d, 0x43, 0x44,
             0x46, 0x49, 0x4a, 0x4b, 0x4f, 0x52, 0x57, 0x6e,
             ...r(0x80, 0x85), 0x87, 0x88, ...r(0x8b, 0x90)]],

]);

// infer constraints?
//  - treat BG color separately
//    - figure out which pals on a map share same bg
//    - keep black ones black
//    - keep light ones light, dark ones dark?
//  - all shared colors moved in lockstep?
//  - categorize individual colors?
//    look at how much is used?  no bright colors for very common?
//  TODO - fix the no-ice BG for hydra/stxy/goa in the tileset

// next step - make pattern/palette viewer (editor?)

const TERRAIN_BY_PALETTE = new Map<number, readonly [string, string, string]>([
  [0x80, ['path', 'mountain', 'trees']],
  [0x84, ['mountain-path', 'brick', 'trees']],
  [0x88, ['cave wall/ground', 'cave bridge', '']],
  // NOTE: underground cavern $64 has middle for water, must be $1f
  [0x8c, ['floor', 'fire', 'accept']],
  [0x90, ['trees', 'mountain', 'grass']],
  // NOTE: 0 and 2 need same background for ocean
  // lime tree is very different usage: (water, tree trunk, trees).
  // mountains also different (rock, trim (on 28/7c), bridge)
  // for mountains, 0 and 1 are same-bg
  [0x94, ['water/ground', 'mountain', 'shallows']],
  [0x98, ['door', 'room', 'rocks']], // shrine
  // NOTE: hydra very diff: (rock/ground, bridge, river)
  [0x9c, ['mountain/ground', 'trees', 'desert']],
  // NOTE: this is swamp, but also includes all indoors
  // all 3 need same bg for swamp
  [0xa0, ['ground', 'trees', 'some haze']],
  [0xa4, ['', '', '']], // fortress
  [0xa8, ['', '', '']], // ice cave
  [0xac, ['', '', '']], // endgame
]);

function r(a: number, b: number): readonly number[] {
  return new Array(b - a).fill(0).map((_x, i) => i + a);
}

const [] = [TERRAIN_BY_PALETTE, ALLOWED_PALETTES];
