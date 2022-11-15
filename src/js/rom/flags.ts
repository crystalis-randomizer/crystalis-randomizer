import {Item} from './item';
import {Location} from './location';
import {Npc} from './npc';
import {Trigger} from './trigger';
import {hex, hex3, upperCamelToSpaces, Writable} from './util';
import {Condition, Requirement} from '../logic/requirement';
import {Rom} from '../rom';

const DEBUG = false;

const FLAG = Symbol();

// TODO - maybe alias should just be in overlay.ts?
export interface Logic {
  assumeTrue?: boolean;
  assumeFalse?: boolean;
  track?: boolean;
}

const FALSE: Logic = {assumeFalse: true};
const TRUE: Logic = {assumeTrue: true};
const TRACK: Logic = {track: true};
const IGNORE: Logic = {};

interface FlagData {
  fixed?: boolean;
  obsolete?: (ctx: FlagContext) => number;
  logic?: Logic;
}
interface FlagContext {
  trigger?: Trigger;
  location?: Location;
  npc?: Npc;
  spawn?: number;
  index?: number;
  dialog?: boolean;
  set?: boolean;
  //dialog?: LocalDialog|GlobalDialog;
  //index?: number;
  //condition?: boolean;
}

export class Flag {

  fixed: boolean;
  obsolete?: (ctx: FlagContext) => number;
  logic: Logic;

  constructor(readonly flags: Flags,
              readonly name: string,
              readonly id: number,
              data: FlagData) {
    this.fixed = data.fixed || false;
    this.obsolete = data.obsolete;
    this.logic = data.logic ?? TRACK;
  }

  get c(): Condition {
    return this.id as Condition;
  }

  get r(): Requirement.Single {
    return [[this.id as Condition]];
  }

  get debug(): string {
    return this.id.toString(16).padStart(3, '0') + ' ' + this.name;
  }

  get item(): Item {
    if (this.id < 0x100 || this.id > 0x17f) {
      throw new Error(`not a slot: ${this.id}`);
    }
    const itemGetId = this.flags.rom.slots[this.id & 0xff];
    const itemId = this.flags.rom.itemGets[itemGetId].itemId;
    const item = this.flags.rom.items[itemId];
    if (!item) throw new Error(`no item`);
    return item;
  }
}

function obsolete(obsolete: number | ((ctx: FlagContext) => number)): Flag {
  if (typeof obsolete === 'number') obsolete = (o => () => o)(obsolete);
  return {obsolete, [FLAG]: true} as any;
}
function fixed(id: number, logic = IGNORE): Flag {
  return {id, fixed: true, [FLAG]: true, logic} as any;
}
function tracked(id: number): Flag {
  return fixed(id, TRACK);
}
function movable(id: number, logic = IGNORE): Flag {
  return {id, [FLAG]: true, logic} as any;
}
function dialogProgression(name: string, logic = IGNORE): Flag {
  return {name, [FLAG]: true, logic} as any;
}
function dialogToggle(name: string, logic = IGNORE): Flag {
  return {name, [FLAG]: true, logic} as any;
}

function pseudo(owner: object): Flag {
  const id = pseudoCounter.get(owner) || 0x400;
  pseudoCounter.set(owner, id + 1);
  return {id, [FLAG]: true, logic: TRACK} as any;
}
const pseudoCounter = new WeakMap<object, number>();

// obsolete flags - delete the sets (should never be a clear)
//                - replace the checks with the replacement

// --- maybe obsolete flags can have different replacements in
//     different contexts?
// --- in particular, itemgets shouldn't carry 1xx flags?


/** Tracks used and unused flags. */
export class Flags {

  [id: number]: Flag;

  // 00x
  0x000 = fixed(0x000, FALSE);
  0x001 = fixed(0x001);
  0x002 = fixed(0x002);
  0x003 = fixed(0x003);
  0x004 = fixed(0x004);
  0x005 = fixed(0x005);
  0x006 = fixed(0x006);
  0x007 = fixed(0x007);
  0x008 = fixed(0x008);
  0x009 = fixed(0x009);
  UsedWindmillKey = fixed(0x00a, TRACK);
  0x00b = obsolete(0x100); // check: sword of wind / talked to leaf elder
  0x00c = dialogToggle('Leaf villager');
  LeafVillagersRescued = movable(0x00d);
  0x00e = obsolete((s) => {
    if (s.trigger?.id === 0x85) return 0x143; // check: telepathy / stom
    return 0x243; // item: telepathy
  });
  WokeWindmillGuard = movable(0x00f, TRACK);

  // 01x
  TurnedInKirisaPlant = movable(0x010);
  0x011 = dialogProgression('Welcomed to Amazones');
  0x012 = dialogProgression('Treasure hunter dead');
  0x013 = obsolete(0x138); // check: broken statue / sabera 1
  // unused 014, 015
  0x016 = dialogProgression('Portoa queen Rage hint');
  0x017 = obsolete(0x102); // chest: sword of water
  EnteredUndergroundChannel = movable(0x018, TRACK);
  0x019 = dialogToggle('Portoa queen tired of talking');
  0x01a = dialogProgression('Initial talk with Portoa queen');
  MesiaRecording = movable(0x01b, TRACK);
  0x01c = obsolete(0x110); // item: mirrored shield
  TalkedToFortuneTeller = movable(0x1d, TRACK);
  QueenRevealed = movable(0x01e, TRACK);
  0x01f = obsolete(0x109); // check: rage

  // 02x
  QueenNotInThroneRoom = movable(0x020, TRACK);
  ReturnedFogLamp = movable(0x021, TRACK);
  0x022 = dialogProgression('Sahara elder');
  0x023 = dialogProgression('Sahara elder daughter');
  0x024 = obsolete(0x13d); // check: ivory statue / karmine
  0x025 = obsolete(0x136); // healed dolphin
  0x026 = obsolete(0x2fd); // warp: shyron
  ShyronMassacre = fixed(0x027, TRACK); // preshuffle hardcodes for dead sprites
  ChangeWoman = fixed(0x028); // hardcoded in original rom
  ChangeAkahana = fixed(0x029);
  ChangeSoldier = fixed(0x02a);
  ChangeStom = fixed(0x02b);
  // unused 02c
  0x02d = dialogProgression('Shyron sages');
  0x02e = obsolete(0x12d); // check: deo's pendant
  UsedBowOfTruth = fixed(0x02f);  // moved from 086 in preparse

  // 03x
  // unused 030
  0x031 = dialogProgression('Zombie town');
  0x032 = obsolete(0x137); // check: eye glasses
  // unused 033
  0x034 = dialogProgression('Akahana in waterfall cave'); // ???
  CuredAkahana = movable(0x035, TRACK);
  0x036 = dialogProgression('Akahana Shyron');
  0x037 = obsolete(0x142); // check: paralysis
  LeafAbduction = movable(0x038, TRACK); // one-way latch
  0x039 = obsolete(0x141); // check: refresh
  TalkedToZebuInCave = movable(0x03a, TRACK);
  TalkedToZebuInShyron = movable(0x03b, TRACK);
  0x03c = obsolete(0x13b); // chest: love pendant
  0x03d = dialogProgression('Asina in Shyron temple');
  FoundKensuInDanceHall = movable(0x03e, TRACK);
  0x03f = obsolete((s) => {
    if (s.trigger?.id === 0xba) return 0x244 // item: teleport
    return 0x144; // check: teleport
  });

  // 04x
  0x040 = dialogProgression('Tornel in Shyron temple');
  0x041 = obsolete(0x107); // check: ball of fire / insect
  // unused 042
  // unused 0x043 = dialogProgression('Oak');
  0x044 = obsolete(0x107); // check: ball of fire / insect
  RescuedChild = fixed(0x045, TRACK); // hardcoded $7e7d5
  UsedInsectFlute = fixed(0x046); // custom-added $6488:40
  RescuedLeafElder = movable(0x047);
  0x048 = dialogProgression('Treasure hunter embarked');
  0x049 = obsolete(0x101); // check: sword of fire
  0x04a = dialogProgression('Boat owner');
  0x04b = dialogToggle('Shyron sick men');
  0x04c = dialogToggle('Shyron training men 1');
  0x04d = dialogToggle('Shyron training men 2');
  0x04e = obsolete(0x106); // chest: tornado bracelet
  0x04f = obsolete(0x12b); // check: warrior ring

  // 05x
  GivenStatueToAkahana = movable(0x050); // give it back if unsuccessful?
  0x051 = obsolete(0x146); // check: barrier / angry sea
  TalkedToDwarfMother = movable(0x052, TRACK);
  LeadingChild = fixed(0x053, TRACK); // hardcoded $7e7c4 and following
  // unused 054
  0x055 = dialogProgression('Zebu rescued');
  0x056 = dialogProgression('Tornel rescued');
  0x057 = dialogProgression('Asina rescued');
  // unused 058 .. 05a
  MtSabreGuardsDespawned = movable(0x05b, TRUE);
  // unused 05c, 05d
  0x05e = obsolete(0x28d); // draygon 2
  0x05f = obsolete(0x203); // item: sword of thunder
  // TODO - fix up the NPC spawn and trigger conditions in Shyron.
  // Maybe just remove the cutscene entirely?

  // 06x
  // unused 060
  TalkedToStomInSwan = movable(0x061, TRACK);
  0x062 = obsolete(0x151); // chest: sacred shield
  0x063 = obsolete(0x147); // check: change
  // unused 064
  // SwanGateOpened = movable(~0x064); // why would we add this? use 2b3
  CuredKensu = movable(0x065, TRACK);
  // unused 066
  0x067 = obsolete(0x10b); // check: ball of thunder / mado 1
  0x068 = obsolete(0x104); // check: forged crystalis
  // unused 069
  StonedPeopleCured = movable(0x06a, TRACK);
  // unused 06b
  0x06c = obsolete(0x11c); // check: psycho armor / draygon 1
  // unused 06d .. 06f
  CurrentlyRidingDolphin = fixed(~0x06e, TRACK); //, { // NOTE: added by rando
  //   alias: rom => [rom.items.ShellFlute.itemUseData[0].want],
  // });

  // 07x
  ParalyzedKensuInTavern = fixed(0x070); //, { // hardcoded in rando preshuffle.s
  //   alias: rom => [rom.flags.Paralysis.id],
  // });
  ParalyzedKensuInDanceHall = fixed(0x071); //, { // hardcoded in rando preshuffle.s
  //   alias: rom => [rom.flags.Paralysis.id],
  // });
  FoundKensuInTavern = movable(0x072, TRACK);
  0x073 = dialogProgression('Startled man in Leaf');
  // unused 074
  0x075 = obsolete(0x139); // check: glowing lamp
  0x076 = dialogProgression('Kensu in Goa');
  0x077 = obsolete(0x108); // check: flame bracelet / kelbesque 1
  0x078 = obsolete(0x10c); // chest: storm bracelet
  0x079 = obsolete(0x140); // check: bow of truth
  0x07a = obsolete(0x10a); // chest: blizzard bracelet
  0x07b = obsolete(0x109); // rage/ball of water
  // unused 07b, 07c
  0x07d = obsolete(0x13f); // chest: bow of sun
  0x07e = dialogProgression('Mt Sabre guards 1');
  0x07f = dialogProgression('Mt Sabre guards 2');

  AlarmFluteUsedOnce = fixed(0x76); // hardcoded: preshuffle.s PatchTradeInItem
  FluteOfLimeUsedOnce = fixed(0x77); // hardcoded: preshuffle.s PatchTradeInItem

  // 08x
  // unused 080, 081
  0x082 = obsolete(0x140); // check: bow of truth / azteca
  0x083 = dialogProgression('Rescued Leaf elder');
  LeafVillagersCurrentlyAbducted = movable(0x084);
  LeafElderCurrentlyAbducted = movable(0x085);
  //UsedBowOfTruth = movable(0x086);  // moved manually at preparse to 2f
  0x087 = obsolete(0x105); // chest: ball of wind
  0x088 = obsolete(0x132); // check: windmill key
  0x089 = dialogProgression('Dead Stom\'s girlfriend');
  0x08a = dialogProgression('Dead Stom');
  0x08b = obsolete(0x236); // item: shell flute
  // unused 0x08c = dialogProgression('Swan guards despawned');
  0x08d = obsolete(0x137); // check: eye glasses
  // unused 08e
  0x08f = obsolete(0x283); // event: calmed sea

  // 09x
  0x090 = dialogProgression('Stoned people gone');
  // unused 091
  0x092 = obsolete(0x128); // check: flute of lime
  // unused 093 .. 095
  0x096 = dialogToggle('Leaf elder daughter');
  0x097 = dialogToggle('Leaf villager');
  0x098 = dialogProgression('Nadare villager');
  // unused 099, 09a
  AbleToRideDolphin = movable(0x09b, TRACK);
  PortoaQueenGoingAway = movable(0x09c);
  // unused 09d .. 09f

  // 0ax
  0x0a0 = obsolete(0x127); // check: insect flute
  // unused 0a1, 0a2
  0x0a3 = dialogToggle('Portoa queen/fortune teller');
  WokeKensuInLighthouse = movable(0x0a4, TRACK);
  // TODO: this may not be obsolete if there's no item here?
  0x0a5 = obsolete(0x131); // check: alarm flute / zebu student
  // NOTE: mark the oak elder progression as assumed false because otherwise
  // if they're ignored the logic thinks the elder's item is free (if these
  // were tracked, we'd realize it's conditional on already having the item).
  0x0a6 = dialogProgression('Oak elder 1', FALSE);
  0x0a7 = dialogToggle('Swan dancer');
  0x0a8 = dialogProgression('Oak elder 2', FALSE);
  TalkedToLeafRabbit = movable(0x0a9, TRACK);
  0x0aa = obsolete(0x11d); // chest: medical herb
  0x0ab = obsolete(0x150); // chest: medical herb
  // unused 0ac
  0x0ad = obsolete(0x152); // chest: medical herb
  0x0ae = obsolete(0x153); // chest: medical herb
  0x0af = obsolete(0x154); // chest: magic ring

  // 0bx
  0x0b0 = obsolete(0x155); // chest: medical herb
  0x0b1 = obsolete(0x156); // chest: medical herb
  0x0b2 = obsolete(0x157); // chest: medical herb
  0x0b3 = obsolete(0x158); // chest: magic ring
  0x0b4 = obsolete(0x159); // chest: medical herb
  0x0b5 = obsolete(0x15a); // chest: fruit of power
  0x0b6 = obsolete(0x11f); // chest: lysis plant
  0x0b7 = obsolete(0x15c); // chest: lysis plant
  0x0b8 = obsolete(0x15d); // chest: lysis plant
  0x0b9 = obsolete(0x11e); // chest: antidote
  0x0ba = obsolete(0x15e); // chest: antidote
  0x0bb = obsolete(0x15f); // chest: antidote
  0x0bc = obsolete(0x160); // chest: antidote
  0x0bd = obsolete(0x120); // chest: fruit of lime
  0x0be = obsolete(0x121); // chest: fruit of power
  0x0bf = obsolete(0x162); // chest: fruit of power

  // 0cx
  0x0c0 = obsolete(0x163); // chest: opel statue
  0x0c1 = obsolete(0x164); // chest: fruit of power
  0x0c2 = obsolete(0x122); // chest: magic ring
  0x0c3 = obsolete(0x165); // chest: magic ring
  0x0c4 = obsolete(0x166); // chest: fruit of repun
  0x0c5 = obsolete(0x16b); // chest: magic ring
  0x0c6 = obsolete(0x16c); // chest: magic ring
  0x0c7 = obsolete(0x123); // chest: fruit of repun
  0x0c8 = obsolete(0x124); // chest: warp boots
  0x0c9 = obsolete(0x16a); // chest: warp boots
  0x0ca = obsolete(0x13d); // check: ivory statue / karmine
  0x0cb = obsolete(0x12a); // chest: power ring
  0x0cc = obsolete(0x11c); // check: psycho armor / draygon 1
  0x0cd = obsolete(0x114); // chest: psycho shield
  0x0ce = obsolete(0x125); // chest: statue of onyx
  0x0cf = obsolete(0x133); // chest: key to prison
  
  // 0dx
  0x0d0 = obsolete(0x128); // check: flute of lime / queen
  0x0d1 = obsolete(0x135); // chest: fog lamp
  0x0d2 = obsolete(0x169); // chest: magic ring
  0x0d3 = obsolete(0x126); // chest: opel statue
  0x0d4 = obsolete(0x15b); // chest: flute of lime
  0x0d5 = dialogToggle('Portoa queen 1');
  0x0d6 = dialogToggle('Portoa queen 2');
  0x0d7 = dialogToggle('Portoa queen 3');
  0x0d8 = dialogProgression('Kensu rescued');
  0x0d9 = dialogToggle('Stoned pair');
  0x0da = dialogProgression('Kensu gone from tavern');
  0x0db = dialogToggle('In Sabera\'s trap');
  0x0dc = obsolete(0x16f); // chest: magic ring
  0x0dd = obsolete(0x170); // mimic?? medical herb??
  0x0de = obsolete(0x12c); // chest: iron necklace
  0x0df = obsolete(0x11b); // chest: battle armor

  // 0ex
  0x0e0 = dialogProgression('Dead Akahana');
  // unused 0e1 .. 0e3
  0x0e4 = obsolete(0x13c); // chest: kirisa plant
  0x0e5 = obsolete(0x16e); // chest: warp boots
  0x0e6 = obsolete(0x16d); // chest: opel statue
  0x0e7 = obsolete(0x12f); // chest: leather boots
  0x0e8 = dialogProgression('Dead Shyron villager');
  0x0e9 = dialogProgression('Dead Shyron guard');
  0x0ea = dialogProgression('Tower message 1');
  0x0eb = dialogProgression('Tower message 2');
  0x0ec = dialogProgression('Tower message 3');
  0x0ed = dialogProgression('Mesia');
  // unused 0ee .. 0ff
  TalkedToZebuStudent = movable(0x0ee, TRACK);

  // 100
  0x100 = obsolete(0x12e); // check: rabbit boots / vampire
  0x101 = obsolete(0x107); // check: ball of fire / insect
  0x102 = obsolete(0x108); // check: flame bracelet / kelbesque 1
  0x103 = obsolete(0x109); // check: ball of water / rage
  // unused 104
  0x105 = obsolete(0x126); // check: opel statue / kelbesque 2
  0x106 = obsolete(0x123); // check: fruit of repun / sabera 2
  0x107 = obsolete(0x112); // check: sacred shield / mado 2
  0x108 = obsolete(0x13d); // check: ivory statue / karmine
  UsedBowOfMoon = movable(0x109);
  UsedBowOfSun = movable(0x10a);
  0x10b = obsolete(0x11c); // check: psycho armor / draygon 1
  0x10c = obsolete(0x161); // check: fruit of power / vampire 2

  // 100 .. 17f => fixed flags for checks.

  // TODO - are these all TRACK or just the non-chests?!?

  // TODO - basic idea - NPC hitbox extends down one tile? (is that enough?)
  //      - statues can be entered but not exited?
  //      - use trigger (| paralysis | glitch) for moving statues?
  //          -> get normal requirements for free
  //          -> better hitbox?  any way to get queen to work? too much state?
  //             may need to have two different throne rooms? (full/empty)
  //             and have flag state affect exit???
  //      - at the very least we can use it for the hitbox, but we may still
  //        need custom overlay?

  // TODO - pseudo flags somewhere?  like sword? break iron? etc...

  LeafElder = tracked(~0x100);
  OakElder = tracked(~0x101);
  WaterfallCaveSwordOfWaterChest = tracked(~0x102);
  StxyLeftUpperSwordOfThunderChest = tracked(~0x103);
  MesiaInTower = tracked(0x104);
  SealedCaveBallOfWindChest = tracked(~0x105);
  MtSabreWestTornadoBraceletChest = tracked(~0x106);
  GiantInsect = tracked(~0x107);
  Kelbesque1 = tracked(~0x108);
  Rage = tracked(~0x109);
  AryllisBasementChest = tracked(~0x10a);
  Mado1 = tracked(~0x10b);
  StormBraceletChest = tracked(~0x10c);
  WaterfallCaveRiverLeftChest = tracked(0x110); // rando changed index!
  Mado2 = tracked(0x112);
  StxyRightMiddleChest = tracked(0x114);
  BattleArmorChest = tracked(0x11b);
  Draygon1 = tracked(0x11c);
  SealedCaveSmallRoomBackChest = tracked(0x11d); // medical herb
  SealedCaveBigRoomNortheastChest = tracked(0x11e); // antidote
  FogLampCaveFrontChest = tracked(0x11f); // lysis plant
  MtHydraRightChest = tracked(0x120); // fruit of lime
  SaberaUpstairsLeftChest = tracked(0x121); // fruit of power
  EvilSpiritIslandLowerChest = tracked(0x122); // magic ring
  Sabera2 = tracked(0x123); // fruit of repun
  SealedCaveSmallRoomFrontChest = tracked(0x124); // warp boots
  CordelGrass = tracked(0x125);
  Kelbesque2 = tracked(0x126); // opel statue
  OakMother = tracked(0x127);
  PortoaQueen = tracked(0x128);
  AkahanaStatueOfOnyxTradein = tracked(0x129);
  OasisCaveFortressBasementChest = tracked(0x12a);
  Brokahana = tracked(0x12b);
  EvilSpiritIslandRiverLeftChest = tracked(0x12c);
  Deo = tracked(0x12d);
  Vampire1 = tracked(0x12e);
  OasisCaveNorthwestChest = tracked(0x12f);
  AkahanaFluteOfLimeTradein = tracked(0x130);
  // NOTE: this should be changed to MezameRightChest
  ZebuStudent = tracked(0x131); // TODO - may opt for 2 in cave instead?
  WindmillGuardAlarmFluteTradein = tracked(0x132);
  MtSabreNorthBackOfPrisonChest = tracked(0x133);
  ZebuInShyron = tracked(0x134);
  FogLampCaveBackChest = tracked(0x135);
  InjuredDolphin = tracked(0x136);
  Clark = tracked(0x137);
  Sabera1 = tracked(0x138);
  KensuInLighthouse = tracked(0x139);
  RepairedStatue = tracked(0x13a);
  UndergroundChannelUnderwaterChest = tracked(0x13b);
  KirisaMeadow = tracked(0x13c);
  Karmine = tracked(0x13d);
  Aryllis = tracked(0x13e);
  MtHydraSummitChest = tracked(0x13f);
  AztecaInPyramid = tracked(0x140);
  ZebuAtWindmill = tracked(0x141);
  MtSabreNorthSummit = tracked(0x142);
  StomFightReward = tracked(0x143);
  MtSabreWestTornel = tracked(0x144);
  AsinaInBackRoom = tracked(0x145);
  BehindWhirlpool = tracked(0x146);
  KensuInSwan = tracked(0x147);
  SlimedKensu = tracked(0x148);
  MezameShrineLeftChest = tracked(0x149); // medical herb
  SealedCaveBigRoomSouthwestChest = tracked(0x150); // medical herb
  // unused 151 sacred shield chest
  MtSabreWestRightChest = tracked(0x152); // medical herb
  MtSabreNorthMiddleChest = tracked(0x153); // medical herb
  FortressMadoHellwayChest = tracked(0x154); // magic ring
  SaberaUpstairsRightChest = tracked(0x155); // medical herb across spikes
  MtHydraFarLeftChest = tracked(0x156); // medical herb
  StxyLeftLowerChest = tracked(0x157); // medical herb
  KarmineBasementLowerMiddleChest = tracked(0x158); // magic ring
  EastCaveNortheastChest = tracked(0x159); // medical herb (unused)
  OasisCaveEntranceAcrossRiverChest = tracked(0x15a); // fruit of power
  // unused 15b 2nd flute of lime - changed in rando
  // WaterfallCaveRiverLeftChest = tracked(0x15b); // 2nd flute of lime
  EvilSpiritIslandExitChest = tracked(0x15c); // lysis plant
  FortressSaberaMiddleChest = tracked(0x15d); // lysis plant
  MtSabreNorthUnderBridgeChest = tracked(0x15e); // antidote
  KirisaPlantCaveChest = tracked(0x15f); // antidote
  FortressMadoUpperNorthChest = tracked(0x160); // antidote
  Vampire2 = tracked(0x161); // fruit of power
  FortressSaberaNorthwestChest = tracked(0x162); // fruit of power
  FortressMadoLowerCenterNorthChest = tracked(0x163); // opel statue
  OasisCaveNearEntranceChest = tracked(0x164); // fruit of power
  MtHydraLeftRightChest = tracked(0x165); // magic ring
  FortressSaberaSoutheastChest = tracked(0x166); // fruit of repun
  KensuInCabin = tracked(0x167); // added by randomizer if fog lamp not needed
  // unused 168 magic ring chest
  MtSabreWestNearKensuChest = tracked(0x169); // magic ring
  MtSabreWestLeftChest = tracked(0x16a); // warp boots
  FortressMadoUpperBehindWallChest = tracked(0x16b); // magic ring
  PyramidChest = tracked(0x16c); // magic ring
  CryptRightChest = tracked(0x16d); // opel statue
  KarmineBasementLowerLeftChest = tracked(0x16e); // warp boots
  FortressMadoLowerSoutheastChest = tracked(0x16f); // magic ring
  // = tracked(0x170); // mimic / medical herb
  // TODO - add all the mimics, give them stable numbers?
  FogLampCaveMiddleNorthMimic = tracked(0x170);
  FogLampCaveMiddleSouthwestMimic = tracked(0x171);
  WaterfallCaveFrontMimic = tracked(0x172);
  EvilSpiritIslandRiverRightMimic = tracked(0x173);
  MtHydraFinalCaveMimic = tracked(0x174);
  StxyLeftNorthMimic = tracked(0x175);
  StxyRightNorthMimic = tracked(0x176);
  StxyRightSouthMimic = tracked(0x177);
  CryptLeftPitMimic = tracked(0x178);
  KarmineBasementUpperMiddleMimic = tracked(0x179);
  KarmineBasementUpperRightMimic = tracked(0x17a);
  KarmineBasementLowerRightMimic = tracked(0x17b);
  EastCaveNorthwestMimic = tracked(0x17c);
  // TODO - mimics 13..16 ?

  // 180 .. 1ff => fixed flags for overflow buffer.

  // 200 .. 27f => fixed flags for items.
  SwordOfWind = tracked(0x200);
  SwordOfFire = tracked(0x201);
  SwordOfWater = tracked(0x202);
  SwordOfThunder = tracked(0x203);
  Crystalis = tracked(0x204);
  BallOfWind = tracked(0x205);
  TornadoBracelet = tracked(0x206);
  BallOfFire = tracked(0x207);
  FlameBracelet = tracked(0x208);
  BallOfWater = tracked(0x209);
  BlizzardBracelet = tracked(0x20a);
  BallOfThunder = tracked(0x20b);
  StormBracelet = tracked(0x20c);
  CarapaceShield = tracked(0x20d);
  BronzeShield = tracked(0x20e);
  PlatinumShield = tracked(0x20f);
  MirroredShield = tracked(0x210);
  CeramicShield = tracked(0x211);
  SacredShield = tracked(0x212);
  BattleShield = tracked(0x213);
  PsychoShield = tracked(0x214);
  TannedHide = tracked(0x215);
  LeatherArmor = tracked(0x216);
  BronzeArmor = tracked(0x217);
  PlatinumArmor = tracked(0x218);
  SoldierSuit = tracked(0x219);
  CeramicSuit = tracked(0x21a);
  BattleArmor = tracked(0x21b);
  PsychoArmor = tracked(0x21c);
  MedicalHerb = tracked(0x21d);
  Antidote = tracked(0x21e);
  LysisPlant = tracked(0x21f);
  FruitOfLime = tracked(0x220);
  FruitOfPower = tracked(0x221);
  MagicRing = tracked(0x222);
  FruitOfRepun = tracked(0x223);
  WarpBoots = tracked(0x224);
  StatueOfOnyx = tracked(0x225);
  OpelStatue = tracked(0x226);
  InsectFlute = tracked(0x227);
  FluteOfLime = tracked(0x228);
  GasMask = tracked(0x229);
  PowerRing = tracked(0x22a);
  WarriorRing = tracked(0x22b);
  IronNecklace = tracked(0x22c);
  DeosPendant = tracked(0x22d);
  RabbitBoots = tracked(0x22e);
  LeatherBoots = tracked(0x22f);
  ShieldRing = tracked(0x230);
  AlarmFlute = tracked(0x231);
  WindmillKey = tracked(0x232);
  KeyToPrison = tracked(0x233);
  KeyToStxy = tracked(0x234);
  FogLamp = tracked(0x235);
  ShellFlute = tracked(0x236);
  EyeGlasses = tracked(0x237);
  BrokenStatue = tracked(0x238);
  GlowingLamp = tracked(0x239);
  StatueOfGold = tracked(0x23a);
  LovePendant = tracked(0x23b);
  KirisaPlant = tracked(0x23c);
  IvoryStatue = tracked(0x23d);
  BowOfMoon = tracked(0x23e);
  BowOfSun = tracked(0x23f);
  BowOfTruth = tracked(0x240);
  Refresh = tracked(0x241);
  Paralysis = tracked(0x242);
  Telepathy = tracked(0x243);
  Teleport = tracked(0x244);
  Recover = tracked(0x245);
  Barrier = tracked(0x246);
  Change = tracked(0x247);
  Flight = tracked(0x248);

  // 280 .. 2f0 => fixed flags for walls.
  CalmedAngrySea = tracked(0x283);
  OpenedJoelShed = tracked(0x287);
  Draygon2 = tracked(0x28d);
  OpenedCrypt = tracked(0x28e);
  // NOTE: 28f is flagged for draygon's floor, but is unused and unneeded
  OpenedStxy = tracked(0x2b0);
  OpenedSwanGate = tracked(0x2b3);
  OpenedPrison = tracked(0x2d8);
  OpenedSealedCave = tracked(0x2ee);

  // Nothing ever sets this, so just use it right out.
  AlwaysTrue = fixed(0x2f0, TRUE);

  WarpLeaf = tracked(0x2f5);
  WarpBrynmaer = tracked(0x2f6);
  WarpOak = tracked(0x2f7);
  WarpNadare = tracked(0x2f8);
  WarpPortoa = tracked(0x2f9);
  WarpAmazones = tracked(0x2fa);
  WarpJoel = tracked(0x2fb);
  WarpZombie = tracked(~0x2fb);
  WarpSwan = tracked(0x2fc);
  WarpShyron = tracked(0x2fd);
  WarpGoa = tracked(0x2fe);
  WarpSahara = tracked(0x2ff);

  // Pseudo flags
  Sword = pseudo(this);
  Money = pseudo(this);
  BreakStone = pseudo(this);
  BreakIce = pseudo(this);
  FormBridge = pseudo(this);
  BreakIron = pseudo(this);
  TravelSwamp = pseudo(this);
  CrossPain = pseudo(this);
  ClimbWaterfall = pseudo(this);
  BuyHealing = pseudo(this);
  BuyWarp = pseudo(this);
  ShootingStatue = pseudo(this); // pass north through statues
  ClimbSlope8 = pseudo(this); // climb slopes height 6-8
  ClimbSlope9 = pseudo(this); // climb slopes height 9
  ClimbSlope10 = pseudo(this); // climb all slopes
  WildWarp = pseudo(this);
  TriggerSkip = pseudo(this);
  RageSkip = pseudo(this);
  ShootingStatueSouth = pseudo(this); // pass south through statues

  // Map of flags that are "waiting" for a previously-used ID.
  // Signified with a negative (one's complement) ID in the Flag object.
  private readonly unallocated = new Map<number, Flag>();

  // // Map of available IDs.
  // private readonly available = [
  //   new Set<number>(), // 000 .. 0ff
  //   new Set<number>(), // 100 .. 1ff
  //   new Set<number>(), // 200 .. 2ff
  // ];

  constructor(readonly rom: Rom) {
    // Build up all the flags as actual instances of Flag.
    for (const key in this) {
      if (!this.hasOwnProperty(key)) continue;
      const spec = this[key];
      if (!(spec as any)[FLAG]) continue;
      // Replace it with an actual flag.  We may need a name, etc...
      const keyNumber = Number(key);
      const id = typeof spec.id === 'number' ? spec.id : keyNumber;
      if (isNaN(id)) throw new Error(`Bad flag: ${key}`);
      const name =
          spec.name ||
          (isNaN(keyNumber) ? upperCamelToSpaces(key) : flagName(id));
      const flag = new Flag(this, name, id, spec);
      this[key] = flag;
      // If ID is negative, then store it as unallocated.
      if (flag.id < 0) {
        this.unallocated.set(~flag.id, flag);
      } else if (!this[flag.id]) {
        this[flag.id] = flag;
      }
    }

    // Now add the missing flags.
    for (let i = 0x100; i < 0x180; i++) {
      const name = `Check ${hex(i & 0xff)}`;
      if (this[i]) {
        if (!this[i].fixed && !this.unallocated.has(i)) {
          this.unallocated.set(
              i, new Flag(this, name, ~i, {fixed: true}));
        }
      } else {
        this[i] = new Flag(this, name, i, {fixed: true});
      }
    }
    for (let i = 0x180; i < 0x280; i++) {
      if (!this[i]) {
        // Item buffer here
        const type = i < 0x200 ? 'Buffer ' : 'Item ';
        this[i] = new Flag(this, type + hex(i), i, {fixed: true});
      }
    }
    // For the remainder, find walls in maps.
    //  - do we need to pull them from locations?? or this doing anything??
    for (const loc of rom.locations) {
      for (const f of loc.flags) {
        if (this[f.flag]) continue;
        this[f.flag] = wallFlag(this, f.flag);
      }
    }
  }

  // Saves > 470 bytes of redundant flag sets!
  defrag() {
    // make a map of new IDs for everything.
    const remapping = new Map<number, (f: FlagContext) => number>();
    const unused = new Set<number>();

    // first handle all the obsolete flags - once the remapping is pulled off
    // we can simply unref them.
    for (let i = 0; i < 0x300; i++) {
      const f = this[i];
      const o = f?.obsolete;
      if (o) {
        remapping.set(i, (c: FlagContext) => c.set ? -1 : o.call(f, c));
        delete this[i];
      } else if (!f) {
        unused.add(i);
      }
    }

    // now move all the movable flags.
    let i = 0;
    let j = 0x2ff;
    // WARNING: i and j are bound to the outer scope!  Closing over them
    // will NOT work as intended.
    function ret<T>(x: T): () => T { return () => x; }
    while (i < j) {
      if (this[i] || this.unallocated.has(i)) { i++; continue; }
      const f = this[j];
      if (!f || f.fixed) { j--; continue; }
      // f is a movable flag.  Move it to i.
      remapping.set(j, ret(i));
      (f as Writable<Flag>).id = i;
      this[i] = f;
      delete this[j];
      i++;
      j--;
    }

    // go through all the possible places we could find flags and remap!
    this.remapFlags(remapping, unused);

    // Unallocated flags don't need any remapping.
    for (const [want, flag] of this.unallocated) {
      if (this[want]) continue;
      this.unallocated.delete(want);
      (this[want] = flag as Writable<Flag>).id = want;
    }

    //if (this.unallocated.size) throw new Error(`Could not fully allocate`);

    // Report how the defrag went?
    const free = [];
    for (let i = 0; i < 0x300; i++) {
      if (!this[i]) free.push(hex3(i));
    }
    if (DEBUG) console.log(`Free flags: ${free.join(' ')}`);
  }

  insertZombieWarpFlag() {
    // Make space for the new flag between Joel and Swan
    const remapping = new Map<number, (f: FlagContext) => number>();
    if (this[0x2f4]) throw new Error(`No space to insert warp flag`);
    const newId = ~this.WarpZombie.id;
    if (newId < 0) throw new Error(`Bad WarpZombie id`);
    for (let i = 0x2f4; i < newId; i++) {
      this[i] = this[i + 1];
      (this[i] as Writable<Flag>).id = i;
      remapping.set(i + 1, () => i);
    }
    (this.WarpZombie as Writable<Flag>).id = newId;
    this[newId] = this.WarpZombie;
    this.remapFlags(remapping);
  }

  remap(src: number, dest: number) {
    this.remapFlags(new Map([[src, () => dest]]));
  }

  remapFlags(remapping: Map<number, (ctx: FlagContext) => number>,
             unused?: Set<number>) {
    function processList(list: number[], ctx: FlagContext) {
      for (let i = list.length - 1; i >= 0; i--) {
        let f = list[i];
        if (f < 0) f = ~f;
        if (unused && unused.has(f)) {
          throw new Error(`SHOULD BE UNUSED: ${hex(f)}`);
        }
        const remap = remapping.get(f);
        if (remap == null) continue;
        let mapped = remap({...ctx, index: i});
        if (mapped >= 0) {
          list[i] = list[i] < 0 ? ~mapped : mapped;
        } else {
          list.splice(i, 1);
        }
      }
    }
    function process(flag: number, ctx: FlagContext) {
      let unsigned = flag < 0 ? ~flag : flag;
      if (unused && unused.has(unsigned)) {
        throw new Error(`SHOULD BE UNUSED: ${hex(unsigned)}`);
      }
      const remap = remapping.get(unsigned);
      if (remap == null) return flag;
      let mapped = remap(ctx);
      if (mapped < 0) throw new Error(`Bad flag delete`);
      return flag < 0 ? ~mapped : mapped;
    }

    // Location flags
    for (const location of this.rom.locations) {
      if (!location.used) continue;
      for (const flag of location.flags) {
        flag.flag = process(flag.flag, {location});
      }
    }

    // NPC flags
    for (const npc of this.rom.npcs) {
      if (!npc.used) continue;
      for (const [loc, conds] of npc.spawnConditions) {
        processList(conds, {npc, spawn: loc});
      }
      for (const d of npc.globalDialogs) {
        d.condition = process(d.condition, {npc, dialog: true});
      }
      for (const [, ds] of npc.localDialogs) {
        for (const d of ds) {
          d.condition = process(d.condition, {npc, dialog: true});
          processList(d.flags, {npc, dialog: true, set: true});
        }
      }
    }

    // Trigger flags
    for (const trigger of this.rom.triggers) {
      if (!trigger.used) continue;
      processList(trigger.conditions, {trigger});
      processList(trigger.flags, {trigger, set: true});
    }

    // TODO - consider updating telepathy?!?

    // ItemGet flags
    for (const itemGet of this.rom.itemGets) {
      processList(itemGet.flags, {set: true});
    }
    for (const item of this.rom.items) {
      for (const itemUse of item.itemUseData) {
        if (itemUse.kind === 'flag') {
          itemUse.want = process(itemUse.want, {});
        }
        processList(itemUse.flags, {set: true});
      }
    }

    // TODO - anything else?
  }

  // TODO - manipulate this stuff

  // private readonly available = new Set<number>([
  //   // TODO - there's a ton of lower flags as well.
  //   // TODO - we can repurpose all the old item flags.
  //   0x270, 0x271, 0x272, 0x273, 0x274, 0x275, 0x276, 0x277,
  //   0x278, 0x279, 0x27a, 0x27b, 0x27c, 0x27d, 0x27e, 0x27f,
  //   0x280, 0x281, 0x288, 0x289, 0x28a, 0x28b, 0x28c,
  //   0x2a7, 0x2ab, 0x2b4,
  // ]);

  alloc(segment: number = 0): number {
    if (segment !== 0x200) throw new Error(`Cannot allocate outside 2xx`);
    for (let flag = 0x280; flag < 0x300; flag++) {
      if (!this[flag]) {
        this[flag] = wallFlag(this, flag);
        return flag;
      }
    }
    throw new Error(`No free flags.`);
  }

  free(flag: number) {
    // TODO - is there more to this?  check for something else?
    delete this[flag];
  }
}

function flagName(id: number): string {
  return 'Flag ' + hex3(id);
}

function wallFlag(flags: Flags, id: number): Flag {
  return new Flag(flags, 'Wall ' + hex(id & 0xff), id, {fixed: true});
}
