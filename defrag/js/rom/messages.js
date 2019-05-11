import { readLittleEndian, readString, seq, slice } from './util.js';
class DataTable extends Array {
    constructor(rom, base, count, width, func = width > 1 ? (...i) => i : i => i) {
        super(count);
        this.rom = rom;
        this.base = base;
        this.count = count;
        this.width = width;
        for (let i = 0; i < count; i++) {
            this[i] = func(...slice(rom.prg, base + i * width, width));
        }
    }
}
class AddressTable extends Array {
    constructor(rom, base, count, offset, func = i => i) {
        super(count);
        this.rom = rom;
        this.base = base;
        this.count = count;
        this.offset = offset;
        this.rom = rom;
        this.base = base;
        this.count = count;
        this.offset = offset;
        this.addresses = seq(this.count, (i) => readLittleEndian(rom.prg, base + 2 * i) + offset);
        for (let i = 0; i < count; i++) {
            this[i] = func(this.addresses[i], i, this.addresses);
        }
    }
}
class Message {
    constructor(messages, part, id, addr) {
        this.messages = messages;
        this.part = part;
        this.id = id;
        this.addr = addr;
        const prg = messages.rom.prg;
        const parts = [];
        this.bytes = [];
        for (let i = addr; prg[i]; i++) {
            const b = prg[i];
            this.bytes.push(b);
            if (b === 1) {
                if (i !== addr && prg[i - 1] !== 3) {
                    throw new Error(`Unexpected start message signal at ${i.toString(16)}`);
                }
            }
            else if (b === 2) {
                parts.push('\n');
            }
            else if (b === 3) {
                parts.push('\u25bc\n');
            }
            else if (b === 4) {
                parts.push('SIMEA');
            }
            else if (b === 8) {
                parts.push('ITEM');
            }
            else if (b >= 5 && b <= 9) {
                const next = prg[++i];
                if (b === 9) {
                    parts.push(' '.repeat(next));
                    continue;
                }
                parts.push(messages.extraWords[b][next]);
                if (!PUNCTUATION[String.fromCharCode(prg[i + 1])]) {
                    parts.push(' ');
                }
            }
            else if (b >= 0x80) {
                parts.push(messages.basicWords[b - 0x80]);
                if (!PUNCTUATION[String.fromCharCode(prg[i + 1])]) {
                    parts.push(' ');
                }
            }
            else if (b >= 0x20) {
                parts.push(String.fromCharCode(b));
            }
            else {
                throw new Error(`Non-exhaustive switch: ${b} at ${i.toString(16)}`);
            }
        }
        this.text = parts.join('');
    }
}
const PUNCTUATION = {
    '\0': true,
    ' ': true,
    '!': true,
    '\'': true,
    ',': true,
    '.': true,
    ':': true,
    '?': true,
    '_': true,
};
export class Messages {
    constructor(rom) {
        this.rom = rom;
        const str = (a) => readString(rom.prg, a);
        this.basicWords = new AddressTable(rom, 0x28900, 0x80, 0x20000, str);
        this.extraWords = {
            5: new AddressTable(rom, 0x28a00, 10, 0x20000, str),
            6: new AddressTable(rom, 0x28a14, 36, 0x20000, str),
            7: new AddressTable(rom, 0x28a5c, 74, 0x20000, str),
        };
        this.banks = new DataTable(rom, 0x283fe, 0x24, 1);
        this.parts = new AddressTable(rom, 0x28422, 0x22, 0x20000, (addr, part, addrs) => {
            const count = part === 0x21 ? 3 : (addrs[part + 1] - addr) >>> 1;
            return new AddressTable(rom, addr, count, (this.banks[part] << 13) - 0xa000, (m, id) => new Message(this, part, id, m));
        });
    }
}
//# sourceMappingURL=messages.js.map