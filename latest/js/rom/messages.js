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
        const expansions = new Map();
        function insert(str, len = str.length) {
            if (lineLen + len > 29)
                newline();
            if (str === ' ') {
                parts.push(...word, ' ');
                word = [];
            }
            else if (/^[[{]:/.test(str)) {
                word.push({ toString: () => str, length: len });
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
        function insertAll(str) {
            const split = str.split(/\s+/);
            for (let i = 0; i < split.length; i++) {
                if (i)
                    insertSpace();
                insert(split[i]);
            }
        }
        function newline() {
            lineLen = 1 + word.reduce((a, b) => a + b.length, 0);
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
            if (/[\s\n#]/.test(c)) {
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
                    expansions.set(name, `{${id.toString(16)}:${name}}`);
                    insertAll(name);
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
                    expansions.set(name, `[${id.toString(16)}:${name}]`);
                    insertAll(name);
                }
                i = this.text.indexOf(']', i);
            }
            else {
                insert(c);
            }
        }
        parts.push(...word);
        let text = parts.join('');
        for (const [full, abbr] of expansions) {
            if (text.includes(full))
                text = text.split(full).join(abbr);
        }
        this.text = text;
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
            message.fixText();
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
                text = text.replace(new RegExp(str + '( [ &0-9]|.|$)', 'g'), (full, after) => {
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
    '1b:06',
    '1b:07',
    '1f:00',
    '13:00',
    '0b:01',
    '20:0c',
    '20:0f',
    '1c:11',
    '0e:05',
    '16:00',
    '16:02',
    '16:04',
    '16:06',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBTyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUN2QyxHQUFHLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUtyRSxNQUFNLFNBQWEsU0FBUSxLQUFRO0lBRWpDLFlBQXFCLEdBQVEsRUFDUixJQUFZLEVBQ1osS0FBYSxFQUNiLEtBQWEsRUFFdEIsT0FDSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBUTtRQUM1RCxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFQTSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBS2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDNUQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFlBQWdCLFNBQVEsS0FBUTtJQUlwQyxZQUFxQixHQUFRLEVBQ1IsSUFBWSxFQUNaLEtBQWEsRUFDYixNQUFjLEVBQ3ZCLE9BQW1ELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBUTtRQUMxRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFMTSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBR2pDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQ1YsQ0FBQyxDQUFTLEVBQUUsRUFBRTtZQUNaLE1BQU0sQ0FBQyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO1FBRXhCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDdEQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFbkUsTUFBTSxPQUFPO0lBT1gsWUFBcUIsUUFBa0IsRUFDbEIsSUFBWSxFQUNaLEVBQVUsRUFDVixJQUFZLEVBQ1osT0FBZTtRQUpmLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDVixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQVJwQyxVQUFLLEdBQWEsRUFBRSxDQUFDO1FBQ3JCLFFBQUcsR0FBVyxFQUFFLENBQUM7UUFVZixNQUFNLEdBQUcsR0FBaUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFDM0MsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDdEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25CLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFJWCxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUN6RTthQUNGO2lCQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNuQjtpQkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQzthQUN2QztpQkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNsQixLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3hCO2lCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMzQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUM3QixTQUFTO2lCQUNWO2dCQUNELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksTUFBTSxFQUFFO29CQUNWLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQy9DLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pCO2dCQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLE1BQU07b0JBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNqRCxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNqQjthQUNGO2lCQUFNLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDcEIsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ2pELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pCO2FBQ0Y7aUJBQU0sSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFO2dCQUNwQixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNwQztpQkFBTTtnQkFDTCxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDckU7U0FDRjtRQUNELElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsR0FBRztRQUNELE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0lBVUQsT0FBTztRQUNMLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUFFLE9BQU87UUFDN0IsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO1FBQzNCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBTWxCLElBQUksSUFBSSxHQUFhLEVBQUUsQ0FBQztRQUN4QixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUM3QyxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUUsTUFBYyxHQUFHLENBQUMsTUFBTTtZQVFuRCxJQUFJLE9BQU8sR0FBRyxHQUFHLEdBQUcsRUFBRTtnQkFBRSxPQUFPLEVBQUUsQ0FBQztZQUNsQyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUU7Z0JBQ2YsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDekIsSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUNYO2lCQUFNLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBUSxDQUFDLENBQUM7YUFDdEQ7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtZQUNELE9BQU8sSUFBSSxHQUFHLENBQUM7WUFDZixLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsU0FBUyxXQUFXO1lBQ2xCLElBQUksQ0FBQyxLQUFLO2dCQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QixLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2YsQ0FBQztRQUNELFNBQVMsU0FBUyxDQUFDLEdBQVc7WUFDNUIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDckMsSUFBSSxDQUFDO29CQUFFLFdBQVcsRUFBRSxDQUFDO2dCQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBQ0QsU0FBUyxPQUFPO1lBQ2QsT0FBTyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckQsSUFBSSxFQUFFLE9BQU8sR0FBRyxDQUFDLEVBQUU7Z0JBQ2pCLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25CLE9BQU8sR0FBRyxDQUFDLENBQUM7YUFDYjtpQkFBTTtnQkFDTCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ25CO1lBQ0QsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNmLENBQUM7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDekMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM5QixJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3JCLFdBQVcsRUFBRSxDQUFDO2FBQ2Y7aUJBQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFO2dCQUNwQixJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7b0JBQ2hCLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZCO3FCQUFNO29CQUNMLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDN0MsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7b0JBQ3JELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDakI7Z0JBQ0QsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMvQjtpQkFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ3BCLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtvQkFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO29CQUN0QyxNQUFNLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZFO3FCQUFNO29CQUNMLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDO29CQUNyRCxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztvQkFDckQsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNqQjtnQkFDRCxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQy9CO2lCQUFNO2dCQUNMLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNYO1NBQ0Y7UUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDcEIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxFQUFFO1lBQ3JDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzdEO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVELFNBQVM7UUFDUCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDZCxPQUFPLEVBQUUsQ0FBQztnQkFDVixPQUFPLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLElBQUksT0FBTyxHQUFHLENBQUM7b0JBQUUsT0FBTyxLQUFLLENBQUM7YUFDL0I7aUJBQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFO2dCQUNwQixJQUFJLElBQUksS0FBSyxJQUFJO29CQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN2QixPQUFPLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQzthQUN2QjtpQkFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRTtnQkFDakMsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO29CQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7d0JBQ2IsT0FBTyxJQUFJLENBQUMsQ0FBQztxQkFDZDt5QkFBTTt3QkFFTCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7d0JBQ3RDLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztxQkFDOUQ7b0JBQ0QsSUFBSSxPQUFPLEdBQUcsRUFBRTt3QkFBRSxPQUFPLEtBQUssQ0FBQztpQkFDaEM7cUJBQU07b0JBQ0wsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUN4QyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xFLE9BQU8sSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQzt3QkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDO2lCQUNqRTtnQkFDRCxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNO2dCQUNMLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFDRCxJQUFJLE9BQU8sR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUc7Z0JBQUUsT0FBTyxLQUFLLENBQUM7U0FDN0M7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQUVELE1BQU0sV0FBVyxHQUE4QjtJQUM3QyxJQUFJLEVBQUUsSUFBSTtJQUNWLEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLElBQUk7SUFDVCxJQUFJLEVBQUUsSUFBSTtJQUNWLEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsSUFBSTtJQUNULEdBQUcsRUFBRSxJQUFJO0lBQ1QsR0FBRyxFQUFFLElBQUk7SUFDVCxHQUFHLEVBQUUsSUFBSTtJQUdULElBQUksRUFBRSxJQUFJO0lBQ1YsR0FBRyxFQUFFLElBQUk7Q0FDVixDQUFDO0FBRUYsTUFBTSxPQUFPLFFBQVE7SUFnQm5CLFlBQXFCLEdBQVE7UUFBUixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQzNCLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBQ3JFLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBQ3BFLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBQ3JFLE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBRW5FLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsVUFBVSxHQUFHO1lBQ2hCLENBQUMsRUFBRSxJQUFJLFlBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUNuQixDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxFQUNqRCxHQUFHLENBQUM7WUFDeEIsQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUM7WUFDM0QsQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUM7U0FDMUQsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FDekIsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUMzQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFFcEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBR2pFLE9BQU8sSUFBSSxZQUFZLENBQ25CLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQ25ELENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQztJQUNULENBQUM7SUFHRCxDQUFFLFFBQVEsQ0FBQyxJQUFzQztRQUMvQyxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDN0IsSUFBSSxJQUFJLEVBQUU7Z0JBQ1IsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUU7b0JBQzFCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQUUsTUFBTSxPQUFPLENBQUM7aUJBQzVDO2FBQ0Y7aUJBQU07Z0JBQ0wsS0FBTSxDQUFDLENBQUMsSUFBSSxDQUFDO2FBQ2Q7U0FDRjtJQUNILENBQUM7SUFHRCxJQUFJO1FBQ0YsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFDM0MsU0FBUyxHQUFHLENBQUMsT0FBMkIsRUFBRSxLQUFhO1lBQ3JELE1BQU0sR0FBRyxHQUFHLE9BQU8sT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDbEUsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ3RDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDZixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwQixDQUFDO1FBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTtZQUN2QyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzdCLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDckQ7U0FDRjtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7WUFDakMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRTtvQkFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDbEQ7U0FDRjtRQUNELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDL0IsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFO2dCQUNqQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZDO1lBQ0QsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3RDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQ2xCLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUM1QzthQUNGO1NBQ0Y7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRTtZQUMzQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUU7Z0JBQ3BDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsYUFBYSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQzthQUNsQztZQUNELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtnQkFDbEMsS0FBSyxNQUFNLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUU7b0JBQ2xDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO3dCQUNsQixHQUFHLENBQUMsQ0FBRSxFQUFFLGFBQWEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7cUJBQ25DO2lCQUNGO2FBQ0Y7U0FDRjtRQUNELEtBQUssTUFBTSxDQUFDLElBQUksa0JBQWtCLEVBQUU7WUFDbEMsR0FBRyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztTQUNyQjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELHNCQUFzQixDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO1FBZ0N2QyxNQUFNLEtBQUssR0FBVyxFQUFFLENBQUM7UUFFekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFFeEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFFMUMsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBRXpDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFMUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckMsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELElBQUksT0FBTyxFQUFFO2dCQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xCLFNBQVM7YUFDVjtZQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3QixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUVuQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQzFCLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUVqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNoRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7b0JBRXpDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ3pCLElBQUksTUFBTTt3QkFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNO3dCQUFFLFNBQVM7b0JBQzlCLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDL0UsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDN0IsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztvQkFDeEIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9DLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7aUJBQ3hFO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2pCO2FBQ0Y7U0FDRjtRQUdELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUUxQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUV4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFckMsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDO2dCQUVqQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ1osSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUNqQixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hDLE9BQU8sSUFBSSxFQUFFO29CQUVYLElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzdCLElBQUksQ0FBQyxJQUFJO3dCQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQzs0QkFDdkIsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHOzRCQUN4QixLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDO29CQUV0QixLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSzt3QkFBRSxNQUFNO29CQUV4QixHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFDbkIsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzNCLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDO29CQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQztpQkFDdkI7YUFDRjtTQUNGO1FBR0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNsQyxNQUFNLElBQUksR0FBbUIsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLENBQUMsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFTLEVBQUUsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEUsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRCxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDcEIsT0FBTyxNQUFNLENBQUMsTUFBTSxJQUFJLFdBQVcsR0FBRyxnQkFBZ0IsRUFBRTtZQUV0RCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQixPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDakI7WUFDRCxNQUFNLEVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFHLENBQUM7WUFFbEUsSUFBSSxNQUFNLElBQUksQ0FBQztnQkFBRSxNQUFNO1lBRXZCLFdBQVcsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDL0IsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ2xCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUU7b0JBQzVELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2Y7YUFDRjtZQUNELElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ1IsS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUM1QyxJQUFJO2dCQUVKLEdBQUc7YUFDSixDQUFDLENBQUM7WUFHSCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDaEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM3QyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7d0JBQ2xDLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDekI7b0JBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7aUJBQ2xCO2FBQ0Y7WUFHRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO2dCQUN4QixLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDcEMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztpQkFDaEM7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkIsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ2pCO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQWM7UUFDeEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQVloRCxTQUFTLGFBQWEsQ0FBQyxHQUFXLEVBQUUsSUFBWTtZQUM5QyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7WUFFbkQsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUdELElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUNoQixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLEtBQUssSUFBSTtnQkFBRSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDUCxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUN6QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUk7WUFBRSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRW5ELGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN4QixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ1AsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDckI7UUFFRCxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFCLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtZQUNqQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ1AsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7WUFDN0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNyQjtRQUdELE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFDO1FBQ2hELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDM0IsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFFBQVE7b0JBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNyQjtTQUNGO1FBQ0QsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsR0FBRyxFQUFFLEVBQUMsTUFBTSxFQUFFLENBQUMsRUFBQyxFQUFlLEVBQUUsRUFBQyxHQUFHLEVBQUUsRUFBQyxNQUFNLEVBQUUsQ0FBQyxFQUFDLEVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzlGO1FBR0QsTUFBTSxRQUFRLEdBQXdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUVsQixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUNsRixJQUFJLEtBQUssSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQUUsT0FBTyxJQUFJLENBQUM7Z0JBQzlDLElBQUksS0FBSyxLQUFLLEdBQUc7b0JBQUUsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxPQUFPLEtBQUssR0FBRyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7b0JBQzFDLE9BQU8sTUFBTSxLQUFLLEVBQUUsQ0FBQztpQkFDdEI7cUJBQU0sSUFBSSxPQUFPLEtBQUssR0FBRyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7b0JBQ2pELE9BQU8sTUFBTSxLQUFLLEVBQUUsQ0FBQztpQkFDdEI7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLEtBQUs7b0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDekQsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLE9BQU8sSUFBSSxPQUFPLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxFQUFFLENBQUM7WUFDdkQsQ0FBQyxDQUFDLENBQUM7WUFFSCxLQUFLLE1BQU0sRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBRW5ELElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsR0FBRyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDM0UsSUFBSSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO3dCQUFFLE9BQU8sSUFBSSxDQUFDO29CQUM5QyxJQUFJLEtBQUssS0FBSyxHQUFHO3dCQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzlCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUNuRCxDQUFDLENBQUMsQ0FBQzthQUNKO1lBR0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxQixNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDZCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixJQUFJLENBQUMsS0FBSyxRQUFRLENBQUMsU0FBUyxFQUFFO29CQUM1QixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDZCxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUMxQixJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSTt3QkFBRSxDQUFDLEVBQUUsQ0FBQztpQkFDL0I7cUJBQU0sSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO29CQUNyQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNYLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHO3dCQUFFLENBQUMsRUFBRSxDQUFDO29CQUM3QixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUN2QjtxQkFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7b0JBQ3BCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDO3dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUNqRCxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzNDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDbkQsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDWCxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDN0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDUDtxQkFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7b0JBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2QsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRzt3QkFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNsQixRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUNYO3FCQUFNO29CQUNMLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN6QixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNsQjthQUNGO1lBQ0QsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckIsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDYixDQUFDLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFHMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxNQUFNLENBQUM7WUFFN0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxHQUFHLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO3FCQUN0RCxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7U0FDaEM7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBZSxDQUFDO1FBQ3ZGLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUM7UUFDbEMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDO1FBQ2xCLEtBQUssSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ2xELE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztZQUMzQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDckQ7WUFNRCxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkQsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUM7WUFDakUsR0FBRyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7U0FDckI7UUFHRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QztRQUVELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDOztBQTNhZSxrQkFBUyxHQUFHLEdBQUcsQ0FBQztBQTBibEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7QUFJOUIsTUFBTSxPQUFPLEdBQTZCLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUM7QUFHL0QsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQWdCLElBQUksR0FBRyxDQUFDO0lBRXJELE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87Q0FDUixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge01lc3NhZ2VJZH0gZnJvbSAnLi9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtEYXRhLCBoZXgsIHJlYWRMaXR0bGVFbmRpYW4sIHJlYWRTdHJpbmcsXG4gICAgICAgIHNlcSwgc2xpY2UsIHdyaXRlTGl0dGxlRW5kaWFuLCB3cml0ZVN0cmluZ30gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7V3JpdGVyfSBmcm9tICcuL3dyaXRlci5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbi8vIGltcG9ydCB7U3VmZml4VHJpZX0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmNsYXNzIERhdGFUYWJsZTxUPiBleHRlbmRzIEFycmF5PFQ+IHtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgYmFzZTogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBjb3VudDogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSB3aWR0aDogbnVtYmVyLFxuICAgICAgICAgICAgICAvLyBUT0RPIC0gd2hhdCB3YXMgdGhpcyBzdXBwb3NlZCB0byBiZT8hP1xuICAgICAgICAgICAgICBmdW5jOiAoLi4ueDogbnVtYmVyW10pID0+IFQgPVxuICAgICAgICAgICAgICAgICAgd2lkdGggPiAxID8gKC4uLmkpID0+IGkgYXMgYW55IDogaSA9PiBpIGFzIGFueSkge1xuICAgIHN1cGVyKGNvdW50KTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBmdW5jKC4uLnNsaWNlKHJvbS5wcmcsIGJhc2UgKyBpICogd2lkdGgsIHdpZHRoKSk7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEFkZHJlc3NUYWJsZTxUPiBleHRlbmRzIEFycmF5PFQ+IHtcblxuICByZWFkb25seSBhZGRyZXNzZXM6IG51bWJlcltdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuICAgICAgICAgICAgICByZWFkb25seSBiYXNlOiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGNvdW50OiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IG9mZnNldDogbnVtYmVyLFxuICAgICAgICAgICAgICBmdW5jOiAoeDogbnVtYmVyLCBpOiBudW1iZXIsIGFycjogbnVtYmVyW10pID0+IFQgPSBpID0+IGkgYXMgYW55KSB7XG4gICAgc3VwZXIoY291bnQpO1xuICAgIHRoaXMuYWRkcmVzc2VzID0gc2VxKHRoaXMuY291bnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgKGk6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgYmFzZSArIDIgKiBpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhICYmIGEgKyBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gZnVuYyh0aGlzLmFkZHJlc3Nlc1tpXSwgaSwgdGhpcy5hZGRyZXNzZXMpO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBERUxJTUlURVJTID0gbmV3IE1hcDxudW1iZXIsIHN0cmluZz4oW1s2LCAne30nXSwgWzcsICdbXSddXSk7XG5cbmNsYXNzIE1lc3NhZ2Uge1xuXG4gIC8vIFRoaXMgaXMgcmVkdW5kYW50IC0gdGhlIHRleHQgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZC5cbiAgYnl0ZXM6IG51bWJlcltdID0gW107XG4gIGhleDogc3RyaW5nID0gJyc7IC8vIGZvciBkZWJ1Z2dpbmdcbiAgdGV4dDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1lc3NhZ2VzOiBNZXNzYWdlcyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgcGFydDogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBpZDogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBhZGRyOiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHBvaW50ZXI6IG51bWJlcikge1xuXG4gICAgLy8gUGFyc2UgdGhlIG1lc3NhZ2VcbiAgICBjb25zdCBwcmc6IERhdGE8bnVtYmVyPiA9IG1lc3NhZ2VzLnJvbS5wcmc7XG4gICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gYWRkcjsgYWRkciAmJiBwcmdbaV07IGkrKykge1xuICAgICAgY29uc3QgYiA9IHByZ1tpXTtcbiAgICAgIHRoaXMuYnl0ZXMucHVzaChiKTtcbiAgICAgIGlmIChiID09PSAxKSB7XG4gICAgICAgIC8vIE5PVEUgLSB0aGVyZSBpcyBvbmUgY2FzZSB3aGVyZSB0d28gbWVzc2FnZXMgc2VlbSB0byBhYnV0IHdpdGhvdXQgYVxuICAgICAgICAvLyBudWxsIHRlcm1pbmF0b3IgLSAkMmNhOTEgKCQxMjokMDgpIGZhbGxzIHRocm91Z2ggZnJvbSAxMjowNy4gIFdlIGZpeFxuICAgICAgICAvLyB0aGF0IHdpdGggYW4gYWRqdXN0bWVudCBpbiByb20udHMuXG4gICAgICAgIGlmIChpICE9PSBhZGRyICYmIHByZ1tpIC0gMV0gIT09IDMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgc3RhcnQgbWVzc2FnZSBzaWduYWwgYXQgJHtpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiID09PSAyKSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ1xcbiAnKTtcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gMykge1xuICAgICAgICBwYXJ0cy5wdXNoKGAke01lc3NhZ2VzLkNPTlRJTlVFRH1cXG5gKTsgLy8gYmxhY2sgZG93bi1wb2ludGluZyB0cmlhbmdsZVxuICAgICAgfSBlbHNlIGlmIChiID09PSA0KSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ3s6SEVSTzp9Jyk7XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDgpIHtcbiAgICAgICAgcGFydHMucHVzaCgnWzpJVEVNOl0nKTtcbiAgICAgIH0gZWxzZSBpZiAoYiA+PSA1ICYmIGIgPD0gOSkge1xuICAgICAgICBjb25zdCBuZXh0ID0gcHJnWysraV07XG4gICAgICAgIGlmIChiID09PSA5KSB7XG4gICAgICAgICAgcGFydHMucHVzaCgnICcucmVwZWF0KG5leHQpKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWxpbXMgPSBERUxJTUlURVJTLmdldChiKTtcbiAgICAgICAgaWYgKGRlbGltcykge1xuICAgICAgICAgIHBhcnRzLnB1c2goZGVsaW1zWzBdKTtcbiAgICAgICAgICBwYXJ0cy5wdXNoKG5leHQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJykpO1xuICAgICAgICAgIHBhcnRzLnB1c2goJzonKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoKG1lc3NhZ2VzLmV4dHJhV29yZHNbYl1bbmV4dF0pO1xuICAgICAgICBpZiAoZGVsaW1zKSBwYXJ0cy5wdXNoKGRlbGltc1sxXSk7XG4gICAgICAgIGlmICghUFVOQ1RVQVRJT05bU3RyaW5nLmZyb21DaGFyQ29kZShwcmdbaSArIDFdKV0pIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCcgJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYiA+PSAweDgwKSB7XG4gICAgICAgIHBhcnRzLnB1c2gobWVzc2FnZXMuYmFzaWNXb3Jkc1tiIC0gMHg4MF0pO1xuICAgICAgICBpZiAoIVBVTkNUVUFUSU9OW1N0cmluZy5mcm9tQ2hhckNvZGUocHJnW2kgKyAxXSldKSB7XG4gICAgICAgICAgcGFydHMucHVzaCgnICcpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGIgPj0gMHgyMCkge1xuICAgICAgICBwYXJ0cy5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoYikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tZXhoYXVzdGl2ZSBzd2l0Y2g6ICR7Yn0gYXQgJHtpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50ZXh0ID0gcGFydHMuam9pbignJyk7XG4gIH1cblxuICBtaWQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7aGV4KHRoaXMucGFydCl9OiR7aGV4KHRoaXMuaWQpfWA7XG4gIH1cblxuICAvLyBGaXhlcyB0aGUgdGV4dCB0byBlbnN1cmUgaXQgZml0cyBpbiB0aGUgZGlhbG9nIGJveC5cbiAgLy8gQ29uc3RyYWludHM6XG4gIC8vICAtIG5vIGxpbmUgaXMgbG9uZ2VyIHRoYW4gMjggY2hhcmFjdGVyc1xuICAvLyAgLSBmaXJzdCBsaW5lIGFmdGVyIGEgXFxuIGlzIGluZGVudGVkIG9uZSBzcGFjZVxuICAvLyAgLSB1bmNhcGl0YWxpemVkICh1bnB1bmN0dWF0ZWQ/KSBmaXJzdCBjaGFyYWN0ZXJzIGFyZSBpbmRlbnRlZCwgdG9vXG4gIC8vICAtIHdyYXAgb3IgdW53cmFwIGFueSBwZXJzb24gb3IgaXRlbSBuYW1lc1xuICAvLyAgLSBhdCBtb3N0IGZvdXIgbGluZXMgcGVyIG1lc3NhZ2UgYm94XG4gIC8vIElmIGFueSB2aW9sYXRpb25zIGFyZSBmb3VuZCwgdGhlIGVudGlyZSBtZXNzYWdlIGlzIHJlZmxvd2VkLlxuICBmaXhUZXh0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmNoZWNrVGV4dCgpKSByZXR1cm47XG4gICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGxpbmVOdW0gPSAwO1xuICAgIGxldCBsaW5lTGVuID0gMDtcbiAgICBsZXQgc3BhY2UgPSBmYWxzZTtcbiAgICAvLyBUT0RPIC0gY2hhbmdlIHdvcmQgaW50byBzb21ldGhpbmcgZmFuY2llciAtIGFuIGFycmF5IG9mXG4gICAgLy8gKHN0ciwgbGVuLCBmYWxsYmFjaykgc28gdGhhdCBwdW5jdHVhdGlvbiBhZnRlciBhblxuICAgIC8vIGV4cGFuc2lvbiBkb2Vzbid0IHNjcmV3IHVzIHVwLlxuICAgIC8vIE9SLi4uIGp1c3QgaW5zZXJ0IHRoZSBmYWxsYmFjayBldmVyeSB0aW1lIGFuZCBpbnN0ZWFkIG1lbW9pemVcbiAgICAvLyB0aGUgZXhwYW5zaW9uIHRvIHJlcGxhY2UgYXQgdGhlIGVuZCBpZiB0aGVyZSdzIG5vIGJyZWFrLlxuICAgIGxldCB3b3JkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGV4cGFuc2lvbnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGZ1bmN0aW9uIGluc2VydChzdHI6IHN0cmluZywgbGVuOiBudW1iZXIgPSBzdHIubGVuZ3RoKSB7XG4gICAgICAvLyBUT0RPIC0gd2hhdCBkbyB3ZSBkbyB3aXRoIGV4aXN0aW5nIHBhZ2UgYnJlYWtzP1xuICAgICAgLy8gICAgICAtIGlmIHdlIGV2ZXIgbmVlZCB0byBfbW92ZV8gb25lIHRoZW4gd2Ugc2hvdWxkIElHTk9SRSBpdD9cbiAgICAgIC8vICAgICAgLSBzYW1lIHdpdGggbmV3bGluZXMuLi5cbiAgICAgIC8vIGlmIChzdHIgPT09ICcjJykge1xuICAgICAgLy8gICBuZXdsaW5lKCk7XG4gICAgICAvLyAgIHJldHVybjtcbiAgICAgIC8vIH1cbiAgICAgIGlmIChsaW5lTGVuICsgbGVuID4gMjkpIG5ld2xpbmUoKTtcbiAgICAgIGlmIChzdHIgPT09ICcgJykge1xuICAgICAgICBwYXJ0cy5wdXNoKC4uLndvcmQsICcgJyk7XG4gICAgICAgIHdvcmQgPSBbXTtcbiAgICAgIH0gZWxzZSBpZiAoL15bW3tdOi8udGVzdChzdHIpKSB7XG4gICAgICAgIHdvcmQucHVzaCh7dG9TdHJpbmc6ICgpID0+IHN0ciwgbGVuZ3RoOiBsZW59IGFzIGFueSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3b3JkLnB1c2goc3RyKTtcbiAgICAgIH1cbiAgICAgIGxpbmVMZW4gKz0gbGVuO1xuICAgICAgc3BhY2UgPSBzdHIuZW5kc1dpdGgoJyAnKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5zZXJ0U3BhY2UoKSB7XG4gICAgICBpZiAoIXNwYWNlKSBpbnNlcnQoJyAnKTtcbiAgICAgIHNwYWNlID0gdHJ1ZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5zZXJ0QWxsKHN0cjogc3RyaW5nKSB7XG4gICAgICBjb25zdCBzcGxpdCA9IHN0ci5zcGxpdCgvXFxzKy8pO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGxpdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaSkgaW5zZXJ0U3BhY2UoKTtcbiAgICAgICAgaW5zZXJ0KHNwbGl0W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gbmV3bGluZSgpIHtcbiAgICAgIGxpbmVMZW4gPSAxICsgd29yZC5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLmxlbmd0aCwgMCk7XG4gICAgICBpZiAoKytsaW5lTnVtID4gMykge1xuICAgICAgICBwYXJ0cy5wdXNoKCcjXFxuICcpO1xuICAgICAgICBsaW5lTnVtID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ1xcbiAnKTtcbiAgICAgIH1cbiAgICAgIHNwYWNlID0gdHJ1ZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLnRleHRbaV07XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy50ZXh0W2kgKyAxXTtcbiAgICAgIGlmICgvW1xcc1xcbiNdLy50ZXN0KGMpKSB7XG4gICAgICAgIGluc2VydFNwYWNlKCk7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICd7Jykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgaW5zZXJ0KCd7OkhFUk86fScsIDYpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbG9uID0gdGhpcy50ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0aGlzLnRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5tZXNzYWdlcy5leHRyYVdvcmRzWzZdW2lkXTtcbiAgICAgICAgICBleHBhbnNpb25zLnNldChuYW1lLCBgeyR7aWQudG9TdHJpbmcoMTYpfToke25hbWV9fWApO1xuICAgICAgICAgIGluc2VydEFsbChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy50ZXh0LmluZGV4T2YoJ30nLCBpKTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1snKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnOicpIHtcbiAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMubWVzc2FnZXMucm9tLml0ZW1zO1xuICAgICAgICAgIGluc2VydCgnWzpJVEVNOl0nLCBNYXRoLm1heCguLi5pdGVtcy5tYXAoaSA9PiBpLm1lc3NhZ2VOYW1lLmxlbmd0aCkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb2xvbiA9IHRoaXMudGV4dC5pbmRleE9mKCc6JywgaSk7XG4gICAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQodGhpcy50ZXh0LnN1YnN0cmluZyhpICsgMSwgY29sb24pLCAxNik7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMubWVzc2FnZXMucm9tLml0ZW1zW2lkXS5tZXNzYWdlTmFtZTtcbiAgICAgICAgICBleHBhbnNpb25zLnNldChuYW1lLCBgWyR7aWQudG9TdHJpbmcoMTYpfToke25hbWV9XWApO1xuICAgICAgICAgIGluc2VydEFsbChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy50ZXh0LmluZGV4T2YoJ10nLCBpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluc2VydChjKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFydHMucHVzaCguLi53b3JkKTtcbiAgICBsZXQgdGV4dCA9IHBhcnRzLmpvaW4oJycpO1xuICAgIGZvciAoY29uc3QgW2Z1bGwsIGFiYnJdIG9mIGV4cGFuc2lvbnMpIHtcbiAgICAgIGlmICh0ZXh0LmluY2x1ZGVzKGZ1bGwpKSB0ZXh0ID0gdGV4dC5zcGxpdChmdWxsKS5qb2luKGFiYnIpO1xuICAgIH1cbiAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICB9XG5cbiAgY2hlY2tUZXh0KCk6IGJvb2xlYW4ge1xuICAgIGxldCBsaW5lTnVtID0gMDtcbiAgICBsZXQgbGluZUxlbiA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLnRleHRbaV07XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy50ZXh0W2kgKyAxXTtcbiAgICAgIGlmIChjID09PSAnXFxuJykge1xuICAgICAgICBsaW5lTnVtKys7XG4gICAgICAgIGxpbmVMZW4gPSAxO1xuICAgICAgICBpZiAobGluZU51bSA+IDMpIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJyMnKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnXFxuJykgaSsrOyAvLyBlYXQgbmV3bGluZVxuICAgICAgICBsaW5lTnVtID0gbGluZUxlbiA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICd7JyB8fCBjID09PSAnWycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICc6Jykge1xuICAgICAgICAgIGlmIChjID09PSAneycpIHsgLy8gezpIRVJPOn1cbiAgICAgICAgICAgIGxpbmVMZW4gKz0gNjtcbiAgICAgICAgICB9IGVsc2UgeyAvLyBbOklURU06XVxuICAgICAgICAgICAgLy8gY29tcHV0ZSB0aGUgbWF4IGl0ZW0gbGVuZ3RoXG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMubWVzc2FnZXMucm9tLml0ZW1zO1xuICAgICAgICAgICAgbGluZUxlbiArPSBNYXRoLm1heCguLi5pdGVtcy5tYXAoaSA9PiBpLm1lc3NhZ2VOYW1lLmxlbmd0aCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobGluZUxlbiA+IDI4KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29sb24gPSB0aGlzLnRleHQuaW5kZXhPZignOicsIGkpO1xuICAgICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KHRoaXMudGV4dC5zdWJzdHJpbmcoaSArIDEsIGNvbG9uKSwgMTYpO1xuICAgICAgICAgIGxpbmVMZW4gKz0gKGMgPT09ICd7JyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWVzc2FnZXMuZXh0cmFXb3Jkc1s2XVtpZF0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtc1tpZF0ubWVzc2FnZU5hbWUpLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy50ZXh0LmluZGV4T2YoQ0xPU0VSU1tjXSwgaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaW5lTGVuKys7XG4gICAgICB9XG4gICAgICBpZiAobGluZUxlbiA+IDI5ICYmIGMgIT09ICcgJykgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5jb25zdCBQVU5DVFVBVElPTjoge1tjaGFyOiBzdHJpbmddOiBib29sZWFufSA9IHtcbiAgJ1xcMCc6IHRydWUsXG4gICcgJzogdHJ1ZSxcbiAgJyEnOiB0cnVlLFxuICAnXFwnJzogdHJ1ZSxcbiAgJywnOiB0cnVlLFxuICAnLic6IHRydWUsXG4gICc6JzogdHJ1ZSxcbiAgJzsnOiB0cnVlLFxuICAnPyc6IHRydWUsXG4gICdfJzogdHJ1ZSxcblxuICAvLyA/Pz8/XG4gICdcXG4nOiB0cnVlLCAvLyBsaW5lIHNlcGFyYXRvclxuICAnIyc6IHRydWUsICAvLyBwYWdlIHNlcGFyYXRvclxufTtcblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VzIHtcblxuICBiYXNpY1dvcmRzOiBBZGRyZXNzVGFibGU8c3RyaW5nPjtcbiAgZXh0cmFXb3Jkczoge1tncm91cDogbnVtYmVyXTogQWRkcmVzc1RhYmxlPHN0cmluZz59O1xuICBiYW5rczogRGF0YVRhYmxlPG51bWJlcj47XG4gIHBhcnRzOiBBZGRyZXNzVGFibGU8QWRkcmVzc1RhYmxlPE1lc3NhZ2U+PjtcblxuICAvLyBOT1RFOiB0aGVzZSBkYXRhIHN0cnVjdHVyZXMgYXJlIHJlZHVuZGFudCB3aXRoIHRoZSBhYm92ZS5cbiAgLy8gT25jZSB3ZSBnZXQgdGhpbmdzIHdvcmtpbmcgc21vb3RobHksIHdlIHNob3VsZCBjbGVhbiBpdCB1cFxuICAvLyB0byBvbmx5IHVzZSBvbmUgb3IgdGhlIG90aGVyLlxuICAvLyBhYmJyZXZpYXRpb25zOiBzdHJpbmdbXTtcbiAgLy8gcGVyc29uTmFtZXM6IHN0cmluZ1tdO1xuXG4gIC8vIHN0YXRpYyByZWFkb25seSBDT05USU5VRUQgPSAnXFx1MjViYyc7XG4gIHN0YXRpYyByZWFkb25seSBDT05USU5VRUQgPSAnIyc7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBjb25zdCBjb21tb25Xb3Jkc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIDB4Mjg3MDQpICsgMHgyMDAwMDtcbiAgICBjb25zdCBleHRyYVdvcmRzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgMHgyODY4YSkgKyAweDIwMDAwO1xuICAgIGNvbnN0IHBlcnNvbk5hbWVzQmFzZSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgMHgyODZkNSkgKyAweDIwMDAwO1xuICAgIGNvbnN0IGl0ZW1OYW1lc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIDB4Mjg2ZTkpICsgMHgyMDAwMDtcblxuICAgIGNvbnN0IHN0ciA9IChhOiBudW1iZXIpID0+IHJlYWRTdHJpbmcocm9tLnByZywgYSk7XG4gICAgLy8gVE9ETyAtIHJlYWQgdGhlc2UgYWRkcmVzc2VzIGRpcmVjdGx5IGZyb20gdGhlIGNvZGUsIGluIGNhc2UgdGhleSBtb3ZlXG4gICAgdGhpcy5iYXNpY1dvcmRzID0gbmV3IEFkZHJlc3NUYWJsZShyb20sIGNvbW1vbldvcmRzQmFzZSwgMHg4MCwgMHgyMDAwMCwgc3RyKTtcbiAgICB0aGlzLmV4dHJhV29yZHMgPSB7XG4gICAgICA1OiBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgZXh0cmFXb3Jkc0Jhc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIChwZXJzb25OYW1lc0Jhc2UgLSBleHRyYVdvcmRzQmFzZSkgPj4+IDEsIDB4MjAwMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciksIC8vIGxlc3MgY29tbW9uXG4gICAgICA2OiBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgcGVyc29uTmFtZXNCYXNlLCAzNiwgMHgyMDAwMCwgc3RyKSwgLy8gcGVvcGxlL3BsYWNlc1xuICAgICAgNzogbmV3IEFkZHJlc3NUYWJsZShyb20sIGl0ZW1OYW1lc0Jhc2UsIDc0LCAweDIwMDAwLCBzdHIpLCAvLyBpdGVtcyAoYWxzbyA4PylcbiAgICB9O1xuXG4gICAgdGhpcy5iYW5rcyA9IG5ldyBEYXRhVGFibGUocm9tLCAweDI4M2ZlLCAweDI0LCAxKTtcbiAgICB0aGlzLnBhcnRzID0gbmV3IEFkZHJlc3NUYWJsZShcbiAgICAgICAgcm9tLCAweDI4NDIyLCAweDIyLCAweDIwMDAwLFxuICAgICAgICAoYWRkciwgcGFydCwgYWRkcnMpID0+IHtcbiAgICAgICAgICAvLyBuZWVkIHRvIGNvbXB1dGUgdGhlIGVuZCBiYXNlZCBvbiB0aGUgYXJyYXk/XG4gICAgICAgICAgY29uc3QgY291bnQgPSBwYXJ0ID09PSAweDIxID8gMyA6IChhZGRyc1twYXJ0ICsgMV0gLSBhZGRyKSA+Pj4gMTtcbiAgICAgICAgICAvLyBvZmZzZXQ6IGJhbms9JDE1ID0+ICQyMDAwMCwgYmFuaz0kMTYgPT4gJDIyMDAwLCBiYW5rPSQxNyA9PiAkMjQwMDBcbiAgICAgICAgICAvLyBzdWJ0cmFjdCAkYTAwMCBiZWNhdXNlIHRoYXQncyB0aGUgcGFnZSB3ZSdyZSBsb2FkaW5nIGF0LlxuICAgICAgICAgIHJldHVybiBuZXcgQWRkcmVzc1RhYmxlKFxuICAgICAgICAgICAgICByb20sIGFkZHIsIGNvdW50LCAodGhpcy5iYW5rc1twYXJ0XSA8PCAxMykgLSAweGEwMDAsXG4gICAgICAgICAgICAgIChtLCBpZCkgPT4gbmV3IE1lc3NhZ2UodGhpcywgcGFydCwgaWQsIG0sIGFkZHIgKyAyICogaWQpKTtcbiAgICAgICAgfSk7XG4gIH1cblxuICAvLyBGbGF0dGVucyB0aGUgbWVzc2FnZXMuICBOT1RFOiByZXR1cm5zIHVudXNlZCBtZXNzYWdlcy5cbiAgKiBtZXNzYWdlcyh1c2VkPzoge2hhczogKG1pZDogc3RyaW5nKSA9PiBib29sZWFufSk6IEl0ZXJhYmxlPE1lc3NhZ2U+IHtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5wYXJ0cykge1xuICAgICAgaWYgKHVzZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIHBhcnQpIHtcbiAgICAgICAgICBpZiAodXNlZC5oYXMobWVzc2FnZS5taWQoKSkpIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHlpZWxkICogcGFydDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbWFwIGZyb20gbWVzc2FnZSBpZCAobWlkKSB0byBrbm93biB1c2FnZXMuXG4gIHVzZXMoKTogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+IHtcbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgZnVuY3Rpb24gdXNlKG1lc3NhZ2U6IE1lc3NhZ2VJZCB8IHN0cmluZywgdXNhZ2U6IHN0cmluZykge1xuICAgICAgY29uc3Qgc3RyID0gdHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnID8gbWVzc2FnZSA6IG1lc3NhZ2UubWlkKCk7XG4gICAgICBjb25zdCBzZXQgPSBvdXQuZ2V0KHN0cikgfHwgbmV3IFNldCgpO1xuICAgICAgc2V0LmFkZCh1c2FnZSk7XG4gICAgICBvdXQuc2V0KHN0ciwgc2V0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMucm9tLnRyaWdnZXJzKSB7XG4gICAgICBpZiAodHJpZ2dlci5tZXNzYWdlLm5vbnplcm8oKSkge1xuICAgICAgICB1c2UodHJpZ2dlci5tZXNzYWdlLCBgVHJpZ2dlciAkJHtoZXgodHJpZ2dlci5pZCl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCBtIG9mIGl0ZW0uaXRlbVVzZU1lc3NhZ2VzKCkpIHtcbiAgICAgICAgaWYgKG0ubm9uemVybygpKSB1c2UobSwgYEl0ZW0gJCR7aGV4KGl0ZW0uaWQpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLnJvbS5ucGNzKSB7XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgICAgdXNlKGQubWVzc2FnZSwgYE5QQyAkJHtoZXgobnBjLmlkKX1gKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2wsIGRzXSBvZiBucGMubG9jYWxEaWFsb2dzKSB7XG4gICAgICAgIGNvbnN0IGxoID0gbCA+PSAwID8gYCBAICQke2hleChsKX1gIDogJyc7XG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuICAgICAgICAgIHVzZShkLm1lc3NhZ2UsIGBOUEMgJCR7aGV4KG5wYy5pZCl9JHtsaH1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNhZ2Ugb2YgdGhpcy5yb20udGVsZXBhdGh5LnNhZ2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IGQgb2Ygc2FnZS5kZWZhdWx0TWVzc2FnZXMpIHtcbiAgICAgICAgdXNlKGQsIGBUZWxlcGF0aHkgJHtzYWdlLnNhZ2V9YCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGcgb2Ygc2FnZS5tZXNzYWdlR3JvdXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgWywgLi4ubXNdIG9mIGcubWVzc2FnZXMpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IG0gb2YgbXMpIHtcbiAgICAgICAgICAgIHVzZShtISwgYFRlbGVwYXRoeSAke3NhZ2Uuc2FnZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBtIG9mIEhBUkRDT0RFRF9NRVNTQUdFUykge1xuICAgICAgdXNlKG0sICdIYXJkY29kZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIGJ1aWxkQWJicmV2aWF0aW9uVGFibGUodXNlcyA9IHRoaXMudXNlcygpKTogQWJicmV2aWF0aW9uW10ge1xuICAgIC8vIENvdW50IGZyZXF1ZW5jaWVzIG9mIHVzZWQgc3VmZml4ZXMuXG4gICAgaW50ZXJmYWNlIFN1ZmZpeCB7XG4gICAgICAvLyBBY3R1YWwgc3RyaW5nXG4gICAgICBzdHI6IHN0cmluZztcbiAgICAgIC8vIFRvdGFsIG51bWJlciBvZiBieXRlcyBzYXZlZCBvdmVyIGFsbCBvY2N1cnJlbmNlc1xuICAgICAgc2F2aW5nOiBudW1iZXI7XG4gICAgICAvLyBBbGwgdGhlIGluaXRpYWwgd29yZHMgdGhpcyBpcyBpbiAobm90IGNvdW50aW5nIGNoYWlucylcbiAgICAgIHdvcmRzOiBTZXQ8bnVtYmVyPjtcbiAgICAgIC8vIE51bWJlciBvZiBjaGFpbnNcbiAgICAgIGNoYWluczogbnVtYmVyO1xuICAgICAgLy8gTnVtYmVyIG9mIGxldHRlcnMgbWlzc2luZyBmcm9tIHRoZSBmaXJzdCB3b3JkXG4gICAgICBtaXNzaW5nOiBudW1iZXI7XG4gICAgfVxuICAgIGludGVyZmFjZSBXb3JkIHtcbiAgICAgIC8vIEFjdHVhbCBzdHJpbmdcbiAgICAgIHN0cjogc3RyaW5nO1xuICAgICAgLy8gSW5kZXggaW4gbGlzdFxuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIC8vIFRoZSBjaGFpbmFibGUgcHVuY3R1YXRpb24gYWZ0ZXIgdGhpcyB3b3JkIChzcGFjZSBvciBhcG9zdHJvcGhlKVxuICAgICAgY2hhaW46IHN0cmluZztcbiAgICAgIC8vIFBvc3NpYmxlIGJ5dGVzIHRvIGJlIHNhdmVkXG4gICAgICBieXRlczogbnVtYmVyO1xuICAgICAgLy8gTnVtYmVyIG9mIGNoYXJhY3RlcnMgY3VycmVudGx5IGJlaW5nIGNvbXByZXNzZWRcbiAgICAgIHVzZWQ6IG51bWJlcjtcbiAgICAgIC8vIEFsbCBzdWZmaXhlcyB0aGF0IHRvdWNoIHRoaXMgd29yZFxuICAgICAgc3VmZml4ZXM6IFNldDxTdWZmaXg+O1xuICAgICAgLy8gTWVzc2FnZSBJRFxuICAgICAgbWlkOiBzdHJpbmc7XG4gICAgfVxuXG4gICAgLy8gT3JkZXJlZCBsaXN0IG9mIHdvcmRzXG4gICAgY29uc3Qgd29yZHM6IFdvcmRbXSA9IFtdO1xuICAgIC8vIEtlZXAgdHJhY2sgb2YgYWRkcmVzc2VzIHdlJ3ZlIHNlZW4sIG1hcHBpbmcgdG8gbWVzc2FnZSBJRHMgZm9yIGFsaWFzaW5nLlxuICAgIGNvbnN0IGFkZHJzID0gbmV3IE1hcDxudW1iZXIsIHN0cmluZz4oKTtcbiAgICAvLyBBbGlhc2VzIG1hcHBpbmcgbXVsdGlwbGUgbWVzc2FnZSBJRHMgdG8gYWxyZWFkeS1zZWVuIG9uZXMuXG4gICAgY29uc3QgYWxpYXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG5cbiAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgdGhpcy5tZXNzYWdlcyh1c2VzKSkge1xuICAgICAgLy8gVE9ETyAtIGNhbid0IGxhbmQgcmVmbG93IHVudGlsIHdlIGhhdmUgbGlwc3VtIHRleHQuXG4gICAgICBtZXNzYWdlLmZpeFRleHQoKTtcbiAgICAgIGNvbnN0IG1pZCA9IG1lc3NhZ2UubWlkKCk7XG4gICAgICAvLyBEb24ndCByZWFkIHRoZSBzYW1lIG1lc3NhZ2UgdHdpY2UuXG4gICAgICBjb25zdCBzZWVuID0gYWRkcnMuZ2V0KG1lc3NhZ2UuYWRkcik7XG4gICAgICBjb25zdCBhbGlhc2VzID0gc2VlbiAhPSBudWxsICYmIGFsaWFzLmdldChzZWVuKTtcbiAgICAgIGlmIChhbGlhc2VzKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaChtaWQpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGFkZHJzLnNldChtZXNzYWdlLmFkZHIsIG1pZCk7XG4gICAgICBhbGlhcy5zZXQobWlkLCBbXSk7XG4gICAgICAvLyBTcGxpdCB1cCB0aGUgbWVzc2FnZSB0ZXh0IGludG8gd29yZHMuXG4gICAgICBjb25zdCB0ZXh0ID0gbWVzc2FnZS50ZXh0O1xuICAgICAgbGV0IGxldHRlcnMgPSBbXTtcblxuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRleHQubGVuZ3RoOyBpIDw9IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0ZXh0W2ldO1xuICAgICAgICBjb25zdCBjbG9zZXIgPSBDTE9TRVJTW2NdO1xuICAgICAgICBpZiAoUFVOQ1RVQVRJT05bY10gfHwgY2xvc2VyIHx8IGkgPT09IGxlbikge1xuICAgICAgICAgIC8vIGlmIHRoZSBuZXh0IGNoYXJhY3RlciBpcyBub24tcHVuY3R1YXRpb24gdGhlbiBpdCBjaGFpbnNcbiAgICAgICAgICBjb25zdCBuZXh0ID0gdGV4dFtpICsgMV07XG4gICAgICAgICAgaWYgKGNsb3NlcikgaSA9IE1hdGgubWF4KGksIHRleHQuaW5kZXhPZihjbG9zZXIsIGkpKTtcbiAgICAgICAgICBpZiAoIWxldHRlcnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBjaGFpbiA9IChjID09PSAnICcgfHwgYyA9PT0gJ1xcJycpICYmIG5leHQgJiYgIVBVTkNUVUFUSU9OW25leHRdID8gYyA6ICcnO1xuICAgICAgICAgIGNvbnN0IHN0ciA9IGxldHRlcnMuam9pbignJyk7XG4gICAgICAgICAgY29uc3QgaWQgPSB3b3Jkcy5sZW5ndGg7XG4gICAgICAgICAgY29uc3QgYnl0ZXMgPSBzdHIubGVuZ3RoICsgKGMgPT09ICcgJyA/IDEgOiAwKTtcbiAgICAgICAgICBsZXR0ZXJzID0gW107XG4gICAgICAgICAgd29yZHMucHVzaCh7c3RyLCBpZCwgY2hhaW4sIGJ5dGVzLCB1c2VkOiAwLCBzdWZmaXhlczogbmV3IFNldCgpLCBtaWR9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXR0ZXJzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIG1hcCBvZiBzdHJpbmcgdG8gc3VmZml4XG4gICAgY29uc3Qgc3VmZml4ZXMgPSBuZXcgTWFwPHN0cmluZywgU3VmZml4PigpO1xuICAgIGZvciAobGV0IGkgPSB3b3Jkcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgLy8gRm9yIGVhY2ggd29yZFxuICAgICAgY29uc3Qgd29yZCA9IHdvcmRzW2ldO1xuICAgICAgZm9yIChsZXQgaiA9IHdvcmQuYnl0ZXMgLSAyOyBqID49IDA7IGotLSkge1xuICAgICAgICAvLyBGb3IgZWFjaCBzdWZmaXhcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gd29yZC5zdHIuc3Vic3RyaW5nKGopO1xuICAgICAgICAvLyBDdXJyZW50IGZ1bGwgc3RyaW5nLCBhZGRpbmcgYWxsIHRoZSBjaGFpbnMgc28gZmFyXG4gICAgICAgIGxldCBzdHIgPSBzdWZmaXg7XG4gICAgICAgIC8vIE51bWJlciBvZiBleHRyYSBjaGFpbnMgYWRkZWRcbiAgICAgICAgbGV0IGxlbiA9IDA7XG4gICAgICAgIGxldCBsYXRlciA9IHdvcmQ7XG4gICAgICAgIGxldCBzYXZpbmcgPSB3b3JkLmJ5dGVzIC0gaiAtIDE7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgLy8gRm9yIGl0c2VsZiBhbmQgZWFjaCBjaGFpbmFibGUgd29yZCB0aGVyZWFmdGVyXG4gICAgICAgICAgbGV0IGRhdGEgPSBzdWZmaXhlcy5nZXQoc3RyKTtcbiAgICAgICAgICBpZiAoIWRhdGEpIHN1ZmZpeGVzLnNldChzdHIsIChkYXRhID0ge2NoYWluczogbGVuLCBtaXNzaW5nOiBqLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2aW5nOiAtc3RyLmxlbmd0aCwgc3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZHM6IG5ldyBTZXQoKX0pKTtcbiAgICAgICAgICBkYXRhLndvcmRzLmFkZChpKTtcbiAgICAgICAgICBkYXRhLnNhdmluZyArPSBzYXZpbmc7XG4gICAgICAgICAgLy8gTGluayB0aGUgc3VmZml4ZXNcbiAgICAgICAgICBmb3IgKGxldCBrID0gbGVuOyBrID49IDA7IGstLSkgd29yZHNbaSArIGtdLnN1ZmZpeGVzLmFkZChkYXRhKTtcbiAgICAgICAgICBpZiAoIWxhdGVyLmNoYWluKSBicmVhaztcbiAgICAgICAgICAvLyBJZiB0aGVyZSdzIGFub3RoZXIgd29yZCB0byBjaGFpbiB0bywgdGhlbiBjb250aW51ZVxuICAgICAgICAgIHN0ciArPSBsYXRlci5jaGFpbjtcbiAgICAgICAgICBsYXRlciA9IHdvcmRzW2kgKyAoKytsZW4pXTtcbiAgICAgICAgICBzdHIgKz0gbGF0ZXIuc3RyO1xuICAgICAgICAgIHNhdmluZyArPSBsYXRlci5ieXRlcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNvcnQgdGhlIHN1ZmZpeGVzIHRvIGZpbmQgdGhlIG1vc3QgaW1wYWN0ZnVsXG4gICAgY29uc3QgaW52YWxpZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGFiYnI6IEFiYnJldmlhdGlvbltdID0gW107XG4gICAgY29uc3Qgb3JkZXIgPSAoe3NhdmluZzogYX06IFN1ZmZpeCwge3NhdmluZzogYn06IFN1ZmZpeCkgPT4gYiAtIGE7XG4gICAgY29uc3Qgc29ydGVkID0gWy4uLnN1ZmZpeGVzLnZhbHVlcygpXS5zb3J0KG9yZGVyKTtcbiAgICBsZXQgdGFibGVMZW5ndGggPSAwO1xuICAgIHdoaWxlIChzb3J0ZWQubGVuZ3RoICYmIHRhYmxlTGVuZ3RoIDwgTUFYX1RBQkxFX0xFTkdUSCkge1xuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNvcnQgb3JkZXIgaGFzIGJlZW4gaW52YWxpZGF0ZWQgYW5kIHJlc29ydFxuICAgICAgaWYgKGludmFsaWQuaGFzKHNvcnRlZFswXS5zdHIpKSB7XG4gICAgICAgIHNvcnRlZC5zb3J0KG9yZGVyKTtcbiAgICAgICAgaW52YWxpZC5jbGVhcigpO1xuICAgICAgfVxuICAgICAgY29uc3Qge3N0ciwgc2F2aW5nLCBtaXNzaW5nLCB3b3Jkczogd3MsIGNoYWluc30gPSBzb3J0ZWQuc2hpZnQoKSE7XG4gICAgICAvLyBmaWd1cmUgb3V0IGlmIGl0J3Mgd29ydGggYWRkaW5nLi4uXG4gICAgICBpZiAoc2F2aW5nIDw9IDApIGJyZWFrO1xuICAgICAgLy8gbWFrZSB0aGUgYWJicmV2aWF0aW9uXG4gICAgICB0YWJsZUxlbmd0aCArPSBzdHIubGVuZ3RoICsgMztcbiAgICAgIGNvbnN0IGwgPSBhYmJyLmxlbmd0aDtcbiAgICAgIGNvbnN0IG1pZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3cykge1xuICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbd107XG4gICAgICAgIGZvciAoY29uc3QgbWlkIG9mIFt3b3JkLm1pZCwgLi4uKGFsaWFzLmdldCh3b3JkLm1pZCkgfHwgW10pXSkge1xuICAgICAgICAgIG1pZHMuYWRkKG1pZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFiYnIucHVzaCh7XG4gICAgICAgIGJ5dGVzOiBsIDwgMHg4MCA/IFtsICsgMHg4MF0gOiBbNSwgbCAtIDB4ODBdLFxuICAgICAgICBtaWRzLFxuICAgICAgICAvLyBtZXNzYWdlczogbmV3IFNldChbLi4ud3NdLm1hcCh3ID0+IHdvcmRzW3ddLm1pZCkpLFxuICAgICAgICBzdHIsXG4gICAgICB9KTtcblxuICAgICAgLy8gQmxhc3QgcmFkaXVzOiBhbGwgb3RoZXIgc3VmZml4ZXMgcmVsYXRlZCB0byBhbGwgdG91Y2hlZCB3b3JkcyBzYXZlIGxlc3NcbiAgICAgIGZvciAoY29uc3QgaSBvZiB3cykge1xuICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8PSBjaGFpbnM7IGsrKykge1xuICAgICAgICAgIGNvbnN0IHdvcmQgPSB3b3Jkc1tpICsga107XG4gICAgICAgICAgY29uc3QgdXNlZCA9IHdvcmQuYnl0ZXMgLSAoIWsgPyBtaXNzaW5nIDogMCk7XG4gICAgICAgICAgZm9yIChjb25zdCBzdWZmaXggb2Ygd29yZC5zdWZmaXhlcykge1xuICAgICAgICAgICAgc3VmZml4LnNhdmluZyAtPSAodXNlZCAtIHdvcmQudXNlZCk7XG4gICAgICAgICAgICBpbnZhbGlkLmFkZChzdWZmaXguc3RyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgd29yZC51c2VkID0gdXNlZDsgLy8gdHlwaWNhbGx5IGluY3JlYXNlcy4uLlxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoaXMgdGFrZXMgdXMgb3ZlciAweDgwIHRoZW4gYWxsIHN1ZmZpeGVzIGdldCB1cyBvbmUgbGVzcyBieXRlIG9mIHNhdmluZ3MgcGVyIHVzZVxuICAgICAgaWYgKGFiYnIubGVuZ3RoID09PSAweDgwKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBzdWZmaXhlcy52YWx1ZXMoKSkge1xuICAgICAgICAgIGRhdGEuc2F2aW5nIC09IGRhdGEud29yZHMuc2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBzb3J0ZWQuc29ydChvcmRlcik7XG4gICAgICAgIGludmFsaWQuY2xlYXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFiYnI7XG4gIH1cblxuICBhc3luYyB3cml0ZSh3cml0ZXI6IFdyaXRlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVzZXMgPSB0aGlzLnVzZXMoKTtcbiAgICBjb25zdCB0YWJsZSA9IHRoaXMuYnVpbGRBYmJyZXZpYXRpb25UYWJsZSh1c2VzKTtcbiAgICAvLyBwbGFuOiBhbmFseXplIGFsbCB0aGUgbXNlc2FnZXMsIGZpbmRpbmcgY29tbW9uIHN1ZmZpeGVzLlxuICAgIC8vIGVsaWdpYmxlIHN1ZmZpeGVzIG11c3QgYmUgZm9sbG93ZWQgYnkgZWl0aGVyIHNwYWNlLCBwdW5jdHVhdGlvbiwgb3IgZW9sXG4gICAgLy8gdG9kbyAtIHJlZm9ybWF0L2Zsb3cgbWVzc2FnZXMgYmFzZWQgb24gY3VycmVudCBzdWJzdGl0dXRpb24gbGVuZ3Roc1xuXG4gICAgLy8gYnVpbGQgdXAgYSBzdWZmaXggdHJpZSBiYXNlZCBvbiB0aGUgYWJicmV2aWF0aW9ucy5cbiAgICAvLyBjb25zdCB0cmllID0gbmV3IFN1ZmZpeFRyaWU8bnVtYmVyW10+KCk7XG4gICAgLy8gZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRhYmxlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgLy8gICB0cmllLnNldCh0YWJsZVtpXS5zdHIsIGkgPCAweDgwID8gW2kgKyAweDgwXSA6IFs1LCBpIC0gMHg4MF0pO1xuICAgIC8vIH1cblxuICAgIC8vIHdyaXRlIHRoZSBhYmJyZXZpYXRpb24gdGFibGVzIChhbGwsIHJld3JpdGluZyBoYXJkY29kZWQgY29kZXJlZnMpXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29kZXJlZihsb2M6IG51bWJlciwgYWRkcjogbnVtYmVyKSB7XG4gICAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBsb2MsIGFkZHIgLSAweDIwMDAwKTtcbiAgICAgIC8vIHNlY29uZCByZWYgaXMgYWx3YXlzIDUgYnl0ZXMgbGF0ZXJcbiAgICAgIHdyaXRlTGl0dGxlRW5kaWFuKHdyaXRlci5yb20sIGxvYyArIDUsIGFkZHIgKyAxIC0gMHgyMDAwMCk7XG4gICAgfVxuXG4gICAgLy8gc3RhcnQgYXQgMjg4YTUsIGdvIHRvIDI5NDAwXG4gICAgbGV0IGEgPSAweDI4OGE1O1xuICAgIGxldCBkID0gYSArIDIgKiAodGFibGUubGVuZ3RoICsgdGhpcy5yb20uaXRlbXMubGVuZ3RoICsgdGhpcy5leHRyYVdvcmRzWzZdLmNvdW50KTtcbiAgICB1cGRhdGVDb2RlcmVmKDB4Mjg3MDQsIGEpO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0YWJsZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKGkgPT09IDB4ODApIHVwZGF0ZUNvZGVyZWYoMHgyODY4YSwgYSk7XG4gICAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBhLCBkKTtcbiAgICAgIGEgKz0gMjtcbiAgICAgIHdyaXRlU3RyaW5nKHdyaXRlci5yb20sIGQsIHRhYmxlW2ldLnN0cik7XG4gICAgICBkICs9IHRhYmxlW2ldLnN0ci5sZW5ndGg7XG4gICAgICB3cml0ZXIucm9tW2QrK10gPSAwO1xuICAgIH1cbiAgICBpZiAodGFibGUubGVuZ3RoIDwgMHg4MCkgdXBkYXRlQ29kZXJlZigweDI4NjhhLCBhKTtcbiAgICAvLyBtb3ZlIG9uIHRvIHBlb3BsZVxuICAgIHVwZGF0ZUNvZGVyZWYoMHgyODZkNSwgYSk7XG4gICAgY29uc3QgbmFtZXMgPSB0aGlzLmV4dHJhV29yZHNbNl07XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG5hbWVzKSB7XG4gICAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBhLCBkKTtcbiAgICAgIGEgKz0gMjtcbiAgICAgIHdyaXRlU3RyaW5nKHdyaXRlci5yb20sIGQsIG5hbWUpO1xuICAgICAgZCArPSBuYW1lLmxlbmd0aDtcbiAgICAgIHdyaXRlci5yb21bZCsrXSA9IDA7XG4gICAgfVxuICAgIC8vIGZpbmFsbHkgdXBkYXRlIGl0ZW0gbmFtZXNcbiAgICB1cGRhdGVDb2RlcmVmKDB4Mjg2ZTksIGEpO1xuICAgIHVwZGF0ZUNvZGVyZWYoMHgyODc4OSwgYSk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMucm9tLml0ZW1zKSB7XG4gICAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBhLCBkKTtcbiAgICAgIGEgKz0gMjtcbiAgICAgIHdyaXRlU3RyaW5nKHdyaXRlci5yb20sIGQsIGl0ZW0ubWVzc2FnZU5hbWUpO1xuICAgICAgZCArPSBpdGVtLm1lc3NhZ2VOYW1lLmxlbmd0aDtcbiAgICAgIHdyaXRlci5yb21bZCsrXSA9IDA7XG4gICAgfVxuXG4gICAgLy8gZ3JvdXAgYWJicmV2aWF0aW9ucyBieSBtZXNzYWdlIGFuZCBzb3J0IGJ5IGxlbmd0aC5cbiAgICBjb25zdCBhYmJycyA9IG5ldyBNYXA8c3RyaW5nLCBBYmJyZXZpYXRpb25bXT4oKTsgLy8gYnkgbWlkXG4gICAgZm9yIChjb25zdCBhYmJyIG9mIHRhYmxlKSB7XG4gICAgICBmb3IgKGNvbnN0IG1pZCBvZiBhYmJyLm1pZHMpIHtcbiAgICAgICAgbGV0IGFiYnJMaXN0ID0gYWJicnMuZ2V0KG1pZCk7XG4gICAgICAgIGlmICghYWJickxpc3QpIGFiYnJzLnNldChtaWQsIChhYmJyTGlzdCA9IFtdKSk7XG4gICAgICAgIGFiYnJMaXN0LnB1c2goYWJicik7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgYWJickxpc3Qgb2YgYWJicnMudmFsdWVzKCkpIHtcbiAgICAgIGFiYnJMaXN0LnNvcnQoKHtzdHI6IHtsZW5ndGg6IHh9fTogQWJicmV2aWF0aW9uLCB7c3RyOiB7bGVuZ3RoOiB5fX06IEFiYnJldmlhdGlvbikgPT4geSAtIHgpO1xuICAgIH1cblxuICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgbWVzc2FnZXMgYW5kIHNlcmlhbGl6ZS5cbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTxudW1iZXI+W11bXSA9IHNlcSh0aGlzLnBhcnRzLmxlbmd0aCwgKCkgPT4gW10pO1xuICAgIGZvciAoY29uc3QgbSBvZiB0aGlzLm1lc3NhZ2VzKHVzZXMpKSB7XG4gICAgICBsZXQgdGV4dCA9IG0udGV4dDtcbiAgICAgIC8vIEZpcnN0IHJlcGxhY2UgYW55IGl0ZW1zIG9yIG90aGVyIG5hbWVzIHdpdGggdGhlaXIgYnl0ZXMuXG4gICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oW1xcW3tdKShbXlxcXX1dKilbXFxdfV0oLnwkKS9nLCAoZnVsbCwgYnJhY2tldCwgaW5zaWRlLCBhZnRlcikgPT4ge1xuICAgICAgICBpZiAoYWZ0ZXIgJiYgIVBVTkNUVUFUSU9OW2FmdGVyXSkgcmV0dXJuIGZ1bGw7XG4gICAgICAgIGlmIChhZnRlciA9PT0gJyAnKSBhZnRlciA9ICcnO1xuICAgICAgICBpZiAoYnJhY2tldCA9PT0gJ1snICYmIGluc2lkZSA9PT0gJzpJVEVNOicpIHtcbiAgICAgICAgICByZXR1cm4gYFs4XSR7YWZ0ZXJ9YDtcbiAgICAgICAgfSBlbHNlIGlmIChicmFja2V0ID09PSAneycgJiYgaW5zaWRlID09PSAnOkhFUk86Jykge1xuICAgICAgICAgIHJldHVybiBgWzRdJHthZnRlcn1gO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZpbmQgdGhlIG51bWJlciBiZWZvcmUgdGhlIGNvbG9uLlxuICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFswLTlhLWZdKyk6Ly5leGVjKGluc2lkZSk7XG4gICAgICAgIGlmICghbWF0Y2gpIHRocm93IG5ldyBFcnJvcihgQmFkIG1lc3NhZ2UgdGV4dDogJHtmdWxsfWApO1xuICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludChtYXRjaFsxXSwgMTYpO1xuICAgICAgICByZXR1cm4gYFske2JyYWNrZXQgPT09ICd7JyA/IDYgOiA3fV1bJHtpZH1dJHthZnRlcn1gO1xuICAgICAgfSk7XG4gICAgICAvLyBOb3cgc3RhcnQgd2l0aCB0aGUgbG9uZ2VzdCBhYmJyZXZpYXRpb24gYW5kIHdvcmsgb3VyIHdheSBkb3duLlxuICAgICAgZm9yIChjb25zdCB7c3RyLCBieXRlc30gb2YgYWJicnMuZ2V0KG0ubWlkKCkpIHx8IFtdKSB7XG4gICAgICAgIC8vIE5PVEU6IHR3byBzcGFjZXMgaW4gYSByb3cgYWZ0ZXIgYW4gZXhwYW5zaW9uIG11c3QgYmUgcHJlc2VydmVkIGFzLWlzLlxuICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKG5ldyBSZWdFeHAoc3RyICsgJyggWyAmMC05XXwufCQpJywgJ2cnKSwgKGZ1bGwsIGFmdGVyKSA9PiB7XG4gICAgICAgICAgaWYgKGFmdGVyICYmICFQVU5DVFVBVElPTlthZnRlcl0pIHJldHVybiBmdWxsO1xuICAgICAgICAgIGlmIChhZnRlciA9PT0gJyAnKSBhZnRlciA9ICcnO1xuICAgICAgICAgIHJldHVybiBieXRlcy5tYXAoYiA9PiBgWyR7Yn1dYCkuam9pbignJykgKyBhZnRlcjtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGJ1aWxkIHRoZSBlbmNvZGVkIHZlcnNpb25cbiAgICAgIGNvbnN0IGhleFBhcnRzID0gWydbMDFdJ107XG4gICAgICBjb25zdCBicyA9IFtdO1xuICAgICAgYnMucHVzaCgxKTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0ZXh0Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0ZXh0W2ldO1xuICAgICAgICBpZiAoYyA9PT0gTWVzc2FnZXMuQ09OVElOVUVEKSB7XG4gICAgICAgICAgYnMucHVzaCgzLCAxKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKCdbMDNdWzAxXScpO1xuICAgICAgICAgIGlmICh0ZXh0W2kgKyAxXSA9PT0gJ1xcbicpIGkrKztcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXFxuJykge1xuICAgICAgICAgIGJzLnB1c2goMik7XG4gICAgICAgICAgaWYgKHRleHRbaSArIDFdID09PSAnICcpIGkrKztcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKCdbMDJdJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1snKSB7XG4gICAgICAgICAgY29uc3QgaiA9IHRleHQuaW5kZXhPZignXScsIGkpO1xuICAgICAgICAgIGlmIChqIDw9IDApIHRocm93IG5ldyBFcnJvcihgYmFkIHRleHQ6ICR7dGV4dH1gKTtcbiAgICAgICAgICBjb25zdCBiID0gTnVtYmVyKHRleHQuc3Vic3RyaW5nKGkgKyAxLCBqKSk7XG4gICAgICAgICAgaWYgKGlzTmFOKGIpKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXh0OiAke3RleHR9YCk7XG4gICAgICAgICAgYnMucHVzaChiKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKGBbJHtoZXgoYil9XWApO1xuICAgICAgICAgIGkgPSBqO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICcgJyAmJiB0ZXh0W2kgKyAxXSA9PT0gJyAnKSB7XG4gICAgICAgICAgbGV0IGogPSBpICsgMjtcbiAgICAgICAgICB3aGlsZSAodGV4dFtqXSA9PT0gJyAnKSBqKys7XG4gICAgICAgICAgYnMucHVzaCg5LCBqIC0gaSk7XG4gICAgICAgICAgaGV4UGFydHMucHVzaChgWzA5XVske2hleChqIC0gaSl9XWApO1xuICAgICAgICAgIGkgPSBqIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBicy5wdXNoKGMuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgaGV4UGFydHMucHVzaChjKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnMucHVzaCgwKTtcbiAgICAgIGhleFBhcnRzLnB1c2goJ1swXScpO1xuICAgICAgbS5ieXRlcyA9IGJzO1xuICAgICAgbS5oZXggPSBoZXhQYXJ0cy5qb2luKCcnKTtcblxuICAgICAgLy8gRmlndXJlIG91dCB3aGljaCBwYWdlIGl0IG5lZWRzIHRvIGJlIG9uXG4gICAgICBjb25zdCBiYW5rID0gdGhpcy5iYW5rc1ttLnBhcnRdIDw8IDEzO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gYmFuayAtIDB4YTAwMDtcbiAgICAgIFxuICAgICAgcHJvbWlzZXNbbS5wYXJ0XVttLmlkXSA9XG4gICAgICAgICAgd3JpdGVyLndyaXRlKGJzLCBiYW5rLCBiYW5rICsgMHgyMDAwLCBgTWVzc2FnZSAke20ubWlkKCl9YClcbiAgICAgICAgICAgICAgLnRoZW4oYSA9PiBhIC0gb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBjb25zdCBhZGRyZXNzZXMgPSBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcy5tYXAocHMgPT4gUHJvbWlzZS5hbGwocHMpKSkgYXMgbnVtYmVyW11bXTtcbiAgICBjb25zdCBwYXJ0czogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgbGV0IHBvcyA9IDB4MjgwMDA7XG4gICAgZm9yIChsZXQgcGFydCA9IDA7IHBhcnQgPCBhZGRyZXNzZXMubGVuZ3RoOyBwYXJ0KyspIHtcbiAgICAgIGNvbnN0IGJ5dGVzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhZGRyZXNzZXNbcGFydF0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgd3JpdGVMaXR0bGVFbmRpYW4oYnl0ZXMsIDIgKiBpLCBhZGRyZXNzZXNbcGFydF1baV0pO1xuICAgICAgfVxuICAgICAgLy8gVE9ETyAtIHdvdWxkIGJlIG5pY2UgdG8gbGV0IHRoZSB3cml0ZXIgcGljayB3aGVyZSB0byBwdXQgdGhlIHBhcnRzLCBidXRcbiAgICAgIC8vIHRoZW4gd2UgZG9uJ3Qga25vdyBob3cgbWFueSB0byByZWFkIGZyb20gZWFjaC4gIFNvIGRvIGl0IHNlcXVlbnRpYWxseS5cbiAgICAgIC8vIHBhcnRzLnB1c2god3JpdGVyLndyaXRlKGJ5dGVzLCAweDI4MDAwLCAweDJhMDAwLCBgTWVzc2FnZVBhcnQgJHtoZXgocGFydCl9YClcbiAgICAgIC8vICAgICAgICAgICAgLnRoZW4oYSA9PiB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCAweDI4NDIyICsgMiAqIHBhcnQsXG4gICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSAtIDB4MjAwMDApKSk7XG4gICAgICB3cml0ZXIucm9tLnN1YmFycmF5KHBvcywgcG9zICsgYnl0ZXMubGVuZ3RoKS5zZXQoYnl0ZXMpXG4gICAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCAweDI4NDIyICsgMiAqIHBhcnQsIHBvcyAtIDB4MjAwMDApO1xuICAgICAgcG9zICs9IGJ5dGVzLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvLyBXcml0ZSB0aGUgYmFua3NcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYmFua3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHdyaXRlci5yb21bMHgyODNmZSArIGldID0gdGhpcy5iYW5rc1tpXTtcbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwYXJ0cyk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIEFiYnJldmlhdGlvbiB7XG4gIC8vIEJ5dGVzIHRvIGFiYnJldmlhdGUgdG8uXG4gIGJ5dGVzOiBudW1iZXJbXTtcbiAgLy8gTUlEcyBvZiB0aGUgbWVzc2FnZXMgdG8gYWJicmV2aWF0ZS5cbiAgbWlkczogU2V0PHN0cmluZz47XG4gIC8vIEV4cGFuZGVkIHRleHQuXG4gIHN0cjogc3RyaW5nO1xufVxuXG4vLyBNYXggbGVuZ3RoIGZvciB3b3JkcyB0YWJsZS4gIFZhbmlsbGEgYWxsb2NhdGVzIDkzMiBieXRlcywgYnV0IHRoZXJlJ3Ncbi8vIGFuIGV4dHJhIDQ0OCBhdmFpbGFibGUgaW1tZWRpYXRlbHkgYmVuZWF0aC4gIEZvciBub3cgd2UnbGwgcGljayBhIHJvdW5kXG4vLyBudW1iZXI6IDEyMDAuXG5jb25zdCBNQVhfVEFCTEVfTEVOR1RIID0gMTI1MDtcblxuLy8gY29uc3QgUFVOQ1RVQVRJT05fUkVHRVggPSAvW1xcMCAhXFxcXCwuOjs/Xy1dL2c7XG4vLyBjb25zdCBPUEVORVJTOiB7W2Nsb3NlOiBzdHJpbmddOiBzdHJpbmd9ID0geyd9JzogJ3snLCAnXSc6ICdbJ307XG5jb25zdCBDTE9TRVJTOiB7W29wZW46IHN0cmluZ106IHN0cmluZ30gPSB7J3snOiAnfScsICdbJzogJ10nfTtcblxuLy8gTWVzc2FnZSBNSURzIHRoYXQgYXJlIGhhcmRjb2RlZCBpbiB2YXJpb3VzIHBsYWNlcy5cbmV4cG9ydCBjb25zdCBIQVJEQ09ERURfTUVTU0FHRVM6IFNldDxzdHJpbmc+ID0gbmV3IFNldChbXG4gIC8vICcwMDowMCcsIC8vIGltcG9zc2libGUgdG8gaWRlbnRpZnkgdXNlc1xuICAnMjA6MWQnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgMSwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZThcbiAgJzFiOjBmJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDIsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmVhXG4gICcxYjoxMCcsIC8vIGVuZGdhbWUgbWVzc2FnZSAzLCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlY1xuICAnMWI6MTEnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgNCwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZWVcbiAgJzFiOjEyJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDUsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmYwXG4gICcxYjowNScsIC8vIGF6dGVjYSBkaWFsb2cgYWZ0ZXIgZHJheWdvbjIsIGV4ZWMgMzdiMjhcbiAgJzFiOjA2JywgLy8gYXp0ZWNhIGRpYWxvZyBhZnRlciBkcmF5Z29uMiwgZXhlYyAzN2IyOFxuICAnMWI6MDcnLCAvLyBhenRlY2EgZGlhbG9nIGFmdGVyIGRyYXlnb24yLCBleGVjIDM3YjI4XG4gICcxZjowMCcsIC8vIHp6eiBwYXJhbHlzaXMgZGlhbG9nLCBleGVjIDNkMGYzXG4gICcxMzowMCcsIC8vIGtlbnN1IHN3YW4gYXNrcyBmb3IgbG92ZSBwZW5kYW50LCBleGVjIDNkMWNhXG4gICcwYjowMScsIC8vIGFzaW5hIHJldmVhbCwgZXhlYyAzZDFlYlxuICAnMjA6MGMnLCAvLyBpdGVtZ2V0IG1lc3NhZ2UgJ3lvdSBub3cgaGF2ZScsIGV4ZWMgM2Q0M2NcbiAgJzIwOjBmJywgLy8gdG9vIG1hbnkgaXRlbXMsIGV4ZWMgM2Q0OGFcbiAgJzFjOjExJywgLy8gc3dvcmQgb2YgdGh1bmRlciBwcmUtd2FycCBtZXNzYWdlLCBleGVjIDFjOjExXG4gICcwZTowNScsIC8vIG1lc2lhIHJlY29yZGluZywgZXhlYyAzZDYyMVxuICAnMTY6MDAnLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljXG4gICcxNjowMicsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWMgKGxvb3ApXG4gICcxNjowNCcsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWMgKGxvb3ApXG4gICcxNjowNicsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWMgKGxvb3ApXG4gICcyMDoxMScsIC8vIGVtcHR5IHNob3AsIGV4ZWMgM2Q5YzRcbiAgJzIxOjAwJywgLy8gd2FycCBtZW51LCBleGVjIDNkYjYwXG4gICcyMTowMicsIC8vIHRlbGVwYXRoeSBtZW51LCBleGVjIDNkZDZlXG4gICcyMTowMScsIC8vIGNoYW5nZSBtZW51LCBleGVjIDNkZWNiXG4gICcwNjowMCcsIC8vIChzdCkga2VsYmVzcXVlIDEgbW9ub2xvZ3VlLCBleGVjIDFlOTlmXG4gICcxODowMCcsIC8vIChzdCkga2VsYmVzcXVlIDIgbW9ub2xvZ3VlLCBleGVjIDFlOTlmXG4gICcxODowMicsIC8vIChzdCkgc2FiZXJhIDIgbW9ub2xvZ3VlLCBleGVjIDFlY2U2XG4gICcxODowNCcsIC8vIChzdCkgbWFkbyAyIG1vbm9sb2d1ZSwgZXhlYyAxZWUyNlxuICAnMTg6MDgnLCAvLyAoc3QpIGthcm1pbmUgbW9ub2xvZ3VlLCBleGVjIDFlZjhhXG4gICcxYjowMycsIC8vIChzdCkgc3RhdHVlcyBtb25vbG9ndWUsIGV4ZWMgMWYwZTVcbiAgJzFiOjAwJywgLy8gKHN0KSBkcmF5Z29uIDEgbW9ub2xvZ3VlLCBleGVjIDFmMTkzXG4gICcxYjowMCcsIC8vIChzdCkgZHJheWdvbiAxIG1vbm9sb2d1ZSwgZXhlYyAxZjE5M1xuICAnMDY6MDEnLCAvLyAoc3QpIGtlbGJlc3F1ZSAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjFiYlxuICAnMTA6MTMnLCAvLyAoc3QpIHNhYmVyYSAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjFmXG4gICcxOTowNScsIC8vIChzdCkgbWFkbyAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjI1XG4gICcyMDoxNCcsIC8vIChzdCkga2VsYmVzcXVlIDEgbGVmdCBjaGVzdCwgZXhlYyAxZjdhMywgdGFibGUgMWY3Y2JcbiAgJzIwOjE1JywgLy8gKHN0KSBzYWJlcmEgMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdkNVxuICAnMjA6MTcnLCAvLyAoc3QpIG1hZG8gMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdkYVxuICAnMjA6MDInLCAvLyAoc3QpIGN1cmUgc3RhdHVzIGFpbG1lbnQsIGV4ZWMgMjdiOTBcbiAgJzIwOjBkJywgLy8gKHN0KSBsZXZlbCB1cCwgZXhlYyAzNTFlMlxuICAnMjA6MTknLCAvLyAoc3QpIHBvaXNvbmVkLCBleGVjIDM1MmFhXG4gICcyMDoxYScsIC8vIChzdCkgcGFyYWx5emVkLCBleGVjIDM1MmRmXG4gICcyMDoxYicsIC8vIChzdCkgc3RvbmVkLCBleGVjIDM1MzE3XG4gICcwMzowMScsIC8vIChzdCkgbGVhcm4gdGVsZXBhdGh5LCBleGVjIDM1MmNjXG4gICcwMzowMicsIC8vIChzdCkgZmFpbCB0byBsZWFybiB0ZWxlcGF0aHksIGV4ZWMgMzUyZThcbiAgJzEwOjEwJywgLy8gKHN0KSBmYWtlIG1lc2lhIG1lc3NhZ2UgMSwgZXhlYyAzNjViMVxuICAnMTA6MTEnLCAvLyAoc3QpIGZha2UgbWVzaWEgbWVzc2FnZSAyLCBleGVjIDM2NWIxXG4gICcxMDoxMicsIC8vIChzdCkgZmFrZSBtZXNpYSBtZXNzYWdlIDMsIGV4ZWMgMzY1YjFcbiAgJzBjOjA0JywgLy8gKHN0KSBkaXNtb3VudCBkb2xwaGluIChub3QgaW5zaWRlIEVTSSBjYXZlKSwgZXhlYyAzNjYwOVxuICAnMGM6MDUnLCAvLyAoc3QpIGRpc21vdW50IGRvbHBoaW4gKGV2ZXJ5d2hlcmUgaW4gbmVhciBFU0kpLCBleGVjIDM2NjA5XG4gICcwMzowMycsIC8vIChzdCkgc3RhcnQgc3RvbSBmaWdodCwgZXhlYyAzNjcxNlxuICAnMjA6MGUnLCAvLyAoc3QpIGluc3VmZmljaWVudCBtYWdpYyBmb3Igc3BlbGwsIGV4ZWMgM2NjMjNcbiAgJzIwOjEzJywgLy8gKHN0KSBub3RoaW5nIGhhcHBlbnMgaXRlbSB1c2Ugb2VyciwgZXhlYyAzZDUyYVxuXSk7XG4iXX0=