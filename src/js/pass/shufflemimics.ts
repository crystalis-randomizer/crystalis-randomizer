import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {iters} from '../util.js';

export function shuffleMimics(rom: Rom, flags: FlagSet, random: Random) {
  // NOTE: if flags.preserveUniqueChecks() then only do nonunique chests
  // 1. gather all the chests
  const chests: number[] = [];
  const mimics: number[] = [];
  for (const location of rom.locations) {
    if (INELIGIBLE_LOCATIONS.has(location.id)) continue;
    for (const spawn of location.spawns) {
      if (spawn.isChest()) {
        // Is this an eligible chest?
        const slot = rom.slots[spawn.id];
        if (slot >= 0x70) mimics.push(spawn.id);
        if (flags.preserveUniqueChecks()) {
          const itemget = rom.itemGets[slot];
          const item = rom.items[itemget?.itemId];
          if (item?.unique) continue;
        }
        if (spawn.isInvisible()) continue;
        // Add eligible chests
        chests.push(spawn.id);
      }
    }
  }
  // 2. shuffle the chests.
  random.shuffle(chests);
  // 3. zip the chests and mimics together and swap.
  // NOTE: spread the result since otherwise zip is lazy.
  rom.slots.setMimicCount(mimics.length);
  [...iters.zip(mimics, chests, (i, j) => rom.slots.swap(i, j))];
}

const INELIGIBLE_LOCATIONS = new Set([
  0xb6, // Chest behind Karmine - graphics are incompatible.
]);
