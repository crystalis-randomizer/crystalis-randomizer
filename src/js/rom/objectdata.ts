import { Module } from '../asm/module';
import { Entity } from './entity';
import { Location } from './location';
import { readLittleEndian, readLengthDelimitedString } from './util';
import { Constraint } from './constraint';
import type { Objects } from './objects';
import { Expr } from '../asm/expr';

// NOTE: Would be nice to call this Object, but that seems confusing...
export class ObjectData extends Entity {

  used: boolean;
  name: string;
  displayName: string;

  base: number;

  sfx: number;
  data: number[];

  constraint: Constraint = Constraint.ALL;

  constructor(parent: Objects, id: number, defaultDisplayName: string='') {
    super(parent.rom, id);
    parent[id] = this;
    this.used = true;
    this.name = '';
    if (parent.rom.writeMonsterNames) {
      const addr = this.rom.prg[0x7a000 | id] |
          (this.rom.prg[0x7a100 | id] << 8) |
          0x70000;
      this.displayName = readLengthDelimitedString(this.rom.prg, addr);
    } else {
      this.displayName = defaultDisplayName;
    }
    this.base = readLittleEndian(this.rom.prg, this.pointer) + 0x10000;
    this.sfx = this.rom.prg[this.base];
    this.data = [];
    let a = this.base + 1;
    let m = 0;
    for (let i = 0; i < 32; i++) {
      if (!(i & 7)) {
        m = this.rom.prg[a++];
      }
      this.data.push(m & 0x80 ? this.rom.prg[a++] : 0);
      m <<= 1;
    }
  }

  get pointer(): number {
    return 0x1ac00 + (this.id << 1);
  }

  // Returns a byte array for this entry
  serialize(): number[] {
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

  write(this: ObjectData): Module[] {
    const name = `Object_${this.id.toString(16).padStart(2, '0')}`;
    const a = this.rom.assembler();
    a.segment('0d');
    a.reloc(name);
    const label = a.pc();
    a.byte(...this.serialize());
    a.org(0xac00 + (this.id << 1), `${name}_Ptr`);
    a.word(label);

    // Handle slime transformation.  We assume all slimes are invulnerable
    // to the same element (rescalemonsters guarantees this, anyway).
    if (this === this.rom.objects.blueSlime) {
      // Figure out which bit is set (elements = 1<<(b-1))
      // Note the extra offset is due to 0 being "no sword equipped"
      let e = this.elements;
      let b = 0;
      while (e) {
        e >>= 1;
        b++;
      }
      a.assign('slimeMutationElement', b);
      a.export('slimeMutationElement');
    }

    if (this.rom.writeMonsterNames) {
      a.segment('3d');
      let addr!: Expr|undefined; 
      if (this.displayName) {
        const name = `${this.name}_Str`;
        a.reloc(name);
        addr = a.pc();
        a.byte(this.displayName.length);
        a.byte(...this.displayName);
      }
      a.org(0xa000 | this.id, `EnemyNameTableLo_${this.id}`);
      a.byte(addr != null ? Expr.loByte(addr) : 0);
      a.org(0xa100 | this.id, `EnemyNameTableHi_${this.id}`);
      a.byte(addr != null ? Expr.hiByte(addr) : 0);
    }

    return [a.module()];
  }

  get(addr: number): number {
    return this.data[(addr - 0x300) >>> 5];
  }

  parents(): ObjectData[] {
    // If this is a projectile that is the parent of some monster,
    // return an array of parents that spawned it.
    return [];
    // return this.rom.monsters.filter(
    //     (m: ObjectData) => m.child &&
    //                        this.rom.adHocSpawns[m.child].objectId === this.id);
  }

  spawnedChild(): ObjectData|undefined {
    const hasChild = this.rom.objectActions[this.action]?.data.hasChild;
    if (!hasChild) return undefined;
    const spawn = this.rom.adHocSpawns[this.child];
    const spawnId = spawn && spawn.objectId;
    if (spawnId == null) return undefined;
    return this.rom.objects[spawnId];
  }

  spawnedReplacement(): ObjectData|undefined {
    if (!this.replacement) return undefined;
    return this.rom.objects[this.replacement];
  }

  locations(): Location[] {
    // TODO - handle non-monster NPCs.
    return this.rom.locations.filter((l: Location) =>
        l.used && l.spawns.some(spawn =>
            spawn.isMonster() && spawn.monsterId === this.id));
  }

  palettes(includeChildren = false): number[] {
    // NOTE: this gets the wrong result for ice/sand zombies and blobs.
    //  - may just need to guess/assume and experiment?
    //  - zombies (action 0x22) look like should just be 3
    //  - lavamen/blobs (action 0x29) are 2
    //  - wraith shadows (action 0x26) are 3
    if (this.action === 0x22) return [3]; // zombie
    let metaspriteId = this.data[0];
    if (this.action === 0x2a) metaspriteId = this.data[31] | 1;
    if (this.action === 0x29) metaspriteId = 0x6b; // blob
    if (this.action === 0x26) metaspriteId = 0x9c;

    const ms = this.rom.metasprites[metaspriteId];
    const childMs =
        includeChildren && this.child ?
            this.rom.metasprites[
                this.rom.objects[
                    this.rom.adHocSpawns[this.child].objectId].data[0]] :
            null;
    const s = new Set([...(ms?.palettes() ?? []),
                       ...(childMs?.palettes() ?? [])]);
    return [...s];
  }

  // 0 for wind, 1 for fire, 2 for water, 3 for thunder
  isVulnerable(element: number) {
    return !(this.elements & (1 << element));
  }

  isShadow() {
    // NOTE: internally the game checks that the metasprite
    // is $a7 (see $350f3), but we'll just hardcode.
    return this.id === 0x7b || this.id === 0x8c;
  }

  get metasprite(): number { return METASPRITE.get(this.data); }
  set metasprite(x: number) { METASPRITE.set(this.data, x); }

  get speed(): number { return SPEED.get(this.data); }
  set speed(x: number) { SPEED.set(this.data, x); }

  get collisionPlane(): number { return COLLISION_PLANE.get(this.data); }
  set collisionPlane(x: number) { COLLISION_PLANE.set(this.data, x); }

  get hitbox(): number { return HITBOX.get(this.data); }
  set hitbox(x: number) { HITBOX.set(this.data, x); }

  get hp(): number { return HP.get(this.data); }
  set hp(x: number) { HP.set(this.data, x); }

  get atk(): number { return ATK.get(this.data); }
  set atk(x: number) { ATK.set(this.data, x); }

  get def(): number { return DEF.get(this.data); }
  set def(x: number) { DEF.set(this.data, x); }

  get level(): number { return LEVEL.get(this.data); }
  set level(x: number) { LEVEL.set(this.data, x); }

  get poison(): boolean { return !!POISON.get(this.data); }
  set poison(x: boolean) { POISON.set(this.data, x ? 1 : 0); }

  get child(): number { return CHILD.get(this.data); }
  set child(x: number) { CHILD.set(this.data, x); }

  get terrainSusceptibility(): number { return TERRAIN_SUSCEPTIBILITY.get(this.data); }
  set terrainSusceptibility(x: number) { TERRAIN_SUSCEPTIBILITY.set(this.data, x); }

  get immobile(): boolean { return !!IMMOBILE.get(this.data); }
  set immobile(x: boolean) { IMMOBILE.set(this.data, x ? 1 : 0); }

  get action(): number { return ACTION.get(this.data); }
  set action(x: number) { ACTION.set(this.data, x); }

  get replacement(): number { return REPLACEMENT.get(this.data); }
  set replacement(x: number) { REPLACEMENT.set(this.data, x); }

  get goldDrop(): number { return GOLD_DROP.get(this.data); }
  set goldDrop(x: number) { GOLD_DROP.set(this.data, x); }

  get elements(): number { return ELEMENTS.get(this.data); }
  set elements(x: number) { ELEMENTS.set(this.data, x); }

  /** Unprocessed experience reward ($520,x). */
  get expReward(): number { return EXP_REWARD.get(this.data); }
  set expReward(x: number) { EXP_REWARD.set(this.data, x); }

  get attackType(): number { return ATTACK_TYPE.get(this.data); }
  set attackType(x: number) { ATTACK_TYPE.set(this.data, x); }

  get statusEffect(): number { return STATUS_EFFECT.get(this.data); }
  set statusEffect(x: number) { STATUS_EFFECT.set(this.data, x); }

  toString() {
    return super.toString() + (this.name ? ' ' + this.name : '');
  }
}

function prop(...spec: [number, number?, number?][]) {
  return new Stat(...spec);
}

class Stat {
  readonly spec: [number, number?, number?][];

  constructor(...spec: [number, number?, number?][]) {
    this.spec = spec;
  }

  get(data: number[]) {
    let value = 0;
    for (const [addr, mask = 0xff, shift = 0] of this.spec) {
      const index = (addr - 0x300) >>> 5;
      const lsh = shift < 0 ? -shift : 0;
      const rsh = shift < 0 ? 0 : shift;
      value |= ((data[index] & mask) >>> rsh) << lsh;
    }
    return value;
  }

  set(data: number[], value: number) {
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
const SPEED = prop([0x340, 0xf]);
const COLLISION_PLANE = prop([0x3a0, 0xf0, 4]);
const HITBOX = prop([0x420, 0x40, 2], [0x3a0, 0x0f]);
const HP = prop([0x3c0]);
const ATK = prop([0x3e0]);
const DEF = prop([0x400]);
const LEVEL = prop([0x420, 0x1f]);
const POISON = prop([0x420, 0x80, 7]);
const CHILD = prop([0x440]); // ad-hoc spawn index
const TERRAIN_SUSCEPTIBILITY = prop([0x460]);
const IMMOBILE = prop([0x4a0, 0x80, 7]); // will not be knocked back
const ACTION = prop([0x4a0, 0x7f]);
const REPLACEMENT = prop([0x4c0]);
const GOLD_DROP = prop([0x500, 0xf0, 4]);
const ELEMENTS = prop([0x500, 0xf]);
const EXP_REWARD = prop([0x520]);
const ATTACK_TYPE = prop([0x540]);
const STATUS_EFFECT = prop([0x560, 0xf]);
