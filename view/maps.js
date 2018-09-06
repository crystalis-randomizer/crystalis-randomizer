// Give up on modularization, just make something do something...

// Basic idea:
// input for locations, array of checkboxes for flags, canvas for display

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
    const pattern = id << 4;
    for (let r = 0; r < 8; r++) {
      let hi = this.chr[pattern | 0x08 | r] << 1;
      let lo = this.chr[pattern | r];
      for (let c = 7; c >= 0; c--) {
        const z = hi & 2 | lo & 1;
        hi >>>= 1; lo >>>= 1;
        img.draw(c, r, this.getColor(pal, z));
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
    const layout = this.locTable(loc, 0);
    if (!layout) return [0, 0];
    return [
      Math.min(8, this.prg[layout + 1] + 1),
      Math.min(16, this.prg[layout + 2] + 1),
    ];
  }

  getStyle(loc) {
    const graphics = this.locTable(loc, 1);
    return this.prg.slice(graphics, graphics + 7);
  }

  getScreen(loc, x, y) {
    const layout = this.locTable(loc, 0);
    const ext = this.prg[layout + 4] ? 0x14000 : 0;
    return this.prg[layout + 5 + (this.prg[layout + 1] + 1) * y + x] + ext;
    // TODO - add 0x100 if loyout[4] ?
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

  locTable(loc, table) {
    const mapdata = this.prgWord(0x14300 + (loc << 1)) + 0xc000;
    if (mapdata < 0x10000) return 0;
    return this.prgWord(mapdata + (table << 1)) + 0xc000;
  }
}

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

const run = async () => {
  const rom = new Rom(await pickFile());
  // const controls = document.createElement('div');
  // document.body.appendChild(controls);
  // const screenSelect = numberInput(controls, 0, 0xff); // Consider 0x13f for ext
  // TODO - populate a grid that we can edit - possibly even w,h ?

  const styleControls = document.createElement('div');
  document.body.appendChild(styleControls);
  const flagSelect = checkboxInput(styleControls);
  const locationSelect = numberInput(styleControls, 0, 0xff);
  locationSelect.value = Number.parseInt(window.location.hash.substring(1), 16) || 0;
  const textNode = document.createTextNode(' => ');
  styleControls.appendChild(textNode);
  const styleSelect = [
    numberInput(styleControls, 0, 0xff),
    numberInput(styleControls, 0, 0xff),
    numberInput(styleControls, 0, 0xff),
    numberInput(styleControls, 0, 0xfc, 4),
    numberInput(styleControls, 0, 0xff),
    numberInput(styleControls, 0, 0x3f),
    numberInput(styleControls, 0, 0x3f),
  ];

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);

  const update = () => {
    const loc = locationSelect.value;
    const flag = flagSelect.checked;
    const style = styleSelect.map(x => x.value);

    const [w, h] = rom.mapSize(loc);
    canvas.width = 256 * w;
    canvas.height = 240 * h;
    const img = ImageBuffer.create(256 * w, 240 * h);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const screen = rom.getScreen(locationSelect.value, x, y);
        rom.drawScreen(img.shift(256 * x, 240 * y, 256, 240),
                       screen, style, flag);
      }
    }
    img.show(canvas);
    window.location.hash = '#' + locationSelect.value.toString(16);
  };

  for (const el of [flagSelect].concat(styleSelect)) {
    el.addEventListener('change', update);
  }

  const updateLocation = () => {
    const style = rom.getStyle(locationSelect.value);
    for (let i = 0; i < 7; i++) {
      styleSelect[i].value = style[i];
    }
    update();
  };
  locationSelect.addEventListener('change', updateLocation);
  locationSelect.value = 0;
  updateLocation();

  document.body.addEventListener('keyup', e => {
    if (e.key == 'j') {
      locationSelect.value++;
    } else if (e.key == 'k') {
      locationSelect.value--;
    } else if (e.key == 'l') {
      flagSelect.checked = !flagSelect.checked;
    } else {
      return;
    }
    updateLocation();
  });
};

const checkboxInput = (parent) => {
  const el = document.createElement('input');
  el.type = 'checkbox';
  parent.appendChild(el);
  return el;
};

// silly number input doesn't support hex
// for now just work around with an extra span
const numberInput = (parent, min = 0, max = 0xff, step = 1) => {
  const el = document.createElement('input');
  let value = () => Number.parseInt(el.value, 16);
  const pad = max.toString(16).length;
  let setValue = (x) => el.value = x.toString(16).padStart(pad, 0);
  el.type = 'text';
  el.style.width = (max.toString(16).length + 2) + 'em';
  el.value = min.toString(16).padStart(pad, 0);
  el.addEventListener('keyup', e => {
    if (e.key == 'ArrowUp') {
      setValue(Math.min(max, e.ctrlKey ? max : value() + step))
    } else if (e.key == 'ArrowDown') {
      setValue(Math.max(min, e.ctrlKey ? min : value() - step));
    } else {
      return;
    }
    el.dispatchEvent(new Event('change'));
  });
  parent.appendChild(el);
  return {
    get value() {
      return value();
    },
    set value(x) {
      setValue(x);
    },
    addEventListener: el.addEventListener.bind(el),
  };
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

class ImageBuffer {
  constructor(data, dataWidth, x, y, w, h) {
    this.data = data;
    this.dataWidth = dataWidth;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  static create(w, h) {
    return new ImageBuffer(new Uint32Array(w * h), w, 0, 0, w, h);
  }

  draw(x, y, color) {
    this.check(this.x + x, this.y + y);
    this.data[(this.y + y) * this.dataWidth + this.x + x] = color | 0xff000000;
  }

  shift(dx, dy, w = this.w - dx, h = this.h - dy) {
    this.check(this.x + dx, this.y + dy, w, h);
    return new ImageBuffer(this.data, this.dataWidth, this.x + dx, this.y + dy, w, h);
  }

  show(canvas, x, y) {
    if (this.w * this.h != this.data.length) {
      throw new Error('Cannot show subarray');
    }
    const uint8 = new Uint8Array(this.data.buffer);
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(x, y, this.w, this.h);
    data.data.set(uint8);
    ctx.putImageData(data, x, y);
  }

  check(x, y, w = 1, h = 1) {
    if (x < this.x || x >= this.x + this.w ||
        y < this.y || y >= this.y + this.h ||
        x + w > this.x + this.w || w < 1 ||
        y + h > this.y + this.h || h < 1) {
      throw new Error(
          `Out of bounds: ${[x, y, w, h]} vs ${[this.x, this.y, this.w, this.h]}`);
    }
  }

}

run();
