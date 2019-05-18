import {Rom} from './entity.js';
import {MessageId} from './messageid.js';
import {Data, hex, readLittleEndian, readString, seq, slice} from './util.js';
import {Writer} from './writer.js';
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
    this.rom = rom;
    this.base = base;
    this.count = count;
    this.offset = offset;
    this.addresses = seq(this.count,
                         (i: number) => readLittleEndian(rom.prg, base + 2 * i) + offset);
    for (let i = 0; i < count; i++) {
      this[i] = func(this.addresses[i], i, this.addresses);
    }
  }
}

const DELIMITERS = new Map<number, string>([[6, '{}'], [7, '[]']]);

class Message {

  // bytes: number[];
  text: string;

  constructor(readonly messages: Messages,
              readonly part: number,
              readonly id: number,
              readonly addr: number) {

    // Parse the message
    const prg: Data<number> = messages.rom.prg;
    const parts = [];
    for (let i = addr; prg[i]; i++) {
      const b = prg[i];
      // this.bytes.push(b);
      if (b === 1) {
        // NOTE - there is one case where two messages seem to abut without a
        // null terminator - $2ca91 ($12:$08) falls through from 12:07.  We fix
        // that with an adjustment in rom.ts.
        if (i !== addr && prg[i - 1] !== 3) {
          throw new Error(`Unexpected start message signal at ${i.toString(16)}`);
        }
      } else if (b === 2) {
        parts.push('\n');
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
  '#': true,  // page separator
  '\n': true, // line separator
};

export class Messages {

  basicWords: AddressTable<string>;
  extraWords: {[group: number]: AddressTable<string>};
  banks: DataTable<number>;
  parts: AddressTable<AddressTable<Message>>;

  //static readonly CONTINUED = '\u25bc';
  static readonly CONTINUED = '#';

  constructor(readonly rom: Rom) {
    const str = (a: number) => readString(rom.prg, a);
    this.basicWords = new AddressTable(rom, 0x28900, 0x80, 0x20000, str);
    this.extraWords = {
      5: new AddressTable(rom, 0x28a00, 10, 0x20000, str), // less common
      6: new AddressTable(rom, 0x28a14, 36, 0x20000, str), // people/places
      7: new AddressTable(rom, 0x28a5c, 74, 0x20000, str), // items (also 8?)
    };

    this.banks = new DataTable(rom, 0x283fe, 0x24, 1);
    this.parts = new AddressTable(
        rom, 0x28422, 0x22, 0x20000,
        (addr, part, addrs) => {
          // need to compute the end based on the array?
          const count = part === 0x21 ? 3 : (addrs[part + 1] - addr) >>> 1;
          // offset: bank=15 => 20000, bank=16 => 22000, bank=17 => 24000
          return new AddressTable(
              rom, addr, count, (this.banks[part] << 13) - 0xa000,
              (m, id) => new Message(this, part, id, m));
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

  buildAbbreviationTable(uses = this.uses()): string[] {
    // const uses = this.uses();
    // Count frequencies of used suffixes.
    interface Suffix {
      // Actual string
      str: string;
      // Total number of bytes saved over all occurrences
      saving: number;
      // Map from word ID to bytes we can save on it?
      bytes: Map<number, number>;
      // All the initial words this is in (not counting chains)
      words: Set<number>;
      // Number of chains
      chains: number;
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
    }

    // Ordered list of words
    const words: Word[] = [];
    // Keep track of addresses we've seen
    const addrs = new Set<number>();

    for (const message of this.messages(uses)) {
      // Don't read the same message twice.
      if (addrs.has(message.addr)) continue;
      addrs.add(message.addr);
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
          words.push({str, id, chain, bytes, used: 0, suffixes: new Set()});
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
          if (!data) suffixes.set(str, (data = {str, saving: -str.length, bytes: new Map(), chains: len, words: new Set()}));
          data.words.add(i);
          data.saving += saving;
          // Add all the uses
          for (let k = len; k >= 0; k--) {
            // the bytes we could save on the (i+k)th word; k=0 is a special case
            data.bytes.set(i + k, k ? words[i + k].bytes : word.bytes - j);
            words[i + k].suffixes.add(data);
          }
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
    const rev: string[] = [];
    const order = ({saving: a}: Suffix, {saving: b}: Suffix) => b - a;
    const sorted = [...suffixes.values()].sort(order);
    let tableLength = 0;
    while (sorted.length && tableLength < MAX_TABLE_LENGTH) {
      // Check if the sort order has been invalidated and resort
      if (invalid.has(sorted[0].str)) {
        sorted.sort(order);
        invalid.clear();
      }
      const {str, saving, bytes, words: ws, chains} = sorted.shift()!;
      // figure out if it's worth adding...
      if (saving <= 0) break;
      // make the abbreviation
      tableLength += str.length + 3;
      // abbr[word] = rev.length;
      rev.push(`${str}: ${saving} - ${bytes.size}`);

      // Blast radius: all other suffixes related to all touched words save less
      // for (const [wordIndex, byteCount] of bytes) {
      //   const word = words[wordIndex];
      //   for (const suffix of word.suffixes) {
      //     const prev = suffix.bytes.get(wordIndex) || 0;
      //     const next = Math.max(word.bytes - byteCount, 0);
      //     suffix.saving -= (prev - next);
      //     suffix.bytes.set(wordIndex, next);
      //     invalid.add(suffix.str);
      //   }
      // }

      for (const i of ws) {
        for (let k = 0; k <= chains; k++) {
          const word = words[i + k];
          const used = k ? word.bytes : bytes.get(i)!;
          for (const suffix of word.suffixes) {
            suffix.saving -= (used - word.used);
            invalid.add(suffix.str);
          }
          word.used = used; // typically increases...
        }
      }

      // If this takes us over 0x80 then all suffixes get us one less byte of savings per use
      if (rev.length === 0x80) {
        for (const data of suffixes.values()) {
          const wordSize = data.str.split(/[ ']/g).length;
          data.saving -= Math.floor(data.bytes.size / wordSize);
        }
        sorted.sort(order);
        invalid.clear();
      }
    }
    return rev;
  }

  // buildAbbreviationTable(uses = this.uses()): string[] {
  //   // const uses = this.uses();
  //   // Count frequencies of used suffixes.
  //   interface Suffix {
  //     suffix: string;
  //     saving: number;
  //     count: number;
  //     // longer: Set<string>;
  //   }
  //   const suffixes = new SuffixTrie<Suffix>();
  //   const addrs = new Set<number>();
  //   for (const message of this.messages(uses)) {
  //     if (addrs.has(message.addr)) continue;
  //     addrs.add(message.addr);
  //     // split up the message text into words, from the back,
  //     // ignoring names.
  //     const text = message.text;
  //     // function add(start: number, end: number): void {
  //     //   const substr = text.substring(start, end);
  //     //   const saved = end - start + (text[end] === ' ' ? 1 : 0) - 1;
  //     //   savings[substr] = (savings[substr] || 0) + saved;
  //     //   counts[substr] = (counts[substr] || 0) + 1;
  //     // }
  //     // let last = text.length;
  //     // let nextLast = last;
  //     // for (let i = last - 1; i >= 0; i--) {
  //     //   if (PUNCTUATION[text[i]]) {
  //     //     nextLast = last;
  //     //     last = i;
  //     //     if (text[i] !== ' ') nextLast = last;
  //     //   } else if (text[i] === '}' || text[i] === ']') {
  //     //     // find the opening, don't worry about expanding yet.
  //     //     const open = text.lastIndexOf(OPENERS[text[i]], i);
  //     //     if (open >= 0) i = open;
  //     //   } else if (last - i > 1) {
  //     //     add(i, last);
  //     //     if (nextLast > last) add(i, nextLast);
  //     //   }
  //     // }
  //     let words: SuffixTrie<Suffix>[] = [];
  //     for (let i = text.length - 1; i >= 0; i--) {
  //       const c = text[i];
  //       if (!PUNCTUATION[c] && !words.length) words = [suffixes];

  //       // reset on breaking punctuation
  //       if (PUNCTUATION[c] && c !== ' ' && c !== '\'') {
  //         words = [];
  //         continue;
  //       } else if (OPENERS[c]) {
  //         // find the opening, don't worry about expanding yet.
  //         const open = text.lastIndexOf(OPENERS[c], i);
  //         if (open >= 0) i = open;
  //         words = [];
  //         continue;
  //       }

  //       // prepend the char to each current word
  //       for (let j = 0, len = words.length; j < len; j++) {
  //         const t = words[j].with(c);
  //         words[j] = t;
  //         if (PUNCTUATION[c]) continue;
  //         const s = t.data || (t.data = {suffix: t.key, count: 0, saving: 0});
  //         s.count++;
  //         s.saving += t.key.length - (text[i + t.key.length] === ' ' ? 0 : 1);
  //         // for (let k = 0; k < j; k++) {
  //         //   t.data.longer.add(words[k].data!.suffix.substring(t.data.suffix.length));
  //         // }
  //       }

  //       // make a new word on space and apostrophe
  //       if (PUNCTUATION[c] && !PUNCTUATION[text[i - 1]]) words.push(suffixes);
  //       while (words.length > 2) words.shift();
  //     }
  //   }

  //   // Sort the list to find the most impactful.
  //   // substrings whose savings has changed.
  //   const updates = new Set<string>();
  //   // const abbr: {[substr: string]: number} = {};
  //   const rev: string[] = [];
  //   const order = ({saving: a}: Suffix, {saving: b}: Suffix) => b - a;
  //   const sorted = [...suffixes.values()].sort(order);
  //   let tableLength = 0;
  //   while (sorted.length && tableLength < MAX_TABLE_LENGTH) {
  //     if (updates.has(sorted[0].suffix)) {
  //       sorted.sort(order);
  //       updates.clear();
  //     }

  //     const {saving, count, suffix} = sorted.shift()!;
  //     // figure out if it's worth adding...
  //     if (saving <= 0) break;
  //     // make the abbreviation
  //     tableLength += suffix.length + 3;
  //     // abbr[word] = rev.length;
  //     rev.push(`${suffix}: ${saving} - ${count}`);

  //     // shorter words' savings need to be reduced
  //     let t = suffixes;
  //     for (let i = suffix.length - 1; i > 0; i--) {
  //       t = t.with(suffix[i]);
  //       // Every suffix accounted for in `saving` is one we don't get to count
  //       // here anymore.  The saving is t.key.length + 0 or + 1, but by simply
  //       // subtracting the extra length from `saving` we automatically account
  //       // for that difference.
  //       const data = t.data;
  //       if (!data) continue;
  //       data.saving -= saving - count * (suffix.length - t.key.length);
  //       data.count -= count;
  //       updates.add(t.key);
  //     }
  //     t = t.with(suffix[0]); // but don't subtract anymore.
  //     // longer words' savings need to be reduced!
  //     for (const data of t.values()) {
  //       // we can encode all the words, but only save as much as the difference.
  //       data.saving = data.count * (data.suffix.length - suffix.length);
  //       // TODO - reduce count to zero? we should when subtracting off
  //       // from words shorter than suffix, but not for longer.
  //       updates.add(data.suffix);
  //     }

  //     // TODO - how to find them!  need a reverse map...

  //     // maybe a trie?  decrease score of all shorter and longer
  //     // words?
  //     //   say we had 'efgh': 20 => save 60
  //     //   but    'abcdefgh': 5  => save 35
  //     //   when we pull 'efgh' then we can leave 'abcdefgh'
  //     //   but its value is now simply 20 (=count * remaining)
  //     //   
  //     //   

  //     // if this takes us over 0x80 then we get one less byte of savings each
  //     if (rev.length === 0x80) {
  //       for (const data of suffixes.values()) {
  //         data.saving -= data.count;
  //       }
  //       sorted.sort(order);
  //       updates.clear();
  //     }
  //   }
  //   return rev;
  // }

  async write(writer: Writer): Promise<void> {
    const uses = this.uses();
    const table = this.buildAbbreviationTable(uses);
    const {} = {writer, uses, table} as any;
    // plan: analyze all the msesages, finding common suffixes.
    // eligible suffixes must be followed by either space, punctuation, or eol
    // todo - reformat/flow messages based on current substitution lengths
  }
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
