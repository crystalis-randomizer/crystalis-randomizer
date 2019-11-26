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
    rom.items[0x36].itemUseData[0] = 0xa0;
    rom.items[0x36].itemUseData[1] = 0x00;
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
    EastCave3.flags.push(Flag.of({ screen: 0x10, flag: rom.flags.alloc(0x200) }));
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
    rom.items[0x3b].tradeIn[0] = 0x74;
    rom.npcs[0x88].linkDialog(0x16);
    rom.npcs[0x7e].data[0] = 0x39;
    rom.npcs[0x82].used = true;
    rom.npcs[0x82].link(0x16);
    rom.npcs[0x82].data = [...rom.npcs[0x16].data];
    rom.locations.Brynmaer.spawns.find(s => s.isNpc() && s.id === 0x16).id = 0x82;
    rom.items[0x25].tradeIn[0] = 0x82;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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LFNBQVMsQ0FBQyxZQUFZLENBQUM7SUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBUSxFQUFFLEtBQWM7SUFpQi9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFD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QU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDbEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDcEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFFcEMsTUFBTSxZQUFZLEdBQ2QsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkUsTUFBTSxZQUFZLEdBQ2QsY0FBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFekUsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ25CLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsRUFDakUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ3JCLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsRUFDakUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekUsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBUSxFQUFFLEtBQWM7SUFFbEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFHaEQsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUNOLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMvQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUNaLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUcvQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFFckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXJDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENB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QUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUMxQztJQUdELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNkLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FDM0QsQ0FBQztJQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNkLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQzNELENBQUM7SUFDRixJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEVBQUU7UUFFakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckU7SUFDRCxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxFQUFFO1FBRXBDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO0FBQ0gsQ0FBQztBQUFBLENBQUM7QUFFRixTQUFTLGdCQUFnQixDQUFDLEdBQVE7SUFDaEMsTUFBTSxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztJQUV4RCxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRTtRQUMzQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQ2xCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7S0FBQyxDQUFDLENBQUM7SUFHekIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEMsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ04sQ0FBQyxJQUFJLENBQUM7UUFDTixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0IsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDckIsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7SUFHcEIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RCxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFHNUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDL0IsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFRO0lBRTdCLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDbEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVB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RyxJQUFJLENBQUM7SUFLOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBUSxDQUFDO0lBQ3RELEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQy9FLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQVVuQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBSWhDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFNL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtB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QUFHLEtBQUssQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBSS9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFXbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUtuQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFFaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFLdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBR3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV2RCxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQVUxQyxNQUFNLENBQUMsSUFB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QUcsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNoQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssS0FBSztnQkFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUMvQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxLQUFLO2dCQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxLQUFLLENBQUM7U0FDbEQ7S0FDRjtBQUNILENBQUM7QUFHRCxTQUFTLFlBQVksQ0FBQyxHQUFRO0lBQzVCLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ2xDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztLQUNuQztJQUdELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNoQyxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsR0FBUTtJQUM1QixLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFFMUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksQ0FBQztRQUVoRCxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7S0FDNUI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUGVyZm9ybSBpbml0aWFsIGNsZWFudXAvc2V0dXAgb2YgdGhlIFJPTS5cblxuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgTG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlSWR9IGZyb20gJy4uL3JvbS9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtHbG9iYWxEaWFsb2csIExvY2FsRGlhbG9nfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljUHJlUGFyc2UocHJnOiBVaW50OEFycmF5KTogdm9pZCB7XG4gIC8vIFJlbW92ZSB1bnVzZWQgaXRlbS90cmlnZ2VyIGFjdGlvbnNcbiAgcHJnWzB4MWUwNmJdICY9IDc7IC8vIG1lZGljYWwgaGVyYiBub3JtYWwgdXNhZ2UgPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA2Zl0gJj0gNzsgLy8gbWFnaWMgcmluZyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNzNdICY9IDc7IC8vIGZydWl0IG9mIGxpbWUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDc3XSAmPSA3OyAvLyBhbnRpZG90ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwN2JdICY9IDc7IC8vIG9wZWwgc3RhdHVlIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA4NF0gJj0gNzsgLy8gd2FycCBib290cyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNCB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwOWJdICY9IDc7IC8vIHdpbmRtaWxsIGtleSBpdGVtdXNlWzFdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwYjldICY9IDc7IC8vIGdsb3dpbmcgbGFtcCBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluaXN0aWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG5cbiAgLy8gTk9URTogdGhpcyBpcyBkb25lIHZlcnkgZWFybHksIG1ha2Ugc3VyZSBhbnkgcmVmZXJlbmNlcyB0byB3YXJwXG4gIC8vIHBvaW50IGZsYWdzIGFyZSB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIG5ldyBvbmVzIVxuICBhZGRab21iaWVXYXJwKHJvbSk7XG5cbiAgYWRkTWV6YW1lVHJpZ2dlcihyb20pO1xuXG4gIG5vcm1hbGl6ZVN3b3Jkcyhyb20sIGZsYWdzKTtcblxuICBmaXhDb2luU3ByaXRlcyhyb20pO1xuXG4gIG1ha2VCcmFjZWxldHNQcm9ncmVzc2l2ZShyb20pO1xuXG4gIGFkZFRvd2VyRXhpdChyb20pO1xuICByZXZlcnNpYmxlU3dhbkdhdGUocm9tKTtcbiAgYWRqdXN0R29hRm9ydHJlc3NUcmlnZ2Vycyhyb20pO1xuICBwcmV2ZW50TnBjRGVzcGF3bnMocm9tLCBmbGFncyk7XG4gIGxlYWZFbGRlckluU2FicmVIZWFscyhyb20pO1xuICBpZiAoZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSkgcmVxdWlyZUhlYWxlZERvbHBoaW4ocm9tKTtcbiAgaWYgKGZsYWdzLnNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCkpIHJlcXVpcmVUZWxlcGF0aHlGb3JEZW8ocm9tKTtcblxuICBhZGp1c3RJdGVtTmFtZXMocm9tLCBmbGFncyk7XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIG1ha2luZyBhIFRyYW5zZm9ybWF0aW9uIGludGVyZmFjZSwgd2l0aCBvcmRlcmluZyBjaGVja3NcbiAgYWxhcm1GbHV0ZUlzS2V5SXRlbShyb20sIGZsYWdzKTsgLy8gTk9URTogcHJlLXNodWZmbGVcbiAgYnJva2FoYW5hV2FudHNNYWRvMShyb20pO1xuICBpZiAoZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgdGVsZXBvcnRPblRodW5kZXJTd29yZChyb20pO1xuICAgIC8vIG5vdCBTaHlyb25fVGVtcGxlIHNpbmNlIG5vLXRodW5kZXItc3dvcmQtZm9yLW1hc3NhY3JlXG4gICAgcm9tLnRvd25XYXJwLnRodW5kZXJTd29yZFdhcnAgPSBbcm9tLmxvY2F0aW9ucy5TaHlyb24uaWQsIDB4NDFdO1xuICB9IGVsc2Uge1xuICAgIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb20pO1xuICB9XG5cbiAgdW5kZXJncm91bmRDaGFubmVsTGFuZEJyaWRnZShyb20pO1xuICBpZiAoZmxhZ3MuZm9nTGFtcE5vdFJlcXVpcmVkKCkpIGZvZ0xhbXBOb3RSZXF1aXJlZChyb20pO1xuXG4gIGlmIChmbGFncy5hZGRFYXN0Q2F2ZSgpKSB7XG4gICAgZWFzdENhdmUocm9tLCBmbGFncyk7XG4gICAgaWYgKGZsYWdzLmNvbm5lY3RHb2FUb0xlYWYoKSkge1xuICAgICAgY29ubmVjdEdvYVRvTGVhZihyb20pO1xuICAgIH1cbiAgfSBlbHNlIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb20pO1xuICB9XG4gIGV2aWxTcGlyaXRJc2xhbmRSZXF1aXJlc0RvbHBoaW4ocm9tKTtcbiAgY2xvc2VDYXZlRW50cmFuY2VzKHJvbSwgZmxhZ3MpO1xuICBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb20pO1xuICBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tLCBmbGFncyk7XG4gIGlmIChmbGFncy5kaXNhYmxlUmFiYml0U2tpcCgpKSBmaXhSYWJiaXRTa2lwKHJvbSk7XG5cbiAgZml4UmV2ZXJzZVdhbGxzKHJvbSk7XG4gIGlmIChmbGFncy5jaGFyZ2VTaG90c09ubHkoKSkgZGlzYWJsZVN0YWJzKHJvbSk7XG4gIGlmIChmbGFncy5vcmJzT3B0aW9uYWwoKSkgb3Jic09wdGlvbmFsKHJvbSk7XG5cbiAgZml4TWltaWNzKHJvbSk7IC8vIE5PVEU6IGFmdGVyIGFsbCBtaW1pY3Ncbn1cblxuLy8gQWRkcyBhIHRyaWdnZXIgYWN0aW9uIHRvIG1lemFtZS4gIFVzZSA4NyBsZWZ0b3ZlciBmcm9tIHJlc2N1aW5nIHplYnUuXG5mdW5jdGlvbiBhZGRNZXphbWVUcmlnZ2VyKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFt+MHgyZjBdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe2FjdGlvbjogNH0pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmYwXTtcbiAgY29uc3QgbWV6YW1lID0gcm9tLmxvY2F0aW9ucy5NZXphbWVTaHJpbmU7XG4gIG1lemFtZS5zcGF3bnMucHVzaChTcGF3bi5vZih7dGlsZTogMHg4OCwgdHlwZTogMiwgaWQ6IHRyaWdnZXIuaWR9KSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuXG4gIGlmIChmbGFncy5zbG93RG93blRvcm5hZG8oKSkge1xuICAgIC8vIFRPRE8gLSB0b3JuYWRvIChvYmogMTIpID0+IHNwZWVkIDA3IGluc3RlYWQgb2YgMDhcbiAgICAvLyAgICAgIC0gbGlmZXRpbWUgaXMgNDgwID0+IDcwIG1heWJlIHRvbyBsb25nLCA2MCBzd2VldCBzcG90P1xuICAgIGNvbnN0IHRvcm5hZG8gPSByb20ub2JqZWN0c1sweDEyXTtcbiAgICB0b3JuYWRvLnNwZWVkID0gMHgwNztcbiAgICB0b3JuYWRvLmRhdGFbMHgwY10gPSAweDYwOyAvLyBpbmNyZWFzZSBsaWZldGltZSAoNDgwKSBieSAyMCVcbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhDb2luU3ByaXRlcyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWzB4NjAsIDB4NjQsIDB4NjUsIDB4NjYsIDB4NjcsIDB4NjgsXG4gICAgICAgICAgICAgICAgICAgICAgMHg2OSwgMHg2YSwgMHg2YiwgMHg2YywgMHg2ZCwgMHg2Zl0pIHtcbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBbMCwgMSwgMl0pIHtcbiAgICAgIHJvbS5wYXR0ZXJuc1twYWdlIDw8IDYgfCBwYXRdLnBpeGVscyA9IHJvbS5wYXR0ZXJuc1sweDVlIDw8IDYgfCBwYXRdLnBpeGVscztcbiAgICB9XG4gIH1cbiAgcm9tLm9iamVjdHNbMHgwY10ubWV0YXNwcml0ZSA9IDB4YTk7XG59XG5cbi8qKlxuICogRml4IHRoZSBzb2Z0bG9jayB0aGF0IGhhcHBlbnMgd2hlbiB5b3UgZ28gdGhyb3VnaFxuICogYSB3YWxsIGJhY2t3YXJkcyBieSBtb3ZpbmcgdGhlIGV4aXQvZW50cmFuY2UgdGlsZXNcbiAqIHVwIGEgYml0IGFuZCBhZGp1c3Rpbmcgc29tZSB0aWxlRWZmZWN0cyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZpeFJldmVyc2VXYWxscyhyb206IFJvbSkge1xuICAvLyBhZGp1c3QgdGlsZSBlZmZlY3QgZm9yIGJhY2sgdGlsZXMgb2YgaXJvbiB3YWxsXG4gIGZvciAoY29uc3QgdCBpbiBbMHgwNCwgMHgwNSwgMHgwOCwgMHgwOV0pIHtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiYyAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGI1IC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gIH1cbiAgLy8gVE9ETyAtIG1vdmUgYWxsIHRoZSBlbnRyYW5jZXMgdG8geT0yMCBhbmQgZXhpdHMgdG8geXQ9MDFcbn1cblxuLyoqIE1ha2UgYSBsYW5kIGJyaWRnZSBpbiB1bmRlcmdyb3VuZCBjaGFubmVsICovXG5mdW5jdGlvbiB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbTogUm9tKSB7XG4gIGNvbnN0IHt0aWxlc30gPSByb20uc2NyZWVuc1sweGExXTtcbiAgdGlsZXNbMHgyOF0gPSAweDlmO1xuICB0aWxlc1sweDM3XSA9IDB4MjM7XG4gIHRpbGVzWzB4MzhdID0gMHgyMzsgLy8gMHg4ZTtcbiAgdGlsZXNbMHgzOV0gPSAweDIxO1xuICB0aWxlc1sweDQ3XSA9IDB4OGQ7XG4gIHRpbGVzWzB4NDhdID0gMHg4ZjtcbiAgdGlsZXNbMHg1Nl0gPSAweDk5O1xuICB0aWxlc1sweDU3XSA9IDB4OWE7XG4gIHRpbGVzWzB4NThdID0gMHg4Yztcbn1cblxuZnVuY3Rpb24gZm9nTGFtcE5vdFJlcXVpcmVkKHJvbTogUm9tKSB7XG4gIC8vIE5lZWQgdG8gbWFrZSBzZXZlcmFsIGNoYW5nZXMuXG4gIC8vICgxKSBkb2xwaGluIG9ubHkgcmVxdWlyZXMgc2hlbGwgZmx1dGUsIG1ha2UgdGhlIGZsYWcgY2hlY2sgZnJlZSAofjAwMClcbiAgcm9tLml0ZW1zWzB4MzZdLml0ZW1Vc2VEYXRhWzBdID0gMHhhMDtcbiAgcm9tLml0ZW1zWzB4MzZdLml0ZW1Vc2VEYXRhWzFdID0gMHgwMDtcbiAgLy8gKDIpIGtlbnN1IDY4IChANjEpIGRyb3BzIGFuIGl0ZW0gKDY3IG1hZ2ljIHJpbmcpXG4gIHJvbS5ucGNzWzB4NjhdLmRhdGFbMF0gPSAweDY3O1xuICByb20ubnBjc1sweDY4XS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDBhO1xuICByb20ubnBjc1sweDY4XS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0uZmxhZ3MgPSBbXTtcbiAgcm9tLm5wY3NbMHg2OF0uc3Bhd25Db25kaXRpb25zLnNldCgweDYxLCBbMHgyMSwgfjB4MGMxXSlcbiAgLy8gKDMpIGZpc2hlcm1hbiA2NCBzcGF3bnMgb24gZm9nIGxhbXAgcmF0aGVyIHRoYW4gc2hlbGwgZmx1dGVcbiAgcm9tLm5wY3NbMHg2NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGQ2LCBbMHgyMzVdKTtcblxuICAvLyAoNCkgZml4IHVwIGl0ZW1nZXQgNjcgZnJvbSBpdGVtZ2V0IDY0IChkZWxldGUgdGhlIGZsYWcpXG4gIHJvbS5pdGVtR2V0c1sweDY0XS5mbGFncyA9IFtdO1xuICByb20uaXRlbUdldHNbMHg2N10uY29weUZyb20ocm9tLml0ZW1HZXRzWzB4NjRdKTtcbiAgcm9tLml0ZW1HZXRzWzB4NjddLmZsYWdzID0gWzB4MGMxXTtcblxuICAvLyBUT0RPIC0gZ3JhcGhpY3Mgc2NyZXdlZCB1cCAtIGZpZ3VyZSBvdXQgaWYgb2JqZWN0IGFjdGlvbiBpcyBjaGFuZ2luZ1xuICAvLyB0aGUgcGF0dGVybiB0YWJsZXMgYmFzZWQgb24gKGUuZy4pICQ2MDAseCBtYXliZT8gIENhbiB3ZSBwcmV2ZW50IGl0P1xuXG4gIC8vIFRPRE8gLSBhZGQgYSBub3RlcyBmaWxlIGFib3V0IHRoaXMuXG5cbn1cblxuLyoqXG4gKiBSZW1vdmUgdGltZXIgc3Bhd25zLCByZW51bWJlcnMgbWltaWMgc3Bhd25zIHNvIHRoYXQgdGhleSdyZSB1bmlxdWUuXG4gKiBSdW5zIGJlZm9yZSBzaHVmZmxlIGJlY2F1c2Ugd2UgbmVlZCB0byBpZGVudGlmeSB0aGUgc2xvdC4gIFJlcXVpcmVzXG4gKiBhbiBhc3NlbWJseSBjaGFuZ2UgKCQzZDNmZCBpbiBwcmVzaHVmZmxlLnMpXG4gKi9cbmZ1bmN0aW9uIGZpeE1pbWljcyhyb206IFJvbSk6IHZvaWQge1xuICBsZXQgbWltaWMgPSAweDcwO1xuICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghcy5pc0NoZXN0KCkpIGNvbnRpbnVlO1xuICAgICAgcy50aW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKHMuaWQgPj0gMHg3MCkgcy5pZCA9IG1pbWljKys7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBmaW5kIGEgYmV0dGVyIHdheSB0byBidW5kbGUgYXNtIGNoYW5nZXM/XG4gIC8vIHJvbS5hc3NlbWJsZSgpXG4gIC8vICAgICAuJCgnYWRjICQxMCcpXG4gIC8vICAgICAuYmVxKCdsYWJlbCcpXG4gIC8vICAgICAubHNoKClcbiAgLy8gICAgIC5sc2goYCR7YWRkcn0seGApXG4gIC8vICAgICAubGFiZWwoJ2xhYmVsJyk7XG4gIC8vIHJvbS5wYXRjaCgpXG4gIC8vICAgICAub3JnKDB4M2QzZmQpXG4gIC8vICAgICAuYnl0ZSgweGIwKTtcbn1cblxuZnVuY3Rpb24gYWRqdXN0R29hRm9ydHJlc3NUcmlnZ2Vycyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gTW92ZSBLZWxiZXNxdWUgMiBvbmUgZnVsbCB0aWxlIGxlZnQuXG4gIGwuR29hRm9ydHJlc3NfS2VsYmVzcXVlLnNwYXduc1swXS54IC09IDE2O1xuICAvLyBSZW1vdmUgc2FnZSBzY3JlZW4gbG9ja3MgKGV4Y2VwdCBLZW5zdSkuXG4gIGwuR29hRm9ydHJlc3NfWmVidS5zcGF3bnMuc3BsaWNlKDEsIDEpOyAvLyB6ZWJ1IHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Ub3JuZWwuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gdG9ybmVsIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Bc2luYS5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyBhc2luYSBzY3JlZW4gbG9jayB0cmlnZ2VyXG59XG5cbmZ1bmN0aW9uIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGNvbnN0IHtXYXRlcmZhbGxDYXZlNH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE1vdmUgYWxhcm0gZmx1dGUgdG8gdGhpcmQgcm93XG4gIHJvbS5pdGVtR2V0c1sweDMxXS5pbnZlbnRvcnlSb3dTdGFydCA9IDB4MjA7XG4gIC8vIEVuc3VyZSBhbGFybSBmbHV0ZSBjYW5ub3QgYmUgZHJvcHBlZFxuICAvLyByb20ucHJnWzB4MjEwMjFdID0gMHg0MzsgLy8gVE9ETyAtIHJvbS5pdGVtc1sweDMxXS4/Pz9cbiAgcm9tLml0ZW1zWzB4MzFdLnVuaXF1ZSA9IHRydWU7XG4gIC8vIEVuc3VyZSBhbGFybSBmbHV0ZSBjYW5ub3QgYmUgc29sZFxuICByb20uaXRlbXNbMHgzMV0uYmFzZVByaWNlID0gMDtcblxuICBpZiAoZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIFBlcnNvbiAxNCAoWmVidSdzIHN0dWRlbnQpOiBzZWNvbmRhcnkgaXRlbSAtPiBhbGFybSBmbHV0ZVxuICAgIHJvbS5ucGNzWzB4MTRdLmRhdGFbMV0gPSAweDMxOyAvLyBOT1RFOiBDbG9iYmVycyBzaHVmZmxlZCBpdGVtISEhXG4gIH0gZWxzZSB7XG4gICAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4ZmY7IC8vIGluZGljYXRlIG5vdGhpbmcgdGhlcmU6IG5vIHNsb3QuXG4gIH1cblxuICAvLyBSZW1vdmUgYWxhcm0gZmx1dGUgZnJvbSBzaG9wcyAocmVwbGFjZSB3aXRoIG90aGVyIGl0ZW1zKVxuICAvLyBOT1RFIC0gd2UgY291bGQgc2ltcGxpZnkgdGhpcyB3aG9sZSB0aGluZyBieSBqdXN0IGhhcmRjb2RpbmcgaW5kaWNlcy5cbiAgLy8gICAgICAtIGlmIHRoaXMgaXMgZ3VhcmFudGVlZCB0byBoYXBwZW4gZWFybHksIGl0J3MgYWxsIHRoZSBzYW1lLlxuICBjb25zdCByZXBsYWNlbWVudHMgPSBbXG4gICAgWzB4MjEsIDAuNzJdLCAvLyBmcnVpdCBvZiBwb3dlciwgNzIlIG9mIGNvc3RcbiAgICBbMHgxZiwgMC45XSwgLy8gbHlzaXMgcGxhbnQsIDkwJSBvZiBjb3N0XG4gIF07XG4gIGxldCBqID0gMDtcbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzaG9wLmNvbnRlbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc2hvcC5jb250ZW50c1tpXSAhPT0gMHgzMSkgY29udGludWU7XG4gICAgICBjb25zdCBbaXRlbSwgcHJpY2VSYXRpb10gPSByZXBsYWNlbWVudHNbKGorKykgJSByZXBsYWNlbWVudHMubGVuZ3RoXTtcbiAgICAgIHNob3AuY29udGVudHNbaV0gPSBpdGVtO1xuICAgICAgaWYgKHJvbS5zaG9wRGF0YVRhYmxlc0FkZHJlc3MpIHtcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBicm9rZW4gLSBuZWVkIGEgY29udHJvbGxlZCB3YXkgdG8gY29udmVydCBwcmljZSBmb3JtYXRzXG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gTWF0aC5yb3VuZChzaG9wLnByaWNlc1tpXSAqIHByaWNlUmF0aW8pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENoYW5nZSBmbHV0ZSBvZiBsaW1lIGNoZXN0J3MgKG5vdy11bnVzZWQpIGl0ZW1nZXQgdG8gaGF2ZSBtZWRpY2FsIGhlcmJcbiAgcm9tLml0ZW1HZXRzWzB4NWJdLml0ZW1JZCA9IDB4MWQ7XG4gIC8vIENoYW5nZSB0aGUgYWN0dWFsIHNwYXduIGZvciB0aGF0IGNoZXN0IHRvIGJlIHRoZSBtaXJyb3JlZCBzaGllbGQgY2hlc3RcbiAgV2F0ZXJmYWxsQ2F2ZTQuc3Bhd24oMHgxOSkuaWQgPSAweDEwO1xuXG4gIC8vIFRPRE8gLSByZXF1aXJlIG5ldyBjb2RlIGZvciB0d28gdXNlc1xufVxuXG5mdW5jdGlvbiBicm9rYWhhbmFXYW50c01hZG8xKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGJyb2thaGFuYSA9IHJvbS5ucGNzWzB4NTRdO1xuICBjb25zdCBkaWFsb2cgPSBhc3NlcnQoYnJva2FoYW5hLmxvY2FsRGlhbG9ncy5nZXQoLTEpKVswXTtcbiAgaWYgKGRpYWxvZy5jb25kaXRpb24gIT09IH4weDAyNCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQmFkIGJyb2thaGFuYSBjb25kaXRpb246ICR7ZGlhbG9nLmNvbmRpdGlvbn1gKTtcbiAgfVxuICBkaWFsb2cuY29uZGl0aW9uID0gfjB4MDY3OyAvLyB2YW5pbGxhIGJhbGwgb2YgdGh1bmRlciAvIGRlZmVhdGVkIG1hZG8gMVxufVxuXG5mdW5jdGlvbiByZXF1aXJlSGVhbGVkRG9scGhpbihyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3JtYWxseSB0aGUgZmlzaGVybWFuICgkNjQpIHNwYXducyBpbiBoaXMgaG91c2UgKCRkNikgaWYgeW91IGhhdmVcbiAgLy8gdGhlIHNoZWxsIGZsdXRlICgyMzYpLiAgSGVyZSB3ZSBhbHNvIGFkZCBhIHJlcXVpcmVtZW50IG9uIHRoZSBoZWFsZWRcbiAgLy8gZG9scGhpbiBzbG90ICgwMjUpLCB3aGljaCB3ZSBrZWVwIGFyb3VuZCBzaW5jZSBpdCdzIGFjdHVhbGx5IHVzZWZ1bC5cbiAgcm9tLm5wY3NbMHg2NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGQ2LCBbMHgyMzYsIDB4MDI1XSk7XG4gIC8vIEFsc28gZml4IGRhdWdodGVyJ3MgZGlhbG9nICgkN2IpLlxuICBjb25zdCBkYXVnaHRlckRpYWxvZyA9IHJvbS5ucGNzWzB4N2JdLmxvY2FsRGlhbG9ncy5nZXQoLTEpITtcbiAgZGF1Z2h0ZXJEaWFsb2cudW5zaGlmdChkYXVnaHRlckRpYWxvZ1swXS5jbG9uZSgpKTtcbiAgZGF1Z2h0ZXJEaWFsb2dbMF0uY29uZGl0aW9uID0gfjB4MDI1O1xuICBkYXVnaHRlckRpYWxvZ1sxXS5jb25kaXRpb24gPSB+MHgyMzY7XG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVUZWxlcGF0aHlGb3JEZW8ocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gTm90IGhhdmluZyB0ZWxlcGF0aHkgKDI0Mykgd2lsbCB0cmlnZ2VyIGEgXCJreXUga3l1XCIgKDFhOjEyLCAxYToxMykgZm9yXG4gIC8vIGJvdGggZ2VuZXJpYyBidW5uaWVzICg1OSkgYW5kIGRlbyAoNWEpLlxuICByb20ubnBjc1sweDU5XS5nbG9iYWxEaWFsb2dzLnB1c2goR2xvYmFsRGlhbG9nLm9mKH4weDI0MywgWzB4MWEsIDB4MTJdKSk7XG4gIHJvbS5ucGNzWzB4NWFdLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxM10pKTtcbn1cblxuZnVuY3Rpb24gdGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBpdGVtZ2V0IDAzIHN3b3JkIG9mIHRodW5kZXIgPT4gc2V0IDJmZCBzaHlyb24gd2FycCBwb2ludFxuICByb20uaXRlbUdldHNbMHgwM10uZmxhZ3MucHVzaCgweDJmZCk7XG4gIC8vIGRpYWxvZyA2MiBhc2luYSBpbiBmMi9mNCBzaHlyb24gLT4gYWN0aW9uIDFmICh0ZWxlcG9ydCB0byBzdGFydClcbiAgLy8gICAtIG5vdGU6IGYyIGFuZCBmNCBkaWFsb2dzIGFyZSBsaW5rZWQuXG4gIGZvciAoY29uc3QgaSBvZiBbMCwgMSwgM10pIHtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbMHhmMiwgMHhmNF0pIHtcbiAgICAgIHJvbS5ucGNzWzB4NjJdLmxvY2FsRGlhbG9ncy5nZXQobG9jKSFbaV0ubWVzc2FnZS5hY3Rpb24gPSAweDFmO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gQ2hhbmdlIHN3b3JkIG9mIHRodW5kZXIncyBhY3Rpb24gdG8gYmJlIHRoZSBzYW1lIGFzIG90aGVyIHN3b3JkcyAoMTYpXG4gIHJvbS5pdGVtR2V0c1sweDAzXS5hY3F1aXNpdGlvbkFjdGlvbi5hY3Rpb24gPSAweDE2O1xufVxuXG5mdW5jdGlvbiBhZGp1c3RJdGVtTmFtZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGlmIChmbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgIC8vIHJlbmFtZSBsZWF0aGVyIGJvb3RzIHRvIHNwZWVkIGJvb3RzXG4gICAgY29uc3QgbGVhdGhlckJvb3RzID0gcm9tLml0ZW1zWzB4MmZdITtcbiAgICBsZWF0aGVyQm9vdHMubWVudU5hbWUgPSAnU3BlZWQgQm9vdHMnO1xuICAgIGxlYXRoZXJCb290cy5tZXNzYWdlTmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgaWYgKGZsYWdzLmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSkge1xuICAgICAgY29uc3QgZ2FzTWFzayA9IHJvbS5pdGVtc1sweDI5XTtcbiAgICAgIGdhc01hc2subWVudU5hbWUgPSAnSGF6bWF0IFN1aXQnO1xuICAgICAgZ2FzTWFzay5tZXNzYWdlTmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuYW1lIGJhbGxzIHRvIG9yYnNcbiAgZm9yIChsZXQgaSA9IDB4MDU7IGkgPCAweDBjOyBpICs9IDIpIHtcbiAgICByb20uaXRlbXNbaV0ubWVudU5hbWUgPSByb20uaXRlbXNbaV0ubWVudU5hbWUucmVwbGFjZSgnQmFsbCcsICdPcmInKTtcbiAgICByb20uaXRlbXNbaV0ubWVzc2FnZU5hbWUgPSByb20uaXRlbXNbaV0ubWVzc2FnZU5hbWUucmVwbGFjZSgnQmFsbCcsICdPcmInKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlQnJhY2VsZXRzUHJvZ3Jlc3NpdmUocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gdG9ybmVsJ3MgdHJpZ2dlciBuZWVkcyBib3RoIGl0ZW1zXG4gIGNvbnN0IHRvcm5lbCA9IHJvbS5ucGNzWzB4NWZdO1xuICBjb25zdCB2YW5pbGxhID0gdG9ybmVsLmxvY2FsRGlhbG9ncy5nZXQoMHgyMSkhO1xuICBjb25zdCBwYXRjaGVkID0gW1xuICAgIHZhbmlsbGFbMF0sIC8vIGFscmVhZHkgbGVhcm5lZCB0ZWxlcG9ydFxuICAgIHZhbmlsbGFbMl0sIC8vIGRvbid0IGhhdmUgdG9ybmFkbyBicmFjZWxldFxuICAgIHZhbmlsbGFbMl0uY2xvbmUoKSwgLy8gd2lsbCBjaGFuZ2UgdG8gZG9uJ3QgaGF2ZSBvcmJcbiAgICB2YW5pbGxhWzFdLCAvLyBoYXZlIGJyYWNlbGV0LCBsZWFybiB0ZWxlcG9ydFxuICBdO1xuICBwYXRjaGVkWzFdLmNvbmRpdGlvbiA9IH4weDIwNjsgLy8gZG9uJ3QgaGF2ZSBicmFjZWxldFxuICBwYXRjaGVkWzJdLmNvbmRpdGlvbiA9IH4weDIwNTsgLy8gZG9uJ3QgaGF2ZSBvcmJcbiAgcGF0Y2hlZFszXS5jb25kaXRpb24gPSB+MDsgICAgIC8vIGRlZmF1bHRcbiAgdG9ybmVsLmxvY2FsRGlhbG9ncy5zZXQoMHgyMSwgcGF0Y2hlZCk7XG59XG5cbmZ1bmN0aW9uIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2YgW3JvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5FYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5LaXJpc2FNZWFkb3ddKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIHNldCB0aGUgbmV3IFwiaW52aXNpYmxlXCIgZmxhZyBvbiB0aGUgY2hlc3QuXG4gICAgICBpZiAoc3Bhd24uaXNDaGVzdCgpKSBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgfVxuICB9XG59XG5cbi8vIEFkZCB0aGUgc3RhdHVlIG9mIG9ueXggYW5kIHBvc3NpYmx5IHRoZSB0ZWxlcG9ydCBibG9jayB0cmlnZ2VyIHRvIENvcmRlbCBXZXN0XG5mdW5jdGlvbiBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIGNvbnN0IHtDb3JkZWxQbGFpbkVhc3QsIENvcmRlbFBsYWluV2VzdH0gPSByb20ubG9jYXRpb25zO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIENvcmRlbFBsYWluRWFzdC5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNDaGVzdCgpIHx8IChmbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiYgc3Bhd24uaXNUcmlnZ2VyKCkpKSB7XG4gICAgICAvLyBDb3B5IGlmICgxKSBpdCdzIHRoZSBjaGVzdCwgb3IgKDIpIHdlJ3JlIGRpc2FibGluZyB0ZWxlcG9ydCBza2lwXG4gICAgICBDb3JkZWxQbGFpbldlc3Quc3Bhd25zLnB1c2goc3Bhd24uY2xvbmUoKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpeFJhYmJpdFNraXAocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9NYWluLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4Nikge1xuICAgICAgaWYgKHNwYXduLnggPT09IDB4NzQwKSB7XG4gICAgICAgIHNwYXduLnggKz0gMTY7XG4gICAgICAgIHNwYXduLnkgKz0gMTY7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFRvd2VyRXhpdChyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7VG93ZXJFbnRyYW5jZSwgQ3J5cHRfVGVsZXBvcnRlcn0gPSByb20ubG9jYXRpb25zO1xuICBjb25zdCBlbnRyYW5jZSA9IENyeXB0X1RlbGVwb3J0ZXIuZW50cmFuY2VzLmxlbmd0aDtcbiAgY29uc3QgZGVzdCA9IENyeXB0X1RlbGVwb3J0ZXIuaWQ7XG4gIENyeXB0X1RlbGVwb3J0ZXIuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3RpbGU6IDB4Njh9KSk7XG4gIFRvd2VyRW50cmFuY2UuZXhpdHMucHVzaChFeGl0Lm9mKHt0aWxlOiAweDU3LCBkZXN0LCBlbnRyYW5jZX0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTgsIGRlc3QsIGVudHJhbmNlfSkpO1xufVxuXG4vLyBQcm9ncmFtbWF0aWNhbGx5IGFkZCBhIGhvbGUgYmV0d2VlbiB2YWxsZXkgb2Ygd2luZCBhbmQgbGltZSB0cmVlIHZhbGxleVxuZnVuY3Rpb24gY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtWYWxsZXlPZldpbmQsIExpbWVUcmVlVmFsbGV5fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgVmFsbGV5T2ZXaW5kLnNjcmVlbnNbNV1bNF0gPSAweDEwOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzFdWzBdID0gMHgxYTsgLy8gbmV3IGV4aXRcbiAgTGltZVRyZWVWYWxsZXkuc2NyZWVuc1syXVswXSA9IDB4MGM7IC8vIG5pY2VyIG1vdW50YWluc1xuXG4gIGNvbnN0IHdpbmRFbnRyYW5jZSA9XG4gICAgICBWYWxsZXlPZldpbmQuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3g6IDB4NGVmLCB5OiAweDU3OH0pKSAtIDE7XG4gIGNvbnN0IGxpbWVFbnRyYW5jZSA9XG4gICAgICBMaW1lVHJlZVZhbGxleS5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHgwMTAsIHk6IDB4MWMwfSkpIC0gMTtcblxuICBWYWxsZXlPZldpbmQuZXhpdHMucHVzaChcbiAgICAgIEV4aXQub2Yoe3g6IDB4NGYwLCB5OiAweDU2MCwgZGVzdDogMHg0MiwgZW50cmFuY2U6IGxpbWVFbnRyYW5jZX0pLFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTcwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSkpO1xuICBMaW1lVHJlZVZhbGxleS5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHgwMDAsIHk6IDB4MWIwLCBkZXN0OiAweDAzLCBlbnRyYW5jZTogd2luZEVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYzAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSk7XG59XG5cbmZ1bmN0aW9uIGNsb3NlQ2F2ZUVudHJhbmNlcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gUHJldmVudCBzb2Z0bG9jayBmcm9tIGV4aXRpbmcgc2VhbGVkIGNhdmUgYmVmb3JlIHdpbmRtaWxsIHN0YXJ0ZWRcbiAgcm9tLmxvY2F0aW9ucy5WYWxsZXlPZldpbmQuZW50cmFuY2VzWzFdLnkgKz0gMTY7XG5cbiAgLy8gQ2xlYXIgdGlsZXMgMSwyLDMsNCBmb3IgYmxvY2thYmxlIGNhdmVzIGluIHRpbGVzZXRzIDkwLCA5NCwgYW5kIDljXG4gIHJvbS5zd2FwTWV0YXRpbGVzKFsweDkwXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MDcsIFsweDAxLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwZSwgWzB4MDIsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDIwLCBbMHgwMywgMHgwYV0sIH4weGQ3XSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjEsIFsweDA0LCAweDBhXSwgfjB4ZDddKTtcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTQsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgICBbMHg2OCwgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDgzLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODgsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuXG4gIC8vIE5vdyByZXBsYWNlIHRoZSB0aWxlcyB3aXRoIHRoZSBibG9ja2FibGUgb25lc1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDM4XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzldID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHg0OF0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ5XSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg3OV0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDdhXSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4ODldID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4YV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NDhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDU4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NTldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDU2XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTddID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg2Nl0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY3XSA9IDB4MDQ7XG5cbiAgLy8gRGVzdHJ1Y3R1cmUgb3V0IGEgZmV3IGxvY2F0aW9ucyBieSBuYW1lXG4gIGNvbnN0IHtcbiAgICBDb3JkZWxQbGFpbldlc3QsXG4gICAgQ29yZGVsUGxhaW5FYXN0LFxuICAgIERlc2VydDIsXG4gICAgR29hVmFsbGV5LFxuICAgIExpbWVUcmVlVmFsbGV5LFxuICAgIEtpcmlzYU1lYWRvdyxcbiAgICBTYWhhcmFPdXRzaWRlQ2F2ZSxcbiAgICBWYWxsZXlPZldpbmQsXG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsXG4gICAgV2F0ZXJmYWxsVmFsbGV5U291dGgsXG4gIH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE5PVEU6IGZsYWcgMmYwIGlzIEFMV0FZUyBzZXQgLSB1c2UgaXQgYXMgYSBiYXNlbGluZS5cbiAgY29uc3QgZmxhZ3NUb0NsZWFyOiBbTG9jYXRpb24sIG51bWJlcl1bXSA9IFtcbiAgICBbVmFsbGV5T2ZXaW5kLCAweDMwXSwgLy8gdmFsbGV5IG9mIHdpbmQsIHplYnUncyBjYXZlXG4gICAgW0NvcmRlbFBsYWluV2VzdCwgMHgzMF0sIC8vIGNvcmRlbCB3ZXN0LCB2YW1waXJlIGNhdmVcbiAgICBbQ29yZGVsUGxhaW5FYXN0LCAweDMwXSwgLy8gY29yZGVsIGVhc3QsIHZhbXBpcmUgY2F2ZVxuICAgIFtXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgcHJpc29uIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MTRdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIGZvZyBsYW1wXG4gICAgW1dhdGVyZmFsbFZhbGxleVNvdXRoLCAweDc0XSwgLy8gd2F0ZXJmYWxsIHNvdXRoLCBraXJpc2FcbiAgICBbS2lyaXNhTWVhZG93LCAweDEwXSwgLy8ga2lyaXNhIG1lYWRvd1xuICAgIFtTYWhhcmFPdXRzaWRlQ2F2ZSwgMHgwMF0sIC8vIGNhdmUgdG8gZGVzZXJ0XG4gICAgW0Rlc2VydDIsIDB4NDFdLFxuICBdO1xuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSAmJiBmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIGZsYWdzVG9DbGVhci5wdXNoKFtMaW1lVHJlZVZhbGxleSwgMHgxMF0pO1xuICB9XG4gIGlmIChmbGFncy5jb25uZWN0R29hVG9MZWFmKCkpIHtcbiAgICBmbGFnc1RvQ2xlYXIucHVzaChbR29hVmFsbGV5LCAweDAxXSk7XG4gIH1cbiAgZm9yIChjb25zdCBbbG9jLCB5eF0gb2YgZmxhZ3NUb0NsZWFyKSB7XG4gICAgbG9jLmZsYWdzLnB1c2goRmxhZy5vZih7eXgsIGZsYWc6IDB4MmYwfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwbGFjZUZsYWcobG9jOiBMb2NhdGlvbiwgeXg6IG51bWJlciwgZmxhZzogbnVtYmVyKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBmIG9mIGxvYy5mbGFncykge1xuICAgICAgaWYgKGYueXggPT09IHl4KSB7XG4gICAgICAgIGYuZmxhZyA9IGZsYWc7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBmbGFnIHRvIHJlcGxhY2UgYXQgJHtsb2N9OiR7eXh9YCk7XG4gIH07XG5cbiAgaWYgKGZsYWdzLnBhcmFseXNpc1JlcXVpcmVzUHJpc29uS2V5KCkpIHsgLy8gY2xvc2Ugb2ZmIHJldmVyc2UgZW50cmFuY2VzXG4gICAgLy8gTk9URTogd2UgY291bGQgYWxzbyBjbG9zZSBpdCBvZmYgdW50aWwgYm9zcyBraWxsZWQuLi4/XG4gICAgLy8gIC0gY29uc3QgdmFtcGlyZUZsYWcgPSB+cm9tLm5wY1NwYXduc1sweGMwXS5jb25kaXRpb25zWzB4MGFdWzBdO1xuICAgIC8vICAtPiBrZWxiZXNxdWUgZm9yIHRoZSBvdGhlciBvbmUuXG4gICAgY29uc3Qgd2luZG1pbGxGbGFnID0gMHgyZWU7XG4gICAgcmVwbGFjZUZsYWcoQ29yZGVsUGxhaW5XZXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluRWFzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcblxuICAgIHJlcGxhY2VGbGFnKFdhdGVyZmFsbFZhbGxleU5vcnRoLCAweDAwLCAweDJkOCk7IC8vIGtleSB0byBwcmlzb24gZmxhZ1xuICAgIGNvbnN0IGV4cGxvc2lvbiA9IFNwYXduLm9mKHt5OiAweDA2MCwgeDogMHgwNjAsIHR5cGU6IDQsIGlkOiAweDJjfSk7XG4gICAgY29uc3Qga2V5VHJpZ2dlciA9IFNwYXduLm9mKHt5OiAweDA3MCwgeDogMHgwNzAsIHR5cGU6IDIsIGlkOiAweGFkfSk7XG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLnNwbGljZSgxLCAwLCBleHBsb3Npb24pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5wdXNoKGtleVRyaWdnZXIpO1xuICB9XG5cbiAgLy8gcm9tLmxvY2F0aW9uc1sweDE0XS50aWxlRWZmZWN0cyA9IDB4YjM7XG5cbiAgLy8gZDcgZm9yIDM/XG5cbiAgLy8gVE9ETyAtIHRoaXMgZW5kZWQgdXAgd2l0aCBtZXNzYWdlIDAwOjAzIGFuZCBhbiBhY3Rpb24gdGhhdCBnYXZlIGJvdyBvZiBtb29uIVxuXG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5tZXNzYWdlLnBhcnQgPSAweDFiO1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5pbmRleCA9IDB4MDg7XG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5mbGFncy5wdXNoKDB4MmY2LCAweDJmNywgMHgyZjgpO1xufVxuXG4vLyBAdHMtaWdub3JlOiBub3QgeWV0IHVzZWRcbmZ1bmN0aW9uIGVhc3RDYXZlKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBUT0RPIGZpbGwgdXAgZ3JhcGhpY3MsIGV0YyAtLT4gJDFhLCAkMWIsICQwNSAvICQ4OCwgJGI1IC8gJDE0LCAkMDJcbiAgLy8gVGhpbmsgYW9idXQgZXhpdHMgYW5kIGVudHJhbmNlcy4uLj9cblxuICBjb25zdCB7VmFsbGV5T2ZXaW5kLCBMaW1lVHJlZVZhbGxleSwgU2VhbGVkQ2F2ZTF9ID0gcm9tLmxvY2F0aW9ucztcblxuICBjb25zdCBsb2MxID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMSk7XG4gIGNvbnN0IGxvYzIgPSByb20ubG9jYXRpb25zLmFsbG9jYXRlKHJvbS5sb2NhdGlvbnMuRWFzdENhdmUyKTtcbiAgY29uc3QgbG9jMyA9IHJvbS5sb2NhdGlvbnMuRWFzdENhdmUzO1xuXG4gIC8vIE5PVEU6IDB4OWMgY2FuIGJlY29tZSAweDk5IGluIHRvcCBsZWZ0IG9yIDB4OTcgaW4gdG9wIHJpZ2h0IG9yIGJvdHRvbSBtaWRkbGUgZm9yIGEgY2F2ZSBleGl0XG4gIGxvYzEuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg4MCwgMHg4MywgMHg5Y10sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MywgMHg4NiwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MywgMHg4OCwgMHg4OSwgMHg4MCwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MSwgMHg4YywgMHg4NSwgMHg4MiwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5ZSwgMHg4NSwgMHg5YywgMHg5OCwgMHg4Nl1dO1xuXG4gIGxvYzIuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg5YiwgMHg4MCwgMHg5Yl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MSwgMHg4MCwgMHg4MV0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4NywgMHg4YiwgMHg4YSwgMHg4Nl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4YywgMHg4MCwgMHg4NSwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5YywgMHg4NiwgMHg4MCwgMHg4MCwgMHg5YV1dO1xuXG4gIGZvciAoY29uc3QgbCBvZiBbbG9jMSwgbG9jMiwgbG9jM10pIHtcbiAgICBsLmJnbSA9IDB4MTc7IC8vIG10IHNhYnJlIGNhdmUgbXVzaWM/XG4gICAgbC5lbnRyYW5jZXMgPSBbXTtcbiAgICBsLmV4aXRzID0gW107XG4gICAgbC5waXRzID0gW107XG4gICAgbC5zcGF3bnMgPSBbXTtcbiAgICBsLmZsYWdzID0gW107XG4gICAgbC5oZWlnaHQgPSBsLnNjcmVlbnMubGVuZ3RoO1xuICAgIGwud2lkdGggPSBsLnNjcmVlbnNbMF0ubGVuZ3RoO1xuICAgIGwuZXh0ZW5kZWQgPSAwO1xuICAgIGwudGlsZVBhbGV0dGVzID0gWzB4MWEsIDB4MWIsIDB4MDVdOyAvLyByb2NrIHdhbGxcbiAgICBsLnRpbGVzZXQgPSAweDg4O1xuICAgIGwudGlsZUVmZmVjdHMgPSAweGI1O1xuICAgIGwudGlsZVBhdHRlcm5zID0gWzB4MTQsIDB4MDJdO1xuICAgIGwuc3ByaXRlUGF0dGVybnMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGF0dGVybnNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gICAgbC5zcHJpdGVQYWxldHRlcyA9IFsuLi5TZWFsZWRDYXZlMS5zcHJpdGVQYWxldHRlc10gYXMgW251bWJlciwgbnVtYmVyXTtcbiAgfVxuXG4gIC8vIEFkZCBlbnRyYW5jZSB0byB2YWxsZXkgb2Ygd2luZFxuICAvLyBUT0RPIC0gbWF5YmUganVzdCBkbyAoMHgzMywgW1sweDE5XV0pIG9uY2Ugd2UgZml4IHRoYXQgc2NyZWVuIGZvciBncmFzc1xuICBWYWxsZXlPZldpbmQud3JpdGVTY3JlZW5zMmQoMHgyMywgW1xuICAgIFsweDExLCAweDBkXSxcbiAgICBbMHgwOSwgMHhjMl1dKTtcbiAgcm9tLnRpbGVFZmZlY3RzWzBdLmVmZmVjdHNbMHhjMF0gPSAwO1xuICAvLyBUT0RPIC0gZG8gdGhpcyBvbmNlIHdlIGZpeCB0aGUgc2VhIHRpbGVzZXRcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1YV0gPSAweDBhO1xuICAvLyByb20uc2NyZWVuc1sweGMyXS50aWxlc1sweDViXSA9IDB4MGE7XG5cbiAgLy8gQ29ubmVjdCBtYXBzXG4gIGxvYzEuY29ubmVjdCgweDQzLCBsb2MyLCAweDQ0KTtcbiAgbG9jMS5jb25uZWN0KDB4NDAsIFZhbGxleU9mV2luZCwgMHgzNCk7XG5cbiAgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgLy8gQWRkIGVudHJhbmNlIHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgICBMaW1lVHJlZVZhbGxleS5yZXNpemVTY3JlZW5zKDAsIDEsIDAsIDApOyAvLyBhZGQgb25lIHNjcmVlbiB0byBsZWZ0IGVkZ2VcbiAgICBMaW1lVHJlZVZhbGxleS53cml0ZVNjcmVlbnMyZCgweDAwLCBbXG4gICAgICBbMHgwYywgMHgxMV0sXG4gICAgICBbMHgxNSwgMHgzNl0sXG4gICAgICBbMHgwZSwgMHgwZl1dKTtcbiAgICBsb2MxLnNjcmVlbnNbMF1bNF0gPSAweDk3OyAvLyBkb3duIHN0YWlyXG4gICAgbG9jMS5jb25uZWN0KDB4MDQsIExpbWVUcmVlVmFsbGV5LCAweDEwKTtcbiAgfVxuXG4gIC8vIEFkZCBtb25zdGVyc1xuICBsb2MxLnNwYXducy5wdXNoKFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjEsIHRpbGU6IDB4ODcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMiwgdGlsZTogMHg4OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMywgdGlsZTogMHg4OSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMyLCB0aWxlOiAweDY4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDQxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMywgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgbG9jMi5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDAxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTEsIHRpbGU6IDB4NDgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4NzcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxNCwgdGlsZTogMHgyOCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgyMywgdGlsZTogMHg4NSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OGEsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzQsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4MiwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgaWYgKCFmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gY2hlc3Q6IGFsYXJtIGZsdXRlXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgxMTAsIHg6IDB4NDc4LCB0eXBlOiAyLCBpZDogMHgzMX0pKTtcbiAgfVxuICBpZiAoZmxhZ3MuYWRkRXh0cmFDaGVja3NUb0Vhc3RDYXZlKCkpIHtcbiAgICAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgxMTAsIHg6IDB4NDc4LCB0eXBlOiAyLCBpZDogMHg1OX0pKTtcbiAgICAvLyBjaGVzdDogbWltaWNcbiAgICBsb2MyLnNwYXducy5wdXNoKFNwYXduLm9mKHt5OiAweDA3MCwgeDogMHgxMDgsIHR5cGU6IDIsIGlkOiAweDcwfSkpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjb25uZWN0R29hVG9MZWFmKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtHb2FWYWxsZXksIEVhc3RDYXZlMiwgRWFzdENhdmUzfSA9IHJvbS5sb2NhdGlvbnM7XG4gIC8vIEFkZCBhIG5ldyBjYXZlIHRvIHRoZSB0b3AtbGVmdCBjb3JuZXIgb2YgR29hIFZhbGxleS5cbiAgR29hVmFsbGV5LndyaXRlU2NyZWVuczJkKDB4MDAsIFtcbiAgICAgIFsweDBjLCAweGMxLCAweDBkXSxcbiAgICAgIFsweDBlLCAweDM3LCAweDM1XV0pO1xuICAvLyBBZGQgYW4gZXh0cmEgZG93bi1zdGFpciB0byBFYXN0Q2F2ZTIgYW5kIGEgbmV3IDMtc2NyZWVuIEVhc3RDYXZlMyBtYXAuXG5cbiAgcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShFYXN0Q2F2ZTMpO1xuICBFYXN0Q2F2ZTMuc2NyZWVucyA9IFtbMHg5YV0sXG4gICAgICAgICAgICAgICAgICAgICAgIFsweDhmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgWzB4OWVdXTtcbiAgRWFzdENhdmUzLmhlaWdodCA9IDM7XG4gIEVhc3RDYXZlMy53aWR0aCA9IDE7XG5cbiAgLy8gQWRkIGEgcm9jayB3YWxsIChpZD0wKS5cbiAgRWFzdENhdmUzLnNwYXducy5wdXNoKFNwYXduLmZyb20oWzB4MTgsIDB4MDcsIDB4MjMsIDB4MDBdKSk7XG4gIEVhc3RDYXZlMy5mbGFncy5wdXNoKEZsYWcub2Yoe3NjcmVlbjogMHgxMCwgZmxhZzogcm9tLmZsYWdzLmFsbG9jKDB4MjAwKX0pKTtcblxuICAvLyBNYWtlIHRoZSBjb25uZWN0aW9ucy5cbiAgRWFzdENhdmUyLnNjcmVlbnNbNF1bMF0gPSAweDk5O1xuICBFYXN0Q2F2ZTIuY29ubmVjdCgweDQwLCBFYXN0Q2F2ZTMsIH4weDAwKTtcbiAgRWFzdENhdmUzLmNvbm5lY3QoMHgyMCwgR29hVmFsbGV5LCAweDAxKTtcbn1cblxuZnVuY3Rpb24gYWRkWm9tYmllV2FycChyb206IFJvbSkge1xuICAvLyBNYWtlIHNwYWNlIGZvciB0aGUgbmV3IGZsYWcgYmV0d2VlbiBKb2VsIGFuZCBTd2FuXG4gIGZvciAobGV0IGkgPSAweDJmNTsgaSA8IDB4MmZjOyBpKyspIHtcbiAgICByb20ubW92ZUZsYWcoaSwgaSAtIDEpO1xuICB9XG4gIC8vIFVwZGF0ZSB0aGUgbWVudVxuICBjb25zdCBtZXNzYWdlID0gcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MjFdWzBdO1xuICBtZXNzYWdlLnRleHQgPSBbXG4gICAgJyB7MWE6TGVhZn0gICAgICB7MTY6QnJ5bm1hZXJ9IHsxZDpPYWt9ICcsXG4gICAgJ3swYzpOYWRhcmV9XFwncyAgezFlOlBvcnRvYX0gICB7MTQ6QW1hem9uZXN9ICcsXG4gICAgJ3sxOTpKb2VsfSAgICAgIFpvbWJpZSAgIHsyMDpTd2FufSAnLFxuICAgICd7MjM6U2h5cm9ufSAgICB7MTg6R29hfSAgICAgIHsyMTpTYWhhcmF9JyxcbiAgXS5qb2luKCdcXG4nKTtcbiAgLy8gQWRkIGEgdHJpZ2dlciB0byB0aGUgZW50cmFuY2UgLSB0aGVyZSdzIGFscmVhZHkgYSBzcGF3biBmb3IgOGFcbiAgLy8gYnV0IHdlIGNhbid0IHJldXNlIHRoYXQgc2luY2UgaXQncyB0aGUgc2FtZSBhcyB0aGUgb25lIG91dHNpZGVcbiAgLy8gdGhlIG1haW4gRVNJIGVudHJhbmNlOyBzbyByZXVzZSBhIGRpZmZlcmVudCBvbmUuXG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFtdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe30pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmZiXTsgLy8gbmV3IHdhcnAgcG9pbnQgZmxhZ1xuICAvLyBBY3R1YWxseSByZXBsYWNlIHRoZSB0cmlnZ2VyLlxuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuWm9tYmllVG93bi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4OGEpIHtcbiAgICAgIHNwYXduLmlkID0gdHJpZ2dlci5pZDtcbiAgICB9XG4gIH1cbiAgcm9tLnRvd25XYXJwLmxvY2F0aW9ucy5zcGxpY2UoNywgMCwgcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLmlkKTtcbiAgaWYgKHJvbS50b3duV2FycC5sb2NhdGlvbnMucG9wKCkgIT09IDB4ZmYpIHRocm93IG5ldyBFcnJvcigndW5leHBlY3RlZCcpO1xuICAvLyBBU00gZml4ZXMgc2hvdWxkIGhhdmUgaGFwcGVuZWQgaW4gcHJlc2h1ZmZsZS5zXG59XG5cbmZ1bmN0aW9uIGV2aWxTcGlyaXRJc2xhbmRSZXF1aXJlc0RvbHBoaW4ocm9tOiBSb20pIHtcbiAgcm9tLnRyaWdnZXIoMHg4YSkuY29uZGl0aW9ucyA9IFt+MHgwZWVdOyAvLyBuZXcgZmxhZyBmb3IgcmlkaW5nIGRvbHBoaW5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MWRdWzB4MTBdLnRleHQgPSBgVGhlIGNhdmUgZW50cmFuY2UgYXBwZWFyc1xudG8gYmUgdW5kZXJ3YXRlci4gWW91J2xsXG5uZWVkIHRvIHN3aW0uYDtcbn1cblxuZnVuY3Rpb24gcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbTogUm9tKSB7XG4gIC8vIEFsbG93IG9wZW5pbmcgU3dhbiBmcm9tIGVpdGhlciBzaWRlIGJ5IGFkZGluZyBhIHBhaXIgb2YgZ3VhcmRzIG9uIHRoZVxuICAvLyBvcHBvc2l0ZSBzaWRlIG9mIHRoZSBnYXRlLlxuICByb20ubG9jYXRpb25zWzB4NzNdLnNwYXducy5wdXNoKFxuICAgIC8vIE5PVEU6IFNvbGRpZXJzIG11c3QgY29tZSBpbiBwYWlycyAod2l0aCBpbmRleCBeMSBmcm9tIGVhY2ggb3RoZXIpXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBhLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGIsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwZSwgeXQ6IDB4MGEsIHR5cGU6IDIsIGlkOiAweGIzfSksIC8vIG5ldyB0cmlnZ2VyOiBlcmFzZSBndWFyZHNcbiAgKTtcblxuICAvLyBHdWFyZHMgKCQyZCkgYXQgc3dhbiBnYXRlICgkNzMpIH4gc2V0IDEwZCBhZnRlciBvcGVuaW5nIGdhdGUgPT4gY29uZGl0aW9uIGZvciBkZXNwYXduXG4gIHJvbS5ucGNzWzB4MmRdLmxvY2FsRGlhbG9ncy5nZXQoMHg3MykhWzBdLmZsYWdzLnB1c2goMHgxMGQpO1xuXG4gIC8vIERlc3Bhd24gZ3VhcmQgdHJpZ2dlciByZXF1aXJlcyAxMGRcbiAgcm9tLnRyaWdnZXIoMHhiMykuY29uZGl0aW9ucy5wdXNoKDB4MTBkKTtcbn1cblxuZnVuY3Rpb24gbGVhZkVsZGVySW5TYWJyZUhlYWxzKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGxlYWZFbGRlciA9IHJvbS5ucGNzWzB4MGRdO1xuICBjb25zdCBzdW1taXREaWFsb2cgPSBsZWFmRWxkZXIubG9jYWxEaWFsb2dzLmdldCgweDM1KSFbMF07XG4gIHN1bW1pdERpYWxvZy5tZXNzYWdlLmFjdGlvbiA9IDB4MTc7IC8vIGhlYWwgYW5kIGRpc2FwcGVhci5cbn1cblxuZnVuY3Rpb24gcHJldmVudE5wY0Rlc3Bhd25zKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBmdW5jdGlvbiByZW1vdmU8VD4oYXJyOiBUW10sIGVsZW06IFQpOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5pbmRleE9mKGVsZW0pO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCAke2VsZW19IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZUlmPFQ+KGFycjogVFtdLCBwcmVkOiAoZWxlbTogVCkgPT4gYm9vbGVhbik6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmZpbmRJbmRleChwcmVkKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBkaWFsb2coaWQ6IG51bWJlciwgbG9jOiBudW1iZXIgPSAtMSk6IExvY2FsRGlhbG9nW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5sb2NhbERpYWxvZ3MuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBkaWFsb2cgJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBzcGF3bnMoaWQ6IG51bWJlciwgbG9jOiBudW1iZXIpOiBudW1iZXJbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHNwYXduIGNvbmRpdGlvbiAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gTGluayBzb21lIHJlZHVuZGFudCBOUENzOiBLZW5zdSAoN2UsIDc0KSBhbmQgQWthaGFuYSAoODgsIDE2KVxuICAvLyBVc2UgNzQgZm9yIG9ubHkgS2Vuc3UgaW4gZGFuY2UgaGFsbCAtIG5vYm9keSBlbHNlIHdpbGwgYWNjZXB0IHRyYWRlLWluLlxuICByb20ubnBjc1sweDc0XS5saW5rKDB4N2UpO1xuICByb20ubnBjc1sweDc0XS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg3NF0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDdlXS5kYXRhXSBhcyBhbnk7XG4gIHJvbS5sb2NhdGlvbnMuU3dhbl9EYW5jZUhhbGwuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHg3ZSkhLmlkID0gMHg3NDtcbiAgcm9tLml0ZW1zWzB4M2JdLnRyYWRlSW4hWzBdID0gMHg3NDtcblxuICAvLyBkaWFsb2cgaXMgc2hhcmVkIGJldHdlZW4gODggYW5kIDE2LlxuICByb20ubnBjc1sweDg4XS5saW5rRGlhbG9nKDB4MTYpO1xuXG4gIC8vIEdpdmVuIEtlbnN1IDdlIGEgZ2xvd2luZyBsYW1wIGluc3RlYWQgb2YgY2hhbmdlIChLZW5zdSA3NCBoYXMgdGhhdCBub3cpXG4gIHJvbS5ucGNzWzB4N2VdLmRhdGFbMF0gPSAweDM5OyAvLyBnbG93aW5nIGxhbXBcblxuICAvLyBNYWtlIGEgbmV3IE5QQyBmb3IgQWthaGFuYSBpbiBCcnlubWFlcjsgb3RoZXJzIHdvbid0IGFjY2VwdCB0aGUgU3RhdHVlIG9mIE9ueXguXG4gIC8vIExpbmtpbmcgc3Bhd24gY29uZGl0aW9ucyBhbmQgZGlhbG9ncyBpcyBzdWZmaWNpZW50LCBzaW5jZSB0aGUgYWN0dWFsIE5QQyBJRFxuICAvLyAoMTYgb3IgODIpIGlzIHdoYXQgbWF0dGVycyBmb3IgdGhlIHRyYWRlLWluXG4gIHJvbS5ucGNzWzB4ODJdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDgyXS5saW5rKDB4MTYpO1xuICByb20ubnBjc1sweDgyXS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4MTZdLmRhdGFdIGFzIGFueTsgLy8gZW5zdXJlIGdpdmUgaXRlbVxuICByb20ubG9jYXRpb25zLkJyeW5tYWVyLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4MTYpIS5pZCA9IDB4ODI7XG4gIHJvbS5pdGVtc1sweDI1XS50cmFkZUluIVswXSA9IDB4ODI7XG5cbiAgLy8gTGVhZiBlbGRlciBpbiBob3VzZSAoJDBkIEAgJGMwKSB+IHN3b3JkIG9mIHdpbmQgcmVkdW5kYW50IGZsYWdcbiAgLy8gZGlhbG9nKDB4MGQsIDB4YzApWzJdLmZsYWdzID0gW107XG4gIC8vcm9tLml0ZW1HZXRzWzB4MDBdLmZsYWdzID0gW107IC8vIGNsZWFyIHJlZHVuZGFudCBmbGFnXG5cbiAgLy8gTGVhZiByYWJiaXQgKCQxMykgbm9ybWFsbHkgc3RvcHMgc2V0dGluZyBpdHMgZmxhZyBhZnRlciBwcmlzb24gZG9vciBvcGVuZWQsXG4gIC8vIGJ1dCB0aGF0IGRvZXNuJ3QgbmVjZXNzYXJpbHkgb3BlbiBtdCBzYWJyZS4gIEluc3RlYWQgKGEpIHRyaWdnZXIgb24gMDQ3XG4gIC8vIChzZXQgYnkgOGQgdXBvbiBlbnRlcmluZyBlbGRlcidzIGNlbGwpLiAgQWxzbyBtYWtlIHN1cmUgdGhhdCB0aGF0IHBhdGggYWxzb1xuICAvLyBwcm92aWRlcyB0aGUgbmVlZGVkIGZsYWcgdG8gZ2V0IGludG8gbXQgc2FicmUuXG4gIGRpYWxvZygweDEzKVsyXS5jb25kaXRpb24gPSAweDA0NztcbiAgZGlhbG9nKDB4MTMpWzJdLmZsYWdzID0gWzB4MGE5XTtcbiAgZGlhbG9nKDB4MTMpWzNdLmZsYWdzID0gWzB4MGE5XTtcblxuICAvLyBXaW5kbWlsbCBndWFyZCAoJDE0IEAgJDBlKSBzaG91bGRuJ3QgZGVzcGF3biBhZnRlciBhYmR1Y3Rpb24gKDAzOCksXG4gIC8vIGJ1dCBpbnN0ZWFkIGFmdGVyIGdpdmluZyB0aGUgaXRlbSAoMDg4KVxuICBzcGF3bnMoMHgxNCwgMHgwZSlbMV0gPSB+MHgwODg7IC8vIHJlcGxhY2UgZmxhZyB+MDM4ID0+IH4wODhcbiAgLy9kaWFsb2coMHgxNCwgMHgwZSlbMF0uZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIHJlZHVuZGFudCBmbGFnIH4gd2luZG1pbGwga2V5XG5cbiAgLy8gQWthaGFuYSAoJDE2IC8gODgpIH4gc2hpZWxkIHJpbmcgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHgxNiwgMHg1NylbMF0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGlzYXBwZWFyIGFmdGVyIGdldHRpbmcgYmFycmllciAobm90ZSA4OCdzIHNwYXducyBub3QgbGlua2VkIHRvIDE2KVxuICByZW1vdmUoc3Bhd25zKDB4MTYsIDB4NTcpLCB+MHgwNTEpO1xuICByZW1vdmUoc3Bhd25zKDB4ODgsIDB4NTcpLCB+MHgwNTEpO1xuXG4gIGZ1bmN0aW9uIHJldmVyc2VEaWFsb2coZHM6IExvY2FsRGlhbG9nW10pOiB2b2lkIHtcbiAgICBkcy5yZXZlcnNlKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbmV4dCA9IGRzW2kgKyAxXTtcbiAgICAgIGRzW2ldLmNvbmRpdGlvbiA9IG5leHQgPyB+bmV4dC5jb25kaXRpb24gOiB+MDtcbiAgICB9XG4gIH07XG5cbiAgLy8gT2FrIGVsZGVyICgkMWQpIH4gc3dvcmQgb2YgZmlyZSByZWR1bmRhbnQgZmxhZ1xuICBjb25zdCBvYWtFbGRlckRpYWxvZyA9IGRpYWxvZygweDFkKTtcbiAgLy9vYWtFbGRlckRpYWxvZ1s0XS5mbGFncyA9IFtdO1xuICAvLyBNYWtlIHN1cmUgdGhhdCB3ZSB0cnkgdG8gZ2l2ZSB0aGUgaXRlbSBmcm9tICphbGwqIHBvc3QtaW5zZWN0IGRpYWxvZ3NcbiAgb2FrRWxkZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuXG4gIC8vIE9hayBtb3RoZXIgKCQxZSkgfiBpbnNlY3QgZmx1dGUgcmVkdW5kYW50IGZsYWdcbiAgLy8gVE9ETyAtIHJlYXJyYW5nZSB0aGVzZSBmbGFncyBhIGJpdCAobWF5YmUgfjA0NSwgfjBhMCB+MDQxIC0gc28gcmV2ZXJzZSlcbiAgLy8gICAgICAtIHdpbGwgbmVlZCB0byBjaGFuZ2UgYmFsbE9mRmlyZSBhbmQgaW5zZWN0Rmx1dGUgaW4gZGVwZ3JhcGhcbiAgY29uc3Qgb2FrTW90aGVyRGlhbG9nID0gZGlhbG9nKDB4MWUpO1xuICAoKCkgPT4ge1xuICAgIGNvbnN0IFtraWxsZWRJbnNlY3QsIGdvdEl0ZW0sIGdldEl0ZW0sIGZpbmRDaGlsZF0gPSBvYWtNb3RoZXJEaWFsb2c7XG4gICAgZmluZENoaWxkLmNvbmRpdGlvbiA9IH4weDA0NTtcbiAgICAvL2dldEl0ZW0uY29uZGl0aW9uID0gfjB4MjI3O1xuICAgIC8vZ2V0SXRlbS5mbGFncyA9IFtdO1xuICAgIGdvdEl0ZW0uY29uZGl0aW9uID0gfjA7XG4gICAgcm9tLm5wY3NbMHgxZV0ubG9jYWxEaWFsb2dzLnNldCgtMSwgW2ZpbmRDaGlsZCwgZ2V0SXRlbSwga2lsbGVkSW5zZWN0LCBnb3RJdGVtXSk7XG4gIH0pKCk7XG4gIC8vLyBvYWtNb3RoZXJEaWFsb2dbMl0uZmxhZ3MgPSBbXTtcbiAgLy8gLy8gRW5zdXJlIHdlIGFsd2F5cyBnaXZlIGl0ZW0gYWZ0ZXIgaW5zZWN0LlxuICAvLyBvYWtNb3RoZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyBvYWtNb3RoZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyByZXZlcnNlRGlhbG9nKG9ha01vdGhlckRpYWxvZyk7XG5cbiAgLy8gUmV2ZXJzZSB0aGUgb3RoZXIgb2FrIGRpYWxvZ3MsIHRvby5cbiAgZm9yIChjb25zdCBpIG9mIFsweDIwLCAweDIxLCAweDIyLCAweDdjLCAweDdkXSkge1xuICAgIHJldmVyc2VEaWFsb2coZGlhbG9nKGkpKTtcbiAgfVxuXG4gIC8vIFN3YXAgdGhlIGZpcnN0IHR3byBvYWsgY2hpbGQgZGlhbG9ncy5cbiAgY29uc3Qgb2FrQ2hpbGREaWFsb2cgPSBkaWFsb2coMHgxZik7XG4gIG9ha0NoaWxkRGlhbG9nLnVuc2hpZnQoLi4ub2FrQ2hpbGREaWFsb2cuc3BsaWNlKDEsIDEpKTtcblxuICAvLyBUaHJvbmUgcm9vbSBiYWNrIGRvb3IgZ3VhcmQgKCQzMyBAICRkZikgc2hvdWxkIGhhdmUgc2FtZSBzcGF3biBjb25kaXRpb24gYXMgcXVlZW5cbiAgLy8gKDAyMCBOT1QgcXVlZW4gbm90IGluIHRocm9uZSByb29tIEFORCAwMWIgTk9UIHZpZXdlZCBtZXNpYSByZWNvcmRpbmcpXG4gIHJvbS5ucGNzWzB4MzNdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkZiwgIFt+MHgwMjAsIH4weDAxYl0pO1xuXG4gIC8vIEZyb250IHBhbGFjZSBndWFyZCAoJDM0KSB2YWNhdGlvbiBtZXNzYWdlIGtleXMgb2ZmIDAxYiBpbnN0ZWFkIG9mIDAxZlxuICBkaWFsb2coMHgzNClbMV0uY29uZGl0aW9uID0gMHgwMWI7XG5cbiAgLy8gUXVlZW4ncyAoJDM4KSBkaWFsb2cgbmVlZHMgcXVpdGUgYSBiaXQgb2Ygd29ya1xuICAvLyBHaXZlIGl0ZW0gKGZsdXRlIG9mIGxpbWUpIGV2ZW4gaWYgZ290IHRoZSBzd29yZCBvZiB3YXRlclxuICBkaWFsb2coMHgzOClbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzOyAvLyBcInlvdSBmb3VuZCBzd29yZFwiID0+IGFjdGlvbiAzXG4gIGRpYWxvZygweDM4KVs0XS5mbGFncy5wdXNoKDB4MDljKTsgICAgIC8vIHNldCAwOWMgcXVlZW4gZ29pbmcgYXdheVxuICAvLyBRdWVlbiBzcGF3biBjb25kaXRpb24gZGVwZW5kcyBvbiAwMWIgKG1lc2lhIHJlY29yZGluZykgbm90IDAxZiAoYmFsbCBvZiB3YXRlcilcbiAgLy8gVGhpcyBlbnN1cmVzIHlvdSBoYXZlIGJvdGggc3dvcmQgYW5kIGJhbGwgdG8gZ2V0IHRvIGhlciAoPz8/KVxuICBzcGF3bnMoMHgzOCwgMHhkZilbMV0gPSB+MHgwMWI7ICAvLyB0aHJvbmUgcm9vbTogMDFiIE5PVCBtZXNpYSByZWNvcmRpbmdcbiAgc3Bhd25zKDB4MzgsIDB4ZTEpWzBdID0gMHgwMWI7ICAgLy8gYmFjayByb29tOiAwMWIgbWVzaWEgcmVjb3JkaW5nXG4gIGRpYWxvZygweDM4KVsxXS5jb25kaXRpb24gPSAweDAxYjsgICAgIC8vIHJldmVhbCBjb25kaXRpb246IDAxYiBtZXNpYSByZWNvcmRpbmdcblxuICAvLyBGb3J0dW5lIHRlbGxlciAoJDM5KSBzaG91bGQgYWxzbyBub3Qgc3Bhd24gYmFzZWQgb24gbWVzaWEgcmVjb3JkaW5nIHJhdGhlciB0aGFuIG9yYlxuICBzcGF3bnMoMHgzOSwgMHhkOClbMV0gPSB+MHgwMWI7ICAvLyBmb3J0dW5lIHRlbGxlciByb29tOiAwMWIgTk9UXG5cbiAgLy8gQ2xhcmsgKCQ0NCkgbW92ZXMgYWZ0ZXIgdGFsa2luZyB0byBoaW0gKDA4ZCkgcmF0aGVyIHRoYW4gY2FsbWluZyBzZWEgKDA4ZikuXG4gIC8vIFRPRE8gLSBjaGFuZ2UgMDhkIHRvIHdoYXRldmVyIGFjdHVhbCBpdGVtIGhlIGdpdmVzLCB0aGVuIHJlbW92ZSBib3RoIGZsYWdzXG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlOSwgW34weDA4ZF0pOyAvLyB6b21iaWUgdG93biBiYXNlbWVudFxuICByb20ubnBjc1sweDQ0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZTQsIFsweDA4ZF0pOyAgLy8gam9lbCBzaGVkXG4gIC8vZGlhbG9nKDB4NDQsIDB4ZTkpWzFdLmZsYWdzLnBvcCgpOyAvLyByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuXG4gIC8vIEJyb2thaGFuYSAoJDU0KSB+IHdhcnJpb3IgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDU0KVsyXS5mbGFncyA9IFtdO1xuXG4gIC8vIERlbyAoJDVhKSB+IHBlbmRhbnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1YSlbMV0uZmxhZ3MgPSBbXTtcblxuICAvLyBaZWJ1ICgkNWUpIGNhdmUgZGlhbG9nIChAICQxMClcbiAgLy8gVE9ETyAtIGRpYWxvZ3MoMHg1ZSwgMHgxMCkucmVhcnJhbmdlKH4weDAzYSwgMHgwMGQsIDB4MDM4LCAweDAzOSwgMHgwMGEsIH4weDAwMCk7XG4gIHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5zZXQoMHgxMCwgW1xuICAgIExvY2FsRGlhbG9nLm9mKH4weDAzYSwgWzB4MDAsIDB4MWFdLCBbMHgwM2FdKSwgLy8gMDNhIE5PVCB0YWxrZWQgdG8gemVidSBpbiBjYXZlIC0+IFNldCAwM2FcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMGQsIFsweDAwLCAweDFkXSksIC8vIDAwZCBsZWFmIHZpbGxhZ2VycyByZXNjdWVkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM4LCBbMHgwMCwgMHgxY10pLCAvLyAwMzggbGVhZiBhdHRhY2tlZFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAzOSwgWzB4MDAsIDB4MWRdKSwgLy8gMDM5IGxlYXJuZWQgcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwYSwgWzB4MDAsIDB4MWIsIDB4MDNdKSwgLy8gMDBhIHdpbmRtaWxsIGtleSB1c2VkIC0+IHRlYWNoIHJlZnJlc2hcbiAgICBMb2NhbERpYWxvZy5vZih+MHgwMDAsIFsweDAwLCAweDFkXSksXG4gIF0pO1xuICAvLyBEb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByZW1vdmUoc3Bhd25zKDB4NWUsIDB4MTApLCB+MHgwNTEpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBUb3JuZWwgKCQ1ZikgaW4gc2FicmUgd2VzdCAoJDIxKSB+IHRlbGVwb3J0IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NWYsIDB4MjEpWzFdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NWZdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgyMSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFN0b20gKCQ2MCk6IGRvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NjBdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgxZSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIEFzaW5hICgkNjIpIGluIGJhY2sgcm9vbSAoJGUxKSBnaXZlcyBmbHV0ZSBvZiBsaW1lXG4gIGNvbnN0IGFzaW5hID0gcm9tLm5wY3NbMHg2Ml07XG4gIGFzaW5hLmRhdGFbMV0gPSAweDI4O1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgZGlhbG9nKGFzaW5hLmlkLCAweGUxKVsyXS5tZXNzYWdlLmFjdGlvbiA9IDB4MTE7XG4gIC8vIFByZXZlbnQgZGVzcGF3biBmcm9tIGJhY2sgcm9vbSBhZnRlciBkZWZlYXRpbmcgc2FiZXJhICh+MDhmKVxuICByZW1vdmUoc3Bhd25zKGFzaW5hLmlkLCAweGUxKSwgfjB4MDhmKTtcblxuICAvLyBLZW5zdSBpbiBjYWJpbiAoJDY4IEAgJDYxKSBuZWVkcyB0byBiZSBhdmFpbGFibGUgZXZlbiBhZnRlciB2aXNpdGluZyBKb2VsLlxuICAvLyBDaGFuZ2UgaGltIHRvIGp1c3QgZGlzYXBwZWFyIGFmdGVyIHNldHRpbmcgdGhlIHJpZGVhYmxlIGRvbHBoaW4gZmxhZyAoMDliKSxcbiAgLy8gYW5kIHRvIG5vdCBldmVuIHNob3cgdXAgYXQgYWxsIHVubGVzcyB0aGUgZm9nIGxhbXAgd2FzIHJldHVybmVkICgwMjEpLlxuICByb20ubnBjc1sweDY4XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4NjEsIFt+MHgwOWIsIDB4MDIxXSk7XG4gIGRpYWxvZygweDY4KVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDI7IC8vIGRpc2FwcGVhclxuXG4gIC8vIEF6dGVjYSBpbiBTaHlyb24gKDZlKSBzaG91bGRuJ3Qgc3Bhd24gYWZ0ZXIgbWFzc2FjcmUgKDAyNylcbiAgcm9tLm5wY3NbMHg2ZV0uc3Bhd25Db25kaXRpb25zLmdldCgweGYyKSEucHVzaCh+MHgwMjcpO1xuICAvLyBBbHNvIHRoZSBkaWFsb2cgdHJpZ2dlciAoODIpIHNob3VsZG4ndCBoYXBwZW5cbiAgcm9tLnRyaWdnZXIoMHg4MikuY29uZGl0aW9ucy5wdXNoKH4weDAyNyk7XG5cbiAgLy8gS2Vuc3UgaW4gbGlnaHRob3VzZSAoJDc0LyQ3ZSBAICQ2MikgfiByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDc0LCAweDYyKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIEF6dGVjYSAoJDgzKSBpbiBweXJhbWlkIH4gYm93IG9mIHRydXRoIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmNvbmRpdGlvbiA9IH4weDI0MDsgIC8vIDI0MCBOT1QgYm93IG9mIHRydXRoXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gUmFnZSBibG9ja3Mgb24gc3dvcmQgb2Ygd2F0ZXIsIG5vdCByYW5kb20gaXRlbSBmcm9tIHRoZSBjaGVzdFxuICBkaWFsb2coMHhjMylbMF0uY29uZGl0aW9uID0gMHgyMDI7XG5cbiAgLy8gUmVtb3ZlIHVzZWxlc3Mgc3Bhd24gY29uZGl0aW9uIGZyb20gTWFkbyAxXG4gIHJvbS5ucGNzWzB4YzRdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHhmMik7IC8vIGFsd2F5cyBzcGF3blxuXG4gIC8vIERyYXlnb24gMiAoJGNiIEAgbG9jYXRpb24gJGE2KSBzaG91bGQgZGVzcGF3biBhZnRlciBiZWluZyBkZWZlYXRlZC5cbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLnNldCgweGE2LCBbfjB4MjhkXSk7IC8vIGtleSBvbiBiYWNrIHdhbGwgZGVzdHJveWVkXG5cbiAgLy8gRml4IFplYnUgdG8gZ2l2ZSBrZXkgdG8gc3R4eSBldmVuIGlmIHRodW5kZXIgc3dvcmQgaXMgZ290dGVuIChqdXN0IHN3aXRjaCB0aGVcbiAgLy8gb3JkZXIgb2YgdGhlIGZpcnN0IHR3bykuICBBbHNvIGRvbid0IGJvdGhlciBzZXR0aW5nIDAzYiBzaW5jZSB0aGUgbmV3IEl0ZW1HZXRcbiAgLy8gbG9naWMgb2J2aWF0ZXMgdGhlIG5lZWQuXG4gIGNvbnN0IHplYnVTaHlyb24gPSByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3MuZ2V0KDB4ZjIpITtcbiAgemVidVNoeXJvbi51bnNoaWZ0KC4uLnplYnVTaHlyb24uc3BsaWNlKDEsIDEpKTtcbiAgLy8gemVidVNoeXJvblswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFNoeXJvbiBtYXNzYWNyZSAoJDgwKSByZXF1aXJlcyBrZXkgdG8gc3R4eVxuICByb20udHJpZ2dlcigweDgwKS5jb25kaXRpb25zID0gW1xuICAgIH4weDAyNywgLy8gbm90IHRyaWdnZXJlZCBtYXNzYWNyZSB5ZXRcbiAgICAgMHgwM2IsIC8vIGdvdCBpdGVtIGZyb20ga2V5IHRvIHN0eHkgc2xvdFxuICAgICAweDJmZCwgLy8gc2h5cm9uIHdhcnAgcG9pbnQgdHJpZ2dlcmVkXG4gICAgIC8vIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlciAtIE5PVCBBTlkgTU9SRSFcbiAgXTtcblxuICAvLyBFbnRlciBzaHlyb24gKCQ4MSkgc2hvdWxkIHNldCB3YXJwIG5vIG1hdHRlciB3aGF0XG4gIHJvbS50cmlnZ2VyKDB4ODEpLmNvbmRpdGlvbnMgPSBbXTtcblxuICBpZiAoZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpKSB7XG4gICAgLy8gTGVhcm4gYmFycmllciAoJDg0KSByZXF1aXJlcyBjYWxtIHNlYVxuICAgIHJvbS50cmlnZ2VyKDB4ODQpLmNvbmRpdGlvbnMucHVzaCgweDI4Myk7IC8vIDI4MyBjYWxtZWQgdGhlIHNlYVxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBub3Qgc2V0dGluZyAwNTEgYW5kIGNoYW5naW5nIHRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIGl0ZW1cbiAgfVxuICAvL3JvbS50cmlnZ2VyKDB4ODQpLmZsYWdzID0gW107XG5cbiAgLy8gQWRkIGFuIGV4dHJhIGNvbmRpdGlvbiB0byB0aGUgTGVhZiBhYmR1Y3Rpb24gdHJpZ2dlciAoYmVoaW5kIHplYnUpLiAgVGhpcyBlbnN1cmVzXG4gIC8vIGFsbCB0aGUgaXRlbXMgaW4gTGVhZiBwcm9wZXIgKGVsZGVyIGFuZCBzdHVkZW50KSBhcmUgZ290dGVuIGJlZm9yZSB0aGV5IGRpc2FwcGVhci5cbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKDB4MDNhKTsgLy8gMDNhIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmVcblxuICAvLyBNb3JlIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXJzOlxuICAvLyAxLiBSZW1vdmUgdGhlIDhkIHRyaWdnZXIgaW4gdGhlIGZyb250IG9mIHRoZSBjZWxsLCBzd2FwIGl0IG91dFxuICAvLyAgICBmb3IgYjIgKGxlYXJuIHBhcmFseXNpcykuXG4gIHJvbS50cmlnZ2VyKDB4OGQpLnVzZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9TdW1taXRDYXZlLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCkgc3Bhd24uaWQgPSAweGIyO1xuICB9XG4gIHJlbW92ZUlmKHJvbS5sb2NhdGlvbnMuV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLFxuICAgICAgICAgICBzcGF3biA9PiBzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCk7XG4gIC8vIDIuIFNldCB0aGUgdHJpZ2dlciB0byByZXF1aXJlIGhhdmluZyBraWxsZWQga2VsYmVzcXVlLlxuICByb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zLnB1c2goMHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDMuIEFsc28gc2V0IHRoZSB0cmlnZ2VyIHRvIGZyZWUgdGhlIHZpbGxhZ2VycyBhbmQgdGhlIGVsZGVyLlxuICByb20udHJpZ2dlcigweGIyKS5mbGFncy5wdXNoKH4weDA4NCwgfjB4MDg1LCAweDAwZCk7XG4gIC8vIDQuIERvbid0IHRyaWdnZXIgdGhlIGFiZHVjdGlvbiBpbiB0aGUgZmlyc3QgcGxhY2UgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNS4gRG9uJ3QgdHJpZ2dlciByYWJiaXQgYmxvY2sgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4NikuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNi4gRG9uJ3QgZnJlZSB2aWxsYWdlcnMgZnJvbSB1c2luZyBwcmlzb24ga2V5XG4gIHJvbS5wcmdbMHgxZTBhM10gPSAweGMwO1xuICByb20ucHJnWzB4MWUwYTRdID0gMHgwMDtcblxuICAvLyBUT0RPIC0gYWRkaXRpb25hbCB3b3JrIG9uIGFiZHVjdGlvbiB0cmlnZ2VyOlxuICAvLyAgIC0gZ2V0IHJpZCBvZiB0aGUgZmxhZ3Mgb24ga2V5IHRvIHByaXNvbiB1c2VcbiAgLy8gICAtIGFkZCBhIGNvbmRpdGlvbiB0aGF0IGFiZHVjdGlvbiBkb2Vzbid0IGhhcHBlbiBpZiByZXNjdWVkXG4gIC8vIEdldCByaWQgb2YgQk9USCB0cmlnZ2VycyBpbiBzdW1taXQgY2F2ZSwgIEluc3RlYWQsIHRpZSBldmVyeXRoaW5nXG4gIC8vIHRvIHRoZSBlbGRlciBkaWFsb2cgb24gdG9wXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgc3RpbGwgYWxpdmUsIG1heWJlIGdpdmUgYSBoaW50IGFib3V0IHdlYWtuZXNzXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgZGVhZCB0aGVuIHRlYWNoIHBhcmFseXNpcyBhbmQgc2V0L2NsZWFyIGZsYWdzXG4gIC8vICAgLSBpZiBwYXJhbHlzaXMgbGVhcm5lZCB0aGVuIHNheSBzb21ldGhpbmcgZ2VuZXJpY1xuICAvLyBTdGlsbCBuZWVkIHRvIGtlZXAgdGhlIHRyaWdnZXIgaW4gdGhlIGZyb250IGluIGNhc2Ugbm9cbiAgLy8gYWJkdWN0aW9uIHlldFxuICAvLyAgIC0gaWYgTk9UIHBhcmFseXNpcyBBTkQgaWYgTk9UIGVsZGVyIG1pc3NpbmcgQU5EIGlmIGtlbGJlcXVlIGRlYWRcbiAgLy8gLS0tPiBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHR3byB3YXlzIHRvIGdldCAobGlrZSByZWZyZXNoKT9cbiAgLy9cbiAgLy8gQWxzbyBhZGQgYSBjaGVjayB0aGF0IHRoZSByYWJiaXQgdHJpZ2dlciBpcyBnb25lIGlmIHJlc2N1ZWQhXG5cblxuXG4gIC8vIFBhcmFseXNpcyB0cmlnZ2VyICgkYjIpIH4gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcbiAgLy9yb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zWzBdID0gfjB4MjQyO1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnNoaWZ0KCk7IC8vIHJlbW92ZSAwMzcgbGVhcm5lZCBwYXJhbHlzaXNcblxuICAvLyBMZWFybiByZWZyZXNoIHRyaWdnZXIgKCRiNCkgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjQpLmNvbmRpdGlvbnNbMV0gPSB+MHgyNDE7XG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIDAzOSBsZWFybmVkIHJlZnJlc2hcblxuICAvLyBUZWxlcG9ydCBibG9jayBvbiBtdCBzYWJyZSBpcyBmcm9tIHNwZWxsLCBub3Qgc2xvdFxuICByb20udHJpZ2dlcigweGJhKS5jb25kaXRpb25zWzBdID0gfjB4MjQ0OyAvLyB+MDNmIC0+IH4yNDRcblxuICAvLyBQb3J0b2EgcGFsYWNlIGd1YXJkIG1vdmVtZW50IHRyaWdnZXIgKCRiYikgc3RvcHMgb24gMDFiIChtZXNpYSkgbm90IDAxZiAob3JiKVxuICByb20udHJpZ2dlcigweGJiKS5jb25kaXRpb25zWzFdID0gfjB4MDFiO1xuXG4gIC8vIFJlbW92ZSByZWR1bmRhbnQgdHJpZ2dlciA4YSAoc2xvdCAxNikgaW4gem9tYmlldG93biAoJDY1KVxuICAvLyAgLS0gbm90ZTogbm8gbG9uZ2VyIG5lY2Vzc2FyeSBzaW5jZSB3ZSByZXB1cnBvc2UgaXQgaW5zdGVhZC5cbiAgLy8gY29uc3Qge3pvbWJpZVRvd259ID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gem9tYmllVG93bi5zcGF3bnMgPSB6b21iaWVUb3duLnNwYXducy5maWx0ZXIoeCA9PiAheC5pc1RyaWdnZXIoKSB8fCB4LmlkICE9IDB4OGEpO1xuXG4gIC8vIFJlcGxhY2UgYWxsIGRpYWxvZyBjb25kaXRpb25zIGZyb20gMDBlIHRvIDI0M1xuICBmb3IgKGNvbnN0IG5wYyBvZiByb20ubnBjcykge1xuICAgIGZvciAoY29uc3QgZCBvZiBucGMuYWxsRGlhbG9ncygpKSB7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IDB4MDBlKSBkLmNvbmRpdGlvbiA9IDB4MjQzO1xuICAgICAgaWYgKGQuY29uZGl0aW9uID09PSB+MHgwMGUpIGQuY29uZGl0aW9uID0gfjB4MjQzO1xuICAgIH1cbiAgfVxufVxuXG4vLyBIYXJkIG1vZGUgZmxhZzogSGMgLSB6ZXJvIG91dCB0aGUgc3dvcmQncyBjb2xsaXNpb24gcGxhbmVcbmZ1bmN0aW9uIGRpc2FibGVTdGFicyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG8gb2YgWzB4MDgsIDB4MDksIDB4MjddKSB7XG4gICAgcm9tLm9iamVjdHNbb10uY29sbGlzaW9uUGxhbmUgPSAwO1xuICB9XG4gIC8vIEFsc28gdGFrZSB3YXJyaW9yIHJpbmcgb3V0IG9mIHRoZSBwaWN0dXJlLi4uIDp0cm9sbDpcbiAgLy8gcm9tLml0ZW1HZXRzWzB4MmJdLmlkID0gMHg1YjsgLy8gbWVkaWNhbCBoZXJiIGZyb20gc2Vjb25kIGZsdXRlIG9mIGxpbWUgY2hlY2tcbiAgcm9tLm5wY3NbMHg1NF0uZGF0YVswXSA9IDB4MjA7XG59XG5cbmZ1bmN0aW9uIG9yYnNPcHRpb25hbChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHgxMCwgMHgxNCwgMHgxOCwgMHgxZF0pIHtcbiAgICAvLyAxLiBMb29zZW4gdGVycmFpbiBzdXNjZXB0aWJpbGl0eSBvZiBsZXZlbCAxIHNob3RzXG4gICAgcm9tLm9iamVjdHNbb2JqXS50ZXJyYWluU3VzY2VwdGliaWxpdHkgJj0gfjB4MDQ7XG4gICAgLy8gMi4gSW5jcmVhc2UgdGhlIGxldmVsIHRvIDJcbiAgICByb20ub2JqZWN0c1tvYmpdLmxldmVsID0gMjtcbiAgfVxufVxuIl19