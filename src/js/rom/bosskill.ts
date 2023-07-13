import { Assembler } from '../asm/assembler';
import { Module } from '../asm/module';
import { Rom } from '../rom';
import { Entity } from './entity';
import { free, readLittleEndian, Segment, writeLittleEndian } from './util';

const {$0f} = Segment;

export class BossKills implements Iterable<BossKill> {

  private readonly bossKills: BossKill[] = [];

  constructor(private readonly rom: Rom) {
    for (let i = 0; i < 0xe; i++) {
      this.bossKills.push(new BossKill(rom, i));
    }
  }

  get kensuLighthouse() { return this.bossKills[3]; }

  [Symbol.iterator]() {
    return this.bossKills[Symbol.iterator]();
  }

  write(): Module[] {
    const a = this.rom.assembler();
    // Free the tables (TODO - reloc the pointer table, too)
    free(a, $0f, 0xb987, 0xba98);

    for (const bk of this) {
      bk.fixFromLocation(); // this is idempotent. make it a separate pass?
      bk.assemble(a);
    }
    return [a.module()];
  }
}

// Data for when a boss is killed
export class BossKill extends Entity {

  readonly base: number; // address of 21-byte data table
  readonly base2: number; // address of 5-byte 1f7c1 row

  private location: number; // from 1f95d BossKillLocations table
  readonly data: Uint8Array; // from 1f96b indirected BossKillDataTable
  readonly data2: Uint8Array; // from the 5xN table at 1f7c1
  readonly palettes: Uint8Array;
  readonly patterns: Uint8Array;

  constructor(rom: Rom, id: number) {
    super(rom, id);
    // NOTE: 1fXXX accessed via bXXX, so $14000 offset
    this.base = readLittleEndian(rom.prg, this.pointer); // 0f:b98a?
    this.data = rom.prg.slice(this.base + 0x14000, this.base + 0x14015);
    // NOTE: id=3 is Rage for data, but Lighthouse Kensu for data2
    this.base2 = 0xb7c1 + 5 * this.id; // 1f7c1
    this.data2 = rom.prg.slice(this.base2 + 0x14000, this.base2 + 0x14005);
    this.location = rom.prg[0x1f95d + this.id];
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

  // Read location data to fix up the data in the boss-restore
  fixFromLocation() {
    const location = this.rom.locations[this.location];
    if (!location || location.id === 0x5f) return; // skip dyna

    //let pats = [spritePat[0], undefined];
    //if (this.id === 0xa6) pats = [0x53, 0x50]; // draygon 2

    // Set the "restore music" byte for the boss, but if it's Draygon 2
    // (location a6), set it to zero since no music is actually playing,
    // and if the music in the teleporter room happens to be the same as
    // the music in the crypt, then resetting to that means it will just
    // remain silent, and not restart.
    this.restoreMusic = location.id === 0xa6 ? 0 : location.bgm;

    this.palettes.subarray(0, 3).set(location.tilePalettes);
    this.palettes[6] = location.spritePalettes[0];
    // should we write location.spritePatterns into patterns?
    // (This table should restore pat0 but not pat1 ...?)
    this.restoreAnimation = location.animation;

    // if (readLittleEndian(writer.rom, bossBase) === 0xba98) {
    //   // escape animation: don't clobber patterns yet?
    // }

    // later spot for pal3 (and pat1?) *after* explosion
    this.data2[0] = location.spritePalettes[1];

    // chest graphics are now moved so they are part of the sword banks
    // so change the offset of the dropped boss chest graphics to always be zero now
    this.data2[2] = 0;
  }

  assemble(a: Assembler) {
    // NOTE: we could compress this table quite a bit if we wanted to,
    // there's a lot of zeros in the restore sections.  Something as
    // simple as a bitmask before each could help.
    // writer.rom.subarray(this.base, this.base + 21).set(this.data);

    // TODO - make the table itself reloc.
    a.segment('0f');
    if (this.base) {
      const name = `BossKill_${this.id}`;
      a.reloc(name);
      const addr = a.pc();
      a.byte(...this.data);
      a.org(this.pointer - 0x14000, `${name}_Ptr`);
      a.word(addr);
    }

    a.org(this.base2, `BossChest_${this.id}`);
    a.byte(...this.data2);

    a.org(0xb95d + this.id, `BossKillLocation_${this.id}`);
    a.byte(this.location);

    // // NOTE: we're only going to write the bits that aren't owned by
    // // the Location object.
    // if (!this.base) return [];
    // const a = this.rom.assembler();
    // a.segment('0f');
    // a.org(this.base);
    // a.byte(this.data[0], this.data[1]);
    // a.org(this.base + 4);
    // a.byte(this.data[4]);
    // return [a.module()];
  }
}
