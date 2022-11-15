import {Expr} from '../asm/expr';
import {Module} from '../asm/module';
import {Rom} from '../rom';
import {MessageId} from './messageid';
import {Data, Segment, free,
        readBigEndian, readLittleEndian, seq, tuple} from './util.js';

const {$0e, $fe, $ff} = Segment;

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

  write(): Module[] {
    let table = this.rom.telepathyTablesAddress;
    const a = this.rom.assembler();
    a.segment($0e.name, $fe.name, $ff.name);
    if (table) { // TODO - this is always falsy?!?
      free(a, $0e, 0x98f4, 0x9b00);
      // telepathy normalized, write to new location
      // also, crunch down the results.

      const mainTable = this.sages.map((sage, i) => {
        a.reloc(`Telepathy_Sage_${i}`);
        const pc = a.pc();
        a.byte(...sage.messageGroups[0].bytes());
        return pc;
      });

      a.org(0x822f, 'Telepathy_ResultTable');
      a.byte(...this.resultTable.map(x => x < 4 ? x : x >>> 1));

      a.reloc('TelepathyTable');
      a.export('TelepathyTable');
      a.label('TelepathyTable');
      a.word(...mainTable);
      for (let j = 1; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          a.byte(...this.sages[i].defaultMessages[j].data);
        }
      }
    } else {
      free(a, $0e, 0x9a4c, 0x9b00);
      a.org(0x822f, 'Telepathy_ResultTable');
      a.byte(...this.resultTable);
      a.org(0x8213, 'Telepathy_LevelsTable');
      a.byte(...this.minimumLevels);
      a.org(0x98f4, 'Telepathy_LocationTable');
      a.byte(...this.groupsByLocation);

      a.org(0x9a2c, 'Telepathy_VanillaDefaultsTable');
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          const sage = this.sages[i];
          a.byte(...sage.defaultMessages[j].data);
        }
      }
      const mainTable: Expr[] = [];
      for (let i = 0; i < 4; i++) {
        const sage = this.sages[i];
        for (let j = 0, len = sage.messageGroups.length; j < len; j++) {
          a.reloc(`Telepathy_Sage_${i}_Group_${j}`);
          mainTable[4 * j + i] = a.pc();
          a.byte(...sage.messageGroups[j].bytes());
        }
      }
      a.org(0x99f4, 'Telepathy_VanillaMainTable');
      a.word(...mainTable);
    }
    return [a.module()];
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
