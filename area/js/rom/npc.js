import { Entity, EntityArray } from './entity.js';
import { Entrance } from './locationtables.js';
import { MessageId } from './messageid.js';
import { DIALOG_FLAGS, SPAWN_CONDITION_FLAGS, Address, Segment, hex, readBigEndian, seq, tuple, upperCamelToSpaces, free } from './util.js';
const { $04, $05, $0e, $1b, $fe } = Segment;
export class Npcs extends EntityArray {
    constructor(rom) {
        super(0xcd);
        this.rom = rom;
        this.GoaSoldier = new Npc(this, 0x0b);
        this.LeafElder = new Npc(this, 0x0d);
        this.LeafElderDaughter = new Npc(this, 0x11);
        this.LeafRabbit = new Npc(this, 0x13);
        this.WindmillGuard = new Npc(this, 0x14);
        this.SleepingWindmillGuard = new Npc(this, 0x15);
        this.Akahana = new Npc(this, 0x16);
        this.OakElder = new Npc(this, 0x1d);
        this.OakMother = new Npc(this, 0x1e);
        this.OakChild = new Npc(this, 0x1f);
        this.Aryllis = new Npc(this, 0x23);
        this.AmazonesGuard = new Npc(this, 0x25);
        this.AryllisRightAttendant = new Npc(this, 0x26);
        this.AryllisLeftAttendant = new Npc(this, 0x27);
        this.Nadare = new Npc(this, 0x28);
        this.SoldierGuard = new Npc(this, 0x2d);
        this.PortoaThroneRoomBackDoorGuard = new Npc(this, 0x33);
        this.PortoaPalaceFrontGuard = new Npc(this, 0x34);
        this.PortoaQueen = new PortoaQueen(this, 0x38);
        this.FortuneTeller = new Npc(this, 0x39);
        this.WaterfallCaveAdventurers = new Npc(this, 0x3a);
        this.JoelElder = new Npc(this, 0x3d);
        this.Clark = new Npc(this, 0x44);
        this.ShyronGuard = new Npc(this, 0x4e);
        this.Brokahana = new Npc(this, 0x54);
        this.SaharaBunny = new Npc(this, 0x59);
        this.Deo = new Npc(this, 0x5a);
        this.SaharaElder = new Npc(this, 0x5b);
        this.SaharaElderDaughter = new Npc(this, 0x5c);
        this.Zebu = new Npc(this, 0x5e);
        this.Tornel = new Npc(this, 0x5f);
        this.Stom = new Npc(this, 0x60);
        this.MesiaRecording = new Npc(this, 0x61);
        this.Asina = new Npc(this, 0x62);
        this.HurtDolphin = new Npc(this, 0x63);
        this.Fisherman = new Npc(this, 0x64);
        this.StartledVillagerOutsideCave = new Npc(this, 0x65);
        this.KensuInCabin = new Npc(this, 0x68);
        this.Dolphin = new Dolphin(this, 0x69);
        this.SleepingKensu = new Npc(this, 0x6b);
        this.KensuDisguisedAsDancer = new Npc(this, 0x6c);
        this.KensuDisguisedAsSoldier = new Npc(this, 0x6d);
        this.AztecaInShyron = new Npc(this, 0x6e);
        this.DeadAkahana = new Npc(this, 0x70);
        this.DeadStomsGirlfriend = new Npc(this, 0x71);
        this.DeadStom = new Npc(this, 0x72);
        this.KensuInSwan = new Npc(this, 0x74);
        this.SlimedKensu = new Npc(this, 0x75);
        this.FishermanDaughter = new Npc(this, 0x7b);
        this.Kensu = new Npc(this, 0x7e);
        this.AkahanaInBrynmaer = new Npc(this, 0x82);
        this.AztecaInPyramid = new Npc(this, 0x83);
        this.SaberaDisguisedAsMesia = new Npc(this, 0x84);
        this.StonedWaterfallCaveAdventurers = new Npc(this, 0x85);
        this.StonedAkahana = new Npc(this, 0x88);
        this.Mesia = new Npc(this, 0x8e);
        this.Vampire1 = new Npc(this, 0xc0);
        this.Insect = new Npc(this, 0xc1);
        this.Kelbesque1 = new Npc(this, 0xc2);
        this.Rage = new Npc(this, 0xc3);
        this.Kelbesque2 = new Npc(this, 0xc5);
        this.Sabera2 = new Npc(this, 0xc6);
        this.Mado2 = new Npc(this, 0xc7);
        this.Karmine = new Npc(this, 0xc8);
        this.StatueOfMoon = new Npc(this, 0xc9);
        this.StatueOfSun = new Npc(this, 0xca);
        this.Draygon = new Npc(this, 0xcb);
        this.Vampire2 = new Npc(this, 0xcc);
        for (const key in this) {
            const npc = this[key];
            if (!this.hasOwnProperty(key) || !(npc instanceof Npc))
                continue;
            this[npc.id] = npc;
            npc.name = upperCamelToSpaces(key);
        }
        for (let i = 0; i < 0xcd; i++) {
            if (!this[i]) {
                this[i] = new Npc(this, i);
            }
        }
        const movementBase = MOVEMENT_SCRIPT_TABLE_POINTER.readAddress(rom.prg);
        this.movementScripts = seq(16, i => {
            let addr = movementBase.plus(2 * i).readAddress(rom.prg).offset;
            const steps = [];
            while (rom.prg[addr] < 0x80) {
                steps.push(rom.prg[addr++]);
            }
            const terminate = rom.prg[addr];
            return { steps, terminate };
        });
    }
    write() {
        const a = this.rom.assembler();
        for (const npc of this) {
            if (!npc || !npc.used)
                continue;
            npc.assemble(a);
        }
        free(a, $1b, 0xaf04, 0xafa9);
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
        a.word({ op: '+', args: [pointerTableAddr, { op: 'num', num: 1 }] });
        return [a.module()];
    }
}
export class Npc extends Entity {
    constructor(npcs, id) {
        super(npcs.rom, id);
        this.npcs = npcs;
        this.spawnConditions = new Map();
        this.localDialogs = new Map();
        const rom = npcs.rom;
        if (id > 0xcc)
            throw new Error(`Unavailable: ${id}`);
        this._used = !UNUSED_NPCS.has(id) && (id < 0x8f || id >= 0xc0);
        let dialogBase = id < 0xc4 ? this.dialogPointer.readAddress(rom.prg) : null;
        if (dialogBase && dialogBase.org === 0x8b39)
            dialogBase = null;
        this.data = tuple(rom.prg, this.dataBase.offset, 4);
        const spawnBase = this.spawnPointer.readAddress(rom.prg);
        let i = spawnBase.offset;
        let loc;
        while (this.used && (loc = rom.prg[i++]) !== 0xff) {
            const flags = SPAWN_CONDITION_FLAGS.read(rom.prg, i);
            i += 2 * flags.length;
            this.spawnConditions.set(loc, flags);
        }
        this.globalDialogs = [];
        if (dialogBase) {
            let a = dialogBase.offset;
            while (true) {
                const [dialog, last] = GlobalDialog.parse(rom.prg, a);
                a += 4;
                if (dialog.condition)
                    this.globalDialogs.push(dialog);
                if (last)
                    break;
            }
            const locations = [];
            while (true) {
                const location = rom.prg[a++];
                if (location === 0xff)
                    break;
                locations.push([location, rom.prg[a++]]);
            }
            if (!locations.length)
                locations.push([-1, 0]);
            const base = a;
            for (const [location, offset] of locations) {
                const dialogs = [];
                this.localDialogs.set(location, dialogs);
                a = base + offset;
                while (true) {
                    const [dialog, last] = LocalDialog.parse(rom.prg, a);
                    a += dialog.byteLength();
                    dialogs.push(dialog);
                    if (last)
                        break;
                }
            }
        }
    }
    get dataBase() {
        const seg = this.id & 0x80 ? $05 : $04;
        const org = 0x80f0 | ((this.id & 0xfc) << 6) | ((this.id & 3) << 2);
        return Address.of(seg, org);
    }
    get spawnPointer() {
        return Address.of($0e, 0x85e0 + (this.id << 1));
    }
    get dialogPointer() {
        return Address.of($0e, 0x895d + (this.id << 1));
    }
    get used() { return this._used; }
    set used(used) {
        if (used && (this.id > 0x88 && this.id < 0xc0 && this.id !== 0x8e)) {
            throw new Error(`invalid: ${this.id}`);
        }
        this._used = used;
    }
    spawnConditionsBytes() {
        const bytes = [];
        for (const [loc, flags] of this.spawnConditions) {
            bytes.push(loc, ...SPAWN_CONDITION_FLAGS.bytes(flags));
        }
        bytes.push(0xff);
        return bytes;
    }
    dialog(location) {
        const id = location ? location.id : -1;
        const dialogs = this.localDialogs.get(id);
        if (dialogs)
            return dialogs;
        throw new Error(`No local dialog for NPC ${hex(this.id)} at ${hex(id)}`);
    }
    spawns(location) {
        const id = location.id;
        const conditions = this.spawnConditions.get(location.id);
        if (conditions)
            return conditions;
        throw new Error(`No spawn condition for NPC ${hex(this.id)} at ${hex(id)}`);
    }
    hasDialog() {
        const result = Boolean(this.globalDialogs.length || this.localDialogs.size);
        if (this.id > 0x8e && this.id !== 0xc3 && result) {
            throw new Error(`invalid: ${this.id}`);
        }
        return result;
    }
    *allDialogs() {
        yield* this.globalDialogs;
        for (const ds of this.localDialogs.values()) {
            yield* ds;
        }
    }
    dialogBytes() {
        if (!this.hasDialog())
            return [];
        const bytes = [];
        function serialize(ds) {
            const out = [];
            for (let i = 0; i < ds.length; i++) {
                out.push(...ds[i].bytes(i === ds.length - 1));
            }
            return out;
        }
        if (this.globalDialogs.length) {
            bytes.push(...serialize(this.globalDialogs));
        }
        else {
            bytes.push(0x80, 0, 0, 0);
        }
        const locals = [];
        const cache = new Map();
        for (const [location, dialogs] of this.localDialogs) {
            const localBytes = serialize(dialogs);
            const label = localBytes.join(',');
            const cached = cache.get(label);
            if (cached != null) {
                bytes.push(location, cached);
                continue;
            }
            cache.set(label, locals.length);
            if (location !== -1)
                bytes.push(location, locals.length);
            locals.push(...localBytes);
        }
        if (locals.length)
            bytes.push(0xff, ...locals);
        return bytes;
    }
    link(id) {
        const other = this.rom.npcs[id];
        this.spawnConditions = other.spawnConditions;
        this.linkDialog(id);
    }
    linkDialog(id) {
        const other = this.rom.npcs[id];
        this.globalDialogs = other.globalDialogs;
        this.localDialogs = other.localDialogs;
    }
    localDialog(location, index) {
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
    isParalyzable() {
        for (let i = 0x35058; i < 0x3506c; i++) {
            if (this.rom.prg[i] === this.id)
                return false;
        }
        return true;
    }
    assemble(a) {
        if (!this.used)
            return;
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
    constructor(condition, message) {
        this.condition = condition;
        this.message = message;
    }
    static of(condition, message) {
        const [part, index, action = 0] = message;
        return new GlobalDialog(condition, MessageId.of({ part, index, action }));
    }
    static parse(data, offset = 0) {
        const flag = readBigEndian(data, offset);
        const message = MessageId.from(data, offset + 2);
        let condition = flag & 0x03ff;
        const last = !!(flag & 0x8000);
        const sign = flag & 0x2000;
        if (sign)
            condition = ~condition;
        return [new GlobalDialog(condition, message), last];
    }
    bytes(last) {
        let flag = this.condition;
        if (flag < 0)
            flag = (~flag) | 0x2000;
        if (last)
            flag |= 0x8000;
        return [flag >>> 8, flag & 0xff, ...this.message.data];
    }
}
export class LocalDialog {
    constructor(condition, message, update, flags) {
        this.condition = condition;
        this.message = message;
        this.update = update;
        this.flags = flags;
    }
    clone() {
        return LocalDialog.parse(this.bytes(false))[0];
    }
    static parse(data, offset = 0) {
        const word = readBigEndian(data, offset);
        const message = MessageId.from(data, offset + 2);
        const update = data[offset + 4];
        offset += 5;
        let condition = word & 0x03ff;
        const last = !!(word & 0x8000);
        const sign = word & 0x2000;
        if (sign)
            condition = ~condition;
        const flags = word & 0x4000 ? DIALOG_FLAGS.read(data, offset) : [];
        return [new LocalDialog(condition, message, update, flags), last];
    }
    static of(condition, message, flags = []) {
        const [part, index, action = 0] = message;
        return new LocalDialog(condition, MessageId.of({ part, index, action }), 0, flags);
    }
    byteLength() {
        return 5 + 2 * this.flags.length;
    }
    bytes(last) {
        let flag = this.condition;
        if (flag < 0)
            flag = (~flag) | 0x2000;
        if (last)
            flag |= 0x8000;
        if (this.flags.length)
            flag |= 0x4000;
        return [flag >>> 8, flag & 0xff, ...this.message.data, this.update,
            ...DIALOG_FLAGS.bytes(this.flags)];
    }
}
const UNUSED_NPCS = new Set([
    0x31, 0x3b, 0x3c, 0x66, 0x67, 0x6a, 0x73, 0x74,
    0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d,
    0xc4,
]);
export class PortoaQueen extends Npc {
    get expectedSword() { return this.localDialog(3).condition & 0xff; }
    set expectedSword(id) { this.localDialog(3).condition = 0x200 | id; }
}
export class Dolphin extends Npc {
    constructor(parent, id) {
        super(parent, id);
        const prg = parent.rom.prg;
        const spawnTableBase = DOLPHIN_SPAWN_TABLE_POINTER.readAddress(prg).offset;
        const read = (i) => {
            const entrance = Entrance.from(prg, spawnTableBase + 5 * i);
            const movement = prg[spawnTableBase + 5 * i + 4];
            return { entrance, movement };
        };
        this.spawnScripts = seq(9, read);
        this.channelSpawn = mustBeInt(DOLPHIN_CHANNEL_SPAWN.read(prg) / 5);
        this.evilSpiritIslandSpawn =
            mustBeInt(DOLPHIN_EVIL_SPIRIT_ISLAND_SPAWN.read(prg) / 5);
    }
    assemble(a) {
        super.assemble(a);
        a.segment('fe');
        a.org(0xd6a8);
        a.free(45);
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
            }
            else {
                a.byte(0xff, 0x0f, 0xff, 0x0f, 0x0f);
            }
        }
        DOLPHIN_CHANNEL_SPAWN.loc(a, 'DolphinChannelSpawn');
        a.byte(this.channelSpawn * 5);
        DOLPHIN_EVIL_SPIRIT_ISLAND_SPAWN.loc(a, 'DolphinEvilSpiritIslandSpawn');
        a.byte(this.evilSpiritIslandSpawn * 5);
        DOLPHIN_SPAWN_TABLE_POINTER.loc(a, 'DolphinSpawnTablePtr');
        a.word(table);
        for (let i = 0; i < 4; i++) {
            DOLPHIN_SPAWN_TABLE_POINTER_1.plus(5 * i)
                .loc(a, `DolphinSpawnTablePlus${i + 1}Ptr`);
            a.word({ op: '+', args: [table, { op: 'num', num: i + 1 }] });
        }
    }
}
export var MovementScript;
(function (MovementScript) {
    MovementScript.UP = 0;
    MovementScript.RIGHT = 2;
    MovementScript.DOWN = 4;
    MovementScript.LEFT = 6;
    MovementScript.DOLPHIN = 0xff;
    MovementScript.DESPAWN = 0xfe;
})(MovementScript || (MovementScript = {}));
const DOLPHIN_CHANNEL_SPAWN = Address.of($fe, 0xd664);
const DOLPHIN_EVIL_SPIRIT_ISLAND_SPAWN = Address.of($fe, 0xd66c);
const DOLPHIN_SPAWN_TABLE_POINTER = Address.of($fe, 0xd67a);
const DOLPHIN_SPAWN_TABLE_POINTER_1 = Address.of($fe, 0xd68e);
const MOVEMENT_SCRIPT_TABLE_POINTER = Address.of($1b, 0xae53);
function mustBeInt(x) {
    if (x !== Math.floor(x))
        throw new Error(`Expected integer: ${x}`);
    return x;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3JvbS9ucGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDaEQsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBRTdDLE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6QyxPQUFPLEVBQUMsWUFBWSxFQUFFLHFCQUFxQixFQUNuQyxPQUFPLEVBQVEsT0FBTyxFQUM1QixHQUFHLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRzdFLE1BQU0sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDO0FBSTFDLE1BQU0sT0FBTyxJQUFLLFNBQVEsV0FBZ0I7SUF3R3hDLFlBQXFCLEdBQVE7UUFDM0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRE8sUUFBRyxHQUFILEdBQUcsQ0FBSztRQXRHN0IsZUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVqQyxjQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhDLHNCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV4QyxlQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLGtCQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BDLDBCQUFxQixHQUFHLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJ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dCB7QXNzZW1ibGVyfSBmcm9tICcuLi9hc20vYXNzZW1ibGVyLmpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcbmltcG9ydCB7RW50aXR5LCBFbnRpdHlBcnJheX0gZnJvbSAnLi9lbnRpdHkuanMnO1xuaW1wb3J0IHtFbnRyYW5jZX0gZnJvbSAnLi9sb2NhdGlvbnRhYmxlcy5qcyc7XG5pbXBvcnQge0xvY2F0aW9ufSBmcm9tICcuL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TWVzc2FnZUlkfSBmcm9tICcuL21lc3NhZ2VpZC5qcyc7XG5pbXBvcnQge0RJQUxPR19GTEFHUywgU1BBV05fQ09ORElUSU9OX0ZMQUdTLFxuICAgICAgICBBZGRyZXNzLCBEYXRhLCBTZWdtZW50LFxuICBoZXgsIHJlYWRCaWdFbmRpYW4sIHNlcSwgdHVwbGUsIHVwcGVyQ2FtZWxUb1NwYWNlcywgZnJlZX0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuXG5jb25zdCB7JDA0LCAkMDUsICQwZSwgJDFiLCAkZmV9ID0gU2VnbWVudDtcblxudHlwZSBGbGFnTGlzdCA9IG51bWJlcltdO1xuXG5leHBvcnQgY2xhc3MgTnBjcyBleHRlbmRzIEVudGl0eUFycmF5PE5wYz4ge1xuICAvLyBnZW5lcmljIDAwLi4wYVxuICBHb2FTb2xkaWVyID0gbmV3IE5wYyh0aGlzLCAweDBiKTtcbiAgLy8gZ2VuZXJpYyAwY1xuICBMZWFmRWxkZXIgPSBuZXcgTnBjKHRoaXMsIDB4MGQpO1xuICAvLyBnZW5lcmljIGxlYWYgMGUuLjEwXG4gIExlYWZFbGRlckRhdWdodGVyID0gbmV3IE5wYyh0aGlzLCAweDExKTtcbiAgLy8gZ2VuZXJpYyBsZWFmIDEyXG4gIExlYWZSYWJiaXQgPSBuZXcgTnBjKHRoaXMsIDB4MTMpO1xuICBXaW5kbWlsbEd1YXJkID0gbmV3IE5wYyh0aGlzLCAweDE0KTtcbiAgU2xlZXBpbmdXaW5kbWlsbEd1YXJkID0gbmV3IE5wYyh0aGlzLCAweDE1KTtcbiAgQWthaGFuYSA9IG5ldyBOcGModGhpcywgMHgxNik7XG4gIC8vIGdlbmVyaWMgYnJ5bm1hZXIgMTcuLjFjXG4gIE9ha0VsZGVyID0gbmV3IE5wYyh0aGlzLCAweDFkKTtcbiAgT2FrTW90aGVyID0gbmV3IE5wYyh0aGlzLCAweDFlKTtcbiAgT2FrQ2hpbGQgPSBuZXcgTnBjKHRoaXMsIDB4MWYpO1xuICAvLyBnZW5lcmljIG9hayAyMC4uMjJcbiAgQXJ5bGxpcyA9IG5ldyBOcGModGhpcywgMHgyMyk7XG4gIC8vIGdlbmVyaWMgYW1hem9uZXMgMjRcbiAgQW1hem9uZXNHdWFyZCA9IG5ldyBOcGModGhpcywgMHgyNSk7XG4gIEFyeWxsaXNSaWdodEF0dGVuZGFudCA9IG5ldyBOcGModGhpcywgMHgyNik7XG4gIEFyeWxsaXNMZWZ0QXR0ZW5kYW50ID0gbmV3IE5wYyh0aGlzLCAweDI3KTtcbiAgTmFkYXJlID0gbmV3IE5wYyh0aGlzLCAweDI4KTtcbiAgLy8gZ2VuZXJpYyBuYWRhcmUgMjkuLjJjXG4gIFNvbGRpZXJHdWFyZCA9IG5ldyBOcGModGhpcywgMHgyZCk7IC8vIHN3YW4sIG10IHNhYnJlXG4gIC8vIHNob3BrZWVwZXIgcHJpc29uZXJzIDJlLi4zMFxuICAvLyB1bnVzZWQgMzFcbiAgLy8gZ2VuZXJpYyBwb3J0b2EgcGFsYWNlIDMyXG4gIFBvcnRvYVRocm9uZVJvb21CYWNrRG9vckd1YXJkID0gbmV3IE5wYyh0aGlzLCAweDMzKTtcbiAgUG9ydG9hUGFsYWNlRnJvbnRHdWFyZCA9IG5ldyBOcGModGhpcywgMHgzNCk7XG4gIC8vIGdlbmVyaWMgcG9ydG9hIHBhbGFjZSAzNS4uMzdcbiAgUG9ydG9hUXVlZW4gPSBuZXcgUG9ydG9hUXVlZW4odGhpcywgMHgzOCk7XG4gIEZvcnR1bmVUZWxsZXIgPSBuZXcgTnBjKHRoaXMsIDB4MzkpO1xuICBXYXRlcmZhbGxDYXZlQWR2ZW50dXJlcnMgPSBuZXcgTnBjKHRoaXMsIDB4M2EpO1xuICAvLyB1bnVzZWQgM2IuLjNjXG4gIEpvZWxFbGRlciA9IG5ldyBOcGModGhpcywgMHgzZCk7XG4gIC8vIGdlbmVyaWMgam9lbCAzZS4uNDNcbiAgQ2xhcmsgPSBuZXcgTnBjKHRoaXMsIDB4NDQpO1xuICAvLyBnZW5lcmljIHpvbWJpZSB0b3duIDQ1Li40N1xuICAvLyBnZW5lcmljIHN3YW4gNDkuLjRkXG4gIFNoeXJvbkd1YXJkID0gbmV3IE5wYyh0aGlzLCAweDRlKTtcbiAgLy8gZ2VuZXJpYyBzaHlyb24gNGYuLjUzXG4gIEJyb2thaGFuYSA9IG5ldyBOcGModGhpcywgMHg1NCk7XG4gIC8vIGdlbmVyaWMgZ29hIDU1Li41OFxuICBTYWhhcmFCdW5ueSA9IG5ldyBOcGModGhpcywgMHg1OSk7XG4gIERlbyA9IG5ldyBOcGModGhpcywgMHg1YSk7XG4gIFNhaGFyYUVsZGVyID0gbmV3IE5wYyh0aGlzLCAweDViKTtcbiAgU2FoYXJhRWxkZXJEYXVnaHRlciA9IG5ldyBOcGModGhpcywgMHg1Yyk7XG4gIC8vIGdlbmVyaWMgNWRcbiAgWmVidSA9IG5ldyBOcGModGhpcywgMHg1ZSk7XG4gIFRvcm5lbCA9IG5ldyBOcGModGhpcywgMHg1Zik7XG4gIFN0b20gPSBuZXcgTnBjKHRoaXMsIDB4NjApO1xuICBNZXNpYVJlY29yZGluZyA9IG5ldyBOcGModGhpcywgMHg2MSk7XG4gIEFzaW5hID0gbmV3IE5wYyh0aGlzLCAweDYyKTtcbiAgSHVydERvbHBoaW4gPSBuZXcgTnBjKHRoaXMsIDB4NjMpO1xuICBGaXNoZXJtYW4gPSBuZXcgTnBjKHRoaXMsIDB4NjQpO1xuICBTdGFydGxlZFZpbGxhZ2VyT3V0c2lkZUNhdmUgPSBuZXcgTnBjKHRoaXMsIDB4NjUpO1xuICAvLyBnZW5lcmljL3Vuc2VkIDY2Li42N1xuICBLZW5zdUluQ2FiaW4gPSBuZXcgTnBjKHRoaXMsIDB4NjgpO1xuICBEb2xwaGluID0gbmV3IERvbHBoaW4odGhpcywgMHg2OSk7XG4gIC8vIHVudXNlZCA2YVxuICBTbGVlcGluZ0tlbnN1ID0gbmV3IE5wYyh0aGlzLCAweDZiKTtcbiAgS2Vuc3VEaXNndWlzZWRBc0RhbmNlciA9IG5ldyBOcGModGhpcywgMHg2Yyk7XG4gIEtlbnN1RGlzZ3Vpc2VkQXNTb2xkaWVyID0gbmV3IE5wYyh0aGlzLCAweDZkKTtcbiAgQXp0ZWNhSW5TaHlyb24gPSBuZXcgTnBjKHRoaXMsIDB4NmUpO1xuICAvLyBnZW5lcmljIDZmXG4gIERlYWRBa2FoYW5hID0gbmV3IE5wYyh0aGlzLCAweDcwKTtcbiAgRGVhZFN0b21zR2lybGZyaWVuZCA9IG5ldyBOcGModGhpcywgMHg3MSk7XG4gIERlYWRTdG9tID0gbmV3IE5wYyh0aGlzLCAweDcyKTtcbiAgLy8gdW51c2VkIDczXG4gIEtlbnN1SW5Td2FuID0gbmV3IE5wYyh0aGlzLCAweDc0KTsgLy8gbm90ZTogdW51c2VkIGluIHZhbmlsbGEgKDdlKVxuICBTbGltZWRLZW5zdSA9IG5ldyBOcGModGhpcywgMHg3NSk7XG4gIC8vIGdlbmVyaWMgNzYuLjdhXG4gIEZpc2hlcm1hbkRhdWdodGVyID0gbmV3IE5wYyh0aGlzLCAweDdiKTtcbiAgLy8gZ2VuZXJpYyA3Yy4uN2RcbiAgS2Vuc3UgPSBuZXcgTnBjKHRoaXMsIDB4N2UpO1xuICAvLyBnZW5lcmljL3VudXNlZCA3Zi4uODJcbiAgQWthaGFuYUluQnJ5bm1hZXIgPSBuZXcgTnBjKHRoaXMsIDB4ODIpOyAvLyBub3RlOiB1bnVzZWQgaW4gdmFuaWxsYSAoMTYpXG4gIEF6dGVjYUluUHlyYW1pZCA9IG5ldyBOcGModGhpcywgMHg4Myk7XG4gIFNhYmVyYURpc2d1aXNlZEFzTWVzaWEgPSBuZXcgTnBjKHRoaXMsIDB4ODQpO1xuICBTdG9uZWRXYXRlcmZhbGxDYXZlQWR2ZW50dXJlcnMgPSBuZXcgTnBjKHRoaXMsIDB4ODUpO1xuICAvLyB1bnVzZWQgODYuLjg3XG4gIFN0b25lZEFrYWhhbmEgPSBuZXcgTnBjKHRoaXMsIDB4ODgpO1xuICAvLyB1bnVzZWQgODkuLjhkXG4gIE1lc2lhID0gbmV3IE5wYyh0aGlzLCAweDhlKTtcblxuICAvLyB1bnVzYWJsZSA4Zi4uYmYgKHdlJ3ZlIGNvLW9wdGVkIHRoYXQgUFJHIHNwYWNlIGZvciBub3cpXG5cbiAgVmFtcGlyZTEgPSBuZXcgTnBjKHRoaXMsIDB4YzApO1xuICBJbnNlY3QgPSBuZXcgTnBjKHRoaXMsIDB4YzEpO1xuICBLZWxiZXNxdWUxID0gbmV3IE5wYyh0aGlzLCAweGMyKTtcbiAgUmFnZSA9IG5ldyBOcGModGhpcywgMHhjMyk7XG4gIC8vIHVudXNlZCAtIE1hZG8xID0gbmV3IE5wYyh0aGlzLCAweGM0KTtcbiAgS2VsYmVzcXVlMiA9IG5ldyBOcGModGhpcywgMHhjNSk7XG4gIFNhYmVyYTIgPSBuZXcgTnBjKHRoaXMsIDB4YzYpO1xuICBNYWRvMiA9IG5ldyBOcGModGhpcywgMHhjNyk7XG4gIEthcm1pbmUgPSBuZXcgTnBjKHRoaXMsIDB4YzgpO1xuICBTdGF0dWVPZk1vb24gPSBuZXcgTnBjKHRoaXMsIDB4YzkpO1xuICBTdGF0dWVPZlN1biA9IG5ldyBOcGModGhpcywgMHhjYSk7XG4gIERyYXlnb24gPSBuZXcgTnBjKHRoaXMsIDB4Y2IpO1xuICBWYW1waXJlMiA9IG5ldyBOcGModGhpcywgMHhjYyk7XG5cbiAgbW92ZW1lbnRTY3JpcHRzOiBNb3ZlbWVudFNjcmlwdFtdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgc3VwZXIoMHhjZCk7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gdGhpcykge1xuICAgICAgY29uc3QgbnBjID0gdGhpc1trZXldO1xuICAgICAgaWYgKCF0aGlzLmhhc093blByb3BlcnR5KGtleSkgfHwgIShucGMgaW5zdGFuY2VvZiBOcGMpKSBjb250aW51ZTtcbiAgICAgIHRoaXNbbnBjLmlkXSA9IG5wYztcbiAgICAgIG5wYy5uYW1lID0gdXBwZXJDYW1lbFRvU3BhY2VzKGtleSk7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHhjZDsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXNbaV0pIHtcbiAgICAgICAgdGhpc1tpXSA9IG5ldyBOcGModGhpcywgaSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlYWQgYWxsIHRoZSBtb3ZlbWVudCBzY3JpcHRzXG4gICAgY29uc3QgbW92ZW1lbnRCYXNlID0gTU9WRU1FTlRfU0NSSVBUX1RBQkxFX1BPSU5URVIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG4gICAgdGhpcy5tb3ZlbWVudFNjcmlwdHMgPSBzZXEoMTYsIGkgPT4ge1xuICAgICAgbGV0IGFkZHIgPSBtb3ZlbWVudEJhc2UucGx1cygyICogaSkucmVhZEFkZHJlc3Mocm9tLnByZykub2Zmc2V0O1xuICAgICAgY29uc3Qgc3RlcHM6IG51bWJlcltdID0gW107XG4gICAgICB3aGlsZSAocm9tLnByZ1thZGRyXSA8IDB4ODApIHtcbiAgICAgICAgc3RlcHMucHVzaChyb20ucHJnW2FkZHIrK10pO1xuICAgICAgfVxuICAgICAgY29uc3QgdGVybWluYXRlID0gcm9tLnByZ1thZGRyXTtcbiAgICAgIHJldHVybiB7c3RlcHMsIHRlcm1pbmF0ZX07XG4gICAgfSk7XG4gIH1cblxuICB3cml0ZSgpOiBNb2R1bGVbXSB7XG4gICAgLy8gV3JpdGUgYWxsIHRoZSBOUENzXG4gICAgY29uc3QgYSA9IHRoaXMucm9tLmFzc2VtYmxlcigpO1xuICAgIGZvciAoY29uc3QgbnBjIG9mIHRoaXMpIHtcbiAgICAgIGlmICghbnBjIHx8ICFucGMudXNlZCkgY29udGludWU7XG4gICAgICBucGMuYXNzZW1ibGUoYSk7XG4gICAgfVxuICAgIC8vIEZyZWUgdGhlIHNwYWNlIGZyb20gdGhlIG9yaWdpbmFsIG1vdmVtZW50IHNjcmlwdHNcbiAgICBmcmVlKGEsICQxYiwgMHhhZjA0LCAweGFmYTkpO1xuICAgIC8vIFdyaXRlIHRoZSBtb3ZlbWVudCBzY3JpcHRzXG4gICAgY29uc3QgcG9pbnRlclRhYmxlID0gW107XG4gICAgYS5zZWdtZW50KCcxYicsICdmZScsICdmZicpO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IG1vdmVtZW50IG9mIHRoaXMubW92ZW1lbnRTY3JpcHRzKSB7XG4gICAgICBjb25zdCBhZGRyID0gKGEucmVsb2MoYE1vdmVtZW50U2NyaXB0XyR7aGV4KGkrKyl9YCksIGEucGMoKSk7XG4gICAgICBhLmJ5dGUoLi4ubW92ZW1lbnQuc3RlcHMsIG1vdmVtZW50LnRlcm1pbmF0ZSk7XG4gICAgICBwb2ludGVyVGFibGUucHVzaChhZGRyKTtcbiAgICB9XG4gICAgY29uc3QgcG9pbnRlclRhYmxlQWRkciA9IChhLnJlbG9jKCdNb3ZlbWVudFNjcmlwdFRhYmxlJyksIGEucGMoKSk7XG4gICAgYS53b3JkKC4uLnBvaW50ZXJUYWJsZSk7XG4gICAgTU9WRU1FTlRfU0NSSVBUX1RBQkxFX1BPSU5URVIubG9jKGEsICdNb3ZlbWVudFNjcmlwdFRhYmxlUHRyJyk7XG4gICAgYS53b3JkKHBvaW50ZXJUYWJsZUFkZHIpO1xuICAgIE1PVkVNRU5UX1NDUklQVF9UQUJMRV9QT0lOVEVSLnBsdXMoNSkubG9jKGEsICdNb3ZlbWVudFNjcmlwdFRhYmxlUGx1czFQdHInKTtcbiAgICBhLndvcmQoe29wOiAnKycsIGFyZ3M6IFtwb2ludGVyVGFibGVBZGRyLCB7b3A6ICdudW0nLCBudW06IDF9XX0pO1xuICAgIC8vIFJldHVybiB0aGUgcmVzdWx0XG4gICAgcmV0dXJuIFthLm1vZHVsZSgpXTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTnBjIGV4dGVuZHMgRW50aXR5IHtcblxuICBwcml2YXRlIF91c2VkOiBib29sZWFuO1xuICBuYW1lPzogc3RyaW5nO1xuICBpdGVtTmFtZXM/OiBbc3RyaW5nLCBzdHJpbmddO1xuXG4gIGRhdGE6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdOyAvLyB1aW50OFxuICAvLyBGbGFncyB0byBjaGVjayBwZXIgbG9jYXRpb246IHBvc2l0aXZlIG1lYW5zIFwibXVzdCBiZSBzZXRcIlxuICBzcGF3bkNvbmRpdGlvbnMgPSBuZXcgTWFwPG51bWJlciwgRmxhZ0xpc3Q+KCk7IC8vIGtleSB1aW50OFxuXG4gIGdsb2JhbERpYWxvZ3M6IEdsb2JhbERpYWxvZ1tdO1xuICBsb2NhbERpYWxvZ3MgPSBuZXcgTWFwPG51bWJlciwgTG9jYWxEaWFsb2dbXT4oKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBucGNzOiBOcGNzLCBpZDogbnVtYmVyKSB7XG4gICAgc3VwZXIobnBjcy5yb20sIGlkKTtcbiAgICBjb25zdCByb20gPSBucGNzLnJvbTtcbiAgICBpZiAoaWQgPiAweGNjKSB0aHJvdyBuZXcgRXJyb3IoYFVuYXZhaWxhYmxlOiAke2lkfWApO1xuICAgIC8vIFRPRE8gLSBjaGVjayAodGhpcy5iYXNlIDw9IDB4MWM3ODEpIGZvciB1bnVzZWQ/XG4gICAgdGhpcy5fdXNlZCA9ICFVTlVTRURfTlBDUy5oYXMoaWQpICYmIChpZCA8IDB4OGYgfHwgaWQgPj0gMHhjMCk7XG4gICAgbGV0IGRpYWxvZ0Jhc2UgPSBpZCA8IDB4YzQgPyB0aGlzLmRpYWxvZ1BvaW50ZXIucmVhZEFkZHJlc3Mocm9tLnByZykgOiBudWxsO1xuICAgIGlmIChkaWFsb2dCYXNlICYmIGRpYWxvZ0Jhc2Uub3JnID09PSAweDhiMzkpIGRpYWxvZ0Jhc2UgPSBudWxsO1xuXG4gICAgdGhpcy5kYXRhID0gdHVwbGUocm9tLnByZywgdGhpcy5kYXRhQmFzZS5vZmZzZXQsIDQpO1xuXG4gICAgY29uc3Qgc3Bhd25CYXNlID0gdGhpcy5zcGF3blBvaW50ZXIucmVhZEFkZHJlc3Mocm9tLnByZyk7XG5cbiAgICAvLyBQb3B1bGF0ZSBzcGF3biBjb25kaXRpb25zXG4gICAgbGV0IGkgPSBzcGF3bkJhc2Uub2Zmc2V0O1xuICAgIGxldCBsb2M7XG4gICAgd2hpbGUgKHRoaXMudXNlZCAmJiAobG9jID0gcm9tLnByZ1tpKytdKSAhPT0gMHhmZikge1xuICAgICAgY29uc3QgZmxhZ3MgPSBTUEFXTl9DT05ESVRJT05fRkxBR1MucmVhZChyb20ucHJnLCBpKTtcbiAgICAgIGkgKz0gMiAqIGZsYWdzLmxlbmd0aDtcbiAgICAgIHRoaXMuc3Bhd25Db25kaXRpb25zLnNldChsb2MsIGZsYWdzKTtcbiAgICB9XG5cbiAgICAvLyBQb3B1bGF0ZSB0aGUgZGlhbG9nIHRhYmxlXG4gICAgdGhpcy5nbG9iYWxEaWFsb2dzID0gW107XG4gICAgaWYgKGRpYWxvZ0Jhc2UpIHtcbiAgICAgIGxldCBhID0gZGlhbG9nQmFzZS5vZmZzZXQ7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBjb25zdCBbZGlhbG9nLCBsYXN0XSA9IEdsb2JhbERpYWxvZy5wYXJzZShyb20ucHJnLCBhKTtcbiAgICAgICAgYSArPSA0O1xuICAgICAgICBpZiAoZGlhbG9nLmNvbmRpdGlvbikgdGhpcy5nbG9iYWxEaWFsb2dzLnB1c2goZGlhbG9nKTtcbiAgICAgICAgaWYgKGxhc3QpIGJyZWFrO1xuICAgICAgfVxuICAgICAgLy8gUmVhZCB0aGUgbG9jYXRpb24gdGFibGVcbiAgICAgIGNvbnN0IGxvY2F0aW9uczogW251bWJlciwgbnVtYmVyXVtdID0gW107XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHJvbS5wcmdbYSsrXTtcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSAweGZmKSBicmVhaztcbiAgICAgICAgbG9jYXRpb25zLnB1c2goW2xvY2F0aW9uLCByb20ucHJnW2ErK11dKTtcbiAgICAgIH1cbiAgICAgIGlmICghbG9jYXRpb25zLmxlbmd0aCkgbG9jYXRpb25zLnB1c2goWy0xLCAwXSk7XG4gICAgICAvLyBOb3cgYnVpbGQgdXAgdGhlIExvY2FsRGlhbG9nIHRhYmxlc1xuICAgICAgY29uc3QgYmFzZSA9IGE7XG4gICAgICBmb3IgKGNvbnN0IFtsb2NhdGlvbiwgb2Zmc2V0XSBvZiBsb2NhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgZGlhbG9nczogTG9jYWxEaWFsb2dbXSA9IFtdO1xuICAgICAgICB0aGlzLmxvY2FsRGlhbG9ncy5zZXQobG9jYXRpb24sIGRpYWxvZ3MpO1xuICAgICAgICBhID0gYmFzZSArIG9mZnNldDtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICBjb25zdCBbZGlhbG9nLCBsYXN0XSA9IExvY2FsRGlhbG9nLnBhcnNlKHJvbS5wcmcsIGEpO1xuICAgICAgICAgIGEgKz0gZGlhbG9nLmJ5dGVMZW5ndGgoKTtcbiAgICAgICAgICBkaWFsb2dzLnB1c2goZGlhbG9nKTtcbiAgICAgICAgICBpZiAobGFzdCkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBmb3IgKGNvbnN0IGkgaW4gTkFNRVMpIHtcbiAgICAvLyAgIGlmICghTkFNRVMuaGFzT3duUHJvcGVydHkoaSkpIGNvbnRpbnVlO1xuICAgIC8vICAgY29uc3QgbmFtZSA9IChOQU1FUyBhcyB7fSBhcyB7W2tleTogc3RyaW5nXTogW251bWJlciwgc3RyaW5nLCBzdHJpbmc/LCBzdHJpbmc/XX0pW2ldO1xuICAgIC8vICAgaWYgKG5hbWVbMF0gPT09IGlkKSB7XG4gICAgLy8gICAgIHRoaXMubmFtZSA9IG5hbWVbMV07XG4gICAgLy8gICAgIGlmIChuYW1lLmxlbmd0aCA+IDIpIHtcbiAgICAvLyAgICAgICB0aGlzLml0ZW1OYW1lcyA9IG5hbWUuc2xpY2UoMiwgNCkgYXMgW3N0cmluZywgc3RyaW5nXTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKGBOUEMgU3Bhd24gJCR7dGhpcy5pZC50b1N0cmluZygxNil9IGZyb20gJHt0aGlzLmJhc2UudG9TdHJpbmcoMTYpfTogYnl0ZXM6ICQke1xuICAgIC8vICAgICAgICAgICAgICB0aGlzLmJ5dGVzKCkubWFwKHg9PngudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsMCkpLmpvaW4oJyAnKX1gKTtcbiAgfVxuXG4gIGdldCBkYXRhQmFzZSgpOiBBZGRyZXNzIHtcbiAgICBjb25zdCBzZWcgPSB0aGlzLmlkICYgMHg4MCA/ICQwNSA6ICQwNDtcbiAgICBjb25zdCBvcmcgPSAweDgwZjAgfCAoKHRoaXMuaWQgJiAweGZjKSA8PCA2KSB8ICgodGhpcy5pZCAmIDMpIDw8IDIpO1xuICAgIHJldHVybiBBZGRyZXNzLm9mKHNlZywgb3JnKTtcbiAgfVxuXG4gIGdldCBzcGF3blBvaW50ZXIoKTogQWRkcmVzcyB7XG4gICAgcmV0dXJuIEFkZHJlc3Mub2YoJDBlLCAweDg1ZTAgKyAodGhpcy5pZCA8PCAxKSk7XG4gIH1cblxuICBnZXQgZGlhbG9nUG9pbnRlcigpOiBBZGRyZXNzIHtcbiAgICByZXR1cm4gQWRkcmVzcy5vZigkMGUsIDB4ODk1ZCArICh0aGlzLmlkIDw8IDEpKTtcbiAgfVxuXG4gIGdldCB1c2VkKCkgeyByZXR1cm4gdGhpcy5fdXNlZDsgfVxuICBzZXQgdXNlZCh1c2VkOiBib29sZWFuKSB7XG4gICAgLy8gcXVpY2sgY2hlY2s6IHdlIGNhbid0IHVzZSBzb21lIGluZGV4ZXMgYmVjYXVzZSBkYXRhIHRhYmxlcyBjby1vcHRlZC5cbiAgICAvLyAxY2E2Zi4uMWNhNzksIDFjYTdiLi4xY2FlMyAoYzAuLmMyIGFyZSB1c2VkIGJ1dCBoYXZlIG5vIGRpYWxvZy4uLilcbiAgICAvLyAxYzZmMi4uMWM2ZmMsIDFjNmZlLi4xYzc2MFxuICAgIGlmICh1c2VkICYmICh0aGlzLmlkID4gMHg4OCAmJiB0aGlzLmlkIDwgMHhjMCAmJiB0aGlzLmlkICE9PSAweDhlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkOiAke3RoaXMuaWR9YCk7XG4gICAgfVxuICAgIHRoaXMuX3VzZWQgPSB1c2VkO1xuICB9XG5cbiAgc3Bhd25Db25kaXRpb25zQnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IGJ5dGVzID0gW107XG4gICAgZm9yIChjb25zdCBbbG9jLCBmbGFnc10gb2YgdGhpcy5zcGF3bkNvbmRpdGlvbnMpIHtcbiAgICAgIGJ5dGVzLnB1c2gobG9jLCAuLi5TUEFXTl9DT05ESVRJT05fRkxBR1MuYnl0ZXMoZmxhZ3MpKTtcbiAgICB9XG4gICAgYnl0ZXMucHVzaCgweGZmKTtcbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBkaWFsb2cobG9jYXRpb24/OiBMb2NhdGlvbik6IExvY2FsRGlhbG9nW10ge1xuICAgIGNvbnN0IGlkID0gbG9jYXRpb24gPyBsb2NhdGlvbi5pZCA6IC0xO1xuICAgIGNvbnN0IGRpYWxvZ3MgPSB0aGlzLmxvY2FsRGlhbG9ncy5nZXQoaWQpO1xuICAgIGlmIChkaWFsb2dzKSByZXR1cm4gZGlhbG9ncztcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGxvY2FsIGRpYWxvZyBmb3IgTlBDICR7aGV4KHRoaXMuaWQpfSBhdCAke2hleChpZCl9YCk7XG4gIH1cblxuICBzcGF3bnMobG9jYXRpb246IExvY2F0aW9uKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IGlkID0gbG9jYXRpb24uaWQ7XG4gICAgY29uc3QgY29uZGl0aW9ucyA9IHRoaXMuc3Bhd25Db25kaXRpb25zLmdldChsb2NhdGlvbi5pZCk7XG4gICAgaWYgKGNvbmRpdGlvbnMpIHJldHVybiBjb25kaXRpb25zO1xuICAgIHRocm93IG5ldyBFcnJvcihgTm8gc3Bhd24gY29uZGl0aW9uIGZvciBOUEMgJHtoZXgodGhpcy5pZCl9IGF0ICR7aGV4KGlkKX1gKTtcbiAgfVxuXG4gIGhhc0RpYWxvZygpOiBib29sZWFuIHtcbiAgICBjb25zdCByZXN1bHQgPSBCb29sZWFuKHRoaXMuZ2xvYmFsRGlhbG9ncy5sZW5ndGggfHwgdGhpcy5sb2NhbERpYWxvZ3Muc2l6ZSk7XG4gICAgaWYgKHRoaXMuaWQgPiAweDhlICYmIHRoaXMuaWQgIT09IDB4YzMgJiYgcmVzdWx0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQ6ICR7dGhpcy5pZH1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gICogYWxsRGlhbG9ncygpOiBJdGVyYWJsZTxMb2NhbERpYWxvZyB8IEdsb2JhbERpYWxvZz4ge1xuICAgIHlpZWxkICogdGhpcy5nbG9iYWxEaWFsb2dzO1xuICAgIGZvciAoY29uc3QgZHMgb2YgdGhpcy5sb2NhbERpYWxvZ3MudmFsdWVzKCkpIHtcbiAgICAgIHlpZWxkICogZHM7XG4gICAgfVxuICB9XG5cbiAgZGlhbG9nQnl0ZXMoKTogbnVtYmVyW10ge1xuICAgIGlmICghdGhpcy5oYXNEaWFsb2coKSkgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGJ5dGVzOiBudW1iZXJbXSA9IFtdO1xuICAgIGZ1bmN0aW9uIHNlcmlhbGl6ZShkczogR2xvYmFsRGlhbG9nW10gfCBMb2NhbERpYWxvZ1tdKTogbnVtYmVyW10ge1xuICAgICAgY29uc3Qgb3V0OiBudW1iZXJbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXQucHVzaCguLi5kc1tpXS5ieXRlcyhpID09PSBkcy5sZW5ndGggLSAxKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBpZiAodGhpcy5nbG9iYWxEaWFsb2dzLmxlbmd0aCkge1xuICAgICAgYnl0ZXMucHVzaCguLi5zZXJpYWxpemUodGhpcy5nbG9iYWxEaWFsb2dzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ5dGVzLnB1c2goMHg4MCwgMCwgMCwgMCk7IC8vIFwiZW1wdHlcIlxuICAgIH1cbiAgICBjb25zdCBsb2NhbHM6IG51bWJlcltdID0gW107XG4gICAgY29uc3QgY2FjaGUgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpOyAvLyBhbGxvdyByZXVzaW5nIGxvY2F0aW9uc1xuICAgIGZvciAoY29uc3QgW2xvY2F0aW9uLCBkaWFsb2dzXSBvZiB0aGlzLmxvY2FsRGlhbG9ncykge1xuICAgICAgY29uc3QgbG9jYWxCeXRlcyA9IHNlcmlhbGl6ZShkaWFsb2dzKTtcbiAgICAgIGNvbnN0IGxhYmVsID0gbG9jYWxCeXRlcy5qb2luKCcsJyk7XG4gICAgICBjb25zdCBjYWNoZWQgPSBjYWNoZS5nZXQobGFiZWwpO1xuICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKSB7XG4gICAgICAgIGJ5dGVzLnB1c2gobG9jYXRpb24sIGNhY2hlZCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGBTQVZFRCAke2xvY2FsQnl0ZXMubGVuZ3RofSBieXRlc2ApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNhY2hlLnNldChsYWJlbCwgbG9jYWxzLmxlbmd0aCk7XG4gICAgICBpZiAobG9jYXRpb24gIT09IC0xKSBieXRlcy5wdXNoKGxvY2F0aW9uLCBsb2NhbHMubGVuZ3RoKTtcbiAgICAgIGxvY2Fscy5wdXNoKC4uLmxvY2FsQnl0ZXMpO1xuICAgIH1cbiAgICBpZiAobG9jYWxzLmxlbmd0aCkgYnl0ZXMucHVzaCgweGZmLCAuLi5sb2NhbHMpO1xuXG4gICAgLy8gY29uc29sZS5sb2coYE5QQyAke3RoaXMuaWQudG9TdHJpbmcoMTYpfTogYnl0ZXMgbGVuZ3RoICR7Ynl0ZXMubGVuZ3RofWApO1xuXG4gICAgcmV0dXJuIGJ5dGVzO1xuICB9XG5cbiAgLy8gTWFrZXMgYSBcImhhcmRsaW5rXCIgYmV0d2VlbiB0d28gTlBDcywgZm9yIHNwYXduIGNvbmRpdGlvbnMgYW5kIGRpYWxvZy5cbiAgbGluayhpZDogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5ucGNzW2lkXTtcbiAgICB0aGlzLnNwYXduQ29uZGl0aW9ucyA9IG90aGVyLnNwYXduQ29uZGl0aW9ucztcbiAgICB0aGlzLmxpbmtEaWFsb2coaWQpO1xuICB9XG5cbiAgbGlua0RpYWxvZyhpZDogbnVtYmVyKTogdm9pZCB7XG4gICAgY29uc3Qgb3RoZXIgPSB0aGlzLnJvbS5ucGNzW2lkXTtcbiAgICB0aGlzLmdsb2JhbERpYWxvZ3MgPSBvdGhlci5nbG9iYWxEaWFsb2dzO1xuICAgIHRoaXMubG9jYWxEaWFsb2dzID0gb3RoZXIubG9jYWxEaWFsb2dzO1xuICB9XG5cbiAgbG9jYWxEaWFsb2coaW5kZXg6IG51bWJlcik6IExvY2FsRGlhbG9nO1xuICBsb2NhbERpYWxvZyhsb2NhdGlvbjogbnVtYmVyLCBpbmRleD86IG51bWJlcik6IExvY2FsRGlhbG9nIHtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgaW5kZXggPSBsb2NhdGlvbjtcbiAgICAgIGxvY2F0aW9uID0gLTE7XG4gICAgfVxuICAgIGNvbnN0IGRpYWxvZ3MgPSB0aGlzLmxvY2FsRGlhbG9ncy5nZXQobG9jYXRpb24pO1xuICAgIGlmIChkaWFsb2dzID09IG51bGwgfHwgaW5kZXggPj0gZGlhbG9ncy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gbG9jYWwgZGlhbG9nICR7aW5kZXh9IGZvciBsb2NhdGlvbiAke2hleChsb2NhdGlvbil9YCk7XG4gICAgfVxuICAgIHJldHVybiBkaWFsb2dzW2luZGV4XTtcbiAgfVxuXG4gIGlzUGFyYWx5emFibGUoKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgaSA9IDB4MzUwNTg7IGkgPCAweDM1MDZjOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLnJvbS5wcmdbaV0gPT09IHRoaXMuaWQpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhc3NlbWJsZShhOiBBc3NlbWJsZXIpIHtcbiAgICBpZiAoIXRoaXMudXNlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGlkID0gaGV4KHRoaXMuaWQpO1xuXG4gICAgdGhpcy5kYXRhQmFzZS5sb2MoYSwgJ1BlcnNvbkRhdGFfJHtpZH0nKTtcbiAgICBhLmJ5dGUoLi4udGhpcy5kYXRhKTtcblxuICAgIGEuc2VnbWVudCgnMGUnLCAnZmUnLCAnZmYnKTtcbiAgICBhLnJlbG9jKGBTcGF3bkNvbmRpdGlvbl8ke2lkfWApO1xuICAgIGNvbnN0IHNwYXduID0gYS5wYygpO1xuICAgIGEuYnl0ZSguLi50aGlzLnNwYXduQ29uZGl0aW9uc0J5dGVzKCkpO1xuICAgIHRoaXMuc3Bhd25Qb2ludGVyLmxvYyhhLCBgU3Bhd25Db25kaXRpb25fJHtpZH1fUG9pbnRlcmApO1xuICAgIGEud29yZChzcGF3bik7XG5cbiAgICBpZiAodGhpcy5oYXNEaWFsb2coKSkge1xuICAgICAgYS5zZWdtZW50KCcwZScsICdmZScsICdmZicpO1xuICAgICAgYS5yZWxvYyhgRGlhbG9nXyR7aWR9YCk7XG4gICAgICBjb25zdCBkaWFsb2cgPSBhLnBjKCk7XG4gICAgICBhLmJ5dGUoLi4udGhpcy5kaWFsb2dCeXRlcygpKTtcbiAgICAgIHRoaXMuZGlhbG9nUG9pbnRlci5sb2MoYSwgYERpYWxvZ18ke2lkfV9Qb2ludGVyYCk7XG4gICAgICBhLndvcmQoZGlhbG9nKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEdsb2JhbERpYWxvZyB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBjb25kaXRpb246IG51bWJlciwgcHVibGljIG1lc3NhZ2U6IE1lc3NhZ2VJZCkge31cblxuICBzdGF0aWMgb2YoY29uZGl0aW9uOiBudW1iZXIsXG4gICAgICAgICAgICBtZXNzYWdlOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcj9dKTogR2xvYmFsRGlhbG9nIHtcbiAgICBjb25zdCBbcGFydCwgaW5kZXgsIGFjdGlvbiA9IDBdID0gbWVzc2FnZTtcbiAgICByZXR1cm4gbmV3IEdsb2JhbERpYWxvZyhjb25kaXRpb24sIE1lc3NhZ2VJZC5vZih7cGFydCwgaW5kZXgsIGFjdGlvbn0pKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgW2RpYWxvZywgbGFzdF0uXG4gIHN0YXRpYyBwYXJzZShkYXRhOiBEYXRhPG51bWJlcj4sIG9mZnNldDogbnVtYmVyID0gMCk6IFtHbG9iYWxEaWFsb2csIGJvb2xlYW5dIHtcbiAgICBjb25zdCBmbGFnID0gcmVhZEJpZ0VuZGlhbihkYXRhLCBvZmZzZXQpO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBNZXNzYWdlSWQuZnJvbShkYXRhLCBvZmZzZXQgKyAyKTtcblxuICAgIGxldCBjb25kaXRpb24gPSBmbGFnICYgMHgwM2ZmO1xuICAgIGNvbnN0IGxhc3QgPSAhIShmbGFnICYgMHg4MDAwKTtcbiAgICBjb25zdCBzaWduID0gZmxhZyAmIDB4MjAwMDtcbiAgICBpZiAoc2lnbikgY29uZGl0aW9uID0gfmNvbmRpdGlvbjtcblxuICAgIHJldHVybiBbbmV3IEdsb2JhbERpYWxvZyhjb25kaXRpb24sIG1lc3NhZ2UpLCBsYXN0XTtcbiAgfVxuXG4gIGJ5dGVzKGxhc3Q6IGJvb2xlYW4pOiBudW1iZXJbXSB7XG4gICAgbGV0IGZsYWcgPSB0aGlzLmNvbmRpdGlvbjtcbiAgICBpZiAoZmxhZyA8IDApIGZsYWcgPSAofmZsYWcpIHwgMHgyMDAwO1xuICAgIGlmIChsYXN0KSBmbGFnIHw9IDB4ODAwMDtcbiAgICByZXR1cm4gW2ZsYWcgPj4+IDgsIGZsYWcgJiAweGZmLCAuLi50aGlzLm1lc3NhZ2UuZGF0YV07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIExvY2FsRGlhbG9nIHtcbiAgY29uc3RydWN0b3IocHVibGljIGNvbmRpdGlvbjogbnVtYmVyLFxuICAgICAgICAgICAgICBwdWJsaWMgbWVzc2FnZTogTWVzc2FnZUlkLFxuICAgICAgICAgICAgICBwdWJsaWMgdXBkYXRlOiBudW1iZXIsXG4gICAgICAgICAgICAgIHB1YmxpYyBmbGFnczogRmxhZ0xpc3QpIHt9XG5cbiAgY2xvbmUoKTogTG9jYWxEaWFsb2cge1xuICAgIHJldHVybiBMb2NhbERpYWxvZy5wYXJzZSh0aGlzLmJ5dGVzKGZhbHNlKSlbMF07XG4gIH1cblxuICAvLyBSZXR1cm5zIFtkaWFsb2csIGxhc3RdXG4gIHN0YXRpYyBwYXJzZShkYXRhOiBEYXRhPG51bWJlcj4sIG9mZnNldDogbnVtYmVyID0gMCk6IFtMb2NhbERpYWxvZywgYm9vbGVhbl0ge1xuICAgIGNvbnN0IHdvcmQgPSByZWFkQmlnRW5kaWFuKGRhdGEsIG9mZnNldCk7XG4gICAgY29uc3QgbWVzc2FnZSA9IE1lc3NhZ2VJZC5mcm9tKGRhdGEsIG9mZnNldCArIDIpO1xuICAgIGNvbnN0IHVwZGF0ZSA9IGRhdGFbb2Zmc2V0ICsgNF07XG4gICAgb2Zmc2V0ICs9IDU7XG5cbiAgICBsZXQgY29uZGl0aW9uID0gd29yZCAmIDB4MDNmZjtcbiAgICBjb25zdCBsYXN0ID0gISEod29yZCAmIDB4ODAwMCk7XG4gICAgY29uc3Qgc2lnbiA9IHdvcmQgJiAweDIwMDA7XG4gICAgaWYgKHNpZ24pIGNvbmRpdGlvbiA9IH5jb25kaXRpb247XG4gICAgY29uc3QgZmxhZ3MgPSB3b3JkICYgMHg0MDAwID8gRElBTE9HX0ZMQUdTLnJlYWQoZGF0YSwgb2Zmc2V0KSA6IFtdO1xuICAgIHJldHVybiBbbmV3IExvY2FsRGlhbG9nKGNvbmRpdGlvbiwgbWVzc2FnZSwgdXBkYXRlLCBmbGFncyksIGxhc3RdO1xuICB9XG5cbiAgc3RhdGljIG9mKGNvbmRpdGlvbjogbnVtYmVyLFxuICAgICAgICAgICAgbWVzc2FnZTogW251bWJlciwgbnVtYmVyLCBudW1iZXI/XSxcbiAgICAgICAgICAgIGZsYWdzOiBGbGFnTGlzdCA9IFtdKTogTG9jYWxEaWFsb2cge1xuICAgIGNvbnN0IFtwYXJ0LCBpbmRleCwgYWN0aW9uID0gMF0gPSBtZXNzYWdlO1xuICAgIHJldHVybiBuZXcgTG9jYWxEaWFsb2coY29uZGl0aW9uLCBNZXNzYWdlSWQub2Yoe3BhcnQsIGluZGV4LCBhY3Rpb259KSwgMCwgZmxhZ3MpO1xuICB9XG5cbiAgYnl0ZUxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiA1ICsgMiAqIHRoaXMuZmxhZ3MubGVuZ3RoO1xuICB9XG5cbiAgYnl0ZXMobGFzdDogYm9vbGVhbik6IG51bWJlcltdIHtcbiAgICBsZXQgZmxhZyA9IHRoaXMuY29uZGl0aW9uO1xuICAgIGlmIChmbGFnIDwgMCkgZmxhZyA9ICh+ZmxhZykgfCAweDIwMDA7XG4gICAgaWYgKGxhc3QpIGZsYWcgfD0gMHg4MDAwO1xuICAgIGlmICh0aGlzLmZsYWdzLmxlbmd0aCkgZmxhZyB8PSAweDQwMDA7XG4gICAgcmV0dXJuIFtmbGFnID4+PiA4LCBmbGFnICYgMHhmZiwgLi4udGhpcy5tZXNzYWdlLmRhdGEsIHRoaXMudXBkYXRlLFxuICAgICAgICAgICAgLi4uRElBTE9HX0ZMQUdTLmJ5dGVzKHRoaXMuZmxhZ3MpXTtcbiAgfVxufVxuXG5jb25zdCBVTlVTRURfTlBDUyA9IG5ldyBTZXQoW1xuICAweDMxLCAweDNiLCAweDNjLCAweDY2LCAweDY3LCAweDZhLCAweDczLCAweDc0LFxuICAweDgyLCAweDg2LCAweDg3LCAweDg5LCAweDhhLCAweDhiLCAweDhjLCAweDhkLFxuICAweGM0LFxuICAvLyBhbHNvIGV2ZXJ5dGhpbmcgZnJvbSA4Zi4uYzAsIGJ1dCB0aGF0J3MgaW1wbGljaXQuXG5dKTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gU3BlY2lhbCBjYXNlcyBmb3Igc29tZSBOUENzLlxuXG5leHBvcnQgY2xhc3MgUG9ydG9hUXVlZW4gZXh0ZW5kcyBOcGMge1xuICBnZXQgZXhwZWN0ZWRTd29yZCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5sb2NhbERpYWxvZygzKS5jb25kaXRpb24gJiAweGZmOyB9XG4gIHNldCBleHBlY3RlZFN3b3JkKGlkOiBudW1iZXIpIHsgdGhpcy5sb2NhbERpYWxvZygzKS5jb25kaXRpb24gPSAweDIwMCB8IGlkOyB9XG59XG5cbmV4cG9ydCBjbGFzcyBEb2xwaGluIGV4dGVuZHMgTnBjIHtcbiAgc3Bhd25TY3JpcHRzOiBEb2xwaGluU3Bhd25TY3JpcHRbXTtcbiAgY2hhbm5lbFNwYXduOiBudW1iZXI7XG4gIGV2aWxTcGlyaXRJc2xhbmRTcGF3bjogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHBhcmVudDogTnBjcywgaWQ6IG51bWJlcikge1xuICAgIHN1cGVyKHBhcmVudCwgaWQpO1xuICAgIGNvbnN0IHByZyA9IHBhcmVudC5yb20ucHJnO1xuICAgIGNvbnN0IHNwYXduVGFibGVCYXNlID0gRE9MUEhJTl9TUEFXTl9UQUJMRV9QT0lOVEVSLnJlYWRBZGRyZXNzKHByZykub2Zmc2V0O1xuICAgIC8vIFRPRE8gLSBob3cgdG8ga25vdyBob3cgYmlnIHRoZSB0YWJsZSBhY3R1YWxseSBpcywgaWYgcmV3cml0dGVuP1xuICAgIGNvbnN0IHJlYWQgPSAoaTogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCBlbnRyYW5jZSA9IEVudHJhbmNlLmZyb20ocHJnLCBzcGF3blRhYmxlQmFzZSArIDUgKiBpKTtcbiAgICAgIGNvbnN0IG1vdmVtZW50ID0gcHJnW3NwYXduVGFibGVCYXNlICsgNSAqIGkgKyA0XTtcbiAgICAgIHJldHVybiB7ZW50cmFuY2UsIG1vdmVtZW50fTtcbiAgICB9O1xuICAgIHRoaXMuc3Bhd25TY3JpcHRzID0gc2VxKDksIHJlYWQpO1xuICAgIHRoaXMuY2hhbm5lbFNwYXduID0gbXVzdEJlSW50KERPTFBISU5fQ0hBTk5FTF9TUEFXTi5yZWFkKHByZykgLyA1KTtcbiAgICB0aGlzLmV2aWxTcGlyaXRJc2xhbmRTcGF3biA9XG4gICAgICAgIG11c3RCZUludChET0xQSElOX0VWSUxfU1BJUklUX0lTTEFORF9TUEFXTi5yZWFkKHByZykgLyA1KTtcbiAgfVxuXG4gIGFzc2VtYmxlKGE6IEFzc2VtYmxlcikge1xuICAgIHN1cGVyLmFzc2VtYmxlKGEpO1xuICAgIC8vIEZyZWUgdGhlIG9yaWdpbmFsIHRhYmxlIHRvIGFsbG93IHJlbG9jYXRpb24gYW5kL29yIHJlc2l6aW5nLlxuICAgIGEuc2VnbWVudCgnZmUnKTtcbiAgICBhLm9yZygweGQ2YTgpO1xuICAgIGEuZnJlZSg0NSk7XG4gICAgLy8gV3JpdGUgdGhlIG5ldyB0YWJsZSAoYWZ0ZXIgdHJpbW1pbmcgYW55IGVtcHRpZXMgYXQgdGhlIGVuZCkuXG4gICAgYS5zZWdtZW50KCdmZScsICdmZicpO1xuICAgIGEucmVsb2MoJ0RvbHBoaW5TcGF3blRhYmxlJyk7XG4gICAgY29uc3QgdGFibGUgPSBhLnBjKCk7XG4gICAgd2hpbGUgKCF0aGlzLnNwYXduU2NyaXB0c1t0aGlzLnNwYXduU2NyaXB0cy5sZW5ndGggLSAxXS5lbnRyYW5jZS51c2VkKSB7XG4gICAgICB0aGlzLnNwYXduU2NyaXB0cy5wb3AoKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvbS5sb2NhdGlvbnMuQW5ncnlTZWEuZW50cmFuY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzID0gdGhpcy5zcGF3blNjcmlwdHNbaV07XG4gICAgICBpZiAocykge1xuICAgICAgICBhLmJ5dGUoLi4ucy5lbnRyYW5jZS5kYXRhLCBzLm1vdmVtZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFwibm8tb3BcIiBzY3JpcHQuICBEb24ndCByZWFkIHJhbmRvbSBnYXJiYWdlIGZvciBsYXRlciBlbnRyYW5jZXMuXG4gICAgICAgIGEuYnl0ZSgweGZmLCAweDBmLCAweGZmLCAweDBmLCAweDBmKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gV3JpdGUgdGhlIGFkZHJlc3NlcyBhbmQgaGFyZGNvZGVkIGluZGljZXMgaW50byB0aGUgaXRlbXVzZSBjb2RlLlxuICAgIERPTFBISU5fQ0hBTk5FTF9TUEFXTi5sb2MoYSwgJ0RvbHBoaW5DaGFubmVsU3Bhd24nKTtcbiAgICBhLmJ5dGUodGhpcy5jaGFubmVsU3Bhd24gKiA1KTtcbiAgICBET0xQSElOX0VWSUxfU1BJUklUX0lTTEFORF9TUEFXTi5sb2MoYSwgJ0RvbHBoaW5FdmlsU3Bpcml0SXNsYW5kU3Bhd24nKTtcbiAgICBhLmJ5dGUodGhpcy5ldmlsU3Bpcml0SXNsYW5kU3Bhd24gKiA1KTtcbiAgICBET0xQSElOX1NQQVdOX1RBQkxFX1BPSU5URVIubG9jKGEsICdEb2xwaGluU3Bhd25UYWJsZVB0cicpO1xuICAgIGEud29yZCh0YWJsZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgIERPTFBISU5fU1BBV05fVEFCTEVfUE9JTlRFUl8xLnBsdXMoNSAqIGkpXG4gICAgICAgICAgLmxvYyhhLCBgRG9scGhpblNwYXduVGFibGVQbHVzJHtpICsgMX1QdHJgKTtcbiAgICAgIGEud29yZCh7b3A6ICcrJywgYXJnczogW3RhYmxlLCB7b3A6ICdudW0nLCBudW06IGkgKyAxfV19KTsgICAgXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9scGhpblNwYXduU2NyaXB0IHtcbiAgZW50cmFuY2U6IEVudHJhbmNlO1xuICBtb3ZlbWVudDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1vdmVtZW50U2NyaXB0IHtcbiAgc3RlcHM6IG51bWJlcltdO1xuICB0ZXJtaW5hdGU6IG51bWJlcjtcbn1cbmV4cG9ydCBuYW1lc3BhY2UgTW92ZW1lbnRTY3JpcHQge1xuICBleHBvcnQgY29uc3QgVVAgPSAwO1xuICBleHBvcnQgY29uc3QgUklHSFQgPSAyO1xuICBleHBvcnQgY29uc3QgRE9XTiA9IDQ7XG4gIGV4cG9ydCBjb25zdCBMRUZUID0gNjtcbiAgZXhwb3J0IGNvbnN0IERPTFBISU4gPSAweGZmO1xuICBleHBvcnQgY29uc3QgREVTUEFXTiA9IDB4ZmU7XG59XG5cbmNvbnN0IERPTFBISU5fQ0hBTk5FTF9TUEFXTiA9IEFkZHJlc3Mub2YoJGZlLCAweGQ2NjQpO1xuY29uc3QgRE9MUEhJTl9FVklMX1NQSVJJVF9JU0xBTkRfU1BBV04gPSBBZGRyZXNzLm9mKCRmZSwgMHhkNjZjKTtcbmNvbnN0IERPTFBISU5fU1BBV05fVEFCTEVfUE9JTlRFUiA9IEFkZHJlc3Mub2YoJGZlLCAweGQ2N2EpO1xuY29uc3QgRE9MUEhJTl9TUEFXTl9UQUJMRV9QT0lOVEVSXzEgPSBBZGRyZXNzLm9mKCRmZSwgMHhkNjhlKTsgLy8gKzUsIDEwLCAxNVxuY29uc3QgTU9WRU1FTlRfU0NSSVBUX1RBQkxFX1BPSU5URVIgPSBBZGRyZXNzLm9mKCQxYiwgMHhhZTUzKTtcblxuZnVuY3Rpb24gbXVzdEJlSW50KHg6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh4ICE9PSBNYXRoLmZsb29yKHgpKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGludGVnZXI6ICR7eH1gKTtcbiAgcmV0dXJuIHg7XG59XG4iXX0=