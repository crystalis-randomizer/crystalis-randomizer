import { Entity } from './entity.js';
import { hex, readLittleEndian, seq, tuple } from './util.js';
const METASPRITE_TABLE = 0x3845c;
export class Metasprite extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.mirrored = null;
        this.pointer = METASPRITE_TABLE + (this.id << 1);
        this.base = readLittleEndian(rom.prg, this.pointer) + 0x30000;
        this.used = this.base >= 0x38000;
        if (rom.prg[this.base] === 0xff) {
            const target = readLittleEndian(rom.prg, this.base + 1);
            for (let i = 0; i < 256; i++) {
                if (readLittleEndian(rom.prg, METASPRITE_TABLE + (i << 1)) === target) {
                    this.mirrored = i;
                    break;
                }
            }
            if (this.mirrored == null) {
                throw new Error(`could not find mirrored sprite for ${hex(id)}`);
            }
            this.size = 0;
            this.frameMask = 0;
            this.frames = 0;
            this.sprites = [];
        }
        else {
            this.mirrored = null;
            this.size = rom.prg[this.base];
            this.frameMask = rom.prg[this.base + 1];
            this.frames = this.frameMask + 1;
            this.sprites = seq(this.frames, f => {
                const a = this.base + 2 + f * 4 * this.size;
                const sprites = [];
                for (let i = 0; i < this.size; i++) {
                    if (rom.prg[a + 4 * i] === 0x80)
                        break;
                    sprites.push(tuple(rom.prg, a + 4 * i, 4));
                }
                return sprites;
            });
        }
    }
    palettes() {
        if (!this.used)
            return [];
        let ms = this;
        if (ms.mirrored) {
            ms = this.rom.metasprites[ms.mirrored];
        }
        const pals = new Set();
        for (const version of ms.sprites) {
            for (const [dx, , attr] of version) {
                if (dx === 0x80)
                    break;
                pals.add(attr & 3);
            }
        }
        return [...pals];
    }
}
//# sourceMappingURL=metasprite.js.map