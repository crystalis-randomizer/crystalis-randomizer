import { Entity } from './entity.js';
import { MessageId } from './messageid.js';
import { addr, hex, readBigEndian } from './util.js';
const UNUSED_TRIGGERS = new Set([
    0x87, 0x88, 0x89, 0x8f, 0x93, 0x96, 0x98, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
    0xa0, 0xb5, 0xb9, 0xbe, 0xc0,
]);
export class Trigger extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.used = !UNUSED_TRIGGERS.has(id);
        this.pointer = 0x1e17a + ((id & 0x7f) << 1);
        this.base = addr(rom.prg, this.pointer, 0x14000);
        this.conditions = [];
        this.message = new MessageId();
        this.flags = [];
        let word;
        let i = this.base;
        do {
            word = readBigEndian(rom.prg, i);
            const flag = word & 0x0fff;
            this.conditions.push(word & 0x2000 ? ~flag : flag);
            i += 2;
        } while (!(word & 0x8000));
        this.message = MessageId.from(rom.prg, i);
        do {
            i += 2;
            word = readBigEndian(rom.prg, i);
            const flag = word & 0x0fff;
            this.flags.push(word & 0x8000 ? ~flag : flag);
        } while (!(word & 0x4000));
    }
    bytes() {
        const bytes = [];
        if (!this.conditions.length)
            this.conditions.push(~0);
        for (let i = 0; i < this.conditions.length; i++) {
            let word = this.conditions[i];
            if (word < 0)
                word = ~word | 0x2000;
            if (i === this.conditions.length - 1)
                word = word | 0x8000;
            bytes.push(word >>> 8, word & 0xff);
        }
        bytes.push(...this.message.data);
        if (!this.flags.length)
            this.flags.push(~0);
        for (let i = 0; i < this.flags.length; i++) {
            let word = this.flags[i];
            if (word < 0)
                word = ~word | 0x8000;
            if (i === this.flags.length - 1)
                word = word | 0x4000;
            bytes.push(word >>> 8, word & 0xff);
        }
        return bytes;
    }
    async write(writer, base = 0x1e17a) {
        if (!this.used)
            return;
        const address = await writer.write(this.bytes(), 0x1e000, 0x1ffff, `Trigger ${hex(this.id)}`);
        writer.rom[base + 2 * (this.id & 0x7f)] = address & 0xff;
        writer.rom[base + 2 * (this.id & 0x7f) + 1] = (address >>> 8) - 0x40;
    }
}
//# sourceMappingURL=trigger.js.map