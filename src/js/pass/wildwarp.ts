import { Config } from '../config';
import { Location } from '../rom/location';
import { Shuffle } from '../shuffle';

export function updateWildWarp(s: Shuffle) {
  const {config, random, rom} = s;
  if (config.maps.wildWarp === Config.Maps.WildWarp.MEZAME) {
    rom.wildWarp.locations.fill(0);
  } else if (config.maps.wildWarp === Config.Maps.WildWarp.RANDOM) {
    shuffleWildWarp(s);
  } else if (config.maps.wildWarp === Config.Maps.WildWarp.FIXED) {
    throw new Error(`Fixed wild warp not yet supported`);
  }
}

function shuffleWildWarp(s: Shuffle): void {
  const {random, rom} = s;
  const locations: Location[] = [];
  for (const l of rom.locations) {
    if (l && l.used &&
        // don't add mezame because we already add it always
        l.id &&
        // don't warp into shops
        !l.isShop() &&
        // don't warp into water
        l !== rom.locations.EvilSpiritIsland1 &&
        l !== rom.locations.UndergroundChannel &&
        // don't warp into tower
        (l.id & 0xf8) !== 0x58 &&
        // don't warp to either side of Draygon 2
        l !== rom.locations.Crypt_Draygon2 &&
        l !== rom.locations.Crypt_Teleporter &&
        // don't warp into mesia shrine because of queen logic
        // (and because it's annoying)
        l !== rom.locations.MesiaShrine &&
        // don't warp into rage because it's just annoying
        l !== rom.locations.LimeTreeLake) {
      locations.push(l);
    }
  }
  random.shuffle(locations);
  rom.wildWarp.locations = [];
  const min_warps = 4;
  const count = random.nextInt(16 - min_warps) + min_warps;
  for (const loc of [...locations.slice(0, count)]) {
    rom.wildWarp.locations.push(loc.id);
    if (rom.spoiler) rom.spoiler.addWildWarp(loc.id, loc.name);
  }
  rom.wildWarp.locations.push(0);
}
