// Wrapper around a canvas with built-in capability to do some useful
// things like displaying specific sprites and text.  Also understands
// the ROM's built-in palettes.

export class Canvas {
  constructor(/** !Rom */ rom, /** number */ width, /** number */ height) {
    this.rom = rom;
    this.width = width;
    this.height = height;
    this.element = document.createElement('canvas');
    this.element.width = width;
    this.element.height = height;
    this.ctx = this.element.getContext('2d');
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    this.data = new Uint32Array(width * height);
    this.palettes = new Uint32Array(0x400);

    // initialize palettes
    for (let i = 0; i < 0x100; i++) {
      for (let j = 0; j < 4; j++) {
        const color = COLORS[this.rom.palettes[i].color(j)];
        this.palettes[i << 2 | j] = color | 0xff000000;
      }
    }
  }

  clear(background = null) {
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    const fillColor = background != null ? this.palettes[background << 2] : 0;
    this.data.fill(fillColor);
  }

  toDataUrl(cropToContent = false) {
    // TODO - how to crop to content?  get a data url for subset?
    // https://stackoverflow.com/questions/34242155/how-to-crop-canvas-todataurl
    return this.element.toDataURL('image/png');
  }

  render() {
    const data = this.ctx.getImageData(0, 0, this.width, this.height);
    const uint8 = new Uint8Array(this.data.buffer);
    data.data.set(uint8);
    this.ctx.putImageData(data, 0, 0);
  }

  // attr = palette << 2 | vflip << 1 | hflip
  tile(x, y, id, attr) {
    const pat = this.rom.patterns[id].flip(attr << 6);
    for (let r = 0; r < 8; r++) {
      let hi = pat.pixels[8 | r] << 1;
      let lo = pat.pixels[r];
      for (let c = 7; c >= 0; c--) {
        const z = hi & 2 | lo & 1;
        hi >>>= 1; lo >>>= 1;
        if (z) this.data[(y + r) * this.width + x + c] =
            this.palettes[attr & 0x3fc | z];
      }
    }
    this.minX = Math.min(this.minX, x);
    this.maxX = Math.max(this.maxX, x + 8);
    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y + 8);
  }

  metatile(x, y, id, locid) {
    const loc = this.rom.locations[locid];
    const patterns = loc.tilePatterns;
    const palettes = [...loc.tilePalettes, 0x7f];
    const tileset = rom.tilesets[loc.tileset];
    const palette = palettes[tileset.attrs[id]];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const tile = tileset.tiles[r << 1 | c][id];
        const pattern = patterns[tile & 0x80 ? 1 : 0] << 6 | tile & 0x7f;
        const x1 = x + (c << 3);
        const y1 = y + (r << 3);
        this.tile(x1, y1, pattern, palette << 2);
      }
    }
  }

  text(x, y, text, palette = 0x12) {
    for (let i = 0; i < text.length; i++) {
      this.tile(
          x + 8 * i, y, text.charCodeAt(i) | 0xf00, palette << 2);
    }            
  }
}


const COLORS = [
  0x525252, 0xB40000, 0xA00000, 0xB1003D, 0x740069, 0x00005B, 0x00005F, 0x001840,
  0x002F10, 0x084A08, 0x006700, 0x124200, 0x6D2800, 0x000000, 0x000000, 0x000000,
  0xC4D5E7, 0xFF4000, 0xDC0E22, 0xFF476B, 0xD7009F, 0x680AD7, 0x0019BC, 0x0054B1,
  0x006A5B, 0x008C03, 0x00AB00, 0x2C8800, 0xA47200, 0x000000, 0x000000, 0x000000,
  0xF8F8F8, 0xFFAB3C, 0xFF7981, 0xFF5BC5, 0xFF48F2, 0xDF49FF, 0x476DFF, 0x00B4F7,
  0x00E0FF, 0x00E375, 0x03F42B, 0x78B82E, 0xE5E218, 0x787878, 0x000000, 0x000000,
  0xFFFFFF, 0xFFF2BE, 0xF8B8B8, 0xF8B8D8, 0xFFB6FF, 0xFFC3FF, 0xC7D1FF, 0x9ADAFF,
  0x88EDF8, 0x83FFDD, 0xB8F8B8, 0xF5F8AC, 0xFFFFB0, 0xF8D8F8, 0x000000, 0x000000,
];
