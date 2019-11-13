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
}
function orbsOptional(rom) {
    for (const obj of [0x10, 0x14, 0x18, 0x1d]) {
        rom.objects[obj].terrainSusceptibility &= ~0x04;
        rom.objects[obj].level = 2;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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QztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFO1FBRzNCLE1B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Q0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV6RSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsS0FBYztJQUVsRCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdoRCxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ04sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ1osQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRy9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxL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TSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJ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LFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBUSxDQUFDO0lBQ3RELEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ3JGLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUduQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUtoQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFRLENBQUM7SUFDdEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FB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QUMsT0FBTyxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUl2RCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRzVELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBSWxDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQy9CLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBR2xDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFJL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQVdsRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNyQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUVoRCxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUt2QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFVdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFHbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFLbkQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO0lBQzFELFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBSS9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHO1FBQzdCLENBQUMsS0FBSztRQUNMLEtBQUs7UUFDTCxLQUFLO0tBRVAsQ0FB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QyxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxDQUFDLElBQUksQ0FBQztRQUVoRCxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7S0FDNUI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUGVyZm9ybSBpbml0aWFsIGNsZWFudXAvc2V0dXAgb2YgdGhlIFJPTS5cblxuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgTG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlSWR9IGZyb20gJy4uL3JvbS9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtHbG9iYWxEaWFsb2csIExvY2FsRGlhbG9nfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljUHJlUGFyc2UocHJnOiBVaW50OEFycmF5KTogdm9pZCB7XG4gIC8vIFJlbW92ZSB1bnVzZWQgaXRlbS90cmlnZ2VyIGFjdGlvbnNcbiAgcHJnWzB4MWUwNmJdICY9IDc7IC8vIG1lZGljYWwgaGVyYiBub3JtYWwgdXNhZ2UgPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA2Zl0gJj0gNzsgLy8gbWFnaWMgcmluZyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNzNdICY9IDc7IC8vIGZydWl0IG9mIGxpbWUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDc3XSAmPSA3OyAvLyBhbnRpZG90ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwN2JdICY9IDc7IC8vIG9wZWwgc3RhdHVlIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA4NF0gJj0gNzsgLy8gd2FycCBib290cyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNCB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwOWJdICY9IDc7IC8vIHdpbmRtaWxsIGtleSBpdGVtdXNlWzFdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwYjldICY9IDc7IC8vIGdsb3dpbmcgbGFtcCBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluaXN0aWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG5cbiAgLy8gTk9URTogdGhpcyBpcyBkb25lIHZlcnkgZWFybHksIG1ha2Ugc3VyZSBhbnkgcmVmZXJlbmNlcyB0byB3YXJwXG4gIC8vIHBvaW50IGZsYWdzIGFyZSB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIG5ldyBvbmVzIVxuICBhZGRab21iaWVXYXJwKHJvbSk7XG5cbiAgYWRkTWV6YW1lVHJpZ2dlcihyb20pO1xuXG4gIG5vcm1hbGl6ZVN3b3Jkcyhyb20sIGZsYWdzKTtcblxuICBmaXhDb2luU3ByaXRlcyhyb20pO1xuICBmaXhNaW1pY3Mocm9tKTtcblxuICBtYWtlQnJhY2VsZXRzUHJvZ3Jlc3NpdmUocm9tKTtcblxuICBhZGRUb3dlckV4aXQocm9tKTtcbiAgcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbSk7XG4gIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tKTtcbiAgcHJldmVudE5wY0Rlc3Bhd25zKHJvbSwgZmxhZ3MpO1xuICBpZiAoZmxhZ3MucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKSkgcmVxdWlyZUhlYWxlZERvbHBoaW4ocm9tKTtcbiAgaWYgKGZsYWdzLnNhaGFyYVJhYmJpdHNSZXF1aXJlVGVsZXBhdGh5KCkpIHJlcXVpcmVUZWxlcGF0aHlGb3JEZW8ocm9tKTtcblxuICBhZGp1c3RJdGVtTmFtZXMocm9tLCBmbGFncyk7XG5cbiAgLy8gVE9ETyAtIGNvbnNpZGVyIG1ha2luZyBhIFRyYW5zZm9ybWF0aW9uIGludGVyZmFjZSwgd2l0aCBvcmRlcmluZyBjaGVja3NcbiAgYWxhcm1GbHV0ZUlzS2V5SXRlbShyb20sIGZsYWdzKTsgLy8gTk9URTogcHJlLXNodWZmbGVcbiAgYnJva2FoYW5hV2FudHNNYWRvMShyb20pO1xuICBpZiAoZmxhZ3MudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgdGVsZXBvcnRPblRodW5kZXJTd29yZChyb20pO1xuICB9IGVsc2Uge1xuICAgIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb20pO1xuICB9XG5cbiAgdW5kZXJncm91bmRDaGFubmVsTGFuZEJyaWRnZShyb20pO1xuXG4gIGlmIChmbGFncy5hZGRFYXN0Q2F2ZSgpKSB7XG4gICAgZWFzdENhdmUocm9tLCBmbGFncyk7XG4gIH0gZWxzZSBpZiAoZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tKTtcbiAgfVxuICBldmlsU3Bpcml0SXNsYW5kUmVxdWlyZXNEb2xwaGluKHJvbSk7XG4gIGNsb3NlQ2F2ZUVudHJhbmNlcyhyb20sIGZsYWdzKTtcbiAgc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tKTtcbiAgYWRkQ29yZGVsV2VzdFRyaWdnZXJzKHJvbSwgZmxhZ3MpO1xuICBpZiAoZmxhZ3MuZGlzYWJsZVJhYmJpdFNraXAoKSkgZml4UmFiYml0U2tpcChyb20pO1xuXG4gIGZpeFJldmVyc2VXYWxscyhyb20pO1xuICBpZiAoZmxhZ3MuY2hhcmdlU2hvdHNPbmx5KCkpIGRpc2FibGVTdGFicyhyb20pO1xuICBpZiAoZmxhZ3Mub3Jic09wdGlvbmFsKCkpIG9yYnNPcHRpb25hbChyb20pO1xufVxuXG4vLyBBZGRzIGEgdHJpZ2dlciBhY3Rpb24gdG8gbWV6YW1lLiAgVXNlIDg3IGxlZnRvdmVyIGZyb20gcmVzY3VpbmcgemVidS5cbmZ1bmN0aW9uIGFkZE1lemFtZVRyaWdnZXIocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW34weDJmMF07XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7YWN0aW9uOiA0fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZjBdO1xuICBjb25zdCBtZXphbWUgPSByb20ubG9jYXRpb25zLk1lemFtZVNocmluZTtcbiAgbWV6YW1lLnNwYXducy5wdXNoKFNwYXduLm9mKHt0aWxlOiAweDg4LCB0eXBlOiAyLCBpZDogdHJpZ2dlci5pZH0pKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3dvcmRzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICAvLyB3aW5kIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIHdpbmQgMiA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDZcbiAgLy8gd2luZCAzID0+IDItMyBoaXRzIDhNUCAgICAgICAgPT4gOFxuXG4gIC8vIGZpcmUgMSA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDNcbiAgLy8gZmlyZSAyID0+IDMgaGl0cyAgICAgICAgICAgICAgPT4gNVxuICAvLyBmaXJlIDMgPT4gNC02IGhpdHMgMTZNUCAgICAgICA9PiA3XG5cbiAgLy8gd2F0ZXIgMSA9PiAxIGhpdCAgICAgICAgICAgICAgPT4gM1xuICAvLyB3YXRlciAyID0+IDEtMiBoaXRzICAgICAgICAgICA9PiA2XG4gIC8vIHdhdGVyIDMgPT4gMy02IGhpdHMgMTZNUCAgICAgID0+IDhcblxuICAvLyB0aHVuZGVyIDEgPT4gMS0yIGhpdHMgc3ByZWFkICA9PiAzXG4gIC8vIHRodW5kZXIgMiA9PiAxLTMgaGl0cyBzcHJlYWQgID0+IDVcbiAgLy8gdGh1bmRlciAzID0+IDctMTAgaGl0cyA0ME1QICAgPT4gN1xuXG4gIHJvbS5vYmplY3RzWzB4MTBdLmF0ayA9IDM7IC8vIHdpbmQgMVxuICByb20ub2JqZWN0c1sweDExXS5hdGsgPSA2OyAvLyB3aW5kIDJcbiAgcm9tLm9iamVjdHNbMHgxMl0uYXRrID0gODsgLy8gd2luZCAzXG5cbiAgcm9tLm9iamVjdHNbMHgxOF0uYXRrID0gMzsgLy8gZmlyZSAxXG4gIHJvbS5vYmplY3RzWzB4MTNdLmF0ayA9IDU7IC8vIGZpcmUgMlxuICByb20ub2JqZWN0c1sweDE5XS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxN10uYXRrID0gNzsgLy8gZmlyZSAzXG4gIHJvbS5vYmplY3RzWzB4MWFdLmF0ayA9IDc7IC8vIGZpcmUgM1xuXG4gIHJvbS5vYmplY3RzWzB4MTRdLmF0ayA9IDM7IC8vIHdhdGVyIDFcbiAgcm9tLm9iamVjdHNbMHgxNV0uYXRrID0gNjsgLy8gd2F0ZXIgMlxuICByb20ub2JqZWN0c1sweDE2XS5hdGsgPSA4OyAvLyB3YXRlciAzXG5cbiAgcm9tLm9iamVjdHNbMHgxY10uYXRrID0gMzsgLy8gdGh1bmRlciAxXG4gIHJvbS5vYmplY3RzWzB4MWVdLmF0ayA9IDU7IC8vIHRodW5kZXIgMlxuICByb20ub2JqZWN0c1sweDFiXS5hdGsgPSA3OyAvLyB0aHVuZGVyIDNcbiAgcm9tLm9iamVjdHNbMHgxZl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG5cbiAgaWYgKGZsYWdzLnNsb3dEb3duVG9ybmFkbygpKSB7XG4gICAgLy8gVE9ETyAtIHRvcm5hZG8gKG9iaiAxMikgPT4gc3BlZWQgMDcgaW5zdGVhZCBvZiAwOFxuICAgIC8vICAgICAgLSBsaWZldGltZSBpcyA0ODAgPT4gNzAgbWF5YmUgdG9vIGxvbmcsIDYwIHN3ZWV0IHNwb3Q/XG4gICAgY29uc3QgdG9ybmFkbyA9IHJvbS5vYmplY3RzWzB4MTJdO1xuICAgIHRvcm5hZG8uc3BlZWQgPSAweDA3O1xuICAgIHRvcm5hZG8uZGF0YVsweDBjXSA9IDB4NjA7IC8vIGluY3JlYXNlIGxpZmV0aW1lICg0ODApIGJ5IDIwJVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpeENvaW5TcHJpdGVzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgcGFnZSBvZiBbMHg2MCwgMHg2NCwgMHg2NSwgMHg2NiwgMHg2NywgMHg2OCxcbiAgICAgICAgICAgICAgICAgICAgICAweDY5LCAweDZhLCAweDZiLCAweDZjLCAweDZkLCAweDZmXSkge1xuICAgIGZvciAoY29uc3QgcGF0IG9mIFswLCAxLCAyXSkge1xuICAgICAgcm9tLnBhdHRlcm5zW3BhZ2UgPDwgNiB8IHBhdF0ucGl4ZWxzID0gcm9tLnBhdHRlcm5zWzB4NWUgPDwgNiB8IHBhdF0ucGl4ZWxzO1xuICAgIH1cbiAgfVxuICByb20ub2JqZWN0c1sweDBjXS5tZXRhc3ByaXRlID0gMHhhOTtcbn1cblxuLyoqXG4gKiBGaXggdGhlIHNvZnRsb2NrIHRoYXQgaGFwcGVucyB3aGVuIHlvdSBnbyB0aHJvdWdoXG4gKiBhIHdhbGwgYmFja3dhcmRzIGJ5IG1vdmluZyB0aGUgZXhpdC9lbnRyYW5jZSB0aWxlc1xuICogdXAgYSBiaXQgYW5kIGFkanVzdGluZyBzb21lIHRpbGVFZmZlY3RzIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gZml4UmV2ZXJzZVdhbGxzKHJvbTogUm9tKSB7XG4gIC8vIGFkanVzdCB0aWxlIGVmZmVjdCBmb3IgYmFjayB0aWxlcyBvZiBpcm9uIHdhbGxcbiAgZm9yIChjb25zdCB0IGluIFsweDA0LCAweDA1LCAweDA4LCAweDA5XSkge1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGJjIC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gICAgcm9tLnRpbGVFZmZlY3RzWzB4YjUgLSAweGIzXS5lZmZlY3RzW3RdID0gMHgxODtcbiAgfVxuICAvLyBUT0RPIC0gbW92ZSBhbGwgdGhlIGVudHJhbmNlcyB0byB5PTIwIGFuZCBleGl0cyB0byB5dD0wMVxufVxuXG4vKiogTWFrZSBhIGxhbmQgYnJpZGdlIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgKi9cbmZ1bmN0aW9uIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tOiBSb20pIHtcbiAgY29uc3Qge3RpbGVzfSA9IHJvbS5zY3JlZW5zWzB4YTFdO1xuICB0aWxlc1sweDI4XSA9IDB4OWY7XG4gIHRpbGVzWzB4MzddID0gMHgyMztcbiAgdGlsZXNbMHgzOF0gPSAweDIzOyAvLyAweDhlO1xuICB0aWxlc1sweDM5XSA9IDB4MjE7XG4gIHRpbGVzWzB4NDddID0gMHg4ZDtcbiAgdGlsZXNbMHg0OF0gPSAweDhmO1xuICB0aWxlc1sweDU2XSA9IDB4OTk7XG4gIHRpbGVzWzB4NTddID0gMHg5YTtcbiAgdGlsZXNbMHg1OF0gPSAweDhjO1xufVxuXG4vKipcbiAqIFJlbW92ZSB0aW1lciBzcGF3bnMsIHJlbnVtYmVycyBtaW1pYyBzcGF3bnMgc28gdGhhdCB0aGV5J3JlIHVuaXF1ZS5cbiAqIFJ1bnMgYmVmb3JlIHNodWZmbGUgYmVjYXVzZSB3ZSBuZWVkIHRvIGlkZW50aWZ5IHRoZSBzbG90LiAgUmVxdWlyZXNcbiAqIGFuIGFzc2VtYmx5IGNoYW5nZSAoJDNkM2ZkIGluIHByZXNodWZmbGUucylcbiAqL1xuZnVuY3Rpb24gZml4TWltaWNzKHJvbTogUm9tKTogdm9pZCB7XG4gIGxldCBtaW1pYyA9IDB4NzA7XG4gIGZvciAoY29uc3QgbG9jIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICBmb3IgKGNvbnN0IHMgb2YgbG9jLnNwYXducykge1xuICAgICAgaWYgKCFzLmlzQ2hlc3QoKSkgY29udGludWU7XG4gICAgICBzLnRpbWVkID0gZmFsc2U7XG4gICAgICBpZiAocy5pZCA+PSAweDcwKSBzLmlkID0gbWltaWMrKztcbiAgICB9XG4gIH1cbiAgLy8gVE9ETyAtIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGJ1bmRsZSBhc20gY2hhbmdlcz9cbiAgLy8gcm9tLmFzc2VtYmxlKClcbiAgLy8gICAgIC4kKCdhZGMgJDEwJylcbiAgLy8gICAgIC5iZXEoJ2xhYmVsJylcbiAgLy8gICAgIC5sc2goKVxuICAvLyAgICAgLmxzaChgJHthZGRyfSx4YClcbiAgLy8gICAgIC5sYWJlbCgnbGFiZWwnKTtcbiAgLy8gcm9tLnBhdGNoKClcbiAgLy8gICAgIC5vcmcoMHgzZDNmZClcbiAgLy8gICAgIC5ieXRlKDB4YjApO1xufVxuXG5mdW5jdGlvbiBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IGwgPSByb20ubG9jYXRpb25zO1xuICAvLyBNb3ZlIEtlbGJlc3F1ZSAyIG9uZSB0aWxlIGxlZnQuXG4gIGwuR29hRm9ydHJlc3NfS2VsYmVzcXVlLnNwYXduc1swXS54IC09IDg7XG4gIC8vIFJlbW92ZSBzYWdlIHNjcmVlbiBsb2NrcyAoZXhjZXB0IEtlbnN1KS5cbiAgbC5Hb2FGb3J0cmVzc19aZWJ1LnNwYXducy5zcGxpY2UoMSwgMSk7IC8vIHplYnUgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX1Rvcm5lbC5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyB0b3JuZWwgc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX0FzaW5hLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIGFzaW5hIHNjcmVlbiBsb2NrIHRyaWdnZXJcbn1cblxuZnVuY3Rpb24gYWxhcm1GbHV0ZUlzS2V5SXRlbShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgY29uc3Qge1dhdGVyZmFsbENhdmU0fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgLy8gTW92ZSBhbGFybSBmbHV0ZSB0byB0aGlyZCByb3dcbiAgcm9tLml0ZW1HZXRzWzB4MzFdLmludmVudG9yeVJvd1N0YXJ0ID0gMHgyMDtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBkcm9wcGVkXG4gIC8vIHJvbS5wcmdbMHgyMTAyMV0gPSAweDQzOyAvLyBUT0RPIC0gcm9tLml0ZW1zWzB4MzFdLj8/P1xuICByb20uaXRlbXNbMHgzMV0udW5pcXVlID0gdHJ1ZTtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBzb2xkXG4gIHJvbS5pdGVtc1sweDMxXS5iYXNlUHJpY2UgPSAwO1xuXG4gIGlmIChmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gUGVyc29uIDE0IChaZWJ1J3Mgc3R1ZGVudCk6IHNlY29uZGFyeSBpdGVtIC0+IGFsYXJtIGZsdXRlXG4gICAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4MzE7IC8vIE5PVEU6IENsb2JiZXJzIHNodWZmbGVkIGl0ZW0hISFcbiAgfVxuXG4gIC8vIFJlbW92ZSBhbGFybSBmbHV0ZSBmcm9tIHNob3BzIChyZXBsYWNlIHdpdGggb3RoZXIgaXRlbXMpXG4gIC8vIE5PVEUgLSB3ZSBjb3VsZCBzaW1wbGlmeSB0aGlzIHdob2xlIHRoaW5nIGJ5IGp1c3QgaGFyZGNvZGluZyBpbmRpY2VzLlxuICAvLyAgICAgIC0gaWYgdGhpcyBpcyBndWFyYW50ZWVkIHRvIGhhcHBlbiBlYXJseSwgaXQncyBhbGwgdGhlIHNhbWUuXG4gIGNvbnN0IHJlcGxhY2VtZW50cyA9IFtcbiAgICBbMHgyMSwgMC43Ml0sIC8vIGZydWl0IG9mIHBvd2VyLCA3MiUgb2YgY29zdFxuICAgIFsweDFmLCAwLjldLCAvLyBseXNpcyBwbGFudCwgOTAlIG9mIGNvc3RcbiAgXTtcbiAgbGV0IGogPSAwO1xuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AuY29udGVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldICE9PSAweDMxKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtpdGVtLCBwcmljZVJhdGlvXSA9IHJlcGxhY2VtZW50c1soaisrKSAlIHJlcGxhY2VtZW50cy5sZW5ndGhdO1xuICAgICAgc2hvcC5jb250ZW50c1tpXSA9IGl0ZW07XG4gICAgICBpZiAocm9tLnNob3BEYXRhVGFibGVzQWRkcmVzcykge1xuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIGJyb2tlbiAtIG5lZWQgYSBjb250cm9sbGVkIHdheSB0byBjb252ZXJ0IHByaWNlIGZvcm1hdHNcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSBNYXRoLnJvdW5kKHNob3AucHJpY2VzW2ldICogcHJpY2VSYXRpbyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hhbmdlIGZsdXRlIG9mIGxpbWUgY2hlc3QncyAobm93LXVudXNlZCkgaXRlbWdldCB0byBoYXZlIG1lZGljYWwgaGVyYlxuICByb20uaXRlbUdldHNbMHg1Yl0uaXRlbUlkID0gMHgxZDtcbiAgLy8gQ2hhbmdlIHRoZSBhY3R1YWwgc3Bhd24gZm9yIHRoYXQgY2hlc3QgdG8gYmUgdGhlIG1pcnJvcmVkIHNoaWVsZCBjaGVzdFxuICBXYXRlcmZhbGxDYXZlNC5zcGF3bigweDE5KS5pZCA9IDB4MTA7XG5cbiAgLy8gVE9ETyAtIHJlcXVpcmUgbmV3IGNvZGUgZm9yIHR3byB1c2VzXG59XG5cbmZ1bmN0aW9uIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgYnJva2FoYW5hID0gcm9tLm5wY3NbMHg1NF07XG4gIGNvbnN0IGRpYWxvZyA9IGFzc2VydChicm9rYWhhbmEubG9jYWxEaWFsb2dzLmdldCgtMSkpWzBdO1xuICBpZiAoZGlhbG9nLmNvbmRpdGlvbiAhPT0gfjB4MDI0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgYnJva2FoYW5hIGNvbmRpdGlvbjogJHtkaWFsb2cuY29uZGl0aW9ufWApO1xuICB9XG4gIGRpYWxvZy5jb25kaXRpb24gPSB+MHgwNjc7IC8vIHZhbmlsbGEgYmFsbCBvZiB0aHVuZGVyIC8gZGVmZWF0ZWQgbWFkbyAxXG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vcm1hbGx5IHRoZSBmaXNoZXJtYW4gKCQ2NCkgc3Bhd25zIGluIGhpcyBob3VzZSAoJGQ2KSBpZiB5b3UgaGF2ZVxuICAvLyB0aGUgc2hlbGwgZmx1dGUgKDIzNikuICBIZXJlIHdlIGFsc28gYWRkIGEgcmVxdWlyZW1lbnQgb24gdGhlIGhlYWxlZFxuICAvLyBkb2xwaGluIHNsb3QgKDAyNSksIHdoaWNoIHdlIGtlZXAgYXJvdW5kIHNpbmNlIGl0J3MgYWN0dWFsbHkgdXNlZnVsLlxuICByb20ubnBjc1sweDY0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZDYsIFsweDIzNiwgMHgwMjVdKTtcbiAgLy8gQWxzbyBmaXggZGF1Z2h0ZXIncyBkaWFsb2cgKCQ3YikuXG4gIGNvbnN0IGRhdWdodGVyRGlhbG9nID0gcm9tLm5wY3NbMHg3Yl0ubG9jYWxEaWFsb2dzLmdldCgtMSkhO1xuICBkYXVnaHRlckRpYWxvZy51bnNoaWZ0KGRhdWdodGVyRGlhbG9nWzBdLmNsb25lKCkpO1xuICBkYXVnaHRlckRpYWxvZ1swXS5jb25kaXRpb24gPSB+MHgwMjU7XG4gIGRhdWdodGVyRGlhbG9nWzFdLmNvbmRpdGlvbiA9IH4weDIzNjtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3QgaGF2aW5nIHRlbGVwYXRoeSAoMjQzKSB3aWxsIHRyaWdnZXIgYSBcImt5dSBreXVcIiAoMWE6MTIsIDFhOjEzKSBmb3JcbiAgLy8gYm90aCBnZW5lcmljIGJ1bm5pZXMgKDU5KSBhbmQgZGVvICg1YSkuXG4gIHJvbS5ucGNzWzB4NTldLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxMl0pKTtcbiAgcm9tLm5wY3NbMHg1YV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEzXSkpO1xufVxuXG5mdW5jdGlvbiB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIGl0ZW1nZXQgMDMgc3dvcmQgb2YgdGh1bmRlciA9PiBzZXQgMmZkIHNoeXJvbiB3YXJwIHBvaW50XG4gIHJvbS5pdGVtR2V0c1sweDAzXS5mbGFncy5wdXNoKDB4MmZkKTtcbiAgLy8gZGlhbG9nIDYyIGFzaW5hIGluIGYyL2Y0IHNoeXJvbiAtPiBhY3Rpb24gMWYgKHRlbGVwb3J0IHRvIHN0YXJ0KVxuICAvLyAgIC0gbm90ZTogZjIgYW5kIGY0IGRpYWxvZ3MgYXJlIGxpbmtlZC5cbiAgZm9yIChjb25zdCBpIG9mIFswLCAxLCAzXSkge1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFsweGYyLCAweGY0XSkge1xuICAgICAgcm9tLm5wY3NbMHg2Ml0ubG9jYWxEaWFsb2dzLmdldChsb2MpIVtpXS5tZXNzYWdlLmFjdGlvbiA9IDB4MWY7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBDaGFuZ2Ugc3dvcmQgb2YgdGh1bmRlcidzIGFjdGlvbiB0byBiYmUgdGhlIHNhbWUgYXMgb3RoZXIgc3dvcmRzICgxNilcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmFjcXVpc2l0aW9uQWN0aW9uLmFjdGlvbiA9IDB4MTY7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEl0ZW1OYW1lcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgaWYgKGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgLy8gcmVuYW1lIGxlYXRoZXIgYm9vdHMgdG8gc3BlZWQgYm9vdHNcbiAgICBjb25zdCBsZWF0aGVyQm9vdHMgPSByb20uaXRlbXNbMHgyZl0hO1xuICAgIGxlYXRoZXJCb290cy5tZW51TmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgbGVhdGhlckJvb3RzLm1lc3NhZ2VOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBpZiAoZmxhZ3MuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpKSB7XG4gICAgICBjb25zdCBnYXNNYXNrID0gcm9tLml0ZW1zWzB4MjldO1xuICAgICAgZ2FzTWFzay5tZW51TmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgICBnYXNNYXNrLm1lc3NhZ2VOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICB9XG4gIH1cblxuICAvLyByZW5hbWUgYmFsbHMgdG8gb3Jic1xuICBmb3IgKGxldCBpID0gMHgwNTsgaSA8IDB4MGM7IGkgKz0gMikge1xuICAgIHJvbS5pdGVtc1tpXS5tZW51TmFtZSA9IHJvbS5pdGVtc1tpXS5tZW51TmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICAgIHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZSA9IHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VCcmFjZWxldHNQcm9ncmVzc2l2ZShyb206IFJvbSk6IHZvaWQge1xuICAvLyB0b3JuZWwncyB0cmlnZ2VyIG5lZWRzIGJvdGggaXRlbXNcbiAgY29uc3QgdG9ybmVsID0gcm9tLm5wY3NbMHg1Zl07XG4gIGNvbnN0IHZhbmlsbGEgPSB0b3JuZWwubG9jYWxEaWFsb2dzLmdldCgweDIxKSE7XG4gIGNvbnN0IHBhdGNoZWQgPSBbXG4gICAgdmFuaWxsYVswXSwgLy8gYWxyZWFkeSBsZWFybmVkIHRlbGVwb3J0XG4gICAgdmFuaWxsYVsyXSwgLy8gZG9uJ3QgaGF2ZSB0b3JuYWRvIGJyYWNlbGV0XG4gICAgdmFuaWxsYVsyXS5jbG9uZSgpLCAvLyB3aWxsIGNoYW5nZSB0byBkb24ndCBoYXZlIG9yYlxuICAgIHZhbmlsbGFbMV0sIC8vIGhhdmUgYnJhY2VsZXQsIGxlYXJuIHRlbGVwb3J0XG4gIF07XG4gIHBhdGNoZWRbMV0uY29uZGl0aW9uID0gfjB4MjA2OyAvLyBkb24ndCBoYXZlIGJyYWNlbGV0XG4gIHBhdGNoZWRbMl0uY29uZGl0aW9uID0gfjB4MjA1OyAvLyBkb24ndCBoYXZlIG9yYlxuICBwYXRjaGVkWzNdLmNvbmRpdGlvbiA9IH4wOyAgICAgLy8gZGVmYXVsdFxuICB0b3JuZWwubG9jYWxEaWFsb2dzLnNldCgweDIxLCBwYXRjaGVkKTtcbn1cblxuZnVuY3Rpb24gc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBbcm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLktpcmlzYU1lYWRvd10pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gc2V0IHRoZSBuZXcgXCJpbnZpc2libGVcIiBmbGFnIG9uIHRoZSBjaGVzdC5cbiAgICAgIGlmIChzcGF3bi5pc0NoZXN0KCkpIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICB9XG4gIH1cbn1cblxuLy8gQWRkIHRoZSBzdGF0dWUgb2Ygb255eCBhbmQgcG9zc2libHkgdGhlIHRlbGVwb3J0IGJsb2NrIHRyaWdnZXIgdG8gQ29yZGVsIFdlc3RcbmZ1bmN0aW9uIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgY29uc3Qge0NvcmRlbFBsYWluRWFzdCwgQ29yZGVsUGxhaW5XZXN0fSA9IHJvbS5sb2NhdGlvbnM7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2YgQ29yZGVsUGxhaW5FYXN0LnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc0NoZXN0KCkgfHwgKGZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJiBzcGF3bi5pc1RyaWdnZXIoKSkpIHtcbiAgICAgIC8vIENvcHkgaWYgKDEpIGl0J3MgdGhlIGNoZXN0LCBvciAoMikgd2UncmUgZGlzYWJsaW5nIHRlbGVwb3J0IHNraXBcbiAgICAgIENvcmRlbFBsYWluV2VzdC5zcGF3bnMucHVzaChzcGF3bi5jbG9uZSgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZml4UmFiYml0U2tpcChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX01haW4uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDg2KSB7XG4gICAgICBpZiAoc3Bhd24ueCA9PT0gMHg3NDApIHtcbiAgICAgICAgc3Bhd24ueCArPSAxNjtcbiAgICAgICAgc3Bhd24ueSArPSAxNjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkVG93ZXJFeGl0KHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtUb3dlckVudHJhbmNlLCBDcnlwdF9UZWxlcG9ydGVyfSA9IHJvbS5sb2NhdGlvbnM7XG4gIGNvbnN0IGVudHJhbmNlID0gQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMubGVuZ3RoO1xuICBjb25zdCBkZXN0ID0gQ3J5cHRfVGVsZXBvcnRlci5pZDtcbiAgQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7dGlsZTogMHg2OH0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTcsIGRlc3QsIGVudHJhbmNlfSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1OCwgZGVzdCwgZW50cmFuY2V9KSk7XG59XG5cbi8vIFByb2dyYW1tYXRpY2FsbHkgYWRkIGEgaG9sZSBiZXR3ZWVuIHZhbGxleSBvZiB3aW5kIGFuZCBsaW1lIHRyZWUgdmFsbGV5XG5mdW5jdGlvbiBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXl9ID0gcm9tLmxvY2F0aW9ucztcblxuICBWYWxsZXlPZldpbmQuc2NyZWVuc1s1XVs0XSA9IDB4MTA7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMV1bMF0gPSAweDFhOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzJdWzBdID0gMHgwYzsgLy8gbmljZXIgbW91bnRhaW5zXG5cbiAgY29uc3Qgd2luZEVudHJhbmNlID1cbiAgICAgIFZhbGxleU9mV2luZC5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHg0ZWYsIHk6IDB4NTc4fSkpIC0gMTtcbiAgY29uc3QgbGltZUVudHJhbmNlID1cbiAgICAgIExpbWVUcmVlVmFsbGV5LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDAxMCwgeTogMHgxYzB9KSkgLSAxO1xuXG4gIFZhbGxleU9mV2luZC5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTYwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NzAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSk7XG4gIExpbWVUcmVlVmFsbGV5LmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYjAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFjMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pKTtcbn1cblxuZnVuY3Rpb24gY2xvc2VDYXZlRW50cmFuY2VzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBQcmV2ZW50IHNvZnRsb2NrIGZyb20gZXhpdGluZyBzZWFsZWQgY2F2ZSBiZWZvcmUgd2luZG1pbGwgc3RhcnRlZFxuICByb20ubG9jYXRpb25zLlZhbGxleU9mV2luZC5lbnRyYW5jZXNbMV0ueSArPSAxNjtcblxuICAvLyBDbGVhciB0aWxlcyAxLDIsMyw0IGZvciBibG9ja2FibGUgY2F2ZXMgaW4gdGlsZXNldHMgOTAsIDk0LCBhbmQgOWNcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTBdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwNywgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDBlLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjAsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5NCwgMHg5Y10sXG4gICAgICAgICAgICAgICAgICAgIFsweDY4LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODMsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDg5LCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG5cbiAgLy8gTm93IHJlcGxhY2UgdGhlIHRpbGVzIHdpdGggdGhlIGJsb2NrYWJsZSBvbmVzXG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDc5XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4N2FdID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4OV0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDhhXSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NThdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTZdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1N10gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY2XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjddID0gMHgwNDtcblxuICAvLyBEZXN0cnVjdHVyZSBvdXQgYSBmZXcgbG9jYXRpb25zIGJ5IG5hbWVcbiAgY29uc3Qge1xuICAgIFZhbGxleU9mV2luZCxcbiAgICBDb3JkZWxQbGFpbldlc3QsXG4gICAgQ29yZGVsUGxhaW5FYXN0LFxuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLFxuICAgIFdhdGVyZmFsbFZhbGxleVNvdXRoLFxuICAgIEtpcmlzYU1lYWRvdyxcbiAgICBTYWhhcmFPdXRzaWRlQ2F2ZSxcbiAgICBEZXNlcnQyLFxuICB9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBOT1RFOiBmbGFnIDJmMCBpcyBBTFdBWVMgc2V0IC0gdXNlIGl0IGFzIGEgYmFzZWxpbmUuXG4gIGNvbnN0IGZsYWdzVG9DbGVhcjogW0xvY2F0aW9uLCBudW1iZXJdW10gPSBbXG4gICAgW1ZhbGxleU9mV2luZCwgMHgzMF0sIC8vIHZhbGxleSBvZiB3aW5kLCB6ZWJ1J3MgY2F2ZVxuICAgIFtDb3JkZWxQbGFpbldlc3QsIDB4MzBdLCAvLyBjb3JkZWwgd2VzdCwgdmFtcGlyZSBjYXZlXG4gICAgW0NvcmRlbFBsYWluRWFzdCwgMHgzMF0sIC8vIGNvcmRlbCBlYXN0LCB2YW1waXJlIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDBdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIHByaXNvbiBjYXZlXG4gICAgW1dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDE0XSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBmb2cgbGFtcFxuICAgIFtXYXRlcmZhbGxWYWxsZXlTb3V0aCwgMHg3NF0sIC8vIHdhdGVyZmFsbCBzb3V0aCwga2lyaXNhXG4gICAgW0tpcmlzYU1lYWRvdywgMHgxMF0sIC8vIGtpcmlzYSBtZWFkb3dcbiAgICBbU2FoYXJhT3V0c2lkZUNhdmUsIDB4MDBdLCAvLyBjYXZlIHRvIGRlc2VydFxuICAgIFtEZXNlcnQyLCAweDQxXSxcbiAgXTtcbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkgJiYgZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICBmbGFnc1RvQ2xlYXIucHVzaChbcm9tLmxvY2F0aW9ucy5MaW1lVHJlZVZhbGxleSwgMHgxMF0pO1xuICB9XG4gIGZvciAoY29uc3QgW2xvYywgeXhdIG9mIGZsYWdzVG9DbGVhcikge1xuICAgIGxvYy5mbGFncy5wdXNoKEZsYWcub2Yoe3l4LCBmbGFnOiAweDJmMH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2VGbGFnKGxvYzogTG9jYXRpb24sIHl4OiBudW1iZXIsIGZsYWc6IG51bWJlcik6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgIGlmIChmLnl4ID09PSB5eCkge1xuICAgICAgICBmLmZsYWcgPSBmbGFnO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZmxhZyB0byByZXBsYWNlIGF0ICR7bG9jfToke3l4fWApO1xuICB9O1xuXG4gIGlmIChmbGFncy5wYXJhbHlzaXNSZXF1aXJlc1ByaXNvbktleSgpKSB7IC8vIGNsb3NlIG9mZiByZXZlcnNlIGVudHJhbmNlc1xuICAgIC8vIE5PVEU6IHdlIGNvdWxkIGFsc28gY2xvc2UgaXQgb2ZmIHVudGlsIGJvc3Mga2lsbGVkLi4uP1xuICAgIC8vICAtIGNvbnN0IHZhbXBpcmVGbGFnID0gfnJvbS5ucGNTcGF3bnNbMHhjMF0uY29uZGl0aW9uc1sweDBhXVswXTtcbiAgICAvLyAgLT4ga2VsYmVzcXVlIGZvciB0aGUgb3RoZXIgb25lLlxuICAgIGNvbnN0IHdpbmRtaWxsRmxhZyA9IDB4MmVlO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluV2VzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbkVhc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG5cbiAgICByZXBsYWNlRmxhZyhXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMCwgMHgyZDgpOyAvLyBrZXkgdG8gcHJpc29uIGZsYWdcbiAgICBjb25zdCBleHBsb3Npb24gPSBTcGF3bi5vZih7eTogMHgwNjAsIHg6IDB4MDYwLCB0eXBlOiA0LCBpZDogMHgyY30pO1xuICAgIGNvbnN0IGtleVRyaWdnZXIgPSBTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MDcwLCB0eXBlOiAyLCBpZDogMHhhZH0pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5zcGxpY2UoMSwgMCwgZXhwbG9zaW9uKTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMucHVzaChrZXlUcmlnZ2VyKTtcbiAgfVxuXG4gIC8vIHJvbS5sb2NhdGlvbnNbMHgxNF0udGlsZUVmZmVjdHMgPSAweGIzO1xuXG4gIC8vIGQ3IGZvciAzP1xuXG4gIC8vIFRPRE8gLSB0aGlzIGVuZGVkIHVwIHdpdGggbWVzc2FnZSAwMDowMyBhbmQgYW4gYWN0aW9uIHRoYXQgZ2F2ZSBib3cgb2YgbW9vbiFcblxuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5wYXJ0ID0gMHgxYjtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UuaW5kZXggPSAweDA4O1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0uZmxhZ3MucHVzaCgweDJmNiwgMHgyZjcsIDB4MmY4KTtcbn1cblxuLy8gQHRzLWlnbm9yZTogbm90IHlldCB1c2VkXG5mdW5jdGlvbiBlYXN0Q2F2ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gVE9ETyBmaWxsIHVwIGdyYXBoaWNzLCBldGMgLS0+ICQxYSwgJDFiLCAkMDUgLyAkODgsICRiNSAvICQxNCwgJDAyXG4gIC8vIFRoaW5rIGFvYnV0IGV4aXRzIGFuZCBlbnRyYW5jZXMuLi4/XG5cbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXksIFNlYWxlZENhdmUxfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgY29uc3QgbG9jMSA9IHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUocm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTEpO1xuICBjb25zdCBsb2MyID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMik7XG5cbiAgLy8gTk9URTogMHg5YyBjYW4gYmVjb21lIDB4OTkgaW4gdG9wIGxlZnQgb3IgMHg5NyBpbiB0b3AgcmlnaHQgb3IgYm90dG9tIG1pZGRsZSBmb3IgYSBjYXZlIGV4aXRcbiAgbG9jMS5zY3JlZW5zID0gW1sweDljLCAweDg0LCAweDgwLCAweDgzLCAweDljXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgzLCAweDg2LCAweDgwXSxcbiAgICAgICAgICAgICAgICAgIFsweDgzLCAweDg4LCAweDg5LCAweDgwLCAweDgwXSxcbiAgICAgICAgICAgICAgICAgIFsweDgxLCAweDhjLCAweDg1LCAweDgyLCAweDg0XSxcbiAgICAgICAgICAgICAgICAgIFsweDllLCAweDg1LCAweDljLCAweDk4LCAweDg2XV07XG5cbiAgbG9jMi5zY3JlZW5zID0gW1sweDljLCAweDg0LCAweDliLCAweDgwLCAweDliXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgxLCAweDgwLCAweDgxXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDg3LCAweDhiLCAweDhhLCAweDg2XSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDhjLCAweDgwLCAweDg1LCAweDg0XSxcbiAgICAgICAgICAgICAgICAgIFsweDljLCAweDg2LCAweDgwLCAweDgwLCAweDlhXV07XG5cbiAgZm9yIChjb25zdCBsIG9mIFtsb2MxLCBsb2MyXSkge1xuICAgIGwuYmdtID0gMHgxNzsgLy8gbXQgc2FicmUgY2F2ZSBtdXNpYz9cbiAgICBsLmVudHJhbmNlcyA9IFtdO1xuICAgIGwuZXhpdHMgPSBbXTtcbiAgICBsLnBpdHMgPSBbXTtcbiAgICBsLnNwYXducyA9IFtdO1xuICAgIGwuZmxhZ3MgPSBbXTtcbiAgICBsLmhlaWdodCA9IGwuc2NyZWVucy5sZW5ndGg7XG4gICAgbC53aWR0aCA9IGwuc2NyZWVuc1swXS5sZW5ndGg7XG4gICAgbC5leHRlbmRlZCA9IDA7XG4gICAgbC50aWxlUGFsZXR0ZXMgPSBbMHgxYSwgMHgxYiwgMHgwNV07XG4gICAgbC50aWxlc2V0ID0gMHg4ODtcbiAgICBsLnRpbGVFZmZlY3RzID0gMHhiNTtcbiAgICBsLnRpbGVQYXR0ZXJucyA9IFsweDE0LCAweDAyXTtcbiAgICBsLnNwcml0ZVBhdHRlcm5zID0gWy4uLlNlYWxlZENhdmUxLnNwcml0ZVBhdHRlcm5zXSBhcyBbbnVtYmVyLCBudW1iZXJdO1xuICAgIGwuc3ByaXRlUGFsZXR0ZXMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGFsZXR0ZXNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gIH1cblxuICAvLyBBZGQgZW50cmFuY2UgdG8gdmFsbGV5IG9mIHdpbmRcbiAgLy8gVE9ETyAtIG1heWJlIGp1c3QgZG8gKDB4MzMsIFtbMHgxOV1dKSBvbmNlIHdlIGZpeCB0aGF0IHNjcmVlbiBmb3IgZ3Jhc3NcbiAgVmFsbGV5T2ZXaW5kLndyaXRlU2NyZWVuczJkKDB4MjMsIFtcbiAgICBbMHgxMSwgMHgwZF0sXG4gICAgWzB4MDksIDB4YzJdXSk7XG4gIHJvbS50aWxlRWZmZWN0c1swXS5lZmZlY3RzWzB4YzBdID0gMDtcbiAgLy8gVE9ETyAtIGRvIHRoaXMgb25jZSB3ZSBmaXggdGhlIHNlYSB0aWxlc2V0XG4gIC8vIHJvbS5zY3JlZW5zWzB4YzJdLnRpbGVzWzB4NWFdID0gMHgwYTtcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1Yl0gPSAweDBhO1xuXG4gIC8vIENvbm5lY3QgbWFwc1xuICBsb2MxLmNvbm5lY3QoMHg0MywgbG9jMiwgMHg0NCk7XG4gIGxvYzEuY29ubmVjdCgweDQwLCBWYWxsZXlPZldpbmQsIDB4MzQpO1xuXG4gIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIC8vIEFkZCBlbnRyYW5jZSB0byBsaW1lIHRyZWUgdmFsbGV5XG4gICAgTGltZVRyZWVWYWxsZXkucmVzaXplU2NyZWVucygwLCAxLCAwLCAwKTsgLy8gYWRkIG9uZSBzY3JlZW4gdG8gbGVmdCBlZGdlXG4gICAgTGltZVRyZWVWYWxsZXkud3JpdGVTY3JlZW5zMmQoMHgwMCwgW1xuICAgICAgWzB4MGMsIDB4MTFdLFxuICAgICAgWzB4MTUsIDB4MzZdLFxuICAgICAgWzB4MGUsIDB4MGZdXSk7XG4gICAgbG9jMS5zY3JlZW5zWzBdWzRdID0gMHg5NzsgLy8gZG93biBzdGFpclxuICAgIGxvYzEuY29ubmVjdCgweDA0LCBMaW1lVHJlZVZhbGxleSwgMHgxMCk7XG4gIH1cblxuICAvLyBBZGQgbW9uc3RlcnNcbiAgbG9jMS5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDIxLCB0aWxlOiAweDg3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4ODgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTMsIHRpbGU6IDB4ODksIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMiwgdGlsZTogMHg2OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MDMsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGxvYzIuc3Bhd25zLnB1c2goXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDExLCB0aWxlOiAweDQ4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEyLCB0aWxlOiAweDc3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTQsIHRpbGU6IDB4MjgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjMsIHRpbGU6IDB4ODUsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDhhLCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDM0LCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4NDEsIHRpbGU6IDB4ODIsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGlmICghZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIGNoZXN0OiBhbGFybSBmbHV0ZVxuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MTEwLCB4OiAweDQ3OCwgdHlwZTogMiwgaWQ6IDB4MzF9KSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGFkZFpvbWJpZVdhcnAocm9tOiBSb20pIHtcbiAgLy8gTWFrZSBzcGFjZSBmb3IgdGhlIG5ldyBmbGFnIGJldHdlZW4gSm9lbCBhbmQgU3dhblxuICBmb3IgKGxldCBpID0gMHgyZjU7IGkgPCAweDJmYzsgaSsrKSB7XG4gICAgcm9tLm1vdmVGbGFnKGksIGkgLSAxKTtcbiAgfVxuICAvLyBVcGRhdGUgdGhlIG1lbnVcbiAgY29uc3QgbWVzc2FnZSA9IHJvbS5tZXNzYWdlcy5wYXJ0c1sweDIxXVswXTtcbiAgbWVzc2FnZS50ZXh0ID0gW1xuICAgICcgezFhOkxlYWZ9ICAgICAgezE2OkJyeW5tYWVyfSB7MWQ6T2FrfSAnLFxuICAgICd7MGM6TmFkYXJlfVxcJ3MgIHsxZTpQb3J0b2F9ICAgezE0OkFtYXpvbmVzfSAnLFxuICAgICd7MTk6Sm9lbH0gICAgICBab21iaWUgICB7MjA6U3dhbn0gJyxcbiAgICAnezIzOlNoeXJvbn0gICAgezE4OkdvYX0gICAgICB7MjE6U2FoYXJhfScsXG4gIF0uam9pbignXFxuJyk7XG4gIC8vIEFkZCBhIHRyaWdnZXIgdG8gdGhlIGVudHJhbmNlIC0gdGhlcmUncyBhbHJlYWR5IGEgc3Bhd24gZm9yIDhhXG4gIC8vIGJ1dCB3ZSBjYW4ndCByZXVzZSB0aGF0IHNpbmNlIGl0J3MgdGhlIHNhbWUgYXMgdGhlIG9uZSBvdXRzaWRlXG4gIC8vIHRoZSBtYWluIEVTSSBlbnRyYW5jZTsgc28gcmV1c2UgYSBkaWZmZXJlbnQgb25lLlxuICBjb25zdCB0cmlnZ2VyID0gcm9tLm5leHRGcmVlVHJpZ2dlcigpO1xuICB0cmlnZ2VyLnVzZWQgPSB0cnVlO1xuICB0cmlnZ2VyLmNvbmRpdGlvbnMgPSBbXTtcbiAgdHJpZ2dlci5tZXNzYWdlID0gTWVzc2FnZUlkLm9mKHt9KTtcbiAgdHJpZ2dlci5mbGFncyA9IFsweDJmYl07IC8vIG5ldyB3YXJwIHBvaW50IGZsYWdcbiAgLy8gQWN0dWFsbHkgcmVwbGFjZSB0aGUgdHJpZ2dlci5cbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhhKSB7XG4gICAgICBzcGF3bi5pZCA9IHRyaWdnZXIuaWQ7XG4gICAgfSAgICBcbiAgfVxuICAvLyBJbnNlcnQgaW50byB0aGUgd2FycCB0YWJsZS5cbiAgZm9yIChsZXQgaSA9IDB4M2RjNjI7IGkgPj0gMHgzZGM1ZjsgaS0tKSB7XG4gICAgcm9tLnByZ1tpICsgMV0gPSByb20ucHJnW2ldO1xuICB9XG4gIHJvbS5wcmdbMHgzZGM1Zl0gPSByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uaWQ7XG4gIC8vIEFTTSBmaXhlcyBzaG91bGQgaGF2ZSBoYXBwZW5lZCBpbiBwcmVzaHVmZmxlLnNcbn1cblxuZnVuY3Rpb24gZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb206IFJvbSkge1xuICByb20udHJpZ2dlcigweDhhKS5jb25kaXRpb25zID0gW34weDBlZV07IC8vIG5ldyBmbGFnIGZvciByaWRpbmcgZG9scGhpblxuICByb20ubWVzc2FnZXMucGFydHNbMHgxZF1bMHgxMF0udGV4dCA9IGBUaGUgY2F2ZSBlbnRyYW5jZSBhcHBlYXJzXG50byBiZSB1bmRlcndhdGVyLiBZb3UnbGxcbm5lZWQgdG8gc3dpbS5gO1xufVxuXG5mdW5jdGlvbiByZXZlcnNpYmxlU3dhbkdhdGUocm9tOiBSb20pIHtcbiAgLy8gQWxsb3cgb3BlbmluZyBTd2FuIGZyb20gZWl0aGVyIHNpZGUgYnkgYWRkaW5nIGEgcGFpciBvZiBndWFyZHMgb24gdGhlXG4gIC8vIG9wcG9zaXRlIHNpZGUgb2YgdGhlIGdhdGUuXG4gIHJvbS5sb2NhdGlvbnNbMHg3M10uc3Bhd25zLnB1c2goXG4gICAgLy8gTk9URTogU29sZGllcnMgbXVzdCBjb21lIGluIHBhaXJzICh3aXRoIGluZGV4IF4xIGZyb20gZWFjaCBvdGhlcilcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGEsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwYiwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBlLCB5dDogMHgwYSwgdHlwZTogMiwgaWQ6IDB4YjN9KSwgLy8gbmV3IHRyaWdnZXI6IGVyYXNlIGd1YXJkc1xuICApO1xuXG4gIC8vIEd1YXJkcyAoJDJkKSBhdCBzd2FuIGdhdGUgKCQ3MykgfiBzZXQgMTBkIGFmdGVyIG9wZW5pbmcgZ2F0ZSA9PiBjb25kaXRpb24gZm9yIGRlc3Bhd25cbiAgcm9tLm5wY3NbMHgyZF0ubG9jYWxEaWFsb2dzLmdldCgweDczKSFbMF0uZmxhZ3MucHVzaCgweDEwZCk7XG5cbiAgLy8gRGVzcGF3biBndWFyZCB0cmlnZ2VyIHJlcXVpcmVzIDEwZFxuICByb20udHJpZ2dlcigweGIzKS5jb25kaXRpb25zLnB1c2goMHgxMGQpO1xufVxuXG5mdW5jdGlvbiBwcmV2ZW50TnBjRGVzcGF3bnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGZ1bmN0aW9uIHJlbW92ZTxUPihhcnI6IFRbXSwgZWxlbTogVCk6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmluZGV4T2YoZWxlbSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50ICR7ZWxlbX0gaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlSWY8VD4oYXJyOiBUW10sIHByZWQ6IChlbGVtOiBUKSA9PiBib29sZWFuKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuZmluZEluZGV4KHByZWQpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpYWxvZyhpZDogbnVtYmVyLCBsb2M6IG51bWJlciA9IC0xKTogTG9jYWxEaWFsb2dbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLmxvY2FsRGlhbG9ncy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGRpYWxvZyAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIHNwYXducyhpZDogbnVtYmVyLCBsb2M6IG51bWJlcik6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0uc3Bhd25Db25kaXRpb25zLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgc3Bhd24gY29uZGl0aW9uICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBMaW5rIHNvbWUgcmVkdW5kYW50IE5QQ3M6IEtlbnN1ICg3ZSwgNzQpIGFuZCBBa2FoYW5hICg4OCwgMTYpXG4gIHJvbS5ucGNzWzB4NzRdLmxpbmsoMHg3ZSk7XG4gIHJvbS5ucGNzWzB4NzRdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDc0XS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4N2VdLmRhdGFdIGFzIGFueTtcbiAgcm9tLmxvY2F0aW9ucy5Td2FuX0RhbmNlSGFsbC5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDdlKSEuaWQgPSAweDc0O1xuICByb20uaXRlbXNbMHgzYl0udHJhZGVJbiFbMF0gPSAweDc0O1xuXG4gIC8vIGRpYWxvZyBpcyBzaGFyZWQgYmV0d2VlbiA4OCBhbmQgMTYuXG4gIHJvbS5ucGNzWzB4ODhdLmxpbmtEaWFsb2coMHgxNik7XG5cbiAgLy8gTWFrZSBhIG5ldyBOUEMgZm9yIEFrYWhhbmEgaW4gQnJ5bm1hZXI7IG90aGVycyB3b24ndCBhY2NlcHQgdGhlIFN0YXR1ZSBvZiBPbnl4LlxuICAvLyBMaW5raW5nIHNwYXduIGNvbmRpdGlvbnMgYW5kIGRpYWxvZ3MgaXMgc3VmZmljaWVudCwgc2luY2UgdGhlIGFjdHVhbCBOUEMgSURcbiAgLy8gKDE2IG9yIDgyKSBpcyB3aGF0IG1hdHRlcnMgZm9yIHRoZSB0cmFkZS1pblxuICByb20ubnBjc1sweDgyXS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg4Ml0ubGluaygweDE2KTtcbiAgcm9tLm5wY3NbMHg4Ml0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDE2XS5kYXRhXSBhcyBhbnk7IC8vIGVuc3VyZSBnaXZlIGl0ZW1cbiAgcm9tLmxvY2F0aW9ucy5CcnlubWFlci5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDE2KSEuaWQgPSAweDgyO1xuICByb20uaXRlbXNbMHgyNV0udHJhZGVJbiFbMF0gPSAweDgyO1xuXG4gIC8vIExlYWYgZWxkZXIgaW4gaG91c2UgKCQwZCBAICRjMCkgfiBzd29yZCBvZiB3aW5kIHJlZHVuZGFudCBmbGFnXG4gIC8vIGRpYWxvZygweDBkLCAweGMwKVsyXS5mbGFncyA9IFtdO1xuICAvL3JvbS5pdGVtR2V0c1sweDAwXS5mbGFncyA9IFtdOyAvLyBjbGVhciByZWR1bmRhbnQgZmxhZ1xuXG4gIC8vIExlYWYgcmFiYml0ICgkMTMpIG5vcm1hbGx5IHN0b3BzIHNldHRpbmcgaXRzIGZsYWcgYWZ0ZXIgcHJpc29uIGRvb3Igb3BlbmVkLFxuICAvLyBidXQgdGhhdCBkb2Vzbid0IG5lY2Vzc2FyaWx5IG9wZW4gbXQgc2FicmUuICBJbnN0ZWFkIChhKSB0cmlnZ2VyIG9uIDA0N1xuICAvLyAoc2V0IGJ5IDhkIHVwb24gZW50ZXJpbmcgZWxkZXIncyBjZWxsKS4gIEFsc28gbWFrZSBzdXJlIHRoYXQgdGhhdCBwYXRoIGFsc29cbiAgLy8gcHJvdmlkZXMgdGhlIG5lZWRlZCBmbGFnIHRvIGdldCBpbnRvIG10IHNhYnJlLlxuICBkaWFsb2coMHgxMylbMl0uY29uZGl0aW9uID0gMHgwNDc7XG4gIGRpYWxvZygweDEzKVsyXS5mbGFncyA9IFsweDBhOV07XG4gIGRpYWxvZygweDEzKVszXS5mbGFncyA9IFsweDBhOV07XG5cbiAgLy8gV2luZG1pbGwgZ3VhcmQgKCQxNCBAICQwZSkgc2hvdWxkbid0IGRlc3Bhd24gYWZ0ZXIgYWJkdWN0aW9uICgwMzgpLFxuICAvLyBidXQgaW5zdGVhZCBhZnRlciBnaXZpbmcgdGhlIGl0ZW0gKDA4OClcbiAgc3Bhd25zKDB4MTQsIDB4MGUpWzFdID0gfjB4MDg4OyAvLyByZXBsYWNlIGZsYWcgfjAzOCA9PiB+MDg4XG4gIC8vZGlhbG9nKDB4MTQsIDB4MGUpWzBdLmZsYWdzID0gW107IC8vIHJlbW92ZSByZWR1bmRhbnQgZmxhZyB+IHdpbmRtaWxsIGtleVxuXG4gIC8vIEFrYWhhbmEgKCQxNiAvIDg4KSB+IHNoaWVsZCByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4MTYsIDB4NTcpWzBdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRpc2FwcGVhciBhZnRlciBnZXR0aW5nIGJhcnJpZXIgKG5vdGUgODgncyBzcGF3bnMgbm90IGxpbmtlZCB0byAxNilcbiAgcmVtb3ZlKHNwYXducygweDE2LCAweDU3KSwgfjB4MDUxKTtcbiAgcmVtb3ZlKHNwYXducygweDg4LCAweDU3KSwgfjB4MDUxKTtcblxuICBmdW5jdGlvbiByZXZlcnNlRGlhbG9nKGRzOiBMb2NhbERpYWxvZ1tdKTogdm9pZCB7XG4gICAgZHMucmV2ZXJzZSgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IG5leHQgPSBkc1tpICsgMV07XG4gICAgICBkc1tpXS5jb25kaXRpb24gPSBuZXh0ID8gfm5leHQuY29uZGl0aW9uIDogfjA7XG4gICAgfVxuICB9O1xuXG4gIC8vIE9hayBlbGRlciAoJDFkKSB+IHN3b3JkIG9mIGZpcmUgcmVkdW5kYW50IGZsYWdcbiAgY29uc3Qgb2FrRWxkZXJEaWFsb2cgPSBkaWFsb2coMHgxZCk7XG4gIC8vb2FrRWxkZXJEaWFsb2dbNF0uZmxhZ3MgPSBbXTtcbiAgLy8gTWFrZSBzdXJlIHRoYXQgd2UgdHJ5IHRvIGdpdmUgdGhlIGl0ZW0gZnJvbSAqYWxsKiBwb3N0LWluc2VjdCBkaWFsb2dzXG4gIG9ha0VsZGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1syXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzNdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcblxuICAvLyBPYWsgbW90aGVyICgkMWUpIH4gaW5zZWN0IGZsdXRlIHJlZHVuZGFudCBmbGFnXG4gIC8vIFRPRE8gLSByZWFycmFuZ2UgdGhlc2UgZmxhZ3MgYSBiaXQgKG1heWJlIH4wNDUsIH4wYTAgfjA0MSAtIHNvIHJldmVyc2UpXG4gIC8vICAgICAgLSB3aWxsIG5lZWQgdG8gY2hhbmdlIGJhbGxPZkZpcmUgYW5kIGluc2VjdEZsdXRlIGluIGRlcGdyYXBoXG4gIGNvbnN0IG9ha01vdGhlckRpYWxvZyA9IGRpYWxvZygweDFlKTtcbiAgKCgpID0+IHtcbiAgICBjb25zdCBba2lsbGVkSW5zZWN0LCBnb3RJdGVtLCBnZXRJdGVtLCBmaW5kQ2hpbGRdID0gb2FrTW90aGVyRGlhbG9nO1xuICAgIGZpbmRDaGlsZC5jb25kaXRpb24gPSB+MHgwNDU7XG4gICAgLy9nZXRJdGVtLmNvbmRpdGlvbiA9IH4weDIyNztcbiAgICAvL2dldEl0ZW0uZmxhZ3MgPSBbXTtcbiAgICBnb3RJdGVtLmNvbmRpdGlvbiA9IH4wO1xuICAgIHJvbS5ucGNzWzB4MWVdLmxvY2FsRGlhbG9ncy5zZXQoLTEsIFtmaW5kQ2hpbGQsIGdldEl0ZW0sIGtpbGxlZEluc2VjdCwgZ290SXRlbV0pO1xuICB9KSgpO1xuICAvLy8gb2FrTW90aGVyRGlhbG9nWzJdLmZsYWdzID0gW107XG4gIC8vIC8vIEVuc3VyZSB3ZSBhbHdheXMgZ2l2ZSBpdGVtIGFmdGVyIGluc2VjdC5cbiAgLy8gb2FrTW90aGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gb2FrTW90aGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gcmV2ZXJzZURpYWxvZyhvYWtNb3RoZXJEaWFsb2cpO1xuXG4gIC8vIFJldmVyc2UgdGhlIG90aGVyIG9hayBkaWFsb2dzLCB0b28uXG4gIGZvciAoY29uc3QgaSBvZiBbMHgyMCwgMHgyMSwgMHgyMiwgMHg3YywgMHg3ZF0pIHtcbiAgICByZXZlcnNlRGlhbG9nKGRpYWxvZyhpKSk7XG4gIH1cblxuICAvLyBTd2FwIHRoZSBmaXJzdCB0d28gb2FrIGNoaWxkIGRpYWxvZ3MuXG4gIGNvbnN0IG9ha0NoaWxkRGlhbG9nID0gZGlhbG9nKDB4MWYpO1xuICBvYWtDaGlsZERpYWxvZy51bnNoaWZ0KC4uLm9ha0NoaWxkRGlhbG9nLnNwbGljZSgxLCAxKSk7XG5cbiAgLy8gVGhyb25lIHJvb20gYmFjayBkb29yIGd1YXJkICgkMzMgQCAkZGYpIHNob3VsZCBoYXZlIHNhbWUgc3Bhd24gY29uZGl0aW9uIGFzIHF1ZWVuXG4gIC8vICgwMjAgTk9UIHF1ZWVuIG5vdCBpbiB0aHJvbmUgcm9vbSBBTkQgMDFiIE5PVCB2aWV3ZWQgbWVzaWEgcmVjb3JkaW5nKVxuICByb20ubnBjc1sweDMzXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZGYsICBbfjB4MDIwLCB+MHgwMWJdKTtcblxuICAvLyBGcm9udCBwYWxhY2UgZ3VhcmQgKCQzNCkgdmFjYXRpb24gbWVzc2FnZSBrZXlzIG9mZiAwMWIgaW5zdGVhZCBvZiAwMWZcbiAgZGlhbG9nKDB4MzQpWzFdLmNvbmRpdGlvbiA9IDB4MDFiO1xuXG4gIC8vIFF1ZWVuJ3MgKCQzOCkgZGlhbG9nIG5lZWRzIHF1aXRlIGEgYml0IG9mIHdvcmtcbiAgLy8gR2l2ZSBpdGVtIChmbHV0ZSBvZiBsaW1lKSBldmVuIGlmIGdvdCB0aGUgc3dvcmQgb2Ygd2F0ZXJcbiAgZGlhbG9nKDB4MzgpWzNdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMzsgLy8gXCJ5b3UgZm91bmQgc3dvcmRcIiA9PiBhY3Rpb24gM1xuICBkaWFsb2coMHgzOClbNF0uZmxhZ3MucHVzaCgweDA5Yyk7ICAgICAvLyBzZXQgMDljIHF1ZWVuIGdvaW5nIGF3YXlcbiAgLy8gUXVlZW4gc3Bhd24gY29uZGl0aW9uIGRlcGVuZHMgb24gMDFiIChtZXNpYSByZWNvcmRpbmcpIG5vdCAwMWYgKGJhbGwgb2Ygd2F0ZXIpXG4gIC8vIFRoaXMgZW5zdXJlcyB5b3UgaGF2ZSBib3RoIHN3b3JkIGFuZCBiYWxsIHRvIGdldCB0byBoZXIgKD8/PylcbiAgc3Bhd25zKDB4MzgsIDB4ZGYpWzFdID0gfjB4MDFiOyAgLy8gdGhyb25lIHJvb206IDAxYiBOT1QgbWVzaWEgcmVjb3JkaW5nXG4gIHNwYXducygweDM4LCAweGUxKVswXSA9IDB4MDFiOyAgIC8vIGJhY2sgcm9vbTogMDFiIG1lc2lhIHJlY29yZGluZ1xuICBkaWFsb2coMHgzOClbMV0uY29uZGl0aW9uID0gMHgwMWI7ICAgICAvLyByZXZlYWwgY29uZGl0aW9uOiAwMWIgbWVzaWEgcmVjb3JkaW5nXG5cbiAgLy8gRm9ydHVuZSB0ZWxsZXIgKCQzOSkgc2hvdWxkIGFsc28gbm90IHNwYXduIGJhc2VkIG9uIG1lc2lhIHJlY29yZGluZyByYXRoZXIgdGhhbiBvcmJcbiAgc3Bhd25zKDB4MzksIDB4ZDgpWzFdID0gfjB4MDFiOyAgLy8gZm9ydHVuZSB0ZWxsZXIgcm9vbTogMDFiIE5PVFxuXG4gIC8vIENsYXJrICgkNDQpIG1vdmVzIGFmdGVyIHRhbGtpbmcgdG8gaGltICgwOGQpIHJhdGhlciB0aGFuIGNhbG1pbmcgc2VhICgwOGYpLlxuICAvLyBUT0RPIC0gY2hhbmdlIDA4ZCB0byB3aGF0ZXZlciBhY3R1YWwgaXRlbSBoZSBnaXZlcywgdGhlbiByZW1vdmUgYm90aCBmbGFnc1xuICByb20ubnBjc1sweDQ0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZTksIFt+MHgwOGRdKTsgLy8gem9tYmllIHRvd24gYmFzZW1lbnRcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU0LCBbMHgwOGRdKTsgIC8vIGpvZWwgc2hlZFxuICAvL2RpYWxvZygweDQ0LCAweGU5KVsxXS5mbGFncy5wb3AoKTsgLy8gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcblxuICAvLyBCcm9rYWhhbmEgKCQ1NCkgfiB3YXJyaW9yIHJpbmcgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1NClbMl0uZmxhZ3MgPSBbXTtcblxuICAvLyBEZW8gKCQ1YSkgfiBwZW5kYW50IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NWEpWzFdLmZsYWdzID0gW107XG5cbiAgLy8gWmVidSAoJDVlKSBjYXZlIGRpYWxvZyAoQCAkMTApXG4gIC8vIFRPRE8gLSBkaWFsb2dzKDB4NWUsIDB4MTApLnJlYXJyYW5nZSh+MHgwM2EsIDB4MDBkLCAweDAzOCwgMHgwMzksIDB4MDBhLCB+MHgwMDApO1xuICByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3Muc2V0KDB4MTAsIFtcbiAgICBMb2NhbERpYWxvZy5vZih+MHgwM2EsIFsweDAwLCAweDFhXSwgWzB4MDNhXSksIC8vIDAzYSBOT1QgdGFsa2VkIHRvIHplYnUgaW4gY2F2ZSAtPiBTZXQgMDNhXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBkLCBbMHgwMCwgMHgxZF0pLCAvLyAwMGQgbGVhZiB2aWxsYWdlcnMgcmVzY3VlZFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAzOCwgWzB4MDAsIDB4MWNdKSwgLy8gMDM4IGxlYWYgYXR0YWNrZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzksIFsweDAwLCAweDFkXSksIC8vIDAzOSBsZWFybmVkIHJlZnJlc2hcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMGEsIFsweDAwLCAweDFiLCAweDAzXSksIC8vIDAwYSB3aW5kbWlsbCBrZXkgdXNlZCAtPiB0ZWFjaCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDAwLCBbMHgwMCwgMHgxZF0pLFxuICBdKTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcmVtb3ZlKHNwYXducygweDVlLCAweDEwKSwgfjB4MDUxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gVG9ybmVsICgkNWYpIGluIHNhYnJlIHdlc3QgKCQyMSkgfiB0ZWxlcG9ydCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVmLCAweDIxKVsxXS5mbGFncyA9IFtdO1xuICAvLyBEb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByb20ubnBjc1sweDVmXS5zcGF3bkNvbmRpdGlvbnMuZGVsZXRlKDB4MjEpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBTdG9tICgkNjApOiBkb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByb20ubnBjc1sweDYwXS5zcGF3bkNvbmRpdGlvbnMuZGVsZXRlKDB4MWUpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBBc2luYSAoJDYyKSBpbiBiYWNrIHJvb20gKCRlMSkgZ2l2ZXMgZmx1dGUgb2YgbGltZVxuICBjb25zdCBhc2luYSA9IHJvbS5ucGNzWzB4NjJdO1xuICBhc2luYS5kYXRhWzFdID0gMHgyODtcbiAgZGlhbG9nKGFzaW5hLmlkLCAweGUxKVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MTE7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMl0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICAvLyBQcmV2ZW50IGRlc3Bhd24gZnJvbSBiYWNrIHJvb20gYWZ0ZXIgZGVmZWF0aW5nIHNhYmVyYSAofjA4ZilcbiAgcmVtb3ZlKHNwYXducyhhc2luYS5pZCwgMHhlMSksIH4weDA4Zik7XG5cbiAgLy8gS2Vuc3UgaW4gY2FiaW4gKCQ2OCBAICQ2MSkgbmVlZHMgdG8gYmUgYXZhaWxhYmxlIGV2ZW4gYWZ0ZXIgdmlzaXRpbmcgSm9lbC5cbiAgLy8gQ2hhbmdlIGhpbSB0byBqdXN0IGRpc2FwcGVhciBhZnRlciBzZXR0aW5nIHRoZSByaWRlYWJsZSBkb2xwaGluIGZsYWcgKDA5YiksXG4gIC8vIGFuZCB0byBub3QgZXZlbiBzaG93IHVwIGF0IGFsbCB1bmxlc3MgdGhlIGZvZyBsYW1wIHdhcyByZXR1cm5lZCAoMDIxKS5cbiAgcm9tLm5wY3NbMHg2OF0uc3Bhd25Db25kaXRpb25zLnNldCgweDYxLCBbfjB4MDliLCAweDAyMV0pO1xuICBkaWFsb2coMHg2OClbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAyOyAvLyBkaXNhcHBlYXJcblxuICAvLyBLZW5zdSBpbiBsaWdodGhvdXNlICgkNzQvJDdlIEAgJDYyKSB+IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NzQsIDB4NjIpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gQXp0ZWNhICgkODMpIGluIHB5cmFtaWQgfiBib3cgb2YgdHJ1dGggcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg4MylbMF0uY29uZGl0aW9uID0gfjB4MjQwOyAgLy8gMjQwIE5PVCBib3cgb2YgdHJ1dGhcbiAgLy9kaWFsb2coMHg4MylbMF0uZmxhZ3MgPSBbXTtcblxuICAvLyBSYWdlIGJsb2NrcyBvbiBzd29yZCBvZiB3YXRlciwgbm90IHJhbmRvbSBpdGVtIGZyb20gdGhlIGNoZXN0XG4gIGRpYWxvZygweGMzKVswXS5jb25kaXRpb24gPSAweDIwMjtcblxuICAvLyBSZW1vdmUgdXNlbGVzcyBzcGF3biBjb25kaXRpb24gZnJvbSBNYWRvIDFcbiAgcm9tLm5wY3NbMHhjNF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweGYyKTsgLy8gYWx3YXlzIHNwYXduXG5cbiAgLy8gRHJheWdvbiAyICgkY2IgQCBsb2NhdGlvbiAkYTYpIHNob3VsZCBkZXNwYXduIGFmdGVyIGJlaW5nIGRlZmVhdGVkLlxuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4YTYsIFt+MHgyOGRdKTsgLy8ga2V5IG9uIGJhY2sgd2FsbCBkZXN0cm95ZWRcblxuICAvLyBGaXggWmVidSB0byBnaXZlIGtleSB0byBzdHh5IGV2ZW4gaWYgdGh1bmRlciBzd29yZCBpcyBnb3R0ZW4gKGp1c3Qgc3dpdGNoIHRoZVxuICAvLyBvcmRlciBvZiB0aGUgZmlyc3QgdHdvKS4gIEFsc28gZG9uJ3QgYm90aGVyIHNldHRpbmcgMDNiIHNpbmNlIHRoZSBuZXcgSXRlbUdldFxuICAvLyBsb2dpYyBvYnZpYXRlcyB0aGUgbmVlZC5cbiAgY29uc3QgemVidVNoeXJvbiA9IHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5nZXQoMHhmMikhO1xuICB6ZWJ1U2h5cm9uLnVuc2hpZnQoLi4uemVidVNoeXJvbi5zcGxpY2UoMSwgMSkpO1xuICAvLyB6ZWJ1U2h5cm9uWzBdLmZsYWdzID0gW107XG5cbiAgLy8gU2h5cm9uIG1hc3NhY3JlICgkODApIHJlcXVpcmVzIGtleSB0byBzdHh5XG4gIHJvbS50cmlnZ2VyKDB4ODApLmNvbmRpdGlvbnMgPSBbXG4gICAgfjB4MDI3LCAvLyBub3QgdHJpZ2dlcmVkIG1hc3NhY3JlIHlldFxuICAgICAweDAzYiwgLy8gZ290IGl0ZW0gZnJvbSBrZXkgdG8gc3R4eSBzbG90XG4gICAgIDB4MmZkLCAvLyBzaHlyb24gd2FycCBwb2ludCB0cmlnZ2VyZWRcbiAgICAgLy8gMHgyMDMsIC8vIGdvdCBzd29yZCBvZiB0aHVuZGVyIC0gTk9UIEFOWSBNT1JFIVxuICBdO1xuXG4gIC8vIEVudGVyIHNoeXJvbiAoJDgxKSBzaG91bGQgc2V0IHdhcnAgbm8gbWF0dGVyIHdoYXRcbiAgcm9tLnRyaWdnZXIoMHg4MSkuY29uZGl0aW9ucyA9IFtdO1xuXG4gIGlmIChmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCkpIHtcbiAgICAvLyBMZWFybiBiYXJyaWVyICgkODQpIHJlcXVpcmVzIGNhbG0gc2VhXG4gICAgcm9tLnRyaWdnZXIoMHg4NCkuY29uZGl0aW9ucy5wdXNoKDB4MjgzKTsgLy8gMjgzIGNhbG1lZCB0aGUgc2VhXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIG5vdCBzZXR0aW5nIDA1MSBhbmQgY2hhbmdpbmcgdGhlIGNvbmRpdGlvbiB0byBtYXRjaCB0aGUgaXRlbVxuICB9XG4gIC8vcm9tLnRyaWdnZXIoMHg4NCkuZmxhZ3MgPSBbXTtcblxuICAvLyBBZGQgYW4gZXh0cmEgY29uZGl0aW9uIHRvIHRoZSBMZWFmIGFiZHVjdGlvbiB0cmlnZ2VyIChiZWhpbmQgemVidSkuICBUaGlzIGVuc3VyZXNcbiAgLy8gYWxsIHRoZSBpdGVtcyBpbiBMZWFmIHByb3BlciAoZWxkZXIgYW5kIHN0dWRlbnQpIGFyZSBnb3R0ZW4gYmVmb3JlIHRoZXkgZGlzYXBwZWFyLlxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2goMHgwM2EpOyAvLyAwM2EgdGFsa2VkIHRvIHplYnUgaW4gY2F2ZVxuXG4gIC8vIE1vcmUgd29yayBvbiBhYmR1Y3Rpb24gdHJpZ2dlcnM6XG4gIC8vIDEuIFJlbW92ZSB0aGUgOGQgdHJpZ2dlciBpbiB0aGUgZnJvbnQgb2YgdGhlIGNlbGwsIHN3YXAgaXQgb3V0XG4gIC8vICAgIGZvciBiMiAobGVhcm4gcGFyYWx5c2lzKS5cbiAgcm9tLnRyaWdnZXIoMHg4ZCkudXNlZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUuc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKSBzcGF3bi5pZCA9IDB4YjI7XG4gIH1cbiAgcmVtb3ZlSWYocm9tLmxvY2F0aW9ucy5XYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMsXG4gICAgICAgICAgIHNwYXduID0+IHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKTtcbiAgLy8gMi4gU2V0IHRoZSB0cmlnZ2VyIHRvIHJlcXVpcmUgaGF2aW5nIGtpbGxlZCBrZWxiZXNxdWUuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnMucHVzaCgweDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gMy4gQWxzbyBzZXQgdGhlIHRyaWdnZXIgdG8gZnJlZSB0aGUgdmlsbGFnZXJzIGFuZCB0aGUgZWxkZXIuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnB1c2gofjB4MDg0LCB+MHgwODUsIDB4MDBkKTtcbiAgLy8gNC4gRG9uJ3QgdHJpZ2dlciB0aGUgYWJkdWN0aW9uIGluIHRoZSBmaXJzdCBwbGFjZSBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA1LiBEb24ndCB0cmlnZ2VyIHJhYmJpdCBibG9jayBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDg2KS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA2LiBEb24ndCBmcmVlIHZpbGxhZ2VycyBmcm9tIHVzaW5nIHByaXNvbiBrZXlcbiAgcm9tLnByZ1sweDFlMGEzXSA9IDB4YzA7XG4gIHJvbS5wcmdbMHgxZTBhNF0gPSAweDAwO1xuXG4gIC8vIFRPRE8gLSBhZGRpdGlvbmFsIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXI6XG4gIC8vICAgLSBnZXQgcmlkIG9mIHRoZSBmbGFncyBvbiBrZXkgdG8gcHJpc29uIHVzZVxuICAvLyAgIC0gYWRkIGEgY29uZGl0aW9uIHRoYXQgYWJkdWN0aW9uIGRvZXNuJ3QgaGFwcGVuIGlmIHJlc2N1ZWRcbiAgLy8gR2V0IHJpZCBvZiBCT1RIIHRyaWdnZXJzIGluIHN1bW1pdCBjYXZlLCAgSW5zdGVhZCwgdGllIGV2ZXJ5dGhpbmdcbiAgLy8gdG8gdGhlIGVsZGVyIGRpYWxvZyBvbiB0b3BcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBzdGlsbCBhbGl2ZSwgbWF5YmUgZ2l2ZSBhIGhpbnQgYWJvdXQgd2Vha25lc3NcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBkZWFkIHRoZW4gdGVhY2ggcGFyYWx5c2lzIGFuZCBzZXQvY2xlYXIgZmxhZ3NcbiAgLy8gICAtIGlmIHBhcmFseXNpcyBsZWFybmVkIHRoZW4gc2F5IHNvbWV0aGluZyBnZW5lcmljXG4gIC8vIFN0aWxsIG5lZWQgdG8ga2VlcCB0aGUgdHJpZ2dlciBpbiB0aGUgZnJvbnQgaW4gY2FzZSBub1xuICAvLyBhYmR1Y3Rpb24geWV0XG4gIC8vICAgLSBpZiBOT1QgcGFyYWx5c2lzIEFORCBpZiBOT1QgZWxkZXIgbWlzc2luZyBBTkQgaWYga2VsYmVxdWUgZGVhZFxuICAvLyAtLS0+IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBmb3IgdHdvIHdheXMgdG8gZ2V0IChsaWtlIHJlZnJlc2gpP1xuICAvL1xuICAvLyBBbHNvIGFkZCBhIGNoZWNrIHRoYXQgdGhlIHJhYmJpdCB0cmlnZ2VyIGlzIGdvbmUgaWYgcmVzY3VlZCFcblxuXG5cbiAgLy8gUGFyYWx5c2lzIHRyaWdnZXIgKCRiMikgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDI7XG4gIC8vcm9tLnRyaWdnZXIoMHhiMikuZmxhZ3Muc2hpZnQoKTsgLy8gcmVtb3ZlIDAzNyBsZWFybmVkIHBhcmFseXNpc1xuXG4gIC8vIExlYXJuIHJlZnJlc2ggdHJpZ2dlciAoJGI0KSB+IHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuY29uZGl0aW9uc1sxXSA9IH4weDI0MTtcbiAgLy9yb20udHJpZ2dlcigweGI0KS5mbGFncyA9IFtdOyAvLyByZW1vdmUgMDM5IGxlYXJuZWQgcmVmcmVzaFxuXG4gIC8vIFRlbGVwb3J0IGJsb2NrIG9uIG10IHNhYnJlIGlzIGZyb20gc3BlbGwsIG5vdCBzbG90XG4gIHJvbS50cmlnZ2VyKDB4YmEpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDQ7IC8vIH4wM2YgLT4gfjI0NFxuXG4gIC8vIFBvcnRvYSBwYWxhY2UgZ3VhcmQgbW92ZW1lbnQgdHJpZ2dlciAoJGJiKSBzdG9wcyBvbiAwMWIgKG1lc2lhKSBub3QgMDFmIChvcmIpXG4gIHJvbS50cmlnZ2VyKDB4YmIpLmNvbmRpdGlvbnNbMV0gPSB+MHgwMWI7XG5cbiAgLy8gUmVtb3ZlIHJlZHVuZGFudCB0cmlnZ2VyIDhhIChzbG90IDE2KSBpbiB6b21iaWV0b3duICgkNjUpXG4gIC8vICAtLSBub3RlOiBubyBsb25nZXIgbmVjZXNzYXJ5IHNpbmNlIHdlIHJlcHVycG9zZSBpdCBpbnN0ZWFkLlxuICAvLyBjb25zdCB7em9tYmllVG93bn0gPSByb20ubG9jYXRpb25zO1xuICAvLyB6b21iaWVUb3duLnNwYXducyA9IHpvbWJpZVRvd24uc3Bhd25zLmZpbHRlcih4ID0+ICF4LmlzVHJpZ2dlcigpIHx8IHguaWQgIT0gMHg4YSk7XG5cbiAgLy8gUmVwbGFjZSBhbGwgZGlhbG9nIGNvbmRpdGlvbnMgZnJvbSAwMGUgdG8gMjQzXG4gIGZvciAoY29uc3QgbnBjIG9mIHJvbS5ucGNzKSB7XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5hbGxEaWFsb2dzKCkpIHtcbiAgICAgIGlmIChkLmNvbmRpdGlvbiA9PT0gMHgwMGUpIGQuY29uZGl0aW9uID0gMHgyNDM7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IH4weDAwZSkgZC5jb25kaXRpb24gPSB+MHgyNDM7XG4gICAgfVxuICB9XG59XG5cbi8vIEhhcmQgbW9kZSBmbGFnOiBIYyAtIHplcm8gb3V0IHRoZSBzd29yZCdzIGNvbGxpc2lvbiBwbGFuZVxuZnVuY3Rpb24gZGlzYWJsZVN0YWJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbyBvZiBbMHgwOCwgMHgwOSwgMHgyN10pIHtcbiAgICByb20ub2JqZWN0c1tvXS5jb2xsaXNpb25QbGFuZSA9IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gb3Jic09wdGlvbmFsKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgb2JqIG9mIFsweDEwLCAweDE0LCAweDE4LCAweDFkXSkge1xuICAgIC8vIDEuIExvb3NlbiB0ZXJyYWluIHN1c2NlcHRpYmlsaXR5IG9mIGxldmVsIDEgc2hvdHNcbiAgICByb20ub2JqZWN0c1tvYmpdLnRlcnJhaW5TdXNjZXB0aWJpbGl0eSAmPSB+MHgwNDtcbiAgICAvLyAyLiBJbmNyZWFzZSB0aGUgbGV2ZWwgdG8gMlxuICAgIHJvbS5vYmplY3RzW29ial0ubGV2ZWwgPSAyO1xuICB9XG59XG4iXX0=