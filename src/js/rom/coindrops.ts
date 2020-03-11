import {Module} from '../asm/module.js';
import {Rom} from '../rom.js';
import {Address, Segment, tuple} from './util.js';

// List of coin drops
export class CoinDrops {

  values: number[];

  constructor(readonly rom: Rom) {
    this.values = tuple(rom.prg, ADDRESS.offset, COUNT);
  }

  write(): Module[] {
    const a = this.rom.assembler();
    ADDRESS.loc(a);
    a.word(...this.values);
    return [a.module()];
  }
}

const ADDRESS = Address.of(Segment.$1a, 0x8bde);
const COUNT = 16;
