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

function parse_pattern(data: String) : number[] {
  let arr : number[] = new Array(16).fill(0)
  const text = data.replace(/\s/g, "")
  for (let i = 0, c=''; c = text.charAt(i); ++i) {
    let off = ~~(i / 8)
    let lo = off
    let hi = off | 8
    let col = (7 - (i % 8))
    switch (c) {
      case '.': // 0
        break
      case '+': // 1
        arr[lo] |= 1 << col
        break
      case 'x': // 2
        arr[hi] |= 1 << col
        break
      case 'o': // 3
        arr[lo] |= 1 << col
        arr[hi] |= 1 << col
        break
      default:
        console.error("Couldn't parse pattern for tile")
        return []
    }
  }
  return arr
}

const chr_page38_tile0 = parse_pattern(`+xxxxxoo+oxxxxo++oxx++o++oxx+oo++++x++o+xooo+oo+xxxx+xooxxxxoxxx`)
const chr_page38_tile1 = parse_pattern(`+++xxxxx+oo+oxxx+++oxxxx+ooxxxxx+o+o+o+xxo+o+o+xxxo+o+oxxxxoxoxx`)
const chr_page38_tile2 = parse_pattern(`+++xxxoo+ooxxxo+++x+o+o++oo+o+o++++o+oo+ooox+oo+xxxx+oooxxxxxxxx`)
const chr_page38_tile3 = parse_pattern(`xxxxxxxx+xxxxxxx+oxxxxxx+ox+ox+o+ox+ox+o+++x++oxxooox+oxxxxxxoxx`)
const chr_page38_tile4 = parse_pattern(`xxxxxxxx++xxxxxx+o+o+xxx+o+o+oxx+o+o+oxx++ox+oxxxoxx+++xxxxxxooo`)
const chr_page38_tile5 = parse_pattern(`+oxx+xxx++o++oxx+o+o+oxx+oxo+++x+oxo+oo+xxxx+++oxxxx+ooxxxxx+oxx`)
const chr_page38_tile6 = parse_pattern(`+++xxxxx+oooxxxx+++xxxxx+oooxxxx+++x+o+oxooox+oxxxxx+o+oxxxxxoxo`)


export {chr_page38_tile0, chr_page38_tile1, chr_page38_tile2, chr_page38_tile3,
  chr_page38_tile4, chr_page38_tile5, chr_page38_tile6}

export enum Flip {
  HORIZONTAL = 0x40,
  VERTICAL = 0x80,
}
