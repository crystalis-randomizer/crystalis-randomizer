import { seq } from "./util.js";
import { iters } from "../util.js";
const EMPTY_ITERATOR = {
    next() { return { done: true }; },
};
const NONE = {
    get size() { return 0; },
    has() { return false; },
    [Symbol.iterator]() { return EMPTY_ITERATOR; },
};
const ALL = {
    get size() { return Infinity; },
    has() { return true; },
    [Symbol.iterator]() { throw new Error('cannot iterate'); },
};
class Bit {
    constructor(bit) {
        this.bit = bit;
    }
    get size() { return 1; }
    has(x) { return x === this.bit; }
    [Symbol.iterator]() { return [this.bit][Symbol.iterator](); }
}
function bit(x) {
    return new Bit(x);
}
var CSet;
(function (CSet) {
    function intersect(a, b) {
        if (a === ALL || !b.size)
            return b;
        if (b === ALL || !a.size)
            return a;
        const out = new Set();
        for (const x of a) {
            if (b.has(x))
                out.add(x);
        }
        if (!out.size)
            return NONE;
        return out;
    }
    CSet.intersect = intersect;
    function union(a, b) {
        if (a === ALL || !b.size)
            return a;
        if (b === ALL || !a.size)
            return b;
        const out = new Set(a);
        for (const x of b) {
            out.add(x);
        }
        return out;
    }
    CSet.union = union;
    function isSubset(subset, superset) {
        if (superset === ALL || !subset.size)
            return true;
        if (subset.size > superset.size)
            return false;
        for (const x of subset) {
            if (!superset.has(x))
                return false;
        }
        return true;
    }
    CSet.isSubset = isSubset;
    function label(x) {
        return x === ALL ? 'all' : [...x].sort().join(' ');
    }
    CSet.label = label;
})(CSet || (CSet = {}));
export class Constraint {
    constructor(fixed, float, shift) {
        this.fixed = fixed;
        this.float = float;
        this.shift = shift;
    }
    get pat0() { return this.fixed[0]; }
    get pat1() { return this.fixed[1]; }
    get pal2() { return this.fixed[2]; }
    get pal3() { return this.fixed[3]; }
    static get ALL() {
        return new Constraint([ALL, ALL, ALL, ALL], [], 0);
    }
    static get NONE() {
        return new Constraint([NONE, NONE, NONE, NONE], [], 0);
    }
    static get MIMIC() {
        return new Constraint([ALL, bit(0x6c), ALL, ALL], [], 0);
    }
    static get TREASURE_CHEST() {
        return new Constraint([ALL, ALL, ALL, ALL], [new Set(TREASURE_CHEST_BANKS)], 0);
    }
    static forLocation(id) {
        switch (id) {
            case 0x03:
                return new Constraint([ALL, bit(0x60), ALL, ALL], [], 0);
            case 0x60:
            case 0x64:
            case 0x68:
                return new Constraint([ALL, bit(0x52), ALL, bit(0x08)], [], 0);
        }
        return Constraint.ALL;
    }
    static fromSpawn(palettes, patterns, location, spawn, shiftable) {
        const [firstPattern, ...rest] = patterns;
        shiftable = shiftable && firstPattern === 2 && !rest.length;
        if (shiftable && spawn.patternBank)
            patterns = new Set([3]);
        const pat0 = shiftable || !patterns.has(2) ? ALL : bit(location.spritePatterns[0]);
        const pat1 = shiftable || !patterns.has(3) ? ALL : bit(location.spritePatterns[1]);
        const float = shiftable ? [bit(location.spritePatterns[spawn.patternBank])] : [];
        const pal2 = palettes.has(2) ? bit(location.spritePalettes[0]) : ALL;
        const pal3 = palettes.has(3) ? bit(location.spritePalettes[1]) : ALL;
        return new Constraint([pat0, pat1, pal2, pal3], float, 0);
    }
    ignorePalette() {
        return new Constraint([this.fixed[0], this.fixed[1], ALL, ALL], this.float, this.shift);
    }
    join(that) {
        const fixed = seq(4, i => CSet.union(this.fixed[i], that.fixed[i]));
        if (this.float.length != that.float.length) {
            console.dir(this);
            console.dir(that);
            throw new Error(`incompatible float: ${this.float} ${that.float}`);
        }
        const float = seq(this.float.length, i => CSet.union(this.float[i], that.float[i]));
        return new Constraint(fixed, float, this.shift | that.shift);
    }
    fix(random) {
        const nextInt = random ? (x) => random.nextInt(x) : () => 0;
        const fixed = [...this.fixed];
        if (this.float.length) {
            const x0 = nextInt(2);
            const x1 = 1 - x0;
            if (x0 < this.float.length)
                fixed[0] = CSet.intersect(fixed[0], this.float[x0]);
            if (x1 < this.float.length)
                fixed[1] = CSet.intersect(fixed[1], this.float[x1]);
        }
        return fixed.map(s => {
            if (s === ALL)
                return 0xff;
            const elems = [...s];
            return elems[nextInt(elems.length)];
        });
    }
    meet(that) {
        const fixed = [];
        let shift = this.shift;
        for (let i = 0; i < 4; i++) {
            const meet = CSet.intersect(this.fixed[i], that.fixed[i]);
            if (!meet.size)
                return undefined;
            fixed.push(meet);
        }
        const inverseFloat = new Map();
        const float = [];
        for (const s of iters.concat(this.float, that.float)) {
            if (s === ALL)
                throw new Error(`Unexpected unconstrained float`);
            let found = false;
            for (const p of s) {
                const prev = inverseFloat.get(p);
                if (prev != null) {
                    float[prev] = CSet.intersect(float[prev], s);
                    found = true;
                    break;
                }
            }
            if (found)
                break;
            float.push(s);
            if (float.length > 2)
                return undefined;
        }
        for (let i = 0; i < float.length; i++) {
            for (let j = 0; j < 2; j++) {
                const intersect = CSet.intersect(float[i], fixed[j]);
                if (!intersect.size) {
                    const c = fixed[1 - j] = CSet.intersect(float[i], fixed[1 - j]);
                    shift |= 1 << (1 - j);
                    if (!c.size)
                        return undefined;
                    float.splice(i, 1);
                    i = -1;
                    break;
                }
                else if (intersect.size === float[i].size) {
                }
            }
        }
        return new Constraint(fixed, float, shift);
    }
}
const TREASURE_CHEST_BANKS = new Set([
    0x5e, 0x5f, 0x60, 0x61, 0x64, 0x65, 0x66, 0x67,
    0x68, 0x69, 0x6a, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
    0x74, 0x75, 0x76, 0x77,
]);
//# sourceMappingURL=constraint.js.map