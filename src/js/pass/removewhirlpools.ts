// Remove the whirlpools blocking desert caves.

import {Rom} from '../rom.js';

export function removeWhirlpools(rom: Rom): void {
  const candidates = [
    rom.metascreens.desertCaveEntrance,
    rom.metascreens.pyramidEntrance,
    rom.metascreens.cryptEntrance,
  ];
  const whirlpool = new Set([
    0x13, 0x15, 0x18, 0x19, 0x1e, 0x1f,
  ]);
  for (const metascreen of candidates) {
    metascreen.screen.tiles =
        metascreen.screen.tiles.map(t => whirlpool.has(t) ? 0x80 : t);
  }
}
