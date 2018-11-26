const seq = (x, f = (i) => i) =>  new Array(x).fill(0).map((_, i) => f(i));
const slice = (arr, start, len) => arr.slice(start, start + len);
const signed = (x) => x < 0x80 ? x : x - 0x100;

const varSlice = (arr, start, width, sentinel, end = Infinity) => {
  const out = [];
  while (start + width <= end && arr[start] != sentinel) {
    out.push(arr.slice(start, start + width));
    start += width;
  }
  return out;
};

const addr = (arr, i, offset = 0) => (arr[i] | arr[i + 1] << 8) + offset;
const group = (width, arr) =>
      seq(arr.length / width, i => slice(arr, i * width, width));
const reverseBits = (x) => 
      ((x * 0x0802 & 0x22110) | (x * 0x8020 & 0x88440)) * 0x10101 >>> 16 & 0xff;
const countBits = (x) => {
  x -= x >> 1 & 0x55;
  x = (x & 0x33) + (x >> 2 & 0x33);
  return (x + (x >> 4)) & 0xf;
};
      

// We could add new locations at these spots, if we want,
// but we should just not bother serializing them into the
// ROM.  We may want to keep track of whether an edit can
// be done in place or else requires a new layout.
const INVALID_LOCATIONS = new Set([
  0x0b, 0x0d, 0x12, 0x13, 0x16, 0x17, 0x1d, 0x1f,
  0x36, 0x37, 0x3a, 0x3b, 0x3f, 0x53, 0x63, 0x66,
  0x67, 0x74, 0x75, 0x76, 0x77, 0x79, 0x7a, 0x7b,
  0x8b, 0x8d, 0x97, 0x99, 0x9a, 0x9b, 0xbd, 0xca,
  0xcc, 0xdb, 0xe6, 0xea, 0xfc, 0xfd, 0xfe, 0xff]);

class Entity {
  constructor(rom, id) {
    this.rom = rom;
    this.id = id;
  }

  toString() {
    return this.constructor.name + ' $' + this.id.toString(16).padStart(2, 0);
  }
}

// TODO - consider adding prepopulated name maps for data
// tables, e.g. my location names, so that an editor could
// use a drop-down menu and show something meaningful.

class Screen extends Entity {
  constructor(rom, id) {
    super(rom, id);
    this.base = (id > 0xff ? 0x40 + id : id) << 8;
    // metatile index
    this.tiles = seq(15, y => slice(rom.prg, this.base | y << 4, 16));
  }

  metatile(y, x) {
    return this.rom.metatiles[this.tiles[y][x]];
  }

  // TODO - accessors for which palettes, tilesets, and patters are used/allowed
}

// Metatile doesn't mean much without tileset, patterns, etc.
// may need to rethink this one, make it a transient object that deps on others.
// class Metatile {
//   constructor(rom, id) {
//     this.rom = rom;
//     this.id = id;
//   }
// }

// Mappping from metatile ID to tile quads and palette number.
class Tileset extends Entity {
  constructor(rom, id) {
    // `id` is MapData[1][3], ranges from $80..$bc in increments of 4.
    super(rom, id);
    const map = id & 0x3f;
    this.tileBase = 0x10000 | map << 8;
    this.attrBase = 0x13000 | map << 4;
    this.alternatesBase = 0x13e00 | map << 3;
    this.tiles = seq(4, q => slice(rom.prg, this.tileBase | q << 8 , 256));
    this.attrs = seq(256, i => rom.prg[this.attrBase | i >> 2] >> ((i & 3) << 1) & 3);
    this.alternates = slice(rom.prg, this.alternatesBase, 32);
  }
}

class TileEffects extends Entity {
  constructor(rom, id) {
    // `id` is MapData[1][4], which ranges from $b3..$bd
    super(rom, id);
    this.base = (id << 8) & 0x1fff | 0x12000;
    this.effects = slice(rom.prg, this.base, 256);
  }
}

class Palette extends Entity {
  constructor(rom, id) {
    super(rom, id);
    this.base = (id & 3) << 2 | (id & 0xfc) << 6 | 0x40f0;
    this.colors = slice(rom.prg, this.base, 4);
  }
  // grayscale palette: [3f, 30, 2d, 0] ??

  color(c) {
    return this.colors[c] & 0x3f;
  }
}

class Pattern extends Entity {
  constructor(rom, id, pixels = undefined) {
    super(rom, id);
    this.pixels = pixels || slice(rom.chr, id << 4, 16);
  }

  pixelAt(y, x) {
    return (this.pixels[y | 8] >> x & 1) << 1 | (this.pixels[y] >> x & 1);
  }

  flipH() {
    return new Pattern(this.rom, -1, this.pixels.map(reverseBits));
  }

  flipV() {
    return new Pattern(this.rom, -1, seq(16, y => this.pixels[y & 8 | ~y & 7]));
  }

  flip(type) {
    let p = this;
    if (type & 0x40) p = p.flipH();
    if (type & 0x80) p = p.flipV();
    return p;
  }
}

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

class Location extends Entity {
  constructor(rom, id) {
    // will include both MapData *and* NpcData, since they share a key.
    super(rom, id);

    this.mapDataPointer = 0x14300 + (id << 1);
    this.mapDataBase = addr(rom.prg, this.mapDataPointer, 0xc000);
    this.valid = this.mapDataBase > 0xc000 && !INVALID_LOCATIONS.has(id);

    this.layoutBase = addr(rom.prg, this.mapDataBase, 0xc000);
    this.graphicsBase = addr(rom.prg, this.mapDataBase + 2, 0xc000);
    this.entrancesBase = addr(rom.prg, this.mapDataBase + 4, 0xc000);
    this.exitsBase = addr(rom.prg, this.mapDataBase + 6, 0xc000);
    this.flagsBase = addr(rom.prg, this.mapDataBase + 8, 0xc000);
    this.pitsBase = this.layoutBase == this.mapDataBase + 10 ? null :
        addr(rom.prg, this.mapDataBase + 10, 0xc000);

    this.bgm = rom.prg[this.layoutBase];
    this.layoutWidth = rom.prg[this.layoutBase + 1];
    this.layoutHeight = rom.prg[this.layoutBase + 2];
    this.animation = rom.prg[this.layoutBase + 3];
    this.extended = rom.prg[this.layoutBase + 4];
    this.screens = seq(
        this.height,
        y => slice(rom.prg, this.layoutBase + 5 + y * this.width, this.width));

    this.tilePalettes = slice(rom.prg, this.graphicsBase, 3);
    this.tileset = rom.prg[this.graphicsBase + 3];
    this.tileEffects = rom.prg[this.graphicsBase + 4];
    this.tilePatterns = slice(rom.prg, this.graphicsBase + 5, 2);

    this.entrances =
        group(4, rom.prg.slice(this.entrancesBase, this.exitsBase));
    this.exits = varSlice(rom.prg, this.exitsBase, 4, 0xff, this.flagsBase);
    this.flags = varSlice(rom.prg, this.flagsBase, 2, 0xff);
    this.pits = this.pitsBase ? varSlice(rom.prg, this.pitsBase, 4, 0xff) : [];

    this.npcDataPointer = 0x19201 + (id << 1);
    this.npcDataBase = addr(rom.prg, this.npcDataPointer, 0x10000);
    const hasNpcData = this.npcDataBase != 0x10000;
    this.spritePalettes =
        hasNpcData ? slice(rom.prg, this.npcDataBase + 1, 2) : null;
    this.spritePatterns =
        hasNpcData ? slice(rom.prg, this.npcDataBase + 3, 2) : null;
    this.objects =
        hasNpcData ? varSlice(rom.prg, this.npcDataBase + 5, 4, 0xff) : null;
  }

  get width() { return this.layoutWidth + 1; }
  get height() { return this.layoutHeight + 1; }
}

class ObjectData extends Entity {
  constructor(rom, id) {
    super(rom, id);

    this.objectDataPointer = 0x1ac00 + (id << 1);
    this.objectDataBase = addr(rom.prg, this.objectDataPointer, 0x10000);
    this.sfx = rom.prg[this.objectDataBase];

    let a = this.objectDataBase + 1;
    this.objectData = [];
    let m = 0;
    for (let i = 0; i < 32; i++) {
      if (!(i & 7)) {
        m = rom.prg[a++];
      }
      this.objectData.push(m & 0x80 ? rom.prg[a++] : 0);
      m <<= 1;
    }
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

  write(rom) {
    // Note: shift of 0x10000 is irrelevant
    this.rom.prg[this.objectDataPointer] = this.objectDataBase & 0xff;
    this.rom.prg[this.objectDataPointer + 1] = (this.objectDataBase >>> 8) & 0xff;
    const data = this.serialize();
    this.rom.prg.subarray(this.objectDataBase, this.objectDataBase + data.length).set(data);
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
    return rom.monsters.filter(m => m.child && rom.adHocSpawns[m.child].object == this.id);
  }

  locations() {
    // TODO - handle non-monster NPCs.
    return rom.locations.filter(l =>
        l && l.objects && l.objects.some(o =>
            (o[2] & 7) == 0 && ((o[3] + 0x50) & 0xff) == this.id));
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
      if (this.mirrored == null) throw new Error('could not find mirrored sprite');
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
}

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
    this.patterns = seq(this.chr.length >> 4, i => new Pattern(this, i));
    this.palettes = seq(0x100, i => new Palette(this, i));
    this.locations = seq(
        0x100, i => INVALID_LOCATIONS.has(i) ? null : new Location(this, i));
    this.tileAnimations = seq(4, i => new TileAnimation(this, i));
    this.hitboxes = seq(24, i => new Hitbox(this, i));
    this.objects = seq(0x100, i => new ObjectData(this, i));
    this.adHocSpawns = seq(0x60, i => new AdHocSpawn(this, i));
    this.metasprites = seq(0x100, i => new Metasprite(this, i));
    this.messages = new Messages(this);
  }

  // TODO - cross-reference monsters/metasprites/metatiles/screens with patterns/palettes
  get monsters() {
    let monsters = new Set();
    for (const l of this.locations) {
      if (!l || !l.objects) continue;
      for (const o of l.objects) {
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
        projectiles.add(rom.objects[rom.adHocSpawns[m.child].object]);
      }
    }
    projectiles = [...projectiles];
    projectiles.sort((x, y) => (x.id - y.id));
    return projectiles;
  }

  // build up a map of monster ID to "default difficulty"
  get monsterLevels() {
    const locationDifficulty = [
      [0x00, 0x0b, 0],
      [0x0c, 0x13, 2],
      [0x14, 0x1f, 1],
      [0x20, 0x3f, 2], // includes both west and north
      [0x40, 0x57, 3], // waterfall valley
      [0x58, 0x5f, 7],
      [0x60, 0x71, 3], // angry sea
      [0x72, 0x8e, 4], // hydra
      [0x8f, 0x9f, 6], // desert, pyramid front
      [0xa0, 0xa6, 7], // pyramid back
      [0xa7, 0xf1, 5], // fortress, etc
      [0xf2, 0xff, 4], // mado
    ];
    const difficulties = [];
    for (const [a, b, d] of locationDifficulty) {
      for (let i = a; i <= b; i++) {
        difficulties[i] = d;
      }
    }
    let monsters = new Map();
    for (const l of this.locations) {
      if (!l || !l.objects) continue;
      for (const o of l.objects) {
        if ((o[2] & 7) != 0) continue;
        const id = (o[3] + 0x50) & 0xff;
        const diff = monsters.has(id) ? monsters.get(id) : 8;
        monsters.set(id, Math.min(diff, difficulties[l.id]));
      }
    }
    monsters = [...monsters];
    monsters.sort((x, y) => (x[0] - y[0]));
    return monsters;
  }

  // Use the browser API to load the ROM.  Use #reset to forget and reload.
  static async load() {
    return new Rom(await pickFile());
  }

  // Don't worry about other datas yet
  writeObjectData() {
    // build up a map from actual data to indexes that point to it
    let addr = 0x1ae00;
    const datas = {};
    for (const object of this.objects) {
      const ser = object.serialize();
      const data = ser.join(' ');
      if (data in datas) {
        object.objectDataBase = datas[data];
      } else {
        object.objectDataBase = addr;
        datas[data] = addr;
        addr += ser.length;
      }
      object.write();
    }
    console.log(`Wrote object data from $1ac00 to $${addr.toString(16).padStart(5, 0)}, saving ${0x1be91 - addr} bytes.`);
    return addr;
  }
}

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
      const data = localStorage.getItem('rom');
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
        localStorage.setItem('rom', str);
        upload.remove();
        resolve(arr);
      });
      reader.readAsArrayBuffer(file);
    });
  });
}
