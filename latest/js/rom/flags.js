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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBU3RCLE1BQU0sS0FBSyxHQUFVLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFVLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFVLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztBQW9CekIsTUFBTSxPQUFPLElBQUk7SUFNZixZQUFxQixLQUFZLEVBQ1osSUFBWSxFQUNaLEVBQVUsRUFDbkIsSUFBYzs7UUFITCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssU0FBRyxJQUFJLENBQUMsS0FBSyxtQ0FBSSxLQUFLLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDLEVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFB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UUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFHeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUd4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FB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QWFELEtBQUssQ0FBQyxVQUFrQixDQUFDO1FBQ3ZCLElBQUksT0FBTyxLQUFLLEtBQUs7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdEUsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7UUFFZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFFRCxTQUFTLFFBQVEsQ0FBQyxFQUFVO0lBQzFCLE9BQU8sT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsS0FBWSxFQUFFLEVBQVU7SUFDeEMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SXRlbX0gZnJvbSAnLi9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb259IGZyb20gJy4vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtOcGN9IGZyb20gJy4vbnBjLmpzJztcbmltcG9ydCB7VHJpZ2dlcn0gZnJvbSAnLi90cmlnZ2VyLmpzJztcbmltcG9ydCB7aGV4LCBoZXgzLCB1cHBlckNhbWVsVG9TcGFjZXMsIFdyaXRhYmxlfSBmcm9tICcuL3V0aWwuanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50fSBmcm9tICcuLi9sb2dpYy9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcblxuY29uc3QgRkxBRyA9IFN5bWJvbCgpO1xuXG4vLyBUT0RPIC0gbWF5YmUgYWxpYXMgc2hvdWxkIGp1c3QgYmUgaW4gb3ZlcmxheS50cz9cbmV4cG9ydCBpbnRlcmZhY2UgTG9naWMge1xuICBhc3N1bWVUcnVlPzogYm9vbGVhbjtcbiAgYXNzdW1lRmFsc2U/OiBib29sZWFuO1xuICB0cmFjaz86IGJvb2xlYW47XG59XG5cbmNvbnN0IEZBTFNFOiBMb2dpYyA9IHthc3N1bWVGYWxzZTogdHJ1ZX07XG5jb25zdCBUUlVFOiBMb2dpYyA9IHthc3N1bWVUcnVlOiB0cnVlfTtcbmNvbnN0IFRSQUNLOiBMb2dpYyA9IHt0cmFjazogdHJ1ZX07XG5jb25zdCBJR05PUkU6IExvZ2ljID0ge307XG5cbmludGVyZmFjZSBGbGFnRGF0YSB7XG4gIGZpeGVkPzogYm9vbGVhbjtcbiAgb2Jzb2xldGU/OiAoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyO1xuICBsb2dpYz86IExvZ2ljO1xufVxuaW50ZXJmYWNlIEZsYWdDb250ZXh0IHtcbiAgdHJpZ2dlcj86IFRyaWdnZXI7XG4gIGxvY2F0aW9uPzogTG9jYXRpb247XG4gIG5wYz86IE5wYztcbiAgc3Bhd24/OiBudW1iZXI7XG4gIGluZGV4PzogbnVtYmVyO1xuICBkaWFsb2c/OiBib29sZWFuO1xuICBzZXQ/OiBib29sZWFuO1xuICAvL2RpYWxvZz86IExvY2FsRGlhbG9nfEdsb2JhbERpYWxvZztcbiAgLy9pbmRleD86IG51bWJlcjtcbiAgLy9jb25kaXRpb24/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgRmxhZyB7XG5cbiAgZml4ZWQ6IGJvb2xlYW47XG4gIG9ic29sZXRlPzogKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcjtcbiAgbG9naWM6IExvZ2ljO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGZsYWdzOiBGbGFncyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICByZWFkb25seSBpZDogbnVtYmVyLFxuICAgICAgICAgICAgICBkYXRhOiBGbGFnRGF0YSkge1xuICAgIHRoaXMuZml4ZWQgPSBkYXRhLmZpeGVkIHx8IGZhbHNlO1xuICAgIHRoaXMub2Jzb2xldGUgPSBkYXRhLm9ic29sZXRlO1xuICAgIHRoaXMubG9naWMgPSBkYXRhLmxvZ2ljID8/IFRSQUNLO1xuICB9XG5cbiAgZ2V0IGMoKTogQ29uZGl0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5pZCBhcyBDb25kaXRpb247XG4gIH1cblxuICBnZXQgcigpOiBSZXF1aXJlbWVudC5TaW5nbGUge1xuICAgIHJldHVybiBbW3RoaXMuaWQgYXMgQ29uZGl0aW9uXV07XG4gIH1cblxuICBnZXQgZGVidWcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5pZC50b1N0cmluZygxNikucGFkU3RhcnQoMywgJzAnKSArICcgJyArIHRoaXMubmFtZTtcbiAgfVxuXG4gIGdldCBpdGVtKCk6IEl0ZW0ge1xuICAgIGlmICh0aGlzLmlkIDwgMHgxMDAgfHwgdGhpcy5pZCA+IDB4MTdmKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBhIHNsb3Q6ICR7dGhpcy5pZH1gKTtcbiAgICB9XG4gICAgY29uc3QgaXRlbUdldElkID0gdGhpcy5mbGFncy5yb20uc2xvdHNbdGhpcy5pZCAmIDB4ZmZdO1xuICAgIGNvbnN0IGl0ZW1JZCA9IHRoaXMuZmxhZ3Mucm9tLml0ZW1HZXRzW2l0ZW1HZXRJZF0uaXRlbUlkO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLmZsYWdzLnJvbS5pdGVtc1tpdGVtSWRdO1xuICAgIGlmICghaXRlbSkgdGhyb3cgbmV3IEVycm9yKGBubyBpdGVtYCk7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbn1cblxuZnVuY3Rpb24gb2Jzb2xldGUob2Jzb2xldGU6IG51bWJlciB8ICgoY3R4OiBGbGFnQ29udGV4dCkgPT4gbnVtYmVyKSk6IEZsYWcge1xuICBpZiAodHlwZW9mIG9ic29sZXRlID09PSAnbnVtYmVyJykgb2Jzb2xldGUgPSAobyA9PiAoKSA9PiBvKShvYnNvbGV0ZSk7XG4gIHJldHVybiB7b2Jzb2xldGUsIFtGTEFHXTogdHJ1ZX0gYXMgYW55O1xufVxuZnVuY3Rpb24gZml4ZWQoaWQ6IG51bWJlciwgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtpZCwgZml4ZWQ6IHRydWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIHRyYWNrZWQoaWQ6IG51bWJlcik6IEZsYWcge1xuICByZXR1cm4gZml4ZWQoaWQsIFRSQUNLKTtcbn1cbmZ1bmN0aW9uIG1vdmFibGUoaWQ6IG51bWJlciwgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtpZCwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuZnVuY3Rpb24gZGlhbG9nUHJvZ3Jlc3Npb24obmFtZTogc3RyaW5nLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge25hbWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGRpYWxvZ1RvZ2dsZShuYW1lOiBzdHJpbmcsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7bmFtZSwgW0ZMQUddOiB0cnVlLCBsb2dpY30gYXMgYW55O1xufVxuXG5mdW5jdGlvbiBwc2V1ZG8ob3duZXI6IG9iamVjdCk6IEZsYWcge1xuICBjb25zdCBpZCA9IHBzZXVkb0NvdW50ZXIuZ2V0KG93bmVyKSB8fCAweDQwMDtcbiAgcHNldWRvQ291bnRlci5zZXQob3duZXIsIGlkICsgMSk7XG4gIHJldHVybiB7aWQsIFtGTEFHXTogdHJ1ZSwgbG9naWM6IFRSQUNLfSBhcyBhbnk7XG59XG5jb25zdCBwc2V1ZG9Db3VudGVyID0gbmV3IFdlYWtNYXA8b2JqZWN0LCBudW1iZXI+KCk7XG5cbi8vIG9ic29sZXRlIGZsYWdzIC0gZGVsZXRlIHRoZSBzZXRzIChzaG91bGQgbmV2ZXIgYmUgYSBjbGVhcilcbi8vICAgICAgICAgICAgICAgIC0gcmVwbGFjZSB0aGUgY2hlY2tzIHdpdGggdGhlIHJlcGxhY2VtZW50XG5cbi8vIC0tLSBtYXliZSBvYnNvbGV0ZSBmbGFncyBjYW4gaGF2ZSBkaWZmZXJlbnQgcmVwbGFjZW1lbnRzIGluXG4vLyAgICAgZGlmZmVyZW50IGNvbnRleHRzP1xuLy8gLS0tIGluIHBhcnRpY3VsYXIsIGl0ZW1nZXRzIHNob3VsZG4ndCBjYXJyeSAxeHggZmxhZ3M/XG5cblxuLyoqIFRyYWNrcyB1c2VkIGFuZCB1bnVzZWQgZmxhZ3MuICovXG5leHBvcnQgY2xhc3MgRmxhZ3Mge1xuXG4gIFtpZDogbnVtYmVyXTogRmxhZztcblxuICAvLyAwMHhcbiAgMHgwMDAgPSBmaXhlZCgweDAwMCwgRkFMU0UpO1xuICAweDAwMSA9IGZpeGVkKDB4MDAxKTtcbiAgMHgwMDIgPSBmaXhlZCgweDAwMik7XG4gIDB4MDAzID0gZml4ZWQoMHgwMDMpO1xuICAweDAwNCA9IGZpeGVkKDB4MDA0KTtcbiAgMHgwMDUgPSBmaXhlZCgweDAwNSk7XG4gIDB4MDA2ID0gZml4ZWQoMHgwMDYpO1xuICAweDAwNyA9IGZpeGVkKDB4MDA3KTtcbiAgMHgwMDggPSBmaXhlZCgweDAwOCk7XG4gIDB4MDA5ID0gZml4ZWQoMHgwMDkpO1xuICBVc2VkV2luZG1pbGxLZXkgPSBmaXhlZCgweDAwYSwgVFJBQ0spO1xuICAweDAwYiA9IG9ic29sZXRlKDB4MTAwKTsgLy8gY2hlY2s6IHN3b3JkIG9mIHdpbmQgLyB0YWxrZWQgdG8gbGVhZiBlbGRlclxuICAweDAwYyA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiB2aWxsYWdlcicpO1xuICBMZWFmVmlsbGFnZXJzUmVzY3VlZCA9IG1vdmFibGUoMHgwMGQpO1xuICAweDAwZSA9IG9ic29sZXRlKChzKSA9PiB7XG4gICAgaWYgKHMudHJpZ2dlcj8uaWQgPT09IDB4ODUpIHJldHVybiAweDE0MzsgLy8gY2hlY2s6IHRlbGVwYXRoeSAvIHN0b21cbiAgICByZXR1cm4gMHgyNDM7IC8vIGl0ZW06IHRlbGVwYXRoeVxuICB9KTtcbiAgV29rZVdpbmRtaWxsR3VhcmQgPSBtb3ZhYmxlKDB4MDBmLCBUUkFDSyk7XG5cbiAgLy8gMDF4XG4gIFR1cm5lZEluS2lyaXNhUGxhbnQgPSBtb3ZhYmxlKDB4MDEwKTtcbiAgMHgwMTEgPSBkaWFsb2dQcm9ncmVzc2lvbignV2VsY29tZWQgdG8gQW1hem9uZXMnKTtcbiAgMHgwMTIgPSBkaWFsb2dQcm9ncmVzc2lvbignVHJlYXN1cmUgaHVudGVyIGRlYWQnKTtcbiAgMHgwMTMgPSBvYnNvbGV0ZSgweDEzOCk7IC8vIGNoZWNrOiBicm9rZW4gc3RhdHVlIC8gc2FiZXJhIDFcbiAgLy8gdW51c2VkIDAxNCwgMDE1XG4gIDB4MDE2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1BvcnRvYSBxdWVlbiBSYWdlIGhpbnQnKTtcbiAgMHgwMTcgPSBvYnNvbGV0ZSgweDEwMik7IC8vIGNoZXN0OiBzd29yZCBvZiB3YXRlclxuICBFbnRlcmVkVW5kZXJncm91bmRDaGFubmVsID0gbW92YWJsZSgweDAxOCwgVFJBQ0spO1xuICAweDAxOSA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIHRpcmVkIG9mIHRhbGtpbmcnKTtcbiAgMHgwMWEgPSBkaWFsb2dQcm9ncmVzc2lvbignSW5pdGlhbCB0YWxrIHdpdGggUG9ydG9hIHF1ZWVuJyk7XG4gIE1lc2lhUmVjb3JkaW5nID0gbW92YWJsZSgweDAxYiwgVFJBQ0spO1xuICAweDAxYyA9IG9ic29sZXRlKDB4MTEwKTsgLy8gaXRlbTogbWlycm9yZWQgc2hpZWxkXG4gIFRhbGtlZFRvRm9ydHVuZVRlbGxlciA9IG1vdmFibGUoMHgxZCwgVFJBQ0spO1xuICBRdWVlblJldmVhbGVkID0gbW92YWJsZSgweDAxZSwgVFJBQ0spO1xuICAweDAxZiA9IG9ic29sZXRlKDB4MTA5KTsgLy8gY2hlY2s6IHJhZ2VcblxuICAvLyAwMnhcbiAgUXVlZW5Ob3RJblRocm9uZVJvb20gPSBtb3ZhYmxlKDB4MDIwKTtcbiAgUmV0dXJuZWRGb2dMYW1wID0gbW92YWJsZSgweDAyMSwgVFJBQ0spO1xuICAweDAyMiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTYWhhcmEgZWxkZXInKTtcbiAgMHgwMjMgPSBkaWFsb2dQcm9ncmVzc2lvbignU2FoYXJhIGVsZGVyIGRhdWdodGVyJyk7XG4gIDB4MDI0ID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICAweDAyNSA9IG9ic29sZXRlKDB4MTM2KTsgLy8gaGVhbGVkIGRvbHBoaW5cbiAgMHgwMjYgPSBvYnNvbGV0ZSgweDJmZCk7IC8vIHdhcnA6IHNoeXJvblxuICBTaHlyb25NYXNzYWNyZSA9IGZpeGVkKDB4MDI3LCBUUkFDSyk7IC8vIHByZXNodWZmbGUgaGFyZGNvZGVzIGZvciBkZWFkIHNwcml0ZXNcbiAgQ2hhbmdlV29tYW4gPSBmaXhlZCgweDAyOCk7IC8vIGhhcmRjb2RlZCBpbiBvcmlnaW5hbCByb21cbiAgQ2hhbmdlQWthaGFuYSA9IGZpeGVkKDB4MDI5KTtcbiAgQ2hhbmdlU29sZGllciA9IGZpeGVkKDB4MDJhKTtcbiAgQ2hhbmdlU3RvbSA9IGZpeGVkKDB4MDJiKTtcbiAgLy8gdW51c2VkIDAyY1xuICAweDAyZCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdTaHlyb24gc2FnZXMnKTtcbiAgMHgwMmUgPSBvYnNvbGV0ZSgweDEyZCk7IC8vIGNoZWNrOiBkZW8ncyBwZW5kYW50XG4gIFVzZWRCb3dPZlRydXRoID0gZml4ZWQoMHgwMmYpOyAgLy8gbW92ZWQgZnJvbSAwODYgaW4gcHJlcGFyc2VcblxuICAvLyAwM3hcbiAgLy8gdW51c2VkIDAzMFxuICAweDAzMSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdab21iaWUgdG93bicpO1xuICAweDAzMiA9IG9ic29sZXRlKDB4MTM3KTsgLy8gY2hlY2s6IGV5ZSBnbGFzc2VzXG4gIC8vIHVudXNlZCAwMzNcbiAgMHgwMzQgPSBkaWFsb2dQcm9ncmVzc2lvbignQWthaGFuYSBpbiB3YXRlcmZhbGwgY2F2ZScpOyAvLyA/Pz9cbiAgQ3VyZWRBa2FoYW5hID0gbW92YWJsZSgweDAzNSwgVFJBQ0spO1xuICAweDAzNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBa2FoYW5hIFNoeXJvbicpO1xuICAweDAzNyA9IG9ic29sZXRlKDB4MTQyKTsgLy8gY2hlY2s6IHBhcmFseXNpc1xuICBMZWFmQWJkdWN0aW9uID0gbW92YWJsZSgweDAzOCwgVFJBQ0spOyAvLyBvbmUtd2F5IGxhdGNoXG4gIDB4MDM5ID0gb2Jzb2xldGUoMHgxNDEpOyAvLyBjaGVjazogcmVmcmVzaFxuICBUYWxrZWRUb1plYnVJbkNhdmUgPSBtb3ZhYmxlKDB4MDNhLCBUUkFDSyk7XG4gIFRhbGtlZFRvWmVidUluU2h5cm9uID0gbW92YWJsZSgweDAzYiwgVFJBQ0spO1xuICAweDAzYyA9IG9ic29sZXRlKDB4MTNiKTsgLy8gY2hlc3Q6IGxvdmUgcGVuZGFudFxuICAweDAzZCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdBc2luYSBpbiBTaHlyb24gdGVtcGxlJyk7XG4gIEZvdW5kS2Vuc3VJbkRhbmNlSGFsbCA9IG1vdmFibGUoMHgwM2UsIFRSQUNLKTtcbiAgMHgwM2YgPSBvYnNvbGV0ZSgocykgPT4ge1xuICAgIGlmIChzLnRyaWdnZXI/LmlkID09PSAweGJhKSByZXR1cm4gMHgyNDQgLy8gaXRlbTogdGVsZXBvcnRcbiAgICByZXR1cm4gMHgxNDQ7IC8vIGNoZWNrOiB0ZWxlcG9ydFxuICB9KTtcblxuICAvLyAwNHhcbiAgMHgwNDAgPSBkaWFsb2dQcm9ncmVzc2lvbignVG9ybmVsIGluIFNoeXJvbiB0ZW1wbGUnKTtcbiAgMHgwNDEgPSBvYnNvbGV0ZSgweDEwNyk7IC8vIGNoZWNrOiBiYWxsIG9mIGZpcmUgLyBpbnNlY3RcbiAgLy8gdW51c2VkIDA0MlxuICAvLyB1bnVzZWQgMHgwNDMgPSBkaWFsb2dQcm9ncmVzc2lvbignT2FrJyk7XG4gIDB4MDQ0ID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIFJlc2N1ZWRDaGlsZCA9IGZpeGVkKDB4MDQ1LCBUUkFDSyk7IC8vIGhhcmRjb2RlZCAkM2U3ZDVcbiAgVXNlZEluc2VjdEZsdXRlID0gZml4ZWQoMHgwNDYpOyAvLyBjdXN0b20tYWRkZWQgJDY0ODg6NDBcbiAgUmVzY3VlZExlYWZFbGRlciA9IG1vdmFibGUoMHgwNDcpO1xuICAweDA0OCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUcmVhc3VyZSBodW50ZXIgZW1iYXJrZWQnKTtcbiAgMHgwNDkgPSBvYnNvbGV0ZSgweDEwMSk7IC8vIGNoZWNrOiBzd29yZCBvZiBmaXJlXG4gIDB4MDRhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0JvYXQgb3duZXInKTtcbiAgMHgwNGIgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiBzaWNrIG1lbicpO1xuICAweDA0YyA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHRyYWluaW5nIG1lbiAxJyk7XG4gIDB4MDRkID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gdHJhaW5pbmcgbWVuIDInKTtcbiAgMHgwNGUgPSBvYnNvbGV0ZSgweDEwNik7IC8vIGNoZXN0OiB0b3JuYWRvIGJyYWNlbGV0XG4gIDB4MDRmID0gb2Jzb2xldGUoMHgxMmIpOyAvLyBjaGVjazogd2FycmlvciByaW5nXG5cbiAgLy8gMDV4XG4gIEdpdmVuU3RhdHVlVG9Ba2FoYW5hID0gbW92YWJsZSgweDA1MCk7IC8vIGdpdmUgaXQgYmFjayBpZiB1bnN1Y2Nlc3NmdWw/XG4gIDB4MDUxID0gb2Jzb2xldGUoMHgxNDYpOyAvLyBjaGVjazogYmFycmllciAvIGFuZ3J5IHNlYVxuICBUYWxrZWRUb0R3YXJmTW90aGVyID0gbW92YWJsZSgweDA1MiwgVFJBQ0spO1xuICBMZWFkaW5nQ2hpbGQgPSBmaXhlZCgweDA1MywgVFJBQ0spOyAvLyBoYXJkY29kZWQgJDNlN2M0IGFuZCBmb2xsb3dpbmdcbiAgLy8gdW51c2VkIDA1NFxuICAweDA1NSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdaZWJ1IHJlc2N1ZWQnKTtcbiAgMHgwNTYgPSBkaWFsb2dQcm9ncmVzc2lvbignVG9ybmVsIHJlc2N1ZWQnKTtcbiAgMHgwNTcgPSBkaWFsb2dQcm9ncmVzc2lvbignQXNpbmEgcmVzY3VlZCcpO1xuICAvLyB1bnVzZWQgMDU4IC4uIDA1YVxuICBNdFNhYnJlR3VhcmRzRGVzcGF3bmVkID0gbW92YWJsZSgweDA1YiwgVFJVRSk7XG4gIC8vIHVudXNlZCAwNWMsIDA1ZFxuICAweDA1ZSA9IG9ic29sZXRlKDB4MjhkKTsgLy8gZHJheWdvbiAyXG4gIDB4MDVmID0gb2Jzb2xldGUoMHgyMDMpOyAvLyBpdGVtOiBzd29yZCBvZiB0aHVuZGVyXG4gIC8vIFRPRE8gLSBmaXggdXAgdGhlIE5QQyBzcGF3biBhbmQgdHJpZ2dlciBjb25kaXRpb25zIGluIFNoeXJvbi5cbiAgLy8gTWF5YmUganVzdCByZW1vdmUgdGhlIGN1dHNjZW5lIGVudGlyZWx5P1xuXG4gIC8vIDA2eFxuICAvLyB1bnVzZWQgMDYwXG4gIFRhbGtlZFRvU3RvbUluU3dhbiA9IG1vdmFibGUoMHgwNjEsIFRSQUNLKTtcbiAgMHgwNjIgPSBvYnNvbGV0ZSgweDE1MSk7IC8vIGNoZXN0OiBzYWNyZWQgc2hpZWxkXG4gIDB4MDYzID0gb2Jzb2xldGUoMHgxNDcpOyAvLyBjaGVjazogY2hhbmdlXG4gIC8vIHVudXNlZCAwNjRcbiAgLy8gU3dhbkdhdGVPcGVuZWQgPSBtb3ZhYmxlKH4weDA2NCk7IC8vIHdoeSB3b3VsZCB3ZSBhZGQgdGhpcz8gdXNlIDJiM1xuICBDdXJlZEtlbnN1ID0gbW92YWJsZSgweDA2NSwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDY2XG4gIDB4MDY3ID0gb2Jzb2xldGUoMHgxMGIpOyAvLyBjaGVjazogYmFsbCBvZiB0aHVuZGVyIC8gbWFkbyAxXG4gIDB4MDY4ID0gb2Jzb2xldGUoMHgxMDQpOyAvLyBjaGVjazogZm9yZ2VkIGNyeXN0YWxpc1xuICAvLyB1bnVzZWQgMDY5XG4gIFN0b25lZFBlb3BsZUN1cmVkID0gbW92YWJsZSgweDA2YSwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDZiXG4gIDB4MDZjID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIC8vIHVudXNlZCAwNmQgLi4gMDZmXG4gIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4gPSBmaXhlZCh+MHgwNmUsIFRSQUNLKTsgLy8sIHsgLy8gTk9URTogYWRkZWQgYnkgcmFuZG9cbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uaXRlbXMuU2hlbGxGbHV0ZS5pdGVtVXNlRGF0YVswXS53YW50XSxcbiAgLy8gfSk7XG5cbiAgLy8gMDd4XG4gIFBhcmFseXplZEtlbnN1SW5UYXZlcm4gPSBmaXhlZCgweDA3MCk7IC8vLCB7IC8vIGhhcmRjb2RlZCBpbiByYW5kbyBwcmVzaHVmZmxlLnNcbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uZmxhZ3MuUGFyYWx5c2lzLmlkXSxcbiAgLy8gfSk7XG4gIFBhcmFseXplZEtlbnN1SW5EYW5jZUhhbGwgPSBmaXhlZCgweDA3MSk7IC8vLCB7IC8vIGhhcmRjb2RlZCBpbiByYW5kbyBwcmVzaHVmZmxlLnNcbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uZmxhZ3MuUGFyYWx5c2lzLmlkXSxcbiAgLy8gfSk7XG4gIEZvdW5kS2Vuc3VJblRhdmVybiA9IG1vdmFibGUoMHgwNzIsIFRSQUNLKTtcbiAgMHgwNzMgPSBkaWFsb2dQcm9ncmVzc2lvbignU3RhcnRsZWQgbWFuIGluIExlYWYnKTtcbiAgLy8gdW51c2VkIDA3NFxuICAweDA3NSA9IG9ic29sZXRlKDB4MTM5KTsgLy8gY2hlY2s6IGdsb3dpbmcgbGFtcFxuICAweDA3NiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSBpbiBHb2EnKTtcbiAgMHgwNzcgPSBvYnNvbGV0ZSgweDEwOCk7IC8vIGNoZWNrOiBmbGFtZSBicmFjZWxldCAvIGtlbGJlc3F1ZSAxXG4gIDB4MDc4ID0gb2Jzb2xldGUoMHgxMGMpOyAvLyBjaGVzdDogc3Rvcm0gYnJhY2VsZXRcbiAgMHgwNzkgPSBvYnNvbGV0ZSgweDE0MCk7IC8vIGNoZWNrOiBib3cgb2YgdHJ1dGhcbiAgMHgwN2EgPSBvYnNvbGV0ZSgweDEwYSk7IC8vIGNoZXN0OiBibGl6emFyZCBicmFjZWxldFxuICAweDA3YiA9IG9ic29sZXRlKDB4MTA5KTsgLy8gcmFnZS9iYWxsIG9mIHdhdGVyXG4gIC8vIHVudXNlZCAwN2IsIDA3Y1xuICAweDA3ZCA9IG9ic29sZXRlKDB4MTNmKTsgLy8gY2hlc3Q6IGJvdyBvZiBzdW5cbiAgMHgwN2UgPSBkaWFsb2dQcm9ncmVzc2lvbignTXQgU2FicmUgZ3VhcmRzIDEnKTtcbiAgMHgwN2YgPSBkaWFsb2dQcm9ncmVzc2lvbignTXQgU2FicmUgZ3VhcmRzIDInKTtcblxuICBBbGFybUZsdXRlVXNlZE9uY2UgPSBmaXhlZCgweDc2KTsgLy8gaGFyZGNvZGVkOiBwcmVzaHVmZmxlLnMgUGF0Y2hUcmFkZUluSXRlbVxuICBGbHV0ZU9mTGltZVVzZWRPbmNlID0gZml4ZWQoMHg3Nyk7IC8vIGhhcmRjb2RlZDogcHJlc2h1ZmZsZS5zIFBhdGNoVHJhZGVJbkl0ZW1cblxuICAvLyAwOHhcbiAgLy8gdW51c2VkIDA4MCwgMDgxXG4gIDB4MDgyID0gb2Jzb2xldGUoMHgxNDApOyAvLyBjaGVjazogYm93IG9mIHRydXRoIC8gYXp0ZWNhXG4gIDB4MDgzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Jlc2N1ZWQgTGVhZiBlbGRlcicpO1xuICBMZWFmVmlsbGFnZXJzQ3VycmVudGx5QWJkdWN0ZWQgPSBtb3ZhYmxlKDB4MDg0KTtcbiAgTGVhZkVsZGVyQ3VycmVudGx5QWJkdWN0ZWQgPSBtb3ZhYmxlKDB4MDg1KTtcbiAgLy9Vc2VkQm93T2ZUcnV0aCA9IG1vdmFibGUoMHgwODYpOyAgLy8gbW92ZWQgbWFudWFsbHkgYXQgcHJlcGFyc2UgdG8gMmZcbiAgMHgwODcgPSBvYnNvbGV0ZSgweDEwNSk7IC8vIGNoZXN0OiBiYWxsIG9mIHdpbmRcbiAgMHgwODggPSBvYnNvbGV0ZSgweDEzMik7IC8vIGNoZWNrOiB3aW5kbWlsbCBrZXlcbiAgMHgwODkgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTdG9tXFwncyBnaXJsZnJpZW5kJyk7XG4gIDB4MDhhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU3RvbScpO1xuICAweDA4YiA9IG9ic29sZXRlKDB4MjM2KTsgLy8gaXRlbTogc2hlbGwgZmx1dGVcbiAgLy8gdW51c2VkIDB4MDhjID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N3YW4gZ3VhcmRzIGRlc3Bhd25lZCcpO1xuICAweDA4ZCA9IG9ic29sZXRlKDB4MTM3KTsgLy8gY2hlY2s6IGV5ZSBnbGFzc2VzXG4gIC8vIHVudXNlZCAwOGVcbiAgMHgwOGYgPSBvYnNvbGV0ZSgweDI4Myk7IC8vIGV2ZW50OiBjYWxtZWQgc2VhXG5cbiAgLy8gMDl4XG4gIDB4MDkwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N0b25lZCBwZW9wbGUgZ29uZScpO1xuICAvLyB1bnVzZWQgMDkxXG4gIDB4MDkyID0gb2Jzb2xldGUoMHgxMjgpOyAvLyBjaGVjazogZmx1dGUgb2YgbGltZVxuICAvLyB1bnVzZWQgMDkzIC4uIDA5NVxuICAweDA5NiA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiBlbGRlciBkYXVnaHRlcicpO1xuICAweDA5NyA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiB2aWxsYWdlcicpO1xuICAweDA5OCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdOYWRhcmUgdmlsbGFnZXInKTtcbiAgLy8gdW51c2VkIDA5OSwgMDlhXG4gIEFibGVUb1JpZGVEb2xwaGluID0gbW92YWJsZSgweDA5YiwgVFJBQ0spO1xuICBQb3J0b2FRdWVlbkdvaW5nQXdheSA9IG1vdmFibGUoMHgwOWMpO1xuICAvLyB1bnVzZWQgMDlkIC4uIDA5ZlxuXG4gIC8vIDBheFxuICAweDBhMCA9IG9ic29sZXRlKDB4MTI3KTsgLy8gY2hlY2s6IGluc2VjdCBmbHV0ZVxuICAvLyB1bnVzZWQgMGExLCAwYTJcbiAgMHgwYTMgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbi9mb3J0dW5lIHRlbGxlcicpO1xuICBXb2tlS2Vuc3VJbkxpZ2h0aG91c2UgPSBtb3ZhYmxlKDB4MGE0LCBUUkFDSyk7XG4gIC8vIFRPRE86IHRoaXMgbWF5IG5vdCBiZSBvYnNvbGV0ZSBpZiB0aGVyZSdzIG5vIGl0ZW0gaGVyZT9cbiAgMHgwYTUgPSBvYnNvbGV0ZSgweDEzMSk7IC8vIGNoZWNrOiBhbGFybSBmbHV0ZSAvIHplYnUgc3R1ZGVudFxuICAvLyBOT1RFOiBtYXJrIHRoZSBvYWsgZWxkZXIgcHJvZ3Jlc3Npb24gYXMgYXNzdW1lZCBmYWxzZSBiZWNhdXNlIG90aGVyd2lzZVxuICAvLyBpZiB0aGV5J3JlIGlnbm9yZWQgdGhlIGxvZ2ljIHRoaW5rcyB0aGUgZWxkZXIncyBpdGVtIGlzIGZyZWUgKGlmIHRoZXNlXG4gIC8vIHdlcmUgdHJhY2tlZCwgd2UnZCByZWFsaXplIGl0J3MgY29uZGl0aW9uYWwgb24gYWxyZWFkeSBoYXZpbmcgdGhlIGl0ZW0pLlxuICAweDBhNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsgZWxkZXIgMScsIEZBTFNFKTtcbiAgMHgwYTcgPSBkaWFsb2dUb2dnbGUoJ1N3YW4gZGFuY2VyJyk7XG4gIDB4MGE4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09hayBlbGRlciAyJywgRkFMU0UpO1xuICBUYWxrZWRUb0xlYWZSYWJiaXQgPSBtb3ZhYmxlKDB4MGE5LCBUUkFDSyk7XG4gIDB4MGFhID0gb2Jzb2xldGUoMHgxMWQpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFiID0gb2Jzb2xldGUoMHgxNTApOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIC8vIHVudXNlZCAwYWNcbiAgMHgwYWQgPSBvYnNvbGV0ZSgweDE1Mik7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWUgPSBvYnNvbGV0ZSgweDE1Myk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYWYgPSBvYnNvbGV0ZSgweDE1NCk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG5cbiAgLy8gMGJ4XG4gIDB4MGIwID0gb2Jzb2xldGUoMHgxNTUpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIxID0gb2Jzb2xldGUoMHgxNTYpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIyID0gb2Jzb2xldGUoMHgxNTcpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGIzID0gb2Jzb2xldGUoMHgxNTgpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBiNCA9IG9ic29sZXRlKDB4MTU5KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiNSA9IG9ic29sZXRlKDB4MTVhKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGI2ID0gb2Jzb2xldGUoMHgxMWYpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjcgPSBvYnNvbGV0ZSgweDE1Yyk7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiOCA9IG9ic29sZXRlKDB4MTVkKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI5ID0gb2Jzb2xldGUoMHgxMWUpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmEgPSBvYnNvbGV0ZSgweDE1ZSk7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYiA9IG9ic29sZXRlKDB4MTVmKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJjID0gb2Jzb2xldGUoMHgxNjApOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmQgPSBvYnNvbGV0ZSgweDEyMCk7IC8vIGNoZXN0OiBmcnVpdCBvZiBsaW1lXG4gIDB4MGJlID0gb2Jzb2xldGUoMHgxMjEpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYmYgPSBvYnNvbGV0ZSgweDE2Mik7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuXG4gIC8vIDBjeFxuICAweDBjMCA9IG9ic29sZXRlKDB4MTYzKTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGMxID0gb2Jzb2xldGUoMHgxNjQpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcbiAgMHgwYzIgPSBvYnNvbGV0ZSgweDEyMik7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGMzID0gb2Jzb2xldGUoMHgxNjUpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNCA9IG9ic29sZXRlKDB4MTY2KTsgLy8gY2hlc3Q6IGZydWl0IG9mIHJlcHVuXG4gIDB4MGM1ID0gb2Jzb2xldGUoMHgxNmIpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjNiA9IG9ic29sZXRlKDB4MTZjKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzcgPSBvYnNvbGV0ZSgweDEyMyk7IC8vIGNoZXN0OiBmcnVpdCBvZiByZXB1blxuICAweDBjOCA9IG9ic29sZXRlKDB4MTI0KTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwYzkgPSBvYnNvbGV0ZSgweDE2YSk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGNhID0gb2Jzb2xldGUoMHgxM2QpOyAvLyBjaGVjazogaXZvcnkgc3RhdHVlIC8ga2FybWluZVxuICAweDBjYiA9IG9ic29sZXRlKDB4MTJhKTsgLy8gY2hlc3Q6IHBvd2VyIHJpbmdcbiAgMHgwY2MgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgMHgwY2QgPSBvYnNvbGV0ZSgweDExNCk7IC8vIGNoZXN0OiBwc3ljaG8gc2hpZWxkXG4gIDB4MGNlID0gb2Jzb2xldGUoMHgxMjUpOyAvLyBjaGVzdDogc3RhdHVlIG9mIG9ueXhcbiAgMHgwY2YgPSBvYnNvbGV0ZSgweDEzMyk7IC8vIGNoZXN0OiBrZXkgdG8gcHJpc29uXG4gIFxuICAvLyAwZHhcbiAgMHgwZDAgPSBvYnNvbGV0ZSgweDEyOCk7IC8vIGNoZWNrOiBmbHV0ZSBvZiBsaW1lIC8gcXVlZW5cbiAgMHgwZDEgPSBvYnNvbGV0ZSgweDEzNSk7IC8vIGNoZXN0OiBmb2cgbGFtcFxuICAweDBkMiA9IG9ic29sZXRlKDB4MTY5KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwZDMgPSBvYnNvbGV0ZSgweDEyNik7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBkNCA9IG9ic29sZXRlKDB4MTViKTsgLy8gY2hlc3Q6IGZsdXRlIG9mIGxpbWVcbiAgMHgwZDUgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAxJyk7XG4gIDB4MGQ2ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMicpO1xuICAweDBkNyA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDMnKTtcbiAgMHgwZDggPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgcmVzY3VlZCcpO1xuICAweDBkOSA9IGRpYWxvZ1RvZ2dsZSgnU3RvbmVkIHBhaXInKTtcbiAgMHgwZGEgPSBkaWFsb2dQcm9ncmVzc2lvbignS2Vuc3UgZ29uZSBmcm9tIHRhdmVybicpO1xuICAweDBkYiA9IGRpYWxvZ1RvZ2dsZSgnSW4gU2FiZXJhXFwncyB0cmFwJyk7XG4gIDB4MGRjID0gb2Jzb2xldGUoMHgxNmYpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBkZCA9IG9ic29sZXRlKDB4MTcwKTsgLy8gbWltaWM/PyBtZWRpY2FsIGhlcmI/P1xuICAweDBkZSA9IG9ic29sZXRlKDB4MTJjKTsgLy8gY2hlc3Q6IGlyb24gbmVja2xhY2VcbiAgMHgwZGYgPSBvYnNvbGV0ZSgweDExYik7IC8vIGNoZXN0OiBiYXR0bGUgYXJtb3JcblxuICAvLyAwZXhcbiAgMHgwZTAgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBBa2FoYW5hJyk7XG4gIC8vIHVudXNlZCAwZTEgLi4gMGUzXG4gIDB4MGU0ID0gb2Jzb2xldGUoMHgxM2MpOyAvLyBjaGVzdDoga2lyaXNhIHBsYW50XG4gIDB4MGU1ID0gb2Jzb2xldGUoMHgxNmUpOyAvLyBjaGVzdDogd2FycCBib290c1xuICAweDBlNiA9IG9ic29sZXRlKDB4MTZkKTsgLy8gY2hlc3Q6IG9wZWwgc3RhdHVlXG4gIDB4MGU3ID0gb2Jzb2xldGUoMHgxMmYpOyAvLyBjaGVzdDogbGVhdGhlciBib290c1xuICAweDBlOCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFNoeXJvbiB2aWxsYWdlcicpO1xuICAweDBlOSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdEZWFkIFNoeXJvbiBndWFyZCcpO1xuICAweDBlYSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDEnKTtcbiAgMHgwZWIgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAyJyk7XG4gIDB4MGVjID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMycpO1xuICAweDBlZCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdNZXNpYScpO1xuICAvLyB1bnVzZWQgMGVlIC4uIDBmZlxuICBUYWxrZWRUb1plYnVTdHVkZW50ID0gbW92YWJsZSgweDBlZSwgVFJBQ0spO1xuXG4gIC8vIDEwMFxuICAweDEwMCA9IG9ic29sZXRlKDB4MTJlKTsgLy8gY2hlY2s6IHJhYmJpdCBib290cyAvIHZhbXBpcmVcbiAgMHgxMDEgPSBvYnNvbGV0ZSgweDEwNyk7IC8vIGNoZWNrOiBiYWxsIG9mIGZpcmUgLyBpbnNlY3RcbiAgMHgxMDIgPSBvYnNvbGV0ZSgweDEwOCk7IC8vIGNoZWNrOiBmbGFtZSBicmFjZWxldCAvIGtlbGJlc3F1ZSAxXG4gIDB4MTAzID0gb2Jzb2xldGUoMHgxMDkpOyAvLyBjaGVjazogYmFsbCBvZiB3YXRlciAvIHJhZ2VcbiAgLy8gdW51c2VkIDEwNFxuICAweDEwNSA9IG9ic29sZXRlKDB4MTI2KTsgLy8gY2hlY2s6IG9wZWwgc3RhdHVlIC8ga2VsYmVzcXVlIDJcbiAgMHgxMDYgPSBvYnNvbGV0ZSgweDEyMyk7IC8vIGNoZWNrOiBmcnVpdCBvZiByZXB1biAvIHNhYmVyYSAyXG4gIDB4MTA3ID0gb2Jzb2xldGUoMHgxMTIpOyAvLyBjaGVjazogc2FjcmVkIHNoaWVsZCAvIG1hZG8gMlxuICAweDEwOCA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgVXNlZEJvd09mTW9vbiA9IG1vdmFibGUoMHgxMDkpO1xuICBVc2VkQm93T2ZTdW4gPSBtb3ZhYmxlKDB4MTBhKTtcbiAgMHgxMGIgPSBvYnNvbGV0ZSgweDExYyk7IC8vIGNoZWNrOiBwc3ljaG8gYXJtb3IgLyBkcmF5Z29uIDFcbiAgMHgxMGMgPSBvYnNvbGV0ZSgweDE2MSk7IC8vIGNoZWNrOiBmcnVpdCBvZiBwb3dlciAvIHZhbXBpcmUgMlxuXG4gIC8vIDEwMCAuLiAxN2YgPT4gZml4ZWQgZmxhZ3MgZm9yIGNoZWNrcy5cblxuICAvLyBUT0RPIC0gYXJlIHRoZXNlIGFsbCBUUkFDSyBvciBqdXN0IHRoZSBub24tY2hlc3RzPyE/XG5cbiAgLy8gVE9ETyAtIGJhc2ljIGlkZWEgLSBOUEMgaGl0Ym94IGV4dGVuZHMgZG93biBvbmUgdGlsZT8gKGlzIHRoYXQgZW5vdWdoPylcbiAgLy8gICAgICAtIHN0YXR1ZXMgY2FuIGJlIGVudGVyZWQgYnV0IG5vdCBleGl0ZWQ/XG4gIC8vICAgICAgLSB1c2UgdHJpZ2dlciAofCBwYXJhbHlzaXMgfCBnbGl0Y2gpIGZvciBtb3Zpbmcgc3RhdHVlcz9cbiAgLy8gICAgICAgICAgLT4gZ2V0IG5vcm1hbCByZXF1aXJlbWVudHMgZm9yIGZyZWVcbiAgLy8gICAgICAgICAgLT4gYmV0dGVyIGhpdGJveD8gIGFueSB3YXkgdG8gZ2V0IHF1ZWVuIHRvIHdvcms/IHRvbyBtdWNoIHN0YXRlP1xuICAvLyAgICAgICAgICAgICBtYXkgbmVlZCB0byBoYXZlIHR3byBkaWZmZXJlbnQgdGhyb25lIHJvb21zPyAoZnVsbC9lbXB0eSlcbiAgLy8gICAgICAgICAgICAgYW5kIGhhdmUgZmxhZyBzdGF0ZSBhZmZlY3QgZXhpdD8/P1xuICAvLyAgICAgIC0gYXQgdGhlIHZlcnkgbGVhc3Qgd2UgY2FuIHVzZSBpdCBmb3IgdGhlIGhpdGJveCwgYnV0IHdlIG1heSBzdGlsbFxuICAvLyAgICAgICAgbmVlZCBjdXN0b20gb3ZlcmxheT9cblxuICAvLyBUT0RPIC0gcHNldWRvIGZsYWdzIHNvbWV3aGVyZT8gIGxpa2Ugc3dvcmQ/IGJyZWFrIGlyb24/IGV0Yy4uLlxuXG4gIExlYWZFbGRlciA9IHRyYWNrZWQofjB4MTAwKTtcbiAgT2FrRWxkZXIgPSB0cmFja2VkKH4weDEwMSk7XG4gIFdhdGVyZmFsbENhdmVTd29yZE9mV2F0ZXJDaGVzdCA9IHRyYWNrZWQofjB4MTAyKTtcbiAgU3R4eUxlZnRVcHBlclN3b3JkT2ZUaHVuZGVyQ2hlc3QgPSB0cmFja2VkKH4weDEwMyk7XG4gIE1lc2lhSW5Ub3dlciA9IHRyYWNrZWQoMHgxMDQpO1xuICBTZWFsZWRDYXZlQmFsbE9mV2luZENoZXN0ID0gdHJhY2tlZCh+MHgxMDUpO1xuICBNdFNhYnJlV2VzdFRvcm5hZG9CcmFjZWxldENoZXN0ID0gdHJhY2tlZCh+MHgxMDYpO1xuICBHaWFudEluc2VjdCA9IHRyYWNrZWQofjB4MTA3KTtcbiAgS2VsYmVzcXVlMSA9IHRyYWNrZWQofjB4MTA4KTtcbiAgUmFnZSA9IHRyYWNrZWQofjB4MTA5KTtcbiAgQXJ5bGxpc0Jhc2VtZW50Q2hlc3QgPSB0cmFja2VkKH4weDEwYSk7XG4gIE1hZG8xID0gdHJhY2tlZCh+MHgxMGIpO1xuICBTdG9ybUJyYWNlbGV0Q2hlc3QgPSB0cmFja2VkKH4weDEwYyk7XG4gIFdhdGVyZmFsbENhdmVSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxMTApOyAvLyByYW5kbyBjaGFuZ2VkIGluZGV4IVxuICBNYWRvMiA9IHRyYWNrZWQoMHgxMTIpO1xuICBTdHh5UmlnaHRNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxMTQpO1xuICBCYXR0bGVBcm1vckNoZXN0ID0gdHJhY2tlZCgweDExYik7XG4gIERyYXlnb24xID0gdHJhY2tlZCgweDExYyk7XG4gIFNlYWxlZENhdmVTbWFsbFJvb21CYWNrQ2hlc3QgPSB0cmFja2VkKDB4MTFkKTsgLy8gbWVkaWNhbCBoZXJiXG4gIFNlYWxlZENhdmVCaWdSb29tTm9ydGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTFlKTsgLy8gYW50aWRvdGVcbiAgRm9nTGFtcENhdmVGcm9udENoZXN0ID0gdHJhY2tlZCgweDExZik7IC8vIGx5c2lzIHBsYW50XG4gIE10SHlkcmFSaWdodENoZXN0ID0gdHJhY2tlZCgweDEyMCk7IC8vIGZydWl0IG9mIGxpbWVcbiAgU2FiZXJhVXBzdGFpcnNMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTIxKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRXZpbFNwaXJpdElzbGFuZExvd2VyQ2hlc3QgPSB0cmFja2VkKDB4MTIyKTsgLy8gbWFnaWMgcmluZ1xuICBTYWJlcmEyID0gdHJhY2tlZCgweDEyMyk7IC8vIGZydWl0IG9mIHJlcHVuXG4gIFNlYWxlZENhdmVTbWFsbFJvb21Gcm9udENoZXN0ID0gdHJhY2tlZCgweDEyNCk7IC8vIHdhcnAgYm9vdHNcbiAgQ29yZGVsR3Jhc3MgPSB0cmFja2VkKDB4MTI1KTtcbiAgS2VsYmVzcXVlMiA9IHRyYWNrZWQoMHgxMjYpOyAvLyBvcGVsIHN0YXR1ZVxuICBPYWtNb3RoZXIgPSB0cmFja2VkKDB4MTI3KTtcbiAgUG9ydG9hUXVlZW4gPSB0cmFja2VkKDB4MTI4KTtcbiAgQWthaGFuYVN0YXR1ZU9mT255eFRyYWRlaW4gPSB0cmFja2VkKDB4MTI5KTtcbiAgT2FzaXNDYXZlRm9ydHJlc3NCYXNlbWVudENoZXN0ID0gdHJhY2tlZCgweDEyYSk7XG4gIEJyb2thaGFuYSA9IHRyYWNrZWQoMHgxMmIpO1xuICBFdmlsU3Bpcml0SXNsYW5kUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTJjKTtcbiAgRGVvID0gdHJhY2tlZCgweDEyZCk7XG4gIFZhbXBpcmUxID0gdHJhY2tlZCgweDEyZSk7XG4gIE9hc2lzQ2F2ZU5vcnRod2VzdENoZXN0ID0gdHJhY2tlZCgweDEyZik7XG4gIEFrYWhhbmFGbHV0ZU9mTGltZVRyYWRlaW4gPSB0cmFja2VkKDB4MTMwKTtcbiAgWmVidVN0dWRlbnQgPSB0cmFja2VkKDB4MTMxKTsgLy8gVE9ETyAtIG1heSBvcHQgZm9yIDIgaW4gY2F2ZSBpbnN0ZWFkP1xuICBXaW5kbWlsbEd1YXJkQWxhcm1GbHV0ZVRyYWRlaW4gPSB0cmFja2VkKDB4MTMyKTtcbiAgTXRTYWJyZU5vcnRoQmFja09mUHJpc29uQ2hlc3QgPSB0cmFja2VkKDB4MTMzKTtcbiAgWmVidUluU2h5cm9uID0gdHJhY2tlZCgweDEzNCk7XG4gIEZvZ0xhbXBDYXZlQmFja0NoZXN0ID0gdHJhY2tlZCgweDEzNSk7XG4gIEluanVyZWREb2xwaGluID0gdHJhY2tlZCgweDEzNik7XG4gIENsYXJrID0gdHJhY2tlZCgweDEzNyk7XG4gIFNhYmVyYTEgPSB0cmFja2VkKDB4MTM4KTtcbiAgS2Vuc3VJbkxpZ2h0aG91c2UgPSB0cmFja2VkKDB4MTM5KTtcbiAgUmVwYWlyZWRTdGF0dWUgPSB0cmFja2VkKDB4MTNhKTtcbiAgVW5kZXJncm91bmRDaGFubmVsVW5kZXJ3YXRlckNoZXN0ID0gdHJhY2tlZCgweDEzYik7XG4gIEtpcmlzYU1lYWRvdyA9IHRyYWNrZWQoMHgxM2MpO1xuICBLYXJtaW5lID0gdHJhY2tlZCgweDEzZCk7XG4gIEFyeWxsaXMgPSB0cmFja2VkKDB4MTNlKTtcbiAgTXRIeWRyYVN1bW1pdENoZXN0ID0gdHJhY2tlZCgweDEzZik7XG4gIEF6dGVjYUluUHlyYW1pZCA9IHRyYWNrZWQoMHgxNDApO1xuICBaZWJ1QXRXaW5kbWlsbCA9IHRyYWNrZWQoMHgxNDEpO1xuICBNdFNhYnJlTm9ydGhTdW1taXQgPSB0cmFja2VkKDB4MTQyKTtcbiAgU3RvbUZpZ2h0UmV3YXJkID0gdHJhY2tlZCgweDE0Myk7XG4gIE10U2FicmVXZXN0VG9ybmVsID0gdHJhY2tlZCgweDE0NCk7XG4gIEFzaW5hSW5CYWNrUm9vbSA9IHRyYWNrZWQoMHgxNDUpO1xuICBCZWhpbmRXaGlybHBvb2wgPSB0cmFja2VkKDB4MTQ2KTtcbiAgS2Vuc3VJblN3YW4gPSB0cmFja2VkKDB4MTQ3KTtcbiAgU2xpbWVkS2Vuc3UgPSB0cmFja2VkKDB4MTQ4KTtcbiAgU2VhbGVkQ2F2ZUJpZ1Jvb21Tb3V0aHdlc3RDaGVzdCA9IHRyYWNrZWQoMHgxNTApOyAvLyBtZWRpY2FsIGhlcmJcbiAgLy8gdW51c2VkIDE1MSBzYWNyZWQgc2hpZWxkIGNoZXN0XG4gIE10U2FicmVXZXN0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNTIpOyAvLyBtZWRpY2FsIGhlcmJcbiAgTXRTYWJyZU5vcnRoTWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTUzKTsgLy8gbWVkaWNhbCBoZXJiXG4gIEZvcnRyZXNzTWFkb0hlbGx3YXlDaGVzdCA9IHRyYWNrZWQoMHgxNTQpOyAvLyBtYWdpYyByaW5nXG4gIFNhYmVyYVVwc3RhaXJzUmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNTUpOyAvLyBtZWRpY2FsIGhlcmIgYWNyb3NzIHNwaWtlc1xuICBNdEh5ZHJhRmFyTGVmdENoZXN0ID0gdHJhY2tlZCgweDE1Nik7IC8vIG1lZGljYWwgaGVyYlxuICBTdHh5TGVmdExvd2VyQ2hlc3QgPSB0cmFja2VkKDB4MTU3KTsgLy8gbWVkaWNhbCBoZXJiXG4gIEthcm1pbmVCYXNlbWVudExvd2VyTWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTU4KTsgLy8gbWFnaWMgcmluZ1xuICBFYXN0Q2F2ZU5vcnRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE1OSk7IC8vIG1lZGljYWwgaGVyYiAodW51c2VkKVxuICBPYXNpc0NhdmVFbnRyYW5jZUFjcm9zc1JpdmVyQ2hlc3QgPSB0cmFja2VkKDB4MTVhKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgLy8gdW51c2VkIDE1YiAybmQgZmx1dGUgb2YgbGltZSAtIGNoYW5nZWQgaW4gcmFuZG9cbiAgLy8gV2F0ZXJmYWxsQ2F2ZVJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDE1Yik7IC8vIDJuZCBmbHV0ZSBvZiBsaW1lXG4gIEV2aWxTcGlyaXRJc2xhbmRFeGl0Q2hlc3QgPSB0cmFja2VkKDB4MTVjKTsgLy8gbHlzaXMgcGxhbnRcbiAgRm9ydHJlc3NTYWJlcmFNaWRkbGVDaGVzdCA9IHRyYWNrZWQoMHgxNWQpOyAvLyBseXNpcyBwbGFudFxuICBNdFNhYnJlTm9ydGhVbmRlckJyaWRnZUNoZXN0ID0gdHJhY2tlZCgweDE1ZSk7IC8vIGFudGlkb3RlXG4gIEtpcmlzYVBsYW50Q2F2ZUNoZXN0ID0gdHJhY2tlZCgweDE1Zik7IC8vIGFudGlkb3RlXG4gIEZvcnRyZXNzTWFkb1VwcGVyTm9ydGhDaGVzdCA9IHRyYWNrZWQoMHgxNjApOyAvLyBhbnRpZG90ZVxuICBWYW1waXJlMiA9IHRyYWNrZWQoMHgxNjEpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBGb3J0cmVzc1NhYmVyYU5vcnRod2VzdENoZXN0ID0gdHJhY2tlZCgweDE2Mik7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEZvcnRyZXNzTWFkb0xvd2VyQ2VudGVyTm9ydGhDaGVzdCA9IHRyYWNrZWQoMHgxNjMpOyAvLyBvcGVsIHN0YXR1ZVxuICBPYXNpc0NhdmVOZWFyRW50cmFuY2VDaGVzdCA9IHRyYWNrZWQoMHgxNjQpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBNdEh5ZHJhTGVmdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTY1KTsgLy8gbWFnaWMgcmluZ1xuICBGb3J0cmVzc1NhYmVyYVNvdXRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDE2Nik7IC8vIGZydWl0IG9mIHJlcHVuXG4gIEtlbnN1SW5DYWJpbiA9IHRyYWNrZWQoMHgxNjcpOyAvLyBhZGRlZCBieSByYW5kb21pemVyIGlmIGZvZyBsYW1wIG5vdCBuZWVkZWRcbiAgLy8gdW51c2VkIDE2OCBtYWdpYyByaW5nIGNoZXN0XG4gIE10U2FicmVXZXN0TmVhcktlbnN1Q2hlc3QgPSB0cmFja2VkKDB4MTY5KTsgLy8gbWFnaWMgcmluZ1xuICBNdFNhYnJlV2VzdExlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNmEpOyAvLyB3YXJwIGJvb3RzXG4gIEZvcnRyZXNzTWFkb1VwcGVyQmVoaW5kV2FsbENoZXN0ID0gdHJhY2tlZCgweDE2Yik7IC8vIG1hZ2ljIHJpbmdcbiAgUHlyYW1pZENoZXN0ID0gdHJhY2tlZCgweDE2Yyk7IC8vIG1hZ2ljIHJpbmdcbiAgQ3J5cHRSaWdodENoZXN0ID0gdHJhY2tlZCgweDE2ZCk7IC8vIG9wZWwgc3RhdHVlXG4gIEthcm1pbmVCYXNlbWVudExvd2VyTGVmdENoZXN0ID0gdHJhY2tlZCgweDE2ZSk7IC8vIHdhcnAgYm9vdHNcbiAgRm9ydHJlc3NNYWRvTG93ZXJTb3V0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxNmYpOyAvLyBtYWdpYyByaW5nXG4gIC8vID0gdHJhY2tlZCgweDE3MCk7IC8vIG1pbWljIC8gbWVkaWNhbCBoZXJiXG4gIC8vIFRPRE8gLSBhZGQgYWxsIHRoZSBtaW1pY3MsIGdpdmUgdGhlbSBzdGFibGUgbnVtYmVycz9cbiAgRm9nTGFtcENhdmVNaWRkbGVOb3J0aE1pbWljID0gdHJhY2tlZCgweDE3MCk7XG4gIEZvZ0xhbXBDYXZlTWlkZGxlU291dGh3ZXN0TWltaWMgPSB0cmFja2VkKDB4MTcxKTtcbiAgV2F0ZXJmYWxsQ2F2ZUZyb250TWltaWMgPSB0cmFja2VkKDB4MTcyKTtcbiAgRXZpbFNwaXJpdElzbGFuZFJpdmVyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxNzMpO1xuICBNdEh5ZHJhRmluYWxDYXZlTWltaWMgPSB0cmFja2VkKDB4MTc0KTtcbiAgU3R4eUxlZnROb3J0aE1pbWljID0gdHJhY2tlZCgweDE3NSk7XG4gIFN0eHlSaWdodE5vcnRoTWltaWMgPSB0cmFja2VkKDB4MTc2KTtcbiAgU3R4eVJpZ2h0U291dGhNaW1pYyA9IHRyYWNrZWQoMHgxNzcpO1xuICBDcnlwdExlZnRQaXRNaW1pYyA9IHRyYWNrZWQoMHgxNzgpO1xuICBLYXJtaW5lQmFzZW1lbnRVcHBlck1pZGRsZU1pbWljID0gdHJhY2tlZCgweDE3OSk7XG4gIEthcm1pbmVCYXNlbWVudFVwcGVyUmlnaHRNaW1pYyA9IHRyYWNrZWQoMHgxN2EpO1xuICBLYXJtaW5lQmFzZW1lbnRMb3dlclJpZ2h0TWltaWMgPSB0cmFja2VkKDB4MTdiKTtcbiAgRWFzdENhdmVOb3J0aHdlc3RNaW1pYyA9IHRyYWNrZWQoMHgxN2MpO1xuICAvLyBUT0RPIC0gbWltaWNzIDEzLi4xNiA/XG5cbiAgLy8gMTgwIC4uIDFmZiA9PiBmaXhlZCBmbGFncyBmb3Igb3ZlcmZsb3cgYnVmZmVyLlxuXG4gIC8vIDIwMCAuLiAyN2YgPT4gZml4ZWQgZmxhZ3MgZm9yIGl0ZW1zLlxuICBTd29yZE9mV2luZCA9IHRyYWNrZWQoMHgyMDApO1xuICBTd29yZE9mRmlyZSA9IHRyYWNrZWQoMHgyMDEpO1xuICBTd29yZE9mV2F0ZXIgPSB0cmFja2VkKDB4MjAyKTtcbiAgU3dvcmRPZlRodW5kZXIgPSB0cmFja2VkKDB4MjAzKTtcbiAgQ3J5c3RhbGlzID0gdHJhY2tlZCgweDIwNCk7XG4gIEJhbGxPZldpbmQgPSB0cmFja2VkKDB4MjA1KTtcbiAgVG9ybmFkb0JyYWNlbGV0ID0gdHJhY2tlZCgweDIwNik7XG4gIEJhbGxPZkZpcmUgPSB0cmFja2VkKDB4MjA3KTtcbiAgRmxhbWVCcmFjZWxldCA9IHRyYWNrZWQoMHgyMDgpO1xuICBCYWxsT2ZXYXRlciA9IHRyYWNrZWQoMHgyMDkpO1xuICBCbGl6emFyZEJyYWNlbGV0ID0gdHJhY2tlZCgweDIwYSk7XG4gIEJhbGxPZlRodW5kZXIgPSB0cmFja2VkKDB4MjBiKTtcbiAgU3Rvcm1CcmFjZWxldCA9IHRyYWNrZWQoMHgyMGMpO1xuICBDYXJhcGFjZVNoaWVsZCA9IHRyYWNrZWQoMHgyMGQpO1xuICBCcm9uemVTaGllbGQgPSB0cmFja2VkKDB4MjBlKTtcbiAgUGxhdGludW1TaGllbGQgPSB0cmFja2VkKDB4MjBmKTtcbiAgTWlycm9yZWRTaGllbGQgPSB0cmFja2VkKDB4MjEwKTtcbiAgQ2VyYW1pY1NoaWVsZCA9IHRyYWNrZWQoMHgyMTEpO1xuICBTYWNyZWRTaGllbGQgPSB0cmFja2VkKDB4MjEyKTtcbiAgQmF0dGxlU2hpZWxkID0gdHJhY2tlZCgweDIxMyk7XG4gIFBzeWNob1NoaWVsZCA9IHRyYWNrZWQoMHgyMTQpO1xuICBUYW5uZWRIaWRlID0gdHJhY2tlZCgweDIxNSk7XG4gIExlYXRoZXJBcm1vciA9IHRyYWNrZWQoMHgyMTYpO1xuICBCcm9uemVBcm1vciA9IHRyYWNrZWQoMHgyMTcpO1xuICBQbGF0aW51bUFybW9yID0gdHJhY2tlZCgweDIxOCk7XG4gIFNvbGRpZXJTdWl0ID0gdHJhY2tlZCgweDIxOSk7XG4gIENlcmFtaWNTdWl0ID0gdHJhY2tlZCgweDIxYSk7XG4gIEJhdHRsZUFybW9yID0gdHJhY2tlZCgweDIxYik7XG4gIFBzeWNob0FybW9yID0gdHJhY2tlZCgweDIxYyk7XG4gIE1lZGljYWxIZXJiID0gdHJhY2tlZCgweDIxZCk7XG4gIEFudGlkb3RlID0gdHJhY2tlZCgweDIxZSk7XG4gIEx5c2lzUGxhbnQgPSB0cmFja2VkKDB4MjFmKTtcbiAgRnJ1aXRPZkxpbWUgPSB0cmFja2VkKDB4MjIwKTtcbiAgRnJ1aXRPZlBvd2VyID0gdHJhY2tlZCgweDIyMSk7XG4gIE1hZ2ljUmluZyA9IHRyYWNrZWQoMHgyMjIpO1xuICBGcnVpdE9mUmVwdW4gPSB0cmFja2VkKDB4MjIzKTtcbiAgV2FycEJvb3RzID0gdHJhY2tlZCgweDIyNCk7XG4gIFN0YXR1ZU9mT255eCA9IHRyYWNrZWQoMHgyMjUpO1xuICBPcGVsU3RhdHVlID0gdHJhY2tlZCgweDIyNik7XG4gIEluc2VjdEZsdXRlID0gdHJhY2tlZCgweDIyNyk7XG4gIEZsdXRlT2ZMaW1lID0gdHJhY2tlZCgweDIyOCk7XG4gIEdhc01hc2sgPSB0cmFja2VkKDB4MjI5KTtcbiAgUG93ZXJSaW5nID0gdHJhY2tlZCgweDIyYSk7XG4gIFdhcnJpb3JSaW5nID0gdHJhY2tlZCgweDIyYik7XG4gIElyb25OZWNrbGFjZSA9IHRyYWNrZWQoMHgyMmMpO1xuICBEZW9zUGVuZGFudCA9IHRyYWNrZWQoMHgyMmQpO1xuICBSYWJiaXRCb290cyA9IHRyYWNrZWQoMHgyMmUpO1xuICBMZWF0aGVyQm9vdHMgPSB0cmFja2VkKDB4MjJmKTtcbiAgU2hpZWxkUmluZyA9IHRyYWNrZWQoMHgyMzApO1xuICBBbGFybUZsdXRlID0gdHJhY2tlZCgweDIzMSk7XG4gIFdpbmRtaWxsS2V5ID0gdHJhY2tlZCgweDIzMik7XG4gIEtleVRvUHJpc29uID0gdHJhY2tlZCgweDIzMyk7XG4gIEtleVRvU3R4eSA9IHRyYWNrZWQoMHgyMzQpO1xuICBGb2dMYW1wID0gdHJhY2tlZCgweDIzNSk7XG4gIFNoZWxsRmx1dGUgPSB0cmFja2VkKDB4MjM2KTtcbiAgRXllR2xhc3NlcyA9IHRyYWNrZWQoMHgyMzcpO1xuICBCcm9rZW5TdGF0dWUgPSB0cmFja2VkKDB4MjM4KTtcbiAgR2xvd2luZ0xhbXAgPSB0cmFja2VkKDB4MjM5KTtcbiAgU3RhdHVlT2ZHb2xkID0gdHJhY2tlZCgweDIzYSk7XG4gIExvdmVQZW5kYW50ID0gdHJhY2tlZCgweDIzYik7XG4gIEtpcmlzYVBsYW50ID0gdHJhY2tlZCgweDIzYyk7XG4gIEl2b3J5U3RhdHVlID0gdHJhY2tlZCgweDIzZCk7XG4gIEJvd09mTW9vbiA9IHRyYWNrZWQoMHgyM2UpO1xuICBCb3dPZlN1biA9IHRyYWNrZWQoMHgyM2YpO1xuICBCb3dPZlRydXRoID0gdHJhY2tlZCgweDI0MCk7XG4gIFJlZnJlc2ggPSB0cmFja2VkKDB4MjQxKTtcbiAgUGFyYWx5c2lzID0gdHJhY2tlZCgweDI0Mik7XG4gIFRlbGVwYXRoeSA9IHRyYWNrZWQoMHgyNDMpO1xuICBUZWxlcG9ydCA9IHRyYWNrZWQoMHgyNDQpO1xuICBSZWNvdmVyID0gdHJhY2tlZCgweDI0NSk7XG4gIEJhcnJpZXIgPSB0cmFja2VkKDB4MjQ2KTtcbiAgQ2hhbmdlID0gdHJhY2tlZCgweDI0Nyk7XG4gIEZsaWdodCA9IHRyYWNrZWQoMHgyNDgpO1xuXG4gIC8vIDI4MCAuLiAyZjAgPT4gZml4ZWQgZmxhZ3MgZm9yIHdhbGxzLlxuICBDYWxtZWRBbmdyeVNlYSA9IHRyYWNrZWQoMHgyODMpO1xuICBPcGVuZWRKb2VsU2hlZCA9IHRyYWNrZWQoMHgyODcpO1xuICBEcmF5Z29uMiA9IHRyYWNrZWQoMHgyOGQpO1xuICBPcGVuZWRDcnlwdCA9IHRyYWNrZWQoMHgyOGUpO1xuICAvLyBOT1RFOiAyOGYgaXMgZmxhZ2dlZCBmb3IgZHJheWdvbidzIGZsb29yLCBidXQgaXMgdW51c2VkIGFuZCB1bm5lZWRlZFxuICBPcGVuZWRTdHh5ID0gdHJhY2tlZCgweDJiMCk7XG4gIE9wZW5lZFN3YW5HYXRlID0gdHJhY2tlZCgweDJiMyk7XG4gIE9wZW5lZFByaXNvbiA9IHRyYWNrZWQoMHgyZDgpO1xuICBPcGVuZWRTZWFsZWRDYXZlID0gdHJhY2tlZCgweDJlZSk7XG5cbiAgLy8gTm90aGluZyBldmVyIHNldHMgdGhpcywgc28ganVzdCB1c2UgaXQgcmlnaHQgb3V0LlxuICBBbHdheXNUcnVlID0gZml4ZWQoMHgyZjAsIFRSVUUpO1xuXG4gIFdhcnBMZWFmID0gdHJhY2tlZCgweDJmNSk7XG4gIFdhcnBCcnlubWFlciA9IHRyYWNrZWQoMHgyZjYpO1xuICBXYXJwT2FrID0gdHJhY2tlZCgweDJmNyk7XG4gIFdhcnBOYWRhcmUgPSB0cmFja2VkKDB4MmY4KTtcbiAgV2FycFBvcnRvYSA9IHRyYWNrZWQoMHgyZjkpO1xuICBXYXJwQW1hem9uZXMgPSB0cmFja2VkKDB4MmZhKTtcbiAgV2FycEpvZWwgPSB0cmFja2VkKDB4MmZiKTtcbiAgV2FycFpvbWJpZSA9IHRyYWNrZWQofjB4MmZiKTtcbiAgV2FycFN3YW4gPSB0cmFja2VkKDB4MmZjKTtcbiAgV2FycFNoeXJvbiA9IHRyYWNrZWQoMHgyZmQpO1xuICBXYXJwR29hID0gdHJhY2tlZCgweDJmZSk7XG4gIFdhcnBTYWhhcmEgPSB0cmFja2VkKDB4MmZmKTtcblxuICAvLyBQc2V1ZG8gZmxhZ3NcbiAgU3dvcmQgPSBwc2V1ZG8odGhpcyk7XG4gIE1vbmV5ID0gcHNldWRvKHRoaXMpO1xuICBCcmVha1N0b25lID0gcHNldWRvKHRoaXMpO1xuICBCcmVha0ljZSA9IHBzZXVkbyh0aGlzKTtcbiAgRm9ybUJyaWRnZSA9IHBzZXVkbyh0aGlzKTtcbiAgQnJlYWtJcm9uID0gcHNldWRvKHRoaXMpO1xuICBUcmF2ZWxTd2FtcCA9IHBzZXVkbyh0aGlzKTtcbiAgQ3Jvc3NQYWluID0gcHNldWRvKHRoaXMpO1xuICBDbGltYldhdGVyZmFsbCA9IHBzZXVkbyh0aGlzKTtcbiAgQnV5SGVhbGluZyA9IHBzZXVkbyh0aGlzKTtcbiAgQnV5V2FycCA9IHBzZXVkbyh0aGlzKTtcbiAgU2hvb3RpbmdTdGF0dWUgPSBwc2V1ZG8odGhpcyk7XG4gIENsaW1iU2xvcGU4ID0gcHNldWRvKHRoaXMpOyAvLyBjbGltYiBzbG9wZXMgaGVpZ2h0IDYtOFxuICBDbGltYlNsb3BlOSA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgc2xvcGVzIGhlaWdodCA5XG4gIFdpbGRXYXJwID0gcHNldWRvKHRoaXMpO1xuXG4gIC8vIE1hcCBvZiBmbGFncyB0aGF0IGFyZSBcIndhaXRpbmdcIiBmb3IgYSBwcmV2aW91c2x5LXVzZWQgSUQuXG4gIC8vIFNpZ25pZmllZCB3aXRoIGEgbmVnYXRpdmUgKG9uZSdzIGNvbXBsZW1lbnQpIElEIGluIHRoZSBGbGFnIG9iamVjdC5cbiAgcHJpdmF0ZSByZWFkb25seSB1bmFsbG9jYXRlZCA9IG5ldyBNYXA8bnVtYmVyLCBGbGFnPigpO1xuXG4gIC8vIC8vIE1hcCBvZiBhdmFpbGFibGUgSURzLlxuICAvLyBwcml2YXRlIHJlYWRvbmx5IGF2YWlsYWJsZSA9IFtcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMDAwIC4uIDBmZlxuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAxMDAgLi4gMWZmXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDIwMCAuLiAyZmZcbiAgLy8gXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIC8vIEJ1aWxkIHVwIGFsbCB0aGUgZmxhZ3MgYXMgYWN0dWFsIGluc3RhbmNlcyBvZiBGbGFnLlxuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHtcbiAgICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNwZWMgPSB0aGlzW2tleV07XG4gICAgICBpZiAoIShzcGVjIGFzIGFueSlbRkxBR10pIGNvbnRpbnVlO1xuICAgICAgLy8gUmVwbGFjZSBpdCB3aXRoIGFuIGFjdHVhbCBmbGFnLiAgV2UgbWF5IG5lZWQgYSBuYW1lLCBldGMuLi5cbiAgICAgIGNvbnN0IGtleU51bWJlciA9IE51bWJlcihrZXkpO1xuICAgICAgY29uc3QgaWQgPSB0eXBlb2Ygc3BlYy5pZCA9PT0gJ251bWJlcicgPyBzcGVjLmlkIDoga2V5TnVtYmVyO1xuICAgICAgaWYgKGlzTmFOKGlkKSkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZzogJHtrZXl9YCk7XG4gICAgICBjb25zdCBuYW1lID1cbiAgICAgICAgICBzcGVjLm5hbWUgfHxcbiAgICAgICAgICAoaXNOYU4oa2V5TnVtYmVyKSA/IHVwcGVyQ2FtZWxUb1NwYWNlcyhrZXkpIDogZmxhZ05hbWUoaWQpKTtcbiAgICAgIGNvbnN0IGZsYWcgPSBuZXcgRmxhZyh0aGlzLCBuYW1lLCBpZCwgc3BlYyk7XG4gICAgICB0aGlzW2tleV0gPSBmbGFnO1xuICAgICAgLy8gSWYgSUQgaXMgbmVnYXRpdmUsIHRoZW4gc3RvcmUgaXQgYXMgdW5hbGxvY2F0ZWQuXG4gICAgICBpZiAoZmxhZy5pZCA8IDApIHtcbiAgICAgICAgdGhpcy51bmFsbG9jYXRlZC5zZXQofmZsYWcuaWQsIGZsYWcpO1xuICAgICAgfSBlbHNlIGlmICghdGhpc1tmbGFnLmlkXSkge1xuICAgICAgICB0aGlzW2ZsYWcuaWRdID0gZmxhZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBtaXNzaW5nIGZsYWdzLlxuICAgIGZvciAobGV0IGkgPSAweDEwMDsgaSA8IDB4MTgwOyBpKyspIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBgQ2hlY2sgJHtoZXgoaSAmIDB4ZmYpfWA7XG4gICAgICBpZiAodGhpc1tpXSkge1xuICAgICAgICBpZiAoIXRoaXNbaV0uZml4ZWQgJiYgIXRoaXMudW5hbGxvY2F0ZWQuaGFzKGkpKSB7XG4gICAgICAgICAgdGhpcy51bmFsbG9jYXRlZC5zZXQoXG4gICAgICAgICAgICAgIGksIG5ldyBGbGFnKHRoaXMsIG5hbWUsIH5pLCB7Zml4ZWQ6IHRydWV9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgRmxhZyh0aGlzLCBuYW1lLCBpLCB7Zml4ZWQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDB4MTgwOyBpIDwgMHgyODA7IGkrKykge1xuICAgICAgaWYgKCF0aGlzW2ldKSB7XG4gICAgICAgIC8vIEl0ZW0gYnVmZmVyIGhlcmVcbiAgICAgICAgY29uc3QgdHlwZSA9IGkgPCAweDIwMCA/ICdCdWZmZXIgJyA6ICdJdGVtICc7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgRmxhZyh0aGlzLCB0eXBlICsgaGV4KGkpLCBpLCB7Zml4ZWQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRm9yIHRoZSByZW1haW5kZXIsIGZpbmQgd2FsbHMgaW4gbWFwcy5cbiAgICAvLyAgLSBkbyB3ZSBuZWVkIHRvIHB1bGwgdGhlbSBmcm9tIGxvY2F0aW9ucz8/IG9yIHRoaXMgZG9pbmcgYW55dGhpbmc/P1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgICAgaWYgKHRoaXNbZi5mbGFnXSkgY29udGludWU7XG4gICAgICAgIHRoaXNbZi5mbGFnXSA9IHdhbGxGbGFnKHRoaXMsIGYuZmxhZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU2F2ZXMgPiA0NzAgYnl0ZXMgb2YgcmVkdW5kYW50IGZsYWcgc2V0cyFcbiAgZGVmcmFnKCkge1xuICAgIC8vIG1ha2UgYSBtYXAgb2YgbmV3IElEcyBmb3IgZXZlcnl0aGluZy5cbiAgICBjb25zdCByZW1hcHBpbmcgPSBuZXcgTWFwPG51bWJlciwgKGY6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+KCk7XG4gICAgY29uc3QgdW51c2VkID0gbmV3IFNldDxudW1iZXI+KCk7XG5cbiAgICAvLyBmaXJzdCBoYW5kbGUgYWxsIHRoZSBvYnNvbGV0ZSBmbGFncyAtIG9uY2UgdGhlIHJlbWFwcGluZyBpcyBwdWxsZWQgb2ZmXG4gICAgLy8gd2UgY2FuIHNpbXBseSB1bnJlZiB0aGVtLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgzMDA7IGkrKykge1xuICAgICAgY29uc3QgZiA9IHRoaXNbaV07XG4gICAgICBjb25zdCBvID0gZj8ub2Jzb2xldGU7XG4gICAgICBpZiAobykge1xuICAgICAgICByZW1hcHBpbmcuc2V0KGksIChjOiBGbGFnQ29udGV4dCkgPT4gYy5zZXQgPyAtMSA6IG8uY2FsbChmLCBjKSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2ldO1xuICAgICAgfSBlbHNlIGlmICghZikge1xuICAgICAgICB1bnVzZWQuYWRkKGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG5vdyBtb3ZlIGFsbCB0aGUgbW92YWJsZSBmbGFncy5cbiAgICBsZXQgaSA9IDA7XG4gICAgbGV0IGogPSAweDJmZjtcbiAgICAvLyBXQVJOSU5HOiBpIGFuZCBqIGFyZSBib3VuZCB0byB0aGUgb3V0ZXIgc2NvcGUhICBDbG9zaW5nIG92ZXIgdGhlbVxuICAgIC8vIHdpbGwgTk9UIHdvcmsgYXMgaW50ZW5kZWQuXG4gICAgZnVuY3Rpb24gcmV0PFQ+KHg6IFQpOiAoKSA9PiBUIHsgcmV0dXJuICgpID0+IHg7IH1cbiAgICB3aGlsZSAoaSA8IGopIHtcbiAgICAgIGlmICh0aGlzW2ldIHx8IHRoaXMudW5hbGxvY2F0ZWQuaGFzKGkpKSB7IGkrKzsgY29udGludWU7IH1cbiAgICAgIGNvbnN0IGYgPSB0aGlzW2pdO1xuICAgICAgaWYgKCFmIHx8IGYuZml4ZWQpIHsgai0tOyBjb250aW51ZTsgfVxuICAgICAgLy8gZiBpcyBhIG1vdmFibGUgZmxhZy4gIE1vdmUgaXQgdG8gaS5cbiAgICAgIHJlbWFwcGluZy5zZXQoaiwgcmV0KGkpKTtcbiAgICAgIChmIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IGk7XG4gICAgICB0aGlzW2ldID0gZjtcbiAgICAgIGRlbGV0ZSB0aGlzW2pdO1xuICAgICAgaSsrO1xuICAgICAgai0tO1xuICAgIH1cblxuICAgIC8vIGdvIHRocm91Z2ggYWxsIHRoZSBwb3NzaWJsZSBwbGFjZXMgd2UgY291bGQgZmluZCBmbGFncyBhbmQgcmVtYXAhXG4gICAgdGhpcy5yZW1hcEZsYWdzKHJlbWFwcGluZywgdW51c2VkKTtcblxuICAgIC8vIFVuYWxsb2NhdGVkIGZsYWdzIGRvbid0IG5lZWQgYW55IHJlbWFwcGluZy5cbiAgICBmb3IgKGNvbnN0IFt3YW50LCBmbGFnXSBvZiB0aGlzLnVuYWxsb2NhdGVkKSB7XG4gICAgICBpZiAodGhpc1t3YW50XSkgY29udGludWU7XG4gICAgICB0aGlzLnVuYWxsb2NhdGVkLmRlbGV0ZSh3YW50KTtcbiAgICAgICh0aGlzW3dhbnRdID0gZmxhZyBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSB3YW50O1xuICAgIH1cblxuICAgIC8vaWYgKHRoaXMudW5hbGxvY2F0ZWQuc2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZnVsbHkgYWxsb2NhdGVgKTtcblxuICAgIC8vIFJlcG9ydCBob3cgdGhlIGRlZnJhZyB3ZW50P1xuICAgIGNvbnN0IGZyZWUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkgZnJlZS5wdXNoKGhleDMoaSkpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhgRnJlZSBmbGFnczogJHtmcmVlLmpvaW4oJyAnKX1gKTtcbiAgfVxuXG4gIGluc2VydFpvbWJpZVdhcnBGbGFnKCkge1xuICAgIC8vIE1ha2Ugc3BhY2UgZm9yIHRoZSBuZXcgZmxhZyBiZXR3ZWVuIEpvZWwgYW5kIFN3YW5cbiAgICBjb25zdCByZW1hcHBpbmcgPSBuZXcgTWFwPG51bWJlciwgKGY6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+KCk7XG4gICAgaWYgKHRoaXNbMHgyZjRdKSB0aHJvdyBuZXcgRXJyb3IoYE5vIHNwYWNlIHRvIGluc2VydCB3YXJwIGZsYWdgKTtcbiAgICBjb25zdCBuZXdJZCA9IH50aGlzLldhcnBab21iaWUuaWQ7XG4gICAgaWYgKG5ld0lkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgV2FycFpvbWJpZSBpZGApO1xuICAgIGZvciAobGV0IGkgPSAweDJmNDsgaSA8IG5ld0lkOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB0aGlzW2kgKyAxXTtcbiAgICAgICh0aGlzW2ldIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IGk7XG4gICAgICByZW1hcHBpbmcuc2V0KGkgKyAxLCAoKSA9PiBpKTtcbiAgICB9XG4gICAgKHRoaXMuV2FycFpvbWJpZSBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBuZXdJZDtcbiAgICB0aGlzW25ld0lkXSA9IHRoaXMuV2FycFpvbWJpZTtcbiAgICB0aGlzLnJlbWFwRmxhZ3MocmVtYXBwaW5nKTtcbiAgfVxuXG4gIHJlbWFwKHNyYzogbnVtYmVyLCBkZXN0OiBudW1iZXIpIHtcbiAgICB0aGlzLnJlbWFwRmxhZ3MobmV3IE1hcChbW3NyYywgKCkgPT4gZGVzdF1dKSk7XG4gIH1cblxuICByZW1hcEZsYWdzKHJlbWFwcGluZzogTWFwPG51bWJlciwgKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcj4sXG4gICAgICAgICAgICAgdW51c2VkPzogU2V0PG51bWJlcj4pIHtcbiAgICBmdW5jdGlvbiBwcm9jZXNzTGlzdChsaXN0OiBudW1iZXJbXSwgY3R4OiBGbGFnQ29udGV4dCkge1xuICAgICAgZm9yIChsZXQgaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgbGV0IGYgPSBsaXN0W2ldO1xuICAgICAgICBpZiAoZiA8IDApIGYgPSB+ZjtcbiAgICAgICAgaWYgKHVudXNlZCAmJiB1bnVzZWQuaGFzKGYpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTSE9VTEQgQkUgVU5VU0VEOiAke2hleChmKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZW1hcCA9IHJlbWFwcGluZy5nZXQoZik7XG4gICAgICAgIGlmIChyZW1hcCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgbGV0IG1hcHBlZCA9IHJlbWFwKHsuLi5jdHgsIGluZGV4OiBpfSk7XG4gICAgICAgIGlmIChtYXBwZWQgPj0gMCkge1xuICAgICAgICAgIGxpc3RbaV0gPSBsaXN0W2ldIDwgMCA/IH5tYXBwZWQgOiBtYXBwZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcHJvY2VzcyhmbGFnOiBudW1iZXIsIGN0eDogRmxhZ0NvbnRleHQpIHtcbiAgICAgIGxldCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgICAgaWYgKHVudXNlZCAmJiB1bnVzZWQuaGFzKHVuc2lnbmVkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNIT1VMRCBCRSBVTlVTRUQ6ICR7aGV4KHVuc2lnbmVkKX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlbWFwID0gcmVtYXBwaW5nLmdldCh1bnNpZ25lZCk7XG4gICAgICBpZiAocmVtYXAgPT0gbnVsbCkgcmV0dXJuIGZsYWc7XG4gICAgICBsZXQgbWFwcGVkID0gcmVtYXAoY3R4KTtcbiAgICAgIGlmIChtYXBwZWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBmbGFnIGRlbGV0ZWApO1xuICAgICAgcmV0dXJuIGZsYWcgPCAwID8gfm1hcHBlZCA6IG1hcHBlZDtcbiAgICB9XG5cbiAgICAvLyBMb2NhdGlvbiBmbGFnc1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICAgIGZsYWcuZmxhZyA9IHByb2Nlc3MoZmxhZy5mbGFnLCB7bG9jYXRpb259KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOUEMgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLnJvbS5ucGNzKSB7XG4gICAgICBpZiAoIW5wYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgW2xvYywgY29uZHNdIG9mIG5wYy5zcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgICAgcHJvY2Vzc0xpc3QoY29uZHMsIHtucGMsIHNwYXduOiBsb2N9KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgICBkLmNvbmRpdGlvbiA9IHByb2Nlc3MoZC5jb25kaXRpb24sIHtucGMsIGRpYWxvZzogdHJ1ZX0pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbLCBkc10gb2YgbnBjLmxvY2FsRGlhbG9ncykge1xuICAgICAgICBmb3IgKGNvbnN0IGQgb2YgZHMpIHtcbiAgICAgICAgICBkLmNvbmRpdGlvbiA9IHByb2Nlc3MoZC5jb25kaXRpb24sIHtucGMsIGRpYWxvZzogdHJ1ZX0pO1xuICAgICAgICAgIHByb2Nlc3NMaXN0KGQuZmxhZ3MsIHtucGMsIGRpYWxvZzogdHJ1ZSwgc2V0OiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGZsYWdzXG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMucm9tLnRyaWdnZXJzKSB7XG4gICAgICBpZiAoIXRyaWdnZXIudXNlZCkgY29udGludWU7XG4gICAgICBwcm9jZXNzTGlzdCh0cmlnZ2VyLmNvbmRpdGlvbnMsIHt0cmlnZ2VyfSk7XG4gICAgICBwcm9jZXNzTGlzdCh0cmlnZ2VyLmZsYWdzLCB7dHJpZ2dlciwgc2V0OiB0cnVlfSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHVwZGF0aW5nIHRlbGVwYXRoeT8hP1xuXG4gICAgLy8gSXRlbUdldCBmbGFnc1xuICAgIGZvciAoY29uc3QgaXRlbUdldCBvZiB0aGlzLnJvbS5pdGVtR2V0cykge1xuICAgICAgcHJvY2Vzc0xpc3QoaXRlbUdldC5mbGFncywge3NldDogdHJ1ZX0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5yb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgaXRlbVVzZSBvZiBpdGVtLml0ZW1Vc2VEYXRhKSB7XG4gICAgICAgIGlmIChpdGVtVXNlLmtpbmQgPT09ICdmbGFnJykge1xuICAgICAgICAgIGl0ZW1Vc2Uud2FudCA9IHByb2Nlc3MoaXRlbVVzZS53YW50LCB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzc0xpc3QoaXRlbVVzZS5mbGFncywge3NldDogdHJ1ZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBlbHNlP1xuICB9XG5cbiAgLy8gVE9ETyAtIG1hbmlwdWxhdGUgdGhpcyBzdHVmZlxuXG4gIC8vIHByaXZhdGUgcmVhZG9ubHkgYXZhaWxhYmxlID0gbmV3IFNldDxudW1iZXI+KFtcbiAgLy8gICAvLyBUT0RPIC0gdGhlcmUncyBhIHRvbiBvZiBsb3dlciBmbGFncyBhcyB3ZWxsLlxuICAvLyAgIC8vIFRPRE8gLSB3ZSBjYW4gcmVwdXJwb3NlIGFsbCB0aGUgb2xkIGl0ZW0gZmxhZ3MuXG4gIC8vICAgMHgyNzAsIDB4MjcxLCAweDI3MiwgMHgyNzMsIDB4Mjc0LCAweDI3NSwgMHgyNzYsIDB4Mjc3LFxuICAvLyAgIDB4Mjc4LCAweDI3OSwgMHgyN2EsIDB4MjdiLCAweDI3YywgMHgyN2QsIDB4MjdlLCAweDI3ZixcbiAgLy8gICAweDI4MCwgMHgyODEsIDB4Mjg4LCAweDI4OSwgMHgyOGEsIDB4MjhiLCAweDI4YyxcbiAgLy8gICAweDJhNywgMHgyYWIsIDB4MmI0LFxuICAvLyBdKTtcblxuICBhbGxvYyhzZWdtZW50OiBudW1iZXIgPSAwKTogbnVtYmVyIHtcbiAgICBpZiAoc2VnbWVudCAhPT0gMHgyMDApIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFsbG9jYXRlIG91dHNpZGUgMnh4YCk7XG4gICAgZm9yIChsZXQgZmxhZyA9IDB4MjgwOyBmbGFnIDwgMHgzMDA7IGZsYWcrKykge1xuICAgICAgaWYgKCF0aGlzW2ZsYWddKSB7XG4gICAgICAgIHRoaXNbZmxhZ10gPSB3YWxsRmxhZyh0aGlzLCBmbGFnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbGFnO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGZyZWUgZmxhZ3MuYCk7XG4gIH1cblxuICBmcmVlKGZsYWc6IG51bWJlcikge1xuICAgIC8vIFRPRE8gLSBpcyB0aGVyZSBtb3JlIHRvIHRoaXM/ICBjaGVjayBmb3Igc29tZXRoaW5nIGVsc2U/XG4gICAgZGVsZXRlIHRoaXNbZmxhZ107XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhZ05hbWUoaWQ6IG51bWJlcik6IHN0cmluZyB7XG4gIHJldHVybiAnRmxhZyAnICsgaGV4MyhpZCk7XG59XG5cbmZ1bmN0aW9uIHdhbGxGbGFnKGZsYWdzOiBGbGFncywgaWQ6IG51bWJlcik6IEZsYWcge1xuICByZXR1cm4gbmV3IEZsYWcoZmxhZ3MsICdXYWxsICcgKyBoZXgoaWQgJiAweGZmKSwgaWQsIHtmaXhlZDogdHJ1ZX0pO1xufVxuIl19