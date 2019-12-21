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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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SUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLElBQUks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QUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0sWUFBWSxHQUNkLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXpFLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNuQixJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVEsRUFBRSxLQUFjO0lBRWxELEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBR2hELEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDTixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDWixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFHL0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXJDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFFckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFD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QUFZLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUM7SUFFbEUsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3RCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRzdELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVoRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFD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QUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQzNELENBQUM7SUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzNELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUMzRCxDQUFDO0lBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxFQUFFO1FBRWpDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO0FBQ0gsQ0FB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QyxDQUFDLE9BQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFHbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFLaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBUSxDQUFDO0lBQ3RELEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQy9FLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQVVuQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBSWhDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFNL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRW5DLFNBQVMsYUFBYSxDQUFDLEVBQWlCO1FBQ3RDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNiLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0M7SUFDSCxDQUFDO0lBQUEsQ0FBQztJQUdGLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUdwQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDeEMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ3hDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUN4QyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFLeEMsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JDLENBQUMsR0FBRyxFQUFFO1FBQ0osTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxHQUFHLGVBQWUsQ0FBQztRQUNwRSxTQUFTLENBQUMsU0FBUyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRzdCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNuRixDQUFDLENBQUMsRUFBRSxDQUFDO0lBUUwsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUM5QyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDMUI7SUFHRCxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFJdkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUc1RCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUlsQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFFdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFHbEMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUMvQixNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBSS9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFXbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUtuQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDaEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFFaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7SUFLdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0lBR3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFB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dXAgb2YgdGhlIFJPTS5cblxuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtFbnRyYW5jZSwgRXhpdCwgRmxhZywgTG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtNZXNzYWdlSWR9IGZyb20gJy4uL3JvbS9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtHbG9iYWxEaWFsb2csIExvY2FsRGlhbG9nfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljUHJlUGFyc2UocHJnOiBVaW50OEFycmF5KTogdm9pZCB7XG4gIC8vIFJlbW92ZSB1bnVzZWQgaXRlbS90cmlnZ2VyIGFjdGlvbnNcbiAgcHJnWzB4MWUwNmJdICY9IDc7IC8vIG1lZGljYWwgaGVyYiBub3JtYWwgdXNhZ2UgPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA2Zl0gJj0gNzsgLy8gbWFnaWMgcmluZyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNzNdICY9IDc7IC8vIGZydWl0IG9mIGxpbWUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDc3XSAmPSA3OyAvLyBhbnRpZG90ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwN2JdICY9IDc7IC8vIG9wZWwgc3RhdHVlIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA4NF0gJj0gNzsgLy8gd2FycCBib290cyBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNCB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwOWJdICY9IDc7IC8vIHdpbmRtaWxsIGtleSBpdGVtdXNlWzFdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwYjldICY9IDc7IC8vIGdsb3dpbmcgbGFtcCBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluaXN0aWMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG5cbiAgLy8gTk9URTogdGhpcyBpcyBkb25lIHZlcnkgZWFybHksIG1ha2Ugc3VyZSBhbnkgcmVmZXJlbmNlcyB0byB3YXJwXG4gIC8vIHBvaW50IGZsYWdzIGFyZSB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIG5ldyBvbmVzIVxuICBhZGRab21iaWVXYXJwKHJvbSk7XG5cbiAgYWRkTWV6YW1lVHJpZ2dlcihyb20pO1xuXG4gIG5vcm1hbGl6ZVN3b3Jkcyhyb20sIGZsYWdzKTtcblxuICBmaXhDb2luU3ByaXRlcyhyb20pO1xuICBmaXhNaW1pY3Mocm9tKTtcblxuICBtYWtlQnJhY2VsZXRzUHJvZ3Jlc3NpdmUocm9tKTtcblxuICBhZGRUb3dlckV4aXQocm9tKTtcbiAgcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbSk7XG4gIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tKTtcbiAgcHJldmVudE5wY0Rlc3Bhd25zKHJvbSwgZmxhZ3MpO1xuICBsZWFmRWxkZXJJblNhYnJlSGVhbHMocm9tKTtcbiAgaWYgKGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkpIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbSk7XG4gIGlmIChmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpKSByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbSk7XG5cbiAgYWRqdXN0SXRlbU5hbWVzKHJvbSwgZmxhZ3MpO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBtYWtpbmcgYSBUcmFuc2Zvcm1hdGlvbiBpbnRlcmZhY2UsIHdpdGggb3JkZXJpbmcgY2hlY2tzXG4gIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tLCBmbGFncyk7IC8vIE5PVEU6IHByZS1zaHVmZmxlXG4gIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tKTtcbiAgaWYgKGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfSBlbHNlIHtcbiAgICBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfVxuXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tKTtcblxuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSkge1xuICAgIGVhc3RDYXZlKHJvbSwgZmxhZ3MpO1xuICB9IGVsc2UgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbSk7XG4gIH1cbiAgZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb20pO1xuICBjbG9zZUNhdmVFbnRyYW5jZXMocm9tLCBmbGFncyk7XG4gIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbSk7XG4gIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVSYWJiaXRTa2lwKCkpIGZpeFJhYmJpdFNraXAocm9tKTtcblxuICBmaXhSZXZlcnNlV2FsbHMocm9tKTtcbiAgaWYgKGZsYWdzLmNoYXJnZVNob3RzT25seSgpKSBkaXNhYmxlU3RhYnMocm9tKTtcbiAgaWYgKGZsYWdzLm9yYnNPcHRpb25hbCgpKSBvcmJzT3B0aW9uYWwocm9tKTtcbn1cblxuLy8gQWRkcyBhIHRyaWdnZXIgYWN0aW9uIHRvIG1lemFtZS4gIFVzZSA4NyBsZWZ0b3ZlciBmcm9tIHJlc2N1aW5nIHplYnUuXG5mdW5jdGlvbiBhZGRNZXphbWVUcmlnZ2VyKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFt+MHgyZjBdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe2FjdGlvbjogNH0pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmYwXTtcbiAgY29uc3QgbWV6YW1lID0gcm9tLmxvY2F0aW9ucy5NZXphbWVTaHJpbmU7XG4gIG1lemFtZS5zcGF3bnMucHVzaChTcGF3bi5vZih7dGlsZTogMHg4OCwgdHlwZTogMiwgaWQ6IHRyaWdnZXIuaWR9KSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuXG4gIGlmIChmbGFncy5zbG93RG93blRvcm5hZG8oKSkge1xuICAgIC8vIFRPRE8gLSB0b3JuYWRvIChvYmogMTIpID0+IHNwZWVkIDA3IGluc3RlYWQgb2YgMDhcbiAgICAvLyAgICAgIC0gbGlmZXRpbWUgaXMgNDgwID0+IDcwIG1heWJlIHRvbyBsb25nLCA2MCBzd2VldCBzcG90P1xuICAgIGNvbnN0IHRvcm5hZG8gPSByb20ub2JqZWN0c1sweDEyXTtcbiAgICB0b3JuYWRvLnNwZWVkID0gMHgwNztcbiAgICB0b3JuYWRvLmRhdGFbMHgwY10gPSAweDYwOyAvLyBpbmNyZWFzZSBsaWZldGltZSAoNDgwKSBieSAyMCVcbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhDb2luU3ByaXRlcyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWzB4NjAsIDB4NjQsIDB4NjUsIDB4NjYsIDB4NjcsIDB4NjgsXG4gICAgICAgICAgICAgICAgICAgICAgMHg2OSwgMHg2YSwgMHg2YiwgMHg2YywgMHg2ZCwgMHg2Zl0pIHtcbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBbMCwgMSwgMl0pIHtcbiAgICAgIHJvbS5wYXR0ZXJuc1twYWdlIDw8IDYgfCBwYXRdLnBpeGVscyA9IHJvbS5wYXR0ZXJuc1sweDVlIDw8IDYgfCBwYXRdLnBpeGVscztcbiAgICB9XG4gIH1cbiAgcm9tLm9iamVjdHNbMHgwY10ubWV0YXNwcml0ZSA9IDB4YTk7XG59XG5cbi8qKlxuICogRml4IHRoZSBzb2Z0bG9jayB0aGF0IGhhcHBlbnMgd2hlbiB5b3UgZ28gdGhyb3VnaFxuICogYSB3YWxsIGJhY2t3YXJkcyBieSBtb3ZpbmcgdGhlIGV4aXQvZW50cmFuY2UgdGlsZXNcbiAqIHVwIGEgYml0IGFuZCBhZGp1c3Rpbmcgc29tZSB0aWxlRWZmZWN0cyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZpeFJldmVyc2VXYWxscyhyb206IFJvbSkge1xuICAvLyBhZGp1c3QgdGlsZSBlZmZlY3QgZm9yIGJhY2sgdGlsZXMgb2YgaXJvbiB3YWxsXG4gIGZvciAoY29uc3QgdCBpbiBbMHgwNCwgMHgwNSwgMHgwOCwgMHgwOV0pIHtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiYyAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGI1IC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gIH1cbiAgLy8gVE9ETyAtIG1vdmUgYWxsIHRoZSBlbnRyYW5jZXMgdG8geT0yMCBhbmQgZXhpdHMgdG8geXQ9MDFcbn1cblxuLyoqIE1ha2UgYSBsYW5kIGJyaWRnZSBpbiB1bmRlcmdyb3VuZCBjaGFubmVsICovXG5mdW5jdGlvbiB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbTogUm9tKSB7XG4gIGNvbnN0IHt0aWxlc30gPSByb20uc2NyZWVuc1sweGExXTtcbiAgdGlsZXNbMHgyOF0gPSAweDlmO1xuICB0aWxlc1sweDM3XSA9IDB4MjM7XG4gIHRpbGVzWzB4MzhdID0gMHgyMzsgLy8gMHg4ZTtcbiAgdGlsZXNbMHgzOV0gPSAweDIxO1xuICB0aWxlc1sweDQ3XSA9IDB4OGQ7XG4gIHRpbGVzWzB4NDhdID0gMHg4ZjtcbiAgdGlsZXNbMHg1Nl0gPSAweDk5O1xuICB0aWxlc1sweDU3XSA9IDB4OWE7XG4gIHRpbGVzWzB4NThdID0gMHg4Yztcbn1cblxuLyoqXG4gKiBSZW1vdmUgdGltZXIgc3Bhd25zLCByZW51bWJlcnMgbWltaWMgc3Bhd25zIHNvIHRoYXQgdGhleSdyZSB1bmlxdWUuXG4gKiBSdW5zIGJlZm9yZSBzaHVmZmxlIGJlY2F1c2Ugd2UgbmVlZCB0byBpZGVudGlmeSB0aGUgc2xvdC4gIFJlcXVpcmVzXG4gKiBhbiBhc3NlbWJseSBjaGFuZ2UgKCQzZDNmZCBpbiBwcmVzaHVmZmxlLnMpXG4gKi9cbmZ1bmN0aW9uIGZpeE1pbWljcyhyb206IFJvbSk6IHZvaWQge1xuICBsZXQgbWltaWMgPSAweDcwO1xuICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghcy5pc0NoZXN0KCkpIGNvbnRpbnVlO1xuICAgICAgcy50aW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKHMuaWQgPj0gMHg3MCkgcy5pZCA9IG1pbWljKys7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBmaW5kIGEgYmV0dGVyIHdheSB0byBidW5kbGUgYXNtIGNoYW5nZXM/XG4gIC8vIHJvbS5hc3NlbWJsZSgpXG4gIC8vICAgICAuJCgnYWRjICQxMCcpXG4gIC8vICAgICAuYmVxKCdsYWJlbCcpXG4gIC8vICAgICAubHNoKClcbiAgLy8gICAgIC5sc2goYCR7YWRkcn0seGApXG4gIC8vICAgICAubGFiZWwoJ2xhYmVsJyk7XG4gIC8vIHJvbS5wYXRjaCgpXG4gIC8vICAgICAub3JnKDB4M2QzZmQpXG4gIC8vICAgICAuYnl0ZSgweGIwKTtcbn1cblxuZnVuY3Rpb24gYWRqdXN0R29hRm9ydHJlc3NUcmlnZ2Vycyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gTW92ZSBLZWxiZXNxdWUgMiBvbmUgZnVsbCB0aWxlIGxlZnQuXG4gIGwuR29hRm9ydHJlc3NfS2VsYmVzcXVlLnNwYXduc1swXS54IC09IDE2O1xuICAvLyBSZW1vdmUgc2FnZSBzY3JlZW4gbG9ja3MgKGV4Y2VwdCBLZW5zdSkuXG4gIGwuR29hRm9ydHJlc3NfWmVidS5zcGF3bnMuc3BsaWNlKDEsIDEpOyAvLyB6ZWJ1IHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Ub3JuZWwuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gdG9ybmVsIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Bc2luYS5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyBhc2luYSBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfS2Vuc3Uuc3Bhd25zLnNwbGljZSgzLCAxKTsgLy8ga2Vuc3UgaHVtYW4gc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX0tlbnN1LnNwYXducy5zcGxpY2UoMSwgMSk7IC8vIGtlbnN1IHNsaW1lIHNjcmVlbiBsb2NrIHRyaWdnZXJcbn1cblxuZnVuY3Rpb24gYWxhcm1GbHV0ZUlzS2V5SXRlbShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgY29uc3Qge1dhdGVyZmFsbENhdmU0fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgLy8gTW92ZSBhbGFybSBmbHV0ZSB0byB0aGlyZCByb3dcbiAgcm9tLml0ZW1HZXRzWzB4MzFdLmludmVudG9yeVJvd1N0YXJ0ID0gMHgyMDtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBkcm9wcGVkXG4gIC8vIHJvbS5wcmdbMHgyMTAyMV0gPSAweDQzOyAvLyBUT0RPIC0gcm9tLml0ZW1zWzB4MzFdLj8/P1xuICByb20uaXRlbXNbMHgzMV0udW5pcXVlID0gdHJ1ZTtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBzb2xkXG4gIHJvbS5pdGVtc1sweDMxXS5iYXNlUHJpY2UgPSAwO1xuXG4gIGlmIChmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gUGVyc29uIDE0IChaZWJ1J3Mgc3R1ZGVudCk6IHNlY29uZGFyeSBpdGVtIC0+IGFsYXJtIGZsdXRlXG4gICAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4MzE7IC8vIE5PVEU6IENsb2JiZXJzIHNodWZmbGVkIGl0ZW0hISFcbiAgfVxuXG4gIC8vIFJlbW92ZSBhbGFybSBmbHV0ZSBmcm9tIHNob3BzIChyZXBsYWNlIHdpdGggb3RoZXIgaXRlbXMpXG4gIC8vIE5PVEUgLSB3ZSBjb3VsZCBzaW1wbGlmeSB0aGlzIHdob2xlIHRoaW5nIGJ5IGp1c3QgaGFyZGNvZGluZyBpbmRpY2VzLlxuICAvLyAgICAgIC0gaWYgdGhpcyBpcyBndWFyYW50ZWVkIHRvIGhhcHBlbiBlYXJseSwgaXQncyBhbGwgdGhlIHNhbWUuXG4gIGNvbnN0IHJlcGxhY2VtZW50cyA9IFtcbiAgICBbMHgyMSwgMC43Ml0sIC8vIGZydWl0IG9mIHBvd2VyLCA3MiUgb2YgY29zdFxuICAgIFsweDFmLCAwLjldLCAvLyBseXNpcyBwbGFudCwgOTAlIG9mIGNvc3RcbiAgXTtcbiAgbGV0IGogPSAwO1xuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AuY29udGVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldICE9PSAweDMxKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtpdGVtLCBwcmljZVJhdGlvXSA9IHJlcGxhY2VtZW50c1soaisrKSAlIHJlcGxhY2VtZW50cy5sZW5ndGhdO1xuICAgICAgc2hvcC5jb250ZW50c1tpXSA9IGl0ZW07XG4gICAgICBpZiAocm9tLnNob3BEYXRhVGFibGVzQWRkcmVzcykge1xuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIGJyb2tlbiAtIG5lZWQgYSBjb250cm9sbGVkIHdheSB0byBjb252ZXJ0IHByaWNlIGZvcm1hdHNcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSBNYXRoLnJvdW5kKHNob3AucHJpY2VzW2ldICogcHJpY2VSYXRpbyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hhbmdlIGZsdXRlIG9mIGxpbWUgY2hlc3QncyAobm93LXVudXNlZCkgaXRlbWdldCB0byBoYXZlIG1lZGljYWwgaGVyYlxuICByb20uaXRlbUdldHNbMHg1Yl0uaXRlbUlkID0gMHgxZDtcbiAgLy8gQ2hhbmdlIHRoZSBhY3R1YWwgc3Bhd24gZm9yIHRoYXQgY2hlc3QgdG8gYmUgdGhlIG1pcnJvcmVkIHNoaWVsZCBjaGVzdFxuICBXYXRlcmZhbGxDYXZlNC5zcGF3bigweDE5KS5pZCA9IDB4MTA7XG5cbiAgLy8gVE9ETyAtIHJlcXVpcmUgbmV3IGNvZGUgZm9yIHR3byB1c2VzXG59XG5cbmZ1bmN0aW9uIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgYnJva2FoYW5hID0gcm9tLm5wY3NbMHg1NF07XG4gIGNvbnN0IGRpYWxvZyA9IGFzc2VydChicm9rYWhhbmEubG9jYWxEaWFsb2dzLmdldCgtMSkpWzBdO1xuICBpZiAoZGlhbG9nLmNvbmRpdGlvbiAhPT0gfjB4MDI0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgYnJva2FoYW5hIGNvbmRpdGlvbjogJHtkaWFsb2cuY29uZGl0aW9ufWApO1xuICB9XG4gIGRpYWxvZy5jb25kaXRpb24gPSB+MHgwNjc7IC8vIHZhbmlsbGEgYmFsbCBvZiB0aHVuZGVyIC8gZGVmZWF0ZWQgbWFkbyAxXG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vcm1hbGx5IHRoZSBmaXNoZXJtYW4gKCQ2NCkgc3Bhd25zIGluIGhpcyBob3VzZSAoJGQ2KSBpZiB5b3UgaGF2ZVxuICAvLyB0aGUgc2hlbGwgZmx1dGUgKDIzNikuICBIZXJlIHdlIGFsc28gYWRkIGEgcmVxdWlyZW1lbnQgb24gdGhlIGhlYWxlZFxuICAvLyBkb2xwaGluIHNsb3QgKDAyNSksIHdoaWNoIHdlIGtlZXAgYXJvdW5kIHNpbmNlIGl0J3MgYWN0dWFsbHkgdXNlZnVsLlxuICByb20ubnBjc1sweDY0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZDYsIFsweDIzNiwgMHgwMjVdKTtcbiAgLy8gQWxzbyBmaXggZGF1Z2h0ZXIncyBkaWFsb2cgKCQ3YikuXG4gIGNvbnN0IGRhdWdodGVyRGlhbG9nID0gcm9tLm5wY3NbMHg3Yl0ubG9jYWxEaWFsb2dzLmdldCgtMSkhO1xuICBkYXVnaHRlckRpYWxvZy51bnNoaWZ0KGRhdWdodGVyRGlhbG9nWzBdLmNsb25lKCkpO1xuICBkYXVnaHRlckRpYWxvZ1swXS5jb25kaXRpb24gPSB+MHgwMjU7XG4gIGRhdWdodGVyRGlhbG9nWzFdLmNvbmRpdGlvbiA9IH4weDIzNjtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3QgaGF2aW5nIHRlbGVwYXRoeSAoMjQzKSB3aWxsIHRyaWdnZXIgYSBcImt5dSBreXVcIiAoMWE6MTIsIDFhOjEzKSBmb3JcbiAgLy8gYm90aCBnZW5lcmljIGJ1bm5pZXMgKDU5KSBhbmQgZGVvICg1YSkuXG4gIHJvbS5ucGNzWzB4NTldLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxMl0pKTtcbiAgcm9tLm5wY3NbMHg1YV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEzXSkpO1xufVxuXG5mdW5jdGlvbiB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIGl0ZW1nZXQgMDMgc3dvcmQgb2YgdGh1bmRlciA9PiBzZXQgMmZkIHNoeXJvbiB3YXJwIHBvaW50XG4gIHJvbS5pdGVtR2V0c1sweDAzXS5mbGFncy5wdXNoKDB4MmZkKTtcbiAgLy8gZGlhbG9nIDYyIGFzaW5hIGluIGYyL2Y0IHNoeXJvbiAtPiBhY3Rpb24gMWYgKHRlbGVwb3J0IHRvIHN0YXJ0KVxuICAvLyAgIC0gbm90ZTogZjIgYW5kIGY0IGRpYWxvZ3MgYXJlIGxpbmtlZC5cbiAgZm9yIChjb25zdCBpIG9mIFswLCAxLCAzXSkge1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFsweGYyLCAweGY0XSkge1xuICAgICAgcm9tLm5wY3NbMHg2Ml0ubG9jYWxEaWFsb2dzLmdldChsb2MpIVtpXS5tZXNzYWdlLmFjdGlvbiA9IDB4MWY7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBDaGFuZ2Ugc3dvcmQgb2YgdGh1bmRlcidzIGFjdGlvbiB0byBiYmUgdGhlIHNhbWUgYXMgb3RoZXIgc3dvcmRzICgxNilcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmFjcXVpc2l0aW9uQWN0aW9uLmFjdGlvbiA9IDB4MTY7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEl0ZW1OYW1lcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgaWYgKGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgLy8gcmVuYW1lIGxlYXRoZXIgYm9vdHMgdG8gc3BlZWQgYm9vdHNcbiAgICBjb25zdCBsZWF0aGVyQm9vdHMgPSByb20uaXRlbXNbMHgyZl0hO1xuICAgIGxlYXRoZXJCb290cy5tZW51TmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgbGVhdGhlckJvb3RzLm1lc3NhZ2VOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBpZiAoZmxhZ3MuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpKSB7XG4gICAgICBjb25zdCBnYXNNYXNrID0gcm9tLml0ZW1zWzB4MjldO1xuICAgICAgZ2FzTWFzay5tZW51TmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgICBnYXNNYXNrLm1lc3NhZ2VOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICB9XG4gIH1cblxuICAvLyByZW5hbWUgYmFsbHMgdG8gb3Jic1xuICBmb3IgKGxldCBpID0gMHgwNTsgaSA8IDB4MGM7IGkgKz0gMikge1xuICAgIHJvbS5pdGVtc1tpXS5tZW51TmFtZSA9IHJvbS5pdGVtc1tpXS5tZW51TmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICAgIHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZSA9IHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VCcmFjZWxldHNQcm9ncmVzc2l2ZShyb206IFJvbSk6IHZvaWQge1xuICAvLyB0b3JuZWwncyB0cmlnZ2VyIG5lZWRzIGJvdGggaXRlbXNcbiAgY29uc3QgdG9ybmVsID0gcm9tLm5wY3NbMHg1Zl07XG4gIGNvbnN0IHZhbmlsbGEgPSB0b3JuZWwubG9jYWxEaWFsb2dzLmdldCgweDIxKSE7XG4gIGNvbnN0IHBhdGNoZWQgPSBbXG4gICAgdmFuaWxsYVswXSwgLy8gYWxyZWFkeSBsZWFybmVkIHRlbGVwb3J0XG4gICAgdmFuaWxsYVsyXSwgLy8gZG9uJ3QgaGF2ZSB0b3JuYWRvIGJyYWNlbGV0XG4gICAgdmFuaWxsYVsyXS5jbG9uZSgpLCAvLyB3aWxsIGNoYW5nZSB0byBkb24ndCBoYXZlIG9yYlxuICAgIHZhbmlsbGFbMV0sIC8vIGhhdmUgYnJhY2VsZXQsIGxlYXJuIHRlbGVwb3J0XG4gIF07XG4gIHBhdGNoZWRbMV0uY29uZGl0aW9uID0gfjB4MjA2OyAvLyBkb24ndCBoYXZlIGJyYWNlbGV0XG4gIHBhdGNoZWRbMl0uY29uZGl0aW9uID0gfjB4MjA1OyAvLyBkb24ndCBoYXZlIG9yYlxuICBwYXRjaGVkWzNdLmNvbmRpdGlvbiA9IH4wOyAgICAgLy8gZGVmYXVsdFxuICB0b3JuZWwubG9jYWxEaWFsb2dzLnNldCgweDIxLCBwYXRjaGVkKTtcbn1cblxuZnVuY3Rpb24gc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBbcm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLktpcmlzYU1lYWRvd10pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gc2V0IHRoZSBuZXcgXCJpbnZpc2libGVcIiBmbGFnIG9uIHRoZSBjaGVzdC5cbiAgICAgIGlmIChzcGF3bi5pc0NoZXN0KCkpIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICB9XG4gIH1cbn1cblxuLy8gQWRkIHRoZSBzdGF0dWUgb2Ygb255eCBhbmQgcG9zc2libHkgdGhlIHRlbGVwb3J0IGJsb2NrIHRyaWdnZXIgdG8gQ29yZGVsIFdlc3RcbmZ1bmN0aW9uIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgY29uc3Qge0NvcmRlbFBsYWluRWFzdCwgQ29yZGVsUGxhaW5XZXN0fSA9IHJvbS5sb2NhdGlvbnM7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2YgQ29yZGVsUGxhaW5FYXN0LnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc0NoZXN0KCkgfHwgKGZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJiBzcGF3bi5pc1RyaWdnZXIoKSkpIHtcbiAgICAgIC8vIENvcHkgaWYgKDEpIGl0J3MgdGhlIGNoZXN0LCBvciAoMikgd2UncmUgZGlzYWJsaW5nIHRlbGVwb3J0IHNraXBcbiAgICAgIENvcmRlbFBsYWluV2VzdC5zcGF3bnMucHVzaChzcGF3bi5jbG9uZSgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZml4UmFiYml0U2tpcChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX01haW4uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDg2KSB7XG4gICAgICBpZiAoc3Bhd24ueCA9PT0gMHg3NDApIHtcbiAgICAgICAgc3Bhd24ueCArPSAxNjtcbiAgICAgICAgc3Bhd24ueSArPSAxNjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkVG93ZXJFeGl0KHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtUb3dlckVudHJhbmNlLCBDcnlwdF9UZWxlcG9ydGVyfSA9IHJvbS5sb2NhdGlvbnM7XG4gIGNvbnN0IGVudHJhbmNlID0gQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMubGVuZ3RoO1xuICBjb25zdCBkZXN0ID0gQ3J5cHRfVGVsZXBvcnRlci5pZDtcbiAgQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7dGlsZTogMHg2OH0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTcsIGRlc3QsIGVudHJhbmNlfSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1OCwgZGVzdCwgZW50cmFuY2V9KSk7XG59XG5cbi8vIFByb2dyYW1tYXRpY2FsbHkgYWRkIGEgaG9sZSBiZXR3ZWVuIHZhbGxleSBvZiB3aW5kIGFuZCBsaW1lIHRyZWUgdmFsbGV5XG5mdW5jdGlvbiBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXl9ID0gcm9tLmxvY2F0aW9ucztcblxuICBWYWxsZXlPZldpbmQuc2NyZWVuc1s1XVs0XSA9IDB4MTA7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMV1bMF0gPSAweDFhOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzJdWzBdID0gMHgwYzsgLy8gbmljZXIgbW91bnRhaW5zXG5cbiAgY29uc3Qgd2luZEVudHJhbmNlID1cbiAgICAgIFZhbGxleU9mV2luZC5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHg0ZWYsIHk6IDB4NTc4fSkpIC0gMTtcbiAgY29uc3QgbGltZUVudHJhbmNlID1cbiAgICAgIExpbWVUcmVlVmFsbGV5LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDAxMCwgeTogMHgxYzB9KSkgLSAxO1xuXG4gIFZhbGxleU9mV2luZC5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTYwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NzAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSk7XG4gIExpbWVUcmVlVmFsbGV5LmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYjAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFjMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pKTtcbn1cblxuZnVuY3Rpb24gY2xvc2VDYXZlRW50cmFuY2VzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBQcmV2ZW50IHNvZnRsb2NrIGZyb20gZXhpdGluZyBzZWFsZWQgY2F2ZSBiZWZvcmUgd2luZG1pbGwgc3RhcnRlZFxuICByb20ubG9jYXRpb25zLlZhbGxleU9mV2luZC5lbnRyYW5jZXNbMV0ueSArPSAxNjtcblxuICAvLyBDbGVhciB0aWxlcyAxLDIsMyw0IGZvciBibG9ja2FibGUgY2F2ZXMgaW4gdGlsZXNldHMgOTAsIDk0LCBhbmQgOWNcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTBdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwNywgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDBlLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjAsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5NCwgMHg5Y10sXG4gICAgICAgICAgICAgICAgICAgIFsweDY4LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODMsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDg5LCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG5cbiAgLy8gTm93IHJlcGxhY2UgdGhlIHRpbGVzIHdpdGggdGhlIGJsb2NrYWJsZSBvbmVzXG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDc5XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4N2FdID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4OV0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDhhXSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NThdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTZdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1N10gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY2XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjddID0gMHgwNDtcblxuICAvLyBEZXN0cnVjdHVyZSBvdXQgYSBmZXcgbG9jYXRpb25zIGJ5IG5hbWVcbiAgY29uc3Qge1xuICAgIFZhbGxleU9mV2luZCxcbiAgICBDb3JkZWxQbGFpbldlc3QsXG4gICAgQ29yZGVsUGxhaW5FYXN0LFxuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLFxuICAgIFdhdGVyZmFsbFZhbGxleVNvdXRoLFxuICAgIEtpcmlzYU1lYWRvdyxcbiAgICBTYWhhcmFPdXRzaWRlQ2F2ZSxcbiAgICBEZXNlcnQyLFxuICB9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBOT1RFOiBmbGFnIDJmMCBpcyBBTFdBWVMgc2V0IC0gdXNlIGl0IGFzIGEgYmFzZWxpbmUuXG4gIGNvbnN0IGZsYWdzVG9DbGVhcjogW0xvY2F0aW9uLCBudW1iZXJdW10gPSBbXG4gICAgW1ZhbGxleU9mV2luZCwgMHgzMF0sIC8vIHZhbGxleSBvZiB3aW5kLCB6ZWJ1J3MgY2F2ZVxuICAgIFtDb3JkZWxQbGFpbldlc3QsIDB4MzBdLCAvLyBjb3JkZWwgd2VzdCwgdmFtcGlyZSBjYXZlXG4gICAgW0NvcmRlbFBsYWluRWFzdCwgMHgzMF0sIC8vIGNvcmRlbCBlYXN0LCB2YW1waXJlIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDBdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIHByaXNvbiBjYXZlXG4gICAgW1dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDE0XSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBmb2cgbGFtcFxuICAgIFtXYXRlcmZhbGxWYWxsZXlTb3V0aCwgMHg3NF0sIC8vIHdhdGVyZmFsbCBzb3V0aCwga2lyaXNhXG4gICAgW0tpcmlzYU1lYWRvdywgMHgxMF0sIC8vIGtpcmlzYSBtZWFkb3dcbiAgICBbU2FoYXJhT3V0c2lkZUNhdmUsIDB4MDBdLCAvLyBjYXZlIHRvIGRlc2VydFxuICAgIFtEZXNlcnQyLCAweDQxXSxcbiAgXTtcbiAgaWYgKGZsYWdzLmFkZEVhc3RDYXZlKCkgJiYgZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIHtcbiAgICBmbGFnc1RvQ2xlYXIucHVzaChbcm9tLmxvY2F0aW9ucy5MaW1lVHJlZVZhbGxleSwgMHgxMF0pO1xuICB9XG4gIGZvciAoY29uc3QgW2xvYywgeXhdIG9mIGZsYWdzVG9DbGVhcikge1xuICAgIGxvYy5mbGFncy5wdXNoKEZsYWcub2Yoe3l4LCBmbGFnOiAweDJmMH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2VGbGFnKGxvYzogTG9jYXRpb24sIHl4OiBudW1iZXIsIGZsYWc6IG51bWJlcik6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZiBvZiBsb2MuZmxhZ3MpIHtcbiAgICAgIGlmIChmLnl4ID09PSB5eCkge1xuICAgICAgICBmLmZsYWcgPSBmbGFnO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZmxhZyB0byByZXBsYWNlIGF0ICR7bG9jfToke3l4fWApO1xuICB9O1xuXG4gIGlmIChmbGFncy5wYXJhbHlzaXNSZXF1aXJlc1ByaXNvbktleSgpKSB7IC8vIGNsb3NlIG9mZiByZXZlcnNlIGVudHJhbmNlc1xuICAgIC8vIE5PVEU6IHdlIGNvdWxkIGFsc28gY2xvc2UgaXQgb2ZmIHVudGlsIGJvc3Mga2lsbGVkLi4uP1xuICAgIC8vICAtIGNvbnN0IHZhbXBpcmVGbGFnID0gfnJvbS5ucGNTcGF3bnNbMHhjMF0uY29uZGl0aW9uc1sweDBhXVswXTtcbiAgICAvLyAgLT4ga2VsYmVzcXVlIGZvciB0aGUgb3RoZXIgb25lLlxuICAgIGNvbnN0IHdpbmRtaWxsRmxhZyA9IDB4MmVlO1xuICAgIHJlcGxhY2VGbGFnKENvcmRlbFBsYWluV2VzdCwgMHgzMCwgd2luZG1pbGxGbGFnKTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbkVhc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG5cbiAgICByZXBsYWNlRmxhZyhXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMCwgMHgyZDgpOyAvLyBrZXkgdG8gcHJpc29uIGZsYWdcbiAgICBjb25zdCBleHBsb3Npb24gPSBTcGF3bi5vZih7eTogMHgwNjAsIHg6IDB4MDYwLCB0eXBlOiA0LCBpZDogMHgyY30pO1xuICAgIGNvbnN0IGtleVRyaWdnZXIgPSBTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MDcwLCB0eXBlOiAyLCBpZDogMHhhZH0pO1xuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5zcGxpY2UoMSwgMCwgZXhwbG9zaW9uKTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMucHVzaChrZXlUcmlnZ2VyKTtcbiAgfVxuXG4gIC8vIHJvbS5sb2NhdGlvbnNbMHgxNF0udGlsZUVmZmVjdHMgPSAweGIzO1xuXG4gIC8vIGQ3IGZvciAzP1xuXG4gIC8vIFRPRE8gLSB0aGlzIGVuZGVkIHVwIHdpdGggbWVzc2FnZSAwMDowMyBhbmQgYW4gYWN0aW9uIHRoYXQgZ2F2ZSBib3cgb2YgbW9vbiFcblxuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5wYXJ0ID0gMHgxYjtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UuaW5kZXggPSAweDA4O1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0uZmxhZ3MucHVzaCgweDJmNiwgMHgyZjcsIDB4MmY4KTtcbn1cblxuLy8gQHRzLWlnbm9yZTogbm90IHlldCB1c2VkXG5mdW5jdGlvbiBlYXN0Q2F2ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gVE9ETyBmaWxsIHVwIGdyYXBoaWNzLCBldGMgLS0+ICQxYSwgJDFiLCAkMDUgLyAkODgsICRiNSAvICQxNCwgJDAyXG4gIC8vIFRoaW5rIGFvYnV0IGV4aXRzIGFuZCBlbnRyYW5jZXMuLi4/XG5cbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXksIFNlYWxlZENhdmUxfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgY29uc3QgbG9jMSA9IHJvbS5sb2NhdGlvbnMuYWxsb2NhdGUocm9tLmxvY2F0aW9ucy5FYXN0Q2F2ZTEpO1xuICBjb25zdCBsb2MyID0gcm9tLmxvY2F0aW9ucy5hbGxvY2F0ZShyb20ubG9jYXRpb25zLkVhc3RDYXZlMik7XG5cbiAgLy8gTk9URTogMHg5YyBjYW4gYmVjb21lIDB4OTkgaW4gdG9wIGxlZnQgb3IgMHg5NyBpbiB0b3AgcmlnaHQgb3IgYm90dG9tIG1pZGRsZSBmb3IgYSBjYXZlIGV4aXRcbiAgbG9jMS5zY3JlZW5zID0gW1sweDljLCAweDg0LCAweDgwLCAweDgzLCAweDljXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgzLCAweDg2LCAweDgwXSxcbiAgICAgICAgICAgICAgICAgIFsweDgzLCAweDg4LCAweDg5LCAweDgwLCAweDgwXSxcbiAgICAgICAgICAgICAgICAgIFsweDgxLCAweDhjLCAweDg1LCAweDgyLCAweDg0XSxcbiAgICAgICAgICAgICAgICAgIFsweDllLCAweDg1LCAweDljLCAweDk4LCAweDg2XV07XG5cbiAgbG9jMi5zY3JlZW5zID0gW1sweDljLCAweDg0LCAweDliLCAweDgwLCAweDliXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgxLCAweDgwLCAweDgxXSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDg3LCAweDhiLCAweDhhLCAweDg2XSxcbiAgICAgICAgICAgICAgICAgIFsweDgwLCAweDhjLCAweDgwLCAweDg1LCAweDg0XSxcbiAgICAgICAgICAgICAgICAgIFsweDljLCAweDg2LCAweDgwLCAweDgwLCAweDlhXV07XG5cbiAgZm9yIChjb25zdCBsIG9mIFtsb2MxLCBsb2MyXSkge1xuICAgIGwuYmdtID0gMHgxNzsgLy8gbXQgc2FicmUgY2F2ZSBtdXNpYz9cbiAgICBsLmVudHJhbmNlcyA9IFtdO1xuICAgIGwuZXhpdHMgPSBbXTtcbiAgICBsLnBpdHMgPSBbXTtcbiAgICBsLnNwYXducyA9IFtdO1xuICAgIGwuZmxhZ3MgPSBbXTtcbiAgICBsLmhlaWdodCA9IGwuc2NyZWVucy5sZW5ndGg7XG4gICAgbC53aWR0aCA9IGwuc2NyZWVuc1swXS5sZW5ndGg7XG4gICAgbC5leHRlbmRlZCA9IDA7XG4gICAgbC50aWxlUGFsZXR0ZXMgPSBbMHgxYSwgMHgxYiwgMHgwNV07XG4gICAgbC50aWxlc2V0ID0gMHg4ODtcbiAgICBsLnRpbGVFZmZlY3RzID0gMHhiNTtcbiAgICBsLnRpbGVQYXR0ZXJucyA9IFsweDE0LCAweDAyXTtcbiAgICBsLnNwcml0ZVBhdHRlcm5zID0gWy4uLlNlYWxlZENhdmUxLnNwcml0ZVBhdHRlcm5zXSBhcyBbbnVtYmVyLCBudW1iZXJdO1xuICAgIGwuc3ByaXRlUGFsZXR0ZXMgPSBbLi4uU2VhbGVkQ2F2ZTEuc3ByaXRlUGFsZXR0ZXNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gIH1cblxuICAvLyBBZGQgZW50cmFuY2UgdG8gdmFsbGV5IG9mIHdpbmRcbiAgLy8gVE9ETyAtIG1heWJlIGp1c3QgZG8gKDB4MzMsIFtbMHgxOV1dKSBvbmNlIHdlIGZpeCB0aGF0IHNjcmVlbiBmb3IgZ3Jhc3NcbiAgVmFsbGV5T2ZXaW5kLndyaXRlU2NyZWVuczJkKDB4MjMsIFtcbiAgICBbMHgxMSwgMHgwZF0sXG4gICAgWzB4MDksIDB4YzJdXSk7XG4gIHJvbS50aWxlRWZmZWN0c1swXS5lZmZlY3RzWzB4YzBdID0gMDtcbiAgLy8gVE9ETyAtIGRvIHRoaXMgb25jZSB3ZSBmaXggdGhlIHNlYSB0aWxlc2V0XG4gIC8vIHJvbS5zY3JlZW5zWzB4YzJdLnRpbGVzWzB4NWFdID0gMHgwYTtcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1Yl0gPSAweDBhO1xuXG4gIC8vIENvbm5lY3QgbWFwc1xuICBsb2MxLmNvbm5lY3QoMHg0MywgbG9jMiwgMHg0NCk7XG4gIGxvYzEuY29ubmVjdCgweDQwLCBWYWxsZXlPZldpbmQsIDB4MzQpO1xuXG4gIGlmIChmbGFncy5jb25uZWN0TGltZVRyZWVUb0xlYWYoKSkge1xuICAgIC8vIEFkZCBlbnRyYW5jZSB0byBsaW1lIHRyZWUgdmFsbGV5XG4gICAgTGltZVRyZWVWYWxsZXkucmVzaXplU2NyZWVucygwLCAxLCAwLCAwKTsgLy8gYWRkIG9uZSBzY3JlZW4gdG8gbGVmdCBlZGdlXG4gICAgTGltZVRyZWVWYWxsZXkud3JpdGVTY3JlZW5zMmQoMHgwMCwgW1xuICAgICAgWzB4MGMsIDB4MTFdLFxuICAgICAgWzB4MTUsIDB4MzZdLFxuICAgICAgWzB4MGUsIDB4MGZdXSk7XG4gICAgbG9jMS5zY3JlZW5zWzBdWzRdID0gMHg5NzsgLy8gZG93biBzdGFpclxuICAgIGxvYzEuY29ubmVjdCgweDA0LCBMaW1lVHJlZVZhbGxleSwgMHgxMCk7XG4gIH1cblxuICAvLyBBZGQgbW9uc3RlcnNcbiAgbG9jMS5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDIxLCB0aWxlOiAweDg3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4ODgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTMsIHRpbGU6IDB4ODksIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMiwgdGlsZTogMHg2OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MDMsIHRpbGU6IDB4ODgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGxvYzIuc3Bhd25zLnB1c2goXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDExLCB0aWxlOiAweDQ4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDEyLCB0aWxlOiAweDc3LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTQsIHRpbGU6IDB4MjgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjMsIHRpbGU6IDB4ODUsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgzMSwgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMzLCB0aWxlOiAweDhhLCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDM0LCB0aWxlOiAweDk4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4NDEsIHRpbGU6IDB4ODIsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICk7XG4gIGlmICghZmxhZ3MuemVidVN0dWRlbnRHaXZlc0l0ZW0oKSkge1xuICAgIC8vIGNoZXN0OiBhbGFybSBmbHV0ZVxuICAgIGxvYzIuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3k6IDB4MTEwLCB4OiAweDQ3OCwgdHlwZTogMiwgaWQ6IDB4MzF9KSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGFkZFpvbWJpZVdhcnAocm9tOiBSb20pIHtcbiAgLy8gTWFrZSBzcGFjZSBmb3IgdGhlIG5ldyBmbGFnIGJldHdlZW4gSm9lbCBhbmQgU3dhblxuICBmb3IgKGxldCBpID0gMHgyZjU7IGkgPCAweDJmYzsgaSsrKSB7XG4gICAgcm9tLm1vdmVGbGFnKGksIGkgLSAxKTtcbiAgfVxuICAvLyBVcGRhdGUgdGhlIG1lbnVcbiAgY29uc3QgbWVzc2FnZSA9IHJvbS5tZXNzYWdlcy5wYXJ0c1sweDIxXVswXTtcbiAgbWVzc2FnZS50ZXh0ID0gW1xuICAgICcgezFhOkxlYWZ9ICAgICAgezE2OkJyeW5tYWVyfSB7MWQ6T2FrfSAnLFxuICAgICd7MGM6TmFkYXJlfVxcJ3MgIHsxZTpQb3J0b2F9ICAgezE0OkFtYXpvbmVzfSAnLFxuICAgICd7MTk6Sm9lbH0gICAgICBab21iaWUgICB7MjA6U3dhbn0gJyxcbiAgICAnezIzOlNoeXJvbn0gICAgezE4OkdvYX0gICAgICB7MjE6U2FoYXJhfScsXG4gIF0uam9pbignXFxuJyk7XG4gIC8vIEFkZCBhIHRyaWdnZXIgdG8gdGhlIGVudHJhbmNlIC0gdGhlcmUncyBhbHJlYWR5IGEgc3Bhd24gZm9yIDhhXG4gIC8vIGJ1dCB3ZSBjYW4ndCByZXVzZSB0aGF0IHNpbmNlIGl0J3MgdGhlIHNhbWUgYXMgdGhlIG9uZSBvdXRzaWRlXG4gIC8vIHRoZSBtYWluIEVTSSBlbnRyYW5jZTsgc28gcmV1c2UgYSBkaWZmZXJlbnQgb25lLlxuICBjb25zdCB0cmlnZ2VyID0gcm9tLm5leHRGcmVlVHJpZ2dlcigpO1xuICB0cmlnZ2VyLnVzZWQgPSB0cnVlO1xuICB0cmlnZ2VyLmNvbmRpdGlvbnMgPSBbXTtcbiAgdHJpZ2dlci5tZXNzYWdlID0gTWVzc2FnZUlkLm9mKHt9KTtcbiAgdHJpZ2dlci5mbGFncyA9IFsweDJmYl07IC8vIG5ldyB3YXJwIHBvaW50IGZsYWdcbiAgLy8gQWN0dWFsbHkgcmVwbGFjZSB0aGUgdHJpZ2dlci5cbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhhKSB7XG4gICAgICBzcGF3bi5pZCA9IHRyaWdnZXIuaWQ7XG4gICAgfSAgICBcbiAgfVxuICAvLyBJbnNlcnQgaW50byB0aGUgd2FycCB0YWJsZS5cbiAgZm9yIChsZXQgaSA9IDB4M2RjNjI7IGkgPj0gMHgzZGM1ZjsgaS0tKSB7XG4gICAgcm9tLnByZ1tpICsgMV0gPSByb20ucHJnW2ldO1xuICB9XG4gIHJvbS5wcmdbMHgzZGM1Zl0gPSByb20ubG9jYXRpb25zLlpvbWJpZVRvd24uaWQ7XG4gIC8vIEFTTSBmaXhlcyBzaG91bGQgaGF2ZSBoYXBwZW5lZCBpbiBwcmVzaHVmZmxlLnNcbn1cblxuZnVuY3Rpb24gZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb206IFJvbSkge1xuICByb20udHJpZ2dlcigweDhhKS5jb25kaXRpb25zID0gW34weDBlZV07IC8vIG5ldyBmbGFnIGZvciByaWRpbmcgZG9scGhpblxuICByb20ubWVzc2FnZXMucGFydHNbMHgxZF1bMHgxMF0udGV4dCA9IGBUaGUgY2F2ZSBlbnRyYW5jZSBhcHBlYXJzXG50byBiZSB1bmRlcndhdGVyLiBZb3UnbGxcbm5lZWQgdG8gc3dpbS5gO1xufVxuXG5mdW5jdGlvbiByZXZlcnNpYmxlU3dhbkdhdGUocm9tOiBSb20pIHtcbiAgLy8gQWxsb3cgb3BlbmluZyBTd2FuIGZyb20gZWl0aGVyIHNpZGUgYnkgYWRkaW5nIGEgcGFpciBvZiBndWFyZHMgb24gdGhlXG4gIC8vIG9wcG9zaXRlIHNpZGUgb2YgdGhlIGdhdGUuXG4gIHJvbS5sb2NhdGlvbnNbMHg3M10uc3Bhd25zLnB1c2goXG4gICAgLy8gTk9URTogU29sZGllcnMgbXVzdCBjb21lIGluIHBhaXJzICh3aXRoIGluZGV4IF4xIGZyb20gZWFjaCBvdGhlcilcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGEsIHl0OiAweDAyLCB0eXBlOiAxLCBpZDogMHgyZH0pLCAvLyBuZXcgc29sZGllclxuICAgIFNwYXduLm9mKHt4dDogMHgwYiwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBlLCB5dDogMHgwYSwgdHlwZTogMiwgaWQ6IDB4YjN9KSwgLy8gbmV3IHRyaWdnZXI6IGVyYXNlIGd1YXJkc1xuICApO1xuXG4gIC8vIEd1YXJkcyAoJDJkKSBhdCBzd2FuIGdhdGUgKCQ3MykgfiBzZXQgMTBkIGFmdGVyIG9wZW5pbmcgZ2F0ZSA9PiBjb25kaXRpb24gZm9yIGRlc3Bhd25cbiAgcm9tLm5wY3NbMHgyZF0ubG9jYWxEaWFsb2dzLmdldCgweDczKSFbMF0uZmxhZ3MucHVzaCgweDEwZCk7XG5cbiAgLy8gRGVzcGF3biBndWFyZCB0cmlnZ2VyIHJlcXVpcmVzIDEwZFxuICByb20udHJpZ2dlcigweGIzKS5jb25kaXRpb25zLnB1c2goMHgxMGQpO1xufVxuXG5mdW5jdGlvbiBsZWFmRWxkZXJJblNhYnJlSGVhbHMocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgbGVhZkVsZGVyID0gcm9tLm5wY3NbMHgwZF07XG4gIGNvbnN0IHN1bW1pdERpYWxvZyA9IGxlYWZFbGRlci5sb2NhbERpYWxvZ3MuZ2V0KDB4MzUpIVswXTtcbiAgc3VtbWl0RGlhbG9nLm1lc3NhZ2UuYWN0aW9uID0gMHgxNzsgLy8gaGVhbCBhbmQgZGlzYXBwZWFyLlxufVxuXG5mdW5jdGlvbiBwcmV2ZW50TnBjRGVzcGF3bnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KTogdm9pZCB7XG4gIGZ1bmN0aW9uIHJlbW92ZTxUPihhcnI6IFRbXSwgZWxlbTogVCk6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gYXJyLmluZGV4T2YoZWxlbSk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50ICR7ZWxlbX0gaW4gJHthcnJ9YCk7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlSWY8VD4oYXJyOiBUW10sIHByZWQ6IChlbGVtOiBUKSA9PiBib29sZWFuKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuZmluZEluZGV4KHByZWQpO1xuICAgIGlmIChpbmRleCA8IDApIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgZWxlbWVudCBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRpYWxvZyhpZDogbnVtYmVyLCBsb2M6IG51bWJlciA9IC0xKTogTG9jYWxEaWFsb2dbXSB7XG4gICAgY29uc3QgcmVzdWx0ID0gcm9tLm5wY3NbaWRdLmxvY2FsRGlhbG9ncy5nZXQobG9jKTtcbiAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGRpYWxvZyAkJHtoZXgoaWQpfSBhdCAkJHtoZXgobG9jKX1gKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIHNwYXducyhpZDogbnVtYmVyLCBsb2M6IG51bWJlcik6IG51bWJlcltdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0uc3Bhd25Db25kaXRpb25zLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcgc3Bhd24gY29uZGl0aW9uICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBMaW5rIHNvbWUgcmVkdW5kYW50IE5QQ3M6IEtlbnN1ICg3ZSwgNzQpIGFuZCBBa2FoYW5hICg4OCwgMTYpXG4gIHJvbS5ucGNzWzB4NzRdLmxpbmsoMHg3ZSk7XG4gIHJvbS5ucGNzWzB4NzRdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDc0XS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4N2VdLmRhdGFdIGFzIGFueTtcbiAgcm9tLmxvY2F0aW9ucy5Td2FuX0RhbmNlSGFsbC5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDdlKSEuaWQgPSAweDc0O1xuICByb20uaXRlbXNbMHgzYl0udHJhZGVJbiFbMF0gPSAweDc0O1xuXG4gIC8vIGRpYWxvZyBpcyBzaGFyZWQgYmV0d2VlbiA4OCBhbmQgMTYuXG4gIHJvbS5ucGNzWzB4ODhdLmxpbmtEaWFsb2coMHgxNik7XG5cbiAgLy8gTWFrZSBhIG5ldyBOUEMgZm9yIEFrYWhhbmEgaW4gQnJ5bm1hZXI7IG90aGVycyB3b24ndCBhY2NlcHQgdGhlIFN0YXR1ZSBvZiBPbnl4LlxuICAvLyBMaW5raW5nIHNwYXduIGNvbmRpdGlvbnMgYW5kIGRpYWxvZ3MgaXMgc3VmZmljaWVudCwgc2luY2UgdGhlIGFjdHVhbCBOUEMgSURcbiAgLy8gKDE2IG9yIDgyKSBpcyB3aGF0IG1hdHRlcnMgZm9yIHRoZSB0cmFkZS1pblxuICByb20ubnBjc1sweDgyXS51c2VkID0gdHJ1ZTtcbiAgcm9tLm5wY3NbMHg4Ml0ubGluaygweDE2KTtcbiAgcm9tLm5wY3NbMHg4Ml0uZGF0YSA9IFsuLi5yb20ubnBjc1sweDE2XS5kYXRhXSBhcyBhbnk7IC8vIGVuc3VyZSBnaXZlIGl0ZW1cbiAgcm9tLmxvY2F0aW9ucy5CcnlubWFlci5zcGF3bnMuZmluZChzID0+IHMuaXNOcGMoKSAmJiBzLmlkID09PSAweDE2KSEuaWQgPSAweDgyO1xuICByb20uaXRlbXNbMHgyNV0udHJhZGVJbiFbMF0gPSAweDgyO1xuXG4gIC8vIExlYWYgZWxkZXIgaW4gaG91c2UgKCQwZCBAICRjMCkgfiBzd29yZCBvZiB3aW5kIHJlZHVuZGFudCBmbGFnXG4gIC8vIGRpYWxvZygweDBkLCAweGMwKVsyXS5mbGFncyA9IFtdO1xuICAvL3JvbS5pdGVtR2V0c1sweDAwXS5mbGFncyA9IFtdOyAvLyBjbGVhciByZWR1bmRhbnQgZmxhZ1xuXG4gIC8vIExlYWYgcmFiYml0ICgkMTMpIG5vcm1hbGx5IHN0b3BzIHNldHRpbmcgaXRzIGZsYWcgYWZ0ZXIgcHJpc29uIGRvb3Igb3BlbmVkLFxuICAvLyBidXQgdGhhdCBkb2Vzbid0IG5lY2Vzc2FyaWx5IG9wZW4gbXQgc2FicmUuICBJbnN0ZWFkIChhKSB0cmlnZ2VyIG9uIDA0N1xuICAvLyAoc2V0IGJ5IDhkIHVwb24gZW50ZXJpbmcgZWxkZXIncyBjZWxsKS4gIEFsc28gbWFrZSBzdXJlIHRoYXQgdGhhdCBwYXRoIGFsc29cbiAgLy8gcHJvdmlkZXMgdGhlIG5lZWRlZCBmbGFnIHRvIGdldCBpbnRvIG10IHNhYnJlLlxuICBkaWFsb2coMHgxMylbMl0uY29uZGl0aW9uID0gMHgwNDc7XG4gIGRpYWxvZygweDEzKVsyXS5mbGFncyA9IFsweDBhOV07XG4gIGRpYWxvZygweDEzKVszXS5mbGFncyA9IFsweDBhOV07XG5cbiAgLy8gV2luZG1pbGwgZ3VhcmQgKCQxNCBAICQwZSkgc2hvdWxkbid0IGRlc3Bhd24gYWZ0ZXIgYWJkdWN0aW9uICgwMzgpLFxuICAvLyBidXQgaW5zdGVhZCBhZnRlciBnaXZpbmcgdGhlIGl0ZW0gKDA4OClcbiAgc3Bhd25zKDB4MTQsIDB4MGUpWzFdID0gfjB4MDg4OyAvLyByZXBsYWNlIGZsYWcgfjAzOCA9PiB+MDg4XG4gIC8vZGlhbG9nKDB4MTQsIDB4MGUpWzBdLmZsYWdzID0gW107IC8vIHJlbW92ZSByZWR1bmRhbnQgZmxhZyB+IHdpbmRtaWxsIGtleVxuXG4gIC8vIEFrYWhhbmEgKCQxNiAvIDg4KSB+IHNoaWVsZCByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4MTYsIDB4NTcpWzBdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRpc2FwcGVhciBhZnRlciBnZXR0aW5nIGJhcnJpZXIgKG5vdGUgODgncyBzcGF3bnMgbm90IGxpbmtlZCB0byAxNilcbiAgcmVtb3ZlKHNwYXducygweDE2LCAweDU3KSwgfjB4MDUxKTtcbiAgcmVtb3ZlKHNwYXducygweDg4LCAweDU3KSwgfjB4MDUxKTtcblxuICBmdW5jdGlvbiByZXZlcnNlRGlhbG9nKGRzOiBMb2NhbERpYWxvZ1tdKTogdm9pZCB7XG4gICAgZHMucmV2ZXJzZSgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IG5leHQgPSBkc1tpICsgMV07XG4gICAgICBkc1tpXS5jb25kaXRpb24gPSBuZXh0ID8gfm5leHQuY29uZGl0aW9uIDogfjA7XG4gICAgfVxuICB9O1xuXG4gIC8vIE9hayBlbGRlciAoJDFkKSB+IHN3b3JkIG9mIGZpcmUgcmVkdW5kYW50IGZsYWdcbiAgY29uc3Qgb2FrRWxkZXJEaWFsb2cgPSBkaWFsb2coMHgxZCk7XG4gIC8vb2FrRWxkZXJEaWFsb2dbNF0uZmxhZ3MgPSBbXTtcbiAgLy8gTWFrZSBzdXJlIHRoYXQgd2UgdHJ5IHRvIGdpdmUgdGhlIGl0ZW0gZnJvbSAqYWxsKiBwb3N0LWluc2VjdCBkaWFsb2dzXG4gIG9ha0VsZGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1syXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzNdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcblxuICAvLyBPYWsgbW90aGVyICgkMWUpIH4gaW5zZWN0IGZsdXRlIHJlZHVuZGFudCBmbGFnXG4gIC8vIFRPRE8gLSByZWFycmFuZ2UgdGhlc2UgZmxhZ3MgYSBiaXQgKG1heWJlIH4wNDUsIH4wYTAgfjA0MSAtIHNvIHJldmVyc2UpXG4gIC8vICAgICAgLSB3aWxsIG5lZWQgdG8gY2hhbmdlIGJhbGxPZkZpcmUgYW5kIGluc2VjdEZsdXRlIGluIGRlcGdyYXBoXG4gIGNvbnN0IG9ha01vdGhlckRpYWxvZyA9IGRpYWxvZygweDFlKTtcbiAgKCgpID0+IHtcbiAgICBjb25zdCBba2lsbGVkSW5zZWN0LCBnb3RJdGVtLCBnZXRJdGVtLCBmaW5kQ2hpbGRdID0gb2FrTW90aGVyRGlhbG9nO1xuICAgIGZpbmRDaGlsZC5jb25kaXRpb24gPSB+MHgwNDU7XG4gICAgLy9nZXRJdGVtLmNvbmRpdGlvbiA9IH4weDIyNztcbiAgICAvL2dldEl0ZW0uZmxhZ3MgPSBbXTtcbiAgICBnb3RJdGVtLmNvbmRpdGlvbiA9IH4wO1xuICAgIHJvbS5ucGNzWzB4MWVdLmxvY2FsRGlhbG9ncy5zZXQoLTEsIFtmaW5kQ2hpbGQsIGdldEl0ZW0sIGtpbGxlZEluc2VjdCwgZ290SXRlbV0pO1xuICB9KSgpO1xuICAvLy8gb2FrTW90aGVyRGlhbG9nWzJdLmZsYWdzID0gW107XG4gIC8vIC8vIEVuc3VyZSB3ZSBhbHdheXMgZ2l2ZSBpdGVtIGFmdGVyIGluc2VjdC5cbiAgLy8gb2FrTW90aGVyRGlhbG9nWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gb2FrTW90aGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgLy8gcmV2ZXJzZURpYWxvZyhvYWtNb3RoZXJEaWFsb2cpO1xuXG4gIC8vIFJldmVyc2UgdGhlIG90aGVyIG9hayBkaWFsb2dzLCB0b28uXG4gIGZvciAoY29uc3QgaSBvZiBbMHgyMCwgMHgyMSwgMHgyMiwgMHg3YywgMHg3ZF0pIHtcbiAgICByZXZlcnNlRGlhbG9nKGRpYWxvZyhpKSk7XG4gIH1cblxuICAvLyBTd2FwIHRoZSBmaXJzdCB0d28gb2FrIGNoaWxkIGRpYWxvZ3MuXG4gIGNvbnN0IG9ha0NoaWxkRGlhbG9nID0gZGlhbG9nKDB4MWYpO1xuICBvYWtDaGlsZERpYWxvZy51bnNoaWZ0KC4uLm9ha0NoaWxkRGlhbG9nLnNwbGljZSgxLCAxKSk7XG5cbiAgLy8gVGhyb25lIHJvb20gYmFjayBkb29yIGd1YXJkICgkMzMgQCAkZGYpIHNob3VsZCBoYXZlIHNhbWUgc3Bhd24gY29uZGl0aW9uIGFzIHF1ZWVuXG4gIC8vICgwMjAgTk9UIHF1ZWVuIG5vdCBpbiB0aHJvbmUgcm9vbSBBTkQgMDFiIE5PVCB2aWV3ZWQgbWVzaWEgcmVjb3JkaW5nKVxuICByb20ubnBjc1sweDMzXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZGYsICBbfjB4MDIwLCB+MHgwMWJdKTtcblxuICAvLyBGcm9udCBwYWxhY2UgZ3VhcmQgKCQzNCkgdmFjYXRpb24gbWVzc2FnZSBrZXlzIG9mZiAwMWIgaW5zdGVhZCBvZiAwMWZcbiAgZGlhbG9nKDB4MzQpWzFdLmNvbmRpdGlvbiA9IDB4MDFiO1xuXG4gIC8vIFF1ZWVuJ3MgKCQzOCkgZGlhbG9nIG5lZWRzIHF1aXRlIGEgYml0IG9mIHdvcmtcbiAgLy8gR2l2ZSBpdGVtIChmbHV0ZSBvZiBsaW1lKSBldmVuIGlmIGdvdCB0aGUgc3dvcmQgb2Ygd2F0ZXJcbiAgZGlhbG9nKDB4MzgpWzNdLmNvbmRpdGlvbiA9IDB4MjAyOyAvLyBcInlvdSBmb3VuZCBzd29yZFwiIChjb25kaXRpb24gMjAyKVxuICBkaWFsb2coMHgzOClbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzOyAvLyAgPT4gYWN0aW9uIDNcbiAgLy8gRW5zdXJlIHlvdSBjYW4gYWx3YXlzIG1ha2UgdGhlIHF1ZWVuIGdvIGF3YXkuXG4gIGRpYWxvZygweDM4KVs0XS5mbGFncy5wdXNoKDB4MDljKTsgICAgIC8vIHNldCAwOWMgcXVlZW4gZ29pbmcgYXdheVxuICAvLyBRdWVlbiBzcGF3biBjb25kaXRpb24gZGVwZW5kcyBvbiAwMWIgKG1lc2lhIHJlY29yZGluZykgbm90IDAxZiAoYmFsbCBvZiB3YXRlcilcbiAgLy8gVGhpcyBlbnN1cmVzIHlvdSBoYXZlIGJvdGggc3dvcmQgYW5kIGJhbGwgdG8gZ2V0IHRvIGhlciAoPz8/KVxuICBzcGF3bnMoMHgzOCwgMHhkZilbMV0gPSB+MHgwMWI7ICAvLyB0aHJvbmUgcm9vbTogMDFiIE5PVCBtZXNpYSByZWNvcmRpbmdcbiAgc3Bhd25zKDB4MzgsIDB4ZTEpWzBdID0gMHgwMWI7ICAgLy8gYmFjayByb29tOiAwMWIgbWVzaWEgcmVjb3JkaW5nXG4gIGRpYWxvZygweDM4KVsxXS5jb25kaXRpb24gPSAweDAxYjsgICAgIC8vIHJldmVhbCBjb25kaXRpb246IDAxYiBtZXNpYSByZWNvcmRpbmdcblxuICAvLyBGb3J0dW5lIHRlbGxlciAoJDM5KSBzaG91bGQgYWxzbyBub3Qgc3Bhd24gYmFzZWQgb24gbWVzaWEgcmVjb3JkaW5nIHJhdGhlciB0aGFuIG9yYlxuICBzcGF3bnMoMHgzOSwgMHhkOClbMV0gPSB+MHgwMWI7ICAvLyBmb3J0dW5lIHRlbGxlciByb29tOiAwMWIgTk9UXG5cbiAgLy8gQ2xhcmsgKCQ0NCkgbW92ZXMgYWZ0ZXIgdGFsa2luZyB0byBoaW0gKDA4ZCkgcmF0aGVyIHRoYW4gY2FsbWluZyBzZWEgKDA4ZikuXG4gIC8vIFRPRE8gLSBjaGFuZ2UgMDhkIHRvIHdoYXRldmVyIGFjdHVhbCBpdGVtIGhlIGdpdmVzLCB0aGVuIHJlbW92ZSBib3RoIGZsYWdzXG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlOSwgW34weDA4ZF0pOyAvLyB6b21iaWUgdG93biBiYXNlbWVudFxuICByb20ubnBjc1sweDQ0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZTQsIFsweDA4ZF0pOyAgLy8gam9lbCBzaGVkXG4gIC8vZGlhbG9nKDB4NDQsIDB4ZTkpWzFdLmZsYWdzLnBvcCgpOyAvLyByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuXG4gIC8vIEJyb2thaGFuYSAoJDU0KSB+IHdhcnJpb3IgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDU0KVsyXS5mbGFncyA9IFtdO1xuXG4gIC8vIERlbyAoJDVhKSB+IHBlbmRhbnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1YSlbMV0uZmxhZ3MgPSBbXTtcblxuICAvLyBaZWJ1ICgkNWUpIGNhdmUgZGlhbG9nIChAICQxMClcbiAgLy8gVE9ETyAtIGRpYWxvZ3MoMHg1ZSwgMHgxMCkucmVhcnJhbmdlKH4weDAzYSwgMHgwMGQsIDB4MDM4LCAweDAzOSwgMHgwMGEsIH4weDAwMCk7XG4gIHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5zZXQoMHgxMCwgW1xuICAgIExvY2FsRGlhbG9nLm9mKH4weDAzYSwgWzB4MDAsIDB4MWFdLCBbMHgwM2FdKSwgLy8gMDNhIE5PVCB0YWxrZWQgdG8gemVidSBpbiBjYXZlIC0+IFNldCAwM2FcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMGQsIFsweDAwLCAweDFkXSksIC8vIDAwZCBsZWFmIHZpbGxhZ2VycyByZXNjdWVkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM4LCBbMHgwMCwgMHgxY10pLCAvLyAwMzggbGVhZiBhdHRhY2tlZFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAzOSwgWzB4MDAsIDB4MWRdKSwgLy8gMDM5IGxlYXJuZWQgcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwYSwgWzB4MDAsIDB4MWIsIDB4MDNdKSwgLy8gMDBhIHdpbmRtaWxsIGtleSB1c2VkIC0+IHRlYWNoIHJlZnJlc2hcbiAgICBMb2NhbERpYWxvZy5vZih+MHgwMDAsIFsweDAwLCAweDFkXSksXG4gIF0pO1xuICAvLyBEb24ndCBkZXNwYXduIG9uIGdldHRpbmcgYmFycmllclxuICByZW1vdmUoc3Bhd25zKDB4NWUsIDB4MTApLCB+MHgwNTEpOyAvLyByZW1vdmUgMDUxIE5PVCBsZWFybmVkIGJhcnJpZXJcblxuICAvLyBUb3JuZWwgKCQ1ZikgaW4gc2FicmUgd2VzdCAoJDIxKSB+IHRlbGVwb3J0IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NWYsIDB4MjEpWzFdLmZsYWdzID0gW107XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NWZdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgyMSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFN0b20gKCQ2MCk6IGRvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJvbS5ucGNzWzB4NjBdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHgxZSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIEFzaW5hICgkNjIpIGluIGJhY2sgcm9vbSAoJGUxKSBnaXZlcyBmbHV0ZSBvZiBsaW1lXG4gIGNvbnN0IGFzaW5hID0gcm9tLm5wY3NbMHg2Ml07XG4gIGFzaW5hLmRhdGFbMV0gPSAweDI4O1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgZGlhbG9nKGFzaW5hLmlkLCAweGUxKVsyXS5tZXNzYWdlLmFjdGlvbiA9IDB4MTE7XG4gIC8vIFByZXZlbnQgZGVzcGF3biBmcm9tIGJhY2sgcm9vbSBhZnRlciBkZWZlYXRpbmcgc2FiZXJhICh+MDhmKVxuICByZW1vdmUoc3Bhd25zKGFzaW5hLmlkLCAweGUxKSwgfjB4MDhmKTtcblxuICAvLyBLZW5zdSBpbiBjYWJpbiAoJDY4IEAgJDYxKSBuZWVkcyB0byBiZSBhdmFpbGFibGUgZXZlbiBhZnRlciB2aXNpdGluZyBKb2VsLlxuICAvLyBDaGFuZ2UgaGltIHRvIGp1c3QgZGlzYXBwZWFyIGFmdGVyIHNldHRpbmcgdGhlIHJpZGVhYmxlIGRvbHBoaW4gZmxhZyAoMDliKSxcbiAgLy8gYW5kIHRvIG5vdCBldmVuIHNob3cgdXAgYXQgYWxsIHVubGVzcyB0aGUgZm9nIGxhbXAgd2FzIHJldHVybmVkICgwMjEpLlxuICByb20ubnBjc1sweDY4XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4NjEsIFt+MHgwOWIsIDB4MDIxXSk7XG4gIGRpYWxvZygweDY4KVswXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDI7IC8vIGRpc2FwcGVhclxuXG4gIC8vIEF6dGVjYSBpbiBTaHlyb24gKDZlKSBzaG91bGRuJ3Qgc3Bhd24gYWZ0ZXIgbWFzc2FjcmUgKDAyNylcbiAgcm9tLm5wY3NbMHg2ZV0uc3Bhd25Db25kaXRpb25zLmdldCgweGYyKSEucHVzaCh+MHgwMjcpO1xuICAvLyBBbHNvIHRoZSBkaWFsb2cgdHJpZ2dlciAoODIpIHNob3VsZG4ndCBoYXBwZW5cbiAgcm9tLnRyaWdnZXIoMHg4MikuY29uZGl0aW9ucy5wdXNoKH4weDAyNyk7XG5cbiAgLy8gS2Vuc3UgaW4gbGlnaHRob3VzZSAoJDc0LyQ3ZSBAICQ2MikgfiByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDc0LCAweDYyKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIEF6dGVjYSAoJDgzKSBpbiBweXJhbWlkIH4gYm93IG9mIHRydXRoIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmNvbmRpdGlvbiA9IH4weDI0MDsgIC8vIDI0MCBOT1QgYm93IG9mIHRydXRoXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gUmFnZSBibG9ja3Mgb24gc3dvcmQgb2Ygd2F0ZXIsIG5vdCByYW5kb20gaXRlbSBmcm9tIHRoZSBjaGVzdFxuICBkaWFsb2coMHhjMylbMF0uY29uZGl0aW9uID0gMHgyMDI7XG5cbiAgLy8gUmVtb3ZlIHVzZWxlc3Mgc3Bhd24gY29uZGl0aW9uIGZyb20gTWFkbyAxXG4gIHJvbS5ucGNzWzB4YzRdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHhmMik7IC8vIGFsd2F5cyBzcGF3blxuXG4gIC8vIERyYXlnb24gMiAoJGNiIEAgbG9jYXRpb24gJGE2KSBzaG91bGQgZGVzcGF3biBhZnRlciBiZWluZyBkZWZlYXRlZC5cbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLnNldCgweGE2LCBbfjB4MjhkXSk7IC8vIGtleSBvbiBiYWNrIHdhbGwgZGVzdHJveWVkXG5cbiAgLy8gRml4IFplYnUgdG8gZ2l2ZSBrZXkgdG8gc3R4eSBldmVuIGlmIHRodW5kZXIgc3dvcmQgaXMgZ290dGVuIChqdXN0IHN3aXRjaCB0aGVcbiAgLy8gb3JkZXIgb2YgdGhlIGZpcnN0IHR3bykuICBBbHNvIGRvbid0IGJvdGhlciBzZXR0aW5nIDAzYiBzaW5jZSB0aGUgbmV3IEl0ZW1HZXRcbiAgLy8gbG9naWMgb2J2aWF0ZXMgdGhlIG5lZWQuXG4gIGNvbnN0IHplYnVTaHlyb24gPSByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3MuZ2V0KDB4ZjIpITtcbiAgemVidVNoeXJvbi51bnNoaWZ0KC4uLnplYnVTaHlyb24uc3BsaWNlKDEsIDEpKTtcbiAgLy8gemVidVNoeXJvblswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFNoeXJvbiBtYXNzYWNyZSAoJDgwKSByZXF1aXJlcyBrZXkgdG8gc3R4eVxuICByb20udHJpZ2dlcigweDgwKS5jb25kaXRpb25zID0gW1xuICAgIH4weDAyNywgLy8gbm90IHRyaWdnZXJlZCBtYXNzYWNyZSB5ZXRcbiAgICAgMHgwM2IsIC8vIGdvdCBpdGVtIGZyb20ga2V5IHRvIHN0eHkgc2xvdFxuICAgICAweDJmZCwgLy8gc2h5cm9uIHdhcnAgcG9pbnQgdHJpZ2dlcmVkXG4gICAgIC8vIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlciAtIE5PVCBBTlkgTU9SRSFcbiAgXTtcblxuICAvLyBFbnRlciBzaHlyb24gKCQ4MSkgc2hvdWxkIHNldCB3YXJwIG5vIG1hdHRlciB3aGF0XG4gIHJvbS50cmlnZ2VyKDB4ODEpLmNvbmRpdGlvbnMgPSBbXTtcblxuICBpZiAoZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpKSB7XG4gICAgLy8gTGVhcm4gYmFycmllciAoJDg0KSByZXF1aXJlcyBjYWxtIHNlYVxuICAgIHJvbS50cmlnZ2VyKDB4ODQpLmNvbmRpdGlvbnMucHVzaCgweDI4Myk7IC8vIDI4MyBjYWxtZWQgdGhlIHNlYVxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBub3Qgc2V0dGluZyAwNTEgYW5kIGNoYW5naW5nIHRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIGl0ZW1cbiAgfVxuICAvL3JvbS50cmlnZ2VyKDB4ODQpLmZsYWdzID0gW107XG5cbiAgLy8gQWRkIGFuIGV4dHJhIGNvbmRpdGlvbiB0byB0aGUgTGVhZiBhYmR1Y3Rpb24gdHJpZ2dlciAoYmVoaW5kIHplYnUpLiAgVGhpcyBlbnN1cmVzXG4gIC8vIGFsbCB0aGUgaXRlbXMgaW4gTGVhZiBwcm9wZXIgKGVsZGVyIGFuZCBzdHVkZW50KSBhcmUgZ290dGVuIGJlZm9yZSB0aGV5IGRpc2FwcGVhci5cbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKDB4MDNhKTsgLy8gMDNhIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmVcblxuICAvLyBNb3JlIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXJzOlxuICAvLyAxLiBSZW1vdmUgdGhlIDhkIHRyaWdnZXIgaW4gdGhlIGZyb250IG9mIHRoZSBjZWxsLCBzd2FwIGl0IG91dFxuICAvLyAgICBmb3IgYjIgKGxlYXJuIHBhcmFseXNpcykuXG4gIHJvbS50cmlnZ2VyKDB4OGQpLnVzZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLk10U2FicmVOb3J0aF9TdW1taXRDYXZlLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCkgc3Bhd24uaWQgPSAweGIyO1xuICB9XG4gIHJlbW92ZUlmKHJvbS5sb2NhdGlvbnMuV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLFxuICAgICAgICAgICBzcGF3biA9PiBzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4ZCk7XG4gIC8vIDIuIFNldCB0aGUgdHJpZ2dlciB0byByZXF1aXJlIGhhdmluZyBraWxsZWQga2VsYmVzcXVlLlxuICByb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zLnB1c2goMHgxMDIpOyAvLyBraWxsZWQga2VsYmVzcXVlXG4gIC8vIDMuIEFsc28gc2V0IHRoZSB0cmlnZ2VyIHRvIGZyZWUgdGhlIHZpbGxhZ2VycyBhbmQgdGhlIGVsZGVyLlxuICByb20udHJpZ2dlcigweGIyKS5mbGFncy5wdXNoKH4weDA4NCwgfjB4MDg1LCAweDAwZCk7XG4gIC8vIDQuIERvbid0IHRyaWdnZXIgdGhlIGFiZHVjdGlvbiBpbiB0aGUgZmlyc3QgcGxhY2UgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNS4gRG9uJ3QgdHJpZ2dlciByYWJiaXQgYmxvY2sgaWYga2VsYmVzcXVlIGRlYWRcbiAgcm9tLnRyaWdnZXIoMHg4NikuY29uZGl0aW9ucy5wdXNoKH4weDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gNi4gRG9uJ3QgZnJlZSB2aWxsYWdlcnMgZnJvbSB1c2luZyBwcmlzb24ga2V5XG4gIHJvbS5wcmdbMHgxZTBhM10gPSAweGMwO1xuICByb20ucHJnWzB4MWUwYTRdID0gMHgwMDtcblxuICAvLyBUT0RPIC0gYWRkaXRpb25hbCB3b3JrIG9uIGFiZHVjdGlvbiB0cmlnZ2VyOlxuICAvLyAgIC0gZ2V0IHJpZCBvZiB0aGUgZmxhZ3Mgb24ga2V5IHRvIHByaXNvbiB1c2VcbiAgLy8gICAtIGFkZCBhIGNvbmRpdGlvbiB0aGF0IGFiZHVjdGlvbiBkb2Vzbid0IGhhcHBlbiBpZiByZXNjdWVkXG4gIC8vIEdldCByaWQgb2YgQk9USCB0cmlnZ2VycyBpbiBzdW1taXQgY2F2ZSwgIEluc3RlYWQsIHRpZSBldmVyeXRoaW5nXG4gIC8vIHRvIHRoZSBlbGRlciBkaWFsb2cgb24gdG9wXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgc3RpbGwgYWxpdmUsIG1heWJlIGdpdmUgYSBoaW50IGFib3V0IHdlYWtuZXNzXG4gIC8vICAgLSBpZiBrZWxiZXNxdWUgZGVhZCB0aGVuIHRlYWNoIHBhcmFseXNpcyBhbmQgc2V0L2NsZWFyIGZsYWdzXG4gIC8vICAgLSBpZiBwYXJhbHlzaXMgbGVhcm5lZCB0aGVuIHNheSBzb21ldGhpbmcgZ2VuZXJpY1xuICAvLyBTdGlsbCBuZWVkIHRvIGtlZXAgdGhlIHRyaWdnZXIgaW4gdGhlIGZyb250IGluIGNhc2Ugbm9cbiAgLy8gYWJkdWN0aW9uIHlldFxuICAvLyAgIC0gaWYgTk9UIHBhcmFseXNpcyBBTkQgaWYgTk9UIGVsZGVyIG1pc3NpbmcgQU5EIGlmIGtlbGJlcXVlIGRlYWRcbiAgLy8gLS0tPiBuZWVkIHNwZWNpYWwgaGFuZGxpbmcgZm9yIHR3byB3YXlzIHRvIGdldCAobGlrZSByZWZyZXNoKT9cbiAgLy9cbiAgLy8gQWxzbyBhZGQgYSBjaGVjayB0aGF0IHRoZSByYWJiaXQgdHJpZ2dlciBpcyBnb25lIGlmIHJlc2N1ZWQhXG5cblxuXG4gIC8vIFBhcmFseXNpcyB0cmlnZ2VyICgkYjIpIH4gcmVtb3ZlIHJlZHVuZGFudCBpdGVtZ2V0IGZsYWdcbiAgLy9yb20udHJpZ2dlcigweGIyKS5jb25kaXRpb25zWzBdID0gfjB4MjQyO1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnNoaWZ0KCk7IC8vIHJlbW92ZSAwMzcgbGVhcm5lZCBwYXJhbHlzaXNcblxuICAvLyBMZWFybiByZWZyZXNoIHRyaWdnZXIgKCRiNCkgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjQpLmNvbmRpdGlvbnNbMV0gPSB+MHgyNDE7XG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIDAzOSBsZWFybmVkIHJlZnJlc2hcblxuICAvLyBUZWxlcG9ydCBibG9jayBvbiBtdCBzYWJyZSBpcyBmcm9tIHNwZWxsLCBub3Qgc2xvdFxuICByb20udHJpZ2dlcigweGJhKS5jb25kaXRpb25zWzBdID0gfjB4MjQ0OyAvLyB+MDNmIC0+IH4yNDRcblxuICAvLyBQb3J0b2EgcGFsYWNlIGd1YXJkIG1vdmVtZW50IHRyaWdnZXIgKCRiYikgc3RvcHMgb24gMDFiIChtZXNpYSkgbm90IDAxZiAob3JiKVxuICByb20udHJpZ2dlcigweGJiKS5jb25kaXRpb25zWzFdID0gfjB4MDFiO1xuXG4gIC8vIFJlbW92ZSByZWR1bmRhbnQgdHJpZ2dlciA4YSAoc2xvdCAxNikgaW4gem9tYmlldG93biAoJDY1KVxuICAvLyAgLS0gbm90ZTogbm8gbG9uZ2VyIG5lY2Vzc2FyeSBzaW5jZSB3ZSByZXB1cnBvc2UgaXQgaW5zdGVhZC5cbiAgLy8gY29uc3Qge3pvbWJpZVRvd259ID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gem9tYmllVG93bi5zcGF3bnMgPSB6b21iaWVUb3duLnNwYXducy5maWx0ZXIoeCA9PiAheC5pc1RyaWdnZXIoKSB8fCB4LmlkICE9IDB4OGEpO1xuXG4gIC8vIFJlcGxhY2UgYWxsIGRpYWxvZyBjb25kaXRpb25zIGZyb20gMDBlIHRvIDI0M1xuICBmb3IgKGNvbnN0IG5wYyBvZiByb20ubnBjcykge1xuICAgIGZvciAoY29uc3QgZCBvZiBucGMuYWxsRGlhbG9ncygpKSB7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IDB4MDBlKSBkLmNvbmRpdGlvbiA9IDB4MjQzO1xuICAgICAgaWYgKGQuY29uZGl0aW9uID09PSB+MHgwMGUpIGQuY29uZGl0aW9uID0gfjB4MjQzO1xuICAgIH1cbiAgfVxufVxuXG4vLyBIYXJkIG1vZGUgZmxhZzogSGMgLSB6ZXJvIG91dCB0aGUgc3dvcmQncyBjb2xsaXNpb24gcGxhbmVcbmZ1bmN0aW9uIGRpc2FibGVTdGFicyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG8gb2YgWzB4MDgsIDB4MDksIDB4MjddKSB7XG4gICAgcm9tLm9iamVjdHNbb10uY29sbGlzaW9uUGxhbmUgPSAwO1xuICB9XG4gIC8vIEFsc28gdGFrZSB3YXJyaW9yIHJpbmcgb3V0IG9mIHRoZSBwaWN0dXJlLi4uIDp0cm9sbDpcbiAgLy8gcm9tLml0ZW1HZXRzWzB4MmJdLmlkID0gMHg1YjsgLy8gbWVkaWNhbCBoZXJiIGZyb20gc2Vjb25kIGZsdXRlIG9mIGxpbWUgY2hlY2tcbiAgcm9tLm5wY3NbMHg1NF0uZGF0YVswXSA9IDB4MjA7XG59XG5cbmZ1bmN0aW9uIG9yYnNPcHRpb25hbChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IG9iaiBvZiBbMHgxMCwgMHgxNCwgMHgxOCwgMHgxZF0pIHtcbiAgICAvLyAxLiBMb29zZW4gdGVycmFpbiBzdXNjZXB0aWJpbGl0eSBvZiBsZXZlbCAxIHNob3RzXG4gICAgcm9tLm9iamVjdHNbb2JqXS50ZXJyYWluU3VzY2VwdGliaWxpdHkgJj0gfjB4MDQ7XG4gICAgLy8gMi4gSW5jcmVhc2UgdGhlIGxldmVsIHRvIDJcbiAgICByb20ub2JqZWN0c1tvYmpdLmxldmVsID0gMjtcbiAgfVxufVxuIl19