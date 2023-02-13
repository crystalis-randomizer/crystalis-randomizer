import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Address, Segment, tuple} from './util';

// List of wild warp locations.
export class WildWarp {

  locations: number[];

  constructor(readonly rom: Rom) {
    this.locations = tuple(rom.prg, ADDRESS.offset, COUNT);
  }

  write(): Module[] {
    const a = this.rom.assembler();
    ADDRESS.loc(a);
    // a.label('WildWarpLocations');
    a.byte(...this.locations);
    // Why did we write this?  It isn't actually a change...?
    // a.org(0xcbd9);
    // a.instruction('lda', 'WildWarpLocations,y');
    return [a.module()];
  }
}

const ADDRESS = Address.of(Segment.$fe, 0xcbec);
const COUNT = 16;
