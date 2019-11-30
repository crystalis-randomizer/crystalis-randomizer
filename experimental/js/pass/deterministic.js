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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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Q0FBQztJQUM5QixPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUM1QyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUM7SUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBUSxFQUFFLEtBQWM7SUFpQi9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMs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QUM7QUFDckIsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBUTtJQUdsQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFekMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFFeEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHbEQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQzlCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNoRCxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBT3JDLENBQUM7QUFPRCxTQUFT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U0FBUyxxQkFBcUIsQ0FBQyxHQUFRO0lBQ3JDLE1BQU0sRUFBQyxZQUFZLEVBQUUsY0FBYyxFQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztJQUVyRCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNsQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNwQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVwQyxNQUFNLFlBQVksR0FDZCxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2RSxNQUFNLFlBQVksR0FDZCxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV6RSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsS0FBYztJQUVsRCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdoRCxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ04sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ1osQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRy9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFFckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FB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QUM7UUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzFDO0lBR0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FDM0QsQ0FBQztJQUNGLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsRUFBRTtRQUVqQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQztLQUNyRTtJQUNELElBQUksS0FBSyxDQUFDLHdCQUF3QixFQUFFLEVBQUU7UUFFcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckU7QUFDSCxDQUFDO0FBQUEsQ0FBQztBQUVGLFNBQVMsZ0JBQWdCLENBQUMsR0FBUTtJQUNoQyxNQUFNLEVBQUMsU0FBUyxF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QyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBSzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQVEsQ0FBQztJQUN0RCxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFFLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUMvRSxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQVVuRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBSWhDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFNL0IsTUFBTSxDQUFDLE1B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QUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBSS9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFXbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUtuQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFFaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFLdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBR3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV2RCxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQVUxQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUdsQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUtuRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7SUFDMUQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFJL0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUc7UUFDN0IsQ0FBQyxLQUFLO1FBQ0wsS0FBSztRQUNMLEtBQUs7S0FFUCxDQUFDO0lBR0YsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO0lBRWxDLElBQUksS0FBSyxDQUFDLHNCQUFzQixFQUFFLEVBQUU7UUFFbEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBRTFDO0lBS0QsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS3pDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztJQUMvQixLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFO1FBQ2hFLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSTtZQUFFLEtBQUssQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0tBQzdEO0lBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUN6QyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDO0lBRTFELEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV6QyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFcEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFMUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFMUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDeEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7SUE0QnhCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBR3pDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBUXpDLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksRUFBRTtRQUMxQixLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUNoQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssS0FBSztnQkFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztZQUMvQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxLQUFLO2dCQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxLQUFLLENBQUM7U0FDbEQ7S0FDRjtBQUNILENBQUM7QUFHRCxTQUFTLFlBQVksQ0FBQyxHQUFRO0lBQzVCLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ2xDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztLQUNuQztJQUdELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNoQyxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsR0FBUTtJQUM1QixLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFFMUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksQ0FBQztRQUVoRCxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7S0FDNUI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUGVyZm9ybSBpbml0aWFsIGNsZWFudXAvc2V0dXAgb2YgdGhlIFJPTS5cblxuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgTG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlSWR9IGZyb20gJy4uL3JvbS9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtHbG9iYWxEaWFsb2csIExvY2FsRGlhbG9nfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljUHJlUGFyc2UocHJnOiBVaW50OEFycmF5KTogdm9pZCB7XG4gIC8vIFJlbW92ZSB1bnVzZWQgaXRlbS90cmlnZ2VyIGFjdGlvbnNcbiAgcHJnWzB4MWUwNmJdICY9IDc7IC8vIG1lZGljYWwgaGVyYiBub3JtYWwgdXNhZ2UgPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA2Zl0gJj0gNzsgLy8gbWFnaWMgcmluZyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNzNdICY9IDc7IC8vIGZydWl0IG9mIGxpbWUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDc3XSAmPSA3OyAvLyBhbnRpZG90ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwN2JdICY9IDc7IC8vIG9wZWwgc3RhdHVlIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA4NF0gJj0gNzsgLy8gd2FycCBib290cyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNCB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwOWJdICY9IDc7IC8vIHdpbmRtaWxsIGtleSBpdGVtdXNlWzFdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwYjldICY9IDc7IC8vIGdsb3dpbmcgbGFtcCBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluaXN0aWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG5cbiAgLy8gTk9URTogdGhpcyBpcyBkb25lIHZlcnkgZWFybHksIG1ha2Ugc3VyZSBhbnkgcmVmZXJlbmNlcyB0byB3YXJwXG4gIC8vIHBvaW50IGZsYWdzIGFyZSB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIG5ldyBvbmVzIVxuICBhZGRab21iaWVXYXJwKHJvbSk7XG4gIGNvbnNvbGlkYXRlSXRlbUdyYW50cyhyb20pO1xuXG4gIGFkZE1lemFtZVRyaWdnZXIocm9tKTtcblxuICBub3JtYWxpemVTd29yZHMocm9tLCBmbGFncyk7XG5cbiAgZml4Q29pblNwcml0ZXMocm9tKTtcblxuICBtYWtlQnJhY2VsZXRzUHJvZ3Jlc3NpdmUocm9tKTtcblxuICBhZGRUb3dlckV4aXQocm9tKTtcbiAgcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbSk7XG4gIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tKTtcbiAgcHJldmVudE5wY0Rlc3Bhd25zKHJvbSwgZmxhZ3MpO1xuICBsZWFmRWxkZXJJblNhYnJlSGVhbHMocm9tKTtcbiAgaWYgKGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkpIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbSk7XG4gIGlmIChmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpKSByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbSk7XG5cbiAgYWRqdXN0SXRlbU5hbWVzKHJvbSwgZmxhZ3MpO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBtYWtpbmcgYSBUcmFuc2Zvcm1hdGlvbiBpbnRlcmZhY2UsIHdpdGggb3JkZXJpbmcgY2hlY2tzXG4gIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tLCBmbGFncyk7IC8vIE5PVEU6IHByZS1zaHVmZmxlXG4gIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tKTtcbiAgaWYgKGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgICAvLyBub3QgU2h5cm9uX1RlbXBsZSBzaW5jZSBuby10aHVuZGVyLXN3b3JkLWZvci1tYXNzYWNyZVxuICAgIHJvbS50b3duV2FycC50aHVuZGVyU3dvcmRXYXJwID0gW3JvbS5sb2NhdGlvbnMuU2h5cm9uLmlkLCAweDQxXTtcbiAgfSBlbHNlIHtcbiAgICBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfVxuXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tKTtcbiAgaWYgKGZsYWdzLmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSBmb2dMYW1wTm90UmVxdWlyZWQocm9tKTtcblxuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSkge1xuICAgIGVhc3RDYXZlKHJvbSwgZmxhZ3MpO1xuICAgIGlmIChmbGFncy5jb25uZWN0R29hVG9MZWFmKCkpIHtcbiAgICAgIGNvbm5lY3RHb2FUb0xlYWYocm9tKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tKTtcbiAgfVxuICBldmlsU3Bpcml0SXNsYW5kUmVxdWlyZXNEb2xwaGluKHJvbSk7XG4gIGNsb3NlQ2F2ZUVudHJhbmNlcyhyb20sIGZsYWdzKTtcbiAgc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tKTtcbiAgYWRkQ29yZGVsV2VzdFRyaWdnZXJzKHJvbSwgZmxhZ3MpO1xuICBpZiAoZmxhZ3MuZGlzYWJsZVJhYmJpdFNraXAoKSkgZml4UmFiYml0U2tpcChyb20pO1xuXG4gIGZpeFJldmVyc2VXYWxscyhyb20pO1xuICBpZiAoZmxhZ3MuY2hhcmdlU2hvdHNPbmx5KCkpIGRpc2FibGVTdGFicyhyb20pO1xuICBpZiAoZmxhZ3Mub3Jic09wdGlvbmFsKCkpIG9yYnNPcHRpb25hbChyb20pO1xuXG4gIGZpeE1pbWljcyhyb20pOyAvLyBOT1RFOiBhZnRlciBhbGwgbWltaWNzXG59XG5cbi8vIFVwZGF0ZXMgYSBmZXcgaXRlbXVzZSBhbmQgdHJpZ2dlciBhY3Rpb25zIGluIGxpZ2h0IG9mIGNvbnNvbGlkYXRpb24gd2Vcbi8vIGFyb3VuZCBpdGVtIGdyYW50aW5nLlxuZnVuY3Rpb24gY29uc29saWRhdGVJdGVtR3JhbnRzKHJvbTogUm9tKTogdm9pZCB7XG4gIHJvbS5pdGVtcy5HbG93aW5nTGFtcC5pdGVtVXNlRGF0YVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MGI7XG59XG5cbi8vIEFkZHMgYSB0cmlnZ2VyIGFjdGlvbiB0byBtZXphbWUuICBVc2UgODcgbGVmdG92ZXIgZnJvbSByZXNjdWluZyB6ZWJ1LlxuZnVuY3Rpb24gYWRkTWV6YW1lVHJpZ2dlcihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB0cmlnZ2VyID0gcm9tLm5leHRGcmVlVHJpZ2dlcigpO1xuICB0cmlnZ2VyLnVzZWQgPSB0cnVlO1xuICB0cmlnZ2VyLmNvbmRpdGlvbnMgPSBbfjB4MmYwXTtcbiAgdHJpZ2dlci5tZXNzYWdlID0gTWVzc2FnZUlkLm9mKHthY3Rpb246IDR9KTtcbiAgdHJpZ2dlci5mbGFncyA9IFsweDJmMF07XG4gIGNvbnN0IG1lemFtZSA9IHJvbS5sb2NhdGlvbnMuTWV6YW1lU2hyaW5lO1xuICBtZXphbWUuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3RpbGU6IDB4ODgsIHR5cGU6IDIsIGlkOiB0cmlnZ2VyLmlkfSkpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTd29yZHMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIC8vIHdpbmQgMSA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2luZCAyID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gNlxuICAvLyB3aW5kIDMgPT4gMi0zIGhpdHMgOE1QICAgICAgICA9PiA4XG5cbiAgLy8gZmlyZSAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyBmaXJlIDIgPT4gMyBoaXRzICAgICAgICAgICAgICA9PiA1XG4gIC8vIGZpcmUgMyA9PiA0LTYgaGl0cyAxNk1QICAgICAgID0+IDdcblxuICAvLyB3YXRlciAxID0+IDEgaGl0ICAgICAgICAgICAgICA9PiAzXG4gIC8vIHdhdGVyIDIgPT4gMS0yIGhpdHMgICAgICAgICAgID0+IDZcbiAgLy8gd2F0ZXIgMyA9PiAzLTYgaGl0cyAxNk1QICAgICAgPT4gOFxuXG4gIC8vIHRodW5kZXIgMSA9PiAxLTIgaGl0cyBzcHJlYWQgID0+IDNcbiAgLy8gdGh1bmRlciAyID0+IDEtMyBoaXRzIHNwcmVhZCAgPT4gNVxuICAvLyB0aHVuZGVyIDMgPT4gNy0xMCBoaXRzIDQwTVAgICA9PiA3XG5cbiAgcm9tLm9iamVjdHNbMHgxMF0uYXRrID0gMzsgLy8gd2luZCAxXG4gIHJvbS5vYmplY3RzWzB4MTFdLmF0ayA9IDY7IC8vIHdpbmQgMlxuICByb20ub2JqZWN0c1sweDEyXS5hdGsgPSA4OyAvLyB3aW5kIDNcblxuICByb20ub2JqZWN0c1sweDE4XS5hdGsgPSAzOyAvLyBmaXJlIDFcbiAgcm9tLm9iamVjdHNbMHgxM10uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTldLmF0ayA9IDU7IC8vIGZpcmUgMlxuICByb20ub2JqZWN0c1sweDE3XS5hdGsgPSA3OyAvLyBmaXJlIDNcbiAgcm9tLm9iamVjdHNbMHgxYV0uYXRrID0gNzsgLy8gZmlyZSAzXG5cbiAgcm9tLm9iamVjdHNbMHgxNF0uYXRrID0gMzsgLy8gd2F0ZXIgMVxuICByb20ub2JqZWN0c1sweDE1XS5hdGsgPSA2OyAvLyB3YXRlciAyXG4gIHJvbS5vYmplY3RzWzB4MTZdLmF0ayA9IDg7IC8vIHdhdGVyIDNcblxuICByb20ub2JqZWN0c1sweDFjXS5hdGsgPSAzOyAvLyB0aHVuZGVyIDFcbiAgcm9tLm9iamVjdHNbMHgxZV0uYXRrID0gNTsgLy8gdGh1bmRlciAyXG4gIHJvbS5vYmplY3RzWzB4MWJdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuICByb20ub2JqZWN0c1sweDFmXS5hdGsgPSA3OyAvLyB0aHVuZGVyIDNcblxuICBpZiAoZmxhZ3Muc2xvd0Rvd25Ub3JuYWRvKCkpIHtcbiAgICAvLyBUT0RPIC0gdG9ybmFkbyAob2JqIDEyKSA9PiBzcGVlZCAwNyBpbnN0ZWFkIG9mIDA4XG4gICAgLy8gICAgICAtIGxpZmV0aW1lIGlzIDQ4MCA9PiA3MCBtYXliZSB0b28gbG9uZywgNjAgc3dlZXQgc3BvdD9cbiAgICBjb25zdCB0b3JuYWRvID0gcm9tLm9iamVjdHNbMHgxMl07XG4gICAgdG9ybmFkby5zcGVlZCA9IDB4MDc7XG4gICAgdG9ybmFkby5kYXRhWzB4MGNdID0gMHg2MDsgLy8gaW5jcmVhc2UgbGlmZXRpbWUgKDQ4MCkgYnkgMjAlXG4gIH1cbn1cblxuZnVuY3Rpb24gZml4Q29pblNwcml0ZXMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBwYWdlIG9mIFsweDYwLCAweDY0LCAweDY1LCAweDY2LCAweDY3LCAweDY4LFxuICAgICAgICAgICAgICAgICAgICAgIDB4NjksIDB4NmEsIDB4NmIsIDB4NmMsIDB4NmQsIDB4NmZdKSB7XG4gICAgZm9yIChjb25zdCBwYXQgb2YgWzAsIDEsIDJdKSB7XG4gICAgICByb20ucGF0dGVybnNbcGFnZSA8PCA2IHwgcGF0XS5waXhlbHMgPSByb20ucGF0dGVybnNbMHg1ZSA8PCA2IHwgcGF0XS5waXhlbHM7XG4gICAgfVxuICB9XG4gIHJvbS5vYmplY3RzWzB4MGNdLm1ldGFzcHJpdGUgPSAweGE5O1xufVxuXG4vKipcbiAqIEZpeCB0aGUgc29mdGxvY2sgdGhhdCBoYXBwZW5zIHdoZW4geW91IGdvIHRocm91Z2hcbiAqIGEgd2FsbCBiYWNrd2FyZHMgYnkgbW92aW5nIHRoZSBleGl0L2VudHJhbmNlIHRpbGVzXG4gKiB1cCBhIGJpdCBhbmQgYWRqdXN0aW5nIHNvbWUgdGlsZUVmZmVjdHMgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBmaXhSZXZlcnNlV2FsbHMocm9tOiBSb20pIHtcbiAgLy8gYWRqdXN0IHRpbGUgZWZmZWN0IGZvciBiYWNrIHRpbGVzIG9mIGlyb24gd2FsbFxuICBmb3IgKGNvbnN0IHQgaW4gWzB4MDQsIDB4MDUsIDB4MDgsIDB4MDldKSB7XG4gICAgcm9tLnRpbGVFZmZlY3RzWzB4YmMgLSAweGIzXS5lZmZlY3RzW3RdID0gMHgxODtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiNSAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICB9XG4gIC8vIFRPRE8gLSBtb3ZlIGFsbCB0aGUgZW50cmFuY2VzIHRvIHk9MjAgYW5kIGV4aXRzIHRvIHl0PTAxXG59XG5cbi8qKiBNYWtlIGEgbGFuZCBicmlkZ2UgaW4gdW5kZXJncm91bmQgY2hhbm5lbCAqL1xuZnVuY3Rpb24gdW5kZXJncm91bmRDaGFubmVsTGFuZEJyaWRnZShyb206IFJvbSkge1xuICBjb25zdCB7dGlsZXN9ID0gcm9tLnNjcmVlbnNbMHhhMV07XG4gIHRpbGVzWzB4MjhdID0gMHg5ZjtcbiAgdGlsZXNbMHgzN10gPSAweDIzO1xuICB0aWxlc1sweDM4XSA9IDB4MjM7IC8vIDB4OGU7XG4gIHRpbGVzWzB4MzldID0gMHgyMTtcbiAgdGlsZXNbMHg0N10gPSAweDhkO1xuICB0aWxlc1sweDQ4XSA9IDB4OGY7XG4gIHRpbGVzWzB4NTZdID0gMHg5OTtcbiAgdGlsZXNbMHg1N10gPSAweDlhO1xuICB0aWxlc1sweDU4XSA9IDB4OGM7XG59XG5cbmZ1bmN0aW9uIGZvZ0xhbXBOb3RSZXF1aXJlZChyb206IFJvbSkge1xuICAvLyBOZWVkIHRvIG1ha2Ugc2V2ZXJhbCBjaGFuZ2VzLlxuICAvLyAoMSkgZG9scGhpbiBvbmx5IHJlcXVpcmVzIHNoZWxsIGZsdXRlLCBtYWtlIHRoZSBmbGFnIGNoZWNrIGZyZWUgKH4wMDApXG4gIHJvbS5pdGVtc1sweDM2XS5pdGVtVXNlRGF0YVswXS53YW50ID0gfjA7XG4gIC8vICgyKSBrZW5zdSA2OCAoQDYxKSBkcm9wcyBhbiBpdGVtICg2NyBtYWdpYyByaW5nKVxuICByb20ubnBjc1sweDY4XS5kYXRhWzBdID0gMHg2NztcbiAgcm9tLm5wY3NbMHg2OF0ubG9jYWxEaWFsb2dzLmdldCgtMSkhWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwYTtcbiAgcm9tLm5wY3NbMHg2OF0ubG9jYWxEaWFsb2dzLmdldCgtMSkhWzBdLmZsYWdzID0gW107XG4gIHJvbS5ucGNzWzB4NjhdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHg2MSwgWzB4MjEsIH4weDBjMV0pXG4gIC8vICgzKSBmaXNoZXJtYW4gNjQgc3Bhd25zIG9uIGZvZyBsYW1wIHJhdGhlciB0aGFuIHNoZWxsIGZsdXRlXG4gIHJvbS5ucGNzWzB4NjRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkNiwgWzB4MjM1XSk7XG5cbiAgLy8gKDQpIGZpeCB1cCBpdGVtZ2V0IDY3IGZyb20gaXRlbWdldCA2NCAoZGVsZXRlIHRoZSBmbGFnKVxuICByb20uaXRlbUdldHNbMHg2NF0uZmxhZ3MgPSBbXTtcbiAgcm9tLml0ZW1HZXRzWzB4NjddLmNvcHlGcm9tKHJvbS5pdGVtR2V0c1sweDY0XSk7XG4gIHJvbS5pdGVtR2V0c1sweDY3XS5mbGFncyA9IFsweDBjMV07XG5cbiAgLy8gVE9ETyAtIGdyYXBoaWNzIHNjcmV3ZWQgdXAgLSBmaWd1cmUgb3V0IGlmIG9iamVjdCBhY3Rpb24gaXMgY2hhbmdpbmdcbiAgLy8gdGhlIHBhdHRlcm4gdGFibGVzIGJhc2VkIG9uIChlLmcuKSAkNjAwLHggbWF5YmU/ICBDYW4gd2UgcHJldmVudCBpdD9cblxuICAvLyBUT0RPIC0gYWRkIGEgbm90ZXMgZmlsZSBhYm91dCB0aGlzLlxuXG59XG5cbi8qKlxuICogUmVtb3ZlIHRpbWVyIHNwYXducywgcmVudW1iZXJzIG1pbWljIHNwYXducyBzbyB0aGF0IHRoZXkncmUgdW5pcXVlLlxuICogUnVucyBiZWZvcmUgc2h1ZmZsZSBiZWNhdXNlIHdlIG5lZWQgdG8gaWRlbnRpZnkgdGhlIHNsb3QuICBSZXF1aXJlc1xuICogYW4gYXNzZW1ibHkgY2hhbmdlICgkM2QzZmQgaW4gcHJlc2h1ZmZsZS5zKVxuICovXG5mdW5jdGlvbiBmaXhNaW1pY3Mocm9tOiBSb20pOiB2b2lkIHtcbiAgbGV0IG1pbWljID0gMHg3MDtcbiAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGZvciAoY29uc3QgcyBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICBpZiAoIXMuaXNDaGVzdCgpKSBjb250aW51ZTtcbiAgICAgIHMudGltZWQgPSBmYWxzZTtcbiAgICAgIGlmIChzLmlkID49IDB4NzApIHMuaWQgPSBtaW1pYysrO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gZmluZCBhIGJldHRlciB3YXkgdG8gYnVuZGxlIGFzbSBjaGFuZ2VzP1xuICAvLyByb20uYXNzZW1ibGUoKVxuICAvLyAgICAgLiQoJ2FkYyAkMTAnKVxuICAvLyAgICAgLmJlcSgnbGFiZWwnKVxuICAvLyAgICAgLmxzaCgpXG4gIC8vICAgICAubHNoKGAke2FkZHJ9LHhgKVxuICAvLyAgICAgLmxhYmVsKCdsYWJlbCcpO1xuICAvLyByb20ucGF0Y2goKVxuICAvLyAgICAgLm9yZygweDNkM2ZkKVxuICAvLyAgICAgLmJ5dGUoMHhiMCk7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgbCA9IHJvbS5sb2NhdGlvbnM7XG4gIC8vIE1vdmUgS2VsYmVzcXVlIDIgb25lIGZ1bGwgdGlsZSBsZWZ0LlxuICBsLkdvYUZvcnRyZXNzX0tlbGJlc3F1ZS5zcGF3bnNbMF0ueCAtPSAxNjtcbiAgLy8gUmVtb3ZlIHNhZ2Ugc2NyZWVuIGxvY2tzIChleGNlcHQgS2Vuc3UpLlxuICBsLkdvYUZvcnRyZXNzX1plYnUuc3Bhd25zLnNwbGljZSgxLCAxKTsgLy8gemVidSBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfVG9ybmVsLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIHRvcm5lbCBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfQXNpbmEuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gYXNpbmEgc2NyZWVuIGxvY2sgdHJpZ2dlclxufVxuXG5mdW5jdGlvbiBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBjb25zdCB7V2F0ZXJmYWxsQ2F2ZTR9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBNb3ZlIGFsYXJtIGZsdXRlIHRvIHRoaXJkIHJvd1xuICByb20uaXRlbUdldHNbMHgzMV0uaW52ZW50b3J5Um93U3RhcnQgPSAweDIwO1xuICAvLyBFbnN1cmUgYWxhcm0gZmx1dGUgY2Fubm90IGJlIGRyb3BwZWRcbiAgLy8gcm9tLnByZ1sweDIxMDIxXSA9IDB4NDM7IC8vIFRPRE8gLSByb20uaXRlbXNbMHgzMV0uPz8/XG4gIHJvbS5pdGVtc1sweDMxXS51bmlxdWUgPSB0cnVlO1xuICAvLyBFbnN1cmUgYWxhcm0gZmx1dGUgY2Fubm90IGJlIHNvbGRcbiAgcm9tLml0ZW1zWzB4MzFdLmJhc2VQcmljZSA9IDA7XG5cbiAgaWYgKGZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkpIHtcbiAgICAvLyBQZXJzb24gMTQgKFplYnUncyBzdHVkZW50KTogc2Vjb25kYXJ5IGl0ZW0gLT4gYWxhcm0gZmx1dGVcbiAgICByb20ubnBjc1sweDE0XS5kYXRhWzFdID0gMHgzMTsgLy8gTk9URTogQ2xvYmJlcnMgc2h1ZmZsZWQgaXRlbSEhIVxuICB9IGVsc2Uge1xuICAgIHJvbS5ucGNzWzB4MTRdLmRhdGFbMV0gPSAweGZmOyAvLyBpbmRpY2F0ZSBub3RoaW5nIHRoZXJlOiBubyBzbG90LlxuICB9XG5cbiAgLy8gUmVtb3ZlIGFsYXJtIGZsdXRlIGZyb20gc2hvcHMgKHJlcGxhY2Ugd2l0aCBvdGhlciBpdGVtcylcbiAgLy8gTk9URSAtIHdlIGNvdWxkIHNpbXBsaWZ5IHRoaXMgd2hvbGUgdGhpbmcgYnkganVzdCBoYXJkY29kaW5nIGluZGljZXMuXG4gIC8vICAgICAgLSBpZiB0aGlzIGlzIGd1YXJhbnRlZWQgdG8gaGFwcGVuIGVhcmx5LCBpdCdzIGFsbCB0aGUgc2FtZS5cbiAgY29uc3QgcmVwbGFjZW1lbnRzID0gW1xuICAgIFsweDIxLCAwLjcyXSwgLy8gZnJ1aXQgb2YgcG93ZXIsIDcyJSBvZiBjb3N0XG4gICAgWzB4MWYsIDAuOV0sIC8vIGx5c2lzIHBsYW50LCA5MCUgb2YgY29zdFxuICBdO1xuICBsZXQgaiA9IDA7XG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5jb250ZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHNob3AuY29udGVudHNbaV0gIT09IDB4MzEpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgW2l0ZW0sIHByaWNlUmF0aW9dID0gcmVwbGFjZW1lbnRzWyhqKyspICUgcmVwbGFjZW1lbnRzLmxlbmd0aF07XG4gICAgICBzaG9wLmNvbnRlbnRzW2ldID0gaXRlbTtcbiAgICAgIGlmIChyb20uc2hvcERhdGFUYWJsZXNBZGRyZXNzKSB7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgaXMgYnJva2VuIC0gbmVlZCBhIGNvbnRyb2xsZWQgd2F5IHRvIGNvbnZlcnQgcHJpY2UgZm9ybWF0c1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IE1hdGgucm91bmQoc2hvcC5wcmljZXNbaV0gKiBwcmljZVJhdGlvKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDaGFuZ2UgZmx1dGUgb2YgbGltZSBjaGVzdCdzIChub3ctdW51c2VkKSBpdGVtZ2V0IHRvIGhhdmUgbWVkaWNhbCBoZXJiXG4gIHJvbS5pdGVtR2V0c1sweDViXS5pdGVtSWQgPSAweDFkO1xuICAvLyBDaGFuZ2UgdGhlIGFjdHVhbCBzcGF3biBmb3IgdGhhdCBjaGVzdCB0byBiZSB0aGUgbWlycm9yZWQgc2hpZWxkIGNoZXN0XG4gIFdhdGVyZmFsbENhdmU0LnNwYXduKDB4MTkpLmlkID0gMHgxMDtcblxuICAvLyBUT0RPIC0gcmVxdWlyZSBuZXcgY29kZSBmb3IgdHdvIHVzZXNcbn1cblxuZnVuY3Rpb24gYnJva2FoYW5hV2FudHNNYWRvMShyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBicm9rYWhhbmEgPSByb20ubnBjc1sweDU0XTtcbiAgY29uc3QgZGlhbG9nID0gYXNzZXJ0KGJyb2thaGFuYS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSlbMF07XG4gIGlmIChkaWFsb2cuY29uZGl0aW9uICE9PSB+MHgwMjQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBicm9rYWhhbmEgY29uZGl0aW9uOiAke2RpYWxvZy5jb25kaXRpb259YCk7XG4gIH1cbiAgZGlhbG9nLmNvbmRpdGlvbiA9IH4weDA2NzsgLy8gdmFuaWxsYSBiYWxsIG9mIHRodW5kZXIgLyBkZWZlYXRlZCBtYWRvIDFcbn1cblxuZnVuY3Rpb24gcmVxdWlyZUhlYWxlZERvbHBoaW4ocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gTm9ybWFsbHkgdGhlIGZpc2hlcm1hbiAoJDY0KSBzcGF3bnMgaW4gaGlzIGhvdXNlICgkZDYpIGlmIHlvdSBoYXZlXG4gIC8vIHRoZSBzaGVsbCBmbHV0ZSAoMjM2KS4gIEhlcmUgd2UgYWxzbyBhZGQgYSByZXF1aXJlbWVudCBvbiB0aGUgaGVhbGVkXG4gIC8vIGRvbHBoaW4gc2xvdCAoMDI1KSwgd2hpY2ggd2Uga2VlcCBhcm91bmQgc2luY2UgaXQncyBhY3R1YWxseSB1c2VmdWwuXG4gIHJvbS5ucGNzWzB4NjRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkNiwgWzB4MjM2LCAweDAyNV0pO1xuICAvLyBBbHNvIGZpeCBkYXVnaHRlcidzIGRpYWxvZyAoJDdiKS5cbiAgY29uc3QgZGF1Z2h0ZXJEaWFsb2cgPSByb20ubnBjc1sweDdiXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSE7XG4gIGRhdWdodGVyRGlhbG9nLnVuc2hpZnQoZGF1Z2h0ZXJEaWFsb2dbMF0uY2xvbmUoKSk7XG4gIGRhdWdodGVyRGlhbG9nWzBdLmNvbmRpdGlvbiA9IH4weDAyNTtcbiAgZGF1Z2h0ZXJEaWFsb2dbMV0uY29uZGl0aW9uID0gfjB4MjM2O1xufVxuXG5mdW5jdGlvbiByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vdCBoYXZpbmcgdGVsZXBhdGh5ICgyNDMpIHdpbGwgdHJpZ2dlciBhIFwia3l1IGt5dVwiICgxYToxMiwgMWE6MTMpIGZvclxuICAvLyBib3RoIGdlbmVyaWMgYnVubmllcyAoNTkpIGFuZCBkZW8gKDVhKS5cbiAgcm9tLm5wY3NbMHg1OV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEyXSkpO1xuICByb20ubnBjc1sweDVhXS5nbG9iYWxEaWFsb2dzLnB1c2goR2xvYmFsRGlhbG9nLm9mKH4weDI0MywgWzB4MWEsIDB4MTNdKSk7XG59XG5cbmZ1bmN0aW9uIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gaXRlbWdldCAwMyBzd29yZCBvZiB0aHVuZGVyID0+IHNldCAyZmQgc2h5cm9uIHdhcnAgcG9pbnRcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmZsYWdzLnB1c2goMHgyZmQpO1xuICAvLyBkaWFsb2cgNjIgYXNpbmEgaW4gZjIvZjQgc2h5cm9uIC0+IGFjdGlvbiAxZiAodGVsZXBvcnQgdG8gc3RhcnQpXG4gIC8vICAgLSBub3RlOiBmMiBhbmQgZjQgZGlhbG9ncyBhcmUgbGlua2VkLlxuICBmb3IgKGNvbnN0IGkgb2YgWzAsIDEsIDNdKSB7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgWzB4ZjIsIDB4ZjRdKSB7XG4gICAgICByb20ubnBjc1sweDYyXS5sb2NhbERpYWxvZ3MuZ2V0KGxvYykhW2ldLm1lc3NhZ2UuYWN0aW9uID0gMHgxZjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIENoYW5nZSBzd29yZCBvZiB0aHVuZGVyJ3MgYWN0aW9uIHRvIGJiZSB0aGUgc2FtZSBhcyBvdGhlciBzd29yZHMgKDE2KVxuICByb20uaXRlbUdldHNbMHgwM10uYWNxdWlzaXRpb25BY3Rpb24uYWN0aW9uID0gMHgxNjtcbn1cblxuZnVuY3Rpb24gYWRqdXN0SXRlbU5hbWVzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBpZiAoZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAvLyByZW5hbWUgbGVhdGhlciBib290cyB0byBzcGVlZCBib290c1xuICAgIGNvbnN0IGxlYXRoZXJCb290cyA9IHJvbS5pdGVtc1sweDJmXSE7XG4gICAgbGVhdGhlckJvb3RzLm1lbnVOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBsZWF0aGVyQm9vdHMubWVzc2FnZU5hbWUgPSAnU3BlZWQgQm9vdHMnO1xuICAgIGlmIChmbGFncy5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCkpIHtcbiAgICAgIGNvbnN0IGdhc01hc2sgPSByb20uaXRlbXNbMHgyOV07XG4gICAgICBnYXNNYXNrLm1lbnVOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICAgIGdhc01hc2subWVzc2FnZU5hbWUgPSAnSGF6bWF0IFN1aXQnO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlbmFtZSBiYWxscyB0byBvcmJzXG4gIGZvciAobGV0IGkgPSAweDA1OyBpIDwgMHgwYzsgaSArPSAyKSB7XG4gICAgcm9tLml0ZW1zW2ldLm1lbnVOYW1lID0gcm9tLml0ZW1zW2ldLm1lbnVOYW1lLnJlcGxhY2UoJ0JhbGwnLCAnT3JiJyk7XG4gICAgcm9tLml0ZW1zW2ldLm1lc3NhZ2VOYW1lID0gcm9tLml0ZW1zW2ldLm1lc3NhZ2VOYW1lLnJlcGxhY2UoJ0JhbGwnLCAnT3JiJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIHRvcm5lbCdzIHRyaWdnZXIgbmVlZHMgYm90aCBpdGVtc1xuICBjb25zdCB0b3JuZWwgPSByb20ubnBjc1sweDVmXTtcbiAgY29uc3QgdmFuaWxsYSA9IHRvcm5lbC5sb2NhbERpYWxvZ3MuZ2V0KDB4MjEpITtcbiAgY29uc3QgcGF0Y2hlZCA9IFtcbiAgICB2YW5pbGxhWzBdLCAvLyBhbHJlYWR5IGxlYXJuZWQgdGVsZXBvcnRcbiAgICB2YW5pbGxhWzJdLCAvLyBkb24ndCBoYXZlIHRvcm5hZG8gYnJhY2VsZXRcbiAgICB2YW5pbGxhWzJdLmNsb25lKCksIC8vIHdpbGwgY2hhbmdlIHRvIGRvbid0IGhhdmUgb3JiXG4gICAgdmFuaWxsYVsxXSwgLy8gaGF2ZSBicmFjZWxldCwgbGVhcm4gdGVsZXBvcnRcbiAgXTtcbiAgcGF0Y2hlZFsxXS5jb25kaXRpb24gPSB+MHgyMDY7IC8vIGRvbid0IGhhdmUgYnJhY2VsZXRcbiAgcGF0Y2hlZFsyXS5jb25kaXRpb24gPSB+MHgyMDU7IC8vIGRvbid0IGhhdmUgb3JiXG4gIHBhdGNoZWRbM10uY29uZGl0aW9uID0gfjA7ICAgICAvLyBkZWZhdWx0XG4gIHRvcm5lbC5sb2NhbERpYWxvZ3Muc2V0KDB4MjEsIHBhdGNoZWQpO1xufVxuXG5mdW5jdGlvbiBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIFtyb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuS2lyaXNhTWVhZG93XSkge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBzZXQgdGhlIG5ldyBcImludmlzaWJsZVwiIGZsYWcgb24gdGhlIGNoZXN0LlxuICAgICAgaWYgKHNwYXduLmlzQ2hlc3QoKSkgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgIH1cbiAgfVxufVxuXG4vLyBBZGQgdGhlIHN0YXR1ZSBvZiBvbnl4IGFuZCBwb3NzaWJseSB0aGUgdGVsZXBvcnQgYmxvY2sgdHJpZ2dlciB0byBDb3JkZWwgV2VzdFxuZnVuY3Rpb24gYWRkQ29yZGVsV2VzdFRyaWdnZXJzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICBjb25zdCB7Q29yZGVsUGxhaW5FYXN0LCBDb3JkZWxQbGFpbldlc3R9ID0gcm9tLmxvY2F0aW9ucztcbiAgZm9yIChjb25zdCBzcGF3biBvZiBDb3JkZWxQbGFpbkVhc3Quc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzQ2hlc3QoKSB8fCAoZmxhZ3MuZGlzYWJsZVRlbGVwb3J0U2tpcCgpICYmIHNwYXduLmlzVHJpZ2dlcigpKSkge1xuICAgICAgLy8gQ29weSBpZiAoMSkgaXQncyB0aGUgY2hlc3QsIG9yICgyKSB3ZSdyZSBkaXNhYmxpbmcgdGVsZXBvcnQgc2tpcFxuICAgICAgQ29yZGVsUGxhaW5XZXN0LnNwYXducy5wdXNoKHNwYXduLmNsb25lKCkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhSYWJiaXRTa2lwKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5NdFNhYnJlTm9ydGhfTWFpbi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4ODYpIHtcbiAgICAgIGlmIChzcGF3bi54ID09PSAweDc0MCkge1xuICAgICAgICBzcGF3bi54ICs9IDE2O1xuICAgICAgICBzcGF3bi55ICs9IDE2O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRUb3dlckV4aXQocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1Rvd2VyRW50cmFuY2UsIENyeXB0X1RlbGVwb3J0ZXJ9ID0gcm9tLmxvY2F0aW9ucztcbiAgY29uc3QgZW50cmFuY2UgPSBDcnlwdF9UZWxlcG9ydGVyLmVudHJhbmNlcy5sZW5ndGg7XG4gIGNvbnN0IGRlc3QgPSBDcnlwdF9UZWxlcG9ydGVyLmlkO1xuICBDcnlwdF9UZWxlcG9ydGVyLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt0aWxlOiAweDY4fSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1NywgZGVzdCwgZW50cmFuY2V9KSk7XG4gIFRvd2VyRW50cmFuY2UuZXhpdHMucHVzaChFeGl0Lm9mKHt0aWxlOiAweDU4LCBkZXN0LCBlbnRyYW5jZX0pKTtcbn1cblxuLy8gUHJvZ3JhbW1hdGljYWxseSBhZGQgYSBob2xlIGJldHdlZW4gdmFsbGV5IG9mIHdpbmQgYW5kIGxpbWUgdHJlZSB2YWxsZXlcbmZ1bmN0aW9uIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7VmFsbGV5T2ZXaW5kLCBMaW1lVHJlZVZhbGxleX0gPSByb20ubG9jYXRpb25zO1xuXG4gIFZhbGxleU9mV2luZC5zY3JlZW5zWzVdWzRdID0gMHgxMDsgLy8gbmV3IGV4aXRcbiAgTGltZVRyZWVWYWxsZXkuc2NyZWVuc1sxXVswXSA9IDB4MWE7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMl1bMF0gPSAweDBjOyAvLyBuaWNlciBtb3VudGFpbnNcblxuICBjb25zdCB3aW5kRW50cmFuY2UgPVxuICAgICAgVmFsbGV5T2ZXaW5kLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDRlZiwgeTogMHg1Nzh9KSkgLSAxO1xuICBjb25zdCBsaW1lRW50cmFuY2UgPVxuICAgICAgTGltZVRyZWVWYWxsZXkuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3g6IDB4MDEwLCB5OiAweDFjMH0pKSAtIDE7XG5cbiAgVmFsbGV5T2ZXaW5kLmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NjAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4NGYwLCB5OiAweDU3MCwgZGVzdDogMHg0MiwgZW50cmFuY2U6IGxpbWVFbnRyYW5jZX0pKTtcbiAgTGltZVRyZWVWYWxsZXkuZXhpdHMucHVzaChcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFiMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pLFxuICAgICAgRXhpdC5vZih7eDogMHgwMDAsIHk6IDB4MWMwLCBkZXN0OiAweDAzLCBlbnRyYW5jZTogd2luZEVudHJhbmNlfSkpO1xufVxuXG5mdW5jdGlvbiBjbG9zZUNhdmVFbnRyYW5jZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIC8vIFByZXZlbnQgc29mdGxvY2sgZnJvbSBleGl0aW5nIHNlYWxlZCBjYXZlIGJlZm9yZSB3aW5kbWlsbCBzdGFydGVkXG4gIHJvbS5sb2NhdGlvbnMuVmFsbGV5T2ZXaW5kLmVudHJhbmNlc1sxXS55ICs9IDE2O1xuXG4gIC8vIENsZWFyIHRpbGVzIDEsMiwzLDQgZm9yIGJsb2NrYWJsZSBjYXZlcyBpbiB0aWxlc2V0cyA5MCwgOTQsIGFuZCA5Y1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5MF0sXG4gICAgICAgICAgICAgICAgICAgIFsweDA3LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MGUsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDIxLCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG4gIHJvbS5zd2FwTWV0YXRpbGVzKFsweDk0LCAweDljXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4NjgsIFsweDAxLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4MywgWzB4MDIsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDg4LCBbMHgwMywgMHgwYV0sIH4weGQ3XSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODksIFsweDA0LCAweDBhXSwgfjB4ZDddKTtcblxuICAvLyBOb3cgcmVwbGFjZSB0aGUgdGlsZXMgd2l0aCB0aGUgYmxvY2thYmxlIG9uZXNcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDM5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDhdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHg0OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4NzldID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg3YV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDg5XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4OGFdID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ4XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NDldID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OF0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDU5XSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1Nl0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDU3XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjZdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg2N10gPSAweDA0O1xuXG4gIC8vIERlc3RydWN0dXJlIG91dCBhIGZldyBsb2NhdGlvbnMgYnkgbmFtZVxuICBjb25zdCB7XG4gICAgQ29yZGVsUGxhaW5XZXN0LFxuICAgIENvcmRlbFBsYWluRWFzdCxcbiAgICBEZXNlcnQyLFxuICAgIEdvYVZhbGxleSxcbiAgICBMaW1lVHJlZVZhbGxleSxcbiAgICBLaXJpc2FNZWFkb3csXG4gICAgU2FoYXJhT3V0c2lkZUNhdmUsXG4gICAgVmFsbGV5T2ZXaW5kLFxuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLFxuICAgIFdhdGVyZmFsbFZhbGxleVNvdXRoLFxuICB9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBOT1RFOiBmbGFnIDJmMCBpcyBBTFdBWVMgc2V0IC0gdXNlIGl0IGFzIGEgYmFzZWxpbmUuXG4gIGNvbnN0IGZsYWdzVG9DbGVhcjogW0xvY2F0aW9uLCBudW1iZXJdW10gPSBbXG4gICAgW1ZhbGxleU9mV2luZCwgMHgzMF0sIC8vIHZhbGxleSBvZiB3aW5kLCB6ZWJ1J3MgY2F2ZVxuICAgIFtDb3JkZWxQbGFpbldlc3QsIDB4MzBdLCAvLyBjb3JkZWwgd2VzdCwgdmFtcGlyZSBjYXZlXG4gICAgW0NvcmRlbFBsYWluRWFzdCwgMHgzMF0sIC8vIGNvcmRlbCBlYXN0LCB2YW1waXJlIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDBdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIHByaXNvbiBjYXZlXG4gICAgW1dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDE0XSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBmb2cgbGFtcFxuICAgIFtXYXRlcmZhbGxWYWxsZXlTb3V0aCwgMHg3NF0sIC8vIHdhdGVyZmFsbCBzb3V0aCwga2lyaXNhXG4gICAgW0tpcmlzYU1lYWRvdywgMHgxMF0sIC8vIGtpcmlzYSBtZWFkb3dcbiAgICBbU2FoYXJhT3V0c2lkZUNhdmUsIDB4MDBdLCAvLyBjYXZlIHRvIGRlc2VydFxuICAgIFtEZXNlcnQyLCAweDQxXSxcbiAgXTtcbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkgJiYgZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICBmbGFnc1RvQ2xlYXIucHVzaChbTGltZVRyZWVWYWxsZXksIDB4MTBdKTtcbiAgfVxuICBpZiAoZmxhZ3MuY29ubmVjdEdvYVRvTGVhZigpKSB7XG4gICAgZmxhZ3NUb0NsZWFyLnB1c2goW0dvYVZhbGxleSwgMHgwMV0pO1xuICB9XG4gIGZvciAoY29uc3QgW2xvYywgeXhdIG9mIGZsYWdzVG9DbGVhcikge1xuICAgIGxvYy5mbGFncy5wdXNoKEZsYWcub2Yoe3l4LCBmbGFnOiAweDJmMH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2VGbGFnKGxvYzogTG9jYXRpb24sIHl4OiBudW1iZXIsIGZsYWc6IG51bWJlcik6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgIGlmIChmLnl4ID09PSB5eCkge1xuICAgICAgICBmLmZsYWcgPSBmbGFnO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZmxhZyB0byByZXBsYWNlIGF0ICR7bG9jfToke3l4fWApO1xuICB9O1xuXG4gIGlmIChmbGFncy5wYXJhbHlzaXNSZXF1aXJlc1ByaXNvbktleSgpKSB7IC8vIGNsb3NlIG9mZiByZXZlcnNlIGVudHJhbmNlc1xuICAgIC8vIE5PVEU6IHdlIGNvdWxkIGFsc28gY2xvc2UgaXQgb2ZmIHVudGlsIGJvc3Mga2lsbGVkLi4uP1xuICAgIC8vICAtIGNvbnN0IHZhbXBpcmVGbGFnID0gfnJvbS5ucGNTcGF3bnNbMHhjMF0uY29uZGl0aW9uc1sweDBhXVswXTtcbiAgICAvLyAgLT4ga2VsYmVzcXVlIGZvciB0aGUgb3RoZXIgb25lLlxuICAgIGNvbnN0IHdpbmRtaWxsRmxhZyA9IDB4MmVlO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluV2VzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbkVhc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG5cbiAgICByZXBsYWNlRmxhZyhXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMCwgMHgyZDgpOyAvLyBrZXkgdG8gcHJpc29uIGZsYWdcbiAgICBjb25zdCBleHBsb3Npb24gPSBTcGF3bi5vZih7eTogMHgwNjAsIHg6IDB4MDYwLCB0eXBlOiA0LCBpZDogMHgyY30pO1xuICAgIGNvbnN0IGtleVRyaWdnZXIgPSBTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MDcwLCB0eXBlOiAyLCBpZDogMHhhZH0pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5zcGxpY2UoMSwgMCwgZXhwbG9zaW9uKTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMucHVzaChrZXlUcmlnZ2VyKTtcbiAgfVxuXG4gIC8vIHJvbS5sb2NhdGlvbnNbMHgxNF0udGlsZUVmZmVjdHMgPSAweGIzO1xuXG4gIC8vIGQ3IGZvciAzP1xuXG4gIC8vIFRPRE8gLSB0aGlzIGVuZGVkIHVwIHdpdGggbWVzc2FnZSAwMDowMyBhbmQgYW4gYWN0aW9uIHRoYXQgZ2F2ZSBib3cgb2YgbW9vbiFcblxuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5wYXJ0ID0gMHgxYjtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UuaW5kZXggPSAweDA4O1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0uZmxhZ3MucHVzaCgweDJmNiwgMHgyZjcsIDB4MmY4KTtcbn1cblxuLy8gQHRzLWlnbm9yZTogbm90IHlldCB1c2VkXG5mdW5jdGlvbiBlYXN0Q2F2ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gVE9ETyBmaWxsIHVwIGdyYXBoaWNzLCBldGMgLS0+ICQxYSwgJDFiLCAkMDUgLyAkODgsICRiNSAvICQxNCwgJDAyXG4gIC8vIFRoaW5rIGFvYnV0IGV4aXRzIGFuZCBlbnRyYW5jZXMuLi4/XG5cbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXksIFNlYWxlZENhdmUxfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgY29uc3QgbG9jMSA9IHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUocm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTEpO1xuICBjb25zdCBsb2MyID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMik7XG4gIGNvbnN0IGxvYzMgPSByb20ubG9jYXRpb25zLkVhc3RDYXZlMztcblxuICAvLyBOT1RFOiAweDljIGNhbiBiZWNvbWUgMHg5OSBpbiB0b3AgbGVmdCBvciAweDk3IGluIHRvcCByaWdodCBvciBib3R0b20gbWlkZGxlIGZvciBhIGNhdmUgZXhpdFxuICBsb2MxLnNjcmVlbnMgPSBbWzB4OWMsIDB4ODQsIDB4ODAsIDB4ODMsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODEsIDB4ODMsIDB4ODYsIDB4ODBdLFxuICAgICAgICAgICAgICAgICAgWzB4ODMsIDB4ODgsIDB4ODksIDB4ODAsIDB4ODBdLFxuICAgICAgICAgICAgICAgICAgWzB4ODEsIDB4OGMsIDB4ODUsIDB4ODIsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgWzB4OWUsIDB4ODUsIDB4OWMsIDB4OTgsIDB4ODZdXTtcblxuICBsb2MyLnNjcmVlbnMgPSBbWzB4OWMsIDB4ODQsIDB4OWIsIDB4ODAsIDB4OWJdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODEsIDB4ODEsIDB4ODAsIDB4ODFdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODcsIDB4OGIsIDB4OGEsIDB4ODZdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4OGMsIDB4ODAsIDB4ODUsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgWzB4OWMsIDB4ODYsIDB4ODAsIDB4ODAsIDB4OWFdXTtcblxuICBmb3IgKGNvbnN0IGwgb2YgW2xvYzEsIGxvYzIsIGxvYzNdKSB7XG4gICAgbC5iZ20gPSAweDE3OyAvLyBtdCBzYWJyZSBjYXZlIG11c2ljP1xuICAgIGwuZW50cmFuY2VzID0gW107XG4gICAgbC5leGl0cyA9IFtdO1xuICAgIGwucGl0cyA9IFtdO1xuICAgIGwuc3Bhd25zID0gW107XG4gICAgbC5mbGFncyA9IFtdO1xuICAgIGwuaGVpZ2h0ID0gbC5zY3JlZW5zLmxlbmd0aDtcbiAgICBsLndpZHRoID0gbC5zY3JlZW5zWzBdLmxlbmd0aDtcbiAgICBsLmV4dGVuZGVkID0gMDtcbiAgICBsLnRpbGVQYWxldHRlcyA9IFsweDFhLCAweDFiLCAweDA1XTsgLy8gcm9jayB3YWxsXG4gICAgbC50aWxlc2V0ID0gMHg4ODtcbiAgICBsLnRpbGVFZmZlY3RzID0gMHhiNTtcbiAgICBsLnRpbGVQYXR0ZXJucyA9IFsweDE0LCAweDAyXTtcbiAgICBsLnNwcml0ZVBhdHRlcm5zID0gWy4uLlNlYWxlZENhdmUxLnNwcml0ZVBhdHRlcm5zXSBhcyBbbnVtYmVyLCBudW1iZXJdO1xuICAgIGwuc3ByaXRlUGFsZXR0ZXMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGFsZXR0ZXNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gIH1cblxuICAvLyBBZGQgZW50cmFuY2UgdG8gdmFsbGV5IG9mIHdpbmRcbiAgLy8gVE9ETyAtIG1heWJlIGp1c3QgZG8gKDB4MzMsIFtbMHgxOV1dKSBvbmNlIHdlIGZpeCB0aGF0IHNjcmVlbiBmb3IgZ3Jhc3NcbiAgVmFsbGV5T2ZXaW5kLndyaXRlU2NyZWVuczJkKDB4MjMsIFtcbiAgICBbMHgxMSwgMHgwZF0sXG4gICAgWzB4MDksIDB4YzJdXSk7XG4gIHJvbS50aWxlRWZmZWN0c1swXS5lZmZlY3RzWzB4YzBdID0gMDtcbiAgLy8gVE9ETyAtIGRvIHRoaXMgb25jZSB3ZSBmaXggdGhlIHNlYSB0aWxlc2V0XG4gIC8vIHJvbS5zY3JlZW5zWzB4YzJdLnRpbGVzWzB4NWFdID0gMHgwYTtcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1Yl0gPSAweDBhO1xuXG4gIC8vIENvbm5lY3QgbWFwc1xuICBsb2MxLmNvbm5lY3QoMHg0MywgbG9jMiwgMHg0NCk7XG4gIGxvYzEuY29ubmVjdCgweDQwLCBWYWxsZXlPZldpbmQsIDB4MzQpO1xuXG4gIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIC8vIEFkZCBlbnRyYW5jZSB0byBsaW1lIHRyZWUgdmFsbGV5XG4gICAgTGltZVRyZWVWYWxsZXkucmVzaXplU2NyZWVucygwLCAxLCAwLCAwKTsgLy8gYWRkIG9uZSBzY3JlZW4gdG8gbGVmdCBlZGdlXG4gICAgTGltZVRyZWVWYWxsZXkud3JpdGVTY3JlZW5zMmQoMHgwMCwgW1xuICAgICAgWzB4MGMsIDB4MTFdLFxuICAgICAgWzB4MTUsIDB4MzZdLFxuICAgICAgWzB4MGUsIDB4MGZdXSk7XG4gICAgbG9jMS5zY3JlZW5zWzBdWzRdID0gMHg5NzsgLy8gZG93biBzdGFpclxuICAgIGxvYzEuY29ubmVjdCgweDA0LCBMaW1lVHJlZVZhbGxleSwgMHgxMCk7XG4gIH1cblxuICAvLyBBZGQgbW9uc3RlcnNcbiAgbG9jMS5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDIxLCB0aWxlOiAweDg3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4ODgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTMsIHRpbGU6IDB4ODksIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMiwgdGlsZTogMHg2OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MDMsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGxvYzIuc3Bhd25zLnB1c2goXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDExLCB0aWxlOiAweDQ4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEyLCB0aWxlOiAweDc3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTQsIHRpbGU6IDB4MjgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjMsIHRpbGU6IDB4ODUsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDhhLCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDM0LCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4NDEsIHRpbGU6IDB4ODIsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGlmICghZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIGNoZXN0OiBhbGFybSBmbHV0ZVxuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MTEwLCB4OiAweDQ3OCwgdHlwZTogMiwgaWQ6IDB4MzF9KSk7XG4gIH1cbiAgaWYgKGZsYWdzLmFkZEV4dHJhQ2hlY2tzVG9FYXN0Q2F2ZSgpKSB7XG4gICAgLy8gY2hlc3Q6IG1lZGljYWwgaGVyYlxuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MTEwLCB4OiAweDQ3OCwgdHlwZTogMiwgaWQ6IDB4NTl9KSk7XG4gICAgLy8gY2hlc3Q6IG1pbWljXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MTA4LCB0eXBlOiAyLCBpZDogMHg3MH0pKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gY29ubmVjdEdvYVRvTGVhZihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7R29hVmFsbGV5LCBFYXN0Q2F2ZTIsIEVhc3RDYXZlM30gPSByb20ubG9jYXRpb25zO1xuICAvLyBBZGQgYSBuZXcgY2F2ZSB0byB0aGUgdG9wLWxlZnQgY29ybmVyIG9mIEdvYSBWYWxsZXkuXG4gIEdvYVZhbGxleS53cml0ZVNjcmVlbnMyZCgweDAwLCBbXG4gICAgICBbMHgwYywgMHhjMSwgMHgwZF0sXG4gICAgICBbMHgwZSwgMHgzNywgMHgzNV1dKTtcbiAgLy8gQWRkIGFuIGV4dHJhIGRvd24tc3RhaXIgdG8gRWFzdENhdmUyIGFuZCBhIG5ldyAzLXNjcmVlbiBFYXN0Q2F2ZTMgbWFwLlxuXG4gIHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUoRWFzdENhdmUzKTtcbiAgRWFzdENhdmUzLnNjcmVlbnMgPSBbWzB4OWFdLFxuICAgICAgICAgICAgICAgICAgICAgICBbMHg4Zl0sXG4gICAgICAgICAgICAgICAgICAgICAgIFsweDllXV07XG4gIEVhc3RDYXZlMy5oZWlnaHQgPSAzO1xuICBFYXN0Q2F2ZTMud2lkdGggPSAxO1xuXG4gIC8vIEFkZCBhIHJvY2sgd2FsbCAoaWQ9MCkuXG4gIEVhc3RDYXZlMy5zcGF3bnMucHVzaChTcGF3bi5mcm9tKFsweDE4LCAweDA3LCAweDIzLCAweDAwXSkpO1xuICBFYXN0Q2F2ZTMuZmxhZ3MucHVzaChGbGFnLm9mKHtzY3JlZW46IDB4MTAsIGZsYWc6IHJvbS5mbGFncy5hbGxvYygweDIwMCl9KSk7XG5cbiAgLy8gTWFrZSB0aGUgY29ubmVjdGlvbnMuXG4gIEVhc3RDYXZlMi5zY3JlZW5zWzRdWzBdID0gMHg5OTtcbiAgRWFzdENhdmUyLmNvbm5lY3QoMHg0MCwgRWFzdENhdmUzLCB+MHgwMCk7XG4gIEVhc3RDYXZlMy5jb25uZWN0KDB4MjAsIEdvYVZhbGxleSwgMHgwMSk7XG59XG5cbmZ1bmN0aW9uIGFkZFpvbWJpZVdhcnAocm9tOiBSb20pIHtcbiAgLy8gTWFrZSBzcGFjZSBmb3IgdGhlIG5ldyBmbGFnIGJldHdlZW4gSm9lbCBhbmQgU3dhblxuICBmb3IgKGxldCBpID0gMHgyZjU7IGkgPCAweDJmYzsgaSsrKSB7XG4gICAgcm9tLm1vdmVGbGFnKGksIGkgLSAxKTtcbiAgfVxuICAvLyBVcGRhdGUgdGhlIG1lbnVcbiAgY29uc3QgbWVzc2FnZSA9IHJvbS5tZXNzYWdlcy5wYXJ0c1sweDIxXVswXTtcbiAgbWVzc2FnZS50ZXh0ID0gW1xuICAgICcgezFhOkxlYWZ9ICAgICAgezE2OkJyeW5tYWVyfSB7MWQ6T2FrfSAnLFxuICAgICd7MGM6TmFkYXJlfVxcJ3MgIHsxZTpQb3J0b2F9ICAgezE0OkFtYXpvbmVzfSAnLFxuICAgICd7MTk6Sm9lbH0gICAgICBab21iaWUgICB7MjA6U3dhbn0gJyxcbiAgICAnezIzOlNoeXJvbn0gICAgezE4OkdvYX0gICAgICB7MjE6U2FoYXJhfScsXG4gIF0uam9pbignXFxuJyk7XG4gIC8vIEFkZCBhIHRyaWdnZXIgdG8gdGhlIGVudHJhbmNlIC0gdGhlcmUncyBhbHJlYWR5IGEgc3Bhd24gZm9yIDhhXG4gIC8vIGJ1dCB3ZSBjYW4ndCByZXVzZSB0aGF0IHNpbmNlIGl0J3MgdGhlIHNhbWUgYXMgdGhlIG9uZSBvdXRzaWRlXG4gIC8vIHRoZSBtYWluIEVTSSBlbnRyYW5jZTsgc28gcmV1c2UgYSBkaWZmZXJlbnQgb25lLlxuICBjb25zdCB0cmlnZ2VyID0gcm9tLm5leHRGcmVlVHJpZ2dlcigpO1xuICB0cmlnZ2VyLnVzZWQgPSB0cnVlO1xuICB0cmlnZ2VyLmNvbmRpdGlvbnMgPSBbXTtcbiAgdHJpZ2dlci5tZXNzYWdlID0gTWVzc2FnZUlkLm9mKHt9KTtcbiAgdHJpZ2dlci5mbGFncyA9IFsweDJmYl07IC8vIG5ldyB3YXJwIHBvaW50IGZsYWdcbiAgLy8gQWN0dWFsbHkgcmVwbGFjZSB0aGUgdHJpZ2dlci5cbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhhKSB7XG4gICAgICBzcGF3bi5pZCA9IHRyaWdnZXIuaWQ7XG4gICAgfVxuICB9XG4gIHJvbS50b3duV2FycC5sb2NhdGlvbnMuc3BsaWNlKDcsIDAsIHJvbS5sb2NhdGlvbnMuWm9tYmllVG93bi5pZCk7XG4gIGlmIChyb20udG93bldhcnAubG9jYXRpb25zLnBvcCgpICE9PSAweGZmKSB0aHJvdyBuZXcgRXJyb3IoJ3VuZXhwZWN0ZWQnKTtcbiAgLy8gQVNNIGZpeGVzIHNob3VsZCBoYXZlIGhhcHBlbmVkIGluIHByZXNodWZmbGUuc1xufVxuXG5mdW5jdGlvbiBldmlsU3Bpcml0SXNsYW5kUmVxdWlyZXNEb2xwaGluKHJvbTogUm9tKSB7XG4gIHJvbS50cmlnZ2VyKDB4OGEpLmNvbmRpdGlvbnMgPSBbfjB4MGVlXTsgLy8gbmV3IGZsYWcgZm9yIHJpZGluZyBkb2xwaGluXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1sweDFkXVsweDEwXS50ZXh0ID0gYFRoZSBjYXZlIGVudHJhbmNlIGFwcGVhcnNcbnRvIGJlIHVuZGVyd2F0ZXIuIFlvdSdsbFxubmVlZCB0byBzd2ltLmA7XG59XG5cbmZ1bmN0aW9uIHJldmVyc2libGVTd2FuR2F0ZShyb206IFJvbSkge1xuICAvLyBBbGxvdyBvcGVuaW5nIFN3YW4gZnJvbSBlaXRoZXIgc2lkZSBieSBhZGRpbmcgYSBwYWlyIG9mIGd1YXJkcyBvbiB0aGVcbiAgLy8gb3Bwb3NpdGUgc2lkZSBvZiB0aGUgZ2F0ZS5cbiAgcm9tLmxvY2F0aW9uc1sweDczXS5zcGF3bnMucHVzaChcbiAgICAvLyBOT1RFOiBTb2xkaWVycyBtdXN0IGNvbWUgaW4gcGFpcnMgKHdpdGggaW5kZXggXjEgZnJvbSBlYWNoIG90aGVyKVxuICAgIFNwYXduLm9mKHt4dDogMHgwYSwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBiLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGUsIHl0OiAweDBhLCB0eXBlOiAyLCBpZDogMHhiM30pLCAvLyBuZXcgdHJpZ2dlcjogZXJhc2UgZ3VhcmRzXG4gICk7XG5cbiAgLy8gR3VhcmRzICgkMmQpIGF0IHN3YW4gZ2F0ZSAoJDczKSB+IHNldCAxMGQgYWZ0ZXIgb3BlbmluZyBnYXRlID0+IGNvbmRpdGlvbiBmb3IgZGVzcGF3blxuICByb20ubnBjc1sweDJkXS5sb2NhbERpYWxvZ3MuZ2V0KDB4NzMpIVswXS5mbGFncy5wdXNoKDB4MTBkKTtcblxuICAvLyBEZXNwYXduIGd1YXJkIHRyaWdnZXIgcmVxdWlyZXMgMTBkXG4gIHJvbS50cmlnZ2VyKDB4YjMpLmNvbmRpdGlvbnMucHVzaCgweDEwZCk7XG59XG5cbmZ1bmN0aW9uIGxlYWZFbGRlckluU2FicmVIZWFscyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsZWFmRWxkZXIgPSByb20ubnBjc1sweDBkXTtcbiAgY29uc3Qgc3VtbWl0RGlhbG9nID0gbGVhZkVsZGVyLmxvY2FsRGlhbG9ncy5nZXQoMHgzNSkhWzBdO1xuICBzdW1taXREaWFsb2cubWVzc2FnZS5hY3Rpb24gPSAweDE3OyAvLyBoZWFsIGFuZCBkaXNhcHBlYXIuXG59XG5cbmZ1bmN0aW9uIHByZXZlbnROcGNEZXNwYXducyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgZnVuY3Rpb24gcmVtb3ZlPFQ+KGFycjogVFtdLCBlbGVtOiBUKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuaW5kZXhPZihlbGVtKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgJHtlbGVtfSBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVJZjxUPihhcnI6IFRbXSwgcHJlZDogKGVsZW06IFQpID0+IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5maW5kSW5kZXgocHJlZCk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhbG9nKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyID0gLTEpOiBMb2NhbERpYWxvZ1tdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0ubG9jYWxEaWFsb2dzLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZGlhbG9nICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gc3Bhd25zKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBzcGF3biBjb25kaXRpb24gJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIExpbmsgc29tZSByZWR1bmRhbnQgTlBDczogS2Vuc3UgKDdlLCA3NCkgYW5kIEFrYWhhbmEgKDg4LCAxNilcbiAgLy8gVXNlIDc0IGZvciBvbmx5IEtlbnN1IGluIGRhbmNlIGhhbGwgLSBub2JvZHkgZWxzZSB3aWxsIGFjY2VwdCB0cmFkZS1pbi5cbiAgcm9tLm5wY3NbMHg3NF0ubGluaygweDdlKTtcbiAgcm9tLm5wY3NbMHg3NF0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4NzRdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHg3ZV0uZGF0YV0gYXMgYW55O1xuICByb20ubG9jYXRpb25zLlN3YW5fRGFuY2VIYWxsLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4N2UpIS5pZCA9IDB4NzQ7XG4gIHJvbS5pdGVtcy5Mb3ZlUGVuZGFudC5pdGVtVXNlRGF0YVswXS53YW50ID0gMHgxNzQ7XG5cbiAgLy8gZGlhbG9nIGlzIHNoYXJlZCBiZXR3ZWVuIDg4IGFuZCAxNi5cbiAgcm9tLm5wY3NbMHg4OF0ubGlua0RpYWxvZygweDE2KTtcblxuICAvLyBHaXZlbiBLZW5zdSA3ZSBhIGdsb3dpbmcgbGFtcCBpbnN0ZWFkIG9mIGNoYW5nZSAoS2Vuc3UgNzQgaGFzIHRoYXQgbm93KVxuICByb20ubnBjc1sweDdlXS5kYXRhWzBdID0gMHgzOTsgLy8gZ2xvd2luZyBsYW1wXG5cbiAgLy8gTWFrZSBhIG5ldyBOUEMgZm9yIEFrYWhhbmEgaW4gQnJ5bm1hZXI7IG90aGVycyB3b24ndCBhY2NlcHQgdGhlIFN0YXR1ZSBvZiBPbnl4LlxuICAvLyBMaW5raW5nIHNwYXduIGNvbmRpdGlvbnMgYW5kIGRpYWxvZ3MgaXMgc3VmZmljaWVudCwgc2luY2UgdGhlIGFjdHVhbCBOUEMgSURcbiAgLy8gKDE2IG9yIDgyKSBpcyB3aGF0IG1hdHRlcnMgZm9yIHRoZSB0cmFkZS1pblxuICByb20ubnBjc1sweDgyXS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg4Ml0ubGluaygweDE2KTtcbiAgcm9tLm5wY3NbMHg4Ml0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDE2XS5kYXRhXSBhcyBhbnk7IC8vIGVuc3VyZSBnaXZlIGl0ZW1cbiAgcm9tLmxvY2F0aW9ucy5CcnlubWFlci5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDE2KSEuaWQgPSAweDgyO1xuICByb20uaXRlbXMuU3RhdHVlT2ZPbnl4Lml0ZW1Vc2VEYXRhWzBdLndhbnQgPSAweDE4MjtcblxuICAvLyBMZWFmIGVsZGVyIGluIGhvdXNlICgkMGQgQCAkYzApIH4gc3dvcmQgb2Ygd2luZCByZWR1bmRhbnQgZmxhZ1xuICAvLyBkaWFsb2coMHgwZCwgMHhjMClbMl0uZmxhZ3MgPSBbXTtcbiAgLy9yb20uaXRlbUdldHNbMHgwMF0uZmxhZ3MgPSBbXTsgLy8gY2xlYXIgcmVkdW5kYW50IGZsYWdcblxuICAvLyBMZWFmIHJhYmJpdCAoJDEzKSBub3JtYWxseSBzdG9wcyBzZXR0aW5nIGl0cyBmbGFnIGFmdGVyIHByaXNvbiBkb29yIG9wZW5lZCxcbiAgLy8gYnV0IHRoYXQgZG9lc24ndCBuZWNlc3NhcmlseSBvcGVuIG10IHNhYnJlLiAgSW5zdGVhZCAoYSkgdHJpZ2dlciBvbiAwNDdcbiAgLy8gKHNldCBieSA4ZCB1cG9uIGVudGVyaW5nIGVsZGVyJ3MgY2VsbCkuICBBbHNvIG1ha2Ugc3VyZSB0aGF0IHRoYXQgcGF0aCBhbHNvXG4gIC8vIHByb3ZpZGVzIHRoZSBuZWVkZWQgZmxhZyB0byBnZXQgaW50byBtdCBzYWJyZS5cbiAgZGlhbG9nKDB4MTMpWzJdLmNvbmRpdGlvbiA9IDB4MDQ3O1xuICBkaWFsb2coMHgxMylbMl0uZmxhZ3MgPSBbMHgwYTldO1xuICBkaWFsb2coMHgxMylbM10uZmxhZ3MgPSBbMHgwYTldO1xuXG4gIC8vIFdpbmRtaWxsIGd1YXJkICgkMTQgQCAkMGUpIHNob3VsZG4ndCBkZXNwYXduIGFmdGVyIGFiZHVjdGlvbiAoMDM4KSxcbiAgLy8gYnV0IGluc3RlYWQgYWZ0ZXIgZ2l2aW5nIHRoZSBpdGVtICgwODgpXG4gIHNwYXducygweDE0LCAweDBlKVsxXSA9IH4weDA4ODsgLy8gcmVwbGFjZSBmbGFnIH4wMzggPT4gfjA4OFxuICAvL2RpYWxvZygweDE0LCAweDBlKVswXS5mbGFncyA9IFtdOyAvLyByZW1vdmUgcmVkdW5kYW50IGZsYWcgfiB3aW5kbWlsbCBrZXlcblxuICAvLyBBa2FoYW5hICgkMTYgLyA4OCkgfiBzaGllbGQgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDE2LCAweDU3KVswXS5mbGFncyA9IFtdO1xuICAvLyBEb24ndCBkaXNhcHBlYXIgYWZ0ZXIgZ2V0dGluZyBiYXJyaWVyIChub3RlIDg4J3Mgc3Bhd25zIG5vdCBsaW5rZWQgdG8gMTYpXG4gIHJlbW92ZShzcGF3bnMoMHgxNiwgMHg1NyksIH4weDA1MSk7XG4gIHJlbW92ZShzcGF3bnMoMHg4OCwgMHg1NyksIH4weDA1MSk7XG5cbiAgZnVuY3Rpb24gcmV2ZXJzZURpYWxvZyhkczogTG9jYWxEaWFsb2dbXSk6IHZvaWQge1xuICAgIGRzLnJldmVyc2UoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBuZXh0ID0gZHNbaSArIDFdO1xuICAgICAgZHNbaV0uY29uZGl0aW9uID0gbmV4dCA/IH5uZXh0LmNvbmRpdGlvbiA6IH4wO1xuICAgIH1cbiAgfTtcblxuICAvLyBPYWsgZWxkZXIgKCQxZCkgfiBzd29yZCBvZiBmaXJlIHJlZHVuZGFudCBmbGFnXG4gIGNvbnN0IG9ha0VsZGVyRGlhbG9nID0gZGlhbG9nKDB4MWQpO1xuICAvL29ha0VsZGVyRGlhbG9nWzRdLmZsYWdzID0gW107XG4gIC8vIE1ha2Ugc3VyZSB0aGF0IHdlIHRyeSB0byBnaXZlIHRoZSBpdGVtIGZyb20gKmFsbCogcG9zdC1pbnNlY3QgZGlhbG9nc1xuICBvYWtFbGRlckRpYWxvZ1swXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMl0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1szXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG5cbiAgLy8gT2FrIG1vdGhlciAoJDFlKSB+IGluc2VjdCBmbHV0ZSByZWR1bmRhbnQgZmxhZ1xuICAvLyBUT0RPIC0gcmVhcnJhbmdlIHRoZXNlIGZsYWdzIGEgYml0IChtYXliZSB+MDQ1LCB+MGEwIH4wNDEgLSBzbyByZXZlcnNlKVxuICAvLyAgICAgIC0gd2lsbCBuZWVkIHRvIGNoYW5nZSBiYWxsT2ZGaXJlIGFuZCBpbnNlY3RGbHV0ZSBpbiBkZXBncmFwaFxuICBjb25zdCBvYWtNb3RoZXJEaWFsb2cgPSBkaWFsb2coMHgxZSk7XG4gICgoKSA9PiB7XG4gICAgY29uc3QgW2tpbGxlZEluc2VjdCwgZ290SXRlbSwgZ2V0SXRlbSwgZmluZENoaWxkXSA9IG9ha01vdGhlckRpYWxvZztcbiAgICBmaW5kQ2hpbGQuY29uZGl0aW9uID0gfjB4MDQ1O1xuICAgIC8vZ2V0SXRlbS5jb25kaXRpb24gPSB+MHgyMjc7XG4gICAgLy9nZXRJdGVtLmZsYWdzID0gW107XG4gICAgZ290SXRlbS5jb25kaXRpb24gPSB+MDtcbiAgICByb20ubnBjc1sweDFlXS5sb2NhbERpYWxvZ3Muc2V0KC0xLCBbZmluZENoaWxkLCBnZXRJdGVtLCBraWxsZWRJbnNlY3QsIGdvdEl0ZW1dKTtcbiAgfSkoKTtcbiAgLy8vIG9ha01vdGhlckRpYWxvZ1syXS5mbGFncyA9IFtdO1xuICAvLyAvLyBFbnN1cmUgd2UgYWx3YXlzIGdpdmUgaXRlbSBhZnRlciBpbnNlY3QuXG4gIC8vIG9ha01vdGhlckRpYWxvZ1swXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIC8vIG9ha01vdGhlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIC8vIHJldmVyc2VEaWFsb2cob2FrTW90aGVyRGlhbG9nKTtcblxuICAvLyBSZXZlcnNlIHRoZSBvdGhlciBvYWsgZGlhbG9ncywgdG9vLlxuICBmb3IgKGNvbnN0IGkgb2YgWzB4MjAsIDB4MjEsIDB4MjIsIDB4N2MsIDB4N2RdKSB7XG4gICAgcmV2ZXJzZURpYWxvZyhkaWFsb2coaSkpO1xuICB9XG5cbiAgLy8gU3dhcCB0aGUgZmlyc3QgdHdvIG9hayBjaGlsZCBkaWFsb2dzLlxuICBjb25zdCBvYWtDaGlsZERpYWxvZyA9IGRpYWxvZygweDFmKTtcbiAgb2FrQ2hpbGREaWFsb2cudW5zaGlmdCguLi5vYWtDaGlsZERpYWxvZy5zcGxpY2UoMSwgMSkpO1xuXG4gIC8vIFRocm9uZSByb29tIGJhY2sgZG9vciBndWFyZCAoJDMzIEAgJGRmKSBzaG91bGQgaGF2ZSBzYW1lIHNwYXduIGNvbmRpdGlvbiBhcyBxdWVlblxuICAvLyAoMDIwIE5PVCBxdWVlbiBub3QgaW4gdGhyb25lIHJvb20gQU5EIDAxYiBOT1Qgdmlld2VkIG1lc2lhIHJlY29yZGluZylcbiAgcm9tLm5wY3NbMHgzM10uc3Bhd25Db25kaXRpb25zLnNldCgweGRmLCAgW34weDAyMCwgfjB4MDFiXSk7XG5cbiAgLy8gRnJvbnQgcGFsYWNlIGd1YXJkICgkMzQpIHZhY2F0aW9uIG1lc3NhZ2Uga2V5cyBvZmYgMDFiIGluc3RlYWQgb2YgMDFmXG4gIGRpYWxvZygweDM0KVsxXS5jb25kaXRpb24gPSAweDAxYjtcblxuICAvLyBRdWVlbidzICgkMzgpIGRpYWxvZyBuZWVkcyBxdWl0ZSBhIGJpdCBvZiB3b3JrXG4gIC8vIEdpdmUgaXRlbSAoZmx1dGUgb2YgbGltZSkgZXZlbiBpZiBnb3QgdGhlIHN3b3JkIG9mIHdhdGVyXG4gIGRpYWxvZygweDM4KVszXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7IC8vIFwieW91IGZvdW5kIHN3b3JkXCIgPT4gYWN0aW9uIDNcbiAgZGlhbG9nKDB4MzgpWzRdLmZsYWdzLnB1c2goMHgwOWMpOyAgICAgLy8gc2V0IDA5YyBxdWVlbiBnb2luZyBhd2F5XG4gIC8vIFF1ZWVuIHNwYXduIGNvbmRpdGlvbiBkZXBlbmRzIG9uIDAxYiAobWVzaWEgcmVjb3JkaW5nKSBub3QgMDFmIChiYWxsIG9mIHdhdGVyKVxuICAvLyBUaGlzIGVuc3VyZXMgeW91IGhhdmUgYm90aCBzd29yZCBhbmQgYmFsbCB0byBnZXQgdG8gaGVyICg/Pz8pXG4gIHNwYXducygweDM4LCAweGRmKVsxXSA9IH4weDAxYjsgIC8vIHRocm9uZSByb29tOiAwMWIgTk9UIG1lc2lhIHJlY29yZGluZ1xuICBzcGF3bnMoMHgzOCwgMHhlMSlbMF0gPSAweDAxYjsgICAvLyBiYWNrIHJvb206IDAxYiBtZXNpYSByZWNvcmRpbmdcbiAgZGlhbG9nKDB4MzgpWzFdLmNvbmRpdGlvbiA9IDB4MDFiOyAgICAgLy8gcmV2ZWFsIGNvbmRpdGlvbjogMDFiIG1lc2lhIHJlY29yZGluZ1xuXG4gIC8vIEZvcnR1bmUgdGVsbGVyICgkMzkpIHNob3VsZCBhbHNvIG5vdCBzcGF3biBiYXNlZCBvbiBtZXNpYSByZWNvcmRpbmcgcmF0aGVyIHRoYW4gb3JiXG4gIHNwYXducygweDM5LCAweGQ4KVsxXSA9IH4weDAxYjsgIC8vIGZvcnR1bmUgdGVsbGVyIHJvb206IDAxYiBOT1RcblxuICAvLyBDbGFyayAoJDQ0KSBtb3ZlcyBhZnRlciB0YWxraW5nIHRvIGhpbSAoMDhkKSByYXRoZXIgdGhhbiBjYWxtaW5nIHNlYSAoMDhmKS5cbiAgLy8gVE9ETyAtIGNoYW5nZSAwOGQgdG8gd2hhdGV2ZXIgYWN0dWFsIGl0ZW0gaGUgZ2l2ZXMsIHRoZW4gcmVtb3ZlIGJvdGggZmxhZ3NcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU5LCBbfjB4MDhkXSk7IC8vIHpvbWJpZSB0b3duIGJhc2VtZW50XG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlNCwgWzB4MDhkXSk7ICAvLyBqb2VsIHNoZWRcbiAgLy9kaWFsb2coMHg0NCwgMHhlOSlbMV0uZmxhZ3MucG9wKCk7IC8vIHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG5cbiAgLy8gQnJva2FoYW5hICgkNTQpIH4gd2FycmlvciByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NTQpWzJdLmZsYWdzID0gW107XG5cbiAgLy8gRGVvICgkNWEpIH4gcGVuZGFudCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVhKVsxXS5mbGFncyA9IFtdO1xuXG4gIC8vIFplYnUgKCQ1ZSkgY2F2ZSBkaWFsb2cgKEAgJDEwKVxuICAvLyBUT0RPIC0gZGlhbG9ncygweDVlLCAweDEwKS5yZWFycmFuZ2UofjB4MDNhLCAweDAwZCwgMHgwMzgsIDB4MDM5LCAweDAwYSwgfjB4MDAwKTtcbiAgcm9tLm5wY3NbMHg1ZV0ubG9jYWxEaWFsb2dzLnNldCgweDEwLCBbXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDNhLCBbMHgwMCwgMHgxYV0sIFsweDAzYV0pLCAvLyAwM2EgTk9UIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgLT4gU2V0IDAzYVxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwZCwgWzB4MDAsIDB4MWRdKSwgLy8gMDBkIGxlYWYgdmlsbGFnZXJzIHJlc2N1ZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzgsIFsweDAwLCAweDFjXSksIC8vIDAzOCBsZWFmIGF0dGFja2VkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM5LCBbMHgwMCwgMHgxZF0pLCAvLyAwMzkgbGVhcm5lZCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBhLCBbMHgwMCwgMHgxYiwgMHgwM10pLCAvLyAwMGEgd2luZG1pbGwga2V5IHVzZWQgLT4gdGVhY2ggcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKH4weDAwMCwgWzB4MDAsIDB4MWRdKSxcbiAgXSk7XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJlbW92ZShzcGF3bnMoMHg1ZSwgMHgxMCksIH4weDA1MSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFRvcm5lbCAoJDVmKSBpbiBzYWJyZSB3ZXN0ICgkMjEpIH4gdGVsZXBvcnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1ZiwgMHgyMSlbMV0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg1Zl0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDIxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gU3RvbSAoJDYwKTogZG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg2MF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDFlKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gQXNpbmEgKCQ2MikgaW4gYmFjayByb29tICgkZTEpIGdpdmVzIGZsdXRlIG9mIGxpbWVcbiAgY29uc3QgYXNpbmEgPSByb20ubnBjc1sweDYyXTtcbiAgYXNpbmEuZGF0YVsxXSA9IDB4Mjg7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgLy8gUHJldmVudCBkZXNwYXduIGZyb20gYmFjayByb29tIGFmdGVyIGRlZmVhdGluZyBzYWJlcmEgKH4wOGYpXG4gIHJlbW92ZShzcGF3bnMoYXNpbmEuaWQsIDB4ZTEpLCB+MHgwOGYpO1xuXG4gIC8vIEtlbnN1IGluIGNhYmluICgkNjggQCAkNjEpIG5lZWRzIHRvIGJlIGF2YWlsYWJsZSBldmVuIGFmdGVyIHZpc2l0aW5nIEpvZWwuXG4gIC8vIENoYW5nZSBoaW0gdG8ganVzdCBkaXNhcHBlYXIgYWZ0ZXIgc2V0dGluZyB0aGUgcmlkZWFibGUgZG9scGhpbiBmbGFnICgwOWIpLFxuICAvLyBhbmQgdG8gbm90IGV2ZW4gc2hvdyB1cCBhdCBhbGwgdW5sZXNzIHRoZSBmb2cgbGFtcCB3YXMgcmV0dXJuZWQgKDAyMSkuXG4gIHJvbS5ucGNzWzB4NjhdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHg2MSwgW34weDA5YiwgMHgwMjFdKTtcbiAgZGlhbG9nKDB4NjgpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMjsgLy8gZGlzYXBwZWFyXG5cbiAgLy8gQXp0ZWNhIGluIFNoeXJvbiAoNmUpIHNob3VsZG4ndCBzcGF3biBhZnRlciBtYXNzYWNyZSAoMDI3KVxuICByb20ubnBjc1sweDZlXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4ZjIpIS5wdXNoKH4weDAyNyk7XG4gIC8vIEFsc28gdGhlIGRpYWxvZyB0cmlnZ2VyICg4Mikgc2hvdWxkbid0IGhhcHBlblxuICByb20udHJpZ2dlcigweDgyKS5jb25kaXRpb25zLnB1c2gofjB4MDI3KTtcblxuICAvLyBLZW5zdSBpbiBsaWdodGhvdXNlICgkNzQvJDdlIEAgJDYyKSB+IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NzQsIDB4NjIpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gQXp0ZWNhICgkODMpIGluIHB5cmFtaWQgfiBib3cgb2YgdHJ1dGggcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg4MylbMF0uY29uZGl0aW9uID0gfjB4MjQwOyAgLy8gMjQwIE5PVCBib3cgb2YgdHJ1dGhcbiAgLy9kaWFsb2coMHg4MylbMF0uZmxhZ3MgPSBbXTtcblxuICAvLyBSYWdlIGJsb2NrcyBvbiBzd29yZCBvZiB3YXRlciwgbm90IHJhbmRvbSBpdGVtIGZyb20gdGhlIGNoZXN0XG4gIGRpYWxvZygweGMzKVswXS5jb25kaXRpb24gPSAweDIwMjtcblxuICAvLyBSZW1vdmUgdXNlbGVzcyBzcGF3biBjb25kaXRpb24gZnJvbSBNYWRvIDFcbiAgcm9tLm5wY3NbMHhjNF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweGYyKTsgLy8gYWx3YXlzIHNwYXduXG5cbiAgLy8gRHJheWdvbiAyICgkY2IgQCBsb2NhdGlvbiAkYTYpIHNob3VsZCBkZXNwYXduIGFmdGVyIGJlaW5nIGRlZmVhdGVkLlxuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4YTYsIFt+MHgyOGRdKTsgLy8ga2V5IG9uIGJhY2sgd2FsbCBkZXN0cm95ZWRcblxuICAvLyBGaXggWmVidSB0byBnaXZlIGtleSB0byBzdHh5IGV2ZW4gaWYgdGh1bmRlciBzd29yZCBpcyBnb3R0ZW4gKGp1c3Qgc3dpdGNoIHRoZVxuICAvLyBvcmRlciBvZiB0aGUgZmlyc3QgdHdvKS4gIEFsc28gZG9uJ3QgYm90aGVyIHNldHRpbmcgMDNiIHNpbmNlIHRoZSBuZXcgSXRlbUdldFxuICAvLyBsb2dpYyBvYnZpYXRlcyB0aGUgbmVlZC5cbiAgY29uc3QgemVidVNoeXJvbiA9IHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5nZXQoMHhmMikhO1xuICB6ZWJ1U2h5cm9uLnVuc2hpZnQoLi4uemVidVNoeXJvbi5zcGxpY2UoMSwgMSkpO1xuICAvLyB6ZWJ1U2h5cm9uWzBdLmZsYWdzID0gW107XG5cbiAgLy8gU2h5cm9uIG1hc3NhY3JlICgkODApIHJlcXVpcmVzIGtleSB0byBzdHh5XG4gIHJvbS50cmlnZ2VyKDB4ODApLmNvbmRpdGlvbnMgPSBbXG4gICAgfjB4MDI3LCAvLyBub3QgdHJpZ2dlcmVkIG1hc3NhY3JlIHlldFxuICAgICAweDAzYiwgLy8gZ290IGl0ZW0gZnJvbSBrZXkgdG8gc3R4eSBzbG90XG4gICAgIDB4MmZkLCAvLyBzaHlyb24gd2FycCBwb2ludCB0cmlnZ2VyZWRcbiAgICAgLy8gMHgyMDMsIC8vIGdvdCBzd29yZCBvZiB0aHVuZGVyIC0gTk9UIEFOWSBNT1JFIVxuICBdO1xuXG4gIC8vIEVudGVyIHNoeXJvbiAoJDgxKSBzaG91bGQgc2V0IHdhcnAgbm8gbWF0dGVyIHdoYXRcbiAgcm9tLnRyaWdnZXIoMHg4MSkuY29uZGl0aW9ucyA9IFtdO1xuXG4gIGlmIChmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCkpIHtcbiAgICAvLyBMZWFybiBiYXJyaWVyICgkODQpIHJlcXVpcmVzIGNhbG0gc2VhXG4gICAgcm9tLnRyaWdnZXIoMHg4NCkuY29uZGl0aW9ucy5wdXNoKDB4MjgzKTsgLy8gMjgzIGNhbG1lZCB0aGUgc2VhXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIG5vdCBzZXR0aW5nIDA1MSBhbmQgY2hhbmdpbmcgdGhlIGNvbmRpdGlvbiB0byBtYXRjaCB0aGUgaXRlbVxuICB9XG4gIC8vcm9tLnRyaWdnZXIoMHg4NCkuZmxhZ3MgPSBbXTtcblxuICAvLyBBZGQgYW4gZXh0cmEgY29uZGl0aW9uIHRvIHRoZSBMZWFmIGFiZHVjdGlvbiB0cmlnZ2VyIChiZWhpbmQgemVidSkuICBUaGlzIGVuc3VyZXNcbiAgLy8gYWxsIHRoZSBpdGVtcyBpbiBMZWFmIHByb3BlciAoZWxkZXIgYW5kIHN0dWRlbnQpIGFyZSBnb3R0ZW4gYmVmb3JlIHRoZXkgZGlzYXBwZWFyLlxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2goMHgwM2EpOyAvLyAwM2EgdGFsa2VkIHRvIHplYnUgaW4gY2F2ZVxuXG4gIC8vIE1vcmUgd29yayBvbiBhYmR1Y3Rpb24gdHJpZ2dlcnM6XG4gIC8vIDEuIFJlbW92ZSB0aGUgOGQgdHJpZ2dlciBpbiB0aGUgZnJvbnQgb2YgdGhlIGNlbGwsIHN3YXAgaXQgb3V0XG4gIC8vICAgIGZvciBiMiAobGVhcm4gcGFyYWx5c2lzKS5cbiAgcm9tLnRyaWdnZXIoMHg4ZCkudXNlZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUuc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKSBzcGF3bi5pZCA9IDB4YjI7XG4gIH1cbiAgcmVtb3ZlSWYocm9tLmxvY2F0aW9ucy5XYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMsXG4gICAgICAgICAgIHNwYXduID0+IHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKTtcbiAgLy8gMi4gU2V0IHRoZSB0cmlnZ2VyIHRvIHJlcXVpcmUgaGF2aW5nIGtpbGxlZCBrZWxiZXNxdWUuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnMucHVzaCgweDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gMy4gQWxzbyBzZXQgdGhlIHRyaWdnZXIgdG8gZnJlZSB0aGUgdmlsbGFnZXJzIGFuZCB0aGUgZWxkZXIuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnB1c2gofjB4MDg0LCB+MHgwODUsIDB4MDBkKTtcbiAgLy8gNC4gRG9uJ3QgdHJpZ2dlciB0aGUgYWJkdWN0aW9uIGluIHRoZSBmaXJzdCBwbGFjZSBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA1LiBEb24ndCB0cmlnZ2VyIHJhYmJpdCBibG9jayBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDg2KS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA2LiBEb24ndCBmcmVlIHZpbGxhZ2VycyBmcm9tIHVzaW5nIHByaXNvbiBrZXlcbiAgcm9tLnByZ1sweDFlMGEzXSA9IDB4YzA7XG4gIHJvbS5wcmdbMHgxZTBhNF0gPSAweDAwO1xuXG4gIC8vIFRPRE8gLSBhZGRpdGlvbmFsIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXI6XG4gIC8vICAgLSBnZXQgcmlkIG9mIHRoZSBmbGFncyBvbiBrZXkgdG8gcHJpc29uIHVzZVxuICAvLyAgIC0gYWRkIGEgY29uZGl0aW9uIHRoYXQgYWJkdWN0aW9uIGRvZXNuJ3QgaGFwcGVuIGlmIHJlc2N1ZWRcbiAgLy8gR2V0IHJpZCBvZiBCT1RIIHRyaWdnZXJzIGluIHN1bW1pdCBjYXZlLCAgSW5zdGVhZCwgdGllIGV2ZXJ5dGhpbmdcbiAgLy8gdG8gdGhlIGVsZGVyIGRpYWxvZyBvbiB0b3BcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBzdGlsbCBhbGl2ZSwgbWF5YmUgZ2l2ZSBhIGhpbnQgYWJvdXQgd2Vha25lc3NcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBkZWFkIHRoZW4gdGVhY2ggcGFyYWx5c2lzIGFuZCBzZXQvY2xlYXIgZmxhZ3NcbiAgLy8gICAtIGlmIHBhcmFseXNpcyBsZWFybmVkIHRoZW4gc2F5IHNvbWV0aGluZyBnZW5lcmljXG4gIC8vIFN0aWxsIG5lZWQgdG8ga2VlcCB0aGUgdHJpZ2dlciBpbiB0aGUgZnJvbnQgaW4gY2FzZSBub1xuICAvLyBhYmR1Y3Rpb24geWV0XG4gIC8vICAgLSBpZiBOT1QgcGFyYWx5c2lzIEFORCBpZiBOT1QgZWxkZXIgbWlzc2luZyBBTkQgaWYga2VsYmVxdWUgZGVhZFxuICAvLyAtLS0+IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBmb3IgdHdvIHdheXMgdG8gZ2V0IChsaWtlIHJlZnJlc2gpP1xuICAvL1xuICAvLyBBbHNvIGFkZCBhIGNoZWNrIHRoYXQgdGhlIHJhYmJpdCB0cmlnZ2VyIGlzIGdvbmUgaWYgcmVzY3VlZCFcblxuXG5cbiAgLy8gUGFyYWx5c2lzIHRyaWdnZXIgKCRiMikgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDI7XG4gIC8vcm9tLnRyaWdnZXIoMHhiMikuZmxhZ3Muc2hpZnQoKTsgLy8gcmVtb3ZlIDAzNyBsZWFybmVkIHBhcmFseXNpc1xuXG4gIC8vIExlYXJuIHJlZnJlc2ggdHJpZ2dlciAoJGI0KSB+IHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuY29uZGl0aW9uc1sxXSA9IH4weDI0MTtcbiAgLy9yb20udHJpZ2dlcigweGI0KS5mbGFncyA9IFtdOyAvLyByZW1vdmUgMDM5IGxlYXJuZWQgcmVmcmVzaFxuXG4gIC8vIFRlbGVwb3J0IGJsb2NrIG9uIG10IHNhYnJlIGlzIGZyb20gc3BlbGwsIG5vdCBzbG90XG4gIHJvbS50cmlnZ2VyKDB4YmEpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDQ7IC8vIH4wM2YgLT4gfjI0NFxuXG4gIC8vIFBvcnRvYSBwYWxhY2UgZ3VhcmQgbW92ZW1lbnQgdHJpZ2dlciAoJGJiKSBzdG9wcyBvbiAwMWIgKG1lc2lhKSBub3QgMDFmIChvcmIpXG4gIHJvbS50cmlnZ2VyKDB4YmIpLmNvbmRpdGlvbnNbMV0gPSB+MHgwMWI7XG5cbiAgLy8gUmVtb3ZlIHJlZHVuZGFudCB0cmlnZ2VyIDhhIChzbG90IDE2KSBpbiB6b21iaWV0b3duICgkNjUpXG4gIC8vICAtLSBub3RlOiBubyBsb25nZXIgbmVjZXNzYXJ5IHNpbmNlIHdlIHJlcHVycG9zZSBpdCBpbnN0ZWFkLlxuICAvLyBjb25zdCB7em9tYmllVG93bn0gPSByb20ubG9jYXRpb25zO1xuICAvLyB6b21iaWVUb3duLnNwYXducyA9IHpvbWJpZVRvd24uc3Bhd25zLmZpbHRlcih4ID0+ICF4LmlzVHJpZ2dlcigpIHx8IHguaWQgIT0gMHg4YSk7XG5cbiAgLy8gUmVwbGFjZSBhbGwgZGlhbG9nIGNvbmRpdGlvbnMgZnJvbSAwMGUgdG8gMjQzXG4gIGZvciAoY29uc3QgbnBjIG9mIHJvbS5ucGNzKSB7XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5hbGxEaWFsb2dzKCkpIHtcbiAgICAgIGlmIChkLmNvbmRpdGlvbiA9PT0gMHgwMGUpIGQuY29uZGl0aW9uID0gMHgyNDM7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IH4weDAwZSkgZC5jb25kaXRpb24gPSB+MHgyNDM7XG4gICAgfVxuICB9XG59XG5cbi8vIEhhcmQgbW9kZSBmbGFnOiBIYyAtIHplcm8gb3V0IHRoZSBzd29yZCdzIGNvbGxpc2lvbiBwbGFuZVxuZnVuY3Rpb24gZGlzYWJsZVN0YWJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbyBvZiBbMHgwOCwgMHgwOSwgMHgyN10pIHtcbiAgICByb20ub2JqZWN0c1tvXS5jb2xsaXNpb25QbGFuZSA9IDA7XG4gIH1cbiAgLy8gQWxzbyB0YWtlIHdhcnJpb3IgcmluZyBvdXQgb2YgdGhlIHBpY3R1cmUuLi4gOnRyb2xsOlxuICAvLyByb20uaXRlbUdldHNbMHgyYl0uaWQgPSAweDViOyAvLyBtZWRpY2FsIGhlcmIgZnJvbSBzZWNvbmQgZmx1dGUgb2YgbGltZSBjaGVja1xuICByb20ubnBjc1sweDU0XS5kYXRhWzBdID0gMHgyMDtcbn1cblxuZnVuY3Rpb24gb3Jic09wdGlvbmFsKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgb2JqIG9mIFsweDEwLCAweDE0LCAweDE4LCAweDFkXSkge1xuICAgIC8vIDEuIExvb3NlbiB0ZXJyYWluIHN1c2NlcHRpYmlsaXR5IG9mIGxldmVsIDEgc2hvdHNcbiAgICByb20ub2JqZWN0c1tvYmpdLnRlcnJhaW5TdXNjZXB0aWJpbGl0eSAmPSB+MHgwNDtcbiAgICAvLyAyLiBJbmNyZWFzZSB0aGUgbGV2ZWwgdG8gMlxuICAgIHJvbS5vYmplY3RzW29ial0ubGV2ZWwgPSAyO1xuICB9XG59XG4iXX0=