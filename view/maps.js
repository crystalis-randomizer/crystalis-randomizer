// Give up on modularization, just make something do something...

// Basic idea:
// input for locations, array of checkboxes for flags, canvas for display

import {View} from './view.js';
import {Rom} from './rom.js';
import {ImageBuffer} from './imagebuffer.js';



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

  setLocation(id, wd = undefined, ht = undefined) {
    window.history.pushState({}, '', '#loc=' + id.toString(16));
    this.location = id;
    const lines = [
      `# Location [loc<0:1:$ff>:$${hex(id)}]`,
    ];
    // update the controls, then the canvas
    const loc = this.rom.locations[id] || this.rom.locations[0];
    const bgm = loc.bgm;
    const mapWd = loc.width;
    const mapHt = loc.height;
    const anim = loc.animation;
    const ext = loc.extended;
    const pal = loc.tilePalettes;
    const ts = [loc.tileset, loc.tileEffects];
    const pat = loc.tilePatterns;
    const entrances = loc.entrances;
    const exits = loc.exits;
    const flags = loc.flags;
    const spritePal = loc.spritePalettes;
    const spritePat = loc.spritePatterns;
    const objects = loc.objects;
    const invalid = !this.rom.locations[id];
    if (!wd) wd = mapWd;
    if (!ht) ht = mapHt;
    if (wd > 8 || ht > 16) {
      lines.push('Invalid location');
      this.setControls(lines.join('\n'));
      this.update();
      return;
    }
    lines.push(
      `\nMusic: [bgm:${bgm}]`,
      `\nLayout:`,
      `  Size: [wd:${wd}] x [ht:${ht}]`,
      `  Animation: [anim:$${hex(anim)}]`,
      `  Extended: [ext:$${hex(ext)}]`,
      `  Screens:`);
    for (let y = 0; y < ht; y++) {
      const scr = !invalid && loc.screens[y] || new Array(wd).fill(0);
      lines.push(`  [screens.${y}<0:$ff>:$${
                    Array.from(scr, hex).join(',$')},]`);
    }
    lines.push(
      `\nGraphics:`,
      `  Palettes: [pal<0:1:$ff>:$${Array.from(pal, hex).join(',$')},]`,
      `  Tileset:  [ts<$80:4:$fc>:$${Array.from(ts, hex).join(',$')},]`,
      `  Patterns: [pat<0:1:$ff>:$${Array.from(pat, hex).join(',$')},]`);
    lines.push(`\nExits:`);
    for (let i = 0; !invalid && i < exits.length; i++) {
      const [x, y, s, e] = exits[i];
      lines.push(`  [@${x * 16}x${(y>>4)*240+(y&15)*16}+16x16]($${
          hex(x)}, $${hex(y)}) => [#loc=${hex(s)}:$${hex(s)}]:$${hex(e)}`);
    }
    // TODO - entrances and exits
    // Entrances:
    //   [entrances.0<0:$fff>:$062,$023,]
    // Exits:
    //   [exits.0:$65,$32,] => [#loc=01:$01]:$01
    lines.push('\nFlags:');
    for (let i = 0; !invalid && i < flags.length; i++) {
      const [flag, tile] = flags[i];
      const addr = hex(0x64c0 | (flag >> 3)) + ':' + hex(1 << (flag & 7));
      const y = tile >> 4;
      const x = tile & 0xf;
      lines.push(`  $${addr} => (${x}, ${y}) [flags.${y}.${x}<checkbox>:0]`);
    }

    // Look at NpcData, too!
    lines.push(
      `\nNPCs:`,
      `  Palettes: [spritePal<0:1:$ff>:$${Array.from(spritePal, hex).join(',$')},]`,
      `  Patterns: [spritePat<0:1:$ff>:$${Array.from(spritePat, hex).join(',$')},]`);
    let sprId = 0xd;
    for (let i = 0; !invalid && i < objects.length; i++) {
      const line = Array.from(objects[i], hex).join(',$');
      const [y, x, e, f] = objects[i];
      const pos = [((x & 0x7f) << 4) + (e & 0x40 ? 8 : 0), fromTileY(y) - 4].join('x');
      lines.push(`  [@${pos}+16x32]${hex(sprId++)}: [objs.${i}<0:1:$ff>:$${line},]`);
    }

    this.setControls(lines.join('\n'));
    this.update();
  }

  update(changed = {}) {
    // redraw the canvas, since some parameter changed
    const {loc, objs} = this.options;
    if (changed.loc || this.location != loc) {
      this.setLocation(loc);
    } else if (changed.wd || changed.ht) {
      this.setLocation(loc, this.options.wd, this.options.ht);
    }
    let lastIndex = -1;
    this.animate((frame, draw) => {
      const {pal = [], pat = [], ts = [], wd, ht, anim, ext, screens = [], flags = []} =
            this.options;
      let tilePat = [...pat];
      if (anim) {
        let index = frame >> 3 & 7;
        if (index == lastIndex) return;
        lastIndex = index;
        tilePat[1] = this.rom.prg[0x3e779 + (anim << 3) + index];
      } else {
        if (lastIndex == 0) return;
        lastIndex = 0;
      }
      const tileset = this.rom.tilesets[ts[0] >> 2 & 0xf];
      const tilePal = [...pal, 0x7f].map(p => this.rom.palettes[p]);
      const buf = ImageBuffer.create(256 * wd, 240 * ht)
            .fill(colors[tilePal[0].colors[0]]);
      // draw background
      for (let x = 0; x < wd; x++) {
        for (let y = 0; y < ht; y++) {
          const screenId = (screens[y] || [])[x];
          if (screen != null) {
            const screen = this.rom.screens[screenId + (ext ? 0x100 : 0)];
            this.drawScreen(buf.shift(x << 8, 240 * y, 256, 240),
                            screen, tileset, tilePal, tilePat, (flags[y] || [])[x]);
          }
        }
      }
      // draw monsters
      for (const obj of objs) {
        if (obj[2] & 7 != 0) continue;
        const objId = obj[3] + 0x50;
        const pal = this.options.spritePal[obj[2] & 0x80 ? 1 : 0];
        const pat = this.options.spritePat[obj[2] & 0x80 ? 1 : 0];
        // ..... animate???
              
      }
      // done
      draw(buf);
    });
  }

  drawScreen(img, screen, tileset, palettes, patterns, flag) {
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 16; x++) {
        let metatileId = screen.tiles[y][x];
        if (metatileId < 0x20 && flag) {
          metatileId = tileset.alternates[metatileId];
        }
        // draw a metatile
        const palette = palettes[tileset.attrs[metatileId]];
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const tile = tileset.tiles[r << 1 | c][metatileId];
            const pattern = patterns[tile & 0x80 ? 1 : 0] << 6 | tile & 0x7f;
            const shifted = img.shift(x << 4 | c << 3, y << 4 | r << 3);
            this.drawTile(shifted, pattern, palette);
          }
        }
      }
    }
  }

  drawTile(img, id, palette, flip = 0) {
    const pat = this.rom.patterns[id].flip(flip);
    for (let r = 0; r < 8; r++) {
      let hi = pat.pixels[8 | r] << 1;
      let lo = pat.pixels[r];
      for (let c = 7; c >= 0; c--) {
        const z = hi & 2 | lo & 1;
        hi >>>= 1; lo >>>= 1;
        if (z) img.draw(c, r, colors[palette.colors[z]]);
      }
    }
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
    const metatileId = this.rom.screens[(this.options.ext ? 0x100 : 0) | scrId]
          .tiles[tileY][tileX];
    const flagged =
          metatileId < 0x20 && ((this.options.flags || [])[scrY] || [])[scrX] ?
              this.rom.tilesets[this.options.ts[0] >> 2 & 0xf]
                  .alternates[metatileId] :
              metatileId;
    const attributes = this.rom.tileEffects[this.options.ts[1] - 0xb3].effects[flagged];
    // TODO - subtile ID, flags, objects, exits, etc

    const lines = [
      `Screen (${scrX}, ${scrY}): $${hex(scrId)}`,
      `Metatile (${tileX.toString(16)}, ${tileY.toString(16)}): $${hex(flagged)}${
         flagged != metatileId ? ' (' + hex(metatileId) + ')' : ''}`,
      `Attributes: ${hex(attributes)} = ${attributes.toString(2).padStart(8,0)}`,
    ];
    this.showFloater(x, y, lines.join('\n'));
  }
}

const run = async () => {
  const rom = await Rom.load();
  window.rom = rom;

  const view = new MapsView(rom);
  document.body.appendChild(view.element);
};

const fromTileY = (y) => (y >> 4) * 240 + (y & 0xf) * 16;

const hex = (x) => x.toString(16).padStart(2, 0);

run();
