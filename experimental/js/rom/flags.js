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
        var _a;
        const remapping = new Map();
        const unused = new Set();
        for (let i = 0; i < 0x300; i++) {
            const f = this[i];
            const o = (_a = f) === null || _a === void 0 ? void 0 : _a.obsolete;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL2ZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFXLE1BQU0sV0FBVyxDQUFDO0FBSWxFLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBU3RCLE1BQU0sS0FBSyxHQUFVLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxHQUFVLEVBQUMsVUFBVSxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFVLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO0FBQ25DLE1BQU0sTUFBTSxHQUFVLEVBQUUsQ0FBQztBQW9CekIsTUFBTSxPQUFPLElBQUk7SUFNZixZQUFxQixLQUFZLEVBQ1osSUFBWSxFQUNaLEVBQVUsRUFDbkIsSUFBYzs7UUFITCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFFN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssU0FBRyxJQUFJLENBQUMsS0FBSyx1Q0FBSSxLQUFLLEVBQUEsQ0FBQztJQUNuQyxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsT0FBTyxJQUFJLENBQUMsRUFBZSxDQUFDO0lBQzlCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1AsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2pFLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDTixJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxFQUFFO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMzQztRQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDekQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQUVELFNBQVMsUUFBUSxDQUFDLFFBQWlEO0lBQ2pFLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUTtRQUFFLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEUsT0FBTyxFQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBUSxDQUFDO0FBQ3pDLENBQUM7QUFDRCxTQUFTLEtBQUssQ0FBQyxFQUFVLEVBQUUsS0FBSyxHQUFHLE1BQU07SUFDdkMsT0FBTyxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxF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UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUd4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBR3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixXQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLFdBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsV0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FB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LElBQUksR0FBRyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNuQztZQUNELE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFZO1FBRWYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBRUQsU0FBUyxRQUFRLENBQUMsRUFBVTtJQUMxQixPQUFPLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLEtBQVksRUFBRSxFQUFVO0lBQ3hDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0l0ZW19IGZyb20gJy4vaXRlbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TnBjfSBmcm9tICcuL25wYy5qcyc7XG5pbXBvcnQge1RyaWdnZXJ9IGZyb20gJy4vdHJpZ2dlci5qcyc7XG5pbXBvcnQge2hleCwgaGV4MywgdXBwZXJDYW1lbFRvU3BhY2VzLCBXcml0YWJsZX0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Q29uZGl0aW9uLCBSZXF1aXJlbWVudH0gZnJvbSAnLi4vbG9naWMvcmVxdWlyZW1lbnQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5cbmNvbnN0IEZMQUcgPSBTeW1ib2woKTtcblxuLy8gVE9ETyAtIG1heWJlIGFsaWFzIHNob3VsZCBqdXN0IGJlIGluIG92ZXJsYXkudHM/XG5leHBvcnQgaW50ZXJmYWNlIExvZ2ljIHtcbiAgYXNzdW1lVHJ1ZT86IGJvb2xlYW47XG4gIGFzc3VtZUZhbHNlPzogYm9vbGVhbjtcbiAgdHJhY2s/OiBib29sZWFuO1xufVxuXG5jb25zdCBGQUxTRTogTG9naWMgPSB7YXNzdW1lRmFsc2U6IHRydWV9O1xuY29uc3QgVFJVRTogTG9naWMgPSB7YXNzdW1lVHJ1ZTogdHJ1ZX07XG5jb25zdCBUUkFDSzogTG9naWMgPSB7dHJhY2s6IHRydWV9O1xuY29uc3QgSUdOT1JFOiBMb2dpYyA9IHt9O1xuXG5pbnRlcmZhY2UgRmxhZ0RhdGEge1xuICBmaXhlZD86IGJvb2xlYW47XG4gIG9ic29sZXRlPzogKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcjtcbiAgbG9naWM/OiBMb2dpYztcbn1cbmludGVyZmFjZSBGbGFnQ29udGV4dCB7XG4gIHRyaWdnZXI/OiBUcmlnZ2VyO1xuICBsb2NhdGlvbj86IExvY2F0aW9uO1xuICBucGM/OiBOcGM7XG4gIHNwYXduPzogbnVtYmVyO1xuICBpbmRleD86IG51bWJlcjtcbiAgZGlhbG9nPzogYm9vbGVhbjtcbiAgc2V0PzogYm9vbGVhbjtcbiAgLy9kaWFsb2c/OiBMb2NhbERpYWxvZ3xHbG9iYWxEaWFsb2c7XG4gIC8vaW5kZXg/OiBudW1iZXI7XG4gIC8vY29uZGl0aW9uPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEZsYWcge1xuXG4gIGZpeGVkOiBib29sZWFuO1xuICBvYnNvbGV0ZT86IChjdHg6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI7XG4gIGxvZ2ljOiBMb2dpYztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmbGFnczogRmxhZ3MsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgaWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgZGF0YTogRmxhZ0RhdGEpIHtcbiAgICB0aGlzLmZpeGVkID0gZGF0YS5maXhlZCB8fCBmYWxzZTtcbiAgICB0aGlzLm9ic29sZXRlID0gZGF0YS5vYnNvbGV0ZTtcbiAgICB0aGlzLmxvZ2ljID0gZGF0YS5sb2dpYyA/PyBUUkFDSztcbiAgfVxuXG4gIGdldCBjKCk6IENvbmRpdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuaWQgYXMgQ29uZGl0aW9uO1xuICB9XG5cbiAgZ2V0IHIoKTogUmVxdWlyZW1lbnQuU2luZ2xlIHtcbiAgICByZXR1cm4gW1t0aGlzLmlkIGFzIENvbmRpdGlvbl1dO1xuICB9XG5cbiAgZ2V0IGRlYnVnKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDMsICcwJykgKyAnICcgKyB0aGlzLm5hbWU7XG4gIH1cblxuICBnZXQgaXRlbSgpOiBJdGVtIHtcbiAgICBpZiAodGhpcy5pZCA8IDB4MTAwIHx8IHRoaXMuaWQgPiAweDE3Zikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBub3QgYSBzbG90OiAke3RoaXMuaWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGl0ZW1HZXRJZCA9IHRoaXMuZmxhZ3Mucm9tLnNsb3RzW3RoaXMuaWQgJiAweGZmXTtcbiAgICBjb25zdCBpdGVtSWQgPSB0aGlzLmZsYWdzLnJvbS5pdGVtR2V0c1tpdGVtR2V0SWRdLml0ZW1JZDtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5mbGFncy5yb20uaXRlbXNbaXRlbUlkXTtcbiAgICBpZiAoIWl0ZW0pIHRocm93IG5ldyBFcnJvcihgbm8gaXRlbWApO1xuICAgIHJldHVybiBpdGVtO1xuICB9XG59XG5cbmZ1bmN0aW9uIG9ic29sZXRlKG9ic29sZXRlOiBudW1iZXIgfCAoKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcikpOiBGbGFnIHtcbiAgaWYgKHR5cGVvZiBvYnNvbGV0ZSA9PT0gJ251bWJlcicpIG9ic29sZXRlID0gKG8gPT4gKCkgPT4gbykob2Jzb2xldGUpO1xuICByZXR1cm4ge29ic29sZXRlLCBbRkxBR106IHRydWV9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGZpeGVkKGlkOiBudW1iZXIsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7aWQsIGZpeGVkOiB0cnVlLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5mdW5jdGlvbiB0cmFja2VkKGlkOiBudW1iZXIpOiBGbGFnIHtcbiAgcmV0dXJuIGZpeGVkKGlkLCBUUkFDSyk7XG59XG5mdW5jdGlvbiBtb3ZhYmxlKGlkOiBudW1iZXIsIGxvZ2ljID0gSUdOT1JFKTogRmxhZyB7XG4gIHJldHVybiB7aWQsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cbmZ1bmN0aW9uIGRpYWxvZ1Byb2dyZXNzaW9uKG5hbWU6IHN0cmluZywgbG9naWMgPSBJR05PUkUpOiBGbGFnIHtcbiAgcmV0dXJuIHtuYW1lLCBbRkxBR106IHRydWUsIGxvZ2ljfSBhcyBhbnk7XG59XG5mdW5jdGlvbiBkaWFsb2dUb2dnbGUobmFtZTogc3RyaW5nLCBsb2dpYyA9IElHTk9SRSk6IEZsYWcge1xuICByZXR1cm4ge25hbWUsIFtGTEFHXTogdHJ1ZSwgbG9naWN9IGFzIGFueTtcbn1cblxuZnVuY3Rpb24gcHNldWRvKG93bmVyOiBvYmplY3QpOiBGbGFnIHtcbiAgY29uc3QgaWQgPSBwc2V1ZG9Db3VudGVyLmdldChvd25lcikgfHwgMHg0MDA7XG4gIHBzZXVkb0NvdW50ZXIuc2V0KG93bmVyLCBpZCArIDEpO1xuICByZXR1cm4ge2lkLCBbRkxBR106IHRydWUsIGxvZ2ljOiBUUkFDS30gYXMgYW55O1xufVxuY29uc3QgcHNldWRvQ291bnRlciA9IG5ldyBXZWFrTWFwPG9iamVjdCwgbnVtYmVyPigpO1xuXG4vLyBvYnNvbGV0ZSBmbGFncyAtIGRlbGV0ZSB0aGUgc2V0cyAoc2hvdWxkIG5ldmVyIGJlIGEgY2xlYXIpXG4vLyAgICAgICAgICAgICAgICAtIHJlcGxhY2UgdGhlIGNoZWNrcyB3aXRoIHRoZSByZXBsYWNlbWVudFxuXG4vLyAtLS0gbWF5YmUgb2Jzb2xldGUgZmxhZ3MgY2FuIGhhdmUgZGlmZmVyZW50IHJlcGxhY2VtZW50cyBpblxuLy8gICAgIGRpZmZlcmVudCBjb250ZXh0cz9cbi8vIC0tLSBpbiBwYXJ0aWN1bGFyLCBpdGVtZ2V0cyBzaG91bGRuJ3QgY2FycnkgMXh4IGZsYWdzP1xuXG5cbi8qKiBUcmFja3MgdXNlZCBhbmQgdW51c2VkIGZsYWdzLiAqL1xuZXhwb3J0IGNsYXNzIEZsYWdzIHtcblxuICBbaWQ6IG51bWJlcl06IEZsYWc7XG5cbiAgLy8gMDB4XG4gIDB4MDAwID0gZml4ZWQoMHgwMDAsIEZBTFNFKTtcbiAgMHgwMDEgPSBmaXhlZCgweDAwMSk7XG4gIDB4MDAyID0gZml4ZWQoMHgwMDIpO1xuICAweDAwMyA9IGZpeGVkKDB4MDAzKTtcbiAgMHgwMDQgPSBmaXhlZCgweDAwNCk7XG4gIDB4MDA1ID0gZml4ZWQoMHgwMDUpO1xuICAweDAwNiA9IGZpeGVkKDB4MDA2KTtcbiAgMHgwMDcgPSBmaXhlZCgweDAwNyk7XG4gIDB4MDA4ID0gZml4ZWQoMHgwMDgpO1xuICAweDAwOSA9IGZpeGVkKDB4MDA5KTtcbiAgVXNlZFdpbmRtaWxsS2V5ID0gZml4ZWQoMHgwMGEsIFRSQUNLKTtcbiAgMHgwMGIgPSBvYnNvbGV0ZSgweDEwMCk7IC8vIGNoZWNrOiBzd29yZCBvZiB3aW5kIC8gdGFsa2VkIHRvIGxlYWYgZWxkZXJcbiAgMHgwMGMgPSBkaWFsb2dUb2dnbGUoJ0xlYWYgdmlsbGFnZXInKTtcbiAgTGVhZlZpbGxhZ2Vyc1Jlc2N1ZWQgPSBtb3ZhYmxlKDB4MDBkKTtcbiAgMHgwMGUgPSBvYnNvbGV0ZSgocykgPT4ge1xuICAgIGlmIChzLnRyaWdnZXI/LmlkID09PSAweDg1KSByZXR1cm4gMHgxNDM7IC8vIGNoZWNrOiB0ZWxlcGF0aHkgLyBzdG9tXG4gICAgcmV0dXJuIDB4MjQzOyAvLyBpdGVtOiB0ZWxlcGF0aHlcbiAgfSk7XG4gIFdva2VXaW5kbWlsbEd1YXJkID0gbW92YWJsZSgweDAwZiwgVFJBQ0spO1xuXG4gIC8vIDAxeFxuICBUdXJuZWRJbktpcmlzYVBsYW50ID0gbW92YWJsZSgweDAxMCk7XG4gIDB4MDExID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1dlbGNvbWVkIHRvIEFtYXpvbmVzJyk7XG4gIDB4MDEyID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1RyZWFzdXJlIGh1bnRlciBkZWFkJyk7XG4gIDB4MDEzID0gb2Jzb2xldGUoMHgxMzgpOyAvLyBjaGVjazogYnJva2VuIHN0YXR1ZSAvIHNhYmVyYSAxXG4gIC8vIHVudXNlZCAwMTQsIDAxNVxuICAweDAxNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdQb3J0b2EgcXVlZW4gUmFnZSBoaW50Jyk7XG4gIDB4MDE3ID0gb2Jzb2xldGUoMHgxMDIpOyAvLyBjaGVzdDogc3dvcmQgb2Ygd2F0ZXJcbiAgRW50ZXJlZFVuZGVyZ3JvdW5kQ2hhbm5lbCA9IG1vdmFibGUoMHgwMTgsIFRSQUNLKTtcbiAgMHgwMTkgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiB0aXJlZCBvZiB0YWxraW5nJyk7XG4gIDB4MDFhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0luaXRpYWwgdGFsayB3aXRoIFBvcnRvYSBxdWVlbicpO1xuICBNZXNpYVJlY29yZGluZyA9IG1vdmFibGUoMHgwMWIsIFRSQUNLKTtcbiAgMHgwMWMgPSBvYnNvbGV0ZSgweDExMCk7IC8vIGl0ZW06IG1pcnJvcmVkIHNoaWVsZFxuICBUYWxrZWRUb0ZvcnR1bmVUZWxsZXIgPSBtb3ZhYmxlKDB4MWQsIFRSQUNLKTtcbiAgUXVlZW5SZXZlYWxlZCA9IG1vdmFibGUoMHgwMWUsIFRSQUNLKTtcbiAgMHgwMWYgPSBvYnNvbGV0ZSgweDEwOSk7IC8vIGNoZWNrOiByYWdlXG5cbiAgLy8gMDJ4XG4gIFF1ZWVuTm90SW5UaHJvbmVSb29tID0gbW92YWJsZSgweDAyMCk7XG4gIFJldHVybmVkRm9nTGFtcCA9IG1vdmFibGUoMHgwMjEsIFRSQUNLKTtcbiAgMHgwMjIgPSBkaWFsb2dQcm9ncmVzc2lvbignU2FoYXJhIGVsZGVyJyk7XG4gIDB4MDIzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1NhaGFyYSBlbGRlciBkYXVnaHRlcicpO1xuICAweDAyNCA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgMHgwMjUgPSBvYnNvbGV0ZSgweDEzNik7IC8vIGhlYWxlZCBkb2xwaGluXG4gIDB4MDI2ID0gb2Jzb2xldGUoMHgyZmQpOyAvLyB3YXJwOiBzaHlyb25cbiAgU2h5cm9uTWFzc2FjcmUgPSBmaXhlZCgweDAyNywgVFJBQ0spOyAvLyBwcmVzaHVmZmxlIGhhcmRjb2RlcyBmb3IgZGVhZCBzcHJpdGVzXG4gIENoYW5nZVdvbWFuID0gZml4ZWQoMHgwMjgpOyAvLyBoYXJkY29kZWQgaW4gb3JpZ2luYWwgcm9tXG4gIENoYW5nZUFrYWhhbmEgPSBmaXhlZCgweDAyOSk7XG4gIENoYW5nZVNvbGRpZXIgPSBmaXhlZCgweDAyYSk7XG4gIENoYW5nZVN0b20gPSBmaXhlZCgweDAyYik7XG4gIC8vIHVudXNlZCAwMmNcbiAgMHgwMmQgPSBkaWFsb2dQcm9ncmVzc2lvbignU2h5cm9uIHNhZ2VzJyk7XG4gIDB4MDJlID0gb2Jzb2xldGUoMHgxMmQpOyAvLyBjaGVjazogZGVvJ3MgcGVuZGFudFxuICBVc2VkQm93T2ZUcnV0aCA9IGZpeGVkKDB4MDJmKTsgIC8vIG1vdmVkIGZyb20gMDg2IGluIHByZXBhcnNlXG5cbiAgLy8gMDN4XG4gIC8vIHVudXNlZCAwMzBcbiAgMHgwMzEgPSBkaWFsb2dQcm9ncmVzc2lvbignWm9tYmllIHRvd24nKTtcbiAgMHgwMzIgPSBvYnNvbGV0ZSgweDEzNyk7IC8vIGNoZWNrOiBleWUgZ2xhc3Nlc1xuICAvLyB1bnVzZWQgMDMzXG4gIDB4MDM0ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FrYWhhbmEgaW4gd2F0ZXJmYWxsIGNhdmUnKTsgLy8gPz8/XG4gIEN1cmVkQWthaGFuYSA9IG1vdmFibGUoMHgwMzUsIFRSQUNLKTtcbiAgMHgwMzYgPSBkaWFsb2dQcm9ncmVzc2lvbignQWthaGFuYSBTaHlyb24nKTtcbiAgMHgwMzcgPSBvYnNvbGV0ZSgweDE0Mik7IC8vIGNoZWNrOiBwYXJhbHlzaXNcbiAgTGVhZkFiZHVjdGlvbiA9IG1vdmFibGUoMHgwMzgsIFRSQUNLKTsgLy8gb25lLXdheSBsYXRjaFxuICAweDAzOSA9IG9ic29sZXRlKDB4MTQxKTsgLy8gY2hlY2s6IHJlZnJlc2hcbiAgVGFsa2VkVG9aZWJ1SW5DYXZlID0gbW92YWJsZSgweDAzYSwgVFJBQ0spO1xuICBUYWxrZWRUb1plYnVJblNoeXJvbiA9IG1vdmFibGUoMHgwM2IsIFRSQUNLKTtcbiAgMHgwM2MgPSBvYnNvbGV0ZSgweDEzYik7IC8vIGNoZXN0OiBsb3ZlIHBlbmRhbnRcbiAgMHgwM2QgPSBkaWFsb2dQcm9ncmVzc2lvbignQXNpbmEgaW4gU2h5cm9uIHRlbXBsZScpO1xuICBGb3VuZEtlbnN1SW5EYW5jZUhhbGwgPSBtb3ZhYmxlKDB4MDNlLCBUUkFDSyk7XG4gIDB4MDNmID0gb2Jzb2xldGUoKHMpID0+IHtcbiAgICBpZiAocy50cmlnZ2VyPy5pZCA9PT0gMHhiYSkgcmV0dXJuIDB4MjQ0IC8vIGl0ZW06IHRlbGVwb3J0XG4gICAgcmV0dXJuIDB4MTQ0OyAvLyBjaGVjazogdGVsZXBvcnRcbiAgfSk7XG5cbiAgLy8gMDR4XG4gIDB4MDQwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvcm5lbCBpbiBTaHlyb24gdGVtcGxlJyk7XG4gIDB4MDQxID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIC8vIHVudXNlZCAwNDJcbiAgLy8gdW51c2VkIDB4MDQzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ09haycpO1xuICAweDA0NCA9IG9ic29sZXRlKDB4MTA3KTsgLy8gY2hlY2s6IGJhbGwgb2YgZmlyZSAvIGluc2VjdFxuICBSZXNjdWVkQ2hpbGQgPSBmaXhlZCgweDA0NSwgVFJBQ0spOyAvLyBoYXJkY29kZWQgJDNlN2Q1XG4gIFVzZWRJbnNlY3RGbHV0ZSA9IGZpeGVkKDB4MDQ2KTsgLy8gY3VzdG9tLWFkZGVkICQ2NDg4OjQwXG4gIFJlc2N1ZWRMZWFmRWxkZXIgPSBtb3ZhYmxlKDB4MDQ3KTtcbiAgMHgwNDggPSBkaWFsb2dQcm9ncmVzc2lvbignVHJlYXN1cmUgaHVudGVyIGVtYmFya2VkJyk7XG4gIDB4MDQ5ID0gb2Jzb2xldGUoMHgxMDEpOyAvLyBjaGVjazogc3dvcmQgb2YgZmlyZVxuICAweDA0YSA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdCb2F0IG93bmVyJyk7XG4gIDB4MDRiID0gZGlhbG9nVG9nZ2xlKCdTaHlyb24gc2ljayBtZW4nKTtcbiAgMHgwNGMgPSBkaWFsb2dUb2dnbGUoJ1NoeXJvbiB0cmFpbmluZyBtZW4gMScpO1xuICAweDA0ZCA9IGRpYWxvZ1RvZ2dsZSgnU2h5cm9uIHRyYWluaW5nIG1lbiAyJyk7XG4gIDB4MDRlID0gb2Jzb2xldGUoMHgxMDYpOyAvLyBjaGVzdDogdG9ybmFkbyBicmFjZWxldFxuICAweDA0ZiA9IG9ic29sZXRlKDB4MTJiKTsgLy8gY2hlY2s6IHdhcnJpb3IgcmluZ1xuXG4gIC8vIDA1eFxuICBHaXZlblN0YXR1ZVRvQWthaGFuYSA9IG1vdmFibGUoMHgwNTApOyAvLyBnaXZlIGl0IGJhY2sgaWYgdW5zdWNjZXNzZnVsP1xuICAweDA1MSA9IG9ic29sZXRlKDB4MTQ2KTsgLy8gY2hlY2s6IGJhcnJpZXIgLyBhbmdyeSBzZWFcbiAgVGFsa2VkVG9Ed2FyZk1vdGhlciA9IG1vdmFibGUoMHgwNTIsIFRSQUNLKTtcbiAgTGVhZGluZ0NoaWxkID0gZml4ZWQoMHgwNTMsIFRSQUNLKTsgLy8gaGFyZGNvZGVkICQzZTdjNCBhbmQgZm9sbG93aW5nXG4gIC8vIHVudXNlZCAwNTRcbiAgMHgwNTUgPSBkaWFsb2dQcm9ncmVzc2lvbignWmVidSByZXNjdWVkJyk7XG4gIDB4MDU2ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvcm5lbCByZXNjdWVkJyk7XG4gIDB4MDU3ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0FzaW5hIHJlc2N1ZWQnKTtcbiAgLy8gdW51c2VkIDA1OCAuLiAwNWFcbiAgTXRTYWJyZUd1YXJkc0Rlc3Bhd25lZCA9IG1vdmFibGUoMHgwNWIsIFRSVUUpO1xuICAvLyB1bnVzZWQgMDVjLCAwNWRcbiAgMHgwNWUgPSBvYnNvbGV0ZSgweDI4ZCk7IC8vIGRyYXlnb24gMlxuICAweDA1ZiA9IG9ic29sZXRlKDB4MjAzKTsgLy8gaXRlbTogc3dvcmQgb2YgdGh1bmRlclxuICAvLyBUT0RPIC0gZml4IHVwIHRoZSBOUEMgc3Bhd24gYW5kIHRyaWdnZXIgY29uZGl0aW9ucyBpbiBTaHlyb24uXG4gIC8vIE1heWJlIGp1c3QgcmVtb3ZlIHRoZSBjdXRzY2VuZSBlbnRpcmVseT9cblxuICAvLyAwNnhcbiAgLy8gdW51c2VkIDA2MFxuICBUYWxrZWRUb1N0b21JblN3YW4gPSBtb3ZhYmxlKDB4MDYxLCBUUkFDSyk7XG4gIDB4MDYyID0gb2Jzb2xldGUoMHgxNTEpOyAvLyBjaGVzdDogc2FjcmVkIHNoaWVsZFxuICAweDA2MyA9IG9ic29sZXRlKDB4MTQ3KTsgLy8gY2hlY2s6IGNoYW5nZVxuICAvLyB1bnVzZWQgMDY0XG4gIC8vIFN3YW5HYXRlT3BlbmVkID0gbW92YWJsZSh+MHgwNjQpOyAvLyB3aHkgd291bGQgd2UgYWRkIHRoaXM/IHVzZSAyYjNcbiAgQ3VyZWRLZW5zdSA9IG1vdmFibGUoMHgwNjUpO1xuICAvLyB1bnVzZWQgMDY2XG4gIDB4MDY3ID0gb2Jzb2xldGUoMHgxMGIpOyAvLyBjaGVjazogYmFsbCBvZiB0aHVuZGVyIC8gbWFkbyAxXG4gIDB4MDY4ID0gb2Jzb2xldGUoMHgxMDQpOyAvLyBjaGVjazogZm9yZ2VkIGNyeXN0YWxpc1xuICAvLyB1bnVzZWQgMDY5XG4gIFN0b25lZFBlb3BsZUN1cmVkID0gbW92YWJsZSgweDA2YSwgVFJBQ0spO1xuICAvLyB1bnVzZWQgMDZiXG4gIDB4MDZjID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIC8vIHVudXNlZCAwNmQgLi4gMDZmXG4gIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4gPSBmaXhlZCh+MHgwNmUsIFRSQUNLKTsgLy8sIHsgLy8gTk9URTogYWRkZWQgYnkgcmFuZG9cbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uaXRlbXMuU2hlbGxGbHV0ZS5pdGVtVXNlRGF0YVswXS53YW50XSxcbiAgLy8gfSk7XG5cbiAgLy8gMDd4XG4gIFBhcmFseXplZEtlbnN1SW5UYXZlcm4gPSBmaXhlZCgweDA3MCk7IC8vLCB7IC8vIGhhcmRjb2RlZCBpbiByYW5kbyBwcmVzaHVmZmxlLnNcbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uZmxhZ3MuUGFyYWx5c2lzLmlkXSxcbiAgLy8gfSk7XG4gIFBhcmFseXplZEtlbnN1SW5EYW5jZUhhbGwgPSBmaXhlZCgweDA3MSk7IC8vLCB7IC8vIGhhcmRjb2RlZCBpbiByYW5kbyBwcmVzaHVmZmxlLnNcbiAgLy8gICBhbGlhczogcm9tID0+IFtyb20uZmxhZ3MuUGFyYWx5c2lzLmlkXSxcbiAgLy8gfSk7XG4gIEZvdW5kS2Vuc3VJblRhdmVybiA9IG1vdmFibGUoMHgwNzIsIFRSQUNLKTtcbiAgMHgwNzMgPSBkaWFsb2dQcm9ncmVzc2lvbignU3RhcnRsZWQgbWFuIGluIExlYWYnKTtcbiAgLy8gdW51c2VkIDA3NFxuICAweDA3NSA9IG9ic29sZXRlKDB4MTM5KTsgLy8gY2hlY2s6IGdsb3dpbmcgbGFtcFxuICAweDA3NiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdLZW5zdSBpbiBHb2EnKTtcbiAgMHgwNzcgPSBvYnNvbGV0ZSgweDEwOCk7IC8vIGNoZWNrOiBmbGFtZSBicmFjZWxldCAvIGtlbGJlc3F1ZSAxXG4gIDB4MDc4ID0gb2Jzb2xldGUoMHgxMGMpOyAvLyBjaGVzdDogc3Rvcm0gYnJhY2VsZXRcbiAgMHgwNzkgPSBvYnNvbGV0ZSgweDE0MCk7IC8vIGNoZWNrOiBib3cgb2YgdHJ1dGhcbiAgMHgwN2EgPSBvYnNvbGV0ZSgweDEwYSk7IC8vIGNoZXN0OiBibGl6emFyZCBicmFjZWxldFxuICAweDA3YiA9IG9ic29sZXRlKDB4MTA5KTsgLy8gcmFnZS9iYWxsIG9mIHdhdGVyXG4gIC8vIHVudXNlZCAwN2IsIDA3Y1xuICAweDA3ZCA9IG9ic29sZXRlKDB4MTNmKTsgLy8gY2hlc3Q6IGJvdyBvZiBzdW5cbiAgMHgwN2UgPSBkaWFsb2dQcm9ncmVzc2lvbignTXQgU2FicmUgZ3VhcmRzIDEnKTtcbiAgMHgwN2YgPSBkaWFsb2dQcm9ncmVzc2lvbignTXQgU2FicmUgZ3VhcmRzIDInKTtcblxuICBBbGFybUZsdXRlVXNlZE9uY2UgPSBmaXhlZCgweDc2KTsgLy8gaGFyZGNvZGVkOiBwcmVzaHVmZmxlLnMgUGF0Y2hUcmFkZUluSXRlbVxuICBGbHV0ZU9mTGltZVVzZWRPbmNlID0gZml4ZWQoMHg3Nyk7IC8vIGhhcmRjb2RlZDogcHJlc2h1ZmZsZS5zIFBhdGNoVHJhZGVJbkl0ZW1cblxuICAvLyAwOHhcbiAgLy8gdW51c2VkIDA4MCwgMDgxXG4gIDB4MDgyID0gb2Jzb2xldGUoMHgxNDApOyAvLyBjaGVjazogYm93IG9mIHRydXRoIC8gYXp0ZWNhXG4gIDB4MDgzID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Jlc2N1ZWQgTGVhZiBlbGRlcicpO1xuICBMZWFmVmlsbGFnZXJzQ3VycmVudGx5QWJkdWN0ZWQgPSBtb3ZhYmxlKDB4MDg0KTtcbiAgTGVhZkVsZGVyQ3VycmVudGx5QWJkdWN0ZWQgPSBtb3ZhYmxlKDB4MDg1KTtcbiAgLy9Vc2VkQm93T2ZUcnV0aCA9IG1vdmFibGUoMHgwODYpOyAgLy8gbW92ZWQgbWFudWFsbHkgYXQgcHJlcGFyc2UgdG8gMmZcbiAgMHgwODcgPSBvYnNvbGV0ZSgweDEwNSk7IC8vIGNoZXN0OiBiYWxsIG9mIHdpbmRcbiAgMHgwODggPSBvYnNvbGV0ZSgweDEzMik7IC8vIGNoZWNrOiB3aW5kbWlsbCBrZXlcbiAgMHgwODkgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTdG9tXFwncyBnaXJsZnJpZW5kJyk7XG4gIDB4MDhhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgU3RvbScpO1xuICAweDA4YiA9IG9ic29sZXRlKDB4MjM2KTsgLy8gaXRlbTogc2hlbGwgZmx1dGVcbiAgLy8gdW51c2VkIDB4MDhjID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N3YW4gZ3VhcmRzIGRlc3Bhd25lZCcpO1xuICAweDA4ZCA9IG9ic29sZXRlKDB4MTM3KTsgLy8gY2hlY2s6IGV5ZSBnbGFzc2VzXG4gIC8vIHVudXNlZCAwOGVcbiAgMHgwOGYgPSBvYnNvbGV0ZSgweDI4Myk7IC8vIGV2ZW50OiBjYWxtZWQgc2VhXG5cbiAgLy8gMDl4XG4gIDB4MDkwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1N0b25lZCBwZW9wbGUgZ29uZScpO1xuICAvLyB1bnVzZWQgMDkxXG4gIDB4MDkyID0gb2Jzb2xldGUoMHgxMjgpOyAvLyBjaGVjazogZmx1dGUgb2YgbGltZVxuICAvLyB1bnVzZWQgMDkzIC4uIDA5NVxuICAweDA5NiA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiBlbGRlciBkYXVnaHRlcicpO1xuICAweDA5NyA9IGRpYWxvZ1RvZ2dsZSgnTGVhZiB2aWxsYWdlcicpO1xuICAweDA5OCA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdOYWRhcmUgdmlsbGFnZXInKTtcbiAgLy8gdW51c2VkIDA5OSwgMDlhXG4gIEFibGVUb1JpZGVEb2xwaGluID0gbW92YWJsZSgweDA5YiwgVFJBQ0spO1xuICBQb3J0b2FRdWVlbkdvaW5nQXdheSA9IG1vdmFibGUoMHgwOWMpO1xuICAvLyB1bnVzZWQgMDlkIC4uIDA5ZlxuXG4gIC8vIDBheFxuICAweDBhMCA9IG9ic29sZXRlKDB4MTI3KTsgLy8gY2hlY2s6IGluc2VjdCBmbHV0ZVxuICAvLyB1bnVzZWQgMGExLCAwYTJcbiAgMHgwYTMgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbi9mb3J0dW5lIHRlbGxlcicpO1xuICBXb2tlS2Vuc3VJbkxpZ2h0aG91c2UgPSBtb3ZhYmxlKDB4MGE0LCBUUkFDSyk7XG4gIC8vIFRPRE86IHRoaXMgbWF5IG5vdCBiZSBvYnNvbGV0ZSBpZiB0aGVyZSdzIG5vIGl0ZW0gaGVyZT9cbiAgMHgwYTUgPSBvYnNvbGV0ZSgweDEzMSk7IC8vIGNoZWNrOiBhbGFybSBmbHV0ZSAvIHplYnUgc3R1ZGVudFxuICAweDBhNiA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdPYWsgZWxkZXIgMScpO1xuICAweDBhNyA9IGRpYWxvZ1RvZ2dsZSgnU3dhbiBkYW5jZXInKTtcbiAgMHgwYTggPSBkaWFsb2dQcm9ncmVzc2lvbignT2FrIGVsZGVyIDInKTtcbiAgVGFsa2VkVG9MZWFmUmFiYml0ID0gbW92YWJsZSgweDBhOSwgVFJBQ0spO1xuICAweDBhYSA9IG9ic29sZXRlKDB4MTFkKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBhYiA9IG9ic29sZXRlKDB4MTUwKTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAvLyB1bnVzZWQgMGFjXG4gIDB4MGFkID0gb2Jzb2xldGUoMHgxNTIpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFlID0gb2Jzb2xldGUoMHgxNTMpOyAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gIDB4MGFmID0gb2Jzb2xldGUoMHgxNTQpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuXG4gIC8vIDBieFxuICAweDBiMCA9IG9ic29sZXRlKDB4MTU1KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiMSA9IG9ic29sZXRlKDB4MTU2KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiMiA9IG9ic29sZXRlKDB4MTU3KTsgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAweDBiMyA9IG9ic29sZXRlKDB4MTU4KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYjQgPSBvYnNvbGV0ZSgweDE1OSk7IC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgMHgwYjUgPSBvYnNvbGV0ZSgweDE1YSk7IC8vIGNoZXN0OiBmcnVpdCBvZiBwb3dlclxuICAweDBiNiA9IG9ic29sZXRlKDB4MTFmKTsgLy8gY2hlc3Q6IGx5c2lzIHBsYW50XG4gIDB4MGI3ID0gb2Jzb2xldGUoMHgxNWMpOyAvLyBjaGVzdDogbHlzaXMgcGxhbnRcbiAgMHgwYjggPSBvYnNvbGV0ZSgweDE1ZCk7IC8vIGNoZXN0OiBseXNpcyBwbGFudFxuICAweDBiOSA9IG9ic29sZXRlKDB4MTFlKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJhID0gb2Jzb2xldGUoMHgxNWUpOyAvLyBjaGVzdDogYW50aWRvdGVcbiAgMHgwYmIgPSBvYnNvbGV0ZSgweDE1Zik7IC8vIGNoZXN0OiBhbnRpZG90ZVxuICAweDBiYyA9IG9ic29sZXRlKDB4MTYwKTsgLy8gY2hlc3Q6IGFudGlkb3RlXG4gIDB4MGJkID0gb2Jzb2xldGUoMHgxMjApOyAvLyBjaGVzdDogZnJ1aXQgb2YgbGltZVxuICAweDBiZSA9IG9ic29sZXRlKDB4MTIxKTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGJmID0gb2Jzb2xldGUoMHgxNjIpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcG93ZXJcblxuICAvLyAwY3hcbiAgMHgwYzAgPSBvYnNvbGV0ZSgweDE2Myk7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBjMSA9IG9ic29sZXRlKDB4MTY0KTsgLy8gY2hlc3Q6IGZydWl0IG9mIHBvd2VyXG4gIDB4MGMyID0gb2Jzb2xldGUoMHgxMjIpOyAvLyBjaGVzdDogbWFnaWMgcmluZ1xuICAweDBjMyA9IG9ic29sZXRlKDB4MTY1KTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzQgPSBvYnNvbGV0ZSgweDE2Nik7IC8vIGNoZXN0OiBmcnVpdCBvZiByZXB1blxuICAweDBjNSA9IG9ic29sZXRlKDB4MTZiKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwYzYgPSBvYnNvbGV0ZSgweDE2Yyk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGM3ID0gb2Jzb2xldGUoMHgxMjMpOyAvLyBjaGVzdDogZnJ1aXQgb2YgcmVwdW5cbiAgMHgwYzggPSBvYnNvbGV0ZSgweDEyNCk7IC8vIGNoZXN0OiB3YXJwIGJvb3RzXG4gIDB4MGM5ID0gb2Jzb2xldGUoMHgxNmEpOyAvLyBjaGVzdDogd2FycCBib290c1xuICAweDBjYSA9IG9ic29sZXRlKDB4MTNkKTsgLy8gY2hlY2s6IGl2b3J5IHN0YXR1ZSAvIGthcm1pbmVcbiAgMHgwY2IgPSBvYnNvbGV0ZSgweDEyYSk7IC8vIGNoZXN0OiBwb3dlciByaW5nXG4gIDB4MGNjID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIDB4MGNkID0gb2Jzb2xldGUoMHgxMTQpOyAvLyBjaGVzdDogcHN5Y2hvIHNoaWVsZFxuICAweDBjZSA9IG9ic29sZXRlKDB4MTI1KTsgLy8gY2hlc3Q6IHN0YXR1ZSBvZiBvbnl4XG4gIDB4MGNmID0gb2Jzb2xldGUoMHgxMzMpOyAvLyBjaGVzdDoga2V5IHRvIHByaXNvblxuICBcbiAgLy8gMGR4XG4gIDB4MGQwID0gb2Jzb2xldGUoMHgxMjgpOyAvLyBjaGVjazogZmx1dGUgb2YgbGltZSAvIHF1ZWVuXG4gIDB4MGQxID0gb2Jzb2xldGUoMHgxMzUpOyAvLyBjaGVzdDogZm9nIGxhbXBcbiAgMHgwZDIgPSBvYnNvbGV0ZSgweDE2OSk7IC8vIGNoZXN0OiBtYWdpYyByaW5nXG4gIDB4MGQzID0gb2Jzb2xldGUoMHgxMjYpOyAvLyBjaGVzdDogb3BlbCBzdGF0dWVcbiAgMHgwZDQgPSBvYnNvbGV0ZSgweDE1Yik7IC8vIGNoZXN0OiBmbHV0ZSBvZiBsaW1lXG4gIDB4MGQ1ID0gZGlhbG9nVG9nZ2xlKCdQb3J0b2EgcXVlZW4gMScpO1xuICAweDBkNiA9IGRpYWxvZ1RvZ2dsZSgnUG9ydG9hIHF1ZWVuIDInKTtcbiAgMHgwZDcgPSBkaWFsb2dUb2dnbGUoJ1BvcnRvYSBxdWVlbiAzJyk7XG4gIDB4MGQ4ID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0tlbnN1IHJlc2N1ZWQnKTtcbiAgMHgwZDkgPSBkaWFsb2dUb2dnbGUoJ1N0b25lZCBwYWlyJyk7XG4gIDB4MGRhID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0tlbnN1IGdvbmUgZnJvbSB0YXZlcm4nKTtcbiAgMHgwZGIgPSBkaWFsb2dUb2dnbGUoJ0luIFNhYmVyYVxcJ3MgdHJhcCcpO1xuICAweDBkYyA9IG9ic29sZXRlKDB4MTZmKTsgLy8gY2hlc3Q6IG1hZ2ljIHJpbmdcbiAgMHgwZGQgPSBvYnNvbGV0ZSgweDE3MCk7IC8vIG1pbWljPz8gbWVkaWNhbCBoZXJiPz9cbiAgMHgwZGUgPSBvYnNvbGV0ZSgweDEyYyk7IC8vIGNoZXN0OiBpcm9uIG5lY2tsYWNlXG4gIDB4MGRmID0gb2Jzb2xldGUoMHgxMWIpOyAvLyBjaGVzdDogYmF0dGxlIGFybW9yXG5cbiAgLy8gMGV4XG4gIDB4MGUwID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ0RlYWQgQWthaGFuYScpO1xuICAvLyB1bnVzZWQgMGUxIC4uIDBlM1xuICAweDBlNCA9IG9ic29sZXRlKDB4MTNjKTsgLy8gY2hlc3Q6IGtpcmlzYSBwbGFudFxuICAweDBlNSA9IG9ic29sZXRlKDB4MTZlKTsgLy8gY2hlc3Q6IHdhcnAgYm9vdHNcbiAgMHgwZTYgPSBvYnNvbGV0ZSgweDE2ZCk7IC8vIGNoZXN0OiBvcGVsIHN0YXR1ZVxuICAweDBlNyA9IG9ic29sZXRlKDB4MTJmKTsgLy8gY2hlc3Q6IGxlYXRoZXIgYm9vdHNcbiAgMHgwZTggPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTaHlyb24gdmlsbGFnZXInKTtcbiAgMHgwZTkgPSBkaWFsb2dQcm9ncmVzc2lvbignRGVhZCBTaHlyb24gZ3VhcmQnKTtcbiAgMHgwZWEgPSBkaWFsb2dQcm9ncmVzc2lvbignVG93ZXIgbWVzc2FnZSAxJyk7XG4gIDB4MGViID0gZGlhbG9nUHJvZ3Jlc3Npb24oJ1Rvd2VyIG1lc3NhZ2UgMicpO1xuICAweDBlYyA9IGRpYWxvZ1Byb2dyZXNzaW9uKCdUb3dlciBtZXNzYWdlIDMnKTtcbiAgMHgwZWQgPSBkaWFsb2dQcm9ncmVzc2lvbignTWVzaWEnKTtcbiAgLy8gdW51c2VkIDBlZSAuLiAwZmZcbiAgVGFsa2VkVG9aZWJ1U3R1ZGVudCA9IG1vdmFibGUoMHgwZWUsIFRSQUNLKTtcblxuICAvLyAxMDBcbiAgMHgxMDAgPSBvYnNvbGV0ZSgweDEyZSk7IC8vIGNoZWNrOiByYWJiaXQgYm9vdHMgLyB2YW1waXJlXG4gIDB4MTAxID0gb2Jzb2xldGUoMHgxMDcpOyAvLyBjaGVjazogYmFsbCBvZiBmaXJlIC8gaW5zZWN0XG4gIDB4MTAyID0gb2Jzb2xldGUoMHgxMDgpOyAvLyBjaGVjazogZmxhbWUgYnJhY2VsZXQgLyBrZWxiZXNxdWUgMVxuICAweDEwMyA9IG9ic29sZXRlKDB4MTA5KTsgLy8gY2hlY2s6IGJhbGwgb2Ygd2F0ZXIgLyByYWdlXG4gIC8vIHVudXNlZCAxMDRcbiAgMHgxMDUgPSBvYnNvbGV0ZSgweDEyNik7IC8vIGNoZWNrOiBvcGVsIHN0YXR1ZSAvIGtlbGJlc3F1ZSAyXG4gIDB4MTA2ID0gb2Jzb2xldGUoMHgxMjMpOyAvLyBjaGVjazogZnJ1aXQgb2YgcmVwdW4gLyBzYWJlcmEgMlxuICAweDEwNyA9IG9ic29sZXRlKDB4MTEyKTsgLy8gY2hlY2s6IHNhY3JlZCBzaGllbGQgLyBtYWRvIDJcbiAgMHgxMDggPSBvYnNvbGV0ZSgweDEzZCk7IC8vIGNoZWNrOiBpdm9yeSBzdGF0dWUgLyBrYXJtaW5lXG4gIFVzZWRCb3dPZk1vb24gPSBtb3ZhYmxlKDB4MTA5KTtcbiAgVXNlZEJvd09mU3VuID0gbW92YWJsZSgweDEwYSk7XG4gIDB4MTBiID0gb2Jzb2xldGUoMHgxMWMpOyAvLyBjaGVjazogcHN5Y2hvIGFybW9yIC8gZHJheWdvbiAxXG4gIDB4MTBjID0gb2Jzb2xldGUoMHgxNjEpOyAvLyBjaGVjazogZnJ1aXQgb2YgcG93ZXIgLyB2YW1waXJlIDJcblxuICAvLyAxMDAgLi4gMTdmID0+IGZpeGVkIGZsYWdzIGZvciBjaGVja3MuXG5cbiAgLy8gVE9ETyAtIGFyZSB0aGVzZSBhbGwgVFJBQ0sgb3IganVzdCB0aGUgbm9uLWNoZXN0cz8hP1xuXG4gIC8vIFRPRE8gLSBiYXNpYyBpZGVhIC0gTlBDIGhpdGJveCBleHRlbmRzIGRvd24gb25lIHRpbGU/IChpcyB0aGF0IGVub3VnaD8pXG4gIC8vICAgICAgLSBzdGF0dWVzIGNhbiBiZSBlbnRlcmVkIGJ1dCBub3QgZXhpdGVkP1xuICAvLyAgICAgIC0gdXNlIHRyaWdnZXIgKHwgcGFyYWx5c2lzIHwgZ2xpdGNoKSBmb3IgbW92aW5nIHN0YXR1ZXM/XG4gIC8vICAgICAgICAgIC0+IGdldCBub3JtYWwgcmVxdWlyZW1lbnRzIGZvciBmcmVlXG4gIC8vICAgICAgICAgIC0+IGJldHRlciBoaXRib3g/ICBhbnkgd2F5IHRvIGdldCBxdWVlbiB0byB3b3JrPyB0b28gbXVjaCBzdGF0ZT9cbiAgLy8gICAgICAgICAgICAgbWF5IG5lZWQgdG8gaGF2ZSB0d28gZGlmZmVyZW50IHRocm9uZSByb29tcz8gKGZ1bGwvZW1wdHkpXG4gIC8vICAgICAgICAgICAgIGFuZCBoYXZlIGZsYWcgc3RhdGUgYWZmZWN0IGV4aXQ/Pz9cbiAgLy8gICAgICAtIGF0IHRoZSB2ZXJ5IGxlYXN0IHdlIGNhbiB1c2UgaXQgZm9yIHRoZSBoaXRib3gsIGJ1dCB3ZSBtYXkgc3RpbGxcbiAgLy8gICAgICAgIG5lZWQgY3VzdG9tIG92ZXJsYXk/XG5cbiAgLy8gVE9ETyAtIHBzZXVkbyBmbGFncyBzb21ld2hlcmU/ICBsaWtlIHN3b3JkPyBicmVhayBpcm9uPyBldGMuLi5cblxuICBMZWFmRWxkZXIgPSB0cmFja2VkKH4weDEwMCk7XG4gIE9ha0VsZGVyID0gdHJhY2tlZCh+MHgxMDEpO1xuICBXYXRlcmZhbGxDYXZlU3dvcmRPZldhdGVyQ2hlc3QgPSB0cmFja2VkKH4weDEwMik7XG4gIFN0eHlMZWZ0VXBwZXJTd29yZE9mVGh1bmRlckNoZXN0ID0gdHJhY2tlZCh+MHgxMDMpO1xuICBNZXNpYUluVG93ZXIgPSB0cmFja2VkKDB4MTA0KTtcbiAgU2VhbGVkQ2F2ZUJhbGxPZldpbmRDaGVzdCA9IHRyYWNrZWQofjB4MTA1KTtcbiAgTXRTYWJyZVdlc3RUb3JuYWRvQnJhY2VsZXRDaGVzdCA9IHRyYWNrZWQofjB4MTA2KTtcbiAgR2lhbnRJbnNlY3QgPSB0cmFja2VkKH4weDEwNyk7XG4gIEtlbGJlc3F1ZTEgPSB0cmFja2VkKH4weDEwOCk7XG4gIFJhZ2UgPSB0cmFja2VkKH4weDEwOSk7XG4gIEFyeWxsaXNCYXNlbWVudENoZXN0ID0gdHJhY2tlZCh+MHgxMGEpO1xuICBNYWRvMSA9IHRyYWNrZWQofjB4MTBiKTtcbiAgU3Rvcm1CcmFjZWxldENoZXN0ID0gdHJhY2tlZCh+MHgxMGMpO1xuICBXYXRlcmZhbGxDYXZlUml2ZXJMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTEwKTsgLy8gcmFuZG8gY2hhbmdlZCBpbmRleCFcbiAgTWFkbzIgPSB0cmFja2VkKDB4MTEyKTtcbiAgU3R4eVJpZ2h0TWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTE0KTtcbiAgQmF0dGxlQXJtb3JDaGVzdCA9IHRyYWNrZWQoMHgxMWIpO1xuICBEcmF5Z29uMSA9IHRyYWNrZWQoMHgxMWMpO1xuICBTZWFsZWRDYXZlU21hbGxSb29tQmFja0NoZXN0ID0gdHJhY2tlZCgweDExZCk7IC8vIG1lZGljYWwgaGVyYlxuICBTZWFsZWRDYXZlQmlnUm9vbU5vcnRoZWFzdENoZXN0ID0gdHJhY2tlZCgweDExZSk7IC8vIGFudGlkb3RlXG4gIEZvZ0xhbXBDYXZlRnJvbnRDaGVzdCA9IHRyYWNrZWQoMHgxMWYpOyAvLyBseXNpcyBwbGFudFxuICBNdEh5ZHJhUmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxMjApOyAvLyBmcnVpdCBvZiBsaW1lXG4gIFNhYmVyYVVwc3RhaXJzTGVmdENoZXN0ID0gdHJhY2tlZCgweDEyMSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIEV2aWxTcGlyaXRJc2xhbmRMb3dlckNoZXN0ID0gdHJhY2tlZCgweDEyMik7IC8vIG1hZ2ljIHJpbmdcbiAgU2FiZXJhMiA9IHRyYWNrZWQoMHgxMjMpOyAvLyBmcnVpdCBvZiByZXB1blxuICBTZWFsZWRDYXZlU21hbGxSb29tRnJvbnRDaGVzdCA9IHRyYWNrZWQoMHgxMjQpOyAvLyB3YXJwIGJvb3RzXG4gIENvcmRlbEdyYXNzID0gdHJhY2tlZCgweDEyNSk7XG4gIEtlbGJlc3F1ZTIgPSB0cmFja2VkKDB4MTI2KTsgLy8gb3BlbCBzdGF0dWVcbiAgT2FrTW90aGVyID0gdHJhY2tlZCgweDEyNyk7XG4gIFBvcnRvYVF1ZWVuID0gdHJhY2tlZCgweDEyOCk7XG4gIEFrYWhhbmFTdGF0dWVPZk9ueXhUcmFkZWluID0gdHJhY2tlZCgweDEyOSk7XG4gIE9hc2lzQ2F2ZUZvcnRyZXNzQmFzZW1lbnRDaGVzdCA9IHRyYWNrZWQoMHgxMmEpO1xuICBCcm9rYWhhbmEgPSB0cmFja2VkKDB4MTJiKTtcbiAgRXZpbFNwaXJpdElzbGFuZFJpdmVyTGVmdENoZXN0ID0gdHJhY2tlZCgweDEyYyk7XG4gIERlbyA9IHRyYWNrZWQoMHgxMmQpO1xuICBWYW1waXJlMSA9IHRyYWNrZWQoMHgxMmUpO1xuICBPYXNpc0NhdmVOb3J0aHdlc3RDaGVzdCA9IHRyYWNrZWQoMHgxMmYpO1xuICBBa2FoYW5hRmx1dGVPZkxpbWVUcmFkZWluID0gdHJhY2tlZCgweDEzMCk7XG4gIFplYnVTdHVkZW50ID0gdHJhY2tlZCgweDEzMSk7IC8vIFRPRE8gLSBtYXkgb3B0IGZvciAyIGluIGNhdmUgaW5zdGVhZD9cbiAgV2luZG1pbGxHdWFyZEFsYXJtRmx1dGVUcmFkZWluID0gdHJhY2tlZCgweDEzMik7XG4gIE10U2FicmVOb3J0aEJhY2tPZlByaXNvbkNoZXN0ID0gdHJhY2tlZCgweDEzMyk7XG4gIFplYnVJblNoeXJvbiA9IHRyYWNrZWQoMHgxMzQpO1xuICBGb2dMYW1wQ2F2ZUJhY2tDaGVzdCA9IHRyYWNrZWQoMHgxMzUpO1xuICBJbmp1cmVkRG9scGhpbiA9IHRyYWNrZWQoMHgxMzYpO1xuICBDbGFyayA9IHRyYWNrZWQoMHgxMzcpO1xuICBTYWJlcmExID0gdHJhY2tlZCgweDEzOCk7XG4gIEtlbnN1SW5MaWdodGhvdXNlID0gdHJhY2tlZCgweDEzOSk7XG4gIFJlcGFpcmVkU3RhdHVlID0gdHJhY2tlZCgweDEzYSk7XG4gIFVuZGVyZ3JvdW5kQ2hhbm5lbFVuZGVyd2F0ZXJDaGVzdCA9IHRyYWNrZWQoMHgxM2IpO1xuICBLaXJpc2FNZWFkb3cgPSB0cmFja2VkKDB4MTNjKTtcbiAgS2FybWluZSA9IHRyYWNrZWQoMHgxM2QpO1xuICBBcnlsbGlzID0gdHJhY2tlZCgweDEzZSk7XG4gIE10SHlkcmFTdW1taXRDaGVzdCA9IHRyYWNrZWQoMHgxM2YpO1xuICBBenRlY2FJblB5cmFtaWQgPSB0cmFja2VkKDB4MTQwKTtcbiAgWmVidUF0V2luZG1pbGwgPSB0cmFja2VkKDB4MTQxKTtcbiAgTXRTYWJyZU5vcnRoU3VtbWl0ID0gdHJhY2tlZCgweDE0Mik7XG4gIFN0b21GaWdodFJld2FyZCA9IHRyYWNrZWQoMHgxNDMpO1xuICBNdFNhYnJlV2VzdFRvcm5lbCA9IHRyYWNrZWQoMHgxNDQpO1xuICBBc2luYUluQmFja1Jvb20gPSB0cmFja2VkKDB4MTQ1KTtcbiAgQmVoaW5kV2hpcmxwb29sID0gdHJhY2tlZCgweDE0Nik7XG4gIEtlbnN1SW5Td2FuID0gdHJhY2tlZCgweDE0Nyk7XG4gIFNsaW1lZEtlbnN1ID0gdHJhY2tlZCgweDE0OCk7XG4gIFNlYWxlZENhdmVCaWdSb29tU291dGh3ZXN0Q2hlc3QgPSB0cmFja2VkKDB4MTUwKTsgLy8gbWVkaWNhbCBoZXJiXG4gIC8vIHVudXNlZCAxNTEgc2FjcmVkIHNoaWVsZCBjaGVzdFxuICBNdFNhYnJlV2VzdFJpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTUyKTsgLy8gbWVkaWNhbCBoZXJiXG4gIE10U2FicmVOb3J0aE1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1Myk7IC8vIG1lZGljYWwgaGVyYlxuICBGb3J0cmVzc01hZG9IZWxsd2F5Q2hlc3QgPSB0cmFja2VkKDB4MTU0KTsgLy8gbWFnaWMgcmluZ1xuICBTYWJlcmFVcHN0YWlyc1JpZ2h0Q2hlc3QgPSB0cmFja2VkKDB4MTU1KTsgLy8gbWVkaWNhbCBoZXJiIGFjcm9zcyBzcGlrZXNcbiAgTXRIeWRyYUZhckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNTYpOyAvLyBtZWRpY2FsIGhlcmJcbiAgU3R4eUxlZnRMb3dlckNoZXN0ID0gdHJhY2tlZCgweDE1Nyk7IC8vIG1lZGljYWwgaGVyYlxuICBLYXJtaW5lQmFzZW1lbnRMb3dlck1pZGRsZUNoZXN0ID0gdHJhY2tlZCgweDE1OCk7IC8vIG1hZ2ljIHJpbmdcbiAgRWFzdENhdmVOb3J0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxNTkpOyAvLyBtZWRpY2FsIGhlcmIgKHVudXNlZClcbiAgT2FzaXNDYXZlRW50cmFuY2VBY3Jvc3NSaXZlckNoZXN0ID0gdHJhY2tlZCgweDE1YSk7IC8vIGZydWl0IG9mIHBvd2VyXG4gIC8vIHVudXNlZCAxNWIgMm5kIGZsdXRlIG9mIGxpbWUgLSBjaGFuZ2VkIGluIHJhbmRvXG4gIC8vIFdhdGVyZmFsbENhdmVSaXZlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNWIpOyAvLyAybmQgZmx1dGUgb2YgbGltZVxuICBFdmlsU3Bpcml0SXNsYW5kRXhpdENoZXN0ID0gdHJhY2tlZCgweDE1Yyk7IC8vIGx5c2lzIHBsYW50XG4gIEZvcnRyZXNzU2FiZXJhTWlkZGxlQ2hlc3QgPSB0cmFja2VkKDB4MTVkKTsgLy8gbHlzaXMgcGxhbnRcbiAgTXRTYWJyZU5vcnRoVW5kZXJCcmlkZ2VDaGVzdCA9IHRyYWNrZWQoMHgxNWUpOyAvLyBhbnRpZG90ZVxuICBLaXJpc2FQbGFudENhdmVDaGVzdCA9IHRyYWNrZWQoMHgxNWYpOyAvLyBhbnRpZG90ZVxuICBGb3J0cmVzc01hZG9VcHBlck5vcnRoQ2hlc3QgPSB0cmFja2VkKDB4MTYwKTsgLy8gYW50aWRvdGVcbiAgVmFtcGlyZTIgPSB0cmFja2VkKDB4MTYxKTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgRm9ydHJlc3NTYWJlcmFOb3J0aHdlc3RDaGVzdCA9IHRyYWNrZWQoMHgxNjIpOyAvLyBmcnVpdCBvZiBwb3dlclxuICBGb3J0cmVzc01hZG9Mb3dlckNlbnRlck5vcnRoQ2hlc3QgPSB0cmFja2VkKDB4MTYzKTsgLy8gb3BlbCBzdGF0dWVcbiAgT2FzaXNDYXZlTmVhckVudHJhbmNlQ2hlc3QgPSB0cmFja2VkKDB4MTY0KTsgLy8gZnJ1aXQgb2YgcG93ZXJcbiAgTXRIeWRyYUxlZnRSaWdodENoZXN0ID0gdHJhY2tlZCgweDE2NSk7IC8vIG1hZ2ljIHJpbmdcbiAgRm9ydHJlc3NTYWJlcmFTb3V0aGVhc3RDaGVzdCA9IHRyYWNrZWQoMHgxNjYpOyAvLyBmcnVpdCBvZiByZXB1blxuICBLZW5zdUluQ2FiaW4gPSB0cmFja2VkKDB4MTY3KTsgLy8gYWRkZWQgYnkgcmFuZG9taXplciBpZiBmb2cgbGFtcCBub3QgbmVlZGVkXG4gIC8vIHVudXNlZCAxNjggbWFnaWMgcmluZyBjaGVzdFxuICBNdFNhYnJlV2VzdE5lYXJLZW5zdUNoZXN0ID0gdHJhY2tlZCgweDE2OSk7IC8vIG1hZ2ljIHJpbmdcbiAgTXRTYWJyZVdlc3RMZWZ0Q2hlc3QgPSB0cmFja2VkKDB4MTZhKTsgLy8gd2FycCBib290c1xuICBGb3J0cmVzc01hZG9VcHBlckJlaGluZFdhbGxDaGVzdCA9IHRyYWNrZWQoMHgxNmIpOyAvLyBtYWdpYyByaW5nXG4gIFB5cmFtaWRDaGVzdCA9IHRyYWNrZWQoMHgxNmMpOyAvLyBtYWdpYyByaW5nXG4gIENyeXB0UmlnaHRDaGVzdCA9IHRyYWNrZWQoMHgxNmQpOyAvLyBvcGVsIHN0YXR1ZVxuICBLYXJtaW5lQmFzZW1lbnRMb3dlckxlZnRDaGVzdCA9IHRyYWNrZWQoMHgxNmUpOyAvLyB3YXJwIGJvb3RzXG4gIEZvcnRyZXNzTWFkb0xvd2VyU291dGhlYXN0Q2hlc3QgPSB0cmFja2VkKDB4MTZmKTsgLy8gbWFnaWMgcmluZ1xuICAvLyA9IHRyYWNrZWQoMHgxNzApOyAvLyBtaW1pYyAvIG1lZGljYWwgaGVyYlxuICAvLyBUT0RPIC0gYWRkIGFsbCB0aGUgbWltaWNzLCBnaXZlIHRoZW0gc3RhYmxlIG51bWJlcnM/XG4gIEZvZ0xhbXBDYXZlTWlkZGxlTm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzApO1xuICBGb2dMYW1wQ2F2ZU1pZGRsZVNvdXRod2VzdE1pbWljID0gdHJhY2tlZCgweDE3MSk7XG4gIFdhdGVyZmFsbENhdmVGcm9udE1pbWljID0gdHJhY2tlZCgweDE3Mik7XG4gIEV2aWxTcGlyaXRJc2xhbmRSaXZlclJpZ2h0TWltaWMgPSB0cmFja2VkKDB4MTczKTtcbiAgTXRIeWRyYUZpbmFsQ2F2ZU1pbWljID0gdHJhY2tlZCgweDE3NCk7XG4gIFN0eHlMZWZ0Tm9ydGhNaW1pYyA9IHRyYWNrZWQoMHgxNzUpO1xuICBTdHh5UmlnaHROb3J0aE1pbWljID0gdHJhY2tlZCgweDE3Nik7XG4gIFN0eHlSaWdodFNvdXRoTWltaWMgPSB0cmFja2VkKDB4MTc3KTtcbiAgQ3J5cHRMZWZ0UGl0TWltaWMgPSB0cmFja2VkKDB4MTc4KTtcbiAgS2FybWluZUJhc2VtZW50VXBwZXJNaWRkbGVNaW1pYyA9IHRyYWNrZWQoMHgxNzkpO1xuICBLYXJtaW5lQmFzZW1lbnRVcHBlclJpZ2h0TWltaWMgPSB0cmFja2VkKDB4MTdhKTtcbiAgS2FybWluZUJhc2VtZW50TG93ZXJSaWdodE1pbWljID0gdHJhY2tlZCgweDE3Yik7XG4gIC8vIFRPRE8gLSBtaW1pY3MgMTMuLjE2ID9cblxuICAvLyAxODAgLi4gMWZmID0+IGZpeGVkIGZsYWdzIGZvciBvdmVyZmxvdyBidWZmZXIuXG5cbiAgLy8gMjAwIC4uIDI3ZiA9PiBmaXhlZCBmbGFncyBmb3IgaXRlbXMuXG4gIFN3b3JkT2ZXaW5kID0gdHJhY2tlZCgweDIwMCk7XG4gIFN3b3JkT2ZGaXJlID0gdHJhY2tlZCgweDIwMSk7XG4gIFN3b3JkT2ZXYXRlciA9IHRyYWNrZWQoMHgyMDIpO1xuICBTd29yZE9mVGh1bmRlciA9IHRyYWNrZWQoMHgyMDMpO1xuICBDcnlzdGFsaXMgPSB0cmFja2VkKDB4MjA0KTtcbiAgQmFsbE9mV2luZCA9IHRyYWNrZWQoMHgyMDUpO1xuICBUb3JuYWRvQnJhY2VsZXQgPSB0cmFja2VkKDB4MjA2KTtcbiAgQmFsbE9mRmlyZSA9IHRyYWNrZWQoMHgyMDcpO1xuICBGbGFtZUJyYWNlbGV0ID0gdHJhY2tlZCgweDIwOCk7XG4gIEJhbGxPZldhdGVyID0gdHJhY2tlZCgweDIwOSk7XG4gIEJsaXp6YXJkQnJhY2VsZXQgPSB0cmFja2VkKDB4MjBhKTtcbiAgQmFsbE9mVGh1bmRlciA9IHRyYWNrZWQoMHgyMGIpO1xuICBTdG9ybUJyYWNlbGV0ID0gdHJhY2tlZCgweDIwYyk7XG4gIENhcmFwYWNlU2hpZWxkID0gdHJhY2tlZCgweDIwZCk7XG4gIEJyb256ZVNoaWVsZCA9IHRyYWNrZWQoMHgyMGUpO1xuICBQbGF0aW51bVNoaWVsZCA9IHRyYWNrZWQoMHgyMGYpO1xuICBNaXJyb3JlZFNoaWVsZCA9IHRyYWNrZWQoMHgyMTApO1xuICBDZXJhbWljU2hpZWxkID0gdHJhY2tlZCgweDIxMSk7XG4gIFNhY3JlZFNoaWVsZCA9IHRyYWNrZWQoMHgyMTIpO1xuICBCYXR0bGVTaGllbGQgPSB0cmFja2VkKDB4MjEzKTtcbiAgUHN5Y2hvU2hpZWxkID0gdHJhY2tlZCgweDIxNCk7XG4gIFRhbm5lZEhpZGUgPSB0cmFja2VkKDB4MjE1KTtcbiAgTGVhdGhlckFybW9yID0gdHJhY2tlZCgweDIxNik7XG4gIEJyb256ZUFybW9yID0gdHJhY2tlZCgweDIxNyk7XG4gIFBsYXRpbnVtQXJtb3IgPSB0cmFja2VkKDB4MjE4KTtcbiAgU29sZGllclN1aXQgPSB0cmFja2VkKDB4MjE5KTtcbiAgQ2VyYW1pY1N1aXQgPSB0cmFja2VkKDB4MjFhKTtcbiAgQmF0dGxlQXJtb3IgPSB0cmFja2VkKDB4MjFiKTtcbiAgUHN5Y2hvQXJtb3IgPSB0cmFja2VkKDB4MjFjKTtcbiAgTWVkaWNhbEhlcmIgPSB0cmFja2VkKDB4MjFkKTtcbiAgQW50aWRvdGUgPSB0cmFja2VkKDB4MjFlKTtcbiAgTHlzaXNQbGFudCA9IHRyYWNrZWQoMHgyMWYpO1xuICBGcnVpdE9mTGltZSA9IHRyYWNrZWQoMHgyMjApO1xuICBGcnVpdE9mUG93ZXIgPSB0cmFja2VkKDB4MjIxKTtcbiAgTWFnaWNSaW5nID0gdHJhY2tlZCgweDIyMik7XG4gIEZydWl0T2ZSZXB1biA9IHRyYWNrZWQoMHgyMjMpO1xuICBXYXJwQm9vdHMgPSB0cmFja2VkKDB4MjI0KTtcbiAgU3RhdHVlT2ZPbnl4ID0gdHJhY2tlZCgweDIyNSk7XG4gIE9wZWxTdGF0dWUgPSB0cmFja2VkKDB4MjI2KTtcbiAgSW5zZWN0Rmx1dGUgPSB0cmFja2VkKDB4MjI3KTtcbiAgRmx1dGVPZkxpbWUgPSB0cmFja2VkKDB4MjI4KTtcbiAgR2FzTWFzayA9IHRyYWNrZWQoMHgyMjkpO1xuICBQb3dlclJpbmcgPSB0cmFja2VkKDB4MjJhKTtcbiAgV2FycmlvclJpbmcgPSB0cmFja2VkKDB4MjJiKTtcbiAgSXJvbk5lY2tsYWNlID0gdHJhY2tlZCgweDIyYyk7XG4gIERlb3NQZW5kYW50ID0gdHJhY2tlZCgweDIyZCk7XG4gIFJhYmJpdEJvb3RzID0gdHJhY2tlZCgweDIyZSk7XG4gIExlYXRoZXJCb290cyA9IHRyYWNrZWQoMHgyMmYpO1xuICBTaGllbGRSaW5nID0gdHJhY2tlZCgweDIzMCk7XG4gIEFsYXJtRmx1dGUgPSB0cmFja2VkKDB4MjMxKTtcbiAgV2luZG1pbGxLZXkgPSB0cmFja2VkKDB4MjMyKTtcbiAgS2V5VG9Qcmlzb24gPSB0cmFja2VkKDB4MjMzKTtcbiAgS2V5VG9TdHh5ID0gdHJhY2tlZCgweDIzNCk7XG4gIEZvZ0xhbXAgPSB0cmFja2VkKDB4MjM1KTtcbiAgU2hlbGxGbHV0ZSA9IHRyYWNrZWQoMHgyMzYpO1xuICBFeWVHbGFzc2VzID0gdHJhY2tlZCgweDIzNyk7XG4gIEJyb2tlblN0YXR1ZSA9IHRyYWNrZWQoMHgyMzgpO1xuICBHbG93aW5nTGFtcCA9IHRyYWNrZWQoMHgyMzkpO1xuICBTdGF0dWVPZkdvbGQgPSB0cmFja2VkKDB4MjNhKTtcbiAgTG92ZVBlbmRhbnQgPSB0cmFja2VkKDB4MjNiKTtcbiAgS2lyaXNhUGxhbnQgPSB0cmFja2VkKDB4MjNjKTtcbiAgSXZvcnlTdGF0dWUgPSB0cmFja2VkKDB4MjNkKTtcbiAgQm93T2ZNb29uID0gdHJhY2tlZCgweDIzZSk7XG4gIEJvd09mU3VuID0gdHJhY2tlZCgweDIzZik7XG4gIEJvd09mVHJ1dGggPSB0cmFja2VkKDB4MjQwKTtcbiAgUmVmcmVzaCA9IHRyYWNrZWQoMHgyNDEpO1xuICBQYXJhbHlzaXMgPSB0cmFja2VkKDB4MjQyKTtcbiAgVGVsZXBhdGh5ID0gdHJhY2tlZCgweDI0Myk7XG4gIFRlbGVwb3J0ID0gdHJhY2tlZCgweDI0NCk7XG4gIFJlY292ZXIgPSB0cmFja2VkKDB4MjQ1KTtcbiAgQmFycmllciA9IHRyYWNrZWQoMHgyNDYpO1xuICBDaGFuZ2UgPSB0cmFja2VkKDB4MjQ3KTtcbiAgRmxpZ2h0ID0gdHJhY2tlZCgweDI0OCk7XG5cbiAgLy8gMjgwIC4uIDJmMCA9PiBmaXhlZCBmbGFncyBmb3Igd2FsbHMuXG4gIENhbG1lZEFuZ3J5U2VhID0gdHJhY2tlZCgweDI4Myk7XG4gIE9wZW5lZEpvZWxTaGVkID0gdHJhY2tlZCgweDI4Nyk7XG4gIERyYXlnb24yID0gdHJhY2tlZCgweDI4ZCk7XG4gIE9wZW5lZENyeXB0ID0gdHJhY2tlZCgweDI4ZSk7XG4gIE9wZW5lZFN0eHkgPSB0cmFja2VkKDB4MmIwKTtcbiAgT3BlbmVkU3dhbkdhdGUgPSB0cmFja2VkKDB4MmIzKTtcbiAgT3BlbmVkUHJpc29uID0gdHJhY2tlZCgweDJkOCk7XG4gIE9wZW5lZFNlYWxlZENhdmUgPSB0cmFja2VkKDB4MmVlKTtcblxuICAvLyBOb3RoaW5nIGV2ZXIgc2V0cyB0aGlzLCBzbyBqdXN0IHVzZSBpdCByaWdodCBvdXQuXG4gIEFsd2F5c1RydWUgPSBmaXhlZCgweDJmMCwgVFJVRSk7XG5cbiAgV2FycExlYWYgPSB0cmFja2VkKDB4MmY1KTtcbiAgV2FycEJyeW5tYWVyID0gdHJhY2tlZCgweDJmNik7XG4gIFdhcnBPYWsgPSB0cmFja2VkKDB4MmY3KTtcbiAgV2FycE5hZGFyZSA9IHRyYWNrZWQoMHgyZjgpO1xuICBXYXJwUG9ydG9hID0gdHJhY2tlZCgweDJmOSk7XG4gIFdhcnBBbWF6b25lcyA9IHRyYWNrZWQoMHgyZmEpO1xuICBXYXJwSm9lbCA9IHRyYWNrZWQoMHgyZmIpO1xuICBXYXJwWm9tYmllID0gdHJhY2tlZCh+MHgyZmIpO1xuICBXYXJwU3dhbiA9IHRyYWNrZWQoMHgyZmMpO1xuICBXYXJwU2h5cm9uID0gdHJhY2tlZCgweDJmZCk7XG4gIFdhcnBHb2EgPSB0cmFja2VkKDB4MmZlKTtcbiAgV2FycFNhaGFyYSA9IHRyYWNrZWQoMHgyZmYpO1xuXG4gIC8vIFBzZXVkbyBmbGFnc1xuICBTd29yZCA9IHBzZXVkbyh0aGlzKTtcbiAgTW9uZXkgPSBwc2V1ZG8odGhpcyk7XG4gIEJyZWFrU3RvbmUgPSBwc2V1ZG8odGhpcyk7XG4gIEJyZWFrSWNlID0gcHNldWRvKHRoaXMpO1xuICBGb3JtQnJpZGdlID0gcHNldWRvKHRoaXMpO1xuICBCcmVha0lyb24gPSBwc2V1ZG8odGhpcyk7XG4gIFRyYXZlbFN3YW1wID0gcHNldWRvKHRoaXMpO1xuICBDbGltYldhdGVyZmFsbCA9IHBzZXVkbyh0aGlzKTtcbiAgQnV5SGVhbGluZyA9IHBzZXVkbyh0aGlzKTtcbiAgQnV5V2FycCA9IHBzZXVkbyh0aGlzKTtcbiAgU2hvb3RpbmdTdGF0dWUgPSBwc2V1ZG8odGhpcyk7XG4gIENsaW1iU2xvcGU4ID0gcHNldWRvKHRoaXMpOyAvLyBjbGltYiBzbG9wZXMgaGVpZ2h0IDYtOFxuICBDbGltYlNsb3BlOSA9IHBzZXVkbyh0aGlzKTsgLy8gY2xpbWIgc2xvcGVzIGhlaWdodCA5XG4gIFdpbGRXYXJwID0gcHNldWRvKHRoaXMpO1xuXG4gIC8vIE1hcCBvZiBmbGFncyB0aGF0IGFyZSBcIndhaXRpbmdcIiBmb3IgYSBwcmV2aW91c2x5LXVzZWQgSUQuXG4gIC8vIFNpZ25pZmllZCB3aXRoIGEgbmVnYXRpdmUgKG9uZSdzIGNvbXBsZW1lbnQpIElEIGluIHRoZSBGbGFnIG9iamVjdC5cbiAgcHJpdmF0ZSByZWFkb25seSB1bmFsbG9jYXRlZCA9IG5ldyBNYXA8bnVtYmVyLCBGbGFnPigpO1xuXG4gIC8vIC8vIE1hcCBvZiBhdmFpbGFibGUgSURzLlxuICAvLyBwcml2YXRlIHJlYWRvbmx5IGF2YWlsYWJsZSA9IFtcbiAgLy8gICBuZXcgU2V0PG51bWJlcj4oKSwgLy8gMDAwIC4uIDBmZlxuICAvLyAgIG5ldyBTZXQ8bnVtYmVyPigpLCAvLyAxMDAgLi4gMWZmXG4gIC8vICAgbmV3IFNldDxudW1iZXI+KCksIC8vIDIwMCAuLiAyZmZcbiAgLy8gXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIC8vIEJ1aWxkIHVwIGFsbCB0aGUgZmxhZ3MgYXMgYWN0dWFsIGluc3RhbmNlcyBvZiBGbGFnLlxuICAgIGZvciAoY29uc3Qga2V5IGluIHRoaXMpIHtcbiAgICAgIGlmICghdGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNwZWMgPSB0aGlzW2tleV07XG4gICAgICBpZiAoIShzcGVjIGFzIGFueSlbRkxBR10pIGNvbnRpbnVlO1xuICAgICAgLy8gUmVwbGFjZSBpdCB3aXRoIGFuIGFjdHVhbCBmbGFnLiAgV2UgbWF5IG5lZWQgYSBuYW1lLCBldGMuLi5cbiAgICAgIGNvbnN0IGtleU51bWJlciA9IE51bWJlcihrZXkpO1xuICAgICAgY29uc3QgaWQgPSB0eXBlb2Ygc3BlYy5pZCA9PT0gJ251bWJlcicgPyBzcGVjLmlkIDoga2V5TnVtYmVyO1xuICAgICAgaWYgKGlzTmFOKGlkKSkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZmxhZzogJHtrZXl9YCk7XG4gICAgICBjb25zdCBuYW1lID1cbiAgICAgICAgICBzcGVjLm5hbWUgfHxcbiAgICAgICAgICAoaXNOYU4oa2V5TnVtYmVyKSA/IHVwcGVyQ2FtZWxUb1NwYWNlcyhrZXkpIDogZmxhZ05hbWUoaWQpKTtcbiAgICAgIGNvbnN0IGZsYWcgPSBuZXcgRmxhZyh0aGlzLCBuYW1lLCBpZCwgc3BlYyk7XG4gICAgICB0aGlzW2tleV0gPSBmbGFnO1xuICAgICAgLy8gSWYgSUQgaXMgbmVnYXRpdmUsIHRoZW4gc3RvcmUgaXQgYXMgdW5hbGxvY2F0ZWQuXG4gICAgICBpZiAoZmxhZy5pZCA8IDApIHtcbiAgICAgICAgdGhpcy51bmFsbG9jYXRlZC5zZXQofmZsYWcuaWQsIGZsYWcpO1xuICAgICAgfSBlbHNlIGlmICghdGhpc1tmbGFnLmlkXSkge1xuICAgICAgICB0aGlzW2ZsYWcuaWRdID0gZmxhZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgYWRkIHRoZSBtaXNzaW5nIGZsYWdzLlxuICAgIGZvciAobGV0IGkgPSAweDEwMDsgaSA8IDB4MTgwOyBpKyspIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBgQ2hlY2sgJHtoZXgoaSAmIDB4ZmYpfWA7XG4gICAgICBpZiAodGhpc1tpXSkge1xuICAgICAgICBpZiAoIXRoaXNbaV0uZml4ZWQgJiYgIXRoaXMudW5hbGxvY2F0ZWQuaGFzKGkpKSB7XG4gICAgICAgICAgdGhpcy51bmFsbG9jYXRlZC5zZXQoXG4gICAgICAgICAgICAgIGksIG5ldyBGbGFnKHRoaXMsIG5hbWUsIH5pLCB7Zml4ZWQ6IHRydWV9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgRmxhZyh0aGlzLCBuYW1lLCBpLCB7Zml4ZWQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDB4MTgwOyBpIDwgMHgyODA7IGkrKykge1xuICAgICAgaWYgKCF0aGlzW2ldKSB7XG4gICAgICAgIC8vIEl0ZW0gYnVmZmVyIGhlcmVcbiAgICAgICAgY29uc3QgdHlwZSA9IGkgPCAweDIwMCA/ICdCdWZmZXIgJyA6ICdJdGVtICc7XG4gICAgICAgIHRoaXNbaV0gPSBuZXcgRmxhZyh0aGlzLCB0eXBlICsgaGV4KGkpLCBpLCB7Zml4ZWQ6IHRydWV9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRm9yIHRoZSByZW1haW5kZXIsIGZpbmQgd2FsbHMgaW4gbWFwcy5cbiAgICAvLyAgLSBkbyB3ZSBuZWVkIHRvIHB1bGwgdGhlbSBmb3JtIGxvY2F0aW9ucz8/IG9yIHRoaXMgZG9pbmcgYW55dGhpbmc/P1xuICAgIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgICAgaWYgKHRoaXNbZi5mbGFnXSkgY29udGludWU7XG4gICAgICAgIHRoaXNbZi5mbGFnXSA9IHdhbGxGbGFnKHRoaXMsIGYuZmxhZyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU2F2ZXMgPiA0NzAgYnl0ZXMgb2YgcmVkdW5kYW50IGZsYWcgc2V0cyFcbiAgZGVmcmFnKCkge1xuICAgIC8vIG1ha2UgYSBtYXAgb2YgbmV3IElEcyBmb3IgZXZlcnl0aGluZy5cbiAgICBjb25zdCByZW1hcHBpbmcgPSBuZXcgTWFwPG51bWJlciwgKGY6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+KCk7XG4gICAgY29uc3QgdW51c2VkID0gbmV3IFNldDxudW1iZXI+KCk7XG5cbiAgICAvLyBmaXJzdCBoYW5kbGUgYWxsIHRoZSBvYnNvbGV0ZSBmbGFncyAtIG9uY2UgdGhlIHJlbWFwcGluZyBpcyBwdWxsZWQgb2ZmXG4gICAgLy8gd2UgY2FuIHNpbXBseSB1bnJlZiB0aGVtLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgzMDA7IGkrKykge1xuICAgICAgY29uc3QgZiA9IHRoaXNbaV07XG4gICAgICBjb25zdCBvID0gZj8ub2Jzb2xldGU7XG4gICAgICBpZiAobykge1xuICAgICAgICByZW1hcHBpbmcuc2V0KGksIChjOiBGbGFnQ29udGV4dCkgPT4gYy5zZXQgPyAtMSA6IG8uY2FsbChmLCBjKSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2ldO1xuICAgICAgfSBlbHNlIGlmICghZikge1xuICAgICAgICB1bnVzZWQuYWRkKGkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIG5vdyBtb3ZlIGFsbCB0aGUgbW92YWJsZSBmbGFncy5cbiAgICBsZXQgaSA9IDA7XG4gICAgbGV0IGogPSAweDJmZjtcbiAgICAvLyBXQVJOSU5HOiBpIGFuZCBqIGFyZSBib3VuZCB0byB0aGUgb3V0ZXIgc2NvcGUhICBDbG9zaW5nIG92ZXIgdGhlbVxuICAgIC8vIHdpbGwgTk9UIHdvcmsgYXMgaW50ZW5kZWQuXG4gICAgZnVuY3Rpb24gcmV0PFQ+KHg6IFQpOiAoKSA9PiBUIHsgcmV0dXJuICgpID0+IHg7IH1cbiAgICB3aGlsZSAoaSA8IGopIHtcbiAgICAgIGlmICh0aGlzW2ldIHx8IHRoaXMudW5hbGxvY2F0ZWQuaGFzKGkpKSB7IGkrKzsgY29udGludWU7IH1cbiAgICAgIGNvbnN0IGYgPSB0aGlzW2pdO1xuICAgICAgaWYgKCFmIHx8IGYuZml4ZWQpIHsgai0tOyBjb250aW51ZTsgfVxuICAgICAgLy8gZiBpcyBhIG1vdmFibGUgZmxhZy4gIE1vdmUgaXQgdG8gaS5cbiAgICAgIHJlbWFwcGluZy5zZXQoaiwgcmV0KGkpKTtcbiAgICAgIChmIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IGk7XG4gICAgICB0aGlzW2ldID0gZjtcbiAgICAgIGRlbGV0ZSB0aGlzW2pdO1xuICAgICAgaSsrO1xuICAgICAgai0tO1xuICAgIH1cblxuICAgIC8vIGdvIHRocm91Z2ggYWxsIHRoZSBwb3NzaWJsZSBwbGFjZXMgd2UgY291bGQgZmluZCBmbGFncyBhbmQgcmVtYXAhXG4gICAgdGhpcy5yZW1hcEZsYWdzKHJlbWFwcGluZywgdW51c2VkKTtcblxuICAgIC8vIFVuYWxsb2NhdGVkIGZsYWdzIGRvbid0IG5lZWQgYW55IHJlbWFwcGluZy5cbiAgICBmb3IgKGNvbnN0IFt3YW50LCBmbGFnXSBvZiB0aGlzLnVuYWxsb2NhdGVkKSB7XG4gICAgICBpZiAodGhpc1t3YW50XSkgY29udGludWU7XG4gICAgICB0aGlzLnVuYWxsb2NhdGVkLmRlbGV0ZSh3YW50KTtcbiAgICAgICh0aGlzW3dhbnRdID0gZmxhZyBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSB3YW50O1xuICAgIH1cblxuICAgIC8vaWYgKHRoaXMudW5hbGxvY2F0ZWQuc2l6ZSkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZnVsbHkgYWxsb2NhdGVgKTtcblxuICAgIC8vIFJlcG9ydCBob3cgdGhlIGRlZnJhZyB3ZW50P1xuICAgIGNvbnN0IGZyZWUgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIGlmICghdGhpc1tpXSkgZnJlZS5wdXNoKGhleDMoaSkpO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhgRnJlZSBmbGFnczogJHtmcmVlLmpvaW4oJyAnKX1gKTtcbiAgfVxuXG4gIGluc2VydFpvbWJpZVdhcnBGbGFnKCkge1xuICAgIC8vIE1ha2Ugc3BhY2UgZm9yIHRoZSBuZXcgZmxhZyBiZXR3ZWVuIEpvZWwgYW5kIFN3YW5cbiAgICBjb25zdCByZW1hcHBpbmcgPSBuZXcgTWFwPG51bWJlciwgKGY6IEZsYWdDb250ZXh0KSA9PiBudW1iZXI+KCk7XG4gICAgaWYgKHRoaXNbMHgyZjRdKSB0aHJvdyBuZXcgRXJyb3IoYE5vIHNwYWNlIHRvIGluc2VydCB3YXJwIGZsYWdgKTtcbiAgICBjb25zdCBuZXdJZCA9IH50aGlzLldhcnBab21iaWUuaWQ7XG4gICAgaWYgKG5ld0lkIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgV2FycFpvbWJpZSBpZGApO1xuICAgIGZvciAobGV0IGkgPSAweDJmNDsgaSA8IG5ld0lkOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB0aGlzW2kgKyAxXTtcbiAgICAgICh0aGlzW2ldIGFzIFdyaXRhYmxlPEZsYWc+KS5pZCA9IGk7XG4gICAgICByZW1hcHBpbmcuc2V0KGkgKyAxLCAoKSA9PiBpKTtcbiAgICB9XG4gICAgKHRoaXMuV2FycFpvbWJpZSBhcyBXcml0YWJsZTxGbGFnPikuaWQgPSBuZXdJZDtcbiAgICB0aGlzW25ld0lkXSA9IHRoaXMuV2FycFpvbWJpZTtcbiAgICB0aGlzLnJlbWFwRmxhZ3MocmVtYXBwaW5nKTtcbiAgfVxuXG4gIHJlbWFwKHNyYzogbnVtYmVyLCBkZXN0OiBudW1iZXIpIHtcbiAgICB0aGlzLnJlbWFwRmxhZ3MobmV3IE1hcChbW3NyYywgKCkgPT4gZGVzdF1dKSk7XG4gIH1cblxuICByZW1hcEZsYWdzKHJlbWFwcGluZzogTWFwPG51bWJlciwgKGN0eDogRmxhZ0NvbnRleHQpID0+IG51bWJlcj4sXG4gICAgICAgICAgICAgdW51c2VkPzogU2V0PG51bWJlcj4pIHtcbiAgICBmdW5jdGlvbiBwcm9jZXNzTGlzdChsaXN0OiBudW1iZXJbXSwgY3R4OiBGbGFnQ29udGV4dCkge1xuICAgICAgZm9yIChsZXQgaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgbGV0IGYgPSBsaXN0W2ldO1xuICAgICAgICBpZiAoZiA8IDApIGYgPSB+ZjtcbiAgICAgICAgaWYgKHVudXNlZCAmJiB1bnVzZWQuaGFzKGYpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTSE9VTEQgQkUgVU5VU0VEOiAke2hleChmKX1gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZW1hcCA9IHJlbWFwcGluZy5nZXQoZik7XG4gICAgICAgIGlmIChyZW1hcCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgbGV0IG1hcHBlZCA9IHJlbWFwKHsuLi5jdHgsIGluZGV4OiBpfSk7XG4gICAgICAgIGlmIChtYXBwZWQgPj0gMCkge1xuICAgICAgICAgIGxpc3RbaV0gPSBsaXN0W2ldIDwgMCA/IH5tYXBwZWQgOiBtYXBwZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcHJvY2VzcyhmbGFnOiBudW1iZXIsIGN0eDogRmxhZ0NvbnRleHQpIHtcbiAgICAgIGxldCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgICAgaWYgKHVudXNlZCAmJiB1bnVzZWQuaGFzKHVuc2lnbmVkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNIT1VMRCBCRSBVTlVTRUQ6ICR7aGV4KHVuc2lnbmVkKX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlbWFwID0gcmVtYXBwaW5nLmdldCh1bnNpZ25lZCk7XG4gICAgICBpZiAocmVtYXAgPT0gbnVsbCkgcmV0dXJuIGZsYWc7XG4gICAgICBsZXQgbWFwcGVkID0gcmVtYXAoY3R4KTtcbiAgICAgIGlmIChtYXBwZWQgPCAwKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBmbGFnIGRlbGV0ZWApO1xuICAgICAgcmV0dXJuIGZsYWcgPCAwID8gfm1hcHBlZCA6IG1hcHBlZDtcbiAgICB9XG5cbiAgICAvLyBMb2NhdGlvbiBmbGFnc1xuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ubG9jYXRpb25zKSB7XG4gICAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBmbGFnIG9mIGxvY2F0aW9uLmZsYWdzKSB7XG4gICAgICAgIGZsYWcuZmxhZyA9IHByb2Nlc3MoZmxhZy5mbGFnLCB7bG9jYXRpb259KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOUEMgZmxhZ3NcbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLnJvbS5ucGNzKSB7XG4gICAgICBpZiAoIW5wYy51c2VkKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgW2xvYywgY29uZHNdIG9mIG5wYy5zcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgICAgcHJvY2Vzc0xpc3QoY29uZHMsIHtucGMsIHNwYXduOiBsb2N9KTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgICBkLmNvbmRpdGlvbiA9IHByb2Nlc3MoZC5jb25kaXRpb24sIHtucGMsIGRpYWxvZzogdHJ1ZX0pO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbLCBkc10gb2YgbnBjLmxvY2FsRGlhbG9ncykge1xuICAgICAgICBmb3IgKGNvbnN0IGQgb2YgZHMpIHtcbiAgICAgICAgICBkLmNvbmRpdGlvbiA9IHByb2Nlc3MoZC5jb25kaXRpb24sIHtucGMsIGRpYWxvZzogdHJ1ZX0pO1xuICAgICAgICAgIHByb2Nlc3NMaXN0KGQuZmxhZ3MsIHtucGMsIGRpYWxvZzogdHJ1ZSwgc2V0OiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyIGZsYWdzXG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMucm9tLnRyaWdnZXJzKSB7XG4gICAgICBpZiAoIXRyaWdnZXIudXNlZCkgY29udGludWU7XG4gICAgICBwcm9jZXNzTGlzdCh0cmlnZ2VyLmNvbmRpdGlvbnMsIHt0cmlnZ2VyfSk7XG4gICAgICBwcm9jZXNzTGlzdCh0cmlnZ2VyLmZsYWdzLCB7dHJpZ2dlciwgc2V0OiB0cnVlfSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIHVwZGF0aW5nIHRlbGVwYXRoeT8hP1xuXG4gICAgLy8gSXRlbUdldCBmbGFnc1xuICAgIGZvciAoY29uc3QgaXRlbUdldCBvZiB0aGlzLnJvbS5pdGVtR2V0cykge1xuICAgICAgcHJvY2Vzc0xpc3QoaXRlbUdldC5mbGFncywge3NldDogdHJ1ZX0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5yb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgaXRlbVVzZSBvZiBpdGVtLml0ZW1Vc2VEYXRhKSB7XG4gICAgICAgIGlmIChpdGVtVXNlLmtpbmQgPT09ICdmbGFnJykge1xuICAgICAgICAgIGl0ZW1Vc2Uud2FudCA9IHByb2Nlc3MoaXRlbVVzZS53YW50LCB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzc0xpc3QoaXRlbVVzZS5mbGFncywge3NldDogdHJ1ZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8gLSBhbnl0aGluZyBlbHNlP1xuICB9XG5cbiAgLy8gVE9ETyAtIG1hbmlwdWxhdGUgdGhpcyBzdHVmZlxuXG4gIC8vIHByaXZhdGUgcmVhZG9ubHkgYXZhaWxhYmxlID0gbmV3IFNldDxudW1iZXI+KFtcbiAgLy8gICAvLyBUT0RPIC0gdGhlcmUncyBhIHRvbiBvZiBsb3dlciBmbGFncyBhcyB3ZWxsLlxuICAvLyAgIC8vIFRPRE8gLSB3ZSBjYW4gcmVwdXJwb3NlIGFsbCB0aGUgb2xkIGl0ZW0gZmxhZ3MuXG4gIC8vICAgMHgyNzAsIDB4MjcxLCAweDI3MiwgMHgyNzMsIDB4Mjc0LCAweDI3NSwgMHgyNzYsIDB4Mjc3LFxuICAvLyAgIDB4Mjc4LCAweDI3OSwgMHgyN2EsIDB4MjdiLCAweDI3YywgMHgyN2QsIDB4MjdlLCAweDI3ZixcbiAgLy8gICAweDI4MCwgMHgyODEsIDB4Mjg4LCAweDI4OSwgMHgyOGEsIDB4MjhiLCAweDI4YyxcbiAgLy8gICAweDJhNywgMHgyYWIsIDB4MmI0LFxuICAvLyBdKTtcblxuICBhbGxvYyhzZWdtZW50OiBudW1iZXIgPSAwKTogbnVtYmVyIHtcbiAgICBpZiAoc2VnbWVudCAhPT0gMHgyMDApIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGFsbG9jYXRlIG91dHNpZGUgMnh4YCk7XG4gICAgZm9yIChsZXQgZmxhZyA9IDB4MjgwOyBmbGFnIDwgMHgzMDA7IGZsYWcrKykge1xuICAgICAgaWYgKCF0aGlzW2ZsYWddKSB7XG4gICAgICAgIHRoaXNbZmxhZ10gPSB3YWxsRmxhZyh0aGlzLCBmbGFnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbGFnO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGZyZWUgZmxhZ3MuYCk7XG4gIH1cblxuICBmcmVlKGZsYWc6IG51bWJlcikge1xuICAgIC8vIFRPRE8gLSBpcyB0aGVyZSBtb3JlIHRvIHRoaXM/ICBjaGVjayBmb3Igc29tZXRoaW5nIGVsc2U/XG4gICAgZGVsZXRlIHRoaXNbZmxhZ107XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhZ05hbWUoaWQ6IG51bWJlcik6IHN0cmluZyB7XG4gIHJldHVybiAnRmxhZyAnICsgaGV4MyhpZCk7XG59XG5cbmZ1bmN0aW9uIHdhbGxGbGFnKGZsYWdzOiBGbGFncywgaWQ6IG51bWJlcik6IEZsYWcge1xuICByZXR1cm4gbmV3IEZsYWcoZmxhZ3MsICdXYWxsICcgKyBoZXgoaWQgJiAweGZmKSwgaWQsIHtmaXhlZDogdHJ1ZX0pO1xufVxuIl19