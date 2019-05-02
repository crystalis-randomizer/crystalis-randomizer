import { Entity } from './entity.js';
import { seq, tuple } from './util.js';
export class Screen extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = (id > 0xff ? 0x40 + id : id) << 8;
        this.tiles = seq(15, y => tuple(rom.prg, this.base | y << 4, 16));
    }
    allTilesSet() {
        const tiles = new Set();
        for (const row of this.tiles) {
            for (const tile of row) {
                tiles.add(tile);
            }
        }
        return tiles;
    }
    write(writer) {
        let i = this.base;
        for (const row of this.tiles) {
            for (const tile of row) {
                writer.rom[i++] = tile;
            }
        }
    }
}
//# sourceMappingURL=screen.js.map