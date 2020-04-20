import {Random} from '../random.js';
import {Rom} from '../rom.js';

export function shuffleMonsterPositions(rom: Rom, random: Random) {
  for (const loc of rom.locations) {
    loc.meta.replaceMonsters(random);
  }
}
