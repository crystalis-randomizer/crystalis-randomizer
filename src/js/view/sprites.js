// Give up on modularization, just make something do something...

// Basic idea:
// input for locations, array of checkboxes for flags, canvas for display

import {View} from './view';
import {Rom} from '../rom';
import {ImageBuffer} from './imagebuffer';



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


class SpriteView extends View {
  constructor(rom) {
    super();

    this.rom = rom;
    this.sprite = -1;
    this.readHash();
    window.addEventListener('hashchange', () => this.readHash());
    this.handle('j', () => this.setSprite((this.id + 1) & 0xff));
    this.handle('k', () => this.setSprite((this.id + 0xff ) & 0xff));
  }

  readHash() {
    const match = /\bsprite=([0-9a-f]*)\b/.exec(window.location.hash);
    this.setSprite(match ? Number.parseInt(match[1], 16) : 0);
  }

  setSprite(id) {
    window.history.replaceState({}, '', '#sprite=' + id.toString(16));
    this.id = id;
    let metasprite = this.rom.metasprites[id] || this.rom.metasprites[0];
    let mirrored = false;
    while (metasprite.mirrored != null) {
      mirrored = true;
      metasprite = this.rom.metasprites[metasprite.mirrored];
    }
    const lines = [
      `# Metasprite [id<0:1:$ff>:$${hex(id)}]`,
      `Animated [animated<checkbox>:0]`,
      `Mirrored [mirrored<checkbox>:${mirrored ? 1 : 0}]`,
    ];
    // update the controls, then the canvas
    const patterns = this.options.patterns || (this.options.patterns = [0x41, 0x44, 0x47, 0x7f]);
    const palettes = this.options.palettes || (this.options.palettes = [0, 3, 6, 10]);
    const bg = this.options.bg != null ? this.options.bg : 0x30;
    lines.push(
      `\nPattern banks: [patterns:$${Array.from(patterns, hex).join(',$')}]`,
      `Palettes: [palettes:$${Array.from(palettes, hex).join(',$')}]`,
      `Background: [bg:$${hex(bg)}]`,
      `\nSize: [size:${metasprite.size}]`,
      `Frame Mask: [frameMask:$${hex(metasprite.frameMask)}]`);
    for (let frame = 0; frame < metasprite.frames; frame++) {
      lines.push(`Frame ${frame}`);
      const sprites = metasprite.sprites[frame];
      for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        lines.push(`  [sprites.${frame}.${i}<0:$ff>:$${Array.from(sprite, hex).join(',$')},]`);
      }
    }
    this.version = 0;
    this.setControls(lines.join('\n'));
    this.update();
  }

  update(changed = {}) {
    // redraw the canvas, since some parameter changed
    const opts = Object.assign({
      sprites: [], patterns: [], palettes: [],
    }, this.options);
    if (changed.id || this.id != opts.id) {
      this.setSprite(opts.id);
    }
    let lastIndex = -1;
    const draw = (frame, draw) => {

      // TODO - get a decent viewer for metasprites
      //   - check out mesia metasprite, set up a fun% swap of simea and mesia
      //   - see how well the sword frames transfer - will need mouseovers to
      //     identify pattern IDs since arrangement is not the same
      //   - will also need to change some text...
      //     - might help to make a quick script to add comments on top of
      //       all the dialog lines so that it's easier to read at a glance (and search)
      //     - or maybe instead just extract a messages file with text, addresses, and indexes?
      //     - could do it directly from the ROM rather than the disassembled sources?
      //     - two-way so that we can rebuild text - would want to store some metadata
      //       to minimize deltas

      let index = frame >> (opts.animated ? 3 : 0) & opts.frameMask;
      if (index == lastIndex) return;
      lastIndex = index;
      let sprites = opts.sprites[index];
      if (!sprites) return;
      this.version = index;
      const palettes = [...opts.palettes].map(p => this.rom.palettes[(p + 0xb0) & 0xff]);
      const buf = ImageBuffer.create(256, 240).fill(colors[opts.bg]);
      this.drawMetasprite(buf, 128, 120, opts.mirrored, sprites, palettes, opts.patterns);
      draw(buf);
    };

    this.animate(draw, !opts.animated);
  }

  drawMetasprite(img, x, y, mirrored, sprites, palettes, patterns) {
    for (let [dx, dy, attr, tile] of sprites) {
      //  becomes attr byte, maybe with #$20 (priority) ORed in
      if (dx == 0x80) break;
      dx = signed(dx);
      dy = signed(dy);
      if (mirrored) {
        dx = -8 - dx;
        attr ^= 0x40;
      }
      const pattern = patterns[tile >> 6] << 6 | tile & 0x3f;
      // TODO - mirroring!!!
      if (x + dx + 8 >= img.w || y + dy + 8 >= img.h) continue;
      this.drawTile(img, x + dx, y + dy, pattern, palettes[attr & 3], attr);
    }
  }

  drawTile(img, x, y, id, palette, flip = 0) {
    const pat = this.rom.patterns[id].flip(flip);
    for (let r = 0; r < 8; r++) {
      let hi = pat.pixels[8 | r] << 1;
      let lo = pat.pixels[r];
      for (let c = 7; c >= 0; c--) {
        const z = hi & 2 | lo & 1;
        hi >>>= 1; lo >>>= 1;
        if (z) img.draw(x + c, y + r, colors[palette.colors[z]]);
      }
    }
  }

  mousemove(x, y) {
    const sprites = this.options.sprites[this.version];
    for (let i = 0; i < sprites.length; i++) {
      let [dx, dy, attr, tile] = sprites[i];
      //  becomes attr byte, maybe with #$20 (priority) ORed in
      if (dx == 0x80) break;
      dx = signed(dx);
      dy = signed(dy);
      if (this.options.mirrored) {
        dx = -dx;
      }
      if (x >= 128 + dx && x < 136 + dx && y >= 120 + dy && y < 128 + dy) {
        const patternPage = this.options.patterns[tile >> 6];
        const pattern = patternPage << 6 | tile & 0x3f;
        const lines = [
          `Tile ${i} (${dx}, ${dy}):`,
          `  attr $${hex(attr)}`,
          `  pattern ${hex(patternPage)}:${hex(tile)}`,
        ];
        this.showFloater(x, y, lines.join('\n'));
      }
    }
  }
}

const run = async () => {
  const rom = await Rom.load();
  window.rom = rom;

  const view = new SpriteView(rom);
  document.body.appendChild(view.element);
};

const fromTileY = (y) => (y >> 4) * 240 + (y & 0xf) * 16;

const hex = (x) => x.toString(16).padStart(2, 0);

const signed = (x) => x < 0x80 ? x : x - 0x100;

run();
