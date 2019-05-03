import {Entity, Rom} from './entity.js';
import {readLittleEndian} from './util.js';
import {Writer} from './writer.js';

// An item; note that some tables go up to $49 or even $4a - these can bbe ignored
export class Item extends Entity {

  itemUseDataPointer: number;
  itemUseDataBase: number;

  itemDataPointer: number; // starts at 20ff0, one byte each
  itemDataValue: number; // :03 is palette, :80 is sword and magic (solid bg)
                         // :40 is unique, :20 is worn (sword/amor/orb/ring/magic)
  selectedItemPointer: number;
  selectedItemValue: number;

  basePrice: number;

  // PROBLEM - read in one format, write in another...?
  

  // messageName: string; // TODO - this should live link into Messages table
  // menuName: string; // TODO - handle mappings for $2111a table

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.itemUseDataPointer = 0x1dbe2 + 2 * id;
    this.itemUseDataBase = readLittleEndian(rom.prg, this.itemUseDataPointer) + 0x14000;
    this.itemDataPointer = 0x20ff0 + id;
    this.itemDataValue = rom.prg[this.itemDataPointer];
    this.selectedItemPointer = 0x2103b + id;
    this.selectedItemValue = rom.prg[this.selectedItemPointer];
    // TODO - normalized price table is only subset - may need to adjust?
    this.basePrice = readLittleEndian(rom.prg,
                                      rom.normalizedPriceTableAddress != null ?
                                          rom.normalizedPriceTableAddress + id :
                                          0x21ec2);
  }

  async write(writer: Writer): Promise<void> {
  }
}
