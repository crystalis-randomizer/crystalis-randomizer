import { Entity } from './entity.js';
import { MessageId } from './messageid.js';
import { addr, hex, readBigEndian, readLittleEndian, tuple, writeLittleEndian } from './util.js';
export class Npc extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.spawnConditions = new Map();
        this.localDialogs = new Map();
        this.used = !UNUSED_NPCS.has(id) && (id < 0x8f || id >= 0xc0);
        const hasDialog = id <= 0xc3;
        this.dataBase = 0x80f0 | ((id & 0xfc) << 6) | ((id & 3) << 2);
        this.data = tuple(rom.prg, this.dataBase, 4);
        this.spawnPointer = 0x1c5e0 + (id << 1);
        this.spawnBase = readLittleEndian(rom.prg, this.spawnPointer) + 0x14000;
        let i = this.spawnBase;
        let loc;
        while (this.used && (loc = rom.prg[i++]) !== 0xff) {
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
        this.dialogPointer = hasDialog ? 0x1c95d + (id << 1) : 0;
        this.dialogBase = hasDialog ? addr(rom.prg, this.dialogPointer, 0x14000) : 0;
        this.globalDialogs = [];
        if (hasDialog) {
            let a = this.dialogBase;
            while (true) {
                const [dialog, last] = GlobalDialog.parse(rom.prg, a);
                a += 4;
                this.globalDialogs.push(dialog);
                if (last)
                    break;
            }
            const locations = [];
            while (true) {
                const location = rom.prg[a++];
                if (location === 0xff)
                    break;
                locations.push([location, rom.prg[a++]]);
            }
            if (!locations.length)
                locations.push([-1, 0]);
            const base = a;
            for (const [location, offset] of locations) {
                const dialogs = [];
                this.localDialogs.set(location, dialogs);
                a = base + offset;
                while (true) {
                    const [dialog, last] = LocalDialog.parse(rom.prg, a);
                    a += dialog.byteLength();
                    dialogs.push(dialog);
                    if (last)
                        break;
                }
            }
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
    dialogBytes() {
        if (!this.dialogPointer)
            return [];
        const bytes = [];
        function serialize(ds) {
            const out = [];
            for (let i = 0; i < ds.length; i++) {
                out.push(...ds[i].bytes(i === ds.length - 1));
            }
            return out;
        }
        bytes.push(...serialize(this.globalDialogs));
        const locals = [];
        const cache = new Map();
        for (const [location, dialogs] of this.localDialogs) {
            const localBytes = serialize(dialogs);
            const label = localBytes.join(',');
            const cached = cache.get(label);
            if (cached != null) {
                bytes.push(location, cached);
                continue;
            }
            cache.set(label, locals.length);
            if (location !== -1)
                bytes.push(location, locals.length);
            locals.push(...localBytes);
        }
        if (locals.length)
            bytes.push(0xff, ...locals);
        return bytes;
    }
    async write(writer) {
        if (!this.used)
            return;
        const promises = [];
        writer.rom.subarray(this.dataBase, this.dataBase + 4).set(this.data);
        promises.push(writer.write(this.spawnConditionsBytes(), 0x1c000, 0x1dfff, `SpawnCondition ${hex(this.id)}`).then(address => writeLittleEndian(writer.rom, this.spawnPointer, address - 0x14000)));
        if (this.dialogPointer) {
            promises.push(writer.write(this.dialogBytes(), 0x1c000, 0x1dfff, `Dialog ${hex(this.id)}`).then(address => writeLittleEndian(writer.rom, this.dialogPointer, address - 0x14000)));
        }
        await Promise.all(promises);
    }
}
export class GlobalDialog {
    constructor(condition, message) {
        this.condition = condition;
        this.message = message;
    }
    static parse(data, offset = 0) {
        const flag = readBigEndian(data, offset);
        const message = MessageId.from(data, offset + 2);
        let condition = flag & 0x03ff;
        const last = !!(flag & 0x8000);
        const sign = flag & 0x2000;
        if (sign)
            condition = ~condition;
        return [new GlobalDialog(condition, message), last];
    }
    bytes(last) {
        let flag = this.condition;
        if (flag < 0)
            flag = (~flag) | 0x2000;
        if (last)
            flag |= 0x8000;
        return [flag >>> 8, flag & 0xff, ...this.message.data];
    }
}
export class LocalDialog {
    constructor(condition, message, update, flags) {
        this.condition = condition;
        this.message = message;
        this.update = update;
        this.flags = flags;
    }
    static parse(data, offset = 0) {
        let word = readBigEndian(data, offset);
        const message = MessageId.from(data, offset + 2);
        const update = data[offset + 4];
        offset += 5;
        let condition = word & 0x03ff;
        const last = !!(word & 0x8000);
        const flags = [];
        const sign = word & 0x2000;
        if (sign)
            condition = ~condition;
        while (word & 0x4000) {
            word = readBigEndian(data, offset) ^ 0x4000;
            offset += 2;
            let flag = word & 0x03ff;
            if (word & 0x8000)
                flag = ~flag;
            flags.push(flag);
        }
        return [new LocalDialog(condition, message, update, flags), last];
    }
    byteLength() {
        return 5 + 2 * this.flags.length;
    }
    bytes(last) {
        let flag = this.condition;
        if (flag < 0)
            flag = (~flag) | 0x2000;
        if (last)
            flag |= 0x8000;
        if (this.flags.length)
            flag |= 0x4000;
        const out = [flag >>> 8, flag & 0xff, ...this.message.data, this.update];
        for (let i = 0; i < this.flags.length; i++) {
            let word = this.flags[i];
            if (word < 0)
                word = (~word) | 0x8000;
            if (i >= this.flags.length - 1)
                word |= 0x4000;
            out.push(word >>> 8, word & 0xff);
        }
        return out;
    }
}
const UNUSED_NPCS = new Set([
    0x31, 0x3c, 0x6a, 0x73, 0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
]);
//# sourceMappingURL=npc.js.map