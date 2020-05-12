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
    function* take(iter, count) {
        for (const elem of iter) {
            if (--count < 0)
                return;
            yield elem;
        }
    }
    iters_1.take = take;
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
export class Table {
    constructor(elems) {
        this._map = new Map();
        if (elems) {
            for (const [r, c, v] of elems) {
                this.set(r, c, v);
            }
        }
    }
    *[Symbol.iterator]() {
        for (const [r, map] of this._map) {
            for (const [c, v] of map) {
                yield [r, c, v];
            }
        }
    }
    set(r, c, v) {
        let col = this._map.get(r);
        if (!col)
            this._map.set(r, col = new Map());
        col.set(c, v);
    }
    get(r, c) {
        var _a;
        return (_a = this._map.get(r)) === null || _a === void 0 ? void 0 : _a.get(c);
    }
    has(r, c) {
        var _a;
        return ((_a = this._map.get(r)) === null || _a === void 0 ? void 0 : _a.has(c)) || false;
    }
    delete(r, c) {
        const col = this._map.get(r);
        if (!col)
            return;
        col.delete(c);
        if (!col.size)
            this._map.delete(r);
    }
    row(r) {
        var _a;
        return (_a = this._map.get(r)) !== null && _a !== void 0 ? _a : new Map();
    }
}
export function format(fmt, ...args) {
    const split = fmt.split(/%/g);
    let argIndex = 0;
    let out = split[0];
    for (let i = 1; i < split.length; i++) {
        if (!split[i]) {
            out += '%' + split[++i];
            continue;
        }
        const match = /([-+]*)([0\D]?)(\d*)([dxs])/.exec(split[i]);
        if (!match) {
            out += args[argIndex++] + split[i];
            continue;
        }
        const len = parseInt(match[3]) || 0;
        const pad = match[2] || ' ';
        const arg = args[argIndex++];
        let str = match[4] === 'x' ? Number(arg).toString(16) : String(arg);
        if (match[4] !== 's' && /\+/.test(match[1]) && Number(arg) >= 0) {
            str = '+' + str;
        }
        if (str.length < len) {
            const padding = pad.repeat(len - str.length);
            str = /-/.test(match[1]) ? str + padding : padding + str;
        }
        out += str + split[i].substring(match[0].length);
    }
    return out;
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
export function assertType(actual) { }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sT0FBTyxLQUFLO0lBUWhCLFlBQVksSUFBa0I7UUFOdEIsV0FBTSxHQUFzQixJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQyxTQUFJLEdBQVcsR0FBRyxDQUFDO1FBQ25CLFVBQUssR0FBVyxDQUFDLENBQUM7UUFDbEIsUUFBRyxHQUFXLENBQUMsQ0FBQztRQUNoQixTQUFJLEdBQVcsQ0FBQyxDQUFDO1FBR3ZCLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsT0FBTztZQUNMLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUk7b0JBQUUsT0FBTyxFQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDO2dCQUMxRCxPQUFPO29CQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQU07b0JBQ3ZELElBQUksRUFBRSxLQUFLO2lCQUNaLENBQUM7WUFDSixDQUFDO1lBQ0QsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3RCLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksTUFBTTtRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWM7UUFDbkIsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFJ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QUMsSUFBSTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBYSxFQUFFLE1BQWMsSUFBSSxDQUFDLElBQUk7UUFDMUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztZQUFFLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2xDLElBQUksR0FBRyxHQUFHLENBQUM7WUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQztRQUM5QixJQUFJLEdBQUcsSUFBSSxLQUFLO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFDNUIsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDM0UsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkUsSUFBSSxLQUFLLElBQUksR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBUSxDQUFDO1FBQzlELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBUSxDQUFDO0lBQzNFLENBQUM7SUFFRCxNQUFNLENB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O1FBQ25DLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUVsQixJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQztDQUNGO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBSSxNQUFTLElBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBEZXF1ZTxUPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFQ+IHtcblxuICBwcml2YXRlIGJ1ZmZlcjogKFQgfCB1bmRlZmluZWQpW10gPSBuZXcgQXJyYXkoMTYpO1xuICBwcml2YXRlIG1hc2s6IG51bWJlciA9IDB4ZjtcbiAgcHJpdmF0ZSBzdGFydDogbnVtYmVyID0gMDtcbiAgcHJpdmF0ZSBlbmQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgc2l6ZTogbnVtYmVyID0gMDtcblxuICBjb25zdHJ1Y3RvcihpdGVyPzogSXRlcmFibGU8VD4pIHtcbiAgICBpZiAoaXRlcikgdGhpcy5wdXNoKC4uLml0ZXIpO1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmF0b3I8VD4ge1xuICAgIGxldCBpID0gMDtcbiAgICByZXR1cm4ge1xuICAgICAgbmV4dDogKCkgPT4ge1xuICAgICAgICBpZiAoaSA+PSB0aGlzLnNpemUpIHJldHVybiB7dmFsdWU6IHVuZGVmaW5lZCwgZG9uZTogdHJ1ZX07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmFsdWU6IHRoaXMuYnVmZmVyWyh0aGlzLnN0YXJ0ICsgaSsrKSAmIHRoaXMubWFza10gYXMgVCxcbiAgICAgICAgICBkb25lOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB9IGFzIEl0ZXJhdG9yPFQ+O1xuICB9XG5cbiAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnNpemU7XG4gIH1cblxuICB1cHNpemUodGFyZ2V0OiBudW1iZXIpIHtcbiAgICB3aGlsZSAodGhpcy5tYXNrIDw9IHRhcmdldCkge1xuICAgICAgaWYgKHRoaXMuZW5kIDwgdGhpcy5zdGFydCkgdGhpcy5zdGFydCArPSB0aGlzLm1hc2sgKyAxO1xuICAgICAgdGhpcy5tYXNrID0gdGhpcy5tYXNrIDw8IDEgfCAxO1xuICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5jb25jYXQodGhpcy5idWZmZXIpO1xuICAgIH1cbiAgICB0aGlzLnNpemUgPSB0YXJnZXQ7XG4gIH1cblxuICBwdXNoKC4uLmVsZW1zOiBUW10pIHtcbiAgICB0aGlzLnVwc2l6ZSh0aGlzLnNpemUgKyBlbGVtcy5sZW5ndGgpO1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBlbGVtcykge1xuICAgICAgdGhpcy5idWZmZXJbdGhpcy5lbmRdID0gZWxlbTtcbiAgICAgIHRoaXMuZW5kID0gKHRoaXMuZW5kICsgMSkgJiB0aGlzLm1hc2s7XG4gICAgfVxuICB9XG5cbiAgcG9wKCk6IFQgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHRoaXMuZW5kID0gKHRoaXMuZW5kIC0gMSkgJiB0aGlzLm1hc2s7XG4gICAgdGhpcy5zaXplLS07XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuZW5kXTtcbiAgfVxuXG4gIHBlZWsoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyWyh0aGlzLmVuZCAtIDEpICYgdGhpcy5tYXNrXTtcbiAgfVxuXG4gIHVuc2hpZnQoLi4uZWxlbXM6IFRbXSkge1xuICAgIHRoaXMudXBzaXplKHRoaXMuc2l6ZSArIGVsZW1zLmxlbmd0aCk7XG4gICAgbGV0IGkgPSB0aGlzLnN0YXJ0ID0gKHRoaXMuc3RhcnQgLSBlbGVtcy5sZW5ndGgpICYgdGhpcy5tYXNrO1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBlbGVtcykge1xuICAgICAgdGhpcy5idWZmZXJbaSsrICYgdGhpcy5tYXNrXSA9IGVsZW07XG4gICAgfVxuICB9XG5cbiAgc2hpZnQoKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5idWZmZXJbdGhpcy5zdGFydF07XG4gICAgdGhpcy5zdGFydCA9ICh0aGlzLnN0YXJ0ICsgMSkgJiB0aGlzLm1hc2s7XG4gICAgdGhpcy5zaXplLS07XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZyb250KCk6IFQgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLnN0YXJ0XTtcbiAgfVxuXG4gIGdldChpOiBudW1iZXIpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoaSA+PSB0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyWyh0aGlzLnN0YXJ0ICsgaSkgJiB0aGlzLm1hc2tdO1xuICB9XG5cbiAgc2xpY2Uoc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIgPSB0aGlzLnNpemUpOiBUW10ge1xuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ICs9IHRoaXMuc2l6ZTtcbiAgICBpZiAoZW5kIDwgMCkgZW5kICs9IHRoaXMuc2l6ZTtcbiAgICBpZiAoZW5kIDw9IHN0YXJ0KSByZXR1cm4gW107XG4gICAgc3RhcnQgPSAodGhpcy5zdGFydCArIE1hdGgubWF4KDAsIE1hdGgubWluKHRoaXMuc2l6ZSwgc3RhcnQpKSkgJiB0aGlzLm1hc2s7XG4gICAgZW5kID0gKHRoaXMuc3RhcnQgKyBNYXRoLm1heCgwLCBNYXRoLm1pbih0aGlzLnNpemUsIGVuZCkpKSAmIHRoaXMubWFzaztcbiAgICBpZiAoc3RhcnQgPD0gZW5kKSByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2Uoc3RhcnQsIGVuZCkgYXMgVFtdO1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlci5zbGljZShzdGFydCkuY29uY2F0KHRoaXMuYnVmZmVyLnNsaWNlKDAsIGVuZCkpIGFzIFRbXTtcbiAgfVxuXG4gIHNwbGljZShzdGFydDogbnVtYmVyLCBjb3VudDogbnVtYmVyLCAuLi5lbGVtczogVFtdKTogVFtdIHtcbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCArPSB0aGlzLnNpemU7XG4gICAgc3RhcnQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbih0aGlzLnNpemUsIHN0YXJ0KSk7XG4gICAgY291bnQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbih0aGlzLnNpemUgLSBzdGFydCwgY291bnQpKTtcbiAgICBsZXQgZW5kID0gc3RhcnQgKyBjb3VudDtcbiAgICBjb25zdCBkZWx0YSA9IGVsZW1zLmxlbmd0aCAtIGNvdW50O1xuICAgIGNvbnN0IG91dCA9IHRoaXMuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgdGhpcy51cHNpemUodGhpcy5zaXplICsgZGVsdGEpO1xuICAgIHRoaXMuc2l6ZSAtPSBkZWx0YTsgLy8gdW5kbyB0aGUgc2l6ZSBjaGFuZ2Ugc28gc2xpY2Ugd29ya3NcblxuICAgIGlmIChzdGFydCA9PT0gMCkge1xuICAgICAgdGhpcy5zdGFydCA9ICh0aGlzLnN0YXJ0IC0gZGVsdGEpICYgdGhpcy5tYXNrO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlbGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmJ1ZmZlclsodGhpcy5zdGFydCArIGkpICYgdGhpcy5tYXNrXSA9IGVsZW1zW2ldO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZW5kID09PSB0aGlzLnNpemUpIHtcbiAgICAgIHRoaXMuZW5kID0gKHRoaXMuZW5kICsgZGVsdGEpICYgdGhpcy5tYXNrO1xuICAgICAgc3RhcnQgKz0gdGhpcy5zdGFydDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5idWZmZXJbKHN0YXJ0ICsgaSkgJiB0aGlzLm1hc2tdID0gZWxlbXNbaV07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHNwbGljZSBvdXQgb2YgdGhlIG1pZGRsZS4uLlxuICAgICAgY29uc3QgYnVmID0gWy4uLnRoaXMuc2xpY2UoMCwgc3RhcnQpLCAuLi5lbGVtcywgLi4udGhpcy5zbGljZShlbmQpXTtcbiAgICAgIGJ1Zi5sZW5ndGggPSB0aGlzLmJ1ZmZlci5sZW5ndGg7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGJ1ZjtcbiAgICAgIHRoaXMuc3RhcnQgPSAwO1xuICAgICAgdGhpcy5lbmQgPSB0aGlzLnNpemU7XG4gICAgfVxuICAgIHRoaXMuc2l6ZSArPSBkZWx0YTtcbiAgICByZXR1cm4gb3V0O1xuXG4gICAgLy8gc3RhcnQgJj0gdGhpcy5tYXNrO1xuICAgIC8vIGVuZCAmPSB0aGlzLm1hc2s7XG4gICAgLy8gY29uc3QgZGVsdGEgPSBlbGVtcy5sZW5ndGggLSBjb3VudDtcbiAgICAvLyBpZiAoZGVsdGEgPT09IDApIHtcbiAgICAvLyAgIC8vIG5vIGNoYW5nZSB0byB0aGUgc2l6ZVxuICAgIC8vICAgY29uc3Qgb3V0ID1cbiAgICAvLyAgICAgICBwaXZvdDIgPCBwaXZvdDEgP1xuICAgIC8vICAgICAgICAgICB0aGlzLmJ1ZmZlci5zbGljZShwaXZvdDEpLmNvbmNhdCh0aGlzLmJ1ZmZlci5zbGljZSgwLCBwaXZvdDIpKSA6XG4gICAgLy8gICAgICAgICAgIHRoaXMuYnVmZmVyLnNsaWNlKHBpdm90MSwgcGl2b3QyKTtcbiAgICAvLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgIC8vICAgICB0aGlzLmJ1ZmZlclsocGl2b3QxICsgaSkgJiB0aGlzLm1hc2tdID0gZWxlbXNbaV07XG4gICAgLy8gICB9XG4gICAgLy8gICByZXR1cm4gb3V0O1xuICAgIC8vIH0gZWxzZSBpZiAoZGVsdGEgPCAwKSB7XG4gICAgLy8gICAvLyBkZXF1ZSBpcyBzaHJpbmtpbmdcbiAgICAvLyAgIGlmIChwaXZvdDEgPCBzdGFydCkge1xuICAgIC8vICAgICAvLyBicmVhayBpcyBpbiB0aGUgZmlyc3QgY2h1bmtcbiAgICAvLyAgICAgY29uc3QgcGl2b3QzID0gcGl2b3QxICsgZWxlbXMubGVuZ3RoO1xuICAgIC8vICAgICB0aGlzLmJ1ZmZlci5zcGxpY2UocGl2b3QxLCBlbGVtcy5sZW5ndGgsIC4uLmVsZW1zKTtcbiAgICAvLyAgICAgdGhpcy5idWZmZXIuY29weVdpdGhpbihwaXZvdDMsIHBpdm90MiwgZW5kKTtcbiAgICAvLyAgICAgdGhpcy5lbmQgKz0gZGVsdGE7XG4gICAgLy8gICAgIHRoaXMuc2l6ZSArPSBkZWx0YTtcbiAgICAvLyAgIH0gZWxzZSBpZiAocGl2b3QyIDwgcGl2b3QxKSB7XG4gICAgLy8gICAgIC8vIGJyZWFrIGlzIGJldHdlZW4gcGl2b3RzOiBpZiB0aGUgZWxlbWVudHMgdG8gaW5zZXJ0XG4gICAgLy8gICAgIC8vIGNhbiBjcm9zcyB0aGUgZ2FwIHRoZW4gd2UgY2FuIHRyaXZpYWxseSBjb3B5LlxuICAgIC8vICAgfSBlbHNlIHtcbiAgICAvLyAgICAgLy8gYnJlYWsgaXMgaW4gdGhlIGxhc3QgY2h1bmsgb3Igbm90IGF0IGFsbFxuICAgIC8vICAgICBjb25zdCBwaXZvdDMgPSBwaXZvdDIgLSBlbGVtcy5sZW5ndGg7XG4gICAgLy8gICAgIHRoaXMuYnVmZmVyLnNwbGljZShwaXZvdDMsIGVsZW1zLmxlbmd0aCwgLi4uZWxlbXMpO1xuICAgIC8vICAgICB0aGlzLmJ1ZmZlci5jb3B5V2l0aGluKHN0YXJ0LCBwaXZvdDMsIHBpdm90MSk7XG4gICAgLy8gICAgIHRoaXMuc3RhcnQgLT0gZGVsdGE7XG4gICAgLy8gICAgIHRoaXMuc2l6ZSArPSBkZWx0YTtcbiAgICAvLyAgIH0gZWxzZSBpZiAoXG4gICAgLy8gfVxuICAgIC8vIC8vIHRoaXMuc3RhcnQgPD0gcGl2b3QxIDw9IHBpdm90MiA8PSB0aGlzLmVuZFxuICAgIC8vIC8vIFRoZSB3cmFwIHdpbGwgb2NjdXIgaW4gYXQgbW9zdCBvbmUgb2YgdGhvc2UgZ2Fwc1xuICAgIC8vIC8vIERvbid0IG1vdmUgdGhhdCBibG9jay5cbiAgICAvLyAvLyBJZiB0aGUgd3JhcCBvY2N1cnMgYmV0d2VlbiBwaXZvdDEgYW5kIHBpdm90MiB0aGVuIHdlIG1heSBiZVxuICAgIC8vIC8vIHN0dWNrIG1ha2luZyB0d28gY29waWVzLiAgSW4gdGhhdCBjYXNlLCBqdXN0IHJlYmFzZSB0byAwLlxuICAgIFxuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgY29uc3QgcGFydHMgPSBuZXcgQXJyYXkodGhpcy5zaXplKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2l6ZTsgaSsrKSB7XG4gICAgICBwYXJ0c1tpXSA9IHRoaXMuYnVmZmVyWyh0aGlzLnN0YXJ0ICsgaSkgJiB0aGlzLm1hc2tdO1xuICAgIH1cbiAgICByZXR1cm4gYFske3BhcnRzLmpvaW4oJywgJyl9XWA7XG4gIH1cbn1cblxuLy8gLyoqIEB0ZW1wbGF0ZSBUICovXG4vLyBleHBvcnQgY2xhc3MgRGVxdWVTZXQge1xuLy8gICBjb25zdHJ1Y3RvcigpIHtcbi8vICAgICAvKiogQHR5cGUgeyFBcnJheTxUfHVuZGVmaW5lZD59ICovXG4vLyAgICAgdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkoMTYpO1xuLy8gICAgIC8qKiBAdHlwZSB7bnVtYmVyfSAqL1xuLy8gICAgIHRoaXMubWFzayA9IDB4Zjtcbi8vICAgICAvKiogQHR5cGUge251bWJlcn0gKi9cbi8vICAgICB0aGlzLnN0YXJ0ID0gMDtcbi8vICAgICAvKiogQHR5cGUge251bWJlcn0gKi9cbi8vICAgICB0aGlzLmVuZCA9IDA7XG4vLyAgICAgLyoqIEB0eXBlIHtudW1iZXJ9ICovXG4vLyAgICAgdGhpcy5zaXplID0gMDsgLy8gcmVhZG9ubHkgZXh0ZXJuYWxseVxuLy8gICAgIC8qKiBAdHlwZSB7IVNldDxUPn0gKi9cbi8vICAgICB0aGlzLnNldCA9IG5ldyBTZXQoKTtcbi8vICAgfVxuXG4vLyAgIHVwc2l6ZSh0YXJnZXQpIHtcbi8vICAgICB3aGlsZSAodGhpcy5tYXNrIDwgdGFyZ2V0KSB7XG4vLyAgICAgICB0aGlzLnN0YXJ0ICs9IHRoaXMubWFzayArIDE7XG4vLyAgICAgICB0aGlzLm1hc2sgPSB0aGlzLm1hc2sgPDwgMSB8IDE7XG4vLyAgICAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyLmNvbmNhdCh0aGlzLmJ1ZmZlcik7XG4vLyAgICAgfVxuLy8gICAgIHRoaXMuc2l6ZSA9IHRhcmdldDtcbi8vICAgfVxuXG4vLyAgIC8qKiBAcGFyYW0gey4uLlR9IGVsZW0gKi9cbi8vICAgcHVzaCguLi5lbGVtcykge1xuLy8gICAgIHRoaXMudXBzaXplKHRoaXMuc2l6ZSArIGVsZW1zLmxlbmd0aCk7XG4vLyAgICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XG4vLyAgICAgICBpZiAodGhpcy5zZXQuaGFzKGVsZW0pKSB7XG4vLyAgICAgICAgIHRoaXMuc2l6ZS0tO1xuLy8gICAgICAgICBjb250aW51ZTtcbi8vICAgICAgIH1cbi8vICAgICAgIHRoaXMuYnVmZmVyW3RoaXMuZW5kXSA9IGVsZW07XG4vLyAgICAgICB0aGlzLmVuZCA9ICh0aGlzLmVuZCArIDEpICYgdGhpcy5tYXNrO1xuLy8gICAgIH1cbi8vICAgfVxuXG4vLyAgIC8qKiBAcmV0dXJuIHtUfHVuZGVmaW5lZH0gKi9cbi8vICAgcG9wKCkge1xuLy8gICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuLy8gICAgIHRoaXMuZW5kID0gKHRoaXMuZW5kIC0gMSkgJiB0aGlzLm1hc2s7XG4vLyAgICAgdGhpcy5zaXplLS07XG4vLyAgICAgY29uc3Qgb3V0ID0gdGhpcy5idWZmZXJbdGhpcy5lbmRdO1xuLy8gICAgIHRoaXMuc2V0LmRlbGV0ZShvdXQpO1xuLy8gICAgIHJldHVybiBvdXQ7XG4vLyAgIH1cblxuLy8gICAvKiogQHJldHVybiB7VHx1bmRlZmluZWR9ICovXG4vLyAgIHBlZWsoKSB7XG4vLyAgICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4vLyAgICAgcmV0dXJuIHRoaXMuYnVmZmVyWyh0aGlzLmVuZCAtIDEpICYgdGhpcy5tYXNrXTtcbi8vICAgfVxuXG4vLyAgIC8qKiBAcGFyYW0gey4uLlR9IGVsZW0gKi9cbi8vICAgdW5zaGlmdCguLi5lbGVtcykge1xuLy8gICAgIHRoaXMudXBzaXplKHRoaXMuc2l6ZSArIGVsZW1zLmxlbmd0aCk7XG4vLyAgICAgZm9yIChjb25zdCBlbGVtIG9mIGVsZW1zKSB7XG4vLyAgICAgICBpZiAodGhpcy5zZXQuaGFzKGVsZW0pKSB7XG4vLyAgICAgICAgIHRoaXMuc2l6ZS0tO1xuLy8gICAgICAgICBjb250aW51ZTtcbi8vICAgICAgIH1cbi8vICAgICAgIHRoaXMuc3RhcnQgPSAodGhpcy5zdGFydCAtIDEpICYgdGhpcy5tYXNrO1xuLy8gICAgICAgdGhpcy5idWZmZXJbdGhpcy5zdGFydF0gPSBlbGVtO1xuLy8gICAgIH1cbi8vICAgfVxuXG4vLyAgIC8qKiBAcmV0dXJuIHtUfHVuZGVmaW5lZH0gKi9cbi8vICAgc2hpZnQoKSB7XG4vLyAgICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4vLyAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5idWZmZXJbdGhpcy5zdGFydF07XG4vLyAgICAgdGhpcy5zdGFydCA9ICh0aGlzLnN0YXJ0ICsgMSkgJiB0aGlzLm1hc2s7XG4vLyAgICAgdGhpcy5zaXplLS07XG4vLyAgICAgdGhpcy5zZXQucmVtb3ZlKHJlc3VsdCk7XG4vLyAgICAgcmV0dXJuIHJlc3VsdDtcbi8vICAgfVxuXG4vLyAgIC8qKiBAcmV0dXJuIHtUfHVuZGVmaW5lZH0gKi9cbi8vICAgZnJvbnQoKSB7XG4vLyAgICAgaWYgKCF0aGlzLnNpemUpIHJldHVybiB1bmRlZmluZWQ7XG4vLyAgICAgcmV0dXJuIHRoaXMuYnVmZmVyW3RoaXMuc3RhcnRdO1xuLy8gICB9XG4vLyB9XG5cbi8vIGV4cG9ydCBjbGFzcyBJbmRleGVkTGlzdCB7XG4vLyAgIGNvbnN0cnVjdG9yKCkge1xuLy8gICAgIHRoaXMubGlzdCA9IFtdO1xuLy8gICAgIHRoaXMubWFwID0gbmV3IE1hcCgpO1xuLy8gICB9XG5cbi8vICAgYWRkKGVsZW0pIHtcbi8vICAgICBpZiAodGhpcy5tYXAuaGFzKGVsZW0pKSByZXR1cm47XG4vLyAgICAgdGhpcy5tYXAuc2V0KGVsZW0sIHRoaXMubGlzdC5sZW5ndGgpO1xuLy8gICAgIHRoaXMubGlzdC5wdXNoKGVsZW0pO1xuLy8gICB9XG5cbi8vICAgaW5kZXhPZihlbGVtKSB7XG4vLyAgICAgcmV0dXJuIHRoaXMubWFwLmdldChlbGVtKTtcbi8vICAgfVxuXG4vLyAgIHJlbW92ZShlbGVtKSB7XG4vLyAgICAgLy8gVE9ETyAtIHRoaXMgaXNuJ3Qgc3VwZXIgZWZmaWNpZW50Li4uXG4vLyAgICAgLy8gV2UgY291bGQgbWFpbnRhaW4gYSBzbWFsbCBoYW5kZnVsIG9mIHNwbGl0IHBvaW50cy5cbi8vICAgICAvLyBPciBhIFJlbW92YWxUcmVlIHdoZXJlIGl0IHN0YXJ0cyB3aXRoIGEgZnVsbHktYmFsYW5jZWRcbi8vICAgICAvLyBiaW5hcnkgdHJlZSAoaGVpZ2h0IH4gbG9nKG4pKSBhbmQgdGhlbiB3ZSBqdXN0IHJlbW92ZVxuLy8gICAgIC8vIGVsZW1lbnRzIGZyb20gdGhlcmUgc28gdGhhdCB3ZSBvbmx5IG5lZWQgdG8gdXBkYXRlXG4vLyAgICAgLy8gTyhsb2cobikpIFwic2l6ZVwiIHZhbHVlcyBvbiB0aGUgd2F5IHVwLiAgVGhvdWdoIHRoaXNcbi8vICAgICAvLyBkb2Vzbid0IGhlbHAgdG8gYWN0dWFsbHkgKmZpbmQqIHRoZSBlbGVtZW50Li4uXG4vLyAgICAgLy8gQW5vdGhlciBvcHRpb24gd291bGQgYmUgdG8gdXNlIHRoZSBiaXRzIG9mIHRoZSBpbmRleFxuLy8gICAgIC8vIHRvIGtlZXAgdHJhY2sgb2YgdGhlIG51bWJlciBvZiByZW1vdmVkIGVsZW1lbnRzIGJlZm9yZS5cbi8vICAgICAvLyBTbyB3ZSBoYXZlIGEgc2FtZS1zaXplIGFycmF5IG9mIG51bWJlcnNcbi8vICAgICAvLyB3aGVyZSBlYWNoIGVudHJ5IHRlbGxzIHRoZSBzaXplIHRvIGFkZCBmb3IgdGhlIE50aCBvbmUtYml0XG4vLyAgICAgLy8gYW5kIGFsbCB0aGUgaGlnaGVyIGJpdHMuXG4vLyAgICAgLy8gICAwMCAtPiAwXG4vLyAgICAgLy8gICAwMSAtPiAxXG4vLyAgICAgLy8gICAxMCAtPiAyXG4vLyAgICAgLy8gICAxMSAtPiAzID0gMiArIDFcbi8vICAgICAvLyBTdG9yaW5nXG4vLyAgICAgLy8gICBYIyAgLT4gMlxuLy8gICAgIC8vICAgMVggIC0+IDFcbi8vICAgICAvLyAgIDBYICAtPiAxXG4vLyAgICAgLy8gRm9yIGJpZ2dlciBsaXN0LFxuLy8gICAgIC8vICAgMTFYIC0+IDEgICAgc3RvcmVkIGF0ICAgIDExMSA9IDdcbi8vICAgICAvLyAgIDEwWCAtPiAxICAgICAgICAgICAgICAgICAxMTAgPSA2XG4vLyAgICAgLy8gICAwMVggLT4gMSAgICAgICAgICAgICAgICAgMTAxID0gNVxuLy8gICAgIC8vICAgMDBYIC0+IDEgICAgICAgICAgICAgICAgIDEwMCA9IDRcbi8vICAgICAvLyAgIDFYIyAtPiAyICAgICAgICAgICAgICAgICAwMTEgPSAzXG4vLyAgICAgLy8gICAwWCMgLT4gMiAgICAgICAgICAgICAgICAgMDEwID0gMlxuLy8gICAgIC8vICAgWCMjIC0+IDQgICAgICAgICAgICAgICAgIDAwMSA9IDFcbi8vICAgICAvLyBUaGUgdXBzaG90IGlzIHRoYXQgd2hlbiByZW1vdmluZyBhbiBlbGVtZW50IHdlIG9ubHkgbmVlZCB0b1xuLy8gICAgIC8vIHVwZGF0ZSBPKGxvZyhuKSkgZWxlbWVudHMuLi5cbi8vICAgICAvLyBBbmQgd2UgY2FuIGF2b2lkIHNwbGljaW5nIHRoZSBsaXN0IGFuZCBldmVuIGZpbmQgdGhlIGZpcnN0XG4vLyAgICAgLy8gZWxlbWVudCB3aXRoIGJpbmFyeSBzZWFyY2ggLSBPKGxvZyhuKSlcbi8vICAgICBjb25zdCBpbmRleCA9IHRoaXMubWFwLmdldChlbGVtKTtcbi8vICAgICBpZiAoaW5kZXggPT0gbnVsbCkgcmV0dXJuO1xuLy8gICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEpO1xuLy8gICAgIHRoaXMubWFwLmRlbGV0ZShlbGVtKTtcbi8vICAgICBmb3IgKGxldCBpID0gaW5kZXg7IGkgPCB0aGlzLmxpc3QubGVuZ3RoOyBpKyspIHtcbi8vICAgICAgIHRoaXMubWFwLnNldCh0aGlzLmxpc3RbaV0sIGkpO1xuLy8gICAgIH1cbi8vICAgfVxuXG4vLyAgIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuLy8gICAgIHJldHVybiB0aGlzLmxpc3RbU3ltYm9sLml0ZXJhdG9yXSgpO1xuLy8gICB9XG4vLyB9XG5cbmV4cG9ydCBjb25zdCBicmVha0xpbmVzID0gKHN0cjogc3RyaW5nLCBsZW46IG51bWJlcik6IHN0cmluZ1tdID0+IHtcbiAgc3RyID0gc3RyLnRyaW0oKTtcbiAgY29uc3Qgb3V0OiBzdHJpbmdbXSA9IFtdO1xuICB3aGlsZSAoc3RyLmxlbmd0aCA+IGxlbikge1xuICAgIGxldCBiID0gc3RyLnN1YnN0cmluZygwLCBsZW4pLmxhc3RJbmRleE9mKCcgJyk7XG4gICAgaWYgKGIgPCAwKSBiID0gbGVuO1xuICAgIG91dC5wdXNoKHN0ci5zdWJzdHJpbmcoMCwgYikudHJpbSgpKTtcbiAgICBzdHIgPSBzdHIuc3Vic3RyaW5nKGIpLnRyaW0oKTtcbiAgfVxuICBvdXQucHVzaChzdHIudHJpbSgpKTtcbiAgcmV0dXJuIG91dDtcbn07XG5cbmV4cG9ydCBjbGFzcyBVc2FnZUVycm9yIGV4dGVuZHMgRXJyb3Ige31cblxuZXhwb3J0IGNsYXNzIFN1ZmZpeFRyaWU8VD4ge1xuICByZWFkb25seSBuZXh0ID0gbmV3IE1hcDxzdHJpbmcsIFN1ZmZpeFRyaWU8VD4+KCk7XG4gIGRhdGE6IFQgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkga2V5OiBzdHJpbmcgPSAnJykge31cblxuICBnZXQoa2V5OiBzdHJpbmcpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgdDogU3VmZml4VHJpZTxUPiB8IHVuZGVmaW5lZCA9IHRoaXM7XG4gICAgZm9yIChsZXQgaSA9IGtleS5sZW5ndGggLSAxOyBpID49IDAgJiYgdDsgaSsrKSB7XG4gICAgICB0ID0gdC5uZXh0LmdldChrZXlbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdCAmJiB0LmRhdGE7XG4gIH1cblxuICB3aXRoKGM6IHN0cmluZyk6IFN1ZmZpeFRyaWU8VD4ge1xuICAgIGxldCB0ID0gdGhpcy5uZXh0LmdldChjKTtcbiAgICBpZiAoIXQpIHRoaXMubmV4dC5zZXQoYywgKHQgPSBuZXcgU3VmZml4VHJpZTxUPihjICsgdGhpcy5rZXkpKSk7XG4gICAgcmV0dXJuIHQ7XG4gIH1cblxuICBzZXQoa2V5OiBzdHJpbmcsIHZhbHVlOiBUIHwgdW5kZWZpbmVkKSB7XG4gICAgbGV0IHQ6IFN1ZmZpeFRyaWU8VD4gPSB0aGlzO1xuICAgIGZvciAobGV0IGkgPSBrZXkubGVuZ3RoIC0gMTsgaSA+PSAwICYmIHQ7IGkrKykge1xuICAgICAgdCA9IHQud2l0aChrZXlbaV0pO1xuICAgIH1cbiAgICB0LmRhdGEgPSB2YWx1ZTtcbiAgfVxuXG4gICogdmFsdWVzKCk6IEl0ZXJhYmxlPFQ+IHtcbiAgICBjb25zdCBzdGFjazogU3VmZml4VHJpZTxUPltdID0gW3RoaXNdO1xuICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHRvcCA9IHN0YWNrLnBvcCgpITtcbiAgICAgIGlmICh0b3AuZGF0YSkgeWllbGQgdG9wLmRhdGE7XG4gICAgICBzdGFjay5wdXNoKC4uLnRvcC5uZXh0LnZhbHVlcygpKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERlZmF1bHRNYXA8SywgViBleHRlbmRzIHt9PiBleHRlbmRzIE1hcDxLLCBWPiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgc3VwcGxpZXI6IChrZXk6IEspID0+IFYsXG4gICAgICAgICAgICAgIGluaXQ/OiBJdGVyYWJsZTxyZWFkb25seSBbSywgVl0+KSB7XG4gICAgc3VwZXIoaW5pdCBhcyBhbnkpOyAvLyBOT1RFOiBNYXAncyBkZWNsYXJhdGlvbnMgYXJlIG9mZiwgSXRlcmFibGUgaXMgZmluZS5cbiAgfVxuICBnZXQoa2V5OiBLKTogViB7XG4gICAgbGV0IHZhbHVlID0gc3VwZXIuZ2V0KGtleSk7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHN1cGVyLnNldChrZXksIHZhbHVlID0gdGhpcy5zdXBwbGllcihrZXkpKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgc29ydGVkS2V5cyhmbj86IChhOiBLLCBiOiBLKSA9PiBudW1iZXIpOiBLW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5rZXlzKCldLnNvcnQoZm4pO1xuICB9XG4gIHNvcnRlZEVudHJpZXMoZm4/OiAoYTogSywgYjogSykgPT4gbnVtYmVyKTogQXJyYXk8W0ssIFZdPiB7XG4gICAgcmV0dXJuIHRoaXMuc29ydGVkS2V5cyhmbikubWFwKGsgPT4gW2ssIHRoaXMuZ2V0KGspIGFzIFZdKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW5kZXhlZFNldDxUIGV4dGVuZHMge30+IHtcbiAgcHJpdmF0ZSBmb3J3YXJkOiBUW10gPSBbXTtcbiAgcHJpdmF0ZSByZXZlcnNlID0gbmV3IE1hcDxULCBudW1iZXI+KCk7XG5cbiAgYWRkKGVsZW06IFQpOiBudW1iZXIge1xuICAgIGxldCByZXN1bHQgPSB0aGlzLnJldmVyc2UuZ2V0KGVsZW0pO1xuICAgIGlmIChyZXN1bHQgPT0gbnVsbCkgdGhpcy5yZXZlcnNlLnNldChlbGVtLCByZXN1bHQgPSB0aGlzLmZvcndhcmQucHVzaChlbGVtKSAtIDEpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnZXQoaW5kZXg6IG51bWJlcik6IFQge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmRbaW5kZXhdO1xuICB9XG59XG5cbmV4cG9ydCBuYW1lc3BhY2UgaXRlcnMge1xuICAvLyBDb25jYXRlbmF0ZXMgaXRlcmFibGVzLlxuICBleHBvcnQgZnVuY3Rpb24gKiBjb25jYXQ8VD4oLi4uaXRlcnM6IEFycmF5PEl0ZXJhYmxlPFQ+Pik6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIGZvciAoY29uc3QgaXRlciBvZiBpdGVycykge1xuICAgICAgeWllbGQgKiBpdGVyO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5KGl0ZXI6IEl0ZXJhYmxlPHVua25vd24+KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIEJvb2xlYW4oaXRlcltTeW1ib2wuaXRlcmF0b3JdKCkubmV4dCgpLmRvbmUpO1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uICogbWFwPFQsIFU+KGl0ZXI6IEl0ZXJhYmxlPFQ+LCBmOiAoZWxlbTogVCkgPT4gVSk6IEl0ZXJhYmxlSXRlcmF0b3I8VT4ge1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBpdGVyKSB7XG4gICAgICB5aWVsZCBmKGVsZW0pO1xuICAgIH1cbiAgfVxuICBleHBvcnQgZnVuY3Rpb24gKiBmaWx0ZXI8VD4oaXRlcjogSXRlcmFibGU8VD4sIGY6IChlbGVtOiBUKSA9PiBib29sZWFuKTogSXRlcmFibGU8VD4ge1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBpdGVyKSB7XG4gICAgICBpZiAoZihlbGVtKSkgeWllbGQgZWxlbTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uICogZmxhdE1hcDxULCBVPihpdGVyOiBJdGVyYWJsZTxUPiwgZjogKGVsZW06IFQpID0+IEl0ZXJhYmxlPFU+KTogSXRlcmFibGVJdGVyYXRvcjxVPiB7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGl0ZXIpIHtcbiAgICAgIHlpZWxkICogZihlbGVtKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uIGNvdW50KGl0ZXI6IEl0ZXJhYmxlPHVua25vd24+KTogbnVtYmVyIHtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGZvciAoY29uc3QgXyBvZiBpdGVyKSB7XG4gICAgICBjb3VudCsrO1xuICAgIH1cbiAgICByZXR1cm4gY291bnQ7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gKiB0YWtlPFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+LCBjb3VudDogbnVtYmVyKTogSXRlcmFibGVJdGVyYXRvcjxUPiB7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGl0ZXIpIHtcbiAgICAgIGlmICgtLWNvdW50IDwgMCkgcmV0dXJuO1xuICAgICAgeWllbGQgZWxlbTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gZmlyc3Q8VD4oaXRlcjogSXRlcmFibGU8VD4pOiBUO1xuICBleHBvcnQgZnVuY3Rpb24gZmlyc3Q8VD4oaXRlcjogSXRlcmFibGU8VD4sIGZhbGxiYWNrOiBUKTogVDtcbiAgZXhwb3J0IGZ1bmN0aW9uIGZpcnN0PFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+LCBmYWxsYmFjaz86IFQpOiBUIHtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgaXRlcikgcmV0dXJuIGVsZW07XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB0aHJvdyBuZXcgRXJyb3IoYEVtcHR5IGl0ZXJhYmxlOiAke2l0ZXJ9YCk7XG4gICAgcmV0dXJuIGZhbGxiYWNrIGFzIFQ7ICAgIFxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHppcDxBLCBCPihsZWZ0OiBJdGVyYWJsZTxBPixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDogSXRlcmFibGU8Qj4pOiBJdGVyYWJsZTxbQSwgQl0+O1xuICBleHBvcnQgZnVuY3Rpb24gemlwPEEsIEIsIEM+KGxlZnQ6IEl0ZXJhYmxlPEE+LCByaWdodDogSXRlcmFibGU8Qj4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgemlwcGVyOiAoYTogQSwgYjogQikgPT4gQyk6IEl0ZXJhYmxlPEM+O1xuICBleHBvcnQgZnVuY3Rpb24gemlwPEEsIEIsIEM+KGxlZnQ6IEl0ZXJhYmxlPEE+LCByaWdodDogSXRlcmFibGU8Qj4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgemlwcGVyOiAoYTogQSwgYjogQikgPT4gQyA9IChhLCBiKSA9PiBbYSwgYl0gYXMgYW55KTpcbiAgSXRlcmFibGU8Qz4ge1xuICAgIHJldHVybiB7XG4gICAgICAqIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgICAgICBjb25zdCBsZWZ0SXRlciA9IGxlZnRbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgICAgICBjb25zdCByaWdodEl0ZXIgPSByaWdodFtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgIGxldCBhLCBiO1xuICAgICAgICB3aGlsZSAoKGEgPSBsZWZ0SXRlci5uZXh0KCksIGIgPSByaWdodEl0ZXIubmV4dCgpLCAhYS5kb25lICYmICFiLmRvbmUpKSB7XG4gICAgICAgICAgeWllbGQgemlwcGVyKGEudmFsdWUsIGIudmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3ByZWFkPFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+KTogVFtdIHtcbiAgcmV0dXJuIFsuLi5pdGVyXTtcbn1cblxuLyoqIEEgc2V0IG9mIG9iamVjdHMgd2l0aCB1bmlxdWUgbGFiZWxzIChiYXNpY2FsbHkgdG9TdHJpbmctZXF1aXZhbGVuY2UpLiAqL1xuZXhwb3J0IGNsYXNzIExhYmVsZWRTZXQ8VCBleHRlbmRzIExhYmVsZWQ+IGltcGxlbWVudHMgSXRlcmFibGU8VD4ge1xuICBwcml2YXRlIG1hcCA9IG5ldyBNYXA8U3RyaW5nLCBUPigpO1xuICBhZGQoZWxlbTogVCkge1xuICAgIHRoaXMubWFwLnNldChlbGVtLmxhYmVsLCBlbGVtKTtcbiAgfVxuICBoYXMoZWxlbTogVCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXMoZWxlbS5sYWJlbCk7XG4gIH1cbiAgZGVsZXRlKGVsZW06IFQpIHtcbiAgICB0aGlzLm1hcC5kZWxldGUoZWxlbS5sYWJlbCk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLnZhbHVlcygpO1xuICB9XG59XG4vKiogU3VwZXJpbnRlcmZhY2UgZm9yIG9iamVjdHMgdGhhdCBjYW4gYmUgc3RvcmVkIGluIGEgTGFiZWxlZFNldC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGFiZWxlZCB7XG4gIHJlYWRvbmx5IGxhYmVsOiBzdHJpbmc7XG59XG5cbmNvbnN0IElOVkFMSURBVEVEID0gU3ltYm9sKCdJbnZhbGlkYXRlZCcpO1xuY29uc3QgU0laRSA9IFN5bWJvbCgnU2l6ZScpO1xuXG5jbGFzcyBTZXRNdWx0aW1hcFNldFZpZXc8SywgVj4gaW1wbGVtZW50cyBTZXQ8Vj4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IG93bmVyTWFwOiBNYXA8SywgU2V0PFY+PixcbiAgICAgICAgICAgICAgcHJpdmF0ZSByZWFkb25seSBvd25lcktleTogSywgcHJpdmF0ZSBjdXJyZW50U2V0PzogU2V0PFY+KSB7fVxuICBwcml2YXRlIGdldEN1cnJlbnRTZXQoKSB7XG4gICAgaWYgKCF0aGlzLmN1cnJlbnRTZXQgfHwgKHRoaXMuY3VycmVudFNldCBhcyBhbnkpW0lOVkFMSURBVEVEXSkge1xuICAgICAgdGhpcy5jdXJyZW50U2V0ID0gdGhpcy5vd25lck1hcC5nZXQodGhpcy5vd25lcktleSkgfHwgbmV3IFNldDxWPigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jdXJyZW50U2V0O1xuICB9XG4gIHByaXZhdGUgbXV0YXRlU2V0PFI+KGY6IChzOiBTZXQ8Vj4pID0+IFIpOiBSIHtcbiAgICBjb25zdCBzZXQgPSB0aGlzLmdldEN1cnJlbnRTZXQoKTtcbiAgICBjb25zdCBzaXplID0gc2V0LnNpemU7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmKHNldCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICh0aGlzLm93bmVyTWFwIGFzIGFueSlbU0laRV0gKz0gc2V0LnNpemUgLSBzaXplO1xuICAgICAgaWYgKCFzZXQuc2l6ZSkge1xuICAgICAgICB0aGlzLm93bmVyTWFwLmRlbGV0ZSh0aGlzLm93bmVyS2V5KTtcbiAgICAgICAgKHNldCBhcyBhbnkpW0lOVkFMSURBVEVEXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFkZChlbGVtOiBWKTogdGhpcyB7XG4gICAgdGhpcy5tdXRhdGVTZXQocyA9PiBzLmFkZChlbGVtKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgaGFzKGVsZW06IFYpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50U2V0KCkuaGFzKGVsZW0pO1xuICB9XG4gIGNsZWFyKCk6IHZvaWQge1xuICAgIHRoaXMubXV0YXRlU2V0KHMgPT4gcy5jbGVhcigpKTtcbiAgfVxuICBkZWxldGUoZWxlbTogVik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLm11dGF0ZVNldChzID0+IHMuZGVsZXRlKGVsZW0pKTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFY+IHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50U2V0KClbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG4gIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFY+IHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50U2V0KCkudmFsdWVzKCk7XG4gIH1cbiAga2V5cygpOiBJdGVyYWJsZUl0ZXJhdG9yPFY+IHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50U2V0KCkua2V5cygpO1xuICB9XG4gIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbViwgVl0+IHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50U2V0KCkuZW50cmllcygpO1xuICB9XG4gIGZvckVhY2g8VD4oY2FsbGJhY2s6ICh2YWx1ZTogViwga2V5OiBWLCBzZXQ6IFNldDxWPikgPT4gdm9pZCwgdGhpc0FyZz86IFQpOiB2b2lkIHtcbiAgICB0aGlzLmdldEN1cnJlbnRTZXQoKS5mb3JFYWNoKGNhbGxiYWNrLCB0aGlzQXJnKTtcbiAgfVxuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmdldEN1cnJlbnRTZXQoKS5zaXplO1xuICB9XG4gIGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnU2V0JztcbiAgfVxufVxuLy8gRml4ICdpbnN0YW5jZW9mJyB0byB3b3JrIHByb3Blcmx5IHdpdGhvdXQgcmVxdWlyaW5nIGFjdHVhbCBzdXBlcmNsYXNzLi4uXG5SZWZsZWN0LnNldFByb3RvdHlwZU9mKFNldE11bHRpbWFwU2V0Vmlldy5wcm90b3R5cGUsIFNldC5wcm90b3R5cGUpO1xuXG5leHBvcnQgY2xhc3MgU2V0TXVsdGltYXA8SywgVj4ge1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgbWFwID0gbmV3IE1hcDxLLCBTZXQ8Vj4+KCk7XG5cbiAgY29uc3RydWN0b3IoZW50cmllczogSXRlcmFibGU8cmVhZG9ubHkgW0ssIFZdPiA9IFtdKSB7XG4gICAgKHRoaXMubWFwIGFzIGFueSlbU0laRV0gPSAwO1xuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIGVudHJpZXMpIHtcbiAgICAgIHRoaXMuYWRkKGssIHYpO1xuICAgIH1cbiAgfVxuXG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuICh0aGlzLm1hcCBhcyBhbnkpW1NJWkVdO1xuICB9XG5cbiAgZ2V0KGs6IEspOiBTZXQ8Vj4ge1xuICAgIHJldHVybiBuZXcgU2V0TXVsdGltYXBTZXRWaWV3KHRoaXMubWFwLCBrLCB0aGlzLm1hcC5nZXQoaykpO1xuICB9XG5cbiAgYWRkKGs6IEssIHY6IFYpOiB2b2lkIHtcbiAgICBsZXQgc2V0ID0gdGhpcy5tYXAuZ2V0KGspO1xuICAgIGlmICghc2V0KSB0aGlzLm1hcC5zZXQoaywgc2V0ID0gbmV3IFNldCgpKTtcbiAgICBjb25zdCBzaXplID0gc2V0LnNpemU7XG4gICAgc2V0LmFkZCh2KTtcbiAgICAodGhpcy5tYXAgYXMgYW55KVtTSVpFXSArPSBzZXQuc2l6ZSAtIHNpemU7XG4gIH1cblxuICAvLyBUT0RPIC0gaXRlcmF0aW9uP1xufVxuXG5cbmV4cG9ydCBjbGFzcyBNdWx0aXNldDxUPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFtULCBudW1iZXJdPiB7XG4gIHByaXZhdGUgZW50cmllczogRGVmYXVsdE1hcDxULCBudW1iZXI+O1xuICBjb25zdHJ1Y3RvcihlbnRyaWVzOiBJdGVyYWJsZTxbVCwgbnVtYmVyXT4gPSBbXSkge1xuICAgIHRoaXMuZW50cmllcyA9IG5ldyBEZWZhdWx0TWFwKCgpID0+IDAsIGVudHJpZXMpO1xuICB9XG4gIGFkZChlbGVtOiBUKSB7XG4gICAgdGhpcy5lbnRyaWVzLnNldChlbGVtLCB0aGlzLmVudHJpZXMuZ2V0KGVsZW0pICsgMSk7XG4gIH1cbiAgZGVsZXRlKGVsZW06IFQpIHtcbiAgICBjb25zdCBjb3VudCA9IHRoaXMuZW50cmllcy5nZXQoZWxlbSkgLSAxO1xuICAgIGlmIChjb3VudCA+IDApIHtcbiAgICAgIHRoaXMuZW50cmllcy5zZXQoZWxlbSwgY291bnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVudHJpZXMuZGVsZXRlKGVsZW0pO1xuICAgIH1cbiAgfVxuICB1bmlxdWUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5lbnRyaWVzLnNpemU7XG4gIH1cbiAgY291bnQoZWxlbTogVCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuZW50cmllcy5oYXMoZWxlbSkgPyB0aGlzLmVudHJpZXMuZ2V0KGVsZW0pIDogMDtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFtULCBudW1iZXJdPiB7XG4gICAgcmV0dXJuIHRoaXMuZW50cmllcy5lbnRyaWVzKCk7XG4gIH1cbn1cblxuXG4vLyBleHBvcnQgY2xhc3MgU3BhcnNlQXJyYXk8VD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUPiB7XG4vLyAgIHJlYWRvbmx5IFtpZDogbnVtYmVyXTogVDsgLy8gTk9URTogcmVhZG9ubHkgaXMgb25seSBmb3IgZXh0ZXJuYWwhXG4vLyAgIHByaXZhdGUgZWxlbWVudHMgPSBuZXcgTWFwPG51bWJlciwgVD4oKTtcblxuLy8gICBbU3ltYm9sLml0ZXJhdG9yXSgpIHsgcmV0dXJuIHRoaXMuZWxlbWVudHMudmFsdWVzKCk7IH1cblxuLy8gICBwcm90ZWN0ZWQgc2V0KGlkOiBudW1iZXIsIHZhbHVlOiBUKSB7XG4vLyAgICAgKHRoaXMgYXMge1tpZDogbnVtYmVyXTogVH0pW2lkXSA9IHZhbHVlO1xuLy8gICAgIHRoaXMuZWxlbWVudHMuc2V0KGlkLCB2YWx1ZSk7XG4vLyAgIH1cbi8vICAgZGVsZXRlKGlkOiBudW1iZXIpIHtcbi8vICAgICBkZWxldGUgKHRoaXMgYXMge1tpZDogbnVtYmVyXTogVH0pW2lkXTtcbi8vICAgICB0aGlzLmVsZW1lbnRzLmRlbGV0ZShpZCk7XG4vLyAgIH1cbi8vIH1cblxuXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0TmV2ZXIoeDogbmV2ZXIpOiBuZXZlciB7XG4gIHRocm93IG5ldyBFcnJvcihgbm9uLWV4aGF1c3RpdmUgY2hlY2s6ICR7eH1gKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydDxUPih4OiBUfHVuZGVmaW5lZHxudWxsKTogVCB7XG4gIGlmICgheCkgdGhyb3cgbmV3IEVycm9yKGBhc3NlcnRlZCBidXQgZmFsc3k6ICR7eH1gKTtcbiAgcmV0dXJuIHg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05vbk51bGw8VCBleHRlbmRzIHt9Pih4OiBUfHVuZGVmaW5lZHxudWxsKTogeCBpcyBUIHtcbiAgcmV0dXJuIHggIT0gbnVsbDtcbn1cbi8vIGV4cG9ydCBmdW5jdGlvbiBub25OdWxsPFQgZXh0ZW5kcyB7fT4oeDogVHx1bmRlZmluZWR8bnVsbCk6IFQge1xuLy8gICBpZiAoeCAhPSBudWxsKSByZXR1cm4geDtcbi8vICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBub24tbnVsbGApO1xuLy8gfVxuXG5cbi8vIEdlbmVyYWxpemVkIG1lbW9pemF0aW9uIHdyYXBwZXIuICBBbGwgYXJndW1lbnRzIG11c3QgYmUgb2JqZWN0cyxcbi8vIGJ1dCBhbnkgbnVtYmVyIG9mIGFyZ3VtZW50cyBpcyBhbGxvd2VkLlxudHlwZSBGPEEgZXh0ZW5kcyBhbnlbXSwgUj4gPSAoLi4uYXJnczogQSkgPT4gUjtcbmV4cG9ydCBmdW5jdGlvbiBtZW1vaXplPFQgZXh0ZW5kcyBvYmplY3RbXSwgUj4oZjogRjxULCBSPik6IEY8VCwgUj4ge1xuICBpbnRlcmZhY2UgViB7XG4gICAgbmV4dD86IFdlYWtNYXA8YW55LCBWPjtcbiAgICB2YWx1ZT86IFI7XG4gICAgY2FjaGVkPzogYm9vbGVhbjtcbiAgfVxuICBjb25zdCBjYWNoZTogViA9IHt9O1xuICByZXR1cm4gZnVuY3Rpb24odGhpczogYW55LCAuLi5hcmdzOiBhbnlbXSkge1xuICAgIGxldCBjID0gY2FjaGU7XG4gICAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgICAgaWYgKCFjLm5leHQpIGMubmV4dCA9IG5ldyBXZWFrTWFwPGFueSwgVj4oKTtcbiAgICAgIGxldCBuZXh0ID0gKGMubmV4dCB8fCAoYy5uZXh0ID0gbmV3IFdlYWtNYXAoKSkpLmdldChhcmcpO1xuICAgICAgaWYgKCFuZXh0KSBjLm5leHQuc2V0KGFyZywgbmV4dCA9IHt9KTtcbiAgICB9XG4gICAgaWYgKCFjLmNhY2hlZCkge1xuICAgICAgYy52YWx1ZSA9IGYuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICBjLmNhY2hlZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBjLnZhbHVlIGFzIFI7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJjbXAobGVmdDogc3RyaW5nLCByaWdodDogc3RyaW5nKTogbnVtYmVyIHtcbiAgaWYgKGxlZnQgPCByaWdodCkgcmV0dXJuIC0xO1xuICBpZiAocmlnaHQgPCBsZWZ0KSByZXR1cm4gMTtcbiAgcmV0dXJuIDA7XG59XG5cbi8vIGV4cG9ydCBjbGFzcyBQcmltZUlkR2VuZXJhdG9yIHtcbi8vICAgcHJpdmF0ZSBfaW5kZXggPSAwO1xuLy8gICBuZXh0KCk6IG51bWJlciB7XG4vLyAgICAgaWYgKHRoaXMuX2luZGV4ID49IFBSSU1FUy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignb3ZlcmZsb3cnKTtcbi8vICAgICByZXR1cm4gUFJJTUVTW3RoaXMuX2luZGV4KytdO1xuLy8gICB9XG4vLyB9XG4vLyBjb25zdCBQUklNRVMgPSAoKCkgPT4ge1xuLy8gICBjb25zdCBuID0gMTAwMDA7XG4vLyAgIGNvbnN0IG91dCA9IG5ldyBTZXQoKTtcbi8vICAgZm9yIChsZXQgaSA9IDI7IGkgPCBuOyBpKyspIHsgb3V0LmFkZChpKTsgfVxuLy8gICBmb3IgKGxldCBpID0gMjsgaSAqIGkgPCBuOyBpKyspIHtcbi8vICAgICBpZiAoIW91dC5oYXMoaSkpIGNvbnRpbnVlO1xuLy8gICAgIGZvciAobGV0IGogPSAyICogaTsgaiA8IG47IGogKz0gaSkge1xuLy8gICAgICAgb3V0LmRlbGV0ZShqKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgcmV0dXJuIFsuLi5vdXRdO1xuLy8gfSkoKTtcblxuZXhwb3J0IGNsYXNzIEtleWVkPEsgZXh0ZW5kcyBudW1iZXIsIFY+IGltcGxlbWVudHMgSXRlcmFibGU8W0ssIFZdPiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGF0YTogcmVhZG9ubHkgVltdKSB7fVxuXG4gIGdldChpbmRleDogSyk6IFZ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW2luZGV4XTtcbiAgfVxuXG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiB0aGlzLmRhdGEuZW50cmllcygpIGFzIEl0ZXJhYmxlSXRlcmF0b3I8W0ssIFZdPjtcbiAgfVxuXG4gIHZhbHVlcygpOiBJdGVyYXRvcjxWPiB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFycmF5TWFwPEsgZXh0ZW5kcyBudW1iZXIsIFY+IGltcGxlbWVudHMgSXRlcmFibGU8W0ssIFZdPiB7XG4gIHByb3RlY3RlZCByZWFkb25seSByZXY6IFJlYWRvbmx5TWFwPFYsIEs+O1xuICByZWFkb25seSBsZW5ndGg6IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRhdGE6IHJlYWRvbmx5IFZbXSkge1xuICAgIGNvbnN0IHJldiA9IG5ldyBNYXA8ViwgSz4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBLOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgcmV2LnNldChkYXRhW2ldLCBpKTtcbiAgICB9XG4gICAgdGhpcy5yZXYgPSByZXY7XG4gICAgdGhpcy5sZW5ndGggPSBkYXRhLmxlbmd0aDtcbiAgfVxuXG4gIGdldChpbmRleDogSyk6IFZ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW2luZGV4XTtcbiAgfVxuXG4gIGhhc1ZhbHVlKHZhbHVlOiBWKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucmV2Lmhhcyh2YWx1ZSk7XG4gIH1cblxuICBpbmRleCh2YWx1ZTogVik6IEt8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMucmV2LmdldCh2YWx1ZSk7XG4gICAgaWYgKGluZGV4ID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpbmRleCBmb3IgJHt2YWx1ZX1gKTtcbiAgICByZXR1cm4gaW5kZXg7XG4gIH1cblxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLmVudHJpZXMoKSBhcyBJdGVyYWJsZUl0ZXJhdG9yPFtLLCBWXT47XG4gIH1cblxuICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxWPiB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE11dGFibGVBcnJheUJpTWFwPEsgZXh0ZW5kcyBudW1iZXIsIFYgZXh0ZW5kcyBudW1iZXI+IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfZndkOiBWW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBfcmV2OiBLW10gPSBbXTtcblxuICAqIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W0ssIFZdPiB7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgSzsgaSA8IHRoaXMuX2Z3ZC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgdmFsID0gdGhpcy5fZndkW2ldO1xuICAgICAgaWYgKHZhbCAhPSBudWxsKSB5aWVsZCBbaSwgdmFsXTtcbiAgICB9XG4gIH1cblxuICAqIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxLPiB7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgSzsgaSA8IHRoaXMuX2Z3ZC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuX2Z3ZFtpXSAhPSBudWxsKSB5aWVsZCBpO1xuICAgIH1cbiAgfVxuXG4gICogdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Vj4ge1xuICAgIGZvciAobGV0IGkgPSAwIGFzIFY7IGkgPCB0aGlzLl9yZXYubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLl9yZXZbaV0gIT0gbnVsbCkgeWllbGQgaTtcbiAgICB9XG4gIH1cblxuICBnZXQoaW5kZXg6IEspOiBWfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2Z3ZFtpbmRleF07XG4gIH1cblxuICBoYXMoa2V5OiBLKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2Z3ZFtrZXldICE9IG51bGw7XG4gIH1cblxuICBoYXNWYWx1ZSh2YWx1ZTogVik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9yZXZbdmFsdWVdICE9IG51bGw7XG4gIH1cblxuICBpbmRleCh2YWx1ZTogVik6IEt8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX3Jldlt2YWx1ZV07XG4gICAgaWYgKGluZGV4ID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpbmRleCBmb3IgJHt2YWx1ZX1gKTtcbiAgICByZXR1cm4gaW5kZXg7XG4gIH1cblxuICBzZXQoa2V5OiBLLCB2YWx1ZTogVikge1xuICAgIGlmICh0aGlzLl9md2Rba2V5XSkgdGhyb3cgbmV3IEVycm9yKGBhbHJlYWR5IGhhcyBrZXkgJHtrZXl9YCk7XG4gICAgaWYgKHRoaXMuX3Jldlt2YWx1ZV0pIHRocm93IG5ldyBFcnJvcihgYWxyZWFkeSBoYXMgdmFsdWUgJHt2YWx1ZX1gKTtcbiAgICB0aGlzLl9md2Rba2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuX3Jldlt2YWx1ZV0gPSBrZXk7XG4gIH1cblxuICByZXBsYWNlKGtleTogSywgdmFsdWU6IFYpOiBWfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb2xkS2V5ID0gdGhpcy5fcmV2W3ZhbHVlXTtcbiAgICBpZiAob2xkS2V5ICE9IG51bGwpIGRlbGV0ZSB0aGlzLl9md2Rbb2xkS2V5XTtcbiAgICBjb25zdCBvbGRWYWx1ZSA9IHRoaXMuX2Z3ZFtrZXldO1xuICAgIGlmIChvbGRWYWx1ZSAhPSBudWxsKSBkZWxldGUgdGhpcy5fcmV2W29sZFZhbHVlXTtcbiAgICB0aGlzLl9md2Rba2V5XSA9IHZhbHVlO1xuICAgIHRoaXMuX3Jldlt2YWx1ZV0gPSBrZXk7XG4gICAgcmV0dXJuIG9sZFZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUYWJsZTxSLCBDLCBWPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFtSLCBDLCBWXT57XG4gIHByaXZhdGUgcmVhZG9ubHkgX21hcCA9IG5ldyBNYXA8UiwgTWFwPEMsIFY+PigpO1xuICBjb25zdHJ1Y3RvcihlbGVtcz86IEl0ZXJhYmxlPHJlYWRvbmx5IFtSLCBDLCBWXT4pIHtcbiAgICBpZiAoZWxlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgW3IsIGMsIHZdIG9mIGVsZW1zKSB7XG4gICAgICAgIHRoaXMuc2V0KHIsIGMsIHYpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gICogW1N5bWJvbC5pdGVyYXRvcl0oKTogR2VuZXJhdG9yPFtSLCBDLCBWXT4ge1xuICAgIGZvciAoY29uc3QgW3IsIG1hcF0gb2YgdGhpcy5fbWFwKSB7XG4gICAgICBmb3IgKGNvbnN0IFtjLCB2XSBvZiBtYXApIHtcbiAgICAgICAgeWllbGQgW3IsIGMsIHZdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNldChyOiBSLCBjOiBDLCB2OiBWKSB7XG4gICAgbGV0IGNvbCA9IHRoaXMuX21hcC5nZXQocik7XG4gICAgaWYgKCFjb2wpIHRoaXMuX21hcC5zZXQociwgY29sID0gbmV3IE1hcCgpKTtcbiAgICBjb2wuc2V0KGMsIHYpO1xuICB9XG5cbiAgZ2V0KHI6IFIsIGM6IEMpOiBWfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQocik/LmdldChjKTtcbiAgfVxuXG4gIGhhcyhyOiBSLCBjOiBDKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX21hcC5nZXQocik/LmhhcyhjKSB8fCBmYWxzZTtcbiAgfVxuXG4gIGRlbGV0ZShyOiBSLCBjOiBDKTogdm9pZCB7XG4gICAgY29uc3QgY29sID0gdGhpcy5fbWFwLmdldChyKTtcbiAgICBpZiAoIWNvbCkgcmV0dXJuO1xuICAgIGNvbC5kZWxldGUoYyk7XG4gICAgaWYgKCFjb2wuc2l6ZSkgdGhpcy5fbWFwLmRlbGV0ZShyKTtcbiAgfVxuXG4gIHJvdyhyOiBSKTogUmVhZG9ubHlNYXA8QywgVj4ge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KHIpID8/IG5ldyBNYXAoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0KGZtdDogc3RyaW5nLCAuLi5hcmdzOiB1bmtub3duW10pOiBzdHJpbmcge1xuICBjb25zdCBzcGxpdCA9IGZtdC5zcGxpdCgvJS9nKTtcbiAgbGV0IGFyZ0luZGV4ID0gMDtcbiAgbGV0IG91dCA9IHNwbGl0WzBdO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHNwbGl0Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFzcGxpdFtpXSkge1xuICAgICAgb3V0ICs9ICclJyArIHNwbGl0WysraV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgbWF0Y2ggPSAvKFstK10qKShbMFxcRF0/KShcXGQqKShbZHhzXSkvLmV4ZWMoc3BsaXRbaV0pO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIG91dCArPSBhcmdzW2FyZ0luZGV4KytdICsgc3BsaXRbaV07XG4gICAgICBjb250aW51ZTtcbiAgICB9IFxuICAgIGNvbnN0IGxlbiA9IHBhcnNlSW50KG1hdGNoWzNdKSB8fCAwO1xuICAgIGNvbnN0IHBhZCA9IG1hdGNoWzJdIHx8ICcgJztcbiAgICBjb25zdCBhcmcgPSBhcmdzW2FyZ0luZGV4KytdO1xuICAgIGxldCBzdHIgPSBtYXRjaFs0XSA9PT0gJ3gnID8gTnVtYmVyKGFyZykudG9TdHJpbmcoMTYpIDogU3RyaW5nKGFyZyk7XG4gICAgaWYgKG1hdGNoWzRdICE9PSAncycgJiYgL1xcKy8udGVzdChtYXRjaFsxXSkgJiYgTnVtYmVyKGFyZykgPj0gMCkge1xuICAgICAgc3RyID0gJysnICsgc3RyO1xuICAgIH1cbiAgICBpZiAoc3RyLmxlbmd0aCA8IGxlbikge1xuICAgICAgY29uc3QgcGFkZGluZyA9IHBhZC5yZXBlYXQobGVuIC0gc3RyLmxlbmd0aCk7XG4gICAgICBzdHIgPSAvLS8udGVzdChtYXRjaFsxXSkgPyBzdHIgKyBwYWRkaW5nIDogcGFkZGluZyArIHN0cjtcbiAgICB9XG4gICAgb3V0ICs9IHN0ciArIHNwbGl0W2ldLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIGNhbmNlbGxhdGlvblxuXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbFRva2VuUmVnaXN0cmF0aW9uIHtcbiAgdW5yZWdpc3RlcigpOiB2b2lkO1xufVxuY2xhc3MgQ2FuY2VsVG9rZW5SZWcge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBjYWxsYmFjazogKCkgPT4gdm9pZCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgc291cmNlOiBDYW5jZWxUb2tlblNvdXJjZSkge31cbiAgdW5yZWdpc3RlcigpIHsgdGhpcy5zb3VyY2UudW5yZWdpc3Rlcih0aGlzKTsgfVxufVxuZXhwb3J0IGNsYXNzIENhbmNlbFRva2VuU291cmNlIHtcbiAgcmVhZG9ubHkgdG9rZW46IENhbmNlbFRva2VuO1xuICBwcml2YXRlIGNhbmNlbGxlZCA9IGZhbHNlO1xuICBwcml2YXRlIHJlZ2lzdHJhdGlvbnMgPSBuZXcgU2V0PENhbmNlbFRva2VuUmVnPigpO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIGNvbnN0IHNvdXJjZSA9IHRoaXM7XG4gICAgdGhpcy50b2tlbiA9IHtcbiAgICAgIGdldCByZXF1ZXN0ZWQoKSB7IHJldHVybiBzb3VyY2UuY2FuY2VsbGVkOyB9LFxuICAgICAgdGhyb3dJZlJlcXVlc3RlZCgpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5jYW5jZWxsZWQpIHRocm93IG5ldyBFcnJvcihgQ2FuY2VsbGVkYCk7XG4gICAgICB9LFxuICAgICAgcmVnaXN0ZXIoY2FsbGJhY2s6ICgpID0+IHZvaWQpIHtcbiAgICAgICAgY29uc3QgcmVnID0gbmV3IENhbmNlbFRva2VuUmVnKGNhbGxiYWNrLCBzb3VyY2UpO1xuICAgICAgICBzb3VyY2UucmVnaXN0cmF0aW9ucy5hZGQocmVnKTtcbiAgICAgICAgcmV0dXJuIHJlZztcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBwYXJlbnQvY2hpbGQ/XG5cbiAgY2FuY2VsKCkge1xuICAgIGlmICh0aGlzLmNhbmNlbGxlZCkgcmV0dXJuO1xuICAgIHRoaXMuY2FuY2VsbGVkID0gdHJ1ZTtcbiAgICBjb25zdCByZWdzID0gWy4uLnRoaXMucmVnaXN0cmF0aW9uc107XG4gICAgdGhpcy5yZWdpc3RyYXRpb25zLmNsZWFyKCk7XG4gICAgZm9yIChjb25zdCByZWcgb2YgcmVncykge1xuICAgICAgcmVnLmNhbGxiYWNrKCk7XG4gICAgfVxuICB9XG5cbiAgdW5yZWdpc3RlcihyZWc6IENhbmNlbFRva2VuUmVnKSB7XG4gICAgdGhpcy5yZWdpc3RyYXRpb25zLmRlbGV0ZShyZWcpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuY2VsVG9rZW4ge1xuICByZWFkb25seSByZXF1ZXN0ZWQ6IGJvb2xlYW47XG4gIHRocm93SWZSZXF1ZXN0ZWQoKTogdm9pZDtcbiAgcmVnaXN0ZXIoY2FsbGJhY2s6ICgpID0+IHZvaWQpOiBDYW5jZWxUb2tlblJlZ2lzdHJhdGlvbjtcbn1cbmV4cG9ydCBuYW1lc3BhY2UgQ2FuY2VsVG9rZW4ge1xuICBleHBvcnQgY29uc3QgTk9ORTogQ2FuY2VsVG9rZW4gPSB7XG4gICAgZ2V0IHJlcXVlc3RlZCgpIHsgcmV0dXJuIGZhbHNlOyB9LFxuICAgIHRocm93SWZSZXF1ZXN0ZWQoKSB7fSxcbiAgICByZWdpc3RlcigpIHsgcmV0dXJuIHt1bnJlZ2lzdGVyKCkge319OyB9LFxuICB9O1xuICBleHBvcnQgY29uc3QgQ0FOQ0VMTEVEOiBDYW5jZWxUb2tlbiA9IHtcbiAgICBnZXQgcmVxdWVzdGVkKCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICB0aHJvd0lmUmVxdWVzdGVkKCkgeyB0aHJvdyBuZXcgRXJyb3IoJ2NhbmNlbGxlZCcpOyB9LFxuICAgIHJlZ2lzdGVyKCkgeyByZXR1cm4ge3VucmVnaXN0ZXIoKSB7fX07IH0sXG4gIH07XG59XG5cbi8vLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogQSBzdHJpbmctdG8tViBtYXAgdGhhdCBjYW4gYmUgdXNlZCBlaXRoZXIgY2FzZS1zZW5zaXRpdmVseVxuICogb3IgY2FzZS1pbnNlbnNpdGl2ZWx5LlxuICovXG5leHBvcnQgY2xhc3MgQ2FzZU1hcDxWPiB7XG4gIHMgPSBuZXcgTWFwPHN0cmluZywgVj4oKTtcbiAgaSA9IG5ldyBNYXA8c3RyaW5nLCBWPigpO1xuICBzZW5zaXRpdmUgPSB0cnVlO1xuXG4gIHNldChrZXk6IHN0cmluZywgdmFsOiBWKSB7XG4gICAgY29uc3Qga2kgPSBrZXkgPSBrZXkudG9VcHBlckNhc2UoKTtcbiAgICBpZiAodGhpcy5zZW5zaXRpdmUpIHtcbiAgICAgIC8vIFRPRE8gLSBjaGVjayFcbiAgICAgIHRoaXMucy5zZXQoa2V5LCB2YWwpO1xuICAgICAgdGhpcy5pLnNldChraSwgdmFsKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFR5cGU8VD4oYWN0dWFsOiBUKTogdm9pZCB7fVxuIl19