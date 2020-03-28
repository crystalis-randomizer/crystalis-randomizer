import { Address, Segment, hex, readString, seq, free, tuple } from './util.js';
const { $14, $15, $16_a, $17 } = Segment;
const DELIMITERS = new Map([[6, '{}'], [7, '[]']]);
class Message {
    constructor(messages, part, id, offset, words) {
        this.messages = messages;
        this.part = part;
        this.id = id;
        this.bytes = [];
        this.hex = '';
        const prg = messages.rom.prg;
        const parts = [];
        for (let i = offset; offset && prg[i]; i++) {
            const b = prg[i];
            this.bytes.push(b);
            if (b === 1) {
                if (i !== offset && prg[i - 1] !== 3) {
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
                this.bytes.push(next);
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
                parts.push(words(next, b));
                if (delims)
                    parts.push(delims[1]);
                if (!PUNCTUATION[String.fromCharCode(prg[i + 1])]) {
                    parts.push(' ');
                }
            }
            else if (b >= 0x80) {
                parts.push(words(b, 0));
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
    get mid() {
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
const COMMON_WORDS_BASE_PTR = Address.of($14, 0x8704);
const UNCOMMON_WORDS_BASE_PTR = Address.of($14, 0x868a);
const PERSON_NAMES_BASE_PTR = Address.of($14, 0x86d5);
const ITEM_NAMES_BASE_PTR = Address.of($14, 0x86e9);
const ITEM_NAMES_BASE_PTR2 = Address.of($14, 0x8789);
const BANKS_PTR = Address.of($14, 0x8541);
const BANKS_PTR2 = Address.of($14, 0x864c);
const PARTS_PTR = Address.of($14, 0x854c);
const SEGMENTS = {
    0x15: $15,
    0x16: $16_a,
    0x17: $17,
};
export class Messages {
    constructor(rom) {
        this.rom = rom;
        this.partCount = 0x22;
        this.commonWords = [];
        this.uncommonWords = [];
        this.personNames = [];
        this.itemNames = [];
        this.parts = [];
        const commonWordsBase = COMMON_WORDS_BASE_PTR.readAddress(rom.prg);
        const uncommonWordsBase = UNCOMMON_WORDS_BASE_PTR.readAddress(rom.prg);
        const personNamesBase = PERSON_NAMES_BASE_PTR.readAddress(rom.prg);
        const itemNamesBase = ITEM_NAMES_BASE_PTR.readAddress(rom.prg);
        const banksBase = BANKS_PTR.readAddress(rom.prg);
        const partsBase = PARTS_PTR.readAddress(rom.prg);
        const bases = {
            5: uncommonWordsBase,
            6: personNamesBase,
            7: itemNamesBase,
        };
        this.extraWords = {
            5: this.uncommonWords,
            6: this.personNames,
            7: this.itemNames,
        };
        const getWord = (arr, base, index) => {
            let word = arr[index];
            if (word != null)
                return word;
            word = readString(rom.prg, base.plus(2 * index).readAddress(rom.prg).offset);
            return (arr[index] = word);
        };
        const words = (id, group) => {
            if (!group)
                return getWord(this.commonWords, commonWordsBase, id - 0x80);
            return getWord(this.extraWords[group], bases[group], id);
        };
        for (let i = 0; i < 0x49; i++) {
            words(i, 7);
        }
        let lastPart = banksBase.offset;
        this.banks = tuple(rom.prg, lastPart, this.partCount);
        for (let p = this.partCount - 1; p >= 0; p--) {
            const start = partsBase.plus(2 * p).readAddress(rom.prg);
            const len = (lastPart - start.offset) >>> 1;
            lastPart = start.offset;
            const seg = SEGMENTS[this.banks[p]];
            const part = this.parts[p] = [];
            for (let i = 0; i < len; i++) {
                const addr = start.plus(2 * i).readAddress(rom.prg, seg);
                part[i] = new Message(this, p, i, addr.offset, words);
            }
        }
    }
    *messages(used) {
        for (const part of this.parts) {
            if (used) {
                for (const message of part) {
                    if (used.has(message.mid))
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
            const str = typeof message === 'string' ? message : message.mid;
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
            const mid = message.mid;
            const seen = addrs.get(message.text);
            const aliases = seen != null && alias.get(seen);
            if (aliases) {
                aliases.push(mid);
                continue;
            }
            addrs.set(message.text, mid);
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
    compress() {
        const uses = this.uses();
        const table = this.buildAbbreviationTable(uses);
        const abbrs = new Map();
        this.commonWords.splice(0, this.commonWords.length);
        this.uncommonWords.splice(0, this.uncommonWords.length);
        for (const abbr of table) {
            if (abbr.bytes.length === 1) {
                this.commonWords[abbr.bytes[0] & 0x7f] = abbr.str;
            }
            else {
                this.extraWords[abbr.bytes[0]][abbr.bytes[1]] = abbr.str;
            }
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
            for (const { str, bytes } of abbrs.get(m.mid) || []) {
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
        }
    }
    write() {
        const a = this.rom.assembler();
        free(a, $14, 0x8000, 0x8500);
        free(a, $14, 0x8520, 0x8528);
        free(a, $14, 0x8586, 0x8593);
        free(a, $14, 0x8900, 0x9400);
        free(a, $14, 0x9685, 0x9706);
        free(a, $14, 0x9e80, 0xa000);
        free(a, $15, 0xa000, 0xc000);
        free(a, $16_a, 0xa000, 0xc000);
        free(a, $17, 0xa000, 0xbc00);
        function updateCoderef(ptr, base, ...offsets) {
            ptr.loc(a);
            a.word(base);
            let i = 0;
            for (const offset of offsets) {
                ptr.plus(offset).loc(a);
                a.word({ op: '+', args: [base, { op: 'num', num: ++i }] });
            }
        }
        const addresses = seq(this.partCount, () => []);
        for (let partId = 0; partId < this.partCount; partId++) {
            const partAddrs = addresses[partId];
            const part = this.parts[partId];
            const bank = this.banks[partId];
            const segment = SEGMENTS[bank];
            a.segment(segment.name);
            for (const m of part) {
                a.reloc(`Message_${m.mid}`);
                partAddrs.push(a.pc());
                a.byte(...m.bytes, 0);
            }
        }
        const partTables = [];
        a.segment($14.name);
        a.reloc(`MessagesTable`);
        for (let partId = 0; partId < this.partCount; partId++) {
            partTables.push(a.pc());
            a.word(...addresses[partId]);
        }
        const bankTable = a.pc();
        a.byte(...this.banks);
        a.reloc(`MessageParts`);
        const partsTable = a.pc();
        a.word(...partTables);
        updateCoderef(BANKS_PTR, bankTable);
        updateCoderef(BANKS_PTR2, bankTable);
        updateCoderef(PARTS_PTR, partsTable, 5);
        const wordTables = [
            [`CommonWords`, this.commonWords, [COMMON_WORDS_BASE_PTR]],
            [`UncommonWords`, this.uncommonWords, [UNCOMMON_WORDS_BASE_PTR]],
            [`PersonNames`, this.personNames, [PERSON_NAMES_BASE_PTR]],
            [`ItemNames`, this.itemNames, [ITEM_NAMES_BASE_PTR,
                    ITEM_NAMES_BASE_PTR2]],
        ];
        for (const [name, words, ptrs] of wordTables) {
            const addrs = [];
            let i = 0;
            for (const word of words) {
                if (!word) {
                    addrs.push(0);
                    continue;
                }
                a.reloc(`${name}_${hex(i++)}`);
                addrs.push(a.pc());
                a.byte(word, 0);
            }
            a.reloc(name);
            const base = a.pc();
            a.word(...addrs);
            for (const ptr of ptrs) {
                updateCoderef(ptr, base, 5);
            }
        }
        return [a.module()];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxPQUFPLEVBQVEsT0FBTyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQ3ZDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTNDLE1BQU0sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUM7QUEwQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUluRSxNQUFNLE9BQU87SUFPWCxZQUFxQixRQUFrQixFQUNsQixJQUFZLEVBQ1osRUFBVSxFQUNuQixNQUFjLEVBQ2QsS0FBa0I7UUFKVCxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBTi9CLFVBQUssR0FBYSxFQUFFLENBQUM7UUFDckIsUUFBRyxHQUFXLEVBQUUsQ0FBQztRQVVmLE1BQU0sR0FBRyxHQUFpQixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxF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O1NBQ0Y7UUFDRCxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDdEIsQ0FBQzs7QUFyZmUsa0JBQVMsR0FBRyxHQUFHLENBQUM7QUFvZ0JsQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQztBQUk5QixNQUFNLE9BQU8sR0FBNkIsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQztBQUcvRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBZ0IsSUFBSSxHQUFHLENBQUM7SUFFckQsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87Q0FDUixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0V4cHJ9IGZyb20gJy4uL2FzbS9leHByLmpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtNZXNzYWdlSWR9IGZyb20gJy4vbWVzc2FnZWlkLmpzJztcbmltcG9ydCB7QWRkcmVzcywgRGF0YSwgU2VnbWVudCwgaGV4LCByZWFkU3RyaW5nLFxuICAgICAgICBzZXEsIGZyZWUsIHR1cGxlfSBmcm9tICcuL3V0aWwuanMnO1xuXG5jb25zdCB7JDE0LCAkMTUsICQxNl9hLCAkMTd9ID0gU2VnbWVudDtcblxuLy8gaW1wb3J0IHtTdWZmaXhUcmllfSBmcm9tICcuLi91dGlsLmpzJztcblxuLy8gY2xhc3MgRGF0YVRhYmxlPFQ+IGV4dGVuZHMgQXJyYXk8VD4ge1xuXG4vLyAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBiYXNlOiBBZGRyZXNzLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBjb3VudDogbnVtYmVyLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSB3aWR0aDogbnVtYmVyLFxuLy8gICAgICAgICAgICAgICAvLyBUT0RPIC0gd2hhdCB3YXMgdGhpcyBzdXBwb3NlZCB0byBiZT8hP1xuLy8gICAgICAgICAgICAgICBmdW5jOiAoLi4ueDogbnVtYmVyW10pID0+IFQgPVxuLy8gICAgICAgICAgICAgICAgICAgd2lkdGggPiAxID8gKC4uLmkpID0+IGkgYXMgYW55IDogaSA9PiBpIGFzIGFueSkge1xuLy8gICAgIHN1cGVyKGNvdW50KTtcbi8vICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbi8vICAgICAgIHRoaXNbaV0gPSBmdW5jKC4uLnNsaWNlKHJvbS5wcmcsIGJhc2UgKyBpICogd2lkdGgsIHdpZHRoKSk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbi8vIGNsYXNzIEFkZHJlc3NUYWJsZTxUPiBleHRlbmRzIEFycmF5PFQ+IHtcblxuLy8gICByZWFkb25seSBhZGRyZXNzZXM6IG51bWJlcltdO1xuXG4vLyAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBiYXNlOiBBZGRyZXNzLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBjb3VudDogbnVtYmVyLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBzZWdtZW50OiBzdHJpbmcsXG4vLyAgICAgICAgICAgICAgIGZ1bmM6ICh4OiBudW1iZXIsIGk6IG51bWJlciwgYXJyOiBudW1iZXJbXSkgPT4gVCA9IGkgPT4gaSBhcyBhbnkpIHtcbi8vICAgICBzdXBlcihjb3VudCk7XG4vLyAgICAgdGhpcy5hZGRyZXNzZXMgPSBzZXEodGhpcy5jb3VudCxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAoaTogbnVtYmVyKSA9PiB7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gcmVhZExpdHRsZUVuZGlhbihyb20ucHJnLCBiYXNlICsgMiAqIGkpO1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgJiYgYSArIG9mZnNldDtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICBcbi8vICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbi8vICAgICAgIHRoaXNbaV0gPSBmdW5jKHRoaXMuYWRkcmVzc2VzW2ldLCBpLCB0aGlzLmFkZHJlc3Nlcyk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmNvbnN0IERFTElNSVRFUlMgPSBuZXcgTWFwPG51bWJlciwgc3RyaW5nPihbWzYsICd7fSddLCBbNywgJ1tdJ11dKTtcblxudHlwZSBXb3JkRmFjdG9yeSA9IChpZDogbnVtYmVyLCBncm91cDogbnVtYmVyKSA9PiBzdHJpbmc7XG5cbmNsYXNzIE1lc3NhZ2Uge1xuXG4gIC8vIFRoaXMgaXMgcmVkdW5kYW50IC0gdGhlIHRleHQgc2hvdWxkIGJlIHVzZWQgaW5zdGVhZC5cbiAgYnl0ZXM6IG51bWJlcltdID0gW107XG4gIGhleDogc3RyaW5nID0gJyc7IC8vIGZvciBkZWJ1Z2dpbmdcbiAgdGV4dDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1lc3NhZ2VzOiBNZXNzYWdlcyxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgcGFydDogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBpZDogbnVtYmVyLFxuICAgICAgICAgICAgICBvZmZzZXQ6IG51bWJlcixcbiAgICAgICAgICAgICAgd29yZHM6IFdvcmRGYWN0b3J5KSB7XG5cbiAgICAvLyBQYXJzZSB0aGUgbWVzc2FnZVxuICAgIGNvbnN0IHByZzogRGF0YTxudW1iZXI+ID0gbWVzc2FnZXMucm9tLnByZztcbiAgICBjb25zdCBwYXJ0cyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSBvZmZzZXQ7IG9mZnNldCAmJiBwcmdbaV07IGkrKykge1xuICAgICAgY29uc3QgYiA9IHByZ1tpXTtcbiAgICAgIHRoaXMuYnl0ZXMucHVzaChiKTtcbiAgICAgIGlmIChiID09PSAxKSB7XG4gICAgICAgIC8vIE5PVEUgLSB0aGVyZSBpcyBvbmUgY2FzZSB3aGVyZSB0d28gbWVzc2FnZXMgc2VlbSB0byBhYnV0IHdpdGhvdXQgYVxuICAgICAgICAvLyBudWxsIHRlcm1pbmF0b3IgLSAkMmNhOTEgKCQxMjokMDgpIGZhbGxzIHRocm91Z2ggZnJvbSAxMjowNy4gIFdlIGZpeFxuICAgICAgICAvLyB0aGF0IHdpdGggYW4gYWRqdXN0bWVudCBpbiByb20udHMsIGJ1dCB0aGlzIGRldGVjdHMgaXQganVzdCBpbiBjYXNlLlxuICAgICAgICBpZiAoaSAhPT0gb2Zmc2V0ICYmIHByZ1tpIC0gMV0gIT09IDMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgc3RhcnQgbWVzc2FnZSBzaWduYWwgYXQgJHtpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiID09PSAyKSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ1xcbiAnKTtcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gMykge1xuICAgICAgICBwYXJ0cy5wdXNoKGAke01lc3NhZ2VzLkNPTlRJTlVFRH1cXG5gKTsgLy8gYmxhY2sgZG93bi1wb2ludGluZyB0cmlhbmdsZVxuICAgICAgfSBlbHNlIGlmIChiID09PSA0KSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ3s6SEVSTzp9Jyk7XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDgpIHtcbiAgICAgICAgcGFydHMucHVzaCgnWzpJVEVNOl0nKTtcbiAgICAgIH0gZWxzZSBpZiAoYiA+PSA1ICYmIGIgPD0gOSkge1xuICAgICAgICBjb25zdCBuZXh0ID0gcHJnWysraV07XG4gICAgICAgIHRoaXMuYnl0ZXMucHVzaChuZXh0KTtcbiAgICAgICAgaWYgKGIgPT09IDkpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCcgJy5yZXBlYXQobmV4dCkpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRlbGltcyA9IERFTElNSVRFUlMuZ2V0KGIpO1xuICAgICAgICBpZiAoZGVsaW1zKSB7XG4gICAgICAgICAgcGFydHMucHVzaChkZWxpbXNbMF0pO1xuICAgICAgICAgIHBhcnRzLnB1c2gobmV4dC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSk7XG4gICAgICAgICAgcGFydHMucHVzaCgnOicpO1xuICAgICAgICB9XG4gICAgICAgIHBhcnRzLnB1c2god29yZHMobmV4dCwgYikpO1xuICAgICAgICBpZiAoZGVsaW1zKSBwYXJ0cy5wdXNoKGRlbGltc1sxXSk7XG4gICAgICAgIGlmICghUFVOQ1RVQVRJT05bU3RyaW5nLmZyb21DaGFyQ29kZShwcmdbaSArIDFdKV0pIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCcgJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYiA+PSAweDgwKSB7XG4gICAgICAgIHBhcnRzLnB1c2god29yZHMoYiwgMCkpO1xuICAgICAgICBpZiAoIVBVTkNUVUFUSU9OW1N0cmluZy5mcm9tQ2hhckNvZGUocHJnW2kgKyAxXSldKSB7XG4gICAgICAgICAgcGFydHMucHVzaCgnICcpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGIgPj0gMHgyMCkge1xuICAgICAgICBwYXJ0cy5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoYikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb24tZXhoYXVzdGl2ZSBzd2l0Y2g6ICR7Yn0gYXQgJHtpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50ZXh0ID0gcGFydHMuam9pbignJyk7XG4gIH1cblxuICBnZXQgbWlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke2hleCh0aGlzLnBhcnQpfToke2hleCh0aGlzLmlkKX1gO1xuICB9XG5cbiAgLy8gRml4ZXMgdGhlIHRleHQgdG8gZW5zdXJlIGl0IGZpdHMgaW4gdGhlIGRpYWxvZyBib3guXG4gIC8vIENvbnN0cmFpbnRzOlxuICAvLyAgLSBubyBsaW5lIGlzIGxvbmdlciB0aGFuIDI4IGNoYXJhY3RlcnNcbiAgLy8gIC0gZmlyc3QgbGluZSBhZnRlciBhIFxcbiBpcyBpbmRlbnRlZCBvbmUgc3BhY2VcbiAgLy8gIC0gdW5jYXBpdGFsaXplZCAodW5wdW5jdHVhdGVkPykgZmlyc3QgY2hhcmFjdGVycyBhcmUgaW5kZW50ZWQsIHRvb1xuICAvLyAgLSB3cmFwIG9yIHVud3JhcCBhbnkgcGVyc29uIG9yIGl0ZW0gbmFtZXNcbiAgLy8gIC0gYXQgbW9zdCBmb3VyIGxpbmVzIHBlciBtZXNzYWdlIGJveFxuICAvLyBJZiBhbnkgdmlvbGF0aW9ucyBhcmUgZm91bmQsIHRoZSBlbnRpcmUgbWVzc2FnZSBpcyByZWZsb3dlZC5cbiAgZml4VGV4dCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jaGVja1RleHQoKSkgcmV0dXJuO1xuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBsaW5lTnVtID0gMDtcbiAgICBsZXQgbGluZUxlbiA9IDA7XG4gICAgbGV0IHNwYWNlID0gZmFsc2U7XG4gICAgLy8gVE9ETyAtIGNoYW5nZSB3b3JkIGludG8gc29tZXRoaW5nIGZhbmNpZXIgLSBhbiBhcnJheSBvZlxuICAgIC8vIChzdHIsIGxlbiwgZmFsbGJhY2spIHNvIHRoYXQgcHVuY3R1YXRpb24gYWZ0ZXIgYW5cbiAgICAvLyBleHBhbnNpb24gZG9lc24ndCBzY3JldyB1cyB1cC5cbiAgICAvLyBPUi4uLiBqdXN0IGluc2VydCB0aGUgZmFsbGJhY2sgZXZlcnkgdGltZSBhbmQgaW5zdGVhZCBtZW1vaXplXG4gICAgLy8gdGhlIGV4cGFuc2lvbiB0byByZXBsYWNlIGF0IHRoZSBlbmQgaWYgdGhlcmUncyBubyBicmVhay5cbiAgICBsZXQgd29yZDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBleHBhbnNpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBmdW5jdGlvbiBpbnNlcnQoc3RyOiBzdHJpbmcsIGxlbjogbnVtYmVyID0gc3RyLmxlbmd0aCkge1xuICAgICAgLy8gVE9ETyAtIHdoYXQgZG8gd2UgZG8gd2l0aCBleGlzdGluZyBwYWdlIGJyZWFrcz9cbiAgICAgIC8vICAgICAgLSBpZiB3ZSBldmVyIG5lZWQgdG8gX21vdmVfIG9uZSB0aGVuIHdlIHNob3VsZCBJR05PUkUgaXQ/XG4gICAgICAvLyAgICAgIC0gc2FtZSB3aXRoIG5ld2xpbmVzLi4uXG4gICAgICAvLyBpZiAoc3RyID09PSAnIycpIHtcbiAgICAgIC8vICAgbmV3bGluZSgpO1xuICAgICAgLy8gICByZXR1cm47XG4gICAgICAvLyB9XG4gICAgICBpZiAobGluZUxlbiArIGxlbiA+IDI5KSBuZXdsaW5lKCk7XG4gICAgICBpZiAoc3RyID09PSAnICcpIHtcbiAgICAgICAgcGFydHMucHVzaCguLi53b3JkLCAnICcpO1xuICAgICAgICB3b3JkID0gW107XG4gICAgICB9IGVsc2UgaWYgKC9eW1t7XTovLnRlc3Qoc3RyKSkge1xuICAgICAgICB3b3JkLnB1c2goe3RvU3RyaW5nOiAoKSA9PiBzdHIsIGxlbmd0aDogbGVufSBhcyBhbnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd29yZC5wdXNoKHN0cik7XG4gICAgICB9XG4gICAgICBsaW5lTGVuICs9IGxlbjtcbiAgICAgIHNwYWNlID0gc3RyLmVuZHNXaXRoKCcgJyk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluc2VydFNwYWNlKCkge1xuICAgICAgaWYgKCFzcGFjZSkgaW5zZXJ0KCcgJyk7XG4gICAgICBzcGFjZSA9IHRydWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluc2VydEFsbChzdHI6IHN0cmluZykge1xuICAgICAgY29uc3Qgc3BsaXQgPSBzdHIuc3BsaXQoL1xccysvKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGkpIGluc2VydFNwYWNlKCk7XG4gICAgICAgIGluc2VydChzcGxpdFtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIG5ld2xpbmUoKSB7XG4gICAgICBsaW5lTGVuID0gMSArIHdvcmQucmVkdWNlKChhLCBiKSA9PiBhICsgYi5sZW5ndGgsIDApO1xuICAgICAgaWYgKCsrbGluZU51bSA+IDMpIHtcbiAgICAgICAgcGFydHMucHVzaCgnI1xcbiAnKTtcbiAgICAgICAgbGluZU51bSA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJ0cy5wdXNoKCdcXG4gJyk7XG4gICAgICB9XG4gICAgICBzcGFjZSA9IHRydWU7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy50ZXh0W2ldO1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudGV4dFtpICsgMV07XG4gICAgICBpZiAoL1tcXHNcXG4jXS8udGVzdChjKSkge1xuICAgICAgICBpbnNlcnRTcGFjZSgpO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAneycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICc6Jykge1xuICAgICAgICAgIGluc2VydCgnezpIRVJPOn0nLCA2KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb2xvbiA9IHRoaXMudGV4dC5pbmRleE9mKCc6JywgaSk7XG4gICAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQodGhpcy50ZXh0LnN1YnN0cmluZyhpICsgMSwgY29sb24pLCAxNik7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMubWVzc2FnZXMuZXh0cmFXb3Jkc1s2XVtpZF07XG4gICAgICAgICAgZXhwYW5zaW9ucy5zZXQobmFtZSwgYHske2lkLnRvU3RyaW5nKDE2KX06JHtuYW1lfX1gKTtcbiAgICAgICAgICBpbnNlcnRBbGwobmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgaSA9IHRoaXMudGV4dC5pbmRleE9mKCd9JywgaSk7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICdbJykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtcztcbiAgICAgICAgICBpbnNlcnQoJ1s6SVRFTTpdJywgTWF0aC5tYXgoLi4uaXRlbXMubWFwKGkgPT4gaS5tZXNzYWdlTmFtZS5sZW5ndGgpKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29sb24gPSB0aGlzLnRleHQuaW5kZXhPZignOicsIGkpO1xuICAgICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KHRoaXMudGV4dC5zdWJzdHJpbmcoaSArIDEsIGNvbG9uKSwgMTYpO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtc1tpZF0ubWVzc2FnZU5hbWU7XG4gICAgICAgICAgZXhwYW5zaW9ucy5zZXQobmFtZSwgYFske2lkLnRvU3RyaW5nKDE2KX06JHtuYW1lfV1gKTtcbiAgICAgICAgICBpbnNlcnRBbGwobmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgaSA9IHRoaXMudGV4dC5pbmRleE9mKCddJywgaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnNlcnQoYyk7XG4gICAgICB9XG4gICAgfVxuICAgIHBhcnRzLnB1c2goLi4ud29yZCk7XG4gICAgbGV0IHRleHQgPSBwYXJ0cy5qb2luKCcnKTtcbiAgICBmb3IgKGNvbnN0IFtmdWxsLCBhYmJyXSBvZiBleHBhbnNpb25zKSB7XG4gICAgICBpZiAodGV4dC5pbmNsdWRlcyhmdWxsKSkgdGV4dCA9IHRleHQuc3BsaXQoZnVsbCkuam9pbihhYmJyKTtcbiAgICB9XG4gICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgfVxuXG4gIGNoZWNrVGV4dCgpOiBib29sZWFuIHtcbiAgICBsZXQgbGluZU51bSA9IDA7XG4gICAgbGV0IGxpbmVMZW4gPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy50ZXh0W2ldO1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMudGV4dFtpICsgMV07XG4gICAgICBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgICAgbGluZU51bSsrO1xuICAgICAgICBsaW5lTGVuID0gMTtcbiAgICAgICAgaWYgKGxpbmVOdW0gPiAzKSByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICcjJykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJ1xcbicpIGkrKzsgLy8gZWF0IG5ld2xpbmVcbiAgICAgICAgbGluZU51bSA9IGxpbmVMZW4gPSAwO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAneycgfHwgYyA9PT0gJ1snKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnOicpIHtcbiAgICAgICAgICBpZiAoYyA9PT0gJ3snKSB7IC8vIHs6SEVSTzp9XG4gICAgICAgICAgICBsaW5lTGVuICs9IDY7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gWzpJVEVNOl1cbiAgICAgICAgICAgIC8vIGNvbXB1dGUgdGhlIG1heCBpdGVtIGxlbmd0aFxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLm1lc3NhZ2VzLnJvbS5pdGVtcztcbiAgICAgICAgICAgIGxpbmVMZW4gKz0gTWF0aC5tYXgoLi4uaXRlbXMubWFwKGkgPT4gaS5tZXNzYWdlTmFtZS5sZW5ndGgpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGxpbmVMZW4gPiAyOCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbG9uID0gdGhpcy50ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0aGlzLnRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBsaW5lTGVuICs9IChjID09PSAneycgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2VzLmV4dHJhV29yZHNbNl1baWRdIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tZXNzYWdlcy5yb20uaXRlbXNbaWRdLm1lc3NhZ2VOYW1lKS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgaSA9IHRoaXMudGV4dC5pbmRleE9mKENMT1NFUlNbY10sIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGluZUxlbisrO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmVMZW4gPiAyOSAmJiBjICE9PSAnICcpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuY29uc3QgUFVOQ1RVQVRJT046IHtbY2hhcjogc3RyaW5nXTogYm9vbGVhbn0gPSB7XG4gICdcXDAnOiB0cnVlLFxuICAnICc6IHRydWUsXG4gICchJzogdHJ1ZSxcbiAgJ1xcJyc6IHRydWUsXG4gICcsJzogdHJ1ZSxcbiAgJy4nOiB0cnVlLFxuICAnOic6IHRydWUsXG4gICc7JzogdHJ1ZSxcbiAgJz8nOiB0cnVlLFxuICAnXyc6IHRydWUsXG5cbiAgLy8gPz8/P1xuICAnXFxuJzogdHJ1ZSwgLy8gbGluZSBzZXBhcmF0b3JcbiAgJyMnOiB0cnVlLCAgLy8gcGFnZSBzZXBhcmF0b3Jcbn07XG5cbi8vIE5PVEU6IHRoZSArMSB2ZXJzaW9uIGlzIGFsd2F5cyBhdCArNSBmcm9tIHRoZSBwb2ludGVyXG5jb25zdCBDT01NT05fV09SRFNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NzA0KTtcbmNvbnN0IFVOQ09NTU9OX1dPUkRTX0JBU0VfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODY4YSk7XG5jb25zdCBQRVJTT05fTkFNRVNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NmQ1KTtcbmNvbnN0IElURU1fTkFNRVNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NmU5KTtcbmNvbnN0IElURU1fTkFNRVNfQkFTRV9QVFIyID0gQWRkcmVzcy5vZigkMTQsIDB4ODc4OSk7XG5cbmNvbnN0IEJBTktTX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg1NDEpO1xuY29uc3QgQkFOS1NfUFRSMiA9IEFkZHJlc3Mub2YoJDE0LCAweDg2NGMpO1xuY29uc3QgUEFSVFNfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODU0Yyk7XG5cbmNvbnN0IFNFR01FTlRTOiBSZWNvcmQ8bnVtYmVyLCBTZWdtZW50PiA9IHtcbiAgMHgxNTogJDE1LFxuICAweDE2OiAkMTZfYSxcbiAgMHgxNzogJDE3LFxufTtcblxuXG5leHBvcnQgY2xhc3MgTWVzc2FnZXMge1xuXG4gIC8vIFRPRE8gLSB3ZSBtaWdodCB3YW50IHRvIGVuY29kZSB0aGlzIGluIHRoZSBzcGFyZSByb20gZGF0YVxuICBwYXJ0Q291bnQ6IG51bWJlciA9IDB4MjI7XG5cbiAgY29tbW9uV29yZHM6IHN0cmluZ1tdID0gW107XG4gIHVuY29tbW9uV29yZHM6IHN0cmluZ1tdID0gW107XG4gIHBlcnNvbk5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBpdGVtTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGV4dHJhV29yZHM6IHtbZ3JvdXA6IG51bWJlcl06IHN0cmluZ1tdfTtcbiAgYmFua3M6IG51bWJlcltdO1xuICBwYXJ0czogTWVzc2FnZVtdW10gPSBbXTtcblxuICAvLyBOT1RFOiB0aGVzZSBkYXRhIHN0cnVjdHVyZXMgYXJlIHJlZHVuZGFudCB3aXRoIHRoZSBhYm92ZS5cbiAgLy8gT25jZSB3ZSBnZXQgdGhpbmdzIHdvcmtpbmcgc21vb3RobHksIHdlIHNob3VsZCBjbGVhbiBpdCB1cFxuICAvLyB0byBvbmx5IHVzZSBvbmUgb3IgdGhlIG90aGVyLlxuICAvLyBhYmJyZXZpYXRpb25zOiBzdHJpbmdbXTtcbiAgLy8gcGVyc29uTmFtZXM6IHN0cmluZ1tdO1xuXG4gIC8vIHN0YXRpYyByZWFkb25seSBDT05USU5VRUQgPSAnXFx1MjViYyc7XG4gIHN0YXRpYyByZWFkb25seSBDT05USU5VRUQgPSAnIyc7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBjb25zdCBjb21tb25Xb3Jkc0Jhc2UgPSBDT01NT05fV09SRFNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgdW5jb21tb25Xb3Jkc0Jhc2UgPSBVTkNPTU1PTl9XT1JEU19CQVNFX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICBjb25zdCBwZXJzb25OYW1lc0Jhc2UgPSBQRVJTT05fTkFNRVNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgaXRlbU5hbWVzQmFzZSA9IElURU1fTkFNRVNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgYmFua3NCYXNlID0gQkFOS1NfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgIGNvbnN0IHBhcnRzQmFzZSA9IFBBUlRTX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcblxuICAgIGNvbnN0IGJhc2VzOiBSZWNvcmQ8bnVtYmVyLCBBZGRyZXNzPiA9IHtcbiAgICAgIDU6IHVuY29tbW9uV29yZHNCYXNlLFxuICAgICAgNjogcGVyc29uTmFtZXNCYXNlLFxuICAgICAgNzogaXRlbU5hbWVzQmFzZSxcbiAgICB9O1xuXG4gICAgLy9jb25zdCBzdHIgPSAoYTogbnVtYmVyKSA9PiByZWFkU3RyaW5nKHJvbS5wcmcsIGEpO1xuICAgIC8vIFRPRE8gLSByZWFkIHRoZXNlIGFkZHJlc3NlcyBkaXJlY3RseSBmcm9tIHRoZSBjb2RlLCBpbiBjYXNlIHRoZXkgbW92ZVxuICAgIC8vIHRoaXMuY29tbW9uV29yZHMgPSBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgY29tbW9uV29yZHNCYXNlLCAweDgwLCAweDIwMDAwLCBzdHIpO1xuICAgIC8vIHVuY29tbW9uV29yZHMgPSBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgZXh0cmFXb3Jkc0Jhc2UsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgIChwZXJzb25OYW1lc0Jhc2UubWludXMoZXh0cmFXb3Jkc0Jhc2UpKSA+Pj4gMSxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgJzEwJywgc3RyKSwgLy8gbGVzcyBjb21tb25cbiAgICAvLyBwZXJzb25OYW1lcyA9IHBlcnNvbk5hbWVzQmFzZSwgMzYsICcxMCcsIHN0ciksIC8vIHBlb3BsZS9wbGFjZXNcbiAgICAvLyBpdGVtTmFtZXMgPSBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgaXRlbU5hbWVzQmFzZSwgNzQsICcxMCcsIHN0ciksIC8vIGl0ZW1zIChhbHNvIDg/KVxuICAgIHRoaXMuZXh0cmFXb3JkcyA9IHtcbiAgICAgIDU6IHRoaXMudW5jb21tb25Xb3JkcyxcbiAgICAgIDY6IHRoaXMucGVyc29uTmFtZXMsXG4gICAgICA3OiB0aGlzLml0ZW1OYW1lcyxcbiAgICB9O1xuXG4gICAgY29uc3QgZ2V0V29yZCA9IChhcnI6IHN0cmluZ1tdLCBiYXNlOiBBZGRyZXNzLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBsZXQgd29yZCA9IGFycltpbmRleF07XG4gICAgICBpZiAod29yZCAhPSBudWxsKSByZXR1cm4gd29yZDtcbiAgICAgIHdvcmQgPSByZWFkU3RyaW5nKHJvbS5wcmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlLnBsdXMoMiAqIGluZGV4KS5yZWFkQWRkcmVzcyhyb20ucHJnKS5vZmZzZXQpO1xuICAgICAgcmV0dXJuIChhcnJbaW5kZXhdID0gd29yZCk7XG4gICAgfTtcblxuICAgIC8vIExhemlseSByZWFkIHRoZSB3b3Jkc1xuICAgIGNvbnN0IHdvcmRzID0gKGlkOiBudW1iZXIsIGdyb3VwOiBudW1iZXIpID0+IHtcbiAgICAgIGlmICghZ3JvdXApIHJldHVybiBnZXRXb3JkKHRoaXMuY29tbW9uV29yZHMsIGNvbW1vbldvcmRzQmFzZSwgaWQgLSAweDgwKTtcbiAgICAgIHJldHVybiBnZXRXb3JkKHRoaXMuZXh0cmFXb3Jkc1tncm91cF0sIGJhc2VzW2dyb3VwXSwgaWQpO1xuICAgIH07XG4gICAgLy8gYnV0IGVhZ2VybHkgcmVhZCBpdGVtIG5hbWVzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDQ5IC8qcm9tLml0ZW1zLmxlbmd0aCovOyBpKyspIHtcbiAgICAgIHdvcmRzKGksIDcpO1xuICAgIH1cblxuICAgIC8vIE5PVEU6IHdlIG1haW50YWluIHRoZSBpbnZhcmlhbnQgdGhhdCB0aGUgYmFua3MgdGFibGUgZGlyZWN0bHlcbiAgICAvLyBmb2xsb3dzIHRoZSBwYXJ0cyB0YWJsZXMsIHdoaWNoIGFyZSBpbiBvcmRlciwgc28gdGhhdCB3ZSBjYW5cbiAgICAvLyBkZXRlY3QgdGhlIGVuZCBvZiBlYWNoIHBhcnQuICBPdGhlcndpc2UgdGhlcmUgaXMgbm8gZ3VhcmFudGVlXG4gICAgLy8gaG93IGxhcmdlIHRoZSBwYXJ0IGFjdHVhbGx5IGlzLlxuXG4gICAgbGV0IGxhc3RQYXJ0ID0gYmFua3NCYXNlLm9mZnNldDtcbiAgICB0aGlzLmJhbmtzID0gdHVwbGUocm9tLnByZywgbGFzdFBhcnQsIHRoaXMucGFydENvdW50KTtcbiAgICBmb3IgKGxldCBwID0gdGhpcy5wYXJ0Q291bnQgLSAxOyBwID49IDA7IHAtLSkge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwYXJ0c0Jhc2UucGx1cygyICogcCkucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgICBjb25zdCBsZW4gPSAobGFzdFBhcnQgLSBzdGFydC5vZmZzZXQpID4+PiAxO1xuICAgICAgbGFzdFBhcnQgPSBzdGFydC5vZmZzZXQ7XG4gICAgICBjb25zdCBzZWcgPSBTRUdNRU5UU1t0aGlzLmJhbmtzW3BdXTtcbiAgICAgIGNvbnN0IHBhcnQ6IE1lc3NhZ2VbXSA9IHRoaXMucGFydHNbcF0gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgYWRkciA9IHN0YXJ0LnBsdXMoMiAqIGkpLnJlYWRBZGRyZXNzKHJvbS5wcmcsIHNlZyk7XG4gICAgICAgIHBhcnRbaV0gPSBuZXcgTWVzc2FnZSh0aGlzLCBwLCBpLCBhZGRyLm9mZnNldCwgd29yZHMpO1xuICAgICAgfVxuICAgIH1cblxuICAvLyAgIHRoaXMucGFydHMgPSBuZXcgQWRkcmVzc1RhYmxlKFxuICAvLyAgICAgICByb20sIDB4Mjg0MjIsIDB4MjIsIDB4MjAwMDAsXG4gIC8vICAgICAgIChhZGRyLCBwYXJ0LCBhZGRycykgPT4ge1xuICAvLyAgICAgICAgIC8vIG5lZWQgdG8gY29tcHV0ZSB0aGUgZW5kIGJhc2VkIG9uIHRoZSBhcnJheT9cbiAgLy8gICAgICAgICBjb25zdCBjb3VudCA9IHBhcnQgPT09IDB4MjEgPyAzIDogKGFkZHJzW3BhcnQgKyAxXSAtIGFkZHIpID4+PiAxO1xuICAvLyAgICAgICAgIC8vIG9mZnNldDogYmFuaz0kMTUgPT4gJDIwMDAwLCBiYW5rPSQxNiA9PiAkMjIwMDAsIGJhbms9JDE3ID0+ICQyNDAwMFxuICAvLyAgICAgICAgIC8vIHN1YnRyYWN0ICRhMDAwIGJlY2F1c2UgdGhhdCdzIHRoZSBwYWdlIHdlJ3JlIGxvYWRpbmcgYXQuXG4gIC8vICAgICAgICAgcmV0dXJuIG5ldyBBZGRyZXNzVGFibGUoXG4gIC8vICAgICAgICAgICAgIHJvbSwgYWRkciwgY291bnQsICh0aGlzLmJhbmtzW3BhcnRdIDw8IDEzKSAtIDB4YTAwMCxcbiAgLy8gICAgICAgICAgICAgKG0sIGlkKSA9PiBuZXcgTWVzc2FnZSh0aGlzLCBwYXJ0LCBpZCwgbSwgYWRkciArIDIgKiBpZCkpO1xuICAvLyAgICAgICB9KTtcbiAgfVxuXG4gIC8vIEZsYXR0ZW5zIHRoZSBtZXNzYWdlcy4gIE5PVEU6IHJldHVybnMgdW51c2VkIG1lc3NhZ2VzLlxuICAqIG1lc3NhZ2VzKHVzZWQ/OiB7aGFzOiAobWlkOiBzdHJpbmcpID0+IGJvb2xlYW59KTogSXRlcmFibGU8TWVzc2FnZT4ge1xuICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLnBhcnRzKSB7XG4gICAgICBpZiAodXNlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcGFydCkge1xuICAgICAgICAgIGlmICh1c2VkLmhhcyhtZXNzYWdlLm1pZCkpIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHlpZWxkICogcGFydDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbWFwIGZyb20gbWVzc2FnZSBpZCAobWlkKSB0byBrbm93biB1c2FnZXMuXG4gIHVzZXMoKTogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+IHtcbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgZnVuY3Rpb24gdXNlKG1lc3NhZ2U6IE1lc3NhZ2VJZCB8IHN0cmluZywgdXNhZ2U6IHN0cmluZykge1xuICAgICAgY29uc3Qgc3RyID0gdHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnID8gbWVzc2FnZSA6IG1lc3NhZ2UubWlkO1xuICAgICAgY29uc3Qgc2V0ID0gb3V0LmdldChzdHIpIHx8IG5ldyBTZXQoKTtcbiAgICAgIHNldC5hZGQodXNhZ2UpO1xuICAgICAgb3V0LnNldChzdHIsIHNldCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdHJpZ2dlciBvZiB0aGlzLnJvbS50cmlnZ2Vycykge1xuICAgICAgaWYgKHRyaWdnZXIubWVzc2FnZS5ub256ZXJvKCkpIHtcbiAgICAgICAgdXNlKHRyaWdnZXIubWVzc2FnZSwgYFRyaWdnZXIgJCR7aGV4KHRyaWdnZXIuaWQpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5yb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgbSBvZiBpdGVtLml0ZW1Vc2VNZXNzYWdlcygpKSB7XG4gICAgICAgIGlmIChtLm5vbnplcm8oKSkgdXNlKG0sIGBJdGVtICQke2hleChpdGVtLmlkKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBucGMgb2YgdGhpcy5yb20ubnBjcykge1xuICAgICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICAgIHVzZShkLm1lc3NhZ2UsIGBOUEMgJCR7aGV4KG5wYy5pZCl9YCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtsLCBkc10gb2YgbnBjLmxvY2FsRGlhbG9ncykge1xuICAgICAgICBjb25zdCBsaCA9IGwgPj0gMCA/IGAgQCAkJHtoZXgobCl9YCA6ICcnO1xuICAgICAgICBmb3IgKGNvbnN0IGQgb2YgZHMpIHtcbiAgICAgICAgICB1c2UoZC5tZXNzYWdlLCBgTlBDICQke2hleChucGMuaWQpfSR7bGh9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBzYWdlIG9mIHRoaXMucm9tLnRlbGVwYXRoeS5zYWdlcykge1xuICAgICAgZm9yIChjb25zdCBkIG9mIHNhZ2UuZGVmYXVsdE1lc3NhZ2VzKSB7XG4gICAgICAgIHVzZShkLCBgVGVsZXBhdGh5ICR7c2FnZS5zYWdlfWApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBnIG9mIHNhZ2UubWVzc2FnZUdyb3Vwcykge1xuICAgICAgICBmb3IgKGNvbnN0IFssIC4uLm1zXSBvZiBnLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBtIG9mIG1zKSB7XG4gICAgICAgICAgICB1c2UobSEsIGBUZWxlcGF0aHkgJHtzYWdlLnNhZ2V9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgbSBvZiBIQVJEQ09ERURfTUVTU0FHRVMpIHtcbiAgICAgIHVzZShtLCAnSGFyZGNvZGVkJyk7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBidWlsZEFiYnJldmlhdGlvblRhYmxlKHVzZXMgPSB0aGlzLnVzZXMoKSk6IEFiYnJldmlhdGlvbltdIHtcbiAgICAvLyBDb3VudCBmcmVxdWVuY2llcyBvZiB1c2VkIHN1ZmZpeGVzLlxuICAgIGludGVyZmFjZSBTdWZmaXgge1xuICAgICAgLy8gQWN0dWFsIHN0cmluZ1xuICAgICAgc3RyOiBzdHJpbmc7XG4gICAgICAvLyBUb3RhbCBudW1iZXIgb2YgYnl0ZXMgc2F2ZWQgb3ZlciBhbGwgb2NjdXJyZW5jZXNcbiAgICAgIHNhdmluZzogbnVtYmVyO1xuICAgICAgLy8gQWxsIHRoZSBpbml0aWFsIHdvcmRzIHRoaXMgaXMgaW4gKG5vdCBjb3VudGluZyBjaGFpbnMpXG4gICAgICB3b3JkczogU2V0PG51bWJlcj47XG4gICAgICAvLyBOdW1iZXIgb2YgY2hhaW5zXG4gICAgICBjaGFpbnM6IG51bWJlcjtcbiAgICAgIC8vIE51bWJlciBvZiBsZXR0ZXJzIG1pc3NpbmcgZnJvbSB0aGUgZmlyc3Qgd29yZFxuICAgICAgbWlzc2luZzogbnVtYmVyO1xuICAgIH1cbiAgICBpbnRlcmZhY2UgV29yZCB7XG4gICAgICAvLyBBY3R1YWwgc3RyaW5nXG4gICAgICBzdHI6IHN0cmluZztcbiAgICAgIC8vIEluZGV4IGluIGxpc3RcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICAvLyBUaGUgY2hhaW5hYmxlIHB1bmN0dWF0aW9uIGFmdGVyIHRoaXMgd29yZCAoc3BhY2Ugb3IgYXBvc3Ryb3BoZSlcbiAgICAgIGNoYWluOiBzdHJpbmc7XG4gICAgICAvLyBQb3NzaWJsZSBieXRlcyB0byBiZSBzYXZlZFxuICAgICAgYnl0ZXM6IG51bWJlcjtcbiAgICAgIC8vIE51bWJlciBvZiBjaGFyYWN0ZXJzIGN1cnJlbnRseSBiZWluZyBjb21wcmVzc2VkXG4gICAgICB1c2VkOiBudW1iZXI7XG4gICAgICAvLyBBbGwgc3VmZml4ZXMgdGhhdCB0b3VjaCB0aGlzIHdvcmRcbiAgICAgIHN1ZmZpeGVzOiBTZXQ8U3VmZml4PjtcbiAgICAgIC8vIE1lc3NhZ2UgSURcbiAgICAgIG1pZDogc3RyaW5nO1xuICAgIH1cblxuICAgIC8vIE9yZGVyZWQgbGlzdCBvZiB3b3Jkc1xuICAgIGNvbnN0IHdvcmRzOiBXb3JkW10gPSBbXTtcbiAgICAvLyBLZWVwIHRyYWNrIG9mIGFkZHJlc3NlcyB3ZSd2ZSBzZWVuLCBtYXBwaW5nIHRvIG1lc3NhZ2UgSURzIGZvciBhbGlhc2luZy5cbiAgICBjb25zdCBhZGRycyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgLy8gQWxpYXNlcyBtYXBwaW5nIG11bHRpcGxlIG1lc3NhZ2UgSURzIHRvIGFscmVhZHktc2VlbiBvbmVzLlxuICAgIGNvbnN0IGFsaWFzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuXG4gICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIHRoaXMubWVzc2FnZXModXNlcykpIHtcbiAgICAgIC8vIFRPRE8gLSBjYW4ndCBsYW5kIHJlZmxvdyB1bnRpbCB3ZSBoYXZlIGxpcHN1bSB0ZXh0LlxuICAgICAgbWVzc2FnZS5maXhUZXh0KCk7XG4gICAgICBjb25zdCBtaWQgPSBtZXNzYWdlLm1pZDtcbiAgICAgIC8vIERvbid0IHJlYWQgdGhlIHNhbWUgbWVzc2FnZSB0d2ljZS5cbiAgICAgIGNvbnN0IHNlZW4gPSBhZGRycy5nZXQobWVzc2FnZS50ZXh0KTtcbiAgICAgIGNvbnN0IGFsaWFzZXMgPSBzZWVuICE9IG51bGwgJiYgYWxpYXMuZ2V0KHNlZW4pO1xuICAgICAgaWYgKGFsaWFzZXMpIHtcbiAgICAgICAgYWxpYXNlcy5wdXNoKG1pZCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYWRkcnMuc2V0KG1lc3NhZ2UudGV4dCwgbWlkKTtcbiAgICAgIGFsaWFzLnNldChtaWQsIFtdKTtcbiAgICAgIC8vIFNwbGl0IHVwIHRoZSBtZXNzYWdlIHRleHQgaW50byB3b3Jkcy5cbiAgICAgIGNvbnN0IHRleHQgPSBtZXNzYWdlLnRleHQ7XG4gICAgICBsZXQgbGV0dGVycyA9IFtdO1xuXG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdGV4dC5sZW5ndGg7IGkgPD0gbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgYyA9IHRleHRbaV07XG4gICAgICAgIGNvbnN0IGNsb3NlciA9IENMT1NFUlNbY107XG4gICAgICAgIGlmIChQVU5DVFVBVElPTltjXSB8fCBjbG9zZXIgfHwgaSA9PT0gbGVuKSB7XG4gICAgICAgICAgLy8gaWYgdGhlIG5leHQgY2hhcmFjdGVyIGlzIG5vbi1wdW5jdHVhdGlvbiB0aGVuIGl0IGNoYWluc1xuICAgICAgICAgIGNvbnN0IG5leHQgPSB0ZXh0W2kgKyAxXTtcbiAgICAgICAgICBpZiAoY2xvc2VyKSBpID0gTWF0aC5tYXgoaSwgdGV4dC5pbmRleE9mKGNsb3NlciwgaSkpO1xuICAgICAgICAgIGlmICghbGV0dGVycy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGNoYWluID1cbiAgICAgICAgICAgICAgKGMgPT09ICcgJyB8fCBjID09PSAnXFwnJykgJiYgbmV4dCAmJiAhUFVOQ1RVQVRJT05bbmV4dF0gPyBjIDogJyc7XG4gICAgICAgICAgY29uc3Qgc3RyID0gbGV0dGVycy5qb2luKCcnKTtcbiAgICAgICAgICBjb25zdCBpZCA9IHdvcmRzLmxlbmd0aDtcbiAgICAgICAgICBjb25zdCBieXRlcyA9IHN0ci5sZW5ndGggKyAoYyA9PT0gJyAnID8gMSA6IDApO1xuICAgICAgICAgIGxldHRlcnMgPSBbXTtcbiAgICAgICAgICB3b3Jkcy5wdXNoKFxuICAgICAgICAgICAgICB7c3RyLCBpZCwgY2hhaW4sIGJ5dGVzLCB1c2VkOiAwLCBzdWZmaXhlczogbmV3IFNldCgpLCBtaWR9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXR0ZXJzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIG1hcCBvZiBzdHJpbmcgdG8gc3VmZml4XG4gICAgY29uc3Qgc3VmZml4ZXMgPSBuZXcgTWFwPHN0cmluZywgU3VmZml4PigpO1xuICAgIGZvciAobGV0IGkgPSB3b3Jkcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgLy8gRm9yIGVhY2ggd29yZFxuICAgICAgY29uc3Qgd29yZCA9IHdvcmRzW2ldO1xuICAgICAgZm9yIChsZXQgaiA9IHdvcmQuYnl0ZXMgLSAyOyBqID49IDA7IGotLSkge1xuICAgICAgICAvLyBGb3IgZWFjaCBzdWZmaXhcbiAgICAgICAgY29uc3Qgc3VmZml4ID0gd29yZC5zdHIuc3Vic3RyaW5nKGopO1xuICAgICAgICAvLyBDdXJyZW50IGZ1bGwgc3RyaW5nLCBhZGRpbmcgYWxsIHRoZSBjaGFpbnMgc28gZmFyXG4gICAgICAgIGxldCBzdHIgPSBzdWZmaXg7XG4gICAgICAgIC8vIE51bWJlciBvZiBleHRyYSBjaGFpbnMgYWRkZWRcbiAgICAgICAgbGV0IGxlbiA9IDA7XG4gICAgICAgIGxldCBsYXRlciA9IHdvcmQ7XG4gICAgICAgIGxldCBzYXZpbmcgPSB3b3JkLmJ5dGVzIC0gaiAtIDE7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgLy8gRm9yIGl0c2VsZiBhbmQgZWFjaCBjaGFpbmFibGUgd29yZCB0aGVyZWFmdGVyXG4gICAgICAgICAgbGV0IGRhdGEgPSBzdWZmaXhlcy5nZXQoc3RyKTtcbiAgICAgICAgICBpZiAoIWRhdGEpIHN1ZmZpeGVzLnNldChzdHIsIChkYXRhID0ge2NoYWluczogbGVuLCBtaXNzaW5nOiBqLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2aW5nOiAtc3RyLmxlbmd0aCwgc3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29yZHM6IG5ldyBTZXQoKX0pKTtcbiAgICAgICAgICBkYXRhLndvcmRzLmFkZChpKTtcbiAgICAgICAgICBkYXRhLnNhdmluZyArPSBzYXZpbmc7XG4gICAgICAgICAgLy8gTGluayB0aGUgc3VmZml4ZXNcbiAgICAgICAgICBmb3IgKGxldCBrID0gbGVuOyBrID49IDA7IGstLSkgd29yZHNbaSArIGtdLnN1ZmZpeGVzLmFkZChkYXRhKTtcbiAgICAgICAgICBpZiAoIWxhdGVyLmNoYWluKSBicmVhaztcbiAgICAgICAgICAvLyBJZiB0aGVyZSdzIGFub3RoZXIgd29yZCB0byBjaGFpbiB0bywgdGhlbiBjb250aW51ZVxuICAgICAgICAgIHN0ciArPSBsYXRlci5jaGFpbjtcbiAgICAgICAgICBsYXRlciA9IHdvcmRzW2kgKyAoKytsZW4pXTtcbiAgICAgICAgICBzdHIgKz0gbGF0ZXIuc3RyO1xuICAgICAgICAgIHNhdmluZyArPSBsYXRlci5ieXRlcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNvcnQgdGhlIHN1ZmZpeGVzIHRvIGZpbmQgdGhlIG1vc3QgaW1wYWN0ZnVsXG4gICAgY29uc3QgaW52YWxpZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGFiYnI6IEFiYnJldmlhdGlvbltdID0gW107XG4gICAgY29uc3Qgb3JkZXIgPSAoe3NhdmluZzogYX06IFN1ZmZpeCwge3NhdmluZzogYn06IFN1ZmZpeCkgPT4gYiAtIGE7XG4gICAgY29uc3Qgc29ydGVkID0gWy4uLnN1ZmZpeGVzLnZhbHVlcygpXS5zb3J0KG9yZGVyKTtcbiAgICBsZXQgdGFibGVMZW5ndGggPSAwO1xuICAgIHdoaWxlIChzb3J0ZWQubGVuZ3RoICYmIHRhYmxlTGVuZ3RoIDwgTUFYX1RBQkxFX0xFTkdUSCkge1xuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHNvcnQgb3JkZXIgaGFzIGJlZW4gaW52YWxpZGF0ZWQgYW5kIHJlc29ydFxuICAgICAgaWYgKGludmFsaWQuaGFzKHNvcnRlZFswXS5zdHIpKSB7XG4gICAgICAgIHNvcnRlZC5zb3J0KG9yZGVyKTtcbiAgICAgICAgaW52YWxpZC5jbGVhcigpO1xuICAgICAgfVxuICAgICAgY29uc3Qge3N0ciwgc2F2aW5nLCBtaXNzaW5nLCB3b3Jkczogd3MsIGNoYWluc30gPSBzb3J0ZWQuc2hpZnQoKSE7XG4gICAgICAvLyBmaWd1cmUgb3V0IGlmIGl0J3Mgd29ydGggYWRkaW5nLi4uXG4gICAgICBpZiAoc2F2aW5nIDw9IDApIGJyZWFrO1xuICAgICAgLy8gbWFrZSB0aGUgYWJicmV2aWF0aW9uXG4gICAgICB0YWJsZUxlbmd0aCArPSBzdHIubGVuZ3RoICsgMztcbiAgICAgIGNvbnN0IGwgPSBhYmJyLmxlbmd0aDtcbiAgICAgIGNvbnN0IG1pZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3cykge1xuICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbd107XG4gICAgICAgIGZvciAoY29uc3QgbWlkIG9mIFt3b3JkLm1pZCwgLi4uKGFsaWFzLmdldCh3b3JkLm1pZCkgfHwgW10pXSkge1xuICAgICAgICAgIG1pZHMuYWRkKG1pZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFiYnIucHVzaCh7XG4gICAgICAgIGJ5dGVzOiBsIDwgMHg4MCA/IFtsICsgMHg4MF0gOiBbNSwgbCAtIDB4ODBdLFxuICAgICAgICBtaWRzLFxuICAgICAgICAvLyBtZXNzYWdlczogbmV3IFNldChbLi4ud3NdLm1hcCh3ID0+IHdvcmRzW3ddLm1pZCkpLFxuICAgICAgICBzdHIsXG4gICAgICB9KTtcblxuICAgICAgLy8gQmxhc3QgcmFkaXVzOiBhbGwgb3RoZXIgc3VmZml4ZXMgcmVsYXRlZCB0byBhbGwgdG91Y2hlZCB3b3JkcyBzYXZlIGxlc3NcbiAgICAgIGZvciAoY29uc3QgaSBvZiB3cykge1xuICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8PSBjaGFpbnM7IGsrKykge1xuICAgICAgICAgIGNvbnN0IHdvcmQgPSB3b3Jkc1tpICsga107XG4gICAgICAgICAgY29uc3QgdXNlZCA9IHdvcmQuYnl0ZXMgLSAoIWsgPyBtaXNzaW5nIDogMCk7XG4gICAgICAgICAgZm9yIChjb25zdCBzdWZmaXggb2Ygd29yZC5zdWZmaXhlcykge1xuICAgICAgICAgICAgc3VmZml4LnNhdmluZyAtPSAodXNlZCAtIHdvcmQudXNlZCk7XG4gICAgICAgICAgICBpbnZhbGlkLmFkZChzdWZmaXguc3RyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgd29yZC51c2VkID0gdXNlZDsgLy8gdHlwaWNhbGx5IGluY3JlYXNlcy4uLlxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoaXMgdGFrZXMgdXMgb3ZlciAweDgwIHRoZW4gYWxsIHN1ZmZpeGVzIGdldCB1cyBvbmUgbGVzcyBieXRlIG9mIHNhdmluZ3MgcGVyIHVzZVxuICAgICAgaWYgKGFiYnIubGVuZ3RoID09PSAweDgwKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBzdWZmaXhlcy52YWx1ZXMoKSkge1xuICAgICAgICAgIGRhdGEuc2F2aW5nIC09IGRhdGEud29yZHMuc2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBzb3J0ZWQuc29ydChvcmRlcik7XG4gICAgICAgIGludmFsaWQuY2xlYXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFiYnI7XG4gIH1cblxuICAvKiogUmVidWlsZCB0aGUgd29yZCB0YWJsZXMgYW5kIG1lc3NhZ2UgZW5jb2RpbmdzLiAqL1xuICBjb21wcmVzcygpIHtcbiAgICBjb25zdCB1c2VzID0gdGhpcy51c2VzKCk7XG4gICAgY29uc3QgdGFibGUgPSB0aGlzLmJ1aWxkQWJicmV2aWF0aW9uVGFibGUodXNlcyk7XG4gICAgLy8gZ3JvdXAgYWJicmV2aWF0aW9ucyBieSBtZXNzYWdlIGFuZCBzb3J0IGJ5IGxlbmd0aC5cbiAgICBjb25zdCBhYmJycyA9IG5ldyBNYXA8c3RyaW5nLCBBYmJyZXZpYXRpb25bXT4oKTsgLy8gYnkgbWlkXG4gICAgdGhpcy5jb21tb25Xb3Jkcy5zcGxpY2UoMCwgdGhpcy5jb21tb25Xb3Jkcy5sZW5ndGgpO1xuICAgIHRoaXMudW5jb21tb25Xb3Jkcy5zcGxpY2UoMCwgdGhpcy51bmNvbW1vbldvcmRzLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBhYmJyIG9mIHRhYmxlKSB7XG4gICAgICBpZiAoYWJici5ieXRlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdGhpcy5jb21tb25Xb3Jkc1thYmJyLmJ5dGVzWzBdICYgMHg3Zl0gPSBhYmJyLnN0cjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZXh0cmFXb3Jkc1thYmJyLmJ5dGVzWzBdXVthYmJyLmJ5dGVzWzFdXSA9IGFiYnIuc3RyO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBtaWQgb2YgYWJici5taWRzKSB7XG4gICAgICAgIGxldCBhYmJyTGlzdCA9IGFiYnJzLmdldChtaWQpO1xuICAgICAgICBpZiAoIWFiYnJMaXN0KSBhYmJycy5zZXQobWlkLCAoYWJickxpc3QgPSBbXSkpO1xuICAgICAgICBhYmJyTGlzdC5wdXNoKGFiYnIpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IGFiYnJMaXN0IG9mIGFiYnJzLnZhbHVlcygpKSB7XG4gICAgICBhYmJyTGlzdC5zb3J0KCh7c3RyOiB7bGVuZ3RoOiB4fX06IEFiYnJldmlhdGlvbiwge3N0cjoge2xlbmd0aDogeX19OiBBYmJyZXZpYXRpb24pID0+IHkgLSB4KTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IG0gb2YgdGhpcy5tZXNzYWdlcyh1c2VzKSkge1xuICAgICAgbGV0IHRleHQgPSBtLnRleHQ7XG4gICAgICAvLyBGaXJzdCByZXBsYWNlIGFueSBpdGVtcyBvciBvdGhlciBuYW1lcyB3aXRoIHRoZWlyIGJ5dGVzLlxuICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFtcXFt7XSkoW15cXF19XSopW1xcXX1dKC58JCkvZywgKGZ1bGwsIGJyYWNrZXQsIGluc2lkZSwgYWZ0ZXIpID0+IHtcbiAgICAgICAgaWYgKGFmdGVyICYmICFQVU5DVFVBVElPTlthZnRlcl0pIHJldHVybiBmdWxsO1xuICAgICAgICBpZiAoYWZ0ZXIgPT09ICcgJykgYWZ0ZXIgPSAnJztcbiAgICAgICAgaWYgKGJyYWNrZXQgPT09ICdbJyAmJiBpbnNpZGUgPT09ICc6SVRFTTonKSB7XG4gICAgICAgICAgcmV0dXJuIGBbOF0ke2FmdGVyfWA7XG4gICAgICAgIH0gZWxzZSBpZiAoYnJhY2tldCA9PT0gJ3snICYmIGluc2lkZSA9PT0gJzpIRVJPOicpIHtcbiAgICAgICAgICByZXR1cm4gYFs0XSR7YWZ0ZXJ9YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBmaW5kIHRoZSBudW1iZXIgYmVmb3JlIHRoZSBjb2xvbi5cbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihbMC05YS1mXSspOi8uZXhlYyhpbnNpZGUpO1xuICAgICAgICBpZiAoIW1hdGNoKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBtZXNzYWdlIHRleHQ6ICR7ZnVsbH1gKTtcbiAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQobWF0Y2hbMV0sIDE2KTtcbiAgICAgICAgcmV0dXJuIGBbJHticmFja2V0ID09PSAneycgPyA2IDogN31dWyR7aWR9XSR7YWZ0ZXJ9YDtcbiAgICAgIH0pO1xuICAgICAgLy8gTm93IHN0YXJ0IHdpdGggdGhlIGxvbmdlc3QgYWJicmV2aWF0aW9uIGFuZCB3b3JrIG91ciB3YXkgZG93bi5cbiAgICAgIGZvciAoY29uc3Qge3N0ciwgYnl0ZXN9IG9mIGFiYnJzLmdldChtLm1pZCkgfHwgW10pIHtcbiAgICAgICAgLy8gTk9URTogdHdvIHNwYWNlcyBpbiBhIHJvdyBhZnRlciBhbiBleHBhbnNpb24gbXVzdCBiZSBwcmVzZXJ2ZWQgYXMtaXMuXG4gICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UobmV3IFJlZ0V4cChzdHIgKyAnKCBbICYwLTldfC58JCknLCAnZycpLCAoZnVsbCwgYWZ0ZXIpID0+IHtcbiAgICAgICAgICBpZiAoYWZ0ZXIgJiYgIVBVTkNUVUFUSU9OW2FmdGVyXSkgcmV0dXJuIGZ1bGw7XG4gICAgICAgICAgaWYgKGFmdGVyID09PSAnICcpIGFmdGVyID0gJyc7XG4gICAgICAgICAgcmV0dXJuIGJ5dGVzLm1hcChiID0+IGBbJHtifV1gKS5qb2luKCcnKSArIGFmdGVyO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gYnVpbGQgdGhlIGVuY29kZWQgdmVyc2lvblxuICAgICAgY29uc3QgaGV4UGFydHMgPSBbJ1swMV0nXTtcbiAgICAgIGNvbnN0IGJzID0gW107XG4gICAgICBicy5wdXNoKDEpO1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRleHQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgYyA9IHRleHRbaV07XG4gICAgICAgIGlmIChjID09PSBNZXNzYWdlcy5DT05USU5VRUQpIHtcbiAgICAgICAgICBicy5wdXNoKDMsIDEpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goJ1swM11bMDFdJyk7XG4gICAgICAgICAgaWYgKHRleHRbaSArIDFdID09PSAnXFxuJykgaSsrO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgICAgYnMucHVzaCgyKTtcbiAgICAgICAgICBpZiAodGV4dFtpICsgMV0gPT09ICcgJykgaSsrO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goJ1swMl0nKTtcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnWycpIHtcbiAgICAgICAgICBjb25zdCBqID0gdGV4dC5pbmRleE9mKCddJywgaSk7XG4gICAgICAgICAgaWYgKGogPD0gMCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGV4dDogJHt0ZXh0fWApO1xuICAgICAgICAgIGNvbnN0IGIgPSBOdW1iZXIodGV4dC5zdWJzdHJpbmcoaSArIDEsIGopKTtcbiAgICAgICAgICBpZiAoaXNOYU4oYikpIHRocm93IG5ldyBFcnJvcihgYmFkIHRleHQ6ICR7dGV4dH1gKTtcbiAgICAgICAgICBicy5wdXNoKGIpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goYFske2hleChiKX1dYCk7XG4gICAgICAgICAgaSA9IGo7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJyAnICYmIHRleHRbaSArIDFdID09PSAnICcpIHtcbiAgICAgICAgICBsZXQgaiA9IGkgKyAyO1xuICAgICAgICAgIHdoaWxlICh0ZXh0W2pdID09PSAnICcpIGorKztcbiAgICAgICAgICBicy5wdXNoKDksIGogLSBpKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKGBbMDldWyR7aGV4KGogLSBpKX1dYCk7XG4gICAgICAgICAgaSA9IGogLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJzLnB1c2goYy5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicy5wdXNoKDApO1xuICAgICAgaGV4UGFydHMucHVzaCgnWzBdJyk7XG4gICAgICBtLmJ5dGVzID0gYnM7XG4gICAgICBtLmhleCA9IGhleFBhcnRzLmpvaW4oJycpO1xuXG4gICAgICAvLyBGaWd1cmUgb3V0IHdoaWNoIHBhZ2UgaXQgbmVlZHMgdG8gYmUgb25cbiAgICAgIC8vIGNvbnN0IGJhbmsgPSB0aGlzLmJhbmtzW20ucGFydF0gPDwgMTM7XG4gICAgICAvLyBjb25zdCBvZmZzZXQgPSBiYW5rIC0gMHhhMDAwO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlKCk6IE1vZHVsZVtdIHtcbiAgICBjb25zdCBhID0gdGhpcy5yb20uYXNzZW1ibGVyKCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg4MDAwLCAweDg1MDApO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4ODUyMCwgMHg4NTI4KTtcbiAgICBmcmVlKGEsICQxNCwgICAweDg1ODYsIDB4ODU5Myk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg4OTAwLCAweDk0MDApO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4OTY4NSwgMHg5NzA2KTtcbiAgICAvL2ZyZWUoYSwgJzE0JywgICAweDliNGUsIDB4OWMwMCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg5ZTgwLCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDE1LCAgIDB4YTAwMCwgMHhjMDAwKTtcbiAgICBmcmVlKGEsICQxNl9hLCAweGEwMDAsIDB4YzAwMCk7XG4gICAgZnJlZShhLCAkMTcsICAgMHhhMDAwLCAweGJjMDApO1xuICAgIC8vIHBsYW46IGFuYWx5emUgYWxsIHRoZSBtc2VzYWdlcywgZmluZGluZyBjb21tb24gc3VmZml4ZXMuXG4gICAgLy8gZWxpZ2libGUgc3VmZml4ZXMgbXVzdCBiZSBmb2xsb3dlZCBieSBlaXRoZXIgc3BhY2UsIHB1bmN0dWF0aW9uLCBvciBlb2xcbiAgICAvLyB0b2RvIC0gcmVmb3JtYXQvZmxvdyBtZXNzYWdlcyBiYXNlZCBvbiBjdXJyZW50IHN1YnN0aXR1dGlvbiBsZW5ndGhzXG5cbiAgICAvLyBidWlsZCB1cCBhIHN1ZmZpeCB0cmllIGJhc2VkIG9uIHRoZSBhYmJyZXZpYXRpb25zLlxuICAgIC8vIGNvbnN0IHRyaWUgPSBuZXcgU3VmZml4VHJpZTxudW1iZXJbXT4oKTtcbiAgICAvLyBmb3IgKGxldCBpID0gMCwgbGVuID0gdGFibGUubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAvLyAgIHRyaWUuc2V0KHRhYmxlW2ldLnN0ciwgaSA8IDB4ODAgPyBbaSArIDB4ODBdIDogWzUsIGkgLSAweDgwXSk7XG4gICAgLy8gfVxuXG4gICAgLy8gd3JpdGUgdGhlIGFiYnJldmlhdGlvbiB0YWJsZXMgKGFsbCwgcmV3cml0aW5nIGhhcmRjb2RlZCBjb2RlcmVmcylcbiAgICBmdW5jdGlvbiB1cGRhdGVDb2RlcmVmKHB0cjogQWRkcmVzcywgYmFzZTogRXhwciwgLi4ub2Zmc2V0czogbnVtYmVyW10pIHtcbiAgICAgIHB0ci5sb2MoYSk7XG4gICAgICBhLndvcmQoYmFzZSk7XG4gICAgICAvLyBzZWNvbmQgcmVmICh1c3VhbGx5IDUgYnl0ZXMgbGF0ZXIpXG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBmb3IgKGNvbnN0IG9mZnNldCBvZiBvZmZzZXRzKSB7XG4gICAgICAgIHB0ci5wbHVzKG9mZnNldCkubG9jKGEpO1xuICAgICAgICBhLndvcmQoe29wOiAnKycsIGFyZ3M6IFtiYXNlLCB7b3A6ICdudW0nLCBudW06ICsraX1dfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlyc3Qgc3RlcDogd3JpdGUgdGhlIG1lc3NhZ2VzLlxuICAgIGNvbnN0IGFkZHJlc3NlczogRXhwcltdW10gPSBzZXEodGhpcy5wYXJ0Q291bnQsICgpID0+IFtdKVxuICAgIGZvciAobGV0IHBhcnRJZCA9IDA7IHBhcnRJZCA8IHRoaXMucGFydENvdW50OyBwYXJ0SWQrKykge1xuICAgICAgY29uc3QgcGFydEFkZHJzID0gYWRkcmVzc2VzW3BhcnRJZF07XG4gICAgICBjb25zdCBwYXJ0ID0gdGhpcy5wYXJ0c1twYXJ0SWRdO1xuICAgICAgY29uc3QgYmFuayA9IHRoaXMuYmFua3NbcGFydElkXTtcbiAgICAgIGNvbnN0IHNlZ21lbnQgPSBTRUdNRU5UU1tiYW5rXTtcbiAgICAgIGEuc2VnbWVudChzZWdtZW50Lm5hbWUpO1xuICAgICAgZm9yIChjb25zdCBtIG9mIHBhcnQpIHtcbiAgICAgICAgYS5yZWxvYyhgTWVzc2FnZV8ke20ubWlkfWApO1xuICAgICAgICBwYXJ0QWRkcnMucHVzaChhLnBjKCkpO1xuICAgICAgICBhLmJ5dGUoLi4ubS5ieXRlcywgMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93IHdyaXRlIGEgc2luZ2xlIGNodW5rIHdpdGggYWxsIHRoZSBwYXJ0cy5cbiAgICBjb25zdCBwYXJ0VGFibGVzOiBFeHByW10gPSBbXTtcbiAgICBhLnNlZ21lbnQoJDE0Lm5hbWUpO1xuICAgIGEucmVsb2MoYE1lc3NhZ2VzVGFibGVgKTtcbiAgICBmb3IgKGxldCBwYXJ0SWQgPSAwOyBwYXJ0SWQgPCB0aGlzLnBhcnRDb3VudDsgcGFydElkKyspIHtcbiAgICAgIHBhcnRUYWJsZXMucHVzaChhLnBjKCkpO1xuICAgICAgYS53b3JkKC4uLmFkZHJlc3Nlc1twYXJ0SWRdKTtcbiAgICB9XG4gICAgY29uc3QgYmFua1RhYmxlID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi50aGlzLmJhbmtzKTtcblxuICAgIGEucmVsb2MoYE1lc3NhZ2VQYXJ0c2ApO1xuICAgIGNvbnN0IHBhcnRzVGFibGUgPSBhLnBjKCk7XG4gICAgYS53b3JkKC4uLnBhcnRUYWJsZXMpO1xuXG4gICAgLy8gRmluYWxseSB1cGRhdGUgdGhlIGJhbmsgYW5kIHBhcnRzIHBvaW50ZXJzLlxuICAgIHVwZGF0ZUNvZGVyZWYoQkFOS1NfUFRSLCBiYW5rVGFibGUpO1xuICAgIHVwZGF0ZUNvZGVyZWYoQkFOS1NfUFRSMiwgYmFua1RhYmxlKTtcbiAgICB1cGRhdGVDb2RlcmVmKFBBUlRTX1BUUiwgcGFydHNUYWJsZSwgNSk7XG5cbiAgICAvLyBOb3cgd3JpdGUgdGhlIHdvcmRzIHRhYmxlcy5cbiAgICBjb25zdCB3b3JkVGFibGVzID0gW1xuICAgICAgW2BDb21tb25Xb3Jkc2AsIHRoaXMuY29tbW9uV29yZHMsIFtDT01NT05fV09SRFNfQkFTRV9QVFJdXSxcbiAgICAgIFtgVW5jb21tb25Xb3Jkc2AsIHRoaXMudW5jb21tb25Xb3JkcywgW1VOQ09NTU9OX1dPUkRTX0JBU0VfUFRSXV0sXG4gICAgICBbYFBlcnNvbk5hbWVzYCwgdGhpcy5wZXJzb25OYW1lcywgW1BFUlNPTl9OQU1FU19CQVNFX1BUUl1dLFxuICAgICAgW2BJdGVtTmFtZXNgLCB0aGlzLml0ZW1OYW1lcywgW0lURU1fTkFNRVNfQkFTRV9QVFIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSVRFTV9OQU1FU19CQVNFX1BUUjJdXSxcbiAgICBdIGFzIGNvbnN0O1xuICAgIGZvciAoY29uc3QgW25hbWUsIHdvcmRzLCBwdHJzXSBvZiB3b3JkVGFibGVzKSB7XG4gICAgICBjb25zdCBhZGRyczogKG51bWJlcnxFeHByKVtdID0gW107XG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBmb3IgKGNvbnN0IHdvcmQgb2Ygd29yZHMpIHtcbiAgICAgICAgaWYgKCF3b3JkKSB7XG4gICAgICAgICAgYWRkcnMucHVzaCgwKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhLnJlbG9jKGAke25hbWV9XyR7aGV4KGkrKyl9YCk7XG4gICAgICAgIGFkZHJzLnB1c2goYS5wYygpKTtcbiAgICAgICAgYS5ieXRlKHdvcmQsIDApO1xuICAgICAgfVxuICAgICAgYS5yZWxvYyhuYW1lKTtcbiAgICAgIGNvbnN0IGJhc2UgPSBhLnBjKCk7XG4gICAgICBhLndvcmQoLi4uYWRkcnMpO1xuICAgICAgZm9yIChjb25zdCBwdHIgb2YgcHRycykge1xuICAgICAgICB1cGRhdGVDb2RlcmVmKHB0ciwgYmFzZSwgNSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbYS5tb2R1bGUoKV07XG4gIH1cbn1cblxuaW50ZXJmYWNlIEFiYnJldmlhdGlvbiB7XG4gIC8vIEJ5dGVzIHRvIGFiYnJldmlhdGUgdG8uXG4gIGJ5dGVzOiBudW1iZXJbXTtcbiAgLy8gTUlEcyBvZiB0aGUgbWVzc2FnZXMgdG8gYWJicmV2aWF0ZS5cbiAgbWlkczogU2V0PHN0cmluZz47XG4gIC8vIEV4cGFuZGVkIHRleHQuXG4gIHN0cjogc3RyaW5nO1xufVxuXG4vLyBNYXggbGVuZ3RoIGZvciB3b3JkcyB0YWJsZS4gIFZhbmlsbGEgYWxsb2NhdGVzIDkzMiBieXRlcywgYnV0IHRoZXJlJ3Ncbi8vIGFuIGV4dHJhIDQ0OCBhdmFpbGFibGUgaW1tZWRpYXRlbHkgYmVuZWF0aC4gIEZvciBub3cgd2UnbGwgcGljayBhIHJvdW5kXG4vLyBudW1iZXI6IDEyMDAuXG5jb25zdCBNQVhfVEFCTEVfTEVOR1RIID0gMTI1MDtcblxuLy8gY29uc3QgUFVOQ1RVQVRJT05fUkVHRVggPSAvW1xcMCAhXFxcXCwuOjs/Xy1dL2c7XG4vLyBjb25zdCBPUEVORVJTOiB7W2Nsb3NlOiBzdHJpbmddOiBzdHJpbmd9ID0geyd9JzogJ3snLCAnXSc6ICdbJ307XG5jb25zdCBDTE9TRVJTOiB7W29wZW46IHN0cmluZ106IHN0cmluZ30gPSB7J3snOiAnfScsICdbJzogJ10nfTtcblxuLy8gTWVzc2FnZSBNSURzIHRoYXQgYXJlIGhhcmRjb2RlZCBpbiB2YXJpb3VzIHBsYWNlcy5cbmV4cG9ydCBjb25zdCBIQVJEQ09ERURfTUVTU0FHRVM6IFNldDxzdHJpbmc+ID0gbmV3IFNldChbXG4gIC8vICcwMDowMCcsIC8vIGltcG9zc2libGUgdG8gaWRlbnRpZnkgdXNlc1xuICAnMjA6MWQnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgMSwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZThcbiAgJzFiOjBmJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDIsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmVhXG4gICcxYjoxMCcsIC8vIGVuZGdhbWUgbWVzc2FnZSAzLCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlY1xuICAnMWI6MTEnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgNCwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZWVcbiAgJzFiOjEyJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDUsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmYwXG4gICcxYjowNScsIC8vIGF6dGVjYSBkaWFsb2cgYWZ0ZXIgZHJheWdvbjIsIGV4ZWMgMzdiMjhcbiAgJzFiOjA2JywgLy8gYXp0ZWNhIGRpYWxvZyBhZnRlciBkcmF5Z29uMiwgZXhlYyAzN2IyOFxuICAnMWI6MDcnLCAvLyBhenRlY2EgZGlhbG9nIGFmdGVyIGRyYXlnb24yLCBleGVjIDM3YjI4XG4gICcxZjowMCcsIC8vIHp6eiBwYXJhbHlzaXMgZGlhbG9nLCBleGVjIDNkMGYzXG4gICcxMzowMCcsIC8vIGtlbnN1IHN3YW4gYXNrcyBmb3IgbG92ZSBwZW5kYW50LCBleGVjIDNkMWNhXG4gICcwYjowMScsIC8vIGFzaW5hIHJldmVhbCwgZXhlYyAzZDFlYlxuICAnMjA6MGMnLCAvLyBpdGVtZ2V0IG1lc3NhZ2UgJ3lvdSBub3cgaGF2ZScsIGV4ZWMgM2Q0M2NcbiAgJzIwOjBmJywgLy8gdG9vIG1hbnkgaXRlbXMsIGV4ZWMgM2Q0OGFcbiAgJzFjOjExJywgLy8gc3dvcmQgb2YgdGh1bmRlciBwcmUtd2FycCBtZXNzYWdlLCBleGVjIDFjOjExXG4gICcwZTowNScsIC8vIG1lc2lhIHJlY29yZGluZywgZXhlYyAzZDYyMVxuICAnMTY6MDAnLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljXG4gICcxNjowMicsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWMgKGxvb3ApXG4gICcxNjowNCcsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWMgKGxvb3ApXG4gICcxNjowNicsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWMgKGxvb3ApXG4gICcyMDoxMScsIC8vIGVtcHR5IHNob3AsIGV4ZWMgM2Q5YzRcbiAgJzIxOjAwJywgLy8gd2FycCBtZW51LCBleGVjIDNkYjYwXG4gICcyMTowMicsIC8vIHRlbGVwYXRoeSBtZW51LCBleGVjIDNkZDZlXG4gICcyMTowMScsIC8vIGNoYW5nZSBtZW51LCBleGVjIDNkZWNiXG4gICcwNjowMCcsIC8vIChzdCkga2VsYmVzcXVlIDEgbW9ub2xvZ3VlLCBleGVjIDFlOTlmXG4gICcxODowMCcsIC8vIChzdCkga2VsYmVzcXVlIDIgbW9ub2xvZ3VlLCBleGVjIDFlOTlmXG4gICcxODowMicsIC8vIChzdCkgc2FiZXJhIDIgbW9ub2xvZ3VlLCBleGVjIDFlY2U2XG4gICcxODowNCcsIC8vIChzdCkgbWFkbyAyIG1vbm9sb2d1ZSwgZXhlYyAxZWUyNlxuICAnMTg6MDgnLCAvLyAoc3QpIGthcm1pbmUgbW9ub2xvZ3VlLCBleGVjIDFlZjhhXG4gICcxYjowMycsIC8vIChzdCkgc3RhdHVlcyBtb25vbG9ndWUsIGV4ZWMgMWYwZTVcbiAgJzFiOjAwJywgLy8gKHN0KSBkcmF5Z29uIDEgbW9ub2xvZ3VlLCBleGVjIDFmMTkzXG4gICcxYjowMCcsIC8vIChzdCkgZHJheWdvbiAxIG1vbm9sb2d1ZSwgZXhlYyAxZjE5M1xuICAnMWI6MDQnLCAvLyAoc3QpIGRyYXlnb24gMiBtb25vbG9ndWUsIGV4ZWMgMWYxOTNcbiAgJzA2OjAxJywgLy8gKHN0KSBrZWxiZXNxdWUgMSBlc2NhcGVzLCBleGVjIDFmYWU3LCB0YWJsZSAxZmIxYmJcbiAgJzEwOjEzJywgLy8gKHN0KSBzYWJlcmEgMSBlc2NhcGVzLCBleGVjIDFmYWU3LCB0YWJsZSAxZmIxZlxuICAnMTk6MDUnLCAvLyAoc3QpIG1hZG8gMSBlc2NhcGVzLCBleGVjIDFmYWU3LCB0YWJsZSAxZmIyNVxuICAnMjA6MTQnLCAvLyAoc3QpIGtlbGJlc3F1ZSAxIGxlZnQgY2hlc3QsIGV4ZWMgMWY3YTMsIHRhYmxlIDFmN2NiXG4gICcyMDoxNScsIC8vIChzdCkgc2FiZXJhIDEgbGVmdCBjaGVzdCwgZXhlYyAxZjdhMywgdGFibGUgMWY3ZDVcbiAgJzIwOjE3JywgLy8gKHN0KSBtYWRvIDEgbGVmdCBjaGVzdCwgZXhlYyAxZjdhMywgdGFibGUgMWY3ZGFcbiAgJzIwOjAyJywgLy8gKHN0KSBjdXJlIHN0YXR1cyBhaWxtZW50LCBleGVjIDI3YjkwXG4gICcyMDowZCcsIC8vIChzdCkgbGV2ZWwgdXAsIGV4ZWMgMzUxZTJcbiAgJzIwOjE5JywgLy8gKHN0KSBwb2lzb25lZCwgZXhlYyAzNTJhYVxuICAnMjA6MWEnLCAvLyAoc3QpIHBhcmFseXplZCwgZXhlYyAzNTJkZlxuICAnMjA6MWInLCAvLyAoc3QpIHN0b25lZCwgZXhlYyAzNTMxN1xuICAnMDM6MDEnLCAvLyAoc3QpIGxlYXJuIHRlbGVwYXRoeSwgZXhlYyAzNTJjY1xuICAnMDM6MDInLCAvLyAoc3QpIGZhaWwgdG8gbGVhcm4gdGVsZXBhdGh5LCBleGVjIDM1MmU4XG4gICcxMDoxMCcsIC8vIChzdCkgZmFrZSBtZXNpYSBtZXNzYWdlIDEsIGV4ZWMgMzY1YjFcbiAgJzEwOjExJywgLy8gKHN0KSBmYWtlIG1lc2lhIG1lc3NhZ2UgMiwgZXhlYyAzNjViMVxuICAnMTA6MTInLCAvLyAoc3QpIGZha2UgbWVzaWEgbWVzc2FnZSAzLCBleGVjIDM2NWIxXG4gICcwYzowNCcsIC8vIChzdCkgZGlzbW91bnQgZG9scGhpbiAobm90IGluc2lkZSBFU0kgY2F2ZSksIGV4ZWMgMzY2MDlcbiAgJzBjOjA1JywgLy8gKHN0KSBkaXNtb3VudCBkb2xwaGluIChldmVyeXdoZXJlIGluIG5lYXIgRVNJKSwgZXhlYyAzNjYwOVxuICAnMDM6MDMnLCAvLyAoc3QpIHN0YXJ0IHN0b20gZmlnaHQsIGV4ZWMgMzY3MTZcbiAgJzIwOjBlJywgLy8gKHN0KSBpbnN1ZmZpY2llbnQgbWFnaWMgZm9yIHNwZWxsLCBleGVjIDNjYzIzXG4gICcyMDoxMycsIC8vIChzdCkgbm90aGluZyBoYXBwZW5zIGl0ZW0gdXNlIG9lcnIsIGV4ZWMgM2Q1MmFcbl0pO1xuIl19