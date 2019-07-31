import {Rom} from '../rom.js';
import {DefaultMap} from '../util.js';

export class Graphics {

  /** key is (id)(index) */
  palettes = new Uint32Array(0x400);

  /** key is (tileid)(palette) */
  tiles = new DefaultMap<number, Uint8Array>((() => {
    return (key: number) => {
      const data = new Uint32Array(64);
      const uint8 = new Uint8Array(data.buffer);
      data.fill(0);
      const pal = (key & 0xff) << 2;
      const id = key >>> 8;

      // Plot on canvas
      const pat = this.rom.patterns[id];
      for (let r = 0; r < 8; r++) {
        let hi = pat.pixels[8 | r] << 1;
        let lo = pat.pixels[r];
        for (let c = 7; c >= 0; c--) {
          const z = hi & 2 | lo & 1;
          hi >>>= 1;
          lo >>>= 1;
          if (z) data[r << 3 | c] = this.palettes[pal | z];
        }
      }
      return uint8;
    };
  })());

  /** key is 40 bits: (id)(pat0)(pat1)(tileset)(pal) */
  metatiles = new DefaultMap<number, string>((() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    return (key: number) => {
      ctx.clearRect(0, 0, 16, 16);
      const pal = key % 256;
      key = Math.floor(key / 256);
      const id = key >>> 24;
      const pats = [(key >>> 16) & 0xff, (key >>> 8) & 0xff];
      const ts = this.rom.tileset(key & 0xff);
      // Plot on the canvas
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const tile = ts.tiles[r << 1 | c][id];
          const data =
              this.tiles.get(pats[tile >>> 7] << 14 | (tile & 0x7f) << 8 | pal);
          const imgData = ctx.getImageData(c << 3, r << 3, 8, 8);
          imgData.data.set(data);
          ctx.putImageData(imgData, c << 3, r << 3);
        }
      }
      return canvas.toDataURL('image/png');      
    };
  })());

  constructor(readonly rom: Rom) {
    this.rebuildPalettes();
  }

  rebuildPalettes() {
    for (let i = 0; i < 0x100; i++) {
      for (let j = 0; j < 4; j++) {
        const color = COLORS[this.rom.palettes[i].color(j)];
        this.palettes[i << 2 | j] = color | 0xff000000;
      }
    }
  }

  metatile(id: number, pats: [number, number], tileset: number, pal: number): string {
    return this.metatiles.get(
        id * 0x100000000 + (pats[0] << 24 | pats[1] << 16 | tileset << 8 | pal));
  }

  paletteCss(id: number, index: number = 0): string {
    const rgb = this.palettes[id << 2 | index];
    return `rgb(${rgb & 0xff}, ${rgb >> 8 & 0xff}, ${rgb >> 16 & 0xff})`;
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
