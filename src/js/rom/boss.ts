import {Random} from '../random';
import {Rom} from '../rom';

// TODO - we need a consistent way to refer to bosses...
//  - maybe bosses.fromNpcId(), bosses.fromObjectId(), bosses.fromBossKill()


// Figure out what address holds the object to spawn...
const BOSS_OBJECT_ADDRESS = [
  [0x0b0f1, true], // vampire 1  - persondata c0 [1]
  [0x0b0f5, false], // insect    - persondata c1 [1]
  [0x0b0f9, true], // kelbesque 1  persondata c2 [1]
  [0x0b0fd, false], // rage        persondata c3 [1]
  [0x3656e, true], // sabera 1     hardcoded
  [0x7d820, true], // mado 1       hardcoded
  [0x0b1f5, true], // kelbesque 2  persondata c5 [1]
  [0x0b1f9, true], // sabera 2     persondata c6 [1]
  [0x0b1fd, true], // mado 2                  c7 [1]
  [0x0b2f1, true], // karmine                 c8 [1]
  [0x0b2f5, false], // statue of moon         c9 [1]
  [0x0b2f9, false], // statue of sun          ca [1]
  [0x0b2fd, false], // draygon 1 and 2        cb [1]
  [0x0b3f1, true], // vampire 2               cc [1]
] as const;

// NOTE: This appears to be currently unused code, and as such, I wasn't sure
//       whether to update the Mado 1 address above when moving the EXPAND_PRG
//       process. When returning to this code, make sure to double check that.
//       -CodeGorilla, 10/23/2022

export function shuffleBosses(rom: Rom, random: Random) {
  // TODO - this doesn't actually work, but if it did, we'd need to
  // store it properly in the Rom object, rather than writing it
  // directly to rom.prg.
  const b = BOSS_OBJECT_ADDRESS.filter(([,x]) => x).map(([x,]) => x);
  const v = b.map(x => rom.prg[x]);
  random.shuffle(v);
  for (let i = 0; i < b.length; i++) rom.prg[b[i]] = v[i];
}

// NOTE: sabera 2 in sabera's slot didn't work (never attacked)
//       karmine in kelbesque's slot broken too (flies away immediately)
