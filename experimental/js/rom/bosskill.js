import { Entity } from './entity.js';
import { readLittleEndian, writeLittleEndian } from './util.js';
export class BossKill extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.pointer = 0x1f96b + 2 * id;
        this.base = readLittleEndian(rom.prg, this.pointer) + 0x14000;
        this.data = rom.prg.slice(this.base, this.base + 21);
        this.palettes = this.data.subarray(5, 13);
        this.patterns = this.data.subarray(13, 19);
    }
    get routine() {
        const addr = readLittleEndian(this.data, 0);
        return addr && (addr + 0x14000);
    }
    set routine(addr) {
        writeLittleEndian(this.data, 0, addr ? addr - 0x14000 : 0);
    }
    get restoreMusic() { return this.data[3]; }
    set restoreMusic(x) { this.data[3] = x; }
    get itemDrop() { return this.data[4]; }
    set itemDrop(x) { this.data[4] = x; }
    get restoreAnimation() { return this.data[19]; }
    set restoreAnimation(x) { this.data[19] = x; }
    get explode() { return !!this.data[20]; }
    set explode(x) { this.data[20] = x ? 1 : 0; }
    write(writer) {
        writer.rom.subarray(this.base, this.base + 21).set(this.data);
    }
}
//# sourceMappingURL=bosskill.js.map