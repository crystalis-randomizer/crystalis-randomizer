import {Rom} from '../rom.js';
import {Writer} from './writer.js';
import {Assembler} from '../asm/assembler.js';

export class Slots extends Array<number> {

  constructor(readonly rom: Rom) {
    super(0x80);
    for (let i = 0; i < 0x80; i++) {
      // this[i] = rom.prg[BASE + i];
      this[i] = i;
    }
  }

  swap(i: number, j: number) {
    if (i === j) return;
    const tmp = this[i];
    this[i] = this[j];
    this[j] = tmp;
  }

  write(writer: Writer) {
    const a = new Assembler();
    a.segment('0e');
    a.org(0x9c82);
    a.byte(...this);
    writer.modules.push(a.module());
  }
}
