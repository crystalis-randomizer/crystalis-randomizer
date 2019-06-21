import { readLittleEndian, seq } from './util.js';
class ChestSlot {
    constructor(slot, location, spawn) {
        this.slot = slot;
        this.location = location;
        this.spawn = spawn;
    }
    set(rom, item) {
        rom.locations[this.location].spawns[this.spawn].id = item;
        if (rom.spoiler) {
            rom.spoiler.addSlot(this.slot, `Chest in ${rom.locations[this.location].name}`, item);
        }
    }
}
class HardcodedSlot {
    constructor(slot, address, name) {
        this.slot = slot;
        this.address = address;
        this.name = name;
    }
    set(rom, item) {
        rom.prg[this.address] = item;
        if (this.name && rom.spoiler)
            rom.spoiler.addSlot(this.slot, this.name || '', item);
    }
}
class BossDropSlot {
    constructor(slot, boss) {
        this.slot = slot;
        this.boss = boss;
    }
    set(rom, item) {
        const addr = readLittleEndian(rom.prg, 0x1f987 + 2 * this.boss) + 0x14000;
        if (item >= 0x70)
            throw new Error('no mimics on bosses');
        rom.prg[addr] = item;
        if (rom.spoiler) {
            rom.spoiler.addSlot(this.slot, rom.bosses.fromBossKill(this.boss).name, item);
        }
    }
}
class PersonDataSlot {
    constructor(slot, person, index) {
        this.slot = slot;
        this.person = person;
        this.index = index;
    }
    set(rom, item) {
        if (item >= 0x70)
            throw new Error(`no mimics on people`);
        rom.npcs[this.person].data[this.index] = item;
        if (rom.spoiler) {
            const npc = rom.npcs[this.person];
            let name = npc && npc.name;
            if (npc && npc.itemNames) {
                const itemName = npc.itemNames[this.index];
                name = itemName ? name + ' ' + itemName : undefined;
            }
            rom.spoiler.addSlot(this.slot, name || '', item);
        }
    }
}
class Slots {
    constructor(rom) {
        this.rom = rom;
        const slots = seq(0x80, () => []);
        function addSlot(slot) {
            slots[slot.slot].push(slot);
        }
        for (const loc of rom.locations) {
            if (!loc.used)
                continue;
            for (let i = 0; i < loc.spawns.length; i++) {
                const spawn = loc.spawns[i];
                if (spawn.isChest())
                    addSlot(new ChestSlot(spawn.id, loc.id, i));
            }
        }
        for (const npc of rom.npcs) {
            if (!npc.used || !npc.hasDialog)
                continue;
            for (const ds of npc.localDialogs.values()) {
                for (const d of ds) {
                    switch (d.message.action) {
                        case 0x03:
                            addSlot(new PersonDataSlot(npc.data[0], npc.id, 0));
                            break;
                        case 0x09:
                        case 0x11:
                            addSlot(new PersonDataSlot(npc.data[1], npc.id, 1));
                            break;
                    }
                }
            }
        }
        for (const boss of rom.bosses) {
            if (boss.kill === 3 || boss.kill === 13)
                continue;
            if (boss.kill != null && boss.drop != null) {
                addSlot(new BossDropSlot(boss.drop, boss.kill));
            }
        }
        for (const [addr, name] of hardcodedItems) {
            addSlot(new HardcodedSlot(this.rom.prg[addr], addr, name));
        }
        extraSlots.forEach(addSlot);
        console.log('slots', slots);
        this.slots = slots;
    }
    update(fill) {
        for (let i = 0; i < fill.length; i++) {
            if (fill[i] == null)
                continue;
            for (const slot of this.slots[i]) {
                slot.set(this.rom, fill[i]);
            }
        }
        const flags = this.rom.itemGets.map(() => []);
        for (const itemget of this.rom.itemGets) {
            const { id } = itemget;
            for (const flag of itemget.flags) {
                if (flag === -1)
                    continue;
                const target = preservedItemGetFlags.has(flag) ? id : fill[id];
                (flags[target] || []).push(flag);
            }
        }
        for (const itemget of this.rom.itemGets) {
            itemget.flags = flags[itemget.id];
        }
    }
}
const hardcodedItems = [
    [0x367f4, 'Stom fight'],
    [0x3d18f, 'Slimed Kensu'],
    [0x3d1f9, 'Asina'],
    [0x3d2af, 'Stoned Akahana'],
    [0x3d30e, 'Lighthouse Kensu'],
    [0x3d337, 'Rage'],
    [0x3d655, 'Mt Sabre summit trigger'],
    [0x3d6d9, 'Whirlpool trigger'],
    [0x3d6de, 'Swan Kensu'],
    [0x3d6e8, 'Aryllis'],
    [0x3d711],
    [0x3d7fe, 'Akahana statue trade-in'],
    [0x3e3a2],
    [0x3e3a6],
    [0x3e3aa],
];
const extraSlots = [
    new PersonDataSlot(0x36, 0x63, 1),
];
export function update(rom, fill) {
    new Slots(rom).update(fill);
}
const preservedItemGetFlags = new Set([
    0x024,
    0x08b,
]);
//# sourceMappingURL=slots.js.map