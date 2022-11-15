import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity} from './entity';
import {readLittleEndian, writeLittleEndian} from './util';

// Data for when a boss is killed
export class BossKill extends Entity {

  readonly base: number;

  readonly data: Uint8Array;
  readonly palettes: Uint8Array;
  readonly patterns: Uint8Array;

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.base = readLittleEndian(rom.prg, this.pointer);
    this.data = rom.prg.slice(this.base + 0x14000, this.base + 0x14015);
    this.palettes = this.data.subarray(5, 13);
    this.patterns = this.data.subarray(13, 19);
  }

  get pointer(): number {
    return 0x1f96b + 2 * this.id;
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

  write(): Module[] {
    // NOTE: we could compress this table quite a bit if we wanted to,
    // there's a lot of zeros in the restore sections.  Something as
    // simple as a bitmask before each could help.
    // writer.rom.subarray(this.base, this.base + 21).set(this.data);

    // NOTE: we're only going to write the bits that aren't owned by
    // the Location object.
    if (!this.base) return [];
    const a = this.rom.assembler();
    a.segment('0f');
    a.org(this.base);
    a.byte(this.data[0], this.data[1]);
    a.org(this.base + 4);
    a.byte(this.data[4]);
    return [a.module()];
  }
}
