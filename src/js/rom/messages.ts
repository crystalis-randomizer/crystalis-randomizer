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
