import { Entity } from './entity.js';
import { signed, tuple, unsigned } from './util.js';
export class Hitbox extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = 0x35691 + (id << 2);
        this.coordinates = tuple(rom.prg, this.base, 4);
    }
    get w() { return this.coordinates[1]; }
    set w(value) { this.coordinates[1] = value; }
    get x0() { return signed(this.coordinates[0]); }
    set x0(value) { this.coordinates[0] = unsigned(value); }
    get x1() { return this.x0 + this.w; }
    get h() { return this.coordinates[3]; }
    set h(value) { this.coordinates[3] = value; }
    get y0() { return signed(this.coordinates[2]); }
    set y0(value) { this.coordinates[2] = unsigned(value); }
    get y1() { return this.y0 + this.h; }
    write(writer) {
        writer.rom.subarray(this.base, this.base + 4).set(this.coordinates);
    }
}
//# sourceMappingURL=hitbox.js.map