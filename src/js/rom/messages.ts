import {MessageId} from './messageid.js';
import {Data, hex, readLittleEndian, readString,
        seq, slice, writeLittleEndian, writeString} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';
// import {SuffixTrie} from '../util.js';

class DataTable<T> extends Array<T> {

  constructor(readonly rom: Rom,
              readonly base: number,
              readonly count: number,
              readonly width: number,
              // TODO - what was this supposed to be?!?
              func: (...x: number[]) => T =
                  width > 1 ? (...i) => i as any : i => i as any) {
    super(count);
    for (let i = 0; i < count; i++) {
      this[i] = func(...slice(rom.prg, base + i * width, width));
    }
  }
}

class AddressTable<T> extends Array<T> {

  readonly addresses: number[];

  constructor(readonly rom: Rom,
              readonly base: number,
              readonly count: number,
              readonly offset: number,
              func: (x: number, i: number, arr: number[]) => T = i => i as any) {
    super(count);
    this.addresses = seq(this.count,
                         (i: number) => {
                           const a = readLittleEndian(rom.prg, base + 2 * i);
                           return a && a + offset;
                         });
                         
    for (let i = 0; i < count; i++) {
      this[i] = func(this.addresses[i], i, this.addresses);
    }
  }
}

const DELIMITERS = new Map<number, string>([[6, '{}'], [7, '[]']]);

class Message {

  // This is redundant - the text should be used instead.
  bytes: number[] = [];
  hex: string = ''; // for debugging
  text: string;

  constructor(readonly messages: Messages,
              readonly part: number,
              readonly id: number,
              readonly addr: number,
              readonly pointer: number) {

    // Parse the message
    const prg: Data<number> = messages.rom.prg;
    const parts = [];
    for (let i = addr; addr && prg[i]; i++) {
      const b = prg[i];
      this.bytes.push(b);
      if (b === 1) {
        // NOTE - there is one case where two messages seem to abut without a
        // null terminator - $2ca91 ($12:$08) falls through from 12:07.  We fix
        // that with an adjustment in rom.ts.
        if (i !== addr && prg[i - 1] !== 3) {
          throw new Error(`Unexpected start message signal at ${i.toString(16)}`);
        }
      } else if (b === 2) {
        parts.push('\n ');
      } else if (b === 3) {
        parts.push(`${Messages.CONTINUED}\n`); // black down-pointing triangle
      } else if (b === 4) {
        parts.push('{:HERO:}');
      } else if (b === 8) {
        parts.push('[:ITEM:]');
      } else if (b >= 5 && b <= 9) {
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
        if (delims) parts.push(delims[1]);
        if (!PUNCTUATION[String.fromCharCode(prg[i + 1])]) {
          parts.push(' ');
        }
      } else if (b >= 0x80) {
        parts.push(messages.basicWords[b - 0x80]);
        if (!PUNCTUATION[String.fromCharCode(prg[i + 1])]) {
          parts.push(' ');
        }
      } else if (b >= 0x20) {
        parts.push(String.fromCharCode(b));
      } else {
        throw new Error(`Non-exhaustive switch: ${b} at ${i.toString(16)}`);
      }
    }
    this.text = parts.join('');
  }

  mid(): string {
    return `${hex(this.part)}:${hex(this.id)}`;
  }

  // Fixes the text to ensure it fits in the dialog box.
  // Constraints:
  //  - no line is longer than 28 characters
  //  - first line after a \n is indented one space
  //  - uncapitalized (unpunctuated?) first characters are indented, too
  //  - wrap or unwrap any person or item names
  //  - at most four lines per message box
  // If any violations are found, the entire message is reflowed.
  fixText(): void {
    if (this.checkText()) return;
    const parts: string[] = [];
    let lineNum = 0;
    let lineLen = 0;
    let space = false;
    let word: string[] = [];
    function insert(str: string, len: number = str.length, fallback?: string) {
      if (lineLen + len > 29) {
        if (fallback) {
          const split = fallback.split(/\s+/);
          for (let i = 0; i < split.length; i++) {
            if (i) insertSpace();
            insert(split[i]);
          }
          return;
        }
        newline();
      }
      if (str === ' ') {
        parts.push(...word, ' ');
        word = [];
      } else {
        word.push(str);
      }
      lineLen += len;
      space = str.endsWith(' ');
    }
    function insertSpace() {
      if (!space) insert(' ');
      space = true;
    }
    function newline() {
      lineLen = 1;
      if (++lineNum > 3) {
        parts.push('#\n ');
        lineNum = 0;
      } else {
        parts.push('\n ');
      }
      space = true;
    }
    for (let i = 0; i < this.text.length; i++) {
      const c = this.text[i];
      const next = this.text[i + 1];
      if (/\s/.test(c)) {
        insertSpace();
      } else if (c === '{') {
        if (next === ':') {
          insert('{:HERO:}', 6);
        } else {
          const colon = this.text.indexOf(':', i);
          const id = Number.parseInt(this.text.substring(i + 1, colon), 16);
          const name = this.messages.extraWords[6][id];
          insert(`{${id.toString(16)}:${name}}`, name.length, name);
        }
        i = this.text.indexOf('}', i);
      } else if (c === '[') {
        if (next === ':') {
          const items = this.messages.rom.items;
          insert('[:ITEM:]', Math.max(...items.map(i => i.messageName.length)));
        } else {
          const colon = this.text.indexOf(':', i);
          const id = Number.parseInt(this.text.substring(i + 1, colon), 16);
          const name = this.messages.rom.items[id].messageName;
          insert(`[${id.toString(16)}:${name}]`, name.length, name);
        }
        i = this.text.indexOf(']', i);
      } else {
        insert(c);
      }
    }
    parts.push(...word);
    this.text = parts.join('');
  }

  checkText(): boolean {
    let lineNum = 0;
    let lineLen = 0;
    for (let i = 0; i < this.text.length; i++) {
      const c = this.text[i];
      const next = this.text[i + 1];
      if (c === '\n') {
        lineNum++;
        lineLen = 1;
        if (lineNum > 3) return false;
      } else if (c === '#') {
        if (next === '\n') i++; // eat newline
        lineNum = lineLen = 0;
      } else if (c === '{' || c === '[') {
        if (next === ':') {
          if (c === '{') { // {:HERO:}
            lineLen += 6;
          } else { // [:ITEM:]
            // compute the max item length
            const items = this.messages.rom.items;
            lineLen += Math.max(...items.map(i => i.messageName.length));
          }
          if (lineLen > 28) return false;
        } else {
          const colon = this.text.indexOf(':', i);
          const id = Number.parseInt(this.text.substring(i + 1, colon), 16);
          lineLen += (c === '{' ?
                          this.messages.extraWords[6][id] :
                          this.messages.rom.items[id].messageName).length;
        }
        i = this.text.indexOf(CLOSERS[c], i);
      } else {
        lineLen++;
      }
      if (lineLen > 29 && c !== ' ') return false;
    }
    return true;
  }
}

const PUNCTUATION: {[char: string]: boolean} = {
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

  // ????
  '\n': true, // line separator
  '#': true,  // page separator
};

export class Messages {

  basicWords: AddressTable<string>;
  extraWords: {[group: number]: AddressTable<string>};
  banks: DataTable<number>;
  parts: AddressTable<AddressTable<Message>>;

  // NOTE: these data structures are redundant with the above.
  // Once we get things working smoothly, we should clean it up
  // to only use one or the other.
  // abbreviations: string[];
  // personNames: string[];

  // static readonly CONTINUED = '\u25bc';
  static readonly CONTINUED = '#';

  constructor(readonly rom: Rom) {
    const commonWordsBase = readLittleEndian(rom.prg, 0x28704) + 0x20000;
    const extraWordsBase = readLittleEndian(rom.prg, 0x2868a) + 0x20000;
    const personNamesBase = readLittleEndian(rom.prg, 0x286d5) + 0x20000;
    const itemNamesBase = readLittleEndian(rom.prg, 0x286e9) + 0x20000;

    const str = (a: number) => readString(rom.prg, a);
    // TODO - read these addresses directly from the code, in case they move
    this.basicWords = new AddressTable(rom, commonWordsBase, 0x80, 0x20000, str);
    this.extraWords = {
      5: new AddressTable(rom, extraWordsBase,
                          (personNamesBase - extraWordsBase) >>> 1, 0x20000,
                          str), // less common
      6: new AddressTable(rom, personNamesBase, 36, 0x20000, str), // people/places
      7: new AddressTable(rom, itemNamesBase, 74, 0x20000, str), // items (also 8?)
    };

    this.banks = new DataTable(rom, 0x283fe, 0x24, 1);
    this.parts = new AddressTable(
        rom, 0x28422, 0x22, 0x20000,
        (addr, part, addrs) => {
          // need to compute the end based on the array?
          const count = part === 0x21 ? 3 : (addrs[part + 1] - addr) >>> 1;
          // offset: bank=$15 => $20000, bank=$16 => $22000, bank=$17 => $24000
          // subtract $a000 because that's the page we're loading at.
          return new AddressTable(
              rom, addr, count, (this.banks[part] << 13) - 0xa000,
              (m, id) => new Message(this, part, id, m, addr + 2 * id));
        });
  }

  // Flattens the messages.  NOTE: returns unused messages.
  * messages(used?: {has: (mid: string) => boolean}): Iterable<Message> {
    for (const part of this.parts) {
      if (used) {
        for (const message of part) {
          if (used.has(message.mid())) yield message;
        }
      } else {
        yield * part;
      }
    }
  }

  // Returns a map from message id (mid) to known usages.
  uses(): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>();
    function use(message: MessageId | string, usage: string) {
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
        if (m.nonzero()) use(m, `Item $${hex(item.id)}`);
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
            use(m!, `Telepathy ${sage.sage}`);
          }
        }
      }
    }
    for (const m of HARDCODED_MESSAGES) {
      use(m, 'Hardcoded');
    }
    return out;
  }

  buildAbbreviationTable(uses = this.uses()): Abbreviation[] {
    // Count frequencies of used suffixes.
    interface Suffix {
      // Actual string
      str: string;
      // Total number of bytes saved over all occurrences
      saving: number;
      // All the initial words this is in (not counting chains)
      words: Set<number>;
      // Number of chains
      chains: number;
      // Number of letters missing from the first word
      missing: number;
    }
    interface Word {
      // Actual string
      str: string;
      // Index in list
      id: number;
      // The chainable punctuation after this word (space or apostrophe)
      chain: string;
      // Possible bytes to be saved
      bytes: number;
      // Number of characters currently being compressed
      used: number;
      // All suffixes that touch this word
      suffixes: Set<Suffix>;
      // Message ID
      mid: string;
    }

    // Ordered list of words
    const words: Word[] = [];
    // Keep track of addresses we've seen, mapping to message IDs for aliasing.
    const addrs = new Map<number, string>();
    // Aliases mapping multiple message IDs to already-seen ones.
    const alias = new Map<string, string[]>();

    for (const message of this.messages(uses)) {
      // TODO - can't land reflow until we have lipsum text.
      // message.fixText();
      const mid = message.mid();
      // Don't read the same message twice.
      const seen = addrs.get(message.addr);
      const aliases = seen != null && alias.get(seen);
      if (aliases) {
        aliases.push(mid);
        continue;
      }
      addrs.set(message.addr, mid);
      alias.set(mid, []);
      // Split up the message text into words.
      const text = message.text;
      let letters = [];

      for (let i = 0, len = text.length; i <= len; i++) {
        const c = text[i];
        const closer = CLOSERS[c];
        if (PUNCTUATION[c] || closer || i === len) {
          // if the next character is non-punctuation then it chains
          const next = text[i + 1];
          if (closer) i = Math.max(i, text.indexOf(closer, i));
          if (!letters.length) continue;
          const chain = (c === ' ' || c === '\'') && next && !PUNCTUATION[next] ? c : '';
          const str = letters.join('');
          const id = words.length;
          const bytes = str.length + (c === ' ' ? 1 : 0);
          letters = [];
          words.push({str, id, chain, bytes, used: 0, suffixes: new Set(), mid});
        } else {
          letters.push(c);
        }
      }
    }

    // Initialize map of string to suffix
    const suffixes = new Map<string, Suffix>();
    for (let i = words.length - 1; i >= 0; i--) {
      // For each word
      const word = words[i];
      for (let j = word.bytes - 2; j >= 0; j--) {
        // For each suffix
        const suffix = word.str.substring(j);
        // Current full string, adding all the chains so far
        let str = suffix;
        // Number of extra chains added
        let len = 0;
        let later = word;
        let saving = word.bytes - j - 1;
        while (true) {
          // For itself and each chainable word thereafter
          let data = suffixes.get(str);
          if (!data) suffixes.set(str, (data = {chains: len, missing: j,
                                                saving: -str.length, str,
                                                words: new Set()}));
          data.words.add(i);
          data.saving += saving;
          // Link the suffixes
          for (let k = len; k >= 0; k--) words[i + k].suffixes.add(data);
          if (!later.chain) break;
          // If there's another word to chain to, then continue
          str += later.chain;
          later = words[i + (++len)];
          str += later.str;
          saving += later.bytes;
        }
      }
    }

    // Sort the suffixes to find the most impactful
    const invalid = new Set<string>();
    const abbr: Abbreviation[] = [];
    const order = ({saving: a}: Suffix, {saving: b}: Suffix) => b - a;
    const sorted = [...suffixes.values()].sort(order);
    let tableLength = 0;
    while (sorted.length && tableLength < MAX_TABLE_LENGTH) {
      // Check if the sort order has been invalidated and resort
      if (invalid.has(sorted[0].str)) {
        sorted.sort(order);
        invalid.clear();
      }
      const {str, saving, missing, words: ws, chains} = sorted.shift()!;
      // figure out if it's worth adding...
      if (saving <= 0) break;
      // make the abbreviation
      tableLength += str.length + 3;
      const l = abbr.length;
      const mids = new Set<string>();
      for (const w of ws) {
        const word = words[w];
        for (const mid of [word.mid, ...(alias.get(word.mid) || [])]) {
          mids.add(mid);
        }
      }
      abbr.push({
        bytes: l < 0x80 ? [l + 0x80] : [5, l - 0x80],
        mids,
        // messages: new Set([...ws].map(w => words[w].mid)),
        str,
      });

      // Blast radius: all other suffixes related to all touched words save less
      for (const i of ws) {
        for (let k = 0; k <= chains; k++) {
          const word = words[i + k];
          const used = word.bytes - (!k ? missing : 0);
          for (const suffix of word.suffixes) {
            suffix.saving -= (used - word.used);
            invalid.add(suffix.str);
          }
          word.used = used; // typically increases...
        }
      }

      // If this takes us over 0x80 then all suffixes get us one less byte of savings per use
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

  async write(writer: Writer): Promise<void> {
    const uses = this.uses();
    const table = this.buildAbbreviationTable(uses);
    // plan: analyze all the msesages, finding common suffixes.
    // eligible suffixes must be followed by either space, punctuation, or eol
    // todo - reformat/flow messages based on current substitution lengths

    // build up a suffix trie based on the abbreviations.
    // const trie = new SuffixTrie<number[]>();
    // for (let i = 0, len = table.length; i < len; i++) {
    //   trie.set(table[i].str, i < 0x80 ? [i + 0x80] : [5, i - 0x80]);
    // }

    // write the abbreviation tables (all, rewriting hardcoded coderefs)
    function updateCoderef(loc: number, addr: number) {
      writeLittleEndian(writer.rom, loc, addr - 0x20000);
      // second ref is always 5 bytes later
      writeLittleEndian(writer.rom, loc + 5, addr + 1 - 0x20000);
    }

    // start at 288a5, go to 29400
    let a = 0x288a5;
    let d = a + 2 * (table.length + this.rom.items.length + this.extraWords[6].count);
    updateCoderef(0x28704, a);
    for (let i = 0, len = table.length; i < len; i++) {
      if (i === 0x80) updateCoderef(0x2868a, a);
      writeLittleEndian(writer.rom, a, d);
      a += 2;
      writeString(writer.rom, d, table[i].str);
      d += table[i].str.length;
      writer.rom[d++] = 0;
    }
    if (table.length < 0x80) updateCoderef(0x2868a, a);
    // move on to people
    updateCoderef(0x286d5, a);
    const names = this.extraWords[6];
    for (const name of names) {
      writeLittleEndian(writer.rom, a, d);
      a += 2;
      writeString(writer.rom, d, name);
      d += name.length;
      writer.rom[d++] = 0;
    }
    // finally update item names
    updateCoderef(0x286e9, a);
    updateCoderef(0x28789, a);
    for (const item of this.rom.items) {
      writeLittleEndian(writer.rom, a, d);
      a += 2;
      writeString(writer.rom, d, item.messageName);
      d += item.messageName.length;
      writer.rom[d++] = 0;
    }

    // group abbreviations by message and sort by length.
    const abbrs = new Map<string, Abbreviation[]>(); // by mid
    for (const abbr of table) {
      for (const mid of abbr.mids) {
        let abbrList = abbrs.get(mid);
        if (!abbrList) abbrs.set(mid, (abbrList = []));
        abbrList.push(abbr);
      }
    }
    for (const abbrList of abbrs.values()) {
      abbrList.sort(({str: {length: x}}: Abbreviation, {str: {length: y}}: Abbreviation) => y - x);
    }

    // iterate over the messages and serialize.
    const promises: Promise<number>[][] = seq(this.parts.length, () => []);
    for (const m of this.messages(uses)) {
      let text = m.text;
      // First replace any items or other names with their bytes.
      text = text.replace(/([\[{])([^\]}]*)[\]}](.|$)/g, (full, bracket, inside, after) => {
        if (after && !PUNCTUATION[after]) return full;
        if (after === ' ') after = '';
        if (bracket === '[' && inside === ':ITEM:') {
          return `[8]${after}`;
        } else if (bracket === '{' && inside === ':HERO:') {
          return `[4]${after}`;
        }
        // find the number before the colon.
        const match = /^([0-9a-f]+):/.exec(inside);
        if (!match) throw new Error(`Bad message text: ${full}`);
        const id = Number.parseInt(match[1], 16);
        return `[${bracket === '{' ? 6 : 7}][${id}]${after}`;
      });
      // Now start with the longest abbreviation and work our way down.
      for (const {str, bytes} of abbrs.get(m.mid()) || []) {
        // NOTE: two spaces in a row after an expansion must be preserved as-is.
        text = text.replace(new RegExp(str + '(  |.|$)', 'g'), (full, after) => {
          if (after && !PUNCTUATION[after]) return full;
          if (after === ' ') after = '';
          return bytes.map(b => `[${b}]`).join('') + after;
        });
      }

      // build the encoded version
      const hexParts = ['[01]'];
      const bs = [];
      bs.push(1);
      for (let i = 0, len = text.length; i < len; i++) {
        const c = text[i];
        if (c === Messages.CONTINUED) {
          bs.push(3, 1);
          hexParts.push('[03][01]');
          if (text[i + 1] === '\n') i++;
        } else if (c === '\n') {
          bs.push(2);
          if (text[i + 1] === ' ') i++;
          hexParts.push('[02]');
        } else if (c === '[') {
          const j = text.indexOf(']', i);
          if (j <= 0) throw new Error(`bad text: ${text}`);
          const b = Number(text.substring(i + 1, j));
          if (isNaN(b)) throw new Error(`bad text: ${text}`);
          bs.push(b);
          hexParts.push(`[${hex(b)}]`);
          i = j;
        } else if (c === ' ' && text[i + 1] === ' ') {
          let j = i + 2;
          while (text[j] === ' ') j++;
          bs.push(9, j - i);
          hexParts.push(`[09][${hex(j - i)}]`);
          i = j - 1;
        } else {
          bs.push(c.charCodeAt(0));
          hexParts.push(c);
        }
      }
      bs.push(0);
      hexParts.push('[0]');
      m.bytes = bs;
      m.hex = hexParts.join('');

      // Figure out which page it needs to be on
      const bank = this.banks[m.part] << 13;
      const offset = bank - 0xa000;
      
      promises[m.part][m.id] =
          writer.write(bs, bank, bank + 0x2000, `Message ${m.mid()}`)
              .then(a => a - offset);
    }

    const addresses = await Promise.all(promises.map(ps => Promise.all(ps))) as number[][];
    const parts: Promise<void>[] = [];
    let pos = 0x28000;
    for (let part = 0; part < addresses.length; part++) {
      const bytes: number[] = [];
      for (let i = 0; i < addresses[part].length; i++) {
        writeLittleEndian(bytes, 2 * i, addresses[part][i]);
      }
      // TODO - would be nice to let the writer pick where to put the parts, but
      // then we don't know how many to read from each.  So do it sequentially.
      // parts.push(writer.write(bytes, 0x28000, 0x2a000, `MessagePart ${hex(part)}`)
      //            .then(a => writeLittleEndian(writer.rom, 0x28422 + 2 * part,
      //                                         a - 0x20000)));
      writer.rom.subarray(pos, pos + bytes.length).set(bytes)
      writeLittleEndian(writer.rom, 0x28422 + 2 * part, pos - 0x20000);
      pos += bytes.length;
    }

    // Write the banks
    for (let i = 0; i < this.banks.length; i++) {
      writer.rom[0x283fe + i] = this.banks[i];
    }

    await Promise.all(parts);
  }
}

interface Abbreviation {
  // Bytes to abbreviate to.
  bytes: number[];
  // MIDs of the messages to abbreviate.
  mids: Set<string>;
  // Expanded text.
  str: string;
}

// Max length for words table.  Vanilla allocates 932 bytes, but there's
// an extra 448 available immediately beneath.  For now we'll pick a round
// number: 1200.
const MAX_TABLE_LENGTH = 1250;

// const PUNCTUATION_REGEX = /[\0 !\\,.:;?_-]/g;
// const OPENERS: {[close: string]: string} = {'}': '{', ']': '['};
const CLOSERS: {[open: string]: string} = {'{': '}', '[': ']'};

// Message MIDs that are hardcoded in various places.
export const HARDCODED_MESSAGES: Set<string> = new Set([
  // '00:00', // impossible to identify uses
  '20:1d', // endgame message 1, exec 27fc9, table 27fe8
  '1b:0f', // endgame message 2, exec 27fc9, table 27fea
  '1b:10', // endgame message 3, exec 27fc9, table 27fec
  '1b:11', // endgame message 4, exec 27fc9, table 27fee
  '1b:12', // endgame message 5, exec 27fc9, table 27ff0
  '1b:05', // azteca dialog after draygon2, exec 37b28
  '1f:00', // zzz paralysis dialog, exec 3d0f3
  '13:00', // kensu swan asks for love pendant, exec 3d1ca
  '0b:01', // asina reveal, exec 3d1eb
  '20:0c', // itemget message 'you now have', exec 3d43c
  '20:0f', // too many items, exec 3d48a
  '1c:11', // sword of thunder pre-warp message, exec 1c:11
  '0e:05', // mesia recording, exec 3d621
  '16:00', // azteca in shyron story, exec 3d79c
  '16:02', // azteca in shyron story, exec 3d79c (loop)
  '16:04', // azteca in shyron story, exec 3d79c (loop)
  '16:06', // azteca in shyron story, exec 3d79c (loop)
  '20:11', // empty shop, exec 3d9c4
  '21:00', // warp menu, exec 3db60
  '21:02', // telepathy menu, exec 3dd6e
  '21:01', // change menu, exec 3decb
  '06:00', // (st) kelbesque 1 monologue, exec 1e99f
  '18:00', // (st) kelbesque 2 monologue, exec 1e99f
  '18:02', // (st) sabera 2 monologue, exec 1ece6
  '18:04', // (st) mado 2 monologue, exec 1ee26
  '18:08', // (st) karmine monologue, exec 1ef8a
  '1b:03', // (st) statues monologue, exec 1f0e5
  '1b:00', // (st) draygon 1 monologue, exec 1f193
  '1b:00', // (st) draygon 1 monologue, exec 1f193
  '06:01', // (st) kelbesque 1 escapes, exec 1fae7, table 1fb1bb
  '10:13', // (st) sabera 1 escapes, exec 1fae7, table 1fb1f
  '19:05', // (st) mado 1 escapes, exec 1fae7, table 1fb25
  '20:14', // (st) kelbesque 1 left chest, exec 1f7a3, table 1f7cb
  '20:15', // (st) sabera 1 left chest, exec 1f7a3, table 1f7d5
  '20:17', // (st) mado 1 left chest, exec 1f7a3, table 1f7da
  '20:02', // (st) cure status ailment, exec 27b90
  '20:0d', // (st) level up, exec 351e2
  '20:19', // (st) poisoned, exec 352aa
  '20:1a', // (st) paralyzed, exec 352df
  '20:1b', // (st) stoned, exec 35317
  '03:01', // (st) learn telepathy, exec 352cc
  '03:02', // (st) fail to learn telepathy, exec 352e8
  '10:10', // (st) fake mesia message 1, exec 365b1
  '10:11', // (st) fake mesia message 2, exec 365b1
  '10:12', // (st) fake mesia message 3, exec 365b1
  '0c:04', // (st) dismount dolphin (not inside ESI cave), exec 36609
  '0c:05', // (st) dismount dolphin (everywhere in near ESI), exec 36609
  '03:03', // (st) start stom fight, exec 36716
  '20:0e', // (st) insufficient magic for spell, exec 3cc23
  '20:13', // (st) nothing happens item use oerr, exec 3d52a
]);
