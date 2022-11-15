/** @fileoverview Apply large-scale map toggles. */

import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';

export function toggleMaps(_rom: Rom, _flags: FlagSet, _random: Random) {
  // removeEarlyWall(rom, flags, random);
}

// function removeEarlyWall(rom: Rom, flags: FlagSet, random: Random) {
//   if (!flags.removeEarlyWall()) return;
//   if (!flags.addEastCave() || !flags.connectGoaToLeaf() ||
//       random.nextInt(2) < 1) {
//     // Unblock the back of Zebu's cave
//     const {ZebuCave} = rom.locations;
//     ZebuCave.screens[2][1] = 0x91;
//     // Move the trigger (2) on top of the wall hitbox (0).
//     ZebuCave.spawns[0] = ZebuCave.spawns.pop()!;
//     rom.flags.free(ZebuCave.flags.pop()!.flag);
//   } else {
//     // Unblock east cave to Goa
//     const {EastCave3} = rom.locations;
//     EastCave3.screens[1][0] = 0x81;
//     EastCave3.spawns.pop();
//     EastCave3.flags.pop();    
//   }
// }
