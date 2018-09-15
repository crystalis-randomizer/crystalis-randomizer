export class ImageBuffer {
  constructor(parent, x, y, w, h) {
    this.root = parent && parent.root ? parent.root : parent;
    this.data = parent ? parent.data : new Uint32Array(w * h);
    if (x == null) throw new Error('bad x');
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  static create(w, h) {
    return new ImageBuffer(null, 0, 0, w, h);
  }

  fill(color) {
    if (this.root) {
      for (let row = 0; row < this.h; row++) {
        const i = (this.y + row) * this.root.w + this.x;
        this.data.subarray(i, i + this.w).fill(color);
      }
    } else {
      this.data.fill(color | 0xff000000);
    }
    return this;
  }

  draw(x, y, color) {
    check(this, this.x + x, this.y + y);
    const w = this.root ? this.root.w : this.w;
    this.data[(this.y + y) * w + this.x + x] = color | 0xff000000;
  }

  shift(dx, dy, w = this.w - dx, h = this.h - dy) {
    check(this, this.x + dx, this.y + dy, w, h);
    return new ImageBuffer(this, this.x + dx, this.y + dy, w, h);
  }
}

const check = (buf, x, y, w = 1, h = 1) => {
  if (x < buf.x || x >= buf.x + buf.w ||
      y < buf.y || y >= buf.y + buf.h ||
      x + w > buf.x + buf.w || w < 1 ||
      y + h > buf.y + buf.h || h < 1) {
    throw new Error(
        `Out of bounds: ${[x, y, w, h]} vs ${[buf.x, buf.y, buf.w, buf.h]}`);
  }
};
