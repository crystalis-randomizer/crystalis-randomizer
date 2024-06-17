import {Random} from '../random';
import {Rom} from '../rom';
import {ShuffleData} from '../appatch';

export function randomizeThunderWarp(rom: Rom, random: Random, predetermined?: ShuffleData) {
  // TODO - flag for adding zombie town warp point?  given effect on flags,
  // it seems like this should probably just be required, unless we added
  // an abstraction for flags that would allow not hardcoding numbers.
  let town: number = 0;
  let index: number = -1;
  const towns = [...rom.townWarp.locations].filter(x => x !== 0xff);
  if (predetermined && predetermined.thunderWarp && 
      towns.indexOf(predetermined.thunderWarp) >= 0) {
    town = predetermined.thunderWarp;
    index = towns.indexOf(predetermined.thunderWarp);
  } else {
    index = random.nextInt(towns.length);
    town = towns[index];
    console.log(`Using random Thunder Warp: ${town}`);
  }
  let entrance = 0x40;
  if (town === rom.locations.Shyron.id ||
      town === rom.locations.Shyron_Temple.id) {
    entrance = 0x41;
  }
  rom.townWarp.thunderSwordWarp = [town, entrance];

  // Also set the correct warp point immediately.
  // By default, it's set to 2fd (shyron); if not found, add one.
  const warpFlag = 0x300 - towns.length + index;
  const flags = rom.itemGets[0x03].flags;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === 0x2fd) {
      flags[i] = warpFlag;
      return;
    }
  }
  flags.push(warpFlag);
}
