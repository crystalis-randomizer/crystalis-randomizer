import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

// Shuffle the palettes.
export function shuffleTrades(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.randomizeTrades()) return;

  const items = [
    [rom.items[0x25], 0], // statue of onyx
    [rom.items[0x28], 18], // flute of lime
    [rom.items[0x35], 0], // fog lamp
    [rom.items[0x3b], 0], // love pendant
    [rom.items[0x3c], 0], // kirisa plant
    [rom.items[0x3d], 0], // ivory statue
  ] as const;

  const npcs = [];
  for (const [item, offset] of items) {
    if (!item.tradeIn) throw new Error(`Expected trade-in for ${item.id}`);
    // save expected NPC, along with message id
    npcs.push(item.tradeIn.slice(offset, offset + 4));
  }

  random.shuffle(npcs);

  for (const [item, offset] of items) {
    const npc = npcs.pop()!;
    item.tradeIn!.splice(offset, 4, ...npc);
    if (npc[0] === 0x23) { // aryllis item requires being a girl
      rom.prg[0x3d4b5] = item.id - 0x1c;
    }
  }

  // Also randomize Rage and Tornel
  rom.npcs[0xc3].localDialogs.get(-1)![0].condition = 0x200 | random.nextInt(4);
  const tornelExpectation = random.nextInt(4) * 2 + 0x205;
  for (const ds of rom.npcs[0x5f].localDialogs.values()) {
    for (let i = 2; i < ds.length; i++) {
      if (ds[i].message.action === 3) {
        // NOTE: bracelet goes first
        ds[i - 2].condition = ~(tornelExpectation + 1);
        ds[i - 1].condition = ~tornelExpectation;
        break;
      }
    }
  }
}

// NOTE - this is copied from fixdialog
/** Builds a map from NPC id to wanted item id. */
export function buildTradeInMap(rom: Rom): Map<number, number> {
  const map = new Map();
  for (const item of rom.items) {
    if (!item.tradeIn) continue;
    for (let i = 0; i < item.tradeIn.length; i += 6) {
      map.set(item.tradeIn[i], item.id);
    }
  }
  return map;
}
