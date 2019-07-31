import { Entity } from './entity.js';
import { tuple } from './util.js';
export class Screen extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = (id > 0xff ? 0x40 + id : id) << 8;
        this.tiles = tuple(rom.prg, this.base, 0xf0);
    }
    allTilesSet() {
        return new Set(this.tiles);
    }
    write(writer) {
        if (this.id < 0x100) {
            writer.rom.subarray(this.base, this.base + 0xf0).set(this.tiles);
        }
        else {
            for (let i = 0; i < 0xc0; i++) {
                writer.rom[this.base + i] = this.tiles[i];
            }
        }
    }
}
//# sourceMappingURL=screen.js.map