import {Entity, Rom} from './entity.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';

// Mappping from metatile ID to a bitfield of terrain effects
export class TileEffects extends Entity {

  base: number;
  effects: number[];

  constructor(rom: Rom, id: number) {
    // `id` is MapData[1][4], which ranges from $b3..$bd
    super(rom, id);
    this.base = (id << 8) & 0x1fff | 0x12000;
    this.effects = tuple(rom.prg, this.base, 256);
  }

  write(writer: Writer) {
    for (let i = 0; i < 0x100; i++) {
      writer.rom[this.base + i] = this.effects[i];
    }
  }

  // Bits:
  //   80 - pain
  //   40 - slow (note: ocean is slow b/c dolphin base speed is ridiculous)
  //   20 - slope
  //   10 - behind bg
  //   08 - alternative tile (unused?)
  //   04 - no walk or fly
  //   02 - no walk
  //   01 - pit
}

export enum TileEffectsBit {
  PIT = 0x01,
  NO_WALK = 0x02,
  IMPASSIBLE = 0x04,
  ALTERNATIVE = 0x08,
  BEHIND = 0x10,
  SLOPE = 0x20,
  SLOW = 0x40,
  PAIN = 0x80,
}
