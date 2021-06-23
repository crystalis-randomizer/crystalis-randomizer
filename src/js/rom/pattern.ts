import {Module} from '../asm/module.js';
import {Rom} from '../rom.js';
import {Entity} from './entity.js';
import {reverseBits, seq, tuple} from './util.js';

export class Pattern extends Entity {

  pixels: number[];

  constructor(rom: Rom, id: number, pixels?: number[]) {
    super(rom, id);
    this.pixels = pixels || tuple(rom.chr, id << 4, 16);
  }

  // Takes x and y from 0..7, returns a color 0..3.
  pixelAt(y: number, x: number): number {
    return (this.pixels[y | 8] >> x & 1) << 1 | (this.pixels[y] >> x & 1);
  }

  flipH(): Pattern {
    return new Pattern(this.rom, -1, this.pixels.map(reverseBits));
  }

  flipV(): Pattern {
    return new Pattern(this.rom, -1, seq(16, y => this.pixels[y & 8 | ~y & 7]));
  }

  flip(type: Flip): Pattern {
    let p: Pattern = this;
    if (type & Flip.HORIZONTAL) p = p.flipH();
    if (type & Flip.VERTICAL) p = p.flipV();
    return p;
  }

  write(): Module[] {
    // TODO: integrate CHR as a separate output/offset in linker?
    const a = this.id << 4;
    this.rom.chr.subarray(a, a + 16).set(this.pixels);
    return [];
  }
}

export class Patterns implements Iterable<Pattern> {
  private _all: Pattern[] = [];

  public static readonly HUD_LF = parsePattern(`+xxxxxoo+oxxxxo++oxx++o++oxx+oo++++x++o+xooo+oo+xxxx+xooxxxxoxxx`)
  public static readonly HUD_PW = parsePattern(`+++xxxxx+oo+oxxx+++oxxxx+ooxxxxx+o+o+o+xxo+o+o+xxxo+o+oxxxxoxoxx`)
  public static readonly HUD_EY = parsePattern(`+++xxxoo+ooxxxo+++x+o+o++oo+o+o++++o+oo+ooox+oo+xxxx+oooxxxxxxxx`)
  public static readonly HUD_LV = parsePattern(`xxxxxxxx+xxxxxxx+oxxxxxx+ox+ox+o+ox+ox+o+++x++oxxooox+oxxxxxxoxx`)
  public static readonly HUD_DL = parsePattern(`xxxxxxxx++xxxxxx+o+o+xxx+o+o+oxx+o+o+oxx++ox+oxxxoxx+++xxxxxxooo`)
  public static readonly HUD_MP = parsePattern(`+oxx+xxx++o++oxx+o+o+oxx+oxo+++x+oxo+oo+xxxx+++oxxxx+ooxxxxx+oxx`)
  public static readonly HUD_EX = parsePattern(`+++xxxxx+oooxxxx+++xxxxx+oooxxxx+++x+o+oxooox+oxxxxx+o+oxxxxxoxo`)

  get(page: number, tile_idx: number): Pattern {
    return this._all[page | tile_idx];
  }

  set(page: number, tile_idx: number, pixels: number[]) {
    this._all[page | tile_idx].pixels = pixels;
  }

  constructor(rom: Rom) {
    this._all = seq(rom.chr.length >> 4, i => new Pattern(rom, i));
  }

  [Symbol.iterator]() {
    return this._all[Symbol.iterator]();
  }
}

function parsePattern(data: String) : number[] {
  if (data.length !== 64) throw new Error(`Bad CHR tile: ${data}`);
  let arr: number[] = new Array(16).fill(0);
  const text = data.replace(/\s/g, '');
  for (let i = 0, c=''; c = text.charAt(i); ++i) {
    let off = i >>> 3;
    let lo = off;
    let hi = off | 8;
    let col = ~i & 7;
    switch (c) {
      case '.': // 0
        break
      case '+': // 1
        arr[lo] |= 1 << col;
        break
      case 'x': // 2
        arr[hi] |= 1 << col;
        break
      case 'o': // 3
        arr[lo] |= 1 << col;
        arr[hi] |= 1 << col;
        break
      default:
        throw new Error(`Unknown character in CHR tile: ${c}`);
    }
  }
  return arr;
}

export enum Flip {
  HORIZONTAL = 0x40,
  VERTICAL = 0x80,
}
