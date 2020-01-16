import { Entrance, Exit, Flag, Spawn } from '../rom/location.js';
import { MessageId } from '../rom/messageid.js';
import { GlobalDialog, LocalDialog } from '../rom/npc.js';
import { ShopType } from '../rom/shop.js';
import { hex } from '../rom/util.js';
import { assert } from '../util.js';
export function deterministicPreParse(prg) {
    prg[0x1e06b] &= 7;
    prg[0x1e06f] &= 7;
    prg[0x1e073] &= 7;
    prg[0x1e077] &= 7;
    prg[0x1e07b] &= 7;
    prg[0x1e084] &= 7;
    prg[0x1e09b] &= 7;
    prg[0x1e0b9] &= 7;
}
export function deterministic(rom, flags) {
    addZombieWarp(rom);
    consolidateItemGrants(rom);
    addMezameTrigger(rom);
    normalizeSwords(rom, flags);
    fixCoinSprites(rom);
    makeBraceletsProgressive(rom);
    addTowerExit(rom);
    reversibleSwanGate(rom);
    adjustGoaFortressTriggers(rom);
    preventNpcDespawns(rom, flags);
    leafElderInSabreHeals(rom);
    if (flags.requireHealedDolphinToRide())
        requireHealedDolphin(rom);
    if (flags.saharaRabbitsRequireTelepathy())
        requireTelepathyForDeo(rom);
    adjustItemNames(rom, flags);
    alarmFluteIsKeyItem(rom, flags);
    brokahanaWantsMado1(rom);
    if (flags.teleportOnThunderSword()) {
        teleportOnThunderSword(rom);
        rom.townWarp.thunderSwordWarp = [rom.locations.Shyron.id, 0x41];
    }
    else {
        noTeleportOnThunderSword(rom);
    }
    undergroundChannelLandBridge(rom);
    if (flags.fogLampNotRequired())
        fogLampNotRequired(rom);
    if (flags.addEastCave()) {
        eastCave(rom, flags);
        if (flags.connectGoaToLeaf()) {
            connectGoaToLeaf(rom);
        }
    }
    else if (flags.connectLimeTreeToLeaf()) {
        connectLimeTreeToLeaf(rom);
    }
    evilSpiritIslandRequiresDolphin(rom);
    closeCaveEntrances(rom, flags);
    simplifyInvisibleChests(rom);
    addCordelWestTriggers(rom, flags);
    if (flags.disableRabbitSkip())
        fixRabbitSkip(rom);
    fixReverseWalls(rom);
    if (flags.chargeShotsOnly())
        disableStabs(rom);
    if (flags.orbsOptional())
        orbsOptional(rom);
    fixMimics(rom);
}
function consolidateItemGrants(rom) {
    rom.items.GlowingLamp.itemUseData[0].message.action = 0x0b;
}
function addMezameTrigger(rom) {
    const trigger = rom.nextFreeTrigger();
    trigger.used = true;
    trigger.conditions = [~0x2f0];
    trigger.message = MessageId.of({ action: 4 });
    trigger.flags = [0x2f0];
    const mezame = rom.locations.MezameShrine;
    mezame.spawns.push(Spawn.of({ tile: 0x88, type: 2, id: trigger.id }));
}
function normalizeSwords(rom, flags) {
    rom.objects[0x10].atk = 3;
    rom.objects[0x11].atk = 6;
    rom.objects[0x12].atk = 8;
    rom.objects[0x18].atk = 3;
    rom.objects[0x13].atk = 5;
    rom.objects[0x19].atk = 5;
    rom.objects[0x17].atk = 7;
    rom.objects[0x1a].atk = 7;
    rom.objects[0x14].atk = 3;
    rom.objects[0x15].atk = 6;
    rom.objects[0x16].atk = 8;
    rom.objects[0x1c].atk = 3;
    rom.objects[0x1e].atk = 5;
    rom.objects[0x1b].atk = 7;
    rom.objects[0x1f].atk = 7;
    if (flags.slowDownTornado()) {
        const tornado = rom.objects[0x12];
        tornado.speed = 0x07;
        tornado.data[0x0c] = 0x60;
    }
}
function fixCoinSprites(rom) {
    for (const page of [0x60, 0x64, 0x65, 0x66, 0x67, 0x68,
        0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6f]) {
        for (const pat of [0, 1, 2]) {
            rom.patterns[page << 6 | pat].pixels = rom.patterns[0x5e << 6 | pat].pixels;
        }
    }
    rom.objects[0x0c].metasprite = 0xa9;
}
function fixReverseWalls(rom) {
    for (const t in [0x04, 0x05, 0x08, 0x09]) {
        rom.tileEffects[0xbc - 0xb3].effects[t] = 0x18;
        rom.tileEffects[0xb5 - 0xb3].effects[t] = 0x18;
    }
}
function undergroundChannelLandBridge(rom) {
    const { tiles } = rom.screens[0xa1];
    tiles[0x28] = 0x9f;
    tiles[0x37] = 0x23;
    tiles[0x38] = 0x23;
    tiles[0x39] = 0x21;
    tiles[0x47] = 0x8d;
    tiles[0x48] = 0x8f;
    tiles[0x56] = 0x99;
    tiles[0x57] = 0x9a;
    tiles[0x58] = 0x8c;
}
function fogLampNotRequired(rom) {
    rom.items[0x36].itemUseData[0].want = ~0;
    rom.npcs[0x68].data[0] = 0x67;
    rom.npcs[0x68].localDialogs.get(-1)[0].message.action = 0x0a;
    rom.npcs[0x68].localDialogs.get(-1)[0].flags = [];
    rom.npcs[0x68].spawnConditions.set(0x61, [0x21, ~0x0c1]);
    rom.npcs[0x64].spawnConditions.set(0xd6, [0x235]);
    rom.itemGets[0x64].flags = [];
    rom.itemGets[0x67].copyFrom(rom.itemGets[0x64]);
    rom.itemGets[0x67].flags = [0x0c1];
}
function fixMimics(rom) {
    let mimic = 0x70;
    for (const loc of rom.locations) {
        for (const s of loc.spawns) {
            if (!s.isChest())
                continue;
            s.timed = false;
            if (s.id >= 0x70)
                s.id = mimic++;
        }
    }
}
function adjustGoaFortressTriggers(rom) {
    const l = rom.locations;
    l.GoaFortress_Kelbesque.spawns[0].x -= 16;
    l.GoaFortress_Zebu.spawns.splice(1, 1);
    l.GoaFortress_Tornel.spawns.splice(2, 1);
    l.GoaFortress_Asina.spawns.splice(2, 1);
    l.GoaFortress_Kensu.spawns.splice(3, 1);
    l.GoaFortress_Kensu.spawns.splice(1, 1);
}
function alarmFluteIsKeyItem(rom, flags) {
    const { WaterfallCave4 } = rom.locations;
    rom.itemGets[0x31].inventoryRowStart = 0x20;
    rom.items[0x31].unique = true;
    rom.items[0x31].basePrice = 0;
    if (flags.zebuStudentGivesItem()) {
        rom.npcs[0x14].data[1] = 0x31;
    }
    else {
        rom.npcs[0x14].data[1] = 0xff;
    }
    const replacements = [
        [0x21, 0.72],
        [0x1f, 0.9],
    ];
    let j = 0;
    for (const shop of rom.shops) {
        if (shop.type !== ShopType.TOOL)
            continue;
        for (let i = 0, len = shop.contents.length; i < len; i++) {
            if (shop.contents[i] !== 0x31)
                continue;
            const [item, priceRatio] = replacements[(j++) % replacements.length];
            shop.contents[i] = item;
            if (rom.shopDataTablesAddress) {
                shop.prices[i] = Math.round(shop.prices[i] * priceRatio);
            }
        }
    }
    rom.itemGets[0x5b].itemId = 0x1d;
    WaterfallCave4.spawn(0x19).id = 0x10;
}
function brokahanaWantsMado1(rom) {
    const brokahana = rom.npcs[0x54];
    const dialog = assert(brokahana.localDialogs.get(-1))[0];
    if (dialog.condition !== ~0x024) {
        throw new Error(`Bad brokahana condition: ${dialog.condition}`);
    }
    dialog.condition = ~0x067;
}
function requireHealedDolphin(rom) {
    rom.npcs[0x64].spawnConditions.set(0xd6, [0x236, 0x025]);
    const daughterDialog = rom.npcs[0x7b].localDialogs.get(-1);
    daughterDialog.unshift(daughterDialog[0].clone());
    daughterDialog[0].condition = ~0x025;
    daughterDialog[1].condition = ~0x236;
}
function requireTelepathyForDeo(rom) {
    rom.npcs[0x59].globalDialogs.push(GlobalDialog.of(~0x243, [0x1a, 0x12]));
    rom.npcs[0x5a].globalDialogs.push(GlobalDialog.of(~0x243, [0x1a, 0x13]));
}
function teleportOnThunderSword(rom) {
    rom.itemGets[0x03].flags.push(0x2fd);
    for (const i of [0, 1, 3]) {
        for (const loc of [0xf2, 0xf4]) {
            rom.npcs[0x62].localDialogs.get(loc)[i].message.action = 0x1f;
        }
    }
}
function noTeleportOnThunderSword(rom) {
    rom.itemGets[0x03].acquisitionAction.action = 0x16;
}
function adjustItemNames(rom, flags) {
    if (flags.leatherBootsGiveSpeed()) {
        const leatherBoots = rom.items[0x2f];
        leatherBoots.menuName = 'Speed Boots';
        leatherBoots.messageName = 'Speed Boots';
        if (flags.changeGasMaskToHazmatSuit()) {
            const gasMask = rom.items[0x29];
            gasMask.menuName = 'Hazmat Suit';
            gasMask.messageName = 'Hazmat Suit';
        }
    }
    for (let i = 0x05; i < 0x0c; i += 2) {
        rom.items[i].menuName = rom.items[i].menuName.replace('Ball', 'Orb');
        rom.items[i].messageName = rom.items[i].messageName.replace('Ball', 'Orb');
    }
}
function makeBraceletsProgressive(rom) {
    const tornel = rom.npcs[0x5f];
    const vanilla = tornel.localDialogs.get(0x21);
    const patched = [
        vanilla[0],
        vanilla[2],
        vanilla[2].clone(),
        vanilla[1],
    ];
    patched[1].condition = ~0x206;
    patched[2].condition = ~0x205;
    patched[3].condition = ~0;
    tornel.localDialogs.set(0x21, patched);
}
function simplifyInvisibleChests(rom) {
    for (const location of [rom.locations.CordelPlainEast,
        rom.locations.UndergroundChannel,
        rom.locations.KirisaMeadow]) {
        for (const spawn of location.spawns) {
            if (spawn.isChest())
                spawn.data[2] |= 0x20;
        }
    }
}
function addCordelWestTriggers(rom, flags) {
    const { CordelPlainEast, CordelPlainWest } = rom.locations;
    for (const spawn of CordelPlainEast.spawns) {
        if (spawn.isChest() || (flags.disableTeleportSkip() && spawn.isTrigger())) {
            CordelPlainWest.spawns.push(spawn.clone());
        }
    }
}
function fixRabbitSkip(rom) {
    for (const spawn of rom.locations.MtSabreNorth_Main.spawns) {
        if (spawn.isTrigger() && spawn.id === 0x86) {
            if (spawn.x === 0x740) {
                spawn.x += 16;
                spawn.y += 16;
            }
        }
    }
}
function addTowerExit(rom) {
    const { TowerEntrance, Crypt_Teleporter } = rom.locations;
    const entrance = Crypt_Teleporter.entrances.length;
    const dest = Crypt_Teleporter.id;
    Crypt_Teleporter.entrances.push(Entrance.of({ tile: 0x68 }));
    TowerEntrance.exits.push(Exit.of({ tile: 0x57, dest, entrance }));
    TowerEntrance.exits.push(Exit.of({ tile: 0x58, dest, entrance }));
}
function connectLimeTreeToLeaf(rom) {
    const { ValleyOfWind, LimeTreeValley } = rom.locations;
    ValleyOfWind.screens[5][4] = 0x10;
    LimeTreeValley.screens[1][0] = 0x1a;
    LimeTreeValley.screens[2][0] = 0x0c;
    const windEntrance = ValleyOfWind.entrances.push(Entrance.of({ x: 0x4ef, y: 0x578 })) - 1;
    const limeEntrance = LimeTreeValley.entrances.push(Entrance.of({ x: 0x010, y: 0x1c0 })) - 1;
    ValleyOfWind.exits.push(Exit.of({ x: 0x4f0, y: 0x560, dest: 0x42, entrance: limeEntrance }), Exit.of({ x: 0x4f0, y: 0x570, dest: 0x42, entrance: limeEntrance }));
    LimeTreeValley.exits.push(Exit.of({ x: 0x000, y: 0x1b0, dest: 0x03, entrance: windEntrance }), Exit.of({ x: 0x000, y: 0x1c0, dest: 0x03, entrance: windEntrance }));
}
function closeCaveEntrances(rom, flags) {
    rom.locations.ValleyOfWind.entrances[1].y += 16;
    rom.swapMetatiles([0x90], [0x07, [0x01, 0x00], ~0xc1], [0x0e, [0x02, 0x00], ~0xc1], [0x20, [0x03, 0x0a], ~0xd7], [0x21, [0x04, 0x0a], ~0xd7]);
    rom.swapMetatiles([0x94, 0x9c], [0x68, [0x01, 0x00], ~0xc1], [0x83, [0x02, 0x00], ~0xc1], [0x88, [0x03, 0x0a], ~0xd7], [0x89, [0x04, 0x0a], ~0xd7]);
    rom.screens[0x0a].tiles[0x38] = 0x01;
    rom.screens[0x0a].tiles[0x39] = 0x02;
    rom.screens[0x0a].tiles[0x48] = 0x03;
    rom.screens[0x0a].tiles[0x49] = 0x04;
    rom.screens[0x15].tiles[0x79] = 0x01;
    rom.screens[0x15].tiles[0x7a] = 0x02;
    rom.screens[0x15].tiles[0x89] = 0x03;
    rom.screens[0x15].tiles[0x8a] = 0x04;
    rom.screens[0x19].tiles[0x48] = 0x01;
    rom.screens[0x19].tiles[0x49] = 0x02;
    rom.screens[0x19].tiles[0x58] = 0x03;
    rom.screens[0x19].tiles[0x59] = 0x04;
    rom.screens[0x3e].tiles[0x56] = 0x01;
    rom.screens[0x3e].tiles[0x57] = 0x02;
    rom.screens[0x3e].tiles[0x66] = 0x03;
    rom.screens[0x3e].tiles[0x67] = 0x04;
    const { CordelPlainWest, CordelPlainEast, Desert2, GoaValley, LimeTreeValley, KirisaMeadow, SaharaOutsideCave, ValleyOfWind, WaterfallValleyNorth, WaterfallValleySouth, } = rom.locations;
    const flagsToClear = [
        [ValleyOfWind, 0x30],
        [CordelPlainWest, 0x30],
        [CordelPlainEast, 0x30],
        [WaterfallValleyNorth, 0x00],
        [WaterfallValleyNorth, 0x14],
        [WaterfallValleySouth, 0x74],
        [KirisaMeadow, 0x10],
        [SaharaOutsideCave, 0x00],
        [Desert2, 0x41],
    ];
    if (flags.addEastCave() && flags.connectLimeTreeToLeaf()) {
        flagsToClear.push([LimeTreeValley, 0x10]);
    }
    if (flags.connectGoaToLeaf()) {
        flagsToClear.push([GoaValley, 0x01]);
    }
    for (const [loc, yx] of flagsToClear) {
        loc.flags.push(Flag.of({ yx, flag: 0x2f0 }));
    }
    function replaceFlag(loc, yx, flag) {
        for (const f of loc.flags) {
            if (f.yx === yx) {
                f.flag = flag;
                return;
            }
        }
        throw new Error(`Could not find flag to replace at ${loc}:${yx}`);
    }
    ;
    if (flags.paralysisRequiresPrisonKey()) {
        const windmillFlag = 0x2ee;
        replaceFlag(CordelPlainWest, 0x30, windmillFlag);
        replaceFlag(CordelPlainEast, 0x30, windmillFlag);
        replaceFlag(WaterfallValleyNorth, 0x00, 0x2d8);
        const explosion = Spawn.of({ y: 0x060, x: 0x060, type: 4, id: 0x2c });
        const keyTrigger = Spawn.of({ y: 0x070, x: 0x070, type: 2, id: 0xad });
        WaterfallValleyNorth.spawns.splice(1, 0, explosion);
        WaterfallValleyNorth.spawns.push(keyTrigger);
    }
}
function eastCave(rom, flags) {
    const { ValleyOfWind, LimeTreeValley, SealedCave1 } = rom.locations;
    const loc1 = rom.locations.allocate(rom.locations.EastCave1);
    const loc2 = rom.locations.allocate(rom.locations.EastCave2);
    const loc3 = rom.locations.EastCave3;
    loc1.screens = [[0x9c, 0x84, 0x80, 0x83, 0x9c],
        [0x80, 0x81, 0x83, 0x86, 0x80],
        [0x83, 0x88, 0x89, 0x80, 0x80],
        [0x81, 0x8c, 0x85, 0x82, 0x84],
        [0x9e, 0x85, 0x9c, 0x98, 0x86]];
    loc2.screens = [[0x9c, 0x84, 0x9b, 0x80, 0x9b],
        [0x80, 0x81, 0x81, 0x80, 0x81],
        [0x80, 0x87, 0x8b, 0x8a, 0x86],
        [0x80, 0x8c, 0x80, 0x85, 0x84],
        [0x9c, 0x86, 0x80, 0x80, 0x9a]];
    for (const l of [loc1, loc2, loc3]) {
        l.bgm = 0x17;
        l.entrances = [];
        l.exits = [];
        l.pits = [];
        l.spawns = [];
        l.flags = [];
        l.height = l.screens.length;
        l.width = l.screens[0].length;
        l.extended = 0;
        l.tilePalettes = [0x1a, 0x1b, 0x05];
        l.tileset = 0x88;
        l.tileEffects = 0xb5;
        l.tilePatterns = [0x14, 0x02];
        l.spritePatterns = [...SealedCave1.spritePatterns];
        l.spritePalettes = [...SealedCave1.spritePalettes];
    }
    ValleyOfWind.writeScreens2d(0x23, [
        [0x11, 0x0d],
        [0x09, 0xc2]
    ]);
    rom.tileEffects[0].effects[0xc0] = 0;
    loc1.connect(0x43, loc2, 0x44);
    loc1.connect(0x40, ValleyOfWind, 0x34);
    if (flags.connectLimeTreeToLeaf()) {
        LimeTreeValley.resizeScreens(0, 1, 0, 0);
        LimeTreeValley.writeScreens2d(0x00, [
            [0x0c, 0x11],
            [0x15, 0x36],
            [0x0e, 0x0f]
        ]);
        loc1.screens[0][4] = 0x97;
        loc1.connect(0x04, LimeTreeValley, 0x10);
    }
    loc1.spawns.push(Spawn.of({ screen: 0x21, tile: 0x87, timed: true, id: 0x2 }), Spawn.of({ screen: 0x12, tile: 0x88, timed: false, id: 0x2 }), Spawn.of({ screen: 0x13, tile: 0x89, timed: true, id: 0x2 }), Spawn.of({ screen: 0x32, tile: 0x68, timed: false, id: 0x2 }), Spawn.of({ screen: 0x41, tile: 0x88, timed: true, id: 0x2 }), Spawn.of({ screen: 0x33, tile: 0x98, timed: true, id: 0x2 }), Spawn.of({ screen: 0x03, tile: 0x88, timed: true, id: 0x2 }));
    loc2.spawns.push(Spawn.of({ screen: 0x01, tile: 0x88, timed: true, id: 0x2 }), Spawn.of({ screen: 0x11, tile: 0x48, timed: false, id: 0x2 }), Spawn.of({ screen: 0x12, tile: 0x77, timed: true, id: 0x2 }), Spawn.of({ screen: 0x14, tile: 0x28, timed: false, id: 0x2 }), Spawn.of({ screen: 0x23, tile: 0x85, timed: true, id: 0x2 }), Spawn.of({ screen: 0x31, tile: 0x88, timed: true, id: 0x2 }), Spawn.of({ screen: 0x33, tile: 0x8a, timed: false, id: 0x2 }), Spawn.of({ screen: 0x34, tile: 0x98, timed: true, id: 0x2 }), Spawn.of({ screen: 0x41, tile: 0x82, timed: true, id: 0x2 }));
    if (!flags.zebuStudentGivesItem()) {
        loc2.spawns.push(Spawn.of({ y: 0x110, x: 0x478, type: 2, id: 0x31 }));
    }
    if (flags.addExtraChecksToEastCave()) {
        loc2.spawns.push(Spawn.of({ y: 0x110, x: 0x478, type: 2, id: 0x59 }));
        loc2.spawns.push(Spawn.of({ y: 0x070, x: 0x108, type: 2, id: 0x70 }));
    }
}
;
function connectGoaToLeaf(rom) {
    const { GoaValley, EastCave2, EastCave3 } = rom.locations;
    GoaValley.writeScreens2d(0x00, [
        [0x0c, 0xc1, 0x0d],
        [0x0e, 0x37, 0x35]
    ]);
    rom.locations.allocate(EastCave3);
    EastCave3.screens = [[0x9a],
        [0x8f],
        [0x9e]];
    EastCave3.height = 3;
    EastCave3.width = 1;
    EastCave3.spawns.push(Spawn.from([0x18, 0x07, 0x23, 0x00]));
    EastCave3.flags.push(Flag.of({ screen: 0x10, flag: rom.flags.allocMapFlag() }));
    EastCave2.screens[4][0] = 0x99;
    EastCave2.connect(0x40, EastCave3, ~0x00);
    EastCave3.connect(0x20, GoaValley, 0x01);
}
function addZombieWarp(rom) {
    for (let i = 0x2f5; i < 0x2fc; i++) {
        rom.moveFlag(i, i - 1);
    }
    const message = rom.messages.parts[0x21][0];
    message.text = [
        ' {1a:Leaf}      {16:Brynmaer} {1d:Oak} ',
        '{0c:Nadare}\'s  {1e:Portoa}   {14:Amazones} ',
        '{19:Joel}      Zombie   {20:Swan} ',
        '{23:Shyron}    {18:Goa}      {21:Sahara}',
    ].join('\n');
    const trigger = rom.nextFreeTrigger();
    trigger.used = true;
    trigger.conditions = [];
    trigger.message = MessageId.of({});
    trigger.flags = [0x2fb];
    for (const spawn of rom.locations.ZombieTown.spawns) {
        if (spawn.isTrigger() && spawn.id === 0x8a) {
            spawn.id = trigger.id;
        }
    }
    rom.townWarp.locations.splice(7, 0, rom.locations.ZombieTown.id);
    if (rom.townWarp.locations.pop() !== 0xff)
        throw new Error('unexpected');
}
function evilSpiritIslandRequiresDolphin(rom) {
    rom.trigger(0x8a).conditions = [~0x0ee];
    rom.messages.parts[0x1d][0x10].text = `The cave entrance appears
to be underwater. You'll
need to swim.`;
}
function reversibleSwanGate(rom) {
    rom.locations[0x73].spawns.push(Spawn.of({ xt: 0x0a, yt: 0x02, type: 1, id: 0x2d }), Spawn.of({ xt: 0x0b, yt: 0x02, type: 1, id: 0x2d }), Spawn.of({ xt: 0x0e, yt: 0x0a, type: 2, id: 0xb3 }));
    rom.npcs[0x2d].localDialogs.get(0x73)[0].flags.push(0x10d);
    rom.trigger(0xb3).conditions.push(0x10d);
}
function leafElderInSabreHeals(rom) {
    const leafElder = rom.npcs[0x0d];
    const summitDialog = leafElder.localDialogs.get(0x35)[0];
    summitDialog.message.action = 0x17;
}
function preventNpcDespawns(rom, flags) {
    function remove(arr, elem) {
        const index = arr.indexOf(elem);
        if (index < 0)
            throw new Error(`Could not find element ${elem} in ${arr}`);
        arr.splice(index, 1);
    }
    function removeIf(arr, pred) {
        const index = arr.findIndex(pred);
        if (index < 0)
            throw new Error(`Could not find element in ${arr}`);
        arr.splice(index, 1);
    }
    function dialog(id, loc = -1) {
        const result = rom.npcs[id].localDialogs.get(loc);
        if (!result)
            throw new Error(`Missing dialog $${hex(id)} at $${hex(loc)}`);
        return result;
    }
    function spawns(id, loc) {
        const result = rom.npcs[id].spawnConditions.get(loc);
        if (!result)
            throw new Error(`Missing spawn condition $${hex(id)} at $${hex(loc)}`);
        return result;
    }
    rom.npcs[0x74].link(0x7e);
    rom.npcs[0x74].used = true;
    rom.npcs[0x74].data = [...rom.npcs[0x7e].data];
    rom.locations.Swan_DanceHall.spawns.find(s => s.isNpc() && s.id === 0x7e).id = 0x74;
    rom.items.LovePendant.itemUseData[0].want = 0x174;
    rom.npcs[0x88].linkDialog(0x16);
    rom.npcs[0x7e].data[0] = 0x39;
    rom.npcs[0x82].used = true;
    rom.npcs[0x82].link(0x16);
    rom.npcs[0x82].data = [...rom.npcs[0x16].data];
    rom.locations.Brynmaer.spawns.find(s => s.isNpc() && s.id === 0x16).id = 0x82;
    rom.items.StatueOfOnyx.itemUseData[0].want = 0x182;
    dialog(0x13)[2].condition = 0x047;
    dialog(0x13)[2].flags = [0x0a9];
    dialog(0x13)[3].flags = [0x0a9];
    spawns(0x14, 0x0e)[1] = ~0x088;
    remove(spawns(0x16, 0x57), ~0x051);
    remove(spawns(0x88, 0x57), ~0x051);
    function reverseDialog(ds) {
        ds.reverse();
        for (let i = 0; i < ds.length; i++) {
            const next = ds[i + 1];
            ds[i].condition = next ? ~next.condition : ~0;
        }
    }
    ;
    const oakElderDialog = dialog(0x1d);
    oakElderDialog[0].message.action = 0x03;
    oakElderDialog[1].message.action = 0x03;
    oakElderDialog[2].message.action = 0x03;
    oakElderDialog[3].message.action = 0x03;
    const oakMotherDialog = dialog(0x1e);
    (() => {
        const [killedInsect, gotItem, getItem, findChild] = oakMotherDialog;
        findChild.condition = ~0x045;
        gotItem.condition = ~0;
        rom.npcs[0x1e].localDialogs.set(-1, [findChild, getItem, killedInsect, gotItem]);
    })();
    for (const i of [0x20, 0x21, 0x22, 0x7c, 0x7d]) {
        reverseDialog(dialog(i));
    }
    const oakChildDialog = dialog(0x1f);
    oakChildDialog.unshift(...oakChildDialog.splice(1, 1));
    rom.npcs[0x33].spawnConditions.set(0xdf, [~0x020, ~0x01b]);
    dialog(0x34)[1].condition = 0x01b;
    dialog(0x38)[3].condition = 0x202;
    dialog(0x38)[3].message.action = 0x03;
    dialog(0x38)[4].flags.push(0x09c);
    spawns(0x38, 0xdf)[1] = ~0x01b;
    spawns(0x38, 0xe1)[0] = 0x01b;
    dialog(0x38)[1].condition = 0x01b;
    spawns(0x39, 0xd8)[1] = ~0x01b;
    rom.npcs[0x44].spawnConditions.set(0xe9, [~0x08d]);
    rom.npcs[0x44].spawnConditions.set(0xe4, [0x08d]);
    rom.npcs[0x5e].localDialogs.set(0x10, [
        LocalDialog.of(~0x03a, [0x00, 0x1a], [0x03a]),
        LocalDialog.of(0x00d, [0x00, 0x1d]),
        LocalDialog.of(0x038, [0x00, 0x1c]),
        LocalDialog.of(0x039, [0x00, 0x1d]),
        LocalDialog.of(0x00a, [0x00, 0x1b, 0x03]),
        LocalDialog.of(~0x000, [0x00, 0x1d]),
    ]);
    remove(spawns(0x5e, 0x10), ~0x051);
    rom.npcs[0x5f].spawnConditions.delete(0x21);
    rom.npcs[0x60].spawnConditions.delete(0x1e);
    const asina = rom.npcs[0x62];
    asina.data[1] = 0x28;
    dialog(asina.id, 0xe1)[0].message.action = 0x11;
    dialog(asina.id, 0xe1)[2].message.action = 0x11;
    remove(spawns(asina.id, 0xe1), ~0x08f);
    rom.npcs[0x68].spawnConditions.set(0x61, [~0x09b, 0x021]);
    dialog(0x68)[0].message.action = 0x02;
    rom.npcs[0x6e].spawnConditions.get(0xf2).push(~0x027);
    rom.trigger(0x82).conditions.push(~0x027);
    dialog(0xc3)[0].condition = 0x202;
    rom.npcs[0xc4].spawnConditions.delete(0xf2);
    rom.npcs[0xcb].spawnConditions.set(0xa6, [~0x28d]);
    const zebuShyron = rom.npcs[0x5e].localDialogs.get(0xf2);
    zebuShyron.unshift(...zebuShyron.splice(1, 1));
    rom.trigger(0x80).conditions = [
        ~0x027,
        0x03b,
        0x2fd,
    ];
    rom.trigger(0x81).conditions = [];
    if (flags.barrierRequiresCalmSea()) {
        rom.trigger(0x84).conditions.push(0x283);
    }
    rom.trigger(0x8c).conditions.push(0x03a);
    rom.trigger(0x8d).used = false;
    for (const spawn of rom.locations.MtSabreNorth_SummitCave.spawns) {
        if (spawn.isTrigger() && spawn.id === 0x8d)
            spawn.id = 0xb2;
    }
    removeIf(rom.locations.WaterfallValleyNorth.spawns, spawn => spawn.isTrigger() && spawn.id === 0x8d);
    rom.trigger(0xb2).conditions.push(0x102);
    rom.trigger(0xb2).flags.push(~0x084, ~0x085, 0x00d);
    rom.trigger(0x8c).conditions.push(~0x102);
    rom.trigger(0x86).conditions.push(~0x102);
    rom.prg[0x1e0a3] = 0xc0;
    rom.prg[0x1e0a4] = 0x00;
    rom.trigger(0xba).conditions[0] = ~0x244;
    rom.trigger(0xbb).conditions[1] = ~0x01b;
    for (const npc of rom.npcs) {
        for (const d of npc.allDialogs()) {
            if (d.condition === 0x00e)
                d.condition = 0x243;
            if (d.condition === ~0x00e)
                d.condition = ~0x243;
        }
    }
}
function disableStabs(rom) {
    for (const o of [0x08, 0x09, 0x27]) {
        rom.objects[o].collisionPlane = 0;
    }
    rom.npcs[0x54].data[0] = 0x20;
}
function orbsOptional(rom) {
    for (const obj of [0x10, 0x14, 0x18, 0x1d]) {
        rom.objects[obj].terrainSusceptibility &= ~0x04;
        rom.objects[obj].level = 2;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUUzQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV0QixlQUFlLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTVCLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVwQix3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUU5QixZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEIseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0Isa0JBQWtCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9CLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNCLElBQUksS0FBSyxDQUFDLDBCQUEwQixFQUFFO1FBQUUsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEUsSUFBSSxLQUFLLENBQUMsNkJBQTZCLEVBQUU7UUFBRSxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV2RSxlQUFlLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRzVCLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixJQUFJLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxFQUFFO1FBQ2xDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTVCLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDakU7U0FBTTtRQUNMLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQy9CO0lBRUQsNEJBQTRCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsSUFBSSxLQUFLLENBQUMsa0JBQWtCLEVBQUU7UUFBRSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV4RCxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRTtRQUN2QixRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JCLElBQUksS0FBSyxDQUFDLGdCQUFnQixFQUFFLEVBQUU7WUFDNUIsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdkI7S0FDRjtTQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLEVBQUU7UUFDeEMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDNUI7SUFDRCwrQkFBK0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0IsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0IscUJBQXFCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLElBQUksS0FBSyxDQUFDLGlCQUFpQixFQUFFO1FBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWxELGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUU7UUFBRSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0MsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO1FBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTVDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQixDQUFDO0FBSUQsU0FBUyxxQkFBcUIsQ0FBQyxHQUFRO0lBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztBQUM3RCxDQUFDO0FBR0QsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFRO0lBQ2hDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUN0QyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNwQixPQUFPLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QixPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUM1QyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUM7SUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBUSxFQUFFLEtBQWM7SUFpQi9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMs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QUM7QUFDckIsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBUTtJQUdsQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFekMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFFeEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHbEQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQzlCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNoRCxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBT3JDLENBQUM7QUFPRCxTQUFT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SyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVEsRUFBRSxLQUFjO0lBRWxELEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBR2hELEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDTixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDWixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFHL0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXJDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJ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RSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRWhELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVoRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUNsQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztRQUNiLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2IsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNkLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2IsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDakIsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUMsY0FBYyxHQUFHLENBQUMsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFxQixDQUFDO1FBQ3ZFLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQXFCLENBQUM7S0FDeEU7SUFJRCxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRTtRQUNoQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7UUFDWixDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7S0FBQyxDQUFDLENBQUM7SUFDakIsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBTXJDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFdkMsSUFBSSxLQUFLLENBQUMscUJBQXFCLEVBQUUsRUFBRTtRQUVqQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLGNBQWMsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFO1lBQ2xDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztZQUNaLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztZQUNaLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztTQUFDLENBQUMsQ0FBQztRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDMUM7SUFHRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQzNELENBQUM7SUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxFQUFFO1FBRWpDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO0lBQ0QsSUFBSSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsRUFBRTtRQUVwQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztRQUVwRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFD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LENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3JGLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBR2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBR2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUs5QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFRLENBQUM7SUFDdEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBRSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDL0UsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFVbkQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FB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Q0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3JDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFLbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBRWhELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUd0QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFdkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFVMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFHbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFLbkQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO0lBQzFELFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBSS9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHO1FBQzdCLENBQUMsS0FBSztRQUNMLEtBQUs7UUFDTCxLQUFLO0tBRVAsQ0FBQztJQUdGLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUVsQyxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxF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QXFCLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFaEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBlcmZvcm0gaW5pdGlhbCBjbGVhbnVwL3NldHVwIG9mIHRoZSBST00uXG5cbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIExvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuLi9yb20vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7R2xvYmFsRGlhbG9nLCBMb2NhbERpYWxvZ30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHthc3NlcnR9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHByZzogVWludDhBcnJheSk6IHZvaWQge1xuICAvLyBSZW1vdmUgdW51c2VkIGl0ZW0vdHJpZ2dlciBhY3Rpb25zXG4gIHByZ1sweDFlMDZiXSAmPSA3OyAvLyBtZWRpY2FsIGhlcmIgbm9ybWFsIHVzYWdlID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNmZdICY9IDc7IC8vIG1hZ2ljIHJpbmcgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDczXSAmPSA3OyAvLyBmcnVpdCBvZiBsaW1lIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3N10gJj0gNzsgLy8gYW50aWRvdGUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDdiXSAmPSA3OyAvLyBvcGVsIHN0YXR1ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwODRdICY9IDc7IC8vIHdhcnAgYm9vdHMgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDQgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDliXSAmPSA3OyAvLyB3aW5kbWlsbCBrZXkgaXRlbXVzZVsxXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMGI5XSAmPSA3OyAvLyBnbG93aW5nIGxhbXAgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuXG4gIC8vIE5PVEU6IHRoaXMgaXMgZG9uZSB2ZXJ5IGVhcmx5LCBtYWtlIHN1cmUgYW55IHJlZmVyZW5jZXMgdG8gd2FycFxuICAvLyBwb2ludCBmbGFncyBhcmUgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBuZXcgb25lcyFcbiAgYWRkWm9tYmllV2FycChyb20pO1xuICBjb25zb2xpZGF0ZUl0ZW1HcmFudHMocm9tKTtcblxuICBhZGRNZXphbWVUcmlnZ2VyKHJvbSk7XG5cbiAgbm9ybWFsaXplU3dvcmRzKHJvbSwgZmxhZ3MpO1xuXG4gIGZpeENvaW5TcHJpdGVzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIHJldmVyc2libGVTd2FuR2F0ZShyb20pO1xuICBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbSk7XG4gIHByZXZlbnROcGNEZXNwYXducyhyb20sIGZsYWdzKTtcbiAgbGVhZkVsZGVySW5TYWJyZUhlYWxzKHJvbSk7XG4gIGlmIChmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpKSByZXF1aXJlSGVhbGVkRG9scGhpbihyb20pO1xuICBpZiAoZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSkgcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb20pO1xuXG4gIGFkanVzdEl0ZW1OYW1lcyhyb20sIGZsYWdzKTtcblxuICAvLyBUT0RPIC0gY29uc2lkZXIgbWFraW5nIGEgVHJhbnNmb3JtYXRpb24gaW50ZXJmYWNlLCB3aXRoIG9yZGVyaW5nIGNoZWNrc1xuICBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbSwgZmxhZ3MpOyAvLyBOT1RFOiBwcmUtc2h1ZmZsZVxuICBicm9rYWhhbmFXYW50c01hZG8xKHJvbSk7XG4gIGlmIChmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gICAgLy8gbm90IFNoeXJvbl9UZW1wbGUgc2luY2Ugbm8tdGh1bmRlci1zd29yZC1mb3ItbWFzc2FjcmVcbiAgICByb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycCA9IFtyb20ubG9jYXRpb25zLlNoeXJvbi5pZCwgMHg0MV07XG4gIH0gZWxzZSB7XG4gICAgbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gIH1cblxuICB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbSk7XG4gIGlmIChmbGFncy5mb2dMYW1wTm90UmVxdWlyZWQoKSkgZm9nTGFtcE5vdFJlcXVpcmVkKHJvbSk7XG5cbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkpIHtcbiAgICBlYXN0Q2F2ZShyb20sIGZsYWdzKTtcbiAgICBpZiAoZmxhZ3MuY29ubmVjdEdvYVRvTGVhZigpKSB7XG4gICAgICBjb25uZWN0R29hVG9MZWFmKHJvbSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbSk7XG4gIH1cbiAgZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb20pO1xuICBjbG9zZUNhdmVFbnRyYW5jZXMocm9tLCBmbGFncyk7XG4gIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbSk7XG4gIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVSYWJiaXRTa2lwKCkpIGZpeFJhYmJpdFNraXAocm9tKTtcblxuICBmaXhSZXZlcnNlV2FsbHMocm9tKTtcbiAgaWYgKGZsYWdzLmNoYXJnZVNob3RzT25seSgpKSBkaXNhYmxlU3RhYnMocm9tKTtcbiAgaWYgKGZsYWdzLm9yYnNPcHRpb25hbCgpKSBvcmJzT3B0aW9uYWwocm9tKTtcblxuICBmaXhNaW1pY3Mocm9tKTsgLy8gTk9URTogYWZ0ZXIgYWxsIG1pbWljc1xufVxuXG4vLyBVcGRhdGVzIGEgZmV3IGl0ZW11c2UgYW5kIHRyaWdnZXIgYWN0aW9ucyBpbiBsaWdodCBvZiBjb25zb2xpZGF0aW9uIHdlXG4vLyBhcm91bmQgaXRlbSBncmFudGluZy5cbmZ1bmN0aW9uIGNvbnNvbGlkYXRlSXRlbUdyYW50cyhyb206IFJvbSk6IHZvaWQge1xuICByb20uaXRlbXMuR2xvd2luZ0xhbXAuaXRlbVVzZURhdGFbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDBiO1xufVxuXG4vLyBBZGRzIGEgdHJpZ2dlciBhY3Rpb24gdG8gbWV6YW1lLiAgVXNlIDg3IGxlZnRvdmVyIGZyb20gcmVzY3VpbmcgemVidS5cbmZ1bmN0aW9uIGFkZE1lemFtZVRyaWdnZXIocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW34weDJmMF07XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7YWN0aW9uOiA0fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZjBdO1xuICBjb25zdCBtZXphbWUgPSByb20ubG9jYXRpb25zLk1lemFtZVNocmluZTtcbiAgbWV6YW1lLnNwYXducy5wdXNoKFNwYXduLm9mKHt0aWxlOiAweDg4LCB0eXBlOiAyLCBpZDogdHJpZ2dlci5pZH0pKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3dvcmRzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICAvLyB3aW5kIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIHdpbmQgMiA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDZcbiAgLy8gd2luZCAzID0+IDItMyBoaXRzIDhNUCAgICAgICAgPT4gOFxuXG4gIC8vIGZpcmUgMSA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDNcbiAgLy8gZmlyZSAyID0+IDMgaGl0cyAgICAgICAgICAgICAgPT4gNVxuICAvLyBmaXJlIDMgPT4gNC02IGhpdHMgMTZNUCAgICAgICA9PiA3XG5cbiAgLy8gd2F0ZXIgMSA9PiAxIGhpdCAgICAgICAgICAgICAgPT4gM1xuICAvLyB3YXRlciAyID0+IDEtMiBoaXRzICAgICAgICAgICA9PiA2XG4gIC8vIHdhdGVyIDMgPT4gMy02IGhpdHMgMTZNUCAgICAgID0+IDhcblxuICAvLyB0aHVuZGVyIDEgPT4gMS0yIGhpdHMgc3ByZWFkICA9PiAzXG4gIC8vIHRodW5kZXIgMiA9PiAxLTMgaGl0cyBzcHJlYWQgID0+IDVcbiAgLy8gdGh1bmRlciAzID0+IDctMTAgaGl0cyA0ME1QICAgPT4gN1xuXG4gIHJvbS5vYmplY3RzWzB4MTBdLmF0ayA9IDM7IC8vIHdpbmQgMVxuICByb20ub2JqZWN0c1sweDExXS5hdGsgPSA2OyAvLyB3aW5kIDJcbiAgcm9tLm9iamVjdHNbMHgxMl0uYXRrID0gODsgLy8gd2luZCAzXG5cbiAgcm9tLm9iamVjdHNbMHgxOF0uYXRrID0gMzsgLy8gZmlyZSAxXG4gIHJvbS5vYmplY3RzWzB4MTNdLmF0ayA9IDU7IC8vIGZpcmUgMlxuICByb20ub2JqZWN0c1sweDE5XS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxN10uYXRrID0gNzsgLy8gZmlyZSAzXG4gIHJvbS5vYmplY3RzWzB4MWFdLmF0ayA9IDc7IC8vIGZpcmUgM1xuXG4gIHJvbS5vYmplY3RzWzB4MTRdLmF0ayA9IDM7IC8vIHdhdGVyIDFcbiAgcm9tLm9iamVjdHNbMHgxNV0uYXRrID0gNjsgLy8gd2F0ZXIgMlxuICByb20ub2JqZWN0c1sweDE2XS5hdGsgPSA4OyAvLyB3YXRlciAzXG5cbiAgcm9tLm9iamVjdHNbMHgxY10uYXRrID0gMzsgLy8gdGh1bmRlciAxXG4gIHJvbS5vYmplY3RzWzB4MWVdLmF0ayA9IDU7IC8vIHRodW5kZXIgMlxuICByb20ub2JqZWN0c1sweDFiXS5hdGsgPSA3OyAvLyB0aHVuZGVyIDNcbiAgcm9tLm9iamVjdHNbMHgxZl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG5cbiAgaWYgKGZsYWdzLnNsb3dEb3duVG9ybmFkbygpKSB7XG4gICAgLy8gVE9ETyAtIHRvcm5hZG8gKG9iaiAxMikgPT4gc3BlZWQgMDcgaW5zdGVhZCBvZiAwOFxuICAgIC8vICAgICAgLSBsaWZldGltZSBpcyA0ODAgPT4gNzAgbWF5YmUgdG9vIGxvbmcsIDYwIHN3ZWV0IHNwb3Q/XG4gICAgY29uc3QgdG9ybmFkbyA9IHJvbS5vYmplY3RzWzB4MTJdO1xuICAgIHRvcm5hZG8uc3BlZWQgPSAweDA3O1xuICAgIHRvcm5hZG8uZGF0YVsweDBjXSA9IDB4NjA7IC8vIGluY3JlYXNlIGxpZmV0aW1lICg0ODApIGJ5IDIwJVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpeENvaW5TcHJpdGVzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgcGFnZSBvZiBbMHg2MCwgMHg2NCwgMHg2NSwgMHg2NiwgMHg2NywgMHg2OCxcbiAgICAgICAgICAgICAgICAgICAgICAweDY5LCAweDZhLCAweDZiLCAweDZjLCAweDZkLCAweDZmXSkge1xuICAgIGZvciAoY29uc3QgcGF0IG9mIFswLCAxLCAyXSkge1xuICAgICAgcm9tLnBhdHRlcm5zW3BhZ2UgPDwgNiB8IHBhdF0ucGl4ZWxzID0gcm9tLnBhdHRlcm5zWzB4NWUgPDwgNiB8IHBhdF0ucGl4ZWxzO1xuICAgIH1cbiAgfVxuICByb20ub2JqZWN0c1sweDBjXS5tZXRhc3ByaXRlID0gMHhhOTtcbn1cblxuLyoqXG4gKiBGaXggdGhlIHNvZnRsb2NrIHRoYXQgaGFwcGVucyB3aGVuIHlvdSBnbyB0aHJvdWdoXG4gKiBhIHdhbGwgYmFja3dhcmRzIGJ5IG1vdmluZyB0aGUgZXhpdC9lbnRyYW5jZSB0aWxlc1xuICogdXAgYSBiaXQgYW5kIGFkanVzdGluZyBzb21lIHRpbGVFZmZlY3RzIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gZml4UmV2ZXJzZVdhbGxzKHJvbTogUm9tKSB7XG4gIC8vIGFkanVzdCB0aWxlIGVmZmVjdCBmb3IgYmFjayB0aWxlcyBvZiBpcm9uIHdhbGxcbiAgZm9yIChjb25zdCB0IGluIFsweDA0LCAweDA1LCAweDA4LCAweDA5XSkge1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGJjIC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gICAgcm9tLnRpbGVFZmZlY3RzWzB4YjUgLSAweGIzXS5lZmZlY3RzW3RdID0gMHgxODtcbiAgfVxuICAvLyBUT0RPIC0gbW92ZSBhbGwgdGhlIGVudHJhbmNlcyB0byB5PTIwIGFuZCBleGl0cyB0byB5dD0wMVxufVxuXG4vKiogTWFrZSBhIGxhbmQgYnJpZGdlIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgKi9cbmZ1bmN0aW9uIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tOiBSb20pIHtcbiAgY29uc3Qge3RpbGVzfSA9IHJvbS5zY3JlZW5zWzB4YTFdO1xuICB0aWxlc1sweDI4XSA9IDB4OWY7XG4gIHRpbGVzWzB4MzddID0gMHgyMztcbiAgdGlsZXNbMHgzOF0gPSAweDIzOyAvLyAweDhlO1xuICB0aWxlc1sweDM5XSA9IDB4MjE7XG4gIHRpbGVzWzB4NDddID0gMHg4ZDtcbiAgdGlsZXNbMHg0OF0gPSAweDhmO1xuICB0aWxlc1sweDU2XSA9IDB4OTk7XG4gIHRpbGVzWzB4NTddID0gMHg5YTtcbiAgdGlsZXNbMHg1OF0gPSAweDhjO1xufVxuXG5mdW5jdGlvbiBmb2dMYW1wTm90UmVxdWlyZWQocm9tOiBSb20pIHtcbiAgLy8gTmVlZCB0byBtYWtlIHNldmVyYWwgY2hhbmdlcy5cbiAgLy8gKDEpIGRvbHBoaW4gb25seSByZXF1aXJlcyBzaGVsbCBmbHV0ZSwgbWFrZSB0aGUgZmxhZyBjaGVjayBmcmVlICh+MDAwKVxuICByb20uaXRlbXNbMHgzNl0uaXRlbVVzZURhdGFbMF0ud2FudCA9IH4wO1xuICAvLyAoMikga2Vuc3UgNjggKEA2MSkgZHJvcHMgYW4gaXRlbSAoNjcgbWFnaWMgcmluZylcbiAgcm9tLm5wY3NbMHg2OF0uZGF0YVswXSA9IDB4Njc7XG4gIHJvbS5ucGNzWzB4NjhdLmxvY2FsRGlhbG9ncy5nZXQoLTEpIVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MGE7XG4gIHJvbS5ucGNzWzB4NjhdLmxvY2FsRGlhbG9ncy5nZXQoLTEpIVswXS5mbGFncyA9IFtdO1xuICByb20ubnBjc1sweDY4XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4NjEsIFsweDIxLCB+MHgwYzFdKVxuICAvLyAoMykgZmlzaGVybWFuIDY0IHNwYXducyBvbiBmb2cgbGFtcCByYXRoZXIgdGhhbiBzaGVsbCBmbHV0ZVxuICByb20ubnBjc1sweDY0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZDYsIFsweDIzNV0pO1xuXG4gIC8vICg0KSBmaXggdXAgaXRlbWdldCA2NyBmcm9tIGl0ZW1nZXQgNjQgKGRlbGV0ZSB0aGUgZmxhZylcbiAgcm9tLml0ZW1HZXRzWzB4NjRdLmZsYWdzID0gW107XG4gIHJvbS5pdGVtR2V0c1sweDY3XS5jb3B5RnJvbShyb20uaXRlbUdldHNbMHg2NF0pO1xuICByb20uaXRlbUdldHNbMHg2N10uZmxhZ3MgPSBbMHgwYzFdO1xuXG4gIC8vIFRPRE8gLSBncmFwaGljcyBzY3Jld2VkIHVwIC0gZmlndXJlIG91dCBpZiBvYmplY3QgYWN0aW9uIGlzIGNoYW5naW5nXG4gIC8vIHRoZSBwYXR0ZXJuIHRhYmxlcyBiYXNlZCBvbiAoZS5nLikgJDYwMCx4IG1heWJlPyAgQ2FuIHdlIHByZXZlbnQgaXQ/XG5cbiAgLy8gVE9ETyAtIGFkZCBhIG5vdGVzIGZpbGUgYWJvdXQgdGhpcy5cblxufVxuXG4vKipcbiAqIFJlbW92ZSB0aW1lciBzcGF3bnMsIHJlbnVtYmVycyBtaW1pYyBzcGF3bnMgc28gdGhhdCB0aGV5J3JlIHVuaXF1ZS5cbiAqIFJ1bnMgYmVmb3JlIHNodWZmbGUgYmVjYXVzZSB3ZSBuZWVkIHRvIGlkZW50aWZ5IHRoZSBzbG90LiAgUmVxdWlyZXNcbiAqIGFuIGFzc2VtYmx5IGNoYW5nZSAoJDNkM2ZkIGluIHByZXNodWZmbGUucylcbiAqL1xuZnVuY3Rpb24gZml4TWltaWNzKHJvbTogUm9tKTogdm9pZCB7XG4gIGxldCBtaW1pYyA9IDB4NzA7XG4gIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IHMgb2YgbG9jLnNwYXducykge1xuICAgICAgaWYgKCFzLmlzQ2hlc3QoKSkgY29udGludWU7XG4gICAgICBzLnRpbWVkID0gZmFsc2U7XG4gICAgICBpZiAocy5pZCA+PSAweDcwKSBzLmlkID0gbWltaWMrKztcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGJ1bmRsZSBhc20gY2hhbmdlcz9cbiAgLy8gcm9tLmFzc2VtYmxlKClcbiAgLy8gICAgIC4kKCdhZGMgJDEwJylcbiAgLy8gICAgIC5iZXEoJ2xhYmVsJylcbiAgLy8gICAgIC5sc2goKVxuICAvLyAgICAgLmxzaChgJHthZGRyfSx4YClcbiAgLy8gICAgIC5sYWJlbCgnbGFiZWwnKTtcbiAgLy8gcm9tLnBhdGNoKClcbiAgLy8gICAgIC5vcmcoMHgzZDNmZClcbiAgLy8gICAgIC5ieXRlKDB4YjApO1xufVxuXG5mdW5jdGlvbiBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGwgPSByb20ubG9jYXRpb25zO1xuICAvLyBNb3ZlIEtlbGJlc3F1ZSAyIG9uZSBmdWxsIHRpbGUgbGVmdC5cbiAgbC5Hb2FGb3J0cmVzc19LZWxiZXNxdWUuc3Bhd25zWzBdLnggLT0gMTY7XG4gIC8vIFJlbW92ZSBzYWdlIHNjcmVlbiBsb2NrcyAoZXhjZXB0IEtlbnN1KS5cbiAgbC5Hb2FGb3J0cmVzc19aZWJ1LnNwYXducy5zcGxpY2UoMSwgMSk7IC8vIHplYnUgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX1Rvcm5lbC5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyB0b3JuZWwgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX0FzaW5hLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIGFzaW5hIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19LZW5zdS5zcGF3bnMuc3BsaWNlKDMsIDEpOyAvLyBrZW5zdSBodW1hbiBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfS2Vuc3Uuc3Bhd25zLnNwbGljZSgxLCAxKTsgLy8ga2Vuc3Ugc2xpbWUgc2NyZWVuIGxvY2sgdHJpZ2dlclxufVxuXG5mdW5jdGlvbiBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBjb25zdCB7V2F0ZXJmYWxsQ2F2ZTR9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBNb3ZlIGFsYXJtIGZsdXRlIHRvIHRoaXJkIHJvd1xuICByb20uaXRlbUdldHNbMHgzMV0uaW52ZW50b3J5Um93U3RhcnQgPSAweDIwO1xuICAvLyBFbnN1cmUgYWxhcm0gZmx1dGUgY2Fubm90IGJlIGRyb3BwZWRcbiAgLy8gcm9tLnByZ1sweDIxMDIxXSA9IDB4NDM7IC8vIFRPRE8gLSByb20uaXRlbXNbMHgzMV0uPz8/XG4gIHJvbS5pdGVtc1sweDMxXS51bmlxdWUgPSB0cnVlO1xuICAvLyBFbnN1cmUgYWxhcm0gZmx1dGUgY2Fubm90IGJlIHNvbGRcbiAgcm9tLml0ZW1zWzB4MzFdLmJhc2VQcmljZSA9IDA7XG5cbiAgaWYgKGZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkpIHtcbiAgICAvLyBQZXJzb24gMTQgKFplYnUncyBzdHVkZW50KTogc2Vjb25kYXJ5IGl0ZW0gLT4gYWxhcm0gZmx1dGVcbiAgICByb20ubnBjc1sweDE0XS5kYXRhWzFdID0gMHgzMTsgLy8gTk9URTogQ2xvYmJlcnMgc2h1ZmZsZWQgaXRlbSEhIVxuICB9IGVsc2Uge1xuICAgIHJvbS5ucGNzWzB4MTRdLmRhdGFbMV0gPSAweGZmOyAvLyBpbmRpY2F0ZSBub3RoaW5nIHRoZXJlOiBubyBzbG90LlxuICB9XG5cbiAgLy8gUmVtb3ZlIGFsYXJtIGZsdXRlIGZyb20gc2hvcHMgKHJlcGxhY2Ugd2l0aCBvdGhlciBpdGVtcylcbiAgLy8gTk9URSAtIHdlIGNvdWxkIHNpbXBsaWZ5IHRoaXMgd2hvbGUgdGhpbmcgYnkganVzdCBoYXJkY29kaW5nIGluZGljZXMuXG4gIC8vICAgICAgLSBpZiB0aGlzIGlzIGd1YXJhbnRlZWQgdG8gaGFwcGVuIGVhcmx5LCBpdCdzIGFsbCB0aGUgc2FtZS5cbiAgY29uc3QgcmVwbGFjZW1lbnRzID0gW1xuICAgIFsweDIxLCAwLjcyXSwgLy8gZnJ1aXQgb2YgcG93ZXIsIDcyJSBvZiBjb3N0XG4gICAgWzB4MWYsIDAuOV0sIC8vIGx5c2lzIHBsYW50LCA5MCUgb2YgY29zdFxuICBdO1xuICBsZXQgaiA9IDA7XG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5jb250ZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHNob3AuY29udGVudHNbaV0gIT09IDB4MzEpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgW2l0ZW0sIHByaWNlUmF0aW9dID0gcmVwbGFjZW1lbnRzWyhqKyspICUgcmVwbGFjZW1lbnRzLmxlbmd0aF07XG4gICAgICBzaG9wLmNvbnRlbnRzW2ldID0gaXRlbTtcbiAgICAgIGlmIChyb20uc2hvcERhdGFUYWJsZXNBZGRyZXNzKSB7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgaXMgYnJva2VuIC0gbmVlZCBhIGNvbnRyb2xsZWQgd2F5IHRvIGNvbnZlcnQgcHJpY2UgZm9ybWF0c1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IE1hdGgucm91bmQoc2hvcC5wcmljZXNbaV0gKiBwcmljZVJhdGlvKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDaGFuZ2UgZmx1dGUgb2YgbGltZSBjaGVzdCdzIChub3ctdW51c2VkKSBpdGVtZ2V0IHRvIGhhdmUgbWVkaWNhbCBoZXJiXG4gIHJvbS5pdGVtR2V0c1sweDViXS5pdGVtSWQgPSAweDFkO1xuICAvLyBDaGFuZ2UgdGhlIGFjdHVhbCBzcGF3biBmb3IgdGhhdCBjaGVzdCB0byBiZSB0aGUgbWlycm9yZWQgc2hpZWxkIGNoZXN0XG4gIFdhdGVyZmFsbENhdmU0LnNwYXduKDB4MTkpLmlkID0gMHgxMDtcblxuICAvLyBUT0RPIC0gcmVxdWlyZSBuZXcgY29kZSBmb3IgdHdvIHVzZXNcbn1cblxuZnVuY3Rpb24gYnJva2FoYW5hV2FudHNNYWRvMShyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBicm9rYWhhbmEgPSByb20ubnBjc1sweDU0XTtcbiAgY29uc3QgZGlhbG9nID0gYXNzZXJ0KGJyb2thaGFuYS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSlbMF07XG4gIGlmIChkaWFsb2cuY29uZGl0aW9uICE9PSB+MHgwMjQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBicm9rYWhhbmEgY29uZGl0aW9uOiAke2RpYWxvZy5jb25kaXRpb259YCk7XG4gIH1cbiAgZGlhbG9nLmNvbmRpdGlvbiA9IH4weDA2NzsgLy8gdmFuaWxsYSBiYWxsIG9mIHRodW5kZXIgLyBkZWZlYXRlZCBtYWRvIDFcbn1cblxuZnVuY3Rpb24gcmVxdWlyZUhlYWxlZERvbHBoaW4ocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gTm9ybWFsbHkgdGhlIGZpc2hlcm1hbiAoJDY0KSBzcGF3bnMgaW4gaGlzIGhvdXNlICgkZDYpIGlmIHlvdSBoYXZlXG4gIC8vIHRoZSBzaGVsbCBmbHV0ZSAoMjM2KS4gIEhlcmUgd2UgYWxzbyBhZGQgYSByZXF1aXJlbWVudCBvbiB0aGUgaGVhbGVkXG4gIC8vIGRvbHBoaW4gc2xvdCAoMDI1KSwgd2hpY2ggd2Uga2VlcCBhcm91bmQgc2luY2UgaXQncyBhY3R1YWxseSB1c2VmdWwuXG4gIHJvbS5ucGNzWzB4NjRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkNiwgWzB4MjM2LCAweDAyNV0pO1xuICAvLyBBbHNvIGZpeCBkYXVnaHRlcidzIGRpYWxvZyAoJDdiKS5cbiAgY29uc3QgZGF1Z2h0ZXJEaWFsb2cgPSByb20ubnBjc1sweDdiXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSE7XG4gIGRhdWdodGVyRGlhbG9nLnVuc2hpZnQoZGF1Z2h0ZXJEaWFsb2dbMF0uY2xvbmUoKSk7XG4gIGRhdWdodGVyRGlhbG9nWzBdLmNvbmRpdGlvbiA9IH4weDAyNTtcbiAgZGF1Z2h0ZXJEaWFsb2dbMV0uY29uZGl0aW9uID0gfjB4MjM2O1xufVxuXG5mdW5jdGlvbiByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vdCBoYXZpbmcgdGVsZXBhdGh5ICgyNDMpIHdpbGwgdHJpZ2dlciBhIFwia3l1IGt5dVwiICgxYToxMiwgMWE6MTMpIGZvclxuICAvLyBib3RoIGdlbmVyaWMgYnVubmllcyAoNTkpIGFuZCBkZW8gKDVhKS5cbiAgcm9tLm5wY3NbMHg1OV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEyXSkpO1xuICByb20ubnBjc1sweDVhXS5nbG9iYWxEaWFsb2dzLnB1c2goR2xvYmFsRGlhbG9nLm9mKH4weDI0MywgWzB4MWEsIDB4MTNdKSk7XG59XG5cbmZ1bmN0aW9uIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gaXRlbWdldCAwMyBzd29yZCBvZiB0aHVuZGVyID0+IHNldCAyZmQgc2h5cm9uIHdhcnAgcG9pbnRcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmZsYWdzLnB1c2goMHgyZmQpO1xuICAvLyBkaWFsb2cgNjIgYXNpbmEgaW4gZjIvZjQgc2h5cm9uIC0+IGFjdGlvbiAxZiAodGVsZXBvcnQgdG8gc3RhcnQpXG4gIC8vICAgLSBub3RlOiBmMiBhbmQgZjQgZGlhbG9ncyBhcmUgbGlua2VkLlxuICBmb3IgKGNvbnN0IGkgb2YgWzAsIDEsIDNdKSB7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgWzB4ZjIsIDB4ZjRdKSB7XG4gICAgICByb20ubnBjc1sweDYyXS5sb2NhbERpYWxvZ3MuZ2V0KGxvYykhW2ldLm1lc3NhZ2UuYWN0aW9uID0gMHgxZjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIENoYW5nZSBzd29yZCBvZiB0aHVuZGVyJ3MgYWN0aW9uIHRvIGJiZSB0aGUgc2FtZSBhcyBvdGhlciBzd29yZHMgKDE2KVxuICByb20uaXRlbUdldHNbMHgwM10uYWNxdWlzaXRpb25BY3Rpb24uYWN0aW9uID0gMHgxNjtcbn1cblxuZnVuY3Rpb24gYWRqdXN0SXRlbU5hbWVzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBpZiAoZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAvLyByZW5hbWUgbGVhdGhlciBib290cyB0byBzcGVlZCBib290c1xuICAgIGNvbnN0IGxlYXRoZXJCb290cyA9IHJvbS5pdGVtc1sweDJmXSE7XG4gICAgbGVhdGhlckJvb3RzLm1lbnVOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBsZWF0aGVyQm9vdHMubWVzc2FnZU5hbWUgPSAnU3BlZWQgQm9vdHMnO1xuICAgIGlmIChmbGFncy5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCkpIHtcbiAgICAgIGNvbnN0IGdhc01hc2sgPSByb20uaXRlbXNbMHgyOV07XG4gICAgICBnYXNNYXNrLm1lbnVOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICAgIGdhc01hc2subWVzc2FnZU5hbWUgPSAnSGF6bWF0IFN1aXQnO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlbmFtZSBiYWxscyB0byBvcmJzXG4gIGZvciAobGV0IGkgPSAweDA1OyBpIDwgMHgwYzsgaSArPSAyKSB7XG4gICAgcm9tLml0ZW1zW2ldLm1lbnVOYW1lID0gcm9tLml0ZW1zW2ldLm1lbnVOYW1lLnJlcGxhY2UoJ0JhbGwnLCAnT3JiJyk7XG4gICAgcm9tLml0ZW1zW2ldLm1lc3NhZ2VOYW1lID0gcm9tLml0ZW1zW2ldLm1lc3NhZ2VOYW1lLnJlcGxhY2UoJ0JhbGwnLCAnT3JiJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIHRvcm5lbCdzIHRyaWdnZXIgbmVlZHMgYm90aCBpdGVtc1xuICBjb25zdCB0b3JuZWwgPSByb20ubnBjc1sweDVmXTtcbiAgY29uc3QgdmFuaWxsYSA9IHRvcm5lbC5sb2NhbERpYWxvZ3MuZ2V0KDB4MjEpITtcbiAgY29uc3QgcGF0Y2hlZCA9IFtcbiAgICB2YW5pbGxhWzBdLCAvLyBhbHJlYWR5IGxlYXJuZWQgdGVsZXBvcnRcbiAgICB2YW5pbGxhWzJdLCAvLyBkb24ndCBoYXZlIHRvcm5hZG8gYnJhY2VsZXRcbiAgICB2YW5pbGxhWzJdLmNsb25lKCksIC8vIHdpbGwgY2hhbmdlIHRvIGRvbid0IGhhdmUgb3JiXG4gICAgdmFuaWxsYVsxXSwgLy8gaGF2ZSBicmFjZWxldCwgbGVhcm4gdGVsZXBvcnRcbiAgXTtcbiAgcGF0Y2hlZFsxXS5jb25kaXRpb24gPSB+MHgyMDY7IC8vIGRvbid0IGhhdmUgYnJhY2VsZXRcbiAgcGF0Y2hlZFsyXS5jb25kaXRpb24gPSB+MHgyMDU7IC8vIGRvbid0IGhhdmUgb3JiXG4gIHBhdGNoZWRbM10uY29uZGl0aW9uID0gfjA7ICAgICAvLyBkZWZhdWx0XG4gIHRvcm5lbC5sb2NhbERpYWxvZ3Muc2V0KDB4MjEsIHBhdGNoZWQpO1xufVxuXG5mdW5jdGlvbiBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIFtyb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuS2lyaXNhTWVhZG93XSkge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBzZXQgdGhlIG5ldyBcImludmlzaWJsZVwiIGZsYWcgb24gdGhlIGNoZXN0LlxuICAgICAgaWYgKHNwYXduLmlzQ2hlc3QoKSkgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgIH1cbiAgfVxufVxuXG4vLyBBZGQgdGhlIHN0YXR1ZSBvZiBvbnl4IGFuZCBwb3NzaWJseSB0aGUgdGVsZXBvcnQgYmxvY2sgdHJpZ2dlciB0byBDb3JkZWwgV2VzdFxuZnVuY3Rpb24gYWRkQ29yZGVsV2VzdFRyaWdnZXJzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICBjb25zdCB7Q29yZGVsUGxhaW5FYXN0LCBDb3JkZWxQbGFpbldlc3R9ID0gcm9tLmxvY2F0aW9ucztcbiAgZm9yIChjb25zdCBzcGF3biBvZiBDb3JkZWxQbGFpbkVhc3Quc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzQ2hlc3QoKSB8fCAoZmxhZ3MuZGlzYWJsZVRlbGVwb3J0U2tpcCgpICYmIHNwYXduLmlzVHJpZ2dlcigpKSkge1xuICAgICAgLy8gQ29weSBpZiAoMSkgaXQncyB0aGUgY2hlc3QsIG9yICgyKSB3ZSdyZSBkaXNhYmxpbmcgdGVsZXBvcnQgc2tpcFxuICAgICAgQ29yZGVsUGxhaW5XZXN0LnNwYXducy5wdXNoKHNwYXduLmNsb25lKCkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhSYWJiaXRTa2lwKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5NdFNhYnJlTm9ydGhfTWFpbi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4ODYpIHtcbiAgICAgIGlmIChzcGF3bi54ID09PSAweDc0MCkge1xuICAgICAgICBzcGF3bi54ICs9IDE2O1xuICAgICAgICBzcGF3bi55ICs9IDE2O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRUb3dlckV4aXQocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1Rvd2VyRW50cmFuY2UsIENyeXB0X1RlbGVwb3J0ZXJ9ID0gcm9tLmxvY2F0aW9ucztcbiAgY29uc3QgZW50cmFuY2UgPSBDcnlwdF9UZWxlcG9ydGVyLmVudHJhbmNlcy5sZW5ndGg7XG4gIGNvbnN0IGRlc3QgPSBDcnlwdF9UZWxlcG9ydGVyLmlkO1xuICBDcnlwdF9UZWxlcG9ydGVyLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt0aWxlOiAweDY4fSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1NywgZGVzdCwgZW50cmFuY2V9KSk7XG4gIFRvd2VyRW50cmFuY2UuZXhpdHMucHVzaChFeGl0Lm9mKHt0aWxlOiAweDU4LCBkZXN0LCBlbnRyYW5jZX0pKTtcbn1cblxuLy8gUHJvZ3JhbW1hdGljYWxseSBhZGQgYSBob2xlIGJldHdlZW4gdmFsbGV5IG9mIHdpbmQgYW5kIGxpbWUgdHJlZSB2YWxsZXlcbmZ1bmN0aW9uIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7VmFsbGV5T2ZXaW5kLCBMaW1lVHJlZVZhbGxleX0gPSByb20ubG9jYXRpb25zO1xuXG4gIFZhbGxleU9mV2luZC5zY3JlZW5zWzVdWzRdID0gMHgxMDsgLy8gbmV3IGV4aXRcbiAgTGltZVRyZWVWYWxsZXkuc2NyZWVuc1sxXVswXSA9IDB4MWE7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMl1bMF0gPSAweDBjOyAvLyBuaWNlciBtb3VudGFpbnNcblxuICBjb25zdCB3aW5kRW50cmFuY2UgPVxuICAgICAgVmFsbGV5T2ZXaW5kLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDRlZiwgeTogMHg1Nzh9KSkgLSAxO1xuICBjb25zdCBsaW1lRW50cmFuY2UgPVxuICAgICAgTGltZVRyZWVWYWxsZXkuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3g6IDB4MDEwLCB5OiAweDFjMH0pKSAtIDE7XG5cbiAgVmFsbGV5T2ZXaW5kLmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NjAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4NGYwLCB5OiAweDU3MCwgZGVzdDogMHg0MiwgZW50cmFuY2U6IGxpbWVFbnRyYW5jZX0pKTtcbiAgTGltZVRyZWVWYWxsZXkuZXhpdHMucHVzaChcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFiMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pLFxuICAgICAgRXhpdC5vZih7eDogMHgwMDAsIHk6IDB4MWMwLCBkZXN0OiAweDAzLCBlbnRyYW5jZTogd2luZEVudHJhbmNlfSkpO1xufVxuXG5mdW5jdGlvbiBjbG9zZUNhdmVFbnRyYW5jZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIC8vIFByZXZlbnQgc29mdGxvY2sgZnJvbSBleGl0aW5nIHNlYWxlZCBjYXZlIGJlZm9yZSB3aW5kbWlsbCBzdGFydGVkXG4gIHJvbS5sb2NhdGlvbnMuVmFsbGV5T2ZXaW5kLmVudHJhbmNlc1sxXS55ICs9IDE2O1xuXG4gIC8vIENsZWFyIHRpbGVzIDEsMiwzLDQgZm9yIGJsb2NrYWJsZSBjYXZlcyBpbiB0aWxlc2V0cyA5MCwgOTQsIGFuZCA5Y1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5MF0sXG4gICAgICAgICAgICAgICAgICAgIFsweDA3LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MGUsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDIxLCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG4gIHJvbS5zd2FwTWV0YXRpbGVzKFsweDk0LCAweDljXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4NjgsIFsweDAxLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4MywgWzB4MDIsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDg4LCBbMHgwMywgMHgwYV0sIH4weGQ3XSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODksIFsweDA0LCAweDBhXSwgfjB4ZDddKTtcblxuICAvLyBOb3cgcmVwbGFjZSB0aGUgdGlsZXMgd2l0aCB0aGUgYmxvY2thYmxlIG9uZXNcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDM5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDhdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHg0OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4NzldID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg3YV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDg5XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4OGFdID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ4XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NDldID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OF0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDU5XSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1Nl0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDU3XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjZdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg2N10gPSAweDA0O1xuXG4gIC8vIERlc3RydWN0dXJlIG91dCBhIGZldyBsb2NhdGlvbnMgYnkgbmFtZVxuICBjb25zdCB7XG4gICAgQ29yZGVsUGxhaW5XZXN0LFxuICAgIENvcmRlbFBsYWluRWFzdCxcbiAgICBEZXNlcnQyLFxuICAgIEdvYVZhbGxleSxcbiAgICBMaW1lVHJlZVZhbGxleSxcbiAgICBLaXJpc2FNZWFkb3csXG4gICAgU2FoYXJhT3V0c2lkZUNhdmUsXG4gICAgVmFsbGV5T2ZXaW5kLFxuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLFxuICAgIFdhdGVyZmFsbFZhbGxleVNvdXRoLFxuICB9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBOT1RFOiBmbGFnIDJmMCBpcyBBTFdBWVMgc2V0IC0gdXNlIGl0IGFzIGEgYmFzZWxpbmUuXG4gIGNvbnN0IGZsYWdzVG9DbGVhcjogW0xvY2F0aW9uLCBudW1iZXJdW10gPSBbXG4gICAgW1ZhbGxleU9mV2luZCwgMHgzMF0sIC8vIHZhbGxleSBvZiB3aW5kLCB6ZWJ1J3MgY2F2ZVxuICAgIFtDb3JkZWxQbGFpbldlc3QsIDB4MzBdLCAvLyBjb3JkZWwgd2VzdCwgdmFtcGlyZSBjYXZlXG4gICAgW0NvcmRlbFBsYWluRWFzdCwgMHgzMF0sIC8vIGNvcmRlbCBlYXN0LCB2YW1waXJlIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDBdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIHByaXNvbiBjYXZlXG4gICAgW1dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDE0XSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBmb2cgbGFtcFxuICAgIFtXYXRlcmZhbGxWYWxsZXlTb3V0aCwgMHg3NF0sIC8vIHdhdGVyZmFsbCBzb3V0aCwga2lyaXNhXG4gICAgW0tpcmlzYU1lYWRvdywgMHgxMF0sIC8vIGtpcmlzYSBtZWFkb3dcbiAgICBbU2FoYXJhT3V0c2lkZUNhdmUsIDB4MDBdLCAvLyBjYXZlIHRvIGRlc2VydFxuICAgIFtEZXNlcnQyLCAweDQxXSxcbiAgXTtcbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkgJiYgZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICBmbGFnc1RvQ2xlYXIucHVzaChbTGltZVRyZWVWYWxsZXksIDB4MTBdKTtcbiAgfVxuICBpZiAoZmxhZ3MuY29ubmVjdEdvYVRvTGVhZigpKSB7XG4gICAgZmxhZ3NUb0NsZWFyLnB1c2goW0dvYVZhbGxleSwgMHgwMV0pO1xuICB9XG4gIGZvciAoY29uc3QgW2xvYywgeXhdIG9mIGZsYWdzVG9DbGVhcikge1xuICAgIGxvYy5mbGFncy5wdXNoKEZsYWcub2Yoe3l4LCBmbGFnOiAweDJmMH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2VGbGFnKGxvYzogTG9jYXRpb24sIHl4OiBudW1iZXIsIGZsYWc6IG51bWJlcik6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgIGlmIChmLnl4ID09PSB5eCkge1xuICAgICAgICBmLmZsYWcgPSBmbGFnO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZmxhZyB0byByZXBsYWNlIGF0ICR7bG9jfToke3l4fWApO1xuICB9O1xuXG4gIGlmIChmbGFncy5wYXJhbHlzaXNSZXF1aXJlc1ByaXNvbktleSgpKSB7IC8vIGNsb3NlIG9mZiByZXZlcnNlIGVudHJhbmNlc1xuICAgIC8vIE5PVEU6IHdlIGNvdWxkIGFsc28gY2xvc2UgaXQgb2ZmIHVudGlsIGJvc3Mga2lsbGVkLi4uP1xuICAgIC8vICAtIGNvbnN0IHZhbXBpcmVGbGFnID0gfnJvbS5ucGNTcGF3bnNbMHhjMF0uY29uZGl0aW9uc1sweDBhXVswXTtcbiAgICAvLyAgLT4ga2VsYmVzcXVlIGZvciB0aGUgb3RoZXIgb25lLlxuICAgIGNvbnN0IHdpbmRtaWxsRmxhZyA9IDB4MmVlO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluV2VzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbkVhc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG5cbiAgICByZXBsYWNlRmxhZyhXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMCwgMHgyZDgpOyAvLyBrZXkgdG8gcHJpc29uIGZsYWdcbiAgICBjb25zdCBleHBsb3Npb24gPSBTcGF3bi5vZih7eTogMHgwNjAsIHg6IDB4MDYwLCB0eXBlOiA0LCBpZDogMHgyY30pO1xuICAgIGNvbnN0IGtleVRyaWdnZXIgPSBTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MDcwLCB0eXBlOiAyLCBpZDogMHhhZH0pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5zcGxpY2UoMSwgMCwgZXhwbG9zaW9uKTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMucHVzaChrZXlUcmlnZ2VyKTtcbiAgfVxuXG4gIC8vIHJvbS5sb2NhdGlvbnNbMHgxNF0udGlsZUVmZmVjdHMgPSAweGIzO1xuXG4gIC8vIGQ3IGZvciAzP1xuXG4gIC8vIFRPRE8gLSB0aGlzIGVuZGVkIHVwIHdpdGggbWVzc2FnZSAwMDowMyBhbmQgYW4gYWN0aW9uIHRoYXQgZ2F2ZSBib3cgb2YgbW9vbiFcblxuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5wYXJ0ID0gMHgxYjtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UuaW5kZXggPSAweDA4O1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0uZmxhZ3MucHVzaCgweDJmNiwgMHgyZjcsIDB4MmY4KTtcbn1cblxuLy8gQHRzLWlnbm9yZTogbm90IHlldCB1c2VkXG5mdW5jdGlvbiBlYXN0Q2F2ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gVE9ETyBmaWxsIHVwIGdyYXBoaWNzLCBldGMgLS0+ICQxYSwgJDFiLCAkMDUgLyAkODgsICRiNSAvICQxNCwgJDAyXG4gIC8vIFRoaW5rIGFvYnV0IGV4aXRzIGFuZCBlbnRyYW5jZXMuLi4/XG5cbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXksIFNlYWxlZENhdmUxfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgY29uc3QgbG9jMSA9IHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUocm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTEpO1xuICBjb25zdCBsb2MyID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMik7XG4gIGNvbnN0IGxvYzMgPSByb20ubG9jYXRpb25zLkVhc3RDYXZlMztcblxuICAvLyBOT1RFOiAweDljIGNhbiBiZWNvbWUgMHg5OSBpbiB0b3AgbGVmdCBvciAweDk3IGluIHRvcCByaWdodCBvciBib3R0b20gbWlkZGxlIGZvciBhIGNhdmUgZXhpdFxuICBsb2MxLnNjcmVlbnMgPSBbWzB4OWMsIDB4ODQsIDB4ODAsIDB4ODMsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODEsIDB4ODMsIDB4ODYsIDB4ODBdLFxuICAgICAgICAgICAgICAgICAgWzB4ODMsIDB4ODgsIDB4ODksIDB4ODAsIDB4ODBdLFxuICAgICAgICAgICAgICAgICAgWzB4ODEsIDB4OGMsIDB4ODUsIDB4ODIsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgWzB4OWUsIDB4ODUsIDB4OWMsIDB4OTgsIDB4ODZdXTtcblxuICBsb2MyLnNjcmVlbnMgPSBbWzB4OWMsIDB4ODQsIDB4OWIsIDB4ODAsIDB4OWJdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODEsIDB4ODEsIDB4ODAsIDB4ODFdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODcsIDB4OGIsIDB4OGEsIDB4ODZdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4OGMsIDB4ODAsIDB4ODUsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgWzB4OWMsIDB4ODYsIDB4ODAsIDB4ODAsIDB4OWFdXTtcblxuICBmb3IgKGNvbnN0IGwgb2YgW2xvYzEsIGxvYzIsIGxvYzNdKSB7XG4gICAgbC5iZ20gPSAweDE3OyAvLyBtdCBzYWJyZSBjYXZlIG11c2ljP1xuICAgIGwuZW50cmFuY2VzID0gW107XG4gICAgbC5leGl0cyA9IFtdO1xuICAgIGwucGl0cyA9IFtdO1xuICAgIGwuc3Bhd25zID0gW107XG4gICAgbC5mbGFncyA9IFtdO1xuICAgIGwuaGVpZ2h0ID0gbC5zY3JlZW5zLmxlbmd0aDtcbiAgICBsLndpZHRoID0gbC5zY3JlZW5zWzBdLmxlbmd0aDtcbiAgICBsLmV4dGVuZGVkID0gMDtcbiAgICBsLnRpbGVQYWxldHRlcyA9IFsweDFhLCAweDFiLCAweDA1XTsgLy8gcm9jayB3YWxsXG4gICAgbC50aWxlc2V0ID0gMHg4ODtcbiAgICBsLnRpbGVFZmZlY3RzID0gMHhiNTtcbiAgICBsLnRpbGVQYXR0ZXJucyA9IFsweDE0LCAweDAyXTtcbiAgICBsLnNwcml0ZVBhdHRlcm5zID0gWy4uLlNlYWxlZENhdmUxLnNwcml0ZVBhdHRlcm5zXSBhcyBbbnVtYmVyLCBudW1iZXJdO1xuICAgIGwuc3ByaXRlUGFsZXR0ZXMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGFsZXR0ZXNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gIH1cblxuICAvLyBBZGQgZW50cmFuY2UgdG8gdmFsbGV5IG9mIHdpbmRcbiAgLy8gVE9ETyAtIG1heWJlIGp1c3QgZG8gKDB4MzMsIFtbMHgxOV1dKSBvbmNlIHdlIGZpeCB0aGF0IHNjcmVlbiBmb3IgZ3Jhc3NcbiAgVmFsbGV5T2ZXaW5kLndyaXRlU2NyZWVuczJkKDB4MjMsIFtcbiAgICBbMHgxMSwgMHgwZF0sXG4gICAgWzB4MDksIDB4YzJdXSk7XG4gIHJvbS50aWxlRWZmZWN0c1swXS5lZmZlY3RzWzB4YzBdID0gMDtcbiAgLy8gVE9ETyAtIGRvIHRoaXMgb25jZSB3ZSBmaXggdGhlIHNlYSB0aWxlc2V0XG4gIC8vIHJvbS5zY3JlZW5zWzB4YzJdLnRpbGVzWzB4NWFdID0gMHgwYTtcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1Yl0gPSAweDBhO1xuXG4gIC8vIENvbm5lY3QgbWFwc1xuICBsb2MxLmNvbm5lY3QoMHg0MywgbG9jMiwgMHg0NCk7XG4gIGxvYzEuY29ubmVjdCgweDQwLCBWYWxsZXlPZldpbmQsIDB4MzQpO1xuXG4gIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIC8vIEFkZCBlbnRyYW5jZSB0byBsaW1lIHRyZWUgdmFsbGV5XG4gICAgTGltZVRyZWVWYWxsZXkucmVzaXplU2NyZWVucygwLCAxLCAwLCAwKTsgLy8gYWRkIG9uZSBzY3JlZW4gdG8gbGVmdCBlZGdlXG4gICAgTGltZVRyZWVWYWxsZXkud3JpdGVTY3JlZW5zMmQoMHgwMCwgW1xuICAgICAgWzB4MGMsIDB4MTFdLFxuICAgICAgWzB4MTUsIDB4MzZdLFxuICAgICAgWzB4MGUsIDB4MGZdXSk7XG4gICAgbG9jMS5zY3JlZW5zWzBdWzRdID0gMHg5NzsgLy8gZG93biBzdGFpclxuICAgIGxvYzEuY29ubmVjdCgweDA0LCBMaW1lVHJlZVZhbGxleSwgMHgxMCk7XG4gIH1cblxuICAvLyBBZGQgbW9uc3RlcnNcbiAgbG9jMS5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDIxLCB0aWxlOiAweDg3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4ODgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTMsIHRpbGU6IDB4ODksIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMiwgdGlsZTogMHg2OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MDMsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGxvYzIuc3Bhd25zLnB1c2goXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDExLCB0aWxlOiAweDQ4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEyLCB0aWxlOiAweDc3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTQsIHRpbGU6IDB4MjgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjMsIHRpbGU6IDB4ODUsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDhhLCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDM0LCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4NDEsIHRpbGU6IDB4ODIsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGlmICghZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIGNoZXN0OiBhbGFybSBmbHV0ZVxuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MTEwLCB4OiAweDQ3OCwgdHlwZTogMiwgaWQ6IDB4MzF9KSk7XG4gIH1cbiAgaWYgKGZsYWdzLmFkZEV4dHJhQ2hlY2tzVG9FYXN0Q2F2ZSgpKSB7XG4gICAgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MTEwLCB4OiAweDQ3OCwgdHlwZTogMiwgaWQ6IDB4NTl9KSk7XG4gICAgLy8gY2hlc3Q6IG1pbWljXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MTA4LCB0eXBlOiAyLCBpZDogMHg3MH0pKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gY29ubmVjdEdvYVRvTGVhZihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7R29hVmFsbGV5LCBFYXN0Q2F2ZTIsIEVhc3RDYXZlM30gPSByb20ubG9jYXRpb25zO1xuICAvLyBBZGQgYSBuZXcgY2F2ZSB0byB0aGUgdG9wLWxlZnQgY29ybmVyIG9mIEdvYSBWYWxsZXkuXG4gIEdvYVZhbGxleS53cml0ZVNjcmVlbnMyZCgweDAwLCBbXG4gICAgICBbMHgwYywgMHhjMSwgMHgwZF0sXG4gICAgICBbMHgwZSwgMHgzNywgMHgzNV1dKTtcbiAgLy8gQWRkIGFuIGV4dHJhIGRvd24tc3RhaXIgdG8gRWFzdENhdmUyIGFuZCBhIG5ldyAzLXNjcmVlbiBFYXN0Q2F2ZTMgbWFwLlxuXG4gIHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUoRWFzdENhdmUzKTtcbiAgRWFzdENhdmUzLnNjcmVlbnMgPSBbWzB4OWFdLFxuICAgICAgICAgICAgICAgICAgICAgICBbMHg4Zl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFsweDllXV07XG4gIEVhc3RDYXZlMy5oZWlnaHQgPSAzO1xuICBFYXN0Q2F2ZTMud2lkdGggPSAxO1xuXG4gIC8vIEFkZCBhIHJvY2sgd2FsbCAoaWQ9MCkuXG4gIEVhc3RDYXZlMy5zcGF3bnMucHVzaChTcGF3bi5mcm9tKFsweDE4LCAweDA3LCAweDIzLCAweDAwXSkpO1xuICBFYXN0Q2F2ZTMuZmxhZ3MucHVzaChGbGFnLm9mKHtzY3JlZW46IDB4MTAsIGZsYWc6IHJvbS5mbGFncy5hbGxvY01hcEZsYWcoKX0pKTtcblxuICAvLyBNYWtlIHRoZSBjb25uZWN0aW9ucy5cbiAgRWFzdENhdmUyLnNjcmVlbnNbNF1bMF0gPSAweDk5O1xuICBFYXN0Q2F2ZTIuY29ubmVjdCgweDQwLCBFYXN0Q2F2ZTMsIH4weDAwKTtcbiAgRWFzdENhdmUzLmNvbm5lY3QoMHgyMCwgR29hVmFsbGV5LCAweDAxKTtcbn1cblxuZnVuY3Rpb24gYWRkWm9tYmllV2FycChyb206IFJvbSkge1xuICAvLyBNYWtlIHNwYWNlIGZvciB0aGUgbmV3IGZsYWcgYmV0d2VlbiBKb2VsIGFuZCBTd2FuXG4gIGZvciAobGV0IGkgPSAweDJmNTsgaSA8IDB4MmZjOyBpKyspIHtcbiAgICByb20ubW92ZUZsYWcoaSwgaSAtIDEpO1xuICB9XG4gIC8vIFVwZGF0ZSB0aGUgbWVudVxuICBjb25zdCBtZXNzYWdlID0gcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MjFdWzBdO1xuICBtZXNzYWdlLnRleHQgPSBbXG4gICAgJyB7MWE6TGVhZn0gICAgICB7MTY6QnJ5bm1hZXJ9IHsxZDpPYWt9ICcsXG4gICAgJ3swYzpOYWRhcmV9XFwncyAgezFlOlBvcnRvYX0gICB7MTQ6QW1hem9uZXN9ICcsXG4gICAgJ3sxOTpKb2VsfSAgICAgIFpvbWJpZSAgIHsyMDpTd2FufSAnLFxuICAgICd7MjM6U2h5cm9ufSAgICB7MTg6R29hfSAgICAgIHsyMTpTYWhhcmF9JyxcbiAgXS5qb2luKCdcXG4nKTtcbiAgLy8gQWRkIGEgdHJpZ2dlciB0byB0aGUgZW50cmFuY2UgLSB0aGVyZSdzIGFscmVhZHkgYSBzcGF3biBmb3IgOGFcbiAgLy8gYnV0IHdlIGNhbid0IHJldXNlIHRoYXQgc2luY2UgaXQncyB0aGUgc2FtZSBhcyB0aGUgb25lIG91dHNpZGVcbiAgLy8gdGhlIG1haW4gRVNJIGVudHJhbmNlOyBzbyByZXVzZSBhIGRpZmZlcmVudCBvbmUuXG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFtdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe30pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmZiXTsgLy8gbmV3IHdhcnAgcG9pbnQgZmxhZ1xuICAvLyBBY3R1YWxseSByZXBsYWNlIHRoZSB0cmlnZ2VyLlxuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuWm9tYmllVG93bi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4OGEpIHtcbiAgICAgIHNwYXduLmlkID0gdHJpZ2dlci5pZDtcbiAgICB9XG4gIH1cbiAgcm9tLnRvd25XYXJwLmxvY2F0aW9ucy5zcGxpY2UoNywgMCwgcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLmlkKTtcbiAgaWYgKHJvbS50b3duV2FycC5sb2NhdGlvbnMucG9wKCkgIT09IDB4ZmYpIHRocm93IG5ldyBFcnJvcigndW5leHBlY3RlZCcpO1xuICAvLyBBU00gZml4ZXMgc2hvdWxkIGhhdmUgaGFwcGVuZWQgaW4gcHJlc2h1ZmZsZS5zXG59XG5cbmZ1bmN0aW9uIGV2aWxTcGlyaXRJc2xhbmRSZXF1aXJlc0RvbHBoaW4ocm9tOiBSb20pIHtcbiAgcm9tLnRyaWdnZXIoMHg4YSkuY29uZGl0aW9ucyA9IFt+MHgwZWVdOyAvLyBuZXcgZmxhZyBmb3IgcmlkaW5nIGRvbHBoaW5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MWRdWzB4MTBdLnRleHQgPSBgVGhlIGNhdmUgZW50cmFuY2UgYXBwZWFyc1xudG8gYmUgdW5kZXJ3YXRlci4gWW91J2xsXG5uZWVkIHRvIHN3aW0uYDtcbn1cblxuZnVuY3Rpb24gcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbTogUm9tKSB7XG4gIC8vIEFsbG93IG9wZW5pbmcgU3dhbiBmcm9tIGVpdGhlciBzaWRlIGJ5IGFkZGluZyBhIHBhaXIgb2YgZ3VhcmRzIG9uIHRoZVxuICAvLyBvcHBvc2l0ZSBzaWRlIG9mIHRoZSBnYXRlLlxuICByb20ubG9jYXRpb25zWzB4NzNdLnNwYXducy5wdXNoKFxuICAgIC8vIE5PVEU6IFNvbGRpZXJzIG11c3QgY29tZSBpbiBwYWlycyAod2l0aCBpbmRleCBeMSBmcm9tIGVhY2ggb3RoZXIpXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBhLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGIsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwZSwgeXQ6IDB4MGEsIHR5cGU6IDIsIGlkOiAweGIzfSksIC8vIG5ldyB0cmlnZ2VyOiBlcmFzZSBndWFyZHNcbiAgKTtcblxuICAvLyBHdWFyZHMgKCQyZCkgYXQgc3dhbiBnYXRlICgkNzMpIH4gc2V0IDEwZCBhZnRlciBvcGVuaW5nIGdhdGUgPT4gY29uZGl0aW9uIGZvciBkZXNwYXduXG4gIHJvbS5ucGNzWzB4MmRdLmxvY2FsRGlhbG9ncy5nZXQoMHg3MykhWzBdLmZsYWdzLnB1c2goMHgxMGQpO1xuXG4gIC8vIERlc3Bhd24gZ3VhcmQgdHJpZ2dlciByZXF1aXJlcyAxMGRcbiAgcm9tLnRyaWdnZXIoMHhiMykuY29uZGl0aW9ucy5wdXNoKDB4MTBkKTtcbn1cblxuZnVuY3Rpb24gbGVhZkVsZGVySW5TYWJyZUhlYWxzKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGxlYWZFbGRlciA9IHJvbS5ucGNzWzB4MGRdO1xuICBjb25zdCBzdW1taXREaWFsb2cgPSBsZWFmRWxkZXIubG9jYWxEaWFsb2dzLmdldCgweDM1KSFbMF07XG4gIHN1bW1pdERpYWxvZy5tZXNzYWdlLmFjdGlvbiA9IDB4MTc7IC8vIGhlYWwgYW5kIGRpc2FwcGVhci5cbn1cblxuZnVuY3Rpb24gcHJldmVudE5wY0Rlc3Bhd25zKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBmdW5jdGlvbiByZW1vdmU8VD4oYXJyOiBUW10sIGVsZW06IFQpOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5pbmRleE9mKGVsZW0pO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCAke2VsZW19IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZUlmPFQ+KGFycjogVFtdLCBwcmVkOiAoZWxlbTogVCkgPT4gYm9vbGVhbik6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmZpbmRJbmRleChwcmVkKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBkaWFsb2coaWQ6IG51bWJlciwgbG9jOiBudW1iZXIgPSAtMSk6IExvY2FsRGlhbG9nW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5sb2NhbERpYWxvZ3MuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBkaWFsb2cgJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBzcGF3bnMoaWQ6IG51bWJlciwgbG9jOiBudW1iZXIpOiBudW1iZXJbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHNwYXduIGNvbmRpdGlvbiAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gTGluayBzb21lIHJlZHVuZGFudCBOUENzOiBLZW5zdSAoN2UsIDc0KSBhbmQgQWthaGFuYSAoODgsIDE2KVxuICAvLyBVc2UgNzQgZm9yIG9ubHkgS2Vuc3UgaW4gZGFuY2UgaGFsbCAtIG5vYm9keSBlbHNlIHdpbGwgYWNjZXB0IHRyYWRlLWluLlxuICByb20ubnBjc1sweDc0XS5saW5rKDB4N2UpO1xuICByb20ubnBjc1sweDc0XS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg3NF0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDdlXS5kYXRhXSBhcyBhbnk7XG4gIHJvbS5sb2NhdGlvbnMuU3dhbl9EYW5jZUhhbGwuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHg3ZSkhLmlkID0gMHg3NDtcbiAgcm9tLml0ZW1zLkxvdmVQZW5kYW50Lml0ZW1Vc2VEYXRhWzBdLndhbnQgPSAweDE3NDtcblxuICAvLyBkaWFsb2cgaXMgc2hhcmVkIGJldHdlZW4gODggYW5kIDE2LlxuICByb20ubnBjc1sweDg4XS5saW5rRGlhbG9nKDB4MTYpO1xuXG4gIC8vIEdpdmVuIEtlbnN1IDdlIGEgZ2xvd2luZyBsYW1wIGluc3RlYWQgb2YgY2hhbmdlIChLZW5zdSA3NCBoYXMgdGhhdCBub3cpXG4gIHJvbS5ucGNzWzB4N2VdLmRhdGFbMF0gPSAweDM5OyAvLyBnbG93aW5nIGxhbXBcblxuICAvLyBNYWtlIGEgbmV3IE5QQyBmb3IgQWthaGFuYSBpbiBCcnlubWFlcjsgb3RoZXJzIHdvbid0IGFjY2VwdCB0aGUgU3RhdHVlIG9mIE9ueXguXG4gIC8vIExpbmtpbmcgc3Bhd24gY29uZGl0aW9ucyBhbmQgZGlhbG9ncyBpcyBzdWZmaWNpZW50LCBzaW5jZSB0aGUgYWN0dWFsIE5QQyBJRFxuICAvLyAoMTYgb3IgODIpIGlzIHdoYXQgbWF0dGVycyBmb3IgdGhlIHRyYWRlLWluXG4gIHJvbS5ucGNzWzB4ODJdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDgyXS5saW5rKDB4MTYpO1xuICByb20ubnBjc1sweDgyXS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4MTZdLmRhdGFdIGFzIGFueTsgLy8gZW5zdXJlIGdpdmUgaXRlbVxuICByb20ubG9jYXRpb25zLkJyeW5tYWVyLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4MTYpIS5pZCA9IDB4ODI7XG4gIHJvbS5pdGVtcy5TdGF0dWVPZk9ueXguaXRlbVVzZURhdGFbMF0ud2FudCA9IDB4MTgyO1xuXG4gIC8vIExlYWYgZWxkZXIgaW4gaG91c2UgKCQwZCBAICRjMCkgfiBzd29yZCBvZiB3aW5kIHJlZHVuZGFudCBmbGFnXG4gIC8vIGRpYWxvZygweDBkLCAweGMwKVsyXS5mbGFncyA9IFtdO1xuICAvL3JvbS5pdGVtR2V0c1sweDAwXS5mbGFncyA9IFtdOyAvLyBjbGVhciByZWR1bmRhbnQgZmxhZ1xuXG4gIC8vIExlYWYgcmFiYml0ICgkMTMpIG5vcm1hbGx5IHN0b3BzIHNldHRpbmcgaXRzIGZsYWcgYWZ0ZXIgcHJpc29uIGRvb3Igb3BlbmVkLFxuICAvLyBidXQgdGhhdCBkb2Vzbid0IG5lY2Vzc2FyaWx5IG9wZW4gbXQgc2FicmUuICBJbnN0ZWFkIChhKSB0cmlnZ2VyIG9uIDA0N1xuICAvLyAoc2V0IGJ5IDhkIHVwb24gZW50ZXJpbmcgZWxkZXIncyBjZWxsKS4gIEFsc28gbWFrZSBzdXJlIHRoYXQgdGhhdCBwYXRoIGFsc29cbiAgLy8gcHJvdmlkZXMgdGhlIG5lZWRlZCBmbGFnIHRvIGdldCBpbnRvIG10IHNhYnJlLlxuICBkaWFsb2coMHgxMylbMl0uY29uZGl0aW9uID0gMHgwNDc7XG4gIGRpYWxvZygweDEzKVsyXS5mbGFncyA9IFsweDBhOV07XG4gIGRpYWxvZygweDEzKVszXS5mbGFncyA9IFsweDBhOV07XG5cbiAgLy8gV2luZG1pbGwgZ3VhcmQgKCQxNCBAICQwZSkgc2hvdWxkbid0IGRlc3Bhd24gYWZ0ZXIgYWJkdWN0aW9uICgwMzgpLFxuICAvLyBidXQgaW5zdGVhZCBhZnRlciBnaXZpbmcgdGhlIGl0ZW0gKDA4OClcbiAgc3Bhd25zKDB4MTQsIDB4MGUpWzFdID0gfjB4MDg4OyAvLyByZXBsYWNlIGZsYWcgfjAzOCA9PiB+MDg4XG4gIC8vZGlhbG9nKDB4MTQsIDB4MGUpWzBdLmZsYWdzID0gW107IC8vIHJlbW92ZSByZWR1bmRhbnQgZmxhZyB+IHdpbmRtaWxsIGtleVxuXG4gIC8vIEFrYWhhbmEgKCQxNiAvIDg4KSB+IHNoaWVsZCByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4MTYsIDB4NTcpWzBdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRpc2FwcGVhciBhZnRlciBnZXR0aW5nIGJhcnJpZXIgKG5vdGUgODgncyBzcGF3bnMgbm90IGxpbmtlZCB0byAxNilcbiAgcmVtb3ZlKHNwYXducygweDE2LCAweDU3KSwgfjB4MDUxKTtcbiAgcmVtb3ZlKHNwYXducygweDg4LCAweDU3KSwgfjB4MDUxKTtcblxuICBmdW5jdGlvbiByZXZlcnNlRGlhbG9nKGRzOiBMb2NhbERpYWxvZ1tdKTogdm9pZCB7XG4gICAgZHMucmV2ZXJzZSgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IG5leHQgPSBkc1tpICsgMV07XG4gICAgICBkc1tpXS5jb25kaXRpb24gPSBuZXh0ID8gfm5leHQuY29uZGl0aW9uIDogfjA7XG4gICAgfVxuICB9O1xuXG4gIC8vIE9hayBlbGRlciAoJDFkKSB+IHN3b3JkIG9mIGZpcmUgcmVkdW5kYW50IGZsYWdcbiAgY29uc3Qgb2FrRWxkZXJEaWFsb2cgPSBkaWFsb2coMHgxZCk7XG4gIC8vb2FrRWxkZXJEaWFsb2dbNF0uZmxhZ3MgPSBbXTtcbiAgLy8gTWFrZSBzdXJlIHRoYXQgd2UgdHJ5IHRvIGdpdmUgdGhlIGl0ZW0gZnJvbSAqYWxsKiBwb3N0LWluc2VjdCBkaWFsb2dzXG4gIG9ha0VsZGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1syXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzNdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcblxuICAvLyBPYWsgbW90aGVyICgkMWUpIH4gaW5zZWN0IGZsdXRlIHJlZHVuZGFudCBmbGFnXG4gIC8vIFRPRE8gLSByZWFycmFuZ2UgdGhlc2UgZmxhZ3MgYSBiaXQgKG1heWJlIH4wNDUsIH4wYTAgfjA0MSAtIHNvIHJldmVyc2UpXG4gIC8vICAgICAgLSB3aWxsIG5lZWQgdG8gY2hhbmdlIGJhbGxPZkZpcmUgYW5kIGluc2VjdEZsdXRlIGluIGRlcGdyYXBoXG4gIGNvbnN0IG9ha01vdGhlckRpYWxvZyA9IGRpYWxvZygweDFlKTtcbiAgKCgpID0+IHtcbiAgICBjb25zdCBba2lsbGVkSW5zZWN0LCBnb3RJdGVtLCBnZXRJdGVtLCBmaW5kQ2hpbGRdID0gb2FrTW90aGVyRGlhbG9nO1xuICAgIGZpbmRDaGlsZC5jb25kaXRpb24gPSB+MHgwNDU7XG4gICAgLy9nZXRJdGVtLmNvbmRpdGlvbiA9IH4weDIyNztcbiAgICAvL2dldEl0ZW0uZmxhZ3MgPSBbXTtcbiAgICBnb3RJdGVtLmNvbmRpdGlvbiA9IH4wO1xuICAgIHJvbS5ucGNzWzB4MWVdLmxvY2FsRGlhbG9ncy5zZXQoLTEsIFtmaW5kQ2hpbGQsIGdldEl0ZW0sIGtpbGxlZEluc2VjdCwgZ290SXRlbV0pO1xuICB9KSgpO1xuICAvLy8gb2FrTW90aGVyRGlhbG9nWzJdLmZsYWdzID0gW107XG4gIC8vIC8vIEVuc3VyZSB3ZSBhbHdheXMgZ2l2ZSBpdGVtIGFmdGVyIGluc2VjdC5cbiAgLy8gb2FrTW90aGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gb2FrTW90aGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gcmV2ZXJzZURpYWxvZyhvYWtNb3RoZXJEaWFsb2cpO1xuXG4gIC8vIFJldmVyc2UgdGhlIG90aGVyIG9hayBkaWFsb2dzLCB0b28uXG4gIGZvciAoY29uc3QgaSBvZiBbMHgyMCwgMHgyMSwgMHgyMiwgMHg3YywgMHg3ZF0pIHtcbiAgICByZXZlcnNlRGlhbG9nKGRpYWxvZyhpKSk7XG4gIH1cblxuICAvLyBTd2FwIHRoZSBmaXJzdCB0d28gb2FrIGNoaWxkIGRpYWxvZ3MuXG4gIGNvbnN0IG9ha0NoaWxkRGlhbG9nID0gZGlhbG9nKDB4MWYpO1xuICBvYWtDaGlsZERpYWxvZy51bnNoaWZ0KC4uLm9ha0NoaWxkRGlhbG9nLnNwbGljZSgxLCAxKSk7XG5cbiAgLy8gVGhyb25lIHJvb20gYmFjayBkb29yIGd1YXJkICgkMzMgQCAkZGYpIHNob3VsZCBoYXZlIHNhbWUgc3Bhd24gY29uZGl0aW9uIGFzIHF1ZWVuXG4gIC8vICgwMjAgTk9UIHF1ZWVuIG5vdCBpbiB0aHJvbmUgcm9vbSBBTkQgMDFiIE5PVCB2aWV3ZWQgbWVzaWEgcmVjb3JkaW5nKVxuICByb20ubnBjc1sweDMzXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZGYsICBbfjB4MDIwLCB+MHgwMWJdKTtcblxuICAvLyBGcm9udCBwYWxhY2UgZ3VhcmQgKCQzNCkgdmFjYXRpb24gbWVzc2FnZSBrZXlzIG9mZiAwMWIgaW5zdGVhZCBvZiAwMWZcbiAgZGlhbG9nKDB4MzQpWzFdLmNvbmRpdGlvbiA9IDB4MDFiO1xuXG4gIC8vIFF1ZWVuJ3MgKCQzOCkgZGlhbG9nIG5lZWRzIHF1aXRlIGEgYml0IG9mIHdvcmtcbiAgLy8gR2l2ZSBpdGVtIChmbHV0ZSBvZiBsaW1lKSBldmVuIGlmIGdvdCB0aGUgc3dvcmQgb2Ygd2F0ZXJcbiAgZGlhbG9nKDB4MzgpWzNdLmNvbmRpdGlvbiA9IDB4MjAyOyAvLyBcInlvdSBmb3VuZCBzd29yZFwiIChjb25kaXRpb24gMjAyKVxuICBkaWFsb2coMHgzOClbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzOyAvLyAgPT4gYWN0aW9uIDNcbiAgLy8gRW5zdXJlIHlvdSBjYW4gYWx3YXlzIG1ha2UgdGhlIHF1ZWVuIGdvIGF3YXkuXG4gIGRpYWxvZygweDM4KVs0XS5mbGFncy5wdXNoKDB4MDljKTsgICAgIC8vIHNldCAwOWMgcXVlZW4gZ29pbmcgYXdheVxuICAvLyBRdWVlbiBzcGF3biBjb25kaXRpb24gZGVwZW5kcyBvbiAwMWIgKG1lc2lhIHJlY29yZGluZykgbm90IDAxZiAoYmFsbCBvZiB3YXRlcilcbiAgLy8gVGhpcyBlbnN1cmVzIHlvdSBoYXZlIGJvdGggc3dvcmQgYW5kIGJhbGwgdG8gZ2V0IHRvIGhlciAoPz8/KVxuICBzcGF3bnMoMHgzOCwgMHhkZilbMV0gPSB+MHgwMWI7ICAvLyB0aHJvbmUgcm9vbTogMDFiIE5PVCBtZXNpYSByZWNvcmRpbmdcbiAgc3Bhd25zKDB4MzgsIDB4ZTEpWzBdID0gMHgwMWI7ICAgLy8gYmFjayByb29tOiAwMWIgbWVzaWEgcmVjb3JkaW5nXG4gIGRpYWxvZygweDM4KVsxXS5jb25kaXRpb24gPSAweDAxYjsgICAgIC8vIHJldmVhbCBjb25kaXRpb246IDAxYiBtZXNpYSByZWNvcmRpbmdcblxuICAvLyBGb3J0dW5lIHRlbGxlciAoJDM5KSBzaG91bGQgYWxzbyBub3Qgc3Bhd24gYmFzZWQgb24gbWVzaWEgcmVjb3JkaW5nIHJhdGhlciB0aGFuIG9yYlxuICBzcGF3bnMoMHgzOSwgMHhkOClbMV0gPSB+MHgwMWI7ICAvLyBmb3J0dW5lIHRlbGxlciByb29tOiAwMWIgTk9UXG5cbiAgLy8gQ2xhcmsgKCQ0NCkgbW92ZXMgYWZ0ZXIgdGFsa2luZyB0byBoaW0gKDA4ZCkgcmF0aGVyIHRoYW4gY2FsbWluZyBzZWEgKDA4ZikuXG4gIC8vIFRPRE8gLSBjaGFuZ2UgMDhkIHRvIHdoYXRldmVyIGFjdHVhbCBpdGVtIGhlIGdpdmVzLCB0aGVuIHJlbW92ZSBib3RoIGZsYWdzXG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlOSwgW34weDA4ZF0pOyAvLyB6b21iaWUgdG93biBiYXNlbWVudFxuICByb20ubnBjc1sweDQ0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZTQsIFsweDA4ZF0pOyAgLy8gam9lbCBzaGVkXG4gIC8vZGlhbG9nKDB4NDQsIDB4ZTkpWzFdLmZsYWdzLnBvcCgpOyAvLyByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuXG4gIC8vIEJyb2thaGFuYSAoJDU0KSB+IHdhcnJpb3IgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDU0KVsyXS5mbGFncyA9IFtdO1xuXG4gIC8vIERlbyAoJDVhKSB+IHBlbmRhbnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1YSlbMV0uZmxhZ3MgPSBbXTtcblxuICAvLyBaZWJ1ICgkNWUpIGNhdmUgZGlhbG9nIChAICQxMClcbiAgLy8gVE9ETyAtIGRpYWxvZ3MoMHg1ZSwgMHgxMCkucmVhcnJhbmdlKH4weDAzYSwgMHgwMGQsIDB4MDM4LCAweDAzOSwgMHgwMGEsIH4weDAwMCk7XG4gIHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5zZXQoMHgxMCwgW1xuICAgIExvY2FsRGlhbG9nLm9mKH4weDAzYSwgWzB4MDAsIDB4MWFdLCBbMHgwM2FdKSwgLy8gMDNhIE5PVCB0YWxrZWQgdG8gemVidSBpbiBjYXZlIC0+IFNldCAwM2FcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMGQsIFsweDAwLCAweDFkXSksIC8vIDAwZCBsZWFmIHZpbGxhZ2VycyByZXNjdWVkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM4LCBbMHgwMCwgMHgxY10pLCAvLyAwMzggbGVhZiBhdHRhY2tlZFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAzOSwgWzB4MDAsIDB4MWRdKSwgLy8gMDM5IGxlYXJuZWQgcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwYSwgWzB4MDAsIDB4MWIsIDB4MDNdKSwgLy8gMDBhIHdpbmRtaWxsIGtleSB1c2VkIC0+IHRlYWNoIHJlZnJlc2hcbiAgICBMb2NhbERpYWxvZy5vZih+MHgwMDAsIFsweDAwLCAweDFkXSksXG4gIF0pO1xuICAvLyBEb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByZW1vdmUoc3Bhd25zKDB4NWUsIDB4MTApLCB+MHgwNTEpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBUb3JuZWwgKCQ1ZikgaW4gc2FicmUgd2VzdCAoJDIxKSB+IHRlbGVwb3J0IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NWYsIDB4MjEpWzFdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NWZdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgyMSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFN0b20gKCQ2MCk6IGRvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NjBdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgxZSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIEFzaW5hICgkNjIpIGluIGJhY2sgcm9vbSAoJGUxKSBnaXZlcyBmbHV0ZSBvZiBsaW1lXG4gIGNvbnN0IGFzaW5hID0gcm9tLm5wY3NbMHg2Ml07XG4gIGFzaW5hLmRhdGFbMV0gPSAweDI4O1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgZGlhbG9nKGFzaW5hLmlkLCAweGUxKVsyXS5tZXNzYWdlLmFjdGlvbiA9IDB4MTE7XG4gIC8vIFByZXZlbnQgZGVzcGF3biBmcm9tIGJhY2sgcm9vbSBhZnRlciBkZWZlYXRpbmcgc2FiZXJhICh+MDhmKVxuICByZW1vdmUoc3Bhd25zKGFzaW5hLmlkLCAweGUxKSwgfjB4MDhmKTtcblxuICAvLyBLZW5zdSBpbiBjYWJpbiAoJDY4IEAgJDYxKSBuZWVkcyB0byBiZSBhdmFpbGFibGUgZXZlbiBhZnRlciB2aXNpdGluZyBKb2VsLlxuICAvLyBDaGFuZ2UgaGltIHRvIGp1c3QgZGlzYXBwZWFyIGFmdGVyIHNldHRpbmcgdGhlIHJpZGVhYmxlIGRvbHBoaW4gZmxhZyAoMDliKSxcbiAgLy8gYW5kIHRvIG5vdCBldmVuIHNob3cgdXAgYXQgYWxsIHVubGVzcyB0aGUgZm9nIGxhbXAgd2FzIHJldHVybmVkICgwMjEpLlxuICByb20ubnBjc1sweDY4XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4NjEsIFt+MHgwOWIsIDB4MDIxXSk7XG4gIGRpYWxvZygweDY4KVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDI7IC8vIGRpc2FwcGVhclxuXG4gIC8vIEF6dGVjYSBpbiBTaHlyb24gKDZlKSBzaG91bGRuJ3Qgc3Bhd24gYWZ0ZXIgbWFzc2FjcmUgKDAyNylcbiAgcm9tLm5wY3NbMHg2ZV0uc3Bhd25Db25kaXRpb25zLmdldCgweGYyKSEucHVzaCh+MHgwMjcpO1xuICAvLyBBbHNvIHRoZSBkaWFsb2cgdHJpZ2dlciAoODIpIHNob3VsZG4ndCBoYXBwZW5cbiAgcm9tLnRyaWdnZXIoMHg4MikuY29uZGl0aW9ucy5wdXNoKH4weDAyNyk7XG5cbiAgLy8gS2Vuc3UgaW4gbGlnaHRob3VzZSAoJDc0LyQ3ZSBAICQ2MikgfiByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDc0LCAweDYyKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIEF6dGVjYSAoJDgzKSBpbiBweXJhbWlkIH4gYm93IG9mIHRydXRoIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmNvbmRpdGlvbiA9IH4weDI0MDsgIC8vIDI0MCBOT1QgYm93IG9mIHRydXRoXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gUmFnZSBibG9ja3Mgb24gc3dvcmQgb2Ygd2F0ZXIsIG5vdCByYW5kb20gaXRlbSBmcm9tIHRoZSBjaGVzdFxuICBkaWFsb2coMHhjMylbMF0uY29uZGl0aW9uID0gMHgyMDI7XG5cbiAgLy8gUmVtb3ZlIHVzZWxlc3Mgc3Bhd24gY29uZGl0aW9uIGZyb20gTWFkbyAxXG4gIHJvbS5ucGNzWzB4YzRdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHhmMik7IC8vIGFsd2F5cyBzcGF3blxuXG4gIC8vIERyYXlnb24gMiAoJGNiIEAgbG9jYXRpb24gJGE2KSBzaG91bGQgZGVzcGF3biBhZnRlciBiZWluZyBkZWZlYXRlZC5cbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLnNldCgweGE2LCBbfjB4MjhkXSk7IC8vIGtleSBvbiBiYWNrIHdhbGwgZGVzdHJveWVkXG5cbiAgLy8gRml4IFplYnUgdG8gZ2l2ZSBrZXkgdG8gc3R4eSBldmVuIGlmIHRodW5kZXIgc3dvcmQgaXMgZ290dGVuIChqdXN0IHN3aXRjaCB0aGVcbiAgLy8gb3JkZXIgb2YgdGhlIGZpcnN0IHR3bykuICBBbHNvIGRvbid0IGJvdGhlciBzZXR0aW5nIDAzYiBzaW5jZSB0aGUgbmV3IEl0ZW1HZXRcbiAgLy8gbG9naWMgb2J2aWF0ZXMgdGhlIG5lZWQuXG4gIGNvbnN0IHplYnVTaHlyb24gPSByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3MuZ2V0KDB4ZjIpITtcbiAgemVidVNoeXJvbi51bnNoaWZ0KC4uLnplYnVTaHlyb24uc3BsaWNlKDEsIDEpKTtcbiAgLy8gemVidVNoeXJvblswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFNoeXJvbiBtYXNzYWNyZSAoJDgwKSByZXF1aXJlcyBrZXkgdG8gc3R4eVxuICByb20udHJpZ2dlcigweDgwKS5jb25kaXRpb25zID0gW1xuICAgIH4weDAyNywgLy8gbm90IHRyaWdnZXJlZCBtYXNzYWNyZSB5ZXRcbiAgICAgMHgwM2IsIC8vIGdvdCBpdGVtIGZyb20ga2V5IHRvIHN0eHkgc2xvdFxuICAgICAweDJmZCwgLy8gc2h5cm9uIHdhcnAgcG9pbnQgdHJpZ2dlcmVkXG4gICAgIC8vIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlciAtIE5PVCBBTlkgTU9SRSFcbiAgXTtcblxuICAvLyBFbnRlciBzaHlyb24gKCQ4MSkgc2hvdWxkIHNldCB3YXJwIG5vIG1hdHRlciB3aGF0XG4gIHJvbS50cmlnZ2VyKDB4ODEpLmNvbmRpdGlvbnMgPSBbXTtcblxuICBpZiAoZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpKSB7XG4gICAgLy8gTGVhcm4gYmFycmllciAoJDg0KSByZXF1aXJlcyBjYWxtIHNlYVxuICAgIHJvbS50cmlnZ2VyKDB4ODQpLmNvbmRpdGlvbnMucHVzaCgweDI4Myk7IC8vIDI4MyBjYWxtZWQgdGhlIHNlYVxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBub3Qgc2V0dGluZyAwNTEgYW5kIGNoYW5naW5nIHRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIGl0ZW1cbiAgfVxuICAvL3JvbS50cmlnZ2VyKDB4ODQpLmZsYWdzID0gW107XG5cbiAgLy8gQWRkIGFuIGV4dHJhIGNvbmRpdGlvbiB0byB0aGUgTGVhZiBhYmR1Y3Rpb24gdHJpZ2dlciAoYmVoaW5kIHplYnUpLiAgVGhpcyBlbnN1cmVzXG4gIC8vIGFsbCB0aGUgaXRlbXMgaW4gTGVhZiBwcm9wZXIgKGVsZGVyIGFuZCBzdHVkZW50KSBhcmUgZ290dGVuIGJlZm9yZSB0aGV5IGRpc2FwcGVhci5cbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKDB4MDNhKTsgLy8gMDNhIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmVcblxuICAvLyBNb3JlIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXJzOlxuICAvLyAxLiBSZW1vdmUgdGhlIDhkIHRyaWdnZXIgaW4gdGhlIGZyb250IG9mIHRoZSBjZWxsLCBzd2FwIGl0IG91dFxuICAvLyAgICBmb3IgYjIgKGxlYXJuIHBhcmFseXNpcykuXG4gIHJvbS50cmlnZ2VyKDB4OGQpLnVzZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9TdW1taXRDYXZlLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCkgc3Bhd24uaWQgPSAweGIyO1xuICB9XG4gIHJlbW92ZUlmKHJvbS5sb2NhdGlvbnMuV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLFxuICAgICAgICAgICBzcGF3biA9PiBzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCk7XG4gIC8vIDIuIFNldCB0aGUgdHJpZ2dlciB0byByZXF1aXJlIGhhdmluZyBraWxsZWQga2VsYmVzcXVlLlxuICByb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zLnB1c2goMHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDMuIEFsc28gc2V0IHRoZSB0cmlnZ2VyIHRvIGZyZWUgdGhlIHZpbGxhZ2VycyBhbmQgdGhlIGVsZGVyLlxuICByb20udHJpZ2dlcigweGIyKS5mbGFncy5wdXNoKH4weDA4NCwgfjB4MDg1LCAweDAwZCk7XG4gIC8vIDQuIERvbid0IHRyaWdnZXIgdGhlIGFiZHVjdGlvbiBpbiB0aGUgZmlyc3QgcGxhY2UgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNS4gRG9uJ3QgdHJpZ2dlciByYWJiaXQgYmxvY2sgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4NikuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNi4gRG9uJ3QgZnJlZSB2aWxsYWdlcnMgZnJvbSB1c2luZyBwcmlzb24ga2V5XG4gIHJvbS5wcmdbMHgxZTBhM10gPSAweGMwO1xuICByb20ucHJnWzB4MWUwYTRdID0gMHgwMDtcblxuICAvLyBUT0RPIC0gYWRkaXRpb25hbCB3b3JrIG9uIGFiZHVjdGlvbiB0cmlnZ2VyOlxuICAvLyAgIC0gZ2V0IHJpZCBvZiB0aGUgZmxhZ3Mgb24ga2V5IHRvIHByaXNvbiB1c2VcbiAgLy8gICAtIGFkZCBhIGNvbmRpdGlvbiB0aGF0IGFiZHVjdGlvbiBkb2Vzbid0IGhhcHBlbiBpZiByZXNjdWVkXG4gIC8vIEdldCByaWQgb2YgQk9USCB0cmlnZ2VycyBpbiBzdW1taXQgY2F2ZSwgIEluc3RlYWQsIHRpZSBldmVyeXRoaW5nXG4gIC8vIHRvIHRoZSBlbGRlciBkaWFsb2cgb24gdG9wXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgc3RpbGwgYWxpdmUsIG1heWJlIGdpdmUgYSBoaW50IGFib3V0IHdlYWtuZXNzXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgZGVhZCB0aGVuIHRlYWNoIHBhcmFseXNpcyBhbmQgc2V0L2NsZWFyIGZsYWdzXG4gIC8vICAgLSBpZiBwYXJhbHlzaXMgbGVhcm5lZCB0aGVuIHNheSBzb21ldGhpbmcgZ2VuZXJpY1xuICAvLyBTdGlsbCBuZWVkIHRvIGtlZXAgdGhlIHRyaWdnZXIgaW4gdGhlIGZyb250IGluIGNhc2Ugbm9cbiAgLy8gYWJkdWN0aW9uIHlldFxuICAvLyAgIC0gaWYgTk9UIHBhcmFseXNpcyBBTkQgaWYgTk9UIGVsZGVyIG1pc3NpbmcgQU5EIGlmIGtlbGJlcXVlIGRlYWRcbiAgLy8gLS0tPiBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHR3byB3YXlzIHRvIGdldCAobGlrZSByZWZyZXNoKT9cbiAgLy9cbiAgLy8gQWxzbyBhZGQgYSBjaGVjayB0aGF0IHRoZSByYWJiaXQgdHJpZ2dlciBpcyBnb25lIGlmIHJlc2N1ZWQhXG5cblxuXG4gIC8vIFBhcmFseXNpcyB0cmlnZ2VyICgkYjIpIH4gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcbiAgLy9yb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zWzBdID0gfjB4MjQyO1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnNoaWZ0KCk7IC8vIHJlbW92ZSAwMzcgbGVhcm5lZCBwYXJhbHlzaXNcblxuICAvLyBMZWFybiByZWZyZXNoIHRyaWdnZXIgKCRiNCkgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjQpLmNvbmRpdGlvbnNbMV0gPSB+MHgyNDE7XG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIDAzOSBsZWFybmVkIHJlZnJlc2hcblxuICAvLyBUZWxlcG9ydCBibG9jayBvbiBtdCBzYWJyZSBpcyBmcm9tIHNwZWxsLCBub3Qgc2xvdFxuICByb20udHJpZ2dlcigweGJhKS5jb25kaXRpb25zWzBdID0gfjB4MjQ0OyAvLyB+MDNmIC0+IH4yNDRcblxuICAvLyBQb3J0b2EgcGFsYWNlIGd1YXJkIG1vdmVtZW50IHRyaWdnZXIgKCRiYikgc3RvcHMgb24gMDFiIChtZXNpYSkgbm90IDAxZiAob3JiKVxuICByb20udHJpZ2dlcigweGJiKS5jb25kaXRpb25zWzFdID0gfjB4MDFiO1xuXG4gIC8vIFJlbW92ZSByZWR1bmRhbnQgdHJpZ2dlciA4YSAoc2xvdCAxNikgaW4gem9tYmlldG93biAoJDY1KVxuICAvLyAgLS0gbm90ZTogbm8gbG9uZ2VyIG5lY2Vzc2FyeSBzaW5jZSB3ZSByZXB1cnBvc2UgaXQgaW5zdGVhZC5cbiAgLy8gY29uc3Qge3pvbWJpZVRvd259ID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gem9tYmllVG93bi5zcGF3bnMgPSB6b21iaWVUb3duLnNwYXducy5maWx0ZXIoeCA9PiAheC5pc1RyaWdnZXIoKSB8fCB4LmlkICE9IDB4OGEpO1xuXG4gIC8vIFJlcGxhY2UgYWxsIGRpYWxvZyBjb25kaXRpb25zIGZyb20gMDBlIHRvIDI0M1xuICBmb3IgKGNvbnN0IG5wYyBvZiByb20ubnBjcykge1xuICAgIGZvciAoY29uc3QgZCBvZiBucGMuYWxsRGlhbG9ncygpKSB7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IDB4MDBlKSBkLmNvbmRpdGlvbiA9IDB4MjQzO1xuICAgICAgaWYgKGQuY29uZGl0aW9uID09PSB+MHgwMGUpIGQuY29uZGl0aW9uID0gfjB4MjQzO1xuICAgIH1cbiAgfVxufVxuXG4vLyBIYXJkIG1vZGUgZmxhZzogSGMgLSB6ZXJvIG91dCB0aGUgc3dvcmQncyBjb2xsaXNpb24gcGxhbmVcbmZ1bmN0aW9uIGRpc2FibGVTdGFicyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG8gb2YgWzB4MDgsIDB4MDksIDB4MjddKSB7XG4gICAgcm9tLm9iamVjdHNbb10uY29sbGlzaW9uUGxhbmUgPSAwO1xuICB9XG4gIC8vIEFsc28gdGFrZSB3YXJyaW9yIHJpbmcgb3V0IG9mIHRoZSBwaWN0dXJlLi4uIDp0cm9sbDpcbiAgLy8gcm9tLml0ZW1HZXRzWzB4MmJdLmlkID0gMHg1YjsgLy8gbWVkaWNhbCBoZXJiIGZyb20gc2Vjb25kIGZsdXRlIG9mIGxpbWUgY2hlY2tcbiAgcm9tLm5wY3NbMHg1NF0uZGF0YVswXSA9IDB4MjA7XG59XG5cbmZ1bmN0aW9uIG9yYnNPcHRpb25hbChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHgxMCwgMHgxNCwgMHgxOCwgMHgxZF0pIHtcbiAgICAvLyAxLiBMb29zZW4gdGVycmFpbiBzdXNjZXB0aWJpbGl0eSBvZiBsZXZlbCAxIHNob3RzXG4gICAgcm9tLm9iamVjdHNbb2JqXS50ZXJyYWluU3VzY2VwdGliaWxpdHkgJj0gfjB4MDQ7XG4gICAgLy8gMi4gSW5jcmVhc2UgdGhlIGxldmVsIHRvIDJcbiAgICByb20ub2JqZWN0c1tvYmpdLmxldmVsID0gMjtcbiAgfVxufVxuIl19