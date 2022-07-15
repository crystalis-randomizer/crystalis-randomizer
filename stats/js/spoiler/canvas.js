import { die } from '../assert.js';
import { seq } from '../rom/util.js';
export class Canvas {
    constructor(rom, height, width, layers = 1) {
        this.rom = rom;
        this._width = width;
        this._height = height;
        this.element = document.createElement('div');
        this.canvas = document.createElement('canvas');
        this.element.appendChild(this.canvas);
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d') || die();
        this._minX = this._minY = Infinity;
        this._maxX = this._maxY = -Infinity;
        this.palettes = new Uint32Array(0x400);
        this.layers = seq(layers, () => new Uint32Array(width * height));
        this.data = this.layers[0];
        for (let i = 0; i < 0x100; i++) {
            for (let j = 0; j < 4; j++) {
                const color = COLORS[rom.palettes[i].color(j)];
                this.palettes[i << 2 | j] = color | 0xff000000;
            }
        }
    }
    useLayer(layer) {
        this.data = this.layers[layer] || die(`Bad layer: ${layer}`);
    }
    resizeWidth(arr, width) {
        const data = new Uint32Array(width * this._height);
        const min = Math.min(width, this._width);
        for (let y = 0; y < this._height; y++) {
            data.subarray(y * width, y + width + min)
                .set(arr.subarray(y * this._width, y * this._width + min));
        }
        return data;
    }
    resizeHeight(arr, height) {
        const data = new Uint32Array(this._width * height);
        const min = this._width * Math.min(height, this._height);
        data.subarray(0, min).set(arr.subarray(0, min));
        return data;
    }
    get width() { return this._width; }
    set width(width) {
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i] = this.resizeWidth(this.layers[i], width);
        }
        this._width = width;
        this.canvas.width = width;
    }
    get height() { return this._height; }
    set height(height) {
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i] = this.resizeHeight(this.layers[i], height);
        }
        this._height = height;
        this.canvas.height = height;
    }
    get minX() { return this._minX; }
    get maxX() { return this._maxX; }
    get minY() { return this._minY; }
    get maxY() { return this._maxY; }
    fill(color) {
        this.data.fill(color);
    }
    clear(background) {
        const fillColor = background != null ? this.palettes[background << 2] : 0;
        this._minX = this._minY = Infinity;
        this._maxX = this._maxY = -Infinity;
        this.layers[0].fill(fillColor);
        for (let i = 1; i < this.layers.length; i++) {
            this.layers[i].fill(0);
        }
    }
    toDataUrl(cropToContent = false) {
        return this.canvas.toDataURL('image/png');
    }
    render() {
        let canvas = this.canvas;
        let ctx = this.ctx;
        for (let i = 0; i < this.layers.length; i++) {
            if (i) {
                canvas = document.createElement('canvas');
                canvas.width = this.canvas.width;
                canvas.height = this.canvas.height;
                ctx = canvas.getContext('2d') || die();
            }
            const uint8 = new Uint8Array(this.layers[i].buffer);
            const data = ctx.getImageData(0, 0, this._width, this._height);
            data.data.set(uint8);
            ctx.putImageData(data, 0, 0);
            if (i)
                this.ctx.drawImage(canvas, 0, 0);
        }
    }
    rect(y, x, height, width, color) {
        const y0 = Math.max(0, y);
        const x0 = Math.max(0, x);
        const y1 = Math.min(this._height, y + height);
        const x1 = Math.min(this._width, x + width);
        for (y = y0; y < y1; y++) {
            for (x = x0; x < x1; x++) {
                this.data[y * this._width + x] = color;
            }
        }
    }
    tile(y, x, id, attr) {
        if (x < 0 || y < 0 || x + 8 >= this._width || y + 8 >= this._height)
            return;
        const pat = this.rom.patterns.get(id).flip(attr << 6);
        for (let r = 0; r < 8; r++) {
            let hi = pat.pixels[8 | r] << 1;
            let lo = pat.pixels[r];
            for (let c = 7; c >= 0; c--) {
                const z = hi & 2 | lo & 1;
                hi >>>= 1;
                lo >>>= 1;
                if (z) {
                    this.data[(y + r) * this._width + x + c] =
                        this.palettes[attr & 0x3fc | z];
                }
            }
        }
        this._minX = Math.min(this._minX, x);
        this._maxX = Math.max(this._maxX, x + 8);
        this._minY = Math.min(this._minY, y);
        this._maxY = Math.max(this._maxY, y + 8);
    }
    metatile(y, x, id, locid, frame = 0) {
        const loc = this.rom.locations[locid];
        const patterns = [...loc.tilePatterns];
        if (loc.animation) {
            patterns[1] = this.rom.tileAnimations[loc.animation].pages[frame & 7];
        }
        const palettes = [...loc.tilePalettes, 0x7f];
        const tileset = this.rom.tilesets[loc.tileset];
        const palette = palettes[tileset.attrs[id]];
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
                const tile = tileset.tiles[r << 1 | c][id];
                const pattern = patterns[tile & 0x80 ? 1 : 0] << 6 | tile & 0x7f;
                const x1 = x + (c << 3);
                const y1 = y + (r << 3);
                this.tile(y1, x1, pattern, palette << 2);
            }
        }
    }
    metasprite(y, x, id, locid, offset = 0, frame = 0) {
        const loc = this.rom.locations[locid];
        let metasprite = this.rom.metasprites[id];
        const patterns = [0x40, 0x42, ...loc.spritePatterns];
        const palettes = [0, 1, ...loc.spritePalettes];
        let mirrored = false;
        if (metasprite.mirrored != null) {
            metasprite = this.rom.metasprites[metasprite.mirrored];
            mirrored = true;
        }
        if (!metasprite || !metasprite.used)
            return;
        const version = frame & metasprite.frameMask;
        for (let [dx, dy, attr, tile] of metasprite.sprites[version]) {
            if (dx == 0x80)
                break;
            dx = signed(dx);
            dy = signed(dy);
            tile = (tile + offset) & 0xff;
            const patternPage = patterns[tile >> 6];
            const palette = (palettes[attr & 3] + 0xb0) & 0xff;
            const pattern = patternPage << 6 | tile & 0x3f;
            if (mirrored) {
                dx = -8 - dx;
                attr ^= 0x40;
            }
            this.tile(y + dy, x + dx, pattern, palette << 2 | attr >> 6);
        }
    }
    text(y, x, text, palette = 0x12) {
        for (let i = 0; i < text.length; i++) {
            this.tile(y, x + 8 * i, text.charCodeAt(i) | 0xf00, palette << 2);
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
function signed(x) {
    return x < 0x80 ? x : x - 0x100;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL3Nwb2lsZXIvY2FudmFzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFakMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBTXJDLE1BQU0sT0FBTyxNQUFNO0lBaUJqQixZQUFxQixHQUFRLEVBQUUsTUFBYyxFQUFFLEtBQWEsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUFuRCxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQzNCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDNUIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1FBQ25DLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLFFBQVEsQ0FBQztRQUNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksV0FBVyxDQUFDLEtB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LEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVE7SUFDOUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVE7SUFDOUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVE7SUFDOUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVE7Q0FDL0UsQ0FBQztBQUVGLFNBQVMsTUFBTSxDQUFDLENBQVM7SUFDdkIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDbEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7ZGllfSBmcm9tICcuLi9hc3NlcnQuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQgeyBzZXEgfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5cbi8vIFdyYXBwZXIgYXJvdW5kIGEgY2FudmFzIHdpdGggYnVpbHQtaW4gY2FwYWJpbGl0eSB0byBkbyBzb21lIHVzZWZ1bFxuLy8gdGhpbmdzIGxpa2UgZGlzcGxheWluZyBzcGVjaWZpYyBzcHJpdGVzIGFuZCB0ZXh0LiAgQWxzbyB1bmRlcnN0YW5kc1xuLy8gdGhlIFJPTSdzIGJ1aWx0LWluIHBhbGV0dGVzLlxuXG5leHBvcnQgY2xhc3MgQ2FudmFzIHtcblxuICByZWFkb25seSBlbGVtZW50OiBIVE1MRGl2RWxlbWVudDtcblxuICBwcml2YXRlIHJlYWRvbmx5IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFsZXR0ZXM6IFVpbnQzMkFycmF5O1xuXG4gIHByaXZhdGUgX2hlaWdodDogbnVtYmVyO1xuICBwcml2YXRlIF93aWR0aDogbnVtYmVyO1xuICBwcml2YXRlIF9taW5ZOiBudW1iZXI7XG4gIHByaXZhdGUgX21heFk6IG51bWJlcjtcbiAgcHJpdmF0ZSBfbWluWDogbnVtYmVyO1xuICBwcml2YXRlIF9tYXhYOiBudW1iZXI7XG4gIHByaXZhdGUgZGF0YTogVWludDMyQXJyYXk7XG4gIHByaXZhdGUgbGF5ZXJzOiBVaW50MzJBcnJheVtdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLCBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlciwgbGF5ZXJzID0gMSkge1xuICAgIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKTtcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJykgfHwgZGllKCk7XG4gICAgdGhpcy5fbWluWCA9IHRoaXMuX21pblkgPSBJbmZpbml0eTtcbiAgICB0aGlzLl9tYXhYID0gdGhpcy5fbWF4WSA9IC1JbmZpbml0eTtcbiAgICB0aGlzLnBhbGV0dGVzID0gbmV3IFVpbnQzMkFycmF5KDB4NDAwKTtcbiAgICB0aGlzLmxheWVycyA9IHNlcShsYXllcnMsICgpID0+IG5ldyBVaW50MzJBcnJheSh3aWR0aCAqIGhlaWdodCkpO1xuICAgIHRoaXMuZGF0YSA9IHRoaXMubGF5ZXJzWzBdO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSBwYWxldHRlc1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHgxMDA7IGkrKykge1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA0OyBqKyspIHtcbiAgICAgICAgY29uc3QgY29sb3IgPSBDT0xPUlNbcm9tLnBhbGV0dGVzW2ldLmNvbG9yKGopXTtcbiAgICAgICAgdGhpcy5wYWxldHRlc1tpIDw8IDIgfCBqXSA9IGNvbG9yIHwgMHhmZjAwMDAwMDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1c2VMYXllcihsYXllcjogbnVtYmVyKSB7XG4gICAgdGhpcy5kYXRhID0gdGhpcy5sYXllcnNbbGF5ZXJdIHx8IGRpZShgQmFkIGxheWVyOiAke2xheWVyfWApO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNpemVXaWR0aChhcnI6IFVpbnQzMkFycmF5LCB3aWR0aDogbnVtYmVyKTogVWludDMyQXJyYXkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDMyQXJyYXkod2lkdGggKiB0aGlzLl9oZWlnaHQpO1xuICAgIGNvbnN0IG1pbiA9IE1hdGgubWluKHdpZHRoLCB0aGlzLl93aWR0aCk7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLl9oZWlnaHQ7IHkrKykge1xuICAgICAgZGF0YS5zdWJhcnJheSh5ICogd2lkdGgsIHkgKyB3aWR0aCArIG1pbilcbiAgICAgICAgICAuc2V0KGFyci5zdWJhcnJheSh5ICogdGhpcy5fd2lkdGgsIHkgKiB0aGlzLl93aWR0aCArIG1pbikpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzaXplSGVpZ2h0KGFycjogVWludDMyQXJyYXksIGhlaWdodDogbnVtYmVyKTogVWludDMyQXJyYXkge1xuICAgIGNvbnN0IGRhdGEgPSBuZXcgVWludDMyQXJyYXkodGhpcy5fd2lkdGggKiBoZWlnaHQpO1xuICAgIGNvbnN0IG1pbiA9IHRoaXMuX3dpZHRoICogTWF0aC5taW4oaGVpZ2h0LCB0aGlzLl9oZWlnaHQpO1xuICAgIGRhdGEuc3ViYXJyYXkoMCwgbWluKS5zZXQoYXJyLnN1YmFycmF5KDAsIG1pbikpO1xuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgZ2V0IHdpZHRoKCkgeyByZXR1cm4gdGhpcy5fd2lkdGg7IH1cbiAgc2V0IHdpZHRoKHdpZHRoOiBudW1iZXIpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmxheWVyc1tpXSA9IHRoaXMucmVzaXplV2lkdGgodGhpcy5sYXllcnNbaV0sIHdpZHRoKTtcbiAgICB9XG4gICAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICB9XG5cbiAgZ2V0IGhlaWdodCgpIHsgcmV0dXJuIHRoaXMuX2hlaWdodDsgfVxuICBzZXQgaGVpZ2h0KGhlaWdodDogbnVtYmVyKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxheWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5sYXllcnNbaV0gPSB0aGlzLnJlc2l6ZUhlaWdodCh0aGlzLmxheWVyc1tpXSwgaGVpZ2h0KTtcbiAgICB9XG4gICAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgfVxuXG4gIGdldCBtaW5YKCkgeyByZXR1cm4gdGhpcy5fbWluWDsgfVxuICBnZXQgbWF4WCgpIHsgcmV0dXJuIHRoaXMuX21heFg7IH1cbiAgZ2V0IG1pblkoKSB7IHJldHVybiB0aGlzLl9taW5ZOyB9XG4gIGdldCBtYXhZKCkgeyByZXR1cm4gdGhpcy5fbWF4WTsgfVxuXG4gIGZpbGwoY29sb3I6IG51bWJlcikge1xuICAgIHRoaXMuZGF0YS5maWxsKGNvbG9yKTtcbiAgfVxuXG4gIGNsZWFyKGJhY2tncm91bmQ/OiBudW1iZXIpIHtcbiAgICBjb25zdCBmaWxsQ29sb3IgPSBiYWNrZ3JvdW5kICE9IG51bGwgPyB0aGlzLnBhbGV0dGVzW2JhY2tncm91bmQgPDwgMl0gOiAwO1xuICAgIHRoaXMuX21pblggPSB0aGlzLl9taW5ZID0gSW5maW5pdHk7XG4gICAgdGhpcy5fbWF4WCA9IHRoaXMuX21heFkgPSAtSW5maW5pdHk7XG4gICAgdGhpcy5sYXllcnNbMF0uZmlsbChmaWxsQ29sb3IpO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgdGhpcy5sYXllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMubGF5ZXJzW2ldLmZpbGwoMCk7XG4gICAgfVxuICB9XG5cbiAgdG9EYXRhVXJsKGNyb3BUb0NvbnRlbnQ6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgIC8vIFRPRE8gLSBob3cgdG8gY3JvcCB0byBjb250ZW50PyAgZ2V0IGEgZGF0YSB1cmwgZm9yIHN1YnNldD9cbiAgICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNDI0MjE1NS9ob3ctdG8tY3JvcC1jYW52YXMtdG9kYXRhdXJsXG4gICAgcmV0dXJuIHRoaXMuY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvcG5nJyk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgbGV0IGNhbnZhcyA9IHRoaXMuY2FudmFzO1xuICAgIGxldCBjdHggPSB0aGlzLmN0eDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSkge1xuICAgICAgICBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgY2FudmFzLndpZHRoID0gdGhpcy5jYW52YXMud2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIHx8IGRpZSgpO1xuICAgICAgfVxuICAgICAgY29uc3QgdWludDggPSBuZXcgVWludDhBcnJheSh0aGlzLmxheWVyc1tpXS5idWZmZXIpO1xuICAgICAgY29uc3QgZGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG4gICAgICBkYXRhLmRhdGEuc2V0KHVpbnQ4KTtcbiAgICAgIGN0eC5wdXRJbWFnZURhdGEoZGF0YSwgMCwgMCk7XG4gICAgICBpZiAoaSkgdGhpcy5jdHguZHJhd0ltYWdlKGNhbnZhcywgMCwgMCk7XG4gICAgfSAgICAgICAgXG4gIH1cblxuICByZWN0KHk6IG51bWJlciwgeDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlciwgd2lkdGg6IG51bWJlciwgY29sb3I6IG51bWJlcikge1xuICAgIGNvbnN0IHkwID0gTWF0aC5tYXgoMCwgeSk7XG4gICAgY29uc3QgeDAgPSBNYXRoLm1heCgwLCB4KTtcbiAgICBjb25zdCB5MSA9IE1hdGgubWluKHRoaXMuX2hlaWdodCwgeSArIGhlaWdodCk7XG4gICAgY29uc3QgeDEgPSBNYXRoLm1pbih0aGlzLl93aWR0aCwgeCArIHdpZHRoKTtcbiAgICBmb3IgKHkgPSB5MDsgeSA8IHkxOyB5KyspIHtcbiAgICAgIGZvciAoeCA9IHgwOyB4IDwgeDE7IHgrKykge1xuICAgICAgICB0aGlzLmRhdGFbeSAqIHRoaXMuX3dpZHRoICsgeF0gPSBjb2xvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhdHRyID0gcGFsZXR0ZSA8PCAyIHwgdmZsaXAgPDwgMSB8IGhmbGlwXG4gIHRpbGUoeTogbnVtYmVyLCB4OiBudW1iZXIsIGlkOiBudW1iZXIsIGF0dHI6IG51bWJlcikge1xuICAgIGlmICh4IDwgMCB8fCB5IDwgMCB8fCB4ICsgOCA+PSB0aGlzLl93aWR0aCB8fCB5ICsgOCA+PSB0aGlzLl9oZWlnaHQpIHJldHVybjtcbiAgICBjb25zdCBwYXQgPSB0aGlzLnJvbS5wYXR0ZXJucy5nZXQoaWQpLmZsaXAoYXR0ciA8PCA2KTtcbiAgICBmb3IgKGxldCByID0gMDsgciA8IDg7IHIrKykge1xuICAgICAgbGV0IGhpID0gcGF0LnBpeGVsc1s4IHwgcl0gPDwgMTtcbiAgICAgIGxldCBsbyA9IHBhdC5waXhlbHNbcl07XG4gICAgICBmb3IgKGxldCBjID0gNzsgYyA+PSAwOyBjLS0pIHtcbiAgICAgICAgY29uc3QgeiA9IGhpICYgMiB8IGxvICYgMTtcbiAgICAgICAgaGkgPj4+PSAxOyBsbyA+Pj49IDE7XG4gICAgICAgIGlmICh6KSB7XG4gICAgICAgICAgdGhpcy5kYXRhWyh5ICsgcikgKiB0aGlzLl93aWR0aCArIHggKyBjXSA9XG4gICAgICAgICAgICAgIHRoaXMucGFsZXR0ZXNbYXR0ciAmIDB4M2ZjIHwgel07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fbWluWCA9IE1hdGgubWluKHRoaXMuX21pblgsIHgpO1xuICAgIHRoaXMuX21heFggPSBNYXRoLm1heCh0aGlzLl9tYXhYLCB4ICsgOCk7XG4gICAgdGhpcy5fbWluWSA9IE1hdGgubWluKHRoaXMuX21pblksIHkpO1xuICAgIHRoaXMuX21heFkgPSBNYXRoLm1heCh0aGlzLl9tYXhZLCB5ICsgOCk7XG4gIH1cblxuICBtZXRhdGlsZSh5OiBudW1iZXIsIHg6IG51bWJlciwgaWQ6IG51bWJlciwgbG9jaWQ6IG51bWJlciwgZnJhbWUgPSAwKSB7XG4gICAgY29uc3QgbG9jID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2lkXTtcbiAgICBjb25zdCBwYXR0ZXJucyA9IFsuLi5sb2MudGlsZVBhdHRlcm5zXTtcbiAgICBpZiAobG9jLmFuaW1hdGlvbikge1xuICAgICAgLy8gTk9URTogVGhpcyB3aWxsIGF1dG9tYXRpY2FsbHkgdGFrZSBjYXJlIG9mIGNvcnJ1cHRlZCBkZXNlcnQgZ3JhcGhjaXNcbiAgICAgIHBhdHRlcm5zWzFdID0gdGhpcy5yb20udGlsZUFuaW1hdGlvbnNbbG9jLmFuaW1hdGlvbl0ucGFnZXNbZnJhbWUgJiA3XTtcbiAgICB9XG4gICAgY29uc3QgcGFsZXR0ZXMgPSBbLi4ubG9jLnRpbGVQYWxldHRlcywgMHg3Zl07XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXRzW2xvYy50aWxlc2V0XTtcbiAgICBjb25zdCBwYWxldHRlID0gcGFsZXR0ZXNbdGlsZXNldC5hdHRyc1tpZF1dO1xuICAgIGZvciAobGV0IHIgPSAwOyByIDwgMjsgcisrKSB7XG4gICAgICBmb3IgKGxldCBjID0gMDsgYyA8IDI7IGMrKykge1xuICAgICAgICBjb25zdCB0aWxlID0gdGlsZXNldC50aWxlc1tyIDw8IDEgfCBjXVtpZF07XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSBwYXR0ZXJuc1t0aWxlICYgMHg4MCA/IDEgOiAwXSA8PCA2IHwgdGlsZSAmIDB4N2Y7XG4gICAgICAgIGNvbnN0IHgxID0geCArIChjIDw8IDMpO1xuICAgICAgICBjb25zdCB5MSA9IHkgKyAociA8PCAzKTtcbiAgICAgICAgdGhpcy50aWxlKHkxLCB4MSwgcGF0dGVybiwgcGFsZXR0ZSA8PCAyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIG9mZnNldCB1c3VhbGx5IDAgb3IgMHg0MCwgYnV0IHNvbWV0aW1lcyBpcyBhIG9uZS1vZmYuXG4gICAqIEBwYXJhbSBmcmFtZSBhbmltYXRpb24gZnJhbWUuXG4gICAqL1xuICBtZXRhc3ByaXRlKHk6IG51bWJlciwgeDogbnVtYmVyLCBpZDogbnVtYmVyLCBsb2NpZDogbnVtYmVyLFxuICAgICAgICAgICAgIG9mZnNldCA9IDAsIGZyYW1lID0gMCkge1xuICAgIGNvbnN0IGxvYyA9IHRoaXMucm9tLmxvY2F0aW9uc1tsb2NpZF07XG4gICAgbGV0IG1ldGFzcHJpdGUgPSB0aGlzLnJvbS5tZXRhc3ByaXRlc1tpZF07XG4gICAgLy8gTk9URTogdGhpcyBpcyBzd29yZCBvZiB3aW5kIC0gZWxzZSBwYXRbMV0gYW5kIHBhbFsxXSBnZXQgKzEsMiwzIGFkZGVkXG4gICAgY29uc3QgcGF0dGVybnMgPSBbMHg0MCwgMHg0MiwgLi4ubG9jLnNwcml0ZVBhdHRlcm5zXTtcbiAgICBjb25zdCBwYWxldHRlcyA9IFswLCAxLCAuLi5sb2Muc3ByaXRlUGFsZXR0ZXNdO1xuICAgIGxldCBtaXJyb3JlZCA9IGZhbHNlO1xuICAgIGlmIChtZXRhc3ByaXRlLm1pcnJvcmVkICE9IG51bGwpIHtcbiAgICAgIG1ldGFzcHJpdGUgPSB0aGlzLnJvbS5tZXRhc3ByaXRlc1ttZXRhc3ByaXRlLm1pcnJvcmVkXTtcbiAgICAgIG1pcnJvcmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCFtZXRhc3ByaXRlIHx8ICFtZXRhc3ByaXRlLnVzZWQpIHJldHVybjtcbiAgICBjb25zdCB2ZXJzaW9uID0gZnJhbWUgJiBtZXRhc3ByaXRlLmZyYW1lTWFzaztcbiAgICBmb3IgKGxldCBbZHgsIGR5LCBhdHRyLCB0aWxlXSBvZiBtZXRhc3ByaXRlLnNwcml0ZXNbdmVyc2lvbl0pIHtcbiAgICAgIC8vICBiZWNvbWVzIGF0dHIgYnl0ZSwgbWF5YmUgd2l0aCAjJDIwIChwcmlvcml0eSkgT1JlZCBpblxuICAgICAgaWYgKGR4ID09IDB4ODApIGJyZWFrO1xuICAgICAgZHggPSBzaWduZWQoZHgpO1xuICAgICAgZHkgPSBzaWduZWQoZHkpO1xuICAgICAgdGlsZSA9ICh0aWxlICsgb2Zmc2V0KSAmIDB4ZmY7XG4gICAgICBjb25zdCBwYXR0ZXJuUGFnZSA9IHBhdHRlcm5zW3RpbGUgPj4gNl07XG4gICAgICBjb25zdCBwYWxldHRlID0gKHBhbGV0dGVzW2F0dHIgJiAzXSArIDB4YjApICYgMHhmZjtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBwYXR0ZXJuUGFnZSA8PCA2IHwgdGlsZSAmIDB4M2Y7XG4gICAgICBpZiAobWlycm9yZWQpIHtcbiAgICAgICAgZHggPSAtOCAtIGR4O1xuICAgICAgICBhdHRyIF49IDB4NDA7XG4gICAgICB9XG4gICAgICB0aGlzLnRpbGUoeSArIGR5LCB4ICsgZHgsIHBhdHRlcm4sIHBhbGV0dGUgPDwgMiB8IGF0dHIgPj4gNik7XG4gICAgfVxuICB9XG5cbiAgdGV4dCh5OiBudW1iZXIsIHg6IG51bWJlciwgdGV4dDogc3RyaW5nLCBwYWxldHRlID0gMHgxMikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy50aWxlKFxuICAgICAgICAgIHksIHggKyA4ICogaSwgdGV4dC5jaGFyQ29kZUF0KGkpIHwgMHhmMDAsIHBhbGV0dGUgPDwgMik7XG4gICAgfSAgICAgICAgICAgIFxuICB9XG59XG5cbmNvbnN0IENPTE9SUyA9IFtcbiAgMHg1MjUyNTIsIDB4QjQwMDAwLCAweEEwMDAwMCwgMHhCMTAwM0QsIDB4NzQwMDY5LCAweDAwMDA1QiwgMHgwMDAwNUYsIDB4MDAxODQwLFxuICAweDAwMkYxMCwgMHgwODRBMDgsIDB4MDA2NzAwLCAweDEyNDIwMCwgMHg2RDI4MDAsIDB4MDAwMDAwLCAweDAwMDAwMCwgMHgwMDAwMDAsXG4gIDB4QzRENUU3LCAweEZGNDAwMCwgMHhEQzBFMjIsIDB4RkY0NzZCLCAweEQ3MDA5RiwgMHg2ODBBRDcsIDB4MDAxOUJDLCAweDAwNTRCMSxcbiAgMHgwMDZBNUIsIDB4MDA4QzAzLCAweDAwQUIwMCwgMHgyQzg4MDAsIDB4QTQ3MjAwLCAweDAwMDAwMCwgMHgwMDAwMDAsIDB4MDAwMDAwLFxuICAweEY4RjhGOCwgMHhGRkFCM0MsIDB4RkY3OTgxLCAweEZGNUJDNSwgMHhGRjQ4RjIsIDB4REY0OUZGLCAweDQ3NkRGRiwgMHgwMEI0RjcsXG4gIDB4MDBFMEZGLCAweDAwRTM3NSwgMHgwM0Y0MkIsIDB4NzhCODJFLCAweEU1RTIxOCwgMHg3ODc4NzgsIDB4MDAwMDAwLCAweDAwMDAwMCxcbiAgMHhGRkZGRkYsIDB4RkZGMkJFLCAweEY4QjhCOCwgMHhGOEI4RDgsIDB4RkZCNkZGLCAweEZGQzNGRiwgMHhDN0QxRkYsIDB4OUFEQUZGLFxuICAweDg4RURGOCwgMHg4M0ZGREQsIDB4QjhGOEI4LCAweEY1RjhBQywgMHhGRkZGQjAsIDB4RjhEOEY4LCAweDAwMDAwMCwgMHgwMDAwMDAsXG5dO1xuXG5mdW5jdGlvbiBzaWduZWQoeDogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIHggPCAweDgwID8geCA6IHggLSAweDEwMDtcbn1cbiJdfQ==