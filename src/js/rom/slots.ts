import {readLittleEndian, seq} from './util.js';
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
  }
}

class HardcodedSlot implements Slot {
  constructor(readonly address: number) {}

  set(rom: Rom, item: number): void {
    rom.prg[this.address] = item;
  }
}

class BossDropSlot implements Slot {
  constructor(readonly boss: number) {}

  set(rom: Rom, item: number): void {
    //rom.bosses.fromBossKill(this.boss).drop = item;
    const addr = readLittleEndian(rom.prg, 0x1f987 + 2 * this.boss) + 0x14000;
    if (item >= 0x70) throw new Error('no mimics on bosses');
    rom.prg[addr] = item;
  }
}

class PersonDataSlot implements Slot {
  constructor(readonly person: number, readonly index: number) {}

  set(rom: Rom, item: number): void {
    if (item >= 0x70) throw new Error(`no mimics on people`);
    rom.npcs[this.person].data[this.index] = item;
  }
}

// // NOTE: this is pretty inefficient, O(n^2) in itemget slots.  But we run it
// // once and it's a lot faster than other things, so it's not a big deal.
// class ReverseFlagSlot implements Slot {
//   constructor(readonly flag: number) {}

//   // TODO - 013 defeated sabera should be a reverse flag slot for sabera's drop
//   //      - then we can remove all the extra sets
//   set(rom: Rom, item: number): void {
//     for (const itemget of rom.itemGets) {
//       const index = itemget.flags.indexOf(this.flag);
//       if (items.has(itemget.id) && index < 0) itemget.flags.push(this.flag);
//       if (!items.has(itemget.id) && index >= 0) itemget.flags.splice(index, 1);
//     }
//   }
// }


// Maps from slot to item actually in the slot.
// Manages all the necessary updates for rearranging items.
export class Slots {
 
  private slots: ReadonlyArray<ReadonlyArray<Slot>>;

  constructor(readonly rom: Rom) {
    const slots: Slot[][] = seq(0x80, () => []);

    // Find chests
    for (const loc of rom.locations) {
      for (let i = 0; i < loc.spawns.length; i++) {
        const spawn = loc.spawns[i];
        if (spawn.isChest()) slots[spawn.id].push(new ChestSlot(loc.id, i));
      }
    }

    // Find item givers
    for (const npc of rom.npcs) {
      for (const ds of npc.localDialogs.values()) {
        for (const d of ds) {
          switch (d.message.action) {
          case 0x03:
            slots[npc.data[0]].push(new PersonDataSlot(npc.id, 0));
            break;
          case 0x09:
          case 0x11:
            slots[npc.data[1]].push(new PersonDataSlot(npc.id, 1));
            break;
          }
        }
      }
    }

    // Find boss drops
    for (const boss of rom.bosses) {
      if (boss.kill != null && boss.drop != null) {
        slots[boss.drop].push(new BossDropSlot(boss.kill));
      }
    }

    // Record hardcoded slots
    for (const addr of hardcodedItems) {
      const id = this.rom.prg[addr];
      slots[id].push(new HardcodedSlot(addr));
    }

    this.slots = slots;
  }

  // NOTE: this.slots is not right - there are multiple ChestSlots in the same
  // list, or a ChestSlot for 34 key to stxy, which should not be...?
  update(fill: number[]): void {
    for (let i = 0; i < fill.length; i++) {
      if (fill[i] == null) continue;
      for (const slot of this.slots[i]) {
        slot.set(this.rom, fill[i]);
      }
    }

    // Move all the flags.  First read them.
    const flags: number[][] = this.rom.itemGets.map(() => []);
    for (const itemget of this.rom.itemGets) {
      const {id} = itemget;
      for (const flag of itemget.flags) {
        if (flag === -1) continue;
        const target = preservedItemGetFlags.has(flag) ? id : fill[id];
        // NOTE: it's possible the target slot is a mimic - in that case
        // we've already guaranteed that the flag just a consumable chest
        // flag, so it's safe to just drop it on the floor.
        (flags[target] || []).push(flag);
      }
    }
    // Now write them
    for (const itemget of this.rom.itemGets) {
      itemget.flags = flags[itemget.id];
    }
  }
}


const hardcodedItems = [
  0x367f4, // telepathy from stom
  0x3d18f, // flight from kensu
  0x3d1f9, // recover from asina
  0x3d337, // ball of water from rage
  0x3d655, // paralysis from trigger
  0x3d6d9, // barrier from trigger
  0x3d6de, // change from kensu
  0x3d6e8, // bow of moon from aryllis
  0x3d711, // refresh from trigger
  0x3e3a2, // invisible flag for statue of onyx
  0x3e3a6, // invisible flag for kirisa plant
  0x3e3aa, // invisible flag for love pendant
];


/**
 * By default when we fill a slot, we bring the itemget flags along with.
 * This ensures that dialogs that trigger off of it aren't broken.
 * The following are not moved, though we should fix that by changing them
 * into the normal 2xx item flags.
 */
const preservedItemGetFlags = new Set([
  0x00e, // telepathy - used for talking to animals/dwarfs
  0x024, // generals defeated - will deal with this later
  0x03f, // teleport - used for trigger
  0x05f, // sword of thunder - used to trigger massacre
  0x08b, // shell flute - checked by fisherman -- TODO change to 236?
]);
