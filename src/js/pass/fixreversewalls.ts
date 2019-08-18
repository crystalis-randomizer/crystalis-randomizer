import {Rom} from '../rom.js';

// Fix the softlock that happens when you go through
// a wall backwards by moving the exit/entrance tiles
// up a bit and adjusting some tileEffects values.

export function fixReverseWalls(rom: Rom) {
  // adjust tile effect for back tiles of iron wall
  for (const t in [0x04, 0x05, 0x08, 0x09]) {
    rom.tileEffects[0xbc - 0xb3].effects[t] = 0x18;
    rom.tileEffects[0xb5 - 0xb3].effects[t] = 0x18;
  }
  // TODO - move all the entrances to y=20 and exits to yt=01
}
