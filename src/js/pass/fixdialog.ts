import {Rom} from '../rom.js';
import {Item} from '../rom/item.js';
import {Npc} from '../rom/npc.js';
import {hex} from '../rom/util.js';
import {buildTradeInMap} from './shuffletrades.js';
import {fail} from '../assert.js';

/** Finds references to given items and replaces it with the actual items. */
export function fixDialog(rom: Rom) {
  // Stom's "I'll, be waiting..." dialog - the comma is just wrong.
  replaceMessage('03:06', ',', '');

  const tradeIns = buildTradeInMap(rom);
  // NOTE: we need to hardcode original names in case they were shuffled.

  const zebu = rom.npcs[0x5e];
  if (zebu.data[0] < 0x41) unmagic('00:1b');
  replaceMessage('00:1b', '[41:Refresh]', item(zebu.data[0]));

  const akahanaTradeIn = tradeIns.get(0x82);
  if (akahanaTradeIn) {
    replaceMessage('02:01', 'an unusual statue', vague(akahanaTradeIn));
    replaceMessage('02:02', 'a statue', `the ${commonNoun(akahanaTradeIn)}`);
  }

  const gasMaskSlot = actionGrant(akahanaTradeIn); // opel statue
  replaceMessage('02:02', '[29:Gas Mask]', item(gasMaskSlot));

  const telepathySlot = rom.prg[0x367f4];
  if (telepathySlot < 0x41) unmagic('03:01');
  replaceMessage('03:01', '[43:Telepathy]', item(telepathySlot));

  const tornel = rom.npcs[0x5f];
  const tornelTradeIn = findTornelTradeIn(tornel);
  replaceMessage('03:01', '[06:Tornado Bracelet]', item(tornelTradeIn));
  replaceMessage('05:0a', '[06:Tornado Bracelet]', item(tornelTradeIn));
  replaceMessage('05:0a', '[44:Teleport]', item(tornel.data[0]));

  const fogLampTradeIn = tradeIns.get(0x64);
  if (fogLampTradeIn != null) {
    replaceMessage('09:01', '[35:Fog Lamp]', item(fogLampTradeIn));
    replaceMessage('09:04', '[35:Fog Lamp]', item(fogLampTradeIn));
    replaceMessage('09:05', '[35:Fog Lamp]', item(fogLampTradeIn));
    replaceMessage('09:06', 'lamp', commonNoun(fogLampTradeIn));
  }

  const queen = rom.npcs[0x38];
  replaceMessage('0a:0c', '[28:Flute of Lime]', item(queen.data[0]));
  replaceMessage('0a:0d', '[02:Sword of Water]',
                 item(queen.localDialogs.get(-1)![3].condition & 0xff));
  // TODO - consider replacing 0a:0d but we need to also replace condition?
  const recoverSlot = rom.prg[0x3d1f9]; // TODO - consolidate in table?
  if (recoverSlot < 0x41) unmagic('0b:01');
  replaceMessage('0b:01', '[45:Recover]', item(recoverSlot));

  const barrierSlot = actionGrant(0x84);
  if (barrierSlot < 0x41) {
    unmagic('0b:01');
    unmagic('1d:12');
  }
  replaceMessage('0b:01', '[46:Barrier]', item(barrierSlot));
  replaceMessage('1d:12', '[46:Barrier]', item(barrierSlot));

  // Look for a key item in the fog lamp/kirisa plant caves.
  // Order is back of fog lamp, kirisa back-to-front, then front of fog lamp
  let fogLampCaveLoot = findLoot(0x4f, 0x4e, 0x4d, 0x4c, 0x47, 0x46, 0x45, 0x44,
                                 0x4b, 0x4a, 0x49, 0x48);
  if (fogLampCaveLoot >= 0) {
    replaceMessage('0d:00', '[35:Fog Lamp]', item(fogLampCaveLoot));
  } else {
    replaceMessage('0d:00', 'that a [35:Fog Lamp] was', 'there was treasure');
  }

  const rageTradeIn = rom.npcs[0xc3].localDialogs.get(-1)![0].condition & 0xff;
  const rageItem = rom.prg[0x3d337];
  replaceMessage('0e:03', '[02:Sword of Water]', item(rageTradeIn));
  replaceMessage('0e:03', '[09:Ball of Water]', item(rageItem));

  // TODO - message 10:0c is only half-correct.  If item names are randomized
  // then even without a location the message is still useful.  So just do that
  // for now, and we can find a way to hint later.
  replaceMessage('10:0c', 'that\'s', 'is');
  replaceMessage('10:0c', /, is in the\+lighthouse/, '');

  const aryllisTradeIn = tradeIns.get(0x23);
  if (aryllisTradeIn != null) {
    replaceMessage('12:05', '[3c:Kirisa Plant]', item(aryllisTradeIn));
    replaceMessage('12:10', 'the plant', `the ${commonNoun(aryllisTradeIn)}`);
    replaceMessage('12:10', '[3c:Kirisa Plant]', item(aryllisTradeIn));
    // TODO - refs in 12:09 and 12:0a have location, too.
    // replaceMessage('12:09', /\s*\n.*/, '.');
    // replaceMessage('12:0a', /\s*\n.*/, '.');
    const clue = `Our illustrious chief seeks ${vague(aryllisTradeIn)}.`;
    replaceMessage('12:09', /[^]*/, clue);
    replaceMessage('12:0a', /[^]*/, clue);
  }

  const lovePendantTradeIn = tradeIns.get(0x74);
  if (lovePendantTradeIn != null) {
    replaceMessage('13:02', '[3b:Love Pendant]', item(lovePendantTradeIn));
    replaceMessage('13:00', 'pendant', commonNoun(lovePendantTradeIn));
  }
  const changeSlot = actionGrant(lovePendantTradeIn);
  if (changeSlot < 0x41) {
    unmagic('13:02');
  }
  replaceMessage('13:02', '[47:Change]', item(changeSlot));

  const ivoryStatueTradeIn = tradeIns.get(0x75);
  if (ivoryStatueTradeIn != null) {
    replaceMessage('18:06', '[3d:Ivory Statue]', item(ivoryStatueTradeIn));
    replaceMessage('18:07', '[3d:Ivory Statue]', item(ivoryStatueTradeIn));
  }
  replaceMessage('18:06', `It's in a room`, '{0b:Karmine} is');
  const flightSlot = rom.prg[0x3d18f]; // TODO - consolidate?
  if (flightSlot < 0x41) replaceMessage('18:07', 'teach', 'give');
  replaceMessage('18:07', '[48:Flight]', item(flightSlot));

  const paralysisSlot = actionGrant(0xb2);
  if (paralysisSlot < 0x41) unmagic('1c:10');
  replaceMessage('1c:10', '[42:Paralysis]', item(paralysisSlot));

  // TODO - shuffle which item reconstructs which other?
  replaceMessage('20:06', 'Statue of Gold', item(actionGrant(0x39))));

  // TODO - consider warping on a random sword? - message 1c:11

  ////////////////////////////////////////////////////////////////

  function unmagic(mid: string) {
    replaceMessage(mid, /teach\s+you\s+the\s+magic\s+of/, 'bestow upon you the');
  }
  function item(id: number): string {
    const item = itemget(id);
    return `[${hex(item.id)}:${item.messageName}]`;
  }
  function replaceMessage(mid: string, pat: string | RegExp, repl: string) {
    const [part, index] = mid.split(':').map(x => parseInt(x, 16));
    const msg = rom.messages.parts[part][index];
    msg.text = msg.text.replace(pat, repl);
  }
  function findLoot(...locs: number[]) {
    const conditions = [
      (item: number) => BOWS.has(item),
      (item: number) => SWORD_OR_MAGIC.has(item),
      (item: number) => itemget(item).unique,
    ];

    for (const cond of conditions) {
      for (const id of locs) {
        const loc = rom.locations[id];
        for (const spawn of loc.spawns) {
          if (spawn.isChest() && spawn.id <= 0x48 && cond(spawn.id)) {
            return spawn.id;
          }
        }
      }
    }
    return -1;
  }
  function itemget(id: number): Item {
    const itemget = rom.itemGets[id];
    return rom.items[itemget.itemId];
  }
  function actionGrant(key: number): number {
    const grant = rom.itemGets.actionGrants.get(key);
    if (grant == null) throw new Error(`Missing actionGrant for ${hex(key)}`);
    return grant;
  }
}

const BOWS = new Set([0x3e, 0x3f, 0x40]);
const SWORD_OR_MAGIC = new Set([0x00, 0x01, 0x02, 0x03, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48]);

function findTornelTradeIn(tornel: Npc): number {
  // Expected structure:
  //   ...
  //   NOT bracelet -> ...
  //   NOT ball -> ...
  //   -> give item
  for (const ds of tornel.localDialogs.values()) {
    for (let i = 2; i < ds.length; i++) {
      const item = ~ds[i].condition;
      // Look for any negative condition on a bracelet (doesn't matter where)
      if (item > 0x204 && item <= 0x20c && !(item & 1)) return item & 0xff;
    }
  }
  return 0x06; // default to tornado bracelet
}

function vague(id: number): string {
  switch (id) {
    case 0x25: return 'an unusual statue';
    case 0x28: return 'a rare instrument';
    case 0x35: return 'a brilliant lamp';
    case 0x3b: return 'a beautiful charm';
    case 0x3c: return 'a fragrant plant';
    case 0x3d: return 'an exotic statue';
  }
  fail();
  return 'a valuable item';
}

function commonNoun(id: number): string {
  switch (id) {
    case 0x25: return 'statue';
    case 0x28: return 'instrument';
    case 0x35: return 'lamp';
    case 0x3b: return 'pendant';
    case 0x3c: return 'plant';
    case 0x3d: return 'statue';
  }
  fail();
  return 'item';
}

// function replaceDialog(npc: Npc, orig: number | RegExp, replacementId: number) {
//   const rom = npc.rom;
//   const pat = orig instanceof RegExp ? orig : pattern(rom.items[orig]);
//   const repl = replacement(rom.items[replacementId]);
//   for (const ds of npc.localDialogs.values()) {
//     for (const d of ds) {
//       const mid = d.message;
//       replaceMessage(rom, mid.part, mid.index, pat, repl);
//     }
//   }
// }

// const pattern: {(id: number, name: string): RegExp;
//                 (item: Item): RegExp} =
//     (item: number | Item, name?: string) => {
//       name = name || (item as Item).messageName;
//       const id = hex(item instanceof Item ? item.id : item);
//       return new RegExp(`\\[${id}:[^\\]]*\\]|${name.replace(/\s+/g, '\\s+')}`,
//                         'g');
//     };

// function replacement(item: Item): string {
//   return `[${hex(item.id)}:${item.messageName}]`;
// }
