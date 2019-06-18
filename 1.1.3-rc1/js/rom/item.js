import { Entity } from './entity.js';
import { MessageId } from './messageid.js';
import { hex, readLittleEndian, readString, seq, writeLittleEndian } from './util.js';
const ITEM_USE_DATA_TABLE = 0x1dbe2;
const ITEM_DATA_TABLE = 0x20ff0;
const SELECTED_ITEM_TABLE = 0x2103b;
const VANILLA_PAWN_PRICE_TABLE = 0x21ec2;
const MENU_NAME_TABLE = 0x21086;
const MESSAGE_NAME_TABLE = 0x28a5c;
const MENU_NAME_ENCODE = [
    ['Sword', '\x0a\x0b\x0c'],
    [' of ', '\x5c\x5d'],
    ['Bracelet', '\x3c\x3d\x3e\x5b'],
    ['Shield', '\x0d\x0e\x0f'],
    ['Armor', '\x7b\x11\x12'],
    ['Magic', '\x23\x25\x28'],
    ['Power', '\x13\x14\x15'],
    ['Item', '\x16\x17\x5e'],
];
export class Item extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.itemUseDataPointer = ITEM_USE_DATA_TABLE + 2 * id;
        this.itemUseDataBase = readLittleEndian(rom.prg, this.itemUseDataPointer) + 0x14000;
        this.itemDataPointer = ITEM_DATA_TABLE + id;
        this.itemDataValue = rom.prg[this.itemDataPointer];
        this.selectedItemPointer = SELECTED_ITEM_TABLE + id;
        this.selectedItemValue = rom.prg[this.selectedItemPointer];
        if (rom.shopDataTablesAddress != null) {
            const address = rom.shopDataTablesAddress +
                21 * rom.shopCount +
                2 * rom.scalingLevels +
                2 * (id - 0xd);
            this.basePrice = id >= 0xd && id < 0x27 ? readLittleEndian(rom.prg, address) : 0;
        }
        else {
            const address = VANILLA_PAWN_PRICE_TABLE + 2 * id;
            this.basePrice = readLittleEndian(rom.prg, address) * 2;
        }
        this.messageNamePointer = MESSAGE_NAME_TABLE + 2 * id;
        this.messageNameBase = readLittleEndian(rom.prg, this.messageNamePointer) + 0x20000;
        this.messageName = readString(rom.prg, this.messageNameBase);
        this.menuNamePointer = MENU_NAME_TABLE + 2 * id;
        this.menuNameBase = readLittleEndian(rom.prg, this.menuNamePointer) + 0x18000;
        this.menuName = MENU_NAME_ENCODE.reduce((s, [d, e]) => s.replace(e, d), readString(rom.prg, this.menuNameBase, 0xff));
    }
    itemUseMessages() {
        const messages = new Map();
        for (const offset of ITEM_USE_MESSAGE.get(this.id) || []) {
            const message = MessageId.from(this.rom.prg, this.itemUseDataBase + offset);
            messages.set(message.mid(), message);
        }
        return [...messages.values()];
    }
    setName(name) {
        this.messageName = this.menuName = name;
    }
    get palette() { return this.itemDataValue & 3; }
    set palette(p) { this.itemDataValue = this.itemDataValue & ~3 | (p & 3); }
    get unique() { return !!(this.itemDataValue & 0x40); }
    set unique(u) { this.itemDataValue = this.itemDataValue & ~0x40 | (u ? 0x40 : 0); }
    get worn() { return !!(this.itemDataValue & 0x20); }
    set worn(w) { this.itemDataValue = this.itemDataValue & ~0x20 | (w ? 0x20 : 0); }
    get solid() { return !!(this.itemDataValue & 0x80); }
    set solid(s) { this.itemDataValue = this.itemDataValue & ~0x80 | (s ? 0x80 : 0); }
    async write(writer) {
        writer.rom[this.itemDataPointer] = this.itemDataValue;
        writer.rom[this.selectedItemPointer] = this.selectedItemValue;
        if (this.rom.shopDataTablesAddress != null) {
            if (this.id >= 0xd && this.id < 0x27) {
                const address = this.rom.shopDataTablesAddress +
                    21 * this.rom.shopCount +
                    2 * this.rom.scalingLevels +
                    2 * (this.id - 0xd);
                writeLittleEndian(writer.rom, address, this.basePrice);
            }
        }
        else {
            const address = VANILLA_PAWN_PRICE_TABLE + 2 * this.id;
            writeLittleEndian(writer.rom, address, this.basePrice >>> 1);
        }
        const menuNameEncoded = MENU_NAME_ENCODE.reduce((s, [d, e]) => s.replace(d, e), this.menuName);
        const menuAddress = await writer.write([...stringToBytes(menuNameEncoded), 0xff], 0x20000, 0x21fff, `ItemMenuName ${hex(this.id)}`);
        writeLittleEndian(writer.rom, this.menuNamePointer, menuAddress - 0x18000);
    }
}
const stringToBytes = (s) => {
    return seq(s.length, i => s.charCodeAt(i));
};
const ITEM_USE_MESSAGE = new Map([
    [0x1d, [2, 6]],
    [0x1e, [0]],
    [0x1f, [0]],
    [0x20, [0]],
    [0x21, [0]],
    [0x22, [0]],
    [0x23, [0]],
    [0x25, [2]],
    [0x28, [2, 8, 14, 20]],
    [0x32, [1]],
    [0x33, [2]],
    [0x34, [2]],
    [0x35, [2]],
    [0x36, [2]],
    [0x37, [1]],
    [0x39, [0]],
    [0x3a, [2]],
    [0x3b, [2]],
    [0x3c, [2]],
    [0x3d, [2]],
    [0x3e, [2]],
    [0x3f, [2]],
    [0x40, [2]],
]);
//# sourceMappingURL=item.js.map