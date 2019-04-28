import { Entity } from './entity.js';
import { hex, readLittleEndian, writeLittleEndian } from './util.js';
export class ObjectData extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.used = true;
        this.name = '';
        this.pointer = 0x1ac00 + (id << 1);
        this.base = readLittleEndian(rom.prg, this.pointer) + 0x10000;
        this.sfx = rom.prg[this.base];
        this.data = [];
        let a = this.base + 1;
        let m = 0;
        for (let i = 0; i < 32; i++) {
            if (!(i & 7)) {
                m = rom.prg[a++];
            }
            this.data.push(m & 0x80 ? rom.prg[a++] : 0);
            m <<= 1;
        }
    }
    serialize() {
        const out = [this.sfx];
        for (let i = 0; i < 4; i++) {
            const k = out.length;
            out.push(0);
            for (let j = 0; j < 8; j++) {
                if (this.data[8 * i + j]) {
                    out[k] |= (0x80 >>> j);
                    out.push(this.data[8 * i + j]);
                }
            }
        }
        return out;
    }
    async write(writer) {
        const address = await writer.write(this.serialize(), 0x1a000, 0x1bfff, `Object ${hex(this.id)}`);
        writeLittleEndian(writer.rom, this.pointer, address - 0x10000);
    }
    get(addr) {
        return this.data[(addr - 0x300) >>> 5];
    }
    parents() {
        return this.rom.monsters.filter((m) => m.child && this.rom.adHocSpawns[m.child].object === this.id);
    }
    locations() {
        return this.rom.locations.filter((l) => l.used && l.spawns.some(spawn => spawn.isMonster() && spawn.monsterId === this.id));
    }
    palettes(includeChildren = false) {
        if (this.action === 0x22)
            return [3];
        let metaspriteId = this.data[0];
        if (this.action === 0x2a)
            metaspriteId = this.data[31] | 1;
        if (this.action === 0x29)
            metaspriteId = 0x6b;
        if (this.action === 0x26)
            metaspriteId = 0x9c;
        const ms = this.rom.metasprites[metaspriteId];
        const childMs = includeChildren && this.child ?
            this.rom.metasprites[this.rom.objects[this.rom.adHocSpawns[this.child].objectId].objectData[0]] :
            null;
        const s = new Set([...ms.palettes(), ...(childMs ? childMs.palettes() : [])]);
        return [...s];
    }
    get metasprite() { return METASPRITE.get(this.data); }
    set metasprite(x) { METASPRITE.set(this.data, x); }
    get collisionPlane() { return COLLISION_PLANE.get(this.data); }
    set collisionPlane(x) { COLLISION_PLANE.set(this.data, x); }
    get hitbox() { return HITBOX.get(this.data); }
    set hitbox(x) { HITBOX.set(this.data, x); }
    get hp() { return HP.get(this.data); }
    set hp(x) { HP.set(this.data, x); }
    get atk() { return ATK.get(this.data); }
    set atk(x) { ATK.set(this.data, x); }
    get def() { return DEF.get(this.data); }
    set def(x) { DEF.set(this.data, x); }
    get level() { return LEVEL.get(this.data); }
    set level(x) { LEVEL.set(this.data, x); }
    get child() { return CHILD.get(this.data); }
    set child(x) { CHILD.set(this.data, x); }
    get terrainSusceptibility() { return TERRAIN_SUSCEPTIBILITY.get(this.data); }
    set terrainSusceptibility(x) { TERRAIN_SUSCEPTIBILITY.set(this.data, x); }
    get immobile() { return !!IMMOBILE.get(this.data); }
    set immobile(x) { IMMOBILE.set(this.data, x ? 1 : 0); }
    get action() { return ACTION.get(this.data); }
    set action(x) { ACTION.set(this.data, x); }
    get replacement() { return REPLACEMENT.get(this.data); }
    set replacement(x) { REPLACEMENT.set(this.data, x); }
    get goldDrop() { return GOLD_DROP.get(this.data); }
    set goldDrop(x) { GOLD_DROP.set(this.data, x); }
    get elements() { return ELEMENTS.get(this.data); }
    set elements(x) { ELEMENTS.set(this.data, x); }
    get expReward() { return EXP_REWARD.get(this.data); }
    set expReward(x) { EXP_REWARD.set(this.data, x); }
    get attackType() { return ATTACK_TYPE.get(this.data); }
    set attackType(x) { ATTACK_TYPE.set(this.data, x); }
}
function prop(...spec) {
    return new Stat(...spec);
}
class Stat {
    constructor(...spec) {
        this.spec = spec;
    }
    get(data) {
        let value = 0;
        for (const [addr, mask = 0xff, shift = 0] of this.spec) {
            const index = (addr - 0x300) >>> 5;
            const lsh = shift < 0 ? -shift : 0;
            const rsh = shift < 0 ? 0 : shift;
            value |= ((data[index] & mask) >>> rsh) << lsh;
        }
        return value;
    }
    set(data, value) {
        for (const [addr, mask = 0xff, shift = 0] of this.spec) {
            const index = (addr - 0x300) >>> 5;
            const lsh = shift < 0 ? -shift : 0;
            const rsh = shift < 0 ? 0 : shift;
            const v = (value >>> lsh) << rsh & mask;
            data[index] = data[index] & ~mask | v;
        }
    }
}
const METASPRITE = prop([0x300]);
const COLLISION_PLANE = prop([0x3a0, 0xf0, 4]);
const HITBOX = prop([0x420, 0x40, 2], [0x3a0, 0x0f]);
const HP = prop([0x3c0]);
const ATK = prop([0x3e0]);
const DEF = prop([0x400]);
const LEVEL = prop([0x420, 0x1f]);
const CHILD = prop([0x440]);
const TERRAIN_SUSCEPTIBILITY = prop([0x460]);
const IMMOBILE = prop([0x4a0, 0x80, 7]);
const ACTION = prop([0x4a0, 0x7f]);
const REPLACEMENT = prop([0x4c0]);
const GOLD_DROP = prop([0x500, 0xf0, 4]);
const ELEMENTS = prop([0x500, 0xf]);
const EXP_REWARD = prop([0x520]);
const ATTACK_TYPE = prop([0x540]);
//# sourceMappingURL=objectdata.js.map