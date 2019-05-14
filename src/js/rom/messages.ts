import {Rom} from './entity.js';
import {Data, readLittleEndian, readString, seq, slice} from './util.js';

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

  //bytes: number[];
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
}

const PUNCTUATION: {[char: string]: boolean} = {
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

  basicWords: AddressTable<string>;
  extraWords: {[group: number]: AddressTable<string>};
  banks: DataTable<number>;
  parts: AddressTable<AddressTable<Message>>;

  static readonly CONTINUED = '\u25bc';

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
}

// Message MIDs that are hardcoded in various places.
export const HARDCODED_MESSAGES: Set<string> = new Set([
  '00:00', // impossible to identify uses
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
