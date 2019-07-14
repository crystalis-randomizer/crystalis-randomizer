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
    function label(x) {
        return x === ALL ? 'all' : [...x].sort().join(' ');
    }
    CSet.label = label;
})(CSet || (CSet = {}));
export class Constraint {
    constructor(fixed, float) {
        this.fixed = fixed;
        this.float = float;
    }
    get pat0() { return this.fixed[0]; }
    get pat1() { return this.fixed[1]; }
    get pal2() { return this.fixed[2]; }
    get pal3() { return this.fixed[3]; }
    static get ALL() {
        return new Constraint([ALL, ALL, ALL, ALL], []);
    }
    static get NONE() {
        return new Constraint([NONE, NONE, NONE, NONE], []);
    }
    static fromSpawn(palettes, patterns, location, spawn, shiftable) {
        const [firstPattern, ...rest] = patterns;
        shiftable = shiftable && firstPattern === 2 && !rest.length;
        const pat0 = shiftable || !patterns.has(2) ? ALL : bit(location.spritePatterns[0]);
        const pat1 = shiftable || !patterns.has(3) ? ALL : bit(location.spritePatterns[1]);
        const float = shiftable ? [bit(location.spritePatterns[spawn.patternBank])] : [];
        const pal2 = palettes.has(2) ? bit(location.spritePalettes[0]) : ALL;
        const pal3 = palettes.has(3) ? bit(location.spritePalettes[1]) : ALL;
        return new Constraint([pat0, pat1, pal2, pal3], float);
    }
    join(that) {
        const fixed = seq(4, i => CSet.union(this.fixed[i], that.fixed[i]));
        if (this.float.length != that.float.length) {
            console.dir(this);
            console.dir(that);
            throw new Error(`incompatible float: ${this.float} ${that.float}`);
        }
        const float = seq(this.float.length, i => CSet.union(this.float[i], that.float[i]));
        return new Constraint(fixed, float);
    }
    meet(that) {
        const fixed = [];
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
                    if (!c.size)
                        return undefined;
                    float.splice(i, 1);
                    i = -1;
                    break;
                }
            }
        }
        return new Constraint(fixed, float);
    }
}
//# sourceMappingURL=constraint.js.map