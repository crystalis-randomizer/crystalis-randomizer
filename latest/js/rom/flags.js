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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBU3RCLE1BQU0sS0FBSyxHQUFVLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFVLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFVLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztBQW9CekIsTUFBTSxPQUFPLElBQUk7SUFNZixZQUFxQixLQUFZLEVBQ1osSUFBWSxFQUNaLEVBQVUsRUFDbkIsSUFBYzs7UUFITCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssU0FBRyxJQUFJLENBQUMsS0FBSyxtQ0FBSSxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDLEVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFB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V0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBR3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFHeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4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T0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDMUM7Z0JBQ0QsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQzthQUN6QztTQUNGO0lBR0gsQ0FBQztJQWFELEtBQUssQ0FBQyxVQUFrQixDQUFDO1FBQ3ZCLElBQUksT0FBTyxLQUFLLEtBQUs7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdEUsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7UUFFZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFFRCxTQUFTLFFBQVEsQ0FBQyxFQUFVO0lBQzFCLE9BQU8sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsS0FBWSxFQUFFLEVBQVU7SUFDeEMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SXRlbX0gZnJvbSAnLi9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtOcGN9IGZyb20gJy4vbnBjLmpzJztcbmltcG9ydCB7VHJpZ2dlcn0gZnJvbSAnLi90cmlnZ2VyLmpzJztcbmltcG9ydCB7aGV4LCBoZXgzLCB1cHBlckNhbWVsVG9TcGFjZXMsIFdyaXRhYmxlfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50fSBmcm9tICcuLi9sb2dpYy9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcblxuY29uc3QgRkxBRyA9IFN5bWJvbCgpO1xuXG4vLyBUT0RPIC0gbWF5YmUgYWxpYXMgc2hvdWxkIGp1c3QgYmUgaW4gb3ZlcmxheS50cz9cbmV4cG9ydCBpbnRlcmZhY2UgTG9naWMge1xuICBhc3N1bWVUcnVlPzogYm9vbGVhbjtcbiAgYXNzdW1lRmFsc2U/OiBib29sZWFuO1xuICB0cmFjaz86IGJvb2xlYW47XG59XG5cbmNvbnN0IEZBTFNFOiBMb2dpYyA9IHthc3N1bWVGYWxzZTogdHJ1ZX07XG5jb25zdCBUUlVFOiBMb2dpYyA9IHthc3N1bWVUcnVlOiB0cnVlfTtcbmNvbnN0IFRSQUNLOiBMb2dpYyA9IHt0cmFjazogdHJ1ZX07XG5jb25zdCBJR05PUkU6IExvZ2ljID0ge307XG5cbmludGVyZmFjZSBGbGFnRGF0YSB7XG4gIGZpeGVkPzogYm9vbGVhbjtcbiAgb2Jzb2xldGU/OiAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyO1xuICBsb2dpYz86IExvZ2ljO1xufVxuaW50ZXJmYWNlIEZsYWdDb250ZXh0IHtcbiAgdHJpZ2dlcj86IFRyaWdnZXI7XG4gIGxvY2F0aW9uPzogTG9jYXRpb247XG4gIG5wYz86IE5wYztcbiAgc3Bhd24/OiBudW1iZXI7XG4gIGluZGV4PzogbnVtYmVyO1xuICBkaWFsb2c/OiBib29sZWFuO1xuICBzZXQ/OiBib29sZWFuO1xuICAvL2RpYWxvZz86IExvY2FsRGlhbG9nfEdsb2JhbERpYWxvZztcbiAgLy9pbmRleD86IG51bWJlcjtcbiAgLy9jb25kaXRpb24/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZyB7XG5cbiAgZml4ZWQ6IGJvb2xlYW47XG4gIG9ic29sZXRlPzogKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcjtcbiAgbG9naWM6IExvZ2ljO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZsYWdzOiBGbGFncyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBpZDogbnVtYmVyLFxuICAgICAgICAgICAgICBkYXRhOiBGbGFnRGF0YSkge1xuICAgIHRoaXMuZml4ZWQgPSBkYXRhLmZpeGVkIHx8IGZhbHNlO1xuICAgIHRoaXMub2Jzb2xldGUgPSBkYXRhLm9ic29sZXRlO1xuICAgIHRoaXMubG9naWMgPSBkYXRhLmxvZ2ljID8/IFRSQUNLO1xuICB9XG5cbiAgZ2V0IGMoKTogQ29uZGl0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5pZCBhcyBDb25kaXRpb247XG4gIH1cblxuICBnZXQgcigpOiBSZXF1aXJlbWVudC5TaW5nbGUge1xuICAgIHJldHVybiBbW3RoaXMuaWQgYXMgQ29uZGl0aW9uXV07XG4gIH1cblxuICBnZXQgZGVidWcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMywgJzAnKSArICcgJyArIHRoaXMubmFtZTtcbiAgfVxuXG4gIGdldCBpdGVtKCk6IEl0ZW0ge1xuICAgIGlmICh0aGlzLmlkIDwgMHgxMDAgfHwgdGhpcy5pZCA+IDB4MTdmKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBhIHNsb3Q6ICR7dGhpcy5pZH1gKTtcbiAgICB9XG4gICAgY29uc3QgaXRlbUdldElkID0gdGhpcy5mbGFncy5yb20uc2xvdHNbdGhpcy5pZCAmIDB4ZmZdO1xuICAgIGNvbnN0IGl0ZW1JZCA9IHRoaXMuZmxhZ3Mucm9tLml0ZW1HZXRzW2l0ZW1HZXRJZF0uaXRlbUlkO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmZsYWdzLnJvbS5pdGVtc1tpdGVtSWRdO1xuICAgIGlmICghaXRlbSkgdGhyb3cgbmV3IEVycm9yKGBubyBpdGVtYCk7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbn1cblxuZnVuY3Rpb24gb2Jzb2xldGUob2Jzb2xldGU6IG51bWJlciB8ICgoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyKSk6IEZsYWcge1xuICBpZiAodHlwZW9mIG9ic29sZXRlID09PSAnbnVtYmVyJykgb2Jzb2xldGUgPSAobyA9PiAoKSA9PiBvKShvYnNvbGV0ZSk7XG4gIHJldHVybiB7b2Jzb2xldGUsIFtGTEFHXTogdHJ1ZX0gYXMgYW55O1xufVxuZnVuY3Rpb24gZml4ZWQoaWQ6IG51bWJlciwgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtpZCwgZml4ZWQ6IHRydWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIHRyYWNrZWQoaWQ6IG51bWJlcik6IEZsYWcge1xuICByZXR1cm4gZml4ZWQoaWQsIFRSQUNLKTtcbn1cbmZ1bmN0aW9uIG1vdmFibGUoaWQ6IG51bWJlciwgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtpZCwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gZGlhbG9nUHJvZ3Jlc3Npb24obmFtZTogc3RyaW5nLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge25hbWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGRpYWxvZ1RvZ2dsZShuYW1lOiBzdHJpbmcsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7bmFtZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuXG5mdW5jdGlvbiBwc2V1ZG8ob3duZXI6IG9iamVjdCk6IEZsYWcge1xuICBjb25zdCBpZCA9IHBzZXVkb0NvdW50ZXIuZ2V0KG93bmVyKSB8fCAweDQwMDtcbiAgcHNldWRvQ291bnRlci5zZXQob3duZXIsIGlkICsgMSk7XG4gIHJldHVybiB7aWQsIFtGTEFHXTogdHJ1ZSwgbG9naWM6IFRSQUNLfSBhcyBhbnk7XG59XG5jb25zdCBwc2V1ZG9Db3VudGVyID0gbmV3IFdlYWtNYXA8b2JqZWN0LCBudW1iZXI+KCk7XG5cbi8vIG9ic29sZXRlIGZsYWdzIC0gZGVsZXRlIHRoZSBzZXRzIChzaG91bGQgbmV2ZXIgYmUgYSBjbGVhcilcbi8vICAgICAgICAgICAgICAgIC0gcmVwbGFjZSB0aGUgY2hlY2tzIHdpdGggdGhlIHJlcGxhY2VtZW50XG5cbi8vIC0tLSBtYXliZSBvYnNvbGV0ZSBmbGFncyBjYW4gaGF2ZSBkaWZmZXJlbnQgcmVwbGFjZW1lbnRzIGluXG4vLyAgICAgZGlmZmVyZW50IGNvbnRleHRzP1xuLy8gLS0tIGluIHBhcnRpY3VsYXIsIGl0ZW1nZXRzIHNob3VsZG4ndCBjYXJyeSAxeHggZmxhZ3M/XG5cblxuLyoqIFRyYWNrcyB1c2VkIGFuZCB1bnVzZWQgZmxhZ3MuICovXG5leHBvcnQgY2xhc3MgRmxhZ3Mge1xuXG4gIFtpZDogbnVtYmVyXTogRmxhZztcblxuICAvLyAwMHhcbiAgMHgwMDAgPSBmaXhlZCgweDAwMCwgRkFMU0UpO1xuICAweDAwMSA9IGZpeGVkKDB4MDAxKTtcbiAgMHgwMDIgPSBmaXhlZCgweDAwMik7XG4gIDB4MDAzID0gZml4ZWQoMHgwMDMpO1xuICAweDAwNCA9IGZpeGVkKDB4MDA0KTtcbiAgMHgwMDUgPSBmaXhlZCgweDAwNSk7XG4gIDB4MDA2ID0gZml4ZWQoMHgwMDYpO1xuICAweDAwNyA9IGZpeGVkKDB4MDA3KTtcbiAgMHgwMDggPSBmaXhlZCgweDAwOCk7XG4gIDB4MDA5ID0gZml4ZWQoMHgwMDkpO1xuICBVc2VkV2luZG1pbGxLZXkgPSBmaXhlZCgweDAwYSwgVFJBQ0spO1xuICAweDAwYiA9IG9ic29sZXRlKDB4MTAwKTsgLy8gY2hlY2s6IHN3b3JkIG9mIHdpbmQgLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAwYyA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiB2aWxsYWdlcicpO1xuICBMZWFmVmlsbGFnZXJzUmVzY3VlZCA9IG1vdmFibGUoMHgwMGQpO1xuICAweDAwZSA9IG9ic29sZXRlKChzKSA9PiB7XG4gICAgaWYgKHMudHJpZ2dlcj8uaWQgPT09IDB4ODUpIHJldHVybiAweDE0MzsgLy8gY2hlY2s6IHRlbGVwYXRoeSAvIHN0b21cbiAgICByZXR1cm4gMHgyNDM7IC8vIGl0ZW06IHRlbGVwYXRoeVxuICB9KTtcbiAgV29rZVdpbmRtaWxsR3VhcmQgPSBtb3ZhYmxlKDB4MDBmLCBUUkFDSyk7XG5cbiAgLy8gMDF4XG4gIFR1cm5lZEluS2lyaXNhUGxhbnQgPSBtb3ZhYmxlKDB4MDEwKTtcbiAgMHgwMTEgPSBkaWFsb2dQcm9ncmVzc2lvbignV2VsY29tZWQgdG8gQW1hem9uZXMnKTtcbiAgMHgwMTIgPSBkaWFsb2dQcm9ncmVzc2lvbignVHJlYXN1cmUgaHVudGVyIGRlYWQnKTtcbiAgMHgwMTMgPSBvYnNvbGV0ZSgweDEzOCk7IC8vIGNoZWNrOiBicm9rZW4gc3RhdHVlIC8gc2FiZXJhIDFcbiAgLy8gdW51c2VkIDAxNCwgMDE1XG4gIDB4MDE2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1BvcnRvYSBxdWVlbiBSYWdlIGhpbnQnKTtcbiAgMHgwMTcgPSBvYnNvbGV0ZSgweDEwMik7IC8vIGNoZXN0OiBzd29yZCBvZiB3YXRlclxuICBFbnRlcmVkVW5kZXJncm91bmRDaGFubmVsID0gbW92YWJsZSgweDAxOCwgVFJBQ0spO1xuICAweDAxOSA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIHRpcmVkIG9mIHRhbGtpbmcnKTtcbiAgMHgwMWEgPSBkaWFsb2dQcm9ncmVzc2lvbignSW5pdGlhbCB0YWxrIHdpdGggUG9ydG9hIHF1ZWVuJyk7XG4gIE1lc2lhUmVjb3JkaW5nID0gbW92YWJsZSgweDAxYiwgVFJBQ0spO1xuICAweDAxYyA9IG9ic29sZXRlKDB4MTEwKTsgLy8gaXRlbTogbWlycm9yZWQgc2hpZWxkXG4gIFRhbGtlZFRvRm9ydHVuZVRlbGxlciA9IG1vdmFibGUoMHgxZCwgVFJBQ0spO1xuICBRdWVlblJldmVhbGVkID0gbW92YWJsZSgweDAxZSwgVFJBQ0spO1xuICAweDAxZiA9IG9ic29sZXRlKDB4MTA5KTsgLy8gY2hlY2s6IHJhZ2VcblxuICAvLyAwMnhcbiAgUXVlZW5Ob3RJblRocm9uZVJvb20gPSBtb3ZhYmxlKDB4MDIwLCBUUkFDSyk7XG4gIFJldHVybmVkRm9nTGFtcCA9IG1vdmFibGUoMHgwMjEsIFRSQUNLKTtcbiAgMHgwMjIgPSBkaWFsb2dQcm9ncmVzc2lvbignU2FoYXJhIGVsZGVyJyk7XG4gIDB4MDIzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NhaGFyYSBlbGRlciBkYXVnaHRlcicpO1xuICAweDAyNCA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgMHgwMjUgPSBvYnNvbGV0ZSgweDEzNik7IC8vIGhlYWxlZCBkb2xwaGluXG4gIDB4MDI2ID0gb2Jzb2xldGUoMHgyZmQpOyAvLyB3YXJwOiBzaHlyb25cbiAgU2h5cm9uTWFzc2FjcmUgPSBmaXhlZCgweDAyNywgVFJBQ0spOyAvLyBwcmVzaHVmZmxlIGhhcmRjb2RlcyBmb3IgZGVhZCBzcHJpdGVzXG4gIENoYW5nZVdvbWFuID0gZml4ZWQoMHgwMjgpOyAvLyBoYXJkY29kZWQgaW4gb3JpZ2luYWwgcm9tXG4gIENoYW5nZUFrYWhhbmEgPSBmaXhlZCgweDAyOSk7XG4gIENoYW5nZVNvbGRpZXIgPSBmaXhlZCgweDAyYSk7XG4gIENoYW5nZVN0b20gPSBmaXhlZCgweDAyYik7XG4gIC8vIHVudXNlZCAwMmNcbiAgMHgwMmQgPSBkaWFsb2dQcm9ncmVzc2lvbignU2h5cm9uIHNhZ2VzJyk7XG4gIDB4MDJlID0gb2Jzb2xldGUoMHgxMmQpOyAvLyBjaGVjazogZGVvJ3MgcGVuZGFudFxuICBVc2VkQm93T2ZUcnV0aCA9IGZpeGVkKDB4MDJmKTsgIC8vIG1vdmVkIGZyb20gMDg2IGluIHByZXBhcnNlXG5cbiAgLy8gMDN4XG4gIC8vIHVudXNlZCAwMzBcbiAgMHgwMzEgPSBkaWFsb2dQcm9ncmVzc2lvbignWm9tYmllIHRvd24nKTtcbiAgMHgwMzIgPSBvYnNvbGV0ZSgweDEzNyk7IC8vIGNoZWNrOiBleWUgZ2xhc3Nlc1xuICAvLyB1bnVzZWQgMDMzXG4gIDB4MDM0ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FrYWhhbmEgaW4gd2F0ZXJmYWxsIGNhdmUnKTsgLy8gPz8/XG4gIEN1cmVkQWthaGFuYSA9IG1vdmFibGUoMHgwMzUsIFRSQUNLKTtcbiAgMHgwMzYgPSBkaWFsb2dQcm9ncmVzc2lvbignQWthaGFuYSBTaHlyb24nKTtcbiAgMHgwMzcgPSBvYnNvbGV0ZSgweDE0Mik7IC8vIGNoZWNrOiBwYXJhbHlzaXNcbiAgTGVhZkFiZHVjdGlvbiA9IG1vdmFibGUoMHgwMzgsIFRSQUNLKTsgLy8gb25lLXdheSBsYXRjaFxuICAweDAzOSA9IG9ic29sZXRlKDB4MTQxKTsgLy8gY2hlY2s6IHJlZnJlc2hcbiAgVGFsa2VkVG9aZWJ1SW5DYXZlID0gbW92YWJsZSgweDAzYSwgVFJBQ0spO1xuICBUYWxrZWRUb1plYnVJblNoeXJvbiA9IG1vdmFibGUoMHgwM2IsIFRSQUNLKTtcbiAgMHgwM2MgPSBvYnNvbGV0ZSgweDEzYik7IC8vIGNoZXN0OiBsb3ZlIHBlbmRhbnRcbiAgMHgwM2QgPSBkaWFsb2dQcm9ncmVzc2lvbignQXNpbmEgaW4gU2h5cm9uIHRlbXBsZScpO1xuICBGb3VuZEtlbnN1SW5EYW5jZUhhbGwgPSBtb3ZhYmxlKDB4MDNlLCBUUkFDSyk7XG4gIDB4MDNmID0gb2Jzb2xldGUoKHMpID0+IHtcbiAgICBpZiAocy50cmlnZ2VyPy5pZCA9PT0gMHhiYSkgcmV0dXJuIDB4MjQ0IC8vIGl0ZW06IHRlbGVwb3J0XG4gICAgcmV0dXJuIDB4MTQ0OyAvLyBjaGVjazogdGVsZXBvcnRcbiAgfSk7XG5cbiAgLy8gMDR4XG4gIDB4MDQwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvcm5lbCBpbiBTaHlyb24gdGVtcGxlJyk7XG4gIDB4MDQxID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIC8vIHVudXNlZCAwNDJcbiAgLy8gdW51c2VkIDB4MDQzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09haycpO1xuICAweDA0NCA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICBSZXNjdWVkQ2hpbGQgPSBmaXhlZCgweDA0NSwgVFJBQ0spOyAvLyBoYXJkY29kZWQgJDNlN2Q1XG4gIFVzZWRJbnNlY3RGbHV0ZSA9IGZpeGVkKDB4MDQ2KTsgLy8gY3VzdG9tLWFkZGVkICQ2NDg4OjQwXG4gIFJlc2N1ZWRMZWFmRWxkZXIgPSBtb3ZhYmxlKDB4MDQ3KTtcbiAgMHgwNDggPSBkaWFsb2dQcm9ncmVzc2lvbignVHJlYXN1cmUgaHVudGVyIGVtYmFya2VkJyk7XG4gIDB4MDQ5ID0gb2Jzb2xldGUoMHgxMDEpOyAvLyBjaGVjazogc3dvcmQgb2YgZmlyZVxuICAweDA0YSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdCb2F0IG93bmVyJyk7XG4gIDB4MDRiID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gc2ljayBtZW4nKTtcbiAgMHgwNGMgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiB0cmFpbmluZyBtZW4gMScpO1xuICAweDA0ZCA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHRyYWluaW5nIG1lbiAyJyk7XG4gIDB4MDRlID0gb2Jzb2xldGUoMHgxMDYpOyAvLyBjaGVzdDogdG9ybmFkbyBicmFjZWxldFxuICAweDA0ZiA9IG9ic29sZXRlKDB4MTJiKTsgLy8gY2hlY2s6IHdhcnJpb3IgcmluZ1xuXG4gIC8vIDA1eFxuICBHaXZlblN0YXR1ZVRvQWthaGFuYSA9IG1vdmFibGUoMHgwNTApOyAvLyBnaXZlIGl0IGJhY2sgaWYgdW5zdWNjZXNzZnVsP1xuICAweDA1MSA9IG9ic29sZXRlKDB4MTQ2KTsgLy8gY2hlY2s6IGJhcnJpZXIgLyBhbmdyeSBzZWFcbiAgVGFsa2VkVG9Ed2FyZk1vdGhlciA9IG1vdmFibGUoMHgwNTIsIFRSQUNLKTtcbiAgTGVhZGluZ0NoaWxkID0gZml4ZWQoMHgwNTMsIFRSQUNLKTsgLy8gaGFyZGNvZGVkICQzZTdjNCBhbmQgZm9sbG93aW5nXG4gIC8vIHVudXNlZCAwNTRcbiAgMHgwNTUgPSBkaWFsb2dQcm9ncmVzc2lvbignWmVidSByZXNjdWVkJyk7XG4gIDB4MDU2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvcm5lbCByZXNjdWVkJyk7XG4gIDB4MDU3ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FzaW5hIHJlc2N1ZWQnKTtcbiAgLy8gdW51c2VkIDA1OCAuLiAwNWFcbiAgTXRTYWJyZUd1YXJkc0Rlc3Bhd25lZCA9IG1vdmFibGUoMHgwNWIsIFRSVUUpO1xuICAvLyB1bnVzZWQgMDVjLCAwNWRcbiAgMHgwNWUgPSBvYnNvbGV0ZSgweDI4ZCk7IC8vIGRyYXlnb24gMlxuICAweDA1ZiA9IG9ic29sZXRlKDB4MjAzKTsgLy8gaXRlbTogc3dvcmQgb2YgdGh1bmRlclxuICAvLyBUT0RPIC0gZml4IHVwIHRoZSBOUEMgc3Bhd24gYW5kIHRyaWdnZXIgY29uZGl0aW9ucyBpbiBTaHlyb24uXG4gIC8vIE1heWJlIGp1c3QgcmVtb3ZlIHRoZSBjdXRzY2VuZSBlbnRpcmVseT9cblxuICAvLyAwNnhcbiAgLy8gdW51c2VkIDA2MFxuICBUYWxrZWRUb1N0b21JblN3YW4gPSBtb3ZhYmxlKDB4MDYxLCBUUkFDSyk7XG4gIDB4MDYyID0gb2Jzb2xldGUoMHgxNTEpOyAvLyBjaGVzdDogc2FjcmVkIHNoaWVsZFxuICAweDA2MyA9IG9ic29sZXRlKDB4MTQ3KTsgLy8gY2hlY2s6IGNoYW5nZVxuICAvLyB1bnVzZWQgMDY0XG4gIC8vIFN3YW5HYXRlT3BlbmVkID0gbW92YWJsZSh+MHgwNjQpOyAvLyB3aHkgd291bGQgd2UgYWRkIHRoaXM/IHVzZSAyYjNcbiAgQ3VyZWRLZW5zdSA9IG1vdmFibGUoMHgwNjUsIFRSQUNLKTtcbiAgLy8gdW51c2VkIDA2NlxuICAweDA2NyA9IG9ic29sZXRlKDB4MTBiKTsgLy8gY2hlY2s6IGJhbGwgb2YgdGh1bmRlciAvIG1hZG8gMVxuICAweDA2OCA9IG9ic29sZXRlKDB4MTA0KTsgLy8gY2hlY2s6IGZvcmdlZCBjcnlzdGFsaXNcbiAgLy8gdW51c2VkIDA2OVxuICBTdG9uZWRQZW9wbGVDdXJlZCA9IG1vdmFibGUoMHgwNmEsIFRSQUNLKTtcbiAgLy8gdW51c2VkIDA2YlxuICAweDA2YyA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAvLyB1bnVzZWQgMDZkIC4uIDA2ZlxuICBDdXJyZW50bHlSaWRpbmdEb2xwaGluID0gZml4ZWQofjB4MDZlLCBUUkFDSyk7IC8vLCB7IC8vIE5PVEU6IGFkZGVkIGJ5IHJhbmRvXG4gIC8vICAgYWxpYXM6IHJvbSA9PiBbcm9tLml0ZW1zLlNoZWxsRmx1dGUuaXRlbVVzZURhdGFbMF0ud2FudF0sXG4gIC8vIH0pO1xuXG4gIC8vIDA3eFxuICBQYXJhbHl6ZWRLZW5zdUluVGF2ZXJuID0gZml4ZWQoMHgwNzApOyAvLywgeyAvLyBoYXJkY29kZWQgaW4gcmFuZG8gcHJlc2h1ZmZsZS5zXG4gIC8vICAgYWxpYXM6IHJvbSA9PiBbcm9tLmZsYWdzLlBhcmFseXNpcy5pZF0sXG4gIC8vIH0pO1xuICBQYXJhbHl6ZWRLZW5zdUluRGFuY2VIYWxsID0gZml4ZWQoMHgwNzEpOyAvLywgeyAvLyBoYXJkY29kZWQgaW4gcmFuZG8gcHJlc2h1ZmZsZS5zXG4gIC8vICAgYWxpYXM6IHJvbSA9PiBbcm9tLmZsYWdzLlBhcmFseXNpcy5pZF0sXG4gIC8vIH0pO1xuICBGb3VuZEtlbnN1SW5UYXZlcm4gPSBtb3ZhYmxlKDB4MDcyLCBUUkFDSyk7XG4gIDB4MDczID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N0YXJ0bGVkIG1hbiBpbiBMZWFmJyk7XG4gIC8vIHVudXNlZCAwNzRcbiAgMHgwNzUgPSBvYnNvbGV0ZSgweDEzOSk7IC8vIGNoZWNrOiBnbG93aW5nIGxhbXBcbiAgMHgwNzYgPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgaW4gR29hJyk7XG4gIDB4MDc3ID0gb2Jzb2xldGUoMHgxMDgpOyAvLyBjaGVjazogZmxhbWUgYnJhY2VsZXQgLyBrZWxiZXNxdWUgMVxuICAweDA3OCA9IG9ic29sZXRlKDB4MTBjKTsgLy8gY2hlc3Q6IHN0b3JtIGJyYWNlbGV0XG4gIDB4MDc5ID0gb2Jzb2xldGUoMHgxNDApOyAvLyBjaGVjazogYm93IG9mIHRydXRoXG4gIDB4MDdhID0gb2Jzb2xldGUoMHgxMGEpOyAvLyBjaGVzdDogYmxpenphcmQgYnJhY2VsZXRcbiAgMHgwN2IgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIHJhZ2UvYmFsbCBvZiB3YXRlclxuICAvLyB1bnVzZWQgMDdiLCAwN2NcbiAgMHgwN2QgPSBvYnNvbGV0ZSgweDEzZik7IC8vIGNoZXN0OiBib3cgb2Ygc3VuXG4gIDB4MDdlID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ010IFNhYnJlIGd1YXJkcyAxJyk7XG4gIDB4MDdmID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ010IFNhYnJlIGd1YXJkcyAyJyk7XG5cbiAgQWxhcm1GbHV0ZVVzZWRPbmNlID0gZml4ZWQoMHg3Nik7IC8vIGhhcmRjb2RlZDogcHJlc2h1ZmZsZS5zIFBhdGNoVHJhZGVJbkl0ZW1cbiAgRmx1dGVPZkxpbWVVc2VkT25jZSA9IGZpeGVkKDB4NzcpOyAvLyBoYXJkY29kZWQ6IHByZXNodWZmbGUucyBQYXRjaFRyYWRlSW5JdGVtXG5cbiAgLy8gMDh4XG4gIC8vIHVudXNlZCAwODAsIDA4MVxuICAweDA4MiA9IG9ic29sZXRlKDB4MTQwKTsgLy8gY2hlY2s6IGJvdyBvZiB0cnV0aCAvIGF6dGVjYVxuICAweDA4MyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdSZXNjdWVkIExlYWYgZWxkZXInKTtcbiAgTGVhZlZpbGxhZ2Vyc0N1cnJlbnRseUFiZHVjdGVkID0gbW92YWJsZSgweDA4NCk7XG4gIExlYWZFbGRlckN1cnJlbnRseUFiZHVjdGVkID0gbW92YWJsZSgweDA4NSk7XG4gIC8vVXNlZEJvd09mVHJ1dGggPSBtb3ZhYmxlKDB4MDg2KTsgIC8vIG1vdmVkIG1hbnVhbGx5IGF0IHByZXBhcnNlIHRvIDJmXG4gIDB4MDg3ID0gb2Jzb2xldGUoMHgxMDUpOyAvLyBjaGVzdDogYmFsbCBvZiB3aW5kXG4gIDB4MDg4ID0gb2Jzb2xldGUoMHgxMzIpOyAvLyBjaGVjazogd2luZG1pbGwga2V5XG4gIDB4MDg5ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU3RvbVxcJ3MgZ2lybGZyaWVuZCcpO1xuICAweDA4YSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFN0b20nKTtcbiAgMHgwOGIgPSBvYnNvbGV0ZSgweDIzNik7IC8vIGl0ZW06IHNoZWxsIGZsdXRlXG4gIC8vIHVudXNlZCAweDA4YyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTd2FuIGd1YXJkcyBkZXNwYXduZWQnKTtcbiAgMHgwOGQgPSBvYnNvbGV0ZSgweDEzNyk7IC8vIGNoZWNrOiBleWUgZ2xhc3Nlc1xuICAvLyB1bnVzZWQgMDhlXG4gIDB4MDhmID0gb2Jzb2xldGUoMHgyODMpOyAvLyBldmVudDogY2FsbWVkIHNlYVxuXG4gIC8vIDA5eFxuICAweDA5MCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTdG9uZWQgcGVvcGxlIGdvbmUnKTtcbiAgLy8gdW51c2VkIDA5MVxuICAweDA5MiA9IG9ic29sZXRlKDB4MTI4KTsgLy8gY2hlY2s6IGZsdXRlIG9mIGxpbWVcbiAgLy8gdW51c2VkIDA5MyAuLiAwOTVcbiAgMHgwOTYgPSBkaWFsb2dUb2dnbGUoJ0xlYWYgZWxkZXIgZGF1Z2h0ZXInKTtcbiAgMHgwOTcgPSBkaWFsb2dUb2dnbGUoJ0xlYWYgdmlsbGFnZXInKTtcbiAgMHgwOTggPSBkaWFsb2dQcm9ncmVzc2lvbignTmFkYXJlIHZpbGxhZ2VyJyk7XG4gIC8vIHVudXNlZCAwOTksIDA5YVxuICBBYmxlVG9SaWRlRG9scGhpbiA9IG1vdmFibGUoMHgwOWIsIFRSQUNLKTtcbiAgUG9ydG9hUXVlZW5Hb2luZ0F3YXkgPSBtb3ZhYmxlKDB4MDljKTtcbiAgLy8gdW51c2VkIDA5ZCAuLiAwOWZcblxuICAvLyAwYXhcbiAgMHgwYTAgPSBvYnNvbGV0ZSgweDEyNyk7IC8vIGNoZWNrOiBpbnNlY3QgZmx1dGVcbiAgLy8gdW51c2VkIDBhMSwgMGEyXG4gIDB4MGEzID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4vZm9ydHVuZSB0ZWxsZXInKTtcbiAgV29rZUtlbnN1SW5MaWdodGhvdXNlID0gbW92YWJsZSgweDBhNCwgVFJBQ0spO1xuICAvLyBUT0RPOiB0aGlzIG1heSBub3QgYmUgb2Jzb2xldGUgaWYgdGhlcmUncyBubyBpdGVtIGhlcmU/XG4gIDB4MGE1ID0gb2Jzb2xldGUoMHgxMzEpOyAvLyBjaGVjazogYWxhcm0gZmx1dGUgLyB6ZWJ1IHN0dWRlbnRcbiAgLy8gTk9URTogbWFyayB0aGUgb2FrIGVsZGVyIHByb2dyZXNzaW9uIGFzIGFzc3VtZWQgZmFsc2UgYmVjYXVzZSBvdGhlcndpc2VcbiAgLy8gaWYgdGhleSdyZSBpZ25vcmVkIHRoZSBsb2dpYyB0aGlua3MgdGhlIGVsZGVyJ3MgaXRlbSBpcyBmcmVlIChpZiB0aGVzZVxuICAvLyB3ZXJlIHRyYWNrZWQsIHdlJ2QgcmVhbGl6ZSBpdCdzIGNvbmRpdGlvbmFsIG9uIGFscmVhZHkgaGF2aW5nIHRoZSBpdGVtKS5cbiAgMHgwYTYgPSBkaWFsb2dQcm9ncmVzc2lvbignT2FrIGVsZGVyIDEnLCBGQUxTRSk7XG4gIDB4MGE3ID0gZGlhbG9nVG9nZ2xlKCdTd2FuIGRhbmNlcicpO1xuICAweDBhOCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsgZWxkZXIgMicsIEZBTFNFKTtcbiAgVGFsa2VkVG9MZWFmUmFiYml0ID0gbW92YWJsZSgweDBhOSwgVFJBQ0spO1xuICAweDBhYSA9IG9ic29sZXRlKDB4MTFkKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBhYiA9IG9ic29sZXRlKDB4MTUwKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAvLyB1bnVzZWQgMGFjXG4gIDB4MGFkID0gb2Jzb2xldGUoMHgxNTIpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFlID0gb2Jzb2xldGUoMHgxNTMpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFmID0gb2Jzb2xldGUoMHgxNTQpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuXG4gIC8vIDBieFxuICAweDBiMCA9IG9ic29sZXRlKDB4MTU1KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiMSA9IG9ic29sZXRlKDB4MTU2KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiMiA9IG9ic29sZXRlKDB4MTU3KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiMyA9IG9ic29sZXRlKDB4MTU4KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYjQgPSBvYnNvbGV0ZSgweDE1OSk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjUgPSBvYnNvbGV0ZSgweDE1YSk7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuICAweDBiNiA9IG9ic29sZXRlKDB4MTFmKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI3ID0gb2Jzb2xldGUoMHgxNWMpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjggPSBvYnNvbGV0ZSgweDE1ZCk7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiOSA9IG9ic29sZXRlKDB4MTFlKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJhID0gb2Jzb2xldGUoMHgxNWUpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmIgPSBvYnNvbGV0ZSgweDE1Zik7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYyA9IG9ic29sZXRlKDB4MTYwKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJkID0gb2Jzb2xldGUoMHgxMjApOyAvLyBjaGVzdDogZnJ1aXQgb2YgbGltZVxuICAweDBiZSA9IG9ic29sZXRlKDB4MTIxKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGJmID0gb2Jzb2xldGUoMHgxNjIpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcblxuICAvLyAwY3hcbiAgMHgwYzAgPSBvYnNvbGV0ZSgweDE2Myk7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBjMSA9IG9ic29sZXRlKDB4MTY0KTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGMyID0gb2Jzb2xldGUoMHgxMjIpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjMyA9IG9ic29sZXRlKDB4MTY1KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzQgPSBvYnNvbGV0ZSgweDE2Nik7IC8vIGNoZXN0OiBmcnVpdCBvZiByZXB1blxuICAweDBjNSA9IG9ic29sZXRlKDB4MTZiKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzYgPSBvYnNvbGV0ZSgweDE2Yyk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGM3ID0gb2Jzb2xldGUoMHgxMjMpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcmVwdW5cbiAgMHgwYzggPSBvYnNvbGV0ZSgweDEyNCk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGM5ID0gb2Jzb2xldGUoMHgxNmEpOyAvLyBjaGVzdDogd2FycCBib290c1xuICAweDBjYSA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgMHgwY2IgPSBvYnNvbGV0ZSgweDEyYSk7IC8vIGNoZXN0OiBwb3dlciByaW5nXG4gIDB4MGNjID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIDB4MGNkID0gb2Jzb2xldGUoMHgxMTQpOyAvLyBjaGVzdDogcHN5Y2hvIHNoaWVsZFxuICAweDBjZSA9IG9ic29sZXRlKDB4MTI1KTsgLy8gY2hlc3Q6IHN0YXR1ZSBvZiBvbnl4XG4gIDB4MGNmID0gb2Jzb2xldGUoMHgxMzMpOyAvLyBjaGVzdDoga2V5IHRvIHByaXNvblxuICBcbiAgLy8gMGR4XG4gIDB4MGQwID0gb2Jzb2xldGUoMHgxMjgpOyAvLyBjaGVjazogZmx1dGUgb2YgbGltZSAvIHF1ZWVuXG4gIDB4MGQxID0gb2Jzb2xldGUoMHgxMzUpOyAvLyBjaGVzdDogZm9nIGxhbXBcbiAgMHgwZDIgPSBvYnNvbGV0ZSgweDE2OSk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGQzID0gb2Jzb2xldGUoMHgxMjYpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwZDQgPSBvYnNvbGV0ZSgweDE1Yik7IC8vIGNoZXN0OiBmbHV0ZSBvZiBsaW1lXG4gIDB4MGQ1ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMScpO1xuICAweDBkNiA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDInKTtcbiAgMHgwZDcgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAzJyk7XG4gIDB4MGQ4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0tlbnN1IHJlc2N1ZWQnKTtcbiAgMHgwZDkgPSBkaWFsb2dUb2dnbGUoJ1N0b25lZCBwYWlyJyk7XG4gIDB4MGRhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0tlbnN1IGdvbmUgZnJvbSB0YXZlcm4nKTtcbiAgMHgwZGIgPSBkaWFsb2dUb2dnbGUoJ0luIFNhYmVyYVxcJ3MgdHJhcCcpO1xuICAweDBkYyA9IG9ic29sZXRlKDB4MTZmKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwZGQgPSBvYnNvbGV0ZSgweDE3MCk7IC8vIG1pbWljPz8gbWVkaWNhbCBoZXJiPz9cbiAgMHgwZGUgPSBvYnNvbGV0ZSgweDEyYyk7IC8vIGNoZXN0OiBpcm9uIG5lY2tsYWNlXG4gIDB4MGRmID0gb2Jzb2xldGUoMHgxMWIpOyAvLyBjaGVzdDogYmF0dGxlIGFybW9yXG5cbiAgLy8gMGV4XG4gIDB4MGUwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgQWthaGFuYScpO1xuICAvLyB1bnVzZWQgMGUxIC4uIDBlM1xuICAweDBlNCA9IG9ic29sZXRlKDB4MTNjKTsgLy8gY2hlc3Q6IGtpcmlzYSBwbGFudFxuICAweDBlNSA9IG9ic29sZXRlKDB4MTZlKTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwZTYgPSBvYnNvbGV0ZSgweDE2ZCk7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBlNyA9IG9ic29sZXRlKDB4MTJmKTsgLy8gY2hlc3Q6IGxlYXRoZXIgYm9vdHNcbiAgMHgwZTggPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTaHlyb24gdmlsbGFnZXInKTtcbiAgMHgwZTkgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTaHlyb24gZ3VhcmQnKTtcbiAgMHgwZWEgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAxJyk7XG4gIDB4MGViID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMicpO1xuICAweDBlYyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDMnKTtcbiAgMHgwZWQgPSBkaWFsb2dQcm9ncmVzc2lvbignTWVzaWEnKTtcbiAgLy8gdW51c2VkIDBlZSAuLiAwZmZcbiAgVGFsa2VkVG9aZWJ1U3R1ZGVudCA9IG1vdmFibGUoMHgwZWUsIFRSQUNLKTtcblxuICAvLyAxMDBcbiAgMHgxMDAgPSBvYnNvbGV0ZSgweDEyZSk7IC8vIGNoZWNrOiByYWJiaXQgYm9vdHMgLyB2YW1waXJlXG4gIDB4MTAxID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIDB4MTAyID0gb2Jzb2xldGUoMHgxMDgpOyAvLyBjaGVjazogZmxhbWUgYnJhY2VsZXQgLyBrZWxiZXNxdWUgMVxuICAweDEwMyA9IG9ic29sZXRlKDB4MTA5KTsgLy8gY2hlY2s6IGJhbGwgb2Ygd2F0ZXIgLyByYWdlXG4gIC8vIHVudXNlZCAxMDRcbiAgMHgxMDUgPSBvYnNvbGV0ZSgweDEyNik7IC8vIGNoZWNrOiBvcGVsIHN0YXR1ZSAvIGtlbGJlc3F1ZSAyXG4gIDB4MTA2ID0gb2Jzb2xldGUoMHgxMjMpOyAvLyBjaGVjazogZnJ1aXQgb2YgcmVwdW4gLyBzYWJlcmEgMlxuICAweDEwNyA9IG9ic29sZXRlKDB4MTEyKTsgLy8gY2hlY2s6IHNhY3JlZCBzaGllbGQgLyBtYWRvIDJcbiAgMHgxMDggPSBvYnNvbGV0ZSgweDEzZCk7IC8vIGNoZWNrOiBpdm9yeSBzdGF0dWUgLyBrYXJtaW5lXG4gIFVzZWRCb3dPZk1vb24gPSBtb3ZhYmxlKDB4MTA5KTtcbiAgVXNlZEJvd09mU3VuID0gbW92YWJsZSgweDEwYSk7XG4gIDB4MTBiID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIDB4MTBjID0gb2Jzb2xldGUoMHgxNjEpOyAvLyBjaGVjazogZnJ1aXQgb2YgcG93ZXIgLyB2YW1waXJlIDJcblxuICAvLyAxMDAgLi4gMTdmID0+IGZpeGVkIGZsYWdzIGZvciBjaGVja3MuXG5cbiAgLy8gVE9ETyAtIGFyZSB0aGVzZSBhbGwgVFJBQ0sgb3IganVzdCB0aGUgbm9uLWNoZXN0cz8hP1xuXG4gIC8vIFRPRE8gLSBiYXNpYyBpZGVhIC0gTlBDIGhpdGJveCBleHRlbmRzIGRvd24gb25lIHRpbGU/IChpcyB0aGF0IGVub3VnaD8pXG4gIC8vICAgICAgLSBzdGF0dWVzIGNhbiBiZSBlbnRlcmVkIGJ1dCBub3QgZXhpdGVkP1xuICAvLyAgICAgIC0gdXNlIHRyaWdnZXIgKHwgcGFyYWx5c2lzIHwgZ2xpdGNoKSBmb3IgbW92aW5nIHN0YXR1ZXM/XG4gIC8vICAgICAgICAgIC0+IGdldCBub3JtYWwgcmVxdWlyZW1lbnRzIGZvciBmcmVlXG4gIC8vICAgICAgICAgIC0+IGJldHRlciBoaXRib3g/ICBhbnkgd2F5IHRvIGdldCBxdWVlbiB0byB3b3JrPyB0b28gbXVjaCBzdGF0ZT9cbiAgLy8gICAgICAgICAgICAgbWF5IG5lZWQgdG8gaGF2ZSB0d28gZGlmZmVyZW50IHRocm9uZSByb29tcz8gKGZ1bGwvZW1wdHkpXG4gIC8vICAgICAgICAgICAgIGFuZCBoYXZlIGZsYWcgc3RhdGUgYWZmZWN0IGV4aXQ/Pz9cbiAgLy8gICAgICAtIGF0IHRoZSB2ZXJ5IGxlYXN0IHdlIGNhbiB1c2UgaXQgZm9yIHRoZSBoaXRib3gsIGJ1dCB3ZSBtYXkgc3RpbGxcbiAgLy8gICAgICAgIG5lZWQgY3VzdG9tIG92ZXJsYXk/XG5cbiAgLy8gVE9ETyAtIHBzZXVkbyBmbGFncyBzb21ld2hlcmU/ICBsaWtlIHN3b3JkPyBicmVhayBpcm9uPyBldGMuLi5cblxuICBMZWFmRWxkZXIgPSB0cmFja2VkKH4weDEwMCk7XG4gIE9ha0VsZGVyID0gdHJhY2tlZCh+MHgxMDEpO1xuICBXYXRlcmZhbGxDYXZlU3dvcmRPZldhdGVyQ2hlc3QgPSB0cmFja2VkKH4weDEwMik7XG4gIFN0eHlMZWZ0VXBwZXJTd29yZE9mVGh1bmRlckNoZXN0ID0gdHJhY2tlZCh+MHgxMDMpO1xuICBNZXNpYUluVG93ZXIgPSB0cmFja2VkKDB4MTA0KTtcbiAgU2VhbGVkQ2F2ZUJhbGxPZldpbmRDaGVzdCA9IHRyYWNrZWQofjB4MTA1KTtcbiAgTXRTYWJyZVdlc3RUb3JuYWRvQnJhY2VsZXRDaGVzdCA9IHRyYWNrZWQofjB4MTA2KTtcbiAgR2lhbnRJbnNlY3QgPSB0cmFja2VkKH4weDEwNyk7XG4gIEtlbGJlc3F1ZTEgPSB0cmFja2VkKH4weDEwOCk7XG4gIFJhZ2UgPSB0cmFja2VkKH4weDEwOSk7XG4gIEFyeWxsaXNCYXNlbWVudENoZXN0ID0gdHJhY2tlZCh+MHgxMGEpO1xuICBNYWRvMSA9IHRyYWNrZWQofjB4MTBiKTtcbiAgU3Rvcm1CcmFjZWxldENoZXN0ID0gdHJhY2tlZCh+MHgxMGMpO1xuICBXYXRlcmZhbGxDYXZlUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTEwKTsgLy8gcmFuZG8gY2hhbmdlZCBpbmRleCFcbiAgTWFkbzIgPSB0cmFja2VkKDB4MTEyKTtcbiAgU3R4eVJpZ2h0TWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTE0KTtcbiAgQmF0dGxlQXJtb3JDaGVzdCA9IHRyYWNrZWQoMHgxMWIpO1xuICBEcmF5Z29uMSA9IHRyYWNrZWQoMHgxMWMpO1xuICBTZWFsZWRDYXZlU21hbGxSb29tQmFja0NoZXN0ID0gdHJhY2tlZCgweDExZCk7IC8vIG1lZGljYWwgaGVyYlxuICBTZWFsZWRDYXZlQmlnUm9vbU5vcnRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDExZSk7IC8vIGFudGlkb3RlXG4gIEZvZ0xhbXBDYXZlRnJvbnRDaGVzdCA9IHRyYWNrZWQoMHgxMWYpOyAvLyBseXNpcyBwbGFudFxuICBNdEh5ZHJhUmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxMjApOyAvLyBmcnVpdCBvZiBsaW1lXG4gIFNhYmVyYVVwc3RhaXJzTGVmdENoZXN0ID0gdHJhY2tlZCgweDEyMSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEV2aWxTcGlyaXRJc2xhbmRMb3dlckNoZXN0ID0gdHJhY2tlZCgweDEyMik7IC8vIG1hZ2ljIHJpbmdcbiAgU2FiZXJhMiA9IHRyYWNrZWQoMHgxMjMpOyAvLyBmcnVpdCBvZiByZXB1blxuICBTZWFsZWRDYXZlU21hbGxSb29tRnJvbnRDaGVzdCA9IHRyYWNrZWQoMHgxMjQpOyAvLyB3YXJwIGJvb3RzXG4gIENvcmRlbEdyYXNzID0gdHJhY2tlZCgweDEyNSk7XG4gIEtlbGJlc3F1ZTIgPSB0cmFja2VkKDB4MTI2KTsgLy8gb3BlbCBzdGF0dWVcbiAgT2FrTW90aGVyID0gdHJhY2tlZCgweDEyNyk7XG4gIFBvcnRvYVF1ZWVuID0gdHJhY2tlZCgweDEyOCk7XG4gIEFrYWhhbmFTdGF0dWVPZk9ueXhUcmFkZWluID0gdHJhY2tlZCgweDEyOSk7XG4gIE9hc2lzQ2F2ZUZvcnRyZXNzQmFzZW1lbnRDaGVzdCA9IHRyYWNrZWQoMHgxMmEpO1xuICBCcm9rYWhhbmEgPSB0cmFja2VkKDB4MTJiKTtcbiAgRXZpbFNwaXJpdElzbGFuZFJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDEyYyk7XG4gIERlbyA9IHRyYWNrZWQoMHgxMmQpO1xuICBWYW1waXJlMSA9IHRyYWNrZWQoMHgxMmUpO1xuICBPYXNpc0NhdmVOb3J0aHdlc3RDaGVzdCA9IHRyYWNrZWQoMHgxMmYpO1xuICBBa2FoYW5hRmx1dGVPZkxpbWVUcmFkZWluID0gdHJhY2tlZCgweDEzMCk7XG4gIFplYnVTdHVkZW50ID0gdHJhY2tlZCgweDEzMSk7IC8vIFRPRE8gLSBtYXkgb3B0IGZvciAyIGluIGNhdmUgaW5zdGVhZD9cbiAgV2luZG1pbGxHdWFyZEFsYXJtRmx1dGVUcmFkZWluID0gdHJhY2tlZCgweDEzMik7XG4gIE10U2FicmVOb3J0aEJhY2tPZlByaXNvbkNoZXN0ID0gdHJhY2tlZCgweDEzMyk7XG4gIFplYnVJblNoeXJvbiA9IHRyYWNrZWQoMHgxMzQpO1xuICBGb2dMYW1wQ2F2ZUJhY2tDaGVzdCA9IHRyYWNrZWQoMHgxMzUpO1xuICBJbmp1cmVkRG9scGhpbiA9IHRyYWNrZWQoMHgxMzYpO1xuICBDbGFyayA9IHRyYWNrZWQoMHgxMzcpO1xuICBTYWJlcmExID0gdHJhY2tlZCgweDEzOCk7XG4gIEtlbnN1SW5MaWdodGhvdXNlID0gdHJhY2tlZCgweDEzOSk7XG4gIFJlcGFpcmVkU3RhdHVlID0gdHJhY2tlZCgweDEzYSk7XG4gIFVuZGVyZ3JvdW5kQ2hhbm5lbFVuZGVyd2F0ZXJDaGVzdCA9IHRyYWNrZWQoMHgxM2IpO1xuICBLaXJpc2FNZWFkb3cgPSB0cmFja2VkKDB4MTNjKTtcbiAgS2FybWluZSA9IHRyYWNrZWQoMHgxM2QpO1xuICBBcnlsbGlzID0gdHJhY2tlZCgweDEzZSk7XG4gIE10SHlkcmFTdW1taXRDaGVzdCA9IHRyYWNrZWQoMHgxM2YpO1xuICBBenRlY2FJblB5cmFtaWQgPSB0cmFja2VkKDB4MTQwKTtcbiAgWmVidUF0V2luZG1pbGwgPSB0cmFja2VkKDB4MTQxKTtcbiAgTXRTYWJyZU5vcnRoU3VtbWl0ID0gdHJhY2tlZCgweDE0Mik7XG4gIFN0b21GaWdodFJld2FyZCA9IHRyYWNrZWQoMHgxNDMpO1xuICBNdFNhYnJlV2VzdFRvcm5lbCA9IHRyYWNrZWQoMHgxNDQpO1xuICBBc2luYUluQmFja1Jvb20gPSB0cmFja2VkKDB4MTQ1KTtcbiAgQmVoaW5kV2hpcmxwb29sID0gdHJhY2tlZCgweDE0Nik7XG4gIEtlbnN1SW5Td2FuID0gdHJhY2tlZCgweDE0Nyk7XG4gIFNsaW1lZEtlbnN1ID0gdHJhY2tlZCgweDE0OCk7XG4gIFNlYWxlZENhdmVCaWdSb29tU291dGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTUwKTsgLy8gbWVkaWNhbCBoZXJiXG4gIC8vIHVudXNlZCAxNTEgc2FjcmVkIHNoaWVsZCBjaGVzdFxuICBNdFNhYnJlV2VzdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTUyKTsgLy8gbWVkaWNhbCBoZXJiXG4gIE10U2FicmVOb3J0aE1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1Myk7IC8vIG1lZGljYWwgaGVyYlxuICBGb3J0cmVzc01hZG9IZWxsd2F5Q2hlc3QgPSB0cmFja2VkKDB4MTU0KTsgLy8gbWFnaWMgcmluZ1xuICBTYWJlcmFVcHN0YWlyc1JpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTU1KTsgLy8gbWVkaWNhbCBoZXJiIGFjcm9zcyBzcGlrZXNcbiAgTXRIeWRyYUZhckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNTYpOyAvLyBtZWRpY2FsIGhlcmJcbiAgU3R4eUxlZnRMb3dlckNoZXN0ID0gdHJhY2tlZCgweDE1Nyk7IC8vIG1lZGljYWwgaGVyYlxuICBLYXJtaW5lQmFzZW1lbnRMb3dlck1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1OCk7IC8vIG1hZ2ljIHJpbmdcbiAgRWFzdENhdmVOb3J0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxNTkpOyAvLyBtZWRpY2FsIGhlcmIgKHVudXNlZClcbiAgT2FzaXNDYXZlRW50cmFuY2VBY3Jvc3NSaXZlckNoZXN0ID0gdHJhY2tlZCgweDE1YSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIC8vIHVudXNlZCAxNWIgMm5kIGZsdXRlIG9mIGxpbWUgLSBjaGFuZ2VkIGluIHJhbmRvXG4gIC8vIFdhdGVyZmFsbENhdmVSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNWIpOyAvLyAybmQgZmx1dGUgb2YgbGltZVxuICBFdmlsU3Bpcml0SXNsYW5kRXhpdENoZXN0ID0gdHJhY2tlZCgweDE1Yyk7IC8vIGx5c2lzIHBsYW50XG4gIEZvcnRyZXNzU2FiZXJhTWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTVkKTsgLy8gbHlzaXMgcGxhbnRcbiAgTXRTYWJyZU5vcnRoVW5kZXJCcmlkZ2VDaGVzdCA9IHRyYWNrZWQoMHgxNWUpOyAvLyBhbnRpZG90ZVxuICBLaXJpc2FQbGFudENhdmVDaGVzdCA9IHRyYWNrZWQoMHgxNWYpOyAvLyBhbnRpZG90ZVxuICBGb3J0cmVzc01hZG9VcHBlck5vcnRoQ2hlc3QgPSB0cmFja2VkKDB4MTYwKTsgLy8gYW50aWRvdGVcbiAgVmFtcGlyZTIgPSB0cmFja2VkKDB4MTYxKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRm9ydHJlc3NTYWJlcmFOb3J0aHdlc3RDaGVzdCA9IHRyYWNrZWQoMHgxNjIpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBGb3J0cmVzc01hZG9Mb3dlckNlbnRlck5vcnRoQ2hlc3QgPSB0cmFja2VkKDB4MTYzKTsgLy8gb3BlbCBzdGF0dWVcbiAgT2FzaXNDYXZlTmVhckVudHJhbmNlQ2hlc3QgPSB0cmFja2VkKDB4MTY0KTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgTXRIeWRyYUxlZnRSaWdodENoZXN0ID0gdHJhY2tlZCgweDE2NSk7IC8vIG1hZ2ljIHJpbmdcbiAgRm9ydHJlc3NTYWJlcmFTb3V0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxNjYpOyAvLyBmcnVpdCBvZiByZXB1blxuICBLZW5zdUluQ2FiaW4gPSB0cmFja2VkKDB4MTY3KTsgLy8gYWRkZWQgYnkgcmFuZG9taXplciBpZiBmb2cgbGFtcCBub3QgbmVlZGVkXG4gIC8vIHVudXNlZCAxNjggbWFnaWMgcmluZyBjaGVzdFxuICBNdFNhYnJlV2VzdE5lYXJLZW5zdUNoZXN0ID0gdHJhY2tlZCgweDE2OSk7IC8vIG1hZ2ljIHJpbmdcbiAgTXRTYWJyZVdlc3RMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTZhKTsgLy8gd2FycCBib290c1xuICBGb3J0cmVzc01hZG9VcHBlckJlaGluZFdhbGxDaGVzdCA9IHRyYWNrZWQoMHgxNmIpOyAvLyBtYWdpYyByaW5nXG4gIFB5cmFtaWRDaGVzdCA9IHRyYWNrZWQoMHgxNmMpOyAvLyBtYWdpYyByaW5nXG4gIENyeXB0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNmQpOyAvLyBvcGVsIHN0YXR1ZVxuICBLYXJtaW5lQmFzZW1lbnRMb3dlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNmUpOyAvLyB3YXJwIGJvb3RzXG4gIEZvcnRyZXNzTWFkb0xvd2VyU291dGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTZmKTsgLy8gbWFnaWMgcmluZ1xuICAvLyA9IHRyYWNrZWQoMHgxNzApOyAvLyBtaW1pYyAvIG1lZGljYWwgaGVyYlxuICAvLyBUT0RPIC0gYWRkIGFsbCB0aGUgbWltaWNzLCBnaXZlIHRoZW0gc3RhYmxlIG51bWJlcnM/XG4gIEZvZ0xhbXBDYXZlTWlkZGxlTm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzApO1xuICBGb2dMYW1wQ2F2ZU1pZGRsZVNvdXRod2VzdE1pbWljID0gdHJhY2tlZCgweDE3MSk7XG4gIFdhdGVyZmFsbENhdmVGcm9udE1pbWljID0gdHJhY2tlZCgweDE3Mik7XG4gIEV2aWxTcGlyaXRJc2xhbmRSaXZlclJpZ2h0TWltaWMgPSB0cmFja2VkKDB4MTczKTtcbiAgTXRIeWRyYUZpbmFsQ2F2ZU1pbWljID0gdHJhY2tlZCgweDE3NCk7XG4gIFN0eHlMZWZ0Tm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzUpO1xuICBTdHh5UmlnaHROb3J0aE1pbWljID0gdHJhY2tlZCgweDE3Nik7XG4gIFN0eHlSaWdodFNvdXRoTWltaWMgPSB0cmFja2VkKDB4MTc3KTtcbiAgQ3J5cHRMZWZ0UGl0TWltaWMgPSB0cmFja2VkKDB4MTc4KTtcbiAgS2FybWluZUJhc2VtZW50VXBwZXJNaWRkbGVNaW1pYyA9IHRyYWNrZWQoMHgxNzkpO1xuICBLYXJtaW5lQmFzZW1lbnRVcHBlclJpZ2h0TWltaWMgPSB0cmFja2VkKDB4MTdhKTtcbiAgS2FybWluZUJhc2VtZW50TG93ZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3Yik7XG4gIEVhc3RDYXZlTm9ydGh3ZXN0TWltaWMgPSB0cmFja2VkKDB4MTdjKTtcbiAgLy8gVE9ETyAtIG1pbWljcyAxMy4uMTYgP1xuXG4gIC8vIDE4MCAuLiAxZmYgPT4gZml4ZWQgZmxhZ3MgZm9yIG92ZXJmbG93IGJ1ZmZlci5cblxuICAvLyAyMDAgLi4gMjdmID0+IGZpeGVkIGZsYWdzIGZvciBpdGVtcy5cbiAgU3dvcmRPZldpbmQgPSB0cmFja2VkKDB4MjAwKTtcbiAgU3dvcmRPZkZpcmUgPSB0cmFja2VkKDB4MjAxKTtcbiAgU3dvcmRPZldhdGVyID0gdHJhY2tlZCgweDIwMik7XG4gIFN3b3JkT2ZUaHVuZGVyID0gdHJhY2tlZCgweDIwMyk7XG4gIENyeXN0YWxpcyA9IHRyYWNrZWQoMHgyMDQpO1xuICBCYWxsT2ZXaW5kID0gdHJhY2tlZCgweDIwNSk7XG4gIFRvcm5hZG9CcmFjZWxldCA9IHRyYWNrZWQoMHgyMDYpO1xuICBCYWxsT2ZGaXJlID0gdHJhY2tlZCgweDIwNyk7XG4gIEZsYW1lQnJhY2VsZXQgPSB0cmFja2VkKDB4MjA4KTtcbiAgQmFsbE9mV2F0ZXIgPSB0cmFja2VkKDB4MjA5KTtcbiAgQmxpenphcmRCcmFjZWxldCA9IHRyYWNrZWQoMHgyMGEpO1xuICBCYWxsT2ZUaHVuZGVyID0gdHJhY2tlZCgweDIwYik7XG4gIFN0b3JtQnJhY2VsZXQgPSB0cmFja2VkKDB4MjBjKTtcbiAgQ2FyYXBhY2VTaGllbGQgPSB0cmFja2VkKDB4MjBkKTtcbiAgQnJvbnplU2hpZWxkID0gdHJhY2tlZCgweDIwZSk7XG4gIFBsYXRpbnVtU2hpZWxkID0gdHJhY2tlZCgweDIwZik7XG4gIE1pcnJvcmVkU2hpZWxkID0gdHJhY2tlZCgweDIxMCk7XG4gIENlcmFtaWNTaGllbGQgPSB0cmFja2VkKDB4MjExKTtcbiAgU2FjcmVkU2hpZWxkID0gdHJhY2tlZCgweDIxMik7XG4gIEJhdHRsZVNoaWVsZCA9IHRyYWNrZWQoMHgyMTMpO1xuICBQc3ljaG9TaGllbGQgPSB0cmFja2VkKDB4MjE0KTtcbiAgVGFubmVkSGlkZSA9IHRyYWNrZWQoMHgyMTUpO1xuICBMZWF0aGVyQXJtb3IgPSB0cmFja2VkKDB4MjE2KTtcbiAgQnJvbnplQXJtb3IgPSB0cmFja2VkKDB4MjE3KTtcbiAgUGxhdGludW1Bcm1vciA9IHRyYWNrZWQoMHgyMTgpO1xuICBTb2xkaWVyU3VpdCA9IHRyYWNrZWQoMHgyMTkpO1xuICBDZXJhbWljU3VpdCA9IHRyYWNrZWQoMHgyMWEpO1xuICBCYXR0bGVBcm1vciA9IHRyYWNrZWQoMHgyMWIpO1xuICBQc3ljaG9Bcm1vciA9IHRyYWNrZWQoMHgyMWMpO1xuICBNZWRpY2FsSGVyYiA9IHRyYWNrZWQoMHgyMWQpO1xuICBBbnRpZG90ZSA9IHRyYWNrZWQoMHgyMWUpO1xuICBMeXNpc1BsYW50ID0gdHJhY2tlZCgweDIxZik7XG4gIEZydWl0T2ZMaW1lID0gdHJhY2tlZCgweDIyMCk7XG4gIEZydWl0T2ZQb3dlciA9IHRyYWNrZWQoMHgyMjEpO1xuICBNYWdpY1JpbmcgPSB0cmFja2VkKDB4MjIyKTtcbiAgRnJ1aXRPZlJlcHVuID0gdHJhY2tlZCgweDIyMyk7XG4gIFdhcnBCb290cyA9IHRyYWNrZWQoMHgyMjQpO1xuICBTdGF0dWVPZk9ueXggPSB0cmFja2VkKDB4MjI1KTtcbiAgT3BlbFN0YXR1ZSA9IHRyYWNrZWQoMHgyMjYpO1xuICBJbnNlY3RGbHV0ZSA9IHRyYWNrZWQoMHgyMjcpO1xuICBGbHV0ZU9mTGltZSA9IHRyYWNrZWQoMHgyMjgpO1xuICBHYXNNYXNrID0gdHJhY2tlZCgweDIyOSk7XG4gIFBvd2VyUmluZyA9IHRyYWNrZWQoMHgyMmEpO1xuICBXYXJyaW9yUmluZyA9IHRyYWNrZWQoMHgyMmIpO1xuICBJcm9uTmVja2xhY2UgPSB0cmFja2VkKDB4MjJjKTtcbiAgRGVvc1BlbmRhbnQgPSB0cmFja2VkKDB4MjJkKTtcbiAgUmFiYml0Qm9vdHMgPSB0cmFja2VkKDB4MjJlKTtcbiAgTGVhdGhlckJvb3RzID0gdHJhY2tlZCgweDIyZik7XG4gIFNoaWVsZFJpbmcgPSB0cmFja2VkKDB4MjMwKTtcbiAgQWxhcm1GbHV0ZSA9IHRyYWNrZWQoMHgyMzEpO1xuICBXaW5kbWlsbEtleSA9IHRyYWNrZWQoMHgyMzIpO1xuICBLZXlUb1ByaXNvbiA9IHRyYWNrZWQoMHgyMzMpO1xuICBLZXlUb1N0eHkgPSB0cmFja2VkKDB4MjM0KTtcbiAgRm9nTGFtcCA9IHRyYWNrZWQoMHgyMzUpO1xuICBTaGVsbEZsdXRlID0gdHJhY2tlZCgweDIzNik7XG4gIEV5ZUdsYXNzZXMgPSB0cmFja2VkKDB4MjM3KTtcbiAgQnJva2VuU3RhdHVlID0gdHJhY2tlZCgweDIzOCk7XG4gIEdsb3dpbmdMYW1wID0gdHJhY2tlZCgweDIzOSk7XG4gIFN0YXR1ZU9mR29sZCA9IHRyYWNrZWQoMHgyM2EpO1xuICBMb3ZlUGVuZGFudCA9IHRyYWNrZWQoMHgyM2IpO1xuICBLaXJpc2FQbGFudCA9IHRyYWNrZWQoMHgyM2MpO1xuICBJdm9yeVN0YXR1ZSA9IHRyYWNrZWQoMHgyM2QpO1xuICBCb3dPZk1vb24gPSB0cmFja2VkKDB4MjNlKTtcbiAgQm93T2ZTdW4gPSB0cmFja2VkKDB4MjNmKTtcbiAgQm93T2ZUcnV0aCA9IHRyYWNrZWQoMHgyNDApO1xuICBSZWZyZXNoID0gdHJhY2tlZCgweDI0MSk7XG4gIFBhcmFseXNpcyA9IHRyYWNrZWQoMHgyNDIpO1xuICBUZWxlcGF0aHkgPSB0cmFja2VkKDB4MjQzKTtcbiAgVGVsZXBvcnQgPSB0cmFja2VkKDB4MjQ0KTtcbiAgUmVjb3ZlciA9IHRyYWNrZWQoMHgyNDUpO1xuICBCYXJyaWVyID0gdHJhY2tlZCgweDI0Nik7XG4gIENoYW5nZSA9IHRyYWNrZWQoMHgyNDcpO1xuICBGbGlnaHQgPSB0cmFja2VkKDB4MjQ4KTtcblxuICAvLyAyODAgLi4gMmYwID0+IGZpeGVkIGZsYWdzIGZvciB3YWxscy5cbiAgQ2FsbWVkQW5ncnlTZWEgPSB0cmFja2VkKDB4MjgzKTtcbiAgT3BlbmVkSm9lbFNoZWQgPSB0cmFja2VkKDB4Mjg3KTtcbiAgRHJheWdvbjIgPSB0cmFja2VkKDB4MjhkKTtcbiAgT3BlbmVkQ3J5cHQgPSB0cmFja2VkKDB4MjhlKTtcbiAgLy8gTk9URTogMjhmIGlzIGZsYWdnZWQgZm9yIGRyYXlnb24ncyBmbG9vciwgYnV0IGlzIHVudXNlZCBhbmQgdW5uZWVkZWRcbiAgT3BlbmVkU3R4eSA9IHRyYWNrZWQoMHgyYjApO1xuICBPcGVuZWRTd2FuR2F0ZSA9IHRyYWNrZWQoMHgyYjMpO1xuICBPcGVuZWRQcmlzb24gPSB0cmFja2VkKDB4MmQ4KTtcbiAgT3BlbmVkU2VhbGVkQ2F2ZSA9IHRyYWNrZWQoMHgyZWUpO1xuXG4gIC8vIE5vdGhpbmcgZXZlciBzZXRzIHRoaXMsIHNvIGp1c3QgdXNlIGl0IHJpZ2h0IG91dC5cbiAgQWx3YXlzVHJ1ZSA9IGZpeGVkKDB4MmYwLCBUUlVFKTtcblxuICBXYXJwTGVhZiA9IHRyYWNrZWQoMHgyZjUpO1xuICBXYXJwQnJ5bm1hZXIgPSB0cmFja2VkKDB4MmY2KTtcbiAgV2FycE9hayA9IHRyYWNrZWQoMHgyZjcpO1xuICBXYXJwTmFkYXJlID0gdHJhY2tlZCgweDJmOCk7XG4gIFdhcnBQb3J0b2EgPSB0cmFja2VkKDB4MmY5KTtcbiAgV2FycEFtYXpvbmVzID0gdHJhY2tlZCgweDJmYSk7XG4gIFdhcnBKb2VsID0gdHJhY2tlZCgweDJmYik7XG4gIFdhcnBab21iaWUgPSB0cmFja2VkKH4weDJmYik7XG4gIFdhcnBTd2FuID0gdHJhY2tlZCgweDJmYyk7XG4gIFdhcnBTaHlyb24gPSB0cmFja2VkKDB4MmZkKTtcbiAgV2FycEdvYSA9IHRyYWNrZWQoMHgyZmUpO1xuICBXYXJwU2FoYXJhID0gdHJhY2tlZCgweDJmZik7XG5cbiAgLy8gUHNldWRvIGZsYWdzXG4gIFN3b3JkID0gcHNldWRvKHRoaXMpO1xuICBNb25leSA9IHBzZXVkbyh0aGlzKTtcbiAgQnJlYWtTdG9uZSA9IHBzZXVkbyh0aGlzKTtcbiAgQnJlYWtJY2UgPSBwc2V1ZG8odGhpcyk7XG4gIEZvcm1CcmlkZ2UgPSBwc2V1ZG8odGhpcyk7XG4gIEJyZWFrSXJvbiA9IHBzZXVkbyh0aGlzKTtcbiAgVHJhdmVsU3dhbXAgPSBwc2V1ZG8odGhpcyk7XG4gIENyb3NzUGFpbiA9IHBzZXVkbyh0aGlzKTtcbiAgQ2xpbWJXYXRlcmZhbGwgPSBwc2V1ZG8odGhpcyk7XG4gIEJ1eUhlYWxpbmcgPSBwc2V1ZG8odGhpcyk7XG4gIEJ1eVdhcnAgPSBwc2V1ZG8odGhpcyk7XG4gIFNob290aW5nU3RhdHVlID0gcHNldWRvKHRoaXMpO1xuICBDbGltYlNsb3BlOCA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgc2xvcGVzIGhlaWdodCA2LThcbiAgQ2xpbWJTbG9wZTkgPSBwc2V1ZG8odGhpcyk7IC8vIGNsaW1iIHNsb3BlcyBoZWlnaHQgOVxuICBDbGltYlNsb3BlMTAgPSBwc2V1ZG8odGhpcyk7IC8vIGNsaW1iIGFsbCBzbG9wZXNcbiAgV2lsZFdhcnAgPSBwc2V1ZG8odGhpcyk7XG4gIFRyaWdnZXJTa2lwID0gcHNldWRvKHRoaXMpO1xuICBSYWdlU2tpcCA9IHBzZXVkbyh0aGlzKTtcblxuICAvLyBNYXAgb2YgZmxhZ3MgdGhhdCBhcmUgXCJ3YWl0aW5nXCIgZm9yIGEgcHJldmlvdXNseS11c2VkIElELlxuICAvLyBTaWduaWZpZWQgd2l0aCBhIG5lZ2F0aXZlIChvbmUncyBjb21wbGVtZW50KSBJRCBpbiB0aGUgRmxhZyBvYmplY3QuXG4gIHByaXZhdGUgcmVhZG9ubHkgdW5hbGxvY2F0ZWQgPSBuZXcgTWFwPG51bWJlciwgRmxhZz4oKTtcblxuICAvLyAvLyBNYXAgb2YgYXZhaWxhYmxlIElEcy5cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBhdmFpbGFibGUgPSBbXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDAwMCAuLiAwZmZcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMTAwIC4uIDFmZlxuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAyMDAgLi4gMmZmXG4gIC8vIF07XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICAvLyBCdWlsZCB1cCBhbGwgdGhlIGZsYWdzIGFzIGFjdHVhbCBpbnN0YW5jZXMgb2YgRmxhZy5cbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzT3duUHJvcGVydHkoa2V5KSkgY29udGludWU7XG4gICAgICBjb25zdCBzcGVjID0gdGhpc1trZXldO1xuICAgICAgaWYgKCEoc3BlYyBhcyBhbnkpW0ZMQUddKSBjb250aW51ZTtcbiAgICAgIC8vIFJlcGxhY2UgaXQgd2l0aCBhbiBhY3R1YWwgZmxhZy4gIFdlIG1heSBuZWVkIGEgbmFtZSwgZXRjLi4uXG4gICAgICBjb25zdCBrZXlOdW1iZXIgPSBOdW1iZXIoa2V5KTtcbiAgICAgIGNvbnN0IGlkID0gdHlwZW9mIHNwZWMuaWQgPT09ICdudW1iZXInID8gc3BlYy5pZCA6IGtleU51bWJlcjtcbiAgICAgIGlmIChpc05hTihpZCkpIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWc6ICR7a2V5fWApO1xuICAgICAgY29uc3QgbmFtZSA9XG4gICAgICAgICAgc3BlYy5uYW1lIHx8XG4gICAgICAgICAgKGlzTmFOKGtleU51bWJlcikgPyB1cHBlckNhbWVsVG9TcGFjZXMoa2V5KSA6IGZsYWdOYW1lKGlkKSk7XG4gICAgICBjb25zdCBmbGFnID0gbmV3IEZsYWcodGhpcywgbmFtZSwgaWQsIHNwZWMpO1xuICAgICAgdGhpc1trZXldID0gZmxhZztcbiAgICAgIC8vIElmIElEIGlzIG5lZ2F0aXZlLCB0aGVuIHN0b3JlIGl0IGFzIHVuYWxsb2NhdGVkLlxuICAgICAgaWYgKGZsYWcuaWQgPCAwKSB7XG4gICAgICAgIHRoaXMudW5hbGxvY2F0ZWQuc2V0KH5mbGFnLmlkLCBmbGFnKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRoaXNbZmxhZy5pZF0pIHtcbiAgICAgICAgdGhpc1tmbGFnLmlkXSA9IGZsYWc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93IGFkZCB0aGUgbWlzc2luZyBmbGFncy5cbiAgICBmb3IgKGxldCBpID0gMHgxMDA7IGkgPCAweDE4MDsgaSsrKSB7XG4gICAgICBjb25zdCBuYW1lID0gYENoZWNrICR7aGV4KGkgJiAweGZmKX1gO1xuICAgICAgaWYgKHRoaXNbaV0pIHtcbiAgICAgICAgaWYgKCF0aGlzW2ldLmZpeGVkICYmICF0aGlzLnVuYWxsb2NhdGVkLmhhcyhpKSkge1xuICAgICAgICAgIHRoaXMudW5hbGxvY2F0ZWQuc2V0KFxuICAgICAgICAgICAgICBpLCBuZXcgRmxhZyh0aGlzLCBuYW1lLCB+aSwge2ZpeGVkOiB0cnVlfSkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzW2ldID0gbmV3IEZsYWcodGhpcywgbmFtZSwgaSwge2ZpeGVkOiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAweDE4MDsgaSA8IDB4MjgwOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkge1xuICAgICAgICAvLyBJdGVtIGJ1ZmZlciBoZXJlXG4gICAgICAgIGNvbnN0IHR5cGUgPSBpIDwgMHgyMDAgPyAnQnVmZmVyICcgOiAnSXRlbSAnO1xuICAgICAgICB0aGlzW2ldID0gbmV3IEZsYWcodGhpcywgdHlwZSArIGhleChpKSwgaSwge2ZpeGVkOiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEZvciB0aGUgcmVtYWluZGVyLCBmaW5kIHdhbGxzIGluIG1hcHMuXG4gICAgLy8gIC0gZG8gd2UgbmVlZCB0byBwdWxsIHRoZW0gZnJvbSBsb2NhdGlvbnM/PyBvciB0aGlzIGRvaW5nIGFueXRoaW5nPz9cbiAgICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICAgIGlmICh0aGlzW2YuZmxhZ10pIGNvbnRpbnVlO1xuICAgICAgICB0aGlzW2YuZmxhZ10gPSB3YWxsRmxhZyh0aGlzLCBmLmZsYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNhdmVzID4gNDcwIGJ5dGVzIG9mIHJlZHVuZGFudCBmbGFnIHNldHMhXG4gIGRlZnJhZygpIHtcbiAgICAvLyBtYWtlIGEgbWFwIG9mIG5ldyBJRHMgZm9yIGV2ZXJ5dGhpbmcuXG4gICAgY29uc3QgcmVtYXBwaW5nID0gbmV3IE1hcDxudW1iZXIsIChmOiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPigpO1xuICAgIGNvbnN0IHVudXNlZCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuXG4gICAgLy8gZmlyc3QgaGFuZGxlIGFsbCB0aGUgb2Jzb2xldGUgZmxhZ3MgLSBvbmNlIHRoZSByZW1hcHBpbmcgaXMgcHVsbGVkIG9mZlxuICAgIC8vIHdlIGNhbiBzaW1wbHkgdW5yZWYgdGhlbS5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzW2ldO1xuICAgICAgY29uc3QgbyA9IGY/Lm9ic29sZXRlO1xuICAgICAgaWYgKG8pIHtcbiAgICAgICAgcmVtYXBwaW5nLnNldChpLCAoYzogRmxhZ0NvbnRleHQpID0+IGMuc2V0ID8gLTEgOiBvLmNhbGwoZiwgYykpO1xuICAgICAgICBkZWxldGUgdGhpc1tpXTtcbiAgICAgIH0gZWxzZSBpZiAoIWYpIHtcbiAgICAgICAgdW51c2VkLmFkZChpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBub3cgbW92ZSBhbGwgdGhlIG1vdmFibGUgZmxhZ3MuXG4gICAgbGV0IGkgPSAwO1xuICAgIGxldCBqID0gMHgyZmY7XG4gICAgLy8gV0FSTklORzogaSBhbmQgaiBhcmUgYm91bmQgdG8gdGhlIG91dGVyIHNjb3BlISAgQ2xvc2luZyBvdmVyIHRoZW1cbiAgICAvLyB3aWxsIE5PVCB3b3JrIGFzIGludGVuZGVkLlxuICAgIGZ1bmN0aW9uIHJldDxUPih4OiBUKTogKCkgPT4gVCB7IHJldHVybiAoKSA9PiB4OyB9XG4gICAgd2hpbGUgKGkgPCBqKSB7XG4gICAgICBpZiAodGhpc1tpXSB8fCB0aGlzLnVuYWxsb2NhdGVkLmhhcyhpKSkgeyBpKys7IGNvbnRpbnVlOyB9XG4gICAgICBjb25zdCBmID0gdGhpc1tqXTtcbiAgICAgIGlmICghZiB8fCBmLmZpeGVkKSB7IGotLTsgY29udGludWU7IH1cbiAgICAgIC8vIGYgaXMgYSBtb3ZhYmxlIGZsYWcuICBNb3ZlIGl0IHRvIGkuXG4gICAgICByZW1hcHBpbmcuc2V0KGosIHJldChpKSk7XG4gICAgICAoZiBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBpO1xuICAgICAgdGhpc1tpXSA9IGY7XG4gICAgICBkZWxldGUgdGhpc1tqXTtcbiAgICAgIGkrKztcbiAgICAgIGotLTtcbiAgICB9XG5cbiAgICAvLyBnbyB0aHJvdWdoIGFsbCB0aGUgcG9zc2libGUgcGxhY2VzIHdlIGNvdWxkIGZpbmQgZmxhZ3MgYW5kIHJlbWFwIVxuICAgIHRoaXMucmVtYXBGbGFncyhyZW1hcHBpbmcsIHVudXNlZCk7XG5cbiAgICAvLyBVbmFsbG9jYXRlZCBmbGFncyBkb24ndCBuZWVkIGFueSByZW1hcHBpbmcuXG4gICAgZm9yIChjb25zdCBbd2FudCwgZmxhZ10gb2YgdGhpcy51bmFsbG9jYXRlZCkge1xuICAgICAgaWYgKHRoaXNbd2FudF0pIGNvbnRpbnVlO1xuICAgICAgdGhpcy51bmFsbG9jYXRlZC5kZWxldGUod2FudCk7XG4gICAgICAodGhpc1t3YW50XSA9IGZsYWcgYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gd2FudDtcbiAgICB9XG5cbiAgICAvL2lmICh0aGlzLnVuYWxsb2NhdGVkLnNpemUpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZ1bGx5IGFsbG9jYXRlYCk7XG5cbiAgICAvLyBSZXBvcnQgaG93IHRoZSBkZWZyYWcgd2VudD9cbiAgICBjb25zdCBmcmVlID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDMwMDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIGZyZWUucHVzaChoZXgzKGkpKTtcbiAgICB9XG4gICAgY29uc29sZS5sb2coYEZyZWUgZmxhZ3M6ICR7ZnJlZS5qb2luKCcgJyl9YCk7XG4gIH1cblxuICBpbnNlcnRab21iaWVXYXJwRmxhZygpIHtcbiAgICAvLyBNYWtlIHNwYWNlIGZvciB0aGUgbmV3IGZsYWcgYmV0d2VlbiBKb2VsIGFuZCBTd2FuXG4gICAgY29uc3QgcmVtYXBwaW5nID0gbmV3IE1hcDxudW1iZXIsIChmOiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPigpO1xuICAgIGlmICh0aGlzWzB4MmY0XSkgdGhyb3cgbmV3IEVycm9yKGBObyBzcGFjZSB0byBpbnNlcnQgd2FycCBmbGFnYCk7XG4gICAgY29uc3QgbmV3SWQgPSB+dGhpcy5XYXJwWm9tYmllLmlkO1xuICAgIGlmIChuZXdJZCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIFdhcnBab21iaWUgaWRgKTtcbiAgICBmb3IgKGxldCBpID0gMHgyZjQ7IGkgPCBuZXdJZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gdGhpc1tpICsgMV07XG4gICAgICAodGhpc1tpXSBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBpO1xuICAgICAgcmVtYXBwaW5nLnNldChpICsgMSwgKCkgPT4gaSk7XG4gICAgfVxuICAgICh0aGlzLldhcnBab21iaWUgYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gbmV3SWQ7XG4gICAgdGhpc1tuZXdJZF0gPSB0aGlzLldhcnBab21iaWU7XG4gICAgdGhpcy5yZW1hcEZsYWdzKHJlbWFwcGluZyk7XG4gIH1cblxuICByZW1hcChzcmM6IG51bWJlciwgZGVzdDogbnVtYmVyKSB7XG4gICAgdGhpcy5yZW1hcEZsYWdzKG5ldyBNYXAoW1tzcmMsICgpID0+IGRlc3RdXSkpO1xuICB9XG5cbiAgcmVtYXBGbGFncyhyZW1hcHBpbmc6IE1hcDxudW1iZXIsIChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+LFxuICAgICAgICAgICAgIHVudXNlZD86IFNldDxudW1iZXI+KSB7XG4gICAgZnVuY3Rpb24gcHJvY2Vzc0xpc3QobGlzdDogbnVtYmVyW10sIGN0eDogRmxhZ0NvbnRleHQpIHtcbiAgICAgIGZvciAobGV0IGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGxldCBmID0gbGlzdFtpXTtcbiAgICAgICAgaWYgKGYgPCAwKSBmID0gfmY7XG4gICAgICAgIGlmICh1bnVzZWQgJiYgdW51c2VkLmhhcyhmKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU0hPVUxEIEJFIFVOVVNFRDogJHtoZXgoZil9YCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVtYXAgPSByZW1hcHBpbmcuZ2V0KGYpO1xuICAgICAgICBpZiAocmVtYXAgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGxldCBtYXBwZWQgPSByZW1hcCh7Li4uY3R4LCBpbmRleDogaX0pO1xuICAgICAgICBpZiAobWFwcGVkID49IDApIHtcbiAgICAgICAgICBsaXN0W2ldID0gbGlzdFtpXSA8IDAgPyB+bWFwcGVkIDogbWFwcGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHByb2Nlc3MoZmxhZzogbnVtYmVyLCBjdHg6IEZsYWdDb250ZXh0KSB7XG4gICAgICBsZXQgdW5zaWduZWQgPSBmbGFnIDwgMCA/IH5mbGFnIDogZmxhZztcbiAgICAgIGlmICh1bnVzZWQgJiYgdW51c2VkLmhhcyh1bnNpZ25lZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTSE9VTEQgQkUgVU5VU0VEOiAke2hleCh1bnNpZ25lZCl9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCByZW1hcCA9IHJlbWFwcGluZy5nZXQodW5zaWduZWQpO1xuICAgICAgaWYgKHJlbWFwID09IG51bGwpIHJldHVybiBmbGFnO1xuICAgICAgbGV0IG1hcHBlZCA9IHJlbWFwKGN0eCk7XG4gICAgICBpZiAobWFwcGVkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZyBkZWxldGVgKTtcbiAgICAgIHJldHVybiBmbGFnIDwgMCA/IH5tYXBwZWQgOiBtYXBwZWQ7XG4gICAgfVxuXG4gICAgLy8gTG9jYXRpb24gZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLmxvY2F0aW9ucykge1xuICAgICAgaWYgKCFsb2NhdGlvbi51c2VkKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgZmxhZyBvZiBsb2NhdGlvbi5mbGFncykge1xuICAgICAgICBmbGFnLmZsYWcgPSBwcm9jZXNzKGZsYWcuZmxhZywge2xvY2F0aW9ufSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTlBDIGZsYWdzXG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5yb20ubnBjcykge1xuICAgICAgaWYgKCFucGMudXNlZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IFtsb2MsIGNvbmRzXSBvZiBucGMuc3Bhd25Db25kaXRpb25zKSB7XG4gICAgICAgIHByb2Nlc3NMaXN0KGNvbmRzLCB7bnBjLCBzcGF3bjogbG9jfSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgICAgZC5jb25kaXRpb24gPSBwcm9jZXNzKGQuY29uZGl0aW9uLCB7bnBjLCBkaWFsb2c6IHRydWV9KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgWywgZHNdIG9mIG5wYy5sb2NhbERpYWxvZ3MpIHtcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIGRzKSB7XG4gICAgICAgICAgZC5jb25kaXRpb24gPSBwcm9jZXNzKGQuY29uZGl0aW9uLCB7bnBjLCBkaWFsb2c6IHRydWV9KTtcbiAgICAgICAgICBwcm9jZXNzTGlzdChkLmZsYWdzLCB7bnBjLCBkaWFsb2c6IHRydWUsIHNldDogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHJpZ2dlciBmbGFnc1xuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnJvbS50cmlnZ2Vycykge1xuICAgICAgaWYgKCF0cmlnZ2VyLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgcHJvY2Vzc0xpc3QodHJpZ2dlci5jb25kaXRpb25zLCB7dHJpZ2dlcn0pO1xuICAgICAgcHJvY2Vzc0xpc3QodHJpZ2dlci5mbGFncywge3RyaWdnZXIsIHNldDogdHJ1ZX0pO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciB1cGRhdGluZyB0ZWxlcGF0aHk/IT9cblxuICAgIC8vIEl0ZW1HZXQgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IGl0ZW1HZXQgb2YgdGhpcy5yb20uaXRlbUdldHMpIHtcbiAgICAgIHByb2Nlc3NMaXN0KGl0ZW1HZXQuZmxhZ3MsIHtzZXQ6IHRydWV9KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMucm9tLml0ZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IGl0ZW1Vc2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAoaXRlbVVzZS5raW5kID09PSAnZmxhZycpIHtcbiAgICAgICAgICBpdGVtVXNlLndhbnQgPSBwcm9jZXNzKGl0ZW1Vc2Uud2FudCwge30pO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3NMaXN0KGl0ZW1Vc2UuZmxhZ3MsIHtzZXQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gYW55dGhpbmcgZWxzZT9cbiAgfVxuXG4gIC8vIFRPRE8gLSBtYW5pcHVsYXRlIHRoaXMgc3R1ZmZcblxuICAvLyBwcml2YXRlIHJlYWRvbmx5IGF2YWlsYWJsZSA9IG5ldyBTZXQ8bnVtYmVyPihbXG4gIC8vICAgLy8gVE9ETyAtIHRoZXJlJ3MgYSB0b24gb2YgbG93ZXIgZmxhZ3MgYXMgd2VsbC5cbiAgLy8gICAvLyBUT0RPIC0gd2UgY2FuIHJlcHVycG9zZSBhbGwgdGhlIG9sZCBpdGVtIGZsYWdzLlxuICAvLyAgIDB4MjcwLCAweDI3MSwgMHgyNzIsIDB4MjczLCAweDI3NCwgMHgyNzUsIDB4Mjc2LCAweDI3NyxcbiAgLy8gICAweDI3OCwgMHgyNzksIDB4MjdhLCAweDI3YiwgMHgyN2MsIDB4MjdkLCAweDI3ZSwgMHgyN2YsXG4gIC8vICAgMHgyODAsIDB4MjgxLCAweDI4OCwgMHgyODksIDB4MjhhLCAweDI4YiwgMHgyOGMsXG4gIC8vICAgMHgyYTcsIDB4MmFiLCAweDJiNCxcbiAgLy8gXSk7XG5cbiAgYWxsb2Moc2VnbWVudDogbnVtYmVyID0gMCk6IG51bWJlciB7XG4gICAgaWYgKHNlZ21lbnQgIT09IDB4MjAwKSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBhbGxvY2F0ZSBvdXRzaWRlIDJ4eGApO1xuICAgIGZvciAobGV0IGZsYWcgPSAweDI4MDsgZmxhZyA8IDB4MzAwOyBmbGFnKyspIHtcbiAgICAgIGlmICghdGhpc1tmbGFnXSkge1xuICAgICAgICB0aGlzW2ZsYWddID0gd2FsbEZsYWcodGhpcywgZmxhZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmxhZztcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBObyBmcmVlIGZsYWdzLmApO1xuICB9XG5cbiAgZnJlZShmbGFnOiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gaXMgdGhlcmUgbW9yZSB0byB0aGlzPyAgY2hlY2sgZm9yIHNvbWV0aGluZyBlbHNlP1xuICAgIGRlbGV0ZSB0aGlzW2ZsYWddO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZsYWdOYW1lKGlkOiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gJ0ZsYWcgJyArIGhleDMoaWQpO1xufVxuXG5mdW5jdGlvbiB3YWxsRmxhZyhmbGFnczogRmxhZ3MsIGlkOiBudW1iZXIpOiBGbGFnIHtcbiAgcmV0dXJuIG5ldyBGbGFnKGZsYWdzLCAnV2FsbCAnICsgaGV4KGlkICYgMHhmZiksIGlkLCB7Zml4ZWQ6IHRydWV9KTtcbn1cbiJdfQ==