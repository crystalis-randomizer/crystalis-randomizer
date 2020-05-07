import { FlagSet } from '../flagset.js';
import { CaveShuffle, CryptEntranceShuffle, KarmineBasementShuffle,
         WideCaveShuffle } from '../maze/cave.js';
// import {extendGoaScreens/*, shuffleGoa1*/} from '../maze/goa.js';
//import {shuffleSwamp} from '../maze/swamp.js';
//import {shufflePyramid} from '../maze/pyramid.js';
import { Random } from '../random.js';
import { Rom } from '../rom.js';
import { BridgeCaveShuffle } from '../maze/doublecave.js';
import { CycleCaveShuffle, TightCycleCaveShuffle } from '../maze/cyclecave.js';
import { RiverCaveShuffle, StyxRiverCaveShuffle,
  WaterfallRiverCaveShuffle,
  OasisCaveShuffle} from '../maze/rivercave.js';
import { SwampShuffle, addSwampDoors } from '../maze/swamp.js';
import { SaberaPalaceShuffle } from '../maze/twostage.js';
import { LabyrinthShuffle, fixLabyrinthScreens } from '../maze/goa.js';
import { PyramidShuffle } from '../maze/pyramid.js';

interface Shuffle {
  shuffle(random: Random): void;
}

export function shuffleMazes(rom: Rom, flags: FlagSet, random: Random) {
  // TODO - consolidate free flags?  Find a list of what's used...
  // [...new Set(rom.locations.flatMap(l => l.flags.map(f => f.flag)
  //           .filter(f => f != 0x200).map(x=>x.toString(16))))].sort()
  // Also map over triggers, dialogs - find what's set/cleared
  // Also 2f0 is co-opted as an "always true" trigger.
  // shufflePyramid(rom, random);
  // shuffleSwamp(rom, random);
  // shuffleGoa1(rom, random);
  const $ = rom.locations;

  prepareScreens(rom, random);

  const shuffles: Shuffle[] = [
    // new TownShuffle($.Leaf),
    // new OverworldShuffle($.ValleyOfWind),
    new CaveShuffle($.EastCave1),
    new CaveShuffle($.EastCave2),
    new CaveShuffle($.EastCave3),
    new BridgeCaveShuffle($.SealedCave2, $.SealedCave1),
    new CaveShuffle($.SealedCave3),
    new CaveShuffle($.SealedCave4),
    new CaveShuffle($.SealedCave5),
    new CaveShuffle($.SealedCave6),
    new CaveShuffle($.SealedCave7),
    new CaveShuffle($.SealedCave8),
    new CaveShuffle($.WindmillCave),
    new CaveShuffle($.ZebuCave),
    // new OverworldShuffle($.CordelPlainWest, $.CordelPlainEast),
    // new TownShuffle($.Brynmaer),
    // new TownShuffle($.Amazones),
    new SwampShuffle($.Swamp),
    // new TownShuffle($.Oak),
    // new JoinedMountainShuffle($.MtSabreWest_Upper, $.MtSabreWest_Lower),
    new CaveShuffle($.MtSabreWest_Cave1),
    new CaveShuffle($.MtSabreWest_Cave2),
    new CaveShuffle($.MtSabreWest_Cave3),
    new CaveShuffle($.MtSabreWest_Cave4),
    new CaveShuffle($.MtSabreWest_Cave5),
    new CaveShuffle($.MtSabreWest_Cave6),
    new CycleCaveShuffle($.MtSabreWest_Cave7),
    // new SplitMountainShuffle($.MtSabreNorth_Main, $.MtSabreNorth_Middle),
    new CaveShuffle($.MtSabreNorth_Cave1),
    new CaveShuffle($.MtSabreNorth_Cave2),
    new CaveShuffle($.MtSabreNorth_Cave3),
    new CaveShuffle($.MtSabreNorth_Cave4),
    new CaveShuffle($.MtSabreNorth_Cave5),
    new CaveShuffle($.MtSabreNorth_Cave6),
    new CaveShuffle($.MtSabreNorth_Cave7),
    new CaveShuffle($.MtSabreNorth_Cave8),
    new CaveShuffle($.MtSabreNorth_Cave9),
    new CaveShuffle($.MtSabreNorth_LeftCell2),
    new CaveShuffle($.MtSabreNorth_SummitCave),
    // new OverworldShuffle($.WaterfallValleyNorth, $.WaterfallValleySouth),
    // new OverworldShuffle($.LimeTreeValley),
    new CaveShuffle($.KirisaPlantCave1),
    new CaveShuffle($.KirisaPlantCave2),
    new CaveShuffle($.KirisaPlantCave3),
    // new OverworldShuffle($.KirisaMeadow),
    new CaveShuffle($.FogLampCave1),
    new CaveShuffle($.FogLampCave2),
    new CaveShuffle($.FogLampCave3),
    new TightCycleCaveShuffle($.FogLampCaveDeadEnd),
    new BridgeCaveShuffle($.FogLampCave4, $.FogLampCave5, true /*reversed*/),
    new BridgeCaveShuffle($.FogLampCave6, $.FogLampCave7),
    // new TownShuffle($.Portoa),
    new CycleCaveShuffle($.WaterfallCave1),
    new CaveShuffle($.WaterfallCave2),
    new WideCaveShuffle($.WaterfallCave3),
    new WaterfallRiverCaveShuffle($.WaterfallCave4),
    // new TowerShuffle($.Tower1, $.Tower2, $.Tower3, $.TowerOutsideMesia),
    // new SeaShuffle($.AngrySea),
    // new ChannelShuffle($.UndergroundChannel),
    // new TownShuffle($.ZombieTown),
    // new ChannelShuffle($.EvilSpiritIsland1),
    new RiverCaveShuffle($.EvilSpiritIsland2).requirePitDestination(),
    new CycleCaveShuffle($.EvilSpiritIsland3), // pit: $.EvilSpiritIsland2
    new RiverCaveShuffle($.EvilSpiritIsland4),
    new SaberaPalaceShuffle($.SaberaPalace1).requirePitDestination(),
    // // TODO - consider just making this into two separate maps?
    new CaveShuffle($.SaberaPalace2),
    new CaveShuffle($.SaberaPalace2_West),
    // // new SplitPitShuffle($.SaberaPalace2, $.SaberaPalace1),
    new CaveShuffle($.JoelSecretPassage),
    // new TownShuffle($.Joel),
    // new TownShuffle($.Swan),
    // new OverworldShuffle($.GoaValley),
    // new MountainShuffle($.MtHydra),
    new CaveShuffle($.MtHydra_Cave1),
    new CaveShuffle($.MtHydra_Cave2),
    new CaveShuffle($.MtHydra_Cave3),
    new CaveShuffle($.MtHydra_Cave4),
    new CaveShuffle($.MtHydra_Cave5),
    new CaveShuffle($.MtHydra_Cave6),
    new WideCaveShuffle($.MtHydra_Cave7),
    new CaveShuffle($.MtHydra_Cave8),
    new CaveShuffle($.MtHydra_Cave9),
    new CaveShuffle($.MtHydra_Cave10),
    new WideCaveShuffle($.Styx1),
    // // TODO - consider splitting this map, too!
    new StyxRiverCaveShuffle($.Styx2).requirePitDestination(),
    // //new StyxRiverCaveShuffle($.Styx2_East),
    // // new StyxRiverCaveShuffle($.Styx2),
    new CaveShuffle($.Styx3), // pit: $.Styx2
    // new TownShuffle($.Shyron),
    // new TownShuffle($.Goa),
    // new OverworldShuffle($.Desert1),
    new OasisCaveShuffle($.OasisCaveMain),
    new CaveShuffle($.DesertCave1),
    // new TownShuffle($.Sahara),
    new CaveShuffle($.DesertCave2),
    // new OverworldShuffle($.SaharaMeadow),
    // new OverworldShuffle($.Desert2),
    new CaveShuffle($.Pyramid_Branch),
    new PyramidShuffle($.Pyramid_Main),
    new CryptEntranceShuffle($.Crypt_Entrance),
    new WideCaveShuffle($.Crypt_Hall1),
    new CaveShuffle($.Crypt_DeadEndLeft),
    new CaveShuffle($.Crypt_DeadEndRight),
    new CaveShuffle($.Crypt_Branch), // down: Crypt_DeadEndLeft and DeadEndRight
    new CaveShuffle($.Crypt_Hall2), // down: $.Crypt_Branch
    new LabyrinthShuffle($.GoaFortress_Kelbesque),
    new RiverCaveShuffle($.GoaFortress_Sabera),
    new CaveShuffle($.GoaFortress_Mado1).requirePitDestination(),
    new CaveShuffle($.GoaFortress_Mado2), // downstairs: $.GoaFortress_Mado1
    new CaveShuffle($.GoaFortress_Mado3), // downstairs: $.GoaFortress_Mado1
    new CaveShuffle($.GoaFortress_Karmine1),
    new CaveShuffle($.GoaFortress_Karmine2),
    new CaveShuffle($.GoaFortress_Karmine4),
    new KarmineBasementShuffle($.GoaFortress_Karmine6),
    // new GoaKarmineShuffle($.GoaFortress_Karmine3, $.GoaFortress_Karmine5,
    //                       $.GoaFortress_Kensu, $.GoaFortress_Karmine6),
    // new SplitRiverCaveShuffle($.OasisCave_Entrance),
  ];
  for (const shuffle of shuffles) {
    shuffle.shuffle(random);
  }
}

export function prepareScreens(rom: Rom, random = new Random(1)) {
  addSwampDoors(rom);
  fixLabyrinthScreens(rom, random);
}
