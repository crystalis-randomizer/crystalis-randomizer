// Give up on modularization, just make something do something...

// Basic idea:
// input for locations, array of checkboxes for flags, canvas for display

import {View} from './view.js';
import {ImageBuffer} from './imagebuffer.js';

class Rom {
  constructor(rom) {
    this.prg = rom.slice(0x10, 0x40010);
    this.chr = rom.slice(0x40010);
  }

  // style is a 7-element array of the bytes in the graphics table:
  //   3 palettes, 2 maps (second unknown), 2 pattern banks
  drawScreen(img, id, style, flag) {
    const base = id << 8;
    // img should be at least 256x256

    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 16; x++) {
        //new Uint32Array(img.data.buffer).fill(this.getColor(0, 0) | 0xff000000);
        let metatile = this.prg[base | y << 4 | x];
        if (metatile < 0x20 && flag) {
          metatile = this.prg[0x13e00 | (style[3] & 0x3c) << 3 | metatile];
        }
        this.drawMetatile(img.shift(16 * x, 16 * y), metatile, style);
      }
    }

    // for (let r = 0; r < 16; r++) {
    //   for (let c = 0; c < 16; c++) {
    //     const id = this.patternId(r * 16 + c, [0,0,0,0,0,0x28,0]);
    //     this.drawTile(img, x + 8 * c, y + 8 * r, r * 16 + c, -1);
    //   }
    // }

  }

  // flag should already have been applied by now.
  // draws a 16x16 metatile.
  drawMetatile(img, id, style) {
//console.log(`drawMetatile(${id}, ${style.join(' ')})`);
    // img should be at least 16x16
    const map = style[3] & 0x3f;
    // look up attributes
    const attrTableBase = 0x13000 + (map << 4);
    const attrTableByte = this.prg[attrTableBase | id >> 2];
    const attr = (attrTableByte >> ((id & 3) << 1)) & 3;
    const palette = attr < 3 ? style[attr] : 0x7f;
    const mapBase = 0x10000 | map << 8;
    // look up the four components
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const table = r << 9 | c << 8;
        const tile = this.patternId(this.prg[mapBase | table | id], style);
        this.drawTile(img.shift(8 * c, 8 * r), tile, palette);
      }
    }
  }

  drawTile(img, id, pal) {
    // img should be at least 8x8
//console.log(`  drawTile(${id}, ${pal})`);
    const pattern = id << 4;
    for (let r = 0; r < 8; r++) {
      let hi = this.chr[pattern | 0x08 | r] << 1;
      let lo = this.chr[pattern | r];
      for (let c = 7; c >= 0; c--) {
        const z = hi & 2 | lo & 1;
        hi >>>= 1; lo >>>= 1;
        if (z) img.draw(c, r, this.getColor(pal, z));
        //if (z) {
          // const i = (y + r) * img.width + x + c << 2;
          // const color = this.getColor(pal, z);
          // img.data[i + 2] = color >>> 16;
          // img.data[i + 1] = (color >>> 8) & 0xff;
          // img.data[i] = color & 0xff;
          // img.data[i + 3] = 0xff;
        //}
      }
    }
  }

  mapSize(loc) {
    const [bgm, w, h] = this.locTable(loc, 0, 3);
    return [Math.min(8, w + 1), Math.min(16, h + 1)];
  }

  getStyle(loc) {
    return this.locTable(loc, 1, 7);
  }

  getScreen(loc, x, y) {
    const [bgm, w, h, anim, ext, ...map] = this.mapSize(loc, 0, 133);
    const layout = this.locTable(loc, 0, 5 + w * h).slice(5);
    const ext = this.prg[layout + 4] ? 0x140 : 0;
    return map[w * y + x] + (ext ? 0x140 : 0);
  }

  getColor(pal, c) {
    // c should be 0..3
    if (pal < 0) return [0x000000, 0xffffff, 0xaaaaaa, 0x555555][c];
    const palette = (pal & 3) << 2 | (pal & 0xfc) << 6 | 0x40f0;
    return colors[this.prg[palette | c] & 0x3f];
  }

  patternId(id, style) {
    const page = id < 0x80 ? style[5] : style[6]
    return (page << 6) + (id & 0x7f);
  }

  prgWord(addr) {
    return this.prg[addr] | this.prg[addr + 1] << 8;
  }

  locTable(loc, table, length) {
    const mapdata = this.prgWord(0x14300 + (loc << 1)) + 0xc000;
    if (mapdata < 0x10000) return new Array(length).fill(0);
    return this.prg.subarray(this.prgWord(mapdata + (table << 1)) + 0xc000);
  }

  npcData(loc) {
    const addr = this.prg[0x19201 + (loc << 1)] | this.prg[0x19202 + (loc << 1)] << 8;
    return this.prg.subarray(addr + 0x10000);
  }
}

// TODO - move colors to view.js?
//   - maybe the API I want is drawTile(x, y, id, attr)?
//     -- attr = 18 bits of colors for palette, 1 bit for hflip, 1 bit for vflip ?
// Will also want to pull out the ROM, and probably cache the tables into
// simple data structures (don't need to be live or smart...)
const colors = [
  0x525252, 0xB40000, 0xA00000, 0xB1003D, 0x740069, 0x00005B, 0x00005F, 0x001840,
  0x002F10, 0x084A08, 0x006700, 0x124200, 0x6D2800, 0x000000, 0x000000, 0x000000,
  0xC4D5E7, 0xFF4000, 0xDC0E22, 0xFF476B, 0xD7009F, 0x680AD7, 0x0019BC, 0x0054B1,
  0x006A5B, 0x008C03, 0x00AB00, 0x2C8800, 0xA47200, 0x000000, 0x000000, 0x000000,
  0xF8F8F8, 0xFFAB3C, 0xFF7981, 0xFF5BC5, 0xFF48F2, 0xDF49FF, 0x476DFF, 0x00B4F7,
  0x00E0FF, 0x00E375, 0x03F42B, 0x78B82E, 0xE5E218, 0x787878, 0x000000, 0x000000,
  0xFFFFFF, 0xFFF2BE, 0xF8B8B8, 0xF8B8D8, 0xFFB6FF, 0xFFC3FF, 0xC7D1FF, 0x9ADAFF,
  0x88EDF8, 0x83FFDD, 0xB8F8B8, 0xF5F8AC, 0xFFFFB0, 0xF8D8F8, 0x000000, 0x000000,
];


class MapsView extends View {
  constructor(rom) {
    super();

    this.rom = rom;
    this.location = -1;
    this.readHash();
    window.addEventListener('hashchange', () => this.readHash());
    this.handle('j', () => this.setLocation((this.location + 1) & 0xff));
    this.handle('k', () => this.setLocation((this.location + 0xff ) & 0xff));
  }

  readHash() {
    const match = /\bloc=([0-9a-f]*)\b/.exec(window.location.hash);
    this.setLocation(match ? Number.parseInt(match[1], 16) : 0);
  }

  setLocation(loc, wd = undefined, ht = undefined) {
    window.history.pushState({}, '', '#loc=' + loc.toString(16));
    this.location = loc;
    const lines = [
      `# Location [loc<0:1:$ff>:$${hex(loc)}]`,
    ];
    // update the controls, then the canvas
    const [bgm, mapWd, mapHt, anim, ext, ...map] = this.rom.locTable(loc, 0, 133);
    const graphics = this.rom.locTable(loc, 1, 7);
    let entrances = this.rom.locTable(loc, 2, 102);
    let exits = this.rom.locTable(loc, 3, 1024);
    let flags = this.rom.locTable(loc, 4, 1024);
    const pal = [0, 1, 2].map(x => hex(graphics[x]));
    const ts = [3, 4].map(x => hex(graphics[x]));
    const pat = [5, 6].map(x => hex(graphics[x]));
    const npcData = this.rom.npcData(loc)
    const invalid = !!npcData[0];
    if (!wd) wd = mapWd + 1;
    if (!ht) ht = mapHt + 1;
    if (wd > 8 || ht > 16) {
      lines.push('Invalid location');
      this.setControls(lines.join('\n'));
      this.update();
      return;
    }
    lines.push(
      `\nLayout:`,
      `  Size: [wd:${wd}] x [ht:${ht}]`,
      `  Animation: [anim:$${hex(anim)}]`,
      `  Extended: [ext:$${hex(ext)}]`,
      `  Screens:`);
    for (let y = 0; y < ht; y++) {
      lines.push(`  [screens.${y}<0:$ff>:$${
                    Array.from(map.slice(y * wd, y * wd + wd), hex).join(',$')},]`);
    }
    lines.push(
      `\nGraphics:`,
      `  Palettes: [pal<0:1:$ff>:$${pal.join(',$')},]`,
      `  Tileset:  [ts<$80:4:$fc>:$${ts.join(',$')},]`,
      `  Patterns: [pat<0:1:$ff>:$${pat.join(',$')},]`);
    lines.push(`\nExits:`);
    for (let i = 0; !invalid && i < exits.length && exits[i] < 0xff; i += 4) {
      const x = exits[i];
      const y = exits[i + 1];
      const s = exits[i + 2];
      const e = exits[i + 3];
      lines.push(`  [@${x * 16}x${(y>>4)*240+(y&15)*16}+16x16]($${
          x.toString(16).padStart(2, 0)}, $${y.toString(16).padStart(2, 0)
          }) => [#loc=${s.toString(16)}:$${s.toString(16).padStart(2, 0)}]:$${
          e.toString(16).padStart(2, 0)}`);
    }
    // TODO - entrances and exits
    // Entrances:
    //   [entrances.0<0:$fff>:$062,$023,]
    // Exits:
    //   [exits.0:$65,$32,] => [#loc=01:$01]:$01
    lines.push('\nFlags:');
    for (let i = 0; !invalid && i < flags.length && flags[i] < 0xff; i += 2) {
      const flag = flags[i];
      const addr = hex(0x64c0 | (flag >> 3)) + ':' + hex(1 << (flag & 7));
      const tile = flags[i + 1];
      const y = tile >> 4;
      const x = tile & 0xf;
      lines.push(`  $${addr} => (${x}, ${y}) [flags.${y}.${x}<checkbox>:0]`);
    }

    // Look at NpcData, too!
    lines.push(`\nNPCs:`);
    let id = 0xd;
    for (let i = 5; !invalid && i < npcData.length - 4 && npcData[i] < 0xff; i += 4) {
      const [y, x, e, f] = npcData.subarray(i, i + 4);
      lines.push(`[@${((x & 0x7f) << 4) + (e & 0x40 ? 8 : 0)}x${fromTileY(y) - 4}+16x32]` +
                 `  ${(id++).toString(16).padStart(2, 0)}: $${
                    y.toString(16).padStart(2, 0)}, $${x.toString(16).padStart(2, 0)}, $${
                    e.toString(16).padStart(2, 0)}, $${f.toString(16).padStart(2, 0)}`);
    }

    this.setControls(lines.join('\n'));
    this.update();
  }

  update(changed = {}) {
    // redraw the canvas, since some parameter changed
    const {loc} = this.options;
    if (changed.loc || this.location != loc) {
      this.setLocation(loc);
    } else if (changed.wd || changed.ht) {
      this.setLocation(loc, this.options.wd, this.options.ht);
    }
    let lastIndex = -1;
    this.animate((frame, draw) => {
      const {pal = [], pat = [], ts = [], wd, ht, anim, ext, screens = [], flags = []} = this.options;
      const buf = ImageBuffer.create(256 * wd, 240 * ht).fill(this.rom.getColor(pal[0], 0));
      let pat1 = pat[1];
      if (anim) {
        let index = frame >> 3 & 7;
        if (index == lastIndex) return;
        lastIndex = index;
        pat1 = this.rom.prg[0x3e779 + (anim << 3) + index];
      } else {
        if (lastIndex == 0) return;
        lastIndex = 0;
      }
      const style = [pal[0], pal[1], pal[2], ts[0], ts[1], pat[0], pat1];
      for (let x = 0; x < wd; x++) {
        for (let y = 0; y < ht; y++) {
          const screen = (screens[y] || [])[x];
          if (screen != null) {
            this.rom.drawScreen(buf.shift(256 * x, 240 * y, 256, 240),
                                screen + (ext ? 0x140 : 0), style, (flags[y] || [])[x]);
          }
        }
      }
      draw(buf);
    });
  }

  mousemove(x, y) {
    const scrX = Math.floor(x / 256);
    const scrY = Math.floor(y / 240);
    const tileX = x % 256 >> 4;
    const tileY = y % 240 >> 4;
    const fineX = x % 256 & 15;
    const fineY = y % 240 & 15;
    const scrId = this.options.screens[scrY][scrX];
    if (!scrId) return;
    const metatileBase = scrId << 8;
    const metatileId = this.rom.prg[metatileBase | tileY << 4 | tileX];
    // TODO - subtile ID, flags, etc
    const attrBase = (this.options.ts[1] << 8) & 0x1fff | 0x12000;
    const attributes = this.rom.prg[attrBase | metatileId];

    const lines = [
      `Screen (${scrX}, ${scrY}): $${hex(scrId)}`,
      `Metatile (${tileX.toString(16)}, ${tileY.toString(16)}): $${hex(metatileId)}`,
      `Attributes: ${hex(attributes)}`,
    ];
    this.showFloater(x, y, lines.join('\n'));
  }
}

const run = async () => {
  const rom = new Rom(await pickFile());

  const view = new MapsView(rom);
  document.body.appendChild(view.element);
};

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

const fromTileY = (y) => (y >> 4) * 240 + (y & 0xf) * 16;

const hex = (x) => x.toString(16).padStart(2, 0);

run();
