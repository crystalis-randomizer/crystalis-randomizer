export class Deque {
    constructor() {
        this.buffer = new Array(16);
        this.mask = 0xf;
        this.start = 0;
        this.end = 0;
        this.size = 0;
    }
    get length() {
        return this.size;
    }
    upsize(target) {
        while (this.mask < target) {
            if (this.end <= this.start)
                this.start += this.mask + 1;
            this.mask = this.mask << 1 | 1;
            this.buffer = this.buffer.concat(this.buffer);
        }
        this.size = target;
    }
    push(...elems) {
        this.upsize(this.size + elems.length);
        for (const elem of elems) {
            this.buffer[this.end] = elem;
            this.end = (this.end + 1) & this.mask;
        }
    }
    pop() {
        if (!this.size)
            return undefined;
        this.end = (this.end - 1) & this.mask;
        this.size--;
        return this.buffer[this.end];
    }
    peek() {
        if (!this.size)
            return undefined;
        return this.buffer[(this.end - 1) & this.mask];
    }
    unshift(...elems) {
        this.upsize(this.size + elems.length);
        for (const elem of elems) {
            this.start = (this.start - 1) & this.mask;
            this.buffer[this.start] = elem;
        }
    }
    shift() {
        if (!this.size)
            return undefined;
        const result = this.buffer[this.start];
        this.start = (this.start + 1) & this.mask;
        this.size--;
        return result;
    }
    front() {
        if (!this.size)
            return undefined;
        return this.buffer[this.start];
    }
    toString() {
        const parts = new Array(this.size);
        for (let i = 0; i < this.size; i++) {
            parts[i] = this.buffer[(this.start + i) & this.mask];
        }
        return `[${parts.join(', ')}]`;
    }
}
export const breakLines = (str, len) => {
    str = str.trim();
    const out = [];
    while (str.length > len) {
        let b = str.substring(0, len).lastIndexOf(' ');
        if (b < 0)
            b = len;
        out.push(str.substring(0, b).trim());
        str = str.substring(b).trim();
    }
    out.push(str.trim());
    return out;
};
export class UsageError extends Error {
}
export class SuffixTrie {
    constructor(key = '') {
        this.key = key;
        this.next = new Map();
    }
    get(key) {
        let t = this;
        for (let i = key.length - 1; i >= 0 && t; i++) {
            t = t.next.get(key[i]);
        }
        return t && t.data;
    }
    with(c) {
        let t = this.next.get(c);
        if (!t)
            this.next.set(c, (t = new SuffixTrie(c + this.key)));
        return t;
    }
    set(key, value) {
        let t = this;
        for (let i = key.length - 1; i >= 0 && t; i++) {
            t = t.with(key[i]);
        }
        t.data = value;
    }
    *values() {
        const stack = [this];
        while (stack.length) {
            const top = stack.pop();
            if (top.data)
                yield top.data;
            stack.push(...top.next.values());
        }
    }
}
export class DefaultMap extends Map {
    constructor(supplier) {
        super();
        this.supplier = supplier;
    }
    get(key) {
        let value = super.get(key);
        if (value == null)
            super.set(key, value = this.supplier());
        return value;
    }
}
export class IndexedSet {
    constructor() {
        this.forward = [];
        this.reverse = new Map();
    }
    add(elem) {
        let result = this.reverse.get(elem);
        if (result == null)
            this.reverse.set(elem, result = this.forward.push(elem) - 1);
        return result;
    }
    get(index) {
        return this.forward[index];
    }
}
export var iters;
(function (iters_1) {
    function* concat(...iters) {
        for (const iter of iters) {
            yield* iter;
        }
    }
    iters_1.concat = concat;
})(iters || (iters = {}));
//# sourceMappingURL=util.js.map