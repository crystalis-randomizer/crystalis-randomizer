import {Rom} from '../rom.js';
import {Writer} from './writer.js';

const BASE = 0x1dc82;

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
    for (let i = 0; i < 0x80; i++) {
      writer.rom[BASE + i] = this[i];
    }
  }
}
