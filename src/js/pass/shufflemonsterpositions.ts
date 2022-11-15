import {Random} from '../random';
import {Rom} from '../rom';

export function shuffleMonsterPositions(rom: Rom, random: Random) {
  for (const loc of rom.locations) {
    if ((loc.id & 0xf8) === 0x58) continue; // skip tower
    loc.meta.replaceMonsters(random);
  }
}
