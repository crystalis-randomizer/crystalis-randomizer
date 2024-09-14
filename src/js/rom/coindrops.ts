import { Module } from '../asm/module';
import { Rom } from '../rom';
import { readLittleEndian, readValue, relocExportLabel, Segment } from './util';

const {$1a} = Segment;

// List of coin drops
export class CoinDrops {

  values: number[];

  constructor(readonly rom: Rom) {
    const address = readValue('CoinAmounts', rom.prg, $1a);
    this.values = Array.from({length: COUNT}, (_, i) =>
        readLittleEndian(rom.prg, address + 2 * i));
  }

  write(): Module[] {
    const a = this.rom.assembler();
    relocExportLabel(a, 'CoinAmounts', ['3c', 'fe', 'ff']);
    a.word(...this.values);
    a.export("CoinAmounts");
    return [a.module()];
  }
}
const COUNT = 16;
