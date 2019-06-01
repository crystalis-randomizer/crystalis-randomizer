import {Entity} from './entity.js';
import {readLittleEndian, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

// Data for when a boss is killed
export class BossKill extends Entity {

  readonly pointer: number;
  readonly base: number;

  readonly data: Uint8Array;
  readonly palettes: Uint8Array;
  readonly patterns: Uint8Array;

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.pointer = 0x1f96b + 2 * id;
    this.base = readLittleEndian(rom.prg, this.pointer) + 0x14000;
    this.data = rom.prg.slice(this.base, this.base + 21);
    this.palettes = this.data.subarray(5, 13);
    this.patterns = this.data.subarray(13, 19);
  }

  get routine(): number {
    const addr = readLittleEndian(this.data, 0);
    return addr && (addr + 0x14000);
  }
  set routine(addr: number) {
    writeLittleEndian(this.data, 0, addr ? addr - 0x14000 : 0);
  }

  get restoreMusic(): number { return this.data[3]; }
  set restoreMusic(x: number) { this.data[3] = x; }

  get itemDrop(): number { return this.data[4]; }
  set itemDrop(x: number) { this.data[4] = x; }

  get restoreAnimation(): number { return this.data[19]; }
  set restoreAnimation(x: number) { this.data[19] = x; }

  get explode(): boolean { return !!this.data[20]; }
  set explode(x: boolean) { this.data[20] = x ? 1 : 0; }

  write(writer: Writer) {
    // NOTE: we could compress this table quite a bit if we wanted to,
    // there's a lot of zeros in the restore sections.  Something as
    // simple as a bitmask before each could help.
    // writer.rom.subarray(this.base, this.base + 21).set(this.data);

    // NOTE: we're only going to write the bits that aren't owned by
    // the Location object.
    for (const i of [0, 1, 4]) {
      writer.rom[this.base + i] = this.data[i];
    }
  }
}
