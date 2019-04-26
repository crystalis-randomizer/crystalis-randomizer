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
}
