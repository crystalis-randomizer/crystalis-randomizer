import { Entity } from './entity.js';
import { readLittleEndian, seq, tuple, writeLittleEndian } from './util.js';
export var ShopType;
(function (ShopType) {
    ShopType[ShopType["ARMOR"] = 0] = "ARMOR";
    ShopType[ShopType["TOOL"] = 1] = "TOOL";
    ShopType[ShopType["INN"] = 2] = "INN";
    ShopType[ShopType["PAWN"] = 3] = "PAWN";
})(ShopType || (ShopType = {}));
const SHOP_TYPES = [ShopType.ARMOR, ShopType.TOOL, ShopType.INN, ShopType.PAWN];
const CONTENTS_ADDRESSES = [
    (base, count) => base ? base : VANILLA_ARMOR_SHOP_ITEMS,
    (base, count) => base ? base + 4 * count : VANILLA_TOOL_SHOP_ITEMS,
    (base, count) => 0,
    (base, count) => 0,
];
const CONTENTS_COUNTS = [4, 4, 0, 0];
const PRICES_ADDRESSES = [
    (base, count) => base ? base + 8 * count : VANILLA_ARMOR_SHOP_PRICES,
    (base, count) => base ? base + 12 * count : VANILLA_TOOL_SHOP_PRICES,
    (base, count) => base ? base + 16 * count : VANILLA_INN_PRICES,
    (base, count) => 0,
];
const PRICES_COUNTS = [4, 4, 1, 0];
export class Shop extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.type = SHOP_TYPES[id & 3];
        this.index = id >>> 2;
        if (rom.shopDataTablesAddress) {
            const base = rom.shopDataTablesAddress;
            const count = rom.shopCount;
            const locationTable = base + 17 * count;
            this.location = rom.prg[locationTable + id];
        }
        else {
            let shopLocation = 0xff;
            for (let i = 0; i < 33 && shopLocation === 0xff; i++) {
                if (rom.prg[VANILLA_SHOP_INDICES + i] !== this.index)
                    continue;
                const location = rom.prg[VANILLA_SHOP_LOCATIONS + i];
                for (const spawn of rom.locations[location].spawns) {
                    if (spawn.type !== 4)
                        continue;
                    const obj = rom.objects[spawn.id];
                    if (obj.data[25] === 0x20 + this.type) {
                        shopLocation = location;
                        break;
                    }
                }
            }
            this.location = shopLocation;
        }
        const readPrice = rom.shopDataTablesAddress ?
            i => rom.prg[this.pricesAddress + i] / 32 :
            i => readLittleEndian(rom.prg, this.pricesAddress + 2 * i);
        this.contents = tuple(rom.prg, this.contentsAddress, CONTENTS_COUNTS[this.type]);
        this.prices = seq(PRICES_COUNTS[this.type], readPrice);
        this.used = this.location !== 0xff;
    }
    get contentsAddress() {
        const base = CONTENTS_ADDRESSES[this.type](this.rom.shopDataTablesAddress, this.rom.shopCount);
        return base + 4 * this.index;
    }
    get pricesAddress() {
        const shopTable = this.rom.shopDataTablesAddress;
        const base = PRICES_ADDRESSES[this.type](shopTable, this.rom.shopCount);
        return base + (shopTable ? 1 : 2) * PRICES_COUNTS[this.type] * this.index;
    }
    updateShopkeeper() {
        throw new Error('not implemented');
    }
    write(writer) {
        const shopData = this.rom.shopDataTablesAddress;
        const prg = writer.rom;
        const writePrice = shopData ?
            (i, p) => prg[this.pricesAddress + i] = Math.round(p * 32) :
            (i, p) => writeLittleEndian(prg, this.pricesAddress + 2 * i, p);
        for (let i = 0; i < CONTENTS_COUNTS[this.type]; i++) {
            prg[this.contentsAddress + i] =
                this.contents[i] != null ? this.contents[i] : 0xff;
        }
        for (let i = 0; i < PRICES_COUNTS[this.type]; i++) {
            writePrice(i, this.prices[i] || 0);
        }
        if (shopData) {
            const shopLocations = shopData + this.rom.shopCount * 17;
            prg[shopLocations + this.id] = this.location;
        }
    }
}
const VANILLA_SHOP_LOCATIONS = 0x21f54;
const VANILLA_SHOP_INDICES = 0x21f75;
const VANILLA_ARMOR_SHOP_ITEMS = 0x21da4;
const VANILLA_ARMOR_SHOP_PRICES = 0x21dd0;
const VANILLA_TOOL_SHOP_ITEMS = 0x21e28;
const VANILLA_TOOL_SHOP_PRICES = 0x21e54;
const VANILLA_INN_PRICES = 0x21eac;
//# sourceMappingURL=shop.js.map