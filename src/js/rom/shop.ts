import {Entity, Rom} from './entity.js';
import {readLittleEndian, seq, tuple, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';

// Shops are striped: tool, armor, inn, pawn
// So the tool shops have ID 0, 4, 8, ..., 40; etc

export enum ShopType {
  ARMOR = 0,
  TOOL = 1,
  INN = 2,
  PAWN = 3,
}

const SHOP_TYPES = [ShopType.ARMOR, ShopType.TOOL, ShopType.INN, ShopType.PAWN];

const CONTENTS_ADDRESSES: ((base: number, count: number) => number)[] = [
  (base, count) => base ? base : VANILLA_ARMOR_SHOP_ITEMS,
  (base, count) => base ? base + 4 * count : VANILLA_TOOL_SHOP_ITEMS,
  (base, count) => 0,
  (base, count) => 0,
];

const CONTENTS_COUNTS = [4, 4, 0, 0];

const PRICES_ADDRESSES: ((base: number, count: number) => number)[] = [
  (base, count) => base ? base + 8 * count : VANILLA_ARMOR_SHOP_PRICES,
  (base, count) => base ? base + 12 * count : VANILLA_TOOL_SHOP_PRICES,
  (base, count) => base ? base + 16 * count : VANILLA_INN_PRICES,
  (base, count) => 0,
];

const PRICES_COUNTS = [4, 4, 1, 0];

export class Shop extends Entity {

  readonly used: boolean;
  readonly location: number;
  readonly index: number;
  readonly type: ShopType;

  // List of up to 4 item IDs being sold at this shop.
  contents: number[];

  // Meaning depends on whether shops are normalized.  If so then this is
  // the adjustment from the base price, as a fraction.  If not then this
  // is just the 16-bit price.
  prices: number[];

  constructor(rom: Rom, id: number) {
    super(rom, id);

    this.type = SHOP_TYPES[id & 3];
    this.index = id >>> 2;

    if (rom.shopDataTablesAddress) {
      // Normalized prices - construct the table locations
      const base = rom.shopDataTablesAddress;
      const count = rom.shopCount;
      const locationTable = base + 17 * count;
      this.location = rom.prg[locationTable + id];
    } else {
      // Vanilla shops: need to do a more involved search for shop location.
      this.location = 0xff;
      for (let i = 0; i < 33 && this.location === 0xff; i++) {
        if (rom.prg[VANILLA_SHOP_INDICES + i] !== this.index) continue;
        const location = rom.prg[VANILLA_SHOP_LOCATIONS + i];
        for (const spawn of rom.locations[location].spawns) {
          if (spawn.type !== 4) continue;
          const obj = rom.objects[spawn.id];
          if (obj.data[25] === 0x20 + this.type) {
            this.location = location;
            break;
          }
        }
      }
    }

    const readPrice: (i: number) => number =
        rom.shopDataTablesAddress ?
            i => rom.prg[this.pricesAddress + i] / 32 :
            i => readLittleEndian(rom.prg, this.pricesAddress + 2 * i);
    this.contents = tuple(rom.prg, this.contentsAddress, CONTENTS_COUNTS[this.type]);
    this.prices = seq(PRICES_COUNTS[this.type], readPrice);
    this.used = this.location !== 0xff;
  }

  // private isNormalized(): boolean {
  //   return !!this.rom.shopDataTablesAddress;
  // }

  get contentsAddress(): number {
    const base = CONTENTS_ADDRESSES[this.type](this.rom.shopDataTablesAddress,
                                               this.rom.shopCount);
    return base + 4 * this.index;
  }

  get pricesAddress(): number {
    const shopTable = this.rom.shopDataTablesAddress;
    const base = PRICES_ADDRESSES[this.type](shopTable, this.rom.shopCount);
    return base + (shopTable ? 1 : 2) * PRICES_COUNTS[this.type] * this.index;
  }

  /**
   * Updates the spawns for the given location to include an appropriate
   * shopkeeper.  Should be called after changing locations.
   */
  updateShopkeeper(): void {
    // how to determine shop type?
    //   -> look at location's spawn data -> object type 4, id => data $620
    //      23 = pawn, 21 = tools, 22 = inn, 20 = armor
    //   reuse the generic objects 40..43, repurpose the special ones.
    //   we can also make new ones as needed using the unused object slots
    // we could alternatively make location and/or type a getter/setter pair
    throw new Error('not implemented');
  }

  write(writer: Writer): void {
    // TODO: throw an error if shopkeeper doesn't match?
    const shopData = this.rom.shopDataTablesAddress;
    const prg = writer.rom;
    const writePrice: (i: number, price: number) => void =
        shopData ?
            (i, p) => prg[this.pricesAddress + i] = Math.round(p * 32) :
            (i, p) => writeLittleEndian(prg, this.pricesAddress + 2 * i, p);
    for (let i = 0; i < CONTENTS_COUNTS[this.type]; i++) {
      prg[this.contentsAddress + i] =
          this.contents[i] != null ? this.contents[i] : 0xff;
    }
    for (let i = 0; i < PRICES_COUNTS[this.type]; i++) {
      writePrice(i, this.prices[i] || 0);
    }
    // TODO: handle vanilla write (location + index, skipping unused)
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
