import { Entity } from './entity.js';
import { tuple } from './util.js';
export class TileAnimation extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = 0x3e779 + (id << 3);
        this.pages = tuple(rom.prg, this.base, 8);
    }
}
//# sourceMappingURL=tileanimation.js.map