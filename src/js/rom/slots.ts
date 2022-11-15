import { Assembler } from '../asm/assembler';
import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Segment, relocExportLabel} from './util';

const {$0e} = Segment;

export class Slots extends Array<number> {

  private checkCount : number = 0x70;
  private mimicCount : number = 0x10;

  constructor(readonly rom: Rom) {
    super(0x80);
    for (let i = 0; i < 0x80; i++) {
      // this[i] = rom.prg[BASE + i];
      this[i] = i;
    }
  }

  setCheckCount(count: number) {
    this.checkCount = count;
  }
  
  setMimicCount(count: number) {
    this.mimicCount = count;
  }

  swap(i: number, j: number) {
    if (i === j) return;
    const tmp = this[i];
    this[i] = this[j];
    this[j] = tmp;
  }

  exportDigits(a:Assembler, str: String, num: number,) {
    const countAsStr = num.toString().padStart(3, "0");
    a.assign(`${str}_HUN`, Number(countAsStr[0]));
    a.export(`${str}_HUN`);
    a.assign(`${str}_TEN`, Number(countAsStr[1]));
    a.export(`${str}_TEN`);
    a.assign(`${str}_ONE`, Number(countAsStr[2]));
    a.export(`${str}_ONE`);
  }

  write(): Module[] {
    const a = this.rom.assembler();
    relocExportLabel(a, [$0e], 'CheckToItemGetMap');
    this.exportDigits(a, "CHECK_COUNT", this.checkCount);
    this.exportDigits(a, "MIMIC_COUNT", this.mimicCount);
    a.byte(...this);
    return [a.module()];
  }
}
