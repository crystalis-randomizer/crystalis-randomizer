import {Entity, EntityArray} from './entity.js';
import {MessageId} from './messageid.js';
import {hex, readLittleEndian, readString, seq, writeLittleEndian,
        ITEM_USE_FLAGS, SPAWN_CONDITION_FLAGS} from './util.js';
import {Writer} from './writer.js';
import {Data} from './util.js';
import {Rom} from '../rom.js';
import {assertNever} from '../util.js';

const ITEM_USE_JUMP_TABLE = 0x1c399;
const ITEM_USE_DATA_TABLE = 0x1dbe2;
const ITEM_DATA_TABLE = 0x20ff0;
const SELECTED_ITEM_TABLE = 0x2103b;
const VANILLA_PAWN_PRICE_TABLE = 0x21ec2;
const MENU_NAME_TABLE = 0x21086;
const MESSAGE_NAME_TABLE = 0x28a5c; // NOTE: integrate with messages entity?

// Map to pattern entries for combinations of letters.
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

interface ItemOptions {
  trades?: number[];
  use?: boolean;
}

// An item; note that some tables go up to $49 or even $4a - these can bbe ignored
export class Item extends Entity {

  itemUseJump = 0;
  itemUseData: ItemUse[];

  itemDataValue: number; // :03 is palette, :80 is sword and magic (solid bg)
                         // :40 is unique, :20 is worn (sword/amor/orb/ring/magic)
  selectedItemValue: number;

  basePrice: number;

  // PROBLEM - read in one format, write in another...?
  messageName: string; // TODO - this should live link into Messages table
  menuName: string;

  trades: number[];
  use: boolean;

  constructor(items: Items, id: number, opts: ItemOptions = {}) {
    super(items.rom, id);
    const rom = this.rom;
    items[id] = this;
    this.itemUseData = [];
    this.trades = opts.trades || [];
    this.use = opts.use || false;

    if (this.use) {
      this.itemUseJump = readLittleEndian(rom.prg, this.itemUseJumpPointer) + 0x14000;
      const entries = items.itemUseJumps[this.itemUseJump];
      if (!entries) throw new Error(`Bad ItemUseJump: ${this.itemUseJump}`);
      let itemUseOffset = readLittleEndian(rom.prg, this.itemUseDataPointer) + 0x14000;
      for (const entry of entries) {
        const data = ItemUse.from(entry, rom.prg, itemUseOffset);
        this.itemUseData.push(data);
        itemUseOffset += data.length;
      }
    }

    this.itemDataValue = rom.prg[this.itemDataPointer];
    this.selectedItemValue = rom.prg[this.selectedItemPointer];

    if (rom.shopDataTablesAddress != null) {
      const address =
          rom.shopDataTablesAddress +
          21 * rom.shopCount +
          2 * rom.scalingLevels +
          2 * (id - 0xd);
      this.basePrice = id >= 0xd && id < 0x27 ? readLittleEndian(rom.prg, address) : 0;
    } else {
      const address = VANILLA_PAWN_PRICE_TABLE + 2 * id;
      this.basePrice = readLittleEndian(rom.prg, address) * 2;
    }

    const messageNameBase = readLittleEndian(rom.prg, this.messageNamePointer) + 0x20000;
    this.messageName = readString(rom.prg, messageNameBase);

    const menuNameBase = readLittleEndian(rom.prg, this.menuNamePointer) + 0x18000;
    this.menuName = MENU_NAME_ENCODE.reduce((s, [d, e]) => s.replace(e, d),
                                            readString(rom.prg, menuNameBase, 0xff));

    // const tradeInCount = TRADE_INS.get(id);
    // this.tradeIn =
    //     tradeInCount ? tuple(rom.prg, this.itemUseDataBase, 6 * tradeInCount) : undefined;

    // console.log(`Item ${this.menuName} base price ${this.basePrice}`);
    // TODO - rom.uniqueItemTableAddress
    //  -> current hard-coded in patch.identifyKeyItemsForDifficultyBuffs
  }

  get itemUseJumpPointer(): number {
    return ITEM_USE_JUMP_TABLE + 2 * this.id;
  }

  get itemUseDataPointer(): number {
    return ITEM_USE_DATA_TABLE + 2 * this.id;
  }

  get itemDataPointer(): number {
    return ITEM_DATA_TABLE + this.id;
  }

  get selectedItemPointer(): number {
    return SELECTED_ITEM_TABLE + this.id;
  }

  get messageNamePointer(): number {
    return MESSAGE_NAME_TABLE + 2 * this.id;
  }

  get menuNamePointer(): number {
    return MENU_NAME_TABLE + 2 * this.id;
  }

  itemUseMessages(): MessageId[] {
    const messages = new Map<string, MessageId>();
    for (const {message} of this.itemUseData) {
      messages.set(message.mid, message);
    }
    return [...messages.values()];
  }

  setName(name: string): void {
    this.messageName = this.menuName = name;
  }

  // Palette for menu icon
  get palette(): number { return this.itemDataValue & 3; }
  set palette(p: number) { this.itemDataValue = this.itemDataValue & ~3 | (p & 3); }

  // Unique item: cannot be dropped or sold
  get unique(): boolean { return !!(this.itemDataValue & 0x40); }
  set unique(u: boolean) { this.itemDataValue = this.itemDataValue & ~0x40 | (u ? 0x40 : 0); }

  // Worn item (sword/armor/orb/ring/magic) - not clear where this is used
  get worn(): boolean { return !!(this.itemDataValue & 0x20); }
  set worn(w: boolean) { this.itemDataValue = this.itemDataValue & ~0x20 | (w ? 0x20 : 0); }

  // Solid background (sword/magic)
  get solid(): boolean { return !!(this.itemDataValue & 0x80); }
  set solid(s: boolean) { this.itemDataValue = this.itemDataValue & ~0x80 | (s ? 0x80 : 0); }

  // get itemUseData(): Uint8Array {
  //   // NOTE: this is hacky, it should really be less than 24, and variable!
  //   // Moreover, some items have overlapping data, which is awkward.
  //   // So really we need separate ItemUse and ItemJump entities and then just
  //   // point to which one we want here.
  //   return this.rom.prg.subarray(this.itemUseDataBase, 24);
  // }

  async write(writer: Writer): Promise<void> {
    writer.rom[this.itemDataPointer] = this.itemDataValue;
    writer.rom[this.selectedItemPointer] = this.selectedItemValue;
    if (this.rom.shopDataTablesAddress != null) {
      if (this.id >= 0xd && this.id < 0x27) {
        const address =
            this.rom.shopDataTablesAddress +
            21 * this.rom.shopCount +
            2 * this.rom.scalingLevels +
            2 * (this.id - 0xd);
        writeLittleEndian(writer.rom, address, this.basePrice);
      }
    } else {
      const address = VANILLA_PAWN_PRICE_TABLE + 2 * this.id;
      writeLittleEndian(writer.rom, address, this.basePrice >>> 1);
    }

    const menuNameEncoded =
        MENU_NAME_ENCODE.reduce((s, [d, e]) => s.replace(d, e), this.menuName);

    const menuAddress = await writer.write(
        [...stringToBytes(menuNameEncoded), 0xff],
        0x20000, 0x21fff, `ItemMenuName ${hex(this.id)}`);
    writeLittleEndian(writer.rom, this.menuNamePointer, menuAddress - 0x18000);

    if (this.use) {
      writeLittleEndian(writer.rom,
                        this.itemUseJumpPointer, this.itemUseJump - 0x14000);

      const itemUseData: number[] = [];
      for (const use of this.itemUseData) {
        itemUseData.push(...use.bytes());
      }
      const itemUseAddress = await writer.write(
          itemUseData, 0x1c000, 0x1ffff, `ItemUseData ${hex(this.id)}`);
      writeLittleEndian(writer.rom,
                        this.itemUseDataPointer, itemUseAddress - 0x14000);
    }

    // writer.write([...stringToBytes(this.messageName), 0],
    // 0x28000, 0x29fff, `ItemMessageName ${hex(this.id)}`),
    // writeLittleEndian(writer.rom, this.messageNamePointer, messageAddress - 0x20000);
  }
}

const stringToBytes = (s: string): number[] => {
  return seq(s.length, i => s.charCodeAt(i));
};

// Trade-in slots could be customized quite a bit:
//  - NPC
//  - item required
//  - item given
//  - flags given
//  - location
// etc...
// const TRADE_INS = new Map([
//   [0x1d, 1], // medical herb
//   [0x25, 1], // statue of onyx
//   [0x28, 4], // flute of lime (first two unused)
//   [0x31, 2], // alarm flute
//   [0x35, 1], // fog lamp
//   [0x3b, 1], // love pendant
//   [0x3c, 1], // kirisa plant
//   [0x3d, 1], // ivory statue
  // TODO - consider moving sleeping people?
  //      --> would want to put something in their place?
  //          - maybe even a boss in close quarters area?
  // TODO - maybe NPC should have an "item wanted" property?
// ]);

// ItemUse data are in stanzas with 0-2 byte headers.
// The structure is determined by the ItemUseJump,
// which expects the various headers.

type ItemUseKind = 'expect' | 'screen' | 'flag' | 'location' | 'empty';

export class ItemUse {
  constructor(public kind: ItemUseKind,
              public want: number, // note: interpretation depends on kind.
              public message: MessageId,
              public flags: number[]) {}

  static from(kind: ItemUseKind, data: Data<number>, offset: number) {
    let want = 0;
    if (kind === 'expect' || kind === 'screen') {
      want = data[offset + 1] << 8 | data[offset];
      offset += 2;
    } else if (kind === 'flag') {
      const flags = SPAWN_CONDITION_FLAGS.read(data, offset);
      if (!flags.length) flags.push(~0);
      if (flags.length > 1) throw new Error(`Flag list too long: ${flags}`);
      want = flags[0];
      offset += 2;
    } else if (kind === 'location') {
      want = data[offset++];
    } else if (kind !== 'empty') {
      assertNever(kind);
    }
    const message = MessageId.from(data, offset);
    const flags = ITEM_USE_FLAGS.read(data, offset + 2);
    return new ItemUse(kind, want, message, flags);
  }

  bytes(): number[] {
    const bytes = [];
    if (this.kind === 'expect' || this.kind === 'screen') {
      bytes.push(this.want & 0xff, (this.want >>> 8) & 0xff);
    } else if (this.kind === 'flag') {
      const flagBytes = SPAWN_CONDITION_FLAGS.bytes([this.want]);
      if (flagBytes.length !== 2) throw new Error(`bad data: ${flagBytes}`);
      bytes.push(...flagBytes);
    } else if (this.kind === 'location') {
      bytes.push(this.want);
    } else if (this.kind !== 'empty') {
      assertNever(this.kind);
    } 
    bytes.push(...this.message.data);
    bytes.push(...ITEM_USE_FLAGS.bytes(this.flags));
    return bytes;
  }

  // Return the NPC id for an expect NPC use, otherwise null.
  tradeNpc(): number|null {
    if (this.kind !== 'expect') return null;
    if ((this.want >>> 8) !== 1) return null;
    return this.want & 0xff;
  }

  get length(): number {
    const header = this.kind === 'empty' ? 0 : this.kind === 'location' ? 1 : 2;
    return 2 * (1 + Math.max(1, this.flags.length)) + header;
  }
}

export class Items extends EntityArray<Item> {
  // NOTE: this must be initialized first.
  readonly itemUseJumps = DEFAULT_ITEM_USE_JUMPS;

  // Swords
  readonly SwordOfWind      = new Item(this, 0x00);
  readonly SwordOfFire      = new Item(this, 0x01);
  readonly SwordOfWater     = new Item(this, 0x02);
  readonly SwordOfThunder   = new Item(this, 0x03);
  readonly Crystalis        = new Item(this, 0x04);
  // Powers
  readonly BallOfWind       = new Item(this, 0x05);
  readonly TornadoBracelet  = new Item(this, 0x06);
  readonly BallOfFire       = new Item(this, 0x07);
  readonly FlameBracelet    = new Item(this, 0x08);
  readonly BallOfWater      = new Item(this, 0x09);
  readonly BlizzardBracelet = new Item(this, 0x0a);
  readonly BallOfThunder    = new Item(this, 0x0b);
  readonly StormBracelet    = new Item(this, 0x0c);
  // Shields
  readonly CarapaceShield   = new Item(this, 0x0d);
  readonly BronzeShield     = new Item(this, 0x0e);
  readonly PlatinumShield   = new Item(this, 0x0f);
  readonly MirroredShield   = new Item(this, 0x10);
  readonly CeramicShield    = new Item(this, 0x11);
  readonly SacredShield     = new Item(this, 0x12);
  readonly BattleShield     = new Item(this, 0x13);
  readonly PsychoShield     = new Item(this, 0x14);
  // Armor
  readonly TannedHide       = new Item(this, 0x15);
  readonly LeatherArmor     = new Item(this, 0x16);
  readonly BronzeArmor      = new Item(this, 0x17);
  readonly PlatinumArmor    = new Item(this, 0x18);
  readonly SoldierSuit      = new Item(this, 0x19);
  readonly CeramicSuit      = new Item(this, 0x1a);
  readonly BattleArmor      = new Item(this, 0x1b);
  readonly PsychoArmor      = new Item(this, 0x1c);
  // Consumables
  readonly MedicalHerb      = new Item(this, 0x1d, {use: true, trades: [0]});
  readonly Antidote         = new Item(this, 0x1e, {use: true});
  readonly LysisPlant       = new Item(this, 0x1f, {use: true});
  readonly FruitOfLime      = new Item(this, 0x20, {use: true});
  readonly FruitOfPower     = new Item(this, 0x21, {use: true});
  readonly MagicRing        = new Item(this, 0x22, {use: true});
  readonly FruitOfRepun     = new Item(this, 0x23, {use: true});
  readonly WarpBoots        = new Item(this, 0x24, {use: true});
  // Quest items (1)
  readonly StatueOfOnyx     = new Item(this, 0x25, {use: true, trades: [0]});
  readonly OpelStatue       = new Item(this, 0x26, {use: true});
  readonly InsectFlute      = new Item(this, 0x27, {use: true});
  // TODO - consider only using 2, 3?  0 and 1 are unused...
  readonly FluteOfLime      = new Item(this, 0x28, {use: true,
                                                    trades: [0, 1, 2, 3]});
  // Worn items
  readonly GasMask          = new Item(this, 0x29);
  readonly PowerRing        = new Item(this, 0x2a);
  readonly WarriorRing      = new Item(this, 0x2b);
  readonly IronNecklace     = new Item(this, 0x2c);
  readonly DeosPendant      = new Item(this, 0x2d);
  readonly RabbitBoots      = new Item(this, 0x2e);
  readonly LeatherBoots     = new Item(this, 0x2f);
  readonly ShieldRing       = new Item(this, 0x30);
  // Quest items (2)
  readonly AlarmFlute       = new Item(this, 0x31, {use: true, trades: [0, 1]});
  readonly WindmillKey      = new Item(this, 0x32, {use: true});
  readonly KeyToPrison      = new Item(this, 0x33, {use: true});
  readonly KeyToStyx        = new Item(this, 0x34, {use: true});
  readonly FogLamp          = new Item(this, 0x35, {use: true, trades: [0]});
  readonly ShellFlute       = new Item(this, 0x36, {use: true});
  readonly EyeGlasses       = new Item(this, 0x37, {use: true});
  readonly BrokenStatue     = new Item(this, 0x38, {use: true});
  readonly GlowingLamp      = new Item(this, 0x39, {use: true});
  readonly StatueOfGold     = new Item(this, 0x3a, {use: true});
  readonly LovePendant      = new Item(this, 0x3b, {use: true, trades: [0]});
  readonly KirisaPlant      = new Item(this, 0x3c, {use: true, trades: [0]});
  readonly IvoryStatue      = new Item(this, 0x3d, {use: true, trades: [0]});
  readonly BowOfMoon        = new Item(this, 0x3e, {use: true});
  readonly BowOfSun         = new Item(this, 0x3f, {use: true});
  readonly BowOfTruth       = new Item(this, 0x40, {use: true});
  // Magic
  readonly Refresh          = new Item(this, 0x41);
  readonly Paralysis        = new Item(this, 0x42);
  readonly Telepathy        = new Item(this, 0x43);
  readonly Teleport         = new Item(this, 0x44);
  readonly Recover          = new Item(this, 0x45);
  readonly Barrier          = new Item(this, 0x46);
  readonly Change           = new Item(this, 0x47);
  readonly Flight           = new Item(this, 0x48);

  constructor(readonly rom: Rom) {
    super(0x49);
  }

  async write(writer: Writer): Promise<void> {
    const promises = [];
    for (const item of this) {
      promises.push(item.write(writer));
    }
    await Promise.all(promises);
  }
}

const DEFAULT_ITEM_USE_JUMPS: {[addr: number]: ItemUseKind[]} = {
  // 3b love pendant
  0x1c439: ['expect'],
  // 40 bow of truth
  0x1c442: ['screen'],
  // 26 opel statue
  0x1c450: ['empty'],
  // 3e bow of moon, 3f bow of sun
  0x1c451: ['screen'],
  // 32 windmill key, 37 eye glasses
  0x1c45f: ['location'],
  // 33 prison key, 34 stxy, 35 fog lamp, 3c kirisa plant, 3d ivory statue
  0x1c491: ['expect'],
  // 31 alarm flute
  0x1c4a9: ['expect', 'expect'],
  // 27 insect flute
  0x1c4b3: ['location'],
  // 3a statue of gold
  0x1c4d0: ['expect'],
  // invalid
  0x1c4db: [],
  // 1d medical herb
  0x1c4e0: ['expect', 'empty'],
  // 21 fruit of power
  0x1c507: ['empty'],
  // 22 magic ring
  0x1c51d: ['empty'],
  // 1e antidote
  0x1c524: ['empty'],
  // 1f lysis plant
  0x1c52f: ['empty'],
  // 20 fruit of lime
  0x1c53a: ['empty'],
  // 23 fruit of repun
  0x1c54a: ['empty'],
  // 24 warp boots -> rts
  0x1c564: ['empty'],
  // 25 statue of onyx
  0x1c565: ['expect'],
  // 36 shell flute
  0x1c56b: ['flag'],
  // 39 glowing lamp
  0x1c585: ['empty'],
  // 28 flute of lime
  0x1c59e: ['expect', 'expect', 'expect', 'expect'],
};
