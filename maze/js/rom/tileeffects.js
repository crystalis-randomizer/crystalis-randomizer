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
TileEffects.PIT = 0x01;
TileEffects.NO_WALK = 0x02;
TileEffects.IMPASSIBLE = 0x04;
TileEffects.ALTERNATIVE = 0x08;
TileEffects.BEHIND = 0x10;
TileEffects.SLOPE = 0x20;
TileEffects.SLOW = 0x40;
TileEffects.PAIN = 0x80;
//# sourceMappingURL=tileeffects.js.map