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
            if (lineLen + len > 28)
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
            if (++lineNum > 2) {
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
        const text = this.text.replace(/\s+$/mg, '');
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            const next = text[i + 1];
            if (c === '\n') {
                lineNum++;
                lineLen = 0;
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
                    const colon = text.indexOf(':', i);
                    const id = Number.parseInt(text.substring(i + 1, colon), 16);
                    lineLen += (c === '{' ?
                        this.messages.personNames[id] :
                        this.messages.itemNames[id]).length;
                }
                i = text.indexOf(CLOSERS[c], i);
            }
            else {
                lineLen++;
            }
            if (lineLen > 28)
                return false;
            if (lineLen > 14 && lineNum > 2 && text.includes('#', i))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxPQUFPLEVBQVEsT0FBTyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQ3ZDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTNDLE1BQU0sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUM7QUEwQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUluRSxNQUFNLE9BQU87SUFPWCxZQUFxQixRQUFrQixFQUNsQixJQUFZLEVBQ1osRUFBVSxFQUNuQixNQUFjLEVBQ2QsS0FBa0I7UUFKVCxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBTi9CLFVBQUssR0FBYSxFQUFFLENBQUM7UUFDckIsUUFBRyxHQUFXLEVBQUUsQ0FBQztRQVVmLE1BQU0sR0FBRyxHQUFpQixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxF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cm9tICcuLi9hc20vZXhwci5qcyc7XG5pbXBvcnQge01vZHVsZX0gZnJvbSAnLi4vYXNtL21vZHVsZS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuL21lc3NhZ2VpZC5qcyc7XG5pbXBvcnQge0FkZHJlc3MsIERhdGEsIFNlZ21lbnQsIGhleCwgcmVhZFN0cmluZyxcbiAgICAgICAgc2VxLCBmcmVlLCB0dXBsZX0gZnJvbSAnLi91dGlsLmpzJztcblxuY29uc3QgeyQxNCwgJDE1LCAkMTZfYSwgJDE3fSA9IFNlZ21lbnQ7XG5cbi8vIGltcG9ydCB7U3VmZml4VHJpZX0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbi8vIGNsYXNzIERhdGFUYWJsZTxUPiBleHRlbmRzIEFycmF5PFQ+IHtcblxuLy8gICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgYmFzZTogQWRkcmVzcyxcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgY291bnQ6IG51bWJlcixcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgd2lkdGg6IG51bWJlcixcbi8vICAgICAgICAgICAgICAgLy8gVE9ETyAtIHdoYXQgd2FzIHRoaXMgc3VwcG9zZWQgdG8gYmU/IT9cbi8vICAgICAgICAgICAgICAgZnVuYzogKC4uLng6IG51bWJlcltdKSA9PiBUID1cbi8vICAgICAgICAgICAgICAgICAgIHdpZHRoID4gMSA/ICguLi5pKSA9PiBpIGFzIGFueSA6IGkgPT4gaSBhcyBhbnkpIHtcbi8vICAgICBzdXBlcihjb3VudCk7XG4vLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4vLyAgICAgICB0aGlzW2ldID0gZnVuYyguLi5zbGljZShyb20ucHJnLCBiYXNlICsgaSAqIHdpZHRoLCB3aWR0aCkpO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuXG4vLyBjbGFzcyBBZGRyZXNzVGFibGU8VD4gZXh0ZW5kcyBBcnJheTxUPiB7XG5cbi8vICAgcmVhZG9ubHkgYWRkcmVzc2VzOiBudW1iZXJbXTtcblxuLy8gICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgYmFzZTogQWRkcmVzcyxcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgY291bnQ6IG51bWJlcixcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgc2VnbWVudDogc3RyaW5nLFxuLy8gICAgICAgICAgICAgICBmdW5jOiAoeDogbnVtYmVyLCBpOiBudW1iZXIsIGFycjogbnVtYmVyW10pID0+IFQgPSBpID0+IGkgYXMgYW55KSB7XG4vLyAgICAgc3VwZXIoY291bnQpO1xuLy8gICAgIHRoaXMuYWRkcmVzc2VzID0gc2VxKHRoaXMuY291bnQsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgKGk6IG51bWJlcikgPT4ge1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYSA9IHJlYWRMaXR0bGVFbmRpYW4ocm9tLnByZywgYmFzZSArIDIgKiBpKTtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhICYmIGEgKyBvZmZzZXQ7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgXG4vLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4vLyAgICAgICB0aGlzW2ldID0gZnVuYyh0aGlzLmFkZHJlc3Nlc1tpXSwgaSwgdGhpcy5hZGRyZXNzZXMpO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuXG5jb25zdCBERUxJTUlURVJTID0gbmV3IE1hcDxudW1iZXIsIHN0cmluZz4oW1s2LCAne30nXSwgWzcsICdbXSddXSk7XG5cbnR5cGUgV29yZEZhY3RvcnkgPSAoaWQ6IG51bWJlciwgZ3JvdXA6IG51bWJlcikgPT4gc3RyaW5nO1xuXG5jbGFzcyBNZXNzYWdlIHtcblxuICAvLyBUaGlzIGlzIHJlZHVuZGFudCAtIHRoZSB0ZXh0IHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gIGJ5dGVzOiBudW1iZXJbXSA9IFtdO1xuICBoZXg6IHN0cmluZyA9ICcnOyAvLyBmb3IgZGVidWdnaW5nXG4gIHRleHQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBtZXNzYWdlczogTWVzc2FnZXMsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHBhcnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgaWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgb2Zmc2V0OiBudW1iZXIsXG4gICAgICAgICAgICAgIHdvcmRzOiBXb3JkRmFjdG9yeSkge1xuXG4gICAgLy8gUGFyc2UgdGhlIG1lc3NhZ2VcbiAgICBjb25zdCBwcmc6IERhdGE8bnVtYmVyPiA9IG1lc3NhZ2VzLnJvbS5wcmc7XG4gICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gb2Zmc2V0OyBvZmZzZXQgJiYgcHJnW2ldOyBpKyspIHtcbiAgICAgIGNvbnN0IGIgPSBwcmdbaV07XG4gICAgICB0aGlzLmJ5dGVzLnB1c2goYik7XG4gICAgICBpZiAoYiA9PT0gMSkge1xuICAgICAgICAvLyBOT1RFIC0gdGhlcmUgaXMgb25lIGNhc2Ugd2hlcmUgdHdvIG1lc3NhZ2VzIHNlZW0gdG8gYWJ1dCB3aXRob3V0IGFcbiAgICAgICAgLy8gbnVsbCB0ZXJtaW5hdG9yIC0gJDJjYTkxICgkMTI6JDA4KSBmYWxscyB0aHJvdWdoIGZyb20gMTI6MDcuICBXZSBmaXhcbiAgICAgICAgLy8gdGhhdCB3aXRoIGFuIGFkanVzdG1lbnQgaW4gcm9tLnRzLCBidXQgdGhpcyBkZXRlY3RzIGl0IGp1c3QgaW4gY2FzZS5cbiAgICAgICAgaWYgKGkgIT09IG9mZnNldCAmJiBwcmdbaSAtIDFdICE9PSAzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHN0YXJ0IG1lc3NhZ2Ugc2lnbmFsIGF0ICR7aS50b1N0cmluZygxNil9YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gMikge1xuICAgICAgICBwYXJ0cy5wdXNoKCdcXG4gJyk7XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDMpIHtcbiAgICAgICAgcGFydHMucHVzaChgJHtNZXNzYWdlcy5DT05USU5VRUR9XFxuYCk7IC8vIGJsYWNrIGRvd24tcG9pbnRpbmcgdHJpYW5nbGVcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gNCkge1xuICAgICAgICBwYXJ0cy5wdXNoKCd7OkhFUk86fScpO1xuICAgICAgfSBlbHNlIGlmIChiID09PSA4KSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ1s6SVRFTTpdJyk7XG4gICAgICB9IGVsc2UgaWYgKGIgPj0gNSAmJiBiIDw9IDkpIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IHByZ1srK2ldO1xuICAgICAgICB0aGlzLmJ5dGVzLnB1c2gobmV4dCk7XG4gICAgICAgIGlmIChiID09PSA5KSB7XG4gICAgICAgICAgcGFydHMucHVzaCgnICcucmVwZWF0KG5leHQpKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWxpbXMgPSBERUxJTUlURVJTLmdldChiKTtcbiAgICAgICAgaWYgKGRlbGltcykge1xuICAgICAgICAgIHBhcnRzLnB1c2goZGVsaW1zWzBdKTtcbiAgICAgICAgICBwYXJ0cy5wdXNoKG5leHQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJykpO1xuICAgICAgICAgIHBhcnRzLnB1c2goJzonKTtcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoKHdvcmRzKG5leHQsIGIpKTtcbiAgICAgICAgaWYgKGRlbGltcykgcGFydHMucHVzaChkZWxpbXNbMV0pO1xuICAgICAgICBpZiAoIVBVTkNUVUFUSU9OW1N0cmluZy5mcm9tQ2hhckNvZGUocHJnW2kgKyAxXSldKSB7XG4gICAgICAgICAgcGFydHMucHVzaCgnICcpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGIgPj0gMHg4MCkge1xuICAgICAgICBwYXJ0cy5wdXNoKHdvcmRzKGIsIDApKTtcbiAgICAgICAgaWYgKCFQVU5DVFVBVElPTltTdHJpbmcuZnJvbUNoYXJDb2RlKHByZ1tpICsgMV0pXSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiID49IDB4MjApIHtcbiAgICAgICAgcGFydHMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLWV4aGF1c3RpdmUgc3dpdGNoOiAke2J9IGF0ICR7aS50b1N0cmluZygxNil9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudGV4dCA9IHBhcnRzLmpvaW4oJycpO1xuICB9XG5cbiAgZ2V0IG1pZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHtoZXgodGhpcy5wYXJ0KX06JHtoZXgodGhpcy5pZCl9YDtcbiAgfVxuXG4gIC8vIEZpeGVzIHRoZSB0ZXh0IHRvIGVuc3VyZSBpdCBmaXRzIGluIHRoZSBkaWFsb2cgYm94LlxuICAvLyBDb25zdHJhaW50czpcbiAgLy8gIC0gbm8gbGluZSBpcyBsb25nZXIgdGhhbiAyOCBjaGFyYWN0ZXJzXG4gIC8vICAtIGZpcnN0IGxpbmUgYWZ0ZXIgYSBcXG4gaXMgaW5kZW50ZWQgb25lIHNwYWNlXG4gIC8vICAtIHVuY2FwaXRhbGl6ZWQgKHVucHVuY3R1YXRlZD8pIGZpcnN0IGNoYXJhY3RlcnMgYXJlIGluZGVudGVkLCB0b29cbiAgLy8gIC0gd3JhcCBvciB1bndyYXAgYW55IHBlcnNvbiBvciBpdGVtIG5hbWVzXG4gIC8vICAtIGF0IG1vc3QgZm91ciBsaW5lcyBwZXIgbWVzc2FnZSBib3hcbiAgLy8gSWYgYW55IHZpb2xhdGlvbnMgYXJlIGZvdW5kLCB0aGUgZW50aXJlIG1lc3NhZ2UgaXMgcmVmbG93ZWQuXG4gIGZpeFRleHQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY2hlY2tUZXh0KCkpIHJldHVybjtcbiAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgbGluZU51bSA9IDA7XG4gICAgbGV0IGxpbmVMZW4gPSAwO1xuICAgIGxldCBzcGFjZSA9IGZhbHNlO1xuICAgIC8vIFRPRE8gLSBjaGFuZ2Ugd29yZCBpbnRvIHNvbWV0aGluZyBmYW5jaWVyIC0gYW4gYXJyYXkgb2ZcbiAgICAvLyAoc3RyLCBsZW4sIGZhbGxiYWNrKSBzbyB0aGF0IHB1bmN0dWF0aW9uIGFmdGVyIGFuXG4gICAgLy8gZXhwYW5zaW9uIGRvZXNuJ3Qgc2NyZXcgdXMgdXAuXG4gICAgLy8gT1IuLi4ganVzdCBpbnNlcnQgdGhlIGZhbGxiYWNrIGV2ZXJ5IHRpbWUgYW5kIGluc3RlYWQgbWVtb2l6ZVxuICAgIC8vIHRoZSBleHBhbnNpb24gdG8gcmVwbGFjZSBhdCB0aGUgZW5kIGlmIHRoZXJlJ3Mgbm8gYnJlYWsuXG4gICAgbGV0IHdvcmQ6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgZXhwYW5zaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZnVuY3Rpb24gaW5zZXJ0KHN0cjogc3RyaW5nLCBsZW46IG51bWJlciA9IHN0ci5sZW5ndGgpIHtcbiAgICAgIC8vIFRPRE8gLSB3aGF0IGRvIHdlIGRvIHdpdGggZXhpc3RpbmcgcGFnZSBicmVha3M/XG4gICAgICAvLyAgICAgIC0gaWYgd2UgZXZlciBuZWVkIHRvIF9tb3ZlXyBvbmUgdGhlbiB3ZSBzaG91bGQgSUdOT1JFIGl0P1xuICAgICAgLy8gICAgICAtIHNhbWUgd2l0aCBuZXdsaW5lcy4uLlxuICAgICAgLy8gaWYgKHN0ciA9PT0gJyMnKSB7XG4gICAgICAvLyAgIG5ld2xpbmUoKTtcbiAgICAgIC8vICAgcmV0dXJuO1xuICAgICAgLy8gfVxuICAgICAgaWYgKGxpbmVMZW4gKyBsZW4gPiAyOCkgbmV3bGluZSgpO1xuICAgICAgaWYgKHN0ciA9PT0gJyAnKSB7XG4gICAgICAgIHBhcnRzLnB1c2goLi4ud29yZCwgJyAnKTtcbiAgICAgICAgd29yZCA9IFtdO1xuICAgICAgfSBlbHNlIGlmICgvXltbe106Ly50ZXN0KHN0cikpIHtcbiAgICAgICAgd29yZC5wdXNoKHt0b1N0cmluZzogKCkgPT4gc3RyLCBsZW5ndGg6IGxlbn0gYXMgYW55KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdvcmQucHVzaChzdHIpO1xuICAgICAgfVxuICAgICAgbGluZUxlbiArPSBsZW47XG4gICAgICBzcGFjZSA9IHN0ci5lbmRzV2l0aCgnICcpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnNlcnRTcGFjZSgpIHtcbiAgICAgIGlmICghc3BhY2UpIGluc2VydCgnICcpO1xuICAgICAgc3BhY2UgPSB0cnVlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnNlcnRBbGwoc3RyOiBzdHJpbmcpIHtcbiAgICAgIGNvbnN0IHNwbGl0ID0gc3RyLnNwbGl0KC9cXHMrLyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwbGl0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpKSBpbnNlcnRTcGFjZSgpO1xuICAgICAgICBpbnNlcnQoc3BsaXRbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBuZXdsaW5lKCkge1xuICAgICAgbGluZUxlbiA9IDEgKyB3b3JkLnJlZHVjZSgoYSwgYikgPT4gYSArIGIubGVuZ3RoLCAwKTtcbiAgICAgIGlmICgrK2xpbmVOdW0gPiAyKSB7XG4gICAgICAgIC8vIE5PVEU6IHdlIGNhbiBzb21ldGltZXMgaGFuZGxlIDMsIGJ1dCBuZWVkIHRvIGtub3cgdGhlXG4gICAgICAgIC8vIGNvbnRleHQ6IGlzIGl0IGVpdGhlciB0aGUgX2xhc3RfIGxpbmUgb3IgYSBfc2hvcnRfIGxpbmU/XG4gICAgICAgIHBhcnRzLnB1c2goJyNcXG4gJyk7XG4gICAgICAgIGxpbmVOdW0gPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFydHMucHVzaCgnXFxuICcpO1xuICAgICAgfVxuICAgICAgc3BhY2UgPSB0cnVlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMudGV4dFtpXTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnRleHRbaSArIDFdO1xuICAgICAgaWYgKC9bXFxzXFxuI10vLnRlc3QoYykpIHtcbiAgICAgICAgaW5zZXJ0U3BhY2UoKTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3snKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnOicpIHtcbiAgICAgICAgICBpbnNlcnQoJ3s6SEVSTzp9JywgNik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29sb24gPSB0aGlzLnRleHQuaW5kZXhPZignOicsIGkpO1xuICAgICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KHRoaXMudGV4dC5zdWJzdHJpbmcoaSArIDEsIGNvbG9uKSwgMTYpO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLm1lc3NhZ2VzLmV4dHJhV29yZHNbNl1baWRdO1xuICAgICAgICAgIGV4cGFuc2lvbnMuc2V0KG5hbWUsIGB7JHtpZC50b1N0cmluZygxNil9OiR7bmFtZX19YCk7XG4gICAgICAgICAgaW5zZXJ0QWxsKG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0aGlzLnRleHQuaW5kZXhPZignfScsIGkpO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAnWycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICc6Jykge1xuICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5tZXNzYWdlcy5yb20uaXRlbXM7XG4gICAgICAgICAgaW5zZXJ0KCdbOklURU06XScsIE1hdGgubWF4KC4uLml0ZW1zLm1hcChpID0+IGkubWVzc2FnZU5hbWUubGVuZ3RoKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbG9uID0gdGhpcy50ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0aGlzLnRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5tZXNzYWdlcy5yb20uaXRlbXNbaWRdLm1lc3NhZ2VOYW1lO1xuICAgICAgICAgIGV4cGFuc2lvbnMuc2V0KG5hbWUsIGBbJHtpZC50b1N0cmluZygxNil9OiR7bmFtZX1dYCk7XG4gICAgICAgICAgaW5zZXJ0QWxsKG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0aGlzLnRleHQuaW5kZXhPZignXScsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5zZXJ0KGMpO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKC4uLndvcmQpO1xuICAgIGxldCB0ZXh0ID0gcGFydHMuam9pbignJyk7XG4gICAgZm9yIChjb25zdCBbZnVsbCwgYWJicl0gb2YgZXhwYW5zaW9ucykge1xuICAgICAgaWYgKHRleHQuaW5jbHVkZXMoZnVsbCkpIHRleHQgPSB0ZXh0LnNwbGl0KGZ1bGwpLmpvaW4oYWJicik7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coYFJFRkxPVyAke3RoaXMubWlkfVxcbiR7dGhpcy50ZXh0LnJlcGxhY2UoL158JC9tZywgJ3wnKVxuICAgIC8vICAgICAgICAgICAgIH1cXG4gICh3aXRoKVxcbiR7dGV4dC5yZXBsYWNlKC9efCQvbWcsICd8Jyl9YCk7XG4gICAgdGhpcy50ZXh0ID0gdGV4dDtcbiAgfVxuXG4gIGNoZWNrVGV4dCgpOiBib29sZWFuIHtcbiAgICBsZXQgbGluZU51bSA9IDA7XG4gICAgbGV0IGxpbmVMZW4gPSAwO1xuICAgIGNvbnN0IHRleHQgPSB0aGlzLnRleHQucmVwbGFjZSgvXFxzKyQvbWcsICcnKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0ZXh0W2ldO1xuICAgICAgY29uc3QgbmV4dCA9IHRleHRbaSArIDFdO1xuICAgICAgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgIGxpbmVOdW0rKztcbiAgICAgICAgbGluZUxlbiA9IDA7XG4gICAgICAgIGlmIChsaW5lTnVtID4gMykgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAnIycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICdcXG4nKSBpKys7IC8vIGVhdCBuZXdsaW5lXG4gICAgICAgIGxpbmVOdW0gPSBsaW5lTGVuID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3snIHx8IGMgPT09ICdbJykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgaWYgKGMgPT09ICd7JykgeyAvLyB7OkhFUk86fVxuICAgICAgICAgICAgbGluZUxlbiArPSA2O1xuICAgICAgICAgIH0gZWxzZSB7IC8vIFs6SVRFTTpdXG4gICAgICAgICAgICAvLyBjb21wdXRlIHRoZSBtYXggaXRlbSBsZW5ndGhcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5tZXNzYWdlcy5yb20uaXRlbXM7XG4gICAgICAgICAgICBsaW5lTGVuICs9IE1hdGgubWF4KC4uLml0ZW1zLm1hcChpID0+IGkubWVzc2FnZU5hbWUubGVuZ3RoKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChsaW5lTGVuID4gMjgpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb2xvbiA9IHRleHQuaW5kZXhPZignOicsIGkpO1xuICAgICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KHRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBsaW5lTGVuICs9IChjID09PSAneycgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2VzLnBlcnNvbk5hbWVzW2lkXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWVzc2FnZXMuaXRlbU5hbWVzW2lkXSkubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0ZXh0LmluZGV4T2YoQ0xPU0VSU1tjXSwgaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaW5lTGVuKys7XG4gICAgICB9XG4gICAgICBpZiAobGluZUxlbiA+IDI4KSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAobGluZUxlbiA+IDE0ICYmIGxpbmVOdW0gPiAyICYmIHRleHQuaW5jbHVkZXMoJyMnLCBpKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5jb25zdCBQVU5DVFVBVElPTjoge1tjaGFyOiBzdHJpbmddOiBib29sZWFufSA9IHtcbiAgJ1xcMCc6IHRydWUsXG4gICcgJzogdHJ1ZSxcbiAgJyEnOiB0cnVlLFxuICAnXFwnJzogdHJ1ZSxcbiAgJywnOiB0cnVlLFxuICAnLic6IHRydWUsXG4gICc6JzogdHJ1ZSxcbiAgJzsnOiB0cnVlLFxuICAnPyc6IHRydWUsXG4gICdfJzogdHJ1ZSxcblxuICAvLyA/Pz8/XG4gICdcXG4nOiB0cnVlLCAvLyBsaW5lIHNlcGFyYXRvclxuICAnIyc6IHRydWUsICAvLyBwYWdlIHNlcGFyYXRvclxufTtcblxuLy8gTk9URTogdGhlICsxIHZlcnNpb24gaXMgYWx3YXlzIGF0ICs1IGZyb20gdGhlIHBvaW50ZXJcbmNvbnN0IENPTU1PTl9XT1JEU19CQVNFX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg3MDQpO1xuY29uc3QgVU5DT01NT05fV09SRFNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NjhhKTtcbmNvbnN0IFBFUlNPTl9OQU1FU19CQVNFX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg2ZDUpO1xuY29uc3QgSVRFTV9OQU1FU19CQVNFX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg2ZTkpO1xuY29uc3QgSVRFTV9OQU1FU19CQVNFX1BUUjIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4Nzg5KTtcblxuY29uc3QgQkFOS1NfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODU0MSk7XG5jb25zdCBCQU5LU19QVFIyID0gQWRkcmVzcy5vZigkMTQsIDB4ODY0Yyk7XG5jb25zdCBQQVJUU19QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NTRjKTtcblxuY29uc3QgU0VHTUVOVFM6IFJlY29yZDxudW1iZXIsIFNlZ21lbnQ+ID0ge1xuICAweDE1OiAkMTUsXG4gIDB4MTY6ICQxNl9hLFxuICAweDE3OiAkMTcsXG59O1xuXG5cbmV4cG9ydCBjbGFzcyBNZXNzYWdlcyB7XG5cbiAgLy8gVE9ETyAtIHdlIG1pZ2h0IHdhbnQgdG8gZW5jb2RlIHRoaXMgaW4gdGhlIHNwYXJlIHJvbSBkYXRhXG4gIHBhcnRDb3VudDogbnVtYmVyID0gMHgyMjtcblxuICBjb21tb25Xb3Jkczogc3RyaW5nW10gPSBbXTtcbiAgdW5jb21tb25Xb3Jkczogc3RyaW5nW10gPSBbXTtcbiAgcGVyc29uTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGl0ZW1OYW1lczogc3RyaW5nW10gPSBbXTtcbiAgZXh0cmFXb3Jkczoge1tncm91cDogbnVtYmVyXTogc3RyaW5nW119O1xuICBiYW5rczogbnVtYmVyW107XG4gIHBhcnRzOiBNZXNzYWdlW11bXSA9IFtdO1xuXG4gIC8vIE5PVEU6IHRoZXNlIGRhdGEgc3RydWN0dXJlcyBhcmUgcmVkdW5kYW50IHdpdGggdGhlIGFib3ZlLlxuICAvLyBPbmNlIHdlIGdldCB0aGluZ3Mgd29ya2luZyBzbW9vdGhseSwgd2Ugc2hvdWxkIGNsZWFuIGl0IHVwXG4gIC8vIHRvIG9ubHkgdXNlIG9uZSBvciB0aGUgb3RoZXIuXG4gIC8vIGFiYnJldmlhdGlvbnM6IHN0cmluZ1tdO1xuICAvLyBwZXJzb25OYW1lczogc3RyaW5nW107XG5cbiAgLy8gc3RhdGljIHJlYWRvbmx5IENPTlRJTlVFRCA9ICdcXHUyNWJjJztcbiAgc3RhdGljIHJlYWRvbmx5IENPTlRJTlVFRCA9ICcjJztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIGNvbnN0IGNvbW1vbldvcmRzQmFzZSA9IENPTU1PTl9XT1JEU19CQVNFX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICBjb25zdCB1bmNvbW1vbldvcmRzQmFzZSA9IFVOQ09NTU9OX1dPUkRTX0JBU0VfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgIGNvbnN0IHBlcnNvbk5hbWVzQmFzZSA9IFBFUlNPTl9OQU1FU19CQVNFX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICBjb25zdCBpdGVtTmFtZXNCYXNlID0gSVRFTV9OQU1FU19CQVNFX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICBjb25zdCBiYW5rc0Jhc2UgPSBCQU5LU19QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgcGFydHNCYXNlID0gUEFSVFNfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuXG4gICAgY29uc3QgYmFzZXM6IFJlY29yZDxudW1iZXIsIEFkZHJlc3M+ID0ge1xuICAgICAgNTogdW5jb21tb25Xb3Jkc0Jhc2UsXG4gICAgICA2OiBwZXJzb25OYW1lc0Jhc2UsXG4gICAgICA3OiBpdGVtTmFtZXNCYXNlLFxuICAgIH07XG5cbiAgICAvL2NvbnN0IHN0ciA9IChhOiBudW1iZXIpID0+IHJlYWRTdHJpbmcocm9tLnByZywgYSk7XG4gICAgLy8gVE9ETyAtIHJlYWQgdGhlc2UgYWRkcmVzc2VzIGRpcmVjdGx5IGZyb20gdGhlIGNvZGUsIGluIGNhc2UgdGhleSBtb3ZlXG4gICAgLy8gdGhpcy5jb21tb25Xb3JkcyA9IG5ldyBBZGRyZXNzVGFibGUocm9tLCBjb21tb25Xb3Jkc0Jhc2UsIDB4ODAsIDB4MjAwMDAsIHN0cik7XG4gICAgLy8gdW5jb21tb25Xb3JkcyA9IG5ldyBBZGRyZXNzVGFibGUocm9tLCBleHRyYVdvcmRzQmFzZSxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgKHBlcnNvbk5hbWVzQmFzZS5taW51cyhleHRyYVdvcmRzQmFzZSkpID4+PiAxLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAnMTAnLCBzdHIpLCAvLyBsZXNzIGNvbW1vblxuICAgIC8vIHBlcnNvbk5hbWVzID0gcGVyc29uTmFtZXNCYXNlLCAzNiwgJzEwJywgc3RyKSwgLy8gcGVvcGxlL3BsYWNlc1xuICAgIC8vIGl0ZW1OYW1lcyA9IG5ldyBBZGRyZXNzVGFibGUocm9tLCBpdGVtTmFtZXNCYXNlLCA3NCwgJzEwJywgc3RyKSwgLy8gaXRlbXMgKGFsc28gOD8pXG4gICAgdGhpcy5leHRyYVdvcmRzID0ge1xuICAgICAgNTogdGhpcy51bmNvbW1vbldvcmRzLFxuICAgICAgNjogdGhpcy5wZXJzb25OYW1lcyxcbiAgICAgIDc6IHRoaXMuaXRlbU5hbWVzLFxuICAgIH07XG5cbiAgICBjb25zdCBnZXRXb3JkID0gKGFycjogc3RyaW5nW10sIGJhc2U6IEFkZHJlc3MsIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGxldCB3b3JkID0gYXJyW2luZGV4XTtcbiAgICAgIGlmICh3b3JkICE9IG51bGwpIHJldHVybiB3b3JkO1xuICAgICAgd29yZCA9IHJlYWRTdHJpbmcocm9tLnByZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2UucGx1cygyICogaW5kZXgpLnJlYWRBZGRyZXNzKHJvbS5wcmcpLm9mZnNldCk7XG4gICAgICByZXR1cm4gKGFycltpbmRleF0gPSB3b3JkKTtcbiAgICB9O1xuXG4gICAgLy8gTGF6aWx5IHJlYWQgdGhlIHdvcmRzXG4gICAgY29uc3Qgd29yZHMgPSAoaWQ6IG51bWJlciwgZ3JvdXA6IG51bWJlcikgPT4ge1xuICAgICAgaWYgKCFncm91cCkgcmV0dXJuIGdldFdvcmQodGhpcy5jb21tb25Xb3JkcywgY29tbW9uV29yZHNCYXNlLCBpZCAtIDB4ODApO1xuICAgICAgcmV0dXJuIGdldFdvcmQodGhpcy5leHRyYVdvcmRzW2dyb3VwXSwgYmFzZXNbZ3JvdXBdLCBpZCk7XG4gICAgfTtcbiAgICAvLyBidXQgZWFnZXJseSByZWFkIGl0ZW0gbmFtZXNcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4NDkgLypyb20uaXRlbXMubGVuZ3RoKi87IGkrKykge1xuICAgICAgd29yZHMoaSwgNyk7XG4gICAgfVxuXG4gICAgLy8gTk9URTogd2UgbWFpbnRhaW4gdGhlIGludmFyaWFudCB0aGF0IHRoZSBiYW5rcyB0YWJsZSBkaXJlY3RseVxuICAgIC8vIGZvbGxvd3MgdGhlIHBhcnRzIHRhYmxlcywgd2hpY2ggYXJlIGluIG9yZGVyLCBzbyB0aGF0IHdlIGNhblxuICAgIC8vIGRldGVjdCB0aGUgZW5kIG9mIGVhY2ggcGFydC4gIE90aGVyd2lzZSB0aGVyZSBpcyBubyBndWFyYW50ZWVcbiAgICAvLyBob3cgbGFyZ2UgdGhlIHBhcnQgYWN0dWFsbHkgaXMuXG5cbiAgICBsZXQgbGFzdFBhcnQgPSBiYW5rc0Jhc2Uub2Zmc2V0O1xuICAgIHRoaXMuYmFua3MgPSB0dXBsZShyb20ucHJnLCBsYXN0UGFydCwgdGhpcy5wYXJ0Q291bnQpO1xuICAgIGZvciAobGV0IHAgPSB0aGlzLnBhcnRDb3VudCAtIDE7IHAgPj0gMDsgcC0tKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHBhcnRzQmFzZS5wbHVzKDIgKiBwKS5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICAgIGNvbnN0IGxlbiA9IChsYXN0UGFydCAtIHN0YXJ0Lm9mZnNldCkgPj4+IDE7XG4gICAgICBsYXN0UGFydCA9IHN0YXJ0Lm9mZnNldDtcbiAgICAgIGNvbnN0IHNlZyA9IFNFR01FTlRTW3RoaXMuYmFua3NbcF1dO1xuICAgICAgY29uc3QgcGFydDogTWVzc2FnZVtdID0gdGhpcy5wYXJ0c1twXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBhZGRyID0gc3RhcnQucGx1cygyICogaSkucmVhZEFkZHJlc3Mocm9tLnByZywgc2VnKTtcbiAgICAgICAgcGFydFtpXSA9IG5ldyBNZXNzYWdlKHRoaXMsIHAsIGksIGFkZHIub2Zmc2V0LCB3b3Jkcyk7XG4gICAgICB9XG4gICAgfVxuXG4gIC8vICAgdGhpcy5wYXJ0cyA9IG5ldyBBZGRyZXNzVGFibGUoXG4gIC8vICAgICAgIHJvbSwgMHgyODQyMiwgMHgyMiwgMHgyMDAwMCxcbiAgLy8gICAgICAgKGFkZHIsIHBhcnQsIGFkZHJzKSA9PiB7XG4gIC8vICAgICAgICAgLy8gbmVlZCB0byBjb21wdXRlIHRoZSBlbmQgYmFzZWQgb24gdGhlIGFycmF5P1xuICAvLyAgICAgICAgIGNvbnN0IGNvdW50ID0gcGFydCA9PT0gMHgyMSA/IDMgOiAoYWRkcnNbcGFydCArIDFdIC0gYWRkcikgPj4+IDE7XG4gIC8vICAgICAgICAgLy8gb2Zmc2V0OiBiYW5rPSQxNSA9PiAkMjAwMDAsIGJhbms9JDE2ID0+ICQyMjAwMCwgYmFuaz0kMTcgPT4gJDI0MDAwXG4gIC8vICAgICAgICAgLy8gc3VidHJhY3QgJGEwMDAgYmVjYXVzZSB0aGF0J3MgdGhlIHBhZ2Ugd2UncmUgbG9hZGluZyBhdC5cbiAgLy8gICAgICAgICByZXR1cm4gbmV3IEFkZHJlc3NUYWJsZShcbiAgLy8gICAgICAgICAgICAgcm9tLCBhZGRyLCBjb3VudCwgKHRoaXMuYmFua3NbcGFydF0gPDwgMTMpIC0gMHhhMDAwLFxuICAvLyAgICAgICAgICAgICAobSwgaWQpID0+IG5ldyBNZXNzYWdlKHRoaXMsIHBhcnQsIGlkLCBtLCBhZGRyICsgMiAqIGlkKSk7XG4gIC8vICAgICAgIH0pO1xuICB9XG5cbiAgLy8gRmxhdHRlbnMgdGhlIG1lc3NhZ2VzLiAgTk9URTogcmV0dXJucyB1bnVzZWQgbWVzc2FnZXMuXG4gICogbWVzc2FnZXModXNlZD86IHtoYXM6IChtaWQ6IHN0cmluZykgPT4gYm9vbGVhbn0pOiBJdGVyYWJsZTxNZXNzYWdlPiB7XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMucGFydHMpIHtcbiAgICAgIGlmICh1c2VkKSB7XG4gICAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiBwYXJ0KSB7XG4gICAgICAgICAgaWYgKHVzZWQuaGFzKG1lc3NhZ2UubWlkKSkgeWllbGQgbWVzc2FnZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeWllbGQgKiBwYXJ0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgYSBtYXAgZnJvbSBtZXNzYWdlIGlkIChtaWQpIHRvIGtub3duIHVzYWdlcy5cbiAgdXNlcygpOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4ge1xuICAgIGNvbnN0IG91dCA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgICBmdW5jdGlvbiB1c2UobWVzc2FnZTogTWVzc2FnZUlkIHwgc3RyaW5nLCB1c2FnZTogc3RyaW5nKSB7XG4gICAgICBjb25zdCBzdHIgPSB0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZycgPyBtZXNzYWdlIDogbWVzc2FnZS5taWQ7XG4gICAgICBjb25zdCBzZXQgPSBvdXQuZ2V0KHN0cikgfHwgbmV3IFNldCgpO1xuICAgICAgc2V0LmFkZCh1c2FnZSk7XG4gICAgICBvdXQuc2V0KHN0ciwgc2V0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMucm9tLnRyaWdnZXJzKSB7XG4gICAgICBpZiAodHJpZ2dlci5tZXNzYWdlLm5vbnplcm8oKSkge1xuICAgICAgICB1c2UodHJpZ2dlci5tZXNzYWdlLCBgVHJpZ2dlciAkJHtoZXgodHJpZ2dlci5pZCl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCBtIG9mIGl0ZW0uaXRlbVVzZU1lc3NhZ2VzKCkpIHtcbiAgICAgICAgaWYgKG0ubm9uemVybygpKSB1c2UobSwgYEl0ZW0gJCR7aGV4KGl0ZW0uaWQpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLnJvbS5ucGNzKSB7XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgICAgdXNlKGQubWVzc2FnZSwgYE5QQyAkJHtoZXgobnBjLmlkKX1gKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2wsIGRzXSBvZiBucGMubG9jYWxEaWFsb2dzKSB7XG4gICAgICAgIGNvbnN0IGxoID0gbCA+PSAwID8gYCBAICQke2hleChsKX1gIDogJyc7XG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuICAgICAgICAgIHVzZShkLm1lc3NhZ2UsIGBOUEMgJCR7aGV4KG5wYy5pZCl9JHtsaH1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNhZ2Ugb2YgdGhpcy5yb20udGVsZXBhdGh5LnNhZ2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IGQgb2Ygc2FnZS5kZWZhdWx0TWVzc2FnZXMpIHtcbiAgICAgICAgdXNlKGQsIGBUZWxlcGF0aHkgJHtzYWdlLnNhZ2V9YCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGcgb2Ygc2FnZS5tZXNzYWdlR3JvdXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgWywgLi4ubXNdIG9mIGcubWVzc2FnZXMpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IG0gb2YgbXMpIHtcbiAgICAgICAgICAgIHVzZShtISwgYFRlbGVwYXRoeSAke3NhZ2Uuc2FnZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBtIG9mIEhBUkRDT0RFRF9NRVNTQUdFUykge1xuICAgICAgdXNlKG0sICdIYXJkY29kZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIGJ1aWxkQWJicmV2aWF0aW9uVGFibGUodXNlcyA9IHRoaXMudXNlcygpKTogQWJicmV2aWF0aW9uW10ge1xuICAgIC8vIENvdW50IGZyZXF1ZW5jaWVzIG9mIHVzZWQgc3VmZml4ZXMuXG4gICAgaW50ZXJmYWNlIFN1ZmZpeCB7XG4gICAgICAvLyBBY3R1YWwgc3RyaW5nXG4gICAgICBzdHI6IHN0cmluZztcbiAgICAgIC8vIFRvdGFsIG51bWJlciBvZiBieXRlcyBzYXZlZCBvdmVyIGFsbCBvY2N1cnJlbmNlc1xuICAgICAgc2F2aW5nOiBudW1iZXI7XG4gICAgICAvLyBBbGwgdGhlIGluaXRpYWwgd29yZHMgdGhpcyBpcyBpbiAobm90IGNvdW50aW5nIGNoYWlucylcbiAgICAgIHdvcmRzOiBTZXQ8bnVtYmVyPjtcbiAgICAgIC8vIE51bWJlciBvZiBjaGFpbnNcbiAgICAgIGNoYWluczogbnVtYmVyO1xuICAgICAgLy8gTnVtYmVyIG9mIGxldHRlcnMgbWlzc2luZyBmcm9tIHRoZSBmaXJzdCB3b3JkXG4gICAgICBtaXNzaW5nOiBudW1iZXI7XG4gICAgfVxuICAgIGludGVyZmFjZSBXb3JkIHtcbiAgICAgIC8vIEFjdHVhbCBzdHJpbmdcbiAgICAgIHN0cjogc3RyaW5nO1xuICAgICAgLy8gSW5kZXggaW4gbGlzdFxuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIC8vIFRoZSBjaGFpbmFibGUgcHVuY3R1YXRpb24gYWZ0ZXIgdGhpcyB3b3JkIChzcGFjZSBvciBhcG9zdHJvcGhlKVxuICAgICAgY2hhaW46IHN0cmluZztcbiAgICAgIC8vIFBvc3NpYmxlIGJ5dGVzIHRvIGJlIHNhdmVkXG4gICAgICBieXRlczogbnVtYmVyO1xuICAgICAgLy8gTnVtYmVyIG9mIGNoYXJhY3RlcnMgY3VycmVudGx5IGJlaW5nIGNvbXByZXNzZWRcbiAgICAgIHVzZWQ6IG51bWJlcjtcbiAgICAgIC8vIEFsbCBzdWZmaXhlcyB0aGF0IHRvdWNoIHRoaXMgd29yZFxuICAgICAgc3VmZml4ZXM6IFNldDxTdWZmaXg+O1xuICAgICAgLy8gTWVzc2FnZSBJRFxuICAgICAgbWlkOiBzdHJpbmc7XG4gICAgfVxuXG4gICAgLy8gT3JkZXJlZCBsaXN0IG9mIHdvcmRzXG4gICAgY29uc3Qgd29yZHM6IFdvcmRbXSA9IFtdO1xuICAgIC8vIEtlZXAgdHJhY2sgb2YgYWRkcmVzc2VzIHdlJ3ZlIHNlZW4sIG1hcHBpbmcgdG8gbWVzc2FnZSBJRHMgZm9yIGFsaWFzaW5nLlxuICAgIGNvbnN0IGFkZHJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAvLyBBbGlhc2VzIG1hcHBpbmcgbXVsdGlwbGUgbWVzc2FnZSBJRHMgdG8gYWxyZWFkeS1zZWVuIG9uZXMuXG4gICAgY29uc3QgYWxpYXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG5cbiAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgdGhpcy5tZXNzYWdlcyh1c2VzKSkge1xuICAgICAgLy8gVE9ETyAtIGNhbid0IGxhbmQgcmVmbG93IHVudGlsIHdlIGhhdmUgbGlwc3VtIHRleHQuXG4gICAgICBtZXNzYWdlLmZpeFRleHQoKTtcbiAgICAgIGNvbnN0IG1pZCA9IG1lc3NhZ2UubWlkO1xuICAgICAgLy8gRG9uJ3QgcmVhZCB0aGUgc2FtZSBtZXNzYWdlIHR3aWNlLlxuICAgICAgY29uc3Qgc2VlbiA9IGFkZHJzLmdldChtZXNzYWdlLnRleHQpO1xuICAgICAgY29uc3QgYWxpYXNlcyA9IHNlZW4gIT0gbnVsbCAmJiBhbGlhcy5nZXQoc2Vlbik7XG4gICAgICBpZiAoYWxpYXNlcykge1xuICAgICAgICBhbGlhc2VzLnB1c2gobWlkKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBhZGRycy5zZXQobWVzc2FnZS50ZXh0LCBtaWQpO1xuICAgICAgYWxpYXMuc2V0KG1pZCwgW10pO1xuICAgICAgLy8gU3BsaXQgdXAgdGhlIG1lc3NhZ2UgdGV4dCBpbnRvIHdvcmRzLlxuICAgICAgY29uc3QgdGV4dCA9IG1lc3NhZ2UudGV4dDtcbiAgICAgIGxldCBsZXR0ZXJzID0gW107XG5cbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0ZXh0Lmxlbmd0aDsgaSA8PSBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBjID0gdGV4dFtpXTtcbiAgICAgICAgY29uc3QgY2xvc2VyID0gQ0xPU0VSU1tjXTtcbiAgICAgICAgaWYgKFBVTkNUVUFUSU9OW2NdIHx8IGNsb3NlciB8fCBpID09PSBsZW4pIHtcbiAgICAgICAgICAvLyBpZiB0aGUgbmV4dCBjaGFyYWN0ZXIgaXMgbm9uLXB1bmN0dWF0aW9uIHRoZW4gaXQgY2hhaW5zXG4gICAgICAgICAgY29uc3QgbmV4dCA9IHRleHRbaSArIDFdO1xuICAgICAgICAgIGlmIChjbG9zZXIpIGkgPSBNYXRoLm1heChpLCB0ZXh0LmluZGV4T2YoY2xvc2VyLCBpKSk7XG4gICAgICAgICAgaWYgKCFsZXR0ZXJzLmxlbmd0aCkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgY2hhaW4gPVxuICAgICAgICAgICAgICAoYyA9PT0gJyAnIHx8IGMgPT09ICdcXCcnKSAmJiBuZXh0ICYmICFQVU5DVFVBVElPTltuZXh0XSA/IGMgOiAnJztcbiAgICAgICAgICBjb25zdCBzdHIgPSBsZXR0ZXJzLmpvaW4oJycpO1xuICAgICAgICAgIGNvbnN0IGlkID0gd29yZHMubGVuZ3RoO1xuICAgICAgICAgIGNvbnN0IGJ5dGVzID0gc3RyLmxlbmd0aCArIChjID09PSAnICcgPyAxIDogMCk7XG4gICAgICAgICAgbGV0dGVycyA9IFtdO1xuICAgICAgICAgIHdvcmRzLnB1c2goXG4gICAgICAgICAgICAgIHtzdHIsIGlkLCBjaGFpbiwgYnl0ZXMsIHVzZWQ6IDAsIHN1ZmZpeGVzOiBuZXcgU2V0KCksIG1pZH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldHRlcnMucHVzaChjKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgbWFwIG9mIHN0cmluZyB0byBzdWZmaXhcbiAgICBjb25zdCBzdWZmaXhlcyA9IG5ldyBNYXA8c3RyaW5nLCBTdWZmaXg+KCk7XG4gICAgZm9yIChsZXQgaSA9IHdvcmRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAvLyBGb3IgZWFjaCB3b3JkXG4gICAgICBjb25zdCB3b3JkID0gd29yZHNbaV07XG4gICAgICBmb3IgKGxldCBqID0gd29yZC5ieXRlcyAtIDI7IGogPj0gMDsgai0tKSB7XG4gICAgICAgIC8vIEZvciBlYWNoIHN1ZmZpeFxuICAgICAgICBjb25zdCBzdWZmaXggPSB3b3JkLnN0ci5zdWJzdHJpbmcoaik7XG4gICAgICAgIC8vIEN1cnJlbnQgZnVsbCBzdHJpbmcsIGFkZGluZyBhbGwgdGhlIGNoYWlucyBzbyBmYXJcbiAgICAgICAgbGV0IHN0ciA9IHN1ZmZpeDtcbiAgICAgICAgLy8gTnVtYmVyIG9mIGV4dHJhIGNoYWlucyBhZGRlZFxuICAgICAgICBsZXQgbGVuID0gMDtcbiAgICAgICAgbGV0IGxhdGVyID0gd29yZDtcbiAgICAgICAgbGV0IHNhdmluZyA9IHdvcmQuYnl0ZXMgLSBqIC0gMTtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAvLyBGb3IgaXRzZWxmIGFuZCBlYWNoIGNoYWluYWJsZSB3b3JkIHRoZXJlYWZ0ZXJcbiAgICAgICAgICBsZXQgZGF0YSA9IHN1ZmZpeGVzLmdldChzdHIpO1xuICAgICAgICAgIGlmICghZGF0YSkgc3VmZml4ZXMuc2V0KHN0ciwgKGRhdGEgPSB7Y2hhaW5zOiBsZW4sIG1pc3Npbmc6IGosXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYXZpbmc6IC1zdHIubGVuZ3RoLCBzdHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JkczogbmV3IFNldCgpfSkpO1xuICAgICAgICAgIGRhdGEud29yZHMuYWRkKGkpO1xuICAgICAgICAgIGRhdGEuc2F2aW5nICs9IHNhdmluZztcbiAgICAgICAgICAvLyBMaW5rIHRoZSBzdWZmaXhlc1xuICAgICAgICAgIGZvciAobGV0IGsgPSBsZW47IGsgPj0gMDsgay0tKSB3b3Jkc1tpICsga10uc3VmZml4ZXMuYWRkKGRhdGEpO1xuICAgICAgICAgIGlmICghbGF0ZXIuY2hhaW4pIGJyZWFrO1xuICAgICAgICAgIC8vIElmIHRoZXJlJ3MgYW5vdGhlciB3b3JkIHRvIGNoYWluIHRvLCB0aGVuIGNvbnRpbnVlXG4gICAgICAgICAgc3RyICs9IGxhdGVyLmNoYWluO1xuICAgICAgICAgIGxhdGVyID0gd29yZHNbaSArICgrK2xlbildO1xuICAgICAgICAgIHN0ciArPSBsYXRlci5zdHI7XG4gICAgICAgICAgc2F2aW5nICs9IGxhdGVyLmJ5dGVzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU29ydCB0aGUgc3VmZml4ZXMgdG8gZmluZCB0aGUgbW9zdCBpbXBhY3RmdWxcbiAgICBjb25zdCBpbnZhbGlkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgYWJicjogQWJicmV2aWF0aW9uW10gPSBbXTtcbiAgICBjb25zdCBvcmRlciA9ICh7c2F2aW5nOiBhfTogU3VmZml4LCB7c2F2aW5nOiBifTogU3VmZml4KSA9PiBiIC0gYTtcbiAgICBjb25zdCBzb3J0ZWQgPSBbLi4uc3VmZml4ZXMudmFsdWVzKCldLnNvcnQob3JkZXIpO1xuICAgIGxldCB0YWJsZUxlbmd0aCA9IDA7XG4gICAgd2hpbGUgKHNvcnRlZC5sZW5ndGggJiYgdGFibGVMZW5ndGggPCBNQVhfVEFCTEVfTEVOR1RIKSB7XG4gICAgICAvLyBDaGVjayBpZiB0aGUgc29ydCBvcmRlciBoYXMgYmVlbiBpbnZhbGlkYXRlZCBhbmQgcmVzb3J0XG4gICAgICBpZiAoaW52YWxpZC5oYXMoc29ydGVkWzBdLnN0cikpIHtcbiAgICAgICAgc29ydGVkLnNvcnQob3JkZXIpO1xuICAgICAgICBpbnZhbGlkLmNsZWFyKCk7XG4gICAgICB9XG4gICAgICBjb25zdCB7c3RyLCBzYXZpbmcsIG1pc3NpbmcsIHdvcmRzOiB3cywgY2hhaW5zfSA9IHNvcnRlZC5zaGlmdCgpITtcbiAgICAgIC8vIGZpZ3VyZSBvdXQgaWYgaXQncyB3b3J0aCBhZGRpbmcuLi5cbiAgICAgIGlmIChzYXZpbmcgPD0gMCkgYnJlYWs7XG4gICAgICAvLyBtYWtlIHRoZSBhYmJyZXZpYXRpb25cbiAgICAgIHRhYmxlTGVuZ3RoICs9IHN0ci5sZW5ndGggKyAzO1xuICAgICAgY29uc3QgbCA9IGFiYnIubGVuZ3RoO1xuICAgICAgY29uc3QgbWlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCB3IG9mIHdzKSB7XG4gICAgICAgIGNvbnN0IHdvcmQgPSB3b3Jkc1t3XTtcbiAgICAgICAgZm9yIChjb25zdCBtaWQgb2YgW3dvcmQubWlkLCAuLi4oYWxpYXMuZ2V0KHdvcmQubWlkKSB8fCBbXSldKSB7XG4gICAgICAgICAgbWlkcy5hZGQobWlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYWJici5wdXNoKHtcbiAgICAgICAgYnl0ZXM6IGwgPCAweDgwID8gW2wgKyAweDgwXSA6IFs1LCBsIC0gMHg4MF0sXG4gICAgICAgIG1pZHMsXG4gICAgICAgIC8vIG1lc3NhZ2VzOiBuZXcgU2V0KFsuLi53c10ubWFwKHcgPT4gd29yZHNbd10ubWlkKSksXG4gICAgICAgIHN0cixcbiAgICAgIH0pO1xuXG4gICAgICAvLyBCbGFzdCByYWRpdXM6IGFsbCBvdGhlciBzdWZmaXhlcyByZWxhdGVkIHRvIGFsbCB0b3VjaGVkIHdvcmRzIHNhdmUgbGVzc1xuICAgICAgZm9yIChjb25zdCBpIG9mIHdzKSB7XG4gICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDw9IGNoYWluczsgaysrKSB7XG4gICAgICAgICAgY29uc3Qgd29yZCA9IHdvcmRzW2kgKyBrXTtcbiAgICAgICAgICBjb25zdCB1c2VkID0gd29yZC5ieXRlcyAtICghayA/IG1pc3NpbmcgOiAwKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN1ZmZpeCBvZiB3b3JkLnN1ZmZpeGVzKSB7XG4gICAgICAgICAgICBzdWZmaXguc2F2aW5nIC09ICh1c2VkIC0gd29yZC51c2VkKTtcbiAgICAgICAgICAgIGludmFsaWQuYWRkKHN1ZmZpeC5zdHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3b3JkLnVzZWQgPSB1c2VkOyAvLyB0eXBpY2FsbHkgaW5jcmVhc2VzLi4uXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyB0YWtlcyB1cyBvdmVyIDB4ODAgdGhlbiBhbGwgc3VmZml4ZXMgZ2V0IHVzIG9uZSBsZXNzIGJ5dGUgb2Ygc2F2aW5ncyBwZXIgdXNlXG4gICAgICBpZiAoYWJici5sZW5ndGggPT09IDB4ODApIHtcbiAgICAgICAgZm9yIChjb25zdCBkYXRhIG9mIHN1ZmZpeGVzLnZhbHVlcygpKSB7XG4gICAgICAgICAgZGF0YS5zYXZpbmcgLT0gZGF0YS53b3Jkcy5zaXplO1xuICAgICAgICB9XG4gICAgICAgIHNvcnRlZC5zb3J0KG9yZGVyKTtcbiAgICAgICAgaW52YWxpZC5jbGVhcigpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYWJicjtcbiAgfVxuXG4gIC8qKiBSZWJ1aWxkIHRoZSB3b3JkIHRhYmxlcyBhbmQgbWVzc2FnZSBlbmNvZGluZ3MuICovXG4gIGNvbXByZXNzKCkge1xuICAgIGNvbnN0IHVzZXMgPSB0aGlzLnVzZXMoKTtcbiAgICBjb25zdCB0YWJsZSA9IHRoaXMuYnVpbGRBYmJyZXZpYXRpb25UYWJsZSh1c2VzKTtcbiAgICAvLyBncm91cCBhYmJyZXZpYXRpb25zIGJ5IG1lc3NhZ2UgYW5kIHNvcnQgYnkgbGVuZ3RoLlxuICAgIGNvbnN0IGFiYnJzID0gbmV3IE1hcDxzdHJpbmcsIEFiYnJldmlhdGlvbltdPigpOyAvLyBieSBtaWRcbiAgICB0aGlzLmNvbW1vbldvcmRzLnNwbGljZSgwLCB0aGlzLmNvbW1vbldvcmRzLmxlbmd0aCk7XG4gICAgdGhpcy51bmNvbW1vbldvcmRzLnNwbGljZSgwLCB0aGlzLnVuY29tbW9uV29yZHMubGVuZ3RoKTtcbiAgICBmb3IgKGNvbnN0IGFiYnIgb2YgdGFibGUpIHtcbiAgICAgIGlmIChhYmJyLmJ5dGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB0aGlzLmNvbW1vbldvcmRzW2FiYnIuYnl0ZXNbMF0gJiAweDdmXSA9IGFiYnIuc3RyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5leHRyYVdvcmRzW2FiYnIuYnl0ZXNbMF1dW2FiYnIuYnl0ZXNbMV1dID0gYWJici5zdHI7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG1pZCBvZiBhYmJyLm1pZHMpIHtcbiAgICAgICAgbGV0IGFiYnJMaXN0ID0gYWJicnMuZ2V0KG1pZCk7XG4gICAgICAgIGlmICghYWJickxpc3QpIGFiYnJzLnNldChtaWQsIChhYmJyTGlzdCA9IFtdKSk7XG4gICAgICAgIGFiYnJMaXN0LnB1c2goYWJicik7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgYWJickxpc3Qgb2YgYWJicnMudmFsdWVzKCkpIHtcbiAgICAgIGFiYnJMaXN0LnNvcnQoKHtzdHI6IHtsZW5ndGg6IHh9fTogQWJicmV2aWF0aW9uLCB7c3RyOiB7bGVuZ3RoOiB5fX06IEFiYnJldmlhdGlvbikgPT4geSAtIHgpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgbSBvZiB0aGlzLm1lc3NhZ2VzKHVzZXMpKSB7XG4gICAgICBsZXQgdGV4dCA9IG0udGV4dDtcbiAgICAgIC8vIEZpcnN0IHJlcGxhY2UgYW55IGl0ZW1zIG9yIG90aGVyIG5hbWVzIHdpdGggdGhlaXIgYnl0ZXMuXG4gICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oW1xcW3tdKShbXlxcXX1dKilbXFxdfV0oLnwkKS9nLCAoZnVsbCwgYnJhY2tldCwgaW5zaWRlLCBhZnRlcikgPT4ge1xuICAgICAgICBpZiAoYWZ0ZXIgJiYgIVBVTkNUVUFUSU9OW2FmdGVyXSkgcmV0dXJuIGZ1bGw7XG4gICAgICAgIGlmIChhZnRlciA9PT0gJyAnKSBhZnRlciA9ICcnO1xuICAgICAgICBpZiAoYnJhY2tldCA9PT0gJ1snICYmIGluc2lkZSA9PT0gJzpJVEVNOicpIHtcbiAgICAgICAgICByZXR1cm4gYFs4XSR7YWZ0ZXJ9YDtcbiAgICAgICAgfSBlbHNlIGlmIChicmFja2V0ID09PSAneycgJiYgaW5zaWRlID09PSAnOkhFUk86Jykge1xuICAgICAgICAgIHJldHVybiBgWzRdJHthZnRlcn1gO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZpbmQgdGhlIG51bWJlciBiZWZvcmUgdGhlIGNvbG9uLlxuICAgICAgICBjb25zdCBtYXRjaCA9IC9eKFswLTlhLWZdKyk6Ly5leGVjKGluc2lkZSk7XG4gICAgICAgIGlmICghbWF0Y2gpIHRocm93IG5ldyBFcnJvcihgQmFkIG1lc3NhZ2UgdGV4dDogJHtmdWxsfWApO1xuICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludChtYXRjaFsxXSwgMTYpO1xuICAgICAgICByZXR1cm4gYFske2JyYWNrZXQgPT09ICd7JyA/IDYgOiA3fV1bJHtpZH1dJHthZnRlcn1gO1xuICAgICAgfSk7XG4gICAgICAvLyBOb3cgc3RhcnQgd2l0aCB0aGUgbG9uZ2VzdCBhYmJyZXZpYXRpb24gYW5kIHdvcmsgb3VyIHdheSBkb3duLlxuICAgICAgZm9yIChjb25zdCB7c3RyLCBieXRlc30gb2YgYWJicnMuZ2V0KG0ubWlkKSB8fCBbXSkge1xuICAgICAgICAvLyBOT1RFOiB0d28gc3BhY2VzIGluIGEgcm93IGFmdGVyIGFuIGV4cGFuc2lvbiBtdXN0IGJlIHByZXNlcnZlZCBhcy1pcy5cbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShuZXcgUmVnRXhwKHN0ciArICcoIFsgJjAtOV18LnwkKScsICdnJyksIChmdWxsLCBhZnRlcikgPT4ge1xuICAgICAgICAgIGlmIChhZnRlciAmJiAhUFVOQ1RVQVRJT05bYWZ0ZXJdKSByZXR1cm4gZnVsbDtcbiAgICAgICAgICBpZiAoYWZ0ZXIgPT09ICcgJykgYWZ0ZXIgPSAnJztcbiAgICAgICAgICByZXR1cm4gYnl0ZXMubWFwKGIgPT4gYFske2J9XWApLmpvaW4oJycpICsgYWZ0ZXI7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBidWlsZCB0aGUgZW5jb2RlZCB2ZXJzaW9uXG4gICAgICBjb25zdCBoZXhQYXJ0cyA9IFsnWzAxXSddO1xuICAgICAgY29uc3QgYnMgPSBbXTtcbiAgICAgIGJzLnB1c2goMSk7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdGV4dC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBjID0gdGV4dFtpXTtcbiAgICAgICAgaWYgKGMgPT09IE1lc3NhZ2VzLkNPTlRJTlVFRCkge1xuICAgICAgICAgIGJzLnB1c2goMywgMSk7XG4gICAgICAgICAgaGV4UGFydHMucHVzaCgnWzAzXVswMV0nKTtcbiAgICAgICAgICBpZiAodGV4dFtpICsgMV0gPT09ICdcXG4nKSBpKys7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1xcbicpIHtcbiAgICAgICAgICBicy5wdXNoKDIpO1xuICAgICAgICAgIGlmICh0ZXh0W2kgKyAxXSA9PT0gJyAnKSBpKys7XG4gICAgICAgICAgaGV4UGFydHMucHVzaCgnWzAyXScpO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdbJykge1xuICAgICAgICAgIGNvbnN0IGogPSB0ZXh0LmluZGV4T2YoJ10nLCBpKTtcbiAgICAgICAgICBpZiAoaiA8PSAwKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXh0OiAke3RleHR9YCk7XG4gICAgICAgICAgY29uc3QgYiA9IE51bWJlcih0ZXh0LnN1YnN0cmluZyhpICsgMSwgaikpO1xuICAgICAgICAgIGlmIChpc05hTihiKSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGV4dDogJHt0ZXh0fWApO1xuICAgICAgICAgIGJzLnB1c2goYik7XG4gICAgICAgICAgaGV4UGFydHMucHVzaChgWyR7aGV4KGIpfV1gKTtcbiAgICAgICAgICBpID0gajtcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnICcgJiYgdGV4dFtpICsgMV0gPT09ICcgJykge1xuICAgICAgICAgIGxldCBqID0gaSArIDI7XG4gICAgICAgICAgd2hpbGUgKHRleHRbal0gPT09ICcgJykgaisrO1xuICAgICAgICAgIGJzLnB1c2goOSwgaiAtIGkpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goYFswOV1bJHtoZXgoaiAtIGkpfV1gKTtcbiAgICAgICAgICBpID0gaiAtIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnMucHVzaChjLmNoYXJDb2RlQXQoMCkpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJzLnB1c2goMCk7XG4gICAgICBoZXhQYXJ0cy5wdXNoKCdbMF0nKTtcbiAgICAgIG0uYnl0ZXMgPSBicztcbiAgICAgIG0uaGV4ID0gaGV4UGFydHMuam9pbignJyk7XG5cbiAgICAgIC8vIEZpZ3VyZSBvdXQgd2hpY2ggcGFnZSBpdCBuZWVkcyB0byBiZSBvblxuICAgICAgLy8gY29uc3QgYmFuayA9IHRoaXMuYmFua3NbbS5wYXJ0XSA8PCAxMztcbiAgICAgIC8vIGNvbnN0IG9mZnNldCA9IGJhbmsgLSAweGEwMDA7XG4gICAgfVxuICB9XG5cbiAgd3JpdGUoKTogTW9kdWxlW10ge1xuICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICBmcmVlKGEsICQxNCwgICAweDgwMDAsIDB4ODUwMCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg4NTIwLCAweDg1MjgpO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4ODU4NiwgMHg4NTkzKTtcbiAgICBmcmVlKGEsICQxNCwgICAweDg5MDAsIDB4OTQwMCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg5Njg1LCAweDk3MDYpO1xuICAgIC8vZnJlZShhLCAnMTQnLCAgIDB4OWI0ZSwgMHg5YzAwKTtcbiAgICBmcmVlKGEsICQxNCwgICAweDllODAsIDB4YTAwMCk7XG4gICAgZnJlZShhLCAkMTUsICAgMHhhMDAwLCAweGMwMDApO1xuICAgIGZyZWUoYSwgJDE2X2EsIDB4YTAwMCwgMHhjMDAwKTtcbiAgICBmcmVlKGEsICQxNywgICAweGEwMDAsIDB4YmMwMCk7XG4gICAgLy8gcGxhbjogYW5hbHl6ZSBhbGwgdGhlIG1zZXNhZ2VzLCBmaW5kaW5nIGNvbW1vbiBzdWZmaXhlcy5cbiAgICAvLyBlbGlnaWJsZSBzdWZmaXhlcyBtdXN0IGJlIGZvbGxvd2VkIGJ5IGVpdGhlciBzcGFjZSwgcHVuY3R1YXRpb24sIG9yIGVvbFxuICAgIC8vIHRvZG8gLSByZWZvcm1hdC9mbG93IG1lc3NhZ2VzIGJhc2VkIG9uIGN1cnJlbnQgc3Vic3RpdHV0aW9uIGxlbmd0aHNcblxuICAgIC8vIGJ1aWxkIHVwIGEgc3VmZml4IHRyaWUgYmFzZWQgb24gdGhlIGFiYnJldmlhdGlvbnMuXG4gICAgLy8gY29uc3QgdHJpZSA9IG5ldyBTdWZmaXhUcmllPG51bWJlcltdPigpO1xuICAgIC8vIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0YWJsZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIC8vICAgdHJpZS5zZXQodGFibGVbaV0uc3RyLCBpIDwgMHg4MCA/IFtpICsgMHg4MF0gOiBbNSwgaSAtIDB4ODBdKTtcbiAgICAvLyB9XG5cbiAgICAvLyB3cml0ZSB0aGUgYWJicmV2aWF0aW9uIHRhYmxlcyAoYWxsLCByZXdyaXRpbmcgaGFyZGNvZGVkIGNvZGVyZWZzKVxuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvZGVyZWYocHRyOiBBZGRyZXNzLCBiYXNlOiBFeHByLCAuLi5vZmZzZXRzOiBudW1iZXJbXSkge1xuICAgICAgcHRyLmxvYyhhKTtcbiAgICAgIGEud29yZChiYXNlKTtcbiAgICAgIC8vIHNlY29uZCByZWYgKHVzdWFsbHkgNSBieXRlcyBsYXRlcilcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGZvciAoY29uc3Qgb2Zmc2V0IG9mIG9mZnNldHMpIHtcbiAgICAgICAgcHRyLnBsdXMob2Zmc2V0KS5sb2MoYSk7XG4gICAgICAgIGEud29yZCh7b3A6ICcrJywgYXJnczogW2Jhc2UsIHtvcDogJ251bScsIG51bTogKytpfV19KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaXJzdCBzdGVwOiB3cml0ZSB0aGUgbWVzc2FnZXMuXG4gICAgY29uc3QgYWRkcmVzc2VzOiBFeHByW11bXSA9IHNlcSh0aGlzLnBhcnRDb3VudCwgKCkgPT4gW10pXG4gICAgZm9yIChsZXQgcGFydElkID0gMDsgcGFydElkIDwgdGhpcy5wYXJ0Q291bnQ7IHBhcnRJZCsrKSB7XG4gICAgICBjb25zdCBwYXJ0QWRkcnMgPSBhZGRyZXNzZXNbcGFydElkXTtcbiAgICAgIGNvbnN0IHBhcnQgPSB0aGlzLnBhcnRzW3BhcnRJZF07XG4gICAgICBjb25zdCBiYW5rID0gdGhpcy5iYW5rc1twYXJ0SWRdO1xuICAgICAgY29uc3Qgc2VnbWVudCA9IFNFR01FTlRTW2JhbmtdO1xuICAgICAgYS5zZWdtZW50KHNlZ21lbnQubmFtZSk7XG4gICAgICBmb3IgKGNvbnN0IG0gb2YgcGFydCkge1xuICAgICAgICBhLnJlbG9jKGBNZXNzYWdlXyR7bS5taWR9YCk7XG4gICAgICAgIHBhcnRBZGRycy5wdXNoKGEucGMoKSk7XG4gICAgICAgIGEuYnl0ZSguLi5tLmJ5dGVzLCAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgd3JpdGUgYSBzaW5nbGUgY2h1bmsgd2l0aCBhbGwgdGhlIHBhcnRzLlxuICAgIGNvbnN0IHBhcnRUYWJsZXM6IEV4cHJbXSA9IFtdO1xuICAgIGEuc2VnbWVudCgkMTQubmFtZSk7XG4gICAgYS5yZWxvYyhgTWVzc2FnZXNUYWJsZWApO1xuICAgIGZvciAobGV0IHBhcnRJZCA9IDA7IHBhcnRJZCA8IHRoaXMucGFydENvdW50OyBwYXJ0SWQrKykge1xuICAgICAgcGFydFRhYmxlcy5wdXNoKGEucGMoKSk7XG4gICAgICBhLndvcmQoLi4uYWRkcmVzc2VzW3BhcnRJZF0pO1xuICAgIH1cbiAgICBjb25zdCBiYW5rVGFibGUgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLnRoaXMuYmFua3MpO1xuXG4gICAgYS5yZWxvYyhgTWVzc2FnZVBhcnRzYCk7XG4gICAgY29uc3QgcGFydHNUYWJsZSA9IGEucGMoKTtcbiAgICBhLndvcmQoLi4ucGFydFRhYmxlcyk7XG5cbiAgICAvLyBGaW5hbGx5IHVwZGF0ZSB0aGUgYmFuayBhbmQgcGFydHMgcG9pbnRlcnMuXG4gICAgdXBkYXRlQ29kZXJlZihCQU5LU19QVFIsIGJhbmtUYWJsZSk7XG4gICAgdXBkYXRlQ29kZXJlZihCQU5LU19QVFIyLCBiYW5rVGFibGUpO1xuICAgIHVwZGF0ZUNvZGVyZWYoUEFSVFNfUFRSLCBwYXJ0c1RhYmxlLCA1KTtcblxuICAgIC8vIE5vdyB3cml0ZSB0aGUgd29yZHMgdGFibGVzLlxuICAgIGNvbnN0IHdvcmRUYWJsZXMgPSBbXG4gICAgICBbYENvbW1vbldvcmRzYCwgdGhpcy5jb21tb25Xb3JkcywgW0NPTU1PTl9XT1JEU19CQVNFX1BUUl1dLFxuICAgICAgW2BVbmNvbW1vbldvcmRzYCwgdGhpcy51bmNvbW1vbldvcmRzLCBbVU5DT01NT05fV09SRFNfQkFTRV9QVFJdXSxcbiAgICAgIFtgUGVyc29uTmFtZXNgLCB0aGlzLnBlcnNvbk5hbWVzLCBbUEVSU09OX05BTUVTX0JBU0VfUFRSXV0sXG4gICAgICBbYEl0ZW1OYW1lc2AsIHRoaXMuaXRlbU5hbWVzLCBbSVRFTV9OQU1FU19CQVNFX1BUUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJVEVNX05BTUVTX0JBU0VfUFRSMl1dLFxuICAgIF0gYXMgY29uc3Q7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgd29yZHMsIHB0cnNdIG9mIHdvcmRUYWJsZXMpIHtcbiAgICAgIGNvbnN0IGFkZHJzOiAobnVtYmVyfEV4cHIpW10gPSBbXTtcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGZvciAoY29uc3Qgd29yZCBvZiB3b3Jkcykge1xuICAgICAgICBpZiAoIXdvcmQpIHtcbiAgICAgICAgICBhZGRycy5wdXNoKDApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGEucmVsb2MoYCR7bmFtZX1fJHtoZXgoaSsrKX1gKTtcbiAgICAgICAgYWRkcnMucHVzaChhLnBjKCkpO1xuICAgICAgICBhLmJ5dGUod29yZCwgMCk7XG4gICAgICB9XG4gICAgICBhLnJlbG9jKG5hbWUpO1xuICAgICAgY29uc3QgYmFzZSA9IGEucGMoKTtcbiAgICAgIGEud29yZCguLi5hZGRycyk7XG4gICAgICBmb3IgKGNvbnN0IHB0ciBvZiBwdHJzKSB7XG4gICAgICAgIHVwZGF0ZUNvZGVyZWYocHRyLCBiYXNlLCA1KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFthLm1vZHVsZSgpXTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgQWJicmV2aWF0aW9uIHtcbiAgLy8gQnl0ZXMgdG8gYWJicmV2aWF0ZSB0by5cbiAgYnl0ZXM6IG51bWJlcltdO1xuICAvLyBNSURzIG9mIHRoZSBtZXNzYWdlcyB0byBhYmJyZXZpYXRlLlxuICBtaWRzOiBTZXQ8c3RyaW5nPjtcbiAgLy8gRXhwYW5kZWQgdGV4dC5cbiAgc3RyOiBzdHJpbmc7XG59XG5cbi8vIE1heCBsZW5ndGggZm9yIHdvcmRzIHRhYmxlLiAgVmFuaWxsYSBhbGxvY2F0ZXMgOTMyIGJ5dGVzLCBidXQgdGhlcmUnc1xuLy8gYW4gZXh0cmEgNDQ4IGF2YWlsYWJsZSBpbW1lZGlhdGVseSBiZW5lYXRoLiAgRm9yIG5vdyB3ZSdsbCBwaWNrIGEgcm91bmRcbi8vIG51bWJlcjogMTIwMC5cbmNvbnN0IE1BWF9UQUJMRV9MRU5HVEggPSAxMjUwO1xuXG4vLyBjb25zdCBQVU5DVFVBVElPTl9SRUdFWCA9IC9bXFwwICFcXFxcLC46Oz9fLV0vZztcbi8vIGNvbnN0IE9QRU5FUlM6IHtbY2xvc2U6IHN0cmluZ106IHN0cmluZ30gPSB7J30nOiAneycsICddJzogJ1snfTtcbmNvbnN0IENMT1NFUlM6IHtbb3Blbjogc3RyaW5nXTogc3RyaW5nfSA9IHsneyc6ICd9JywgJ1snOiAnXSd9O1xuXG4vLyBNZXNzYWdlIE1JRHMgdGhhdCBhcmUgaGFyZGNvZGVkIGluIHZhcmlvdXMgcGxhY2VzLlxuZXhwb3J0IGNvbnN0IEhBUkRDT0RFRF9NRVNTQUdFUzogU2V0PHN0cmluZz4gPSBuZXcgU2V0KFtcbiAgLy8gJzAwOjAwJywgLy8gaW1wb3NzaWJsZSB0byBpZGVudGlmeSB1c2VzXG4gICcyMDoxZCcsIC8vIGVuZGdhbWUgbWVzc2FnZSAxLCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlOFxuICAnMWI6MGYnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgMiwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZWFcbiAgJzFiOjEwJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDMsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmVjXG4gICcxYjoxMScsIC8vIGVuZGdhbWUgbWVzc2FnZSA0LCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlZVxuICAnMWI6MTInLCAvLyBlbmRnYW1lIG1lc3NhZ2UgNSwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZjBcbiAgJzFiOjA1JywgLy8gYXp0ZWNhIGRpYWxvZyBhZnRlciBkcmF5Z29uMiwgZXhlYyAzN2IyOFxuICAnMWI6MDYnLCAvLyBhenRlY2EgZGlhbG9nIGFmdGVyIGRyYXlnb24yLCBleGVjIDM3YjI4XG4gICcxYjowNycsIC8vIGF6dGVjYSBkaWFsb2cgYWZ0ZXIgZHJheWdvbjIsIGV4ZWMgMzdiMjhcbiAgJzFmOjAwJywgLy8genp6IHBhcmFseXNpcyBkaWFsb2csIGV4ZWMgM2QwZjNcbiAgJzEzOjAwJywgLy8ga2Vuc3Ugc3dhbiBhc2tzIGZvciBsb3ZlIHBlbmRhbnQsIGV4ZWMgM2QxY2FcbiAgJzBiOjAxJywgLy8gYXNpbmEgcmV2ZWFsLCBleGVjIDNkMWViXG4gICcyMDowYycsIC8vIGl0ZW1nZXQgbWVzc2FnZSAneW91IG5vdyBoYXZlJywgZXhlYyAzZDQzY1xuICAnMjA6MGYnLCAvLyB0b28gbWFueSBpdGVtcywgZXhlYyAzZDQ4YVxuICAnMWM6MTEnLCAvLyBzd29yZCBvZiB0aHVuZGVyIHByZS13YXJwIG1lc3NhZ2UsIGV4ZWMgMWM6MTFcbiAgJzBlOjA1JywgLy8gbWVzaWEgcmVjb3JkaW5nLCBleGVjIDNkNjIxXG4gICcxNjowMCcsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWNcbiAgJzE2OjAyJywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5YyAobG9vcClcbiAgJzE2OjA0JywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5YyAobG9vcClcbiAgJzE2OjA2JywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5YyAobG9vcClcbiAgJzIwOjExJywgLy8gZW1wdHkgc2hvcCwgZXhlYyAzZDljNFxuICAnMjE6MDAnLCAvLyB3YXJwIG1lbnUsIGV4ZWMgM2RiNjBcbiAgJzIxOjAyJywgLy8gdGVsZXBhdGh5IG1lbnUsIGV4ZWMgM2RkNmVcbiAgJzIxOjAxJywgLy8gY2hhbmdlIG1lbnUsIGV4ZWMgM2RlY2JcbiAgJzA2OjAwJywgLy8gKHN0KSBrZWxiZXNxdWUgMSBtb25vbG9ndWUsIGV4ZWMgMWU5OWZcbiAgJzE4OjAwJywgLy8gKHN0KSBrZWxiZXNxdWUgMiBtb25vbG9ndWUsIGV4ZWMgMWU5OWZcbiAgJzE4OjAyJywgLy8gKHN0KSBzYWJlcmEgMiBtb25vbG9ndWUsIGV4ZWMgMWVjZTZcbiAgJzE4OjA0JywgLy8gKHN0KSBtYWRvIDIgbW9ub2xvZ3VlLCBleGVjIDFlZTI2XG4gICcxODowOCcsIC8vIChzdCkga2FybWluZSBtb25vbG9ndWUsIGV4ZWMgMWVmOGFcbiAgJzFiOjAzJywgLy8gKHN0KSBzdGF0dWVzIG1vbm9sb2d1ZSwgZXhlYyAxZjBlNVxuICAnMWI6MDAnLCAvLyAoc3QpIGRyYXlnb24gMSBtb25vbG9ndWUsIGV4ZWMgMWYxOTNcbiAgJzFiOjAwJywgLy8gKHN0KSBkcmF5Z29uIDEgbW9ub2xvZ3VlLCBleGVjIDFmMTkzXG4gICcxYjowNCcsIC8vIChzdCkgZHJheWdvbiAyIG1vbm9sb2d1ZSwgZXhlYyAxZjE5M1xuICAnMDY6MDEnLCAvLyAoc3QpIGtlbGJlc3F1ZSAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjFiYlxuICAnMTA6MTMnLCAvLyAoc3QpIHNhYmVyYSAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjFmXG4gICcxOTowNScsIC8vIChzdCkgbWFkbyAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjI1XG4gICcyMDoxNCcsIC8vIChzdCkga2VsYmVzcXVlIDEgbGVmdCBjaGVzdCwgZXhlYyAxZjdhMywgdGFibGUgMWY3Y2JcbiAgJzIwOjE1JywgLy8gKHN0KSBzYWJlcmEgMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdkNVxuICAnMjA6MTcnLCAvLyAoc3QpIG1hZG8gMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdkYVxuICAnMjA6MDInLCAvLyAoc3QpIGN1cmUgc3RhdHVzIGFpbG1lbnQsIGV4ZWMgMjdiOTBcbiAgJzIwOjBkJywgLy8gKHN0KSBsZXZlbCB1cCwgZXhlYyAzNTFlMlxuICAnMjA6MTknLCAvLyAoc3QpIHBvaXNvbmVkLCBleGVjIDM1MmFhXG4gICcyMDoxYScsIC8vIChzdCkgcGFyYWx5emVkLCBleGVjIDM1MmRmXG4gICcyMDoxYicsIC8vIChzdCkgc3RvbmVkLCBleGVjIDM1MzE3XG4gICcwMzowMScsIC8vIChzdCkgbGVhcm4gdGVsZXBhdGh5LCBleGVjIDM1MmNjXG4gICcwMzowMicsIC8vIChzdCkgZmFpbCB0byBsZWFybiB0ZWxlcGF0aHksIGV4ZWMgMzUyZThcbiAgJzEwOjEwJywgLy8gKHN0KSBmYWtlIG1lc2lhIG1lc3NhZ2UgMSwgZXhlYyAzNjViMVxuICAnMTA6MTEnLCAvLyAoc3QpIGZha2UgbWVzaWEgbWVzc2FnZSAyLCBleGVjIDM2NWIxXG4gICcxMDoxMicsIC8vIChzdCkgZmFrZSBtZXNpYSBtZXNzYWdlIDMsIGV4ZWMgMzY1YjFcbiAgJzBjOjA0JywgLy8gKHN0KSBkaXNtb3VudCBkb2xwaGluIChub3QgaW5zaWRlIEVTSSBjYXZlKSwgZXhlYyAzNjYwOVxuICAnMGM6MDUnLCAvLyAoc3QpIGRpc21vdW50IGRvbHBoaW4gKGV2ZXJ5d2hlcmUgaW4gbmVhciBFU0kpLCBleGVjIDM2NjA5XG4gICcwMzowMycsIC8vIChzdCkgc3RhcnQgc3RvbSBmaWdodCwgZXhlYyAzNjcxNlxuICAnMjA6MGUnLCAvLyAoc3QpIGluc3VmZmljaWVudCBtYWdpYyBmb3Igc3BlbGwsIGV4ZWMgM2NjMjNcbiAgJzIwOjEzJywgLy8gKHN0KSBub3RoaW5nIGhhcHBlbnMgaXRlbSB1c2Ugb2VyciwgZXhlYyAzZDUyYVxuXSk7XG4iXX0=