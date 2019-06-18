import { Entity } from './entity.js';
import { tuple } from './util.js';
export class TileEffects extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = (id << 8) & 0x1fff | 0x12000;
        this.effects = tuple(rom.prg, this.base, 256);
    }
    write(writer) {
        for (let i = 0; i < 0x100; i++) {
            writer.rom[this.base + i] = this.effects[i];
        }
    }
}
//# sourceMappingURL=tileeffects.js.map