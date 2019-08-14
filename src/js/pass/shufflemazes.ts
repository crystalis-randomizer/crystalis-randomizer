import {shuffleSwamp} from '../maze/swamp.js';
import {shuffleGoa1} from '../maze/goa.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

export function shuffleMazes(rom: Rom, random: Random) {
  shuffleSwamp(rom, random);
  shuffleGoa1(rom, random);
}
