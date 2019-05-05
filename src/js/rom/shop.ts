import {Entity, Rom} from './entity.js';
import {readLittleEndian, seq, tuple} from './util.js';
// import {Data, DataTuple, Mutable,
//         addr, concatIterables, group, hex,
//         seq, slice, tuple, varSlice, writeLittleEndian} from './util.js';
// import {Writer} from './writer.js';

// Shops are striped: tool, armor, inn, pawn
// So the tool shops have ID 0, 4, 8, ..., 40; etc

enum ShopType {
  ARMOR = 0,
  TOOL = 1,
  INN = 2,
  PAWN = 3,
}

const SHOP_TYPES = [ShopType.ARMOR, ShopType.TOOL, ShopType.INN, ShopType.PAWN];

export class Shop extends Entity {

  readonly used: boolean;
  readonly location: number;
  readonly index: number;
  readonly type: ShopType;

  // List of up to 4 item IDs being sold at this shop.
  contentsAddress?: number;
  contents: number[];

  // Meaning depends on whether shops are normalized.  If so then this is
  // the adjustment from the base price, as a fraction.  If not then this
  // is just the 16-bit price.
  pricesAddress?: number;
  prices: number[];

  constructor(rom: Rom, id: number) {
    super(rom, id);

    this.type = SHOP_TYPES[id & 3];
    this.index = id >>> 2;

    if (rom.shopDataTablesAddress) {
      // Normalized prices - construct the table locations
      const base = rom.shopDataTablesAddress;
      const count = rom.shopCount;
      const itemTable = base;
      const priceTable = base + 8 * count;
      const innPrices = base + 16 * count;
      const locationTable = base + 17 * count;
      this.location = rom.prg[locationTable + id];
      if (this.type < 2) { // tool or armor
        // TODO - extract a method to compute these w/ accounting for rom options
        this.contentsAddress = itemTable + 4 * (this.type * count + this.index);
        this.contents = tuple(rom.prg, this.contentsAddress!, 4);
        this.pricesAddress = priceTable + 4 * (this.type * count + this.index);
        this.prices = tuple(rom.prg, this.pricesAddress!, 4).map(x => x / 32);
      } else if (this.type === ShopType.INN) {
        this.contents = [];
        this.pricesAddress = innPrices + this.index;
        this.prices = [rom.prg[this.pricesAddress!] / 32];
      } else {
        this.contents = [];
        this.prices = [];
      }
      // TODO - what to do with missing or incorrect shopkeeper?!?
      //      - we can validate at write time, but should also be able to
      //        change it as needed...?
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

      if (this.type < 2) {
        if (this.type === ShopType.ARMOR) {
          this.contentsAddress = VANILLA_ARMOR_SHOP_ITEMS + 4 * this.index;
          this.pricesAddress = VANILLA_ARMOR_SHOP_PRICES + 8 * this.index;
        } else {
          this.contentsAddress = VANILLA_TOOL_SHOP_ITEMS + 4 * this.index;
          this.pricesAddress = VANILLA_TOOL_SHOP_PRICES + 8 * this.index;
        }
        this.contents = tuple(rom.prg, this.contentsAddress!, 4);
        this.prices =
            seq(4, i => readLittleEndian(rom.prg, this.pricesAddress! + 2 * i));
      } else if (this.type === ShopType.INN) {
        this.contents = [];
        this.pricesAddress = VANILLA_INN_PRICES + 2 * this.index;
        this.prices = [rom.prg[this.pricesAddress!]];
      } else {
        this.contents = [];
        this.prices = [];
      }
      // TODO - Populate other data as well....
    }
    this.used = this.location !== 0xff;
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
}

const VANILLA_SHOP_LOCATIONS = 0x21f54;
const VANILLA_SHOP_INDICES = 0x21f75;
const VANILLA_ARMOR_SHOP_ITEMS = 0x21da4;
const VANILLA_ARMOR_SHOP_PRICES = 0x21dd0;
const VANILLA_TOOL_SHOP_ITEMS = 0x21e28;
const VANILLA_TOOL_SHOP_PRICES = 0x21e54;
const VANILLA_INN_PRICES = 0x21eac;
