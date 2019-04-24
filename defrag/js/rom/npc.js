import { Entity } from './entity.js';
import { addr, tuple } from './util.js';
export class Npc extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.used = !UNUSED_NPCS.has(id) && (id < 0x8f || id >= 0xc0);
        this.dataBase = 0x80f0 | ((id & 0xfc) << 6) | ((id & 3) << 2);
        this.data = tuple(rom.prg, this.dataBase, 4);
        this.spawnPointer = 0x1c5e0 + (id << 1);
        this.spawnBase = addr(rom.prg, this.spawnPointer, 0x14000);
        this.spawnConditions = new Map();
        let i = this.spawnBase;
        let loc;
        while (this.used && (loc = rom.prg[i++]) != 0xff) {
            const flags = [];
            this.spawnConditions.set(loc, flags);
            let word;
            do {
                word = rom.prg[i] << 8 | rom.prg[i + 1];
                const flag = word & 0x0fff;
                flags.push(word & 0x2000 ? ~flag : flag);
                i += 2;
            } while (!(word & 0x8000));
        }
    }
    spawnConditionsBytes() {
        const bytes = [];
        for (const [loc, flags] of this.spawnConditions) {
            bytes.push(loc);
            for (let i = 0; i < flags.length; i++) {
                let word = flags[i];
                if (word < 0)
                    word = ~word | 0x2000;
                if (i === flags.length - 1)
                    word = word | 0x8000;
                bytes.push(word >>> 8, word & 0xff);
            }
        }
        bytes.push(0xff);
        return bytes;
    }
    async write(writer, { spawnConditionsBase = 0x1c5e0 } = {}) {
        const address = await writer.write(this.spawnConditionsBytes(), 0x1c000, 0x1dfff);
        writer.rom[spawnConditionsBase + 2 * this.id] = address & 0xff;
        writer.rom[spawnConditionsBase + 2 * this.id + 1] = (address >>> 8) - 0x40;
    }
}
const UNUSED_NPCS = new Set([
    0x3c, 0x6a, 0x73, 0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
]);
//# sourceMappingURL=npc.js.map