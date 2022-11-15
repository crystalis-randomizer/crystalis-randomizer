import {Assembler} from '../asm/assembler';
import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity, EntityArray} from './entity';
import {MessageId} from './messageid';
import {ITEM_GET_FLAGS, Address, Segment,
  hex, readLittleEndian, relocExportLabel} from './util.js';

const {$0e, $0f, $14, $fe, $ff} = Segment;

// TODO - this depends on a preparse change, we should reconsider that.
const ITEMGET_TABLE = Address.of($0e, 0x9b00);
//const GRANT_ITEM_TABLE = Address.of($fe, 0xd6d5);
const GET_TO_ITEM_BASE = Address.of($0e, 0x9d66);
const GET_TO_ITEM_THRESHOLD = 0x49;

/**
 * Array of ItemGetData table entries, together with the map of
 * trigger/itemuse grants (added for statue of gold shuffle),
 * for programmatic access.
 *
 * ItemGet holds onto a table mapping "get IDs" above 50 to
 * actual items, but the mapping below 48 is 1:1, so there is
 * no shuffling happening here.  The slot mapping happens
 * BEFORE them ItemGet translation.  Thus, the ID of this
 * entity is not related to the "1xx" flag that is set.
 */
export class ItemGets extends EntityArray<ItemGet> {

  actionGrants = new Map<number, number>();

  constructor(readonly rom: Rom) {
    super(0x71);
    for (let i = 0; i < 0x71; i++) {
      this[i] = new ItemGet(rom, i);
    }

    // TODO - encode GRANT_ITEM_TABLE offset into rom
    // since it's really hard to read otherwise.

    // Probably the thing to do if the table doesn't exist is to
    // read these values from their vanilla loci?
    this.actionGrants.set(0x25, 0x29);
    this.actionGrants.set(0x39, 0x3a);
    this.actionGrants.set(0x3b, 0x47);
    this.actionGrants.set(0x3c, 0x3e);
    this.actionGrants.set(0x84, 0x46);
    this.actionGrants.set(0xb2, 0x42);
    this.actionGrants.set(0xb4, 0x41);

    // let addr = GRANT_ITEM_TABLE.offset;
    // while (rom.prg[addr] !== 0xff) {
    //   const key = rom.prg[addr++];
    //   const value = rom.prg[addr++];
    //   this.actionGrants.set(key, value);
    // }
  }

  write(): Module[] {
    const a = this.rom.assembler();
    for (const itemget of this) {
      itemget.assemble(a);
    }
    relocExportLabel(a, [$14, $fe, $ff], 'GrantItemTable');
    //GRANT_ITEM_TABLE.loc(a);
    for (const [key, value] of this.actionGrants) {
      a.byte(key, value);
    }
    return [a.module()];
  }
}

// A gettable item slot/check.  Each ItemGet maps to a single item,
// but non-unique items may map to multiple ItemGets.
export class ItemGet extends Entity {

  private _itemId: number;

  // What part of inventory to search when acquiring.
  inventoryRowStart: number;
  inventoryRowLength: number;
  // Only used for the 'action'.
  acquisitionAction: MessageId;
  // Flags to set/clear on getting the item.  ~flag indicates to clear.
  // Note: we can eliminate most of these since we handle the 2xx flag
  // automatically and use it for chest spawning.
  flags: number[];

  // Whether the item is "key" or not for scaling purposes.
  // TODO - find a better source for this so we can remove it from this table.
  //        We could possibly store it in a 14-byte bitfield...
  key: boolean;

  constructor(rom: Rom, id: number) {
    super(rom, id);

    this._itemId = this.itemPointer.read(rom.prg);
    // I don't fully understand this table...
    const tableBase = this.tablePointer.readAddress(rom.prg, $0e, $0f);
    let a = tableBase.offset;

    this.inventoryRowStart = rom.prg[a++];
    this.inventoryRowLength = rom.prg[a++];
    this.acquisitionAction = MessageId.from(rom.prg, a);
    this.flags = ITEM_GET_FLAGS.read(rom.prg, a + 2);

    // TODO: remove this check
    this.key = rom.prg[a + 2 + 2 * this.flags.length + 1] === 0xfe;

    if (id !== 0 && tableBase.org === readLittleEndian(rom.prg, 0x1dd66)) {
      // This is one of the unused items that point to sword of wind.
      this.key = false;
      this.flags = [];
    }
  }

  get itemPointer(): Address {
    return GET_TO_ITEM_BASE.plus(this.id);
  }

  get tablePointer(): Address {
    return ITEMGET_TABLE.plus(this.id << 1)
  }

  get itemId() { return this._itemId; }
  set itemId(itemId: number) {
    if (this.id < GET_TO_ITEM_THRESHOLD) throw new Error(`${this.id}`);
    this._itemId = itemId;
  }

  isLosable(): boolean {
    return LOSABLE_ROWS.has(this.inventoryRowStart);
  }

  copyFrom(that: ItemGet) {
    this.inventoryRowStart = that.inventoryRowStart;
    this.inventoryRowLength = that.inventoryRowLength;
    this.acquisitionAction = that.acquisitionAction;
    this.flags = [...that.flags];
    this.key = that.key;
  }

  assemble(a: Assembler) {
    // First write (itemget -> item) mapping
    this.itemPointer.loc(a);
    a.byte(this.itemId);

    const table = [
      this.inventoryRowStart, this.inventoryRowLength,
      ...this.acquisitionAction.data,
      ...ITEM_GET_FLAGS.bytes(this.flags),
      this.key ? 0xfe : 0xff,  // TODO: remove this byte when no longer needed
    ];
    a.segment($0e.name, $0f.name);
    a.reloc(`ItemGetData ${hex(this.id)}`);
    const tableAddr = a.pc();
    a.byte(...table);
    this.tablePointer.loc(a);
    a.word(tableAddr);
  }
}

const LOSABLE_ROWS = new Set([4, 8, 16]);
