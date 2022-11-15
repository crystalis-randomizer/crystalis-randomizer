import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity, EntityArray} from './entity';
import {readLittleEndian, seq, tuple} from './util';


export class Shops extends EntityArray<Shop> {

  rescale?: boolean;
  innBasePrice = 20;
  toolShopScaling: number[] = new Array(48).fill(0);
  armorShopScaling: number[] = new Array(48).fill(0);
  basePrices: number[];

  constructor(readonly rom: Rom) {
    super(44); // 4 * rom.shopCount);
    for (let i = 0; i < 44; i++) {
      this[i] = new Shop(rom, i);
    }

    if (rom.shopDataTablesAddress != null) {
      const address =
          rom.shopDataTablesAddress +
          21 * rom.shopCount +
          2 * rom.scalingLevels;
      this.basePrices = seq(0x49, id => id >= 0xd && id < 0x27 ?
                            readLittleEndian(rom.prg,
                                             address + 2 * (id - 0xd)) :
                            0);
    } else {
      this.basePrices =
          seq(0x49,
              id => readLittleEndian(rom.prg,
                                     VANILLA_PAWN_PRICE_TABLE + 2 * id) * 2);
    }
    
  }

  armorShops(): Shop[] {
    return seq(11, i => this[4 * i]);
  }

  toolShops(): Shop[] {
    return seq(11, i => this[4 * i + 1]);
  }

  inns(): Shop[] {
    return seq(11, i => this[4 * i + 2]);
  }

  pawnShops(): Shop[] {
    return seq(11, i => this[4 * i + 3]);
  }

  write(): Module[] {
    const a = this.rom.assembler();
    if (this.rescale) {
      function exportLabel(label: string) {
        a.export(label);
        a.label(label);
      }
      a.segment("10", "fe", "ff");
      a.reloc('ShopData'); // TODO - break this up a bit?
      // NOTE: This structure is hard-coded in RomOption, with two parameters:
      //  1. SHOP_COUNT (11)
      //  2. SCALING_LEVELS (48)
      //  3. Pawn prices: 52 bytes   ; 0 = $0d, 50 = $26, 51 = "$27" (inn)
      exportLabel('ShopData');
      exportLabel('ArmorShopIdTable');
      for (const shop of this.armorShops()) {
        for (let i = 0; i < 4; i++) {
          a.byte(shop.contents[i] ?? 0xff);
        }
      }
      exportLabel('ToolShopIdTable');
      for (const shop of this.toolShops()) {
        for (let i = 0; i < 4; i++) {
          a.byte(shop.contents[i] ?? 0xff);
        }
      }
      exportLabel('ArmorShopPriceTable');
      for (const shop of this.armorShops()) {
        for (let i = 0; i < 4; i++) {
          a.byte(Math.round((shop.prices[i] ?? 0) * 32));
        }
      }
      exportLabel('ToolShopPriceTable');
      for (const shop of this.toolShops()) {
        for (let i = 0; i < 4; i++) {
          a.byte(Math.round((shop.prices[i] ?? 0) * 32));
        }
      }
      exportLabel('InnPrices');
      for (const shop of this.inns()) {
        a.byte(Math.round((shop.prices[0] ?? 0) * 32));
      }
      exportLabel('ShopLocations');
      for (const shop of this) {
        a.byte(shop.location);
      }
      exportLabel('ToolShopScaling');
      a.byte(...this.toolShopScaling);
      exportLabel('ArmorShopScaling');
      a.byte(...this.armorShopScaling);
      exportLabel('BasePrices');
      a.word(...this.basePrices.slice(0x0d, 0x27).map(x => x ?? 0));
      exportLabel('InnBasePrice');
      a.word(this.innBasePrice);
    } else {
      // TODO - can we even write non-defragged shops?
      a.segment('10', 'fe', 'ff');
      a.org(0x9da4, 'ShopData');
      for (const shop of this.armorShops()) {
        for (let i = 0; i < 4; i++) {
          a.byte(shop.contents[i] ?? 0xff);
        }
      }
      for (const shop of this.armorShops()) {
        for (let i = 0; i < 4; i++) {
          a.word(shop.prices[i] ?? 0);
        }
      }
      for (const shop of this.toolShops()) {
        for (let i = 0; i < 4; i++) {
          a.byte(shop.contents[i] ?? 0xff);
        }
      }
      for (const shop of this.toolShops()) {
        for (let i = 0; i < 4; i++) {
          a.word(shop.prices[i] ?? 0);
        }
      }
    }
    return [a.module()];
  }
}


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
      let shopLocation = 0xff;
      for (let i = 0; i < 33 && shopLocation === 0xff; i++) {
        if (rom.prg[VANILLA_SHOP_INDICES + i] !== this.index) continue;
        const location = rom.prg[VANILLA_SHOP_LOCATIONS + i];
        for (const spawn of rom.locations[location].spawns) {
          if (spawn.type !== 4) continue;
          const obj = rom.objects[spawn.id];
          if (obj.data[25] === 0x20 + this.type) {
            shopLocation = location;
            break;
          }
        }
      }
      this.location = shopLocation;
    }

    const readPrice: (i: number) => number =
        rom.shopDataTablesAddress ?
            i => rom.prg[this.pricesAddress + i] / 32 :
            i => readLittleEndian(rom.prg, this.pricesAddress + 2 * i);
    this.contents = tuple(rom.prg, this.contentsAddress, CONTENTS_COUNTS[this.type]);
    this.prices = seq(PRICES_COUNTS[this.type], readPrice);
    this.used = this.location !== 0xff;

    // TODO - checking for shops is really tricky for some reason...
    //this.rom.locations[this.location].setIsShop(true);
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
}

const VANILLA_SHOP_LOCATIONS = 0x21f54;
const VANILLA_SHOP_INDICES = 0x21f75;
const VANILLA_ARMOR_SHOP_ITEMS = 0x21da4;
const VANILLA_ARMOR_SHOP_PRICES = 0x21dd0;
const VANILLA_TOOL_SHOP_ITEMS = 0x21e28;
const VANILLA_TOOL_SHOP_PRICES = 0x21e54;
const VANILLA_INN_PRICES = 0x21eac;
const VANILLA_PAWN_PRICE_TABLE = 0x21ec2;
