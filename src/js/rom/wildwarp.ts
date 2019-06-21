import {Rom} from '../rom.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';

// TODO - we need a consistent way to refer to bosses...
//  - maybe bosses.fromNpcId(), bosses.fromObjectId(), bosses.fromBossKill()

// Represents a boss slot.  Note that the specific object is tied most tightly
// to the boss kill (drop), rather than the specific identity of the boss.
export class WildWarp {

  locations: number[];

  constructor(readonly rom: Rom) {
    this.locations = tuple(rom.prg, ADDRESS, COUNT);
  }

  write(w: Writer): void {
    w.rom.subarray(ADDRESS, ADDRESS + COUNT).set(this.locations);
  }
}

const ADDRESS = 0x3cbec;
const COUNT = 16;
