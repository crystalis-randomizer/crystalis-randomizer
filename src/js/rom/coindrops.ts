import {Rom} from '../rom.js';
import {tuple} from './util.js';
import {Writer} from './writer.js';

// List of coin drops
export class CoinDrops {

  values: number[];

  constructor(readonly rom: Rom) {
    this.values = tuple(rom.prg, ADDRESS, COUNT);
  }

  write(w: Writer): void {
    w.org(ADDRESS).word(...this.values);
  }
}

const ADDRESS = 0x34bde;
const COUNT = 16;
