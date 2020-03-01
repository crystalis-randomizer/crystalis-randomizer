import {Rom} from '../rom.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';

// Random number table.
export class RandomNumbers {

  values: number[];

  constructor(readonly rom: Rom) {
    this.values = tuple(rom.prg, ADDRESS, COUNT);
  }

  write(w: Writer): void {
    w.org(ADDRESS).byte(...this.values);
  }
}

const ADDRESS = 0x357e4;
const COUNT = 64;
