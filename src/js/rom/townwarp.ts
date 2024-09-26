import {Module} from '../asm/module';
import {Rom} from '../rom';
import { Address, exportLabel, exportValue, readValue, Segment, tuple} from './util';

// List of town warp locations.
export class TownWarp {

  locations: number[];

  // (location, entrance) pair for warp point.
  thunderSwordWarp: readonly [number, number];

  constructor(readonly rom: Rom) {
    this.locations = tuple(rom.prg, ADDRESS.offset, COUNT);
    this.thunderSwordWarp = [
      readValue('thunderSwordWarpLocation', rom.prg),
      readValue('thunderSwordWarpEntrance', rom.prg),
    ];
  }

  write(): Module[] {
    const a = this.rom.assembler();
    ADDRESS.loc(a);
    exportLabel(a, 'TownWarpTable');
    a.byte(...this.locations);
    exportValue(a, 'thunderSwordWarpLocation', this.thunderSwordWarp[0]);
    // NOTE: Ensure this is a "warp" entrance
    exportValue(a, 'thunderSwordWarpEntrance', 0x40|this.thunderSwordWarp[1]);
    return [a.module()];
  }
}

// Location of the TownWarpTable in vanilla rom
const ADDRESS = Address.of(Segment.$fe, 0xdc58);
const COUNT = 12;
