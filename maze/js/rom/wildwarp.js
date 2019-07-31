import { tuple } from './util.js';
export class WildWarp {
    constructor(rom) {
        this.rom = rom;
        this.locations = tuple(rom.prg, ADDRESS, COUNT);
    }
    write(w) {
        w.rom.subarray(ADDRESS, ADDRESS + COUNT).set(this.locations);
    }
}
const ADDRESS = 0x3cbec;
const COUNT = 16;
//# sourceMappingURL=wildwarp.js.map