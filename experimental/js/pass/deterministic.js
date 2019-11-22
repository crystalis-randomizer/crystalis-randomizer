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
    l.GoaFortress_Kelbesque.spawns[0].x -= 8;
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
        l.tilePalettes = [0x1a, 0x1b, 0x6a];
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
    EastCave3.spawns.push(Spawn.from([0x18, 0x07, 0x23, 0x02]));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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QyxFQUFFLENBQUMsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBaUIvQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUUxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FB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TSxZQUFZLEdBQ2QsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdkUsTUFBTSxZQUFZLEdBQ2QsY0FBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFekUsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ25CLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsRUFDakUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ3JCLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsRUFDakUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekUsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsR0FBUSxFQUFFLEtBQWM7SUFFbEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFHaEQsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUNOLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMvQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUNaLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQzNCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUcvQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFFckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXJDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFD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SyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FDM0QsQ0FBQztJQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNkLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQzNELENBQUM7SUFDRixJQUFJLENBQUMsS0FB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QUksS0FBSyxDQUFDLDRCQUE0QixHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBUSxDQUFDO0lBQ3RELEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3JGLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUduQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUtoQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFRLENBQUM7SUFDdEQsR0FBRyxDQUFD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LE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUl2RCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRzVELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBSWxDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQy9CLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBR2xDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFJL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQVdsRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNyQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUVoRCxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUt2QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFHdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXZELEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBVTFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBR2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBS25ELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMs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QUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDbEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO0tBQ25DO0lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ2hDLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxHQUFRO0lBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUUxQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDO1FBRWhELEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztLQUM1QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQZXJmb3JtIGluaXRpYWwgY2xlYW51cC9zZXR1cCBvZiB0aGUgUk9NLlxuXG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0VudHJhbmNlLCBFeGl0LCBGbGFnLCBMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge01lc3NhZ2VJZH0gZnJvbSAnLi4vcm9tL21lc3NhZ2VpZC5qcyc7XG5pbXBvcnQge0dsb2JhbERpYWxvZywgTG9jYWxEaWFsb2d9IGZyb20gJy4uL3JvbS9ucGMuanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXh9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICcuLi91dGlsLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluaXN0aWNQcmVQYXJzZShwcmc6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgLy8gUmVtb3ZlIHVudXNlZCBpdGVtL3RyaWdnZXIgYWN0aW9uc1xuICBwcmdbMHgxZTA2Yl0gJj0gNzsgLy8gbWVkaWNhbCBoZXJiIG5vcm1hbCB1c2FnZSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDZmXSAmPSA3OyAvLyBtYWdpYyByaW5nIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3M10gJj0gNzsgLy8gZnJ1aXQgb2YgbGltZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNzddICY9IDc7IC8vIGFudGlkb3RlIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3Yl0gJj0gNzsgLy8gb3BlbCBzdGF0dWUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDg0XSAmPSA3OyAvLyB3YXJwIGJvb3RzIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA0IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA5Yl0gJj0gNzsgLy8gd2luZG1pbGwga2V5IGl0ZW11c2VbMV0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTBiOV0gJj0gNzsgLy8gZ2xvd2luZyBsYW1wIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcblxuICAvLyBOT1RFOiB0aGlzIGlzIGRvbmUgdmVyeSBlYXJseSwgbWFrZSBzdXJlIGFueSByZWZlcmVuY2VzIHRvIHdhcnBcbiAgLy8gcG9pbnQgZmxhZ3MgYXJlIHVwZGF0ZWQgdG8gcmVmbGVjdCB0aGUgbmV3IG9uZXMhXG4gIGFkZFpvbWJpZVdhcnAocm9tKTtcblxuICBhZGRNZXphbWVUcmlnZ2VyKHJvbSk7XG5cbiAgbm9ybWFsaXplU3dvcmRzKHJvbSwgZmxhZ3MpO1xuXG4gIGZpeENvaW5TcHJpdGVzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIHJldmVyc2libGVTd2FuR2F0ZShyb20pO1xuICBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbSk7XG4gIHByZXZlbnROcGNEZXNwYXducyhyb20sIGZsYWdzKTtcbiAgbGVhZkVsZGVySW5TYWJyZUhlYWxzKHJvbSk7XG4gIGlmIChmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpKSByZXF1aXJlSGVhbGVkRG9scGhpbihyb20pO1xuICBpZiAoZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSkgcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb20pO1xuXG4gIGFkanVzdEl0ZW1OYW1lcyhyb20sIGZsYWdzKTtcblxuICAvLyBUT0RPIC0gY29uc2lkZXIgbWFraW5nIGEgVHJhbnNmb3JtYXRpb24gaW50ZXJmYWNlLCB3aXRoIG9yZGVyaW5nIGNoZWNrc1xuICBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbSwgZmxhZ3MpOyAvLyBOT1RFOiBwcmUtc2h1ZmZsZVxuICBicm9rYWhhbmFXYW50c01hZG8xKHJvbSk7XG4gIGlmIChmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gICAgLy8gbm90IFNoeXJvbl9UZW1wbGUgc2luY2Ugbm8tdGh1bmRlci1zd29yZC1mb3ItbWFzc2FjcmVcbiAgICByb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycCA9IFtyb20ubG9jYXRpb25zLlNoeXJvbi5pZCwgMHg0MV07XG4gIH0gZWxzZSB7XG4gICAgbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gIH1cblxuICB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbSk7XG5cbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkpIHtcbiAgICBlYXN0Q2F2ZShyb20sIGZsYWdzKTtcbiAgICBpZiAoZmxhZ3MuY29ubmVjdEdvYVRvTGVhZigpKSB7XG4gICAgICBjb25uZWN0R29hVG9MZWFmKHJvbSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbSk7XG4gIH1cbiAgZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb20pO1xuICBjbG9zZUNhdmVFbnRyYW5jZXMocm9tLCBmbGFncyk7XG4gIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbSk7XG4gIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVSYWJiaXRTa2lwKCkpIGZpeFJhYmJpdFNraXAocm9tKTtcblxuICBmaXhSZXZlcnNlV2FsbHMocm9tKTtcbiAgaWYgKGZsYWdzLmNoYXJnZVNob3RzT25seSgpKSBkaXNhYmxlU3RhYnMocm9tKTtcbiAgaWYgKGZsYWdzLm9yYnNPcHRpb25hbCgpKSBvcmJzT3B0aW9uYWwocm9tKTtcblxuICBmaXhNaW1pY3Mocm9tKTsgLy8gTk9URTogYWZ0ZXIgYWxsIG1pbWljc1xufVxuXG4vLyBBZGRzIGEgdHJpZ2dlciBhY3Rpb24gdG8gbWV6YW1lLiAgVXNlIDg3IGxlZnRvdmVyIGZyb20gcmVzY3VpbmcgemVidS5cbmZ1bmN0aW9uIGFkZE1lemFtZVRyaWdnZXIocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW34weDJmMF07XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7YWN0aW9uOiA0fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZjBdO1xuICBjb25zdCBtZXphbWUgPSByb20ubG9jYXRpb25zLk1lemFtZVNocmluZTtcbiAgbWV6YW1lLnNwYXducy5wdXNoKFNwYXduLm9mKHt0aWxlOiAweDg4LCB0eXBlOiAyLCBpZDogdHJpZ2dlci5pZH0pKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3dvcmRzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICAvLyB3aW5kIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIHdpbmQgMiA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDZcbiAgLy8gd2luZCAzID0+IDItMyBoaXRzIDhNUCAgICAgICAgPT4gOFxuXG4gIC8vIGZpcmUgMSA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDNcbiAgLy8gZmlyZSAyID0+IDMgaGl0cyAgICAgICAgICAgICAgPT4gNVxuICAvLyBmaXJlIDMgPT4gNC02IGhpdHMgMTZNUCAgICAgICA9PiA3XG5cbiAgLy8gd2F0ZXIgMSA9PiAxIGhpdCAgICAgICAgICAgICAgPT4gM1xuICAvLyB3YXRlciAyID0+IDEtMiBoaXRzICAgICAgICAgICA9PiA2XG4gIC8vIHdhdGVyIDMgPT4gMy02IGhpdHMgMTZNUCAgICAgID0+IDhcblxuICAvLyB0aHVuZGVyIDEgPT4gMS0yIGhpdHMgc3ByZWFkICA9PiAzXG4gIC8vIHRodW5kZXIgMiA9PiAxLTMgaGl0cyBzcHJlYWQgID0+IDVcbiAgLy8gdGh1bmRlciAzID0+IDctMTAgaGl0cyA0ME1QICAgPT4gN1xuXG4gIHJvbS5vYmplY3RzWzB4MTBdLmF0ayA9IDM7IC8vIHdpbmQgMVxuICByb20ub2JqZWN0c1sweDExXS5hdGsgPSA2OyAvLyB3aW5kIDJcbiAgcm9tLm9iamVjdHNbMHgxMl0uYXRrID0gODsgLy8gd2luZCAzXG5cbiAgcm9tLm9iamVjdHNbMHgxOF0uYXRrID0gMzsgLy8gZmlyZSAxXG4gIHJvbS5vYmplY3RzWzB4MTNdLmF0ayA9IDU7IC8vIGZpcmUgMlxuICByb20ub2JqZWN0c1sweDE5XS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxN10uYXRrID0gNzsgLy8gZmlyZSAzXG4gIHJvbS5vYmplY3RzWzB4MWFdLmF0ayA9IDc7IC8vIGZpcmUgM1xuXG4gIHJvbS5vYmplY3RzWzB4MTRdLmF0ayA9IDM7IC8vIHdhdGVyIDFcbiAgcm9tLm9iamVjdHNbMHgxNV0uYXRrID0gNjsgLy8gd2F0ZXIgMlxuICByb20ub2JqZWN0c1sweDE2XS5hdGsgPSA4OyAvLyB3YXRlciAzXG5cbiAgcm9tLm9iamVjdHNbMHgxY10uYXRrID0gMzsgLy8gdGh1bmRlciAxXG4gIHJvbS5vYmplY3RzWzB4MWVdLmF0ayA9IDU7IC8vIHRodW5kZXIgMlxuICByb20ub2JqZWN0c1sweDFiXS5hdGsgPSA3OyAvLyB0aHVuZGVyIDNcbiAgcm9tLm9iamVjdHNbMHgxZl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG5cbiAgaWYgKGZsYWdzLnNsb3dEb3duVG9ybmFkbygpKSB7XG4gICAgLy8gVE9ETyAtIHRvcm5hZG8gKG9iaiAxMikgPT4gc3BlZWQgMDcgaW5zdGVhZCBvZiAwOFxuICAgIC8vICAgICAgLSBsaWZldGltZSBpcyA0ODAgPT4gNzAgbWF5YmUgdG9vIGxvbmcsIDYwIHN3ZWV0IHNwb3Q/XG4gICAgY29uc3QgdG9ybmFkbyA9IHJvbS5vYmplY3RzWzB4MTJdO1xuICAgIHRvcm5hZG8uc3BlZWQgPSAweDA3O1xuICAgIHRvcm5hZG8uZGF0YVsweDBjXSA9IDB4NjA7IC8vIGluY3JlYXNlIGxpZmV0aW1lICg0ODApIGJ5IDIwJVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpeENvaW5TcHJpdGVzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgcGFnZSBvZiBbMHg2MCwgMHg2NCwgMHg2NSwgMHg2NiwgMHg2NywgMHg2OCxcbiAgICAgICAgICAgICAgICAgICAgICAweDY5LCAweDZhLCAweDZiLCAweDZjLCAweDZkLCAweDZmXSkge1xuICAgIGZvciAoY29uc3QgcGF0IG9mIFswLCAxLCAyXSkge1xuICAgICAgcm9tLnBhdHRlcm5zW3BhZ2UgPDwgNiB8IHBhdF0ucGl4ZWxzID0gcm9tLnBhdHRlcm5zWzB4NWUgPDwgNiB8IHBhdF0ucGl4ZWxzO1xuICAgIH1cbiAgfVxuICByb20ub2JqZWN0c1sweDBjXS5tZXRhc3ByaXRlID0gMHhhOTtcbn1cblxuLyoqXG4gKiBGaXggdGhlIHNvZnRsb2NrIHRoYXQgaGFwcGVucyB3aGVuIHlvdSBnbyB0aHJvdWdoXG4gKiBhIHdhbGwgYmFja3dhcmRzIGJ5IG1vdmluZyB0aGUgZXhpdC9lbnRyYW5jZSB0aWxlc1xuICogdXAgYSBiaXQgYW5kIGFkanVzdGluZyBzb21lIHRpbGVFZmZlY3RzIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gZml4UmV2ZXJzZVdhbGxzKHJvbTogUm9tKSB7XG4gIC8vIGFkanVzdCB0aWxlIGVmZmVjdCBmb3IgYmFjayB0aWxlcyBvZiBpcm9uIHdhbGxcbiAgZm9yIChjb25zdCB0IGluIFsweDA0LCAweDA1LCAweDA4LCAweDA5XSkge1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGJjIC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gICAgcm9tLnRpbGVFZmZlY3RzWzB4YjUgLSAweGIzXS5lZmZlY3RzW3RdID0gMHgxODtcbiAgfVxuICAvLyBUT0RPIC0gbW92ZSBhbGwgdGhlIGVudHJhbmNlcyB0byB5PTIwIGFuZCBleGl0cyB0byB5dD0wMVxufVxuXG4vKiogTWFrZSBhIGxhbmQgYnJpZGdlIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgKi9cbmZ1bmN0aW9uIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tOiBSb20pIHtcbiAgY29uc3Qge3RpbGVzfSA9IHJvbS5zY3JlZW5zWzB4YTFdO1xuICB0aWxlc1sweDI4XSA9IDB4OWY7XG4gIHRpbGVzWzB4MzddID0gMHgyMztcbiAgdGlsZXNbMHgzOF0gPSAweDIzOyAvLyAweDhlO1xuICB0aWxlc1sweDM5XSA9IDB4MjE7XG4gIHRpbGVzWzB4NDddID0gMHg4ZDtcbiAgdGlsZXNbMHg0OF0gPSAweDhmO1xuICB0aWxlc1sweDU2XSA9IDB4OTk7XG4gIHRpbGVzWzB4NTddID0gMHg5YTtcbiAgdGlsZXNbMHg1OF0gPSAweDhjO1xufVxuXG4vKipcbiAqIFJlbW92ZSB0aW1lciBzcGF3bnMsIHJlbnVtYmVycyBtaW1pYyBzcGF3bnMgc28gdGhhdCB0aGV5J3JlIHVuaXF1ZS5cbiAqIFJ1bnMgYmVmb3JlIHNodWZmbGUgYmVjYXVzZSB3ZSBuZWVkIHRvIGlkZW50aWZ5IHRoZSBzbG90LiAgUmVxdWlyZXNcbiAqIGFuIGFzc2VtYmx5IGNoYW5nZSAoJDNkM2ZkIGluIHByZXNodWZmbGUucylcbiAqL1xuZnVuY3Rpb24gZml4TWltaWNzKHJvbTogUm9tKTogdm9pZCB7XG4gIGxldCBtaW1pYyA9IDB4NzA7XG4gIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IHMgb2YgbG9jLnNwYXducykge1xuICAgICAgaWYgKCFzLmlzQ2hlc3QoKSkgY29udGludWU7XG4gICAgICBzLnRpbWVkID0gZmFsc2U7XG4gICAgICBpZiAocy5pZCA+PSAweDcwKSBzLmlkID0gbWltaWMrKztcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGJ1bmRsZSBhc20gY2hhbmdlcz9cbiAgLy8gcm9tLmFzc2VtYmxlKClcbiAgLy8gICAgIC4kKCdhZGMgJDEwJylcbiAgLy8gICAgIC5iZXEoJ2xhYmVsJylcbiAgLy8gICAgIC5sc2goKVxuICAvLyAgICAgLmxzaChgJHthZGRyfSx4YClcbiAgLy8gICAgIC5sYWJlbCgnbGFiZWwnKTtcbiAgLy8gcm9tLnBhdGNoKClcbiAgLy8gICAgIC5vcmcoMHgzZDNmZClcbiAgLy8gICAgIC5ieXRlKDB4YjApO1xufVxuXG5mdW5jdGlvbiBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGwgPSByb20ubG9jYXRpb25zO1xuICAvLyBNb3ZlIEtlbGJlc3F1ZSAyIG9uZSB0aWxlIGxlZnQuXG4gIGwuR29hRm9ydHJlc3NfS2VsYmVzcXVlLnNwYXduc1swXS54IC09IDg7XG4gIC8vIFJlbW92ZSBzYWdlIHNjcmVlbiBsb2NrcyAoZXhjZXB0IEtlbnN1KS5cbiAgbC5Hb2FGb3J0cmVzc19aZWJ1LnNwYXducy5zcGxpY2UoMSwgMSk7IC8vIHplYnUgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX1Rvcm5lbC5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyB0b3JuZWwgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX0FzaW5hLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIGFzaW5hIHNjcmVlbiBsb2NrIHRyaWdnZXJcbn1cblxuZnVuY3Rpb24gYWxhcm1GbHV0ZUlzS2V5SXRlbShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgY29uc3Qge1dhdGVyZmFsbENhdmU0fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgLy8gTW92ZSBhbGFybSBmbHV0ZSB0byB0aGlyZCByb3dcbiAgcm9tLml0ZW1HZXRzWzB4MzFdLmludmVudG9yeVJvd1N0YXJ0ID0gMHgyMDtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBkcm9wcGVkXG4gIC8vIHJvbS5wcmdbMHgyMTAyMV0gPSAweDQzOyAvLyBUT0RPIC0gcm9tLml0ZW1zWzB4MzFdLj8/P1xuICByb20uaXRlbXNbMHgzMV0udW5pcXVlID0gdHJ1ZTtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBzb2xkXG4gIHJvbS5pdGVtc1sweDMxXS5iYXNlUHJpY2UgPSAwO1xuXG4gIGlmIChmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gUGVyc29uIDE0IChaZWJ1J3Mgc3R1ZGVudCk6IHNlY29uZGFyeSBpdGVtIC0+IGFsYXJtIGZsdXRlXG4gICAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4MzE7IC8vIE5PVEU6IENsb2JiZXJzIHNodWZmbGVkIGl0ZW0hISFcbiAgfVxuXG4gIC8vIFJlbW92ZSBhbGFybSBmbHV0ZSBmcm9tIHNob3BzIChyZXBsYWNlIHdpdGggb3RoZXIgaXRlbXMpXG4gIC8vIE5PVEUgLSB3ZSBjb3VsZCBzaW1wbGlmeSB0aGlzIHdob2xlIHRoaW5nIGJ5IGp1c3QgaGFyZGNvZGluZyBpbmRpY2VzLlxuICAvLyAgICAgIC0gaWYgdGhpcyBpcyBndWFyYW50ZWVkIHRvIGhhcHBlbiBlYXJseSwgaXQncyBhbGwgdGhlIHNhbWUuXG4gIGNvbnN0IHJlcGxhY2VtZW50cyA9IFtcbiAgICBbMHgyMSwgMC43Ml0sIC8vIGZydWl0IG9mIHBvd2VyLCA3MiUgb2YgY29zdFxuICAgIFsweDFmLCAwLjldLCAvLyBseXNpcyBwbGFudCwgOTAlIG9mIGNvc3RcbiAgXTtcbiAgbGV0IGogPSAwO1xuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AuY29udGVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldICE9PSAweDMxKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtpdGVtLCBwcmljZVJhdGlvXSA9IHJlcGxhY2VtZW50c1soaisrKSAlIHJlcGxhY2VtZW50cy5sZW5ndGhdO1xuICAgICAgc2hvcC5jb250ZW50c1tpXSA9IGl0ZW07XG4gICAgICBpZiAocm9tLnNob3BEYXRhVGFibGVzQWRkcmVzcykge1xuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIGJyb2tlbiAtIG5lZWQgYSBjb250cm9sbGVkIHdheSB0byBjb252ZXJ0IHByaWNlIGZvcm1hdHNcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSBNYXRoLnJvdW5kKHNob3AucHJpY2VzW2ldICogcHJpY2VSYXRpbyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hhbmdlIGZsdXRlIG9mIGxpbWUgY2hlc3QncyAobm93LXVudXNlZCkgaXRlbWdldCB0byBoYXZlIG1lZGljYWwgaGVyYlxuICByb20uaXRlbUdldHNbMHg1Yl0uaXRlbUlkID0gMHgxZDtcbiAgLy8gQ2hhbmdlIHRoZSBhY3R1YWwgc3Bhd24gZm9yIHRoYXQgY2hlc3QgdG8gYmUgdGhlIG1pcnJvcmVkIHNoaWVsZCBjaGVzdFxuICBXYXRlcmZhbGxDYXZlNC5zcGF3bigweDE5KS5pZCA9IDB4MTA7XG5cbiAgLy8gVE9ETyAtIHJlcXVpcmUgbmV3IGNvZGUgZm9yIHR3byB1c2VzXG59XG5cbmZ1bmN0aW9uIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgYnJva2FoYW5hID0gcm9tLm5wY3NbMHg1NF07XG4gIGNvbnN0IGRpYWxvZyA9IGFzc2VydChicm9rYWhhbmEubG9jYWxEaWFsb2dzLmdldCgtMSkpWzBdO1xuICBpZiAoZGlhbG9nLmNvbmRpdGlvbiAhPT0gfjB4MDI0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgYnJva2FoYW5hIGNvbmRpdGlvbjogJHtkaWFsb2cuY29uZGl0aW9ufWApO1xuICB9XG4gIGRpYWxvZy5jb25kaXRpb24gPSB+MHgwNjc7IC8vIHZhbmlsbGEgYmFsbCBvZiB0aHVuZGVyIC8gZGVmZWF0ZWQgbWFkbyAxXG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vcm1hbGx5IHRoZSBmaXNoZXJtYW4gKCQ2NCkgc3Bhd25zIGluIGhpcyBob3VzZSAoJGQ2KSBpZiB5b3UgaGF2ZVxuICAvLyB0aGUgc2hlbGwgZmx1dGUgKDIzNikuICBIZXJlIHdlIGFsc28gYWRkIGEgcmVxdWlyZW1lbnQgb24gdGhlIGhlYWxlZFxuICAvLyBkb2xwaGluIHNsb3QgKDAyNSksIHdoaWNoIHdlIGtlZXAgYXJvdW5kIHNpbmNlIGl0J3MgYWN0dWFsbHkgdXNlZnVsLlxuICByb20ubnBjc1sweDY0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZDYsIFsweDIzNiwgMHgwMjVdKTtcbiAgLy8gQWxzbyBmaXggZGF1Z2h0ZXIncyBkaWFsb2cgKCQ3YikuXG4gIGNvbnN0IGRhdWdodGVyRGlhbG9nID0gcm9tLm5wY3NbMHg3Yl0ubG9jYWxEaWFsb2dzLmdldCgtMSkhO1xuICBkYXVnaHRlckRpYWxvZy51bnNoaWZ0KGRhdWdodGVyRGlhbG9nWzBdLmNsb25lKCkpO1xuICBkYXVnaHRlckRpYWxvZ1swXS5jb25kaXRpb24gPSB+MHgwMjU7XG4gIGRhdWdodGVyRGlhbG9nWzFdLmNvbmRpdGlvbiA9IH4weDIzNjtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3QgaGF2aW5nIHRlbGVwYXRoeSAoMjQzKSB3aWxsIHRyaWdnZXIgYSBcImt5dSBreXVcIiAoMWE6MTIsIDFhOjEzKSBmb3JcbiAgLy8gYm90aCBnZW5lcmljIGJ1bm5pZXMgKDU5KSBhbmQgZGVvICg1YSkuXG4gIHJvbS5ucGNzWzB4NTldLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxMl0pKTtcbiAgcm9tLm5wY3NbMHg1YV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEzXSkpO1xufVxuXG5mdW5jdGlvbiB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIGl0ZW1nZXQgMDMgc3dvcmQgb2YgdGh1bmRlciA9PiBzZXQgMmZkIHNoeXJvbiB3YXJwIHBvaW50XG4gIHJvbS5pdGVtR2V0c1sweDAzXS5mbGFncy5wdXNoKDB4MmZkKTtcbiAgLy8gZGlhbG9nIDYyIGFzaW5hIGluIGYyL2Y0IHNoeXJvbiAtPiBhY3Rpb24gMWYgKHRlbGVwb3J0IHRvIHN0YXJ0KVxuICAvLyAgIC0gbm90ZTogZjIgYW5kIGY0IGRpYWxvZ3MgYXJlIGxpbmtlZC5cbiAgZm9yIChjb25zdCBpIG9mIFswLCAxLCAzXSkge1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFsweGYyLCAweGY0XSkge1xuICAgICAgcm9tLm5wY3NbMHg2Ml0ubG9jYWxEaWFsb2dzLmdldChsb2MpIVtpXS5tZXNzYWdlLmFjdGlvbiA9IDB4MWY7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBDaGFuZ2Ugc3dvcmQgb2YgdGh1bmRlcidzIGFjdGlvbiB0byBiYmUgdGhlIHNhbWUgYXMgb3RoZXIgc3dvcmRzICgxNilcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmFjcXVpc2l0aW9uQWN0aW9uLmFjdGlvbiA9IDB4MTY7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEl0ZW1OYW1lcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgaWYgKGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgLy8gcmVuYW1lIGxlYXRoZXIgYm9vdHMgdG8gc3BlZWQgYm9vdHNcbiAgICBjb25zdCBsZWF0aGVyQm9vdHMgPSByb20uaXRlbXNbMHgyZl0hO1xuICAgIGxlYXRoZXJCb290cy5tZW51TmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgbGVhdGhlckJvb3RzLm1lc3NhZ2VOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBpZiAoZmxhZ3MuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpKSB7XG4gICAgICBjb25zdCBnYXNNYXNrID0gcm9tLml0ZW1zWzB4MjldO1xuICAgICAgZ2FzTWFzay5tZW51TmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgICBnYXNNYXNrLm1lc3NhZ2VOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICB9XG4gIH1cblxuICAvLyByZW5hbWUgYmFsbHMgdG8gb3Jic1xuICBmb3IgKGxldCBpID0gMHgwNTsgaSA8IDB4MGM7IGkgKz0gMikge1xuICAgIHJvbS5pdGVtc1tpXS5tZW51TmFtZSA9IHJvbS5pdGVtc1tpXS5tZW51TmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICAgIHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZSA9IHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VCcmFjZWxldHNQcm9ncmVzc2l2ZShyb206IFJvbSk6IHZvaWQge1xuICAvLyB0b3JuZWwncyB0cmlnZ2VyIG5lZWRzIGJvdGggaXRlbXNcbiAgY29uc3QgdG9ybmVsID0gcm9tLm5wY3NbMHg1Zl07XG4gIGNvbnN0IHZhbmlsbGEgPSB0b3JuZWwubG9jYWxEaWFsb2dzLmdldCgweDIxKSE7XG4gIGNvbnN0IHBhdGNoZWQgPSBbXG4gICAgdmFuaWxsYVswXSwgLy8gYWxyZWFkeSBsZWFybmVkIHRlbGVwb3J0XG4gICAgdmFuaWxsYVsyXSwgLy8gZG9uJ3QgaGF2ZSB0b3JuYWRvIGJyYWNlbGV0XG4gICAgdmFuaWxsYVsyXS5jbG9uZSgpLCAvLyB3aWxsIGNoYW5nZSB0byBkb24ndCBoYXZlIG9yYlxuICAgIHZhbmlsbGFbMV0sIC8vIGhhdmUgYnJhY2VsZXQsIGxlYXJuIHRlbGVwb3J0XG4gIF07XG4gIHBhdGNoZWRbMV0uY29uZGl0aW9uID0gfjB4MjA2OyAvLyBkb24ndCBoYXZlIGJyYWNlbGV0XG4gIHBhdGNoZWRbMl0uY29uZGl0aW9uID0gfjB4MjA1OyAvLyBkb24ndCBoYXZlIG9yYlxuICBwYXRjaGVkWzNdLmNvbmRpdGlvbiA9IH4wOyAgICAgLy8gZGVmYXVsdFxuICB0b3JuZWwubG9jYWxEaWFsb2dzLnNldCgweDIxLCBwYXRjaGVkKTtcbn1cblxuZnVuY3Rpb24gc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBbcm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLktpcmlzYU1lYWRvd10pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gc2V0IHRoZSBuZXcgXCJpbnZpc2libGVcIiBmbGFnIG9uIHRoZSBjaGVzdC5cbiAgICAgIGlmIChzcGF3bi5pc0NoZXN0KCkpIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICB9XG4gIH1cbn1cblxuLy8gQWRkIHRoZSBzdGF0dWUgb2Ygb255eCBhbmQgcG9zc2libHkgdGhlIHRlbGVwb3J0IGJsb2NrIHRyaWdnZXIgdG8gQ29yZGVsIFdlc3RcbmZ1bmN0aW9uIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgY29uc3Qge0NvcmRlbFBsYWluRWFzdCwgQ29yZGVsUGxhaW5XZXN0fSA9IHJvbS5sb2NhdGlvbnM7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2YgQ29yZGVsUGxhaW5FYXN0LnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc0NoZXN0KCkgfHwgKGZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJiBzcGF3bi5pc1RyaWdnZXIoKSkpIHtcbiAgICAgIC8vIENvcHkgaWYgKDEpIGl0J3MgdGhlIGNoZXN0LCBvciAoMikgd2UncmUgZGlzYWJsaW5nIHRlbGVwb3J0IHNraXBcbiAgICAgIENvcmRlbFBsYWluV2VzdC5zcGF3bnMucHVzaChzcGF3bi5jbG9uZSgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZml4UmFiYml0U2tpcChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX01haW4uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDg2KSB7XG4gICAgICBpZiAoc3Bhd24ueCA9PT0gMHg3NDApIHtcbiAgICAgICAgc3Bhd24ueCArPSAxNjtcbiAgICAgICAgc3Bhd24ueSArPSAxNjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkVG93ZXJFeGl0KHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtUb3dlckVudHJhbmNlLCBDcnlwdF9UZWxlcG9ydGVyfSA9IHJvbS5sb2NhdGlvbnM7XG4gIGNvbnN0IGVudHJhbmNlID0gQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMubGVuZ3RoO1xuICBjb25zdCBkZXN0ID0gQ3J5cHRfVGVsZXBvcnRlci5pZDtcbiAgQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7dGlsZTogMHg2OH0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTcsIGRlc3QsIGVudHJhbmNlfSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1OCwgZGVzdCwgZW50cmFuY2V9KSk7XG59XG5cbi8vIFByb2dyYW1tYXRpY2FsbHkgYWRkIGEgaG9sZSBiZXR3ZWVuIHZhbGxleSBvZiB3aW5kIGFuZCBsaW1lIHRyZWUgdmFsbGV5XG5mdW5jdGlvbiBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXl9ID0gcm9tLmxvY2F0aW9ucztcblxuICBWYWxsZXlPZldpbmQuc2NyZWVuc1s1XVs0XSA9IDB4MTA7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMV1bMF0gPSAweDFhOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzJdWzBdID0gMHgwYzsgLy8gbmljZXIgbW91bnRhaW5zXG5cbiAgY29uc3Qgd2luZEVudHJhbmNlID1cbiAgICAgIFZhbGxleU9mV2luZC5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHg0ZWYsIHk6IDB4NTc4fSkpIC0gMTtcbiAgY29uc3QgbGltZUVudHJhbmNlID1cbiAgICAgIExpbWVUcmVlVmFsbGV5LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDAxMCwgeTogMHgxYzB9KSkgLSAxO1xuXG4gIFZhbGxleU9mV2luZC5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTYwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NzAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSk7XG4gIExpbWVUcmVlVmFsbGV5LmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYjAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFjMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pKTtcbn1cblxuZnVuY3Rpb24gY2xvc2VDYXZlRW50cmFuY2VzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBQcmV2ZW50IHNvZnRsb2NrIGZyb20gZXhpdGluZyBzZWFsZWQgY2F2ZSBiZWZvcmUgd2luZG1pbGwgc3RhcnRlZFxuICByb20ubG9jYXRpb25zLlZhbGxleU9mV2luZC5lbnRyYW5jZXNbMV0ueSArPSAxNjtcblxuICAvLyBDbGVhciB0aWxlcyAxLDIsMyw0IGZvciBibG9ja2FibGUgY2F2ZXMgaW4gdGlsZXNldHMgOTAsIDk0LCBhbmQgOWNcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTBdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwNywgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDBlLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjAsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5NCwgMHg5Y10sXG4gICAgICAgICAgICAgICAgICAgIFsweDY4LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODMsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDg5LCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG5cbiAgLy8gTm93IHJlcGxhY2UgdGhlIHRpbGVzIHdpdGggdGhlIGJsb2NrYWJsZSBvbmVzXG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDc5XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4N2FdID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4OV0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDhhXSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NThdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTZdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1N10gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY2XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjddID0gMHgwNDtcblxuICAvLyBEZXN0cnVjdHVyZSBvdXQgYSBmZXcgbG9jYXRpb25zIGJ5IG5hbWVcbiAgY29uc3Qge1xuICAgIENvcmRlbFBsYWluV2VzdCxcbiAgICBDb3JkZWxQbGFpbkVhc3QsXG4gICAgRGVzZXJ0MixcbiAgICBHb2FWYWxsZXksXG4gICAgTGltZVRyZWVWYWxsZXksXG4gICAgS2lyaXNhTWVhZG93LFxuICAgIFNhaGFyYU91dHNpZGVDYXZlLFxuICAgIFZhbGxleU9mV2luZCxcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aCxcbiAgICBXYXRlcmZhbGxWYWxsZXlTb3V0aCxcbiAgfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgLy8gTk9URTogZmxhZyAyZjAgaXMgQUxXQVlTIHNldCAtIHVzZSBpdCBhcyBhIGJhc2VsaW5lLlxuICBjb25zdCBmbGFnc1RvQ2xlYXI6IFtMb2NhdGlvbiwgbnVtYmVyXVtdID0gW1xuICAgIFtWYWxsZXlPZldpbmQsIDB4MzBdLCAvLyB2YWxsZXkgb2Ygd2luZCwgemVidSdzIGNhdmVcbiAgICBbQ29yZGVsUGxhaW5XZXN0LCAweDMwXSwgLy8gY29yZGVsIHdlc3QsIHZhbXBpcmUgY2F2ZVxuICAgIFtDb3JkZWxQbGFpbkVhc3QsIDB4MzBdLCAvLyBjb3JkZWwgZWFzdCwgdmFtcGlyZSBjYXZlXG4gICAgW1dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDAwXSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBwcmlzb24gY2F2ZVxuICAgIFtXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgxNF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgZm9nIGxhbXBcbiAgICBbV2F0ZXJmYWxsVmFsbGV5U291dGgsIDB4NzRdLCAvLyB3YXRlcmZhbGwgc291dGgsIGtpcmlzYVxuICAgIFtLaXJpc2FNZWFkb3csIDB4MTBdLCAvLyBraXJpc2EgbWVhZG93XG4gICAgW1NhaGFyYU91dHNpZGVDYXZlLCAweDAwXSwgLy8gY2F2ZSB0byBkZXNlcnRcbiAgICBbRGVzZXJ0MiwgMHg0MV0sXG4gIF07XG4gIGlmIChmbGFncy5hZGRFYXN0Q2F2ZSgpICYmIGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgZmxhZ3NUb0NsZWFyLnB1c2goW0xpbWVUcmVlVmFsbGV5LCAweDEwXSk7XG4gIH1cbiAgaWYgKGZsYWdzLmNvbm5lY3RHb2FUb0xlYWYoKSkge1xuICAgIGZsYWdzVG9DbGVhci5wdXNoKFtHb2FWYWxsZXksIDB4MDFdKTtcbiAgfVxuICBmb3IgKGNvbnN0IFtsb2MsIHl4XSBvZiBmbGFnc1RvQ2xlYXIpIHtcbiAgICBsb2MuZmxhZ3MucHVzaChGbGFnLm9mKHt5eCwgZmxhZzogMHgyZjB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlRmxhZyhsb2M6IExvY2F0aW9uLCB5eDogbnVtYmVyLCBmbGFnOiBudW1iZXIpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICBpZiAoZi55eCA9PT0geXgpIHtcbiAgICAgICAgZi5mbGFnID0gZmxhZztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGZsYWcgdG8gcmVwbGFjZSBhdCAke2xvY306JHt5eH1gKTtcbiAgfTtcblxuICBpZiAoZmxhZ3MucGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKSkgeyAvLyBjbG9zZSBvZmYgcmV2ZXJzZSBlbnRyYW5jZXNcbiAgICAvLyBOT1RFOiB3ZSBjb3VsZCBhbHNvIGNsb3NlIGl0IG9mZiB1bnRpbCBib3NzIGtpbGxlZC4uLj9cbiAgICAvLyAgLSBjb25zdCB2YW1waXJlRmxhZyA9IH5yb20ubnBjU3Bhd25zWzB4YzBdLmNvbmRpdGlvbnNbMHgwYV1bMF07XG4gICAgLy8gIC0+IGtlbGJlc3F1ZSBmb3IgdGhlIG90aGVyIG9uZS5cbiAgICBjb25zdCB3aW5kbWlsbEZsYWcgPSAweDJlZTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbldlc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG4gICAgcmVwbGFjZUZsYWcoQ29yZGVsUGxhaW5FYXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuXG4gICAgcmVwbGFjZUZsYWcoV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDAsIDB4MmQ4KTsgLy8ga2V5IHRvIHByaXNvbiBmbGFnXG4gICAgY29uc3QgZXhwbG9zaW9uID0gU3Bhd24ub2Yoe3k6IDB4MDYwLCB4OiAweDA2MCwgdHlwZTogNCwgaWQ6IDB4MmN9KTtcbiAgICBjb25zdCBrZXlUcmlnZ2VyID0gU3Bhd24ub2Yoe3k6IDB4MDcwLCB4OiAweDA3MCwgdHlwZTogMiwgaWQ6IDB4YWR9KTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMuc3BsaWNlKDEsIDAsIGV4cGxvc2lvbik7XG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLnB1c2goa2V5VHJpZ2dlcik7XG4gIH1cblxuICAvLyByb20ubG9jYXRpb25zWzB4MTRdLnRpbGVFZmZlY3RzID0gMHhiMztcblxuICAvLyBkNyBmb3IgMz9cblxuICAvLyBUT0RPIC0gdGhpcyBlbmRlZCB1cCB3aXRoIG1lc3NhZ2UgMDA6MDMgYW5kIGFuIGFjdGlvbiB0aGF0IGdhdmUgYm93IG9mIG1vb24hXG5cbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UucGFydCA9IDB4MWI7XG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5tZXNzYWdlLmluZGV4ID0gMHgwODtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLmZsYWdzLnB1c2goMHgyZjYsIDB4MmY3LCAweDJmOCk7XG59XG5cbi8vIEB0cy1pZ25vcmU6IG5vdCB5ZXQgdXNlZFxuZnVuY3Rpb24gZWFzdENhdmUocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIC8vIFRPRE8gZmlsbCB1cCBncmFwaGljcywgZXRjIC0tPiAkMWEsICQxYiwgJDA1IC8gJDg4LCAkYjUgLyAkMTQsICQwMlxuICAvLyBUaGluayBhb2J1dCBleGl0cyBhbmQgZW50cmFuY2VzLi4uP1xuXG4gIGNvbnN0IHtWYWxsZXlPZldpbmQsIExpbWVUcmVlVmFsbGV5LCBTZWFsZWRDYXZlMX0gPSByb20ubG9jYXRpb25zO1xuXG4gIGNvbnN0IGxvYzEgPSByb20ubG9jYXRpb25zLmFsbG9jYXRlKHJvbS5sb2NhdGlvbnMuRWFzdENhdmUxKTtcbiAgY29uc3QgbG9jMiA9IHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUocm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTIpO1xuICBjb25zdCBsb2MzID0gcm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTM7XG5cbiAgLy8gTk9URTogMHg5YyBjYW4gYmVjb21lIDB4OTkgaW4gdG9wIGxlZnQgb3IgMHg5NyBpbiB0b3AgcmlnaHQgb3IgYm90dG9tIG1pZGRsZSBmb3IgYSBjYXZlIGV4aXRcbiAgbG9jMS5zY3JlZW5zID0gW1sweDljLCAweDg0LCAweDgwLCAweDgzLCAweDljXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgzLCAweDg2LCAweDgwXSxcbiAgICAgICAgICAgICAgICAgIFsweDgzLCAweDg4LCAweDg5LCAweDgwLCAweDgwXSxcbiAgICAgICAgICAgICAgICAgIFsweDgxLCAweDhjLCAweDg1LCAweDgyLCAweDg0XSxcbiAgICAgICAgICAgICAgICAgIFsweDllLCAweDg1LCAweDljLCAweDk4LCAweDg2XV07XG5cbiAgbG9jMi5zY3JlZW5zID0gW1sweDljLCAweDg0LCAweDliLCAweDgwLCAweDliXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgxLCAweDgwLCAweDgxXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDg3LCAweDhiLCAweDhhLCAweDg2XSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDhjLCAweDgwLCAweDg1LCAweDg0XSxcbiAgICAgICAgICAgICAgICAgIFsweDljLCAweDg2LCAweDgwLCAweDgwLCAweDlhXV07XG5cbiAgZm9yIChjb25zdCBsIG9mIFtsb2MxLCBsb2MyLCBsb2MzXSkge1xuICAgIGwuYmdtID0gMHgxNzsgLy8gbXQgc2FicmUgY2F2ZSBtdXNpYz9cbiAgICBsLmVudHJhbmNlcyA9IFtdO1xuICAgIGwuZXhpdHMgPSBbXTtcbiAgICBsLnBpdHMgPSBbXTtcbiAgICBsLnNwYXducyA9IFtdO1xuICAgIGwuZmxhZ3MgPSBbXTtcbiAgICBsLmhlaWdodCA9IGwuc2NyZWVucy5sZW5ndGg7XG4gICAgbC53aWR0aCA9IGwuc2NyZWVuc1swXS5sZW5ndGg7XG4gICAgbC5leHRlbmRlZCA9IDA7XG4gICAgbC50aWxlUGFsZXR0ZXMgPSBbMHgxYSwgMHgxYiwgMHg2YV07IC8vIGVtYmVyIHdhbGwgYnkgZGVmYXVsdFxuICAgIGwudGlsZXNldCA9IDB4ODg7XG4gICAgbC50aWxlRWZmZWN0cyA9IDB4YjU7XG4gICAgbC50aWxlUGF0dGVybnMgPSBbMHgxNCwgMHgwMl07XG4gICAgbC5zcHJpdGVQYXR0ZXJucyA9IFsuLi5TZWFsZWRDYXZlMS5zcHJpdGVQYXR0ZXJuc10gYXMgW251bWJlciwgbnVtYmVyXTtcbiAgICBsLnNwcml0ZVBhbGV0dGVzID0gWy4uLlNlYWxlZENhdmUxLnNwcml0ZVBhbGV0dGVzXSBhcyBbbnVtYmVyLCBudW1iZXJdO1xuICB9XG5cbiAgLy8gQWRkIGVudHJhbmNlIHRvIHZhbGxleSBvZiB3aW5kXG4gIC8vIFRPRE8gLSBtYXliZSBqdXN0IGRvICgweDMzLCBbWzB4MTldXSkgb25jZSB3ZSBmaXggdGhhdCBzY3JlZW4gZm9yIGdyYXNzXG4gIFZhbGxleU9mV2luZC53cml0ZVNjcmVlbnMyZCgweDIzLCBbXG4gICAgWzB4MTEsIDB4MGRdLFxuICAgIFsweDA5LCAweGMyXV0pO1xuICByb20udGlsZUVmZmVjdHNbMF0uZWZmZWN0c1sweGMwXSA9IDA7XG4gIC8vIFRPRE8gLSBkbyB0aGlzIG9uY2Ugd2UgZml4IHRoZSBzZWEgdGlsZXNldFxuICAvLyByb20uc2NyZWVuc1sweGMyXS50aWxlc1sweDVhXSA9IDB4MGE7XG4gIC8vIHJvbS5zY3JlZW5zWzB4YzJdLnRpbGVzWzB4NWJdID0gMHgwYTtcblxuICAvLyBDb25uZWN0IG1hcHNcbiAgbG9jMS5jb25uZWN0KDB4NDMsIGxvYzIsIDB4NDQpO1xuICBsb2MxLmNvbm5lY3QoMHg0MCwgVmFsbGV5T2ZXaW5kLCAweDM0KTtcblxuICBpZiAoZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICAvLyBBZGQgZW50cmFuY2UgdG8gbGltZSB0cmVlIHZhbGxleVxuICAgIExpbWVUcmVlVmFsbGV5LnJlc2l6ZVNjcmVlbnMoMCwgMSwgMCwgMCk7IC8vIGFkZCBvbmUgc2NyZWVuIHRvIGxlZnQgZWRnZVxuICAgIExpbWVUcmVlVmFsbGV5LndyaXRlU2NyZWVuczJkKDB4MDAsIFtcbiAgICAgIFsweDBjLCAweDExXSxcbiAgICAgIFsweDE1LCAweDM2XSxcbiAgICAgIFsweDBlLCAweDBmXV0pO1xuICAgIGxvYzEuc2NyZWVuc1swXVs0XSA9IDB4OTc7IC8vIGRvd24gc3RhaXJcbiAgICBsb2MxLmNvbm5lY3QoMHgwNCwgTGltZVRyZWVWYWxsZXksIDB4MTApO1xuICB9XG5cbiAgLy8gQWRkIG1vbnN0ZXJzXG4gIGxvYzEuc3Bhd25zLnB1c2goXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgyMSwgdGlsZTogMHg4NywgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEyLCB0aWxlOiAweDg4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEzLCB0aWxlOiAweDg5LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzIsIHRpbGU6IDB4NjgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4NDEsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMywgdGlsZTogMHg5OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDAzLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICApO1xuICBsb2MyLnNwYXducy5wdXNoKFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MDEsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMSwgdGlsZTogMHg0OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMiwgdGlsZTogMHg3NywgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDE0LCB0aWxlOiAweDI4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDIzLCB0aWxlOiAweDg1LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzEsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMywgdGlsZTogMHg4YSwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzNCwgdGlsZTogMHg5OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDQxLCB0aWxlOiAweDgyLCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICApO1xuICBpZiAoIWZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkpIHtcbiAgICAvLyBjaGVzdDogYWxhcm0gZmx1dGVcbiAgICBsb2MyLnNwYXducy5wdXNoKFNwYXduLm9mKHt5OiAweDExMCwgeDogMHg0NzgsIHR5cGU6IDIsIGlkOiAweDMxfSkpO1xuICB9XG4gIGlmIChmbGFncy5hZGRFeHRyYUNoZWNrc1RvRWFzdENhdmUoKSkge1xuICAgIC8vIGNoZXN0OiBtZWRpY2FsIGhlcmJcbiAgICBsb2MyLnNwYXducy5wdXNoKFNwYXduLm9mKHt5OiAweDExMCwgeDogMHg0NzgsIHR5cGU6IDIsIGlkOiAweDU5fSkpO1xuICAgIC8vIGNoZXN0OiBtaW1pY1xuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MDcwLCB4OiAweDEwOCwgdHlwZTogMiwgaWQ6IDB4NzB9KSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNvbm5lY3RHb2FUb0xlYWYocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge0dvYVZhbGxleSwgRWFzdENhdmUyLCBFYXN0Q2F2ZTN9ID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gQWRkIGEgbmV3IGNhdmUgdG8gdGhlIHRvcC1sZWZ0IGNvcm5lciBvZiBHb2EgVmFsbGV5LlxuICBHb2FWYWxsZXkud3JpdGVTY3JlZW5zMmQoMHgwMCwgW1xuICAgICAgWzB4MGMsIDB4YzEsIDB4MGRdLFxuICAgICAgWzB4MGUsIDB4MzcsIDB4MzVdXSk7XG4gIC8vIEFkZCBhbiBleHRyYSBkb3duLXN0YWlyIHRvIEVhc3RDYXZlMiBhbmQgYSBuZXcgMy1zY3JlZW4gRWFzdENhdmUzIG1hcC5cblxuICByb20ubG9jYXRpb25zLmFsbG9jYXRlKEVhc3RDYXZlMyk7XG4gIEVhc3RDYXZlMy5zY3JlZW5zID0gW1sweDlhXSxcbiAgICAgICAgICAgICAgICAgICAgICAgWzB4OGZdLFxuICAgICAgICAgICAgICAgICAgICAgICBbMHg5ZV1dO1xuICBFYXN0Q2F2ZTMuaGVpZ2h0ID0gMztcbiAgRWFzdENhdmUzLndpZHRoID0gMTtcblxuICBFYXN0Q2F2ZTMuc3Bhd25zLnB1c2goU3Bhd24uZnJvbShbMHgxOCwgMHgwNywgMHgyMywgMHgwMl0pKTtcbiAgRWFzdENhdmUzLmZsYWdzLnB1c2goRmxhZy5vZih7c2NyZWVuOiAweDEwLCBmbGFnOiByb20uZmxhZ3MuYWxsb2MoMHgyMDApfSkpO1xuXG4gIC8vIE1ha2UgdGhlIGNvbm5lY3Rpb25zLlxuICBFYXN0Q2F2ZTIuc2NyZWVuc1s0XVswXSA9IDB4OTk7XG4gIEVhc3RDYXZlMi5jb25uZWN0KDB4NDAsIEVhc3RDYXZlMywgfjB4MDApO1xuICBFYXN0Q2F2ZTMuY29ubmVjdCgweDIwLCBHb2FWYWxsZXksIDB4MDEpO1xufVxuXG5mdW5jdGlvbiBhZGRab21iaWVXYXJwKHJvbTogUm9tKSB7XG4gIC8vIE1ha2Ugc3BhY2UgZm9yIHRoZSBuZXcgZmxhZyBiZXR3ZWVuIEpvZWwgYW5kIFN3YW5cbiAgZm9yIChsZXQgaSA9IDB4MmY1OyBpIDwgMHgyZmM7IGkrKykge1xuICAgIHJvbS5tb3ZlRmxhZyhpLCBpIC0gMSk7XG4gIH1cbiAgLy8gVXBkYXRlIHRoZSBtZW51XG4gIGNvbnN0IG1lc3NhZ2UgPSByb20ubWVzc2FnZXMucGFydHNbMHgyMV1bMF07XG4gIG1lc3NhZ2UudGV4dCA9IFtcbiAgICAnIHsxYTpMZWFmfSAgICAgIHsxNjpCcnlubWFlcn0gezFkOk9ha30gJyxcbiAgICAnezBjOk5hZGFyZX1cXCdzICB7MWU6UG9ydG9hfSAgIHsxNDpBbWF6b25lc30gJyxcbiAgICAnezE5OkpvZWx9ICAgICAgWm9tYmllICAgezIwOlN3YW59ICcsXG4gICAgJ3syMzpTaHlyb259ICAgIHsxODpHb2F9ICAgICAgezIxOlNhaGFyYX0nLFxuICBdLmpvaW4oJ1xcbicpO1xuICAvLyBBZGQgYSB0cmlnZ2VyIHRvIHRoZSBlbnRyYW5jZSAtIHRoZXJlJ3MgYWxyZWFkeSBhIHNwYXduIGZvciA4YVxuICAvLyBidXQgd2UgY2FuJ3QgcmV1c2UgdGhhdCBzaW5jZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBvbmUgb3V0c2lkZVxuICAvLyB0aGUgbWFpbiBFU0kgZW50cmFuY2U7IHNvIHJldXNlIGEgZGlmZmVyZW50IG9uZS5cbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW107XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZmJdOyAvLyBuZXcgd2FycCBwb2ludCBmbGFnXG4gIC8vIEFjdHVhbGx5IHJlcGxhY2UgdGhlIHRyaWdnZXIuXG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4YSkge1xuICAgICAgc3Bhd24uaWQgPSB0cmlnZ2VyLmlkO1xuICAgIH1cbiAgfVxuICByb20udG93bldhcnAubG9jYXRpb25zLnNwbGljZSg3LCAwLCByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uaWQpO1xuICBpZiAocm9tLnRvd25XYXJwLmxvY2F0aW9ucy5wb3AoKSAhPT0gMHhmZikgdGhyb3cgbmV3IEVycm9yKCd1bmV4cGVjdGVkJyk7XG4gIC8vIEFTTSBmaXhlcyBzaG91bGQgaGF2ZSBoYXBwZW5lZCBpbiBwcmVzaHVmZmxlLnNcbn1cblxuZnVuY3Rpb24gZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb206IFJvbSkge1xuICByb20udHJpZ2dlcigweDhhKS5jb25kaXRpb25zID0gW34weDBlZV07IC8vIG5ldyBmbGFnIGZvciByaWRpbmcgZG9scGhpblxuICByb20ubWVzc2FnZXMucGFydHNbMHgxZF1bMHgxMF0udGV4dCA9IGBUaGUgY2F2ZSBlbnRyYW5jZSBhcHBlYXJzXG50byBiZSB1bmRlcndhdGVyLiBZb3UnbGxcbm5lZWQgdG8gc3dpbS5gO1xufVxuXG5mdW5jdGlvbiByZXZlcnNpYmxlU3dhbkdhdGUocm9tOiBSb20pIHtcbiAgLy8gQWxsb3cgb3BlbmluZyBTd2FuIGZyb20gZWl0aGVyIHNpZGUgYnkgYWRkaW5nIGEgcGFpciBvZiBndWFyZHMgb24gdGhlXG4gIC8vIG9wcG9zaXRlIHNpZGUgb2YgdGhlIGdhdGUuXG4gIHJvbS5sb2NhdGlvbnNbMHg3M10uc3Bhd25zLnB1c2goXG4gICAgLy8gTk9URTogU29sZGllcnMgbXVzdCBjb21lIGluIHBhaXJzICh3aXRoIGluZGV4IF4xIGZyb20gZWFjaCBvdGhlcilcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGEsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwYiwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBlLCB5dDogMHgwYSwgdHlwZTogMiwgaWQ6IDB4YjN9KSwgLy8gbmV3IHRyaWdnZXI6IGVyYXNlIGd1YXJkc1xuICApO1xuXG4gIC8vIEd1YXJkcyAoJDJkKSBhdCBzd2FuIGdhdGUgKCQ3MykgfiBzZXQgMTBkIGFmdGVyIG9wZW5pbmcgZ2F0ZSA9PiBjb25kaXRpb24gZm9yIGRlc3Bhd25cbiAgcm9tLm5wY3NbMHgyZF0ubG9jYWxEaWFsb2dzLmdldCgweDczKSFbMF0uZmxhZ3MucHVzaCgweDEwZCk7XG5cbiAgLy8gRGVzcGF3biBndWFyZCB0cmlnZ2VyIHJlcXVpcmVzIDEwZFxuICByb20udHJpZ2dlcigweGIzKS5jb25kaXRpb25zLnB1c2goMHgxMGQpO1xufVxuXG5mdW5jdGlvbiBsZWFmRWxkZXJJblNhYnJlSGVhbHMocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgbGVhZkVsZGVyID0gcm9tLm5wY3NbMHgwZF07XG4gIGNvbnN0IHN1bW1pdERpYWxvZyA9IGxlYWZFbGRlci5sb2NhbERpYWxvZ3MuZ2V0KDB4MzUpIVswXTtcbiAgc3VtbWl0RGlhbG9nLm1lc3NhZ2UuYWN0aW9uID0gMHgxNzsgLy8gaGVhbCBhbmQgZGlzYXBwZWFyLlxufVxuXG5mdW5jdGlvbiBwcmV2ZW50TnBjRGVzcGF3bnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGZ1bmN0aW9uIHJlbW92ZTxUPihhcnI6IFRbXSwgZWxlbTogVCk6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmluZGV4T2YoZWxlbSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50ICR7ZWxlbX0gaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlSWY8VD4oYXJyOiBUW10sIHByZWQ6IChlbGVtOiBUKSA9PiBib29sZWFuKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuZmluZEluZGV4KHByZWQpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpYWxvZyhpZDogbnVtYmVyLCBsb2M6IG51bWJlciA9IC0xKTogTG9jYWxEaWFsb2dbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLmxvY2FsRGlhbG9ncy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGRpYWxvZyAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIHNwYXducyhpZDogbnVtYmVyLCBsb2M6IG51bWJlcik6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0uc3Bhd25Db25kaXRpb25zLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgc3Bhd24gY29uZGl0aW9uICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBMaW5rIHNvbWUgcmVkdW5kYW50IE5QQ3M6IEtlbnN1ICg3ZSwgNzQpIGFuZCBBa2FoYW5hICg4OCwgMTYpXG4gIHJvbS5ucGNzWzB4NzRdLmxpbmsoMHg3ZSk7XG4gIHJvbS5ucGNzWzB4NzRdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDc0XS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4N2VdLmRhdGFdIGFzIGFueTtcbiAgcm9tLmxvY2F0aW9ucy5Td2FuX0RhbmNlSGFsbC5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDdlKSEuaWQgPSAweDc0O1xuICByb20uaXRlbXNbMHgzYl0udHJhZGVJbiFbMF0gPSAweDc0O1xuXG4gIC8vIGRpYWxvZyBpcyBzaGFyZWQgYmV0d2VlbiA4OCBhbmQgMTYuXG4gIHJvbS5ucGNzWzB4ODhdLmxpbmtEaWFsb2coMHgxNik7XG5cbiAgLy8gTWFrZSBhIG5ldyBOUEMgZm9yIEFrYWhhbmEgaW4gQnJ5bm1hZXI7IG90aGVycyB3b24ndCBhY2NlcHQgdGhlIFN0YXR1ZSBvZiBPbnl4LlxuICAvLyBMaW5raW5nIHNwYXduIGNvbmRpdGlvbnMgYW5kIGRpYWxvZ3MgaXMgc3VmZmljaWVudCwgc2luY2UgdGhlIGFjdHVhbCBOUEMgSURcbiAgLy8gKDE2IG9yIDgyKSBpcyB3aGF0IG1hdHRlcnMgZm9yIHRoZSB0cmFkZS1pblxuICByb20ubnBjc1sweDgyXS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg4Ml0ubGluaygweDE2KTtcbiAgcm9tLm5wY3NbMHg4Ml0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDE2XS5kYXRhXSBhcyBhbnk7IC8vIGVuc3VyZSBnaXZlIGl0ZW1cbiAgcm9tLmxvY2F0aW9ucy5CcnlubWFlci5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDE2KSEuaWQgPSAweDgyO1xuICByb20uaXRlbXNbMHgyNV0udHJhZGVJbiFbMF0gPSAweDgyO1xuXG4gIC8vIExlYWYgZWxkZXIgaW4gaG91c2UgKCQwZCBAICRjMCkgfiBzd29yZCBvZiB3aW5kIHJlZHVuZGFudCBmbGFnXG4gIC8vIGRpYWxvZygweDBkLCAweGMwKVsyXS5mbGFncyA9IFtdO1xuICAvL3JvbS5pdGVtR2V0c1sweDAwXS5mbGFncyA9IFtdOyAvLyBjbGVhciByZWR1bmRhbnQgZmxhZ1xuXG4gIC8vIExlYWYgcmFiYml0ICgkMTMpIG5vcm1hbGx5IHN0b3BzIHNldHRpbmcgaXRzIGZsYWcgYWZ0ZXIgcHJpc29uIGRvb3Igb3BlbmVkLFxuICAvLyBidXQgdGhhdCBkb2Vzbid0IG5lY2Vzc2FyaWx5IG9wZW4gbXQgc2FicmUuICBJbnN0ZWFkIChhKSB0cmlnZ2VyIG9uIDA0N1xuICAvLyAoc2V0IGJ5IDhkIHVwb24gZW50ZXJpbmcgZWxkZXIncyBjZWxsKS4gIEFsc28gbWFrZSBzdXJlIHRoYXQgdGhhdCBwYXRoIGFsc29cbiAgLy8gcHJvdmlkZXMgdGhlIG5lZWRlZCBmbGFnIHRvIGdldCBpbnRvIG10IHNhYnJlLlxuICBkaWFsb2coMHgxMylbMl0uY29uZGl0aW9uID0gMHgwNDc7XG4gIGRpYWxvZygweDEzKVsyXS5mbGFncyA9IFsweDBhOV07XG4gIGRpYWxvZygweDEzKVszXS5mbGFncyA9IFsweDBhOV07XG5cbiAgLy8gV2luZG1pbGwgZ3VhcmQgKCQxNCBAICQwZSkgc2hvdWxkbid0IGRlc3Bhd24gYWZ0ZXIgYWJkdWN0aW9uICgwMzgpLFxuICAvLyBidXQgaW5zdGVhZCBhZnRlciBnaXZpbmcgdGhlIGl0ZW0gKDA4OClcbiAgc3Bhd25zKDB4MTQsIDB4MGUpWzFdID0gfjB4MDg4OyAvLyByZXBsYWNlIGZsYWcgfjAzOCA9PiB+MDg4XG4gIC8vZGlhbG9nKDB4MTQsIDB4MGUpWzBdLmZsYWdzID0gW107IC8vIHJlbW92ZSByZWR1bmRhbnQgZmxhZyB+IHdpbmRtaWxsIGtleVxuXG4gIC8vIEFrYWhhbmEgKCQxNiAvIDg4KSB+IHNoaWVsZCByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4MTYsIDB4NTcpWzBdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRpc2FwcGVhciBhZnRlciBnZXR0aW5nIGJhcnJpZXIgKG5vdGUgODgncyBzcGF3bnMgbm90IGxpbmtlZCB0byAxNilcbiAgcmVtb3ZlKHNwYXducygweDE2LCAweDU3KSwgfjB4MDUxKTtcbiAgcmVtb3ZlKHNwYXducygweDg4LCAweDU3KSwgfjB4MDUxKTtcblxuICBmdW5jdGlvbiByZXZlcnNlRGlhbG9nKGRzOiBMb2NhbERpYWxvZ1tdKTogdm9pZCB7XG4gICAgZHMucmV2ZXJzZSgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IG5leHQgPSBkc1tpICsgMV07XG4gICAgICBkc1tpXS5jb25kaXRpb24gPSBuZXh0ID8gfm5leHQuY29uZGl0aW9uIDogfjA7XG4gICAgfVxuICB9O1xuXG4gIC8vIE9hayBlbGRlciAoJDFkKSB+IHN3b3JkIG9mIGZpcmUgcmVkdW5kYW50IGZsYWdcbiAgY29uc3Qgb2FrRWxkZXJEaWFsb2cgPSBkaWFsb2coMHgxZCk7XG4gIC8vb2FrRWxkZXJEaWFsb2dbNF0uZmxhZ3MgPSBbXTtcbiAgLy8gTWFrZSBzdXJlIHRoYXQgd2UgdHJ5IHRvIGdpdmUgdGhlIGl0ZW0gZnJvbSAqYWxsKiBwb3N0LWluc2VjdCBkaWFsb2dzXG4gIG9ha0VsZGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1syXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzNdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcblxuICAvLyBPYWsgbW90aGVyICgkMWUpIH4gaW5zZWN0IGZsdXRlIHJlZHVuZGFudCBmbGFnXG4gIC8vIFRPRE8gLSByZWFycmFuZ2UgdGhlc2UgZmxhZ3MgYSBiaXQgKG1heWJlIH4wNDUsIH4wYTAgfjA0MSAtIHNvIHJldmVyc2UpXG4gIC8vICAgICAgLSB3aWxsIG5lZWQgdG8gY2hhbmdlIGJhbGxPZkZpcmUgYW5kIGluc2VjdEZsdXRlIGluIGRlcGdyYXBoXG4gIGNvbnN0IG9ha01vdGhlckRpYWxvZyA9IGRpYWxvZygweDFlKTtcbiAgKCgpID0+IHtcbiAgICBjb25zdCBba2lsbGVkSW5zZWN0LCBnb3RJdGVtLCBnZXRJdGVtLCBmaW5kQ2hpbGRdID0gb2FrTW90aGVyRGlhbG9nO1xuICAgIGZpbmRDaGlsZC5jb25kaXRpb24gPSB+MHgwNDU7XG4gICAgLy9nZXRJdGVtLmNvbmRpdGlvbiA9IH4weDIyNztcbiAgICAvL2dldEl0ZW0uZmxhZ3MgPSBbXTtcbiAgICBnb3RJdGVtLmNvbmRpdGlvbiA9IH4wO1xuICAgIHJvbS5ucGNzWzB4MWVdLmxvY2FsRGlhbG9ncy5zZXQoLTEsIFtmaW5kQ2hpbGQsIGdldEl0ZW0sIGtpbGxlZEluc2VjdCwgZ290SXRlbV0pO1xuICB9KSgpO1xuICAvLy8gb2FrTW90aGVyRGlhbG9nWzJdLmZsYWdzID0gW107XG4gIC8vIC8vIEVuc3VyZSB3ZSBhbHdheXMgZ2l2ZSBpdGVtIGFmdGVyIGluc2VjdC5cbiAgLy8gb2FrTW90aGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gb2FrTW90aGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gcmV2ZXJzZURpYWxvZyhvYWtNb3RoZXJEaWFsb2cpO1xuXG4gIC8vIFJldmVyc2UgdGhlIG90aGVyIG9hayBkaWFsb2dzLCB0b28uXG4gIGZvciAoY29uc3QgaSBvZiBbMHgyMCwgMHgyMSwgMHgyMiwgMHg3YywgMHg3ZF0pIHtcbiAgICByZXZlcnNlRGlhbG9nKGRpYWxvZyhpKSk7XG4gIH1cblxuICAvLyBTd2FwIHRoZSBmaXJzdCB0d28gb2FrIGNoaWxkIGRpYWxvZ3MuXG4gIGNvbnN0IG9ha0NoaWxkRGlhbG9nID0gZGlhbG9nKDB4MWYpO1xuICBvYWtDaGlsZERpYWxvZy51bnNoaWZ0KC4uLm9ha0NoaWxkRGlhbG9nLnNwbGljZSgxLCAxKSk7XG5cbiAgLy8gVGhyb25lIHJvb20gYmFjayBkb29yIGd1YXJkICgkMzMgQCAkZGYpIHNob3VsZCBoYXZlIHNhbWUgc3Bhd24gY29uZGl0aW9uIGFzIHF1ZWVuXG4gIC8vICgwMjAgTk9UIHF1ZWVuIG5vdCBpbiB0aHJvbmUgcm9vbSBBTkQgMDFiIE5PVCB2aWV3ZWQgbWVzaWEgcmVjb3JkaW5nKVxuICByb20ubnBjc1sweDMzXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZGYsICBbfjB4MDIwLCB+MHgwMWJdKTtcblxuICAvLyBGcm9udCBwYWxhY2UgZ3VhcmQgKCQzNCkgdmFjYXRpb24gbWVzc2FnZSBrZXlzIG9mZiAwMWIgaW5zdGVhZCBvZiAwMWZcbiAgZGlhbG9nKDB4MzQpWzFdLmNvbmRpdGlvbiA9IDB4MDFiO1xuXG4gIC8vIFF1ZWVuJ3MgKCQzOCkgZGlhbG9nIG5lZWRzIHF1aXRlIGEgYml0IG9mIHdvcmtcbiAgLy8gR2l2ZSBpdGVtIChmbHV0ZSBvZiBsaW1lKSBldmVuIGlmIGdvdCB0aGUgc3dvcmQgb2Ygd2F0ZXJcbiAgZGlhbG9nKDB4MzgpWzNdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMzsgLy8gXCJ5b3UgZm91bmQgc3dvcmRcIiA9PiBhY3Rpb24gM1xuICBkaWFsb2coMHgzOClbNF0uZmxhZ3MucHVzaCgweDA5Yyk7ICAgICAvLyBzZXQgMDljIHF1ZWVuIGdvaW5nIGF3YXlcbiAgLy8gUXVlZW4gc3Bhd24gY29uZGl0aW9uIGRlcGVuZHMgb24gMDFiIChtZXNpYSByZWNvcmRpbmcpIG5vdCAwMWYgKGJhbGwgb2Ygd2F0ZXIpXG4gIC8vIFRoaXMgZW5zdXJlcyB5b3UgaGF2ZSBib3RoIHN3b3JkIGFuZCBiYWxsIHRvIGdldCB0byBoZXIgKD8/PylcbiAgc3Bhd25zKDB4MzgsIDB4ZGYpWzFdID0gfjB4MDFiOyAgLy8gdGhyb25lIHJvb206IDAxYiBOT1QgbWVzaWEgcmVjb3JkaW5nXG4gIHNwYXducygweDM4LCAweGUxKVswXSA9IDB4MDFiOyAgIC8vIGJhY2sgcm9vbTogMDFiIG1lc2lhIHJlY29yZGluZ1xuICBkaWFsb2coMHgzOClbMV0uY29uZGl0aW9uID0gMHgwMWI7ICAgICAvLyByZXZlYWwgY29uZGl0aW9uOiAwMWIgbWVzaWEgcmVjb3JkaW5nXG5cbiAgLy8gRm9ydHVuZSB0ZWxsZXIgKCQzOSkgc2hvdWxkIGFsc28gbm90IHNwYXduIGJhc2VkIG9uIG1lc2lhIHJlY29yZGluZyByYXRoZXIgdGhhbiBvcmJcbiAgc3Bhd25zKDB4MzksIDB4ZDgpWzFdID0gfjB4MDFiOyAgLy8gZm9ydHVuZSB0ZWxsZXIgcm9vbTogMDFiIE5PVFxuXG4gIC8vIENsYXJrICgkNDQpIG1vdmVzIGFmdGVyIHRhbGtpbmcgdG8gaGltICgwOGQpIHJhdGhlciB0aGFuIGNhbG1pbmcgc2VhICgwOGYpLlxuICAvLyBUT0RPIC0gY2hhbmdlIDA4ZCB0byB3aGF0ZXZlciBhY3R1YWwgaXRlbSBoZSBnaXZlcywgdGhlbiByZW1vdmUgYm90aCBmbGFnc1xuICByb20ubnBjc1sweDQ0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZTksIFt+MHgwOGRdKTsgLy8gem9tYmllIHRvd24gYmFzZW1lbnRcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU0LCBbMHgwOGRdKTsgIC8vIGpvZWwgc2hlZFxuICAvL2RpYWxvZygweDQ0LCAweGU5KVsxXS5mbGFncy5wb3AoKTsgLy8gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcblxuICAvLyBCcm9rYWhhbmEgKCQ1NCkgfiB3YXJyaW9yIHJpbmcgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1NClbMl0uZmxhZ3MgPSBbXTtcblxuICAvLyBEZW8gKCQ1YSkgfiBwZW5kYW50IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NWEpWzFdLmZsYWdzID0gW107XG5cbiAgLy8gWmVidSAoJDVlKSBjYXZlIGRpYWxvZyAoQCAkMTApXG4gIC8vIFRPRE8gLSBkaWFsb2dzKDB4NWUsIDB4MTApLnJlYXJyYW5nZSh+MHgwM2EsIDB4MDBkLCAweDAzOCwgMHgwMzksIDB4MDBhLCB+MHgwMDApO1xuICByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3Muc2V0KDB4MTAsIFtcbiAgICBMb2NhbERpYWxvZy5vZih+MHgwM2EsIFsweDAwLCAweDFhXSwgWzB4MDNhXSksIC8vIDAzYSBOT1QgdGFsa2VkIHRvIHplYnUgaW4gY2F2ZSAtPiBTZXQgMDNhXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBkLCBbMHgwMCwgMHgxZF0pLCAvLyAwMGQgbGVhZiB2aWxsYWdlcnMgcmVzY3VlZFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAzOCwgWzB4MDAsIDB4MWNdKSwgLy8gMDM4IGxlYWYgYXR0YWNrZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzksIFsweDAwLCAweDFkXSksIC8vIDAzOSBsZWFybmVkIHJlZnJlc2hcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMGEsIFsweDAwLCAweDFiLCAweDAzXSksIC8vIDAwYSB3aW5kbWlsbCBrZXkgdXNlZCAtPiB0ZWFjaCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDAwLCBbMHgwMCwgMHgxZF0pLFxuICBdKTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcmVtb3ZlKHNwYXducygweDVlLCAweDEwKSwgfjB4MDUxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gVG9ybmVsICgkNWYpIGluIHNhYnJlIHdlc3QgKCQyMSkgfiB0ZWxlcG9ydCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVmLCAweDIxKVsxXS5mbGFncyA9IFtdO1xuICAvLyBEb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByb20ubnBjc1sweDVmXS5zcGF3bkNvbmRpdGlvbnMuZGVsZXRlKDB4MjEpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBTdG9tICgkNjApOiBkb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByb20ubnBjc1sweDYwXS5zcGF3bkNvbmRpdGlvbnMuZGVsZXRlKDB4MWUpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBBc2luYSAoJDYyKSBpbiBiYWNrIHJvb20gKCRlMSkgZ2l2ZXMgZmx1dGUgb2YgbGltZVxuICBjb25zdCBhc2luYSA9IHJvbS5ucGNzWzB4NjJdO1xuICBhc2luYS5kYXRhWzFdID0gMHgyODtcbiAgZGlhbG9nKGFzaW5hLmlkLCAweGUxKVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MTE7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMl0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICAvLyBQcmV2ZW50IGRlc3Bhd24gZnJvbSBiYWNrIHJvb20gYWZ0ZXIgZGVmZWF0aW5nIHNhYmVyYSAofjA4ZilcbiAgcmVtb3ZlKHNwYXducyhhc2luYS5pZCwgMHhlMSksIH4weDA4Zik7XG5cbiAgLy8gS2Vuc3UgaW4gY2FiaW4gKCQ2OCBAICQ2MSkgbmVlZHMgdG8gYmUgYXZhaWxhYmxlIGV2ZW4gYWZ0ZXIgdmlzaXRpbmcgSm9lbC5cbiAgLy8gQ2hhbmdlIGhpbSB0byBqdXN0IGRpc2FwcGVhciBhZnRlciBzZXR0aW5nIHRoZSByaWRlYWJsZSBkb2xwaGluIGZsYWcgKDA5YiksXG4gIC8vIGFuZCB0byBub3QgZXZlbiBzaG93IHVwIGF0IGFsbCB1bmxlc3MgdGhlIGZvZyBsYW1wIHdhcyByZXR1cm5lZCAoMDIxKS5cbiAgcm9tLm5wY3NbMHg2OF0uc3Bhd25Db25kaXRpb25zLnNldCgweDYxLCBbfjB4MDliLCAweDAyMV0pO1xuICBkaWFsb2coMHg2OClbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAyOyAvLyBkaXNhcHBlYXJcblxuICAvLyBBenRlY2EgaW4gU2h5cm9uICg2ZSkgc2hvdWxkbid0IHNwYXduIGFmdGVyIG1hc3NhY3JlICgwMjcpXG4gIHJvbS5ucGNzWzB4NmVdLnNwYXduQ29uZGl0aW9ucy5nZXQoMHhmMikhLnB1c2gofjB4MDI3KTtcbiAgLy8gQWxzbyB0aGUgZGlhbG9nIHRyaWdnZXIgKDgyKSBzaG91bGRuJ3QgaGFwcGVuXG4gIHJvbS50cmlnZ2VyKDB4ODIpLmNvbmRpdGlvbnMucHVzaCh+MHgwMjcpO1xuXG4gIC8vIEtlbnN1IGluIGxpZ2h0aG91c2UgKCQ3NC8kN2UgQCAkNjIpIH4gcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg3NCwgMHg2MilbMF0uZmxhZ3MgPSBbXTtcblxuICAvLyBBenRlY2EgKCQ4MykgaW4gcHlyYW1pZCB+IGJvdyBvZiB0cnV0aCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDgzKVswXS5jb25kaXRpb24gPSB+MHgyNDA7ICAvLyAyNDAgTk9UIGJvdyBvZiB0cnV0aFxuICAvL2RpYWxvZygweDgzKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFJhZ2UgYmxvY2tzIG9uIHN3b3JkIG9mIHdhdGVyLCBub3QgcmFuZG9tIGl0ZW0gZnJvbSB0aGUgY2hlc3RcbiAgZGlhbG9nKDB4YzMpWzBdLmNvbmRpdGlvbiA9IDB4MjAyO1xuXG4gIC8vIFJlbW92ZSB1c2VsZXNzIHNwYXduIGNvbmRpdGlvbiBmcm9tIE1hZG8gMVxuICByb20ubnBjc1sweGM0XS5zcGF3bkNvbmRpdGlvbnMuZGVsZXRlKDB4ZjIpOyAvLyBhbHdheXMgc3Bhd25cblxuICAvLyBEcmF5Z29uIDIgKCRjYiBAIGxvY2F0aW9uICRhNikgc2hvdWxkIGRlc3Bhd24gYWZ0ZXIgYmVpbmcgZGVmZWF0ZWQuXG4gIHJvbS5ucGNzWzB4Y2JdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhhNiwgW34weDI4ZF0pOyAvLyBrZXkgb24gYmFjayB3YWxsIGRlc3Ryb3llZFxuXG4gIC8vIEZpeCBaZWJ1IHRvIGdpdmUga2V5IHRvIHN0eHkgZXZlbiBpZiB0aHVuZGVyIHN3b3JkIGlzIGdvdHRlbiAoanVzdCBzd2l0Y2ggdGhlXG4gIC8vIG9yZGVyIG9mIHRoZSBmaXJzdCB0d28pLiAgQWxzbyBkb24ndCBib3RoZXIgc2V0dGluZyAwM2Igc2luY2UgdGhlIG5ldyBJdGVtR2V0XG4gIC8vIGxvZ2ljIG9idmlhdGVzIHRoZSBuZWVkLlxuICBjb25zdCB6ZWJ1U2h5cm9uID0gcm9tLm5wY3NbMHg1ZV0ubG9jYWxEaWFsb2dzLmdldCgweGYyKSE7XG4gIHplYnVTaHlyb24udW5zaGlmdCguLi56ZWJ1U2h5cm9uLnNwbGljZSgxLCAxKSk7XG4gIC8vIHplYnVTaHlyb25bMF0uZmxhZ3MgPSBbXTtcblxuICAvLyBTaHlyb24gbWFzc2FjcmUgKCQ4MCkgcmVxdWlyZXMga2V5IHRvIHN0eHlcbiAgcm9tLnRyaWdnZXIoMHg4MCkuY29uZGl0aW9ucyA9IFtcbiAgICB+MHgwMjcsIC8vIG5vdCB0cmlnZ2VyZWQgbWFzc2FjcmUgeWV0XG4gICAgIDB4MDNiLCAvLyBnb3QgaXRlbSBmcm9tIGtleSB0byBzdHh5IHNsb3RcbiAgICAgMHgyZmQsIC8vIHNoeXJvbiB3YXJwIHBvaW50IHRyaWdnZXJlZFxuICAgICAvLyAweDIwMywgLy8gZ290IHN3b3JkIG9mIHRodW5kZXIgLSBOT1QgQU5ZIE1PUkUhXG4gIF07XG5cbiAgLy8gRW50ZXIgc2h5cm9uICgkODEpIHNob3VsZCBzZXQgd2FycCBubyBtYXR0ZXIgd2hhdFxuICByb20udHJpZ2dlcigweDgxKS5jb25kaXRpb25zID0gW107XG5cbiAgaWYgKGZsYWdzLmJhcnJpZXJSZXF1aXJlc0NhbG1TZWEoKSkge1xuICAgIC8vIExlYXJuIGJhcnJpZXIgKCQ4NCkgcmVxdWlyZXMgY2FsbSBzZWFcbiAgICByb20udHJpZ2dlcigweDg0KS5jb25kaXRpb25zLnB1c2goMHgyODMpOyAvLyAyODMgY2FsbWVkIHRoZSBzZWFcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgbm90IHNldHRpbmcgMDUxIGFuZCBjaGFuZ2luZyB0aGUgY29uZGl0aW9uIHRvIG1hdGNoIHRoZSBpdGVtXG4gIH1cbiAgLy9yb20udHJpZ2dlcigweDg0KS5mbGFncyA9IFtdO1xuXG4gIC8vIEFkZCBhbiBleHRyYSBjb25kaXRpb24gdG8gdGhlIExlYWYgYWJkdWN0aW9uIHRyaWdnZXIgKGJlaGluZCB6ZWJ1KS4gIFRoaXMgZW5zdXJlc1xuICAvLyBhbGwgdGhlIGl0ZW1zIGluIExlYWYgcHJvcGVyIChlbGRlciBhbmQgc3R1ZGVudCkgYXJlIGdvdHRlbiBiZWZvcmUgdGhleSBkaXNhcHBlYXIuXG4gIHJvbS50cmlnZ2VyKDB4OGMpLmNvbmRpdGlvbnMucHVzaCgweDAzYSk7IC8vIDAzYSB0YWxrZWQgdG8gemVidSBpbiBjYXZlXG5cbiAgLy8gTW9yZSB3b3JrIG9uIGFiZHVjdGlvbiB0cmlnZ2VyczpcbiAgLy8gMS4gUmVtb3ZlIHRoZSA4ZCB0cmlnZ2VyIGluIHRoZSBmcm9udCBvZiB0aGUgY2VsbCwgc3dhcCBpdCBvdXRcbiAgLy8gICAgZm9yIGIyIChsZWFybiBwYXJhbHlzaXMpLlxuICByb20udHJpZ2dlcigweDhkKS51c2VkID0gZmFsc2U7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5NdFNhYnJlTm9ydGhfU3VtbWl0Q2F2ZS5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4OGQpIHNwYXduLmlkID0gMHhiMjtcbiAgfVxuICByZW1vdmVJZihyb20ubG9jYXRpb25zLldhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducyxcbiAgICAgICAgICAgc3Bhd24gPT4gc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4OGQpO1xuICAvLyAyLiBTZXQgdGhlIHRyaWdnZXIgdG8gcmVxdWlyZSBoYXZpbmcga2lsbGVkIGtlbGJlc3F1ZS5cbiAgcm9tLnRyaWdnZXIoMHhiMikuY29uZGl0aW9ucy5wdXNoKDB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyAzLiBBbHNvIHNldCB0aGUgdHJpZ2dlciB0byBmcmVlIHRoZSB2aWxsYWdlcnMgYW5kIHRoZSBlbGRlci5cbiAgcm9tLnRyaWdnZXIoMHhiMikuZmxhZ3MucHVzaCh+MHgwODQsIH4weDA4NSwgMHgwMGQpO1xuICAvLyA0LiBEb24ndCB0cmlnZ2VyIHRoZSBhYmR1Y3Rpb24gaW4gdGhlIGZpcnN0IHBsYWNlIGlmIGtlbGJlc3F1ZSBkZWFkXG4gIHJvbS50cmlnZ2VyKDB4OGMpLmNvbmRpdGlvbnMucHVzaCh+MHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDUuIERvbid0IHRyaWdnZXIgcmFiYml0IGJsb2NrIGlmIGtlbGJlc3F1ZSBkZWFkXG4gIHJvbS50cmlnZ2VyKDB4ODYpLmNvbmRpdGlvbnMucHVzaCh+MHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDYuIERvbid0IGZyZWUgdmlsbGFnZXJzIGZyb20gdXNpbmcgcHJpc29uIGtleVxuICByb20ucHJnWzB4MWUwYTNdID0gMHhjMDtcbiAgcm9tLnByZ1sweDFlMGE0XSA9IDB4MDA7XG5cbiAgLy8gVE9ETyAtIGFkZGl0aW9uYWwgd29yayBvbiBhYmR1Y3Rpb24gdHJpZ2dlcjpcbiAgLy8gICAtIGdldCByaWQgb2YgdGhlIGZsYWdzIG9uIGtleSB0byBwcmlzb24gdXNlXG4gIC8vICAgLSBhZGQgYSBjb25kaXRpb24gdGhhdCBhYmR1Y3Rpb24gZG9lc24ndCBoYXBwZW4gaWYgcmVzY3VlZFxuICAvLyBHZXQgcmlkIG9mIEJPVEggdHJpZ2dlcnMgaW4gc3VtbWl0IGNhdmUsICBJbnN0ZWFkLCB0aWUgZXZlcnl0aGluZ1xuICAvLyB0byB0aGUgZWxkZXIgZGlhbG9nIG9uIHRvcFxuICAvLyAgIC0gaWYga2VsYmVzcXVlIHN0aWxsIGFsaXZlLCBtYXliZSBnaXZlIGEgaGludCBhYm91dCB3ZWFrbmVzc1xuICAvLyAgIC0gaWYga2VsYmVzcXVlIGRlYWQgdGhlbiB0ZWFjaCBwYXJhbHlzaXMgYW5kIHNldC9jbGVhciBmbGFnc1xuICAvLyAgIC0gaWYgcGFyYWx5c2lzIGxlYXJuZWQgdGhlbiBzYXkgc29tZXRoaW5nIGdlbmVyaWNcbiAgLy8gU3RpbGwgbmVlZCB0byBrZWVwIHRoZSB0cmlnZ2VyIGluIHRoZSBmcm9udCBpbiBjYXNlIG5vXG4gIC8vIGFiZHVjdGlvbiB5ZXRcbiAgLy8gICAtIGlmIE5PVCBwYXJhbHlzaXMgQU5EIGlmIE5PVCBlbGRlciBtaXNzaW5nIEFORCBpZiBrZWxiZXF1ZSBkZWFkXG4gIC8vIC0tLT4gbmVlZCBzcGVjaWFsIGhhbmRsaW5nIGZvciB0d28gd2F5cyB0byBnZXQgKGxpa2UgcmVmcmVzaCk/XG4gIC8vXG4gIC8vIEFsc28gYWRkIGEgY2hlY2sgdGhhdCB0aGUgcmFiYml0IHRyaWdnZXIgaXMgZ29uZSBpZiByZXNjdWVkIVxuXG5cblxuICAvLyBQYXJhbHlzaXMgdHJpZ2dlciAoJGIyKSB+IHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG4gIC8vcm9tLnRyaWdnZXIoMHhiMikuY29uZGl0aW9uc1swXSA9IH4weDI0MjtcbiAgLy9yb20udHJpZ2dlcigweGIyKS5mbGFncy5zaGlmdCgpOyAvLyByZW1vdmUgMDM3IGxlYXJuZWQgcGFyYWx5c2lzXG5cbiAgLy8gTGVhcm4gcmVmcmVzaCB0cmlnZ2VyICgkYjQpIH4gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcbiAgLy9yb20udHJpZ2dlcigweGI0KS5jb25kaXRpb25zWzFdID0gfjB4MjQxO1xuICAvL3JvbS50cmlnZ2VyKDB4YjQpLmZsYWdzID0gW107IC8vIHJlbW92ZSAwMzkgbGVhcm5lZCByZWZyZXNoXG5cbiAgLy8gVGVsZXBvcnQgYmxvY2sgb24gbXQgc2FicmUgaXMgZnJvbSBzcGVsbCwgbm90IHNsb3RcbiAgcm9tLnRyaWdnZXIoMHhiYSkuY29uZGl0aW9uc1swXSA9IH4weDI0NDsgLy8gfjAzZiAtPiB+MjQ0XG5cbiAgLy8gUG9ydG9hIHBhbGFjZSBndWFyZCBtb3ZlbWVudCB0cmlnZ2VyICgkYmIpIHN0b3BzIG9uIDAxYiAobWVzaWEpIG5vdCAwMWYgKG9yYilcbiAgcm9tLnRyaWdnZXIoMHhiYikuY29uZGl0aW9uc1sxXSA9IH4weDAxYjtcblxuICAvLyBSZW1vdmUgcmVkdW5kYW50IHRyaWdnZXIgOGEgKHNsb3QgMTYpIGluIHpvbWJpZXRvd24gKCQ2NSlcbiAgLy8gIC0tIG5vdGU6IG5vIGxvbmdlciBuZWNlc3Nhcnkgc2luY2Ugd2UgcmVwdXJwb3NlIGl0IGluc3RlYWQuXG4gIC8vIGNvbnN0IHt6b21iaWVUb3dufSA9IHJvbS5sb2NhdGlvbnM7XG4gIC8vIHpvbWJpZVRvd24uc3Bhd25zID0gem9tYmllVG93bi5zcGF3bnMuZmlsdGVyKHggPT4gIXguaXNUcmlnZ2VyKCkgfHwgeC5pZCAhPSAweDhhKTtcblxuICAvLyBSZXBsYWNlIGFsbCBkaWFsb2cgY29uZGl0aW9ucyBmcm9tIDAwZSB0byAyNDNcbiAgZm9yIChjb25zdCBucGMgb2Ygcm9tLm5wY3MpIHtcbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmFsbERpYWxvZ3MoKSkge1xuICAgICAgaWYgKGQuY29uZGl0aW9uID09PSAweDAwZSkgZC5jb25kaXRpb24gPSAweDI0MztcbiAgICAgIGlmIChkLmNvbmRpdGlvbiA9PT0gfjB4MDBlKSBkLmNvbmRpdGlvbiA9IH4weDI0MztcbiAgICB9XG4gIH1cbn1cblxuLy8gSGFyZCBtb2RlIGZsYWc6IEhjIC0gemVybyBvdXQgdGhlIHN3b3JkJ3MgY29sbGlzaW9uIHBsYW5lXG5mdW5jdGlvbiBkaXNhYmxlU3RhYnMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBvIG9mIFsweDA4LCAweDA5LCAweDI3XSkge1xuICAgIHJvbS5vYmplY3RzW29dLmNvbGxpc2lvblBsYW5lID0gMDtcbiAgfVxuICAvLyBBbHNvIHRha2Ugd2FycmlvciByaW5nIG91dCBvZiB0aGUgcGljdHVyZS4uLiA6dHJvbGw6XG4gIC8vIHJvbS5pdGVtR2V0c1sweDJiXS5pZCA9IDB4NWI7IC8vIG1lZGljYWwgaGVyYiBmcm9tIHNlY29uZCBmbHV0ZSBvZiBsaW1lIGNoZWNrXG4gIHJvbS5ucGNzWzB4NTRdLmRhdGFbMF0gPSAweDIwO1xufVxuXG5mdW5jdGlvbiBvcmJzT3B0aW9uYWwocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBvYmogb2YgWzB4MTAsIDB4MTQsIDB4MTgsIDB4MWRdKSB7XG4gICAgLy8gMS4gTG9vc2VuIHRlcnJhaW4gc3VzY2VwdGliaWxpdHkgb2YgbGV2ZWwgMSBzaG90c1xuICAgIHJvbS5vYmplY3RzW29ial0udGVycmFpblN1c2NlcHRpYmlsaXR5ICY9IH4weDA0O1xuICAgIC8vIDIuIEluY3JlYXNlIHRoZSBsZXZlbCB0byAyXG4gICAgcm9tLm9iamVjdHNbb2JqXS5sZXZlbCA9IDI7XG4gIH1cbn1cbiJdfQ==