import { Entity } from './entity.js';
import { tuple } from './util.js';
export class AdHocSpawn extends Entity {
    constructor(rom, id) {
        super(rom, id);
        this.base = (id << 2) + 0x29c00;
        this.data = tuple(rom.prg, this.base, 4);
    }
    get slotRangeLower() { return this.data[0]; }
    set slotRangeLower(arg) { this.data[0] = arg; }
    get slotRangeUpper() { return this.data[1]; }
    set slotRangeUpper(arg) { this.data[1] = arg; }
    get objectId() { return this.data[2]; }
    set objectId(arg) { this.data[2] = arg; }
    get count() { return this.data[3]; }
    set count(arg) { this.data[3] = arg; }
    write(writer) {
        writer.rom.subarray(this.base, this.base + 4).set(this.data);
    }
}
//# sourceMappingURL=adhocspawn.js.map