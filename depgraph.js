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
                              //route('swim', () => dolphin),
                              route('fly', () => flight));
const freezeOrFly = trigger('Freeze or Fly',
                            route('freeze', () => swordOfWater, () => ballOfWater),
                            route('fly', () => flight));
// NOTE: the following four edges can be removed for a more challenging experience
const tornadoMagic  = trigger('Tornado Magic', () => swordOfWind, () => tornadoBracelet);
const flameMagic    = trigger('Flame Magic', () => swordOfFire, () => flameBracelet);
const blizzardMagic = trigger('Blizzard Magic', () => swordOfWater, () => blizzardBracelet);
const stormMagic    = trigger('Storm Magic', () => swordOfThunder, () => stormBracelet);

////////////////////////////////////////////////////////////////
// Valley of Wind
////////////////////////////////////////////////////////////////
const leaf          = location('Leaf', start);
const valleyOfWind  = location('Valley of Wind',
                               route('forward', leaf),
                               // TODO - currently glitched
                               // route('via Vampire', () => vampCave1)
                               route('via Zebu', () => zebuCave));
const alarmFlute    = item('Alarm Flute', leaf, () => joel);
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
                                     // TODO - rabbit trigger skippable
                                     () => mtSabreNorth1, () => leafRabbit, () => teleport),
                               route('via Mt Sabre West', () => mtSabreWest1, () => fireLevel2));
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
                        route('via Angry Sea', () => angrySea, swimOrFly));
const portoaQueen1 = talk('Portoa Queen 1', portoa, paralysis);
const fluteOfLime1 = item('Flute of Lime 1', portoaQueen1);
const waterfallCave1 = location('Waterfall Cave 1', waterfallValley1);
const waterfallCave2 = location('Waterfall Cave 2', waterfallCave1, fireLevel2);
const waterfallCaveChest1 = chest('Waterfall Cave Chest 1 (mimic)', waterfallCave2);
// TODO - we could model someFluteOfLime and bothFlutesOfLime for the two blocks,
// instead of just assuming the pairing.  The way we have it os probably fine,
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
// TODO - consider putting a hold through one of these caves (e.g. kirisa or foglamp)
const fogLampCave1 = location('Fog Lamp Cave 1', waterfallValley2);
const fogLampCave2 = location('Fog Lamp Cave 2', fogLampCave1, windLevel2);
const fogLampCaveChest1 = chest('Fog Lamp Cave Chest 1 (Lysis Plant)', fogLampCave2);
const fogLampCaveChest2 = chest('Fog Lamp Cave Chest 2 (Mimic)', fogLampCave2);
const fogLampCaveChest3 = chest('Fog Lamp Cave Chest 3 (Mimic)', fogLampCave2);
const fogLampCaveChest4 = chest('Fog Lamp Cave Chest 3 (Fog Lamp)', fogLampCave2);
const fogLamp = item('Fog Lamp', fogLampCaveChest4);
const undergroundChannel = location('Underground Channel', portoa, ballOfWater);

const todo = node('To Do');
const flight = magic('Flight', todo);
const angrySea = location('Angry Sea', todo);
const joel = location('Joel', todo);
const swordOfThunder = item('Sword of Thunder', todo);
const blizzardBracelet = item('Blizzard Bracelet', todo);
const stormBracelet = item('Storm Bracelet', todo);


// const swimOrFly = trigger('Swim or Fly',
//                           route('swim', dolphin),
//                           route('fly', () => flight));


//console.log(g.toDot());
