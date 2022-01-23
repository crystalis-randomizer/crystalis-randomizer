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
export function lowerCamelToWords(lowerCamel) {
    const split = lowerCamel.split(/(?=[A-Z0-9])/g);
    return split.map(s => s[0].toUpperCase() + s.substring(1)).join(' ');
}
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
export function hex1(x, digits = 1) {
    return x < 0 ? `~${(~x).toString(16).padStart(digits, '0')}` :
        x.toString(16).padStart(digits, '0');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9qcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sT0FBTyxLQUFLO0lBUWhCLFlBQVksSUFBa0I7UUFOdEIsV0FBTSxHQUFzQixJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQyxTQUFJLEdBQVcsR0FBRyxDQUFDO1FBQ25CLFVBQUssR0FBVyxDQUFDLENBQUM7UUFDbEIsUUFBRyxHQUFXLENBQUMsQ0FBQztRQUNoQixTQUFJLEdBQVcsQ0FBQyxDQUFDO1FBR3ZCLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsT0FBTztZQUNMLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUk7b0JBQUUsT0FBTyxFQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDO2dCQUMxRCxPQUFPO29CQUNMLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQU07b0JBQ3ZELElBQUksRUFBRSxLQUFLO2lCQUNaLENBQUM7WUFDSixDQUFDO1lBQ0QsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3RCLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksTUFBTTtRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWM7UUFDbkIsT0FBTyxJQUFJLENBQUMsSUFBSSxJQUFJ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QUMsSUFBSTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBYSxFQUFFLE1BQWMsSUFBSSxDQUFDLElBQUk7UUFDMUMsSUFBSSxLQUFLLEdBQUcsQ0FBQztZQUFFLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2xDLElBQUksR0FBRyxHQUFHLENBQUM7WUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQztRQUM5QixJQUFJLEdBQUcsSUFBSSxLQUFLO1lBQUUsT0FBTyxFQUFFLENBQUM7UUFDNUIsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDM0UsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkUsSUFBSSxLQUFLLElBQUksR0FBRztZQUFFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBUSxDQUFDO1FBQzlELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBUSxDQUFDO0lBQzNFLENBQUM7SUFFRCxNQUFNLENB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LElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN2RSxDQUFDO0FBUUQsTUFBTSxPQUFPLE9BQU87SUFBcEI7UUFDRSxNQUFDLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUN6QixNQUFDLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztRQUN6QixjQUFTLEdBQUcsSUFBSSxDQUFDO0lBVW5CLENBQUM7SUFSQyxHQUFHLENBQUMsR0FBVyxFQUFFLEdBQU07UUFDckIsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFFbEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNyQjtJQUNILENBQUM7Q0FDRjtBQUVELE1BQU0sVUFBVSxVQUFVLENBQUksTUFBUyxJQUFTLENBQUM7QUFFakQsTUFBTSxVQUFVLElBQUksQ0FBQyxDQUFTLEVBQUUsTUFBTSxHQUFHLENBQUM7SUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY2xhc3MgRGVxdWU8VD4gaW1wbGVtZW50cyBJdGVyYWJsZTxUPiB7XG5cbiAgcHJpdmF0ZSBidWZmZXI6IChUIHwgdW5kZWZpbmVkKVtdID0gbmV3IEFycmF5KDE2KTtcbiAgcHJpdmF0ZSBtYXNrOiBudW1iZXIgPSAweGY7XG4gIHByaXZhdGUgc3RhcnQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgZW5kOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIHNpemU6IG51bWJlciA9IDA7XG5cbiAgY29uc3RydWN0b3IoaXRlcj86IEl0ZXJhYmxlPFQ+KSB7XG4gICAgaWYgKGl0ZXIpIHRoaXMucHVzaCguLi5pdGVyKTtcbiAgfVxuXG4gIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhdG9yPFQ+IHtcbiAgICBsZXQgaSA9IDA7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5leHQ6ICgpID0+IHtcbiAgICAgICAgaWYgKGkgPj0gdGhpcy5zaXplKSByZXR1cm4ge3ZhbHVlOiB1bmRlZmluZWQsIGRvbmU6IHRydWV9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHZhbHVlOiB0aGlzLmJ1ZmZlclsodGhpcy5zdGFydCArIGkrKykgJiB0aGlzLm1hc2tdIGFzIFQsXG4gICAgICAgICAgZG9uZTogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiB0aGlzOyB9XG4gICAgfSBhcyBJdGVyYXRvcjxUPjtcbiAgfVxuXG4gIGdldCBsZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5zaXplO1xuICB9XG5cbiAgdXBzaXplKHRhcmdldDogbnVtYmVyKSB7XG4gICAgd2hpbGUgKHRoaXMubWFzayA8PSB0YXJnZXQpIHtcbiAgICAgIGlmICh0aGlzLmVuZCA8IHRoaXMuc3RhcnQpIHRoaXMuc3RhcnQgKz0gdGhpcy5tYXNrICsgMTtcbiAgICAgIHRoaXMubWFzayA9IHRoaXMubWFzayA8PCAxIHwgMTtcbiAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIuY29uY2F0KHRoaXMuYnVmZmVyKTtcbiAgICB9XG4gICAgdGhpcy5zaXplID0gdGFyZ2V0O1xuICB9XG5cbiAgcHVzaCguLi5lbGVtczogVFtdKSB7XG4gICAgdGhpcy51cHNpemUodGhpcy5zaXplICsgZWxlbXMubGVuZ3RoKTtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgZWxlbXMpIHtcbiAgICAgIHRoaXMuYnVmZmVyW3RoaXMuZW5kXSA9IGVsZW07XG4gICAgICB0aGlzLmVuZCA9ICh0aGlzLmVuZCArIDEpICYgdGhpcy5tYXNrO1xuICAgIH1cbiAgfVxuXG4gIHBvcCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB0aGlzLmVuZCA9ICh0aGlzLmVuZCAtIDEpICYgdGhpcy5tYXNrO1xuICAgIHRoaXMuc2l6ZS0tO1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLmVuZF07XG4gIH1cblxuICBwZWVrKCk6IFQgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlclsodGhpcy5lbmQgLSAxKSAmIHRoaXMubWFza107XG4gIH1cblxuICB1bnNoaWZ0KC4uLmVsZW1zOiBUW10pIHtcbiAgICB0aGlzLnVwc2l6ZSh0aGlzLnNpemUgKyBlbGVtcy5sZW5ndGgpO1xuICAgIGxldCBpID0gdGhpcy5zdGFydCA9ICh0aGlzLnN0YXJ0IC0gZWxlbXMubGVuZ3RoKSAmIHRoaXMubWFzaztcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgZWxlbXMpIHtcbiAgICAgIHRoaXMuYnVmZmVyW2krKyAmIHRoaXMubWFza10gPSBlbGVtO1xuICAgIH1cbiAgfVxuXG4gIHNoaWZ0KCk6IFQgfCB1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYnVmZmVyW3RoaXMuc3RhcnRdO1xuICAgIHRoaXMuc3RhcnQgPSAodGhpcy5zdGFydCArIDEpICYgdGhpcy5tYXNrO1xuICAgIHRoaXMuc2l6ZS0tO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmcm9udCgpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gdGhpcy5idWZmZXJbdGhpcy5zdGFydF07XG4gIH1cblxuICBnZXQoaTogbnVtYmVyKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKGkgPj0gdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlclsodGhpcy5zdGFydCArIGkpICYgdGhpcy5tYXNrXTtcbiAgfVxuXG4gIHNsaWNlKHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyID0gdGhpcy5zaXplKTogVFtdIHtcbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCArPSB0aGlzLnNpemU7XG4gICAgaWYgKGVuZCA8IDApIGVuZCArPSB0aGlzLnNpemU7XG4gICAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuIFtdO1xuICAgIHN0YXJ0ID0gKHRoaXMuc3RhcnQgKyBNYXRoLm1heCgwLCBNYXRoLm1pbih0aGlzLnNpemUsIHN0YXJ0KSkpICYgdGhpcy5tYXNrO1xuICAgIGVuZCA9ICh0aGlzLnN0YXJ0ICsgTWF0aC5tYXgoMCwgTWF0aC5taW4odGhpcy5zaXplLCBlbmQpKSkgJiB0aGlzLm1hc2s7XG4gICAgaWYgKHN0YXJ0IDw9IGVuZCkgcmV0dXJuIHRoaXMuYnVmZmVyLnNsaWNlKHN0YXJ0LCBlbmQpIGFzIFRbXTtcbiAgICByZXR1cm4gdGhpcy5idWZmZXIuc2xpY2Uoc3RhcnQpLmNvbmNhdCh0aGlzLmJ1ZmZlci5zbGljZSgwLCBlbmQpKSBhcyBUW107XG4gIH1cblxuICBzcGxpY2Uoc3RhcnQ6IG51bWJlciwgY291bnQ6IG51bWJlciwgLi4uZWxlbXM6IFRbXSk6IFRbXSB7XG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgKz0gdGhpcy5zaXplO1xuICAgIHN0YXJ0ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4odGhpcy5zaXplLCBzdGFydCkpO1xuICAgIGNvdW50ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4odGhpcy5zaXplIC0gc3RhcnQsIGNvdW50KSk7XG4gICAgbGV0IGVuZCA9IHN0YXJ0ICsgY291bnQ7XG4gICAgY29uc3QgZGVsdGEgPSBlbGVtcy5sZW5ndGggLSBjb3VudDtcbiAgICBjb25zdCBvdXQgPSB0aGlzLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgIHRoaXMudXBzaXplKHRoaXMuc2l6ZSArIGRlbHRhKTtcbiAgICB0aGlzLnNpemUgLT0gZGVsdGE7IC8vIHVuZG8gdGhlIHNpemUgY2hhbmdlIHNvIHNsaWNlIHdvcmtzXG5cbiAgICBpZiAoc3RhcnQgPT09IDApIHtcbiAgICAgIHRoaXMuc3RhcnQgPSAodGhpcy5zdGFydCAtIGRlbHRhKSAmIHRoaXMubWFzaztcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5idWZmZXJbKHRoaXMuc3RhcnQgKyBpKSAmIHRoaXMubWFza10gPSBlbGVtc1tpXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGVuZCA9PT0gdGhpcy5zaXplKSB7XG4gICAgICB0aGlzLmVuZCA9ICh0aGlzLmVuZCArIGRlbHRhKSAmIHRoaXMubWFzaztcbiAgICAgIHN0YXJ0ICs9IHRoaXMuc3RhcnQ7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuYnVmZmVyWyhzdGFydCArIGkpICYgdGhpcy5tYXNrXSA9IGVsZW1zW2ldO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzcGxpY2Ugb3V0IG9mIHRoZSBtaWRkbGUuLi5cbiAgICAgIGNvbnN0IGJ1ZiA9IFsuLi50aGlzLnNsaWNlKDAsIHN0YXJ0KSwgLi4uZWxlbXMsIC4uLnRoaXMuc2xpY2UoZW5kKV07XG4gICAgICBidWYubGVuZ3RoID0gdGhpcy5idWZmZXIubGVuZ3RoO1xuICAgICAgdGhpcy5idWZmZXIgPSBidWY7XG4gICAgICB0aGlzLnN0YXJ0ID0gMDtcbiAgICAgIHRoaXMuZW5kID0gdGhpcy5zaXplO1xuICAgIH1cbiAgICB0aGlzLnNpemUgKz0gZGVsdGE7XG4gICAgcmV0dXJuIG91dDtcblxuICAgIC8vIHN0YXJ0ICY9IHRoaXMubWFzaztcbiAgICAvLyBlbmQgJj0gdGhpcy5tYXNrO1xuICAgIC8vIGNvbnN0IGRlbHRhID0gZWxlbXMubGVuZ3RoIC0gY291bnQ7XG4gICAgLy8gaWYgKGRlbHRhID09PSAwKSB7XG4gICAgLy8gICAvLyBubyBjaGFuZ2UgdG8gdGhlIHNpemVcbiAgICAvLyAgIGNvbnN0IG91dCA9XG4gICAgLy8gICAgICAgcGl2b3QyIDwgcGl2b3QxID9cbiAgICAvLyAgICAgICAgICAgdGhpcy5idWZmZXIuc2xpY2UocGl2b3QxKS5jb25jYXQodGhpcy5idWZmZXIuc2xpY2UoMCwgcGl2b3QyKSkgOlxuICAgIC8vICAgICAgICAgICB0aGlzLmJ1ZmZlci5zbGljZShwaXZvdDEsIHBpdm90Mik7XG4gICAgLy8gICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAvLyAgICAgdGhpcy5idWZmZXJbKHBpdm90MSArIGkpICYgdGhpcy5tYXNrXSA9IGVsZW1zW2ldO1xuICAgIC8vICAgfVxuICAgIC8vICAgcmV0dXJuIG91dDtcbiAgICAvLyB9IGVsc2UgaWYgKGRlbHRhIDwgMCkge1xuICAgIC8vICAgLy8gZGVxdWUgaXMgc2hyaW5raW5nXG4gICAgLy8gICBpZiAocGl2b3QxIDwgc3RhcnQpIHtcbiAgICAvLyAgICAgLy8gYnJlYWsgaXMgaW4gdGhlIGZpcnN0IGNodW5rXG4gICAgLy8gICAgIGNvbnN0IHBpdm90MyA9IHBpdm90MSArIGVsZW1zLmxlbmd0aDtcbiAgICAvLyAgICAgdGhpcy5idWZmZXIuc3BsaWNlKHBpdm90MSwgZWxlbXMubGVuZ3RoLCAuLi5lbGVtcyk7XG4gICAgLy8gICAgIHRoaXMuYnVmZmVyLmNvcHlXaXRoaW4ocGl2b3QzLCBwaXZvdDIsIGVuZCk7XG4gICAgLy8gICAgIHRoaXMuZW5kICs9IGRlbHRhO1xuICAgIC8vICAgICB0aGlzLnNpemUgKz0gZGVsdGE7XG4gICAgLy8gICB9IGVsc2UgaWYgKHBpdm90MiA8IHBpdm90MSkge1xuICAgIC8vICAgICAvLyBicmVhayBpcyBiZXR3ZWVuIHBpdm90czogaWYgdGhlIGVsZW1lbnRzIHRvIGluc2VydFxuICAgIC8vICAgICAvLyBjYW4gY3Jvc3MgdGhlIGdhcCB0aGVuIHdlIGNhbiB0cml2aWFsbHkgY29weS5cbiAgICAvLyAgIH0gZWxzZSB7XG4gICAgLy8gICAgIC8vIGJyZWFrIGlzIGluIHRoZSBsYXN0IGNodW5rIG9yIG5vdCBhdCBhbGxcbiAgICAvLyAgICAgY29uc3QgcGl2b3QzID0gcGl2b3QyIC0gZWxlbXMubGVuZ3RoO1xuICAgIC8vICAgICB0aGlzLmJ1ZmZlci5zcGxpY2UocGl2b3QzLCBlbGVtcy5sZW5ndGgsIC4uLmVsZW1zKTtcbiAgICAvLyAgICAgdGhpcy5idWZmZXIuY29weVdpdGhpbihzdGFydCwgcGl2b3QzLCBwaXZvdDEpO1xuICAgIC8vICAgICB0aGlzLnN0YXJ0IC09IGRlbHRhO1xuICAgIC8vICAgICB0aGlzLnNpemUgKz0gZGVsdGE7XG4gICAgLy8gICB9IGVsc2UgaWYgKFxuICAgIC8vIH1cbiAgICAvLyAvLyB0aGlzLnN0YXJ0IDw9IHBpdm90MSA8PSBwaXZvdDIgPD0gdGhpcy5lbmRcbiAgICAvLyAvLyBUaGUgd3JhcCB3aWxsIG9jY3VyIGluIGF0IG1vc3Qgb25lIG9mIHRob3NlIGdhcHNcbiAgICAvLyAvLyBEb24ndCBtb3ZlIHRoYXQgYmxvY2suXG4gICAgLy8gLy8gSWYgdGhlIHdyYXAgb2NjdXJzIGJldHdlZW4gcGl2b3QxIGFuZCBwaXZvdDIgdGhlbiB3ZSBtYXkgYmVcbiAgICAvLyAvLyBzdHVjayBtYWtpbmcgdHdvIGNvcGllcy4gIEluIHRoYXQgY2FzZSwganVzdCByZWJhc2UgdG8gMC5cbiAgICBcbiAgfVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIGNvbnN0IHBhcnRzID0gbmV3IEFycmF5KHRoaXMuc2l6ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNpemU7IGkrKykge1xuICAgICAgcGFydHNbaV0gPSB0aGlzLmJ1ZmZlclsodGhpcy5zdGFydCArIGkpICYgdGhpcy5tYXNrXTtcbiAgICB9XG4gICAgcmV0dXJuIGBbJHtwYXJ0cy5qb2luKCcsICcpfV1gO1xuICB9XG59XG5cbi8vIC8qKiBAdGVtcGxhdGUgVCAqL1xuLy8gZXhwb3J0IGNsYXNzIERlcXVlU2V0IHtcbi8vICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgLyoqIEB0eXBlIHshQXJyYXk8VHx1bmRlZmluZWQ+fSAqL1xuLy8gICAgIHRoaXMuYnVmZmVyID0gbmV3IEFycmF5KDE2KTtcbi8vICAgICAvKiogQHR5cGUge251bWJlcn0gKi9cbi8vICAgICB0aGlzLm1hc2sgPSAweGY7XG4vLyAgICAgLyoqIEB0eXBlIHtudW1iZXJ9ICovXG4vLyAgICAgdGhpcy5zdGFydCA9IDA7XG4vLyAgICAgLyoqIEB0eXBlIHtudW1iZXJ9ICovXG4vLyAgICAgdGhpcy5lbmQgPSAwO1xuLy8gICAgIC8qKiBAdHlwZSB7bnVtYmVyfSAqL1xuLy8gICAgIHRoaXMuc2l6ZSA9IDA7IC8vIHJlYWRvbmx5IGV4dGVybmFsbHlcbi8vICAgICAvKiogQHR5cGUgeyFTZXQ8VD59ICovXG4vLyAgICAgdGhpcy5zZXQgPSBuZXcgU2V0KCk7XG4vLyAgIH1cblxuLy8gICB1cHNpemUodGFyZ2V0KSB7XG4vLyAgICAgd2hpbGUgKHRoaXMubWFzayA8IHRhcmdldCkge1xuLy8gICAgICAgdGhpcy5zdGFydCArPSB0aGlzLm1hc2sgKyAxO1xuLy8gICAgICAgdGhpcy5tYXNrID0gdGhpcy5tYXNrIDw8IDEgfCAxO1xuLy8gICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5jb25jYXQodGhpcy5idWZmZXIpO1xuLy8gICAgIH1cbi8vICAgICB0aGlzLnNpemUgPSB0YXJnZXQ7XG4vLyAgIH1cblxuLy8gICAvKiogQHBhcmFtIHsuLi5UfSBlbGVtICovXG4vLyAgIHB1c2goLi4uZWxlbXMpIHtcbi8vICAgICB0aGlzLnVwc2l6ZSh0aGlzLnNpemUgKyBlbGVtcy5sZW5ndGgpO1xuLy8gICAgIGZvciAoY29uc3QgZWxlbSBvZiBlbGVtcykge1xuLy8gICAgICAgaWYgKHRoaXMuc2V0LmhhcyhlbGVtKSkge1xuLy8gICAgICAgICB0aGlzLnNpemUtLTtcbi8vICAgICAgICAgY29udGludWU7XG4vLyAgICAgICB9XG4vLyAgICAgICB0aGlzLmJ1ZmZlclt0aGlzLmVuZF0gPSBlbGVtO1xuLy8gICAgICAgdGhpcy5lbmQgPSAodGhpcy5lbmQgKyAxKSAmIHRoaXMubWFzaztcbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICAvKiogQHJldHVybiB7VHx1bmRlZmluZWR9ICovXG4vLyAgIHBvcCgpIHtcbi8vICAgICBpZiAoIXRoaXMuc2l6ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbi8vICAgICB0aGlzLmVuZCA9ICh0aGlzLmVuZCAtIDEpICYgdGhpcy5tYXNrO1xuLy8gICAgIHRoaXMuc2l6ZS0tO1xuLy8gICAgIGNvbnN0IG91dCA9IHRoaXMuYnVmZmVyW3RoaXMuZW5kXTtcbi8vICAgICB0aGlzLnNldC5kZWxldGUob3V0KTtcbi8vICAgICByZXR1cm4gb3V0O1xuLy8gICB9XG5cbi8vICAgLyoqIEByZXR1cm4ge1R8dW5kZWZpbmVkfSAqL1xuLy8gICBwZWVrKCkge1xuLy8gICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuLy8gICAgIHJldHVybiB0aGlzLmJ1ZmZlclsodGhpcy5lbmQgLSAxKSAmIHRoaXMubWFza107XG4vLyAgIH1cblxuLy8gICAvKiogQHBhcmFtIHsuLi5UfSBlbGVtICovXG4vLyAgIHVuc2hpZnQoLi4uZWxlbXMpIHtcbi8vICAgICB0aGlzLnVwc2l6ZSh0aGlzLnNpemUgKyBlbGVtcy5sZW5ndGgpO1xuLy8gICAgIGZvciAoY29uc3QgZWxlbSBvZiBlbGVtcykge1xuLy8gICAgICAgaWYgKHRoaXMuc2V0LmhhcyhlbGVtKSkge1xuLy8gICAgICAgICB0aGlzLnNpemUtLTtcbi8vICAgICAgICAgY29udGludWU7XG4vLyAgICAgICB9XG4vLyAgICAgICB0aGlzLnN0YXJ0ID0gKHRoaXMuc3RhcnQgLSAxKSAmIHRoaXMubWFzaztcbi8vICAgICAgIHRoaXMuYnVmZmVyW3RoaXMuc3RhcnRdID0gZWxlbTtcbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICAvKiogQHJldHVybiB7VHx1bmRlZmluZWR9ICovXG4vLyAgIHNoaWZ0KCkge1xuLy8gICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuLy8gICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuYnVmZmVyW3RoaXMuc3RhcnRdO1xuLy8gICAgIHRoaXMuc3RhcnQgPSAodGhpcy5zdGFydCArIDEpICYgdGhpcy5tYXNrO1xuLy8gICAgIHRoaXMuc2l6ZS0tO1xuLy8gICAgIHRoaXMuc2V0LnJlbW92ZShyZXN1bHQpO1xuLy8gICAgIHJldHVybiByZXN1bHQ7XG4vLyAgIH1cblxuLy8gICAvKiogQHJldHVybiB7VHx1bmRlZmluZWR9ICovXG4vLyAgIGZyb250KCkge1xuLy8gICAgIGlmICghdGhpcy5zaXplKSByZXR1cm4gdW5kZWZpbmVkO1xuLy8gICAgIHJldHVybiB0aGlzLmJ1ZmZlclt0aGlzLnN0YXJ0XTtcbi8vICAgfVxuLy8gfVxuXG4vLyBleHBvcnQgY2xhc3MgSW5kZXhlZExpc3Qge1xuLy8gICBjb25zdHJ1Y3RvcigpIHtcbi8vICAgICB0aGlzLmxpc3QgPSBbXTtcbi8vICAgICB0aGlzLm1hcCA9IG5ldyBNYXAoKTtcbi8vICAgfVxuXG4vLyAgIGFkZChlbGVtKSB7XG4vLyAgICAgaWYgKHRoaXMubWFwLmhhcyhlbGVtKSkgcmV0dXJuO1xuLy8gICAgIHRoaXMubWFwLnNldChlbGVtLCB0aGlzLmxpc3QubGVuZ3RoKTtcbi8vICAgICB0aGlzLmxpc3QucHVzaChlbGVtKTtcbi8vICAgfVxuXG4vLyAgIGluZGV4T2YoZWxlbSkge1xuLy8gICAgIHJldHVybiB0aGlzLm1hcC5nZXQoZWxlbSk7XG4vLyAgIH1cblxuLy8gICByZW1vdmUoZWxlbSkge1xuLy8gICAgIC8vIFRPRE8gLSB0aGlzIGlzbid0IHN1cGVyIGVmZmljaWVudC4uLlxuLy8gICAgIC8vIFdlIGNvdWxkIG1haW50YWluIGEgc21hbGwgaGFuZGZ1bCBvZiBzcGxpdCBwb2ludHMuXG4vLyAgICAgLy8gT3IgYSBSZW1vdmFsVHJlZSB3aGVyZSBpdCBzdGFydHMgd2l0aCBhIGZ1bGx5LWJhbGFuY2VkXG4vLyAgICAgLy8gYmluYXJ5IHRyZWUgKGhlaWdodCB+IGxvZyhuKSkgYW5kIHRoZW4gd2UganVzdCByZW1vdmVcbi8vICAgICAvLyBlbGVtZW50cyBmcm9tIHRoZXJlIHNvIHRoYXQgd2Ugb25seSBuZWVkIHRvIHVwZGF0ZVxuLy8gICAgIC8vIE8obG9nKG4pKSBcInNpemVcIiB2YWx1ZXMgb24gdGhlIHdheSB1cC4gIFRob3VnaCB0aGlzXG4vLyAgICAgLy8gZG9lc24ndCBoZWxwIHRvIGFjdHVhbGx5ICpmaW5kKiB0aGUgZWxlbWVudC4uLlxuLy8gICAgIC8vIEFub3RoZXIgb3B0aW9uIHdvdWxkIGJlIHRvIHVzZSB0aGUgYml0cyBvZiB0aGUgaW5kZXhcbi8vICAgICAvLyB0byBrZWVwIHRyYWNrIG9mIHRoZSBudW1iZXIgb2YgcmVtb3ZlZCBlbGVtZW50cyBiZWZvcmUuXG4vLyAgICAgLy8gU28gd2UgaGF2ZSBhIHNhbWUtc2l6ZSBhcnJheSBvZiBudW1iZXJzXG4vLyAgICAgLy8gd2hlcmUgZWFjaCBlbnRyeSB0ZWxscyB0aGUgc2l6ZSB0byBhZGQgZm9yIHRoZSBOdGggb25lLWJpdFxuLy8gICAgIC8vIGFuZCBhbGwgdGhlIGhpZ2hlciBiaXRzLlxuLy8gICAgIC8vICAgMDAgLT4gMFxuLy8gICAgIC8vICAgMDEgLT4gMVxuLy8gICAgIC8vICAgMTAgLT4gMlxuLy8gICAgIC8vICAgMTEgLT4gMyA9IDIgKyAxXG4vLyAgICAgLy8gU3RvcmluZ1xuLy8gICAgIC8vICAgWCMgIC0+IDJcbi8vICAgICAvLyAgIDFYICAtPiAxXG4vLyAgICAgLy8gICAwWCAgLT4gMVxuLy8gICAgIC8vIEZvciBiaWdnZXIgbGlzdCxcbi8vICAgICAvLyAgIDExWCAtPiAxICAgIHN0b3JlZCBhdCAgICAxMTEgPSA3XG4vLyAgICAgLy8gICAxMFggLT4gMSAgICAgICAgICAgICAgICAgMTEwID0gNlxuLy8gICAgIC8vICAgMDFYIC0+IDEgICAgICAgICAgICAgICAgIDEwMSA9IDVcbi8vICAgICAvLyAgIDAwWCAtPiAxICAgICAgICAgICAgICAgICAxMDAgPSA0XG4vLyAgICAgLy8gICAxWCMgLT4gMiAgICAgICAgICAgICAgICAgMDExID0gM1xuLy8gICAgIC8vICAgMFgjIC0+IDIgICAgICAgICAgICAgICAgIDAxMCA9IDJcbi8vICAgICAvLyAgIFgjIyAtPiA0ICAgICAgICAgICAgICAgICAwMDEgPSAxXG4vLyAgICAgLy8gVGhlIHVwc2hvdCBpcyB0aGF0IHdoZW4gcmVtb3ZpbmcgYW4gZWxlbWVudCB3ZSBvbmx5IG5lZWQgdG9cbi8vICAgICAvLyB1cGRhdGUgTyhsb2cobikpIGVsZW1lbnRzLi4uXG4vLyAgICAgLy8gQW5kIHdlIGNhbiBhdm9pZCBzcGxpY2luZyB0aGUgbGlzdCBhbmQgZXZlbiBmaW5kIHRoZSBmaXJzdFxuLy8gICAgIC8vIGVsZW1lbnQgd2l0aCBiaW5hcnkgc2VhcmNoIC0gTyhsb2cobikpXG4vLyAgICAgY29uc3QgaW5kZXggPSB0aGlzLm1hcC5nZXQoZWxlbSk7XG4vLyAgICAgaWYgKGluZGV4ID09IG51bGwpIHJldHVybjtcbi8vICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxKTtcbi8vICAgICB0aGlzLm1hcC5kZWxldGUoZWxlbSk7XG4vLyAgICAgZm9yIChsZXQgaSA9IGluZGV4OyBpIDwgdGhpcy5saXN0Lmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgICB0aGlzLm1hcC5zZXQodGhpcy5saXN0W2ldLCBpKTtcbi8vICAgICB9XG4vLyAgIH1cblxuLy8gICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbi8vICAgICByZXR1cm4gdGhpcy5saXN0W1N5bWJvbC5pdGVyYXRvcl0oKTtcbi8vICAgfVxuLy8gfVxuXG5leHBvcnQgY29uc3QgYnJlYWtMaW5lcyA9IChzdHI6IHN0cmluZywgbGVuOiBudW1iZXIpOiBzdHJpbmdbXSA9PiB7XG4gIHN0ciA9IHN0ci50cmltKCk7XG4gIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcbiAgd2hpbGUgKHN0ci5sZW5ndGggPiBsZW4pIHtcbiAgICBsZXQgYiA9IHN0ci5zdWJzdHJpbmcoMCwgbGVuKS5sYXN0SW5kZXhPZignICcpO1xuICAgIGlmIChiIDwgMCkgYiA9IGxlbjtcbiAgICBvdXQucHVzaChzdHIuc3Vic3RyaW5nKDAsIGIpLnRyaW0oKSk7XG4gICAgc3RyID0gc3RyLnN1YnN0cmluZyhiKS50cmltKCk7XG4gIH1cbiAgb3V0LnB1c2goc3RyLnRyaW0oKSk7XG4gIHJldHVybiBvdXQ7XG59O1xuXG5leHBvcnQgY2xhc3MgVXNhZ2VFcnJvciBleHRlbmRzIEVycm9yIHt9XG5cbmV4cG9ydCBjbGFzcyBTdWZmaXhUcmllPFQ+IHtcbiAgcmVhZG9ubHkgbmV4dCA9IG5ldyBNYXA8c3RyaW5nLCBTdWZmaXhUcmllPFQ+PigpO1xuICBkYXRhOiBUIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGtleTogc3RyaW5nID0gJycpIHt9XG5cbiAgZ2V0KGtleTogc3RyaW5nKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IHQ6IFN1ZmZpeFRyaWU8VD4gfCB1bmRlZmluZWQgPSB0aGlzO1xuICAgIGZvciAobGV0IGkgPSBrZXkubGVuZ3RoIC0gMTsgaSA+PSAwICYmIHQ7IGkrKykge1xuICAgICAgdCA9IHQubmV4dC5nZXQoa2V5W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHQgJiYgdC5kYXRhO1xuICB9XG5cbiAgd2l0aChjOiBzdHJpbmcpOiBTdWZmaXhUcmllPFQ+IHtcbiAgICBsZXQgdCA9IHRoaXMubmV4dC5nZXQoYyk7XG4gICAgaWYgKCF0KSB0aGlzLm5leHQuc2V0KGMsICh0ID0gbmV3IFN1ZmZpeFRyaWU8VD4oYyArIHRoaXMua2V5KSkpO1xuICAgIHJldHVybiB0O1xuICB9XG5cbiAgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogVCB8IHVuZGVmaW5lZCkge1xuICAgIGxldCB0OiBTdWZmaXhUcmllPFQ+ID0gdGhpcztcbiAgICBmb3IgKGxldCBpID0ga2V5Lmxlbmd0aCAtIDE7IGkgPj0gMCAmJiB0OyBpKyspIHtcbiAgICAgIHQgPSB0LndpdGgoa2V5W2ldKTtcbiAgICB9XG4gICAgdC5kYXRhID0gdmFsdWU7XG4gIH1cblxuICAqIHZhbHVlcygpOiBJdGVyYWJsZTxUPiB7XG4gICAgY29uc3Qgc3RhY2s6IFN1ZmZpeFRyaWU8VD5bXSA9IFt0aGlzXTtcbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSB7XG4gICAgICBjb25zdCB0b3AgPSBzdGFjay5wb3AoKSE7XG4gICAgICBpZiAodG9wLmRhdGEpIHlpZWxkIHRvcC5kYXRhO1xuICAgICAgc3RhY2sucHVzaCguLi50b3AubmV4dC52YWx1ZXMoKSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEZWZhdWx0TWFwPEssIFYgZXh0ZW5kcyB7fT4gZXh0ZW5kcyBNYXA8SywgVj4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHN1cHBsaWVyOiAoa2V5OiBLKSA9PiBWLFxuICAgICAgICAgICAgICBpbml0PzogSXRlcmFibGU8cmVhZG9ubHkgW0ssIFZdPikge1xuICAgIHN1cGVyKGluaXQgYXMgYW55KTsgLy8gTk9URTogTWFwJ3MgZGVjbGFyYXRpb25zIGFyZSBvZmYsIEl0ZXJhYmxlIGlzIGZpbmUuXG4gIH1cbiAgZ2V0KGtleTogSyk6IFYge1xuICAgIGxldCB2YWx1ZSA9IHN1cGVyLmdldChrZXkpO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSBzdXBlci5zZXQoa2V5LCB2YWx1ZSA9IHRoaXMuc3VwcGxpZXIoa2V5KSk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHNvcnRlZEtleXMoZm4/OiAoYTogSywgYjogSykgPT4gbnVtYmVyKTogS1tdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMua2V5cygpXS5zb3J0KGZuKTtcbiAgfVxuICBzb3J0ZWRFbnRyaWVzKGZuPzogKGE6IEssIGI6IEspID0+IG51bWJlcik6IEFycmF5PFtLLCBWXT4ge1xuICAgIHJldHVybiB0aGlzLnNvcnRlZEtleXMoZm4pLm1hcChrID0+IFtrLCB0aGlzLmdldChrKSBhcyBWXSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEluZGV4ZWRTZXQ8VCBleHRlbmRzIHt9PiB7XG4gIHByaXZhdGUgZm9yd2FyZDogVFtdID0gW107XG4gIHByaXZhdGUgcmV2ZXJzZSA9IG5ldyBNYXA8VCwgbnVtYmVyPigpO1xuXG4gIGFkZChlbGVtOiBUKTogbnVtYmVyIHtcbiAgICBsZXQgcmVzdWx0ID0gdGhpcy5yZXZlcnNlLmdldChlbGVtKTtcbiAgICBpZiAocmVzdWx0ID09IG51bGwpIHRoaXMucmV2ZXJzZS5zZXQoZWxlbSwgcmVzdWx0ID0gdGhpcy5mb3J3YXJkLnB1c2goZWxlbSkgLSAxKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2V0KGluZGV4OiBudW1iZXIpOiBUIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkW2luZGV4XTtcbiAgfVxufVxuXG5leHBvcnQgbmFtZXNwYWNlIGl0ZXJzIHtcbiAgLy8gQ29uY2F0ZW5hdGVzIGl0ZXJhYmxlcy5cbiAgZXhwb3J0IGZ1bmN0aW9uICogY29uY2F0PFQ+KC4uLml0ZXJzOiBBcnJheTxJdGVyYWJsZTxUPj4pOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+IHtcbiAgICBmb3IgKGNvbnN0IGl0ZXIgb2YgaXRlcnMpIHtcbiAgICAgIHlpZWxkICogaXRlcjtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gaXNFbXB0eShpdGVyOiBJdGVyYWJsZTx1bmtub3duPik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBCb29sZWFuKGl0ZXJbU3ltYm9sLml0ZXJhdG9yXSgpLm5leHQoKS5kb25lKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiAqIG1hcDxULCBVPihpdGVyOiBJdGVyYWJsZTxUPiwgZjogKGVsZW06IFQpID0+IFUpOiBJdGVyYWJsZUl0ZXJhdG9yPFU+IHtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgaXRlcikge1xuICAgICAgeWllbGQgZihlbGVtKTtcbiAgICB9XG4gIH1cbiAgZXhwb3J0IGZ1bmN0aW9uICogZmlsdGVyPFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+LCBmOiAoZWxlbTogVCkgPT4gYm9vbGVhbik6IEl0ZXJhYmxlPFQ+IHtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgaXRlcikge1xuICAgICAgaWYgKGYoZWxlbSkpIHlpZWxkIGVsZW07XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiAqIGZsYXRNYXA8VCwgVT4oaXRlcjogSXRlcmFibGU8VD4sIGY6IChlbGVtOiBUKSA9PiBJdGVyYWJsZTxVPik6IEl0ZXJhYmxlSXRlcmF0b3I8VT4ge1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBpdGVyKSB7XG4gICAgICB5aWVsZCAqIGYoZWxlbSk7XG4gICAgfVxuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBjb3VudChpdGVyOiBJdGVyYWJsZTx1bmtub3duPik6IG51bWJlciB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IF8gb2YgaXRlcikge1xuICAgICAgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uICogdGFrZTxUPihpdGVyOiBJdGVyYWJsZTxUPiwgY291bnQ6IG51bWJlcik6IEl0ZXJhYmxlSXRlcmF0b3I8VD4ge1xuICAgIGZvciAoY29uc3QgZWxlbSBvZiBpdGVyKSB7XG4gICAgICBpZiAoLS1jb3VudCA8IDApIHJldHVybjtcbiAgICAgIHlpZWxkIGVsZW07XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIGZpcnN0PFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+KTogVDtcbiAgZXhwb3J0IGZ1bmN0aW9uIGZpcnN0PFQ+KGl0ZXI6IEl0ZXJhYmxlPFQ+LCBmYWxsYmFjazogVCk6IFQ7XG4gIGV4cG9ydCBmdW5jdGlvbiBmaXJzdDxUPihpdGVyOiBJdGVyYWJsZTxUPiwgZmFsbGJhY2s/OiBUKTogVCB7XG4gICAgZm9yIChjb25zdCBlbGVtIG9mIGl0ZXIpIHJldHVybiBlbGVtO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikgdGhyb3cgbmV3IEVycm9yKGBFbXB0eSBpdGVyYWJsZTogJHtpdGVyfWApO1xuICAgIHJldHVybiBmYWxsYmFjayBhcyBUOyAgICBcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB6aXA8QSwgQj4obGVmdDogSXRlcmFibGU8QT4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IEl0ZXJhYmxlPEI+KTogSXRlcmFibGU8W0EsIEJdPjtcbiAgZXhwb3J0IGZ1bmN0aW9uIHppcDxBLCBCLCBDPihsZWZ0OiBJdGVyYWJsZTxBPiwgcmlnaHQ6IEl0ZXJhYmxlPEI+LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHppcHBlcjogKGE6IEEsIGI6IEIpID0+IEMpOiBJdGVyYWJsZTxDPjtcbiAgZXhwb3J0IGZ1bmN0aW9uIHppcDxBLCBCLCBDPihsZWZ0OiBJdGVyYWJsZTxBPiwgcmlnaHQ6IEl0ZXJhYmxlPEI+LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHppcHBlcjogKGE6IEEsIGI6IEIpID0+IEMgPSAoYSwgYikgPT4gW2EsIGJdIGFzIGFueSk6XG4gIEl0ZXJhYmxlPEM+IHtcbiAgICByZXR1cm4ge1xuICAgICAgKiBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICAgICAgY29uc3QgbGVmdEl0ZXIgPSBsZWZ0W1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgY29uc3QgcmlnaHRJdGVyID0gcmlnaHRbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgICAgICBsZXQgYSwgYjtcbiAgICAgICAgd2hpbGUgKChhID0gbGVmdEl0ZXIubmV4dCgpLCBiID0gcmlnaHRJdGVyLm5leHQoKSwgIWEuZG9uZSAmJiAhYi5kb25lKSkge1xuICAgICAgICAgIHlpZWxkIHppcHBlcihhLnZhbHVlLCBiLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwcmVhZDxUPihpdGVyOiBJdGVyYWJsZTxUPik6IFRbXSB7XG4gIHJldHVybiBbLi4uaXRlcl07XG59XG5cbi8qKiBBIHNldCBvZiBvYmplY3RzIHdpdGggdW5pcXVlIGxhYmVscyAoYmFzaWNhbGx5IHRvU3RyaW5nLWVxdWl2YWxlbmNlKS4gKi9cbmV4cG9ydCBjbGFzcyBMYWJlbGVkU2V0PFQgZXh0ZW5kcyBMYWJlbGVkPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFQ+IHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPFN0cmluZywgVD4oKTtcbiAgYWRkKGVsZW06IFQpIHtcbiAgICB0aGlzLm1hcC5zZXQoZWxlbS5sYWJlbCwgZWxlbSk7XG4gIH1cbiAgaGFzKGVsZW06IFQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzKGVsZW0ubGFiZWwpO1xuICB9XG4gIGRlbGV0ZShlbGVtOiBUKSB7XG4gICAgdGhpcy5tYXAuZGVsZXRlKGVsZW0ubGFiZWwpO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiB0aGlzLm1hcC52YWx1ZXMoKTtcbiAgfVxufVxuLyoqIFN1cGVyaW50ZXJmYWNlIGZvciBvYmplY3RzIHRoYXQgY2FuIGJlIHN0b3JlZCBpbiBhIExhYmVsZWRTZXQuICovXG5leHBvcnQgaW50ZXJmYWNlIExhYmVsZWQge1xuICByZWFkb25seSBsYWJlbDogc3RyaW5nO1xufVxuXG5jb25zdCBJTlZBTElEQVRFRCA9IFN5bWJvbCgnSW52YWxpZGF0ZWQnKTtcbmNvbnN0IFNJWkUgPSBTeW1ib2woJ1NpemUnKTtcblxuY2xhc3MgU2V0TXVsdGltYXBTZXRWaWV3PEssIFY+IGltcGxlbWVudHMgU2V0PFY+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBvd25lck1hcDogTWFwPEssIFNldDxWPj4sXG4gICAgICAgICAgICAgIHByaXZhdGUgcmVhZG9ubHkgb3duZXJLZXk6IEssIHByaXZhdGUgY3VycmVudFNldD86IFNldDxWPikge31cbiAgcHJpdmF0ZSBnZXRDdXJyZW50U2V0KCkge1xuICAgIGlmICghdGhpcy5jdXJyZW50U2V0IHx8ICh0aGlzLmN1cnJlbnRTZXQgYXMgYW55KVtJTlZBTElEQVRFRF0pIHtcbiAgICAgIHRoaXMuY3VycmVudFNldCA9IHRoaXMub3duZXJNYXAuZ2V0KHRoaXMub3duZXJLZXkpIHx8IG5ldyBTZXQ8Vj4oKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFNldDtcbiAgfVxuICBwcml2YXRlIG11dGF0ZVNldDxSPihmOiAoczogU2V0PFY+KSA9PiBSKTogUiB7XG4gICAgY29uc3Qgc2V0ID0gdGhpcy5nZXRDdXJyZW50U2V0KCk7XG4gICAgY29uc3Qgc2l6ZSA9IHNldC5zaXplO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZihzZXQpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAodGhpcy5vd25lck1hcCBhcyBhbnkpW1NJWkVdICs9IHNldC5zaXplIC0gc2l6ZTtcbiAgICAgIGlmICghc2V0LnNpemUpIHtcbiAgICAgICAgdGhpcy5vd25lck1hcC5kZWxldGUodGhpcy5vd25lcktleSk7XG4gICAgICAgIChzZXQgYXMgYW55KVtJTlZBTElEQVRFRF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBhZGQoZWxlbTogVik6IHRoaXMge1xuICAgIHRoaXMubXV0YXRlU2V0KHMgPT4gcy5hZGQoZWxlbSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIGhhcyhlbGVtOiBWKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q3VycmVudFNldCgpLmhhcyhlbGVtKTtcbiAgfVxuICBjbGVhcigpOiB2b2lkIHtcbiAgICB0aGlzLm11dGF0ZVNldChzID0+IHMuY2xlYXIoKSk7XG4gIH1cbiAgZGVsZXRlKGVsZW06IFYpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5tdXRhdGVTZXQocyA9PiBzLmRlbGV0ZShlbGVtKSk7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxWPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q3VycmVudFNldCgpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxuICB2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxWPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q3VycmVudFNldCgpLnZhbHVlcygpO1xuICB9XG4gIGtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxWPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q3VycmVudFNldCgpLmtleXMoKTtcbiAgfVxuICBlbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W1YsIFZdPiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0Q3VycmVudFNldCgpLmVudHJpZXMoKTtcbiAgfVxuICBmb3JFYWNoPFQ+KGNhbGxiYWNrOiAodmFsdWU6IFYsIGtleTogViwgc2V0OiBTZXQ8Vj4pID0+IHZvaWQsIHRoaXNBcmc/OiBUKTogdm9pZCB7XG4gICAgdGhpcy5nZXRDdXJyZW50U2V0KCkuZm9yRWFjaChjYWxsYmFjaywgdGhpc0FyZyk7XG4gIH1cbiAgZ2V0IHNpemUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5nZXRDdXJyZW50U2V0KCkuc2l6ZTtcbiAgfVxuICBnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ1NldCc7XG4gIH1cbn1cbi8vIEZpeCAnaW5zdGFuY2VvZicgdG8gd29yayBwcm9wZXJseSB3aXRob3V0IHJlcXVpcmluZyBhY3R1YWwgc3VwZXJjbGFzcy4uLlxuUmVmbGVjdC5zZXRQcm90b3R5cGVPZihTZXRNdWx0aW1hcFNldFZpZXcucHJvdG90eXBlLCBTZXQucHJvdG90eXBlKTtcblxuZXhwb3J0IGNsYXNzIFNldE11bHRpbWFwPEssIFY+IHtcblxuICBwcml2YXRlIHJlYWRvbmx5IG1hcCA9IG5ldyBNYXA8SywgU2V0PFY+PigpO1xuXG4gIGNvbnN0cnVjdG9yKGVudHJpZXM6IEl0ZXJhYmxlPHJlYWRvbmx5IFtLLCBWXT4gPSBbXSkge1xuICAgICh0aGlzLm1hcCBhcyBhbnkpW1NJWkVdID0gMDtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBlbnRyaWVzKSB7XG4gICAgICB0aGlzLmFkZChrLCB2KTtcbiAgICB9XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiAodGhpcy5tYXAgYXMgYW55KVtTSVpFXTtcbiAgfVxuXG4gIGdldChrOiBLKTogU2V0PFY+IHtcbiAgICByZXR1cm4gbmV3IFNldE11bHRpbWFwU2V0Vmlldyh0aGlzLm1hcCwgaywgdGhpcy5tYXAuZ2V0KGspKTtcbiAgfVxuXG4gIGFkZChrOiBLLCB2OiBWKTogdm9pZCB7XG4gICAgbGV0IHNldCA9IHRoaXMubWFwLmdldChrKTtcbiAgICBpZiAoIXNldCkgdGhpcy5tYXAuc2V0KGssIHNldCA9IG5ldyBTZXQoKSk7XG4gICAgY29uc3Qgc2l6ZSA9IHNldC5zaXplO1xuICAgIHNldC5hZGQodik7XG4gICAgKHRoaXMubWFwIGFzIGFueSlbU0laRV0gKz0gc2V0LnNpemUgLSBzaXplO1xuICB9XG5cbiAgLy8gVE9ETyAtIGl0ZXJhdGlvbj9cbn1cblxuXG5leHBvcnQgY2xhc3MgTXVsdGlzZXQ8VD4gaW1wbGVtZW50cyBJdGVyYWJsZTxbVCwgbnVtYmVyXT4ge1xuICBwcml2YXRlIGVudHJpZXM6IERlZmF1bHRNYXA8VCwgbnVtYmVyPjtcbiAgY29uc3RydWN0b3IoZW50cmllczogSXRlcmFibGU8W1QsIG51bWJlcl0+ID0gW10pIHtcbiAgICB0aGlzLmVudHJpZXMgPSBuZXcgRGVmYXVsdE1hcCgoKSA9PiAwLCBlbnRyaWVzKTtcbiAgfVxuICBhZGQoZWxlbTogVCkge1xuICAgIHRoaXMuZW50cmllcy5zZXQoZWxlbSwgdGhpcy5lbnRyaWVzLmdldChlbGVtKSArIDEpO1xuICB9XG4gIGRlbGV0ZShlbGVtOiBUKSB7XG4gICAgY29uc3QgY291bnQgPSB0aGlzLmVudHJpZXMuZ2V0KGVsZW0pIC0gMTtcbiAgICBpZiAoY291bnQgPiAwKSB7XG4gICAgICB0aGlzLmVudHJpZXMuc2V0KGVsZW0sIGNvdW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbnRyaWVzLmRlbGV0ZShlbGVtKTtcbiAgICB9XG4gIH1cbiAgdW5pcXVlKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuZW50cmllcy5zaXplO1xuICB9XG4gIGNvdW50KGVsZW06IFQpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmVudHJpZXMuaGFzKGVsZW0pID8gdGhpcy5lbnRyaWVzLmdldChlbGVtKSA6IDA7XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxbVCwgbnVtYmVyXT4ge1xuICAgIHJldHVybiB0aGlzLmVudHJpZXMuZW50cmllcygpO1xuICB9XG59XG5cblxuLy8gZXhwb3J0IGNsYXNzIFNwYXJzZUFycmF5PFQ+IGltcGxlbWVudHMgSXRlcmFibGU8VD4ge1xuLy8gICByZWFkb25seSBbaWQ6IG51bWJlcl06IFQ7IC8vIE5PVEU6IHJlYWRvbmx5IGlzIG9ubHkgZm9yIGV4dGVybmFsIVxuLy8gICBwcml2YXRlIGVsZW1lbnRzID0gbmV3IE1hcDxudW1iZXIsIFQ+KCk7XG5cbi8vICAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7IHJldHVybiB0aGlzLmVsZW1lbnRzLnZhbHVlcygpOyB9XG5cbi8vICAgcHJvdGVjdGVkIHNldChpZDogbnVtYmVyLCB2YWx1ZTogVCkge1xuLy8gICAgICh0aGlzIGFzIHtbaWQ6IG51bWJlcl06IFR9KVtpZF0gPSB2YWx1ZTtcbi8vICAgICB0aGlzLmVsZW1lbnRzLnNldChpZCwgdmFsdWUpO1xuLy8gICB9XG4vLyAgIGRlbGV0ZShpZDogbnVtYmVyKSB7XG4vLyAgICAgZGVsZXRlICh0aGlzIGFzIHtbaWQ6IG51bWJlcl06IFR9KVtpZF07XG4vLyAgICAgdGhpcy5lbGVtZW50cy5kZWxldGUoaWQpO1xuLy8gICB9XG4vLyB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydE5ldmVyKHg6IG5ldmVyKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IoYG5vbi1leGhhdXN0aXZlIGNoZWNrOiAke3h9YCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnQ8VD4oeDogVHx1bmRlZmluZWR8bnVsbCk6IFQge1xuICBpZiAoIXgpIHRocm93IG5ldyBFcnJvcihgYXNzZXJ0ZWQgYnV0IGZhbHN5OiAke3h9YCk7XG4gIHJldHVybiB4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOb25OdWxsPFQgZXh0ZW5kcyB7fT4oeDogVHx1bmRlZmluZWR8bnVsbCk6IHggaXMgVCB7XG4gIHJldHVybiB4ICE9IG51bGw7XG59XG4vLyBleHBvcnQgZnVuY3Rpb24gbm9uTnVsbDxUIGV4dGVuZHMge30+KHg6IFR8dW5kZWZpbmVkfG51bGwpOiBUIHtcbi8vICAgaWYgKHggIT0gbnVsbCkgcmV0dXJuIHg7XG4vLyAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgbm9uLW51bGxgKTtcbi8vIH1cblxuXG4vLyBHZW5lcmFsaXplZCBtZW1vaXphdGlvbiB3cmFwcGVyLiAgQWxsIGFyZ3VtZW50cyBtdXN0IGJlIG9iamVjdHMsXG4vLyBidXQgYW55IG51bWJlciBvZiBhcmd1bWVudHMgaXMgYWxsb3dlZC5cbnR5cGUgRjxBIGV4dGVuZHMgYW55W10sIFI+ID0gKC4uLmFyZ3M6IEEpID0+IFI7XG5leHBvcnQgZnVuY3Rpb24gbWVtb2l6ZTxUIGV4dGVuZHMgb2JqZWN0W10sIFI+KGY6IEY8VCwgUj4pOiBGPFQsIFI+IHtcbiAgaW50ZXJmYWNlIFYge1xuICAgIG5leHQ/OiBXZWFrTWFwPGFueSwgVj47XG4gICAgdmFsdWU/OiBSO1xuICAgIGNhY2hlZD86IGJvb2xlYW47XG4gIH1cbiAgY29uc3QgY2FjaGU6IFYgPSB7fTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHRoaXM6IGFueSwgLi4uYXJnczogYW55W10pIHtcbiAgICBsZXQgYyA9IGNhY2hlO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmICghYy5uZXh0KSBjLm5leHQgPSBuZXcgV2Vha01hcDxhbnksIFY+KCk7XG4gICAgICBsZXQgbmV4dCA9IChjLm5leHQgfHwgKGMubmV4dCA9IG5ldyBXZWFrTWFwKCkpKS5nZXQoYXJnKTtcbiAgICAgIGlmICghbmV4dCkgYy5uZXh0LnNldChhcmcsIG5leHQgPSB7fSk7XG4gICAgfVxuICAgIGlmICghYy5jYWNoZWQpIHtcbiAgICAgIGMudmFsdWUgPSBmLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgYy5jYWNoZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gYy52YWx1ZSBhcyBSO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyY21wKGxlZnQ6IHN0cmluZywgcmlnaHQ6IHN0cmluZyk6IG51bWJlciB7XG4gIGlmIChsZWZ0IDwgcmlnaHQpIHJldHVybiAtMTtcbiAgaWYgKHJpZ2h0IDwgbGVmdCkgcmV0dXJuIDE7XG4gIHJldHVybiAwO1xufVxuXG4vLyBleHBvcnQgY2xhc3MgUHJpbWVJZEdlbmVyYXRvciB7XG4vLyAgIHByaXZhdGUgX2luZGV4ID0gMDtcbi8vICAgbmV4dCgpOiBudW1iZXIge1xuLy8gICAgIGlmICh0aGlzLl9pbmRleCA+PSBQUklNRVMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ292ZXJmbG93Jyk7XG4vLyAgICAgcmV0dXJuIFBSSU1FU1t0aGlzLl9pbmRleCsrXTtcbi8vICAgfVxuLy8gfVxuLy8gY29uc3QgUFJJTUVTID0gKCgpID0+IHtcbi8vICAgY29uc3QgbiA9IDEwMDAwO1xuLy8gICBjb25zdCBvdXQgPSBuZXcgU2V0KCk7XG4vLyAgIGZvciAobGV0IGkgPSAyOyBpIDwgbjsgaSsrKSB7IG91dC5hZGQoaSk7IH1cbi8vICAgZm9yIChsZXQgaSA9IDI7IGkgKiBpIDwgbjsgaSsrKSB7XG4vLyAgICAgaWYgKCFvdXQuaGFzKGkpKSBjb250aW51ZTtcbi8vICAgICBmb3IgKGxldCBqID0gMiAqIGk7IGogPCBuOyBqICs9IGkpIHtcbi8vICAgICAgIG91dC5kZWxldGUoaik7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIHJldHVybiBbLi4ub3V0XTtcbi8vIH0pKCk7XG5cbmV4cG9ydCBjbGFzcyBLZXllZDxLIGV4dGVuZHMgbnVtYmVyLCBWPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFtLLCBWXT4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGRhdGE6IHJlYWRvbmx5IFZbXSkge31cblxuICBnZXQoaW5kZXg6IEspOiBWfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtpbmRleF07XG4gIH1cblxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhLmVudHJpZXMoKSBhcyBJdGVyYWJsZUl0ZXJhdG9yPFtLLCBWXT47XG4gIH1cblxuICB2YWx1ZXMoKTogSXRlcmF0b3I8Vj4ge1xuICAgIHJldHVybiB0aGlzLmRhdGFbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBcnJheU1hcDxLIGV4dGVuZHMgbnVtYmVyLCBWPiBpbXBsZW1lbnRzIEl0ZXJhYmxlPFtLLCBWXT4ge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgcmV2OiBSZWFkb25seU1hcDxWLCBLPjtcbiAgcmVhZG9ubHkgbGVuZ3RoOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBkYXRhOiByZWFkb25seSBWW10pIHtcbiAgICBjb25zdCByZXYgPSBuZXcgTWFwPFYsIEs+KCk7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgSzsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJldi5zZXQoZGF0YVtpXSwgaSk7XG4gICAgfVxuICAgIHRoaXMucmV2ID0gcmV2O1xuICAgIHRoaXMubGVuZ3RoID0gZGF0YS5sZW5ndGg7XG4gIH1cblxuICBnZXQoaW5kZXg6IEspOiBWfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtpbmRleF07XG4gIH1cblxuICBoYXNWYWx1ZSh2YWx1ZTogVik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnJldi5oYXModmFsdWUpO1xuICB9XG5cbiAgaW5kZXgodmFsdWU6IFYpOiBLfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLnJldi5nZXQodmFsdWUpO1xuICAgIGlmIChpbmRleCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaW5kZXggZm9yICR7dmFsdWV9YCk7XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YS5lbnRyaWVzKCkgYXMgSXRlcmFibGVJdGVyYXRvcjxbSywgVl0+O1xuICB9XG5cbiAgdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Vj4ge1xuICAgIHJldHVybiB0aGlzLmRhdGFbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNdXRhYmxlQXJyYXlCaU1hcDxLIGV4dGVuZHMgbnVtYmVyLCBWIGV4dGVuZHMgbnVtYmVyPiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2Z3ZDogVltdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgX3JldjogS1tdID0gW107XG5cbiAgKiBbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFtLLCBWXT4ge1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEs7IGkgPCB0aGlzLl9md2QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHZhbCA9IHRoaXMuX2Z3ZFtpXTtcbiAgICAgIGlmICh2YWwgIT0gbnVsbCkgeWllbGQgW2ksIHZhbF07XG4gICAgfVxuICB9XG5cbiAgKiBrZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8Sz4ge1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEs7IGkgPCB0aGlzLl9md2QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLl9md2RbaV0gIT0gbnVsbCkgeWllbGQgaTtcbiAgICB9XG4gIH1cblxuICAqIHZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFY+IHtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBWOyBpIDwgdGhpcy5fcmV2Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5fcmV2W2ldICE9IG51bGwpIHlpZWxkIGk7XG4gICAgfVxuICB9XG5cbiAgZ2V0KGluZGV4OiBLKTogVnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9md2RbaW5kZXhdO1xuICB9XG5cbiAgaGFzKGtleTogSyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9md2Rba2V5XSAhPSBudWxsO1xuICB9XG5cbiAgaGFzVmFsdWUodmFsdWU6IFYpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fcmV2W3ZhbHVlXSAhPSBudWxsO1xuICB9XG5cbiAgaW5kZXgodmFsdWU6IFYpOiBLfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9yZXZbdmFsdWVdO1xuICAgIGlmIChpbmRleCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaW5kZXggZm9yICR7dmFsdWV9YCk7XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG5cbiAgc2V0KGtleTogSywgdmFsdWU6IFYpIHtcbiAgICBpZiAodGhpcy5fZndkW2tleV0pIHRocm93IG5ldyBFcnJvcihgYWxyZWFkeSBoYXMga2V5ICR7a2V5fWApO1xuICAgIGlmICh0aGlzLl9yZXZbdmFsdWVdKSB0aHJvdyBuZXcgRXJyb3IoYGFscmVhZHkgaGFzIHZhbHVlICR7dmFsdWV9YCk7XG4gICAgdGhpcy5fZndkW2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9yZXZbdmFsdWVdID0ga2V5O1xuICB9XG5cbiAgcmVwbGFjZShrZXk6IEssIHZhbHVlOiBWKTogVnx1bmRlZmluZWQge1xuICAgIGNvbnN0IG9sZEtleSA9IHRoaXMuX3Jldlt2YWx1ZV07XG4gICAgaWYgKG9sZEtleSAhPSBudWxsKSBkZWxldGUgdGhpcy5fZndkW29sZEtleV07XG4gICAgY29uc3Qgb2xkVmFsdWUgPSB0aGlzLl9md2Rba2V5XTtcbiAgICBpZiAob2xkVmFsdWUgIT0gbnVsbCkgZGVsZXRlIHRoaXMuX3JldltvbGRWYWx1ZV07XG4gICAgdGhpcy5fZndkW2tleV0gPSB2YWx1ZTtcbiAgICB0aGlzLl9yZXZbdmFsdWVdID0ga2V5O1xuICAgIHJldHVybiBvbGRWYWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGFibGU8UiwgQywgVj4gaW1wbGVtZW50cyBJdGVyYWJsZTxbUiwgQywgVl0+e1xuICBwcml2YXRlIHJlYWRvbmx5IF9tYXAgPSBuZXcgTWFwPFIsIE1hcDxDLCBWPj4oKTtcbiAgY29uc3RydWN0b3IoZWxlbXM/OiBJdGVyYWJsZTxyZWFkb25seSBbUiwgQywgVl0+KSB7XG4gICAgaWYgKGVsZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IFtyLCBjLCB2XSBvZiBlbGVtcykge1xuICAgICAgICB0aGlzLnNldChyLCBjLCB2KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAqIFtTeW1ib2wuaXRlcmF0b3JdKCk6IEdlbmVyYXRvcjxbUiwgQywgVl0+IHtcbiAgICBmb3IgKGNvbnN0IFtyLCBtYXBdIG9mIHRoaXMuX21hcCkge1xuICAgICAgZm9yIChjb25zdCBbYywgdl0gb2YgbWFwKSB7XG4gICAgICAgIHlpZWxkIFtyLCBjLCB2XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzZXQocjogUiwgYzogQywgdjogVikge1xuICAgIGxldCBjb2wgPSB0aGlzLl9tYXAuZ2V0KHIpO1xuICAgIGlmICghY29sKSB0aGlzLl9tYXAuc2V0KHIsIGNvbCA9IG5ldyBNYXAoKSk7XG4gICAgY29sLnNldChjLCB2KTtcbiAgfVxuXG4gIGdldChyOiBSLCBjOiBDKTogVnx1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KHIpPy5nZXQoYyk7XG4gIH1cblxuICBoYXMocjogUiwgYzogQyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9tYXAuZ2V0KHIpPy5oYXMoYykgfHwgZmFsc2U7XG4gIH1cblxuICBkZWxldGUocjogUiwgYzogQyk6IHZvaWQge1xuICAgIGNvbnN0IGNvbCA9IHRoaXMuX21hcC5nZXQocik7XG4gICAgaWYgKCFjb2wpIHJldHVybjtcbiAgICBjb2wuZGVsZXRlKGMpO1xuICAgIGlmICghY29sLnNpemUpIHRoaXMuX21hcC5kZWxldGUocik7XG4gIH1cblxuICByb3cocjogUik6IFJlYWRvbmx5TWFwPEMsIFY+IHtcbiAgICByZXR1cm4gdGhpcy5fbWFwLmdldChyKSA/PyBuZXcgTWFwKCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdChmbXQ6IHN0cmluZywgLi4uYXJnczogdW5rbm93bltdKTogc3RyaW5nIHtcbiAgY29uc3Qgc3BsaXQgPSBmbXQuc3BsaXQoLyUvZyk7XG4gIGxldCBhcmdJbmRleCA9IDA7XG4gIGxldCBvdXQgPSBzcGxpdFswXTtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBzcGxpdC5sZW5ndGg7IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIHtcbiAgICAgIG91dCArPSAnJScgKyBzcGxpdFsrK2ldO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IG1hdGNoID0gLyhbLStdKikoWzBcXERdPykoXFxkKikoW2R4c10pLy5leGVjKHNwbGl0W2ldKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICBvdXQgKz0gYXJnc1thcmdJbmRleCsrXSArIHNwbGl0W2ldO1xuICAgICAgY29udGludWU7XG4gICAgfSBcbiAgICBjb25zdCBsZW4gPSBwYXJzZUludChtYXRjaFszXSkgfHwgMDtcbiAgICBjb25zdCBwYWQgPSBtYXRjaFsyXSB8fCAnICc7XG4gICAgY29uc3QgYXJnID0gYXJnc1thcmdJbmRleCsrXTtcbiAgICBsZXQgc3RyID0gbWF0Y2hbNF0gPT09ICd4JyA/IE51bWJlcihhcmcpLnRvU3RyaW5nKDE2KSA6IFN0cmluZyhhcmcpO1xuICAgIGlmIChtYXRjaFs0XSAhPT0gJ3MnICYmIC9cXCsvLnRlc3QobWF0Y2hbMV0pICYmIE51bWJlcihhcmcpID49IDApIHtcbiAgICAgIHN0ciA9ICcrJyArIHN0cjtcbiAgICB9XG4gICAgaWYgKHN0ci5sZW5ndGggPCBsZW4pIHtcbiAgICAgIGNvbnN0IHBhZGRpbmcgPSBwYWQucmVwZWF0KGxlbiAtIHN0ci5sZW5ndGgpO1xuICAgICAgc3RyID0gLy0vLnRlc3QobWF0Y2hbMV0pID8gc3RyICsgcGFkZGluZyA6IHBhZGRpbmcgKyBzdHI7XG4gICAgfVxuICAgIG91dCArPSBzdHIgKyBzcGxpdFtpXS5zdWJzdHJpbmcobWF0Y2hbMF0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vLyBjYW5jZWxsYXRpb25cblxuZXhwb3J0IGludGVyZmFjZSBDYW5jZWxUb2tlblJlZ2lzdHJhdGlvbiB7XG4gIHVucmVnaXN0ZXIoKTogdm9pZDtcbn1cbmNsYXNzIENhbmNlbFRva2VuUmVnIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgY2FsbGJhY2s6ICgpID0+IHZvaWQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHNvdXJjZTogQ2FuY2VsVG9rZW5Tb3VyY2UpIHt9XG4gIHVucmVnaXN0ZXIoKSB7IHRoaXMuc291cmNlLnVucmVnaXN0ZXIodGhpcyk7IH1cbn1cbmV4cG9ydCBjbGFzcyBDYW5jZWxUb2tlblNvdXJjZSB7XG4gIHJlYWRvbmx5IHRva2VuOiBDYW5jZWxUb2tlbjtcbiAgcHJpdmF0ZSBjYW5jZWxsZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWdpc3RyYXRpb25zID0gbmV3IFNldDxDYW5jZWxUb2tlblJlZz4oKTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBjb25zdCBzb3VyY2UgPSB0aGlzO1xuICAgIHRoaXMudG9rZW4gPSB7XG4gICAgICBnZXQgcmVxdWVzdGVkKCkgeyByZXR1cm4gc291cmNlLmNhbmNlbGxlZDsgfSxcbiAgICAgIHRocm93SWZSZXF1ZXN0ZWQoKSB7XG4gICAgICAgIGlmIChzb3VyY2UuY2FuY2VsbGVkKSB0aHJvdyBuZXcgRXJyb3IoYENhbmNlbGxlZGApO1xuICAgICAgfSxcbiAgICAgIHJlZ2lzdGVyKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIGNvbnN0IHJlZyA9IG5ldyBDYW5jZWxUb2tlblJlZyhjYWxsYmFjaywgc291cmNlKTtcbiAgICAgICAgc291cmNlLnJlZ2lzdHJhdGlvbnMuYWRkKHJlZyk7XG4gICAgICAgIHJldHVybiByZWc7XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvLyBUT0RPIC0gcGFyZW50L2NoaWxkP1xuXG4gIGNhbmNlbCgpIHtcbiAgICBpZiAodGhpcy5jYW5jZWxsZWQpIHJldHVybjtcbiAgICB0aGlzLmNhbmNlbGxlZCA9IHRydWU7XG4gICAgY29uc3QgcmVncyA9IFsuLi50aGlzLnJlZ2lzdHJhdGlvbnNdO1xuICAgIHRoaXMucmVnaXN0cmF0aW9ucy5jbGVhcigpO1xuICAgIGZvciAoY29uc3QgcmVnIG9mIHJlZ3MpIHtcbiAgICAgIHJlZy5jYWxsYmFjaygpO1xuICAgIH1cbiAgfVxuXG4gIHVucmVnaXN0ZXIocmVnOiBDYW5jZWxUb2tlblJlZykge1xuICAgIHRoaXMucmVnaXN0cmF0aW9ucy5kZWxldGUocmVnKTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENhbmNlbFRva2VuIHtcbiAgcmVhZG9ubHkgcmVxdWVzdGVkOiBib29sZWFuO1xuICB0aHJvd0lmUmVxdWVzdGVkKCk6IHZvaWQ7XG4gIHJlZ2lzdGVyKGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogQ2FuY2VsVG9rZW5SZWdpc3RyYXRpb247XG59XG5leHBvcnQgbmFtZXNwYWNlIENhbmNlbFRva2VuIHtcbiAgZXhwb3J0IGNvbnN0IE5PTkU6IENhbmNlbFRva2VuID0ge1xuICAgIGdldCByZXF1ZXN0ZWQoKSB7IHJldHVybiBmYWxzZTsgfSxcbiAgICB0aHJvd0lmUmVxdWVzdGVkKCkge30sXG4gICAgcmVnaXN0ZXIoKSB7IHJldHVybiB7dW5yZWdpc3RlcigpIHt9fTsgfSxcbiAgfTtcbiAgZXhwb3J0IGNvbnN0IENBTkNFTExFRDogQ2FuY2VsVG9rZW4gPSB7XG4gICAgZ2V0IHJlcXVlc3RlZCgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgdGhyb3dJZlJlcXVlc3RlZCgpIHsgdGhyb3cgbmV3IEVycm9yKCdjYW5jZWxsZWQnKTsgfSxcbiAgICByZWdpc3RlcigpIHsgcmV0dXJuIHt1bnJlZ2lzdGVyKCkge319OyB9LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbG93ZXJDYW1lbFRvV29yZHMobG93ZXJDYW1lbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgc3BsaXQgPSBsb3dlckNhbWVsLnNwbGl0KC8oPz1bQS1aMC05XSkvZyk7XG4gIHJldHVybiBzcGxpdC5tYXAocyA9PiBzWzBdLnRvVXBwZXJDYXNlKCkgKyBzLnN1YnN0cmluZygxKSkuam9pbignICcpO1xufVxuXG4vLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIEEgc3RyaW5nLXRvLVYgbWFwIHRoYXQgY2FuIGJlIHVzZWQgZWl0aGVyIGNhc2Utc2Vuc2l0aXZlbHlcbiAqIG9yIGNhc2UtaW5zZW5zaXRpdmVseS5cbiAqL1xuZXhwb3J0IGNsYXNzIENhc2VNYXA8Vj4ge1xuICBzID0gbmV3IE1hcDxzdHJpbmcsIFY+KCk7XG4gIGkgPSBuZXcgTWFwPHN0cmluZywgVj4oKTtcbiAgc2Vuc2l0aXZlID0gdHJ1ZTtcblxuICBzZXQoa2V5OiBzdHJpbmcsIHZhbDogVikge1xuICAgIGNvbnN0IGtpID0ga2V5ID0ga2V5LnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKHRoaXMuc2Vuc2l0aXZlKSB7XG4gICAgICAvLyBUT0RPIC0gY2hlY2shXG4gICAgICB0aGlzLnMuc2V0KGtleSwgdmFsKTtcbiAgICAgIHRoaXMuaS5zZXQoa2ksIHZhbCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRUeXBlPFQ+KGFjdHVhbDogVCk6IHZvaWQge31cblxuZXhwb3J0IGZ1bmN0aW9uIGhleDEoeDogbnVtYmVyLCBkaWdpdHMgPSAxKTogc3RyaW5nIHtcbiAgcmV0dXJuIHggPCAwID8gYH4keyh+eCkudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KGRpZ2l0cywgJzAnKX1gIDpcbiAgICAgIHgudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KGRpZ2l0cywgJzAnKTtcbn1cbiJdfQ==