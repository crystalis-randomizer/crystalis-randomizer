import {Module} from '../asm/module';
import {Rom} from '../rom';
import {Entity} from './entity';
import {MessageId} from './messageid';
import {addr, hex, readBigEndian} from './util';

const UNUSED_TRIGGERS = new Set([
  0x83, 0x87, 0x88, 0x89, 0x8f, 0x93, 0x96, 0x98, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
  /*0xa0,*/ 0xaa, 0xb3, 0xb5, 0xb9, 0xbe, 0xc0, // c2 is last one
  // NOTE: b3 is only unused after deterministic pre-parse deletes it.
]);

export namespace Trigger {
  export type Custom = 'mezame'|'zombie warp'|'channel item';
}

export class Trigger extends Entity {

  used: boolean;
  pointer: number;
  base: number;

  // List of flags to check: positive means "must be set"
  conditions: number[];
  // Message shown, action run
  message: MessageId;
  // List of flags to set/clear: positive means to set it.
  flags: number[];

  constructor(rom: Rom, id: number) {
    // TODO - consider pulling this out into static fromBytes() method?
    //        - still need/want the Rom reference in that case?  no id?
    super(rom, id);
    this.used = !UNUSED_TRIGGERS.has(id); // need to set manually
    this.pointer = 0x1e17a + ((id & 0x7f) << 1);
    this.base = addr(rom.prg, this.pointer, 0x14000);
    this.conditions = [];
    this.message = MessageId.of({});
    this.flags = [];
    let word;
    let i = this.base;
    do {
      // NOTE: this byte order is inverse from normal.
      word = readBigEndian(rom.prg, i);
      const flag = word & 0x0fff;
      this.conditions.push(word & 0x2000 ? ~flag : flag);
      i += 2;
    } while (!(word & 0x8000));
    this.message = MessageId.from(rom.prg, i);
    do {
      i += 2;
      word = readBigEndian(rom.prg, i);
      const flag = word & 0x0fff;
      this.flags.push(word & 0x8000 ? ~flag : flag);
    } while (!(word & 0x4000));
    // console.log(`Trigger $${this.id.toString(16)}: bytes: $${
    //              this.bytes().map(x=>x.toString(16).padStart(2,0)).join(' ')}`);
  }

  bytes(): number[] {
    const bytes = [];
    if (!this.conditions.length) this.conditions.push(~0);
    for (let i = 0; i < this.conditions.length; i++) {
      let word = this.conditions[i];
      if (word < 0) word = ~word | 0x2000;
      if (i === this.conditions.length - 1) word = word | 0x8000;
      bytes.push(word >>> 8, word & 0xff);
    }
    bytes.push(...this.message.data);
    if (!this.flags.length) this.flags.push(~0);
    for (let i = 0; i < this.flags.length; i++) {
      let word = this.flags[i];
      if (word < 0) word = ~word | 0x8000;
      if (i === this.flags.length - 1) word = word | 0x4000;
      bytes.push( word >>> 8, word & 0xff);
    }
    return bytes;
  }

  write(): Module[] {
    if (!this.used) return [];
    const a = this.rom.assembler();
    const name = `Trigger_${hex(this.id)}`;
    a.segment('0f');
    a.reloc(name);
    const addr = a.pc();
    a.byte(...this.bytes());
    a.org(0xa17a + 2 * (this.id & 0x7f), name + '_Ptr');
    a.word(addr);
    return [a.module()];
      // TODO - need to hit telepathy, npc spawns, dialogs, itemget
      // (checkbelowboss) as well at the same time as this!
  }
}
