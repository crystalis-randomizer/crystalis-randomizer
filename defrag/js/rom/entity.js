import { hex } from './util.js';
import { Rom } from '../rom.js';
export class Entity {
    constructor(rom, id) {
        this.rom = rom;
        this.id = id;
    }
    write(writer) { }
    toString() {
        return `${this.constructor.name} $${hex(this.id)}`;
    }
}
export { Rom };
//# sourceMappingURL=entity.js.map