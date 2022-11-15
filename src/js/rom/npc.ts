import {Assembler} from '../asm/assembler';
import {Module} from '../asm/module';
import {Entity, EntityArray} from './entity';
import {Entrance} from './locationtables';
import {Location} from './location';
import {MessageId} from './messageid';
import {DIALOG_FLAGS, SPAWN_CONDITION_FLAGS,
        Address, Data, Segment,
  hex, readBigEndian, seq, tuple, upperCamelToSpaces, free} from './util.js';
import {Rom} from '../rom';

const {$04, $05, $0e, $1b, $fe} = Segment;

type FlagList = number[];

export class Npcs extends EntityArray<Npc> {
  // generic 00..0a
  GoaSoldier = new Npc(this, 0x0b);
  // generic 0c
  LeafElder = new Npc(this, 0x0d);
  // generic leaf 0e..10
  LeafElderDaughter = new Npc(this, 0x11);
  // generic leaf 12
  LeafRabbit = new Npc(this, 0x13);
  WindmillGuard = new Npc(this, 0x14);
  SleepingWindmillGuard = new Npc(this, 0x15);
  Akahana = new Npc(this, 0x16);
  // generic brynmaer 17..1c
  OakElder = new Npc(this, 0x1d);
  OakMother = new Npc(this, 0x1e);
  OakChild = new Npc(this, 0x1f);
  // generic oak 20..22
  Aryllis = new Npc(this, 0x23);
  // generic amazones 24
  AmazonesGuard = new Npc(this, 0x25);
  AryllisRightAttendant = new Npc(this, 0x26);
  AryllisLeftAttendant = new Npc(this, 0x27);
  Nadare = new Npc(this, 0x28);
  // generic nadare 29..2c
  SoldierGuard = new Npc(this, 0x2d); // swan, mt sabre
  // shopkeeper prisoners 2e..30
  // unused 31
  // generic portoa palace 32
  PortoaThroneRoomBackDoorGuard = new Npc(this, 0x33);
  PortoaPalaceFrontGuard = new Npc(this, 0x34);
  // generic portoa palace 35..37
  PortoaQueen = new PortoaQueen(this, 0x38);
  FortuneTeller = new Npc(this, 0x39);
  WaterfallCaveAdventurers = new Npc(this, 0x3a);
  // unused 3b..3c
  JoelElder = new Npc(this, 0x3d);
  // generic joel 3e..43
  Clark = new Npc(this, 0x44);
  // generic zombie town 45..47
  // generic swan 49..4d
  ShyronGuard = new Npc(this, 0x4e);
  // generic shyron 4f..53
  Brokahana = new Npc(this, 0x54);
  // generic goa 55..58
  SaharaBunny = new Npc(this, 0x59);
  Deo = new Npc(this, 0x5a);
  SaharaElder = new Npc(this, 0x5b);
  SaharaElderDaughter = new Npc(this, 0x5c);
  // generic 5d
  Zebu = new Npc(this, 0x5e);
  Tornel = new Npc(this, 0x5f);
  Stom = new Npc(this, 0x60);
  MesiaRecording = new Npc(this, 0x61);
  Asina = new Npc(this, 0x62);
  HurtDolphin = new Npc(this, 0x63);
  Fisherman = new Npc(this, 0x64);
  StartledVillagerOutsideCave = new Npc(this, 0x65);
  // generic/unsed 66..67
  KensuInCabin = new Npc(this, 0x68);
  Dolphin = new Dolphin(this, 0x69);
  // unused 6a
  SleepingKensu = new Npc(this, 0x6b);
  KensuDisguisedAsDancer = new Npc(this, 0x6c);
  KensuDisguisedAsSoldier = new Npc(this, 0x6d);
  AztecaInShyron = new Npc(this, 0x6e);
  // generic 6f
  DeadAkahana = new Npc(this, 0x70);
  DeadStomsGirlfriend = new Npc(this, 0x71);
  DeadStom = new Npc(this, 0x72);
  // unused 73
  KensuInSwan = new Npc(this, 0x74); // note: unused in vanilla (7e)
  SlimedKensu = new Npc(this, 0x75);
  // generic 76..7a
  FishermanDaughter = new Npc(this, 0x7b);
  // generic 7c..7d
  Kensu = new Npc(this, 0x7e);
  // generic/unused 7f..82
  AkahanaInBrynmaer = new Npc(this, 0x82); // note: unused in vanilla (16)
  AztecaInPyramid = new Npc(this, 0x83);
  SaberaDisguisedAsMesia = new Npc(this, 0x84);
  StonedWaterfallCaveAdventurers = new Npc(this, 0x85);
  // unused 86..87
  StonedAkahana = new Npc(this, 0x88);
  // unused 89..8d
  Mesia = new Npc(this, 0x8e);

  // unusable 8f..bf (we've co-opted that PRG space for now)

  Vampire1 = new Npc(this, 0xc0);
  Insect = new Npc(this, 0xc1);
  Kelbesque1 = new Npc(this, 0xc2);
  Rage = new Npc(this, 0xc3);
  // unused - Mado1 = new Npc(this, 0xc4);
  Kelbesque2 = new Npc(this, 0xc5);
  Sabera2 = new Npc(this, 0xc6);
  Mado2 = new Npc(this, 0xc7);
  Karmine = new Npc(this, 0xc8);
  StatueOfMoon = new Npc(this, 0xc9);
  StatueOfSun = new Npc(this, 0xca);
  Draygon = new Npc(this, 0xcb);
  Vampire2 = new Npc(this, 0xcc);

  movementScripts: MovementScript[];

  constructor(readonly rom: Rom) {
    super(0xcd);
    for (const key in this) {
      const npc = this[key];
      if (!this.hasOwnProperty(key) || !(npc instanceof Npc)) continue;
      this[npc.id] = npc;
      npc.name = upperCamelToSpaces(key);
    }
    for (let i = 0; i < 0xcd; i++) {
      if (!this[i]) {
        this[i] = new Npc(this, i);
      }
    }
    // Read all the movement scripts
    const movementBase = MOVEMENT_SCRIPT_TABLE_POINTER.readAddress(rom.prg);
    this.movementScripts = seq(16, i => {
      let addr = movementBase.plus(2 * i).readAddress(rom.prg).offset;
      const steps: number[] = [];
      while (rom.prg[addr] < 0x80) {
        steps.push(rom.prg[addr++]);
      }
      const terminate = rom.prg[addr];
      return {steps, terminate};
    });
  }

  write(): Module[] {
    // Write all the NPCs
    const a = this.rom.assembler();
    for (const npc of this) {
      if (!npc || !npc.used) continue;
      npc.assemble(a);
    }
    // Free the space from the original movement scripts
    free(a, $1b, 0xaf04, 0xafa9);
    // Write the movement scripts
    const pointerTable = [];
    a.segment('1b', 'fe', 'ff');
    let i = 0;
    for (const movement of this.movementScripts) {
      const addr = (a.reloc(`MovementScript_${hex(i++)}`), a.pc());
      a.byte(...movement.steps, movement.terminate);
      pointerTable.push(addr);
    }
    const pointerTableAddr = (a.reloc('MovementScriptTable'), a.pc());
    a.word(...pointerTable);
    MOVEMENT_SCRIPT_TABLE_POINTER.loc(a, 'MovementScriptTablePtr');
    a.word(pointerTableAddr);
    MOVEMENT_SCRIPT_TABLE_POINTER.plus(5).loc(a, 'MovementScriptTablePlus1Ptr');
    a.word({op: '+', args: [pointerTableAddr, {op: 'num', num: 1}]});
    // Return the result
    return [a.module()];
  }
}

export class Npc extends Entity {

  private _used: boolean;
  name?: string;
  itemNames?: [string, string];

  data: [number, number, number, number]; // uint8
  // Flags to check per location: positive means "must be set"
  spawnConditions = new Map<number, FlagList>(); // key uint8

  globalDialogs: GlobalDialog[];
  localDialogs = new Map<number, LocalDialog[]>();

  constructor(readonly npcs: Npcs, id: number) {
    super(npcs.rom, id);
    const rom = npcs.rom;
    if (id > 0xcc) throw new Error(`Unavailable: ${id}`);
    // TODO - check (this.base <= 0x1c781) for unused?
    this._used = !UNUSED_NPCS.has(id) && (id < 0x8f || id >= 0xc0);
    let dialogBase = id < 0xc4 ? this.dialogPointer.readAddress(rom.prg) : null;
    if (dialogBase && dialogBase.org === 0x8b39) dialogBase = null;

    this.data = tuple(rom.prg, this.dataBase.offset, 4);

    const spawnBase = this.spawnPointer.readAddress(rom.prg);

    // Populate spawn conditions
    let i = spawnBase.offset;
    let loc;
    while (this.used && (loc = rom.prg[i++]) !== 0xff) {
      const flags = SPAWN_CONDITION_FLAGS.read(rom.prg, i);
      i += 2 * flags.length;
      this.spawnConditions.set(loc, flags);
    }

    // Populate the dialog table
    this.globalDialogs = [];
    if (dialogBase) {
      let a = dialogBase.offset;
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

    // for (const i in NAMES) {
    //   if (!NAMES.hasOwnProperty(i)) continue;
    //   const name = (NAMES as {} as {[key: string]: [number, string, string?, string?]})[i];
    //   if (name[0] === id) {
    //     this.name = name[1];
    //     if (name.length > 2) {
    //       this.itemNames = name.slice(2, 4) as [string, string];
    //     }
    //   }
    // }

    // console.log(`NPC Spawn $${this.id.toString(16)} from ${this.base.toString(16)}: bytes: $${
    //              this.bytes().map(x=>x.toString(16).padStart(2,0)).join(' ')}`);
  }

  get dataBase(): Address {
    const seg = this.id & 0x80 ? $05 : $04;
    const org = 0x80f0 | ((this.id & 0xfc) << 6) | ((this.id & 3) << 2);
    return Address.of(seg, org);
  }

  get spawnPointer(): Address {
    return Address.of($0e, 0x85e0 + (this.id << 1));
  }

  get dialogPointer(): Address {
    return Address.of($0e, 0x895d + (this.id << 1));
  }

  get used() { return this._used; }
  set used(used: boolean) {
    // quick check: we can't use some indexes because data tables co-opted.
    // 1ca6f..1ca79, 1ca7b..1cae3 (c0..c2 are used but have no dialog...)
    // 1c6f2..1c6fc, 1c6fe..1c760
    if (used && (this.id > 0x88 && this.id < 0xc0 && this.id !== 0x8e)) {
      throw new Error(`invalid: ${this.id}`);
    }
    this._used = used;
  }

  spawnConditionsBytes(): number[] {
    const bytes = [];
    for (const [loc, flags] of this.spawnConditions) {
      bytes.push(loc, ...SPAWN_CONDITION_FLAGS.bytes(flags));
    }
    bytes.push(0xff);
    return bytes;
  }

  dialog(location?: Location): LocalDialog[] {
    const id = location ? location.id : -1;
    const dialogs = this.localDialogs.get(id);
    if (dialogs) return dialogs;
    throw new Error(`No local dialog for NPC ${hex(this.id)} at ${hex(id)}`);
  }

  spawns(location: Location): number[] {
    const id = location.id;
    const conditions = this.spawnConditions.get(location.id);
    if (conditions) return conditions;
    throw new Error(`No spawn condition for NPC ${hex(this.id)} at ${hex(id)}`);
  }

  hasDialog(): boolean {
    const result = Boolean(this.globalDialogs.length || this.localDialogs.size);
    if (this.id > 0x8e && this.id !== 0xc3 && result) {
      throw new Error(`invalid: ${this.id}`);
    }
    return result;
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

  localDialog(index: number): LocalDialog;
  localDialog(location: number, index?: number): LocalDialog {
    if (index == null) {
      index = location;
      location = -1;
    }
    const dialogs = this.localDialogs.get(location);
    if (dialogs == null || index >= dialogs.length) {
      throw new Error(`No local dialog ${index} for location ${hex(location)}`);
    }
    return dialogs[index];
  }

  isParalyzable(): boolean {
    for (let i = 0x35058; i < 0x3506c; i++) {
      if (this.rom.prg[i] === this.id) return false;
    }
    return true;
  }

  assemble(a: Assembler) {
    if (!this.used) return;
    const id = hex(this.id);

    this.dataBase.loc(a, 'PersonData_${id}');
    a.byte(...this.data);

    a.segment('0e', 'fe', 'ff');
    a.reloc(`SpawnCondition_${id}`);
    const spawn = a.pc();
    a.byte(...this.spawnConditionsBytes());
    this.spawnPointer.loc(a, `SpawnCondition_${id}_Pointer`);
    a.word(spawn);

    if (this.hasDialog()) {
      a.segment('0e', 'fe', 'ff');
      a.reloc(`Dialog_${id}`);
      const dialog = a.pc();
      a.byte(...this.dialogBytes());
      this.dialogPointer.loc(a, `Dialog_${id}_Pointer`);
      a.word(dialog);
    }
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
  0x31, 0x3b, 0x3c, 0x66, 0x67, 0x6a, 0x73, 0x74,
  0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
  0xc4,
  // also everything from 8f..c0, but that's implicit.
]);

////////////////////////////////////////////////////////////////
// Special cases for some NPCs.

export class PortoaQueen extends Npc {
  get expectedSword(): number { return this.localDialog(3).condition & 0xff; }
  set expectedSword(id: number) { this.localDialog(3).condition = 0x200 | id; }
}

export class Dolphin extends Npc {
  spawnScripts: DolphinSpawnScript[];
  channelSpawn: number;
  evilSpiritIslandSpawn: number;

  constructor(parent: Npcs, id: number) {
    super(parent, id);
    const prg = parent.rom.prg;
    const spawnTableBase = DOLPHIN_SPAWN_TABLE_POINTER.readAddress(prg).offset;
    // TODO - how to know how big the table actually is, if rewritten?
    const read = (i: number) => {
      const entrance = Entrance.from(prg, spawnTableBase + 5 * i);
      const movement = prg[spawnTableBase + 5 * i + 4];
      return {entrance, movement};
    };
    this.spawnScripts = seq(9, read);
    this.channelSpawn = mustBeInt(DOLPHIN_CHANNEL_SPAWN.read(prg) / 5);
    this.evilSpiritIslandSpawn =
        mustBeInt(DOLPHIN_EVIL_SPIRIT_ISLAND_SPAWN.read(prg) / 5);
  }

  assemble(a: Assembler) {
    super.assemble(a);
    // Free the original table to allow relocation and/or resizing.
    a.segment('fe');
    a.org(0xd6a8);
    a.free(45);
    // Write the new table (after trimming any empties at the end).
    a.segment('fe', 'ff');
    a.reloc('DolphinSpawnTable');
    const table = a.pc();
    while (!this.spawnScripts[this.spawnScripts.length - 1].entrance.used) {
      this.spawnScripts.pop();
    }
    for (let i = 0; i < this.rom.locations.AngrySea.entrances.length; i++) {
      const s = this.spawnScripts[i];
      if (s) {
        a.byte(...s.entrance.data, s.movement);
      } else {
        // "no-op" script.  Don't read random garbage for later entrances.
        a.byte(0xff, 0x0f, 0xff, 0x0f, 0x0f);
      }
    }
    // Write the addresses and hardcoded indices into the itemuse code.
    DOLPHIN_CHANNEL_SPAWN.loc(a, 'DolphinChannelSpawn');
    a.byte(this.channelSpawn * 5);
    DOLPHIN_EVIL_SPIRIT_ISLAND_SPAWN.loc(a, 'DolphinEvilSpiritIslandSpawn');
    a.byte(this.evilSpiritIslandSpawn * 5);
    DOLPHIN_SPAWN_TABLE_POINTER.loc(a, 'DolphinSpawnTablePtr');
    a.word(table);
    for (let i = 0; i < 4; i++) {
      DOLPHIN_SPAWN_TABLE_POINTER_1.plus(5 * i)
          .loc(a, `DolphinSpawnTablePlus${i + 1}Ptr`);
      a.word({op: '+', args: [table, {op: 'num', num: i + 1}]});    
    }
  }
}

export interface DolphinSpawnScript {
  entrance: Entrance;
  movement: number;
}

export interface MovementScript {
  steps: number[];
  terminate: number;
}
export namespace MovementScript {
  export const UP = 0;
  export const RIGHT = 2;
  export const DOWN = 4;
  export const LEFT = 6;
  export const DOLPHIN = 0xff;
  export const DESPAWN = 0xfe;
}

const DOLPHIN_CHANNEL_SPAWN = Address.of($fe, 0xd664);
const DOLPHIN_EVIL_SPIRIT_ISLAND_SPAWN = Address.of($fe, 0xd66c);
const DOLPHIN_SPAWN_TABLE_POINTER = Address.of($fe, 0xd67a);
const DOLPHIN_SPAWN_TABLE_POINTER_1 = Address.of($fe, 0xd68e); // +5, 10, 15
const MOVEMENT_SCRIPT_TABLE_POINTER = Address.of($1b, 0xae53);

function mustBeInt(x: number): number {
  if (x !== Math.floor(x)) throw new Error(`Expected integer: ${x}`);
  return x;
}
