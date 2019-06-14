import {MessageId} from './messageid.js';
import {ITEM_GET_FLAGS, hex, readLittleEndian, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

interface Slot {
  set(rom: Rom, item: number): void;
}

// TODO - consider a function interface instead of a class?
//      - are we getting benefit from inspection at all?

class ChestSlot implements Slot {
  constructor(readonly location: number, readonly spawn: number) {}

  set(rom: Rom, item: number): void {
    rom.locations[this.location].spawns[this.spawn].id = item;
    // TODO - remove timed here, too?
  }
}

class PersonDataSlot implements Slot {
  constructor(readonly person: number, readonly index: number) {}

  set(rom: Rom, item: number): void {
    if (item >= 0x70) throw new Error(`no mimics on people`);
    rom.npcs[this.person].data[this.index] = item;
  }
}

class ReverseFlagSlot implements Slot {
  constructor(readonly flag: number) {}

  // TODO - 013 defeated sabera should be a reverse flag slot for sabera's drop
  //      - then we can remove all the extra sets
  set(rom: Rom, item: number): void {
    for (const itemget of rom.itemGets) {
      const index = itemget.flags.indexOf(this.flag);
      if (itemget.id === item && index < 0) itemget.flags.push(this.flag);
      if (itemget.id !== item && index >= 0) itemget.flags.splice(index, 1);
    }
  }
}


// Maps from slot to item actually in the slot.
// Manages all the necessary updates for rearranging items.
export class Slots {
 
  constructor(readonly rom: Rom) {
    // TODO - find chests, etc
  }

  // async write(writer: Writer): Promise<void> {
  //   // doesn't actually write the rom so must bbe called EARLY

  // }
}


// NOTE: to change aryllis's demand, need to also change the hard-coded
// check preventing using kirisa plant unless a girl.


const slots: ReadonlyArray<readonly [number, readonly Slot[]]> = [
  [0x38, [new ReverseFlagSlot(0x013)]], // broken statue -> defeated sabera
]
