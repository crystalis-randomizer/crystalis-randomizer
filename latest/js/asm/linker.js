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
            throw new Error(`Not a ${name}: $${val.toString(16)} at $${(this.org + offset).toString(16)}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFnQixPQUFPLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFTakMsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFTVSxVQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQTZCN0IsQ0FBQztJQXJDQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBZTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBS0QsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBZ0IsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8s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LENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxPQUFPLEVBQUU7WUFDWCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDaEMsTUFBTSxJQUFJLFNBQUcsQ0FBQyxDQUFDLElBQUksbUNBQUksU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDL0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUNyQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQzthQUN2RTtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0Y7QUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ludGVydmFsU2V0LCBTcGFyc2VCeXRlQXJyYXksIGJpbmFyeUluc2VydH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi9leHByLmpzJztcbmltcG9ydCB7Q2h1bmssIE1vZHVsZSwgU2VnbWVudCwgU3Vic3RpdHV0aW9uLCBTeW1ib2x9IGZyb20gJy4vbW9kdWxlLmpzJztcbmltcG9ydCB7VG9rZW59IGZyb20gJy4vdG9rZW4uanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydCB7XG4gIHZhbHVlOiBudW1iZXI7XG4gIG9mZnNldD86IG51bWJlcjtcbiAgYmFuaz86IG51bWJlcjtcbiAgLy9zZWdtZW50Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTGlua2VyIHtcbiAgc3RhdGljIGxpbmsoLi4uZmlsZXM6IE1vZHVsZVtdKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICBjb25zdCBsaW5rZXIgPSBuZXcgTGlua2VyKCk7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBsaW5rZXIucmVhZChmaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmtlci5saW5rKCk7XG4gIH1cblxuICBwcml2YXRlIF9saW5rID0gbmV3IExpbmsoKTtcbiAgcHJpdmF0ZSBfZXhwb3J0cz86IE1hcDxzdHJpbmcsIEV4cG9ydD47XG5cbiAgcmVhZChmaWxlOiBNb2R1bGUpOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsucmVhZEZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBiYXNlKGRhdGE6IFVpbnQ4QXJyYXksIG9mZnNldCA9IDApOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsuYmFzZShkYXRhLCBvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIHJldHVybiB0aGlzLl9saW5rLmxpbmsoKTtcbiAgfVxuXG4gIHJlcG9ydCh2ZXJib3NlID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZyh0aGlzLl9saW5rLnJlcG9ydCh2ZXJib3NlKSk7XG4gIH1cblxuICBleHBvcnRzKCk6IE1hcDxzdHJpbmcsIEV4cG9ydD4ge1xuICAgIGlmICh0aGlzLl9leHBvcnRzKSByZXR1cm4gdGhpcy5fZXhwb3J0cztcbiAgICByZXR1cm4gdGhpcy5fZXhwb3J0cyA9IHRoaXMuX2xpbmsuYnVpbGRFeHBvcnRzKCk7XG4gIH1cblxuICB3YXRjaCguLi5vZmZzZXQ6IG51bWJlcltdKSB7XG4gICAgdGhpcy5fbGluay53YXRjaGVzLnB1c2goLi4ub2Zmc2V0KTtcbiAgfVxufVxuXG5leHBvcnQgbmFtZXNwYWNlIExpbmtlciB7XG4gIGV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gICAgXG5cbiAgfVxufVxuXG4vLyBUT0RPIC0gbGluay10aW1lIG9ubHkgZnVuY3Rpb24gZm9yIGdldHRpbmcgZWl0aGVyIHRoZSBvcmlnaW5hbCBvciB0aGVcbi8vICAgICAgICBwYXRjaGVkIGJ5dGUuICBXb3VsZCBhbGxvdyBlLmcuIGNvcHkoJDgwMDAsICQyMDAwLCBcIjFlXCIpIHRvIG1vdmVcbi8vICAgICAgICBhIGJ1bmNoIG9mIGNvZGUgYXJvdW5kIHdpdGhvdXQgZXhwbGljaXRseSBjb3B5LXBhc3RpbmcgaXQgaW4gdGhlXG4vLyAgICAgICAgYXNtIHBhdGNoLlxuXG4vLyBUcmFja3MgYW4gZXhwb3J0LlxuLy8gaW50ZXJmYWNlIEV4cG9ydCB7XG4vLyAgIGNodW5rczogU2V0PG51bWJlcj47XG4vLyAgIHN5bWJvbDogbnVtYmVyO1xuLy8gfVxuXG5mdW5jdGlvbiBmYWlsKG1zZzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbn1cblxuY2xhc3MgTGlua1NlZ21lbnQge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGJhbms6IG51bWJlcjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICByZWFkb25seSBvZmZzZXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgbWVtb3J5OiBudW1iZXI7XG4gIHJlYWRvbmx5IGFkZHJlc3Npbmc6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzZWdtZW50OiBTZWdtZW50KSB7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMubmFtZSA9IHNlZ21lbnQubmFtZTtcbiAgICB0aGlzLmJhbmsgPSBzZWdtZW50LmJhbmsgPz8gMDtcbiAgICB0aGlzLmFkZHJlc3NpbmcgPSBzZWdtZW50LmFkZHJlc3NpbmcgPz8gMjtcbiAgICB0aGlzLnNpemUgPSBzZWdtZW50LnNpemUgPz8gZmFpbChgU2l6ZSBtdXN0IGJlIHNwZWNpZmllZDogJHtuYW1lfWApO1xuICAgIHRoaXMub2Zmc2V0ID0gc2VnbWVudC5vZmZzZXQgPz8gZmFpbChgT0Zmc2V0IG11c3QgYmUgc3BlY2lmaWVkOiAke25hbWV9YCk7XG4gICAgdGhpcy5tZW1vcnkgPSBzZWdtZW50Lm1lbW9yeSA/PyBmYWlsKGBPRmZzZXQgbXVzdCBiZSBzcGVjaWZpZWQ6ICR7bmFtZX1gKTtcbiAgfVxuXG4gIC8vIG9mZnNldCA9IG9yZyArIGRlbHRhXG4gIGdldCBkZWx0YSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5vZmZzZXQgLSB0aGlzLm1lbW9yeTsgfVxufVxuXG5jbGFzcyBMaW5rQ2h1bmsge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gIHNlZ21lbnRzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgYXNzZXJ0czogRXhwcltdO1xuXG4gIHN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcbiAgc2VsZlN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcblxuICAvKiogR2xvYmFsIElEcyBvZiBjaHVua3MgbmVlZGVkIHRvIGxvY2F0ZSBiZWZvcmUgd2UgY2FuIGNvbXBsZXRlIHRoaXMgb25lLiAqL1xuICBkZXBzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8qKiBTeW1ib2xzIHRoYXQgYXJlIGltcG9ydGVkIGludG8gdGhpcyBjaHVuayAodGhlc2UgYXJlIGFsc28gZGVwcykuICovXG4gIGltcG9ydHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgLy8gLyoqIFN5bWJvbHMgdGhhdCBhcmUgZXhwb3J0ZWQgZnJvbSB0aGlzIGNodW5rLiAqL1xuICAvLyBleHBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9sbG93ID0gbmV3IE1hcDxTdWJzdGl0dXRpb24sIExpbmtDaHVuaz4oKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY2h1bmsgaXMgcGxhY2VkIG92ZXJsYXBwaW5nIHdpdGggc29tZXRoaW5nIGVsc2UuXG4gICAqIE92ZXJsYXBzIGFyZW4ndCB3cml0dGVuIHRvIHRoZSBwYXRjaC5cbiAgICovXG4gIG92ZXJsYXBzID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBfZGF0YT86IFVpbnQ4QXJyYXk7XG5cbiAgcHJpdmF0ZSBfb3JnPzogbnVtYmVyO1xuICBwcml2YXRlIF9vZmZzZXQ/OiBudW1iZXI7XG4gIHByaXZhdGUgX3NlZ21lbnQ/OiBMaW5rU2VnbWVudDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsaW5rZXI6IExpbmssXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgIGNodW5rOiBDaHVuazxVaW50OEFycmF5PixcbiAgICAgICAgICAgICAgY2h1bmtPZmZzZXQ6IG51bWJlcixcbiAgICAgICAgICAgICAgc3ltYm9sT2Zmc2V0OiBudW1iZXIpIHtcbiAgICB0aGlzLm5hbWUgPSBjaHVuay5uYW1lO1xuICAgIHRoaXMuc2l6ZSA9IGNodW5rLmRhdGEubGVuZ3RoO1xuICAgIHRoaXMuc2VnbWVudHMgPSBjaHVuay5zZWdtZW50cztcbiAgICB0aGlzLl9kYXRhID0gY2h1bmsuZGF0YTtcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzIHx8IFtdKSB7XG4gICAgICB0aGlzLnN1YnMuYWRkKHRyYW5zbGF0ZVN1YihzdWIsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICB9XG4gICAgdGhpcy5hc3NlcnRzID0gKGNodW5rLmFzc2VydHMgfHwgW10pXG4gICAgICAgIC5tYXAoZSA9PiB0cmFuc2xhdGVFeHByKGUsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICBpZiAoY2h1bmsub3JnKSB0aGlzLl9vcmcgPSBjaHVuay5vcmc7XG4gIH1cblxuICBnZXQgb3JnKCkgeyByZXR1cm4gdGhpcy5fb3JnOyB9XG4gIGdldCBvZmZzZXQoKSB7IHJldHVybiB0aGlzLl9vZmZzZXQ7IH1cbiAgZ2V0IHNlZ21lbnQoKSB7IHJldHVybiB0aGlzLl9zZWdtZW50OyB9XG4gIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YSA/PyBmYWlsKCdubyBkYXRhJyk7IH1cblxuICBpbml0aWFsUGxhY2VtZW50KCkge1xuICAgIC8vIEludmFyaWFudDogZXhhY3RseSBvbmUgb2YgKGRhdGEpIG9yIChvcmcsIF9vZmZzZXQsIF9zZWdtZW50KSBpcyBwcmVzZW50LlxuICAgIC8vIElmIChvcmcsIC4uLikgZmlsbGVkIGluIHRoZW4gd2UgdXNlIGxpbmtlci5kYXRhIGluc3RlYWQuXG4gICAgLy8gV2UgZG9uJ3QgY2FsbCB0aGlzIGluIHRoZSBjdG9yIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiBhbGwgdGhlIHNlZ21lbnRzXG4gICAgLy8gYmVpbmcgbG9hZGVkLCBidXQgaXQncyB0aGUgZmlyc3QgdGhpbmcgd2UgZG8gaW4gbGluaygpLlxuICAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuO1xuICAgIGNvbnN0IGVsaWdpYmxlU2VnbWVudHM6IExpbmtTZWdtZW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5zZWdtZW50cykge1xuICAgICAgY29uc3QgcyA9IHRoaXMubGlua2VyLnNlZ21lbnRzLmdldChuYW1lKTtcbiAgICAgIGlmICghcykgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHNlZ21lbnQ6ICR7bmFtZX1gKTtcbiAgICAgIGlmICh0aGlzLl9vcmcgPj0gcy5tZW1vcnkgJiYgdGhpcy5fb3JnIDwgcy5tZW1vcnkgKyBzLnNpemUpIHtcbiAgICAgICAgZWxpZ2libGVTZWdtZW50cy5wdXNoKHMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZWxpZ2libGVTZWdtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBzZWdtZW50OiAke2VsaWdpYmxlU2VnbWVudHN9YCk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnQgPSBlbGlnaWJsZVNlZ21lbnRzWzBdO1xuICAgIGlmICh0aGlzLl9vcmcgPj0gc2VnbWVudC5tZW1vcnkgKyBzZWdtZW50LnNpemUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2h1bmsgZG9lcyBub3QgZml0IGluIHNlZ21lbnQgJHtzZWdtZW50Lm5hbWV9YCk7XG4gICAgfVxuICAgIHRoaXMucGxhY2UodGhpcy5fb3JnLCBzZWdtZW50KTtcbiAgfVxuXG4gIHBsYWNlKG9yZzogbnVtYmVyLCBzZWdtZW50OiBMaW5rU2VnbWVudCkge1xuICAgIHRoaXMuX29yZyA9IG9yZztcbiAgICB0aGlzLl9zZWdtZW50ID0gc2VnbWVudDtcbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLl9vZmZzZXQgPSBvcmcgKyBzZWdtZW50LmRlbHRhO1xuICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLmxpbmtlci53YXRjaGVzKSB7XG4gICAgICBpZiAodyA+PSBvZmZzZXQgJiYgdyA8IG9mZnNldCArIHRoaXMuc2l6ZSkgZGVidWdnZXI7XG4gICAgfVxuICAgIGJpbmFyeUluc2VydCh0aGlzLmxpbmtlci5wbGFjZWQsIHggPT4geFswXSwgW29mZnNldCwgdGhpc10pO1xuICAgIC8vIENvcHkgZGF0YSwgbGVhdmluZyBvdXQgYW55IGhvbGVzXG4gICAgY29uc3QgZnVsbCA9IHRoaXMubGlua2VyLmRhdGE7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuX2RhdGEgPz8gZmFpbChgTm8gZGF0YWApO1xuICAgIHRoaXMuX2RhdGEgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAodGhpcy5zdWJzLnNpemUpIHtcbiAgICAgIGZ1bGwuc3BsaWNlKG9mZnNldCwgZGF0YS5sZW5ndGgpO1xuICAgICAgY29uc3Qgc3BhcnNlID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAgICAgc3BhcnNlLnNldCgwLCBkYXRhKTtcbiAgICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc3Vicykge1xuICAgICAgICBzcGFyc2Uuc3BsaWNlKHN1Yi5vZmZzZXQsIHN1Yi5zaXplKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW3N0YXJ0LCBjaHVua10gb2Ygc3BhcnNlLmNodW5rcygpKSB7XG4gICAgICAgIGZ1bGwuc2V0KG9mZnNldCArIHN0YXJ0LCAuLi5jaHVuayk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGwuc2V0KG9mZnNldCwgZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gUmV0cnkgdGhlIGZvbGxvdy1vbnNcbiAgICBmb3IgKGNvbnN0IFtzdWIsIGNodW5rXSBvZiB0aGlzLmZvbGxvdykge1xuICAgICAgY2h1bmsucmVzb2x2ZVN1YihzdWIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpbmtlci5mcmVlLmRlbGV0ZSh0aGlzLm9mZnNldCEsIHRoaXMub2Zmc2V0ISArIHRoaXMuc2l6ZSk7XG4gIH1cblxuICByZXNvbHZlU3Vicyhpbml0aWFsID0gZmFsc2UpIHsgLy86IE1hcDxudW1iZXIsIFN1YnN0aXR1dGlvbltdPiB7XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBzdWJzLCBzZWUgd2hhdCBwcm9ncmVzIHdlIGNhbiBtYWtlP1xuICAgIC8vIHJlc3VsdDogbGlzdCBvZiBkZXBlbmRlbnQgY2h1bmtzLlxuXG4gICAgLy8gTk9URTogaWYgd2UgZGVwZW5kIG9uIG91cnNlbGYgdGhlbiB3ZSB3aWxsIHJldHVybiBlbXB0eSBkZXBzLFxuICAgIC8vICAgICAgIGFuZCBtYXkgYmUgcGxhY2VkIGltbWVkaWF0ZWx5LCBidXQgd2lsbCBzdGlsbCBoYXZlIGhvbGVzLlxuICAgIC8vICAgICAgLSBOTywgaXQncyByZXNwb25zaWJpbGl0eSBvZiBjYWxsZXIgdG8gY2hlY2sgdGhhdFxuICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc2VsZlN1YnMpIHtcbiAgICAgIHRoaXMucmVzb2x2ZVN1YihzdWIsIGluaXRpYWwpO1xuICAgIH1cblxuICAgIC8vIGNvbnN0IGRlcHMgPSBuZXcgU2V0KCk7XG4gICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5zdWJzKSB7XG4gICAgICAvLyBjb25zdCBzdWJEZXBzID0gXG4gICAgICB0aGlzLnJlc29sdmVTdWIoc3ViLCBpbml0aWFsKTtcbiAgICAgIC8vIGlmICghc3ViRGVwcykgY29udGludWU7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcCBvZiBzdWJEZXBzKSB7XG4gICAgICAvLyAgIGxldCBzdWJzID0gZGVwcy5nZXQoZGVwKTtcbiAgICAgIC8vICAgaWYgKCFzdWJzKSBkZXBzLnNldChkZXAsIHN1YnMgPSBbXSk7XG4gICAgICAvLyAgIHN1YnMucHVzaChzdWIpO1xuICAgICAgLy8gfVxuICAgIH1cbiAgICAvLyBpZiAodGhpcy5vcmcgIT0gbnVsbCkgcmV0dXJuIG5ldyBTZXQoKTtcbiAgICAvLyByZXR1cm4gZGVwcztcbiAgfVxuXG4gIGFkZERlcChzdWI6IFN1YnN0aXR1dGlvbiwgZGVwOiBudW1iZXIpIHtcbiAgICBpZiAoZGVwID09PSB0aGlzLmluZGV4ICYmIHRoaXMuc3Vicy5kZWxldGUoc3ViKSkgdGhpcy5zZWxmU3Vicy5hZGQoc3ViKTtcbiAgICB0aGlzLmxpbmtlci5jaHVua3NbZGVwXS5mb2xsb3cuc2V0KHN1YiwgdGhpcyk7XG4gICAgdGhpcy5kZXBzLmFkZChkZXApO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGxpc3Qgb2YgZGVwZW5kZW50IGNodW5rcywgb3IgdW5kZWZpbmVkIGlmIHN1Y2Nlc3NmdWwuXG4gIHJlc29sdmVTdWIoc3ViOiBTdWJzdGl0dXRpb24sIGluaXRpYWw6IGJvb2xlYW4pIHsgLy86IEl0ZXJhYmxlPG51bWJlcj58dW5kZWZpbmVkIHtcblxuICAgIC8vIFRPRE8gLSByZXNvbHZlKHJlc29sdmVyKSB2aWEgY2h1bmtEYXRhIHRvIHJlc29sdmUgYmFua3MhIVxuXG5cbiAgICAvLyBEbyBhIGZ1bGwgdHJhdmVyc2Ugb2YgdGhlIGV4cHJlc3Npb24gLSBzZWUgd2hhdCdzIGJsb2NraW5nIHVzLlxuICAgIGlmICghdGhpcy5zdWJzLmhhcyhzdWIpICYmICF0aGlzLnNlbGZTdWJzLmhhcyhzdWIpKSByZXR1cm47XG4gICAgc3ViLmV4cHIgPSBFeHByLnRyYXZlcnNlKHN1Yi5leHByLCAoZSwgcmVjLCBwKSA9PiB7XG4gICAgICAvLyBGaXJzdCBoYW5kbGUgbW9zdCBjb21tb24gYmFuayBieXRlIGNhc2UsIHNpbmNlIGl0IHRyaWdnZXJzIG9uIGFcbiAgICAgIC8vIGRpZmZlcmVudCB0eXBlIG9mIHJlc29sdXRpb24uXG4gICAgICBpZiAoaW5pdGlhbCAmJiBwPy5vcCA9PT0gJ14nICYmIHAuYXJncyEubGVuZ3RoID09PSAxICYmIGUubWV0YSkge1xuICAgICAgICBpZiAoZS5tZXRhLmJhbmsgPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuYWRkRGVwKHN1YiwgZS5tZXRhLmNodW5rISk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGU7IC8vIHNraXAgcmVjdXJzaW9uIGVpdGhlciB3YXkuXG4gICAgICB9XG4gICAgICBlID0gdGhpcy5saW5rZXIucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICAgIGlmIChpbml0aWFsICYmIGUubWV0YT8ucmVsKSB0aGlzLmFkZERlcChzdWIsIGUubWV0YS5jaHVuayEpO1xuICAgICAgcmV0dXJuIGU7XG4gICAgfSk7XG5cbiAgICAvLyBQUk9CTEVNIC0gb2ZmIGlzIHJlbGF0aXZlIHRvIHRoZSBjaHVuaywgYnV0IHdlIHdhbnQgdG8gYmUgYWJsZSB0b1xuICAgIC8vIHNwZWNpZnkgYW4gQUJTT0xVVEUgb3JnIHdpdGhpbiBhIHNlZ21lbnQuLi4hXG4gICAgLy8gQW4gYWJzb2x1dGUgb2Zmc2V0IHdpdGhpbiB0aGUgd2hvbGUgb3JpZyBpcyBubyBnb29kLCBlaXRoZXJcbiAgICAvLyB3YW50IHRvIHdyaXRlIGl0IGFzIC5zZWdtZW50IFwiZm9vXCI7IFN5bSA9ICQxMjM0XG4gICAgLy8gQ291bGQgYWxzbyBqdXN0IGRvIC5tb3ZlIGNvdW50LCBcInNlZ1wiLCAkMTIzNCBhbmQgc3RvcmUgYSBzcGVjaWFsIG9wXG4gICAgLy8gdGhhdCB1c2VzIGJvdGggc3ltIGFuZCBudW0/XG5cbiAgICAvLyBTZWUgaWYgd2UgY2FuIGRvIGl0IGltbWVkaWF0ZWx5LlxuICAgIGxldCBkZWwgPSBmYWxzZTtcbiAgICBpZiAoc3ViLmV4cHIub3AgPT09ICdudW0nICYmICFzdWIuZXhwci5tZXRhPy5yZWwpIHtcbiAgICAgIHRoaXMud3JpdGVWYWx1ZShzdWIub2Zmc2V0LCBzdWIuZXhwci5udW0hLCBzdWIuc2l6ZSk7XG4gICAgICBkZWwgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoc3ViLmV4cHIub3AgPT09ICcubW92ZScpIHtcbiAgICAgIGlmIChzdWIuZXhwci5hcmdzIS5sZW5ndGggIT09IDEpIHRocm93IG5ldyBFcnJvcihgYmFkIC5tb3ZlYCk7XG4gICAgICBjb25zdCBjaGlsZCA9IHN1Yi5leHByLmFyZ3MhWzBdO1xuICAgICAgaWYgKGNoaWxkLm9wID09PSAnbnVtJyAmJiBjaGlsZC5tZXRhPy5vZmZzZXQgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkZWx0YSA9XG4gICAgICAgICAgICBjaGlsZC5tZXRhIS5vZmZzZXQhIC0gKGNoaWxkLm1ldGEhLnJlbCA/IDAgOiBjaGlsZC5tZXRhIS5vcmchKTtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBjaGlsZC5udW0hICsgZGVsdGE7XG4gICAgICAgIGNvbnN0IHNsaWNlID0gdGhpcy5saW5rZXIub3JpZy5zbGljZShzdGFydCwgc3RhcnQgKyBzdWIuc2l6ZSk7XG4gICAgICAgIHRoaXMud3JpdGVCeXRlcyhzdWIub2Zmc2V0LCBVaW50OEFycmF5LmZyb20oc2xpY2UpKTtcbiAgICAgICAgZGVsID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGRlbCkge1xuICAgICAgdGhpcy5zdWJzLmRlbGV0ZShzdWIpIHx8IHRoaXMuc2VsZlN1YnMuZGVsZXRlKHN1Yik7XG4gICAgICBpZiAoIXRoaXMuc3Vicy5zaXplKSB7IC8vIE5FVzogaWdub3JlcyBzZWxmLXN1YnMgbm93XG4gICAgICAvLyBpZiAoIXRoaXMuc3Vicy5zaXplIHx8IChkZXBzLnNpemUgPT09IDEgJiYgZGVwcy5oYXModGhpcy5pbmRleCkpKSAge1xuICAgICAgICAvLyBhZGQgdG8gcmVzb2x2ZWQgcXVldWUgLSByZWFkeSB0byBiZSBwbGFjZWQhXG4gICAgICAgIC8vIFF1ZXN0aW9uOiBzaG91bGQgd2UgcGxhY2UgaXQgcmlnaHQgYXdheT8gIFdlIHBsYWNlIHRoZSBmaXhlZCBjaHVua3NcbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgaW4gdGhlIGN0b3IsIGJ1dCB0aGVyZSdzIG5vIGNob2ljZSB0byBkZWZlci4gIEZvciByZWxvY1xuICAgICAgICAvLyBjaHVua3MsIGl0J3MgYmV0dGVyIHRvIHdhaXQgdW50aWwgd2UndmUgcmVzb2x2ZWQgYXMgbXVjaCBhcyBwb3NzaWJsZVxuICAgICAgICAvLyBiZWZvcmUgcGxhY2luZyBhbnl0aGluZy4gIEZvcnR1bmF0ZWx5LCBwbGFjaW5nIGEgY2h1bmsgd2lsbFxuICAgICAgICAvLyBhdXRvbWF0aWNhbGx5IHJlc29sdmUgYWxsIGRlcHMgbm93IVxuICAgICAgICBpZiAodGhpcy5saW5rZXIudW5yZXNvbHZlZENodW5rcy5kZWxldGUodGhpcykpIHtcbiAgICAgICAgICB0aGlzLmxpbmtlci5pbnNlcnRSZXNvbHZlZCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdyaXRlQnl0ZXMob2Zmc2V0OiBudW1iZXIsIGJ5dGVzOiBVaW50OEFycmF5KSB7XG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgIHRoaXMuX2RhdGEuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyBieXRlcy5sZW5ndGgpLnNldChieXRlcyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9vZmZzZXQgIT0gbnVsbCkge1xuICAgICAgdGhpcy5saW5rZXIuZGF0YS5zZXQodGhpcy5fb2Zmc2V0ICsgb2Zmc2V0LCBieXRlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZWApO1xuICAgIH1cbiAgfVxuXG4gIHdyaXRlVmFsdWUob2Zmc2V0OiBudW1iZXIsIHZhbDogbnVtYmVyLCBzaXplOiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gdGhpcyBpcyBhbG1vc3QgZW50aXJlbHkgY29waWVkIGZyb20gcHJvY2Vzc29yIHdyaXRlTnVtYmVyXG4gICAgY29uc3QgYml0cyA9IChzaXplKSA8PCAzO1xuICAgIGlmICh2YWwgIT0gbnVsbCAmJiAodmFsIDwgKC0xIDw8IGJpdHMpIHx8IHZhbCA+PSAoMSA8PCBiaXRzKSkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBbJ2J5dGUnLCAnd29yZCcsICdmYXJ3b3JkJywgJ2R3b3JkJ11bc2l6ZSAtIDFdO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgYSAke25hbWV9OiAkJHt2YWwudG9TdHJpbmcoMTYpfSBhdCAkJHtcbiAgICAgICAgICAodGhpcy5vcmchICsgb2Zmc2V0KS50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGJ5dGVzW2ldID0gdmFsICYgMHhmZjtcbiAgICAgIHZhbCA+Pj0gODtcbiAgICB9XG4gICAgdGhpcy53cml0ZUJ5dGVzKG9mZnNldCwgYnl0ZXMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVN1YihzOiBTdWJzdGl0dXRpb24sIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBTdWJzdGl0dXRpb24ge1xuICBzID0gey4uLnN9O1xuICBzLmV4cHIgPSB0cmFuc2xhdGVFeHByKHMuZXhwciwgZGMsIGRzKTtcbiAgcmV0dXJuIHM7XG59XG5mdW5jdGlvbiB0cmFuc2xhdGVFeHByKGU6IEV4cHIsIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBFeHByIHtcbiAgZSA9IHsuLi5lfTtcbiAgaWYgKGUubWV0YSkgZS5tZXRhID0gey4uLmUubWV0YX07XG4gIGlmIChlLmFyZ3MpIGUuYXJncyA9IGUuYXJncy5tYXAoYSA9PiB0cmFuc2xhdGVFeHByKGEsIGRjLCBkcykpO1xuICBpZiAoZS5tZXRhPy5jaHVuayAhPSBudWxsKSBlLm1ldGEuY2h1bmsgKz0gZGM7XG4gIGlmIChlLm9wID09PSAnc3ltJyAmJiBlLm51bSAhPSBudWxsKSBlLm51bSArPSBkcztcbiAgcmV0dXJuIGU7XG59XG5mdW5jdGlvbiB0cmFuc2xhdGVTeW1ib2woczogU3ltYm9sLCBkYzogbnVtYmVyLCBkczogbnVtYmVyKTogU3ltYm9sIHtcbiAgcyA9IHsuLi5zfTtcbiAgaWYgKHMuZXhwcikgcy5leHByID0gdHJhbnNsYXRlRXhwcihzLmV4cHIsIGRjLCBkcyk7XG4gIHJldHVybiBzO1xufVxuXG4vLyBUaGlzIGNsYXNzIGlzIHNpbmdsZS11c2UuXG5jbGFzcyBMaW5rIHtcbiAgZGF0YSA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgb3JpZyA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgLy8gTWFwcyBzeW1ib2wgdG8gc3ltYm9sICMgLy8gW3N5bWJvbCAjLCBkZXBlbmRlbnQgY2h1bmtzXVxuICBleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTsgLy8gcmVhZG9ubHkgW251bWJlciwgU2V0PG51bWJlcj5dPigpO1xuICBjaHVua3M6IExpbmtDaHVua1tdID0gW107XG4gIHN5bWJvbHM6IFN5bWJvbFtdID0gW107XG4gIGZyZWUgPSBuZXcgSW50ZXJ2YWxTZXQoKTtcbiAgcmF3U2VnbWVudHMgPSBuZXcgTWFwPHN0cmluZywgU2VnbWVudFtdPigpO1xuICBzZWdtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBMaW5rU2VnbWVudD4oKTtcblxuICByZXNvbHZlZENodW5rczogTGlua0NodW5rW10gPSBbXTtcbiAgdW5yZXNvbHZlZENodW5rcyA9IG5ldyBTZXQ8TGlua0NodW5rPigpO1xuXG4gIHdhdGNoZXM6IG51bWJlcltdID0gW107IC8vIGRlYnVnZ2luZyBhaWQ6IG9mZnNldHMgdG8gd2F0Y2guXG4gIHBsYWNlZDogQXJyYXk8W251bWJlciwgTGlua0NodW5rXT4gPSBbXTtcbiAgaW5pdGlhbFJlcG9ydDogc3RyaW5nID0gJyc7XG5cbiAgLy8gVE9ETyAtIGRlZmVycmVkIC0gc3RvcmUgc29tZSBzb3J0IG9mIGRlcGVuZGVuY3kgZ3JhcGg/XG5cbiAgaW5zZXJ0UmVzb2x2ZWQoY2h1bms6IExpbmtDaHVuaykge1xuICAgIGJpbmFyeUluc2VydCh0aGlzLnJlc29sdmVkQ2h1bmtzLCBjID0+IGMuc2l6ZSwgY2h1bmspO1xuICB9XG5cbiAgYmFzZShkYXRhOiBVaW50OEFycmF5LCBvZmZzZXQgPSAwKSB7XG4gICAgdGhpcy5kYXRhLnNldChvZmZzZXQsIGRhdGEpO1xuICAgIHRoaXMub3JpZy5zZXQob2Zmc2V0LCBkYXRhKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGU6IE1vZHVsZSkge1xuICAgIGNvbnN0IGRjID0gdGhpcy5jaHVua3MubGVuZ3RoO1xuICAgIGNvbnN0IGRzID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAvLyBzZWdtZW50cyBjb21lIGZpcnN0LCBzaW5jZSBMaW5rQ2h1bmsgY29uc3RydWN0b3IgbmVlZHMgdGhlbVxuICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBmaWxlLnNlZ21lbnRzIHx8IFtdKSB7XG4gICAgICB0aGlzLmFkZFJhd1NlZ21lbnQoc2VnbWVudCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgZmlsZS5jaHVua3MgfHwgW10pIHtcbiAgICAgIGNvbnN0IGxjID0gbmV3IExpbmtDaHVuayh0aGlzLCB0aGlzLmNodW5rcy5sZW5ndGgsIGNodW5rLCBkYywgZHMpO1xuICAgICAgdGhpcy5jaHVua3MucHVzaChsYyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIGZpbGUuc3ltYm9scyB8fCBbXSkge1xuICAgICAgdGhpcy5zeW1ib2xzLnB1c2godHJhbnNsYXRlU3ltYm9sKHN5bWJvbCwgZGMsIGRzKSk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSB3aGF0IHRoZSBoZWNrIGRvIHdlIGRvIHdpdGggc2VnbWVudHM/XG4gICAgLy8gICAgICAtIGluIHBhcnRpY3VsYXIsIHdobyBpcyByZXNwb25zaWJsZSBmb3IgZGVmaW5pbmcgdGhlbT8/P1xuXG4gICAgLy8gQmFzaWMgaWRlYTpcbiAgICAvLyAgMS4gZ2V0IGFsbCB0aGUgY2h1bmtzXG4gICAgLy8gIDIuIGJ1aWxkIHVwIGEgZGVwZW5kZW5jeSBncmFwaFxuICAgIC8vICAzLiB3cml0ZSBhbGwgZml4ZWQgY2h1bmtzLCBtZW1vaXppbmcgYWJzb2x1dGUgb2Zmc2V0cyBvZlxuICAgIC8vICAgICBtaXNzaW5nIHN1YnMgKHRoZXNlIGFyZSBub3QgZWxpZ2libGUgZm9yIGNvYWxlc2NpbmcpLlxuICAgIC8vICAgICAtLSBwcm9iYWJseSBzYW1lIHRyZWF0bWVudCBmb3IgZnJlZWQgc2VjdGlvbnNcbiAgICAvLyAgNC4gZm9yIHJlbG9jIGNodW5rcywgZmluZCB0aGUgYmlnZ2VzdCBjaHVuayB3aXRoIG5vIGRlcHMuXG4gIH1cblxuICAvLyByZXNvbHZlQ2h1bmsoY2h1bms6IExpbmtDaHVuaykge1xuICAvLyAgIC8vaWYgKGNodW5rLnJlc29sdmluZykgcmV0dXJuOyAvLyBicmVhayBhbnkgY3ljbGVzXG4gICAgXG4gIC8vIH1cblxuICByZXNvbHZlTGluayhleHByOiBFeHByKTogRXhwciB7XG4gICAgaWYgKGV4cHIub3AgPT09ICcub3JpZycgJiYgZXhwci5hcmdzPy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGNoaWxkID0gZXhwci5hcmdzWzBdO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gY2hpbGQubWV0YT8ub2Zmc2V0O1xuICAgICAgaWYgKG9mZnNldCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IG51bSA9IHRoaXMub3JpZy5nZXQob2Zmc2V0ICsgY2hpbGQubnVtISk7XG4gICAgICAgIGlmIChudW0gIT0gbnVsbCkgcmV0dXJuIHtvcDogJ251bScsIG51bX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChleHByLm9wID09PSAnbnVtJyAmJiBleHByLm1ldGE/LmNodW5rICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSBleHByLm1ldGE7XG4gICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW21ldGEuY2h1bmshXTtcbiAgICAgIGlmIChjaHVuay5vcmcgIT09IG1ldGEub3JnIHx8XG4gICAgICAgICAgY2h1bmsuc2VnbWVudD8uYmFuayAhPT0gbWV0YS5iYW5rIHx8XG4gICAgICAgICAgY2h1bmsub2Zmc2V0ICE9PSBtZXRhLm9mZnNldCkge1xuICAgICAgICBjb25zdCBtZXRhMiA9IHtcbiAgICAgICAgICBvcmc6IGNodW5rLm9yZyxcbiAgICAgICAgICBvZmZzZXQ6IGNodW5rLm9mZnNldCxcbiAgICAgICAgICBiYW5rOiBjaHVuay5zZWdtZW50Py5iYW5rLFxuICAgICAgICB9O1xuICAgICAgICBleHByID0gRXhwci5ldmFsdWF0ZSh7Li4uZXhwciwgbWV0YTogey4uLm1ldGEsIC4uLm1ldGEyfX0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIC8vIE5PVEU6IHNvIGZhciB0aGlzIGlzIG9ubHkgdXNlZCBmb3IgYXNzZXJ0cz9cbiAgLy8gSXQgYmFzaWNhbGx5IGNvcHktcGFzdGVzIGZyb20gcmVzb2x2ZVN1YnMuLi4gOi0oXG5cbiAgcmVzb2x2ZUV4cHIoZXhwcjogRXhwcik6IG51bWJlciB7XG4gICAgZXhwciA9IEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICB9KTtcblxuICAgIGlmIChleHByLm9wID09PSAnbnVtJyAmJiAhZXhwci5tZXRhPy5yZWwpIHJldHVybiBleHByLm51bSE7XG4gICAgY29uc3QgYXQgPSBUb2tlbi5hdChleHByKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmdWxseSByZXNvbHZlIGV4cHIke2F0fWApO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIC8vIEJ1aWxkIHVwIHRoZSBMaW5rU2VnbWVudCBvYmplY3RzXG4gICAgZm9yIChjb25zdCBbbmFtZSwgc2VnbWVudHNdIG9mIHRoaXMucmF3U2VnbWVudHMpIHtcbiAgICAgIGxldCBzID0gc2VnbWVudHNbMF07XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHMgPSBTZWdtZW50Lm1lcmdlKHMsIHNlZ21lbnRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2VnbWVudHMuc2V0KG5hbWUsIG5ldyBMaW5rU2VnbWVudChzKSk7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZnJlZSBzcGFjZVxuICAgIGZvciAoY29uc3QgW25hbWUsIHNlZ21lbnRzXSBvZiB0aGlzLnJhd1NlZ21lbnRzKSB7XG4gICAgICBjb25zdCBzID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICAgIGNvbnN0IGZyZWUgPSBzZWdtZW50LmZyZWU7XG4gICAgICAgIC8vIEFkZCB0aGUgZnJlZSBzcGFjZVxuICAgICAgICBmb3IgKGNvbnN0IFtzdGFydCwgZW5kXSBvZiBmcmVlIHx8IFtdKSB7XG4gICAgICAgICAgdGhpcy5mcmVlLmFkZChzdGFydCArIHMuZGVsdGEsIGVuZCArIHMuZGVsdGEpO1xuICAgICAgICAgIHRoaXMuZGF0YS5zcGxpY2Uoc3RhcnQgKyBzLmRlbHRhLCBlbmQgLSBzdGFydCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gU2V0IHVwIGFsbCB0aGUgaW5pdGlhbCBwbGFjZW1lbnRzLlxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGNodW5rLmluaXRpYWxQbGFjZW1lbnQoKTtcbiAgICB9XG4gICAgaWYgKERFQlVHKSB7XG4gICAgICB0aGlzLmluaXRpYWxSZXBvcnQgPSBgSW5pdGlhbDpcXG4ke3RoaXMucmVwb3J0KHRydWUpfWA7XG4gICAgfVxuICAgIC8vIEZpbmQgYWxsIHRoZSBleHBvcnRzLlxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzeW1ib2wgPSB0aGlzLnN5bWJvbHNbaV07XG4gICAgICAvLyBUT0RPIC0gd2UnZCByZWFsbHkgbGlrZSB0byBpZGVudGlmeSB0aGlzIGVhcmxpZXIgaWYgYXQgYWxsIHBvc3NpYmxlIVxuICAgICAgaWYgKCFzeW1ib2wuZXhwcikgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJHtpfSBuZXZlciByZXNvbHZlZGApO1xuICAgICAgLy8gbG9vayBmb3IgaW1wb3J0cy9leHBvcnRzXG4gICAgICBpZiAoc3ltYm9sLmV4cG9ydCAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuZXhwb3J0cy5zZXQoc3ltYm9sLmV4cG9ydCwgaSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlc29sdmUgYWxsIHRoZSBpbXBvcnRzIGluIGFsbCBzeW1ib2wgYW5kIGNodW5rLnN1YnMgZXhwcnMuXG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5zeW1ib2xzKSB7XG4gICAgICBzeW1ib2wuZXhwciA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoc3ltYm9sLmV4cHIhKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzLmNodW5rcykge1xuICAgICAgZm9yIChjb25zdCBzdWIgb2YgWy4uLmNodW5rLnN1YnMsIC4uLmNodW5rLnNlbGZTdWJzXSkge1xuICAgICAgICBzdWIuZXhwciA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoc3ViLmV4cHIpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaHVuay5hc3NlcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNodW5rLmFzc2VydHNbaV0gPSB0aGlzLnJlc29sdmVTeW1ib2xzKGNodW5rLmFzc2VydHNbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBdCB0aGlzIHBvaW50LCB3ZSBkb24ndCBjYXJlIGFib3V0IHRoaXMuc3ltYm9scyBhdCBhbGwgYW55bW9yZS5cbiAgICAvLyBOb3cgZmlndXJlIG91dCB0aGUgZnVsbCBkZXBlbmRlbmN5IHRyZWU6IGNodW5rICNYIHJlcXVpcmVzIGNodW5rICNZXG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBjLnJlc29sdmVTdWJzKHRydWUpO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBmaWxsICh1bilyZXNvbHZlZENodW5rc1xuICAgIC8vICAgLSBnZXRzIFxuXG4gICAgY29uc3QgY2h1bmtzID0gWy4uLnRoaXMuY2h1bmtzXTtcbiAgICBjaHVua3Muc29ydCgoYSwgYikgPT4gYi5zaXplIC0gYS5zaXplKTtcblxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XG4gICAgICBjaHVuay5yZXNvbHZlU3VicygpO1xuICAgICAgaWYgKGNodW5rLnN1YnMuc2l6ZSkge1xuICAgICAgICB0aGlzLnVucmVzb2x2ZWRDaHVua3MuYWRkKGNodW5rKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0UmVzb2x2ZWQoY2h1bmspO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb3VudCA9IHRoaXMucmVzb2x2ZWRDaHVua3MubGVuZ3RoICsgMiAqIHRoaXMudW5yZXNvbHZlZENodW5rcy5zaXplO1xuICAgIHdoaWxlIChjb3VudCkge1xuICAgICAgY29uc3QgYyA9IHRoaXMucmVzb2x2ZWRDaHVua3MucG9wKCk7XG4gICAgICBpZiAoYykge1xuICAgICAgICB0aGlzLnBsYWNlQ2h1bmsoYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXNvbHZlIGFsbCB0aGUgZmlyc3QgdW5yZXNvbHZlZCBjaHVua3MnIGRlcHNcbiAgICAgICAgY29uc3QgW2ZpcnN0XSA9IHRoaXMudW5yZXNvbHZlZENodW5rcztcbiAgICAgICAgZm9yIChjb25zdCBkZXAgb2YgZmlyc3QuZGVwcykge1xuICAgICAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbZGVwXTtcbiAgICAgICAgICBpZiAoY2h1bmsub3JnID09IG51bGwpIHRoaXMucGxhY2VDaHVuayhjaHVuayk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnJlc29sdmVkQ2h1bmtzLmxlbmd0aCArIDIgKiB0aGlzLnVucmVzb2x2ZWRDaHVua3Muc2l6ZTtcbiAgICAgIGlmIChuZXh0ID09PSBjb3VudCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKHRoaXMucmVzb2x2ZWRDaHVua3MsIHRoaXMudW5yZXNvbHZlZENodW5rcyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm90IG1ha2luZyBwcm9ncmVzc2ApO1xuICAgICAgfVxuICAgICAgY291bnQgPSBuZXh0O1xuICAgIH1cblxuICAgIC8vIGlmICghY2h1bmsub3JnICYmICFjaHVuay5zdWJzLmxlbmd0aCkgdGhpcy5wbGFjZUNodW5rKGNodW5rKTtcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQgdGhlIGRlcCBncmFwaCBpcyBidWlsdCAtIG5vdyB0cmF2ZXJzZSBpdC5cblxuICAgIC8vIGNvbnN0IHBsYWNlID0gKGk6IG51bWJlcikgPT4ge1xuICAgIC8vICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tpXTtcbiAgICAvLyAgIGlmIChjaHVuay5vcmcgIT0gbnVsbCkgcmV0dXJuO1xuICAgIC8vICAgLy8gcmVzb2x2ZSBmaXJzdFxuICAgIC8vICAgY29uc3QgcmVtYWluaW5nOiBTdWJzdGl0dXRpb25bXSA9IFtdO1xuICAgIC8vICAgZm9yIChjb25zdCBzdWIgb2YgY2h1bmsuc3Vicykge1xuICAgIC8vICAgICBpZiAodGhpcy5yZXNvbHZlU3ViKGNodW5rLCBzdWIpKSByZW1haW5pbmcucHVzaChzdWIpO1xuICAgIC8vICAgfVxuICAgIC8vICAgY2h1bmsuc3VicyA9IHJlbWFpbmluZztcbiAgICAvLyAgIC8vIG5vdyBwbGFjZSB0aGUgY2h1bmtcbiAgICAvLyAgIHRoaXMucGxhY2VDaHVuayhjaHVuayk7IC8vIFRPRE8gLi4uXG4gICAgLy8gICAvLyB1cGRhdGUgdGhlIGdyYXBoOyBkb24ndCBib3RoZXIgZGVsZXRpbmcgZm9ybSBibG9ja2VkLlxuICAgIC8vICAgZm9yIChjb25zdCByZXZEZXAgb2YgcmV2RGVwc1tpXSkge1xuICAgIC8vICAgICBjb25zdCBmd2QgPSBmd2REZXBzW3JldkRlcF07XG4gICAgLy8gICAgIGZ3ZC5kZWxldGUoaSk7XG4gICAgLy8gICAgIGlmICghZndkLnNpemUpIGluc2VydCh1bmJsb2NrZWQsIHJldkRlcCk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIC8vIHdoaWxlICh1bmJsb2NrZWQubGVuZ3RoIHx8IGJsb2NrZWQubGVuZ3RoKSB7XG4gICAgLy8gICBsZXQgbmV4dCA9IHVuYmxvY2tlZC5zaGlmdCgpO1xuICAgIC8vICAgaWYgKG5leHQpIHtcbiAgICAvLyAgICAgcGxhY2UobmV4dCk7XG4gICAgLy8gICAgIGNvbnRpbnVlO1xuICAgIC8vICAgfVxuICAgIC8vICAgbmV4dCA9IGJsb2NrZWRbMF07XG4gICAgLy8gICBmb3IgKGNvbnN0IHJldiBvZiByZXZEZXBzW25leHRdKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLmNodW5rc1tyZXZdLm9yZyAhPSBudWxsKSB7IC8vIGFscmVhZHkgcGxhY2VkXG4gICAgLy8gICAgICAgYmxvY2tlZC5zaGlmdCgpO1xuICAgIC8vICAgICAgIGNvbnRpbnVlO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHBsYWNlKHJldik7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIGV2ZXJ5dGhpbmcgc2hvdWxkIGJlIHBsYWNlZCwgc28gZG8gb25lIGxhc3QgcmVzb2x2ZS5cblxuICAgIGNvbnN0IHBhdGNoID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLmNodW5rcykge1xuICAgICAgZm9yIChjb25zdCBhIG9mIGMuYXNzZXJ0cykge1xuICAgICAgICBjb25zdCB2ID0gdGhpcy5yZXNvbHZlRXhwcihhKTtcbiAgICAgICAgaWYgKHYpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBhdCA9IFRva2VuLmF0KGEpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbiBmYWlsZWQke2F0fWApO1xuICAgICAgfVxuICAgICAgaWYgKGMub3ZlcmxhcHMpIGNvbnRpbnVlO1xuICAgICAgcGF0Y2guc2V0KGMub2Zmc2V0ISwgLi4udGhpcy5kYXRhLnNsaWNlKGMub2Zmc2V0ISwgYy5vZmZzZXQhICsgYy5zaXplISkpO1xuICAgIH1cbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKHRoaXMucmVwb3J0KHRydWUpKTtcbiAgICByZXR1cm4gcGF0Y2g7XG4gIH1cblxuICBwbGFjZUNodW5rKGNodW5rOiBMaW5rQ2h1bmspIHtcbiAgICBpZiAoY2h1bmsub3JnICE9IG51bGwpIHJldHVybjsgLy8gZG9uJ3QgcmUtcGxhY2UuXG4gICAgY29uc3Qgc2l6ZSA9IGNodW5rLnNpemU7XG4gICAgaWYgKCFjaHVuay5zdWJzLnNpemUgJiYgIWNodW5rLnNlbGZTdWJzLnNpemUpIHtcbiAgICAgIC8vIGNodW5rIGlzIHJlc29sdmVkOiBzZWFyY2ggZm9yIGFuIGV4aXN0aW5nIGNvcHkgb2YgaXQgZmlyc3RcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSB0aGlzLmRhdGEucGF0dGVybihjaHVuay5kYXRhKTtcbiAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBjaHVuay5zZWdtZW50cykge1xuICAgICAgICBjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgICBjb25zdCBzdGFydCA9IHNlZ21lbnQub2Zmc2V0ITtcbiAgICAgICAgY29uc3QgZW5kID0gc3RhcnQgKyBzZWdtZW50LnNpemUhO1xuICAgICAgICBjb25zdCBpbmRleCA9IHBhdHRlcm4uc2VhcmNoKHN0YXJ0LCBlbmQpO1xuICAgICAgICBpZiAoaW5kZXggPCAwKSBjb250aW51ZTtcbiAgICAgICAgY2h1bmsucGxhY2UoaW5kZXggLSBzZWdtZW50LmRlbHRhLCBzZWdtZW50KTtcbiAgICAgICAgY2h1bmsub3ZlcmxhcHMgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGVpdGhlciB1bnJlc29sdmVkLCBvciBkaWRuJ3QgZmluZCBhIG1hdGNoOyBqdXN0IGFsbG9jYXRlIHNwYWNlLlxuICAgIC8vIGxvb2sgZm9yIHRoZSBzbWFsbGVzdCBwb3NzaWJsZSBmcmVlIGJsb2NrLlxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBjaHVuay5zZWdtZW50cykge1xuICAgICAgY29uc3Qgc2VnbWVudCA9IHRoaXMuc2VnbWVudHMuZ2V0KG5hbWUpITtcbiAgICAgIGNvbnN0IHMwID0gc2VnbWVudC5vZmZzZXQhO1xuICAgICAgY29uc3QgczEgPSBzMCArIHNlZ21lbnQuc2l6ZSE7XG4gICAgICBsZXQgZm91bmQ6IG51bWJlcnx1bmRlZmluZWQ7XG4gICAgICBsZXQgc21hbGxlc3QgPSBJbmZpbml0eTtcbiAgICAgIGZvciAoY29uc3QgW2YwLCBmMV0gb2YgdGhpcy5mcmVlLnRhaWwoczApKSB7XG4gICAgICAgIGlmIChmMCA+PSBzMSkgYnJlYWs7XG4gICAgICAgIGNvbnN0IGRmID0gTWF0aC5taW4oZjEsIHMxKSAtIGYwO1xuICAgICAgICBpZiAoZGYgPCBzaXplKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGRmIDwgc21hbGxlc3QpIHtcbiAgICAgICAgICBmb3VuZCA9IGYwO1xuICAgICAgICAgIHNtYWxsZXN0ID0gZGY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCAhPSBudWxsKSB7XG4gICAgICAgIC8vIGZvdW5kIGEgcmVnaW9uXG4gICAgICAgIGNodW5rLnBsYWNlKGZvdW5kIC0gc2VnbWVudC5kZWx0YSwgc2VnbWVudCk7XG4gICAgICAgIC8vIHRoaXMuZnJlZS5kZWxldGUoZjAsIGYwICsgc2l6ZSk7XG4gICAgICAgIC8vIFRPRE8gLSBmYWN0b3Igb3V0IHRoZSBzdWJzLWF3YXJlIGNvcHkgbWV0aG9kIVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coYEluaXRpYWw6XFxuJHt0aGlzLmluaXRpYWxSZXBvcnR9YCk7XG4gICAgY29uc29sZS5sb2coYEFmdGVyIGZpbGxpbmc6XFxuJHt0aGlzLnJlcG9ydCh0cnVlKX1gKTtcbiAgICBjb25zdCBuYW1lID0gY2h1bmsubmFtZSA/IGAke2NodW5rLm5hbWV9IGAgOiAnJztcbiAgICBjb25zb2xlLmxvZyh0aGlzLnNlZ21lbnRzLmdldChjaHVuay5zZWdtZW50c1swXSkpO1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgc3BhY2UgZm9yICR7c2l6ZX0tYnl0ZSBjaHVuayAke25hbWV9aW4gJHtcbiAgICAgICAgICAgICAgICAgICAgIGNodW5rLnNlZ21lbnRzLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICByZXNvbHZlU3ltYm9scyhleHByOiBFeHByKTogRXhwciB7XG4gICAgLy8gcHJlLXRyYXZlcnNlIHNvIHRoYXQgdHJhbnNpdGl2ZSBpbXBvcnRzIHdvcmtcbiAgICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZSwgcmVjKSA9PiB7XG4gICAgICB3aGlsZSAoZS5vcCA9PT0gJ2ltJyB8fCBlLm9wID09PSAnc3ltJykge1xuICAgICAgICBpZiAoZS5vcCA9PT0gJ2ltJykge1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBlLnN5bSE7XG4gICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLmV4cG9ydHMuZ2V0KG5hbWUpO1xuICAgICAgICAgIGlmIChpbXBvcnRlZCA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBhdCA9IFRva2VuLmF0KGV4cHIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgbmV2ZXIgZXhwb3J0ZWQgJHtuYW1lfSR7YXR9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUgPSB0aGlzLnN5bWJvbHNbaW1wb3J0ZWRdLmV4cHIhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChlLm51bSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCBub3QgZ2xvYmFsYCk7XG4gICAgICAgICAgZSA9IHRoaXMuc3ltYm9sc1tlLm51bV0uZXhwciE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHJlYyhlKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyByZXNvbHZlQmFua0J5dGVzKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgLy8gICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZTogRXhwcikgPT4ge1xuICAvLyAgICAgaWYgKGUub3AgIT09ICdeJyB8fCBlLmFyZ3M/Lmxlbmd0aCAhPT0gMSkgcmV0dXJuIGU7XG4gIC8vICAgICBjb25zdCBjaGlsZCA9IGUuYXJnc1swXTtcbiAgLy8gICAgIGlmIChjaGlsZC5vcCAhPT0gJ29mZicpIHJldHVybiBlO1xuICAvLyAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tjaGlsZC5udW0hXTtcbiAgLy8gICAgIGNvbnN0IGJhbmtzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgICBmb3IgKGNvbnN0IHMgb2YgY2h1bmsuc2VnbWVudHMpIHtcbiAgLy8gICAgICAgY29uc3Qgc2VnbWVudCA9IHRoaXMuc2VnbWVudHMuZ2V0KHMpO1xuICAvLyAgICAgICBpZiAoc2VnbWVudD8uYmFuayAhPSBudWxsKSBiYW5rcy5hZGQoc2VnbWVudC5iYW5rKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmIChiYW5rcy5zaXplICE9PSAxKSByZXR1cm4gZTtcbiAgLy8gICAgIGNvbnN0IFtiXSA9IGJhbmtzO1xuICAvLyAgICAgcmV0dXJuIHtvcDogJ251bScsIHNpemU6IDEsIG51bTogYn07XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyAgICAgaWYgKGV4cHIub3AgPT09ICdpbXBvcnQnKSB7XG4gIC8vICAgICAgIGlmICghZXhwci5zeW0pIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHdpdGggbm8gc3ltYm9sLmApO1xuICAvLyAgICAgICBjb25zdCBzeW0gPSB0aGlzLnN5bWJvbHNbdGhpcy5leHBvcnRzLmdldChleHByLnN5bSldO1xuICAvLyAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlSW1wb3J0cyhzeW0uZXhwcik7XG4gIC8vICAgICB9XG4gIC8vICAgICAvLyBUT0RPIC0gdGhpcyBpcyBub25zZW5zZS4uLlxuICAvLyAgICAgY29uc3QgYXJncyA9IFtdO1xuICAvLyAgICAgbGV0IG11dCA9IGZhbHNlO1xuICAvLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHByLmFyZ3M7IGkrKykge1xuICAvLyAgICAgICBjb25zdCBjaGlsZCA9IGV4cHIuYXJnc1tpXTtcbiAgLy8gICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVJbXBvcnRzKGNoaWxkKTtcbiAgLy8gICAgICAgYXJncy5wdXNoKHJlc29sdmVkKTtcbiAgLy8gICAgICAgaWYgKGNoaWxkICE9PSByZXNvbHZlZCkgZXhwci5hcmdzW2ldID0gcmVzb2x2ZWQ7XG4gIC8vICAgICAgIHJldHVybiBcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgLy8gVE9ETyAtIGFkZCBhbGwgdGhlIHRoaW5nc1xuICAvLyAgIHJldHVybiBwYXRjaDtcbiAgLy8gfVxuXG4gIGFkZFJhd1NlZ21lbnQoc2VnbWVudDogU2VnbWVudCkge1xuICAgIGxldCBsaXN0ID0gdGhpcy5yYXdTZWdtZW50cy5nZXQoc2VnbWVudC5uYW1lKTtcbiAgICBpZiAoIWxpc3QpIHRoaXMucmF3U2VnbWVudHMuc2V0KHNlZ21lbnQubmFtZSwgbGlzdCA9IFtdKTtcbiAgICBsaXN0LnB1c2goc2VnbWVudCk7XG4gIH1cblxuICBidWlsZEV4cG9ydHMoKTogTWFwPHN0cmluZywgRXhwb3J0PiB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIEV4cG9ydD4oKTtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIGlmICghc3ltYm9sLmV4cG9ydCkgY29udGludWU7XG4gICAgICBjb25zdCBlID0gRXhwci50cmF2ZXJzZShzeW1ib2wuZXhwciEsIChlLCByZWMpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKGUub3AgIT09ICdudW0nKSB0aHJvdyBuZXcgRXJyb3IoYG5ldmVyIHJlc29sdmVkOiAke3N5bWJvbC5leHBvcnR9YCk7XG4gICAgICBjb25zdCB2YWx1ZSA9IGUubnVtITtcbiAgICAgIGNvbnN0IG91dDogRXhwb3J0ID0ge3ZhbHVlfTtcbiAgICAgIGlmIChlLm1ldGE/Lm9mZnNldCAhPSBudWxsICYmIGUubWV0YS5vcmcgIT0gbnVsbCkge1xuICAgICAgICBvdXQub2Zmc2V0ID0gZS5tZXRhLm9mZnNldCArIHZhbHVlIC0gZS5tZXRhLm9yZztcbiAgICAgIH1cbiAgICAgIGlmIChlLm1ldGE/LmJhbmsgIT0gbnVsbCkgb3V0LmJhbmsgPSBlLm1ldGEuYmFuaztcbiAgICAgIG1hcC5zZXQoc3ltYm9sLmV4cG9ydCwgb3V0KTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHJlcG9ydCh2ZXJib3NlID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIC8vIFRPRE8gLSBhY2NlcHQgYSBzZWdtZW50IHRvIGZpbHRlcj9cbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgZm9yIChjb25zdCBbcywgZV0gb2YgdGhpcy5mcmVlKSB7XG4gICAgICBvdXQgKz0gYEZyZWU6ICR7cy50b1N0cmluZygxNil9Li4ke2UudG9TdHJpbmcoMTYpfTogJHtlIC0gc30gYnl0ZXNcXG5gO1xuICAgIH1cbiAgICBpZiAodmVyYm9zZSkge1xuICAgICAgZm9yIChjb25zdCBbcywgY10gb2YgdGhpcy5wbGFjZWQpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGMubmFtZSA/PyBgQ2h1bmsgJHtjLmluZGV4fWA7XG4gICAgICAgIGNvbnN0IGVuZCA9IGMub2Zmc2V0ISArIGMuc2l6ZTtcbiAgICAgICAgb3V0ICs9IGAke3MudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDUsICcwJyl9IC4uICR7XG4gICAgICAgICAgICBlbmQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDUsICcwJyl9OiAke25hbWV9ICgke2VuZCAtIHN9IGJ5dGVzKVxcbmA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cbn1cblxuY29uc3QgREVCVUcgPSBmYWxzZTtcbiJdfQ==