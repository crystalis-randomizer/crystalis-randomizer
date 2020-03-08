import { IntervalSet, SparseByteArray, binaryInsert } from './util.js';
import { Expr } from './expr.js';
import { Segment } from './module.js';
import { Token } from './token.js';
export class Linker {
    constructor() {
        this._link = new Link();
    }
    static link(...files) {
        const linker = new Linker();
        for (const file of files) {
            linker.read(file);
        }
        return linker.link();
    }
    read(file) {
        this._link.readFile(file);
        return this;
    }
    base(data, offset = 0) {
        this._link.base(data, offset);
        return this;
    }
    link() {
        return this._link.link();
    }
    report() {
        this._link.report();
    }
    exports() {
        if (this._exports)
            return this._exports;
        return this._exports = this._link.buildExports();
    }
}
function fail(msg) {
    throw new Error(msg);
}
class LinkSegment {
    constructor(segment) {
        var _a, _b, _c, _d, _e;
        const name = this.name = segment.name;
        this.bank = (_a = segment.bank, (_a !== null && _a !== void 0 ? _a : 0));
        this.addressing = (_b = segment.addressing, (_b !== null && _b !== void 0 ? _b : 2));
        this.size = (_c = segment.size, (_c !== null && _c !== void 0 ? _c : fail(`Size must be specified: ${name}`)));
        this.offset = (_d = segment.offset, (_d !== null && _d !== void 0 ? _d : fail(`OFfset must be specified: ${name}`)));
        this.memory = (_e = segment.memory, (_e !== null && _e !== void 0 ? _e : fail(`OFfset must be specified: ${name}`)));
    }
    get delta() { return this.offset - this.memory; }
}
class LinkChunk {
    constructor(linker, index, chunk, chunkOffset, symbolOffset) {
        this.linker = linker;
        this.index = index;
        this.subs = new Set();
        this.selfSubs = new Set();
        this.deps = new Set();
        this.imports = new Set();
        this.follow = new Map();
        this.overlaps = false;
        this.name = chunk.name;
        this.size = chunk.data.length;
        this.segments = chunk.segments;
        this._data = chunk.data;
        for (const sub of chunk.subs || []) {
            this.subs.add(translateSub(sub, chunkOffset, symbolOffset));
        }
        this.asserts = (chunk.asserts || [])
            .map(e => translateExpr(e, chunkOffset, symbolOffset));
        if (chunk.org)
            this._org = chunk.org;
    }
    get org() { return this._org; }
    get offset() { return this._offset; }
    get segment() { return this._segment; }
    get data() { var _a; return _a = this._data, (_a !== null && _a !== void 0 ? _a : fail('no data')); }
    initialPlacement() {
        if (this._org == null)
            return;
        const eligibleSegments = [];
        for (const name of this.segments) {
            const s = this.linker.segments.get(name);
            if (!s)
                throw new Error(`Unknown segment: ${name}`);
            if (this._org >= s.memory && this._org < s.memory + s.size) {
                eligibleSegments.push(s);
            }
        }
        if (eligibleSegments.length !== 1) {
            throw new Error(`Non-unique segment: ${eligibleSegments}`);
        }
        const segment = eligibleSegments[0];
        if (this._org >= segment.memory + segment.size) {
            throw new Error(`Chunk does not fit in segment ${segment.name}`);
        }
        this.place(this._org, segment);
    }
    place(org, segment) {
        var _a;
        this._org = org;
        this._segment = segment;
        const offset = this._offset = org + segment.delta;
        const full = this.linker.data;
        const data = (_a = this._data, (_a !== null && _a !== void 0 ? _a : fail(`No data`)));
        this._data = undefined;
        if (this.subs.size) {
            full.splice(offset, data.length);
            const sparse = new SparseByteArray();
            sparse.set(0, data);
            for (const sub of this.subs) {
                sparse.splice(sub.offset, sub.size);
            }
            for (const [start, chunk] of sparse.chunks()) {
                full.set(offset + start, ...chunk);
            }
        }
        else {
            full.set(offset, data);
        }
        for (const [sub, chunk] of this.follow) {
            chunk.resolveSub(sub, false);
        }
        this.linker.free.delete(this.offset, this.offset + this.size);
    }
    resolveSubs(initial = false) {
        for (const sub of this.selfSubs) {
            this.resolveSub(sub, initial);
        }
        for (const sub of this.subs) {
            this.resolveSub(sub, initial);
        }
    }
    addDep(sub, dep) {
        if (dep === this.index && this.subs.delete(sub))
            this.selfSubs.add(sub);
        this.linker.chunks[dep].follow.set(sub, this);
        this.deps.add(dep);
    }
    resolveSub(sub, initial) {
        var _a, _b;
        if (!this.subs.has(sub) && !this.selfSubs.has(sub))
            return;
        sub.expr = Expr.traverse(sub.expr, (e, rec, p) => {
            var _a, _b;
            if (initial && ((_a = p) === null || _a === void 0 ? void 0 : _a.op) === '^' && p.args.length === 1 && e.meta) {
                if (e.meta.bank == null) {
                    this.addDep(sub, e.meta.chunk);
                }
                return e;
            }
            e = this.linker.resolveLink(Expr.evaluate(rec(e)));
            if (initial && ((_b = e.meta) === null || _b === void 0 ? void 0 : _b.rel))
                this.addDep(sub, e.meta.chunk);
            return e;
        });
        let del = false;
        if (sub.expr.op === 'num' && !((_a = sub.expr.meta) === null || _a === void 0 ? void 0 : _a.rel)) {
            this.writeValue(sub.offset, sub.expr.num, sub.size);
            del = true;
        }
        else if (sub.expr.op === '.move') {
            if (sub.expr.args.length !== 1)
                throw new Error(`bad .move`);
            const child = sub.expr.args[0];
            if (child.op === 'num' && ((_b = child.meta) === null || _b === void 0 ? void 0 : _b.offset) != null) {
                const start = child.meta.offset + child.num;
                const slice = this.linker.orig.slice(start, start + sub.size);
                this.writeBytes(sub.offset, Uint8Array.from(slice));
                del = true;
            }
        }
        if (del) {
            this.subs.delete(sub) || this.selfSubs.delete(sub);
            if (!this.subs.size) {
                if (this.linker.unresolvedChunks.delete(this)) {
                    this.linker.insertResolved(this);
                }
            }
        }
    }
    writeBytes(offset, bytes) {
        if (this._data) {
            this._data.subarray(offset, offset + bytes.length).set(bytes);
        }
        else if (this._offset != null) {
            this.linker.data.set(this._offset + offset, bytes);
        }
        else {
            throw new Error(`Impossible`);
        }
    }
    writeValue(offset, val, size) {
        const bits = (size) << 3;
        if (val != null && (val < (-1 << bits) || val >= (1 << bits))) {
            const name = ['byte', 'word', 'farword', 'dword'][size - 1];
            throw new Error(`Not a ${name}: $${val.toString(16)}`);
        }
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            bytes[i] = val & 0xff;
            val >>= 8;
        }
        this.writeBytes(offset, bytes);
    }
}
function translateSub(s, dc, ds) {
    s = { ...s };
    s.expr = translateExpr(s.expr, dc, ds);
    return s;
}
function translateExpr(e, dc, ds) {
    var _a;
    e = { ...e };
    if (e.meta)
        e.meta = { ...e.meta };
    if (e.args)
        e.args = e.args.map(a => translateExpr(a, dc, ds));
    if (((_a = e.meta) === null || _a === void 0 ? void 0 : _a.chunk) != null)
        e.meta.chunk += dc;
    if (e.op === 'sym' && e.num != null)
        e.num += ds;
    return e;
}
function translateSymbol(s, dc, ds) {
    s = { ...s };
    if (s.expr)
        s.expr = translateExpr(s.expr, dc, ds);
    return s;
}
class Link {
    constructor() {
        this.data = new SparseByteArray();
        this.orig = new SparseByteArray();
        this.exports = new Map();
        this.chunks = [];
        this.symbols = [];
        this.free = new IntervalSet();
        this.rawSegments = new Map();
        this.segments = new Map();
        this.resolvedChunks = [];
        this.unresolvedChunks = new Set();
    }
    insertResolved(chunk) {
        binaryInsert(this.resolvedChunks, c => c.size, chunk);
    }
    base(data, offset = 0) {
        this.data.set(offset, data);
        this.orig.set(offset, data);
    }
    readFile(file) {
        const dc = this.chunks.length;
        const ds = this.symbols.length;
        for (const segment of file.segments || []) {
            this.addRawSegment(segment);
        }
        for (const chunk of file.chunks || []) {
            const lc = new LinkChunk(this, this.chunks.length, chunk, dc, ds);
            this.chunks.push(lc);
        }
        for (const symbol of file.symbols || []) {
            this.symbols.push(translateSymbol(symbol, dc, ds));
        }
    }
    resolveLink(expr) {
        var _a, _b, _c, _d, _e;
        if (expr.op === '.orig' && ((_a = expr.args) === null || _a === void 0 ? void 0 : _a.length) === 1) {
            const child = expr.args[0];
            const offset = (_b = child.meta) === null || _b === void 0 ? void 0 : _b.offset;
            if (offset != null) {
                const num = this.orig.get(offset + child.num);
                if (num != null)
                    return { op: 'num', num };
            }
        }
        else if (expr.op === 'num' && ((_c = expr.meta) === null || _c === void 0 ? void 0 : _c.chunk) != null) {
            const meta = expr.meta;
            const chunk = this.chunks[meta.chunk];
            if (chunk.org !== meta.org ||
                ((_d = chunk.segment) === null || _d === void 0 ? void 0 : _d.bank) !== meta.bank ||
                chunk.offset !== meta.offset) {
                const meta2 = {
                    org: chunk.org,
                    offset: chunk.offset,
                    bank: (_e = chunk.segment) === null || _e === void 0 ? void 0 : _e.bank,
                };
                expr = Expr.evaluate({ ...expr, meta: { ...meta, ...meta2 } });
            }
        }
        return expr;
    }
    resolveExpr(expr) {
        var _a;
        expr = Expr.traverse(expr, (e, rec) => {
            return this.resolveLink(Expr.evaluate(rec(e)));
        });
        if (expr.op === 'num' && !((_a = expr.meta) === null || _a === void 0 ? void 0 : _a.rel))
            return expr.num;
        const at = Token.at(expr);
        throw new Error(`Unable to fully resolve expr${at}`);
    }
    link() {
        for (const [name, segments] of this.rawSegments) {
            let s = segments[0];
            for (let i = 1; i < segments.length; i++) {
                s = Segment.merge(s, segments[i]);
            }
            this.segments.set(name, new LinkSegment(s));
        }
        for (const [name, segments] of this.rawSegments) {
            const s = this.segments.get(name);
            for (const segment of segments) {
                const free = segment.free;
                for (const [start, end] of free || []) {
                    this.free.add(start + s.delta, end + s.delta);
                    this.data.splice(start + s.delta, end - start);
                }
            }
        }
        for (const chunk of this.chunks) {
            chunk.initialPlacement();
        }
        for (let i = 0; i < this.symbols.length; i++) {
            const symbol = this.symbols[i];
            if (!symbol.expr)
                throw new Error(`Symbol ${i} never resolved`);
            if (symbol.export != null) {
                this.exports.set(symbol.export, i);
            }
        }
        for (const symbol of this.symbols) {
            symbol.expr = this.resolveSymbols(symbol.expr);
        }
        for (const chunk of this.chunks) {
            for (const sub of [...chunk.subs, ...chunk.selfSubs]) {
                sub.expr = this.resolveSymbols(sub.expr);
            }
            for (let i = 0; i < chunk.asserts.length; i++) {
                chunk.asserts[i] = this.resolveSymbols(chunk.asserts[i]);
            }
        }
        for (const c of this.chunks) {
            c.resolveSubs(true);
        }
        const chunks = [...this.chunks];
        chunks.sort((a, b) => b.size - a.size);
        for (const chunk of chunks) {
            chunk.resolveSubs();
            if (chunk.subs.size) {
                this.unresolvedChunks.add(chunk);
            }
            else {
                this.insertResolved(chunk);
            }
        }
        let count = this.resolvedChunks.length + 2 * this.unresolvedChunks.size;
        while (count) {
            const c = this.resolvedChunks.pop();
            if (c) {
                this.placeChunk(c);
            }
            else {
                const [first] = this.unresolvedChunks;
                for (const dep of first.deps) {
                    const chunk = this.chunks[dep];
                    if (chunk.org == null)
                        this.placeChunk(chunk);
                }
            }
            const next = this.resolvedChunks.length + 2 * this.unresolvedChunks.size;
            if (next === count) {
                console.error(this.resolvedChunks, this.unresolvedChunks);
                throw new Error(`Not making progress`);
            }
            count = next;
        }
        const patch = new SparseByteArray();
        for (const c of this.chunks) {
            for (const a of c.asserts) {
                const v = this.resolveExpr(a);
                if (v)
                    continue;
                const at = Token.at(a);
                throw new Error(`Assertion failed${at}`);
            }
            if (c.overlaps)
                continue;
            patch.set(c.offset, ...this.data.slice(c.offset, c.offset + c.size));
        }
        return patch;
    }
    placeChunk(chunk) {
        if (chunk.org != null)
            return;
        const size = chunk.size;
        if (!chunk.subs.size && !chunk.selfSubs.size) {
            const pattern = this.data.pattern(chunk.data);
            for (const name of chunk.segments) {
                const segment = this.segments.get(name);
                const start = segment.offset;
                const end = start + segment.size;
                const index = pattern.search(start, end);
                if (index < 0)
                    continue;
                chunk.place(index - segment.delta, segment);
                chunk.overlaps = true;
                return;
            }
        }
        for (const name of chunk.segments) {
            const segment = this.segments.get(name);
            const s0 = segment.offset;
            const s1 = s0 + segment.size;
            let found;
            let smallest = Infinity;
            for (const [f0, f1] of this.free.tail(s0)) {
                if (f0 >= s1)
                    break;
                const df = Math.min(f1, s1) - f0;
                if (df < size)
                    continue;
                if (df < smallest) {
                    found = f0;
                    smallest = df;
                }
            }
            if (found != null) {
                chunk.place(found - segment.delta, segment);
                return;
            }
        }
        console.log(`After filling:`);
        this.report();
        const name = chunk.name ? `${chunk.name} ` : '';
        console.log(this.segments.get(chunk.segments[0]));
        throw new Error(`Could not find space for ${size}-byte chunk ${name}in ${chunk.segments.join(', ')}`);
    }
    resolveSymbols(expr) {
        return Expr.traverse(expr, (e, rec) => {
            while (e.op === 'im' || e.op === 'sym') {
                if (e.op === 'im') {
                    const name = e.sym;
                    const imported = this.exports.get(name);
                    if (imported == null) {
                        const at = Token.at(expr);
                        throw new Error(`Symbol never exported ${name}${at}`);
                    }
                    e = this.symbols[imported].expr;
                }
                else {
                    if (e.num == null)
                        throw new Error(`Symbol not global`);
                    e = this.symbols[e.num].expr;
                }
            }
            return Expr.evaluate(rec(e));
        });
    }
    addRawSegment(segment) {
        let list = this.rawSegments.get(segment.name);
        if (!list)
            this.rawSegments.set(segment.name, list = []);
        list.push(segment);
    }
    buildExports() {
        var _a, _b;
        const map = new Map();
        for (const symbol of this.symbols) {
            if (!symbol.export)
                continue;
            const e = Expr.traverse(symbol.expr, (e, rec) => {
                return this.resolveLink(Expr.evaluate(rec(e)));
            });
            if (e.op !== 'num')
                throw new Error(`never resolved: ${symbol.export}`);
            const value = e.num;
            const out = { value };
            if (((_a = e.meta) === null || _a === void 0 ? void 0 : _a.offset) != null && e.meta.org != null) {
                out.offset = e.meta.offset + value - e.meta.org;
            }
            if (((_b = e.meta) === null || _b === void 0 ? void 0 : _b.bank) != null)
                out.bank = e.meta.bank;
            map.set(symbol.export, out);
        }
        return map;
    }
    report() {
        for (const [s, e] of this.free) {
            console.log(`Free: ${s.toString(16)}..${e.toString(16)}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFnQixPQUFPLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFTakMsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFTVSxVQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQXlCN0IsQ0FBQztJQWpDQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBZTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBS0QsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBZ0IsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTTtRQUNKLElBQUks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bnRlcnZhbFNldCwgU3BhcnNlQnl0ZUFycmF5LCBiaW5hcnlJbnNlcnR9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge0V4cHJ9IGZyb20gJy4vZXhwci5qcyc7XG5pbXBvcnQge0NodW5rLCBNb2R1bGUsIFNlZ21lbnQsIFN1YnN0aXR1dGlvbiwgU3ltYm9sfSBmcm9tICcuL21vZHVsZS5qcyc7XG5pbXBvcnQge1Rva2VufSBmcm9tICcuL3Rva2VuLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnQge1xuICB2YWx1ZTogbnVtYmVyO1xuICBvZmZzZXQ/OiBudW1iZXI7XG4gIGJhbms/OiBudW1iZXI7XG4gIC8vc2VnbWVudD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIExpbmtlciB7XG4gIHN0YXRpYyBsaW5rKC4uLmZpbGVzOiBNb2R1bGVbXSk6IFNwYXJzZUJ5dGVBcnJheSB7XG4gICAgY29uc3QgbGlua2VyID0gbmV3IExpbmtlcigpO1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgbGlua2VyLnJlYWQoZmlsZSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5rZXIubGluaygpO1xuICB9XG5cbiAgcHJpdmF0ZSBfbGluayA9IG5ldyBMaW5rKCk7XG4gIHByaXZhdGUgX2V4cG9ydHM/OiBNYXA8c3RyaW5nLCBFeHBvcnQ+O1xuXG4gIHJlYWQoZmlsZTogTW9kdWxlKTogTGlua2VyIHtcbiAgICB0aGlzLl9saW5rLnJlYWRGaWxlKGZpbGUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYmFzZShkYXRhOiBVaW50OEFycmF5LCBvZmZzZXQgPSAwKTogTGlua2VyIHtcbiAgICB0aGlzLl9saW5rLmJhc2UoZGF0YSwgb2Zmc2V0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpbmsoKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICByZXR1cm4gdGhpcy5fbGluay5saW5rKCk7XG4gIH1cblxuICByZXBvcnQoKSB7XG4gICAgdGhpcy5fbGluay5yZXBvcnQoKTtcbiAgfVxuXG4gIGV4cG9ydHMoKTogTWFwPHN0cmluZywgRXhwb3J0PiB7XG4gICAgaWYgKHRoaXMuX2V4cG9ydHMpIHJldHVybiB0aGlzLl9leHBvcnRzO1xuICAgIHJldHVybiB0aGlzLl9leHBvcnRzID0gdGhpcy5fbGluay5idWlsZEV4cG9ydHMoKTtcbiAgfVxufVxuXG5leHBvcnQgbmFtZXNwYWNlIExpbmtlciB7XG4gIGV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gICAgXG5cbiAgfVxufVxuXG4vLyBUT0RPIC0gbGluay10aW1lIG9ubHkgZnVuY3Rpb24gZm9yIGdldHRpbmcgZWl0aGVyIHRoZSBvcmlnaW5hbCBvciB0aGVcbi8vICAgICAgICBwYXRjaGVkIGJ5dGUuICBXb3VsZCBhbGxvdyBlLmcuIGNvcHkoJDgwMDAsICQyMDAwLCBcIjFlXCIpIHRvIG1vdmVcbi8vICAgICAgICBhIGJ1bmNoIG9mIGNvZGUgYXJvdW5kIHdpdGhvdXQgZXhwbGljaXRseSBjb3B5LXBhc3RpbmcgaXQgaW4gdGhlXG4vLyAgICAgICAgYXNtIHBhdGNoLlxuXG4vLyBUcmFja3MgYW4gZXhwb3J0LlxuLy8gaW50ZXJmYWNlIEV4cG9ydCB7XG4vLyAgIGNodW5rczogU2V0PG51bWJlcj47XG4vLyAgIHN5bWJvbDogbnVtYmVyO1xuLy8gfVxuXG5mdW5jdGlvbiBmYWlsKG1zZzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbn1cblxuY2xhc3MgTGlua1NlZ21lbnQge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGJhbms6IG51bWJlcjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICByZWFkb25seSBvZmZzZXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgbWVtb3J5OiBudW1iZXI7XG4gIHJlYWRvbmx5IGFkZHJlc3Npbmc6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzZWdtZW50OiBTZWdtZW50KSB7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMubmFtZSA9IHNlZ21lbnQubmFtZTtcbiAgICB0aGlzLmJhbmsgPSBzZWdtZW50LmJhbmsgPz8gMDtcbiAgICB0aGlzLmFkZHJlc3NpbmcgPSBzZWdtZW50LmFkZHJlc3NpbmcgPz8gMjtcbiAgICB0aGlzLnNpemUgPSBzZWdtZW50LnNpemUgPz8gZmFpbChgU2l6ZSBtdXN0IGJlIHNwZWNpZmllZDogJHtuYW1lfWApO1xuICAgIHRoaXMub2Zmc2V0ID0gc2VnbWVudC5vZmZzZXQgPz8gZmFpbChgT0Zmc2V0IG11c3QgYmUgc3BlY2lmaWVkOiAke25hbWV9YCk7XG4gICAgdGhpcy5tZW1vcnkgPSBzZWdtZW50Lm1lbW9yeSA/PyBmYWlsKGBPRmZzZXQgbXVzdCBiZSBzcGVjaWZpZWQ6ICR7bmFtZX1gKTtcbiAgfVxuXG4gIC8vIG9mZnNldCA9IG9yZyArIGRlbHRhXG4gIGdldCBkZWx0YSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5vZmZzZXQgLSB0aGlzLm1lbW9yeTsgfVxufVxuXG5jbGFzcyBMaW5rQ2h1bmsge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gIHNlZ21lbnRzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgYXNzZXJ0czogRXhwcltdO1xuXG4gIHN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcbiAgc2VsZlN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcblxuICAvKiogR2xvYmFsIElEcyBvZiBjaHVua3MgbmVlZGVkIHRvIGxvY2F0ZSBiZWZvcmUgd2UgY2FuIGNvbXBsZXRlIHRoaXMgb25lLiAqL1xuICBkZXBzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8qKiBTeW1ib2xzIHRoYXQgYXJlIGltcG9ydGVkIGludG8gdGhpcyBjaHVuayAodGhlc2UgYXJlIGFsc28gZGVwcykuICovXG4gIGltcG9ydHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgLy8gLyoqIFN5bWJvbHMgdGhhdCBhcmUgZXhwb3J0ZWQgZnJvbSB0aGlzIGNodW5rLiAqL1xuICAvLyBleHBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9sbG93ID0gbmV3IE1hcDxTdWJzdGl0dXRpb24sIExpbmtDaHVuaz4oKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY2h1bmsgaXMgcGxhY2VkIG92ZXJsYXBwaW5nIHdpdGggc29tZXRoaW5nIGVsc2UuXG4gICAqIE92ZXJsYXBzIGFyZW4ndCB3cml0dGVuIHRvIHRoZSBwYXRjaC5cbiAgICovXG4gIG92ZXJsYXBzID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBfZGF0YT86IFVpbnQ4QXJyYXk7XG5cbiAgcHJpdmF0ZSBfb3JnPzogbnVtYmVyO1xuICBwcml2YXRlIF9vZmZzZXQ/OiBudW1iZXI7XG4gIHByaXZhdGUgX3NlZ21lbnQ/OiBMaW5rU2VnbWVudDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsaW5rZXI6IExpbmssXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgIGNodW5rOiBDaHVuazxVaW50OEFycmF5PixcbiAgICAgICAgICAgICAgY2h1bmtPZmZzZXQ6IG51bWJlcixcbiAgICAgICAgICAgICAgc3ltYm9sT2Zmc2V0OiBudW1iZXIpIHtcbiAgICB0aGlzLm5hbWUgPSBjaHVuay5uYW1lO1xuICAgIHRoaXMuc2l6ZSA9IGNodW5rLmRhdGEubGVuZ3RoO1xuICAgIHRoaXMuc2VnbWVudHMgPSBjaHVuay5zZWdtZW50cztcbiAgICB0aGlzLl9kYXRhID0gY2h1bmsuZGF0YTtcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzIHx8IFtdKSB7XG4gICAgICB0aGlzLnN1YnMuYWRkKHRyYW5zbGF0ZVN1YihzdWIsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICB9XG4gICAgdGhpcy5hc3NlcnRzID0gKGNodW5rLmFzc2VydHMgfHwgW10pXG4gICAgICAgIC5tYXAoZSA9PiB0cmFuc2xhdGVFeHByKGUsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICBpZiAoY2h1bmsub3JnKSB0aGlzLl9vcmcgPSBjaHVuay5vcmc7XG4gIH1cblxuICBnZXQgb3JnKCkgeyByZXR1cm4gdGhpcy5fb3JnOyB9XG4gIGdldCBvZmZzZXQoKSB7IHJldHVybiB0aGlzLl9vZmZzZXQ7IH1cbiAgZ2V0IHNlZ21lbnQoKSB7IHJldHVybiB0aGlzLl9zZWdtZW50OyB9XG4gIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YSA/PyBmYWlsKCdubyBkYXRhJyk7IH1cblxuICBpbml0aWFsUGxhY2VtZW50KCkge1xuICAgIC8vIEludmFyaWFudDogZXhhY3RseSBvbmUgb2YgKGRhdGEpIG9yIChvcmcsIF9vZmZzZXQsIF9zZWdtZW50KSBpcyBwcmVzZW50LlxuICAgIC8vIElmIChvcmcsIC4uLikgZmlsbGVkIGluIHRoZW4gd2UgdXNlIGxpbmtlci5kYXRhIGluc3RlYWQuXG4gICAgLy8gV2UgZG9uJ3QgY2FsbCB0aGlzIGluIHRoZSBjdG9yIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiBhbGwgdGhlIHNlZ21lbnRzXG4gICAgLy8gYmVpbmcgbG9hZGVkLCBidXQgaXQncyB0aGUgZmlyc3QgdGhpbmcgd2UgZG8gaW4gbGluaygpLlxuICAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuO1xuICAgIGNvbnN0IGVsaWdpYmxlU2VnbWVudHM6IExpbmtTZWdtZW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5zZWdtZW50cykge1xuICAgICAgY29uc3QgcyA9IHRoaXMubGlua2VyLnNlZ21lbnRzLmdldChuYW1lKTtcbiAgICAgIGlmICghcykgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHNlZ21lbnQ6ICR7bmFtZX1gKTtcbiAgICAgIGlmICh0aGlzLl9vcmcgPj0gcy5tZW1vcnkgJiYgdGhpcy5fb3JnIDwgcy5tZW1vcnkgKyBzLnNpemUpIHtcbiAgICAgICAgZWxpZ2libGVTZWdtZW50cy5wdXNoKHMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZWxpZ2libGVTZWdtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBzZWdtZW50OiAke2VsaWdpYmxlU2VnbWVudHN9YCk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnQgPSBlbGlnaWJsZVNlZ21lbnRzWzBdO1xuICAgIGlmICh0aGlzLl9vcmcgPj0gc2VnbWVudC5tZW1vcnkgKyBzZWdtZW50LnNpemUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2h1bmsgZG9lcyBub3QgZml0IGluIHNlZ21lbnQgJHtzZWdtZW50Lm5hbWV9YCk7XG4gICAgfVxuICAgIHRoaXMucGxhY2UodGhpcy5fb3JnLCBzZWdtZW50KTtcbiAgfVxuXG4gIHBsYWNlKG9yZzogbnVtYmVyLCBzZWdtZW50OiBMaW5rU2VnbWVudCkge1xuICAgIHRoaXMuX29yZyA9IG9yZztcbiAgICB0aGlzLl9zZWdtZW50ID0gc2VnbWVudDtcbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLl9vZmZzZXQgPSBvcmcgKyBzZWdtZW50LmRlbHRhO1xuICAgIC8vIENvcHkgZGF0YSwgbGVhdmluZyBvdXQgYW55IGhvbGVzXG4gICAgY29uc3QgZnVsbCA9IHRoaXMubGlua2VyLmRhdGE7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuX2RhdGEgPz8gZmFpbChgTm8gZGF0YWApO1xuICAgIHRoaXMuX2RhdGEgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAodGhpcy5zdWJzLnNpemUpIHtcbiAgICAgIGZ1bGwuc3BsaWNlKG9mZnNldCwgZGF0YS5sZW5ndGgpO1xuICAgICAgY29uc3Qgc3BhcnNlID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAgICAgc3BhcnNlLnNldCgwLCBkYXRhKTtcbiAgICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc3Vicykge1xuICAgICAgICBzcGFyc2Uuc3BsaWNlKHN1Yi5vZmZzZXQsIHN1Yi5zaXplKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW3N0YXJ0LCBjaHVua10gb2Ygc3BhcnNlLmNodW5rcygpKSB7XG4gICAgICAgIGZ1bGwuc2V0KG9mZnNldCArIHN0YXJ0LCAuLi5jaHVuayk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGwuc2V0KG9mZnNldCwgZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gUmV0cnkgdGhlIGZvbGxvdy1vbnNcbiAgICBmb3IgKGNvbnN0IFtzdWIsIGNodW5rXSBvZiB0aGlzLmZvbGxvdykge1xuICAgICAgY2h1bmsucmVzb2x2ZVN1YihzdWIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpbmtlci5mcmVlLmRlbGV0ZSh0aGlzLm9mZnNldCEsIHRoaXMub2Zmc2V0ISArIHRoaXMuc2l6ZSk7XG4gIH1cblxuICByZXNvbHZlU3Vicyhpbml0aWFsID0gZmFsc2UpIHsgLy86IE1hcDxudW1iZXIsIFN1YnN0aXR1dGlvbltdPiB7XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdWJzLCBzZWUgd2hhdCBwcm9ncmVzIHdlIGNhbiBtYWtlP1xuICAgIC8vIHJlc3VsdDogbGlzdCBvZiBkZXBlbmRlbnQgY2h1bmtzLlxuXG4gICAgLy8gTk9URTogaWYgd2UgZGVwZW5kIG9uIG91cnNlbGYgdGhlbiB3ZSB3aWxsIHJldHVybiBlbXB0eSBkZXBzLFxuICAgIC8vICAgICAgIGFuZCBtYXkgYmUgcGxhY2VkIGltbWVkaWF0ZWx5LCBidXQgd2lsbCBzdGlsbCBoYXZlIGhvbGVzLlxuICAgIC8vICAgICAgLSBOTywgaXQncyByZXNwb25zaWJpbGl0eSBvZiBjYWxsZXIgdG8gY2hlY2sgdGhhdFxuICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc2VsZlN1YnMpIHtcbiAgICAgIHRoaXMucmVzb2x2ZVN1YihzdWIsIGluaXRpYWwpO1xuICAgIH1cblxuICAgIC8vIGNvbnN0IGRlcHMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5zdWJzKSB7XG4gICAgICAvLyBjb25zdCBzdWJEZXBzID0gXG4gICAgICB0aGlzLnJlc29sdmVTdWIoc3ViLCBpbml0aWFsKTtcbiAgICAgIC8vIGlmICghc3ViRGVwcykgY29udGludWU7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcCBvZiBzdWJEZXBzKSB7XG4gICAgICAvLyAgIGxldCBzdWJzID0gZGVwcy5nZXQoZGVwKTtcbiAgICAgIC8vICAgaWYgKCFzdWJzKSBkZXBzLnNldChkZXAsIHN1YnMgPSBbXSk7XG4gICAgICAvLyAgIHN1YnMucHVzaChzdWIpO1xuICAgICAgLy8gfVxuICAgIH1cbiAgICAvLyBpZiAodGhpcy5vcmcgIT0gbnVsbCkgcmV0dXJuIG5ldyBTZXQoKTtcbiAgICAvLyByZXR1cm4gZGVwcztcbiAgfVxuXG4gIGFkZERlcChzdWI6IFN1YnN0aXR1dGlvbiwgZGVwOiBudW1iZXIpIHtcbiAgICBpZiAoZGVwID09PSB0aGlzLmluZGV4ICYmIHRoaXMuc3Vicy5kZWxldGUoc3ViKSkgdGhpcy5zZWxmU3Vicy5hZGQoc3ViKTtcbiAgICB0aGlzLmxpbmtlci5jaHVua3NbZGVwXS5mb2xsb3cuc2V0KHN1YiwgdGhpcyk7XG4gICAgdGhpcy5kZXBzLmFkZChkZXApO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGxpc3Qgb2YgZGVwZW5kZW50IGNodW5rcywgb3IgdW5kZWZpbmVkIGlmIHN1Y2Nlc3NmdWwuXG4gIHJlc29sdmVTdWIoc3ViOiBTdWJzdGl0dXRpb24sIGluaXRpYWw6IGJvb2xlYW4pIHsgLy86IEl0ZXJhYmxlPG51bWJlcj58dW5kZWZpbmVkIHtcblxuICAgIC8vIFRPRE8gLSByZXNvbHZlKHJlc29sdmVyKSB2aWEgY2h1bmtEYXRhIHRvIHJlc29sdmUgYmFua3MhIVxuXG5cbiAgICAvLyBEbyBhIGZ1bGwgdHJhdmVyc2Ugb2YgdGhlIGV4cHJlc3Npb24gLSBzZWUgd2hhdCdzIGJsb2NraW5nIHVzLlxuICAgIGlmICghdGhpcy5zdWJzLmhhcyhzdWIpICYmICF0aGlzLnNlbGZTdWJzLmhhcyhzdWIpKSByZXR1cm47XG4gICAgc3ViLmV4cHIgPSBFeHByLnRyYXZlcnNlKHN1Yi5leHByLCAoZSwgcmVjLCBwKSA9PiB7XG4gICAgICAvLyBGaXJzdCBoYW5kbGUgbW9zdCBjb21tb24gYmFuayBieXRlIGNhc2UsIHNpbmNlIGl0IHRyaWdnZXJzIG9uIGFcbiAgICAgIC8vIGRpZmZlcmVudCB0eXBlIG9mIHJlc29sdXRpb24uXG4gICAgICBpZiAoaW5pdGlhbCAmJiBwPy5vcCA9PT0gJ14nICYmIHAuYXJncyEubGVuZ3RoID09PSAxICYmIGUubWV0YSkge1xuICAgICAgICBpZiAoZS5tZXRhLmJhbmsgPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwKHN1YiwgZS5tZXRhLmNodW5rISk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGU7IC8vIHNraXAgcmVjdXJzaW9uIGVpdGhlciB3YXkuXG4gICAgICB9XG4gICAgICBlID0gdGhpcy5saW5rZXIucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICAgIGlmIChpbml0aWFsICYmIGUubWV0YT8ucmVsKSB0aGlzLmFkZERlcChzdWIsIGUubWV0YS5jaHVuayEpO1xuICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG5cbiAgICAvLyBQUk9CTEVNIC0gb2ZmIGlzIHJlbGF0aXZlIHRvIHRoZSBjaHVuaywgYnV0IHdlIHdhbnQgdG8gYmUgYWJsZSB0b1xuICAgIC8vIHNwZWNpZnkgYW4gQUJTT0xVVEUgb3JnIHdpdGhpbiBhIHNlZ21lbnQuLi4hXG4gICAgLy8gQW4gYWJzb2x1dGUgb2Zmc2V0IHdpdGhpbiB0aGUgd2hvbGUgb3JpZyBpcyBubyBnb29kLCBlaXRoZXJcbiAgICAvLyB3YW50IHRvIHdyaXRlIGl0IGFzIC5zZWdtZW50IFwiZm9vXCI7IFN5bSA9ICQxMjM0XG4gICAgLy8gQ291bGQgYWxzbyBqdXN0IGRvIC5tb3ZlIGNvdW50LCBcInNlZ1wiLCAkMTIzNCBhbmQgc3RvcmUgYSBzcGVjaWFsIG9wXG4gICAgLy8gdGhhdCB1c2VzIGJvdGggc3ltIGFuZCBudW0/XG5cbiAgICAvLyBTZWUgaWYgd2UgY2FuIGRvIGl0IGltbWVkaWF0ZWx5LlxuICAgIGxldCBkZWwgPSBmYWxzZTtcbiAgICBpZiAoc3ViLmV4cHIub3AgPT09ICdudW0nICYmICFzdWIuZXhwci5tZXRhPy5yZWwpIHtcbiAgICAgIHRoaXMud3JpdGVWYWx1ZShzdWIub2Zmc2V0LCBzdWIuZXhwci5udW0hLCBzdWIuc2l6ZSk7XG4gICAgICBkZWwgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3ViLmV4cHIub3AgPT09ICcubW92ZScpIHtcbiAgICAgIGlmIChzdWIuZXhwci5hcmdzIS5sZW5ndGggIT09IDEpIHRocm93IG5ldyBFcnJvcihgYmFkIC5tb3ZlYCk7XG4gICAgICBjb25zdCBjaGlsZCA9IHN1Yi5leHByLmFyZ3MhWzBdO1xuICAgICAgaWYgKGNoaWxkLm9wID09PSAnbnVtJyAmJiBjaGlsZC5tZXRhPy5vZmZzZXQgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBzdGFydCA9IGNoaWxkLm1ldGEhLm9mZnNldCEgKyBjaGlsZC5udW0hO1xuICAgICAgICBjb25zdCBzbGljZSA9IHRoaXMubGlua2VyLm9yaWcuc2xpY2Uoc3RhcnQsIHN0YXJ0ICsgc3ViLnNpemUpO1xuICAgICAgICB0aGlzLndyaXRlQnl0ZXMoc3ViLm9mZnNldCwgVWludDhBcnJheS5mcm9tKHNsaWNlKSk7XG4gICAgICAgIGRlbCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkZWwpIHtcbiAgICAgIHRoaXMuc3Vicy5kZWxldGUoc3ViKSB8fCB0aGlzLnNlbGZTdWJzLmRlbGV0ZShzdWIpO1xuICAgICAgaWYgKCF0aGlzLnN1YnMuc2l6ZSkgeyAvLyBORVc6IGlnbm9yZXMgc2VsZi1zdWJzIG5vd1xuICAgICAgLy8gaWYgKCF0aGlzLnN1YnMuc2l6ZSB8fCAoZGVwcy5zaXplID09PSAxICYmIGRlcHMuaGFzKHRoaXMuaW5kZXgpKSkgIHtcbiAgICAgICAgLy8gYWRkIHRvIHJlc29sdmVkIHF1ZXVlIC0gcmVhZHkgdG8gYmUgcGxhY2VkIVxuICAgICAgICAvLyBRdWVzdGlvbjogc2hvdWxkIHdlIHBsYWNlIGl0IHJpZ2h0IGF3YXk/ICBXZSBwbGFjZSB0aGUgZml4ZWQgY2h1bmtzXG4gICAgICAgIC8vIGltbWVkaWF0ZWx5IGluIHRoZSBjdG9yLCBidXQgdGhlcmUncyBubyBjaG9pY2UgdG8gZGVmZXIuICBGb3IgcmVsb2NcbiAgICAgICAgLy8gY2h1bmtzLCBpdCdzIGJldHRlciB0byB3YWl0IHVudGlsIHdlJ3ZlIHJlc29sdmVkIGFzIG11Y2ggYXMgcG9zc2libGVcbiAgICAgICAgLy8gYmVmb3JlIHBsYWNpbmcgYW55dGhpbmcuICBGb3J0dW5hdGVseSwgcGxhY2luZyBhIGNodW5rIHdpbGxcbiAgICAgICAgLy8gYXV0b21hdGljYWxseSByZXNvbHZlIGFsbCBkZXBzIG5vdyFcbiAgICAgICAgaWYgKHRoaXMubGlua2VyLnVucmVzb2x2ZWRDaHVua3MuZGVsZXRlKHRoaXMpKSB7XG4gICAgICAgICAgdGhpcy5saW5rZXIuaW5zZXJ0UmVzb2x2ZWQodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB3cml0ZUJ5dGVzKG9mZnNldDogbnVtYmVyLCBieXRlczogVWludDhBcnJheSkge1xuICAgIGlmICh0aGlzLl9kYXRhKSB7XG4gICAgICB0aGlzLl9kYXRhLnN1YmFycmF5KG9mZnNldCwgb2Zmc2V0ICsgYnl0ZXMubGVuZ3RoKS5zZXQoYnl0ZXMpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fb2Zmc2V0ICE9IG51bGwpIHtcbiAgICAgIHRoaXMubGlua2VyLmRhdGEuc2V0KHRoaXMuX29mZnNldCArIG9mZnNldCwgYnl0ZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGVgKTtcbiAgICB9XG4gIH1cblxuICB3cml0ZVZhbHVlKG9mZnNldDogbnVtYmVyLCB2YWw6IG51bWJlciwgc2l6ZTogbnVtYmVyKSB7XG4gICAgLy8gVE9ETyAtIHRoaXMgaXMgYWxtb3N0IGVudGlyZWx5IGNvcGllZCBmcm9tIHByb2Nlc3NvciB3cml0ZU51bWJlclxuICAgIGNvbnN0IGJpdHMgPSAoc2l6ZSkgPDwgMztcbiAgICBpZiAodmFsICE9IG51bGwgJiYgKHZhbCA8ICgtMSA8PCBiaXRzKSB8fCB2YWwgPj0gKDEgPDwgYml0cykpKSB7XG4gICAgICBjb25zdCBuYW1lID0gWydieXRlJywgJ3dvcmQnLCAnZmFyd29yZCcsICdkd29yZCddW3NpemUgLSAxXTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IGEgJHtuYW1lfTogJCR7dmFsLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShzaXplKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgYnl0ZXNbaV0gPSB2YWwgJiAweGZmO1xuICAgICAgdmFsID4+PSA4O1xuICAgIH1cbiAgICB0aGlzLndyaXRlQnl0ZXMob2Zmc2V0LCBieXRlcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlU3ViKHM6IFN1YnN0aXR1dGlvbiwgZGM6IG51bWJlciwgZHM6IG51bWJlcik6IFN1YnN0aXR1dGlvbiB7XG4gIHMgPSB7Li4uc307XG4gIHMuZXhwciA9IHRyYW5zbGF0ZUV4cHIocy5leHByLCBkYywgZHMpO1xuICByZXR1cm4gcztcbn1cbmZ1bmN0aW9uIHRyYW5zbGF0ZUV4cHIoZTogRXhwciwgZGM6IG51bWJlciwgZHM6IG51bWJlcik6IEV4cHIge1xuICBlID0gey4uLmV9O1xuICBpZiAoZS5tZXRhKSBlLm1ldGEgPSB7Li4uZS5tZXRhfTtcbiAgaWYgKGUuYXJncykgZS5hcmdzID0gZS5hcmdzLm1hcChhID0+IHRyYW5zbGF0ZUV4cHIoYSwgZGMsIGRzKSk7XG4gIGlmIChlLm1ldGE/LmNodW5rICE9IG51bGwpIGUubWV0YS5jaHVuayArPSBkYztcbiAgaWYgKGUub3AgPT09ICdzeW0nICYmIGUubnVtICE9IG51bGwpIGUubnVtICs9IGRzO1xuICByZXR1cm4gZTtcbn1cbmZ1bmN0aW9uIHRyYW5zbGF0ZVN5bWJvbChzOiBTeW1ib2wsIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBTeW1ib2wge1xuICBzID0gey4uLnN9O1xuICBpZiAocy5leHByKSBzLmV4cHIgPSB0cmFuc2xhdGVFeHByKHMuZXhwciwgZGMsIGRzKTtcbiAgcmV0dXJuIHM7XG59XG5cbi8vIFRoaXMgY2xhc3MgaXMgc2luZ2xlLXVzZS5cbmNsYXNzIExpbmsge1xuICBkYXRhID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICBvcmlnID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAvLyBNYXBzIHN5bWJvbCB0byBzeW1ib2wgIyAvLyBbc3ltYm9sICMsIGRlcGVuZGVudCBjaHVua3NdXG4gIGV4cG9ydHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpOyAvLyByZWFkb25seSBbbnVtYmVyLCBTZXQ8bnVtYmVyPl0+KCk7XG4gIGNodW5rczogTGlua0NodW5rW10gPSBbXTtcbiAgc3ltYm9sczogU3ltYm9sW10gPSBbXTtcbiAgZnJlZSA9IG5ldyBJbnRlcnZhbFNldCgpO1xuICByYXdTZWdtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBTZWdtZW50W10+KCk7XG4gIHNlZ21lbnRzID0gbmV3IE1hcDxzdHJpbmcsIExpbmtTZWdtZW50PigpO1xuXG4gIHJlc29sdmVkQ2h1bmtzOiBMaW5rQ2h1bmtbXSA9IFtdO1xuICB1bnJlc29sdmVkQ2h1bmtzID0gbmV3IFNldDxMaW5rQ2h1bms+KCk7XG5cbiAgLy8gVE9ETyAtIGRlZmVycmVkIC0gc3RvcmUgc29tZSBzb3J0IG9mIGRlcGVuZGVuY3kgZ3JhcGg/XG5cbiAgaW5zZXJ0UmVzb2x2ZWQoY2h1bms6IExpbmtDaHVuaykge1xuICAgIGJpbmFyeUluc2VydCh0aGlzLnJlc29sdmVkQ2h1bmtzLCBjID0+IGMuc2l6ZSwgY2h1bmspO1xuICB9XG5cbiAgYmFzZShkYXRhOiBVaW50OEFycmF5LCBvZmZzZXQgPSAwKSB7XG4gICAgdGhpcy5kYXRhLnNldChvZmZzZXQsIGRhdGEpO1xuICAgIHRoaXMub3JpZy5zZXQob2Zmc2V0LCBkYXRhKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGU6IE1vZHVsZSkge1xuICAgIGNvbnN0IGRjID0gdGhpcy5jaHVua3MubGVuZ3RoO1xuICAgIGNvbnN0IGRzID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAvLyBzZWdtZW50cyBjb21lIGZpcnN0LCBzaW5jZSBMaW5rQ2h1bmsgY29uc3RydWN0b3IgbmVlZHMgdGhlbVxuICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBmaWxlLnNlZ21lbnRzIHx8IFtdKSB7XG4gICAgICB0aGlzLmFkZFJhd1NlZ21lbnQoc2VnbWVudCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgZmlsZS5jaHVua3MgfHwgW10pIHtcbiAgICAgIGNvbnN0IGxjID0gbmV3IExpbmtDaHVuayh0aGlzLCB0aGlzLmNodW5rcy5sZW5ndGgsIGNodW5rLCBkYywgZHMpO1xuICAgICAgdGhpcy5jaHVua3MucHVzaChsYyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIGZpbGUuc3ltYm9scyB8fCBbXSkge1xuICAgICAgdGhpcy5zeW1ib2xzLnB1c2godHJhbnNsYXRlU3ltYm9sKHN5bWJvbCwgZGMsIGRzKSk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSB3aGF0IHRoZSBoZWNrIGRvIHdlIGRvIHdpdGggc2VnbWVudHM/XG4gICAgLy8gICAgICAtIGluIHBhcnRpY3VsYXIsIHdobyBpcyByZXNwb25zaWJsZSBmb3IgZGVmaW5pbmcgdGhlbT8/P1xuXG4gICAgLy8gQmFzaWMgaWRlYTpcbiAgICAvLyAgMS4gZ2V0IGFsbCB0aGUgY2h1bmtzXG4gICAgLy8gIDIuIGJ1aWxkIHVwIGEgZGVwZW5kZW5jeSBncmFwaFxuICAgIC8vICAzLiB3cml0ZSBhbGwgZml4ZWQgY2h1bmtzLCBtZW1vaXppbmcgYWJzb2x1dGUgb2Zmc2V0cyBvZlxuICAgIC8vICAgICBtaXNzaW5nIHN1YnMgKHRoZXNlIGFyZSBub3QgZWxpZ2libGUgZm9yIGNvYWxlc2NpbmcpLlxuICAgIC8vICAgICAtLSBwcm9iYWJseSBzYW1lIHRyZWF0bWVudCBmb3IgZnJlZWQgc2VjdGlvbnNcbiAgICAvLyAgNC4gZm9yIHJlbG9jIGNodW5rcywgZmluZCB0aGUgYmlnZ2VzdCBjaHVuayB3aXRoIG5vIGRlcHMuXG4gIH1cblxuICAvLyByZXNvbHZlQ2h1bmsoY2h1bms6IExpbmtDaHVuaykge1xuICAvLyAgIC8vaWYgKGNodW5rLnJlc29sdmluZykgcmV0dXJuOyAvLyBicmVhayBhbnkgY3ljbGVzXG4gICAgXG4gIC8vIH1cblxuICByZXNvbHZlTGluayhleHByOiBFeHByKTogRXhwciB7XG4gICAgaWYgKGV4cHIub3AgPT09ICcub3JpZycgJiYgZXhwci5hcmdzPy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGNoaWxkID0gZXhwci5hcmdzWzBdO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gY2hpbGQubWV0YT8ub2Zmc2V0O1xuICAgICAgaWYgKG9mZnNldCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IG51bSA9IHRoaXMub3JpZy5nZXQob2Zmc2V0ICsgY2hpbGQubnVtISk7XG4gICAgICAgIGlmIChudW0gIT0gbnVsbCkgcmV0dXJuIHtvcDogJ251bScsIG51bX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChleHByLm9wID09PSAnbnVtJyAmJiBleHByLm1ldGE/LmNodW5rICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSBleHByLm1ldGE7XG4gICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW21ldGEuY2h1bmshXTtcbiAgICAgIGlmIChjaHVuay5vcmcgIT09IG1ldGEub3JnIHx8XG4gICAgICAgICAgY2h1bmsuc2VnbWVudD8uYmFuayAhPT0gbWV0YS5iYW5rIHx8XG4gICAgICAgICAgY2h1bmsub2Zmc2V0ICE9PSBtZXRhLm9mZnNldCkge1xuICAgICAgICBjb25zdCBtZXRhMiA9IHtcbiAgICAgICAgICBvcmc6IGNodW5rLm9yZyxcbiAgICAgICAgICBvZmZzZXQ6IGNodW5rLm9mZnNldCxcbiAgICAgICAgICBiYW5rOiBjaHVuay5zZWdtZW50Py5iYW5rLFxuICAgICAgICB9O1xuICAgICAgICBleHByID0gRXhwci5ldmFsdWF0ZSh7Li4uZXhwciwgbWV0YTogey4uLm1ldGEsIC4uLm1ldGEyfX0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIC8vIE5PVEU6IHNvIGZhciB0aGlzIGlzIG9ubHkgdXNlZCBmb3IgYXNzZXJ0cz9cbiAgLy8gSXQgYmFzaWNhbGx5IGNvcHktcGFzdGVzIGZyb20gcmVzb2x2ZVN1YnMuLi4gOi0oXG5cbiAgcmVzb2x2ZUV4cHIoZXhwcjogRXhwcik6IG51bWJlciB7XG4gICAgZXhwciA9IEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICB9KTtcblxuICAgIGlmIChleHByLm9wID09PSAnbnVtJyAmJiAhZXhwci5tZXRhPy5yZWwpIHJldHVybiBleHByLm51bSE7XG4gICAgY29uc3QgYXQgPSBUb2tlbi5hdChleHByKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmdWxseSByZXNvbHZlIGV4cHIke2F0fWApO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIC8vIEJ1aWxkIHVwIHRoZSBMaW5rU2VnbWVudCBvYmplY3RzXG4gICAgZm9yIChjb25zdCBbbmFtZSwgc2VnbWVudHNdIG9mIHRoaXMucmF3U2VnbWVudHMpIHtcbiAgICAgIGxldCBzID0gc2VnbWVudHNbMF07XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHMgPSBTZWdtZW50Lm1lcmdlKHMsIHNlZ21lbnRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2VnbWVudHMuc2V0KG5hbWUsIG5ldyBMaW5rU2VnbWVudChzKSk7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZnJlZSBzcGFjZVxuICAgIGZvciAoY29uc3QgW25hbWUsIHNlZ21lbnRzXSBvZiB0aGlzLnJhd1NlZ21lbnRzKSB7XG4gICAgICBjb25zdCBzID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICAgIGNvbnN0IGZyZWUgPSBzZWdtZW50LmZyZWU7XG4gICAgICAgIC8vIEFkZCB0aGUgZnJlZSBzcGFjZVxuICAgICAgICBmb3IgKGNvbnN0IFtzdGFydCwgZW5kXSBvZiBmcmVlIHx8IFtdKSB7XG4gICAgICAgICAgdGhpcy5mcmVlLmFkZChzdGFydCArIHMuZGVsdGEsIGVuZCArIHMuZGVsdGEpO1xuICAgICAgICAgIHRoaXMuZGF0YS5zcGxpY2Uoc3RhcnQgKyBzLmRlbHRhLCBlbmQgLSBzdGFydCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gU2V0IHVwIGFsbCB0aGUgaW5pdGlhbCBwbGFjZW1lbnRzLlxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGNodW5rLmluaXRpYWxQbGFjZW1lbnQoKTtcbiAgICB9XG4gICAgLy8gRmluZCBhbGwgdGhlIGV4cG9ydHMuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuc3ltYm9sc1tpXTtcbiAgICAgIC8vIFRPRE8gLSB3ZSdkIHJlYWxseSBsaWtlIHRvIGlkZW50aWZ5IHRoaXMgZWFybGllciBpZiBhdCBhbGwgcG9zc2libGUhXG4gICAgICBpZiAoIXN5bWJvbC5leHByKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCAke2l9IG5ldmVyIHJlc29sdmVkYCk7XG4gICAgICAvLyBsb29rIGZvciBpbXBvcnRzL2V4cG9ydHNcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5leHBvcnRzLnNldChzeW1ib2wuZXhwb3J0LCBpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzb2x2ZSBhbGwgdGhlIGltcG9ydHMgaW4gYWxsIHN5bWJvbCBhbmQgY2h1bmsuc3VicyBleHBycy5cbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIHN5bWJvbC5leHByID0gdGhpcy5yZXNvbHZlU3ltYm9scyhzeW1ib2wuZXhwciEpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBmb3IgKGNvbnN0IHN1YiBvZiBbLi4uY2h1bmsuc3VicywgLi4uY2h1bmsuc2VsZlN1YnNdKSB7XG4gICAgICAgIHN1Yi5leHByID0gdGhpcy5yZXNvbHZlU3ltYm9scyhzdWIuZXhwcik7XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNodW5rLmFzc2VydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2h1bmsuYXNzZXJ0c1tpXSA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoY2h1bmsuYXNzZXJ0c1tpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIHdlIGRvbid0IGNhcmUgYWJvdXQgdGhpcy5zeW1ib2xzIGF0IGFsbCBhbnltb3JlLlxuICAgIC8vIE5vdyBmaWd1cmUgb3V0IHRoZSBmdWxsIGRlcGVuZGVuY3kgdHJlZTogY2h1bmsgI1ggcmVxdWlyZXMgY2h1bmsgI1lcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGMucmVzb2x2ZVN1YnModHJ1ZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZpbGwgKHVuKXJlc29sdmVkQ2h1bmtzXG4gICAgLy8gICAtIGdldHMgXG5cbiAgICBjb25zdCBjaHVua3MgPSBbLi4udGhpcy5jaHVua3NdO1xuICAgIGNodW5rcy5zb3J0KChhLCBiKSA9PiBiLnNpemUgLSBhLnNpemUpO1xuXG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIGNodW5rLnJlc29sdmVTdWJzKCk7XG4gICAgICBpZiAoY2h1bmsuc3Vicy5zaXplKSB7XG4gICAgICAgIHRoaXMudW5yZXNvbHZlZENodW5rcy5hZGQoY2h1bmspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnNlcnRSZXNvbHZlZChjaHVuayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNvdW50ID0gdGhpcy5yZXNvbHZlZENodW5rcy5sZW5ndGggKyAyICogdGhpcy51bnJlc29sdmVkQ2h1bmtzLnNpemU7XG4gICAgd2hpbGUgKGNvdW50KSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5yZXNvbHZlZENodW5rcy5wb3AoKTtcbiAgICAgIGlmIChjKSB7XG4gICAgICAgIHRoaXMucGxhY2VDaHVuayhjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlc29sdmUgYWxsIHRoZSBmaXJzdCB1bnJlc29sdmVkIGNodW5rcycgZGVwc1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gdGhpcy51bnJlc29sdmVkQ2h1bmtzO1xuICAgICAgICBmb3IgKGNvbnN0IGRlcCBvZiBmaXJzdC5kZXBzKSB7XG4gICAgICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tkZXBdO1xuICAgICAgICAgIGlmIChjaHVuay5vcmcgPT0gbnVsbCkgdGhpcy5wbGFjZUNodW5rKGNodW5rKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMucmVzb2x2ZWRDaHVua3MubGVuZ3RoICsgMiAqIHRoaXMudW5yZXNvbHZlZENodW5rcy5zaXplO1xuICAgICAgaWYgKG5leHQgPT09IGNvdW50KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5yZXNvbHZlZENodW5rcywgdGhpcy51bnJlc29sdmVkQ2h1bmtzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgbWFraW5nIHByb2dyZXNzYCk7XG4gICAgICB9XG4gICAgICBjb3VudCA9IG5leHQ7XG4gICAgfVxuXG4gICAgLy8gaWYgKCFjaHVuay5vcmcgJiYgIWNodW5rLnN1YnMubGVuZ3RoKSB0aGlzLnBsYWNlQ2h1bmsoY2h1bmspO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCB0aGUgZGVwIGdyYXBoIGlzIGJ1aWx0IC0gbm93IHRyYXZlcnNlIGl0LlxuXG4gICAgLy8gY29uc3QgcGxhY2UgPSAoaTogbnVtYmVyKSA9PiB7XG4gICAgLy8gICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW2ldO1xuICAgIC8vICAgaWYgKGNodW5rLm9yZyAhPSBudWxsKSByZXR1cm47XG4gICAgLy8gICAvLyByZXNvbHZlIGZpcnN0XG4gICAgLy8gICBjb25zdCByZW1haW5pbmc6IFN1YnN0aXR1dGlvbltdID0gW107XG4gICAgLy8gICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLnJlc29sdmVTdWIoY2h1bmssIHN1YikpIHJlbWFpbmluZy5wdXNoKHN1Yik7XG4gICAgLy8gICB9XG4gICAgLy8gICBjaHVuay5zdWJzID0gcmVtYWluaW5nO1xuICAgIC8vICAgLy8gbm93IHBsYWNlIHRoZSBjaHVua1xuICAgIC8vICAgdGhpcy5wbGFjZUNodW5rKGNodW5rKTsgLy8gVE9ETyAuLi5cbiAgICAvLyAgIC8vIHVwZGF0ZSB0aGUgZ3JhcGg7IGRvbid0IGJvdGhlciBkZWxldGluZyBmb3JtIGJsb2NrZWQuXG4gICAgLy8gICBmb3IgKGNvbnN0IHJldkRlcCBvZiByZXZEZXBzW2ldKSB7XG4gICAgLy8gICAgIGNvbnN0IGZ3ZCA9IGZ3ZERlcHNbcmV2RGVwXTtcbiAgICAvLyAgICAgZndkLmRlbGV0ZShpKTtcbiAgICAvLyAgICAgaWYgKCFmd2Quc2l6ZSkgaW5zZXJ0KHVuYmxvY2tlZCwgcmV2RGVwKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLy8gd2hpbGUgKHVuYmxvY2tlZC5sZW5ndGggfHwgYmxvY2tlZC5sZW5ndGgpIHtcbiAgICAvLyAgIGxldCBuZXh0ID0gdW5ibG9ja2VkLnNoaWZ0KCk7XG4gICAgLy8gICBpZiAobmV4dCkge1xuICAgIC8vICAgICBwbGFjZShuZXh0KTtcbiAgICAvLyAgICAgY29udGludWU7XG4gICAgLy8gICB9XG4gICAgLy8gICBuZXh0ID0gYmxvY2tlZFswXTtcbiAgICAvLyAgIGZvciAoY29uc3QgcmV2IG9mIHJldkRlcHNbbmV4dF0pIHtcbiAgICAvLyAgICAgaWYgKHRoaXMuY2h1bmtzW3Jldl0ub3JnICE9IG51bGwpIHsgLy8gYWxyZWFkeSBwbGFjZWRcbiAgICAvLyAgICAgICBibG9ja2VkLnNoaWZ0KCk7XG4gICAgLy8gICAgICAgY29udGludWU7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcGxhY2UocmV2KTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLy8gQXQgdGhpcyBwb2ludCwgZXZlcnl0aGluZyBzaG91bGQgYmUgcGxhY2VkLCBzbyBkbyBvbmUgbGFzdCByZXNvbHZlLlxuXG4gICAgY29uc3QgcGF0Y2ggPSBuZXcgU3BhcnNlQnl0ZUFycmF5KCk7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgYy5hc3NlcnRzKSB7XG4gICAgICAgIGNvbnN0IHYgPSB0aGlzLnJlc29sdmVFeHByKGEpO1xuICAgICAgICBpZiAodikgY29udGludWU7XG4gICAgICAgIGNvbnN0IGF0ID0gVG9rZW4uYXQoYSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIGZhaWxlZCR7YXR9YCk7XG4gICAgICB9XG4gICAgICBpZiAoYy5vdmVybGFwcykgY29udGludWU7XG4gICAgICBwYXRjaC5zZXQoYy5vZmZzZXQhLCAuLi50aGlzLmRhdGEuc2xpY2UoYy5vZmZzZXQhLCBjLm9mZnNldCEgKyBjLnNpemUhKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRjaDtcbiAgfVxuXG4gIHBsYWNlQ2h1bmsoY2h1bms6IExpbmtDaHVuaykge1xuICAgIGlmIChjaHVuay5vcmcgIT0gbnVsbCkgcmV0dXJuOyAvLyBkb24ndCByZS1wbGFjZS5cbiAgICBjb25zdCBzaXplID0gY2h1bmsuc2l6ZTtcbiAgICBpZiAoIWNodW5rLnN1YnMuc2l6ZSAmJiAhY2h1bmsuc2VsZlN1YnMuc2l6ZSkge1xuICAgICAgLy8gY2h1bmsgaXMgcmVzb2x2ZWQ6IHNlYXJjaCBmb3IgYW4gZXhpc3RpbmcgY29weSBvZiBpdCBmaXJzdFxuICAgICAgY29uc3QgcGF0dGVybiA9IHRoaXMuZGF0YS5wYXR0ZXJuKGNodW5rLmRhdGEpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzLmdldChuYW1lKSE7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gc2VnbWVudC5vZmZzZXQhO1xuICAgICAgICBjb25zdCBlbmQgPSBzdGFydCArIHNlZ21lbnQuc2l6ZSE7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gcGF0dGVybi5zZWFyY2goc3RhcnQsIGVuZCk7XG4gICAgICAgIGlmIChpbmRleCA8IDApIGNvbnRpbnVlO1xuICAgICAgICBjaHVuay5wbGFjZShpbmRleCAtIHNlZ21lbnQuZGVsdGEsIHNlZ21lbnQpO1xuICAgICAgICBjaHVuay5vdmVybGFwcyA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZWl0aGVyIHVucmVzb2x2ZWQsIG9yIGRpZG4ndCBmaW5kIGEgbWF0Y2g7IGp1c3QgYWxsb2NhdGUgc3BhY2UuXG4gICAgLy8gbG9vayBmb3IgdGhlIHNtYWxsZXN0IHBvc3NpYmxlIGZyZWUgYmxvY2suXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gICAgICBjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgY29uc3QgczAgPSBzZWdtZW50Lm9mZnNldCE7XG4gICAgICBjb25zdCBzMSA9IHMwICsgc2VnbWVudC5zaXplITtcbiAgICAgIGxldCBmb3VuZDogbnVtYmVyfHVuZGVmaW5lZDtcbiAgICAgIGxldCBzbWFsbGVzdCA9IEluZmluaXR5O1xuICAgICAgZm9yIChjb25zdCBbZjAsIGYxXSBvZiB0aGlzLmZyZWUudGFpbChzMCkpIHtcbiAgICAgICAgaWYgKGYwID49IHMxKSBicmVhaztcbiAgICAgICAgY29uc3QgZGYgPSBNYXRoLm1pbihmMSwgczEpIC0gZjA7XG4gICAgICAgIGlmIChkZiA8IHNpemUpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZGYgPCBzbWFsbGVzdCkge1xuICAgICAgICAgIGZvdW5kID0gZjA7XG4gICAgICAgICAgc21hbGxlc3QgPSBkZjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kICE9IG51bGwpIHtcbiAgICAgICAgLy8gZm91bmQgYSByZWdpb25cbiAgICAgICAgY2h1bmsucGxhY2UoZm91bmQgLSBzZWdtZW50LmRlbHRhLCBzZWdtZW50KTtcbiAgICAgICAgLy8gdGhpcy5mcmVlLmRlbGV0ZShmMCwgZjAgKyBzaXplKTtcbiAgICAgICAgLy8gVE9ETyAtIGZhY3RvciBvdXQgdGhlIHN1YnMtYXdhcmUgY29weSBtZXRob2QhXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coYEFmdGVyIGZpbGxpbmc6YCk7XG4gICAgdGhpcy5yZXBvcnQoKTtcbiAgICBjb25zdCBuYW1lID0gY2h1bmsubmFtZSA/IGAke2NodW5rLm5hbWV9IGAgOiAnJztcbiAgICBjb25zb2xlLmxvZyh0aGlzLnNlZ21lbnRzLmdldChjaHVuay5zZWdtZW50c1swXSkpO1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgc3BhY2UgZm9yICR7c2l6ZX0tYnl0ZSBjaHVuayAke25hbWV9aW4gJHtcbiAgICAgICAgICAgICAgICAgICAgIGNodW5rLnNlZ21lbnRzLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICByZXNvbHZlU3ltYm9scyhleHByOiBFeHByKTogRXhwciB7XG4gICAgLy8gcHJlLXRyYXZlcnNlIHNvIHRoYXQgdHJhbnNpdGl2ZSBpbXBvcnRzIHdvcmtcbiAgICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZSwgcmVjKSA9PiB7XG4gICAgICB3aGlsZSAoZS5vcCA9PT0gJ2ltJyB8fCBlLm9wID09PSAnc3ltJykge1xuICAgICAgICBpZiAoZS5vcCA9PT0gJ2ltJykge1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBlLnN5bSE7XG4gICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLmV4cG9ydHMuZ2V0KG5hbWUpO1xuICAgICAgICAgIGlmIChpbXBvcnRlZCA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBhdCA9IFRva2VuLmF0KGV4cHIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgbmV2ZXIgZXhwb3J0ZWQgJHtuYW1lfSR7YXR9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUgPSB0aGlzLnN5bWJvbHNbaW1wb3J0ZWRdLmV4cHIhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChlLm51bSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCBub3QgZ2xvYmFsYCk7XG4gICAgICAgICAgZSA9IHRoaXMuc3ltYm9sc1tlLm51bV0uZXhwciE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHJlYyhlKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyByZXNvbHZlQmFua0J5dGVzKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgLy8gICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZTogRXhwcikgPT4ge1xuICAvLyAgICAgaWYgKGUub3AgIT09ICdeJyB8fCBlLmFyZ3M/Lmxlbmd0aCAhPT0gMSkgcmV0dXJuIGU7XG4gIC8vICAgICBjb25zdCBjaGlsZCA9IGUuYXJnc1swXTtcbiAgLy8gICAgIGlmIChjaGlsZC5vcCAhPT0gJ29mZicpIHJldHVybiBlO1xuICAvLyAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tjaGlsZC5udW0hXTtcbiAgLy8gICAgIGNvbnN0IGJhbmtzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgICBmb3IgKGNvbnN0IHMgb2YgY2h1bmsuc2VnbWVudHMpIHtcbiAgLy8gICAgICAgY29uc3Qgc2VnbWVudCA9IHRoaXMuc2VnbWVudHMuZ2V0KHMpO1xuICAvLyAgICAgICBpZiAoc2VnbWVudD8uYmFuayAhPSBudWxsKSBiYW5rcy5hZGQoc2VnbWVudC5iYW5rKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmIChiYW5rcy5zaXplICE9PSAxKSByZXR1cm4gZTtcbiAgLy8gICAgIGNvbnN0IFtiXSA9IGJhbmtzO1xuICAvLyAgICAgcmV0dXJuIHtvcDogJ251bScsIHNpemU6IDEsIG51bTogYn07XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyAgICAgaWYgKGV4cHIub3AgPT09ICdpbXBvcnQnKSB7XG4gIC8vICAgICAgIGlmICghZXhwci5zeW0pIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHdpdGggbm8gc3ltYm9sLmApO1xuICAvLyAgICAgICBjb25zdCBzeW0gPSB0aGlzLnN5bWJvbHNbdGhpcy5leHBvcnRzLmdldChleHByLnN5bSldO1xuICAvLyAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlSW1wb3J0cyhzeW0uZXhwcik7XG4gIC8vICAgICB9XG4gIC8vICAgICAvLyBUT0RPIC0gdGhpcyBpcyBub25zZW5zZS4uLlxuICAvLyAgICAgY29uc3QgYXJncyA9IFtdO1xuICAvLyAgICAgbGV0IG11dCA9IGZhbHNlO1xuICAvLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHByLmFyZ3M7IGkrKykge1xuICAvLyAgICAgICBjb25zdCBjaGlsZCA9IGV4cHIuYXJnc1tpXTtcbiAgLy8gICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVJbXBvcnRzKGNoaWxkKTtcbiAgLy8gICAgICAgYXJncy5wdXNoKHJlc29sdmVkKTtcbiAgLy8gICAgICAgaWYgKGNoaWxkICE9PSByZXNvbHZlZCkgZXhwci5hcmdzW2ldID0gcmVzb2x2ZWQ7XG4gIC8vICAgICAgIHJldHVybiBcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgLy8gVE9ETyAtIGFkZCBhbGwgdGhlIHRoaW5nc1xuICAvLyAgIHJldHVybiBwYXRjaDtcbiAgLy8gfVxuXG4gIGFkZFJhd1NlZ21lbnQoc2VnbWVudDogU2VnbWVudCkge1xuICAgIGxldCBsaXN0ID0gdGhpcy5yYXdTZWdtZW50cy5nZXQoc2VnbWVudC5uYW1lKTtcbiAgICBpZiAoIWxpc3QpIHRoaXMucmF3U2VnbWVudHMuc2V0KHNlZ21lbnQubmFtZSwgbGlzdCA9IFtdKTtcbiAgICBsaXN0LnB1c2goc2VnbWVudCk7XG4gIH1cblxuICBidWlsZEV4cG9ydHMoKTogTWFwPHN0cmluZywgRXhwb3J0PiB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIEV4cG9ydD4oKTtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIGlmICghc3ltYm9sLmV4cG9ydCkgY29udGludWU7XG4gICAgICBjb25zdCBlID0gRXhwci50cmF2ZXJzZShzeW1ib2wuZXhwciEsIChlLCByZWMpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKGUub3AgIT09ICdudW0nKSB0aHJvdyBuZXcgRXJyb3IoYG5ldmVyIHJlc29sdmVkOiAke3N5bWJvbC5leHBvcnR9YCk7XG4gICAgICBjb25zdCB2YWx1ZSA9IGUubnVtITtcbiAgICAgIGNvbnN0IG91dDogRXhwb3J0ID0ge3ZhbHVlfTtcbiAgICAgIGlmIChlLm1ldGE/Lm9mZnNldCAhPSBudWxsICYmIGUubWV0YS5vcmcgIT0gbnVsbCkge1xuICAgICAgICBvdXQub2Zmc2V0ID0gZS5tZXRhLm9mZnNldCArIHZhbHVlIC0gZS5tZXRhLm9yZztcbiAgICAgIH1cbiAgICAgIGlmIChlLm1ldGE/LmJhbmsgIT0gbnVsbCkgb3V0LmJhbmsgPSBlLm1ldGEuYmFuaztcbiAgICAgIG1hcC5zZXQoc3ltYm9sLmV4cG9ydCwgb3V0KTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHJlcG9ydCgpIHtcbiAgICBmb3IgKGNvbnN0IFtzLGVdIG9mIHRoaXMuZnJlZSkge1xuICAgICAgY29uc29sZS5sb2coYEZyZWU6ICR7cy50b1N0cmluZygxNil9Li4ke2UudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgfVxufVxuIl19