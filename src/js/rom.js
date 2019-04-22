import {UnionFind} from './unionfind.js';
import {Entity} from './rom/entity.js';
import {Writer} from './rom/writer.js';
import {Location} from './rom/location.js';
import {Palette} from './rom/palette.js';
import {Pattern} from './rom/pattern.js';
import {Screen} from './rom/screen.js';
import {Tileset} from './rom/tileset.js';
import {TileEffects} from './rom/tileeffects.js';
import {seq, slice, signed, varSlice, addr, group, countBits} from './rom/util.js';

// TODO - consider adding prepopulated name maps for data
// tables, e.g. my location names, so that an editor could
// use a drop-down menu and show something meaningful.

class TileAnimation extends Entity {
  constructor(rom, id) {
    super(rom, id);
    this.base = 0x3e779 + (id << 3);
    this.pages = slice(rom.prg, this.base, 8);
  }
}

class Hitbox extends Entity {
  constructor(rom, id) {
    super(rom, id);
    this.base = 0x35691 + (id << 2);
    this.coordinates = slice(rom.prg, this.base, 4);
  }

  get w() { return this.coordinates[1]; }
  get x0() { return signed(this.coordinates[0]); }
  get x1() { return this.x0 + this.w; }
  get h() { return this.coordinates[3]; }
  get y0() { return signed(this.coordinates[2]); }
  get y1() { return this.y0 + this.h; }
}

const UNUSED_TRIGGERS = new Set([
  0x87, 0x88, 0x89, 0x8f, 0x93, 0x96, 0x98, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
  0xa0, 0xb5, 0xb9, 0xbe, 0xc0, // c2 is last one
]);

class Trigger extends Entity {
  constructor(rom, id) {
    // TODO - consider pulling this out into static fromBytes() method?
    super(rom, id);
    this.used = !UNUSED_TRIGGERS.has(id); // need to set manually
    this.pointer = 0x1e17a + ((id & 0x7f) << 1);
    this.base = addr(rom.prg, this.pointer, 0x14000);
    // List of flags to check: positive means "must be set"
    this.conditions = [];
    // MessageId object
    this.message = null;
    // List of flags to set/clear: positive means set
    this.flags = [];
    let word;
    let i = this.base;
    do {
      // NOTE: this byte order is inverse from normal.
      word = rom.prg[i] << 8 | rom.prg[i + 1];
      const flag = word & 0x0fff;
      this.conditions.push(word & 0x2000 ? ~flag : flag);
      i += 2;
    } while (!(word & 0x8000));
    this.message = MessageId.from(rom.prg, i);
    do {
      i += 2;
      word = rom.prg[i] << 8 | rom.prg[i + 1];
      const flag = word & 0x0fff;
      this.flags.push(word & 0x8000 ? ~flag : flag);
    } while (!(word & 0x4000));
//console.log(`Trigger $${this.id.toString(16)}: bytes: $${this.bytes().map(x=>x.toString(16).padStart(2,0)).join(' ')}`);
  }

  bytes() {
    const bytes = [];
    for (let i = 0; i < this.conditions.length; i++) {
      let word = this.conditions[i];
      if (word < 0) word = ~word | 0x2000;
      if (i === this.conditions.length - 1) word = word | 0x8000;
      bytes.push(word >>> 8, word & 0xff);
    }
    bytes.push(...this.message.bytes());
    for (let i = 0; i < this.flags.length; i++) {
      let word = this.flags[i];
      if (word < 0) word = ~word | 0x8000;
      if (i === this.flags.length - 1) word = word | 0x4000;
      bytes.push( word >>> 8, word & 0xff);
    }
    return bytes;
  }

  async write(writer, base = 0x1e17a) {
    const address = await writer.write(this.bytes(), 0x1e000, 0x1ffff);
    writer.rom[base + 2 * (this.id & 0x7f)] = address & 0xff;
    writer.rom[base + 2 * (this.id & 0x7f) + 1] = (address >>> 8) - 0x40;
  }
}

class MessageId {
  constructor(action, part, index) {
    this.action = action;
    this.part = part;
    this.index = index;
  }

  static from(arr, i) {
    const word = arr[i] << 8 | arr[i + 1];
    const action = (word >>> 11) & 0x1f;
    const part = (word >>> 5) & 0x3f;
    const index = word & 0x1f;
    return new MessageId(action, part, index);
  }

  bytes() {
    const word =
        (this.action & 0x1f) << 11 | (this.part & 0x3f) << 5 | (this.index & 0x1f);
    return [word >>> 8, word & 0xff];
  }
}

const UNUSED_NPCS = new Set([0x3c, 0x6a, 0x73, 0x82, 0x86, 0x87, 0x89, 0x8a, 0x8b, 0x8c, 0x8d]);
class Npc extends Entity {
  constructor(rom, id) {
    super(rom, id);
    this.used = !UNUSED_NPCS.has(id) /*&& this.base <= 0x1c781*/ && (id < 0x8f || id >= 0xc0);

    this.dataBase = 0x80f0 | ((id & 0xfc) << 6) | ((id & 3) << 2);
    this.data = slice(rom.prg, this.dataBase, 4);

    this.spawnPointer = 0x1c5e0 + (id << 1);
//console.log(`NPC Spawn $${this.id.toString(16)}: ${rom.prg[this.pointer].toString(16)} ${rom.prg[this.pointer + 1].toString(16)}`);
    this.spawnBase = addr(rom.prg, this.spawnPointer, 0x14000);
    // Flags to check per location: positive means "must be set"
    this.spawnConditions = {};

    // Populate spawn conditions
    let i = this.spawnBase;
    let loc;
    while (this.used && (loc = rom.prg[i++]) != 0xff) {
      this.spawnConditions[loc] = [];
      let word;
      do {
        // NOTE: this byte order is inverse from normal.
        word = rom.prg[i] << 8 | rom.prg[i + 1];
        const flag = word & 0x0fff;
        this.spawnConditions[loc].push(word & 0x2000 ? ~flag : flag);
        i += 2;
      } while (!(word & 0x8000));
    }
//console.log(`NPC Spawn $${this.id.toString(16)} from ${this.base.toString(16)}: bytes: $${this.bytes().map(x=>x.toString(16).padStart(2,0)).join(' ')}`);
  }

  spawnConditionsBytes() {
    const bytes = [];
    for (let loc in this.spawnConditions) {
      loc = Number(loc);
      bytes.push(loc);
      for (let i = 0; i < this.spawnConditions[loc].length; i++) {
        let word = this.spawnConditions[loc][i];
        if (word < 0) word = ~word | 0x2000;
        if (i === this.spawnConditions[loc].length - 1) word = word | 0x8000;
        bytes.push(word >>> 8, word & 0xff);
      }
    }
    bytes.push(0xff);
    return bytes;
  }

  async write(writer, {spawnConditionsBase = 0x1c5e0} = {}) {
    const address = await writer.write(this.spawnConditionsBytes(), 0x1c000, 0x1dfff);
    writer.rom[spawnConditionsBase + 2 * this.id] = address & 0xff;
    writer.rom[spawnConditionsBase + 2 * this.id + 1] = (address >>> 8) - 0x40;
    // TODO - write the static data
    // TODO - update pointer to the base???
  }
}

class AdHocSpawn extends Entity {
  constructor(rom, id) {
    // `id` is MapData[1][4], which ranges from $b3..$bd
    super(rom, id);
    this.base = (id << 2) + 0x29c00;
    this.lowerSlot = rom.prg[this.base];
    this.upperSlot = rom.prg[this.base + 1];
    this.object = rom.prg[this.base + 2];
    this.count = rom.prg[this.base + 3];
  }
}

class ItemGet extends Entity {
  constructor(rom, id) {
    super(rom, id);

    this.itemPointer = 0x1dd66 + id;
    this.item = rom.prg[this.itemPointer];
    // I don't fully understand this table...
    this.tablePointer = 0x1db00 + 2 * id;
    this.tableBase = addr(rom.prg, this.tablePointer, 0x14000);
    const tableContents = [];
    let a = this.tableBase;
    tableContents.push(rom.prg[a++]);
    tableContents.push(rom.prg[a++]);
    tableContents.push(rom.prg[a++]);
    tableContents.push(rom.prg[a++]);
    while (true) {
      const v = rom.prg[a++];
      tableContents.push(v);
      tableContents.push(rom.prg[a++]);
      if (v & 0x40) break;
    }
    tableContents.push(rom.prg[a++]);
    this.table = Uint8Array.from(tableContents);
    // NOTE - store the original table length or pointer?
    // Some way to detect whether it's changed?
  }

  // NOTE - punt on defragging for now.
  write(rom = this.rom) {
    rom.prg[this.itemPointer] = this.item;
    const data = this.table;
    rom.prg.subarray(this.tableBase, this.tableBase + data.length).set(data);
  }
}

class ObjectData extends Entity {
  constructor(rom, id) {
    super(rom, id);
// const pr=id==0xe6?console.log:()=>{};
    this.objectDataPointer = 0x1ac00 + (id << 1);
    this.objectDataBase = addr(rom.prg, this.objectDataPointer, 0x10000);
    this.sfx = rom.prg[this.objectDataBase];
    let a = this.objectDataBase + 1;
// console.log(`PRG($${id.toString(16)}) at $${this.objectDataBase.toString(16)}: ${Array.from(this.prg.slice(a, a + 23), x=>'$'+x.toString(16).padStart(2,0)).join(',')}`);
    this.objectData = [];
    let m = 0;
    for (let i = 0; i < 32; i++) {
// pr(`  i=${i.toString(16)}: a=${a.toString(16)}`);
      if (!(i & 7)) {
        m = rom.prg[a++];
// pr(`  m=${m.toString(16)}`);
      }
      this.objectData.push(m & 0x80 ? rom.prg[a++] : 0);
      m <<= 1;
// pr(`  push ${this.objectData[this.objectData.length - 1].toString(16)}, m=${m.toString(16)}`);
    }
// console.log(`ObjectData($${id.toString(16)}) at $${this.objectDataBase.toString(16)}: ${Array.from(this.objectData, x=>'$'+x.toString(16).padStart(2,0)).join(',')}`);
  }

  // Returns a byte array for this entry
  serialize() {
    const out = [this.sfx];
    for (let i = 0; i < 4; i++) {
      let k = out.length;
      out.push(0);
      for (let j = 0; j < 8; j++) {
        if (this.objectData[8 * i + j]) {
          out[k] |= (0x80 >>> j);
          out.push(this.objectData[8 * i + j]);
        }
      }
    }
    return Uint8Array.from(out);
  }

  async write(writer, base = 0x1ac00) {
    // Note: shift of 0x10000 is irrelevant
    const address = await writer.write(this.serialize(), 0x1a000, 0x1bfff);
    writer.rom[base + 2 * this.id] = address & 0xff;
    writer.rom[base + 2 * this.id + 1] = address >>> 8;
  }

  get(addr) {
    return this.objectData[(addr - 0x300) >>> 5];
  }

  static setupProps() {
    // bits is ...[addr, mask = 0xff, shift = 0]
    const prop = (...bits) => ({
      get() {
        let value = 0;
        for (const [addr, mask = 0xff, shift = 0] of bits) {
          const lsh = shift < 0 ? -shift : 0;
          const rsh = shift < 0 ? 0 : shift;
          value |= ((this.objectData[(addr - 0x300) >>> 5] & mask) >>> rsh) << lsh;
        }
        return value;
      },
      set(value) {
        for (const [addr, mask = 0xff, shift = 0] of bits) {
          const lsh = shift < 0 ? -shift : 0;
          const rsh = shift < 0 ? 0 : shift;
          const v = (value >>> lsh) << rsh & mask;
          const index = (addr - 0x300) >>> 5;
          this.objectData[index] = this.objectData[index] & ~mask | v;
        }
      },
    });
    Object.defineProperties(this.prototype, {
      metasprite: prop([0x300]),
      collisionPlane: prop([0x3a0, 0xf0, 4]),
      hitbox: prop([0x420, 0x40, 2], [0x3a0, 0x0f]),
      hp: prop([0x3c0]),
      atk: prop([0x3e0]),
      def: prop([0x400]),
      level: prop([0x420, 0x1f]),
      child: prop([0x440]), // ad-hoc spawn ID
      terrainSusceptibility: prop([0x460]),
      immobile: prop([0x4a0, 0x80, 7]), // will not be knocked back
      action: prop([0x4a0, 0x7f]),
      replacement: prop([0x4c0]),
      goldDrop: prop([0x500, 0xf0, 4]),
      elements: prop([0x500, 0xf]),
      expReward: prop([0x520]),
      attackType: prop([0x540]),
    });
  }

  parents() {
    // If this is a projectile that is the parent of some monster,
    // return an array of parents that spawned it.
    return this.rom.monsters.filter(m => m.child && this.rom.adHocSpawns[m.child].object == this.id);
  }

  locations() {
    // TODO - handle non-monster NPCs.
    return this.rom.locations.filter(l =>
        l.valid && l.spawns.some(spawn =>
            spawn.isMonster() && spawn.monsterId === this.id));
  }

  palettes(includeChildren = false) {
    // NOTE: this gets the wrong result for ice/sand zombies and blobs.
    //  - may just need to guess/assume and experiment?
    //  - zombies (action 0x22) look like should just be 3
    //  - lavamen/blobs (action 0x29) are 2
    //  - wraith shadows (action 0x26) are 3
    if (this.action == 0x22) return [3]; // zombie
    let metaspriteId = this.objectData[0];
    if (this.action == 0x2a) metaspriteId = this.objectData[31] | 1;
    if (this.action == 0x29) metaspriteId = 0x6b; // blob
    if (this.action == 0x26) metaspriteId = 0x9c;

    const ms = this.rom.metasprites[metaspriteId];
    const childMs = includeChildren && this.child ?
          this.rom.metasprites[this.rom.objects[this.rom.adHocSpawns[this.child].object].objectData[0]] : null;
    const s = new Set([...ms.palettes(), ...(childMs ? childMs.palettes() : [])]);
    return [...s];
  }
}
ObjectData.setupProps();


class Metasprite extends Entity {
  constructor(rom, id) {
    super(rom, id);

    this.base = addr(rom.prg, 0x3845c + (this.id << 1), 0x30000);
    this.valid = this.base > 0x30000;

    if (rom.prg[this.base] == 0xff) {
      // find the ID of the sprite that's mirrored.
      const target = addr(rom.prg, this.base + 1);
      for (let i = 0; i < 256; i++) {
        if (addr(rom.prg, 0x3845c + (i << 1)) == target) {
          this.mirrored = i;
          break;
        }
      }
      if (this.mirrored == null) throw new Error('could not find mirrored sprite for ' + id.toString(16));
      this.size = 0;
      this.frameMask = 0;
      this.frames = 0;
      this.sprites = [];
    } else {
      this.mirrored = null;
      this.size = rom.prg[this.base];
      this.frameMask = rom.prg[this.base + 1];
      this.frames = this.frameMask + 1;

      this.sprites = seq(this.frames, f => {
        const a = this.base + 2 + f * 4 * this.size;
        const sprites = [];
        for (let i = 0; i < this.size; i++) {
          if (rom.prg[a + 4 * i] == 0x80) break;
          sprites.push(slice(rom.prg, a + 4 * i, 4));
        }
        return sprites;
      });
      // NOTE: when re-encoding this, fill in $80 for all
      // missing rows from non-final frames.  For the final
      // frame, just write a single row of $80 (or maybe
      // even just a single one, if only the first is used).
    }
  }

  // returns an array of [0..3]
  palettes() {
    if (!this.valid) return [];
    let ms = this;
    if (ms.mirrored) {
      ms = this.rom.metasprites[ms.mirrored];
    }
    const pals = new Set();
    for (const version of ms.sprites) {
      for (let [dx, dy, attr, tile] of version) {
        if (dx == 0x80) break;
        pals.add(attr & 3);
      }
    }
    return [...pals];
  }
}

// Only used for Messages for now
class DataTable extends Array {
  constructor(rom, base, count, width, func = width > 1 ? (...i) => i : i => i) {
    super(count);
    this.rom = rom;
    this.base = base;
    this.count = count;
    this.width = width;
    for (let i = 0; i < count; i++) {
      this[i] = func(...slice(rom.prg, base + i * width, width));
    }
  }
}

// Only used for Messages for now
class AddressTable extends Array {
  constructor(rom, base, count, offset, func = i => i) {
    super(count);
    this.rom = rom;
    this.base = base;
    this.count = count;
    this.offset = offset;
    this.addresses = seq(this.count, i => addr(rom.prg, base + 2 * i, offset));
    for (let i = 0; i < count; i++) {
      this[i] = func(this.addresses[i], i, this.addresses);
    }
  }
}

class Message {
  constructor(messages, part, id, addr) {
    this.messages = messages;
    this.part = part;
    this.id = id;
    this.addr = addr;

    // Parse the message
    const prg = messages.rom.prg;
    const parts = [];
    this.bytes = [];
    for (let i = addr; prg[i]; i++) {
      let b = prg[i];
      this.bytes.push(b);
      if (b == 1) {
        // NOTE - there is one case where two messages seem to abut without a
        // null terminator - $2ca91 ($12:$08) falls through from 12:07.
        // if (i != addr && prg[i - 1] != 3) {
        //   throw new Error(`Unexpected start message signal at ${i.toString(16)}`);
        // }
      } else if (b == 2) {
        parts.push('\n');
      } else if (b == 3) {
        parts.push('\u25bc\n'); // black down-pointing triangle
      } else if (b == 4) {
        parts.push('SIMEA');
      } else if (b == 8) {
        parts.push('ITEM');
      } else if (b >= 5 && b <= 9) {
        const next = prg[++i];
        if (b == 9) {
          parts.push(' '.repeat(next));
          continue;
        }        
        parts.push(messages.extraWords[b][next]);
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

const PUNCTUATION = {
  '\0': true, '.': true, ',': true, '_': true, ':': true, '!': true, '?': true,
  '\'': true, ' ': true,
};

class Messages {
  constructor(rom) {
    this.rom = rom;

    const str = (a) => readString(rom.prg, a);
    this.basicWords = new AddressTable(rom, 0x28900, 0x80, 0x20000, str);
    this.extraWords = {
      5: new AddressTable(rom, 0x28a00, 10, 0x20000, str), // less common
      6: new AddressTable(rom, 0x28a14, 36, 0x20000, str), // people
      7: new AddressTable(rom, 0x28a5c, 74, 0x20000, str), // items (also 8?)
    };

    this.banks = new DataTable(rom, 0x283fe, 0x24, 1);
    this.parts = new AddressTable(
        rom, 0x28422, 0x22, 0x20000,
        (addr, part, addrs) => {
          // need to compute the end based on the array?
          const count = part == 0x21 ? 3 : (addrs[part + 1] - addr) >>> 1;
          // offset: bank=15 => 20000, bank=16 => 22000, bank=17 => 24000
          return new AddressTable(
              rom, addr, count, (this.banks[part] << 13) - 0xa000,
              (m, id) => new Message(this, part, id, m));
        });
  }
}

export class Rom {
  constructor(rom) {
    this.prg = rom.subarray(0x10, 0x40010);
    this.chr = rom.subarray(0x40010);

    // Load up a bunch of data tables.  This will include a large number of the
    // data tables in the ROM.  The idea is that we can edit the arrays locally
    // and then have a "commit" function that rebuilds the ROM with the new
    // arrays.  We may need to write a "paged allocator" that can allocate
    // chunks of ROM in a given page.  Probably want to use a greedy algorithm
    // where we start with the biggest chunk and put it in the smallest spot
    // that fits it.  Presumably we know the sizes up front even before we have
    // all the addresses, so we could do all the allocation at once - probably
    // returning a token for each allocation and then all tokens get filled in
    // at once (actual promises would be more unweildy).
    // Tricky - what about shared elements of data tables - we pull them
    // separately, but we'll need to re-coalesce them.  But this requires
    // knowing their contents BEFORE allocating their space.  So we need two
    // allocate methods - one where the content is known and one where only the
    // length is known.
    this.screens = seq(0x103, i => new Screen(this, i));
    this.tilesets = seq(12, i => new Tileset(this, i << 2 | 0x80));
    this.tileEffects = seq(11, i => new TileEffects(this, i + 0xb3));
    this.triggers = seq(0x43, i => new Trigger(this, 0x80 | i));
    this.patterns = seq(this.chr.length >> 4, i => new Pattern(this, i));
    this.palettes = seq(0x100, i => new Palette(this, i));
    this.locations = seq(0x100, i => new Location(this, i));
    this.tileAnimations = seq(4, i => new TileAnimation(this, i));
    this.hitboxes = seq(24, i => new Hitbox(this, i));
    this.objects = seq(0x100, i => new ObjectData(this, i));
    this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
    this.metasprites = seq(0x100, i => new Metasprite(this, i));
    this.messages = new Messages(this);
    this.itemGets = seq(0x71, i => new ItemGet(this, i));
    this.npcs = seq(0xcd, i => new Npc(this, i));
  }

  // TODO - cross-reference monsters/metasprites/metatiles/screens with patterns/palettes
  get monsters() {
    let monsters = new Set();
    for (const l of this.locations) {
      if (!l.valid || !l.hasSpawns) continue;
      for (const o of l.spawns) {
        if ((o[2] & 7) == 0) monsters.add(this.objects[(o[3] + 0x50) & 0xff]);
      }
    }
    monsters = [...monsters];
    monsters.sort((x, y) => (x.id - y.id));
    return monsters;
  }

  get projectiles() {
    let projectiles = new Set();
    for (const m of this.monsters) {
      if (m.child) {
        projectiles.add(this.objects[this.adHocSpawns[m.child].object]);
      }
    }
    projectiles = [...projectiles];
    projectiles.sort((x, y) => (x.id - y.id));
    return projectiles;
  }

  get monsterGraphics() {
    const gfx = {};
    for (const l of this.locations) {
      if (!l.valid || !l.hasSpawns) continue;
      for (const o of l.spawns) {
        if (!(o[2] & 7)) {
          const slot = o[2] & 0x80 ? 1 : 0;
          const id = (o[3] + 0x50).toString(16).padStart(2,0);
          const data = gfx[id] = gfx[id] || {};
          data[`${slot}:${l.spritePatterns[slot].toString(16)}:${
               l.spritePalettes[slot].toString(16)}`]
            = {slot: slot,
               pat: l.spritePatterns[slot],
               pal: l.spritePalettes[slot],
              };
        }
      }
    }
    return gfx;
  }

  get locationMonsters() {
    const m = {};
    for (const l of this.locations) {
      if (!l.valid || !l.hasSpawns) continue;
      // which monsters are in which slots?
      const s = m['$' + l.id.toString(16).padStart(2,0)] = {};
      for (const o of l.spawns) {
        if (!(o[2] & 7)) {
          const slot = o[2] & 0x80 ? 1 : 0;
          const id = o[3] + 0x50;
          s[`${slot}:${id.toString(16)}`] =
              (s[`${slot}:${id.toString(16)}`] || 0) + 1;
        }
      }
    }
    return m;
  }

  // TODO - for each sprite pattern table, find all the palettes that it uses.
  // Find all the monsters on it.  We can probably allow any palette so long
  // as one of the palettes is used with that pattern.
  // TODO - max number of instances of a monster on any map - i.e. avoid having
  // five flyers on the same map!

  // 460 - 0 means either flyer or stationary
  //           - stationary has 4a0 ~ 204,205,206
  //             (kraken, swamp plant, sorceror)
  //       6 - mimic
  //       1f - swimmer
  //       54 - tomato and bird
  //       55 - swimmer
  //       57 - normal
  //       5f - also normal, but medusa head is flyer?
  //       77 - soldiers, ice zombie


  // Use the browser API to load the ROM.  Use #reset to forget and reload.
  static async load(patch = undefined) {
    const file = await pickFile();
    if (patch) await patch(file);
    return new Rom(file);
  }

//   // Don't worry about other datas yet
//   writeObjectData() {
//     // build up a map from actual data to indexes that point to it
//     let addr = 0x1ae00;
//     const datas = {};
//     for (const object of this.objects) {
//       const ser = object.serialize();
//       const data = ser.join(' ');
//       if (data in datas) {
// //console.log(`$${object.id.toString(16).padStart(2,0)}: Reusing existing data $${datas[data].toString(16)}`);
//         object.objectDataBase = datas[data];
//       } else {
//         object.objectDataBase = addr;
//         datas[data] = addr;
// //console.log(`$${object.id.toString(16).padStart(2,0)}: Data is at $${addr.toString(16)}: ${Array.from(ser, x=>'$'+x.toString(16).padStart(2,0)).join(',')}`);
//         addr += ser.length;
// // seed 3517811036
//       }
//       object.write();
//     }
// //console.log(`Wrote object data from $1ac00 to $${addr.toString(16).padStart(5, 0)}, saving ${0x1be91 - addr} bytes.`);
//     return addr;
//   }

  async writeData() {
    const writer = new Writer(this.prg);
    // MapData
    writer.alloc(0x144f8, 0x17e00);
    // NpcData, ObjectData
    // NOTE: 193f9 is assuming $fb is the last location ID.  If we add more locations at
    // the end then we'll need to push this back a few more bytes.  We could possibly
    // detect the bad write and throw an error, and/or compute the max location ID.
    writer.alloc(0x193f9, 0x1bb00);
    // TriggerData
    writer.alloc(0x1e200, 0x1e3f0);
    // NpcSpawnConditions
    writer.alloc(0x1c77a, 0x1c95d);

    // Move object data table all the way to the end.
    this.prg[0x3c273] = this.prg[0x3c278] = 0xbe;
    this.prg[0x3c27f] = this.prg[0x3c284] = 0xbf;
    const promises = [];
    for (const l of this.locations) {
      if (!l.valid) continue;
      promises.push(l.write(writer));
    }
    // NOTE: NpcData can span the entire $18000..$1bfff double-page, but
    // ObjectData (which starts shortly after the end of NpcData) must only
    // live in $1a000..$1bfff.  So we make a new writer that starts at the
    // exact position that NpcData ends (provided it's on the right page).
    // This should afford us the same amount of freed space (usable by either
    // table), but guarantees no objects end up on the wrong page.
    for (const o of this.objects) {
      o.write(writer, 0x1be00); // NOTE: we moved the ObjectData table to 1be00
    }
    for (const t of this.triggers) {
      if (!t.used) continue;
      promises.push(t.write(writer));
    }
    for (const s of this.npcs) {
      if (!s.used) continue;
      promises.push(s.write(writer));
    }
    for (const tileset of this.tilesets) {
      tileset.write(writer);
    }
    for (const tileEffects of this.tileEffects) {
      tileEffects.write(this.prg);
    }
    for (const screen of this.screens) {
      screen.write(writer);
    }
    promises.push(writer.commit());
    return Promise.all(promises).then(() => undefined);
  }


  analyzeTiles() {
    // For any given tile index, what screens does it appear on.
    // For those screens, which tilesets does *it* appear on.
    // That tile ID is linked across all those tilesets.
    // Forms a partitioning for each tile ID => union-find.
    // Given this partitioning, if I want to move a tile on a given
    // tileset, all I need to do is find another tile ID with the
    // same partition and swap them?

    // More generally, we can just partition the tilesets.


    // For each screen, find all tilesets T for that screen
    // Then for each tile on the screen, union T for that tile.


    // Given a tileset and a metatile ID, find all the screens that (1) are rendered
    // with that tileset, and (b) that contain that metatile; then find all *other*
    // tilesets that those screens are ever rendered with.

    // Given a screen, find all available metatile IDs that could be added to it
    // without causing problems with other screens that share any tilesets.
    //  -> unused (or used but shared exclusively) across all tilesets the screen may use


    // What I want for swapping is the following:
    //  1. find all screens I want to work on => tilesets
    //  2. find unused flaggabble tiles in the hardest one,
    //     which are also ISOLATED in the others.
    //  3. want these tiles to be unused in ALL relevant tilesets
    //  4. to make this so, find *other* unused flaggable tiles in other tilesets
    //  5. swap the unused with the isolated tiles in the other tilesets

    // Caves:
    //  0a:      90 / 9c
    //  15: 80 / 90 / 9c
    //  19:      90      (will add to 80?)
    //  3e:      90
    //
    // Ideally we could reuse 80's 1/2/3/4 for this
    //  01: 90 | 94 9c
    //  02: 90 | 94 9c
    //  03:      94 9c
    //  04: 90 | 94 9c
    //
    // Need 4 other flaggable tile indices we can swap to?
    //   90: => (1,2 need flaggable; 3 unused; 4 any) => 07, 0e, 10, 12, 13, ..., 20, 21, 22, ...
    //   94 9c: => don't need any flaggable => 05, 3c, 68, 83, 88, 89, 8a, 90, ...
  }


  disjointTilesets() {
    const tilesetByScreen = [];
    for (const loc of this.locations) {
      if (!loc.valid) continue;
      const tileset = loc.tileset;
      const ext = loc.extended ? 0x100 : 0;
      for (const row of loc.screens) {
        for (const s of row) {
          (tilesetByScreen[s + ext] || (tilesetByScreen[s + ext] = new Set())).add(tileset);
        }
      }
    }
    const tiles = new Array(256).fill(0).map(() => new UnionFind());
    for (let s = 0; s < tilesetByScreen.length; s++) {
      if (!tilesetByScreen[s]) continue;
      const ts = new Set();
      for (const row of this.screens[s].tiles) {
        for (const t of row) {
          ts.add(t);
        }
      }
      for (const t of ts) {
        tiles[t].union([...tilesetByScreen[s]]);
      }
    }
    // output
    for (let t = 0; t < tiles.length; t++) {
      const p = tiles[t].sets().map(s => [...s].map(x => x.toString(16)).join(' ')).join(' | ');
      console.log(`Tile ${t.toString(16).padStart(2, 0)}: ${p}`);
    }
    //   if (!tilesetByScreen[i]) {
    //     console.log(`No tileset for screen ${i.toString(16)}`);
    //     continue;
    //   }
    //   union.union([...tilesetByScreen[i]]);
    // }
    // return union.sets();
  }

  // Cycles are not actually cyclic - an explicit loop at the end is required to swap.
  // Variance: [1, 2, null] will cause instances of 1 to become 2 and will
  //           cause properties of 1 to be copied into slot 2
  // Common usage is to swap things out of the way and then copy into the
  // newly-freed slot.  Say we wanted to free up slots [1, 2, 3, 4] and
  // had available/free slots [5, 6, 7, 8] and want to copy from [9, a, b, c].
  // Then cycles will be [1, 5, 9] ??? no
  //  - probably want to do screens separately from tilesets...?
  // NOTE - we don't actually want to change tiles for the last copy...!
  //   in this case, ts[5] <- ts[1], ts[1] <- ts[9], screen.map(1 -> 5)
  //   replace([0x90], [5, 1, ~9])
  //     => 1s replaced with 5s in screens but 9s NOT replaced with 1s.
  // Just build the partition once lazily? then can reuse...
  //   - ensure both sides of replacement have correct partitioning?E
  //     or just do it offline - it's simpler
  // TODO - Sanity check?  Want to make sure nobody is using clobbered tiles?
  swapMetatiles(/** !Array<number> */ tilesets, /** ...!Array<number|!Array<number>> */ ...cycles) {
    // Process the cycles
    const rev = new Map();
    const revArr = seq(0x100);
    const alt = new Map();
    const cpl = x => Array.isArray(x) ? x[0] : x < 0 ? ~x : x;
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.length - 1; i++) {
        if (Array.isArray(cycle[i])) {
          alt.set(cycle[i][0], cycle[i][1]);
          cycle[i] = cycle[i][0];
        }
      }
      for (let i = 0; i < cycle.length - 1; i++) {
        let j = cycle[i];
        let k = cycle[i + 1];
        if (j < 0 || k < 0) continue;
        rev.set(k, j);
        revArr[k] = j;
      }
    }
    //const replacementSet = new Set(replacements.keys());
    // Find instances in (1) screens, (2) tilesets and alternates, (3) tileEffects
    const screens = new Set();
    const tileEffects = new Set();
    tilesets = new Set(tilesets);
    for (const l of this.locations) {
      if (!l.valid) continue;
      if (!tilesets.has(l.tileset)) continue;
      tileEffects.add(l.tileEffects);
      for (const screen of l.allScreens()) {
        screens.add(screen);
      }
    }
    // Do replacements.
    // 1. screens: [5, 1, ~9] => change 1s into 5s
    for (const screen of screens) {
      for (const row of screen.tiles) {
        for (let i = 0; i < row.length; i++) {
          row[i] = revArr[row[i]];
        }
      }
    }
    // 2. tilesets: [5, 1 ~9] => copy 5 <= 1 and 1 <= 9
    for (const tsid of tilesets) {
      const tileset = this.tilesets[(tsid & 0x7f) >>> 2];
      for (const cycle of cycles) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const a = cpl(cycle[i]);
          const b = cpl(cycle[i + 1]);
          for (let j = 0; j < 4; j++) {
            tileset.tiles[j][a] = tileset.tiles[j][b];
          }
          tileset.attrs[a] = tileset.attrs[b];
          if (b < 0x20 && tileset.alternates[b] != b) {
            if (a >= 0x20) throw new Error(`Cannot unflag: ${tsid} ${a} ${b} ${tileset.alternates[b]}`);
            tileset.alternates[a] = tileset.alternates[b];
          }
        }
      }
      for (const [a, b] of alt) {
        tileset.alternates[a] = b;
      }
    }
    // 3. tileEffects
    for (const teid of tileEffects) {
      const tileEffect = this.tileEffects[teid - 0xb3];
      for (const cycle of cycles) {
        for (let i = 0; i < cycle.length - 1; i++) {
          const a = cpl(cycle[i]);
          const b = cpl(cycle[i + 1]);
          tileEffect.effects[a] = tileEffect.effects[b];
        }
      }
      for (const a of alt.keys()) {
        // This bit is required to indicate that the alternative tile's
        // effect should be consulted.  Simply having the flag and the
        // tile index < $20 is not sufficient.
        tileEffect.effects[a] |= 0x08;
      }
    }
    // Done?!?
  }
}


// const intersects = (left, right) => {
//   if (left.size > right.size) return intersects(right, left);
//   for (let i of left) {
//     if (right.has(i)) return true;
//   }
//   return false;
// }

// const TILE_EFFECTS_BY_TILESET = {
//   0x80: 0xb3,
//   0x84: 0xb4,
//   0x88: 0xb5,
//   0x8c: 0xb6,
//   0x90: 0xb7,
//   0x94: 0xb8,
//   0x98: 0xb9,
//   0x9c: 0xba,
//   0xa0: 0xbb,
//   0xa4: 0xbc,
//   0xa8: 0xb5,
//   0xac: 0xbd,
// };

const readString = (arr, addr) => {
  const bytes = [];
  while (arr[addr]) {
    bytes.push(arr[addr++]);
  }
  return String.fromCharCode(...bytes);
};

// Only makes sense in the browser.
const pickFile = () => {
  return new Promise((resolve, reject) => {
    if (window.location.hash != '#reset') {
      const data = window['localStorage'].getItem('rom');
      if (data) {
        return resolve(
            Uint8Array.from(
                new Array(data.length / 2).fill(0).map(
                    (_, i) => Number.parseInt(
                        data[2 * i] + data[2 * i + 1], 16))));
      }
    }
    const upload = document.createElement('input');
    document.body.appendChild(upload);
    upload.type = 'file';
    upload.addEventListener('change', () => {
      const file = upload.files[0];
      const reader = new FileReader();
      reader.addEventListener('loadend', () => {
        const arr = new Uint8Array(reader.result);
        const str = Array.from(arr, x => x.toString(16).padStart(2, 0)).join('');
        window['localStorage'].setItem('rom', str);
        upload.remove();
        resolve(arr);
      });
      reader.readAsArrayBuffer(file);
    });
  });
}


// class DataTableCache {
//   constructor() {
//     this.data = {};
//   }

//   /** Returns the address if found, or null. */
//   find(page, data) {
//     const str = data.join(' ');
//     if (str in this.data) {
//       console.log(`$${object.id.toString(16).padStart(2,0)}: Reusing existing data $${datas[data].toString(16)}`);
//       return this.data[str];
//     }
//     return null;
//   }

//   /** Adds a length of data to the cache. */
//   add(address, data) {
//     const str = data.join(' ');
//     this.data[str] = address;
//   }
// }

// class RomWriter {
//   constructor() {
//     this.available = new Array(0x40000);
//     this.ranges = [];
//     this.writes = [];
//     this.waiting = [];
//   }

//   resort() {
//     this.ranges.sort((x, y) => (x[1] - x[0]) < (y[1] - y[0]));
//   }

//   // Marks a region as available.
//   free(start, end) {
//     const ranges = new Set();
//     if (this.available[start - 1]) {
//       const range = this.available[start - 1];
//       ranges.add(range);
//       start = range.end;
//     }
//     if (this.available[end]) {
//       const range = this.available[end];
//       end = 
//       ranges.add(this.available[end]);
//     }
//     for (let i = start; i < end; i++) {
      
//     while (this.available[end] < 0) {
//       end++;
//     }
//     for (let i = start; i < end; i++) {
//       this.available[i] = ~start;
//     }
//     resort();
//   }

//   // Returns a promise with the actual address of the start.
//   write(page, data) {

//   }

//   commit(prg) {

//   }

// }


// building csv for loc-obj cross-reference table
// seq=(s,e,f)=>new Array(e-s).fill(0).map((x,i)=>f(i+s));
// uniq=(arr)=>{
//   const m={};
//   for (let o of arr) {
//     o[6]=o[5]?1:0;
//     if(!o[5])m[o[2]]=(m[o[2]]||0)+1;
//   }
//   for (let o of arr) {
//     if(o[2] in m)o[6]=m[o[2]];
//     delete m[o[2]];
//   }
//   return arr;
// }
// 'loc,locname,mon,monname,spawn,type,uniq,patslot,pat,palslot,pal2,pal3\n'+
// rom.locations.flatMap(l=>!l||!l.valid?[]:uniq(seq(0xd,0x20,s=>{
//   const o=(l.objects||[])[s-0xd]||null;
//   if (!o) return null;
//   const type=o[2]&7;
//   const m=type?null:0x50+o[3];
//   const patSlot=o[2]&0x80?1:0;
//   const mon=m?rom.objects[m]:null;
//   const palSlot=(mon?mon.palettes(false):[])[0];
//   const allPal=new Set(mon?mon.palettes(true):[]);
//   return [h(l.id),l.name,h(m),'',h(s),type,0,patSlot,m?h((l.spritePatterns||[])[patSlot]):'',palSlot,allPal.has(2)?h((l.spritePalettes||[])[0]):'',allPal.has(3)?h((l.spritePalettes||[])[1]):''];
// }).filter(x=>x))).map(a=>a.join(',')).filter(x=>x).join('\n');


// building the CSV for the location table.
//const h=(x)=>x==null?'null':'$'+x.toString(16).padStart(2,0);
//'id,name,bgm,width,height,animation,extended,tilepat0,tilepat1,tilepal0,tilepal1,tileset,tile effects,exits,sprpat0,sprpat1,sprpal0,sprpal1,obj0d,obj0e,obj0f,obj10,obj11,obj12,obj13,obj14,obj15,obj16,obj17,obj18,obj19,obj1a,obj1b,obj1c,obj1d,obj1e,obj1f\n'+rom.locations.map(l=>!l||!l.valid?'':[h(l.id),l.name,h(l.bgm),l.layoutWidth,l.layoutHeight,l.animation,l.extended,h((l.tilePatterns||[])[0]),h((l.tilePatterns||[])[1]),h((l.tilePalettes||[])[0]),h((l.tilePalettes||[])[1]),h(l.tileset),h(l.tileEffects),[...new Set(l.exits.map(x=>h(x[2])))].join(':'),h((l.spritePatterns||[])[0]),h((l.spritePatterns||[])[1]),h((l.spritePalettes||[])[0]),h((l.spritePalettes||[])[1]),...new Array(19).fill(0).map((v,i)=>((l.objects||[])[i]||[]).slice(2).map(x=>x.toString(16)).join(':'))]).filter(x=>x).join('\n')


export const EXPECTED_CRC32 = 0x1bd39032;
