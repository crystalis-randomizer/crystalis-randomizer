import { hex, hex3, upperCamelToSpaces } from './util.js';
const DEBUG = false;
const FLAG = Symbol();
const FALSE = { assumeFalse: true };
const TRUE = { assumeTrue: true };
const TRACK = { track: true };
const IGNORE = {};
export class Flag {
    constructor(flags, name, id, data) {
        var _a;
        this.flags = flags;
        this.name = name;
        this.id = id;
        this.fixed = data.fixed || false;
        this.obsolete = data.obsolete;
        this.logic = (_a = data.logic) !== null && _a !== void 0 ? _a : TRACK;
    }
    get c() {
        return this.id;
    }
    get r() {
        return [[this.id]];
    }
    get debug() {
        return this.id.toString(16).padStart(3, '0') + ' ' + this.name;
    }
    get item() {
        if (this.id < 0x100 || this.id > 0x17f) {
            throw new Error(`not a slot: ${this.id}`);
        }
        const itemGetId = this.flags.rom.slots[this.id & 0xff];
        const itemId = this.flags.rom.itemGets[itemGetId].itemId;
        const item = this.flags.rom.items[itemId];
        if (!item)
            throw new Error(`no item`);
        return item;
    }
}
function obsolete(obsolete) {
    if (typeof obsolete === 'number')
        obsolete = (o => () => o)(obsolete);
    return { obsolete, [FLAG]: true };
}
function fixed(id, logic = IGNORE) {
    return { id, fixed: true, [FLAG]: true, logic };
}
function tracked(id) {
    return fixed(id, TRACK);
}
function movable(id, logic = IGNORE) {
    return { id, [FLAG]: true, logic };
}
function dialogProgression(name, logic = IGNORE) {
    return { name, [FLAG]: true, logic };
}
function dialogToggle(name, logic = IGNORE) {
    return { name, [FLAG]: true, logic };
}
function pseudo(owner) {
    const id = pseudoCounter.get(owner) || 0x400;
    pseudoCounter.set(owner, id + 1);
    return { id, [FLAG]: true, logic: TRACK };
}
const pseudoCounter = new WeakMap();
export class Flags {
    constructor(rom) {
        this.rom = rom;
        this[0x000] = fixed(0x000, FALSE);
        this[0x001] = fixed(0x001);
        this[0x002] = fixed(0x002);
        this[0x003] = fixed(0x003);
        this[0x004] = fixed(0x004);
        this[0x005] = fixed(0x005);
        this[0x006] = fixed(0x006);
        this[0x007] = fixed(0x007);
        this[0x008] = fixed(0x008);
        this[0x009] = fixed(0x009);
        this.UsedWindmillKey = fixed(0x00a, TRACK);
        this[0x00b] = obsolete(0x100);
        this[0x00c] = dialogToggle('Leaf villager');
        this.LeafVillagersRescued = movable(0x00d);
        this[0x00e] = obsolete((s) => {
            var _a;
            if (((_a = s.trigger) === null || _a === void 0 ? void 0 : _a.id) === 0x85)
                return 0x143;
            return 0x243;
        });
        this.WokeWindmillGuard = movable(0x00f, TRACK);
        this.TurnedInKirisaPlant = movable(0x010);
        this[0x011] = dialogProgression('Welcomed to Amazones');
        this[0x012] = dialogProgression('Treasure hunter dead');
        this[0x013] = obsolete(0x138);
        this[0x016] = dialogProgression('Portoa queen Rage hint');
        this[0x017] = obsolete(0x102);
        this.EnteredUndergroundChannel = movable(0x018, TRACK);
        this[0x019] = dialogToggle('Portoa queen tired of talking');
        this[0x01a] = dialogProgression('Initial talk with Portoa queen');
        this.MesiaRecording = movable(0x01b, TRACK);
        this[0x01c] = obsolete(0x110);
        this.TalkedToFortuneTeller = movable(0x1d, TRACK);
        this.QueenRevealed = movable(0x01e, TRACK);
        this[0x01f] = obsolete(0x109);
        this.QueenNotInThroneRoom = movable(0x020, TRACK);
        this.ReturnedFogLamp = movable(0x021, TRACK);
        this[0x022] = dialogProgression('Sahara elder');
        this[0x023] = dialogProgression('Sahara elder daughter');
        this[0x024] = obsolete(0x13d);
        this[0x025] = obsolete(0x136);
        this[0x026] = obsolete(0x2fd);
        this.ShyronMassacre = fixed(0x027, TRACK);
        this.ChangeWoman = fixed(0x028);
        this.ChangeAkahana = fixed(0x029);
        this.ChangeSoldier = fixed(0x02a);
        this.ChangeStom = fixed(0x02b);
        this[0x02d] = dialogProgression('Shyron sages');
        this[0x02e] = obsolete(0x12d);
        this.UsedBowOfTruth = fixed(0x02f);
        this[0x031] = dialogProgression('Zombie town');
        this[0x032] = obsolete(0x137);
        this[0x034] = dialogProgression('Akahana in waterfall cave');
        this.CuredAkahana = movable(0x035, TRACK);
        this[0x036] = dialogProgression('Akahana Shyron');
        this[0x037] = obsolete(0x142);
        this.LeafAbduction = movable(0x038, TRACK);
        this[0x039] = obsolete(0x141);
        this.TalkedToZebuInCave = movable(0x03a, TRACK);
        this.TalkedToZebuInShyron = movable(0x03b, TRACK);
        this[0x03c] = obsolete(0x13b);
        this[0x03d] = dialogProgression('Asina in Shyron temple');
        this.FoundKensuInDanceHall = movable(0x03e, TRACK);
        this[0x03f] = obsolete((s) => {
            var _a;
            if (((_a = s.trigger) === null || _a === void 0 ? void 0 : _a.id) === 0xba)
                return 0x244;
            return 0x144;
        });
        this[0x040] = dialogProgression('Tornel in Shyron temple');
        this[0x041] = obsolete(0x107);
        this[0x044] = obsolete(0x107);
        this.RescuedChild = fixed(0x045, TRACK);
        this.UsedInsectFlute = fixed(0x046);
        this.RescuedLeafElder = movable(0x047);
        this[0x048] = dialogProgression('Treasure hunter embarked');
        this[0x049] = obsolete(0x101);
        this[0x04a] = dialogProgression('Boat owner');
        this[0x04b] = dialogToggle('Shyron sick men');
        this[0x04c] = dialogToggle('Shyron training men 1');
        this[0x04d] = dialogToggle('Shyron training men 2');
        this[0x04e] = obsolete(0x106);
        this[0x04f] = obsolete(0x12b);
        this.GivenStatueToAkahana = movable(0x050);
        this[0x051] = obsolete(0x146);
        this.TalkedToDwarfMother = movable(0x052, TRACK);
        this.LeadingChild = fixed(0x053, TRACK);
        this[0x055] = dialogProgression('Zebu rescued');
        this[0x056] = dialogProgression('Tornel rescued');
        this[0x057] = dialogProgression('Asina rescued');
        this.MtSabreGuardsDespawned = movable(0x05b, TRUE);
        this[0x05e] = obsolete(0x28d);
        this[0x05f] = obsolete(0x203);
        this.TalkedToStomInSwan = movable(0x061, TRACK);
        this[0x062] = obsolete(0x151);
        this[0x063] = obsolete(0x147);
        this.CuredKensu = movable(0x065, TRACK);
        this[0x067] = obsolete(0x10b);
        this[0x068] = obsolete(0x104);
        this.StonedPeopleCured = movable(0x06a, TRACK);
        this[0x06c] = obsolete(0x11c);
        this.CurrentlyRidingDolphin = fixed(~0x06e, TRACK);
        this.ParalyzedKensuInTavern = fixed(0x070);
        this.ParalyzedKensuInDanceHall = fixed(0x071);
        this.FoundKensuInTavern = movable(0x072, TRACK);
        this[0x073] = dialogProgression('Startled man in Leaf');
        this[0x075] = obsolete(0x139);
        this[0x076] = dialogProgression('Kensu in Goa');
        this[0x077] = obsolete(0x108);
        this[0x078] = obsolete(0x10c);
        this[0x079] = obsolete(0x140);
        this[0x07a] = obsolete(0x10a);
        this[0x07b] = obsolete(0x109);
        this[0x07d] = obsolete(0x13f);
        this[0x07e] = dialogProgression('Mt Sabre guards 1');
        this[0x07f] = dialogProgression('Mt Sabre guards 2');
        this.AlarmFluteUsedOnce = fixed(0x76);
        this.FluteOfLimeUsedOnce = fixed(0x77);
        this[0x082] = obsolete(0x140);
        this[0x083] = dialogProgression('Rescued Leaf elder');
        this.LeafVillagersCurrentlyAbducted = movable(0x084);
        this.LeafElderCurrentlyAbducted = movable(0x085);
        this[0x087] = obsolete(0x105);
        this[0x088] = obsolete(0x132);
        this[0x089] = dialogProgression('Dead Stom\'s girlfriend');
        this[0x08a] = dialogProgression('Dead Stom');
        this[0x08b] = obsolete(0x236);
        this[0x08d] = obsolete(0x137);
        this[0x08f] = obsolete(0x283);
        this[0x090] = dialogProgression('Stoned people gone');
        this[0x092] = obsolete(0x128);
        this[0x096] = dialogToggle('Leaf elder daughter');
        this[0x097] = dialogToggle('Leaf villager');
        this[0x098] = dialogProgression('Nadare villager');
        this.AbleToRideDolphin = movable(0x09b, TRACK);
        this.PortoaQueenGoingAway = movable(0x09c);
        this[0x0a0] = obsolete(0x127);
        this[0x0a3] = dialogToggle('Portoa queen/fortune teller');
        this.WokeKensuInLighthouse = movable(0x0a4, TRACK);
        this[0x0a5] = obsolete(0x131);
        this[0x0a6] = dialogProgression('Oak elder 1', FALSE);
        this[0x0a7] = dialogToggle('Swan dancer');
        this[0x0a8] = dialogProgression('Oak elder 2', FALSE);
        this.TalkedToLeafRabbit = movable(0x0a9, TRACK);
        this[0x0aa] = obsolete(0x11d);
        this[0x0ab] = obsolete(0x150);
        this[0x0ad] = obsolete(0x152);
        this[0x0ae] = obsolete(0x153);
        this[0x0af] = obsolete(0x154);
        this[0x0b0] = obsolete(0x155);
        this[0x0b1] = obsolete(0x156);
        this[0x0b2] = obsolete(0x157);
        this[0x0b3] = obsolete(0x158);
        this[0x0b4] = obsolete(0x159);
        this[0x0b5] = obsolete(0x15a);
        this[0x0b6] = obsolete(0x11f);
        this[0x0b7] = obsolete(0x15c);
        this[0x0b8] = obsolete(0x15d);
        this[0x0b9] = obsolete(0x11e);
        this[0x0ba] = obsolete(0x15e);
        this[0x0bb] = obsolete(0x15f);
        this[0x0bc] = obsolete(0x160);
        this[0x0bd] = obsolete(0x120);
        this[0x0be] = obsolete(0x121);
        this[0x0bf] = obsolete(0x162);
        this[0x0c0] = obsolete(0x163);
        this[0x0c1] = obsolete(0x164);
        this[0x0c2] = obsolete(0x122);
        this[0x0c3] = obsolete(0x165);
        this[0x0c4] = obsolete(0x166);
        this[0x0c5] = obsolete(0x16b);
        this[0x0c6] = obsolete(0x16c);
        this[0x0c7] = obsolete(0x123);
        this[0x0c8] = obsolete(0x124);
        this[0x0c9] = obsolete(0x16a);
        this[0x0ca] = obsolete(0x13d);
        this[0x0cb] = obsolete(0x12a);
        this[0x0cc] = obsolete(0x11c);
        this[0x0cd] = obsolete(0x114);
        this[0x0ce] = obsolete(0x125);
        this[0x0cf] = obsolete(0x133);
        this[0x0d0] = obsolete(0x128);
        this[0x0d1] = obsolete(0x135);
        this[0x0d2] = obsolete(0x169);
        this[0x0d3] = obsolete(0x126);
        this[0x0d4] = obsolete(0x15b);
        this[0x0d5] = dialogToggle('Portoa queen 1');
        this[0x0d6] = dialogToggle('Portoa queen 2');
        this[0x0d7] = dialogToggle('Portoa queen 3');
        this[0x0d8] = dialogProgression('Kensu rescued');
        this[0x0d9] = dialogToggle('Stoned pair');
        this[0x0da] = dialogProgression('Kensu gone from tavern');
        this[0x0db] = dialogToggle('In Sabera\'s trap');
        this[0x0dc] = obsolete(0x16f);
        this[0x0dd] = obsolete(0x170);
        this[0x0de] = obsolete(0x12c);
        this[0x0df] = obsolete(0x11b);
        this[0x0e0] = dialogProgression('Dead Akahana');
        this[0x0e4] = obsolete(0x13c);
        this[0x0e5] = obsolete(0x16e);
        this[0x0e6] = obsolete(0x16d);
        this[0x0e7] = obsolete(0x12f);
        this[0x0e8] = dialogProgression('Dead Shyron villager');
        this[0x0e9] = dialogProgression('Dead Shyron guard');
        this[0x0ea] = dialogProgression('Tower message 1');
        this[0x0eb] = dialogProgression('Tower message 2');
        this[0x0ec] = dialogProgression('Tower message 3');
        this[0x0ed] = dialogProgression('Mesia');
        this.TalkedToZebuStudent = movable(0x0ee, TRACK);
        this[0x100] = obsolete(0x12e);
        this[0x101] = obsolete(0x107);
        this[0x102] = obsolete(0x108);
        this[0x103] = obsolete(0x109);
        this[0x105] = obsolete(0x126);
        this[0x106] = obsolete(0x123);
        this[0x107] = obsolete(0x112);
        this[0x108] = obsolete(0x13d);
        this.UsedBowOfMoon = movable(0x109);
        this.UsedBowOfSun = movable(0x10a);
        this[0x10b] = obsolete(0x11c);
        this[0x10c] = obsolete(0x161);
        this.LeafElder = tracked(~0x100);
        this.OakElder = tracked(~0x101);
        this.WaterfallCaveSwordOfWaterChest = tracked(~0x102);
        this.StxyLeftUpperSwordOfThunderChest = tracked(~0x103);
        this.MesiaInTower = tracked(0x104);
        this.SealedCaveBallOfWindChest = tracked(~0x105);
        this.MtSabreWestTornadoBraceletChest = tracked(~0x106);
        this.GiantInsect = tracked(~0x107);
        this.Kelbesque1 = tracked(~0x108);
        this.Rage = tracked(~0x109);
        this.AryllisBasementChest = tracked(~0x10a);
        this.Mado1 = tracked(~0x10b);
        this.StormBraceletChest = tracked(~0x10c);
        this.WaterfallCaveRiverLeftChest = tracked(0x110);
        this.Mado2 = tracked(0x112);
        this.StxyRightMiddleChest = tracked(0x114);
        this.BattleArmorChest = tracked(0x11b);
        this.Draygon1 = tracked(0x11c);
        this.SealedCaveSmallRoomBackChest = tracked(0x11d);
        this.SealedCaveBigRoomNortheastChest = tracked(0x11e);
        this.FogLampCaveFrontChest = tracked(0x11f);
        this.MtHydraRightChest = tracked(0x120);
        this.SaberaUpstairsLeftChest = tracked(0x121);
        this.EvilSpiritIslandLowerChest = tracked(0x122);
        this.Sabera2 = tracked(0x123);
        this.SealedCaveSmallRoomFrontChest = tracked(0x124);
        this.CordelGrass = tracked(0x125);
        this.Kelbesque2 = tracked(0x126);
        this.OakMother = tracked(0x127);
        this.PortoaQueen = tracked(0x128);
        this.AkahanaStatueOfOnyxTradein = tracked(0x129);
        this.OasisCaveFortressBasementChest = tracked(0x12a);
        this.Brokahana = tracked(0x12b);
        this.EvilSpiritIslandRiverLeftChest = tracked(0x12c);
        this.Deo = tracked(0x12d);
        this.Vampire1 = tracked(0x12e);
        this.OasisCaveNorthwestChest = tracked(0x12f);
        this.AkahanaFluteOfLimeTradein = tracked(0x130);
        this.ZebuStudent = tracked(0x131);
        this.WindmillGuardAlarmFluteTradein = tracked(0x132);
        this.MtSabreNorthBackOfPrisonChest = tracked(0x133);
        this.ZebuInShyron = tracked(0x134);
        this.FogLampCaveBackChest = tracked(0x135);
        this.InjuredDolphin = tracked(0x136);
        this.Clark = tracked(0x137);
        this.Sabera1 = tracked(0x138);
        this.KensuInLighthouse = tracked(0x139);
        this.RepairedStatue = tracked(0x13a);
        this.UndergroundChannelUnderwaterChest = tracked(0x13b);
        this.KirisaMeadow = tracked(0x13c);
        this.Karmine = tracked(0x13d);
        this.Aryllis = tracked(0x13e);
        this.MtHydraSummitChest = tracked(0x13f);
        this.AztecaInPyramid = tracked(0x140);
        this.ZebuAtWindmill = tracked(0x141);
        this.MtSabreNorthSummit = tracked(0x142);
        this.StomFightReward = tracked(0x143);
        this.MtSabreWestTornel = tracked(0x144);
        this.AsinaInBackRoom = tracked(0x145);
        this.BehindWhirlpool = tracked(0x146);
        this.KensuInSwan = tracked(0x147);
        this.SlimedKensu = tracked(0x148);
        this.MezameShrineLeftChest = tracked(0x149);
        this.SealedCaveBigRoomSouthwestChest = tracked(0x150);
        this.MtSabreWestRightChest = tracked(0x152);
        this.MtSabreNorthMiddleChest = tracked(0x153);
        this.FortressMadoHellwayChest = tracked(0x154);
        this.SaberaUpstairsRightChest = tracked(0x155);
        this.MtHydraFarLeftChest = tracked(0x156);
        this.StxyLeftLowerChest = tracked(0x157);
        this.KarmineBasementLowerMiddleChest = tracked(0x158);
        this.EastCaveNortheastChest = tracked(0x159);
        this.OasisCaveEntranceAcrossRiverChest = tracked(0x15a);
        this.EvilSpiritIslandExitChest = tracked(0x15c);
        this.FortressSaberaMiddleChest = tracked(0x15d);
        this.MtSabreNorthUnderBridgeChest = tracked(0x15e);
        this.KirisaPlantCaveChest = tracked(0x15f);
        this.FortressMadoUpperNorthChest = tracked(0x160);
        this.Vampire2 = tracked(0x161);
        this.FortressSaberaNorthwestChest = tracked(0x162);
        this.FortressMadoLowerCenterNorthChest = tracked(0x163);
        this.OasisCaveNearEntranceChest = tracked(0x164);
        this.MtHydraLeftRightChest = tracked(0x165);
        this.FortressSaberaSoutheastChest = tracked(0x166);
        this.KensuInCabin = tracked(0x167);
        this.MtSabreWestNearKensuChest = tracked(0x169);
        this.MtSabreWestLeftChest = tracked(0x16a);
        this.FortressMadoUpperBehindWallChest = tracked(0x16b);
        this.PyramidChest = tracked(0x16c);
        this.CryptRightChest = tracked(0x16d);
        this.KarmineBasementLowerLeftChest = tracked(0x16e);
        this.FortressMadoLowerSoutheastChest = tracked(0x16f);
        this.FogLampCaveMiddleNorthMimic = tracked(0x170);
        this.FogLampCaveMiddleSouthwestMimic = tracked(0x171);
        this.WaterfallCaveFrontMimic = tracked(0x172);
        this.EvilSpiritIslandRiverRightMimic = tracked(0x173);
        this.MtHydraFinalCaveMimic = tracked(0x174);
        this.StxyLeftNorthMimic = tracked(0x175);
        this.StxyRightNorthMimic = tracked(0x176);
        this.StxyRightSouthMimic = tracked(0x177);
        this.CryptLeftPitMimic = tracked(0x178);
        this.KarmineBasementUpperMiddleMimic = tracked(0x179);
        this.KarmineBasementUpperRightMimic = tracked(0x17a);
        this.KarmineBasementLowerRightMimic = tracked(0x17b);
        this.EastCaveNorthwestMimic = tracked(0x17c);
        this.SwordOfWind = tracked(0x200);
        this.SwordOfFire = tracked(0x201);
        this.SwordOfWater = tracked(0x202);
        this.SwordOfThunder = tracked(0x203);
        this.Crystalis = tracked(0x204);
        this.BallOfWind = tracked(0x205);
        this.TornadoBracelet = tracked(0x206);
        this.BallOfFire = tracked(0x207);
        this.FlameBracelet = tracked(0x208);
        this.BallOfWater = tracked(0x209);
        this.BlizzardBracelet = tracked(0x20a);
        this.BallOfThunder = tracked(0x20b);
        this.StormBracelet = tracked(0x20c);
        this.CarapaceShield = tracked(0x20d);
        this.BronzeShield = tracked(0x20e);
        this.PlatinumShield = tracked(0x20f);
        this.MirroredShield = tracked(0x210);
        this.CeramicShield = tracked(0x211);
        this.SacredShield = tracked(0x212);
        this.BattleShield = tracked(0x213);
        this.PsychoShield = tracked(0x214);
        this.TannedHide = tracked(0x215);
        this.LeatherArmor = tracked(0x216);
        this.BronzeArmor = tracked(0x217);
        this.PlatinumArmor = tracked(0x218);
        this.SoldierSuit = tracked(0x219);
        this.CeramicSuit = tracked(0x21a);
        this.BattleArmor = tracked(0x21b);
        this.PsychoArmor = tracked(0x21c);
        this.MedicalHerb = tracked(0x21d);
        this.Antidote = tracked(0x21e);
        this.LysisPlant = tracked(0x21f);
        this.FruitOfLime = tracked(0x220);
        this.FruitOfPower = tracked(0x221);
        this.MagicRing = tracked(0x222);
        this.FruitOfRepun = tracked(0x223);
        this.WarpBoots = tracked(0x224);
        this.StatueOfOnyx = tracked(0x225);
        this.OpelStatue = tracked(0x226);
        this.InsectFlute = tracked(0x227);
        this.FluteOfLime = tracked(0x228);
        this.GasMask = tracked(0x229);
        this.PowerRing = tracked(0x22a);
        this.WarriorRing = tracked(0x22b);
        this.IronNecklace = tracked(0x22c);
        this.DeosPendant = tracked(0x22d);
        this.RabbitBoots = tracked(0x22e);
        this.LeatherBoots = tracked(0x22f);
        this.ShieldRing = tracked(0x230);
        this.AlarmFlute = tracked(0x231);
        this.WindmillKey = tracked(0x232);
        this.KeyToPrison = tracked(0x233);
        this.KeyToStxy = tracked(0x234);
        this.FogLamp = tracked(0x235);
        this.ShellFlute = tracked(0x236);
        this.EyeGlasses = tracked(0x237);
        this.BrokenStatue = tracked(0x238);
        this.GlowingLamp = tracked(0x239);
        this.StatueOfGold = tracked(0x23a);
        this.LovePendant = tracked(0x23b);
        this.KirisaPlant = tracked(0x23c);
        this.IvoryStatue = tracked(0x23d);
        this.BowOfMoon = tracked(0x23e);
        this.BowOfSun = tracked(0x23f);
        this.BowOfTruth = tracked(0x240);
        this.Refresh = tracked(0x241);
        this.Paralysis = tracked(0x242);
        this.Telepathy = tracked(0x243);
        this.Teleport = tracked(0x244);
        this.Recover = tracked(0x245);
        this.Barrier = tracked(0x246);
        this.Change = tracked(0x247);
        this.Flight = tracked(0x248);
        this.CalmedAngrySea = tracked(0x283);
        this.OpenedJoelShed = tracked(0x287);
        this.Draygon2 = tracked(0x28d);
        this.OpenedCrypt = tracked(0x28e);
        this.OpenedStxy = tracked(0x2b0);
        this.OpenedSwanGate = tracked(0x2b3);
        this.OpenedPrison = tracked(0x2d8);
        this.OpenedSealedCave = tracked(0x2ee);
        this.AlwaysTrue = fixed(0x2f0, TRUE);
        this.WarpLeaf = tracked(0x2f5);
        this.WarpBrynmaer = tracked(0x2f6);
        this.WarpOak = tracked(0x2f7);
        this.WarpNadare = tracked(0x2f8);
        this.WarpPortoa = tracked(0x2f9);
        this.WarpAmazones = tracked(0x2fa);
        this.WarpJoel = tracked(0x2fb);
        this.WarpZombie = tracked(~0x2fb);
        this.WarpSwan = tracked(0x2fc);
        this.WarpShyron = tracked(0x2fd);
        this.WarpGoa = tracked(0x2fe);
        this.WarpSahara = tracked(0x2ff);
        this.Sword = pseudo(this);
        this.Money = pseudo(this);
        this.BreakStone = pseudo(this);
        this.BreakIce = pseudo(this);
        this.FormBridge = pseudo(this);
        this.BreakIron = pseudo(this);
        this.TravelSwamp = pseudo(this);
        this.CrossPain = pseudo(this);
        this.ClimbWaterfall = pseudo(this);
        this.BuyHealing = pseudo(this);
        this.BuyWarp = pseudo(this);
        this.ShootingStatue = pseudo(this);
        this.ClimbSlope8 = pseudo(this);
        this.ClimbSlope9 = pseudo(this);
        this.ClimbSlope10 = pseudo(this);
        this.WildWarp = pseudo(this);
        this.TriggerSkip = pseudo(this);
        this.RageSkip = pseudo(this);
        this.unallocated = new Map();
        for (const key in this) {
            if (!this.hasOwnProperty(key))
                continue;
            const spec = this[key];
            if (!spec[FLAG])
                continue;
            const keyNumber = Number(key);
            const id = typeof spec.id === 'number' ? spec.id : keyNumber;
            if (isNaN(id))
                throw new Error(`Bad flag: ${key}`);
            const name = spec.name ||
                (isNaN(keyNumber) ? upperCamelToSpaces(key) : flagName(id));
            const flag = new Flag(this, name, id, spec);
            this[key] = flag;
            if (flag.id < 0) {
                this.unallocated.set(~flag.id, flag);
            }
            else if (!this[flag.id]) {
                this[flag.id] = flag;
            }
        }
        for (let i = 0x100; i < 0x180; i++) {
            const name = `Check ${hex(i & 0xff)}`;
            if (this[i]) {
                if (!this[i].fixed && !this.unallocated.has(i)) {
                    this.unallocated.set(i, new Flag(this, name, ~i, { fixed: true }));
                }
            }
            else {
                this[i] = new Flag(this, name, i, { fixed: true });
            }
        }
        for (let i = 0x180; i < 0x280; i++) {
            if (!this[i]) {
                const type = i < 0x200 ? 'Buffer ' : 'Item ';
                this[i] = new Flag(this, type + hex(i), i, { fixed: true });
            }
        }
        for (const loc of rom.locations) {
            for (const f of loc.flags) {
                if (this[f.flag])
                    continue;
                this[f.flag] = wallFlag(this, f.flag);
            }
        }
    }
    defrag() {
        const remapping = new Map();
        const unused = new Set();
        for (let i = 0; i < 0x300; i++) {
            const f = this[i];
            const o = f === null || f === void 0 ? void 0 : f.obsolete;
            if (o) {
                remapping.set(i, (c) => c.set ? -1 : o.call(f, c));
                delete this[i];
            }
            else if (!f) {
                unused.add(i);
            }
        }
        let i = 0;
        let j = 0x2ff;
        function ret(x) { return () => x; }
        while (i < j) {
            if (this[i] || this.unallocated.has(i)) {
                i++;
                continue;
            }
            const f = this[j];
            if (!f || f.fixed) {
                j--;
                continue;
            }
            remapping.set(j, ret(i));
            f.id = i;
            this[i] = f;
            delete this[j];
            i++;
            j--;
        }
        this.remapFlags(remapping, unused);
        for (const [want, flag] of this.unallocated) {
            if (this[want])
                continue;
            this.unallocated.delete(want);
            (this[want] = flag).id = want;
        }
        const free = [];
        for (let i = 0; i < 0x300; i++) {
            if (!this[i])
                free.push(hex3(i));
        }
        if (DEBUG)
            console.log(`Free flags: ${free.join(' ')}`);
    }
    insertZombieWarpFlag() {
        const remapping = new Map();
        if (this[0x2f4])
            throw new Error(`No space to insert warp flag`);
        const newId = ~this.WarpZombie.id;
        if (newId < 0)
            throw new Error(`Bad WarpZombie id`);
        for (let i = 0x2f4; i < newId; i++) {
            this[i] = this[i + 1];
            this[i].id = i;
            remapping.set(i + 1, () => i);
        }
        this.WarpZombie.id = newId;
        this[newId] = this.WarpZombie;
        this.remapFlags(remapping);
    }
    remap(src, dest) {
        this.remapFlags(new Map([[src, () => dest]]));
    }
    remapFlags(remapping, unused) {
        function processList(list, ctx) {
            for (let i = list.length - 1; i >= 0; i--) {
                let f = list[i];
                if (f < 0)
                    f = ~f;
                if (unused && unused.has(f)) {
                    throw new Error(`SHOULD BE UNUSED: ${hex(f)}`);
                }
                const remap = remapping.get(f);
                if (remap == null)
                    continue;
                let mapped = remap({ ...ctx, index: i });
                if (mapped >= 0) {
                    list[i] = list[i] < 0 ? ~mapped : mapped;
                }
                else {
                    list.splice(i, 1);
                }
            }
        }
        function process(flag, ctx) {
            let unsigned = flag < 0 ? ~flag : flag;
            if (unused && unused.has(unsigned)) {
                throw new Error(`SHOULD BE UNUSED: ${hex(unsigned)}`);
            }
            const remap = remapping.get(unsigned);
            if (remap == null)
                return flag;
            let mapped = remap(ctx);
            if (mapped < 0)
                throw new Error(`Bad flag delete`);
            return flag < 0 ? ~mapped : mapped;
        }
        for (const location of this.rom.locations) {
            if (!location.used)
                continue;
            for (const flag of location.flags) {
                flag.flag = process(flag.flag, { location });
            }
        }
        for (const npc of this.rom.npcs) {
            if (!npc.used)
                continue;
            for (const [loc, conds] of npc.spawnConditions) {
                processList(conds, { npc, spawn: loc });
            }
            for (const d of npc.globalDialogs) {
                d.condition = process(d.condition, { npc, dialog: true });
            }
            for (const [, ds] of npc.localDialogs) {
                for (const d of ds) {
                    d.condition = process(d.condition, { npc, dialog: true });
                    processList(d.flags, { npc, dialog: true, set: true });
                }
            }
        }
        for (const trigger of this.rom.triggers) {
            if (!trigger.used)
                continue;
            processList(trigger.conditions, { trigger });
            processList(trigger.flags, { trigger, set: true });
        }
        for (const itemGet of this.rom.itemGets) {
            processList(itemGet.flags, { set: true });
        }
        for (const item of this.rom.items) {
            for (const itemUse of item.itemUseData) {
                if (itemUse.kind === 'flag') {
                    itemUse.want = process(itemUse.want, {});
                }
                processList(itemUse.flags, { set: true });
            }
        }
    }
    alloc(segment = 0) {
        if (segment !== 0x200)
            throw new Error(`Cannot allocate outside 2xx`);
        for (let flag = 0x280; flag < 0x300; flag++) {
            if (!this[flag]) {
                this[flag] = wallFlag(this, flag);
            }
            return flag;
        }
        throw new Error(`No free flags.`);
    }
    free(flag) {
        delete this[flag];
    }
}
function flagName(id) {
    return 'Flag ' + hex3(id);
}
function wallFlag(flags, id) {
    return new Flag(flags, 'Wall ' + hex(id & 0xff), id, { fixed: true });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQztBQUVwQixNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQztBQVN0QixNQUFNLEtBQUssR0FBVSxFQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUMsQ0FBQztBQUN6QyxNQUFNLElBQUksR0FBVSxFQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUMsQ0FBQztBQUN2QyxNQUFNLEtBQUssR0FBVSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQztBQUNuQyxNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7QUFvQnpCLE1BQU0sT0FBTyxJQUFJO0lBTWYsWUFBcUIsS0FBWSxFQUNaLElBQVksRUFDWixFQUFVLEVBQ25CLElBQWM7O1FBSEwsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBRTdCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7UUFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLFNBQUcsSUFBSSxDQUFDLEtBQUssbUNBQUksS0FBSyxDQUFDO0lBQ25DLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQyxFQUFlLENBQUM7SUFDOUIsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDakUsQ0FBQztJQUVELElBQUksSUFBSTtRQUNOLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFLLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFLLEVBQUU7WUFDdEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdkQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN6RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBRUQsU0FBUyxRQUFRLENBQUMsUUFBaUQ7SUFDakUsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRO1FBQUUsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN0RSxPQUFPLEVBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFRLENBQUM7QUFDekMsQ0FBQztBQUNELFNBQVMsS0FBSyxDQUFDLEVBQVUsRUFBRSxLQUFLLEdBQUcsTUFBTTtJQUN2QyxPQUFPLEVBQUMs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UUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUd4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBR3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FB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QUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJdGVtfSBmcm9tICcuL2l0ZW0uanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge05wY30gZnJvbSAnLi9ucGMuanMnO1xuaW1wb3J0IHtUcmlnZ2VyfSBmcm9tICcuL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtoZXgsIGhleDMsIHVwcGVyQ2FtZWxUb1NwYWNlcywgV3JpdGFibGV9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge0NvbmRpdGlvbiwgUmVxdWlyZW1lbnR9IGZyb20gJy4uL2xvZ2ljL3JlcXVpcmVtZW50LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG5jb25zdCBGTEFHID0gU3ltYm9sKCk7XG5cbi8vIFRPRE8gLSBtYXliZSBhbGlhcyBzaG91bGQganVzdCBiZSBpbiBvdmVybGF5LnRzP1xuZXhwb3J0IGludGVyZmFjZSBMb2dpYyB7XG4gIGFzc3VtZVRydWU/OiBib29sZWFuO1xuICBhc3N1bWVGYWxzZT86IGJvb2xlYW47XG4gIHRyYWNrPzogYm9vbGVhbjtcbn1cblxuY29uc3QgRkFMU0U6IExvZ2ljID0ge2Fzc3VtZUZhbHNlOiB0cnVlfTtcbmNvbnN0IFRSVUU6IExvZ2ljID0ge2Fzc3VtZVRydWU6IHRydWV9O1xuY29uc3QgVFJBQ0s6IExvZ2ljID0ge3RyYWNrOiB0cnVlfTtcbmNvbnN0IElHTk9SRTogTG9naWMgPSB7fTtcblxuaW50ZXJmYWNlIEZsYWdEYXRhIHtcbiAgZml4ZWQ/OiBib29sZWFuO1xuICBvYnNvbGV0ZT86IChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI7XG4gIGxvZ2ljPzogTG9naWM7XG59XG5pbnRlcmZhY2UgRmxhZ0NvbnRleHQge1xuICB0cmlnZ2VyPzogVHJpZ2dlcjtcbiAgbG9jYXRpb24/OiBMb2NhdGlvbjtcbiAgbnBjPzogTnBjO1xuICBzcGF3bj86IG51bWJlcjtcbiAgaW5kZXg/OiBudW1iZXI7XG4gIGRpYWxvZz86IGJvb2xlYW47XG4gIHNldD86IGJvb2xlYW47XG4gIC8vZGlhbG9nPzogTG9jYWxEaWFsb2d8R2xvYmFsRGlhbG9nO1xuICAvL2luZGV4PzogbnVtYmVyO1xuICAvL2NvbmRpdGlvbj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcblxuICBmaXhlZDogYm9vbGVhbjtcbiAgb2Jzb2xldGU/OiAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyO1xuICBsb2dpYzogTG9naWM7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZmxhZ3M6IEZsYWdzLFxuICAgICAgICAgICAgICByZWFkb25seSBuYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGlkOiBudW1iZXIsXG4gICAgICAgICAgICAgIGRhdGE6IEZsYWdEYXRhKSB7XG4gICAgdGhpcy5maXhlZCA9IGRhdGEuZml4ZWQgfHwgZmFsc2U7XG4gICAgdGhpcy5vYnNvbGV0ZSA9IGRhdGEub2Jzb2xldGU7XG4gICAgdGhpcy5sb2dpYyA9IGRhdGEubG9naWMgPz8gVFJBQ0s7XG4gIH1cblxuICBnZXQgYygpOiBDb25kaXRpb24ge1xuICAgIHJldHVybiB0aGlzLmlkIGFzIENvbmRpdGlvbjtcbiAgfVxuXG4gIGdldCByKCk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gICAgcmV0dXJuIFtbdGhpcy5pZCBhcyBDb25kaXRpb25dXTtcbiAgfVxuXG4gIGdldCBkZWJ1ZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgzLCAnMCcpICsgJyAnICsgdGhpcy5uYW1lO1xuICB9XG5cbiAgZ2V0IGl0ZW0oKTogSXRlbSB7XG4gICAgaWYgKHRoaXMuaWQgPCAweDEwMCB8fCB0aGlzLmlkID4gMHgxN2YpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbm90IGEgc2xvdDogJHt0aGlzLmlkfWApO1xuICAgIH1cbiAgICBjb25zdCBpdGVtR2V0SWQgPSB0aGlzLmZsYWdzLnJvbS5zbG90c1t0aGlzLmlkICYgMHhmZl07XG4gICAgY29uc3QgaXRlbUlkID0gdGhpcy5mbGFncy5yb20uaXRlbUdldHNbaXRlbUdldElkXS5pdGVtSWQ7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMuZmxhZ3Mucm9tLml0ZW1zW2l0ZW1JZF07XG4gICAgaWYgKCFpdGVtKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGl0ZW1gKTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvYnNvbGV0ZShvYnNvbGV0ZTogbnVtYmVyIHwgKChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXIpKTogRmxhZyB7XG4gIGlmICh0eXBlb2Ygb2Jzb2xldGUgPT09ICdudW1iZXInKSBvYnNvbGV0ZSA9IChvID0+ICgpID0+IG8pKG9ic29sZXRlKTtcbiAgcmV0dXJuIHtvYnNvbGV0ZSwgW0ZMQUddOiB0cnVlfSBhcyBhbnk7XG59XG5mdW5jdGlvbiBmaXhlZChpZDogbnVtYmVyLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge2lkLCBmaXhlZDogdHJ1ZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gdHJhY2tlZChpZDogbnVtYmVyKTogRmxhZyB7XG4gIHJldHVybiBmaXhlZChpZCwgVFJBQ0spO1xufVxuZnVuY3Rpb24gbW92YWJsZShpZDogbnVtYmVyLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge2lkLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5mdW5jdGlvbiBkaWFsb2dQcm9ncmVzc2lvbihuYW1lOiBzdHJpbmcsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7bmFtZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gZGlhbG9nVG9nZ2xlKG5hbWU6IHN0cmluZywgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtuYW1lLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5cbmZ1bmN0aW9uIHBzZXVkbyhvd25lcjogb2JqZWN0KTogRmxhZyB7XG4gIGNvbnN0IGlkID0gcHNldWRvQ291bnRlci5nZXQob3duZXIpIHx8IDB4NDAwO1xuICBwc2V1ZG9Db3VudGVyLnNldChvd25lciwgaWQgKyAxKTtcbiAgcmV0dXJuIHtpZCwgW0ZMQUddOiB0cnVlLCBsb2dpYzogVFJBQ0t9IGFzIGFueTtcbn1cbmNvbnN0IHBzZXVkb0NvdW50ZXIgPSBuZXcgV2Vha01hcDxvYmplY3QsIG51bWJlcj4oKTtcblxuLy8gb2Jzb2xldGUgZmxhZ3MgLSBkZWxldGUgdGhlIHNldHMgKHNob3VsZCBuZXZlciBiZSBhIGNsZWFyKVxuLy8gICAgICAgICAgICAgICAgLSByZXBsYWNlIHRoZSBjaGVja3Mgd2l0aCB0aGUgcmVwbGFjZW1lbnRcblxuLy8gLS0tIG1heWJlIG9ic29sZXRlIGZsYWdzIGNhbiBoYXZlIGRpZmZlcmVudCByZXBsYWNlbWVudHMgaW5cbi8vICAgICBkaWZmZXJlbnQgY29udGV4dHM/XG4vLyAtLS0gaW4gcGFydGljdWxhciwgaXRlbWdldHMgc2hvdWxkbid0IGNhcnJ5IDF4eCBmbGFncz9cblxuXG4vKiogVHJhY2tzIHVzZWQgYW5kIHVudXNlZCBmbGFncy4gKi9cbmV4cG9ydCBjbGFzcyBGbGFncyB7XG5cbiAgW2lkOiBudW1iZXJdOiBGbGFnO1xuXG4gIC8vIDAweFxuICAweDAwMCA9IGZpeGVkKDB4MDAwLCBGQUxTRSk7XG4gIDB4MDAxID0gZml4ZWQoMHgwMDEpO1xuICAweDAwMiA9IGZpeGVkKDB4MDAyKTtcbiAgMHgwMDMgPSBmaXhlZCgweDAwMyk7XG4gIDB4MDA0ID0gZml4ZWQoMHgwMDQpO1xuICAweDAwNSA9IGZpeGVkKDB4MDA1KTtcbiAgMHgwMDYgPSBmaXhlZCgweDAwNik7XG4gIDB4MDA3ID0gZml4ZWQoMHgwMDcpO1xuICAweDAwOCA9IGZpeGVkKDB4MDA4KTtcbiAgMHgwMDkgPSBmaXhlZCgweDAwOSk7XG4gIFVzZWRXaW5kbWlsbEtleSA9IGZpeGVkKDB4MDBhLCBUUkFDSyk7XG4gIDB4MDBiID0gb2Jzb2xldGUoMHgxMDApOyAvLyBjaGVjazogc3dvcmQgb2Ygd2luZCAvIHRhbGtlZCB0byBsZWFmIGVsZGVyXG4gIDB4MDBjID0gZGlhbG9nVG9nZ2xlKCdMZWFmIHZpbGxhZ2VyJyk7XG4gIExlYWZWaWxsYWdlcnNSZXNjdWVkID0gbW92YWJsZSgweDAwZCk7XG4gIDB4MDBlID0gb2Jzb2xldGUoKHMpID0+IHtcbiAgICBpZiAocy50cmlnZ2VyPy5pZCA9PT0gMHg4NSkgcmV0dXJuIDB4MTQzOyAvLyBjaGVjazogdGVsZXBhdGh5IC8gc3RvbVxuICAgIHJldHVybiAweDI0MzsgLy8gaXRlbTogdGVsZXBhdGh5XG4gIH0pO1xuICBXb2tlV2luZG1pbGxHdWFyZCA9IG1vdmFibGUoMHgwMGYsIFRSQUNLKTtcblxuICAvLyAwMXhcbiAgVHVybmVkSW5LaXJpc2FQbGFudCA9IG1vdmFibGUoMHgwMTApO1xuICAweDAxMSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdXZWxjb21lZCB0byBBbWF6b25lcycpO1xuICAweDAxMiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUcmVhc3VyZSBodW50ZXIgZGVhZCcpO1xuICAweDAxMyA9IG9ic29sZXRlKDB4MTM4KTsgLy8gY2hlY2s6IGJyb2tlbiBzdGF0dWUgLyBzYWJlcmEgMVxuICAvLyB1bnVzZWQgMDE0LCAwMTVcbiAgMHgwMTYgPSBkaWFsb2dQcm9ncmVzc2lvbignUG9ydG9hIHF1ZWVuIFJhZ2UgaGludCcpO1xuICAweDAxNyA9IG9ic29sZXRlKDB4MTAyKTsgLy8gY2hlc3Q6IHN3b3JkIG9mIHdhdGVyXG4gIEVudGVyZWRVbmRlcmdyb3VuZENoYW5uZWwgPSBtb3ZhYmxlKDB4MDE4LCBUUkFDSyk7XG4gIDB4MDE5ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gdGlyZWQgb2YgdGFsa2luZycpO1xuICAweDAxYSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdJbml0aWFsIHRhbGsgd2l0aCBQb3J0b2EgcXVlZW4nKTtcbiAgTWVzaWFSZWNvcmRpbmcgPSBtb3ZhYmxlKDB4MDFiLCBUUkFDSyk7XG4gIDB4MDFjID0gb2Jzb2xldGUoMHgxMTApOyAvLyBpdGVtOiBtaXJyb3JlZCBzaGllbGRcbiAgVGFsa2VkVG9Gb3J0dW5lVGVsbGVyID0gbW92YWJsZSgweDFkLCBUUkFDSyk7XG4gIFF1ZWVuUmV2ZWFsZWQgPSBtb3ZhYmxlKDB4MDFlLCBUUkFDSyk7XG4gIDB4MDFmID0gb2Jzb2xldGUoMHgxMDkpOyAvLyBjaGVjazogcmFnZVxuXG4gIC8vIDAyeFxuICBRdWVlbk5vdEluVGhyb25lUm9vbSA9IG1vdmFibGUoMHgwMjAsIFRSQUNLKTtcbiAgUmV0dXJuZWRGb2dMYW1wID0gbW92YWJsZSgweDAyMSwgVFJBQ0spO1xuICAweDAyMiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTYWhhcmEgZWxkZXInKTtcbiAgMHgwMjMgPSBkaWFsb2dQcm9ncmVzc2lvbignU2FoYXJhIGVsZGVyIGRhdWdodGVyJyk7XG4gIDB4MDI0ID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICAweDAyNSA9IG9ic29sZXRlKDB4MTM2KTsgLy8gaGVhbGVkIGRvbHBoaW5cbiAgMHgwMjYgPSBvYnNvbGV0ZSgweDJmZCk7IC8vIHdhcnA6IHNoeXJvblxuICBTaHlyb25NYXNzYWNyZSA9IGZpeGVkKDB4MDI3LCBUUkFDSyk7IC8vIHByZXNodWZmbGUgaGFyZGNvZGVzIGZvciBkZWFkIHNwcml0ZXNcbiAgQ2hhbmdlV29tYW4gPSBmaXhlZCgweDAyOCk7IC8vIGhhcmRjb2RlZCBpbiBvcmlnaW5hbCByb21cbiAgQ2hhbmdlQWthaGFuYSA9IGZpeGVkKDB4MDI5KTtcbiAgQ2hhbmdlU29sZGllciA9IGZpeGVkKDB4MDJhKTtcbiAgQ2hhbmdlU3RvbSA9IGZpeGVkKDB4MDJiKTtcbiAgLy8gdW51c2VkIDAyY1xuICAweDAyZCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTaHlyb24gc2FnZXMnKTtcbiAgMHgwMmUgPSBvYnNvbGV0ZSgweDEyZCk7IC8vIGNoZWNrOiBkZW8ncyBwZW5kYW50XG4gIFVzZWRCb3dPZlRydXRoID0gZml4ZWQoMHgwMmYpOyAgLy8gbW92ZWQgZnJvbSAwODYgaW4gcHJlcGFyc2VcblxuICAvLyAwM3hcbiAgLy8gdW51c2VkIDAzMFxuICAweDAzMSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdab21iaWUgdG93bicpO1xuICAweDAzMiA9IG9ic29sZXRlKDB4MTM3KTsgLy8gY2hlY2s6IGV5ZSBnbGFzc2VzXG4gIC8vIHVudXNlZCAwMzNcbiAgMHgwMzQgPSBkaWFsb2dQcm9ncmVzc2lvbignQWthaGFuYSBpbiB3YXRlcmZhbGwgY2F2ZScpOyAvLyA/Pz9cbiAgQ3VyZWRBa2FoYW5hID0gbW92YWJsZSgweDAzNSwgVFJBQ0spO1xuICAweDAzNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBa2FoYW5hIFNoeXJvbicpO1xuICAweDAzNyA9IG9ic29sZXRlKDB4MTQyKTsgLy8gY2hlY2s6IHBhcmFseXNpc1xuICBMZWFmQWJkdWN0aW9uID0gbW92YWJsZSgweDAzOCwgVFJBQ0spOyAvLyBvbmUtd2F5IGxhdGNoXG4gIDB4MDM5ID0gb2Jzb2xldGUoMHgxNDEpOyAvLyBjaGVjazogcmVmcmVzaFxuICBUYWxrZWRUb1plYnVJbkNhdmUgPSBtb3ZhYmxlKDB4MDNhLCBUUkFDSyk7XG4gIFRhbGtlZFRvWmVidUluU2h5cm9uID0gbW92YWJsZSgweDAzYiwgVFJBQ0spO1xuICAweDAzYyA9IG9ic29sZXRlKDB4MTNiKTsgLy8gY2hlc3Q6IGxvdmUgcGVuZGFudFxuICAweDAzZCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBc2luYSBpbiBTaHlyb24gdGVtcGxlJyk7XG4gIEZvdW5kS2Vuc3VJbkRhbmNlSGFsbCA9IG1vdmFibGUoMHgwM2UsIFRSQUNLKTtcbiAgMHgwM2YgPSBvYnNvbGV0ZSgocykgPT4ge1xuICAgIGlmIChzLnRyaWdnZXI/LmlkID09PSAweGJhKSByZXR1cm4gMHgyNDQgLy8gaXRlbTogdGVsZXBvcnRcbiAgICByZXR1cm4gMHgxNDQ7IC8vIGNoZWNrOiB0ZWxlcG9ydFxuICB9KTtcblxuICAvLyAwNHhcbiAgMHgwNDAgPSBkaWFsb2dQcm9ncmVzc2lvbignVG9ybmVsIGluIFNoeXJvbiB0ZW1wbGUnKTtcbiAgMHgwNDEgPSBvYnNvbGV0ZSgweDEwNyk7IC8vIGNoZWNrOiBiYWxsIG9mIGZpcmUgLyBpbnNlY3RcbiAgLy8gdW51c2VkIDA0MlxuICAvLyB1bnVzZWQgMHgwNDMgPSBkaWFsb2dQcm9ncmVzc2lvbignT2FrJyk7XG4gIDB4MDQ0ID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIFJlc2N1ZWRDaGlsZCA9IGZpeGVkKDB4MDQ1LCBUUkFDSyk7IC8vIGhhcmRjb2RlZCAkM2U3ZDVcbiAgVXNlZEluc2VjdEZsdXRlID0gZml4ZWQoMHgwNDYpOyAvLyBjdXN0b20tYWRkZWQgJDY0ODg6NDBcbiAgUmVzY3VlZExlYWZFbGRlciA9IG1vdmFibGUoMHgwNDcpO1xuICAweDA0OCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUcmVhc3VyZSBodW50ZXIgZW1iYXJrZWQnKTtcbiAgMHgwNDkgPSBvYnNvbGV0ZSgweDEwMSk7IC8vIGNoZWNrOiBzd29yZCBvZiBmaXJlXG4gIDB4MDRhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0JvYXQgb3duZXInKTtcbiAgMHgwNGIgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiBzaWNrIG1lbicpO1xuICAweDA0YyA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHRyYWluaW5nIG1lbiAxJyk7XG4gIDB4MDRkID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gdHJhaW5pbmcgbWVuIDInKTtcbiAgMHgwNGUgPSBvYnNvbGV0ZSgweDEwNik7IC8vIGNoZXN0OiB0b3JuYWRvIGJyYWNlbGV0XG4gIDB4MDRmID0gb2Jzb2xldGUoMHgxMmIpOyAvLyBjaGVjazogd2FycmlvciByaW5nXG5cbiAgLy8gMDV4XG4gIEdpdmVuU3RhdHVlVG9Ba2FoYW5hID0gbW92YWJsZSgweDA1MCk7IC8vIGdpdmUgaXQgYmFjayBpZiB1bnN1Y2Nlc3NmdWw/XG4gIDB4MDUxID0gb2Jzb2xldGUoMHgxNDYpOyAvLyBjaGVjazogYmFycmllciAvIGFuZ3J5IHNlYVxuICBUYWxrZWRUb0R3YXJmTW90aGVyID0gbW92YWJsZSgweDA1MiwgVFJBQ0spO1xuICBMZWFkaW5nQ2hpbGQgPSBmaXhlZCgweDA1MywgVFJBQ0spOyAvLyBoYXJkY29kZWQgJDNlN2M0IGFuZCBmb2xsb3dpbmdcbiAgLy8gdW51c2VkIDA1NFxuICAweDA1NSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdaZWJ1IHJlc2N1ZWQnKTtcbiAgMHgwNTYgPSBkaWFsb2dQcm9ncmVzc2lvbignVG9ybmVsIHJlc2N1ZWQnKTtcbiAgMHgwNTcgPSBkaWFsb2dQcm9ncmVzc2lvbignQXNpbmEgcmVzY3VlZCcpO1xuICAvLyB1bnVzZWQgMDU4IC4uIDA1YVxuICBNdFNhYnJlR3VhcmRzRGVzcGF3bmVkID0gbW92YWJsZSgweDA1YiwgVFJVRSk7XG4gIC8vIHVudXNlZCAwNWMsIDA1ZFxuICAweDA1ZSA9IG9ic29sZXRlKDB4MjhkKTsgLy8gZHJheWdvbiAyXG4gIDB4MDVmID0gb2Jzb2xldGUoMHgyMDMpOyAvLyBpdGVtOiBzd29yZCBvZiB0aHVuZGVyXG4gIC8vIFRPRE8gLSBmaXggdXAgdGhlIE5QQyBzcGF3biBhbmQgdHJpZ2dlciBjb25kaXRpb25zIGluIFNoeXJvbi5cbiAgLy8gTWF5YmUganVzdCByZW1vdmUgdGhlIGN1dHNjZW5lIGVudGlyZWx5P1xuXG4gIC8vIDA2eFxuICAvLyB1bnVzZWQgMDYwXG4gIFRhbGtlZFRvU3RvbUluU3dhbiA9IG1vdmFibGUoMHgwNjEsIFRSQUNLKTtcbiAgMHgwNjIgPSBvYnNvbGV0ZSgweDE1MSk7IC8vIGNoZXN0OiBzYWNyZWQgc2hpZWxkXG4gIDB4MDYzID0gb2Jzb2xldGUoMHgxNDcpOyAvLyBjaGVjazogY2hhbmdlXG4gIC8vIHVudXNlZCAwNjRcbiAgLy8gU3dhbkdhdGVPcGVuZWQgPSBtb3ZhYmxlKH4weDA2NCk7IC8vIHdoeSB3b3VsZCB3ZSBhZGQgdGhpcz8gdXNlIDJiM1xuICBDdXJlZEtlbnN1ID0gbW92YWJsZSgweDA2NSwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDY2XG4gIDB4MDY3ID0gb2Jzb2xldGUoMHgxMGIpOyAvLyBjaGVjazogYmFsbCBvZiB0aHVuZGVyIC8gbWFkbyAxXG4gIDB4MDY4ID0gb2Jzb2xldGUoMHgxMDQpOyAvLyBjaGVjazogZm9yZ2VkIGNyeXN0YWxpc1xuICAvLyB1bnVzZWQgMDY5XG4gIFN0b25lZFBlb3BsZUN1cmVkID0gbW92YWJsZSgweDA2YSwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDZiXG4gIDB4MDZjID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIC8vIHVudXNlZCAwNmQgLi4gMDZmXG4gIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4gPSBmaXhlZCh+MHgwNmUsIFRSQUNLKTsgLy8sIHsgLy8gTk9URTogYWRkZWQgYnkgcmFuZG9cbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uaXRlbXMuU2hlbGxGbHV0ZS5pdGVtVXNlRGF0YVswXS53YW50XSxcbiAgLy8gfSk7XG5cbiAgLy8gMDd4XG4gIFBhcmFseXplZEtlbnN1SW5UYXZlcm4gPSBmaXhlZCgweDA3MCk7IC8vLCB7IC8vIGhhcmRjb2RlZCBpbiByYW5kbyBwcmVzaHVmZmxlLnNcbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uZmxhZ3MuUGFyYWx5c2lzLmlkXSxcbiAgLy8gfSk7XG4gIFBhcmFseXplZEtlbnN1SW5EYW5jZUhhbGwgPSBmaXhlZCgweDA3MSk7IC8vLCB7IC8vIGhhcmRjb2RlZCBpbiByYW5kbyBwcmVzaHVmZmxlLnNcbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uZmxhZ3MuUGFyYWx5c2lzLmlkXSxcbiAgLy8gfSk7XG4gIEZvdW5kS2Vuc3VJblRhdmVybiA9IG1vdmFibGUoMHgwNzIsIFRSQUNLKTtcbiAgMHgwNzMgPSBkaWFsb2dQcm9ncmVzc2lvbignU3RhcnRsZWQgbWFuIGluIExlYWYnKTtcbiAgLy8gdW51c2VkIDA3NFxuICAweDA3NSA9IG9ic29sZXRlKDB4MTM5KTsgLy8gY2hlY2s6IGdsb3dpbmcgbGFtcFxuICAweDA3NiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSBpbiBHb2EnKTtcbiAgMHgwNzcgPSBvYnNvbGV0ZSgweDEwOCk7IC8vIGNoZWNrOiBmbGFtZSBicmFjZWxldCAvIGtlbGJlc3F1ZSAxXG4gIDB4MDc4ID0gb2Jzb2xldGUoMHgxMGMpOyAvLyBjaGVzdDogc3Rvcm0gYnJhY2VsZXRcbiAgMHgwNzkgPSBvYnNvbGV0ZSgweDE0MCk7IC8vIGNoZWNrOiBib3cgb2YgdHJ1dGhcbiAgMHgwN2EgPSBvYnNvbGV0ZSgweDEwYSk7IC8vIGNoZXN0OiBibGl6emFyZCBicmFjZWxldFxuICAweDA3YiA9IG9ic29sZXRlKDB4MTA5KTsgLy8gcmFnZS9iYWxsIG9mIHdhdGVyXG4gIC8vIHVudXNlZCAwN2IsIDA3Y1xuICAweDA3ZCA9IG9ic29sZXRlKDB4MTNmKTsgLy8gY2hlc3Q6IGJvdyBvZiBzdW5cbiAgMHgwN2UgPSBkaWFsb2dQcm9ncmVzc2lvbignTXQgU2FicmUgZ3VhcmRzIDEnKTtcbiAgMHgwN2YgPSBkaWFsb2dQcm9ncmVzc2lvbignTXQgU2FicmUgZ3VhcmRzIDInKTtcblxuICBBbGFybUZsdXRlVXNlZE9uY2UgPSBmaXhlZCgweDc2KTsgLy8gaGFyZGNvZGVkOiBwcmVzaHVmZmxlLnMgUGF0Y2hUcmFkZUluSXRlbVxuICBGbHV0ZU9mTGltZVVzZWRPbmNlID0gZml4ZWQoMHg3Nyk7IC8vIGhhcmRjb2RlZDogcHJlc2h1ZmZsZS5zIFBhdGNoVHJhZGVJbkl0ZW1cblxuICAvLyAwOHhcbiAgLy8gdW51c2VkIDA4MCwgMDgxXG4gIDB4MDgyID0gb2Jzb2xldGUoMHgxNDApOyAvLyBjaGVjazogYm93IG9mIHRydXRoIC8gYXp0ZWNhXG4gIDB4MDgzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Jlc2N1ZWQgTGVhZiBlbGRlcicpO1xuICBMZWFmVmlsbGFnZXJzQ3VycmVudGx5QWJkdWN0ZWQgPSBtb3ZhYmxlKDB4MDg0KTtcbiAgTGVhZkVsZGVyQ3VycmVudGx5QWJkdWN0ZWQgPSBtb3ZhYmxlKDB4MDg1KTtcbiAgLy9Vc2VkQm93T2ZUcnV0aCA9IG1vdmFibGUoMHgwODYpOyAgLy8gbW92ZWQgbWFudWFsbHkgYXQgcHJlcGFyc2UgdG8gMmZcbiAgMHgwODcgPSBvYnNvbGV0ZSgweDEwNSk7IC8vIGNoZXN0OiBiYWxsIG9mIHdpbmRcbiAgMHgwODggPSBvYnNvbGV0ZSgweDEzMik7IC8vIGNoZWNrOiB3aW5kbWlsbCBrZXlcbiAgMHgwODkgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTdG9tXFwncyBnaXJsZnJpZW5kJyk7XG4gIDB4MDhhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU3RvbScpO1xuICAweDA4YiA9IG9ic29sZXRlKDB4MjM2KTsgLy8gaXRlbTogc2hlbGwgZmx1dGVcbiAgLy8gdW51c2VkIDB4MDhjID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N3YW4gZ3VhcmRzIGRlc3Bhd25lZCcpO1xuICAweDA4ZCA9IG9ic29sZXRlKDB4MTM3KTsgLy8gY2hlY2s6IGV5ZSBnbGFzc2VzXG4gIC8vIHVudXNlZCAwOGVcbiAgMHgwOGYgPSBvYnNvbGV0ZSgweDI4Myk7IC8vIGV2ZW50OiBjYWxtZWQgc2VhXG5cbiAgLy8gMDl4XG4gIDB4MDkwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N0b25lZCBwZW9wbGUgZ29uZScpO1xuICAvLyB1bnVzZWQgMDkxXG4gIDB4MDkyID0gb2Jzb2xldGUoMHgxMjgpOyAvLyBjaGVjazogZmx1dGUgb2YgbGltZVxuICAvLyB1bnVzZWQgMDkzIC4uIDA5NVxuICAweDA5NiA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiBlbGRlciBkYXVnaHRlcicpO1xuICAweDA5NyA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiB2aWxsYWdlcicpO1xuICAweDA5OCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdOYWRhcmUgdmlsbGFnZXInKTtcbiAgLy8gdW51c2VkIDA5OSwgMDlhXG4gIEFibGVUb1JpZGVEb2xwaGluID0gbW92YWJsZSgweDA5YiwgVFJBQ0spO1xuICBQb3J0b2FRdWVlbkdvaW5nQXdheSA9IG1vdmFibGUoMHgwOWMpO1xuICAvLyB1bnVzZWQgMDlkIC4uIDA5ZlxuXG4gIC8vIDBheFxuICAweDBhMCA9IG9ic29sZXRlKDB4MTI3KTsgLy8gY2hlY2s6IGluc2VjdCBmbHV0ZVxuICAvLyB1bnVzZWQgMGExLCAwYTJcbiAgMHgwYTMgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbi9mb3J0dW5lIHRlbGxlcicpO1xuICBXb2tlS2Vuc3VJbkxpZ2h0aG91c2UgPSBtb3ZhYmxlKDB4MGE0LCBUUkFDSyk7XG4gIC8vIFRPRE86IHRoaXMgbWF5IG5vdCBiZSBvYnNvbGV0ZSBpZiB0aGVyZSdzIG5vIGl0ZW0gaGVyZT9cbiAgMHgwYTUgPSBvYnNvbGV0ZSgweDEzMSk7IC8vIGNoZWNrOiBhbGFybSBmbHV0ZSAvIHplYnUgc3R1ZGVudFxuICAvLyBOT1RFOiBtYXJrIHRoZSBvYWsgZWxkZXIgcHJvZ3Jlc3Npb24gYXMgYXNzdW1lZCBmYWxzZSBiZWNhdXNlIG90aGVyd2lzZVxuICAvLyBpZiB0aGV5J3JlIGlnbm9yZWQgdGhlIGxvZ2ljIHRoaW5rcyB0aGUgZWxkZXIncyBpdGVtIGlzIGZyZWUgKGlmIHRoZXNlXG4gIC8vIHdlcmUgdHJhY2tlZCwgd2UnZCByZWFsaXplIGl0J3MgY29uZGl0aW9uYWwgb24gYWxyZWFkeSBoYXZpbmcgdGhlIGl0ZW0pLlxuICAweDBhNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsgZWxkZXIgMScsIEZBTFNFKTtcbiAgMHgwYTcgPSBkaWFsb2dUb2dnbGUoJ1N3YW4gZGFuY2VyJyk7XG4gIDB4MGE4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09hayBlbGRlciAyJywgRkFMU0UpO1xuICBUYWxrZWRUb0xlYWZSYWJiaXQgPSBtb3ZhYmxlKDB4MGE5LCBUUkFDSyk7XG4gIDB4MGFhID0gb2Jzb2xldGUoMHgxMWQpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFiID0gb2Jzb2xldGUoMHgxNTApOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIC8vIHVudXNlZCAwYWNcbiAgMHgwYWQgPSBvYnNvbGV0ZSgweDE1Mik7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWUgPSBvYnNvbGV0ZSgweDE1Myk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWYgPSBvYnNvbGV0ZSgweDE1NCk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG5cbiAgLy8gMGJ4XG4gIDB4MGIwID0gb2Jzb2xldGUoMHgxNTUpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIxID0gb2Jzb2xldGUoMHgxNTYpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIyID0gb2Jzb2xldGUoMHgxNTcpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIzID0gb2Jzb2xldGUoMHgxNTgpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBiNCA9IG9ic29sZXRlKDB4MTU5KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiNSA9IG9ic29sZXRlKDB4MTVhKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGI2ID0gb2Jzb2xldGUoMHgxMWYpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjcgPSBvYnNvbGV0ZSgweDE1Yyk7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiOCA9IG9ic29sZXRlKDB4MTVkKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI5ID0gb2Jzb2xldGUoMHgxMWUpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmEgPSBvYnNvbGV0ZSgweDE1ZSk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYiA9IG9ic29sZXRlKDB4MTVmKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJjID0gb2Jzb2xldGUoMHgxNjApOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmQgPSBvYnNvbGV0ZSgweDEyMCk7IC8vIGNoZXN0OiBmcnVpdCBvZiBsaW1lXG4gIDB4MGJlID0gb2Jzb2xldGUoMHgxMjEpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYmYgPSBvYnNvbGV0ZSgweDE2Mik7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuXG4gIC8vIDBjeFxuICAweDBjMCA9IG9ic29sZXRlKDB4MTYzKTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGMxID0gb2Jzb2xldGUoMHgxNjQpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYzIgPSBvYnNvbGV0ZSgweDEyMik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGMzID0gb2Jzb2xldGUoMHgxNjUpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNCA9IG9ic29sZXRlKDB4MTY2KTsgLy8gY2hlc3Q6IGZydWl0IG9mIHJlcHVuXG4gIDB4MGM1ID0gb2Jzb2xldGUoMHgxNmIpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNiA9IG9ic29sZXRlKDB4MTZjKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzcgPSBvYnNvbGV0ZSgweDEyMyk7IC8vIGNoZXN0OiBmcnVpdCBvZiByZXB1blxuICAweDBjOCA9IG9ic29sZXRlKDB4MTI0KTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwYzkgPSBvYnNvbGV0ZSgweDE2YSk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGNhID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICAweDBjYiA9IG9ic29sZXRlKDB4MTJhKTsgLy8gY2hlc3Q6IHBvd2VyIHJpbmdcbiAgMHgwY2MgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgMHgwY2QgPSBvYnNvbGV0ZSgweDExNCk7IC8vIGNoZXN0OiBwc3ljaG8gc2hpZWxkXG4gIDB4MGNlID0gb2Jzb2xldGUoMHgxMjUpOyAvLyBjaGVzdDogc3RhdHVlIG9mIG9ueXhcbiAgMHgwY2YgPSBvYnNvbGV0ZSgweDEzMyk7IC8vIGNoZXN0OiBrZXkgdG8gcHJpc29uXG4gIFxuICAvLyAwZHhcbiAgMHgwZDAgPSBvYnNvbGV0ZSgweDEyOCk7IC8vIGNoZWNrOiBmbHV0ZSBvZiBsaW1lIC8gcXVlZW5cbiAgMHgwZDEgPSBvYnNvbGV0ZSgweDEzNSk7IC8vIGNoZXN0OiBmb2cgbGFtcFxuICAweDBkMiA9IG9ic29sZXRlKDB4MTY5KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwZDMgPSBvYnNvbGV0ZSgweDEyNik7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBkNCA9IG9ic29sZXRlKDB4MTViKTsgLy8gY2hlc3Q6IGZsdXRlIG9mIGxpbWVcbiAgMHgwZDUgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAxJyk7XG4gIDB4MGQ2ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMicpO1xuICAweDBkNyA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDMnKTtcbiAgMHgwZDggPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgcmVzY3VlZCcpO1xuICAweDBkOSA9IGRpYWxvZ1RvZ2dsZSgnU3RvbmVkIHBhaXInKTtcbiAgMHgwZGEgPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgZ29uZSBmcm9tIHRhdmVybicpO1xuICAweDBkYiA9IGRpYWxvZ1RvZ2dsZSgnSW4gU2FiZXJhXFwncyB0cmFwJyk7XG4gIDB4MGRjID0gb2Jzb2xldGUoMHgxNmYpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBkZCA9IG9ic29sZXRlKDB4MTcwKTsgLy8gbWltaWM/PyBtZWRpY2FsIGhlcmI/P1xuICAweDBkZSA9IG9ic29sZXRlKDB4MTJjKTsgLy8gY2hlc3Q6IGlyb24gbmVja2xhY2VcbiAgMHgwZGYgPSBvYnNvbGV0ZSgweDExYik7IC8vIGNoZXN0OiBiYXR0bGUgYXJtb3JcblxuICAvLyAwZXhcbiAgMHgwZTAgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBBa2FoYW5hJyk7XG4gIC8vIHVudXNlZCAwZTEgLi4gMGUzXG4gIDB4MGU0ID0gb2Jzb2xldGUoMHgxM2MpOyAvLyBjaGVzdDoga2lyaXNhIHBsYW50XG4gIDB4MGU1ID0gb2Jzb2xldGUoMHgxNmUpOyAvLyBjaGVzdDogd2FycCBib290c1xuICAweDBlNiA9IG9ic29sZXRlKDB4MTZkKTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGU3ID0gb2Jzb2xldGUoMHgxMmYpOyAvLyBjaGVzdDogbGVhdGhlciBib290c1xuICAweDBlOCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFNoeXJvbiB2aWxsYWdlcicpO1xuICAweDBlOSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFNoeXJvbiBndWFyZCcpO1xuICAweDBlYSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDEnKTtcbiAgMHgwZWIgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAyJyk7XG4gIDB4MGVjID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMycpO1xuICAweDBlZCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdNZXNpYScpO1xuICAvLyB1bnVzZWQgMGVlIC4uIDBmZlxuICBUYWxrZWRUb1plYnVTdHVkZW50ID0gbW92YWJsZSgweDBlZSwgVFJBQ0spO1xuXG4gIC8vIDEwMFxuICAweDEwMCA9IG9ic29sZXRlKDB4MTJlKTsgLy8gY2hlY2s6IHJhYmJpdCBib290cyAvIHZhbXBpcmVcbiAgMHgxMDEgPSBvYnNvbGV0ZSgweDEwNyk7IC8vIGNoZWNrOiBiYWxsIG9mIGZpcmUgLyBpbnNlY3RcbiAgMHgxMDIgPSBvYnNvbGV0ZSgweDEwOCk7IC8vIGNoZWNrOiBmbGFtZSBicmFjZWxldCAvIGtlbGJlc3F1ZSAxXG4gIDB4MTAzID0gb2Jzb2xldGUoMHgxMDkpOyAvLyBjaGVjazogYmFsbCBvZiB3YXRlciAvIHJhZ2VcbiAgLy8gdW51c2VkIDEwNFxuICAweDEwNSA9IG9ic29sZXRlKDB4MTI2KTsgLy8gY2hlY2s6IG9wZWwgc3RhdHVlIC8ga2VsYmVzcXVlIDJcbiAgMHgxMDYgPSBvYnNvbGV0ZSgweDEyMyk7IC8vIGNoZWNrOiBmcnVpdCBvZiByZXB1biAvIHNhYmVyYSAyXG4gIDB4MTA3ID0gb2Jzb2xldGUoMHgxMTIpOyAvLyBjaGVjazogc2FjcmVkIHNoaWVsZCAvIG1hZG8gMlxuICAweDEwOCA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgVXNlZEJvd09mTW9vbiA9IG1vdmFibGUoMHgxMDkpO1xuICBVc2VkQm93T2ZTdW4gPSBtb3ZhYmxlKDB4MTBhKTtcbiAgMHgxMGIgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgMHgxMGMgPSBvYnNvbGV0ZSgweDE2MSk7IC8vIGNoZWNrOiBmcnVpdCBvZiBwb3dlciAvIHZhbXBpcmUgMlxuXG4gIC8vIDEwMCAuLiAxN2YgPT4gZml4ZWQgZmxhZ3MgZm9yIGNoZWNrcy5cblxuICAvLyBUT0RPIC0gYXJlIHRoZXNlIGFsbCBUUkFDSyBvciBqdXN0IHRoZSBub24tY2hlc3RzPyE/XG5cbiAgLy8gVE9ETyAtIGJhc2ljIGlkZWEgLSBOUEMgaGl0Ym94IGV4dGVuZHMgZG93biBvbmUgdGlsZT8gKGlzIHRoYXQgZW5vdWdoPylcbiAgLy8gICAgICAtIHN0YXR1ZXMgY2FuIGJlIGVudGVyZWQgYnV0IG5vdCBleGl0ZWQ/XG4gIC8vICAgICAgLSB1c2UgdHJpZ2dlciAofCBwYXJhbHlzaXMgfCBnbGl0Y2gpIGZvciBtb3Zpbmcgc3RhdHVlcz9cbiAgLy8gICAgICAgICAgLT4gZ2V0IG5vcm1hbCByZXF1aXJlbWVudHMgZm9yIGZyZWVcbiAgLy8gICAgICAgICAgLT4gYmV0dGVyIGhpdGJveD8gIGFueSB3YXkgdG8gZ2V0IHF1ZWVuIHRvIHdvcms/IHRvbyBtdWNoIHN0YXRlP1xuICAvLyAgICAgICAgICAgICBtYXkgbmVlZCB0byBoYXZlIHR3byBkaWZmZXJlbnQgdGhyb25lIHJvb21zPyAoZnVsbC9lbXB0eSlcbiAgLy8gICAgICAgICAgICAgYW5kIGhhdmUgZmxhZyBzdGF0ZSBhZmZlY3QgZXhpdD8/P1xuICAvLyAgICAgIC0gYXQgdGhlIHZlcnkgbGVhc3Qgd2UgY2FuIHVzZSBpdCBmb3IgdGhlIGhpdGJveCwgYnV0IHdlIG1heSBzdGlsbFxuICAvLyAgICAgICAgbmVlZCBjdXN0b20gb3ZlcmxheT9cblxuICAvLyBUT0RPIC0gcHNldWRvIGZsYWdzIHNvbWV3aGVyZT8gIGxpa2Ugc3dvcmQ/IGJyZWFrIGlyb24/IGV0Yy4uLlxuXG4gIExlYWZFbGRlciA9IHRyYWNrZWQofjB4MTAwKTtcbiAgT2FrRWxkZXIgPSB0cmFja2VkKH4weDEwMSk7XG4gIFdhdGVyZmFsbENhdmVTd29yZE9mV2F0ZXJDaGVzdCA9IHRyYWNrZWQofjB4MTAyKTtcbiAgU3R4eUxlZnRVcHBlclN3b3JkT2ZUaHVuZGVyQ2hlc3QgPSB0cmFja2VkKH4weDEwMyk7XG4gIE1lc2lhSW5Ub3dlciA9IHRyYWNrZWQoMHgxMDQpO1xuICBTZWFsZWRDYXZlQmFsbE9mV2luZENoZXN0ID0gdHJhY2tlZCh+MHgxMDUpO1xuICBNdFNhYnJlV2VzdFRvcm5hZG9CcmFjZWxldENoZXN0ID0gdHJhY2tlZCh+MHgxMDYpO1xuICBHaWFudEluc2VjdCA9IHRyYWNrZWQofjB4MTA3KTtcbiAgS2VsYmVzcXVlMSA9IHRyYWNrZWQofjB4MTA4KTtcbiAgUmFnZSA9IHRyYWNrZWQofjB4MTA5KTtcbiAgQXJ5bGxpc0Jhc2VtZW50Q2hlc3QgPSB0cmFja2VkKH4weDEwYSk7XG4gIE1hZG8xID0gdHJhY2tlZCh+MHgxMGIpO1xuICBTdG9ybUJyYWNlbGV0Q2hlc3QgPSB0cmFja2VkKH4weDEwYyk7XG4gIFdhdGVyZmFsbENhdmVSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMTApOyAvLyByYW5kbyBjaGFuZ2VkIGluZGV4IVxuICBNYWRvMiA9IHRyYWNrZWQoMHgxMTIpO1xuICBTdHh5UmlnaHRNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxMTQpO1xuICBCYXR0bGVBcm1vckNoZXN0ID0gdHJhY2tlZCgweDExYik7XG4gIERyYXlnb24xID0gdHJhY2tlZCgweDExYyk7XG4gIFNlYWxlZENhdmVTbWFsbFJvb21CYWNrQ2hlc3QgPSB0cmFja2VkKDB4MTFkKTsgLy8gbWVkaWNhbCBoZXJiXG4gIFNlYWxlZENhdmVCaWdSb29tTm9ydGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTFlKTsgLy8gYW50aWRvdGVcbiAgRm9nTGFtcENhdmVGcm9udENoZXN0ID0gdHJhY2tlZCgweDExZik7IC8vIGx5c2lzIHBsYW50XG4gIE10SHlkcmFSaWdodENoZXN0ID0gdHJhY2tlZCgweDEyMCk7IC8vIGZydWl0IG9mIGxpbWVcbiAgU2FiZXJhVXBzdGFpcnNMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTIxKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRXZpbFNwaXJpdElzbGFuZExvd2VyQ2hlc3QgPSB0cmFja2VkKDB4MTIyKTsgLy8gbWFnaWMgcmluZ1xuICBTYWJlcmEyID0gdHJhY2tlZCgweDEyMyk7IC8vIGZydWl0IG9mIHJlcHVuXG4gIFNlYWxlZENhdmVTbWFsbFJvb21Gcm9udENoZXN0ID0gdHJhY2tlZCgweDEyNCk7IC8vIHdhcnAgYm9vdHNcbiAgQ29yZGVsR3Jhc3MgPSB0cmFja2VkKDB4MTI1KTtcbiAgS2VsYmVzcXVlMiA9IHRyYWNrZWQoMHgxMjYpOyAvLyBvcGVsIHN0YXR1ZVxuICBPYWtNb3RoZXIgPSB0cmFja2VkKDB4MTI3KTtcbiAgUG9ydG9hUXVlZW4gPSB0cmFja2VkKDB4MTI4KTtcbiAgQWthaGFuYVN0YXR1ZU9mT255eFRyYWRlaW4gPSB0cmFja2VkKDB4MTI5KTtcbiAgT2FzaXNDYXZlRm9ydHJlc3NCYXNlbWVudENoZXN0ID0gdHJhY2tlZCgweDEyYSk7XG4gIEJyb2thaGFuYSA9IHRyYWNrZWQoMHgxMmIpO1xuICBFdmlsU3Bpcml0SXNsYW5kUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTJjKTtcbiAgRGVvID0gdHJhY2tlZCgweDEyZCk7XG4gIFZhbXBpcmUxID0gdHJhY2tlZCgweDEyZSk7XG4gIE9hc2lzQ2F2ZU5vcnRod2VzdENoZXN0ID0gdHJhY2tlZCgweDEyZik7XG4gIEFrYWhhbmFGbHV0ZU9mTGltZVRyYWRlaW4gPSB0cmFja2VkKDB4MTMwKTtcbiAgLy8gTk9URTogdGhpcyBzaG91bGQgYmUgY2hhbmdlZCB0byBNZXphbWVSaWdodENoZXN0XG4gIFplYnVTdHVkZW50ID0gdHJhY2tlZCgweDEzMSk7IC8vIFRPRE8gLSBtYXkgb3B0IGZvciAyIGluIGNhdmUgaW5zdGVhZD9cbiAgV2luZG1pbGxHdWFyZEFsYXJtRmx1dGVUcmFkZWluID0gdHJhY2tlZCgweDEzMik7XG4gIE10U2FicmVOb3J0aEJhY2tPZlByaXNvbkNoZXN0ID0gdHJhY2tlZCgweDEzMyk7XG4gIFplYnVJblNoeXJvbiA9IHRyYWNrZWQoMHgxMzQpO1xuICBGb2dMYW1wQ2F2ZUJhY2tDaGVzdCA9IHRyYWNrZWQoMHgxMzUpO1xuICBJbmp1cmVkRG9scGhpbiA9IHRyYWNrZWQoMHgxMzYpO1xuICBDbGFyayA9IHRyYWNrZWQoMHgxMzcpO1xuICBTYWJlcmExID0gdHJhY2tlZCgweDEzOCk7XG4gIEtlbnN1SW5MaWdodGhvdXNlID0gdHJhY2tlZCgweDEzOSk7XG4gIFJlcGFpcmVkU3RhdHVlID0gdHJhY2tlZCgweDEzYSk7XG4gIFVuZGVyZ3JvdW5kQ2hhbm5lbFVuZGVyd2F0ZXJDaGVzdCA9IHRyYWNrZWQoMHgxM2IpO1xuICBLaXJpc2FNZWFkb3cgPSB0cmFja2VkKDB4MTNjKTtcbiAgS2FybWluZSA9IHRyYWNrZWQoMHgxM2QpO1xuICBBcnlsbGlzID0gdHJhY2tlZCgweDEzZSk7XG4gIE10SHlkcmFTdW1taXRDaGVzdCA9IHRyYWNrZWQoMHgxM2YpO1xuICBBenRlY2FJblB5cmFtaWQgPSB0cmFja2VkKDB4MTQwKTtcbiAgWmVidUF0V2luZG1pbGwgPSB0cmFja2VkKDB4MTQxKTtcbiAgTXRTYWJyZU5vcnRoU3VtbWl0ID0gdHJhY2tlZCgweDE0Mik7XG4gIFN0b21GaWdodFJld2FyZCA9IHRyYWNrZWQoMHgxNDMpO1xuICBNdFNhYnJlV2VzdFRvcm5lbCA9IHRyYWNrZWQoMHgxNDQpO1xuICBBc2luYUluQmFja1Jvb20gPSB0cmFja2VkKDB4MTQ1KTtcbiAgQmVoaW5kV2hpcmxwb29sID0gdHJhY2tlZCgweDE0Nik7XG4gIEtlbnN1SW5Td2FuID0gdHJhY2tlZCgweDE0Nyk7XG4gIFNsaW1lZEtlbnN1ID0gdHJhY2tlZCgweDE0OCk7XG4gIE1lemFtZVNocmluZUxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNDkpOyAvLyBtZWRpY2FsIGhlcmJcbiAgU2VhbGVkQ2F2ZUJpZ1Jvb21Tb3V0aHdlc3RDaGVzdCA9IHRyYWNrZWQoMHgxNTApOyAvLyBtZWRpY2FsIGhlcmJcbiAgLy8gdW51c2VkIDE1MSBzYWNyZWQgc2hpZWxkIGNoZXN0XG4gIE10U2FicmVXZXN0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNTIpOyAvLyBtZWRpY2FsIGhlcmJcbiAgTXRTYWJyZU5vcnRoTWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTUzKTsgLy8gbWVkaWNhbCBoZXJiXG4gIEZvcnRyZXNzTWFkb0hlbGx3YXlDaGVzdCA9IHRyYWNrZWQoMHgxNTQpOyAvLyBtYWdpYyByaW5nXG4gIFNhYmVyYVVwc3RhaXJzUmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNTUpOyAvLyBtZWRpY2FsIGhlcmIgYWNyb3NzIHNwaWtlc1xuICBNdEh5ZHJhRmFyTGVmdENoZXN0ID0gdHJhY2tlZCgweDE1Nik7IC8vIG1lZGljYWwgaGVyYlxuICBTdHh5TGVmdExvd2VyQ2hlc3QgPSB0cmFja2VkKDB4MTU3KTsgLy8gbWVkaWNhbCBoZXJiXG4gIEthcm1pbmVCYXNlbWVudExvd2VyTWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTU4KTsgLy8gbWFnaWMgcmluZ1xuICBFYXN0Q2F2ZU5vcnRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE1OSk7IC8vIG1lZGljYWwgaGVyYiAodW51c2VkKVxuICBPYXNpc0NhdmVFbnRyYW5jZUFjcm9zc1JpdmVyQ2hlc3QgPSB0cmFja2VkKDB4MTVhKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgLy8gdW51c2VkIDE1YiAybmQgZmx1dGUgb2YgbGltZSAtIGNoYW5nZWQgaW4gcmFuZG9cbiAgLy8gV2F0ZXJmYWxsQ2F2ZVJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDE1Yik7IC8vIDJuZCBmbHV0ZSBvZiBsaW1lXG4gIEV2aWxTcGlyaXRJc2xhbmRFeGl0Q2hlc3QgPSB0cmFja2VkKDB4MTVjKTsgLy8gbHlzaXMgcGxhbnRcbiAgRm9ydHJlc3NTYWJlcmFNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNWQpOyAvLyBseXNpcyBwbGFudFxuICBNdFNhYnJlTm9ydGhVbmRlckJyaWRnZUNoZXN0ID0gdHJhY2tlZCgweDE1ZSk7IC8vIGFudGlkb3RlXG4gIEtpcmlzYVBsYW50Q2F2ZUNoZXN0ID0gdHJhY2tlZCgweDE1Zik7IC8vIGFudGlkb3RlXG4gIEZvcnRyZXNzTWFkb1VwcGVyTm9ydGhDaGVzdCA9IHRyYWNrZWQoMHgxNjApOyAvLyBhbnRpZG90ZVxuICBWYW1waXJlMiA9IHRyYWNrZWQoMHgxNjEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBGb3J0cmVzc1NhYmVyYU5vcnRod2VzdENoZXN0ID0gdHJhY2tlZCgweDE2Mik7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEZvcnRyZXNzTWFkb0xvd2VyQ2VudGVyTm9ydGhDaGVzdCA9IHRyYWNrZWQoMHgxNjMpOyAvLyBvcGVsIHN0YXR1ZVxuICBPYXNpc0NhdmVOZWFyRW50cmFuY2VDaGVzdCA9IHRyYWNrZWQoMHgxNjQpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBNdEh5ZHJhTGVmdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTY1KTsgLy8gbWFnaWMgcmluZ1xuICBGb3J0cmVzc1NhYmVyYVNvdXRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE2Nik7IC8vIGZydWl0IG9mIHJlcHVuXG4gIEtlbnN1SW5DYWJpbiA9IHRyYWNrZWQoMHgxNjcpOyAvLyBhZGRlZCBieSByYW5kb21pemVyIGlmIGZvZyBsYW1wIG5vdCBuZWVkZWRcbiAgLy8gdW51c2VkIDE2OCBtYWdpYyByaW5nIGNoZXN0XG4gIE10U2FicmVXZXN0TmVhcktlbnN1Q2hlc3QgPSB0cmFja2VkKDB4MTY5KTsgLy8gbWFnaWMgcmluZ1xuICBNdFNhYnJlV2VzdExlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNmEpOyAvLyB3YXJwIGJvb3RzXG4gIEZvcnRyZXNzTWFkb1VwcGVyQmVoaW5kV2FsbENoZXN0ID0gdHJhY2tlZCgweDE2Yik7IC8vIG1hZ2ljIHJpbmdcbiAgUHlyYW1pZENoZXN0ID0gdHJhY2tlZCgweDE2Yyk7IC8vIG1hZ2ljIHJpbmdcbiAgQ3J5cHRSaWdodENoZXN0ID0gdHJhY2tlZCgweDE2ZCk7IC8vIG9wZWwgc3RhdHVlXG4gIEthcm1pbmVCYXNlbWVudExvd2VyTGVmdENoZXN0ID0gdHJhY2tlZCgweDE2ZSk7IC8vIHdhcnAgYm9vdHNcbiAgRm9ydHJlc3NNYWRvTG93ZXJTb3V0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxNmYpOyAvLyBtYWdpYyByaW5nXG4gIC8vID0gdHJhY2tlZCgweDE3MCk7IC8vIG1pbWljIC8gbWVkaWNhbCBoZXJiXG4gIC8vIFRPRE8gLSBhZGQgYWxsIHRoZSBtaW1pY3MsIGdpdmUgdGhlbSBzdGFibGUgbnVtYmVycz9cbiAgRm9nTGFtcENhdmVNaWRkbGVOb3J0aE1pbWljID0gdHJhY2tlZCgweDE3MCk7XG4gIEZvZ0xhbXBDYXZlTWlkZGxlU291dGh3ZXN0TWltaWMgPSB0cmFja2VkKDB4MTcxKTtcbiAgV2F0ZXJmYWxsQ2F2ZUZyb250TWltaWMgPSB0cmFja2VkKDB4MTcyKTtcbiAgRXZpbFNwaXJpdElzbGFuZFJpdmVyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxNzMpO1xuICBNdEh5ZHJhRmluYWxDYXZlTWltaWMgPSB0cmFja2VkKDB4MTc0KTtcbiAgU3R4eUxlZnROb3J0aE1pbWljID0gdHJhY2tlZCgweDE3NSk7XG4gIFN0eHlSaWdodE5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTc2KTtcbiAgU3R4eVJpZ2h0U291dGhNaW1pYyA9IHRyYWNrZWQoMHgxNzcpO1xuICBDcnlwdExlZnRQaXRNaW1pYyA9IHRyYWNrZWQoMHgxNzgpO1xuICBLYXJtaW5lQmFzZW1lbnRVcHBlck1pZGRsZU1pbWljID0gdHJhY2tlZCgweDE3OSk7XG4gIEthcm1pbmVCYXNlbWVudFVwcGVyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxN2EpO1xuICBLYXJtaW5lQmFzZW1lbnRMb3dlclJpZ2h0TWltaWMgPSB0cmFja2VkKDB4MTdiKTtcbiAgRWFzdENhdmVOb3J0aHdlc3RNaW1pYyA9IHRyYWNrZWQoMHgxN2MpO1xuICAvLyBUT0RPIC0gbWltaWNzIDEzLi4xNiA/XG5cbiAgLy8gMTgwIC4uIDFmZiA9PiBmaXhlZCBmbGFncyBmb3Igb3ZlcmZsb3cgYnVmZmVyLlxuXG4gIC8vIDIwMCAuLiAyN2YgPT4gZml4ZWQgZmxhZ3MgZm9yIGl0ZW1zLlxuICBTd29yZE9mV2luZCA9IHRyYWNrZWQoMHgyMDApO1xuICBTd29yZE9mRmlyZSA9IHRyYWNrZWQoMHgyMDEpO1xuICBTd29yZE9mV2F0ZXIgPSB0cmFja2VkKDB4MjAyKTtcbiAgU3dvcmRPZlRodW5kZXIgPSB0cmFja2VkKDB4MjAzKTtcbiAgQ3J5c3RhbGlzID0gdHJhY2tlZCgweDIwNCk7XG4gIEJhbGxPZldpbmQgPSB0cmFja2VkKDB4MjA1KTtcbiAgVG9ybmFkb0JyYWNlbGV0ID0gdHJhY2tlZCgweDIwNik7XG4gIEJhbGxPZkZpcmUgPSB0cmFja2VkKDB4MjA3KTtcbiAgRmxhbWVCcmFjZWxldCA9IHRyYWNrZWQoMHgyMDgpO1xuICBCYWxsT2ZXYXRlciA9IHRyYWNrZWQoMHgyMDkpO1xuICBCbGl6emFyZEJyYWNlbGV0ID0gdHJhY2tlZCgweDIwYSk7XG4gIEJhbGxPZlRodW5kZXIgPSB0cmFja2VkKDB4MjBiKTtcbiAgU3Rvcm1CcmFjZWxldCA9IHRyYWNrZWQoMHgyMGMpO1xuICBDYXJhcGFjZVNoaWVsZCA9IHRyYWNrZWQoMHgyMGQpO1xuICBCcm9uemVTaGllbGQgPSB0cmFja2VkKDB4MjBlKTtcbiAgUGxhdGludW1TaGllbGQgPSB0cmFja2VkKDB4MjBmKTtcbiAgTWlycm9yZWRTaGllbGQgPSB0cmFja2VkKDB4MjEwKTtcbiAgQ2VyYW1pY1NoaWVsZCA9IHRyYWNrZWQoMHgyMTEpO1xuICBTYWNyZWRTaGllbGQgPSB0cmFja2VkKDB4MjEyKTtcbiAgQmF0dGxlU2hpZWxkID0gdHJhY2tlZCgweDIxMyk7XG4gIFBzeWNob1NoaWVsZCA9IHRyYWNrZWQoMHgyMTQpO1xuICBUYW5uZWRIaWRlID0gdHJhY2tlZCgweDIxNSk7XG4gIExlYXRoZXJBcm1vciA9IHRyYWNrZWQoMHgyMTYpO1xuICBCcm9uemVBcm1vciA9IHRyYWNrZWQoMHgyMTcpO1xuICBQbGF0aW51bUFybW9yID0gdHJhY2tlZCgweDIxOCk7XG4gIFNvbGRpZXJTdWl0ID0gdHJhY2tlZCgweDIxOSk7XG4gIENlcmFtaWNTdWl0ID0gdHJhY2tlZCgweDIxYSk7XG4gIEJhdHRsZUFybW9yID0gdHJhY2tlZCgweDIxYik7XG4gIFBzeWNob0FybW9yID0gdHJhY2tlZCgweDIxYyk7XG4gIE1lZGljYWxIZXJiID0gdHJhY2tlZCgweDIxZCk7XG4gIEFudGlkb3RlID0gdHJhY2tlZCgweDIxZSk7XG4gIEx5c2lzUGxhbnQgPSB0cmFja2VkKDB4MjFmKTtcbiAgRnJ1aXRPZkxpbWUgPSB0cmFja2VkKDB4MjIwKTtcbiAgRnJ1aXRPZlBvd2VyID0gdHJhY2tlZCgweDIyMSk7XG4gIE1hZ2ljUmluZyA9IHRyYWNrZWQoMHgyMjIpO1xuICBGcnVpdE9mUmVwdW4gPSB0cmFja2VkKDB4MjIzKTtcbiAgV2FycEJvb3RzID0gdHJhY2tlZCgweDIyNCk7XG4gIFN0YXR1ZU9mT255eCA9IHRyYWNrZWQoMHgyMjUpO1xuICBPcGVsU3RhdHVlID0gdHJhY2tlZCgweDIyNik7XG4gIEluc2VjdEZsdXRlID0gdHJhY2tlZCgweDIyNyk7XG4gIEZsdXRlT2ZMaW1lID0gdHJhY2tlZCgweDIyOCk7XG4gIEdhc01hc2sgPSB0cmFja2VkKDB4MjI5KTtcbiAgUG93ZXJSaW5nID0gdHJhY2tlZCgweDIyYSk7XG4gIFdhcnJpb3JSaW5nID0gdHJhY2tlZCgweDIyYik7XG4gIElyb25OZWNrbGFjZSA9IHRyYWNrZWQoMHgyMmMpO1xuICBEZW9zUGVuZGFudCA9IHRyYWNrZWQoMHgyMmQpO1xuICBSYWJiaXRCb290cyA9IHRyYWNrZWQoMHgyMmUpO1xuICBMZWF0aGVyQm9vdHMgPSB0cmFja2VkKDB4MjJmKTtcbiAgU2hpZWxkUmluZyA9IHRyYWNrZWQoMHgyMzApO1xuICBBbGFybUZsdXRlID0gdHJhY2tlZCgweDIzMSk7XG4gIFdpbmRtaWxsS2V5ID0gdHJhY2tlZCgweDIzMik7XG4gIEtleVRvUHJpc29uID0gdHJhY2tlZCgweDIzMyk7XG4gIEtleVRvU3R4eSA9IHRyYWNrZWQoMHgyMzQpO1xuICBGb2dMYW1wID0gdHJhY2tlZCgweDIzNSk7XG4gIFNoZWxsRmx1dGUgPSB0cmFja2VkKDB4MjM2KTtcbiAgRXllR2xhc3NlcyA9IHRyYWNrZWQoMHgyMzcpO1xuICBCcm9rZW5TdGF0dWUgPSB0cmFja2VkKDB4MjM4KTtcbiAgR2xvd2luZ0xhbXAgPSB0cmFja2VkKDB4MjM5KTtcbiAgU3RhdHVlT2ZHb2xkID0gdHJhY2tlZCgweDIzYSk7XG4gIExvdmVQZW5kYW50ID0gdHJhY2tlZCgweDIzYik7XG4gIEtpcmlzYVBsYW50ID0gdHJhY2tlZCgweDIzYyk7XG4gIEl2b3J5U3RhdHVlID0gdHJhY2tlZCgweDIzZCk7XG4gIEJvd09mTW9vbiA9IHRyYWNrZWQoMHgyM2UpO1xuICBCb3dPZlN1biA9IHRyYWNrZWQoMHgyM2YpO1xuICBCb3dPZlRydXRoID0gdHJhY2tlZCgweDI0MCk7XG4gIFJlZnJlc2ggPSB0cmFja2VkKDB4MjQxKTtcbiAgUGFyYWx5c2lzID0gdHJhY2tlZCgweDI0Mik7XG4gIFRlbGVwYXRoeSA9IHRyYWNrZWQoMHgyNDMpO1xuICBUZWxlcG9ydCA9IHRyYWNrZWQoMHgyNDQpO1xuICBSZWNvdmVyID0gdHJhY2tlZCgweDI0NSk7XG4gIEJhcnJpZXIgPSB0cmFja2VkKDB4MjQ2KTtcbiAgQ2hhbmdlID0gdHJhY2tlZCgweDI0Nyk7XG4gIEZsaWdodCA9IHRyYWNrZWQoMHgyNDgpO1xuXG4gIC8vIDI4MCAuLiAyZjAgPT4gZml4ZWQgZmxhZ3MgZm9yIHdhbGxzLlxuICBDYWxtZWRBbmdyeVNlYSA9IHRyYWNrZWQoMHgyODMpO1xuICBPcGVuZWRKb2VsU2hlZCA9IHRyYWNrZWQoMHgyODcpO1xuICBEcmF5Z29uMiA9IHRyYWNrZWQoMHgyOGQpO1xuICBPcGVuZWRDcnlwdCA9IHRyYWNrZWQoMHgyOGUpO1xuICAvLyBOT1RFOiAyOGYgaXMgZmxhZ2dlZCBmb3IgZHJheWdvbidzIGZsb29yLCBidXQgaXMgdW51c2VkIGFuZCB1bm5lZWRlZFxuICBPcGVuZWRTdHh5ID0gdHJhY2tlZCgweDJiMCk7XG4gIE9wZW5lZFN3YW5HYXRlID0gdHJhY2tlZCgweDJiMyk7XG4gIE9wZW5lZFByaXNvbiA9IHRyYWNrZWQoMHgyZDgpO1xuICBPcGVuZWRTZWFsZWRDYXZlID0gdHJhY2tlZCgweDJlZSk7XG5cbiAgLy8gTm90aGluZyBldmVyIHNldHMgdGhpcywgc28ganVzdCB1c2UgaXQgcmlnaHQgb3V0LlxuICBBbHdheXNUcnVlID0gZml4ZWQoMHgyZjAsIFRSVUUpO1xuXG4gIFdhcnBMZWFmID0gdHJhY2tlZCgweDJmNSk7XG4gIFdhcnBCcnlubWFlciA9IHRyYWNrZWQoMHgyZjYpO1xuICBXYXJwT2FrID0gdHJhY2tlZCgweDJmNyk7XG4gIFdhcnBOYWRhcmUgPSB0cmFja2VkKDB4MmY4KTtcbiAgV2FycFBvcnRvYSA9IHRyYWNrZWQoMHgyZjkpO1xuICBXYXJwQW1hem9uZXMgPSB0cmFja2VkKDB4MmZhKTtcbiAgV2FycEpvZWwgPSB0cmFja2VkKDB4MmZiKTtcbiAgV2FycFpvbWJpZSA9IHRyYWNrZWQofjB4MmZiKTtcbiAgV2FycFN3YW4gPSB0cmFja2VkKDB4MmZjKTtcbiAgV2FycFNoeXJvbiA9IHRyYWNrZWQoMHgyZmQpO1xuICBXYXJwR29hID0gdHJhY2tlZCgweDJmZSk7XG4gIFdhcnBTYWhhcmEgPSB0cmFja2VkKDB4MmZmKTtcblxuICAvLyBQc2V1ZG8gZmxhZ3NcbiAgU3dvcmQgPSBwc2V1ZG8odGhpcyk7XG4gIE1vbmV5ID0gcHNldWRvKHRoaXMpO1xuICBCcmVha1N0b25lID0gcHNldWRvKHRoaXMpO1xuICBCcmVha0ljZSA9IHBzZXVkbyh0aGlzKTtcbiAgRm9ybUJyaWRnZSA9IHBzZXVkbyh0aGlzKTtcbiAgQnJlYWtJcm9uID0gcHNldWRvKHRoaXMpO1xuICBUcmF2ZWxTd2FtcCA9IHBzZXVkbyh0aGlzKTtcbiAgQ3Jvc3NQYWluID0gcHNldWRvKHRoaXMpO1xuICBDbGltYldhdGVyZmFsbCA9IHBzZXVkbyh0aGlzKTtcbiAgQnV5SGVhbGluZyA9IHBzZXVkbyh0aGlzKTtcbiAgQnV5V2FycCA9IHBzZXVkbyh0aGlzKTtcbiAgU2hvb3RpbmdTdGF0dWUgPSBwc2V1ZG8odGhpcyk7XG4gIENsaW1iU2xvcGU4ID0gcHNldWRvKHRoaXMpOyAvLyBjbGltYiBzbG9wZXMgaGVpZ2h0IDYtOFxuICBDbGltYlNsb3BlOSA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgc2xvcGVzIGhlaWdodCA5XG4gIENsaW1iU2xvcGUxMCA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgYWxsIHNsb3Blc1xuICBXaWxkV2FycCA9IHBzZXVkbyh0aGlzKTtcbiAgVHJpZ2dlclNraXAgPSBwc2V1ZG8odGhpcyk7XG4gIFJhZ2VTa2lwID0gcHNldWRvKHRoaXMpO1xuXG4gIC8vIE1hcCBvZiBmbGFncyB0aGF0IGFyZSBcIndhaXRpbmdcIiBmb3IgYSBwcmV2aW91c2x5LXVzZWQgSUQuXG4gIC8vIFNpZ25pZmllZCB3aXRoIGEgbmVnYXRpdmUgKG9uZSdzIGNvbXBsZW1lbnQpIElEIGluIHRoZSBGbGFnIG9iamVjdC5cbiAgcHJpdmF0ZSByZWFkb25seSB1bmFsbG9jYXRlZCA9IG5ldyBNYXA8bnVtYmVyLCBGbGFnPigpO1xuXG4gIC8vIC8vIE1hcCBvZiBhdmFpbGFibGUgSURzLlxuICAvLyBwcml2YXRlIHJlYWRvbmx5IGF2YWlsYWJsZSA9IFtcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMDAwIC4uIDBmZlxuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAxMDAgLi4gMWZmXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDIwMCAuLiAyZmZcbiAgLy8gXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIC8vIEJ1aWxkIHVwIGFsbCB0aGUgZmxhZ3MgYXMgYWN0dWFsIGluc3RhbmNlcyBvZiBGbGFnLlxuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHtcbiAgICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNwZWMgPSB0aGlzW2tleV07XG4gICAgICBpZiAoIShzcGVjIGFzIGFueSlbRkxBR10pIGNvbnRpbnVlO1xuICAgICAgLy8gUmVwbGFjZSBpdCB3aXRoIGFuIGFjdHVhbCBmbGFnLiAgV2UgbWF5IG5lZWQgYSBuYW1lLCBldGMuLi5cbiAgICAgIGNvbnN0IGtleU51bWJlciA9IE51bWJlcihrZXkpO1xuICAgICAgY29uc3QgaWQgPSB0eXBlb2Ygc3BlYy5pZCA9PT0gJ251bWJlcicgPyBzcGVjLmlkIDoga2V5TnVtYmVyO1xuICAgICAgaWYgKGlzTmFOKGlkKSkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZzogJHtrZXl9YCk7XG4gICAgICBjb25zdCBuYW1lID1cbiAgICAgICAgICBzcGVjLm5hbWUgfHxcbiAgICAgICAgICAoaXNOYU4oa2V5TnVtYmVyKSA/IHVwcGVyQ2FtZWxUb1NwYWNlcyhrZXkpIDogZmxhZ05hbWUoaWQpKTtcbiAgICAgIGNvbnN0IGZsYWcgPSBuZXcgRmxhZyh0aGlzLCBuYW1lLCBpZCwgc3BlYyk7XG4gICAgICB0aGlzW2tleV0gPSBmbGFnO1xuICAgICAgLy8gSWYgSUQgaXMgbmVnYXRpdmUsIHRoZW4gc3RvcmUgaXQgYXMgdW5hbGxvY2F0ZWQuXG4gICAgICBpZiAoZmxhZy5pZCA8IDApIHtcbiAgICAgICAgdGhpcy51bmFsbG9jYXRlZC5zZXQofmZsYWcuaWQsIGZsYWcpO1xuICAgICAgfSBlbHNlIGlmICghdGhpc1tmbGFnLmlkXSkge1xuICAgICAgICB0aGlzW2ZsYWcuaWRdID0gZmxhZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBtaXNzaW5nIGZsYWdzLlxuICAgIGZvciAobGV0IGkgPSAweDEwMDsgaSA8IDB4MTgwOyBpKyspIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBgQ2hlY2sgJHtoZXgoaSAmIDB4ZmYpfWA7XG4gICAgICBpZiAodGhpc1tpXSkge1xuICAgICAgICBpZiAoIXRoaXNbaV0uZml4ZWQgJiYgIXRoaXMudW5hbGxvY2F0ZWQuaGFzKGkpKSB7XG4gICAgICAgICAgdGhpcy51bmFsbG9jYXRlZC5zZXQoXG4gICAgICAgICAgICAgIGksIG5ldyBGbGFnKHRoaXMsIG5hbWUsIH5pLCB7Zml4ZWQ6IHRydWV9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgRmxhZyh0aGlzLCBuYW1lLCBpLCB7Zml4ZWQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDB4MTgwOyBpIDwgMHgyODA7IGkrKykge1xuICAgICAgaWYgKCF0aGlzW2ldKSB7XG4gICAgICAgIC8vIEl0ZW0gYnVmZmVyIGhlcmVcbiAgICAgICAgY29uc3QgdHlwZSA9IGkgPCAweDIwMCA/ICdCdWZmZXIgJyA6ICdJdGVtICc7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgRmxhZyh0aGlzLCB0eXBlICsgaGV4KGkpLCBpLCB7Zml4ZWQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRm9yIHRoZSByZW1haW5kZXIsIGZpbmQgd2FsbHMgaW4gbWFwcy5cbiAgICAvLyAgLSBkbyB3ZSBuZWVkIHRvIHB1bGwgdGhlbSBmcm9tIGxvY2F0aW9ucz8/IG9yIHRoaXMgZG9pbmcgYW55dGhpbmc/P1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgICAgaWYgKHRoaXNbZi5mbGFnXSkgY29udGludWU7XG4gICAgICAgIHRoaXNbZi5mbGFnXSA9IHdhbGxGbGFnKHRoaXMsIGYuZmxhZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU2F2ZXMgPiA0NzAgYnl0ZXMgb2YgcmVkdW5kYW50IGZsYWcgc2V0cyFcbiAgZGVmcmFnKCkge1xuICAgIC8vIG1ha2UgYSBtYXAgb2YgbmV3IElEcyBmb3IgZXZlcnl0aGluZy5cbiAgICBjb25zdCByZW1hcHBpbmcgPSBuZXcgTWFwPG51bWJlciwgKGY6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+KCk7XG4gICAgY29uc3QgdW51c2VkID0gbmV3IFNldDxudW1iZXI+KCk7XG5cbiAgICAvLyBmaXJzdCBoYW5kbGUgYWxsIHRoZSBvYnNvbGV0ZSBmbGFncyAtIG9uY2UgdGhlIHJlbWFwcGluZyBpcyBwdWxsZWQgb2ZmXG4gICAgLy8gd2UgY2FuIHNpbXBseSB1bnJlZiB0aGVtLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgzMDA7IGkrKykge1xuICAgICAgY29uc3QgZiA9IHRoaXNbaV07XG4gICAgICBjb25zdCBvID0gZj8ub2Jzb2xldGU7XG4gICAgICBpZiAobykge1xuICAgICAgICByZW1hcHBpbmcuc2V0KGksIChjOiBGbGFnQ29udGV4dCkgPT4gYy5zZXQgPyAtMSA6IG8uY2FsbChmLCBjKSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2ldO1xuICAgICAgfSBlbHNlIGlmICghZikge1xuICAgICAgICB1bnVzZWQuYWRkKGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG5vdyBtb3ZlIGFsbCB0aGUgbW92YWJsZSBmbGFncy5cbiAgICBsZXQgaSA9IDA7XG4gICAgbGV0IGogPSAweDJmZjtcbiAgICAvLyBXQVJOSU5HOiBpIGFuZCBqIGFyZSBib3VuZCB0byB0aGUgb3V0ZXIgc2NvcGUhICBDbG9zaW5nIG92ZXIgdGhlbVxuICAgIC8vIHdpbGwgTk9UIHdvcmsgYXMgaW50ZW5kZWQuXG4gICAgZnVuY3Rpb24gcmV0PFQ+KHg6IFQpOiAoKSA9PiBUIHsgcmV0dXJuICgpID0+IHg7IH1cbiAgICB3aGlsZSAoaSA8IGopIHtcbiAgICAgIGlmICh0aGlzW2ldIHx8IHRoaXMudW5hbGxvY2F0ZWQuaGFzKGkpKSB7IGkrKzsgY29udGludWU7IH1cbiAgICAgIGNvbnN0IGYgPSB0aGlzW2pdO1xuICAgICAgaWYgKCFmIHx8IGYuZml4ZWQpIHsgai0tOyBjb250aW51ZTsgfVxuICAgICAgLy8gZiBpcyBhIG1vdmFibGUgZmxhZy4gIE1vdmUgaXQgdG8gaS5cbiAgICAgIHJlbWFwcGluZy5zZXQoaiwgcmV0KGkpKTtcbiAgICAgIChmIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IGk7XG4gICAgICB0aGlzW2ldID0gZjtcbiAgICAgIGRlbGV0ZSB0aGlzW2pdO1xuICAgICAgaSsrO1xuICAgICAgai0tO1xuICAgIH1cblxuICAgIC8vIGdvIHRocm91Z2ggYWxsIHRoZSBwb3NzaWJsZSBwbGFjZXMgd2UgY291bGQgZmluZCBmbGFncyBhbmQgcmVtYXAhXG4gICAgdGhpcy5yZW1hcEZsYWdzKHJlbWFwcGluZywgdW51c2VkKTtcblxuICAgIC8vIFVuYWxsb2NhdGVkIGZsYWdzIGRvbid0IG5lZWQgYW55IHJlbWFwcGluZy5cbiAgICBmb3IgKGNvbnN0IFt3YW50LCBmbGFnXSBvZiB0aGlzLnVuYWxsb2NhdGVkKSB7XG4gICAgICBpZiAodGhpc1t3YW50XSkgY29udGludWU7XG4gICAgICB0aGlzLnVuYWxsb2NhdGVkLmRlbGV0ZSh3YW50KTtcbiAgICAgICh0aGlzW3dhbnRdID0gZmxhZyBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSB3YW50O1xuICAgIH1cblxuICAgIC8vaWYgKHRoaXMudW5hbGxvY2F0ZWQuc2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZnVsbHkgYWxsb2NhdGVgKTtcblxuICAgIC8vIFJlcG9ydCBob3cgdGhlIGRlZnJhZyB3ZW50P1xuICAgIGNvbnN0IGZyZWUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkgZnJlZS5wdXNoKGhleDMoaSkpO1xuICAgIH1cbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBGcmVlIGZsYWdzOiAke2ZyZWUuam9pbignICcpfWApO1xuICB9XG5cbiAgaW5zZXJ0Wm9tYmllV2FycEZsYWcoKSB7XG4gICAgLy8gTWFrZSBzcGFjZSBmb3IgdGhlIG5ldyBmbGFnIGJldHdlZW4gSm9lbCBhbmQgU3dhblxuICAgIGNvbnN0IHJlbWFwcGluZyA9IG5ldyBNYXA8bnVtYmVyLCAoZjogRmxhZ0NvbnRleHQpID0+IG51bWJlcj4oKTtcbiAgICBpZiAodGhpc1sweDJmNF0pIHRocm93IG5ldyBFcnJvcihgTm8gc3BhY2UgdG8gaW5zZXJ0IHdhcnAgZmxhZ2ApO1xuICAgIGNvbnN0IG5ld0lkID0gfnRoaXMuV2FycFpvbWJpZS5pZDtcbiAgICBpZiAobmV3SWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBXYXJwWm9tYmllIGlkYCk7XG4gICAgZm9yIChsZXQgaSA9IDB4MmY0OyBpIDwgbmV3SWQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHRoaXNbaSArIDFdO1xuICAgICAgKHRoaXNbaV0gYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gaTtcbiAgICAgIHJlbWFwcGluZy5zZXQoaSArIDEsICgpID0+IGkpO1xuICAgIH1cbiAgICAodGhpcy5XYXJwWm9tYmllIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IG5ld0lkO1xuICAgIHRoaXNbbmV3SWRdID0gdGhpcy5XYXJwWm9tYmllO1xuICAgIHRoaXMucmVtYXBGbGFncyhyZW1hcHBpbmcpO1xuICB9XG5cbiAgcmVtYXAoc3JjOiBudW1iZXIsIGRlc3Q6IG51bWJlcikge1xuICAgIHRoaXMucmVtYXBGbGFncyhuZXcgTWFwKFtbc3JjLCAoKSA9PiBkZXN0XV0pKTtcbiAgfVxuXG4gIHJlbWFwRmxhZ3MocmVtYXBwaW5nOiBNYXA8bnVtYmVyLCAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPixcbiAgICAgICAgICAgICB1bnVzZWQ/OiBTZXQ8bnVtYmVyPikge1xuICAgIGZ1bmN0aW9uIHByb2Nlc3NMaXN0KGxpc3Q6IG51bWJlcltdLCBjdHg6IEZsYWdDb250ZXh0KSB7XG4gICAgICBmb3IgKGxldCBpID0gbGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBsZXQgZiA9IGxpc3RbaV07XG4gICAgICAgIGlmIChmIDwgMCkgZiA9IH5mO1xuICAgICAgICBpZiAodW51c2VkICYmIHVudXNlZC5oYXMoZikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNIT1VMRCBCRSBVTlVTRUQ6ICR7aGV4KGYpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlbWFwID0gcmVtYXBwaW5nLmdldChmKTtcbiAgICAgICAgaWYgKHJlbWFwID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBsZXQgbWFwcGVkID0gcmVtYXAoey4uLmN0eCwgaW5kZXg6IGl9KTtcbiAgICAgICAgaWYgKG1hcHBlZCA+PSAwKSB7XG4gICAgICAgICAgbGlzdFtpXSA9IGxpc3RbaV0gPCAwID8gfm1hcHBlZCA6IG1hcHBlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBwcm9jZXNzKGZsYWc6IG51bWJlciwgY3R4OiBGbGFnQ29udGV4dCkge1xuICAgICAgbGV0IHVuc2lnbmVkID0gZmxhZyA8IDAgPyB+ZmxhZyA6IGZsYWc7XG4gICAgICBpZiAodW51c2VkICYmIHVudXNlZC5oYXModW5zaWduZWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgU0hPVUxEIEJFIFVOVVNFRDogJHtoZXgodW5zaWduZWQpfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVtYXAgPSByZW1hcHBpbmcuZ2V0KHVuc2lnbmVkKTtcbiAgICAgIGlmIChyZW1hcCA9PSBudWxsKSByZXR1cm4gZmxhZztcbiAgICAgIGxldCBtYXBwZWQgPSByZW1hcChjdHgpO1xuICAgICAgaWYgKG1hcHBlZCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgZGVsZXRlYCk7XG4gICAgICByZXR1cm4gZmxhZyA8IDAgPyB+bWFwcGVkIDogbWFwcGVkO1xuICAgIH1cblxuICAgIC8vIExvY2F0aW9uIGZsYWdzXG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbG9jYXRpb24udXNlZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgbG9jYXRpb24uZmxhZ3MpIHtcbiAgICAgICAgZmxhZy5mbGFnID0gcHJvY2VzcyhmbGFnLmZsYWcsIHtsb2NhdGlvbn0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5QQyBmbGFnc1xuICAgIGZvciAoY29uc3QgbnBjIG9mIHRoaXMucm9tLm5wY3MpIHtcbiAgICAgIGlmICghbnBjLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBbbG9jLCBjb25kc10gb2YgbnBjLnNwYXduQ29uZGl0aW9ucykge1xuICAgICAgICBwcm9jZXNzTGlzdChjb25kcywge25wYywgc3Bhd246IGxvY30pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICAgIGQuY29uZGl0aW9uID0gcHJvY2VzcyhkLmNvbmRpdGlvbiwge25wYywgZGlhbG9nOiB0cnVlfSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFssIGRzXSBvZiBucGMubG9jYWxEaWFsb2dzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuICAgICAgICAgIGQuY29uZGl0aW9uID0gcHJvY2VzcyhkLmNvbmRpdGlvbiwge25wYywgZGlhbG9nOiB0cnVlfSk7XG4gICAgICAgICAgcHJvY2Vzc0xpc3QoZC5mbGFncywge25wYywgZGlhbG9nOiB0cnVlLCBzZXQ6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy5yb20udHJpZ2dlcnMpIHtcbiAgICAgIGlmICghdHJpZ2dlci51c2VkKSBjb250aW51ZTtcbiAgICAgIHByb2Nlc3NMaXN0KHRyaWdnZXIuY29uZGl0aW9ucywge3RyaWdnZXJ9KTtcbiAgICAgIHByb2Nlc3NMaXN0KHRyaWdnZXIuZmxhZ3MsIHt0cmlnZ2VyLCBzZXQ6IHRydWV9KTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgdXBkYXRpbmcgdGVsZXBhdGh5PyE/XG5cbiAgICAvLyBJdGVtR2V0IGZsYWdzXG4gICAgZm9yIChjb25zdCBpdGVtR2V0IG9mIHRoaXMucm9tLml0ZW1HZXRzKSB7XG4gICAgICBwcm9jZXNzTGlzdChpdGVtR2V0LmZsYWdzLCB7c2V0OiB0cnVlfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCBpdGVtVXNlIG9mIGl0ZW0uaXRlbVVzZURhdGEpIHtcbiAgICAgICAgaWYgKGl0ZW1Vc2Uua2luZCA9PT0gJ2ZsYWcnKSB7XG4gICAgICAgICAgaXRlbVVzZS53YW50ID0gcHJvY2VzcyhpdGVtVXNlLndhbnQsIHt9KTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzTGlzdChpdGVtVXNlLmZsYWdzLCB7c2V0OiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIGVsc2U/XG4gIH1cblxuICAvLyBUT0RPIC0gbWFuaXB1bGF0ZSB0aGlzIHN0dWZmXG5cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBhdmFpbGFibGUgPSBuZXcgU2V0PG51bWJlcj4oW1xuICAvLyAgIC8vIFRPRE8gLSB0aGVyZSdzIGEgdG9uIG9mIGxvd2VyIGZsYWdzIGFzIHdlbGwuXG4gIC8vICAgLy8gVE9ETyAtIHdlIGNhbiByZXB1cnBvc2UgYWxsIHRoZSBvbGQgaXRlbSBmbGFncy5cbiAgLy8gICAweDI3MCwgMHgyNzEsIDB4MjcyLCAweDI3MywgMHgyNzQsIDB4Mjc1LCAweDI3NiwgMHgyNzcsXG4gIC8vICAgMHgyNzgsIDB4Mjc5LCAweDI3YSwgMHgyN2IsIDB4MjdjLCAweDI3ZCwgMHgyN2UsIDB4MjdmLFxuICAvLyAgIDB4MjgwLCAweDI4MSwgMHgyODgsIDB4Mjg5LCAweDI4YSwgMHgyOGIsIDB4MjhjLFxuICAvLyAgIDB4MmE3LCAweDJhYiwgMHgyYjQsXG4gIC8vIF0pO1xuXG4gIGFsbG9jKHNlZ21lbnQ6IG51bWJlciA9IDApOiBudW1iZXIge1xuICAgIGlmIChzZWdtZW50ICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYWxsb2NhdGUgb3V0c2lkZSAyeHhgKTtcbiAgICBmb3IgKGxldCBmbGFnID0gMHgyODA7IGZsYWcgPCAweDMwMDsgZmxhZysrKSB7XG4gICAgICBpZiAoIXRoaXNbZmxhZ10pIHtcbiAgICAgICAgdGhpc1tmbGFnXSA9IHdhbGxGbGFnKHRoaXMsIGZsYWcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZsYWc7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgTm8gZnJlZSBmbGFncy5gKTtcbiAgfVxuXG4gIGZyZWUoZmxhZzogbnVtYmVyKSB7XG4gICAgLy8gVE9ETyAtIGlzIHRoZXJlIG1vcmUgdG8gdGhpcz8gIGNoZWNrIGZvciBzb21ldGhpbmcgZWxzZT9cbiAgICBkZWxldGUgdGhpc1tmbGFnXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGFnTmFtZShpZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuICdGbGFnICcgKyBoZXgzKGlkKTtcbn1cblxuZnVuY3Rpb24gd2FsbEZsYWcoZmxhZ3M6IEZsYWdzLCBpZDogbnVtYmVyKTogRmxhZyB7XG4gIHJldHVybiBuZXcgRmxhZyhmbGFncywgJ1dhbGwgJyArIGhleChpZCAmIDB4ZmYpLCBpZCwge2ZpeGVkOiB0cnVlfSk7XG59XG4iXX0=