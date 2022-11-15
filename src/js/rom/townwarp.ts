import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Address, Segment, tuple} from './util';

// List of town warp locations.
export class TownWarp {

  locations: number[];

  // (location, entrance) pair for warp point.
  thunderSwordWarp: readonly [number, number];

  constructor(readonly rom: Rom) {
    this.locations = tuple(rom.prg, ADDRESS.offset, COUNT);
    this.thunderSwordWarp = [rom.prg[0x3d5ca], rom.prg[0x3d5ce]];
  }

  write(): Module[] {
    const a = this.rom.assembler();
    ADDRESS.loc(a);
    a.label('TownWarpTable');
    a.byte(...this.locations);
    a.org(0xdc8c);
    a.instruction('lda', 'TownWarpTable,y');
    a.org(0xd5c9);
    a.instruction('lda', '#' + this.thunderSwordWarp[0]);
    a.org(0xd5cd);
    a.instruction('lda', '#' + this.thunderSwordWarp[1]);
    return [a.module()];
  }
}

// Location of the TownWarpTable in vanilla rom
const ADDRESS = Address.of(Segment.$fe, 0xdc58);
const COUNT = 12;
