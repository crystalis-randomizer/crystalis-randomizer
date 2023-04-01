import { Module } from '../asm/module';
import { Rom } from '../rom';
import { readLittleEndian, readValue, relocExportLabel, Segment } from './util';

const {$1a} = Segment;

// List of coin drops
export class CoinDrops {

  values: number[];
  address: number;

  constructor(readonly rom: Rom) {
    this.address = readValue('CoinAmounts', rom.prg, $1a);
    this.values = Array.from({length: COUNT}, (_, i) =>
        readLittleEndian(rom.prg, this.address + 2 * i));
  }

  write(): Module[] {
    const a = this.rom.assembler();
    relocExportLabel(a, 'CoinAmounts', ['1a', 'fe', 'ff']);
    a.word(...this.values);
    a.export("CoinAmounts");
    return [a.module()];
  }
}
const COUNT = 16;
