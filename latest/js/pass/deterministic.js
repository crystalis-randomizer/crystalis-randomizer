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
    fixMimics(rom);
    makeBraceletsProgressive(rom);
    addTowerExit(rom);
    reversibleSwanGate(rom);
    adjustGoaFortressTriggers(rom);
    preventNpcDespawns(rom, flags);
    if (flags.requireHealedDolphinToRide())
        requireHealedDolphin(rom);
    if (flags.saharaRabbitsRequireTelepathy())
        requireTelepathyForDeo(rom);
    adjustItemNames(rom, flags);
    alarmFluteIsKeyItem(rom, flags);
    brokahanaWantsMado1(rom);
    if (flags.teleportOnThunderSword()) {
        teleportOnThunderSword(rom);
    }
    else {
        noTeleportOnThunderSword(rom);
    }
    undergroundChannelLandBridge(rom);
    if (flags.addEastCave()) {
        eastCave(rom, flags);
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
    const { ValleyOfWind, CordelPlainWest, CordelPlainEast, WaterfallValleyNorth, WaterfallValleySouth, KirisaMeadow, SaharaOutsideCave, Desert2, } = rom.locations;
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
        flagsToClear.push([rom.locations.LimeTreeValley, 0x10]);
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
    for (const l of [loc1, loc2]) {
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
}
;
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
    for (let i = 0x3dc62; i >= 0x3dc5f; i--) {
        rom.prg[i + 1] = rom.prg[i];
    }
    rom.prg[0x3dc5f] = rom.locations.ZombieTown.id;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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QztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFO1FBRzNCLE1B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Q0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV6RSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsS0FBYztJQUVsRCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdoRCxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ04sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ1osQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRy9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxL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TSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJ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LFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBUSxDQUFDO0lBQ3RELEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3JGLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUduQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUtoQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFRLENBQUM7SUFDdEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FB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QUMsT0FBTyxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUl2RCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRzVELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBSWxDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQy9CLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBR2xDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFJL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQVdsRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNyQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUVoRCxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUt2QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFVdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFHbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFLbkQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO0lBQzFELFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBSS9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHO1FBQzdCLENBQUMsS0FBSztRQUNMLEtBQUs7UUFDTCxLQUFLO0tBRVAsQ0FB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SSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBRTFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFaEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBlcmZvcm0gaW5pdGlhbCBjbGVhbnVwL3NldHVwIG9mIHRoZSBST00uXG5cbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIExvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuLi9yb20vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7R2xvYmFsRGlhbG9nLCBMb2NhbERpYWxvZ30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHthc3NlcnR9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHByZzogVWludDhBcnJheSk6IHZvaWQge1xuICAvLyBSZW1vdmUgdW51c2VkIGl0ZW0vdHJpZ2dlciBhY3Rpb25zXG4gIHByZ1sweDFlMDZiXSAmPSA3OyAvLyBtZWRpY2FsIGhlcmIgbm9ybWFsIHVzYWdlID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNmZdICY9IDc7IC8vIG1hZ2ljIHJpbmcgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDczXSAmPSA3OyAvLyBmcnVpdCBvZiBsaW1lIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3N10gJj0gNzsgLy8gYW50aWRvdGUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDdiXSAmPSA3OyAvLyBvcGVsIHN0YXR1ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwODRdICY9IDc7IC8vIHdhcnAgYm9vdHMgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDQgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDliXSAmPSA3OyAvLyB3aW5kbWlsbCBrZXkgaXRlbXVzZVsxXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMGI5XSAmPSA3OyAvLyBnbG93aW5nIGxhbXAgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuXG4gIC8vIE5PVEU6IHRoaXMgaXMgZG9uZSB2ZXJ5IGVhcmx5LCBtYWtlIHN1cmUgYW55IHJlZmVyZW5jZXMgdG8gd2FycFxuICAvLyBwb2ludCBmbGFncyBhcmUgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBuZXcgb25lcyFcbiAgYWRkWm9tYmllV2FycChyb20pO1xuXG4gIGFkZE1lemFtZVRyaWdnZXIocm9tKTtcblxuICBub3JtYWxpemVTd29yZHMocm9tLCBmbGFncyk7XG5cbiAgZml4Q29pblNwcml0ZXMocm9tKTtcbiAgZml4TWltaWNzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIHJldmVyc2libGVTd2FuR2F0ZShyb20pO1xuICBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbSk7XG4gIHByZXZlbnROcGNEZXNwYXducyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkpIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbSk7XG4gIGlmIChmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpKSByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbSk7XG5cbiAgYWRqdXN0SXRlbU5hbWVzKHJvbSwgZmxhZ3MpO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBtYWtpbmcgYSBUcmFuc2Zvcm1hdGlvbiBpbnRlcmZhY2UsIHdpdGggb3JkZXJpbmcgY2hlY2tzXG4gIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tLCBmbGFncyk7IC8vIE5PVEU6IHByZS1zaHVmZmxlXG4gIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tKTtcbiAgaWYgKGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfSBlbHNlIHtcbiAgICBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfVxuXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tKTtcblxuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSkge1xuICAgIGVhc3RDYXZlKHJvbSwgZmxhZ3MpO1xuICB9IGVsc2UgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbSk7XG4gIH1cbiAgZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb20pO1xuICBjbG9zZUNhdmVFbnRyYW5jZXMocm9tLCBmbGFncyk7XG4gIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbSk7XG4gIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVSYWJiaXRTa2lwKCkpIGZpeFJhYmJpdFNraXAocm9tKTtcblxuICBmaXhSZXZlcnNlV2FsbHMocm9tKTtcbiAgaWYgKGZsYWdzLmNoYXJnZVNob3RzT25seSgpKSBkaXNhYmxlU3RhYnMocm9tKTtcbiAgaWYgKGZsYWdzLm9yYnNPcHRpb25hbCgpKSBvcmJzT3B0aW9uYWwocm9tKTtcbn1cblxuLy8gQWRkcyBhIHRyaWdnZXIgYWN0aW9uIHRvIG1lemFtZS4gIFVzZSA4NyBsZWZ0b3ZlciBmcm9tIHJlc2N1aW5nIHplYnUuXG5mdW5jdGlvbiBhZGRNZXphbWVUcmlnZ2VyKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFt+MHgyZjBdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe2FjdGlvbjogNH0pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmYwXTtcbiAgY29uc3QgbWV6YW1lID0gcm9tLmxvY2F0aW9ucy5NZXphbWVTaHJpbmU7XG4gIG1lemFtZS5zcGF3bnMucHVzaChTcGF3bi5vZih7dGlsZTogMHg4OCwgdHlwZTogMiwgaWQ6IHRyaWdnZXIuaWR9KSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuXG4gIGlmIChmbGFncy5zbG93RG93blRvcm5hZG8oKSkge1xuICAgIC8vIFRPRE8gLSB0b3JuYWRvIChvYmogMTIpID0+IHNwZWVkIDA3IGluc3RlYWQgb2YgMDhcbiAgICAvLyAgICAgIC0gbGlmZXRpbWUgaXMgNDgwID0+IDcwIG1heWJlIHRvbyBsb25nLCA2MCBzd2VldCBzcG90P1xuICAgIGNvbnN0IHRvcm5hZG8gPSByb20ub2JqZWN0c1sweDEyXTtcbiAgICB0b3JuYWRvLnNwZWVkID0gMHgwNztcbiAgICB0b3JuYWRvLmRhdGFbMHgwY10gPSAweDYwOyAvLyBpbmNyZWFzZSBsaWZldGltZSAoNDgwKSBieSAyMCVcbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhDb2luU3ByaXRlcyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWzB4NjAsIDB4NjQsIDB4NjUsIDB4NjYsIDB4NjcsIDB4NjgsXG4gICAgICAgICAgICAgICAgICAgICAgMHg2OSwgMHg2YSwgMHg2YiwgMHg2YywgMHg2ZCwgMHg2Zl0pIHtcbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBbMCwgMSwgMl0pIHtcbiAgICAgIHJvbS5wYXR0ZXJuc1twYWdlIDw8IDYgfCBwYXRdLnBpeGVscyA9IHJvbS5wYXR0ZXJuc1sweDVlIDw8IDYgfCBwYXRdLnBpeGVscztcbiAgICB9XG4gIH1cbiAgcm9tLm9iamVjdHNbMHgwY10ubWV0YXNwcml0ZSA9IDB4YTk7XG59XG5cbi8qKlxuICogRml4IHRoZSBzb2Z0bG9jayB0aGF0IGhhcHBlbnMgd2hlbiB5b3UgZ28gdGhyb3VnaFxuICogYSB3YWxsIGJhY2t3YXJkcyBieSBtb3ZpbmcgdGhlIGV4aXQvZW50cmFuY2UgdGlsZXNcbiAqIHVwIGEgYml0IGFuZCBhZGp1c3Rpbmcgc29tZSB0aWxlRWZmZWN0cyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZpeFJldmVyc2VXYWxscyhyb206IFJvbSkge1xuICAvLyBhZGp1c3QgdGlsZSBlZmZlY3QgZm9yIGJhY2sgdGlsZXMgb2YgaXJvbiB3YWxsXG4gIGZvciAoY29uc3QgdCBpbiBbMHgwNCwgMHgwNSwgMHgwOCwgMHgwOV0pIHtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiYyAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGI1IC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gIH1cbiAgLy8gVE9ETyAtIG1vdmUgYWxsIHRoZSBlbnRyYW5jZXMgdG8geT0yMCBhbmQgZXhpdHMgdG8geXQ9MDFcbn1cblxuLyoqIE1ha2UgYSBsYW5kIGJyaWRnZSBpbiB1bmRlcmdyb3VuZCBjaGFubmVsICovXG5mdW5jdGlvbiB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbTogUm9tKSB7XG4gIGNvbnN0IHt0aWxlc30gPSByb20uc2NyZWVuc1sweGExXTtcbiAgdGlsZXNbMHgyOF0gPSAweDlmO1xuICB0aWxlc1sweDM3XSA9IDB4MjM7XG4gIHRpbGVzWzB4MzhdID0gMHgyMzsgLy8gMHg4ZTtcbiAgdGlsZXNbMHgzOV0gPSAweDIxO1xuICB0aWxlc1sweDQ3XSA9IDB4OGQ7XG4gIHRpbGVzWzB4NDhdID0gMHg4ZjtcbiAgdGlsZXNbMHg1Nl0gPSAweDk5O1xuICB0aWxlc1sweDU3XSA9IDB4OWE7XG4gIHRpbGVzWzB4NThdID0gMHg4Yztcbn1cblxuLyoqXG4gKiBSZW1vdmUgdGltZXIgc3Bhd25zLCByZW51bWJlcnMgbWltaWMgc3Bhd25zIHNvIHRoYXQgdGhleSdyZSB1bmlxdWUuXG4gKiBSdW5zIGJlZm9yZSBzaHVmZmxlIGJlY2F1c2Ugd2UgbmVlZCB0byBpZGVudGlmeSB0aGUgc2xvdC4gIFJlcXVpcmVzXG4gKiBhbiBhc3NlbWJseSBjaGFuZ2UgKCQzZDNmZCBpbiBwcmVzaHVmZmxlLnMpXG4gKi9cbmZ1bmN0aW9uIGZpeE1pbWljcyhyb206IFJvbSk6IHZvaWQge1xuICBsZXQgbWltaWMgPSAweDcwO1xuICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghcy5pc0NoZXN0KCkpIGNvbnRpbnVlO1xuICAgICAgcy50aW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKHMuaWQgPj0gMHg3MCkgcy5pZCA9IG1pbWljKys7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBmaW5kIGEgYmV0dGVyIHdheSB0byBidW5kbGUgYXNtIGNoYW5nZXM/XG4gIC8vIHJvbS5hc3NlbWJsZSgpXG4gIC8vICAgICAuJCgnYWRjICQxMCcpXG4gIC8vICAgICAuYmVxKCdsYWJlbCcpXG4gIC8vICAgICAubHNoKClcbiAgLy8gICAgIC5sc2goYCR7YWRkcn0seGApXG4gIC8vICAgICAubGFiZWwoJ2xhYmVsJyk7XG4gIC8vIHJvbS5wYXRjaCgpXG4gIC8vICAgICAub3JnKDB4M2QzZmQpXG4gIC8vICAgICAuYnl0ZSgweGIwKTtcbn1cblxuZnVuY3Rpb24gYWRqdXN0R29hRm9ydHJlc3NUcmlnZ2Vycyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gTW92ZSBLZWxiZXNxdWUgMiBvbmUgdGlsZSBsZWZ0LlxuICBsLkdvYUZvcnRyZXNzX0tlbGJlc3F1ZS5zcGF3bnNbMF0ueCAtPSA4O1xuICAvLyBSZW1vdmUgc2FnZSBzY3JlZW4gbG9ja3MgKGV4Y2VwdCBLZW5zdSkuXG4gIGwuR29hRm9ydHJlc3NfWmVidS5zcGF3bnMuc3BsaWNlKDEsIDEpOyAvLyB6ZWJ1IHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Ub3JuZWwuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gdG9ybmVsIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Bc2luYS5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyBhc2luYSBzY3JlZW4gbG9jayB0cmlnZ2VyXG59XG5cbmZ1bmN0aW9uIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGNvbnN0IHtXYXRlcmZhbGxDYXZlNH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE1vdmUgYWxhcm0gZmx1dGUgdG8gdGhpcmQgcm93XG4gIHJvbS5pdGVtR2V0c1sweDMxXS5pbnZlbnRvcnlSb3dTdGFydCA9IDB4MjA7XG4gIC8vIEVuc3VyZSBhbGFybSBmbHV0ZSBjYW5ub3QgYmUgZHJvcHBlZFxuICAvLyByb20ucHJnWzB4MjEwMjFdID0gMHg0MzsgLy8gVE9ETyAtIHJvbS5pdGVtc1sweDMxXS4/Pz9cbiAgcm9tLml0ZW1zWzB4MzFdLnVuaXF1ZSA9IHRydWU7XG4gIC8vIEVuc3VyZSBhbGFybSBmbHV0ZSBjYW5ub3QgYmUgc29sZFxuICByb20uaXRlbXNbMHgzMV0uYmFzZVByaWNlID0gMDtcblxuICBpZiAoZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIFBlcnNvbiAxNCAoWmVidSdzIHN0dWRlbnQpOiBzZWNvbmRhcnkgaXRlbSAtPiBhbGFybSBmbHV0ZVxuICAgIHJvbS5ucGNzWzB4MTRdLmRhdGFbMV0gPSAweDMxOyAvLyBOT1RFOiBDbG9iYmVycyBzaHVmZmxlZCBpdGVtISEhXG4gIH1cblxuICAvLyBSZW1vdmUgYWxhcm0gZmx1dGUgZnJvbSBzaG9wcyAocmVwbGFjZSB3aXRoIG90aGVyIGl0ZW1zKVxuICAvLyBOT1RFIC0gd2UgY291bGQgc2ltcGxpZnkgdGhpcyB3aG9sZSB0aGluZyBieSBqdXN0IGhhcmRjb2RpbmcgaW5kaWNlcy5cbiAgLy8gICAgICAtIGlmIHRoaXMgaXMgZ3VhcmFudGVlZCB0byBoYXBwZW4gZWFybHksIGl0J3MgYWxsIHRoZSBzYW1lLlxuICBjb25zdCByZXBsYWNlbWVudHMgPSBbXG4gICAgWzB4MjEsIDAuNzJdLCAvLyBmcnVpdCBvZiBwb3dlciwgNzIlIG9mIGNvc3RcbiAgICBbMHgxZiwgMC45XSwgLy8gbHlzaXMgcGxhbnQsIDkwJSBvZiBjb3N0XG4gIF07XG4gIGxldCBqID0gMDtcbiAgZm9yIChjb25zdCBzaG9wIG9mIHJvbS5zaG9wcykge1xuICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzaG9wLmNvbnRlbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoc2hvcC5jb250ZW50c1tpXSAhPT0gMHgzMSkgY29udGludWU7XG4gICAgICBjb25zdCBbaXRlbSwgcHJpY2VSYXRpb10gPSByZXBsYWNlbWVudHNbKGorKykgJSByZXBsYWNlbWVudHMubGVuZ3RoXTtcbiAgICAgIHNob3AuY29udGVudHNbaV0gPSBpdGVtO1xuICAgICAgaWYgKHJvbS5zaG9wRGF0YVRhYmxlc0FkZHJlc3MpIHtcbiAgICAgICAgLy8gTk9URTogdGhpcyBpcyBicm9rZW4gLSBuZWVkIGEgY29udHJvbGxlZCB3YXkgdG8gY29udmVydCBwcmljZSBmb3JtYXRzXG4gICAgICAgIHNob3AucHJpY2VzW2ldID0gTWF0aC5yb3VuZChzaG9wLnByaWNlc1tpXSAqIHByaWNlUmF0aW8pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENoYW5nZSBmbHV0ZSBvZiBsaW1lIGNoZXN0J3MgKG5vdy11bnVzZWQpIGl0ZW1nZXQgdG8gaGF2ZSBtZWRpY2FsIGhlcmJcbiAgcm9tLml0ZW1HZXRzWzB4NWJdLml0ZW1JZCA9IDB4MWQ7XG4gIC8vIENoYW5nZSB0aGUgYWN0dWFsIHNwYXduIGZvciB0aGF0IGNoZXN0IHRvIGJlIHRoZSBtaXJyb3JlZCBzaGllbGQgY2hlc3RcbiAgV2F0ZXJmYWxsQ2F2ZTQuc3Bhd24oMHgxOSkuaWQgPSAweDEwO1xuXG4gIC8vIFRPRE8gLSByZXF1aXJlIG5ldyBjb2RlIGZvciB0d28gdXNlc1xufVxuXG5mdW5jdGlvbiBicm9rYWhhbmFXYW50c01hZG8xKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGJyb2thaGFuYSA9IHJvbS5ucGNzWzB4NTRdO1xuICBjb25zdCBkaWFsb2cgPSBhc3NlcnQoYnJva2FoYW5hLmxvY2FsRGlhbG9ncy5nZXQoLTEpKVswXTtcbiAgaWYgKGRpYWxvZy5jb25kaXRpb24gIT09IH4weDAyNCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQmFkIGJyb2thaGFuYSBjb25kaXRpb246ICR7ZGlhbG9nLmNvbmRpdGlvbn1gKTtcbiAgfVxuICBkaWFsb2cuY29uZGl0aW9uID0gfjB4MDY3OyAvLyB2YW5pbGxhIGJhbGwgb2YgdGh1bmRlciAvIGRlZmVhdGVkIG1hZG8gMVxufVxuXG5mdW5jdGlvbiByZXF1aXJlSGVhbGVkRG9scGhpbihyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3JtYWxseSB0aGUgZmlzaGVybWFuICgkNjQpIHNwYXducyBpbiBoaXMgaG91c2UgKCRkNikgaWYgeW91IGhhdmVcbiAgLy8gdGhlIHNoZWxsIGZsdXRlICgyMzYpLiAgSGVyZSB3ZSBhbHNvIGFkZCBhIHJlcXVpcmVtZW50IG9uIHRoZSBoZWFsZWRcbiAgLy8gZG9scGhpbiBzbG90ICgwMjUpLCB3aGljaCB3ZSBrZWVwIGFyb3VuZCBzaW5jZSBpdCdzIGFjdHVhbGx5IHVzZWZ1bC5cbiAgcm9tLm5wY3NbMHg2NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGQ2LCBbMHgyMzYsIDB4MDI1XSk7XG4gIC8vIEFsc28gZml4IGRhdWdodGVyJ3MgZGlhbG9nICgkN2IpLlxuICBjb25zdCBkYXVnaHRlckRpYWxvZyA9IHJvbS5ucGNzWzB4N2JdLmxvY2FsRGlhbG9ncy5nZXQoLTEpITtcbiAgZGF1Z2h0ZXJEaWFsb2cudW5zaGlmdChkYXVnaHRlckRpYWxvZ1swXS5jbG9uZSgpKTtcbiAgZGF1Z2h0ZXJEaWFsb2dbMF0uY29uZGl0aW9uID0gfjB4MDI1O1xuICBkYXVnaHRlckRpYWxvZ1sxXS5jb25kaXRpb24gPSB+MHgyMzY7XG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVUZWxlcGF0aHlGb3JEZW8ocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gTm90IGhhdmluZyB0ZWxlcGF0aHkgKDI0Mykgd2lsbCB0cmlnZ2VyIGEgXCJreXUga3l1XCIgKDFhOjEyLCAxYToxMykgZm9yXG4gIC8vIGJvdGggZ2VuZXJpYyBidW5uaWVzICg1OSkgYW5kIGRlbyAoNWEpLlxuICByb20ubnBjc1sweDU5XS5nbG9iYWxEaWFsb2dzLnB1c2goR2xvYmFsRGlhbG9nLm9mKH4weDI0MywgWzB4MWEsIDB4MTJdKSk7XG4gIHJvbS5ucGNzWzB4NWFdLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxM10pKTtcbn1cblxuZnVuY3Rpb24gdGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBpdGVtZ2V0IDAzIHN3b3JkIG9mIHRodW5kZXIgPT4gc2V0IDJmZCBzaHlyb24gd2FycCBwb2ludFxuICByb20uaXRlbUdldHNbMHgwM10uZmxhZ3MucHVzaCgweDJmZCk7XG4gIC8vIGRpYWxvZyA2MiBhc2luYSBpbiBmMi9mNCBzaHlyb24gLT4gYWN0aW9uIDFmICh0ZWxlcG9ydCB0byBzdGFydClcbiAgLy8gICAtIG5vdGU6IGYyIGFuZCBmNCBkaWFsb2dzIGFyZSBsaW5rZWQuXG4gIGZvciAoY29uc3QgaSBvZiBbMCwgMSwgM10pIHtcbiAgICBmb3IgKGNvbnN0IGxvYyBvZiBbMHhmMiwgMHhmNF0pIHtcbiAgICAgIHJvbS5ucGNzWzB4NjJdLmxvY2FsRGlhbG9ncy5nZXQobG9jKSFbaV0ubWVzc2FnZS5hY3Rpb24gPSAweDFmO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gQ2hhbmdlIHN3b3JkIG9mIHRodW5kZXIncyBhY3Rpb24gdG8gYmJlIHRoZSBzYW1lIGFzIG90aGVyIHN3b3JkcyAoMTYpXG4gIHJvbS5pdGVtR2V0c1sweDAzXS5hY3F1aXNpdGlvbkFjdGlvbi5hY3Rpb24gPSAweDE2O1xufVxuXG5mdW5jdGlvbiBhZGp1c3RJdGVtTmFtZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGlmIChmbGFncy5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgIC8vIHJlbmFtZSBsZWF0aGVyIGJvb3RzIHRvIHNwZWVkIGJvb3RzXG4gICAgY29uc3QgbGVhdGhlckJvb3RzID0gcm9tLml0ZW1zWzB4MmZdITtcbiAgICBsZWF0aGVyQm9vdHMubWVudU5hbWUgPSAnU3BlZWQgQm9vdHMnO1xuICAgIGxlYXRoZXJCb290cy5tZXNzYWdlTmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgaWYgKGZsYWdzLmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSkge1xuICAgICAgY29uc3QgZ2FzTWFzayA9IHJvbS5pdGVtc1sweDI5XTtcbiAgICAgIGdhc01hc2subWVudU5hbWUgPSAnSGF6bWF0IFN1aXQnO1xuICAgICAgZ2FzTWFzay5tZXNzYWdlTmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgfVxuICB9XG5cbiAgLy8gcmVuYW1lIGJhbGxzIHRvIG9yYnNcbiAgZm9yIChsZXQgaSA9IDB4MDU7IGkgPCAweDBjOyBpICs9IDIpIHtcbiAgICByb20uaXRlbXNbaV0ubWVudU5hbWUgPSByb20uaXRlbXNbaV0ubWVudU5hbWUucmVwbGFjZSgnQmFsbCcsICdPcmInKTtcbiAgICByb20uaXRlbXNbaV0ubWVzc2FnZU5hbWUgPSByb20uaXRlbXNbaV0ubWVzc2FnZU5hbWUucmVwbGFjZSgnQmFsbCcsICdPcmInKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYWtlQnJhY2VsZXRzUHJvZ3Jlc3NpdmUocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gdG9ybmVsJ3MgdHJpZ2dlciBuZWVkcyBib3RoIGl0ZW1zXG4gIGNvbnN0IHRvcm5lbCA9IHJvbS5ucGNzWzB4NWZdO1xuICBjb25zdCB2YW5pbGxhID0gdG9ybmVsLmxvY2FsRGlhbG9ncy5nZXQoMHgyMSkhO1xuICBjb25zdCBwYXRjaGVkID0gW1xuICAgIHZhbmlsbGFbMF0sIC8vIGFscmVhZHkgbGVhcm5lZCB0ZWxlcG9ydFxuICAgIHZhbmlsbGFbMl0sIC8vIGRvbid0IGhhdmUgdG9ybmFkbyBicmFjZWxldFxuICAgIHZhbmlsbGFbMl0uY2xvbmUoKSwgLy8gd2lsbCBjaGFuZ2UgdG8gZG9uJ3QgaGF2ZSBvcmJcbiAgICB2YW5pbGxhWzFdLCAvLyBoYXZlIGJyYWNlbGV0LCBsZWFybiB0ZWxlcG9ydFxuICBdO1xuICBwYXRjaGVkWzFdLmNvbmRpdGlvbiA9IH4weDIwNjsgLy8gZG9uJ3QgaGF2ZSBicmFjZWxldFxuICBwYXRjaGVkWzJdLmNvbmRpdGlvbiA9IH4weDIwNTsgLy8gZG9uJ3QgaGF2ZSBvcmJcbiAgcGF0Y2hlZFszXS5jb25kaXRpb24gPSB+MDsgICAgIC8vIGRlZmF1bHRcbiAgdG9ybmVsLmxvY2FsRGlhbG9ncy5zZXQoMHgyMSwgcGF0Y2hlZCk7XG59XG5cbmZ1bmN0aW9uIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2YgW3JvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5FYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5LaXJpc2FNZWFkb3ddKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIHNldCB0aGUgbmV3IFwiaW52aXNpYmxlXCIgZmxhZyBvbiB0aGUgY2hlc3QuXG4gICAgICBpZiAoc3Bhd24uaXNDaGVzdCgpKSBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgfVxuICB9XG59XG5cbi8vIEFkZCB0aGUgc3RhdHVlIG9mIG9ueXggYW5kIHBvc3NpYmx5IHRoZSB0ZWxlcG9ydCBibG9jayB0cmlnZ2VyIHRvIENvcmRlbCBXZXN0XG5mdW5jdGlvbiBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIGNvbnN0IHtDb3JkZWxQbGFpbkVhc3QsIENvcmRlbFBsYWluV2VzdH0gPSByb20ubG9jYXRpb25zO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIENvcmRlbFBsYWluRWFzdC5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNDaGVzdCgpIHx8IChmbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiYgc3Bhd24uaXNUcmlnZ2VyKCkpKSB7XG4gICAgICAvLyBDb3B5IGlmICgxKSBpdCdzIHRoZSBjaGVzdCwgb3IgKDIpIHdlJ3JlIGRpc2FibGluZyB0ZWxlcG9ydCBza2lwXG4gICAgICBDb3JkZWxQbGFpbldlc3Quc3Bhd25zLnB1c2goc3Bhd24uY2xvbmUoKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpeFJhYmJpdFNraXAocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9NYWluLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4Nikge1xuICAgICAgaWYgKHNwYXduLnggPT09IDB4NzQwKSB7XG4gICAgICAgIHNwYXduLnggKz0gMTY7XG4gICAgICAgIHNwYXduLnkgKz0gMTY7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFRvd2VyRXhpdChyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7VG93ZXJFbnRyYW5jZSwgQ3J5cHRfVGVsZXBvcnRlcn0gPSByb20ubG9jYXRpb25zO1xuICBjb25zdCBlbnRyYW5jZSA9IENyeXB0X1RlbGVwb3J0ZXIuZW50cmFuY2VzLmxlbmd0aDtcbiAgY29uc3QgZGVzdCA9IENyeXB0X1RlbGVwb3J0ZXIuaWQ7XG4gIENyeXB0X1RlbGVwb3J0ZXIuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3RpbGU6IDB4Njh9KSk7XG4gIFRvd2VyRW50cmFuY2UuZXhpdHMucHVzaChFeGl0Lm9mKHt0aWxlOiAweDU3LCBkZXN0LCBlbnRyYW5jZX0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTgsIGRlc3QsIGVudHJhbmNlfSkpO1xufVxuXG4vLyBQcm9ncmFtbWF0aWNhbGx5IGFkZCBhIGhvbGUgYmV0d2VlbiB2YWxsZXkgb2Ygd2luZCBhbmQgbGltZSB0cmVlIHZhbGxleVxuZnVuY3Rpb24gY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtWYWxsZXlPZldpbmQsIExpbWVUcmVlVmFsbGV5fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgVmFsbGV5T2ZXaW5kLnNjcmVlbnNbNV1bNF0gPSAweDEwOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzFdWzBdID0gMHgxYTsgLy8gbmV3IGV4aXRcbiAgTGltZVRyZWVWYWxsZXkuc2NyZWVuc1syXVswXSA9IDB4MGM7IC8vIG5pY2VyIG1vdW50YWluc1xuXG4gIGNvbnN0IHdpbmRFbnRyYW5jZSA9XG4gICAgICBWYWxsZXlPZldpbmQuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3g6IDB4NGVmLCB5OiAweDU3OH0pKSAtIDE7XG4gIGNvbnN0IGxpbWVFbnRyYW5jZSA9XG4gICAgICBMaW1lVHJlZVZhbGxleS5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHgwMTAsIHk6IDB4MWMwfSkpIC0gMTtcblxuICBWYWxsZXlPZldpbmQuZXhpdHMucHVzaChcbiAgICAgIEV4aXQub2Yoe3g6IDB4NGYwLCB5OiAweDU2MCwgZGVzdDogMHg0MiwgZW50cmFuY2U6IGxpbWVFbnRyYW5jZX0pLFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTcwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSkpO1xuICBMaW1lVHJlZVZhbGxleS5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHgwMDAsIHk6IDB4MWIwLCBkZXN0OiAweDAzLCBlbnRyYW5jZTogd2luZEVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYzAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSk7XG59XG5cbmZ1bmN0aW9uIGNsb3NlQ2F2ZUVudHJhbmNlcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gUHJldmVudCBzb2Z0bG9jayBmcm9tIGV4aXRpbmcgc2VhbGVkIGNhdmUgYmVmb3JlIHdpbmRtaWxsIHN0YXJ0ZWRcbiAgcm9tLmxvY2F0aW9ucy5WYWxsZXlPZldpbmQuZW50cmFuY2VzWzFdLnkgKz0gMTY7XG5cbiAgLy8gQ2xlYXIgdGlsZXMgMSwyLDMsNCBmb3IgYmxvY2thYmxlIGNhdmVzIGluIHRpbGVzZXRzIDkwLCA5NCwgYW5kIDljXG4gIHJvbS5zd2FwTWV0YXRpbGVzKFsweDkwXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MDcsIFsweDAxLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwZSwgWzB4MDIsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDIwLCBbMHgwMywgMHgwYV0sIH4weGQ3XSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjEsIFsweDA0LCAweDBhXSwgfjB4ZDddKTtcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTQsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgICBbMHg2OCwgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDgzLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODgsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuXG4gIC8vIE5vdyByZXBsYWNlIHRoZSB0aWxlcyB3aXRoIHRoZSBibG9ja2FibGUgb25lc1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDM4XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzldID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHg0OF0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ5XSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg3OV0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDdhXSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4ODldID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4YV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NDhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDU4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NTldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDU2XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTddID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg2Nl0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY3XSA9IDB4MDQ7XG5cbiAgLy8gRGVzdHJ1Y3R1cmUgb3V0IGEgZmV3IGxvY2F0aW9ucyBieSBuYW1lXG4gIGNvbnN0IHtcbiAgICBWYWxsZXlPZldpbmQsXG4gICAgQ29yZGVsUGxhaW5XZXN0LFxuICAgIENvcmRlbFBsYWluRWFzdCxcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aCxcbiAgICBXYXRlcmZhbGxWYWxsZXlTb3V0aCxcbiAgICBLaXJpc2FNZWFkb3csXG4gICAgU2FoYXJhT3V0c2lkZUNhdmUsXG4gICAgRGVzZXJ0MixcbiAgfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgLy8gTk9URTogZmxhZyAyZjAgaXMgQUxXQVlTIHNldCAtIHVzZSBpdCBhcyBhIGJhc2VsaW5lLlxuICBjb25zdCBmbGFnc1RvQ2xlYXI6IFtMb2NhdGlvbiwgbnVtYmVyXVtdID0gW1xuICAgIFtWYWxsZXlPZldpbmQsIDB4MzBdLCAvLyB2YWxsZXkgb2Ygd2luZCwgemVidSdzIGNhdmVcbiAgICBbQ29yZGVsUGxhaW5XZXN0LCAweDMwXSwgLy8gY29yZGVsIHdlc3QsIHZhbXBpcmUgY2F2ZVxuICAgIFtDb3JkZWxQbGFpbkVhc3QsIDB4MzBdLCAvLyBjb3JkZWwgZWFzdCwgdmFtcGlyZSBjYXZlXG4gICAgW1dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDAwXSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBwcmlzb24gY2F2ZVxuICAgIFtXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgxNF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgZm9nIGxhbXBcbiAgICBbV2F0ZXJmYWxsVmFsbGV5U291dGgsIDB4NzRdLCAvLyB3YXRlcmZhbGwgc291dGgsIGtpcmlzYVxuICAgIFtLaXJpc2FNZWFkb3csIDB4MTBdLCAvLyBraXJpc2EgbWVhZG93XG4gICAgW1NhaGFyYU91dHNpZGVDYXZlLCAweDAwXSwgLy8gY2F2ZSB0byBkZXNlcnRcbiAgICBbRGVzZXJ0MiwgMHg0MV0sXG4gIF07XG4gIGlmIChmbGFncy5hZGRFYXN0Q2F2ZSgpICYmIGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgZmxhZ3NUb0NsZWFyLnB1c2goW3JvbS5sb2NhdGlvbnMuTGltZVRyZWVWYWxsZXksIDB4MTBdKTtcbiAgfVxuICBmb3IgKGNvbnN0IFtsb2MsIHl4XSBvZiBmbGFnc1RvQ2xlYXIpIHtcbiAgICBsb2MuZmxhZ3MucHVzaChGbGFnLm9mKHt5eCwgZmxhZzogMHgyZjB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlRmxhZyhsb2M6IExvY2F0aW9uLCB5eDogbnVtYmVyLCBmbGFnOiBudW1iZXIpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICBpZiAoZi55eCA9PT0geXgpIHtcbiAgICAgICAgZi5mbGFnID0gZmxhZztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGZsYWcgdG8gcmVwbGFjZSBhdCAke2xvY306JHt5eH1gKTtcbiAgfTtcblxuICBpZiAoZmxhZ3MucGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKSkgeyAvLyBjbG9zZSBvZmYgcmV2ZXJzZSBlbnRyYW5jZXNcbiAgICAvLyBOT1RFOiB3ZSBjb3VsZCBhbHNvIGNsb3NlIGl0IG9mZiB1bnRpbCBib3NzIGtpbGxlZC4uLj9cbiAgICAvLyAgLSBjb25zdCB2YW1waXJlRmxhZyA9IH5yb20ubnBjU3Bhd25zWzB4YzBdLmNvbmRpdGlvbnNbMHgwYV1bMF07XG4gICAgLy8gIC0+IGtlbGJlc3F1ZSBmb3IgdGhlIG90aGVyIG9uZS5cbiAgICBjb25zdCB3aW5kbWlsbEZsYWcgPSAweDJlZTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbldlc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG4gICAgcmVwbGFjZUZsYWcoQ29yZGVsUGxhaW5FYXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuXG4gICAgcmVwbGFjZUZsYWcoV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDAsIDB4MmQ4KTsgLy8ga2V5IHRvIHByaXNvbiBmbGFnXG4gICAgY29uc3QgZXhwbG9zaW9uID0gU3Bhd24ub2Yoe3k6IDB4MDYwLCB4OiAweDA2MCwgdHlwZTogNCwgaWQ6IDB4MmN9KTtcbiAgICBjb25zdCBrZXlUcmlnZ2VyID0gU3Bhd24ub2Yoe3k6IDB4MDcwLCB4OiAweDA3MCwgdHlwZTogMiwgaWQ6IDB4YWR9KTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMuc3BsaWNlKDEsIDAsIGV4cGxvc2lvbik7XG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLnB1c2goa2V5VHJpZ2dlcik7XG4gIH1cblxuICAvLyByb20ubG9jYXRpb25zWzB4MTRdLnRpbGVFZmZlY3RzID0gMHhiMztcblxuICAvLyBkNyBmb3IgMz9cblxuICAvLyBUT0RPIC0gdGhpcyBlbmRlZCB1cCB3aXRoIG1lc3NhZ2UgMDA6MDMgYW5kIGFuIGFjdGlvbiB0aGF0IGdhdmUgYm93IG9mIG1vb24hXG5cbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UucGFydCA9IDB4MWI7XG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5tZXNzYWdlLmluZGV4ID0gMHgwODtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLmZsYWdzLnB1c2goMHgyZjYsIDB4MmY3LCAweDJmOCk7XG59XG5cbi8vIEB0cy1pZ25vcmU6IG5vdCB5ZXQgdXNlZFxuZnVuY3Rpb24gZWFzdENhdmUocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIC8vIFRPRE8gZmlsbCB1cCBncmFwaGljcywgZXRjIC0tPiAkMWEsICQxYiwgJDA1IC8gJDg4LCAkYjUgLyAkMTQsICQwMlxuICAvLyBUaGluayBhb2J1dCBleGl0cyBhbmQgZW50cmFuY2VzLi4uP1xuXG4gIGNvbnN0IHtWYWxsZXlPZldpbmQsIExpbWVUcmVlVmFsbGV5LCBTZWFsZWRDYXZlMX0gPSByb20ubG9jYXRpb25zO1xuXG4gIGNvbnN0IGxvYzEgPSByb20ubG9jYXRpb25zLmFsbG9jYXRlKHJvbS5sb2NhdGlvbnMuRWFzdENhdmUxKTtcbiAgY29uc3QgbG9jMiA9IHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUocm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTIpO1xuXG4gIC8vIE5PVEU6IDB4OWMgY2FuIGJlY29tZSAweDk5IGluIHRvcCBsZWZ0IG9yIDB4OTcgaW4gdG9wIHJpZ2h0IG9yIGJvdHRvbSBtaWRkbGUgZm9yIGEgY2F2ZSBleGl0XG4gIGxvYzEuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg4MCwgMHg4MywgMHg5Y10sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MywgMHg4NiwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MywgMHg4OCwgMHg4OSwgMHg4MCwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MSwgMHg4YywgMHg4NSwgMHg4MiwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5ZSwgMHg4NSwgMHg5YywgMHg5OCwgMHg4Nl1dO1xuXG4gIGxvYzIuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg5YiwgMHg4MCwgMHg5Yl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MSwgMHg4MCwgMHg4MV0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4NywgMHg4YiwgMHg4YSwgMHg4Nl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4YywgMHg4MCwgMHg4NSwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5YywgMHg4NiwgMHg4MCwgMHg4MCwgMHg5YV1dO1xuXG4gIGZvciAoY29uc3QgbCBvZiBbbG9jMSwgbG9jMl0pIHtcbiAgICBsLmJnbSA9IDB4MTc7IC8vIG10IHNhYnJlIGNhdmUgbXVzaWM/XG4gICAgbC5lbnRyYW5jZXMgPSBbXTtcbiAgICBsLmV4aXRzID0gW107XG4gICAgbC5waXRzID0gW107XG4gICAgbC5zcGF3bnMgPSBbXTtcbiAgICBsLmZsYWdzID0gW107XG4gICAgbC5oZWlnaHQgPSBsLnNjcmVlbnMubGVuZ3RoO1xuICAgIGwud2lkdGggPSBsLnNjcmVlbnNbMF0ubGVuZ3RoO1xuICAgIGwuZXh0ZW5kZWQgPSAwO1xuICAgIGwudGlsZVBhbGV0dGVzID0gWzB4MWEsIDB4MWIsIDB4MDVdO1xuICAgIGwudGlsZXNldCA9IDB4ODg7XG4gICAgbC50aWxlRWZmZWN0cyA9IDB4YjU7XG4gICAgbC50aWxlUGF0dGVybnMgPSBbMHgxNCwgMHgwMl07XG4gICAgbC5zcHJpdGVQYXR0ZXJucyA9IFsuLi5TZWFsZWRDYXZlMS5zcHJpdGVQYXR0ZXJuc10gYXMgW251bWJlciwgbnVtYmVyXTtcbiAgICBsLnNwcml0ZVBhbGV0dGVzID0gWy4uLlNlYWxlZENhdmUxLnNwcml0ZVBhbGV0dGVzXSBhcyBbbnVtYmVyLCBudW1iZXJdO1xuICB9XG5cbiAgLy8gQWRkIGVudHJhbmNlIHRvIHZhbGxleSBvZiB3aW5kXG4gIC8vIFRPRE8gLSBtYXliZSBqdXN0IGRvICgweDMzLCBbWzB4MTldXSkgb25jZSB3ZSBmaXggdGhhdCBzY3JlZW4gZm9yIGdyYXNzXG4gIFZhbGxleU9mV2luZC53cml0ZVNjcmVlbnMyZCgweDIzLCBbXG4gICAgWzB4MTEsIDB4MGRdLFxuICAgIFsweDA5LCAweGMyXV0pO1xuICByb20udGlsZUVmZmVjdHNbMF0uZWZmZWN0c1sweGMwXSA9IDA7XG4gIC8vIFRPRE8gLSBkbyB0aGlzIG9uY2Ugd2UgZml4IHRoZSBzZWEgdGlsZXNldFxuICAvLyByb20uc2NyZWVuc1sweGMyXS50aWxlc1sweDVhXSA9IDB4MGE7XG4gIC8vIHJvbS5zY3JlZW5zWzB4YzJdLnRpbGVzWzB4NWJdID0gMHgwYTtcblxuICAvLyBDb25uZWN0IG1hcHNcbiAgbG9jMS5jb25uZWN0KDB4NDMsIGxvYzIsIDB4NDQpO1xuICBsb2MxLmNvbm5lY3QoMHg0MCwgVmFsbGV5T2ZXaW5kLCAweDM0KTtcblxuICBpZiAoZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICAvLyBBZGQgZW50cmFuY2UgdG8gbGltZSB0cmVlIHZhbGxleVxuICAgIExpbWVUcmVlVmFsbGV5LnJlc2l6ZVNjcmVlbnMoMCwgMSwgMCwgMCk7IC8vIGFkZCBvbmUgc2NyZWVuIHRvIGxlZnQgZWRnZVxuICAgIExpbWVUcmVlVmFsbGV5LndyaXRlU2NyZWVuczJkKDB4MDAsIFtcbiAgICAgIFsweDBjLCAweDExXSxcbiAgICAgIFsweDE1LCAweDM2XSxcbiAgICAgIFsweDBlLCAweDBmXV0pO1xuICAgIGxvYzEuc2NyZWVuc1swXVs0XSA9IDB4OTc7IC8vIGRvd24gc3RhaXJcbiAgICBsb2MxLmNvbm5lY3QoMHgwNCwgTGltZVRyZWVWYWxsZXksIDB4MTApO1xuICB9XG5cbiAgLy8gQWRkIG1vbnN0ZXJzXG4gIGxvYzEuc3Bhd25zLnB1c2goXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgyMSwgdGlsZTogMHg4NywgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEyLCB0aWxlOiAweDg4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEzLCB0aWxlOiAweDg5LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzIsIHRpbGU6IDB4NjgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4NDEsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMywgdGlsZTogMHg5OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDAzLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICApO1xuICBsb2MyLnNwYXducy5wdXNoKFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MDEsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMSwgdGlsZTogMHg0OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMiwgdGlsZTogMHg3NywgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDE0LCB0aWxlOiAweDI4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDIzLCB0aWxlOiAweDg1LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzEsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMywgdGlsZTogMHg4YSwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzNCwgdGlsZTogMHg5OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDQxLCB0aWxlOiAweDgyLCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICApO1xuICBpZiAoIWZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkpIHtcbiAgICAvLyBjaGVzdDogYWxhcm0gZmx1dGVcbiAgICBsb2MyLnNwYXducy5wdXNoKFNwYXduLm9mKHt5OiAweDExMCwgeDogMHg0NzgsIHR5cGU6IDIsIGlkOiAweDMxfSkpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBhZGRab21iaWVXYXJwKHJvbTogUm9tKSB7XG4gIC8vIE1ha2Ugc3BhY2UgZm9yIHRoZSBuZXcgZmxhZyBiZXR3ZWVuIEpvZWwgYW5kIFN3YW5cbiAgZm9yIChsZXQgaSA9IDB4MmY1OyBpIDwgMHgyZmM7IGkrKykge1xuICAgIHJvbS5tb3ZlRmxhZyhpLCBpIC0gMSk7XG4gIH1cbiAgLy8gVXBkYXRlIHRoZSBtZW51XG4gIGNvbnN0IG1lc3NhZ2UgPSByb20ubWVzc2FnZXMucGFydHNbMHgyMV1bMF07XG4gIG1lc3NhZ2UudGV4dCA9IFtcbiAgICAnIHsxYTpMZWFmfSAgICAgIHsxNjpCcnlubWFlcn0gezFkOk9ha30gJyxcbiAgICAnezBjOk5hZGFyZX1cXCdzICB7MWU6UG9ydG9hfSAgIHsxNDpBbWF6b25lc30gJyxcbiAgICAnezE5OkpvZWx9ICAgICAgWm9tYmllICAgezIwOlN3YW59ICcsXG4gICAgJ3syMzpTaHlyb259ICAgIHsxODpHb2F9ICAgICAgezIxOlNhaGFyYX0nLFxuICBdLmpvaW4oJ1xcbicpO1xuICAvLyBBZGQgYSB0cmlnZ2VyIHRvIHRoZSBlbnRyYW5jZSAtIHRoZXJlJ3MgYWxyZWFkeSBhIHNwYXduIGZvciA4YVxuICAvLyBidXQgd2UgY2FuJ3QgcmV1c2UgdGhhdCBzaW5jZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBvbmUgb3V0c2lkZVxuICAvLyB0aGUgbWFpbiBFU0kgZW50cmFuY2U7IHNvIHJldXNlIGEgZGlmZmVyZW50IG9uZS5cbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW107XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZmJdOyAvLyBuZXcgd2FycCBwb2ludCBmbGFnXG4gIC8vIEFjdHVhbGx5IHJlcGxhY2UgdGhlIHRyaWdnZXIuXG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4YSkge1xuICAgICAgc3Bhd24uaWQgPSB0cmlnZ2VyLmlkO1xuICAgIH0gICAgXG4gIH1cbiAgLy8gSW5zZXJ0IGludG8gdGhlIHdhcnAgdGFibGUuXG4gIGZvciAobGV0IGkgPSAweDNkYzYyOyBpID49IDB4M2RjNWY7IGktLSkge1xuICAgIHJvbS5wcmdbaSArIDFdID0gcm9tLnByZ1tpXTtcbiAgfVxuICByb20ucHJnWzB4M2RjNWZdID0gcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLmlkO1xuICAvLyBBU00gZml4ZXMgc2hvdWxkIGhhdmUgaGFwcGVuZWQgaW4gcHJlc2h1ZmZsZS5zXG59XG5cbmZ1bmN0aW9uIGV2aWxTcGlyaXRJc2xhbmRSZXF1aXJlc0RvbHBoaW4ocm9tOiBSb20pIHtcbiAgcm9tLnRyaWdnZXIoMHg4YSkuY29uZGl0aW9ucyA9IFt+MHgwZWVdOyAvLyBuZXcgZmxhZyBmb3IgcmlkaW5nIGRvbHBoaW5cbiAgcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MWRdWzB4MTBdLnRleHQgPSBgVGhlIGNhdmUgZW50cmFuY2UgYXBwZWFyc1xudG8gYmUgdW5kZXJ3YXRlci4gWW91J2xsXG5uZWVkIHRvIHN3aW0uYDtcbn1cblxuZnVuY3Rpb24gcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbTogUm9tKSB7XG4gIC8vIEFsbG93IG9wZW5pbmcgU3dhbiBmcm9tIGVpdGhlciBzaWRlIGJ5IGFkZGluZyBhIHBhaXIgb2YgZ3VhcmRzIG9uIHRoZVxuICAvLyBvcHBvc2l0ZSBzaWRlIG9mIHRoZSBnYXRlLlxuICByb20ubG9jYXRpb25zWzB4NzNdLnNwYXducy5wdXNoKFxuICAgIC8vIE5PVEU6IFNvbGRpZXJzIG11c3QgY29tZSBpbiBwYWlycyAod2l0aCBpbmRleCBeMSBmcm9tIGVhY2ggb3RoZXIpXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBhLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGIsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwZSwgeXQ6IDB4MGEsIHR5cGU6IDIsIGlkOiAweGIzfSksIC8vIG5ldyB0cmlnZ2VyOiBlcmFzZSBndWFyZHNcbiAgKTtcblxuICAvLyBHdWFyZHMgKCQyZCkgYXQgc3dhbiBnYXRlICgkNzMpIH4gc2V0IDEwZCBhZnRlciBvcGVuaW5nIGdhdGUgPT4gY29uZGl0aW9uIGZvciBkZXNwYXduXG4gIHJvbS5ucGNzWzB4MmRdLmxvY2FsRGlhbG9ncy5nZXQoMHg3MykhWzBdLmZsYWdzLnB1c2goMHgxMGQpO1xuXG4gIC8vIERlc3Bhd24gZ3VhcmQgdHJpZ2dlciByZXF1aXJlcyAxMGRcbiAgcm9tLnRyaWdnZXIoMHhiMykuY29uZGl0aW9ucy5wdXNoKDB4MTBkKTtcbn1cblxuZnVuY3Rpb24gcHJldmVudE5wY0Rlc3Bhd25zKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBmdW5jdGlvbiByZW1vdmU8VD4oYXJyOiBUW10sIGVsZW06IFQpOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5pbmRleE9mKGVsZW0pO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCAke2VsZW19IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZUlmPFQ+KGFycjogVFtdLCBwcmVkOiAoZWxlbTogVCkgPT4gYm9vbGVhbik6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmZpbmRJbmRleChwcmVkKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cblxuICBmdW5jdGlvbiBkaWFsb2coaWQ6IG51bWJlciwgbG9jOiBudW1iZXIgPSAtMSk6IExvY2FsRGlhbG9nW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5sb2NhbERpYWxvZ3MuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBkaWFsb2cgJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBzcGF3bnMoaWQ6IG51bWJlciwgbG9jOiBudW1iZXIpOiBudW1iZXJbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHNwYXduIGNvbmRpdGlvbiAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gTGluayBzb21lIHJlZHVuZGFudCBOUENzOiBLZW5zdSAoN2UsIDc0KSBhbmQgQWthaGFuYSAoODgsIDE2KVxuICByb20ubnBjc1sweDc0XS5saW5rKDB4N2UpO1xuICByb20ubnBjc1sweDc0XS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg3NF0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDdlXS5kYXRhXSBhcyBhbnk7XG4gIHJvbS5sb2NhdGlvbnMuU3dhbl9EYW5jZUhhbGwuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHg3ZSkhLmlkID0gMHg3NDtcbiAgcm9tLml0ZW1zWzB4M2JdLnRyYWRlSW4hWzBdID0gMHg3NDtcblxuICAvLyBkaWFsb2cgaXMgc2hhcmVkIGJldHdlZW4gODggYW5kIDE2LlxuICByb20ubnBjc1sweDg4XS5saW5rRGlhbG9nKDB4MTYpO1xuXG4gIC8vIE1ha2UgYSBuZXcgTlBDIGZvciBBa2FoYW5hIGluIEJyeW5tYWVyOyBvdGhlcnMgd29uJ3QgYWNjZXB0IHRoZSBTdGF0dWUgb2YgT255eC5cbiAgLy8gTGlua2luZyBzcGF3biBjb25kaXRpb25zIGFuZCBkaWFsb2dzIGlzIHN1ZmZpY2llbnQsIHNpbmNlIHRoZSBhY3R1YWwgTlBDIElEXG4gIC8vICgxNiBvciA4MikgaXMgd2hhdCBtYXR0ZXJzIGZvciB0aGUgdHJhZGUtaW5cbiAgcm9tLm5wY3NbMHg4Ml0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4ODJdLmxpbmsoMHgxNik7XG4gIHJvbS5ucGNzWzB4ODJdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHgxNl0uZGF0YV0gYXMgYW55OyAvLyBlbnN1cmUgZ2l2ZSBpdGVtXG4gIHJvbS5sb2NhdGlvbnMuQnJ5bm1hZXIuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHgxNikhLmlkID0gMHg4MjtcbiAgcm9tLml0ZW1zWzB4MjVdLnRyYWRlSW4hWzBdID0gMHg4MjtcblxuICAvLyBMZWFmIGVsZGVyIGluIGhvdXNlICgkMGQgQCAkYzApIH4gc3dvcmQgb2Ygd2luZCByZWR1bmRhbnQgZmxhZ1xuICAvLyBkaWFsb2coMHgwZCwgMHhjMClbMl0uZmxhZ3MgPSBbXTtcbiAgLy9yb20uaXRlbUdldHNbMHgwMF0uZmxhZ3MgPSBbXTsgLy8gY2xlYXIgcmVkdW5kYW50IGZsYWdcblxuICAvLyBMZWFmIHJhYmJpdCAoJDEzKSBub3JtYWxseSBzdG9wcyBzZXR0aW5nIGl0cyBmbGFnIGFmdGVyIHByaXNvbiBkb29yIG9wZW5lZCxcbiAgLy8gYnV0IHRoYXQgZG9lc24ndCBuZWNlc3NhcmlseSBvcGVuIG10IHNhYnJlLiAgSW5zdGVhZCAoYSkgdHJpZ2dlciBvbiAwNDdcbiAgLy8gKHNldCBieSA4ZCB1cG9uIGVudGVyaW5nIGVsZGVyJ3MgY2VsbCkuICBBbHNvIG1ha2Ugc3VyZSB0aGF0IHRoYXQgcGF0aCBhbHNvXG4gIC8vIHByb3ZpZGVzIHRoZSBuZWVkZWQgZmxhZyB0byBnZXQgaW50byBtdCBzYWJyZS5cbiAgZGlhbG9nKDB4MTMpWzJdLmNvbmRpdGlvbiA9IDB4MDQ3O1xuICBkaWFsb2coMHgxMylbMl0uZmxhZ3MgPSBbMHgwYTldO1xuICBkaWFsb2coMHgxMylbM10uZmxhZ3MgPSBbMHgwYTldO1xuXG4gIC8vIFdpbmRtaWxsIGd1YXJkICgkMTQgQCAkMGUpIHNob3VsZG4ndCBkZXNwYXduIGFmdGVyIGFiZHVjdGlvbiAoMDM4KSxcbiAgLy8gYnV0IGluc3RlYWQgYWZ0ZXIgZ2l2aW5nIHRoZSBpdGVtICgwODgpXG4gIHNwYXducygweDE0LCAweDBlKVsxXSA9IH4weDA4ODsgLy8gcmVwbGFjZSBmbGFnIH4wMzggPT4gfjA4OFxuICAvL2RpYWxvZygweDE0LCAweDBlKVswXS5mbGFncyA9IFtdOyAvLyByZW1vdmUgcmVkdW5kYW50IGZsYWcgfiB3aW5kbWlsbCBrZXlcblxuICAvLyBBa2FoYW5hICgkMTYgLyA4OCkgfiBzaGllbGQgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDE2LCAweDU3KVswXS5mbGFncyA9IFtdO1xuICAvLyBEb24ndCBkaXNhcHBlYXIgYWZ0ZXIgZ2V0dGluZyBiYXJyaWVyIChub3RlIDg4J3Mgc3Bhd25zIG5vdCBsaW5rZWQgdG8gMTYpXG4gIHJlbW92ZShzcGF3bnMoMHgxNiwgMHg1NyksIH4weDA1MSk7XG4gIHJlbW92ZShzcGF3bnMoMHg4OCwgMHg1NyksIH4weDA1MSk7XG5cbiAgZnVuY3Rpb24gcmV2ZXJzZURpYWxvZyhkczogTG9jYWxEaWFsb2dbXSk6IHZvaWQge1xuICAgIGRzLnJldmVyc2UoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBuZXh0ID0gZHNbaSArIDFdO1xuICAgICAgZHNbaV0uY29uZGl0aW9uID0gbmV4dCA/IH5uZXh0LmNvbmRpdGlvbiA6IH4wO1xuICAgIH1cbiAgfTtcblxuICAvLyBPYWsgZWxkZXIgKCQxZCkgfiBzd29yZCBvZiBmaXJlIHJlZHVuZGFudCBmbGFnXG4gIGNvbnN0IG9ha0VsZGVyRGlhbG9nID0gZGlhbG9nKDB4MWQpO1xuICAvL29ha0VsZGVyRGlhbG9nWzRdLmZsYWdzID0gW107XG4gIC8vIE1ha2Ugc3VyZSB0aGF0IHdlIHRyeSB0byBnaXZlIHRoZSBpdGVtIGZyb20gKmFsbCogcG9zdC1pbnNlY3QgZGlhbG9nc1xuICBvYWtFbGRlckRpYWxvZ1swXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMl0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1szXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG5cbiAgLy8gT2FrIG1vdGhlciAoJDFlKSB+IGluc2VjdCBmbHV0ZSByZWR1bmRhbnQgZmxhZ1xuICAvLyBUT0RPIC0gcmVhcnJhbmdlIHRoZXNlIGZsYWdzIGEgYml0IChtYXliZSB+MDQ1LCB+MGEwIH4wNDEgLSBzbyByZXZlcnNlKVxuICAvLyAgICAgIC0gd2lsbCBuZWVkIHRvIGNoYW5nZSBiYWxsT2ZGaXJlIGFuZCBpbnNlY3RGbHV0ZSBpbiBkZXBncmFwaFxuICBjb25zdCBvYWtNb3RoZXJEaWFsb2cgPSBkaWFsb2coMHgxZSk7XG4gICgoKSA9PiB7XG4gICAgY29uc3QgW2tpbGxlZEluc2VjdCwgZ290SXRlbSwgZ2V0SXRlbSwgZmluZENoaWxkXSA9IG9ha01vdGhlckRpYWxvZztcbiAgICBmaW5kQ2hpbGQuY29uZGl0aW9uID0gfjB4MDQ1O1xuICAgIC8vZ2V0SXRlbS5jb25kaXRpb24gPSB+MHgyMjc7XG4gICAgLy9nZXRJdGVtLmZsYWdzID0gW107XG4gICAgZ290SXRlbS5jb25kaXRpb24gPSB+MDtcbiAgICByb20ubnBjc1sweDFlXS5sb2NhbERpYWxvZ3Muc2V0KC0xLCBbZmluZENoaWxkLCBnZXRJdGVtLCBraWxsZWRJbnNlY3QsIGdvdEl0ZW1dKTtcbiAgfSkoKTtcbiAgLy8vIG9ha01vdGhlckRpYWxvZ1syXS5mbGFncyA9IFtdO1xuICAvLyAvLyBFbnN1cmUgd2UgYWx3YXlzIGdpdmUgaXRlbSBhZnRlciBpbnNlY3QuXG4gIC8vIG9ha01vdGhlckRpYWxvZ1swXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIC8vIG9ha01vdGhlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIC8vIHJldmVyc2VEaWFsb2cob2FrTW90aGVyRGlhbG9nKTtcblxuICAvLyBSZXZlcnNlIHRoZSBvdGhlciBvYWsgZGlhbG9ncywgdG9vLlxuICBmb3IgKGNvbnN0IGkgb2YgWzB4MjAsIDB4MjEsIDB4MjIsIDB4N2MsIDB4N2RdKSB7XG4gICAgcmV2ZXJzZURpYWxvZyhkaWFsb2coaSkpO1xuICB9XG5cbiAgLy8gU3dhcCB0aGUgZmlyc3QgdHdvIG9hayBjaGlsZCBkaWFsb2dzLlxuICBjb25zdCBvYWtDaGlsZERpYWxvZyA9IGRpYWxvZygweDFmKTtcbiAgb2FrQ2hpbGREaWFsb2cudW5zaGlmdCguLi5vYWtDaGlsZERpYWxvZy5zcGxpY2UoMSwgMSkpO1xuXG4gIC8vIFRocm9uZSByb29tIGJhY2sgZG9vciBndWFyZCAoJDMzIEAgJGRmKSBzaG91bGQgaGF2ZSBzYW1lIHNwYXduIGNvbmRpdGlvbiBhcyBxdWVlblxuICAvLyAoMDIwIE5PVCBxdWVlbiBub3QgaW4gdGhyb25lIHJvb20gQU5EIDAxYiBOT1Qgdmlld2VkIG1lc2lhIHJlY29yZGluZylcbiAgcm9tLm5wY3NbMHgzM10uc3Bhd25Db25kaXRpb25zLnNldCgweGRmLCAgW34weDAyMCwgfjB4MDFiXSk7XG5cbiAgLy8gRnJvbnQgcGFsYWNlIGd1YXJkICgkMzQpIHZhY2F0aW9uIG1lc3NhZ2Uga2V5cyBvZmYgMDFiIGluc3RlYWQgb2YgMDFmXG4gIGRpYWxvZygweDM0KVsxXS5jb25kaXRpb24gPSAweDAxYjtcblxuICAvLyBRdWVlbidzICgkMzgpIGRpYWxvZyBuZWVkcyBxdWl0ZSBhIGJpdCBvZiB3b3JrXG4gIC8vIEdpdmUgaXRlbSAoZmx1dGUgb2YgbGltZSkgZXZlbiBpZiBnb3QgdGhlIHN3b3JkIG9mIHdhdGVyXG4gIGRpYWxvZygweDM4KVszXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7IC8vIFwieW91IGZvdW5kIHN3b3JkXCIgPT4gYWN0aW9uIDNcbiAgZGlhbG9nKDB4MzgpWzRdLmZsYWdzLnB1c2goMHgwOWMpOyAgICAgLy8gc2V0IDA5YyBxdWVlbiBnb2luZyBhd2F5XG4gIC8vIFF1ZWVuIHNwYXduIGNvbmRpdGlvbiBkZXBlbmRzIG9uIDAxYiAobWVzaWEgcmVjb3JkaW5nKSBub3QgMDFmIChiYWxsIG9mIHdhdGVyKVxuICAvLyBUaGlzIGVuc3VyZXMgeW91IGhhdmUgYm90aCBzd29yZCBhbmQgYmFsbCB0byBnZXQgdG8gaGVyICg/Pz8pXG4gIHNwYXducygweDM4LCAweGRmKVsxXSA9IH4weDAxYjsgIC8vIHRocm9uZSByb29tOiAwMWIgTk9UIG1lc2lhIHJlY29yZGluZ1xuICBzcGF3bnMoMHgzOCwgMHhlMSlbMF0gPSAweDAxYjsgICAvLyBiYWNrIHJvb206IDAxYiBtZXNpYSByZWNvcmRpbmdcbiAgZGlhbG9nKDB4MzgpWzFdLmNvbmRpdGlvbiA9IDB4MDFiOyAgICAgLy8gcmV2ZWFsIGNvbmRpdGlvbjogMDFiIG1lc2lhIHJlY29yZGluZ1xuXG4gIC8vIEZvcnR1bmUgdGVsbGVyICgkMzkpIHNob3VsZCBhbHNvIG5vdCBzcGF3biBiYXNlZCBvbiBtZXNpYSByZWNvcmRpbmcgcmF0aGVyIHRoYW4gb3JiXG4gIHNwYXducygweDM5LCAweGQ4KVsxXSA9IH4weDAxYjsgIC8vIGZvcnR1bmUgdGVsbGVyIHJvb206IDAxYiBOT1RcblxuICAvLyBDbGFyayAoJDQ0KSBtb3ZlcyBhZnRlciB0YWxraW5nIHRvIGhpbSAoMDhkKSByYXRoZXIgdGhhbiBjYWxtaW5nIHNlYSAoMDhmKS5cbiAgLy8gVE9ETyAtIGNoYW5nZSAwOGQgdG8gd2hhdGV2ZXIgYWN0dWFsIGl0ZW0gaGUgZ2l2ZXMsIHRoZW4gcmVtb3ZlIGJvdGggZmxhZ3NcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU5LCBbfjB4MDhkXSk7IC8vIHpvbWJpZSB0b3duIGJhc2VtZW50XG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlNCwgWzB4MDhkXSk7ICAvLyBqb2VsIHNoZWRcbiAgLy9kaWFsb2coMHg0NCwgMHhlOSlbMV0uZmxhZ3MucG9wKCk7IC8vIHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG5cbiAgLy8gQnJva2FoYW5hICgkNTQpIH4gd2FycmlvciByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NTQpWzJdLmZsYWdzID0gW107XG5cbiAgLy8gRGVvICgkNWEpIH4gcGVuZGFudCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVhKVsxXS5mbGFncyA9IFtdO1xuXG4gIC8vIFplYnUgKCQ1ZSkgY2F2ZSBkaWFsb2cgKEAgJDEwKVxuICAvLyBUT0RPIC0gZGlhbG9ncygweDVlLCAweDEwKS5yZWFycmFuZ2UofjB4MDNhLCAweDAwZCwgMHgwMzgsIDB4MDM5LCAweDAwYSwgfjB4MDAwKTtcbiAgcm9tLm5wY3NbMHg1ZV0ubG9jYWxEaWFsb2dzLnNldCgweDEwLCBbXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDNhLCBbMHgwMCwgMHgxYV0sIFsweDAzYV0pLCAvLyAwM2EgTk9UIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgLT4gU2V0IDAzYVxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwZCwgWzB4MDAsIDB4MWRdKSwgLy8gMDBkIGxlYWYgdmlsbGFnZXJzIHJlc2N1ZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzgsIFsweDAwLCAweDFjXSksIC8vIDAzOCBsZWFmIGF0dGFja2VkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM5LCBbMHgwMCwgMHgxZF0pLCAvLyAwMzkgbGVhcm5lZCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBhLCBbMHgwMCwgMHgxYiwgMHgwM10pLCAvLyAwMGEgd2luZG1pbGwga2V5IHVzZWQgLT4gdGVhY2ggcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKH4weDAwMCwgWzB4MDAsIDB4MWRdKSxcbiAgXSk7XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJlbW92ZShzcGF3bnMoMHg1ZSwgMHgxMCksIH4weDA1MSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFRvcm5lbCAoJDVmKSBpbiBzYWJyZSB3ZXN0ICgkMjEpIH4gdGVsZXBvcnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1ZiwgMHgyMSlbMV0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg1Zl0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDIxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gU3RvbSAoJDYwKTogZG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg2MF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDFlKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gQXNpbmEgKCQ2MikgaW4gYmFjayByb29tICgkZTEpIGdpdmVzIGZsdXRlIG9mIGxpbWVcbiAgY29uc3QgYXNpbmEgPSByb20ubnBjc1sweDYyXTtcbiAgYXNpbmEuZGF0YVsxXSA9IDB4Mjg7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgLy8gUHJldmVudCBkZXNwYXduIGZyb20gYmFjayByb29tIGFmdGVyIGRlZmVhdGluZyBzYWJlcmEgKH4wOGYpXG4gIHJlbW92ZShzcGF3bnMoYXNpbmEuaWQsIDB4ZTEpLCB+MHgwOGYpO1xuXG4gIC8vIEtlbnN1IGluIGNhYmluICgkNjggQCAkNjEpIG5lZWRzIHRvIGJlIGF2YWlsYWJsZSBldmVuIGFmdGVyIHZpc2l0aW5nIEpvZWwuXG4gIC8vIENoYW5nZSBoaW0gdG8ganVzdCBkaXNhcHBlYXIgYWZ0ZXIgc2V0dGluZyB0aGUgcmlkZWFibGUgZG9scGhpbiBmbGFnICgwOWIpLFxuICAvLyBhbmQgdG8gbm90IGV2ZW4gc2hvdyB1cCBhdCBhbGwgdW5sZXNzIHRoZSBmb2cgbGFtcCB3YXMgcmV0dXJuZWQgKDAyMSkuXG4gIHJvbS5ucGNzWzB4NjhdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHg2MSwgW34weDA5YiwgMHgwMjFdKTtcbiAgZGlhbG9nKDB4NjgpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMjsgLy8gZGlzYXBwZWFyXG5cbiAgLy8gS2Vuc3UgaW4gbGlnaHRob3VzZSAoJDc0LyQ3ZSBAICQ2MikgfiByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDc0LCAweDYyKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIEF6dGVjYSAoJDgzKSBpbiBweXJhbWlkIH4gYm93IG9mIHRydXRoIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmNvbmRpdGlvbiA9IH4weDI0MDsgIC8vIDI0MCBOT1QgYm93IG9mIHRydXRoXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gUmFnZSBibG9ja3Mgb24gc3dvcmQgb2Ygd2F0ZXIsIG5vdCByYW5kb20gaXRlbSBmcm9tIHRoZSBjaGVzdFxuICBkaWFsb2coMHhjMylbMF0uY29uZGl0aW9uID0gMHgyMDI7XG5cbiAgLy8gUmVtb3ZlIHVzZWxlc3Mgc3Bhd24gY29uZGl0aW9uIGZyb20gTWFkbyAxXG4gIHJvbS5ucGNzWzB4YzRdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHhmMik7IC8vIGFsd2F5cyBzcGF3blxuXG4gIC8vIERyYXlnb24gMiAoJGNiIEAgbG9jYXRpb24gJGE2KSBzaG91bGQgZGVzcGF3biBhZnRlciBiZWluZyBkZWZlYXRlZC5cbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLnNldCgweGE2LCBbfjB4MjhkXSk7IC8vIGtleSBvbiBiYWNrIHdhbGwgZGVzdHJveWVkXG5cbiAgLy8gRml4IFplYnUgdG8gZ2l2ZSBrZXkgdG8gc3R4eSBldmVuIGlmIHRodW5kZXIgc3dvcmQgaXMgZ290dGVuIChqdXN0IHN3aXRjaCB0aGVcbiAgLy8gb3JkZXIgb2YgdGhlIGZpcnN0IHR3bykuICBBbHNvIGRvbid0IGJvdGhlciBzZXR0aW5nIDAzYiBzaW5jZSB0aGUgbmV3IEl0ZW1HZXRcbiAgLy8gbG9naWMgb2J2aWF0ZXMgdGhlIG5lZWQuXG4gIGNvbnN0IHplYnVTaHlyb24gPSByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3MuZ2V0KDB4ZjIpITtcbiAgemVidVNoeXJvbi51bnNoaWZ0KC4uLnplYnVTaHlyb24uc3BsaWNlKDEsIDEpKTtcbiAgLy8gemVidVNoeXJvblswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFNoeXJvbiBtYXNzYWNyZSAoJDgwKSByZXF1aXJlcyBrZXkgdG8gc3R4eVxuICByb20udHJpZ2dlcigweDgwKS5jb25kaXRpb25zID0gW1xuICAgIH4weDAyNywgLy8gbm90IHRyaWdnZXJlZCBtYXNzYWNyZSB5ZXRcbiAgICAgMHgwM2IsIC8vIGdvdCBpdGVtIGZyb20ga2V5IHRvIHN0eHkgc2xvdFxuICAgICAweDJmZCwgLy8gc2h5cm9uIHdhcnAgcG9pbnQgdHJpZ2dlcmVkXG4gICAgIC8vIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlciAtIE5PVCBBTlkgTU9SRSFcbiAgXTtcblxuICAvLyBFbnRlciBzaHlyb24gKCQ4MSkgc2hvdWxkIHNldCB3YXJwIG5vIG1hdHRlciB3aGF0XG4gIHJvbS50cmlnZ2VyKDB4ODEpLmNvbmRpdGlvbnMgPSBbXTtcblxuICBpZiAoZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpKSB7XG4gICAgLy8gTGVhcm4gYmFycmllciAoJDg0KSByZXF1aXJlcyBjYWxtIHNlYVxuICAgIHJvbS50cmlnZ2VyKDB4ODQpLmNvbmRpdGlvbnMucHVzaCgweDI4Myk7IC8vIDI4MyBjYWxtZWQgdGhlIHNlYVxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBub3Qgc2V0dGluZyAwNTEgYW5kIGNoYW5naW5nIHRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIGl0ZW1cbiAgfVxuICAvL3JvbS50cmlnZ2VyKDB4ODQpLmZsYWdzID0gW107XG5cbiAgLy8gQWRkIGFuIGV4dHJhIGNvbmRpdGlvbiB0byB0aGUgTGVhZiBhYmR1Y3Rpb24gdHJpZ2dlciAoYmVoaW5kIHplYnUpLiAgVGhpcyBlbnN1cmVzXG4gIC8vIGFsbCB0aGUgaXRlbXMgaW4gTGVhZiBwcm9wZXIgKGVsZGVyIGFuZCBzdHVkZW50KSBhcmUgZ290dGVuIGJlZm9yZSB0aGV5IGRpc2FwcGVhci5cbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKDB4MDNhKTsgLy8gMDNhIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmVcblxuICAvLyBNb3JlIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXJzOlxuICAvLyAxLiBSZW1vdmUgdGhlIDhkIHRyaWdnZXIgaW4gdGhlIGZyb250IG9mIHRoZSBjZWxsLCBzd2FwIGl0IG91dFxuICAvLyAgICBmb3IgYjIgKGxlYXJuIHBhcmFseXNpcykuXG4gIHJvbS50cmlnZ2VyKDB4OGQpLnVzZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9TdW1taXRDYXZlLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCkgc3Bhd24uaWQgPSAweGIyO1xuICB9XG4gIHJlbW92ZUlmKHJvbS5sb2NhdGlvbnMuV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLFxuICAgICAgICAgICBzcGF3biA9PiBzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCk7XG4gIC8vIDIuIFNldCB0aGUgdHJpZ2dlciB0byByZXF1aXJlIGhhdmluZyBraWxsZWQga2VsYmVzcXVlLlxuICByb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zLnB1c2goMHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDMuIEFsc28gc2V0IHRoZSB0cmlnZ2VyIHRvIGZyZWUgdGhlIHZpbGxhZ2VycyBhbmQgdGhlIGVsZGVyLlxuICByb20udHJpZ2dlcigweGIyKS5mbGFncy5wdXNoKH4weDA4NCwgfjB4MDg1LCAweDAwZCk7XG4gIC8vIDQuIERvbid0IHRyaWdnZXIgdGhlIGFiZHVjdGlvbiBpbiB0aGUgZmlyc3QgcGxhY2UgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNS4gRG9uJ3QgdHJpZ2dlciByYWJiaXQgYmxvY2sgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4NikuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNi4gRG9uJ3QgZnJlZSB2aWxsYWdlcnMgZnJvbSB1c2luZyBwcmlzb24ga2V5XG4gIHJvbS5wcmdbMHgxZTBhM10gPSAweGMwO1xuICByb20ucHJnWzB4MWUwYTRdID0gMHgwMDtcblxuICAvLyBUT0RPIC0gYWRkaXRpb25hbCB3b3JrIG9uIGFiZHVjdGlvbiB0cmlnZ2VyOlxuICAvLyAgIC0gZ2V0IHJpZCBvZiB0aGUgZmxhZ3Mgb24ga2V5IHRvIHByaXNvbiB1c2VcbiAgLy8gICAtIGFkZCBhIGNvbmRpdGlvbiB0aGF0IGFiZHVjdGlvbiBkb2Vzbid0IGhhcHBlbiBpZiByZXNjdWVkXG4gIC8vIEdldCByaWQgb2YgQk9USCB0cmlnZ2VycyBpbiBzdW1taXQgY2F2ZSwgIEluc3RlYWQsIHRpZSBldmVyeXRoaW5nXG4gIC8vIHRvIHRoZSBlbGRlciBkaWFsb2cgb24gdG9wXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgc3RpbGwgYWxpdmUsIG1heWJlIGdpdmUgYSBoaW50IGFib3V0IHdlYWtuZXNzXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgZGVhZCB0aGVuIHRlYWNoIHBhcmFseXNpcyBhbmQgc2V0L2NsZWFyIGZsYWdzXG4gIC8vICAgLSBpZiBwYXJhbHlzaXMgbGVhcm5lZCB0aGVuIHNheSBzb21ldGhpbmcgZ2VuZXJpY1xuICAvLyBTdGlsbCBuZWVkIHRvIGtlZXAgdGhlIHRyaWdnZXIgaW4gdGhlIGZyb250IGluIGNhc2Ugbm9cbiAgLy8gYWJkdWN0aW9uIHlldFxuICAvLyAgIC0gaWYgTk9UIHBhcmFseXNpcyBBTkQgaWYgTk9UIGVsZGVyIG1pc3NpbmcgQU5EIGlmIGtlbGJlcXVlIGRlYWRcbiAgLy8gLS0tPiBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHR3byB3YXlzIHRvIGdldCAobGlrZSByZWZyZXNoKT9cbiAgLy9cbiAgLy8gQWxzbyBhZGQgYSBjaGVjayB0aGF0IHRoZSByYWJiaXQgdHJpZ2dlciBpcyBnb25lIGlmIHJlc2N1ZWQhXG5cblxuXG4gIC8vIFBhcmFseXNpcyB0cmlnZ2VyICgkYjIpIH4gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcbiAgLy9yb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zWzBdID0gfjB4MjQyO1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnNoaWZ0KCk7IC8vIHJlbW92ZSAwMzcgbGVhcm5lZCBwYXJhbHlzaXNcblxuICAvLyBMZWFybiByZWZyZXNoIHRyaWdnZXIgKCRiNCkgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjQpLmNvbmRpdGlvbnNbMV0gPSB+MHgyNDE7XG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIDAzOSBsZWFybmVkIHJlZnJlc2hcblxuICAvLyBUZWxlcG9ydCBibG9jayBvbiBtdCBzYWJyZSBpcyBmcm9tIHNwZWxsLCBub3Qgc2xvdFxuICByb20udHJpZ2dlcigweGJhKS5jb25kaXRpb25zWzBdID0gfjB4MjQ0OyAvLyB+MDNmIC0+IH4yNDRcblxuICAvLyBQb3J0b2EgcGFsYWNlIGd1YXJkIG1vdmVtZW50IHRyaWdnZXIgKCRiYikgc3RvcHMgb24gMDFiIChtZXNpYSkgbm90IDAxZiAob3JiKVxuICByb20udHJpZ2dlcigweGJiKS5jb25kaXRpb25zWzFdID0gfjB4MDFiO1xuXG4gIC8vIFJlbW92ZSByZWR1bmRhbnQgdHJpZ2dlciA4YSAoc2xvdCAxNikgaW4gem9tYmlldG93biAoJDY1KVxuICAvLyAgLS0gbm90ZTogbm8gbG9uZ2VyIG5lY2Vzc2FyeSBzaW5jZSB3ZSByZXB1cnBvc2UgaXQgaW5zdGVhZC5cbiAgLy8gY29uc3Qge3pvbWJpZVRvd259ID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gem9tYmllVG93bi5zcGF3bnMgPSB6b21iaWVUb3duLnNwYXducy5maWx0ZXIoeCA9PiAheC5pc1RyaWdnZXIoKSB8fCB4LmlkICE9IDB4OGEpO1xuXG4gIC8vIFJlcGxhY2UgYWxsIGRpYWxvZyBjb25kaXRpb25zIGZyb20gMDBlIHRvIDI0M1xuICBmb3IgKGNvbnN0IG5wYyBvZiByb20ubnBjcykge1xuICAgIGZvciAoY29uc3QgZCBvZiBucGMuYWxsRGlhbG9ncygpKSB7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IDB4MDBlKSBkLmNvbmRpdGlvbiA9IDB4MjQzO1xuICAgICAgaWYgKGQuY29uZGl0aW9uID09PSB+MHgwMGUpIGQuY29uZGl0aW9uID0gfjB4MjQzO1xuICAgIH1cbiAgfVxufVxuXG4vLyBIYXJkIG1vZGUgZmxhZzogSGMgLSB6ZXJvIG91dCB0aGUgc3dvcmQncyBjb2xsaXNpb24gcGxhbmVcbmZ1bmN0aW9uIGRpc2FibGVTdGFicyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG8gb2YgWzB4MDgsIDB4MDksIDB4MjddKSB7XG4gICAgcm9tLm9iamVjdHNbb10uY29sbGlzaW9uUGxhbmUgPSAwO1xuICB9XG4gIC8vIEFsc28gdGFrZSB3YXJyaW9yIHJpbmcgb3V0IG9mIHRoZSBwaWN0dXJlLi4uIDp0cm9sbDpcbiAgLy8gcm9tLml0ZW1HZXRzWzB4MmJdLmlkID0gMHg1YjsgLy8gbWVkaWNhbCBoZXJiIGZyb20gc2Vjb25kIGZsdXRlIG9mIGxpbWUgY2hlY2tcbiAgcm9tLm5wY3NbMHg1NF0uZGF0YVswXSA9IDB4MjA7XG59XG5cbmZ1bmN0aW9uIG9yYnNPcHRpb25hbChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHgxMCwgMHgxNCwgMHgxOCwgMHgxZF0pIHtcbiAgICAvLyAxLiBMb29zZW4gdGVycmFpbiBzdXNjZXB0aWJpbGl0eSBvZiBsZXZlbCAxIHNob3RzXG4gICAgcm9tLm9iamVjdHNbb2JqXS50ZXJyYWluU3VzY2VwdGliaWxpdHkgJj0gfjB4MDQ7XG4gICAgLy8gMi4gSW5jcmVhc2UgdGhlIGxldmVsIHRvIDJcbiAgICByb20ub2JqZWN0c1tvYmpdLmxldmVsID0gMjtcbiAgfVxufVxuIl19