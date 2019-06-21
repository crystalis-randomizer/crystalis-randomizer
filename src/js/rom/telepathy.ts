import {MessageId} from './messageid.js';
import {Data, readBigEndian, readLittleEndian, seq, tuple, write, writeLittleEndian} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

export enum Sage {
  TORNEL = 0,
  ZEBU   = 1,
  ASINA  = 2,
  KENSU  = 3,
}

export enum DefaultMessage {
  // probably unused
  INSUFFICIENT_MAGIC = 0,
  // message for restoring MP
  FREE_MAGIC         = 1,
  // sages ignoring the player
  IGNORED            = 2,
  // no information (or underleveled)
  DEFAULT            = 3,
}

const RESULT_TABLE = 0x1c22f;

// These tables may be moved in the randomized version.  The locations
// and levels tables are not relevant, so they're removed, along with
// the result-map table, which we simply apply in-place to the result
// table (which is not moved).  Everything else is crunched down to
// just the defaults table, by reducing the main table into a single
// messae group and cramming it into the unused 0 slot.
const VANILLA_LEVELS_TABLE = 0x1c213;
const VANILLA_LOCATION_TABLE = 0x1d8f4;
const VANILLA_MAIN_TABLE = 0x1d9f4;
const VANILLA_DEFAULTS_TABLE = 0x1da2c;

export class Telepathy {

  // Indexed by Sage
  sages: SageData[];
  groupsByLocation: number[];
  minimumLevels: number[];
  resultTable: number[];

  constructor(readonly rom: Rom) {
    this.sages = seq(4, i => new SageData(this, i));
    this.resultTable = tuple(rom.prg, RESULT_TABLE, 64);
    if (rom.telepathyTablesAddress) {
      this.groupsByLocation = [];
      this.minimumLevels = [];
    } else {
      this.groupsByLocation = tuple(rom.prg, VANILLA_LOCATION_TABLE, 256);
      this.minimumLevels = tuple(rom.prg, VANILLA_LEVELS_TABLE, 7);
    }
  }

  write(writer: Writer): Promise<void> {
    let table = this.rom.telepathyTablesAddress;
    const promises = [];
    if (table) {
      // telepathy normalized, write to new location
      // also, crunch down the results.
      write(writer.rom, RESULT_TABLE, this.resultTable.map(x => x < 4 ? x : x >>> 1));
      for (let i = 0; i < 4; i++) {
        const sage = this.sages[i];
        for (let j = 1; j < 4; j++) {
          const a = table + 8 * j + 2 * i;
          write(writer.rom, a, this.sages[i].defaultMessages[j].data);
        }
        promises.push(
            writer.write(sage.messageGroups[0].bytes(), 0x1c000, 0x1e000, `Sage ${i}`)
                .then(a => writeLittleEndian(writer.rom, table + 2 * i, a - 0x14000)));
      }
    } else {
      write(writer.rom, RESULT_TABLE, this.resultTable);
      write(writer.rom, VANILLA_LEVELS_TABLE, this.minimumLevels);
      write(writer.rom, VANILLA_LOCATION_TABLE, this.groupsByLocation);
      for (let i = 0; i < 4; i++) {
        const sage = this.sages[i];
        table = VANILLA_DEFAULTS_TABLE + 2 * i;
        for (let j = 0; j < 4; j++) {
          write(writer.rom, table + 8 * j,
                sage.defaultMessages[j].data);
        }
        table = VANILLA_MAIN_TABLE + 2 * i;
        for (let j = 0, len = sage.messageGroups.length; j < len; j++) {
          promises.push(
              writer.write(sage.messageGroups[j].bytes(), 0x1c000, 0x1e000, `Sage ${i}`)
                  .then(a => writeLittleEndian(writer.rom,
                                               table + 8 * j, a - 0x14000)));
        }
      }
    }
    return Promise.all(promises).then(() => {});
  }
}

export class SageData {

  // Indexed by DefaultMessage
  defaultMessages: MessageId[];
  messageGroups: TelepathyMessageGroup[];

  constructor(readonly telepathy: Telepathy, readonly sage: Sage) {
    const rom = telepathy.rom;
    let defs: number;
    let main: number;
    let count: number;
    if (rom.telepathyTablesAddress) {
      main = defs = rom.telepathyTablesAddress + 2 * sage;
      count = 1;
    } else {
      defs = VANILLA_DEFAULTS_TABLE + 2 * sage;
      main = VANILLA_MAIN_TABLE + 2 * sage;
      count = 7;
    }
    this.defaultMessages = seq(4, i => MessageId.from(rom.prg, defs + 8 * i));
    this.messageGroups = seq(count, i => TelepathyMessageGroup.from(rom.prg, main + 8 * i));
  }
}

export class TelepathyMessageGroup {

  constructor(public messages: [number, MessageId, MessageId?][]) {}

  bytes(): number[] {
    const bytes: number[] = [];
    for (let i = 0, len = this.messages.length; i < len; i++) {
      const [f, m1, m2] = this.messages[i];
      let word = f >= 0 ? f : 0x2000 | ~f;
      if (i === len - 1) word |= 0x8000;
      if (m2) word |= 0x4000;
      bytes.push(word >>= 8, word & 0xff, ...m1.data, ...(m2 ? m2.data : []));
    }
    return bytes;
  }

  static from(data: Data<number>, address: number): TelepathyMessageGroup {
    // address points to data table pointer.
    // from there we read alternating flags and message IDs.
    const group = new TelepathyMessageGroup([]);
    address = readLittleEndian(data, address) + 0x14000;
    let word = 0;
    while (!(word & 0x8000)) {
      word = readBigEndian(data, address);
      address += 2;
      let flag = word & 0x1fff;
      if (word & 0x2000) flag = ~flag;
      const message: [number, MessageId, MessageId?] =
          [flag, MessageId.from(data, address)];
      address += 2;
      if (word & 0x4000) {
        message.push(MessageId.from(data, address));
        address += 2;
      }
      group.messages.push(message);
    }
    return group;
  }
}
