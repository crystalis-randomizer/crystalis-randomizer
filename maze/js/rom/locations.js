import { Location, LOCATIONS } from './location.js';
class LocationsClass extends Array {
    constructor(rom) {
        super(0x100);
        this.rom = rom;
        for (let id = 0; id < 0x100; id++) {
            this[id] = new Location(rom, id);
        }
        for (const key of Object.keys(LOCATIONS)) {
            const [id,] = namesTyped[key];
            this[key] = this[id];
        }
    }
    static get [Symbol.species]() { return Array; }
    partition(func, eq = (a, b) => a === b, joinNexuses = false) {
        const seen = new Set();
        const out = [];
        for (let loc of this) {
            if (seen.has(loc) || !loc.used)
                continue;
            seen.add(loc);
            const value = func(loc);
            const group = [];
            const queue = [loc];
            while (queue.length) {
                const next = queue.pop();
                group.push(next);
                for (const n of next.neighbors(joinNexuses)) {
                    if (!seen.has(n) && eq(func(n), value)) {
                        seen.add(n);
                        queue.push(n);
                        group.push(n);
                    }
                }
            }
            out.push([[...group], value]);
        }
        return out;
    }
}
const namesTyped = LOCATIONS;
export const Locations = LocationsClass;
//# sourceMappingURL=locations.js.map