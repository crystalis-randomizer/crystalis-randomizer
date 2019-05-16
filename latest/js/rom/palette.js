import { Entity } from './entity.js';
import { tuple } from './util.js';
export class Palette extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = (id & 3) << 2 | (id & 0xfc) << 6 | 0x40f0;
        this.colors = tuple(rom.prg, this.base, 4);
    }
    color(c) {
        return this.colors[c] & 0x3f;
    }
}
//# sourceMappingURL=palette.js.map