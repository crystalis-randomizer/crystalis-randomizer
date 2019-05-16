import { Entity } from './entity.js';
import { reverseBits, seq, tuple } from './util.js';
export class Pattern extends Entity {
    constructor(rom, id, pixels) {
        super(rom, id);
        this.pixels = pixels || tuple(rom.chr, id << 4, 16);
    }
    pixelAt(y, x) {
        return (this.pixels[y | 8] >> x & 1) << 1 | (this.pixels[y] >> x & 1);
    }
    flipH() {
        return new Pattern(this.rom, -1, this.pixels.map(reverseBits));
    }
    flipV() {
        return new Pattern(this.rom, -1, seq(16, y => this.pixels[y & 8 | ~y & 7]));
    }
    flip(type) {
        let p = this;
        if (type & Flip.HORIZONTAL)
            p = p.flipH();
        if (type & Flip.VERTICAL)
            p = p.flipV();
        return p;
    }
}
export var Flip;
(function (Flip) {
    Flip[Flip["HORIZONTAL"] = 64] = "HORIZONTAL";
    Flip[Flip["VERTICAL"] = 128] = "VERTICAL";
})(Flip || (Flip = {}));
//# sourceMappingURL=pattern.js.map