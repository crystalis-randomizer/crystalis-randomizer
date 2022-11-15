import {Random} from '../random';
import {Rom} from '../rom';

export function crumblingPlatforms(rom: Rom, random: Random) {
  // TODO - assert 8d is unused? ask rom.objects for the next unused one?
  const v = 0x7e;
  const cv = 0x9f;
  const h = 0x7f;
  const ch = 0x8d;
  
  // First step: get a free object and copy 9f to it.
  const cvObj = rom.objects[cv];
  const hObj = rom.objects[h];
  const chObj = rom.objects[ch];
  chObj.used = true;
  chObj.name = 'Crumbling Horizontal Platform';
  chObj.sfx = cvObj.sfx;
  cvObj.data.forEach((x, i) => chObj.data[i] = x);
  chObj.data[3] = hObj.data[3]; // set direction

  const hset = new Set([h - 0x50, ch - 0x50]);
  const vset = new Set([v - 0x50, cv - 0x50]);

  for (const location of rom.locations) {
    // Make all platforms in a given location consistent with each other
    if (!location.pits.length) continue;
    const crumble = random.nextInt(3) < 1; // 1 in 3 chance of crumbling
    for (const spawn of location.spawns) {
      if (!spawn.isMonster()) continue;
      if (vset.has(spawn.id)) spawn.id = (crumble ? cv : v) - 0x50;
      if (hset.has(spawn.id)) spawn.id = (crumble ? ch : h) - 0x50;
    }
  }
}
