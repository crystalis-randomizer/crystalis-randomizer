import {Graph} from './graph.js';

// Randomization plan:
//   - remove all ->item edges
//   - follow edges, annotating item blockers
//   - pick a random ->item edge and a random item blocker
//   - repeat

export const graph = new Graph();
const g = graph;

const node = (text, ...deps) => g.add({text}, deps);
const boss = (text, ...deps) => g.add({text, type: 'Boss'}, deps);
const item = (text, ...deps) => g.add({text, type: 'Item'}, deps);
const talk = (text, ...deps) => g.add({text, type: 'Talk'}, deps);
const magic = (text, ...deps) => g.add({text, type: 'Magic'}, deps);
const chest = (text, ...deps) => g.add({text, type: 'Chest'}, deps);
const route = (text, ...deps) => g.add({text, type: 'Route'}, deps);
const trigger = (text, ...deps) => g.add({text, type: 'Trigger'}, deps);
const location = (text, ...deps) => g.add({text, type: 'Location'}, deps);

////////////////////////////////////////////////////////////////
// Basic elements
////////////////////////////////////////////////////////////////
const start         = node('Start of Game');
const sword         = trigger('Sword',
                              route('wind', () => swordOfWind),
                              route('fire', () => swordOfFire),
                              route('water', () => swordOfWater),
                              route('thunder', () => swordOfThunder));
const notWind       = trigger('Sword (not wind)',
                              route('fire', () => swordOfFire),
                              route('water', () => swordOfWater),
                              route('thunder', () => swordOfThunder));
const hopOrFly      = trigger('Hop or Fly',
                              route('hop', () => rabbitBoots),
                              route('fly', () => flight));
const swimOrFly     = trigger('Swim or Fly',
                              route('swim', () => dolphin),
                              route('fly', () => flight));
const freezeOrFly = trigger('Freeze or Fly',
                            route('freeze', () => swordOfWater, () => ballOfWater),
                            route('fly', () => flight));
// NOTE: the following four edges can be removed for a more challenging experience
const dialogGlitch  = trigger('Dialog Glitch'); // TODO - connect this to start to enable?
const tornadoMagic  = trigger('Tornado Magic', () => swordOfWind, () => tornadoBracelet);
const flameMagic    = trigger('Flame Magic', () => swordOfFire, () => flameBracelet);
const blizzardMagic = trigger('Blizzard Magic', () => swordOfWater, () => blizzardBracelet);
const stormMagic    = trigger('Storm Magic', () => swordOfThunder, () => stormBracelet);
const changeOrGlitch = trigger('Change or Glitch', () => change, () => dialogGlitch);

////////////////////////////////////////////////////////////////
// Valley of Wind
////////////////////////////////////////////////////////////////
const leaf          = location('Leaf', start);
const valleyOfWind  = location('Valley of Wind',
                               route('forward', leaf),
                               // TODO - currently glitched
                               // route('via Vampire', () => vampCave1)
                               route('via Zebu', () => zebuCave));
// TODO - encode more of the shops, e.g. for medical herb (dolphin) and
// magic ring/fruit of power (flight instead of dolphin).
const alarmFlute    = trigger('Alarm Flute', leaf, () => joel);
const leafElder     = talk('Leaf Elder', leaf);
const zebuStudent   = talk('Zebu\'s Student', leaf);
const zebuCave      = location('Zebu\'s Cave',
                               route('forward', valleyOfWind),
                               route('reverse', () => mtSabreWest1, () => fireLevel2));
const zebu          = talk('Zebu', zebuCave, zebuStudent);
const swordOfWind   = item('Sword of Wind', leafElder);
const windmillGuard = talk('Windmill Guard', zebu);
const windmillKey   = item('Windmill Key', windmillGuard, alarmFlute);
const windmill      = trigger('Windmill', windmillKey, valleyOfWind);
const refresh       = magic('Refresh', windmill);
const vampCave1     = location('Vampire Cave 1',
                                // This includes everything in front of stone walls
                               route('forward', windmill),
                               route('reverse', () => vampCave2));
const vampCaveChest1 = chest('Vampire Cave Chest 1 (Warp Boots)', vampCave1);
const vampCaveChest2 = chest('Vampire Cave Chest 2 (Medical Herb)', vampCave1);
const vampCaveChest3 = chest('Vampire Cave Chest 3 (Ball of Wind)', vampCave1);
const ballOfWind     = item('Ball of Wind', vampCaveChest3);
const windLevel2     = trigger('Wind Level 2', swordOfWind, ballOfWind);
const vampCave2      = location('Vampire Cave Inner',
                                // This includes everything behind stone walls
                                route('forward', vampCave1, windLevel2),
                                route('reverse', () => vampCaveBossKilled));
const vampCaveChest4 = chest('Vampire Cave Chest 4 (Antidote)', vampCave2);
const vampCaveChest5 = chest('Vampire Cave Chest 5 (Medical Herb)', vampCave2);
const vampCaveBoss = location('Vampire Cave Boss',
                              route('forward', vampCave2),
                              route('reverse', () => cordelPlains, windLevel2));
const vampire1 = boss('Vampire 1', vampCaveBoss, sword);
const vampire1Chest = chest('Vamp1re 1 Chest (Rabbit Boots)', vampire1);
const vampCaveBossKilled = trigger('Vampire Cave Boss Killed', vampire1);
const rabbitBoots = item('Rabbit Boots', vampire1Chest);

////////////////////////////////////////////////////////////////
// Cordel Plains
////////////////////////////////////////////////////////////////
const cordelPlains = location('Cordel Plain',
                               route('via Vampire', vampCaveBossKilled),
                               route('via Mt Sabre North',
                                     // TODO - rabbit trigger skippable ?
                                     () => mtSabreNorth1, () => leafRabbit, () => teleport),
                               route('via Mt Sabre West', () => mtSabreWest1, () => fireLevel2),
                               route('via Amazones', () => cordelPlainsSouth, freezeOrFly));
const brynmaer = location('Brynmaer', cordelPlains);
const cordelGrass = chest('Cordel Plains Grass', cordelPlains);
const onyxStatue = item('Onyx Statue', cordelGrass);
const akahanaBrynmaer = talk('Akahana: Brynmaer', brynmaer, onyxStatue);
const gasMask = item('Gas Mask', akahanaBrynmaer);
const swamp = location('Swamp', cordelPlains, gasMask); // TODO - hole?
const oak = location('Oak', swamp);
const stomHouse = location('Stom\'s House', cordelPlains);
const telepathy = magic('Telepathy', oak, stomHouse);
const oakMother = talk('Oak Mother', telepathy); // TODO - break out oakChild, oakMotherAfter ?
const insectFlute = item('Insect Flute', oakMother);
const oakElder = talk('Oak Elder', telepathy); // TODO - also deps on oak, if no telepathy trigger?
const swordOfFire = item('Sword of Fire', oakElder);
const giantInsect = boss('Giant Insect', notWind, insectFlute);
const giantInsectChest = chest('Giant Insect Chest', giantInsect);
const ballOfFire = item('Ball of Fire', giantInsectChest);
const fireLevel2 = trigger('Fire Level 2', swordOfFire, ballOfFire);

////////////////////////////////////////////////////////////////
// Mt Sabre
////////////////////////////////////////////////////////////////
const mtSabreWest1 = location('Mt Sabre West 1',
                              route('via Cordel', cordelPlains),
                              route('via Zebu', zebuCave, fireLevel2));
const mtSabreWest2 = location('Mt Sabre West 2', mtSabreWest1, fireLevel2);
const mtSabreWest3 = location('Mt Sabre West 3', mtSabreWest1, fireLevel2, hopOrFly);
const mtSabreWestChest1 = chest('Mt Sabre West Chest 1 (Tornado Bracelet)', mtSabreWest3);
const tornadoBracelet = item('Tornado Bracelet', mtSabreWestChest1);
const mtSabreWestChest2 = chest('Mt Sabre West Chest 2 (Warp Boots)', mtSabreWest2);
const mtSabreWestChest3 = chest('Mt Sabre West Chest 3 (Medical Herb)', mtSabreWest2);
const mtSabreWestChest4 = chest('Mt Sabre West Chest 3 (Magic Ring)', mtSabreWest2);
const tornel = talk('Tornel (Mt Sabre)', mtSabreWest2, tornadoBracelet);
const teleport = magic('Teleport', tornel);
const leafSorrow = trigger('Leaf Sorrow', mtSabreWest1);
const leafRabbit = talk('Leaf Rabbit', leaf, leafSorrow);
const mtSabreNorth1 = location('Mt Sabre North 1',
                               // TODO - rabbit trigger skippable
                               route('forward', cordelPlains, leafRabbit, teleport),
                               route('reverse', () => mtSabreBossKilled));
const nadares = location('Nadare\'s', mtSabreNorth1);
const mtSabreNorth2 = location('Mt Sabre North 2', mtSabreNorth1, fireLevel2);
const mtSabreNorthChest1 = chest('Mt Sabre North Chest 1 (Antidote)', mtSabreNorth2);
const mtSabreNorthChest2 = chest('Mt Sabre North Chest 2 (Medical Herb)', mtSabreNorth2);
const mtSabreNorthChest3 = chest('Mt Sabre North Chest 3 (Key to Prison)', mtSabreNorth2);
const prisonKey = item('Key to Prison', mtSabreNorthChest3);
const mtSabreBoss = location('Mt Sabre Boss',
                             route('forward', mtSabreNorth2),
                             route('reverse', () => mtSabreSummitCave, fireLevel2));
const kelbesque1 = boss('Kelbesque 1', mtSabreBoss);
const kelbesque1Chest = chest('Kelbesque 1 Chest (Flame Bracelet)', kelbesque1);
const mtSabreBossKilled = trigger('Mt Sabre Boss Killed', kelbesque1, swordOfWind, tornadoMagic);
const flameBracelet = item('Flame Bracelet', kelbesque1Chest);
const mtSabreSummitCave = location('Mt Sabre Summit Cave',
                                   route('forward', mtSabreBossKilled, prisonKey, fireLevel2),
                                   route('reverse', () => waterfallValley1, () => flight));

////////////////////////////////////////////////////////////////
// Waterfall Valley
////////////////////////////////////////////////////////////////
const paralysis = magic('Paralysis', mtSabreSummitCave);
const waterfallValley1 = location('Waterfall Valley1',
                                  route('via Mt Sabre', mtSabreSummitCave),
                                  // route('via Waterfall Valley 2',
                                  //       () => waterfallValley2, freezeOrFly),
                                  route('via Portoa', () => portoa));
const waterfallValley2 = location('Waterfall Valley 2',
                                  route('via Waterfall Valley 1', waterfallValley1, freezeOrFly));
const portoa = location('Portoa',
                        route('via Waterfall Valley', waterfallValley1),
                        // TODO - confirm can dock at fog lamp house
                        route('via Angry Sea', () => angrySeaSouth, swimOrFly));
const portoaQueen1 = talk('Portoa Queen 1', portoa, paralysis);
const fluteOfLime1 = item('Flute of Lime 1', portoaQueen1);
const waterfallCave1 = location('Waterfall Cave 1', waterfallValley1);
const waterfallCave2 = location('Waterfall Cave 2', waterfallCave1, fireLevel2);
const waterfallCaveChest1 = chest('Waterfall Cave Chest 1 (Mimic)', waterfallCave2);
// TODO - we could model someFluteOfLime and bothFlutesOfLime for the two blocks,
// instead of just assuming the pairing.  The way we have it is probably fine,
// though, since the first one won't be shuffled since it would be missable.
const waterfallCave3 = location('Waterfall Cave 3', waterfallCave2, fluteOfLime1);
const waterfallCaveChest2 = chest('Waterfall Cave Chest 2 (Sword of Water)', waterfallCave3);
const waterfallCaveChest3 = chest('Waterfall Cave Chest 3 (Flute of Lime)', waterfallCave3);
const swordOfWater = item('Sword of Water', waterfallCaveChest2);
const fluteOfLime2 = item('Flute of Lime 2', waterfallCaveChest3);
const akahanaCave = talk('Akahana: Cave', waterfallCave3, fluteOfLime2);
const shieldRing = item('Shield Ring', akahanaCave);
// Note: lumping lime tree valley into waterfall valley for now
const rage = talk('Rage', waterfallValley1, swordOfWater);
const ballOfWater = item('Ball of Water', rage);
const kirisaCave1 = location('Kirisa Cave 1', waterfallValley2);
const kirisaCave2 = location('Kirisa Cave 2', kirisaCave1, windLevel2);
const kirisaCaveChest1 = chest('Kirisa Cave Chest 1 (Antidote)', kirisaCave2);
const kirisaMeadow = location('Kirisa Meadow', kirisaCave2);
const kirisaMeadowGrass = chest('Kirisa Meadow Grass', kirisaMeadow);
const kirisaPlant = item('Kirisa Plant', kirisaMeadowGrass);
// TODO - consider putting a hole through one of these caves (e.g. kirisa or foglamp)
// into desert or goa or something?
const fogLampCave1 = location('Fog Lamp Cave 1', waterfallValley2);
const fogLampCave2 = location('Fog Lamp Cave 2', fogLampCave1, windLevel2);
const fogLampCaveChest1 = chest('Fog Lamp Cave Chest 1 (Lysis Plant)', fogLampCave2);
const fogLampCaveChest2 = chest('Fog Lamp Cave Chest 2 (Mimic)', fogLampCave2);
const fogLampCaveChest3 = chest('Fog Lamp Cave Chest 3 (Mimic)', fogLampCave2);
const fogLampCaveChest4 = chest('Fog Lamp Cave Chest 3 (Fog Lamp)', fogLampCave2);
const fogLamp = item('Fog Lamp', fogLampCaveChest4);
const undergroundChannel = location('Underground Channel', portoa, ballOfWater);
const asina = talk('Asina', undergroundChannel);
const recover = magic('Recover', asina);
const dolphinHeal = talk('Dolphin Healed', undergroundChannel);
const shellFlute = item('Shell Flute', dolphinHeal);
const boat = trigger('Boat', portoa, fogLamp, shellFlute);

////////////////////////////////////////////////////////////////
// Angry Sea
////////////////////////////////////////////////////////////////
const cabin = location('Cabin', portoa, boat);
const kensuCabin = talk('Kensu (cabin)', cabin);
const dolphin = trigger('Dolphin', kensuCabin, shellFlute);
const angrySeaSouth = location('Angry Sea South',
                               route('via Underground Channel', undergroundChannel, swimOrFly),
                               route('via Boat', cabin, swimOrFly),
                               route('via Joel', () => joel, swimOrFly),
                               route('via Angry Sea North', () => angrySeaNorth, swimOrFly));
const lovePendant = item('Love Pendant', undergroundChannel, swimOrFly);
const joel = location('Joel', angrySeaSouth, swimOrFly);
const joelElder = talk('Joel Elder', joel);
const evilSpiritIsland1 = location('Evil Spirit Island 1', angrySeaSouth, swimOrFly, joelElder);
// NOTE: if there's a back route into zombie town then we need to break this out quite a bit more
// into about 5-6 more chunks that have different chests and that can be accessed in reverse.
const evilSpiritIsland2 = location('Evil Spirit Island 2', evilSpiritIsland1, freezeOrFly, windLevel2);
const evilSpiritIslandChest1 = chest('Evil Spirit Island Chest 1 (Magic Ring)', evilSpiritIsland2);
const evilSpiritIslandChest2 = chest('Evil Spirit Island Chest 2 (Iron Necklace)', evilSpiritIsland2);
const evilSpiritIslandChest3 = chest('Evil Spirit Island Chest 3 (Mimic)', evilSpiritIsland2);
const evilSpiritIslandChest4 = chest('Evil Spirit Island Chest 4 (Lysis Plant)', evilSpiritIsland2);
const ironNecklace = item('Iron Necklace', evilSpiritIslandChest2);
const zombieTown = location('Zombie Town', evilSpiritIsland2);
const saberaCastle1 = location('Sabera\'s Castle 1', zombieTown);
const saberaCastleMiniBoss = location('Sabera\'s Castle Mini Boss', saberaCastle1);
const vampire2 = boss('Vampire 2', saberaCastleMiniBoss, sword);
const vampire2Chest = chest('Vamp1re 2 Chest (Fruit of Power)', vampire2);
const saberaCastleMiniBossKilled = trigger('Sabera\'s Castle Mini Boss Killed', vampire2);
const saberaCastle2 = location('Sabera\'s Castle 2', saberaCastleMiniBoss, saberaCastleMiniBossKilled);
const saberaCastleChest1 = chest('Sabera\'s Castle Chest 1 (Fruit of Power)', saberaCastle1);
const saberaCastleChest2 = chest('Sabera\'s Castle Chest 2 (Medical Herb)', saberaCastle2);
const saberaCastleBoss = location('Sabera Castle Boss', saberaCastle2);
const sabera1 = boss('Sabera 1', saberaCastleBoss, swordOfFire, flameMagic);
const sabera1Chest = chest('Sabera 1 Chest (Broken Statue)', sabera1);
const brokenStatue = item('Broken Statue', sabera1Chest);
const saberaCastleBossKilled = trigger('Sabera\'s Castle Boss Killed', sabera1);
const clark = talk('Clark', zombieTown, saberaCastleBossKilled);
const eyeGlasses = item('Eye Glasses', clark);
const joelLighthouse = location('Joel Lighthouse', joel, eyeGlasses);
const kensuLighthouse = talk('Kensu (lighthouse)', joelLighthouse, alarmFlute);
const glowingLamp = item('GlowingLamp', kensuLighthouse);
const fixStatue = trigger('Fix Broken Statue', brokenStatue, glowingLamp);
const statueOfGold = item('Statue of Gold', fixStatue);
const angrySeaAltar = location('Angry Sea Altar', angrySeaSouth, swimOrFly);
const calmSeas = trigger('Calm the Seas', angrySeaAltar, statueOfGold);
const angrySeaNorth = location('Angry Sea North',
                               route('via Angry Sea South', angrySeaSouth, calmSeas, swimOrFly),
                               route('via Swan', () => swan, swimOrFly));
const barrier = magic('Barrier', angrySeaNorth);  // TODO - make this contingent on calming seas?

////////////////////////////////////////////////////////////////
// Goa Valley
////////////////////////////////////////////////////////////////

// Note: there's currently no reverse entrance via Goa Valley - we could possibly
// station an extra guard or two on the other side of the gate?
const swan = location('Swan', angrySeaNorth, swimOrFly);
const kensuSwan = talk('Kensu (Swan)', swan, paralysis, lovePendant);
const change = magic('Change', kensuSwan);

const goaValley = location('Goa Valley',
                           route('via Swan', swan, change),
                           route('via desert1', () => desert1),
                           route('via Goa', () => goa),
                           route('via Hydra', () => mtHydra1));
const goa = location('Goa',
                     route('via Goa Valley', goaValley),
                     route('via Goa Fortress', () => fortress1a));
const mtHydra1 = location('Mt Hydra 1', // outer area
                          route('forward', goaValley),
                          route('reverse', () => mtHydra2, freezeOrFly));
const mtHydra2 = location('Mt Hydra 2', // crossed ice bridge toward shyron
                          route('forward', mtHydra1, freezeOrFly),
                          route('reverse', () => shyron));
const shyron = location('Shyron', mtHydra2, changeOrGlitch);
const zebuShyron = talk('Zebu (Shyron)', shyron);
const keyToStyx = item('Key to Styx', zebuShyron);
const mtHydra3 = location('Mt Hydra 3', mtHydra1, freezeOrFly);
const mtHydra4 = location('Mt Hydra 4', mtHydra3, windLevel2);
const mtHydraChest1 = chest('Mt Hydra Chest 1 (Fruit of Lime)', mtHydra1);
const mtHydraChest2 = chest('Mt Hydra Chest 2 (Medical Herb)', mtHydra3);
const mtHydraChest3 = chest('Mt Hydra Chest 3 (Magic Ring)', mtHydra4);
const mtHydraChest4 = chest('Mt Hydra Chest 4 (Mimic)', mtHydra4);
const mtHydraChest5 = chest('Mt Hydra Chest 5 (Bow of Sun)', mtHydra4, () => flight);
const bowOfSun = item('Bow of Sun', mtHydraChest5);
const styx1 = location('Styx 1', mtHydra3, keyToStyx);
const styx2 = location('Styx 2', styx1, freezeOrFly);
const styx3 = location('Styx 3', styx1, () => flight);
const styxChest1 = chest('Styx Chest 1 (Mimic)', styx1);
const styxChest2 = chest('Styx Chest 2 (Medical Herb)', styx2);
const styxChest3 = chest('Styx Chest 3 (Sword of Thunder)', styx2);
const styxChest4 = chest('Styx Chest 4 (Psycho Shield)', styx3);
const styxChest5 = chest('Styx Chest 5 (Mimic)', styx3);
const styxChest6 = chest('Styx Chest 6 (Mimic)', styx3);
const swordOfThunder = item('Sword of Thunder', styxChest3);
const psychoShield = item('Psycho Shield', styxChest4);
const fortress1a = location('Fortress 1a',
                            route('forward', goa),
                            route('reverse', () => fortress1b, () => thunderLevel2));
const madoTrigger = trigger('Mado Trigger', fortress1a, swordOfThunder);
const shyronBoss = trigger('Shyron Boss', shyron, madoTrigger);
const mado1 = boss('Mado 1', shyronBoss, blizzardMagic);
const mado1chest = ('Mado 1 Chest (Ball of Thunder)', mado1);
const ballOfThunder = item('Ball of Thunder', mado1chest);
const thunderLevel2 = trigger('Thunder Level 2', swordOfThunder, ballOfThunder);
const akahanaFriend = talk('Akahana Friend', goa, change);
const warriorRing = item('Warrior Ring', akahanaFriend);

////////////////////////////////////////////////////////////////
// Amazones
////////////////////////////////////////////////////////////////

const cordelPlainsSouth = location('Cordel Plains South',
                                   route('via Cordel Plain', cordelPlains, freezeOrFly),
                                   route('via Amazones', () => amazones));
const amazones = location('amazones',
                          // TODO - route('via ???
                          route('via Cordel Plain', cordelPlainsSouth))
const amazonesQueenHouse = location('Amazones Queen House', amazones, change);
const amazonesQueen = talk('Amazones Queen', amazonesQueenHouse, change, kirisaPlant);
const bowOfMoon = item('Bow of Moon', amazonesQueen);
const amazonesChest = chest('Amazones Chest', amazonesQueenHouse);
const blizzardBracelet = item('Blizzard Bracelet', amazonesChest);

////////////////////////////////////////////////////////////////
// Goa Fortress
////////////////////////////////////////////////////////////////

const fortress1b = location('Fortress 1b',
                            route('forward', fortress1a, thunderLevel2),
                            route('reverse', () => fortress1BossKilled));
const fortress1Boss = location('Fortress 1 Boss',
                               route('forward', fortress1b),
                               route('reverse', () => fortress2a));
const kelbesque2 = boss('Kelbesque 2', fortress1Boss, swordOfWind, tornadoMagic);
const kelbesque2chest = chest('Kelbesque 2 Chest (Opel Statue)', kelbesque2);
const fortress1BossKilled = trigger('Fortress 1 Boss Killed', kelbesque2);
const fortress2a = location('Fortress 2a',
                            route('forward', fortress1BossKilled),
                            route('reverse', () => fortress2b, freezeOrFly));
const zebuFortress = talk('Zebu (fortress)', fortress2a);
const fortress2b = location('Fortress 2b',
                            route('forward', fortress2a, freezeOrFly),
                            route('reverse', () => fortress2Boss, thunderLevel2));
const fortress2c = location('Fortress 2c', fortress2a, thunderLevel2);
const fortress2Boss = location('Fortress 2 Boss',
                               route('forward', fortress2b, thunderLevel2),
                               route('reverse', () => fortress2BossKilled));
const fortress2Chest1 = chest('Fortress 2 Chest 1 (Fruit of Repun)', fortress2b);
const fortress2Chest2 = chest('Fortress 2 Chest 2 (Lysis Plant)', fortress2b);
const fortress2Chest3 = chest('Fortress 2 Chest 3 (Fruit of Power)', fortress2c);
const sabera2 = boss('Sabera 2', fortress2Boss, swordOfFire, flameMagic);
const sabera2chest = chest('Sabera 2 Chest (Fruit of Repun)', sabera2);
const fortress2BossKilled = trigger('Fortress 2 Boss Killed', sabera2);
const fortress3a = location('Fortress 3a',
                            route('forward', fortress2BossKilled),
                            route('reverse', () => fortress3BossKilled));
const tornelFortress = talk('Tornel (fortress)', fortress3a);
const fortress3b = location('Fortress 3b', fortress3a, thunderLevel2);
const fortress3Chest1 = chest('Fortress 3 Chest 1 (Magic Ring)', fortress3a);
const fortress3Chest2 = chest('Fortress 3 Chest 2 (Opel Statue)', fortress3a);
const fortress3Chest3 = chest('Fortress 3 Chest 3 (Antidote)', fortress3a);
const fortress3Chest4 = chest('Fortress 3 Chest 4 (Magic Ring)', fortress3b);
const fortress3Chest5 = chest('Fortress 3 Chest 5 (Magic Ring)', fortress3a);
const fortress3Boss = location('Fortress 3 Boss',
                               route('forward', fortress3a),
                               route('reverse', () => fortress4a));
const mado2 = boss('Mado 2', fortress3Boss, swordOfWater, blizzardMagic);
const mado2chest = chest('Mado 2 Chest (Sacred Shield)', mado2);
const fortress3BossKilled = trigger('Fortress 3 Boss Killed', mado2);
const fortress4a = location('Fortress 4a',
                            route('forward', fortress3BossKilled),
                            route('reverse', () => fortress4b, thunderLevel2));
const asinaFortress = talk('Asina (fortress)', fortress4a);
const fortress4b = location('Fortress 4b',
                            route('forward', fortress4a, thunderLevel2),
                            route('reverse', () => oasisCave2));
const fortress4Chest1 = chest('Fortress 4 Chest 1 (Warp Boots)', fortress4b);
const fortress4Chest2 = chest('Fortress 4 Chest 2 (Magic Ring)', fortress4b);
const fortress4Chest3 = chest('Fortress 4 Chest 3 (Mimic)', fortress4b);
const fortress4Chest4 = chest('Fortress 4 Chest 4 (Mimic)', fortress4b);
const fortress4Chest5 = chest('Fortress 4 Chest 5 (Mimic)', fortress4b);
const fortress4Boss = location('Fortress 4 Boss', fortress4b);
const karmine = boss('Karmine', fortress4Boss, swordOfThunder);
const karmineChest = chest('Karmine Chest (Ivory Statue)', karmine);
const fortress4c = location('Fortress 4c', karmine);
const fortress4Chest6 = chest('Fortress 4 Chest 6 (Storm Bracelet)', fortress4c);
const ivoryStatue = item('Ivory Statue', karmineChest);
const stormBracelet = item('Storm Bracelet', fortress4Chest6);
const kensuFortress = talk('Kensu Fortress', fortress4b, ivoryStatue);
const flight = magic('Flight', kensuFortress);

////////////////////////////////////////////////////////////////
// Desert
////////////////////////////////////////////////////////////////

const desert1 = location('Desert 1',
                         route('via Goa Valley', goaValley),
                         route('via Oasis Cave', () => oasisCave1),
                         route('via Desert 2', () => desertCave1, flight));
const oasisCave1 = location('Oasis Cave 1',
                            route('via Desert', desert1),
                            route('via Fortress', () => oasisCave2, flight));
const oasisCave2 = location('Oasis Cave 2',
                            route('via Fortress', fortress4b),
                            route('via Desert', oasisCave1, flight));
const oasisCave3 = location('Oasis Cave 3',
                            route('forward', oasisCave1, freezeOrFly),
                            route('reverse', () => fortressBasement, thunderLevel2));
const oasisCave4 = location('Oasis Cave 4', oasisCave3, flight);
const oasisCaveChest1 = chest('Oasis Cave Chest 1 (Leather Boots)', oasisCave1);
const oasisCaveChest2 = chest('Oasis Cave Chest 2 (Fruit of Power)', oasisCave2);
const oasisCaveChest3 = chest('Oasis Cave Chest 3 (Fruit of Power)', oasisCave3);
const oasisCaveChest4 = chest('Oasis Cave Chest 4 (Battle Armor)', oasisCave4);
const fortressBasement = location('Fortress 3 Basement', oasisCave3, thunderLevel2);
const fortressBasementChest = chest('Fortress Basement Chest (Power Ring)', fortressBasement);
const powerRing = item('Power Ring', fortressBasementChest);
const desertCave1 = location('Desert Cave 1',
                             route('via Desert 1', desert1, flight),
                             route('via Sahara', () => saharaMeadow));
const saharaMeadow = location('Sahara Meadow',
                              route('via Desert 1', desertCave1),
                              route('via Sahara', () => sahara));
const deo = talk('Deo', saharaMeadow, change);
const deosPendant = item('Deo\'s Pendant', deo);
const sahara = location('Sahara',
                        route('via Desert 1', saharaMeadow),
                        route('via Desert 2', () => desertCave2));
const desertCave2 = location('Desert Cave 2',
                             route('via Sahara', sahara),
                             route('via Desert 2', () => desert2));
const desert2 = location('Desert 2',
                         // TODO - any alternative routes?
                         route('via Sahara', desertCave2));

////////////////////////////////////////////////////////////////
// Endgame
////////////////////////////////////////////////////////////////

// TODO - is it worth adding alternative routes to these?
const pyramidFront = location('Pyramid Front', desert2, flight);
const pyramidFrontChest = chest('Pyramid Front Chest (Magic Ring)', pyramidFront);
const draygon1 = boss('Draygon 1', pyramidFront, sword);
const draygon1Chest = chest('Draygon 1 Chest (Psycho Armor)', draygon1);
const psychoArmor = item('Psycho Armor', draygon1Chest);
const azteca = talk('Azteca', draygon1);
const bowOfTruth = item('Bow of Truth', azteca);
const pyramidBack = location('Pyramid Back', desert2, flight, bowOfSun, bowOfMoon);
const pyramidBackChest1 = chest('Pyramid Back Chest 1 (Opel Statue)', pyramidBack);
const pyramidBackChest2 = chest('Pyramid Back Chest 2 (Mimic)', pyramidBack);
const draygon2 = boss('Draygon 2', pyramidBack, bowOfTruth, sword); // powerRing ?
const tower = location('Tower', draygon2);
const mesia = talk('Mesia', tower);
const crystalis = item('Crystalis', mesia);
const dyna = boss('Dyna', crystalis);
const end = trigger('End', dyna);

//console.log(g.toDot());
