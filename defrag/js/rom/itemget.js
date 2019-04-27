import { Entity } from './entity.js';
import { MessageId } from './messageid.js';
import { ITEM_GET_FLAGS, hex, readLittleEndian, writeLittleEndian } from './util.js';
export class ItemGet extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.itemPointer = 0x1dd66 + id;
        this.item = rom.prg[this.itemPointer];
        this.tablePointer = 0x1db00 + 2 * id;
        this.tableBase = readLittleEndian(rom.prg, this.tablePointer) + 0x14000;
        let a = this.tableBase;
        this.inventoryRowStart = rom.prg[a++];
        this.inventoryRowLength = rom.prg[a++];
        this.acquisitionAction = MessageId.from(rom.prg, a);
        this.flags = ITEM_GET_FLAGS.read(rom.prg, a + 2);
        this.key = rom.prg[a + 2 + 2 * this.flags.length + 1] === 0xfe;
    }
    async write(writer) {
        writer.rom[this.itemPointer] = this.item;
        const table = [
            this.inventoryRowStart, this.inventoryRowLength,
            ...this.acquisitionAction.data,
            ...ITEM_GET_FLAGS.bytes(this.flags),
            this.key ? 0xfe : 0xff,
        ];
        const address = await writer.write(table, 0x1d000, 0x1efff, `ItemGetData ${hex(this.id)}`);
        writeLittleEndian(writer.rom, this.tablePointer, address - 0x14000);
    }
}
//# sourceMappingURL=itemget.js.map