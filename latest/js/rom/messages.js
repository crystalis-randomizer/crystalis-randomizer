import { hex, readLittleEndian, readString, seq, slice, writeLittleEndian, writeString } from './util.js';
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
        this.addresses = seq(this.count, (i) => {
            const a = readLittleEndian(rom.prg, base + 2 * i);
            return a && a + offset;
        });
        for (let i = 0; i < count; i++) {
            this[i] = func(this.addresses[i], i, this.addresses);
        }
    }
}
const DELIMITERS = new Map([[6, '{}'], [7, '[]']]);
class Message {
    constructor(messages, part, id, addr, pointer) {
        this.messages = messages;
        this.part = part;
        this.id = id;
        this.addr = addr;
        this.pointer = pointer;
        this.bytes = [];
        this.hex = '';
        const prg = messages.rom.prg;
        const parts = [];
        for (let i = addr; addr && prg[i]; i++) {
            const b = prg[i];
            this.bytes.push(b);
            if (b === 1) {
                if (i !== addr && prg[i - 1] !== 3) {
                    throw new Error(`Unexpected start message signal at ${i.toString(16)}`);
                }
            }
            else if (b === 2) {
                parts.push('\n ');
            }
            else if (b === 3) {
                parts.push(`${Messages.CONTINUED}\n`);
            }
            else if (b === 4) {
                parts.push('{:HERO:}');
            }
            else if (b === 8) {
                parts.push('[:ITEM:]');
            }
            else if (b >= 5 && b <= 9) {
                const next = prg[++i];
                if (b === 9) {
                    parts.push(' '.repeat(next));
                    continue;
                }
                const delims = DELIMITERS.get(b);
                if (delims) {
                    parts.push(delims[0]);
                    parts.push(next.toString(16).padStart(2, '0'));
                    parts.push(':');
                }
                parts.push(messages.extraWords[b][next]);
                if (delims)
                    parts.push(delims[1]);
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
    mid() {
        return `${hex(this.part)}:${hex(this.id)}`;
    }
    fixText() {
        if (this.checkText())
            return;
        const parts = [];
        let lineNum = 0;
        let lineLen = 0;
        let space = false;
        let word = [];
        function insert(str, len = str.length, fallback) {
            if (lineLen + len > 29) {
                if (fallback) {
                    const split = fallback.split(/\s+/);
                    for (let i = 0; i < split.length; i++) {
                        if (i)
                            insertSpace();
                        insert(split[i]);
                    }
                    return;
                }
                newline();
            }
            if (str === ' ') {
                parts.push(...word, ' ');
                word = [];
            }
            else {
                word.push(str);
            }
            lineLen += len;
            space = str.endsWith(' ');
        }
        function insertSpace() {
            if (!space)
                insert(' ');
            space = true;
        }
        function newline() {
            lineLen = 1;
            if (++lineNum > 3) {
                parts.push('#\n ');
                lineNum = 0;
            }
            else {
                parts.push('\n ');
            }
            space = true;
        }
        for (let i = 0; i < this.text.length; i++) {
            const c = this.text[i];
            const next = this.text[i + 1];
            if (/\s/.test(c)) {
                insertSpace();
            }
            else if (c === '{') {
                if (next === ':') {
                    insert('{:HERO:}', 6);
                }
                else {
                    const colon = this.text.indexOf(':', i);
                    const id = Number.parseInt(this.text.substring(i + 1, colon), 16);
                    const name = this.messages.extraWords[6][id];
                    insert(`{${id.toString(16)}:${name}}`, name.length, name);
                }
                i = this.text.indexOf('}', i);
            }
            else if (c === '[') {
                if (next === ':') {
                    const items = this.messages.rom.items;
                    insert('[:ITEM:]', Math.max(...items.map(i => i.messageName.length)));
                }
                else {
                    const colon = this.text.indexOf(':', i);
                    const id = Number.parseInt(this.text.substring(i + 1, colon), 16);
                    const name = this.messages.rom.items[id].messageName;
                    insert(`[${id.toString(16)}:${name}]`, name.length, name);
                }
                i = this.text.indexOf(']', i);
            }
            else {
                insert(c);
            }
        }
        parts.push(...word);
        this.text = parts.join('');
    }
    checkText() {
        let lineNum = 0;
        let lineLen = 0;
        for (let i = 0; i < this.text.length; i++) {
            const c = this.text[i];
            const next = this.text[i + 1];
            if (c === '\n') {
                lineNum++;
                lineLen = 1;
                if (lineNum > 3)
                    return false;
            }
            else if (c === '#') {
                if (next === '\n')
                    i++;
                lineNum = lineLen = 0;
            }
            else if (c === '{' || c === '[') {
                if (next === ':') {
                    if (c === '{') {
                        lineLen += 6;
                    }
                    else {
                        const items = this.messages.rom.items;
                        lineLen += Math.max(...items.map(i => i.messageName.length));
                    }
                    if (lineLen > 28)
                        return false;
                }
                else {
                    const colon = this.text.indexOf(':', i);
                    const id = Number.parseInt(this.text.substring(i + 1, colon), 16);
                    lineLen += (c === '{' ?
                        this.messages.extraWords[6][id] :
                        this.messages.rom.items[id].messageName).length;
                }
                i = this.text.indexOf(CLOSERS[c], i);
            }
            else {
                lineLen++;
            }
            if (lineLen > 29 && c !== ' ')
                return false;
        }
        return true;
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
    ';': true,
    '?': true,
    '_': true,
    '\n': true,
    '#': true,
};
export class Messages {
    constructor(rom) {
        this.rom = rom;
        const commonWordsBase = readLittleEndian(rom.prg, 0x28704) + 0x20000;
        const extraWordsBase = readLittleEndian(rom.prg, 0x2868a) + 0x20000;
        const personNamesBase = readLittleEndian(rom.prg, 0x286d5) + 0x20000;
        const itemNamesBase = readLittleEndian(rom.prg, 0x286e9) + 0x20000;
        const str = (a) => readString(rom.prg, a);
        this.basicWords = new AddressTable(rom, commonWordsBase, 0x80, 0x20000, str);
        this.extraWords = {
            5: new AddressTable(rom, extraWordsBase, (personNamesBase - extraWordsBase) >>> 1, 0x20000, str),
            6: new AddressTable(rom, personNamesBase, 36, 0x20000, str),
            7: new AddressTable(rom, itemNamesBase, 74, 0x20000, str),
        };
        this.banks = new DataTable(rom, 0x283fe, 0x24, 1);
        this.parts = new AddressTable(rom, 0x28422, 0x22, 0x20000, (addr, part, addrs) => {
            const count = part === 0x21 ? 3 : (addrs[part + 1] - addr) >>> 1;
            return new AddressTable(rom, addr, count, (this.banks[part] << 13) - 0xa000, (m, id) => new Message(this, part, id, m, addr + 2 * id));
        });
    }
    *messages(used) {
        for (const part of this.parts) {
            if (used) {
                for (const message of part) {
                    if (used.has(message.mid()))
                        yield message;
                }
            }
            else {
                yield* part;
            }
        }
    }
    uses() {
        const out = new Map();
        function use(message, usage) {
            const str = typeof message === 'string' ? message : message.mid();
            const set = out.get(str) || new Set();
            set.add(usage);
            out.set(str, set);
        }
        for (const trigger of this.rom.triggers) {
            if (trigger.message.nonzero()) {
                use(trigger.message, `Trigger $${hex(trigger.id)}`);
            }
        }
        for (const item of this.rom.items) {
            for (const m of item.itemUseMessages()) {
                if (m.nonzero())
                    use(m, `Item $${hex(item.id)}`);
            }
        }
        for (const npc of this.rom.npcs) {
            for (const d of npc.globalDialogs) {
                use(d.message, `NPC $${hex(npc.id)}`);
            }
            for (const [l, ds] of npc.localDialogs) {
                const lh = l >= 0 ? ` @ $${hex(l)}` : '';
                for (const d of ds) {
                    use(d.message, `NPC $${hex(npc.id)}${lh}`);
                }
            }
        }
        for (const sage of this.rom.telepathy.sages) {
            for (const d of sage.defaultMessages) {
                use(d, `Telepathy ${sage.sage}`);
            }
            for (const g of sage.messageGroups) {
                for (const [, ...ms] of g.messages) {
                    for (const m of ms) {
                        use(m, `Telepathy ${sage.sage}`);
                    }
                }
            }
        }
        for (const m of HARDCODED_MESSAGES) {
            use(m, 'Hardcoded');
        }
        return out;
    }
    buildAbbreviationTable(uses = this.uses()) {
        const words = [];
        const addrs = new Map();
        const alias = new Map();
        for (const message of this.messages(uses)) {
            const mid = message.mid();
            const seen = addrs.get(message.addr);
            const aliases = seen != null && alias.get(seen);
            if (aliases) {
                aliases.push(mid);
                continue;
            }
            addrs.set(message.addr, mid);
            alias.set(mid, []);
            const text = message.text;
            let letters = [];
            for (let i = 0, len = text.length; i <= len; i++) {
                const c = text[i];
                const closer = CLOSERS[c];
                if (PUNCTUATION[c] || closer || i === len) {
                    const next = text[i + 1];
                    if (closer)
                        i = Math.max(i, text.indexOf(closer, i));
                    if (!letters.length)
                        continue;
                    const chain = (c === ' ' || c === '\'') && next && !PUNCTUATION[next] ? c : '';
                    const str = letters.join('');
                    const id = words.length;
                    const bytes = str.length + (c === ' ' ? 1 : 0);
                    letters = [];
                    words.push({ str, id, chain, bytes, used: 0, suffixes: new Set(), mid });
                }
                else {
                    letters.push(c);
                }
            }
        }
        const suffixes = new Map();
        for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i];
            for (let j = word.bytes - 2; j >= 0; j--) {
                const suffix = word.str.substring(j);
                let str = suffix;
                let len = 0;
                let later = word;
                let saving = word.bytes - j - 1;
                while (true) {
                    let data = suffixes.get(str);
                    if (!data)
                        suffixes.set(str, (data = { chains: len, missing: j,
                            saving: -str.length, str,
                            words: new Set() }));
                    data.words.add(i);
                    data.saving += saving;
                    for (let k = len; k >= 0; k--)
                        words[i + k].suffixes.add(data);
                    if (!later.chain)
                        break;
                    str += later.chain;
                    later = words[i + (++len)];
                    str += later.str;
                    saving += later.bytes;
                }
            }
        }
        const invalid = new Set();
        const abbr = [];
        const order = ({ saving: a }, { saving: b }) => b - a;
        const sorted = [...suffixes.values()].sort(order);
        let tableLength = 0;
        while (sorted.length && tableLength < MAX_TABLE_LENGTH) {
            if (invalid.has(sorted[0].str)) {
                sorted.sort(order);
                invalid.clear();
            }
            const { str, saving, missing, words: ws, chains } = sorted.shift();
            if (saving <= 0)
                break;
            tableLength += str.length + 3;
            const l = abbr.length;
            const mids = new Set();
            for (const w of ws) {
                const word = words[w];
                for (const mid of [word.mid, ...(alias.get(word.mid) || [])]) {
                    mids.add(mid);
                }
            }
            abbr.push({
                bytes: l < 0x80 ? [l + 0x80] : [5, l - 0x80],
                mids,
                str,
            });
            for (const i of ws) {
                for (let k = 0; k <= chains; k++) {
                    const word = words[i + k];
                    const used = word.bytes - (!k ? missing : 0);
                    for (const suffix of word.suffixes) {
                        suffix.saving -= (used - word.used);
                        invalid.add(suffix.str);
                    }
                    word.used = used;
                }
            }
            if (abbr.length === 0x80) {
                for (const data of suffixes.values()) {
                    data.saving -= data.words.size;
                }
                sorted.sort(order);
                invalid.clear();
            }
        }
        return abbr;
    }
    async write(writer) {
        const uses = this.uses();
        const table = this.buildAbbreviationTable(uses);
        function updateCoderef(loc, addr) {
            writeLittleEndian(writer.rom, loc, addr - 0x20000);
            writeLittleEndian(writer.rom, loc + 5, addr + 1 - 0x20000);
        }
        let a = 0x288a5;
        let d = a + 2 * (table.length + this.rom.items.length + this.extraWords[6].count);
        updateCoderef(0x28704, a);
        for (let i = 0, len = table.length; i < len; i++) {
            if (i === 0x80)
                updateCoderef(0x2868a, a);
            writeLittleEndian(writer.rom, a, d);
            a += 2;
            writeString(writer.rom, d, table[i].str);
            d += table[i].str.length;
            writer.rom[d++] = 0;
        }
        if (table.length < 0x80)
            updateCoderef(0x2868a, a);
        updateCoderef(0x286d5, a);
        const names = this.extraWords[6];
        for (const name of names) {
            writeLittleEndian(writer.rom, a, d);
            a += 2;
            writeString(writer.rom, d, name);
            d += name.length;
            writer.rom[d++] = 0;
        }
        updateCoderef(0x286e9, a);
        updateCoderef(0x28789, a);
        for (const item of this.rom.items) {
            writeLittleEndian(writer.rom, a, d);
            a += 2;
            writeString(writer.rom, d, item.messageName);
            d += item.messageName.length;
            writer.rom[d++] = 0;
        }
        const abbrs = new Map();
        for (const abbr of table) {
            for (const mid of abbr.mids) {
                let abbrList = abbrs.get(mid);
                if (!abbrList)
                    abbrs.set(mid, (abbrList = []));
                abbrList.push(abbr);
            }
        }
        for (const abbrList of abbrs.values()) {
            abbrList.sort(({ str: { length: x } }, { str: { length: y } }) => y - x);
        }
        const promises = seq(this.parts.length, () => []);
        for (const m of this.messages(uses)) {
            let text = m.text;
            text = text.replace(/([\[{])([^\]}]*)[\]}](.|$)/g, (full, bracket, inside, after) => {
                if (after && !PUNCTUATION[after])
                    return full;
                if (after === ' ')
                    after = '';
                if (bracket === '[' && inside === ':ITEM:') {
                    return `[8]${after}`;
                }
                else if (bracket === '{' && inside === ':HERO:') {
                    return `[4]${after}`;
                }
                const match = /^([0-9a-f]+):/.exec(inside);
                if (!match)
                    throw new Error(`Bad message text: ${full}`);
                const id = Number.parseInt(match[1], 16);
                return `[${bracket === '{' ? 6 : 7}][${id}]${after}`;
            });
            for (const { str, bytes } of abbrs.get(m.mid()) || []) {
                text = text.replace(new RegExp(str + '(  |.|$)', 'g'), (full, after) => {
                    if (after && !PUNCTUATION[after])
                        return full;
                    if (after === ' ')
                        after = '';
                    return bytes.map(b => `[${b}]`).join('') + after;
                });
            }
            const hexParts = ['[01]'];
            const bs = [];
            bs.push(1);
            for (let i = 0, len = text.length; i < len; i++) {
                const c = text[i];
                if (c === Messages.CONTINUED) {
                    bs.push(3, 1);
                    hexParts.push('[03][01]');
                    if (text[i + 1] === '\n')
                        i++;
                }
                else if (c === '\n') {
                    bs.push(2);
                    if (text[i + 1] === ' ')
                        i++;
                    hexParts.push('[02]');
                }
                else if (c === '[') {
                    const j = text.indexOf(']', i);
                    if (j <= 0)
                        throw new Error(`bad text: ${text}`);
                    const b = Number(text.substring(i + 1, j));
                    if (isNaN(b))
                        throw new Error(`bad text: ${text}`);
                    bs.push(b);
                    hexParts.push(`[${hex(b)}]`);
                    i = j;
                }
                else if (c === ' ' && text[i + 1] === ' ') {
                    let j = i + 2;
                    while (text[j] === ' ')
                        j++;
                    bs.push(9, j - i);
                    hexParts.push(`[09][${hex(j - i)}]`);
                    i = j - 1;
                }
                else {
                    bs.push(c.charCodeAt(0));
                    hexParts.push(c);
                }
            }
            bs.push(0);
            hexParts.push('[0]');
            m.bytes = bs;
            m.hex = hexParts.join('');
            const bank = this.banks[m.part] << 13;
            const offset = bank - 0xa000;
            promises[m.part][m.id] =
                writer.write(bs, bank, bank + 0x2000, `Message ${m.mid()}`)
                    .then(a => a - offset);
        }
        const addresses = await Promise.all(promises.map(ps => Promise.all(ps)));
        const parts = [];
        let pos = 0x28000;
        for (let part = 0; part < addresses.length; part++) {
            const bytes = [];
            for (let i = 0; i < addresses[part].length; i++) {
                writeLittleEndian(bytes, 2 * i, addresses[part][i]);
            }
            writer.rom.subarray(pos, pos + bytes.length).set(bytes);
            writeLittleEndian(writer.rom, 0x28422 + 2 * part, pos - 0x20000);
            pos += bytes.length;
        }
        for (let i = 0; i < this.banks.length; i++) {
            writer.rom[0x283fe + i] = this.banks[i];
        }
        await Promise.all(parts);
    }
}
Messages.CONTINUED = '#';
const MAX_TABLE_LENGTH = 1250;
const CLOSERS = { '{': '}', '[': ']' };
export const HARDCODED_MESSAGES = new Set([
    '20:1d',
    '1b:0f',
    '1b:10',
    '1b:11',
    '1b:12',
    '1b:05',
    '1f:00',
    '13:00',
    '0b:01',
    '20:0c',
    '20:0f',
    '1c:11',
    '0e:05',
    '16:00',
    '20:11',
    '21:00',
    '21:02',
    '21:01',
    '06:00',
    '18:00',
    '18:02',
    '18:04',
    '18:08',
    '1b:03',
    '1b:00',
    '1b:00',
    '06:01',
    '10:13',
    '19:05',
    '20:14',
    '20:15',
    '20:17',
    '20:02',
    '20:0d',
    '20:19',
    '20:1a',
    '20:1b',
    '03:01',
    '03:02',
    '10:10',
    '10:11',
    '10:12',
    '0c:04',
    '0c:05',
    '03:03',
    '20:0e',
    '20:13',
]);
//# sourceMappingURL=messages.js.map