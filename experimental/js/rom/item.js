import { Entity } from './entity.js';
import { readLittleEndian } from './util.js';
export class Item extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.itemUseDataPointer = 0x1dbe2 + 2 * id;
        this.itemUseDataBase = readLittleEndian(rom.prg, this.itemUseDataPointer) + 0x14000;
        this.itemDataPointer = 0x20ff0 + id;
        this.itemDataValue = rom.prg[this.itemDataPointer];
        this.selectedItemPointer = 0x2103b + id;
        this.selectedItemValue = rom.prg[this.selectedItemPointer];
        this.basePrice = readLittleEndian(rom.prg, rom.normalizedPriceTableAddress != null ?
            rom.normalizedPriceTableAddress + id :
            0x21ec2);
    }
    async write(writer) {
    }
}
//# sourceMappingURL=item.js.map