import {Module} from '../asm/module.js';
import {Rom} from '../rom.js';
import {Segment, relocExportLabel} from './util.js';

const {$0e} = Segment;

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

  write(): Module[] {
    const a = this.rom.assembler();
    relocExportLabel(a, [$0e], 'CheckToItemGetMap');
    a.byte(...this);
    return [a.module()];
  }
}
