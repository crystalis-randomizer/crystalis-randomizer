import {Entity, Rom} from './entity.js';
import {Writer} from './writer.js';
import {Data, DataTuple, addr, tuple} from './util.js';

type FlagList = number[];

export class Npc extends Entity {

  used: boolean;
  dataBase: number;
  data: [number, number, number, number]; // uint8
  spawnPointer: number;
  spawnBase: number;
  spawnConditions: Map<number, FlagList>; // key uint8

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.used = !UNUSED_NPCS.has(id) /*&& this.base <= 0x1c781*/ && (id < 0x8f || id >= 0xc0);

    this.dataBase = 0x80f0 | ((id & 0xfc) << 6) | ((id & 3) << 2);
    this.data = tuple(rom.prg, this.dataBase, 4);

    this.spawnPointer = 0x1c5e0 + (id << 1);
//console.log(`NPC Spawn $${this.id.toString(16)}: ${rom.prg[this.pointer].toString(16)} ${rom.prg[this.pointer + 1].toString(16)}`);
    this.spawnBase = addr(rom.prg, this.spawnPointer, 0x14000);
    // Flags to check per location: positive means "must be set"
    this.spawnConditions = new Map();

    // Populate spawn conditions
    let i = this.spawnBase;
    let loc;
    while (this.used && (loc = rom.prg[i++]) != 0xff) {
      const flags: number[] = [];
      this.spawnConditions.set(loc, flags);
      let word;
      do {
        // NOTE: this byte order is inverse from normal.
        word = rom.prg[i] << 8 | rom.prg[i + 1];
        const flag = word & 0x0fff;
        flags.push(word & 0x2000 ? ~flag : flag);
        i += 2;
      } while (!(word & 0x8000));
    }
//console.log(`NPC Spawn $${this.id.toString(16)} from ${this.base.toString(16)}: bytes: $${this.bytes().map(x=>x.toString(16).padStart(2,0)).join(' ')}`);
  }

  spawnConditionsBytes(): Data<number> {
    const bytes = [];
    for (const [loc, flags] of this.spawnConditions) {
      bytes.push(loc);
      for (let i = 0; i < flags.length; i++) {
        let word = flags[i];
        if (word < 0) word = ~word | 0x2000;
        if (i === flags.length - 1) word = word | 0x8000;
        bytes.push(word >>> 8, word & 0xff);
      }
    }
    bytes.push(0xff);
    return bytes;
  }

  async write(writer: Writer, {spawnConditionsBase = 0x1c5e0} = {}): Promise<void> {
    const address = await writer.write(this.spawnConditionsBytes(), 0x1c000, 0x1dfff);
    writer.rom[spawnConditionsBase + 2 * this.id] = address & 0xff;
    writer.rom[spawnConditionsBase + 2 * this.id + 1] = (address >>> 8) - 0x40;
    // TODO - write the static data
    // TODO - update pointer to the base???
  }
}



const UNUSED_NPCS = new Set([
  0x3c, 0x6a, 0x73, 0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
  // also everything from 8f..c0, but that's implicit.
]);
