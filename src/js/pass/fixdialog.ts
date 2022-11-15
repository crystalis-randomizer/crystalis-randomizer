import {Rom} from '../rom';
import {Flag} from '../rom/flags';
import {Item} from '../rom/item';
import {Npc} from '../rom/npc';
import {hex} from '../rom/util';
import {buildTradeInMap} from './shuffletrades';
import {fail} from '../assert';

/** Finds references to given items and replaces it with the actual items. */
export function fixDialog(rom: Rom) {
  const {
    flags: {
      AkahanaStatueOfOnyxTradein,
      AsinaInBackRoom,
      BehindWhirlpool,
      KensuInSwan,
      MtSabreNorthSummit,
      MtSabreWestTornel,
      PortoaQueen: PortoaQueenItem,
      Rage,
      RepairedStatue,
      SlimedKensu,
      StomFightReward,
      UndergroundChannelUnderwaterChest,
      ZebuAtWindmill,
    },
    npcs: {
      AkahanaInBrynmaer,
      Aryllis,
      Fisherman,
      PortoaQueen,
    },
    locations: {
      PortoaPalace_ThroneRoom,
    },
  } = rom;

  // Stom's "I'll, be waiting..." dialog - the comma is just wrong.
  replaceMessage('03:06', ',', '');

  const tradeIns = buildTradeInMap(rom);
  function tradeIn(npc: Npc): Item {
    const trade = tradeIns.get(npc.id);
    if (!trade) throw new Error(`No trade-in for ${npc.name}`);
    return rom.items[trade];
  }
  // NOTE: we need to hardcode original names in case they were shuffled.

  if (!ZebuAtWindmill.item.isMagic()) unmagic('00:1b');
  replaceMessage('00:1b', '[41:Refresh]', item(ZebuAtWindmill.item));

  const akahanaWant = tradeIn(AkahanaInBrynmaer);
  replaceMessage('02:01', 'an unusual statue', vague(akahanaWant));
  replaceMessage('02:02', 'a statue', `the ${commonNoun(akahanaWant)}`);
  replaceMessage('02:02', '[29:Gas Mask]', item(AkahanaStatueOfOnyxTradein));

  if (!StomFightReward.item.isMagic()) unmagic('03:01');
  replaceMessage('03:01', '[43:Telepathy]', item(StomFightReward));

  const tornelWant = findTornelTradeIn(rom);
  replaceMessage('03:01', '[06:Tornado Bracelet]', item(tornelWant));
  replaceMessage('05:0a', '[06:Tornado Bracelet]', item(tornelWant));
  replaceMessage('05:0a', '[44:Teleport]', item(MtSabreWestTornel));

  const fogLampWant = tradeIn(Fisherman);
  replaceMessage('09:01', '[35:Fog Lamp]', item(fogLampWant));
  replaceMessage('09:04', '[35:Fog Lamp]', item(fogLampWant));
  replaceMessage('09:05', '[35:Fog Lamp]', item(fogLampWant));
  replaceMessage('09:06', 'lamp', commonNoun(fogLampWant));

  const queenWant = PortoaQueen.dialog(PortoaPalace_ThroneRoom)[1].condition;
  replaceMessage('0a:0c', '[28:Flute of Lime]', item(PortoaQueenItem));
  replaceMessage('0a:0d', '[02:Sword of Water]', item(queenWant));
  // TODO - consider replacing 0a:0d but we need to also replace condition?
  if (!AsinaInBackRoom.item.isMagic()) unmagic('0b:01');
  replaceMessage('0b:01', '[45:Recover]', item(AsinaInBackRoom));

  if (!BehindWhirlpool.item.isMagic()) {
    unmagic('0b:01');
    unmagic('1d:12');
  }
  replaceMessage('0b:01', '[46:Barrier]', item(BehindWhirlpool));
  replaceMessage('1d:12', '[46:Barrier]', item(BehindWhirlpool));

  // Look for a key item in the fog lamp/kirisa plant caves.
  // Order is back of fog lamp, kirisa back-to-front, then front of fog lamp
  let fogLampCaveLoot = findLoot(0x4f, 0x4e, 0x4d, 0x4c, 0x47, 0x46, 0x45, 0x44,
                                 0x4b, 0x4a, 0x49, 0x48);
  if (fogLampCaveLoot) {
    replaceMessage('0d:00', '[35:Fog Lamp]', item(fogLampCaveLoot));
  } else {
    replaceMessage('0d:00', 'that a [35:Fog Lamp] was', 'there was treasure');
  }

  const rageWant = rom.npcs.Rage.dialog()[0].condition;
  replaceMessage('0e:03', '[02:Sword of Water]', item(rageWant));
  replaceMessage('0e:03', '[09:Ball of Water]', item(Rage));

  // TODO - message 10:0c is only half-correct.  If item names are randomized
  // then even without a location the message is still useful.  So just do that
  // for now, and we can find a way to hint later.
  replaceMessage('10:0c', 'that\'s', 'is');
  replaceMessage('10:0c', /, is in the\+lighthouse/, '');

  const aryllisWant = tradeIn(Aryllis);
  replaceMessage('12:05', '[3c:Kirisa Plant]', item(aryllisWant));
  replaceMessage('12:10', 'the plant', `the ${commonNoun(aryllisWant)}`);
  replaceMessage('12:10', '[3c:Kirisa Plant]', item(aryllisWant));
  // TODO - refs in 12:09 and 12:0a have location, too.
  // replaceMessage('12:09', /\s*\n.*/, '.');
  // replaceMessage('12:0a', /\s*\n.*/, '.');
  const aryllisClue = `Our illustrious chief seeks ${vague(aryllisWant)}.`;
  replaceMessage('12:09', /[^]*/, aryllisClue);
  replaceMessage('12:0a', /[^]*/, aryllisClue);

  const lovePendantWant = tradeIn(rom.npcs.KensuInSwan);
  replaceMessage('13:02', '[3b:Love Pendant]', item(lovePendantWant));
  replaceMessage('13:00', 'pendant', commonNoun(lovePendantWant));
  if (!KensuInSwan.item.isMagic()) {
    unmagic('13:02');
  }
  replaceMessage('13:02', '[47:Change]', item(KensuInSwan));

  const ivoryStatueWant = tradeIn(rom.npcs.SlimedKensu);
  replaceMessage('18:06', '[3d:Ivory Statue]', item(ivoryStatueWant));
  replaceMessage('18:07', '[3d:Ivory Statue]', item(ivoryStatueWant));
  replaceMessage('18:06', `It's in a room`, '{0b:Karmine} is');
  if (!SlimedKensu.item.isMagic()) replaceMessage('18:07', 'teach', 'give');
  replaceMessage('18:07', '[48:Flight]', item(SlimedKensu));

  if (!MtSabreNorthSummit.item.isMagic()) unmagic('1c:10');
  replaceMessage('1c:10', '[42:Paralysis]', item(MtSabreNorthSummit));

  // TODO - shuffle which item reconstructs which other?
  replaceMessage('20:06', 'Statue of Gold', item(RepairedStatue));

  // Find the dolphin underground channel message.
  const dolphinChannelTrigger = rom.allocatedTriggers.get('channel item');
  if (dolphinChannelTrigger != null) {
    replaceMessage(rom.trigger(dolphinChannelTrigger).message.mid,
                   '[3b:Love Pendant]',
                   item(UndergroundChannelUnderwaterChest));
  }

  // TODO - consider warping on a random sword? - message 1c:11

  // Split the message on either side of Sabre N entrance.
  {
    const msg = rom.messages.alloc();
    rom.trigger(0x86).message.mid = msg.mid; // rabbit
    msg.text =
        '{:HERO:}, there\'s nothing to see here! Return to Zebu at once!';
    // rom.trigger(0xba) // teleport
    // TODO - see if it's changed?
    rom.messages.parts[0x1c][0x0f].text =
        '{:HERO:}, you cannot climb this yet! Seek out [44:Teleport] at once!';
  }

  ////////////////////////////////////////////////////////////////

  function unmagic(mid: string) {
    replaceMessage(mid, /teach\s+you\s+the\s+magic\s+of/, 'bestow upon you the');
  }
  function item(item: number|Flag|Item): string {
    if (typeof item === 'number') {
      item = rom.items[rom.itemGets[item & 0xff].itemId];
    } else if (!(item instanceof Item)) item = item.item as Item;
    return `[${hex(item.id)}:${item.messageName}]`;
  }
  function replaceMessage(mid: string, pat: string | RegExp, repl: string) {
    const [part, index] = mid.split(':').map(x => parseInt(x, 16));
    const msg = rom.messages.parts[part][index];
    msg.text = msg.text.replace(pat, repl);
  }
  function findLoot(...locs: number[]): Item|undefined {
    const conditions = [
      (item: number) => BOWS.has(item),
      (item: number) => SWORD_OR_MAGIC.has(item),
      (item: number) => itemget(item).unique,
    ];

    for (const cond of conditions) {
      for (const id of locs) {
        const loc = rom.locations[id];
        // NOTE: Fog Lamp Cave 3 has the spawns in order, so we need to
        // check for the spawns in reverse order to go deeper-first.
        const spawns = [...loc.spawns].reverse();
        for (const spawn of spawns) {
          if (!spawn.isChest()) continue;
          const item = rom.slots[spawn.id];
          if (item <= 0x48 && cond(item)) {
            return rom.items[item];
          }
        }
      }
    }
    return undefined;
  }
  function itemget(id: number): Item {
    const itemget = rom.itemGets[id];
    return rom.items[itemget.itemId];
  }
}

const BOWS = new Set([0x3e, 0x3f, 0x40]);
const SWORD_OR_MAGIC = new Set([0x00, 0x01, 0x02, 0x03, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48]);

function findTornelTradeIn(rom: Rom): Item {
  // Expected structure:
  //   ...
  //   NOT bracelet -> ...
  //   NOT ball -> ...
  //   -> give item
  const {Tornel} = rom.npcs;
  for (const ds of Tornel.localDialogs.values()) {
    for (let i = 2; i < ds.length; i++) {
      const item = ~ds[i].condition;
      // Look for any negative condition on a bracelet (doesn't matter where)
      if (item > 0x204 && item <= 0x20c && !(item & 1)) {
        return rom.items[item & 0xff];
      }
    }
  }
  return rom.items.TornadoBracelet; // default to tornado bracelet
}

function vague(item: Item): string {
  const items = item.rom.items;
  switch (item) {
    case items.StatueOfOnyx: return 'an unusual statue';
    case items.FluteOfLime:  return 'a rare instrument';
    case items.FogLamp:      return 'a brilliant lamp';
    case items.LovePendant:  return 'a beautiful charm';
    case items.KirisaPlant:  return 'a fragrant plant';
    case items.IvoryStatue:  return 'an exotic statue';
    // TODO - statue of gold
  }
  fail();
  return 'a valuable item';
}

function commonNoun(item: Item): string {
  const items = item.rom.items;
  switch (item) {
    case items.StatueOfOnyx: return 'statue';
    case items.FluteOfLime:  return 'instrument';
    case items.FogLamp:      return 'lamp';
    case items.LovePendant:  return 'pendant';
    case items.KirisaPlant:  return 'plant';
    case items.IvoryStatue:  return 'statue';
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
