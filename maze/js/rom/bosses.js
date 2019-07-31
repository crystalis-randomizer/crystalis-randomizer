import { readLittleEndian } from './util.js';
export class Bosses {
    constructor(rom) {
        this.rom = rom;
        this.all = [
            this.vampire1 = new Boss(this, 'Vampire 1', 0xc0, 0x0, true),
            this.insect = new Boss(this, 'Insect', 0xc1, 0x1),
            this.kelbesque1 = new Boss(this, 'Kelbesque 1', 0xc2, 0x2, true).sword(3),
            this.rage = new Boss(this, 'Rage', 0xc3, 0x3),
            this.sabera1 = new Boss(this, 'Sabera 1', 0x84, 0x4, true, 0x3656e).sword(3),
            this.vampire2 = new Boss(this, 'Vampire 2', 0xcc, 0xc, true),
            this.mado1 = new Boss(this, 'Mado 1', -1, 0x5, true, 0x3d820).sword(3),
            this.kelbesque2 = new Boss(this, 'Kelbesque 2', 0xc5, 0x6, true).sword(3),
            this.sabera2 = new Boss(this, 'Sabera 2', 0xc6, 0x7, true).sword(3),
            this.mado2 = new Boss(this, 'Mado 2', 0xc7, 0x8, true).sword(3),
            this.karmine = new Boss(this, 'Karmine', 0xc8, 0x9, true).sword(2),
            this.draygon1 = new Boss(this, 'Draygon 1', 0xcb, 0xa).sword(2),
            this.statueOfMoon = new Boss(this, 'Statue of Moon', 0xc9),
            this.statueOfSun = new Boss(this, 'Statue of Sun', 0xca),
            this.draygon2 = new Boss(this, 'Draygon 2', 0xcb, 0xb).sword(3),
            this.dyna = new Boss(this, 'Dyna', -1, 0xd),
        ];
    }
    fromLocation(id) {
        return this.all.find(b => b.location === id);
    }
    fromBossKill(num) {
        return this.all.find(b => b.kill === num);
    }
    fromObject(id) {
        return this.all.find(b => b.object === id);
    }
    [Symbol.iterator]() {
        return this.all[Symbol.iterator]();
    }
}
export class Boss {
    constructor(bosses, name, npc, kill, shuffled, address) {
        this.bosses = bosses;
        this.name = name;
        this.npc = npc;
        this.kill = kill;
        this.shuffled = shuffled;
        this.swordLevel = 1;
        this.objectAddress = address || (0x80f0 | (npc & 0xfc) << 6 | (npc & 3) << 2 | 1);
        this.object = bosses.rom.prg[this.objectAddress];
        const { prg } = bosses.rom;
        if (kill != null) {
            const killAddr = 0x14000 + readLittleEndian(prg, 0x1f96b + 2 * kill);
            const drop = prg[killAddr + 4];
            if (drop !== 0xff)
                this.drop = drop;
            this.location = prg[0x1f95d + kill];
        }
    }
    sword(level) {
        this.swordLevel = level;
        return this;
    }
}
//# sourceMappingURL=bosses.js.map