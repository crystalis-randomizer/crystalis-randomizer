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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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SUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLElBQUks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QUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV6RSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsS0FBYztJQUVsRCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdoRCxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ04sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ1osQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRy9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FB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QUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFB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Q0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUkvQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBV2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3JDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFLbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBRWhELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUd0QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFdkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFVMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFH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QUFLLEtBQUs7Z0JBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDL0MsSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsS0FBSztnQkFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsS0FBSyxDQUFDO1NBQ2xEO0tBQ0Y7QUFDSCxDQUFDO0FBR0QsU0FBUyxZQUFZLENBQUMsR0FBUTtJQUM1QixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUNsQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7S0FDbkM7SUFHRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLEdBQVE7SUFDNUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBRTFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFaEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBlcmZvcm0gaW5pdGlhbCBjbGVhbnVwL3NldHVwIG9mIHRoZSBST00uXG5cbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIExvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuLi9yb20vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7R2xvYmFsRGlhbG9nLCBMb2NhbERpYWxvZ30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHthc3NlcnR9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHByZzogVWludDhBcnJheSk6IHZvaWQge1xuICAvLyBSZW1vdmUgdW51c2VkIGl0ZW0vdHJpZ2dlciBhY3Rpb25zXG4gIHByZ1sweDFlMDZiXSAmPSA3OyAvLyBtZWRpY2FsIGhlcmIgbm9ybWFsIHVzYWdlID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNmZdICY9IDc7IC8vIG1hZ2ljIHJpbmcgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDczXSAmPSA3OyAvLyBmcnVpdCBvZiBsaW1lIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3N10gJj0gNzsgLy8gYW50aWRvdGUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDdiXSAmPSA3OyAvLyBvcGVsIHN0YXR1ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwODRdICY9IDc7IC8vIHdhcnAgYm9vdHMgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDQgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDliXSAmPSA3OyAvLyB3aW5kbWlsbCBrZXkgaXRlbXVzZVsxXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMGI5XSAmPSA3OyAvLyBnbG93aW5nIGxhbXAgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuXG4gIC8vIE5PVEU6IHRoaXMgaXMgZG9uZSB2ZXJ5IGVhcmx5LCBtYWtlIHN1cmUgYW55IHJlZmVyZW5jZXMgdG8gd2FycFxuICAvLyBwb2ludCBmbGFncyBhcmUgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBuZXcgb25lcyFcbiAgYWRkWm9tYmllV2FycChyb20pO1xuXG4gIGFkZE1lemFtZVRyaWdnZXIocm9tKTtcblxuICBub3JtYWxpemVTd29yZHMocm9tLCBmbGFncyk7XG5cbiAgZml4Q29pblNwcml0ZXMocm9tKTtcbiAgZml4TWltaWNzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIHJldmVyc2libGVTd2FuR2F0ZShyb20pO1xuICBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbSk7XG4gIHByZXZlbnROcGNEZXNwYXducyhyb20sIGZsYWdzKTtcbiAgbGVhZkVsZGVySW5TYWJyZUhlYWxzKHJvbSk7XG4gIGlmIChmbGFncy5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpKSByZXF1aXJlSGVhbGVkRG9scGhpbihyb20pO1xuICBpZiAoZmxhZ3Muc2FoYXJhUmFiYml0c1JlcXVpcmVUZWxlcGF0aHkoKSkgcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb20pO1xuXG4gIGFkanVzdEl0ZW1OYW1lcyhyb20sIGZsYWdzKTtcblxuICAvLyBUT0RPIC0gY29uc2lkZXIgbWFraW5nIGEgVHJhbnNmb3JtYXRpb24gaW50ZXJmYWNlLCB3aXRoIG9yZGVyaW5nIGNoZWNrc1xuICBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbSwgZmxhZ3MpOyAvLyBOT1RFOiBwcmUtc2h1ZmZsZVxuICBicm9rYWhhbmFXYW50c01hZG8xKHJvbSk7XG4gIGlmIChmbGFncy50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gIH0gZWxzZSB7XG4gICAgbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbSk7XG4gIH1cblxuICB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbSk7XG5cbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkpIHtcbiAgICBlYXN0Q2F2ZShyb20sIGZsYWdzKTtcbiAgfSBlbHNlIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb20pO1xuICB9XG4gIGV2aWxTcGlyaXRJc2xhbmRSZXF1aXJlc0RvbHBoaW4ocm9tKTtcbiAgY2xvc2VDYXZlRW50cmFuY2VzKHJvbSwgZmxhZ3MpO1xuICBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb20pO1xuICBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tLCBmbGFncyk7XG4gIGlmIChmbGFncy5kaXNhYmxlUmFiYml0U2tpcCgpKSBmaXhSYWJiaXRTa2lwKHJvbSk7XG5cbiAgZml4UmV2ZXJzZVdhbGxzKHJvbSk7XG4gIGlmIChmbGFncy5jaGFyZ2VTaG90c09ubHkoKSkgZGlzYWJsZVN0YWJzKHJvbSk7XG4gIGlmIChmbGFncy5vcmJzT3B0aW9uYWwoKSkgb3Jic09wdGlvbmFsKHJvbSk7XG59XG5cbi8vIEFkZHMgYSB0cmlnZ2VyIGFjdGlvbiB0byBtZXphbWUuICBVc2UgODcgbGVmdG92ZXIgZnJvbSByZXNjdWluZyB6ZWJ1LlxuZnVuY3Rpb24gYWRkTWV6YW1lVHJpZ2dlcihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB0cmlnZ2VyID0gcm9tLm5leHRGcmVlVHJpZ2dlcigpO1xuICB0cmlnZ2VyLnVzZWQgPSB0cnVlO1xuICB0cmlnZ2VyLmNvbmRpdGlvbnMgPSBbfjB4MmYwXTtcbiAgdHJpZ2dlci5tZXNzYWdlID0gTWVzc2FnZUlkLm9mKHthY3Rpb246IDR9KTtcbiAgdHJpZ2dlci5mbGFncyA9IFsweDJmMF07XG4gIGNvbnN0IG1lemFtZSA9IHJvbS5sb2NhdGlvbnMuTWV6YW1lU2hyaW5lO1xuICBtZXphbWUuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3RpbGU6IDB4ODgsIHR5cGU6IDIsIGlkOiB0cmlnZ2VyLmlkfSkpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTd29yZHMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIC8vIHdpbmQgMSA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2luZCAyID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gNlxuICAvLyB3aW5kIDMgPT4gMi0zIGhpdHMgOE1QICAgICAgICA9PiA4XG5cbiAgLy8gZmlyZSAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyBmaXJlIDIgPT4gMyBoaXRzICAgICAgICAgICAgICA9PiA1XG4gIC8vIGZpcmUgMyA9PiA0LTYgaGl0cyAxNk1QICAgICAgID0+IDdcblxuICAvLyB3YXRlciAxID0+IDEgaGl0ICAgICAgICAgICAgICA9PiAzXG4gIC8vIHdhdGVyIDIgPT4gMS0yIGhpdHMgICAgICAgICAgID0+IDZcbiAgLy8gd2F0ZXIgMyA9PiAzLTYgaGl0cyAxNk1QICAgICAgPT4gOFxuXG4gIC8vIHRodW5kZXIgMSA9PiAxLTIgaGl0cyBzcHJlYWQgID0+IDNcbiAgLy8gdGh1bmRlciAyID0+IDEtMyBoaXRzIHNwcmVhZCAgPT4gNVxuICAvLyB0aHVuZGVyIDMgPT4gNy0xMCBoaXRzIDQwTVAgICA9PiA3XG5cbiAgcm9tLm9iamVjdHNbMHgxMF0uYXRrID0gMzsgLy8gd2luZCAxXG4gIHJvbS5vYmplY3RzWzB4MTFdLmF0ayA9IDY7IC8vIHdpbmQgMlxuICByb20ub2JqZWN0c1sweDEyXS5hdGsgPSA4OyAvLyB3aW5kIDNcblxuICByb20ub2JqZWN0c1sweDE4XS5hdGsgPSAzOyAvLyBmaXJlIDFcbiAgcm9tLm9iamVjdHNbMHgxM10uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTldLmF0ayA9IDU7IC8vIGZpcmUgMlxuICByb20ub2JqZWN0c1sweDE3XS5hdGsgPSA3OyAvLyBmaXJlIDNcbiAgcm9tLm9iamVjdHNbMHgxYV0uYXRrID0gNzsgLy8gZmlyZSAzXG5cbiAgcm9tLm9iamVjdHNbMHgxNF0uYXRrID0gMzsgLy8gd2F0ZXIgMVxuICByb20ub2JqZWN0c1sweDE1XS5hdGsgPSA2OyAvLyB3YXRlciAyXG4gIHJvbS5vYmplY3RzWzB4MTZdLmF0ayA9IDg7IC8vIHdhdGVyIDNcblxuICByb20ub2JqZWN0c1sweDFjXS5hdGsgPSAzOyAvLyB0aHVuZGVyIDFcbiAgcm9tLm9iamVjdHNbMHgxZV0uYXRrID0gNTsgLy8gdGh1bmRlciAyXG4gIHJvbS5vYmplY3RzWzB4MWJdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuICByb20ub2JqZWN0c1sweDFmXS5hdGsgPSA3OyAvLyB0aHVuZGVyIDNcblxuICBpZiAoZmxhZ3Muc2xvd0Rvd25Ub3JuYWRvKCkpIHtcbiAgICAvLyBUT0RPIC0gdG9ybmFkbyAob2JqIDEyKSA9PiBzcGVlZCAwNyBpbnN0ZWFkIG9mIDA4XG4gICAgLy8gICAgICAtIGxpZmV0aW1lIGlzIDQ4MCA9PiA3MCBtYXliZSB0b28gbG9uZywgNjAgc3dlZXQgc3BvdD9cbiAgICBjb25zdCB0b3JuYWRvID0gcm9tLm9iamVjdHNbMHgxMl07XG4gICAgdG9ybmFkby5zcGVlZCA9IDB4MDc7XG4gICAgdG9ybmFkby5kYXRhWzB4MGNdID0gMHg2MDsgLy8gaW5jcmVhc2UgbGlmZXRpbWUgKDQ4MCkgYnkgMjAlXG4gIH1cbn1cblxuZnVuY3Rpb24gZml4Q29pblNwcml0ZXMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBwYWdlIG9mIFsweDYwLCAweDY0LCAweDY1LCAweDY2LCAweDY3LCAweDY4LFxuICAgICAgICAgICAgICAgICAgICAgIDB4NjksIDB4NmEsIDB4NmIsIDB4NmMsIDB4NmQsIDB4NmZdKSB7XG4gICAgZm9yIChjb25zdCBwYXQgb2YgWzAsIDEsIDJdKSB7XG4gICAgICByb20ucGF0dGVybnNbcGFnZSA8PCA2IHwgcGF0XS5waXhlbHMgPSByb20ucGF0dGVybnNbMHg1ZSA8PCA2IHwgcGF0XS5waXhlbHM7XG4gICAgfVxuICB9XG4gIHJvbS5vYmplY3RzWzB4MGNdLm1ldGFzcHJpdGUgPSAweGE5O1xufVxuXG4vKipcbiAqIEZpeCB0aGUgc29mdGxvY2sgdGhhdCBoYXBwZW5zIHdoZW4geW91IGdvIHRocm91Z2hcbiAqIGEgd2FsbCBiYWNrd2FyZHMgYnkgbW92aW5nIHRoZSBleGl0L2VudHJhbmNlIHRpbGVzXG4gKiB1cCBhIGJpdCBhbmQgYWRqdXN0aW5nIHNvbWUgdGlsZUVmZmVjdHMgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBmaXhSZXZlcnNlV2FsbHMocm9tOiBSb20pIHtcbiAgLy8gYWRqdXN0IHRpbGUgZWZmZWN0IGZvciBiYWNrIHRpbGVzIG9mIGlyb24gd2FsbFxuICBmb3IgKGNvbnN0IHQgaW4gWzB4MDQsIDB4MDUsIDB4MDgsIDB4MDldKSB7XG4gICAgcm9tLnRpbGVFZmZlY3RzWzB4YmMgLSAweGIzXS5lZmZlY3RzW3RdID0gMHgxODtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiNSAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICB9XG4gIC8vIFRPRE8gLSBtb3ZlIGFsbCB0aGUgZW50cmFuY2VzIHRvIHk9MjAgYW5kIGV4aXRzIHRvIHl0PTAxXG59XG5cbi8qKiBNYWtlIGEgbGFuZCBicmlkZ2UgaW4gdW5kZXJncm91bmQgY2hhbm5lbCAqL1xuZnVuY3Rpb24gdW5kZXJncm91bmRDaGFubmVsTGFuZEJyaWRnZShyb206IFJvbSkge1xuICBjb25zdCB7dGlsZXN9ID0gcm9tLnNjcmVlbnNbMHhhMV07XG4gIHRpbGVzWzB4MjhdID0gMHg5ZjtcbiAgdGlsZXNbMHgzN10gPSAweDIzO1xuICB0aWxlc1sweDM4XSA9IDB4MjM7IC8vIDB4OGU7XG4gIHRpbGVzWzB4MzldID0gMHgyMTtcbiAgdGlsZXNbMHg0N10gPSAweDhkO1xuICB0aWxlc1sweDQ4XSA9IDB4OGY7XG4gIHRpbGVzWzB4NTZdID0gMHg5OTtcbiAgdGlsZXNbMHg1N10gPSAweDlhO1xuICB0aWxlc1sweDU4XSA9IDB4OGM7XG59XG5cbi8qKlxuICogUmVtb3ZlIHRpbWVyIHNwYXducywgcmVudW1iZXJzIG1pbWljIHNwYXducyBzbyB0aGF0IHRoZXkncmUgdW5pcXVlLlxuICogUnVucyBiZWZvcmUgc2h1ZmZsZSBiZWNhdXNlIHdlIG5lZWQgdG8gaWRlbnRpZnkgdGhlIHNsb3QuICBSZXF1aXJlc1xuICogYW4gYXNzZW1ibHkgY2hhbmdlICgkM2QzZmQgaW4gcHJlc2h1ZmZsZS5zKVxuICovXG5mdW5jdGlvbiBmaXhNaW1pY3Mocm9tOiBSb20pOiB2b2lkIHtcbiAgbGV0IG1pbWljID0gMHg3MDtcbiAgZm9yIChjb25zdCBsb2Mgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGZvciAoY29uc3QgcyBvZiBsb2Muc3Bhd25zKSB7XG4gICAgICBpZiAoIXMuaXNDaGVzdCgpKSBjb250aW51ZTtcbiAgICAgIHMudGltZWQgPSBmYWxzZTtcbiAgICAgIGlmIChzLmlkID49IDB4NzApIHMuaWQgPSBtaW1pYysrO1xuICAgIH1cbiAgfVxuICAvLyBUT0RPIC0gZmluZCBhIGJldHRlciB3YXkgdG8gYnVuZGxlIGFzbSBjaGFuZ2VzP1xuICAvLyByb20uYXNzZW1ibGUoKVxuICAvLyAgICAgLiQoJ2FkYyAkMTAnKVxuICAvLyAgICAgLmJlcSgnbGFiZWwnKVxuICAvLyAgICAgLmxzaCgpXG4gIC8vICAgICAubHNoKGAke2FkZHJ9LHhgKVxuICAvLyAgICAgLmxhYmVsKCdsYWJlbCcpO1xuICAvLyByb20ucGF0Y2goKVxuICAvLyAgICAgLm9yZygweDNkM2ZkKVxuICAvLyAgICAgLmJ5dGUoMHhiMCk7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgbCA9IHJvbS5sb2NhdGlvbnM7XG4gIC8vIE1vdmUgS2VsYmVzcXVlIDIgb25lIGZ1bGwgdGlsZSBsZWZ0LlxuICBsLkdvYUZvcnRyZXNzX0tlbGJlc3F1ZS5zcGF3bnNbMF0ueCAtPSAxNjtcbiAgLy8gUmVtb3ZlIHNhZ2Ugc2NyZWVuIGxvY2tzIChleGNlcHQgS2Vuc3UpLlxuICBsLkdvYUZvcnRyZXNzX1plYnUuc3Bhd25zLnNwbGljZSgxLCAxKTsgLy8gemVidSBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfVG9ybmVsLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIHRvcm5lbCBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfQXNpbmEuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gYXNpbmEgc2NyZWVuIGxvY2sgdHJpZ2dlclxufVxuXG5mdW5jdGlvbiBhbGFybUZsdXRlSXNLZXlJdGVtKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBjb25zdCB7V2F0ZXJmYWxsQ2F2ZTR9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBNb3ZlIGFsYXJtIGZsdXRlIHRvIHRoaXJkIHJvd1xuICByb20uaXRlbUdldHNbMHgzMV0uaW52ZW50b3J5Um93U3RhcnQgPSAweDIwO1xuICAvLyBFbnN1cmUgYWxhcm0gZmx1dGUgY2Fubm90IGJlIGRyb3BwZWRcbiAgLy8gcm9tLnByZ1sweDIxMDIxXSA9IDB4NDM7IC8vIFRPRE8gLSByb20uaXRlbXNbMHgzMV0uPz8/XG4gIHJvbS5pdGVtc1sweDMxXS51bmlxdWUgPSB0cnVlO1xuICAvLyBFbnN1cmUgYWxhcm0gZmx1dGUgY2Fubm90IGJlIHNvbGRcbiAgcm9tLml0ZW1zWzB4MzFdLmJhc2VQcmljZSA9IDA7XG5cbiAgaWYgKGZsYWdzLnplYnVTdHVkZW50R2l2ZXNJdGVtKCkpIHtcbiAgICAvLyBQZXJzb24gMTQgKFplYnUncyBzdHVkZW50KTogc2Vjb25kYXJ5IGl0ZW0gLT4gYWxhcm0gZmx1dGVcbiAgICByb20ubnBjc1sweDE0XS5kYXRhWzFdID0gMHgzMTsgLy8gTk9URTogQ2xvYmJlcnMgc2h1ZmZsZWQgaXRlbSEhIVxuICB9XG5cbiAgLy8gUmVtb3ZlIGFsYXJtIGZsdXRlIGZyb20gc2hvcHMgKHJlcGxhY2Ugd2l0aCBvdGhlciBpdGVtcylcbiAgLy8gTk9URSAtIHdlIGNvdWxkIHNpbXBsaWZ5IHRoaXMgd2hvbGUgdGhpbmcgYnkganVzdCBoYXJkY29kaW5nIGluZGljZXMuXG4gIC8vICAgICAgLSBpZiB0aGlzIGlzIGd1YXJhbnRlZWQgdG8gaGFwcGVuIGVhcmx5LCBpdCdzIGFsbCB0aGUgc2FtZS5cbiAgY29uc3QgcmVwbGFjZW1lbnRzID0gW1xuICAgIFsweDIxLCAwLjcyXSwgLy8gZnJ1aXQgb2YgcG93ZXIsIDcyJSBvZiBjb3N0XG4gICAgWzB4MWYsIDAuOV0sIC8vIGx5c2lzIHBsYW50LCA5MCUgb2YgY29zdFxuICBdO1xuICBsZXQgaiA9IDA7XG4gIGZvciAoY29uc3Qgc2hvcCBvZiByb20uc2hvcHMpIHtcbiAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gc2hvcC5jb250ZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKHNob3AuY29udGVudHNbaV0gIT09IDB4MzEpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgW2l0ZW0sIHByaWNlUmF0aW9dID0gcmVwbGFjZW1lbnRzWyhqKyspICUgcmVwbGFjZW1lbnRzLmxlbmd0aF07XG4gICAgICBzaG9wLmNvbnRlbnRzW2ldID0gaXRlbTtcbiAgICAgIGlmIChyb20uc2hvcERhdGFUYWJsZXNBZGRyZXNzKSB7XG4gICAgICAgIC8vIE5PVEU6IHRoaXMgaXMgYnJva2VuIC0gbmVlZCBhIGNvbnRyb2xsZWQgd2F5IHRvIGNvbnZlcnQgcHJpY2UgZm9ybWF0c1xuICAgICAgICBzaG9wLnByaWNlc1tpXSA9IE1hdGgucm91bmQoc2hvcC5wcmljZXNbaV0gKiBwcmljZVJhdGlvKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDaGFuZ2UgZmx1dGUgb2YgbGltZSBjaGVzdCdzIChub3ctdW51c2VkKSBpdGVtZ2V0IHRvIGhhdmUgbWVkaWNhbCBoZXJiXG4gIHJvbS5pdGVtR2V0c1sweDViXS5pdGVtSWQgPSAweDFkO1xuICAvLyBDaGFuZ2UgdGhlIGFjdHVhbCBzcGF3biBmb3IgdGhhdCBjaGVzdCB0byBiZSB0aGUgbWlycm9yZWQgc2hpZWxkIGNoZXN0XG4gIFdhdGVyZmFsbENhdmU0LnNwYXduKDB4MTkpLmlkID0gMHgxMDtcblxuICAvLyBUT0RPIC0gcmVxdWlyZSBuZXcgY29kZSBmb3IgdHdvIHVzZXNcbn1cblxuZnVuY3Rpb24gYnJva2FoYW5hV2FudHNNYWRvMShyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBicm9rYWhhbmEgPSByb20ubnBjc1sweDU0XTtcbiAgY29uc3QgZGlhbG9nID0gYXNzZXJ0KGJyb2thaGFuYS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSlbMF07XG4gIGlmIChkaWFsb2cuY29uZGl0aW9uICE9PSB+MHgwMjQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBicm9rYWhhbmEgY29uZGl0aW9uOiAke2RpYWxvZy5jb25kaXRpb259YCk7XG4gIH1cbiAgZGlhbG9nLmNvbmRpdGlvbiA9IH4weDA2NzsgLy8gdmFuaWxsYSBiYWxsIG9mIHRodW5kZXIgLyBkZWZlYXRlZCBtYWRvIDFcbn1cblxuZnVuY3Rpb24gcmVxdWlyZUhlYWxlZERvbHBoaW4ocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gTm9ybWFsbHkgdGhlIGZpc2hlcm1hbiAoJDY0KSBzcGF3bnMgaW4gaGlzIGhvdXNlICgkZDYpIGlmIHlvdSBoYXZlXG4gIC8vIHRoZSBzaGVsbCBmbHV0ZSAoMjM2KS4gIEhlcmUgd2UgYWxzbyBhZGQgYSByZXF1aXJlbWVudCBvbiB0aGUgaGVhbGVkXG4gIC8vIGRvbHBoaW4gc2xvdCAoMDI1KSwgd2hpY2ggd2Uga2VlcCBhcm91bmQgc2luY2UgaXQncyBhY3R1YWxseSB1c2VmdWwuXG4gIHJvbS5ucGNzWzB4NjRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkNiwgWzB4MjM2LCAweDAyNV0pO1xuICAvLyBBbHNvIGZpeCBkYXVnaHRlcidzIGRpYWxvZyAoJDdiKS5cbiAgY29uc3QgZGF1Z2h0ZXJEaWFsb2cgPSByb20ubnBjc1sweDdiXS5sb2NhbERpYWxvZ3MuZ2V0KC0xKSE7XG4gIGRhdWdodGVyRGlhbG9nLnVuc2hpZnQoZGF1Z2h0ZXJEaWFsb2dbMF0uY2xvbmUoKSk7XG4gIGRhdWdodGVyRGlhbG9nWzBdLmNvbmRpdGlvbiA9IH4weDAyNTtcbiAgZGF1Z2h0ZXJEaWFsb2dbMV0uY29uZGl0aW9uID0gfjB4MjM2O1xufVxuXG5mdW5jdGlvbiByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vdCBoYXZpbmcgdGVsZXBhdGh5ICgyNDMpIHdpbGwgdHJpZ2dlciBhIFwia3l1IGt5dVwiICgxYToxMiwgMWE6MTMpIGZvclxuICAvLyBib3RoIGdlbmVyaWMgYnVubmllcyAoNTkpIGFuZCBkZW8gKDVhKS5cbiAgcm9tLm5wY3NbMHg1OV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEyXSkpO1xuICByb20ubnBjc1sweDVhXS5nbG9iYWxEaWFsb2dzLnB1c2goR2xvYmFsRGlhbG9nLm9mKH4weDI0MywgWzB4MWEsIDB4MTNdKSk7XG59XG5cbmZ1bmN0aW9uIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tOiBSb20pOiB2b2lkIHtcbiAgLy8gaXRlbWdldCAwMyBzd29yZCBvZiB0aHVuZGVyID0+IHNldCAyZmQgc2h5cm9uIHdhcnAgcG9pbnRcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmZsYWdzLnB1c2goMHgyZmQpO1xuICAvLyBkaWFsb2cgNjIgYXNpbmEgaW4gZjIvZjQgc2h5cm9uIC0+IGFjdGlvbiAxZiAodGVsZXBvcnQgdG8gc3RhcnQpXG4gIC8vICAgLSBub3RlOiBmMiBhbmQgZjQgZGlhbG9ncyBhcmUgbGlua2VkLlxuICBmb3IgKGNvbnN0IGkgb2YgWzAsIDEsIDNdKSB7XG4gICAgZm9yIChjb25zdCBsb2Mgb2YgWzB4ZjIsIDB4ZjRdKSB7XG4gICAgICByb20ubnBjc1sweDYyXS5sb2NhbERpYWxvZ3MuZ2V0KGxvYykhW2ldLm1lc3NhZ2UuYWN0aW9uID0gMHgxZjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9UZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIENoYW5nZSBzd29yZCBvZiB0aHVuZGVyJ3MgYWN0aW9uIHRvIGJiZSB0aGUgc2FtZSBhcyBvdGhlciBzd29yZHMgKDE2KVxuICByb20uaXRlbUdldHNbMHgwM10uYWNxdWlzaXRpb25BY3Rpb24uYWN0aW9uID0gMHgxNjtcbn1cblxuZnVuY3Rpb24gYWRqdXN0SXRlbU5hbWVzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICBpZiAoZmxhZ3MubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAvLyByZW5hbWUgbGVhdGhlciBib290cyB0byBzcGVlZCBib290c1xuICAgIGNvbnN0IGxlYXRoZXJCb290cyA9IHJvbS5pdGVtc1sweDJmXSE7XG4gICAgbGVhdGhlckJvb3RzLm1lbnVOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBsZWF0aGVyQm9vdHMubWVzc2FnZU5hbWUgPSAnU3BlZWQgQm9vdHMnO1xuICAgIGlmIChmbGFncy5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCkpIHtcbiAgICAgIGNvbnN0IGdhc01hc2sgPSByb20uaXRlbXNbMHgyOV07XG4gICAgICBnYXNNYXNrLm1lbnVOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICAgIGdhc01hc2subWVzc2FnZU5hbWUgPSAnSGF6bWF0IFN1aXQnO1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlbmFtZSBiYWxscyB0byBvcmJzXG4gIGZvciAobGV0IGkgPSAweDA1OyBpIDwgMHgwYzsgaSArPSAyKSB7XG4gICAgcm9tLml0ZW1zW2ldLm1lbnVOYW1lID0gcm9tLml0ZW1zW2ldLm1lbnVOYW1lLnJlcGxhY2UoJ0JhbGwnLCAnT3JiJyk7XG4gICAgcm9tLml0ZW1zW2ldLm1lc3NhZ2VOYW1lID0gcm9tLml0ZW1zW2ldLm1lc3NhZ2VOYW1lLnJlcGxhY2UoJ0JhbGwnLCAnT3JiJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIHRvcm5lbCdzIHRyaWdnZXIgbmVlZHMgYm90aCBpdGVtc1xuICBjb25zdCB0b3JuZWwgPSByb20ubnBjc1sweDVmXTtcbiAgY29uc3QgdmFuaWxsYSA9IHRvcm5lbC5sb2NhbERpYWxvZ3MuZ2V0KDB4MjEpITtcbiAgY29uc3QgcGF0Y2hlZCA9IFtcbiAgICB2YW5pbGxhWzBdLCAvLyBhbHJlYWR5IGxlYXJuZWQgdGVsZXBvcnRcbiAgICB2YW5pbGxhWzJdLCAvLyBkb24ndCBoYXZlIHRvcm5hZG8gYnJhY2VsZXRcbiAgICB2YW5pbGxhWzJdLmNsb25lKCksIC8vIHdpbGwgY2hhbmdlIHRvIGRvbid0IGhhdmUgb3JiXG4gICAgdmFuaWxsYVsxXSwgLy8gaGF2ZSBicmFjZWxldCwgbGVhcm4gdGVsZXBvcnRcbiAgXTtcbiAgcGF0Y2hlZFsxXS5jb25kaXRpb24gPSB+MHgyMDY7IC8vIGRvbid0IGhhdmUgYnJhY2VsZXRcbiAgcGF0Y2hlZFsyXS5jb25kaXRpb24gPSB+MHgyMDU7IC8vIGRvbid0IGhhdmUgb3JiXG4gIHBhdGNoZWRbM10uY29uZGl0aW9uID0gfjA7ICAgICAvLyBkZWZhdWx0XG4gIHRvcm5lbC5sb2NhbERpYWxvZ3Muc2V0KDB4MjEsIHBhdGNoZWQpO1xufVxuXG5mdW5jdGlvbiBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIFtyb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuS2lyaXNhTWVhZG93XSkge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBzZXQgdGhlIG5ldyBcImludmlzaWJsZVwiIGZsYWcgb24gdGhlIGNoZXN0LlxuICAgICAgaWYgKHNwYXduLmlzQ2hlc3QoKSkgc3Bhd24uZGF0YVsyXSB8PSAweDIwO1xuICAgIH1cbiAgfVxufVxuXG4vLyBBZGQgdGhlIHN0YXR1ZSBvZiBvbnl4IGFuZCBwb3NzaWJseSB0aGUgdGVsZXBvcnQgYmxvY2sgdHJpZ2dlciB0byBDb3JkZWwgV2VzdFxuZnVuY3Rpb24gYWRkQ29yZGVsV2VzdFRyaWdnZXJzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCkge1xuICBjb25zdCB7Q29yZGVsUGxhaW5FYXN0LCBDb3JkZWxQbGFpbldlc3R9ID0gcm9tLmxvY2F0aW9ucztcbiAgZm9yIChjb25zdCBzcGF3biBvZiBDb3JkZWxQbGFpbkVhc3Quc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzQ2hlc3QoKSB8fCAoZmxhZ3MuZGlzYWJsZVRlbGVwb3J0U2tpcCgpICYmIHNwYXduLmlzVHJpZ2dlcigpKSkge1xuICAgICAgLy8gQ29weSBpZiAoMSkgaXQncyB0aGUgY2hlc3QsIG9yICgyKSB3ZSdyZSBkaXNhYmxpbmcgdGVsZXBvcnQgc2tpcFxuICAgICAgQ29yZGVsUGxhaW5XZXN0LnNwYXducy5wdXNoKHNwYXduLmNsb25lKCkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhSYWJiaXRTa2lwKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5NdFNhYnJlTm9ydGhfTWFpbi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4ODYpIHtcbiAgICAgIGlmIChzcGF3bi54ID09PSAweDc0MCkge1xuICAgICAgICBzcGF3bi54ICs9IDE2O1xuICAgICAgICBzcGF3bi55ICs9IDE2O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRUb3dlckV4aXQocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1Rvd2VyRW50cmFuY2UsIENyeXB0X1RlbGVwb3J0ZXJ9ID0gcm9tLmxvY2F0aW9ucztcbiAgY29uc3QgZW50cmFuY2UgPSBDcnlwdF9UZWxlcG9ydGVyLmVudHJhbmNlcy5sZW5ndGg7XG4gIGNvbnN0IGRlc3QgPSBDcnlwdF9UZWxlcG9ydGVyLmlkO1xuICBDcnlwdF9UZWxlcG9ydGVyLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt0aWxlOiAweDY4fSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1NywgZGVzdCwgZW50cmFuY2V9KSk7XG4gIFRvd2VyRW50cmFuY2UuZXhpdHMucHVzaChFeGl0Lm9mKHt0aWxlOiAweDU4LCBkZXN0LCBlbnRyYW5jZX0pKTtcbn1cblxuLy8gUHJvZ3JhbW1hdGljYWxseSBhZGQgYSBob2xlIGJldHdlZW4gdmFsbGV5IG9mIHdpbmQgYW5kIGxpbWUgdHJlZSB2YWxsZXlcbmZ1bmN0aW9uIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7VmFsbGV5T2ZXaW5kLCBMaW1lVHJlZVZhbGxleX0gPSByb20ubG9jYXRpb25zO1xuXG4gIFZhbGxleU9mV2luZC5zY3JlZW5zWzVdWzRdID0gMHgxMDsgLy8gbmV3IGV4aXRcbiAgTGltZVRyZWVWYWxsZXkuc2NyZWVuc1sxXVswXSA9IDB4MWE7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMl1bMF0gPSAweDBjOyAvLyBuaWNlciBtb3VudGFpbnNcblxuICBjb25zdCB3aW5kRW50cmFuY2UgPVxuICAgICAgVmFsbGV5T2ZXaW5kLmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDRlZiwgeTogMHg1Nzh9KSkgLSAxO1xuICBjb25zdCBsaW1lRW50cmFuY2UgPVxuICAgICAgTGltZVRyZWVWYWxsZXkuZW50cmFuY2VzLnB1c2goRW50cmFuY2Uub2Yoe3g6IDB4MDEwLCB5OiAweDFjMH0pKSAtIDE7XG5cbiAgVmFsbGV5T2ZXaW5kLmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NjAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4NGYwLCB5OiAweDU3MCwgZGVzdDogMHg0MiwgZW50cmFuY2U6IGxpbWVFbnRyYW5jZX0pKTtcbiAgTGltZVRyZWVWYWxsZXkuZXhpdHMucHVzaChcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFiMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pLFxuICAgICAgRXhpdC5vZih7eDogMHgwMDAsIHk6IDB4MWMwLCBkZXN0OiAweDAzLCBlbnRyYW5jZTogd2luZEVudHJhbmNlfSkpO1xufVxuXG5mdW5jdGlvbiBjbG9zZUNhdmVFbnRyYW5jZXMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIC8vIFByZXZlbnQgc29mdGxvY2sgZnJvbSBleGl0aW5nIHNlYWxlZCBjYXZlIGJlZm9yZSB3aW5kbWlsbCBzdGFydGVkXG4gIHJvbS5sb2NhdGlvbnMuVmFsbGV5T2ZXaW5kLmVudHJhbmNlc1sxXS55ICs9IDE2O1xuXG4gIC8vIENsZWFyIHRpbGVzIDEsMiwzLDQgZm9yIGJsb2NrYWJsZSBjYXZlcyBpbiB0aWxlc2V0cyA5MCwgOTQsIGFuZCA5Y1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5MF0sXG4gICAgICAgICAgICAgICAgICAgIFsweDA3LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MGUsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDIxLCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG4gIHJvbS5zd2FwTWV0YXRpbGVzKFsweDk0LCAweDljXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4NjgsIFsweDAxLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4MywgWzB4MDIsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDg4LCBbMHgwMywgMHgwYV0sIH4weGQ3XSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODksIFsweDA0LCAweDBhXSwgfjB4ZDddKTtcblxuICAvLyBOb3cgcmVwbGFjZSB0aGUgdGlsZXMgd2l0aCB0aGUgYmxvY2thYmxlIG9uZXNcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDM5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDhdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHg0OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4NzldID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg3YV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDg5XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4OGFdID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ4XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NDldID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OF0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDU5XSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1Nl0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDU3XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjZdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg2N10gPSAweDA0O1xuXG4gIC8vIERlc3RydWN0dXJlIG91dCBhIGZldyBsb2NhdGlvbnMgYnkgbmFtZVxuICBjb25zdCB7XG4gICAgVmFsbGV5T2ZXaW5kLFxuICAgIENvcmRlbFBsYWluV2VzdCxcbiAgICBDb3JkZWxQbGFpbkVhc3QsXG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsXG4gICAgV2F0ZXJmYWxsVmFsbGV5U291dGgsXG4gICAgS2lyaXNhTWVhZG93LFxuICAgIFNhaGFyYU91dHNpZGVDYXZlLFxuICAgIERlc2VydDIsXG4gIH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE5PVEU6IGZsYWcgMmYwIGlzIEFMV0FZUyBzZXQgLSB1c2UgaXQgYXMgYSBiYXNlbGluZS5cbiAgY29uc3QgZmxhZ3NUb0NsZWFyOiBbTG9jYXRpb24sIG51bWJlcl1bXSA9IFtcbiAgICBbVmFsbGV5T2ZXaW5kLCAweDMwXSwgLy8gdmFsbGV5IG9mIHdpbmQsIHplYnUncyBjYXZlXG4gICAgW0NvcmRlbFBsYWluV2VzdCwgMHgzMF0sIC8vIGNvcmRlbCB3ZXN0LCB2YW1waXJlIGNhdmVcbiAgICBbQ29yZGVsUGxhaW5FYXN0LCAweDMwXSwgLy8gY29yZGVsIGVhc3QsIHZhbXBpcmUgY2F2ZVxuICAgIFtXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgcHJpc29uIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MTRdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIGZvZyBsYW1wXG4gICAgW1dhdGVyZmFsbFZhbGxleVNvdXRoLCAweDc0XSwgLy8gd2F0ZXJmYWxsIHNvdXRoLCBraXJpc2FcbiAgICBbS2lyaXNhTWVhZG93LCAweDEwXSwgLy8ga2lyaXNhIG1lYWRvd1xuICAgIFtTYWhhcmFPdXRzaWRlQ2F2ZSwgMHgwMF0sIC8vIGNhdmUgdG8gZGVzZXJ0XG4gICAgW0Rlc2VydDIsIDB4NDFdLFxuICBdO1xuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSAmJiBmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIGZsYWdzVG9DbGVhci5wdXNoKFtyb20ubG9jYXRpb25zLkxpbWVUcmVlVmFsbGV5LCAweDEwXSk7XG4gIH1cbiAgZm9yIChjb25zdCBbbG9jLCB5eF0gb2YgZmxhZ3NUb0NsZWFyKSB7XG4gICAgbG9jLmZsYWdzLnB1c2goRmxhZy5vZih7eXgsIGZsYWc6IDB4MmYwfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVwbGFjZUZsYWcobG9jOiBMb2NhdGlvbiwgeXg6IG51bWJlciwgZmxhZzogbnVtYmVyKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBmIG9mIGxvYy5mbGFncykge1xuICAgICAgaWYgKGYueXggPT09IHl4KSB7XG4gICAgICAgIGYuZmxhZyA9IGZsYWc7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBmbGFnIHRvIHJlcGxhY2UgYXQgJHtsb2N9OiR7eXh9YCk7XG4gIH07XG5cbiAgaWYgKGZsYWdzLnBhcmFseXNpc1JlcXVpcmVzUHJpc29uS2V5KCkpIHsgLy8gY2xvc2Ugb2ZmIHJldmVyc2UgZW50cmFuY2VzXG4gICAgLy8gTk9URTogd2UgY291bGQgYWxzbyBjbG9zZSBpdCBvZmYgdW50aWwgYm9zcyBraWxsZWQuLi4/XG4gICAgLy8gIC0gY29uc3QgdmFtcGlyZUZsYWcgPSB+cm9tLm5wY1NwYXduc1sweGMwXS5jb25kaXRpb25zWzB4MGFdWzBdO1xuICAgIC8vICAtPiBrZWxiZXNxdWUgZm9yIHRoZSBvdGhlciBvbmUuXG4gICAgY29uc3Qgd2luZG1pbGxGbGFnID0gMHgyZWU7XG4gICAgcmVwbGFjZUZsYWcoQ29yZGVsUGxhaW5XZXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluRWFzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcblxuICAgIHJlcGxhY2VGbGFnKFdhdGVyZmFsbFZhbGxleU5vcnRoLCAweDAwLCAweDJkOCk7IC8vIGtleSB0byBwcmlzb24gZmxhZ1xuICAgIGNvbnN0IGV4cGxvc2lvbiA9IFNwYXduLm9mKHt5OiAweDA2MCwgeDogMHgwNjAsIHR5cGU6IDQsIGlkOiAweDJjfSk7XG4gICAgY29uc3Qga2V5VHJpZ2dlciA9IFNwYXduLm9mKHt5OiAweDA3MCwgeDogMHgwNzAsIHR5cGU6IDIsIGlkOiAweGFkfSk7XG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLnNwbGljZSgxLCAwLCBleHBsb3Npb24pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5wdXNoKGtleVRyaWdnZXIpO1xuICB9XG5cbiAgLy8gcm9tLmxvY2F0aW9uc1sweDE0XS50aWxlRWZmZWN0cyA9IDB4YjM7XG5cbiAgLy8gZDcgZm9yIDM/XG5cbiAgLy8gVE9ETyAtIHRoaXMgZW5kZWQgdXAgd2l0aCBtZXNzYWdlIDAwOjAzIGFuZCBhbiBhY3Rpb24gdGhhdCBnYXZlIGJvdyBvZiBtb29uIVxuXG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5tZXNzYWdlLnBhcnQgPSAweDFiO1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5pbmRleCA9IDB4MDg7XG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5mbGFncy5wdXNoKDB4MmY2LCAweDJmNywgMHgyZjgpO1xufVxuXG4vLyBAdHMtaWdub3JlOiBub3QgeWV0IHVzZWRcbmZ1bmN0aW9uIGVhc3RDYXZlKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBUT0RPIGZpbGwgdXAgZ3JhcGhpY3MsIGV0YyAtLT4gJDFhLCAkMWIsICQwNSAvICQ4OCwgJGI1IC8gJDE0LCAkMDJcbiAgLy8gVGhpbmsgYW9idXQgZXhpdHMgYW5kIGVudHJhbmNlcy4uLj9cblxuICBjb25zdCB7VmFsbGV5T2ZXaW5kLCBMaW1lVHJlZVZhbGxleSwgU2VhbGVkQ2F2ZTF9ID0gcm9tLmxvY2F0aW9ucztcblxuICBjb25zdCBsb2MxID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMSk7XG4gIGNvbnN0IGxvYzIgPSByb20ubG9jYXRpb25zLmFsbG9jYXRlKHJvbS5sb2NhdGlvbnMuRWFzdENhdmUyKTtcblxuICAvLyBOT1RFOiAweDljIGNhbiBiZWNvbWUgMHg5OSBpbiB0b3AgbGVmdCBvciAweDk3IGluIHRvcCByaWdodCBvciBib3R0b20gbWlkZGxlIGZvciBhIGNhdmUgZXhpdFxuICBsb2MxLnNjcmVlbnMgPSBbWzB4OWMsIDB4ODQsIDB4ODAsIDB4ODMsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODEsIDB4ODMsIDB4ODYsIDB4ODBdLFxuICAgICAgICAgICAgICAgICAgWzB4ODMsIDB4ODgsIDB4ODksIDB4ODAsIDB4ODBdLFxuICAgICAgICAgICAgICAgICAgWzB4ODEsIDB4OGMsIDB4ODUsIDB4ODIsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgWzB4OWUsIDB4ODUsIDB4OWMsIDB4OTgsIDB4ODZdXTtcblxuICBsb2MyLnNjcmVlbnMgPSBbWzB4OWMsIDB4ODQsIDB4OWIsIDB4ODAsIDB4OWJdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODEsIDB4ODEsIDB4ODAsIDB4ODFdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODcsIDB4OGIsIDB4OGEsIDB4ODZdLFxuICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4OGMsIDB4ODAsIDB4ODUsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgWzB4OWMsIDB4ODYsIDB4ODAsIDB4ODAsIDB4OWFdXTtcblxuICBmb3IgKGNvbnN0IGwgb2YgW2xvYzEsIGxvYzJdKSB7XG4gICAgbC5iZ20gPSAweDE3OyAvLyBtdCBzYWJyZSBjYXZlIG11c2ljP1xuICAgIGwuZW50cmFuY2VzID0gW107XG4gICAgbC5leGl0cyA9IFtdO1xuICAgIGwucGl0cyA9IFtdO1xuICAgIGwuc3Bhd25zID0gW107XG4gICAgbC5mbGFncyA9IFtdO1xuICAgIGwuaGVpZ2h0ID0gbC5zY3JlZW5zLmxlbmd0aDtcbiAgICBsLndpZHRoID0gbC5zY3JlZW5zWzBdLmxlbmd0aDtcbiAgICBsLmV4dGVuZGVkID0gMDtcbiAgICBsLnRpbGVQYWxldHRlcyA9IFsweDFhLCAweDFiLCAweDA1XTtcbiAgICBsLnRpbGVzZXQgPSAweDg4O1xuICAgIGwudGlsZUVmZmVjdHMgPSAweGI1O1xuICAgIGwudGlsZVBhdHRlcm5zID0gWzB4MTQsIDB4MDJdO1xuICAgIGwuc3ByaXRlUGF0dGVybnMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGF0dGVybnNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gICAgbC5zcHJpdGVQYWxldHRlcyA9IFsuLi5TZWFsZWRDYXZlMS5zcHJpdGVQYWxldHRlc10gYXMgW251bWJlciwgbnVtYmVyXTtcbiAgfVxuXG4gIC8vIEFkZCBlbnRyYW5jZSB0byB2YWxsZXkgb2Ygd2luZFxuICAvLyBUT0RPIC0gbWF5YmUganVzdCBkbyAoMHgzMywgW1sweDE5XV0pIG9uY2Ugd2UgZml4IHRoYXQgc2NyZWVuIGZvciBncmFzc1xuICBWYWxsZXlPZldpbmQud3JpdGVTY3JlZW5zMmQoMHgyMywgW1xuICAgIFsweDExLCAweDBkXSxcbiAgICBbMHgwOSwgMHhjMl1dKTtcbiAgcm9tLnRpbGVFZmZlY3RzWzBdLmVmZmVjdHNbMHhjMF0gPSAwO1xuICAvLyBUT0RPIC0gZG8gdGhpcyBvbmNlIHdlIGZpeCB0aGUgc2VhIHRpbGVzZXRcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1YV0gPSAweDBhO1xuICAvLyByb20uc2NyZWVuc1sweGMyXS50aWxlc1sweDViXSA9IDB4MGE7XG5cbiAgLy8gQ29ubmVjdCBtYXBzXG4gIGxvYzEuY29ubmVjdCgweDQzLCBsb2MyLCAweDQ0KTtcbiAgbG9jMS5jb25uZWN0KDB4NDAsIFZhbGxleU9mV2luZCwgMHgzNCk7XG5cbiAgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgLy8gQWRkIGVudHJhbmNlIHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgICBMaW1lVHJlZVZhbGxleS5yZXNpemVTY3JlZW5zKDAsIDEsIDAsIDApOyAvLyBhZGQgb25lIHNjcmVlbiB0byBsZWZ0IGVkZ2VcbiAgICBMaW1lVHJlZVZhbGxleS53cml0ZVNjcmVlbnMyZCgweDAwLCBbXG4gICAgICBbMHgwYywgMHgxMV0sXG4gICAgICBbMHgxNSwgMHgzNl0sXG4gICAgICBbMHgwZSwgMHgwZl1dKTtcbiAgICBsb2MxLnNjcmVlbnNbMF1bNF0gPSAweDk3OyAvLyBkb3duIHN0YWlyXG4gICAgbG9jMS5jb25uZWN0KDB4MDQsIExpbWVUcmVlVmFsbGV5LCAweDEwKTtcbiAgfVxuXG4gIC8vIEFkZCBtb25zdGVyc1xuICBsb2MxLnNwYXducy5wdXNoKFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjEsIHRpbGU6IDB4ODcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMiwgdGlsZTogMHg4OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMywgdGlsZTogMHg4OSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMyLCB0aWxlOiAweDY4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDQxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMywgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgbG9jMi5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDAxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTEsIHRpbGU6IDB4NDgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4NzcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxNCwgdGlsZTogMHgyOCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgyMywgdGlsZTogMHg4NSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OGEsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzQsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4MiwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgaWYgKCFmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gY2hlc3Q6IGFsYXJtIGZsdXRlXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgxMTAsIHg6IDB4NDc4LCB0eXBlOiAyLCBpZDogMHgzMX0pKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gYWRkWm9tYmllV2FycChyb206IFJvbSkge1xuICAvLyBNYWtlIHNwYWNlIGZvciB0aGUgbmV3IGZsYWcgYmV0d2VlbiBKb2VsIGFuZCBTd2FuXG4gIGZvciAobGV0IGkgPSAweDJmNTsgaSA8IDB4MmZjOyBpKyspIHtcbiAgICByb20ubW92ZUZsYWcoaSwgaSAtIDEpO1xuICB9XG4gIC8vIFVwZGF0ZSB0aGUgbWVudVxuICBjb25zdCBtZXNzYWdlID0gcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MjFdWzBdO1xuICBtZXNzYWdlLnRleHQgPSBbXG4gICAgJyB7MWE6TGVhZn0gICAgICB7MTY6QnJ5bm1hZXJ9IHsxZDpPYWt9ICcsXG4gICAgJ3swYzpOYWRhcmV9XFwncyAgezFlOlBvcnRvYX0gICB7MTQ6QW1hem9uZXN9ICcsXG4gICAgJ3sxOTpKb2VsfSAgICAgIFpvbWJpZSAgIHsyMDpTd2FufSAnLFxuICAgICd7MjM6U2h5cm9ufSAgICB7MTg6R29hfSAgICAgIHsyMTpTYWhhcmF9JyxcbiAgXS5qb2luKCdcXG4nKTtcbiAgLy8gQWRkIGEgdHJpZ2dlciB0byB0aGUgZW50cmFuY2UgLSB0aGVyZSdzIGFscmVhZHkgYSBzcGF3biBmb3IgOGFcbiAgLy8gYnV0IHdlIGNhbid0IHJldXNlIHRoYXQgc2luY2UgaXQncyB0aGUgc2FtZSBhcyB0aGUgb25lIG91dHNpZGVcbiAgLy8gdGhlIG1haW4gRVNJIGVudHJhbmNlOyBzbyByZXVzZSBhIGRpZmZlcmVudCBvbmUuXG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFtdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe30pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmZiXTsgLy8gbmV3IHdhcnAgcG9pbnQgZmxhZ1xuICAvLyBBY3R1YWxseSByZXBsYWNlIHRoZSB0cmlnZ2VyLlxuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuWm9tYmllVG93bi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4OGEpIHtcbiAgICAgIHNwYXduLmlkID0gdHJpZ2dlci5pZDtcbiAgICB9ICAgIFxuICB9XG4gIC8vIEluc2VydCBpbnRvIHRoZSB3YXJwIHRhYmxlLlxuICBmb3IgKGxldCBpID0gMHgzZGM2MjsgaSA+PSAweDNkYzVmOyBpLS0pIHtcbiAgICByb20ucHJnW2kgKyAxXSA9IHJvbS5wcmdbaV07XG4gIH1cbiAgcm9tLnByZ1sweDNkYzVmXSA9IHJvbS5sb2NhdGlvbnMuWm9tYmllVG93bi5pZDtcbiAgLy8gQVNNIGZpeGVzIHNob3VsZCBoYXZlIGhhcHBlbmVkIGluIHByZXNodWZmbGUuc1xufVxuXG5mdW5jdGlvbiBldmlsU3Bpcml0SXNsYW5kUmVxdWlyZXNEb2xwaGluKHJvbTogUm9tKSB7XG4gIHJvbS50cmlnZ2VyKDB4OGEpLmNvbmRpdGlvbnMgPSBbfjB4MGVlXTsgLy8gbmV3IGZsYWcgZm9yIHJpZGluZyBkb2xwaGluXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1sweDFkXVsweDEwXS50ZXh0ID0gYFRoZSBjYXZlIGVudHJhbmNlIGFwcGVhcnNcbnRvIGJlIHVuZGVyd2F0ZXIuIFlvdSdsbFxubmVlZCB0byBzd2ltLmA7XG59XG5cbmZ1bmN0aW9uIHJldmVyc2libGVTd2FuR2F0ZShyb206IFJvbSkge1xuICAvLyBBbGxvdyBvcGVuaW5nIFN3YW4gZnJvbSBlaXRoZXIgc2lkZSBieSBhZGRpbmcgYSBwYWlyIG9mIGd1YXJkcyBvbiB0aGVcbiAgLy8gb3Bwb3NpdGUgc2lkZSBvZiB0aGUgZ2F0ZS5cbiAgcm9tLmxvY2F0aW9uc1sweDczXS5zcGF3bnMucHVzaChcbiAgICAvLyBOT1RFOiBTb2xkaWVycyBtdXN0IGNvbWUgaW4gcGFpcnMgKHdpdGggaW5kZXggXjEgZnJvbSBlYWNoIG90aGVyKVxuICAgIFNwYXduLm9mKHt4dDogMHgwYSwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBiLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGUsIHl0OiAweDBhLCB0eXBlOiAyLCBpZDogMHhiM30pLCAvLyBuZXcgdHJpZ2dlcjogZXJhc2UgZ3VhcmRzXG4gICk7XG5cbiAgLy8gR3VhcmRzICgkMmQpIGF0IHN3YW4gZ2F0ZSAoJDczKSB+IHNldCAxMGQgYWZ0ZXIgb3BlbmluZyBnYXRlID0+IGNvbmRpdGlvbiBmb3IgZGVzcGF3blxuICByb20ubnBjc1sweDJkXS5sb2NhbERpYWxvZ3MuZ2V0KDB4NzMpIVswXS5mbGFncy5wdXNoKDB4MTBkKTtcblxuICAvLyBEZXNwYXduIGd1YXJkIHRyaWdnZXIgcmVxdWlyZXMgMTBkXG4gIHJvbS50cmlnZ2VyKDB4YjMpLmNvbmRpdGlvbnMucHVzaCgweDEwZCk7XG59XG5cbmZ1bmN0aW9uIGxlYWZFbGRlckluU2FicmVIZWFscyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsZWFmRWxkZXIgPSByb20ubnBjc1sweDBkXTtcbiAgY29uc3Qgc3VtbWl0RGlhbG9nID0gbGVhZkVsZGVyLmxvY2FsRGlhbG9ncy5nZXQoMHgzNSkhWzBdO1xuICBzdW1taXREaWFsb2cubWVzc2FnZS5hY3Rpb24gPSAweDE3OyAvLyBoZWFsIGFuZCBkaXNhcHBlYXIuXG59XG5cbmZ1bmN0aW9uIHByZXZlbnROcGNEZXNwYXducyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgZnVuY3Rpb24gcmVtb3ZlPFQ+KGFycjogVFtdLCBlbGVtOiBUKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuaW5kZXhPZihlbGVtKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgJHtlbGVtfSBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVJZjxUPihhcnI6IFRbXSwgcHJlZDogKGVsZW06IFQpID0+IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5maW5kSW5kZXgocHJlZCk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhbG9nKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyID0gLTEpOiBMb2NhbERpYWxvZ1tdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0ubG9jYWxEaWFsb2dzLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZGlhbG9nICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gc3Bhd25zKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBzcGF3biBjb25kaXRpb24gJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIExpbmsgc29tZSByZWR1bmRhbnQgTlBDczogS2Vuc3UgKDdlLCA3NCkgYW5kIEFrYWhhbmEgKDg4LCAxNilcbiAgcm9tLm5wY3NbMHg3NF0ubGluaygweDdlKTtcbiAgcm9tLm5wY3NbMHg3NF0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4NzRdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHg3ZV0uZGF0YV0gYXMgYW55O1xuICByb20ubG9jYXRpb25zLlN3YW5fRGFuY2VIYWxsLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4N2UpIS5pZCA9IDB4NzQ7XG4gIHJvbS5pdGVtc1sweDNiXS50cmFkZUluIVswXSA9IDB4NzQ7XG5cbiAgLy8gZGlhbG9nIGlzIHNoYXJlZCBiZXR3ZWVuIDg4IGFuZCAxNi5cbiAgcm9tLm5wY3NbMHg4OF0ubGlua0RpYWxvZygweDE2KTtcblxuICAvLyBNYWtlIGEgbmV3IE5QQyBmb3IgQWthaGFuYSBpbiBCcnlubWFlcjsgb3RoZXJzIHdvbid0IGFjY2VwdCB0aGUgU3RhdHVlIG9mIE9ueXguXG4gIC8vIExpbmtpbmcgc3Bhd24gY29uZGl0aW9ucyBhbmQgZGlhbG9ncyBpcyBzdWZmaWNpZW50LCBzaW5jZSB0aGUgYWN0dWFsIE5QQyBJRFxuICAvLyAoMTYgb3IgODIpIGlzIHdoYXQgbWF0dGVycyBmb3IgdGhlIHRyYWRlLWluXG4gIHJvbS5ucGNzWzB4ODJdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDgyXS5saW5rKDB4MTYpO1xuICByb20ubnBjc1sweDgyXS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4MTZdLmRhdGFdIGFzIGFueTsgLy8gZW5zdXJlIGdpdmUgaXRlbVxuICByb20ubG9jYXRpb25zLkJyeW5tYWVyLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4MTYpIS5pZCA9IDB4ODI7XG4gIHJvbS5pdGVtc1sweDI1XS50cmFkZUluIVswXSA9IDB4ODI7XG5cbiAgLy8gTGVhZiBlbGRlciBpbiBob3VzZSAoJDBkIEAgJGMwKSB+IHN3b3JkIG9mIHdpbmQgcmVkdW5kYW50IGZsYWdcbiAgLy8gZGlhbG9nKDB4MGQsIDB4YzApWzJdLmZsYWdzID0gW107XG4gIC8vcm9tLml0ZW1HZXRzWzB4MDBdLmZsYWdzID0gW107IC8vIGNsZWFyIHJlZHVuZGFudCBmbGFnXG5cbiAgLy8gTGVhZiByYWJiaXQgKCQxMykgbm9ybWFsbHkgc3RvcHMgc2V0dGluZyBpdHMgZmxhZyBhZnRlciBwcmlzb24gZG9vciBvcGVuZWQsXG4gIC8vIGJ1dCB0aGF0IGRvZXNuJ3QgbmVjZXNzYXJpbHkgb3BlbiBtdCBzYWJyZS4gIEluc3RlYWQgKGEpIHRyaWdnZXIgb24gMDQ3XG4gIC8vIChzZXQgYnkgOGQgdXBvbiBlbnRlcmluZyBlbGRlcidzIGNlbGwpLiAgQWxzbyBtYWtlIHN1cmUgdGhhdCB0aGF0IHBhdGggYWxzb1xuICAvLyBwcm92aWRlcyB0aGUgbmVlZGVkIGZsYWcgdG8gZ2V0IGludG8gbXQgc2FicmUuXG4gIGRpYWxvZygweDEzKVsyXS5jb25kaXRpb24gPSAweDA0NztcbiAgZGlhbG9nKDB4MTMpWzJdLmZsYWdzID0gWzB4MGE5XTtcbiAgZGlhbG9nKDB4MTMpWzNdLmZsYWdzID0gWzB4MGE5XTtcblxuICAvLyBXaW5kbWlsbCBndWFyZCAoJDE0IEAgJDBlKSBzaG91bGRuJ3QgZGVzcGF3biBhZnRlciBhYmR1Y3Rpb24gKDAzOCksXG4gIC8vIGJ1dCBpbnN0ZWFkIGFmdGVyIGdpdmluZyB0aGUgaXRlbSAoMDg4KVxuICBzcGF3bnMoMHgxNCwgMHgwZSlbMV0gPSB+MHgwODg7IC8vIHJlcGxhY2UgZmxhZyB+MDM4ID0+IH4wODhcbiAgLy9kaWFsb2coMHgxNCwgMHgwZSlbMF0uZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIHJlZHVuZGFudCBmbGFnIH4gd2luZG1pbGwga2V5XG5cbiAgLy8gQWthaGFuYSAoJDE2IC8gODgpIH4gc2hpZWxkIHJpbmcgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHgxNiwgMHg1NylbMF0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGlzYXBwZWFyIGFmdGVyIGdldHRpbmcgYmFycmllciAobm90ZSA4OCdzIHNwYXducyBub3QgbGlua2VkIHRvIDE2KVxuICByZW1vdmUoc3Bhd25zKDB4MTYsIDB4NTcpLCB+MHgwNTEpO1xuICByZW1vdmUoc3Bhd25zKDB4ODgsIDB4NTcpLCB+MHgwNTEpO1xuXG4gIGZ1bmN0aW9uIHJldmVyc2VEaWFsb2coZHM6IExvY2FsRGlhbG9nW10pOiB2b2lkIHtcbiAgICBkcy5yZXZlcnNlKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbmV4dCA9IGRzW2kgKyAxXTtcbiAgICAgIGRzW2ldLmNvbmRpdGlvbiA9IG5leHQgPyB+bmV4dC5jb25kaXRpb24gOiB+MDtcbiAgICB9XG4gIH07XG5cbiAgLy8gT2FrIGVsZGVyICgkMWQpIH4gc3dvcmQgb2YgZmlyZSByZWR1bmRhbnQgZmxhZ1xuICBjb25zdCBvYWtFbGRlckRpYWxvZyA9IGRpYWxvZygweDFkKTtcbiAgLy9vYWtFbGRlckRpYWxvZ1s0XS5mbGFncyA9IFtdO1xuICAvLyBNYWtlIHN1cmUgdGhhdCB3ZSB0cnkgdG8gZ2l2ZSB0aGUgaXRlbSBmcm9tICphbGwqIHBvc3QtaW5zZWN0IGRpYWxvZ3NcbiAgb2FrRWxkZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuXG4gIC8vIE9hayBtb3RoZXIgKCQxZSkgfiBpbnNlY3QgZmx1dGUgcmVkdW5kYW50IGZsYWdcbiAgLy8gVE9ETyAtIHJlYXJyYW5nZSB0aGVzZSBmbGFncyBhIGJpdCAobWF5YmUgfjA0NSwgfjBhMCB+MDQxIC0gc28gcmV2ZXJzZSlcbiAgLy8gICAgICAtIHdpbGwgbmVlZCB0byBjaGFuZ2UgYmFsbE9mRmlyZSBhbmQgaW5zZWN0Rmx1dGUgaW4gZGVwZ3JhcGhcbiAgY29uc3Qgb2FrTW90aGVyRGlhbG9nID0gZGlhbG9nKDB4MWUpO1xuICAoKCkgPT4ge1xuICAgIGNvbnN0IFtraWxsZWRJbnNlY3QsIGdvdEl0ZW0sIGdldEl0ZW0sIGZpbmRDaGlsZF0gPSBvYWtNb3RoZXJEaWFsb2c7XG4gICAgZmluZENoaWxkLmNvbmRpdGlvbiA9IH4weDA0NTtcbiAgICAvL2dldEl0ZW0uY29uZGl0aW9uID0gfjB4MjI3O1xuICAgIC8vZ2V0SXRlbS5mbGFncyA9IFtdO1xuICAgIGdvdEl0ZW0uY29uZGl0aW9uID0gfjA7XG4gICAgcm9tLm5wY3NbMHgxZV0ubG9jYWxEaWFsb2dzLnNldCgtMSwgW2ZpbmRDaGlsZCwgZ2V0SXRlbSwga2lsbGVkSW5zZWN0LCBnb3RJdGVtXSk7XG4gIH0pKCk7XG4gIC8vLyBvYWtNb3RoZXJEaWFsb2dbMl0uZmxhZ3MgPSBbXTtcbiAgLy8gLy8gRW5zdXJlIHdlIGFsd2F5cyBnaXZlIGl0ZW0gYWZ0ZXIgaW5zZWN0LlxuICAvLyBvYWtNb3RoZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyBvYWtNb3RoZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyByZXZlcnNlRGlhbG9nKG9ha01vdGhlckRpYWxvZyk7XG5cbiAgLy8gUmV2ZXJzZSB0aGUgb3RoZXIgb2FrIGRpYWxvZ3MsIHRvby5cbiAgZm9yIChjb25zdCBpIG9mIFsweDIwLCAweDIxLCAweDIyLCAweDdjLCAweDdkXSkge1xuICAgIHJldmVyc2VEaWFsb2coZGlhbG9nKGkpKTtcbiAgfVxuXG4gIC8vIFN3YXAgdGhlIGZpcnN0IHR3byBvYWsgY2hpbGQgZGlhbG9ncy5cbiAgY29uc3Qgb2FrQ2hpbGREaWFsb2cgPSBkaWFsb2coMHgxZik7XG4gIG9ha0NoaWxkRGlhbG9nLnVuc2hpZnQoLi4ub2FrQ2hpbGREaWFsb2cuc3BsaWNlKDEsIDEpKTtcblxuICAvLyBUaHJvbmUgcm9vbSBiYWNrIGRvb3IgZ3VhcmQgKCQzMyBAICRkZikgc2hvdWxkIGhhdmUgc2FtZSBzcGF3biBjb25kaXRpb24gYXMgcXVlZW5cbiAgLy8gKDAyMCBOT1QgcXVlZW4gbm90IGluIHRocm9uZSByb29tIEFORCAwMWIgTk9UIHZpZXdlZCBtZXNpYSByZWNvcmRpbmcpXG4gIHJvbS5ucGNzWzB4MzNdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkZiwgIFt+MHgwMjAsIH4weDAxYl0pO1xuXG4gIC8vIEZyb250IHBhbGFjZSBndWFyZCAoJDM0KSB2YWNhdGlvbiBtZXNzYWdlIGtleXMgb2ZmIDAxYiBpbnN0ZWFkIG9mIDAxZlxuICBkaWFsb2coMHgzNClbMV0uY29uZGl0aW9uID0gMHgwMWI7XG5cbiAgLy8gUXVlZW4ncyAoJDM4KSBkaWFsb2cgbmVlZHMgcXVpdGUgYSBiaXQgb2Ygd29ya1xuICAvLyBHaXZlIGl0ZW0gKGZsdXRlIG9mIGxpbWUpIGV2ZW4gaWYgZ290IHRoZSBzd29yZCBvZiB3YXRlclxuICBkaWFsb2coMHgzOClbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzOyAvLyBcInlvdSBmb3VuZCBzd29yZFwiID0+IGFjdGlvbiAzXG4gIGRpYWxvZygweDM4KVs0XS5mbGFncy5wdXNoKDB4MDljKTsgICAgIC8vIHNldCAwOWMgcXVlZW4gZ29pbmcgYXdheVxuICAvLyBRdWVlbiBzcGF3biBjb25kaXRpb24gZGVwZW5kcyBvbiAwMWIgKG1lc2lhIHJlY29yZGluZykgbm90IDAxZiAoYmFsbCBvZiB3YXRlcilcbiAgLy8gVGhpcyBlbnN1cmVzIHlvdSBoYXZlIGJvdGggc3dvcmQgYW5kIGJhbGwgdG8gZ2V0IHRvIGhlciAoPz8/KVxuICBzcGF3bnMoMHgzOCwgMHhkZilbMV0gPSB+MHgwMWI7ICAvLyB0aHJvbmUgcm9vbTogMDFiIE5PVCBtZXNpYSByZWNvcmRpbmdcbiAgc3Bhd25zKDB4MzgsIDB4ZTEpWzBdID0gMHgwMWI7ICAgLy8gYmFjayByb29tOiAwMWIgbWVzaWEgcmVjb3JkaW5nXG4gIGRpYWxvZygweDM4KVsxXS5jb25kaXRpb24gPSAweDAxYjsgICAgIC8vIHJldmVhbCBjb25kaXRpb246IDAxYiBtZXNpYSByZWNvcmRpbmdcblxuICAvLyBGb3J0dW5lIHRlbGxlciAoJDM5KSBzaG91bGQgYWxzbyBub3Qgc3Bhd24gYmFzZWQgb24gbWVzaWEgcmVjb3JkaW5nIHJhdGhlciB0aGFuIG9yYlxuICBzcGF3bnMoMHgzOSwgMHhkOClbMV0gPSB+MHgwMWI7ICAvLyBmb3J0dW5lIHRlbGxlciByb29tOiAwMWIgTk9UXG5cbiAgLy8gQ2xhcmsgKCQ0NCkgbW92ZXMgYWZ0ZXIgdGFsa2luZyB0byBoaW0gKDA4ZCkgcmF0aGVyIHRoYW4gY2FsbWluZyBzZWEgKDA4ZikuXG4gIC8vIFRPRE8gLSBjaGFuZ2UgMDhkIHRvIHdoYXRldmVyIGFjdHVhbCBpdGVtIGhlIGdpdmVzLCB0aGVuIHJlbW92ZSBib3RoIGZsYWdzXG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlOSwgW34weDA4ZF0pOyAvLyB6b21iaWUgdG93biBiYXNlbWVudFxuICByb20ubnBjc1sweDQ0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZTQsIFsweDA4ZF0pOyAgLy8gam9lbCBzaGVkXG4gIC8vZGlhbG9nKDB4NDQsIDB4ZTkpWzFdLmZsYWdzLnBvcCgpOyAvLyByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuXG4gIC8vIEJyb2thaGFuYSAoJDU0KSB+IHdhcnJpb3IgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDU0KVsyXS5mbGFncyA9IFtdO1xuXG4gIC8vIERlbyAoJDVhKSB+IHBlbmRhbnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1YSlbMV0uZmxhZ3MgPSBbXTtcblxuICAvLyBaZWJ1ICgkNWUpIGNhdmUgZGlhbG9nIChAICQxMClcbiAgLy8gVE9ETyAtIGRpYWxvZ3MoMHg1ZSwgMHgxMCkucmVhcnJhbmdlKH4weDAzYSwgMHgwMGQsIDB4MDM4LCAweDAzOSwgMHgwMGEsIH4weDAwMCk7XG4gIHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5zZXQoMHgxMCwgW1xuICAgIExvY2FsRGlhbG9nLm9mKH4weDAzYSwgWzB4MDAsIDB4MWFdLCBbMHgwM2FdKSwgLy8gMDNhIE5PVCB0YWxrZWQgdG8gemVidSBpbiBjYXZlIC0+IFNldCAwM2FcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMGQsIFsweDAwLCAweDFkXSksIC8vIDAwZCBsZWFmIHZpbGxhZ2VycyByZXNjdWVkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM4LCBbMHgwMCwgMHgxY10pLCAvLyAwMzggbGVhZiBhdHRhY2tlZFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAzOSwgWzB4MDAsIDB4MWRdKSwgLy8gMDM5IGxlYXJuZWQgcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwYSwgWzB4MDAsIDB4MWIsIDB4MDNdKSwgLy8gMDBhIHdpbmRtaWxsIGtleSB1c2VkIC0+IHRlYWNoIHJlZnJlc2hcbiAgICBMb2NhbERpYWxvZy5vZih+MHgwMDAsIFsweDAwLCAweDFkXSksXG4gIF0pO1xuICAvLyBEb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByZW1vdmUoc3Bhd25zKDB4NWUsIDB4MTApLCB+MHgwNTEpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBUb3JuZWwgKCQ1ZikgaW4gc2FicmUgd2VzdCAoJDIxKSB+IHRlbGVwb3J0IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NWYsIDB4MjEpWzFdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NWZdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgyMSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFN0b20gKCQ2MCk6IGRvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NjBdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgxZSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIEFzaW5hICgkNjIpIGluIGJhY2sgcm9vbSAoJGUxKSBnaXZlcyBmbHV0ZSBvZiBsaW1lXG4gIGNvbnN0IGFzaW5hID0gcm9tLm5wY3NbMHg2Ml07XG4gIGFzaW5hLmRhdGFbMV0gPSAweDI4O1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgZGlhbG9nKGFzaW5hLmlkLCAweGUxKVsyXS5tZXNzYWdlLmFjdGlvbiA9IDB4MTE7XG4gIC8vIFByZXZlbnQgZGVzcGF3biBmcm9tIGJhY2sgcm9vbSBhZnRlciBkZWZlYXRpbmcgc2FiZXJhICh+MDhmKVxuICByZW1vdmUoc3Bhd25zKGFzaW5hLmlkLCAweGUxKSwgfjB4MDhmKTtcblxuICAvLyBLZW5zdSBpbiBjYWJpbiAoJDY4IEAgJDYxKSBuZWVkcyB0byBiZSBhdmFpbGFibGUgZXZlbiBhZnRlciB2aXNpdGluZyBKb2VsLlxuICAvLyBDaGFuZ2UgaGltIHRvIGp1c3QgZGlzYXBwZWFyIGFmdGVyIHNldHRpbmcgdGhlIHJpZGVhYmxlIGRvbHBoaW4gZmxhZyAoMDliKSxcbiAgLy8gYW5kIHRvIG5vdCBldmVuIHNob3cgdXAgYXQgYWxsIHVubGVzcyB0aGUgZm9nIGxhbXAgd2FzIHJldHVybmVkICgwMjEpLlxuICByb20ubnBjc1sweDY4XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4NjEsIFt+MHgwOWIsIDB4MDIxXSk7XG4gIGRpYWxvZygweDY4KVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDI7IC8vIGRpc2FwcGVhclxuXG4gIC8vIEF6dGVjYSBpbiBTaHlyb24gKDZlKSBzaG91bGRuJ3Qgc3Bhd24gYWZ0ZXIgbWFzc2FjcmUgKDAyNylcbiAgcm9tLm5wY3NbMHg2ZV0uc3Bhd25Db25kaXRpb25zLmdldCgweGYyKSEucHVzaCh+MHgwMjcpO1xuICAvLyBBbHNvIHRoZSBkaWFsb2cgdHJpZ2dlciAoODIpIHNob3VsZG4ndCBoYXBwZW5cbiAgcm9tLnRyaWdnZXIoMHg4MikuY29uZGl0aW9ucy5wdXNoKH4weDAyNyk7XG5cbiAgLy8gS2Vuc3UgaW4gbGlnaHRob3VzZSAoJDc0LyQ3ZSBAICQ2MikgfiByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDc0LCAweDYyKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIEF6dGVjYSAoJDgzKSBpbiBweXJhbWlkIH4gYm93IG9mIHRydXRoIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmNvbmRpdGlvbiA9IH4weDI0MDsgIC8vIDI0MCBOT1QgYm93IG9mIHRydXRoXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gUmFnZSBibG9ja3Mgb24gc3dvcmQgb2Ygd2F0ZXIsIG5vdCByYW5kb20gaXRlbSBmcm9tIHRoZSBjaGVzdFxuICBkaWFsb2coMHhjMylbMF0uY29uZGl0aW9uID0gMHgyMDI7XG5cbiAgLy8gUmVtb3ZlIHVzZWxlc3Mgc3Bhd24gY29uZGl0aW9uIGZyb20gTWFkbyAxXG4gIHJvbS5ucGNzWzB4YzRdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHhmMik7IC8vIGFsd2F5cyBzcGF3blxuXG4gIC8vIERyYXlnb24gMiAoJGNiIEAgbG9jYXRpb24gJGE2KSBzaG91bGQgZGVzcGF3biBhZnRlciBiZWluZyBkZWZlYXRlZC5cbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLnNldCgweGE2LCBbfjB4MjhkXSk7IC8vIGtleSBvbiBiYWNrIHdhbGwgZGVzdHJveWVkXG5cbiAgLy8gRml4IFplYnUgdG8gZ2l2ZSBrZXkgdG8gc3R4eSBldmVuIGlmIHRodW5kZXIgc3dvcmQgaXMgZ290dGVuIChqdXN0IHN3aXRjaCB0aGVcbiAgLy8gb3JkZXIgb2YgdGhlIGZpcnN0IHR3bykuICBBbHNvIGRvbid0IGJvdGhlciBzZXR0aW5nIDAzYiBzaW5jZSB0aGUgbmV3IEl0ZW1HZXRcbiAgLy8gbG9naWMgb2J2aWF0ZXMgdGhlIG5lZWQuXG4gIGNvbnN0IHplYnVTaHlyb24gPSByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3MuZ2V0KDB4ZjIpITtcbiAgemVidVNoeXJvbi51bnNoaWZ0KC4uLnplYnVTaHlyb24uc3BsaWNlKDEsIDEpKTtcbiAgLy8gemVidVNoeXJvblswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFNoeXJvbiBtYXNzYWNyZSAoJDgwKSByZXF1aXJlcyBrZXkgdG8gc3R4eVxuICByb20udHJpZ2dlcigweDgwKS5jb25kaXRpb25zID0gW1xuICAgIH4weDAyNywgLy8gbm90IHRyaWdnZXJlZCBtYXNzYWNyZSB5ZXRcbiAgICAgMHgwM2IsIC8vIGdvdCBpdGVtIGZyb20ga2V5IHRvIHN0eHkgc2xvdFxuICAgICAweDJmZCwgLy8gc2h5cm9uIHdhcnAgcG9pbnQgdHJpZ2dlcmVkXG4gICAgIC8vIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlciAtIE5PVCBBTlkgTU9SRSFcbiAgXTtcblxuICAvLyBFbnRlciBzaHlyb24gKCQ4MSkgc2hvdWxkIHNldCB3YXJwIG5vIG1hdHRlciB3aGF0XG4gIHJvbS50cmlnZ2VyKDB4ODEpLmNvbmRpdGlvbnMgPSBbXTtcblxuICBpZiAoZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpKSB7XG4gICAgLy8gTGVhcm4gYmFycmllciAoJDg0KSByZXF1aXJlcyBjYWxtIHNlYVxuICAgIHJvbS50cmlnZ2VyKDB4ODQpLmNvbmRpdGlvbnMucHVzaCgweDI4Myk7IC8vIDI4MyBjYWxtZWQgdGhlIHNlYVxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBub3Qgc2V0dGluZyAwNTEgYW5kIGNoYW5naW5nIHRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIGl0ZW1cbiAgfVxuICAvL3JvbS50cmlnZ2VyKDB4ODQpLmZsYWdzID0gW107XG5cbiAgLy8gQWRkIGFuIGV4dHJhIGNvbmRpdGlvbiB0byB0aGUgTGVhZiBhYmR1Y3Rpb24gdHJpZ2dlciAoYmVoaW5kIHplYnUpLiAgVGhpcyBlbnN1cmVzXG4gIC8vIGFsbCB0aGUgaXRlbXMgaW4gTGVhZiBwcm9wZXIgKGVsZGVyIGFuZCBzdHVkZW50KSBhcmUgZ290dGVuIGJlZm9yZSB0aGV5IGRpc2FwcGVhci5cbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKDB4MDNhKTsgLy8gMDNhIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmVcblxuICAvLyBNb3JlIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXJzOlxuICAvLyAxLiBSZW1vdmUgdGhlIDhkIHRyaWdnZXIgaW4gdGhlIGZyb250IG9mIHRoZSBjZWxsLCBzd2FwIGl0IG91dFxuICAvLyAgICBmb3IgYjIgKGxlYXJuIHBhcmFseXNpcykuXG4gIHJvbS50cmlnZ2VyKDB4OGQpLnVzZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9TdW1taXRDYXZlLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCkgc3Bhd24uaWQgPSAweGIyO1xuICB9XG4gIHJlbW92ZUlmKHJvbS5sb2NhdGlvbnMuV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLFxuICAgICAgICAgICBzcGF3biA9PiBzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCk7XG4gIC8vIDIuIFNldCB0aGUgdHJpZ2dlciB0byByZXF1aXJlIGhhdmluZyBraWxsZWQga2VsYmVzcXVlLlxuICByb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zLnB1c2goMHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDMuIEFsc28gc2V0IHRoZSB0cmlnZ2VyIHRvIGZyZWUgdGhlIHZpbGxhZ2VycyBhbmQgdGhlIGVsZGVyLlxuICByb20udHJpZ2dlcigweGIyKS5mbGFncy5wdXNoKH4weDA4NCwgfjB4MDg1LCAweDAwZCk7XG4gIC8vIDQuIERvbid0IHRyaWdnZXIgdGhlIGFiZHVjdGlvbiBpbiB0aGUgZmlyc3QgcGxhY2UgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNS4gRG9uJ3QgdHJpZ2dlciByYWJiaXQgYmxvY2sgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4NikuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNi4gRG9uJ3QgZnJlZSB2aWxsYWdlcnMgZnJvbSB1c2luZyBwcmlzb24ga2V5XG4gIHJvbS5wcmdbMHgxZTBhM10gPSAweGMwO1xuICByb20ucHJnWzB4MWUwYTRdID0gMHgwMDtcblxuICAvLyBUT0RPIC0gYWRkaXRpb25hbCB3b3JrIG9uIGFiZHVjdGlvbiB0cmlnZ2VyOlxuICAvLyAgIC0gZ2V0IHJpZCBvZiB0aGUgZmxhZ3Mgb24ga2V5IHRvIHByaXNvbiB1c2VcbiAgLy8gICAtIGFkZCBhIGNvbmRpdGlvbiB0aGF0IGFiZHVjdGlvbiBkb2Vzbid0IGhhcHBlbiBpZiByZXNjdWVkXG4gIC8vIEdldCByaWQgb2YgQk9USCB0cmlnZ2VycyBpbiBzdW1taXQgY2F2ZSwgIEluc3RlYWQsIHRpZSBldmVyeXRoaW5nXG4gIC8vIHRvIHRoZSBlbGRlciBkaWFsb2cgb24gdG9wXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgc3RpbGwgYWxpdmUsIG1heWJlIGdpdmUgYSBoaW50IGFib3V0IHdlYWtuZXNzXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgZGVhZCB0aGVuIHRlYWNoIHBhcmFseXNpcyBhbmQgc2V0L2NsZWFyIGZsYWdzXG4gIC8vICAgLSBpZiBwYXJhbHlzaXMgbGVhcm5lZCB0aGVuIHNheSBzb21ldGhpbmcgZ2VuZXJpY1xuICAvLyBTdGlsbCBuZWVkIHRvIGtlZXAgdGhlIHRyaWdnZXIgaW4gdGhlIGZyb250IGluIGNhc2Ugbm9cbiAgLy8gYWJkdWN0aW9uIHlldFxuICAvLyAgIC0gaWYgTk9UIHBhcmFseXNpcyBBTkQgaWYgTk9UIGVsZGVyIG1pc3NpbmcgQU5EIGlmIGtlbGJlcXVlIGRlYWRcbiAgLy8gLS0tPiBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHR3byB3YXlzIHRvIGdldCAobGlrZSByZWZyZXNoKT9cbiAgLy9cbiAgLy8gQWxzbyBhZGQgYSBjaGVjayB0aGF0IHRoZSByYWJiaXQgdHJpZ2dlciBpcyBnb25lIGlmIHJlc2N1ZWQhXG5cblxuXG4gIC8vIFBhcmFseXNpcyB0cmlnZ2VyICgkYjIpIH4gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcbiAgLy9yb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zWzBdID0gfjB4MjQyO1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnNoaWZ0KCk7IC8vIHJlbW92ZSAwMzcgbGVhcm5lZCBwYXJhbHlzaXNcblxuICAvLyBMZWFybiByZWZyZXNoIHRyaWdnZXIgKCRiNCkgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjQpLmNvbmRpdGlvbnNbMV0gPSB+MHgyNDE7XG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIDAzOSBsZWFybmVkIHJlZnJlc2hcblxuICAvLyBUZWxlcG9ydCBibG9jayBvbiBtdCBzYWJyZSBpcyBmcm9tIHNwZWxsLCBub3Qgc2xvdFxuICByb20udHJpZ2dlcigweGJhKS5jb25kaXRpb25zWzBdID0gfjB4MjQ0OyAvLyB+MDNmIC0+IH4yNDRcblxuICAvLyBQb3J0b2EgcGFsYWNlIGd1YXJkIG1vdmVtZW50IHRyaWdnZXIgKCRiYikgc3RvcHMgb24gMDFiIChtZXNpYSkgbm90IDAxZiAob3JiKVxuICByb20udHJpZ2dlcigweGJiKS5jb25kaXRpb25zWzFdID0gfjB4MDFiO1xuXG4gIC8vIFJlbW92ZSByZWR1bmRhbnQgdHJpZ2dlciA4YSAoc2xvdCAxNikgaW4gem9tYmlldG93biAoJDY1KVxuICAvLyAgLS0gbm90ZTogbm8gbG9uZ2VyIG5lY2Vzc2FyeSBzaW5jZSB3ZSByZXB1cnBvc2UgaXQgaW5zdGVhZC5cbiAgLy8gY29uc3Qge3pvbWJpZVRvd259ID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gem9tYmllVG93bi5zcGF3bnMgPSB6b21iaWVUb3duLnNwYXducy5maWx0ZXIoeCA9PiAheC5pc1RyaWdnZXIoKSB8fCB4LmlkICE9IDB4OGEpO1xuXG4gIC8vIFJlcGxhY2UgYWxsIGRpYWxvZyBjb25kaXRpb25zIGZyb20gMDBlIHRvIDI0M1xuICBmb3IgKGNvbnN0IG5wYyBvZiByb20ubnBjcykge1xuICAgIGZvciAoY29uc3QgZCBvZiBucGMuYWxsRGlhbG9ncygpKSB7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IDB4MDBlKSBkLmNvbmRpdGlvbiA9IDB4MjQzO1xuICAgICAgaWYgKGQuY29uZGl0aW9uID09PSB+MHgwMGUpIGQuY29uZGl0aW9uID0gfjB4MjQzO1xuICAgIH1cbiAgfVxufVxuXG4vLyBIYXJkIG1vZGUgZmxhZzogSGMgLSB6ZXJvIG91dCB0aGUgc3dvcmQncyBjb2xsaXNpb24gcGxhbmVcbmZ1bmN0aW9uIGRpc2FibGVTdGFicyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG8gb2YgWzB4MDgsIDB4MDksIDB4MjddKSB7XG4gICAgcm9tLm9iamVjdHNbb10uY29sbGlzaW9uUGxhbmUgPSAwO1xuICB9XG4gIC8vIEFsc28gdGFrZSB3YXJyaW9yIHJpbmcgb3V0IG9mIHRoZSBwaWN0dXJlLi4uIDp0cm9sbDpcbiAgLy8gcm9tLml0ZW1HZXRzWzB4MmJdLmlkID0gMHg1YjsgLy8gbWVkaWNhbCBoZXJiIGZyb20gc2Vjb25kIGZsdXRlIG9mIGxpbWUgY2hlY2tcbiAgcm9tLm5wY3NbMHg1NF0uZGF0YVswXSA9IDB4MjA7XG59XG5cbmZ1bmN0aW9uIG9yYnNPcHRpb25hbChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHgxMCwgMHgxNCwgMHgxOCwgMHgxZF0pIHtcbiAgICAvLyAxLiBMb29zZW4gdGVycmFpbiBzdXNjZXB0aWJpbGl0eSBvZiBsZXZlbCAxIHNob3RzXG4gICAgcm9tLm9iamVjdHNbb2JqXS50ZXJyYWluU3VzY2VwdGliaWxpdHkgJj0gfjB4MDQ7XG4gICAgLy8gMi4gSW5jcmVhc2UgdGhlIGxldmVsIHRvIDJcbiAgICByb20ub2JqZWN0c1tvYmpdLmxldmVsID0gMjtcbiAgfVxufVxuIl19