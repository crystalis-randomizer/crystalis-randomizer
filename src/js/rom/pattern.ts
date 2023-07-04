import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity} from './entity';
import {reverseBits, seq, tuple} from './util';

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

  get(page: number, tile_idx?: number): Pattern {
    if (!tile_idx) {
      return this._all[page];
    }
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

  public static readonly HUD_LF = parsePattern(`
    |L     ..|
    |L.    .#|
    |L.  FF.#|
    |L.  F..#|
    |LLL FF.#|
    | ...F..#|
    |    F ..|
    |    .   |
  `, {' ': 2, 'L': 1, 'F': 1, '#': 1, '.': 3});
  public static readonly HUD_PW = parsePattern(`
    |PPP     |
    |P..P.   |
    |PPP.    |
    |P..     |
    |P.w.w.w |
    | .w.w.w |
    |  .w.w. |
    |   . .  |
  `, {' ': 2, 'P': 1, 'w': 1, '.': 3});
  public static readonly HUD_EY = parsePattern(`
    |EEE     |
    |E...    |
    |EEE Y.Y.|
    |E...Y.Y.|
    |EEE  Y. |
    | ... Y. |
    |     Y. |
    |        |
  `, {' ': 2, 'E': 1, 'Y': 1, '#': 1, '.': 3});
  public static readonly HUD_LV = parsePattern(`
    |        |
    |L       |
    |L.      |
    |L.  v.v.|
    |L.  v.v.|
    |LLL  v. |
    | ... v. |
    |     .  |
  `, {' ': 2, 'L': 1, 'v': 1, '.': 3});
  public static readonly HUD_DL = parsePattern(`
    |        |
    |DD      |
    |D.D.L   |
    |D.D.L.  |
    |D.D.L.  |
    |DD. L.  |
    | .  LLL |
    |     ...|
  `, {' ': 2, 'D': 1, 'L': 1, '.': 3});
  public static readonly HUD_MP = parsePattern(`
    |M.  M   |
    |MM.MM.  |
    |M.M.M.  |
    |M. .PPP |
    |M. .P..P|
    |    PPP.|
    |    P.. |
    |    P.  |
  `, {' ': 2, 'M': 1, 'P': 1, '.': 3});
  public static readonly HUD_EX = parsePattern(`
    |EEE     |
    |E...    |
    |EEE     |
    |E...    |
    |EEE x.x.|
    | ... x. |
    |    x.x.|
    |     . .|
  `, {' ': 2, 'E': 1, 'x': 1, '.': 3});
  public static readonly HUD_CLOSE_RIGHT = parsePattern(`
    |________|
    |____oooo|
    |____o...|
    |__ooo...|
    |__o....o|
    |__o....o|
    |__o..oo |
    |__o..o  |
  `, {' ': 0, '.': 1, '_': 2, 'o': 3});
  public static readonly HUD_CLOSE_LEFT = parsePattern(`
    |________|
    |oooo____|
    |...o____|
    |...ooo__|
    |o....o__|
    |o....o__|
    | oo..o__|
    |  o..o__|
  `, {' ': 0, '.': 1, '_': 2, 'o': 3});
  private static readonly BLANK_TILE_TEMPLATE = `
    |        |
    |        |
    |        |
    |        |
    |        |
    |        |
    |        |
    |        |
  `;
  public static readonly BLANK_TILES = [
    parsePattern(Patterns.BLANK_TILE_TEMPLATE, {' ': 0}),
    parsePattern(Patterns.BLANK_TILE_TEMPLATE, {' ': 1}),
    parsePattern(Patterns.BLANK_TILE_TEMPLATE, {' ': 2}),
    parsePattern(Patterns.BLANK_TILE_TEMPLATE, {' ': 3}),
  ];
}

function parsePattern(data: String, key: Record<string, number>): number[] {
  const text = data.trim().replace(/^[^|]*\||\|[^|]*$/mg, '').replace(/\n/g, '');
  if (text.length !== 64) throw new Error(`Bad CHR tile: ${text}`);
  const arr: number[] = new Array(16).fill(0);
  for (let i = 0, c = ''; c = text.charAt(i); ++i) {
    const off = i >>> 3;
    const lo = off;
    const hi = off | 8;
    const col = ~i & 7;
    const val = key[c] || 0;
    if (val & 1) {
      arr[lo] |= 1 << col;
    }
    if (val & 2) {
      arr[hi] |= 1 << col;
    }
  }
  return arr;
}

export enum Flip {
  HORIZONTAL = 0x40,
  VERTICAL = 0x80,
}
