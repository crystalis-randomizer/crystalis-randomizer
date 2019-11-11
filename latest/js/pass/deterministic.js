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
    const mezame = rom.locations.mezameShrine;
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
    l.goaFortressKelbesque.spawns[0].x -= 8;
    l.goaFortressZebu.spawns.splice(1, 1);
    l.goaFortressTornel.spawns.splice(2, 1);
    l.goaFortressAsina.spawns.splice(2, 1);
}
function alarmFluteIsKeyItem(rom, flags) {
    const { waterfallCave4 } = rom.locations;
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
    waterfallCave4.spawn(0x19).id = 0x10;
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
    for (const location of [rom.locations.cordelPlainsEast,
        rom.locations.undergroundChannel,
        rom.locations.kirisaMeadow]) {
        for (const spawn of location.spawns) {
            if (spawn.isChest())
                spawn.data[2] |= 0x20;
        }
    }
}
function addCordelWestTriggers(rom, flags) {
    const { cordelPlainsEast, cordelPlainsWest } = rom.locations;
    for (const spawn of cordelPlainsEast.spawns) {
        if (spawn.isChest() || (flags.disableTeleportSkip() && spawn.isTrigger())) {
            cordelPlainsWest.spawns.push(spawn.clone());
        }
    }
}
function fixRabbitSkip(rom) {
    for (const spawn of rom.locations.mtSabreNorthMain.spawns) {
        if (spawn.isTrigger() && spawn.id === 0x86) {
            if (spawn.x === 0x740) {
                spawn.x += 16;
                spawn.y += 16;
            }
        }
    }
}
function addTowerExit(rom) {
    const { towerEntrance, cryptTeleporter } = rom.locations;
    const entrance = cryptTeleporter.entrances.length;
    const dest = cryptTeleporter.id;
    cryptTeleporter.entrances.push(Entrance.of({ tile: 0x68 }));
    towerEntrance.exits.push(Exit.of({ tile: 0x57, dest, entrance }));
    towerEntrance.exits.push(Exit.of({ tile: 0x58, dest, entrance }));
}
function connectLimeTreeToLeaf(rom) {
    const { valleyOfWind, limeTreeValley } = rom.locations;
    valleyOfWind.screens[5][4] = 0x10;
    limeTreeValley.screens[1][0] = 0x1a;
    limeTreeValley.screens[2][0] = 0x0c;
    const windEntrance = valleyOfWind.entrances.push(Entrance.of({ x: 0x4ef, y: 0x578 })) - 1;
    const limeEntrance = limeTreeValley.entrances.push(Entrance.of({ x: 0x010, y: 0x1c0 })) - 1;
    valleyOfWind.exits.push(Exit.of({ x: 0x4f0, y: 0x560, dest: 0x42, entrance: limeEntrance }), Exit.of({ x: 0x4f0, y: 0x570, dest: 0x42, entrance: limeEntrance }));
    limeTreeValley.exits.push(Exit.of({ x: 0x000, y: 0x1b0, dest: 0x03, entrance: windEntrance }), Exit.of({ x: 0x000, y: 0x1c0, dest: 0x03, entrance: windEntrance }));
}
function closeCaveEntrances(rom, flags) {
    rom.locations.valleyOfWind.entrances[1].y += 16;
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
    const { valleyOfWind, cordelPlainsWest, cordelPlainsEast, waterfallValleyNorth, waterfallValleySouth, kirisaMeadow, saharaOutsideCave, desert2, } = rom.locations;
    const flagsToClear = [
        [valleyOfWind, 0x30],
        [cordelPlainsWest, 0x30],
        [cordelPlainsEast, 0x30],
        [waterfallValleyNorth, 0x00],
        [waterfallValleyNorth, 0x14],
        [waterfallValleySouth, 0x74],
        [kirisaMeadow, 0x10],
        [saharaOutsideCave, 0x00],
        [desert2, 0x41],
    ];
    if (flags.addEastCave() && flags.connectLimeTreeToLeaf()) {
        flagsToClear.push([rom.locations.limeTreeValley, 0x10]);
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
        replaceFlag(cordelPlainsWest, 0x30, windmillFlag);
        replaceFlag(cordelPlainsEast, 0x30, windmillFlag);
        replaceFlag(waterfallValleyNorth, 0x00, 0x2d8);
        const explosion = Spawn.of({ y: 0x060, x: 0x060, type: 4, id: 0x2c });
        const keyTrigger = Spawn.of({ y: 0x070, x: 0x070, type: 2, id: 0xad });
        waterfallValleyNorth.spawns.splice(1, 0, explosion);
        waterfallValleyNorth.spawns.push(keyTrigger);
    }
}
function eastCave(rom, flags) {
    const { valleyOfWind, limeTreeValley, sealedCave1 } = rom.locations;
    const loc1 = rom.locations[0x0b];
    const loc2 = rom.locations[0x0d];
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
    loc1.name = 'East Cave 1';
    loc2.name = 'East Cave 2';
    for (const l of [loc1, loc2]) {
        l.bgm = 0x17;
        l.entrances = [];
        l.exits = [];
        l.pits = [];
        l.spawns = [];
        l.flags = [];
        l.height = l.screens.length;
        l.width = l.screens[0].length;
        l.used = l.hasSpawns = true;
        l.extended = 0;
        l.tilePalettes = [0x1a, 0x1b, 0x05];
        l.tileset = 0x88;
        l.tileEffects = 0xb5;
        l.tilePatterns = [0x14, 0x02];
        l.spritePatterns = [...sealedCave1.spritePatterns];
        l.spritePalettes = [...sealedCave1.spritePalettes];
    }
    valleyOfWind.writeScreens2d(0x23, [
        [0x11, 0x0d],
        [0x09, 0xc2]
    ]);
    rom.tileEffects[0].effects[0xc0] = 0;
    loc1.connect(0x43, loc2, 0x44);
    loc1.connect(0x40, valleyOfWind, 0x34);
    if (flags.connectLimeTreeToLeaf()) {
        limeTreeValley.resizeScreens(0, 1, 0, 0);
        limeTreeValley.writeScreens2d(0x00, [
            [0x0c, 0x11],
            [0x15, 0x36],
            [0x0e, 0x0f]
        ]);
        loc1.screens[0][4] = 0x97;
        loc1.connect(0x04, limeTreeValley, 0x10);
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
    for (const spawn of rom.locations.zombieTown.spawns) {
        if (spawn.isTrigger() && spawn.id === 0x8a) {
            spawn.id = trigger.id;
        }
    }
    for (let i = 0x3dc62; i >= 0x3dc5f; i--) {
        rom.prg[i + 1] = rom.prg[i];
    }
    rom.prg[0x3dc5f] = rom.locations.zombieTown.id;
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
    rom.locations.swanDanceHall.spawns.find(s => s.isNpc() && s.id === 0x7e).id = 0x74;
    rom.items[0x3b].tradeIn[0] = 0x74;
    rom.npcs[0x88].linkDialog(0x16);
    rom.npcs[0x82].used = true;
    rom.npcs[0x82].link(0x16);
    rom.npcs[0x82].data = [...rom.npcs[0x16].data];
    rom.locations.brynmaer.spawns.find(s => s.isNpc() && s.id === 0x16).id = 0x82;
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
    for (const spawn of rom.locations.mtSabreNorthSummitCave.spawns) {
        if (spawn.isTrigger() && spawn.id === 0x8d)
            spawn.id = 0xb2;
    }
    removeIf(rom.locations.waterfallValleyNorth.spawns, spawn => spawn.isTrigger() && spawn.id === 0x8d);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ25DLE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEdBQWU7SUFFbkQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjO0lBSXBELGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVuQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJ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QztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBRTFCLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFO1FBRzNCLE1B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Q0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV6RSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztJQUN2RSxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUMsQ0FBQyxFQUNqRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFRLEVBQUUsS0FBYztJQUVsRCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdoRCxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ04sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ1osQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDM0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRy9DLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxL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O0lBR2pDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVoRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztRQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7UUFDOUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQzlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7SUFDMUIsSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7SUFFMUIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUM1QixDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztRQUNiLENBQUMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxLQUFL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QUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FDM0QsQ0FBQztJQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNkLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMzRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLEVBQzFELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFDLENBQUMsRUFDM0QsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUMsQ0FBQyxFQUMxRCxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQzNELENBQUM7SUFDRixJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEVBQUU7UUFFakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckU7QUFDSCxDQUFDO0FBQUEsQ0FBQztBQUVGLFNBQVMsYUFBYSxDQUFDLEdBQVE7SUFFN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFD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Q0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEYsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUdELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQVEsQ0FBQztJQUN0RCxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFFLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUNwRixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7SUFHbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFLaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElB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Q0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFXbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsV0FBVyxDQUFDLEVBQUUsQ0FBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDckMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUtuQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRzVDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FB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QUcsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBRTFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMscUJBQXFCLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFaEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQzVCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBlcmZvcm0gaW5pdGlhbCBjbGVhbnVwL3NldHVwIG9mIHRoZSBST00uXG5cbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7RW50cmFuY2UsIEV4aXQsIEZsYWcsIExvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuLi9yb20vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7R2xvYmFsRGlhbG9nLCBMb2NhbERpYWxvZ30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHthc3NlcnR9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpY1ByZVBhcnNlKHByZzogVWludDhBcnJheSk6IHZvaWQge1xuICAvLyBSZW1vdmUgdW51c2VkIGl0ZW0vdHJpZ2dlciBhY3Rpb25zXG4gIHByZ1sweDFlMDZiXSAmPSA3OyAvLyBtZWRpY2FsIGhlcmIgbm9ybWFsIHVzYWdlID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNmZdICY9IDc7IC8vIG1hZ2ljIHJpbmcgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDczXSAmPSA3OyAvLyBmcnVpdCBvZiBsaW1lIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3N10gJj0gNzsgLy8gYW50aWRvdGUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDdiXSAmPSA3OyAvLyBvcGVsIHN0YXR1ZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwODRdICY9IDc7IC8vIHdhcnAgYm9vdHMgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDQgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDliXSAmPSA3OyAvLyB3aW5kbWlsbCBrZXkgaXRlbXVzZVsxXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMGI5XSAmPSA3OyAvLyBnbG93aW5nIGxhbXAgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlcm1pbmlzdGljKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuXG4gIC8vIE5PVEU6IHRoaXMgaXMgZG9uZSB2ZXJ5IGVhcmx5LCBtYWtlIHN1cmUgYW55IHJlZmVyZW5jZXMgdG8gd2FycFxuICAvLyBwb2ludCBmbGFncyBhcmUgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBuZXcgb25lcyFcbiAgYWRkWm9tYmllV2FycChyb20pO1xuXG4gIGFkZE1lemFtZVRyaWdnZXIocm9tKTtcblxuICBub3JtYWxpemVTd29yZHMocm9tLCBmbGFncyk7XG5cbiAgZml4Q29pblNwcml0ZXMocm9tKTtcbiAgZml4TWltaWNzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIHJldmVyc2libGVTd2FuR2F0ZShyb20pO1xuICBhZGp1c3RHb2FGb3J0cmVzc1RyaWdnZXJzKHJvbSk7XG4gIHByZXZlbnROcGNEZXNwYXducyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkpIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbSk7XG4gIGlmIChmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpKSByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbSk7XG5cbiAgYWRqdXN0SXRlbU5hbWVzKHJvbSwgZmxhZ3MpO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBtYWtpbmcgYSBUcmFuc2Zvcm1hdGlvbiBpbnRlcmZhY2UsIHdpdGggb3JkZXJpbmcgY2hlY2tzXG4gIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tLCBmbGFncyk7IC8vIE5PVEU6IHByZS1zaHVmZmxlXG4gIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tKTtcbiAgaWYgKGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfSBlbHNlIHtcbiAgICBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfVxuXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tKTtcblxuICBpZiAoZmxhZ3MuYWRkRWFzdENhdmUoKSkge1xuICAgIGVhc3RDYXZlKHJvbSwgZmxhZ3MpO1xuICB9IGVsc2UgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgY29ubmVjdExpbWVUcmVlVG9MZWFmKHJvbSk7XG4gIH1cbiAgZXZpbFNwaXJpdElzbGFuZFJlcXVpcmVzRG9scGhpbihyb20pO1xuICBjbG9zZUNhdmVFbnRyYW5jZXMocm9tLCBmbGFncyk7XG4gIHNpbXBsaWZ5SW52aXNpYmxlQ2hlc3RzKHJvbSk7XG4gIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb20sIGZsYWdzKTtcbiAgaWYgKGZsYWdzLmRpc2FibGVSYWJiaXRTa2lwKCkpIGZpeFJhYmJpdFNraXAocm9tKTtcblxuICBmaXhSZXZlcnNlV2FsbHMocm9tKTtcbiAgaWYgKGZsYWdzLmNoYXJnZVNob3RzT25seSgpKSBkaXNhYmxlU3RhYnMocm9tKTtcbiAgaWYgKGZsYWdzLm9yYnNPcHRpb25hbCgpKSBvcmJzT3B0aW9uYWwocm9tKTtcbn1cblxuLy8gQWRkcyBhIHRyaWdnZXIgYWN0aW9uIHRvIG1lemFtZS4gIFVzZSA4NyBsZWZ0b3ZlciBmcm9tIHJlc2N1aW5nIHplYnUuXG5mdW5jdGlvbiBhZGRNZXphbWVUcmlnZ2VyKHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFt+MHgyZjBdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe2FjdGlvbjogNH0pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmYwXTtcbiAgY29uc3QgbWV6YW1lID0gcm9tLmxvY2F0aW9ucy5tZXphbWVTaHJpbmU7XG4gIG1lemFtZS5zcGF3bnMucHVzaChTcGF3bi5vZih7dGlsZTogMHg4OCwgdHlwZTogMiwgaWQ6IHRyaWdnZXIuaWR9KSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN3b3Jkcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgLy8gd2luZCAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyB3aW5kIDIgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiA2XG4gIC8vIHdpbmQgMyA9PiAyLTMgaGl0cyA4TVAgICAgICAgID0+IDhcblxuICAvLyBmaXJlIDEgPT4gMSBoaXQgICAgICAgICAgICAgICA9PiAzXG4gIC8vIGZpcmUgMiA9PiAzIGhpdHMgICAgICAgICAgICAgID0+IDVcbiAgLy8gZmlyZSAzID0+IDQtNiBoaXRzIDE2TVAgICAgICAgPT4gN1xuXG4gIC8vIHdhdGVyIDEgPT4gMSBoaXQgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2F0ZXIgMiA9PiAxLTIgaGl0cyAgICAgICAgICAgPT4gNlxuICAvLyB3YXRlciAzID0+IDMtNiBoaXRzIDE2TVAgICAgICA9PiA4XG5cbiAgLy8gdGh1bmRlciAxID0+IDEtMiBoaXRzIHNwcmVhZCAgPT4gM1xuICAvLyB0aHVuZGVyIDIgPT4gMS0zIGhpdHMgc3ByZWFkICA9PiA1XG4gIC8vIHRodW5kZXIgMyA9PiA3LTEwIGhpdHMgNDBNUCAgID0+IDdcblxuICByb20ub2JqZWN0c1sweDEwXS5hdGsgPSAzOyAvLyB3aW5kIDFcbiAgcm9tLm9iamVjdHNbMHgxMV0uYXRrID0gNjsgLy8gd2luZCAyXG4gIHJvbS5vYmplY3RzWzB4MTJdLmF0ayA9IDg7IC8vIHdpbmQgM1xuXG4gIHJvbS5vYmplY3RzWzB4MThdLmF0ayA9IDM7IC8vIGZpcmUgMVxuICByb20ub2JqZWN0c1sweDEzXS5hdGsgPSA1OyAvLyBmaXJlIDJcbiAgcm9tLm9iamVjdHNbMHgxOV0uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTddLmF0ayA9IDc7IC8vIGZpcmUgM1xuICByb20ub2JqZWN0c1sweDFhXS5hdGsgPSA3OyAvLyBmaXJlIDNcblxuICByb20ub2JqZWN0c1sweDE0XS5hdGsgPSAzOyAvLyB3YXRlciAxXG4gIHJvbS5vYmplY3RzWzB4MTVdLmF0ayA9IDY7IC8vIHdhdGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxNl0uYXRrID0gODsgLy8gd2F0ZXIgM1xuXG4gIHJvbS5vYmplY3RzWzB4MWNdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuXG4gIGlmIChmbGFncy5zbG93RG93blRvcm5hZG8oKSkge1xuICAgIC8vIFRPRE8gLSB0b3JuYWRvIChvYmogMTIpID0+IHNwZWVkIDA3IGluc3RlYWQgb2YgMDhcbiAgICAvLyAgICAgIC0gbGlmZXRpbWUgaXMgNDgwID0+IDcwIG1heWJlIHRvbyBsb25nLCA2MCBzd2VldCBzcG90P1xuICAgIGNvbnN0IHRvcm5hZG8gPSByb20ub2JqZWN0c1sweDEyXTtcbiAgICB0b3JuYWRvLnNwZWVkID0gMHgwNztcbiAgICB0b3JuYWRvLmRhdGFbMHgwY10gPSAweDYwOyAvLyBpbmNyZWFzZSBsaWZldGltZSAoNDgwKSBieSAyMCVcbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhDb2luU3ByaXRlcyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWzB4NjAsIDB4NjQsIDB4NjUsIDB4NjYsIDB4NjcsIDB4NjgsXG4gICAgICAgICAgICAgICAgICAgICAgMHg2OSwgMHg2YSwgMHg2YiwgMHg2YywgMHg2ZCwgMHg2Zl0pIHtcbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBbMCwgMSwgMl0pIHtcbiAgICAgIHJvbS5wYXR0ZXJuc1twYWdlIDw8IDYgfCBwYXRdLnBpeGVscyA9IHJvbS5wYXR0ZXJuc1sweDVlIDw8IDYgfCBwYXRdLnBpeGVscztcbiAgICB9XG4gIH1cbiAgcm9tLm9iamVjdHNbMHgwY10ubWV0YXNwcml0ZSA9IDB4YTk7XG59XG5cbi8qKlxuICogRml4IHRoZSBzb2Z0bG9jayB0aGF0IGhhcHBlbnMgd2hlbiB5b3UgZ28gdGhyb3VnaFxuICogYSB3YWxsIGJhY2t3YXJkcyBieSBtb3ZpbmcgdGhlIGV4aXQvZW50cmFuY2UgdGlsZXNcbiAqIHVwIGEgYml0IGFuZCBhZGp1c3Rpbmcgc29tZSB0aWxlRWZmZWN0cyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZpeFJldmVyc2VXYWxscyhyb206IFJvbSkge1xuICAvLyBhZGp1c3QgdGlsZSBlZmZlY3QgZm9yIGJhY2sgdGlsZXMgb2YgaXJvbiB3YWxsXG4gIGZvciAoY29uc3QgdCBpbiBbMHgwNCwgMHgwNSwgMHgwOCwgMHgwOV0pIHtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiYyAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGI1IC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gIH1cbiAgLy8gVE9ETyAtIG1vdmUgYWxsIHRoZSBlbnRyYW5jZXMgdG8geT0yMCBhbmQgZXhpdHMgdG8geXQ9MDFcbn1cblxuLyoqIE1ha2UgYSBsYW5kIGJyaWRnZSBpbiB1bmRlcmdyb3VuZCBjaGFubmVsICovXG5mdW5jdGlvbiB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbTogUm9tKSB7XG4gIGNvbnN0IHt0aWxlc30gPSByb20uc2NyZWVuc1sweGExXTtcbiAgdGlsZXNbMHgyOF0gPSAweDlmO1xuICB0aWxlc1sweDM3XSA9IDB4MjM7XG4gIHRpbGVzWzB4MzhdID0gMHgyMzsgLy8gMHg4ZTtcbiAgdGlsZXNbMHgzOV0gPSAweDIxO1xuICB0aWxlc1sweDQ3XSA9IDB4OGQ7XG4gIHRpbGVzWzB4NDhdID0gMHg4ZjtcbiAgdGlsZXNbMHg1Nl0gPSAweDk5O1xuICB0aWxlc1sweDU3XSA9IDB4OWE7XG4gIHRpbGVzWzB4NThdID0gMHg4Yztcbn1cblxuLyoqXG4gKiBSZW1vdmUgdGltZXIgc3Bhd25zLCByZW51bWJlcnMgbWltaWMgc3Bhd25zIHNvIHRoYXQgdGhleSdyZSB1bmlxdWUuXG4gKiBSdW5zIGJlZm9yZSBzaHVmZmxlIGJlY2F1c2Ugd2UgbmVlZCB0byBpZGVudGlmeSB0aGUgc2xvdC4gIFJlcXVpcmVzXG4gKiBhbiBhc3NlbWJseSBjaGFuZ2UgKCQzZDNmZCBpbiBwcmVzaHVmZmxlLnMpXG4gKi9cbmZ1bmN0aW9uIGZpeE1pbWljcyhyb206IFJvbSk6IHZvaWQge1xuICBsZXQgbWltaWMgPSAweDcwO1xuICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghcy5pc0NoZXN0KCkpIGNvbnRpbnVlO1xuICAgICAgcy50aW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKHMuaWQgPj0gMHg3MCkgcy5pZCA9IG1pbWljKys7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBmaW5kIGEgYmV0dGVyIHdheSB0byBidW5kbGUgYXNtIGNoYW5nZXM/XG4gIC8vIHJvbS5hc3NlbWJsZSgpXG4gIC8vICAgICAuJCgnYWRjICQxMCcpXG4gIC8vICAgICAuYmVxKCdsYWJlbCcpXG4gIC8vICAgICAubHNoKClcbiAgLy8gICAgIC5sc2goYCR7YWRkcn0seGApXG4gIC8vICAgICAubGFiZWwoJ2xhYmVsJyk7XG4gIC8vIHJvbS5wYXRjaCgpXG4gIC8vICAgICAub3JnKDB4M2QzZmQpXG4gIC8vICAgICAuYnl0ZSgweGIwKTtcbn1cblxuZnVuY3Rpb24gYWRqdXN0R29hRm9ydHJlc3NUcmlnZ2Vycyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gTW92ZSBLZWxiZXNxdWUgMiBvbmUgdGlsZSBsZWZ0LlxuICBsLmdvYUZvcnRyZXNzS2VsYmVzcXVlLnNwYXduc1swXS54IC09IDg7XG4gIC8vIFJlbW92ZSBzYWdlIHNjcmVlbiBsb2NrcyAoZXhjZXB0IEtlbnN1KS5cbiAgbC5nb2FGb3J0cmVzc1plYnUuc3Bhd25zLnNwbGljZSgxLCAxKTsgLy8gemVidSBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuZ29hRm9ydHJlc3NUb3JuZWwuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gdG9ybmVsIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5nb2FGb3J0cmVzc0FzaW5hLnNwYXducy5zcGxpY2UoMiwgMSk7IC8vIGFzaW5hIHNjcmVlbiBsb2NrIHRyaWdnZXJcbn1cblxuZnVuY3Rpb24gYWxhcm1GbHV0ZUlzS2V5SXRlbShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgY29uc3Qge3dhdGVyZmFsbENhdmU0fSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgLy8gTW92ZSBhbGFybSBmbHV0ZSB0byB0aGlyZCByb3dcbiAgcm9tLml0ZW1HZXRzWzB4MzFdLmludmVudG9yeVJvd1N0YXJ0ID0gMHgyMDtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBkcm9wcGVkXG4gIC8vIHJvbS5wcmdbMHgyMTAyMV0gPSAweDQzOyAvLyBUT0RPIC0gcm9tLml0ZW1zWzB4MzFdLj8/P1xuICByb20uaXRlbXNbMHgzMV0udW5pcXVlID0gdHJ1ZTtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBzb2xkXG4gIHJvbS5pdGVtc1sweDMxXS5iYXNlUHJpY2UgPSAwO1xuXG4gIGlmIChmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gUGVyc29uIDE0IChaZWJ1J3Mgc3R1ZGVudCk6IHNlY29uZGFyeSBpdGVtIC0+IGFsYXJtIGZsdXRlXG4gICAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4MzE7IC8vIE5PVEU6IENsb2JiZXJzIHNodWZmbGVkIGl0ZW0hISFcbiAgfVxuXG4gIC8vIFJlbW92ZSBhbGFybSBmbHV0ZSBmcm9tIHNob3BzIChyZXBsYWNlIHdpdGggb3RoZXIgaXRlbXMpXG4gIC8vIE5PVEUgLSB3ZSBjb3VsZCBzaW1wbGlmeSB0aGlzIHdob2xlIHRoaW5nIGJ5IGp1c3QgaGFyZGNvZGluZyBpbmRpY2VzLlxuICAvLyAgICAgIC0gaWYgdGhpcyBpcyBndWFyYW50ZWVkIHRvIGhhcHBlbiBlYXJseSwgaXQncyBhbGwgdGhlIHNhbWUuXG4gIGNvbnN0IHJlcGxhY2VtZW50cyA9IFtcbiAgICBbMHgyMSwgMC43Ml0sIC8vIGZydWl0IG9mIHBvd2VyLCA3MiUgb2YgY29zdFxuICAgIFsweDFmLCAwLjldLCAvLyBseXNpcyBwbGFudCwgOTAlIG9mIGNvc3RcbiAgXTtcbiAgbGV0IGogPSAwO1xuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AuY29udGVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldICE9PSAweDMxKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtpdGVtLCBwcmljZVJhdGlvXSA9IHJlcGxhY2VtZW50c1soaisrKSAlIHJlcGxhY2VtZW50cy5sZW5ndGhdO1xuICAgICAgc2hvcC5jb250ZW50c1tpXSA9IGl0ZW07XG4gICAgICBpZiAocm9tLnNob3BEYXRhVGFibGVzQWRkcmVzcykge1xuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIGJyb2tlbiAtIG5lZWQgYSBjb250cm9sbGVkIHdheSB0byBjb252ZXJ0IHByaWNlIGZvcm1hdHNcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSBNYXRoLnJvdW5kKHNob3AucHJpY2VzW2ldICogcHJpY2VSYXRpbyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hhbmdlIGZsdXRlIG9mIGxpbWUgY2hlc3QncyAobm93LXVudXNlZCkgaXRlbWdldCB0byBoYXZlIG1lZGljYWwgaGVyYlxuICByb20uaXRlbUdldHNbMHg1Yl0uaXRlbUlkID0gMHgxZDtcbiAgLy8gQ2hhbmdlIHRoZSBhY3R1YWwgc3Bhd24gZm9yIHRoYXQgY2hlc3QgdG8gYmUgdGhlIG1pcnJvcmVkIHNoaWVsZCBjaGVzdFxuICB3YXRlcmZhbGxDYXZlNC5zcGF3bigweDE5KS5pZCA9IDB4MTA7XG5cbiAgLy8gVE9ETyAtIHJlcXVpcmUgbmV3IGNvZGUgZm9yIHR3byB1c2VzXG59XG5cbmZ1bmN0aW9uIGJyb2thaGFuYVdhbnRzTWFkbzEocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3QgYnJva2FoYW5hID0gcm9tLm5wY3NbMHg1NF07XG4gIGNvbnN0IGRpYWxvZyA9IGFzc2VydChicm9rYWhhbmEubG9jYWxEaWFsb2dzLmdldCgtMSkpWzBdO1xuICBpZiAoZGlhbG9nLmNvbmRpdGlvbiAhPT0gfjB4MDI0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgYnJva2FoYW5hIGNvbmRpdGlvbjogJHtkaWFsb2cuY29uZGl0aW9ufWApO1xuICB9XG4gIGRpYWxvZy5jb25kaXRpb24gPSB+MHgwNjc7IC8vIHZhbmlsbGEgYmFsbCBvZiB0aHVuZGVyIC8gZGVmZWF0ZWQgbWFkbyAxXG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vcm1hbGx5IHRoZSBmaXNoZXJtYW4gKCQ2NCkgc3Bhd25zIGluIGhpcyBob3VzZSAoJGQ2KSBpZiB5b3UgaGF2ZVxuICAvLyB0aGUgc2hlbGwgZmx1dGUgKDIzNikuICBIZXJlIHdlIGFsc28gYWRkIGEgcmVxdWlyZW1lbnQgb24gdGhlIGhlYWxlZFxuICAvLyBkb2xwaGluIHNsb3QgKDAyNSksIHdoaWNoIHdlIGtlZXAgYXJvdW5kIHNpbmNlIGl0J3MgYWN0dWFsbHkgdXNlZnVsLlxuICByb20ubnBjc1sweDY0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZDYsIFsweDIzNiwgMHgwMjVdKTtcbiAgLy8gQWxzbyBmaXggZGF1Z2h0ZXIncyBkaWFsb2cgKCQ3YikuXG4gIGNvbnN0IGRhdWdodGVyRGlhbG9nID0gcm9tLm5wY3NbMHg3Yl0ubG9jYWxEaWFsb2dzLmdldCgtMSkhO1xuICBkYXVnaHRlckRpYWxvZy51bnNoaWZ0KGRhdWdodGVyRGlhbG9nWzBdLmNsb25lKCkpO1xuICBkYXVnaHRlckRpYWxvZ1swXS5jb25kaXRpb24gPSB+MHgwMjU7XG4gIGRhdWdodGVyRGlhbG9nWzFdLmNvbmRpdGlvbiA9IH4weDIzNjtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3QgaGF2aW5nIHRlbGVwYXRoeSAoMjQzKSB3aWxsIHRyaWdnZXIgYSBcImt5dSBreXVcIiAoMWE6MTIsIDFhOjEzKSBmb3JcbiAgLy8gYm90aCBnZW5lcmljIGJ1bm5pZXMgKDU5KSBhbmQgZGVvICg1YSkuXG4gIHJvbS5ucGNzWzB4NTldLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxMl0pKTtcbiAgcm9tLm5wY3NbMHg1YV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEzXSkpO1xufVxuXG5mdW5jdGlvbiB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIGl0ZW1nZXQgMDMgc3dvcmQgb2YgdGh1bmRlciA9PiBzZXQgMmZkIHNoeXJvbiB3YXJwIHBvaW50XG4gIHJvbS5pdGVtR2V0c1sweDAzXS5mbGFncy5wdXNoKDB4MmZkKTtcbiAgLy8gZGlhbG9nIDYyIGFzaW5hIGluIGYyL2Y0IHNoeXJvbiAtPiBhY3Rpb24gMWYgKHRlbGVwb3J0IHRvIHN0YXJ0KVxuICAvLyAgIC0gbm90ZTogZjIgYW5kIGY0IGRpYWxvZ3MgYXJlIGxpbmtlZC5cbiAgZm9yIChjb25zdCBpIG9mIFswLCAxLCAzXSkge1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFsweGYyLCAweGY0XSkge1xuICAgICAgcm9tLm5wY3NbMHg2Ml0ubG9jYWxEaWFsb2dzLmdldChsb2MpIVtpXS5tZXNzYWdlLmFjdGlvbiA9IDB4MWY7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBDaGFuZ2Ugc3dvcmQgb2YgdGh1bmRlcidzIGFjdGlvbiB0byBiYmUgdGhlIHNhbWUgYXMgb3RoZXIgc3dvcmRzICgxNilcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmFjcXVpc2l0aW9uQWN0aW9uLmFjdGlvbiA9IDB4MTY7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEl0ZW1OYW1lcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgaWYgKGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgLy8gcmVuYW1lIGxlYXRoZXIgYm9vdHMgdG8gc3BlZWQgYm9vdHNcbiAgICBjb25zdCBsZWF0aGVyQm9vdHMgPSByb20uaXRlbXNbMHgyZl0hO1xuICAgIGxlYXRoZXJCb290cy5tZW51TmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgbGVhdGhlckJvb3RzLm1lc3NhZ2VOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBpZiAoZmxhZ3MuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpKSB7XG4gICAgICBjb25zdCBnYXNNYXNrID0gcm9tLml0ZW1zWzB4MjldO1xuICAgICAgZ2FzTWFzay5tZW51TmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgICBnYXNNYXNrLm1lc3NhZ2VOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICB9XG4gIH1cblxuICAvLyByZW5hbWUgYmFsbHMgdG8gb3Jic1xuICBmb3IgKGxldCBpID0gMHgwNTsgaSA8IDB4MGM7IGkgKz0gMikge1xuICAgIHJvbS5pdGVtc1tpXS5tZW51TmFtZSA9IHJvbS5pdGVtc1tpXS5tZW51TmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICAgIHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZSA9IHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VCcmFjZWxldHNQcm9ncmVzc2l2ZShyb206IFJvbSk6IHZvaWQge1xuICAvLyB0b3JuZWwncyB0cmlnZ2VyIG5lZWRzIGJvdGggaXRlbXNcbiAgY29uc3QgdG9ybmVsID0gcm9tLm5wY3NbMHg1Zl07XG4gIGNvbnN0IHZhbmlsbGEgPSB0b3JuZWwubG9jYWxEaWFsb2dzLmdldCgweDIxKSE7XG4gIGNvbnN0IHBhdGNoZWQgPSBbXG4gICAgdmFuaWxsYVswXSwgLy8gYWxyZWFkeSBsZWFybmVkIHRlbGVwb3J0XG4gICAgdmFuaWxsYVsyXSwgLy8gZG9uJ3QgaGF2ZSB0b3JuYWRvIGJyYWNlbGV0XG4gICAgdmFuaWxsYVsyXS5jbG9uZSgpLCAvLyB3aWxsIGNoYW5nZSB0byBkb24ndCBoYXZlIG9yYlxuICAgIHZhbmlsbGFbMV0sIC8vIGhhdmUgYnJhY2VsZXQsIGxlYXJuIHRlbGVwb3J0XG4gIF07XG4gIHBhdGNoZWRbMV0uY29uZGl0aW9uID0gfjB4MjA2OyAvLyBkb24ndCBoYXZlIGJyYWNlbGV0XG4gIHBhdGNoZWRbMl0uY29uZGl0aW9uID0gfjB4MjA1OyAvLyBkb24ndCBoYXZlIG9yYlxuICBwYXRjaGVkWzNdLmNvbmRpdGlvbiA9IH4wOyAgICAgLy8gZGVmYXVsdFxuICB0b3JuZWwubG9jYWxEaWFsb2dzLnNldCgweDIxLCBwYXRjaGVkKTtcbn1cblxuZnVuY3Rpb24gc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBbcm9tLmxvY2F0aW9ucy5jb3JkZWxQbGFpbnNFYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLnVuZGVyZ3JvdW5kQ2hhbm5lbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcm9tLmxvY2F0aW9ucy5raXJpc2FNZWFkb3ddKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIHNldCB0aGUgbmV3IFwiaW52aXNpYmxlXCIgZmxhZyBvbiB0aGUgY2hlc3QuXG4gICAgICBpZiAoc3Bhd24uaXNDaGVzdCgpKSBzcGF3bi5kYXRhWzJdIHw9IDB4MjA7XG4gICAgfVxuICB9XG59XG5cbi8vIEFkZCB0aGUgc3RhdHVlIG9mIG9ueXggYW5kIHBvc3NpYmx5IHRoZSB0ZWxlcG9ydCBibG9jayB0cmlnZ2VyIHRvIENvcmRlbCBXZXN0XG5mdW5jdGlvbiBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIGNvbnN0IHtjb3JkZWxQbGFpbnNFYXN0LCBjb3JkZWxQbGFpbnNXZXN0fSA9IHJvbS5sb2NhdGlvbnM7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2YgY29yZGVsUGxhaW5zRWFzdC5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNDaGVzdCgpIHx8IChmbGFncy5kaXNhYmxlVGVsZXBvcnRTa2lwKCkgJiYgc3Bhd24uaXNUcmlnZ2VyKCkpKSB7XG4gICAgICAvLyBDb3B5IGlmICgxKSBpdCdzIHRoZSBjaGVzdCwgb3IgKDIpIHdlJ3JlIGRpc2FibGluZyB0ZWxlcG9ydCBza2lwXG4gICAgICBjb3JkZWxQbGFpbnNXZXN0LnNwYXducy5wdXNoKHNwYXduLmNsb25lKCkpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhSYWJiaXRTa2lwKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5tdFNhYnJlTm9ydGhNYWluLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4Nikge1xuICAgICAgaWYgKHNwYXduLnggPT09IDB4NzQwKSB7XG4gICAgICAgIHNwYXduLnggKz0gMTY7XG4gICAgICAgIHNwYXduLnkgKz0gMTY7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZFRvd2VyRXhpdChyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7dG93ZXJFbnRyYW5jZSwgY3J5cHRUZWxlcG9ydGVyfSA9IHJvbS5sb2NhdGlvbnM7XG4gIGNvbnN0IGVudHJhbmNlID0gY3J5cHRUZWxlcG9ydGVyLmVudHJhbmNlcy5sZW5ndGg7XG4gIGNvbnN0IGRlc3QgPSBjcnlwdFRlbGVwb3J0ZXIuaWQ7XG4gIGNyeXB0VGVsZXBvcnRlci5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7dGlsZTogMHg2OH0pKTtcbiAgdG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTcsIGRlc3QsIGVudHJhbmNlfSkpO1xuICB0b3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1OCwgZGVzdCwgZW50cmFuY2V9KSk7XG59XG5cbi8vIFByb2dyYW1tYXRpY2FsbHkgYWRkIGEgaG9sZSBiZXR3ZWVuIHZhbGxleSBvZiB3aW5kIGFuZCBsaW1lIHRyZWUgdmFsbGV5XG5mdW5jdGlvbiBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge3ZhbGxleU9mV2luZCwgbGltZVRyZWVWYWxsZXl9ID0gcm9tLmxvY2F0aW9ucztcblxuICB2YWxsZXlPZldpbmQuc2NyZWVuc1s1XVs0XSA9IDB4MTA7IC8vIG5ldyBleGl0XG4gIGxpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMV1bMF0gPSAweDFhOyAvLyBuZXcgZXhpdFxuICBsaW1lVHJlZVZhbGxleS5zY3JlZW5zWzJdWzBdID0gMHgwYzsgLy8gbmljZXIgbW91bnRhaW5zXG5cbiAgY29uc3Qgd2luZEVudHJhbmNlID1cbiAgICAgIHZhbGxleU9mV2luZC5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHg0ZWYsIHk6IDB4NTc4fSkpIC0gMTtcbiAgY29uc3QgbGltZUVudHJhbmNlID1cbiAgICAgIGxpbWVUcmVlVmFsbGV5LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDAxMCwgeTogMHgxYzB9KSkgLSAxO1xuXG4gIHZhbGxleU9mV2luZC5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTYwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NzAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSk7XG4gIGxpbWVUcmVlVmFsbGV5LmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYjAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFjMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pKTtcbn1cblxuZnVuY3Rpb24gY2xvc2VDYXZlRW50cmFuY2VzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBQcmV2ZW50IHNvZnRsb2NrIGZyb20gZXhpdGluZyBzZWFsZWQgY2F2ZSBiZWZvcmUgd2luZG1pbGwgc3RhcnRlZFxuICByb20ubG9jYXRpb25zLnZhbGxleU9mV2luZC5lbnRyYW5jZXNbMV0ueSArPSAxNjtcblxuICAvLyBDbGVhciB0aWxlcyAxLDIsMyw0IGZvciBibG9ja2FibGUgY2F2ZXMgaW4gdGlsZXNldHMgOTAsIDk0LCBhbmQgOWNcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTBdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwNywgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDBlLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjAsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5NCwgMHg5Y10sXG4gICAgICAgICAgICAgICAgICAgIFsweDY4LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODMsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDg5LCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG5cbiAgLy8gTm93IHJlcGxhY2UgdGhlIHRpbGVzIHdpdGggdGhlIGJsb2NrYWJsZSBvbmVzXG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDc5XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4N2FdID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4OV0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDhhXSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NThdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTZdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1N10gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY2XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjddID0gMHgwNDtcblxuICAvLyBEZXN0cnVjdHVyZSBvdXQgYSBmZXcgbG9jYXRpb25zIGJ5IG5hbWVcbiAgY29uc3Qge1xuICAgIHZhbGxleU9mV2luZCxcbiAgICBjb3JkZWxQbGFpbnNXZXN0LFxuICAgIGNvcmRlbFBsYWluc0Vhc3QsXG4gICAgd2F0ZXJmYWxsVmFsbGV5Tm9ydGgsXG4gICAgd2F0ZXJmYWxsVmFsbGV5U291dGgsXG4gICAga2lyaXNhTWVhZG93LFxuICAgIHNhaGFyYU91dHNpZGVDYXZlLFxuICAgIGRlc2VydDIsXG4gIH0gPSByb20ubG9jYXRpb25zO1xuXG4gIC8vIE5PVEU6IGZsYWcgMmYwIGlzIEFMV0FZUyBzZXQgLSB1c2UgaXQgYXMgYSBiYXNlbGluZS5cbiAgY29uc3QgZmxhZ3NUb0NsZWFyOiBbTG9jYXRpb24sIG51bWJlcl1bXSA9IFtcbiAgICBbdmFsbGV5T2ZXaW5kLCAweDMwXSwgLy8gdmFsbGV5IG9mIHdpbmQsIHplYnUncyBjYXZlXG4gICAgW2NvcmRlbFBsYWluc1dlc3QsIDB4MzBdLCAvLyBjb3JkZWwgd2VzdCwgdmFtcGlyZSBjYXZlXG4gICAgW2NvcmRlbFBsYWluc0Vhc3QsIDB4MzBdLCAvLyBjb3JkZWwgZWFzdCwgdmFtcGlyZSBjYXZlXG4gICAgW3dhdGVyZmFsbFZhbGxleU5vcnRoLCAweDAwXSwgLy8gd2F0ZXJmYWxsIG5vcnRoLCBwcmlzb24gY2F2ZVxuICAgIFt3YXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgxNF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgZm9nIGxhbXBcbiAgICBbd2F0ZXJmYWxsVmFsbGV5U291dGgsIDB4NzRdLCAvLyB3YXRlcmZhbGwgc291dGgsIGtpcmlzYVxuICAgIFtraXJpc2FNZWFkb3csIDB4MTBdLCAvLyBraXJpc2EgbWVhZG93XG4gICAgW3NhaGFyYU91dHNpZGVDYXZlLCAweDAwXSwgLy8gY2F2ZSB0byBkZXNlcnRcbiAgICBbZGVzZXJ0MiwgMHg0MV0sXG4gIF07XG4gIGlmIChmbGFncy5hZGRFYXN0Q2F2ZSgpICYmIGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgZmxhZ3NUb0NsZWFyLnB1c2goW3JvbS5sb2NhdGlvbnMubGltZVRyZWVWYWxsZXksIDB4MTBdKTtcbiAgfVxuICBmb3IgKGNvbnN0IFtsb2MsIHl4XSBvZiBmbGFnc1RvQ2xlYXIpIHtcbiAgICBsb2MuZmxhZ3MucHVzaChGbGFnLm9mKHt5eCwgZmxhZzogMHgyZjB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlRmxhZyhsb2M6IExvY2F0aW9uLCB5eDogbnVtYmVyLCBmbGFnOiBudW1iZXIpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICBpZiAoZi55eCA9PT0geXgpIHtcbiAgICAgICAgZi5mbGFnID0gZmxhZztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGZsYWcgdG8gcmVwbGFjZSBhdCAke2xvY306JHt5eH1gKTtcbiAgfTtcblxuICBpZiAoZmxhZ3MucGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKSkgeyAvLyBjbG9zZSBvZmYgcmV2ZXJzZSBlbnRyYW5jZXNcbiAgICAvLyBOT1RFOiB3ZSBjb3VsZCBhbHNvIGNsb3NlIGl0IG9mZiB1bnRpbCBib3NzIGtpbGxlZC4uLj9cbiAgICAvLyAgLSBjb25zdCB2YW1waXJlRmxhZyA9IH5yb20ubnBjU3Bhd25zWzB4YzBdLmNvbmRpdGlvbnNbMHgwYV1bMF07XG4gICAgLy8gIC0+IGtlbGJlc3F1ZSBmb3IgdGhlIG90aGVyIG9uZS5cbiAgICBjb25zdCB3aW5kbWlsbEZsYWcgPSAweDJlZTtcbiAgICByZXBsYWNlRmxhZyhjb3JkZWxQbGFpbnNXZXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuICAgIHJlcGxhY2VGbGFnKGNvcmRlbFBsYWluc0Vhc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG5cbiAgICByZXBsYWNlRmxhZyh3YXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMCwgMHgyZDgpOyAvLyBrZXkgdG8gcHJpc29uIGZsYWdcbiAgICBjb25zdCBleHBsb3Npb24gPSBTcGF3bi5vZih7eTogMHgwNjAsIHg6IDB4MDYwLCB0eXBlOiA0LCBpZDogMHgyY30pO1xuICAgIGNvbnN0IGtleVRyaWdnZXIgPSBTcGF3bi5vZih7eTogMHgwNzAsIHg6IDB4MDcwLCB0eXBlOiAyLCBpZDogMHhhZH0pO1xuICAgIHdhdGVyZmFsbFZhbGxleU5vcnRoLnNwYXducy5zcGxpY2UoMSwgMCwgZXhwbG9zaW9uKTtcbiAgICB3YXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMucHVzaChrZXlUcmlnZ2VyKTtcbiAgfVxuXG4gIC8vIHJvbS5sb2NhdGlvbnNbMHgxNF0udGlsZUVmZmVjdHMgPSAweGIzO1xuXG4gIC8vIGQ3IGZvciAzP1xuXG4gIC8vIFRPRE8gLSB0aGlzIGVuZGVkIHVwIHdpdGggbWVzc2FnZSAwMDowMyBhbmQgYW4gYWN0aW9uIHRoYXQgZ2F2ZSBib3cgb2YgbW9vbiFcblxuICAvLyByb20udHJpZ2dlcnNbMHgxOV0ubWVzc2FnZS5wYXJ0ID0gMHgxYjtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UuaW5kZXggPSAweDA4O1xuICAvLyByb20udHJpZ2dlcnNbMHgxOV0uZmxhZ3MucHVzaCgweDJmNiwgMHgyZjcsIDB4MmY4KTtcbn1cblxuLy8gQHRzLWlnbm9yZTogbm90IHlldCB1c2VkXG5mdW5jdGlvbiBlYXN0Q2F2ZShyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgLy8gVE9ETyBmaWxsIHVwIGdyYXBoaWNzLCBldGMgLS0+ICQxYSwgJDFiLCAkMDUgLyAkODgsICRiNSAvICQxNCwgJDAyXG4gIC8vIFRoaW5rIGFvYnV0IGV4aXRzIGFuZCBlbnRyYW5jZXMuLi4/XG5cbiAgY29uc3Qge3ZhbGxleU9mV2luZCwgbGltZVRyZWVWYWxsZXksIHNlYWxlZENhdmUxfSA9IHJvbS5sb2NhdGlvbnM7XG5cbiAgY29uc3QgbG9jMSA9IHJvbS5sb2NhdGlvbnNbMHgwYl07XG4gIGNvbnN0IGxvYzIgPSByb20ubG9jYXRpb25zWzB4MGRdO1xuXG4gIC8vIE5PVEU6IDB4OWMgY2FuIGJlY29tZSAweDk5IGluIHRvcCBsZWZ0IG9yIDB4OTcgaW4gdG9wIHJpZ2h0IG9yIGJvdHRvbSBtaWRkbGUgZm9yIGEgY2F2ZSBleGl0XG4gIGxvYzEuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg4MCwgMHg4MywgMHg5Y10sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MywgMHg4NiwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MywgMHg4OCwgMHg4OSwgMHg4MCwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICBbMHg4MSwgMHg4YywgMHg4NSwgMHg4MiwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5ZSwgMHg4NSwgMHg5YywgMHg5OCwgMHg4Nl1dO1xuXG4gIGxvYzIuc2NyZWVucyA9IFtbMHg5YywgMHg4NCwgMHg5YiwgMHg4MCwgMHg5Yl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MSwgMHg4MCwgMHg4MV0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4NywgMHg4YiwgMHg4YSwgMHg4Nl0sXG4gICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4YywgMHg4MCwgMHg4NSwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICBbMHg5YywgMHg4NiwgMHg4MCwgMHg4MCwgMHg5YV1dO1xuICBsb2MxLm5hbWUgPSAnRWFzdCBDYXZlIDEnO1xuICBsb2MyLm5hbWUgPSAnRWFzdCBDYXZlIDInO1xuXG4gIGZvciAoY29uc3QgbCBvZiBbbG9jMSwgbG9jMl0pIHtcbiAgICBsLmJnbSA9IDB4MTc7IC8vIG10IHNhYnJlIGNhdmUgbXVzaWM/XG4gICAgbC5lbnRyYW5jZXMgPSBbXTtcbiAgICBsLmV4aXRzID0gW107XG4gICAgbC5waXRzID0gW107XG4gICAgbC5zcGF3bnMgPSBbXTtcbiAgICBsLmZsYWdzID0gW107XG4gICAgbC5oZWlnaHQgPSBsLnNjcmVlbnMubGVuZ3RoO1xuICAgIGwud2lkdGggPSBsLnNjcmVlbnNbMF0ubGVuZ3RoO1xuICAgIGwudXNlZCA9IGwuaGFzU3Bhd25zID0gdHJ1ZTtcbiAgICBsLmV4dGVuZGVkID0gMDtcbiAgICBsLnRpbGVQYWxldHRlcyA9IFsweDFhLCAweDFiLCAweDA1XTtcbiAgICBsLnRpbGVzZXQgPSAweDg4O1xuICAgIGwudGlsZUVmZmVjdHMgPSAweGI1O1xuICAgIGwudGlsZVBhdHRlcm5zID0gWzB4MTQsIDB4MDJdO1xuICAgIGwuc3ByaXRlUGF0dGVybnMgPSBbLi4uc2VhbGVkQ2F2ZTEuc3ByaXRlUGF0dGVybnNdIGFzIFtudW1iZXIsIG51bWJlcl07XG4gICAgbC5zcHJpdGVQYWxldHRlcyA9IFsuLi5zZWFsZWRDYXZlMS5zcHJpdGVQYWxldHRlc10gYXMgW251bWJlciwgbnVtYmVyXTtcbiAgfVxuXG4gIC8vIEFkZCBlbnRyYW5jZSB0byB2YWxsZXkgb2Ygd2luZFxuICAvLyBUT0RPIC0gbWF5YmUganVzdCBkbyAoMHgzMywgW1sweDE5XV0pIG9uY2Ugd2UgZml4IHRoYXQgc2NyZWVuIGZvciBncmFzc1xuICB2YWxsZXlPZldpbmQud3JpdGVTY3JlZW5zMmQoMHgyMywgW1xuICAgIFsweDExLCAweDBkXSxcbiAgICBbMHgwOSwgMHhjMl1dKTtcbiAgcm9tLnRpbGVFZmZlY3RzWzBdLmVmZmVjdHNbMHhjMF0gPSAwO1xuICAvLyBUT0RPIC0gZG8gdGhpcyBvbmNlIHdlIGZpeCB0aGUgc2VhIHRpbGVzZXRcbiAgLy8gcm9tLnNjcmVlbnNbMHhjMl0udGlsZXNbMHg1YV0gPSAweDBhO1xuICAvLyByb20uc2NyZWVuc1sweGMyXS50aWxlc1sweDViXSA9IDB4MGE7XG5cbiAgLy8gQ29ubmVjdCBtYXBzXG4gIGxvYzEuY29ubmVjdCgweDQzLCBsb2MyLCAweDQ0KTtcbiAgbG9jMS5jb25uZWN0KDB4NDAsIHZhbGxleU9mV2luZCwgMHgzNCk7XG5cbiAgaWYgKGZsYWdzLmNvbm5lY3RMaW1lVHJlZVRvTGVhZigpKSB7XG4gICAgLy8gQWRkIGVudHJhbmNlIHRvIGxpbWUgdHJlZSB2YWxsZXlcbiAgICBsaW1lVHJlZVZhbGxleS5yZXNpemVTY3JlZW5zKDAsIDEsIDAsIDApOyAvLyBhZGQgb25lIHNjcmVlbiB0byBsZWZ0IGVkZ2VcbiAgICBsaW1lVHJlZVZhbGxleS53cml0ZVNjcmVlbnMyZCgweDAwLCBbXG4gICAgICBbMHgwYywgMHgxMV0sXG4gICAgICBbMHgxNSwgMHgzNl0sXG4gICAgICBbMHgwZSwgMHgwZl1dKTtcbiAgICBsb2MxLnNjcmVlbnNbMF1bNF0gPSAweDk3OyAvLyBkb3duIHN0YWlyXG4gICAgbG9jMS5jb25uZWN0KDB4MDQsIGxpbWVUcmVlVmFsbGV5LCAweDEwKTtcbiAgfVxuXG4gIC8vIEFkZCBtb25zdGVyc1xuICBsb2MxLnNwYXducy5wdXNoKFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MjEsIHRpbGU6IDB4ODcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMiwgdGlsZTogMHg4OCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxMywgdGlsZTogMHg4OSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMyLCB0aWxlOiAweDY4LCB0aW1lZDogZmFsc2UsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDQxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgwMywgdGlsZTogMHg4OCwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgbG9jMi5zcGF3bnMucHVzaChcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDAxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTEsIHRpbGU6IDB4NDgsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MTIsIHRpbGU6IDB4NzcsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgxNCwgdGlsZTogMHgyOCwgdGltZWQ6IGZhbHNlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHgyMywgdGlsZTogMHg4NSwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgICBTcGF3bi5vZih7c2NyZWVuOiAweDMxLCB0aWxlOiAweDg4LCB0aW1lZDogdHJ1ZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzMsIHRpbGU6IDB4OGEsIHRpbWVkOiBmYWxzZSwgaWQ6IDB4Mn0pLFxuICAgIFNwYXduLm9mKHtzY3JlZW46IDB4MzQsIHRpbGU6IDB4OTgsIHRpbWVkOiB0cnVlLCBpZDogMHgyfSksXG4gICAgU3Bhd24ub2Yoe3NjcmVlbjogMHg0MSwgdGlsZTogMHg4MiwgdGltZWQ6IHRydWUsIGlkOiAweDJ9KSxcbiAgKTtcbiAgaWYgKCFmbGFncy56ZWJ1U3R1ZGVudEdpdmVzSXRlbSgpKSB7XG4gICAgLy8gY2hlc3Q6IGFsYXJtIGZsdXRlXG4gICAgbG9jMi5zcGF3bnMucHVzaChTcGF3bi5vZih7eTogMHgxMTAsIHg6IDB4NDc4LCB0eXBlOiAyLCBpZDogMHgzMX0pKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gYWRkWm9tYmllV2FycChyb206IFJvbSkge1xuICAvLyBNYWtlIHNwYWNlIGZvciB0aGUgbmV3IGZsYWcgYmV0d2VlbiBKb2VsIGFuZCBTd2FuXG4gIGZvciAobGV0IGkgPSAweDJmNTsgaSA8IDB4MmZjOyBpKyspIHtcbiAgICByb20ubW92ZUZsYWcoaSwgaSAtIDEpO1xuICB9XG4gIC8vIFVwZGF0ZSB0aGUgbWVudVxuICBjb25zdCBtZXNzYWdlID0gcm9tLm1lc3NhZ2VzLnBhcnRzWzB4MjFdWzBdO1xuICBtZXNzYWdlLnRleHQgPSBbXG4gICAgJyB7MWE6TGVhZn0gICAgICB7MTY6QnJ5bm1hZXJ9IHsxZDpPYWt9ICcsXG4gICAgJ3swYzpOYWRhcmV9XFwncyAgezFlOlBvcnRvYX0gICB7MTQ6QW1hem9uZXN9ICcsXG4gICAgJ3sxOTpKb2VsfSAgICAgIFpvbWJpZSAgIHsyMDpTd2FufSAnLFxuICAgICd7MjM6U2h5cm9ufSAgICB7MTg6R29hfSAgICAgIHsyMTpTYWhhcmF9JyxcbiAgXS5qb2luKCdcXG4nKTtcbiAgLy8gQWRkIGEgdHJpZ2dlciB0byB0aGUgZW50cmFuY2UgLSB0aGVyZSdzIGFscmVhZHkgYSBzcGF3biBmb3IgOGFcbiAgLy8gYnV0IHdlIGNhbid0IHJldXNlIHRoYXQgc2luY2UgaXQncyB0aGUgc2FtZSBhcyB0aGUgb25lIG91dHNpZGVcbiAgLy8gdGhlIG1haW4gRVNJIGVudHJhbmNlOyBzbyByZXVzZSBhIGRpZmZlcmVudCBvbmUuXG4gIGNvbnN0IHRyaWdnZXIgPSByb20ubmV4dEZyZWVUcmlnZ2VyKCk7XG4gIHRyaWdnZXIudXNlZCA9IHRydWU7XG4gIHRyaWdnZXIuY29uZGl0aW9ucyA9IFtdO1xuICB0cmlnZ2VyLm1lc3NhZ2UgPSBNZXNzYWdlSWQub2Yoe30pO1xuICB0cmlnZ2VyLmZsYWdzID0gWzB4MmZiXTsgLy8gbmV3IHdhcnAgcG9pbnQgZmxhZ1xuICAvLyBBY3R1YWxseSByZXBsYWNlIHRoZSB0cmlnZ2VyLlxuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuem9tYmllVG93bi5zcGF3bnMpIHtcbiAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkgJiYgc3Bhd24uaWQgPT09IDB4OGEpIHtcbiAgICAgIHNwYXduLmlkID0gdHJpZ2dlci5pZDtcbiAgICB9ICAgIFxuICB9XG4gIC8vIEluc2VydCBpbnRvIHRoZSB3YXJwIHRhYmxlLlxuICBmb3IgKGxldCBpID0gMHgzZGM2MjsgaSA+PSAweDNkYzVmOyBpLS0pIHtcbiAgICByb20ucHJnW2kgKyAxXSA9IHJvbS5wcmdbaV07XG4gIH1cbiAgcm9tLnByZ1sweDNkYzVmXSA9IHJvbS5sb2NhdGlvbnMuem9tYmllVG93bi5pZDtcbiAgLy8gQVNNIGZpeGVzIHNob3VsZCBoYXZlIGhhcHBlbmVkIGluIHByZXNodWZmbGUuc1xufVxuXG5mdW5jdGlvbiBldmlsU3Bpcml0SXNsYW5kUmVxdWlyZXNEb2xwaGluKHJvbTogUm9tKSB7XG4gIHJvbS50cmlnZ2VyKDB4OGEpLmNvbmRpdGlvbnMgPSBbfjB4MGVlXTsgLy8gbmV3IGZsYWcgZm9yIHJpZGluZyBkb2xwaGluXG4gIHJvbS5tZXNzYWdlcy5wYXJ0c1sweDFkXVsweDEwXS50ZXh0ID0gYFRoZSBjYXZlIGVudHJhbmNlIGFwcGVhcnNcbnRvIGJlIHVuZGVyd2F0ZXIuIFlvdSdsbFxubmVlZCB0byBzd2ltLmA7XG59XG5cbmZ1bmN0aW9uIHJldmVyc2libGVTd2FuR2F0ZShyb206IFJvbSkge1xuICAvLyBBbGxvdyBvcGVuaW5nIFN3YW4gZnJvbSBlaXRoZXIgc2lkZSBieSBhZGRpbmcgYSBwYWlyIG9mIGd1YXJkcyBvbiB0aGVcbiAgLy8gb3Bwb3NpdGUgc2lkZSBvZiB0aGUgZ2F0ZS5cbiAgcm9tLmxvY2F0aW9uc1sweDczXS5zcGF3bnMucHVzaChcbiAgICAvLyBOT1RFOiBTb2xkaWVycyBtdXN0IGNvbWUgaW4gcGFpcnMgKHdpdGggaW5kZXggXjEgZnJvbSBlYWNoIG90aGVyKVxuICAgIFNwYXduLm9mKHt4dDogMHgwYSwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBiLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGUsIHl0OiAweDBhLCB0eXBlOiAyLCBpZDogMHhiM30pLCAvLyBuZXcgdHJpZ2dlcjogZXJhc2UgZ3VhcmRzXG4gICk7XG5cbiAgLy8gR3VhcmRzICgkMmQpIGF0IHN3YW4gZ2F0ZSAoJDczKSB+IHNldCAxMGQgYWZ0ZXIgb3BlbmluZyBnYXRlID0+IGNvbmRpdGlvbiBmb3IgZGVzcGF3blxuICByb20ubnBjc1sweDJkXS5sb2NhbERpYWxvZ3MuZ2V0KDB4NzMpIVswXS5mbGFncy5wdXNoKDB4MTBkKTtcblxuICAvLyBEZXNwYXduIGd1YXJkIHRyaWdnZXIgcmVxdWlyZXMgMTBkXG4gIHJvbS50cmlnZ2VyKDB4YjMpLmNvbmRpdGlvbnMucHVzaCgweDEwZCk7XG59XG5cbmZ1bmN0aW9uIHByZXZlbnROcGNEZXNwYXducyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgZnVuY3Rpb24gcmVtb3ZlPFQ+KGFycjogVFtdLCBlbGVtOiBUKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuaW5kZXhPZihlbGVtKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgJHtlbGVtfSBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVJZjxUPihhcnI6IFRbXSwgcHJlZDogKGVsZW06IFQpID0+IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5maW5kSW5kZXgocHJlZCk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhbG9nKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyID0gLTEpOiBMb2NhbERpYWxvZ1tdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0ubG9jYWxEaWFsb2dzLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZGlhbG9nICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gc3Bhd25zKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBzcGF3biBjb25kaXRpb24gJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIExpbmsgc29tZSByZWR1bmRhbnQgTlBDczogS2Vuc3UgKDdlLCA3NCkgYW5kIEFrYWhhbmEgKDg4LCAxNilcbiAgcm9tLm5wY3NbMHg3NF0ubGluaygweDdlKTtcbiAgcm9tLm5wY3NbMHg3NF0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4NzRdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHg3ZV0uZGF0YV0gYXMgYW55O1xuICByb20ubG9jYXRpb25zLnN3YW5EYW5jZUhhbGwuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHg3ZSkhLmlkID0gMHg3NDtcbiAgcm9tLml0ZW1zWzB4M2JdLnRyYWRlSW4hWzBdID0gMHg3NDtcblxuICAvLyBkaWFsb2cgaXMgc2hhcmVkIGJldHdlZW4gODggYW5kIDE2LlxuICByb20ubnBjc1sweDg4XS5saW5rRGlhbG9nKDB4MTYpO1xuXG4gIC8vIE1ha2UgYSBuZXcgTlBDIGZvciBBa2FoYW5hIGluIEJyeW5tYWVyOyBvdGhlcnMgd29uJ3QgYWNjZXB0IHRoZSBTdGF0dWUgb2YgT255eC5cbiAgLy8gTGlua2luZyBzcGF3biBjb25kaXRpb25zIGFuZCBkaWFsb2dzIGlzIHN1ZmZpY2llbnQsIHNpbmNlIHRoZSBhY3R1YWwgTlBDIElEXG4gIC8vICgxNiBvciA4MikgaXMgd2hhdCBtYXR0ZXJzIGZvciB0aGUgdHJhZGUtaW5cbiAgcm9tLm5wY3NbMHg4Ml0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4ODJdLmxpbmsoMHgxNik7XG4gIHJvbS5ucGNzWzB4ODJdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHgxNl0uZGF0YV0gYXMgYW55OyAvLyBlbnN1cmUgZ2l2ZSBpdGVtXG4gIHJvbS5sb2NhdGlvbnMuYnJ5bm1hZXIuc3Bhd25zLmZpbmQocyA9PiBzLmlzTnBjKCkgJiYgcy5pZCA9PT0gMHgxNikhLmlkID0gMHg4MjtcbiAgcm9tLml0ZW1zWzB4MjVdLnRyYWRlSW4hWzBdID0gMHg4MjtcblxuICAvLyBMZWFmIGVsZGVyIGluIGhvdXNlICgkMGQgQCAkYzApIH4gc3dvcmQgb2Ygd2luZCByZWR1bmRhbnQgZmxhZ1xuICAvLyBkaWFsb2coMHgwZCwgMHhjMClbMl0uZmxhZ3MgPSBbXTtcbiAgLy9yb20uaXRlbUdldHNbMHgwMF0uZmxhZ3MgPSBbXTsgLy8gY2xlYXIgcmVkdW5kYW50IGZsYWdcblxuICAvLyBMZWFmIHJhYmJpdCAoJDEzKSBub3JtYWxseSBzdG9wcyBzZXR0aW5nIGl0cyBmbGFnIGFmdGVyIHByaXNvbiBkb29yIG9wZW5lZCxcbiAgLy8gYnV0IHRoYXQgZG9lc24ndCBuZWNlc3NhcmlseSBvcGVuIG10IHNhYnJlLiAgSW5zdGVhZCAoYSkgdHJpZ2dlciBvbiAwNDdcbiAgLy8gKHNldCBieSA4ZCB1cG9uIGVudGVyaW5nIGVsZGVyJ3MgY2VsbCkuICBBbHNvIG1ha2Ugc3VyZSB0aGF0IHRoYXQgcGF0aCBhbHNvXG4gIC8vIHByb3ZpZGVzIHRoZSBuZWVkZWQgZmxhZyB0byBnZXQgaW50byBtdCBzYWJyZS5cbiAgZGlhbG9nKDB4MTMpWzJdLmNvbmRpdGlvbiA9IDB4MDQ3O1xuICBkaWFsb2coMHgxMylbMl0uZmxhZ3MgPSBbMHgwYTldO1xuICBkaWFsb2coMHgxMylbM10uZmxhZ3MgPSBbMHgwYTldO1xuXG4gIC8vIFdpbmRtaWxsIGd1YXJkICgkMTQgQCAkMGUpIHNob3VsZG4ndCBkZXNwYXduIGFmdGVyIGFiZHVjdGlvbiAoMDM4KSxcbiAgLy8gYnV0IGluc3RlYWQgYWZ0ZXIgZ2l2aW5nIHRoZSBpdGVtICgwODgpXG4gIHNwYXducygweDE0LCAweDBlKVsxXSA9IH4weDA4ODsgLy8gcmVwbGFjZSBmbGFnIH4wMzggPT4gfjA4OFxuICAvL2RpYWxvZygweDE0LCAweDBlKVswXS5mbGFncyA9IFtdOyAvLyByZW1vdmUgcmVkdW5kYW50IGZsYWcgfiB3aW5kbWlsbCBrZXlcblxuICAvLyBBa2FoYW5hICgkMTYgLyA4OCkgfiBzaGllbGQgcmluZyByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDE2LCAweDU3KVswXS5mbGFncyA9IFtdO1xuICAvLyBEb24ndCBkaXNhcHBlYXIgYWZ0ZXIgZ2V0dGluZyBiYXJyaWVyIChub3RlIDg4J3Mgc3Bhd25zIG5vdCBsaW5rZWQgdG8gMTYpXG4gIHJlbW92ZShzcGF3bnMoMHgxNiwgMHg1NyksIH4weDA1MSk7XG4gIHJlbW92ZShzcGF3bnMoMHg4OCwgMHg1NyksIH4weDA1MSk7XG5cbiAgZnVuY3Rpb24gcmV2ZXJzZURpYWxvZyhkczogTG9jYWxEaWFsb2dbXSk6IHZvaWQge1xuICAgIGRzLnJldmVyc2UoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBuZXh0ID0gZHNbaSArIDFdO1xuICAgICAgZHNbaV0uY29uZGl0aW9uID0gbmV4dCA/IH5uZXh0LmNvbmRpdGlvbiA6IH4wO1xuICAgIH1cbiAgfTtcblxuICAvLyBPYWsgZWxkZXIgKCQxZCkgfiBzd29yZCBvZiBmaXJlIHJlZHVuZGFudCBmbGFnXG4gIGNvbnN0IG9ha0VsZGVyRGlhbG9nID0gZGlhbG9nKDB4MWQpO1xuICAvL29ha0VsZGVyRGlhbG9nWzRdLmZsYWdzID0gW107XG4gIC8vIE1ha2Ugc3VyZSB0aGF0IHdlIHRyeSB0byBnaXZlIHRoZSBpdGVtIGZyb20gKmFsbCogcG9zdC1pbnNlY3QgZGlhbG9nc1xuICBvYWtFbGRlckRpYWxvZ1swXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzFdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbMl0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1szXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG5cbiAgLy8gT2FrIG1vdGhlciAoJDFlKSB+IGluc2VjdCBmbHV0ZSByZWR1bmRhbnQgZmxhZ1xuICAvLyBUT0RPIC0gcmVhcnJhbmdlIHRoZXNlIGZsYWdzIGEgYml0IChtYXliZSB+MDQ1LCB+MGEwIH4wNDEgLSBzbyByZXZlcnNlKVxuICAvLyAgICAgIC0gd2lsbCBuZWVkIHRvIGNoYW5nZSBiYWxsT2ZGaXJlIGFuZCBpbnNlY3RGbHV0ZSBpbiBkZXBncmFwaFxuICBjb25zdCBvYWtNb3RoZXJEaWFsb2cgPSBkaWFsb2coMHgxZSk7XG4gICgoKSA9PiB7XG4gICAgY29uc3QgW2tpbGxlZEluc2VjdCwgZ290SXRlbSwgZ2V0SXRlbSwgZmluZENoaWxkXSA9IG9ha01vdGhlckRpYWxvZztcbiAgICBmaW5kQ2hpbGQuY29uZGl0aW9uID0gfjB4MDQ1O1xuICAgIC8vZ2V0SXRlbS5jb25kaXRpb24gPSB+MHgyMjc7XG4gICAgLy9nZXRJdGVtLmZsYWdzID0gW107XG4gICAgZ290SXRlbS5jb25kaXRpb24gPSB+MDtcbiAgICByb20ubnBjc1sweDFlXS5sb2NhbERpYWxvZ3Muc2V0KC0xLCBbZmluZENoaWxkLCBnZXRJdGVtLCBraWxsZWRJbnNlY3QsIGdvdEl0ZW1dKTtcbiAgfSkoKTtcbiAgLy8vIG9ha01vdGhlckRpYWxvZ1syXS5mbGFncyA9IFtdO1xuICAvLyAvLyBFbnN1cmUgd2UgYWx3YXlzIGdpdmUgaXRlbSBhZnRlciBpbnNlY3QuXG4gIC8vIG9ha01vdGhlckRpYWxvZ1swXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIC8vIG9ha01vdGhlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIC8vIHJldmVyc2VEaWFsb2cob2FrTW90aGVyRGlhbG9nKTtcblxuICAvLyBSZXZlcnNlIHRoZSBvdGhlciBvYWsgZGlhbG9ncywgdG9vLlxuICBmb3IgKGNvbnN0IGkgb2YgWzB4MjAsIDB4MjEsIDB4MjIsIDB4N2MsIDB4N2RdKSB7XG4gICAgcmV2ZXJzZURpYWxvZyhkaWFsb2coaSkpO1xuICB9XG5cbiAgLy8gU3dhcCB0aGUgZmlyc3QgdHdvIG9hayBjaGlsZCBkaWFsb2dzLlxuICBjb25zdCBvYWtDaGlsZERpYWxvZyA9IGRpYWxvZygweDFmKTtcbiAgb2FrQ2hpbGREaWFsb2cudW5zaGlmdCguLi5vYWtDaGlsZERpYWxvZy5zcGxpY2UoMSwgMSkpO1xuXG4gIC8vIFRocm9uZSByb29tIGJhY2sgZG9vciBndWFyZCAoJDMzIEAgJGRmKSBzaG91bGQgaGF2ZSBzYW1lIHNwYXduIGNvbmRpdGlvbiBhcyBxdWVlblxuICAvLyAoMDIwIE5PVCBxdWVlbiBub3QgaW4gdGhyb25lIHJvb20gQU5EIDAxYiBOT1Qgdmlld2VkIG1lc2lhIHJlY29yZGluZylcbiAgcm9tLm5wY3NbMHgzM10uc3Bhd25Db25kaXRpb25zLnNldCgweGRmLCAgW34weDAyMCwgfjB4MDFiXSk7XG5cbiAgLy8gRnJvbnQgcGFsYWNlIGd1YXJkICgkMzQpIHZhY2F0aW9uIG1lc3NhZ2Uga2V5cyBvZmYgMDFiIGluc3RlYWQgb2YgMDFmXG4gIGRpYWxvZygweDM0KVsxXS5jb25kaXRpb24gPSAweDAxYjtcblxuICAvLyBRdWVlbidzICgkMzgpIGRpYWxvZyBuZWVkcyBxdWl0ZSBhIGJpdCBvZiB3b3JrXG4gIC8vIEdpdmUgaXRlbSAoZmx1dGUgb2YgbGltZSkgZXZlbiBpZiBnb3QgdGhlIHN3b3JkIG9mIHdhdGVyXG4gIGRpYWxvZygweDM4KVszXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7IC8vIFwieW91IGZvdW5kIHN3b3JkXCIgPT4gYWN0aW9uIDNcbiAgZGlhbG9nKDB4MzgpWzRdLmZsYWdzLnB1c2goMHgwOWMpOyAgICAgLy8gc2V0IDA5YyBxdWVlbiBnb2luZyBhd2F5XG4gIC8vIFF1ZWVuIHNwYXduIGNvbmRpdGlvbiBkZXBlbmRzIG9uIDAxYiAobWVzaWEgcmVjb3JkaW5nKSBub3QgMDFmIChiYWxsIG9mIHdhdGVyKVxuICAvLyBUaGlzIGVuc3VyZXMgeW91IGhhdmUgYm90aCBzd29yZCBhbmQgYmFsbCB0byBnZXQgdG8gaGVyICg/Pz8pXG4gIHNwYXducygweDM4LCAweGRmKVsxXSA9IH4weDAxYjsgIC8vIHRocm9uZSByb29tOiAwMWIgTk9UIG1lc2lhIHJlY29yZGluZ1xuICBzcGF3bnMoMHgzOCwgMHhlMSlbMF0gPSAweDAxYjsgICAvLyBiYWNrIHJvb206IDAxYiBtZXNpYSByZWNvcmRpbmdcbiAgZGlhbG9nKDB4MzgpWzFdLmNvbmRpdGlvbiA9IDB4MDFiOyAgICAgLy8gcmV2ZWFsIGNvbmRpdGlvbjogMDFiIG1lc2lhIHJlY29yZGluZ1xuXG4gIC8vIEZvcnR1bmUgdGVsbGVyICgkMzkpIHNob3VsZCBhbHNvIG5vdCBzcGF3biBiYXNlZCBvbiBtZXNpYSByZWNvcmRpbmcgcmF0aGVyIHRoYW4gb3JiXG4gIHNwYXducygweDM5LCAweGQ4KVsxXSA9IH4weDAxYjsgIC8vIGZvcnR1bmUgdGVsbGVyIHJvb206IDAxYiBOT1RcblxuICAvLyBDbGFyayAoJDQ0KSBtb3ZlcyBhZnRlciB0YWxraW5nIHRvIGhpbSAoMDhkKSByYXRoZXIgdGhhbiBjYWxtaW5nIHNlYSAoMDhmKS5cbiAgLy8gVE9ETyAtIGNoYW5nZSAwOGQgdG8gd2hhdGV2ZXIgYWN0dWFsIGl0ZW0gaGUgZ2l2ZXMsIHRoZW4gcmVtb3ZlIGJvdGggZmxhZ3NcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU5LCBbfjB4MDhkXSk7IC8vIHpvbWJpZSB0b3duIGJhc2VtZW50XG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlNCwgWzB4MDhkXSk7ICAvLyBqb2VsIHNoZWRcbiAgLy9kaWFsb2coMHg0NCwgMHhlOSlbMV0uZmxhZ3MucG9wKCk7IC8vIHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG5cbiAgLy8gQnJva2FoYW5hICgkNTQpIH4gd2FycmlvciByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NTQpWzJdLmZsYWdzID0gW107XG5cbiAgLy8gRGVvICgkNWEpIH4gcGVuZGFudCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVhKVsxXS5mbGFncyA9IFtdO1xuXG4gIC8vIFplYnUgKCQ1ZSkgY2F2ZSBkaWFsb2cgKEAgJDEwKVxuICAvLyBUT0RPIC0gZGlhbG9ncygweDVlLCAweDEwKS5yZWFycmFuZ2UofjB4MDNhLCAweDAwZCwgMHgwMzgsIDB4MDM5LCAweDAwYSwgfjB4MDAwKTtcbiAgcm9tLm5wY3NbMHg1ZV0ubG9jYWxEaWFsb2dzLnNldCgweDEwLCBbXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDNhLCBbMHgwMCwgMHgxYV0sIFsweDAzYV0pLCAvLyAwM2EgTk9UIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgLT4gU2V0IDAzYVxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwZCwgWzB4MDAsIDB4MWRdKSwgLy8gMDBkIGxlYWYgdmlsbGFnZXJzIHJlc2N1ZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzgsIFsweDAwLCAweDFjXSksIC8vIDAzOCBsZWFmIGF0dGFja2VkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM5LCBbMHgwMCwgMHgxZF0pLCAvLyAwMzkgbGVhcm5lZCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBhLCBbMHgwMCwgMHgxYiwgMHgwM10pLCAvLyAwMGEgd2luZG1pbGwga2V5IHVzZWQgLT4gdGVhY2ggcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKH4weDAwMCwgWzB4MDAsIDB4MWRdKSxcbiAgXSk7XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJlbW92ZShzcGF3bnMoMHg1ZSwgMHgxMCksIH4weDA1MSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFRvcm5lbCAoJDVmKSBpbiBzYWJyZSB3ZXN0ICgkMjEpIH4gdGVsZXBvcnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1ZiwgMHgyMSlbMV0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg1Zl0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDIxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gU3RvbSAoJDYwKTogZG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg2MF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDFlKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gQXNpbmEgKCQ2MikgaW4gYmFjayByb29tICgkZTEpIGdpdmVzIGZsdXRlIG9mIGxpbWVcbiAgY29uc3QgYXNpbmEgPSByb20ubnBjc1sweDYyXTtcbiAgYXNpbmEuZGF0YVsxXSA9IDB4Mjg7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgLy8gUHJldmVudCBkZXNwYXduIGZyb20gYmFjayByb29tIGFmdGVyIGRlZmVhdGluZyBzYWJlcmEgKH4wOGYpXG4gIHJlbW92ZShzcGF3bnMoYXNpbmEuaWQsIDB4ZTEpLCB+MHgwOGYpO1xuXG4gIC8vIEtlbnN1IGluIGNhYmluICgkNjggQCAkNjEpIG5lZWRzIHRvIGJlIGF2YWlsYWJsZSBldmVuIGFmdGVyIHZpc2l0aW5nIEpvZWwuXG4gIC8vIENoYW5nZSBoaW0gdG8ganVzdCBkaXNhcHBlYXIgYWZ0ZXIgc2V0dGluZyB0aGUgcmlkZWFibGUgZG9scGhpbiBmbGFnICgwOWIpLFxuICAvLyBhbmQgdG8gbm90IGV2ZW4gc2hvdyB1cCBhdCBhbGwgdW5sZXNzIHRoZSBmb2cgbGFtcCB3YXMgcmV0dXJuZWQgKDAyMSkuXG4gIHJvbS5ucGNzWzB4NjhdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHg2MSwgW34weDA5YiwgMHgwMjFdKTtcbiAgZGlhbG9nKDB4NjgpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMjsgLy8gZGlzYXBwZWFyXG5cbiAgLy8gS2Vuc3UgaW4gbGlnaHRob3VzZSAoJDc0LyQ3ZSBAICQ2MikgfiByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDc0LCAweDYyKVswXS5mbGFncyA9IFtdO1xuXG4gIC8vIEF6dGVjYSAoJDgzKSBpbiBweXJhbWlkIH4gYm93IG9mIHRydXRoIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmNvbmRpdGlvbiA9IH4weDI0MDsgIC8vIDI0MCBOT1QgYm93IG9mIHRydXRoXG4gIC8vZGlhbG9nKDB4ODMpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gUmFnZSBibG9ja3Mgb24gc3dvcmQgb2Ygd2F0ZXIsIG5vdCByYW5kb20gaXRlbSBmcm9tIHRoZSBjaGVzdFxuICBkaWFsb2coMHhjMylbMF0uY29uZGl0aW9uID0gMHgyMDI7XG5cbiAgLy8gUmVtb3ZlIHVzZWxlc3Mgc3Bhd24gY29uZGl0aW9uIGZyb20gTWFkbyAxXG4gIHJvbS5ucGNzWzB4YzRdLnNwYXduQ29uZGl0aW9ucy5kZWxldGUoMHhmMik7IC8vIGFsd2F5cyBzcGF3blxuXG4gIC8vIERyYXlnb24gMiAoJGNiIEAgbG9jYXRpb24gJGE2KSBzaG91bGQgZGVzcGF3biBhZnRlciBiZWluZyBkZWZlYXRlZC5cbiAgcm9tLm5wY3NbMHhjYl0uc3Bhd25Db25kaXRpb25zLnNldCgweGE2LCBbfjB4MjhkXSk7IC8vIGtleSBvbiBiYWNrIHdhbGwgZGVzdHJveWVkXG5cbiAgLy8gRml4IFplYnUgdG8gZ2l2ZSBrZXkgdG8gc3R4eSBldmVuIGlmIHRodW5kZXIgc3dvcmQgaXMgZ290dGVuIChqdXN0IHN3aXRjaCB0aGVcbiAgLy8gb3JkZXIgb2YgdGhlIGZpcnN0IHR3bykuICBBbHNvIGRvbid0IGJvdGhlciBzZXR0aW5nIDAzYiBzaW5jZSB0aGUgbmV3IEl0ZW1HZXRcbiAgLy8gbG9naWMgb2J2aWF0ZXMgdGhlIG5lZWQuXG4gIGNvbnN0IHplYnVTaHlyb24gPSByb20ubnBjc1sweDVlXS5sb2NhbERpYWxvZ3MuZ2V0KDB4ZjIpITtcbiAgemVidVNoeXJvbi51bnNoaWZ0KC4uLnplYnVTaHlyb24uc3BsaWNlKDEsIDEpKTtcbiAgLy8gemVidVNoeXJvblswXS5mbGFncyA9IFtdO1xuXG4gIC8vIFNoeXJvbiBtYXNzYWNyZSAoJDgwKSByZXF1aXJlcyBrZXkgdG8gc3R4eVxuICByb20udHJpZ2dlcigweDgwKS5jb25kaXRpb25zID0gW1xuICAgIH4weDAyNywgLy8gbm90IHRyaWdnZXJlZCBtYXNzYWNyZSB5ZXRcbiAgICAgMHgwM2IsIC8vIGdvdCBpdGVtIGZyb20ga2V5IHRvIHN0eHkgc2xvdFxuICAgICAweDJmZCwgLy8gc2h5cm9uIHdhcnAgcG9pbnQgdHJpZ2dlcmVkXG4gICAgIC8vIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlciAtIE5PVCBBTlkgTU9SRSFcbiAgXTtcblxuICAvLyBFbnRlciBzaHlyb24gKCQ4MSkgc2hvdWxkIHNldCB3YXJwIG5vIG1hdHRlciB3aGF0XG4gIHJvbS50cmlnZ2VyKDB4ODEpLmNvbmRpdGlvbnMgPSBbXTtcblxuICBpZiAoZmxhZ3MuYmFycmllclJlcXVpcmVzQ2FsbVNlYSgpKSB7XG4gICAgLy8gTGVhcm4gYmFycmllciAoJDg0KSByZXF1aXJlcyBjYWxtIHNlYVxuICAgIHJvbS50cmlnZ2VyKDB4ODQpLmNvbmRpdGlvbnMucHVzaCgweDI4Myk7IC8vIDI4MyBjYWxtZWQgdGhlIHNlYVxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBub3Qgc2V0dGluZyAwNTEgYW5kIGNoYW5naW5nIHRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIGl0ZW1cbiAgfVxuICAvL3JvbS50cmlnZ2VyKDB4ODQpLmZsYWdzID0gW107XG5cbiAgLy8gQWRkIGFuIGV4dHJhIGNvbmRpdGlvbiB0byB0aGUgTGVhZiBhYmR1Y3Rpb24gdHJpZ2dlciAoYmVoaW5kIHplYnUpLiAgVGhpcyBlbnN1cmVzXG4gIC8vIGFsbCB0aGUgaXRlbXMgaW4gTGVhZiBwcm9wZXIgKGVsZGVyIGFuZCBzdHVkZW50KSBhcmUgZ290dGVuIGJlZm9yZSB0aGV5IGRpc2FwcGVhci5cbiAgcm9tLnRyaWdnZXIoMHg4YykuY29uZGl0aW9ucy5wdXNoKDB4MDNhKTsgLy8gMDNhIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmVcblxuICAvLyBNb3JlIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXJzOlxuICAvLyAxLiBSZW1vdmUgdGhlIDhkIHRyaWdnZXIgaW4gdGhlIGZyb250IG9mIHRoZSBjZWxsLCBzd2FwIGl0IG91dFxuICAvLyAgICBmb3IgYjIgKGxlYXJuIHBhcmFseXNpcykuXG4gIHJvbS50cmlnZ2VyKDB4OGQpLnVzZWQgPSBmYWxzZTtcbiAgZm9yIChjb25zdCBzcGF3biBvZiByb20ubG9jYXRpb25zLm10U2FicmVOb3J0aFN1bW1pdENhdmUuc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKSBzcGF3bi5pZCA9IDB4YjI7XG4gIH1cbiAgcmVtb3ZlSWYocm9tLmxvY2F0aW9ucy53YXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMsXG4gICAgICAgICAgIHNwYXduID0+IHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKTtcbiAgLy8gMi4gU2V0IHRoZSB0cmlnZ2VyIHRvIHJlcXVpcmUgaGF2aW5nIGtpbGxlZCBrZWxiZXNxdWUuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnMucHVzaCgweDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gMy4gQWxzbyBzZXQgdGhlIHRyaWdnZXIgdG8gZnJlZSB0aGUgdmlsbGFnZXJzIGFuZCB0aGUgZWxkZXIuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnB1c2gofjB4MDg0LCB+MHgwODUsIDB4MDBkKTtcbiAgLy8gNC4gRG9uJ3QgdHJpZ2dlciB0aGUgYWJkdWN0aW9uIGluIHRoZSBmaXJzdCBwbGFjZSBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA1LiBEb24ndCB0cmlnZ2VyIHJhYmJpdCBibG9jayBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDg2KS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA2LiBEb24ndCBmcmVlIHZpbGxhZ2VycyBmcm9tIHVzaW5nIHByaXNvbiBrZXlcbiAgcm9tLnByZ1sweDFlMGEzXSA9IDB4YzA7XG4gIHJvbS5wcmdbMHgxZTBhNF0gPSAweDAwO1xuXG4gIC8vIFRPRE8gLSBhZGRpdGlvbmFsIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXI6XG4gIC8vICAgLSBnZXQgcmlkIG9mIHRoZSBmbGFncyBvbiBrZXkgdG8gcHJpc29uIHVzZVxuICAvLyAgIC0gYWRkIGEgY29uZGl0aW9uIHRoYXQgYWJkdWN0aW9uIGRvZXNuJ3QgaGFwcGVuIGlmIHJlc2N1ZWRcbiAgLy8gR2V0IHJpZCBvZiBCT1RIIHRyaWdnZXJzIGluIHN1bW1pdCBjYXZlLCAgSW5zdGVhZCwgdGllIGV2ZXJ5dGhpbmdcbiAgLy8gdG8gdGhlIGVsZGVyIGRpYWxvZyBvbiB0b3BcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBzdGlsbCBhbGl2ZSwgbWF5YmUgZ2l2ZSBhIGhpbnQgYWJvdXQgd2Vha25lc3NcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBkZWFkIHRoZW4gdGVhY2ggcGFyYWx5c2lzIGFuZCBzZXQvY2xlYXIgZmxhZ3NcbiAgLy8gICAtIGlmIHBhcmFseXNpcyBsZWFybmVkIHRoZW4gc2F5IHNvbWV0aGluZyBnZW5lcmljXG4gIC8vIFN0aWxsIG5lZWQgdG8ga2VlcCB0aGUgdHJpZ2dlciBpbiB0aGUgZnJvbnQgaW4gY2FzZSBub1xuICAvLyBhYmR1Y3Rpb24geWV0XG4gIC8vICAgLSBpZiBOT1QgcGFyYWx5c2lzIEFORCBpZiBOT1QgZWxkZXIgbWlzc2luZyBBTkQgaWYga2VsYmVxdWUgZGVhZFxuICAvLyAtLS0+IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBmb3IgdHdvIHdheXMgdG8gZ2V0IChsaWtlIHJlZnJlc2gpP1xuICAvL1xuICAvLyBBbHNvIGFkZCBhIGNoZWNrIHRoYXQgdGhlIHJhYmJpdCB0cmlnZ2VyIGlzIGdvbmUgaWYgcmVzY3VlZCFcblxuXG5cbiAgLy8gUGFyYWx5c2lzIHRyaWdnZXIgKCRiMikgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDI7XG4gIC8vcm9tLnRyaWdnZXIoMHhiMikuZmxhZ3Muc2hpZnQoKTsgLy8gcmVtb3ZlIDAzNyBsZWFybmVkIHBhcmFseXNpc1xuXG4gIC8vIExlYXJuIHJlZnJlc2ggdHJpZ2dlciAoJGI0KSB+IHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuY29uZGl0aW9uc1sxXSA9IH4weDI0MTtcbiAgLy9yb20udHJpZ2dlcigweGI0KS5mbGFncyA9IFtdOyAvLyByZW1vdmUgMDM5IGxlYXJuZWQgcmVmcmVzaFxuXG4gIC8vIFRlbGVwb3J0IGJsb2NrIG9uIG10IHNhYnJlIGlzIGZyb20gc3BlbGwsIG5vdCBzbG90XG4gIHJvbS50cmlnZ2VyKDB4YmEpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDQ7IC8vIH4wM2YgLT4gfjI0NFxuXG4gIC8vIFBvcnRvYSBwYWxhY2UgZ3VhcmQgbW92ZW1lbnQgdHJpZ2dlciAoJGJiKSBzdG9wcyBvbiAwMWIgKG1lc2lhKSBub3QgMDFmIChvcmIpXG4gIHJvbS50cmlnZ2VyKDB4YmIpLmNvbmRpdGlvbnNbMV0gPSB+MHgwMWI7XG5cbiAgLy8gUmVtb3ZlIHJlZHVuZGFudCB0cmlnZ2VyIDhhIChzbG90IDE2KSBpbiB6b21iaWV0b3duICgkNjUpXG4gIC8vICAtLSBub3RlOiBubyBsb25nZXIgbmVjZXNzYXJ5IHNpbmNlIHdlIHJlcHVycG9zZSBpdCBpbnN0ZWFkLlxuICAvLyBjb25zdCB7em9tYmllVG93bn0gPSByb20ubG9jYXRpb25zO1xuICAvLyB6b21iaWVUb3duLnNwYXducyA9IHpvbWJpZVRvd24uc3Bhd25zLmZpbHRlcih4ID0+ICF4LmlzVHJpZ2dlcigpIHx8IHguaWQgIT0gMHg4YSk7XG5cbiAgLy8gUmVwbGFjZSBhbGwgZGlhbG9nIGNvbmRpdGlvbnMgZnJvbSAwMGUgdG8gMjQzXG4gIGZvciAoY29uc3QgbnBjIG9mIHJvbS5ucGNzKSB7XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5hbGxEaWFsb2dzKCkpIHtcbiAgICAgIGlmIChkLmNvbmRpdGlvbiA9PT0gMHgwMGUpIGQuY29uZGl0aW9uID0gMHgyNDM7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IH4weDAwZSkgZC5jb25kaXRpb24gPSB+MHgyNDM7XG4gICAgfVxuICB9XG59XG5cbi8vIEhhcmQgbW9kZSBmbGFnOiBIYyAtIHplcm8gb3V0IHRoZSBzd29yZCdzIGNvbGxpc2lvbiBwbGFuZVxuZnVuY3Rpb24gZGlzYWJsZVN0YWJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbyBvZiBbMHgwOCwgMHgwOSwgMHgyN10pIHtcbiAgICByb20ub2JqZWN0c1tvXS5jb2xsaXNpb25QbGFuZSA9IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gb3Jic09wdGlvbmFsKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgb2JqIG9mIFsweDEwLCAweDE0LCAweDE4LCAweDFkXSkge1xuICAgIC8vIDEuIExvb3NlbiB0ZXJyYWluIHN1c2NlcHRpYmlsaXR5IG9mIGxldmVsIDEgc2hvdHNcbiAgICByb20ub2JqZWN0c1tvYmpdLnRlcnJhaW5TdXNjZXB0aWJpbGl0eSAmPSB+MHgwNDtcbiAgICAvLyAyLiBJbmNyZWFzZSB0aGUgbGV2ZWwgdG8gMlxuICAgIHJvbS5vYmplY3RzW29ial0ubGV2ZWwgPSAyO1xuICB9XG59XG4iXX0=