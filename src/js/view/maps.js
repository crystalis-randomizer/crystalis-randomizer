// Give up on modularization, just make something do something...

// Basic idea:
// input for locations, array of checkboxes for flags, canvas for display

import {View} from './view.js';
import {Rom} from '../rom.js';
import {Random} from '../random.js';
import {ImageBuffer} from './imagebuffer.js';

import {World} from '../graph/world.js';

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
    this.handle('k', () => this.setLocation((this.location + 0xff) & 0xff));
    this.handle('a', () => {
      this.annotations++;
      this.setLocation(this.location);
    });
    this.handle('d', () => {
      const canvas = document.getElementsByTagName('canvas')[0];
      const image = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
      const link = document.createElement('a');
      link.download = `map-${this.location.toString(16).padStart(2, 0)}.png`;
      link.href = image;
      link.click();
    });
  }

  readHash() {
    const match = /\bloc=([0-9a-f]*)\b/.exec(window.location.hash);
    this.setLocation(match ? Number.parseInt(match[1], 16) : 0);
  }

  setLocation(id, wd = undefined, ht = undefined) {
    let hash = window.location.hash;
    if (!/\bloc=([0-9a-f]*)\b/.test(hash)) {
      hash = hash && hash.length > 1 ? `${hash}&loc=00` : '#loc=00';
    }
    window.history.replaceState({}, '', hash.replace(/\bloc=[0-9a-f]*/, `loc=${id.toString(16)}`));
    this.location = id;
    const lines = [
      `# Location [loc<0:1:$ff>:$${hex(id)}]`,
      `animated [animated<checkbox>:0]`,
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
    const spritePal = loc.spritePalettes || [0,0];
    const spritePat = loc.spritePatterns || [0,0];
    const objects = loc.spawns || [];
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
    lines.push(`\nEntrances:`);
    for (let i = 0; !invalid && i < entrances.length; i++) {
      const [xl, xh, yl, yh] = entrances[i];
      lines.push(`  [@${xl|xh<<8}x${yl+yh*240}+16x16][entrances.${i}<0:$ff>:$${
                    Array.from(entrances[i], hex).join(',$')},]`);
    }
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
      //const addr = hex(0x64c0 | (flag >> 3)) + ':' + hex(1 << (flag & 7));
      const addr = hex(0x200 | flag);
      const y = tile >> 4;
      const x = tile & 0xf;
      lines.push(`  ${addr} => (${x}, ${y}) [flags.${y}.${x}<checkbox>:0]`);
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
      let objectId = null;
      if ((e & 7) == 0) objectId = (f + 0x50) & 0xff;
      if ((e & 7) == 1) objectId = 0x30;
      let hitboxId = null;
      if (objectId != null) {
        hitboxId = this.rom.objects[objectId].hitbox;
      } else if ((e & 7) == 2) {
        hitboxId = 0x0a;
      }
      const hitbox = hitboxId != null ? this.rom.hitboxes[hitboxId] : null;
      const xc = Math.max(0, ((x & 0x7f) << 4) + (e & 0x40 ? 8 : 0) + (hitbox ? hitbox.x0 + 8 : 0));
      const yc = Math.max(0, fromTileY(y) + (hitbox ? hitbox.y0 + 12 : -4));
      const w = hitbox ? hitbox.w : 16
      const h = hitbox ? hitbox.h : 32;
      // const pos = [((x & 0x7f) << 4) + (e & 0x40 ? 8 : 0), Math.max(0, fromTileY(y) - 4)].join('x');
      lines.push(`  [@${xc}x${yc}+${w}x${h}]${hex(sprId++)}: [objs.${i}<0:1:$ff>:$${line},]`);
    }

    this.setControls(lines.join('\n'));
    this.update();
  }

  update(changed = {}) {
    // redraw the canvas, since some parameter changed
    const opts = Object.assign({
      pal: [], pat: [], ts: [], screens: [], flags: [],
      objs: [], spritePal: [], spritePat: [],
    }, this.options);
    if (changed.loc || this.location != opts.loc) {
      this.setLocation(opts.loc);
    } else if (changed.wd || changed.ht) {
      this.setLocation(opts.loc, opts.wd, opts.ht);
    }
    let lastIndex = -1;
    const draw = (frame, draw) => {
      let tilePat = [...opts.pat];
      // if (opts.anim) {
        let index = frame >> 3 & 7;
        if (index == lastIndex) return;
        lastIndex = index;
        if (opts.anim) tilePat[1] = this.rom.tileAnimations[opts.anim].pages[index];
      // } else {
      //   if (lastIndex == 0) return;
      //   lastIndex = 0;
      // }
      const tileset = this.rom.tilesets[opts.ts[0] >> 2 & 0xf];
      const tilePal = [...opts.pal, 0x7f].map(p => this.rom.palettes[p]);
      const buf = ImageBuffer.create(256 * opts.wd, 240 * opts.ht)
            .fill(colors[tilePal[0].colors[0]]);
      // draw background
      for (let x = 0; x < opts.wd; x++) {
        for (let y = 0; y < opts.ht; y++) {
          const screenId = (opts.screens[y] || [])[x];
          if (screen != null) {
            const screen = this.rom.screens[screenId + (opts.ext ? 0x100 : 0)];
            this.drawScreen(buf, x << 8, 240 * y,
                            screen, tileset, tilePal, tilePat, (opts.flags[y] || [])[x]);
          }
        }
      }
      // TODO - draw simea at each entrance?
      if (this.annotations) {
        // draw monsters
        for (const obj of opts.objs) {
          let pat = opts.spritePat[obj[2] & 0x80 ? 1 : 0];
          let pal = [0, 1, ...opts.spritePal].map(p => this.rom.palettes[(p + 0xb0) & 0xff]);
          let metaspriteId;
          if ((obj[2] & 7) == 0 && (this.annotations & 1)) {
            const objId = obj[3] + 0x50;
            // NOTE: 1 is for wind sword; other swords are 2-4?
            const objData = this.rom.objects[objId];
            if (!objData) continue;
            metaspriteId = objData.metasprite;
            if (objData.action == 0x29) { // blob
              metaspriteId = frame & 32 ? 0x6b : 0x68;
            } else if ([0x2a, 0x5e].includes(objData.action)) {
              // directional walker (soldier, etc); also tower def mech (5e)
              metaspriteId = (((frame >> 5) + 2) & 3) | objData.data[31];
            }
          } else if ((obj[2] & 7) == 1 && (this.annotations & 2)) {
            const npcId = obj[3];
            const npcData = this.rom.npcs[npcId];
            if (!npcData || !npcData.data) continue;
            metaspriteId = (((frame >> 5) + 2) & 3) | npcData.data[3];
          } else if ((obj[2] & 7) == 2 && (this.annotations & 2)) {
            if (obj[3] < 0x80) metaspriteId = 0xaa; // treasure chest
          }
          if (metaspriteId == null) continue;
          let metasprite = this.rom.metasprites[metaspriteId];
          const y = fromTileY(obj[0]) + 0xc;
          const x = ((obj[1] & 0x7f) << 4) + (obj[2] & 0x40 ? 8 : 0) + 8;
          this.drawMetasprite(buf, x, y, metasprite, pal, pat, frame >> 3);
        }
        // Indicate entrances (todo - toggle?)
        if (this.annotations & 4) {
          for (let i = 0; i < (opts.entrances || []).length; i++) {
            const [xl, xh, yl, yh] = opts.entrances[i];
            this.drawText(buf, xh*256+xl-8, yh*240+yl-8, i.toString(16).padStart(2, 0), 0x30);
          }
        }
      }
      // done
      draw(buf);
    };

    if (opts.animated) { // cheap way to prevent excessive cpu
      this.animate(draw);
    } else {
      draw(0, (...args) => this.draw(...args));
    }
  }

  drawScreen(img, x0, y0, screen, tileset, palettes, patterns, flag) {
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 16; x++) {
        let metatileId = screen.tiles[y << 4 | x];
        if (metatileId < 0x20 && flag) {
          metatileId = tileset.alternates[metatileId];
        }
        // draw a metatile
        const palette = palettes[tileset.attrs[metatileId]];
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            const tile = tileset.tiles[r << 1 | c][metatileId];
            const pattern = patterns[tile & 0x80 ? 1 : 0] << 6 | tile & 0x7f;
            const x1 = x0 + (x << 4 | c << 3);
            const y1 = y0 + (y << 4 | r << 3);
            this.drawTile(img, x1, y1, pattern, palette);
          }
        }
      }
    }
  }

  drawMetasprite(img, x, y, metasprite, palettes, patternPage, frame) {
    let mirrored = false;
    if (metasprite.mirrored != null) {
      metasprite = this.rom.metasprites[metasprite.mirrored];
      mirrored = true;
    }
    if (!metasprite || !metasprite.valid) return;
    const version = frame >> 2 & metasprite.frameMask;
    for (let [dx, dy, attr, tile] of metasprite.sprites[version]) {
      //  becomes attr byte, maybe with #$20 (priority) ORed in
      if (dx == 0x80) break;
      dx = signed(dx);
      dy = signed(dy);
      const pattern = patternPage << 6 | tile & 0x3f;
      // TODO - mirroring!!!
      if (mirrored) {
        dx = -8 - dx;
        attr ^= 0x40;
      }
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

  drawText(img, x, y, text, color) {
    for (let i = 0; i < text.length; i++) {
      this.drawTile(
          img, x + 8 * i, y, text.charCodeAt(i) | 0xf00,
          {colors: [0x3f, color, 0x3f, 0x3f]});
    }            
  }

  mousemove(x, y) {
    const scrX = Math.floor(x / 256);
    const scrY = Math.floor(y / 240);
    const tileX = x % 256 >> 4;
    const tileY = y % 240 >> 4;
    const fineX = x % 256 & 15;
    const fineY = y % 240 & 15;
    const opts = Object.assign({
      screens: [], flags: [],
    }, this.options);
    const scrId = opts.screens[scrY][scrX];
    if (!scrId) return;
    const metatileId = this.rom.screens[(opts.ext ? 0x100 : 0) | scrId]
          .tiles[tileY << 4 | tileX];
    const flagged =
          metatileId < 0x20 && (opts.flags[scrY] || [])[scrX] ?
              this.rom.tilesets[opts.ts[0] >> 2 & 0xf]
                  .alternates[metatileId] :
              metatileId;
    const attributes = this.rom.tileEffects[opts.ts[1] - 0xb3].effects[flagged];
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
  const hash = {};
  if (window.location.hash) {
    // look for a patch to apply
    for (const component of window.location.hash.substring(1).split('&')) {
      const split = component.split('=');
      hash[split[0]] = decodeURIComponent(split[1]);
    }
  }
  let patch;
  if (hash['patch']) {
    const p = await loadModule(hash['patch']);
    patch = p && p.apply ? (rom) => p.apply(rom, hash) : undefined;
  }
  const rom = await Rom.load(patch);
  window.rom = rom;
  window.World = World;
  window.world = new World(rom);

  const view = new MapsView(rom);
  document.body.appendChild(view.element);
};

const fromTileY = (y) => (y >> 4) * 240 + (y & 0xf) * 16;

const hex = (x) => x.toString(16).padStart(2, 0);

const signed = (x) => x < 0x80 ? x : x - 0x100;

const loadModule = (url) => {
  if (/^\/|\./.test(url)) throw new Error(`bad extension url: ${url}`);
  if (window.location.href.includes('github.io')) {
    return import(`/${url}.js`).then(m => m && m.default);
  }
  return import(`../${url}.js`).then(m => m && m.default);
}

run();
