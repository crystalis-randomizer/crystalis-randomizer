import { Entrance, Exit, Flag, Spawn } from '../rom/location.js';
import { MessageId } from '../rom/messageid.js';
import { GlobalDialog, LocalDialog } from '../rom/npc.js';
import { ShopType } from '../rom/shop.js';
import { hex } from '../rom/util.js';
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
    addMezameTrigger(rom);
    addZombieWarp(rom);
    normalizeSwords(rom, flags);
    fixCoinSprites(rom);
    fixMimics(rom);
    makeBraceletsProgressive(rom);
    addTowerExit(rom);
    closeCaveEntrances(rom, flags);
    reversibleSwanGate(rom);
    adjustGoaFortressTriggers(rom);
    preventNpcDespawns(rom, flags);
    leafElderInSabreHeals(rom);
    if (flags.requireHealedDolphinToRide())
        requireHealedDolphin(rom);
    if (flags.saharaRabbitsRequireTelepathy())
        requireTelepathyForDeo(rom);
    adjustItemNames(rom, flags);
    alarmFluteIsKeyItem(rom);
    if (flags.teleportOnThunderSword()) {
        teleportOnThunderSword(rom);
    }
    else {
        noTeleportOnThunderSword(rom);
    }
    undergroundChannelLandBridge(rom);
    if (flags.connectLimeTreeToLeaf())
        connectLimeTreeToLeaf(rom);
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
    rom.objects[0x1d].atk = 3;
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
function alarmFluteIsKeyItem(rom) {
    const { WaterfallCave4 } = rom.locations;
    rom.npcs[0x14].data[1] = 0x31;
    rom.itemGets[0x31].inventoryRowStart = 0x20;
    rom.items[0x31].unique = true;
    rom.items[0x31].basePrice = 0;
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
const eastCave = (rom) => {
    const screens1 = [[0x9c, 0x84, 0x80, 0x83, 0x9c],
        [0x80, 0x81, 0x83, 0x86, 0x80],
        [0x83, 0x88, 0x89, 0x80, 0x80],
        [0x81, 0x8c, 0x85, 0x82, 0x84],
        [0x9a, 0x85, 0x9c, 0x98, 0x86]];
    const screens2 = [[0x9c, 0x84, 0x9b, 0x80, 0x9b],
        [0x80, 0x81, 0x81, 0x80, 0x81],
        [0x80, 0x87, 0x8b, 0x8a, 0x86],
        [0x80, 0x8c, 0x80, 0x85, 0x84],
        [0x9c, 0x86, 0x80, 0x80, 0x9a]];
    console.log(rom, screens1, screens2);
};
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
        0x203,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZXJtaW5pc3RpYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL2RldGVybWluaXN0aWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsT0FBTyxFQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFZLEtBQUssRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEVBQUMsWUFBWSxFQUFFLFdBQVcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN4RCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRW5DLE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxHQUFlO0lBRW5ELEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxHQUFRLEVBQUUsS0FBYztJQUVwRCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QixhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFbkIsZUFBZSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJ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QUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFFMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUMxQixHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDMUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztJQUUxQixJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsRUFBRTtRQUczQixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxD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QUMsQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFHRCxTQUFTLHFCQUFxQixDQUFDLEdBQVE7SUFDckMsTUFBTSxFQUFDLFlBQVksRUFBRSxjQUFjLEVBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO0lBRXJELFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2xDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3BDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXBDLE1BQU0sWUFBWSxHQUNkLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0sWUFBWSxHQUNkLGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXpFLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNuQixJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBQyxDQUFDLEVBQ2pFLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLEdBQVEsRUFBRSxLQUFjO0lBRWxELEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBR2hELEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDTixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0MsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDWixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUMzQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFHL0MsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBRXJDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVyQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFD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Q25GLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFRTCxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQzlDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUdELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUl2RCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBRzVELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBSWxDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUV0QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUdsQyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0lBQy9CLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBR2xDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7SUFJL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQVdsRCxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO1FBQ3BDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxDQUFFLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDMUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNyQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBS25DLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUc1QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHNUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUVoRCxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUt2QyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFHdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXZELEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBVTFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENB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QUFFO1lBQ2hDLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxLQUFLO2dCQUFFLENBQUMsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQy9DLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxDQUFDLEtBQUs7Z0JBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLEtBQUssQ0FBQztTQUNsRDtLQUNGO0FBQ0gsQ0FBQztBQUdELFNBQVMsWUFBWSxDQUFDLEdBQVE7SUFDNUIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDbEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO0tBQ25DO0lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ2hDLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxHQUFRO0lBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUUxQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDO1FBRWhELEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztLQUM1QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQZXJmb3JtIGluaXRpYWwgY2xlYW51cC9zZXR1cCBvZiB0aGUgUk9NLlxuXG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0VudHJhbmNlLCBFeGl0LCBGbGFnLCBMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge01lc3NhZ2VJZH0gZnJvbSAnLi4vcm9tL21lc3NhZ2VpZC5qcyc7XG5pbXBvcnQge0dsb2JhbERpYWxvZywgTG9jYWxEaWFsb2d9IGZyb20gJy4uL3JvbS9ucGMuanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXh9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVybWluaXN0aWNQcmVQYXJzZShwcmc6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgLy8gUmVtb3ZlIHVudXNlZCBpdGVtL3RyaWdnZXIgYWN0aW9uc1xuICBwcmdbMHgxZTA2Yl0gJj0gNzsgLy8gbWVkaWNhbCBoZXJiIG5vcm1hbCB1c2FnZSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDZmXSAmPSA3OyAvLyBtYWdpYyByaW5nIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3M10gJj0gNzsgLy8gZnJ1aXQgb2YgbGltZSBpdGVtdXNlWzBdID0+IGFjdGlvbiAwNSB0byBhY3Rpb24gMDBcbiAgcHJnWzB4MWUwNzddICY9IDc7IC8vIGFudGlkb3RlIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA3Yl0gJj0gNzsgLy8gb3BlbCBzdGF0dWUgaXRlbXVzZVswXSA9PiBhY3Rpb24gMDUgdG8gYWN0aW9uIDAwXG4gIHByZ1sweDFlMDg0XSAmPSA3OyAvLyB3YXJwIGJvb3RzIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA0IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTA5Yl0gJj0gNzsgLy8gd2luZG1pbGwga2V5IGl0ZW11c2VbMV0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxuICBwcmdbMHgxZTBiOV0gJj0gNzsgLy8gZ2xvd2luZyBsYW1wIGl0ZW11c2VbMF0gPT4gYWN0aW9uIDA1IHRvIGFjdGlvbiAwMFxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZXJtaW5pc3RpYyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcblxuICBhZGRNZXphbWVUcmlnZ2VyKHJvbSk7XG4gIGFkZFpvbWJpZVdhcnAocm9tKTtcblxuICBub3JtYWxpemVTd29yZHMocm9tLCBmbGFncyk7XG5cbiAgZml4Q29pblNwcml0ZXMocm9tKTtcbiAgZml4TWltaWNzKHJvbSk7XG5cbiAgbWFrZUJyYWNlbGV0c1Byb2dyZXNzaXZlKHJvbSk7XG5cbiAgYWRkVG93ZXJFeGl0KHJvbSk7XG4gIGNsb3NlQ2F2ZUVudHJhbmNlcyhyb20sIGZsYWdzKTtcbiAgcmV2ZXJzaWJsZVN3YW5HYXRlKHJvbSk7XG4gIGFkanVzdEdvYUZvcnRyZXNzVHJpZ2dlcnMocm9tKTtcbiAgcHJldmVudE5wY0Rlc3Bhd25zKHJvbSwgZmxhZ3MpO1xuICBsZWFmRWxkZXJJblNhYnJlSGVhbHMocm9tKTtcbiAgaWYgKGZsYWdzLnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCkpIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbSk7XG4gIGlmIChmbGFncy5zYWhhcmFSYWJiaXRzUmVxdWlyZVRlbGVwYXRoeSgpKSByZXF1aXJlVGVsZXBhdGh5Rm9yRGVvKHJvbSk7XG5cbiAgYWRqdXN0SXRlbU5hbWVzKHJvbSwgZmxhZ3MpO1xuXG4gIC8vIFRPRE8gLSBjb25zaWRlciBtYWtpbmcgYSBUcmFuc2Zvcm1hdGlvbiBpbnRlcmZhY2UsIHdpdGggb3JkZXJpbmcgY2hlY2tzXG4gIGFsYXJtRmx1dGVJc0tleUl0ZW0ocm9tKTsgLy8gTk9URTogcHJlLXNodWZmbGVcbiAgaWYgKGZsYWdzLnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgIHRlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfSBlbHNlIHtcbiAgICBub1RlbGVwb3J0T25UaHVuZGVyU3dvcmQocm9tKTtcbiAgfVxuXG4gIHVuZGVyZ3JvdW5kQ2hhbm5lbExhbmRCcmlkZ2Uocm9tKTtcblxuICBpZiAoZmxhZ3MuY29ubmVjdExpbWVUcmVlVG9MZWFmKCkpIGNvbm5lY3RMaW1lVHJlZVRvTGVhZihyb20pO1xuICBzaW1wbGlmeUludmlzaWJsZUNoZXN0cyhyb20pO1xuICBhZGRDb3JkZWxXZXN0VHJpZ2dlcnMocm9tLCBmbGFncyk7XG4gIGlmIChmbGFncy5kaXNhYmxlUmFiYml0U2tpcCgpKSBmaXhSYWJiaXRTa2lwKHJvbSk7XG5cbiAgZml4UmV2ZXJzZVdhbGxzKHJvbSk7XG4gIGlmIChmbGFncy5jaGFyZ2VTaG90c09ubHkoKSkgZGlzYWJsZVN0YWJzKHJvbSk7XG4gIGlmIChmbGFncy5vcmJzT3B0aW9uYWwoKSkgb3Jic09wdGlvbmFsKHJvbSk7XG59XG5cbi8vIEFkZHMgYSB0cmlnZ2VyIGFjdGlvbiB0byBtZXphbWUuICBVc2UgODcgbGVmdG92ZXIgZnJvbSByZXNjdWluZyB6ZWJ1LlxuZnVuY3Rpb24gYWRkTWV6YW1lVHJpZ2dlcihyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB0cmlnZ2VyID0gcm9tLm5leHRGcmVlVHJpZ2dlcigpO1xuICB0cmlnZ2VyLnVzZWQgPSB0cnVlO1xuICB0cmlnZ2VyLmNvbmRpdGlvbnMgPSBbfjB4MmYwXTtcbiAgdHJpZ2dlci5tZXNzYWdlID0gTWVzc2FnZUlkLm9mKHthY3Rpb246IDR9KTtcbiAgdHJpZ2dlci5mbGFncyA9IFsweDJmMF07XG4gIGNvbnN0IG1lemFtZSA9IHJvbS5sb2NhdGlvbnMuTWV6YW1lU2hyaW5lO1xuICBtZXphbWUuc3Bhd25zLnB1c2goU3Bhd24ub2Yoe3RpbGU6IDB4ODgsIHR5cGU6IDIsIGlkOiB0cmlnZ2VyLmlkfSkpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTd29yZHMocm9tOiBSb20sIGZsYWdzOiBGbGFnU2V0KSB7XG4gIC8vIHdpbmQgMSA9PiAxIGhpdCAgICAgICAgICAgICAgID0+IDNcbiAgLy8gd2luZCAyID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gNlxuICAvLyB3aW5kIDMgPT4gMi0zIGhpdHMgOE1QICAgICAgICA9PiA4XG5cbiAgLy8gZmlyZSAxID0+IDEgaGl0ICAgICAgICAgICAgICAgPT4gM1xuICAvLyBmaXJlIDIgPT4gMyBoaXRzICAgICAgICAgICAgICA9PiA1XG4gIC8vIGZpcmUgMyA9PiA0LTYgaGl0cyAxNk1QICAgICAgID0+IDdcblxuICAvLyB3YXRlciAxID0+IDEgaGl0ICAgICAgICAgICAgICA9PiAzXG4gIC8vIHdhdGVyIDIgPT4gMS0yIGhpdHMgICAgICAgICAgID0+IDZcbiAgLy8gd2F0ZXIgMyA9PiAzLTYgaGl0cyAxNk1QICAgICAgPT4gOFxuXG4gIC8vIHRodW5kZXIgMSA9PiAxLTIgaGl0cyBzcHJlYWQgID0+IDNcbiAgLy8gdGh1bmRlciAyID0+IDEtMyBoaXRzIHNwcmVhZCAgPT4gNVxuICAvLyB0aHVuZGVyIDMgPT4gNy0xMCBoaXRzIDQwTVAgICA9PiA3XG5cbiAgcm9tLm9iamVjdHNbMHgxMF0uYXRrID0gMzsgLy8gd2luZCAxXG4gIHJvbS5vYmplY3RzWzB4MTFdLmF0ayA9IDY7IC8vIHdpbmQgMlxuICByb20ub2JqZWN0c1sweDEyXS5hdGsgPSA4OyAvLyB3aW5kIDNcblxuICByb20ub2JqZWN0c1sweDE4XS5hdGsgPSAzOyAvLyBmaXJlIDFcbiAgcm9tLm9iamVjdHNbMHgxM10uYXRrID0gNTsgLy8gZmlyZSAyXG4gIHJvbS5vYmplY3RzWzB4MTldLmF0ayA9IDU7IC8vIGZpcmUgMlxuICByb20ub2JqZWN0c1sweDE3XS5hdGsgPSA3OyAvLyBmaXJlIDNcbiAgcm9tLm9iamVjdHNbMHgxYV0uYXRrID0gNzsgLy8gZmlyZSAzXG5cbiAgcm9tLm9iamVjdHNbMHgxNF0uYXRrID0gMzsgLy8gd2F0ZXIgMVxuICByb20ub2JqZWN0c1sweDE1XS5hdGsgPSA2OyAvLyB3YXRlciAyXG4gIHJvbS5vYmplY3RzWzB4MTZdLmF0ayA9IDg7IC8vIHdhdGVyIDNcblxuICByb20ub2JqZWN0c1sweDFjXS5hdGsgPSAzOyAvLyB0aHVuZGVyIDEgKHVudXNlZCBhbGlhcz8pXG4gIHJvbS5vYmplY3RzWzB4MWRdLmF0ayA9IDM7IC8vIHRodW5kZXIgMVxuICByb20ub2JqZWN0c1sweDFlXS5hdGsgPSA1OyAvLyB0aHVuZGVyIDJcbiAgcm9tLm9iamVjdHNbMHgxYl0uYXRrID0gNzsgLy8gdGh1bmRlciAzXG4gIHJvbS5vYmplY3RzWzB4MWZdLmF0ayA9IDc7IC8vIHRodW5kZXIgM1xuXG4gIGlmIChmbGFncy5zbG93RG93blRvcm5hZG8oKSkge1xuICAgIC8vIFRPRE8gLSB0b3JuYWRvIChvYmogMTIpID0+IHNwZWVkIDA3IGluc3RlYWQgb2YgMDhcbiAgICAvLyAgICAgIC0gbGlmZXRpbWUgaXMgNDgwID0+IDcwIG1heWJlIHRvbyBsb25nLCA2MCBzd2VldCBzcG90P1xuICAgIGNvbnN0IHRvcm5hZG8gPSByb20ub2JqZWN0c1sweDEyXTtcbiAgICB0b3JuYWRvLnNwZWVkID0gMHgwNztcbiAgICB0b3JuYWRvLmRhdGFbMHgwY10gPSAweDYwOyAvLyBpbmNyZWFzZSBsaWZldGltZSAoNDgwKSBieSAyMCVcbiAgfVxufVxuXG5mdW5jdGlvbiBmaXhDb2luU3ByaXRlcyhyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWzB4NjAsIDB4NjQsIDB4NjUsIDB4NjYsIDB4NjcsIDB4NjgsXG4gICAgICAgICAgICAgICAgICAgICAgMHg2OSwgMHg2YSwgMHg2YiwgMHg2YywgMHg2ZCwgMHg2Zl0pIHtcbiAgICBmb3IgKGNvbnN0IHBhdCBvZiBbMCwgMSwgMl0pIHtcbiAgICAgIHJvbS5wYXR0ZXJuc1twYWdlIDw8IDYgfCBwYXRdLnBpeGVscyA9IHJvbS5wYXR0ZXJuc1sweDVlIDw8IDYgfCBwYXRdLnBpeGVscztcbiAgICB9XG4gIH1cbiAgcm9tLm9iamVjdHNbMHgwY10ubWV0YXNwcml0ZSA9IDB4YTk7XG59XG5cbi8qKlxuICogRml4IHRoZSBzb2Z0bG9jayB0aGF0IGhhcHBlbnMgd2hlbiB5b3UgZ28gdGhyb3VnaFxuICogYSB3YWxsIGJhY2t3YXJkcyBieSBtb3ZpbmcgdGhlIGV4aXQvZW50cmFuY2UgdGlsZXNcbiAqIHVwIGEgYml0IGFuZCBhZGp1c3Rpbmcgc29tZSB0aWxlRWZmZWN0cyB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZpeFJldmVyc2VXYWxscyhyb206IFJvbSkge1xuICAvLyBhZGp1c3QgdGlsZSBlZmZlY3QgZm9yIGJhY2sgdGlsZXMgb2YgaXJvbiB3YWxsXG4gIGZvciAoY29uc3QgdCBpbiBbMHgwNCwgMHgwNSwgMHgwOCwgMHgwOV0pIHtcbiAgICByb20udGlsZUVmZmVjdHNbMHhiYyAtIDB4YjNdLmVmZmVjdHNbdF0gPSAweDE4O1xuICAgIHJvbS50aWxlRWZmZWN0c1sweGI1IC0gMHhiM10uZWZmZWN0c1t0XSA9IDB4MTg7XG4gIH1cbiAgLy8gVE9ETyAtIG1vdmUgYWxsIHRoZSBlbnRyYW5jZXMgdG8geT0yMCBhbmQgZXhpdHMgdG8geXQ9MDFcbn1cblxuLyoqIE1ha2UgYSBsYW5kIGJyaWRnZSBpbiB1bmRlcmdyb3VuZCBjaGFubmVsICovXG5mdW5jdGlvbiB1bmRlcmdyb3VuZENoYW5uZWxMYW5kQnJpZGdlKHJvbTogUm9tKSB7XG4gIGNvbnN0IHt0aWxlc30gPSByb20uc2NyZWVuc1sweGExXTtcbiAgdGlsZXNbMHgyOF0gPSAweDlmO1xuICB0aWxlc1sweDM3XSA9IDB4MjM7XG4gIHRpbGVzWzB4MzhdID0gMHgyMzsgLy8gMHg4ZTtcbiAgdGlsZXNbMHgzOV0gPSAweDIxO1xuICB0aWxlc1sweDQ3XSA9IDB4OGQ7XG4gIHRpbGVzWzB4NDhdID0gMHg4ZjtcbiAgdGlsZXNbMHg1Nl0gPSAweDk5O1xuICB0aWxlc1sweDU3XSA9IDB4OWE7XG4gIHRpbGVzWzB4NThdID0gMHg4Yztcbn1cblxuLyoqXG4gKiBSZW1vdmUgdGltZXIgc3Bhd25zLCByZW51bWJlcnMgbWltaWMgc3Bhd25zIHNvIHRoYXQgdGhleSdyZSB1bmlxdWUuXG4gKiBSdW5zIGJlZm9yZSBzaHVmZmxlIGJlY2F1c2Ugd2UgbmVlZCB0byBpZGVudGlmeSB0aGUgc2xvdC4gIFJlcXVpcmVzXG4gKiBhbiBhc3NlbWJseSBjaGFuZ2UgKCQzZDNmZCBpbiBwcmVzaHVmZmxlLnMpXG4gKi9cbmZ1bmN0aW9uIGZpeE1pbWljcyhyb206IFJvbSk6IHZvaWQge1xuICBsZXQgbWltaWMgPSAweDcwO1xuICBmb3IgKGNvbnN0IGxvYyBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBzIG9mIGxvYy5zcGF3bnMpIHtcbiAgICAgIGlmICghcy5pc0NoZXN0KCkpIGNvbnRpbnVlO1xuICAgICAgcy50aW1lZCA9IGZhbHNlO1xuICAgICAgaWYgKHMuaWQgPj0gMHg3MCkgcy5pZCA9IG1pbWljKys7XG4gICAgfVxuICB9XG4gIC8vIFRPRE8gLSBmaW5kIGEgYmV0dGVyIHdheSB0byBidW5kbGUgYXNtIGNoYW5nZXM/XG4gIC8vIHJvbS5hc3NlbWJsZSgpXG4gIC8vICAgICAuJCgnYWRjICQxMCcpXG4gIC8vICAgICAuYmVxKCdsYWJlbCcpXG4gIC8vICAgICAubHNoKClcbiAgLy8gICAgIC5sc2goYCR7YWRkcn0seGApXG4gIC8vICAgICAubGFiZWwoJ2xhYmVsJyk7XG4gIC8vIHJvbS5wYXRjaCgpXG4gIC8vICAgICAub3JnKDB4M2QzZmQpXG4gIC8vICAgICAuYnl0ZSgweGIwKTtcbn1cblxuZnVuY3Rpb24gYWRqdXN0R29hRm9ydHJlc3NUcmlnZ2Vycyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsID0gcm9tLmxvY2F0aW9ucztcbiAgLy8gTW92ZSBLZWxiZXNxdWUgMiBvbmUgZnVsbCB0aWxlIGxlZnQuXG4gIGwuR29hRm9ydHJlc3NfS2VsYmVzcXVlLnNwYXduc1swXS54IC09IDE2O1xuICAvLyBSZW1vdmUgc2FnZSBzY3JlZW4gbG9ja3MgKGV4Y2VwdCBLZW5zdSkuXG4gIGwuR29hRm9ydHJlc3NfWmVidS5zcGF3bnMuc3BsaWNlKDEsIDEpOyAvLyB6ZWJ1IHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Ub3JuZWwuc3Bhd25zLnNwbGljZSgyLCAxKTsgLy8gdG9ybmVsIHNjcmVlbiBsb2NrIHRyaWdnZXJcbiAgbC5Hb2FGb3J0cmVzc19Bc2luYS5zcGF3bnMuc3BsaWNlKDIsIDEpOyAvLyBhc2luYSBzY3JlZW4gbG9jayB0cmlnZ2VyXG4gIGwuR29hRm9ydHJlc3NfS2Vuc3Uuc3Bhd25zLnNwbGljZSgzLCAxKTsgLy8ga2Vuc3UgaHVtYW4gc2NyZWVuIGxvY2sgdHJpZ2dlclxuICBsLkdvYUZvcnRyZXNzX0tlbnN1LnNwYXducy5zcGxpY2UoMSwgMSk7IC8vIGtlbnN1IHNsaW1lIHNjcmVlbiBsb2NrIHRyaWdnZXJcbn1cblxuZnVuY3Rpb24gYWxhcm1GbHV0ZUlzS2V5SXRlbShyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCB7V2F0ZXJmYWxsQ2F2ZTR9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBQZXJzb24gMTQgKFplYnUncyBzdHVkZW50KTogc2Vjb25kYXJ5IGl0ZW0gLT4gYWxhcm0gZmx1dGVcbiAgcm9tLm5wY3NbMHgxNF0uZGF0YVsxXSA9IDB4MzE7IC8vIE5PVEU6IENsb2JiZXJzIHNodWZmbGVkIGl0ZW0hISFcbiAgLy8gTW92ZSBhbGFybSBmbHV0ZSB0byB0aGlyZCByb3dcbiAgcm9tLml0ZW1HZXRzWzB4MzFdLmludmVudG9yeVJvd1N0YXJ0ID0gMHgyMDtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBkcm9wcGVkXG4gIC8vIHJvbS5wcmdbMHgyMTAyMV0gPSAweDQzOyAvLyBUT0RPIC0gcm9tLml0ZW1zWzB4MzFdLj8/P1xuICByb20uaXRlbXNbMHgzMV0udW5pcXVlID0gdHJ1ZTtcbiAgLy8gRW5zdXJlIGFsYXJtIGZsdXRlIGNhbm5vdCBiZSBzb2xkXG4gIHJvbS5pdGVtc1sweDMxXS5iYXNlUHJpY2UgPSAwO1xuXG4gIC8vIFJlbW92ZSBhbGFybSBmbHV0ZSBmcm9tIHNob3BzIChyZXBsYWNlIHdpdGggb3RoZXIgaXRlbXMpXG4gIC8vIE5PVEUgLSB3ZSBjb3VsZCBzaW1wbGlmeSB0aGlzIHdob2xlIHRoaW5nIGJ5IGp1c3QgaGFyZGNvZGluZyBpbmRpY2VzLlxuICAvLyAgICAgIC0gaWYgdGhpcyBpcyBndWFyYW50ZWVkIHRvIGhhcHBlbiBlYXJseSwgaXQncyBhbGwgdGhlIHNhbWUuXG4gIGNvbnN0IHJlcGxhY2VtZW50cyA9IFtcbiAgICBbMHgyMSwgMC43Ml0sIC8vIGZydWl0IG9mIHBvd2VyLCA3MiUgb2YgY29zdFxuICAgIFsweDFmLCAwLjldLCAvLyBseXNpcyBwbGFudCwgOTAlIG9mIGNvc3RcbiAgXTtcbiAgbGV0IGogPSAwO1xuICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHNob3AuY29udGVudHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChzaG9wLmNvbnRlbnRzW2ldICE9PSAweDMxKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IFtpdGVtLCBwcmljZVJhdGlvXSA9IHJlcGxhY2VtZW50c1soaisrKSAlIHJlcGxhY2VtZW50cy5sZW5ndGhdO1xuICAgICAgc2hvcC5jb250ZW50c1tpXSA9IGl0ZW07XG4gICAgICBpZiAocm9tLnNob3BEYXRhVGFibGVzQWRkcmVzcykge1xuICAgICAgICAvLyBOT1RFOiB0aGlzIGlzIGJyb2tlbiAtIG5lZWQgYSBjb250cm9sbGVkIHdheSB0byBjb252ZXJ0IHByaWNlIGZvcm1hdHNcbiAgICAgICAgc2hvcC5wcmljZXNbaV0gPSBNYXRoLnJvdW5kKHNob3AucHJpY2VzW2ldICogcHJpY2VSYXRpbyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hhbmdlIGZsdXRlIG9mIGxpbWUgY2hlc3QncyAobm93LXVudXNlZCkgaXRlbWdldCB0byBoYXZlIG1lZGljYWwgaGVyYlxuICByb20uaXRlbUdldHNbMHg1Yl0uaXRlbUlkID0gMHgxZDtcbiAgLy8gQ2hhbmdlIHRoZSBhY3R1YWwgc3Bhd24gZm9yIHRoYXQgY2hlc3QgdG8gYmUgdGhlIG1pcnJvcmVkIHNoaWVsZCBjaGVzdFxuICBXYXRlcmZhbGxDYXZlNC5zcGF3bigweDE5KS5pZCA9IDB4MTA7XG5cbiAgLy8gVE9ETyAtIHJlcXVpcmUgbmV3IGNvZGUgZm9yIHR3byB1c2VzXG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVIZWFsZWREb2xwaGluKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIE5vcm1hbGx5IHRoZSBmaXNoZXJtYW4gKCQ2NCkgc3Bhd25zIGluIGhpcyBob3VzZSAoJGQ2KSBpZiB5b3UgaGF2ZVxuICAvLyB0aGUgc2hlbGwgZmx1dGUgKDIzNikuICBIZXJlIHdlIGFsc28gYWRkIGEgcmVxdWlyZW1lbnQgb24gdGhlIGhlYWxlZFxuICAvLyBkb2xwaGluIHNsb3QgKDAyNSksIHdoaWNoIHdlIGtlZXAgYXJvdW5kIHNpbmNlIGl0J3MgYWN0dWFsbHkgdXNlZnVsLlxuICByb20ubnBjc1sweDY0XS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4ZDYsIFsweDIzNiwgMHgwMjVdKTtcbiAgLy8gQWxzbyBmaXggZGF1Z2h0ZXIncyBkaWFsb2cgKCQ3YikuXG4gIGNvbnN0IGRhdWdodGVyRGlhbG9nID0gcm9tLm5wY3NbMHg3Yl0ubG9jYWxEaWFsb2dzLmdldCgtMSkhO1xuICBkYXVnaHRlckRpYWxvZy51bnNoaWZ0KGRhdWdodGVyRGlhbG9nWzBdLmNsb25lKCkpO1xuICBkYXVnaHRlckRpYWxvZ1swXS5jb25kaXRpb24gPSB+MHgwMjU7XG4gIGRhdWdodGVyRGlhbG9nWzFdLmNvbmRpdGlvbiA9IH4weDIzNjtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZVRlbGVwYXRoeUZvckRlbyhyb206IFJvbSk6IHZvaWQge1xuICAvLyBOb3QgaGF2aW5nIHRlbGVwYXRoeSAoMjQzKSB3aWxsIHRyaWdnZXIgYSBcImt5dSBreXVcIiAoMWE6MTIsIDFhOjEzKSBmb3JcbiAgLy8gYm90aCBnZW5lcmljIGJ1bm5pZXMgKDU5KSBhbmQgZGVvICg1YSkuXG4gIHJvbS5ucGNzWzB4NTldLmdsb2JhbERpYWxvZ3MucHVzaChHbG9iYWxEaWFsb2cub2YofjB4MjQzLCBbMHgxYSwgMHgxMl0pKTtcbiAgcm9tLm5wY3NbMHg1YV0uZ2xvYmFsRGlhbG9ncy5wdXNoKEdsb2JhbERpYWxvZy5vZih+MHgyNDMsIFsweDFhLCAweDEzXSkpO1xufVxuXG5mdW5jdGlvbiB0ZWxlcG9ydE9uVGh1bmRlclN3b3JkKHJvbTogUm9tKTogdm9pZCB7XG4gIC8vIGl0ZW1nZXQgMDMgc3dvcmQgb2YgdGh1bmRlciA9PiBzZXQgMmZkIHNoeXJvbiB3YXJwIHBvaW50XG4gIHJvbS5pdGVtR2V0c1sweDAzXS5mbGFncy5wdXNoKDB4MmZkKTtcbiAgLy8gZGlhbG9nIDYyIGFzaW5hIGluIGYyL2Y0IHNoeXJvbiAtPiBhY3Rpb24gMWYgKHRlbGVwb3J0IHRvIHN0YXJ0KVxuICAvLyAgIC0gbm90ZTogZjIgYW5kIGY0IGRpYWxvZ3MgYXJlIGxpbmtlZC5cbiAgZm9yIChjb25zdCBpIG9mIFswLCAxLCAzXSkge1xuICAgIGZvciAoY29uc3QgbG9jIG9mIFsweGYyLCAweGY0XSkge1xuICAgICAgcm9tLm5wY3NbMHg2Ml0ubG9jYWxEaWFsb2dzLmdldChsb2MpIVtpXS5tZXNzYWdlLmFjdGlvbiA9IDB4MWY7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG5vVGVsZXBvcnRPblRodW5kZXJTd29yZChyb206IFJvbSk6IHZvaWQge1xuICAvLyBDaGFuZ2Ugc3dvcmQgb2YgdGh1bmRlcidzIGFjdGlvbiB0byBiYmUgdGhlIHNhbWUgYXMgb3RoZXIgc3dvcmRzICgxNilcbiAgcm9tLml0ZW1HZXRzWzB4MDNdLmFjcXVpc2l0aW9uQWN0aW9uLmFjdGlvbiA9IDB4MTY7XG59XG5cbmZ1bmN0aW9uIGFkanVzdEl0ZW1OYW1lcyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgaWYgKGZsYWdzLmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgLy8gcmVuYW1lIGxlYXRoZXIgYm9vdHMgdG8gc3BlZWQgYm9vdHNcbiAgICBjb25zdCBsZWF0aGVyQm9vdHMgPSByb20uaXRlbXNbMHgyZl0hO1xuICAgIGxlYXRoZXJCb290cy5tZW51TmFtZSA9ICdTcGVlZCBCb290cyc7XG4gICAgbGVhdGhlckJvb3RzLm1lc3NhZ2VOYW1lID0gJ1NwZWVkIEJvb3RzJztcbiAgICBpZiAoZmxhZ3MuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpKSB7XG4gICAgICBjb25zdCBnYXNNYXNrID0gcm9tLml0ZW1zWzB4MjldO1xuICAgICAgZ2FzTWFzay5tZW51TmFtZSA9ICdIYXptYXQgU3VpdCc7XG4gICAgICBnYXNNYXNrLm1lc3NhZ2VOYW1lID0gJ0hhem1hdCBTdWl0JztcbiAgICB9XG4gIH1cblxuICAvLyByZW5hbWUgYmFsbHMgdG8gb3Jic1xuICBmb3IgKGxldCBpID0gMHgwNTsgaSA8IDB4MGM7IGkgKz0gMikge1xuICAgIHJvbS5pdGVtc1tpXS5tZW51TmFtZSA9IHJvbS5pdGVtc1tpXS5tZW51TmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICAgIHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZSA9IHJvbS5pdGVtc1tpXS5tZXNzYWdlTmFtZS5yZXBsYWNlKCdCYWxsJywgJ09yYicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1ha2VCcmFjZWxldHNQcm9ncmVzc2l2ZShyb206IFJvbSk6IHZvaWQge1xuICAvLyB0b3JuZWwncyB0cmlnZ2VyIG5lZWRzIGJvdGggaXRlbXNcbiAgY29uc3QgdG9ybmVsID0gcm9tLm5wY3NbMHg1Zl07XG4gIGNvbnN0IHZhbmlsbGEgPSB0b3JuZWwubG9jYWxEaWFsb2dzLmdldCgweDIxKSE7XG4gIGNvbnN0IHBhdGNoZWQgPSBbXG4gICAgdmFuaWxsYVswXSwgLy8gYWxyZWFkeSBsZWFybmVkIHRlbGVwb3J0XG4gICAgdmFuaWxsYVsyXSwgLy8gZG9uJ3QgaGF2ZSB0b3JuYWRvIGJyYWNlbGV0XG4gICAgdmFuaWxsYVsyXS5jbG9uZSgpLCAvLyB3aWxsIGNoYW5nZSB0byBkb24ndCBoYXZlIG9yYlxuICAgIHZhbmlsbGFbMV0sIC8vIGhhdmUgYnJhY2VsZXQsIGxlYXJuIHRlbGVwb3J0XG4gIF07XG4gIHBhdGNoZWRbMV0uY29uZGl0aW9uID0gfjB4MjA2OyAvLyBkb24ndCBoYXZlIGJyYWNlbGV0XG4gIHBhdGNoZWRbMl0uY29uZGl0aW9uID0gfjB4MjA1OyAvLyBkb24ndCBoYXZlIG9yYlxuICBwYXRjaGVkWzNdLmNvbmRpdGlvbiA9IH4wOyAgICAgLy8gZGVmYXVsdFxuICB0b3JuZWwubG9jYWxEaWFsb2dzLnNldCgweDIxLCBwYXRjaGVkKTtcbn1cblxuZnVuY3Rpb24gc2ltcGxpZnlJbnZpc2libGVDaGVzdHMocm9tOiBSb20pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiBbcm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICByb20ubG9jYXRpb25zLktpcmlzYU1lYWRvd10pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gc2V0IHRoZSBuZXcgXCJpbnZpc2libGVcIiBmbGFnIG9uIHRoZSBjaGVzdC5cbiAgICAgIGlmIChzcGF3bi5pc0NoZXN0KCkpIHNwYXduLmRhdGFbMl0gfD0gMHgyMDtcbiAgICB9XG4gIH1cbn1cblxuLy8gQWRkIHRoZSBzdGF0dWUgb2Ygb255eCBhbmQgcG9zc2libHkgdGhlIHRlbGVwb3J0IGJsb2NrIHRyaWdnZXIgdG8gQ29yZGVsIFdlc3RcbmZ1bmN0aW9uIGFkZENvcmRlbFdlc3RUcmlnZ2Vycyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpIHtcbiAgY29uc3Qge0NvcmRlbFBsYWluRWFzdCwgQ29yZGVsUGxhaW5XZXN0fSA9IHJvbS5sb2NhdGlvbnM7XG4gIGZvciAoY29uc3Qgc3Bhd24gb2YgQ29yZGVsUGxhaW5FYXN0LnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc0NoZXN0KCkgfHwgKGZsYWdzLmRpc2FibGVUZWxlcG9ydFNraXAoKSAmJiBzcGF3bi5pc1RyaWdnZXIoKSkpIHtcbiAgICAgIC8vIENvcHkgaWYgKDEpIGl0J3MgdGhlIGNoZXN0LCBvciAoMikgd2UncmUgZGlzYWJsaW5nIHRlbGVwb3J0IHNraXBcbiAgICAgIENvcmRlbFBsYWluV2VzdC5zcGF3bnMucHVzaChzcGF3bi5jbG9uZSgpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZml4UmFiYml0U2tpcChyb206IFJvbSk6IHZvaWQge1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX01haW4uc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDg2KSB7XG4gICAgICBpZiAoc3Bhd24ueCA9PT0gMHg3NDApIHtcbiAgICAgICAgc3Bhd24ueCArPSAxNjtcbiAgICAgICAgc3Bhd24ueSArPSAxNjtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkVG93ZXJFeGl0KHJvbTogUm9tKTogdm9pZCB7XG4gIGNvbnN0IHtUb3dlckVudHJhbmNlLCBDcnlwdF9UZWxlcG9ydGVyfSA9IHJvbS5sb2NhdGlvbnM7XG4gIGNvbnN0IGVudHJhbmNlID0gQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMubGVuZ3RoO1xuICBjb25zdCBkZXN0ID0gQ3J5cHRfVGVsZXBvcnRlci5pZDtcbiAgQ3J5cHRfVGVsZXBvcnRlci5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7dGlsZTogMHg2OH0pKTtcbiAgVG93ZXJFbnRyYW5jZS5leGl0cy5wdXNoKEV4aXQub2Yoe3RpbGU6IDB4NTcsIGRlc3QsIGVudHJhbmNlfSkpO1xuICBUb3dlckVudHJhbmNlLmV4aXRzLnB1c2goRXhpdC5vZih7dGlsZTogMHg1OCwgZGVzdCwgZW50cmFuY2V9KSk7XG59XG5cbi8vIFByb2dyYW1tYXRpY2FsbHkgYWRkIGEgaG9sZSBiZXR3ZWVuIHZhbGxleSBvZiB3aW5kIGFuZCBsaW1lIHRyZWUgdmFsbGV5XG5mdW5jdGlvbiBjb25uZWN0TGltZVRyZWVUb0xlYWYocm9tOiBSb20pOiB2b2lkIHtcbiAgY29uc3Qge1ZhbGxleU9mV2luZCwgTGltZVRyZWVWYWxsZXl9ID0gcm9tLmxvY2F0aW9ucztcblxuICBWYWxsZXlPZldpbmQuc2NyZWVuc1s1XVs0XSA9IDB4MTA7IC8vIG5ldyBleGl0XG4gIExpbWVUcmVlVmFsbGV5LnNjcmVlbnNbMV1bMF0gPSAweDFhOyAvLyBuZXcgZXhpdFxuICBMaW1lVHJlZVZhbGxleS5zY3JlZW5zWzJdWzBdID0gMHgwYzsgLy8gbmljZXIgbW91bnRhaW5zXG5cbiAgY29uc3Qgd2luZEVudHJhbmNlID1cbiAgICAgIFZhbGxleU9mV2luZC5lbnRyYW5jZXMucHVzaChFbnRyYW5jZS5vZih7eDogMHg0ZWYsIHk6IDB4NTc4fSkpIC0gMTtcbiAgY29uc3QgbGltZUVudHJhbmNlID1cbiAgICAgIExpbWVUcmVlVmFsbGV5LmVudHJhbmNlcy5wdXNoKEVudHJhbmNlLm9mKHt4OiAweDAxMCwgeTogMHgxYzB9KSkgLSAxO1xuXG4gIFZhbGxleU9mV2luZC5leGl0cy5wdXNoKFxuICAgICAgRXhpdC5vZih7eDogMHg0ZjAsIHk6IDB4NTYwLCBkZXN0OiAweDQyLCBlbnRyYW5jZTogbGltZUVudHJhbmNlfSksXG4gICAgICBFeGl0Lm9mKHt4OiAweDRmMCwgeTogMHg1NzAsIGRlc3Q6IDB4NDIsIGVudHJhbmNlOiBsaW1lRW50cmFuY2V9KSk7XG4gIExpbWVUcmVlVmFsbGV5LmV4aXRzLnB1c2goXG4gICAgICBFeGl0Lm9mKHt4OiAweDAwMCwgeTogMHgxYjAsIGRlc3Q6IDB4MDMsIGVudHJhbmNlOiB3aW5kRW50cmFuY2V9KSxcbiAgICAgIEV4aXQub2Yoe3g6IDB4MDAwLCB5OiAweDFjMCwgZGVzdDogMHgwMywgZW50cmFuY2U6IHdpbmRFbnRyYW5jZX0pKTtcbn1cblxuZnVuY3Rpb24gY2xvc2VDYXZlRW50cmFuY2VzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCk6IHZvaWQge1xuICAvLyBQcmV2ZW50IHNvZnRsb2NrIGZyb20gZXhpdGluZyBzZWFsZWQgY2F2ZSBiZWZvcmUgd2luZG1pbGwgc3RhcnRlZFxuICByb20ubG9jYXRpb25zLlZhbGxleU9mV2luZC5lbnRyYW5jZXNbMV0ueSArPSAxNjtcblxuICAvLyBDbGVhciB0aWxlcyAxLDIsMyw0IGZvciBibG9ja2FibGUgY2F2ZXMgaW4gdGlsZXNldHMgOTAsIDk0LCBhbmQgOWNcbiAgcm9tLnN3YXBNZXRhdGlsZXMoWzB4OTBdLFxuICAgICAgICAgICAgICAgICAgICBbMHgwNywgWzB4MDEsIDB4MDBdLCB+MHhjMV0sXG4gICAgICAgICAgICAgICAgICAgIFsweDBlLCBbMHgwMiwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4MjAsIFsweDAzLCAweDBhXSwgfjB4ZDddLFxuICAgICAgICAgICAgICAgICAgICBbMHgyMSwgWzB4MDQsIDB4MGFdLCB+MHhkN10pO1xuICByb20uc3dhcE1ldGF0aWxlcyhbMHg5NCwgMHg5Y10sXG4gICAgICAgICAgICAgICAgICAgIFsweDY4LCBbMHgwMSwgMHgwMF0sIH4weGMxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODMsIFsweDAyLCAweDAwXSwgfjB4YzFdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4OCwgWzB4MDMsIDB4MGFdLCB+MHhkN10sXG4gICAgICAgICAgICAgICAgICAgIFsweDg5LCBbMHgwNCwgMHgwYV0sIH4weGQ3XSk7XG5cbiAgLy8gTm93IHJlcGxhY2UgdGhlIHRpbGVzIHdpdGggdGhlIGJsb2NrYWJsZSBvbmVzXG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4MzhdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgwYV0udGlsZXNbMHgzOV0gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDBhXS50aWxlc1sweDQ4XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4MGFdLnRpbGVzWzB4NDldID0gMHgwNDtcblxuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDc5XSA9IDB4MDE7XG4gIHJvbS5zY3JlZW5zWzB4MTVdLnRpbGVzWzB4N2FdID0gMHgwMjtcbiAgcm9tLnNjcmVlbnNbMHgxNV0udGlsZXNbMHg4OV0gPSAweDAzO1xuICByb20uc2NyZWVuc1sweDE1XS50aWxlc1sweDhhXSA9IDB4MDQ7XG5cbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg0OF0gPSAweDAxO1xuICByb20uc2NyZWVuc1sweDE5XS50aWxlc1sweDQ5XSA9IDB4MDI7XG4gIHJvbS5zY3JlZW5zWzB4MTldLnRpbGVzWzB4NThdID0gMHgwMztcbiAgcm9tLnNjcmVlbnNbMHgxOV0udGlsZXNbMHg1OV0gPSAweDA0O1xuXG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NTZdID0gMHgwMTtcbiAgcm9tLnNjcmVlbnNbMHgzZV0udGlsZXNbMHg1N10gPSAweDAyO1xuICByb20uc2NyZWVuc1sweDNlXS50aWxlc1sweDY2XSA9IDB4MDM7XG4gIHJvbS5zY3JlZW5zWzB4M2VdLnRpbGVzWzB4NjddID0gMHgwNDtcblxuICAvLyBEZXN0cnVjdHVyZSBvdXQgYSBmZXcgbG9jYXRpb25zIGJ5IG5hbWVcbiAgY29uc3Qge1xuICAgIFZhbGxleU9mV2luZCxcbiAgICBDb3JkZWxQbGFpbldlc3QsXG4gICAgQ29yZGVsUGxhaW5FYXN0LFxuICAgIFdhdGVyZmFsbFZhbGxleU5vcnRoLFxuICAgIFdhdGVyZmFsbFZhbGxleVNvdXRoLFxuICAgIEtpcmlzYU1lYWRvdyxcbiAgICBTYWhhcmFPdXRzaWRlQ2F2ZSxcbiAgICBEZXNlcnQyLFxuICB9ID0gcm9tLmxvY2F0aW9ucztcblxuICAvLyBOT1RFOiBmbGFnIDJmMCBpcyBBTFdBWVMgc2V0IC0gdXNlIGl0IGFzIGEgYmFzZWxpbmUuXG4gIGNvbnN0IGZsYWdzVG9DbGVhciA9IFtcbiAgICBbVmFsbGV5T2ZXaW5kLCAweDMwXSwgLy8gdmFsbGV5IG9mIHdpbmQsIHplYnUncyBjYXZlXG4gICAgW0NvcmRlbFBsYWluV2VzdCwgMHgzMF0sIC8vIGNvcmRlbCB3ZXN0LCB2YW1waXJlIGNhdmVcbiAgICBbQ29yZGVsUGxhaW5FYXN0LCAweDMwXSwgLy8gY29yZGVsIGVhc3QsIHZhbXBpcmUgY2F2ZVxuICAgIFtXYXRlcmZhbGxWYWxsZXlOb3J0aCwgMHgwMF0sIC8vIHdhdGVyZmFsbCBub3J0aCwgcHJpc29uIGNhdmVcbiAgICBbV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MTRdLCAvLyB3YXRlcmZhbGwgbm9ydGgsIGZvZyBsYW1wXG4gICAgW1dhdGVyZmFsbFZhbGxleVNvdXRoLCAweDc0XSwgLy8gd2F0ZXJmYWxsIHNvdXRoLCBraXJpc2FcbiAgICBbS2lyaXNhTWVhZG93LCAweDEwXSwgLy8ga2lyaXNhIG1lYWRvd1xuICAgIFtTYWhhcmFPdXRzaWRlQ2F2ZSwgMHgwMF0sIC8vIGNhdmUgdG8gZGVzZXJ0XG4gICAgW0Rlc2VydDIsIDB4NDFdLFxuICBdIGFzIGNvbnN0O1xuICBmb3IgKGNvbnN0IFtsb2MsIHl4XSBvZiBmbGFnc1RvQ2xlYXIpIHtcbiAgICBsb2MuZmxhZ3MucHVzaChGbGFnLm9mKHt5eCwgZmxhZzogMHgyZjB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlRmxhZyhsb2M6IExvY2F0aW9uLCB5eDogbnVtYmVyLCBmbGFnOiBudW1iZXIpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGYgb2YgbG9jLmZsYWdzKSB7XG4gICAgICBpZiAoZi55eCA9PT0geXgpIHtcbiAgICAgICAgZi5mbGFnID0gZmxhZztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGZsYWcgdG8gcmVwbGFjZSBhdCAke2xvY306JHt5eH1gKTtcbiAgfTtcblxuICBpZiAoZmxhZ3MucGFyYWx5c2lzUmVxdWlyZXNQcmlzb25LZXkoKSkgeyAvLyBjbG9zZSBvZmYgcmV2ZXJzZSBlbnRyYW5jZXNcbiAgICAvLyBOT1RFOiB3ZSBjb3VsZCBhbHNvIGNsb3NlIGl0IG9mZiB1bnRpbCBib3NzIGtpbGxlZC4uLj9cbiAgICAvLyAgLSBjb25zdCB2YW1waXJlRmxhZyA9IH5yb20ubnBjU3Bhd25zWzB4YzBdLmNvbmRpdGlvbnNbMHgwYV1bMF07XG4gICAgLy8gIC0+IGtlbGJlc3F1ZSBmb3IgdGhlIG90aGVyIG9uZS5cbiAgICBjb25zdCB3aW5kbWlsbEZsYWcgPSAweDJlZTtcbiAgICByZXBsYWNlRmxhZyhDb3JkZWxQbGFpbldlc3QsIDB4MzAsIHdpbmRtaWxsRmxhZyk7XG4gICAgcmVwbGFjZUZsYWcoQ29yZGVsUGxhaW5FYXN0LCAweDMwLCB3aW5kbWlsbEZsYWcpO1xuXG4gICAgcmVwbGFjZUZsYWcoV2F0ZXJmYWxsVmFsbGV5Tm9ydGgsIDB4MDAsIDB4MmQ4KTsgLy8ga2V5IHRvIHByaXNvbiBmbGFnXG4gICAgY29uc3QgZXhwbG9zaW9uID0gU3Bhd24ub2Yoe3k6IDB4MDYwLCB4OiAweDA2MCwgdHlwZTogNCwgaWQ6IDB4MmN9KTtcbiAgICBjb25zdCBrZXlUcmlnZ2VyID0gU3Bhd24ub2Yoe3k6IDB4MDcwLCB4OiAweDA3MCwgdHlwZTogMiwgaWQ6IDB4YWR9KTtcbiAgICBXYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMuc3BsaWNlKDEsIDAsIGV4cGxvc2lvbik7XG4gICAgV2F0ZXJmYWxsVmFsbGV5Tm9ydGguc3Bhd25zLnB1c2goa2V5VHJpZ2dlcik7XG4gIH1cblxuICAvLyByb20ubG9jYXRpb25zWzB4MTRdLnRpbGVFZmZlY3RzID0gMHhiMztcblxuICAvLyBkNyBmb3IgMz9cblxuICAvLyBUT0RPIC0gdGhpcyBlbmRlZCB1cCB3aXRoIG1lc3NhZ2UgMDA6MDMgYW5kIGFuIGFjdGlvbiB0aGF0IGdhdmUgYm93IG9mIG1vb24hXG5cbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLm1lc3NhZ2UucGFydCA9IDB4MWI7XG4gIC8vIHJvbS50cmlnZ2Vyc1sweDE5XS5tZXNzYWdlLmluZGV4ID0gMHgwODtcbiAgLy8gcm9tLnRyaWdnZXJzWzB4MTldLmZsYWdzLnB1c2goMHgyZjYsIDB4MmY3LCAweDJmOCk7XG59XG5cbi8vIEB0cy1pZ25vcmU6IG5vdCB5ZXQgdXNlZFxuY29uc3QgZWFzdENhdmUgPSAocm9tOiBSb20pID0+IHtcbiAgLy8gTk9URTogMHg5YyBjYW4gYmVjb21lIDB4OTkgaW4gdG9wIGxlZnQgb3IgMHg5NyBpbiB0b3AgcmlnaHQgb3IgYm90dG9tIG1pZGRsZSBmb3IgYSBjYXZlIGV4aXRcbiAgY29uc3Qgc2NyZWVuczEgPSBbWzB4OWMsIDB4ODQsIDB4ODAsIDB4ODMsIDB4OWNdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4MSwgMHg4MywgMHg4NiwgMHg4MF0sXG4gICAgICAgICAgICAgICAgICAgIFsweDgzLCAweDg4LCAweDg5LCAweDgwLCAweDgwXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODEsIDB4OGMsIDB4ODUsIDB4ODIsIDB4ODRdLFxuICAgICAgICAgICAgICAgICAgICBbMHg5YSwgMHg4NSwgMHg5YywgMHg5OCwgMHg4Nl1dO1xuICBjb25zdCBzY3JlZW5zMiA9IFtbMHg5YywgMHg4NCwgMHg5YiwgMHg4MCwgMHg5Yl0sXG4gICAgICAgICAgICAgICAgICAgIFsweDgwLCAweDgxLCAweDgxLCAweDgwLCAweDgxXSxcbiAgICAgICAgICAgICAgICAgICAgWzB4ODAsIDB4ODcsIDB4OGIsIDB4OGEsIDB4ODZdLFxuICAgICAgICAgICAgICAgICAgICBbMHg4MCwgMHg4YywgMHg4MCwgMHg4NSwgMHg4NF0sXG4gICAgICAgICAgICAgICAgICAgIFsweDljLCAweDg2LCAweDgwLCAweDgwLCAweDlhXV07XG4gIC8vIFRPRE8gZmlsbCB1cCBncmFwaGljcywgZXRjIC0tPiAkMWEsICQxYiwgJDA1IC8gJDg4LCAkYjUgLyAkMTQsICQwMlxuICAvLyBUaGluayBhb2J1dCBleGl0cyBhbmQgZW50cmFuY2VzLi4uP1xuICBjb25zb2xlLmxvZyhyb20sIHNjcmVlbnMxLCBzY3JlZW5zMik7XG59O1xuXG5mdW5jdGlvbiBhZGRab21iaWVXYXJwKHJvbTogUm9tKSB7XG4gIC8vIE1ha2Ugc3BhY2UgZm9yIHRoZSBuZXcgZmxhZyBiZXR3ZWVuIEpvZWwgYW5kIFN3YW5cbiAgZm9yIChsZXQgaSA9IDB4MmY1OyBpIDwgMHgyZmM7IGkrKykge1xuICAgIHJvbS5tb3ZlRmxhZyhpLCBpIC0gMSk7XG4gIH1cbiAgLy8gVXBkYXRlIHRoZSBtZW51XG4gIGNvbnN0IG1lc3NhZ2UgPSByb20ubWVzc2FnZXMucGFydHNbMHgyMV1bMF07XG4gIG1lc3NhZ2UudGV4dCA9IFtcbiAgICAnIHsxYTpMZWFmfSAgICAgIHsxNjpCcnlubWFlcn0gezFkOk9ha30gJyxcbiAgICAnezBjOk5hZGFyZX1cXCdzICB7MWU6UG9ydG9hfSAgIHsxNDpBbWF6b25lc30gJyxcbiAgICAnezE5OkpvZWx9ICAgICAgWm9tYmllICAgezIwOlN3YW59ICcsXG4gICAgJ3syMzpTaHlyb259ICAgIHsxODpHb2F9ICAgICAgezIxOlNhaGFyYX0nLFxuICBdLmpvaW4oJ1xcbicpO1xuICAvLyBBZGQgYSB0cmlnZ2VyIHRvIHRoZSBlbnRyYW5jZSAtIHRoZXJlJ3MgYWxyZWFkeSBhIHNwYXduIGZvciA4YVxuICAvLyBidXQgd2UgY2FuJ3QgcmV1c2UgdGhhdCBzaW5jZSBpdCdzIHRoZSBzYW1lIGFzIHRoZSBvbmUgb3V0c2lkZVxuICAvLyB0aGUgbWFpbiBFU0kgZW50cmFuY2U7IHNvIHJldXNlIGEgZGlmZmVyZW50IG9uZS5cbiAgY29uc3QgdHJpZ2dlciA9IHJvbS5uZXh0RnJlZVRyaWdnZXIoKTtcbiAgdHJpZ2dlci51c2VkID0gdHJ1ZTtcbiAgdHJpZ2dlci5jb25kaXRpb25zID0gW107XG4gIHRyaWdnZXIubWVzc2FnZSA9IE1lc3NhZ2VJZC5vZih7fSk7XG4gIHRyaWdnZXIuZmxhZ3MgPSBbMHgyZmJdOyAvLyBuZXcgd2FycCBwb2ludCBmbGFnXG4gIC8vIEFjdHVhbGx5IHJlcGxhY2UgdGhlIHRyaWdnZXIuXG4gIGZvciAoY29uc3Qgc3Bhd24gb2Ygcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLnNwYXducykge1xuICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHg4YSkge1xuICAgICAgc3Bhd24uaWQgPSB0cmlnZ2VyLmlkO1xuICAgIH0gICAgXG4gIH1cbiAgLy8gSW5zZXJ0IGludG8gdGhlIHdhcnAgdGFibGUuXG4gIGZvciAobGV0IGkgPSAweDNkYzYyOyBpID49IDB4M2RjNWY7IGktLSkge1xuICAgIHJvbS5wcmdbaSArIDFdID0gcm9tLnByZ1tpXTtcbiAgfVxuICByb20ucHJnWzB4M2RjNWZdID0gcm9tLmxvY2F0aW9ucy5ab21iaWVUb3duLmlkO1xuICAvLyBBU00gZml4ZXMgc2hvdWxkIGhhdmUgaGFwcGVuZWQgaW4gcHJlc2h1ZmZsZS5zXG59XG5cbmZ1bmN0aW9uIHJldmVyc2libGVTd2FuR2F0ZShyb206IFJvbSkge1xuICAvLyBBbGxvdyBvcGVuaW5nIFN3YW4gZnJvbSBlaXRoZXIgc2lkZSBieSBhZGRpbmcgYSBwYWlyIG9mIGd1YXJkcyBvbiB0aGVcbiAgLy8gb3Bwb3NpdGUgc2lkZSBvZiB0aGUgZ2F0ZS5cbiAgcm9tLmxvY2F0aW9uc1sweDczXS5zcGF3bnMucHVzaChcbiAgICAvLyBOT1RFOiBTb2xkaWVycyBtdXN0IGNvbWUgaW4gcGFpcnMgKHdpdGggaW5kZXggXjEgZnJvbSBlYWNoIG90aGVyKVxuICAgIFNwYXduLm9mKHt4dDogMHgwYSwgeXQ6IDB4MDIsIHR5cGU6IDEsIGlkOiAweDJkfSksIC8vIG5ldyBzb2xkaWVyXG4gICAgU3Bhd24ub2Yoe3h0OiAweDBiLCB5dDogMHgwMiwgdHlwZTogMSwgaWQ6IDB4MmR9KSwgLy8gbmV3IHNvbGRpZXJcbiAgICBTcGF3bi5vZih7eHQ6IDB4MGUsIHl0OiAweDBhLCB0eXBlOiAyLCBpZDogMHhiM30pLCAvLyBuZXcgdHJpZ2dlcjogZXJhc2UgZ3VhcmRzXG4gICk7XG5cbiAgLy8gR3VhcmRzICgkMmQpIGF0IHN3YW4gZ2F0ZSAoJDczKSB+IHNldCAxMGQgYWZ0ZXIgb3BlbmluZyBnYXRlID0+IGNvbmRpdGlvbiBmb3IgZGVzcGF3blxuICByb20ubnBjc1sweDJkXS5sb2NhbERpYWxvZ3MuZ2V0KDB4NzMpIVswXS5mbGFncy5wdXNoKDB4MTBkKTtcblxuICAvLyBEZXNwYXduIGd1YXJkIHRyaWdnZXIgcmVxdWlyZXMgMTBkXG4gIHJvbS50cmlnZ2VyKDB4YjMpLmNvbmRpdGlvbnMucHVzaCgweDEwZCk7XG59XG5cbmZ1bmN0aW9uIGxlYWZFbGRlckluU2FicmVIZWFscyhyb206IFJvbSk6IHZvaWQge1xuICBjb25zdCBsZWFmRWxkZXIgPSByb20ubnBjc1sweDBkXTtcbiAgY29uc3Qgc3VtbWl0RGlhbG9nID0gbGVhZkVsZGVyLmxvY2FsRGlhbG9ncy5nZXQoMHgzNSkhWzBdO1xuICBzdW1taXREaWFsb2cubWVzc2FnZS5hY3Rpb24gPSAweDE3OyAvLyBoZWFsIGFuZCBkaXNhcHBlYXIuXG59XG5cbmZ1bmN0aW9uIHByZXZlbnROcGNEZXNwYXducyhyb206IFJvbSwgZmxhZ3M6IEZsYWdTZXQpOiB2b2lkIHtcbiAgZnVuY3Rpb24gcmVtb3ZlPFQ+KGFycjogVFtdLCBlbGVtOiBUKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSBhcnIuaW5kZXhPZihlbGVtKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGVsZW1lbnQgJHtlbGVtfSBpbiAke2Fycn1gKTtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVJZjxUPihhcnI6IFRbXSwgcHJlZDogKGVsZW06IFQpID0+IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IGFyci5maW5kSW5kZXgocHJlZCk7XG4gICAgaWYgKGluZGV4IDwgMCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBlbGVtZW50IGluICR7YXJyfWApO1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlhbG9nKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyID0gLTEpOiBMb2NhbERpYWxvZ1tdIHtcbiAgICBjb25zdCByZXN1bHQgPSByb20ubnBjc1tpZF0ubG9jYWxEaWFsb2dzLmdldChsb2MpO1xuICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgZGlhbG9nICQke2hleChpZCl9IGF0ICQke2hleChsb2MpfWApO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gc3Bhd25zKGlkOiBudW1iZXIsIGxvYzogbnVtYmVyKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvYyk7XG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBzcGF3biBjb25kaXRpb24gJCR7aGV4KGlkKX0gYXQgJCR7aGV4KGxvYyl9YCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIExpbmsgc29tZSByZWR1bmRhbnQgTlBDczogS2Vuc3UgKDdlLCA3NCkgYW5kIEFrYWhhbmEgKDg4LCAxNilcbiAgcm9tLm5wY3NbMHg3NF0ubGluaygweDdlKTtcbiAgcm9tLm5wY3NbMHg3NF0udXNlZCA9IHRydWU7XG4gIHJvbS5ucGNzWzB4NzRdLmRhdGEgPSBbLi4ucm9tLm5wY3NbMHg3ZV0uZGF0YV0gYXMgYW55O1xuICByb20ubG9jYXRpb25zLlN3YW5fRGFuY2VIYWxsLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4N2UpIS5pZCA9IDB4NzQ7XG4gIHJvbS5pdGVtc1sweDNiXS50cmFkZUluIVswXSA9IDB4NzQ7XG5cbiAgLy8gZGlhbG9nIGlzIHNoYXJlZCBiZXR3ZWVuIDg4IGFuZCAxNi5cbiAgcm9tLm5wY3NbMHg4OF0ubGlua0RpYWxvZygweDE2KTtcblxuICAvLyBNYWtlIGEgbmV3IE5QQyBmb3IgQWthaGFuYSBpbiBCcnlubWFlcjsgb3RoZXJzIHdvbid0IGFjY2VwdCB0aGUgU3RhdHVlIG9mIE9ueXguXG4gIC8vIExpbmtpbmcgc3Bhd24gY29uZGl0aW9ucyBhbmQgZGlhbG9ncyBpcyBzdWZmaWNpZW50LCBzaW5jZSB0aGUgYWN0dWFsIE5QQyBJRFxuICAvLyAoMTYgb3IgODIpIGlzIHdoYXQgbWF0dGVycyBmb3IgdGhlIHRyYWRlLWluXG4gIHJvbS5ucGNzWzB4ODJdLnVzZWQgPSB0cnVlO1xuICByb20ubnBjc1sweDgyXS5saW5rKDB4MTYpO1xuICByb20ubnBjc1sweDgyXS5kYXRhID0gWy4uLnJvbS5ucGNzWzB4MTZdLmRhdGFdIGFzIGFueTsgLy8gZW5zdXJlIGdpdmUgaXRlbVxuICByb20ubG9jYXRpb25zLkJyeW5tYWVyLnNwYXducy5maW5kKHMgPT4gcy5pc05wYygpICYmIHMuaWQgPT09IDB4MTYpIS5pZCA9IDB4ODI7XG4gIHJvbS5pdGVtc1sweDI1XS50cmFkZUluIVswXSA9IDB4ODI7XG5cbiAgLy8gTGVhZiBlbGRlciBpbiBob3VzZSAoJDBkIEAgJGMwKSB+IHN3b3JkIG9mIHdpbmQgcmVkdW5kYW50IGZsYWdcbiAgLy8gZGlhbG9nKDB4MGQsIDB4YzApWzJdLmZsYWdzID0gW107XG4gIC8vcm9tLml0ZW1HZXRzWzB4MDBdLmZsYWdzID0gW107IC8vIGNsZWFyIHJlZHVuZGFudCBmbGFnXG5cbiAgLy8gTGVhZiByYWJiaXQgKCQxMykgbm9ybWFsbHkgc3RvcHMgc2V0dGluZyBpdHMgZmxhZyBhZnRlciBwcmlzb24gZG9vciBvcGVuZWQsXG4gIC8vIGJ1dCB0aGF0IGRvZXNuJ3QgbmVjZXNzYXJpbHkgb3BlbiBtdCBzYWJyZS4gIEluc3RlYWQgKGEpIHRyaWdnZXIgb24gMDQ3XG4gIC8vIChzZXQgYnkgOGQgdXBvbiBlbnRlcmluZyBlbGRlcidzIGNlbGwpLiAgQWxzbyBtYWtlIHN1cmUgdGhhdCB0aGF0IHBhdGggYWxzb1xuICAvLyBwcm92aWRlcyB0aGUgbmVlZGVkIGZsYWcgdG8gZ2V0IGludG8gbXQgc2FicmUuXG4gIGRpYWxvZygweDEzKVsyXS5jb25kaXRpb24gPSAweDA0NztcbiAgZGlhbG9nKDB4MTMpWzJdLmZsYWdzID0gWzB4MGE5XTtcbiAgZGlhbG9nKDB4MTMpWzNdLmZsYWdzID0gWzB4MGE5XTtcblxuICAvLyBXaW5kbWlsbCBndWFyZCAoJDE0IEAgJDBlKSBzaG91bGRuJ3QgZGVzcGF3biBhZnRlciBhYmR1Y3Rpb24gKDAzOCksXG4gIC8vIGJ1dCBpbnN0ZWFkIGFmdGVyIGdpdmluZyB0aGUgaXRlbSAoMDg4KVxuICBzcGF3bnMoMHgxNCwgMHgwZSlbMV0gPSB+MHgwODg7IC8vIHJlcGxhY2UgZmxhZyB+MDM4ID0+IH4wODhcbiAgLy9kaWFsb2coMHgxNCwgMHgwZSlbMF0uZmxhZ3MgPSBbXTsgLy8gcmVtb3ZlIHJlZHVuZGFudCBmbGFnIH4gd2luZG1pbGwga2V5XG5cbiAgLy8gQWthaGFuYSAoJDE2IC8gODgpIH4gc2hpZWxkIHJpbmcgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHgxNiwgMHg1NylbMF0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGlzYXBwZWFyIGFmdGVyIGdldHRpbmcgYmFycmllciAobm90ZSA4OCdzIHNwYXducyBub3QgbGlua2VkIHRvIDE2KVxuICByZW1vdmUoc3Bhd25zKDB4MTYsIDB4NTcpLCB+MHgwNTEpO1xuICByZW1vdmUoc3Bhd25zKDB4ODgsIDB4NTcpLCB+MHgwNTEpO1xuXG4gIGZ1bmN0aW9uIHJldmVyc2VEaWFsb2coZHM6IExvY2FsRGlhbG9nW10pOiB2b2lkIHtcbiAgICBkcy5yZXZlcnNlKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbmV4dCA9IGRzW2kgKyAxXTtcbiAgICAgIGRzW2ldLmNvbmRpdGlvbiA9IG5leHQgPyB+bmV4dC5jb25kaXRpb24gOiB+MDtcbiAgICB9XG4gIH07XG5cbiAgLy8gT2FrIGVsZGVyICgkMWQpIH4gc3dvcmQgb2YgZmlyZSByZWR1bmRhbnQgZmxhZ1xuICBjb25zdCBvYWtFbGRlckRpYWxvZyA9IGRpYWxvZygweDFkKTtcbiAgLy9vYWtFbGRlckRpYWxvZ1s0XS5mbGFncyA9IFtdO1xuICAvLyBNYWtlIHN1cmUgdGhhdCB3ZSB0cnkgdG8gZ2l2ZSB0aGUgaXRlbSBmcm9tICphbGwqIHBvc3QtaW5zZWN0IGRpYWxvZ3NcbiAgb2FrRWxkZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICBvYWtFbGRlckRpYWxvZ1sxXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7XG4gIG9ha0VsZGVyRGlhbG9nWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMztcbiAgb2FrRWxkZXJEaWFsb2dbM10ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuXG4gIC8vIE9hayBtb3RoZXIgKCQxZSkgfiBpbnNlY3QgZmx1dGUgcmVkdW5kYW50IGZsYWdcbiAgLy8gVE9ETyAtIHJlYXJyYW5nZSB0aGVzZSBmbGFncyBhIGJpdCAobWF5YmUgfjA0NSwgfjBhMCB+MDQxIC0gc28gcmV2ZXJzZSlcbiAgLy8gICAgICAtIHdpbGwgbmVlZCB0byBjaGFuZ2UgYmFsbE9mRmlyZSBhbmQgaW5zZWN0Rmx1dGUgaW4gZGVwZ3JhcGhcbiAgY29uc3Qgb2FrTW90aGVyRGlhbG9nID0gZGlhbG9nKDB4MWUpO1xuICAoKCkgPT4ge1xuICAgIGNvbnN0IFtraWxsZWRJbnNlY3QsIGdvdEl0ZW0sIGdldEl0ZW0sIGZpbmRDaGlsZF0gPSBvYWtNb3RoZXJEaWFsb2c7XG4gICAgZmluZENoaWxkLmNvbmRpdGlvbiA9IH4weDA0NTtcbiAgICAvL2dldEl0ZW0uY29uZGl0aW9uID0gfjB4MjI3O1xuICAgIC8vZ2V0SXRlbS5mbGFncyA9IFtdO1xuICAgIGdvdEl0ZW0uY29uZGl0aW9uID0gfjA7XG4gICAgcm9tLm5wY3NbMHgxZV0ubG9jYWxEaWFsb2dzLnNldCgtMSwgW2ZpbmRDaGlsZCwgZ2V0SXRlbSwga2lsbGVkSW5zZWN0LCBnb3RJdGVtXSk7XG4gIH0pKCk7XG4gIC8vLyBvYWtNb3RoZXJEaWFsb2dbMl0uZmxhZ3MgPSBbXTtcbiAgLy8gLy8gRW5zdXJlIHdlIGFsd2F5cyBnaXZlIGl0ZW0gYWZ0ZXIgaW5zZWN0LlxuICAvLyBvYWtNb3RoZXJEaWFsb2dbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyBvYWtNb3RoZXJEaWFsb2dbMV0ubWVzc2FnZS5hY3Rpb24gPSAweDAzO1xuICAvLyByZXZlcnNlRGlhbG9nKG9ha01vdGhlckRpYWxvZyk7XG5cbiAgLy8gUmV2ZXJzZSB0aGUgb3RoZXIgb2FrIGRpYWxvZ3MsIHRvby5cbiAgZm9yIChjb25zdCBpIG9mIFsweDIwLCAweDIxLCAweDIyLCAweDdjLCAweDdkXSkge1xuICAgIHJldmVyc2VEaWFsb2coZGlhbG9nKGkpKTtcbiAgfVxuXG4gIC8vIFN3YXAgdGhlIGZpcnN0IHR3byBvYWsgY2hpbGQgZGlhbG9ncy5cbiAgY29uc3Qgb2FrQ2hpbGREaWFsb2cgPSBkaWFsb2coMHgxZik7XG4gIG9ha0NoaWxkRGlhbG9nLnVuc2hpZnQoLi4ub2FrQ2hpbGREaWFsb2cuc3BsaWNlKDEsIDEpKTtcblxuICAvLyBUaHJvbmUgcm9vbSBiYWNrIGRvb3IgZ3VhcmQgKCQzMyBAICRkZikgc2hvdWxkIGhhdmUgc2FtZSBzcGF3biBjb25kaXRpb24gYXMgcXVlZW5cbiAgLy8gKDAyMCBOT1QgcXVlZW4gbm90IGluIHRocm9uZSByb29tIEFORCAwMWIgTk9UIHZpZXdlZCBtZXNpYSByZWNvcmRpbmcpXG4gIHJvbS5ucGNzWzB4MzNdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhkZiwgIFt+MHgwMjAsIH4weDAxYl0pO1xuXG4gIC8vIEZyb250IHBhbGFjZSBndWFyZCAoJDM0KSB2YWNhdGlvbiBtZXNzYWdlIGtleXMgb2ZmIDAxYiBpbnN0ZWFkIG9mIDAxZlxuICBkaWFsb2coMHgzNClbMV0uY29uZGl0aW9uID0gMHgwMWI7XG5cbiAgLy8gUXVlZW4ncyAoJDM4KSBkaWFsb2cgbmVlZHMgcXVpdGUgYSBiaXQgb2Ygd29ya1xuICAvLyBHaXZlIGl0ZW0gKGZsdXRlIG9mIGxpbWUpIGV2ZW4gaWYgZ290IHRoZSBzd29yZCBvZiB3YXRlclxuICBkaWFsb2coMHgzOClbM10uY29uZGl0aW9uID0gMHgyMDI7IC8vIFwieW91IGZvdW5kIHN3b3JkXCIgKGNvbmRpdGlvbiAyMDIpXG4gIGRpYWxvZygweDM4KVszXS5tZXNzYWdlLmFjdGlvbiA9IDB4MDM7IC8vICA9PiBhY3Rpb24gM1xuICAvLyBFbnN1cmUgeW91IGNhbiBhbHdheXMgbWFrZSB0aGUgcXVlZW4gZ28gYXdheS5cbiAgZGlhbG9nKDB4MzgpWzRdLmZsYWdzLnB1c2goMHgwOWMpOyAgICAgLy8gc2V0IDA5YyBxdWVlbiBnb2luZyBhd2F5XG4gIC8vIFF1ZWVuIHNwYXduIGNvbmRpdGlvbiBkZXBlbmRzIG9uIDAxYiAobWVzaWEgcmVjb3JkaW5nKSBub3QgMDFmIChiYWxsIG9mIHdhdGVyKVxuICAvLyBUaGlzIGVuc3VyZXMgeW91IGhhdmUgYm90aCBzd29yZCBhbmQgYmFsbCB0byBnZXQgdG8gaGVyICg/Pz8pXG4gIHNwYXducygweDM4LCAweGRmKVsxXSA9IH4weDAxYjsgIC8vIHRocm9uZSByb29tOiAwMWIgTk9UIG1lc2lhIHJlY29yZGluZ1xuICBzcGF3bnMoMHgzOCwgMHhlMSlbMF0gPSAweDAxYjsgICAvLyBiYWNrIHJvb206IDAxYiBtZXNpYSByZWNvcmRpbmdcbiAgZGlhbG9nKDB4MzgpWzFdLmNvbmRpdGlvbiA9IDB4MDFiOyAgICAgLy8gcmV2ZWFsIGNvbmRpdGlvbjogMDFiIG1lc2lhIHJlY29yZGluZ1xuXG4gIC8vIEZvcnR1bmUgdGVsbGVyICgkMzkpIHNob3VsZCBhbHNvIG5vdCBzcGF3biBiYXNlZCBvbiBtZXNpYSByZWNvcmRpbmcgcmF0aGVyIHRoYW4gb3JiXG4gIHNwYXducygweDM5LCAweGQ4KVsxXSA9IH4weDAxYjsgIC8vIGZvcnR1bmUgdGVsbGVyIHJvb206IDAxYiBOT1RcblxuICAvLyBDbGFyayAoJDQ0KSBtb3ZlcyBhZnRlciB0YWxraW5nIHRvIGhpbSAoMDhkKSByYXRoZXIgdGhhbiBjYWxtaW5nIHNlYSAoMDhmKS5cbiAgLy8gVE9ETyAtIGNoYW5nZSAwOGQgdG8gd2hhdGV2ZXIgYWN0dWFsIGl0ZW0gaGUgZ2l2ZXMsIHRoZW4gcmVtb3ZlIGJvdGggZmxhZ3NcbiAgcm9tLm5wY3NbMHg0NF0uc3Bhd25Db25kaXRpb25zLnNldCgweGU5LCBbfjB4MDhkXSk7IC8vIHpvbWJpZSB0b3duIGJhc2VtZW50XG4gIHJvbS5ucGNzWzB4NDRdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHhlNCwgWzB4MDhkXSk7ICAvLyBqb2VsIHNoZWRcbiAgLy9kaWFsb2coMHg0NCwgMHhlOSlbMV0uZmxhZ3MucG9wKCk7IC8vIHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG5cbiAgLy8gQnJva2FoYW5hICgkNTQpIH4gd2FycmlvciByaW5nIHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NTQpWzJdLmZsYWdzID0gW107XG5cbiAgLy8gRGVvICgkNWEpIH4gcGVuZGFudCByZWR1bmRhbnQgZmxhZ1xuICAvL2RpYWxvZygweDVhKVsxXS5mbGFncyA9IFtdO1xuXG4gIC8vIFplYnUgKCQ1ZSkgY2F2ZSBkaWFsb2cgKEAgJDEwKVxuICAvLyBUT0RPIC0gZGlhbG9ncygweDVlLCAweDEwKS5yZWFycmFuZ2UofjB4MDNhLCAweDAwZCwgMHgwMzgsIDB4MDM5LCAweDAwYSwgfjB4MDAwKTtcbiAgcm9tLm5wY3NbMHg1ZV0ubG9jYWxEaWFsb2dzLnNldCgweDEwLCBbXG4gICAgTG9jYWxEaWFsb2cub2YofjB4MDNhLCBbMHgwMCwgMHgxYV0sIFsweDAzYV0pLCAvLyAwM2EgTk9UIHRhbGtlZCB0byB6ZWJ1IGluIGNhdmUgLT4gU2V0IDAzYVxuICAgIExvY2FsRGlhbG9nLm9mKCAweDAwZCwgWzB4MDAsIDB4MWRdKSwgLy8gMDBkIGxlYWYgdmlsbGFnZXJzIHJlc2N1ZWRcbiAgICBMb2NhbERpYWxvZy5vZiggMHgwMzgsIFsweDAwLCAweDFjXSksIC8vIDAzOCBsZWFmIGF0dGFja2VkXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDM5LCBbMHgwMCwgMHgxZF0pLCAvLyAwMzkgbGVhcm5lZCByZWZyZXNoXG4gICAgTG9jYWxEaWFsb2cub2YoIDB4MDBhLCBbMHgwMCwgMHgxYiwgMHgwM10pLCAvLyAwMGEgd2luZG1pbGwga2V5IHVzZWQgLT4gdGVhY2ggcmVmcmVzaFxuICAgIExvY2FsRGlhbG9nLm9mKH4weDAwMCwgWzB4MDAsIDB4MWRdKSxcbiAgXSk7XG4gIC8vIERvbid0IGRlc3Bhd24gb24gZ2V0dGluZyBiYXJyaWVyXG4gIHJlbW92ZShzcGF3bnMoMHg1ZSwgMHgxMCksIH4weDA1MSk7IC8vIHJlbW92ZSAwNTEgTk9UIGxlYXJuZWQgYmFycmllclxuXG4gIC8vIFRvcm5lbCAoJDVmKSBpbiBzYWJyZSB3ZXN0ICgkMjEpIH4gdGVsZXBvcnQgcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg1ZiwgMHgyMSlbMV0uZmxhZ3MgPSBbXTtcbiAgLy8gRG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg1Zl0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDIxKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gU3RvbSAoJDYwKTogZG9uJ3QgZGVzcGF3biBvbiBnZXR0aW5nIGJhcnJpZXJcbiAgcm9tLm5wY3NbMHg2MF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweDFlKTsgLy8gcmVtb3ZlIDA1MSBOT1QgbGVhcm5lZCBiYXJyaWVyXG5cbiAgLy8gQXNpbmEgKCQ2MikgaW4gYmFjayByb29tICgkZTEpIGdpdmVzIGZsdXRlIG9mIGxpbWVcbiAgY29uc3QgYXNpbmEgPSByb20ubnBjc1sweDYyXTtcbiAgYXNpbmEuZGF0YVsxXSA9IDB4Mjg7XG4gIGRpYWxvZyhhc2luYS5pZCwgMHhlMSlbMF0ubWVzc2FnZS5hY3Rpb24gPSAweDExO1xuICBkaWFsb2coYXNpbmEuaWQsIDB4ZTEpWzJdLm1lc3NhZ2UuYWN0aW9uID0gMHgxMTtcbiAgLy8gUHJldmVudCBkZXNwYXduIGZyb20gYmFjayByb29tIGFmdGVyIGRlZmVhdGluZyBzYWJlcmEgKH4wOGYpXG4gIHJlbW92ZShzcGF3bnMoYXNpbmEuaWQsIDB4ZTEpLCB+MHgwOGYpO1xuXG4gIC8vIEtlbnN1IGluIGNhYmluICgkNjggQCAkNjEpIG5lZWRzIHRvIGJlIGF2YWlsYWJsZSBldmVuIGFmdGVyIHZpc2l0aW5nIEpvZWwuXG4gIC8vIENoYW5nZSBoaW0gdG8ganVzdCBkaXNhcHBlYXIgYWZ0ZXIgc2V0dGluZyB0aGUgcmlkZWFibGUgZG9scGhpbiBmbGFnICgwOWIpLFxuICAvLyBhbmQgdG8gbm90IGV2ZW4gc2hvdyB1cCBhdCBhbGwgdW5sZXNzIHRoZSBmb2cgbGFtcCB3YXMgcmV0dXJuZWQgKDAyMSkuXG4gIHJvbS5ucGNzWzB4NjhdLnNwYXduQ29uZGl0aW9ucy5zZXQoMHg2MSwgW34weDA5YiwgMHgwMjFdKTtcbiAgZGlhbG9nKDB4NjgpWzBdLm1lc3NhZ2UuYWN0aW9uID0gMHgwMjsgLy8gZGlzYXBwZWFyXG5cbiAgLy8gQXp0ZWNhIGluIFNoeXJvbiAoNmUpIHNob3VsZG4ndCBzcGF3biBhZnRlciBtYXNzYWNyZSAoMDI3KVxuICByb20ubnBjc1sweDZlXS5zcGF3bkNvbmRpdGlvbnMuZ2V0KDB4ZjIpIS5wdXNoKH4weDAyNyk7XG4gIC8vIEFsc28gdGhlIGRpYWxvZyB0cmlnZ2VyICg4Mikgc2hvdWxkbid0IGhhcHBlblxuICByb20udHJpZ2dlcigweDgyKS5jb25kaXRpb25zLnB1c2gofjB4MDI3KTtcblxuICAvLyBLZW5zdSBpbiBsaWdodGhvdXNlICgkNzQvJDdlIEAgJDYyKSB+IHJlZHVuZGFudCBmbGFnXG4gIC8vZGlhbG9nKDB4NzQsIDB4NjIpWzBdLmZsYWdzID0gW107XG5cbiAgLy8gQXp0ZWNhICgkODMpIGluIHB5cmFtaWQgfiBib3cgb2YgdHJ1dGggcmVkdW5kYW50IGZsYWdcbiAgLy9kaWFsb2coMHg4MylbMF0uY29uZGl0aW9uID0gfjB4MjQwOyAgLy8gMjQwIE5PVCBib3cgb2YgdHJ1dGhcbiAgLy9kaWFsb2coMHg4MylbMF0uZmxhZ3MgPSBbXTtcblxuICAvLyBSYWdlIGJsb2NrcyBvbiBzd29yZCBvZiB3YXRlciwgbm90IHJhbmRvbSBpdGVtIGZyb20gdGhlIGNoZXN0XG4gIGRpYWxvZygweGMzKVswXS5jb25kaXRpb24gPSAweDIwMjtcblxuICAvLyBSZW1vdmUgdXNlbGVzcyBzcGF3biBjb25kaXRpb24gZnJvbSBNYWRvIDFcbiAgcm9tLm5wY3NbMHhjNF0uc3Bhd25Db25kaXRpb25zLmRlbGV0ZSgweGYyKTsgLy8gYWx3YXlzIHNwYXduXG5cbiAgLy8gRHJheWdvbiAyICgkY2IgQCBsb2NhdGlvbiAkYTYpIHNob3VsZCBkZXNwYXduIGFmdGVyIGJlaW5nIGRlZmVhdGVkLlxuICByb20ubnBjc1sweGNiXS5zcGF3bkNvbmRpdGlvbnMuc2V0KDB4YTYsIFt+MHgyOGRdKTsgLy8ga2V5IG9uIGJhY2sgd2FsbCBkZXN0cm95ZWRcblxuICAvLyBGaXggWmVidSB0byBnaXZlIGtleSB0byBzdHh5IGV2ZW4gaWYgdGh1bmRlciBzd29yZCBpcyBnb3R0ZW4gKGp1c3Qgc3dpdGNoIHRoZVxuICAvLyBvcmRlciBvZiB0aGUgZmlyc3QgdHdvKS4gIEFsc28gZG9uJ3QgYm90aGVyIHNldHRpbmcgMDNiIHNpbmNlIHRoZSBuZXcgSXRlbUdldFxuICAvLyBsb2dpYyBvYnZpYXRlcyB0aGUgbmVlZC5cbiAgY29uc3QgemVidVNoeXJvbiA9IHJvbS5ucGNzWzB4NWVdLmxvY2FsRGlhbG9ncy5nZXQoMHhmMikhO1xuICB6ZWJ1U2h5cm9uLnVuc2hpZnQoLi4uemVidVNoeXJvbi5zcGxpY2UoMSwgMSkpO1xuICAvLyB6ZWJ1U2h5cm9uWzBdLmZsYWdzID0gW107XG5cbiAgLy8gU2h5cm9uIG1hc3NhY3JlICgkODApIHJlcXVpcmVzIGtleSB0byBzdHh5XG4gIHJvbS50cmlnZ2VyKDB4ODApLmNvbmRpdGlvbnMgPSBbXG4gICAgfjB4MDI3LCAvLyBub3QgdHJpZ2dlcmVkIG1hc3NhY3JlIHlldFxuICAgICAweDAzYiwgLy8gZ290IGl0ZW0gZnJvbSBrZXkgdG8gc3R4eSBzbG90XG4gICAgIDB4MjAzLCAvLyBnb3Qgc3dvcmQgb2YgdGh1bmRlclxuICBdO1xuXG4gIC8vIEVudGVyIHNoeXJvbiAoJDgxKSBzaG91bGQgc2V0IHdhcnAgbm8gbWF0dGVyIHdoYXRcbiAgcm9tLnRyaWdnZXIoMHg4MSkuY29uZGl0aW9ucyA9IFtdO1xuXG4gIGlmIChmbGFncy5iYXJyaWVyUmVxdWlyZXNDYWxtU2VhKCkpIHtcbiAgICAvLyBMZWFybiBiYXJyaWVyICgkODQpIHJlcXVpcmVzIGNhbG0gc2VhXG4gICAgcm9tLnRyaWdnZXIoMHg4NCkuY29uZGl0aW9ucy5wdXNoKDB4MjgzKTsgLy8gMjgzIGNhbG1lZCB0aGUgc2VhXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIG5vdCBzZXR0aW5nIDA1MSBhbmQgY2hhbmdpbmcgdGhlIGNvbmRpdGlvbiB0byBtYXRjaCB0aGUgaXRlbVxuICB9XG4gIC8vcm9tLnRyaWdnZXIoMHg4NCkuZmxhZ3MgPSBbXTtcblxuICAvLyBBZGQgYW4gZXh0cmEgY29uZGl0aW9uIHRvIHRoZSBMZWFmIGFiZHVjdGlvbiB0cmlnZ2VyIChiZWhpbmQgemVidSkuICBUaGlzIGVuc3VyZXNcbiAgLy8gYWxsIHRoZSBpdGVtcyBpbiBMZWFmIHByb3BlciAoZWxkZXIgYW5kIHN0dWRlbnQpIGFyZSBnb3R0ZW4gYmVmb3JlIHRoZXkgZGlzYXBwZWFyLlxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2goMHgwM2EpOyAvLyAwM2EgdGFsa2VkIHRvIHplYnUgaW4gY2F2ZVxuXG4gIC8vIE1vcmUgd29yayBvbiBhYmR1Y3Rpb24gdHJpZ2dlcnM6XG4gIC8vIDEuIFJlbW92ZSB0aGUgOGQgdHJpZ2dlciBpbiB0aGUgZnJvbnQgb2YgdGhlIGNlbGwsIHN3YXAgaXQgb3V0XG4gIC8vICAgIGZvciBiMiAobGVhcm4gcGFyYWx5c2lzKS5cbiAgcm9tLnRyaWdnZXIoMHg4ZCkudXNlZCA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IHNwYXduIG9mIHJvbS5sb2NhdGlvbnMuTXRTYWJyZU5vcnRoX1N1bW1pdENhdmUuc3Bhd25zKSB7XG4gICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKSBzcGF3bi5pZCA9IDB4YjI7XG4gIH1cbiAgcmVtb3ZlSWYocm9tLmxvY2F0aW9ucy5XYXRlcmZhbGxWYWxsZXlOb3J0aC5zcGF3bnMsXG4gICAgICAgICAgIHNwYXduID0+IHNwYXduLmlzVHJpZ2dlcigpICYmIHNwYXduLmlkID09PSAweDhkKTtcbiAgLy8gMi4gU2V0IHRoZSB0cmlnZ2VyIHRvIHJlcXVpcmUgaGF2aW5nIGtpbGxlZCBrZWxiZXNxdWUuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnMucHVzaCgweDEwMik7IC8vIGtpbGxlZCBrZWxiZXNxdWVcbiAgLy8gMy4gQWxzbyBzZXQgdGhlIHRyaWdnZXIgdG8gZnJlZSB0aGUgdmlsbGFnZXJzIGFuZCB0aGUgZWxkZXIuXG4gIHJvbS50cmlnZ2VyKDB4YjIpLmZsYWdzLnB1c2gofjB4MDg0LCB+MHgwODUsIDB4MDBkKTtcbiAgLy8gNC4gRG9uJ3QgdHJpZ2dlciB0aGUgYWJkdWN0aW9uIGluIHRoZSBmaXJzdCBwbGFjZSBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDhjKS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA1LiBEb24ndCB0cmlnZ2VyIHJhYmJpdCBibG9jayBpZiBrZWxiZXNxdWUgZGVhZFxuICByb20udHJpZ2dlcigweDg2KS5jb25kaXRpb25zLnB1c2gofjB4MTAyKTsgLy8ga2lsbGVkIGtlbGJlc3F1ZVxuICAvLyA2LiBEb24ndCBmcmVlIHZpbGxhZ2VycyBmcm9tIHVzaW5nIHByaXNvbiBrZXlcbiAgcm9tLnByZ1sweDFlMGEzXSA9IDB4YzA7XG4gIHJvbS5wcmdbMHgxZTBhNF0gPSAweDAwO1xuXG4gIC8vIFRPRE8gLSBhZGRpdGlvbmFsIHdvcmsgb24gYWJkdWN0aW9uIHRyaWdnZXI6XG4gIC8vICAgLSBnZXQgcmlkIG9mIHRoZSBmbGFncyBvbiBrZXkgdG8gcHJpc29uIHVzZVxuICAvLyAgIC0gYWRkIGEgY29uZGl0aW9uIHRoYXQgYWJkdWN0aW9uIGRvZXNuJ3QgaGFwcGVuIGlmIHJlc2N1ZWRcbiAgLy8gR2V0IHJpZCBvZiBCT1RIIHRyaWdnZXJzIGluIHN1bW1pdCBjYXZlLCAgSW5zdGVhZCwgdGllIGV2ZXJ5dGhpbmdcbiAgLy8gdG8gdGhlIGVsZGVyIGRpYWxvZyBvbiB0b3BcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBzdGlsbCBhbGl2ZSwgbWF5YmUgZ2l2ZSBhIGhpbnQgYWJvdXQgd2Vha25lc3NcbiAgLy8gICAtIGlmIGtlbGJlc3F1ZSBkZWFkIHRoZW4gdGVhY2ggcGFyYWx5c2lzIGFuZCBzZXQvY2xlYXIgZmxhZ3NcbiAgLy8gICAtIGlmIHBhcmFseXNpcyBsZWFybmVkIHRoZW4gc2F5IHNvbWV0aGluZyBnZW5lcmljXG4gIC8vIFN0aWxsIG5lZWQgdG8ga2VlcCB0aGUgdHJpZ2dlciBpbiB0aGUgZnJvbnQgaW4gY2FzZSBub1xuICAvLyBhYmR1Y3Rpb24geWV0XG4gIC8vICAgLSBpZiBOT1QgcGFyYWx5c2lzIEFORCBpZiBOT1QgZWxkZXIgbWlzc2luZyBBTkQgaWYga2VsYmVxdWUgZGVhZFxuICAvLyAtLS0+IG5lZWQgc3BlY2lhbCBoYW5kbGluZyBmb3IgdHdvIHdheXMgdG8gZ2V0IChsaWtlIHJlZnJlc2gpP1xuICAvL1xuICAvLyBBbHNvIGFkZCBhIGNoZWNrIHRoYXQgdGhlIHJhYmJpdCB0cmlnZ2VyIGlzIGdvbmUgaWYgcmVzY3VlZCFcblxuXG5cbiAgLy8gUGFyYWx5c2lzIHRyaWdnZXIgKCRiMikgfiByZW1vdmUgcmVkdW5kYW50IGl0ZW1nZXQgZmxhZ1xuICAvL3JvbS50cmlnZ2VyKDB4YjIpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDI7XG4gIC8vcm9tLnRyaWdnZXIoMHhiMikuZmxhZ3Muc2hpZnQoKTsgLy8gcmVtb3ZlIDAzNyBsZWFybmVkIHBhcmFseXNpc1xuXG4gIC8vIExlYXJuIHJlZnJlc2ggdHJpZ2dlciAoJGI0KSB+IHJlbW92ZSByZWR1bmRhbnQgaXRlbWdldCBmbGFnXG4gIC8vcm9tLnRyaWdnZXIoMHhiNCkuY29uZGl0aW9uc1sxXSA9IH4weDI0MTtcbiAgLy9yb20udHJpZ2dlcigweGI0KS5mbGFncyA9IFtdOyAvLyByZW1vdmUgMDM5IGxlYXJuZWQgcmVmcmVzaFxuXG4gIC8vIFRlbGVwb3J0IGJsb2NrIG9uIG10IHNhYnJlIGlzIGZyb20gc3BlbGwsIG5vdCBzbG90XG4gIHJvbS50cmlnZ2VyKDB4YmEpLmNvbmRpdGlvbnNbMF0gPSB+MHgyNDQ7IC8vIH4wM2YgLT4gfjI0NFxuXG4gIC8vIFBvcnRvYSBwYWxhY2UgZ3VhcmQgbW92ZW1lbnQgdHJpZ2dlciAoJGJiKSBzdG9wcyBvbiAwMWIgKG1lc2lhKSBub3QgMDFmIChvcmIpXG4gIHJvbS50cmlnZ2VyKDB4YmIpLmNvbmRpdGlvbnNbMV0gPSB+MHgwMWI7XG5cbiAgLy8gUmVtb3ZlIHJlZHVuZGFudCB0cmlnZ2VyIDhhIChzbG90IDE2KSBpbiB6b21iaWV0b3duICgkNjUpXG4gIC8vICAtLSBub3RlOiBubyBsb25nZXIgbmVjZXNzYXJ5IHNpbmNlIHdlIHJlcHVycG9zZSBpdCBpbnN0ZWFkLlxuICAvLyBjb25zdCB7em9tYmllVG93bn0gPSByb20ubG9jYXRpb25zO1xuICAvLyB6b21iaWVUb3duLnNwYXducyA9IHpvbWJpZVRvd24uc3Bhd25zLmZpbHRlcih4ID0+ICF4LmlzVHJpZ2dlcigpIHx8IHguaWQgIT0gMHg4YSk7XG5cbiAgLy8gUmVwbGFjZSBhbGwgZGlhbG9nIGNvbmRpdGlvbnMgZnJvbSAwMGUgdG8gMjQzXG4gIGZvciAoY29uc3QgbnBjIG9mIHJvbS5ucGNzKSB7XG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5hbGxEaWFsb2dzKCkpIHtcbiAgICAgIGlmIChkLmNvbmRpdGlvbiA9PT0gMHgwMGUpIGQuY29uZGl0aW9uID0gMHgyNDM7XG4gICAgICBpZiAoZC5jb25kaXRpb24gPT09IH4weDAwZSkgZC5jb25kaXRpb24gPSB+MHgyNDM7XG4gICAgfVxuICB9XG59XG5cbi8vIEhhcmQgbW9kZSBmbGFnOiBIYyAtIHplcm8gb3V0IHRoZSBzd29yZCdzIGNvbGxpc2lvbiBwbGFuZVxuZnVuY3Rpb24gZGlzYWJsZVN0YWJzKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3QgbyBvZiBbMHgwOCwgMHgwOSwgMHgyN10pIHtcbiAgICByb20ub2JqZWN0c1tvXS5jb2xsaXNpb25QbGFuZSA9IDA7XG4gIH1cbiAgLy8gQWxzbyB0YWtlIHdhcnJpb3IgcmluZyBvdXQgb2YgdGhlIHBpY3R1cmUuLi4gOnRyb2xsOlxuICAvLyByb20uaXRlbUdldHNbMHgyYl0uaWQgPSAweDViOyAvLyBtZWRpY2FsIGhlcmIgZnJvbSBzZWNvbmQgZmx1dGUgb2YgbGltZSBjaGVja1xuICByb20ubnBjc1sweDU0XS5kYXRhWzBdID0gMHgyMDtcbn1cblxuZnVuY3Rpb24gb3Jic09wdGlvbmFsKHJvbTogUm9tKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgb2JqIG9mIFsweDEwLCAweDE0LCAweDE4LCAweDFkXSkge1xuICAgIC8vIDEuIExvb3NlbiB0ZXJyYWluIHN1c2NlcHRpYmlsaXR5IG9mIGxldmVsIDEgc2hvdHNcbiAgICByb20ub2JqZWN0c1tvYmpdLnRlcnJhaW5TdXNjZXB0aWJpbGl0eSAmPSB+MHgwNDtcbiAgICAvLyAyLiBJbmNyZWFzZSB0aGUgbGV2ZWwgdG8gMlxuICAgIHJvbS5vYmplY3RzW29ial0ubGV2ZWwgPSAyO1xuICB9XG59XG4iXX0=