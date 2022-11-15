import {Module} from '../asm/module';
import {Rom} from '../rom';
import {tuple, Address, Segment} from './util';

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
