import {Entity} from './entity.js';
import {MessageId} from './messageid.js';
import {DIALOG_FLAGS, Data, SPAWN_CONDITION_FLAGS, addr, hex,
        readBigEndian, readLittleEndian, tuple,
        writeLittleEndian} from './util.js';
import {Writer} from './writer.js';
import {Rom} from '../rom.js';

type FlagList = number[];

export class Npc extends Entity {

  used: boolean;
  name?: string;
  itemNames?: [string, string];

  dataBase: number;
  data: [number, number, number, number]; // uint8
  spawnPointer: number;
  spawnBase: number;
  // Flags to check per location: positive means "must be set"
  spawnConditions = new Map<number, FlagList>(); // key uint8

  dialogPointer: number;
  dialogBase: number;
  globalDialogs: GlobalDialog[];
  localDialogs = new Map<number, LocalDialog[]>();

  constructor(rom: Rom, id: number) {
    super(rom, id);
    this.used = !UNUSED_NPCS.has(id) /*&& this.base <= 0x1c781*/ && (id < 0x8f || id >= 0xc0);
    const hasDialog = id <= 0xc3;

    this.dataBase = 0x80f0 | ((id & 0xfc) << 6) | ((id & 3) << 2);
    this.data = tuple(rom.prg, this.dataBase, 4);

    this.spawnPointer = 0x1c5e0 + (id << 1);
    // console.log(`NPC Spawn $${this.id.toString(16)}: ${rom.prg[this.pointer].toString(16)} ${
    //              rom.prg[this.pointer + 1].toString(16)}`);
    this.spawnBase = readLittleEndian(rom.prg, this.spawnPointer) + 0x14000;

    // Populate spawn conditions
    let i = this.spawnBase;
    let loc;
    while (this.used && (loc = rom.prg[i++]) !== 0xff) {
      const flags = SPAWN_CONDITION_FLAGS.read(rom.prg, i);
      i += 2 * flags.length;
      this.spawnConditions.set(loc, flags);
    }

    // Populate the dialog table
    this.dialogPointer = 0x1c95d + (id << 1);
    this.dialogBase = hasDialog ? addr(rom.prg, this.dialogPointer, 0x14000) : 0;
    this.globalDialogs = [];
    if (hasDialog) {
      let a = this.dialogBase;
      while (true) {
        const [dialog, last] = GlobalDialog.parse(rom.prg, a);
        a += 4;
        if (dialog.condition) this.globalDialogs.push(dialog);
        if (last) break;
      }
      // Read the location table
      const locations: [number, number][] = [];
      while (true) {
        const location = rom.prg[a++];
        if (location === 0xff) break;
        locations.push([location, rom.prg[a++]]);
      }
      if (!locations.length) locations.push([-1, 0]);
      // Now build up the LocalDialog tables
      const base = a;
      for (const [location, offset] of locations) {
        const dialogs: LocalDialog[] = [];
        this.localDialogs.set(location, dialogs);
        a = base + offset;
        while (true) {
          const [dialog, last] = LocalDialog.parse(rom.prg, a);
          a += dialog.byteLength();
          dialogs.push(dialog);
          if (last) break;
        }
      }
    }

    for (const i in NAMES) {
      if (!NAMES.hasOwnProperty(i)) continue;
      const name = (NAMES as {} as {[key: string]: [number, string, string?, string?]})[i];
      if (name[0] === id) {
        this.name = name[1];
        if (name.length > 2) {
          this.itemNames = name.slice(2, 4) as [string, string];
        }
      }
    }

    // console.log(`NPC Spawn $${this.id.toString(16)} from ${this.base.toString(16)}: bytes: $${
    //              this.bytes().map(x=>x.toString(16).padStart(2,0)).join(' ')}`);
  }

  spawnConditionsBytes(): number[] {
    const bytes = [];
    for (const [loc, flags] of this.spawnConditions) {
      bytes.push(loc, ...SPAWN_CONDITION_FLAGS.bytes(flags));
    }
    bytes.push(0xff);
    return bytes;
  }

  hasDialog(): boolean {
    return Boolean(this.globalDialogs.length || this.localDialogs.size);
  }

  * allDialogs(): Iterable<LocalDialog | GlobalDialog> {
    yield * this.globalDialogs;
    for (const ds of this.localDialogs.values()) {
      yield * ds;
    }
  }

  dialogBytes(): number[] {
    if (!this.hasDialog()) return [];
    const bytes: number[] = [];
    function serialize(ds: GlobalDialog[] | LocalDialog[]): number[] {
      const out: number[] = [];
      for (let i = 0; i < ds.length; i++) {
        out.push(...ds[i].bytes(i === ds.length - 1));
      }
      return out;
    }
    if (this.globalDialogs.length) {
      bytes.push(...serialize(this.globalDialogs));
    } else {
      bytes.push(0x80, 0, 0, 0); // "empty"
    }
    const locals: number[] = [];
    const cache = new Map<string, number>(); // allow reusing locations
    for (const [location, dialogs] of this.localDialogs) {
      const localBytes = serialize(dialogs);
      const label = localBytes.join(',');
      const cached = cache.get(label);
      if (cached != null) {
        bytes.push(location, cached);
        // console.log(`SAVED ${localBytes.length} bytes`);
        continue;
      }
      cache.set(label, locals.length);
      if (location !== -1) bytes.push(location, locals.length);
      locals.push(...localBytes);
    }
    if (locals.length) bytes.push(0xff, ...locals);

    // console.log(`NPC ${this.id.toString(16)}: bytes length ${bytes.length}`);

    return bytes;
  }

  // Makes a "hardlink" between two NPCs, for spawn conditions and dialog.
  link(id: number): void {
    const other = this.rom.npcs[id];
    this.spawnConditions = other.spawnConditions;
    this.linkDialog(id);
  }

  linkDialog(id: number): void {
    const other = this.rom.npcs[id];
    this.globalDialogs = other.globalDialogs;
    this.localDialogs = other.localDialogs;
  }

  async write(writer: Writer): Promise<void> {
    if (!this.used) return;
    const promises = [];
    writer.rom.subarray(this.dataBase, this.dataBase + 4).set(this.data);
    promises.push(writer.write(this.spawnConditionsBytes(), 0x1c000, 0x1dfff,
                               `SpawnCondition ${hex(this.id)}`).then(
        address => writeLittleEndian(writer.rom, this.spawnPointer, address - 0x14000)));

    if (this.hasDialog()) {
      promises.push(writer.write(this.dialogBytes(), 0x1c000, 0x1dfff,
                                 `Dialog ${hex(this.id)}`).then(
          address => writeLittleEndian(writer.rom, this.dialogPointer, address - 0x14000)));
    }
    await Promise.all(promises);
  }
}

export class GlobalDialog {
  constructor(public condition: number, public message: MessageId) {}

  static of(condition: number,
            message: [number, number, number?]): GlobalDialog {
    const [part, index, action = 0] = message;
    return new GlobalDialog(condition, MessageId.of({part, index, action}));
  }

  // Returns [dialog, last].
  static parse(data: Data<number>, offset: number = 0): [GlobalDialog, boolean] {
    const flag = readBigEndian(data, offset);
    const message = MessageId.from(data, offset + 2);

    let condition = flag & 0x03ff;
    const last = !!(flag & 0x8000);
    const sign = flag & 0x2000;
    if (sign) condition = ~condition;

    return [new GlobalDialog(condition, message), last];
  }

  bytes(last: boolean): number[] {
    let flag = this.condition;
    if (flag < 0) flag = (~flag) | 0x2000;
    if (last) flag |= 0x8000;
    return [flag >>> 8, flag & 0xff, ...this.message.data];
  }
}

export class LocalDialog {
  constructor(public condition: number,
              public message: MessageId,
              public update: number,
              public flags: FlagList) {}

  clone(): LocalDialog {
    return LocalDialog.parse(this.bytes(false))[0];
  }

  // Returns [dialog, last]
  static parse(data: Data<number>, offset: number = 0): [LocalDialog, boolean] {
    const word = readBigEndian(data, offset);
    const message = MessageId.from(data, offset + 2);
    const update = data[offset + 4];
    offset += 5;

    let condition = word & 0x03ff;
    const last = !!(word & 0x8000);
    const sign = word & 0x2000;
    if (sign) condition = ~condition;
    const flags = word & 0x4000 ? DIALOG_FLAGS.read(data, offset) : [];
    return [new LocalDialog(condition, message, update, flags), last];
  }

  static of(condition: number,
            message: [number, number, number?],
            flags: FlagList = []): LocalDialog {
    const [part, index, action = 0] = message;
    return new LocalDialog(condition, MessageId.of({part, index, action}), 0, flags);
  }

  byteLength(): number {
    return 5 + 2 * this.flags.length;
  }

  bytes(last: boolean): number[] {
    let flag = this.condition;
    if (flag < 0) flag = (~flag) | 0x2000;
    if (last) flag |= 0x8000;
    if (this.flags.length) flag |= 0x4000;
    return [flag >>> 8, flag & 0xff, ...this.message.data, this.update,
            ...DIALOG_FLAGS.bytes(this.flags)];
  }
}

const UNUSED_NPCS = new Set([
  0x31, 0x3c, 0x6a, 0x73, 0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
  // also everything from 8f..c0, but that's implicit.
]);

export const NAMES = {
  leafElder: [0x0d, 'Leaf elder'],
  leafRabbit: [0x13, 'Leaf rabbit'],
  windmillGuard: [0x14, 'Windmill guard', 'in cave', 'in house'],
  windmillGuardSleeping: [0x15, 'Sleeping windmill guard'],
  akahanaShyron: [0x16, 'Akahana in Shyron'], // also in cave
  oakElder: [0x1d, 'Oak elder'],
  oakMother: [0x1e, 'Oak mother'],
  dwarfChild: [0x1f, 'Dwarf child'],
  aryllis: [0x23, 'Aryllis'],
  portoaQueen: [0x38, 'Portoa queen'],
  fortuneTeller: [0x39, 'Fortune teller'],
  clark: [0x44, 'Clark'],
  brokahana: [0x54, 'Akahana\'s friend'],
  deo: [0x5a, 'Deo'],
  zebu: [0x5e, 'Zebu', 'in cave', 'in Shyron'],
  tornel: [0x5f, 'Tornel'],
  stom: [0x60, 'Stom'],
  mesiaShrine: [0x61, 'Mesia in Shrine'],
  asina: [0x62, 'Asina', 'in back room', ''],
  hurtDolphin: [0x63, 'Hurt dolphin'],
  fisherman: [0x64, 'Fisherman'],
  kensuCabin: [0x68, 'Kensu in cabin'],
  kensuSleeping: [0x6b, 'Sleeping kensu'],
  kensuSwan: [0x74, 'Kensu in Swan'],
  kensuSlime: [0x75, 'Slimed Kensu'],
  kensuLighthouse: [0x7e, 'Kensu in lighthouse'],
  akahanaBrynmaer: [0x82, 'Akahana in Brynmaer'], // Note: originally $16
  azteca: [0x83, 'Azteca'],
  fakeMesia: [0x84, 'Fake Mesia'],
  akahanaStoned: [0x88, 'Stoned Akahana'],
  mesia: [0x8e, 'Mesia'],
  rage: [0xc3, 'Rage'],
};
