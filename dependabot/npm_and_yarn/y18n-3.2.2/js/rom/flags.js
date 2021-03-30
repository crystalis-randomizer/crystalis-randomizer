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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBU3RCLE1BQU0sS0FBSyxHQUFVLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFVLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFVLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztBQW9CekIsTUFBTSxPQUFPLElBQUk7SUFNZixZQUFxQixLQUFZLEVBQ1osSUFBWSxFQUNaLEVBQVUsRUFDbkIsSUFBYzs7UUFITCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssU0FBRyxJQUFJLENBQUMsS0FBSyxtQ0FBSSxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDLEVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFB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UUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFHeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUd4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FB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SUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUMxQztnQkFDRCxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2FBQ3pDO1NBQ0Y7SUFHSCxDQUFDO0lBYUQsS0FBSyxDQUFDLFVBQWtCLENBQUM7UUFDdkIsSUFBSSxPQUFPLEtBQUssS0FBSztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUN0RSxLQUFLLElBQUksSUFBSSxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDbkM7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBWTtRQUVmLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQUVELFNBQVMsUUFBUSxDQUFDLEVBQVU7SUFDMUIsT0FBTyxPQUFPLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFZLEVBQUUsRUFBVTtJQUN4QyxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJdGVtfSBmcm9tICcuL2l0ZW0uanMnO1xuaW1wb3J0IHtMb2NhdGlvbn0gZnJvbSAnLi9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge05wY30gZnJvbSAnLi9ucGMuanMnO1xuaW1wb3J0IHtUcmlnZ2VyfSBmcm9tICcuL3RyaWdnZXIuanMnO1xuaW1wb3J0IHtoZXgsIGhleDMsIHVwcGVyQ2FtZWxUb1NwYWNlcywgV3JpdGFibGV9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge0NvbmRpdGlvbiwgUmVxdWlyZW1lbnR9IGZyb20gJy4uL2xvZ2ljL3JlcXVpcmVtZW50LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuXG5jb25zdCBGTEFHID0gU3ltYm9sKCk7XG5cbi8vIFRPRE8gLSBtYXliZSBhbGlhcyBzaG91bGQganVzdCBiZSBpbiBvdmVybGF5LnRzP1xuZXhwb3J0IGludGVyZmFjZSBMb2dpYyB7XG4gIGFzc3VtZVRydWU/OiBib29sZWFuO1xuICBhc3N1bWVGYWxzZT86IGJvb2xlYW47XG4gIHRyYWNrPzogYm9vbGVhbjtcbn1cblxuY29uc3QgRkFMU0U6IExvZ2ljID0ge2Fzc3VtZUZhbHNlOiB0cnVlfTtcbmNvbnN0IFRSVUU6IExvZ2ljID0ge2Fzc3VtZVRydWU6IHRydWV9O1xuY29uc3QgVFJBQ0s6IExvZ2ljID0ge3RyYWNrOiB0cnVlfTtcbmNvbnN0IElHTk9SRTogTG9naWMgPSB7fTtcblxuaW50ZXJmYWNlIEZsYWdEYXRhIHtcbiAgZml4ZWQ/OiBib29sZWFuO1xuICBvYnNvbGV0ZT86IChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI7XG4gIGxvZ2ljPzogTG9naWM7XG59XG5pbnRlcmZhY2UgRmxhZ0NvbnRleHQge1xuICB0cmlnZ2VyPzogVHJpZ2dlcjtcbiAgbG9jYXRpb24/OiBMb2NhdGlvbjtcbiAgbnBjPzogTnBjO1xuICBzcGF3bj86IG51bWJlcjtcbiAgaW5kZXg/OiBudW1iZXI7XG4gIGRpYWxvZz86IGJvb2xlYW47XG4gIHNldD86IGJvb2xlYW47XG4gIC8vZGlhbG9nPzogTG9jYWxEaWFsb2d8R2xvYmFsRGlhbG9nO1xuICAvL2luZGV4PzogbnVtYmVyO1xuICAvL2NvbmRpdGlvbj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBGbGFnIHtcblxuICBmaXhlZDogYm9vbGVhbjtcbiAgb2Jzb2xldGU/OiAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyO1xuICBsb2dpYzogTG9naWM7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZmxhZ3M6IEZsYWdzLFxuICAgICAgICAgICAgICByZWFkb25seSBuYW1lOiBzdHJpbmcsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGlkOiBudW1iZXIsXG4gICAgICAgICAgICAgIGRhdGE6IEZsYWdEYXRhKSB7XG4gICAgdGhpcy5maXhlZCA9IGRhdGEuZml4ZWQgfHwgZmFsc2U7XG4gICAgdGhpcy5vYnNvbGV0ZSA9IGRhdGEub2Jzb2xldGU7XG4gICAgdGhpcy5sb2dpYyA9IGRhdGEubG9naWMgPz8gVFJBQ0s7XG4gIH1cblxuICBnZXQgYygpOiBDb25kaXRpb24ge1xuICAgIHJldHVybiB0aGlzLmlkIGFzIENvbmRpdGlvbjtcbiAgfVxuXG4gIGdldCByKCk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gICAgcmV0dXJuIFtbdGhpcy5pZCBhcyBDb25kaXRpb25dXTtcbiAgfVxuXG4gIGdldCBkZWJ1ZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmlkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgzLCAnMCcpICsgJyAnICsgdGhpcy5uYW1lO1xuICB9XG5cbiAgZ2V0IGl0ZW0oKTogSXRlbSB7XG4gICAgaWYgKHRoaXMuaWQgPCAweDEwMCB8fCB0aGlzLmlkID4gMHgxN2YpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbm90IGEgc2xvdDogJHt0aGlzLmlkfWApO1xuICAgIH1cbiAgICBjb25zdCBpdGVtR2V0SWQgPSB0aGlzLmZsYWdzLnJvbS5zbG90c1t0aGlzLmlkICYgMHhmZl07XG4gICAgY29uc3QgaXRlbUlkID0gdGhpcy5mbGFncy5yb20uaXRlbUdldHNbaXRlbUdldElkXS5pdGVtSWQ7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMuZmxhZ3Mucm9tLml0ZW1zW2l0ZW1JZF07XG4gICAgaWYgKCFpdGVtKSB0aHJvdyBuZXcgRXJyb3IoYG5vIGl0ZW1gKTtcbiAgICByZXR1cm4gaXRlbTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvYnNvbGV0ZShvYnNvbGV0ZTogbnVtYmVyIHwgKChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXIpKTogRmxhZyB7XG4gIGlmICh0eXBlb2Ygb2Jzb2xldGUgPT09ICdudW1iZXInKSBvYnNvbGV0ZSA9IChvID0+ICgpID0+IG8pKG9ic29sZXRlKTtcbiAgcmV0dXJuIHtvYnNvbGV0ZSwgW0ZMQUddOiB0cnVlfSBhcyBhbnk7XG59XG5mdW5jdGlvbiBmaXhlZChpZDogbnVtYmVyLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge2lkLCBmaXhlZDogdHJ1ZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gdHJhY2tlZChpZDogbnVtYmVyKTogRmxhZyB7XG4gIHJldHVybiBmaXhlZChpZCwgVFJBQ0spO1xufVxuZnVuY3Rpb24gbW92YWJsZShpZDogbnVtYmVyLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge2lkLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5mdW5jdGlvbiBkaWFsb2dQcm9ncmVzc2lvbihuYW1lOiBzdHJpbmcsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7bmFtZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gZGlhbG9nVG9nZ2xlKG5hbWU6IHN0cmluZywgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtuYW1lLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5cbmZ1bmN0aW9uIHBzZXVkbyhvd25lcjogb2JqZWN0KTogRmxhZyB7XG4gIGNvbnN0IGlkID0gcHNldWRvQ291bnRlci5nZXQob3duZXIpIHx8IDB4NDAwO1xuICBwc2V1ZG9Db3VudGVyLnNldChvd25lciwgaWQgKyAxKTtcbiAgcmV0dXJuIHtpZCwgW0ZMQUddOiB0cnVlLCBsb2dpYzogVFJBQ0t9IGFzIGFueTtcbn1cbmNvbnN0IHBzZXVkb0NvdW50ZXIgPSBuZXcgV2Vha01hcDxvYmplY3QsIG51bWJlcj4oKTtcblxuLy8gb2Jzb2xldGUgZmxhZ3MgLSBkZWxldGUgdGhlIHNldHMgKHNob3VsZCBuZXZlciBiZSBhIGNsZWFyKVxuLy8gICAgICAgICAgICAgICAgLSByZXBsYWNlIHRoZSBjaGVja3Mgd2l0aCB0aGUgcmVwbGFjZW1lbnRcblxuLy8gLS0tIG1heWJlIG9ic29sZXRlIGZsYWdzIGNhbiBoYXZlIGRpZmZlcmVudCByZXBsYWNlbWVudHMgaW5cbi8vICAgICBkaWZmZXJlbnQgY29udGV4dHM/XG4vLyAtLS0gaW4gcGFydGljdWxhciwgaXRlbWdldHMgc2hvdWxkbid0IGNhcnJ5IDF4eCBmbGFncz9cblxuXG4vKiogVHJhY2tzIHVzZWQgYW5kIHVudXNlZCBmbGFncy4gKi9cbmV4cG9ydCBjbGFzcyBGbGFncyB7XG5cbiAgW2lkOiBudW1iZXJdOiBGbGFnO1xuXG4gIC8vIDAweFxuICAweDAwMCA9IGZpeGVkKDB4MDAwLCBGQUxTRSk7XG4gIDB4MDAxID0gZml4ZWQoMHgwMDEpO1xuICAweDAwMiA9IGZpeGVkKDB4MDAyKTtcbiAgMHgwMDMgPSBmaXhlZCgweDAwMyk7XG4gIDB4MDA0ID0gZml4ZWQoMHgwMDQpO1xuICAweDAwNSA9IGZpeGVkKDB4MDA1KTtcbiAgMHgwMDYgPSBmaXhlZCgweDAwNik7XG4gIDB4MDA3ID0gZml4ZWQoMHgwMDcpO1xuICAweDAwOCA9IGZpeGVkKDB4MDA4KTtcbiAgMHgwMDkgPSBmaXhlZCgweDAwOSk7XG4gIFVzZWRXaW5kbWlsbEtleSA9IGZpeGVkKDB4MDBhLCBUUkFDSyk7XG4gIDB4MDBiID0gb2Jzb2xldGUoMHgxMDApOyAvLyBjaGVjazogc3dvcmQgb2Ygd2luZCAvIHRhbGtlZCB0byBsZWFmIGVsZGVyXG4gIDB4MDBjID0gZGlhbG9nVG9nZ2xlKCdMZWFmIHZpbGxhZ2VyJyk7XG4gIExlYWZWaWxsYWdlcnNSZXNjdWVkID0gbW92YWJsZSgweDAwZCk7XG4gIDB4MDBlID0gb2Jzb2xldGUoKHMpID0+IHtcbiAgICBpZiAocy50cmlnZ2VyPy5pZCA9PT0gMHg4NSkgcmV0dXJuIDB4MTQzOyAvLyBjaGVjazogdGVsZXBhdGh5IC8gc3RvbVxuICAgIHJldHVybiAweDI0MzsgLy8gaXRlbTogdGVsZXBhdGh5XG4gIH0pO1xuICBXb2tlV2luZG1pbGxHdWFyZCA9IG1vdmFibGUoMHgwMGYsIFRSQUNLKTtcblxuICAvLyAwMXhcbiAgVHVybmVkSW5LaXJpc2FQbGFudCA9IG1vdmFibGUoMHgwMTApO1xuICAweDAxMSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdXZWxjb21lZCB0byBBbWF6b25lcycpO1xuICAweDAxMiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUcmVhc3VyZSBodW50ZXIgZGVhZCcpO1xuICAweDAxMyA9IG9ic29sZXRlKDB4MTM4KTsgLy8gY2hlY2s6IGJyb2tlbiBzdGF0dWUgLyBzYWJlcmEgMVxuICAvLyB1bnVzZWQgMDE0LCAwMTVcbiAgMHgwMTYgPSBkaWFsb2dQcm9ncmVzc2lvbignUG9ydG9hIHF1ZWVuIFJhZ2UgaGludCcpO1xuICAweDAxNyA9IG9ic29sZXRlKDB4MTAyKTsgLy8gY2hlc3Q6IHN3b3JkIG9mIHdhdGVyXG4gIEVudGVyZWRVbmRlcmdyb3VuZENoYW5uZWwgPSBtb3ZhYmxlKDB4MDE4LCBUUkFDSyk7XG4gIDB4MDE5ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gdGlyZWQgb2YgdGFsa2luZycpO1xuICAweDAxYSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdJbml0aWFsIHRhbGsgd2l0aCBQb3J0b2EgcXVlZW4nKTtcbiAgTWVzaWFSZWNvcmRpbmcgPSBtb3ZhYmxlKDB4MDFiLCBUUkFDSyk7XG4gIDB4MDFjID0gb2Jzb2xldGUoMHgxMTApOyAvLyBpdGVtOiBtaXJyb3JlZCBzaGllbGRcbiAgVGFsa2VkVG9Gb3J0dW5lVGVsbGVyID0gbW92YWJsZSgweDFkLCBUUkFDSyk7XG4gIFF1ZWVuUmV2ZWFsZWQgPSBtb3ZhYmxlKDB4MDFlLCBUUkFDSyk7XG4gIDB4MDFmID0gb2Jzb2xldGUoMHgxMDkpOyAvLyBjaGVjazogcmFnZVxuXG4gIC8vIDAyeFxuICBRdWVlbk5vdEluVGhyb25lUm9vbSA9IG1vdmFibGUoMHgwMjApO1xuICBSZXR1cm5lZEZvZ0xhbXAgPSBtb3ZhYmxlKDB4MDIxLCBUUkFDSyk7XG4gIDB4MDIyID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NhaGFyYSBlbGRlcicpO1xuICAweDAyMyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTYWhhcmEgZWxkZXIgZGF1Z2h0ZXInKTtcbiAgMHgwMjQgPSBvYnNvbGV0ZSgweDEzZCk7IC8vIGNoZWNrOiBpdm9yeSBzdGF0dWUgLyBrYXJtaW5lXG4gIDB4MDI1ID0gb2Jzb2xldGUoMHgxMzYpOyAvLyBoZWFsZWQgZG9scGhpblxuICAweDAyNiA9IG9ic29sZXRlKDB4MmZkKTsgLy8gd2FycDogc2h5cm9uXG4gIFNoeXJvbk1hc3NhY3JlID0gZml4ZWQoMHgwMjcsIFRSQUNLKTsgLy8gcHJlc2h1ZmZsZSBoYXJkY29kZXMgZm9yIGRlYWQgc3ByaXRlc1xuICBDaGFuZ2VXb21hbiA9IGZpeGVkKDB4MDI4KTsgLy8gaGFyZGNvZGVkIGluIG9yaWdpbmFsIHJvbVxuICBDaGFuZ2VBa2FoYW5hID0gZml4ZWQoMHgwMjkpO1xuICBDaGFuZ2VTb2xkaWVyID0gZml4ZWQoMHgwMmEpO1xuICBDaGFuZ2VTdG9tID0gZml4ZWQoMHgwMmIpO1xuICAvLyB1bnVzZWQgMDJjXG4gIDB4MDJkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NoeXJvbiBzYWdlcycpO1xuICAweDAyZSA9IG9ic29sZXRlKDB4MTJkKTsgLy8gY2hlY2s6IGRlbydzIHBlbmRhbnRcbiAgVXNlZEJvd09mVHJ1dGggPSBmaXhlZCgweDAyZik7ICAvLyBtb3ZlZCBmcm9tIDA4NiBpbiBwcmVwYXJzZVxuXG4gIC8vIDAzeFxuICAvLyB1bnVzZWQgMDMwXG4gIDB4MDMxID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1pvbWJpZSB0b3duJyk7XG4gIDB4MDMyID0gb2Jzb2xldGUoMHgxMzcpOyAvLyBjaGVjazogZXllIGdsYXNzZXNcbiAgLy8gdW51c2VkIDAzM1xuICAweDAzNCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBa2FoYW5hIGluIHdhdGVyZmFsbCBjYXZlJyk7IC8vID8/P1xuICBDdXJlZEFrYWhhbmEgPSBtb3ZhYmxlKDB4MDM1LCBUUkFDSyk7XG4gIDB4MDM2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FrYWhhbmEgU2h5cm9uJyk7XG4gIDB4MDM3ID0gb2Jzb2xldGUoMHgxNDIpOyAvLyBjaGVjazogcGFyYWx5c2lzXG4gIExlYWZBYmR1Y3Rpb24gPSBtb3ZhYmxlKDB4MDM4LCBUUkFDSyk7IC8vIG9uZS13YXkgbGF0Y2hcbiAgMHgwMzkgPSBvYnNvbGV0ZSgweDE0MSk7IC8vIGNoZWNrOiByZWZyZXNoXG4gIFRhbGtlZFRvWmVidUluQ2F2ZSA9IG1vdmFibGUoMHgwM2EsIFRSQUNLKTtcbiAgVGFsa2VkVG9aZWJ1SW5TaHlyb24gPSBtb3ZhYmxlKDB4MDNiLCBUUkFDSyk7XG4gIDB4MDNjID0gb2Jzb2xldGUoMHgxM2IpOyAvLyBjaGVzdDogbG92ZSBwZW5kYW50XG4gIDB4MDNkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FzaW5hIGluIFNoeXJvbiB0ZW1wbGUnKTtcbiAgRm91bmRLZW5zdUluRGFuY2VIYWxsID0gbW92YWJsZSgweDAzZSwgVFJBQ0spO1xuICAweDAzZiA9IG9ic29sZXRlKChzKSA9PiB7XG4gICAgaWYgKHMudHJpZ2dlcj8uaWQgPT09IDB4YmEpIHJldHVybiAweDI0NCAvLyBpdGVtOiB0ZWxlcG9ydFxuICAgIHJldHVybiAweDE0NDsgLy8gY2hlY2s6IHRlbGVwb3J0XG4gIH0pO1xuXG4gIC8vIDA0eFxuICAweDA0MCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3JuZWwgaW4gU2h5cm9uIHRlbXBsZScpO1xuICAweDA0MSA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICAvLyB1bnVzZWQgMDQyXG4gIC8vIHVudXNlZCAweDA0MyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsnKTtcbiAgMHgwNDQgPSBvYnNvbGV0ZSgweDEwNyk7IC8vIGNoZWNrOiBiYWxsIG9mIGZpcmUgLyBpbnNlY3RcbiAgUmVzY3VlZENoaWxkID0gZml4ZWQoMHgwNDUsIFRSQUNLKTsgLy8gaGFyZGNvZGVkICQzZTdkNVxuICBVc2VkSW5zZWN0Rmx1dGUgPSBmaXhlZCgweDA0Nik7IC8vIGN1c3RvbS1hZGRlZCAkNjQ4ODo0MFxuICBSZXNjdWVkTGVhZkVsZGVyID0gbW92YWJsZSgweDA0Nyk7XG4gIDB4MDQ4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1RyZWFzdXJlIGh1bnRlciBlbWJhcmtlZCcpO1xuICAweDA0OSA9IG9ic29sZXRlKDB4MTAxKTsgLy8gY2hlY2s6IHN3b3JkIG9mIGZpcmVcbiAgMHgwNGEgPSBkaWFsb2dQcm9ncmVzc2lvbignQm9hdCBvd25lcicpO1xuICAweDA0YiA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHNpY2sgbWVuJyk7XG4gIDB4MDRjID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gdHJhaW5pbmcgbWVuIDEnKTtcbiAgMHgwNGQgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiB0cmFpbmluZyBtZW4gMicpO1xuICAweDA0ZSA9IG9ic29sZXRlKDB4MTA2KTsgLy8gY2hlc3Q6IHRvcm5hZG8gYnJhY2VsZXRcbiAgMHgwNGYgPSBvYnNvbGV0ZSgweDEyYik7IC8vIGNoZWNrOiB3YXJyaW9yIHJpbmdcblxuICAvLyAwNXhcbiAgR2l2ZW5TdGF0dWVUb0FrYWhhbmEgPSBtb3ZhYmxlKDB4MDUwKTsgLy8gZ2l2ZSBpdCBiYWNrIGlmIHVuc3VjY2Vzc2Z1bD9cbiAgMHgwNTEgPSBvYnNvbGV0ZSgweDE0Nik7IC8vIGNoZWNrOiBiYXJyaWVyIC8gYW5ncnkgc2VhXG4gIFRhbGtlZFRvRHdhcmZNb3RoZXIgPSBtb3ZhYmxlKDB4MDUyLCBUUkFDSyk7XG4gIExlYWRpbmdDaGlsZCA9IGZpeGVkKDB4MDUzLCBUUkFDSyk7IC8vIGhhcmRjb2RlZCAkM2U3YzQgYW5kIGZvbGxvd2luZ1xuICAvLyB1bnVzZWQgMDU0XG4gIDB4MDU1ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1plYnUgcmVzY3VlZCcpO1xuICAweDA1NiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3JuZWwgcmVzY3VlZCcpO1xuICAweDA1NyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBc2luYSByZXNjdWVkJyk7XG4gIC8vIHVudXNlZCAwNTggLi4gMDVhXG4gIE10U2FicmVHdWFyZHNEZXNwYXduZWQgPSBtb3ZhYmxlKDB4MDViLCBUUlVFKTtcbiAgLy8gdW51c2VkIDA1YywgMDVkXG4gIDB4MDVlID0gb2Jzb2xldGUoMHgyOGQpOyAvLyBkcmF5Z29uIDJcbiAgMHgwNWYgPSBvYnNvbGV0ZSgweDIwMyk7IC8vIGl0ZW06IHN3b3JkIG9mIHRodW5kZXJcbiAgLy8gVE9ETyAtIGZpeCB1cCB0aGUgTlBDIHNwYXduIGFuZCB0cmlnZ2VyIGNvbmRpdGlvbnMgaW4gU2h5cm9uLlxuICAvLyBNYXliZSBqdXN0IHJlbW92ZSB0aGUgY3V0c2NlbmUgZW50aXJlbHk/XG5cbiAgLy8gMDZ4XG4gIC8vIHVudXNlZCAwNjBcbiAgVGFsa2VkVG9TdG9tSW5Td2FuID0gbW92YWJsZSgweDA2MSwgVFJBQ0spO1xuICAweDA2MiA9IG9ic29sZXRlKDB4MTUxKTsgLy8gY2hlc3Q6IHNhY3JlZCBzaGllbGRcbiAgMHgwNjMgPSBvYnNvbGV0ZSgweDE0Nyk7IC8vIGNoZWNrOiBjaGFuZ2VcbiAgLy8gdW51c2VkIDA2NFxuICAvLyBTd2FuR2F0ZU9wZW5lZCA9IG1vdmFibGUofjB4MDY0KTsgLy8gd2h5IHdvdWxkIHdlIGFkZCB0aGlzPyB1c2UgMmIzXG4gIEN1cmVkS2Vuc3UgPSBtb3ZhYmxlKDB4MDY1LCBUUkFDSyk7XG4gIC8vIHVudXNlZCAwNjZcbiAgMHgwNjcgPSBvYnNvbGV0ZSgweDEwYik7IC8vIGNoZWNrOiBiYWxsIG9mIHRodW5kZXIgLyBtYWRvIDFcbiAgMHgwNjggPSBvYnNvbGV0ZSgweDEwNCk7IC8vIGNoZWNrOiBmb3JnZWQgY3J5c3RhbGlzXG4gIC8vIHVudXNlZCAwNjlcbiAgU3RvbmVkUGVvcGxlQ3VyZWQgPSBtb3ZhYmxlKDB4MDZhLCBUUkFDSyk7XG4gIC8vIHVudXNlZCAwNmJcbiAgMHgwNmMgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgLy8gdW51c2VkIDA2ZCAuLiAwNmZcbiAgQ3VycmVudGx5UmlkaW5nRG9scGhpbiA9IGZpeGVkKH4weDA2ZSwgVFJBQ0spOyAvLywgeyAvLyBOT1RFOiBhZGRlZCBieSByYW5kb1xuICAvLyAgIGFsaWFzOiByb20gPT4gW3JvbS5pdGVtcy5TaGVsbEZsdXRlLml0ZW1Vc2VEYXRhWzBdLndhbnRdLFxuICAvLyB9KTtcblxuICAvLyAwN3hcbiAgUGFyYWx5emVkS2Vuc3VJblRhdmVybiA9IGZpeGVkKDB4MDcwKTsgLy8sIHsgLy8gaGFyZGNvZGVkIGluIHJhbmRvIHByZXNodWZmbGUuc1xuICAvLyAgIGFsaWFzOiByb20gPT4gW3JvbS5mbGFncy5QYXJhbHlzaXMuaWRdLFxuICAvLyB9KTtcbiAgUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCA9IGZpeGVkKDB4MDcxKTsgLy8sIHsgLy8gaGFyZGNvZGVkIGluIHJhbmRvIHByZXNodWZmbGUuc1xuICAvLyAgIGFsaWFzOiByb20gPT4gW3JvbS5mbGFncy5QYXJhbHlzaXMuaWRdLFxuICAvLyB9KTtcbiAgRm91bmRLZW5zdUluVGF2ZXJuID0gbW92YWJsZSgweDA3MiwgVFJBQ0spO1xuICAweDA3MyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTdGFydGxlZCBtYW4gaW4gTGVhZicpO1xuICAvLyB1bnVzZWQgMDc0XG4gIDB4MDc1ID0gb2Jzb2xldGUoMHgxMzkpOyAvLyBjaGVjazogZ2xvd2luZyBsYW1wXG4gIDB4MDc2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0tlbnN1IGluIEdvYScpO1xuICAweDA3NyA9IG9ic29sZXRlKDB4MTA4KTsgLy8gY2hlY2s6IGZsYW1lIGJyYWNlbGV0IC8ga2VsYmVzcXVlIDFcbiAgMHgwNzggPSBvYnNvbGV0ZSgweDEwYyk7IC8vIGNoZXN0OiBzdG9ybSBicmFjZWxldFxuICAweDA3OSA9IG9ic29sZXRlKDB4MTQwKTsgLy8gY2hlY2s6IGJvdyBvZiB0cnV0aFxuICAweDA3YSA9IG9ic29sZXRlKDB4MTBhKTsgLy8gY2hlc3Q6IGJsaXp6YXJkIGJyYWNlbGV0XG4gIDB4MDdiID0gb2Jzb2xldGUoMHgxMDkpOyAvLyByYWdlL2JhbGwgb2Ygd2F0ZXJcbiAgLy8gdW51c2VkIDA3YiwgMDdjXG4gIDB4MDdkID0gb2Jzb2xldGUoMHgxM2YpOyAvLyBjaGVzdDogYm93IG9mIHN1blxuICAweDA3ZSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdNdCBTYWJyZSBndWFyZHMgMScpO1xuICAweDA3ZiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdNdCBTYWJyZSBndWFyZHMgMicpO1xuXG4gIEFsYXJtRmx1dGVVc2VkT25jZSA9IGZpeGVkKDB4NzYpOyAvLyBoYXJkY29kZWQ6IHByZXNodWZmbGUucyBQYXRjaFRyYWRlSW5JdGVtXG4gIEZsdXRlT2ZMaW1lVXNlZE9uY2UgPSBmaXhlZCgweDc3KTsgLy8gaGFyZGNvZGVkOiBwcmVzaHVmZmxlLnMgUGF0Y2hUcmFkZUluSXRlbVxuXG4gIC8vIDA4eFxuICAvLyB1bnVzZWQgMDgwLCAwODFcbiAgMHgwODIgPSBvYnNvbGV0ZSgweDE0MCk7IC8vIGNoZWNrOiBib3cgb2YgdHJ1dGggLyBhenRlY2FcbiAgMHgwODMgPSBkaWFsb2dQcm9ncmVzc2lvbignUmVzY3VlZCBMZWFmIGVsZGVyJyk7XG4gIExlYWZWaWxsYWdlcnNDdXJyZW50bHlBYmR1Y3RlZCA9IG1vdmFibGUoMHgwODQpO1xuICBMZWFmRWxkZXJDdXJyZW50bHlBYmR1Y3RlZCA9IG1vdmFibGUoMHgwODUpO1xuICAvL1VzZWRCb3dPZlRydXRoID0gbW92YWJsZSgweDA4Nik7ICAvLyBtb3ZlZCBtYW51YWxseSBhdCBwcmVwYXJzZSB0byAyZlxuICAweDA4NyA9IG9ic29sZXRlKDB4MTA1KTsgLy8gY2hlc3Q6IGJhbGwgb2Ygd2luZFxuICAweDA4OCA9IG9ic29sZXRlKDB4MTMyKTsgLy8gY2hlY2s6IHdpbmRtaWxsIGtleVxuICAweDA4OSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFN0b21cXCdzIGdpcmxmcmllbmQnKTtcbiAgMHgwOGEgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTdG9tJyk7XG4gIDB4MDhiID0gb2Jzb2xldGUoMHgyMzYpOyAvLyBpdGVtOiBzaGVsbCBmbHV0ZVxuICAvLyB1bnVzZWQgMHgwOGMgPSBkaWFsb2dQcm9ncmVzc2lvbignU3dhbiBndWFyZHMgZGVzcGF3bmVkJyk7XG4gIDB4MDhkID0gb2Jzb2xldGUoMHgxMzcpOyAvLyBjaGVjazogZXllIGdsYXNzZXNcbiAgLy8gdW51c2VkIDA4ZVxuICAweDA4ZiA9IG9ic29sZXRlKDB4MjgzKTsgLy8gZXZlbnQ6IGNhbG1lZCBzZWFcblxuICAvLyAwOXhcbiAgMHgwOTAgPSBkaWFsb2dQcm9ncmVzc2lvbignU3RvbmVkIHBlb3BsZSBnb25lJyk7XG4gIC8vIHVudXNlZCAwOTFcbiAgMHgwOTIgPSBvYnNvbGV0ZSgweDEyOCk7IC8vIGNoZWNrOiBmbHV0ZSBvZiBsaW1lXG4gIC8vIHVudXNlZCAwOTMgLi4gMDk1XG4gIDB4MDk2ID0gZGlhbG9nVG9nZ2xlKCdMZWFmIGVsZGVyIGRhdWdodGVyJyk7XG4gIDB4MDk3ID0gZGlhbG9nVG9nZ2xlKCdMZWFmIHZpbGxhZ2VyJyk7XG4gIDB4MDk4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ05hZGFyZSB2aWxsYWdlcicpO1xuICAvLyB1bnVzZWQgMDk5LCAwOWFcbiAgQWJsZVRvUmlkZURvbHBoaW4gPSBtb3ZhYmxlKDB4MDliLCBUUkFDSyk7XG4gIFBvcnRvYVF1ZWVuR29pbmdBd2F5ID0gbW92YWJsZSgweDA5Yyk7XG4gIC8vIHVudXNlZCAwOWQgLi4gMDlmXG5cbiAgLy8gMGF4XG4gIDB4MGEwID0gb2Jzb2xldGUoMHgxMjcpOyAvLyBjaGVjazogaW5zZWN0IGZsdXRlXG4gIC8vIHVudXNlZCAwYTEsIDBhMlxuICAweDBhMyA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuL2ZvcnR1bmUgdGVsbGVyJyk7XG4gIFdva2VLZW5zdUluTGlnaHRob3VzZSA9IG1vdmFibGUoMHgwYTQsIFRSQUNLKTtcbiAgLy8gVE9ETzogdGhpcyBtYXkgbm90IGJlIG9ic29sZXRlIGlmIHRoZXJlJ3Mgbm8gaXRlbSBoZXJlP1xuICAweDBhNSA9IG9ic29sZXRlKDB4MTMxKTsgLy8gY2hlY2s6IGFsYXJtIGZsdXRlIC8gemVidSBzdHVkZW50XG4gIC8vIE5PVEU6IG1hcmsgdGhlIG9hayBlbGRlciBwcm9ncmVzc2lvbiBhcyBhc3N1bWVkIGZhbHNlIGJlY2F1c2Ugb3RoZXJ3aXNlXG4gIC8vIGlmIHRoZXkncmUgaWdub3JlZCB0aGUgbG9naWMgdGhpbmtzIHRoZSBlbGRlcidzIGl0ZW0gaXMgZnJlZSAoaWYgdGhlc2VcbiAgLy8gd2VyZSB0cmFja2VkLCB3ZSdkIHJlYWxpemUgaXQncyBjb25kaXRpb25hbCBvbiBhbHJlYWR5IGhhdmluZyB0aGUgaXRlbSkuXG4gIDB4MGE2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09hayBlbGRlciAxJywgRkFMU0UpO1xuICAweDBhNyA9IGRpYWxvZ1RvZ2dsZSgnU3dhbiBkYW5jZXInKTtcbiAgMHgwYTggPSBkaWFsb2dQcm9ncmVzc2lvbignT2FrIGVsZGVyIDInLCBGQUxTRSk7XG4gIFRhbGtlZFRvTGVhZlJhYmJpdCA9IG1vdmFibGUoMHgwYTksIFRSQUNLKTtcbiAgMHgwYWEgPSBvYnNvbGV0ZSgweDExZCk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWIgPSBvYnNvbGV0ZSgweDE1MCk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgLy8gdW51c2VkIDBhY1xuICAweDBhZCA9IG9ic29sZXRlKDB4MTUyKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBhZSA9IG9ic29sZXRlKDB4MTUzKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBhZiA9IG9ic29sZXRlKDB4MTU0KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcblxuICAvLyAwYnhcbiAgMHgwYjAgPSBvYnNvbGV0ZSgweDE1NSk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjEgPSBvYnNvbGV0ZSgweDE1Nik7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjIgPSBvYnNvbGV0ZSgweDE1Nyk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjMgPSBvYnNvbGV0ZSgweDE1OCk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGI0ID0gb2Jzb2xldGUoMHgxNTkpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGI1ID0gb2Jzb2xldGUoMHgxNWEpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYjYgPSBvYnNvbGV0ZSgweDExZik7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiNyA9IG9ic29sZXRlKDB4MTVjKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI4ID0gb2Jzb2xldGUoMHgxNWQpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjkgPSBvYnNvbGV0ZSgweDExZSk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYSA9IG9ic29sZXRlKDB4MTVlKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJiID0gb2Jzb2xldGUoMHgxNWYpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmMgPSBvYnNvbGV0ZSgweDE2MCk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiZCA9IG9ic29sZXRlKDB4MTIwKTsgLy8gY2hlc3Q6IGZydWl0IG9mIGxpbWVcbiAgMHgwYmUgPSBvYnNvbGV0ZSgweDEyMSk7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuICAweDBiZiA9IG9ic29sZXRlKDB4MTYyKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG5cbiAgLy8gMGN4XG4gIDB4MGMwID0gb2Jzb2xldGUoMHgxNjMpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwYzEgPSBvYnNvbGV0ZSgweDE2NCk7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuICAweDBjMiA9IG9ic29sZXRlKDB4MTIyKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzMgPSBvYnNvbGV0ZSgweDE2NSk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGM0ID0gb2Jzb2xldGUoMHgxNjYpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcmVwdW5cbiAgMHgwYzUgPSBvYnNvbGV0ZSgweDE2Yik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGM2ID0gb2Jzb2xldGUoMHgxNmMpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNyA9IG9ic29sZXRlKDB4MTIzKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHJlcHVuXG4gIDB4MGM4ID0gb2Jzb2xldGUoMHgxMjQpOyAvLyBjaGVzdDogd2FycCBib290c1xuICAweDBjOSA9IG9ic29sZXRlKDB4MTZhKTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwY2EgPSBvYnNvbGV0ZSgweDEzZCk7IC8vIGNoZWNrOiBpdm9yeSBzdGF0dWUgLyBrYXJtaW5lXG4gIDB4MGNiID0gb2Jzb2xldGUoMHgxMmEpOyAvLyBjaGVzdDogcG93ZXIgcmluZ1xuICAweDBjYyA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAweDBjZCA9IG9ic29sZXRlKDB4MTE0KTsgLy8gY2hlc3Q6IHBzeWNobyBzaGllbGRcbiAgMHgwY2UgPSBvYnNvbGV0ZSgweDEyNSk7IC8vIGNoZXN0OiBzdGF0dWUgb2Ygb255eFxuICAweDBjZiA9IG9ic29sZXRlKDB4MTMzKTsgLy8gY2hlc3Q6IGtleSB0byBwcmlzb25cbiAgXG4gIC8vIDBkeFxuICAweDBkMCA9IG9ic29sZXRlKDB4MTI4KTsgLy8gY2hlY2s6IGZsdXRlIG9mIGxpbWUgLyBxdWVlblxuICAweDBkMSA9IG9ic29sZXRlKDB4MTM1KTsgLy8gY2hlc3Q6IGZvZyBsYW1wXG4gIDB4MGQyID0gb2Jzb2xldGUoMHgxNjkpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBkMyA9IG9ic29sZXRlKDB4MTI2KTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGQ0ID0gb2Jzb2xldGUoMHgxNWIpOyAvLyBjaGVzdDogZmx1dGUgb2YgbGltZVxuICAweDBkNSA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDEnKTtcbiAgMHgwZDYgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAyJyk7XG4gIDB4MGQ3ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMycpO1xuICAweDBkOCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSByZXNjdWVkJyk7XG4gIDB4MGQ5ID0gZGlhbG9nVG9nZ2xlKCdTdG9uZWQgcGFpcicpO1xuICAweDBkYSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSBnb25lIGZyb20gdGF2ZXJuJyk7XG4gIDB4MGRiID0gZGlhbG9nVG9nZ2xlKCdJbiBTYWJlcmFcXCdzIHRyYXAnKTtcbiAgMHgwZGMgPSBvYnNvbGV0ZSgweDE2Zik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGRkID0gb2Jzb2xldGUoMHgxNzApOyAvLyBtaW1pYz8/IG1lZGljYWwgaGVyYj8/XG4gIDB4MGRlID0gb2Jzb2xldGUoMHgxMmMpOyAvLyBjaGVzdDogaXJvbiBuZWNrbGFjZVxuICAweDBkZiA9IG9ic29sZXRlKDB4MTFiKTsgLy8gY2hlc3Q6IGJhdHRsZSBhcm1vclxuXG4gIC8vIDBleFxuICAweDBlMCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIEFrYWhhbmEnKTtcbiAgLy8gdW51c2VkIDBlMSAuLiAwZTNcbiAgMHgwZTQgPSBvYnNvbGV0ZSgweDEzYyk7IC8vIGNoZXN0OiBraXJpc2EgcGxhbnRcbiAgMHgwZTUgPSBvYnNvbGV0ZSgweDE2ZSk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGU2ID0gb2Jzb2xldGUoMHgxNmQpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwZTcgPSBvYnNvbGV0ZSgweDEyZik7IC8vIGNoZXN0OiBsZWF0aGVyIGJvb3RzXG4gIDB4MGU4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU2h5cm9uIHZpbGxhZ2VyJyk7XG4gIDB4MGU5ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU2h5cm9uIGd1YXJkJyk7XG4gIDB4MGVhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMScpO1xuICAweDBlYiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDInKTtcbiAgMHgwZWMgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAzJyk7XG4gIDB4MGVkID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ01lc2lhJyk7XG4gIC8vIHVudXNlZCAwZWUgLi4gMGZmXG4gIFRhbGtlZFRvWmVidVN0dWRlbnQgPSBtb3ZhYmxlKDB4MGVlLCBUUkFDSyk7XG5cbiAgLy8gMTAwXG4gIDB4MTAwID0gb2Jzb2xldGUoMHgxMmUpOyAvLyBjaGVjazogcmFiYml0IGJvb3RzIC8gdmFtcGlyZVxuICAweDEwMSA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICAweDEwMiA9IG9ic29sZXRlKDB4MTA4KTsgLy8gY2hlY2s6IGZsYW1lIGJyYWNlbGV0IC8ga2VsYmVzcXVlIDFcbiAgMHgxMDMgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIGNoZWNrOiBiYWxsIG9mIHdhdGVyIC8gcmFnZVxuICAvLyB1bnVzZWQgMTA0XG4gIDB4MTA1ID0gb2Jzb2xldGUoMHgxMjYpOyAvLyBjaGVjazogb3BlbCBzdGF0dWUgLyBrZWxiZXNxdWUgMlxuICAweDEwNiA9IG9ic29sZXRlKDB4MTIzKTsgLy8gY2hlY2s6IGZydWl0IG9mIHJlcHVuIC8gc2FiZXJhIDJcbiAgMHgxMDcgPSBvYnNvbGV0ZSgweDExMik7IC8vIGNoZWNrOiBzYWNyZWQgc2hpZWxkIC8gbWFkbyAyXG4gIDB4MTA4ID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICBVc2VkQm93T2ZNb29uID0gbW92YWJsZSgweDEwOSk7XG4gIFVzZWRCb3dPZlN1biA9IG1vdmFibGUoMHgxMGEpO1xuICAweDEwYiA9IG9ic29sZXRlKDB4MTFjKTsgLy8gY2hlY2s6IHBzeWNobyBhcm1vciAvIGRyYXlnb24gMVxuICAweDEwYyA9IG9ic29sZXRlKDB4MTYxKTsgLy8gY2hlY2s6IGZydWl0IG9mIHBvd2VyIC8gdmFtcGlyZSAyXG5cbiAgLy8gMTAwIC4uIDE3ZiA9PiBmaXhlZCBmbGFncyBmb3IgY2hlY2tzLlxuXG4gIC8vIFRPRE8gLSBhcmUgdGhlc2UgYWxsIFRSQUNLIG9yIGp1c3QgdGhlIG5vbi1jaGVzdHM/IT9cblxuICAvLyBUT0RPIC0gYmFzaWMgaWRlYSAtIE5QQyBoaXRib3ggZXh0ZW5kcyBkb3duIG9uZSB0aWxlPyAoaXMgdGhhdCBlbm91Z2g/KVxuICAvLyAgICAgIC0gc3RhdHVlcyBjYW4gYmUgZW50ZXJlZCBidXQgbm90IGV4aXRlZD9cbiAgLy8gICAgICAtIHVzZSB0cmlnZ2VyICh8IHBhcmFseXNpcyB8IGdsaXRjaCkgZm9yIG1vdmluZyBzdGF0dWVzP1xuICAvLyAgICAgICAgICAtPiBnZXQgbm9ybWFsIHJlcXVpcmVtZW50cyBmb3IgZnJlZVxuICAvLyAgICAgICAgICAtPiBiZXR0ZXIgaGl0Ym94PyAgYW55IHdheSB0byBnZXQgcXVlZW4gdG8gd29yaz8gdG9vIG11Y2ggc3RhdGU/XG4gIC8vICAgICAgICAgICAgIG1heSBuZWVkIHRvIGhhdmUgdHdvIGRpZmZlcmVudCB0aHJvbmUgcm9vbXM/IChmdWxsL2VtcHR5KVxuICAvLyAgICAgICAgICAgICBhbmQgaGF2ZSBmbGFnIHN0YXRlIGFmZmVjdCBleGl0Pz8/XG4gIC8vICAgICAgLSBhdCB0aGUgdmVyeSBsZWFzdCB3ZSBjYW4gdXNlIGl0IGZvciB0aGUgaGl0Ym94LCBidXQgd2UgbWF5IHN0aWxsXG4gIC8vICAgICAgICBuZWVkIGN1c3RvbSBvdmVybGF5P1xuXG4gIC8vIFRPRE8gLSBwc2V1ZG8gZmxhZ3Mgc29tZXdoZXJlPyAgbGlrZSBzd29yZD8gYnJlYWsgaXJvbj8gZXRjLi4uXG5cbiAgTGVhZkVsZGVyID0gdHJhY2tlZCh+MHgxMDApO1xuICBPYWtFbGRlciA9IHRyYWNrZWQofjB4MTAxKTtcbiAgV2F0ZXJmYWxsQ2F2ZVN3b3JkT2ZXYXRlckNoZXN0ID0gdHJhY2tlZCh+MHgxMDIpO1xuICBTdHh5TGVmdFVwcGVyU3dvcmRPZlRodW5kZXJDaGVzdCA9IHRyYWNrZWQofjB4MTAzKTtcbiAgTWVzaWFJblRvd2VyID0gdHJhY2tlZCgweDEwNCk7XG4gIFNlYWxlZENhdmVCYWxsT2ZXaW5kQ2hlc3QgPSB0cmFja2VkKH4weDEwNSk7XG4gIE10U2FicmVXZXN0VG9ybmFkb0JyYWNlbGV0Q2hlc3QgPSB0cmFja2VkKH4weDEwNik7XG4gIEdpYW50SW5zZWN0ID0gdHJhY2tlZCh+MHgxMDcpO1xuICBLZWxiZXNxdWUxID0gdHJhY2tlZCh+MHgxMDgpO1xuICBSYWdlID0gdHJhY2tlZCh+MHgxMDkpO1xuICBBcnlsbGlzQmFzZW1lbnRDaGVzdCA9IHRyYWNrZWQofjB4MTBhKTtcbiAgTWFkbzEgPSB0cmFja2VkKH4weDEwYik7XG4gIFN0b3JtQnJhY2VsZXRDaGVzdCA9IHRyYWNrZWQofjB4MTBjKTtcbiAgV2F0ZXJmYWxsQ2F2ZVJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDExMCk7IC8vIHJhbmRvIGNoYW5nZWQgaW5kZXghXG4gIE1hZG8yID0gdHJhY2tlZCgweDExMik7XG4gIFN0eHlSaWdodE1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDExNCk7XG4gIEJhdHRsZUFybW9yQ2hlc3QgPSB0cmFja2VkKDB4MTFiKTtcbiAgRHJheWdvbjEgPSB0cmFja2VkKDB4MTFjKTtcbiAgU2VhbGVkQ2F2ZVNtYWxsUm9vbUJhY2tDaGVzdCA9IHRyYWNrZWQoMHgxMWQpOyAvLyBtZWRpY2FsIGhlcmJcbiAgU2VhbGVkQ2F2ZUJpZ1Jvb21Ob3J0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxMWUpOyAvLyBhbnRpZG90ZVxuICBGb2dMYW1wQ2F2ZUZyb250Q2hlc3QgPSB0cmFja2VkKDB4MTFmKTsgLy8gbHlzaXMgcGxhbnRcbiAgTXRIeWRyYVJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTIwKTsgLy8gZnJ1aXQgb2YgbGltZVxuICBTYWJlcmFVcHN0YWlyc0xlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMjEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBFdmlsU3Bpcml0SXNsYW5kTG93ZXJDaGVzdCA9IHRyYWNrZWQoMHgxMjIpOyAvLyBtYWdpYyByaW5nXG4gIFNhYmVyYTIgPSB0cmFja2VkKDB4MTIzKTsgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgU2VhbGVkQ2F2ZVNtYWxsUm9vbUZyb250Q2hlc3QgPSB0cmFja2VkKDB4MTI0KTsgLy8gd2FycCBib290c1xuICBDb3JkZWxHcmFzcyA9IHRyYWNrZWQoMHgxMjUpO1xuICBLZWxiZXNxdWUyID0gdHJhY2tlZCgweDEyNik7IC8vIG9wZWwgc3RhdHVlXG4gIE9ha01vdGhlciA9IHRyYWNrZWQoMHgxMjcpO1xuICBQb3J0b2FRdWVlbiA9IHRyYWNrZWQoMHgxMjgpO1xuICBBa2FoYW5hU3RhdHVlT2ZPbnl4VHJhZGVpbiA9IHRyYWNrZWQoMHgxMjkpO1xuICBPYXNpc0NhdmVGb3J0cmVzc0Jhc2VtZW50Q2hlc3QgPSB0cmFja2VkKDB4MTJhKTtcbiAgQnJva2FoYW5hID0gdHJhY2tlZCgweDEyYik7XG4gIEV2aWxTcGlyaXRJc2xhbmRSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMmMpO1xuICBEZW8gPSB0cmFja2VkKDB4MTJkKTtcbiAgVmFtcGlyZTEgPSB0cmFja2VkKDB4MTJlKTtcbiAgT2FzaXNDYXZlTm9ydGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTJmKTtcbiAgQWthaGFuYUZsdXRlT2ZMaW1lVHJhZGVpbiA9IHRyYWNrZWQoMHgxMzApO1xuICBaZWJ1U3R1ZGVudCA9IHRyYWNrZWQoMHgxMzEpOyAvLyBUT0RPIC0gbWF5IG9wdCBmb3IgMiBpbiBjYXZlIGluc3RlYWQ/XG4gIFdpbmRtaWxsR3VhcmRBbGFybUZsdXRlVHJhZGVpbiA9IHRyYWNrZWQoMHgxMzIpO1xuICBNdFNhYnJlTm9ydGhCYWNrT2ZQcmlzb25DaGVzdCA9IHRyYWNrZWQoMHgxMzMpO1xuICBaZWJ1SW5TaHlyb24gPSB0cmFja2VkKDB4MTM0KTtcbiAgRm9nTGFtcENhdmVCYWNrQ2hlc3QgPSB0cmFja2VkKDB4MTM1KTtcbiAgSW5qdXJlZERvbHBoaW4gPSB0cmFja2VkKDB4MTM2KTtcbiAgQ2xhcmsgPSB0cmFja2VkKDB4MTM3KTtcbiAgU2FiZXJhMSA9IHRyYWNrZWQoMHgxMzgpO1xuICBLZW5zdUluTGlnaHRob3VzZSA9IHRyYWNrZWQoMHgxMzkpO1xuICBSZXBhaXJlZFN0YXR1ZSA9IHRyYWNrZWQoMHgxM2EpO1xuICBVbmRlcmdyb3VuZENoYW5uZWxVbmRlcndhdGVyQ2hlc3QgPSB0cmFja2VkKDB4MTNiKTtcbiAgS2lyaXNhTWVhZG93ID0gdHJhY2tlZCgweDEzYyk7XG4gIEthcm1pbmUgPSB0cmFja2VkKDB4MTNkKTtcbiAgQXJ5bGxpcyA9IHRyYWNrZWQoMHgxM2UpO1xuICBNdEh5ZHJhU3VtbWl0Q2hlc3QgPSB0cmFja2VkKDB4MTNmKTtcbiAgQXp0ZWNhSW5QeXJhbWlkID0gdHJhY2tlZCgweDE0MCk7XG4gIFplYnVBdFdpbmRtaWxsID0gdHJhY2tlZCgweDE0MSk7XG4gIE10U2FicmVOb3J0aFN1bW1pdCA9IHRyYWNrZWQoMHgxNDIpO1xuICBTdG9tRmlnaHRSZXdhcmQgPSB0cmFja2VkKDB4MTQzKTtcbiAgTXRTYWJyZVdlc3RUb3JuZWwgPSB0cmFja2VkKDB4MTQ0KTtcbiAgQXNpbmFJbkJhY2tSb29tID0gdHJhY2tlZCgweDE0NSk7XG4gIEJlaGluZFdoaXJscG9vbCA9IHRyYWNrZWQoMHgxNDYpO1xuICBLZW5zdUluU3dhbiA9IHRyYWNrZWQoMHgxNDcpO1xuICBTbGltZWRLZW5zdSA9IHRyYWNrZWQoMHgxNDgpO1xuICBTZWFsZWRDYXZlQmlnUm9vbVNvdXRod2VzdENoZXN0ID0gdHJhY2tlZCgweDE1MCk7IC8vIG1lZGljYWwgaGVyYlxuICAvLyB1bnVzZWQgMTUxIHNhY3JlZCBzaGllbGQgY2hlc3RcbiAgTXRTYWJyZVdlc3RSaWdodENoZXN0ID0gdHJhY2tlZCgweDE1Mik7IC8vIG1lZGljYWwgaGVyYlxuICBNdFNhYnJlTm9ydGhNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNTMpOyAvLyBtZWRpY2FsIGhlcmJcbiAgRm9ydHJlc3NNYWRvSGVsbHdheUNoZXN0ID0gdHJhY2tlZCgweDE1NCk7IC8vIG1hZ2ljIHJpbmdcbiAgU2FiZXJhVXBzdGFpcnNSaWdodENoZXN0ID0gdHJhY2tlZCgweDE1NSk7IC8vIG1lZGljYWwgaGVyYiBhY3Jvc3Mgc3Bpa2VzXG4gIE10SHlkcmFGYXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTU2KTsgLy8gbWVkaWNhbCBoZXJiXG4gIFN0eHlMZWZ0TG93ZXJDaGVzdCA9IHRyYWNrZWQoMHgxNTcpOyAvLyBtZWRpY2FsIGhlcmJcbiAgS2FybWluZUJhc2VtZW50TG93ZXJNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNTgpOyAvLyBtYWdpYyByaW5nXG4gIEVhc3RDYXZlTm9ydGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTU5KTsgLy8gbWVkaWNhbCBoZXJiICh1bnVzZWQpXG4gIE9hc2lzQ2F2ZUVudHJhbmNlQWNyb3NzUml2ZXJDaGVzdCA9IHRyYWNrZWQoMHgxNWEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICAvLyB1bnVzZWQgMTViIDJuZCBmbHV0ZSBvZiBsaW1lIC0gY2hhbmdlZCBpbiByYW5kb1xuICAvLyBXYXRlcmZhbGxDYXZlUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTViKTsgLy8gMm5kIGZsdXRlIG9mIGxpbWVcbiAgRXZpbFNwaXJpdElzbGFuZEV4aXRDaGVzdCA9IHRyYWNrZWQoMHgxNWMpOyAvLyBseXNpcyBwbGFudFxuICBGb3J0cmVzc1NhYmVyYU1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1ZCk7IC8vIGx5c2lzIHBsYW50XG4gIE10U2FicmVOb3J0aFVuZGVyQnJpZGdlQ2hlc3QgPSB0cmFja2VkKDB4MTVlKTsgLy8gYW50aWRvdGVcbiAgS2lyaXNhUGxhbnRDYXZlQ2hlc3QgPSB0cmFja2VkKDB4MTVmKTsgLy8gYW50aWRvdGVcbiAgRm9ydHJlc3NNYWRvVXBwZXJOb3J0aENoZXN0ID0gdHJhY2tlZCgweDE2MCk7IC8vIGFudGlkb3RlXG4gIFZhbXBpcmUyID0gdHJhY2tlZCgweDE2MSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEZvcnRyZXNzU2FiZXJhTm9ydGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTYyKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRm9ydHJlc3NNYWRvTG93ZXJDZW50ZXJOb3J0aENoZXN0ID0gdHJhY2tlZCgweDE2Myk7IC8vIG9wZWwgc3RhdHVlXG4gIE9hc2lzQ2F2ZU5lYXJFbnRyYW5jZUNoZXN0ID0gdHJhY2tlZCgweDE2NCk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIE10SHlkcmFMZWZ0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNjUpOyAvLyBtYWdpYyByaW5nXG4gIEZvcnRyZXNzU2FiZXJhU291dGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTY2KTsgLy8gZnJ1aXQgb2YgcmVwdW5cbiAgS2Vuc3VJbkNhYmluID0gdHJhY2tlZCgweDE2Nyk7IC8vIGFkZGVkIGJ5IHJhbmRvbWl6ZXIgaWYgZm9nIGxhbXAgbm90IG5lZWRlZFxuICAvLyB1bnVzZWQgMTY4IG1hZ2ljIHJpbmcgY2hlc3RcbiAgTXRTYWJyZVdlc3ROZWFyS2Vuc3VDaGVzdCA9IHRyYWNrZWQoMHgxNjkpOyAvLyBtYWdpYyByaW5nXG4gIE10U2FicmVXZXN0TGVmdENoZXN0ID0gdHJhY2tlZCgweDE2YSk7IC8vIHdhcnAgYm9vdHNcbiAgRm9ydHJlc3NNYWRvVXBwZXJCZWhpbmRXYWxsQ2hlc3QgPSB0cmFja2VkKDB4MTZiKTsgLy8gbWFnaWMgcmluZ1xuICBQeXJhbWlkQ2hlc3QgPSB0cmFja2VkKDB4MTZjKTsgLy8gbWFnaWMgcmluZ1xuICBDcnlwdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTZkKTsgLy8gb3BlbCBzdGF0dWVcbiAgS2FybWluZUJhc2VtZW50TG93ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTZlKTsgLy8gd2FycCBib290c1xuICBGb3J0cmVzc01hZG9Mb3dlclNvdXRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE2Zik7IC8vIG1hZ2ljIHJpbmdcbiAgLy8gPSB0cmFja2VkKDB4MTcwKTsgLy8gbWltaWMgLyBtZWRpY2FsIGhlcmJcbiAgLy8gVE9ETyAtIGFkZCBhbGwgdGhlIG1pbWljcywgZ2l2ZSB0aGVtIHN0YWJsZSBudW1iZXJzP1xuICBGb2dMYW1wQ2F2ZU1pZGRsZU5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTcwKTtcbiAgRm9nTGFtcENhdmVNaWRkbGVTb3V0aHdlc3RNaW1pYyA9IHRyYWNrZWQoMHgxNzEpO1xuICBXYXRlcmZhbGxDYXZlRnJvbnRNaW1pYyA9IHRyYWNrZWQoMHgxNzIpO1xuICBFdmlsU3Bpcml0SXNsYW5kUml2ZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3Myk7XG4gIE10SHlkcmFGaW5hbENhdmVNaW1pYyA9IHRyYWNrZWQoMHgxNzQpO1xuICBTdHh5TGVmdE5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTc1KTtcbiAgU3R4eVJpZ2h0Tm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzYpO1xuICBTdHh5UmlnaHRTb3V0aE1pbWljID0gdHJhY2tlZCgweDE3Nyk7XG4gIENyeXB0TGVmdFBpdE1pbWljID0gdHJhY2tlZCgweDE3OCk7XG4gIEthcm1pbmVCYXNlbWVudFVwcGVyTWlkZGxlTWltaWMgPSB0cmFja2VkKDB4MTc5KTtcbiAgS2FybWluZUJhc2VtZW50VXBwZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3YSk7XG4gIEthcm1pbmVCYXNlbWVudExvd2VyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxN2IpO1xuICBFYXN0Q2F2ZU5vcnRod2VzdE1pbWljID0gdHJhY2tlZCgweDE3Yyk7XG4gIC8vIFRPRE8gLSBtaW1pY3MgMTMuLjE2ID9cblxuICAvLyAxODAgLi4gMWZmID0+IGZpeGVkIGZsYWdzIGZvciBvdmVyZmxvdyBidWZmZXIuXG5cbiAgLy8gMjAwIC4uIDI3ZiA9PiBmaXhlZCBmbGFncyBmb3IgaXRlbXMuXG4gIFN3b3JkT2ZXaW5kID0gdHJhY2tlZCgweDIwMCk7XG4gIFN3b3JkT2ZGaXJlID0gdHJhY2tlZCgweDIwMSk7XG4gIFN3b3JkT2ZXYXRlciA9IHRyYWNrZWQoMHgyMDIpO1xuICBTd29yZE9mVGh1bmRlciA9IHRyYWNrZWQoMHgyMDMpO1xuICBDcnlzdGFsaXMgPSB0cmFja2VkKDB4MjA0KTtcbiAgQmFsbE9mV2luZCA9IHRyYWNrZWQoMHgyMDUpO1xuICBUb3JuYWRvQnJhY2VsZXQgPSB0cmFja2VkKDB4MjA2KTtcbiAgQmFsbE9mRmlyZSA9IHRyYWNrZWQoMHgyMDcpO1xuICBGbGFtZUJyYWNlbGV0ID0gdHJhY2tlZCgweDIwOCk7XG4gIEJhbGxPZldhdGVyID0gdHJhY2tlZCgweDIwOSk7XG4gIEJsaXp6YXJkQnJhY2VsZXQgPSB0cmFja2VkKDB4MjBhKTtcbiAgQmFsbE9mVGh1bmRlciA9IHRyYWNrZWQoMHgyMGIpO1xuICBTdG9ybUJyYWNlbGV0ID0gdHJhY2tlZCgweDIwYyk7XG4gIENhcmFwYWNlU2hpZWxkID0gdHJhY2tlZCgweDIwZCk7XG4gIEJyb256ZVNoaWVsZCA9IHRyYWNrZWQoMHgyMGUpO1xuICBQbGF0aW51bVNoaWVsZCA9IHRyYWNrZWQoMHgyMGYpO1xuICBNaXJyb3JlZFNoaWVsZCA9IHRyYWNrZWQoMHgyMTApO1xuICBDZXJhbWljU2hpZWxkID0gdHJhY2tlZCgweDIxMSk7XG4gIFNhY3JlZFNoaWVsZCA9IHRyYWNrZWQoMHgyMTIpO1xuICBCYXR0bGVTaGllbGQgPSB0cmFja2VkKDB4MjEzKTtcbiAgUHN5Y2hvU2hpZWxkID0gdHJhY2tlZCgweDIxNCk7XG4gIFRhbm5lZEhpZGUgPSB0cmFja2VkKDB4MjE1KTtcbiAgTGVhdGhlckFybW9yID0gdHJhY2tlZCgweDIxNik7XG4gIEJyb256ZUFybW9yID0gdHJhY2tlZCgweDIxNyk7XG4gIFBsYXRpbnVtQXJtb3IgPSB0cmFja2VkKDB4MjE4KTtcbiAgU29sZGllclN1aXQgPSB0cmFja2VkKDB4MjE5KTtcbiAgQ2VyYW1pY1N1aXQgPSB0cmFja2VkKDB4MjFhKTtcbiAgQmF0dGxlQXJtb3IgPSB0cmFja2VkKDB4MjFiKTtcbiAgUHN5Y2hvQXJtb3IgPSB0cmFja2VkKDB4MjFjKTtcbiAgTWVkaWNhbEhlcmIgPSB0cmFja2VkKDB4MjFkKTtcbiAgQW50aWRvdGUgPSB0cmFja2VkKDB4MjFlKTtcbiAgTHlzaXNQbGFudCA9IHRyYWNrZWQoMHgyMWYpO1xuICBGcnVpdE9mTGltZSA9IHRyYWNrZWQoMHgyMjApO1xuICBGcnVpdE9mUG93ZXIgPSB0cmFja2VkKDB4MjIxKTtcbiAgTWFnaWNSaW5nID0gdHJhY2tlZCgweDIyMik7XG4gIEZydWl0T2ZSZXB1biA9IHRyYWNrZWQoMHgyMjMpO1xuICBXYXJwQm9vdHMgPSB0cmFja2VkKDB4MjI0KTtcbiAgU3RhdHVlT2ZPbnl4ID0gdHJhY2tlZCgweDIyNSk7XG4gIE9wZWxTdGF0dWUgPSB0cmFja2VkKDB4MjI2KTtcbiAgSW5zZWN0Rmx1dGUgPSB0cmFja2VkKDB4MjI3KTtcbiAgRmx1dGVPZkxpbWUgPSB0cmFja2VkKDB4MjI4KTtcbiAgR2FzTWFzayA9IHRyYWNrZWQoMHgyMjkpO1xuICBQb3dlclJpbmcgPSB0cmFja2VkKDB4MjJhKTtcbiAgV2FycmlvclJpbmcgPSB0cmFja2VkKDB4MjJiKTtcbiAgSXJvbk5lY2tsYWNlID0gdHJhY2tlZCgweDIyYyk7XG4gIERlb3NQZW5kYW50ID0gdHJhY2tlZCgweDIyZCk7XG4gIFJhYmJpdEJvb3RzID0gdHJhY2tlZCgweDIyZSk7XG4gIExlYXRoZXJCb290cyA9IHRyYWNrZWQoMHgyMmYpO1xuICBTaGllbGRSaW5nID0gdHJhY2tlZCgweDIzMCk7XG4gIEFsYXJtRmx1dGUgPSB0cmFja2VkKDB4MjMxKTtcbiAgV2luZG1pbGxLZXkgPSB0cmFja2VkKDB4MjMyKTtcbiAgS2V5VG9Qcmlzb24gPSB0cmFja2VkKDB4MjMzKTtcbiAgS2V5VG9TdHh5ID0gdHJhY2tlZCgweDIzNCk7XG4gIEZvZ0xhbXAgPSB0cmFja2VkKDB4MjM1KTtcbiAgU2hlbGxGbHV0ZSA9IHRyYWNrZWQoMHgyMzYpO1xuICBFeWVHbGFzc2VzID0gdHJhY2tlZCgweDIzNyk7XG4gIEJyb2tlblN0YXR1ZSA9IHRyYWNrZWQoMHgyMzgpO1xuICBHbG93aW5nTGFtcCA9IHRyYWNrZWQoMHgyMzkpO1xuICBTdGF0dWVPZkdvbGQgPSB0cmFja2VkKDB4MjNhKTtcbiAgTG92ZVBlbmRhbnQgPSB0cmFja2VkKDB4MjNiKTtcbiAgS2lyaXNhUGxhbnQgPSB0cmFja2VkKDB4MjNjKTtcbiAgSXZvcnlTdGF0dWUgPSB0cmFja2VkKDB4MjNkKTtcbiAgQm93T2ZNb29uID0gdHJhY2tlZCgweDIzZSk7XG4gIEJvd09mU3VuID0gdHJhY2tlZCgweDIzZik7XG4gIEJvd09mVHJ1dGggPSB0cmFja2VkKDB4MjQwKTtcbiAgUmVmcmVzaCA9IHRyYWNrZWQoMHgyNDEpO1xuICBQYXJhbHlzaXMgPSB0cmFja2VkKDB4MjQyKTtcbiAgVGVsZXBhdGh5ID0gdHJhY2tlZCgweDI0Myk7XG4gIFRlbGVwb3J0ID0gdHJhY2tlZCgweDI0NCk7XG4gIFJlY292ZXIgPSB0cmFja2VkKDB4MjQ1KTtcbiAgQmFycmllciA9IHRyYWNrZWQoMHgyNDYpO1xuICBDaGFuZ2UgPSB0cmFja2VkKDB4MjQ3KTtcbiAgRmxpZ2h0ID0gdHJhY2tlZCgweDI0OCk7XG5cbiAgLy8gMjgwIC4uIDJmMCA9PiBmaXhlZCBmbGFncyBmb3Igd2FsbHMuXG4gIENhbG1lZEFuZ3J5U2VhID0gdHJhY2tlZCgweDI4Myk7XG4gIE9wZW5lZEpvZWxTaGVkID0gdHJhY2tlZCgweDI4Nyk7XG4gIERyYXlnb24yID0gdHJhY2tlZCgweDI4ZCk7XG4gIE9wZW5lZENyeXB0ID0gdHJhY2tlZCgweDI4ZSk7XG4gIC8vIE5PVEU6IDI4ZiBpcyBmbGFnZ2VkIGZvciBkcmF5Z29uJ3MgZmxvb3IsIGJ1dCBpcyB1bnVzZWQgYW5kIHVubmVlZGVkXG4gIE9wZW5lZFN0eHkgPSB0cmFja2VkKDB4MmIwKTtcbiAgT3BlbmVkU3dhbkdhdGUgPSB0cmFja2VkKDB4MmIzKTtcbiAgT3BlbmVkUHJpc29uID0gdHJhY2tlZCgweDJkOCk7XG4gIE9wZW5lZFNlYWxlZENhdmUgPSB0cmFja2VkKDB4MmVlKTtcblxuICAvLyBOb3RoaW5nIGV2ZXIgc2V0cyB0aGlzLCBzbyBqdXN0IHVzZSBpdCByaWdodCBvdXQuXG4gIEFsd2F5c1RydWUgPSBmaXhlZCgweDJmMCwgVFJVRSk7XG5cbiAgV2FycExlYWYgPSB0cmFja2VkKDB4MmY1KTtcbiAgV2FycEJyeW5tYWVyID0gdHJhY2tlZCgweDJmNik7XG4gIFdhcnBPYWsgPSB0cmFja2VkKDB4MmY3KTtcbiAgV2FycE5hZGFyZSA9IHRyYWNrZWQoMHgyZjgpO1xuICBXYXJwUG9ydG9hID0gdHJhY2tlZCgweDJmOSk7XG4gIFdhcnBBbWF6b25lcyA9IHRyYWNrZWQoMHgyZmEpO1xuICBXYXJwSm9lbCA9IHRyYWNrZWQoMHgyZmIpO1xuICBXYXJwWm9tYmllID0gdHJhY2tlZCh+MHgyZmIpO1xuICBXYXJwU3dhbiA9IHRyYWNrZWQoMHgyZmMpO1xuICBXYXJwU2h5cm9uID0gdHJhY2tlZCgweDJmZCk7XG4gIFdhcnBHb2EgPSB0cmFja2VkKDB4MmZlKTtcbiAgV2FycFNhaGFyYSA9IHRyYWNrZWQoMHgyZmYpO1xuXG4gIC8vIFBzZXVkbyBmbGFnc1xuICBTd29yZCA9IHBzZXVkbyh0aGlzKTtcbiAgTW9uZXkgPSBwc2V1ZG8odGhpcyk7XG4gIEJyZWFrU3RvbmUgPSBwc2V1ZG8odGhpcyk7XG4gIEJyZWFrSWNlID0gcHNldWRvKHRoaXMpO1xuICBGb3JtQnJpZGdlID0gcHNldWRvKHRoaXMpO1xuICBCcmVha0lyb24gPSBwc2V1ZG8odGhpcyk7XG4gIFRyYXZlbFN3YW1wID0gcHNldWRvKHRoaXMpO1xuICBDcm9zc1BhaW4gPSBwc2V1ZG8odGhpcyk7XG4gIENsaW1iV2F0ZXJmYWxsID0gcHNldWRvKHRoaXMpO1xuICBCdXlIZWFsaW5nID0gcHNldWRvKHRoaXMpO1xuICBCdXlXYXJwID0gcHNldWRvKHRoaXMpO1xuICBTaG9vdGluZ1N0YXR1ZSA9IHBzZXVkbyh0aGlzKTtcbiAgQ2xpbWJTbG9wZTggPSBwc2V1ZG8odGhpcyk7IC8vIGNsaW1iIHNsb3BlcyBoZWlnaHQgNi04XG4gIENsaW1iU2xvcGU5ID0gcHNldWRvKHRoaXMpOyAvLyBjbGltYiBzbG9wZXMgaGVpZ2h0IDlcbiAgQ2xpbWJTbG9wZTEwID0gcHNldWRvKHRoaXMpOyAvLyBjbGltYiBhbGwgc2xvcGVzXG4gIFdpbGRXYXJwID0gcHNldWRvKHRoaXMpO1xuICBUcmlnZ2VyU2tpcCA9IHBzZXVkbyh0aGlzKTtcbiAgUmFnZVNraXAgPSBwc2V1ZG8odGhpcyk7XG5cbiAgLy8gTWFwIG9mIGZsYWdzIHRoYXQgYXJlIFwid2FpdGluZ1wiIGZvciBhIHByZXZpb3VzbHktdXNlZCBJRC5cbiAgLy8gU2lnbmlmaWVkIHdpdGggYSBuZWdhdGl2ZSAob25lJ3MgY29tcGxlbWVudCkgSUQgaW4gdGhlIEZsYWcgb2JqZWN0LlxuICBwcml2YXRlIHJlYWRvbmx5IHVuYWxsb2NhdGVkID0gbmV3IE1hcDxudW1iZXIsIEZsYWc+KCk7XG5cbiAgLy8gLy8gTWFwIG9mIGF2YWlsYWJsZSBJRHMuXG4gIC8vIHByaXZhdGUgcmVhZG9ubHkgYXZhaWxhYmxlID0gW1xuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAwMDAgLi4gMGZmXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDEwMCAuLiAxZmZcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMjAwIC4uIDJmZlxuICAvLyBdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgLy8gQnVpbGQgdXAgYWxsIHRoZSBmbGFncyBhcyBhY3R1YWwgaW5zdGFuY2VzIG9mIEZsYWcuXG4gICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcykge1xuICAgICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgc3BlYyA9IHRoaXNba2V5XTtcbiAgICAgIGlmICghKHNwZWMgYXMgYW55KVtGTEFHXSkgY29udGludWU7XG4gICAgICAvLyBSZXBsYWNlIGl0IHdpdGggYW4gYWN0dWFsIGZsYWcuICBXZSBtYXkgbmVlZCBhIG5hbWUsIGV0Yy4uLlxuICAgICAgY29uc3Qga2V5TnVtYmVyID0gTnVtYmVyKGtleSk7XG4gICAgICBjb25zdCBpZCA9IHR5cGVvZiBzcGVjLmlkID09PSAnbnVtYmVyJyA/IHNwZWMuaWQgOiBrZXlOdW1iZXI7XG4gICAgICBpZiAoaXNOYU4oaWQpKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBmbGFnOiAke2tleX1gKTtcbiAgICAgIGNvbnN0IG5hbWUgPVxuICAgICAgICAgIHNwZWMubmFtZSB8fFxuICAgICAgICAgIChpc05hTihrZXlOdW1iZXIpID8gdXBwZXJDYW1lbFRvU3BhY2VzKGtleSkgOiBmbGFnTmFtZShpZCkpO1xuICAgICAgY29uc3QgZmxhZyA9IG5ldyBGbGFnKHRoaXMsIG5hbWUsIGlkLCBzcGVjKTtcbiAgICAgIHRoaXNba2V5XSA9IGZsYWc7XG4gICAgICAvLyBJZiBJRCBpcyBuZWdhdGl2ZSwgdGhlbiBzdG9yZSBpdCBhcyB1bmFsbG9jYXRlZC5cbiAgICAgIGlmIChmbGFnLmlkIDwgMCkge1xuICAgICAgICB0aGlzLnVuYWxsb2NhdGVkLnNldCh+ZmxhZy5pZCwgZmxhZyk7XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzW2ZsYWcuaWRdKSB7XG4gICAgICAgIHRoaXNbZmxhZy5pZF0gPSBmbGFnO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vdyBhZGQgdGhlIG1pc3NpbmcgZmxhZ3MuXG4gICAgZm9yIChsZXQgaSA9IDB4MTAwOyBpIDwgMHgxODA7IGkrKykge1xuICAgICAgY29uc3QgbmFtZSA9IGBDaGVjayAke2hleChpICYgMHhmZil9YDtcbiAgICAgIGlmICh0aGlzW2ldKSB7XG4gICAgICAgIGlmICghdGhpc1tpXS5maXhlZCAmJiAhdGhpcy51bmFsbG9jYXRlZC5oYXMoaSkpIHtcbiAgICAgICAgICB0aGlzLnVuYWxsb2NhdGVkLnNldChcbiAgICAgICAgICAgICAgaSwgbmV3IEZsYWcodGhpcywgbmFtZSwgfmksIHtmaXhlZDogdHJ1ZX0pKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpc1tpXSA9IG5ldyBGbGFnKHRoaXMsIG5hbWUsIGksIHtmaXhlZDogdHJ1ZX0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMHgxODA7IGkgPCAweDI4MDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIHtcbiAgICAgICAgLy8gSXRlbSBidWZmZXIgaGVyZVxuICAgICAgICBjb25zdCB0eXBlID0gaSA8IDB4MjAwID8gJ0J1ZmZlciAnIDogJ0l0ZW0gJztcbiAgICAgICAgdGhpc1tpXSA9IG5ldyBGbGFnKHRoaXMsIHR5cGUgKyBoZXgoaSksIGksIHtmaXhlZDogdHJ1ZX0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBGb3IgdGhlIHJlbWFpbmRlciwgZmluZCB3YWxscyBpbiBtYXBzLlxuICAgIC8vICAtIGRvIHdlIG5lZWQgdG8gcHVsbCB0aGVtIGZyb20gbG9jYXRpb25zPz8gb3IgdGhpcyBkb2luZyBhbnl0aGluZz8/XG4gICAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgZm9yIChjb25zdCBmIG9mIGxvYy5mbGFncykge1xuICAgICAgICBpZiAodGhpc1tmLmZsYWddKSBjb250aW51ZTtcbiAgICAgICAgdGhpc1tmLmZsYWddID0gd2FsbEZsYWcodGhpcywgZi5mbGFnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTYXZlcyA+IDQ3MCBieXRlcyBvZiByZWR1bmRhbnQgZmxhZyBzZXRzIVxuICBkZWZyYWcoKSB7XG4gICAgLy8gbWFrZSBhIG1hcCBvZiBuZXcgSURzIGZvciBldmVyeXRoaW5nLlxuICAgIGNvbnN0IHJlbWFwcGluZyA9IG5ldyBNYXA8bnVtYmVyLCAoZjogRmxhZ0NvbnRleHQpID0+IG51bWJlcj4oKTtcbiAgICBjb25zdCB1bnVzZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcblxuICAgIC8vIGZpcnN0IGhhbmRsZSBhbGwgdGhlIG9ic29sZXRlIGZsYWdzIC0gb25jZSB0aGUgcmVtYXBwaW5nIGlzIHB1bGxlZCBvZmZcbiAgICAvLyB3ZSBjYW4gc2ltcGx5IHVucmVmIHRoZW0uXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDMwMDsgaSsrKSB7XG4gICAgICBjb25zdCBmID0gdGhpc1tpXTtcbiAgICAgIGNvbnN0IG8gPSBmPy5vYnNvbGV0ZTtcbiAgICAgIGlmIChvKSB7XG4gICAgICAgIHJlbWFwcGluZy5zZXQoaSwgKGM6IEZsYWdDb250ZXh0KSA9PiBjLnNldCA/IC0xIDogby5jYWxsKGYsIGMpKTtcbiAgICAgICAgZGVsZXRlIHRoaXNbaV07XG4gICAgICB9IGVsc2UgaWYgKCFmKSB7XG4gICAgICAgIHVudXNlZC5hZGQoaSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbm93IG1vdmUgYWxsIHRoZSBtb3ZhYmxlIGZsYWdzLlxuICAgIGxldCBpID0gMDtcbiAgICBsZXQgaiA9IDB4MmZmO1xuICAgIC8vIFdBUk5JTkc6IGkgYW5kIGogYXJlIGJvdW5kIHRvIHRoZSBvdXRlciBzY29wZSEgIENsb3Npbmcgb3ZlciB0aGVtXG4gICAgLy8gd2lsbCBOT1Qgd29yayBhcyBpbnRlbmRlZC5cbiAgICBmdW5jdGlvbiByZXQ8VD4oeDogVCk6ICgpID0+IFQgeyByZXR1cm4gKCkgPT4geDsgfVxuICAgIHdoaWxlIChpIDwgaikge1xuICAgICAgaWYgKHRoaXNbaV0gfHwgdGhpcy51bmFsbG9jYXRlZC5oYXMoaSkpIHsgaSsrOyBjb250aW51ZTsgfVxuICAgICAgY29uc3QgZiA9IHRoaXNbal07XG4gICAgICBpZiAoIWYgfHwgZi5maXhlZCkgeyBqLS07IGNvbnRpbnVlOyB9XG4gICAgICAvLyBmIGlzIGEgbW92YWJsZSBmbGFnLiAgTW92ZSBpdCB0byBpLlxuICAgICAgcmVtYXBwaW5nLnNldChqLCByZXQoaSkpO1xuICAgICAgKGYgYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gaTtcbiAgICAgIHRoaXNbaV0gPSBmO1xuICAgICAgZGVsZXRlIHRoaXNbal07XG4gICAgICBpKys7XG4gICAgICBqLS07XG4gICAgfVxuXG4gICAgLy8gZ28gdGhyb3VnaCBhbGwgdGhlIHBvc3NpYmxlIHBsYWNlcyB3ZSBjb3VsZCBmaW5kIGZsYWdzIGFuZCByZW1hcCFcbiAgICB0aGlzLnJlbWFwRmxhZ3MocmVtYXBwaW5nLCB1bnVzZWQpO1xuXG4gICAgLy8gVW5hbGxvY2F0ZWQgZmxhZ3MgZG9uJ3QgbmVlZCBhbnkgcmVtYXBwaW5nLlxuICAgIGZvciAoY29uc3QgW3dhbnQsIGZsYWddIG9mIHRoaXMudW5hbGxvY2F0ZWQpIHtcbiAgICAgIGlmICh0aGlzW3dhbnRdKSBjb250aW51ZTtcbiAgICAgIHRoaXMudW5hbGxvY2F0ZWQuZGVsZXRlKHdhbnQpO1xuICAgICAgKHRoaXNbd2FudF0gPSBmbGFnIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IHdhbnQ7XG4gICAgfVxuXG4gICAgLy9pZiAodGhpcy51bmFsbG9jYXRlZC5zaXplKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmdWxseSBhbGxvY2F0ZWApO1xuXG4gICAgLy8gUmVwb3J0IGhvdyB0aGUgZGVmcmFnIHdlbnQ/XG4gICAgY29uc3QgZnJlZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgzMDA7IGkrKykge1xuICAgICAgaWYgKCF0aGlzW2ldKSBmcmVlLnB1c2goaGV4MyhpKSk7XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGBGcmVlIGZsYWdzOiAke2ZyZWUuam9pbignICcpfWApO1xuICB9XG5cbiAgaW5zZXJ0Wm9tYmllV2FycEZsYWcoKSB7XG4gICAgLy8gTWFrZSBzcGFjZSBmb3IgdGhlIG5ldyBmbGFnIGJldHdlZW4gSm9lbCBhbmQgU3dhblxuICAgIGNvbnN0IHJlbWFwcGluZyA9IG5ldyBNYXA8bnVtYmVyLCAoZjogRmxhZ0NvbnRleHQpID0+IG51bWJlcj4oKTtcbiAgICBpZiAodGhpc1sweDJmNF0pIHRocm93IG5ldyBFcnJvcihgTm8gc3BhY2UgdG8gaW5zZXJ0IHdhcnAgZmxhZ2ApO1xuICAgIGNvbnN0IG5ld0lkID0gfnRoaXMuV2FycFpvbWJpZS5pZDtcbiAgICBpZiAobmV3SWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBXYXJwWm9tYmllIGlkYCk7XG4gICAgZm9yIChsZXQgaSA9IDB4MmY0OyBpIDwgbmV3SWQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHRoaXNbaSArIDFdO1xuICAgICAgKHRoaXNbaV0gYXMgV3JpdGFibGU8RmxhZz4pLmlkID0gaTtcbiAgICAgIHJlbWFwcGluZy5zZXQoaSArIDEsICgpID0+IGkpO1xuICAgIH1cbiAgICAodGhpcy5XYXJwWm9tYmllIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IG5ld0lkO1xuICAgIHRoaXNbbmV3SWRdID0gdGhpcy5XYXJwWm9tYmllO1xuICAgIHRoaXMucmVtYXBGbGFncyhyZW1hcHBpbmcpO1xuICB9XG5cbiAgcmVtYXAoc3JjOiBudW1iZXIsIGRlc3Q6IG51bWJlcikge1xuICAgIHRoaXMucmVtYXBGbGFncyhuZXcgTWFwKFtbc3JjLCAoKSA9PiBkZXN0XV0pKTtcbiAgfVxuXG4gIHJlbWFwRmxhZ3MocmVtYXBwaW5nOiBNYXA8bnVtYmVyLCAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyPixcbiAgICAgICAgICAgICB1bnVzZWQ/OiBTZXQ8bnVtYmVyPikge1xuICAgIGZ1bmN0aW9uIHByb2Nlc3NMaXN0KGxpc3Q6IG51bWJlcltdLCBjdHg6IEZsYWdDb250ZXh0KSB7XG4gICAgICBmb3IgKGxldCBpID0gbGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBsZXQgZiA9IGxpc3RbaV07XG4gICAgICAgIGlmIChmIDwgMCkgZiA9IH5mO1xuICAgICAgICBpZiAodW51c2VkICYmIHVudXNlZC5oYXMoZikpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNIT1VMRCBCRSBVTlVTRUQ6ICR7aGV4KGYpfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlbWFwID0gcmVtYXBwaW5nLmdldChmKTtcbiAgICAgICAgaWYgKHJlbWFwID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBsZXQgbWFwcGVkID0gcmVtYXAoey4uLmN0eCwgaW5kZXg6IGl9KTtcbiAgICAgICAgaWYgKG1hcHBlZCA+PSAwKSB7XG4gICAgICAgICAgbGlzdFtpXSA9IGxpc3RbaV0gPCAwID8gfm1hcHBlZCA6IG1hcHBlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBwcm9jZXNzKGZsYWc6IG51bWJlciwgY3R4OiBGbGFnQ29udGV4dCkge1xuICAgICAgbGV0IHVuc2lnbmVkID0gZmxhZyA8IDAgPyB+ZmxhZyA6IGZsYWc7XG4gICAgICBpZiAodW51c2VkICYmIHVudXNlZC5oYXModW5zaWduZWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgU0hPVUxEIEJFIFVOVVNFRDogJHtoZXgodW5zaWduZWQpfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVtYXAgPSByZW1hcHBpbmcuZ2V0KHVuc2lnbmVkKTtcbiAgICAgIGlmIChyZW1hcCA9PSBudWxsKSByZXR1cm4gZmxhZztcbiAgICAgIGxldCBtYXBwZWQgPSByZW1hcChjdHgpO1xuICAgICAgaWYgKG1hcHBlZCA8IDApIHRocm93IG5ldyBFcnJvcihgQmFkIGZsYWcgZGVsZXRlYCk7XG4gICAgICByZXR1cm4gZmxhZyA8IDAgPyB+bWFwcGVkIDogbWFwcGVkO1xuICAgIH1cblxuICAgIC8vIExvY2F0aW9uIGZsYWdzXG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGlmICghbG9jYXRpb24udXNlZCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGZsYWcgb2YgbG9jYXRpb24uZmxhZ3MpIHtcbiAgICAgICAgZmxhZy5mbGFnID0gcHJvY2VzcyhmbGFnLmZsYWcsIHtsb2NhdGlvbn0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5QQyBmbGFnc1xuICAgIGZvciAoY29uc3QgbnBjIG9mIHRoaXMucm9tLm5wY3MpIHtcbiAgICAgIGlmICghbnBjLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBbbG9jLCBjb25kc10gb2YgbnBjLnNwYXduQ29uZGl0aW9ucykge1xuICAgICAgICBwcm9jZXNzTGlzdChjb25kcywge25wYywgc3Bhd246IGxvY30pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICAgIGQuY29uZGl0aW9uID0gcHJvY2VzcyhkLmNvbmRpdGlvbiwge25wYywgZGlhbG9nOiB0cnVlfSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFssIGRzXSBvZiBucGMubG9jYWxEaWFsb2dzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuICAgICAgICAgIGQuY29uZGl0aW9uID0gcHJvY2VzcyhkLmNvbmRpdGlvbiwge25wYywgZGlhbG9nOiB0cnVlfSk7XG4gICAgICAgICAgcHJvY2Vzc0xpc3QoZC5mbGFncywge25wYywgZGlhbG9nOiB0cnVlLCBzZXQ6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy5yb20udHJpZ2dlcnMpIHtcbiAgICAgIGlmICghdHJpZ2dlci51c2VkKSBjb250aW51ZTtcbiAgICAgIHByb2Nlc3NMaXN0KHRyaWdnZXIuY29uZGl0aW9ucywge3RyaWdnZXJ9KTtcbiAgICAgIHByb2Nlc3NMaXN0KHRyaWdnZXIuZmxhZ3MsIHt0cmlnZ2VyLCBzZXQ6IHRydWV9KTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgdXBkYXRpbmcgdGVsZXBhdGh5PyE/XG5cbiAgICAvLyBJdGVtR2V0IGZsYWdzXG4gICAgZm9yIChjb25zdCBpdGVtR2V0IG9mIHRoaXMucm9tLml0ZW1HZXRzKSB7XG4gICAgICBwcm9jZXNzTGlzdChpdGVtR2V0LmZsYWdzLCB7c2V0OiB0cnVlfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCBpdGVtVXNlIG9mIGl0ZW0uaXRlbVVzZURhdGEpIHtcbiAgICAgICAgaWYgKGl0ZW1Vc2Uua2luZCA9PT0gJ2ZsYWcnKSB7XG4gICAgICAgICAgaXRlbVVzZS53YW50ID0gcHJvY2VzcyhpdGVtVXNlLndhbnQsIHt9KTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzTGlzdChpdGVtVXNlLmZsYWdzLCB7c2V0OiB0cnVlfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFueXRoaW5nIGVsc2U/XG4gIH1cblxuICAvLyBUT0RPIC0gbWFuaXB1bGF0ZSB0aGlzIHN0dWZmXG5cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBhdmFpbGFibGUgPSBuZXcgU2V0PG51bWJlcj4oW1xuICAvLyAgIC8vIFRPRE8gLSB0aGVyZSdzIGEgdG9uIG9mIGxvd2VyIGZsYWdzIGFzIHdlbGwuXG4gIC8vICAgLy8gVE9ETyAtIHdlIGNhbiByZXB1cnBvc2UgYWxsIHRoZSBvbGQgaXRlbSBmbGFncy5cbiAgLy8gICAweDI3MCwgMHgyNzEsIDB4MjcyLCAweDI3MywgMHgyNzQsIDB4Mjc1LCAweDI3NiwgMHgyNzcsXG4gIC8vICAgMHgyNzgsIDB4Mjc5LCAweDI3YSwgMHgyN2IsIDB4MjdjLCAweDI3ZCwgMHgyN2UsIDB4MjdmLFxuICAvLyAgIDB4MjgwLCAweDI4MSwgMHgyODgsIDB4Mjg5LCAweDI4YSwgMHgyOGIsIDB4MjhjLFxuICAvLyAgIDB4MmE3LCAweDJhYiwgMHgyYjQsXG4gIC8vIF0pO1xuXG4gIGFsbG9jKHNlZ21lbnQ6IG51bWJlciA9IDApOiBudW1iZXIge1xuICAgIGlmIChzZWdtZW50ICE9PSAweDIwMCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYWxsb2NhdGUgb3V0c2lkZSAyeHhgKTtcbiAgICBmb3IgKGxldCBmbGFnID0gMHgyODA7IGZsYWcgPCAweDMwMDsgZmxhZysrKSB7XG4gICAgICBpZiAoIXRoaXNbZmxhZ10pIHtcbiAgICAgICAgdGhpc1tmbGFnXSA9IHdhbGxGbGFnKHRoaXMsIGZsYWcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZsYWc7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgTm8gZnJlZSBmbGFncy5gKTtcbiAgfVxuXG4gIGZyZWUoZmxhZzogbnVtYmVyKSB7XG4gICAgLy8gVE9ETyAtIGlzIHRoZXJlIG1vcmUgdG8gdGhpcz8gIGNoZWNrIGZvciBzb21ldGhpbmcgZWxzZT9cbiAgICBkZWxldGUgdGhpc1tmbGFnXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmbGFnTmFtZShpZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuICdGbGFnICcgKyBoZXgzKGlkKTtcbn1cblxuZnVuY3Rpb24gd2FsbEZsYWcoZmxhZ3M6IEZsYWdzLCBpZDogbnVtYmVyKTogRmxhZyB7XG4gIHJldHVybiBuZXcgRmxhZyhmbGFncywgJ1dhbGwgJyArIGhleChpZCAmIDB4ZmYpLCBpZCwge2ZpeGVkOiB0cnVlfSk7XG59XG4iXX0=