import { hex, hex3, upperCamelToSpaces } from './util.js';
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
        this.logic = (_a = data.logic, (_a !== null && _a !== void 0 ? _a : TRACK));
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
        this.TalkedToFortuneTeller = movable(0x1d, TRACK);
        this.QueenRevealed = movable(0x01e, TRACK);
        this[0x01f] = obsolete(0x209);
        this.QueenNotInThroneRoom = movable(0x020);
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
        this[0x063] = obsolete(0x147);
        this.CuredKensu = movable(0x065);
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
        this[0x0a6] = dialogProgression('Oak elder 1');
        this[0x0a7] = dialogToggle('Swan dancer');
        this[0x0a8] = dialogProgression('Oak elder 2');
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
        this.ClimbWaterfall = pseudo(this);
        this.BuyHealing = pseudo(this);
        this.BuyWarp = pseudo(this);
        this.ShootingStatue = pseudo(this);
        this.ClimbSlope8 = pseudo(this);
        this.ClimbSlope9 = pseudo(this);
        this.WildWarp = pseudo(this);
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
        var _a;
        const remapping = new Map();
        for (let i = 0; i < 0x300; i++) {
            const f = this[i];
            const o = (_a = f) === null || _a === void 0 ? void 0 : _a.obsolete;
            if (o) {
                remapping.set(i, (c) => c.set ? -1 : o.call(f, c));
                delete this[i];
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
        this.remapFlags(remapping);
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
    remapFlags(remapping) {
        function processList(list, ctx) {
            for (let i = list.length - 1; i >= 0; i--) {
                let f = list[i];
                if (f < 0)
                    f = ~f;
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
            const remap = remapping.get(unsigned);
            if (remap == null)
                return flag;
            let mapped = remap(ctx);
            if (mapped < 0)
                throw new Error(`Bad flag delete`);
            return flag < 0 ? ~mapped : mapped;
        }
        for (const location of this.rom.locations) {
            for (const flag of location.flags) {
                flag.flag = process(flag.flag, { location });
            }
        }
        for (const npc of this.rom.npcs) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBU3RCLE1BQU0sS0FBSyxHQUFVLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFVLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFVLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztBQW9CekIsTUFBTSxPQUFPLElBQUk7SUFNZixZQUFxQixLQUFZLEVBQ1osSUFBWSxFQUNaLEVBQVUsRUFDbkIsSUFBYzs7UUFITCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssU0FBRyxJQUFJLENBQUMsS0FBSyx1Q0FBSSxLQUFLLEVBQUEsQ0FBQztJQUNuQyxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxJQUFJLENBQUMsRUFBZSxDQUFDO0lBQzlCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1AsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2pFLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDTixJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxFQUFFO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMzQztRQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDekQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQUVELFNBQVMsUUFBUSxDQUFDLFFBQWlEO0lBQ2pFLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUTtRQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEUsT0FBTyxFQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBUSxDQUFDO0FBQ3pDLENBQUM7QUFDRCxTQUFTLEtBQUssQ0FBQyxFQUFVLEVBQUUsS0FBSyxHQUFHLE1BQU07SUFDdkMsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxF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UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFHeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FB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LElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDMUM7Z0JBQ0QsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQzthQUN6QztTQUNGO0lBR0gsQ0FBQztJQWFELEtBQUssQ0FBQyxVQUFrQixDQUFDO1FBQ3ZCLElBQUksT0FBTyxLQUFLLEtBQUs7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdEUsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7UUFFZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFFRCxTQUFTLFFBQVEsQ0FBQyxFQUFVO0lBQzFCLE9BQU8sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsS0FBWSxFQUFFLEVBQVU7SUFDeEMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SXRlbX0gZnJvbSAnLi9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtOcGN9IGZyb20gJy4vbnBjLmpzJztcbmltcG9ydCB7VHJpZ2dlcn0gZnJvbSAnLi90cmlnZ2VyLmpzJztcbmltcG9ydCB7aGV4LCBoZXgzLCB1cHBlckNhbWVsVG9TcGFjZXMsIFdyaXRhYmxlfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50fSBmcm9tICcuLi9sb2dpYy9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcblxuY29uc3QgRkxBRyA9IFN5bWJvbCgpO1xuXG4vLyBUT0RPIC0gbWF5YmUgYWxpYXMgc2hvdWxkIGp1c3QgYmUgaW4gb3ZlcmxheS50cz9cbmV4cG9ydCBpbnRlcmZhY2UgTG9naWMge1xuICBhc3N1bWVUcnVlPzogYm9vbGVhbjtcbiAgYXNzdW1lRmFsc2U/OiBib29sZWFuO1xuICB0cmFjaz86IGJvb2xlYW47XG59XG5cbmNvbnN0IEZBTFNFOiBMb2dpYyA9IHthc3N1bWVGYWxzZTogdHJ1ZX07XG5jb25zdCBUUlVFOiBMb2dpYyA9IHthc3N1bWVUcnVlOiB0cnVlfTtcbmNvbnN0IFRSQUNLOiBMb2dpYyA9IHt0cmFjazogdHJ1ZX07XG5jb25zdCBJR05PUkU6IExvZ2ljID0ge307XG5cbmludGVyZmFjZSBGbGFnRGF0YSB7XG4gIGZpeGVkPzogYm9vbGVhbjtcbiAgb2Jzb2xldGU/OiAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyO1xuICBsb2dpYz86IExvZ2ljO1xufVxuaW50ZXJmYWNlIEZsYWdDb250ZXh0IHtcbiAgdHJpZ2dlcj86IFRyaWdnZXI7XG4gIGxvY2F0aW9uPzogTG9jYXRpb247XG4gIG5wYz86IE5wYztcbiAgc3Bhd24/OiBudW1iZXI7XG4gIGluZGV4PzogbnVtYmVyO1xuICBkaWFsb2c/OiBib29sZWFuO1xuICBzZXQ/OiBib29sZWFuO1xuICAvL2RpYWxvZz86IExvY2FsRGlhbG9nfEdsb2JhbERpYWxvZztcbiAgLy9pbmRleD86IG51bWJlcjtcbiAgLy9jb25kaXRpb24/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZyB7XG5cbiAgZml4ZWQ6IGJvb2xlYW47XG4gIG9ic29sZXRlPzogKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcjtcbiAgbG9naWM6IExvZ2ljO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZsYWdzOiBGbGFncyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBpZDogbnVtYmVyLFxuICAgICAgICAgICAgICBkYXRhOiBGbGFnRGF0YSkge1xuICAgIHRoaXMuZml4ZWQgPSBkYXRhLmZpeGVkIHx8IGZhbHNlO1xuICAgIHRoaXMub2Jzb2xldGUgPSBkYXRhLm9ic29sZXRlO1xuICAgIHRoaXMubG9naWMgPSBkYXRhLmxvZ2ljID8/IFRSQUNLO1xuICB9XG5cbiAgZ2V0IGMoKTogQ29uZGl0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5pZCBhcyBDb25kaXRpb247XG4gIH1cblxuICBnZXQgcigpOiBSZXF1aXJlbWVudC5TaW5nbGUge1xuICAgIHJldHVybiBbW3RoaXMuaWQgYXMgQ29uZGl0aW9uXV07XG4gIH1cblxuICBnZXQgZGVidWcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMywgJzAnKSArICcgJyArIHRoaXMubmFtZTtcbiAgfVxuXG4gIGdldCBpdGVtKCk6IEl0ZW0ge1xuICAgIGlmICh0aGlzLmlkIDwgMHgxMDAgfHwgdGhpcy5pZCA+IDB4MTdmKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBhIHNsb3Q6ICR7dGhpcy5pZH1gKTtcbiAgICB9XG4gICAgY29uc3QgaXRlbUdldElkID0gdGhpcy5mbGFncy5yb20uc2xvdHNbdGhpcy5pZCAmIDB4ZmZdO1xuICAgIGNvbnN0IGl0ZW1JZCA9IHRoaXMuZmxhZ3Mucm9tLml0ZW1HZXRzW2l0ZW1HZXRJZF0uaXRlbUlkO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmZsYWdzLnJvbS5pdGVtc1tpdGVtSWRdO1xuICAgIGlmICghaXRlbSkgdGhyb3cgbmV3IEVycm9yKGBubyBpdGVtYCk7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbn1cblxuZnVuY3Rpb24gb2Jzb2xldGUob2Jzb2xldGU6IG51bWJlciB8ICgoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyKSk6IEZsYWcge1xuICBpZiAodHlwZW9mIG9ic29sZXRlID09PSAnbnVtYmVyJykgb2Jzb2xldGUgPSAobyA9PiAoKSA9PiBvKShvYnNvbGV0ZSk7XG4gIHJldHVybiB7b2Jzb2xldGUsIFtGTEFHXTogdHJ1ZX0gYXMgYW55O1xufVxuZnVuY3Rpb24gZml4ZWQoaWQ6IG51bWJlciwgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtpZCwgZml4ZWQ6IHRydWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIHRyYWNrZWQoaWQ6IG51bWJlcik6IEZsYWcge1xuICByZXR1cm4gZml4ZWQoaWQsIFRSQUNLKTtcbn1cbmZ1bmN0aW9uIG1vdmFibGUoaWQ6IG51bWJlciwgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtpZCwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gZGlhbG9nUHJvZ3Jlc3Npb24obmFtZTogc3RyaW5nLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge25hbWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGRpYWxvZ1RvZ2dsZShuYW1lOiBzdHJpbmcsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7bmFtZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuXG5mdW5jdGlvbiBwc2V1ZG8ob3duZXI6IG9iamVjdCk6IEZsYWcge1xuICBjb25zdCBpZCA9IHBzZXVkb0NvdW50ZXIuZ2V0KG93bmVyKSB8fCAweDQwMDtcbiAgcHNldWRvQ291bnRlci5zZXQob3duZXIsIGlkICsgMSk7XG4gIHJldHVybiB7aWQsIFtGTEFHXTogdHJ1ZSwgbG9naWM6IFRSQUNLfSBhcyBhbnk7XG59XG5jb25zdCBwc2V1ZG9Db3VudGVyID0gbmV3IFdlYWtNYXA8b2JqZWN0LCBudW1iZXI+KCk7XG5cbi8vIG9ic29sZXRlIGZsYWdzIC0gZGVsZXRlIHRoZSBzZXRzIChzaG91bGQgbmV2ZXIgYmUgYSBjbGVhcilcbi8vICAgICAgICAgICAgICAgIC0gcmVwbGFjZSB0aGUgY2hlY2tzIHdpdGggdGhlIHJlcGxhY2VtZW50XG5cbi8vIC0tLSBtYXliZSBvYnNvbGV0ZSBmbGFncyBjYW4gaGF2ZSBkaWZmZXJlbnQgcmVwbGFjZW1lbnRzIGluXG4vLyAgICAgZGlmZmVyZW50IGNvbnRleHRzP1xuLy8gLS0tIGluIHBhcnRpY3VsYXIsIGl0ZW1nZXRzIHNob3VsZG4ndCBjYXJyeSAxeHggZmxhZ3M/XG5cblxuLyoqIFRyYWNrcyB1c2VkIGFuZCB1bnVzZWQgZmxhZ3MuICovXG5leHBvcnQgY2xhc3MgRmxhZ3Mge1xuXG4gIFtpZDogbnVtYmVyXTogRmxhZztcblxuICAvLyAwMHhcbiAgMHgwMDAgPSBmaXhlZCgweDAwMCwgRkFMU0UpO1xuICAweDAwMSA9IGZpeGVkKDB4MDAxKTtcbiAgMHgwMDIgPSBmaXhlZCgweDAwMik7XG4gIDB4MDAzID0gZml4ZWQoMHgwMDMpO1xuICAweDAwNCA9IGZpeGVkKDB4MDA0KTtcbiAgMHgwMDUgPSBmaXhlZCgweDAwNSk7XG4gIDB4MDA2ID0gZml4ZWQoMHgwMDYpO1xuICAweDAwNyA9IGZpeGVkKDB4MDA3KTtcbiAgMHgwMDggPSBmaXhlZCgweDAwOCk7XG4gIDB4MDA5ID0gZml4ZWQoMHgwMDkpO1xuICBVc2VkV2luZG1pbGxLZXkgPSBmaXhlZCgweDAwYSwgVFJBQ0spO1xuICAweDAwYiA9IG9ic29sZXRlKDB4MTAwKTsgLy8gY2hlY2s6IHN3b3JkIG9mIHdpbmQgLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAwYyA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiB2aWxsYWdlcicpO1xuICBMZWFmVmlsbGFnZXJzUmVzY3VlZCA9IG1vdmFibGUoMHgwMGQpO1xuICAweDAwZSA9IG9ic29sZXRlKChzKSA9PiB7XG4gICAgaWYgKHMudHJpZ2dlcj8uaWQgPT09IDB4ODUpIHJldHVybiAweDE0MzsgLy8gY2hlY2s6IHRlbGVwYXRoeSAvIHN0b21cbiAgICByZXR1cm4gMHgyNDM7IC8vIGl0ZW06IHRlbGVwYXRoeVxuICB9KTtcbiAgV29rZVdpbmRtaWxsR3VhcmQgPSBtb3ZhYmxlKDB4MDBmLCBUUkFDSyk7XG5cbiAgLy8gMDF4XG4gIFR1cm5lZEluS2lyaXNhUGxhbnQgPSBtb3ZhYmxlKDB4MDEwKTtcbiAgMHgwMTEgPSBkaWFsb2dQcm9ncmVzc2lvbignV2VsY29tZWQgdG8gQW1hem9uZXMnKTtcbiAgMHgwMTIgPSBkaWFsb2dQcm9ncmVzc2lvbignVHJlYXN1cmUgaHVudGVyIGRlYWQnKTtcbiAgMHgwMTMgPSBvYnNvbGV0ZSgweDEzOCk7IC8vIGNoZWNrOiBicm9rZW4gc3RhdHVlIC8gc2FiZXJhIDFcbiAgLy8gdW51c2VkIDAxNCwgMDE1XG4gIDB4MDE2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1BvcnRvYSBxdWVlbiBSYWdlIGhpbnQnKTtcbiAgMHgwMTcgPSBvYnNvbGV0ZSgweDEwMik7IC8vIGNoZXN0OiBzd29yZCBvZiB3YXRlclxuICBFbnRlcmVkVW5kZXJncm91bmRDaGFubmVsID0gbW92YWJsZSgweDAxOCwgVFJBQ0spO1xuICAweDAxOSA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIHRpcmVkIG9mIHRhbGtpbmcnKTtcbiAgMHgwMWEgPSBkaWFsb2dQcm9ncmVzc2lvbignSW5pdGlhbCB0YWxrIHdpdGggUG9ydG9hIHF1ZWVuJyk7XG4gIE1lc2lhUmVjb3JkaW5nID0gbW92YWJsZSgweDAxYiwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDFjXG4gIFRhbGtlZFRvRm9ydHVuZVRlbGxlciA9IG1vdmFibGUoMHgxZCwgVFJBQ0spO1xuICBRdWVlblJldmVhbGVkID0gbW92YWJsZSgweDAxZSwgVFJBQ0spO1xuICAweDAxZiA9IG9ic29sZXRlKDB4MjA5KTsgLy8gaXRlbTogYmFsbCBvZiB3YXRlclxuXG4gIC8vIDAyeFxuICBRdWVlbk5vdEluVGhyb25lUm9vbSA9IG1vdmFibGUoMHgwMjApO1xuICBSZXR1cm5lZEZvZ0xhbXAgPSBtb3ZhYmxlKDB4MDIxLCBUUkFDSyk7XG4gIDB4MDIyID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NhaGFyYSBlbGRlcicpO1xuICAweDAyMyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTYWhhcmEgZWxkZXIgZGF1Z2h0ZXInKTtcbiAgMHgwMjQgPSBvYnNvbGV0ZSgweDEzZCk7IC8vIGNoZWNrOiBpdm9yeSBzdGF0dWUgLyBrYXJtaW5lXG4gIDB4MDI1ID0gb2Jzb2xldGUoMHgxMzYpOyAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiA9IG9ic29sZXRlKDB4MmZkKTsgLy8gd2FycDogc2h5cm9uXG4gIFNoeXJvbk1hc3NhY3JlID0gZml4ZWQoMHgwMjcsIFRSQUNLKTsgLy8gcHJlc2h1ZmZsZSBoYXJkY29kZXMgZm9yIGRlYWQgc3ByaXRlc1xuICBDaGFuZ2VXb21hbiA9IGZpeGVkKDB4MDI4KTsgLy8gaGFyZGNvZGVkIGluIG9yaWdpbmFsIHJvbVxuICBDaGFuZ2VBa2FoYW5hID0gZml4ZWQoMHgwMjkpO1xuICBDaGFuZ2VTb2xkaWVyID0gZml4ZWQoMHgwMmEpO1xuICBDaGFuZ2VTdG9tID0gZml4ZWQoMHgwMmIpO1xuICAvLyB1bnVzZWQgMDJjXG4gIDB4MDJkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NoeXJvbiBzYWdlcycpO1xuICAweDAyZSA9IG9ic29sZXRlKDB4MTJkKTsgLy8gY2hlY2s6IGRlbydzIHBlbmRhbnRcbiAgVXNlZEJvd09mVHJ1dGggPSBmaXhlZCgweDAyZik7ICAvLyBtb3ZlZCBmcm9tIDA4NiBpbiBwcmVwYXJzZVxuXG4gIC8vIDAzeFxuICAvLyB1bnVzZWQgMDMwXG4gIDB4MDMxID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1pvbWJpZSB0b3duJyk7XG4gIDB4MDMyID0gb2Jzb2xldGUoMHgxMzcpOyAvLyBjaGVjazogZXllIGdsYXNzZXNcbiAgLy8gdW51c2VkIDAzM1xuICAweDAzNCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBa2FoYW5hIGluIHdhdGVyZmFsbCBjYXZlJyk7IC8vID8/P1xuICBDdXJlZEFrYWhhbmEgPSBtb3ZhYmxlKDB4MDM1LCBUUkFDSyk7XG4gIDB4MDM2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FrYWhhbmEgU2h5cm9uJyk7XG4gIDB4MDM3ID0gb2Jzb2xldGUoMHgxNDIpOyAvLyBjaGVjazogcGFyYWx5c2lzXG4gIExlYWZBYmR1Y3Rpb24gPSBtb3ZhYmxlKDB4MDM4LCBUUkFDSyk7IC8vIG9uZS13YXkgbGF0Y2hcbiAgMHgwMzkgPSBvYnNvbGV0ZSgweDE0MSk7IC8vIGNoZWNrOiByZWZyZXNoXG4gIFRhbGtlZFRvWmVidUluQ2F2ZSA9IG1vdmFibGUoMHgwM2EsIFRSQUNLKTtcbiAgVGFsa2VkVG9aZWJ1SW5TaHlyb24gPSBtb3ZhYmxlKDB4MDNiLCBUUkFDSyk7XG4gIDB4MDNjID0gb2Jzb2xldGUoMHgxM2IpOyAvLyBjaGVzdDogbG92ZSBwZW5kYW50XG4gIDB4MDNkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FzaW5hIGluIFNoeXJvbiB0ZW1wbGUnKTtcbiAgRm91bmRLZW5zdUluRGFuY2VIYWxsID0gbW92YWJsZSgweDAzZSwgVFJBQ0spO1xuICAweDAzZiA9IG9ic29sZXRlKChzKSA9PiB7XG4gICAgaWYgKHMudHJpZ2dlcj8uaWQgPT09IDB4YmEpIHJldHVybiAweDI0NCAvLyBpdGVtOiB0ZWxlcG9ydFxuICAgIHJldHVybiAweDE0NDsgLy8gY2hlY2s6IHRlbGVwb3J0XG4gIH0pO1xuXG4gIC8vIDA0eFxuICAweDA0MCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3JuZWwgaW4gU2h5cm9uIHRlbXBsZScpO1xuICAweDA0MSA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICAvLyB1bnVzZWQgMDQyXG4gIC8vIHVudXNlZCAweDA0MyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsnKTtcbiAgMHgwNDQgPSBvYnNvbGV0ZSgweDEwNyk7IC8vIGNoZWNrOiBiYWxsIG9mIGZpcmUgLyBpbnNlY3RcbiAgUmVzY3VlZENoaWxkID0gZml4ZWQoMHgwNDUsIFRSQUNLKTsgLy8gaGFyZGNvZGVkICQzZTdkNVxuICBVc2VkSW5zZWN0Rmx1dGUgPSBmaXhlZCgweDA0Nik7IC8vIGN1c3RvbS1hZGRlZCAkNjQ4ODo0MFxuICBSZXNjdWVkTGVhZkVsZGVyID0gbW92YWJsZSgweDA0Nyk7XG4gIDB4MDQ4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1RyZWFzdXJlIGh1bnRlciBlbWJhcmtlZCcpO1xuICAweDA0OSA9IG9ic29sZXRlKDB4MTAxKTsgLy8gY2hlY2s6IHN3b3JkIG9mIGZpcmVcbiAgMHgwNGEgPSBkaWFsb2dQcm9ncmVzc2lvbignQm9hdCBvd25lcicpO1xuICAweDA0YiA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHNpY2sgbWVuJyk7XG4gIDB4MDRjID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gdHJhaW5pbmcgbWVuIDEnKTtcbiAgMHgwNGQgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiB0cmFpbmluZyBtZW4gMicpO1xuICAweDA0ZSA9IG9ic29sZXRlKDB4MTA2KTsgLy8gY2hlc3Q6IHRvcm5hZG8gYnJhY2VsZXRcbiAgMHgwNGYgPSBvYnNvbGV0ZSgweDEyYik7IC8vIGNoZWNrOiB3YXJyaW9yIHJpbmdcblxuICAvLyAwNXhcbiAgR2l2ZW5TdGF0dWVUb0FrYWhhbmEgPSBtb3ZhYmxlKDB4MDUwKTsgLy8gZ2l2ZSBpdCBiYWNrIGlmIHVuc3VjY2Vzc2Z1bD9cbiAgMHgwNTEgPSBvYnNvbGV0ZSgweDE0Nik7IC8vIGNoZWNrOiBiYXJyaWVyIC8gYW5ncnkgc2VhXG4gIFRhbGtlZFRvRHdhcmZNb3RoZXIgPSBtb3ZhYmxlKDB4MDUyLCBUUkFDSyk7XG4gIExlYWRpbmdDaGlsZCA9IGZpeGVkKDB4MDUzLCBUUkFDSyk7IC8vIGhhcmRjb2RlZCAkM2U3YzQgYW5kIGZvbGxvd2luZ1xuICAvLyB1bnVzZWQgMDU0XG4gIDB4MDU1ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1plYnUgcmVzY3VlZCcpO1xuICAweDA1NiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3JuZWwgcmVzY3VlZCcpO1xuICAweDA1NyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBc2luYSByZXNjdWVkJyk7XG4gIC8vIHVudXNlZCAwNTggLi4gMDVhXG4gIE10U2FicmVHdWFyZHNEZXNwYXduZWQgPSBtb3ZhYmxlKDB4MDViLCBUUlVFKTtcbiAgLy8gdW51c2VkIDA1YywgMDVkXG4gIDB4MDVlID0gb2Jzb2xldGUoMHgyOGQpOyAvLyBkcmF5Z29uIDJcbiAgMHgwNWYgPSBvYnNvbGV0ZSgweDIwMyk7IC8vIGl0ZW06IHN3b3JkIG9mIHRodW5kZXJcbiAgLy8gVE9ETyAtIGZpeCB1cCB0aGUgTlBDIHNwYXduIGFuZCB0cmlnZ2VyIGNvbmRpdGlvbnMgaW4gU2h5cm9uLlxuICAvLyBNYXliZSBqdXN0IHJlbW92ZSB0aGUgY3V0c2NlbmUgZW50aXJlbHk/XG5cbiAgLy8gMDZ4XG4gIC8vIHVudXNlZCAwNjBcbiAgVGFsa2VkVG9TdG9tSW5Td2FuID0gbW92YWJsZSgweDA2MSwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDYyICAvLyBvYnNvbGV0ZSgweDE1MSk7IC8vIGNoZXN0OiBzYWNyZWQgc2hpZWxkXG4gIDB4MDYzID0gb2Jzb2xldGUoMHgxNDcpOyAvLyBjaGVjazogY2hhbmdlXG4gIC8vIHVudXNlZCAwNjRcbiAgLy8gU3dhbkdhdGVPcGVuZWQgPSBtb3ZhYmxlKH4weDA2NCk7IC8vIHdoeSB3b3VsZCB3ZSBhZGQgdGhpcz8gdXNlIDJiM1xuICBDdXJlZEtlbnN1ID0gbW92YWJsZSgweDA2NSk7XG4gIC8vIHVudXNlZCAwNjZcbiAgMHgwNjcgPSBvYnNvbGV0ZSgweDEwYik7IC8vIGNoZWNrOiBiYWxsIG9mIHRodW5kZXIgLyBtYWRvIDFcbiAgMHgwNjggPSBvYnNvbGV0ZSgweDEwNCk7IC8vIGNoZWNrOiBmb3JnZWQgY3J5c3RhbGlzXG4gIC8vIHVudXNlZCAwNjlcbiAgU3RvbmVkUGVvcGxlQ3VyZWQgPSBtb3ZhYmxlKDB4MDZhLCBUUkFDSyk7XG4gIC8vIHVudXNlZCAwNmJcbiAgMHgwNmMgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgLy8gdW51c2VkIDA2ZCAuLiAwNmZcbiAgQ3VycmVudGx5UmlkaW5nRG9scGhpbiA9IGZpeGVkKH4weDA2ZSwgVFJBQ0spOyAvLywgeyAvLyBOT1RFOiBhZGRlZCBieSByYW5kb1xuICAvLyAgIGFsaWFzOiByb20gPT4gW3JvbS5pdGVtcy5TaGVsbEZsdXRlLml0ZW1Vc2VEYXRhWzBdLndhbnRdLFxuICAvLyB9KTtcblxuICAvLyAwN3hcbiAgUGFyYWx5emVkS2Vuc3VJblRhdmVybiA9IGZpeGVkKDB4MDcwKTsgLy8sIHsgLy8gaGFyZGNvZGVkIGluIHJhbmRvIHByZXNodWZmbGUuc1xuICAvLyAgIGFsaWFzOiByb20gPT4gW3JvbS5mbGFncy5QYXJhbHlzaXMuaWRdLFxuICAvLyB9KTtcbiAgUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCA9IGZpeGVkKDB4MDcxKTsgLy8sIHsgLy8gaGFyZGNvZGVkIGluIHJhbmRvIHByZXNodWZmbGUuc1xuICAvLyAgIGFsaWFzOiByb20gPT4gW3JvbS5mbGFncy5QYXJhbHlzaXMuaWRdLFxuICAvLyB9KTtcbiAgRm91bmRLZW5zdUluVGF2ZXJuID0gbW92YWJsZSgweDA3MiwgVFJBQ0spO1xuICAweDA3MyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTdGFydGxlZCBtYW4gaW4gTGVhZicpO1xuICAvLyB1bnVzZWQgMDc0XG4gIDB4MDc1ID0gb2Jzb2xldGUoMHgxMzkpOyAvLyBjaGVjazogZ2xvd2luZyBsYW1wXG4gIDB4MDc2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0tlbnN1IGluIEdvYScpO1xuICAweDA3NyA9IG9ic29sZXRlKDB4MTA4KTsgLy8gY2hlY2s6IGZsYW1lIGJyYWNlbGV0IC8ga2VsYmVzcXVlIDFcbiAgMHgwNzggPSBvYnNvbGV0ZSgweDEwYyk7IC8vIGNoZXN0OiBzdG9ybSBicmFjZWxldFxuICAweDA3OSA9IG9ic29sZXRlKDB4MTQwKTsgLy8gY2hlY2s6IGJvdyBvZiB0cnV0aFxuICAweDA3YSA9IG9ic29sZXRlKDB4MTBhKTsgLy8gY2hlc3Q6IGJsaXp6YXJkIGJyYWNlbGV0XG4gIDB4MDdiID0gb2Jzb2xldGUoMHgxMDkpOyAvLyByYWdlL2JhbGwgb2Ygd2F0ZXJcbiAgLy8gdW51c2VkIDA3YiwgMDdjXG4gIDB4MDdkID0gb2Jzb2xldGUoMHgxM2YpOyAvLyBjaGVzdDogYm93IG9mIHN1blxuICAweDA3ZSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdNdCBTYWJyZSBndWFyZHMgMScpO1xuICAweDA3ZiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdNdCBTYWJyZSBndWFyZHMgMicpO1xuXG4gIEFsYXJtRmx1dGVVc2VkT25jZSA9IGZpeGVkKDB4NzYpOyAvLyBoYXJkY29kZWQ6IHByZXNodWZmbGUucyBQYXRjaFRyYWRlSW5JdGVtXG4gIEZsdXRlT2ZMaW1lVXNlZE9uY2UgPSBmaXhlZCgweDc3KTsgLy8gaGFyZGNvZGVkOiBwcmVzaHVmZmxlLnMgUGF0Y2hUcmFkZUluSXRlbVxuXG4gIC8vIDA4eFxuICAvLyB1bnVzZWQgMDgwLCAwODFcbiAgMHgwODIgPSBvYnNvbGV0ZSgweDE0MCk7IC8vIGNoZWNrOiBib3cgb2YgdHJ1dGggLyBhenRlY2FcbiAgMHgwODMgPSBkaWFsb2dQcm9ncmVzc2lvbignUmVzY3VlZCBMZWFmIGVsZGVyJyk7XG4gIExlYWZWaWxsYWdlcnNDdXJyZW50bHlBYmR1Y3RlZCA9IG1vdmFibGUoMHgwODQpO1xuICBMZWFmRWxkZXJDdXJyZW50bHlBYmR1Y3RlZCA9IG1vdmFibGUoMHgwODUpO1xuICAvL1VzZWRCb3dPZlRydXRoID0gbW92YWJsZSgweDA4Nik7ICAvLyBtb3ZlZCBtYW51YWxseSBhdCBwcmVwYXJzZSB0byAyZlxuICAweDA4NyA9IG9ic29sZXRlKDB4MTA1KTsgLy8gY2hlc3Q6IGJhbGwgb2Ygd2luZFxuICAweDA4OCA9IG9ic29sZXRlKDB4MTMyKTsgLy8gY2hlY2s6IHdpbmRtaWxsIGtleVxuICAweDA4OSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFN0b21cXCdzIGdpcmxmcmllbmQnKTtcbiAgMHgwOGEgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTdG9tJyk7XG4gIDB4MDhiID0gb2Jzb2xldGUoMHgyMzYpOyAvLyBpdGVtOiBzaGVsbCBmbHV0ZVxuICAvLyB1bnVzZWQgMHgwOGMgPSBkaWFsb2dQcm9ncmVzc2lvbignU3dhbiBndWFyZHMgZGVzcGF3bmVkJyk7XG4gIDB4MDhkID0gb2Jzb2xldGUoMHgxMzcpOyAvLyBjaGVjazogZXllIGdsYXNzZXNcbiAgLy8gdW51c2VkIDA4ZVxuICAweDA4ZiA9IG9ic29sZXRlKDB4MjgzKTsgLy8gZXZlbnQ6IGNhbG1lZCBzZWFcblxuICAvLyAwOXhcbiAgMHgwOTAgPSBkaWFsb2dQcm9ncmVzc2lvbignU3RvbmVkIHBlb3BsZSBnb25lJyk7XG4gIC8vIHVudXNlZCAwOTFcbiAgMHgwOTIgPSBvYnNvbGV0ZSgweDEyOCk7IC8vIGNoZWNrOiBmbHV0ZSBvZiBsaW1lXG4gIC8vIHVudXNlZCAwOTMgLi4gMDk1XG4gIDB4MDk2ID0gZGlhbG9nVG9nZ2xlKCdMZWFmIGVsZGVyIGRhdWdodGVyJyk7XG4gIDB4MDk3ID0gZGlhbG9nVG9nZ2xlKCdMZWFmIHZpbGxhZ2VyJyk7XG4gIDB4MDk4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ05hZGFyZSB2aWxsYWdlcicpO1xuICAvLyB1bnVzZWQgMDk5LCAwOWFcbiAgQWJsZVRvUmlkZURvbHBoaW4gPSBtb3ZhYmxlKDB4MDliLCBUUkFDSyk7XG4gIFBvcnRvYVF1ZWVuR29pbmdBd2F5ID0gbW92YWJsZSgweDA5Yyk7XG4gIC8vIHVudXNlZCAwOWQgLi4gMDlmXG5cbiAgLy8gMGF4XG4gIDB4MGEwID0gb2Jzb2xldGUoMHgxMjcpOyAvLyBjaGVjazogaW5zZWN0IGZsdXRlXG4gIC8vIHVudXNlZCAwYTEsIDBhMlxuICAweDBhMyA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuL2ZvcnR1bmUgdGVsbGVyJyk7XG4gIFdva2VLZW5zdUluTGlnaHRob3VzZSA9IG1vdmFibGUoMHgwYTQsIFRSQUNLKTtcbiAgLy8gVE9ETzogdGhpcyBtYXkgbm90IGJlIG9ic29sZXRlIGlmIHRoZXJlJ3Mgbm8gaXRlbSBoZXJlP1xuICAweDBhNSA9IG9ic29sZXRlKDB4MTMxKTsgLy8gY2hlY2s6IGFsYXJtIGZsdXRlIC8gemVidSBzdHVkZW50XG4gIDB4MGE2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09hayBlbGRlciAxJyk7XG4gIDB4MGE3ID0gZGlhbG9nVG9nZ2xlKCdTd2FuIGRhbmNlcicpO1xuICAweDBhOCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsgZWxkZXIgMicpO1xuICBUYWxrZWRUb0xlYWZSYWJiaXQgPSBtb3ZhYmxlKDB4MGE5LCBUUkFDSyk7XG4gIDB4MGFhID0gb2Jzb2xldGUoMHgxMWQpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFiID0gb2Jzb2xldGUoMHgxNTApOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIC8vIHVudXNlZCAwYWNcbiAgMHgwYWQgPSBvYnNvbGV0ZSgweDE1Mik7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWUgPSBvYnNvbGV0ZSgweDE1Myk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWYgPSBvYnNvbGV0ZSgweDE1NCk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG5cbiAgLy8gMGJ4XG4gIDB4MGIwID0gb2Jzb2xldGUoMHgxNTUpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIxID0gb2Jzb2xldGUoMHgxNTYpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIyID0gb2Jzb2xldGUoMHgxNTcpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIzID0gb2Jzb2xldGUoMHgxNTgpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBiNCA9IG9ic29sZXRlKDB4MTU5KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiNSA9IG9ic29sZXRlKDB4MTVhKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGI2ID0gb2Jzb2xldGUoMHgxMWYpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjcgPSBvYnNvbGV0ZSgweDE1Yyk7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiOCA9IG9ic29sZXRlKDB4MTVkKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI5ID0gb2Jzb2xldGUoMHgxMWUpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmEgPSBvYnNvbGV0ZSgweDE1ZSk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYiA9IG9ic29sZXRlKDB4MTVmKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJjID0gb2Jzb2xldGUoMHgxNjApOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmQgPSBvYnNvbGV0ZSgweDEyMCk7IC8vIGNoZXN0OiBmcnVpdCBvZiBsaW1lXG4gIDB4MGJlID0gb2Jzb2xldGUoMHgxMjEpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYmYgPSBvYnNvbGV0ZSgweDE2Mik7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuXG4gIC8vIDBjeFxuICAweDBjMCA9IG9ic29sZXRlKDB4MTYzKTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGMxID0gb2Jzb2xldGUoMHgxNjQpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYzIgPSBvYnNvbGV0ZSgweDEyMik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGMzID0gb2Jzb2xldGUoMHgxNjUpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNCA9IG9ic29sZXRlKDB4MTY2KTsgLy8gY2hlc3Q6IGZydWl0IG9mIHJlcHVuXG4gIDB4MGM1ID0gb2Jzb2xldGUoMHgxNmIpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNiA9IG9ic29sZXRlKDB4MTZjKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzcgPSBvYnNvbGV0ZSgweDEyMyk7IC8vIGNoZXN0OiBmcnVpdCBvZiByZXB1blxuICAweDBjOCA9IG9ic29sZXRlKDB4MTI0KTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwYzkgPSBvYnNvbGV0ZSgweDE2YSk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGNhID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICAweDBjYiA9IG9ic29sZXRlKDB4MTJhKTsgLy8gY2hlc3Q6IHBvd2VyIHJpbmdcbiAgMHgwY2MgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgMHgwY2QgPSBvYnNvbGV0ZSgweDExNCk7IC8vIGNoZXN0OiBwc3ljaG8gc2hpZWxkXG4gIDB4MGNlID0gb2Jzb2xldGUoMHgxMjUpOyAvLyBjaGVzdDogc3RhdHVlIG9mIG9ueXhcbiAgMHgwY2YgPSBvYnNvbGV0ZSgweDEzMyk7IC8vIGNoZXN0OiBrZXkgdG8gcHJpc29uXG4gIFxuICAvLyAwZHhcbiAgMHgwZDAgPSBvYnNvbGV0ZSgweDEyOCk7IC8vIGNoZWNrOiBmbHV0ZSBvZiBsaW1lIC8gcXVlZW5cbiAgMHgwZDEgPSBvYnNvbGV0ZSgweDEzNSk7IC8vIGNoZXN0OiBmb2cgbGFtcFxuICAweDBkMiA9IG9ic29sZXRlKDB4MTY5KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwZDMgPSBvYnNvbGV0ZSgweDEyNik7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBkNCA9IG9ic29sZXRlKDB4MTViKTsgLy8gY2hlc3Q6IGZsdXRlIG9mIGxpbWVcbiAgMHgwZDUgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAxJyk7XG4gIDB4MGQ2ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMicpO1xuICAweDBkNyA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDMnKTtcbiAgMHgwZDggPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgcmVzY3VlZCcpO1xuICAweDBkOSA9IGRpYWxvZ1RvZ2dsZSgnU3RvbmVkIHBhaXInKTtcbiAgMHgwZGEgPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgZ29uZSBmcm9tIHRhdmVybicpO1xuICAweDBkYiA9IGRpYWxvZ1RvZ2dsZSgnSW4gU2FiZXJhXFwncyB0cmFwJyk7XG4gIDB4MGRjID0gb2Jzb2xldGUoMHgxNmYpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAvLyB1bnVzZWQgMGRkXG4gIDB4MGRlID0gb2Jzb2xldGUoMHgxMmMpOyAvLyBjaGVzdDogaXJvbiBuZWNrbGFjZVxuICAweDBkZiA9IG9ic29sZXRlKDB4MTFiKTsgLy8gY2hlc3Q6IGJhdHRsZSBhcm1vclxuXG4gIC8vIDBleFxuICAweDBlMCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIEFrYWhhbmEnKTtcbiAgLy8gdW51c2VkIDBlMSAuLiAwZTNcbiAgMHgwZTQgPSBvYnNvbGV0ZSgweDEzYyk7IC8vIGNoZXN0OiBraXJpc2EgcGxhbnRcbiAgMHgwZTUgPSBvYnNvbGV0ZSgweDE2ZSk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGU2ID0gb2Jzb2xldGUoMHgxNmQpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwZTcgPSBvYnNvbGV0ZSgweDEyZik7IC8vIGNoZXN0OiBsZWF0aGVyIGJvb3RzXG4gIDB4MGU4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU2h5cm9uIHZpbGxhZ2VyJyk7XG4gIDB4MGU5ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU2h5cm9uIGd1YXJkJyk7XG4gIDB4MGVhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMScpO1xuICAweDBlYiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDInKTtcbiAgMHgwZWMgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAzJyk7XG4gIDB4MGVkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ01lc2lhJyk7XG4gIC8vIHVudXNlZCAwZWUgLi4gMGZmXG4gIFRhbGtlZFRvWmVidVN0dWRlbnQgPSBtb3ZhYmxlKDB4MGVlLCBUUkFDSyk7XG5cbiAgLy8gMTAwXG4gIDB4MTAwID0gb2Jzb2xldGUoMHgxMmUpOyAvLyBjaGVjazogcmFiYml0IGJvb3RzIC8gdmFtcGlyZVxuICAweDEwMSA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICAweDEwMiA9IG9ic29sZXRlKDB4MTA4KTsgLy8gY2hlY2s6IGZsYW1lIGJyYWNlbGV0IC8ga2VsYmVzcXVlIDFcbiAgMHgxMDMgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIGNoZWNrOiBiYWxsIG9mIHdhdGVyIC8gcmFnZVxuICAvLyB1bnVzZWQgMTA0XG4gIDB4MTA1ID0gb2Jzb2xldGUoMHgxMjYpOyAvLyBjaGVjazogb3BlbCBzdGF0dWUgLyBrZWxiZXNxdWUgMlxuICAweDEwNiA9IG9ic29sZXRlKDB4MTIzKTsgLy8gY2hlY2s6IGZydWl0IG9mIHJlcHVuIC8gc2FiZXJhIDJcbiAgMHgxMDcgPSBvYnNvbGV0ZSgweDExMik7IC8vIGNoZWNrOiBzYWNyZWQgc2hpZWxkIC8gbWFkbyAyXG4gIDB4MTA4ID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICBVc2VkQm93T2ZNb29uID0gbW92YWJsZSgweDEwOSk7XG4gIFVzZWRCb3dPZlN1biA9IG1vdmFibGUoMHgxMGEpO1xuICAweDEwYiA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAweDEwYyA9IG9ic29sZXRlKDB4MTYxKTsgLy8gY2hlY2s6IGZydWl0IG9mIHBvd2VyIC8gdmFtcGlyZSAyXG5cbiAgLy8gMTAwIC4uIDE3ZiA9PiBmaXhlZCBmbGFncyBmb3IgY2hlY2tzLlxuXG4gIC8vIFRPRE8gLSBhcmUgdGhlc2UgYWxsIFRSQUNLIG9yIGp1c3QgdGhlIG5vbi1jaGVzdHM/IT9cblxuICAvLyBUT0RPIC0gYmFzaWMgaWRlYSAtIE5QQyBoaXRib3ggZXh0ZW5kcyBkb3duIG9uZSB0aWxlPyAoaXMgdGhhdCBlbm91Z2g/KVxuICAvLyAgICAgIC0gc3RhdHVlcyBjYW4gYmUgZW50ZXJlZCBidXQgbm90IGV4aXRlZD9cbiAgLy8gICAgICAtIHVzZSB0cmlnZ2VyICh8IHBhcmFseXNpcyB8IGdsaXRjaCkgZm9yIG1vdmluZyBzdGF0dWVzP1xuICAvLyAgICAgICAgICAtPiBnZXQgbm9ybWFsIHJlcXVpcmVtZW50cyBmb3IgZnJlZVxuICAvLyAgICAgICAgICAtPiBiZXR0ZXIgaGl0Ym94PyAgYW55IHdheSB0byBnZXQgcXVlZW4gdG8gd29yaz8gdG9vIG11Y2ggc3RhdGU/XG4gIC8vICAgICAgICAgICAgIG1heSBuZWVkIHRvIGhhdmUgdHdvIGRpZmZlcmVudCB0aHJvbmUgcm9vbXM/IChmdWxsL2VtcHR5KVxuICAvLyAgICAgICAgICAgICBhbmQgaGF2ZSBmbGFnIHN0YXRlIGFmZmVjdCBleGl0Pz8/XG4gIC8vICAgICAgLSBhdCB0aGUgdmVyeSBsZWFzdCB3ZSBjYW4gdXNlIGl0IGZvciB0aGUgaGl0Ym94LCBidXQgd2UgbWF5IHN0aWxsXG4gIC8vICAgICAgICBuZWVkIGN1c3RvbSBvdmVybGF5P1xuXG4gIC8vIFRPRE8gLSBwc2V1ZG8gZmxhZ3Mgc29tZXdoZXJlPyAgbGlrZSBzd29yZD8gYnJlYWsgaXJvbj8gZXRjLi4uXG5cbiAgTGVhZkVsZGVyID0gdHJhY2tlZCh+MHgxMDApO1xuICBPYWtFbGRlciA9IHRyYWNrZWQofjB4MTAxKTtcbiAgV2F0ZXJmYWxsQ2F2ZVN3b3JkT2ZXYXRlckNoZXN0ID0gdHJhY2tlZCh+MHgxMDIpO1xuICBTdHh5TGVmdFVwcGVyU3dvcmRPZlRodW5kZXJDaGVzdCA9IHRyYWNrZWQofjB4MTAzKTtcbiAgTWVzaWFJblRvd2VyID0gdHJhY2tlZCgweDEwNCk7XG4gIFNlYWxlZENhdmVCYWxsT2ZXaW5kQ2hlc3QgPSB0cmFja2VkKH4weDEwNSk7XG4gIE10U2FicmVXZXN0VG9ybmFkb0JyYWNlbGV0Q2hlc3QgPSB0cmFja2VkKH4weDEwNik7XG4gIEdpYW50SW5zZWN0ID0gdHJhY2tlZCh+MHgxMDcpO1xuICBLZWxiZXNxdWUxID0gdHJhY2tlZCh+MHgxMDgpO1xuICBSYWdlID0gdHJhY2tlZCh+MHgxMDkpO1xuICBBcnlsbGlzQmFzZW1lbnRDaGVzdCA9IHRyYWNrZWQofjB4MTBhKTtcbiAgTWFkbzEgPSB0cmFja2VkKH4weDEwYik7XG4gIFN0b3JtQnJhY2VsZXRDaGVzdCA9IHRyYWNrZWQofjB4MTBjKTtcbiAgV2F0ZXJmYWxsQ2F2ZVJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDExMCk7IC8vIHJhbmRvIGNoYW5nZWQgaW5kZXghXG4gIE1hZG8yID0gdHJhY2tlZCgweDExMik7XG4gIFN0eHlSaWdodE1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDExNCk7XG4gIEJhdHRsZUFybW9yQ2hlc3QgPSB0cmFja2VkKDB4MTFiKTtcbiAgRHJheWdvbjEgPSB0cmFja2VkKDB4MTFjKTtcbiAgU2VhbGVkQ2F2ZVNtYWxsUm9vbUJhY2tDaGVzdCA9IHRyYWNrZWQoMHgxMWQpOyAvLyBtZWRpY2FsIGhlcmJcbiAgU2VhbGVkQ2F2ZUJpZ1Jvb21Ob3J0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxMWUpOyAvLyBhbnRpZG90ZVxuICBGb2dMYW1wQ2F2ZUZyb250Q2hlc3QgPSB0cmFja2VkKDB4MTFmKTsgLy8gbHlzaXMgcGxhbnRcbiAgTXRIeWRyYVJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTIwKTsgLy8gZnJ1aXQgb2YgbGltZVxuICBTYWJlcmFVcHN0YWlyc0xlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMjEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBFdmlsU3Bpcml0SXNsYW5kTG93ZXJDaGVzdCA9IHRyYWNrZWQoMHgxMjIpOyAvLyBtYWdpYyByaW5nXG4gIFNhYmVyYTIgPSB0cmFja2VkKDB4MTIzKTsgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgU2VhbGVkQ2F2ZVNtYWxsUm9vbUZyb250Q2hlc3QgPSB0cmFja2VkKDB4MTI0KTsgLy8gd2FycCBib290c1xuICBDb3JkZWxHcmFzcyA9IHRyYWNrZWQoMHgxMjUpO1xuICBLZWxiZXNxdWUyID0gdHJhY2tlZCgweDEyNik7IC8vIG9wZWwgc3RhdHVlXG4gIE9ha01vdGhlciA9IHRyYWNrZWQoMHgxMjcpO1xuICBQb3J0b2FRdWVlbiA9IHRyYWNrZWQoMHgxMjgpO1xuICBBa2FoYW5hU3RhdHVlT2ZPbnl4VHJhZGVpbiA9IHRyYWNrZWQoMHgxMjkpO1xuICBPYXNpc0NhdmVGb3J0cmVzc0Jhc2VtZW50Q2hlc3QgPSB0cmFja2VkKDB4MTJhKTtcbiAgQnJva2FoYW5hID0gdHJhY2tlZCgweDEyYik7XG4gIEV2aWxTcGlyaXRJc2xhbmRSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMmMpO1xuICBEZW8gPSB0cmFja2VkKDB4MTJkKTtcbiAgVmFtcGlyZTEgPSB0cmFja2VkKDB4MTJlKTtcbiAgT2FzaXNDYXZlTm9ydGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTJmKTtcbiAgQWthaGFuYUZsdXRlT2ZMaW1lVHJhZGVpbiA9IHRyYWNrZWQoMHgxMzApO1xuICBaZWJ1U3R1ZGVudCA9IHRyYWNrZWQoMHgxMzEpOyAvLyBUT0RPIC0gbWF5IG9wdCBmb3IgMiBpbiBjYXZlIGluc3RlYWQ/XG4gIFdpbmRtaWxsR3VhcmRBbGFybUZsdXRlVHJhZGVpbiA9IHRyYWNrZWQoMHgxMzIpO1xuICBNdFNhYnJlTm9ydGhCYWNrT2ZQcmlzb25DaGVzdCA9IHRyYWNrZWQoMHgxMzMpO1xuICBaZWJ1SW5TaHlyb24gPSB0cmFja2VkKDB4MTM0KTtcbiAgRm9nTGFtcENhdmVCYWNrQ2hlc3QgPSB0cmFja2VkKDB4MTM1KTtcbiAgSW5qdXJlZERvbHBoaW4gPSB0cmFja2VkKDB4MTM2KTtcbiAgQ2xhcmsgPSB0cmFja2VkKDB4MTM3KTtcbiAgU2FiZXJhMSA9IHRyYWNrZWQoMHgxMzgpO1xuICBLZW5zdUluTGlnaHRob3VzZSA9IHRyYWNrZWQoMHgxMzkpO1xuICBSZXBhaXJlZFN0YXR1ZSA9IHRyYWNrZWQoMHgxM2EpO1xuICBVbmRlcmdyb3VuZENoYW5uZWxVbmRlcndhdGVyQ2hlc3QgPSB0cmFja2VkKDB4MTNiKTtcbiAgS2lyaXNhTWVhZG93ID0gdHJhY2tlZCgweDEzYyk7XG4gIEthcm1pbmUgPSB0cmFja2VkKDB4MTNkKTtcbiAgQXJ5bGxpcyA9IHRyYWNrZWQoMHgxM2UpO1xuICBNdEh5ZHJhU3VtbWl0Q2hlc3QgPSB0cmFja2VkKDB4MTNmKTtcbiAgQXp0ZWNhSW5QeXJhbWlkID0gdHJhY2tlZCgweDE0MCk7XG4gIFplYnVBdFdpbmRtaWxsID0gdHJhY2tlZCgweDE0MSk7XG4gIE10U2FicmVOb3J0aFN1bW1pdCA9IHRyYWNrZWQoMHgxNDIpO1xuICBTdG9tRmlnaHRSZXdhcmQgPSB0cmFja2VkKDB4MTQzKTtcbiAgTXRTYWJyZVdlc3RUb3JuZWwgPSB0cmFja2VkKDB4MTQ0KTtcbiAgQXNpbmFJbkJhY2tSb29tID0gdHJhY2tlZCgweDE0NSk7XG4gIEJlaGluZFdoaXJscG9vbCA9IHRyYWNrZWQoMHgxNDYpO1xuICBLZW5zdUluU3dhbiA9IHRyYWNrZWQoMHgxNDcpO1xuICBTbGltZWRLZW5zdSA9IHRyYWNrZWQoMHgxNDgpO1xuICBTZWFsZWRDYXZlQmlnUm9vbVNvdXRod2VzdENoZXN0ID0gdHJhY2tlZCgweDE1MCk7IC8vIG1lZGljYWwgaGVyYlxuICAvLyB1bnVzZWQgMTUxIHNhY3JlZCBzaGllbGQgY2hlc3RcbiAgTXRTYWJyZVdlc3RSaWdodENoZXN0ID0gdHJhY2tlZCgweDE1Mik7IC8vIG1lZGljYWwgaGVyYlxuICBNdFNhYnJlTm9ydGhNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNTMpOyAvLyBtZWRpY2FsIGhlcmJcbiAgRm9ydHJlc3NNYWRvSGVsbHdheUNoZXN0ID0gdHJhY2tlZCgweDE1NCk7IC8vIG1hZ2ljIHJpbmdcbiAgU2FiZXJhVXBzdGFpcnNSaWdodENoZXN0ID0gdHJhY2tlZCgweDE1NSk7IC8vIG1lZGljYWwgaGVyYiBhY3Jvc3Mgc3Bpa2VzXG4gIE10SHlkcmFGYXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTU2KTsgLy8gbWVkaWNhbCBoZXJiXG4gIFN0eHlMZWZ0TG93ZXJDaGVzdCA9IHRyYWNrZWQoMHgxNTcpOyAvLyBtZWRpY2FsIGhlcmJcbiAgS2FybWluZUJhc2VtZW50TG93ZXJNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNTgpOyAvLyBtYWdpYyByaW5nXG4gIEVhc3RDYXZlTm9ydGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTU5KTsgLy8gbWVkaWNhbCBoZXJiICh1bnVzZWQpXG4gIE9hc2lzQ2F2ZUVudHJhbmNlQWNyb3NzUml2ZXJDaGVzdCA9IHRyYWNrZWQoMHgxNWEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICAvLyB1bnVzZWQgMTViIDJuZCBmbHV0ZSBvZiBsaW1lIC0gY2hhbmdlZCBpbiByYW5kb1xuICAvLyBXYXRlcmZhbGxDYXZlUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTViKTsgLy8gMm5kIGZsdXRlIG9mIGxpbWVcbiAgRXZpbFNwaXJpdElzbGFuZEV4aXRDaGVzdCA9IHRyYWNrZWQoMHgxNWMpOyAvLyBseXNpcyBwbGFudFxuICBGb3J0cmVzc1NhYmVyYU1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1ZCk7IC8vIGx5c2lzIHBsYW50XG4gIE10U2FicmVOb3J0aFVuZGVyQnJpZGdlQ2hlc3QgPSB0cmFja2VkKDB4MTVlKTsgLy8gYW50aWRvdGVcbiAgS2lyaXNhUGxhbnRDYXZlQ2hlc3QgPSB0cmFja2VkKDB4MTVmKTsgLy8gYW50aWRvdGVcbiAgRm9ydHJlc3NNYWRvVXBwZXJOb3J0aENoZXN0ID0gdHJhY2tlZCgweDE2MCk7IC8vIGFudGlkb3RlXG4gIFZhbXBpcmUyID0gdHJhY2tlZCgweDE2MSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEZvcnRyZXNzU2FiZXJhTm9ydGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTYyKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRm9ydHJlc3NNYWRvTG93ZXJDZW50ZXJOb3J0aENoZXN0ID0gdHJhY2tlZCgweDE2Myk7IC8vIG9wZWwgc3RhdHVlXG4gIE9hc2lzQ2F2ZU5lYXJFbnRyYW5jZUNoZXN0ID0gdHJhY2tlZCgweDE2NCk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIE10SHlkcmFMZWZ0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNjUpOyAvLyBtYWdpYyByaW5nXG4gIEZvcnRyZXNzU2FiZXJhU291dGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTY2KTsgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgS2Vuc3VJbkNhYmluID0gdHJhY2tlZCgweDE2Nyk7IC8vIGFkZGVkIGJ5IHJhbmRvbWl6ZXIgaWYgZm9nIGxhbXAgbm90IG5lZWRlZFxuICAvLyB1bnVzZWQgMTY4IG1hZ2ljIHJpbmcgY2hlc3RcbiAgTXRTYWJyZVdlc3ROZWFyS2Vuc3VDaGVzdCA9IHRyYWNrZWQoMHgxNjkpOyAvLyBtYWdpYyByaW5nXG4gIE10U2FicmVXZXN0TGVmdENoZXN0ID0gdHJhY2tlZCgweDE2YSk7IC8vIHdhcnAgYm9vdHNcbiAgRm9ydHJlc3NNYWRvVXBwZXJCZWhpbmRXYWxsQ2hlc3QgPSB0cmFja2VkKDB4MTZiKTsgLy8gbWFnaWMgcmluZ1xuICBQeXJhbWlkQ2hlc3QgPSB0cmFja2VkKDB4MTZjKTsgLy8gbWFnaWMgcmluZ1xuICBDcnlwdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTZkKTsgLy8gb3BlbCBzdGF0dWVcbiAgS2FybWluZUJhc2VtZW50TG93ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTZlKTsgLy8gd2FycCBib290c1xuICBGb3J0cmVzc01hZG9Mb3dlclNvdXRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE2Zik7IC8vIG1hZ2ljIHJpbmdcbiAgLy8gPSB0cmFja2VkKDB4MTcwKTsgLy8gbWltaWMgLyBtZWRpY2FsIGhlcmJcbiAgLy8gVE9ETyAtIGFkZCBhbGwgdGhlIG1pbWljcywgZ2l2ZSB0aGVtIHN0YWJsZSBudW1iZXJzP1xuICBGb2dMYW1wQ2F2ZU1pZGRsZU5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTcwKTtcbiAgRm9nTGFtcENhdmVNaWRkbGVTb3V0aHdlc3RNaW1pYyA9IHRyYWNrZWQoMHgxNzEpO1xuICBXYXRlcmZhbGxDYXZlRnJvbnRNaW1pYyA9IHRyYWNrZWQoMHgxNzIpO1xuICBFdmlsU3Bpcml0SXNsYW5kUml2ZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3Myk7XG4gIE10SHlkcmFGaW5hbENhdmVNaW1pYyA9IHRyYWNrZWQoMHgxNzQpO1xuICBTdHh5TGVmdE5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTc1KTtcbiAgU3R4eVJpZ2h0Tm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzYpO1xuICBTdHh5UmlnaHRTb3V0aE1pbWljID0gdHJhY2tlZCgweDE3Nyk7XG4gIENyeXB0TGVmdFBpdE1pbWljID0gdHJhY2tlZCgweDE3OCk7XG4gIEthcm1pbmVCYXNlbWVudFVwcGVyTWlkZGxlTWltaWMgPSB0cmFja2VkKDB4MTc5KTtcbiAgS2FybWluZUJhc2VtZW50VXBwZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3YSk7XG4gIEthcm1pbmVCYXNlbWVudExvd2VyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxN2IpO1xuICAvLyBUT0RPIC0gbWltaWNzIDEzLi4xNiA/XG5cbiAgLy8gMTgwIC4uIDFmZiA9PiBmaXhlZCBmbGFncyBmb3Igb3ZlcmZsb3cgYnVmZmVyLlxuXG4gIC8vIDIwMCAuLiAyN2YgPT4gZml4ZWQgZmxhZ3MgZm9yIGl0ZW1zLlxuICBTd29yZE9mV2luZCA9IHRyYWNrZWQoMHgyMDApO1xuICBTd29yZE9mRmlyZSA9IHRyYWNrZWQoMHgyMDEpO1xuICBTd29yZE9mV2F0ZXIgPSB0cmFja2VkKDB4MjAyKTtcbiAgU3dvcmRPZlRodW5kZXIgPSB0cmFja2VkKDB4MjAzKTtcbiAgQ3J5c3RhbGlzID0gdHJhY2tlZCgweDIwNCk7XG4gIEJhbGxPZldpbmQgPSB0cmFja2VkKDB4MjA1KTtcbiAgVG9ybmFkb0JyYWNlbGV0ID0gdHJhY2tlZCgweDIwNik7XG4gIEJhbGxPZkZpcmUgPSB0cmFja2VkKDB4MjA3KTtcbiAgRmxhbWVCcmFjZWxldCA9IHRyYWNrZWQoMHgyMDgpO1xuICBCYWxsT2ZXYXRlciA9IHRyYWNrZWQoMHgyMDkpO1xuICBCbGl6emFyZEJyYWNlbGV0ID0gdHJhY2tlZCgweDIwYSk7XG4gIEJhbGxPZlRodW5kZXIgPSB0cmFja2VkKDB4MjBiKTtcbiAgU3Rvcm1CcmFjZWxldCA9IHRyYWNrZWQoMHgyMGMpO1xuICBDYXJhcGFjZVNoaWVsZCA9IHRyYWNrZWQoMHgyMGQpO1xuICBCcm9uemVTaGllbGQgPSB0cmFja2VkKDB4MjBlKTtcbiAgUGxhdGludW1TaGllbGQgPSB0cmFja2VkKDB4MjBmKTtcbiAgTWlycm9yZWRTaGllbGQgPSB0cmFja2VkKDB4MjEwKTtcbiAgQ2VyYW1pY1NoaWVsZCA9IHRyYWNrZWQoMHgyMTEpO1xuICBTYWNyZWRTaGllbGQgPSB0cmFja2VkKDB4MjEyKTtcbiAgQmF0dGxlU2hpZWxkID0gdHJhY2tlZCgweDIxMyk7XG4gIFBzeWNob1NoaWVsZCA9IHRyYWNrZWQoMHgyMTQpO1xuICBUYW5uZWRIaWRlID0gdHJhY2tlZCgweDIxNSk7XG4gIExlYXRoZXJBcm1vciA9IHRyYWNrZWQoMHgyMTYpO1xuICBCcm9uemVBcm1vciA9IHRyYWNrZWQoMHgyMTcpO1xuICBQbGF0aW51bUFybW9yID0gdHJhY2tlZCgweDIxOCk7XG4gIFNvbGRpZXJTdWl0ID0gdHJhY2tlZCgweDIxOSk7XG4gIENlcmFtaWNTdWl0ID0gdHJhY2tlZCgweDIxYSk7XG4gIEJhdHRsZUFybW9yID0gdHJhY2tlZCgweDIxYik7XG4gIFBzeWNob0FybW9yID0gdHJhY2tlZCgweDIxYyk7XG4gIE1lZGljYWxIZXJiID0gdHJhY2tlZCgweDIxZCk7XG4gIEFudGlkb3RlID0gdHJhY2tlZCgweDIxZSk7XG4gIEx5c2lzUGxhbnQgPSB0cmFja2VkKDB4MjFmKTtcbiAgRnJ1aXRPZkxpbWUgPSB0cmFja2VkKDB4MjIwKTtcbiAgRnJ1aXRPZlBvd2VyID0gdHJhY2tlZCgweDIyMSk7XG4gIE1hZ2ljUmluZyA9IHRyYWNrZWQoMHgyMjIpO1xuICBGcnVpdE9mUmVwdW4gPSB0cmFja2VkKDB4MjIzKTtcbiAgV2FycEJvb3RzID0gdHJhY2tlZCgweDIyNCk7XG4gIFN0YXR1ZU9mT255eCA9IHRyYWNrZWQoMHgyMjUpO1xuICBPcGVsU3RhdHVlID0gdHJhY2tlZCgweDIyNik7XG4gIEluc2VjdEZsdXRlID0gdHJhY2tlZCgweDIyNyk7XG4gIEZsdXRlT2ZMaW1lID0gdHJhY2tlZCgweDIyOCk7XG4gIEdhc01hc2sgPSB0cmFja2VkKDB4MjI5KTtcbiAgUG93ZXJSaW5nID0gdHJhY2tlZCgweDIyYSk7XG4gIFdhcnJpb3JSaW5nID0gdHJhY2tlZCgweDIyYik7XG4gIElyb25OZWNrbGFjZSA9IHRyYWNrZWQoMHgyMmMpO1xuICBEZW9zUGVuZGFudCA9IHRyYWNrZWQoMHgyMmQpO1xuICBSYWJiaXRCb290cyA9IHRyYWNrZWQoMHgyMmUpO1xuICBMZWF0aGVyQm9vdHMgPSB0cmFja2VkKDB4MjJmKTtcbiAgU2hpZWxkUmluZyA9IHRyYWNrZWQoMHgyMzApO1xuICBBbGFybUZsdXRlID0gdHJhY2tlZCgweDIzMSk7XG4gIFdpbmRtaWxsS2V5ID0gdHJhY2tlZCgweDIzMik7XG4gIEtleVRvUHJpc29uID0gdHJhY2tlZCgweDIzMyk7XG4gIEtleVRvU3R4eSA9IHRyYWNrZWQoMHgyMzQpO1xuICBGb2dMYW1wID0gdHJhY2tlZCgweDIzNSk7XG4gIFNoZWxsRmx1dGUgPSB0cmFja2VkKDB4MjM2KTtcbiAgRXllR2xhc3NlcyA9IHRyYWNrZWQoMHgyMzcpO1xuICBCcm9rZW5TdGF0dWUgPSB0cmFja2VkKDB4MjM4KTtcbiAgR2xvd2luZ0xhbXAgPSB0cmFja2VkKDB4MjM5KTtcbiAgU3RhdHVlT2ZHb2xkID0gdHJhY2tlZCgweDIzYSk7XG4gIExvdmVQZW5kYW50ID0gdHJhY2tlZCgweDIzYik7XG4gIEtpcmlzYVBsYW50ID0gdHJhY2tlZCgweDIzYyk7XG4gIEl2b3J5U3RhdHVlID0gdHJhY2tlZCgweDIzZCk7XG4gIEJvd09mTW9vbiA9IHRyYWNrZWQoMHgyM2UpO1xuICBCb3dPZlN1biA9IHRyYWNrZWQoMHgyM2YpO1xuICBCb3dPZlRydXRoID0gdHJhY2tlZCgweDI0MCk7XG4gIFJlZnJlc2ggPSB0cmFja2VkKDB4MjQxKTtcbiAgUGFyYWx5c2lzID0gdHJhY2tlZCgweDI0Mik7XG4gIFRlbGVwYXRoeSA9IHRyYWNrZWQoMHgyNDMpO1xuICBUZWxlcG9ydCA9IHRyYWNrZWQoMHgyNDQpO1xuICBSZWNvdmVyID0gdHJhY2tlZCgweDI0NSk7XG4gIEJhcnJpZXIgPSB0cmFja2VkKDB4MjQ2KTtcbiAgQ2hhbmdlID0gdHJhY2tlZCgweDI0Nyk7XG4gIEZsaWdodCA9IHRyYWNrZWQoMHgyNDgpO1xuXG4gIC8vIDI4MCAuLiAyZjAgPT4gZml4ZWQgZmxhZ3MgZm9yIHdhbGxzLlxuICBDYWxtZWRBbmdyeVNlYSA9IHRyYWNrZWQoMHgyODMpO1xuICBPcGVuZWRKb2VsU2hlZCA9IHRyYWNrZWQoMHgyODcpO1xuICBEcmF5Z29uMiA9IHRyYWNrZWQoMHgyOGQpO1xuICBPcGVuZWRDcnlwdCA9IHRyYWNrZWQoMHgyOGUpO1xuICBPcGVuZWRTdHh5ID0gdHJhY2tlZCgweDJiMCk7XG4gIE9wZW5lZFN3YW5HYXRlID0gdHJhY2tlZCgweDJiMyk7XG4gIE9wZW5lZFByaXNvbiA9IHRyYWNrZWQoMHgyZDgpO1xuICBPcGVuZWRTZWFsZWRDYXZlID0gdHJhY2tlZCgweDJlZSk7XG5cbiAgLy8gTm90aGluZyBldmVyIHNldHMgdGhpcywgc28ganVzdCB1c2UgaXQgcmlnaHQgb3V0LlxuICBBbHdheXNUcnVlID0gZml4ZWQoMHgyZjAsIFRSVUUpO1xuXG4gIFdhcnBMZWFmID0gdHJhY2tlZCgweDJmNSk7XG4gIFdhcnBCcnlubWFlciA9IHRyYWNrZWQoMHgyZjYpO1xuICBXYXJwT2FrID0gdHJhY2tlZCgweDJmNyk7XG4gIFdhcnBOYWRhcmUgPSB0cmFja2VkKDB4MmY4KTtcbiAgV2FycFBvcnRvYSA9IHRyYWNrZWQoMHgyZjkpO1xuICBXYXJwQW1hem9uZXMgPSB0cmFja2VkKDB4MmZhKTtcbiAgV2FycEpvZWwgPSB0cmFja2VkKDB4MmZiKTtcbiAgV2FycFpvbWJpZSA9IHRyYWNrZWQofjB4MmZiKTtcbiAgV2FycFN3YW4gPSB0cmFja2VkKDB4MmZjKTtcbiAgV2FycFNoeXJvbiA9IHRyYWNrZWQoMHgyZmQpO1xuICBXYXJwR29hID0gdHJhY2tlZCgweDJmZSk7XG4gIFdhcnBTYWhhcmEgPSB0cmFja2VkKDB4MmZmKTtcblxuICAvLyBQc2V1ZG8gZmxhZ3NcbiAgU3dvcmQgPSBwc2V1ZG8odGhpcyk7XG4gIE1vbmV5ID0gcHNldWRvKHRoaXMpO1xuICBCcmVha1N0b25lID0gcHNldWRvKHRoaXMpO1xuICBCcmVha0ljZSA9IHBzZXVkbyh0aGlzKTtcbiAgRm9ybUJyaWRnZSA9IHBzZXVkbyh0aGlzKTtcbiAgQnJlYWtJcm9uID0gcHNldWRvKHRoaXMpO1xuICBUcmF2ZWxTd2FtcCA9IHBzZXVkbyh0aGlzKTtcbiAgQ2xpbWJXYXRlcmZhbGwgPSBwc2V1ZG8odGhpcyk7XG4gIEJ1eUhlYWxpbmcgPSBwc2V1ZG8odGhpcyk7XG4gIEJ1eVdhcnAgPSBwc2V1ZG8odGhpcyk7XG4gIFNob290aW5nU3RhdHVlID0gcHNldWRvKHRoaXMpO1xuICBDbGltYlNsb3BlOCA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgc2xvcGVzIGhlaWdodCA2LThcbiAgQ2xpbWJTbG9wZTkgPSBwc2V1ZG8odGhpcyk7IC8vIGNsaW1iIHNsb3BlcyBoZWlnaHQgOVxuICBXaWxkV2FycCA9IHBzZXVkbyh0aGlzKTtcblxuICAvLyBNYXAgb2YgZmxhZ3MgdGhhdCBhcmUgXCJ3YWl0aW5nXCIgZm9yIGEgcHJldmlvdXNseS11c2VkIElELlxuICAvLyBTaWduaWZpZWQgd2l0aCBhIG5lZ2F0aXZlIChvbmUncyBjb21wbGVtZW50KSBJRCBpbiB0aGUgRmxhZyBvYmplY3QuXG4gIHByaXZhdGUgcmVhZG9ubHkgdW5hbGxvY2F0ZWQgPSBuZXcgTWFwPG51bWJlciwgRmxhZz4oKTtcblxuICAvLyAvLyBNYXAgb2YgYXZhaWxhYmxlIElEcy5cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBhdmFpbGFibGUgPSBbXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDAwMCAuLiAwZmZcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMTAwIC4uIDFmZlxuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAyMDAgLi4gMmZmXG4gIC8vIF07XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICAvLyBCdWlsZCB1cCBhbGwgdGhlIGZsYWdzIGFzIGFjdHVhbCBpbnN0YW5jZXMgb2YgRmxhZy5cbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG4gICAgICBjb25zdCBzcGVjID0gdGhpc1trZXldO1xuICAgICAgaWYgKCEoc3BlYyBhcyBhbnkpW0ZMQUddKSBjb250aW51ZTtcbiAgICAgIC8vIFJlcGxhY2UgaXQgd2l0aCBhbiBhY3R1YWwgZmxhZy4gIFdlIG1heSBuZWVkIGEgbmFtZSwgZXRjLi4uXG4gICAgICBjb25zdCBrZXlOdW1iZXIgPSBOdW1iZXIoa2V5KTtcbiAgICAgIGNvbnN0IGlkID0gdHlwZW9mIHNwZWMuaWQgPT09ICdudW1iZXInID8gc3BlYy5pZCA6IGtleU51bWJlcjtcbiAgICAgIGlmIChpc05hTihpZCkpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWc6ICR7a2V5fWApO1xuICAgICAgY29uc3QgbmFtZSA9XG4gICAgICAgICAgc3BlYy5uYW1lIHx8XG4gICAgICAgICAgKGlzTmFOKGtleU51bWJlcikgPyB1cHBlckNhbWVsVG9TcGFjZXMoa2V5KSA6IGZsYWdOYW1lKGlkKSk7XG4gICAgICBjb25zdCBmbGFnID0gbmV3IEZsYWcodGhpcywgbmFtZSwgaWQsIHNwZWMpO1xuICAgICAgdGhpc1trZXldID0gZmxhZztcbiAgICAgIC8vIElmIElEIGlzIG5lZ2F0aXZlLCB0aGVuIHN0b3JlIGl0IGFzIHVuYWxsb2NhdGVkLlxuICAgICAgaWYgKGZsYWcuaWQgPCAwKSB7XG4gICAgICAgIHRoaXMudW5hbGxvY2F0ZWQuc2V0KH5mbGFnLmlkLCBmbGFnKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXNbZmxhZy5pZF0pIHtcbiAgICAgICAgdGhpc1tmbGFnLmlkXSA9IGZsYWc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93IGFkZCB0aGUgbWlzc2luZyBmbGFncy5cbiAgICBmb3IgKGxldCBpID0gMHgxMDA7IGkgPCAweDE4MDsgaSsrKSB7XG4gICAgICBjb25zdCBuYW1lID0gYENoZWNrICR7aGV4KGkgJiAweGZmKX1gO1xuICAgICAgaWYgKHRoaXNbaV0pIHtcbiAgICAgICAgaWYgKCF0aGlzW2ldLmZpeGVkICYmICF0aGlzLnVuYWxsb2NhdGVkLmhhcyhpKSkge1xuICAgICAgICAgIHRoaXMudW5hbGxvY2F0ZWQuc2V0KFxuICAgICAgICAgICAgICBpLCBuZXcgRmxhZyh0aGlzLCBuYW1lLCB+aSwge2ZpeGVkOiB0cnVlfSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW2ldID0gbmV3IEZsYWcodGhpcywgbmFtZSwgaSwge2ZpeGVkOiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAweDE4MDsgaSA8IDB4MjgwOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkge1xuICAgICAgICAvLyBJdGVtIGJ1ZmZlciBoZXJlXG4gICAgICAgIGNvbnN0IHR5cGUgPSBpIDwgMHgyMDAgPyAnQnVmZmVyICcgOiAnSXRlbSAnO1xuICAgICAgICB0aGlzW2ldID0gbmV3IEZsYWcodGhpcywgdHlwZSArIGhleChpKSwgaSwge2ZpeGVkOiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZvciB0aGUgcmVtYWluZGVyLCBmaW5kIHdhbGxzIGluIG1hcHMuXG4gICAgLy8gIC0gZG8gd2UgbmVlZCB0byBwdWxsIHRoZW0gZm9ybSBsb2NhdGlvbnM/PyBvciB0aGlzIGRvaW5nIGFueXRoaW5nPz9cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICAgIGlmICh0aGlzW2YuZmxhZ10pIGNvbnRpbnVlO1xuICAgICAgICB0aGlzW2YuZmxhZ10gPSB3YWxsRmxhZyh0aGlzLCBmLmZsYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNhdmVzID4gNDcwIGJ5dGVzIG9mIHJlZHVuZGFudCBmbGFnIHNldHMhXG4gIGRlZnJhZygpIHtcbiAgICAvLyBtYWtlIGEgbWFwIG9mIG5ldyBJRHMgZm9yIGV2ZXJ5dGhpbmcuXG4gICAgY29uc3QgcmVtYXBwaW5nID0gbmV3IE1hcDxudW1iZXIsIChmOiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPigpO1xuXG4gICAgLy8gZmlyc3QgaGFuZGxlIGFsbCB0aGUgb2Jzb2xldGUgZmxhZ3MgLSBvbmNlIHRoZSByZW1hcHBpbmcgaXMgcHVsbGVkIG9mZlxuICAgIC8vIHdlIGNhbiBzaW1wbHkgdW5yZWYgdGhlbS5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzW2ldO1xuICAgICAgY29uc3QgbyA9IGY/Lm9ic29sZXRlO1xuICAgICAgaWYgKG8pIHtcbiAgICAgICAgcmVtYXBwaW5nLnNldChpLCAoYzogRmxhZ0NvbnRleHQpID0+IGMuc2V0ID8gLTEgOiBvLmNhbGwoZiwgYykpO1xuICAgICAgICBkZWxldGUgdGhpc1tpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgbW92ZSBhbGwgdGhlIG1vdmFibGUgZmxhZ3MuXG4gICAgbGV0IGkgPSAwO1xuICAgIGxldCBqID0gMHgyZmY7XG4gICAgLy8gV0FSTklORzogaSBhbmQgaiBhcmUgYm91bmQgdG8gdGhlIG91dGVyIHNjb3BlISAgQ2xvc2luZyBvdmVyIHRoZW1cbiAgICAvLyB3aWxsIE5PVCB3b3JrIGFzIGludGVuZGVkLlxuICAgIGZ1bmN0aW9uIHJldDxUPih4OiBUKTogKCkgPT4gVCB7IHJldHVybiAoKSA9PiB4OyB9XG4gICAgd2hpbGUgKGkgPCBqKSB7XG4gICAgICBpZiAodGhpc1tpXSB8fCB0aGlzLnVuYWxsb2NhdGVkLmhhcyhpKSkgeyBpKys7IGNvbnRpbnVlOyB9XG4gICAgICBjb25zdCBmID0gdGhpc1tqXTtcbiAgICAgIGlmICghZiB8fCBmLmZpeGVkKSB7IGotLTsgY29udGludWU7IH1cbiAgICAgIC8vIGYgaXMgYSBtb3ZhYmxlIGZsYWcuICBNb3ZlIGl0IHRvIGkuXG4gICAgICByZW1hcHBpbmcuc2V0KGosIHJldChpKSk7XG4gICAgICAoZiBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBpO1xuICAgICAgdGhpc1tpXSA9IGY7XG4gICAgICBkZWxldGUgdGhpc1tqXTtcbiAgICAgIGkrKztcbiAgICAgIGotLTtcbiAgICB9XG5cbiAgICAvLyBnbyB0aHJvdWdoIGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHdlIGNvdWxkIGZpbmQgZmxhZ3MgYW5kIHJlbWFwIVxuICAgIHRoaXMucmVtYXBGbGFncyhyZW1hcHBpbmcpO1xuXG4gICAgLy8gVW5hbGxvY2F0ZWQgZmxhZ3MgZG9uJ3QgbmVlZCBhbnkgcmVtYXBwaW5nLlxuICAgIGZvciAoY29uc3QgW3dhbnQsIGZsYWddIG9mIHRoaXMudW5hbGxvY2F0ZWQpIHtcbiAgICAgIGlmICh0aGlzW3dhbnRdKSBjb250aW51ZTtcbiAgICAgIHRoaXMudW5hbGxvY2F0ZWQuZGVsZXRlKHdhbnQpO1xuICAgICAgKHRoaXNbd2FudF0gPSBmbGFnIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IHdhbnQ7XG4gICAgfVxuXG4gICAgLy9pZiAodGhpcy51bmFsbG9jYXRlZC5zaXplKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmdWxseSBhbGxvY2F0ZWApO1xuXG4gICAgLy8gUmVwb3J0IGhvdyB0aGUgZGVmcmFnIHdlbnQ/XG4gICAgY29uc3QgZnJlZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgzMDA7IGkrKykge1xuICAgICAgaWYgKCF0aGlzW2ldKSBmcmVlLnB1c2goaGV4MyhpKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGBGcmVlIGZsYWdzOiAke2ZyZWUuam9pbignICcpfWApO1xuICB9XG5cbiAgaW5zZXJ0Wm9tYmllV2FycEZsYWcoKSB7XG4gICAgLy8gTWFrZSBzcGFjZSBmb3IgdGhlIG5ldyBmbGFnIGJldHdlZW4gSm9lbCBhbmQgU3dhblxuICAgIGNvbnN0IHJlbWFwcGluZyA9IG5ldyBNYXA8bnVtYmVyLCAoZjogRmxhZ0NvbnRleHQpID0+IG51bWJlcj4oKTtcbiAgICBpZiAodGhpc1sweDJmNF0pIHRocm93IG5ldyBFcnJvcihgTm8gc3BhY2UgdG8gaW5zZXJ0IHdhcnAgZmxhZ2ApO1xuICAgIGNvbnN0IG5ld0lkID0gfnRoaXMuV2FycFpvbWJpZS5pZDtcbiAgICBpZiAobmV3SWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBXYXJwWm9tYmllIGlkYCk7XG4gICAgZm9yIChsZXQgaSA9IDB4MmY0OyBpIDwgbmV3SWQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHRoaXNbaSArIDFdO1xuICAgICAgKHRoaXNbaV0gYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gaTtcbiAgICAgIHJlbWFwcGluZy5zZXQoaSArIDEsICgpID0+IGkpO1xuICAgIH1cbiAgICAodGhpcy5XYXJwWm9tYmllIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IG5ld0lkO1xuICAgIHRoaXNbbmV3SWRdID0gdGhpcy5XYXJwWm9tYmllO1xuICAgIHRoaXMucmVtYXBGbGFncyhyZW1hcHBpbmcpO1xuICB9XG5cbiAgcmVtYXAoc3JjOiBudW1iZXIsIGRlc3Q6IG51bWJlcikge1xuICAgIHRoaXMucmVtYXBGbGFncyhuZXcgTWFwKFtbc3JjLCAoKSA9PiBkZXN0XV0pKTtcbiAgfVxuXG4gIHJlbWFwRmxhZ3MocmVtYXBwaW5nOiBNYXA8bnVtYmVyLCAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPikge1xuICAgIGZ1bmN0aW9uIHByb2Nlc3NMaXN0KGxpc3Q6IG51bWJlcltdLCBjdHg6IEZsYWdDb250ZXh0KSB7XG4gICAgICBmb3IgKGxldCBpID0gbGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBsZXQgZiA9IGxpc3RbaV07XG4gICAgICAgIGlmIChmIDwgMCkgZiA9IH5mO1xuICAgICAgICBjb25zdCByZW1hcCA9IHJlbWFwcGluZy5nZXQoZik7XG4gICAgICAgIGlmIChyZW1hcCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgbGV0IG1hcHBlZCA9IHJlbWFwKHsuLi5jdHgsIGluZGV4OiBpfSk7XG4gICAgICAgIGlmIChtYXBwZWQgPj0gMCkge1xuICAgICAgICAgIGxpc3RbaV0gPSBsaXN0W2ldIDwgMCA/IH5tYXBwZWQgOiBtYXBwZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcHJvY2VzcyhmbGFnOiBudW1iZXIsIGN0eDogRmxhZ0NvbnRleHQpIHtcbiAgICAgIGxldCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgICAgY29uc3QgcmVtYXAgPSByZW1hcHBpbmcuZ2V0KHVuc2lnbmVkKTtcbiAgICAgIGlmIChyZW1hcCA9PSBudWxsKSByZXR1cm4gZmxhZztcbiAgICAgIGxldCBtYXBwZWQgPSByZW1hcChjdHgpO1xuICAgICAgaWYgKG1hcHBlZCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgZGVsZXRlYCk7XG4gICAgICByZXR1cm4gZmxhZyA8IDAgPyB+bWFwcGVkIDogbWFwcGVkO1xuICAgIH1cblxuICAgIC8vIExvY2F0aW9uIGZsYWdzXG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBsb2NhdGlvbi5mbGFncykge1xuICAgICAgICBmbGFnLmZsYWcgPSBwcm9jZXNzKGZsYWcuZmxhZywge2xvY2F0aW9ufSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTlBDIGZsYWdzXG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5yb20ubnBjcykge1xuICAgICAgZm9yIChjb25zdCBbbG9jLCBjb25kc10gb2YgbnBjLnNwYXduQ29uZGl0aW9ucykge1xuICAgICAgICBwcm9jZXNzTGlzdChjb25kcywge25wYywgc3Bhd246IGxvY30pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICAgIGQuY29uZGl0aW9uID0gcHJvY2VzcyhkLmNvbmRpdGlvbiwge25wYywgZGlhbG9nOiB0cnVlfSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFssIGRzXSBvZiBucGMubG9jYWxEaWFsb2dzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuICAgICAgICAgIGQuY29uZGl0aW9uID0gcHJvY2VzcyhkLmNvbmRpdGlvbiwge25wYywgZGlhbG9nOiB0cnVlfSk7XG4gICAgICAgICAgcHJvY2Vzc0xpc3QoZC5mbGFncywge25wYywgZGlhbG9nOiB0cnVlLCBzZXQ6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy5yb20udHJpZ2dlcnMpIHtcbiAgICAgIHByb2Nlc3NMaXN0KHRyaWdnZXIuY29uZGl0aW9ucywge3RyaWdnZXJ9KTtcbiAgICAgIHByb2Nlc3NMaXN0KHRyaWdnZXIuZmxhZ3MsIHt0cmlnZ2VyLCBzZXQ6IHRydWV9KTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgdXBkYXRpbmcgdGVsZXBhdGh5PyE/XG5cbiAgICAvLyBJdGVtR2V0IGZsYWdzXG4gICAgZm9yIChjb25zdCBpdGVtR2V0IG9mIHRoaXMucm9tLml0ZW1HZXRzKSB7XG4gICAgICBwcm9jZXNzTGlzdChpdGVtR2V0LmZsYWdzLCB7c2V0OiB0cnVlfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCBpdGVtVXNlIG9mIGl0ZW0uaXRlbVVzZURhdGEpIHtcbiAgICAgICAgaWYgKGl0ZW1Vc2Uua2luZCA9PT0gJ2ZsYWcnKSB7XG4gICAgICAgICAgaXRlbVVzZS53YW50ID0gcHJvY2VzcyhpdGVtVXNlLndhbnQsIHt9KTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzTGlzdChpdGVtVXNlLmZsYWdzLCB7c2V0OiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIGVsc2U/XG4gIH1cblxuICAvLyBUT0RPIC0gbWFuaXB1bGF0ZSB0aGlzIHN0dWZmXG5cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBhdmFpbGFibGUgPSBuZXcgU2V0PG51bWJlcj4oW1xuICAvLyAgIC8vIFRPRE8gLSB0aGVyZSdzIGEgdG9uIG9mIGxvd2VyIGZsYWdzIGFzIHdlbGwuXG4gIC8vICAgLy8gVE9ETyAtIHdlIGNhbiByZXB1cnBvc2UgYWxsIHRoZSBvbGQgaXRlbSBmbGFncy5cbiAgLy8gICAweDI3MCwgMHgyNzEsIDB4MjcyLCAweDI3MywgMHgyNzQsIDB4Mjc1LCAweDI3NiwgMHgyNzcsXG4gIC8vICAgMHgyNzgsIDB4Mjc5LCAweDI3YSwgMHgyN2IsIDB4MjdjLCAweDI3ZCwgMHgyN2UsIDB4MjdmLFxuICAvLyAgIDB4MjgwLCAweDI4MSwgMHgyODgsIDB4Mjg5LCAweDI4YSwgMHgyOGIsIDB4MjhjLFxuICAvLyAgIDB4MmE3LCAweDJhYiwgMHgyYjQsXG4gIC8vIF0pO1xuXG4gIGFsbG9jKHNlZ21lbnQ6IG51bWJlciA9IDApOiBudW1iZXIge1xuICAgIGlmIChzZWdtZW50ICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYWxsb2NhdGUgb3V0c2lkZSAyeHhgKTtcbiAgICBmb3IgKGxldCBmbGFnID0gMHgyODA7IGZsYWcgPCAweDMwMDsgZmxhZysrKSB7XG4gICAgICBpZiAoIXRoaXNbZmxhZ10pIHtcbiAgICAgICAgdGhpc1tmbGFnXSA9IHdhbGxGbGFnKHRoaXMsIGZsYWcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZsYWc7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgTm8gZnJlZSBmbGFncy5gKTtcbiAgfVxuXG4gIGZyZWUoZmxhZzogbnVtYmVyKSB7XG4gICAgLy8gVE9ETyAtIGlzIHRoZXJlIG1vcmUgdG8gdGhpcz8gIGNoZWNrIGZvciBzb21ldGhpbmcgZWxzZT9cbiAgICBkZWxldGUgdGhpc1tmbGFnXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGFnTmFtZShpZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuICdGbGFnICcgKyBoZXgzKGlkKTtcbn1cblxuZnVuY3Rpb24gd2FsbEZsYWcoZmxhZ3M6IEZsYWdzLCBpZDogbnVtYmVyKTogRmxhZyB7XG4gIHJldHVybiBuZXcgRmxhZyhmbGFncywgJ1dhbGwgJyArIGhleChpZCAmIDB4ZmYpLCBpZCwge2ZpeGVkOiB0cnVlfSk7XG59XG4iXX0=