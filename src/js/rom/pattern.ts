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
      case '.':
        break
      case '1':
        arr[lo] |= 1 << col
        break
      case '2':
        arr[hi] |= 1 << col
        break
      case '3':
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

const chr_page38_tile0 = parse_pattern(`1222223313222231132211311322133111121131233313312222123322223222`)
const chr_page38_tile1 = parse_pattern(`1112222213313222111322221332222213131312231313122231313222232322`)
const chr_page38_tile2 = parse_pattern(`1112223313322231112131311331313111131331333213312222133322222222`)
const chr_page38_tile3 = parse_pattern(`2222222212222222132222221321321313213213111211322333213222222322`)
const chr_page38_tile4 = parse_pattern(`2222222211222222131312221313132213131322113213222322111222222333`)
const chr_page38_tile5 = parse_pattern(`1322122211311322131313221323111213231331222211132222133222221322`)
const chr_page38_tile6 = parse_pattern(`1112222213332222111222221333222211121313233321322222131322222323`)
const chr_page38_tile7 = parse_pattern(`3222222333222333333333222333322222333322233333323322333332222223`)


export {chr_page38_tile0, chr_page38_tile1, chr_page38_tile2, chr_page38_tile3,
  chr_page38_tile4, chr_page38_tile5, chr_page38_tile6, chr_page38_tile7}

export enum Flip {
  HORIZONTAL = 0x40,
  VERTICAL = 0x80,
}
