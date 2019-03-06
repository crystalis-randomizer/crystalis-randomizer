import {
  Area,
  Boss,
  BossDrop,
  Chest,
  Condition,
  Item,
  ItemGet,
  Location,
  Magic,
  Option,
  Slot,
  TrackerNode,
  Trigger,
  WorldGraph,
} from './nodes.js';
import {FlagSet} from './flagset.js';

// Make a fresh/clean graph. We could pass options directly into this function.
// Options:{
//   connectLeafToLimeTree: boolean
//   earlyFlight: boolean
//   rescaleEnemies: boolean
//   items: 0 - no shuffle
//          1 - everything shuffled separately
//          2 - key items and bonus items shuffled together
//          3 - key items, bonus items, and magic shuffled together
//          4 - key items, bonus items, and consumables shuffled together
//          5 - total shuffle
//   monsters: 0 - no shuffle
//             1 - shuffle with reasonable limits
//             2 - totally random
//   refresh: 0 - guaranteed for all bosses
//            1 - guaranteed for all generals
//            2 - guaranteed for mado and karmine
//            3 - never guaranteed
//   barrier: 0 - guaranteed for statue gauntlets
//            1 - guaranteed for stxy
//            2 - never garanteed
//   bracelets: 0 - guaranteed for generals
//              1 - never guaranteed
//   gasMask: 0 - guaranteed for oak and insect
//            1 - guaranteed for insect
//            2 - never guaranteed
//   wildWarp: 0 - enabled but not required
//             1 - disabled
//             2 - may be required
//   glitches: 1 - may require ghetto flight
//             2 - may require talk glitch
//             4 - may require sword charge glitch ??? - or fix them...
//   leatherBoots: 0 - normal
//                 1 - speed
//   balance: 0 - no rebalancing
//            1 - rebalance swords
//            2 - rebalance items (incl. medical herb)
//            3 - rebalance both

// hell mode
//   - gas mask not guaranteed
//   - matching sword not guaranteed
//   - medical herb not buffed
//   - scaling to 47 in tower
//   - slower EXP scaling

// NOT CHECKSUMMED:
//   equip: 0 - no change
//          1 - auto-equip power

export const generate = (flags = undefined) => {

const graph = new WorldGraph();
const option = (name, value = true) => new Option(graph, name, value);
const item = (id, name) => new Item(graph, id, name, id, null);
const magic = (id, name) => new Magic(graph, id, name, id, null);
const trigger = (name) => new Trigger(graph, name);
const condition = (name) => new Condition(graph, name);
const boss = (index, name, ...deps) => new Boss(graph, index, name, ...deps);
const area = (name) => new Area(graph, name);
const location = (id, area, name) => new Location(graph, id, area, name);

const opt = (name, def) => {
  if (!flags) return def;
  const invert = name.startsWith('!');
  if (invert) name = name.substring(1);
  return flags.check(name) ^ invert;
}

const ID= /**/ ()=> /**/  x=>x;
const offRoute = ID((option) => new TrackerNode(
    graph, TrackerNode.OFF_ROUTE, 'Off-route', option, [], 1));
const glitch = ID((option) => new TrackerNode(
    graph, TrackerNode.GLITCH, 'Glitch', option, [], 1));
const hard = ID((option, missing = [], weight = 1) => new TrackerNode(
    graph, TrackerNode.HARD, 'Hard', option, missing, weight));


// TODO - TrackerNodes are causing problems,
//  - mucking up the system so we can't integrate
//    instead, get them out in the open
//  - get mapping from index to uid
//  - figure out which items are being added to - find edge of tracker items

// hypothesis: having a ton of different hard mode options that aren't
// integrated out is causing there to be too many different combinations
// during the location integration.

const hard2 = (option, missing = [], weight = 1) => H; /* new TrackerNode(
    graph, TrackerNode.HARD, 'Hard', option, missing, weight); /**/

////////////////////////////////////////////////////////////////
// Options
////////////////////////////////////////////////////////////////
const leatherBootsGiveSpeed = option('Leather Boots grant speed',
                                     opt('Ts', true));
const assumeGhettoFlight    = glitch(option('Assume ghetto flight',
                                     opt('Gf', true)));
const assumeTalkGlitch      = glitch(option('Assume talk glitch',
                                     opt('Gt', true)));
const assumeRabbitSkip      = glitch(option('Assume rabbit skip',
                                     opt('Gr', false)));
const swordMagicOptional    = option('Sword magic optional',
                                     opt('Hw', false));
const matchingSwordOptional = option('Matching sword optional',
                                     opt('Hs', false));
const gasMaskOptional       = option('Gas mask optional',
                                     opt('Hg', false));
const healedDolphinOptional = option('Healed dolphin optional',
                                     opt('!Rd', true));
const calmedSeaOptional     = option('Calmed sea not required',
                                     opt('!Rl', false));
const teleportToShyron      = option('Sword of Thunder teleports to Shyron',
                                     opt('Rt', true));
const barrierOptional       = option('Barrier magic optional',
                                     opt('Hb', true));
const refreshOptional       = option('Refresh magic optional',
                                     opt('!Er', true));
const routeEarlyFlight      = offRoute(option('Early flight route',
                                     opt('Rf', false)));
const limeTreeConnectsToLeaf = option('Lime Tree connects to Leaf',
                                      opt('Rp', true));
const assumeWildWarp        = option('Assume wild warp',
                                     opt('Gw', false));
const allowWildWarp         = glitch(option('Allow wild warp',
                                     opt('!Tw', false)));
const assumeSwordChargeGlitch = glitch(option('Assume sword charge glitch',
                                       opt('Gs', false)));

const H = new TrackerNode(graph, TrackerNode.HARD, 'Hard', matchingSwordOptional, [], 1);

// TODO - for wild warp consider adding a list of locations,
// then we can hack those into the rom if it changes?
//   - .wildWarp(true)   - standard mode wild warp
//   - .wildWarp(false)  - wild warp eligible

////////////////////////////////////////////////////////////////
// Items
////////////////////////////////////////////////////////////////
const swordOfWind           = item(0x00, 'Sword of Wind')
                                .weight(5)
                                .fromPerson('Leaf elder', 0x0d)
                                .npcSpawn(0x5e, 0x10, 1)
                                .dialog(0x0d, 0xc0, 2)
                                .key()
const swordOfFire           = item(0x01, 'Sword of Fire')
                                .weight(5)
                                .fromPerson('Oak elder', 0x1d)
                                .dialog(0x1d, null, 3)
                                .key();
const swordOfWater          = item(0x02, 'Sword of Water')
                                .weight(10)
                                .chest()
                                .key();
const swordOfThunder        = item(0x03, 'Sword of Thunder')
                                .weight(15)
                                .chest()
                                .key();
const crystalis             = item(0x04, 'Crystalis').fixed();
const ballOfWind            = item(0x05, 'Ball of Wind').chest().key();
const tornadoBracelet       = item(0x06, 'Tornado Bracelet').chest().key();
const ballOfFire            = item(0x07, 'Ball of Fire')
                                .bossDrop('Insect', 0x01)
                                .dialog(0x1e, null, 0)
                                .dialog(0x20, null, 0)
                                .dialog(0x21, null, 0)
                                .dialog(0x22, null, 0)
                                .dialog(0x60, 0x1e, 0)
                                .dialog(0x1d, null, 2)
                                .dialog(0x1f, null, 0)
                                .npcSpawn(0xc1)
                                .key();
const flameBracelet         = item(0x08, 'Flame Bracelet')
                                .bossDrop('Kelbesque 1', 0x02)
                                .npcSpawn(0xc2)
                                .key();
const ballOfWater           = item(0x09, 'Ball of Water')
                                .weight(5)
                                .direct('Rage', 0x3d337)
                                .npcSpawn(0xc3)
                                .key();
const blizzardBracelet      = item(0x0a, 'Blizzard Bracelet')
                                .weight(5)
                                .chest()
                                .key();
const ballOfThunder         = item(0x0b, 'Ball of Thunder')
                                .bossDrop('Mado 1', 0x05)
                                .trigger(0x9a, 1)
                                .key();
const stormBracelet         = item(0x0c, 'Storm Bracelet').chest().key();
const carapaceShield        = item(0x0d, 'Carapace Shield').armor();
const bronzeShield          = item(0x0e, 'Bronze Shield').armor();
const platinumShield        = item(0x0f, 'Platinum Shield').armor();
const mirroredShield        = item(0x10, 'Mirrored Shield').armor();
const ceramicShield         = item(0x11, 'Ceramic Shield').armor();
const sacredShield          = item(0x12, 'Sacred Shield')
                                .armor()
                                .bossDrop('Mado 2', 0x08)
                                .npcSpawn(0xc7)
                                .bonus();
const battleShield          = item(0x13, 'Battle Shield').armor();
const psychoShield          = item(0x14, 'Psycho Shield').armor();
const tannedHide            = item(0x15, 'Tanned Hide').armor();
const leatherArmor          = item(0x16, 'Leather Armor').armor();
const bronzeArmor           = item(0x17, 'Bronze Armor').armor();
const platinumArmor         = item(0x18, 'Platinmum Armor').armor();
const soldierSuit           = item(0x19, 'Soldier Suit').armor();
const ceramicSuit           = item(0x1a, 'Ceramic Suit').armor();
const battleSuit            = item(0x1b, 'Battle Suit').armor();
const psychoArmor           = item(0x1c, 'Psycho Armor')
                                .armor()
                                .bossDrop('Draygon 1', 0x0a)
                                .npcSpawn(0xcb) // boss spawn
                                .trigger(0x9f) // unused?
                                .npcSpawn(0x83) // azteca
                                .key();
const medicalHerb           = item(0x1d, 'Medical Herb').consumable();
const antidote              = item(0x1e, 'Antidote').consumable();
const lysisPlant            = item(0x1f, 'Lysis Plant').consumable();
const fruitOfLime           = item(0x20, 'Fruit of Lime').consumable();
const fruitOfPower          = item(0x21, 'Fruit of Power').consumable();
const magicRing             = item(0x22, 'Magic Ring').consumable();
const fruitOfRepun          = item(0x23, 'Fruit of Repun')
                                .consumable()
                                .bossDrop('Sabera 2', 0x07)
                                .npcSpawn(0xc6)
                                .key();
const warpBoots             = item(0x24, 'Warp Boots').consumable();
const statueOfOnyx          = item(0x25, 'Statue of Onyx')
                                .chest('Cordel grass')
                                .invisible(0x3e3a2)
                                .key();
const opelStatue            = item(0x26, 'Opel Statue')
                                .consumable()
                                .bossDrop('Kelbesque 2', 0x06)
                                .npcSpawn(0xc5)
                                .key();
const insectFlute           = item(0x27, 'Insect Flute')
                                .fromPerson('Oak mother', 0x1e)
                                .dialog(0x1e, null, 1)
                                .key();
const fluteOfLimeQueen      = item(0x28, 'Flute of Lime')
                                .fromPerson('Portoa queen', 0x38)
                                .direct(0x98f9) // persondata 62 +1
                                // .direct(0x3fa28) // mesia version
                                .dialog(0x38, null, 4)
                                .dialog(0x38, null, 5, 0)
                                .key();
const gasMask               = item(0x29, 'Gas Mask')
                                .direct('Akahana in Brynmaer', 0x3d7fe)
                                .npcSpawn(0x16, 0x18)
                                .key();
const powerRing             = item(0x2a, 'Power Ring').chest().bonus();
const warriorRing           = item(0x2b, 'Warrior Ring')
                                .fromPerson('Akahana\'s friend', 0x54)
                                .dialog(0x54, null, 2)
                                .bonus();
const ironNecklace          = item(0x2c, 'Iron Necklace').chest().bonus();
const deosPendant           = item(0x2d, 'Deo\'s Pendant')
                                .fromPerson('Deo', 0x5a)
                                .dialog(0x5a, null, 0)
                                .bonus();
const rabbitBoots           = item(0x2e, 'Rabbit Boots')
                                .bossDrop('Vampire 1', 0x00)
                                .npcSpawn(0xc0)
                                .key();
const leatherBoots          = item(0x2f,
                                   opt('Ts', true) ?
                                       'Speed Boots' :
                                       'Leather Boots').chest().bonus();
const shieldRing            = item(0x30, 'Shield Ring')
                                .direct('Akahana in waterfall cave', 0x3d2af)
                                .npcSpawn(0x16, 0x57, 2)
                                .bonus();
const alarmFlute            = item(0x31, 'Alarm Flute')
                                .consumable()
                                .fixed();
const windmillKey           = item(0x32, 'Windmill Key')
                                .fromPerson('Windmill guard', 0x14)
                                .dialog(0x14, 0x0e, 0)
                                .npcSpawn(0x14, 0x0e, 1)
                                .key();
const keyToPrison           = item(0x33, 'Key to Prison').chest().key();
const keyToStyx             = item(0x34, 'Key to Styx')
                                .fromPerson('Zebu in Shyron', 0x5e, 1)
                                // Require getting both sword of thunder
                                // AND the key to styx SLOT to trigger
                                // shyron massacre.
                                .trigger(0x80, 2) // newly added
                                .dialog(0x5e, 0xf2, 0)
                                .dialog(0x62, 0xf2, 0)
                                .key();
const fogLamp               = item(0x35, 'Fog Lamp').chest().key();
const shellFlute            = item(0x36, 'Shell Flute')
                                .fromPerson('Dolphin', 0x63, 1)
                                .npcSpawn(0x63)
                                //.npcSpawn(0x64)
                                //.dialog(0x7b, null, 0)
                                .key();
                                // TODO --- need to add some code,
                                // still need to delete itemuse trigger?
                                // just use the hard-coded ones...?
const eyeGlasses            = item(0x37, 'Eye Glasses')
                                .fromPerson('Clark', 0x44)
                                .dialog(0x44, 0xe9, 1)
                                .key();
const brokenStatue          = item(0x38, 'Broken Statue')
                                .bossDrop('Sabera 1', 0x04)
                                .npcSpawn(0x7f, 0x65) // sabera
                                .npcSpawn(0x46)
                                .npcSpawn(0x47)
                                .npcSpawn(0x6a)
                                .npcSpawn(0x84)
                                .npcSpawn(0x8e)
                                .dialog(0x3d)
                                .dialog(0x3e)
                                .dialog(0x3f)
                                .dialog(0x40)
                                .dialog(0x41)
                                .dialog(0x42)
                                .dialog(0x43)
                                .dialog(0x44, 0xe9)
                                .trigger(0xb6)
                                .key();
const glowingLamp           = item(0x39, 'Glowing Lamp')
                                .direct('Kensu in lighthouse', 0x3d30e)
                                .npcSpawn(0x7e, 0x62, 1)
                                .key();
//const statueOfGold          = item(0x3a, 'Statue of Gold')
                                // direct(0x1c594) // shuffle is a little odd
//                                .fixed();
const lovePendant           = item(0x3b, 'Love Pendant')
                                .chest('Underground channel')
                                .invisible(0x3e3aa)
                                .key();
const kirisaPlant           = item(0x3c, 'Kirisa Plant')
                                .chest('Kirisa meadow')
                                .invisible(0x3e3a6)
                                .key();
const ivoryStatue           = item(0x3d, 'Ivory Statue')
                                .bossDrop('Karmine', 0x09)
                                .npcSpawn(0xc8)
                                .key();
const bowOfMoon             = item(0x3e, 'Bow of Moon')
                                .fromPerson('Aryllis', 0x23) // not actually used???
                                .direct(0x3d6e8)
                                .dialog(0x23, null, 1)
                                .key();
const bowOfSun              = item(0x3f, 'Bow of Sun')
                                .chest()
                                .key();
const bowOfTruth            = item(0x40, 'Bow of Truth')
                                .fromPerson('Azteca', 0x83)
                                .npcSpawn(0x83, 0x9c, 1)
                                .dialog(0x83, null, 0)
                                .key();
const refresh               = magic(0x41, 'Refresh')
                                .fromPerson('Zebu at windmill', 0x5e)
                                .direct(0x3d711)
                                // NOTE: moved from offset 2 because we rearranged
                                // zebu to always spawn windmill guard
                                .dialog(0x5e, 0x10, 3)
                                .trigger(0xb4, 1);
const paralysis             = magic(0x42, 'Paralysis')
                                .direct('Zebu at Mt. Sabre summit', 0x3d655)
                                .requireUnique()
                                // TODO - require defeating kelbesque?
                                .trigger(0x8d)
                                .trigger(0xb2);
const telepathy             = magic(0x43, 'Telepathy')
                                .direct('Tornel at Stom\'s house', 0x367f4)
                                .npcSpawn(0x5f, 0x1e, 1)
                                .trigger(0x85, 1);
const teleport              = magic(0x44, 'Teleport')
                                .fromPerson('Tornel on Mt. Sabre', 0x5f)
                                .dialog(0x5f, 0x21, 0);
const recover               = magic(0x45, 'Recover')
                                .direct('Asina in Portoa', 0x3d1f9);
                                // NOTE: no need for second slot because
                                // recover does not have an ItemGet normally.
const barrier               = magic(0x46, 'Barrier')
                                .direct('Asina on Angry sea', 0x3d6d9)
                                .requireUnique()
                                .trigger(0x84, 0);
const change                = magic(0x47, 'Change')
                                .direct('Kensu in Swan', 0x3d6de)
                                .npcSpawn(0x74, 0xf1, 1);
const flight                = magic(0x48, 'Flight')
                                .weight(15)
                                .direct('Kensu in Draygonia Fortress', 0x3d18f);
                                // See recover - no need for second slot.
const fluteOfLimeChest      = item(0x28, "Flute of Lime").chest(undefined, 0x5b).key();
const fruitOfPowerVampire2  = fruitOfPower
                                .bossDrop('Vampire 2', 0x0c, 0x61)
                                .npcSpawn(0xcc)
                                .key();
const mimic                 = item(0x70, 'Mimic'); // special handling to dup


////////////////////////////////////////////////////////////////
// Triggers
////////////////////////////////////////////////////////////////

// TODO - maybe don't build any logic into here, just put them where they need to go?
const talkedToLeafElder     = trigger('Talked to Leaf Elder').get(swordOfWind);
const talkedToLeafStudent   = trigger('Talked to Leaf Student');
const buyAlarmFlute         = trigger('Buy alarm flute').get(alarmFlute);
const talkedToZebuInCave    = trigger('Talked to Zebu in cave');
const wokeUpWindmillGuard   = trigger('Woke up Windmill Guard').get(windmillKey);
const startedWindmill       = trigger('Started Windmill');
const learnedRefresh        = trigger('Learned Refresh').get(refresh);
const gaveStatueToAkahana   = trigger('Gave Statue to Akahana').get(gasMask);
const foughtStom            = trigger('Fought Stom').get(telepathy);
const visitedOak            = trigger('Visited Oak');
const talkedToOakMother     = trigger('Talked to Oak Mother');
const rescuedOakChild       = trigger('Rescued Oak Child');
const talkedToOakMothher2   = trigger('Talked to Oak Mother Again').get(insectFlute);
const talkedToOakElder      = trigger('Talked to Oak Elder').get(swordOfFire);
const talkedToTornelOnMtSabre = trigger('Talked to Tornel on Mt Sabre').get(teleport);
const villagersAbducted     = trigger('Villagers Abducted');
const talkedToLeafRabbit    = trigger('Talked to Rabbit in Leaf');
const learnedParalysis      = trigger('Learned Paralysis').get(paralysis);
const talkedToPortoaQueen   = trigger('Talked to Portoa Queen');
const talkedToFortuneTeller = trigger('Talked to Fortune Teller');
const visitedUndergroundChannel = trigger('Visited Underground Channel');
const sentToWaterfallCave   = trigger('Sent to Waterfall Cave').get(fluteOfLimeQueen); // no rando? or do both...
const curedAkahana          = trigger('Cured Akahana').get(shieldRing);
const talkedToRage          = trigger('Talked to Rage').get(ballOfWater);
const mesiaRecording        = trigger('Mesia recording played');
const talkedToAsina         = trigger('Talked to Asina').get(recover);
const healedDolphin         = trigger('Healed Dolphin').get(shellFlute);
const returnedFogLamp       = trigger('Returned Fog Lamp');
const talkedToKensuInCabin  = trigger('Talked to Kensu in Cabin');
const talkedToJoelElder     = trigger('Talked to Joel Elder');
const talkedToClark         = trigger('Talked to Clark').get(eyeGlasses);
const talkedToKensuInLighthouse = trigger('Talked to Kensu in Lighthouse').get(glowingLamp);
//const repairBrokenStatue    = trigger('Repair Broken Statue').get(statueOfGold); // no rando?
const calmedSea             = trigger('Calmed the Angry Sea');
const learnedBarrier        = trigger('Learned Barrier').get(barrier);
const talkedToStomInSwan    = trigger('Talked to Stom in Swan Hut');
const talkedToKensuInTavern = trigger('Talked to Kensu in Swan tavern');
const talkedToKensuAtDance  = trigger('Talked to Kensu at Swan dance');
const returnedLovePendant   = trigger('Returned Kensu\'s love pendant').get(change);
const talkedToAmazonesQueen = trigger('Talked to Amazones Queen').get(bowOfMoon);
const enteredShyron         = trigger('Entered Shyron');
const talkedToZebuInShyron  = trigger('Talked to Zebu in Shyron').get(keyToStyx);
const shyronMassacre        = trigger('Shyron Massacre');
const savedKensu            = trigger('Saved Kensu').get(flight);
const talkedToDeo           = trigger('Talked to Deo').get(deosPendant);
const talkedToAkahanaFriend = trigger('Talked to Akahana\'s Friend').get(warriorRing);
const getBowOfTruth         = trigger('Get Bow of Truth').get(bowOfTruth);
const forgedCrystalis       = trigger('Forged Crystalis').get(crystalis);
//exports.end = win;

////////////////////////////////////////////////////////////////
// Conditions
////////////////////////////////////////////////////////////////
const earlyFlight           = condition('Early flight')
                                .option(routeEarlyFlight);
const swordChargeGlitch     = condition('Sword charge glitch')
                                .option(assumeSwordChargeGlitch);
const rabbitSkip            = condition('Rabbit skip')
                                .option(assumeRabbitSkip);
const talkGlitch            = condition('Talk glitch')
                                .option(assumeTalkGlitch);
const ghettoFlight          = condition('Ghetto flight')
                                .option(assumeGhettoFlight);
const wildWarp              = condition('Wild warp')
                                .option(assumeWildWarp)
                                .option(allowWildWarp);
const anyLevel2             = condition('Any level 2 sword')
                                .option(swordOfWind, ballOfWind)
                                .option(swordOfWind, tornadoBracelet)
                                .option(swordOfFire, ballOfFire)
                                .option(swordOfFire, flameBracelet)
                                .option(swordOfWater, ballOfWater)
                                .option(swordOfWater, blizzardBracelet)
                                .option(swordOfThunder, ballOfThunder)
                                .option(swordOfThunder, stormBracelet);
const destroyStone          = condition('Destroy stone')
                                .option(swordOfWind, ballOfWind)
                                .option(swordOfWind, tornadoBracelet)
                                .option(swordChargeGlitch, swordOfWind, anyLevel2);
const destroyIce            = condition('Destroy ice')
                                .option(swordOfFire, ballOfFire)
                                .option(swordOfFire, flameBracelet)
                                .option(swordChargeGlitch, swordOfFire, anyLevel2);
const crossRivers           = condition('Cross rivers')
                                .option(swordOfWater, ballOfWater)
                                .option(swordOfWater, blizzardBracelet)
                                .option(flight, earlyFlight)
                                .option(swordChargeGlitch, swordOfWater, anyLevel2);

const destroyIron           = condition('Destroy iron')
                                .option(swordOfThunder, ballOfThunder)
                                .option(swordOfThunder, stormBracelet)
                                .option(swordChargeGlitch, swordOfThunder, anyLevel2);
const anySword              = condition('Any sword')
                                .option(swordOfWind).option(swordOfFire)
                                .option(swordOfWater).option(swordOfThunder);
const matchInsectSword      = condition('Match insect sword (fire/water/thunder)')
                                .option(swordOfFire)
                                .option(swordOfWater)
                                .option(swordOfThunder)
                                .option(gasMask, hard2(matchingSwordOptional), swordOfWind);
const speedBoots            = condition('Speed boots').option(leatherBoots, leatherBootsGiveSpeed);
const climbSlopes           = condition('Climb slopes')
                                .option(rabbitBoots)
                                .option(flight, earlyFlight)
                                .option(speedBoots);
const enterMtSabreNorth     = condition('Enter Mt Sabre North')
                                .option(talkedToLeafRabbit)
                                .option(rabbitSkip);
// Required for access to underground channel.
const asinaTrigger          = condition('Asina in her room')
                                // NOTE: this is just ballOfWater in vanilla.
                                .option(mesiaRecording);
const paralysisOrAsina      = condition('Paralysis or Ball of Water')
                                .option(paralysis).option(asinaTrigger).option(talkGlitch);
// TODO - consider adding healedDolphin and/or returnedFogLamp here?  otherwise, flight alone
// is basically enough (though with flight the dolphin is basically just a convenience).
const rideDolphin           = condition('Ride dolphin').option(shellFlute, talkedToKensuInCabin);
const crossSea              = condition('Cross sea')
                                .option(rideDolphin)
                                .option(flight, earlyFlight);
const crossWhirlpool        = condition('Cross whirlpool')
                                .option(calmedSea)
                                .option(flight, earlyFlight)
                                .option(ghettoFlight);
const maybeRefresh          = condition('Refresh if needed')
                                .option(hard2(refreshOptional, [refresh]))
                                .option(refresh);
const windMagic             = condition('Wind magic')
                                .option(hard2(swordMagicOptional,
                                             [ballOfWind, tornadoBracelet]),
                                        maybeRefresh)
                                .option(ballOfWind, tornadoBracelet, maybeRefresh);
const fireMagic             = condition('Fire magic')
                                .option(hard2(swordMagicOptional,
                                             [ballOfFire, flameBracelet]),
                                        maybeRefresh)
                                .option(ballOfFire, flameBracelet, maybeRefresh);
const waterMagic            = condition('Water magic')
                                .option(hard2(swordMagicOptional,
                                             [ballOfWater, blizzardBracelet]),
                                        maybeRefresh)
                                .option(swordMagicOptional, maybeRefresh)
                                .option(ballOfWater, blizzardBracelet, maybeRefresh);
const thunderMagic          = condition('Thunder magic')
                                .option(hard2(swordMagicOptional,
                                             [ballOfThunder, stormBracelet]),
                                        maybeRefresh)
                                .option(swordMagicOptional, maybeRefresh)
                                // For Karmine, only guarantee level 2.
                                .option(ballOfThunder, maybeRefresh)
                                .option(stormBracelet, maybeRefresh);
const fluteOfLimeOrGlitch   = condition('Flute of lime or glitch')
                                .option(fluteOfLimeQueen)
                                .option(talkGlitch)
                                .option(offRoute(fluteOfLimeChest));
// this is only really here for tracker
const secondFluteOfLime     = condition('Second flute of lime')
                                .option(fluteOfLimeChest)
                                .option(offRoute(fluteOfLimeQueen));
const changeOrGlitch        = condition('Change or glitch')
                                .option(change)
                                .option(talkGlitch);
const passShootingStatues   = condition('Pass shooting statues')
                                .option(barrier)
                                // Even in non-hell-mode, refresh and shield ring ok
                                .option(hard2(barrierOptional, [barrier]))
                                .option(refresh, shieldRing);
const maybeHealedDolphin    = condition('Healed dolphin if required')
                                .option(healedDolphin)
                                .option(healedDolphinOptional);
const matchSwordOfWind      = condition('Match sword of wind')
                                .option(swordOfWind)
                                .option(hard(matchingSwordOptional,
                                             [swordOfWind], 10),
                                        anySword);
const matchSwordOfFire      = condition('Match sword of fire')
                                .option(swordOfFire)
                                .option(hard(matchingSwordOptional,
                                             [swordOfFire], 8),
                                        anySword);
const matchSwordOfWater     = condition('Match sword of water')
                                .option(swordOfWater)
                                .option(hard(matchingSwordOptional,
                                             [swordOfWater], 15),
                                        anySword);
const matchSwordOfThunder   = condition('Match sword of thunder')
                                .option(swordOfThunder)
                                .option(hard(matchingSwordOptional,
                                             [swordOfThunder], 10),
                                        anySword);
const travelSwamp           = condition('Travel swamp')
                                .option(gasMask)
                                .option(hard(gasMaskOptional, [gasMask], 4));
const calmedSeaIfRequired   = condition('Calmed sea if required')
                                .option(calmedSea)
                                .option(calmedSeaOptional)

// TODO - warp triggers, wild warp, etc...

////////////////////////////////////////////////////////////////
// Bosses
////////////////////////////////////////////////////////////////

// TODO - .trigger(...) but also allow bossLocation.trigger(...) to only affect after
// the boss is killed...? useful for e.g. eyeGlasses require sabera1 or else palace boss?
const vampire1    = boss(0x00, 'Vampire 1', anySword).get(rabbitBoots);
const giantInsect = boss(0x01, 'Insect', insectFlute, matchInsectSword).get(ballOfFire);
const kelbesque1  = boss(0x02, 'Kelbesque 1', matchSwordOfWind, windMagic).get(flameBracelet);
const vampire2    = boss(0x0c, 'Vampire 2', anySword).get(fruitOfPowerVampire2);
const sabera1     = boss(0x04, 'Sabera 1', matchSwordOfFire, fireMagic).get(brokenStatue);
const mado1       = boss(0x05, 'Mado 1', matchSwordOfWater, waterMagic).get(ballOfThunder);
const kelbesque2  = boss(0x06, 'Kelbesque 2', matchSwordOfWind, windMagic).get(opelStatue);
const sabera2     = boss(0x07, 'Sabera 2', matchSwordOfFire, fireMagic).get(fruitOfRepun);
const mado2       = boss(0x08, 'Mado 2', matchSwordOfWater, waterMagic).get(sacredShield);
const karmine     = boss(0x09, 'Karmine', matchSwordOfThunder, thunderMagic).get(ivoryStatue);
const draygon1    = boss(0x0a, 'Draygon 1', anySword).get(psychoArmor);
const statues     = boss(null, 'Statues', bowOfSun, bowOfMoon);
const draygon2    = boss(0x0b, 'Draygon 2', anySword, bowOfTruth);
const dyna        = boss(0x0d, 'Dyna', crystalis);

////////////////////////////////////////////////////////////////
// Areas
////////////////////////////////////////////////////////////////
const LEAF = area('Leaf');
const VWND = area('Valley of Wind');
const VAMP = area('Sealed Cave');
const CORD = area('Cordel Plain');
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
const HYDR = area('Mt Hydra');
const SHYR = area('Shyron');
const STYX = area('Styx');
const GOA  = area('Goa');
const DRG1 = area('Draygonia Fortress 1');
const DRG2 = area('Draygonia Fortress 2');
const DRG3 = area('Draygonia Fortress 3');
const DRG4 = area('Draygonia Fortress 4');
const OASC = area('Oasis Cave');
const DSRT = area('Desert');
const SHRA = area('Sahara');
const PYRF = area('Pyramid Front');
const PYRB = area('Pyramid Back');
const TOWR = area('Tower');

////////////////////////////////////////////////////////////////
// Location Types
////////////////////////////////////////////////////////////////

const OVERWORLD = 'overworld';
const TOWN = 'town';
const CAVE = 'cave';
const SEA = 'sea';
const HOUSE = 'house';
const MISC = 'misc';

// TODO - consider "domains" where intra-domain entrances are
// not shuffled.  Does not always line up with type changes,
// though we may still want to *preserve* the types.


////////////////////////////////////////////////////////////////
// Locations
////////////////////////////////////////////////////////////////

// Leaf, Valley of Wind, Sealed Cave

const start                 = location(0x00, LEAF, 'Start').overworld().start();
const mezameShrine          = location(0x00, LEAF, 'Mezame Shrine').overworld()
                                .from(start);
const outsideStart          = location(0x01, LEAF, 'Outside Start').overworld()
                                .connect(mezameShrine);
const leaf                  = location(0x02, LEAF, 'Town').town()
                                .connect(outsideStart);
const valleyOfWind          = location(0x03, VWND, 'Main').overworld()
                                .connect(leaf)
                                .trigger(learnedRefresh, startedWindmill);
const outsideWindmill       = location(0x03, VWND, 'Outside Windmill').overworld();
const sealedCave1           = location(0x04, VAMP, 'Tunnel 1 (entrance)').cave()
                                // to(valleyOfWind), // TODO - unglitch
                                .from(valleyOfWind, startedWindmill);
const sealedCave2           = location(0x05, VAMP, 'Tunnel 2 (over bridge)').cave()
                                .connect(sealedCave1);
const sealedCave6           = location(0x06, VAMP, 'Tunnel 6 (herb dead end)').cave()
                                .chest(medicalHerb, 0x0f);
const sealedCave4a          = location(0x07, VAMP, 'Tunnel 4a (ball corridor)').cave()
                                .chest(medicalHerb, 0x14, 0x50)
                                .chest(ballOfWind, 0x15);
const sealedCave4b          = location(0x07, VAMP, 'Tunnel 4b (antidote dead end)').cave()
                                .connect(sealedCave4a, destroyStone) // 64dd:10
                                .chest(antidote, 0x13);
const sealedCave5           = location(0x08, VAMP, 'Tunnel 5 (warp boots dead end)').cave()
                                .chest(warpBoots, 0x0e);
const sealedCave3a          = location(0x09, VAMP, 'Tunnel 3a (branch, front)').cave()
                                .connect(sealedCave2)
                                .connectTo(sealedCave4a)
                                .connectTo(sealedCave5);
const sealedCave3b          = location(0x09, VAMP, 'Tunnel 3b (branch, back)').cave()
                                .connect(sealedCave3a, destroyStone) // 64dd:08
                                .connectTo(sealedCave6);
const sealedCave7           = location(0x0a, VAMP, 'Tunnel 7 (boss)').cave()
                                .connect(sealedCave3b)
                                .boss(vampire1);
const sealedCave8a          = location(0x0c, VAMP, 'Tunnel 8a (exit, above wall)').cave()
                                .connect(sealedCave7);
const sealedCave8b          = location(0x0c, VAMP, 'Tunnel 8b (exit, below wall').cave()
                                .connect(sealedCave8a, destroyStone); // 64d0:10
const windmillCave          = location(0x0e, VWND, 'Windmill Cave').cave()
                                .connect(valleyOfWind)
                                .connectTo(outsideWindmill)
                                .trigger(wokeUpWindmillGuard, alarmFlute, talkedToZebuInCave);
const windmill              = location(0x0f, VWND, 'Windmill').misc()
                                .connect(outsideWindmill)
                                .trigger(startedWindmill, windmillKey);
const zebuCaveFront         = location(0x10, VWND, 'Zebu\'s Cave Front').cave()
                                .connect(valleyOfWind)
                                .trigger(talkedToZebuInCave, talkedToLeafElder, talkedToLeafStudent)
                                .trigger(learnedRefresh, startedWindmill, talkedToZebuInCave);
const zebuCaveBack          = location(0x10, VWND, 'Zebu\'s Cave Back').cave()
                                .trigger(villagersAbducted)
                                .connect(zebuCaveFront, destroyIce);
const mtSabreWestTunnel1    = location(0x11, SBRW, 'Tunnel 1 (to Zebu)').cave()
                                .connect(zebuCaveBack);

// Cordel Plain, Brynmaer, and environs

const cordelPlainWest       = location(0x14, CORD, 'West').overworld()
                                //.connect(zebuCaveBack)
                                .connect(sealedCave8b);
const cordelPlainSouth      = location(0x14, CORD, 'South').overworld()
                                .connect(cordelPlainWest, crossRivers); // 64dd:04
const cordelPlainEast       = location(0x15, CORD, 'East').overworld()
                                .connect(cordelPlainWest)
                                .chest(statueOfOnyx, 0x18);
const brynmaer              = location(0x18, BRYN, 'Town').town()
                                .connect(cordelPlainWest)
                                .trigger(gaveStatueToAkahana, statueOfOnyx);
const outsideStomsHouse     = location(0x19, CORD, 'Outside Stom\'s House').town()
                                .connect(cordelPlainWest);
const swamp                 = location(0x1a, CORD, 'Swamp').overworld()
                                .connect(cordelPlainEast, travelSwamp)
                                .trigger(rescuedOakChild, talkedToOakMother, travelSwamp);
const swampBoss             = location(0x1a, CORD, 'Swamp Insect Area').overworld()
                                .connect(swamp, travelSwamp)
                                .boss(giantInsect);
const amazones              = location(0x1b, AMZN, 'Town').town()
                                .connect(cordelPlainSouth);
const oak                   = location(0x1c, OAK,  'Town').town()
                                .connect(swamp, travelSwamp)
                                .trigger(visitedOak);
const stomsHouse            = location(0x1e, CORD, 'Stom\'s House').house()
                                .connect(outsideStomsHouse)
                                .trigger(foughtStom, visitedOak);

// Mt Sabre West

const mtSabreWestEntrance   = location(0x20, SBRW, 'Entrance').overworld()
                                .connect(cordelPlainWest)
                                .connect(mtSabreWestTunnel1);
const mtSabreWestUpSlope    = location(0x20, SBRW, 'Up Slope').overworld()
                                .from(mtSabreWestEntrance, climbSlopes)
                                .to(mtSabreWestEntrance);
const mtSabreWestDeadEnd    = location(0x20, SBRW, 'Dead End (warp boots)').overworld()
                                .chest(warpBoots, 0x18, 0x6a);
const mtSabreWestUpper      = location(0x21, SBRW, 'Upper').overworld()
                                .from(mtSabreWestEntrance, flight)
                                .to(mtSabreWestEntrance);
const mtSabreWestTornel     = location(0x21, SBRW, 'Tornel Dead End').overworld()
                                .trigger(talkedToTornelOnMtSabre, tornadoBracelet)
                                .chest(magicRing, 0x17, 0x69);
const mtSabreWestTunnel2a   = location(0x22, SBRW, 'Tunnel 2a (fork at start)').cave()
                                .connect(mtSabreWestEntrance);
const mtSabreWestTunnel2b   = location(0x22, SBRW, 'Tunnel 2b (left branch to dead end)')
                                .cave()
                                .connect(mtSabreWestTunnel2a, destroyIce) // 64dd:02
                                .connectTo(mtSabreWestDeadEnd);
const mtSabreWestTunnel2c   = location(0x22, SBRW, 'Tunnel 2c (right branch to upper)')
                                .cave()
                                .connect(mtSabreWestTunnel2a, destroyIce); // 64dd:01
const mtSabreWestTunnel3a   = location(0x23, SBRW, 'Tunnel 3a (tunnel to upper, with herb chest)')
                                .cave()
                                .connect(mtSabreWestTunnel2c)
                                .chest(medicalHerb, 0x17, 0x52);
const mtSabreWestTunnel3b   = location(0x23, SBRW, 'Tunnel 3b (tunnel to upper, branch below ice)')
                                .cave()
                                .connect(mtSabreWestTunnel3a, destroyIce) // 64dc:80
                                .connectTo(mtSabreWestUpper);
const mtSabreWestTunnel4a   = location(0x24, SBRW, 'Tunnel 4a (branch to upper or Tornel)')
                                .cave()
                                .connect(mtSabreWestTunnel3b);
const mtSabreWestTunnel4b   = location(0x24, SBRW, 'Tunnel 4b (out to upper)').cave()
                                .connect(mtSabreWestTunnel4a, destroyIce) // 64dc:40
                                .connectTo(mtSabreWestUpper);
const mtSabreWestTunnel5    = location(0x25, SBRW, 'Tunnel 5 (tiny connector)').cave()
                                .connect(mtSabreWestTunnel4a);
const mtSabreWestTunnel6a   = location(0x26, SBRW, 'Tunnel 6a (exit to Tornel, above ice)')
                                .cave()
                                .connect(mtSabreWestTunnel5);
const mtSabreWestTunnel6b   = location(0x26, SBRW, 'Tunnel 6b (exit to Tornel, below ice)')
                                .cave()
                                .connect(mtSabreWestTunnel6a, destroyIce) // 64dc:20
                                .connectTo(mtSabreWestTornel);
const mtSabreWestTunnel7a   = location(0x27, SBRW, 'Tunnel 7a (tornado bracelet, lower)')
                                .cave()
                                .connect(mtSabreWestUpSlope);
const mtSabreWestTunnel7b   = location(0x27, SBRW, 'Tunnel 7b (tornado bracelet, middle)')
                                .cave()
                                .connect(mtSabreWestTunnel7a, destroyIce); // 64dc:10
const mtSabreWestTunnel7c   = location(0x27, SBRW, 'Tunnel 7c (tornado bracelet, upper)')
                                .cave()
                                .connect(mtSabreWestTunnel7b, destroyIce) // 64dc:08
                                .chest(tornadoBracelet, 0x19);

// Mt Sabre North

// TODO - teleport trigger is on cordel side - when we start randomizing exits
// we need to get that right, might want to add two extra locations for after
// the trigger.
const mtSabreNorthEntrance  = location(0x28, SBRN, 'Entrance').overworld()
                                .connect(cordelPlainEast, teleport, enterMtSabreNorth);
const mtSabreNorthUpper     = location(0x28, SBRN, 'Upper').overworld()
                                .from(mtSabreNorthEntrance, flight)
                                .to(mtSabreNorthEntrance);
const mtSabreNorthSummit    = location(0x28, SBRN, 'Summit (boss)').overworld()
                                .from(mtSabreNorthUpper, flight)
                                .to(mtSabreNorthUpper)
                                .boss(kelbesque1);
const mtSabreNorthConnector = location(0x29, SBRN, 'Connector').overworld();
const mtSabreNorthMidLeft   = location(0x29, SBRN, 'Middle Left').overworld();
const mtSabreNorthMidRight  = location(0x29, SBRN, 'Middle Right').overworld()
                                .from(mtSabreNorthMidLeft, climbSlopes)
                                .to(mtSabreNorthMidLeft);
const mtSabreNorthTunnel2a  = location(0x2a, SBRN, 'Tunnel 2a (from entrance to connector)')
                                .cave()
                                .connectTo(mtSabreNorthConnector);
const mtSabreNorthTunnel2b  = location(0x2a, SBRN, 'Tunnel 2b (under bridge, to antidote)')
                                .cave()
                                .connect(mtSabreNorthTunnel2a, destroyIce) // 64dc:04
                                .chest(antidote, 0x17, 0x5e);
const mtSabreNorthTunnel3a  = location(0x2b, SBRN, 'Tunnel 3a (branch after connector)')
                                .cave()
                                .connect(mtSabreNorthConnector);
const mtSabreNorthTunnel3b  = location(0x2b, SBRN, 'Tunnel 3b (right branch)').cave()
                                .connect(mtSabreNorthTunnel3a, destroyIce); // 64dc:02
const mtSabreNorthTunnel3c  = location(0x2b, SBRN, 'Tunnel 3c (upper branch)').cave()
                                .connect(mtSabreNorthTunnel3a, destroyIce); // 64dc:01
const mtSabreNorthTunnel4   = location(0x2c, SBRN, 'Tunnel 4 (over bridge, to middle)')
                                .cave()
                                .connect(mtSabreNorthTunnel3c)
                                .connectTo(mtSabreNorthMidLeft);
const mtSabreNorthTunnel5a  = location(0x2d, SBRN, 'Tunnel 5a (E-shaped, from right branch)')
                                .cave()
                                .connect(mtSabreNorthTunnel3b)
                                .connectTo(mtSabreNorthMidRight);
const mtSabreNorthTunnel5b  = location(0x2d, SBRN, 'Tunnel 5b (dead-end with herb)')
                                .cave()
                                .connect(mtSabreNorthTunnel5a, destroyIce) // 64db:80
                                .chest(medicalHerb, 0x16, 0x53);
const mtSabreNorthTunnel6a  = location(0x2e, SBRN, 'Tunne; 6a (S-shaped hall, right)')
                                .cave()
                                .connect(mtSabreNorthTunnel5a);
const mtSabreNorthTunnel6b  = location(0x2e, SBRN, 'Tunne; 6b (S-shaped hall, middle)')
                                .cave()
                                .connect(mtSabreNorthTunnel6a, destroyIce); // 64db:20
const mtSabreNorthTunnel6c  = location(0x2e, SBRN, 'Tunnel 6c (S-shaped hall, left)')
                                .cave()
                                .connect(mtSabreNorthTunnel6b, destroyIce); // 64db:40
// NOTE: the following four ice walls are problematic for bacsktracking.
// We may want to put in place something to destroy them if coming in at that entrance,
// or to enter lower if the wall is intact.  We could even iterate over the objects and
// detect the wall at the current coordinates?  Or reject the transition?  These are not
// important reverse paths, so we just remove them from the graph for now.
const mtSabreNorthPrison    = location(0x2f, SBRN, 'Prison (hallway)').cave()
                                .connect(mtSabreNorthUpper);
const mtSabreNorthLeftCell  = location(0x30, SBRN, 'Left Cell (shopkeepers)').cave()
                                .from(mtSabreNorthPrison, destroyIce); // 64db:08
const mtSabreNorthLeftCell2 = location(0x31, SBRN, 'Left Cell 2 (back, with prison key)')
                                .cave()
                                .from(mtSabreNorthLeftCell, destroyIce) // 64db:04
                                .chest(keyToPrison, 0x0d);
const mtSabreNorthRightCell = location(0x32, SBRN, 'Right Cell (villagers)').cave()
                                .from(mtSabreNorthPrison, destroyIce); // 64db:10
const mtSabreNorthTunnel8   = location(0x33, SBRN, 'Tunnel 8 (behind right cell, toward summit)')
                                .cave()
                                .from(mtSabreNorthRightCell, destroyIce); // 64db:02
const mtSabreNorthTunnel9   = location(0x34, SBRN, 'Tunnel 9 (connector to summit)')
                                .cave()
                                .connect(mtSabreNorthTunnel8)
                                .connectTo(mtSabreNorthSummit);
const mtSabreNorthTunnel10a = location(0x35, SBRN, 'Tunnel 10a (summit cave, front)')
                                .cave()
                                .from(mtSabreNorthSummit, keyToPrison)
                                .to(mtSabreNorthSummit);
const mtSabreNorthTunnel10b = location(0x35, SBRN, 'Tunnel 10b (summit cave, behind ice)')
                                .cave()
                                .connect(mtSabreNorthTunnel10a, destroyIce) // 64da:80
                                // TODO - adjust the triggers so that learning
                                // paralysis requires opening the prison door
                                // (and killing kelbesque 1 unless wild warp)
                                .trigger(learnedParalysis);
const mtSabreNorthTunnel1   = location(0x38, SBRN, 'Tunnel 1 (leads from main entrance)')
                                .cave()
                                .connect(mtSabreNorthEntrance)
                                .connectTo(mtSabreNorthTunnel2a);
const mtSabreNorthTunnel7   = location(0x39, SBRN, 'Tunnel 7 (to upper)').cave()
                                .connect(mtSabreNorthTunnel6c)
                                .connectTo(mtSabreNorthUpper);

const nadareInn             = location(0x3c, NADR, 'Inn').town();
const nadareToolShop        = location(0x3d, NADR, 'Tool Shop').house();
const nadareBackRoom        = location(0x3e, NADR, 'Back Room').house();

// Waterfall Valley

const waterfallValleySummit = location(0x40, WFVL, 'Summit').overworld()
                                .connect(mtSabreNorthTunnel10b);
const waterfallValleyNW     = location(0x40, WFVL, 'Northwest').overworld()
                                .from(waterfallValleySummit)
                                .to(waterfallValleySummit, flight);
const waterfallValleyNE     = location(0x40, WFVL, 'Northeast').overworld()
                                .connect(waterfallValleyNW, crossRivers);
const waterfallValleySW     = location(0x41, WFVL, 'Southwest').overworld()
                                .connect(waterfallValleyNW);
const waterfallValleySE     = location(0x41, WFVL, 'Southeast').overworld()
                                .connect(waterfallValleySW, crossRivers);
const limeTreeValley        = location(0x42, WFVL, 'Lime Tree Valley').overworld()
                                .connect(waterfallValleySW)
                                .connect(valleyOfWind, limeTreeConnectsToLeaf);
const limeTreeLake          = location(0x43, WFVL, 'Lime Tree Lake (Rage)').cave()
                                .connect(limeTreeValley)
                                .trigger(talkedToRage, swordOfWater);

// Kirisa Plant Cave

const kirisaCave1a          = location(0x44, KIRI, 'Tunnel 1a (entrance)').cave()
                                .connect(waterfallValleySE);
const kirisaCave1b          = location(0x44, KIRI, 'Tunnel 1b (behind wall)').cave()
                                .connect(kirisaCave1a, destroyStone); // 64d8:02
const kirisaCave2a          = location(0x45, KIRI, 'Tunnel 2a (main path, before wall)')
                                .cave()
                                .connect(kirisaCave1b);
const kirisaCave2b          = location(0x45, KIRI, 'Tunnel 2b (dead end, antidote)')
                                .cave()
                                .connect(kirisaCave2a, destroyStone) // 64d8:01
                                .chest(antidote, 0x19, 0x5f);
const kirisaCave2c          = location(0x45, KIRI, 'Tunnel 2c (main path, after wall)')
                                .cave()
                                .connect(kirisaCave2a, destroyStone); // 64d7:80
const kirisaCave3a          = location(0x46, KIRI, 'Tunnel 3a (last room, before wall)')
                                .cave()
                                .connect(kirisaCave2c);
const kirisaCave3b          = location(0x46, KIRI, 'Tunnel 3b (last room, after wall)')
                                .cave()
                                .connect(kirisaCave3a, destroyStone); // 64d0:40
const kirisaMeadow          = location(0x47, KIRI, 'Meadow').overworld()
                                .connect(kirisaCave3b)
                                .chest(kirisaPlant, 0x0e);

// Fog Lamp Cave

const fogLampCave1a         = location(0x48, FOGL, 'Tunnel 1a (entrance)').cave()
                                .connect(waterfallValleyNE);
const fogLampCave1b         = location(0x48, FOGL, 'Tunnel 1b (past wall)').cave()
                                .connect(fogLampCave1a, destroyStone); // 64d9:10
const fogLampCave1c         = location(0x48, FOGL, 'Tunnel 1c (dead end, lysisPlant)')
                                .cave()
                                .connect(fogLampCave1b, destroyStone) // 64d9:20
                                .chest(lysisPlant, 0x18);
const fogLampCave2          = location(0x49, FOGL, 'Tunnel 2 (tiny connector)').cave()
                                .connect(fogLampCave1b);
const fogLampCave3a         = location(0x4a, FOGL, 'Tunnel 3a (upper branch)').cave()
                                .connect(fogLampCave2);
const fogLampCave3b         = location(0x4a, FOGL, 'Tunnel 3b (dead end, mimic)').cave()
                                .connect(fogLampCave3a, destroyStone) // 64d9:01
                                .chest(mimic, 0x15, 0x70);
const fogLampCave3c         = location(0x4a, FOGL, 'Tunnel 3c (short passage with mimic)')
                                .cave()
                                .connect(fogLampCave3a, destroyStone) // 64d9:02
                                .chest(mimic, 0x16, 0x71);
const fogLampCave3d         = location(0x4a, FOGL, 'Tunnel 3d (lower branch)').cave()
                                .connect(fogLampCave3c, destroyStone); // 64d9:04
const fogLampCave4          = location(0x4b, FOGL, 'Tunnel 4 (dead end loop)').cave()
                                .connect(fogLampCave3d); // pointless 64d9:08
const fogLampCave5a         = location(0x4c, FOGL, 'Tunnel 5a (right branch over bridge)')
                                .cave()
                                .connect(fogLampCave3c);
const fogLampCave5b         = location(0x4c, FOGL, 'Tunnel 5b (past wall over bridge)')
                                .cave()
                                .connect(fogLampCave5a, destroyStone); // 64d8:80
const fogLampCave6a         = location(0x4d, FOGL, 'Tunnel 6a (from left branch)').cave()
                                .connect(fogLampCave5a);
const fogLampCave6b         = location(0x4d, FOGL, 'Tunnel 6b (reconvergence)').cave()
                                .connect(fogLampCave6a, destroyStone) // 64d8:10
                                .connect(fogLampCave5b);
const fogLampCave6c         = location(0x4d, FOGL, 'Tunnel 6c (between walls)').cave()
                                .connect(fogLampCave6b, destroyStone); // 64d8:20
const fogLampCave6d         = location(0x4d, FOGL, 'Tunnel 6d (under bridge)').cave()
                                .connect(fogLampCave6c, destroyStone); // 64d8:40
const fogLampCave7a         = location(0x4e, FOGL, 'Tunnel 7a (over second bridge)')
                                .cave()
                                .connect(fogLampCave6d);
const fogLampCave7b         = location(0x4e, FOGL, 'Tunnel 7b (past wall)').cave()
                                .connect(fogLampCave7a, destroyStone); // 64d8:08
const fogLampCave8a         = location(0x4f, FOGL, 'Tunnel 8a (under second bridge)')
                                .cave()
                                .connect(fogLampCave7b);
const fogLampCave8b         = location(0x4f, FOGL, 'Tunnel 8b (fog lamp)').cave()
                                .connect(fogLampCave8a, destroyStone) // 64d8:04
                                .chest(fogLamp, 0x13);

// Portoa, Mesia

const portoa                = location(0x50, PORT, 'Town').town()
                                .connect(waterfallValleyNW);
const portoaFishermanIsland = location(0x51, PORT, 'Fishherman Island').town()
                                .connect(portoa);
const mesiaShrine           = location(0x52, WFVL, 'Mesia Shrine').cave()
                                // TODO - consider adding an item here?
                                .trigger(mesiaRecording)
                                .connect(limeTreeLake, crossRivers, talkedToRage); // 64d9:40

// Waterfall Cave

const waterfallCave1a       = location(0x54, WFCV, 'Tunnel 1a (entrance)').cave()
                                .connect(waterfallValleyNW);
const waterfallCave1b       = location(0x54, WFCV, 'Tunnel 1b (dead end, mimic)').cave()
                                .connect(waterfallCave1a, destroyIce) // 64da:10 or :08
                                .chest(mimic, 0x13, 0x72);
const waterfallCave1c       = location(0x54, WFCV, 'Tunnel 1c (past ice)').cave()
                                .connect(waterfallCave1a, destroyIce); // 64da:04
const waterfallCave2        = location(0x55, WFCV, 'Tunnel 2 (stoned pair)').cave()
                                .connect(waterfallCave1c);
const waterfallCave3        = location(0x56, WFCV, 'Tunnel 3 (wide medusa hallways)').cave()
                                .from(waterfallCave2, fluteOfLimeOrGlitch)
                                .to(waterfallCave2, fluteOfLimeQueen);
// NOTE: no reverse path thru these ice walls - will soft lock!
const waterfallCave4a       = location(0x57, WFCV, 'Tunnel 4a (left entrance)').cave()
                                .from(waterfallCave3, destroyIce)
                                .chest(fluteOfLimeChest, 0x19)
                                .trigger(curedAkahana, secondFluteOfLime); // $64da:02
const waterfallCave4b       = location(0x57, WFCV, 'Tunnel 4b (right entrance)').cave()
                                .from(waterfallCave3, destroyIce) // $64da:01
                                .connect(waterfallCave4a, flight);
const waterfallCave4c       = location(0x57, WFCV, 'Tunnel 4c (sword of water)').cave()
                                .connect(waterfallCave3, destroyIce) // $64d9:80
                                .chest(swordOfWater, 0x18);

// Tower

const towerEntrance         = location(0x58, TOWR, 'Entrance').misc();
const tower1                = location(0x59, TOWR, 'Level 1').misc()
                                .from(towerEntrance);
const tower2                = location(0x5a, TOWR, 'Level 2').misc()
                                .from(tower1);
const tower3                = location(0x5b, TOWR, 'Level 3').misc()
                                .from(tower2);
const tower4                = location(0x5c, TOWR, 'Outside Mesia Room').misc()
                                .from(tower3);
const tower5                = location(0x5d, TOWR, 'Outside Dyna Room').misc()
                                .from(tower4, crystalis);
const towerMesia            = location(0x5e, TOWR, 'Mesia').misc()
                                .connect(tower4)
                                .trigger(forgedCrystalis);
const towerDyna             = location(0x5f, TOWR, 'Dyna').misc()
                                .from(tower5)
                                .boss(dyna);
const win                   = location(0x5f, TOWR, 'Win').misc()
                                .from(towerDyna)
                                .end();

// Angry Sea

const angrySeaCabinBeach    = location(0x60, ASEA, 'Cabin Beach').sea()
                                .from(portoaFishermanIsland, returnedFogLamp);
const angrySeaSouth         = location(0x60, ASEA, 'South').sea()
                                .connect(angrySeaCabinBeach, crossSea);
const angrySeaJoelBeach     = location(0x60, ASEA, 'Joel Beach').sea()
                                .connect(angrySeaSouth, crossSea);
const angrySeaLighthouse    = location(0x60, JOEL, 'Outside Lighthouse').sea();
const angrySeaAltar         = location(0x60, ASEA, 'Altar').sea()
                                .connect(angrySeaSouth, crossSea)
                                // .trigger(repairBrokenStatue, glowingLamp, brokenStatue)
                                // NOTE: this *should* be statue of gold,
                                // but since we don't shuffle that we leave
                                // it as the components.
                                .trigger(calmedSea, glowingLamp, brokenStatue);
const angrySeaNorth         = location(0x60, ASEA, 'North').sea()
                                .to(angrySeaSouth, crossSea)
                                .from(angrySeaSouth, crossSea, crossWhirlpool)
                                // NOTE: calmedSea is not normally a requirement.
                                .trigger(learnedBarrier, calmedSeaIfRequired);
const angrySeaSwanBeach     = location(0x60, ASEA, 'Swan Beach').sea()
                                .connect(angrySeaNorth, crossSea);
const angrySeaCabin         = location(0x61, ASEA, 'Cabin').misc()
                                .connect(angrySeaCabinBeach)
                                // TODO - only have kensu appear after heal and/or boat?
                                .trigger(talkedToKensuInCabin, returnedFogLamp);
const lighthouse            = location(0x62, JOEL, 'Lighthouse').misc()
                                .connect(angrySeaLighthouse)
                                .trigger(talkedToKensuInLighthouse, alarmFlute);
const undergroundChannel1   = location(0x64, PORT, 'Underground Channel 1 (from throne room)')
                                .sea()
                                .trigger(visitedUndergroundChannel);
const undergroundChannel2   = location(0x64, PORT, 'Underground Channel 2 (to fortune teller)')
                                .sea()
                                .connect(undergroundChannel1, crossRivers); // 64d7:40
const undergroundChannel3   = location(0x64, PORT, 'Underground Channel 3 (from fortune teller)')
                                .sea()
                                .connect(undergroundChannel1, flight);
const undergroundChannel4   = location(0x64, PORT, 'Underground Channel 4 (asina)').sea()
                                .connect(undergroundChannel3, crossRivers); // 64d7:20
const undergroundChannel5   = location(0x64, PORT, 'Underground Channel 5 (dolphin)').sea()
                                .connect(undergroundChannel4, crossRivers) // 64d7:10
                                .trigger(healedDolphin, medicalHerb, ballOfWater);
const undergroundChannel6   = location(0x64, PORT, 'Underground Channel 6 (water)').sea()
                                .connect(undergroundChannel5, crossSea)
                                .connectTo(angrySeaSouth, crossSea)
                                .chest(lovePendant, 0x11);

// Evil Spirit Island

const zombieTown            = location(0x65, EVIL, 'Zombie Town').town();
const evilSpiritIsland1     = location(0x68, EVIL, 'Tunnel 1 (entrance)').sea()
                                .connect(angrySeaSouth, talkedToJoelElder, crossSea);
const evilSpiritIsland2a    = location(0x69, EVIL, 'Tunnel 2a (start)').cave()
                                .connect(evilSpiritIsland1);
const evilSpiritIsland2b    = location(0x69, EVIL, 'Tunnel 2b (dead end to left)').cave()
                                .connect(evilSpiritIsland2a, crossRivers); // 2b9
const evilSpiritIsland2c    = location(0x69, EVIL, 'Tunnel 2c (across first river)').cave()
                                .connect(evilSpiritIsland2a, crossRivers); // 2b8
const evilSpiritIsland2d    = location(0x69, EVIL, 'Tunnel 2d (across second river)').cave()
                                .connect(evilSpiritIsland2c, crossRivers); // 2b7
const evilSpiritIsland2e    = location(0x69, EVIL, 'Tunnel 2e (dead end, magic ring)').cave()
                                .connect(evilSpiritIsland2d, destroyStone) // 2ba
                                .chest(magicRing, 0x1d);
const evilSpiritIsland2f    = location(0x69, EVIL, 'Tunnel 2f (stair down)').cave()
                                .connect(evilSpiritIsland2d, destroyStone); // 2bb
const evilSpiritIsland3a    = location(0x6a, EVIL, 'Tunnel 3a (main area)').cave()
                                // unnecessary wall 2b5
                                .connect(evilSpiritIsland2f)
                                .connectTo(zombieTown)
                                .chest(lysisPlant, 0x19, 0x5c);
const evilSpiritIsland3b    = location(0x6a, EVIL, 'Tunnel 3b (left area toward items)').cave()
                                .connect(evilSpiritIsland3a, destroyStone); // 2b6
const evilSpiritIsland4a    = location(0x6b, EVIL, 'Tunnel 4a (right side, mimic)').cave()
                                // TODO - model pits?
                                // If we want to model the full path including backtracks
                                // then we'll need to add triggers for backtracking through
                                // one-way passages.
                                .connect(evilSpiritIsland3b)
                                .chest(mimic, 0x0e, 0x73);
const evilSpiritIsland4b    = location(0x6b, EVIL, 'Tunnel 4b (left side, iron necklace)').cave()
                                .connect(evilSpiritIsland4a, crossRivers) // 285
                                .chest(ironNecklace, 0x0f); // 0f: 2c

// Sabera's Palace

const saberaPalaceFloor1    = location(0x6c, SABR, 'Floor 1').fortress()
                                .connect(zombieTown);
const saberaPalaceMiniboss  = location(0x6c, SABR, 'Miniboss').fortress()
                                .boss(vampire2)
                                .connect(saberaPalaceFloor1);
const saberaPalaceFloor2a   = location(0x6d, SABR, 'Floor 2a (left stair)').fortress()
                                .connect(saberaPalaceFloor1)
                                .chest(fruitOfPower, 0x13);
const saberaPalaceFloor2b   = location(0x6d, SABR, 'Floor 2b (right stair)').fortress()
                                .connect(saberaPalaceMiniboss)
                                .chest(medicalHerb, 0x1e, 0x55);
const saberaPalaceFloor3a   = location(0x6e, SABR, 'Floor 3a (toward boss)').fortress()
                                .connect(saberaPalaceFloor2b);
const saberaPalaceFloor3b   = location(0x6e, SABR, 'Floor 3b (boss room)').fortress()
                                .connect(saberaPalaceFloor3a);
const saberaPalaceBoss      = location(0x6e, SABR, 'Boss').fortress()
                                .boss(sabera1)
                                .connect(saberaPalaceFloor3b);
const saberaPalaceFloor3c   = location(0x6e, SABR, 'Floor 3c (back room trap)').fortress()
                                .from(saberaPalaceFloor3b)
                                .to(saberaPalaceFloor1);

// Misc

const joelSecretPassage     = location(0x70, JOEL, 'Secret Passage').cave()
                                .connectTo(angrySeaLighthouse);
const joel                  = location(0x71, JOEL, 'Town').town()
                                .connect(angrySeaJoelBeach);
const swan                  = location(0x72, SWAN, 'Town').town()
                                .connect(angrySeaSwanBeach);
const swanGateRight         = location(0x73, SWAN, 'Inside Gate').overworld()
                                .connect(swan);
const swanGateLeft          = location(0x73, SWAN, 'Outside Gate').overworld()
                                // TODO - consider allowing gate to open both sides?
                                .from(swanGateRight, change);
const goaValley             = location(0x78, GOA,  'Valley').overworld()
                                .connect(swanGateLeft);

// Mt Hydra

const mtHydra1              = location(0x7c, HYDR, 'Entrance').overworld()
                                .connect(goaValley);
const mtHydra2              = location(0x7c, HYDR, 'Over first river toward Shyron').overworld()
                                .connect(mtHydra1, crossRivers); // 2b2
const mtHydra3              = location(0x7c, HYDR, 'After first tunnel').overworld();
const mtHydra4              = location(0x7c, HYDR, 'Door to Styx').overworld()
                                .connect(mtHydra3, crossRivers); // 2b1
const mtHydra5              = location(0x7c, HYDR, 'Dead end (no item)').overworld();
const mtHydra6              = location(0x7c, HYDR, 'Dead end (fruit of lime)').overworld()
                                .chest(fruitOfLime, 0x1a);
const mtHydra7              = location(0x7c, HYDR, 'Dead end (magic ring)').overworld()
                                .chest(magicRing, 0x19, 0x65);
const mtHydra8              = location(0x7c, HYDR, 'Outside tunnel to bow').overworld();
const mtHydra9              = location(0x7c, HYDR, 'Floating island (bow of sun)').overworld()
                                .connect(mtHydra8, flight)
                                .chest(bowOfSun, 0x18);
const mtHydraTunnel1        = location(0x7d, HYDR, 'Tunnel 1 (to Shyron)').cave()
                                .connect(mtHydra2);
const mtHydraOutsideShyron  = location(0x7e, HYDR, 'Outside Shyron').overworld()
                                .connect(mtHydraTunnel1);
const mtHydraTunnel2        = location(0x7f, HYDR, 'Tunnel 2 (fork)').cave()
                                .connect(mtHydra1)
                                .connectTo(mtHydra6) // right branch
                                .connectTo(mtHydra3); // left branch
const mtHydraTunnel3        = location(0x80, HYDR, 'Tunnel 3 (caves)').cave()
                                .connect(mtHydra4)  // entrance
                                .connect(mtHydra5); // all the way right
const mtHydraTunnel4        = location(0x81, HYDR, 'Tunnel 4 (left branch of cave)').cave()
                                .connect(mtHydraTunnel3); // took left branch
const mtHydraTunnel5        = location(0x82, HYDR, 'Tunnel 5 (dead end, medical herb)').cave()
                                .connect(mtHydraTunnel4) // took left branch again
                                .chest(medicalHerb, 0x0f, 0x56);
const mtHydraTunnel6a       = location(0x83, HYDR, 'Tunnel 6a (left-then-right)').cave()
                                .connect(mtHydraTunnel4); // took right branch
const mtHydraTunnel6b       = location(0x83, HYDR, 'Tunnel 6b (past wall)').cave()
                                .connect(mtHydraTunnel6a, destroyStone); // 2af
const mtHydraTunnel7        = location(0x84, HYDR, 'Tunnel 7 (wide hall)').cave()
                                .connect(mtHydraTunnel6b);
const mtHydraTunnel8        = location(0x85, HYDR, 'Tunnel 8 (red slimes)').cave()
                                .from(mtHydraTunnel7, destroyStone) // 2ae (bad)
                                .connectTo(mtHydra8)
                                .chest(mimic, 0x17, 0x74);
const mtHydraTunnel9        = location(0x86, HYDR, 'Tunnel 9 (right branch, infinite loop)').cave()
                                // non-blocking wall: 2ad
                                .connect(mtHydraTunnel3);
const mtHydraTunnel10a      = location(0x87, HYDR, 'Tunnel 10a (toward magic ring)').cave()
                                .connect(mtHydraTunnel9);
const mtHydraTunnel10b      = location(0x87, HYDR, 'Tunnel 10b (past wall)').cave()
                                .connect(mtHydraTunnel10a, destroyStone) // 2ac
                                .connectTo(mtHydra7);

// Styx

const styx1                 = location(0x88, STYX, 'Entrance').fortress()
                                .from(mtHydra4, keyToStyx, passShootingStatues); // TODO - two-way?
const styx2a                = location(0x89, STYX, 'Left branch').fortress()
                                .connect(styx1)
                                .chest(mimic, 0x13, 0x75);
const styx2b                = location(0x89, STYX, 'Left branch, past one bridge').fortress()
                                .connect(styx2a, crossRivers); // 2aa
const styx2c                = location(0x89, STYX, 'Left branch, past two bridges').fortress()
                                .connect(styx2b, crossRivers) // 2a9
                                .chest(medicalHerb, 0x1d, 0x57);
const styx2d                = location(0x89, STYX, 'Right branch').fortress()
                                .connect(styx1);
const styx2e                = location(0x89, STYX, 'Right branch, across water').fortress()
                                .connect(styx2d, flight)
                                .chest(mimic, 0x14, 0x76)
                                .chest(mimic, 0x15, 0x77)
                                .chest(psychoShield, 0x1c);
const styx3                 = location(0x8a, STYX, 'Upper floor').fortress()
                                // pit to styx2a
                                .connect(styx2c)
                                .chest(swordOfThunder, 0x1b);

// Misc

const shyron                = location(0x8c, SHYR, 'Town').town()
                                .connect(mtHydraOutsideShyron, changeOrGlitch)
                                .trigger(enteredShyron);
const goa                   = location(0x8e, GOA,  'Town').town()
                                .connect(goaValley);
const fortressBasement1     = location(0x8f, OASC, 'Draygonia Fortress Basement 1 (front)')
                                .fortress();
const fortressBasement2     = location(0x8f, OASC, 'Draygonia Fortress Basement 2 (power ring)')
                                .fortress()
                                .connect(fortressBasement1, destroyIron) // 290
                                .chest(powerRing, 0x0f);
const desert1               = location(0x90, GOA,  'Desert 1').overworld()
                                .connect(goaValley);

// Oasis Cave

const oasisCave1            = location(0x91, OASC, 'Area 1 (from entrance)').cave()
                                .chest(leatherBoots, 0x1a);
const oasisCave2            = location(0x91, OASC, 'Area 2 (across top bridge)').cave()
                                .connect(oasisCave1, crossRivers); // 29b
const oasisCave3            = location(0x91, OASC, 'Area 3 (dead-end across top-right bridge)').cave()
                                .connect(oasisCave2, crossRivers); // 293
const oasisCave4            = location(0x91, OASC, 'Area 4 (left across middle-right bridge)').cave()
                                .connect(oasisCave2, crossRivers); // 292
const oasisCave5            = location(0x91, OASC, 'Area 5 (bottom edge)').cave()
                                .connect(oasisCave4, crossRivers); // 291
const oasisCave6            = location(0x91, OASC, 'Area 6 (bottom island)').cave()
                                .connect(oasisCave5, crossRivers); // 295
const oasisCave7            = location(0x91, OASC, 'Area 7 (bottom inner ring)').cave()
                                .connect(oasisCave6, crossRivers); // 296
const oasisCave8            = location(0x91, OASC, 'Area 8 (left outer ring)').cave()
                                .connect(oasisCave7, crossRivers) // 298
                                .connect(oasisCave1, crossRivers) // 29a
                                .chest(fruitOfPower, 0x1b, 0x64);
const oasisCave9            = location(0x91, OASC, 'Area 9 (top left inner ring)').cave()
                                .connect(oasisCave8, crossRivers); // 299
const oasisCave10           = location(0x91, OASC, 'Area 10 (top right inner ring)').cave()
                                .connect(oasisCave9, crossRivers); // 297
const oasisCave11           = location(0x91, OASC, 'Area 11 (center)').cave()
                                .connect(oasisCave10, crossRivers) // 294
                                .connectTo(fortressBasement1);
const oasisCave12           = location(0x91, OASC, 'Area 12 (top center islands)').cave()
                                .connect(oasisCave1, flight)
                                .chest(battleSuit, 0x1c);

// Desert

const desertCave1           = location(0x92, SHRA, 'Desert Cave 1').cave()
                                .connect(desert1, flight);
const sahara                = location(0x93, SHRA, 'Town').town();
const saharaOutsideCave     = location(0x94, SHRA, 'Outside Cave').overworld()
                                .connect(sahara);
const desertCave2           = location(0x95, SHRA, 'Desert Cave 2').cave()
                                .connect(saharaOutsideCave);
const saharaMeadow          = location(0x96, SHRA, 'Meadow').overworld()
                                .connect(desertCave1)
                                .connectTo(sahara)
                                .trigger(talkedToDeo, change, telepathy);
const desert2               = location(0x98, SHRA, 'Desert 2').overworld()
                                .connect(desertCave2);

// Pyramid Front

const pyramidFrontEntrance  = location(0x9c, PYRF, 'Entrance').fortress()
                                .connect(desert2, flight);
const pyramidFrontAzteca    = location(0x9c, PYRF, 'Azteca').fortress()
                                .trigger(getBowOfTruth);
const pyramidFrontFork      = location(0x9d, PYRF, 'Fork').fortress()
                                .connect(pyramidFrontEntrance);
const pyramidFrontMain      = location(0x9e, PYRF, 'Main').fortress()
                                .connect(pyramidFrontFork);
const pyramidFrontChest     = location(0x9e, PYRF, 'Treasure Chest (magic ring)').fortress()
                                .connect(pyramidFrontMain)
                                .chest(magicRing, 0x1b, 0x6c);
const pyramidFrontDraygon   = location(0x9f, PYRF, 'Draygon').fortress()
                                .connect(pyramidFrontMain)
                                .to(pyramidFrontAzteca)
                                .boss(draygon1);

// Pyramid Back

                              // NOTE: treating as fortress is questionable, since there
                              // is no other overworld-down-to-fortress connection.
                              // There aren't really any down-to-cave connections, either
                              // so this is just a tough entrance to randomize.
const pyramidBackEntrance   = location(0xa0, PYRB, 'Entrance').fortress()
                                .connect(desert2, flight);
const pyramidBackStatues    = location(0xa0, PYRB, 'Statues').fortress()
                                .connect(pyramidBackEntrance)
                                .boss(statues);
const pyramidBackHall1      = location(0xa1, PYRB, 'Hall 1').fortress()
                                .connect(pyramidBackStatues);
const pyramidBackFork       = location(0xa2, PYRB, 'Branch').fortress()
                                .connect(pyramidBackHall1);
const pyramidBackLeft       = location(0xa3, PYRB, 'Left Dead End').fortress()
                                .connect(pyramidBackFork)
                                .chest(mimic, 0x0d, 0x78);
const pyramidBackRight      = location(0xa4, PYRB, 'Right Dead End').fortress()
                                .connect(pyramidBackFork);
const pyramidBackHall2      = location(0xa5, PYRB, 'Hall 2').fortress()
                                .connect(pyramidBackFork)
                                .chest(opelStatue, 0x1a, 0x6d);
const pyramidBackDraygon2   = location(0xa6, PYRB, 'Draygon 2').fortress()
                                .connect(pyramidBackHall2)
                                .boss(draygon2);
const pyramidBackTeleporter = location(0xa7, PYRB, 'Teleporter').fortress()
                                .from(pyramidBackDraygon2)
                                .to(towerEntrance);

// Draygonia Fortress

const fortressEntrance      = location(0xa8, DRG1, 'Entrance').fortress()
                                .connect(goa, passShootingStatues)
                                // TODO - need to add talkedToZebuInShyron
                                .trigger(shyronMassacre, swordOfThunder);
const fortress1a            = location(0xa9, DRG1, 'Main').fortress()
                                .from(fortressEntrance, destroyIron); // 2a8
const fortress1Boss         = location(0xa9, DRG1, 'Boss').fortress()
                                .connect(fortress1a)
                                .boss(kelbesque2);
const fortressZebu          = location(0xaa, DRG1, 'Zebu').fortress()
                                .connect(fortress1Boss);
const fortress2a            = location(0xab, DRG2, 'Entrance').fortress()
                                .connect(fortressZebu);
const fortress2b            = location(0xab, DRG2, 'Dead End Behind Iron (fruit of power)')
                                .fortress()
                                .connect(fortress2a, destroyIron) // 13, 29f
                                .chest(fruitOfPower, 0x1c, 0x62);
const fortress2c            = location(0xab, DRG2, 'Dead End Loop Across Closer Bridges')
                                .fortress()
                                .connect(fortress2a, crossRivers) // 19, 2a6
                                .connect(fortress2a, crossRivers); // 1b, 2a0
const fortress2d            = location(0xab, DRG2, 'Across First Bridge (fruit of repun)')
                                .fortress()
                                .connect(fortress2a, crossRivers) // 1a, 2a5
                                .chest(fruitOfRepun, 0x1e, 0x66);
const fortress2e            = location(0xab, DRG2, 'Across Second Bridge').fortress()
                                .connect(fortress2d, crossRivers); // 18, 2a4
const fortress2f            = location(0xab, DRG2, 'Dead End Across Two Bridges ()').fortress()
                                .connect(fortress2e, crossRivers) // 15, 2a1
                                .connect(fortress2e, crossRivers) // 17, 2a3
                                .chest(lysisPlant, 0x1d, 0x5d);
const fortress2g            = location(0xab, DRG2, 'Across Third Bridge').fortress()
                                .connect(fortress2e, crossRivers); // 16, 2a2
const fortress2h            = location(0xab, DRG2, 'Exit Behind Iron Door').fortress()
                                .connect(fortress2g, destroyIron); // 14, 29e
const fortress2Boss         = location(0xac, DRG2, 'Boss').fortress()
                                .connect(fortress2h)
                                .boss(sabera2);
const fortressTornel        = location(0xac, DRG2, 'Tornel').fortress()
                                .connect(fortress2Boss);
const fortress3Lower        = location(0xad, DRG3, 'Lower').fortress()
                                .connect(fortressTornel)
                                .chest(opelStatue, 0x1a, 0x63)
                                .chest(magicRing, 0x1b, 0x6f);
const fortress3UpperLoop    = location(0xae, DRG3, 'Upper Loop').fortress()
                                .connect(fortress3Lower)
                                .chest(antidote, 0x16, 0x60);
const fortress3UpperDeadEnd = location(0xae, DRG3, 'Upper Loop Behind Wall (magic ring)').fortress()
                                .connect(fortress3UpperLoop, destroyIron) // 15, 29d
                                .chest(magicRing, 0x17, 0x6b);
const fortress3UpperPassage = location(0xaf, DRG3, 'Upper Passage (toward Mado)').fortress()
                                .connect(fortress3Lower)
                                .chest(magicRing, 0x1b, 0x54);
const fortress4a            = location(0xb0, DRG4, 'Initial Fork').fortress();
const fortress4b            = location(0xb1, DRG4, 'Left Branch').fortress().connect(fortress4a);
const fortress4c            = location(0xb2, DRG4, 'Main Area (right branch, over bridges)').fortress()
                                .connect(fortress4a);
const fortress4d            = location(0xb3, DRG4, 'U-shaped Passage (between floors)').fortress()
                                .connect(fortress4c);
const fortress4e            = location(0xb4, DRG4, 'Main Area Lower (under bridge)').fortress()
                                .connect(fortress4b)
                                .connect(fortress4c)
                                .connect(fortress4d);
const fortress4f            = location(0xb4, DRG4, 'Behind Iron Wall').fortress()
                                .connect(fortress4e, destroyIron); // 16, 29c
const fortress4g            = location(0xb5, DRG4, 'Lower').fortress()
                                .connect(fortress4f)
                                .chest(mimic, 0x0d, 0x79)
                                .chest(mimic, 0x0e, 0x7a)
                                .chest(mimic, 0x0f, 0x7b)
                                .chest(magicRing, 0x17, 0x58)
                                .chest(warpBoots, 0x18, 0x6e);
const fortress4h            = location(0xb6, DRG4, 'Boss Corridor').fortress().connect(fortress4g);
const fortress4Boss         = location(0xb6, DRG4, 'Boss').fortress()
                                .connect(fortress4h, passShootingStatues)
                                .boss(karmine);
const fortress4End          = location(0xb6, DRG4, 'Behind Boss (stormBracelet)').fortress()
                                .connect(fortress4Boss)
                                .chest(stormBracelet, 0x12);
const fortressExit          = location(0xb7, DRG4, 'Exit Stairs').fortress();
const oasisCaveEntranceBack = location(0xb8, OASC, 'Entrance Back (behind river)').cave()
                                .connect(fortressExit)
                                .chest(fruitOfPower, 0x0d, 0x5a);
const oasisCaveEntrance     = location(0xb8, OASC, 'Entrance Front').cave()
                                .connect(oasisCaveEntranceBack, flight)
                                .connectTo(desert1)
                                .connectTo(oasisCave1);
const fortress3Boss         = location(0xb9, DRG3, 'Boss').fortress()
                                .connect(fortress3UpperPassage)
                                .boss(mado2);
const fortressAsina         = location(0xb9, DRG3, 'Asina').fortress()
                                .connect(fortress3Boss)
                                .connectTo(fortress4a);
const fortressKensu         = location(0xba, DRG4, 'Kensu').fortress()
                                .connect(fortress4f)
                                .connectTo(fortressExit)
                                .trigger(savedKensu, ivoryStatue);

// Inside Buildings

const goaHouse              = location(0xbb, GOA,  'House').house().connect(goa)
                                // TODO - consider removing ivory statue requirement?
                                .trigger(talkedToAkahanaFriend, change, ivoryStatue);
const goaInn                = location(0xbc, GOA,  'Inn').shop().connect(goa, enteredShyron);
const goaToolShop           = location(0xbe, GOA,  'Tool Shop').shop().connect(goa, enteredShyron);
const goaTavern             = location(0xbf, GOA,  'Tavern').shop().connect(goa);
const leafElderHouse        = location(0xc0, LEAF, 'Elder House').house()
                                .connect(leaf)
                                .trigger(talkedToLeafElder);
const leafRabbitHut         = location(0xc1, LEAF, 'Rabbit Hut').house().connect(leaf)
                                .trigger(talkedToLeafRabbit, villagersAbducted, telepathy);
const leafInn               = location(0xc2, LEAF, 'Inn').shop().connect(leaf);
const leafToolShop          = location(0xc3, LEAF, 'Tool Shop').shop()
                                .connect(leaf)
                                .trigger(buyAlarmFlute);
const leafArmorShop         = location(0xc4, LEAF, 'Armor Shop').shop().connect(leaf);
const leafStudentHouse      = location(0xc5, LEAF, 'Student House').house().connect(leaf)
                                .trigger(talkedToLeafStudent);
const brynmaerTavern        = location(0xc6, BRYN, 'Tavern').house().connect(brynmaer);
const brynmaerPawnShop      = location(0xc7, BRYN, 'Pawn Shop').shop().connect(brynmaer);
const brynmaerInn           = location(0xc8, BRYN, 'Inn').shop().connect(brynmaer);
const brynmaerArmorShop     = location(0xc9, BRYN, 'Armor Shop').shop().connect(brynmaer);
const brynmaerToolShop      = location(0xcb, BRYN, 'Tool Shop').shop().connect(brynmaer);
const oakElderHouse         = location(0xcd, OAK,  'Elder House').house()
                                .from(oak, telepathy)
                                .trigger(talkedToOakElder, rescuedOakChild);
const oakMotherHouse        = location(0xce, OAK,  'Mother\'s House').house()
                                .from(oak, telepathy)
                                .trigger(talkedToOakMother, telepathy)
                                .trigger(talkedToOakMothher2, rescuedOakChild);
const oakToolShop           = location(0xcf, OAK,  'Tool Shop').shop()
                                .from(oak, telepathy);
const oakInn                = location(0xd0, OAK,  'Inn').shop()
                                .from(oak, telepathy);
const amazonesInn           = location(0xd1, AMZN, 'Inn').shop().connect(amazones);
const amazonesToolShop      = location(0xd2, AMZN, 'Tool Shop').shop().connect(amazones);
const amazonesArmorShop     = location(0xd3, AMZN, 'Armor Shop').shop().connect(amazones);
const aryllisHouse          = location(0xd4, AMZN, 'Queen\'s House').house()
                                .from(amazones, changeOrGlitch)
                                .trigger(talkedToAmazonesQueen, change, kirisaPlant);
const nadare                = location(0xd5, NADR, 'Nadare\'s').house()
                                .connect(mtSabreNorthEntrance)
                                .connectTo(nadareInn)
                                .connectTo(nadareToolShop)
                                .connectTo(nadareBackRoom);
const portoaFishermanHouse  = location(0xd6, PORT, 'Fisherman\'s House').house()
                                .connect(portoaFishermanIsland)
                                // TODO - consider removing requirement of healed dolphin
                                .trigger(returnedFogLamp,
                                         fogLamp, shellFlute, maybeHealedDolphin);
                                // TODO - palace might want to be fortress...
                                // but we probably don't want to randomize this away
const portoaPalaceEntrance  = location(0xd7, PORT, 'Palace Entrance').house().connect(portoa);
const portoaFortuneTeller1  = location(0xd8, PORT, 'Fortune Teller Front').house()
                                .connect(portoa)
                                .trigger(talkedToFortuneTeller, talkedToPortoaQueen);
const portoaFortuneTeller2  = location(0xd8, PORT, 'Fortune Teller Back').house()
                                .connect(undergroundChannel2)
                                .connect(undergroundChannel3);
const portoaPawnShop        = location(0xd9, PORT, 'Pawn Shop').shop().connect(portoa);
const portoaArmorShop       = location(0xda, PORT, 'Armor Shop').shop().connect(portoa);
const portoaInn             = location(0xdc, PORT, 'Inn').shop().connect(portoa);
const portoaToolShop        = location(0xdd, PORT, 'Tool Shop').shop().connect(portoa);
const portoaPalaceLeft      = location(0xde, PORT, 'Palace Left')
                                .house()
                                .connect(portoaPalaceEntrance);
const portoaThroneRoom      = location(0xdf, PORT, 'Palace Throne Room')
                                .house()
                                .connect(portoaPalaceEntrance)
                                .to(undergroundChannel1, paralysisOrAsina)
                                .from(undergroundChannel1)
                                .trigger(talkedToPortoaQueen)
                                .trigger(sentToWaterfallCave,
                                         talkedToFortuneTeller, visitedUndergroundChannel);
const portoaPalaceRight     = location(0xe0, PORT, 'Palace Right')
                                .house()
                                .connect(portoaPalaceEntrance);
const portoaAsinaRoom       = location(0xe1, PORT, 'Asina\'s Room')
                                .house()
                                .connect(undergroundChannel4)
                                .trigger(talkedToAsina, asinaTrigger); // TODO - trigger?
const aryllisDownstairs     = location(0xe2, AMZN, 'Queen Downstairs').house()
                                .connect(aryllisHouse)
                                .chest(blizzardBracelet, 0x0d);
const joelElderHouse        = location(0xe3, JOEL, 'Elder\'s House').house()
                                .connect(joel)
                                .trigger(talkedToJoelElder);
const joelShed              = location(0xe4, JOEL, 'Shed').house()
                                .connect(joel)
                                .to(joelSecretPassage, eyeGlasses);
const joelToolShop          = location(0xe5, JOEL, 'Tool Shop').shop()
                                .connect(joel)
                                .trigger(buyAlarmFlute);
const joelInn               = location(0xe7, JOEL, 'Inn').shop().connect(joel);
const zombieTownHouse       = location(0xe8, EVIL, 'Zombie Town House').house().connect(zombieTown);
const zombieTownBasement    = location(0xe9, EVIL, 'Zombie Town Basement').house()
                                .connect(zombieTownHouse)
                                // TODO - correct trigger when shuffling bosses?
                                .trigger(talkedToClark, sabera1);
const swanToolShop          = location(0xeb, SWAN, 'Tool Shop').shop()
                                .connect(swan);
const swanStomHut           = location(0xec, SWAN, 'Stom\'s Hut').house()
                                .connect(swan)
                                .trigger(talkedToStomInSwan);
const swanInn               = location(0xed, SWAN, 'Inn').shop().connect(swan);
const swanArmorShop         = location(0xee, SWAN, 'Armor Shop').shop().connect(swan);
const swanTavern            = location(0xef, SWAN, 'Tavern').house()
                                .connect(swan)
                                .trigger(talkedToKensuInTavern, talkedToStomInSwan, paralysis);
const swanPawnShop          = location(0xf0, SWAN, 'Pawn Shop').shop().connect(swan);
const swanDanceHall         = location(0xf1, SWAN, 'Dance Hall').house()
                                .connect(swan)
                                .trigger(talkedToKensuAtDance, talkedToKensuInTavern, paralysis)
                                .trigger(returnedLovePendant, talkedToKensuAtDance, lovePendant);
const shyronTemple1         = location(0xf2, SHYR, 'Temple (pre-massacre)').fortress()
                                .connect(shyron)
                                .from(start, swordOfThunder, teleportToShyron)
                                .trigger(talkedToZebuInShyron);
const shyronTemple2         = location(0xf2, SHYR, 'Temple (post-massacre)').fortress()
                                .from(shyronTemple1, shyronMassacre)
                                .boss(mado1);
const shyronTrainingHall    = location(0xf3, SHYR, 'Training Hall').house().connect(shyron);
const shyronHospital        = location(0xf4, SHYR, 'Hospital').house().connect(shyron);
const shyronArmorShop       = location(0xf5, SHYR, 'Armor Shop').shop().connect(shyron);
const shyronToolShop        = location(0xf6, SHYR, 'Tool Shop').shop().connect(shyron);
const shyronInn             = location(0xf7, SHYR, 'Inn').shop().connect(shyron);
const saharaInn             = location(0xf8, SHRA, 'Inn').shop().connect(sahara);
const saharaToolShop        = location(0xf9, SHRA, 'Tool Shop').shop().connect(sahara);
const saharaElderHouse      = location(0xfa, SHRA, 'Elder\'s House').house().connect(sahara);
const saharaPawnShop        = location(0xfb, SHRA, 'Pawn Shop').house().connect(sahara);

const wildWarpLocations = [
  leaf,
  valleyOfWind,
  sealedCave1,
  cordelPlainWest,
  swamp,
  mtSabreWestEntrance,
  waterfallValleySummit,
  limeTreeValley,
  angrySeaCabinBeach,
  // undergroundChannel6, // not useful
  swan,
  goaValley,
  mtHydra1,
  desert1,
  fortressEntrance,
  desert2,
];

for (const l of wildWarpLocations) {
  l.from(start, wildWarp);
}

return graph;
};

export const shuffle = async (rom, random, log = undefined, flags = undefined, progress = undefined) => {
  const graph = generate(flags);
  const allSlots = graph.nodes.filter(s => s instanceof Slot);

  // Default shuffling
  if (!flags) flags = new FlagSet('Sbkm Sct');

  const buckets = {}
  for (const slot of graph.nodes) {
    if (!(slot instanceof Slot) || !slot.slots) continue; // fixed, no shuffle
    const type = slot.slotType[0];
    (buckets[type] = buckets[type] || []).push(slot);
  }

  // Now we need to figure out what to do with the buckets...
  // We have 5 buckets: key, bonus, consumable, magic, and trap
  // key and magic need to be shuffled intelligently
  // other three can be shuffled however we want

  // Build up a table of shuffle pools:
  const pools = [];
  const all = [];
  const shuffled = {};
  // let magicPool = null;
  // let keyPool = null;
  for (const pool of flags.flags['S']) {
    const p = [];
    for (const type of pool) {
      shuffled[type] = true;
      for (const slot of buckets[type]) {
        p.push(slot);
        all.push([slot, pools.length]);
      }
    }
    pools.push(p);
  }

  // For bonus and consumables, just do a total shuffle, since it will never
  // break the logic.
  for (const bucket of 'bc') {
    if (!shuffled[bucket]) continue;
    const slots = buckets[bucket];
    const items = slots.map(slot => [slot.item, slot.itemIndex]);
    random.shuffle(items);
    for (let i = 0; i < slots.length; i++) {
      slots[i].set(...items[i]);
    }
  }

  // Initial attempt - start with vanilla and do 1-10 swaps at a time,
  // see if it still works.  Randomly swap wind/fire for initial diff (50/50).
  // Later would be nice to start fully shuffled and anneal, or do something
  // more targeted.
  const findSlot =
      (name) => graph.nodes.find(n => n instanceof Slot && n.name === name);

  const swordOfWind = findSlot('Sword of Wind');
  const swordOfFire = findSlot('Sword of Fire');
  const ballOfWind = findSlot('Ball of Wind');
  const ballOfFire = findSlot('Ball of Fire');
  const statueOfOnyx = findSlot('Statue of Onyx');
  const gasMask = findSlot('Gas Mask');
  if (shuffled['k'] && random.nextInt(2)) {
    swordOfFire.swap(swordOfWind);
    ballOfFire.swap(ballOfWind);
  }
  if (shuffled['k'] && !random.nextInt(3)) {
    // help out the shuffle to change up the early game a bit more.
    statueOfOnyx.swap(gasMask);
  }
  const counts = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 5, 5, 8, 13];

  // Now do a whole bunch of shuffle attempts.
  // const keys = [...buckets['k'], ...buckets['b']]; //, ...buckets['item']];
  // const magics = buckets['m'];
  // const magicIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  // const both = [keys, magics];
  //const both = [keys, magicIndices];

  //let swap = (w, k) => both[w][pos[w] - 1 + k].swap(both[w][pos[w] + k]);

  let route = [];
  if (progress) progress.addTasks(10);
  for (let i = 0; i < 1000; i++) {
    // Ensure UI can update.
    if (progress && (i % 100 == 0)) {
      await new Promise(requestAnimationFrame);
      progress.addCompleted(1);
    }
    random.shuffle(all);
    for (const pool of pools) random.shuffle(pool);
    const pos = pools.map(() => -1);
    const count = counts[random.nextInt(counts.length)];
    const swaps = [];

    const canSwap = (s1, s2) => {
      if (s1.itemIndex === s2.itemIndex) return false;
      if (s1.isMimic() && !s2.canHoldMimic()) return false;
      if (s2.isMimic() && !s1.canHoldMimic()) return false;
      if (s1.needsChest() && !s2.isChest()) return false;
      if (s2.needsChest() && !s1.isChest()) return false;
      return true;
    };

    for (let j = 0; j < count; j++) {
      const [slot, poolIndex] = all[j];
      const other = pools[poolIndex][++pos[poolIndex]];
      // don't try to swap the same thing
      if (!canSwap(slot, other)) continue;
      slot.swap(other);
      swaps.push([slot, other]);
    }
    if (!swaps.length) continue; // nothing to do
    // test

    const {win, path} = graph.traverse();
    if (win) {
      //console.log(`successful shuffle of ${count} items`);
      route = path;
      continue;
    } else {
      //console.log(`shuffled ${count} items: fail`);
    }
    // unswap
    while (swaps.length) {
      const [a, b] = swaps.pop();
      a.swap(b);
    }
  }

  // Commit changes
  for (const slot of graph.nodes) {
    if (slot instanceof Slot) slot.write(rom);
  }

  if (!log) return;

  // Generate spoiler log.
  log.items = [];
  log.route = [];
  for (const [slot, routeText] of route) {
    log.route.push(routeText);
    if (slot.slotName == null) continue;
    let slotName = slot.slotName;
    if (slotName.indexOf(slot.orig) < 0) slotName += ` (normally ${slot.orig})`;
    log.items.push({slotIndex: slot.slotIndex,
                    itemIndex: slot.itemIndex,
                    origName: slot.vanillaItemName,
                    slotName: slot.slotName,
                    itemName: slot.item.name,
                    text: `${slot.item.name}: ${slotName}`,
                   });
  }
};

export const shuffle2 = async (rom, random, log = undefined, flags = undefined, progress = undefined) => {
  const graph = generate(flags);
  const locationList = graph.integrate();
  if (progress) progress.addTasks(1000);
  for (let i = 0; i < 1000; i++) {
    const success = await shuffle3(graph, locationList, rom, random, log, flags, progress);
    if (success) {
      console.log(`success after ${i} attempts`);
      return;
    }
    if (progress) {
      progress.addCompleted(1);
      if (i % 50 === 0) await new Promise(requestAnimationFrame);
    }
  }
  throw new Error('failed');
};

// TODO - build in some sort of auto-reroll functionality,
// where we feed in some stats about the fill and maybe
// reroll if it doesn't meet some criteria?
export const shuffle3 = async (graph, locationList, rom, random, log = undefined, flags = undefined, progress = undefined) => {
  const slots = graph.nodes.filter(s => s instanceof Slot && s.slots && s.slotName);
  const allItems = new Map(random.shuffle(slots.map(s => [s, [s.item, s.itemIndex]])));
  const allSlots = new Set(random.shuffle(slots));
  const itemToSlot = new Map();
  const slotType = (slot) => slot.slotType ? slot.slotType[0] : 'c';
  const buckets = {};

  // Default shuffling - only S flags matter.
  if (!flags) flags = new FlagSet('Sbkm Sct');
  flags.flags['S'].forEach((pool, index) => {
    for (const type of pool) {
      buckets[type] = index;
    }
  });

  for (const slot of allSlots) {
    itemToSlot.set(slot.item, slot);
  }

  const fits = (slot, item) => {
    // If the slot type is not shuffled, it must not have been moved.
    if (buckets[slotType(slot)] == null) return slot == item;
    // Ensure mimics only end up places that can hold them (non-boss chests).
    if (item.isMimic() && !slot.canHoldMimic()) return false;
    // Ensure non-unique items are not placed in trigger squares.
    if (item.item.inventoryRow != 'unique' && slot.requiresUnique) return false;
    // Ensure armor is only in chests (including bosses).
    if (item.item.inventoryRow == 'armor' && !slot.isChest()) return false;
    // Ensure the items types are allowed to be shuffled together.
    return buckets[slotType(slot)] == buckets[slotType(item)];
  }

  const filling =
      locationList.assumedFill(
          random,
          (slot, item) => fits(slot, itemToSlot.get(item)));

  // TODO - once we're doing other shufflings, re-roll the
  // location list after 5 or so failed attempts?
  if (filling == null) {
    return false;
  }

  const fillMap = new Map();
  for (let slot = 0; slot < filling.length; slot++) {
    const item = filling[slot];
    if (item == null) continue;
    const itemSlot = itemToSlot.get(locationList.item(item));
    const args = allItems.get(itemSlot);
    allItems.delete(itemSlot);
    const location = locationList.location(slot);
    fillMap.set(location, args);
    allSlots.delete(location);
  }

  // Now do the remaining (non-progression) items
  const findSlot = (item, args) => {
    for (const slot of allSlots) {
      if (!fits(slot, item)) continue;
      fillMap.set(slot, args);
      allSlots.delete(slot);
      return;
    }
    return false;
  };
  for (const [item, args] of allItems) {
    if (item.isMimic()) {
      findSlot(item, args);
      allItems.delete(item);
    }
  }
  for (const [item, args] of allItems) {
    if (item.needsChest()) {
      findSlot(item, args);
      allItems.delete(item);
    }
  }
  for (const [item, args] of allItems) {
    findSlot(item, args);
  }

  for (const [slot, args] of fillMap) {
    slot.set(...args);
  }

  // Do a final sanity check to make sure the game is actually winnable.
  const {win, path: route} = graph.traverse({wanted: slots, dfs: false});
  if (!win) {
    return false;
  }

  // Commit changes
  if (rom) {
    for (const slot of graph.nodes) {
      if (slot instanceof Slot) slot.write(rom);
    }
  }

  if (!log) return true;

  // Generate spoiler log.
  log.items = [];
  log.route = [];
  for (const [slotIndex, routeText] of route) {
    log.route.push(routeText);
    const slot = graph.nodes[slotIndex];
    if (slot.slotName == null) continue;
    let slotName = slot.slotName;
    if (slotName.indexOf(slot.orig) < 0) slotName += ` (normally ${slot.vanillaItemName})`;
    log.items.push({slotIndex: slot.slotIndex,
                    itemIndex: slot.itemIndex,
                    origName: slot.vanillaItemName,
                    slotName: slot.slotName,
                    itemName: slot.item.name,
                    text: `${slot.item.name}: ${slotName}`,
                   });
  }
  return true;
};
