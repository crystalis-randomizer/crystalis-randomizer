import { Entity } from './entity.js';
import { seq, tuple } from './util.js';
export class Tileset extends Entity {
    constructor(rom, id) {
        super(rom, id);
        const map = id & 0x3f;
        this.tileBase = 0x10000 | map << 8;
        this.attrBase = 0x13000 | map << 4;
        this.alternatesBase = 0x13e00 | map << 3;
        this.tiles = seq(4, q => tuple(rom.prg, this.tileBase | q << 8, 256));
        this.attrs = seq(256, i => rom.prg[this.attrBase | i >> 2] >> ((i & 3) << 1) & 3);
        this.alternates = tuple(rom.prg, this.alternatesBase, 32);
    }
    write(writer) {
        for (let i = 0; i < 0x100; i++) {
            if (i < 0x20) {
                writer.rom[this.alternatesBase + i] = this.alternates[i];
            }
            for (let j = 0; j < 4; j++) {
                writer.rom[this.tileBase + (j << 8) + i] = this.tiles[j][i];
            }
        }
        for (let i = 0; i < 0x40; i++) {
            const j = i << 2;
            writer.rom[this.attrBase + i] =
                (this.attrs[j] & 3) | (this.attrs[j + 1] & 3) << 2 |
                    (this.attrs[j + 2] & 3) << 4 | (this.attrs[j + 3] & 3) << 6;
        }
    }
    effects() {
        let index = (this.id >>> 2) & 0xf;
        if (this.id === 0xa8)
            index = 2;
        if (this.id === 0xac)
            index--;
        return this.rom.tileEffects[index];
    }
}
//# sourceMappingURL=tileset.js.map