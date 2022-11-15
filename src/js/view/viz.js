import {RegionMap} from './regionmap';

// Wrapper around canvas with a few extra perks:
//   1. scalable
//   2. based on NES tiles
//   3. animation
// This allows a simple API where we just call drawTile(x, y, id)
export class Viz {
  constructor(width, height, frames = 1) {
    this.element = document.createElement('canvas');
    this.width = this.element.width = width;
    this.height = this.element.height = height;
    this.frames = frames;
    this.delay = 7;
    this.data = new Uint32Array(width * height * frames);
    this.regions = new RegionMap();
    this.visibleRegions = new Set();
    this.handlers = {};
    this.element.addEventListener('mousemove', (e) => {
      const props = {};
      let x = e.offsetX;
      let y = e.offsetY;
      let t = e.target;
      while (t && t != this.element.parentElement) {
        x += t.offsetLeft;
        y += t.offsetTop;
        t = t.parentElement;
      }
      // e.target is an overlay, we need to add the overlay position...
      for (const r of this.regions.get(x, y)) {
        Object.assign(props, r.props);
      }
      for (const h of this.handlers['mousemove'] || []) {
        h(props);
      }
    });
    // TODO - what if not added immediately?  maybe have a way to get it back?
    // watch for whether added or not?
    requestAnimationFrame(() => this.animate(0, 0));
  }

  fill(bg) {
    // NOTE: fills all frames.
    this.data.fill(COLORS[bg & 0x3f] | 0xff000000);
  }

  handle(type, handler) {
    (this.handlers[type] = this.handlers[type] || []).push(handler);
  }

  drawTile(x, y, pattern, palette, frame = undefined) {
    // pattern instanceof Pattern
    // palette is array of 4 ints 0..63
    if (frame == null) frame = new Array(this.frames).fill(0).map((_, i) => i);
    if (!(frame instanceof Array)) frame = [frame];
    for (let r = 0; r < 8; r++) {
      let hi = pattern.pixels[8 | r] << 1;
      let lo = pattern.pixels[r];
      for (let c = 7; c >= 0; c--) {
        const z = hi & 2 | lo & 1;
        hi >>>= 1; lo >>>= 1;
        if (z) {
          for (let f of frame) {
            this.data[f * this.width * this.height +
                      this.width * (y + r) + x + c] =
                0xff000000 | COLORS[palette[z] & 0x3f];
          }
        }
      }
    }
  }

  // Makes a region, returning it.
  region(x, y, w, h) {
    // TODO - share regions or make a new one - visibility state is the
    //        main reason to not share I think...?  but if we don't share
    //        then we need to keep track of the regions we make.
    // for (const r of this.regions.get(x, y)) {
    //   if (r.x == x && r.y == y && r.w == w && r.h == h) return r;
    // }
    return new Region(this, x, y, w, h);
  }

  animate(frame, delay) {
    if (this.element.offsetParent == null) return;
    if (delay) {
      requestAnimationFrame(() => this.animate(frame, delay - 1));
      return;
    }
    const frameSize = this.width * this.height * 4;
    const ctx = this.element.getContext('2d');
    const data = ctx.getImageData(0, 0, this.width, this.height);
    const buf = new Uint8Array(this.data.buffer, frameSize * frame, frameSize);
    data.data.set(buf);
    // make regions visible
    for (const r of this.visibleRegions) {
      let i = r.y * this.width + r.x;
      const rh = r.h * this.width * 4;
      const rw = r.w << 2;
      const w4 = this.width << 2;
      const d = data.data;
      for (let w = 0; w < r.w; w++) {
        for (let j = 0; j < 3; j++) {
          d[i + j] = d[i + rh + j] = 0xff;
          d[i + j + w4] = d[i + rh + j - w4] = 0;
        }
        i += 4;
      }
      i = r.y * this.width + r.x;
      for (let h = 0; h < r.h; h++) {
        for (let j = 0; j < 3; j++) {
          d[i + j] = d[i + rw + j] = 0xff;
          if (h && h < r.h - 1) d[i + j + 4] = d[i + rw + j - 4] = 0;
        }
        i += w4;
      }
    }
    // actually draw
    ctx.putImageData(data, 0, 0);
    // queue the next frame
    requestAnimationFrame(() => this.animate((frame + 1) % this.frames, this.delay));
  }

  // TODO - animate() function to just cycle through
  //      - requestAnimationFrame as long as we're in the DOM
  // setFrame() ? or just write field directly...?

  // highlighting, mouse events, etc???
  //   - when drawing a tile, maybe also provide a token for hover?
  //     - draw arbitrary rectangles, not just tiles... - hitbox?
  //   - see through them -event gives all stacked tokens, not just highest

}


// Region has methods like
//   r.show(visible)        ->  can we use a simple XOR here? maybe not
//   r.prop({key: value})  ->  percolated into hover events
class Region {
  constructor(viz, x, y, w, h) {
    this.viz = viz;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.props = {};
    this.visible = false;
    viz.regions.insert(x, x + w, y, y + h, this);
  }

  show(visible) {
    if (this.visible) this.viz.visibleRegions.delete(this);
    this.visible = visible;
    if (visiblw) this.viz.visibleRegions.add(this);
  }

  prop(dict) {
    Object.assign(this.props, dict);
  }
}

//   - maybe the API I want is drawTile(x, y, pattern, attr)?
//     -- attr = 18 bits of colors for palette, 1 bit for hflip, 1 bit for vflip ?
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
