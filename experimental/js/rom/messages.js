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
                a.reloc(`Message_${m.mid()}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxPQUFPLEVBQVEsT0FBTyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQ3ZDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTNDLE1BQU0sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUM7QUEwQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUluRSxNQUFNLE9BQU87SUFPWCxZQUFxQixRQUFrQixFQUNsQixJQUFZLEVBQ1osRUFBVSxFQUNuQixNQUFjLEVBQ2QsS0FBa0I7UUFKVCxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBTi9CLFVBQUssR0FBYSxFQUFFLENBQUM7UUFDckIsUUFBRyxHQUFXLEVBQUUsQ0FBQztRQVVmLE1BQU0sR0FBRyxHQUFpQixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxF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Q0FBQyxDQUFDLENBQUM7YUFDN0I7U0FDRjtRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDOztBQXpmZSxrQkFBUyxHQUFHLEdBQUcsQ0FBQztBQXdnQmxDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0FBSTlCLE1BQU0sT0FBTyxHQUE2QixFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDO0FBRy9ELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFnQixJQUFJLEdBQUcsQ0FBQztJQUVyRCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztDQUNSLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RXhwcn0gZnJvbSAnLi4vYXNtL2V4cHIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge01lc3NhZ2VJZH0gZnJvbSAnLi9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtBZGRyZXNzLCBEYXRhLCBTZWdtZW50LCBoZXgsIHJlYWRTdHJpbmcsXG4gICAgICAgIHNlcSwgZnJlZSwgdHVwbGV9IGZyb20gJy4vdXRpbC5qcyc7XG5cbmNvbnN0IHskMTQsICQxNSwgJDE2X2EsICQxN30gPSBTZWdtZW50O1xuXG4vLyBpbXBvcnQge1N1ZmZpeFRyaWV9IGZyb20gJy4uL3V0aWwuanMnO1xuXG4vLyBjbGFzcyBEYXRhVGFibGU8VD4gZXh0ZW5kcyBBcnJheTxUPiB7XG5cbi8vICAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGJhc2U6IEFkZHJlc3MsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGNvdW50OiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IHdpZHRoOiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIC8vIFRPRE8gLSB3aGF0IHdhcyB0aGlzIHN1cHBvc2VkIHRvIGJlPyE/XG4vLyAgICAgICAgICAgICAgIGZ1bmM6ICguLi54OiBudW1iZXJbXSkgPT4gVCA9XG4vLyAgICAgICAgICAgICAgICAgICB3aWR0aCA+IDEgPyAoLi4uaSkgPT4gaSBhcyBhbnkgOiBpID0+IGkgYXMgYW55KSB7XG4vLyAgICAgc3VwZXIoY291bnQpO1xuLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuLy8gICAgICAgdGhpc1tpXSA9IGZ1bmMoLi4uc2xpY2Uocm9tLnByZywgYmFzZSArIGkgKiB3aWR0aCwgd2lkdGgpKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuLy8gY2xhc3MgQWRkcmVzc1RhYmxlPFQ+IGV4dGVuZHMgQXJyYXk8VD4ge1xuXG4vLyAgIHJlYWRvbmx5IGFkZHJlc3NlczogbnVtYmVyW107XG5cbi8vICAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGJhc2U6IEFkZHJlc3MsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGNvdW50OiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IHNlZ21lbnQ6IHN0cmluZyxcbi8vICAgICAgICAgICAgICAgZnVuYzogKHg6IG51bWJlciwgaTogbnVtYmVyLCBhcnI6IG51bWJlcltdKSA9PiBUID0gaSA9PiBpIGFzIGFueSkge1xuLy8gICAgIHN1cGVyKGNvdW50KTtcbi8vICAgICB0aGlzLmFkZHJlc3NlcyA9IHNlcSh0aGlzLmNvdW50LFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgIChpOiBudW1iZXIpID0+IHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGEgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIGJhc2UgKyAyICogaSk7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSAmJiBhICsgb2Zmc2V0O1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIFxuLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuLy8gICAgICAgdGhpc1tpXSA9IGZ1bmModGhpcy5hZGRyZXNzZXNbaV0sIGksIHRoaXMuYWRkcmVzc2VzKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuY29uc3QgREVMSU1JVEVSUyA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KFtbNiwgJ3t9J10sIFs3LCAnW10nXV0pO1xuXG50eXBlIFdvcmRGYWN0b3J5ID0gKGlkOiBudW1iZXIsIGdyb3VwOiBudW1iZXIpID0+IHN0cmluZztcblxuY2xhc3MgTWVzc2FnZSB7XG5cbiAgLy8gVGhpcyBpcyByZWR1bmRhbnQgLSB0aGUgdGV4dCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICBieXRlczogbnVtYmVyW10gPSBbXTtcbiAgaGV4OiBzdHJpbmcgPSAnJzsgLy8gZm9yIGRlYnVnZ2luZ1xuICB0ZXh0OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VzLFxuICAgICAgICAgICAgICByZWFkb25seSBwYXJ0OiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGlkOiBudW1iZXIsXG4gICAgICAgICAgICAgIG9mZnNldDogbnVtYmVyLFxuICAgICAgICAgICAgICB3b3JkczogV29yZEZhY3RvcnkpIHtcblxuICAgIC8vIFBhcnNlIHRoZSBtZXNzYWdlXG4gICAgY29uc3QgcHJnOiBEYXRhPG51bWJlcj4gPSBtZXNzYWdlcy5yb20ucHJnO1xuICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IG9mZnNldDsgb2Zmc2V0ICYmIHByZ1tpXTsgaSsrKSB7XG4gICAgICBjb25zdCBiID0gcHJnW2ldO1xuICAgICAgdGhpcy5ieXRlcy5wdXNoKGIpO1xuICAgICAgaWYgKGIgPT09IDEpIHtcbiAgICAgICAgLy8gTk9URSAtIHRoZXJlIGlzIG9uZSBjYXNlIHdoZXJlIHR3byBtZXNzYWdlcyBzZWVtIHRvIGFidXQgd2l0aG91dCBhXG4gICAgICAgIC8vIG51bGwgdGVybWluYXRvciAtICQyY2E5MSAoJDEyOiQwOCkgZmFsbHMgdGhyb3VnaCBmcm9tIDEyOjA3LiAgV2UgZml4XG4gICAgICAgIC8vIHRoYXQgd2l0aCBhbiBhZGp1c3RtZW50IGluIHJvbS50cywgYnV0IHRoaXMgZGV0ZWN0cyBpdCBqdXN0IGluIGNhc2UuXG4gICAgICAgIGlmIChpICE9PSBvZmZzZXQgJiYgcHJnW2kgLSAxXSAhPT0gMykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBzdGFydCBtZXNzYWdlIHNpZ25hbCBhdCAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDIpIHtcbiAgICAgICAgcGFydHMucHVzaCgnXFxuICcpO1xuICAgICAgfSBlbHNlIGlmIChiID09PSAzKSB7XG4gICAgICAgIHBhcnRzLnB1c2goYCR7TWVzc2FnZXMuQ09OVElOVUVEfVxcbmApOyAvLyBibGFjayBkb3duLXBvaW50aW5nIHRyaWFuZ2xlXG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDQpIHtcbiAgICAgICAgcGFydHMucHVzaCgnezpIRVJPOn0nKTtcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gOCkge1xuICAgICAgICBwYXJ0cy5wdXNoKCdbOklURU06XScpO1xuICAgICAgfSBlbHNlIGlmIChiID49IDUgJiYgYiA8PSA5KSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBwcmdbKytpXTtcbiAgICAgICAgdGhpcy5ieXRlcy5wdXNoKG5leHQpO1xuICAgICAgICBpZiAoYiA9PT0gOSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnLnJlcGVhdChuZXh0KSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGVsaW1zID0gREVMSU1JVEVSUy5nZXQoYik7XG4gICAgICAgIGlmIChkZWxpbXMpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKGRlbGltc1swXSk7XG4gICAgICAgICAgcGFydHMucHVzaChuZXh0LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKTtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCc6Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaCh3b3JkcyhuZXh0LCBiKSk7XG4gICAgICAgIGlmIChkZWxpbXMpIHBhcnRzLnB1c2goZGVsaW1zWzFdKTtcbiAgICAgICAgaWYgKCFQVU5DVFVBVElPTltTdHJpbmcuZnJvbUNoYXJDb2RlKHByZ1tpICsgMV0pXSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiID49IDB4ODApIHtcbiAgICAgICAgcGFydHMucHVzaCh3b3JkcyhiLCAwKSk7XG4gICAgICAgIGlmICghUFVOQ1RVQVRJT05bU3RyaW5nLmZyb21DaGFyQ29kZShwcmdbaSArIDFdKV0pIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCcgJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYiA+PSAweDIwKSB7XG4gICAgICAgIHBhcnRzLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShiKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi1leGhhdXN0aXZlIHN3aXRjaDogJHtifSBhdCAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnRleHQgPSBwYXJ0cy5qb2luKCcnKTtcbiAgfVxuXG4gIG1pZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHtoZXgodGhpcy5wYXJ0KX06JHtoZXgodGhpcy5pZCl9YDtcbiAgfVxuXG4gIC8vIEZpeGVzIHRoZSB0ZXh0IHRvIGVuc3VyZSBpdCBmaXRzIGluIHRoZSBkaWFsb2cgYm94LlxuICAvLyBDb25zdHJhaW50czpcbiAgLy8gIC0gbm8gbGluZSBpcyBsb25nZXIgdGhhbiAyOCBjaGFyYWN0ZXJzXG4gIC8vICAtIGZpcnN0IGxpbmUgYWZ0ZXIgYSBcXG4gaXMgaW5kZW50ZWQgb25lIHNwYWNlXG4gIC8vICAtIHVuY2FwaXRhbGl6ZWQgKHVucHVuY3R1YXRlZD8pIGZpcnN0IGNoYXJhY3RlcnMgYXJlIGluZGVudGVkLCB0b29cbiAgLy8gIC0gd3JhcCBvciB1bndyYXAgYW55IHBlcnNvbiBvciBpdGVtIG5hbWVzXG4gIC8vICAtIGF0IG1vc3QgZm91ciBsaW5lcyBwZXIgbWVzc2FnZSBib3hcbiAgLy8gSWYgYW55IHZpb2xhdGlvbnMgYXJlIGZvdW5kLCB0aGUgZW50aXJlIG1lc3NhZ2UgaXMgcmVmbG93ZWQuXG4gIGZpeFRleHQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY2hlY2tUZXh0KCkpIHJldHVybjtcbiAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgbGluZU51bSA9IDA7XG4gICAgbGV0IGxpbmVMZW4gPSAwO1xuICAgIGxldCBzcGFjZSA9IGZhbHNlO1xuICAgIC8vIFRPRE8gLSBjaGFuZ2Ugd29yZCBpbnRvIHNvbWV0aGluZyBmYW5jaWVyIC0gYW4gYXJyYXkgb2ZcbiAgICAvLyAoc3RyLCBsZW4sIGZhbGxiYWNrKSBzbyB0aGF0IHB1bmN0dWF0aW9uIGFmdGVyIGFuXG4gICAgLy8gZXhwYW5zaW9uIGRvZXNuJ3Qgc2NyZXcgdXMgdXAuXG4gICAgLy8gT1IuLi4ganVzdCBpbnNlcnQgdGhlIGZhbGxiYWNrIGV2ZXJ5IHRpbWUgYW5kIGluc3RlYWQgbWVtb2l6ZVxuICAgIC8vIHRoZSBleHBhbnNpb24gdG8gcmVwbGFjZSBhdCB0aGUgZW5kIGlmIHRoZXJlJ3Mgbm8gYnJlYWsuXG4gICAgbGV0IHdvcmQ6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgZXhwYW5zaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZnVuY3Rpb24gaW5zZXJ0KHN0cjogc3RyaW5nLCBsZW46IG51bWJlciA9IHN0ci5sZW5ndGgpIHtcbiAgICAgIC8vIFRPRE8gLSB3aGF0IGRvIHdlIGRvIHdpdGggZXhpc3RpbmcgcGFnZSBicmVha3M/XG4gICAgICAvLyAgICAgIC0gaWYgd2UgZXZlciBuZWVkIHRvIF9tb3ZlXyBvbmUgdGhlbiB3ZSBzaG91bGQgSUdOT1JFIGl0P1xuICAgICAgLy8gICAgICAtIHNhbWUgd2l0aCBuZXdsaW5lcy4uLlxuICAgICAgLy8gaWYgKHN0ciA9PT0gJyMnKSB7XG4gICAgICAvLyAgIG5ld2xpbmUoKTtcbiAgICAgIC8vICAgcmV0dXJuO1xuICAgICAgLy8gfVxuICAgICAgaWYgKGxpbmVMZW4gKyBsZW4gPiAyOSkgbmV3bGluZSgpO1xuICAgICAgaWYgKHN0ciA9PT0gJyAnKSB7XG4gICAgICAgIHBhcnRzLnB1c2goLi4ud29yZCwgJyAnKTtcbiAgICAgICAgd29yZCA9IFtdO1xuICAgICAgfSBlbHNlIGlmICgvXltbe106Ly50ZXN0KHN0cikpIHtcbiAgICAgICAgd29yZC5wdXNoKHt0b1N0cmluZzogKCkgPT4gc3RyLCBsZW5ndGg6IGxlbn0gYXMgYW55KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdvcmQucHVzaChzdHIpO1xuICAgICAgfVxuICAgICAgbGluZUxlbiArPSBsZW47XG4gICAgICBzcGFjZSA9IHN0ci5lbmRzV2l0aCgnICcpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnNlcnRTcGFjZSgpIHtcbiAgICAgIGlmICghc3BhY2UpIGluc2VydCgnICcpO1xuICAgICAgc3BhY2UgPSB0cnVlO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnNlcnRBbGwoc3RyOiBzdHJpbmcpIHtcbiAgICAgIGNvbnN0IHNwbGl0ID0gc3RyLnNwbGl0KC9cXHMrLyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwbGl0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpKSBpbnNlcnRTcGFjZSgpO1xuICAgICAgICBpbnNlcnQoc3BsaXRbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBuZXdsaW5lKCkge1xuICAgICAgbGluZUxlbiA9IDEgKyB3b3JkLnJlZHVjZSgoYSwgYikgPT4gYSArIGIubGVuZ3RoLCAwKTtcbiAgICAgIGlmICgrK2xpbmVOdW0gPiAzKSB7XG4gICAgICAgIHBhcnRzLnB1c2goJyNcXG4gJyk7XG4gICAgICAgIGxpbmVOdW0gPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFydHMucHVzaCgnXFxuICcpO1xuICAgICAgfVxuICAgICAgc3BhY2UgPSB0cnVlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMudGV4dFtpXTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnRleHRbaSArIDFdO1xuICAgICAgaWYgKC9bXFxzXFxuI10vLnRlc3QoYykpIHtcbiAgICAgICAgaW5zZXJ0U3BhY2UoKTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3snKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnOicpIHtcbiAgICAgICAgICBpbnNlcnQoJ3s6SEVSTzp9JywgNik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29sb24gPSB0aGlzLnRleHQuaW5kZXhPZignOicsIGkpO1xuICAgICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KHRoaXMudGV4dC5zdWJzdHJpbmcoaSArIDEsIGNvbG9uKSwgMTYpO1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLm1lc3NhZ2VzLmV4dHJhV29yZHNbNl1baWRdO1xuICAgICAgICAgIGV4cGFuc2lvbnMuc2V0KG5hbWUsIGB7JHtpZC50b1N0cmluZygxNil9OiR7bmFtZX19YCk7XG4gICAgICAgICAgaW5zZXJ0QWxsKG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0aGlzLnRleHQuaW5kZXhPZignfScsIGkpO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAnWycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICc6Jykge1xuICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5tZXNzYWdlcy5yb20uaXRlbXM7XG4gICAgICAgICAgaW5zZXJ0KCdbOklURU06XScsIE1hdGgubWF4KC4uLml0ZW1zLm1hcChpID0+IGkubWVzc2FnZU5hbWUubGVuZ3RoKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbG9uID0gdGhpcy50ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0aGlzLnRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5tZXNzYWdlcy5yb20uaXRlbXNbaWRdLm1lc3NhZ2VOYW1lO1xuICAgICAgICAgIGV4cGFuc2lvbnMuc2V0KG5hbWUsIGBbJHtpZC50b1N0cmluZygxNil9OiR7bmFtZX1dYCk7XG4gICAgICAgICAgaW5zZXJ0QWxsKG5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0aGlzLnRleHQuaW5kZXhPZignXScsIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5zZXJ0KGMpO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKC4uLndvcmQpO1xuICAgIGxldCB0ZXh0ID0gcGFydHMuam9pbignJyk7XG4gICAgZm9yIChjb25zdCBbZnVsbCwgYWJicl0gb2YgZXhwYW5zaW9ucykge1xuICAgICAgaWYgKHRleHQuaW5jbHVkZXMoZnVsbCkpIHRleHQgPSB0ZXh0LnNwbGl0KGZ1bGwpLmpvaW4oYWJicik7XG4gICAgfVxuICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gIH1cblxuICBjaGVja1RleHQoKTogYm9vbGVhbiB7XG4gICAgbGV0IGxpbmVOdW0gPSAwO1xuICAgIGxldCBsaW5lTGVuID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudGV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgYyA9IHRoaXMudGV4dFtpXTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnRleHRbaSArIDFdO1xuICAgICAgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgIGxpbmVOdW0rKztcbiAgICAgICAgbGluZUxlbiA9IDE7XG4gICAgICAgIGlmIChsaW5lTnVtID4gMykgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIGlmIChjID09PSAnIycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICdcXG4nKSBpKys7IC8vIGVhdCBuZXdsaW5lXG4gICAgICAgIGxpbmVOdW0gPSBsaW5lTGVuID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ3snIHx8IGMgPT09ICdbJykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgaWYgKGMgPT09ICd7JykgeyAvLyB7OkhFUk86fVxuICAgICAgICAgICAgbGluZUxlbiArPSA2O1xuICAgICAgICAgIH0gZWxzZSB7IC8vIFs6SVRFTTpdXG4gICAgICAgICAgICAvLyBjb21wdXRlIHRoZSBtYXggaXRlbSBsZW5ndGhcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gdGhpcy5tZXNzYWdlcy5yb20uaXRlbXM7XG4gICAgICAgICAgICBsaW5lTGVuICs9IE1hdGgubWF4KC4uLml0ZW1zLm1hcChpID0+IGkubWVzc2FnZU5hbWUubGVuZ3RoKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChsaW5lTGVuID4gMjgpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb2xvbiA9IHRoaXMudGV4dC5pbmRleE9mKCc6JywgaSk7XG4gICAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQodGhpcy50ZXh0LnN1YnN0cmluZyhpICsgMSwgY29sb24pLCAxNik7XG4gICAgICAgICAgbGluZUxlbiArPSAoYyA9PT0gJ3snID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tZXNzYWdlcy5leHRyYVdvcmRzWzZdW2lkXSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWVzc2FnZXMucm9tLml0ZW1zW2lkXS5tZXNzYWdlTmFtZSkubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0aGlzLnRleHQuaW5kZXhPZihDTE9TRVJTW2NdLCBpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpbmVMZW4rKztcbiAgICAgIH1cbiAgICAgIGlmIChsaW5lTGVuID4gMjkgJiYgYyAhPT0gJyAnKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbmNvbnN0IFBVTkNUVUFUSU9OOiB7W2NoYXI6IHN0cmluZ106IGJvb2xlYW59ID0ge1xuICAnXFwwJzogdHJ1ZSxcbiAgJyAnOiB0cnVlLFxuICAnISc6IHRydWUsXG4gICdcXCcnOiB0cnVlLFxuICAnLCc6IHRydWUsXG4gICcuJzogdHJ1ZSxcbiAgJzonOiB0cnVlLFxuICAnOyc6IHRydWUsXG4gICc/JzogdHJ1ZSxcbiAgJ18nOiB0cnVlLFxuXG4gIC8vID8/Pz9cbiAgJ1xcbic6IHRydWUsIC8vIGxpbmUgc2VwYXJhdG9yXG4gICcjJzogdHJ1ZSwgIC8vIHBhZ2Ugc2VwYXJhdG9yXG59O1xuXG4vLyBOT1RFOiB0aGUgKzEgdmVyc2lvbiBpcyBhbHdheXMgYXQgKzUgZnJvbSB0aGUgcG9pbnRlclxuY29uc3QgQ09NTU9OX1dPUkRTX0JBU0VfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODcwNCk7XG5jb25zdCBVTkNPTU1PTl9XT1JEU19CQVNFX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg2OGEpO1xuY29uc3QgUEVSU09OX05BTUVTX0JBU0VfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODZkNSk7XG5jb25zdCBJVEVNX05BTUVTX0JBU0VfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODZlOSk7XG5jb25zdCBJVEVNX05BTUVTX0JBU0VfUFRSMiA9IEFkZHJlc3Mub2YoJDE0LCAweDg3ODkpO1xuXG5jb25zdCBCQU5LU19QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NTQxKTtcbmNvbnN0IEJBTktTX1BUUjIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NjRjKTtcbmNvbnN0IFBBUlRTX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg1NGMpO1xuXG5jb25zdCBTRUdNRU5UUzogUmVjb3JkPG51bWJlciwgU2VnbWVudD4gPSB7XG4gIDB4MTU6ICQxNSxcbiAgMHgxNjogJDE2X2EsXG4gIDB4MTc6ICQxNyxcbn07XG5cblxuZXhwb3J0IGNsYXNzIE1lc3NhZ2VzIHtcblxuICAvLyBUT0RPIC0gd2UgbWlnaHQgd2FudCB0byBlbmNvZGUgdGhpcyBpbiB0aGUgc3BhcmUgcm9tIGRhdGFcbiAgcGFydENvdW50OiBudW1iZXIgPSAweDIyO1xuXG4gIGNvbW1vbldvcmRzOiBzdHJpbmdbXSA9IFtdO1xuICB1bmNvbW1vbldvcmRzOiBzdHJpbmdbXSA9IFtdO1xuICBwZXJzb25OYW1lczogc3RyaW5nW10gPSBbXTtcbiAgaXRlbU5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBleHRyYVdvcmRzOiB7W2dyb3VwOiBudW1iZXJdOiBzdHJpbmdbXX07XG4gIGJhbmtzOiBudW1iZXJbXTtcbiAgcGFydHM6IE1lc3NhZ2VbXVtdID0gW107XG5cbiAgLy8gTk9URTogdGhlc2UgZGF0YSBzdHJ1Y3R1cmVzIGFyZSByZWR1bmRhbnQgd2l0aCB0aGUgYWJvdmUuXG4gIC8vIE9uY2Ugd2UgZ2V0IHRoaW5ncyB3b3JraW5nIHNtb290aGx5LCB3ZSBzaG91bGQgY2xlYW4gaXQgdXBcbiAgLy8gdG8gb25seSB1c2Ugb25lIG9yIHRoZSBvdGhlci5cbiAgLy8gYWJicmV2aWF0aW9uczogc3RyaW5nW107XG4gIC8vIHBlcnNvbk5hbWVzOiBzdHJpbmdbXTtcblxuICAvLyBzdGF0aWMgcmVhZG9ubHkgQ09OVElOVUVEID0gJ1xcdTI1YmMnO1xuICBzdGF0aWMgcmVhZG9ubHkgQ09OVElOVUVEID0gJyMnO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgY29uc3QgY29tbW9uV29yZHNCYXNlID0gQ09NTU9OX1dPUkRTX0JBU0VfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgIGNvbnN0IHVuY29tbW9uV29yZHNCYXNlID0gVU5DT01NT05fV09SRFNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgcGVyc29uTmFtZXNCYXNlID0gUEVSU09OX05BTUVTX0JBU0VfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgIGNvbnN0IGl0ZW1OYW1lc0Jhc2UgPSBJVEVNX05BTUVTX0JBU0VfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgIGNvbnN0IGJhbmtzQmFzZSA9IEJBTktTX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICBjb25zdCBwYXJ0c0Jhc2UgPSBQQVJUU19QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG5cbiAgICBjb25zdCBiYXNlczogUmVjb3JkPG51bWJlciwgQWRkcmVzcz4gPSB7XG4gICAgICA1OiB1bmNvbW1vbldvcmRzQmFzZSxcbiAgICAgIDY6IHBlcnNvbk5hbWVzQmFzZSxcbiAgICAgIDc6IGl0ZW1OYW1lc0Jhc2UsXG4gICAgfTtcblxuICAgIC8vY29uc3Qgc3RyID0gKGE6IG51bWJlcikgPT4gcmVhZFN0cmluZyhyb20ucHJnLCBhKTtcbiAgICAvLyBUT0RPIC0gcmVhZCB0aGVzZSBhZGRyZXNzZXMgZGlyZWN0bHkgZnJvbSB0aGUgY29kZSwgaW4gY2FzZSB0aGV5IG1vdmVcbiAgICAvLyB0aGlzLmNvbW1vbldvcmRzID0gbmV3IEFkZHJlc3NUYWJsZShyb20sIGNvbW1vbldvcmRzQmFzZSwgMHg4MCwgMHgyMDAwMCwgc3RyKTtcbiAgICAvLyB1bmNvbW1vbldvcmRzID0gbmV3IEFkZHJlc3NUYWJsZShyb20sIGV4dHJhV29yZHNCYXNlLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAocGVyc29uTmFtZXNCYXNlLm1pbnVzKGV4dHJhV29yZHNCYXNlKSkgPj4+IDEsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICcxMCcsIHN0ciksIC8vIGxlc3MgY29tbW9uXG4gICAgLy8gcGVyc29uTmFtZXMgPSBwZXJzb25OYW1lc0Jhc2UsIDM2LCAnMTAnLCBzdHIpLCAvLyBwZW9wbGUvcGxhY2VzXG4gICAgLy8gaXRlbU5hbWVzID0gbmV3IEFkZHJlc3NUYWJsZShyb20sIGl0ZW1OYW1lc0Jhc2UsIDc0LCAnMTAnLCBzdHIpLCAvLyBpdGVtcyAoYWxzbyA4PylcbiAgICB0aGlzLmV4dHJhV29yZHMgPSB7XG4gICAgICA1OiB0aGlzLnVuY29tbW9uV29yZHMsXG4gICAgICA2OiB0aGlzLnBlcnNvbk5hbWVzLFxuICAgICAgNzogdGhpcy5pdGVtTmFtZXMsXG4gICAgfTtcblxuICAgIGNvbnN0IGdldFdvcmQgPSAoYXJyOiBzdHJpbmdbXSwgYmFzZTogQWRkcmVzcywgaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgbGV0IHdvcmQgPSBhcnJbaW5kZXhdO1xuICAgICAgaWYgKHdvcmQgIT0gbnVsbCkgcmV0dXJuIHdvcmQ7XG4gICAgICB3b3JkID0gcmVhZFN0cmluZyhyb20ucHJnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFzZS5wbHVzKDIgKiBpbmRleCkucmVhZEFkZHJlc3Mocm9tLnByZykub2Zmc2V0KTtcbiAgICAgIHJldHVybiAoYXJyW2luZGV4XSA9IHdvcmQpO1xuICAgIH07XG5cbiAgICAvLyBMYXppbHkgcmVhZCB0aGUgd29yZHNcbiAgICBjb25zdCB3b3JkcyA9IChpZDogbnVtYmVyLCBncm91cDogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAoIWdyb3VwKSByZXR1cm4gZ2V0V29yZCh0aGlzLmNvbW1vbldvcmRzLCBjb21tb25Xb3Jkc0Jhc2UsIGlkIC0gMHg4MCk7XG4gICAgICByZXR1cm4gZ2V0V29yZCh0aGlzLmV4dHJhV29yZHNbZ3JvdXBdLCBiYXNlc1tncm91cF0sIGlkKTtcbiAgICB9O1xuICAgIC8vIGJ1dCBlYWdlcmx5IHJlYWQgaXRlbSBuYW1lc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHg0OSAvKnJvbS5pdGVtcy5sZW5ndGgqLzsgaSsrKSB7XG4gICAgICB3b3JkcyhpLCA3KTtcbiAgICB9XG5cbiAgICAvLyBOT1RFOiB3ZSBtYWludGFpbiB0aGUgaW52YXJpYW50IHRoYXQgdGhlIGJhbmtzIHRhYmxlIGRpcmVjdGx5XG4gICAgLy8gZm9sbG93cyB0aGUgcGFydHMgdGFibGVzLCB3aGljaCBhcmUgaW4gb3JkZXIsIHNvIHRoYXQgd2UgY2FuXG4gICAgLy8gZGV0ZWN0IHRoZSBlbmQgb2YgZWFjaCBwYXJ0LiAgT3RoZXJ3aXNlIHRoZXJlIGlzIG5vIGd1YXJhbnRlZVxuICAgIC8vIGhvdyBsYXJnZSB0aGUgcGFydCBhY3R1YWxseSBpcy5cblxuICAgIGxldCBsYXN0UGFydCA9IGJhbmtzQmFzZS5vZmZzZXQ7XG4gICAgdGhpcy5iYW5rcyA9IHR1cGxlKHJvbS5wcmcsIGxhc3RQYXJ0LCB0aGlzLnBhcnRDb3VudCk7XG4gICAgZm9yIChsZXQgcCA9IHRoaXMucGFydENvdW50IC0gMTsgcCA+PSAwOyBwLS0pIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcGFydHNCYXNlLnBsdXMoMiAqIHApLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgICAgY29uc3QgbGVuID0gKGxhc3RQYXJ0IC0gc3RhcnQub2Zmc2V0KSA+Pj4gMTtcbiAgICAgIGxhc3RQYXJ0ID0gc3RhcnQub2Zmc2V0O1xuICAgICAgY29uc3Qgc2VnID0gU0VHTUVOVFNbdGhpcy5iYW5rc1twXV07XG4gICAgICBjb25zdCBwYXJ0OiBNZXNzYWdlW10gPSB0aGlzLnBhcnRzW3BdID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGFkZHIgPSBzdGFydC5wbHVzKDIgKiBpKS5yZWFkQWRkcmVzcyhyb20ucHJnLCBzZWcpO1xuICAgICAgICBwYXJ0W2ldID0gbmV3IE1lc3NhZ2UodGhpcywgcCwgaSwgYWRkci5vZmZzZXQsIHdvcmRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgLy8gICB0aGlzLnBhcnRzID0gbmV3IEFkZHJlc3NUYWJsZShcbiAgLy8gICAgICAgcm9tLCAweDI4NDIyLCAweDIyLCAweDIwMDAwLFxuICAvLyAgICAgICAoYWRkciwgcGFydCwgYWRkcnMpID0+IHtcbiAgLy8gICAgICAgICAvLyBuZWVkIHRvIGNvbXB1dGUgdGhlIGVuZCBiYXNlZCBvbiB0aGUgYXJyYXk/XG4gIC8vICAgICAgICAgY29uc3QgY291bnQgPSBwYXJ0ID09PSAweDIxID8gMyA6IChhZGRyc1twYXJ0ICsgMV0gLSBhZGRyKSA+Pj4gMTtcbiAgLy8gICAgICAgICAvLyBvZmZzZXQ6IGJhbms9JDE1ID0+ICQyMDAwMCwgYmFuaz0kMTYgPT4gJDIyMDAwLCBiYW5rPSQxNyA9PiAkMjQwMDBcbiAgLy8gICAgICAgICAvLyBzdWJ0cmFjdCAkYTAwMCBiZWNhdXNlIHRoYXQncyB0aGUgcGFnZSB3ZSdyZSBsb2FkaW5nIGF0LlxuICAvLyAgICAgICAgIHJldHVybiBuZXcgQWRkcmVzc1RhYmxlKFxuICAvLyAgICAgICAgICAgICByb20sIGFkZHIsIGNvdW50LCAodGhpcy5iYW5rc1twYXJ0XSA8PCAxMykgLSAweGEwMDAsXG4gIC8vICAgICAgICAgICAgIChtLCBpZCkgPT4gbmV3IE1lc3NhZ2UodGhpcywgcGFydCwgaWQsIG0sIGFkZHIgKyAyICogaWQpKTtcbiAgLy8gICAgICAgfSk7XG4gIH1cblxuICAvLyBGbGF0dGVucyB0aGUgbWVzc2FnZXMuICBOT1RFOiByZXR1cm5zIHVudXNlZCBtZXNzYWdlcy5cbiAgKiBtZXNzYWdlcyh1c2VkPzoge2hhczogKG1pZDogc3RyaW5nKSA9PiBib29sZWFufSk6IEl0ZXJhYmxlPE1lc3NhZ2U+IHtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5wYXJ0cykge1xuICAgICAgaWYgKHVzZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIHBhcnQpIHtcbiAgICAgICAgICBpZiAodXNlZC5oYXMobWVzc2FnZS5taWQoKSkpIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHlpZWxkICogcGFydDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbWFwIGZyb20gbWVzc2FnZSBpZCAobWlkKSB0byBrbm93biB1c2FnZXMuXG4gIHVzZXMoKTogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+IHtcbiAgICBjb25zdCBvdXQgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgZnVuY3Rpb24gdXNlKG1lc3NhZ2U6IE1lc3NhZ2VJZCB8IHN0cmluZywgdXNhZ2U6IHN0cmluZykge1xuICAgICAgY29uc3Qgc3RyID0gdHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnID8gbWVzc2FnZSA6IG1lc3NhZ2UubWlkKCk7XG4gICAgICBjb25zdCBzZXQgPSBvdXQuZ2V0KHN0cikgfHwgbmV3IFNldCgpO1xuICAgICAgc2V0LmFkZCh1c2FnZSk7XG4gICAgICBvdXQuc2V0KHN0ciwgc2V0KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB0cmlnZ2VyIG9mIHRoaXMucm9tLnRyaWdnZXJzKSB7XG4gICAgICBpZiAodHJpZ2dlci5tZXNzYWdlLm5vbnplcm8oKSkge1xuICAgICAgICB1c2UodHJpZ2dlci5tZXNzYWdlLCBgVHJpZ2dlciAkJHtoZXgodHJpZ2dlci5pZCl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLnJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCBtIG9mIGl0ZW0uaXRlbVVzZU1lc3NhZ2VzKCkpIHtcbiAgICAgICAgaWYgKG0ubm9uemVybygpKSB1c2UobSwgYEl0ZW0gJCR7aGV4KGl0ZW0uaWQpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5wYyBvZiB0aGlzLnJvbS5ucGNzKSB7XG4gICAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgICAgdXNlKGQubWVzc2FnZSwgYE5QQyAkJHtoZXgobnBjLmlkKX1gKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2wsIGRzXSBvZiBucGMubG9jYWxEaWFsb2dzKSB7XG4gICAgICAgIGNvbnN0IGxoID0gbCA+PSAwID8gYCBAICQke2hleChsKX1gIDogJyc7XG4gICAgICAgIGZvciAoY29uc3QgZCBvZiBkcykge1xuICAgICAgICAgIHVzZShkLm1lc3NhZ2UsIGBOUEMgJCR7aGV4KG5wYy5pZCl9JHtsaH1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNhZ2Ugb2YgdGhpcy5yb20udGVsZXBhdGh5LnNhZ2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IGQgb2Ygc2FnZS5kZWZhdWx0TWVzc2FnZXMpIHtcbiAgICAgICAgdXNlKGQsIGBUZWxlcGF0aHkgJHtzYWdlLnNhZ2V9YCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGcgb2Ygc2FnZS5tZXNzYWdlR3JvdXBzKSB7XG4gICAgICAgIGZvciAoY29uc3QgWywgLi4ubXNdIG9mIGcubWVzc2FnZXMpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IG0gb2YgbXMpIHtcbiAgICAgICAgICAgIHVzZShtISwgYFRlbGVwYXRoeSAke3NhZ2Uuc2FnZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBtIG9mIEhBUkRDT0RFRF9NRVNTQUdFUykge1xuICAgICAgdXNlKG0sICdIYXJkY29kZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIGJ1aWxkQWJicmV2aWF0aW9uVGFibGUodXNlcyA9IHRoaXMudXNlcygpKTogQWJicmV2aWF0aW9uW10ge1xuICAgIC8vIENvdW50IGZyZXF1ZW5jaWVzIG9mIHVzZWQgc3VmZml4ZXMuXG4gICAgaW50ZXJmYWNlIFN1ZmZpeCB7XG4gICAgICAvLyBBY3R1YWwgc3RyaW5nXG4gICAgICBzdHI6IHN0cmluZztcbiAgICAgIC8vIFRvdGFsIG51bWJlciBvZiBieXRlcyBzYXZlZCBvdmVyIGFsbCBvY2N1cnJlbmNlc1xuICAgICAgc2F2aW5nOiBudW1iZXI7XG4gICAgICAvLyBBbGwgdGhlIGluaXRpYWwgd29yZHMgdGhpcyBpcyBpbiAobm90IGNvdW50aW5nIGNoYWlucylcbiAgICAgIHdvcmRzOiBTZXQ8bnVtYmVyPjtcbiAgICAgIC8vIE51bWJlciBvZiBjaGFpbnNcbiAgICAgIGNoYWluczogbnVtYmVyO1xuICAgICAgLy8gTnVtYmVyIG9mIGxldHRlcnMgbWlzc2luZyBmcm9tIHRoZSBmaXJzdCB3b3JkXG4gICAgICBtaXNzaW5nOiBudW1iZXI7XG4gICAgfVxuICAgIGludGVyZmFjZSBXb3JkIHtcbiAgICAgIC8vIEFjdHVhbCBzdHJpbmdcbiAgICAgIHN0cjogc3RyaW5nO1xuICAgICAgLy8gSW5kZXggaW4gbGlzdFxuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIC8vIFRoZSBjaGFpbmFibGUgcHVuY3R1YXRpb24gYWZ0ZXIgdGhpcyB3b3JkIChzcGFjZSBvciBhcG9zdHJvcGhlKVxuICAgICAgY2hhaW46IHN0cmluZztcbiAgICAgIC8vIFBvc3NpYmxlIGJ5dGVzIHRvIGJlIHNhdmVkXG4gICAgICBieXRlczogbnVtYmVyO1xuICAgICAgLy8gTnVtYmVyIG9mIGNoYXJhY3RlcnMgY3VycmVudGx5IGJlaW5nIGNvbXByZXNzZWRcbiAgICAgIHVzZWQ6IG51bWJlcjtcbiAgICAgIC8vIEFsbCBzdWZmaXhlcyB0aGF0IHRvdWNoIHRoaXMgd29yZFxuICAgICAgc3VmZml4ZXM6IFNldDxTdWZmaXg+O1xuICAgICAgLy8gTWVzc2FnZSBJRFxuICAgICAgbWlkOiBzdHJpbmc7XG4gICAgfVxuXG4gICAgLy8gT3JkZXJlZCBsaXN0IG9mIHdvcmRzXG4gICAgY29uc3Qgd29yZHM6IFdvcmRbXSA9IFtdO1xuICAgIC8vIEtlZXAgdHJhY2sgb2YgYWRkcmVzc2VzIHdlJ3ZlIHNlZW4sIG1hcHBpbmcgdG8gbWVzc2FnZSBJRHMgZm9yIGFsaWFzaW5nLlxuICAgIGNvbnN0IGFkZHJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAvLyBBbGlhc2VzIG1hcHBpbmcgbXVsdGlwbGUgbWVzc2FnZSBJRHMgdG8gYWxyZWFkeS1zZWVuIG9uZXMuXG4gICAgY29uc3QgYWxpYXMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG5cbiAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgdGhpcy5tZXNzYWdlcyh1c2VzKSkge1xuICAgICAgLy8gVE9ETyAtIGNhbid0IGxhbmQgcmVmbG93IHVudGlsIHdlIGhhdmUgbGlwc3VtIHRleHQuXG4gICAgICBtZXNzYWdlLmZpeFRleHQoKTtcbiAgICAgIGNvbnN0IG1pZCA9IG1lc3NhZ2UubWlkKCk7XG4gICAgICAvLyBEb24ndCByZWFkIHRoZSBzYW1lIG1lc3NhZ2UgdHdpY2UuXG4gICAgICBjb25zdCBzZWVuID0gYWRkcnMuZ2V0KG1lc3NhZ2UudGV4dCk7XG4gICAgICBjb25zdCBhbGlhc2VzID0gc2VlbiAhPSBudWxsICYmIGFsaWFzLmdldChzZWVuKTtcbiAgICAgIGlmIChhbGlhc2VzKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaChtaWQpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGFkZHJzLnNldChtZXNzYWdlLnRleHQsIG1pZCk7XG4gICAgICBhbGlhcy5zZXQobWlkLCBbXSk7XG4gICAgICAvLyBTcGxpdCB1cCB0aGUgbWVzc2FnZSB0ZXh0IGludG8gd29yZHMuXG4gICAgICBjb25zdCB0ZXh0ID0gbWVzc2FnZS50ZXh0O1xuICAgICAgbGV0IGxldHRlcnMgPSBbXTtcblxuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRleHQubGVuZ3RoOyBpIDw9IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0ZXh0W2ldO1xuICAgICAgICBjb25zdCBjbG9zZXIgPSBDTE9TRVJTW2NdO1xuICAgICAgICBpZiAoUFVOQ1RVQVRJT05bY10gfHwgY2xvc2VyIHx8IGkgPT09IGxlbikge1xuICAgICAgICAgIC8vIGlmIHRoZSBuZXh0IGNoYXJhY3RlciBpcyBub24tcHVuY3R1YXRpb24gdGhlbiBpdCBjaGFpbnNcbiAgICAgICAgICBjb25zdCBuZXh0ID0gdGV4dFtpICsgMV07XG4gICAgICAgICAgaWYgKGNsb3NlcikgaSA9IE1hdGgubWF4KGksIHRleHQuaW5kZXhPZihjbG9zZXIsIGkpKTtcbiAgICAgICAgICBpZiAoIWxldHRlcnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBjaGFpbiA9XG4gICAgICAgICAgICAgIChjID09PSAnICcgfHwgYyA9PT0gJ1xcJycpICYmIG5leHQgJiYgIVBVTkNUVUFUSU9OW25leHRdID8gYyA6ICcnO1xuICAgICAgICAgIGNvbnN0IHN0ciA9IGxldHRlcnMuam9pbignJyk7XG4gICAgICAgICAgY29uc3QgaWQgPSB3b3Jkcy5sZW5ndGg7XG4gICAgICAgICAgY29uc3QgYnl0ZXMgPSBzdHIubGVuZ3RoICsgKGMgPT09ICcgJyA/IDEgOiAwKTtcbiAgICAgICAgICBsZXR0ZXJzID0gW107XG4gICAgICAgICAgd29yZHMucHVzaChcbiAgICAgICAgICAgICAge3N0ciwgaWQsIGNoYWluLCBieXRlcywgdXNlZDogMCwgc3VmZml4ZXM6IG5ldyBTZXQoKSwgbWlkfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0dGVycy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBtYXAgb2Ygc3RyaW5nIHRvIHN1ZmZpeFxuICAgIGNvbnN0IHN1ZmZpeGVzID0gbmV3IE1hcDxzdHJpbmcsIFN1ZmZpeD4oKTtcbiAgICBmb3IgKGxldCBpID0gd29yZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIC8vIEZvciBlYWNoIHdvcmRcbiAgICAgIGNvbnN0IHdvcmQgPSB3b3Jkc1tpXTtcbiAgICAgIGZvciAobGV0IGogPSB3b3JkLmJ5dGVzIC0gMjsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgLy8gRm9yIGVhY2ggc3VmZml4XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9IHdvcmQuc3RyLnN1YnN0cmluZyhqKTtcbiAgICAgICAgLy8gQ3VycmVudCBmdWxsIHN0cmluZywgYWRkaW5nIGFsbCB0aGUgY2hhaW5zIHNvIGZhclxuICAgICAgICBsZXQgc3RyID0gc3VmZml4O1xuICAgICAgICAvLyBOdW1iZXIgb2YgZXh0cmEgY2hhaW5zIGFkZGVkXG4gICAgICAgIGxldCBsZW4gPSAwO1xuICAgICAgICBsZXQgbGF0ZXIgPSB3b3JkO1xuICAgICAgICBsZXQgc2F2aW5nID0gd29yZC5ieXRlcyAtIGogLSAxO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIC8vIEZvciBpdHNlbGYgYW5kIGVhY2ggY2hhaW5hYmxlIHdvcmQgdGhlcmVhZnRlclxuICAgICAgICAgIGxldCBkYXRhID0gc3VmZml4ZXMuZ2V0KHN0cik7XG4gICAgICAgICAgaWYgKCFkYXRhKSBzdWZmaXhlcy5zZXQoc3RyLCAoZGF0YSA9IHtjaGFpbnM6IGxlbiwgbWlzc2luZzogaixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmluZzogLXN0ci5sZW5ndGgsIHN0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmRzOiBuZXcgU2V0KCl9KSk7XG4gICAgICAgICAgZGF0YS53b3Jkcy5hZGQoaSk7XG4gICAgICAgICAgZGF0YS5zYXZpbmcgKz0gc2F2aW5nO1xuICAgICAgICAgIC8vIExpbmsgdGhlIHN1ZmZpeGVzXG4gICAgICAgICAgZm9yIChsZXQgayA9IGxlbjsgayA+PSAwOyBrLS0pIHdvcmRzW2kgKyBrXS5zdWZmaXhlcy5hZGQoZGF0YSk7XG4gICAgICAgICAgaWYgKCFsYXRlci5jaGFpbikgYnJlYWs7XG4gICAgICAgICAgLy8gSWYgdGhlcmUncyBhbm90aGVyIHdvcmQgdG8gY2hhaW4gdG8sIHRoZW4gY29udGludWVcbiAgICAgICAgICBzdHIgKz0gbGF0ZXIuY2hhaW47XG4gICAgICAgICAgbGF0ZXIgPSB3b3Jkc1tpICsgKCsrbGVuKV07XG4gICAgICAgICAgc3RyICs9IGxhdGVyLnN0cjtcbiAgICAgICAgICBzYXZpbmcgKz0gbGF0ZXIuYnl0ZXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTb3J0IHRoZSBzdWZmaXhlcyB0byBmaW5kIHRoZSBtb3N0IGltcGFjdGZ1bFxuICAgIGNvbnN0IGludmFsaWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBhYmJyOiBBYmJyZXZpYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IG9yZGVyID0gKHtzYXZpbmc6IGF9OiBTdWZmaXgsIHtzYXZpbmc6IGJ9OiBTdWZmaXgpID0+IGIgLSBhO1xuICAgIGNvbnN0IHNvcnRlZCA9IFsuLi5zdWZmaXhlcy52YWx1ZXMoKV0uc29ydChvcmRlcik7XG4gICAgbGV0IHRhYmxlTGVuZ3RoID0gMDtcbiAgICB3aGlsZSAoc29ydGVkLmxlbmd0aCAmJiB0YWJsZUxlbmd0aCA8IE1BWF9UQUJMRV9MRU5HVEgpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzb3J0IG9yZGVyIGhhcyBiZWVuIGludmFsaWRhdGVkIGFuZCByZXNvcnRcbiAgICAgIGlmIChpbnZhbGlkLmhhcyhzb3J0ZWRbMF0uc3RyKSkge1xuICAgICAgICBzb3J0ZWQuc29ydChvcmRlcik7XG4gICAgICAgIGludmFsaWQuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHtzdHIsIHNhdmluZywgbWlzc2luZywgd29yZHM6IHdzLCBjaGFpbnN9ID0gc29ydGVkLnNoaWZ0KCkhO1xuICAgICAgLy8gZmlndXJlIG91dCBpZiBpdCdzIHdvcnRoIGFkZGluZy4uLlxuICAgICAgaWYgKHNhdmluZyA8PSAwKSBicmVhaztcbiAgICAgIC8vIG1ha2UgdGhlIGFiYnJldmlhdGlvblxuICAgICAgdGFibGVMZW5ndGggKz0gc3RyLmxlbmd0aCArIDM7XG4gICAgICBjb25zdCBsID0gYWJici5sZW5ndGg7XG4gICAgICBjb25zdCBtaWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGNvbnN0IHcgb2Ygd3MpIHtcbiAgICAgICAgY29uc3Qgd29yZCA9IHdvcmRzW3ddO1xuICAgICAgICBmb3IgKGNvbnN0IG1pZCBvZiBbd29yZC5taWQsIC4uLihhbGlhcy5nZXQod29yZC5taWQpIHx8IFtdKV0pIHtcbiAgICAgICAgICBtaWRzLmFkZChtaWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhYmJyLnB1c2goe1xuICAgICAgICBieXRlczogbCA8IDB4ODAgPyBbbCArIDB4ODBdIDogWzUsIGwgLSAweDgwXSxcbiAgICAgICAgbWlkcyxcbiAgICAgICAgLy8gbWVzc2FnZXM6IG5ldyBTZXQoWy4uLndzXS5tYXAodyA9PiB3b3Jkc1t3XS5taWQpKSxcbiAgICAgICAgc3RyLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEJsYXN0IHJhZGl1czogYWxsIG90aGVyIHN1ZmZpeGVzIHJlbGF0ZWQgdG8gYWxsIHRvdWNoZWQgd29yZHMgc2F2ZSBsZXNzXG4gICAgICBmb3IgKGNvbnN0IGkgb2Ygd3MpIHtcbiAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPD0gY2hhaW5zOyBrKyspIHtcbiAgICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbaSArIGtdO1xuICAgICAgICAgIGNvbnN0IHVzZWQgPSB3b3JkLmJ5dGVzIC0gKCFrID8gbWlzc2luZyA6IDApO1xuICAgICAgICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIHdvcmQuc3VmZml4ZXMpIHtcbiAgICAgICAgICAgIHN1ZmZpeC5zYXZpbmcgLT0gKHVzZWQgLSB3b3JkLnVzZWQpO1xuICAgICAgICAgICAgaW52YWxpZC5hZGQoc3VmZml4LnN0cik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdvcmQudXNlZCA9IHVzZWQ7IC8vIHR5cGljYWxseSBpbmNyZWFzZXMuLi5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIHRha2VzIHVzIG92ZXIgMHg4MCB0aGVuIGFsbCBzdWZmaXhlcyBnZXQgdXMgb25lIGxlc3MgYnl0ZSBvZiBzYXZpbmdzIHBlciB1c2VcbiAgICAgIGlmIChhYmJyLmxlbmd0aCA9PT0gMHg4MCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRhdGEgb2Ygc3VmZml4ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgICBkYXRhLnNhdmluZyAtPSBkYXRhLndvcmRzLnNpemU7XG4gICAgICAgIH1cbiAgICAgICAgc29ydGVkLnNvcnQob3JkZXIpO1xuICAgICAgICBpbnZhbGlkLmNsZWFyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhYmJyO1xuICB9XG5cbiAgLyoqIFJlYnVpbGQgdGhlIHdvcmQgdGFibGVzIGFuZCBtZXNzYWdlIGVuY29kaW5ncy4gKi9cbiAgY29tcHJlc3MoKSB7XG4gICAgY29uc3QgdXNlcyA9IHRoaXMudXNlcygpO1xuICAgIGNvbnN0IHRhYmxlID0gdGhpcy5idWlsZEFiYnJldmlhdGlvblRhYmxlKHVzZXMpO1xuICAgIC8vIGdyb3VwIGFiYnJldmlhdGlvbnMgYnkgbWVzc2FnZSBhbmQgc29ydCBieSBsZW5ndGguXG4gICAgY29uc3QgYWJicnMgPSBuZXcgTWFwPHN0cmluZywgQWJicmV2aWF0aW9uW10+KCk7IC8vIGJ5IG1pZFxuICAgIHRoaXMuY29tbW9uV29yZHMuc3BsaWNlKDAsIHRoaXMuY29tbW9uV29yZHMubGVuZ3RoKTtcbiAgICB0aGlzLnVuY29tbW9uV29yZHMuc3BsaWNlKDAsIHRoaXMudW5jb21tb25Xb3Jkcy5sZW5ndGgpO1xuICAgIGZvciAoY29uc3QgYWJiciBvZiB0YWJsZSkge1xuICAgICAgaWYgKGFiYnIuYnl0ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHRoaXMuY29tbW9uV29yZHNbYWJici5ieXRlc1swXSAmIDB4N2ZdID0gYWJici5zdHI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmV4dHJhV29yZHNbYWJici5ieXRlc1swXV1bYWJici5ieXRlc1sxXV0gPSBhYmJyLnN0cjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbWlkIG9mIGFiYnIubWlkcykge1xuICAgICAgICBsZXQgYWJickxpc3QgPSBhYmJycy5nZXQobWlkKTtcbiAgICAgICAgaWYgKCFhYmJyTGlzdCkgYWJicnMuc2V0KG1pZCwgKGFiYnJMaXN0ID0gW10pKTtcbiAgICAgICAgYWJickxpc3QucHVzaChhYmJyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBhYmJyTGlzdCBvZiBhYmJycy52YWx1ZXMoKSkge1xuICAgICAgYWJickxpc3Quc29ydCgoe3N0cjoge2xlbmd0aDogeH19OiBBYmJyZXZpYXRpb24sIHtzdHI6IHtsZW5ndGg6IHl9fTogQWJicmV2aWF0aW9uKSA9PiB5IC0geCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBtIG9mIHRoaXMubWVzc2FnZXModXNlcykpIHtcbiAgICAgIGxldCB0ZXh0ID0gbS50ZXh0O1xuICAgICAgLy8gRmlyc3QgcmVwbGFjZSBhbnkgaXRlbXMgb3Igb3RoZXIgbmFtZXMgd2l0aCB0aGVpciBieXRlcy5cbiAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhbXFxbe10pKFteXFxdfV0qKVtcXF19XSgufCQpL2csIChmdWxsLCBicmFja2V0LCBpbnNpZGUsIGFmdGVyKSA9PiB7XG4gICAgICAgIGlmIChhZnRlciAmJiAhUFVOQ1RVQVRJT05bYWZ0ZXJdKSByZXR1cm4gZnVsbDtcbiAgICAgICAgaWYgKGFmdGVyID09PSAnICcpIGFmdGVyID0gJyc7XG4gICAgICAgIGlmIChicmFja2V0ID09PSAnWycgJiYgaW5zaWRlID09PSAnOklURU06Jykge1xuICAgICAgICAgIHJldHVybiBgWzhdJHthZnRlcn1gO1xuICAgICAgICB9IGVsc2UgaWYgKGJyYWNrZXQgPT09ICd7JyAmJiBpbnNpZGUgPT09ICc6SEVSTzonKSB7XG4gICAgICAgICAgcmV0dXJuIGBbNF0ke2FmdGVyfWA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluZCB0aGUgbnVtYmVyIGJlZm9yZSB0aGUgY29sb24uXG4gICAgICAgIGNvbnN0IG1hdGNoID0gL14oWzAtOWEtZl0rKTovLmV4ZWMoaW5zaWRlKTtcbiAgICAgICAgaWYgKCFtYXRjaCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgbWVzc2FnZSB0ZXh0OiAke2Z1bGx9YCk7XG4gICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KG1hdGNoWzFdLCAxNik7XG4gICAgICAgIHJldHVybiBgWyR7YnJhY2tldCA9PT0gJ3snID8gNiA6IDd9XVske2lkfV0ke2FmdGVyfWA7XG4gICAgICB9KTtcbiAgICAgIC8vIE5vdyBzdGFydCB3aXRoIHRoZSBsb25nZXN0IGFiYnJldmlhdGlvbiBhbmQgd29yayBvdXIgd2F5IGRvd24uXG4gICAgICBmb3IgKGNvbnN0IHtzdHIsIGJ5dGVzfSBvZiBhYmJycy5nZXQobS5taWQoKSkgfHwgW10pIHtcbiAgICAgICAgLy8gTk9URTogdHdvIHNwYWNlcyBpbiBhIHJvdyBhZnRlciBhbiBleHBhbnNpb24gbXVzdCBiZSBwcmVzZXJ2ZWQgYXMtaXMuXG4gICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UobmV3IFJlZ0V4cChzdHIgKyAnKCBbICYwLTldfC58JCknLCAnZycpLCAoZnVsbCwgYWZ0ZXIpID0+IHtcbiAgICAgICAgICBpZiAoYWZ0ZXIgJiYgIVBVTkNUVUFUSU9OW2FmdGVyXSkgcmV0dXJuIGZ1bGw7XG4gICAgICAgICAgaWYgKGFmdGVyID09PSAnICcpIGFmdGVyID0gJyc7XG4gICAgICAgICAgcmV0dXJuIGJ5dGVzLm1hcChiID0+IGBbJHtifV1gKS5qb2luKCcnKSArIGFmdGVyO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gYnVpbGQgdGhlIGVuY29kZWQgdmVyc2lvblxuICAgICAgY29uc3QgaGV4UGFydHMgPSBbJ1swMV0nXTtcbiAgICAgIGNvbnN0IGJzID0gW107XG4gICAgICBicy5wdXNoKDEpO1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRleHQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgYyA9IHRleHRbaV07XG4gICAgICAgIGlmIChjID09PSBNZXNzYWdlcy5DT05USU5VRUQpIHtcbiAgICAgICAgICBicy5wdXNoKDMsIDEpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goJ1swM11bMDFdJyk7XG4gICAgICAgICAgaWYgKHRleHRbaSArIDFdID09PSAnXFxuJykgaSsrO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdcXG4nKSB7XG4gICAgICAgICAgYnMucHVzaCgyKTtcbiAgICAgICAgICBpZiAodGV4dFtpICsgMV0gPT09ICcgJykgaSsrO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goJ1swMl0nKTtcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnWycpIHtcbiAgICAgICAgICBjb25zdCBqID0gdGV4dC5pbmRleE9mKCddJywgaSk7XG4gICAgICAgICAgaWYgKGogPD0gMCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGV4dDogJHt0ZXh0fWApO1xuICAgICAgICAgIGNvbnN0IGIgPSBOdW1iZXIodGV4dC5zdWJzdHJpbmcoaSArIDEsIGopKTtcbiAgICAgICAgICBpZiAoaXNOYU4oYikpIHRocm93IG5ldyBFcnJvcihgYmFkIHRleHQ6ICR7dGV4dH1gKTtcbiAgICAgICAgICBicy5wdXNoKGIpO1xuICAgICAgICAgIGhleFBhcnRzLnB1c2goYFske2hleChiKX1dYCk7XG4gICAgICAgICAgaSA9IGo7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJyAnICYmIHRleHRbaSArIDFdID09PSAnICcpIHtcbiAgICAgICAgICBsZXQgaiA9IGkgKyAyO1xuICAgICAgICAgIHdoaWxlICh0ZXh0W2pdID09PSAnICcpIGorKztcbiAgICAgICAgICBicy5wdXNoKDksIGogLSBpKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKGBbMDldWyR7aGV4KGogLSBpKX1dYCk7XG4gICAgICAgICAgaSA9IGogLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJzLnB1c2goYy5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicy5wdXNoKDApO1xuICAgICAgaGV4UGFydHMucHVzaCgnWzBdJyk7XG4gICAgICBtLmJ5dGVzID0gYnM7XG4gICAgICBtLmhleCA9IGhleFBhcnRzLmpvaW4oJycpO1xuXG4gICAgICAvLyBGaWd1cmUgb3V0IHdoaWNoIHBhZ2UgaXQgbmVlZHMgdG8gYmUgb25cbiAgICAgIC8vIGNvbnN0IGJhbmsgPSB0aGlzLmJhbmtzW20ucGFydF0gPDwgMTM7XG4gICAgICAvLyBjb25zdCBvZmZzZXQgPSBiYW5rIC0gMHhhMDAwO1xuICAgICAgXG4gICAgICAvLyBwcm9taXNlc1ttLnBhcnRdW20uaWRdID1cbiAgICAgICAgICAvLyB3cml0ZXIud3JpdGUoYnMsIGJhbmssIGJhbmsgKyAweDIwMDAsIGBNZXNzYWdlICR7bS5taWQoKX1gKVxuICAgICAgICAgIC8vICAgICAudGhlbihhID0+IGEgLSBvZmZzZXQpO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlKCk6IE1vZHVsZVtdIHtcbiAgICBjb25zdCBhID0gdGhpcy5yb20uYXNzZW1ibGVyKCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg4MDAwLCAweDg1MDApO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4ODUyMCwgMHg4NTI4KTtcbiAgICBmcmVlKGEsICQxNCwgICAweDg1ODYsIDB4ODU5Myk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg4OTAwLCAweDk0MDApO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4OTY4NSwgMHg5NzA2KTtcbiAgICAvL2ZyZWUoYSwgJzE0JywgICAweDliNGUsIDB4OWMwMCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg5ZTgwLCAweGEwMDApO1xuICAgIGZyZWUoYSwgJDE1LCAgIDB4YTAwMCwgMHhjMDAwKTtcbiAgICBmcmVlKGEsICQxNl9hLCAweGEwMDAsIDB4YzAwMCk7XG4gICAgZnJlZShhLCAkMTcsICAgMHhhMDAwLCAweGJjMDApO1xuICAgIC8vIHBsYW46IGFuYWx5emUgYWxsIHRoZSBtc2VzYWdlcywgZmluZGluZyBjb21tb24gc3VmZml4ZXMuXG4gICAgLy8gZWxpZ2libGUgc3VmZml4ZXMgbXVzdCBiZSBmb2xsb3dlZCBieSBlaXRoZXIgc3BhY2UsIHB1bmN0dWF0aW9uLCBvciBlb2xcbiAgICAvLyB0b2RvIC0gcmVmb3JtYXQvZmxvdyBtZXNzYWdlcyBiYXNlZCBvbiBjdXJyZW50IHN1YnN0aXR1dGlvbiBsZW5ndGhzXG5cbiAgICAvLyBidWlsZCB1cCBhIHN1ZmZpeCB0cmllIGJhc2VkIG9uIHRoZSBhYmJyZXZpYXRpb25zLlxuICAgIC8vIGNvbnN0IHRyaWUgPSBuZXcgU3VmZml4VHJpZTxudW1iZXJbXT4oKTtcbiAgICAvLyBmb3IgKGxldCBpID0gMCwgbGVuID0gdGFibGUubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAvLyAgIHRyaWUuc2V0KHRhYmxlW2ldLnN0ciwgaSA8IDB4ODAgPyBbaSArIDB4ODBdIDogWzUsIGkgLSAweDgwXSk7XG4gICAgLy8gfVxuXG4gICAgLy8gd3JpdGUgdGhlIGFiYnJldmlhdGlvbiB0YWJsZXMgKGFsbCwgcmV3cml0aW5nIGhhcmRjb2RlZCBjb2RlcmVmcylcbiAgICBmdW5jdGlvbiB1cGRhdGVDb2RlcmVmKHB0cjogQWRkcmVzcywgYmFzZTogRXhwciwgLi4ub2Zmc2V0czogbnVtYmVyW10pIHtcbiAgICAgIHB0ci5sb2MoYSk7XG4gICAgICBhLndvcmQoYmFzZSk7XG4gICAgICAvLyBzZWNvbmQgcmVmICh1c3VhbGx5IDUgYnl0ZXMgbGF0ZXIpXG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBmb3IgKGNvbnN0IG9mZnNldCBvZiBvZmZzZXRzKSB7XG4gICAgICAgIHB0ci5wbHVzKG9mZnNldCkubG9jKGEpO1xuICAgICAgICBhLndvcmQoe29wOiAnKycsIGFyZ3M6IFtiYXNlLCB7b3A6ICdudW0nLCBudW06ICsraX1dfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlyc3Qgc3RlcDogd3JpdGUgdGhlIG1lc3NhZ2VzLlxuICAgIGNvbnN0IGFkZHJlc3NlczogRXhwcltdW10gPSBzZXEodGhpcy5wYXJ0Q291bnQsICgpID0+IFtdKVxuICAgIGZvciAobGV0IHBhcnRJZCA9IDA7IHBhcnRJZCA8IHRoaXMucGFydENvdW50OyBwYXJ0SWQrKykge1xuICAgICAgY29uc3QgcGFydEFkZHJzID0gYWRkcmVzc2VzW3BhcnRJZF07XG4gICAgICBjb25zdCBwYXJ0ID0gdGhpcy5wYXJ0c1twYXJ0SWRdO1xuICAgICAgY29uc3QgYmFuayA9IHRoaXMuYmFua3NbcGFydElkXTtcbiAgICAgIGNvbnN0IHNlZ21lbnQgPSBTRUdNRU5UU1tiYW5rXTtcbiAgICAgIGEuc2VnbWVudChzZWdtZW50Lm5hbWUpO1xuICAgICAgZm9yIChjb25zdCBtIG9mIHBhcnQpIHtcbiAgICAgICAgYS5yZWxvYyhgTWVzc2FnZV8ke20ubWlkKCl9YCk7XG4gICAgICAgIHBhcnRBZGRycy5wdXNoKGEucGMoKSk7XG4gICAgICAgIGEuYnl0ZSguLi5tLmJ5dGVzLCAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgd3JpdGUgYSBzaW5nbGUgY2h1bmsgd2l0aCBhbGwgdGhlIHBhcnRzLlxuICAgIGNvbnN0IHBhcnRUYWJsZXM6IEV4cHJbXSA9IFtdO1xuICAgIGEuc2VnbWVudCgkMTQubmFtZSk7XG4gICAgYS5yZWxvYyhgTWVzc2FnZXNUYWJsZWApO1xuICAgIGZvciAobGV0IHBhcnRJZCA9IDA7IHBhcnRJZCA8IHRoaXMucGFydENvdW50OyBwYXJ0SWQrKykge1xuICAgICAgcGFydFRhYmxlcy5wdXNoKGEucGMoKSk7XG4gICAgICBhLndvcmQoLi4uYWRkcmVzc2VzW3BhcnRJZF0pO1xuICAgIH1cbiAgICBjb25zdCBiYW5rVGFibGUgPSBhLnBjKCk7XG4gICAgYS5ieXRlKC4uLnRoaXMuYmFua3MpO1xuXG4gICAgYS5yZWxvYyhgTWVzc2FnZVBhcnRzYCk7XG4gICAgY29uc3QgcGFydHNUYWJsZSA9IGEucGMoKTtcbiAgICBhLndvcmQoLi4ucGFydFRhYmxlcyk7XG5cbiAgICAvLyBGaW5hbGx5IHVwZGF0ZSB0aGUgYmFuayBhbmQgcGFydHMgcG9pbnRlcnMuXG4gICAgdXBkYXRlQ29kZXJlZihCQU5LU19QVFIsIGJhbmtUYWJsZSk7XG4gICAgdXBkYXRlQ29kZXJlZihCQU5LU19QVFIyLCBiYW5rVGFibGUpO1xuICAgIHVwZGF0ZUNvZGVyZWYoUEFSVFNfUFRSLCBwYXJ0c1RhYmxlLCA1KTtcblxuICAgIC8vIE5vdyB3cml0ZSB0aGUgd29yZHMgdGFibGVzLlxuICAgIGNvbnN0IHdvcmRUYWJsZXMgPSBbXG4gICAgICBbYENvbW1vbldvcmRzYCwgdGhpcy5jb21tb25Xb3JkcywgW0NPTU1PTl9XT1JEU19CQVNFX1BUUl1dLFxuICAgICAgW2BVbmNvbW1vbldvcmRzYCwgdGhpcy51bmNvbW1vbldvcmRzLCBbVU5DT01NT05fV09SRFNfQkFTRV9QVFJdXSxcbiAgICAgIFtgUGVyc29uTmFtZXNgLCB0aGlzLnBlcnNvbk5hbWVzLCBbUEVSU09OX05BTUVTX0JBU0VfUFRSXV0sXG4gICAgICBbYEl0ZW1OYW1lc2AsIHRoaXMuaXRlbU5hbWVzLCBbSVRFTV9OQU1FU19CQVNFX1BUUixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJVEVNX05BTUVTX0JBU0VfUFRSMl1dLFxuICAgIF0gYXMgY29uc3Q7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgd29yZHMsIHB0cnNdIG9mIHdvcmRUYWJsZXMpIHtcbiAgICAgIGNvbnN0IGFkZHJzOiAobnVtYmVyfEV4cHIpW10gPSBbXTtcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGZvciAoY29uc3Qgd29yZCBvZiB3b3Jkcykge1xuICAgICAgICBpZiAoIXdvcmQpIHtcbiAgICAgICAgICBhZGRycy5wdXNoKDApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGEucmVsb2MoYCR7bmFtZX1fJHtoZXgoaSsrKX1gKTtcbiAgICAgICAgYWRkcnMucHVzaChhLnBjKCkpO1xuICAgICAgICBhLmJ5dGUod29yZCwgMCk7XG4gICAgICB9XG4gICAgICBhLnJlbG9jKG5hbWUpO1xuICAgICAgY29uc3QgYmFzZSA9IGEucGMoKTtcbiAgICAgIGEud29yZCguLi5hZGRycyk7XG4gICAgICBmb3IgKGNvbnN0IHB0ciBvZiBwdHJzKSB7XG4gICAgICAgIHVwZGF0ZUNvZGVyZWYocHRyLCBiYXNlLCA1KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFthLm1vZHVsZSgpXTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgQWJicmV2aWF0aW9uIHtcbiAgLy8gQnl0ZXMgdG8gYWJicmV2aWF0ZSB0by5cbiAgYnl0ZXM6IG51bWJlcltdO1xuICAvLyBNSURzIG9mIHRoZSBtZXNzYWdlcyB0byBhYmJyZXZpYXRlLlxuICBtaWRzOiBTZXQ8c3RyaW5nPjtcbiAgLy8gRXhwYW5kZWQgdGV4dC5cbiAgc3RyOiBzdHJpbmc7XG59XG5cbi8vIE1heCBsZW5ndGggZm9yIHdvcmRzIHRhYmxlLiAgVmFuaWxsYSBhbGxvY2F0ZXMgOTMyIGJ5dGVzLCBidXQgdGhlcmUnc1xuLy8gYW4gZXh0cmEgNDQ4IGF2YWlsYWJsZSBpbW1lZGlhdGVseSBiZW5lYXRoLiAgRm9yIG5vdyB3ZSdsbCBwaWNrIGEgcm91bmRcbi8vIG51bWJlcjogMTIwMC5cbmNvbnN0IE1BWF9UQUJMRV9MRU5HVEggPSAxMjUwO1xuXG4vLyBjb25zdCBQVU5DVFVBVElPTl9SRUdFWCA9IC9bXFwwICFcXFxcLC46Oz9fLV0vZztcbi8vIGNvbnN0IE9QRU5FUlM6IHtbY2xvc2U6IHN0cmluZ106IHN0cmluZ30gPSB7J30nOiAneycsICddJzogJ1snfTtcbmNvbnN0IENMT1NFUlM6IHtbb3Blbjogc3RyaW5nXTogc3RyaW5nfSA9IHsneyc6ICd9JywgJ1snOiAnXSd9O1xuXG4vLyBNZXNzYWdlIE1JRHMgdGhhdCBhcmUgaGFyZGNvZGVkIGluIHZhcmlvdXMgcGxhY2VzLlxuZXhwb3J0IGNvbnN0IEhBUkRDT0RFRF9NRVNTQUdFUzogU2V0PHN0cmluZz4gPSBuZXcgU2V0KFtcbiAgLy8gJzAwOjAwJywgLy8gaW1wb3NzaWJsZSB0byBpZGVudGlmeSB1c2VzXG4gICcyMDoxZCcsIC8vIGVuZGdhbWUgbWVzc2FnZSAxLCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlOFxuICAnMWI6MGYnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgMiwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZWFcbiAgJzFiOjEwJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDMsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmVjXG4gICcxYjoxMScsIC8vIGVuZGdhbWUgbWVzc2FnZSA0LCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlZVxuICAnMWI6MTInLCAvLyBlbmRnYW1lIG1lc3NhZ2UgNSwgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZjBcbiAgJzFiOjA1JywgLy8gYXp0ZWNhIGRpYWxvZyBhZnRlciBkcmF5Z29uMiwgZXhlYyAzN2IyOFxuICAnMWI6MDYnLCAvLyBhenRlY2EgZGlhbG9nIGFmdGVyIGRyYXlnb24yLCBleGVjIDM3YjI4XG4gICcxYjowNycsIC8vIGF6dGVjYSBkaWFsb2cgYWZ0ZXIgZHJheWdvbjIsIGV4ZWMgMzdiMjhcbiAgJzFmOjAwJywgLy8genp6IHBhcmFseXNpcyBkaWFsb2csIGV4ZWMgM2QwZjNcbiAgJzEzOjAwJywgLy8ga2Vuc3Ugc3dhbiBhc2tzIGZvciBsb3ZlIHBlbmRhbnQsIGV4ZWMgM2QxY2FcbiAgJzBiOjAxJywgLy8gYXNpbmEgcmV2ZWFsLCBleGVjIDNkMWViXG4gICcyMDowYycsIC8vIGl0ZW1nZXQgbWVzc2FnZSAneW91IG5vdyBoYXZlJywgZXhlYyAzZDQzY1xuICAnMjA6MGYnLCAvLyB0b28gbWFueSBpdGVtcywgZXhlYyAzZDQ4YVxuICAnMWM6MTEnLCAvLyBzd29yZCBvZiB0aHVuZGVyIHByZS13YXJwIG1lc3NhZ2UsIGV4ZWMgMWM6MTFcbiAgJzBlOjA1JywgLy8gbWVzaWEgcmVjb3JkaW5nLCBleGVjIDNkNjIxXG4gICcxNjowMCcsIC8vIGF6dGVjYSBpbiBzaHlyb24gc3RvcnksIGV4ZWMgM2Q3OWNcbiAgJzE2OjAyJywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5YyAobG9vcClcbiAgJzE2OjA0JywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5YyAobG9vcClcbiAgJzE2OjA2JywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5YyAobG9vcClcbiAgJzIwOjExJywgLy8gZW1wdHkgc2hvcCwgZXhlYyAzZDljNFxuICAnMjE6MDAnLCAvLyB3YXJwIG1lbnUsIGV4ZWMgM2RiNjBcbiAgJzIxOjAyJywgLy8gdGVsZXBhdGh5IG1lbnUsIGV4ZWMgM2RkNmVcbiAgJzIxOjAxJywgLy8gY2hhbmdlIG1lbnUsIGV4ZWMgM2RlY2JcbiAgJzA2OjAwJywgLy8gKHN0KSBrZWxiZXNxdWUgMSBtb25vbG9ndWUsIGV4ZWMgMWU5OWZcbiAgJzE4OjAwJywgLy8gKHN0KSBrZWxiZXNxdWUgMiBtb25vbG9ndWUsIGV4ZWMgMWU5OWZcbiAgJzE4OjAyJywgLy8gKHN0KSBzYWJlcmEgMiBtb25vbG9ndWUsIGV4ZWMgMWVjZTZcbiAgJzE4OjA0JywgLy8gKHN0KSBtYWRvIDIgbW9ub2xvZ3VlLCBleGVjIDFlZTI2XG4gICcxODowOCcsIC8vIChzdCkga2FybWluZSBtb25vbG9ndWUsIGV4ZWMgMWVmOGFcbiAgJzFiOjAzJywgLy8gKHN0KSBzdGF0dWVzIG1vbm9sb2d1ZSwgZXhlYyAxZjBlNVxuICAnMWI6MDAnLCAvLyAoc3QpIGRyYXlnb24gMSBtb25vbG9ndWUsIGV4ZWMgMWYxOTNcbiAgJzFiOjAwJywgLy8gKHN0KSBkcmF5Z29uIDEgbW9ub2xvZ3VlLCBleGVjIDFmMTkzXG4gICcxYjowNCcsIC8vIChzdCkgZHJheWdvbiAyIG1vbm9sb2d1ZSwgZXhlYyAxZjE5M1xuICAnMDY6MDEnLCAvLyAoc3QpIGtlbGJlc3F1ZSAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjFiYlxuICAnMTA6MTMnLCAvLyAoc3QpIHNhYmVyYSAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjFmXG4gICcxOTowNScsIC8vIChzdCkgbWFkbyAxIGVzY2FwZXMsIGV4ZWMgMWZhZTcsIHRhYmxlIDFmYjI1XG4gICcyMDoxNCcsIC8vIChzdCkga2VsYmVzcXVlIDEgbGVmdCBjaGVzdCwgZXhlYyAxZjdhMywgdGFibGUgMWY3Y2JcbiAgJzIwOjE1JywgLy8gKHN0KSBzYWJlcmEgMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdkNVxuICAnMjA6MTcnLCAvLyAoc3QpIG1hZG8gMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdkYVxuICAnMjA6MDInLCAvLyAoc3QpIGN1cmUgc3RhdHVzIGFpbG1lbnQsIGV4ZWMgMjdiOTBcbiAgJzIwOjBkJywgLy8gKHN0KSBsZXZlbCB1cCwgZXhlYyAzNTFlMlxuICAnMjA6MTknLCAvLyAoc3QpIHBvaXNvbmVkLCBleGVjIDM1MmFhXG4gICcyMDoxYScsIC8vIChzdCkgcGFyYWx5emVkLCBleGVjIDM1MmRmXG4gICcyMDoxYicsIC8vIChzdCkgc3RvbmVkLCBleGVjIDM1MzE3XG4gICcwMzowMScsIC8vIChzdCkgbGVhcm4gdGVsZXBhdGh5LCBleGVjIDM1MmNjXG4gICcwMzowMicsIC8vIChzdCkgZmFpbCB0byBsZWFybiB0ZWxlcGF0aHksIGV4ZWMgMzUyZThcbiAgJzEwOjEwJywgLy8gKHN0KSBmYWtlIG1lc2lhIG1lc3NhZ2UgMSwgZXhlYyAzNjViMVxuICAnMTA6MTEnLCAvLyAoc3QpIGZha2UgbWVzaWEgbWVzc2FnZSAyLCBleGVjIDM2NWIxXG4gICcxMDoxMicsIC8vIChzdCkgZmFrZSBtZXNpYSBtZXNzYWdlIDMsIGV4ZWMgMzY1YjFcbiAgJzBjOjA0JywgLy8gKHN0KSBkaXNtb3VudCBkb2xwaGluIChub3QgaW5zaWRlIEVTSSBjYXZlKSwgZXhlYyAzNjYwOVxuICAnMGM6MDUnLCAvLyAoc3QpIGRpc21vdW50IGRvbHBoaW4gKGV2ZXJ5d2hlcmUgaW4gbmVhciBFU0kpLCBleGVjIDM2NjA5XG4gICcwMzowMycsIC8vIChzdCkgc3RhcnQgc3RvbSBmaWdodCwgZXhlYyAzNjcxNlxuICAnMjA6MGUnLCAvLyAoc3QpIGluc3VmZmljaWVudCBtYWdpYyBmb3Igc3BlbGwsIGV4ZWMgM2NjMjNcbiAgJzIwOjEzJywgLy8gKHN0KSBub3RoaW5nIGhhcHBlbnMgaXRlbSB1c2Ugb2VyciwgZXhlYyAzZDUyYVxuXSk7XG4iXX0=