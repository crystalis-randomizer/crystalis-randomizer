import {Entity} from './entity.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

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

  // Bits: e.g. mountain is 6, river is 2, plain is 0
  static PIT = 0x01;
  static NO_WALK = 0x02; // but maybe still can fly?
  static IMPASSIBLE = 0x04; // neither walking or flying
  static ALTERNATIVE = 0x08; // not sure if this is actually used?
  static BEHIND = 0x10; // e.g. underneath bridge
  static SLOPE = 0x20;
  static SLOW = 0x40; // note: ocean is slow b/c dolphin's speed is 9
  static PAIN = 0x80;
}
