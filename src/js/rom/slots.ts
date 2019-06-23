import {seq} from './util.js';
import {Rom} from '../rom.js';

interface Slot {
  readonly slot: number;
  set(rom: Rom, item: number): void;
}

// TODO - consider a function interface instead of a class?
//      - are we getting benefit from inspection at all?

class ChestSlot implements Slot {
  constructor(readonly slot: number, readonly location: number, readonly spawn: number) {}

  set(rom: Rom, item: number): void {
    rom.locations[this.location].spawns[this.spawn].id = item;

    if (rom.spoiler) {
      rom.spoiler.addSlot(this.slot, `Chest in ${rom.locations[this.location].name}`, item);
    }
  }
}

class HardcodedSlot implements Slot {
  constructor(readonly slot: number, readonly address: number, readonly name?: string) {}

  set(rom: Rom, item: number): void {
    rom.prg[this.address] = item;

    if (this.name && rom.spoiler) rom.spoiler.addSlot(this.slot, this.name || '', item);
  }
}

class BossDropSlot implements Slot {
  constructor(readonly slot: number, readonly boss: number) {}

  set(rom: Rom, item: number): void {
    //rom.bosses.fromBossKill(this.boss).drop = item;
    //const addr = readLittleEndian(rom.prg, 0x1f96b + 2 * this.boss) + 0x14000;
    if (item >= 0x70) throw new Error('no mimics on bosses');
    rom.bossKills[this.boss].data[4] = item;
    //rom.prg[addr + 4] = item;

    if (rom.spoiler) {
      rom.spoiler.addSlot(this.slot, rom.bosses.fromBossKill(this.boss)!.name, item);
    }
  }
}

class PersonDataSlot implements Slot {
  constructor(readonly slot: number, readonly person: number, readonly index: number) {}

  set(rom: Rom, item: number): void {
    if (item >= 0x70) throw new Error(`no mimics on people`);
    rom.npcs[this.person].data[this.index] = item;

    if (rom.spoiler) {
      const npc = rom.npcs[this.person];
      let name = npc && npc.name;
      if (npc && npc.itemNames) {
        const itemName = npc.itemNames[this.index];
        name = itemName ? name + ' ' + itemName : undefined;
      }
      rom.spoiler.addSlot(this.slot, name || '', item);
    }
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
class Slots {

  private slots: ReadonlyArray<ReadonlyArray<Slot>>;

  constructor(readonly rom: Rom) {

    // TODO - this needs to move to AFTER we've done some initial fixup...!
    // Maybe we really do need to make it separate from the rom?

    const slots: Slot[][] = seq(0x80, () => []);
    function addSlot(slot: Slot): void {
      slots[slot.slot].push(slot);
    }

    // Find chests
    for (const loc of rom.locations) {
      if (!loc.used) continue;
      for (let i = 0; i < loc.spawns.length; i++) {
        const spawn = loc.spawns[i];
        if (spawn.isChest()) addSlot(new ChestSlot(spawn.id, loc.id, i));
      }
    }

    // Find item givers
    for (const npc of rom.npcs) {
      if (!npc.used || !npc.hasDialog) continue;
      for (const ds of npc.localDialogs.values()) {
        for (const d of ds) {
          switch (d.message.action) {
          case 0x03:
            addSlot(new PersonDataSlot(npc.data[0], npc.id, 0));
            break;
          case 0x09:
          case 0x11:
            addSlot(new PersonDataSlot(npc.data[1], npc.id, 1));
            break;
          }
        }
      }
    }

    // Find boss drops
    for (const boss of rom.bosses) {
      if (boss.kill === 3 || boss.kill === 13) continue; // false alarms
      if (boss.kill != null && boss.drop != null) {
        addSlot(new BossDropSlot(boss.drop, boss.kill));
      }
    }

    // Record hardcoded slots
    for (const [addr, name] of hardcodedItems) {
      addSlot(new HardcodedSlot(this.rom.prg[addr], addr, name));
    }
    extraSlots.forEach(addSlot);

    console.log('slots', slots);

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


const hardcodedItems: ReadonlyArray<readonly [number, string?]> = [
  [0x367f4, 'Stom fight'],
  [0x3d18f, 'Slimed Kensu'],
  [0x3d1f9, 'Asina'],
  [0x3d2af, 'Stoned Akahana'],
  [0x3d30e, 'Lighthouse Kensu'],
  [0x3d337, 'Rage'],
  [0x3d655, 'Mt Sabre summit trigger'],
  [0x3d6d9, 'Whirlpool trigger'],
  [0x3d6de, 'Swan Kensu'],
  [0x3d6e8, 'Aryllis'],
  [0x3d711], // refresh from trigger
  [0x3d7fe, 'Akahana statue trade-in'],
  [0x3e3a2], // invisible flag for statue of onyx
  [0x3e3a6], // invisible flag for kirisa plant
  [0x3e3aa], // invisible flag for love pendant
];

const extraSlots = [
  new PersonDataSlot(0x36, 0x63, 1), // shell flute (dolphin)
];

export function update(rom: Rom, fill: number[]): void {
  new Slots(rom).update(fill);
}


/**
 * By default when we fill a slot, we bring the itemget flags along with.
 * This ensures that dialogs that trigger off of it aren't broken.
 * The following are not moved, though we should fix that by changing them
 * into the normal 2xx item flags.
 */
const preservedItemGetFlags = new Set([
  // 0x00e, // telepathy - used for talking to animals/dwarfs
  0x024, // generals defeated - will deal with this later
  // 0x03f, // teleport - used for trigger
  // 0x05f, // sword of thunder - used to trigger massacre
  0x08b, // shell flute - checked by fisherman -- TODO change to 236?
]);
