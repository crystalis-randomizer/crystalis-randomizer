import {Entity, EntityArray} from './entity.js';
import {MessageId} from './messageid.js';
import {ITEM_GET_FLAGS, hex, readLittleEndian, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

const GRANT_ITEM_TABLE = 0x3d6d5;

/**
 * Array of ItemGetData table entries, together with the map of
 * trigger/itemuse grants (added for statue of gold shuffle),
 * for programmatic access.
 */
export class ItemGets extends EntityArray<ItemGet> {

  actionGrants = new Map<number, number>();

  constructor(readonly rom: Rom) {
    super(0x71);
    for (let i = 0; i < 0x71; i++) {
      this[i] = new ItemGet(rom, i);
    }

    let addr = GRANT_ITEM_TABLE;
    while (rom.prg[addr] !== 0xff) {
      const key = rom.prg[addr++];
      const value = rom.prg[addr++];
      this.actionGrants.set(key, value);
    }
  }

  async write(writer: Writer): Promise<void> {
    const promises = [];
    for (const itemget of this) {
      promises.push(itemget.write(writer));
    }
    await Promise.all(promises);
    let addr = GRANT_ITEM_TABLE;
    for (const [key, value] of this.actionGrants) {
      writer.rom[addr++] = key;
      writer.rom[addr++] = value;
    }
  }

}

// A gettable item slot/check.  Each ItemGet maps to a single item,
// but non-unique items may map to multiple ItemGets.
export class ItemGet extends Entity {

  itemPointer: number;
  itemId: number;

  tablePointer: number;
  tableBase: number;

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

    this.itemPointer = 0x1dd66 + id;
    this.itemId = rom.prg[this.itemPointer];
    // I don't fully understand this table...
    this.tablePointer = 0x1db00 + 2 * id;
    this.tableBase = readLittleEndian(rom.prg, this.tablePointer) + 0x14000;
    let a = this.tableBase;

    this.inventoryRowStart = rom.prg[a++];
    this.inventoryRowLength = rom.prg[a++];
    this.acquisitionAction = MessageId.from(rom.prg, a);
    this.flags = ITEM_GET_FLAGS.read(rom.prg, a + 2);

    // TODO: remove this check
    this.key = rom.prg[a + 2 + 2 * this.flags.length + 1] === 0xfe;

    if (id !== 0 && this.tableBase === readLittleEndian(rom.prg, 0x1dd66) + 0x14000) {
      // This is one of the unused items that point to sword of wind.
      this.key = false;
      this.flags = [];
    }
  }

  copyFrom(that: ItemGet) {
    this.inventoryRowStart = that.inventoryRowStart;
    this.inventoryRowLength = that.inventoryRowLength;
    this.acquisitionAction = that.acquisitionAction;
    this.flags = [...that.flags];
    this.key = that.key;
  }

  async write(writer: Writer): Promise<void> {
    // First write (itemget -> item) mapping
    writer.rom[this.itemPointer] = this.itemId;
    const table = [
      this.inventoryRowStart, this.inventoryRowLength,
      ...this.acquisitionAction.data,
      ...ITEM_GET_FLAGS.bytes(this.flags),
      this.key ? 0xfe : 0xff,  // TODO: remove this byte when no longer needed
    ];
    const address = await writer.write(table, 0x1c000, 0x1ffff,
                                       `ItemGetData ${hex(this.id)}`);
    writeLittleEndian(writer.rom, this.tablePointer, address - 0x14000);
  }
}
