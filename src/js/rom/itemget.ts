import {Entity, Rom} from './entity.js';
import {MessageId} from './messageid.js';
import {ITEM_GET_FLAGS, readLittleEndian, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';

// A gettable item slot/check.  Each ItemGet maps to a single item,
// but non-unique items may map to multiple ItemGets.
export class ItemGet extends Entity {

  itemPointer: number;
  item: number;

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
    this.item = rom.prg[this.itemPointer];
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
  }

  async write(writer: Writer): Promise<void> {
    // First write (itemget -> item) mapping
    writer.rom[this.itemPointer] = this.item;
    const table = [
      this.inventoryRowStart, this.inventoryRowLength,
      ...this.acquisitionAction.data,
      ...ITEM_GET_FLAGS.bytes(this.flags),
      this.key ? 0xfe : 0xff,  // TODO: remove this byte when no longer needed
    ];
    const address = await writer.write(table, 0x1d000, 0x1efff);
    writeLittleEndian(writer.rom, this.tablePointer, address - 0x14000);
  }
}
