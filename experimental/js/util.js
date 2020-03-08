export class Deque {
    constructor(iter) {
        this.buffer = new Array(16);
        this.mask = 0xf;
        this.start = 0;
        this.end = 0;
        this.size = 0;
        if (iter)
            this.push(...iter);
    }
    [Symbol.iterator]() {
        let i = 0;
        return {
            next: () => {
                if (i >= this.size)
                    return { value: undefined, done: true };
                return {
                    value: this.buffer[(this.start + i++) & this.mask],
                    done: false,
                };
            },
            [Symbol.iterator]() { return this; }
        };
    }
    get length() {
        return this.size;
    }
    upsize(target) {
        while (this.mask <= target) {
            if (this.end < this.start)
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
        let i = this.start = (this.start - elems.length) & this.mask;
        for (const elem of elems) {
            this.buffer[i++ & this.mask] = elem;
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
    get(i) {
        if (i >= this.size)
            return undefined;
        return this.buffer[(this.start + i) & this.mask];
    }
    slice(start, end = this.size) {
        if (start < 0)
            start += this.size;
        if (end < 0)
            end += this.size;
        if (end <= start)
            return [];
        start = (this.start + Math.max(0, Math.min(this.size, start))) & this.mask;
        end = (this.start + Math.max(0, Math.min(this.size, end))) & this.mask;
        if (start <= end)
            return this.buffer.slice(start, end);
        return this.buffer.slice(start).concat(this.buffer.slice(0, end));
    }
    splice(start, count, ...elems) {
        if (start < 0)
            start += this.size;
        start = Math.max(0, Math.min(this.size, start));
        count = Math.max(0, Math.min(this.size - start, count));
        let end = start + count;
        const delta = elems.length - count;
        const out = this.slice(start, end);
        this.upsize(this.size + delta);
        this.size -= delta;
        if (start === 0) {
            this.start = (this.start - delta) & this.mask;
            for (let i = 0; i < elems.length; i++) {
                this.buffer[(this.start + i) & this.mask] = elems[i];
            }
        }
        else if (end === this.size) {
            this.end = (this.end + delta) & this.mask;
            start += this.start;
            for (let i = 0; i < elems.length; i++) {
                this.buffer[(start + i) & this.mask] = elems[i];
            }
        }
        else {
            const buf = [...this.slice(0, start), ...elems, ...this.slice(end)];
            buf.length = this.buffer.length;
            this.buffer = buf;
            this.start = 0;
            this.end = this.size;
        }
        this.size += delta;
        return out;
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
    constructor(supplier, init) {
        super(init);
        this.supplier = supplier;
    }
    get(key) {
        let value = super.get(key);
        if (value == null)
            super.set(key, value = this.supplier(key));
        return value;
    }
    sortedKeys(fn) {
        return [...this.keys()].sort(fn);
    }
    sortedEntries(fn) {
        return this.sortedKeys(fn).map(k => [k, this.get(k)]);
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
    function isEmpty(iter) {
        return Boolean(iter[Symbol.iterator]().next().done);
    }
    iters_1.isEmpty = isEmpty;
    function* map(iter, f) {
        for (const elem of iter) {
            yield f(elem);
        }
    }
    iters_1.map = map;
    function* filter(iter, f) {
        for (const elem of iter) {
            if (f(elem))
                yield elem;
        }
    }
    iters_1.filter = filter;
    function* flatMap(iter, f) {
        for (const elem of iter) {
            yield* f(elem);
        }
    }
    iters_1.flatMap = flatMap;
    function count(iter) {
        let count = 0;
        for (const _ of iter) {
            count++;
        }
        return count;
    }
    iters_1.count = count;
    function first(iter, fallback) {
        for (const elem of iter)
            return elem;
        if (arguments.length < 2)
            throw new Error(`Empty iterable: ${iter}`);
        return fallback;
    }
    iters_1.first = first;
    function zip(left, right, zipper = (a, b) => [a, b]) {
        return {
            *[Symbol.iterator]() {
                const leftIter = left[Symbol.iterator]();
                const rightIter = right[Symbol.iterator]();
                let a, b;
                while ((a = leftIter.next(), b = rightIter.next(), !a.done && !b.done)) {
                    yield zipper(a.value, b.value);
                }
            }
        };
    }
    iters_1.zip = zip;
})(iters || (iters = {}));
export function spread(iter) {
    return [...iter];
}
export class LabeledSet {
    constructor() {
        this.map = new Map();
    }
    add(elem) {
        this.map.set(elem.label, elem);
    }
    has(elem) {
        return this.map.has(elem.label);
    }
    delete(elem) {
        this.map.delete(elem.label);
    }
    [Symbol.iterator]() {
        return this.map.values();
    }
}
const INVALIDATED = Symbol('Invalidated');
const SIZE = Symbol('Size');
class SetMultimapSetView {
    constructor(ownerMap, ownerKey, currentSet) {
        this.ownerMap = ownerMap;
        this.ownerKey = ownerKey;
        this.currentSet = currentSet;
    }
    getCurrentSet() {
        if (!this.currentSet || this.currentSet[INVALIDATED]) {
            this.currentSet = this.ownerMap.get(this.ownerKey) || new Set();
        }
        return this.currentSet;
    }
    mutateSet(f) {
        const set = this.getCurrentSet();
        const size = set.size;
        try {
            return f(set);
        }
        finally {
            this.ownerMap[SIZE] += set.size - size;
            if (!set.size) {
                this.ownerMap.delete(this.ownerKey);
                set[INVALIDATED] = true;
            }
        }
    }
    add(elem) {
        this.mutateSet(s => s.add(elem));
        return this;
    }
    has(elem) {
        return this.getCurrentSet().has(elem);
    }
    clear() {
        this.mutateSet(s => s.clear());
    }
    delete(elem) {
        return this.mutateSet(s => s.delete(elem));
    }
    [Symbol.iterator]() {
        return this.getCurrentSet()[Symbol.iterator]();
    }
    values() {
        return this.getCurrentSet().values();
    }
    keys() {
        return this.getCurrentSet().keys();
    }
    entries() {
        return this.getCurrentSet().entries();
    }
    forEach(callback, thisArg) {
        this.getCurrentSet().forEach(callback, thisArg);
    }
    get size() {
        return this.getCurrentSet().size;
    }
    get [Symbol.toStringTag]() {
        return 'Set';
    }
}
Reflect.setPrototypeOf(SetMultimapSetView.prototype, Set.prototype);
export class SetMultimap {
    constructor(entries = []) {
        this.map = new Map();
        this.map[SIZE] = 0;
        for (const [k, v] of entries) {
            this.add(k, v);
        }
    }
    get size() {
        return this.map[SIZE];
    }
    get(k) {
        return new SetMultimapSetView(this.map, k, this.map.get(k));
    }
    add(k, v) {
        let set = this.map.get(k);
        if (!set)
            this.map.set(k, set = new Set());
        const size = set.size;
        set.add(v);
        this.map[SIZE] += set.size - size;
    }
}
export class Multiset {
    constructor(entries = []) {
        this.entries = new DefaultMap(() => 0, entries);
    }
    add(elem) {
        this.entries.set(elem, this.entries.get(elem) + 1);
    }
    delete(elem) {
        const count = this.entries.get(elem) - 1;
        if (count > 0) {
            this.entries.set(elem, count);
        }
        else {
            this.entries.delete(elem);
        }
    }
    unique() {
        return this.entries.size;
    }
    count(elem) {
        return this.entries.has(elem) ? this.entries.get(elem) : 0;
    }
    [Symbol.iterator]() {
        return this.entries.entries();
    }
}
export function assertNever(x) {
    throw new Error(`non-exhaustive check: ${x}`);
}
export function assert(x) {
    if (!x)
        throw new Error(`asserted but falsy: ${x}`);
    return x;
}
export function isNonNull(x) {
    return x != null;
}
export function memoize(f) {
    const cache = {};
    return function (...args) {
        let c = cache;
        for (const arg of args) {
            if (!c.next)
                c.next = new WeakMap();
            let next = (c.next || (c.next = new WeakMap())).get(arg);
            if (!next)
                c.next.set(arg, next = {});
        }
        if (!c.cached) {
            c.value = f.apply(this, args);
            c.cached = true;
        }
        return c.value;
    };
}
export function strcmp(left, right) {
    if (left < right)
        return -1;
    if (right < left)
        return 1;
    return 0;
}
export class Keyed {
    constructor(data) {
        this.data = data;
    }
    get(index) {
        return this.data[index];
    }
    [Symbol.iterator]() {
        return this.data.entries();
    }
    values() {
        return this.data[Symbol.iterator]();
    }
}
export class ArrayMap {
    constructor(data) {
        this.data = data;
        const rev = new Map();
        for (let i = 0; i < data.length; i++) {
            rev.set(data[i], i);
        }
        this.rev = rev;
        this.length = data.length;
    }
    get(index) {
        return this.data[index];
    }
    hasValue(value) {
        return this.rev.has(value);
    }
    index(value) {
        const index = this.rev.get(value);
        if (index == null)
            throw new Error(`Missing index for ${value}`);
        return index;
    }
    [Symbol.iterator]() {
        return this.data.entries();
    }
    values() {
        return this.data[Symbol.iterator]();
    }
}
export class MutableArrayBiMap {
    constructor() {
        this._fwd = [];
        this._rev = [];
    }
    *[Symbol.iterator]() {
        for (let i = 0; i < this._fwd.length; i++) {
            const val = this._fwd[i];
            if (val != null)
                yield [i, val];
        }
    }
    *keys() {
        for (let i = 0; i < this._fwd.length; i++) {
            if (this._fwd[i] != null)
                yield i;
        }
    }
    *values() {
        for (let i = 0; i < this._rev.length; i++) {
            if (this._rev[i] != null)
                yield i;
        }
    }
    get(index) {
        return this._fwd[index];
    }
    has(key) {
        return this._fwd[key] != null;
    }
    hasValue(value) {
        return this._rev[value] != null;
    }
    index(value) {
        const index = this._rev[value];
        if (index == null)
            throw new Error(`Missing index for ${value}`);
        return index;
    }
    set(key, value) {
        if (this._fwd[key])
            throw new Error(`already has key ${key}`);
        if (this._rev[value])
            throw new Error(`already has value ${value}`);
        this._fwd[key] = value;
        this._rev[value] = key;
    }
    replace(key, value) {
        const oldKey = this._rev[value];
        if (oldKey != null)
            delete this._fwd[oldKey];
        const oldValue = this._fwd[key];
        if (oldValue != null)
            delete this._rev[oldValue];
        this._fwd[key] = value;
        this._rev[value] = key;
        return oldValue;
    }
}
class CancelTokenReg {
    constructor(callback, source) {
        this.callback = callback;
        this.source = source;
    }
    unregister() { this.source.unregister(this); }
}
export class CancelTokenSource {
    constructor() {
        this.cancelled = false;
        this.registrations = new Set();
        const source = this;
        this.token = {
            get requested() { return source.cancelled; },
            throwIfRequested() {
                if (source.cancelled)
                    throw new Error(`Cancelled`);
            },
            register(callback) {
                const reg = new CancelTokenReg(callback, source);
                source.registrations.add(reg);
                return reg;
            },
        };
    }
    cancel() {
        if (this.cancelled)
            return;
        this.cancelled = true;
        const regs = [...this.registrations];
        this.registrations.clear();
        for (const reg of regs) {
            reg.callback();
        }
    }
    unregister(reg) {
        this.registrations.delete(reg);
    }
}
export var CancelToken;
(function (CancelToken) {
    CancelToken.NONE = {
        get requested() { return false; },
        throwIfRequested() { },
        register() { return { unregister() { } }; },
    };
    CancelToken.CANCELLED = {
        get requested() { return true; },
        throwIfRequested() { throw new Error('cancelled'); },
        register() { return { unregister() { } }; },
    };
})(CancelToken || (CancelToken = {}));
export class CaseMap {
    constructor() {
        this.s = new Map();
        this.i = new Map();
        this.sensitive = true;
    }
    set(key, val) {
        const ki = key = key.toUpperCase();
        if (this.sensitive) {
            this.s.set(key, val);
            this.i.set(ki, val);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sT0FBTyxLQUFLO0lBUWhCLFlBQVksSUFBa0I7UUFOdEIsV0FBTSxHQUFzQixJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQyxTQUFJLEdBQVcsR0FBRyxDQUFDO1FBQ25CLFVBQUssR0FBVyxDQUFDLENBQUM7UUFDbEIsUUFBRyxHQUFXLENBQUMsQ0FBQztRQUNoQixTQUFJLEdBQVcsQ0FBQyxDQUFDO1FBR3ZCLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsT0FBTztZQUNMLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUk7b0JBQUUsT0FBTyxFQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDO2dCQUMxRCxPQUFPO29CQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQU07b0JBQ3ZELElBQUksRUFBRSxLQUFLO2lCQUNaLENBQUM7WUFDSixDQUFDO1lBQ0QsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3RCLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksTUFBTTtRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWM7UUFDbkIsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFJ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QUMsSUFBSTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBYSxFQUFFLE1BQWMsSUFBSSxDQUFDLElBQUk7UUFDMUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztZQUFFLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2xDLElBQUksR0FBRyxHQUFHLENBQUM7WUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQztRQUM5QixJQUFJLEdBQUcsSUFBSSxLQUFLO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFDNUIsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDM0UsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkUsSUFBSSxLQUFLLElBQUksR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBUSxDQUFDO1FBQzlELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBUSxDQUFDO0lBQzNFLENBQUM7SUFFRCxNQUFNLENB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SUFDYixnQkFBSSxHQUFnQjtRQUMvQixJQUFJLFNBQVMsS0FBSyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakMsZ0JBQWdCLEtBQUksQ0FBQztRQUNyQixRQUFRLEtBQUssT0FBTyxFQUFDLFVBQVUsS0FBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDekMsQ0FBQztJQUNXLHFCQUFTLEdBQWdCO1FBQ3BDLElBQUksU0FBUyxLQUFLLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoQyxnQkFBZ0IsS0FBSyxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxRQUFRLEtBQUssT0FBTyxFQUFDLFVBQVUsS0FBSSxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDekMsQ0FBQztBQUNKLENBQUMsRUFYZ0IsV0FBVyxLQUFYLFdBQVcsUUFXM0I7QUFRRCxNQUFNLE9BQU8sT0FBTztJQUFwQjtRQUNFLE1BQUMsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFDO1FBQ3pCLE1BQUMsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFDO1FBQ3pCLGNBQVMsR0FBRyxJQUFJLENBQUM7SUFVbkIsQ0FBQztJQVJDLEdBQUcsQ0FBQyxHQUFXLEVBQUUsR0FBTTtRQUNyQixNQUFNLEVBQUUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25DLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUVsQixJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNsYXNzIERlcXVlPFQ+IGltcGxlbWVudHMgSXRlcmFibGU8VD4ge1xuXG4gIHByaXZhdGUgYnVmZmVyOiAoVCB8IHVuZGVmaW5lZClbXSA9IG5ldyBBcnJheSgxNik7XG4gIHByaXZhdGUgbWFzazogbnVtYmVyID0gMHhmO1xuICBwcml2YXRlIHN0YXJ0OiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGVuZDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBzaXplOiBudW1iZXIgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKGl0ZXI/OiBJdGVyYWJsZTxUPikge1xuICAgIGlmIChpdGVyKSB0aGlzLnB1c2goLi4uaXRlcik7XG4gIH1cblxuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYXRvcjxUPiB7XG4gICAgbGV0IGkgPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBuZXh0OiAoKSA9PiB7XG4gICAgICAgIGlmIChpID49IHRoaXMuc2l6ZSkgcmV0dXJuIHt2YWx1ZTogdW5kZWZpbmVkLCBkb25lOiB0cnVlfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB2YWx1ZTogdGhpcy5idWZmZXJbKHRoaXMuc3RhcnQgKyBpKyspICYgdGhpcy5tYXNrXSBhcyBULFxuICAgICAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIFtTeW1ib2wuaXRlcmF0b3JdKCkgeyByZXR1cm4gdGhpczsgfVxuICAgIH0gYXMgSXRlcmF0b3I8VD47XG4gIH1cblxuICBnZXQgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuc2l6ZTtcbiAgfVxuXG4gIHVwc2l6ZSh0YXJnZXQ6IG51bWJlcikge1xuICAgIHdoaWxlICh0aGlzLm1hc2sgPD0gdGFyZ2V0KSB7XG4gICAgICBpZiAodGhpcy5lbmQgPCB0aGlzLnN0YXJ0KSB0aGlzLnN0YXJ0ICs9IHRoaXMubWFzayArIDE7XG4gICAgICB0aGlzLm1hc2sgPSB0aGlzLm1hc2sgPDwgMSB8IDE7XG4gICAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyLmNvbmNhdCh0aGlzLmJ1ZmZlcik7XG4gICAgfVxuICAgIHRoaXMuc2l6ZSA9IHRhcmdldDtcbiAgfVxuXG4gIHB1c2goLi4uZWxlbXM6IFRbXSkge1xuICAgIHRoaXMudXBzaXplKHRoaXMuc2l6ZSArIGVsZW1zLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XG4gICAgICB0aGlzLmJ1ZmZlclt0aGlzLmVuZF0gPSBlbGVtO1xuICAgICAgdGhpcy5lbmQgPSAodGhpcy5lbmQgKyAxKSAmIHRoaXMubWFzaztcbiAgICB9XG4gIH1cblxuICBwb3AoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgdGhpcy5lbmQgPSAodGhpcy5lbmQgLSAxKSAmIHRoaXMubWFzaztcbiAgICB0aGlzLnNpemUtLTtcbiAgICByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5lbmRdO1xuICB9XG5cbiAgcGVlaygpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy5idWZmZXJbKHRoaXMuZW5kIC0gMSkgJiB0aGlzLm1hc2tdO1xuICB9XG5cbiAgdW5zaGlmdCguLi5lbGVtczogVFtdKSB7XG4gICAgdGhpcy51cHNpemUodGhpcy5zaXplICsgZWxlbXMubGVuZ3RoKTtcbiAgICBsZXQgaSA9IHRoaXMuc3RhcnQgPSAodGhpcy5zdGFydCAtIGVsZW1zLmxlbmd0aCkgJiB0aGlzLm1hc2s7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XG4gICAgICB0aGlzLmJ1ZmZlcltpKysgJiB0aGlzLm1hc2tdID0gZWxlbTtcbiAgICB9XG4gIH1cblxuICBzaGlmdCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmJ1ZmZlclt0aGlzLnN0YXJ0XTtcbiAgICB0aGlzLnN0YXJ0ID0gKHRoaXMuc3RhcnQgKyAxKSAmIHRoaXMubWFzaztcbiAgICB0aGlzLnNpemUtLTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnJvbnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuc3RhcnRdO1xuICB9XG5cbiAgZ2V0KGk6IG51bWJlcik6IFQgfCB1bmRlZmluZWQge1xuICAgIGlmIChpID49IHRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy5idWZmZXJbKHRoaXMuc3RhcnQgKyBpKSAmIHRoaXMubWFza107XG4gIH1cblxuICBzbGljZShzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciA9IHRoaXMuc2l6ZSk6IFRbXSB7XG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgKz0gdGhpcy5zaXplO1xuICAgIGlmIChlbmQgPCAwKSBlbmQgKz0gdGhpcy5zaXplO1xuICAgIGlmIChlbmQgPD0gc3RhcnQpIHJldHVybiBbXTtcbiAgICBzdGFydCA9ICh0aGlzLnN0YXJ0ICsgTWF0aC5tYXgoMCwgTWF0aC5taW4odGhpcy5zaXplLCBzdGFydCkpKSAmIHRoaXMubWFzaztcbiAgICBlbmQgPSAodGhpcy5zdGFydCArIE1hdGgubWF4KDAsIE1hdGgubWluKHRoaXMuc2l6ZSwgZW5kKSkpICYgdGhpcy5tYXNrO1xuICAgIGlmIChzdGFydCA8PSBlbmQpIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZShzdGFydCwgZW5kKSBhcyBUW107XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyLnNsaWNlKHN0YXJ0KS5jb25jYXQodGhpcy5idWZmZXIuc2xpY2UoMCwgZW5kKSkgYXMgVFtdO1xuICB9XG5cbiAgc3BsaWNlKHN0YXJ0OiBudW1iZXIsIGNvdW50OiBudW1iZXIsIC4uLmVsZW1zOiBUW10pOiBUW10ge1xuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ICs9IHRoaXMuc2l6ZTtcbiAgICBzdGFydCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHRoaXMuc2l6ZSwgc3RhcnQpKTtcbiAgICBjb3VudCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHRoaXMuc2l6ZSAtIHN0YXJ0LCBjb3VudCkpO1xuICAgIGxldCBlbmQgPSBzdGFydCArIGNvdW50O1xuICAgIGNvbnN0IGRlbHRhID0gZWxlbXMubGVuZ3RoIC0gY291bnQ7XG4gICAgY29uc3Qgb3V0ID0gdGhpcy5zbGljZShzdGFydCwgZW5kKTtcbiAgICB0aGlzLnVwc2l6ZSh0aGlzLnNpemUgKyBkZWx0YSk7XG4gICAgdGhpcy5zaXplIC09IGRlbHRhOyAvLyB1bmRvIHRoZSBzaXplIGNoYW5nZSBzbyBzbGljZSB3b3Jrc1xuXG4gICAgaWYgKHN0YXJ0ID09PSAwKSB7XG4gICAgICB0aGlzLnN0YXJ0ID0gKHRoaXMuc3RhcnQgLSBkZWx0YSkgJiB0aGlzLm1hc2s7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuYnVmZmVyWyh0aGlzLnN0YXJ0ICsgaSkgJiB0aGlzLm1hc2tdID0gZWxlbXNbaV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlbmQgPT09IHRoaXMuc2l6ZSkge1xuICAgICAgdGhpcy5lbmQgPSAodGhpcy5lbmQgKyBkZWx0YSkgJiB0aGlzLm1hc2s7XG4gICAgICBzdGFydCArPSB0aGlzLnN0YXJ0O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmJ1ZmZlclsoc3RhcnQgKyBpKSAmIHRoaXMubWFza10gPSBlbGVtc1tpXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3BsaWNlIG91dCBvZiB0aGUgbWlkZGxlLi4uXG4gICAgICBjb25zdCBidWYgPSBbLi4udGhpcy5zbGljZSgwLCBzdGFydCksIC4uLmVsZW1zLCAuLi50aGlzLnNsaWNlKGVuZCldO1xuICAgICAgYnVmLmxlbmd0aCA9IHRoaXMuYnVmZmVyLmxlbmd0aDtcbiAgICAgIHRoaXMuYnVmZmVyID0gYnVmO1xuICAgICAgdGhpcy5zdGFydCA9IDA7XG4gICAgICB0aGlzLmVuZCA9IHRoaXMuc2l6ZTtcbiAgICB9XG4gICAgdGhpcy5zaXplICs9IGRlbHRhO1xuICAgIHJldHVybiBvdXQ7XG5cbiAgICAvLyBzdGFydCAmPSB0aGlzLm1hc2s7XG4gICAgLy8gZW5kICY9IHRoaXMubWFzaztcbiAgICAvLyBjb25zdCBkZWx0YSA9IGVsZW1zLmxlbmd0aCAtIGNvdW50O1xuICAgIC8vIGlmIChkZWx0YSA9PT0gMCkge1xuICAgIC8vICAgLy8gbm8gY2hhbmdlIHRvIHRoZSBzaXplXG4gICAgLy8gICBjb25zdCBvdXQgPVxuICAgIC8vICAgICAgIHBpdm90MiA8IHBpdm90MSA/XG4gICAgLy8gICAgICAgICAgIHRoaXMuYnVmZmVyLnNsaWNlKHBpdm90MSkuY29uY2F0KHRoaXMuYnVmZmVyLnNsaWNlKDAsIHBpdm90MikpIDpcbiAgICAvLyAgICAgICAgICAgdGhpcy5idWZmZXIuc2xpY2UocGl2b3QxLCBwaXZvdDIpO1xuICAgIC8vICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgLy8gICAgIHRoaXMuYnVmZmVyWyhwaXZvdDEgKyBpKSAmIHRoaXMubWFza10gPSBlbGVtc1tpXTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIHJldHVybiBvdXQ7XG4gICAgLy8gfSBlbHNlIGlmIChkZWx0YSA8IDApIHtcbiAgICAvLyAgIC8vIGRlcXVlIGlzIHNocmlua2luZ1xuICAgIC8vICAgaWYgKHBpdm90MSA8IHN0YXJ0KSB7XG4gICAgLy8gICAgIC8vIGJyZWFrIGlzIGluIHRoZSBmaXJzdCBjaHVua1xuICAgIC8vICAgICBjb25zdCBwaXZvdDMgPSBwaXZvdDEgKyBlbGVtcy5sZW5ndGg7XG4gICAgLy8gICAgIHRoaXMuYnVmZmVyLnNwbGljZShwaXZvdDEsIGVsZW1zLmxlbmd0aCwgLi4uZWxlbXMpO1xuICAgIC8vICAgICB0aGlzLmJ1ZmZlci5jb3B5V2l0aGluKHBpdm90MywgcGl2b3QyLCBlbmQpO1xuICAgIC8vICAgICB0aGlzLmVuZCArPSBkZWx0YTtcbiAgICAvLyAgICAgdGhpcy5zaXplICs9IGRlbHRhO1xuICAgIC8vICAgfSBlbHNlIGlmIChwaXZvdDIgPCBwaXZvdDEpIHtcbiAgICAvLyAgICAgLy8gYnJlYWsgaXMgYmV0d2VlbiBwaXZvdHM6IGlmIHRoZSBlbGVtZW50cyB0byBpbnNlcnRcbiAgICAvLyAgICAgLy8gY2FuIGNyb3NzIHRoZSBnYXAgdGhlbiB3ZSBjYW4gdHJpdmlhbGx5IGNvcHkuXG4gICAgLy8gICB9IGVsc2Uge1xuICAgIC8vICAgICAvLyBicmVhayBpcyBpbiB0aGUgbGFzdCBjaHVuayBvciBub3QgYXQgYWxsXG4gICAgLy8gICAgIGNvbnN0IHBpdm90MyA9IHBpdm90MiAtIGVsZW1zLmxlbmd0aDtcbiAgICAvLyAgICAgdGhpcy5idWZmZXIuc3BsaWNlKHBpdm90MywgZWxlbXMubGVuZ3RoLCAuLi5lbGVtcyk7XG4gICAgLy8gICAgIHRoaXMuYnVmZmVyLmNvcHlXaXRoaW4oc3RhcnQsIHBpdm90MywgcGl2b3QxKTtcbiAgICAvLyAgICAgdGhpcy5zdGFydCAtPSBkZWx0YTtcbiAgICAvLyAgICAgdGhpcy5zaXplICs9IGRlbHRhO1xuICAgIC8vICAgfSBlbHNlIGlmIChcbiAgICAvLyB9XG4gICAgLy8gLy8gdGhpcy5zdGFydCA8PSBwaXZvdDEgPD0gcGl2b3QyIDw9IHRoaXMuZW5kXG4gICAgLy8gLy8gVGhlIHdyYXAgd2lsbCBvY2N1ciBpbiBhdCBtb3N0IG9uZSBvZiB0aG9zZSBnYXBzXG4gICAgLy8gLy8gRG9uJ3QgbW92ZSB0aGF0IGJsb2NrLlxuICAgIC8vIC8vIElmIHRoZSB3cmFwIG9jY3VycyBiZXR3ZWVuIHBpdm90MSBhbmQgcGl2b3QyIHRoZW4gd2UgbWF5IGJlXG4gICAgLy8gLy8gc3R1Y2sgbWFraW5nIHR3byBjb3BpZXMuICBJbiB0aGF0IGNhc2UsIGp1c3QgcmViYXNlIHRvIDAuXG4gICAgXG4gIH1cblxuICB0b1N0cmluZygpIHtcbiAgICBjb25zdCBwYXJ0cyA9IG5ldyBBcnJheSh0aGlzLnNpemUpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zaXplOyBpKyspIHtcbiAgICAgIHBhcnRzW2ldID0gdGhpcy5idWZmZXJbKHRoaXMuc3RhcnQgKyBpKSAmIHRoaXMubWFza107XG4gICAgfVxuICAgIHJldHVybiBgWyR7cGFydHMuam9pbignLCAnKX1dYDtcbiAgfVxufVxuXG4vLyAvKiogQHRlbXBsYXRlIFQgKi9cbi8vIGV4cG9ydCBjbGFzcyBEZXF1ZVNldCB7XG4vLyAgIGNvbnN0cnVjdG9yKCkge1xuLy8gICAgIC8qKiBAdHlwZSB7IUFycmF5PFR8dW5kZWZpbmVkPn0gKi9cbi8vICAgICB0aGlzLmJ1ZmZlciA9IG5ldyBBcnJheSgxNik7XG4vLyAgICAgLyoqIEB0eXBlIHtudW1iZXJ9ICovXG4vLyAgICAgdGhpcy5tYXNrID0gMHhmO1xuLy8gICAgIC8qKiBAdHlwZSB7bnVtYmVyfSAqL1xuLy8gICAgIHRoaXMuc3RhcnQgPSAwO1xuLy8gICAgIC8qKiBAdHlwZSB7bnVtYmVyfSAqL1xuLy8gICAgIHRoaXMuZW5kID0gMDtcbi8vICAgICAvKiogQHR5cGUge251bWJlcn0gKi9cbi8vICAgICB0aGlzLnNpemUgPSAwOyAvLyByZWFkb25seSBleHRlcm5hbGx5XG4vLyAgICAgLyoqIEB0eXBlIHshU2V0PFQ+fSAqL1xuLy8gICAgIHRoaXMuc2V0ID0gbmV3IFNldCgpO1xuLy8gICB9XG5cbi8vICAgdXBzaXplKHRhcmdldCkge1xuLy8gICAgIHdoaWxlICh0aGlzLm1hc2sgPCB0YXJnZXQpIHtcbi8vICAgICAgIHRoaXMuc3RhcnQgKz0gdGhpcy5tYXNrICsgMTtcbi8vICAgICAgIHRoaXMubWFzayA9IHRoaXMubWFzayA8PCAxIHwgMTtcbi8vICAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIuY29uY2F0KHRoaXMuYnVmZmVyKTtcbi8vICAgICB9XG4vLyAgICAgdGhpcy5zaXplID0gdGFyZ2V0O1xuLy8gICB9XG5cbi8vICAgLyoqIEBwYXJhbSB7Li4uVH0gZWxlbSAqL1xuLy8gICBwdXNoKC4uLmVsZW1zKSB7XG4vLyAgICAgdGhpcy51cHNpemUodGhpcy5zaXplICsgZWxlbXMubGVuZ3RoKTtcbi8vICAgICBmb3IgKGNvbnN0IGVsZW0gb2YgZWxlbXMpIHtcbi8vICAgICAgIGlmICh0aGlzLnNldC5oYXMoZWxlbSkpIHtcbi8vICAgICAgICAgdGhpcy5zaXplLS07XG4vLyAgICAgICAgIGNvbnRpbnVlO1xuLy8gICAgICAgfVxuLy8gICAgICAgdGhpcy5idWZmZXJbdGhpcy5lbmRdID0gZWxlbTtcbi8vICAgICAgIHRoaXMuZW5kID0gKHRoaXMuZW5kICsgMSkgJiB0aGlzLm1hc2s7XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgLyoqIEByZXR1cm4ge1R8dW5kZWZpbmVkfSAqL1xuLy8gICBwb3AoKSB7XG4vLyAgICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4vLyAgICAgdGhpcy5lbmQgPSAodGhpcy5lbmQgLSAxKSAmIHRoaXMubWFzaztcbi8vICAgICB0aGlzLnNpemUtLTtcbi8vICAgICBjb25zdCBvdXQgPSB0aGlzLmJ1ZmZlclt0aGlzLmVuZF07XG4vLyAgICAgdGhpcy5zZXQuZGVsZXRlKG91dCk7XG4vLyAgICAgcmV0dXJuIG91dDtcbi8vICAgfVxuXG4vLyAgIC8qKiBAcmV0dXJuIHtUfHVuZGVmaW5lZH0gKi9cbi8vICAgcGVlaygpIHtcbi8vICAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbi8vICAgICByZXR1cm4gdGhpcy5idWZmZXJbKHRoaXMuZW5kIC0gMSkgJiB0aGlzLm1hc2tdO1xuLy8gICB9XG5cbi8vICAgLyoqIEBwYXJhbSB7Li4uVH0gZWxlbSAqL1xuLy8gICB1bnNoaWZ0KC4uLmVsZW1zKSB7XG4vLyAgICAgdGhpcy51cHNpemUodGhpcy5zaXplICsgZWxlbXMubGVuZ3RoKTtcbi8vICAgICBmb3IgKGNvbnN0IGVsZW0gb2YgZWxlbXMpIHtcbi8vICAgICAgIGlmICh0aGlzLnNldC5oYXMoZWxlbSkpIHtcbi8vICAgICAgICAgdGhpcy5zaXplLS07XG4vLyAgICAgICAgIGNvbnRpbnVlO1xuLy8gICAgICAgfVxuLy8gICAgICAgdGhpcy5zdGFydCA9ICh0aGlzLnN0YXJ0IC0gMSkgJiB0aGlzLm1hc2s7XG4vLyAgICAgICB0aGlzLmJ1ZmZlclt0aGlzLnN0YXJ0XSA9IGVsZW07XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgLyoqIEByZXR1cm4ge1R8dW5kZWZpbmVkfSAqL1xuLy8gICBzaGlmdCgpIHtcbi8vICAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbi8vICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmJ1ZmZlclt0aGlzLnN0YXJ0XTtcbi8vICAgICB0aGlzLnN0YXJ0ID0gKHRoaXMuc3RhcnQgKyAxKSAmIHRoaXMubWFzaztcbi8vICAgICB0aGlzLnNpemUtLTtcbi8vICAgICB0aGlzLnNldC5yZW1vdmUocmVzdWx0KTtcbi8vICAgICByZXR1cm4gcmVzdWx0O1xuLy8gICB9XG5cbi8vICAgLyoqIEByZXR1cm4ge1R8dW5kZWZpbmVkfSAqL1xuLy8gICBmcm9udCgpIHtcbi8vICAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbi8vICAgICByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5zdGFydF07XG4vLyAgIH1cbi8vIH1cblxuLy8gZXhwb3J0IGNsYXNzIEluZGV4ZWRMaXN0IHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgdGhpcy5saXN0ID0gW107XG4vLyAgICAgdGhpcy5tYXAgPSBuZXcgTWFwKCk7XG4vLyAgIH1cblxuLy8gICBhZGQoZWxlbSkge1xuLy8gICAgIGlmICh0aGlzLm1hcC5oYXMoZWxlbSkpIHJldHVybjtcbi8vICAgICB0aGlzLm1hcC5zZXQoZWxlbSwgdGhpcy5saXN0Lmxlbmd0aCk7XG4vLyAgICAgdGhpcy5saXN0LnB1c2goZWxlbSk7XG4vLyAgIH1cblxuLy8gICBpbmRleE9mKGVsZW0pIHtcbi8vICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KGVsZW0pO1xuLy8gICB9XG5cbi8vICAgcmVtb3ZlKGVsZW0pIHtcbi8vICAgICAvLyBUT0RPIC0gdGhpcyBpc24ndCBzdXBlciBlZmZpY2llbnQuLi5cbi8vICAgICAvLyBXZSBjb3VsZCBtYWludGFpbiBhIHNtYWxsIGhhbmRmdWwgb2Ygc3BsaXQgcG9pbnRzLlxuLy8gICAgIC8vIE9yIGEgUmVtb3ZhbFRyZWUgd2hlcmUgaXQgc3RhcnRzIHdpdGggYSBmdWxseS1iYWxhbmNlZFxuLy8gICAgIC8vIGJpbmFyeSB0cmVlIChoZWlnaHQgfiBsb2cobikpIGFuZCB0aGVuIHdlIGp1c3QgcmVtb3ZlXG4vLyAgICAgLy8gZWxlbWVudHMgZnJvbSB0aGVyZSBzbyB0aGF0IHdlIG9ubHkgbmVlZCB0byB1cGRhdGVcbi8vICAgICAvLyBPKGxvZyhuKSkgXCJzaXplXCIgdmFsdWVzIG9uIHRoZSB3YXkgdXAuICBUaG91Z2ggdGhpc1xuLy8gICAgIC8vIGRvZXNuJ3QgaGVscCB0byBhY3R1YWxseSAqZmluZCogdGhlIGVsZW1lbnQuLi5cbi8vICAgICAvLyBBbm90aGVyIG9wdGlvbiB3b3VsZCBiZSB0byB1c2UgdGhlIGJpdHMgb2YgdGhlIGluZGV4XG4vLyAgICAgLy8gdG8ga2VlcCB0cmFjayBvZiB0aGUgbnVtYmVyIG9mIHJlbW92ZWQgZWxlbWVudHMgYmVmb3JlLlxuLy8gICAgIC8vIFNvIHdlIGhhdmUgYSBzYW1lLXNpemUgYXJyYXkgb2YgbnVtYmVyc1xuLy8gICAgIC8vIHdoZXJlIGVhY2ggZW50cnkgdGVsbHMgdGhlIHNpemUgdG8gYWRkIGZvciB0aGUgTnRoIG9uZS1iaXRcbi8vICAgICAvLyBhbmQgYWxsIHRoZSBoaWdoZXIgYml0cy5cbi8vICAgICAvLyAgIDAwIC0+IDBcbi8vICAgICAvLyAgIDAxIC0+IDFcbi8vICAgICAvLyAgIDEwIC0+IDJcbi8vICAgICAvLyAgIDExIC0+IDMgPSAyICsgMVxuLy8gICAgIC8vIFN0b3Jpbmdcbi8vICAgICAvLyAgIFgjICAtPiAyXG4vLyAgICAgLy8gICAxWCAgLT4gMVxuLy8gICAgIC8vICAgMFggIC0+IDFcbi8vICAgICAvLyBGb3IgYmlnZ2VyIGxpc3QsXG4vLyAgICAgLy8gICAxMVggLT4gMSAgICBzdG9yZWQgYXQgICAgMTExID0gN1xuLy8gICAgIC8vICAgMTBYIC0+IDEgICAgICAgICAgICAgICAgIDExMCA9IDZcbi8vICAgICAvLyAgIDAxWCAtPiAxICAgICAgICAgICAgICAgICAxMDEgPSA1XG4vLyAgICAgLy8gICAwMFggLT4gMSAgICAgICAgICAgICAgICAgMTAwID0gNFxuLy8gICAgIC8vICAgMVgjIC0+IDIgICAgICAgICAgICAgICAgIDAxMSA9IDNcbi8vICAgICAvLyAgIDBYIyAtPiAyICAgICAgICAgICAgICAgICAwMTAgPSAyXG4vLyAgICAgLy8gICBYIyMgLT4gNCAgICAgICAgICAgICAgICAgMDAxID0gMVxuLy8gICAgIC8vIFRoZSB1cHNob3QgaXMgdGhhdCB3aGVuIHJlbW92aW5nIGFuIGVsZW1lbnQgd2Ugb25seSBuZWVkIHRvXG4vLyAgICAgLy8gdXBkYXRlIE8obG9nKG4pKSBlbGVtZW50cy4uLlxuLy8gICAgIC8vIEFuZCB3ZSBjYW4gYXZvaWQgc3BsaWNpbmcgdGhlIGxpc3QgYW5kIGV2ZW4gZmluZCB0aGUgZmlyc3Rcbi8vICAgICAvLyBlbGVtZW50IHdpdGggYmluYXJ5IHNlYXJjaCAtIE8obG9nKG4pKVxuLy8gICAgIGNvbnN0IGluZGV4ID0gdGhpcy5tYXAuZ2V0KGVsZW0pO1xuLy8gICAgIGlmIChpbmRleCA9PSBudWxsKSByZXR1cm47XG4vLyAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSk7XG4vLyAgICAgdGhpcy5tYXAuZGVsZXRlKGVsZW0pO1xuLy8gICAgIGZvciAobGV0IGkgPSBpbmRleDsgaSA8IHRoaXMubGlzdC5sZW5ndGg7IGkrKykge1xuLy8gICAgICAgdGhpcy5tYXAuc2V0KHRoaXMubGlzdFtpXSwgaSk7XG4vLyAgICAgfVxuLy8gICB9XG5cbi8vICAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMubGlzdFtTeW1ib2wuaXRlcmF0b3JdKCk7XG4vLyAgIH1cbi8vIH1cblxuZXhwb3J0IGNvbnN0IGJyZWFrTGluZXMgPSAoc3RyOiBzdHJpbmcsIGxlbjogbnVtYmVyKTogc3RyaW5nW10gPT4ge1xuICBzdHIgPSBzdHIudHJpbSgpO1xuICBjb25zdCBvdXQ6IHN0cmluZ1tdID0gW107XG4gIHdoaWxlIChzdHIubGVuZ3RoID4gbGVuKSB7XG4gICAgbGV0IGIgPSBzdHIuc3Vic3RyaW5nKDAsIGxlbikubGFzdEluZGV4T2YoJyAnKTtcbiAgICBpZiAoYiA8IDApIGIgPSBsZW47XG4gICAgb3V0LnB1c2goc3RyLnN1YnN0cmluZygwLCBiKS50cmltKCkpO1xuICAgIHN0ciA9IHN0ci5zdWJzdHJpbmcoYikudHJpbSgpO1xuICB9XG4gIG91dC5wdXNoKHN0ci50cmltKCkpO1xuICByZXR1cm4gb3V0O1xufTtcblxuZXhwb3J0IGNsYXNzIFVzYWdlRXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuXG5leHBvcnQgY2xhc3MgU3VmZml4VHJpZTxUPiB7XG4gIHJlYWRvbmx5IG5leHQgPSBuZXcgTWFwPHN0cmluZywgU3VmZml4VHJpZTxUPj4oKTtcbiAgZGF0YTogVCB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBrZXk6IHN0cmluZyA9ICcnKSB7fVxuXG4gIGdldChrZXk6IHN0cmluZyk6IFQgfCB1bmRlZmluZWQge1xuICAgIGxldCB0OiBTdWZmaXhUcmllPFQ+IHwgdW5kZWZpbmVkID0gdGhpcztcbiAgICBmb3IgKGxldCBpID0ga2V5Lmxlbmd0aCAtIDE7IGkgPj0gMCAmJiB0OyBpKyspIHtcbiAgICAgIHQgPSB0Lm5leHQuZ2V0KGtleVtpXSk7XG4gICAgfVxuICAgIHJldHVybiB0ICYmIHQuZGF0YTtcbiAgfVxuXG4gIHdpdGgoYzogc3RyaW5nKTogU3VmZml4VHJpZTxUPiB7XG4gICAgbGV0IHQgPSB0aGlzLm5leHQuZ2V0KGMpO1xuICAgIGlmICghdCkgdGhpcy5uZXh0LnNldChjLCAodCA9IG5ldyBTdWZmaXhUcmllPFQ+KGMgKyB0aGlzLmtleSkpKTtcbiAgICByZXR1cm4gdDtcbiAgfVxuXG4gIHNldChrZXk6IHN0cmluZywgdmFsdWU6IFQgfCB1bmRlZmluZWQpIHtcbiAgICBsZXQgdDogU3VmZml4VHJpZTxUPiA9IHRoaXM7XG4gICAgZm9yIChsZXQgaSA9IGtleS5sZW5ndGggLSAxOyBpID49IDAgJiYgdDsgaSsrKSB7XG4gICAgICB0ID0gdC53aXRoKGtleVtpXSk7XG4gICAgfVxuICAgIHQuZGF0YSA9IHZhbHVlO1xuICB9XG5cbiAgKiB2YWx1ZXMoKTogSXRlcmFibGU8VD4ge1xuICAgIGNvbnN0IHN0YWNrOiBTdWZmaXhUcmllPFQ+W10gPSBbdGhpc107XG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgY29uc3QgdG9wID0gc3RhY2sucG9wKCkhO1xuICAgICAgaWYgKHRvcC5kYXRhKSB5aWVsZCB0b3AuZGF0YTtcbiAgICAgIHN0YWNrLnB1c2goLi4udG9wLm5leHQudmFsdWVzKCkpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGVmYXVsdE1hcDxLLCBWIGV4dGVuZHMge30+IGV4dGVuZHMgTWFwPEssIFY+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBzdXBwbGllcjogKGtleTogSykgPT4gVixcbiAgICAgICAgICAgICAgaW5pdD86IEl0ZXJhYmxlPHJlYWRvbmx5IFtLLCBWXT4pIHtcbiAgICBzdXBlcihpbml0IGFzIGFueSk7IC8vIE5PVEU6IE1hcCdzIGRlY2xhcmF0aW9ucyBhcmUgb2ZmLCBJdGVyYWJsZSBpcyBmaW5lLlxuICB9XG4gIGdldChrZXk6IEspOiBWIHtcbiAgICBsZXQgdmFsdWUgPSBzdXBlci5nZXQoa2V5KTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgc3VwZXIuc2V0KGtleSwgdmFsdWUgPSB0aGlzLnN1cHBsaWVyKGtleSkpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBzb3J0ZWRLZXlzKGZuPzogKGE6IEssIGI6IEspID0+IG51bWJlcik6IEtbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmtleXMoKV0uc29ydChmbik7XG4gIH1cbiAgc29ydGVkRW50cmllcyhmbj86IChhOiBLLCBiOiBLKSA9PiBudW1iZXIpOiBBcnJheTxbSywgVl0+IHtcbiAgICByZXR1cm4gdGhpcy5zb3J0ZWRLZXlzKGZuKS5tYXAoayA9PiBbaywgdGhpcy5nZXQoaykgYXMgVl0pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbmRleGVkU2V0PFQgZXh0ZW5kcyB7fT4ge1xuICBwcml2YXRlIGZvcndhcmQ6IFRbXSA9IFtdO1xuICBwcml2YXRlIHJldmVyc2UgPSBuZXcgTWFwPFQsIG51bWJlcj4oKTtcblxuICBhZGQoZWxlbTogVCk6IG51bWJlciB7XG4gICAgbGV0IHJlc3VsdCA9IHRoaXMucmV2ZXJzZS5nZXQoZWxlbSk7XG4gICAgaWYgKHJlc3VsdCA9PSBudWxsKSB0aGlzLnJldmVyc2Uuc2V0KGVsZW0sIHJlc3VsdCA9IHRoaXMuZm9yd2FyZC5wdXNoKGVsZW0pIC0gMSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGdldChpbmRleDogbnVtYmVyKTogVCB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZFtpbmRleF07XG4gIH1cbn1cblxuZXhwb3J0IG5hbWVzcGFjZSBpdGVycyB7XG4gIC8vIENvbmNhdGVuYXRlcyBpdGVyYWJsZXMuXG4gIGV4cG9ydCBmdW5jdGlvbiAqIGNvbmNhdDxUPiguLi5pdGVyczogQXJyYXk8SXRlcmFibGU8VD4+KTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgZm9yIChjb25zdCBpdGVyIG9mIGl0ZXJzKSB7XG4gICAgICB5aWVsZCAqIGl0ZXI7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHkoaXRlcjogSXRlcmFibGU8dW5rbm93bj4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gQm9vbGVhbihpdGVyW1N5bWJvbC5pdGVyYXRvcl0oKS5uZXh0KCkuZG9uZSk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gKiBtYXA8VCwgVT4oaXRlcjogSXRlcmFibGU8VD4sIGY6IChlbGVtOiBUKSA9PiBVKTogSXRlcmFibGVJdGVyYXRvcjxVPiB7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGl0ZXIpIHtcbiAgICAgIHlpZWxkIGYoZWxlbSk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiAqIGZpbHRlcjxUPihpdGVyOiBJdGVyYWJsZTxUPiwgZjogKGVsZW06IFQpID0+IGJvb2xlYW4pOiBJdGVyYWJsZTxUPiB7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGl0ZXIpIHtcbiAgICAgIGlmIChmKGVsZW0pKSB5aWVsZCBlbGVtO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gKiBmbGF0TWFwPFQsIFU+KGl0ZXI6IEl0ZXJhYmxlPFQ+LCBmOiAoZWxlbTogVCkgPT4gSXRlcmFibGU8VT4pOiBJdGVyYWJsZUl0ZXJhdG9yPFU+IHtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgaXRlcikge1xuICAgICAgeWllbGQgKiBmKGVsZW0pO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gY291bnQoaXRlcjogSXRlcmFibGU8dW5rbm93bj4pOiBudW1iZXIge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgZm9yIChjb25zdCBfIG9mIGl0ZXIpIHtcbiAgICAgIGNvdW50Kys7XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBmaXJzdDxUPihpdGVyOiBJdGVyYWJsZTxUPik6IFQ7XG4gIGV4cG9ydCBmdW5jdGlvbiBmaXJzdDxUPihpdGVyOiBJdGVyYWJsZTxUPiwgZmFsbGJhY2s6IFQpOiBUO1xuICBleHBvcnQgZnVuY3Rpb24gZmlyc3Q8VD4oaXRlcjogSXRlcmFibGU8VD4sIGZhbGxiYWNrPzogVCk6IFQge1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBpdGVyKSByZXR1cm4gZWxlbTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHRocm93IG5ldyBFcnJvcihgRW1wdHkgaXRlcmFibGU6ICR7aXRlcn1gKTtcbiAgICByZXR1cm4gZmFsbGJhY2sgYXMgVDsgICAgXG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gemlwPEEsIEI+KGxlZnQ6IEl0ZXJhYmxlPEE+LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBJdGVyYWJsZTxCPik6IEl0ZXJhYmxlPFtBLCBCXT47XG4gIGV4cG9ydCBmdW5jdGlvbiB6aXA8QSwgQiwgQz4obGVmdDogSXRlcmFibGU8QT4sIHJpZ2h0OiBJdGVyYWJsZTxCPixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBwZXI6IChhOiBBLCBiOiBCKSA9PiBDKTogSXRlcmFibGU8Qz47XG4gIGV4cG9ydCBmdW5jdGlvbiB6aXA8QSwgQiwgQz4obGVmdDogSXRlcmFibGU8QT4sIHJpZ2h0OiBJdGVyYWJsZTxCPixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6aXBwZXI6IChhOiBBLCBiOiBCKSA9PiBDID0gKGEsIGIpID0+IFthLCBiXSBhcyBhbnkpOlxuICBJdGVyYWJsZTxDPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICogW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgICAgIGNvbnN0IGxlZnRJdGVyID0gbGVmdFtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgIGNvbnN0IHJpZ2h0SXRlciA9IHJpZ2h0W1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgbGV0IGEsIGI7XG4gICAgICAgIHdoaWxlICgoYSA9IGxlZnRJdGVyLm5leHQoKSwgYiA9IHJpZ2h0SXRlci5uZXh0KCksICFhLmRvbmUgJiYgIWIuZG9uZSkpIHtcbiAgICAgICAgICB5aWVsZCB6aXBwZXIoYS52YWx1ZSwgYi52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcHJlYWQ8VD4oaXRlcjogSXRlcmFibGU8VD4pOiBUW10ge1xuICByZXR1cm4gWy4uLml0ZXJdO1xufVxuXG4vKiogQSBzZXQgb2Ygb2JqZWN0cyB3aXRoIHVuaXF1ZSBsYWJlbHMgKGJhc2ljYWxseSB0b1N0cmluZy1lcXVpdmFsZW5jZSkuICovXG5leHBvcnQgY2xhc3MgTGFiZWxlZFNldDxUIGV4dGVuZHMgTGFiZWxlZD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUPiB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDxTdHJpbmcsIFQ+KCk7XG4gIGFkZChlbGVtOiBUKSB7XG4gICAgdGhpcy5tYXAuc2V0KGVsZW0ubGFiZWwsIGVsZW0pO1xuICB9XG4gIGhhcyhlbGVtOiBUKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhcyhlbGVtLmxhYmVsKTtcbiAgfVxuICBkZWxldGUoZWxlbTogVCkge1xuICAgIHRoaXMubWFwLmRlbGV0ZShlbGVtLmxhYmVsKTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAudmFsdWVzKCk7XG4gIH1cbn1cbi8qKiBTdXBlcmludGVyZmFjZSBmb3Igb2JqZWN0cyB0aGF0IGNhbiBiZSBzdG9yZWQgaW4gYSBMYWJlbGVkU2V0LiAqL1xuZXhwb3J0IGludGVyZmFjZSBMYWJlbGVkIHtcbiAgcmVhZG9ubHkgbGFiZWw6IHN0cmluZztcbn1cblxuY29uc3QgSU5WQUxJREFURUQgPSBTeW1ib2woJ0ludmFsaWRhdGVkJyk7XG5jb25zdCBTSVpFID0gU3ltYm9sKCdTaXplJyk7XG5cbmNsYXNzIFNldE11bHRpbWFwU2V0VmlldzxLLCBWPiBpbXBsZW1lbnRzIFNldDxWPiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3duZXJNYXA6IE1hcDxLLCBTZXQ8Vj4+LFxuICAgICAgICAgICAgICBwcml2YXRlIHJlYWRvbmx5IG93bmVyS2V5OiBLLCBwcml2YXRlIGN1cnJlbnRTZXQ/OiBTZXQ8Vj4pIHt9XG4gIHByaXZhdGUgZ2V0Q3VycmVudFNldCgpIHtcbiAgICBpZiAoIXRoaXMuY3VycmVudFNldCB8fCAodGhpcy5jdXJyZW50U2V0IGFzIGFueSlbSU5WQUxJREFURURdKSB7XG4gICAgICB0aGlzLmN1cnJlbnRTZXQgPSB0aGlzLm93bmVyTWFwLmdldCh0aGlzLm93bmVyS2V5KSB8fCBuZXcgU2V0PFY+KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmN1cnJlbnRTZXQ7XG4gIH1cbiAgcHJpdmF0ZSBtdXRhdGVTZXQ8Uj4oZjogKHM6IFNldDxWPikgPT4gUik6IFIge1xuICAgIGNvbnN0IHNldCA9IHRoaXMuZ2V0Q3VycmVudFNldCgpO1xuICAgIGNvbnN0IHNpemUgPSBzZXQuc2l6ZTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGYoc2V0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgKHRoaXMub3duZXJNYXAgYXMgYW55KVtTSVpFXSArPSBzZXQuc2l6ZSAtIHNpemU7XG4gICAgICBpZiAoIXNldC5zaXplKSB7XG4gICAgICAgIHRoaXMub3duZXJNYXAuZGVsZXRlKHRoaXMub3duZXJLZXkpO1xuICAgICAgICAoc2V0IGFzIGFueSlbSU5WQUxJREFURURdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYWRkKGVsZW06IFYpOiB0aGlzIHtcbiAgICB0aGlzLm11dGF0ZVNldChzID0+IHMuYWRkKGVsZW0pKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBoYXMoZWxlbTogVik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRTZXQoKS5oYXMoZWxlbSk7XG4gIH1cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5tdXRhdGVTZXQocyA9PiBzLmNsZWFyKCkpO1xuICB9XG4gIGRlbGV0ZShlbGVtOiBWKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubXV0YXRlU2V0KHMgPT4gcy5kZWxldGUoZWxlbSkpO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Vj4ge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRTZXQoKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cbiAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Vj4ge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRTZXQoKS52YWx1ZXMoKTtcbiAgfVxuICBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Vj4ge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRTZXQoKS5rZXlzKCk7XG4gIH1cbiAgZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtWLCBWXT4ge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRTZXQoKS5lbnRyaWVzKCk7XG4gIH1cbiAgZm9yRWFjaDxUPihjYWxsYmFjazogKHZhbHVlOiBWLCBrZXk6IFYsIHNldDogU2V0PFY+KSA9PiB2b2lkLCB0aGlzQXJnPzogVCk6IHZvaWQge1xuICAgIHRoaXMuZ2V0Q3VycmVudFNldCgpLmZvckVhY2goY2FsbGJhY2ssIHRoaXNBcmcpO1xuICB9XG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q3VycmVudFNldCgpLnNpemU7XG4gIH1cbiAgZ2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdTZXQnO1xuICB9XG59XG4vLyBGaXggJ2luc3RhbmNlb2YnIHRvIHdvcmsgcHJvcGVybHkgd2l0aG91dCByZXF1aXJpbmcgYWN0dWFsIHN1cGVyY2xhc3MuLi5cblJlZmxlY3Quc2V0UHJvdG90eXBlT2YoU2V0TXVsdGltYXBTZXRWaWV3LnByb3RvdHlwZSwgU2V0LnByb3RvdHlwZSk7XG5cbmV4cG9ydCBjbGFzcyBTZXRNdWx0aW1hcDxLLCBWPiB7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBtYXAgPSBuZXcgTWFwPEssIFNldDxWPj4oKTtcblxuICBjb25zdHJ1Y3RvcihlbnRyaWVzOiBJdGVyYWJsZTxyZWFkb25seSBbSywgVl0+ID0gW10pIHtcbiAgICAodGhpcy5tYXAgYXMgYW55KVtTSVpFXSA9IDA7XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgZW50cmllcykge1xuICAgICAgdGhpcy5hZGQoaywgdik7XG4gICAgfVxuICB9XG5cbiAgZ2V0IHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gKHRoaXMubWFwIGFzIGFueSlbU0laRV07XG4gIH1cblxuICBnZXQoazogSyk6IFNldDxWPiB7XG4gICAgcmV0dXJuIG5ldyBTZXRNdWx0aW1hcFNldFZpZXcodGhpcy5tYXAsIGssIHRoaXMubWFwLmdldChrKSk7XG4gIH1cblxuICBhZGQoazogSywgdjogVik6IHZvaWQge1xuICAgIGxldCBzZXQgPSB0aGlzLm1hcC5nZXQoayk7XG4gICAgaWYgKCFzZXQpIHRoaXMubWFwLnNldChrLCBzZXQgPSBuZXcgU2V0KCkpO1xuICAgIGNvbnN0IHNpemUgPSBzZXQuc2l6ZTtcbiAgICBzZXQuYWRkKHYpO1xuICAgICh0aGlzLm1hcCBhcyBhbnkpW1NJWkVdICs9IHNldC5zaXplIC0gc2l6ZTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBpdGVyYXRpb24/XG59XG5cblxuZXhwb3J0IGNsYXNzIE11bHRpc2V0PFQ+IGltcGxlbWVudHMgSXRlcmFibGU8W1QsIG51bWJlcl0+IHtcbiAgcHJpdmF0ZSBlbnRyaWVzOiBEZWZhdWx0TWFwPFQsIG51bWJlcj47XG4gIGNvbnN0cnVjdG9yKGVudHJpZXM6IEl0ZXJhYmxlPFtULCBudW1iZXJdPiA9IFtdKSB7XG4gICAgdGhpcy5lbnRyaWVzID0gbmV3IERlZmF1bHRNYXAoKCkgPT4gMCwgZW50cmllcyk7XG4gIH1cbiAgYWRkKGVsZW06IFQpIHtcbiAgICB0aGlzLmVudHJpZXMuc2V0KGVsZW0sIHRoaXMuZW50cmllcy5nZXQoZWxlbSkgKyAxKTtcbiAgfVxuICBkZWxldGUoZWxlbTogVCkge1xuICAgIGNvbnN0IGNvdW50ID0gdGhpcy5lbnRyaWVzLmdldChlbGVtKSAtIDE7XG4gICAgaWYgKGNvdW50ID4gMCkge1xuICAgICAgdGhpcy5lbnRyaWVzLnNldChlbGVtLCBjb3VudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZW50cmllcy5kZWxldGUoZWxlbSk7XG4gICAgfVxuICB9XG4gIHVuaXF1ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmVudHJpZXMuc2l6ZTtcbiAgfVxuICBjb3VudChlbGVtOiBUKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5lbnRyaWVzLmhhcyhlbGVtKSA/IHRoaXMuZW50cmllcy5nZXQoZWxlbSkgOiAwO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1QsIG51bWJlcl0+IHtcbiAgICByZXR1cm4gdGhpcy5lbnRyaWVzLmVudHJpZXMoKTtcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnROZXZlcih4OiBuZXZlcik6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKGBub24tZXhoYXVzdGl2ZSBjaGVjazogJHt4fWApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0PFQ+KHg6IFR8dW5kZWZpbmVkfG51bGwpOiBUIHtcbiAgaWYgKCF4KSB0aHJvdyBuZXcgRXJyb3IoYGFzc2VydGVkIGJ1dCBmYWxzeTogJHt4fWApO1xuICByZXR1cm4geDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTm9uTnVsbDxUIGV4dGVuZHMge30+KHg6IFR8dW5kZWZpbmVkfG51bGwpOiB4IGlzIFQge1xuICByZXR1cm4geCAhPSBudWxsO1xufVxuLy8gZXhwb3J0IGZ1bmN0aW9uIG5vbk51bGw8VCBleHRlbmRzIHt9Pih4OiBUfHVuZGVmaW5lZHxudWxsKTogVCB7XG4vLyAgIGlmICh4ICE9IG51bGwpIHJldHVybiB4O1xuLy8gICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG5vbi1udWxsYCk7XG4vLyB9XG5cblxuLy8gR2VuZXJhbGl6ZWQgbWVtb2l6YXRpb24gd3JhcHBlci4gIEFsbCBhcmd1bWVudHMgbXVzdCBiZSBvYmplY3RzLFxuLy8gYnV0IGFueSBudW1iZXIgb2YgYXJndW1lbnRzIGlzIGFsbG93ZWQuXG50eXBlIEY8QSBleHRlbmRzIGFueVtdLCBSPiA9ICguLi5hcmdzOiBBKSA9PiBSO1xuZXhwb3J0IGZ1bmN0aW9uIG1lbW9pemU8VCBleHRlbmRzIG9iamVjdFtdLCBSPihmOiBGPFQsIFI+KTogRjxULCBSPiB7XG4gIGludGVyZmFjZSBWIHtcbiAgICBuZXh0PzogV2Vha01hcDxhbnksIFY+O1xuICAgIHZhbHVlPzogUjtcbiAgICBjYWNoZWQ/OiBib29sZWFuO1xuICB9XG4gIGNvbnN0IGNhY2hlOiBWID0ge307XG4gIHJldHVybiBmdW5jdGlvbih0aGlzOiBhbnksIC4uLmFyZ3M6IGFueVtdKSB7XG4gICAgbGV0IGMgPSBjYWNoZTtcbiAgICBmb3IgKGNvbnN0IGFyZyBvZiBhcmdzKSB7XG4gICAgICBpZiAoIWMubmV4dCkgYy5uZXh0ID0gbmV3IFdlYWtNYXA8YW55LCBWPigpO1xuICAgICAgbGV0IG5leHQgPSAoYy5uZXh0IHx8IChjLm5leHQgPSBuZXcgV2Vha01hcCgpKSkuZ2V0KGFyZyk7XG4gICAgICBpZiAoIW5leHQpIGMubmV4dC5zZXQoYXJnLCBuZXh0ID0ge30pO1xuICAgIH1cbiAgICBpZiAoIWMuY2FjaGVkKSB7XG4gICAgICBjLnZhbHVlID0gZi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIGMuY2FjaGVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGMudmFsdWUgYXMgUjtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmNtcChsZWZ0OiBzdHJpbmcsIHJpZ2h0OiBzdHJpbmcpOiBudW1iZXIge1xuICBpZiAobGVmdCA8IHJpZ2h0KSByZXR1cm4gLTE7XG4gIGlmIChyaWdodCA8IGxlZnQpIHJldHVybiAxO1xuICByZXR1cm4gMDtcbn1cblxuLy8gZXhwb3J0IGNsYXNzIFByaW1lSWRHZW5lcmF0b3Ige1xuLy8gICBwcml2YXRlIF9pbmRleCA9IDA7XG4vLyAgIG5leHQoKTogbnVtYmVyIHtcbi8vICAgICBpZiAodGhpcy5faW5kZXggPj0gUFJJTUVTLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdvdmVyZmxvdycpO1xuLy8gICAgIHJldHVybiBQUklNRVNbdGhpcy5faW5kZXgrK107XG4vLyAgIH1cbi8vIH1cbi8vIGNvbnN0IFBSSU1FUyA9ICgoKSA9PiB7XG4vLyAgIGNvbnN0IG4gPSAxMDAwMDtcbi8vICAgY29uc3Qgb3V0ID0gbmV3IFNldCgpO1xuLy8gICBmb3IgKGxldCBpID0gMjsgaSA8IG47IGkrKykgeyBvdXQuYWRkKGkpOyB9XG4vLyAgIGZvciAobGV0IGkgPSAyOyBpICogaSA8IG47IGkrKykge1xuLy8gICAgIGlmICghb3V0LmhhcyhpKSkgY29udGludWU7XG4vLyAgICAgZm9yIChsZXQgaiA9IDIgKiBpOyBqIDwgbjsgaiArPSBpKSB7XG4vLyAgICAgICBvdXQuZGVsZXRlKGopO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gICByZXR1cm4gWy4uLm91dF07XG4vLyB9KSgpO1xuXG5leHBvcnQgY2xhc3MgS2V5ZWQ8SyBleHRlbmRzIG51bWJlciwgVj4gaW1wbGVtZW50cyBJdGVyYWJsZTxbSywgVl0+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBkYXRhOiByZWFkb25seSBWW10pIHt9XG5cbiAgZ2V0KGluZGV4OiBLKTogVnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmRhdGFbaW5kZXhdO1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5lbnRyaWVzKCkgYXMgSXRlcmFibGVJdGVyYXRvcjxbSywgVl0+O1xuICB9XG5cbiAgdmFsdWVzKCk6IEl0ZXJhdG9yPFY+IHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXJyYXlNYXA8SyBleHRlbmRzIG51bWJlciwgVj4gaW1wbGVtZW50cyBJdGVyYWJsZTxbSywgVl0+IHtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IHJldjogUmVhZG9ubHlNYXA8ViwgSz47XG4gIHJlYWRvbmx5IGxlbmd0aDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGF0YTogcmVhZG9ubHkgVltdKSB7XG4gICAgY29uc3QgcmV2ID0gbmV3IE1hcDxWLCBLPigpO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEs7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICByZXYuc2V0KGRhdGFbaV0sIGkpO1xuICAgIH1cbiAgICB0aGlzLnJldiA9IHJldjtcbiAgICB0aGlzLmxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuICB9XG5cbiAgZ2V0KGluZGV4OiBLKTogVnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmRhdGFbaW5kZXhdO1xuICB9XG5cbiAgaGFzVmFsdWUodmFsdWU6IFYpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yZXYuaGFzKHZhbHVlKTtcbiAgfVxuXG4gIGluZGV4KHZhbHVlOiBWKTogS3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5yZXYuZ2V0KHZhbHVlKTtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGluZGV4IGZvciAke3ZhbHVlfWApO1xuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiB0aGlzLmRhdGEuZW50cmllcygpIGFzIEl0ZXJhYmxlSXRlcmF0b3I8W0ssIFZdPjtcbiAgfVxuXG4gIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFY+IHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTXV0YWJsZUFycmF5QmlNYXA8SyBleHRlbmRzIG51bWJlciwgViBleHRlbmRzIG51bWJlcj4ge1xuICBwcml2YXRlIHJlYWRvbmx5IF9md2Q6IFZbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IF9yZXY6IEtbXSA9IFtdO1xuXG4gICogW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxbSywgVl0+IHtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBLOyBpIDwgdGhpcy5fZndkLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB2YWwgPSB0aGlzLl9md2RbaV07XG4gICAgICBpZiAodmFsICE9IG51bGwpIHlpZWxkIFtpLCB2YWxdO1xuICAgIH1cbiAgfVxuXG4gICoga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPEs+IHtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBLOyBpIDwgdGhpcy5fZndkLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5fZndkW2ldICE9IG51bGwpIHlpZWxkIGk7XG4gICAgfVxuICB9XG5cbiAgKiB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxWPiB7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgVjsgaSA8IHRoaXMuX3Jldi5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuX3JldltpXSAhPSBudWxsKSB5aWVsZCBpO1xuICAgIH1cbiAgfVxuXG4gIGdldChpbmRleDogSyk6IFZ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fZndkW2luZGV4XTtcbiAgfVxuXG4gIGhhcyhrZXk6IEspOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZndkW2tleV0gIT0gbnVsbDtcbiAgfVxuXG4gIGhhc1ZhbHVlKHZhbHVlOiBWKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX3Jldlt2YWx1ZV0gIT0gbnVsbDtcbiAgfVxuXG4gIGluZGV4KHZhbHVlOiBWKTogS3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fcmV2W3ZhbHVlXTtcbiAgICBpZiAoaW5kZXggPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGluZGV4IGZvciAke3ZhbHVlfWApO1xuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIHNldChrZXk6IEssIHZhbHVlOiBWKSB7XG4gICAgaWYgKHRoaXMuX2Z3ZFtrZXldKSB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzIGtleSAke2tleX1gKTtcbiAgICBpZiAodGhpcy5fcmV2W3ZhbHVlXSkgdGhyb3cgbmV3IEVycm9yKGBhbHJlYWR5IGhhcyB2YWx1ZSAke3ZhbHVlfWApO1xuICAgIHRoaXMuX2Z3ZFtrZXldID0gdmFsdWU7XG4gICAgdGhpcy5fcmV2W3ZhbHVlXSA9IGtleTtcbiAgfVxuXG4gIHJlcGxhY2Uoa2V5OiBLLCB2YWx1ZTogVik6IFZ8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBvbGRLZXkgPSB0aGlzLl9yZXZbdmFsdWVdO1xuICAgIGlmIChvbGRLZXkgIT0gbnVsbCkgZGVsZXRlIHRoaXMuX2Z3ZFtvbGRLZXldO1xuICAgIGNvbnN0IG9sZFZhbHVlID0gdGhpcy5fZndkW2tleV07XG4gICAgaWYgKG9sZFZhbHVlICE9IG51bGwpIGRlbGV0ZSB0aGlzLl9yZXZbb2xkVmFsdWVdO1xuICAgIHRoaXMuX2Z3ZFtrZXldID0gdmFsdWU7XG4gICAgdGhpcy5fcmV2W3ZhbHVlXSA9IGtleTtcbiAgICByZXR1cm4gb2xkVmFsdWU7XG4gIH1cbn1cblxuLy8gY2FuY2VsbGF0aW9uXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW5SZWdpc3RyYXRpb24ge1xuICB1bnJlZ2lzdGVyKCk6IHZvaWQ7XG59XG5jbGFzcyBDYW5jZWxUb2tlblJlZyB7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNhbGxiYWNrOiAoKSA9PiB2b2lkLFxuICAgICAgICAgICAgICByZWFkb25seSBzb3VyY2U6IENhbmNlbFRva2VuU291cmNlKSB7fVxuICB1bnJlZ2lzdGVyKCkgeyB0aGlzLnNvdXJjZS51bnJlZ2lzdGVyKHRoaXMpOyB9XG59XG5leHBvcnQgY2xhc3MgQ2FuY2VsVG9rZW5Tb3VyY2Uge1xuICByZWFkb25seSB0b2tlbjogQ2FuY2VsVG9rZW47XG4gIHByaXZhdGUgY2FuY2VsbGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVnaXN0cmF0aW9ucyA9IG5ldyBTZXQ8Q2FuY2VsVG9rZW5SZWc+KCk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgY29uc3Qgc291cmNlID0gdGhpcztcbiAgICB0aGlzLnRva2VuID0ge1xuICAgICAgZ2V0IHJlcXVlc3RlZCgpIHsgcmV0dXJuIHNvdXJjZS5jYW5jZWxsZWQ7IH0sXG4gICAgICB0aHJvd0lmUmVxdWVzdGVkKCkge1xuICAgICAgICBpZiAoc291cmNlLmNhbmNlbGxlZCkgdGhyb3cgbmV3IEVycm9yKGBDYW5jZWxsZWRgKTtcbiAgICAgIH0sXG4gICAgICByZWdpc3RlcihjYWxsYmFjazogKCkgPT4gdm9pZCkge1xuICAgICAgICBjb25zdCByZWcgPSBuZXcgQ2FuY2VsVG9rZW5SZWcoY2FsbGJhY2ssIHNvdXJjZSk7XG4gICAgICAgIHNvdXJjZS5yZWdpc3RyYXRpb25zLmFkZChyZWcpO1xuICAgICAgICByZXR1cm4gcmVnO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLy8gVE9ETyAtIHBhcmVudC9jaGlsZD9cblxuICBjYW5jZWwoKSB7XG4gICAgaWYgKHRoaXMuY2FuY2VsbGVkKSByZXR1cm47XG4gICAgdGhpcy5jYW5jZWxsZWQgPSB0cnVlO1xuICAgIGNvbnN0IHJlZ3MgPSBbLi4udGhpcy5yZWdpc3RyYXRpb25zXTtcbiAgICB0aGlzLnJlZ2lzdHJhdGlvbnMuY2xlYXIoKTtcbiAgICBmb3IgKGNvbnN0IHJlZyBvZiByZWdzKSB7XG4gICAgICByZWcuY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cblxuICB1bnJlZ2lzdGVyKHJlZzogQ2FuY2VsVG9rZW5SZWcpIHtcbiAgICB0aGlzLnJlZ2lzdHJhdGlvbnMuZGVsZXRlKHJlZyk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlbiB7XG4gIHJlYWRvbmx5IHJlcXVlc3RlZDogYm9vbGVhbjtcbiAgdGhyb3dJZlJlcXVlc3RlZCgpOiB2b2lkO1xuICByZWdpc3RlcihjYWxsYmFjazogKCkgPT4gdm9pZCk6IENhbmNlbFRva2VuUmVnaXN0cmF0aW9uO1xufVxuZXhwb3J0IG5hbWVzcGFjZSBDYW5jZWxUb2tlbiB7XG4gIGV4cG9ydCBjb25zdCBOT05FOiBDYW5jZWxUb2tlbiA9IHtcbiAgICBnZXQgcmVxdWVzdGVkKCkgeyByZXR1cm4gZmFsc2U7IH0sXG4gICAgdGhyb3dJZlJlcXVlc3RlZCgpIHt9LFxuICAgIHJlZ2lzdGVyKCkgeyByZXR1cm4ge3VucmVnaXN0ZXIoKSB7fX07IH0sXG4gIH07XG4gIGV4cG9ydCBjb25zdCBDQU5DRUxMRUQ6IENhbmNlbFRva2VuID0ge1xuICAgIGdldCByZXF1ZXN0ZWQoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgIHRocm93SWZSZXF1ZXN0ZWQoKSB7IHRocm93IG5ldyBFcnJvcignY2FuY2VsbGVkJyk7IH0sXG4gICAgcmVnaXN0ZXIoKSB7IHJldHVybiB7dW5yZWdpc3RlcigpIHt9fTsgfSxcbiAgfTtcbn1cblxuLy8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBBIHN0cmluZy10by1WIG1hcCB0aGF0IGNhbiBiZSB1c2VkIGVpdGhlciBjYXNlLXNlbnNpdGl2ZWx5XG4gKiBvciBjYXNlLWluc2Vuc2l0aXZlbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDYXNlTWFwPFY+IHtcbiAgcyA9IG5ldyBNYXA8c3RyaW5nLCBWPigpO1xuICBpID0gbmV3IE1hcDxzdHJpbmcsIFY+KCk7XG4gIHNlbnNpdGl2ZSA9IHRydWU7XG5cbiAgc2V0KGtleTogc3RyaW5nLCB2YWw6IFYpIHtcbiAgICBjb25zdCBraSA9IGtleSA9IGtleS50b1VwcGVyQ2FzZSgpO1xuICAgIGlmICh0aGlzLnNlbnNpdGl2ZSkge1xuICAgICAgLy8gVE9ETyAtIGNoZWNrIVxuICAgICAgdGhpcy5zLnNldChrZXksIHZhbCk7XG4gICAgICB0aGlzLmkuc2V0KGtpLCB2YWwpO1xuICAgIH1cbiAgfVxufVxuIl19