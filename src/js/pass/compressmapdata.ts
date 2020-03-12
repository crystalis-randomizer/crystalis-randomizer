import {Rom} from '../rom.js';
import {Location} from '../rom/location.js';

export function compressMapData(rom: Rom) {
  if (rom.compressedMapData) return;
  rom.compressedMapData = true;
  // for (const location of rom.locations) {
  //   if (location.extended) location.extended = 7;
  // }
  // Rearrange the screens - rom.screens is now a sparse array.
  // rom.screens[0xa00] = rom.screens[0x100];
  // rom.screens[0xa01] = rom.screens[0x101];
  // rom.screens[0xa02] = rom.screens[0x102];
  // delete rom.screens[0x100];
  // delete rom.screens[0x101];
  // delete rom.screens[0x102];

  for (let i = 0; i < 3; i++) {
    //this.screens[0xa00 | i] = this.screens[0x100 | i];
    rom.metascreens.renumber(0x100 | i, 0xa00 | i);
    delete rom.screens[0x100 | i];
  }

  // TODO - fina all refs to ".extended" in the source code and
  //        update with a more accurate approach
  // TODO - find all refs to ".screens" in the source code and
  //        make sure they can handle sparse arrays
  // TODO - update location.write
  // TODO - update screens.write

}

const [] = [Location];
