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
    alloc() {
        const used = this.uses();
        for (const part of this.parts) {
            for (const message of part) {
                if (!used.has(message.mid)) {
                    return message;
                }
            }
        }
        throw new Error(`could not find an unused message id`);
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
        a.assign('LevelDownMessagePart', 0x01);
        a.assign('LevelDownMessageId', 0x02);
        a.export('LevelDownMessagePart', 'LevelDownMessageId');
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
    '01:02',
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL21lc3NhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUlBLE9BQU8sRUFBQyxPQUFPLEVBQVEsT0FBTyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQ3ZDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTNDLE1BQU0sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUM7QUEwQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUluRSxNQUFNLE9BQU87SUFPWCxZQUFxQixRQUFrQixFQUNsQixJQUFZLEVBQ1osRUFBVSxFQUNuQixNQUFjLEVBQ2QsS0FBa0I7UUFKVCxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBTi9CLFVBQUssR0FBYSxFQUFFLENBQUM7UUFDckIsUUFBRyxHQUFXLEVBQUUsQ0FBQztRQVVmLE1BQU0sR0FBRyxHQUFpQixRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxJQUFJLENBQUMsR0FBRyxNQUFNLEVBQUUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxF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QU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztJQUNQLE9BQU87SUFDUCxPQUFPO0lBQ1AsT0FBTztDQUNSLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RXhwcn0gZnJvbSAnLi4vYXNtL2V4cHIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge01lc3NhZ2VJZH0gZnJvbSAnLi9tZXNzYWdlaWQuanMnO1xuaW1wb3J0IHtBZGRyZXNzLCBEYXRhLCBTZWdtZW50LCBoZXgsIHJlYWRTdHJpbmcsXG4gICAgICAgIHNlcSwgZnJlZSwgdHVwbGV9IGZyb20gJy4vdXRpbC5qcyc7XG5cbmNvbnN0IHskMTQsICQxNSwgJDE2X2EsICQxN30gPSBTZWdtZW50O1xuXG4vLyBpbXBvcnQge1N1ZmZpeFRyaWV9IGZyb20gJy4uL3V0aWwuanMnO1xuXG4vLyBjbGFzcyBEYXRhVGFibGU8VD4gZXh0ZW5kcyBBcnJheTxUPiB7XG5cbi8vICAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGJhc2U6IEFkZHJlc3MsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGNvdW50OiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IHdpZHRoOiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIC8vIFRPRE8gLSB3aGF0IHdhcyB0aGlzIHN1cHBvc2VkIHRvIGJlPyE/XG4vLyAgICAgICAgICAgICAgIGZ1bmM6ICguLi54OiBudW1iZXJbXSkgPT4gVCA9XG4vLyAgICAgICAgICAgICAgICAgICB3aWR0aCA+IDEgPyAoLi4uaSkgPT4gaSBhcyBhbnkgOiBpID0+IGkgYXMgYW55KSB7XG4vLyAgICAgc3VwZXIoY291bnQpO1xuLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuLy8gICAgICAgdGhpc1tpXSA9IGZ1bmMoLi4uc2xpY2Uocm9tLnByZywgYmFzZSArIGkgKiB3aWR0aCwgd2lkdGgpKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuLy8gY2xhc3MgQWRkcmVzc1RhYmxlPFQ+IGV4dGVuZHMgQXJyYXk8VD4ge1xuXG4vLyAgIHJlYWRvbmx5IGFkZHJlc3NlczogbnVtYmVyW107XG5cbi8vICAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGJhc2U6IEFkZHJlc3MsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IGNvdW50OiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IHNlZ21lbnQ6IHN0cmluZyxcbi8vICAgICAgICAgICAgICAgZnVuYzogKHg6IG51bWJlciwgaTogbnVtYmVyLCBhcnI6IG51bWJlcltdKSA9PiBUID0gaSA9PiBpIGFzIGFueSkge1xuLy8gICAgIHN1cGVyKGNvdW50KTtcbi8vICAgICB0aGlzLmFkZHJlc3NlcyA9IHNlcSh0aGlzLmNvdW50LFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgIChpOiBudW1iZXIpID0+IHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGEgPSByZWFkTGl0dGxlRW5kaWFuKHJvbS5wcmcsIGJhc2UgKyAyICogaSk7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSAmJiBhICsgb2Zmc2V0O1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgIFxuLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuLy8gICAgICAgdGhpc1tpXSA9IGZ1bmModGhpcy5hZGRyZXNzZXNbaV0sIGksIHRoaXMuYWRkcmVzc2VzKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuY29uc3QgREVMSU1JVEVSUyA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KFtbNiwgJ3t9J10sIFs3LCAnW10nXV0pO1xuXG50eXBlIFdvcmRGYWN0b3J5ID0gKGlkOiBudW1iZXIsIGdyb3VwOiBudW1iZXIpID0+IHN0cmluZztcblxuY2xhc3MgTWVzc2FnZSB7XG5cbiAgLy8gVGhpcyBpcyByZWR1bmRhbnQgLSB0aGUgdGV4dCBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICBieXRlczogbnVtYmVyW10gPSBbXTtcbiAgaGV4OiBzdHJpbmcgPSAnJzsgLy8gZm9yIGRlYnVnZ2luZ1xuICB0ZXh0OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VzLFxuICAgICAgICAgICAgICByZWFkb25seSBwYXJ0OiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGlkOiBudW1iZXIsXG4gICAgICAgICAgICAgIG9mZnNldDogbnVtYmVyLFxuICAgICAgICAgICAgICB3b3JkczogV29yZEZhY3RvcnkpIHtcblxuICAgIC8vIFBhcnNlIHRoZSBtZXNzYWdlXG4gICAgY29uc3QgcHJnOiBEYXRhPG51bWJlcj4gPSBtZXNzYWdlcy5yb20ucHJnO1xuICAgIGNvbnN0IHBhcnRzID0gW107XG4gICAgZm9yIChsZXQgaSA9IG9mZnNldDsgb2Zmc2V0ICYmIHByZ1tpXTsgaSsrKSB7XG4gICAgICBjb25zdCBiID0gcHJnW2ldO1xuICAgICAgdGhpcy5ieXRlcy5wdXNoKGIpO1xuICAgICAgaWYgKGIgPT09IDEpIHtcbiAgICAgICAgLy8gTk9URSAtIHRoZXJlIGlzIG9uZSBjYXNlIHdoZXJlIHR3byBtZXNzYWdlcyBzZWVtIHRvIGFidXQgd2l0aG91dCBhXG4gICAgICAgIC8vIG51bGwgdGVybWluYXRvciAtICQyY2E5MSAoJDEyOiQwOCkgZmFsbHMgdGhyb3VnaCBmcm9tIDEyOjA3LiAgV2UgZml4XG4gICAgICAgIC8vIHRoYXQgd2l0aCBhbiBhZGp1c3RtZW50IGluIHJvbS50cywgYnV0IHRoaXMgZGV0ZWN0cyBpdCBqdXN0IGluIGNhc2UuXG4gICAgICAgIGlmIChpICE9PSBvZmZzZXQgJiYgcHJnW2kgLSAxXSAhPT0gMykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBzdGFydCBtZXNzYWdlIHNpZ25hbCBhdCAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDIpIHtcbiAgICAgICAgcGFydHMucHVzaCgnXFxuICcpO1xuICAgICAgfSBlbHNlIGlmIChiID09PSAzKSB7XG4gICAgICAgIHBhcnRzLnB1c2goYCR7TWVzc2FnZXMuQ09OVElOVUVEfVxcbmApOyAvLyBibGFjayBkb3duLXBvaW50aW5nIHRyaWFuZ2xlXG4gICAgICB9IGVsc2UgaWYgKGIgPT09IDQpIHtcbiAgICAgICAgcGFydHMucHVzaCgnezpIRVJPOn0nKTtcbiAgICAgIH0gZWxzZSBpZiAoYiA9PT0gOCkge1xuICAgICAgICBwYXJ0cy5wdXNoKCdbOklURU06XScpO1xuICAgICAgfSBlbHNlIGlmIChiID49IDUgJiYgYiA8PSA5KSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBwcmdbKytpXTtcbiAgICAgICAgdGhpcy5ieXRlcy5wdXNoKG5leHQpO1xuICAgICAgICBpZiAoYiA9PT0gOSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnLnJlcGVhdChuZXh0KSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGVsaW1zID0gREVMSU1JVEVSUy5nZXQoYik7XG4gICAgICAgIGlmIChkZWxpbXMpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKGRlbGltc1swXSk7XG4gICAgICAgICAgcGFydHMucHVzaChuZXh0LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKTtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCc6Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaCh3b3JkcyhuZXh0LCBiKSk7XG4gICAgICAgIGlmIChkZWxpbXMpIHBhcnRzLnB1c2goZGVsaW1zWzFdKTtcbiAgICAgICAgaWYgKCFQVU5DVFVBVElPTltTdHJpbmcuZnJvbUNoYXJDb2RlKHByZ1tpICsgMV0pXSkge1xuICAgICAgICAgIHBhcnRzLnB1c2goJyAnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiID49IDB4ODApIHtcbiAgICAgICAgcGFydHMucHVzaCh3b3JkcyhiLCAwKSk7XG4gICAgICAgIGlmICghUFVOQ1RVQVRJT05bU3RyaW5nLmZyb21DaGFyQ29kZShwcmdbaSArIDFdKV0pIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKCcgJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYiA+PSAweDIwKSB7XG4gICAgICAgIHBhcnRzLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShiKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi1leGhhdXN0aXZlIHN3aXRjaDogJHtifSBhdCAke2kudG9TdHJpbmcoMTYpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnRleHQgPSBwYXJ0cy5qb2luKCcnKTtcbiAgfVxuXG4gIGdldCBtaWQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7aGV4KHRoaXMucGFydCl9OiR7aGV4KHRoaXMuaWQpfWA7XG4gIH1cblxuICAvLyBGaXhlcyB0aGUgdGV4dCB0byBlbnN1cmUgaXQgZml0cyBpbiB0aGUgZGlhbG9nIGJveC5cbiAgLy8gQ29uc3RyYWludHM6XG4gIC8vICAtIG5vIGxpbmUgaXMgbG9uZ2VyIHRoYW4gMjggY2hhcmFjdGVyc1xuICAvLyAgLSBmaXJzdCBsaW5lIGFmdGVyIGEgXFxuIGlzIGluZGVudGVkIG9uZSBzcGFjZVxuICAvLyAgLSB1bmNhcGl0YWxpemVkICh1bnB1bmN0dWF0ZWQ/KSBmaXJzdCBjaGFyYWN0ZXJzIGFyZSBpbmRlbnRlZCwgdG9vXG4gIC8vICAtIHdyYXAgb3IgdW53cmFwIGFueSBwZXJzb24gb3IgaXRlbSBuYW1lc1xuICAvLyAgLSBhdCBtb3N0IGZvdXIgbGluZXMgcGVyIG1lc3NhZ2UgYm94XG4gIC8vIElmIGFueSB2aW9sYXRpb25zIGFyZSBmb3VuZCwgdGhlIGVudGlyZSBtZXNzYWdlIGlzIHJlZmxvd2VkLlxuICBmaXhUZXh0KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmNoZWNrVGV4dCgpKSByZXR1cm47XG4gICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IGxpbmVOdW0gPSAwO1xuICAgIGxldCBsaW5lTGVuID0gMDtcbiAgICBsZXQgc3BhY2UgPSBmYWxzZTtcbiAgICAvLyBUT0RPIC0gY2hhbmdlIHdvcmQgaW50byBzb21ldGhpbmcgZmFuY2llciAtIGFuIGFycmF5IG9mXG4gICAgLy8gKHN0ciwgbGVuLCBmYWxsYmFjaykgc28gdGhhdCBwdW5jdHVhdGlvbiBhZnRlciBhblxuICAgIC8vIGV4cGFuc2lvbiBkb2Vzbid0IHNjcmV3IHVzIHVwLlxuICAgIC8vIE9SLi4uIGp1c3QgaW5zZXJ0IHRoZSBmYWxsYmFjayBldmVyeSB0aW1lIGFuZCBpbnN0ZWFkIG1lbW9pemVcbiAgICAvLyB0aGUgZXhwYW5zaW9uIHRvIHJlcGxhY2UgYXQgdGhlIGVuZCBpZiB0aGVyZSdzIG5vIGJyZWFrLlxuICAgIGxldCB3b3JkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGV4cGFuc2lvbnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGZ1bmN0aW9uIGluc2VydChzdHI6IHN0cmluZywgbGVuOiBudW1iZXIgPSBzdHIubGVuZ3RoKSB7XG4gICAgICAvLyBUT0RPIC0gd2hhdCBkbyB3ZSBkbyB3aXRoIGV4aXN0aW5nIHBhZ2UgYnJlYWtzP1xuICAgICAgLy8gICAgICAtIGlmIHdlIGV2ZXIgbmVlZCB0byBfbW92ZV8gb25lIHRoZW4gd2Ugc2hvdWxkIElHTk9SRSBpdD9cbiAgICAgIC8vICAgICAgLSBzYW1lIHdpdGggbmV3bGluZXMuLi5cbiAgICAgIC8vIGlmIChzdHIgPT09ICcjJykge1xuICAgICAgLy8gICBuZXdsaW5lKCk7XG4gICAgICAvLyAgIHJldHVybjtcbiAgICAgIC8vIH1cbiAgICAgIGlmIChsaW5lTGVuICsgbGVuID4gMjgpIG5ld2xpbmUoKTtcbiAgICAgIGlmIChzdHIgPT09ICcgJykge1xuICAgICAgICBwYXJ0cy5wdXNoKC4uLndvcmQsICcgJyk7XG4gICAgICAgIHdvcmQgPSBbXTtcbiAgICAgIH0gZWxzZSBpZiAoL15bW3tdOi8udGVzdChzdHIpKSB7XG4gICAgICAgIHdvcmQucHVzaCh7dG9TdHJpbmc6ICgpID0+IHN0ciwgbGVuZ3RoOiBsZW59IGFzIGFueSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3b3JkLnB1c2goc3RyKTtcbiAgICAgIH1cbiAgICAgIGxpbmVMZW4gKz0gbGVuO1xuICAgICAgc3BhY2UgPSBzdHIuZW5kc1dpdGgoJyAnKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5zZXJ0U3BhY2UoKSB7XG4gICAgICBpZiAoIXNwYWNlKSBpbnNlcnQoJyAnKTtcbiAgICAgIHNwYWNlID0gdHJ1ZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5zZXJ0QWxsKHN0cjogc3RyaW5nKSB7XG4gICAgICBjb25zdCBzcGxpdCA9IHN0ci5zcGxpdCgvXFxzKy8pO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGxpdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaSkgaW5zZXJ0U3BhY2UoKTtcbiAgICAgICAgaW5zZXJ0KHNwbGl0W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gbmV3bGluZSgpIHtcbiAgICAgIGxpbmVMZW4gPSAxICsgd29yZC5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLmxlbmd0aCwgMCk7XG4gICAgICBpZiAoKytsaW5lTnVtID4gMikge1xuICAgICAgICAvLyBOT1RFOiB3ZSBjYW4gc29tZXRpbWVzIGhhbmRsZSAzLCBidXQgbmVlZCB0byBrbm93IHRoZVxuICAgICAgICAvLyBjb250ZXh0OiBpcyBpdCBlaXRoZXIgdGhlIF9sYXN0XyBsaW5lIG9yIGEgX3Nob3J0XyBsaW5lP1xuICAgICAgICBwYXJ0cy5wdXNoKCcjXFxuICcpO1xuICAgICAgICBsaW5lTnVtID0gMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnRzLnB1c2goJ1xcbiAnKTtcbiAgICAgIH1cbiAgICAgIHNwYWNlID0gdHJ1ZTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRleHQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLnRleHRbaV07XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy50ZXh0W2kgKyAxXTtcbiAgICAgIGlmICgvW1xcc1xcbiNdLy50ZXN0KGMpKSB7XG4gICAgICAgIGluc2VydFNwYWNlKCk7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICd7Jykge1xuICAgICAgICBpZiAobmV4dCA9PT0gJzonKSB7XG4gICAgICAgICAgaW5zZXJ0KCd7OkhFUk86fScsIDYpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNvbG9uID0gdGhpcy50ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0aGlzLnRleHQuc3Vic3RyaW5nKGkgKyAxLCBjb2xvbiksIDE2KTtcbiAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5tZXNzYWdlcy5leHRyYVdvcmRzWzZdW2lkXTtcbiAgICAgICAgICBleHBhbnNpb25zLnNldChuYW1lLCBgeyR7aWQudG9TdHJpbmcoMTYpfToke25hbWV9fWApO1xuICAgICAgICAgIGluc2VydEFsbChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy50ZXh0LmluZGV4T2YoJ30nLCBpKTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1snKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnOicpIHtcbiAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMubWVzc2FnZXMucm9tLml0ZW1zO1xuICAgICAgICAgIGluc2VydCgnWzpJVEVNOl0nLCBNYXRoLm1heCguLi5pdGVtcy5tYXAoaSA9PiBpLm1lc3NhZ2VOYW1lLmxlbmd0aCkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjb2xvbiA9IHRoaXMudGV4dC5pbmRleE9mKCc6JywgaSk7XG4gICAgICAgICAgY29uc3QgaWQgPSBOdW1iZXIucGFyc2VJbnQodGhpcy50ZXh0LnN1YnN0cmluZyhpICsgMSwgY29sb24pLCAxNik7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMubWVzc2FnZXMucm9tLml0ZW1zW2lkXS5tZXNzYWdlTmFtZTtcbiAgICAgICAgICBleHBhbnNpb25zLnNldChuYW1lLCBgWyR7aWQudG9TdHJpbmcoMTYpfToke25hbWV9XWApO1xuICAgICAgICAgIGluc2VydEFsbChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy50ZXh0LmluZGV4T2YoJ10nLCBpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluc2VydChjKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFydHMucHVzaCguLi53b3JkKTtcbiAgICBsZXQgdGV4dCA9IHBhcnRzLmpvaW4oJycpO1xuICAgIGZvciAoY29uc3QgW2Z1bGwsIGFiYnJdIG9mIGV4cGFuc2lvbnMpIHtcbiAgICAgIGlmICh0ZXh0LmluY2x1ZGVzKGZ1bGwpKSB0ZXh0ID0gdGV4dC5zcGxpdChmdWxsKS5qb2luKGFiYnIpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKGBSRUZMT1cgJHt0aGlzLm1pZH1cXG4ke3RoaXMudGV4dC5yZXBsYWNlKC9efCQvbWcsICd8JylcbiAgICAvLyAgICAgICAgICAgICB9XFxuICAod2l0aClcXG4ke3RleHQucmVwbGFjZSgvXnwkL21nLCAnfCcpfWApO1xuICAgIHRoaXMudGV4dCA9IHRleHQ7XG4gIH1cblxuICBjaGVja1RleHQoKTogYm9vbGVhbiB7XG4gICAgbGV0IGxpbmVOdW0gPSAwO1xuICAgIGxldCBsaW5lTGVuID0gMDtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy50ZXh0LnJlcGxhY2UoL1xccyskL21nLCAnJyk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGV4dFtpXTtcbiAgICAgIGNvbnN0IG5leHQgPSB0ZXh0W2kgKyAxXTtcbiAgICAgIGlmIChjID09PSAnXFxuJykge1xuICAgICAgICBsaW5lTnVtKys7XG4gICAgICAgIGxpbmVMZW4gPSAwO1xuICAgICAgICBpZiAobGluZU51bSA+IDMpIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJyMnKSB7XG4gICAgICAgIGlmIChuZXh0ID09PSAnXFxuJykgaSsrOyAvLyBlYXQgbmV3bGluZVxuICAgICAgICBsaW5lTnVtID0gbGluZUxlbiA9IDA7XG4gICAgICB9IGVsc2UgaWYgKGMgPT09ICd7JyB8fCBjID09PSAnWycpIHtcbiAgICAgICAgaWYgKG5leHQgPT09ICc6Jykge1xuICAgICAgICAgIGlmIChjID09PSAneycpIHsgLy8gezpIRVJPOn1cbiAgICAgICAgICAgIGxpbmVMZW4gKz0gNjtcbiAgICAgICAgICB9IGVsc2UgeyAvLyBbOklURU06XVxuICAgICAgICAgICAgLy8gY29tcHV0ZSB0aGUgbWF4IGl0ZW0gbGVuZ3RoXG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMubWVzc2FnZXMucm9tLml0ZW1zO1xuICAgICAgICAgICAgbGluZUxlbiArPSBNYXRoLm1heCguLi5pdGVtcy5tYXAoaSA9PiBpLm1lc3NhZ2VOYW1lLmxlbmd0aCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobGluZUxlbiA+IDI4KSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY29sb24gPSB0ZXh0LmluZGV4T2YoJzonLCBpKTtcbiAgICAgICAgICBjb25zdCBpZCA9IE51bWJlci5wYXJzZUludCh0ZXh0LnN1YnN0cmluZyhpICsgMSwgY29sb24pLCAxNik7XG4gICAgICAgICAgbGluZUxlbiArPSAoYyA9PT0gJ3snID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tZXNzYWdlcy5wZXJzb25OYW1lc1tpZF0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1lc3NhZ2VzLml0ZW1OYW1lc1tpZF0pLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGV4dC5pbmRleE9mKENMT1NFUlNbY10sIGkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGluZUxlbisrO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmVMZW4gPiAyOCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGxpbmVMZW4gPiAxNCAmJiBsaW5lTnVtID4gMiAmJiB0ZXh0LmluY2x1ZGVzKCcjJywgaSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuY29uc3QgUFVOQ1RVQVRJT046IHtbY2hhcjogc3RyaW5nXTogYm9vbGVhbn0gPSB7XG4gICdcXDAnOiB0cnVlLFxuICAnICc6IHRydWUsXG4gICchJzogdHJ1ZSxcbiAgJ1xcJyc6IHRydWUsXG4gICcsJzogdHJ1ZSxcbiAgJy4nOiB0cnVlLFxuICAnOic6IHRydWUsXG4gICc7JzogdHJ1ZSxcbiAgJz8nOiB0cnVlLFxuICAnXyc6IHRydWUsXG5cbiAgLy8gPz8/P1xuICAnXFxuJzogdHJ1ZSwgLy8gbGluZSBzZXBhcmF0b3JcbiAgJyMnOiB0cnVlLCAgLy8gcGFnZSBzZXBhcmF0b3Jcbn07XG5cbi8vIE5PVEU6IHRoZSArMSB2ZXJzaW9uIGlzIGFsd2F5cyBhdCArNSBmcm9tIHRoZSBwb2ludGVyXG5jb25zdCBDT01NT05fV09SRFNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NzA0KTtcbmNvbnN0IFVOQ09NTU9OX1dPUkRTX0JBU0VfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODY4YSk7XG5jb25zdCBQRVJTT05fTkFNRVNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NmQ1KTtcbmNvbnN0IElURU1fTkFNRVNfQkFTRV9QVFIgPSBBZGRyZXNzLm9mKCQxNCwgMHg4NmU5KTtcbmNvbnN0IElURU1fTkFNRVNfQkFTRV9QVFIyID0gQWRkcmVzcy5vZigkMTQsIDB4ODc4OSk7XG5cbmNvbnN0IEJBTktTX1BUUiA9IEFkZHJlc3Mub2YoJDE0LCAweDg1NDEpO1xuY29uc3QgQkFOS1NfUFRSMiA9IEFkZHJlc3Mub2YoJDE0LCAweDg2NGMpO1xuY29uc3QgUEFSVFNfUFRSID0gQWRkcmVzcy5vZigkMTQsIDB4ODU0Yyk7XG5cbmNvbnN0IFNFR01FTlRTOiBSZWNvcmQ8bnVtYmVyLCBTZWdtZW50PiA9IHtcbiAgMHgxNTogJDE1LFxuICAweDE2OiAkMTZfYSxcbiAgMHgxNzogJDE3LFxufTtcblxuXG5leHBvcnQgY2xhc3MgTWVzc2FnZXMge1xuXG4gIC8vIFRPRE8gLSB3ZSBtaWdodCB3YW50IHRvIGVuY29kZSB0aGlzIGluIHRoZSBzcGFyZSByb20gZGF0YVxuICBwYXJ0Q291bnQ6IG51bWJlciA9IDB4MjI7XG5cbiAgY29tbW9uV29yZHM6IHN0cmluZ1tdID0gW107XG4gIHVuY29tbW9uV29yZHM6IHN0cmluZ1tdID0gW107XG4gIHBlcnNvbk5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBpdGVtTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGV4dHJhV29yZHM6IHtbZ3JvdXA6IG51bWJlcl06IHN0cmluZ1tdfTtcbiAgYmFua3M6IG51bWJlcltdO1xuICBwYXJ0czogTWVzc2FnZVtdW10gPSBbXTtcblxuICAvLyBOT1RFOiB0aGVzZSBkYXRhIHN0cnVjdHVyZXMgYXJlIHJlZHVuZGFudCB3aXRoIHRoZSBhYm92ZS5cbiAgLy8gT25jZSB3ZSBnZXQgdGhpbmdzIHdvcmtpbmcgc21vb3RobHksIHdlIHNob3VsZCBjbGVhbiBpdCB1cFxuICAvLyB0byBvbmx5IHVzZSBvbmUgb3IgdGhlIG90aGVyLlxuICAvLyBhYmJyZXZpYXRpb25zOiBzdHJpbmdbXTtcbiAgLy8gcGVyc29uTmFtZXM6IHN0cmluZ1tdO1xuXG4gIC8vIHN0YXRpYyByZWFkb25seSBDT05USU5VRUQgPSAnXFx1MjViYyc7XG4gIHN0YXRpYyByZWFkb25seSBDT05USU5VRUQgPSAnIyc7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20pIHtcbiAgICBjb25zdCBjb21tb25Xb3Jkc0Jhc2UgPSBDT01NT05fV09SRFNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgdW5jb21tb25Xb3Jkc0Jhc2UgPSBVTkNPTU1PTl9XT1JEU19CQVNFX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcbiAgICBjb25zdCBwZXJzb25OYW1lc0Jhc2UgPSBQRVJTT05fTkFNRVNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgaXRlbU5hbWVzQmFzZSA9IElURU1fTkFNRVNfQkFTRV9QVFIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgY29uc3QgYmFua3NCYXNlID0gQkFOS1NfUFRSLnJlYWRBZGRyZXNzKHJvbS5wcmcpO1xuICAgIGNvbnN0IHBhcnRzQmFzZSA9IFBBUlRTX1BUUi5yZWFkQWRkcmVzcyhyb20ucHJnKTtcblxuICAgIGNvbnN0IGJhc2VzOiBSZWNvcmQ8bnVtYmVyLCBBZGRyZXNzPiA9IHtcbiAgICAgIDU6IHVuY29tbW9uV29yZHNCYXNlLFxuICAgICAgNjogcGVyc29uTmFtZXNCYXNlLFxuICAgICAgNzogaXRlbU5hbWVzQmFzZSxcbiAgICB9O1xuXG4gICAgLy9jb25zdCBzdHIgPSAoYTogbnVtYmVyKSA9PiByZWFkU3RyaW5nKHJvbS5wcmcsIGEpO1xuICAgIC8vIFRPRE8gLSByZWFkIHRoZXNlIGFkZHJlc3NlcyBkaXJlY3RseSBmcm9tIHRoZSBjb2RlLCBpbiBjYXNlIHRoZXkgbW92ZVxuICAgIC8vIHRoaXMuY29tbW9uV29yZHMgPSBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgY29tbW9uV29yZHNCYXNlLCAweDgwLCAweDIwMDAwLCBzdHIpO1xuICAgIC8vIHVuY29tbW9uV29yZHMgPSBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgZXh0cmFXb3Jkc0Jhc2UsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgIChwZXJzb25OYW1lc0Jhc2UubWludXMoZXh0cmFXb3Jkc0Jhc2UpKSA+Pj4gMSxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgJzEwJywgc3RyKSwgLy8gbGVzcyBjb21tb25cbiAgICAvLyBwZXJzb25OYW1lcyA9IHBlcnNvbk5hbWVzQmFzZSwgMzYsICcxMCcsIHN0ciksIC8vIHBlb3BsZS9wbGFjZXNcbiAgICAvLyBpdGVtTmFtZXMgPSBuZXcgQWRkcmVzc1RhYmxlKHJvbSwgaXRlbU5hbWVzQmFzZSwgNzQsICcxMCcsIHN0ciksIC8vIGl0ZW1zIChhbHNvIDg/KVxuICAgIHRoaXMuZXh0cmFXb3JkcyA9IHtcbiAgICAgIDU6IHRoaXMudW5jb21tb25Xb3JkcyxcbiAgICAgIDY6IHRoaXMucGVyc29uTmFtZXMsXG4gICAgICA3OiB0aGlzLml0ZW1OYW1lcyxcbiAgICB9O1xuXG4gICAgY29uc3QgZ2V0V29yZCA9IChhcnI6IHN0cmluZ1tdLCBiYXNlOiBBZGRyZXNzLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBsZXQgd29yZCA9IGFycltpbmRleF07XG4gICAgICBpZiAod29yZCAhPSBudWxsKSByZXR1cm4gd29yZDtcbiAgICAgIHdvcmQgPSByZWFkU3RyaW5nKHJvbS5wcmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlLnBsdXMoMiAqIGluZGV4KS5yZWFkQWRkcmVzcyhyb20ucHJnKS5vZmZzZXQpO1xuICAgICAgcmV0dXJuIChhcnJbaW5kZXhdID0gd29yZCk7XG4gICAgfTtcblxuICAgIC8vIExhemlseSByZWFkIHRoZSB3b3Jkc1xuICAgIGNvbnN0IHdvcmRzID0gKGlkOiBudW1iZXIsIGdyb3VwOiBudW1iZXIpID0+IHtcbiAgICAgIGlmICghZ3JvdXApIHJldHVybiBnZXRXb3JkKHRoaXMuY29tbW9uV29yZHMsIGNvbW1vbldvcmRzQmFzZSwgaWQgLSAweDgwKTtcbiAgICAgIHJldHVybiBnZXRXb3JkKHRoaXMuZXh0cmFXb3Jkc1tncm91cF0sIGJhc2VzW2dyb3VwXSwgaWQpO1xuICAgIH07XG4gICAgLy8gYnV0IGVhZ2VybHkgcmVhZCBpdGVtIG5hbWVzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweDQ5IC8qcm9tLml0ZW1zLmxlbmd0aCovOyBpKyspIHtcbiAgICAgIHdvcmRzKGksIDcpO1xuICAgIH1cblxuICAgIC8vIE5PVEU6IHdlIG1haW50YWluIHRoZSBpbnZhcmlhbnQgdGhhdCB0aGUgYmFua3MgdGFibGUgZGlyZWN0bHlcbiAgICAvLyBmb2xsb3dzIHRoZSBwYXJ0cyB0YWJsZXMsIHdoaWNoIGFyZSBpbiBvcmRlciwgc28gdGhhdCB3ZSBjYW5cbiAgICAvLyBkZXRlY3QgdGhlIGVuZCBvZiBlYWNoIHBhcnQuICBPdGhlcndpc2UgdGhlcmUgaXMgbm8gZ3VhcmFudGVlXG4gICAgLy8gaG93IGxhcmdlIHRoZSBwYXJ0IGFjdHVhbGx5IGlzLlxuXG4gICAgbGV0IGxhc3RQYXJ0ID0gYmFua3NCYXNlLm9mZnNldDtcbiAgICB0aGlzLmJhbmtzID0gdHVwbGUocm9tLnByZywgbGFzdFBhcnQsIHRoaXMucGFydENvdW50KTtcbiAgICBmb3IgKGxldCBwID0gdGhpcy5wYXJ0Q291bnQgLSAxOyBwID49IDA7IHAtLSkge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwYXJ0c0Jhc2UucGx1cygyICogcCkucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgICBjb25zdCBsZW4gPSAobGFzdFBhcnQgLSBzdGFydC5vZmZzZXQpID4+PiAxO1xuICAgICAgbGFzdFBhcnQgPSBzdGFydC5vZmZzZXQ7XG4gICAgICBjb25zdCBzZWcgPSBTRUdNRU5UU1t0aGlzLmJhbmtzW3BdXTtcbiAgICAgIGNvbnN0IHBhcnQ6IE1lc3NhZ2VbXSA9IHRoaXMucGFydHNbcF0gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3QgYWRkciA9IHN0YXJ0LnBsdXMoMiAqIGkpLnJlYWRBZGRyZXNzKHJvbS5wcmcsIHNlZyk7XG4gICAgICAgIHBhcnRbaV0gPSBuZXcgTWVzc2FnZSh0aGlzLCBwLCBpLCBhZGRyLm9mZnNldCwgd29yZHMpO1xuICAgICAgfVxuICAgIH1cblxuICAvLyAgIHRoaXMucGFydHMgPSBuZXcgQWRkcmVzc1RhYmxlKFxuICAvLyAgICAgICByb20sIDB4Mjg0MjIsIDB4MjIsIDB4MjAwMDAsXG4gIC8vICAgICAgIChhZGRyLCBwYXJ0LCBhZGRycykgPT4ge1xuICAvLyAgICAgICAgIC8vIG5lZWQgdG8gY29tcHV0ZSB0aGUgZW5kIGJhc2VkIG9uIHRoZSBhcnJheT9cbiAgLy8gICAgICAgICBjb25zdCBjb3VudCA9IHBhcnQgPT09IDB4MjEgPyAzIDogKGFkZHJzW3BhcnQgKyAxXSAtIGFkZHIpID4+PiAxO1xuICAvLyAgICAgICAgIC8vIG9mZnNldDogYmFuaz0kMTUgPT4gJDIwMDAwLCBiYW5rPSQxNiA9PiAkMjIwMDAsIGJhbms9JDE3ID0+ICQyNDAwMFxuICAvLyAgICAgICAgIC8vIHN1YnRyYWN0ICRhMDAwIGJlY2F1c2UgdGhhdCdzIHRoZSBwYWdlIHdlJ3JlIGxvYWRpbmcgYXQuXG4gIC8vICAgICAgICAgcmV0dXJuIG5ldyBBZGRyZXNzVGFibGUoXG4gIC8vICAgICAgICAgICAgIHJvbSwgYWRkciwgY291bnQsICh0aGlzLmJhbmtzW3BhcnRdIDw8IDEzKSAtIDB4YTAwMCxcbiAgLy8gICAgICAgICAgICAgKG0sIGlkKSA9PiBuZXcgTWVzc2FnZSh0aGlzLCBwYXJ0LCBpZCwgbSwgYWRkciArIDIgKiBpZCkpO1xuICAvLyAgICAgICB9KTtcbiAgfVxuXG4gIC8vIEZsYXR0ZW5zIHRoZSBtZXNzYWdlcy4gIE5PVEU6IHJldHVybnMgdW51c2VkIG1lc3NhZ2VzLlxuICAqIG1lc3NhZ2VzKHVzZWQ/OiB7aGFzOiAobWlkOiBzdHJpbmcpID0+IGJvb2xlYW59KTogSXRlcmFibGU8TWVzc2FnZT4ge1xuICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLnBhcnRzKSB7XG4gICAgICBpZiAodXNlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IG1lc3NhZ2Ugb2YgcGFydCkge1xuICAgICAgICAgIGlmICh1c2VkLmhhcyhtZXNzYWdlLm1pZCkpIHlpZWxkIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHlpZWxkICogcGFydDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhbGxvYygpOiBNZXNzYWdlIHtcbiAgICBjb25zdCB1c2VkID0gdGhpcy51c2VzKCk7XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMucGFydHMpIHtcbiAgICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiBwYXJ0KSB7XG4gICAgICAgIGlmICghdXNlZC5oYXMobWVzc2FnZS5taWQpKSB7XG4gICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBjb3VsZCBub3QgZmluZCBhbiB1bnVzZWQgbWVzc2FnZSBpZGApO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIG1hcCBmcm9tIG1lc3NhZ2UgaWQgKG1pZCkgdG8ga25vd24gdXNhZ2VzLlxuICB1c2VzKCk6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PiB7XG4gICAgY29uc3Qgb3V0ID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xuICAgIGZ1bmN0aW9uIHVzZShtZXNzYWdlOiBNZXNzYWdlSWQgfCBzdHJpbmcsIHVzYWdlOiBzdHJpbmcpIHtcbiAgICAgIGNvbnN0IHN0ciA9IHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJyA/IG1lc3NhZ2UgOiBtZXNzYWdlLm1pZDtcbiAgICAgIGNvbnN0IHNldCA9IG91dC5nZXQoc3RyKSB8fCBuZXcgU2V0KCk7XG4gICAgICBzZXQuYWRkKHVzYWdlKTtcbiAgICAgIG91dC5zZXQoc3RyLCBzZXQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHRyaWdnZXIgb2YgdGhpcy5yb20udHJpZ2dlcnMpIHtcbiAgICAgIGlmICh0cmlnZ2VyLm1lc3NhZ2Uubm9uemVybygpKSB7XG4gICAgICAgIHVzZSh0cmlnZ2VyLm1lc3NhZ2UsIGBUcmlnZ2VyICQke2hleCh0cmlnZ2VyLmlkKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMucm9tLml0ZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IG0gb2YgaXRlbS5pdGVtVXNlTWVzc2FnZXMoKSkge1xuICAgICAgICBpZiAobS5ub256ZXJvKCkpIHVzZShtLCBgSXRlbSAkJHtoZXgoaXRlbS5pZCl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgbnBjIG9mIHRoaXMucm9tLm5wY3MpIHtcbiAgICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgICB1c2UoZC5tZXNzYWdlLCBgTlBDICQke2hleChucGMuaWQpfWApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbbCwgZHNdIG9mIG5wYy5sb2NhbERpYWxvZ3MpIHtcbiAgICAgICAgY29uc3QgbGggPSBsID49IDAgPyBgIEAgJCR7aGV4KGwpfWAgOiAnJztcbiAgICAgICAgZm9yIChjb25zdCBkIG9mIGRzKSB7XG4gICAgICAgICAgdXNlKGQubWVzc2FnZSwgYE5QQyAkJHtoZXgobnBjLmlkKX0ke2xofWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc2FnZSBvZiB0aGlzLnJvbS50ZWxlcGF0aHkuc2FnZXMpIHtcbiAgICAgIGZvciAoY29uc3QgZCBvZiBzYWdlLmRlZmF1bHRNZXNzYWdlcykge1xuICAgICAgICB1c2UoZCwgYFRlbGVwYXRoeSAke3NhZ2Uuc2FnZX1gKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZyBvZiBzYWdlLm1lc3NhZ2VHcm91cHMpIHtcbiAgICAgICAgZm9yIChjb25zdCBbLCAuLi5tc10gb2YgZy5tZXNzYWdlcykge1xuICAgICAgICAgIGZvciAoY29uc3QgbSBvZiBtcykge1xuICAgICAgICAgICAgdXNlKG0hLCBgVGVsZXBhdGh5ICR7c2FnZS5zYWdlfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IG0gb2YgSEFSRENPREVEX01FU1NBR0VTKSB7XG4gICAgICB1c2UobSwgJ0hhcmRjb2RlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgYnVpbGRBYmJyZXZpYXRpb25UYWJsZSh1c2VzID0gdGhpcy51c2VzKCkpOiBBYmJyZXZpYXRpb25bXSB7XG4gICAgLy8gQ291bnQgZnJlcXVlbmNpZXMgb2YgdXNlZCBzdWZmaXhlcy5cbiAgICBpbnRlcmZhY2UgU3VmZml4IHtcbiAgICAgIC8vIEFjdHVhbCBzdHJpbmdcbiAgICAgIHN0cjogc3RyaW5nO1xuICAgICAgLy8gVG90YWwgbnVtYmVyIG9mIGJ5dGVzIHNhdmVkIG92ZXIgYWxsIG9jY3VycmVuY2VzXG4gICAgICBzYXZpbmc6IG51bWJlcjtcbiAgICAgIC8vIEFsbCB0aGUgaW5pdGlhbCB3b3JkcyB0aGlzIGlzIGluIChub3QgY291bnRpbmcgY2hhaW5zKVxuICAgICAgd29yZHM6IFNldDxudW1iZXI+O1xuICAgICAgLy8gTnVtYmVyIG9mIGNoYWluc1xuICAgICAgY2hhaW5zOiBudW1iZXI7XG4gICAgICAvLyBOdW1iZXIgb2YgbGV0dGVycyBtaXNzaW5nIGZyb20gdGhlIGZpcnN0IHdvcmRcbiAgICAgIG1pc3Npbmc6IG51bWJlcjtcbiAgICB9XG4gICAgaW50ZXJmYWNlIFdvcmQge1xuICAgICAgLy8gQWN0dWFsIHN0cmluZ1xuICAgICAgc3RyOiBzdHJpbmc7XG4gICAgICAvLyBJbmRleCBpbiBsaXN0XG4gICAgICBpZDogbnVtYmVyO1xuICAgICAgLy8gVGhlIGNoYWluYWJsZSBwdW5jdHVhdGlvbiBhZnRlciB0aGlzIHdvcmQgKHNwYWNlIG9yIGFwb3N0cm9waGUpXG4gICAgICBjaGFpbjogc3RyaW5nO1xuICAgICAgLy8gUG9zc2libGUgYnl0ZXMgdG8gYmUgc2F2ZWRcbiAgICAgIGJ5dGVzOiBudW1iZXI7XG4gICAgICAvLyBOdW1iZXIgb2YgY2hhcmFjdGVycyBjdXJyZW50bHkgYmVpbmcgY29tcHJlc3NlZFxuICAgICAgdXNlZDogbnVtYmVyO1xuICAgICAgLy8gQWxsIHN1ZmZpeGVzIHRoYXQgdG91Y2ggdGhpcyB3b3JkXG4gICAgICBzdWZmaXhlczogU2V0PFN1ZmZpeD47XG4gICAgICAvLyBNZXNzYWdlIElEXG4gICAgICBtaWQ6IHN0cmluZztcbiAgICB9XG5cbiAgICAvLyBPcmRlcmVkIGxpc3Qgb2Ygd29yZHNcbiAgICBjb25zdCB3b3JkczogV29yZFtdID0gW107XG4gICAgLy8gS2VlcCB0cmFjayBvZiBhZGRyZXNzZXMgd2UndmUgc2VlbiwgbWFwcGluZyB0byBtZXNzYWdlIElEcyBmb3IgYWxpYXNpbmcuXG4gICAgY29uc3QgYWRkcnMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIC8vIEFsaWFzZXMgbWFwcGluZyBtdWx0aXBsZSBtZXNzYWdlIElEcyB0byBhbHJlYWR5LXNlZW4gb25lcy5cbiAgICBjb25zdCBhbGlhcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcblxuICAgIGZvciAoY29uc3QgbWVzc2FnZSBvZiB0aGlzLm1lc3NhZ2VzKHVzZXMpKSB7XG4gICAgICAvLyBUT0RPIC0gY2FuJ3QgbGFuZCByZWZsb3cgdW50aWwgd2UgaGF2ZSBsaXBzdW0gdGV4dC5cbiAgICAgIG1lc3NhZ2UuZml4VGV4dCgpO1xuICAgICAgY29uc3QgbWlkID0gbWVzc2FnZS5taWQ7XG4gICAgICAvLyBEb24ndCByZWFkIHRoZSBzYW1lIG1lc3NhZ2UgdHdpY2UuXG4gICAgICBjb25zdCBzZWVuID0gYWRkcnMuZ2V0KG1lc3NhZ2UudGV4dCk7XG4gICAgICBjb25zdCBhbGlhc2VzID0gc2VlbiAhPSBudWxsICYmIGFsaWFzLmdldChzZWVuKTtcbiAgICAgIGlmIChhbGlhc2VzKSB7XG4gICAgICAgIGFsaWFzZXMucHVzaChtaWQpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGFkZHJzLnNldChtZXNzYWdlLnRleHQsIG1pZCk7XG4gICAgICBhbGlhcy5zZXQobWlkLCBbXSk7XG4gICAgICAvLyBTcGxpdCB1cCB0aGUgbWVzc2FnZSB0ZXh0IGludG8gd29yZHMuXG4gICAgICBjb25zdCB0ZXh0ID0gbWVzc2FnZS50ZXh0O1xuICAgICAgbGV0IGxldHRlcnMgPSBbXTtcblxuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHRleHQubGVuZ3RoOyBpIDw9IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0ZXh0W2ldO1xuICAgICAgICBjb25zdCBjbG9zZXIgPSBDTE9TRVJTW2NdO1xuICAgICAgICBpZiAoUFVOQ1RVQVRJT05bY10gfHwgY2xvc2VyIHx8IGkgPT09IGxlbikge1xuICAgICAgICAgIC8vIGlmIHRoZSBuZXh0IGNoYXJhY3RlciBpcyBub24tcHVuY3R1YXRpb24gdGhlbiBpdCBjaGFpbnNcbiAgICAgICAgICBjb25zdCBuZXh0ID0gdGV4dFtpICsgMV07XG4gICAgICAgICAgaWYgKGNsb3NlcikgaSA9IE1hdGgubWF4KGksIHRleHQuaW5kZXhPZihjbG9zZXIsIGkpKTtcbiAgICAgICAgICBpZiAoIWxldHRlcnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBjaGFpbiA9XG4gICAgICAgICAgICAgIChjID09PSAnICcgfHwgYyA9PT0gJ1xcJycpICYmIG5leHQgJiYgIVBVTkNUVUFUSU9OW25leHRdID8gYyA6ICcnO1xuICAgICAgICAgIGNvbnN0IHN0ciA9IGxldHRlcnMuam9pbignJyk7XG4gICAgICAgICAgY29uc3QgaWQgPSB3b3Jkcy5sZW5ndGg7XG4gICAgICAgICAgY29uc3QgYnl0ZXMgPSBzdHIubGVuZ3RoICsgKGMgPT09ICcgJyA/IDEgOiAwKTtcbiAgICAgICAgICBsZXR0ZXJzID0gW107XG4gICAgICAgICAgd29yZHMucHVzaChcbiAgICAgICAgICAgICAge3N0ciwgaWQsIGNoYWluLCBieXRlcywgdXNlZDogMCwgc3VmZml4ZXM6IG5ldyBTZXQoKSwgbWlkfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0dGVycy5wdXNoKGMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBtYXAgb2Ygc3RyaW5nIHRvIHN1ZmZpeFxuICAgIGNvbnN0IHN1ZmZpeGVzID0gbmV3IE1hcDxzdHJpbmcsIFN1ZmZpeD4oKTtcbiAgICBmb3IgKGxldCBpID0gd29yZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIC8vIEZvciBlYWNoIHdvcmRcbiAgICAgIGNvbnN0IHdvcmQgPSB3b3Jkc1tpXTtcbiAgICAgIGZvciAobGV0IGogPSB3b3JkLmJ5dGVzIC0gMjsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgLy8gRm9yIGVhY2ggc3VmZml4XG4gICAgICAgIGNvbnN0IHN1ZmZpeCA9IHdvcmQuc3RyLnN1YnN0cmluZyhqKTtcbiAgICAgICAgLy8gQ3VycmVudCBmdWxsIHN0cmluZywgYWRkaW5nIGFsbCB0aGUgY2hhaW5zIHNvIGZhclxuICAgICAgICBsZXQgc3RyID0gc3VmZml4O1xuICAgICAgICAvLyBOdW1iZXIgb2YgZXh0cmEgY2hhaW5zIGFkZGVkXG4gICAgICAgIGxldCBsZW4gPSAwO1xuICAgICAgICBsZXQgbGF0ZXIgPSB3b3JkO1xuICAgICAgICBsZXQgc2F2aW5nID0gd29yZC5ieXRlcyAtIGogLSAxO1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIC8vIEZvciBpdHNlbGYgYW5kIGVhY2ggY2hhaW5hYmxlIHdvcmQgdGhlcmVhZnRlclxuICAgICAgICAgIGxldCBkYXRhID0gc3VmZml4ZXMuZ2V0KHN0cik7XG4gICAgICAgICAgaWYgKCFkYXRhKSBzdWZmaXhlcy5zZXQoc3RyLCAoZGF0YSA9IHtjaGFpbnM6IGxlbiwgbWlzc2luZzogaixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdmluZzogLXN0ci5sZW5ndGgsIHN0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmRzOiBuZXcgU2V0KCl9KSk7XG4gICAgICAgICAgZGF0YS53b3Jkcy5hZGQoaSk7XG4gICAgICAgICAgZGF0YS5zYXZpbmcgKz0gc2F2aW5nO1xuICAgICAgICAgIC8vIExpbmsgdGhlIHN1ZmZpeGVzXG4gICAgICAgICAgZm9yIChsZXQgayA9IGxlbjsgayA+PSAwOyBrLS0pIHdvcmRzW2kgKyBrXS5zdWZmaXhlcy5hZGQoZGF0YSk7XG4gICAgICAgICAgaWYgKCFsYXRlci5jaGFpbikgYnJlYWs7XG4gICAgICAgICAgLy8gSWYgdGhlcmUncyBhbm90aGVyIHdvcmQgdG8gY2hhaW4gdG8sIHRoZW4gY29udGludWVcbiAgICAgICAgICBzdHIgKz0gbGF0ZXIuY2hhaW47XG4gICAgICAgICAgbGF0ZXIgPSB3b3Jkc1tpICsgKCsrbGVuKV07XG4gICAgICAgICAgc3RyICs9IGxhdGVyLnN0cjtcbiAgICAgICAgICBzYXZpbmcgKz0gbGF0ZXIuYnl0ZXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTb3J0IHRoZSBzdWZmaXhlcyB0byBmaW5kIHRoZSBtb3N0IGltcGFjdGZ1bFxuICAgIGNvbnN0IGludmFsaWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBhYmJyOiBBYmJyZXZpYXRpb25bXSA9IFtdO1xuICAgIGNvbnN0IG9yZGVyID0gKHtzYXZpbmc6IGF9OiBTdWZmaXgsIHtzYXZpbmc6IGJ9OiBTdWZmaXgpID0+IGIgLSBhO1xuICAgIGNvbnN0IHNvcnRlZCA9IFsuLi5zdWZmaXhlcy52YWx1ZXMoKV0uc29ydChvcmRlcik7XG4gICAgbGV0IHRhYmxlTGVuZ3RoID0gMDtcbiAgICB3aGlsZSAoc29ydGVkLmxlbmd0aCAmJiB0YWJsZUxlbmd0aCA8IE1BWF9UQUJMRV9MRU5HVEgpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBzb3J0IG9yZGVyIGhhcyBiZWVuIGludmFsaWRhdGVkIGFuZCByZXNvcnRcbiAgICAgIGlmIChpbnZhbGlkLmhhcyhzb3J0ZWRbMF0uc3RyKSkge1xuICAgICAgICBzb3J0ZWQuc29ydChvcmRlcik7XG4gICAgICAgIGludmFsaWQuY2xlYXIoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHtzdHIsIHNhdmluZywgbWlzc2luZywgd29yZHM6IHdzLCBjaGFpbnN9ID0gc29ydGVkLnNoaWZ0KCkhO1xuICAgICAgLy8gZmlndXJlIG91dCBpZiBpdCdzIHdvcnRoIGFkZGluZy4uLlxuICAgICAgaWYgKHNhdmluZyA8PSAwKSBicmVhaztcbiAgICAgIC8vIG1ha2UgdGhlIGFiYnJldmlhdGlvblxuICAgICAgdGFibGVMZW5ndGggKz0gc3RyLmxlbmd0aCArIDM7XG4gICAgICBjb25zdCBsID0gYWJici5sZW5ndGg7XG4gICAgICBjb25zdCBtaWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGNvbnN0IHcgb2Ygd3MpIHtcbiAgICAgICAgY29uc3Qgd29yZCA9IHdvcmRzW3ddO1xuICAgICAgICBmb3IgKGNvbnN0IG1pZCBvZiBbd29yZC5taWQsIC4uLihhbGlhcy5nZXQod29yZC5taWQpIHx8IFtdKV0pIHtcbiAgICAgICAgICBtaWRzLmFkZChtaWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhYmJyLnB1c2goe1xuICAgICAgICBieXRlczogbCA8IDB4ODAgPyBbbCArIDB4ODBdIDogWzUsIGwgLSAweDgwXSxcbiAgICAgICAgbWlkcyxcbiAgICAgICAgLy8gbWVzc2FnZXM6IG5ldyBTZXQoWy4uLndzXS5tYXAodyA9PiB3b3Jkc1t3XS5taWQpKSxcbiAgICAgICAgc3RyLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEJsYXN0IHJhZGl1czogYWxsIG90aGVyIHN1ZmZpeGVzIHJlbGF0ZWQgdG8gYWxsIHRvdWNoZWQgd29yZHMgc2F2ZSBsZXNzXG4gICAgICBmb3IgKGNvbnN0IGkgb2Ygd3MpIHtcbiAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPD0gY2hhaW5zOyBrKyspIHtcbiAgICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbaSArIGtdO1xuICAgICAgICAgIGNvbnN0IHVzZWQgPSB3b3JkLmJ5dGVzIC0gKCFrID8gbWlzc2luZyA6IDApO1xuICAgICAgICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIHdvcmQuc3VmZml4ZXMpIHtcbiAgICAgICAgICAgIHN1ZmZpeC5zYXZpbmcgLT0gKHVzZWQgLSB3b3JkLnVzZWQpO1xuICAgICAgICAgICAgaW52YWxpZC5hZGQoc3VmZml4LnN0cik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdvcmQudXNlZCA9IHVzZWQ7IC8vIHR5cGljYWxseSBpbmNyZWFzZXMuLi5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIHRha2VzIHVzIG92ZXIgMHg4MCB0aGVuIGFsbCBzdWZmaXhlcyBnZXQgdXMgb25lIGxlc3MgYnl0ZSBvZiBzYXZpbmdzIHBlciB1c2VcbiAgICAgIGlmIChhYmJyLmxlbmd0aCA9PT0gMHg4MCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRhdGEgb2Ygc3VmZml4ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgICBkYXRhLnNhdmluZyAtPSBkYXRhLndvcmRzLnNpemU7XG4gICAgICAgIH1cbiAgICAgICAgc29ydGVkLnNvcnQob3JkZXIpO1xuICAgICAgICBpbnZhbGlkLmNsZWFyKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhYmJyO1xuICB9XG5cbiAgLyoqIFJlYnVpbGQgdGhlIHdvcmQgdGFibGVzIGFuZCBtZXNzYWdlIGVuY29kaW5ncy4gKi9cbiAgY29tcHJlc3MoKSB7XG4gICAgY29uc3QgdXNlcyA9IHRoaXMudXNlcygpO1xuICAgIGNvbnN0IHRhYmxlID0gdGhpcy5idWlsZEFiYnJldmlhdGlvblRhYmxlKHVzZXMpO1xuICAgIC8vIGdyb3VwIGFiYnJldmlhdGlvbnMgYnkgbWVzc2FnZSBhbmQgc29ydCBieSBsZW5ndGguXG4gICAgY29uc3QgYWJicnMgPSBuZXcgTWFwPHN0cmluZywgQWJicmV2aWF0aW9uW10+KCk7IC8vIGJ5IG1pZFxuICAgIHRoaXMuY29tbW9uV29yZHMuc3BsaWNlKDAsIHRoaXMuY29tbW9uV29yZHMubGVuZ3RoKTtcbiAgICB0aGlzLnVuY29tbW9uV29yZHMuc3BsaWNlKDAsIHRoaXMudW5jb21tb25Xb3Jkcy5sZW5ndGgpO1xuICAgIGZvciAoY29uc3QgYWJiciBvZiB0YWJsZSkge1xuICAgICAgaWYgKGFiYnIuYnl0ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHRoaXMuY29tbW9uV29yZHNbYWJici5ieXRlc1swXSAmIDB4N2ZdID0gYWJici5zdHI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmV4dHJhV29yZHNbYWJici5ieXRlc1swXV1bYWJici5ieXRlc1sxXV0gPSBhYmJyLnN0cjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbWlkIG9mIGFiYnIubWlkcykge1xuICAgICAgICBsZXQgYWJickxpc3QgPSBhYmJycy5nZXQobWlkKTtcbiAgICAgICAgaWYgKCFhYmJyTGlzdCkgYWJicnMuc2V0KG1pZCwgKGFiYnJMaXN0ID0gW10pKTtcbiAgICAgICAgYWJickxpc3QucHVzaChhYmJyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBhYmJyTGlzdCBvZiBhYmJycy52YWx1ZXMoKSkge1xuICAgICAgYWJickxpc3Quc29ydCgoe3N0cjoge2xlbmd0aDogeH19OiBBYmJyZXZpYXRpb24sIHtzdHI6IHtsZW5ndGg6IHl9fTogQWJicmV2aWF0aW9uKSA9PiB5IC0geCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBtIG9mIHRoaXMubWVzc2FnZXModXNlcykpIHtcbiAgICAgIGxldCB0ZXh0ID0gbS50ZXh0O1xuICAgICAgLy8gRmlyc3QgcmVwbGFjZSBhbnkgaXRlbXMgb3Igb3RoZXIgbmFtZXMgd2l0aCB0aGVpciBieXRlcy5cbiAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhbXFxbe10pKFteXFxdfV0qKVtcXF19XSgufCQpL2csIChmdWxsLCBicmFja2V0LCBpbnNpZGUsIGFmdGVyKSA9PiB7XG4gICAgICAgIGlmIChhZnRlciAmJiAhUFVOQ1RVQVRJT05bYWZ0ZXJdKSByZXR1cm4gZnVsbDtcbiAgICAgICAgaWYgKGFmdGVyID09PSAnICcpIGFmdGVyID0gJyc7XG4gICAgICAgIGlmIChicmFja2V0ID09PSAnWycgJiYgaW5zaWRlID09PSAnOklURU06Jykge1xuICAgICAgICAgIHJldHVybiBgWzhdJHthZnRlcn1gO1xuICAgICAgICB9IGVsc2UgaWYgKGJyYWNrZXQgPT09ICd7JyAmJiBpbnNpZGUgPT09ICc6SEVSTzonKSB7XG4gICAgICAgICAgcmV0dXJuIGBbNF0ke2FmdGVyfWA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZmluZCB0aGUgbnVtYmVyIGJlZm9yZSB0aGUgY29sb24uXG4gICAgICAgIGNvbnN0IG1hdGNoID0gL14oWzAtOWEtZl0rKTovLmV4ZWMoaW5zaWRlKTtcbiAgICAgICAgaWYgKCFtYXRjaCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgbWVzc2FnZSB0ZXh0OiAke2Z1bGx9YCk7XG4gICAgICAgIGNvbnN0IGlkID0gTnVtYmVyLnBhcnNlSW50KG1hdGNoWzFdLCAxNik7XG4gICAgICAgIHJldHVybiBgWyR7YnJhY2tldCA9PT0gJ3snID8gNiA6IDd9XVske2lkfV0ke2FmdGVyfWA7XG4gICAgICB9KTtcbiAgICAgIC8vIE5vdyBzdGFydCB3aXRoIHRoZSBsb25nZXN0IGFiYnJldmlhdGlvbiBhbmQgd29yayBvdXIgd2F5IGRvd24uXG4gICAgICBmb3IgKGNvbnN0IHtzdHIsIGJ5dGVzfSBvZiBhYmJycy5nZXQobS5taWQpIHx8IFtdKSB7XG4gICAgICAgIC8vIE5PVEU6IHR3byBzcGFjZXMgaW4gYSByb3cgYWZ0ZXIgYW4gZXhwYW5zaW9uIG11c3QgYmUgcHJlc2VydmVkIGFzLWlzLlxuICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKG5ldyBSZWdFeHAoc3RyICsgJyggWyAmMC05XXwufCQpJywgJ2cnKSwgKGZ1bGwsIGFmdGVyKSA9PiB7XG4gICAgICAgICAgaWYgKGFmdGVyICYmICFQVU5DVFVBVElPTlthZnRlcl0pIHJldHVybiBmdWxsO1xuICAgICAgICAgIGlmIChhZnRlciA9PT0gJyAnKSBhZnRlciA9ICcnO1xuICAgICAgICAgIHJldHVybiBieXRlcy5tYXAoYiA9PiBgWyR7Yn1dYCkuam9pbignJykgKyBhZnRlcjtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGJ1aWxkIHRoZSBlbmNvZGVkIHZlcnNpb25cbiAgICAgIGNvbnN0IGhleFBhcnRzID0gWydbMDFdJ107XG4gICAgICBjb25zdCBicyA9IFtdO1xuICAgICAgYnMucHVzaCgxKTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0ZXh0Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0ZXh0W2ldO1xuICAgICAgICBpZiAoYyA9PT0gTWVzc2FnZXMuQ09OVElOVUVEKSB7XG4gICAgICAgICAgYnMucHVzaCgzLCAxKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKCdbMDNdWzAxXScpO1xuICAgICAgICAgIGlmICh0ZXh0W2kgKyAxXSA9PT0gJ1xcbicpIGkrKztcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXFxuJykge1xuICAgICAgICAgIGJzLnB1c2goMik7XG4gICAgICAgICAgaWYgKHRleHRbaSArIDFdID09PSAnICcpIGkrKztcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKCdbMDJdJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJ1snKSB7XG4gICAgICAgICAgY29uc3QgaiA9IHRleHQuaW5kZXhPZignXScsIGkpO1xuICAgICAgICAgIGlmIChqIDw9IDApIHRocm93IG5ldyBFcnJvcihgYmFkIHRleHQ6ICR7dGV4dH1gKTtcbiAgICAgICAgICBjb25zdCBiID0gTnVtYmVyKHRleHQuc3Vic3RyaW5nKGkgKyAxLCBqKSk7XG4gICAgICAgICAgaWYgKGlzTmFOKGIpKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXh0OiAke3RleHR9YCk7XG4gICAgICAgICAgYnMucHVzaChiKTtcbiAgICAgICAgICBoZXhQYXJ0cy5wdXNoKGBbJHtoZXgoYil9XWApO1xuICAgICAgICAgIGkgPSBqO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICcgJyAmJiB0ZXh0W2kgKyAxXSA9PT0gJyAnKSB7XG4gICAgICAgICAgbGV0IGogPSBpICsgMjtcbiAgICAgICAgICB3aGlsZSAodGV4dFtqXSA9PT0gJyAnKSBqKys7XG4gICAgICAgICAgYnMucHVzaCg5LCBqIC0gaSk7XG4gICAgICAgICAgaGV4UGFydHMucHVzaChgWzA5XVske2hleChqIC0gaSl9XWApO1xuICAgICAgICAgIGkgPSBqIC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBicy5wdXNoKGMuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgICAgaGV4UGFydHMucHVzaChjKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnMucHVzaCgwKTtcbiAgICAgIGhleFBhcnRzLnB1c2goJ1swXScpO1xuICAgICAgbS5ieXRlcyA9IGJzO1xuICAgICAgbS5oZXggPSBoZXhQYXJ0cy5qb2luKCcnKTtcblxuICAgICAgLy8gRmlndXJlIG91dCB3aGljaCBwYWdlIGl0IG5lZWRzIHRvIGJlIG9uXG4gICAgICAvLyBjb25zdCBiYW5rID0gdGhpcy5iYW5rc1ttLnBhcnRdIDw8IDEzO1xuICAgICAgLy8gY29uc3Qgb2Zmc2V0ID0gYmFuayAtIDB4YTAwMDtcbiAgICB9XG4gIH1cblxuICB3cml0ZSgpOiBNb2R1bGVbXSB7XG4gICAgY29uc3QgYSA9IHRoaXMucm9tLmFzc2VtYmxlcigpO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4ODAwMCwgMHg4NTAwKTtcbiAgICBmcmVlKGEsICQxNCwgICAweDg1MjAsIDB4ODUyOCk7XG4gICAgZnJlZShhLCAkMTQsICAgMHg4NTg2LCAweDg1OTMpO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4ODkwMCwgMHg5NDAwKTtcbiAgICBmcmVlKGEsICQxNCwgICAweDk2ODUsIDB4OTcwNik7XG4gICAgLy9mcmVlKGEsICcxNCcsICAgMHg5YjRlLCAweDljMDApO1xuICAgIGZyZWUoYSwgJDE0LCAgIDB4OWU4MCwgMHhhMDAwKTtcbiAgICBmcmVlKGEsICQxNSwgICAweGEwMDAsIDB4YzAwMCk7XG4gICAgZnJlZShhLCAkMTZfYSwgMHhhMDAwLCAweGMwMDApO1xuICAgIGZyZWUoYSwgJDE3LCAgIDB4YTAwMCwgMHhiYzAwKTtcblxuICAgIC8vIHBsYW46IGFuYWx5emUgYWxsIHRoZSBtc2VzYWdlcywgZmluZGluZyBjb21tb24gc3VmZml4ZXMuXG4gICAgLy8gZWxpZ2libGUgc3VmZml4ZXMgbXVzdCBiZSBmb2xsb3dlZCBieSBlaXRoZXIgc3BhY2UsIHB1bmN0dWF0aW9uLCBvciBlb2xcbiAgICAvLyB0b2RvIC0gcmVmb3JtYXQvZmxvdyBtZXNzYWdlcyBiYXNlZCBvbiBjdXJyZW50IHN1YnN0aXR1dGlvbiBsZW5ndGhzXG5cbiAgICAvLyBidWlsZCB1cCBhIHN1ZmZpeCB0cmllIGJhc2VkIG9uIHRoZSBhYmJyZXZpYXRpb25zLlxuICAgIC8vIGNvbnN0IHRyaWUgPSBuZXcgU3VmZml4VHJpZTxudW1iZXJbXT4oKTtcbiAgICAvLyBmb3IgKGxldCBpID0gMCwgbGVuID0gdGFibGUubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAvLyAgIHRyaWUuc2V0KHRhYmxlW2ldLnN0ciwgaSA8IDB4ODAgPyBbaSArIDB4ODBdIDogWzUsIGkgLSAweDgwXSk7XG4gICAgLy8gfVxuXG4gICAgLy8gaWYgKENST1dEX0NPTlRST0wpIHtcbiAgICBhLmFzc2lnbignTGV2ZWxEb3duTWVzc2FnZVBhcnQnLCAweDAxKTtcbiAgICBhLmFzc2lnbignTGV2ZWxEb3duTWVzc2FnZUlkJywgMHgwMik7XG4gICAgYS5leHBvcnQoJ0xldmVsRG93bk1lc3NhZ2VQYXJ0JywgJ0xldmVsRG93bk1lc3NhZ2VJZCcpO1xuICAgIC8vIH1cblxuICAgIC8vIHdyaXRlIHRoZSBhYmJyZXZpYXRpb24gdGFibGVzIChhbGwsIHJld3JpdGluZyBoYXJkY29kZWQgY29kZXJlZnMpXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29kZXJlZihwdHI6IEFkZHJlc3MsIGJhc2U6IEV4cHIsIC4uLm9mZnNldHM6IG51bWJlcltdKSB7XG4gICAgICBwdHIubG9jKGEpO1xuICAgICAgYS53b3JkKGJhc2UpO1xuICAgICAgLy8gc2Vjb25kIHJlZiAodXN1YWxseSA1IGJ5dGVzIGxhdGVyKVxuICAgICAgbGV0IGkgPSAwO1xuICAgICAgZm9yIChjb25zdCBvZmZzZXQgb2Ygb2Zmc2V0cykge1xuICAgICAgICBwdHIucGx1cyhvZmZzZXQpLmxvYyhhKTtcbiAgICAgICAgYS53b3JkKHtvcDogJysnLCBhcmdzOiBbYmFzZSwge29wOiAnbnVtJywgbnVtOiArK2l9XX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpcnN0IHN0ZXA6IHdyaXRlIHRoZSBtZXNzYWdlcy5cbiAgICBjb25zdCBhZGRyZXNzZXM6IEV4cHJbXVtdID0gc2VxKHRoaXMucGFydENvdW50LCAoKSA9PiBbXSlcbiAgICBmb3IgKGxldCBwYXJ0SWQgPSAwOyBwYXJ0SWQgPCB0aGlzLnBhcnRDb3VudDsgcGFydElkKyspIHtcbiAgICAgIGNvbnN0IHBhcnRBZGRycyA9IGFkZHJlc3Nlc1twYXJ0SWRdO1xuICAgICAgY29uc3QgcGFydCA9IHRoaXMucGFydHNbcGFydElkXTtcbiAgICAgIGNvbnN0IGJhbmsgPSB0aGlzLmJhbmtzW3BhcnRJZF07XG4gICAgICBjb25zdCBzZWdtZW50ID0gU0VHTUVOVFNbYmFua107XG4gICAgICBhLnNlZ21lbnQoc2VnbWVudC5uYW1lKTtcbiAgICAgIGZvciAoY29uc3QgbSBvZiBwYXJ0KSB7XG4gICAgICAgIGEucmVsb2MoYE1lc3NhZ2VfJHttLm1pZH1gKTtcbiAgICAgICAgcGFydEFkZHJzLnB1c2goYS5wYygpKTtcbiAgICAgICAgYS5ieXRlKC4uLm0uYnl0ZXMsIDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5vdyB3cml0ZSBhIHNpbmdsZSBjaHVuayB3aXRoIGFsbCB0aGUgcGFydHMuXG4gICAgY29uc3QgcGFydFRhYmxlczogRXhwcltdID0gW107XG4gICAgYS5zZWdtZW50KCQxNC5uYW1lKTtcbiAgICBhLnJlbG9jKGBNZXNzYWdlc1RhYmxlYCk7XG4gICAgZm9yIChsZXQgcGFydElkID0gMDsgcGFydElkIDwgdGhpcy5wYXJ0Q291bnQ7IHBhcnRJZCsrKSB7XG4gICAgICBwYXJ0VGFibGVzLnB1c2goYS5wYygpKTtcbiAgICAgIGEud29yZCguLi5hZGRyZXNzZXNbcGFydElkXSk7XG4gICAgfVxuICAgIGNvbnN0IGJhbmtUYWJsZSA9IGEucGMoKTtcbiAgICBhLmJ5dGUoLi4udGhpcy5iYW5rcyk7XG5cbiAgICBhLnJlbG9jKGBNZXNzYWdlUGFydHNgKTtcbiAgICBjb25zdCBwYXJ0c1RhYmxlID0gYS5wYygpO1xuICAgIGEud29yZCguLi5wYXJ0VGFibGVzKTtcblxuICAgIC8vIEZpbmFsbHkgdXBkYXRlIHRoZSBiYW5rIGFuZCBwYXJ0cyBwb2ludGVycy5cbiAgICB1cGRhdGVDb2RlcmVmKEJBTktTX1BUUiwgYmFua1RhYmxlKTtcbiAgICB1cGRhdGVDb2RlcmVmKEJBTktTX1BUUjIsIGJhbmtUYWJsZSk7XG4gICAgdXBkYXRlQ29kZXJlZihQQVJUU19QVFIsIHBhcnRzVGFibGUsIDUpO1xuXG4gICAgLy8gTm93IHdyaXRlIHRoZSB3b3JkcyB0YWJsZXMuXG4gICAgY29uc3Qgd29yZFRhYmxlcyA9IFtcbiAgICAgIFtgQ29tbW9uV29yZHNgLCB0aGlzLmNvbW1vbldvcmRzLCBbQ09NTU9OX1dPUkRTX0JBU0VfUFRSXV0sXG4gICAgICBbYFVuY29tbW9uV29yZHNgLCB0aGlzLnVuY29tbW9uV29yZHMsIFtVTkNPTU1PTl9XT1JEU19CQVNFX1BUUl1dLFxuICAgICAgW2BQZXJzb25OYW1lc2AsIHRoaXMucGVyc29uTmFtZXMsIFtQRVJTT05fTkFNRVNfQkFTRV9QVFJdXSxcbiAgICAgIFtgSXRlbU5hbWVzYCwgdGhpcy5pdGVtTmFtZXMsIFtJVEVNX05BTUVTX0JBU0VfUFRSLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIElURU1fTkFNRVNfQkFTRV9QVFIyXV0sXG4gICAgXSBhcyBjb25zdDtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB3b3JkcywgcHRyc10gb2Ygd29yZFRhYmxlcykge1xuICAgICAgY29uc3QgYWRkcnM6IChudW1iZXJ8RXhwcilbXSA9IFtdO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgZm9yIChjb25zdCB3b3JkIG9mIHdvcmRzKSB7XG4gICAgICAgIGlmICghd29yZCkge1xuICAgICAgICAgIGFkZHJzLnB1c2goMCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgYS5yZWxvYyhgJHtuYW1lfV8ke2hleChpKyspfWApO1xuICAgICAgICBhZGRycy5wdXNoKGEucGMoKSk7XG4gICAgICAgIGEuYnl0ZSh3b3JkLCAwKTtcbiAgICAgIH1cbiAgICAgIGEucmVsb2MobmFtZSk7XG4gICAgICBjb25zdCBiYXNlID0gYS5wYygpO1xuICAgICAgYS53b3JkKC4uLmFkZHJzKTtcbiAgICAgIGZvciAoY29uc3QgcHRyIG9mIHB0cnMpIHtcbiAgICAgICAgdXBkYXRlQ29kZXJlZihwdHIsIGJhc2UsIDUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2EubW9kdWxlKCldO1xuICB9XG59XG5cbmludGVyZmFjZSBBYmJyZXZpYXRpb24ge1xuICAvLyBCeXRlcyB0byBhYmJyZXZpYXRlIHRvLlxuICBieXRlczogbnVtYmVyW107XG4gIC8vIE1JRHMgb2YgdGhlIG1lc3NhZ2VzIHRvIGFiYnJldmlhdGUuXG4gIG1pZHM6IFNldDxzdHJpbmc+O1xuICAvLyBFeHBhbmRlZCB0ZXh0LlxuICBzdHI6IHN0cmluZztcbn1cblxuLy8gTWF4IGxlbmd0aCBmb3Igd29yZHMgdGFibGUuICBWYW5pbGxhIGFsbG9jYXRlcyA5MzIgYnl0ZXMsIGJ1dCB0aGVyZSdzXG4vLyBhbiBleHRyYSA0NDggYXZhaWxhYmxlIGltbWVkaWF0ZWx5IGJlbmVhdGguICBGb3Igbm93IHdlJ2xsIHBpY2sgYSByb3VuZFxuLy8gbnVtYmVyOiAxMjAwLlxuY29uc3QgTUFYX1RBQkxFX0xFTkdUSCA9IDEyNTA7XG5cbi8vIGNvbnN0IFBVTkNUVUFUSU9OX1JFR0VYID0gL1tcXDAgIVxcXFwsLjo7P18tXS9nO1xuLy8gY29uc3QgT1BFTkVSUzoge1tjbG9zZTogc3RyaW5nXTogc3RyaW5nfSA9IHsnfSc6ICd7JywgJ10nOiAnWyd9O1xuY29uc3QgQ0xPU0VSUzoge1tvcGVuOiBzdHJpbmddOiBzdHJpbmd9ID0geyd7JzogJ30nLCAnWyc6ICddJ307XG5cbi8vIE1lc3NhZ2UgTUlEcyB0aGF0IGFyZSBoYXJkY29kZWQgaW4gdmFyaW91cyBwbGFjZXMuXG5leHBvcnQgY29uc3QgSEFSRENPREVEX01FU1NBR0VTOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoW1xuICAvLyAnMDA6MDAnLCAvLyBpbXBvc3NpYmxlIHRvIGlkZW50aWZ5IHVzZXNcbiAgJzIwOjFkJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDEsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmU4XG4gICcxYjowZicsIC8vIGVuZGdhbWUgbWVzc2FnZSAyLCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZlYVxuICAnMWI6MTAnLCAvLyBlbmRnYW1lIG1lc3NhZ2UgMywgZXhlYyAyN2ZjOSwgdGFibGUgMjdmZWNcbiAgJzFiOjExJywgLy8gZW5kZ2FtZSBtZXNzYWdlIDQsIGV4ZWMgMjdmYzksIHRhYmxlIDI3ZmVlXG4gICcxYjoxMicsIC8vIGVuZGdhbWUgbWVzc2FnZSA1LCBleGVjIDI3ZmM5LCB0YWJsZSAyN2ZmMFxuICAnMWI6MDUnLCAvLyBhenRlY2EgZGlhbG9nIGFmdGVyIGRyYXlnb24yLCBleGVjIDM3YjI4XG4gICcxYjowNicsIC8vIGF6dGVjYSBkaWFsb2cgYWZ0ZXIgZHJheWdvbjIsIGV4ZWMgMzdiMjhcbiAgJzFiOjA3JywgLy8gYXp0ZWNhIGRpYWxvZyBhZnRlciBkcmF5Z29uMiwgZXhlYyAzN2IyOFxuICAnMWY6MDAnLCAvLyB6enogcGFyYWx5c2lzIGRpYWxvZywgZXhlYyAzZDBmM1xuICAnMTM6MDAnLCAvLyBrZW5zdSBzd2FuIGFza3MgZm9yIGxvdmUgcGVuZGFudCwgZXhlYyAzZDFjYVxuICAnMGI6MDEnLCAvLyBhc2luYSByZXZlYWwsIGV4ZWMgM2QxZWJcbiAgJzIwOjBjJywgLy8gaXRlbWdldCBtZXNzYWdlICd5b3Ugbm93IGhhdmUnLCBleGVjIDNkNDNjXG4gICcyMDowZicsIC8vIHRvbyBtYW55IGl0ZW1zLCBleGVjIDNkNDhhXG4gICcxYzoxMScsIC8vIHN3b3JkIG9mIHRodW5kZXIgcHJlLXdhcnAgbWVzc2FnZSwgZXhlYyAxYzoxMVxuICAnMGU6MDUnLCAvLyBtZXNpYSByZWNvcmRpbmcsIGV4ZWMgM2Q2MjFcbiAgJzE2OjAwJywgLy8gYXp0ZWNhIGluIHNoeXJvbiBzdG9yeSwgZXhlYyAzZDc5Y1xuICAnMTY6MDInLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljIChsb29wKVxuICAnMTY6MDQnLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljIChsb29wKVxuICAnMTY6MDYnLCAvLyBhenRlY2EgaW4gc2h5cm9uIHN0b3J5LCBleGVjIDNkNzljIChsb29wKVxuICAnMjA6MTEnLCAvLyBlbXB0eSBzaG9wLCBleGVjIDNkOWM0XG4gICcyMTowMCcsIC8vIHdhcnAgbWVudSwgZXhlYyAzZGI2MFxuICAnMjE6MDInLCAvLyB0ZWxlcGF0aHkgbWVudSwgZXhlYyAzZGQ2ZVxuICAnMjE6MDEnLCAvLyBjaGFuZ2UgbWVudSwgZXhlYyAzZGVjYlxuICAnMDY6MDAnLCAvLyAoc3QpIGtlbGJlc3F1ZSAxIG1vbm9sb2d1ZSwgZXhlYyAxZTk5ZlxuICAnMTg6MDAnLCAvLyAoc3QpIGtlbGJlc3F1ZSAyIG1vbm9sb2d1ZSwgZXhlYyAxZTk5ZlxuICAnMTg6MDInLCAvLyAoc3QpIHNhYmVyYSAyIG1vbm9sb2d1ZSwgZXhlYyAxZWNlNlxuICAnMTg6MDQnLCAvLyAoc3QpIG1hZG8gMiBtb25vbG9ndWUsIGV4ZWMgMWVlMjZcbiAgJzE4OjA4JywgLy8gKHN0KSBrYXJtaW5lIG1vbm9sb2d1ZSwgZXhlYyAxZWY4YVxuICAnMWI6MDMnLCAvLyAoc3QpIHN0YXR1ZXMgbW9ub2xvZ3VlLCBleGVjIDFmMGU1XG4gICcxYjowMCcsIC8vIChzdCkgZHJheWdvbiAxIG1vbm9sb2d1ZSwgZXhlYyAxZjE5M1xuICAnMWI6MDAnLCAvLyAoc3QpIGRyYXlnb24gMSBtb25vbG9ndWUsIGV4ZWMgMWYxOTNcbiAgJzFiOjA0JywgLy8gKHN0KSBkcmF5Z29uIDIgbW9ub2xvZ3VlLCBleGVjIDFmMTkzXG4gICcwNjowMScsIC8vIChzdCkga2VsYmVzcXVlIDEgZXNjYXBlcywgZXhlYyAxZmFlNywgdGFibGUgMWZiMWJiXG4gICcxMDoxMycsIC8vIChzdCkgc2FiZXJhIDEgZXNjYXBlcywgZXhlYyAxZmFlNywgdGFibGUgMWZiMWZcbiAgJzE5OjA1JywgLy8gKHN0KSBtYWRvIDEgZXNjYXBlcywgZXhlYyAxZmFlNywgdGFibGUgMWZiMjVcbiAgJzIwOjE0JywgLy8gKHN0KSBrZWxiZXNxdWUgMSBsZWZ0IGNoZXN0LCBleGVjIDFmN2EzLCB0YWJsZSAxZjdjYlxuICAnMjA6MTUnLCAvLyAoc3QpIHNhYmVyYSAxIGxlZnQgY2hlc3QsIGV4ZWMgMWY3YTMsIHRhYmxlIDFmN2Q1XG4gICcyMDoxNycsIC8vIChzdCkgbWFkbyAxIGxlZnQgY2hlc3QsIGV4ZWMgMWY3YTMsIHRhYmxlIDFmN2RhXG4gICcyMDowMicsIC8vIChzdCkgY3VyZSBzdGF0dXMgYWlsbWVudCwgZXhlYyAyN2I5MFxuICAnMjA6MGQnLCAvLyAoc3QpIGxldmVsIHVwLCBleGVjIDM1MWUyXG4gICcyMDoxOScsIC8vIChzdCkgcG9pc29uZWQsIGV4ZWMgMzUyYWFcbiAgJzIwOjFhJywgLy8gKHN0KSBwYXJhbHl6ZWQsIGV4ZWMgMzUyZGZcbiAgJzIwOjFiJywgLy8gKHN0KSBzdG9uZWQsIGV4ZWMgMzUzMTdcbiAgJzAzOjAxJywgLy8gKHN0KSBsZWFybiB0ZWxlcGF0aHksIGV4ZWMgMzUyY2NcbiAgJzAzOjAyJywgLy8gKHN0KSBmYWlsIHRvIGxlYXJuIHRlbGVwYXRoeSwgZXhlYyAzNTJlOFxuICAnMTA6MTAnLCAvLyAoc3QpIGZha2UgbWVzaWEgbWVzc2FnZSAxLCBleGVjIDM2NWIxXG4gICcxMDoxMScsIC8vIChzdCkgZmFrZSBtZXNpYSBtZXNzYWdlIDIsIGV4ZWMgMzY1YjFcbiAgJzEwOjEyJywgLy8gKHN0KSBmYWtlIG1lc2lhIG1lc3NhZ2UgMywgZXhlYyAzNjViMVxuICAnMGM6MDQnLCAvLyAoc3QpIGRpc21vdW50IGRvbHBoaW4gKG5vdCBpbnNpZGUgRVNJIGNhdmUpLCBleGVjIDM2NjA5XG4gICcwYzowNScsIC8vIChzdCkgZGlzbW91bnQgZG9scGhpbiAoZXZlcnl3aGVyZSBpbiBuZWFyIEVTSSksIGV4ZWMgMzY2MDlcbiAgJzAzOjAzJywgLy8gKHN0KSBzdGFydCBzdG9tIGZpZ2h0LCBleGVjIDM2NzE2XG4gICcyMDowZScsIC8vIChzdCkgaW5zdWZmaWNpZW50IG1hZ2ljIGZvciBzcGVsbCwgZXhlYyAzY2MyM1xuICAnMjA6MTMnLCAvLyAoc3QpIG5vdGhpbmcgaGFwcGVucyBpdGVtIHVzZSBvZXJyLCBleGVjIDNkNTJhXG4gICcwMTowMicsIC8vIGxldmVsIGRvd24gbWVzc2FnZS4gb3ZlcndyaXRlcyB1bnVzZWQgdGV4dCBmcm9tIHplYnUncyBzbGVlcGluZyBhcHByZW50aWNlXG5dKTtcbiJdfQ==