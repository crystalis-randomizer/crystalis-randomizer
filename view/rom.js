const seq = (x, f = (i) => i) =>  new Array(x).fill(0).map((_, i) => f(i));
const slice = (arr, start, len) => arr.slice(start, start + len);

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

// TODO - consider adding prepopulated name maps for data
// tables, e.g. my location names, so that an editor could
// use a drop-down menu and show something meaningful.

class Screen {
  constructor(rom, id) {
    this.rom = rom;
    this.id = id;
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
class Tileset {
  constructor(rom, id) {
    // `id` is MapData[1][3], ranges from $80..$bc in increments of 4.
    this.rom = rom;
    this.id = id;
    const map = id & 0x3f;
    this.tileBase = 0x10000 | map << 8;
    this.attrBase = 0x13000 | map << 4;
    this.alternatesBase = 0x13e00 | map << 3;
    this.tiles = seq(4, q => slice(rom.prg, this.tileBase | q << 8 , 256));
    this.attrs = seq(256, i => rom.prg[this.attrBase | i >> 2] >> ((i & 3) << 1) & 3);
    this.alternates = slice(rom.prg, this.alternatesBase, 32);
  }
}

class TileEffects {
  constructor(rom, id) {
    // `id` is MapData[1][4], which ranges from $b3..$bd
    this.rom = rom;
    this.id = id;
    this.base = (id << 8) & 0x1fff | 0x12000;
    this.effects = slice(rom.prg, this.base, 256);
  }
}

class Palette {
  constructor(rom, id) {
    this.rom = rom;
    this.id = id;
    this.base = (id & 3) << 2 | (id & 0xfc) << 6 | 0x40f0;
    this.colors = slice(rom.prg, this.base, 4);
  }
  // grayscale palette: [3f, 30, 2d, 0] ??

  color(c) {
    return this.colors[c] & 0x3f;
  }
}

class Pattern {
  constructor(rom, id, pixels = undefined) {
    this.rom = rom;
    this.id = id;
    this.pixels = slice(rom.chr, id << 4, 16);
  }

  pixelAt(y, x) {
    return (this.pixels[y | 8] >> x & 1) << 1 | (this.pixels[y] >> x & 1);
  }

  flipH() {
    return new Pattern(this.rom, this.id, this.pixels.map(x => reverseBits(x)));
  }

  flipV() {
    return new Pattern(this.rom, this.id, seq(16, y => this.pixels[y & 8 | ~y & 7]));
  }

  flip(type) {
    let p = this;
    if (type & 1) p = p.flipH();
    if (type & 2) p = p.flipV();
    return p;
  }
}

class TileAnimation {
  constructor(rom, id) {
    this.rom = rom;
    this.id = id;
    this.base = 0x3e779 + (id << 3);
    this.pages = slice(rom.prg, this.base, 8);
  }
}

class Location {
  constructor(rom, id) {
    // will include both MapData *and* NpcData, since they share a key.
    this.rom = rom;
    this.id = id;

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

class ObjectData {
  constructor(rom, id) {
    this.rom = rom;
    this.id = id;

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
}

class Metasprite {
  constructor(rom, id) {
    this.rom = rom;
    this.id = id;

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
      this.frames = 0;
      this.sprites = [];
    } else {
      this.mirrored = null;
      this.size = this.mirrored ? 0 : rom.prg[this.base];
      this.frames = this.mirrored ? 0 : 1 << countBits(rom.prg[this.base + 1]);

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

export class Rom {
  constructor(rom) {
    this.prg = rom.slice(0x10, 0x40010);
    this.chr = rom.slice(0x40010);

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
    this.objects = seq(0x100, i => new ObjectData(this, i));
    this.metasprites = seq(0x100, i => new Metasprite(this, i));
  }

  tileset(i) {
    return this.tilesets[(i & 0x3f) >> 2];
  }

  // Use the browser API to load the ROM.  Use #reset to forget and reload.
  static async load() {
    return new Rom(await pickFile());
  }
}

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
