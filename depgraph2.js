import {Graph2} from './graph.js';

// Randomization plan:
//   - remove all ->item edges
//   - follow edges, annotating item blockers
//   - pick a random ->item edge and a random item blocker
//   - repeat

export const graph = new Graph2();



////////////////////////////////////////////////////////////////
// Items
////////////////////////////////////////////////////////////////
const swordOfWind           = item(0x00, 'Sword of Wind');
const swordOfFire           = item(0x01, 'Sword of Fire');
const swordOfWater          = item(0x02, 'Sword of Water');
const swordOfThunder        = item(0x03, 'Sword of Thunder');
const crystalis             = item(0x04, 'Crystalis');
const ballOfWind            = item(0x05, 'Ball of Wind');
const tornadoBracelet       = item(0x06, 'Tornado Bracelet');
const ballOfFire            = item(0x07, 'Ball of Fire');
const flameBracelet         = item(0x08, 'Flame Bracelet');
const ballOfFire            = item(0x09, 'Ball of Water');
const flameBracelet         = item(0x0a, 'Blizzard Bracelet');
const ballOfFire            = item(0x0b, 'Ball of Thunder');
const flameBracelet         = item(0x0c, 'Storm Bracelet');
// ... TODO ...
const medicalHerb           = item(0x1d, 'Medical Herb');
const antidote              = item(0x1e, 'Antidote');
const lysisPlant            = item(0x1f, 'Lysis Plant');
const fruitOfLime           = item(0x20, 'Fruit of Lime');
const fruitOfPower          = item(0x21, 'Fruit of Power');
const magicRing             = item(0x22, 'Magic Ring');
const fruitOfRepun          = item(0x23, 'Fruit of Repun');
const warpBoots             = item(0x24, 'Warp Boots');
const statueOfOnyx          = item(0x25, 'Statue of Onyx');
const opelStatue            = item(0x26, 'Opel Statue');
const insectFlute           = item(0x27, 'Insect Flute');
const fluteOfLime           = item(0x28, 'Flute of Lime');
// ... TODO ...
const refresh               = magic(0x41, 'Refresh');
const paralysis             = magic(0x42, 'Paralysis');
const telepathy             = magic(0x43, 'Telepathy');
const teleport              = magic(0x44, 'Teleport');
const recover               = magic(0x45, 'Recover');
const barrier               = magic(0x46, 'Barrier');
const change                = magic(0x47, 'Change');
const flight                = magic(0x48, 'Flight');
const medicalHerb$50        = medicalHerb .at(0x50);
const sacredShield$51       = sacredShield.at(0x51);
const medicalHerb$52        = medicalHerb .at(0x52);
const medicalHerb$53        = medicalHerb .at(0x53);
const magicRing$54          = magicRing   .at(0x54);
const medicalHerb$55        = medicalHerb .at(0x55);
const medicalHerb$56        = medicalHerb .at(0x56);
const medicalHerb$57        = medicalHerb .at(0x57);
const magicRing$58          = magicRing   .at(0x58);
const medicalHerb$59        = medicalHerb .at(0x59);
const fruitOfPower$5a       = fruitOfPower.at(0x5a);
const fluteOfLime$5b        = fluteOfLime .at(0x5b);
const lysisPlant$5c         = lysisPlant  .at(0x5c);
const lysisPlant$5d         = lysisPlant  .at(0x5d);
const antidote$5e           = antidote    .at(0x5e);
const antidote$5f           = antidote    .at(0x5f);
const antidote$60           = antidote    .at(0x60);
const fruitOfPower$61       = fruitOfPower.at(0x61);
const fruitOfPower$62       = fruitOfPower.at(0x62);
const opelStatue$63         = opelStatue  .at(0x63);
const fruitOfPower$64       = fruitOfPower.at(0x64);
const magicRing$65          = magicRing   .at(0x65);
const fruitOfRepun$66       = fruitOfRepun.at(0x66);
const magicRing$67          = magicRing   .at(0x67);
const magicRing$68          = magicRing   .at(0x68);
const magicRing$69          = magicRing   .at(0x69);
const warpBoots$6a          = warpBoots   .at(0x6a);
const magicRing$6b          = magicRing   .at(0x6b);
const magicRing$6c          = magicRing   .at(0x6c);
const opelStatue$6d         = opelStatue  .at(0x6d);
const warpBoots$6e          = warpBoots   .at(0x6e);
const magicRing$6f          = magicRing   .at(0x6f);
const medicalHerb$70        = medicalHerb .at(0x70); // Mimic???


////////////////////////////////////////////////////////////////
// Triggers
////////////////////////////////////////////////////////////////

// TODO - maybe don't build any logic into here, just put them where they need to go?

const talkedToLeafElder     = trigger('Talked to Leaf Elder', swordOfWind);
const talkedToLeafStudent   = trigger('Talked to Leaf Student');
const talkedToZebuInCave    = trigger('Talked to Zebu in cave');
const wokeUpWindmillGuard   = trigger('Woke up Windmill Guard', windmillKey);
const startedWindmill       = trigger('Started Windmill');
const learnedRefresh        = trigger('Learned Refresh', refresh);
const foughtStom            = trigger('Fought Stom', telepathy);
const visitedOak            = trigger('Visited Oak');
const talkedToOakMother     = trigger('Talked to Oak Mother');
const rescuedOakChild       = trigger('Rescued Oak Child');
const talkedToOakMothher2   = trigger('Talked to Oak Mother Again', insectFlute);
const talkedToOakElder      = trigger('Talked to Oak Elder', swordOfFire);
const villagersAbducted     = trigger('Villagers Abducted');
const talkedToLeafRabbit    = trigger('Talked to Rabbit in Leaf');
const learnedParalysis      = trigger('Learned Paralysis', paralysis);
const talkedToPortoaQueen   = trigger('Talked to Portoa Queen');
const talkedToFortuneTeller = trigger('Talked to Fortune Teller');
const visitedUndergroundChannel = trigger('Visited Underground Channel');
const sentToWaterfallCave   = missableTrigger('Sent to Waterfall Cave', fluteOfLime);
const talkedToAsina         = trigger('Talked to Asina', recover);
const healedDolphin         = trigger('Healed Dolphin', shellFlute);
const returnedFogLamp       = trigger('Returned Fog Lamp');

const talkedToJoelElder     = trigger('Talked to Joel Elder');
const talkedToKensuInLighthouse = trigger('Talked to Kensu in Lighthouse', glowingLamp);

const calmedSea             = trigger('Calmed the Angry Sea');

const forgedCrystalis       = trigger('Forged Crystalis', crystalis);

////////////////////////////////////////////////////////////////
// Conditions
////////////////////////////////////////////////////////////////
const destroyStone          = condition('Destroy stone', and(swordOfWind, ballOfWind));
const destroyIce            = condition('Destroy ice', and(swordOfFire, ballOfFire));
const crossRivers           = condition('Cross rivers', or(and(swordOfWater, ballOfWater), flight));
const destroyIron           = condition('Destroy iron', and(swordOfThunder, ballOfThunder));
const anySword              = condition('Any sword',
                                        or(swordOfWind, swordOfFire, swordOfWater, swordOfThunder));
const fireOrWaterOrThunder  = condition('Fire/Water/Thunder',
                                        or(swordOfFire, swordOfWater, swordOfThunder));
const speedBoots            = condition('Speed boots', and(leatherBoots, leatherBootsGiveSpeed));
const climbSlopes           = condition('Climb slopes', or(rabbitBoots, flight, speedBoots));
// TODO - consider adding healedDolphin and/or returnedFogLamp here?  otherwise, flight alone
// is basically enough (though with flight the dolphin is basically just a convenience).
const rideDolphin           = condition('Ride dolphin', and(shellFlute, talkedToKensuInCabin));
const crossSea              = condition('Cross sea', or(rideDolphin, flight));
const ghettoFlight          = condition('Ghetto flight', or()); // off by default
const crossWhirlpool        = condition('Cross whirlpool', or(calmedSea, flight, ghettoFlight));
// ghetto flight?  talk glitch?  triggers (calmed sea or ghetto flight)?  require magic for boss?


////////////////////////////////////////////////////////////////
// Areas
////////////////////////////////////////////////////////////////
const LEAF = area('Leaf');
const VWND = area('Valley of Wind');
const VAMP = area('Sealed Cave');
const CORD = area('Cordell Plain');
const BRYN = area('Brynmaer');
const AMZN = area('Amazones');
const SBRW = area('Mt Sabre West');
const SBRN = area('Mt Sabre North');
const NADR = area('Nadare\'s');
const OAK  = area('Oak');
const WFVL = area('Waterfall Valley');
const PORT = area('Portoa');
const WFCV = area('Waterfall Cave');
const FOGL = area('Fog Lamp Cave');
const KIRI = area('Kirisa Plant Cave');
const ASEA = area('Angry Sea');
const JOEL = area('Joel');
const EVIL = area('Evil Spirit Island');
const SABR = area('Sabera\'s Castle');
const SWAN = area('Swan');
const GOAV = area('Goa Valley');
const HYDR = area('Mt Hydra');
const SHYR = area('Shyron');
const STYX = area('Styx');
const GOA  = area('Goa');
const DSR1 = area('Desert 1');
const DRG1 = area('Draygonia Fortress 1');
const DRG2 = area('Draygonia Fortress 2');
const DRG3 = area('Draygonia Fortress 3');
const DRG4 = area('Draygonia Fortress 4');
const OASC = area('Oasis Cave');
const SHRA = area('Sahara');
const DSR2 = area('Desert 2');
const PYRF = area('Pyramid Front');
const PYRB = area('Pyramid Back');
const TOWR = area('Tower');

////////////////////////////////////////////////////////////////
// Locations
////////////////////////////////////////////////////////////////

// Leaf, Valley of Wind, Sealed Cave

const mezameShrine          = location(0x00, LEAF, 'Mezame Shrine');
const outsideStart          = location(0x01, LEAF, 'Outside Start',
                                       connect(mezameShrine));
const leaf                  = location(0x02, LEAF, 'Town',
                                       connect(leafOutsideStart));
const valleyOfWind          = location(0x03, VWND, 'Main',
                                       connect(leaf.town),
                                       trigger(learnedRefresh, startedWindmill));
const outsideWindmill       = location(0x03, VWND, 'Outside Windmill');
const sealedCave1           = location(0x04, VAMP, 'Tunnel 1 (entrance)',
                                       // to(valleyOfWind), // TODO - unglitch
                                       from(valleyOfWind, startedWindmill));
const sealedCave2           = location(0x05, VAMP, 'Tunnel 2 (over bridge)',
                                       connect(sealedCave1));
const sealedCave6           = location(0x06, VAMP, 'Tunnel 6 (herb dead end)',
                                       chest(medicalHerb));
const sealedCave4a          = location(0x07, VAMP, 'Tunnel 4a (ball corridor)',
                                       chest(medicalHerb$50),
                                       chest(ballOfWind));
const sealedCave4b          = location(0x07, VAMP, 'Tunnel 4b (antidote dead end)',
                                       connect(sealedCave4a, destroyStone), // 64dd:10
                                       chest(antidote));
const sealedCave5           = location(0x08, VAMP, 'Tunnel 5 (warp boots dead end)',
                                       chest(warpBoots));
const sealedCave3a          = location(0x09, VAMP, 'Tunnel 3a (branch, front)',
                                       connect(sealedCave2),
                                       connect(sealedCave4a),
                                       connect(sealedCave5));
const sealedCave3b          = location(0x09, VAMP, 'Tunnel 3b (branch, back)',
                                       connect(sealedCave3a, destroyStone), // 64dd:08
                                       connect(sealedCave6));
const sealedCave7           = location(0x0a, VAMP, 'Tunnel 7 (boss)',
                                       boss(vampire1),
                                       connect(sealedCave3b));
const sealedCave8a          = location(0x0c, VAMP, 'Tunnel 8a (exit, above wall)',
                                       connect(sealedCave7));
const sealedCave8b          = location(0x0c, VAMP, 'Tunnel 8b (exit, below wall)',
                                       connect(sealedCave8a, destroyStone)); // 64d0:10
const windmillCave          = location(0x0e, VWND, 'Windmill Cave',
                                       connect(valleyOfWind);
                                       connect(valleyOfWind_windmill),
                                       trigger(wakeWindmillGuard, alarmFlute, talkedToZebuInCave));
const windmill              = location(0x0f, VWND, 'Windmill',
                                       connect(valleyOfWind_windmill),
                                       trigger(startedWindmill, windmillKey));
const zebuCaveFront         = location(0x10, VWND, 'Zebu\'s Cave Front',
                                       connect(valleyOfWind),
                                       trigger(talkedToZebuInCave,
                                               talkedToLeafElder, talkedToLeafStudent),
                                       trigger(learnedRefresh, startedWindmill, talkedToZebuInCave));
const zebuCaveBack          = location(0x10, VWND, 'Zebu\'s Cave Back',
                                       trigger(leafAbduction),
                                       connect(zebuCaveFront, destroyIce));
const mtSabreWestTunnel1    = location(0x11, SBRW, 'Tunnel 1 (to Zebu)',
                                       connect(zebuCaveBack));

// Cordel Plain, Brynmaer, and environs

const cordelPlainWest       = location(0x14, CORD, 'West',
                                       connect(zebuCaveBack),
                                       connect(sealedCave8b));
const cordelPlainSouth      = location(0x14, CORD, 'South',
                                       connect(cordelPlainWest, crossRivers)); // 64dd:04
const cordelPlainEast       = location(0x15, CORD, 'East',
                                       connect(cordelPlainWest),
                                       chest(onyxStatue));
const brynmaer              = location(0x18, BRYN, 'Town',
                                       connect(cordelPlainWest),
                                       trigger(gaveStatueToAkahana, onyxStatue));
const outsideStomsHouse     = location(0x19, CORD, 'Outside Stom\'s House',
                                       connect(cordelPlainWest));
const swamp                 = location(0x1a, CORD, 'Swamp',
                                       from(cordelPlainEast),
                                       to(cordelPlainEast, gasMask),
                                       trigger(rescuedOakChild, talkedToOakMother, gasMask));
const swampBoss             = location(0x1a, CORD, 'Swamp Insect Area',
                                       connect(swamp, gasMask),
                                       boss(giantInsect));
const amazones              = location(0x1b, AMZN, 'Town',
                                       connect(cordelPlainSouth));
const oak                   = location(0x1c, OAK,  'Town',
                                       from(swamp, gasMask),
                                       to(swamp),
                                       trigger(visitedOak));
const stomsHouse            = location(0x1e, CORD, 'Stom\'s House',
                                       connect(outsideStomsHouse),
                                       trigger(foughtStom, visitedOak));

// Mt Sabre West

const mtSabreWestEntrance   = location(0x20, SBRW, 'Entrance',
                                       connect(cordelPlainWest),
                                       connect(mtSabreWestTunnel1));
const mtSabreWestUpSlope    = location(0x20, SBRW, 'Up Slope',
                                       from(mtSabreWestEntrance, climbSlopes),
                                       to(mtSabreWestEntrance));
const mtSabreWestDeadEnd    = location(0x20, SBRW, 'Dead End (warp boots)',
                                       chest(warpBoots$6a));
const mtSabreWestUpper      = location(0x21, SBRW, 'Upper',
                                       from(mtSabreWestEntrance, flight),
                                       to(mtSabreWestEntrance));
const mtSabreWestTornel     = location(0x21, SBRW, 'Tornel Dead End',
                                       trigger(talkedToTornelOnMtSabre, tornadoBracelet),
                                       chest(magicRing$69));
const mtSabreWestTunnel2a   = location(0x22, SBRW, 'Tunnel 2a (fork at start)',
                                       connect(mtSabreWestEntrance));
const mtSabreWestTunnel2b   = location(0x22, SBRW, 'Tunnel 2b (left branch to dead end)',
                                       connect(mtSabreWestTunnel2a, destroyIce), // 64dd:02
                                       connect(mtSabreWestDeadEnd));
const mtSabreWestTunnel2c   = location(0x22, SBRW, 'Tunnel 2c (right branch to upper)',
                                       connect(mtSabreWestTunnel2a, destroyIce)); // 64dd:01
const mtSabreWestTunnel3a   = location(0x23, SBRW, 'Tunnel 3a (tunnel to upper, with herb chest)',
                                       connect(mtSabreWestTunnel2c),
                                       chest(medicalHerb$52));
const mtSabreWestTunnel3b   = location(0x23, SBRW, 'Tunnel 3b (tunnel to upper, branch below ice)',
                                       connect(mtSabreWestTunnel3a, destroyIce), // 64dc:80
                                       connect(mtSabreWestUpper));
const mtSabreWestTunnel4a   = location(0x24, SBRW, 'Tunnel 4a (branch to upper or Tornel)',
                                       connect(mtSabreWestTunnel3b));
const mtSabreWestTunnel4b   = location(0x24, SBRW, 'Tunnel 4b (out to upper)',
                                       connect(mtSabreWestTunnel4a, destroyIce), // 64dc:40
                                       connect(mtSabreWestUpper));
const mtSabreWestTunnel5    = location(0x25, SBRW, 'Tunnel 5 (tiny connector)',
                                       connext(mtSabreWestTunnel4a));
const mtSabreWestTunnel6a   = location(0x26, SBRW, 'Tunnel 6a (exit to Tornel, above ice)',
                                       connect(mtSabreWestTunnel5));
const mtSabreWestTunnel6b   = location(0x26, SBRW, 'Tunnel 6b (exit to Tornel, below ice)',
                                       connect(mtSabreWestTunnel6a, destroyIce), // 64dc:20
                                       connect(mtSabreWestTornel));
const mtSabreWestTunnel7a   = location(0x27, SBRW, 'Tunnel 7a (tornado bracelet, lower)',
                                       connect(mtSabreWestUpSlope));
const mtSabreWestTunnel7b   = location(0x27, SBRW, 'Tunnel 7b (tornado bracelet, middle)',
                                       connect(mtSabreWestTunnel6a, destroyIce)); // 64dc:10
const mtSabreWestTunnel7c   = location(0x27, SBRW, 'Tunnel 7c (tornado bracelet, upper)',
                                       connect(mtSabreWestTunnel6b, destroyIce), // 64dc:08
                                       chest(tornadoBracelet));

// Mt Sabre North

const mtSabreNorthEntrance  = location(0x28, SBRN, 'Entrance',
                                       connect(cordelPlainEast, teleport, talkedToLeafRabbit));
const mtSabreNorthUpper     = location(0x28, SBRN, 'Upper',
                                       from(mtSabreNorthEntrance, flight),
                                       to(mtSabreNorthEntrance));
const mtSabreNorthSummit    = location(0x28, SBRN, 'Summit (boss)',
                                       from(mtSabreNorthUpper, flight),
                                       to(mtSabreNorthUpper));
const mtSabreNorthConnector = location(0x29, SBRN, 'Connector');
const mtSabreNorthMidLeft   = location(0x29, SBRN, 'Middle Left');
const mtSabreNorthMidRight  = location(0x29, SBRN, 'Middle Right',
                                       from(mtSaabreNorthMidLeft, climbSlopes),
                                       to(mtSabreNorthMidLeft));
const mtSabreNorthTunnel2a  = location(0x2a, SBRN, 'Tunnel 2a (from entrance to connector)',
                                       connect(mtSabreNorthConnector));
const mtSabreNorthTunnel2b  = location(0x2a, SBRN, 'Tunnel 2b (under bridge, to antidote)',
                                       connect(mtSabreNorthTunnel2a, destroyIce), // 64dc:04
                                       chest(antidote$5e));
const mtSabreNorthTunnel3a  = location(0x2b, SBRN, 'Tunnel 3a (branch after connector)',
                                       connect(mtSabreNorthConnector))
const mtSabreNorthTunnel3b  = location(0x2b, SBRN, 'Tunnel 3b (right branch)',
                                       connect(mtSabreNorthTunnel3a, destroyIce)); // 64dc:02
const mtSabreNorthTunnel3c  = location(0x2b, SBRN, 'Tunnel 3c (upper branch)',
                                       connect(mtSabreNorthTunnel3a, destroyIce)); // 64dc:01
const mtSabreNorthTunnel4   = location(0x2c, SBRN, 'Tunnel 4 (over bridge, to middle)',
                                       connect(mtSabreNorthTunnel3c),
                                       connect(mtSabreNorthMidLeft));
const mtSabreNorthTunnel5a  = location(0x2d, SBRN, 'Tunnel 5a (E-shaped, from right branch)',
                                       connect(mtSabreNorthTunnel3b),
                                       connect(mtSabreNorthMidRight));
const mtSabreNorthTunnel5b  = location(0x2d, SBRN, 'Tunnel 5b (dead-end with herb)',
                                       connect(mtSabreNorthTunnel5a, destroyIce), // 64db:80
                                       chest(medicalHerb$53));
const mtSabreNorthTunnel6a  = location(0x2e, SBRN, 'Tunne; 6a (S-shaped hall, right)',
                                       connect(mtSabreNorthTunnel5a));
const mtSabreNorthTunnel6b  = location(0x2e, SBRN, 'Tunne; 6b (S-shaped hall, middle)',
                                       connect(mtSabreNorthTunnel6a, destroyIce)); // 64db:20
const mtSabreNorthTunnel6c  = location(0x2e, SBRN, 'Tunnel 6c (S-shaped hall, left)',
                                       connect(mtSabreNorthTunnel6b, destroyIce)); // 64db:40
// NOTE: the following four ice walls are problematic for bacsktracking.
// We may want to put in place something to destroy them if coming in at that entrance,
// or to enter lower if the wall is intact.  We could even iterate over the objects and
// detect the wall at the current coordinates?  Or reject the transition?  These are not
// important reverse paths, so we just remove them from the graph for now.
const mtSabreNorthPrison    = location(0x2f, SBRN, 'Prison (hallway)',
                                       connect(mtSabreNorthUpper));
const mtSabreNorthLeftCell  = location(0x30, SBRN, 'Left Cell (shopkeepers)',
                                       from(mtSabreNorthPrison, destroyIce)); // 64db:08
const mtSabreNorthLeftCell2 = location(0x31, SBRN, 'Left Cell 2 (back, with prison key)',
                                       from(mtSabreNorthLeftCell, destroyIce), // 64db:04
                                       chest(prisonKey));
const mtSabreNorthRightCell = location(0x32, SBRN, 'Right Cell (villagers)',
                                       from(mtSabreNorthPrison, destroyIce)); // 64db:10
const mtSabreNorthTunnel8   = location(0x33, SBRN, 'Tunnel 8 (behind right cell, toward summit)',
                                       from(mtSabreNorthRightCell, destroyIce)); // 64db:02
const mtSabreNorthTunnel9   = location(0x34, SBRN, 'Tunnel 9 (connector to summit)',
                                       connect(mtSabreNorthTunnel8),
                                       connect(mtSabreNorthSummit));
const mtSabreNorthTunnel10a = location(0x35, SBRN, 'Tunnel 10a (summit cave, front)',
                                       connect(mtSabreNorthSummit));
const mtSabreNorthTunnel10b = location(0x35, SBRN, 'Tunnel 10b (summit cave, behind ice)',
                                       connect(mtSabreNorthTunnel10a, destroyIce), // 64da:80
                                       trigger(learnedParalysis));
const mtSabreNorthTunnel1   = location(0x38, SBRN, 'Tunnel 1 (leads from main entrance)',
                                       connect(mtSabreNorthEntrance),
                                       connect(mtSabreNorthTunnel2a));
const mtSabreNorthTunnel7   = location(0x39, SBRN, 'Tunnel 7 (to upper)',
                                       connect(mtSabreNorthTunnel6c),
                                       connect(mtSabreNorthUpper));

const nadareInn             = location(0x3c, NADR, 'Inn');
const nadareToolShop        = location(0x3d, NADR, 'Tool Shop');
const nadareBackRoom        = location(0x3e, NADR, 'Back Room');

// Waterfall Valley

const waterfallValleySummit = location(0x40, WFVL, 'Summit',
                                       connect(mtSabreTunnel10b));
const waterfallValleyNW     = location(0x40, WFVL, 'Northwest',
                                       from(waterfallValleySummit),
                                       to(waterfallValleySummit, flight));
const waterfallValleyNE     = location(0x40, WFVL, 'Northeast',
                                       connect(waterfallValleyNW, crossRivers));
const waterfallValleySW     = location(0x41, WFVL, 'Southwest',
                                       connect(waterfallValleyNW));
const waterfallValleySE     = location(0x41, WFVL, 'Southeast',
                                       connect(waterfallValleySW, crossRivers));
const limeTreeValley        = location(0x42, WFVL, 'Lime Tree Valley',
                                       connect(waterfallValleySW));
const limeTreeLake          = location(0x43, WFVL, 'Lime Tree Lake (Rage)',
                                       connect(limeTreeValley),
                                       trigger(talkedToRage, swordOfWater));

// Kirisa Plant Cave

const kirisaCave1a          = location(0x44, KIRI, 'Tunnel 1a (entrance)',
                                       connect(waterfallValleySE));
const kirisaCave1b          = location(0x44, KIRI, 'Tunnel 1b (behind wall)'.
                                       connect(kirisaCave1a, destroyStone)); // 64d8:02
const kirisaCave2a          = location(0x45, KIRI, 'Tunnel 2a (main path, before wall)',
                                       connect(kirisaCave1b));
const kirisaCave2b          = location(0x45, KIRI, 'Tunnel 2b (dead end, antidote)'.
                                       connect(kirisaCave2a, destroyStone), // 64d8:01
                                       chest(antidote$5f));
const kirisaCave2c          = location(0x45, KIRI, 'Tunnel 2c (main path, after wall)',
                                       connect(kirisaCave2a, destroyStone)); // 64d7:80
const kirisaCave3a          = location(0x46, KIRI, 'Tunnel 3a (last room, before wall)',
                                       connect(kirisaCave2c));
const kirisaCave3b          = location(0x46, KIRI, 'Tunnel 3b (last room, after wall)'.
                                       connect(kirisaCave3a, destroyStone)); // 64d0:40
const kirisaMeadow          = location(0x47, KIRI, 'Meadow',
                                       connect(kirisaCave3b),
                                       chest(kirisaPlant));

// Fog Lamp Cave

const fogLampCaveTunne1a    = location(0x48, FOGL, 'Tunnel 1a (entrance)',
                                       connect(waterfallValleyNE));
const fogLampCaveTunne1b    = location(0x48, FOGL, 'Tunnel 1b (past wall)',
                                       connect(fogLampCaveTunne1a, destroyStone)); // 64d9:10
const fogLampCaveTunne1c    = location(0x48, FOGL, 'Tunnel 1c (dead end, lysisPlant)',
                                       connect(fogLampCave1b, destroyStone), // 64d9:20
                                       chest(lysisPlant));
const fogLampCave2          = location(0x49, FOGL, 'Tunnel 2 (tiny connector)',
                                       connect(fogLampCave1b));
const fogLampCave3a         = location(0x4a, FOGL, 'Tunnel 3a (upper branch)',
                                       connect(fogLampCave2));
const fogLampCave3b         = location(0x4a, FOGL, 'Tunnel 3b (dead end, mimic)',
                                       connect(fogLampCave3a, destroyStone), // 64d9:01
                                       mimic(0x15));
const fogLampCave3c         = location(0x4a, FOGL, 'Tunnel 3c (short passage with mimic)',
                                       connect(fogLampCave3a, destroyStone), // 64d9:02
                                       mimic(0x16));
const fogLampCave3d         = location(0x4a, FOGL, 'Tunnel 3d (lower branch)',
                                       connect(fogLampCave3c, destroyStone)); // 64d9:04
const fogLampCave4          = location(0x4b, FOGL, 'Tunnel 4 (dead end loop)', // pointless 64d9:08
                                       connect(fogLampCave3d));
const fogLampCave5a         = location(0x4c, FOGL, 'Tunnel 5a (right branch over bridge)',
                                       connect(fogLampCave3c));
const fogLampCave5b         = location(0x4c, FOGL, 'Tunnel 5b (past wall over bridge)',
                                       connect(fogLampCave5a, destroyStone)); // 64d8:80
const fogLampCave6a         = location(0x4d, FOGL, 'Tunnel 6a (from left branch)',
                                       connect(fogLampCave5a));
const fogLampCave6b         = location(0x4d, FOGL, 'Tunnel 6b (reconvergence)',
                                       connect(fogLampCave6a, destroyStone), // 64d8:10
                                       connect(fogLampCave5b));
const fogLampCave6c         = location(0x4d, FOGL, 'Tunnel 6c (between walls)',
                                       connect(fogLampCave6b, destroyStone)); // 64d8:20
const fogLampCave6d         = location(0x4d, FOGL, 'Tunnel 6d (under bridge)',
                                       connect(fogLampCave6c, destroyStone)); // 64d8:40
const fogLampCave7a         = location(0x4e, FOGL, 'Tunnel 7a (over second bridge)',
                                       connect(fogLampCave6d));
const fogLampCave7b         = location(0x4e, FOGL, 'Tunnel 7b (past wall)',
                                       connect(fogLampCave7a, destroyStone)); // 64d8:08
const fogLampCave8a         = location(0x4f, FOGL, 'Tunnel 8a (under second bridge)',
                                       connect(fogLampCave7b));
const fogLampCave8b         = location(0x4f, FOGL, 'Tunnel 8b (fog lamp)',
                                       connect(fogLampCave8a, destroyStone)); // 64d8:04

// Portoa, Mesia

const portoa                = location(0x50, PORT, 'Town',
                                       connect(waterfallValleyNW));
const portoaFishermanIsland = location(0x51, PORT, 'Fishherman Island',
                                       connect(portoa));
const mesiaShrine           = location(0x52, WFVL, 'Mesia Shrine',
                                       // TODO - consider adding an item here?
                                       connect(limeTreeLake, crossRivers, talkedToRage)); // 64d9:40

// Waterfall Cave

const waterfallCave1a       = location(0x54, WFCV, 'Tunnel 1a (entrance)',
                                       connect(waterfallValleyNW));
const waterfallCave1b       = location(0x54, WFCV, 'Tunnel 1b (dead end, mimic)',
                                       connect(waterfallCave1a, destroyIce), // 64da:10 or :08
                                       mimic(0x13));
const waterfallCave1c       = location(0x54, WFCV, 'Tunnel 1c (past ice)',
                                       connect(waterfallCave1a, destroyIce)); // 64da:04
const waterfallCave2        = location(0x55, WFCV, 'Tunnel 2 (stoned pair)',
                                       connect(waterfallCave1c));
const waterfallCave3        = location(0x56, WFCV, 'Tunnel 3 (wide medusa hallways)',
                                       from(waterfallCave2, fluteOfLimeOrGlitch),
                                       to(waterfallCave2, fluteOfLime));
// NOTE: no reverse path thru these ice walls - will soft lock!
const waterfallCave4a       = location(0x57, WFCV, 'Tunnel 4a (left entrance)',
                                       from(waterfallCave3, destroyIce)); // $64da:02
const waterfallCave4b       = location(0x57, WFCV, 'Tunnel 4b (right entrance)',
                                       from(waterfallCave3, destroyIce), // $64da:01
                                       connect(waterfallCave4a, flight));
const waterfallCave4c       = location(0x57, WFCV, 'Tunnel 4c (sword of water)',
                                       connect(waterfallCe3, destroyIce), // $64d9:80
                                       chest(swordOfWind));

// Tower

const towerEntrance         = location(0x58, TOWR, 'Entrance');
const tower1                = location(0x59, TOWR, 'Level 1', from(towerEntrance));
const tower2                = location(0x5a, TOWR, 'Level 2', from(tower1));
const tower3                = location(0x5b, TOWR, 'Level 3', from(tower2));
const tower4                = location(0x5c, TOWR, 'Outside Mesia Room', from(tower3));
const tower5                = location(0x5d, TOWR, 'Outside Dyna Room', from(tower4, crystalis));
const towerMesia            = location(0x5e, TOWR, 'Mesia',
                                       connect(tower4),
                                       trigger(forgedCrystalis));
const towerDyna             = location(0x5f, TOWR, 'Dyna', from(tower5), boss(dyna));

// Angry Sea

const angrySeaCabinBeach    = location(0x60, ASEA, 'Cabin Beach',
                                       from(portoaFishermanIsland, returnedFogLamp));
const angrySeaSouth         = location(0x60, ASEA, 'South',
                                       connect(angrySeaCabinBeach, crossSea));
const angrySeaJoelBeach     = location(0x60, ASEA, 'Joel Beach',
                                       connect(angrySeaSouth, crossSea));
const angrySeaLighthouse    = location(0x60, ASEA, 'Outside Lighthouse');
const angrySeaAltar         = location(0x60, ASEA, 'Altar',
                                       connect(angrySeaSouth, crossSea));
const angrySeaNorth         = location(0x60, ASEA, 'North',
                                       to(angrySeaSouth, crossSea),
                                       from(angrySeaSouth, crossSea, crossWhirlpool),
                                       trigger(learnedBarrier)); // TODO - require calmedSea
const angrySeaSwanBeach     = location(0x60, ASEA, 'Swan Beach',
                                       connect(angrySeaNorth, crossSea));
const angrySeaCabin         = location(0x61, ASEA, 'Cabin',
                                       connect(angrySeaCabinBeach),
                                       // TODO - only hahce kensu appear after heal and/or boat?
                                       trigger(talkedToKensuInCabin));
const lighthouse            = location(0x62, ASEA, 'Lighthouse',
                                       connect(angrySeaLighthouse),
                                       trigger(talkedToKensuInLighthouse, alarmFlute));
const undergroundChannel1   = location(0x64, PORT, 'Underground Channel 1 (from throne room)',
                                       trigger(visitedUndergroundChannel));
const undergroundChannel2   = location(0x64, PORT, 'Underground Channel 2 (to fortune teller)',
                                       connect(undergroundChannel1, crossRivers)); // 64d7:40
const undergroundChannel3   = location(0x64, PORT, 'Underground Channel 3 (from fortune teller)',
                                       connect(undergroundChannel1, flight));
const undergroundChannel4   = location(0x64, PORT, 'Underground Channel 4 (asina)',
                                       connect(undergroundChannel3, crossRivers)); // 64d7:20
const undergroundChannel5   = location(0x64, PORT, 'Underground Channel 5 (dolphin)',
                                       connect(undergroundChannel4, crossRivers), // 64d7:10
                                       trigger(healedDolphin, medicalHerb, ballOfWater));
const undergroundChannel6   = location(0x64, PORT, 'Underground Channel 6 (water)',
                                       connect(undergroundChannel5, crossSea),
                                       connect(angrySeaSouth, crossSea),
                                       chest(lovePendant));
const zombieTown            = location(0x65, EVIL, 'Zombie Town');
const evilSpiritIsland1     = location(0x68, EVIL, 'Tunnel 1 (entrance)',
                                       connect(angrySeaWest, talkedToJoelElder, crossSea));
const evilSpiritIsland2a    = location(0x69, EVIL, 'Tunnel 2a (start)',
                                       connect(evilSpiritIsland1));

// $69	Evil Spirit Island 2
// $6a	Evil Spirit Island 3
// $6b	Evil Spirit Island 4
// $6c	Sabera Palace 1
// $6d	Sabera Palace 2
// $6e	Sabera Palace 3
// $70	Joel - Secret Passage
// $71	Joel
// $72	Swan
// $73	Swan - Gate
// $78	Goa Valley
// $7c	Mt Hydra
// $7d	Mt Hydra - Cave 1
// $7e	Mt Hydra - Outside Shyron
// $7f	Mt Hydra - Cave 2
// $80	Mt Hydra - Cave 3
// $81	Mt Hydra - Cave 4
// $82	Mt Hydra - Cave 5
// $83	Mt Hydra - Cave 6
// $84	Mt Hydra - Cave 7
// $85	Mt Hydra - Cave 8
// $86	Mt Hydra - Cave 9
// $87	Mt Hydra - Cave 10
// $88	Styx 1
// $89	Styx 2
// $8a	Styx 3
// $8c	Shyron
// $8e	Goa
// $8f	Goa Fortress - Oasis Entrance
// $90	Desert 1
// $91	Oasis Cave - Main
// $92	Desert Cave 1
// $93	Sahara
// $94	Sahara - Outside Cave
// $95	Desert Cave 2
// $96	Sahara Meadow
// $98	Desert 2
// $9c	Pyramid Front - Entrance
// $9d	Pyramid Front - Branch
// $9e	Pyramid Front - Main
// $9f	Pyramid Front - Draygon
// $a0	Pyramid Back - Entrance
// $a1	Pyramid Back - Hall 1
// $a2	Pyramid Back - Branch
// $a3	Pyramid Back - Dead End Left
// $a4	Pyramid Back - Dead End Right
// $a5	Pyramid Back - Hall 2
// $a6	Pyramid Back - Draygon Revisited
// $a7	Pyramid Back - Teleporter
// $a8	Goa Fortress - Entrance
// $a9	Goa Fortress - Kelbesque
// $aa	Goa Fortress - Zebu
// $ab	Goa Fortress - Sabera
// $ac	Goa Fortress - Tornel
// $ad	Goa Fortress - Mado 1
// $ae	Goa Fortress - Mado 2
// $af	Goa Fortress - Mado 3
// $b0	Goa Fortress - Karmine 1
// $b1	Goa Fortress - Karmine 2
// $b2	Goa Fortress - Karmine 3
// $b3	Goa Fortress - Karmine 4
// $b4	Goa Fortress - Karmine 5
// $b5	Goa Fortress - Karmine 6
// $b6	Goa Fortress - Karmine 7
// $b7	Goa Fortress - Exit
// $b8	Oasis Cave - Entrance
// $b9	Goa Fortress - Asina
// $ba	Goa Fortress - Kensu
// $bb	Goa - House
// $bc	Goa - Inn
// $be	Goa - Tool Shop
// $bf	Goa - Tavern
const leafElderHouse        = location(0xc0, LEAF, 'Elder House', connect(leaf),
                                       trigger(talkedToLeafElder));
const leafRabbitHut         = location(0xc1, LEAF, 'Rabbit Hut', connect(leaf),
                                       trigger(talkedToLeafRabbit, villagersAbducted, telepathy));
const leafInn               = location(0xc2, LEAF, 'Inn', connect(leaf));
const leafToolShop          = location(0xc3, LEAF, 'Tool Shop', connect(leaf));
const leafItemShop          = location(0xc4, LEAF, 'Item Shop', connect(leaf));
const leafStudentHouse      = location(0xc5, LEAF, 'Student House', connect(leaf),
                                       trigger(talkedToLeafStudent));
const brynmaerTavern        = location(0xc6, BRYN, 'Tavern', connect(brynmaer));
const brynmaerPawnShop      = location(0xc7, BRYN, 'Pawn Shop', connect(brynmaer));
const brynmaerInn           = location(0xc8, BRYN, 'Inn', connect(brynmaer));
const brynmaerArmorShop     = location(0xc9, BRYN, 'Armor Shop', connect(brynmaer));
const brynmaerToolShop      = location(0xcb, BRYN, 'Tool Shop', connect(brynmaer));
const oakElderHouse         = location(0xcd, OAK,  'Elder House',
                                       from(oak, telepathy),
                                       trigger(talkedToOakElder, rescuedOakChild));
const oakMotherHouse        = location(0xce, OAK,  'Mother\'s House',
                                       from(oak, telepathy),
                                       trigger(talkedToOakMother, telepathy),
                                       trigger(talkedToOakMothher2, rescuedOakChild));
const oakToolShop           = location(0xcf, OAK,  'Tool Shop', from(oak, telepathy));
const oakInn                = location(0xd0, OAK,  'Inn', from(oak, telepathy));
const amazonesInn           = location(0xd1, AMZN, 'Inn', connect(amazones));
const amazonesToolShop      = location(0xd2, AMZN, 'Tool Shop', connect(amazones));
const amazonesArmorShop     = location(0xd3, AMZN, 'Armor Shop', connect(amazones));
const amazonesQueenHpouse   = location(0xd4, AMZN, 'Queen\'s House', from(amazones, change));
const nadare                = location(0xd5, NADR, 'Nadare\'s',
                                       connect(mtSabreNorthEntrance),
                                       connect(nadareInn),
                                       connect(nadareToolShop),
                                       connect(nadareBackRoom));
const portoaFishermanHouse  = location(0xd6, PORT, 'Fisherman\'s House',
                                       connect(portoaFishermanIsland),
                                       trigger(returnedFogLamp, fogLamp, shellFlute));
const portoaPalaceEntrance  = location(0xd7, PORT, 'Palace Entrance', connect(portoa));
const portoaFortuneTeller1  = location(0xd8, PORT, 'Fortune Teller Front',
                                       connect(portoa),
                                       trigger(talkedToFortuneTeller, talkedToPortoaQueen));
const portoaFortuneTeller2  = location(0xd8, PORT, 'Fortune Teller Back',
                                       connect(undergroundChannel2),
                                       connect(undergroundChannel3));
const portoaPawnShop        = location(0xd9, PORT, 'Pawn Shop', connect(portoa));
const portoaArmorShop       = location(0xda, PORT, 'Armor Shop', connect(portoa));
const portoaInn             = location(0xdc, PORT, 'Inn', connect(portoa));
const portoaToolShop        = location(0xdd, PORT, 'Tool Shop', connect(portoa));
const portoaPalaceLeft      = location(0xde, PORT, 'Palace Left', connect(portoaPalaceEntrance));
const portoaThroneRoom      = location(0xdf, PORT, 'Palace Throne Room',
                                       connect(portoaPalaceEntrance),
                                       connect(undergroundChannel1, paralysis),
                                       trigger(talkedToPortoaQueen),
                                       trigger(sentToWaterfallCave,
                                               talkedToFortuneTeller, visitedUndergroundChannel));
const portoaPalaceRight     = location(0xe0, PORT, 'Palace Right', connect(portoaPalaceEntrance));
const portoaAsinaRoom       = location(0xe1, PORT, 'Asina\'s Room',
                                       connect(undergroundChannel4),
                                       trigger(talkedToAsina, ballOfWater)); // TODO - trigger?
// $e2	Amazones - Elder Downstairs
// $e3	Joel - Elder House
// $e4	Joel - Shed
// $e5	Joel - Tool Shop
// $e7	Joel - Inn
// $e8	Zombie Town - House
// $e9	Zombie Town - House Basement
// $eb	Swan - Tool Shop
// $ec	Swan - Stom Hut
// $ed	Swan - Inn
// $ee	Swan - Armor Shop
// $ef	Swan - Tavern
// $f0	Swan - Pawn Shop
// $f1	Swan - Dance Hall
// $f2	Shyron - Temple
// $f3	Shyron - Training Hall
// $f4	Shyron - Hospital
// $f5	Shyron - Armor Shop
// $f6	Shyron - Tool Shop
// $f7	Shyron - Inn
// $f8	Sahara - Inn
// $f9	Sahara - Tool Shop
// $fa	Sahara - Elder House
// $fb	Sahara - Pawn Shop



