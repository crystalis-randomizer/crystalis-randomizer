import { Config } from '../config';
import { Shuffle } from '../shuffle';

export function updateThunderWarp(s: Shuffle) {
  const {Triggers: {ThunderSwordWarp, ThunderSwordWarpItem}} = Config;
  const {config: {triggers: {
    thunderSwordWarp,
    thunderSwordWarpItem,
    thunderSwordWarpItemFixed,
  }}, random, rom} = s;
  if (thunderSwordWarp === ThunderSwordWarp.NONE) {
    noTeleportOnThunderSword(s);
    return;
  }

  const [location, warpFlag] =
    thunderSwordWarp === ThunderSwordWarp.FIXED ?
      fixedThunderWarp(s) : pickRandomTown(s);
  rom.townWarp.thunderSwordWarp = makeWarp(s, location);

  let itemGetId: number;
  if (thunderSwordWarpItem === ThunderSwordWarpItem.FIXED) {
    itemGetId = thunderSwordWarpItemFixed!;
  } else if (thunderSwordWarpItem === ThunderSwordWarpItem.RANDOM) {
    // pick any itemget in the entire game...!
    itemGetId = random.pick([...rom.itemGets]).id;
  } else if (thunderSwordWarpItem === ThunderSwordWarpItem.SWORD) {
    itemGetId = random.nextInt(4);
  } else if (thunderSwordWarpItem === ThunderSwordWarpItem.UNIQUE) {
    itemGetId = random.pick([...rom.items].filter(x => x.unique)).id;
  } else {
    throw new Error(`Unknown thunderSwordWarpItem ${thunderSwordWarpItem}`);
  }

  if (itemGetId !== rom.items.SwordOfThunder.id) {
    // TODO - may not know name yet.... probably move to fixdialog.ts
    //      - consider a set of closures to do later?
    const m = rom.messages.parts[0x1c][0x11];
    // TODO - use [3a:name]
    m.text.replace(
      'Sword of Thunder',
      rom.items[rom.itemGets[itemGetId].itemId].messageName);

    // TODO - update spoiler log...????

  }

  // TODO - logic/world.ts - use the itemgets flag for warps?
  //      - addExtraRoutes can look for itemgets? but how to get entrance???
  const itemGet = rom.itemGets[itemGetId];
  if (warpFlag != null) itemGet.flags.push(warpFlag);
  itemGet.acquisitionAction.action = 1;
}

function makeWarp(s: Shuffle, location: number): [number, number] {
  const {rom: {locations: {
    Shyron_Temple,
    Shyron,
  }}} = s;
  if (location === Shyron_Temple.id) return [location, 0x41];
  if (location === Shyron.id) return [location, 0x41];
  return [location, 0x40];
}

function noTeleportOnThunderSword(s: Shuffle): void {
  const {rom} = s;
  // Change sword of thunder's action to bbe the same as other swords (16)
  rom.itemGets[0x03].acquisitionAction.action = 0x16;
}

// Pick out the warp flag if applicable
function fixedThunderWarp(s: Shuffle): [number, number?] {
  const {rom, config: {triggers: {thunderSwordWarpLocation: loc}}} = s;
  const towns = [...rom.townWarp.locations].filter(x => x !== 0xff);
  const index = towns.indexOf(loc!);
  if (index < 0) return [loc!];
  return [loc!, 0x300 - towns.length + index];
}

// Returns [location id, warp flag]
function pickRandomTown(s: Shuffle): [number, number] {
  const {rom, random} = s;
  // TODO - flag for adding zombie town warp point?  given effect on flags,
  // it seems like this should probably just be required, unless we added
  // an abstraction for flags that would allow not hardcoding numbers.

  const towns = [...rom.townWarp.locations].filter(x => x !== 0xff);
  const index = random.nextInt(towns.length);
  const town = towns[index];
  const warpFlag = 0x300 - towns.length + index;
  return [town, warpFlag];
}
