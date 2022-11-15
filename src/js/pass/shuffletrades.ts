import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';
import {Item} from '../rom/item';

// Shuffle the palettes.
export function shuffleTrades(rom: Rom, flags: FlagSet, random: Random) {
  if (!flags.randomizeTrades()) return;
  const {
    items: {StatueOfOnyx, FogLamp, LovePendant,
            KirisaPlant, IvoryStatue},
    locations: {Swan_DanceHall, PortoaPalace_ThroneRoom},
    npcs: {KensuInSwan},
  } = rom;

  // Map the original trade to the new trade, for updating actionGrants.
  const map = new Map<number, number>();

  const items: ReadonlyArray<readonly [Item, number, string]> = [
    [StatueOfOnyx, 0, 'Akahana'],
    [FogLamp, 0, 'Fisherman'],
    [LovePendant, 0, 'Kensu'],
    [KirisaPlant, 0, 'Aryllis'],
    [IvoryStatue, 0, 'Slimed Kensu'],
    // [FluteOfLime, 3, 'Stoned Akahana'],
  ] as const;
  const npcs = items.map(([item, trade, npcName]) => {
    if (item.trades.indexOf(trade) < 0 || trade >= item.itemUseData.length) {
      throw new Error(`not a trade: ${item} ${trade}`);
    }
    const use = item.itemUseData[trade]; // use.want === NPC id | 100
    return [use, item.id /* original item */, npcName] as const;
  });
  random.shuffle(npcs);

  for (const [item, trade] of items) {
    const [use, originalItem, npcName] = npcs.pop()!;
    item.itemUseData[trade] = use;
    if (rom.spoiler) rom.spoiler.addTrade(item.id, item.messageName, npcName);
    if (use.want === 0x164 && flags.fogLampNotRequired()) {
      // fisherman now spawns based on trade-in item
      [...rom.npcs[0x64].spawnConditions.values()][0][0] = 0x200 | item.id;
    }
    map.set(originalItem, item.id);
  }

  // Fix up the actionGrants
  rom.itemGets.actionGrants =
      new Map([...rom.itemGets.actionGrants]
              .map(([k, v]) => [map.get(k) ?? k, v]));

  // Also randomize Rage and Tornel
  const rage = rom.items[random.nextInt(4)];
  rom.npcs[0xc3].localDialogs.get(-1)![0].condition = 0x200 | rage.id;
  if (rom.spoiler) rom.spoiler.addTrade(rage.id, rage.messageName, 'Rage');
  // Portoa queen 38 takes the same sword as Rage
  rom.npcs.PortoaQueen.dialog(PortoaPalace_ThroneRoom)[1].condition = 0x200 | rage.id;

  const tornel = rom.items[random.nextInt(4) * 2 + 6];
  for (const ds of rom.npcs[0x5f].localDialogs.values()) {
    for (let i = 2; i < ds.length; i++) {
      if (ds[i].message.action === 3) {
        // NOTE: bracelet goes first
        ds[i - 2].condition = ~(0x200 | (tornel.id - 1));
        ds[i - 1].condition = ~(0x200 | tornel.id);
        if (rom.spoiler) {
          rom.spoiler.addTrade(tornel.id, tornel.messageName, 'Tornel');
        }
        break;
      }
    }
  }

  // Kensu in Swan should keep telling the player what he wants, rather
  // than switching to "I hate people who are pushy".
  KensuInSwan.dialog(Swan_DanceHall)[0].message.mid = '13:00';
  // TODO - mark 13:01 as unused?
}

// NOTE - this is copied from fixdialog
/** Builds a map from NPC id to wanted item id. */
export function buildTradeInMap(rom: Rom): Map<number, number> {
  const map = new Map();
  for (const item of rom.items) {
    for (const trade of item.trades) {
      map.set(item.itemUseData[trade].want & 0xff, item.id);
    }
  }
  return map;
}
