import {FlagSet} from '../flagset.js';
import {shuffleCave} from '../maze/cave.js';
import {extendGoaScreens, shuffleGoa1} from '../maze/goa.js';
import {shuffleSwamp} from '../maze/swamp.js';
import {shufflePyramid} from '../maze/pyramid.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';

export function shuffleMazes(rom: Rom, flags: FlagSet, random: Random) {
  // TODO - consolidate free flags?  Find a list of what's used...
  // [...new Set(rom.locations.flatMap(l => l.flags.map(f => f.flag)
  //           .filter(f => f != 0x200).map(x=>x.toString(16))))].sort()
  // Also map over triggers, dialogs - find what's set/cleared
  // Also 2f0 is co-opted as an "always true" trigger.
  shufflePyramid(rom, random);
  shuffleSwamp(rom, random);
  shuffleGoa1(rom, random);
  for (const cave of SHUFFLED_CAVES) {
    shuffleCave(rom.locations[cave], random);
  }
  if (flags.addEastCave()) {
    shuffleCave(rom.locations.EastCave1, random);
    shuffleCave(rom.locations.EastCave2, random);
    if (rom.locations.EastCave3.used) {
      shuffleCave(rom.locations.EastCave3, random);
    }
  }
}

export function prepareScreens(rom: Rom) {
  extendGoaScreens(rom);
}

const SHUFFLED_CAVES = [
  // Sealed Cave
  0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0c,
  // Windmill Cave
  0x0e,
  // Zebu Cave
  0x10,
  // Mt Sabre W
  0x11, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27,
  // Mt Sabre N
  0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x31, 0x33, 0x34, 0x35, 0x38, 0x39,
  // Kirisa
  0x44, 0x45, 0x46,
  // Fog Lamp
  0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f,
  // Waterfall
  0x54, 0x55, 0x56, 0x57, // can't handle this one yet
  // Evil spirit
  0x69, // 0x6a, 0x6b
  // Sabera palace (probably just skip sabera map 6e)
  // 0x6c, 0x6d
  // Joel passage
  0x70,
  // Mt Hydra
  0x7d, 0x7f, 0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
  // Stxy
  // 0x88, 0x89, 0x8a,
  // Goa Basement
  0x8f,
  // Oasis Cave
  // 0x91, 0xb8, 
  // Connectors
  0x92, 0x95,
  // Pyramid
  0x9d, //0x9e,
  // Crypt
  // 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5,
  // Goa - Kelbesque 2
  // 0xa8, 0xa9, // NOTE: a9 handled by shuffleGoa1
  // Goa - Sabera 2
  0xab,
  // Goa - Mado 2
  // 0xad, 0xae, 0xaf, 0xb9
  // Goa - Karmine
  0xb0, 0xb1, 0xb2, 0xb3, // 0xb4, 0xb5, 0xb8,
];
