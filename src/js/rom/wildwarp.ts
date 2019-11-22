import {Rom} from '../rom.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';

// List of wild warp locations.
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
