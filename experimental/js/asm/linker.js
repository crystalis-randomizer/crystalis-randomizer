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
        this.bank = (_a = segment.bank) !== null && _a !== void 0 ? _a : 0;
        this.addressing = (_b = segment.addressing) !== null && _b !== void 0 ? _b : 2;
        this.size = (_c = segment.size) !== null && _c !== void 0 ? _c : fail(`Size must be specified: ${name}`);
        this.offset = (_d = segment.offset) !== null && _d !== void 0 ? _d : fail(`OFfset must be specified: ${name}`);
        this.memory = (_e = segment.memory) !== null && _e !== void 0 ? _e : fail(`OFfset must be specified: ${name}`);
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
    get data() { var _a; return (_a = this._data) !== null && _a !== void 0 ? _a : fail('no data'); }
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
        const data = (_a = this._data) !== null && _a !== void 0 ? _a : fail(`No data`);
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
            var _a;
            if (initial && (p === null || p === void 0 ? void 0 : p.op) === '^' && p.args.length === 1 && e.meta) {
                if (e.meta.bank == null) {
                    this.addDep(sub, e.meta.chunk);
                }
                return e;
            }
            e = this.linker.resolveLink(Expr.evaluate(rec(e)));
            if (initial && ((_a = e.meta) === null || _a === void 0 ? void 0 : _a.rel))
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
                const delta = child.meta.offset - (child.meta.rel ? 0 : child.meta.org);
                const start = child.num + delta;
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
        this.initialReport = '';
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
            this.initialReport = `Initial:\n${this.report(true)}`;
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
        if (DEBUG)
            console.log(this.report(true));
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
        if (DEBUG)
            console.log(`Initial:\n${this.initialReport}`);
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
                const name = (_a = c.name) !== null && _a !== void 0 ? _a : `Chunk ${c.index}`;
                const end = c.offset + c.size;
                out += `${s.toString(16).padStart(5, '0')} .. ${end.toString(16).padStart(5, '0')}: ${name} (${end - s} bytes)\n`;
            }
        }
        return out;
    }
}
const DEBUG = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFnQixPQUFPLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFTakMsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFTVSxVQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQTZCN0IsQ0FBQztJQXJDQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBZTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBS0QsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBZ0IsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8s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O1FBQ0QsSUFBSSxPQUFPLEVBQUU7WUFDWCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDaEMsTUFBTSxJQUFJLFNBQUcsQ0FBQyxDQUFDLElBQUksbUNBQUksU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDL0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUNyQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQzthQUN2RTtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0Y7QUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ludGVydmFsU2V0LCBTcGFyc2VCeXRlQXJyYXksIGJpbmFyeUluc2VydH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi9leHByLmpzJztcbmltcG9ydCB7Q2h1bmssIE1vZHVsZSwgU2VnbWVudCwgU3Vic3RpdHV0aW9uLCBTeW1ib2x9IGZyb20gJy4vbW9kdWxlLmpzJztcbmltcG9ydCB7VG9rZW59IGZyb20gJy4vdG9rZW4uanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydCB7XG4gIHZhbHVlOiBudW1iZXI7XG4gIG9mZnNldD86IG51bWJlcjtcbiAgYmFuaz86IG51bWJlcjtcbiAgLy9zZWdtZW50Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTGlua2VyIHtcbiAgc3RhdGljIGxpbmsoLi4uZmlsZXM6IE1vZHVsZVtdKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICBjb25zdCBsaW5rZXIgPSBuZXcgTGlua2VyKCk7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBsaW5rZXIucmVhZChmaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmtlci5saW5rKCk7XG4gIH1cblxuICBwcml2YXRlIF9saW5rID0gbmV3IExpbmsoKTtcbiAgcHJpdmF0ZSBfZXhwb3J0cz86IE1hcDxzdHJpbmcsIEV4cG9ydD47XG5cbiAgcmVhZChmaWxlOiBNb2R1bGUpOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsucmVhZEZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBiYXNlKGRhdGE6IFVpbnQ4QXJyYXksIG9mZnNldCA9IDApOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsuYmFzZShkYXRhLCBvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIHJldHVybiB0aGlzLl9saW5rLmxpbmsoKTtcbiAgfVxuXG4gIHJlcG9ydCh2ZXJib3NlID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZyh0aGlzLl9saW5rLnJlcG9ydCh2ZXJib3NlKSk7XG4gIH1cblxuICBleHBvcnRzKCk6IE1hcDxzdHJpbmcsIEV4cG9ydD4ge1xuICAgIGlmICh0aGlzLl9leHBvcnRzKSByZXR1cm4gdGhpcy5fZXhwb3J0cztcbiAgICByZXR1cm4gdGhpcy5fZXhwb3J0cyA9IHRoaXMuX2xpbmsuYnVpbGRFeHBvcnRzKCk7XG4gIH1cblxuICB3YXRjaCguLi5vZmZzZXQ6IG51bWJlcltdKSB7XG4gICAgdGhpcy5fbGluay53YXRjaGVzLnB1c2goLi4ub2Zmc2V0KTtcbiAgfVxufVxuXG5leHBvcnQgbmFtZXNwYWNlIExpbmtlciB7XG4gIGV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gICAgXG5cbiAgfVxufVxuXG4vLyBUT0RPIC0gbGluay10aW1lIG9ubHkgZnVuY3Rpb24gZm9yIGdldHRpbmcgZWl0aGVyIHRoZSBvcmlnaW5hbCBvciB0aGVcbi8vICAgICAgICBwYXRjaGVkIGJ5dGUuICBXb3VsZCBhbGxvdyBlLmcuIGNvcHkoJDgwMDAsICQyMDAwLCBcIjFlXCIpIHRvIG1vdmVcbi8vICAgICAgICBhIGJ1bmNoIG9mIGNvZGUgYXJvdW5kIHdpdGhvdXQgZXhwbGljaXRseSBjb3B5LXBhc3RpbmcgaXQgaW4gdGhlXG4vLyAgICAgICAgYXNtIHBhdGNoLlxuXG4vLyBUcmFja3MgYW4gZXhwb3J0LlxuLy8gaW50ZXJmYWNlIEV4cG9ydCB7XG4vLyAgIGNodW5rczogU2V0PG51bWJlcj47XG4vLyAgIHN5bWJvbDogbnVtYmVyO1xuLy8gfVxuXG5mdW5jdGlvbiBmYWlsKG1zZzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbn1cblxuY2xhc3MgTGlua1NlZ21lbnQge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGJhbms6IG51bWJlcjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICByZWFkb25seSBvZmZzZXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgbWVtb3J5OiBudW1iZXI7XG4gIHJlYWRvbmx5IGFkZHJlc3Npbmc6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzZWdtZW50OiBTZWdtZW50KSB7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMubmFtZSA9IHNlZ21lbnQubmFtZTtcbiAgICB0aGlzLmJhbmsgPSBzZWdtZW50LmJhbmsgPz8gMDtcbiAgICB0aGlzLmFkZHJlc3NpbmcgPSBzZWdtZW50LmFkZHJlc3NpbmcgPz8gMjtcbiAgICB0aGlzLnNpemUgPSBzZWdtZW50LnNpemUgPz8gZmFpbChgU2l6ZSBtdXN0IGJlIHNwZWNpZmllZDogJHtuYW1lfWApO1xuICAgIHRoaXMub2Zmc2V0ID0gc2VnbWVudC5vZmZzZXQgPz8gZmFpbChgT0Zmc2V0IG11c3QgYmUgc3BlY2lmaWVkOiAke25hbWV9YCk7XG4gICAgdGhpcy5tZW1vcnkgPSBzZWdtZW50Lm1lbW9yeSA/PyBmYWlsKGBPRmZzZXQgbXVzdCBiZSBzcGVjaWZpZWQ6ICR7bmFtZX1gKTtcbiAgfVxuXG4gIC8vIG9mZnNldCA9IG9yZyArIGRlbHRhXG4gIGdldCBkZWx0YSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5vZmZzZXQgLSB0aGlzLm1lbW9yeTsgfVxufVxuXG5jbGFzcyBMaW5rQ2h1bmsge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gIHNlZ21lbnRzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgYXNzZXJ0czogRXhwcltdO1xuXG4gIHN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcbiAgc2VsZlN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcblxuICAvKiogR2xvYmFsIElEcyBvZiBjaHVua3MgbmVlZGVkIHRvIGxvY2F0ZSBiZWZvcmUgd2UgY2FuIGNvbXBsZXRlIHRoaXMgb25lLiAqL1xuICBkZXBzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8qKiBTeW1ib2xzIHRoYXQgYXJlIGltcG9ydGVkIGludG8gdGhpcyBjaHVuayAodGhlc2UgYXJlIGFsc28gZGVwcykuICovXG4gIGltcG9ydHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgLy8gLyoqIFN5bWJvbHMgdGhhdCBhcmUgZXhwb3J0ZWQgZnJvbSB0aGlzIGNodW5rLiAqL1xuICAvLyBleHBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9sbG93ID0gbmV3IE1hcDxTdWJzdGl0dXRpb24sIExpbmtDaHVuaz4oKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY2h1bmsgaXMgcGxhY2VkIG92ZXJsYXBwaW5nIHdpdGggc29tZXRoaW5nIGVsc2UuXG4gICAqIE92ZXJsYXBzIGFyZW4ndCB3cml0dGVuIHRvIHRoZSBwYXRjaC5cbiAgICovXG4gIG92ZXJsYXBzID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBfZGF0YT86IFVpbnQ4QXJyYXk7XG5cbiAgcHJpdmF0ZSBfb3JnPzogbnVtYmVyO1xuICBwcml2YXRlIF9vZmZzZXQ/OiBudW1iZXI7XG4gIHByaXZhdGUgX3NlZ21lbnQ/OiBMaW5rU2VnbWVudDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsaW5rZXI6IExpbmssXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgIGNodW5rOiBDaHVuazxVaW50OEFycmF5PixcbiAgICAgICAgICAgICAgY2h1bmtPZmZzZXQ6IG51bWJlcixcbiAgICAgICAgICAgICAgc3ltYm9sT2Zmc2V0OiBudW1iZXIpIHtcbiAgICB0aGlzLm5hbWUgPSBjaHVuay5uYW1lO1xuICAgIHRoaXMuc2l6ZSA9IGNodW5rLmRhdGEubGVuZ3RoO1xuICAgIHRoaXMuc2VnbWVudHMgPSBjaHVuay5zZWdtZW50cztcbiAgICB0aGlzLl9kYXRhID0gY2h1bmsuZGF0YTtcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzIHx8IFtdKSB7XG4gICAgICB0aGlzLnN1YnMuYWRkKHRyYW5zbGF0ZVN1YihzdWIsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICB9XG4gICAgdGhpcy5hc3NlcnRzID0gKGNodW5rLmFzc2VydHMgfHwgW10pXG4gICAgICAgIC5tYXAoZSA9PiB0cmFuc2xhdGVFeHByKGUsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICBpZiAoY2h1bmsub3JnKSB0aGlzLl9vcmcgPSBjaHVuay5vcmc7XG4gIH1cblxuICBnZXQgb3JnKCkgeyByZXR1cm4gdGhpcy5fb3JnOyB9XG4gIGdldCBvZmZzZXQoKSB7IHJldHVybiB0aGlzLl9vZmZzZXQ7IH1cbiAgZ2V0IHNlZ21lbnQoKSB7IHJldHVybiB0aGlzLl9zZWdtZW50OyB9XG4gIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YSA/PyBmYWlsKCdubyBkYXRhJyk7IH1cblxuICBpbml0aWFsUGxhY2VtZW50KCkge1xuICAgIC8vIEludmFyaWFudDogZXhhY3RseSBvbmUgb2YgKGRhdGEpIG9yIChvcmcsIF9vZmZzZXQsIF9zZWdtZW50KSBpcyBwcmVzZW50LlxuICAgIC8vIElmIChvcmcsIC4uLikgZmlsbGVkIGluIHRoZW4gd2UgdXNlIGxpbmtlci5kYXRhIGluc3RlYWQuXG4gICAgLy8gV2UgZG9uJ3QgY2FsbCB0aGlzIGluIHRoZSBjdG9yIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiBhbGwgdGhlIHNlZ21lbnRzXG4gICAgLy8gYmVpbmcgbG9hZGVkLCBidXQgaXQncyB0aGUgZmlyc3QgdGhpbmcgd2UgZG8gaW4gbGluaygpLlxuICAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuO1xuICAgIGNvbnN0IGVsaWdpYmxlU2VnbWVudHM6IExpbmtTZWdtZW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5zZWdtZW50cykge1xuICAgICAgY29uc3QgcyA9IHRoaXMubGlua2VyLnNlZ21lbnRzLmdldChuYW1lKTtcbiAgICAgIGlmICghcykgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHNlZ21lbnQ6ICR7bmFtZX1gKTtcbiAgICAgIGlmICh0aGlzLl9vcmcgPj0gcy5tZW1vcnkgJiYgdGhpcy5fb3JnIDwgcy5tZW1vcnkgKyBzLnNpemUpIHtcbiAgICAgICAgZWxpZ2libGVTZWdtZW50cy5wdXNoKHMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZWxpZ2libGVTZWdtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBzZWdtZW50OiAke2VsaWdpYmxlU2VnbWVudHN9YCk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnQgPSBlbGlnaWJsZVNlZ21lbnRzWzBdO1xuICAgIGlmICh0aGlzLl9vcmcgPj0gc2VnbWVudC5tZW1vcnkgKyBzZWdtZW50LnNpemUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2h1bmsgZG9lcyBub3QgZml0IGluIHNlZ21lbnQgJHtzZWdtZW50Lm5hbWV9YCk7XG4gICAgfVxuICAgIHRoaXMucGxhY2UodGhpcy5fb3JnLCBzZWdtZW50KTtcbiAgfVxuXG4gIHBsYWNlKG9yZzogbnVtYmVyLCBzZWdtZW50OiBMaW5rU2VnbWVudCkge1xuICAgIHRoaXMuX29yZyA9IG9yZztcbiAgICB0aGlzLl9zZWdtZW50ID0gc2VnbWVudDtcbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLl9vZmZzZXQgPSBvcmcgKyBzZWdtZW50LmRlbHRhO1xuICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLmxpbmtlci53YXRjaGVzKSB7XG4gICAgICBpZiAodyA+PSBvZmZzZXQgJiYgdyA8IG9mZnNldCArIHRoaXMuc2l6ZSkgZGVidWdnZXI7XG4gICAgfVxuICAgIGJpbmFyeUluc2VydCh0aGlzLmxpbmtlci5wbGFjZWQsIHggPT4geFswXSwgW29mZnNldCwgdGhpc10pO1xuICAgIC8vIENvcHkgZGF0YSwgbGVhdmluZyBvdXQgYW55IGhvbGVzXG4gICAgY29uc3QgZnVsbCA9IHRoaXMubGlua2VyLmRhdGE7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuX2RhdGEgPz8gZmFpbChgTm8gZGF0YWApO1xuICAgIHRoaXMuX2RhdGEgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAodGhpcy5zdWJzLnNpemUpIHtcbiAgICAgIGZ1bGwuc3BsaWNlKG9mZnNldCwgZGF0YS5sZW5ndGgpO1xuICAgICAgY29uc3Qgc3BhcnNlID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAgICAgc3BhcnNlLnNldCgwLCBkYXRhKTtcbiAgICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc3Vicykge1xuICAgICAgICBzcGFyc2Uuc3BsaWNlKHN1Yi5vZmZzZXQsIHN1Yi5zaXplKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW3N0YXJ0LCBjaHVua10gb2Ygc3BhcnNlLmNodW5rcygpKSB7XG4gICAgICAgIGZ1bGwuc2V0KG9mZnNldCArIHN0YXJ0LCAuLi5jaHVuayk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGwuc2V0KG9mZnNldCwgZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gUmV0cnkgdGhlIGZvbGxvdy1vbnNcbiAgICBmb3IgKGNvbnN0IFtzdWIsIGNodW5rXSBvZiB0aGlzLmZvbGxvdykge1xuICAgICAgY2h1bmsucmVzb2x2ZVN1YihzdWIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpbmtlci5mcmVlLmRlbGV0ZSh0aGlzLm9mZnNldCEsIHRoaXMub2Zmc2V0ISArIHRoaXMuc2l6ZSk7XG4gIH1cblxuICByZXNvbHZlU3Vicyhpbml0aWFsID0gZmFsc2UpIHsgLy86IE1hcDxudW1iZXIsIFN1YnN0aXR1dGlvbltdPiB7XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdWJzLCBzZWUgd2hhdCBwcm9ncmVzIHdlIGNhbiBtYWtlP1xuICAgIC8vIHJlc3VsdDogbGlzdCBvZiBkZXBlbmRlbnQgY2h1bmtzLlxuXG4gICAgLy8gTk9URTogaWYgd2UgZGVwZW5kIG9uIG91cnNlbGYgdGhlbiB3ZSB3aWxsIHJldHVybiBlbXB0eSBkZXBzLFxuICAgIC8vICAgICAgIGFuZCBtYXkgYmUgcGxhY2VkIGltbWVkaWF0ZWx5LCBidXQgd2lsbCBzdGlsbCBoYXZlIGhvbGVzLlxuICAgIC8vICAgICAgLSBOTywgaXQncyByZXNwb25zaWJpbGl0eSBvZiBjYWxsZXIgdG8gY2hlY2sgdGhhdFxuICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc2VsZlN1YnMpIHtcbiAgICAgIHRoaXMucmVzb2x2ZVN1YihzdWIsIGluaXRpYWwpO1xuICAgIH1cblxuICAgIC8vIGNvbnN0IGRlcHMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5zdWJzKSB7XG4gICAgICAvLyBjb25zdCBzdWJEZXBzID0gXG4gICAgICB0aGlzLnJlc29sdmVTdWIoc3ViLCBpbml0aWFsKTtcbiAgICAgIC8vIGlmICghc3ViRGVwcykgY29udGludWU7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcCBvZiBzdWJEZXBzKSB7XG4gICAgICAvLyAgIGxldCBzdWJzID0gZGVwcy5nZXQoZGVwKTtcbiAgICAgIC8vICAgaWYgKCFzdWJzKSBkZXBzLnNldChkZXAsIHN1YnMgPSBbXSk7XG4gICAgICAvLyAgIHN1YnMucHVzaChzdWIpO1xuICAgICAgLy8gfVxuICAgIH1cbiAgICAvLyBpZiAodGhpcy5vcmcgIT0gbnVsbCkgcmV0dXJuIG5ldyBTZXQoKTtcbiAgICAvLyByZXR1cm4gZGVwcztcbiAgfVxuXG4gIGFkZERlcChzdWI6IFN1YnN0aXR1dGlvbiwgZGVwOiBudW1iZXIpIHtcbiAgICBpZiAoZGVwID09PSB0aGlzLmluZGV4ICYmIHRoaXMuc3Vicy5kZWxldGUoc3ViKSkgdGhpcy5zZWxmU3Vicy5hZGQoc3ViKTtcbiAgICB0aGlzLmxpbmtlci5jaHVua3NbZGVwXS5mb2xsb3cuc2V0KHN1YiwgdGhpcyk7XG4gICAgdGhpcy5kZXBzLmFkZChkZXApO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGxpc3Qgb2YgZGVwZW5kZW50IGNodW5rcywgb3IgdW5kZWZpbmVkIGlmIHN1Y2Nlc3NmdWwuXG4gIHJlc29sdmVTdWIoc3ViOiBTdWJzdGl0dXRpb24sIGluaXRpYWw6IGJvb2xlYW4pIHsgLy86IEl0ZXJhYmxlPG51bWJlcj58dW5kZWZpbmVkIHtcblxuICAgIC8vIFRPRE8gLSByZXNvbHZlKHJlc29sdmVyKSB2aWEgY2h1bmtEYXRhIHRvIHJlc29sdmUgYmFua3MhIVxuXG5cbiAgICAvLyBEbyBhIGZ1bGwgdHJhdmVyc2Ugb2YgdGhlIGV4cHJlc3Npb24gLSBzZWUgd2hhdCdzIGJsb2NraW5nIHVzLlxuICAgIGlmICghdGhpcy5zdWJzLmhhcyhzdWIpICYmICF0aGlzLnNlbGZTdWJzLmhhcyhzdWIpKSByZXR1cm47XG4gICAgc3ViLmV4cHIgPSBFeHByLnRyYXZlcnNlKHN1Yi5leHByLCAoZSwgcmVjLCBwKSA9PiB7XG4gICAgICAvLyBGaXJzdCBoYW5kbGUgbW9zdCBjb21tb24gYmFuayBieXRlIGNhc2UsIHNpbmNlIGl0IHRyaWdnZXJzIG9uIGFcbiAgICAgIC8vIGRpZmZlcmVudCB0eXBlIG9mIHJlc29sdXRpb24uXG4gICAgICBpZiAoaW5pdGlhbCAmJiBwPy5vcCA9PT0gJ14nICYmIHAuYXJncyEubGVuZ3RoID09PSAxICYmIGUubWV0YSkge1xuICAgICAgICBpZiAoZS5tZXRhLmJhbmsgPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwKHN1YiwgZS5tZXRhLmNodW5rISk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGU7IC8vIHNraXAgcmVjdXJzaW9uIGVpdGhlciB3YXkuXG4gICAgICB9XG4gICAgICBlID0gdGhpcy5saW5rZXIucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICAgIGlmIChpbml0aWFsICYmIGUubWV0YT8ucmVsKSB0aGlzLmFkZERlcChzdWIsIGUubWV0YS5jaHVuayEpO1xuICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG5cbiAgICAvLyBQUk9CTEVNIC0gb2ZmIGlzIHJlbGF0aXZlIHRvIHRoZSBjaHVuaywgYnV0IHdlIHdhbnQgdG8gYmUgYWJsZSB0b1xuICAgIC8vIHNwZWNpZnkgYW4gQUJTT0xVVEUgb3JnIHdpdGhpbiBhIHNlZ21lbnQuLi4hXG4gICAgLy8gQW4gYWJzb2x1dGUgb2Zmc2V0IHdpdGhpbiB0aGUgd2hvbGUgb3JpZyBpcyBubyBnb29kLCBlaXRoZXJcbiAgICAvLyB3YW50IHRvIHdyaXRlIGl0IGFzIC5zZWdtZW50IFwiZm9vXCI7IFN5bSA9ICQxMjM0XG4gICAgLy8gQ291bGQgYWxzbyBqdXN0IGRvIC5tb3ZlIGNvdW50LCBcInNlZ1wiLCAkMTIzNCBhbmQgc3RvcmUgYSBzcGVjaWFsIG9wXG4gICAgLy8gdGhhdCB1c2VzIGJvdGggc3ltIGFuZCBudW0/XG5cbiAgICAvLyBTZWUgaWYgd2UgY2FuIGRvIGl0IGltbWVkaWF0ZWx5LlxuICAgIGxldCBkZWwgPSBmYWxzZTtcbiAgICBpZiAoc3ViLmV4cHIub3AgPT09ICdudW0nICYmICFzdWIuZXhwci5tZXRhPy5yZWwpIHtcbiAgICAgIHRoaXMud3JpdGVWYWx1ZShzdWIub2Zmc2V0LCBzdWIuZXhwci5udW0hLCBzdWIuc2l6ZSk7XG4gICAgICBkZWwgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3ViLmV4cHIub3AgPT09ICcubW92ZScpIHtcbiAgICAgIGlmIChzdWIuZXhwci5hcmdzIS5sZW5ndGggIT09IDEpIHRocm93IG5ldyBFcnJvcihgYmFkIC5tb3ZlYCk7XG4gICAgICBjb25zdCBjaGlsZCA9IHN1Yi5leHByLmFyZ3MhWzBdO1xuICAgICAgaWYgKGNoaWxkLm9wID09PSAnbnVtJyAmJiBjaGlsZC5tZXRhPy5vZmZzZXQgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkZWx0YSA9XG4gICAgICAgICAgICBjaGlsZC5tZXRhIS5vZmZzZXQhIC0gKGNoaWxkLm1ldGEhLnJlbCA/IDAgOiBjaGlsZC5tZXRhIS5vcmchKTtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBjaGlsZC5udW0hICsgZGVsdGE7XG4gICAgICAgIGNvbnN0IHNsaWNlID0gdGhpcy5saW5rZXIub3JpZy5zbGljZShzdGFydCwgc3RhcnQgKyBzdWIuc2l6ZSk7XG4gICAgICAgIHRoaXMud3JpdGVCeXRlcyhzdWIub2Zmc2V0LCBVaW50OEFycmF5LmZyb20oc2xpY2UpKTtcbiAgICAgICAgZGVsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGRlbCkge1xuICAgICAgdGhpcy5zdWJzLmRlbGV0ZShzdWIpIHx8IHRoaXMuc2VsZlN1YnMuZGVsZXRlKHN1Yik7XG4gICAgICBpZiAoIXRoaXMuc3Vicy5zaXplKSB7IC8vIE5FVzogaWdub3JlcyBzZWxmLXN1YnMgbm93XG4gICAgICAvLyBpZiAoIXRoaXMuc3Vicy5zaXplIHx8IChkZXBzLnNpemUgPT09IDEgJiYgZGVwcy5oYXModGhpcy5pbmRleCkpKSAge1xuICAgICAgICAvLyBhZGQgdG8gcmVzb2x2ZWQgcXVldWUgLSByZWFkeSB0byBiZSBwbGFjZWQhXG4gICAgICAgIC8vIFF1ZXN0aW9uOiBzaG91bGQgd2UgcGxhY2UgaXQgcmlnaHQgYXdheT8gIFdlIHBsYWNlIHRoZSBmaXhlZCBjaHVua3NcbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgaW4gdGhlIGN0b3IsIGJ1dCB0aGVyZSdzIG5vIGNob2ljZSB0byBkZWZlci4gIEZvciByZWxvY1xuICAgICAgICAvLyBjaHVua3MsIGl0J3MgYmV0dGVyIHRvIHdhaXQgdW50aWwgd2UndmUgcmVzb2x2ZWQgYXMgbXVjaCBhcyBwb3NzaWJsZVxuICAgICAgICAvLyBiZWZvcmUgcGxhY2luZyBhbnl0aGluZy4gIEZvcnR1bmF0ZWx5LCBwbGFjaW5nIGEgY2h1bmsgd2lsbFxuICAgICAgICAvLyBhdXRvbWF0aWNhbGx5IHJlc29sdmUgYWxsIGRlcHMgbm93IVxuICAgICAgICBpZiAodGhpcy5saW5rZXIudW5yZXNvbHZlZENodW5rcy5kZWxldGUodGhpcykpIHtcbiAgICAgICAgICB0aGlzLmxpbmtlci5pbnNlcnRSZXNvbHZlZCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdyaXRlQnl0ZXMob2Zmc2V0OiBudW1iZXIsIGJ5dGVzOiBVaW50OEFycmF5KSB7XG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgIHRoaXMuX2RhdGEuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyBieXRlcy5sZW5ndGgpLnNldChieXRlcyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9vZmZzZXQgIT0gbnVsbCkge1xuICAgICAgdGhpcy5saW5rZXIuZGF0YS5zZXQodGhpcy5fb2Zmc2V0ICsgb2Zmc2V0LCBieXRlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZWApO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlVmFsdWUob2Zmc2V0OiBudW1iZXIsIHZhbDogbnVtYmVyLCBzaXplOiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gdGhpcyBpcyBhbG1vc3QgZW50aXJlbHkgY29waWVkIGZyb20gcHJvY2Vzc29yIHdyaXRlTnVtYmVyXG4gICAgY29uc3QgYml0cyA9IChzaXplKSA8PCAzO1xuICAgIGlmICh2YWwgIT0gbnVsbCAmJiAodmFsIDwgKC0xIDw8IGJpdHMpIHx8IHZhbCA+PSAoMSA8PCBiaXRzKSkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBbJ2J5dGUnLCAnd29yZCcsICdmYXJ3b3JkJywgJ2R3b3JkJ11bc2l6ZSAtIDFdO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgYSAke25hbWV9OiAkJHt2YWwudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KHNpemUpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgICBieXRlc1tpXSA9IHZhbCAmIDB4ZmY7XG4gICAgICB2YWwgPj49IDg7XG4gICAgfVxuICAgIHRoaXMud3JpdGVCeXRlcyhvZmZzZXQsIGJ5dGVzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cmFuc2xhdGVTdWIoczogU3Vic3RpdHV0aW9uLCBkYzogbnVtYmVyLCBkczogbnVtYmVyKTogU3Vic3RpdHV0aW9uIHtcbiAgcyA9IHsuLi5zfTtcbiAgcy5leHByID0gdHJhbnNsYXRlRXhwcihzLmV4cHIsIGRjLCBkcyk7XG4gIHJldHVybiBzO1xufVxuZnVuY3Rpb24gdHJhbnNsYXRlRXhwcihlOiBFeHByLCBkYzogbnVtYmVyLCBkczogbnVtYmVyKTogRXhwciB7XG4gIGUgPSB7Li4uZX07XG4gIGlmIChlLm1ldGEpIGUubWV0YSA9IHsuLi5lLm1ldGF9O1xuICBpZiAoZS5hcmdzKSBlLmFyZ3MgPSBlLmFyZ3MubWFwKGEgPT4gdHJhbnNsYXRlRXhwcihhLCBkYywgZHMpKTtcbiAgaWYgKGUubWV0YT8uY2h1bmsgIT0gbnVsbCkgZS5tZXRhLmNodW5rICs9IGRjO1xuICBpZiAoZS5vcCA9PT0gJ3N5bScgJiYgZS5udW0gIT0gbnVsbCkgZS5udW0gKz0gZHM7XG4gIHJldHVybiBlO1xufVxuZnVuY3Rpb24gdHJhbnNsYXRlU3ltYm9sKHM6IFN5bWJvbCwgZGM6IG51bWJlciwgZHM6IG51bWJlcik6IFN5bWJvbCB7XG4gIHMgPSB7Li4uc307XG4gIGlmIChzLmV4cHIpIHMuZXhwciA9IHRyYW5zbGF0ZUV4cHIocy5leHByLCBkYywgZHMpO1xuICByZXR1cm4gcztcbn1cblxuLy8gVGhpcyBjbGFzcyBpcyBzaW5nbGUtdXNlLlxuY2xhc3MgTGluayB7XG4gIGRhdGEgPSBuZXcgU3BhcnNlQnl0ZUFycmF5KCk7XG4gIG9yaWcgPSBuZXcgU3BhcnNlQnl0ZUFycmF5KCk7XG4gIC8vIE1hcHMgc3ltYm9sIHRvIHN5bWJvbCAjIC8vIFtzeW1ib2wgIywgZGVwZW5kZW50IGNodW5rc11cbiAgZXhwb3J0cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7IC8vIHJlYWRvbmx5IFtudW1iZXIsIFNldDxudW1iZXI+XT4oKTtcbiAgY2h1bmtzOiBMaW5rQ2h1bmtbXSA9IFtdO1xuICBzeW1ib2xzOiBTeW1ib2xbXSA9IFtdO1xuICBmcmVlID0gbmV3IEludGVydmFsU2V0KCk7XG4gIHJhd1NlZ21lbnRzID0gbmV3IE1hcDxzdHJpbmcsIFNlZ21lbnRbXT4oKTtcbiAgc2VnbWVudHMgPSBuZXcgTWFwPHN0cmluZywgTGlua1NlZ21lbnQ+KCk7XG5cbiAgcmVzb2x2ZWRDaHVua3M6IExpbmtDaHVua1tdID0gW107XG4gIHVucmVzb2x2ZWRDaHVua3MgPSBuZXcgU2V0PExpbmtDaHVuaz4oKTtcblxuICB3YXRjaGVzOiBudW1iZXJbXSA9IFtdOyAvLyBkZWJ1Z2dpbmcgYWlkOiBvZmZzZXRzIHRvIHdhdGNoLlxuICBwbGFjZWQ6IEFycmF5PFtudW1iZXIsIExpbmtDaHVua10+ID0gW107XG4gIGluaXRpYWxSZXBvcnQ6IHN0cmluZyA9ICcnO1xuXG4gIC8vIFRPRE8gLSBkZWZlcnJlZCAtIHN0b3JlIHNvbWUgc29ydCBvZiBkZXBlbmRlbmN5IGdyYXBoP1xuXG4gIGluc2VydFJlc29sdmVkKGNodW5rOiBMaW5rQ2h1bmspIHtcbiAgICBiaW5hcnlJbnNlcnQodGhpcy5yZXNvbHZlZENodW5rcywgYyA9PiBjLnNpemUsIGNodW5rKTtcbiAgfVxuXG4gIGJhc2UoZGF0YTogVWludDhBcnJheSwgb2Zmc2V0ID0gMCkge1xuICAgIHRoaXMuZGF0YS5zZXQob2Zmc2V0LCBkYXRhKTtcbiAgICB0aGlzLm9yaWcuc2V0KG9mZnNldCwgZGF0YSk7XG4gIH1cblxuICByZWFkRmlsZShmaWxlOiBNb2R1bGUpIHtcbiAgICBjb25zdCBkYyA9IHRoaXMuY2h1bmtzLmxlbmd0aDtcbiAgICBjb25zdCBkcyA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgLy8gc2VnbWVudHMgY29tZSBmaXJzdCwgc2luY2UgTGlua0NodW5rIGNvbnN0cnVjdG9yIG5lZWRzIHRoZW1cbiAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2YgZmlsZS5zZWdtZW50cyB8fCBbXSkge1xuICAgICAgdGhpcy5hZGRSYXdTZWdtZW50KHNlZ21lbnQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGZpbGUuY2h1bmtzIHx8IFtdKSB7XG4gICAgICBjb25zdCBsYyA9IG5ldyBMaW5rQ2h1bmsodGhpcywgdGhpcy5jaHVua3MubGVuZ3RoLCBjaHVuaywgZGMsIGRzKTtcbiAgICAgIHRoaXMuY2h1bmtzLnB1c2gobGMpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiBmaWxlLnN5bWJvbHMgfHwgW10pIHtcbiAgICAgIHRoaXMuc3ltYm9scy5wdXNoKHRyYW5zbGF0ZVN5bWJvbChzeW1ib2wsIGRjLCBkcykpO1xuICAgIH1cbiAgICAvLyBUT0RPIC0gd2hhdCB0aGUgaGVjayBkbyB3ZSBkbyB3aXRoIHNlZ21lbnRzP1xuICAgIC8vICAgICAgLSBpbiBwYXJ0aWN1bGFyLCB3aG8gaXMgcmVzcG9uc2libGUgZm9yIGRlZmluaW5nIHRoZW0/Pz9cblxuICAgIC8vIEJhc2ljIGlkZWE6XG4gICAgLy8gIDEuIGdldCBhbGwgdGhlIGNodW5rc1xuICAgIC8vICAyLiBidWlsZCB1cCBhIGRlcGVuZGVuY3kgZ3JhcGhcbiAgICAvLyAgMy4gd3JpdGUgYWxsIGZpeGVkIGNodW5rcywgbWVtb2l6aW5nIGFic29sdXRlIG9mZnNldHMgb2ZcbiAgICAvLyAgICAgbWlzc2luZyBzdWJzICh0aGVzZSBhcmUgbm90IGVsaWdpYmxlIGZvciBjb2FsZXNjaW5nKS5cbiAgICAvLyAgICAgLS0gcHJvYmFibHkgc2FtZSB0cmVhdG1lbnQgZm9yIGZyZWVkIHNlY3Rpb25zXG4gICAgLy8gIDQuIGZvciByZWxvYyBjaHVua3MsIGZpbmQgdGhlIGJpZ2dlc3QgY2h1bmsgd2l0aCBubyBkZXBzLlxuICB9XG5cbiAgLy8gcmVzb2x2ZUNodW5rKGNodW5rOiBMaW5rQ2h1bmspIHtcbiAgLy8gICAvL2lmIChjaHVuay5yZXNvbHZpbmcpIHJldHVybjsgLy8gYnJlYWsgYW55IGN5Y2xlc1xuICAgIFxuICAvLyB9XG5cbiAgcmVzb2x2ZUxpbmsoZXhwcjogRXhwcik6IEV4cHIge1xuICAgIGlmIChleHByLm9wID09PSAnLm9yaWcnICYmIGV4cHIuYXJncz8ubGVuZ3RoID09PSAxKSB7XG4gICAgICBjb25zdCBjaGlsZCA9IGV4cHIuYXJnc1swXTtcbiAgICAgIGNvbnN0IG9mZnNldCA9IGNoaWxkLm1ldGE/Lm9mZnNldDtcbiAgICAgIGlmIChvZmZzZXQgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBudW0gPSB0aGlzLm9yaWcuZ2V0KG9mZnNldCArIGNoaWxkLm51bSEpO1xuICAgICAgICBpZiAobnVtICE9IG51bGwpIHJldHVybiB7b3A6ICdudW0nLCBudW19O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZXhwci5vcCA9PT0gJ251bScgJiYgZXhwci5tZXRhPy5jaHVuayAhPSBudWxsKSB7XG4gICAgICBjb25zdCBtZXRhID0gZXhwci5tZXRhO1xuICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1ttZXRhLmNodW5rIV07XG4gICAgICBpZiAoY2h1bmsub3JnICE9PSBtZXRhLm9yZyB8fFxuICAgICAgICAgIGNodW5rLnNlZ21lbnQ/LmJhbmsgIT09IG1ldGEuYmFuayB8fFxuICAgICAgICAgIGNodW5rLm9mZnNldCAhPT0gbWV0YS5vZmZzZXQpIHtcbiAgICAgICAgY29uc3QgbWV0YTIgPSB7XG4gICAgICAgICAgb3JnOiBjaHVuay5vcmcsXG4gICAgICAgICAgb2Zmc2V0OiBjaHVuay5vZmZzZXQsXG4gICAgICAgICAgYmFuazogY2h1bmsuc2VnbWVudD8uYmFuayxcbiAgICAgICAgfTtcbiAgICAgICAgZXhwciA9IEV4cHIuZXZhbHVhdGUoey4uLmV4cHIsIG1ldGE6IHsuLi5tZXRhLCAuLi5tZXRhMn19KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICAvLyBOT1RFOiBzbyBmYXIgdGhpcyBpcyBvbmx5IHVzZWQgZm9yIGFzc2VydHM/XG4gIC8vIEl0IGJhc2ljYWxseSBjb3B5LXBhc3RlcyBmcm9tIHJlc29sdmVTdWJzLi4uIDotKFxuXG4gIHJlc29sdmVFeHByKGV4cHI6IEV4cHIpOiBudW1iZXIge1xuICAgIGV4cHIgPSBFeHByLnRyYXZlcnNlKGV4cHIsIChlLCByZWMpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmVMaW5rKEV4cHIuZXZhbHVhdGUocmVjKGUpKSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZXhwci5vcCA9PT0gJ251bScgJiYgIWV4cHIubWV0YT8ucmVsKSByZXR1cm4gZXhwci5udW0hO1xuICAgIGNvbnN0IGF0ID0gVG9rZW4uYXQoZXhwcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZnVsbHkgcmVzb2x2ZSBleHByJHthdH1gKTtcbiAgfVxuXG4gIGxpbmsoKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICAvLyBCdWlsZCB1cCB0aGUgTGlua1NlZ21lbnQgb2JqZWN0c1xuICAgIGZvciAoY29uc3QgW25hbWUsIHNlZ21lbnRzXSBvZiB0aGlzLnJhd1NlZ21lbnRzKSB7XG4gICAgICBsZXQgcyA9IHNlZ21lbnRzWzBdO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBzZWdtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBzID0gU2VnbWVudC5tZXJnZShzLCBzZWdtZW50c1tpXSk7XG4gICAgICB9XG4gICAgICB0aGlzLnNlZ21lbnRzLnNldChuYW1lLCBuZXcgTGlua1NlZ21lbnQocykpO1xuICAgIH1cbiAgICAvLyBBZGQgdGhlIGZyZWUgc3BhY2VcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBzZWdtZW50c10gb2YgdGhpcy5yYXdTZWdtZW50cykge1xuICAgICAgY29uc3QgcyA9IHRoaXMuc2VnbWVudHMuZ2V0KG5hbWUpITtcbiAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgICAgICBjb25zdCBmcmVlID0gc2VnbWVudC5mcmVlO1xuICAgICAgICAvLyBBZGQgdGhlIGZyZWUgc3BhY2VcbiAgICAgICAgZm9yIChjb25zdCBbc3RhcnQsIGVuZF0gb2YgZnJlZSB8fCBbXSkge1xuICAgICAgICAgIHRoaXMuZnJlZS5hZGQoc3RhcnQgKyBzLmRlbHRhLCBlbmQgKyBzLmRlbHRhKTtcbiAgICAgICAgICB0aGlzLmRhdGEuc3BsaWNlKHN0YXJ0ICsgcy5kZWx0YSwgZW5kIC0gc3RhcnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFNldCB1cCBhbGwgdGhlIGluaXRpYWwgcGxhY2VtZW50cy5cbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBjaHVuay5pbml0aWFsUGxhY2VtZW50KCk7XG4gICAgfVxuICAgIGlmIChERUJVRykge1xuICAgICAgdGhpcy5pbml0aWFsUmVwb3J0ID0gYEluaXRpYWw6XFxuJHt0aGlzLnJlcG9ydCh0cnVlKX1gO1xuICAgIH1cbiAgICAvLyBGaW5kIGFsbCB0aGUgZXhwb3J0cy5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3ltYm9scy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5zeW1ib2xzW2ldO1xuICAgICAgLy8gVE9ETyAtIHdlJ2QgcmVhbGx5IGxpa2UgdG8gaWRlbnRpZnkgdGhpcyBlYXJsaWVyIGlmIGF0IGFsbCBwb3NzaWJsZSFcbiAgICAgIGlmICghc3ltYm9sLmV4cHIpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sICR7aX0gbmV2ZXIgcmVzb2x2ZWRgKTtcbiAgICAgIC8vIGxvb2sgZm9yIGltcG9ydHMvZXhwb3J0c1xuICAgICAgaWYgKHN5bWJvbC5leHBvcnQgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLmV4cG9ydHMuc2V0KHN5bWJvbC5leHBvcnQsIGkpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZXNvbHZlIGFsbCB0aGUgaW1wb3J0cyBpbiBhbGwgc3ltYm9sIGFuZCBjaHVuay5zdWJzIGV4cHJzLlxuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgc3ltYm9sLmV4cHIgPSB0aGlzLnJlc29sdmVTeW1ib2xzKHN5bWJvbC5leHByISk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGZvciAoY29uc3Qgc3ViIG9mIFsuLi5jaHVuay5zdWJzLCAuLi5jaHVuay5zZWxmU3Vic10pIHtcbiAgICAgICAgc3ViLmV4cHIgPSB0aGlzLnJlc29sdmVTeW1ib2xzKHN1Yi5leHByKTtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2h1bmsuYXNzZXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjaHVuay5hc3NlcnRzW2ldID0gdGhpcy5yZXNvbHZlU3ltYm9scyhjaHVuay5hc3NlcnRzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQXQgdGhpcyBwb2ludCwgd2UgZG9uJ3QgY2FyZSBhYm91dCB0aGlzLnN5bWJvbHMgYXQgYWxsIGFueW1vcmUuXG4gICAgLy8gTm93IGZpZ3VyZSBvdXQgdGhlIGZ1bGwgZGVwZW5kZW5jeSB0cmVlOiBjaHVuayAjWCByZXF1aXJlcyBjaHVuayAjWVxuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLmNodW5rcykge1xuICAgICAgYy5yZXNvbHZlU3Vicyh0cnVlKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gZmlsbCAodW4pcmVzb2x2ZWRDaHVua3NcbiAgICAvLyAgIC0gZ2V0cyBcblxuICAgIGNvbnN0IGNodW5rcyA9IFsuLi50aGlzLmNodW5rc107XG4gICAgY2h1bmtzLnNvcnQoKGEsIGIpID0+IGIuc2l6ZSAtIGEuc2l6ZSk7XG5cbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgY2h1bmsucmVzb2x2ZVN1YnMoKTtcbiAgICAgIGlmIChjaHVuay5zdWJzLnNpemUpIHtcbiAgICAgICAgdGhpcy51bnJlc29sdmVkQ2h1bmtzLmFkZChjaHVuayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmluc2VydFJlc29sdmVkKGNodW5rKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY291bnQgPSB0aGlzLnJlc29sdmVkQ2h1bmtzLmxlbmd0aCArIDIgKiB0aGlzLnVucmVzb2x2ZWRDaHVua3Muc2l6ZTtcbiAgICB3aGlsZSAoY291bnQpIHtcbiAgICAgIGNvbnN0IGMgPSB0aGlzLnJlc29sdmVkQ2h1bmtzLnBvcCgpO1xuICAgICAgaWYgKGMpIHtcbiAgICAgICAgdGhpcy5wbGFjZUNodW5rKGMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmVzb2x2ZSBhbGwgdGhlIGZpcnN0IHVucmVzb2x2ZWQgY2h1bmtzJyBkZXBzXG4gICAgICAgIGNvbnN0IFtmaXJzdF0gPSB0aGlzLnVucmVzb2x2ZWRDaHVua3M7XG4gICAgICAgIGZvciAoY29uc3QgZGVwIG9mIGZpcnN0LmRlcHMpIHtcbiAgICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW2RlcF07XG4gICAgICAgICAgaWYgKGNodW5rLm9yZyA9PSBudWxsKSB0aGlzLnBsYWNlQ2h1bmsoY2h1bmspO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy5yZXNvbHZlZENodW5rcy5sZW5ndGggKyAyICogdGhpcy51bnJlc29sdmVkQ2h1bmtzLnNpemU7XG4gICAgICBpZiAobmV4dCA9PT0gY291bnQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcih0aGlzLnJlc29sdmVkQ2h1bmtzLCB0aGlzLnVucmVzb2x2ZWRDaHVua3MpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBtYWtpbmcgcHJvZ3Jlc3NgKTtcbiAgICAgIH1cbiAgICAgIGNvdW50ID0gbmV4dDtcbiAgICB9XG5cbiAgICAvLyBpZiAoIWNodW5rLm9yZyAmJiAhY2h1bmsuc3Vicy5sZW5ndGgpIHRoaXMucGxhY2VDaHVuayhjaHVuayk7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50IHRoZSBkZXAgZ3JhcGggaXMgYnVpbHQgLSBub3cgdHJhdmVyc2UgaXQuXG5cbiAgICAvLyBjb25zdCBwbGFjZSA9IChpOiBudW1iZXIpID0+IHtcbiAgICAvLyAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbaV07XG4gICAgLy8gICBpZiAoY2h1bmsub3JnICE9IG51bGwpIHJldHVybjtcbiAgICAvLyAgIC8vIHJlc29sdmUgZmlyc3RcbiAgICAvLyAgIGNvbnN0IHJlbWFpbmluZzogU3Vic3RpdHV0aW9uW10gPSBbXTtcbiAgICAvLyAgIGZvciAoY29uc3Qgc3ViIG9mIGNodW5rLnN1YnMpIHtcbiAgICAvLyAgICAgaWYgKHRoaXMucmVzb2x2ZVN1YihjaHVuaywgc3ViKSkgcmVtYWluaW5nLnB1c2goc3ViKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIGNodW5rLnN1YnMgPSByZW1haW5pbmc7XG4gICAgLy8gICAvLyBub3cgcGxhY2UgdGhlIGNodW5rXG4gICAgLy8gICB0aGlzLnBsYWNlQ2h1bmsoY2h1bmspOyAvLyBUT0RPIC4uLlxuICAgIC8vICAgLy8gdXBkYXRlIHRoZSBncmFwaDsgZG9uJ3QgYm90aGVyIGRlbGV0aW5nIGZvcm0gYmxvY2tlZC5cbiAgICAvLyAgIGZvciAoY29uc3QgcmV2RGVwIG9mIHJldkRlcHNbaV0pIHtcbiAgICAvLyAgICAgY29uc3QgZndkID0gZndkRGVwc1tyZXZEZXBdO1xuICAgIC8vICAgICBmd2QuZGVsZXRlKGkpO1xuICAgIC8vICAgICBpZiAoIWZ3ZC5zaXplKSBpbnNlcnQodW5ibG9ja2VkLCByZXZEZXApO1xuICAgIC8vICAgfVxuICAgIC8vIH1cbiAgICAvLyB3aGlsZSAodW5ibG9ja2VkLmxlbmd0aCB8fCBibG9ja2VkLmxlbmd0aCkge1xuICAgIC8vICAgbGV0IG5leHQgPSB1bmJsb2NrZWQuc2hpZnQoKTtcbiAgICAvLyAgIGlmIChuZXh0KSB7XG4gICAgLy8gICAgIHBsYWNlKG5leHQpO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIG5leHQgPSBibG9ja2VkWzBdO1xuICAgIC8vICAgZm9yIChjb25zdCByZXYgb2YgcmV2RGVwc1tuZXh0XSkge1xuICAgIC8vICAgICBpZiAodGhpcy5jaHVua3NbcmV2XS5vcmcgIT0gbnVsbCkgeyAvLyBhbHJlYWR5IHBsYWNlZFxuICAgIC8vICAgICAgIGJsb2NrZWQuc2hpZnQoKTtcbiAgICAvLyAgICAgICBjb250aW51ZTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBwbGFjZShyZXYpO1xuICAgIC8vICAgfVxuICAgIC8vIH1cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBldmVyeXRoaW5nIHNob3VsZCBiZSBwbGFjZWQsIHNvIGRvIG9uZSBsYXN0IHJlc29sdmUuXG5cbiAgICBjb25zdCBwYXRjaCA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGZvciAoY29uc3QgYSBvZiBjLmFzc2VydHMpIHtcbiAgICAgICAgY29uc3QgdiA9IHRoaXMucmVzb2x2ZUV4cHIoYSk7XG4gICAgICAgIGlmICh2KSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgYXQgPSBUb2tlbi5hdChhKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gZmFpbGVkJHthdH1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChjLm92ZXJsYXBzKSBjb250aW51ZTtcbiAgICAgIHBhdGNoLnNldChjLm9mZnNldCEsIC4uLnRoaXMuZGF0YS5zbGljZShjLm9mZnNldCEsIGMub2Zmc2V0ISArIGMuc2l6ZSEpKTtcbiAgICB9XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyh0aGlzLnJlcG9ydCh0cnVlKSk7XG4gICAgcmV0dXJuIHBhdGNoO1xuICB9XG5cbiAgcGxhY2VDaHVuayhjaHVuazogTGlua0NodW5rKSB7XG4gICAgaWYgKGNodW5rLm9yZyAhPSBudWxsKSByZXR1cm47IC8vIGRvbid0IHJlLXBsYWNlLlxuICAgIGNvbnN0IHNpemUgPSBjaHVuay5zaXplO1xuICAgIGlmICghY2h1bmsuc3Vicy5zaXplICYmICFjaHVuay5zZWxmU3Vicy5zaXplKSB7XG4gICAgICAvLyBjaHVuayBpcyByZXNvbHZlZDogc2VhcmNoIGZvciBhbiBleGlzdGluZyBjb3B5IG9mIGl0IGZpcnN0XG4gICAgICBjb25zdCBwYXR0ZXJuID0gdGhpcy5kYXRhLnBhdHRlcm4oY2h1bmsuZGF0YSk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2h1bmsuc2VnbWVudHMpIHtcbiAgICAgICAgY29uc3Qgc2VnbWVudCA9IHRoaXMuc2VnbWVudHMuZ2V0KG5hbWUpITtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBzZWdtZW50Lm9mZnNldCE7XG4gICAgICAgIGNvbnN0IGVuZCA9IHN0YXJ0ICsgc2VnbWVudC5zaXplITtcbiAgICAgICAgY29uc3QgaW5kZXggPSBwYXR0ZXJuLnNlYXJjaChzdGFydCwgZW5kKTtcbiAgICAgICAgaWYgKGluZGV4IDwgMCkgY29udGludWU7XG4gICAgICAgIGNodW5rLnBsYWNlKGluZGV4IC0gc2VnbWVudC5kZWx0YSwgc2VnbWVudCk7XG4gICAgICAgIGNodW5rLm92ZXJsYXBzID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBlaXRoZXIgdW5yZXNvbHZlZCwgb3IgZGlkbid0IGZpbmQgYSBtYXRjaDsganVzdCBhbGxvY2F0ZSBzcGFjZS5cbiAgICAvLyBsb29rIGZvciB0aGUgc21hbGxlc3QgcG9zc2libGUgZnJlZSBibG9jay5cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgY2h1bmsuc2VnbWVudHMpIHtcbiAgICAgIGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzLmdldChuYW1lKSE7XG4gICAgICBjb25zdCBzMCA9IHNlZ21lbnQub2Zmc2V0ITtcbiAgICAgIGNvbnN0IHMxID0gczAgKyBzZWdtZW50LnNpemUhO1xuICAgICAgbGV0IGZvdW5kOiBudW1iZXJ8dW5kZWZpbmVkO1xuICAgICAgbGV0IHNtYWxsZXN0ID0gSW5maW5pdHk7XG4gICAgICBmb3IgKGNvbnN0IFtmMCwgZjFdIG9mIHRoaXMuZnJlZS50YWlsKHMwKSkge1xuICAgICAgICBpZiAoZjAgPj0gczEpIGJyZWFrO1xuICAgICAgICBjb25zdCBkZiA9IE1hdGgubWluKGYxLCBzMSkgLSBmMDtcbiAgICAgICAgaWYgKGRmIDwgc2l6ZSkgY29udGludWU7XG4gICAgICAgIGlmIChkZiA8IHNtYWxsZXN0KSB7XG4gICAgICAgICAgZm91bmQgPSBmMDtcbiAgICAgICAgICBzbWFsbGVzdCA9IGRmO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQgIT0gbnVsbCkge1xuICAgICAgICAvLyBmb3VuZCBhIHJlZ2lvblxuICAgICAgICBjaHVuay5wbGFjZShmb3VuZCAtIHNlZ21lbnQuZGVsdGEsIHNlZ21lbnQpO1xuICAgICAgICAvLyB0aGlzLmZyZWUuZGVsZXRlKGYwLCBmMCArIHNpemUpO1xuICAgICAgICAvLyBUT0RPIC0gZmFjdG9yIG91dCB0aGUgc3Vicy1hd2FyZSBjb3B5IG1ldGhvZCFcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGBJbml0aWFsOlxcbiR7dGhpcy5pbml0aWFsUmVwb3J0fWApO1xuICAgIGNvbnNvbGUubG9nKGBBZnRlciBmaWxsaW5nOlxcbiR7dGhpcy5yZXBvcnQodHJ1ZSl9YCk7XG4gICAgY29uc3QgbmFtZSA9IGNodW5rLm5hbWUgPyBgJHtjaHVuay5uYW1lfSBgIDogJyc7XG4gICAgY29uc29sZS5sb2codGhpcy5zZWdtZW50cy5nZXQoY2h1bmsuc2VnbWVudHNbMF0pKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHNwYWNlIGZvciAke3NpemV9LWJ5dGUgY2h1bmsgJHtuYW1lfWluICR7XG4gICAgICAgICAgICAgICAgICAgICBjaHVuay5zZWdtZW50cy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgcmVzb2x2ZVN5bWJvbHMoZXhwcjogRXhwcik6IEV4cHIge1xuICAgIC8vIHByZS10cmF2ZXJzZSBzbyB0aGF0IHRyYW5zaXRpdmUgaW1wb3J0cyB3b3JrXG4gICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgd2hpbGUgKGUub3AgPT09ICdpbScgfHwgZS5vcCA9PT0gJ3N5bScpIHtcbiAgICAgICAgaWYgKGUub3AgPT09ICdpbScpIHtcbiAgICAgICAgICBjb25zdCBuYW1lID0gZS5zeW0hO1xuICAgICAgICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5leHBvcnRzLmdldChuYW1lKTtcbiAgICAgICAgICBpZiAoaW1wb3J0ZWQgPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgYXQgPSBUb2tlbi5hdChleHByKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU3ltYm9sIG5ldmVyIGV4cG9ydGVkICR7bmFtZX0ke2F0fWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlID0gdGhpcy5zeW1ib2xzW2ltcG9ydGVkXS5leHByITtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZS5udW0gPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgbm90IGdsb2JhbGApO1xuICAgICAgICAgIGUgPSB0aGlzLnN5bWJvbHNbZS5udW1dLmV4cHIhO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gRXhwci5ldmFsdWF0ZShyZWMoZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcmVzb2x2ZUJhbmtCeXRlcyhleHByOiBFeHByKTogRXhwciB7XG4gIC8vICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGU6IEV4cHIpID0+IHtcbiAgLy8gICAgIGlmIChlLm9wICE9PSAnXicgfHwgZS5hcmdzPy5sZW5ndGggIT09IDEpIHJldHVybiBlO1xuICAvLyAgICAgY29uc3QgY2hpbGQgPSBlLmFyZ3NbMF07XG4gIC8vICAgICBpZiAoY2hpbGQub3AgIT09ICdvZmYnKSByZXR1cm4gZTtcbiAgLy8gICAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbY2hpbGQubnVtIV07XG4gIC8vICAgICBjb25zdCBiYW5rcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvLyAgICAgZm9yIChjb25zdCBzIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gIC8vICAgICAgIGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzLmdldChzKTtcbiAgLy8gICAgICAgaWYgKHNlZ21lbnQ/LmJhbmsgIT0gbnVsbCkgYmFua3MuYWRkKHNlZ21lbnQuYmFuayk7XG4gIC8vICAgICB9XG4gIC8vICAgICBpZiAoYmFua3Muc2l6ZSAhPT0gMSkgcmV0dXJuIGU7XG4gIC8vICAgICBjb25zdCBbYl0gPSBiYW5rcztcbiAgLy8gICAgIHJldHVybiB7b3A6ICdudW0nLCBzaXplOiAxLCBudW06IGJ9O1xuICAvLyAgIH0pO1xuICAvLyB9XG5cbiAgLy8gICAgIGlmIChleHByLm9wID09PSAnaW1wb3J0Jykge1xuICAvLyAgICAgICBpZiAoIWV4cHIuc3ltKSB0aHJvdyBuZXcgRXJyb3IoYEltcG9ydCB3aXRoIG5vIHN5bWJvbC5gKTtcbiAgLy8gICAgICAgY29uc3Qgc3ltID0gdGhpcy5zeW1ib2xzW3RoaXMuZXhwb3J0cy5nZXQoZXhwci5zeW0pXTtcbiAgLy8gICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUltcG9ydHMoc3ltLmV4cHIpO1xuICAvLyAgICAgfVxuICAvLyAgICAgLy8gVE9ETyAtIHRoaXMgaXMgbm9uc2Vuc2UuLi5cbiAgLy8gICAgIGNvbnN0IGFyZ3MgPSBbXTtcbiAgLy8gICAgIGxldCBtdXQgPSBmYWxzZTtcbiAgLy8gICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwci5hcmdzOyBpKyspIHtcbiAgLy8gICAgICAgY29uc3QgY2hpbGQgPSBleHByLmFyZ3NbaV07XG4gIC8vICAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlSW1wb3J0cyhjaGlsZCk7XG4gIC8vICAgICAgIGFyZ3MucHVzaChyZXNvbHZlZCk7XG4gIC8vICAgICAgIGlmIChjaGlsZCAhPT0gcmVzb2x2ZWQpIGV4cHIuYXJnc1tpXSA9IHJlc29sdmVkO1xuICAvLyAgICAgICByZXR1cm4gXG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIC8vIFRPRE8gLSBhZGQgYWxsIHRoZSB0aGluZ3NcbiAgLy8gICByZXR1cm4gcGF0Y2g7XG4gIC8vIH1cblxuICBhZGRSYXdTZWdtZW50KHNlZ21lbnQ6IFNlZ21lbnQpIHtcbiAgICBsZXQgbGlzdCA9IHRoaXMucmF3U2VnbWVudHMuZ2V0KHNlZ21lbnQubmFtZSk7XG4gICAgaWYgKCFsaXN0KSB0aGlzLnJhd1NlZ21lbnRzLnNldChzZWdtZW50Lm5hbWUsIGxpc3QgPSBbXSk7XG4gICAgbGlzdC5wdXNoKHNlZ21lbnQpO1xuICB9XG5cbiAgYnVpbGRFeHBvcnRzKCk6IE1hcDxzdHJpbmcsIEV4cG9ydD4ge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBFeHBvcnQ+KCk7XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5zeW1ib2xzKSB7XG4gICAgICBpZiAoIXN5bWJvbC5leHBvcnQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZSA9IEV4cHIudHJhdmVyc2Uoc3ltYm9sLmV4cHIhLCAoZSwgcmVjKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVMaW5rKEV4cHIuZXZhbHVhdGUocmVjKGUpKSk7XG4gICAgICB9KTtcbiAgICAgIGlmIChlLm9wICE9PSAnbnVtJykgdGhyb3cgbmV3IEVycm9yKGBuZXZlciByZXNvbHZlZDogJHtzeW1ib2wuZXhwb3J0fWApO1xuICAgICAgY29uc3QgdmFsdWUgPSBlLm51bSE7XG4gICAgICBjb25zdCBvdXQ6IEV4cG9ydCA9IHt2YWx1ZX07XG4gICAgICBpZiAoZS5tZXRhPy5vZmZzZXQgIT0gbnVsbCAmJiBlLm1ldGEub3JnICE9IG51bGwpIHtcbiAgICAgICAgb3V0Lm9mZnNldCA9IGUubWV0YS5vZmZzZXQgKyB2YWx1ZSAtIGUubWV0YS5vcmc7XG4gICAgICB9XG4gICAgICBpZiAoZS5tZXRhPy5iYW5rICE9IG51bGwpIG91dC5iYW5rID0gZS5tZXRhLmJhbms7XG4gICAgICBtYXAuc2V0KHN5bWJvbC5leHBvcnQsIG91dCk7XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICByZXBvcnQodmVyYm9zZSA9IGZhbHNlKTogc3RyaW5nIHtcbiAgICAvLyBUT0RPIC0gYWNjZXB0IGEgc2VnbWVudCB0byBmaWx0ZXI/XG4gICAgbGV0IG91dCA9ICcnO1xuICAgIGZvciAoY29uc3QgW3MsIGVdIG9mIHRoaXMuZnJlZSkge1xuICAgICAgb3V0ICs9IGBGcmVlOiAke3MudG9TdHJpbmcoMTYpfS4uJHtlLnRvU3RyaW5nKDE2KX06ICR7ZSAtIHN9IGJ5dGVzXFxuYDtcbiAgICB9XG4gICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgIGZvciAoY29uc3QgW3MsIGNdIG9mIHRoaXMucGxhY2VkKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBjLm5hbWUgPz8gYENodW5rICR7Yy5pbmRleH1gO1xuICAgICAgICBjb25zdCBlbmQgPSBjLm9mZnNldCEgKyBjLnNpemU7XG4gICAgICAgIG91dCArPSBgJHtzLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAnMCcpfSAuLiAke1xuICAgICAgICAgICAgZW5kLnRvU3RyaW5nKDE2KS5wYWRTdGFydCg1LCAnMCcpfTogJHtuYW1lfSAoJHtlbmQgLSBzfSBieXRlcylcXG5gO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG59XG5cbmNvbnN0IERFQlVHID0gZmFsc2U7XG4iXX0=