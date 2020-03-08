import {Module} from '../asm/module.js';
import {Rom} from '../rom.js';
import {tuple, Address, Segment} from './util.js';

// Random number table.
export class RandomNumbers {

  values: number[];

  constructor(readonly rom: Rom) {
    this.values = tuple(rom.prg, ADDRESS.offset, COUNT);
  }

  write(): Module[] {
    const a = this.rom.assembler();
    ADDRESS.loc(a);
    a.byte(...this.values);
    return [a.module()];
  }
}

const ADDRESS = Address.of(Segment.$1a, 0x97e4);
const COUNT = 64;
