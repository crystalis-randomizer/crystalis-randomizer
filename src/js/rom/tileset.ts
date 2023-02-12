import { Assembler } from '../asm/assembler';
import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity} from './entity';
import {Metatile} from './metatile';
import {TileEffects} from './tileeffects';
import {seq, tuple} from './util';

export class Tilesets implements Iterable<Tileset> {

  private tilesets: Tileset[] = [];

  readonly [id: number]: Tileset;

  constructor(readonly rom: Rom) {
    for (let i = 0x80; i < 0xb0; i += 4) {
      this.tilesets.push(((this as any)[i] = new Tileset(rom, i)));
    }
  }

  [Symbol.iterator](): IterableIterator<Tileset> {
    return this.tilesets[Symbol.iterator]();
  }

  write(): Module[] {
    const a = this.rom.assembler();
    for (const ts of this) {
      ts.assemble(a);
    }
    return [a.module()];
  }
}

// Mappping from metatile ID to tile quads and palette number.
export class Tileset extends Entity {

  // TODO - permanently attach behavior
  // Store more information, such as screen types, edge types, etc.
  // Names...
  // Does palette info belong here?  Maybe...

  tiles: number[][];    // tile info, outer is 4 quadrants (TL, TR, BL, BR)
  attrs: number[];      // palette info
  alternates: number[]; // 32-element mapping for flag-based alternates

  constructor(rom: Rom, id: number) {
    // `id` is MapData[1][3], ranges from $80..$bc in increments of 4.
    super(rom, id);
    this.tiles = seq(4, q => tuple(rom.prg, this.tileBase | q << 8 , 256));
    this.attrs = seq(256, i => rom.prg[this.attrBase | i >> 2] >> ((i & 3) << 1) & 3);
    this.alternates = tuple(rom.prg, this.alternatesBase, 32);
  }

  private get map(): number {
    return this.id & 0x3f;
  }

  get tileBase(): number {
    return 0x10000 | this.map << 8;
  }

  get attrBase(): number {
    return 0x13000 | this.map << 4;
  }

  get alternatesBase(): number {
    return 0x13e00 | this.map << 3;
  }

  getTile(id: number): Metatile {
    // TODO - does this rather belong in tileset.ts?
    return new Metatile(this, id);
  }

  assemble(a: Assembler) {
    const attr = seq(0x40, i => {
      const j = i << 2;
      return (this.attrs[j] & 3) | (this.attrs[j + 1] & 3) << 2 |
             (this.attrs[j + 2] & 3) << 4 | (this.attrs[j + 3] & 3) << 6;
    });
    const name = `Tileset_${this.id.toString(16).padStart(2, '0')}`;
    a.segment('08', '09');
    a.org(0x8000 | this.map << 8, `${name}_Tiles`);
    a.byte(...([] as number[]).concat(...this.tiles));
    a.org(0xb000 | this.map << 4, `${name}_Attrs`);
    a.byte(...attr);
    a.org(0xbe00 | this.map << 3, `${name}_Alternates`);
    a.byte(...this.alternates);
  }

  effects(): TileEffects {
    // NOTE: it's possible this could get out of sync...
    let index = (this.id >>> 2) & 0xf;
    if (this.id === 0xa8) index = 2;
    if (this.id === 0xac) index--;
    return this.rom.tileEffects[index];
  }
}
