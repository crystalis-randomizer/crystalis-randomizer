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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBU3RCLE1BQU0sS0FBSyxHQUFVLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFVLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFVLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztBQW9CekIsTUFBTSxPQUFPLElBQUk7SUFNZixZQUFxQixLQUFZLEVBQ1osSUFBWSxFQUNaLEVBQVUsRUFDbkIsSUFBYzs7UUFITCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssU0FBRyxJQUFJLENBQUMsS0FBSyxtQ0FBSSxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDLEVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFB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Q0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBR3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFHeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FB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SUFBSSxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNuQztZQUNELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFZO1FBRWYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBRUQsU0FBUyxRQUFRLENBQUMsRUFBVTtJQUMxQixPQUFPLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLEtBQVksRUFBRSxFQUFVO0lBQ3hDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0l0ZW19IGZyb20gJy4vaXRlbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TnBjfSBmcm9tICcuL25wYy5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vdHJpZ2dlci5qcyc7XG5pbXBvcnQge2hleCwgaGV4MywgdXBwZXJDYW1lbFRvU3BhY2VzLCBXcml0YWJsZX0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Q29uZGl0aW9uLCBSZXF1aXJlbWVudH0gZnJvbSAnLi4vbG9naWMvcmVxdWlyZW1lbnQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5cbmNvbnN0IEZMQUcgPSBTeW1ib2woKTtcblxuLy8gVE9ETyAtIG1heWJlIGFsaWFzIHNob3VsZCBqdXN0IGJlIGluIG92ZXJsYXkudHM/XG5leHBvcnQgaW50ZXJmYWNlIExvZ2ljIHtcbiAgYXNzdW1lVHJ1ZT86IGJvb2xlYW47XG4gIGFzc3VtZUZhbHNlPzogYm9vbGVhbjtcbiAgdHJhY2s/OiBib29sZWFuO1xufVxuXG5jb25zdCBGQUxTRTogTG9naWMgPSB7YXNzdW1lRmFsc2U6IHRydWV9O1xuY29uc3QgVFJVRTogTG9naWMgPSB7YXNzdW1lVHJ1ZTogdHJ1ZX07XG5jb25zdCBUUkFDSzogTG9naWMgPSB7dHJhY2s6IHRydWV9O1xuY29uc3QgSUdOT1JFOiBMb2dpYyA9IHt9O1xuXG5pbnRlcmZhY2UgRmxhZ0RhdGEge1xuICBmaXhlZD86IGJvb2xlYW47XG4gIG9ic29sZXRlPzogKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcjtcbiAgbG9naWM/OiBMb2dpYztcbn1cbmludGVyZmFjZSBGbGFnQ29udGV4dCB7XG4gIHRyaWdnZXI/OiBUcmlnZ2VyO1xuICBsb2NhdGlvbj86IExvY2F0aW9uO1xuICBucGM/OiBOcGM7XG4gIHNwYXduPzogbnVtYmVyO1xuICBpbmRleD86IG51bWJlcjtcbiAgZGlhbG9nPzogYm9vbGVhbjtcbiAgc2V0PzogYm9vbGVhbjtcbiAgLy9kaWFsb2c/OiBMb2NhbERpYWxvZ3xHbG9iYWxEaWFsb2c7XG4gIC8vaW5kZXg/OiBudW1iZXI7XG4gIC8vY29uZGl0aW9uPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEZsYWcge1xuXG4gIGZpeGVkOiBib29sZWFuO1xuICBvYnNvbGV0ZT86IChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI7XG4gIGxvZ2ljOiBMb2dpYztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnczogRmxhZ3MsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgaWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgZGF0YTogRmxhZ0RhdGEpIHtcbiAgICB0aGlzLmZpeGVkID0gZGF0YS5maXhlZCB8fCBmYWxzZTtcbiAgICB0aGlzLm9ic29sZXRlID0gZGF0YS5vYnNvbGV0ZTtcbiAgICB0aGlzLmxvZ2ljID0gZGF0YS5sb2dpYyA/PyBUUkFDSztcbiAgfVxuXG4gIGdldCBjKCk6IENvbmRpdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuaWQgYXMgQ29uZGl0aW9uO1xuICB9XG5cbiAgZ2V0IHIoKTogUmVxdWlyZW1lbnQuU2luZ2xlIHtcbiAgICByZXR1cm4gW1t0aGlzLmlkIGFzIENvbmRpdGlvbl1dO1xuICB9XG5cbiAgZ2V0IGRlYnVnKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDMsICcwJykgKyAnICcgKyB0aGlzLm5hbWU7XG4gIH1cblxuICBnZXQgaXRlbSgpOiBJdGVtIHtcbiAgICBpZiAodGhpcy5pZCA8IDB4MTAwIHx8IHRoaXMuaWQgPiAweDE3Zikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBub3QgYSBzbG90OiAke3RoaXMuaWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGl0ZW1HZXRJZCA9IHRoaXMuZmxhZ3Mucm9tLnNsb3RzW3RoaXMuaWQgJiAweGZmXTtcbiAgICBjb25zdCBpdGVtSWQgPSB0aGlzLmZsYWdzLnJvbS5pdGVtR2V0c1tpdGVtR2V0SWRdLml0ZW1JZDtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5mbGFncy5yb20uaXRlbXNbaXRlbUlkXTtcbiAgICBpZiAoIWl0ZW0pIHRocm93IG5ldyBFcnJvcihgbm8gaXRlbWApO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG59XG5cbmZ1bmN0aW9uIG9ic29sZXRlKG9ic29sZXRlOiBudW1iZXIgfCAoKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcikpOiBGbGFnIHtcbiAgaWYgKHR5cGVvZiBvYnNvbGV0ZSA9PT0gJ251bWJlcicpIG9ic29sZXRlID0gKG8gPT4gKCkgPT4gbykob2Jzb2xldGUpO1xuICByZXR1cm4ge29ic29sZXRlLCBbRkxBR106IHRydWV9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGZpeGVkKGlkOiBudW1iZXIsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7aWQsIGZpeGVkOiB0cnVlLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5mdW5jdGlvbiB0cmFja2VkKGlkOiBudW1iZXIpOiBGbGFnIHtcbiAgcmV0dXJuIGZpeGVkKGlkLCBUUkFDSyk7XG59XG5mdW5jdGlvbiBtb3ZhYmxlKGlkOiBudW1iZXIsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7aWQsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGRpYWxvZ1Byb2dyZXNzaW9uKG5hbWU6IHN0cmluZywgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtuYW1lLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5mdW5jdGlvbiBkaWFsb2dUb2dnbGUobmFtZTogc3RyaW5nLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge25hbWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cblxuZnVuY3Rpb24gcHNldWRvKG93bmVyOiBvYmplY3QpOiBGbGFnIHtcbiAgY29uc3QgaWQgPSBwc2V1ZG9Db3VudGVyLmdldChvd25lcikgfHwgMHg0MDA7XG4gIHBzZXVkb0NvdW50ZXIuc2V0KG93bmVyLCBpZCArIDEpO1xuICByZXR1cm4ge2lkLCBbRkxBR106IHRydWUsIGxvZ2ljOiBUUkFDS30gYXMgYW55O1xufVxuY29uc3QgcHNldWRvQ291bnRlciA9IG5ldyBXZWFrTWFwPG9iamVjdCwgbnVtYmVyPigpO1xuXG4vLyBvYnNvbGV0ZSBmbGFncyAtIGRlbGV0ZSB0aGUgc2V0cyAoc2hvdWxkIG5ldmVyIGJlIGEgY2xlYXIpXG4vLyAgICAgICAgICAgICAgICAtIHJlcGxhY2UgdGhlIGNoZWNrcyB3aXRoIHRoZSByZXBsYWNlbWVudFxuXG4vLyAtLS0gbWF5YmUgb2Jzb2xldGUgZmxhZ3MgY2FuIGhhdmUgZGlmZmVyZW50IHJlcGxhY2VtZW50cyBpblxuLy8gICAgIGRpZmZlcmVudCBjb250ZXh0cz9cbi8vIC0tLSBpbiBwYXJ0aWN1bGFyLCBpdGVtZ2V0cyBzaG91bGRuJ3QgY2FycnkgMXh4IGZsYWdzP1xuXG5cbi8qKiBUcmFja3MgdXNlZCBhbmQgdW51c2VkIGZsYWdzLiAqL1xuZXhwb3J0IGNsYXNzIEZsYWdzIHtcblxuICBbaWQ6IG51bWJlcl06IEZsYWc7XG5cbiAgLy8gMDB4XG4gIDB4MDAwID0gZml4ZWQoMHgwMDAsIEZBTFNFKTtcbiAgMHgwMDEgPSBmaXhlZCgweDAwMSk7XG4gIDB4MDAyID0gZml4ZWQoMHgwMDIpO1xuICAweDAwMyA9IGZpeGVkKDB4MDAzKTtcbiAgMHgwMDQgPSBmaXhlZCgweDAwNCk7XG4gIDB4MDA1ID0gZml4ZWQoMHgwMDUpO1xuICAweDAwNiA9IGZpeGVkKDB4MDA2KTtcbiAgMHgwMDcgPSBmaXhlZCgweDAwNyk7XG4gIDB4MDA4ID0gZml4ZWQoMHgwMDgpO1xuICAweDAwOSA9IGZpeGVkKDB4MDA5KTtcbiAgVXNlZFdpbmRtaWxsS2V5ID0gZml4ZWQoMHgwMGEsIFRSQUNLKTtcbiAgMHgwMGIgPSBvYnNvbGV0ZSgweDEwMCk7IC8vIGNoZWNrOiBzd29yZCBvZiB3aW5kIC8gdGFsa2VkIHRvIGxlYWYgZWxkZXJcbiAgMHgwMGMgPSBkaWFsb2dUb2dnbGUoJ0xlYWYgdmlsbGFnZXInKTtcbiAgTGVhZlZpbGxhZ2Vyc1Jlc2N1ZWQgPSBtb3ZhYmxlKDB4MDBkKTtcbiAgMHgwMGUgPSBvYnNvbGV0ZSgocykgPT4ge1xuICAgIGlmIChzLnRyaWdnZXI/LmlkID09PSAweDg1KSByZXR1cm4gMHgxNDM7IC8vIGNoZWNrOiB0ZWxlcGF0aHkgLyBzdG9tXG4gICAgcmV0dXJuIDB4MjQzOyAvLyBpdGVtOiB0ZWxlcGF0aHlcbiAgfSk7XG4gIFdva2VXaW5kbWlsbEd1YXJkID0gbW92YWJsZSgweDAwZiwgVFJBQ0spO1xuXG4gIC8vIDAxeFxuICBUdXJuZWRJbktpcmlzYVBsYW50ID0gbW92YWJsZSgweDAxMCk7XG4gIDB4MDExID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1dlbGNvbWVkIHRvIEFtYXpvbmVzJyk7XG4gIDB4MDEyID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1RyZWFzdXJlIGh1bnRlciBkZWFkJyk7XG4gIDB4MDEzID0gb2Jzb2xldGUoMHgxMzgpOyAvLyBjaGVjazogYnJva2VuIHN0YXR1ZSAvIHNhYmVyYSAxXG4gIC8vIHVudXNlZCAwMTQsIDAxNVxuICAweDAxNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdQb3J0b2EgcXVlZW4gUmFnZSBoaW50Jyk7XG4gIDB4MDE3ID0gb2Jzb2xldGUoMHgxMDIpOyAvLyBjaGVzdDogc3dvcmQgb2Ygd2F0ZXJcbiAgRW50ZXJlZFVuZGVyZ3JvdW5kQ2hhbm5lbCA9IG1vdmFibGUoMHgwMTgsIFRSQUNLKTtcbiAgMHgwMTkgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiB0aXJlZCBvZiB0YWxraW5nJyk7XG4gIDB4MDFhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0luaXRpYWwgdGFsayB3aXRoIFBvcnRvYSBxdWVlbicpO1xuICBNZXNpYVJlY29yZGluZyA9IG1vdmFibGUoMHgwMWIsIFRSQUNLKTtcbiAgMHgwMWMgPSBvYnNvbGV0ZSgweDExMCk7IC8vIGl0ZW06IG1pcnJvcmVkIHNoaWVsZFxuICBUYWxrZWRUb0ZvcnR1bmVUZWxsZXIgPSBtb3ZhYmxlKDB4MWQsIFRSQUNLKTtcbiAgUXVlZW5SZXZlYWxlZCA9IG1vdmFibGUoMHgwMWUsIFRSQUNLKTtcbiAgMHgwMWYgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIGNoZWNrOiByYWdlXG5cbiAgLy8gMDJ4XG4gIFF1ZWVuTm90SW5UaHJvbmVSb29tID0gbW92YWJsZSgweDAyMCk7XG4gIFJldHVybmVkRm9nTGFtcCA9IG1vdmFibGUoMHgwMjEsIFRSQUNLKTtcbiAgMHgwMjIgPSBkaWFsb2dQcm9ncmVzc2lvbignU2FoYXJhIGVsZGVyJyk7XG4gIDB4MDIzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NhaGFyYSBlbGRlciBkYXVnaHRlcicpO1xuICAweDAyNCA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgMHgwMjUgPSBvYnNvbGV0ZSgweDEzNik7IC8vIGhlYWxlZCBkb2xwaGluXG4gIDB4MDI2ID0gb2Jzb2xldGUoMHgyZmQpOyAvLyB3YXJwOiBzaHlyb25cbiAgU2h5cm9uTWFzc2FjcmUgPSBmaXhlZCgweDAyNywgVFJBQ0spOyAvLyBwcmVzaHVmZmxlIGhhcmRjb2RlcyBmb3IgZGVhZCBzcHJpdGVzXG4gIENoYW5nZVdvbWFuID0gZml4ZWQoMHgwMjgpOyAvLyBoYXJkY29kZWQgaW4gb3JpZ2luYWwgcm9tXG4gIENoYW5nZUFrYWhhbmEgPSBmaXhlZCgweDAyOSk7XG4gIENoYW5nZVNvbGRpZXIgPSBmaXhlZCgweDAyYSk7XG4gIENoYW5nZVN0b20gPSBmaXhlZCgweDAyYik7XG4gIC8vIHVudXNlZCAwMmNcbiAgMHgwMmQgPSBkaWFsb2dQcm9ncmVzc2lvbignU2h5cm9uIHNhZ2VzJyk7XG4gIDB4MDJlID0gb2Jzb2xldGUoMHgxMmQpOyAvLyBjaGVjazogZGVvJ3MgcGVuZGFudFxuICBVc2VkQm93T2ZUcnV0aCA9IGZpeGVkKDB4MDJmKTsgIC8vIG1vdmVkIGZyb20gMDg2IGluIHByZXBhcnNlXG5cbiAgLy8gMDN4XG4gIC8vIHVudXNlZCAwMzBcbiAgMHgwMzEgPSBkaWFsb2dQcm9ncmVzc2lvbignWm9tYmllIHRvd24nKTtcbiAgMHgwMzIgPSBvYnNvbGV0ZSgweDEzNyk7IC8vIGNoZWNrOiBleWUgZ2xhc3Nlc1xuICAvLyB1bnVzZWQgMDMzXG4gIDB4MDM0ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FrYWhhbmEgaW4gd2F0ZXJmYWxsIGNhdmUnKTsgLy8gPz8/XG4gIEN1cmVkQWthaGFuYSA9IG1vdmFibGUoMHgwMzUsIFRSQUNLKTtcbiAgMHgwMzYgPSBkaWFsb2dQcm9ncmVzc2lvbignQWthaGFuYSBTaHlyb24nKTtcbiAgMHgwMzcgPSBvYnNvbGV0ZSgweDE0Mik7IC8vIGNoZWNrOiBwYXJhbHlzaXNcbiAgTGVhZkFiZHVjdGlvbiA9IG1vdmFibGUoMHgwMzgsIFRSQUNLKTsgLy8gb25lLXdheSBsYXRjaFxuICAweDAzOSA9IG9ic29sZXRlKDB4MTQxKTsgLy8gY2hlY2s6IHJlZnJlc2hcbiAgVGFsa2VkVG9aZWJ1SW5DYXZlID0gbW92YWJsZSgweDAzYSwgVFJBQ0spO1xuICBUYWxrZWRUb1plYnVJblNoeXJvbiA9IG1vdmFibGUoMHgwM2IsIFRSQUNLKTtcbiAgMHgwM2MgPSBvYnNvbGV0ZSgweDEzYik7IC8vIGNoZXN0OiBsb3ZlIHBlbmRhbnRcbiAgMHgwM2QgPSBkaWFsb2dQcm9ncmVzc2lvbignQXNpbmEgaW4gU2h5cm9uIHRlbXBsZScpO1xuICBGb3VuZEtlbnN1SW5EYW5jZUhhbGwgPSBtb3ZhYmxlKDB4MDNlLCBUUkFDSyk7XG4gIDB4MDNmID0gb2Jzb2xldGUoKHMpID0+IHtcbiAgICBpZiAocy50cmlnZ2VyPy5pZCA9PT0gMHhiYSkgcmV0dXJuIDB4MjQ0IC8vIGl0ZW06IHRlbGVwb3J0XG4gICAgcmV0dXJuIDB4MTQ0OyAvLyBjaGVjazogdGVsZXBvcnRcbiAgfSk7XG5cbiAgLy8gMDR4XG4gIDB4MDQwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvcm5lbCBpbiBTaHlyb24gdGVtcGxlJyk7XG4gIDB4MDQxID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIC8vIHVudXNlZCAwNDJcbiAgLy8gdW51c2VkIDB4MDQzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09haycpO1xuICAweDA0NCA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICBSZXNjdWVkQ2hpbGQgPSBmaXhlZCgweDA0NSwgVFJBQ0spOyAvLyBoYXJkY29kZWQgJDNlN2Q1XG4gIFVzZWRJbnNlY3RGbHV0ZSA9IGZpeGVkKDB4MDQ2KTsgLy8gY3VzdG9tLWFkZGVkICQ2NDg4OjQwXG4gIFJlc2N1ZWRMZWFmRWxkZXIgPSBtb3ZhYmxlKDB4MDQ3KTtcbiAgMHgwNDggPSBkaWFsb2dQcm9ncmVzc2lvbignVHJlYXN1cmUgaHVudGVyIGVtYmFya2VkJyk7XG4gIDB4MDQ5ID0gb2Jzb2xldGUoMHgxMDEpOyAvLyBjaGVjazogc3dvcmQgb2YgZmlyZVxuICAweDA0YSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdCb2F0IG93bmVyJyk7XG4gIDB4MDRiID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gc2ljayBtZW4nKTtcbiAgMHgwNGMgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiB0cmFpbmluZyBtZW4gMScpO1xuICAweDA0ZCA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHRyYWluaW5nIG1lbiAyJyk7XG4gIDB4MDRlID0gb2Jzb2xldGUoMHgxMDYpOyAvLyBjaGVzdDogdG9ybmFkbyBicmFjZWxldFxuICAweDA0ZiA9IG9ic29sZXRlKDB4MTJiKTsgLy8gY2hlY2s6IHdhcnJpb3IgcmluZ1xuXG4gIC8vIDA1eFxuICBHaXZlblN0YXR1ZVRvQWthaGFuYSA9IG1vdmFibGUoMHgwNTApOyAvLyBnaXZlIGl0IGJhY2sgaWYgdW5zdWNjZXNzZnVsP1xuICAweDA1MSA9IG9ic29sZXRlKDB4MTQ2KTsgLy8gY2hlY2s6IGJhcnJpZXIgLyBhbmdyeSBzZWFcbiAgVGFsa2VkVG9Ed2FyZk1vdGhlciA9IG1vdmFibGUoMHgwNTIsIFRSQUNLKTtcbiAgTGVhZGluZ0NoaWxkID0gZml4ZWQoMHgwNTMsIFRSQUNLKTsgLy8gaGFyZGNvZGVkICQzZTdjNCBhbmQgZm9sbG93aW5nXG4gIC8vIHVudXNlZCAwNTRcbiAgMHgwNTUgPSBkaWFsb2dQcm9ncmVzc2lvbignWmVidSByZXNjdWVkJyk7XG4gIDB4MDU2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvcm5lbCByZXNjdWVkJyk7XG4gIDB4MDU3ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FzaW5hIHJlc2N1ZWQnKTtcbiAgLy8gdW51c2VkIDA1OCAuLiAwNWFcbiAgTXRTYWJyZUd1YXJkc0Rlc3Bhd25lZCA9IG1vdmFibGUoMHgwNWIsIFRSVUUpO1xuICAvLyB1bnVzZWQgMDVjLCAwNWRcbiAgMHgwNWUgPSBvYnNvbGV0ZSgweDI4ZCk7IC8vIGRyYXlnb24gMlxuICAweDA1ZiA9IG9ic29sZXRlKDB4MjAzKTsgLy8gaXRlbTogc3dvcmQgb2YgdGh1bmRlclxuICAvLyBUT0RPIC0gZml4IHVwIHRoZSBOUEMgc3Bhd24gYW5kIHRyaWdnZXIgY29uZGl0aW9ucyBpbiBTaHlyb24uXG4gIC8vIE1heWJlIGp1c3QgcmVtb3ZlIHRoZSBjdXRzY2VuZSBlbnRpcmVseT9cblxuICAvLyAwNnhcbiAgLy8gdW51c2VkIDA2MFxuICBUYWxrZWRUb1N0b21JblN3YW4gPSBtb3ZhYmxlKDB4MDYxLCBUUkFDSyk7XG4gIDB4MDYyID0gb2Jzb2xldGUoMHgxNTEpOyAvLyBjaGVzdDogc2FjcmVkIHNoaWVsZFxuICAweDA2MyA9IG9ic29sZXRlKDB4MTQ3KTsgLy8gY2hlY2s6IGNoYW5nZVxuICAvLyB1bnVzZWQgMDY0XG4gIC8vIFN3YW5HYXRlT3BlbmVkID0gbW92YWJsZSh+MHgwNjQpOyAvLyB3aHkgd291bGQgd2UgYWRkIHRoaXM/IHVzZSAyYjNcbiAgQ3VyZWRLZW5zdSA9IG1vdmFibGUoMHgwNjUsIFRSQUNLKTtcbiAgLy8gdW51c2VkIDA2NlxuICAweDA2NyA9IG9ic29sZXRlKDB4MTBiKTsgLy8gY2hlY2s6IGJhbGwgb2YgdGh1bmRlciAvIG1hZG8gMVxuICAweDA2OCA9IG9ic29sZXRlKDB4MTA0KTsgLy8gY2hlY2s6IGZvcmdlZCBjcnlzdGFsaXNcbiAgLy8gdW51c2VkIDA2OVxuICBTdG9uZWRQZW9wbGVDdXJlZCA9IG1vdmFibGUoMHgwNmEsIFRSQUNLKTtcbiAgLy8gdW51c2VkIDA2YlxuICAweDA2YyA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAvLyB1bnVzZWQgMDZkIC4uIDA2ZlxuICBDdXJyZW50bHlSaWRpbmdEb2xwaGluID0gZml4ZWQofjB4MDZlLCBUUkFDSyk7IC8vLCB7IC8vIE5PVEU6IGFkZGVkIGJ5IHJhbmRvXG4gIC8vICAgYWxpYXM6IHJvbSA9PiBbcm9tLml0ZW1zLlNoZWxsRmx1dGUuaXRlbVVzZURhdGFbMF0ud2FudF0sXG4gIC8vIH0pO1xuXG4gIC8vIDA3eFxuICBQYXJhbHl6ZWRLZW5zdUluVGF2ZXJuID0gZml4ZWQoMHgwNzApOyAvLywgeyAvLyBoYXJkY29kZWQgaW4gcmFuZG8gcHJlc2h1ZmZsZS5zXG4gIC8vICAgYWxpYXM6IHJvbSA9PiBbcm9tLmZsYWdzLlBhcmFseXNpcy5pZF0sXG4gIC8vIH0pO1xuICBQYXJhbHl6ZWRLZW5zdUluRGFuY2VIYWxsID0gZml4ZWQoMHgwNzEpOyAvLywgeyAvLyBoYXJkY29kZWQgaW4gcmFuZG8gcHJlc2h1ZmZsZS5zXG4gIC8vICAgYWxpYXM6IHJvbSA9PiBbcm9tLmZsYWdzLlBhcmFseXNpcy5pZF0sXG4gIC8vIH0pO1xuICBGb3VuZEtlbnN1SW5UYXZlcm4gPSBtb3ZhYmxlKDB4MDcyLCBUUkFDSyk7XG4gIDB4MDczID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N0YXJ0bGVkIG1hbiBpbiBMZWFmJyk7XG4gIC8vIHVudXNlZCAwNzRcbiAgMHgwNzUgPSBvYnNvbGV0ZSgweDEzOSk7IC8vIGNoZWNrOiBnbG93aW5nIGxhbXBcbiAgMHgwNzYgPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgaW4gR29hJyk7XG4gIDB4MDc3ID0gb2Jzb2xldGUoMHgxMDgpOyAvLyBjaGVjazogZmxhbWUgYnJhY2VsZXQgLyBrZWxiZXNxdWUgMVxuICAweDA3OCA9IG9ic29sZXRlKDB4MTBjKTsgLy8gY2hlc3Q6IHN0b3JtIGJyYWNlbGV0XG4gIDB4MDc5ID0gb2Jzb2xldGUoMHgxNDApOyAvLyBjaGVjazogYm93IG9mIHRydXRoXG4gIDB4MDdhID0gb2Jzb2xldGUoMHgxMGEpOyAvLyBjaGVzdDogYmxpenphcmQgYnJhY2VsZXRcbiAgMHgwN2IgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIHJhZ2UvYmFsbCBvZiB3YXRlclxuICAvLyB1bnVzZWQgMDdiLCAwN2NcbiAgMHgwN2QgPSBvYnNvbGV0ZSgweDEzZik7IC8vIGNoZXN0OiBib3cgb2Ygc3VuXG4gIDB4MDdlID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ010IFNhYnJlIGd1YXJkcyAxJyk7XG4gIDB4MDdmID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ010IFNhYnJlIGd1YXJkcyAyJyk7XG5cbiAgQWxhcm1GbHV0ZVVzZWRPbmNlID0gZml4ZWQoMHg3Nik7IC8vIGhhcmRjb2RlZDogcHJlc2h1ZmZsZS5zIFBhdGNoVHJhZGVJbkl0ZW1cbiAgRmx1dGVPZkxpbWVVc2VkT25jZSA9IGZpeGVkKDB4NzcpOyAvLyBoYXJkY29kZWQ6IHByZXNodWZmbGUucyBQYXRjaFRyYWRlSW5JdGVtXG5cbiAgLy8gMDh4XG4gIC8vIHVudXNlZCAwODAsIDA4MVxuICAweDA4MiA9IG9ic29sZXRlKDB4MTQwKTsgLy8gY2hlY2s6IGJvdyBvZiB0cnV0aCAvIGF6dGVjYVxuICAweDA4MyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdSZXNjdWVkIExlYWYgZWxkZXInKTtcbiAgTGVhZlZpbGxhZ2Vyc0N1cnJlbnRseUFiZHVjdGVkID0gbW92YWJsZSgweDA4NCk7XG4gIExlYWZFbGRlckN1cnJlbnRseUFiZHVjdGVkID0gbW92YWJsZSgweDA4NSk7XG4gIC8vVXNlZEJvd09mVHJ1dGggPSBtb3ZhYmxlKDB4MDg2KTsgIC8vIG1vdmVkIG1hbnVhbGx5IGF0IHByZXBhcnNlIHRvIDJmXG4gIDB4MDg3ID0gb2Jzb2xldGUoMHgxMDUpOyAvLyBjaGVzdDogYmFsbCBvZiB3aW5kXG4gIDB4MDg4ID0gb2Jzb2xldGUoMHgxMzIpOyAvLyBjaGVjazogd2luZG1pbGwga2V5XG4gIDB4MDg5ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU3RvbVxcJ3MgZ2lybGZyaWVuZCcpO1xuICAweDA4YSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFN0b20nKTtcbiAgMHgwOGIgPSBvYnNvbGV0ZSgweDIzNik7IC8vIGl0ZW06IHNoZWxsIGZsdXRlXG4gIC8vIHVudXNlZCAweDA4YyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTd2FuIGd1YXJkcyBkZXNwYXduZWQnKTtcbiAgMHgwOGQgPSBvYnNvbGV0ZSgweDEzNyk7IC8vIGNoZWNrOiBleWUgZ2xhc3Nlc1xuICAvLyB1bnVzZWQgMDhlXG4gIDB4MDhmID0gb2Jzb2xldGUoMHgyODMpOyAvLyBldmVudDogY2FsbWVkIHNlYVxuXG4gIC8vIDA5eFxuICAweDA5MCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTdG9uZWQgcGVvcGxlIGdvbmUnKTtcbiAgLy8gdW51c2VkIDA5MVxuICAweDA5MiA9IG9ic29sZXRlKDB4MTI4KTsgLy8gY2hlY2s6IGZsdXRlIG9mIGxpbWVcbiAgLy8gdW51c2VkIDA5MyAuLiAwOTVcbiAgMHgwOTYgPSBkaWFsb2dUb2dnbGUoJ0xlYWYgZWxkZXIgZGF1Z2h0ZXInKTtcbiAgMHgwOTcgPSBkaWFsb2dUb2dnbGUoJ0xlYWYgdmlsbGFnZXInKTtcbiAgMHgwOTggPSBkaWFsb2dQcm9ncmVzc2lvbignTmFkYXJlIHZpbGxhZ2VyJyk7XG4gIC8vIHVudXNlZCAwOTksIDA5YVxuICBBYmxlVG9SaWRlRG9scGhpbiA9IG1vdmFibGUoMHgwOWIsIFRSQUNLKTtcbiAgUG9ydG9hUXVlZW5Hb2luZ0F3YXkgPSBtb3ZhYmxlKDB4MDljKTtcbiAgLy8gdW51c2VkIDA5ZCAuLiAwOWZcblxuICAvLyAwYXhcbiAgMHgwYTAgPSBvYnNvbGV0ZSgweDEyNyk7IC8vIGNoZWNrOiBpbnNlY3QgZmx1dGVcbiAgLy8gdW51c2VkIDBhMSwgMGEyXG4gIDB4MGEzID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4vZm9ydHVuZSB0ZWxsZXInKTtcbiAgV29rZUtlbnN1SW5MaWdodGhvdXNlID0gbW92YWJsZSgweDBhNCwgVFJBQ0spO1xuICAvLyBUT0RPOiB0aGlzIG1heSBub3QgYmUgb2Jzb2xldGUgaWYgdGhlcmUncyBubyBpdGVtIGhlcmU/XG4gIDB4MGE1ID0gb2Jzb2xldGUoMHgxMzEpOyAvLyBjaGVjazogYWxhcm0gZmx1dGUgLyB6ZWJ1IHN0dWRlbnRcbiAgMHgwYTYgPSBkaWFsb2dQcm9ncmVzc2lvbignT2FrIGVsZGVyIDEnKTtcbiAgMHgwYTcgPSBkaWFsb2dUb2dnbGUoJ1N3YW4gZGFuY2VyJyk7XG4gIDB4MGE4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09hayBlbGRlciAyJyk7XG4gIFRhbGtlZFRvTGVhZlJhYmJpdCA9IG1vdmFibGUoMHgwYTksIFRSQUNLKTtcbiAgMHgwYWEgPSBvYnNvbGV0ZSgweDExZCk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWIgPSBvYnNvbGV0ZSgweDE1MCk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgLy8gdW51c2VkIDBhY1xuICAweDBhZCA9IG9ic29sZXRlKDB4MTUyKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBhZSA9IG9ic29sZXRlKDB4MTUzKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBhZiA9IG9ic29sZXRlKDB4MTU0KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcblxuICAvLyAwYnhcbiAgMHgwYjAgPSBvYnNvbGV0ZSgweDE1NSk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjEgPSBvYnNvbGV0ZSgweDE1Nik7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjIgPSBvYnNvbGV0ZSgweDE1Nyk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjMgPSBvYnNvbGV0ZSgweDE1OCk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGI0ID0gb2Jzb2xldGUoMHgxNTkpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGI1ID0gb2Jzb2xldGUoMHgxNWEpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYjYgPSBvYnNvbGV0ZSgweDExZik7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiNyA9IG9ic29sZXRlKDB4MTVjKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI4ID0gb2Jzb2xldGUoMHgxNWQpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjkgPSBvYnNvbGV0ZSgweDExZSk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYSA9IG9ic29sZXRlKDB4MTVlKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJiID0gb2Jzb2xldGUoMHgxNWYpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmMgPSBvYnNvbGV0ZSgweDE2MCk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiZCA9IG9ic29sZXRlKDB4MTIwKTsgLy8gY2hlc3Q6IGZydWl0IG9mIGxpbWVcbiAgMHgwYmUgPSBvYnNvbGV0ZSgweDEyMSk7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuICAweDBiZiA9IG9ic29sZXRlKDB4MTYyKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG5cbiAgLy8gMGN4XG4gIDB4MGMwID0gb2Jzb2xldGUoMHgxNjMpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwYzEgPSBvYnNvbGV0ZSgweDE2NCk7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuICAweDBjMiA9IG9ic29sZXRlKDB4MTIyKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzMgPSBvYnNvbGV0ZSgweDE2NSk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGM0ID0gb2Jzb2xldGUoMHgxNjYpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcmVwdW5cbiAgMHgwYzUgPSBvYnNvbGV0ZSgweDE2Yik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGM2ID0gb2Jzb2xldGUoMHgxNmMpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNyA9IG9ic29sZXRlKDB4MTIzKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHJlcHVuXG4gIDB4MGM4ID0gb2Jzb2xldGUoMHgxMjQpOyAvLyBjaGVzdDogd2FycCBib290c1xuICAweDBjOSA9IG9ic29sZXRlKDB4MTZhKTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwY2EgPSBvYnNvbGV0ZSgweDEzZCk7IC8vIGNoZWNrOiBpdm9yeSBzdGF0dWUgLyBrYXJtaW5lXG4gIDB4MGNiID0gb2Jzb2xldGUoMHgxMmEpOyAvLyBjaGVzdDogcG93ZXIgcmluZ1xuICAweDBjYyA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAweDBjZCA9IG9ic29sZXRlKDB4MTE0KTsgLy8gY2hlc3Q6IHBzeWNobyBzaGllbGRcbiAgMHgwY2UgPSBvYnNvbGV0ZSgweDEyNSk7IC8vIGNoZXN0OiBzdGF0dWUgb2Ygb255eFxuICAweDBjZiA9IG9ic29sZXRlKDB4MTMzKTsgLy8gY2hlc3Q6IGtleSB0byBwcmlzb25cbiAgXG4gIC8vIDBkeFxuICAweDBkMCA9IG9ic29sZXRlKDB4MTI4KTsgLy8gY2hlY2s6IGZsdXRlIG9mIGxpbWUgLyBxdWVlblxuICAweDBkMSA9IG9ic29sZXRlKDB4MTM1KTsgLy8gY2hlc3Q6IGZvZyBsYW1wXG4gIDB4MGQyID0gb2Jzb2xldGUoMHgxNjkpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBkMyA9IG9ic29sZXRlKDB4MTI2KTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGQ0ID0gb2Jzb2xldGUoMHgxNWIpOyAvLyBjaGVzdDogZmx1dGUgb2YgbGltZVxuICAweDBkNSA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDEnKTtcbiAgMHgwZDYgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAyJyk7XG4gIDB4MGQ3ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMycpO1xuICAweDBkOCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSByZXNjdWVkJyk7XG4gIDB4MGQ5ID0gZGlhbG9nVG9nZ2xlKCdTdG9uZWQgcGFpcicpO1xuICAweDBkYSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSBnb25lIGZyb20gdGF2ZXJuJyk7XG4gIDB4MGRiID0gZGlhbG9nVG9nZ2xlKCdJbiBTYWJlcmFcXCdzIHRyYXAnKTtcbiAgMHgwZGMgPSBvYnNvbGV0ZSgweDE2Zik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGRkID0gb2Jzb2xldGUoMHgxNzApOyAvLyBtaW1pYz8/IG1lZGljYWwgaGVyYj8/XG4gIDB4MGRlID0gb2Jzb2xldGUoMHgxMmMpOyAvLyBjaGVzdDogaXJvbiBuZWNrbGFjZVxuICAweDBkZiA9IG9ic29sZXRlKDB4MTFiKTsgLy8gY2hlc3Q6IGJhdHRsZSBhcm1vclxuXG4gIC8vIDBleFxuICAweDBlMCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIEFrYWhhbmEnKTtcbiAgLy8gdW51c2VkIDBlMSAuLiAwZTNcbiAgMHgwZTQgPSBvYnNvbGV0ZSgweDEzYyk7IC8vIGNoZXN0OiBraXJpc2EgcGxhbnRcbiAgMHgwZTUgPSBvYnNvbGV0ZSgweDE2ZSk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGU2ID0gb2Jzb2xldGUoMHgxNmQpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwZTcgPSBvYnNvbGV0ZSgweDEyZik7IC8vIGNoZXN0OiBsZWF0aGVyIGJvb3RzXG4gIDB4MGU4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU2h5cm9uIHZpbGxhZ2VyJyk7XG4gIDB4MGU5ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU2h5cm9uIGd1YXJkJyk7XG4gIDB4MGVhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMScpO1xuICAweDBlYiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDInKTtcbiAgMHgwZWMgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAzJyk7XG4gIDB4MGVkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ01lc2lhJyk7XG4gIC8vIHVudXNlZCAwZWUgLi4gMGZmXG4gIFRhbGtlZFRvWmVidVN0dWRlbnQgPSBtb3ZhYmxlKDB4MGVlLCBUUkFDSyk7XG5cbiAgLy8gMTAwXG4gIDB4MTAwID0gb2Jzb2xldGUoMHgxMmUpOyAvLyBjaGVjazogcmFiYml0IGJvb3RzIC8gdmFtcGlyZVxuICAweDEwMSA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICAweDEwMiA9IG9ic29sZXRlKDB4MTA4KTsgLy8gY2hlY2s6IGZsYW1lIGJyYWNlbGV0IC8ga2VsYmVzcXVlIDFcbiAgMHgxMDMgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIGNoZWNrOiBiYWxsIG9mIHdhdGVyIC8gcmFnZVxuICAvLyB1bnVzZWQgMTA0XG4gIDB4MTA1ID0gb2Jzb2xldGUoMHgxMjYpOyAvLyBjaGVjazogb3BlbCBzdGF0dWUgLyBrZWxiZXNxdWUgMlxuICAweDEwNiA9IG9ic29sZXRlKDB4MTIzKTsgLy8gY2hlY2s6IGZydWl0IG9mIHJlcHVuIC8gc2FiZXJhIDJcbiAgMHgxMDcgPSBvYnNvbGV0ZSgweDExMik7IC8vIGNoZWNrOiBzYWNyZWQgc2hpZWxkIC8gbWFkbyAyXG4gIDB4MTA4ID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICBVc2VkQm93T2ZNb29uID0gbW92YWJsZSgweDEwOSk7XG4gIFVzZWRCb3dPZlN1biA9IG1vdmFibGUoMHgxMGEpO1xuICAweDEwYiA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAweDEwYyA9IG9ic29sZXRlKDB4MTYxKTsgLy8gY2hlY2s6IGZydWl0IG9mIHBvd2VyIC8gdmFtcGlyZSAyXG5cbiAgLy8gMTAwIC4uIDE3ZiA9PiBmaXhlZCBmbGFncyBmb3IgY2hlY2tzLlxuXG4gIC8vIFRPRE8gLSBhcmUgdGhlc2UgYWxsIFRSQUNLIG9yIGp1c3QgdGhlIG5vbi1jaGVzdHM/IT9cblxuICAvLyBUT0RPIC0gYmFzaWMgaWRlYSAtIE5QQyBoaXRib3ggZXh0ZW5kcyBkb3duIG9uZSB0aWxlPyAoaXMgdGhhdCBlbm91Z2g/KVxuICAvLyAgICAgIC0gc3RhdHVlcyBjYW4gYmUgZW50ZXJlZCBidXQgbm90IGV4aXRlZD9cbiAgLy8gICAgICAtIHVzZSB0cmlnZ2VyICh8IHBhcmFseXNpcyB8IGdsaXRjaCkgZm9yIG1vdmluZyBzdGF0dWVzP1xuICAvLyAgICAgICAgICAtPiBnZXQgbm9ybWFsIHJlcXVpcmVtZW50cyBmb3IgZnJlZVxuICAvLyAgICAgICAgICAtPiBiZXR0ZXIgaGl0Ym94PyAgYW55IHdheSB0byBnZXQgcXVlZW4gdG8gd29yaz8gdG9vIG11Y2ggc3RhdGU/XG4gIC8vICAgICAgICAgICAgIG1heSBuZWVkIHRvIGhhdmUgdHdvIGRpZmZlcmVudCB0aHJvbmUgcm9vbXM/IChmdWxsL2VtcHR5KVxuICAvLyAgICAgICAgICAgICBhbmQgaGF2ZSBmbGFnIHN0YXRlIGFmZmVjdCBleGl0Pz8/XG4gIC8vICAgICAgLSBhdCB0aGUgdmVyeSBsZWFzdCB3ZSBjYW4gdXNlIGl0IGZvciB0aGUgaGl0Ym94LCBidXQgd2UgbWF5IHN0aWxsXG4gIC8vICAgICAgICBuZWVkIGN1c3RvbSBvdmVybGF5P1xuXG4gIC8vIFRPRE8gLSBwc2V1ZG8gZmxhZ3Mgc29tZXdoZXJlPyAgbGlrZSBzd29yZD8gYnJlYWsgaXJvbj8gZXRjLi4uXG5cbiAgTGVhZkVsZGVyID0gdHJhY2tlZCh+MHgxMDApO1xuICBPYWtFbGRlciA9IHRyYWNrZWQofjB4MTAxKTtcbiAgV2F0ZXJmYWxsQ2F2ZVN3b3JkT2ZXYXRlckNoZXN0ID0gdHJhY2tlZCh+MHgxMDIpO1xuICBTdHh5TGVmdFVwcGVyU3dvcmRPZlRodW5kZXJDaGVzdCA9IHRyYWNrZWQofjB4MTAzKTtcbiAgTWVzaWFJblRvd2VyID0gdHJhY2tlZCgweDEwNCk7XG4gIFNlYWxlZENhdmVCYWxsT2ZXaW5kQ2hlc3QgPSB0cmFja2VkKH4weDEwNSk7XG4gIE10U2FicmVXZXN0VG9ybmFkb0JyYWNlbGV0Q2hlc3QgPSB0cmFja2VkKH4weDEwNik7XG4gIEdpYW50SW5zZWN0ID0gdHJhY2tlZCh+MHgxMDcpO1xuICBLZWxiZXNxdWUxID0gdHJhY2tlZCh+MHgxMDgpO1xuICBSYWdlID0gdHJhY2tlZCh+MHgxMDkpO1xuICBBcnlsbGlzQmFzZW1lbnRDaGVzdCA9IHRyYWNrZWQofjB4MTBhKTtcbiAgTWFkbzEgPSB0cmFja2VkKH4weDEwYik7XG4gIFN0b3JtQnJhY2VsZXRDaGVzdCA9IHRyYWNrZWQofjB4MTBjKTtcbiAgV2F0ZXJmYWxsQ2F2ZVJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDExMCk7IC8vIHJhbmRvIGNoYW5nZWQgaW5kZXghXG4gIE1hZG8yID0gdHJhY2tlZCgweDExMik7XG4gIFN0eHlSaWdodE1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDExNCk7XG4gIEJhdHRsZUFybW9yQ2hlc3QgPSB0cmFja2VkKDB4MTFiKTtcbiAgRHJheWdvbjEgPSB0cmFja2VkKDB4MTFjKTtcbiAgU2VhbGVkQ2F2ZVNtYWxsUm9vbUJhY2tDaGVzdCA9IHRyYWNrZWQoMHgxMWQpOyAvLyBtZWRpY2FsIGhlcmJcbiAgU2VhbGVkQ2F2ZUJpZ1Jvb21Ob3J0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxMWUpOyAvLyBhbnRpZG90ZVxuICBGb2dMYW1wQ2F2ZUZyb250Q2hlc3QgPSB0cmFja2VkKDB4MTFmKTsgLy8gbHlzaXMgcGxhbnRcbiAgTXRIeWRyYVJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTIwKTsgLy8gZnJ1aXQgb2YgbGltZVxuICBTYWJlcmFVcHN0YWlyc0xlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMjEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBFdmlsU3Bpcml0SXNsYW5kTG93ZXJDaGVzdCA9IHRyYWNrZWQoMHgxMjIpOyAvLyBtYWdpYyByaW5nXG4gIFNhYmVyYTIgPSB0cmFja2VkKDB4MTIzKTsgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgU2VhbGVkQ2F2ZVNtYWxsUm9vbUZyb250Q2hlc3QgPSB0cmFja2VkKDB4MTI0KTsgLy8gd2FycCBib290c1xuICBDb3JkZWxHcmFzcyA9IHRyYWNrZWQoMHgxMjUpO1xuICBLZWxiZXNxdWUyID0gdHJhY2tlZCgweDEyNik7IC8vIG9wZWwgc3RhdHVlXG4gIE9ha01vdGhlciA9IHRyYWNrZWQoMHgxMjcpO1xuICBQb3J0b2FRdWVlbiA9IHRyYWNrZWQoMHgxMjgpO1xuICBBa2FoYW5hU3RhdHVlT2ZPbnl4VHJhZGVpbiA9IHRyYWNrZWQoMHgxMjkpO1xuICBPYXNpc0NhdmVGb3J0cmVzc0Jhc2VtZW50Q2hlc3QgPSB0cmFja2VkKDB4MTJhKTtcbiAgQnJva2FoYW5hID0gdHJhY2tlZCgweDEyYik7XG4gIEV2aWxTcGlyaXRJc2xhbmRSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMmMpO1xuICBEZW8gPSB0cmFja2VkKDB4MTJkKTtcbiAgVmFtcGlyZTEgPSB0cmFja2VkKDB4MTJlKTtcbiAgT2FzaXNDYXZlTm9ydGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTJmKTtcbiAgQWthaGFuYUZsdXRlT2ZMaW1lVHJhZGVpbiA9IHRyYWNrZWQoMHgxMzApO1xuICBaZWJ1U3R1ZGVudCA9IHRyYWNrZWQoMHgxMzEpOyAvLyBUT0RPIC0gbWF5IG9wdCBmb3IgMiBpbiBjYXZlIGluc3RlYWQ/XG4gIFdpbmRtaWxsR3VhcmRBbGFybUZsdXRlVHJhZGVpbiA9IHRyYWNrZWQoMHgxMzIpO1xuICBNdFNhYnJlTm9ydGhCYWNrT2ZQcmlzb25DaGVzdCA9IHRyYWNrZWQoMHgxMzMpO1xuICBaZWJ1SW5TaHlyb24gPSB0cmFja2VkKDB4MTM0KTtcbiAgRm9nTGFtcENhdmVCYWNrQ2hlc3QgPSB0cmFja2VkKDB4MTM1KTtcbiAgSW5qdXJlZERvbHBoaW4gPSB0cmFja2VkKDB4MTM2KTtcbiAgQ2xhcmsgPSB0cmFja2VkKDB4MTM3KTtcbiAgU2FiZXJhMSA9IHRyYWNrZWQoMHgxMzgpO1xuICBLZW5zdUluTGlnaHRob3VzZSA9IHRyYWNrZWQoMHgxMzkpO1xuICBSZXBhaXJlZFN0YXR1ZSA9IHRyYWNrZWQoMHgxM2EpO1xuICBVbmRlcmdyb3VuZENoYW5uZWxVbmRlcndhdGVyQ2hlc3QgPSB0cmFja2VkKDB4MTNiKTtcbiAgS2lyaXNhTWVhZG93ID0gdHJhY2tlZCgweDEzYyk7XG4gIEthcm1pbmUgPSB0cmFja2VkKDB4MTNkKTtcbiAgQXJ5bGxpcyA9IHRyYWNrZWQoMHgxM2UpO1xuICBNdEh5ZHJhU3VtbWl0Q2hlc3QgPSB0cmFja2VkKDB4MTNmKTtcbiAgQXp0ZWNhSW5QeXJhbWlkID0gdHJhY2tlZCgweDE0MCk7XG4gIFplYnVBdFdpbmRtaWxsID0gdHJhY2tlZCgweDE0MSk7XG4gIE10U2FicmVOb3J0aFN1bW1pdCA9IHRyYWNrZWQoMHgxNDIpO1xuICBTdG9tRmlnaHRSZXdhcmQgPSB0cmFja2VkKDB4MTQzKTtcbiAgTXRTYWJyZVdlc3RUb3JuZWwgPSB0cmFja2VkKDB4MTQ0KTtcbiAgQXNpbmFJbkJhY2tSb29tID0gdHJhY2tlZCgweDE0NSk7XG4gIEJlaGluZFdoaXJscG9vbCA9IHRyYWNrZWQoMHgxNDYpO1xuICBLZW5zdUluU3dhbiA9IHRyYWNrZWQoMHgxNDcpO1xuICBTbGltZWRLZW5zdSA9IHRyYWNrZWQoMHgxNDgpO1xuICBTZWFsZWRDYXZlQmlnUm9vbVNvdXRod2VzdENoZXN0ID0gdHJhY2tlZCgweDE1MCk7IC8vIG1lZGljYWwgaGVyYlxuICAvLyB1bnVzZWQgMTUxIHNhY3JlZCBzaGllbGQgY2hlc3RcbiAgTXRTYWJyZVdlc3RSaWdodENoZXN0ID0gdHJhY2tlZCgweDE1Mik7IC8vIG1lZGljYWwgaGVyYlxuICBNdFNhYnJlTm9ydGhNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNTMpOyAvLyBtZWRpY2FsIGhlcmJcbiAgRm9ydHJlc3NNYWRvSGVsbHdheUNoZXN0ID0gdHJhY2tlZCgweDE1NCk7IC8vIG1hZ2ljIHJpbmdcbiAgU2FiZXJhVXBzdGFpcnNSaWdodENoZXN0ID0gdHJhY2tlZCgweDE1NSk7IC8vIG1lZGljYWwgaGVyYiBhY3Jvc3Mgc3Bpa2VzXG4gIE10SHlkcmFGYXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTU2KTsgLy8gbWVkaWNhbCBoZXJiXG4gIFN0eHlMZWZ0TG93ZXJDaGVzdCA9IHRyYWNrZWQoMHgxNTcpOyAvLyBtZWRpY2FsIGhlcmJcbiAgS2FybWluZUJhc2VtZW50TG93ZXJNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNTgpOyAvLyBtYWdpYyByaW5nXG4gIEVhc3RDYXZlTm9ydGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTU5KTsgLy8gbWVkaWNhbCBoZXJiICh1bnVzZWQpXG4gIE9hc2lzQ2F2ZUVudHJhbmNlQWNyb3NzUml2ZXJDaGVzdCA9IHRyYWNrZWQoMHgxNWEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICAvLyB1bnVzZWQgMTViIDJuZCBmbHV0ZSBvZiBsaW1lIC0gY2hhbmdlZCBpbiByYW5kb1xuICAvLyBXYXRlcmZhbGxDYXZlUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTViKTsgLy8gMm5kIGZsdXRlIG9mIGxpbWVcbiAgRXZpbFNwaXJpdElzbGFuZEV4aXRDaGVzdCA9IHRyYWNrZWQoMHgxNWMpOyAvLyBseXNpcyBwbGFudFxuICBGb3J0cmVzc1NhYmVyYU1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1ZCk7IC8vIGx5c2lzIHBsYW50XG4gIE10U2FicmVOb3J0aFVuZGVyQnJpZGdlQ2hlc3QgPSB0cmFja2VkKDB4MTVlKTsgLy8gYW50aWRvdGVcbiAgS2lyaXNhUGxhbnRDYXZlQ2hlc3QgPSB0cmFja2VkKDB4MTVmKTsgLy8gYW50aWRvdGVcbiAgRm9ydHJlc3NNYWRvVXBwZXJOb3J0aENoZXN0ID0gdHJhY2tlZCgweDE2MCk7IC8vIGFudGlkb3RlXG4gIFZhbXBpcmUyID0gdHJhY2tlZCgweDE2MSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEZvcnRyZXNzU2FiZXJhTm9ydGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTYyKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRm9ydHJlc3NNYWRvTG93ZXJDZW50ZXJOb3J0aENoZXN0ID0gdHJhY2tlZCgweDE2Myk7IC8vIG9wZWwgc3RhdHVlXG4gIE9hc2lzQ2F2ZU5lYXJFbnRyYW5jZUNoZXN0ID0gdHJhY2tlZCgweDE2NCk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIE10SHlkcmFMZWZ0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNjUpOyAvLyBtYWdpYyByaW5nXG4gIEZvcnRyZXNzU2FiZXJhU291dGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTY2KTsgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgS2Vuc3VJbkNhYmluID0gdHJhY2tlZCgweDE2Nyk7IC8vIGFkZGVkIGJ5IHJhbmRvbWl6ZXIgaWYgZm9nIGxhbXAgbm90IG5lZWRlZFxuICAvLyB1bnVzZWQgMTY4IG1hZ2ljIHJpbmcgY2hlc3RcbiAgTXRTYWJyZVdlc3ROZWFyS2Vuc3VDaGVzdCA9IHRyYWNrZWQoMHgxNjkpOyAvLyBtYWdpYyByaW5nXG4gIE10U2FicmVXZXN0TGVmdENoZXN0ID0gdHJhY2tlZCgweDE2YSk7IC8vIHdhcnAgYm9vdHNcbiAgRm9ydHJlc3NNYWRvVXBwZXJCZWhpbmRXYWxsQ2hlc3QgPSB0cmFja2VkKDB4MTZiKTsgLy8gbWFnaWMgcmluZ1xuICBQeXJhbWlkQ2hlc3QgPSB0cmFja2VkKDB4MTZjKTsgLy8gbWFnaWMgcmluZ1xuICBDcnlwdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTZkKTsgLy8gb3BlbCBzdGF0dWVcbiAgS2FybWluZUJhc2VtZW50TG93ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTZlKTsgLy8gd2FycCBib290c1xuICBGb3J0cmVzc01hZG9Mb3dlclNvdXRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE2Zik7IC8vIG1hZ2ljIHJpbmdcbiAgLy8gPSB0cmFja2VkKDB4MTcwKTsgLy8gbWltaWMgLyBtZWRpY2FsIGhlcmJcbiAgLy8gVE9ETyAtIGFkZCBhbGwgdGhlIG1pbWljcywgZ2l2ZSB0aGVtIHN0YWJsZSBudW1iZXJzP1xuICBGb2dMYW1wQ2F2ZU1pZGRsZU5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTcwKTtcbiAgRm9nTGFtcENhdmVNaWRkbGVTb3V0aHdlc3RNaW1pYyA9IHRyYWNrZWQoMHgxNzEpO1xuICBXYXRlcmZhbGxDYXZlRnJvbnRNaW1pYyA9IHRyYWNrZWQoMHgxNzIpO1xuICBFdmlsU3Bpcml0SXNsYW5kUml2ZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3Myk7XG4gIE10SHlkcmFGaW5hbENhdmVNaW1pYyA9IHRyYWNrZWQoMHgxNzQpO1xuICBTdHh5TGVmdE5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTc1KTtcbiAgU3R4eVJpZ2h0Tm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzYpO1xuICBTdHh5UmlnaHRTb3V0aE1pbWljID0gdHJhY2tlZCgweDE3Nyk7XG4gIENyeXB0TGVmdFBpdE1pbWljID0gdHJhY2tlZCgweDE3OCk7XG4gIEthcm1pbmVCYXNlbWVudFVwcGVyTWlkZGxlTWltaWMgPSB0cmFja2VkKDB4MTc5KTtcbiAgS2FybWluZUJhc2VtZW50VXBwZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3YSk7XG4gIEthcm1pbmVCYXNlbWVudExvd2VyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxN2IpO1xuICAvLyBUT0RPIC0gbWltaWNzIDEzLi4xNiA/XG5cbiAgLy8gMTgwIC4uIDFmZiA9PiBmaXhlZCBmbGFncyBmb3Igb3ZlcmZsb3cgYnVmZmVyLlxuXG4gIC8vIDIwMCAuLiAyN2YgPT4gZml4ZWQgZmxhZ3MgZm9yIGl0ZW1zLlxuICBTd29yZE9mV2luZCA9IHRyYWNrZWQoMHgyMDApO1xuICBTd29yZE9mRmlyZSA9IHRyYWNrZWQoMHgyMDEpO1xuICBTd29yZE9mV2F0ZXIgPSB0cmFja2VkKDB4MjAyKTtcbiAgU3dvcmRPZlRodW5kZXIgPSB0cmFja2VkKDB4MjAzKTtcbiAgQ3J5c3RhbGlzID0gdHJhY2tlZCgweDIwNCk7XG4gIEJhbGxPZldpbmQgPSB0cmFja2VkKDB4MjA1KTtcbiAgVG9ybmFkb0JyYWNlbGV0ID0gdHJhY2tlZCgweDIwNik7XG4gIEJhbGxPZkZpcmUgPSB0cmFja2VkKDB4MjA3KTtcbiAgRmxhbWVCcmFjZWxldCA9IHRyYWNrZWQoMHgyMDgpO1xuICBCYWxsT2ZXYXRlciA9IHRyYWNrZWQoMHgyMDkpO1xuICBCbGl6emFyZEJyYWNlbGV0ID0gdHJhY2tlZCgweDIwYSk7XG4gIEJhbGxPZlRodW5kZXIgPSB0cmFja2VkKDB4MjBiKTtcbiAgU3Rvcm1CcmFjZWxldCA9IHRyYWNrZWQoMHgyMGMpO1xuICBDYXJhcGFjZVNoaWVsZCA9IHRyYWNrZWQoMHgyMGQpO1xuICBCcm9uemVTaGllbGQgPSB0cmFja2VkKDB4MjBlKTtcbiAgUGxhdGludW1TaGllbGQgPSB0cmFja2VkKDB4MjBmKTtcbiAgTWlycm9yZWRTaGllbGQgPSB0cmFja2VkKDB4MjEwKTtcbiAgQ2VyYW1pY1NoaWVsZCA9IHRyYWNrZWQoMHgyMTEpO1xuICBTYWNyZWRTaGllbGQgPSB0cmFja2VkKDB4MjEyKTtcbiAgQmF0dGxlU2hpZWxkID0gdHJhY2tlZCgweDIxMyk7XG4gIFBzeWNob1NoaWVsZCA9IHRyYWNrZWQoMHgyMTQpO1xuICBUYW5uZWRIaWRlID0gdHJhY2tlZCgweDIxNSk7XG4gIExlYXRoZXJBcm1vciA9IHRyYWNrZWQoMHgyMTYpO1xuICBCcm9uemVBcm1vciA9IHRyYWNrZWQoMHgyMTcpO1xuICBQbGF0aW51bUFybW9yID0gdHJhY2tlZCgweDIxOCk7XG4gIFNvbGRpZXJTdWl0ID0gdHJhY2tlZCgweDIxOSk7XG4gIENlcmFtaWNTdWl0ID0gdHJhY2tlZCgweDIxYSk7XG4gIEJhdHRsZUFybW9yID0gdHJhY2tlZCgweDIxYik7XG4gIFBzeWNob0FybW9yID0gdHJhY2tlZCgweDIxYyk7XG4gIE1lZGljYWxIZXJiID0gdHJhY2tlZCgweDIxZCk7XG4gIEFudGlkb3RlID0gdHJhY2tlZCgweDIxZSk7XG4gIEx5c2lzUGxhbnQgPSB0cmFja2VkKDB4MjFmKTtcbiAgRnJ1aXRPZkxpbWUgPSB0cmFja2VkKDB4MjIwKTtcbiAgRnJ1aXRPZlBvd2VyID0gdHJhY2tlZCgweDIyMSk7XG4gIE1hZ2ljUmluZyA9IHRyYWNrZWQoMHgyMjIpO1xuICBGcnVpdE9mUmVwdW4gPSB0cmFja2VkKDB4MjIzKTtcbiAgV2FycEJvb3RzID0gdHJhY2tlZCgweDIyNCk7XG4gIFN0YXR1ZU9mT255eCA9IHRyYWNrZWQoMHgyMjUpO1xuICBPcGVsU3RhdHVlID0gdHJhY2tlZCgweDIyNik7XG4gIEluc2VjdEZsdXRlID0gdHJhY2tlZCgweDIyNyk7XG4gIEZsdXRlT2ZMaW1lID0gdHJhY2tlZCgweDIyOCk7XG4gIEdhc01hc2sgPSB0cmFja2VkKDB4MjI5KTtcbiAgUG93ZXJSaW5nID0gdHJhY2tlZCgweDIyYSk7XG4gIFdhcnJpb3JSaW5nID0gdHJhY2tlZCgweDIyYik7XG4gIElyb25OZWNrbGFjZSA9IHRyYWNrZWQoMHgyMmMpO1xuICBEZW9zUGVuZGFudCA9IHRyYWNrZWQoMHgyMmQpO1xuICBSYWJiaXRCb290cyA9IHRyYWNrZWQoMHgyMmUpO1xuICBMZWF0aGVyQm9vdHMgPSB0cmFja2VkKDB4MjJmKTtcbiAgU2hpZWxkUmluZyA9IHRyYWNrZWQoMHgyMzApO1xuICBBbGFybUZsdXRlID0gdHJhY2tlZCgweDIzMSk7XG4gIFdpbmRtaWxsS2V5ID0gdHJhY2tlZCgweDIzMik7XG4gIEtleVRvUHJpc29uID0gdHJhY2tlZCgweDIzMyk7XG4gIEtleVRvU3R4eSA9IHRyYWNrZWQoMHgyMzQpO1xuICBGb2dMYW1wID0gdHJhY2tlZCgweDIzNSk7XG4gIFNoZWxsRmx1dGUgPSB0cmFja2VkKDB4MjM2KTtcbiAgRXllR2xhc3NlcyA9IHRyYWNrZWQoMHgyMzcpO1xuICBCcm9rZW5TdGF0dWUgPSB0cmFja2VkKDB4MjM4KTtcbiAgR2xvd2luZ0xhbXAgPSB0cmFja2VkKDB4MjM5KTtcbiAgU3RhdHVlT2ZHb2xkID0gdHJhY2tlZCgweDIzYSk7XG4gIExvdmVQZW5kYW50ID0gdHJhY2tlZCgweDIzYik7XG4gIEtpcmlzYVBsYW50ID0gdHJhY2tlZCgweDIzYyk7XG4gIEl2b3J5U3RhdHVlID0gdHJhY2tlZCgweDIzZCk7XG4gIEJvd09mTW9vbiA9IHRyYWNrZWQoMHgyM2UpO1xuICBCb3dPZlN1biA9IHRyYWNrZWQoMHgyM2YpO1xuICBCb3dPZlRydXRoID0gdHJhY2tlZCgweDI0MCk7XG4gIFJlZnJlc2ggPSB0cmFja2VkKDB4MjQxKTtcbiAgUGFyYWx5c2lzID0gdHJhY2tlZCgweDI0Mik7XG4gIFRlbGVwYXRoeSA9IHRyYWNrZWQoMHgyNDMpO1xuICBUZWxlcG9ydCA9IHRyYWNrZWQoMHgyNDQpO1xuICBSZWNvdmVyID0gdHJhY2tlZCgweDI0NSk7XG4gIEJhcnJpZXIgPSB0cmFja2VkKDB4MjQ2KTtcbiAgQ2hhbmdlID0gdHJhY2tlZCgweDI0Nyk7XG4gIEZsaWdodCA9IHRyYWNrZWQoMHgyNDgpO1xuXG4gIC8vIDI4MCAuLiAyZjAgPT4gZml4ZWQgZmxhZ3MgZm9yIHdhbGxzLlxuICBDYWxtZWRBbmdyeVNlYSA9IHRyYWNrZWQoMHgyODMpO1xuICBPcGVuZWRKb2VsU2hlZCA9IHRyYWNrZWQoMHgyODcpO1xuICBEcmF5Z29uMiA9IHRyYWNrZWQoMHgyOGQpO1xuICBPcGVuZWRDcnlwdCA9IHRyYWNrZWQoMHgyOGUpO1xuICAvLyBOT1RFOiAyOGYgaXMgZmxhZ2dlZCBmb3IgZHJheWdvbidzIGZsb29yLCBidXQgaXMgdW51c2VkIGFuZCB1bm5lZWRlZFxuICBPcGVuZWRTdHh5ID0gdHJhY2tlZCgweDJiMCk7XG4gIE9wZW5lZFN3YW5HYXRlID0gdHJhY2tlZCgweDJiMyk7XG4gIE9wZW5lZFByaXNvbiA9IHRyYWNrZWQoMHgyZDgpO1xuICBPcGVuZWRTZWFsZWRDYXZlID0gdHJhY2tlZCgweDJlZSk7XG5cbiAgLy8gTm90aGluZyBldmVyIHNldHMgdGhpcywgc28ganVzdCB1c2UgaXQgcmlnaHQgb3V0LlxuICBBbHdheXNUcnVlID0gZml4ZWQoMHgyZjAsIFRSVUUpO1xuXG4gIFdhcnBMZWFmID0gdHJhY2tlZCgweDJmNSk7XG4gIFdhcnBCcnlubWFlciA9IHRyYWNrZWQoMHgyZjYpO1xuICBXYXJwT2FrID0gdHJhY2tlZCgweDJmNyk7XG4gIFdhcnBOYWRhcmUgPSB0cmFja2VkKDB4MmY4KTtcbiAgV2FycFBvcnRvYSA9IHRyYWNrZWQoMHgyZjkpO1xuICBXYXJwQW1hem9uZXMgPSB0cmFja2VkKDB4MmZhKTtcbiAgV2FycEpvZWwgPSB0cmFja2VkKDB4MmZiKTtcbiAgV2FycFpvbWJpZSA9IHRyYWNrZWQofjB4MmZiKTtcbiAgV2FycFN3YW4gPSB0cmFja2VkKDB4MmZjKTtcbiAgV2FycFNoeXJvbiA9IHRyYWNrZWQoMHgyZmQpO1xuICBXYXJwR29hID0gdHJhY2tlZCgweDJmZSk7XG4gIFdhcnBTYWhhcmEgPSB0cmFja2VkKDB4MmZmKTtcblxuICAvLyBQc2V1ZG8gZmxhZ3NcbiAgU3dvcmQgPSBwc2V1ZG8odGhpcyk7XG4gIE1vbmV5ID0gcHNldWRvKHRoaXMpO1xuICBCcmVha1N0b25lID0gcHNldWRvKHRoaXMpO1xuICBCcmVha0ljZSA9IHBzZXVkbyh0aGlzKTtcbiAgRm9ybUJyaWRnZSA9IHBzZXVkbyh0aGlzKTtcbiAgQnJlYWtJcm9uID0gcHNldWRvKHRoaXMpO1xuICBUcmF2ZWxTd2FtcCA9IHBzZXVkbyh0aGlzKTtcbiAgQ2xpbWJXYXRlcmZhbGwgPSBwc2V1ZG8odGhpcyk7XG4gIEJ1eUhlYWxpbmcgPSBwc2V1ZG8odGhpcyk7XG4gIEJ1eVdhcnAgPSBwc2V1ZG8odGhpcyk7XG4gIFNob290aW5nU3RhdHVlID0gcHNldWRvKHRoaXMpO1xuICBDbGltYlNsb3BlOCA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgc2xvcGVzIGhlaWdodCA2LThcbiAgQ2xpbWJTbG9wZTkgPSBwc2V1ZG8odGhpcyk7IC8vIGNsaW1iIHNsb3BlcyBoZWlnaHQgOVxuICBXaWxkV2FycCA9IHBzZXVkbyh0aGlzKTtcblxuICAvLyBNYXAgb2YgZmxhZ3MgdGhhdCBhcmUgXCJ3YWl0aW5nXCIgZm9yIGEgcHJldmlvdXNseS11c2VkIElELlxuICAvLyBTaWduaWZpZWQgd2l0aCBhIG5lZ2F0aXZlIChvbmUncyBjb21wbGVtZW50KSBJRCBpbiB0aGUgRmxhZyBvYmplY3QuXG4gIHByaXZhdGUgcmVhZG9ubHkgdW5hbGxvY2F0ZWQgPSBuZXcgTWFwPG51bWJlciwgRmxhZz4oKTtcblxuICAvLyAvLyBNYXAgb2YgYXZhaWxhYmxlIElEcy5cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBhdmFpbGFibGUgPSBbXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDAwMCAuLiAwZmZcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMTAwIC4uIDFmZlxuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAyMDAgLi4gMmZmXG4gIC8vIF07XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICAvLyBCdWlsZCB1cCBhbGwgdGhlIGZsYWdzIGFzIGFjdHVhbCBpbnN0YW5jZXMgb2YgRmxhZy5cbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG4gICAgICBjb25zdCBzcGVjID0gdGhpc1trZXldO1xuICAgICAgaWYgKCEoc3BlYyBhcyBhbnkpW0ZMQUddKSBjb250aW51ZTtcbiAgICAgIC8vIFJlcGxhY2UgaXQgd2l0aCBhbiBhY3R1YWwgZmxhZy4gIFdlIG1heSBuZWVkIGEgbmFtZSwgZXRjLi4uXG4gICAgICBjb25zdCBrZXlOdW1iZXIgPSBOdW1iZXIoa2V5KTtcbiAgICAgIGNvbnN0IGlkID0gdHlwZW9mIHNwZWMuaWQgPT09ICdudW1iZXInID8gc3BlYy5pZCA6IGtleU51bWJlcjtcbiAgICAgIGlmIChpc05hTihpZCkpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWc6ICR7a2V5fWApO1xuICAgICAgY29uc3QgbmFtZSA9XG4gICAgICAgICAgc3BlYy5uYW1lIHx8XG4gICAgICAgICAgKGlzTmFOKGtleU51bWJlcikgPyB1cHBlckNhbWVsVG9TcGFjZXMoa2V5KSA6IGZsYWdOYW1lKGlkKSk7XG4gICAgICBjb25zdCBmbGFnID0gbmV3IEZsYWcodGhpcywgbmFtZSwgaWQsIHNwZWMpO1xuICAgICAgdGhpc1trZXldID0gZmxhZztcbiAgICAgIC8vIElmIElEIGlzIG5lZ2F0aXZlLCB0aGVuIHN0b3JlIGl0IGFzIHVuYWxsb2NhdGVkLlxuICAgICAgaWYgKGZsYWcuaWQgPCAwKSB7XG4gICAgICAgIHRoaXMudW5hbGxvY2F0ZWQuc2V0KH5mbGFnLmlkLCBmbGFnKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXNbZmxhZy5pZF0pIHtcbiAgICAgICAgdGhpc1tmbGFnLmlkXSA9IGZsYWc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93IGFkZCB0aGUgbWlzc2luZyBmbGFncy5cbiAgICBmb3IgKGxldCBpID0gMHgxMDA7IGkgPCAweDE4MDsgaSsrKSB7XG4gICAgICBjb25zdCBuYW1lID0gYENoZWNrICR7aGV4KGkgJiAweGZmKX1gO1xuICAgICAgaWYgKHRoaXNbaV0pIHtcbiAgICAgICAgaWYgKCF0aGlzW2ldLmZpeGVkICYmICF0aGlzLnVuYWxsb2NhdGVkLmhhcyhpKSkge1xuICAgICAgICAgIHRoaXMudW5hbGxvY2F0ZWQuc2V0KFxuICAgICAgICAgICAgICBpLCBuZXcgRmxhZyh0aGlzLCBuYW1lLCB+aSwge2ZpeGVkOiB0cnVlfSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW2ldID0gbmV3IEZsYWcodGhpcywgbmFtZSwgaSwge2ZpeGVkOiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAweDE4MDsgaSA8IDB4MjgwOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkge1xuICAgICAgICAvLyBJdGVtIGJ1ZmZlciBoZXJlXG4gICAgICAgIGNvbnN0IHR5cGUgPSBpIDwgMHgyMDAgPyAnQnVmZmVyICcgOiAnSXRlbSAnO1xuICAgICAgICB0aGlzW2ldID0gbmV3IEZsYWcodGhpcywgdHlwZSArIGhleChpKSwgaSwge2ZpeGVkOiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZvciB0aGUgcmVtYWluZGVyLCBmaW5kIHdhbGxzIGluIG1hcHMuXG4gICAgLy8gIC0gZG8gd2UgbmVlZCB0byBwdWxsIHRoZW0gZnJvbSBsb2NhdGlvbnM/PyBvciB0aGlzIGRvaW5nIGFueXRoaW5nPz9cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICAgIGlmICh0aGlzW2YuZmxhZ10pIGNvbnRpbnVlO1xuICAgICAgICB0aGlzW2YuZmxhZ10gPSB3YWxsRmxhZyh0aGlzLCBmLmZsYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNhdmVzID4gNDcwIGJ5dGVzIG9mIHJlZHVuZGFudCBmbGFnIHNldHMhXG4gIGRlZnJhZygpIHtcbiAgICAvLyBtYWtlIGEgbWFwIG9mIG5ldyBJRHMgZm9yIGV2ZXJ5dGhpbmcuXG4gICAgY29uc3QgcmVtYXBwaW5nID0gbmV3IE1hcDxudW1iZXIsIChmOiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPigpO1xuICAgIGNvbnN0IHVudXNlZCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuXG4gICAgLy8gZmlyc3QgaGFuZGxlIGFsbCB0aGUgb2Jzb2xldGUgZmxhZ3MgLSBvbmNlIHRoZSByZW1hcHBpbmcgaXMgcHVsbGVkIG9mZlxuICAgIC8vIHdlIGNhbiBzaW1wbHkgdW5yZWYgdGhlbS5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzW2ldO1xuICAgICAgY29uc3QgbyA9IGY/Lm9ic29sZXRlO1xuICAgICAgaWYgKG8pIHtcbiAgICAgICAgcmVtYXBwaW5nLnNldChpLCAoYzogRmxhZ0NvbnRleHQpID0+IGMuc2V0ID8gLTEgOiBvLmNhbGwoZiwgYykpO1xuICAgICAgICBkZWxldGUgdGhpc1tpXTtcbiAgICAgIH0gZWxzZSBpZiAoIWYpIHtcbiAgICAgICAgdW51c2VkLmFkZChpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgbW92ZSBhbGwgdGhlIG1vdmFibGUgZmxhZ3MuXG4gICAgbGV0IGkgPSAwO1xuICAgIGxldCBqID0gMHgyZmY7XG4gICAgLy8gV0FSTklORzogaSBhbmQgaiBhcmUgYm91bmQgdG8gdGhlIG91dGVyIHNjb3BlISAgQ2xvc2luZyBvdmVyIHRoZW1cbiAgICAvLyB3aWxsIE5PVCB3b3JrIGFzIGludGVuZGVkLlxuICAgIGZ1bmN0aW9uIHJldDxUPih4OiBUKTogKCkgPT4gVCB7IHJldHVybiAoKSA9PiB4OyB9XG4gICAgd2hpbGUgKGkgPCBqKSB7XG4gICAgICBpZiAodGhpc1tpXSB8fCB0aGlzLnVuYWxsb2NhdGVkLmhhcyhpKSkgeyBpKys7IGNvbnRpbnVlOyB9XG4gICAgICBjb25zdCBmID0gdGhpc1tqXTtcbiAgICAgIGlmICghZiB8fCBmLmZpeGVkKSB7IGotLTsgY29udGludWU7IH1cbiAgICAgIC8vIGYgaXMgYSBtb3ZhYmxlIGZsYWcuICBNb3ZlIGl0IHRvIGkuXG4gICAgICByZW1hcHBpbmcuc2V0KGosIHJldChpKSk7XG4gICAgICAoZiBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBpO1xuICAgICAgdGhpc1tpXSA9IGY7XG4gICAgICBkZWxldGUgdGhpc1tqXTtcbiAgICAgIGkrKztcbiAgICAgIGotLTtcbiAgICB9XG5cbiAgICAvLyBnbyB0aHJvdWdoIGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHdlIGNvdWxkIGZpbmQgZmxhZ3MgYW5kIHJlbWFwIVxuICAgIHRoaXMucmVtYXBGbGFncyhyZW1hcHBpbmcsIHVudXNlZCk7XG5cbiAgICAvLyBVbmFsbG9jYXRlZCBmbGFncyBkb24ndCBuZWVkIGFueSByZW1hcHBpbmcuXG4gICAgZm9yIChjb25zdCBbd2FudCwgZmxhZ10gb2YgdGhpcy51bmFsbG9jYXRlZCkge1xuICAgICAgaWYgKHRoaXNbd2FudF0pIGNvbnRpbnVlO1xuICAgICAgdGhpcy51bmFsbG9jYXRlZC5kZWxldGUod2FudCk7XG4gICAgICAodGhpc1t3YW50XSA9IGZsYWcgYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gd2FudDtcbiAgICB9XG5cbiAgICAvL2lmICh0aGlzLnVuYWxsb2NhdGVkLnNpemUpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZ1bGx5IGFsbG9jYXRlYCk7XG5cbiAgICAvLyBSZXBvcnQgaG93IHRoZSBkZWZyYWcgd2VudD9cbiAgICBjb25zdCBmcmVlID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDMwMDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIGZyZWUucHVzaChoZXgzKGkpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coYEZyZWUgZmxhZ3M6ICR7ZnJlZS5qb2luKCcgJyl9YCk7XG4gIH1cblxuICBpbnNlcnRab21iaWVXYXJwRmxhZygpIHtcbiAgICAvLyBNYWtlIHNwYWNlIGZvciB0aGUgbmV3IGZsYWcgYmV0d2VlbiBKb2VsIGFuZCBTd2FuXG4gICAgY29uc3QgcmVtYXBwaW5nID0gbmV3IE1hcDxudW1iZXIsIChmOiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPigpO1xuICAgIGlmICh0aGlzWzB4MmY0XSkgdGhyb3cgbmV3IEVycm9yKGBObyBzcGFjZSB0byBpbnNlcnQgd2FycCBmbGFnYCk7XG4gICAgY29uc3QgbmV3SWQgPSB+dGhpcy5XYXJwWm9tYmllLmlkO1xuICAgIGlmIChuZXdJZCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIFdhcnBab21iaWUgaWRgKTtcbiAgICBmb3IgKGxldCBpID0gMHgyZjQ7IGkgPCBuZXdJZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdGhpc1tpICsgMV07XG4gICAgICAodGhpc1tpXSBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBpO1xuICAgICAgcmVtYXBwaW5nLnNldChpICsgMSwgKCkgPT4gaSk7XG4gICAgfVxuICAgICh0aGlzLldhcnBab21iaWUgYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gbmV3SWQ7XG4gICAgdGhpc1tuZXdJZF0gPSB0aGlzLldhcnBab21iaWU7XG4gICAgdGhpcy5yZW1hcEZsYWdzKHJlbWFwcGluZyk7XG4gIH1cblxuICByZW1hcChzcmM6IG51bWJlciwgZGVzdDogbnVtYmVyKSB7XG4gICAgdGhpcy5yZW1hcEZsYWdzKG5ldyBNYXAoW1tzcmMsICgpID0+IGRlc3RdXSkpO1xuICB9XG5cbiAgcmVtYXBGbGFncyhyZW1hcHBpbmc6IE1hcDxudW1iZXIsIChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+LFxuICAgICAgICAgICAgIHVudXNlZD86IFNldDxudW1iZXI+KSB7XG4gICAgZnVuY3Rpb24gcHJvY2Vzc0xpc3QobGlzdDogbnVtYmVyW10sIGN0eDogRmxhZ0NvbnRleHQpIHtcbiAgICAgIGZvciAobGV0IGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGxldCBmID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKGYgPCAwKSBmID0gfmY7XG4gICAgICAgIGlmICh1bnVzZWQgJiYgdW51c2VkLmhhcyhmKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU0hPVUxEIEJFIFVOVVNFRDogJHtoZXgoZil9YCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVtYXAgPSByZW1hcHBpbmcuZ2V0KGYpO1xuICAgICAgICBpZiAocmVtYXAgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGxldCBtYXBwZWQgPSByZW1hcCh7Li4uY3R4LCBpbmRleDogaX0pO1xuICAgICAgICBpZiAobWFwcGVkID49IDApIHtcbiAgICAgICAgICBsaXN0W2ldID0gbGlzdFtpXSA8IDAgPyB+bWFwcGVkIDogbWFwcGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHByb2Nlc3MoZmxhZzogbnVtYmVyLCBjdHg6IEZsYWdDb250ZXh0KSB7XG4gICAgICBsZXQgdW5zaWduZWQgPSBmbGFnIDwgMCA/IH5mbGFnIDogZmxhZztcbiAgICAgIGlmICh1bnVzZWQgJiYgdW51c2VkLmhhcyh1bnNpZ25lZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTSE9VTEQgQkUgVU5VU0VEOiAke2hleCh1bnNpZ25lZCl9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCByZW1hcCA9IHJlbWFwcGluZy5nZXQodW5zaWduZWQpO1xuICAgICAgaWYgKHJlbWFwID09IG51bGwpIHJldHVybiBmbGFnO1xuICAgICAgbGV0IG1hcHBlZCA9IHJlbWFwKGN0eCk7XG4gICAgICBpZiAobWFwcGVkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyBkZWxldGVgKTtcbiAgICAgIHJldHVybiBmbGFnIDwgMCA/IH5tYXBwZWQgOiBtYXBwZWQ7XG4gICAgfVxuXG4gICAgLy8gTG9jYXRpb24gZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsb2NhdGlvbi51c2VkKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBsb2NhdGlvbi5mbGFncykge1xuICAgICAgICBmbGFnLmZsYWcgPSBwcm9jZXNzKGZsYWcuZmxhZywge2xvY2F0aW9ufSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTlBDIGZsYWdzXG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5yb20ubnBjcykge1xuICAgICAgaWYgKCFucGMudXNlZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IFtsb2MsIGNvbmRzXSBvZiBucGMuc3Bhd25Db25kaXRpb25zKSB7XG4gICAgICAgIHByb2Nlc3NMaXN0KGNvbmRzLCB7bnBjLCBzcGF3bjogbG9jfSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgICAgZC5jb25kaXRpb24gPSBwcm9jZXNzKGQuY29uZGl0aW9uLCB7bnBjLCBkaWFsb2c6IHRydWV9KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgWywgZHNdIG9mIG5wYy5sb2NhbERpYWxvZ3MpIHtcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIGRzKSB7XG4gICAgICAgICAgZC5jb25kaXRpb24gPSBwcm9jZXNzKGQuY29uZGl0aW9uLCB7bnBjLCBkaWFsb2c6IHRydWV9KTtcbiAgICAgICAgICBwcm9jZXNzTGlzdChkLmZsYWdzLCB7bnBjLCBkaWFsb2c6IHRydWUsIHNldDogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHJpZ2dlciBmbGFnc1xuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnJvbS50cmlnZ2Vycykge1xuICAgICAgaWYgKCF0cmlnZ2VyLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgcHJvY2Vzc0xpc3QodHJpZ2dlci5jb25kaXRpb25zLCB7dHJpZ2dlcn0pO1xuICAgICAgcHJvY2Vzc0xpc3QodHJpZ2dlci5mbGFncywge3RyaWdnZXIsIHNldDogdHJ1ZX0pO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciB1cGRhdGluZyB0ZWxlcGF0aHk/IT9cblxuICAgIC8vIEl0ZW1HZXQgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGl0ZW1HZXQgb2YgdGhpcy5yb20uaXRlbUdldHMpIHtcbiAgICAgIHByb2Nlc3NMaXN0KGl0ZW1HZXQuZmxhZ3MsIHtzZXQ6IHRydWV9KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMucm9tLml0ZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IGl0ZW1Vc2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAoaXRlbVVzZS5raW5kID09PSAnZmxhZycpIHtcbiAgICAgICAgICBpdGVtVXNlLndhbnQgPSBwcm9jZXNzKGl0ZW1Vc2Uud2FudCwge30pO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NMaXN0KGl0ZW1Vc2UuZmxhZ3MsIHtzZXQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gYW55dGhpbmcgZWxzZT9cbiAgfVxuXG4gIC8vIFRPRE8gLSBtYW5pcHVsYXRlIHRoaXMgc3R1ZmZcblxuICAvLyBwcml2YXRlIHJlYWRvbmx5IGF2YWlsYWJsZSA9IG5ldyBTZXQ8bnVtYmVyPihbXG4gIC8vICAgLy8gVE9ETyAtIHRoZXJlJ3MgYSB0b24gb2YgbG93ZXIgZmxhZ3MgYXMgd2VsbC5cbiAgLy8gICAvLyBUT0RPIC0gd2UgY2FuIHJlcHVycG9zZSBhbGwgdGhlIG9sZCBpdGVtIGZsYWdzLlxuICAvLyAgIDB4MjcwLCAweDI3MSwgMHgyNzIsIDB4MjczLCAweDI3NCwgMHgyNzUsIDB4Mjc2LCAweDI3NyxcbiAgLy8gICAweDI3OCwgMHgyNzksIDB4MjdhLCAweDI3YiwgMHgyN2MsIDB4MjdkLCAweDI3ZSwgMHgyN2YsXG4gIC8vICAgMHgyODAsIDB4MjgxLCAweDI4OCwgMHgyODksIDB4MjhhLCAweDI4YiwgMHgyOGMsXG4gIC8vICAgMHgyYTcsIDB4MmFiLCAweDJiNCxcbiAgLy8gXSk7XG5cbiAgYWxsb2Moc2VnbWVudDogbnVtYmVyID0gMCk6IG51bWJlciB7XG4gICAgaWYgKHNlZ21lbnQgIT09IDB4MjAwKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBhbGxvY2F0ZSBvdXRzaWRlIDJ4eGApO1xuICAgIGZvciAobGV0IGZsYWcgPSAweDI4MDsgZmxhZyA8IDB4MzAwOyBmbGFnKyspIHtcbiAgICAgIGlmICghdGhpc1tmbGFnXSkge1xuICAgICAgICB0aGlzW2ZsYWddID0gd2FsbEZsYWcodGhpcywgZmxhZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmxhZztcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBObyBmcmVlIGZsYWdzLmApO1xuICB9XG5cbiAgZnJlZShmbGFnOiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gaXMgdGhlcmUgbW9yZSB0byB0aGlzPyAgY2hlY2sgZm9yIHNvbWV0aGluZyBlbHNlP1xuICAgIGRlbGV0ZSB0aGlzW2ZsYWddO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZsYWdOYW1lKGlkOiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gJ0ZsYWcgJyArIGhleDMoaWQpO1xufVxuXG5mdW5jdGlvbiB3YWxsRmxhZyhmbGFnczogRmxhZ3MsIGlkOiBudW1iZXIpOiBGbGFnIHtcbiAgcmV0dXJuIG5ldyBGbGFnKGZsYWdzLCAnV2FsbCAnICsgaGV4KGlkICYgMHhmZiksIGlkLCB7Zml4ZWQ6IHRydWV9KTtcbn1cbiJdfQ==