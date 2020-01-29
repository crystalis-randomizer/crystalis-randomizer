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
    '1b:04',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBTyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUN2QyxHQUFHLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUtyRSxNQUFNLFNBQWEsU0FBUSxLQUFRO0lBRWpDLFlBQXFCLEdBQVEsRUFDUixJQUFZLEVBQ1osS0FBYSxFQUNiLEtBQWEsRUFFdEIsT0FDSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBUTtRQUM1RCxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFQTSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBS2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDNUQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLFlBQWdCLFNBQVEsS0FBUTtJQUlwQyxZQUFxQixHQUFRLEVBQ1IsSUFBWSxFQUNaLEtBQWEsRUFDYixNQUFjLEVBQ3ZCLE9BQW1ELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBUTtRQUMxRSxLQUFLLENBQUMsS0FBSyxDQUFDLENB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QU0sa0JBQWtCLEdBQWdCLElBQUksR0FBRyxDQUFDO0lBRXJELE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0NBQ1IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtNZXNzYWdlSWR9IGZyb20gJy4vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7RGF0YSwgaGV4LCByZWFkTGl0dGxlRW5kaWFuLCByZWFkU3RyaW5nLFxuICAgICAgICBzZXEsIHNsaWNlLCB3cml0ZUxpdHRsZUVuZGlhbiwgd3JpdGVTdHJpbmd9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge1dyaXRlcn0gZnJvbSAnLi93cml0ZXIuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG4vLyBpbXBvcnQge1N1ZmZpeFRyaWV9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5jbGFzcyBEYXRhVGFibGU8VD4gZXh0ZW5kcyBBcnJheTxUPiB7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGJhc2U6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgY291bnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgd2lkdGg6IG51bWJlcixcbiAgICAgICAgICAgICAgLy8gVE9ETyAtIHdoYXQgd2FzIHRoaXMgc3VwcG9zZWQgdG8gYmU/IT9cbiAgICAgICAgICAgICAgZnVuYzogKC4uLng6IG51bWJlcltdKSA9PiBUID1cbiAgICAgICAgICAgICAgICAgIHdpZHRoID4gMSA/ICguLi5pKSA9PiBpIGFzIGFueSA6IGkgPT4gaSBhcyBhbnkpIHtcbiAgICBzdXBlcihjb3VudCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gZnVuYyguLi5zbGljZShyb20ucHJnLCBiYXNlICsgaSAqIHdpZHRoLCB3aWR0aCkpO1xuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBBZGRyZXNzVGFibGU8VD4gZXh0ZW5kcyBBcnJheTxUPiB7XG5cbiAgcmVhZG9ubHkgYWRkcmVzc2VzOiBudW1iZXJbXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgYmFzZTogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBjb3VudDogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBvZmZzZXQ6IG51bWJlcixcbiAgICAgICAgICAgICAgZnVuYzogKHg6IG51bWJlciwgaTogbnVtYmVyLCBhcnI6IG51bWJlcltdKSA9PiBUID0gaSA9PiBpIGFzIGFueSkge1xuICAgIHN1cGVyKGNvdW50KTtcbiAgICB0aGlzLmFkZHJlc3NlcyA9IHNlcSh0aGlzLmNvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgIChpOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGEgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIGJhc2UgKyAyICogaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSAmJiBhICsgb2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IGZ1bmModGhpcy5hZGRyZXNzZXNbaV0sIGksIHRoaXMuYWRkcmVzc2VzKTtcbiAgICB9XG4gIH1cbn1cblxuY29uc3QgREVMSU1JVEVSUyA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KFtbNiwgJ3t9J10sIFs3LCAnW10nXV0pO1xuXG5jbGFzcyBNZXNzYWdlIHtcblxuICAvLyBUaGlzIGlzIHJlZHVuZGFudCAtIHRoZSB0ZXh0IHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gIGJ5dGVzOiBudW1iZXJbXSA9IFtdO1xuICBoZXg6IHN0cmluZyA9ICcnOyAvLyBmb3IgZGVidWdnaW5nXG4gIHRleHQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBtZXNzYWdlczogTWVzc2FnZXMsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHBhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgaWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgYWRkcjogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBwb2ludGVyOiBudW1iZXIpIHtcblxuICAgIC8vIFBhcnNlIHRoZSBtZXNzYWdlXG4gICAgY29uc3QgcHJnOiBEYXRhPG51bWJlcj4gPSBtZXNzYWdlcy5yb20ucHJnO1xuICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IGFkZHI7IGFkZHIgJiYgcHJnW2ldOyBpKyspIHtcbiAgICAgIGNvbnN0IGIgPSBwcmdbaV07XG4gICAgICB0aGlzLmJ5dGVzLnB1c2goYik7XG4gICAgICBpZiAoYiA9PT0gMSkge1xuICAgICAgICAvLyBOT1RFIC0gdGhlcmUgaXMgb25lIGNhc2Ugd2hlcmUgdHdvIG1lc3NhZ2VzIHNlZW0gdG8gYWJ1dCB3aXRob3V0IGFcbiAgICAgICAgLy8gbnVsbCB0ZXJtaW5hdG9yIC0gJDJjYTkxICgkMTI6JDA4KSBmYWxscyB0aHJvdWdoIGZyb20gMTI6MDcuICBXZSBmaXhcbiAgICAgICAgLy8gdGhhdCB3aXRoIGFuIGFkanVzdG1lbnQgaW4gcm9tLnRzLlxuICAgICAgICBpZiAoaSAhPT0gYWRkciAmJiBwcmdbaSAtIDFdICE9PSAzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHN0YXJ0IG1lc3NhZ2Ugc2lnbmFsIGF0ICR7aS50b1N0cmluZygxNil9YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gMikge1xuICAgICAgICBwYXJ0cy5wdXNoKCdcXG4gJyk7XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDMpIHtcbiAgICAgICAgcGFydHMucHVzaChgJHtNZXNzYWdlcy5DT05USU5VRUR9XFxuYCk7IC8vIGJsYWNrIGRvd24tcG9pbnRpbmcgdHJpYW5nbGVcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gNCkge1xuICAgICAgICBwYXJ0cy5wdXNoKCd7OkhFUk86fScpO1xuICAgICAgfSBlbHNlIGlmIChiID09PSA4KSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ1s6SVRFTTpdJyk7XG4gICAgICB9IGVsc2UgaWYgKGIgPj0gNSAmJiBiIDw9IDkpIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IHByZ1srK2ldO1xuICAgICAgICBpZiAoYiA9PT0gOSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnLnJlcGVhdChuZXh0KSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGVsaW1zID0gREVMSU1JVEVSUy5nZXQoYik7XG4gICAgICAgIGlmIChkZWxpbXMpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKGRlbGltc1swXSk7XG4gICAgICAgICAgcGFydHMucHVzaChuZXh0LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKTtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCc6Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaChtZXNzYWdlcy5leHRyYVdvcmRzW2JdW25leHRdKTtcbiAgICAgICAgaWYgKGRlbGltcykgcGFydHMucHVzaChkZWxpbXNbMV0pO1xuICAgICAgICBpZiAoIVBVTkNUVUFUSU9OW1N0cmluZy5mcm9tQ2hhckNvZGUocHJnW2kgKyAxXSldKSB7XG4gICAgICAgICAgcGFydHMucHVzaCgnICcpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGIgPj0gMHg4MCkge1xuICAgICAgICBwYXJ0cy5wdXNoKG1lc3NhZ2VzLmJhc2ljV29yZHNbYiAtIDB4ODBdKTtcbiAgICAgICAgaWYgKCFQVU5DVFVBVElPTltTdHJpbmcuZnJvbUNoYXJDb2RlKHByZ1tpICsgMV0pXSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiID49IDB4MjApIHtcbiAgICAgICAgcGFydHMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLWV4aGF1c3RpdmUgc3dpdGNoOiAke2J9IGF0ICR7aS50b1N0cmluZygxNil9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudGV4dCA9IHBhcnRzLmpvaW4oJycpO1xuICB9XG5cbiAgbWlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke2hleCh0aGlzLnBhcnQpfToke2hleCh0aGlzLmlkKX1gO1xuICB9XG5cbiAgLy8gRml4ZXMgdGhlIHRleHQgdG8gZW5zdXJlIGl0IGZpdHMgaW4gdGhlIGRpYWxvZyBib3guXG4gIC8vIENvbnN0cmFpbnRzOlxuICAvLyAgLSBubyBsaW5lIGlzIGxvbmdlciB0aGFuIDI4IGNoYXJhY3RlcnNcbiAgLy8gIC0gZmlyc3QgbGluZSBhZnRlciBhIFxcbiBpcyBpbmRlbnRlZCBvbmUgc3BhY2VcbiAgLy8gIC0gdW5jYXBpdGFsaXplZCAodW5wdW5jdHVhdGVkPykgZmlyc3QgY2hhcmFjdGVycyBhcmUgaW5kZW50ZWQsIHRvb1xuICAvLyAgLSB3cmFwIG9yIHVud3JhcCBhbnkgcGVyc29uIG9yIGl0ZW0gbmFtZXNcbiAgLy8gIC0gYXQgbW9zdCBmb3VyIGxpbmVzIHBlciBtZXNzYWdlIGJveFxuICAvLyBJZiBhbnkgdmlvbGF0aW9ucyBhcmUgZm91bmQsIHRoZSBlbnRpcmUgbWVzc2FnZSBpcyByZWZsb3dlZC5cbiAgZml4VGV4dCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jaGVja1RleHQoKSkgcmV0dXJuO1xuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBsaW5lTnVtID0gMDtcbiAgICBsZXQgbGluZUxlbiA9IDA7XG4gICAgbGV0IHNwYWNlID0gZmFsc2U7XG4gICAgLy8gVE9ETyAtIGNoYW5nZSB3b3JkIGludG8gc29tZXRoaW5nIGZhbmNpZXIgLSBhbiBhcnJheSBvZlxuICAgIC8vIChzdHIsIGxlbiwgZmFsbGJhY2spIHNvIHRoYXQgcHVuY3R1YXRpb24gYWZ0ZXIgYW5cbiAgICAvLyBleHBhbnNpb24gZG9lc24ndCBzY3JldyB1cyB1cC5cbiAgICAvLyBPUi4uLiBqdXN0IGluc2VydCB0aGUgZmFsbGJhY2sgZXZlcnkgdGltZSBhbmQgaW5zdGVhZCBtZW1vaXplXG4gICAgLy8gdGhlIGV4cGFuc2lvbiB0byByZXBsYWNlIGF0IHRoZSBlbmQgaWYgdGhlcmUncyBubyBicmVhay5cbiAgICBsZXQgd29yZDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBleHBhbnNpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBmdW5jdGlvbiBpbnNlcnQoc3RyOiBzdHJpbmcsIGxlbjogbnVtYmVyID0gc3RyLmxlbmd0aCkge1xuICAgICAgLy8gVE9ETyAtIHdoYXQgZG8gd2UgZG8gd2l0aCBleGlzdGluZyBwYWdlIGJyZWFrcz9cbiAgICAgIC8vICAgICAgLSBpZiB3ZSBldmVyIG5lZWQgdG8gX21vdmVfIG9uZSB0aGVuIHdlIHNob3VsZCBJR05PUkUgaXQ/XG4gICAgICAvLyAgICAgIC0gc2FtZSB3aXRoIG5ld2xpbmVzLi4uXG4gICAgICAvLyBpZiAoc3RyID09PSAnIycpIHtcbiAgICAgIC8vICAgbmV3bGluZSgpO1xuICAgICAgLy8gICByZXR1cm47XG4gICAgICAvLyB9XG4gICAgICBpZiAobGluZUxlbiArIGxlbiA+IDI5KSBuZXdsaW5lKCk7XG4gICAgICBpZiAoc3RyID09PSAnICcpIHtcbiAgICAgICAgcGFydHMucHVzaCguLi53b3JkLCAnICcpO1xuICAgICAgICB3b3JkID0gW107XG4gICAgICB9IGVsc2UgaWYgKC9eW1t7XTovLnRlc3Qoc3RyKSkge1xuICAgICAgICB3b3JkLnB1c2goe3RvU3RyaW5nOiAoKSA9PiBzdHIsIGxlbmd0aDogbGVufSBhcyBhbnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29yZC5wdXNoKHN0cik7XG4gICAgICB9XG4gICAgICBsaW5lTGVuICs9IGxlbjtcbiAgICAgIHNwYWNlID0gc3RyLmVuZHNXaXRoKCcgJyk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluc2VydFNwYWNlKCkge1xuICAgICAgaWYgKCFzcGFjZSkgaW5zZXJ0KCcgJyk7XG4gICAgICBzcGFjZSA9IHRydWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluc2VydEFsbChzdHI6IHN0cmluZykge1xuICAgICAgY29uc3Qgc3BsaXQgPSBzdHIuc3BsaXQoL1xccysvKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGkpIGluc2VydFNwYWNlKCk7XG4gICAgICAgIGluc2VydChzcGxpdFtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIG5ld2xpbmUoKSB7XG4gICAgICBsaW5lTGVuID0gMSArIHdvcmQucmVkdWNlKChhLCBiKSA9PiBhICsgYi5sZW5ndGgsIDApO1xuICAgICAgaWYgKCsrbGluZU51bSA+IDMpIHtcbiAgICAgICAgcGFydHMucHVzaCgnI1xcbiAnKTtcbiAgICAgICAgbGluZU51bSA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJ0cy5wdXNoKCdcXG4gJyk7XG4gICAgICB9XG4gICAgICBzcGFjZSA9IHRydWU7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy50ZXh0W2ldO1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudGV4dFtpICsgMV07XG4gICAgICBpZiAoL1tcXHNcXG4jXS8udGVzdChjKSkge1xuICAgICAgICBpbnNlcnRTcGFjZSgpO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAneycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICc6Jykge1xuICAgICAgICAgIGluc2VydCgnezpIRVJPOn0nLCA2KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb2xvbiA9IHRoaXMudGV4dC5pbmRleE9mKCc6JywgaSk7XG4gICAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQodGhpcy50ZXh0LnN1YnN0cmluZyhpICsgMSwgY29sb24pLCAxNik7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMubWVzc2FnZXMuZXh0cmFXb3Jkc1s2XVtpZF07XG4gICAgICAgICAgZXhwYW5zaW9ucy5zZXQobmFtZSwgYHske2lkLnRvU3RyaW5nKDE2KX06JHtuYW1lfX1gKTtcbiAgICAgICAgICBpbnNlcnRBbGwobmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgaSA9IHRoaXMudGV4dC5pbmRleE9mKCd9JywgaSk7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICdbJykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtcztcbiAgICAgICAgICBpbnNlcnQoJ1s6SVRFTTpdJywgTWF0aC5tYXgoLi4uaXRlbXMubWFwKGkgPT4gaS5tZXNzYWdlTmFtZS5sZW5ndGgpKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29sb24gPSB0aGlzLnRleHQuaW5kZXhPZignOicsIGkpO1xuICAgICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KHRoaXMudGV4dC5zdWJzdHJpbmcoaSArIDEsIGNvbG9uKSwgMTYpO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtc1tpZF0ubWVzc2FnZU5hbWU7XG4gICAgICAgICAgZXhwYW5zaW9ucy5zZXQobmFtZSwgYFske2lkLnRvU3RyaW5nKDE2KX06JHtuYW1lfV1gKTtcbiAgICAgICAgICBpbnNlcnRBbGwobmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgaSA9IHRoaXMudGV4dC5pbmRleE9mKCddJywgaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnNlcnQoYyk7XG4gICAgICB9XG4gICAgfVxuICAgIHBhcnRzLnB1c2goLi4ud29yZCk7XG4gICAgbGV0IHRleHQgPSBwYXJ0cy5qb2luKCcnKTtcbiAgICBmb3IgKGNvbnN0IFtmdWxsLCBhYmJyXSBvZiBleHBhbnNpb25zKSB7XG4gICAgICBpZiAodGV4dC5pbmNsdWRlcyhmdWxsKSkgdGV4dCA9IHRleHQuc3BsaXQoZnVsbCkuam9pbihhYmJyKTtcbiAgICB9XG4gICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgfVxuXG4gIGNoZWNrVGV4dCgpOiBib29sZWFuIHtcbiAgICBsZXQgbGluZU51bSA9IDA7XG4gICAgbGV0IGxpbmVMZW4gPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy50ZXh0W2ldO1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudGV4dFtpICsgMV07XG4gICAgICBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgICAgbGluZU51bSsrO1xuICAgICAgICBsaW5lTGVuID0gMTtcbiAgICAgICAgaWYgKGxpbmVOdW0gPiAzKSByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICcjJykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJ1xcbicpIGkrKzsgLy8gZWF0IG5ld2xpbmVcbiAgICAgICAgbGluZU51bSA9IGxpbmVMZW4gPSAwO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAneycgfHwgYyA9PT0gJ1snKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnOicpIHtcbiAgICAgICAgICBpZiAoYyA9PT0gJ3snKSB7IC8vIHs6SEVSTzp9XG4gICAgICAgICAgICBsaW5lTGVuICs9IDY7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gWzpJVEVNOl1cbiAgICAgICAgICAgIC8vIGNvbXB1dGUgdGhlIG1heCBpdGVtIGxlbmd0aFxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtcztcbiAgICAgICAgICAgIGxpbmVMZW4gKz0gTWF0aC5tYXgoLi4uaXRlbXMubWFwKGkgPT4gaS5tZXNzYWdlTmFtZS5sZW5ndGgpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGxpbmVMZW4gPiAyOCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbG9uID0gdGhpcy50ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0aGlzLnRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBsaW5lTGVuICs9IChjID09PSAneycgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2VzLmV4dHJhV29yZHNbNl1baWRdIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tZXNzYWdlcy5yb20uaXRlbXNbaWRdLm1lc3NhZ2VOYW1lKS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgaSA9IHRoaXMudGV4dC5pbmRleE9mKENMT1NFUlNbY10sIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGluZUxlbisrO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmVMZW4gPiAyOSAmJiBjICE9PSAnICcpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuY29uc3QgUFVOQ1RVQVRJT046IHtbY2hhcjogc3RyaW5nXTogYm9vbGVhbn0gPSB7XG4gICdcXDAnOiB0cnVlLFxuICAnICc6IHRydWUsXG4gICchJzogdHJ1ZSxcbiAgJ1xcJyc6IHRydWUsXG4gICcsJzogdHJ1ZSxcbiAgJy4nOiB0cnVlLFxuICAnOic6IHRydWUsXG4gICc7JzogdHJ1ZSxcbiAgJz8nOiB0cnVlLFxuICAnXyc6IHRydWUsXG5cbiAgLy8gPz8/P1xuICAnXFxuJzogdHJ1ZSwgLy8gbGluZSBzZXBhcmF0b3JcbiAgJyMnOiB0cnVlLCAgLy8gcGFnZSBzZXBhcmF0b3Jcbn07XG5cbmV4cG9ydCBjbGFzcyBNZXNzYWdlcyB7XG5cbiAgYmFzaWNXb3JkczogQWRkcmVzc1RhYmxlPHN0cmluZz47XG4gIGV4dHJhV29yZHM6IHtbZ3JvdXA6IG51bWJlcl06IEFkZHJlc3NUYWJsZTxzdHJpbmc+fTtcbiAgYmFua3M6IERhdGFUYWJsZTxudW1iZXI+O1xuICBwYXJ0czogQWRkcmVzc1RhYmxlPEFkZHJlc3NUYWJsZTxNZXNzYWdlPj47XG5cbiAgLy8gTk9URTogdGhlc2UgZGF0YSBzdHJ1Y3R1cmVzIGFyZSByZWR1bmRhbnQgd2l0aCB0aGUgYWJvdmUuXG4gIC8vIE9uY2Ugd2UgZ2V0IHRoaW5ncyB3b3JraW5nIHNtb290aGx5LCB3ZSBzaG91bGQgY2xlYW4gaXQgdXBcbiAgLy8gdG8gb25seSB1c2Ugb25lIG9yIHRoZSBvdGhlci5cbiAgLy8gYWJicmV2aWF0aW9uczogc3RyaW5nW107XG4gIC8vIHBlcnNvbk5hbWVzOiBzdHJpbmdbXTtcblxuICAvLyBzdGF0aWMgcmVhZG9ubHkgQ09OVElOVUVEID0gJ1xcdTI1YmMnO1xuICBzdGF0aWMgcmVhZG9ubHkgQ09OVElOVUVEID0gJyMnO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgY29uc3QgY29tbW9uV29yZHNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCAweDI4NzA0KSArIDB4MjAwMDA7XG4gICAgY29uc3QgZXh0cmFXb3Jkc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIDB4Mjg2OGEpICsgMHgyMDAwMDtcbiAgICBjb25zdCBwZXJzb25OYW1lc0Jhc2UgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIDB4Mjg2ZDUpICsgMHgyMDAwMDtcbiAgICBjb25zdCBpdGVtTmFtZXNCYXNlID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCAweDI4NmU5KSArIDB4MjAwMDA7XG5cbiAgICBjb25zdCBzdHIgPSAoYTogbnVtYmVyKSA9PiByZWFkU3RyaW5nKHJvbS5wcmcsIGEpO1xuICAgIC8vIFRPRE8gLSByZWFkIHRoZXNlIGFkZHJlc3NlcyBkaXJlY3RseSBmcm9tIHRoZSBjb2RlLCBpbiBjYXNlIHRoZXkgbW92ZVxuICAgIHRoaXMuYmFzaWNXb3JkcyA9IG5ldyBBZGRyZXNzVGFibGUocm9tLCBjb21tb25Xb3Jkc0Jhc2UsIDB4ODAsIDB4MjAwMDAsIHN0cik7XG4gICAgdGhpcy5leHRyYVdvcmRzID0ge1xuICAgICAgNTogbmV3IEFkZHJlc3NUYWJsZShyb20sIGV4dHJhV29yZHNCYXNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAocGVyc29uTmFtZXNCYXNlIC0gZXh0cmFXb3Jkc0Jhc2UpID4+PiAxLCAweDIwMDAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIpLCAvLyBsZXNzIGNvbW1vblxuICAgICAgNjogbmV3IEFkZHJlc3NUYWJsZShyb20sIHBlcnNvbk5hbWVzQmFzZSwgMzYsIDB4MjAwMDAsIHN0ciksIC8vIHBlb3BsZS9wbGFjZXNcbiAgICAgIDc6IG5ldyBBZGRyZXNzVGFibGUocm9tLCBpdGVtTmFtZXNCYXNlLCA3NCwgMHgyMDAwMCwgc3RyKSwgLy8gaXRlbXMgKGFsc28gOD8pXG4gICAgfTtcblxuICAgIHRoaXMuYmFua3MgPSBuZXcgRGF0YVRhYmxlKHJvbSwgMHgyODNmZSwgMHgyNCwgMSk7XG4gICAgdGhpcy5wYXJ0cyA9IG5ldyBBZGRyZXNzVGFibGUoXG4gICAgICAgIHJvbSwgMHgyODQyMiwgMHgyMiwgMHgyMDAwMCxcbiAgICAgICAgKGFkZHIsIHBhcnQsIGFkZHJzKSA9PiB7XG4gICAgICAgICAgLy8gbmVlZCB0byBjb21wdXRlIHRoZSBlbmQgYmFzZWQgb24gdGhlIGFycmF5P1xuICAgICAgICAgIGNvbnN0IGNvdW50ID0gcGFydCA9PT0gMHgyMSA/IDMgOiAoYWRkcnNbcGFydCArIDFdIC0gYWRkcikgPj4+IDE7XG4gICAgICAgICAgLy8gb2Zmc2V0OiBiYW5rPSQxNSA9PiAkMjAwMDAsIGJhbms9JDE2ID0+ICQyMjAwMCwgYmFuaz0kMTcgPT4gJDI0MDAwXG4gICAgICAgICAgLy8gc3VidHJhY3QgJGEwMDAgYmVjYXVzZSB0aGF0J3MgdGhlIHBhZ2Ugd2UncmUgbG9hZGluZyBhdC5cbiAgICAgICAgICByZXR1cm4gbmV3IEFkZHJlc3NUYWJsZShcbiAgICAgICAgICAgICAgcm9tLCBhZGRyLCBjb3VudCwgKHRoaXMuYmFua3NbcGFydF0gPDwgMTMpIC0gMHhhMDAwLFxuICAgICAgICAgICAgICAobSwgaWQpID0+IG5ldyBNZXNzYWdlKHRoaXMsIHBhcnQsIGlkLCBtLCBhZGRyICsgMiAqIGlkKSk7XG4gICAgICAgIH0pO1xuICB9XG5cbiAgLy8gRmxhdHRlbnMgdGhlIG1lc3NhZ2VzLiAgTk9URTogcmV0dXJucyB1bnVzZWQgbWVzc2FnZXMuXG4gICogbWVzc2FnZXModXNlZD86IHtoYXM6IChtaWQ6IHN0cmluZykgPT4gYm9vbGVhbn0pOiBJdGVyYWJsZTxNZXNzYWdlPiB7XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMucGFydHMpIHtcbiAgICAgIGlmICh1c2VkKSB7XG4gICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiBwYXJ0KSB7XG4gICAgICAgICAgaWYgKHVzZWQuaGFzKG1lc3NhZ2UubWlkKCkpKSB5aWVsZCBtZXNzYWdlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB5aWVsZCAqIHBhcnQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIG1lc3NhZ2UgaWQgKG1pZCkgdG8ga25vd24gdXNhZ2VzLlxuICB1c2VzKCk6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PiB7XG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xuICAgIGZ1bmN0aW9uIHVzZShtZXNzYWdlOiBNZXNzYWdlSWQgfCBzdHJpbmcsIHVzYWdlOiBzdHJpbmcpIHtcbiAgICAgIGNvbnN0IHN0ciA9IHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJyA/IG1lc3NhZ2UgOiBtZXNzYWdlLm1pZCgpO1xuICAgICAgY29uc3Qgc2V0ID0gb3V0LmdldChzdHIpIHx8IG5ldyBTZXQoKTtcbiAgICAgIHNldC5hZGQodXNhZ2UpO1xuICAgICAgb3V0LnNldChzdHIsIHNldCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnJvbS50cmlnZ2Vycykge1xuICAgICAgaWYgKHRyaWdnZXIubWVzc2FnZS5ub256ZXJvKCkpIHtcbiAgICAgICAgdXNlKHRyaWdnZXIubWVzc2FnZSwgYFRyaWdnZXIgJCR7aGV4KHRyaWdnZXIuaWQpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5yb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgbSBvZiBpdGVtLml0ZW1Vc2VNZXNzYWdlcygpKSB7XG4gICAgICAgIGlmIChtLm5vbnplcm8oKSkgdXNlKG0sIGBJdGVtICQke2hleChpdGVtLmlkKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5yb20ubnBjcykge1xuICAgICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICAgIHVzZShkLm1lc3NhZ2UsIGBOUEMgJCR7aGV4KG5wYy5pZCl9YCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtsLCBkc10gb2YgbnBjLmxvY2FsRGlhbG9ncykge1xuICAgICAgICBjb25zdCBsaCA9IGwgPj0gMCA/IGAgQCAkJHtoZXgobCl9YCA6ICcnO1xuICAgICAgICBmb3IgKGNvbnN0IGQgb2YgZHMpIHtcbiAgICAgICAgICB1c2UoZC5tZXNzYWdlLCBgTlBDICQke2hleChucGMuaWQpfSR7bGh9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBzYWdlIG9mIHRoaXMucm9tLnRlbGVwYXRoeS5zYWdlcykge1xuICAgICAgZm9yIChjb25zdCBkIG9mIHNhZ2UuZGVmYXVsdE1lc3NhZ2VzKSB7XG4gICAgICAgIHVzZShkLCBgVGVsZXBhdGh5ICR7c2FnZS5zYWdlfWApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBnIG9mIHNhZ2UubWVzc2FnZUdyb3Vwcykge1xuICAgICAgICBmb3IgKGNvbnN0IFssIC4uLm1zXSBvZiBnLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBtIG9mIG1zKSB7XG4gICAgICAgICAgICB1c2UobSEsIGBUZWxlcGF0aHkgJHtzYWdlLnNhZ2V9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgbSBvZiBIQVJEQ09ERURfTUVTU0FHRVMpIHtcbiAgICAgIHVzZShtLCAnSGFyZGNvZGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBidWlsZEFiYnJldmlhdGlvblRhYmxlKHVzZXMgPSB0aGlzLnVzZXMoKSk6IEFiYnJldmlhdGlvbltdIHtcbiAgICAvLyBDb3VudCBmcmVxdWVuY2llcyBvZiB1c2VkIHN1ZmZpeGVzLlxuICAgIGludGVyZmFjZSBTdWZmaXgge1xuICAgICAgLy8gQWN0dWFsIHN0cmluZ1xuICAgICAgc3RyOiBzdHJpbmc7XG4gICAgICAvLyBUb3RhbCBudW1iZXIgb2YgYnl0ZXMgc2F2ZWQgb3ZlciBhbGwgb2NjdXJyZW5jZXNcbiAgICAgIHNhdmluZzogbnVtYmVyO1xuICAgICAgLy8gQWxsIHRoZSBpbml0aWFsIHdvcmRzIHRoaXMgaXMgaW4gKG5vdCBjb3VudGluZyBjaGFpbnMpXG4gICAgICB3b3JkczogU2V0PG51bWJlcj47XG4gICAgICAvLyBOdW1iZXIgb2YgY2hhaW5zXG4gICAgICBjaGFpbnM6IG51bWJlcjtcbiAgICAgIC8vIE51bWJlciBvZiBsZXR0ZXJzIG1pc3NpbmcgZnJvbSB0aGUgZmlyc3Qgd29yZFxuICAgICAgbWlzc2luZzogbnVtYmVyO1xuICAgIH1cbiAgICBpbnRlcmZhY2UgV29yZCB7XG4gICAgICAvLyBBY3R1YWwgc3RyaW5nXG4gICAgICBzdHI6IHN0cmluZztcbiAgICAgIC8vIEluZGV4IGluIGxpc3RcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICAvLyBUaGUgY2hhaW5hYmxlIHB1bmN0dWF0aW9uIGFmdGVyIHRoaXMgd29yZCAoc3BhY2Ugb3IgYXBvc3Ryb3BoZSlcbiAgICAgIGNoYWluOiBzdHJpbmc7XG4gICAgICAvLyBQb3NzaWJsZSBieXRlcyB0byBiZSBzYXZlZFxuICAgICAgYnl0ZXM6IG51bWJlcjtcbiAgICAgIC8vIE51bWJlciBvZiBjaGFyYWN0ZXJzIGN1cnJlbnRseSBiZWluZyBjb21wcmVzc2VkXG4gICAgICB1c2VkOiBudW1iZXI7XG4gICAgICAvLyBBbGwgc3VmZml4ZXMgdGhhdCB0b3VjaCB0aGlzIHdvcmRcbiAgICAgIHN1ZmZpeGVzOiBTZXQ8U3VmZml4PjtcbiAgICAgIC8vIE1lc3NhZ2UgSURcbiAgICAgIG1pZDogc3RyaW5nO1xuICAgIH1cblxuICAgIC8vIE9yZGVyZWQgbGlzdCBvZiB3b3Jkc1xuICAgIGNvbnN0IHdvcmRzOiBXb3JkW10gPSBbXTtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIGFkZHJlc3NlcyB3ZSd2ZSBzZWVuLCBtYXBwaW5nIHRvIG1lc3NhZ2UgSURzIGZvciBhbGlhc2luZy5cbiAgICBjb25zdCBhZGRycyA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KCk7XG4gICAgLy8gQWxpYXNlcyBtYXBwaW5nIG11bHRpcGxlIG1lc3NhZ2UgSURzIHRvIGFscmVhZHktc2VlbiBvbmVzLlxuICAgIGNvbnN0IGFsaWFzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuXG4gICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIHRoaXMubWVzc2FnZXModXNlcykpIHtcbiAgICAgIC8vIFRPRE8gLSBjYW4ndCBsYW5kIHJlZmxvdyB1bnRpbCB3ZSBoYXZlIGxpcHN1bSB0ZXh0LlxuICAgICAgbWVzc2FnZS5maXhUZXh0KCk7XG4gICAgICBjb25zdCBtaWQgPSBtZXNzYWdlLm1pZCgpO1xuICAgICAgLy8gRG9uJ3QgcmVhZCB0aGUgc2FtZSBtZXNzYWdlIHR3aWNlLlxuICAgICAgY29uc3Qgc2VlbiA9IGFkZHJzLmdldChtZXNzYWdlLmFkZHIpO1xuICAgICAgY29uc3QgYWxpYXNlcyA9IHNlZW4gIT0gbnVsbCAmJiBhbGlhcy5nZXQoc2Vlbik7XG4gICAgICBpZiAoYWxpYXNlcykge1xuICAgICAgICBhbGlhc2VzLnB1c2gobWlkKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBhZGRycy5zZXQobWVzc2FnZS5hZGRyLCBtaWQpO1xuICAgICAgYWxpYXMuc2V0KG1pZCwgW10pO1xuICAgICAgLy8gU3BsaXQgdXAgdGhlIG1lc3NhZ2UgdGV4dCBpbnRvIHdvcmRzLlxuICAgICAgY29uc3QgdGV4dCA9IG1lc3NhZ2UudGV4dDtcbiAgICAgIGxldCBsZXR0ZXJzID0gW107XG5cbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0ZXh0Lmxlbmd0aDsgaSA8PSBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBjID0gdGV4dFtpXTtcbiAgICAgICAgY29uc3QgY2xvc2VyID0gQ0xPU0VSU1tjXTtcbiAgICAgICAgaWYgKFBVTkNUVUFUSU9OW2NdIHx8IGNsb3NlciB8fCBpID09PSBsZW4pIHtcbiAgICAgICAgICAvLyBpZiB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgbm9uLXB1bmN0dWF0aW9uIHRoZW4gaXQgY2hhaW5zXG4gICAgICAgICAgY29uc3QgbmV4dCA9IHRleHRbaSArIDFdO1xuICAgICAgICAgIGlmIChjbG9zZXIpIGkgPSBNYXRoLm1heChpLCB0ZXh0LmluZGV4T2YoY2xvc2VyLCBpKSk7XG4gICAgICAgICAgaWYgKCFsZXR0ZXJzLmxlbmd0aCkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgY2hhaW4gPSAoYyA9PT0gJyAnIHx8IGMgPT09ICdcXCcnKSAmJiBuZXh0ICYmICFQVU5DVFVBVElPTltuZXh0XSA/IGMgOiAnJztcbiAgICAgICAgICBjb25zdCBzdHIgPSBsZXR0ZXJzLmpvaW4oJycpO1xuICAgICAgICAgIGNvbnN0IGlkID0gd29yZHMubGVuZ3RoO1xuICAgICAgICAgIGNvbnN0IGJ5dGVzID0gc3RyLmxlbmd0aCArIChjID09PSAnICcgPyAxIDogMCk7XG4gICAgICAgICAgbGV0dGVycyA9IFtdO1xuICAgICAgICAgIHdvcmRzLnB1c2goe3N0ciwgaWQsIGNoYWluLCBieXRlcywgdXNlZDogMCwgc3VmZml4ZXM6IG5ldyBTZXQoKSwgbWlkfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0dGVycy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBtYXAgb2Ygc3RyaW5nIHRvIHN1ZmZpeFxuICAgIGNvbnN0IHN1ZmZpeGVzID0gbmV3IE1hcDxzdHJpbmcsIFN1ZmZpeD4oKTtcbiAgICBmb3IgKGxldCBpID0gd29yZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIC8vIEZvciBlYWNoIHdvcmRcbiAgICAgIGNvbnN0IHdvcmQgPSB3b3Jkc1tpXTtcbiAgICAgIGZvciAobGV0IGogPSB3b3JkLmJ5dGVzIC0gMjsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgLy8gRm9yIGVhY2ggc3VmZml4XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9IHdvcmQuc3RyLnN1YnN0cmluZyhqKTtcbiAgICAgICAgLy8gQ3VycmVudCBmdWxsIHN0cmluZywgYWRkaW5nIGFsbCB0aGUgY2hhaW5zIHNvIGZhclxuICAgICAgICBsZXQgc3RyID0gc3VmZml4O1xuICAgICAgICAvLyBOdW1iZXIgb2YgZXh0cmEgY2hhaW5zIGFkZGVkXG4gICAgICAgIGxldCBsZW4gPSAwO1xuICAgICAgICBsZXQgbGF0ZXIgPSB3b3JkO1xuICAgICAgICBsZXQgc2F2aW5nID0gd29yZC5ieXRlcyAtIGogLSAxO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIC8vIEZvciBpdHNlbGYgYW5kIGVhY2ggY2hhaW5hYmxlIHdvcmQgdGhlcmVhZnRlclxuICAgICAgICAgIGxldCBkYXRhID0gc3VmZml4ZXMuZ2V0KHN0cik7XG4gICAgICAgICAgaWYgKCFkYXRhKSBzdWZmaXhlcy5zZXQoc3RyLCAoZGF0YSA9IHtjaGFpbnM6IGxlbiwgbWlzc2luZzogaixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmluZzogLXN0ci5sZW5ndGgsIHN0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmRzOiBuZXcgU2V0KCl9KSk7XG4gICAgICAgICAgZGF0YS53b3Jkcy5hZGQoaSk7XG4gICAgICAgICAgZGF0YS5zYXZpbmcgKz0gc2F2aW5nO1xuICAgICAgICAgIC8vIExpbmsgdGhlIHN1ZmZpeGVzXG4gICAgICAgICAgZm9yIChsZXQgayA9IGxlbjsgayA+PSAwOyBrLS0pIHdvcmRzW2kgKyBrXS5zdWZmaXhlcy5hZGQoZGF0YSk7XG4gICAgICAgICAgaWYgKCFsYXRlci5jaGFpbikgYnJlYWs7XG4gICAgICAgICAgLy8gSWYgdGhlcmUncyBhbm90aGVyIHdvcmQgdG8gY2hhaW4gdG8sIHRoZW4gY29udGludWVcbiAgICAgICAgICBzdHIgKz0gbGF0ZXIuY2hhaW47XG4gICAgICAgICAgbGF0ZXIgPSB3b3Jkc1tpICsgKCsrbGVuKV07XG4gICAgICAgICAgc3RyICs9IGxhdGVyLnN0cjtcbiAgICAgICAgICBzYXZpbmcgKz0gbGF0ZXIuYnl0ZXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTb3J0IHRoZSBzdWZmaXhlcyB0byBmaW5kIHRoZSBtb3N0IGltcGFjdGZ1bFxuICAgIGNvbnN0IGludmFsaWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBhYmJyOiBBYmJyZXZpYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IG9yZGVyID0gKHtzYXZpbmc6IGF9OiBTdWZmaXgsIHtzYXZpbmc6IGJ9OiBTdWZmaXgpID0+IGIgLSBhO1xuICAgIGNvbnN0IHNvcnRlZCA9IFsuLi5zdWZmaXhlcy52YWx1ZXMoKV0uc29ydChvcmRlcik7XG4gICAgbGV0IHRhYmxlTGVuZ3RoID0gMDtcbiAgICB3aGlsZSAoc29ydGVkLmxlbmd0aCAmJiB0YWJsZUxlbmd0aCA8IE1BWF9UQUJMRV9MRU5HVEgpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzb3J0IG9yZGVyIGhhcyBiZWVuIGludmFsaWRhdGVkIGFuZCByZXNvcnRcbiAgICAgIGlmIChpbnZhbGlkLmhhcyhzb3J0ZWRbMF0uc3RyKSkge1xuICAgICAgICBzb3J0ZWQuc29ydChvcmRlcik7XG4gICAgICAgIGludmFsaWQuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHtzdHIsIHNhdmluZywgbWlzc2luZywgd29yZHM6IHdzLCBjaGFpbnN9ID0gc29ydGVkLnNoaWZ0KCkhO1xuICAgICAgLy8gZmlndXJlIG91dCBpZiBpdCdzIHdvcnRoIGFkZGluZy4uLlxuICAgICAgaWYgKHNhdmluZyA8PSAwKSBicmVhaztcbiAgICAgIC8vIG1ha2UgdGhlIGFiYnJldmlhdGlvblxuICAgICAgdGFibGVMZW5ndGggKz0gc3RyLmxlbmd0aCArIDM7XG4gICAgICBjb25zdCBsID0gYWJici5sZW5ndGg7XG4gICAgICBjb25zdCBtaWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGNvbnN0IHcgb2Ygd3MpIHtcbiAgICAgICAgY29uc3Qgd29yZCA9IHdvcmRzW3ddO1xuICAgICAgICBmb3IgKGNvbnN0IG1pZCBvZiBbd29yZC5taWQsIC4uLihhbGlhcy5nZXQod29yZC5taWQpIHx8IFtdKV0pIHtcbiAgICAgICAgICBtaWRzLmFkZChtaWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhYmJyLnB1c2goe1xuICAgICAgICBieXRlczogbCA8IDB4ODAgPyBbbCArIDB4ODBdIDogWzUsIGwgLSAweDgwXSxcbiAgICAgICAgbWlkcyxcbiAgICAgICAgLy8gbWVzc2FnZXM6IG5ldyBTZXQoWy4uLndzXS5tYXAodyA9PiB3b3Jkc1t3XS5taWQpKSxcbiAgICAgICAgc3RyLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEJsYXN0IHJhZGl1czogYWxsIG90aGVyIHN1ZmZpeGVzIHJlbGF0ZWQgdG8gYWxsIHRvdWNoZWQgd29yZHMgc2F2ZSBsZXNzXG4gICAgICBmb3IgKGNvbnN0IGkgb2Ygd3MpIHtcbiAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPD0gY2hhaW5zOyBrKyspIHtcbiAgICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbaSArIGtdO1xuICAgICAgICAgIGNvbnN0IHVzZWQgPSB3b3JkLmJ5dGVzIC0gKCFrID8gbWlzc2luZyA6IDApO1xuICAgICAgICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIHdvcmQuc3VmZml4ZXMpIHtcbiAgICAgICAgICAgIHN1ZmZpeC5zYXZpbmcgLT0gKHVzZWQgLSB3b3JkLnVzZWQpO1xuICAgICAgICAgICAgaW52YWxpZC5hZGQoc3VmZml4LnN0cik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdvcmQudXNlZCA9IHVzZWQ7IC8vIHR5cGljYWxseSBpbmNyZWFzZXMuLi5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIHRha2VzIHVzIG92ZXIgMHg4MCB0aGVuIGFsbCBzdWZmaXhlcyBnZXQgdXMgb25lIGxlc3MgYnl0ZSBvZiBzYXZpbmdzIHBlciB1c2VcbiAgICAgIGlmIChhYmJyLmxlbmd0aCA9PT0gMHg4MCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRhdGEgb2Ygc3VmZml4ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgICBkYXRhLnNhdmluZyAtPSBkYXRhLndvcmRzLnNpemU7XG4gICAgICAgIH1cbiAgICAgICAgc29ydGVkLnNvcnQob3JkZXIpO1xuICAgICAgICBpbnZhbGlkLmNsZWFyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhYmJyO1xuICB9XG5cbiAgYXN5bmMgd3JpdGUod3JpdGVyOiBXcml0ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1c2VzID0gdGhpcy51c2VzKCk7XG4gICAgY29uc3QgdGFibGUgPSB0aGlzLmJ1aWxkQWJicmV2aWF0aW9uVGFibGUodXNlcyk7XG4gICAgLy8gcGxhbjogYW5hbHl6ZSBhbGwgdGhlIG1zZXNhZ2VzLCBmaW5kaW5nIGNvbW1vbiBzdWZmaXhlcy5cbiAgICAvLyBlbGlnaWJsZSBzdWZmaXhlcyBtdXN0IGJlIGZvbGxvd2VkIGJ5IGVpdGhlciBzcGFjZSwgcHVuY3R1YXRpb24sIG9yIGVvbFxuICAgIC8vIHRvZG8gLSByZWZvcm1hdC9mbG93IG1lc3NhZ2VzIGJhc2VkIG9uIGN1cnJlbnQgc3Vic3RpdHV0aW9uIGxlbmd0aHNcblxuICAgIC8vIGJ1aWxkIHVwIGEgc3VmZml4IHRyaWUgYmFzZWQgb24gdGhlIGFiYnJldmlhdGlvbnMuXG4gICAgLy8gY29uc3QgdHJpZSA9IG5ldyBTdWZmaXhUcmllPG51bWJlcltdPigpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0YWJsZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIC8vICAgdHJpZS5zZXQodGFibGVbaV0uc3RyLCBpIDwgMHg4MCA/IFtpICsgMHg4MF0gOiBbNSwgaSAtIDB4ODBdKTtcbiAgICAvLyB9XG5cbiAgICAvLyB3cml0ZSB0aGUgYWJicmV2aWF0aW9uIHRhYmxlcyAoYWxsLCByZXdyaXRpbmcgaGFyZGNvZGVkIGNvZGVyZWZzKVxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvZGVyZWYobG9jOiBudW1iZXIsIGFkZHI6IG51bWJlcikge1xuICAgICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgbG9jLCBhZGRyIC0gMHgyMDAwMCk7XG4gICAgICAvLyBzZWNvbmQgcmVmIGlzIGFsd2F5cyA1IGJ5dGVzIGxhdGVyXG4gICAgICB3cml0ZUxpdHRsZUVuZGlhbih3cml0ZXIucm9tLCBsb2MgKyA1LCBhZGRyICsgMSAtIDB4MjAwMDApO1xuICAgIH1cblxuICAgIC8vIHN0YXJ0IGF0IDI4OGE1LCBnbyB0byAyOTQwMFxuICAgIGxldCBhID0gMHgyODhhNTtcbiAgICBsZXQgZCA9IGEgKyAyICogKHRhYmxlLmxlbmd0aCArIHRoaXMucm9tLml0ZW1zLmxlbmd0aCArIHRoaXMuZXh0cmFXb3Jkc1s2XS5jb3VudCk7XG4gICAgdXBkYXRlQ29kZXJlZigweDI4NzA0LCBhKTtcbiAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdGFibGUubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChpID09PSAweDgwKSB1cGRhdGVDb2RlcmVmKDB4Mjg2OGEsIGEpO1xuICAgICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgYSwgZCk7XG4gICAgICBhICs9IDI7XG4gICAgICB3cml0ZVN0cmluZyh3cml0ZXIucm9tLCBkLCB0YWJsZVtpXS5zdHIpO1xuICAgICAgZCArPSB0YWJsZVtpXS5zdHIubGVuZ3RoO1xuICAgICAgd3JpdGVyLnJvbVtkKytdID0gMDtcbiAgICB9XG4gICAgaWYgKHRhYmxlLmxlbmd0aCA8IDB4ODApIHVwZGF0ZUNvZGVyZWYoMHgyODY4YSwgYSk7XG4gICAgLy8gbW92ZSBvbiB0byBwZW9wbGVcbiAgICB1cGRhdGVDb2RlcmVmKDB4Mjg2ZDUsIGEpO1xuICAgIGNvbnN0IG5hbWVzID0gdGhpcy5leHRyYVdvcmRzWzZdO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcykge1xuICAgICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgYSwgZCk7XG4gICAgICBhICs9IDI7XG4gICAgICB3cml0ZVN0cmluZyh3cml0ZXIucm9tLCBkLCBuYW1lKTtcbiAgICAgIGQgKz0gbmFtZS5sZW5ndGg7XG4gICAgICB3cml0ZXIucm9tW2QrK10gPSAwO1xuICAgIH1cbiAgICAvLyBmaW5hbGx5IHVwZGF0ZSBpdGVtIG5hbWVzXG4gICAgdXBkYXRlQ29kZXJlZigweDI4NmU5LCBhKTtcbiAgICB1cGRhdGVDb2RlcmVmKDB4Mjg3ODksIGEpO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgYSwgZCk7XG4gICAgICBhICs9IDI7XG4gICAgICB3cml0ZVN0cmluZyh3cml0ZXIucm9tLCBkLCBpdGVtLm1lc3NhZ2VOYW1lKTtcbiAgICAgIGQgKz0gaXRlbS5tZXNzYWdlTmFtZS5sZW5ndGg7XG4gICAgICB3cml0ZXIucm9tW2QrK10gPSAwO1xuICAgIH1cblxuICAgIC8vIGdyb3VwIGFiYnJldmlhdGlvbnMgYnkgbWVzc2FnZSBhbmQgc29ydCBieSBsZW5ndGguXG4gICAgY29uc3QgYWJicnMgPSBuZXcgTWFwPHN0cmluZywgQWJicmV2aWF0aW9uW10+KCk7IC8vIGJ5IG1pZFxuICAgIGZvciAoY29uc3QgYWJiciBvZiB0YWJsZSkge1xuICAgICAgZm9yIChjb25zdCBtaWQgb2YgYWJici5taWRzKSB7XG4gICAgICAgIGxldCBhYmJyTGlzdCA9IGFiYnJzLmdldChtaWQpO1xuICAgICAgICBpZiAoIWFiYnJMaXN0KSBhYmJycy5zZXQobWlkLCAoYWJickxpc3QgPSBbXSkpO1xuICAgICAgICBhYmJyTGlzdC5wdXNoKGFiYnIpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGFiYnJMaXN0IG9mIGFiYnJzLnZhbHVlcygpKSB7XG4gICAgICBhYmJyTGlzdC5zb3J0KCh7c3RyOiB7bGVuZ3RoOiB4fX06IEFiYnJldmlhdGlvbiwge3N0cjoge2xlbmd0aDogeX19OiBBYmJyZXZpYXRpb24pID0+IHkgLSB4KTtcbiAgICB9XG5cbiAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIG1lc3NhZ2VzIGFuZCBzZXJpYWxpemUuXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8bnVtYmVyPltdW10gPSBzZXEodGhpcy5wYXJ0cy5sZW5ndGgsICgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgdGhpcy5tZXNzYWdlcyh1c2VzKSkge1xuICAgICAgbGV0IHRleHQgPSBtLnRleHQ7XG4gICAgICAvLyBGaXJzdCByZXBsYWNlIGFueSBpdGVtcyBvciBvdGhlciBuYW1lcyB3aXRoIHRoZWlyIGJ5dGVzLlxuICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFtcXFt7XSkoW15cXF19XSopW1xcXX1dKC58JCkvZywgKGZ1bGwsIGJyYWNrZXQsIGluc2lkZSwgYWZ0ZXIpID0+IHtcbiAgICAgICAgaWYgKGFmdGVyICYmICFQVU5DVFVBVElPTlthZnRlcl0pIHJldHVybiBmdWxsO1xuICAgICAgICBpZiAoYWZ0ZXIgPT09ICcgJykgYWZ0ZXIgPSAnJztcbiAgICAgICAgaWYgKGJyYWNrZXQgPT09ICdbJyAmJiBpbnNpZGUgPT09ICc6SVRFTTonKSB7XG4gICAgICAgICAgcmV0dXJuIGBbOF0ke2FmdGVyfWA7XG4gICAgICAgIH0gZWxzZSBpZiAoYnJhY2tldCA9PT0gJ3snICYmIGluc2lkZSA9PT0gJzpIRVJPOicpIHtcbiAgICAgICAgICByZXR1cm4gYFs0XSR7YWZ0ZXJ9YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBmaW5kIHRoZSBudW1iZXIgYmVmb3JlIHRoZSBjb2xvbi5cbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihbMC05YS1mXSspOi8uZXhlYyhpbnNpZGUpO1xuICAgICAgICBpZiAoIW1hdGNoKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBtZXNzYWdlIHRleHQ6ICR7ZnVsbH1gKTtcbiAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQobWF0Y2hbMV0sIDE2KTtcbiAgICAgICAgcmV0dXJuIGBbJHticmFja2V0ID09PSAneycgPyA2IDogN31dWyR7aWR9XSR7YWZ0ZXJ9YDtcbiAgICAgIH0pO1xuICAgICAgLy8gTm93IHN0YXJ0IHdpdGggdGhlIGxvbmdlc3QgYWJicmV2aWF0aW9uIGFuZCB3b3JrIG91ciB3YXkgZG93bi5cbiAgICAgIGZvciAoY29uc3Qge3N0ciwgYnl0ZXN9IG9mIGFiYnJzLmdldChtLm1pZCgpKSB8fCBbXSkge1xuICAgICAgICAvLyBOT1RFOiB0d28gc3BhY2VzIGluIGEgcm93IGFmdGVyIGFuIGV4cGFuc2lvbiBtdXN0IGJlIHByZXNlcnZlZCBhcy1pcy5cbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShuZXcgUmVnRXhwKHN0ciArICcoIFsgJjAtOV18LnwkKScsICdnJyksIChmdWxsLCBhZnRlcikgPT4ge1xuICAgICAgICAgIGlmIChhZnRlciAmJiAhUFVOQ1RVQVRJT05bYWZ0ZXJdKSByZXR1cm4gZnVsbDtcbiAgICAgICAgICBpZiAoYWZ0ZXIgPT09ICcgJykgYWZ0ZXIgPSAnJztcbiAgICAgICAgICByZXR1cm4gYnl0ZXMubWFwKGIgPT4gYFske2J9XWApLmpvaW4oJycpICsgYWZ0ZXI7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBidWlsZCB0aGUgZW5jb2RlZCB2ZXJzaW9uXG4gICAgICBjb25zdCBoZXhQYXJ0cyA9IFsnWzAxXSddO1xuICAgICAgY29uc3QgYnMgPSBbXTtcbiAgICAgIGJzLnB1c2goMSk7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdGV4dC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBjID0gdGV4dFtpXTtcbiAgICAgICAgaWYgKGMgPT09IE1lc3NhZ2VzLkNPTlRJTlVFRCkge1xuICAgICAgICAgIGJzLnB1c2goMywgMSk7XG4gICAgICAgICAgaGV4UGFydHMucHVzaCgnWzAzXVswMV0nKTtcbiAgICAgICAgICBpZiAodGV4dFtpICsgMV0gPT09ICdcXG4nKSBpKys7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgICAgICBicy5wdXNoKDIpO1xuICAgICAgICAgIGlmICh0ZXh0W2kgKyAxXSA9PT0gJyAnKSBpKys7XG4gICAgICAgICAgaGV4UGFydHMucHVzaCgnWzAyXScpO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdbJykge1xuICAgICAgICAgIGNvbnN0IGogPSB0ZXh0LmluZGV4T2YoJ10nLCBpKTtcbiAgICAgICAgICBpZiAoaiA8PSAwKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXh0OiAke3RleHR9YCk7XG4gICAgICAgICAgY29uc3QgYiA9IE51bWJlcih0ZXh0LnN1YnN0cmluZyhpICsgMSwgaikpO1xuICAgICAgICAgIGlmIChpc05hTihiKSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGV4dDogJHt0ZXh0fWApO1xuICAgICAgICAgIGJzLnB1c2goYik7XG4gICAgICAgICAgaGV4UGFydHMucHVzaChgWyR7aGV4KGIpfV1gKTtcbiAgICAgICAgICBpID0gajtcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnICcgJiYgdGV4dFtpICsgMV0gPT09ICcgJykge1xuICAgICAgICAgIGxldCBqID0gaSArIDI7XG4gICAgICAgICAgd2hpbGUgKHRleHRbal0gPT09ICcgJykgaisrO1xuICAgICAgICAgIGJzLnB1c2goOSwgaiAtIGkpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goYFswOV1bJHtoZXgoaiAtIGkpfV1gKTtcbiAgICAgICAgICBpID0gaiAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnMucHVzaChjLmNoYXJDb2RlQXQoMCkpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJzLnB1c2goMCk7XG4gICAgICBoZXhQYXJ0cy5wdXNoKCdbMF0nKTtcbiAgICAgIG0uYnl0ZXMgPSBicztcbiAgICAgIG0uaGV4ID0gaGV4UGFydHMuam9pbignJyk7XG5cbiAgICAgIC8vIEZpZ3VyZSBvdXQgd2hpY2ggcGFnZSBpdCBuZWVkcyB0byBiZSBvblxuICAgICAgY29uc3QgYmFuayA9IHRoaXMuYmFua3NbbS5wYXJ0XSA8PCAxMztcbiAgICAgIGNvbnN0IG9mZnNldCA9IGJhbmsgLSAweGEwMDA7XG4gICAgICBcbiAgICAgIHByb21pc2VzW20ucGFydF1bbS5pZF0gPVxuICAgICAgICAgIHdyaXRlci53cml0ZShicywgYmFuaywgYmFuayArIDB4MjAwMCwgYE1lc3NhZ2UgJHttLm1pZCgpfWApXG4gICAgICAgICAgICAgIC50aGVuKGEgPT4gYSAtIG9mZnNldCk7XG4gICAgfVxuXG4gICAgY29uc3QgYWRkcmVzc2VzID0gYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMubWFwKHBzID0+IFByb21pc2UuYWxsKHBzKSkpIGFzIG51bWJlcltdW107XG4gICAgY29uc3QgcGFydHM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgIGxldCBwb3MgPSAweDI4MDAwO1xuICAgIGZvciAobGV0IHBhcnQgPSAwOyBwYXJ0IDwgYWRkcmVzc2VzLmxlbmd0aDsgcGFydCsrKSB7XG4gICAgICBjb25zdCBieXRlczogbnVtYmVyW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWRkcmVzc2VzW3BhcnRdLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHdyaXRlTGl0dGxlRW5kaWFuKGJ5dGVzLCAyICogaSwgYWRkcmVzc2VzW3BhcnRdW2ldKTtcbiAgICAgIH1cbiAgICAgIC8vIFRPRE8gLSB3b3VsZCBiZSBuaWNlIHRvIGxldCB0aGUgd3JpdGVyIHBpY2sgd2hlcmUgdG8gcHV0IHRoZSBwYXJ0cywgYnV0XG4gICAgICAvLyB0aGVuIHdlIGRvbid0IGtub3cgaG93IG1hbnkgdG8gcmVhZCBmcm9tIGVhY2guICBTbyBkbyBpdCBzZXF1ZW50aWFsbHkuXG4gICAgICAvLyBwYXJ0cy5wdXNoKHdyaXRlci53cml0ZShieXRlcywgMHgyODAwMCwgMHgyYTAwMCwgYE1lc3NhZ2VQYXJ0ICR7aGV4KHBhcnQpfWApXG4gICAgICAvLyAgICAgICAgICAgIC50aGVuKGEgPT4gd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgMHgyODQyMiArIDIgKiBwYXJ0LFxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgLSAweDIwMDAwKSkpO1xuICAgICAgd3JpdGVyLnJvbS5zdWJhcnJheShwb3MsIHBvcyArIGJ5dGVzLmxlbmd0aCkuc2V0KGJ5dGVzKVxuICAgICAgd3JpdGVMaXR0bGVFbmRpYW4od3JpdGVyLnJvbSwgMHgyODQyMiArIDIgKiBwYXJ0LCBwb3MgLSAweDIwMDAwKTtcbiAgICAgIHBvcyArPSBieXRlcy5sZW5ndGg7XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgdGhlIGJhbmtzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJhbmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB3cml0ZXIucm9tWzB4MjgzZmUgKyBpXSA9IHRoaXMuYmFua3NbaV07XG4gICAgfVxuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocGFydHMpO1xuICB9XG59XG5cbmludGVyZmFjZSBBYmJyZXZpYXRpb24ge1xuICAvLyBCeXRlcyB0byBhYmJyZXZpYXRlIHRvLlxuICBieXRlczogbnVtYmVyW107XG4gIC8vIE1JRHMgb2YgdGhlIG1lc3NhZ2VzIHRvIGFiYnJldmlhdGUuXG4gIG1pZHM6IFNldDxzdHJpbmc+O1xuICAvLyBFeHBhbmRlZCB0ZXh0LlxuICBzdHI6IHN0cmluZztcbn1cblxuLy8gTWF4IGxlbmd0aCBmb3Igd29yZHMgdGFibGUuICBWYW5pbGxhIGFsbG9jYXRlcyA5MzIgYnl0ZXMsIGJ1dCB0aGVyZSdzXG4vLyBhbiBleHRyYSA0NDggYXZhaWxhYmxlIGltbWVkaWF0ZWx5IGJlbmVhdGguICBGb3Igbm93IHdlJ2xsIHBpY2sgYSByb3VuZFxuLy8gbnVtYmVyOiAxMjAwLlxuY29uc3QgTUFYX1RBQkxFX0xFTkdUSCA9IDEyNTA7XG5cbi8vIGNvbnN0IFBVTkNUVUFUSU9OX1JFR0VYID0gL1tcXDAgIVxcXFwsLjo7P18tXS9nO1xuLy8gY29uc3QgT1BFTkVSUzoge1tjbG9zZTogc3RyaW5nXTogc3RyaW5nfSA9IHsnfSc6ICd7JywgJ10nOiAnWyd9O1xuY29uc3QgQ0xPU0VSUzoge1tvcGVuOiBzdHJpbmddOiBzdHJpbmd9ID0geyd7JzogJ30nLCAnWyc6ICddJ307XG5cbi8vIE1lc3NhZ2UgTUlEcyB0aGF0IGFyZSBoYXJkY29kZWQgaW4gdmFyaW91cyBwbGFjZXMuXG5leHBvcnQgY29uc3QgSEFSRENPREVEX01FU1NBR0VTOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoW1xuICAvLyAnMDA6MDAnLCAvLyBpbXBvc3NpYmxlIHRvIGlkZW50aWZ5IHVzZXNcbiAgJzIwOjFkJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDEsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmU4XG4gICcxYjowZicsIC8vIGVuZGdhbWUgbWVzc2FnZSAyLCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlYVxuICAnMWI6MTAnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgMywgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZWNcbiAgJzFiOjExJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDQsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmVlXG4gICcxYjoxMicsIC8vIGVuZGdhbWUgbWVzc2FnZSA1LCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZmMFxuICAnMWI6MDUnLCAvLyBhenRlY2EgZGlhbG9nIGFmdGVyIGRyYXlnb24yLCBleGVjIDM3YjI4XG4gICcxYjowNicsIC8vIGF6dGVjYSBkaWFsb2cgYWZ0ZXIgZHJheWdvbjIsIGV4ZWMgMzdiMjhcbiAgJzFiOjA3JywgLy8gYXp0ZWNhIGRpYWxvZyBhZnRlciBkcmF5Z29uMiwgZXhlYyAzN2IyOFxuICAnMWY6MDAnLCAvLyB6enogcGFyYWx5c2lzIGRpYWxvZywgZXhlYyAzZDBmM1xuICAnMTM6MDAnLCAvLyBrZW5zdSBzd2FuIGFza3MgZm9yIGxvdmUgcGVuZGFudCwgZXhlYyAzZDFjYVxuICAnMGI6MDEnLCAvLyBhc2luYSByZXZlYWwsIGV4ZWMgM2QxZWJcbiAgJzIwOjBjJywgLy8gaXRlbWdldCBtZXNzYWdlICd5b3Ugbm93IGhhdmUnLCBleGVjIDNkNDNjXG4gICcyMDowZicsIC8vIHRvbyBtYW55IGl0ZW1zLCBleGVjIDNkNDhhXG4gICcxYzoxMScsIC8vIHN3b3JkIG9mIHRodW5kZXIgcHJlLXdhcnAgbWVzc2FnZSwgZXhlYyAxYzoxMVxuICAnMGU6MDUnLCAvLyBtZXNpYSByZWNvcmRpbmcsIGV4ZWMgM2Q2MjFcbiAgJzE2OjAwJywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5Y1xuICAnMTY6MDInLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljIChsb29wKVxuICAnMTY6MDQnLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljIChsb29wKVxuICAnMTY6MDYnLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljIChsb29wKVxuICAnMjA6MTEnLCAvLyBlbXB0eSBzaG9wLCBleGVjIDNkOWM0XG4gICcyMTowMCcsIC8vIHdhcnAgbWVudSwgZXhlYyAzZGI2MFxuICAnMjE6MDInLCAvLyB0ZWxlcGF0aHkgbWVudSwgZXhlYyAzZGQ2ZVxuICAnMjE6MDEnLCAvLyBjaGFuZ2UgbWVudSwgZXhlYyAzZGVjYlxuICAnMDY6MDAnLCAvLyAoc3QpIGtlbGJlc3F1ZSAxIG1vbm9sb2d1ZSwgZXhlYyAxZTk5ZlxuICAnMTg6MDAnLCAvLyAoc3QpIGtlbGJlc3F1ZSAyIG1vbm9sb2d1ZSwgZXhlYyAxZTk5ZlxuICAnMTg6MDInLCAvLyAoc3QpIHNhYmVyYSAyIG1vbm9sb2d1ZSwgZXhlYyAxZWNlNlxuICAnMTg6MDQnLCAvLyAoc3QpIG1hZG8gMiBtb25vbG9ndWUsIGV4ZWMgMWVlMjZcbiAgJzE4OjA4JywgLy8gKHN0KSBrYXJtaW5lIG1vbm9sb2d1ZSwgZXhlYyAxZWY4YVxuICAnMWI6MDMnLCAvLyAoc3QpIHN0YXR1ZXMgbW9ub2xvZ3VlLCBleGVjIDFmMGU1XG4gICcxYjowMCcsIC8vIChzdCkgZHJheWdvbiAxIG1vbm9sb2d1ZSwgZXhlYyAxZjE5M1xuICAnMWI6MDAnLCAvLyAoc3QpIGRyYXlnb24gMSBtb25vbG9ndWUsIGV4ZWMgMWYxOTNcbiAgJzFiOjA0JywgLy8gKHN0KSBkcmF5Z29uIDIgbW9ub2xvZ3VlLCBleGVjIDFmMTkzXG4gICcwNjowMScsIC8vIChzdCkga2VsYmVzcXVlIDEgZXNjYXBlcywgZXhlYyAxZmFlNywgdGFibGUgMWZiMWJiXG4gICcxMDoxMycsIC8vIChzdCkgc2FiZXJhIDEgZXNjYXBlcywgZXhlYyAxZmFlNywgdGFibGUgMWZiMWZcbiAgJzE5OjA1JywgLy8gKHN0KSBtYWRvIDEgZXNjYXBlcywgZXhlYyAxZmFlNywgdGFibGUgMWZiMjVcbiAgJzIwOjE0JywgLy8gKHN0KSBrZWxiZXNxdWUgMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdjYlxuICAnMjA6MTUnLCAvLyAoc3QpIHNhYmVyYSAxIGxlZnQgY2hlc3QsIGV4ZWMgMWY3YTMsIHRhYmxlIDFmN2Q1XG4gICcyMDoxNycsIC8vIChzdCkgbWFkbyAxIGxlZnQgY2hlc3QsIGV4ZWMgMWY3YTMsIHRhYmxlIDFmN2RhXG4gICcyMDowMicsIC8vIChzdCkgY3VyZSBzdGF0dXMgYWlsbWVudCwgZXhlYyAyN2I5MFxuICAnMjA6MGQnLCAvLyAoc3QpIGxldmVsIHVwLCBleGVjIDM1MWUyXG4gICcyMDoxOScsIC8vIChzdCkgcG9pc29uZWQsIGV4ZWMgMzUyYWFcbiAgJzIwOjFhJywgLy8gKHN0KSBwYXJhbHl6ZWQsIGV4ZWMgMzUyZGZcbiAgJzIwOjFiJywgLy8gKHN0KSBzdG9uZWQsIGV4ZWMgMzUzMTdcbiAgJzAzOjAxJywgLy8gKHN0KSBsZWFybiB0ZWxlcGF0aHksIGV4ZWMgMzUyY2NcbiAgJzAzOjAyJywgLy8gKHN0KSBmYWlsIHRvIGxlYXJuIHRlbGVwYXRoeSwgZXhlYyAzNTJlOFxuICAnMTA6MTAnLCAvLyAoc3QpIGZha2UgbWVzaWEgbWVzc2FnZSAxLCBleGVjIDM2NWIxXG4gICcxMDoxMScsIC8vIChzdCkgZmFrZSBtZXNpYSBtZXNzYWdlIDIsIGV4ZWMgMzY1YjFcbiAgJzEwOjEyJywgLy8gKHN0KSBmYWtlIG1lc2lhIG1lc3NhZ2UgMywgZXhlYyAzNjViMVxuICAnMGM6MDQnLCAvLyAoc3QpIGRpc21vdW50IGRvbHBoaW4gKG5vdCBpbnNpZGUgRVNJIGNhdmUpLCBleGVjIDM2NjA5XG4gICcwYzowNScsIC8vIChzdCkgZGlzbW91bnQgZG9scGhpbiAoZXZlcnl3aGVyZSBpbiBuZWFyIEVTSSksIGV4ZWMgMzY2MDlcbiAgJzAzOjAzJywgLy8gKHN0KSBzdGFydCBzdG9tIGZpZ2h0LCBleGVjIDM2NzE2XG4gICcyMDowZScsIC8vIChzdCkgaW5zdWZmaWNpZW50IG1hZ2ljIGZvciBzcGVsbCwgZXhlYyAzY2MyM1xuICAnMjA6MTMnLCAvLyAoc3QpIG5vdGhpbmcgaGFwcGVucyBpdGVtIHVzZSBvZXJyLCBleGVjIDNkNTJhXG5dKTtcbiJdfQ==