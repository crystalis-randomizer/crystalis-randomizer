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
        fogLampNotRequired(rom, flags);
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
function fogLampNotRequired(rom, flags) {
    const requireHealed = flags.requireHealedDolphinToRide();
    rom.items[0x36].itemUseData[0].want = requireHealed ? 0x025 : ~0x000;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuQixxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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SUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUUxQixJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRTtRQUczQixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0tBQzNCO0FBQ0gsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLEdBQVE7SUFDOUIsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSTtRQUNsQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ3ZELEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQzNCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMs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QUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVEsRUFBRSxLQUFjO0lBRWxELEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBR2hELEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDTixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDWixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFHL0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXJDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENB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QUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQzNELENBQUM7SUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxFQUFFO1FBRWpDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO0lBQ0QsSUFBSSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsRUFBRTtRQUVwQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLElB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QUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3JGLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBR2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBR2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUs5QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFRLENBQUM7SUFDdEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBRSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDL0UsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7SUFVbkQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENB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LENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3JDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFLbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBRWhELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUd0QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFdkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFVMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFHbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFLbkQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO0lBQzFELFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBSS9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHO1FBQzdCLENBQUMsS0FBSztRQUNMLEtBQUs7UUFDTCxL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QUFNLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBRTFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFaEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBlcmZvcm0gaW5pdGlhbCBjbGVhbnVwL3NldHVwIG9mIHRoZSBST00uXG5cbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIExvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuLi9yb20vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7R2xvYmFsRGlhbG9nLCBMb2NhbERpYWxvZ30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHthc3NlcnR9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHByZzogVWludDhBcnJheSk6IHZvaWQge1xuICAvLyBSZW1vdmUgdW51c2VkIGl0ZW0vdHJpZ2dlciBhY3Rpb25zXG4gIHByZ1sweDFlMDZiXSAmPSA3OyAvLyBtZWRpY2FsIGhlcmIgbm9ybWFsIHVzYWdlID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNmZdICY9IDc7IC8vIG1hZ2ljIHJpbmcgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDczXSAmPSA3OyAvLyBmcnVpdCBvZiBsaW1lIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3N10gJj0gNzsgLy8gYW50aWRvdGUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDdiXSAmPSA3OyAvLyBvcGVsIHN0YXR1ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwODRdICY9IDc7IC8vIHdhcnAgYm9vdHMgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDQgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDliXSAmPSA3OyAvLyB3aW5kbWlsbCBrZXkgaXRlbXVzZVsxXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMGI5XSAmPSA3OyAvLyBnbG93aW5nIGxhbXAgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuXG4gIC8vIE5PVEU6IHRoaXMgaXMgZG9uZSB2ZXJ5IGVhcmx5LCBtYWtlIHN1cmUgYW55IHJlZmVyZW5jZXMgdG8gd2FycFxuICAvLyBwb2ludCBmbGFncyBhcmUgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBuZXcgb25lcyFcbiAgYWRkWm9tYmllV2FycChyb20pO1xuICBjb25zb2xpZGF0ZUl0ZW1HcmFudHMocm9tKTtcblxuICBhZGRNZXphbWVUcmlnZ2VyKHJvbSk7XG5cbiAgbm9ybWFsaXplU3dvcmRzKHJvbSwgZmxhZ3MpO1xuXG4gIGZpeENvaW5TcHJpdGVzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIHJldmVyc2libGVTd2FuR2F0ZShyb20pO1xuICBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbSk7XG4gIHByZXZlbnROcGNEZXNwYXducyhyb20sIGZsYWdzKTtcbiAgbGVhZkVsZGVySW5TYWJyZUhlYWxzKHJvbSk7XG4gIGlmIChmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpKSByZXF1aXJlSGVhbGVkRG9scGhpbihyb20pO1xuICBpZiAoZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSkgcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb20pO1xuXG4gIGFkanVzdEl0ZW1OYW1lcyhyb20sIGZsYWdzKTtcblxuICAvLyBUT0RPIC0gY29uc2lkZXIgbWFraW5nIGEgVHJhbnNmb3JtYXRpb24gaW50ZXJmYWNlLCB3aXRoIG9yZGVyaW5nIGNoZWNrc1xuICBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbSwgZmxhZ3MpOyAvLyBOT1RFOiBwcmUtc2h1ZmZsZVxuICBicm9rYWhhbmFXYW50c01hZG8xKHJvbSk7XG4gIGlmIChmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gICAgLy8gbm90IFNoeXJvbl9UZW1wbGUgc2luY2Ugbm8tdGh1bmRlci1zd29yZC1mb3ItbWFzc2FjcmVcbiAgICByb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycCA9IFtyb20ubG9jYXRpb25zLlNoeXJvbi5pZCwgMHg0MV07XG4gIH0gZWxzZSB7XG4gICAgbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gIH1cblxuICB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbSk7XG4gIGlmIChmbGFncy5mb2dMYW1wTm90UmVxdWlyZWQoKSkgZm9nTGFtcE5vdFJlcXVpcmVkKHJvbSwgZmxhZ3MpO1xuXG4gIGlmIChmbGFncy5hZGRFYXN0Q2F2ZSgpKSB7XG4gICAgZWFzdENhdmUocm9tLCBmbGFncyk7XG4gICAgaWYgKGZsYWdzLmNvbm5lY3RHb2FUb0xlYWYoKSkge1xuICAgICAgY29ubmVjdEdvYVRvTGVhZihyb20pO1xuICAgIH1cbiAgfSBlbHNlIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb20pO1xuICB9XG4gIGV2aWxTcGlyaXRJc2xhbmRSZXF1aXJlc0RvbHBoaW4ocm9tKTtcbiAgY2xvc2VDYXZlRW50cmFuY2VzKHJvbSwgZmxhZ3MpO1xuICBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb20pO1xuICBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tLCBmbGFncyk7XG4gIGlmIChmbGFncy5kaXNhYmxlUmFiYml0U2tpcCgpKSBmaXhSYWJiaXRTa2lwKHJvbSk7XG5cbiAgZml4UmV2ZXJzZVdhbGxzKHJvbSk7XG4gIGlmIChmbGFncy5jaGFyZ2VTaG90c09ubHkoKSkgZGlzYWJsZVN0YWJzKHJvbSk7XG4gIGlmIChmbGFncy5vcmJzT3B0aW9uYWwoKSkgb3Jic09wdGlvbmFsKHJvbSk7XG5cbiAgZml4TWltaWNzKHJvbSk7IC8vIE5PVEU6IGFmdGVyIGFsbCBtaW1pY3Ncbn1cblxuLy8gVXBkYXRlcyBhIGZldyBpdGVtdXNlIGFuZCB0cmlnZ2VyIGFjdGlvbnMgaW4gbGlnaHQgb2YgY29uc29saWRhdGlvbiB3ZVxuLy8gYXJvdW5kIGl0ZW0gZ3JhbnRpbmcuXG5mdW5jdGlvbiBjb25zb2xpZGF0ZUl0ZW1HcmFudHMocm9tOiBSb20pOiB2b2lkIHtcbiAgcm9tLml0ZW1zLkdsb3dpbmdMYW1wLml0ZW1Vc2VEYXRhWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwYjtcbn1cblxuLy8gQWRkcyBhIHRyaWdnZXIgYWN0aW9uIHRvIG1lemFtZS4gIFVzZSA4NyBsZWZ0b3ZlciBmcm9tIHJlc2N1aW5nIHplYnUuXG5mdW5jdGlvbiBhZGRNZXphbWVUcmlnZ2VyKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFt+MHgyZjBdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe2FjdGlvbjogNH0pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmYwXTtcbiAgY29uc3QgbWV6YW1lID0gcm9tLmxvY2F0aW9ucy5NZXphbWVTaHJpbmU7XG4gIG1lemFtZS5zcGF3bnMucHVzaChTcGF3bi5vZih7dGlsZTogMHg4OCwgdHlwZTogMiwgaWQ6IHRyaWdnZXIuaWR9KSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuXG4gIGlmIChmbGFncy5zbG93RG93blRvcm5hZG8oKSkge1xuICAgIC8vIFRPRE8gLSB0b3JuYWRvIChvYmogMTIpID0+IHNwZWVkIDA3IGluc3RlYWQgb2YgMDhcbiAgICAvLyAgICAgIC0gbGlmZXRpbWUgaXMgNDgwID0+IDcwIG1heWJlIHRvbyBsb25nLCA2MCBzd2VldCBzcG90P1xuICAgIGNvbnN0IHRvcm5hZG8gPSByb20ub2JqZWN0c1sweDEyXTtcbiAgICB0b3JuYWRvLnNwZWVkID0gMHgwNztcbiAgICB0b3JuYWRvLmRhdGFbMHgwY10gPSAweDYwOyAvLyBpbmNyZWFzZSBsaWZldGltZSAoNDgwKSBieSAyMCVcbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhDb2luU3ByaXRlcyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWzB4NjAsIDB4NjQsIDB4NjUsIDB4NjYsIDB4NjcsIDB4NjgsXG4gICAgICAgICAgICAgICAgICAgICAgMHg2OSwgMHg2YSwgMHg2YiwgMHg2YywgMHg2ZCwgMHg2Zl0pIHtcbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBbMCwgMSwgMl0pIHtcbiAgICAgIHJvbS5wYXR0ZXJuc1twYWdlIDw8IDYgfCBwYXRdLnBpeGVscyA9IHJvbS5wYXR0ZXJuc1sweDVlIDw8IDYgfCBwYXRdLnBpeGVscztcbiAgICB9XG4gIH1cbiAgcm9tLm9iamVjdHNbMHgwY10ubWV0YXNwcml0ZSA9IDB4YTk7XG59XG5cbi8qKlxuICogRml4IHRoZSBzb2Z0bG9jayB0aGF0IGhhcHBlbnMgd2hlbiB5b3UgZ28gdGhyb3VnaFxuICogYSB3YWxsIGJhY2t3YXJkcyBieSBtb3ZpbmcgdGhlIGV4aXQvZW50cmFuY2UgdGlsZXNcbiAqIHVwIGEgYml0IGFuZCBhZGp1c3Rpbmcgc29tZSB0aWxlRWZmZWN0cyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZpeFJldmVyc2VXYWxscyhyb206IFJvbSkge1xuICAvLyBhZGp1c3QgdGlsZSBlZmZlY3QgZm9yIGJhY2sgdGlsZXMgb2YgaXJvbiB3YWxsXG4gIGZvciAoY29uc3QgdCBpbiBbMHgwNCwgMHgwNSwgMHgwOCwgMHgwOV0pIHtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiYyAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGI1IC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gIH1cbiAgLy8gVE9ETyAtIG1vdmUgYWxsIHRoZSBlbnRyYW5jZXMgdG8geT0yMCBhbmQgZXhpdHMgdG8geXQ9MDFcbn1cblxuLyoqIE1ha2UgYSBsYW5kIGJyaWRnZSBpbiB1bmRlcmdyb3VuZCBjaGFubmVsICovXG5mdW5jdGlvbiB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbTogUm9tKSB7XG4gIGNvbnN0IHt0aWxlc30gPSByb20uc2NyZWVuc1sweGExXTtcbiAgdGlsZXNbMHgyOF0gPSAweDlmO1xuICB0aWxlc1sweDM3XSA9IDB4MjM7XG4gIHRpbGVzWzB4MzhdID0gMHgyMzsgLy8gMHg4ZTtcbiAgdGlsZXNbMHgzOV0gPSAweDIxO1xuICB0aWxlc1sweDQ3XSA9IDB4OGQ7XG4gIHRpbGVzWzB4NDhdID0gMHg4ZjtcbiAgdGlsZXNbMHg1Nl0gPSAweDk5O1xuICB0aWxlc1sweDU3XSA9IDB4OWE7XG4gIHRpbGVzWzB4NThdID0gMHg4Yztcbn1cblxuZnVuY3Rpb24gZm9nTGFtcE5vdFJlcXVpcmVkKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICAvLyBOZWVkIHRvIG1ha2Ugc2V2ZXJhbCBjaGFuZ2VzLlxuICAvLyAoMSkgZG9scGhpbiBvbmx5IHJlcXVpcmVzIHNoZWxsIGZsdXRlLCBtYWtlIHRoZSBmbGFnIGNoZWNrIGZyZWUgKH4wMDApXG4gIGNvbnN0IHJlcXVpcmVIZWFsZWQgPSBmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpO1xuICByb20uaXRlbXNbMHgzNl0uaXRlbVVzZURhdGFbMF0ud2FudCA9IHJlcXVpcmVIZWFsZWQgPyAweDAyNSA6IH4weDAwMDtcbiAgLy8gKDIpIGtlbnN1IDY4IChANjEpIGRyb3BzIGFuIGl0ZW0gKDY3IG1hZ2ljIHJpbmcpXG4gIHJvbS5ucGNzWzB4NjhdLmRhdGFbMF0gPSAweDY3O1xuICByb20ubnBjc1sweDY4XS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDBhO1xuICByb20ubnBjc1sweDY4XS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSFbMF0uZmxhZ3MgPSBbXTtcbiAgcm9tLm5wY3NbMHg2OF0uc3Bhd25Db25kaXRpb25zLnNldCgweDYxLCBbMHgyMSwgfjB4MGMxXSlcbiAgLy8gKDMpIGZpc2hlcm1hbiA2NCBzcGF3bnMgb24gZm9nIGxhbXAgcmF0aGVyIHRoYW4gc2hlbGwgZmx1dGVcbiAgcm9tLm5wY3NbMHg2NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGQ2LCBbMHgyMzVdKTtcblxuICAvLyAoNCkgZml4IHVwIGl0ZW1nZXQgNjcgZnJvbSBpdGVtZ2V0IDY0IChkZWxldGUgdGhlIGZsYWcpXG4gIHJvbS5pdGVtR2V0c1sweDY0XS5mbGFncyA9IFtdO1xuICByb20uaXRlbUdldHNbMHg2N10uY29weUZyb20ocm9tLml0ZW1HZXRzWzB4NjRdKTtcbiAgcm9tLml0ZW1HZXRzWzB4NjddLmZsYWdzID0gWzB4MGMxXTtcblxuICAvLyBUT0RPIC0gZ3JhcGhpY3Mgc2NyZXdlZCB1cCAtIGZpZ3VyZSBvdXQgaWYgb2JqZWN0IGFjdGlvbiBpcyBjaGFuZ2luZ1xuICAvLyB0aGUgcGF0dGVybiB0YWJsZXMgYmFzZWQgb24gKGUuZy4pICQ2MDAseCBtYXliZT8gIENhbiB3ZSBwcmV2ZW50IGl0P1xuXG4gIC8vIFRPRE8gLSBhZGQgYSBub3RlcyBmaWxlIGFib3V0IHRoaXMuXG59XG5cbi8qKlxuICogUmVtb3ZlIHRpbWVyIHNwYXducywgcmVudW1iZXJzIG1pbWljIHNwYXducyBzbyB0aGF0IHRoZXkncmUgdW5pcXVlLlxuICogUnVucyBiZWZvcmUgc2h1ZmZsZSBiZWNhdXNlIHdlIG5lZWQgdG8gaWRlbnRpZnkgdGhlIHNsb3QuICBSZXF1aXJlc1xuICogYW4gYXNzZW1ibHkgY2hhbmdlICgkM2QzZmQgaW4gcHJlc2h1ZmZsZS5zKVxuICovXG5mdW5jdGlvbiBmaXhNaW1pY3Mocm9tOiBSb20pOiB2b2lkIHtcbiAgbGV0IG1pbWljID0gMHg3MDtcbiAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGZvciAoY29uc3QgcyBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICBpZiAoIXMuaXNDaGVzdCgpKSBjb250aW51ZTtcbiAgICAgIHMudGltZWQgPSBmYWxzZTtcbiAgICAgIGlmIChzLmlkID49IDB4NzApIHMuaWQgPSBtaW1pYysrO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gZmluZCBhIGJldHRlciB3YXkgdG8gYnVuZGxlIGFzbSBjaGFuZ2VzP1xuICAvLyByb20uYXNzZW1ibGUoKVxuICAvLyAgICAgLiQoJ2FkYyAkMTAnKVxuICAvLyAgICAgLmJlcSgnbGFiZWwnKVxuICAvLyAgICAgLmxzaCgpXG4gIC8vICAgICAubHNoKGAke2FkZHJ9LHhgKVxuICAvLyAgICAgLmxhYmVsKCdsYWJlbCcpO1xuICAvLyByb20ucGF0Y2goKVxuICAvLyAgICAgLm9yZygweDNkM2ZkKVxuICAvLyAgICAgLmJ5dGUoMHhiMCk7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgbCA9IHJvbS5sb2NhdGlvbnM7XG4gIC8vIE1vdmUgS2VsYmVzcXVlIDIgb25lIGZ1bGwgdGlsZSBsZWZ0LlxuICBsLkdvYUZvcnRyZXNzX0tlbGJlc3F1ZS5zcGF3bnNbMF0ueCAtPSAxNjtcbiAgLy8gUmVtb3ZlIHNhZ2Ugc2NyZWVuIGxvY2tzIChleGNlcHQgS2Vuc3UpLlxuICBsLkdvYUZvcnRyZXNzX1plYnUuc3Bhd25zLnNwbGljZSgxLCAxKTsgLy8gemVidSBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfVG9ybmVsLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIHRvcm5lbCBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfQXNpbmEuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gYXNpbmEgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX0tlbnN1LnNwYXducy5zcGxpY2UoMywgMSk7IC8vIGtlbnN1IGh1bWFuIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19LZW5zdS5zcGF3bnMuc3BsaWNlKDEsIDEpOyAvLyBrZW5zdSBzbGltZSBzY3JlZW4gbG9jayB0cmlnZ2VyXG59XG5cbmZ1bmN0aW9uIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGNvbnN0IHtXYXRlcmZhbGxDYXZlNH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE1vdmUgYWxhcm0gZmx1dGUgdG8gdGhpcmQgcm93XG4gIHJvbS5pdGVtR2V0c1sweDMxXS5pbnZlbnRvcnlSb3dTdGFydCA9IDB4MjA7XG4gIC8vIEVuc3VyZSBhbGFybSBmbHV0ZSBjYW5ub3QgYmUgZHJvcHBlZFxuICAvLyByb20ucHJnWzB4MjEwMjFdID0gMHg0MzsgLy8gVE9ETyAtIHJvbS5pdGVtc1sweDMxXS4/Pz9cbiAgcm9tLml0ZW1zWzB4MzFdLnVuaXF1ZSA9IHRydWU7XG4gIC8vIEVuc3VyZSBhbGFybSBmbHV0ZSBjYW5ub3QgYmUgc29sZFxuICByb20uaXRlbXNbMHgzMV0uYmFzZVByaWNlID0gMDtcblxuICBpZiAoZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIFBlcnNvbiAxNCAoWmVidSdzIHN0dWRlbnQpOiBzZWNvbmRhcnkgaXRlbSAtPiBhbGFybSBmbHV0ZVxuICAgIHJvbS5ucGNzWzB4MTRdLmRhdGFbMV0gPSAweDMxOyAvLyBOT1RFOiBDbG9iYmVycyBzaHVmZmxlZCBpdGVtISEhXG4gIH0gZWxzZSB7XG4gICAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4ZmY7IC8vIGluZGljYXRlIG5vdGhpbmcgdGhlcmU6IG5vIHNsb3QuXG4gIH1cblxuICAvLyBSZW1vdmUgYWxhcm0gZmx1dGUgZnJvbSBzaG9wcyAocmVwbGFjZSB3aXRoIG90aGVyIGl0ZW1zKVxuICAvLyBOT1RFIC0gd2UgY291bGQgc2ltcGxpZnkgdGhpcyB3aG9sZSB0aGluZyBieSBqdXN0IGhhcmRjb2RpbmcgaW5kaWNlcy5cbiAgLy8gICAgICAtIGlmIHRoaXMgaXMgZ3VhcmFudGVlZCB0byBoYXBwZW4gZWFybHksIGl0J3MgYWxsIHRoZSBzYW1lLlxuICBjb25zdCByZXBsYWNlbWVudHMgPSBbXG4gICAgWzB4MjEsIDAuNzJdLCAvLyBmcnVpdCBvZiBwb3dlciwgNzIlIG9mIGNvc3RcbiAgICBbMHgxZiwgMC45XSwgLy8gbHlzaXMgcGxhbnQsIDkwJSBvZiBjb3N0XG4gIF07XG4gIGxldCBqID0gMDtcbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzaG9wLmNvbnRlbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc2hvcC5jb250ZW50c1tpXSAhPT0gMHgzMSkgY29udGludWU7XG4gICAgICBjb25zdCBbaXRlbSwgcHJpY2VSYXRpb10gPSByZXBsYWNlbWVudHNbKGorKykgJSByZXBsYWNlbWVudHMubGVuZ3RoXTtcbiAgICAgIHNob3AuY29udGVudHNbaV0gPSBpdGVtO1xuICAgICAgaWYgKHJvbS5zaG9wRGF0YVRhYmxlc0FkZHJlc3MpIHtcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBicm9rZW4gLSBuZWVkIGEgY29udHJvbGxlZCB3YXkgdG8gY29udmVydCBwcmljZSBmb3JtYXRzXG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gTWF0aC5yb3VuZChzaG9wLnByaWNlc1tpXSAqIHByaWNlUmF0aW8pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENoYW5nZSBmbHV0ZSBvZiBsaW1lIGNoZXN0J3MgKG5vdy11bnVzZWQpIGl0ZW1nZXQgdG8gaGF2ZSBtZWRpY2FsIGhlcmJcbiAgcm9tLml0ZW1HZXRzWzB4NWJdLml0ZW1JZCA9IDB4MWQ7XG4gIC8vIENoYW5nZSB0aGUgYWN0dWFsIHNwYXduIGZvciB0aGF0IGNoZXN0IHRvIGJlIHRoZSBtaXJyb3JlZCBzaGllbGQgY2hlc3RcbiAgV2F0ZXJmYWxsQ2F2ZTQuc3Bhd24oMHgxOSkuaWQgPSAweDEwO1xuXG4gIC8vIFRPRE8gLSByZXF1aXJlIG5ldyBjb2RlIGZvciB0d28gdXNlc1xufVxuXG5mdW5jdGlvbiBicm9rYWhhbmFXYW50c01hZG8xKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGJyb2thaGFuYSA9IHJvbS5ucGNzWzB4NTRdO1xuICBjb25zdCBkaWFsb2cgPSBhc3NlcnQoYnJva2FoYW5hLmxvY2FsRGlhbG9ncy5nZXQoLTEpKVswXTtcbiAgaWYgKGRpYWxvZy5jb25kaXRpb24gIT09IH4weDAyNCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQmFkIGJyb2thaGFuYSBjb25kaXRpb246ICR7ZGlhbG9nLmNvbmRpdGlvbn1gKTtcbiAgfVxuICBkaWFsb2cuY29uZGl0aW9uID0gfjB4MDY3OyAvLyB2YW5pbGxhIGJhbGwgb2YgdGh1bmRlciAvIGRlZmVhdGVkIG1hZG8gMVxufVxuXG5mdW5jdGlvbiByZXF1aXJlSGVhbGVkRG9scGhpbihyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3JtYWxseSB0aGUgZmlzaGVybWFuICgkNjQpIHNwYXducyBpbiBoaXMgaG91c2UgKCRkNikgaWYgeW91IGhhdmVcbiAgLy8gdGhlIHNoZWxsIGZsdXRlICgyMzYpLiAgSGVyZSB3ZSBhbHNvIGFkZCBhIHJlcXVpcmVtZW50IG9uIHRoZSBoZWFsZWRcbiAgLy8gZG9scGhpbiBzbG90ICgwMjUpLCB3aGljaCB3ZSBrZWVwIGFyb3VuZCBzaW5jZSBpdCdzIGFjdHVhbGx5IHVzZWZ1bC5cbiAgcm9tLm5wY3NbMHg2NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGQ2LCBbMHgyMzYsIDB4MDI1XSk7XG4gIC8vIEFsc28gZml4IGRhdWdodGVyJ3MgZGlhbG9nICgkN2IpLlxuICBjb25zdCBkYXVnaHRlckRpYWxvZyA9IHJvbS5ucGNzWzB4N2JdLmxvY2FsRGlhbG9ncy5nZXQoLTEpITtcbiAgZGF1Z2h0ZXJEaWFsb2cudW5zaGlmdChkYXVnaHRlckRpYWxvZ1swXS5jbG9uZSgpKTtcbiAgZGF1Z2h0ZXJEaWFsb2dbMF0uY29uZGl0aW9uID0gfjB4MDI1O1xuICBkYXVnaHRlckRpYWxvZ1sxXS5jb25kaXRpb24gPSB+MHgyMzY7XG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVUZWxlcGF0aHlGb3JEZW8ocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gTm90IGhhdmluZyB0ZWxlcGF0aHkgKDI0Mykgd2lsbCB0cmlnZ2VyIGEgXCJreXUga3l1XCIgKDFhOjEyLCAxYToxMykgZm9yXG4gIC8vIGJvdGggZ2VuZXJpYyBidW5uaWVzICg1OSkgYW5kIGRlbyAoNWEpLlxuICByb20ubnBjc1sweDU5XS5nbG9iYWxEaWFsb2dzLnB1c2goR2xvYmFsRGlhbG9nLm9mKH4weDI0MywgWzB4MWEsIDB4MTJdKSk7XG4gIHJvbS5ucGNzWzB4NWFdLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxM10pKTtcbn1cblxuZnVuY3Rpb24gdGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBpdGVtZ2V0IDAzIHN3b3JkIG9mIHRodW5kZXIgPT4gc2V0IDJmZCBzaHlyb24gd2FycCBwb2ludFxuICByb20uaXRlbUdldHNbMHgwM10uZmxhZ3MucHVzaCgweDJmZCk7XG4gIC8vIGRpYWxvZyA2MiBhc2luYSBpbiBmMi9mNCBzaHlyb24gLT4gYWN0aW9uIDFmICh0ZWxlcG9ydCB0byBzdGFydClcbiAgLy8gICAtIG5vdGU6IGYyIGFuZCBmNCBkaWFsb2dzIGFyZSBsaW5rZWQuXG4gIGZvciAoY29uc3QgaSBvZiBbMCwgMSwgM10pIHtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbMHhmMiwgMHhmNF0pIHtcbiAgICAgIHJvbS5ucGNzWzB4NjJdLmxvY2FsRGlhbG9ncy5nZXQobG9jKSFbaV0ubWVzc2FnZS5hY3Rpb24gPSAweDFmO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gQ2hhbmdlIHN3b3JkIG9mIHRodW5kZXIncyBhY3Rpb24gdG8gYmJlIHRoZSBzYW1lIGFzIG90aGVyIHN3b3JkcyAoMTYpXG4gIHJvbS5pdGVtR2V0c1sweDAzXS5hY3F1aXNpdGlvbkFjdGlvbi5hY3Rpb24gPSAweDE2O1xufVxuXG5mdW5jdGlvbiBhZGp1c3RJdGVtTmFtZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGlmIChmbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgIC8vIHJlbmFtZSBsZWF0aGVyIGJvb3RzIHRvIHNwZWVkIGJvb3RzXG4gICAgY29uc3QgbGVhdGhlckJvb3RzID0gcm9tLml0ZW1zWzB4MmZdITtcbiAgICBsZWF0aGVyQm9vdHMubWVudU5hbWUgPSAnU3BlZWQgQm9vdHMnO1xuICAgIGxlYXRoZXJCb290cy5tZXNzYWdlTmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgaWYgKGZsYWdzLmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSkge1xuICAgICAgY29uc3QgZ2FzTWFzayA9IHJvbS5pdGVtc1sweDI5XTtcbiAgICAgIGdhc01hc2subWVudU5hbWUgPSAnSGF6bWF0IFN1aXQnO1xuICAgICAgZ2FzTWFzay5tZXNzYWdlTmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuYW1lIGJhbGxzIHRvIG9yYnNcbiAgZm9yIChsZXQgaSA9IDB4MDU7IGkgPCAweDBjOyBpICs9IDIpIHtcbiAgICByb20uaXRlbXNbaV0ubWVudU5hbWUgPSByb20uaXRlbXNbaV0ubWVudU5hbWUucmVwbGFjZSgnQmFsbCcsICdPcmInKTtcbiAgICByb20uaXRlbXNbaV0ubWVzc2FnZU5hbWUgPSByb20uaXRlbXNbaV0ubWVzc2FnZU5hbWUucmVwbGFjZSgnQmFsbCcsICdPcmInKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlQnJhY2VsZXRzUHJvZ3Jlc3NpdmUocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gdG9ybmVsJ3MgdHJpZ2dlciBuZWVkcyBib3RoIGl0ZW1zXG4gIGNvbnN0IHRvcm5lbCA9IHJvbS5ucGNzWzB4NWZdO1xuICBjb25zdCB2YW5pbGxhID0gdG9ybmVsLmxvY2FsRGlhbG9ncy5nZXQoMHgyMSkhO1xuICBjb25zdCBwYXRjaGVkID0gW1xuICAgIHZhbmlsbGFbMF0sIC8vIGFscmVhZHkgbGVhcm5lZCB0ZWxlcG9ydFxuICAgIHZhbmlsbGFbMl0sIC8vIGRvbid0IGhhdmUgdG9ybmFkbyBicmFjZWxldFxuICAgIHZhbmlsbGFbMl0uY2xvbmUoKSwgLy8gd2lsbCBjaGFuZ2UgdG8gZG9uJ3QgaGF2ZSBvcmJcbiAgICB2YW5pbGxhWzFdLCAvLyBoYXZlIGJyYWNlbGV0LCBsZWFybiB0ZWxlcG9ydFxuICBdO1xuICBwYXRjaGVkWzFdLmNvbmRpdGlvbiA9IH4weDIwNjsgLy8gZG9uJ3QgaGF2ZSBicmFjZWxldFxuICBwYXRjaGVkWzJdLmNvbmRpdGlvbiA9IH4weDIwNTsgLy8gZG9uJ3QgaGF2ZSBvcmJcbiAgcGF0Y2hlZFszXS5jb25kaXRpb24gPSB+MDsgICAgIC8vIGRlZmF1bHRcbiAgdG9ybmVsLmxvY2FsRGlhbG9ncy5zZXQoMHgyMSwgcGF0Y2hlZCk7XG59XG5cbmZ1bmN0aW9uIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2YgW3JvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5FYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5LaXJpc2FNZWFkb3ddKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIHNldCB0aGUgbmV3IFwiaW52aXNpYmxlXCIgZmxhZyBvbiB0aGUgY2hlc3QuXG4gICAgICBpZiAoc3Bhd24uaXNDaGVzdCgpKSBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgfVxuICB9XG59XG5cbi8vIEFkZCB0aGUgc3RhdHVlIG9mIG9ueXggYW5kIHBvc3NpYmx5IHRoZSB0ZWxlcG9ydCBibG9jayB0cmlnZ2VyIHRvIENvcmRlbCBXZXN0XG5mdW5jdGlvbiBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIGNvbnN0IHtDb3JkZWxQbGFpbkVhc3QsIENvcmRlbFBsYWluV2VzdH0gPSByb20ubG9jYXRpb25zO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIENvcmRlbFBsYWluRWFzdC5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNDaGVzdCgpIHx8IChmbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiYgc3Bhd24uaXNUcmlnZ2VyKCkpKSB7XG4gICAgICAvLyBDb3B5IGlmICgxKSBpdCdzIHRoZSBjaGVzdCwgb3IgKDIpIHdlJ3JlIGRpc2FibGluZyB0ZWxlcG9ydCBza2lwXG4gICAgICBDb3JkZWxQbGFpbldlc3Quc3Bhd25zLnB1c2goc3Bhd24uY2xvbmUoKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpeFJhYmJpdFNraXAocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9NYWluLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4Nikge1xuICAgICAgaWYgKHNwYXduLnggPT09IDB4NzQwKSB7XG4gICAgICAgIHNwYXduLnggKz0gMTY7XG4gICAgICAgIHNwYXduLnkgKz0gMTY7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFRvd2VyRXhpdChyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7VG93ZXJFbnRyYW5jZSwgQ3J5cHRfVGVsZXBvcnRlcn0gPSByb20ubG9jYXRpb25zO1xuICBjb25zdCBlbnRyYW5jZSA9IENyeXB0X1RlbGVwb3J0ZXIuZW50cmFuY2VzLmxlbmd0aDtcbiAgY29uc3QgZGVzdCA9IENyeXB0X1RlbGVwb3J0ZXIuaWQ7XG4gIENyeXB0X1RlbGVwb3J0ZXIuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3RpbGU6IDB4Njh9KSk7XG4gIFRvd2VyRW50cmFuY2UuZXhpdHMucHVzaChFeGl0Lm9mKHt0aWxlOiAweDU3LCBkZXN0LCBlbnRyYW5jZX0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTgsIGRlc3QsIGVudHJhbmNlfSkpO1xufVxuXG4vLyBQcm9ncmFtbWF0aWNhbGx5IGFkZCBhIGhvbGUgYmV0d2VlbiB2YWxsZXkgb2Ygd2luZCBhbmQgbGltZSB0cmVlIHZhbGxleVxuZnVuY3Rpb24gY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtWYWxsZXlPZldpbmQsIExpbWVUcmVlVmFsbGV5fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgVmFsbGV5T2ZXaW5kLnNjcmVlbnNbNV1bNF0gPSAweDEwOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzFdWzBdID0gMHgxYTsgLy8gbmV3IGV4aXRcbiAgTGltZVRyZWVWYWxsZXkuc2NyZWVuc1syXVswXSA9IDB4MGM7IC8vIG5pY2VyIG1vdW50YWluc1xuXG4gIGNvbnN0IHdpbmRFbnRyYW5jZSA9XG4gICAgICBWYWxsZXlPZldpbmQuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3g6IDB4NGVmLCB5OiAweDU3OH0pKSAtIDE7XG4gIGNvbnN0IGxpbWVFbnRyYW5jZSA9XG4gICAgICBMaW1lVHJlZVZhbGxleS5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHgwMTAsIHk6IDB4MWMwfSkpIC0gMTtcblxuICBWYWxsZXlPZldpbmQuZXhpdHMucHVzaChcbiAgICAgIEV4aXQub2Yoe3g6IDB4NGYwLCB5OiAweDU2MCwgZGVzdDogMHg0MiwgZW50cmFuY2U6IGxpbWVFbnRyYW5jZX0pLFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTcwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSkpO1xuICBMaW1lVHJlZVZhbGxleS5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHgwMDAsIHk6IDB4MWIwLCBkZXN0OiAweDAzLCBlbnRyYW5jZTogd2luZEVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYzAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSk7XG59XG5cbmZ1bmN0aW9uIGNsb3NlQ2F2ZUVudHJhbmNlcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gUHJldmVudCBzb2Z0bG9jayBmcm9tIGV4aXRpbmcgc2VhbGVkIGNhdmUgYmVmb3JlIHdpbmRtaWxsIHN0YXJ0ZWRcbiAgcm9tLmxvY2F0aW9ucy5WYWxsZXlPZldpbmQuZW50cmFuY2VzWzFdLnkgKz0gMTY7XG5cbiAgLy8gQ2xlYXIgdGlsZXMgMSwyLDMsNCBmb3IgYmxvY2thYmxlIGNhdmVzIGluIHRpbGVzZXRzIDkwLCA5NCwgYW5kIDljXG4gIHJvbS5zd2FwTWV0YXRpbGVzKFsweDkwXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MDcsIFsweDAxLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwZSwgWzB4MDIsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDIwLCBbMHgwMywgMHgwYV0sIH4weGQ3XSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjEsIFsweDA0LCAweDBhXSwgfjB4ZDddKTtcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTQsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgICBbMHg2OCwgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDgzLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODgsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuXG4gIC8vIE5vdyByZXBsYWNlIHRoZSB0aWxlcyB3aXRoIHRoZSBibG9ja2FibGUgb25lc1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDM4XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzldID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHg0OF0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ5XSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg3OV0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDdhXSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4ODldID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4YV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NDhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDU4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NTldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDU2XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTddID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg2Nl0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY3XSA9IDB4MDQ7XG5cbiAgLy8gRGVzdHJ1Y3R1cmUgb3V0IGEgZmV3IGxvY2F0aW9ucyBieSBuYW1lXG4gIGNvbnN0IHtcbiAgICBDb3JkZWxQbGFpbldlc3QsXG4gICAgQ29yZGVsUGxhaW5FYXN0LFxuICAgIERlc2VydDIsXG4gICAgR29hVmFsbGV5LFxuICAgIExpbWVUcmVlVmFsbGV5LFxuICAgIEtpcmlzYU1lYWRvdyxcbiAgICBTYWhhcmFPdXRzaWRlQ2F2ZSxcbiAgICBWYWxsZXlPZldpbmQsXG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsXG4gICAgV2F0ZXJmYWxsVmFsbGV5U291dGgsXG4gIH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE5PVEU6IGZsYWcgMmYwIGlzIEFMV0FZUyBzZXQgLSB1c2UgaXQgYXMgYSBiYXNlbGluZS5cbiAgY29uc3QgZmxhZ3NUb0NsZWFyOiBbTG9jYXRpb24sIG51bWJlcl1bXSA9IFtcbiAgICBbVmFsbGV5T2ZXaW5kLCAweDMwXSwgLy8gdmFsbGV5IG9mIHdpbmQsIHplYnUncyBjYXZlXG4gICAgW0NvcmRlbFBsYWluV2VzdCwgMHgzMF0sIC8vIGNvcmRlbCB3ZXN0LCB2YW1waXJlIGNhdmVcbiAgICBbQ29yZGVsUGxhaW5FYXN0LCAweDMwXSwgLy8gY29yZGVsIGVhc3QsIHZhbXBpcmUgY2F2ZVxuICAgIFtXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgcHJpc29uIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MTRdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIGZvZyBsYW1wXG4gICAgW1dhdGVyZmFsbFZhbGxleVNvdXRoLCAweDc0XSwgLy8gd2F0ZXJmYWxsIHNvdXRoLCBraXJpc2FcbiAgICBbS2lyaXNhTWVhZG93LCAweDEwXSwgLy8ga2lyaXNhIG1lYWRvd1xuICAgIFtTYWhhcmFPdXRzaWRlQ2F2ZSwgMHgwMF0sIC8vIGNhdmUgdG8gZGVzZXJ0XG4gICAgW0Rlc2VydDIsIDB4NDFdLFxuICBdO1xuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSAmJiBmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIGZsYWdzVG9DbGVhci5wdXNoKFtMaW1lVHJlZVZhbGxleSwgMHgxMF0pO1xuICB9XG4gIGlmIChmbGFncy5jb25uZWN0R29hVG9MZWFmKCkpIHtcbiAgICBmbGFnc1RvQ2xlYXIucHVzaChbR29hVmFsbGV5LCAweDAxXSk7XG4gIH1cbiAgZm9yIChjb25zdCBbbG9jLCB5eF0gb2YgZmxhZ3NUb0NsZWFyKSB7XG4gICAgbG9jLmZsYWdzLnB1c2goRmxhZy5vZih7eXgsIGZsYWc6IDB4MmYwfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwbGFjZUZsYWcobG9jOiBMb2NhdGlvbiwgeXg6IG51bWJlciwgZmxhZzogbnVtYmVyKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBmIG9mIGxvYy5mbGFncykge1xuICAgICAgaWYgKGYueXggPT09IHl4KSB7XG4gICAgICAgIGYuZmxhZyA9IGZsYWc7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBmbGFnIHRvIHJlcGxhY2UgYXQgJHtsb2N9OiR7eXh9YCk7XG4gIH07XG5cbiAgaWYgKGZsYWdzLnBhcmFseXNpc1JlcXVpcmVzUHJpc29uS2V5KCkpIHsgLy8gY2xvc2Ugb2ZmIHJldmVyc2UgZW50cmFuY2VzXG4gICAgLy8gTk9URTogd2UgY291bGQgYWxzbyBjbG9zZSBpdCBvZmYgdW50aWwgYm9zcyBraWxsZWQuLi4/XG4gICAgLy8gIC0gY29uc3QgdmFtcGlyZUZsYWcgPSB+cm9tLm5wY1NwYXduc1sweGMwXS5jb25kaXRpb25zWzB4MGFdWzBdO1xuICAgIC8vICAtPiBrZWxiZXNxdWUgZm9yIHRoZSBvdGhlciBvbmUuXG4gICAgY29uc3Qgd2luZG1pbGxGbGFnID0gMHgyZWU7XG4gICAgcmVwbGFjZUZsYWcoQ29yZGVsUGxhaW5XZXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluRWFzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcblxuICAgIHJlcGxhY2VGbGFnKFdhdGVyZmFsbFZhbGxleU5vcnRoLCAweDAwLCAweDJkOCk7IC8vIGtleSB0byBwcmlzb24gZmxhZ1xuICAgIGNvbnN0IGV4cGxvc2lvbiA9IFNwYXduLm9mKHt5OiAweDA2MCwgeDogMHgwNjAsIHR5cGU6IDQsIGlkOiAweDJjfSk7XG4gICAgY29uc3Qga2V5VHJpZ2dlciA9IFNwYXduLm9mKHt5OiAweDA3MCwgeDogMHgwNzAsIHR5cGU6IDIsIGlkOiAweGFkfSk7XG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLnNwbGljZSgxLCAwLCBleHBsb3Npb24pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5wdXNoKGtleVRyaWdnZXIpO1xuICB9XG5cbiAgLy8gcm9tLmxvY2F0aW9uc1sweDE0XS50aWxlRWZmZWN0cyA9IDB4YjM7XG5cbiAgLy8gZDcgZm9yIDM/XG5cbiAgLy8gVE9ETyAtIHRoaXMgZW5kZWQgdXAgd2l0aCBtZXNzYWdlIDAwOjAzIGFuZCBhbiBhY3Rpb24gdGhhdCBnYXZlIGJvdyBvZiBtb29uIVxuXG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5tZXNzYWdlLnBhcnQgPSAweDFiO1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5pbmRleCA9IDB4MDg7XG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5mbGFncy5wdXNoKDB4MmY2LCAweDJmNywgMHgyZjgpO1xufVxuXG4vLyBAdHMtaWdub3JlOiBub3QgeWV0IHVzZWRcbmZ1bmN0aW9uIGVhc3RDYXZlKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBUT0RPIGZpbGwgdXAgZ3JhcGhpY3MsIGV0YyAtLT4gJDFhLCAkMWIsICQwNSAvICQ4OCwgJGI1IC8gJDE0LCAkMDJcbiAgLy8gVGhpbmsgYW9idXQgZXhpdHMgYW5kIGVudHJhbmNlcy4uLj9cblxuICBjb25zdCB7VmFsbGV5T2ZXaW5kLCBMaW1lVHJlZVZhbGxleSwgU2VhbGVkQ2F2ZTF9ID0gcm9tLmxvY2F0aW9ucztcblxuICBjb25zdCBsb2MxID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMSk7XG4gIGNvbnN0IGxvYzIgPSByb20ubG9jYXRpb25zLmFsbG9jYXRlKHJvbS5sb2NhdGlvbnMuRWFzdENhdmUyKTtcbiAgY29uc3QgbG9jMyA9IHJvbS5sb2NhdGlvbnMuRWFzdENhdmUzO1xuXG4gIC8vIE5PVEU6IDB4OWMgY2FuIGJlY29tZSAweDk5IGluIHRvcCBsZWZ0IG9yIDB4OTcgaW4gdG9wIHJpZ2h0IG9yIGJvdHRvbSBtaWRkbGUgZm9yIGEgY2F2ZSBleGl0XG4gIGxvYzEuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg4MCwgMHg4MywgMHg5Y10sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MywgMHg4NiwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MywgMHg4OCwgMHg4OSwgMHg4MCwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MSwgMHg4YywgMHg4NSwgMHg4MiwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5ZSwgMHg4NSwgMHg5YywgMHg5OCwgMHg4Nl1dO1xuXG4gIGxvYzIuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg5YiwgMHg4MCwgMHg5Yl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MSwgMHg4MCwgMHg4MV0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4NywgMHg4YiwgMHg4YSwgMHg4Nl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4YywgMHg4MCwgMHg4NSwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5YywgMHg4NiwgMHg4MCwgMHg4MCwgMHg5YV1dO1xuXG4gIGZvciAoY29uc3QgbCBvZiBbbG9jMSwgbG9jMiwgbG9jM10pIHtcbiAgICBsLmJnbSA9IDB4MTc7IC8vIG10IHNhYnJlIGNhdmUgbXVzaWM/XG4gICAgbC5lbnRyYW5jZXMgPSBbXTtcbiAgICBsLmV4aXRzID0gW107XG4gICAgbC5waXRzID0gW107XG4gICAgbC5zcGF3bnMgPSBbXTtcbiAgICBsLmZsYWdzID0gW107XG4gICAgbC5oZWlnaHQgPSBsLnNjcmVlbnMubGVuZ3RoO1xuICAgIGwud2lkdGggPSBsLnNjcmVlbnNbMF0ubGVuZ3RoO1xuICAgIGwuZXh0ZW5kZWQgPSAwO1xuICAgIGwudGlsZVBhbGV0dGVzID0gWzB4MWEsIDB4MWIsIDB4MDVdOyAvLyByb2NrIHdhbGxcbiAgICBsLnRpbGVzZXQgPSAweDg4O1xuICAgIGwudGlsZUVmZmVjdHMgPSAweGI1O1xuICAgIGwudGlsZVBhdHRlcm5zID0gWzB4MTQsIDB4MDJdO1xuICAgIGwuc3ByaXRlUGF0dGVybnMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGF0dGVybnNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gICAgbC5zcHJpdGVQYWxldHRlcyA9IFsuLi5TZWFsZWRDYXZlMS5zcHJpdGVQYWxldHRlc10gYXMgW251bWJlciwgbnVtYmVyXTtcbiAgfVxuXG4gIC8vIEFkZCBlbnRyYW5jZSB0byB2YWxsZXkgb2Ygd2luZFxuICAvLyBUT0RPIC0gbWF5YmUganVzdCBkbyAoMHgzMywgW1sweDE5XV0pIG9uY2Ugd2UgZml4IHRoYXQgc2NyZWVuIGZvciBncmFzc1xuICBWYWxsZXlPZldpbmQud3JpdGVTY3JlZW5zMmQoMHgyMywgW1xuICAgIFsweDExLCAweDBkXSxcbiAgICBbMHgwOSwgMHhjMl1dKTtcbiAgcm9tLnRpbGVFZmZlY3RzWzBdLmVmZmVjdHNbMHhjMF0gPSAwO1xuICAvLyBUT0RPIC0gZG8gdGhpcyBvbmNlIHdlIGZpeCB0aGUgc2VhIHRpbGVzZXRcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1YV0gPSAweDBhO1xuICAvLyByb20uc2NyZWVuc1sweGMyXS50aWxlc1sweDViXSA9IDB4MGE7XG5cbiAgLy8gQ29ubmVjdCBtYXBzXG4gIGxvYzEuY29ubmVjdCgweDQzLCBsb2MyLCAweDQ0KTtcbiAgbG9jMS5jb25uZWN0KDB4NDAsIFZhbGxleU9mV2luZCwgMHgzNCk7XG5cbiAgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgLy8gQWRkIGVudHJhbmNlIHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgICBMaW1lVHJlZVZhbGxleS5yZXNpemVTY3JlZW5zKDAsIDEsIDAsIDApOyAvLyBhZGQgb25lIHNjcmVlbiB0byBsZWZ0IGVkZ2VcbiAgICBMaW1lVHJlZVZhbGxleS53cml0ZVNjcmVlbnMyZCgweDAwLCBbXG4gICAgICBbMHgwYywgMHgxMV0sXG4gICAgICBbMHgxNSwgMHgzNl0sXG4gICAgICBbMHgwZSwgMHgwZl1dKTtcbiAgICBsb2MxLnNjcmVlbnNbMF1bNF0gPSAweDk3OyAvLyBkb3duIHN0YWlyXG4gICAgbG9jMS5jb25uZWN0KDB4MDQsIExpbWVUcmVlVmFsbGV5LCAweDEwKTtcbiAgfVxuXG4gIC8vIEFkZCBtb25zdGVyc1xuICBsb2MxLnNwYXducy5wdXNoKFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjEsIHRpbGU6IDB4ODcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMiwgdGlsZTogMHg4OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMywgdGlsZTogMHg4OSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMyLCB0aWxlOiAweDY4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDQxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMywgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgbG9jMi5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDAxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTEsIHRpbGU6IDB4NDgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4NzcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxNCwgdGlsZTogMHgyOCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgyMywgdGlsZTogMHg4NSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OGEsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzQsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4MiwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgaWYgKCFmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gY2hlc3Q6IGFsYXJtIGZsdXRlXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgxMTAsIHg6IDB4NDc4LCB0eXBlOiAyLCBpZDogMHgzMX0pKTtcbiAgfVxuICBpZiAoZmxhZ3MuYWRkRXh0cmFDaGVja3NUb0Vhc3RDYXZlKCkpIHtcbiAgICAvLyBjaGVzdDogbWVkaWNhbCBoZXJiXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgxMTAsIHg6IDB4NDc4LCB0eXBlOiAyLCBpZDogMHg1OX0pKTtcbiAgICAvLyBjaGVzdDogbWltaWNcbiAgICBsb2MyLnNwYXducy5wdXNoKFNwYXduLm9mKHt5OiAweDA3MCwgeDogMHgxMDgsIHR5cGU6IDIsIGlkOiAweDcwfSkpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjb25uZWN0R29hVG9MZWFmKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtHb2FWYWxsZXksIEVhc3RDYXZlMiwgRWFzdENhdmUzfSA9IHJvbS5sb2NhdGlvbnM7XG4gIC8vIEFkZCBhIG5ldyBjYXZlIHRvIHRoZSB0b3AtbGVmdCBjb3JuZXIgb2YgR29hIFZhbGxleS5cbiAgR29hVmFsbGV5LndyaXRlU2NyZWVuczJkKDB4MDAsIFtcbiAgICAgIFsweDBjLCAweGMxLCAweDBkXSxcbiAgICAgIFsweDBlLCAweDM3LCAweDM1XV0pO1xuICAvLyBBZGQgYW4gZXh0cmEgZG93bi1zdGFpciB0byBFYXN0Q2F2ZTIgYW5kIGEgbmV3IDMtc2NyZWVuIEVhc3RDYXZlMyBtYXAuXG5cbiAgcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShFYXN0Q2F2ZTMpO1xuICBFYXN0Q2F2ZTMuc2NyZWVucyA9IFtbMHg5YV0sXG4gICAgICAgICAgICAgICAgICAgICAgIFsweDhmXSxcbiAgICAgICAgICAgICAgICAgICAgICAgWzB4OWVdXTtcbiAgRWFzdENhdmUzLmhlaWdodCA9IDM7XG4gIEVhc3RDYXZlMy53aWR0aCA9IDE7XG5cbiAgLy8gQWRkIGEgcm9jayB3YWxsIChpZD0wKS5cbiAgRWFzdENhdmUzLnNwYXducy5wdXNoKFNwYXduLmZyb20oWzB4MTgsIDB4MDcsIDB4MjMsIDB4MDBdKSk7XG4gIEVhc3RDYXZlMy5mbGFncy5wdXNoKEZsYWcub2Yoe3NjcmVlbjogMHgxMCwgZmxhZzogcm9tLmZsYWdzLmFsbG9jTWFwRmxhZygpfSkpO1xuXG4gIC8vIE1ha2UgdGhlIGNvbm5lY3Rpb25zLlxuICBFYXN0Q2F2ZTIuc2NyZWVuc1s0XVswXSA9IDB4OTk7XG4gIEVhc3RDYXZlMi5jb25uZWN0KDB4NDAsIEVhc3RDYXZlMywgfjB4MDApO1xuICBFYXN0Q2F2ZTMuY29ubmVjdCgweDIwLCBHb2FWYWxsZXksIDB4MDEpO1xufVxuXG5mdW5jdGlvbiBhZGRab21iaWVXYXJwKHJvbTogUm9tKSB7XG4gIC8vIE1ha2Ugc3BhY2UgZm9yIHRoZSBuZXcgZmxhZyBiZXR3ZWVuIEpvZWwgYW5kIFN3YW5cbiAgZm9yIChsZXQgaSA9IDB4MmY1OyBpIDwgMHgyZmM7IGkrKykge1xuICAgIHJvbS5tb3ZlRmxhZyhpLCBpIC0gMSk7XG4gIH1cbiAgLy8gVXBkYXRlIHRoZSBtZW51XG4gIGNvbnN0IG1lc3NhZ2UgPSByb20ubWVzc2FnZXMucGFydHNbMHgyMV1bMF07XG4gIG1lc3NhZ2UudGV4dCA9IFtcbiAgICAnIHsxYTpMZWFmfSAgICAgIHsxNjpCcnlubWFlcn0gezFkOk9ha30gJyxcbiAgICAnezBjOk5hZGFyZX1cXCdzICB7MWU6UG9ydG9hfSAgIHsxNDpBbWF6b25lc30gJyxcbiAgICAnezE5OkpvZWx9ICAgICAgWm9tYmllICAgezIwOlN3YW59ICcsXG4gICAgJ3syMzpTaHlyb259ICAgIHsxODpHb2F9ICAgICAgezIxOlNhaGFyYX0nLFxuICBdLmpvaW4oJ1xcbicpO1xuICAvLyBBZGQgYSB0cmlnZ2VyIHRvIHRoZSBlbnRyYW5jZSAtIHRoZXJlJ3MgYWxyZWFkeSBhIHNwYXduIGZvciA4YVxuICAvLyBidXQgd2UgY2FuJ3QgcmV1c2UgdGhhdCBzaW5jZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBvbmUgb3V0c2lkZVxuICAvLyB0aGUgbWFpbiBFU0kgZW50cmFuY2U7IHNvIHJldXNlIGEgZGlmZmVyZW50IG9uZS5cbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW107XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZmJdOyAvLyBuZXcgd2FycCBwb2ludCBmbGFnXG4gIC8vIEFjdHVhbGx5IHJlcGxhY2UgdGhlIHRyaWdnZXIuXG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4YSkge1xuICAgICAgc3Bhd24uaWQgPSB0cmlnZ2VyLmlkO1xuICAgIH1cbiAgfVxuICByb20udG93bldhcnAubG9jYXRpb25zLnNwbGljZSg3LCAwLCByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uaWQpO1xuICBpZiAocm9tLnRvd25XYXJwLmxvY2F0aW9ucy5wb3AoKSAhPT0gMHhmZikgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gIC8vIEFTTSBmaXhlcyBzaG91bGQgaGF2ZSBoYXBwZW5lZCBpbiBwcmVzaHVmZmxlLnNcbn1cblxuZnVuY3Rpb24gZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb206IFJvbSkge1xuICByb20udHJpZ2dlcigweDhhKS5jb25kaXRpb25zID0gW34weDBlZV07IC8vIG5ldyBmbGFnIGZvciByaWRpbmcgZG9scGhpblxuICByb20ubWVzc2FnZXMucGFydHNbMHgxZF1bMHgxMF0udGV4dCA9IGBUaGUgY2F2ZSBlbnRyYW5jZSBhcHBlYXJzXG50byBiZSB1bmRlcndhdGVyLiBZb3UnbGxcbm5lZWQgdG8gc3dpbS5gO1xufVxuXG5mdW5jdGlvbiByZXZlcnNpYmxlU3dhbkdhdGUocm9tOiBSb20pIHtcbiAgLy8gQWxsb3cgb3BlbmluZyBTd2FuIGZyb20gZWl0aGVyIHNpZGUgYnkgYWRkaW5nIGEgcGFpciBvZiBndWFyZHMgb24gdGhlXG4gIC8vIG9wcG9zaXRlIHNpZGUgb2YgdGhlIGdhdGUuXG4gIHJvbS5sb2NhdGlvbnNbMHg3M10uc3Bhd25zLnB1c2goXG4gICAgLy8gTk9URTogU29sZGllcnMgbXVzdCBjb21lIGluIHBhaXJzICh3aXRoIGluZGV4IF4xIGZyb20gZWFjaCBvdGhlcilcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGEsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwYiwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBlLCB5dDogMHgwYSwgdHlwZTogMiwgaWQ6IDB4YjN9KSwgLy8gbmV3IHRyaWdnZXI6IGVyYXNlIGd1YXJkc1xuICApO1xuXG4gIC8vIEd1YXJkcyAoJDJkKSBhdCBzd2FuIGdhdGUgKCQ3MykgfiBzZXQgMTBkIGFmdGVyIG9wZW5pbmcgZ2F0ZSA9PiBjb25kaXRpb24gZm9yIGRlc3Bhd25cbiAgcm9tLm5wY3NbMHgyZF0ubG9jYWxEaWFsb2dzLmdldCgweDczKSFbMF0uZmxhZ3MucHVzaCgweDEwZCk7XG5cbiAgLy8gRGVzcGF3biBndWFyZCB0cmlnZ2VyIHJlcXVpcmVzIDEwZFxuICByb20udHJpZ2dlcigweGIzKS5jb25kaXRpb25zLnB1c2goMHgxMGQpO1xufVxuXG5mdW5jdGlvbiBsZWFmRWxkZXJJblNhYnJlSGVhbHMocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgbGVhZkVsZGVyID0gcm9tLm5wY3NbMHgwZF07XG4gIGNvbnN0IHN1bW1pdERpYWxvZyA9IGxlYWZFbGRlci5sb2NhbERpYWxvZ3MuZ2V0KDB4MzUpIVswXTtcbiAgc3VtbWl0RGlhbG9nLm1lc3NhZ2UuYWN0aW9uID0gMHgxNzsgLy8gaGVhbCBhbmQgZGlzYXBwZWFyLlxufVxuXG5mdW5jdGlvbiBwcmV2ZW50TnBjRGVzcGF3bnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGZ1bmN0aW9uIHJlbW92ZTxUPihhcnI6IFRbXSwgZWxlbTogVCk6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmluZGV4T2YoZWxlbSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50ICR7ZWxlbX0gaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlSWY8VD4oYXJyOiBUW10sIHByZWQ6IChlbGVtOiBUKSA9PiBib29sZWFuKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuZmluZEluZGV4KHByZWQpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpYWxvZyhpZDogbnVtYmVyLCBsb2M6IG51bWJlciA9IC0xKTogTG9jYWxEaWFsb2dbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLmxvY2FsRGlhbG9ncy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGRpYWxvZyAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIHNwYXducyhpZDogbnVtYmVyLCBsb2M6IG51bWJlcik6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0uc3Bhd25Db25kaXRpb25zLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgc3Bhd24gY29uZGl0aW9uICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBMaW5rIHNvbWUgcmVkdW5kYW50IE5QQ3M6IEtlbnN1ICg3ZSwgNzQpIGFuZCBBa2FoYW5hICg4OCwgMTYpXG4gIC8vIFVzZSA3NCBmb3Igb25seSBLZW5zdSBpbiBkYW5jZSBoYWxsIC0gbm9ib2R5IGVsc2Ugd2lsbCBhY2NlcHQgdHJhZGUtaW4uXG4gIHJvbS5ucGNzWzB4NzRdLmxpbmsoMHg3ZSk7XG4gIHJvbS5ucGNzWzB4NzRdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDc0XS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4N2VdLmRhdGFdIGFzIGFueTtcbiAgcm9tLmxvY2F0aW9ucy5Td2FuX0RhbmNlSGFsbC5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDdlKSEuaWQgPSAweDc0O1xuICByb20uaXRlbXMuTG92ZVBlbmRhbnQuaXRlbVVzZURhdGFbMF0ud2FudCA9IDB4MTc0O1xuXG4gIC8vIGRpYWxvZyBpcyBzaGFyZWQgYmV0d2VlbiA4OCBhbmQgMTYuXG4gIHJvbS5ucGNzWzB4ODhdLmxpbmtEaWFsb2coMHgxNik7XG5cbiAgLy8gR2l2ZW4gS2Vuc3UgN2UgYSBnbG93aW5nIGxhbXAgaW5zdGVhZCBvZiBjaGFuZ2UgKEtlbnN1IDc0IGhhcyB0aGF0IG5vdylcbiAgcm9tLm5wY3NbMHg3ZV0uZGF0YVswXSA9IDB4Mzk7IC8vIGdsb3dpbmcgbGFtcFxuXG4gIC8vIE1ha2UgYSBuZXcgTlBDIGZvciBBa2FoYW5hIGluIEJyeW5tYWVyOyBvdGhlcnMgd29uJ3QgYWNjZXB0IHRoZSBTdGF0dWUgb2YgT255eC5cbiAgLy8gTGlua2luZyBzcGF3biBjb25kaXRpb25zIGFuZCBkaWFsb2dzIGlzIHN1ZmZpY2llbnQsIHNpbmNlIHRoZSBhY3R1YWwgTlBDIElEXG4gIC8vICgxNiBvciA4MikgaXMgd2hhdCBtYXR0ZXJzIGZvciB0aGUgdHJhZGUtaW5cbiAgcm9tLm5wY3NbMHg4Ml0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4ODJdLmxpbmsoMHgxNik7XG4gIHJvbS5ucGNzWzB4ODJdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHgxNl0uZGF0YV0gYXMgYW55OyAvLyBlbnN1cmUgZ2l2ZSBpdGVtXG4gIHJvbS5sb2NhdGlvbnMuQnJ5bm1hZXIuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHgxNikhLmlkID0gMHg4MjtcbiAgcm9tLml0ZW1zLlN0YXR1ZU9mT255eC5pdGVtVXNlRGF0YVswXS53YW50ID0gMHgxODI7XG5cbiAgLy8gTGVhZiBlbGRlciBpbiBob3VzZSAoJDBkIEAgJGMwKSB+IHN3b3JkIG9mIHdpbmQgcmVkdW5kYW50IGZsYWdcbiAgLy8gZGlhbG9nKDB4MGQsIDB4YzApWzJdLmZsYWdzID0gW107XG4gIC8vcm9tLml0ZW1HZXRzWzB4MDBdLmZsYWdzID0gW107IC8vIGNsZWFyIHJlZHVuZGFudCBmbGFnXG5cbiAgLy8gTGVhZiByYWJiaXQgKCQxMykgbm9ybWFsbHkgc3RvcHMgc2V0dGluZyBpdHMgZmxhZyBhZnRlciBwcmlzb24gZG9vciBvcGVuZWQsXG4gIC8vIGJ1dCB0aGF0IGRvZXNuJ3QgbmVjZXNzYXJpbHkgb3BlbiBtdCBzYWJyZS4gIEluc3RlYWQgKGEpIHRyaWdnZXIgb24gMDQ3XG4gIC8vIChzZXQgYnkgOGQgdXBvbiBlbnRlcmluZyBlbGRlcidzIGNlbGwpLiAgQWxzbyBtYWtlIHN1cmUgdGhhdCB0aGF0IHBhdGggYWxzb1xuICAvLyBwcm92aWRlcyB0aGUgbmVlZGVkIGZsYWcgdG8gZ2V0IGludG8gbXQgc2FicmUuXG4gIGRpYWxvZygweDEzKVsyXS5jb25kaXRpb24gPSAweDA0NztcbiAgZGlhbG9nKDB4MTMpWzJdLmZsYWdzID0gWzB4MGE5XTtcbiAgZGlhbG9nKDB4MTMpWzNdLmZsYWdzID0gWzB4MGE5XTtcblxuICAvLyBXaW5kbWlsbCBndWFyZCAoJDE0IEAgJDBlKSBzaG91bGRuJ3QgZGVzcGF3biBhZnRlciBhYmR1Y3Rpb24gKDAzOCksXG4gIC8vIGJ1dCBpbnN0ZWFkIGFmdGVyIGdpdmluZyB0aGUgaXRlbSAoMDg4KVxuICBzcGF3bnMoMHgxNCwgMHgwZSlbMV0gPSB+MHgwODg7IC8vIHJlcGxhY2UgZmxhZyB+MDM4ID0+IH4wODhcbiAgLy9kaWFsb2coMHgxNCwgMHgwZSlbMF0uZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIHJlZHVuZGFudCBmbGFnIH4gd2luZG1pbGwga2V5XG5cbiAgLy8gQWthaGFuYSAoJDE2IC8gODgpIH4gc2hpZWxkIHJpbmcgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHgxNiwgMHg1NylbMF0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGlzYXBwZWFyIGFmdGVyIGdldHRpbmcgYmFycmllciAobm90ZSA4OCdzIHNwYXducyBub3QgbGlua2VkIHRvIDE2KVxuICByZW1vdmUoc3Bhd25zKDB4MTYsIDB4NTcpLCB+MHgwNTEpO1xuICByZW1vdmUoc3Bhd25zKDB4ODgsIDB4NTcpLCB+MHgwNTEpO1xuXG4gIGZ1bmN0aW9uIHJldmVyc2VEaWFsb2coZHM6IExvY2FsRGlhbG9nW10pOiB2b2lkIHtcbiAgICBkcy5yZXZlcnNlKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbmV4dCA9IGRzW2kgKyAxXTtcbiAgICAgIGRzW2ldLmNvbmRpdGlvbiA9IG5leHQgPyB+bmV4dC5jb25kaXRpb24gOiB+MDtcbiAgICB9XG4gIH07XG5cbiAgLy8gT2FrIGVsZGVyICgkMWQpIH4gc3dvcmQgb2YgZmlyZSByZWR1bmRhbnQgZmxhZ1xuICBjb25zdCBvYWtFbGRlckRpYWxvZyA9IGRpYWxvZygweDFkKTtcbiAgLy9vYWtFbGRlckRpYWxvZ1s0XS5mbGFncyA9IFtdO1xuICAvLyBNYWtlIHN1cmUgdGhhdCB3ZSB0cnkgdG8gZ2l2ZSB0aGUgaXRlbSBmcm9tICphbGwqIHBvc3QtaW5zZWN0IGRpYWxvZ3NcbiAgb2FrRWxkZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuXG4gIC8vIE9hayBtb3RoZXIgKCQxZSkgfiBpbnNlY3QgZmx1dGUgcmVkdW5kYW50IGZsYWdcbiAgLy8gVE9ETyAtIHJlYXJyYW5nZSB0aGVzZSBmbGFncyBhIGJpdCAobWF5YmUgfjA0NSwgfjBhMCB+MDQxIC0gc28gcmV2ZXJzZSlcbiAgLy8gICAgICAtIHdpbGwgbmVlZCB0byBjaGFuZ2UgYmFsbE9mRmlyZSBhbmQgaW5zZWN0Rmx1dGUgaW4gZGVwZ3JhcGhcbiAgY29uc3Qgb2FrTW90aGVyRGlhbG9nID0gZGlhbG9nKDB4MWUpO1xuICAoKCkgPT4ge1xuICAgIGNvbnN0IFtraWxsZWRJbnNlY3QsIGdvdEl0ZW0sIGdldEl0ZW0sIGZpbmRDaGlsZF0gPSBvYWtNb3RoZXJEaWFsb2c7XG4gICAgZmluZENoaWxkLmNvbmRpdGlvbiA9IH4weDA0NTtcbiAgICAvL2dldEl0ZW0uY29uZGl0aW9uID0gfjB4MjI3O1xuICAgIC8vZ2V0SXRlbS5mbGFncyA9IFtdO1xuICAgIGdvdEl0ZW0uY29uZGl0aW9uID0gfjA7XG4gICAgcm9tLm5wY3NbMHgxZV0ubG9jYWxEaWFsb2dzLnNldCgtMSwgW2ZpbmRDaGlsZCwgZ2V0SXRlbSwga2lsbGVkSW5zZWN0LCBnb3RJdGVtXSk7XG4gIH0pKCk7XG4gIC8vLyBvYWtNb3RoZXJEaWFsb2dbMl0uZmxhZ3MgPSBbXTtcbiAgLy8gLy8gRW5zdXJlIHdlIGFsd2F5cyBnaXZlIGl0ZW0gYWZ0ZXIgaW5zZWN0LlxuICAvLyBvYWtNb3RoZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyBvYWtNb3RoZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyByZXZlcnNlRGlhbG9nKG9ha01vdGhlckRpYWxvZyk7XG5cbiAgLy8gUmV2ZXJzZSB0aGUgb3RoZXIgb2FrIGRpYWxvZ3MsIHRvby5cbiAgZm9yIChjb25zdCBpIG9mIFsweDIwLCAweDIxLCAweDIyLCAweDdjLCAweDdkXSkge1xuICAgIHJldmVyc2VEaWFsb2coZGlhbG9nKGkpKTtcbiAgfVxuXG4gIC8vIFN3YXAgdGhlIGZpcnN0IHR3byBvYWsgY2hpbGQgZGlhbG9ncy5cbiAgY29uc3Qgb2FrQ2hpbGREaWFsb2cgPSBkaWFsb2coMHgxZik7XG4gIG9ha0NoaWxkRGlhbG9nLnVuc2hpZnQoLi4ub2FrQ2hpbGREaWFsb2cuc3BsaWNlKDEsIDEpKTtcblxuICAvLyBUaHJvbmUgcm9vbSBiYWNrIGRvb3IgZ3VhcmQgKCQzMyBAICRkZikgc2hvdWxkIGhhdmUgc2FtZSBzcGF3biBjb25kaXRpb24gYXMgcXVlZW5cbiAgLy8gKDAyMCBOT1QgcXVlZW4gbm90IGluIHRocm9uZSByb29tIEFORCAwMWIgTk9UIHZpZXdlZCBtZXNpYSByZWNvcmRpbmcpXG4gIHJvbS5ucGNzWzB4MzNdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkZiwgIFt+MHgwMjAsIH4weDAxYl0pO1xuXG4gIC8vIEZyb250IHBhbGFjZSBndWFyZCAoJDM0KSB2YWNhdGlvbiBtZXNzYWdlIGtleXMgb2ZmIDAxYiBpbnN0ZWFkIG9mIDAxZlxuICBkaWFsb2coMHgzNClbMV0uY29uZGl0aW9uID0gMHgwMWI7XG5cbiAgLy8gUXVlZW4ncyAoJDM4KSBkaWFsb2cgbmVlZHMgcXVpdGUgYSBiaXQgb2Ygd29ya1xuICAvLyBHaXZlIGl0ZW0gKGZsdXRlIG9mIGxpbWUpIGV2ZW4gaWYgZ290IHRoZSBzd29yZCBvZiB3YXRlclxuICBkaWFsb2coMHgzOClbM10uY29uZGl0aW9uID0gMHgyMDI7IC8vIFwieW91IGZvdW5kIHN3b3JkXCIgKGNvbmRpdGlvbiAyMDIpXG4gIGRpYWxvZygweDM4KVszXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7IC8vICA9PiBhY3Rpb24gM1xuICAvLyBFbnN1cmUgeW91IGNhbiBhbHdheXMgbWFrZSB0aGUgcXVlZW4gZ28gYXdheS5cbiAgZGlhbG9nKDB4MzgpWzRdLmZsYWdzLnB1c2goMHgwOWMpOyAgICAgLy8gc2V0IDA5YyBxdWVlbiBnb2luZyBhd2F5XG4gIC8vIFF1ZWVuIHNwYXduIGNvbmRpdGlvbiBkZXBlbmRzIG9uIDAxYiAobWVzaWEgcmVjb3JkaW5nKSBub3QgMDFmIChiYWxsIG9mIHdhdGVyKVxuICAvLyBUaGlzIGVuc3VyZXMgeW91IGhhdmUgYm90aCBzd29yZCBhbmQgYmFsbCB0byBnZXQgdG8gaGVyICg/Pz8pXG4gIHNwYXducygweDM4LCAweGRmKVsxXSA9IH4weDAxYjsgIC8vIHRocm9uZSByb29tOiAwMWIgTk9UIG1lc2lhIHJlY29yZGluZ1xuICBzcGF3bnMoMHgzOCwgMHhlMSlbMF0gPSAweDAxYjsgICAvLyBiYWNrIHJvb206IDAxYiBtZXNpYSByZWNvcmRpbmdcbiAgZGlhbG9nKDB4MzgpWzFdLmNvbmRpdGlvbiA9IDB4MDFiOyAgICAgLy8gcmV2ZWFsIGNvbmRpdGlvbjogMDFiIG1lc2lhIHJlY29yZGluZ1xuXG4gIC8vIEZvcnR1bmUgdGVsbGVyICgkMzkpIHNob3VsZCBhbHNvIG5vdCBzcGF3biBiYXNlZCBvbiBtZXNpYSByZWNvcmRpbmcgcmF0aGVyIHRoYW4gb3JiXG4gIHNwYXducygweDM5LCAweGQ4KVsxXSA9IH4weDAxYjsgIC8vIGZvcnR1bmUgdGVsbGVyIHJvb206IDAxYiBOT1RcblxuICAvLyBDbGFyayAoJDQ0KSBtb3ZlcyBhZnRlciB0YWxraW5nIHRvIGhpbSAoMDhkKSByYXRoZXIgdGhhbiBjYWxtaW5nIHNlYSAoMDhmKS5cbiAgLy8gVE9ETyAtIGNoYW5nZSAwOGQgdG8gd2hhdGV2ZXIgYWN0dWFsIGl0ZW0gaGUgZ2l2ZXMsIHRoZW4gcmVtb3ZlIGJvdGggZmxhZ3NcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU5LCBbfjB4MDhkXSk7IC8vIHpvbWJpZSB0b3duIGJhc2VtZW50XG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlNCwgWzB4MDhkXSk7ICAvLyBqb2VsIHNoZWRcbiAgLy9kaWFsb2coMHg0NCwgMHhlOSlbMV0uZmxhZ3MucG9wKCk7IC8vIHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG5cbiAgLy8gQnJva2FoYW5hICgkNTQpIH4gd2FycmlvciByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NTQpWzJdLmZsYWdzID0gW107XG5cbiAgLy8gRGVvICgkNWEpIH4gcGVuZGFudCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVhKVsxXS5mbGFncyA9IFtdO1xuXG4gIC8vIFplYnUgKCQ1ZSkgY2F2ZSBkaWFsb2cgKEAgJDEwKVxuICAvLyBUT0RPIC0gZGlhbG9ncygweDVlLCAweDEwKS5yZWFycmFuZ2UofjB4MDNhLCAweDAwZCwgMHgwMzgsIDB4MDM5LCAweDAwYSwgfjB4MDAwKTtcbiAgcm9tLm5wY3NbMHg1ZV0ubG9jYWxEaWFsb2dzLnNldCgweDEwLCBbXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDNhLCBbMHgwMCwgMHgxYV0sIFsweDAzYV0pLCAvLyAwM2EgTk9UIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgLT4gU2V0IDAzYVxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwZCwgWzB4MDAsIDB4MWRdKSwgLy8gMDBkIGxlYWYgdmlsbGFnZXJzIHJlc2N1ZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzgsIFsweDAwLCAweDFjXSksIC8vIDAzOCBsZWFmIGF0dGFja2VkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM5LCBbMHgwMCwgMHgxZF0pLCAvLyAwMzkgbGVhcm5lZCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBhLCBbMHgwMCwgMHgxYiwgMHgwM10pLCAvLyAwMGEgd2luZG1pbGwga2V5IHVzZWQgLT4gdGVhY2ggcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKH4weDAwMCwgWzB4MDAsIDB4MWRdKSxcbiAgXSk7XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJlbW92ZShzcGF3bnMoMHg1ZSwgMHgxMCksIH4weDA1MSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFRvcm5lbCAoJDVmKSBpbiBzYWJyZSB3ZXN0ICgkMjEpIH4gdGVsZXBvcnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1ZiwgMHgyMSlbMV0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg1Zl0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDIxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gU3RvbSAoJDYwKTogZG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg2MF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDFlKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gQXNpbmEgKCQ2MikgaW4gYmFjayByb29tICgkZTEpIGdpdmVzIGZsdXRlIG9mIGxpbWVcbiAgY29uc3QgYXNpbmEgPSByb20ubnBjc1sweDYyXTtcbiAgYXNpbmEuZGF0YVsxXSA9IDB4Mjg7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgLy8gUHJldmVudCBkZXNwYXduIGZyb20gYmFjayByb29tIGFmdGVyIGRlZmVhdGluZyBzYWJlcmEgKH4wOGYpXG4gIHJlbW92ZShzcGF3bnMoYXNpbmEuaWQsIDB4ZTEpLCB+MHgwOGYpO1xuXG4gIC8vIEtlbnN1IGluIGNhYmluICgkNjggQCAkNjEpIG5lZWRzIHRvIGJlIGF2YWlsYWJsZSBldmVuIGFmdGVyIHZpc2l0aW5nIEpvZWwuXG4gIC8vIENoYW5nZSBoaW0gdG8ganVzdCBkaXNhcHBlYXIgYWZ0ZXIgc2V0dGluZyB0aGUgcmlkZWFibGUgZG9scGhpbiBmbGFnICgwOWIpLFxuICAvLyBhbmQgdG8gbm90IGV2ZW4gc2hvdyB1cCBhdCBhbGwgdW5sZXNzIHRoZSBmb2cgbGFtcCB3YXMgcmV0dXJuZWQgKDAyMSkuXG4gIHJvbS5ucGNzWzB4NjhdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHg2MSwgW34weDA5YiwgMHgwMjFdKTtcbiAgZGlhbG9nKDB4NjgpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMjsgLy8gZGlzYXBwZWFyXG5cbiAgLy8gQXp0ZWNhIGluIFNoeXJvbiAoNmUpIHNob3VsZG4ndCBzcGF3biBhZnRlciBtYXNzYWNyZSAoMDI3KVxuICByb20ubnBjc1sweDZlXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4ZjIpIS5wdXNoKH4weDAyNyk7XG4gIC8vIEFsc28gdGhlIGRpYWxvZyB0cmlnZ2VyICg4Mikgc2hvdWxkbid0IGhhcHBlblxuICByb20udHJpZ2dlcigweDgyKS5jb25kaXRpb25zLnB1c2gofjB4MDI3KTtcblxuICAvLyBLZW5zdSBpbiBsaWdodGhvdXNlICgkNzQvJDdlIEAgJDYyKSB+IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NzQsIDB4NjIpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gQXp0ZWNhICgkODMpIGluIHB5cmFtaWQgfiBib3cgb2YgdHJ1dGggcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg4MylbMF0uY29uZGl0aW9uID0gfjB4MjQwOyAgLy8gMjQwIE5PVCBib3cgb2YgdHJ1dGhcbiAgLy9kaWFsb2coMHg4MylbMF0uZmxhZ3MgPSBbXTtcblxuICAvLyBSYWdlIGJsb2NrcyBvbiBzd29yZCBvZiB3YXRlciwgbm90IHJhbmRvbSBpdGVtIGZyb20gdGhlIGNoZXN0XG4gIGRpYWxvZygweGMzKVswXS5jb25kaXRpb24gPSAweDIwMjtcblxuICAvLyBSZW1vdmUgdXNlbGVzcyBzcGF3biBjb25kaXRpb24gZnJvbSBNYWRvIDFcbiAgcm9tLm5wY3NbMHhjNF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweGYyKTsgLy8gYWx3YXlzIHNwYXduXG5cbiAgLy8gRHJheWdvbiAyICgkY2IgQCBsb2NhdGlvbiAkYTYpIHNob3VsZCBkZXNwYXduIGFmdGVyIGJlaW5nIGRlZmVhdGVkLlxuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4YTYsIFt+MHgyOGRdKTsgLy8ga2V5IG9uIGJhY2sgd2FsbCBkZXN0cm95ZWRcblxuICAvLyBGaXggWmVidSB0byBnaXZlIGtleSB0byBzdHh5IGV2ZW4gaWYgdGh1bmRlciBzd29yZCBpcyBnb3R0ZW4gKGp1c3Qgc3dpdGNoIHRoZVxuICAvLyBvcmRlciBvZiB0aGUgZmlyc3QgdHdvKS4gIEFsc28gZG9uJ3QgYm90aGVyIHNldHRpbmcgMDNiIHNpbmNlIHRoZSBuZXcgSXRlbUdldFxuICAvLyBsb2dpYyBvYnZpYXRlcyB0aGUgbmVlZC5cbiAgY29uc3QgemVidVNoeXJvbiA9IHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5nZXQoMHhmMikhO1xuICB6ZWJ1U2h5cm9uLnVuc2hpZnQoLi4uemVidVNoeXJvbi5zcGxpY2UoMSwgMSkpO1xuICAvLyB6ZWJ1U2h5cm9uWzBdLmZsYWdzID0gW107XG5cbiAgLy8gU2h5cm9uIG1hc3NhY3JlICgkODApIHJlcXVpcmVzIGtleSB0byBzdHh5XG4gIHJvbS50cmlnZ2VyKDB4ODApLmNvbmRpdGlvbnMgPSBbXG4gICAgfjB4MDI3LCAvLyBub3QgdHJpZ2dlcmVkIG1hc3NhY3JlIHlldFxuICAgICAweDAzYiwgLy8gZ290IGl0ZW0gZnJvbSBrZXkgdG8gc3R4eSBzbG90XG4gICAgIDB4MmZkLCAvLyBzaHlyb24gd2FycCBwb2ludCB0cmlnZ2VyZWRcbiAgICAgLy8gMHgyMDMsIC8vIGdvdCBzd29yZCBvZiB0aHVuZGVyIC0gTk9UIEFOWSBNT1JFIVxuICBdO1xuXG4gIC8vIEVudGVyIHNoeXJvbiAoJDgxKSBzaG91bGQgc2V0IHdhcnAgbm8gbWF0dGVyIHdoYXRcbiAgcm9tLnRyaWdnZXIoMHg4MSkuY29uZGl0aW9ucyA9IFtdO1xuXG4gIGlmIChmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCkpIHtcbiAgICAvLyBMZWFybiBiYXJyaWVyICgkODQpIHJlcXVpcmVzIGNhbG0gc2VhXG4gICAgcm9tLnRyaWdnZXIoMHg4NCkuY29uZGl0aW9ucy5wdXNoKDB4MjgzKTsgLy8gMjgzIGNhbG1lZCB0aGUgc2VhXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIG5vdCBzZXR0aW5nIDA1MSBhbmQgY2hhbmdpbmcgdGhlIGNvbmRpdGlvbiB0byBtYXRjaCB0aGUgaXRlbVxuICB9XG4gIC8vcm9tLnRyaWdnZXIoMHg4NCkuZmxhZ3MgPSBbXTtcblxuICAvLyBBZGQgYW4gZXh0cmEgY29uZGl0aW9uIHRvIHRoZSBMZWFmIGFiZHVjdGlvbiB0cmlnZ2VyIChiZWhpbmQgemVidSkuICBUaGlzIGVuc3VyZXNcbiAgLy8gYWxsIHRoZSBpdGVtcyBpbiBMZWFmIHByb3BlciAoZWxkZXIgYW5kIHN0dWRlbnQpIGFyZSBnb3R0ZW4gYmVmb3JlIHRoZXkgZGlzYXBwZWFyLlxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2goMHgwM2EpOyAvLyAwM2EgdGFsa2VkIHRvIHplYnUgaW4gY2F2ZVxuXG4gIC8vIE1vcmUgd29yayBvbiBhYmR1Y3Rpb24gdHJpZ2dlcnM6XG4gIC8vIDEuIFJlbW92ZSB0aGUgOGQgdHJpZ2dlciBpbiB0aGUgZnJvbnQgb2YgdGhlIGNlbGwsIHN3YXAgaXQgb3V0XG4gIC8vICAgIGZvciBiMiAobGVhcm4gcGFyYWx5c2lzKS5cbiAgcm9tLnRyaWdnZXIoMHg4ZCkudXNlZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUuc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKSBzcGF3bi5pZCA9IDB4YjI7XG4gIH1cbiAgcmVtb3ZlSWYocm9tLmxvY2F0aW9ucy5XYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMsXG4gICAgICAgICAgIHNwYXduID0+IHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKTtcbiAgLy8gMi4gU2V0IHRoZSB0cmlnZ2VyIHRvIHJlcXVpcmUgaGF2aW5nIGtpbGxlZCBrZWxiZXNxdWUuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnMucHVzaCgweDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gMy4gQWxzbyBzZXQgdGhlIHRyaWdnZXIgdG8gZnJlZSB0aGUgdmlsbGFnZXJzIGFuZCB0aGUgZWxkZXIuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnB1c2gofjB4MDg0LCB+MHgwODUsIDB4MDBkKTtcbiAgLy8gNC4gRG9uJ3QgdHJpZ2dlciB0aGUgYWJkdWN0aW9uIGluIHRoZSBmaXJzdCBwbGFjZSBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA1LiBEb24ndCB0cmlnZ2VyIHJhYmJpdCBibG9jayBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDg2KS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA2LiBEb24ndCBmcmVlIHZpbGxhZ2VycyBmcm9tIHVzaW5nIHByaXNvbiBrZXlcbiAgcm9tLnByZ1sweDFlMGEzXSA9IDB4YzA7XG4gIHJvbS5wcmdbMHgxZTBhNF0gPSAweDAwO1xuXG4gIC8vIFRPRE8gLSBhZGRpdGlvbmFsIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXI6XG4gIC8vICAgLSBnZXQgcmlkIG9mIHRoZSBmbGFncyBvbiBrZXkgdG8gcHJpc29uIHVzZVxuICAvLyAgIC0gYWRkIGEgY29uZGl0aW9uIHRoYXQgYWJkdWN0aW9uIGRvZXNuJ3QgaGFwcGVuIGlmIHJlc2N1ZWRcbiAgLy8gR2V0IHJpZCBvZiBCT1RIIHRyaWdnZXJzIGluIHN1bW1pdCBjYXZlLCAgSW5zdGVhZCwgdGllIGV2ZXJ5dGhpbmdcbiAgLy8gdG8gdGhlIGVsZGVyIGRpYWxvZyBvbiB0b3BcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBzdGlsbCBhbGl2ZSwgbWF5YmUgZ2l2ZSBhIGhpbnQgYWJvdXQgd2Vha25lc3NcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBkZWFkIHRoZW4gdGVhY2ggcGFyYWx5c2lzIGFuZCBzZXQvY2xlYXIgZmxhZ3NcbiAgLy8gICAtIGlmIHBhcmFseXNpcyBsZWFybmVkIHRoZW4gc2F5IHNvbWV0aGluZyBnZW5lcmljXG4gIC8vIFN0aWxsIG5lZWQgdG8ga2VlcCB0aGUgdHJpZ2dlciBpbiB0aGUgZnJvbnQgaW4gY2FzZSBub1xuICAvLyBhYmR1Y3Rpb24geWV0XG4gIC8vICAgLSBpZiBOT1QgcGFyYWx5c2lzIEFORCBpZiBOT1QgZWxkZXIgbWlzc2luZyBBTkQgaWYga2VsYmVxdWUgZGVhZFxuICAvLyAtLS0+IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBmb3IgdHdvIHdheXMgdG8gZ2V0IChsaWtlIHJlZnJlc2gpP1xuICAvL1xuICAvLyBBbHNvIGFkZCBhIGNoZWNrIHRoYXQgdGhlIHJhYmJpdCB0cmlnZ2VyIGlzIGdvbmUgaWYgcmVzY3VlZCFcblxuXG5cbiAgLy8gUGFyYWx5c2lzIHRyaWdnZXIgKCRiMikgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDI7XG4gIC8vcm9tLnRyaWdnZXIoMHhiMikuZmxhZ3Muc2hpZnQoKTsgLy8gcmVtb3ZlIDAzNyBsZWFybmVkIHBhcmFseXNpc1xuXG4gIC8vIExlYXJuIHJlZnJlc2ggdHJpZ2dlciAoJGI0KSB+IHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuY29uZGl0aW9uc1sxXSA9IH4weDI0MTtcbiAgLy9yb20udHJpZ2dlcigweGI0KS5mbGFncyA9IFtdOyAvLyByZW1vdmUgMDM5IGxlYXJuZWQgcmVmcmVzaFxuXG4gIC8vIFRlbGVwb3J0IGJsb2NrIG9uIG10IHNhYnJlIGlzIGZyb20gc3BlbGwsIG5vdCBzbG90XG4gIHJvbS50cmlnZ2VyKDB4YmEpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDQ7IC8vIH4wM2YgLT4gfjI0NFxuXG4gIC8vIFBvcnRvYSBwYWxhY2UgZ3VhcmQgbW92ZW1lbnQgdHJpZ2dlciAoJGJiKSBzdG9wcyBvbiAwMWIgKG1lc2lhKSBub3QgMDFmIChvcmIpXG4gIHJvbS50cmlnZ2VyKDB4YmIpLmNvbmRpdGlvbnNbMV0gPSB+MHgwMWI7XG5cbiAgLy8gUmVtb3ZlIHJlZHVuZGFudCB0cmlnZ2VyIDhhIChzbG90IDE2KSBpbiB6b21iaWV0b3duICgkNjUpXG4gIC8vICAtLSBub3RlOiBubyBsb25nZXIgbmVjZXNzYXJ5IHNpbmNlIHdlIHJlcHVycG9zZSBpdCBpbnN0ZWFkLlxuICAvLyBjb25zdCB7em9tYmllVG93bn0gPSByb20ubG9jYXRpb25zO1xuICAvLyB6b21iaWVUb3duLnNwYXducyA9IHpvbWJpZVRvd24uc3Bhd25zLmZpbHRlcih4ID0+ICF4LmlzVHJpZ2dlcigpIHx8IHguaWQgIT0gMHg4YSk7XG5cbiAgLy8gUmVwbGFjZSBhbGwgZGlhbG9nIGNvbmRpdGlvbnMgZnJvbSAwMGUgdG8gMjQzXG4gIGZvciAoY29uc3QgbnBjIG9mIHJvbS5ucGNzKSB7XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5hbGxEaWFsb2dzKCkpIHtcbiAgICAgIGlmIChkLmNvbmRpdGlvbiA9PT0gMHgwMGUpIGQuY29uZGl0aW9uID0gMHgyNDM7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IH4weDAwZSkgZC5jb25kaXRpb24gPSB+MHgyNDM7XG4gICAgfVxuICB9XG59XG5cbi8vIEhhcmQgbW9kZSBmbGFnOiBIYyAtIHplcm8gb3V0IHRoZSBzd29yZCdzIGNvbGxpc2lvbiBwbGFuZVxuZnVuY3Rpb24gZGlzYWJsZVN0YWJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbyBvZiBbMHgwOCwgMHgwOSwgMHgyN10pIHtcbiAgICByb20ub2JqZWN0c1tvXS5jb2xsaXNpb25QbGFuZSA9IDA7XG4gIH1cbiAgLy8gQWxzbyB0YWtlIHdhcnJpb3IgcmluZyBvdXQgb2YgdGhlIHBpY3R1cmUuLi4gOnRyb2xsOlxuICAvLyByb20uaXRlbUdldHNbMHgyYl0uaWQgPSAweDViOyAvLyBtZWRpY2FsIGhlcmIgZnJvbSBzZWNvbmQgZmx1dGUgb2YgbGltZSBjaGVja1xuICByb20ubnBjc1sweDU0XS5kYXRhWzBdID0gMHgyMDtcbn1cblxuZnVuY3Rpb24gb3Jic09wdGlvbmFsKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgb2JqIG9mIFsweDEwLCAweDE0LCAweDE4LCAweDFkXSkge1xuICAgIC8vIDEuIExvb3NlbiB0ZXJyYWluIHN1c2NlcHRpYmlsaXR5IG9mIGxldmVsIDEgc2hvdHNcbiAgICByb20ub2JqZWN0c1tvYmpdLnRlcnJhaW5TdXNjZXB0aWJpbGl0eSAmPSB+MHgwNDtcbiAgICAvLyAyLiBJbmNyZWFzZSB0aGUgbGV2ZWwgdG8gMlxuICAgIHJvbS5vYmplY3RzW29ial0ubGV2ZWwgPSAyO1xuICB9XG59XG4iXX0=