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
            throw new Error(`Non-unique segment: [${eligibleSegments}]`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFnQixPQUFPLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFTakMsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFTVSxVQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQTZCN0IsQ0FBQztJQXJDQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBZTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBS0QsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBZ0IsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQU8s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LENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1NBQ3ZFO1FBQ0QsSUFBSSxPQUFPLEVBQUU7WUFDWCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDaEMsTUFBTSxJQUFJLFNBQUcsQ0FBQyxDQUFDLElBQUksbUNBQUksU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFPLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDL0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxPQUNyQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQzthQUN2RTtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0Y7QUFFRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ludGVydmFsU2V0LCBTcGFyc2VCeXRlQXJyYXksIGJpbmFyeUluc2VydH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi9leHByLmpzJztcbmltcG9ydCB7Q2h1bmssIE1vZHVsZSwgU2VnbWVudCwgU3Vic3RpdHV0aW9uLCBTeW1ib2x9IGZyb20gJy4vbW9kdWxlLmpzJztcbmltcG9ydCB7VG9rZW59IGZyb20gJy4vdG9rZW4uanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydCB7XG4gIHZhbHVlOiBudW1iZXI7XG4gIG9mZnNldD86IG51bWJlcjtcbiAgYmFuaz86IG51bWJlcjtcbiAgLy9zZWdtZW50Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTGlua2VyIHtcbiAgc3RhdGljIGxpbmsoLi4uZmlsZXM6IE1vZHVsZVtdKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICBjb25zdCBsaW5rZXIgPSBuZXcgTGlua2VyKCk7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBsaW5rZXIucmVhZChmaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmtlci5saW5rKCk7XG4gIH1cblxuICBwcml2YXRlIF9saW5rID0gbmV3IExpbmsoKTtcbiAgcHJpdmF0ZSBfZXhwb3J0cz86IE1hcDxzdHJpbmcsIEV4cG9ydD47XG5cbiAgcmVhZChmaWxlOiBNb2R1bGUpOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsucmVhZEZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBiYXNlKGRhdGE6IFVpbnQ4QXJyYXksIG9mZnNldCA9IDApOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsuYmFzZShkYXRhLCBvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIHJldHVybiB0aGlzLl9saW5rLmxpbmsoKTtcbiAgfVxuXG4gIHJlcG9ydCh2ZXJib3NlID0gZmFsc2UpIHtcbiAgICBjb25zb2xlLmxvZyh0aGlzLl9saW5rLnJlcG9ydCh2ZXJib3NlKSk7XG4gIH1cblxuICBleHBvcnRzKCk6IE1hcDxzdHJpbmcsIEV4cG9ydD4ge1xuICAgIGlmICh0aGlzLl9leHBvcnRzKSByZXR1cm4gdGhpcy5fZXhwb3J0cztcbiAgICByZXR1cm4gdGhpcy5fZXhwb3J0cyA9IHRoaXMuX2xpbmsuYnVpbGRFeHBvcnRzKCk7XG4gIH1cblxuICB3YXRjaCguLi5vZmZzZXQ6IG51bWJlcltdKSB7XG4gICAgdGhpcy5fbGluay53YXRjaGVzLnB1c2goLi4ub2Zmc2V0KTtcbiAgfVxufVxuXG5leHBvcnQgbmFtZXNwYWNlIExpbmtlciB7XG4gIGV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gICAgXG5cbiAgfVxufVxuXG4vLyBUT0RPIC0gbGluay10aW1lIG9ubHkgZnVuY3Rpb24gZm9yIGdldHRpbmcgZWl0aGVyIHRoZSBvcmlnaW5hbCBvciB0aGVcbi8vICAgICAgICBwYXRjaGVkIGJ5dGUuICBXb3VsZCBhbGxvdyBlLmcuIGNvcHkoJDgwMDAsICQyMDAwLCBcIjFlXCIpIHRvIG1vdmVcbi8vICAgICAgICBhIGJ1bmNoIG9mIGNvZGUgYXJvdW5kIHdpdGhvdXQgZXhwbGljaXRseSBjb3B5LXBhc3RpbmcgaXQgaW4gdGhlXG4vLyAgICAgICAgYXNtIHBhdGNoLlxuXG4vLyBUcmFja3MgYW4gZXhwb3J0LlxuLy8gaW50ZXJmYWNlIEV4cG9ydCB7XG4vLyAgIGNodW5rczogU2V0PG51bWJlcj47XG4vLyAgIHN5bWJvbDogbnVtYmVyO1xuLy8gfVxuXG5mdW5jdGlvbiBmYWlsKG1zZzogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbn1cblxuY2xhc3MgTGlua1NlZ21lbnQge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGJhbms6IG51bWJlcjtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICByZWFkb25seSBvZmZzZXQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgbWVtb3J5OiBudW1iZXI7XG4gIHJlYWRvbmx5IGFkZHJlc3Npbmc6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihzZWdtZW50OiBTZWdtZW50KSB7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMubmFtZSA9IHNlZ21lbnQubmFtZTtcbiAgICB0aGlzLmJhbmsgPSBzZWdtZW50LmJhbmsgPz8gMDtcbiAgICB0aGlzLmFkZHJlc3NpbmcgPSBzZWdtZW50LmFkZHJlc3NpbmcgPz8gMjtcbiAgICB0aGlzLnNpemUgPSBzZWdtZW50LnNpemUgPz8gZmFpbChgU2l6ZSBtdXN0IGJlIHNwZWNpZmllZDogJHtuYW1lfWApO1xuICAgIHRoaXMub2Zmc2V0ID0gc2VnbWVudC5vZmZzZXQgPz8gZmFpbChgT0Zmc2V0IG11c3QgYmUgc3BlY2lmaWVkOiAke25hbWV9YCk7XG4gICAgdGhpcy5tZW1vcnkgPSBzZWdtZW50Lm1lbW9yeSA/PyBmYWlsKGBPRmZzZXQgbXVzdCBiZSBzcGVjaWZpZWQ6ICR7bmFtZX1gKTtcbiAgfVxuXG4gIC8vIG9mZnNldCA9IG9yZyArIGRlbHRhXG4gIGdldCBkZWx0YSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5vZmZzZXQgLSB0aGlzLm1lbW9yeTsgfVxufVxuXG5jbGFzcyBMaW5rQ2h1bmsge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmd8dW5kZWZpbmVkO1xuICByZWFkb25seSBzaXplOiBudW1iZXI7XG4gIHNlZ21lbnRzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgYXNzZXJ0czogRXhwcltdO1xuXG4gIHN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcbiAgc2VsZlN1YnMgPSBuZXcgU2V0PFN1YnN0aXR1dGlvbj4oKTtcblxuICAvKiogR2xvYmFsIElEcyBvZiBjaHVua3MgbmVlZGVkIHRvIGxvY2F0ZSBiZWZvcmUgd2UgY2FuIGNvbXBsZXRlIHRoaXMgb25lLiAqL1xuICBkZXBzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8qKiBTeW1ib2xzIHRoYXQgYXJlIGltcG9ydGVkIGludG8gdGhpcyBjaHVuayAodGhlc2UgYXJlIGFsc28gZGVwcykuICovXG4gIGltcG9ydHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgLy8gLyoqIFN5bWJvbHMgdGhhdCBhcmUgZXhwb3J0ZWQgZnJvbSB0aGlzIGNodW5rLiAqL1xuICAvLyBleHBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9sbG93ID0gbmV3IE1hcDxTdWJzdGl0dXRpb24sIExpbmtDaHVuaz4oKTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY2h1bmsgaXMgcGxhY2VkIG92ZXJsYXBwaW5nIHdpdGggc29tZXRoaW5nIGVsc2UuXG4gICAqIE92ZXJsYXBzIGFyZW4ndCB3cml0dGVuIHRvIHRoZSBwYXRjaC5cbiAgICovXG4gIG92ZXJsYXBzID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBfZGF0YT86IFVpbnQ4QXJyYXk7XG5cbiAgcHJpdmF0ZSBfb3JnPzogbnVtYmVyO1xuICBwcml2YXRlIF9vZmZzZXQ/OiBudW1iZXI7XG4gIHByaXZhdGUgX3NlZ21lbnQ/OiBMaW5rU2VnbWVudDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBsaW5rZXI6IExpbmssXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgIGNodW5rOiBDaHVuazxVaW50OEFycmF5PixcbiAgICAgICAgICAgICAgY2h1bmtPZmZzZXQ6IG51bWJlcixcbiAgICAgICAgICAgICAgc3ltYm9sT2Zmc2V0OiBudW1iZXIpIHtcbiAgICB0aGlzLm5hbWUgPSBjaHVuay5uYW1lO1xuICAgIHRoaXMuc2l6ZSA9IGNodW5rLmRhdGEubGVuZ3RoO1xuICAgIHRoaXMuc2VnbWVudHMgPSBjaHVuay5zZWdtZW50cztcbiAgICB0aGlzLl9kYXRhID0gY2h1bmsuZGF0YTtcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzIHx8IFtdKSB7XG4gICAgICB0aGlzLnN1YnMuYWRkKHRyYW5zbGF0ZVN1YihzdWIsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICB9XG4gICAgdGhpcy5hc3NlcnRzID0gKGNodW5rLmFzc2VydHMgfHwgW10pXG4gICAgICAgIC5tYXAoZSA9PiB0cmFuc2xhdGVFeHByKGUsIGNodW5rT2Zmc2V0LCBzeW1ib2xPZmZzZXQpKTtcbiAgICBpZiAoY2h1bmsub3JnKSB0aGlzLl9vcmcgPSBjaHVuay5vcmc7XG4gIH1cblxuICBnZXQgb3JnKCkgeyByZXR1cm4gdGhpcy5fb3JnOyB9XG4gIGdldCBvZmZzZXQoKSB7IHJldHVybiB0aGlzLl9vZmZzZXQ7IH1cbiAgZ2V0IHNlZ21lbnQoKSB7IHJldHVybiB0aGlzLl9zZWdtZW50OyB9XG4gIGdldCBkYXRhKCkgeyByZXR1cm4gdGhpcy5fZGF0YSA/PyBmYWlsKCdubyBkYXRhJyk7IH1cblxuICBpbml0aWFsUGxhY2VtZW50KCkge1xuICAgIC8vIEludmFyaWFudDogZXhhY3RseSBvbmUgb2YgKGRhdGEpIG9yIChvcmcsIF9vZmZzZXQsIF9zZWdtZW50KSBpcyBwcmVzZW50LlxuICAgIC8vIElmIChvcmcsIC4uLikgZmlsbGVkIGluIHRoZW4gd2UgdXNlIGxpbmtlci5kYXRhIGluc3RlYWQuXG4gICAgLy8gV2UgZG9uJ3QgY2FsbCB0aGlzIGluIHRoZSBjdG9yIGJlY2F1c2UgaXQgZGVwZW5kcyBvbiBhbGwgdGhlIHNlZ21lbnRzXG4gICAgLy8gYmVpbmcgbG9hZGVkLCBidXQgaXQncyB0aGUgZmlyc3QgdGhpbmcgd2UgZG8gaW4gbGluaygpLlxuICAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuO1xuICAgIGNvbnN0IGVsaWdpYmxlU2VnbWVudHM6IExpbmtTZWdtZW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5zZWdtZW50cykge1xuICAgICAgY29uc3QgcyA9IHRoaXMubGlua2VyLnNlZ21lbnRzLmdldChuYW1lKTtcbiAgICAgIGlmICghcykgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHNlZ21lbnQ6ICR7bmFtZX1gKTtcbiAgICAgIGlmICh0aGlzLl9vcmcgPj0gcy5tZW1vcnkgJiYgdGhpcy5fb3JnIDwgcy5tZW1vcnkgKyBzLnNpemUpIHtcbiAgICAgICAgZWxpZ2libGVTZWdtZW50cy5wdXNoKHMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZWxpZ2libGVTZWdtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm9uLXVuaXF1ZSBzZWdtZW50OiBbJHtlbGlnaWJsZVNlZ21lbnRzfV1gKTtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudCA9IGVsaWdpYmxlU2VnbWVudHNbMF07XG4gICAgaWYgKHRoaXMuX29yZyA+PSBzZWdtZW50Lm1lbW9yeSArIHNlZ21lbnQuc2l6ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDaHVuayBkb2VzIG5vdCBmaXQgaW4gc2VnbWVudCAke3NlZ21lbnQubmFtZX1gKTtcbiAgICB9XG4gICAgdGhpcy5wbGFjZSh0aGlzLl9vcmcsIHNlZ21lbnQpO1xuICB9XG5cbiAgcGxhY2Uob3JnOiBudW1iZXIsIHNlZ21lbnQ6IExpbmtTZWdtZW50KSB7XG4gICAgdGhpcy5fb3JnID0gb3JnO1xuICAgIHRoaXMuX3NlZ21lbnQgPSBzZWdtZW50O1xuICAgIGNvbnN0IG9mZnNldCA9IHRoaXMuX29mZnNldCA9IG9yZyArIHNlZ21lbnQuZGVsdGE7XG4gICAgZm9yIChjb25zdCB3IG9mIHRoaXMubGlua2VyLndhdGNoZXMpIHtcbiAgICAgIGlmICh3ID49IG9mZnNldCAmJiB3IDwgb2Zmc2V0ICsgdGhpcy5zaXplKSBkZWJ1Z2dlcjtcbiAgICB9XG4gICAgYmluYXJ5SW5zZXJ0KHRoaXMubGlua2VyLnBsYWNlZCwgeCA9PiB4WzBdLCBbb2Zmc2V0LCB0aGlzXSk7XG4gICAgLy8gQ29weSBkYXRhLCBsZWF2aW5nIG91dCBhbnkgaG9sZXNcbiAgICBjb25zdCBmdWxsID0gdGhpcy5saW5rZXIuZGF0YTtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5fZGF0YSA/PyBmYWlsKGBObyBkYXRhYCk7XG4gICAgdGhpcy5fZGF0YSA9IHVuZGVmaW5lZDtcblxuICAgIGlmICh0aGlzLnN1YnMuc2l6ZSkge1xuICAgICAgZnVsbC5zcGxpY2Uob2Zmc2V0LCBkYXRhLmxlbmd0aCk7XG4gICAgICBjb25zdCBzcGFyc2UgPSBuZXcgU3BhcnNlQnl0ZUFycmF5KCk7XG4gICAgICBzcGFyc2Uuc2V0KDAsIGRhdGEpO1xuICAgICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5zdWJzKSB7XG4gICAgICAgIHNwYXJzZS5zcGxpY2Uoc3ViLm9mZnNldCwgc3ViLnNpemUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbc3RhcnQsIGNodW5rXSBvZiBzcGFyc2UuY2h1bmtzKCkpIHtcbiAgICAgICAgZnVsbC5zZXQob2Zmc2V0ICsgc3RhcnQsIC4uLmNodW5rKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZnVsbC5zZXQob2Zmc2V0LCBkYXRhKTtcbiAgICB9XG5cbiAgICAvLyBSZXRyeSB0aGUgZm9sbG93LW9uc1xuICAgIGZvciAoY29uc3QgW3N1YiwgY2h1bmtdIG9mIHRoaXMuZm9sbG93KSB7XG4gICAgICBjaHVuay5yZXNvbHZlU3ViKHN1YiwgZmFsc2UpO1xuICAgIH1cblxuICAgIHRoaXMubGlua2VyLmZyZWUuZGVsZXRlKHRoaXMub2Zmc2V0ISwgdGhpcy5vZmZzZXQhICsgdGhpcy5zaXplKTtcbiAgfVxuXG4gIHJlc29sdmVTdWJzKGluaXRpYWwgPSBmYWxzZSkgeyAvLzogTWFwPG51bWJlciwgU3Vic3RpdHV0aW9uW10+IHtcbiAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIHN1YnMsIHNlZSB3aGF0IHByb2dyZXMgd2UgY2FuIG1ha2U/XG4gICAgLy8gcmVzdWx0OiBsaXN0IG9mIGRlcGVuZGVudCBjaHVua3MuXG5cbiAgICAvLyBOT1RFOiBpZiB3ZSBkZXBlbmQgb24gb3Vyc2VsZiB0aGVuIHdlIHdpbGwgcmV0dXJuIGVtcHR5IGRlcHMsXG4gICAgLy8gICAgICAgYW5kIG1heSBiZSBwbGFjZWQgaW1tZWRpYXRlbHksIGJ1dCB3aWxsIHN0aWxsIGhhdmUgaG9sZXMuXG4gICAgLy8gICAgICAtIE5PLCBpdCdzIHJlc3BvbnNpYmlsaXR5IG9mIGNhbGxlciB0byBjaGVjayB0aGF0XG4gICAgZm9yIChjb25zdCBzdWIgb2YgdGhpcy5zZWxmU3Vicykge1xuICAgICAgdGhpcy5yZXNvbHZlU3ViKHN1YiwgaW5pdGlhbCk7XG4gICAgfVxuXG4gICAgLy8gY29uc3QgZGVwcyA9IG5ldyBTZXQoKTtcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLnN1YnMpIHtcbiAgICAgIC8vIGNvbnN0IHN1YkRlcHMgPSBcbiAgICAgIHRoaXMucmVzb2x2ZVN1YihzdWIsIGluaXRpYWwpO1xuICAgICAgLy8gaWYgKCFzdWJEZXBzKSBjb250aW51ZTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwIG9mIHN1YkRlcHMpIHtcbiAgICAgIC8vICAgbGV0IHN1YnMgPSBkZXBzLmdldChkZXApO1xuICAgICAgLy8gICBpZiAoIXN1YnMpIGRlcHMuc2V0KGRlcCwgc3VicyA9IFtdKTtcbiAgICAgIC8vICAgc3Vicy5wdXNoKHN1Yik7XG4gICAgICAvLyB9XG4gICAgfVxuICAgIC8vIGlmICh0aGlzLm9yZyAhPSBudWxsKSByZXR1cm4gbmV3IFNldCgpO1xuICAgIC8vIHJldHVybiBkZXBzO1xuICB9XG5cbiAgYWRkRGVwKHN1YjogU3Vic3RpdHV0aW9uLCBkZXA6IG51bWJlcikge1xuICAgIGlmIChkZXAgPT09IHRoaXMuaW5kZXggJiYgdGhpcy5zdWJzLmRlbGV0ZShzdWIpKSB0aGlzLnNlbGZTdWJzLmFkZChzdWIpO1xuICAgIHRoaXMubGlua2VyLmNodW5rc1tkZXBdLmZvbGxvdy5zZXQoc3ViLCB0aGlzKTtcbiAgICB0aGlzLmRlcHMuYWRkKGRlcCk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbGlzdCBvZiBkZXBlbmRlbnQgY2h1bmtzLCBvciB1bmRlZmluZWQgaWYgc3VjY2Vzc2Z1bC5cbiAgcmVzb2x2ZVN1YihzdWI6IFN1YnN0aXR1dGlvbiwgaW5pdGlhbDogYm9vbGVhbikgeyAvLzogSXRlcmFibGU8bnVtYmVyPnx1bmRlZmluZWQge1xuXG4gICAgLy8gVE9ETyAtIHJlc29sdmUocmVzb2x2ZXIpIHZpYSBjaHVua0RhdGEgdG8gcmVzb2x2ZSBiYW5rcyEhXG5cblxuICAgIC8vIERvIGEgZnVsbCB0cmF2ZXJzZSBvZiB0aGUgZXhwcmVzc2lvbiAtIHNlZSB3aGF0J3MgYmxvY2tpbmcgdXMuXG4gICAgaWYgKCF0aGlzLnN1YnMuaGFzKHN1YikgJiYgIXRoaXMuc2VsZlN1YnMuaGFzKHN1YikpIHJldHVybjtcbiAgICBzdWIuZXhwciA9IEV4cHIudHJhdmVyc2Uoc3ViLmV4cHIsIChlLCByZWMsIHApID0+IHtcbiAgICAgIC8vIEZpcnN0IGhhbmRsZSBtb3N0IGNvbW1vbiBiYW5rIGJ5dGUgY2FzZSwgc2luY2UgaXQgdHJpZ2dlcnMgb24gYVxuICAgICAgLy8gZGlmZmVyZW50IHR5cGUgb2YgcmVzb2x1dGlvbi5cbiAgICAgIGlmIChpbml0aWFsICYmIHA/Lm9wID09PSAnXicgJiYgcC5hcmdzIS5sZW5ndGggPT09IDEgJiYgZS5tZXRhKSB7XG4gICAgICAgIGlmIChlLm1ldGEuYmFuayA9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5hZGREZXAoc3ViLCBlLm1ldGEuY2h1bmshKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZTsgLy8gc2tpcCByZWN1cnNpb24gZWl0aGVyIHdheS5cbiAgICAgIH1cbiAgICAgIGUgPSB0aGlzLmxpbmtlci5yZXNvbHZlTGluayhFeHByLmV2YWx1YXRlKHJlYyhlKSkpO1xuICAgICAgaWYgKGluaXRpYWwgJiYgZS5tZXRhPy5yZWwpIHRoaXMuYWRkRGVwKHN1YiwgZS5tZXRhLmNodW5rISk7XG4gICAgICByZXR1cm4gZTtcbiAgICB9KTtcblxuICAgIC8vIFBST0JMRU0gLSBvZmYgaXMgcmVsYXRpdmUgdG8gdGhlIGNodW5rLCBidXQgd2Ugd2FudCB0byBiZSBhYmxlIHRvXG4gICAgLy8gc3BlY2lmeSBhbiBBQlNPTFVURSBvcmcgd2l0aGluIGEgc2VnbWVudC4uLiFcbiAgICAvLyBBbiBhYnNvbHV0ZSBvZmZzZXQgd2l0aGluIHRoZSB3aG9sZSBvcmlnIGlzIG5vIGdvb2QsIGVpdGhlclxuICAgIC8vIHdhbnQgdG8gd3JpdGUgaXQgYXMgLnNlZ21lbnQgXCJmb29cIjsgU3ltID0gJDEyMzRcbiAgICAvLyBDb3VsZCBhbHNvIGp1c3QgZG8gLm1vdmUgY291bnQsIFwic2VnXCIsICQxMjM0IGFuZCBzdG9yZSBhIHNwZWNpYWwgb3BcbiAgICAvLyB0aGF0IHVzZXMgYm90aCBzeW0gYW5kIG51bT9cblxuICAgIC8vIFNlZSBpZiB3ZSBjYW4gZG8gaXQgaW1tZWRpYXRlbHkuXG4gICAgbGV0IGRlbCA9IGZhbHNlO1xuICAgIGlmIChzdWIuZXhwci5vcCA9PT0gJ251bScgJiYgIXN1Yi5leHByLm1ldGE/LnJlbCkge1xuICAgICAgdGhpcy53cml0ZVZhbHVlKHN1Yi5vZmZzZXQsIHN1Yi5leHByLm51bSEsIHN1Yi5zaXplKTtcbiAgICAgIGRlbCA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChzdWIuZXhwci5vcCA9PT0gJy5tb3ZlJykge1xuICAgICAgaWYgKHN1Yi5leHByLmFyZ3MhLmxlbmd0aCAhPT0gMSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgLm1vdmVgKTtcbiAgICAgIGNvbnN0IGNoaWxkID0gc3ViLmV4cHIuYXJncyFbMF07XG4gICAgICBpZiAoY2hpbGQub3AgPT09ICdudW0nICYmIGNoaWxkLm1ldGE/Lm9mZnNldCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRlbHRhID1cbiAgICAgICAgICAgIGNoaWxkLm1ldGEhLm9mZnNldCEgLSAoY2hpbGQubWV0YSEucmVsID8gMCA6IGNoaWxkLm1ldGEhLm9yZyEpO1xuICAgICAgICBjb25zdCBzdGFydCA9IGNoaWxkLm51bSEgKyBkZWx0YTtcbiAgICAgICAgY29uc3Qgc2xpY2UgPSB0aGlzLmxpbmtlci5vcmlnLnNsaWNlKHN0YXJ0LCBzdGFydCArIHN1Yi5zaXplKTtcbiAgICAgICAgdGhpcy53cml0ZUJ5dGVzKHN1Yi5vZmZzZXQsIFVpbnQ4QXJyYXkuZnJvbShzbGljZSkpO1xuICAgICAgICBkZWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVsKSB7XG4gICAgICB0aGlzLnN1YnMuZGVsZXRlKHN1YikgfHwgdGhpcy5zZWxmU3Vicy5kZWxldGUoc3ViKTtcbiAgICAgIGlmICghdGhpcy5zdWJzLnNpemUpIHsgLy8gTkVXOiBpZ25vcmVzIHNlbGYtc3VicyBub3dcbiAgICAgIC8vIGlmICghdGhpcy5zdWJzLnNpemUgfHwgKGRlcHMuc2l6ZSA9PT0gMSAmJiBkZXBzLmhhcyh0aGlzLmluZGV4KSkpICB7XG4gICAgICAgIC8vIGFkZCB0byByZXNvbHZlZCBxdWV1ZSAtIHJlYWR5IHRvIGJlIHBsYWNlZCFcbiAgICAgICAgLy8gUXVlc3Rpb246IHNob3VsZCB3ZSBwbGFjZSBpdCByaWdodCBhd2F5PyAgV2UgcGxhY2UgdGhlIGZpeGVkIGNodW5rc1xuICAgICAgICAvLyBpbW1lZGlhdGVseSBpbiB0aGUgY3RvciwgYnV0IHRoZXJlJ3Mgbm8gY2hvaWNlIHRvIGRlZmVyLiAgRm9yIHJlbG9jXG4gICAgICAgIC8vIGNodW5rcywgaXQncyBiZXR0ZXIgdG8gd2FpdCB1bnRpbCB3ZSd2ZSByZXNvbHZlZCBhcyBtdWNoIGFzIHBvc3NpYmxlXG4gICAgICAgIC8vIGJlZm9yZSBwbGFjaW5nIGFueXRoaW5nLiAgRm9ydHVuYXRlbHksIHBsYWNpbmcgYSBjaHVuayB3aWxsXG4gICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgcmVzb2x2ZSBhbGwgZGVwcyBub3chXG4gICAgICAgIGlmICh0aGlzLmxpbmtlci51bnJlc29sdmVkQ2h1bmtzLmRlbGV0ZSh0aGlzKSkge1xuICAgICAgICAgIHRoaXMubGlua2VyLmluc2VydFJlc29sdmVkKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgd3JpdGVCeXRlcyhvZmZzZXQ6IG51bWJlciwgYnl0ZXM6IFVpbnQ4QXJyYXkpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YS5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGJ5dGVzLmxlbmd0aCkuc2V0KGJ5dGVzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX29mZnNldCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmxpbmtlci5kYXRhLnNldCh0aGlzLl9vZmZzZXQgKyBvZmZzZXQsIGJ5dGVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVWYWx1ZShvZmZzZXQ6IG51bWJlciwgdmFsOiBudW1iZXIsIHNpemU6IG51bWJlcikge1xuICAgIC8vIFRPRE8gLSB0aGlzIGlzIGFsbW9zdCBlbnRpcmVseSBjb3BpZWQgZnJvbSBwcm9jZXNzb3Igd3JpdGVOdW1iZXJcbiAgICBjb25zdCBiaXRzID0gKHNpemUpIDw8IDM7XG4gICAgaWYgKHZhbCAhPSBudWxsICYmICh2YWwgPCAoLTEgPDwgYml0cykgfHwgdmFsID49ICgxIDw8IGJpdHMpKSkge1xuICAgICAgY29uc3QgbmFtZSA9IFsnYnl0ZScsICd3b3JkJywgJ2ZhcndvcmQnLCAnZHdvcmQnXVtzaXplIC0gMV07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBhICR7bmFtZX06ICQke3ZhbC50b1N0cmluZygxNil9IGF0ICQke1xuICAgICAgICAgICh0aGlzLm9yZyEgKyBvZmZzZXQpLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShzaXplKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgYnl0ZXNbaV0gPSB2YWwgJiAweGZmO1xuICAgICAgdmFsID4+PSA4O1xuICAgIH1cbiAgICB0aGlzLndyaXRlQnl0ZXMob2Zmc2V0LCBieXRlcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNsYXRlU3ViKHM6IFN1YnN0aXR1dGlvbiwgZGM6IG51bWJlciwgZHM6IG51bWJlcik6IFN1YnN0aXR1dGlvbiB7XG4gIHMgPSB7Li4uc307XG4gIHMuZXhwciA9IHRyYW5zbGF0ZUV4cHIocy5leHByLCBkYywgZHMpO1xuICByZXR1cm4gcztcbn1cbmZ1bmN0aW9uIHRyYW5zbGF0ZUV4cHIoZTogRXhwciwgZGM6IG51bWJlciwgZHM6IG51bWJlcik6IEV4cHIge1xuICBlID0gey4uLmV9O1xuICBpZiAoZS5tZXRhKSBlLm1ldGEgPSB7Li4uZS5tZXRhfTtcbiAgaWYgKGUuYXJncykgZS5hcmdzID0gZS5hcmdzLm1hcChhID0+IHRyYW5zbGF0ZUV4cHIoYSwgZGMsIGRzKSk7XG4gIGlmIChlLm1ldGE/LmNodW5rICE9IG51bGwpIGUubWV0YS5jaHVuayArPSBkYztcbiAgaWYgKGUub3AgPT09ICdzeW0nICYmIGUubnVtICE9IG51bGwpIGUubnVtICs9IGRzO1xuICByZXR1cm4gZTtcbn1cbmZ1bmN0aW9uIHRyYW5zbGF0ZVN5bWJvbChzOiBTeW1ib2wsIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBTeW1ib2wge1xuICBzID0gey4uLnN9O1xuICBpZiAocy5leHByKSBzLmV4cHIgPSB0cmFuc2xhdGVFeHByKHMuZXhwciwgZGMsIGRzKTtcbiAgcmV0dXJuIHM7XG59XG5cbi8vIFRoaXMgY2xhc3MgaXMgc2luZ2xlLXVzZS5cbmNsYXNzIExpbmsge1xuICBkYXRhID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICBvcmlnID0gbmV3IFNwYXJzZUJ5dGVBcnJheSgpO1xuICAvLyBNYXBzIHN5bWJvbCB0byBzeW1ib2wgIyAvLyBbc3ltYm9sICMsIGRlcGVuZGVudCBjaHVua3NdXG4gIGV4cG9ydHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpOyAvLyByZWFkb25seSBbbnVtYmVyLCBTZXQ8bnVtYmVyPl0+KCk7XG4gIGNodW5rczogTGlua0NodW5rW10gPSBbXTtcbiAgc3ltYm9sczogU3ltYm9sW10gPSBbXTtcbiAgZnJlZSA9IG5ldyBJbnRlcnZhbFNldCgpO1xuICByYXdTZWdtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBTZWdtZW50W10+KCk7XG4gIHNlZ21lbnRzID0gbmV3IE1hcDxzdHJpbmcsIExpbmtTZWdtZW50PigpO1xuXG4gIHJlc29sdmVkQ2h1bmtzOiBMaW5rQ2h1bmtbXSA9IFtdO1xuICB1bnJlc29sdmVkQ2h1bmtzID0gbmV3IFNldDxMaW5rQ2h1bms+KCk7XG5cbiAgd2F0Y2hlczogbnVtYmVyW10gPSBbXTsgLy8gZGVidWdnaW5nIGFpZDogb2Zmc2V0cyB0byB3YXRjaC5cbiAgcGxhY2VkOiBBcnJheTxbbnVtYmVyLCBMaW5rQ2h1bmtdPiA9IFtdO1xuICBpbml0aWFsUmVwb3J0OiBzdHJpbmcgPSAnJztcblxuICAvLyBUT0RPIC0gZGVmZXJyZWQgLSBzdG9yZSBzb21lIHNvcnQgb2YgZGVwZW5kZW5jeSBncmFwaD9cblxuICBpbnNlcnRSZXNvbHZlZChjaHVuazogTGlua0NodW5rKSB7XG4gICAgYmluYXJ5SW5zZXJ0KHRoaXMucmVzb2x2ZWRDaHVua3MsIGMgPT4gYy5zaXplLCBjaHVuayk7XG4gIH1cblxuICBiYXNlKGRhdGE6IFVpbnQ4QXJyYXksIG9mZnNldCA9IDApIHtcbiAgICB0aGlzLmRhdGEuc2V0KG9mZnNldCwgZGF0YSk7XG4gICAgdGhpcy5vcmlnLnNldChvZmZzZXQsIGRhdGEpO1xuICB9XG5cbiAgcmVhZEZpbGUoZmlsZTogTW9kdWxlKSB7XG4gICAgY29uc3QgZGMgPSB0aGlzLmNodW5rcy5sZW5ndGg7XG4gICAgY29uc3QgZHMgPSB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICAgIC8vIHNlZ21lbnRzIGNvbWUgZmlyc3QsIHNpbmNlIExpbmtDaHVuayBjb25zdHJ1Y3RvciBuZWVkcyB0aGVtXG4gICAgZm9yIChjb25zdCBzZWdtZW50IG9mIGZpbGUuc2VnbWVudHMgfHwgW10pIHtcbiAgICAgIHRoaXMuYWRkUmF3U2VnbWVudChzZWdtZW50KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBmaWxlLmNodW5rcyB8fCBbXSkge1xuICAgICAgY29uc3QgbGMgPSBuZXcgTGlua0NodW5rKHRoaXMsIHRoaXMuY2h1bmtzLmxlbmd0aCwgY2h1bmssIGRjLCBkcyk7XG4gICAgICB0aGlzLmNodW5rcy5wdXNoKGxjKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgZmlsZS5zeW1ib2xzIHx8IFtdKSB7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh0cmFuc2xhdGVTeW1ib2woc3ltYm9sLCBkYywgZHMpKTtcbiAgICB9XG4gICAgLy8gVE9ETyAtIHdoYXQgdGhlIGhlY2sgZG8gd2UgZG8gd2l0aCBzZWdtZW50cz9cbiAgICAvLyAgICAgIC0gaW4gcGFydGljdWxhciwgd2hvIGlzIHJlc3BvbnNpYmxlIGZvciBkZWZpbmluZyB0aGVtPz8/XG5cbiAgICAvLyBCYXNpYyBpZGVhOlxuICAgIC8vICAxLiBnZXQgYWxsIHRoZSBjaHVua3NcbiAgICAvLyAgMi4gYnVpbGQgdXAgYSBkZXBlbmRlbmN5IGdyYXBoXG4gICAgLy8gIDMuIHdyaXRlIGFsbCBmaXhlZCBjaHVua3MsIG1lbW9pemluZyBhYnNvbHV0ZSBvZmZzZXRzIG9mXG4gICAgLy8gICAgIG1pc3Npbmcgc3VicyAodGhlc2UgYXJlIG5vdCBlbGlnaWJsZSBmb3IgY29hbGVzY2luZykuXG4gICAgLy8gICAgIC0tIHByb2JhYmx5IHNhbWUgdHJlYXRtZW50IGZvciBmcmVlZCBzZWN0aW9uc1xuICAgIC8vICA0LiBmb3IgcmVsb2MgY2h1bmtzLCBmaW5kIHRoZSBiaWdnZXN0IGNodW5rIHdpdGggbm8gZGVwcy5cbiAgfVxuXG4gIC8vIHJlc29sdmVDaHVuayhjaHVuazogTGlua0NodW5rKSB7XG4gIC8vICAgLy9pZiAoY2h1bmsucmVzb2x2aW5nKSByZXR1cm47IC8vIGJyZWFrIGFueSBjeWNsZXNcbiAgICBcbiAgLy8gfVxuXG4gIHJlc29sdmVMaW5rKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgICBpZiAoZXhwci5vcCA9PT0gJy5vcmlnJyAmJiBleHByLmFyZ3M/Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3QgY2hpbGQgPSBleHByLmFyZ3NbMF07XG4gICAgICBjb25zdCBvZmZzZXQgPSBjaGlsZC5tZXRhPy5vZmZzZXQ7XG4gICAgICBpZiAob2Zmc2V0ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgbnVtID0gdGhpcy5vcmlnLmdldChvZmZzZXQgKyBjaGlsZC5udW0hKTtcbiAgICAgICAgaWYgKG51bSAhPSBudWxsKSByZXR1cm4ge29wOiAnbnVtJywgbnVtfTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV4cHIub3AgPT09ICdudW0nICYmIGV4cHIubWV0YT8uY2h1bmsgIT0gbnVsbCkge1xuICAgICAgY29uc3QgbWV0YSA9IGV4cHIubWV0YTtcbiAgICAgIGNvbnN0IGNodW5rID0gdGhpcy5jaHVua3NbbWV0YS5jaHVuayFdO1xuICAgICAgaWYgKGNodW5rLm9yZyAhPT0gbWV0YS5vcmcgfHxcbiAgICAgICAgICBjaHVuay5zZWdtZW50Py5iYW5rICE9PSBtZXRhLmJhbmsgfHxcbiAgICAgICAgICBjaHVuay5vZmZzZXQgIT09IG1ldGEub2Zmc2V0KSB7XG4gICAgICAgIGNvbnN0IG1ldGEyID0ge1xuICAgICAgICAgIG9yZzogY2h1bmsub3JnLFxuICAgICAgICAgIG9mZnNldDogY2h1bmsub2Zmc2V0LFxuICAgICAgICAgIGJhbms6IGNodW5rLnNlZ21lbnQ/LmJhbmssXG4gICAgICAgIH07XG4gICAgICAgIGV4cHIgPSBFeHByLmV2YWx1YXRlKHsuLi5leHByLCBtZXRhOiB7Li4ubWV0YSwgLi4ubWV0YTJ9fSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgLy8gTk9URTogc28gZmFyIHRoaXMgaXMgb25seSB1c2VkIGZvciBhc3NlcnRzP1xuICAvLyBJdCBiYXNpY2FsbHkgY29weS1wYXN0ZXMgZnJvbSByZXNvbHZlU3Vicy4uLiA6LShcblxuICByZXNvbHZlRXhwcihleHByOiBFeHByKTogbnVtYmVyIHtcbiAgICBleHByID0gRXhwci50cmF2ZXJzZShleHByLCAoZSwgcmVjKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlTGluayhFeHByLmV2YWx1YXRlKHJlYyhlKSkpO1xuICAgIH0pO1xuXG4gICAgaWYgKGV4cHIub3AgPT09ICdudW0nICYmICFleHByLm1ldGE/LnJlbCkgcmV0dXJuIGV4cHIubnVtITtcbiAgICBjb25zdCBhdCA9IFRva2VuLmF0KGV4cHIpO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZ1bGx5IHJlc29sdmUgZXhwciR7YXR9YCk7XG4gIH1cblxuICBsaW5rKCk6IFNwYXJzZUJ5dGVBcnJheSB7XG4gICAgLy8gQnVpbGQgdXAgdGhlIExpbmtTZWdtZW50IG9iamVjdHNcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBzZWdtZW50c10gb2YgdGhpcy5yYXdTZWdtZW50cykge1xuICAgICAgbGV0IHMgPSBzZWdtZW50c1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcyA9IFNlZ21lbnQubWVyZ2Uocywgc2VnbWVudHNbaV0pO1xuICAgICAgfVxuICAgICAgdGhpcy5zZWdtZW50cy5zZXQobmFtZSwgbmV3IExpbmtTZWdtZW50KHMpKTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmcmVlIHNwYWNlXG4gICAgZm9yIChjb25zdCBbbmFtZSwgc2VnbWVudHNdIG9mIHRoaXMucmF3U2VnbWVudHMpIHtcbiAgICAgIGNvbnN0IHMgPSB0aGlzLnNlZ21lbnRzLmdldChuYW1lKSE7XG4gICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAgICAgY29uc3QgZnJlZSA9IHNlZ21lbnQuZnJlZTtcbiAgICAgICAgLy8gQWRkIHRoZSBmcmVlIHNwYWNlXG4gICAgICAgIGZvciAoY29uc3QgW3N0YXJ0LCBlbmRdIG9mIGZyZWUgfHwgW10pIHtcbiAgICAgICAgICB0aGlzLmZyZWUuYWRkKHN0YXJ0ICsgcy5kZWx0YSwgZW5kICsgcy5kZWx0YSk7XG4gICAgICAgICAgdGhpcy5kYXRhLnNwbGljZShzdGFydCArIHMuZGVsdGEsIGVuZCAtIHN0YXJ0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBTZXQgdXAgYWxsIHRoZSBpbml0aWFsIHBsYWNlbWVudHMuXG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzLmNodW5rcykge1xuICAgICAgY2h1bmsuaW5pdGlhbFBsYWNlbWVudCgpO1xuICAgIH1cbiAgICBpZiAoREVCVUcpIHtcbiAgICAgIHRoaXMuaW5pdGlhbFJlcG9ydCA9IGBJbml0aWFsOlxcbiR7dGhpcy5yZXBvcnQodHJ1ZSl9YDtcbiAgICB9XG4gICAgLy8gRmluZCBhbGwgdGhlIGV4cG9ydHMuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuc3ltYm9sc1tpXTtcbiAgICAgIC8vIFRPRE8gLSB3ZSdkIHJlYWxseSBsaWtlIHRvIGlkZW50aWZ5IHRoaXMgZWFybGllciBpZiBhdCBhbGwgcG9zc2libGUhXG4gICAgICBpZiAoIXN5bWJvbC5leHByKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCAke2l9IG5ldmVyIHJlc29sdmVkYCk7XG4gICAgICAvLyBsb29rIGZvciBpbXBvcnRzL2V4cG9ydHNcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5leHBvcnRzLnNldChzeW1ib2wuZXhwb3J0LCBpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzb2x2ZSBhbGwgdGhlIGltcG9ydHMgaW4gYWxsIHN5bWJvbCBhbmQgY2h1bmsuc3VicyBleHBycy5cbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIHN5bWJvbC5leHByID0gdGhpcy5yZXNvbHZlU3ltYm9scyhzeW1ib2wuZXhwciEpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBmb3IgKGNvbnN0IHN1YiBvZiBbLi4uY2h1bmsuc3VicywgLi4uY2h1bmsuc2VsZlN1YnNdKSB7XG4gICAgICAgIHN1Yi5leHByID0gdGhpcy5yZXNvbHZlU3ltYm9scyhzdWIuZXhwcik7XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNodW5rLmFzc2VydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2h1bmsuYXNzZXJ0c1tpXSA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoY2h1bmsuYXNzZXJ0c1tpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIHdlIGRvbid0IGNhcmUgYWJvdXQgdGhpcy5zeW1ib2xzIGF0IGFsbCBhbnltb3JlLlxuICAgIC8vIE5vdyBmaWd1cmUgb3V0IHRoZSBmdWxsIGRlcGVuZGVuY3kgdHJlZTogY2h1bmsgI1ggcmVxdWlyZXMgY2h1bmsgI1lcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGMucmVzb2x2ZVN1YnModHJ1ZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZpbGwgKHVuKXJlc29sdmVkQ2h1bmtzXG4gICAgLy8gICAtIGdldHMgXG5cbiAgICBjb25zdCBjaHVua3MgPSBbLi4udGhpcy5jaHVua3NdO1xuICAgIGNodW5rcy5zb3J0KChhLCBiKSA9PiBiLnNpemUgLSBhLnNpemUpO1xuXG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIGNodW5rLnJlc29sdmVTdWJzKCk7XG4gICAgICBpZiAoY2h1bmsuc3Vicy5zaXplKSB7XG4gICAgICAgIHRoaXMudW5yZXNvbHZlZENodW5rcy5hZGQoY2h1bmspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnNlcnRSZXNvbHZlZChjaHVuayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNvdW50ID0gdGhpcy5yZXNvbHZlZENodW5rcy5sZW5ndGggKyAyICogdGhpcy51bnJlc29sdmVkQ2h1bmtzLnNpemU7XG4gICAgd2hpbGUgKGNvdW50KSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5yZXNvbHZlZENodW5rcy5wb3AoKTtcbiAgICAgIGlmIChjKSB7XG4gICAgICAgIHRoaXMucGxhY2VDaHVuayhjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlc29sdmUgYWxsIHRoZSBmaXJzdCB1bnJlc29sdmVkIGNodW5rcycgZGVwc1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gdGhpcy51bnJlc29sdmVkQ2h1bmtzO1xuICAgICAgICBmb3IgKGNvbnN0IGRlcCBvZiBmaXJzdC5kZXBzKSB7XG4gICAgICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tkZXBdO1xuICAgICAgICAgIGlmIChjaHVuay5vcmcgPT0gbnVsbCkgdGhpcy5wbGFjZUNodW5rKGNodW5rKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMucmVzb2x2ZWRDaHVua3MubGVuZ3RoICsgMiAqIHRoaXMudW5yZXNvbHZlZENodW5rcy5zaXplO1xuICAgICAgaWYgKG5leHQgPT09IGNvdW50KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5yZXNvbHZlZENodW5rcywgdGhpcy51bnJlc29sdmVkQ2h1bmtzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgbWFraW5nIHByb2dyZXNzYCk7XG4gICAgICB9XG4gICAgICBjb3VudCA9IG5leHQ7XG4gICAgfVxuXG4gICAgLy8gaWYgKCFjaHVuay5vcmcgJiYgIWNodW5rLnN1YnMubGVuZ3RoKSB0aGlzLnBsYWNlQ2h1bmsoY2h1bmspO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCB0aGUgZGVwIGdyYXBoIGlzIGJ1aWx0IC0gbm93IHRyYXZlcnNlIGl0LlxuXG4gICAgLy8gY29uc3QgcGxhY2UgPSAoaTogbnVtYmVyKSA9PiB7XG4gICAgLy8gICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW2ldO1xuICAgIC8vICAgaWYgKGNodW5rLm9yZyAhPSBudWxsKSByZXR1cm47XG4gICAgLy8gICAvLyByZXNvbHZlIGZpcnN0XG4gICAgLy8gICBjb25zdCByZW1haW5pbmc6IFN1YnN0aXR1dGlvbltdID0gW107XG4gICAgLy8gICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLnJlc29sdmVTdWIoY2h1bmssIHN1YikpIHJlbWFpbmluZy5wdXNoKHN1Yik7XG4gICAgLy8gICB9XG4gICAgLy8gICBjaHVuay5zdWJzID0gcmVtYWluaW5nO1xuICAgIC8vICAgLy8gbm93IHBsYWNlIHRoZSBjaHVua1xuICAgIC8vICAgdGhpcy5wbGFjZUNodW5rKGNodW5rKTsgLy8gVE9ETyAuLi5cbiAgICAvLyAgIC8vIHVwZGF0ZSB0aGUgZ3JhcGg7IGRvbid0IGJvdGhlciBkZWxldGluZyBmb3JtIGJsb2NrZWQuXG4gICAgLy8gICBmb3IgKGNvbnN0IHJldkRlcCBvZiByZXZEZXBzW2ldKSB7XG4gICAgLy8gICAgIGNvbnN0IGZ3ZCA9IGZ3ZERlcHNbcmV2RGVwXTtcbiAgICAvLyAgICAgZndkLmRlbGV0ZShpKTtcbiAgICAvLyAgICAgaWYgKCFmd2Quc2l6ZSkgaW5zZXJ0KHVuYmxvY2tlZCwgcmV2RGVwKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLy8gd2hpbGUgKHVuYmxvY2tlZC5sZW5ndGggfHwgYmxvY2tlZC5sZW5ndGgpIHtcbiAgICAvLyAgIGxldCBuZXh0ID0gdW5ibG9ja2VkLnNoaWZ0KCk7XG4gICAgLy8gICBpZiAobmV4dCkge1xuICAgIC8vICAgICBwbGFjZShuZXh0KTtcbiAgICAvLyAgICAgY29udGludWU7XG4gICAgLy8gICB9XG4gICAgLy8gICBuZXh0ID0gYmxvY2tlZFswXTtcbiAgICAvLyAgIGZvciAoY29uc3QgcmV2IG9mIHJldkRlcHNbbmV4dF0pIHtcbiAgICAvLyAgICAgaWYgKHRoaXMuY2h1bmtzW3Jldl0ub3JnICE9IG51bGwpIHsgLy8gYWxyZWFkeSBwbGFjZWRcbiAgICAvLyAgICAgICBibG9ja2VkLnNoaWZ0KCk7XG4gICAgLy8gICAgICAgY29udGludWU7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcGxhY2UocmV2KTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLy8gQXQgdGhpcyBwb2ludCwgZXZlcnl0aGluZyBzaG91bGQgYmUgcGxhY2VkLCBzbyBkbyBvbmUgbGFzdCByZXNvbHZlLlxuXG4gICAgY29uc3QgcGF0Y2ggPSBuZXcgU3BhcnNlQnl0ZUFycmF5KCk7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgYy5hc3NlcnRzKSB7XG4gICAgICAgIGNvbnN0IHYgPSB0aGlzLnJlc29sdmVFeHByKGEpO1xuICAgICAgICBpZiAodikgY29udGludWU7XG4gICAgICAgIGNvbnN0IGF0ID0gVG9rZW4uYXQoYSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIGZhaWxlZCR7YXR9YCk7XG4gICAgICB9XG4gICAgICBpZiAoYy5vdmVybGFwcykgY29udGludWU7XG4gICAgICBwYXRjaC5zZXQoYy5vZmZzZXQhLCAuLi50aGlzLmRhdGEuc2xpY2UoYy5vZmZzZXQhLCBjLm9mZnNldCEgKyBjLnNpemUhKSk7XG4gICAgfVxuICAgIGlmIChERUJVRykgY29uc29sZS5sb2codGhpcy5yZXBvcnQodHJ1ZSkpO1xuICAgIHJldHVybiBwYXRjaDtcbiAgfVxuXG4gIHBsYWNlQ2h1bmsoY2h1bms6IExpbmtDaHVuaykge1xuICAgIGlmIChjaHVuay5vcmcgIT0gbnVsbCkgcmV0dXJuOyAvLyBkb24ndCByZS1wbGFjZS5cbiAgICBjb25zdCBzaXplID0gY2h1bmsuc2l6ZTtcbiAgICBpZiAoIWNodW5rLnN1YnMuc2l6ZSAmJiAhY2h1bmsuc2VsZlN1YnMuc2l6ZSkge1xuICAgICAgLy8gY2h1bmsgaXMgcmVzb2x2ZWQ6IHNlYXJjaCBmb3IgYW4gZXhpc3RpbmcgY29weSBvZiBpdCBmaXJzdFxuICAgICAgY29uc3QgcGF0dGVybiA9IHRoaXMuZGF0YS5wYXR0ZXJuKGNodW5rLmRhdGEpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzLmdldChuYW1lKSE7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gc2VnbWVudC5vZmZzZXQhO1xuICAgICAgICBjb25zdCBlbmQgPSBzdGFydCArIHNlZ21lbnQuc2l6ZSE7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gcGF0dGVybi5zZWFyY2goc3RhcnQsIGVuZCk7XG4gICAgICAgIGlmIChpbmRleCA8IDApIGNvbnRpbnVlO1xuICAgICAgICBjaHVuay5wbGFjZShpbmRleCAtIHNlZ21lbnQuZGVsdGEsIHNlZ21lbnQpO1xuICAgICAgICBjaHVuay5vdmVybGFwcyA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZWl0aGVyIHVucmVzb2x2ZWQsIG9yIGRpZG4ndCBmaW5kIGEgbWF0Y2g7IGp1c3QgYWxsb2NhdGUgc3BhY2UuXG4gICAgLy8gbG9vayBmb3IgdGhlIHNtYWxsZXN0IHBvc3NpYmxlIGZyZWUgYmxvY2suXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gICAgICBjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgY29uc3QgczAgPSBzZWdtZW50Lm9mZnNldCE7XG4gICAgICBjb25zdCBzMSA9IHMwICsgc2VnbWVudC5zaXplITtcbiAgICAgIGxldCBmb3VuZDogbnVtYmVyfHVuZGVmaW5lZDtcbiAgICAgIGxldCBzbWFsbGVzdCA9IEluZmluaXR5O1xuICAgICAgZm9yIChjb25zdCBbZjAsIGYxXSBvZiB0aGlzLmZyZWUudGFpbChzMCkpIHtcbiAgICAgICAgaWYgKGYwID49IHMxKSBicmVhaztcbiAgICAgICAgY29uc3QgZGYgPSBNYXRoLm1pbihmMSwgczEpIC0gZjA7XG4gICAgICAgIGlmIChkZiA8IHNpemUpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZGYgPCBzbWFsbGVzdCkge1xuICAgICAgICAgIGZvdW5kID0gZjA7XG4gICAgICAgICAgc21hbGxlc3QgPSBkZjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kICE9IG51bGwpIHtcbiAgICAgICAgLy8gZm91bmQgYSByZWdpb25cbiAgICAgICAgY2h1bmsucGxhY2UoZm91bmQgLSBzZWdtZW50LmRlbHRhLCBzZWdtZW50KTtcbiAgICAgICAgLy8gdGhpcy5mcmVlLmRlbGV0ZShmMCwgZjAgKyBzaXplKTtcbiAgICAgICAgLy8gVE9ETyAtIGZhY3RvciBvdXQgdGhlIHN1YnMtYXdhcmUgY29weSBtZXRob2QhXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhgSW5pdGlhbDpcXG4ke3RoaXMuaW5pdGlhbFJlcG9ydH1gKTtcbiAgICBjb25zb2xlLmxvZyhgQWZ0ZXIgZmlsbGluZzpcXG4ke3RoaXMucmVwb3J0KHRydWUpfWApO1xuICAgIGNvbnN0IG5hbWUgPSBjaHVuay5uYW1lID8gYCR7Y2h1bmsubmFtZX0gYCA6ICcnO1xuICAgIGNvbnNvbGUubG9nKHRoaXMuc2VnbWVudHMuZ2V0KGNodW5rLnNlZ21lbnRzWzBdKSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBzcGFjZSBmb3IgJHtzaXplfS1ieXRlIGNodW5rICR7bmFtZX1pbiAke1xuICAgICAgICAgICAgICAgICAgICAgY2h1bmsuc2VnbWVudHMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJlc29sdmVTeW1ib2xzKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgICAvLyBwcmUtdHJhdmVyc2Ugc28gdGhhdCB0cmFuc2l0aXZlIGltcG9ydHMgd29ya1xuICAgIHJldHVybiBFeHByLnRyYXZlcnNlKGV4cHIsIChlLCByZWMpID0+IHtcbiAgICAgIHdoaWxlIChlLm9wID09PSAnaW0nIHx8IGUub3AgPT09ICdzeW0nKSB7XG4gICAgICAgIGlmIChlLm9wID09PSAnaW0nKSB7XG4gICAgICAgICAgY29uc3QgbmFtZSA9IGUuc3ltITtcbiAgICAgICAgICBjb25zdCBpbXBvcnRlZCA9IHRoaXMuZXhwb3J0cy5nZXQobmFtZSk7XG4gICAgICAgICAgaWYgKGltcG9ydGVkID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGF0ID0gVG9rZW4uYXQoZXhwcik7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCBuZXZlciBleHBvcnRlZCAke25hbWV9JHthdH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZSA9IHRoaXMuc3ltYm9sc1tpbXBvcnRlZF0uZXhwciE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGUubnVtID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sIG5vdCBnbG9iYWxgKTtcbiAgICAgICAgICBlID0gdGhpcy5zeW1ib2xzW2UubnVtXS5leHByITtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIEV4cHIuZXZhbHVhdGUocmVjKGUpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHJlc29sdmVCYW5rQnl0ZXMoZXhwcjogRXhwcik6IEV4cHIge1xuICAvLyAgIHJldHVybiBFeHByLnRyYXZlcnNlKGV4cHIsIChlOiBFeHByKSA9PiB7XG4gIC8vICAgICBpZiAoZS5vcCAhPT0gJ14nIHx8IGUuYXJncz8ubGVuZ3RoICE9PSAxKSByZXR1cm4gZTtcbiAgLy8gICAgIGNvbnN0IGNoaWxkID0gZS5hcmdzWzBdO1xuICAvLyAgICAgaWYgKGNoaWxkLm9wICE9PSAnb2ZmJykgcmV0dXJuIGU7XG4gIC8vICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW2NoaWxkLm51bSFdO1xuICAvLyAgICAgY29uc3QgYmFua3MgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgLy8gICAgIGZvciAoY29uc3QgcyBvZiBjaHVuay5zZWdtZW50cykge1xuICAvLyAgICAgICBjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50cy5nZXQocyk7XG4gIC8vICAgICAgIGlmIChzZWdtZW50Py5iYW5rICE9IG51bGwpIGJhbmtzLmFkZChzZWdtZW50LmJhbmspO1xuICAvLyAgICAgfVxuICAvLyAgICAgaWYgKGJhbmtzLnNpemUgIT09IDEpIHJldHVybiBlO1xuICAvLyAgICAgY29uc3QgW2JdID0gYmFua3M7XG4gIC8vICAgICByZXR1cm4ge29wOiAnbnVtJywgc2l6ZTogMSwgbnVtOiBifTtcbiAgLy8gICB9KTtcbiAgLy8gfVxuXG4gIC8vICAgICBpZiAoZXhwci5vcCA9PT0gJ2ltcG9ydCcpIHtcbiAgLy8gICAgICAgaWYgKCFleHByLnN5bSkgdGhyb3cgbmV3IEVycm9yKGBJbXBvcnQgd2l0aCBubyBzeW1ib2wuYCk7XG4gIC8vICAgICAgIGNvbnN0IHN5bSA9IHRoaXMuc3ltYm9sc1t0aGlzLmV4cG9ydHMuZ2V0KGV4cHIuc3ltKV07XG4gIC8vICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVJbXBvcnRzKHN5bS5leHByKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIC8vIFRPRE8gLSB0aGlzIGlzIG5vbnNlbnNlLi4uXG4gIC8vICAgICBjb25zdCBhcmdzID0gW107XG4gIC8vICAgICBsZXQgbXV0ID0gZmFsc2U7XG4gIC8vICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cHIuYXJnczsgaSsrKSB7XG4gIC8vICAgICAgIGNvbnN0IGNoaWxkID0gZXhwci5hcmdzW2ldO1xuICAvLyAgICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZUltcG9ydHMoY2hpbGQpO1xuICAvLyAgICAgICBhcmdzLnB1c2gocmVzb2x2ZWQpO1xuICAvLyAgICAgICBpZiAoY2hpbGQgIT09IHJlc29sdmVkKSBleHByLmFyZ3NbaV0gPSByZXNvbHZlZDtcbiAgLy8gICAgICAgcmV0dXJuIFxuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICAvLyBUT0RPIC0gYWRkIGFsbCB0aGUgdGhpbmdzXG4gIC8vICAgcmV0dXJuIHBhdGNoO1xuICAvLyB9XG5cbiAgYWRkUmF3U2VnbWVudChzZWdtZW50OiBTZWdtZW50KSB7XG4gICAgbGV0IGxpc3QgPSB0aGlzLnJhd1NlZ21lbnRzLmdldChzZWdtZW50Lm5hbWUpO1xuICAgIGlmICghbGlzdCkgdGhpcy5yYXdTZWdtZW50cy5zZXQoc2VnbWVudC5uYW1lLCBsaXN0ID0gW10pO1xuICAgIGxpc3QucHVzaChzZWdtZW50KTtcbiAgfVxuXG4gIGJ1aWxkRXhwb3J0cygpOiBNYXA8c3RyaW5nLCBFeHBvcnQ+IHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgRXhwb3J0PigpO1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgaWYgKCFzeW1ib2wuZXhwb3J0KSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGUgPSBFeHByLnRyYXZlcnNlKHN5bWJvbC5leHByISwgKGUsIHJlYykgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlTGluayhFeHByLmV2YWx1YXRlKHJlYyhlKSkpO1xuICAgICAgfSk7XG4gICAgICBpZiAoZS5vcCAhPT0gJ251bScpIHRocm93IG5ldyBFcnJvcihgbmV2ZXIgcmVzb2x2ZWQ6ICR7c3ltYm9sLmV4cG9ydH1gKTtcbiAgICAgIGNvbnN0IHZhbHVlID0gZS5udW0hO1xuICAgICAgY29uc3Qgb3V0OiBFeHBvcnQgPSB7dmFsdWV9O1xuICAgICAgaWYgKGUubWV0YT8ub2Zmc2V0ICE9IG51bGwgJiYgZS5tZXRhLm9yZyAhPSBudWxsKSB7XG4gICAgICAgIG91dC5vZmZzZXQgPSBlLm1ldGEub2Zmc2V0ICsgdmFsdWUgLSBlLm1ldGEub3JnO1xuICAgICAgfVxuICAgICAgaWYgKGUubWV0YT8uYmFuayAhPSBudWxsKSBvdXQuYmFuayA9IGUubWV0YS5iYW5rO1xuICAgICAgbWFwLnNldChzeW1ib2wuZXhwb3J0LCBvdXQpO1xuICAgIH1cbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcmVwb3J0KHZlcmJvc2UgPSBmYWxzZSk6IHN0cmluZyB7XG4gICAgLy8gVE9ETyAtIGFjY2VwdCBhIHNlZ21lbnQgdG8gZmlsdGVyP1xuICAgIGxldCBvdXQgPSAnJztcbiAgICBmb3IgKGNvbnN0IFtzLCBlXSBvZiB0aGlzLmZyZWUpIHtcbiAgICAgIG91dCArPSBgRnJlZTogJHtzLnRvU3RyaW5nKDE2KX0uLiR7ZS50b1N0cmluZygxNil9OiAke2UgLSBzfSBieXRlc1xcbmA7XG4gICAgfVxuICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICBmb3IgKGNvbnN0IFtzLCBjXSBvZiB0aGlzLnBsYWNlZCkge1xuICAgICAgICBjb25zdCBuYW1lID0gYy5uYW1lID8/IGBDaHVuayAke2MuaW5kZXh9YDtcbiAgICAgICAgY29uc3QgZW5kID0gYy5vZmZzZXQhICsgYy5zaXplO1xuICAgICAgICBvdXQgKz0gYCR7cy50b1N0cmluZygxNikucGFkU3RhcnQoNSwgJzAnKX0gLi4gJHtcbiAgICAgICAgICAgIGVuZC50b1N0cmluZygxNikucGFkU3RhcnQoNSwgJzAnKX06ICR7bmFtZX0gKCR7ZW5kIC0gc30gYnl0ZXMpXFxuYDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxufVxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuIl19