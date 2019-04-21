import { hex } from './util.js';
export class Entity {
    constructor(rom, id) {
        this.rom = rom;
        this.id = id;
    }
    toString() {
        return `${this.constructor.name} $${hex(this.id)}`;
    }
}
//# sourceMappingURL=entity.js.map