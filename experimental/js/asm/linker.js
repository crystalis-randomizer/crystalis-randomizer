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
    report(verbose = false) {
        console.log(this._link.report(verbose));
    }
    exports() {
        if (this._exports)
            return this._exports;
        return this._exports = this._link.buildExports();
    }
    watch(...offset) {
        this._link.watches.push(...offset);
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
        for (const w of this.linker.watches) {
            if (w >= offset && w < offset + this.size)
                debugger;
        }
        binaryInsert(this.linker.placed, x => x[0], [offset, this]);
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
        this.watches = [];
        this.placed = [];
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
        if (DEBUG) {
            console.log(`Initial:\n${this.report(true)}`);
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
        console.log(`After filling:\n${this.report(true)}`);
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
    report(verbose = false) {
        var _a;
        let out = '';
        for (const [s, e] of this.free) {
            out += `Free: ${s.toString(16)}..${e.toString(16)}: ${e - s} bytes\n`;
        }
        if (verbose) {
            for (const [s, c] of this.placed) {
                const name = (_a = c.name, (_a !== null && _a !== void 0 ? _a : `Chunk ${c.index}`));
                const end = c.offset + c.size;
                out += `${s.toString(16).padStart(5, '0')} .. ${end.toString(16).padStart(5, '0')}: ${name} (${end - s} bytes)\n`;
            }
        }
        return out;
    }
}
const DEBUG = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFnQixPQUFPLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFTakMsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFTVSxVQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQTZCN0IsQ0FBQztJQXJDQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBZTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBS0QsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBZ0IsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8s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RSxHQUFHLENBQUMsT0FDckMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUM7YUFDdkU7U0FDRjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUNGO0FBRUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbnRlcnZhbFNldCwgU3BhcnNlQnl0ZUFycmF5LCBiaW5hcnlJbnNlcnR9IGZyb20gJy4vdXRpbC5qcyc7XG5pbXBvcnQge0V4cHJ9IGZyb20gJy4vZXhwci5qcyc7XG5pbXBvcnQge0NodW5rLCBNb2R1bGUsIFNlZ21lbnQsIFN1YnN0aXR1dGlvbiwgU3ltYm9sfSBmcm9tICcuL21vZHVsZS5qcyc7XG5pbXBvcnQge1Rva2VufSBmcm9tICcuL3Rva2VuLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBFeHBvcnQge1xuICB2YWx1ZTogbnVtYmVyO1xuICBvZmZzZXQ/OiBudW1iZXI7XG4gIGJhbms/OiBudW1iZXI7XG4gIC8vc2VnbWVudD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIExpbmtlciB7XG4gIHN0YXRpYyBsaW5rKC4uLmZpbGVzOiBNb2R1bGVbXSk6IFNwYXJzZUJ5dGVBcnJheSB7XG4gICAgY29uc3QgbGlua2VyID0gbmV3IExpbmtlcigpO1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgICAgbGlua2VyLnJlYWQoZmlsZSk7XG4gICAgfVxuICAgIHJldHVybiBsaW5rZXIubGluaygpO1xuICB9XG5cbiAgcHJpdmF0ZSBfbGluayA9IG5ldyBMaW5rKCk7XG4gIHByaXZhdGUgX2V4cG9ydHM/OiBNYXA8c3RyaW5nLCBFeHBvcnQ+O1xuXG4gIHJlYWQoZmlsZTogTW9kdWxlKTogTGlua2VyIHtcbiAgICB0aGlzLl9saW5rLnJlYWRGaWxlKGZpbGUpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYmFzZShkYXRhOiBVaW50OEFycmF5LCBvZmZzZXQgPSAwKTogTGlua2VyIHtcbiAgICB0aGlzLl9saW5rLmJhc2UoZGF0YSwgb2Zmc2V0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpbmsoKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICByZXR1cm4gdGhpcy5fbGluay5saW5rKCk7XG4gIH1cblxuICByZXBvcnQodmVyYm9zZSA9IGZhbHNlKSB7XG4gICAgY29uc29sZS5sb2codGhpcy5fbGluay5yZXBvcnQodmVyYm9zZSkpO1xuICB9XG5cbiAgZXhwb3J0cygpOiBNYXA8c3RyaW5nLCBFeHBvcnQ+IHtcbiAgICBpZiAodGhpcy5fZXhwb3J0cykgcmV0dXJuIHRoaXMuX2V4cG9ydHM7XG4gICAgcmV0dXJuIHRoaXMuX2V4cG9ydHMgPSB0aGlzLl9saW5rLmJ1aWxkRXhwb3J0cygpO1xuICB9XG5cbiAgd2F0Y2goLi4ub2Zmc2V0OiBudW1iZXJbXSkge1xuICAgIHRoaXMuX2xpbmsud2F0Y2hlcy5wdXNoKC4uLm9mZnNldCk7XG4gIH1cbn1cblxuZXhwb3J0IG5hbWVzcGFjZSBMaW5rZXIge1xuICBleHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICAgIFxuXG4gIH1cbn1cblxuLy8gVE9ETyAtIGxpbmstdGltZSBvbmx5IGZ1bmN0aW9uIGZvciBnZXR0aW5nIGVpdGhlciB0aGUgb3JpZ2luYWwgb3IgdGhlXG4vLyAgICAgICAgcGF0Y2hlZCBieXRlLiAgV291bGQgYWxsb3cgZS5nLiBjb3B5KCQ4MDAwLCAkMjAwMCwgXCIxZVwiKSB0byBtb3ZlXG4vLyAgICAgICAgYSBidW5jaCBvZiBjb2RlIGFyb3VuZCB3aXRob3V0IGV4cGxpY2l0bHkgY29weS1wYXN0aW5nIGl0IGluIHRoZVxuLy8gICAgICAgIGFzbSBwYXRjaC5cblxuLy8gVHJhY2tzIGFuIGV4cG9ydC5cbi8vIGludGVyZmFjZSBFeHBvcnQge1xuLy8gICBjaHVua3M6IFNldDxudW1iZXI+O1xuLy8gICBzeW1ib2w6IG51bWJlcjtcbi8vIH1cblxuZnVuY3Rpb24gZmFpbChtc2c6IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG59XG5cbmNsYXNzIExpbmtTZWdtZW50IHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBiYW5rOiBudW1iZXI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlcjtcbiAgcmVhZG9ubHkgb2Zmc2V0OiBudW1iZXI7XG4gIHJlYWRvbmx5IG1lbW9yeTogbnVtYmVyO1xuICByZWFkb25seSBhZGRyZXNzaW5nOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3Ioc2VnbWVudDogU2VnbWVudCkge1xuICAgIGNvbnN0IG5hbWUgPSB0aGlzLm5hbWUgPSBzZWdtZW50Lm5hbWU7XG4gICAgdGhpcy5iYW5rID0gc2VnbWVudC5iYW5rID8/IDA7XG4gICAgdGhpcy5hZGRyZXNzaW5nID0gc2VnbWVudC5hZGRyZXNzaW5nID8/IDI7XG4gICAgdGhpcy5zaXplID0gc2VnbWVudC5zaXplID8/IGZhaWwoYFNpemUgbXVzdCBiZSBzcGVjaWZpZWQ6ICR7bmFtZX1gKTtcbiAgICB0aGlzLm9mZnNldCA9IHNlZ21lbnQub2Zmc2V0ID8/IGZhaWwoYE9GZnNldCBtdXN0IGJlIHNwZWNpZmllZDogJHtuYW1lfWApO1xuICAgIHRoaXMubWVtb3J5ID0gc2VnbWVudC5tZW1vcnkgPz8gZmFpbChgT0Zmc2V0IG11c3QgYmUgc3BlY2lmaWVkOiAke25hbWV9YCk7XG4gIH1cblxuICAvLyBvZmZzZXQgPSBvcmcgKyBkZWx0YVxuICBnZXQgZGVsdGEoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMub2Zmc2V0IC0gdGhpcy5tZW1vcnk7IH1cbn1cblxuY2xhc3MgTGlua0NodW5rIHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICBzZWdtZW50czogcmVhZG9ubHkgc3RyaW5nW107XG4gIGFzc2VydHM6IEV4cHJbXTtcblxuICBzdWJzID0gbmV3IFNldDxTdWJzdGl0dXRpb24+KCk7XG4gIHNlbGZTdWJzID0gbmV3IFNldDxTdWJzdGl0dXRpb24+KCk7XG5cbiAgLyoqIEdsb2JhbCBJRHMgb2YgY2h1bmtzIG5lZWRlZCB0byBsb2NhdGUgYmVmb3JlIHdlIGNhbiBjb21wbGV0ZSB0aGlzIG9uZS4gKi9cbiAgZGVwcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvKiogU3ltYm9scyB0aGF0IGFyZSBpbXBvcnRlZCBpbnRvIHRoaXMgY2h1bmsgKHRoZXNlIGFyZSBhbHNvIGRlcHMpLiAqL1xuICBpbXBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIC8vIC8qKiBTeW1ib2xzIHRoYXQgYXJlIGV4cG9ydGVkIGZyb20gdGhpcyBjaHVuay4gKi9cbiAgLy8gZXhwb3J0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvbGxvdyA9IG5ldyBNYXA8U3Vic3RpdHV0aW9uLCBMaW5rQ2h1bms+KCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGNodW5rIGlzIHBsYWNlZCBvdmVybGFwcGluZyB3aXRoIHNvbWV0aGluZyBlbHNlLlxuICAgKiBPdmVybGFwcyBhcmVuJ3Qgd3JpdHRlbiB0byB0aGUgcGF0Y2guXG4gICAqL1xuICBvdmVybGFwcyA9IGZhbHNlO1xuXG4gIHByaXZhdGUgX2RhdGE/OiBVaW50OEFycmF5O1xuXG4gIHByaXZhdGUgX29yZz86IG51bWJlcjtcbiAgcHJpdmF0ZSBfb2Zmc2V0PzogbnVtYmVyO1xuICBwcml2YXRlIF9zZWdtZW50PzogTGlua1NlZ21lbnQ7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGlua2VyOiBMaW5rLFxuICAgICAgICAgICAgICByZWFkb25seSBpbmRleDogbnVtYmVyLFxuICAgICAgICAgICAgICBjaHVuazogQ2h1bms8VWludDhBcnJheT4sXG4gICAgICAgICAgICAgIGNodW5rT2Zmc2V0OiBudW1iZXIsXG4gICAgICAgICAgICAgIHN5bWJvbE9mZnNldDogbnVtYmVyKSB7XG4gICAgdGhpcy5uYW1lID0gY2h1bmsubmFtZTtcbiAgICB0aGlzLnNpemUgPSBjaHVuay5kYXRhLmxlbmd0aDtcbiAgICB0aGlzLnNlZ21lbnRzID0gY2h1bmsuc2VnbWVudHM7XG4gICAgdGhpcy5fZGF0YSA9IGNodW5rLmRhdGE7XG4gICAgZm9yIChjb25zdCBzdWIgb2YgY2h1bmsuc3VicyB8fCBbXSkge1xuICAgICAgdGhpcy5zdWJzLmFkZCh0cmFuc2xhdGVTdWIoc3ViLCBjaHVua09mZnNldCwgc3ltYm9sT2Zmc2V0KSk7XG4gICAgfVxuICAgIHRoaXMuYXNzZXJ0cyA9IChjaHVuay5hc3NlcnRzIHx8IFtdKVxuICAgICAgICAubWFwKGUgPT4gdHJhbnNsYXRlRXhwcihlLCBjaHVua09mZnNldCwgc3ltYm9sT2Zmc2V0KSk7XG4gICAgaWYgKGNodW5rLm9yZykgdGhpcy5fb3JnID0gY2h1bmsub3JnO1xuICB9XG5cbiAgZ2V0IG9yZygpIHsgcmV0dXJuIHRoaXMuX29yZzsgfVxuICBnZXQgb2Zmc2V0KCkgeyByZXR1cm4gdGhpcy5fb2Zmc2V0OyB9XG4gIGdldCBzZWdtZW50KCkgeyByZXR1cm4gdGhpcy5fc2VnbWVudDsgfVxuICBnZXQgZGF0YSgpIHsgcmV0dXJuIHRoaXMuX2RhdGEgPz8gZmFpbCgnbm8gZGF0YScpOyB9XG5cbiAgaW5pdGlhbFBsYWNlbWVudCgpIHtcbiAgICAvLyBJbnZhcmlhbnQ6IGV4YWN0bHkgb25lIG9mIChkYXRhKSBvciAob3JnLCBfb2Zmc2V0LCBfc2VnbWVudCkgaXMgcHJlc2VudC5cbiAgICAvLyBJZiAob3JnLCAuLi4pIGZpbGxlZCBpbiB0aGVuIHdlIHVzZSBsaW5rZXIuZGF0YSBpbnN0ZWFkLlxuICAgIC8vIFdlIGRvbid0IGNhbGwgdGhpcyBpbiB0aGUgY3RvciBiZWNhdXNlIGl0IGRlcGVuZHMgb24gYWxsIHRoZSBzZWdtZW50c1xuICAgIC8vIGJlaW5nIGxvYWRlZCwgYnV0IGl0J3MgdGhlIGZpcnN0IHRoaW5nIHdlIGRvIGluIGxpbmsoKS5cbiAgICBpZiAodGhpcy5fb3JnID09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCBlbGlnaWJsZVNlZ21lbnRzOiBMaW5rU2VnbWVudFtdID0gW107XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuc2VnbWVudHMpIHtcbiAgICAgIGNvbnN0IHMgPSB0aGlzLmxpbmtlci5zZWdtZW50cy5nZXQobmFtZSk7XG4gICAgICBpZiAoIXMpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBzZWdtZW50OiAke25hbWV9YCk7XG4gICAgICBpZiAodGhpcy5fb3JnID49IHMubWVtb3J5ICYmIHRoaXMuX29yZyA8IHMubWVtb3J5ICsgcy5zaXplKSB7XG4gICAgICAgIGVsaWdpYmxlU2VnbWVudHMucHVzaChzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVsaWdpYmxlU2VnbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgc2VnbWVudDogJHtlbGlnaWJsZVNlZ21lbnRzfWApO1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50ID0gZWxpZ2libGVTZWdtZW50c1swXTtcbiAgICBpZiAodGhpcy5fb3JnID49IHNlZ21lbnQubWVtb3J5ICsgc2VnbWVudC5zaXplKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENodW5rIGRvZXMgbm90IGZpdCBpbiBzZWdtZW50ICR7c2VnbWVudC5uYW1lfWApO1xuICAgIH1cbiAgICB0aGlzLnBsYWNlKHRoaXMuX29yZywgc2VnbWVudCk7XG4gIH1cblxuICBwbGFjZShvcmc6IG51bWJlciwgc2VnbWVudDogTGlua1NlZ21lbnQpIHtcbiAgICB0aGlzLl9vcmcgPSBvcmc7XG4gICAgdGhpcy5fc2VnbWVudCA9IHNlZ21lbnQ7XG4gICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5fb2Zmc2V0ID0gb3JnICsgc2VnbWVudC5kZWx0YTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgdGhpcy5saW5rZXIud2F0Y2hlcykge1xuICAgICAgaWYgKHcgPj0gb2Zmc2V0ICYmIHcgPCBvZmZzZXQgKyB0aGlzLnNpemUpIGRlYnVnZ2VyO1xuICAgIH1cbiAgICBiaW5hcnlJbnNlcnQodGhpcy5saW5rZXIucGxhY2VkLCB4ID0+IHhbMF0sIFtvZmZzZXQsIHRoaXNdKTtcbiAgICAvLyBDb3B5IGRhdGEsIGxlYXZpbmcgb3V0IGFueSBob2xlc1xuICAgIGNvbnN0IGZ1bGwgPSB0aGlzLmxpbmtlci5kYXRhO1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLl9kYXRhID8/IGZhaWwoYE5vIGRhdGFgKTtcbiAgICB0aGlzLl9kYXRhID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHRoaXMuc3Vicy5zaXplKSB7XG4gICAgICBmdWxsLnNwbGljZShvZmZzZXQsIGRhdGEubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHNwYXJzZSA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgICAgIHNwYXJzZS5zZXQoMCwgZGF0YSk7XG4gICAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLnN1YnMpIHtcbiAgICAgICAgc3BhcnNlLnNwbGljZShzdWIub2Zmc2V0LCBzdWIuc2l6ZSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtzdGFydCwgY2h1bmtdIG9mIHNwYXJzZS5jaHVua3MoKSkge1xuICAgICAgICBmdWxsLnNldChvZmZzZXQgKyBzdGFydCwgLi4uY2h1bmspO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmdWxsLnNldChvZmZzZXQsIGRhdGEpO1xuICAgIH1cblxuICAgIC8vIFJldHJ5IHRoZSBmb2xsb3ctb25zXG4gICAgZm9yIChjb25zdCBbc3ViLCBjaHVua10gb2YgdGhpcy5mb2xsb3cpIHtcbiAgICAgIGNodW5rLnJlc29sdmVTdWIoc3ViLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgdGhpcy5saW5rZXIuZnJlZS5kZWxldGUodGhpcy5vZmZzZXQhLCB0aGlzLm9mZnNldCEgKyB0aGlzLnNpemUpO1xuICB9XG5cbiAgcmVzb2x2ZVN1YnMoaW5pdGlhbCA9IGZhbHNlKSB7IC8vOiBNYXA8bnVtYmVyLCBTdWJzdGl0dXRpb25bXT4ge1xuICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgc3Vicywgc2VlIHdoYXQgcHJvZ3JlcyB3ZSBjYW4gbWFrZT9cbiAgICAvLyByZXN1bHQ6IGxpc3Qgb2YgZGVwZW5kZW50IGNodW5rcy5cblxuICAgIC8vIE5PVEU6IGlmIHdlIGRlcGVuZCBvbiBvdXJzZWxmIHRoZW4gd2Ugd2lsbCByZXR1cm4gZW1wdHkgZGVwcyxcbiAgICAvLyAgICAgICBhbmQgbWF5IGJlIHBsYWNlZCBpbW1lZGlhdGVseSwgYnV0IHdpbGwgc3RpbGwgaGF2ZSBob2xlcy5cbiAgICAvLyAgICAgIC0gTk8sIGl0J3MgcmVzcG9uc2liaWxpdHkgb2YgY2FsbGVyIHRvIGNoZWNrIHRoYXRcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLnNlbGZTdWJzKSB7XG4gICAgICB0aGlzLnJlc29sdmVTdWIoc3ViLCBpbml0aWFsKTtcbiAgICB9XG5cbiAgICAvLyBjb25zdCBkZXBzID0gbmV3IFNldCgpO1xuICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc3Vicykge1xuICAgICAgLy8gY29uc3Qgc3ViRGVwcyA9IFxuICAgICAgdGhpcy5yZXNvbHZlU3ViKHN1YiwgaW5pdGlhbCk7XG4gICAgICAvLyBpZiAoIXN1YkRlcHMpIGNvbnRpbnVlO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXAgb2Ygc3ViRGVwcykge1xuICAgICAgLy8gICBsZXQgc3VicyA9IGRlcHMuZ2V0KGRlcCk7XG4gICAgICAvLyAgIGlmICghc3VicykgZGVwcy5zZXQoZGVwLCBzdWJzID0gW10pO1xuICAgICAgLy8gICBzdWJzLnB1c2goc3ViKTtcbiAgICAgIC8vIH1cbiAgICB9XG4gICAgLy8gaWYgKHRoaXMub3JnICE9IG51bGwpIHJldHVybiBuZXcgU2V0KCk7XG4gICAgLy8gcmV0dXJuIGRlcHM7XG4gIH1cblxuICBhZGREZXAoc3ViOiBTdWJzdGl0dXRpb24sIGRlcDogbnVtYmVyKSB7XG4gICAgaWYgKGRlcCA9PT0gdGhpcy5pbmRleCAmJiB0aGlzLnN1YnMuZGVsZXRlKHN1YikpIHRoaXMuc2VsZlN1YnMuYWRkKHN1Yik7XG4gICAgdGhpcy5saW5rZXIuY2h1bmtzW2RlcF0uZm9sbG93LnNldChzdWIsIHRoaXMpO1xuICAgIHRoaXMuZGVwcy5hZGQoZGVwKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBsaXN0IG9mIGRlcGVuZGVudCBjaHVua3MsIG9yIHVuZGVmaW5lZCBpZiBzdWNjZXNzZnVsLlxuICByZXNvbHZlU3ViKHN1YjogU3Vic3RpdHV0aW9uLCBpbml0aWFsOiBib29sZWFuKSB7IC8vOiBJdGVyYWJsZTxudW1iZXI+fHVuZGVmaW5lZCB7XG5cbiAgICAvLyBUT0RPIC0gcmVzb2x2ZShyZXNvbHZlcikgdmlhIGNodW5rRGF0YSB0byByZXNvbHZlIGJhbmtzISFcblxuXG4gICAgLy8gRG8gYSBmdWxsIHRyYXZlcnNlIG9mIHRoZSBleHByZXNzaW9uIC0gc2VlIHdoYXQncyBibG9ja2luZyB1cy5cbiAgICBpZiAoIXRoaXMuc3Vicy5oYXMoc3ViKSAmJiAhdGhpcy5zZWxmU3Vicy5oYXMoc3ViKSkgcmV0dXJuO1xuICAgIHN1Yi5leHByID0gRXhwci50cmF2ZXJzZShzdWIuZXhwciwgKGUsIHJlYywgcCkgPT4ge1xuICAgICAgLy8gRmlyc3QgaGFuZGxlIG1vc3QgY29tbW9uIGJhbmsgYnl0ZSBjYXNlLCBzaW5jZSBpdCB0cmlnZ2VycyBvbiBhXG4gICAgICAvLyBkaWZmZXJlbnQgdHlwZSBvZiByZXNvbHV0aW9uLlxuICAgICAgaWYgKGluaXRpYWwgJiYgcD8ub3AgPT09ICdeJyAmJiBwLmFyZ3MhLmxlbmd0aCA9PT0gMSAmJiBlLm1ldGEpIHtcbiAgICAgICAgaWYgKGUubWV0YS5iYW5rID09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLmFkZERlcChzdWIsIGUubWV0YS5jaHVuayEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlOyAvLyBza2lwIHJlY3Vyc2lvbiBlaXRoZXIgd2F5LlxuICAgICAgfVxuICAgICAgZSA9IHRoaXMubGlua2VyLnJlc29sdmVMaW5rKEV4cHIuZXZhbHVhdGUocmVjKGUpKSk7XG4gICAgICBpZiAoaW5pdGlhbCAmJiBlLm1ldGE/LnJlbCkgdGhpcy5hZGREZXAoc3ViLCBlLm1ldGEuY2h1bmshKTtcbiAgICAgIHJldHVybiBlO1xuICAgIH0pO1xuXG4gICAgLy8gUFJPQkxFTSAtIG9mZiBpcyByZWxhdGl2ZSB0byB0aGUgY2h1bmssIGJ1dCB3ZSB3YW50IHRvIGJlIGFibGUgdG9cbiAgICAvLyBzcGVjaWZ5IGFuIEFCU09MVVRFIG9yZyB3aXRoaW4gYSBzZWdtZW50Li4uIVxuICAgIC8vIEFuIGFic29sdXRlIG9mZnNldCB3aXRoaW4gdGhlIHdob2xlIG9yaWcgaXMgbm8gZ29vZCwgZWl0aGVyXG4gICAgLy8gd2FudCB0byB3cml0ZSBpdCBhcyAuc2VnbWVudCBcImZvb1wiOyBTeW0gPSAkMTIzNFxuICAgIC8vIENvdWxkIGFsc28ganVzdCBkbyAubW92ZSBjb3VudCwgXCJzZWdcIiwgJDEyMzQgYW5kIHN0b3JlIGEgc3BlY2lhbCBvcFxuICAgIC8vIHRoYXQgdXNlcyBib3RoIHN5bSBhbmQgbnVtP1xuXG4gICAgLy8gU2VlIGlmIHdlIGNhbiBkbyBpdCBpbW1lZGlhdGVseS5cbiAgICBsZXQgZGVsID0gZmFsc2U7XG4gICAgaWYgKHN1Yi5leHByLm9wID09PSAnbnVtJyAmJiAhc3ViLmV4cHIubWV0YT8ucmVsKSB7XG4gICAgICB0aGlzLndyaXRlVmFsdWUoc3ViLm9mZnNldCwgc3ViLmV4cHIubnVtISwgc3ViLnNpemUpO1xuICAgICAgZGVsID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHN1Yi5leHByLm9wID09PSAnLm1vdmUnKSB7XG4gICAgICBpZiAoc3ViLmV4cHIuYXJncyEubGVuZ3RoICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCAubW92ZWApO1xuICAgICAgY29uc3QgY2hpbGQgPSBzdWIuZXhwci5hcmdzIVswXTtcbiAgICAgIGlmIChjaGlsZC5vcCA9PT0gJ251bScgJiYgY2hpbGQubWV0YT8ub2Zmc2V0ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBjaGlsZC5tZXRhIS5vZmZzZXQhICsgY2hpbGQubnVtITtcbiAgICAgICAgY29uc3Qgc2xpY2UgPSB0aGlzLmxpbmtlci5vcmlnLnNsaWNlKHN0YXJ0LCBzdGFydCArIHN1Yi5zaXplKTtcbiAgICAgICAgdGhpcy53cml0ZUJ5dGVzKHN1Yi5vZmZzZXQsIFVpbnQ4QXJyYXkuZnJvbShzbGljZSkpO1xuICAgICAgICBkZWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVsKSB7XG4gICAgICB0aGlzLnN1YnMuZGVsZXRlKHN1YikgfHwgdGhpcy5zZWxmU3Vicy5kZWxldGUoc3ViKTtcbiAgICAgIGlmICghdGhpcy5zdWJzLnNpemUpIHsgLy8gTkVXOiBpZ25vcmVzIHNlbGYtc3VicyBub3dcbiAgICAgIC8vIGlmICghdGhpcy5zdWJzLnNpemUgfHwgKGRlcHMuc2l6ZSA9PT0gMSAmJiBkZXBzLmhhcyh0aGlzLmluZGV4KSkpICB7XG4gICAgICAgIC8vIGFkZCB0byByZXNvbHZlZCBxdWV1ZSAtIHJlYWR5IHRvIGJlIHBsYWNlZCFcbiAgICAgICAgLy8gUXVlc3Rpb246IHNob3VsZCB3ZSBwbGFjZSBpdCByaWdodCBhd2F5PyAgV2UgcGxhY2UgdGhlIGZpeGVkIGNodW5rc1xuICAgICAgICAvLyBpbW1lZGlhdGVseSBpbiB0aGUgY3RvciwgYnV0IHRoZXJlJ3Mgbm8gY2hvaWNlIHRvIGRlZmVyLiAgRm9yIHJlbG9jXG4gICAgICAgIC8vIGNodW5rcywgaXQncyBiZXR0ZXIgdG8gd2FpdCB1bnRpbCB3ZSd2ZSByZXNvbHZlZCBhcyBtdWNoIGFzIHBvc3NpYmxlXG4gICAgICAgIC8vIGJlZm9yZSBwbGFjaW5nIGFueXRoaW5nLiAgRm9ydHVuYXRlbHksIHBsYWNpbmcgYSBjaHVuayB3aWxsXG4gICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgcmVzb2x2ZSBhbGwgZGVwcyBub3chXG4gICAgICAgIGlmICh0aGlzLmxpbmtlci51bnJlc29sdmVkQ2h1bmtzLmRlbGV0ZSh0aGlzKSkge1xuICAgICAgICAgIHRoaXMubGlua2VyLmluc2VydFJlc29sdmVkKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgd3JpdGVCeXRlcyhvZmZzZXQ6IG51bWJlciwgYnl0ZXM6IFVpbnQ4QXJyYXkpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YS5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGJ5dGVzLmxlbmd0aCkuc2V0KGJ5dGVzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX29mZnNldCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmxpbmtlci5kYXRhLnNldCh0aGlzLl9vZmZzZXQgKyBvZmZzZXQsIGJ5dGVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVWYWx1ZShvZmZzZXQ6IG51bWJlciwgdmFsOiBudW1iZXIsIHNpemU6IG51bWJlcikge1xuICAgIC8vIFRPRE8gLSB0aGlzIGlzIGFsbW9zdCBlbnRpcmVseSBjb3BpZWQgZnJvbSBwcm9jZXNzb3Igd3JpdGVOdW1iZXJcbiAgICBjb25zdCBiaXRzID0gKHNpemUpIDw8IDM7XG4gICAgaWYgKHZhbCAhPSBudWxsICYmICh2YWwgPCAoLTEgPDwgYml0cykgfHwgdmFsID49ICgxIDw8IGJpdHMpKSkge1xuICAgICAgY29uc3QgbmFtZSA9IFsnYnl0ZScsICd3b3JkJywgJ2ZhcndvcmQnLCAnZHdvcmQnXVtzaXplIC0gMV07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBhICR7bmFtZX06ICQke3ZhbC50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGJ5dGVzW2ldID0gdmFsICYgMHhmZjtcbiAgICAgIHZhbCA+Pj0gODtcbiAgICB9XG4gICAgdGhpcy53cml0ZUJ5dGVzKG9mZnNldCwgYnl0ZXMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVN1YihzOiBTdWJzdGl0dXRpb24sIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBTdWJzdGl0dXRpb24ge1xuICBzID0gey4uLnN9O1xuICBzLmV4cHIgPSB0cmFuc2xhdGVFeHByKHMuZXhwciwgZGMsIGRzKTtcbiAgcmV0dXJuIHM7XG59XG5mdW5jdGlvbiB0cmFuc2xhdGVFeHByKGU6IEV4cHIsIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBFeHByIHtcbiAgZSA9IHsuLi5lfTtcbiAgaWYgKGUubWV0YSkgZS5tZXRhID0gey4uLmUubWV0YX07XG4gIGlmIChlLmFyZ3MpIGUuYXJncyA9IGUuYXJncy5tYXAoYSA9PiB0cmFuc2xhdGVFeHByKGEsIGRjLCBkcykpO1xuICBpZiAoZS5tZXRhPy5jaHVuayAhPSBudWxsKSBlLm1ldGEuY2h1bmsgKz0gZGM7XG4gIGlmIChlLm9wID09PSAnc3ltJyAmJiBlLm51bSAhPSBudWxsKSBlLm51bSArPSBkcztcbiAgcmV0dXJuIGU7XG59XG5mdW5jdGlvbiB0cmFuc2xhdGVTeW1ib2woczogU3ltYm9sLCBkYzogbnVtYmVyLCBkczogbnVtYmVyKTogU3ltYm9sIHtcbiAgcyA9IHsuLi5zfTtcbiAgaWYgKHMuZXhwcikgcy5leHByID0gdHJhbnNsYXRlRXhwcihzLmV4cHIsIGRjLCBkcyk7XG4gIHJldHVybiBzO1xufVxuXG4vLyBUaGlzIGNsYXNzIGlzIHNpbmdsZS11c2UuXG5jbGFzcyBMaW5rIHtcbiAgZGF0YSA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgb3JpZyA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgLy8gTWFwcyBzeW1ib2wgdG8gc3ltYm9sICMgLy8gW3N5bWJvbCAjLCBkZXBlbmRlbnQgY2h1bmtzXVxuICBleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTsgLy8gcmVhZG9ubHkgW251bWJlciwgU2V0PG51bWJlcj5dPigpO1xuICBjaHVua3M6IExpbmtDaHVua1tdID0gW107XG4gIHN5bWJvbHM6IFN5bWJvbFtdID0gW107XG4gIGZyZWUgPSBuZXcgSW50ZXJ2YWxTZXQoKTtcbiAgcmF3U2VnbWVudHMgPSBuZXcgTWFwPHN0cmluZywgU2VnbWVudFtdPigpO1xuICBzZWdtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBMaW5rU2VnbWVudD4oKTtcblxuICByZXNvbHZlZENodW5rczogTGlua0NodW5rW10gPSBbXTtcbiAgdW5yZXNvbHZlZENodW5rcyA9IG5ldyBTZXQ8TGlua0NodW5rPigpO1xuXG4gIHdhdGNoZXM6IG51bWJlcltdID0gW107IC8vIGRlYnVnZ2luZyBhaWQ6IG9mZnNldHMgdG8gd2F0Y2guXG4gIHBsYWNlZDogQXJyYXk8W251bWJlciwgTGlua0NodW5rXT4gPSBbXTtcblxuICAvLyBUT0RPIC0gZGVmZXJyZWQgLSBzdG9yZSBzb21lIHNvcnQgb2YgZGVwZW5kZW5jeSBncmFwaD9cblxuICBpbnNlcnRSZXNvbHZlZChjaHVuazogTGlua0NodW5rKSB7XG4gICAgYmluYXJ5SW5zZXJ0KHRoaXMucmVzb2x2ZWRDaHVua3MsIGMgPT4gYy5zaXplLCBjaHVuayk7XG4gIH1cblxuICBiYXNlKGRhdGE6IFVpbnQ4QXJyYXksIG9mZnNldCA9IDApIHtcbiAgICB0aGlzLmRhdGEuc2V0KG9mZnNldCwgZGF0YSk7XG4gICAgdGhpcy5vcmlnLnNldChvZmZzZXQsIGRhdGEpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZTogTW9kdWxlKSB7XG4gICAgY29uc3QgZGMgPSB0aGlzLmNodW5rcy5sZW5ndGg7XG4gICAgY29uc3QgZHMgPSB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICAgIC8vIHNlZ21lbnRzIGNvbWUgZmlyc3QsIHNpbmNlIExpbmtDaHVuayBjb25zdHJ1Y3RvciBuZWVkcyB0aGVtXG4gICAgZm9yIChjb25zdCBzZWdtZW50IG9mIGZpbGUuc2VnbWVudHMgfHwgW10pIHtcbiAgICAgIHRoaXMuYWRkUmF3U2VnbWVudChzZWdtZW50KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBmaWxlLmNodW5rcyB8fCBbXSkge1xuICAgICAgY29uc3QgbGMgPSBuZXcgTGlua0NodW5rKHRoaXMsIHRoaXMuY2h1bmtzLmxlbmd0aCwgY2h1bmssIGRjLCBkcyk7XG4gICAgICB0aGlzLmNodW5rcy5wdXNoKGxjKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgZmlsZS5zeW1ib2xzIHx8IFtdKSB7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh0cmFuc2xhdGVTeW1ib2woc3ltYm9sLCBkYywgZHMpKTtcbiAgICB9XG4gICAgLy8gVE9ETyAtIHdoYXQgdGhlIGhlY2sgZG8gd2UgZG8gd2l0aCBzZWdtZW50cz9cbiAgICAvLyAgICAgIC0gaW4gcGFydGljdWxhciwgd2hvIGlzIHJlc3BvbnNpYmxlIGZvciBkZWZpbmluZyB0aGVtPz8/XG5cbiAgICAvLyBCYXNpYyBpZGVhOlxuICAgIC8vICAxLiBnZXQgYWxsIHRoZSBjaHVua3NcbiAgICAvLyAgMi4gYnVpbGQgdXAgYSBkZXBlbmRlbmN5IGdyYXBoXG4gICAgLy8gIDMuIHdyaXRlIGFsbCBmaXhlZCBjaHVua3MsIG1lbW9pemluZyBhYnNvbHV0ZSBvZmZzZXRzIG9mXG4gICAgLy8gICAgIG1pc3Npbmcgc3VicyAodGhlc2UgYXJlIG5vdCBlbGlnaWJsZSBmb3IgY29hbGVzY2luZykuXG4gICAgLy8gICAgIC0tIHByb2JhYmx5IHNhbWUgdHJlYXRtZW50IGZvciBmcmVlZCBzZWN0aW9uc1xuICAgIC8vICA0LiBmb3IgcmVsb2MgY2h1bmtzLCBmaW5kIHRoZSBiaWdnZXN0IGNodW5rIHdpdGggbm8gZGVwcy5cbiAgfVxuXG4gIC8vIHJlc29sdmVDaHVuayhjaHVuazogTGlua0NodW5rKSB7XG4gIC8vICAgLy9pZiAoY2h1bmsucmVzb2x2aW5nKSByZXR1cm47IC8vIGJyZWFrIGFueSBjeWNsZXNcbiAgICBcbiAgLy8gfVxuXG4gIHJlc29sdmVMaW5rKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgICBpZiAoZXhwci5vcCA9PT0gJy5vcmlnJyAmJiBleHByLmFyZ3M/Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3QgY2hpbGQgPSBleHByLmFyZ3NbMF07XG4gICAgICBjb25zdCBvZmZzZXQgPSBjaGlsZC5tZXRhPy5vZmZzZXQ7XG4gICAgICBpZiAob2Zmc2V0ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgbnVtID0gdGhpcy5vcmlnLmdldChvZmZzZXQgKyBjaGlsZC5udW0hKTtcbiAgICAgICAgaWYgKG51bSAhPSBudWxsKSByZXR1cm4ge29wOiAnbnVtJywgbnVtfTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV4cHIub3AgPT09ICdudW0nICYmIGV4cHIubWV0YT8uY2h1bmsgIT0gbnVsbCkge1xuICAgICAgY29uc3QgbWV0YSA9IGV4cHIubWV0YTtcbiAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbbWV0YS5jaHVuayFdO1xuICAgICAgaWYgKGNodW5rLm9yZyAhPT0gbWV0YS5vcmcgfHxcbiAgICAgICAgICBjaHVuay5zZWdtZW50Py5iYW5rICE9PSBtZXRhLmJhbmsgfHxcbiAgICAgICAgICBjaHVuay5vZmZzZXQgIT09IG1ldGEub2Zmc2V0KSB7XG4gICAgICAgIGNvbnN0IG1ldGEyID0ge1xuICAgICAgICAgIG9yZzogY2h1bmsub3JnLFxuICAgICAgICAgIG9mZnNldDogY2h1bmsub2Zmc2V0LFxuICAgICAgICAgIGJhbms6IGNodW5rLnNlZ21lbnQ/LmJhbmssXG4gICAgICAgIH07XG4gICAgICAgIGV4cHIgPSBFeHByLmV2YWx1YXRlKHsuLi5leHByLCBtZXRhOiB7Li4ubWV0YSwgLi4ubWV0YTJ9fSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgLy8gTk9URTogc28gZmFyIHRoaXMgaXMgb25seSB1c2VkIGZvciBhc3NlcnRzP1xuICAvLyBJdCBiYXNpY2FsbHkgY29weS1wYXN0ZXMgZnJvbSByZXNvbHZlU3Vicy4uLiA6LShcblxuICByZXNvbHZlRXhwcihleHByOiBFeHByKTogbnVtYmVyIHtcbiAgICBleHByID0gRXhwci50cmF2ZXJzZShleHByLCAoZSwgcmVjKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlTGluayhFeHByLmV2YWx1YXRlKHJlYyhlKSkpO1xuICAgIH0pO1xuXG4gICAgaWYgKGV4cHIub3AgPT09ICdudW0nICYmICFleHByLm1ldGE/LnJlbCkgcmV0dXJuIGV4cHIubnVtITtcbiAgICBjb25zdCBhdCA9IFRva2VuLmF0KGV4cHIpO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZ1bGx5IHJlc29sdmUgZXhwciR7YXR9YCk7XG4gIH1cblxuICBsaW5rKCk6IFNwYXJzZUJ5dGVBcnJheSB7XG4gICAgLy8gQnVpbGQgdXAgdGhlIExpbmtTZWdtZW50IG9iamVjdHNcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBzZWdtZW50c10gb2YgdGhpcy5yYXdTZWdtZW50cykge1xuICAgICAgbGV0IHMgPSBzZWdtZW50c1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcyA9IFNlZ21lbnQubWVyZ2Uocywgc2VnbWVudHNbaV0pO1xuICAgICAgfVxuICAgICAgdGhpcy5zZWdtZW50cy5zZXQobmFtZSwgbmV3IExpbmtTZWdtZW50KHMpKTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmcmVlIHNwYWNlXG4gICAgZm9yIChjb25zdCBbbmFtZSwgc2VnbWVudHNdIG9mIHRoaXMucmF3U2VnbWVudHMpIHtcbiAgICAgIGNvbnN0IHMgPSB0aGlzLnNlZ21lbnRzLmdldChuYW1lKSE7XG4gICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAgICAgY29uc3QgZnJlZSA9IHNlZ21lbnQuZnJlZTtcbiAgICAgICAgLy8gQWRkIHRoZSBmcmVlIHNwYWNlXG4gICAgICAgIGZvciAoY29uc3QgW3N0YXJ0LCBlbmRdIG9mIGZyZWUgfHwgW10pIHtcbiAgICAgICAgICB0aGlzLmZyZWUuYWRkKHN0YXJ0ICsgcy5kZWx0YSwgZW5kICsgcy5kZWx0YSk7XG4gICAgICAgICAgdGhpcy5kYXRhLnNwbGljZShzdGFydCArIHMuZGVsdGEsIGVuZCAtIHN0YXJ0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBTZXQgdXAgYWxsIHRoZSBpbml0aWFsIHBsYWNlbWVudHMuXG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzLmNodW5rcykge1xuICAgICAgY2h1bmsuaW5pdGlhbFBsYWNlbWVudCgpO1xuICAgIH1cbiAgICBpZiAoREVCVUcpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBJbml0aWFsOlxcbiR7dGhpcy5yZXBvcnQodHJ1ZSl9YCk7XG4gICAgfVxuICAgIC8vIEZpbmQgYWxsIHRoZSBleHBvcnRzLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnN5bWJvbHNbaV07XG4gICAgICAvLyBUT0RPIC0gd2UnZCByZWFsbHkgbGlrZSB0byBpZGVudGlmeSB0aGlzIGVhcmxpZXIgaWYgYXQgYWxsIHBvc3NpYmxlIVxuICAgICAgaWYgKCFzeW1ib2wuZXhwcikgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJHtpfSBuZXZlciByZXNvbHZlZGApO1xuICAgICAgLy8gbG9vayBmb3IgaW1wb3J0cy9leHBvcnRzXG4gICAgICBpZiAoc3ltYm9sLmV4cG9ydCAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuZXhwb3J0cy5zZXQoc3ltYm9sLmV4cG9ydCwgaSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlc29sdmUgYWxsIHRoZSBpbXBvcnRzIGluIGFsbCBzeW1ib2wgYW5kIGNodW5rLnN1YnMgZXhwcnMuXG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5zeW1ib2xzKSB7XG4gICAgICBzeW1ib2wuZXhwciA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoc3ltYm9sLmV4cHIhKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzLmNodW5rcykge1xuICAgICAgZm9yIChjb25zdCBzdWIgb2YgWy4uLmNodW5rLnN1YnMsIC4uLmNodW5rLnNlbGZTdWJzXSkge1xuICAgICAgICBzdWIuZXhwciA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoc3ViLmV4cHIpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaHVuay5hc3NlcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNodW5rLmFzc2VydHNbaV0gPSB0aGlzLnJlc29sdmVTeW1ib2xzKGNodW5rLmFzc2VydHNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBdCB0aGlzIHBvaW50LCB3ZSBkb24ndCBjYXJlIGFib3V0IHRoaXMuc3ltYm9scyBhdCBhbGwgYW55bW9yZS5cbiAgICAvLyBOb3cgZmlndXJlIG91dCB0aGUgZnVsbCBkZXBlbmRlbmN5IHRyZWU6IGNodW5rICNYIHJlcXVpcmVzIGNodW5rICNZXG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBjLnJlc29sdmVTdWJzKHRydWUpO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBmaWxsICh1bilyZXNvbHZlZENodW5rc1xuICAgIC8vICAgLSBnZXRzIFxuXG4gICAgY29uc3QgY2h1bmtzID0gWy4uLnRoaXMuY2h1bmtzXTtcbiAgICBjaHVua3Muc29ydCgoYSwgYikgPT4gYi5zaXplIC0gYS5zaXplKTtcblxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XG4gICAgICBjaHVuay5yZXNvbHZlU3VicygpO1xuICAgICAgaWYgKGNodW5rLnN1YnMuc2l6ZSkge1xuICAgICAgICB0aGlzLnVucmVzb2x2ZWRDaHVua3MuYWRkKGNodW5rKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0UmVzb2x2ZWQoY2h1bmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb3VudCA9IHRoaXMucmVzb2x2ZWRDaHVua3MubGVuZ3RoICsgMiAqIHRoaXMudW5yZXNvbHZlZENodW5rcy5zaXplO1xuICAgIHdoaWxlIChjb3VudCkge1xuICAgICAgY29uc3QgYyA9IHRoaXMucmVzb2x2ZWRDaHVua3MucG9wKCk7XG4gICAgICBpZiAoYykge1xuICAgICAgICB0aGlzLnBsYWNlQ2h1bmsoYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXNvbHZlIGFsbCB0aGUgZmlyc3QgdW5yZXNvbHZlZCBjaHVua3MnIGRlcHNcbiAgICAgICAgY29uc3QgW2ZpcnN0XSA9IHRoaXMudW5yZXNvbHZlZENodW5rcztcbiAgICAgICAgZm9yIChjb25zdCBkZXAgb2YgZmlyc3QuZGVwcykge1xuICAgICAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbZGVwXTtcbiAgICAgICAgICBpZiAoY2h1bmsub3JnID09IG51bGwpIHRoaXMucGxhY2VDaHVuayhjaHVuayk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnJlc29sdmVkQ2h1bmtzLmxlbmd0aCArIDIgKiB0aGlzLnVucmVzb2x2ZWRDaHVua3Muc2l6ZTtcbiAgICAgIGlmIChuZXh0ID09PSBjb3VudCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMucmVzb2x2ZWRDaHVua3MsIHRoaXMudW5yZXNvbHZlZENodW5rcyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IG1ha2luZyBwcm9ncmVzc2ApO1xuICAgICAgfVxuICAgICAgY291bnQgPSBuZXh0O1xuICAgIH1cblxuICAgIC8vIGlmICghY2h1bmsub3JnICYmICFjaHVuay5zdWJzLmxlbmd0aCkgdGhpcy5wbGFjZUNodW5rKGNodW5rKTtcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQgdGhlIGRlcCBncmFwaCBpcyBidWlsdCAtIG5vdyB0cmF2ZXJzZSBpdC5cblxuICAgIC8vIGNvbnN0IHBsYWNlID0gKGk6IG51bWJlcikgPT4ge1xuICAgIC8vICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tpXTtcbiAgICAvLyAgIGlmIChjaHVuay5vcmcgIT0gbnVsbCkgcmV0dXJuO1xuICAgIC8vICAgLy8gcmVzb2x2ZSBmaXJzdFxuICAgIC8vICAgY29uc3QgcmVtYWluaW5nOiBTdWJzdGl0dXRpb25bXSA9IFtdO1xuICAgIC8vICAgZm9yIChjb25zdCBzdWIgb2YgY2h1bmsuc3Vicykge1xuICAgIC8vICAgICBpZiAodGhpcy5yZXNvbHZlU3ViKGNodW5rLCBzdWIpKSByZW1haW5pbmcucHVzaChzdWIpO1xuICAgIC8vICAgfVxuICAgIC8vICAgY2h1bmsuc3VicyA9IHJlbWFpbmluZztcbiAgICAvLyAgIC8vIG5vdyBwbGFjZSB0aGUgY2h1bmtcbiAgICAvLyAgIHRoaXMucGxhY2VDaHVuayhjaHVuayk7IC8vIFRPRE8gLi4uXG4gICAgLy8gICAvLyB1cGRhdGUgdGhlIGdyYXBoOyBkb24ndCBib3RoZXIgZGVsZXRpbmcgZm9ybSBibG9ja2VkLlxuICAgIC8vICAgZm9yIChjb25zdCByZXZEZXAgb2YgcmV2RGVwc1tpXSkge1xuICAgIC8vICAgICBjb25zdCBmd2QgPSBmd2REZXBzW3JldkRlcF07XG4gICAgLy8gICAgIGZ3ZC5kZWxldGUoaSk7XG4gICAgLy8gICAgIGlmICghZndkLnNpemUpIGluc2VydCh1bmJsb2NrZWQsIHJldkRlcCk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIC8vIHdoaWxlICh1bmJsb2NrZWQubGVuZ3RoIHx8IGJsb2NrZWQubGVuZ3RoKSB7XG4gICAgLy8gICBsZXQgbmV4dCA9IHVuYmxvY2tlZC5zaGlmdCgpO1xuICAgIC8vICAgaWYgKG5leHQpIHtcbiAgICAvLyAgICAgcGxhY2UobmV4dCk7XG4gICAgLy8gICAgIGNvbnRpbnVlO1xuICAgIC8vICAgfVxuICAgIC8vICAgbmV4dCA9IGJsb2NrZWRbMF07XG4gICAgLy8gICBmb3IgKGNvbnN0IHJldiBvZiByZXZEZXBzW25leHRdKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLmNodW5rc1tyZXZdLm9yZyAhPSBudWxsKSB7IC8vIGFscmVhZHkgcGxhY2VkXG4gICAgLy8gICAgICAgYmxvY2tlZC5zaGlmdCgpO1xuICAgIC8vICAgICAgIGNvbnRpbnVlO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHBsYWNlKHJldik7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIGV2ZXJ5dGhpbmcgc2hvdWxkIGJlIHBsYWNlZCwgc28gZG8gb25lIGxhc3QgcmVzb2x2ZS5cblxuICAgIGNvbnN0IHBhdGNoID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLmNodW5rcykge1xuICAgICAgZm9yIChjb25zdCBhIG9mIGMuYXNzZXJ0cykge1xuICAgICAgICBjb25zdCB2ID0gdGhpcy5yZXNvbHZlRXhwcihhKTtcbiAgICAgICAgaWYgKHYpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBhdCA9IFRva2VuLmF0KGEpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbiBmYWlsZWQke2F0fWApO1xuICAgICAgfVxuICAgICAgaWYgKGMub3ZlcmxhcHMpIGNvbnRpbnVlO1xuICAgICAgcGF0Y2guc2V0KGMub2Zmc2V0ISwgLi4udGhpcy5kYXRhLnNsaWNlKGMub2Zmc2V0ISwgYy5vZmZzZXQhICsgYy5zaXplISkpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0Y2g7XG4gIH1cblxuICBwbGFjZUNodW5rKGNodW5rOiBMaW5rQ2h1bmspIHtcbiAgICBpZiAoY2h1bmsub3JnICE9IG51bGwpIHJldHVybjsgLy8gZG9uJ3QgcmUtcGxhY2UuXG4gICAgY29uc3Qgc2l6ZSA9IGNodW5rLnNpemU7XG4gICAgaWYgKCFjaHVuay5zdWJzLnNpemUgJiYgIWNodW5rLnNlbGZTdWJzLnNpemUpIHtcbiAgICAgIC8vIGNodW5rIGlzIHJlc29sdmVkOiBzZWFyY2ggZm9yIGFuIGV4aXN0aW5nIGNvcHkgb2YgaXQgZmlyc3RcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSB0aGlzLmRhdGEucGF0dGVybihjaHVuay5kYXRhKTtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBjaHVuay5zZWdtZW50cykge1xuICAgICAgICBjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgICBjb25zdCBzdGFydCA9IHNlZ21lbnQub2Zmc2V0ITtcbiAgICAgICAgY29uc3QgZW5kID0gc3RhcnQgKyBzZWdtZW50LnNpemUhO1xuICAgICAgICBjb25zdCBpbmRleCA9IHBhdHRlcm4uc2VhcmNoKHN0YXJ0LCBlbmQpO1xuICAgICAgICBpZiAoaW5kZXggPCAwKSBjb250aW51ZTtcbiAgICAgICAgY2h1bmsucGxhY2UoaW5kZXggLSBzZWdtZW50LmRlbHRhLCBzZWdtZW50KTtcbiAgICAgICAgY2h1bmsub3ZlcmxhcHMgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGVpdGhlciB1bnJlc29sdmVkLCBvciBkaWRuJ3QgZmluZCBhIG1hdGNoOyBqdXN0IGFsbG9jYXRlIHNwYWNlLlxuICAgIC8vIGxvb2sgZm9yIHRoZSBzbWFsbGVzdCBwb3NzaWJsZSBmcmVlIGJsb2NrLlxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjaHVuay5zZWdtZW50cykge1xuICAgICAgY29uc3Qgc2VnbWVudCA9IHRoaXMuc2VnbWVudHMuZ2V0KG5hbWUpITtcbiAgICAgIGNvbnN0IHMwID0gc2VnbWVudC5vZmZzZXQhO1xuICAgICAgY29uc3QgczEgPSBzMCArIHNlZ21lbnQuc2l6ZSE7XG4gICAgICBsZXQgZm91bmQ6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBsZXQgc21hbGxlc3QgPSBJbmZpbml0eTtcbiAgICAgIGZvciAoY29uc3QgW2YwLCBmMV0gb2YgdGhpcy5mcmVlLnRhaWwoczApKSB7XG4gICAgICAgIGlmIChmMCA+PSBzMSkgYnJlYWs7XG4gICAgICAgIGNvbnN0IGRmID0gTWF0aC5taW4oZjEsIHMxKSAtIGYwO1xuICAgICAgICBpZiAoZGYgPCBzaXplKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGRmIDwgc21hbGxlc3QpIHtcbiAgICAgICAgICBmb3VuZCA9IGYwO1xuICAgICAgICAgIHNtYWxsZXN0ID0gZGY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCAhPSBudWxsKSB7XG4gICAgICAgIC8vIGZvdW5kIGEgcmVnaW9uXG4gICAgICAgIGNodW5rLnBsYWNlKGZvdW5kIC0gc2VnbWVudC5kZWx0YSwgc2VnbWVudCk7XG4gICAgICAgIC8vIHRoaXMuZnJlZS5kZWxldGUoZjAsIGYwICsgc2l6ZSk7XG4gICAgICAgIC8vIFRPRE8gLSBmYWN0b3Igb3V0IHRoZSBzdWJzLWF3YXJlIGNvcHkgbWV0aG9kIVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKGBBZnRlciBmaWxsaW5nOlxcbiR7dGhpcy5yZXBvcnQodHJ1ZSl9YCk7XG4gICAgY29uc3QgbmFtZSA9IGNodW5rLm5hbWUgPyBgJHtjaHVuay5uYW1lfSBgIDogJyc7XG4gICAgY29uc29sZS5sb2codGhpcy5zZWdtZW50cy5nZXQoY2h1bmsuc2VnbWVudHNbMF0pKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHNwYWNlIGZvciAke3NpemV9LWJ5dGUgY2h1bmsgJHtuYW1lfWluICR7XG4gICAgICAgICAgICAgICAgICAgICBjaHVuay5zZWdtZW50cy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgcmVzb2x2ZVN5bWJvbHMoZXhwcjogRXhwcik6IEV4cHIge1xuICAgIC8vIHByZS10cmF2ZXJzZSBzbyB0aGF0IHRyYW5zaXRpdmUgaW1wb3J0cyB3b3JrXG4gICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgd2hpbGUgKGUub3AgPT09ICdpbScgfHwgZS5vcCA9PT0gJ3N5bScpIHtcbiAgICAgICAgaWYgKGUub3AgPT09ICdpbScpIHtcbiAgICAgICAgICBjb25zdCBuYW1lID0gZS5zeW0hO1xuICAgICAgICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5leHBvcnRzLmdldChuYW1lKTtcbiAgICAgICAgICBpZiAoaW1wb3J0ZWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgYXQgPSBUb2tlbi5hdChleHByKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU3ltYm9sIG5ldmVyIGV4cG9ydGVkICR7bmFtZX0ke2F0fWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlID0gdGhpcy5zeW1ib2xzW2ltcG9ydGVkXS5leHByITtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZS5udW0gPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgbm90IGdsb2JhbGApO1xuICAgICAgICAgIGUgPSB0aGlzLnN5bWJvbHNbZS5udW1dLmV4cHIhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gRXhwci5ldmFsdWF0ZShyZWMoZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcmVzb2x2ZUJhbmtCeXRlcyhleHByOiBFeHByKTogRXhwciB7XG4gIC8vICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGU6IEV4cHIpID0+IHtcbiAgLy8gICAgIGlmIChlLm9wICE9PSAnXicgfHwgZS5hcmdzPy5sZW5ndGggIT09IDEpIHJldHVybiBlO1xuICAvLyAgICAgY29uc3QgY2hpbGQgPSBlLmFyZ3NbMF07XG4gIC8vICAgICBpZiAoY2hpbGQub3AgIT09ICdvZmYnKSByZXR1cm4gZTtcbiAgLy8gICAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbY2hpbGQubnVtIV07XG4gIC8vICAgICBjb25zdCBiYW5rcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyAgICAgZm9yIChjb25zdCBzIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gIC8vICAgICAgIGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzLmdldChzKTtcbiAgLy8gICAgICAgaWYgKHNlZ21lbnQ/LmJhbmsgIT0gbnVsbCkgYmFua3MuYWRkKHNlZ21lbnQuYmFuayk7XG4gIC8vICAgICB9XG4gIC8vICAgICBpZiAoYmFua3Muc2l6ZSAhPT0gMSkgcmV0dXJuIGU7XG4gIC8vICAgICBjb25zdCBbYl0gPSBiYW5rcztcbiAgLy8gICAgIHJldHVybiB7b3A6ICdudW0nLCBzaXplOiAxLCBudW06IGJ9O1xuICAvLyAgIH0pO1xuICAvLyB9XG5cbiAgLy8gICAgIGlmIChleHByLm9wID09PSAnaW1wb3J0Jykge1xuICAvLyAgICAgICBpZiAoIWV4cHIuc3ltKSB0aHJvdyBuZXcgRXJyb3IoYEltcG9ydCB3aXRoIG5vIHN5bWJvbC5gKTtcbiAgLy8gICAgICAgY29uc3Qgc3ltID0gdGhpcy5zeW1ib2xzW3RoaXMuZXhwb3J0cy5nZXQoZXhwci5zeW0pXTtcbiAgLy8gICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUltcG9ydHMoc3ltLmV4cHIpO1xuICAvLyAgICAgfVxuICAvLyAgICAgLy8gVE9ETyAtIHRoaXMgaXMgbm9uc2Vuc2UuLi5cbiAgLy8gICAgIGNvbnN0IGFyZ3MgPSBbXTtcbiAgLy8gICAgIGxldCBtdXQgPSBmYWxzZTtcbiAgLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwci5hcmdzOyBpKyspIHtcbiAgLy8gICAgICAgY29uc3QgY2hpbGQgPSBleHByLmFyZ3NbaV07XG4gIC8vICAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlSW1wb3J0cyhjaGlsZCk7XG4gIC8vICAgICAgIGFyZ3MucHVzaChyZXNvbHZlZCk7XG4gIC8vICAgICAgIGlmIChjaGlsZCAhPT0gcmVzb2x2ZWQpIGV4cHIuYXJnc1tpXSA9IHJlc29sdmVkO1xuICAvLyAgICAgICByZXR1cm4gXG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIC8vIFRPRE8gLSBhZGQgYWxsIHRoZSB0aGluZ3NcbiAgLy8gICByZXR1cm4gcGF0Y2g7XG4gIC8vIH1cblxuICBhZGRSYXdTZWdtZW50KHNlZ21lbnQ6IFNlZ21lbnQpIHtcbiAgICBsZXQgbGlzdCA9IHRoaXMucmF3U2VnbWVudHMuZ2V0KHNlZ21lbnQubmFtZSk7XG4gICAgaWYgKCFsaXN0KSB0aGlzLnJhd1NlZ21lbnRzLnNldChzZWdtZW50Lm5hbWUsIGxpc3QgPSBbXSk7XG4gICAgbGlzdC5wdXNoKHNlZ21lbnQpO1xuICB9XG5cbiAgYnVpbGRFeHBvcnRzKCk6IE1hcDxzdHJpbmcsIEV4cG9ydD4ge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFeHBvcnQ+KCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5zeW1ib2xzKSB7XG4gICAgICBpZiAoIXN5bWJvbC5leHBvcnQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZSA9IEV4cHIudHJhdmVyc2Uoc3ltYm9sLmV4cHIhLCAoZSwgcmVjKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVMaW5rKEV4cHIuZXZhbHVhdGUocmVjKGUpKSk7XG4gICAgICB9KTtcbiAgICAgIGlmIChlLm9wICE9PSAnbnVtJykgdGhyb3cgbmV3IEVycm9yKGBuZXZlciByZXNvbHZlZDogJHtzeW1ib2wuZXhwb3J0fWApO1xuICAgICAgY29uc3QgdmFsdWUgPSBlLm51bSE7XG4gICAgICBjb25zdCBvdXQ6IEV4cG9ydCA9IHt2YWx1ZX07XG4gICAgICBpZiAoZS5tZXRhPy5vZmZzZXQgIT0gbnVsbCAmJiBlLm1ldGEub3JnICE9IG51bGwpIHtcbiAgICAgICAgb3V0Lm9mZnNldCA9IGUubWV0YS5vZmZzZXQgKyB2YWx1ZSAtIGUubWV0YS5vcmc7XG4gICAgICB9XG4gICAgICBpZiAoZS5tZXRhPy5iYW5rICE9IG51bGwpIG91dC5iYW5rID0gZS5tZXRhLmJhbms7XG4gICAgICBtYXAuc2V0KHN5bWJvbC5leHBvcnQsIG91dCk7XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICByZXBvcnQodmVyYm9zZSA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICAvLyBUT0RPIC0gYWNjZXB0IGEgc2VnbWVudCB0byBmaWx0ZXI/XG4gICAgbGV0IG91dCA9ICcnO1xuICAgIGZvciAoY29uc3QgW3MsIGVdIG9mIHRoaXMuZnJlZSkge1xuICAgICAgb3V0ICs9IGBGcmVlOiAke3MudG9TdHJpbmcoMTYpfS4uJHtlLnRvU3RyaW5nKDE2KX06ICR7ZSAtIHN9IGJ5dGVzXFxuYDtcbiAgICB9XG4gICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgIGZvciAoY29uc3QgW3MsIGNdIG9mIHRoaXMucGxhY2VkKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBjLm5hbWUgPz8gYENodW5rICR7Yy5pbmRleH1gO1xuICAgICAgICBjb25zdCBlbmQgPSBjLm9mZnNldCEgKyBjLnNpemU7XG4gICAgICAgIG91dCArPSBgJHtzLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAnMCcpfSAuLiAke1xuICAgICAgICAgICAgZW5kLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAnMCcpfTogJHtuYW1lfSAoJHtlbmQgLSBzfSBieXRlcylcXG5gO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG59XG5cbmNvbnN0IERFQlVHID0gZmFsc2U7XG4iXX0=