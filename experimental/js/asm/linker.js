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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9saW5rZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDL0IsT0FBTyxFQUFnQixPQUFPLEVBQXVCLE1BQU0sYUFBYSxDQUFDO0FBQ3pFLE9BQU8sRUFBQyxLQUFLLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFTakMsTUFBTSxPQUFPLE1BQU07SUFBbkI7UUFTVSxVQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQTZCN0IsQ0FBQztJQXJDQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBZTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBS0QsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBZ0IsRUFBRSxNQUFNLEdBQUcsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSTtRQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsTUFBTTtRQUNKLElBQUks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LEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRTtZQUM3RCxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RCxNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztZQUN0QixHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQ1g7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBQ0Y7QUFFRCxTQUFTLFlBQVksQ0FBQyxDQUFlLEVBQUUsRUFBVSxFQUFFLEVBQVU7SUFDM0QsQ0FBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQztJQUNYLENBQUMsQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQUNELFNBQVMsYUFBYSxDQUFDLENBQU8sRUFBRSxFQUFVLEVBQUUsRUFBVTs7SUFDcEQsQ0FBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLEVBQUMsQ0FBQztJQUNYLElBQUksQ0FBQyxDQUFDLElBQUk7UUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUMsR0FBRyxDQUFDLENBQUMsSUFB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U0FDN0I7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxNQUFNO1FBQ0osS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDM0Q7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0ludGVydmFsU2V0LCBTcGFyc2VCeXRlQXJyYXksIGJpbmFyeUluc2VydH0gZnJvbSAnLi91dGlsLmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi9leHByLmpzJztcbmltcG9ydCB7Q2h1bmssIE1vZHVsZSwgU2VnbWVudCwgU3Vic3RpdHV0aW9uLCBTeW1ib2x9IGZyb20gJy4vbW9kdWxlLmpzJztcbmltcG9ydCB7VG9rZW59IGZyb20gJy4vdG9rZW4uanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4cG9ydCB7XG4gIHZhbHVlOiBudW1iZXI7XG4gIG9mZnNldD86IG51bWJlcjtcbiAgYmFuaz86IG51bWJlcjtcbiAgLy9zZWdtZW50Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTGlua2VyIHtcbiAgc3RhdGljIGxpbmsoLi4uZmlsZXM6IE1vZHVsZVtdKTogU3BhcnNlQnl0ZUFycmF5IHtcbiAgICBjb25zdCBsaW5rZXIgPSBuZXcgTGlua2VyKCk7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICBsaW5rZXIucmVhZChmaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmtlci5saW5rKCk7XG4gIH1cblxuICBwcml2YXRlIF9saW5rID0gbmV3IExpbmsoKTtcbiAgcHJpdmF0ZSBfZXhwb3J0cz86IE1hcDxzdHJpbmcsIEV4cG9ydD47XG5cbiAgcmVhZChmaWxlOiBNb2R1bGUpOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsucmVhZEZpbGUoZmlsZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBiYXNlKGRhdGE6IFVpbnQ4QXJyYXksIG9mZnNldCA9IDApOiBMaW5rZXIge1xuICAgIHRoaXMuX2xpbmsuYmFzZShkYXRhLCBvZmZzZXQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIHJldHVybiB0aGlzLl9saW5rLmxpbmsoKTtcbiAgfVxuXG4gIHJlcG9ydCgpIHtcbiAgICB0aGlzLl9saW5rLnJlcG9ydCgpO1xuICB9XG5cbiAgZXhwb3J0cygpOiBNYXA8c3RyaW5nLCBFeHBvcnQ+IHtcbiAgICBpZiAodGhpcy5fZXhwb3J0cykgcmV0dXJuIHRoaXMuX2V4cG9ydHM7XG4gICAgcmV0dXJuIHRoaXMuX2V4cG9ydHMgPSB0aGlzLl9saW5rLmJ1aWxkRXhwb3J0cygpO1xuICB9XG5cbiAgd2F0Y2goLi4ub2Zmc2V0OiBudW1iZXJbXSkge1xuICAgIHRoaXMuX2xpbmsud2F0Y2hlcy5wdXNoKC4uLm9mZnNldCk7XG4gIH1cbn1cblxuZXhwb3J0IG5hbWVzcGFjZSBMaW5rZXIge1xuICBleHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICAgIFxuXG4gIH1cbn1cblxuLy8gVE9ETyAtIGxpbmstdGltZSBvbmx5IGZ1bmN0aW9uIGZvciBnZXR0aW5nIGVpdGhlciB0aGUgb3JpZ2luYWwgb3IgdGhlXG4vLyAgICAgICAgcGF0Y2hlZCBieXRlLiAgV291bGQgYWxsb3cgZS5nLiBjb3B5KCQ4MDAwLCAkMjAwMCwgXCIxZVwiKSB0byBtb3ZlXG4vLyAgICAgICAgYSBidW5jaCBvZiBjb2RlIGFyb3VuZCB3aXRob3V0IGV4cGxpY2l0bHkgY29weS1wYXN0aW5nIGl0IGluIHRoZVxuLy8gICAgICAgIGFzbSBwYXRjaC5cblxuLy8gVHJhY2tzIGFuIGV4cG9ydC5cbi8vIGludGVyZmFjZSBFeHBvcnQge1xuLy8gICBjaHVua3M6IFNldDxudW1iZXI+O1xuLy8gICBzeW1ib2w6IG51bWJlcjtcbi8vIH1cblxuZnVuY3Rpb24gZmFpbChtc2c6IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG59XG5cbmNsYXNzIExpbmtTZWdtZW50IHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBiYW5rOiBudW1iZXI7XG4gIHJlYWRvbmx5IHNpemU6IG51bWJlcjtcbiAgcmVhZG9ubHkgb2Zmc2V0OiBudW1iZXI7XG4gIHJlYWRvbmx5IG1lbW9yeTogbnVtYmVyO1xuICByZWFkb25seSBhZGRyZXNzaW5nOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3Ioc2VnbWVudDogU2VnbWVudCkge1xuICAgIGNvbnN0IG5hbWUgPSB0aGlzLm5hbWUgPSBzZWdtZW50Lm5hbWU7XG4gICAgdGhpcy5iYW5rID0gc2VnbWVudC5iYW5rID8/IDA7XG4gICAgdGhpcy5hZGRyZXNzaW5nID0gc2VnbWVudC5hZGRyZXNzaW5nID8/IDI7XG4gICAgdGhpcy5zaXplID0gc2VnbWVudC5zaXplID8/IGZhaWwoYFNpemUgbXVzdCBiZSBzcGVjaWZpZWQ6ICR7bmFtZX1gKTtcbiAgICB0aGlzLm9mZnNldCA9IHNlZ21lbnQub2Zmc2V0ID8/IGZhaWwoYE9GZnNldCBtdXN0IGJlIHNwZWNpZmllZDogJHtuYW1lfWApO1xuICAgIHRoaXMubWVtb3J5ID0gc2VnbWVudC5tZW1vcnkgPz8gZmFpbChgT0Zmc2V0IG11c3QgYmUgc3BlY2lmaWVkOiAke25hbWV9YCk7XG4gIH1cblxuICAvLyBvZmZzZXQgPSBvcmcgKyBkZWx0YVxuICBnZXQgZGVsdGEoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMub2Zmc2V0IC0gdGhpcy5tZW1vcnk7IH1cbn1cblxuY2xhc3MgTGlua0NodW5rIHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nfHVuZGVmaW5lZDtcbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICBzZWdtZW50czogcmVhZG9ubHkgc3RyaW5nW107XG4gIGFzc2VydHM6IEV4cHJbXTtcblxuICBzdWJzID0gbmV3IFNldDxTdWJzdGl0dXRpb24+KCk7XG4gIHNlbGZTdWJzID0gbmV3IFNldDxTdWJzdGl0dXRpb24+KCk7XG5cbiAgLyoqIEdsb2JhbCBJRHMgb2YgY2h1bmtzIG5lZWRlZCB0byBsb2NhdGUgYmVmb3JlIHdlIGNhbiBjb21wbGV0ZSB0aGlzIG9uZS4gKi9cbiAgZGVwcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAvKiogU3ltYm9scyB0aGF0IGFyZSBpbXBvcnRlZCBpbnRvIHRoaXMgY2h1bmsgKHRoZXNlIGFyZSBhbHNvIGRlcHMpLiAqL1xuICBpbXBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIC8vIC8qKiBTeW1ib2xzIHRoYXQgYXJlIGV4cG9ydGVkIGZyb20gdGhpcyBjaHVuay4gKi9cbiAgLy8gZXhwb3J0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvbGxvdyA9IG5ldyBNYXA8U3Vic3RpdHV0aW9uLCBMaW5rQ2h1bms+KCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGNodW5rIGlzIHBsYWNlZCBvdmVybGFwcGluZyB3aXRoIHNvbWV0aGluZyBlbHNlLlxuICAgKiBPdmVybGFwcyBhcmVuJ3Qgd3JpdHRlbiB0byB0aGUgcGF0Y2guXG4gICAqL1xuICBvdmVybGFwcyA9IGZhbHNlO1xuXG4gIHByaXZhdGUgX2RhdGE/OiBVaW50OEFycmF5O1xuXG4gIHByaXZhdGUgX29yZz86IG51bWJlcjtcbiAgcHJpdmF0ZSBfb2Zmc2V0PzogbnVtYmVyO1xuICBwcml2YXRlIF9zZWdtZW50PzogTGlua1NlZ21lbnQ7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbGlua2VyOiBMaW5rLFxuICAgICAgICAgICAgICByZWFkb25seSBpbmRleDogbnVtYmVyLFxuICAgICAgICAgICAgICBjaHVuazogQ2h1bms8VWludDhBcnJheT4sXG4gICAgICAgICAgICAgIGNodW5rT2Zmc2V0OiBudW1iZXIsXG4gICAgICAgICAgICAgIHN5bWJvbE9mZnNldDogbnVtYmVyKSB7XG4gICAgdGhpcy5uYW1lID0gY2h1bmsubmFtZTtcbiAgICB0aGlzLnNpemUgPSBjaHVuay5kYXRhLmxlbmd0aDtcbiAgICB0aGlzLnNlZ21lbnRzID0gY2h1bmsuc2VnbWVudHM7XG4gICAgdGhpcy5fZGF0YSA9IGNodW5rLmRhdGE7XG4gICAgZm9yIChjb25zdCBzdWIgb2YgY2h1bmsuc3VicyB8fCBbXSkge1xuICAgICAgdGhpcy5zdWJzLmFkZCh0cmFuc2xhdGVTdWIoc3ViLCBjaHVua09mZnNldCwgc3ltYm9sT2Zmc2V0KSk7XG4gICAgfVxuICAgIHRoaXMuYXNzZXJ0cyA9IChjaHVuay5hc3NlcnRzIHx8IFtdKVxuICAgICAgICAubWFwKGUgPT4gdHJhbnNsYXRlRXhwcihlLCBjaHVua09mZnNldCwgc3ltYm9sT2Zmc2V0KSk7XG4gICAgaWYgKGNodW5rLm9yZykgdGhpcy5fb3JnID0gY2h1bmsub3JnO1xuICB9XG5cbiAgZ2V0IG9yZygpIHsgcmV0dXJuIHRoaXMuX29yZzsgfVxuICBnZXQgb2Zmc2V0KCkgeyByZXR1cm4gdGhpcy5fb2Zmc2V0OyB9XG4gIGdldCBzZWdtZW50KCkgeyByZXR1cm4gdGhpcy5fc2VnbWVudDsgfVxuICBnZXQgZGF0YSgpIHsgcmV0dXJuIHRoaXMuX2RhdGEgPz8gZmFpbCgnbm8gZGF0YScpOyB9XG5cbiAgaW5pdGlhbFBsYWNlbWVudCgpIHtcbiAgICAvLyBJbnZhcmlhbnQ6IGV4YWN0bHkgb25lIG9mIChkYXRhKSBvciAob3JnLCBfb2Zmc2V0LCBfc2VnbWVudCkgaXMgcHJlc2VudC5cbiAgICAvLyBJZiAob3JnLCAuLi4pIGZpbGxlZCBpbiB0aGVuIHdlIHVzZSBsaW5rZXIuZGF0YSBpbnN0ZWFkLlxuICAgIC8vIFdlIGRvbid0IGNhbGwgdGhpcyBpbiB0aGUgY3RvciBiZWNhdXNlIGl0IGRlcGVuZHMgb24gYWxsIHRoZSBzZWdtZW50c1xuICAgIC8vIGJlaW5nIGxvYWRlZCwgYnV0IGl0J3MgdGhlIGZpcnN0IHRoaW5nIHdlIGRvIGluIGxpbmsoKS5cbiAgICBpZiAodGhpcy5fb3JnID09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCBlbGlnaWJsZVNlZ21lbnRzOiBMaW5rU2VnbWVudFtdID0gW107XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuc2VnbWVudHMpIHtcbiAgICAgIGNvbnN0IHMgPSB0aGlzLmxpbmtlci5zZWdtZW50cy5nZXQobmFtZSk7XG4gICAgICBpZiAoIXMpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBzZWdtZW50OiAke25hbWV9YCk7XG4gICAgICBpZiAodGhpcy5fb3JnID49IHMubWVtb3J5ICYmIHRoaXMuX29yZyA8IHMubWVtb3J5ICsgcy5zaXplKSB7XG4gICAgICAgIGVsaWdpYmxlU2VnbWVudHMucHVzaChzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVsaWdpYmxlU2VnbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vbi11bmlxdWUgc2VnbWVudDogJHtlbGlnaWJsZVNlZ21lbnRzfWApO1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50ID0gZWxpZ2libGVTZWdtZW50c1swXTtcbiAgICBpZiAodGhpcy5fb3JnID49IHNlZ21lbnQubWVtb3J5ICsgc2VnbWVudC5zaXplKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENodW5rIGRvZXMgbm90IGZpdCBpbiBzZWdtZW50ICR7c2VnbWVudC5uYW1lfWApO1xuICAgIH1cbiAgICB0aGlzLnBsYWNlKHRoaXMuX29yZywgc2VnbWVudCk7XG4gIH1cblxuICBwbGFjZShvcmc6IG51bWJlciwgc2VnbWVudDogTGlua1NlZ21lbnQpIHtcbiAgICB0aGlzLl9vcmcgPSBvcmc7XG4gICAgdGhpcy5fc2VnbWVudCA9IHNlZ21lbnQ7XG4gICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5fb2Zmc2V0ID0gb3JnICsgc2VnbWVudC5kZWx0YTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgdGhpcy5saW5rZXIud2F0Y2hlcykge1xuICAgICAgaWYgKHcgPj0gb2Zmc2V0ICYmIHcgPCBvZmZzZXQgKyB0aGlzLnNpemUpIGRlYnVnZ2VyO1xuICAgIH1cbiAgICAvLyBDb3B5IGRhdGEsIGxlYXZpbmcgb3V0IGFueSBob2xlc1xuICAgIGNvbnN0IGZ1bGwgPSB0aGlzLmxpbmtlci5kYXRhO1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLl9kYXRhID8/IGZhaWwoYE5vIGRhdGFgKTtcbiAgICB0aGlzLl9kYXRhID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHRoaXMuc3Vicy5zaXplKSB7XG4gICAgICBmdWxsLnNwbGljZShvZmZzZXQsIGRhdGEubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHNwYXJzZSA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgICAgIHNwYXJzZS5zZXQoMCwgZGF0YSk7XG4gICAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLnN1YnMpIHtcbiAgICAgICAgc3BhcnNlLnNwbGljZShzdWIub2Zmc2V0LCBzdWIuc2l6ZSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtzdGFydCwgY2h1bmtdIG9mIHNwYXJzZS5jaHVua3MoKSkge1xuICAgICAgICBmdWxsLnNldChvZmZzZXQgKyBzdGFydCwgLi4uY2h1bmspO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmdWxsLnNldChvZmZzZXQsIGRhdGEpO1xuICAgIH1cblxuICAgIC8vIFJldHJ5IHRoZSBmb2xsb3ctb25zXG4gICAgZm9yIChjb25zdCBbc3ViLCBjaHVua10gb2YgdGhpcy5mb2xsb3cpIHtcbiAgICAgIGNodW5rLnJlc29sdmVTdWIoc3ViLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgdGhpcy5saW5rZXIuZnJlZS5kZWxldGUodGhpcy5vZmZzZXQhLCB0aGlzLm9mZnNldCEgKyB0aGlzLnNpemUpO1xuICB9XG5cbiAgcmVzb2x2ZVN1YnMoaW5pdGlhbCA9IGZhbHNlKSB7IC8vOiBNYXA8bnVtYmVyLCBTdWJzdGl0dXRpb25bXT4ge1xuICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgc3Vicywgc2VlIHdoYXQgcHJvZ3JlcyB3ZSBjYW4gbWFrZT9cbiAgICAvLyByZXN1bHQ6IGxpc3Qgb2YgZGVwZW5kZW50IGNodW5rcy5cblxuICAgIC8vIE5PVEU6IGlmIHdlIGRlcGVuZCBvbiBvdXJzZWxmIHRoZW4gd2Ugd2lsbCByZXR1cm4gZW1wdHkgZGVwcyxcbiAgICAvLyAgICAgICBhbmQgbWF5IGJlIHBsYWNlZCBpbW1lZGlhdGVseSwgYnV0IHdpbGwgc3RpbGwgaGF2ZSBob2xlcy5cbiAgICAvLyAgICAgIC0gTk8sIGl0J3MgcmVzcG9uc2liaWxpdHkgb2YgY2FsbGVyIHRvIGNoZWNrIHRoYXRcbiAgICBmb3IgKGNvbnN0IHN1YiBvZiB0aGlzLnNlbGZTdWJzKSB7XG4gICAgICB0aGlzLnJlc29sdmVTdWIoc3ViLCBpbml0aWFsKTtcbiAgICB9XG5cbiAgICAvLyBjb25zdCBkZXBzID0gbmV3IFNldCgpO1xuICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuc3Vicykge1xuICAgICAgLy8gY29uc3Qgc3ViRGVwcyA9IFxuICAgICAgdGhpcy5yZXNvbHZlU3ViKHN1YiwgaW5pdGlhbCk7XG4gICAgICAvLyBpZiAoIXN1YkRlcHMpIGNvbnRpbnVlO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXAgb2Ygc3ViRGVwcykge1xuICAgICAgLy8gICBsZXQgc3VicyA9IGRlcHMuZ2V0KGRlcCk7XG4gICAgICAvLyAgIGlmICghc3VicykgZGVwcy5zZXQoZGVwLCBzdWJzID0gW10pO1xuICAgICAgLy8gICBzdWJzLnB1c2goc3ViKTtcbiAgICAgIC8vIH1cbiAgICB9XG4gICAgLy8gaWYgKHRoaXMub3JnICE9IG51bGwpIHJldHVybiBuZXcgU2V0KCk7XG4gICAgLy8gcmV0dXJuIGRlcHM7XG4gIH1cblxuICBhZGREZXAoc3ViOiBTdWJzdGl0dXRpb24sIGRlcDogbnVtYmVyKSB7XG4gICAgaWYgKGRlcCA9PT0gdGhpcy5pbmRleCAmJiB0aGlzLnN1YnMuZGVsZXRlKHN1YikpIHRoaXMuc2VsZlN1YnMuYWRkKHN1Yik7XG4gICAgdGhpcy5saW5rZXIuY2h1bmtzW2RlcF0uZm9sbG93LnNldChzdWIsIHRoaXMpO1xuICAgIHRoaXMuZGVwcy5hZGQoZGVwKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBsaXN0IG9mIGRlcGVuZGVudCBjaHVua3MsIG9yIHVuZGVmaW5lZCBpZiBzdWNjZXNzZnVsLlxuICByZXNvbHZlU3ViKHN1YjogU3Vic3RpdHV0aW9uLCBpbml0aWFsOiBib29sZWFuKSB7IC8vOiBJdGVyYWJsZTxudW1iZXI+fHVuZGVmaW5lZCB7XG5cbiAgICAvLyBUT0RPIC0gcmVzb2x2ZShyZXNvbHZlcikgdmlhIGNodW5rRGF0YSB0byByZXNvbHZlIGJhbmtzISFcblxuXG4gICAgLy8gRG8gYSBmdWxsIHRyYXZlcnNlIG9mIHRoZSBleHByZXNzaW9uIC0gc2VlIHdoYXQncyBibG9ja2luZyB1cy5cbiAgICBpZiAoIXRoaXMuc3Vicy5oYXMoc3ViKSAmJiAhdGhpcy5zZWxmU3Vicy5oYXMoc3ViKSkgcmV0dXJuO1xuICAgIHN1Yi5leHByID0gRXhwci50cmF2ZXJzZShzdWIuZXhwciwgKGUsIHJlYywgcCkgPT4ge1xuICAgICAgLy8gRmlyc3QgaGFuZGxlIG1vc3QgY29tbW9uIGJhbmsgYnl0ZSBjYXNlLCBzaW5jZSBpdCB0cmlnZ2VycyBvbiBhXG4gICAgICAvLyBkaWZmZXJlbnQgdHlwZSBvZiByZXNvbHV0aW9uLlxuICAgICAgaWYgKGluaXRpYWwgJiYgcD8ub3AgPT09ICdeJyAmJiBwLmFyZ3MhLmxlbmd0aCA9PT0gMSAmJiBlLm1ldGEpIHtcbiAgICAgICAgaWYgKGUubWV0YS5iYW5rID09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLmFkZERlcChzdWIsIGUubWV0YS5jaHVuayEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlOyAvLyBza2lwIHJlY3Vyc2lvbiBlaXRoZXIgd2F5LlxuICAgICAgfVxuICAgICAgZSA9IHRoaXMubGlua2VyLnJlc29sdmVMaW5rKEV4cHIuZXZhbHVhdGUocmVjKGUpKSk7XG4gICAgICBpZiAoaW5pdGlhbCAmJiBlLm1ldGE/LnJlbCkgdGhpcy5hZGREZXAoc3ViLCBlLm1ldGEuY2h1bmshKTtcbiAgICAgIHJldHVybiBlO1xuICAgIH0pO1xuXG4gICAgLy8gUFJPQkxFTSAtIG9mZiBpcyByZWxhdGl2ZSB0byB0aGUgY2h1bmssIGJ1dCB3ZSB3YW50IHRvIGJlIGFibGUgdG9cbiAgICAvLyBzcGVjaWZ5IGFuIEFCU09MVVRFIG9yZyB3aXRoaW4gYSBzZWdtZW50Li4uIVxuICAgIC8vIEFuIGFic29sdXRlIG9mZnNldCB3aXRoaW4gdGhlIHdob2xlIG9yaWcgaXMgbm8gZ29vZCwgZWl0aGVyXG4gICAgLy8gd2FudCB0byB3cml0ZSBpdCBhcyAuc2VnbWVudCBcImZvb1wiOyBTeW0gPSAkMTIzNFxuICAgIC8vIENvdWxkIGFsc28ganVzdCBkbyAubW92ZSBjb3VudCwgXCJzZWdcIiwgJDEyMzQgYW5kIHN0b3JlIGEgc3BlY2lhbCBvcFxuICAgIC8vIHRoYXQgdXNlcyBib3RoIHN5bSBhbmQgbnVtP1xuXG4gICAgLy8gU2VlIGlmIHdlIGNhbiBkbyBpdCBpbW1lZGlhdGVseS5cbiAgICBsZXQgZGVsID0gZmFsc2U7XG4gICAgaWYgKHN1Yi5leHByLm9wID09PSAnbnVtJyAmJiAhc3ViLmV4cHIubWV0YT8ucmVsKSB7XG4gICAgICB0aGlzLndyaXRlVmFsdWUoc3ViLm9mZnNldCwgc3ViLmV4cHIubnVtISwgc3ViLnNpemUpO1xuICAgICAgZGVsID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKHN1Yi5leHByLm9wID09PSAnLm1vdmUnKSB7XG4gICAgICBpZiAoc3ViLmV4cHIuYXJncyEubGVuZ3RoICE9PSAxKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCAubW92ZWApO1xuICAgICAgY29uc3QgY2hpbGQgPSBzdWIuZXhwci5hcmdzIVswXTtcbiAgICAgIGlmIChjaGlsZC5vcCA9PT0gJ251bScgJiYgY2hpbGQubWV0YT8ub2Zmc2V0ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBjaGlsZC5tZXRhIS5vZmZzZXQhICsgY2hpbGQubnVtITtcbiAgICAgICAgY29uc3Qgc2xpY2UgPSB0aGlzLmxpbmtlci5vcmlnLnNsaWNlKHN0YXJ0LCBzdGFydCArIHN1Yi5zaXplKTtcbiAgICAgICAgdGhpcy53cml0ZUJ5dGVzKHN1Yi5vZmZzZXQsIFVpbnQ4QXJyYXkuZnJvbShzbGljZSkpO1xuICAgICAgICBkZWwgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZGVsKSB7XG4gICAgICB0aGlzLnN1YnMuZGVsZXRlKHN1YikgfHwgdGhpcy5zZWxmU3Vicy5kZWxldGUoc3ViKTtcbiAgICAgIGlmICghdGhpcy5zdWJzLnNpemUpIHsgLy8gTkVXOiBpZ25vcmVzIHNlbGYtc3VicyBub3dcbiAgICAgIC8vIGlmICghdGhpcy5zdWJzLnNpemUgfHwgKGRlcHMuc2l6ZSA9PT0gMSAmJiBkZXBzLmhhcyh0aGlzLmluZGV4KSkpICB7XG4gICAgICAgIC8vIGFkZCB0byByZXNvbHZlZCBxdWV1ZSAtIHJlYWR5IHRvIGJlIHBsYWNlZCFcbiAgICAgICAgLy8gUXVlc3Rpb246IHNob3VsZCB3ZSBwbGFjZSBpdCByaWdodCBhd2F5PyAgV2UgcGxhY2UgdGhlIGZpeGVkIGNodW5rc1xuICAgICAgICAvLyBpbW1lZGlhdGVseSBpbiB0aGUgY3RvciwgYnV0IHRoZXJlJ3Mgbm8gY2hvaWNlIHRvIGRlZmVyLiAgRm9yIHJlbG9jXG4gICAgICAgIC8vIGNodW5rcywgaXQncyBiZXR0ZXIgdG8gd2FpdCB1bnRpbCB3ZSd2ZSByZXNvbHZlZCBhcyBtdWNoIGFzIHBvc3NpYmxlXG4gICAgICAgIC8vIGJlZm9yZSBwbGFjaW5nIGFueXRoaW5nLiAgRm9ydHVuYXRlbHksIHBsYWNpbmcgYSBjaHVuayB3aWxsXG4gICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgcmVzb2x2ZSBhbGwgZGVwcyBub3chXG4gICAgICAgIGlmICh0aGlzLmxpbmtlci51bnJlc29sdmVkQ2h1bmtzLmRlbGV0ZSh0aGlzKSkge1xuICAgICAgICAgIHRoaXMubGlua2VyLmluc2VydFJlc29sdmVkKHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgd3JpdGVCeXRlcyhvZmZzZXQ6IG51bWJlciwgYnl0ZXM6IFVpbnQ4QXJyYXkpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YS5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGJ5dGVzLmxlbmd0aCkuc2V0KGJ5dGVzKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX29mZnNldCAhPSBudWxsKSB7XG4gICAgICB0aGlzLmxpbmtlci5kYXRhLnNldCh0aGlzLl9vZmZzZXQgKyBvZmZzZXQsIGJ5dGVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlYCk7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVWYWx1ZShvZmZzZXQ6IG51bWJlciwgdmFsOiBudW1iZXIsIHNpemU6IG51bWJlcikge1xuICAgIC8vIFRPRE8gLSB0aGlzIGlzIGFsbW9zdCBlbnRpcmVseSBjb3BpZWQgZnJvbSBwcm9jZXNzb3Igd3JpdGVOdW1iZXJcbiAgICBjb25zdCBiaXRzID0gKHNpemUpIDw8IDM7XG4gICAgaWYgKHZhbCAhPSBudWxsICYmICh2YWwgPCAoLTEgPDwgYml0cykgfHwgdmFsID49ICgxIDw8IGJpdHMpKSkge1xuICAgICAgY29uc3QgbmFtZSA9IFsnYnl0ZScsICd3b3JkJywgJ2ZhcndvcmQnLCAnZHdvcmQnXVtzaXplIC0gMV07XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBhICR7bmFtZX06ICQke3ZhbC50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGJ5dGVzW2ldID0gdmFsICYgMHhmZjtcbiAgICAgIHZhbCA+Pj0gODtcbiAgICB9XG4gICAgdGhpcy53cml0ZUJ5dGVzKG9mZnNldCwgYnl0ZXMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZVN1YihzOiBTdWJzdGl0dXRpb24sIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBTdWJzdGl0dXRpb24ge1xuICBzID0gey4uLnN9O1xuICBzLmV4cHIgPSB0cmFuc2xhdGVFeHByKHMuZXhwciwgZGMsIGRzKTtcbiAgcmV0dXJuIHM7XG59XG5mdW5jdGlvbiB0cmFuc2xhdGVFeHByKGU6IEV4cHIsIGRjOiBudW1iZXIsIGRzOiBudW1iZXIpOiBFeHByIHtcbiAgZSA9IHsuLi5lfTtcbiAgaWYgKGUubWV0YSkgZS5tZXRhID0gey4uLmUubWV0YX07XG4gIGlmIChlLmFyZ3MpIGUuYXJncyA9IGUuYXJncy5tYXAoYSA9PiB0cmFuc2xhdGVFeHByKGEsIGRjLCBkcykpO1xuICBpZiAoZS5tZXRhPy5jaHVuayAhPSBudWxsKSBlLm1ldGEuY2h1bmsgKz0gZGM7XG4gIGlmIChlLm9wID09PSAnc3ltJyAmJiBlLm51bSAhPSBudWxsKSBlLm51bSArPSBkcztcbiAgcmV0dXJuIGU7XG59XG5mdW5jdGlvbiB0cmFuc2xhdGVTeW1ib2woczogU3ltYm9sLCBkYzogbnVtYmVyLCBkczogbnVtYmVyKTogU3ltYm9sIHtcbiAgcyA9IHsuLi5zfTtcbiAgaWYgKHMuZXhwcikgcy5leHByID0gdHJhbnNsYXRlRXhwcihzLmV4cHIsIGRjLCBkcyk7XG4gIHJldHVybiBzO1xufVxuXG4vLyBUaGlzIGNsYXNzIGlzIHNpbmdsZS11c2UuXG5jbGFzcyBMaW5rIHtcbiAgZGF0YSA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgb3JpZyA9IG5ldyBTcGFyc2VCeXRlQXJyYXkoKTtcbiAgLy8gTWFwcyBzeW1ib2wgdG8gc3ltYm9sICMgLy8gW3N5bWJvbCAjLCBkZXBlbmRlbnQgY2h1bmtzXVxuICBleHBvcnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTsgLy8gcmVhZG9ubHkgW251bWJlciwgU2V0PG51bWJlcj5dPigpO1xuICBjaHVua3M6IExpbmtDaHVua1tdID0gW107XG4gIHN5bWJvbHM6IFN5bWJvbFtdID0gW107XG4gIGZyZWUgPSBuZXcgSW50ZXJ2YWxTZXQoKTtcbiAgcmF3U2VnbWVudHMgPSBuZXcgTWFwPHN0cmluZywgU2VnbWVudFtdPigpO1xuICBzZWdtZW50cyA9IG5ldyBNYXA8c3RyaW5nLCBMaW5rU2VnbWVudD4oKTtcblxuICByZXNvbHZlZENodW5rczogTGlua0NodW5rW10gPSBbXTtcbiAgdW5yZXNvbHZlZENodW5rcyA9IG5ldyBTZXQ8TGlua0NodW5rPigpO1xuXG4gIHdhdGNoZXM6IG51bWJlcltdID0gW107IC8vIGRlYnVnZ2luZyBhaWQ6IG9mZnNldHMgdG8gd2F0Y2guXG5cbiAgLy8gVE9ETyAtIGRlZmVycmVkIC0gc3RvcmUgc29tZSBzb3J0IG9mIGRlcGVuZGVuY3kgZ3JhcGg/XG5cbiAgaW5zZXJ0UmVzb2x2ZWQoY2h1bms6IExpbmtDaHVuaykge1xuICAgIGJpbmFyeUluc2VydCh0aGlzLnJlc29sdmVkQ2h1bmtzLCBjID0+IGMuc2l6ZSwgY2h1bmspO1xuICB9XG5cbiAgYmFzZShkYXRhOiBVaW50OEFycmF5LCBvZmZzZXQgPSAwKSB7XG4gICAgdGhpcy5kYXRhLnNldChvZmZzZXQsIGRhdGEpO1xuICAgIHRoaXMub3JpZy5zZXQob2Zmc2V0LCBkYXRhKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGU6IE1vZHVsZSkge1xuICAgIGNvbnN0IGRjID0gdGhpcy5jaHVua3MubGVuZ3RoO1xuICAgIGNvbnN0IGRzID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAvLyBzZWdtZW50cyBjb21lIGZpcnN0LCBzaW5jZSBMaW5rQ2h1bmsgY29uc3RydWN0b3IgbmVlZHMgdGhlbVxuICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBmaWxlLnNlZ21lbnRzIHx8IFtdKSB7XG4gICAgICB0aGlzLmFkZFJhd1NlZ21lbnQoc2VnbWVudCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgZmlsZS5jaHVua3MgfHwgW10pIHtcbiAgICAgIGNvbnN0IGxjID0gbmV3IExpbmtDaHVuayh0aGlzLCB0aGlzLmNodW5rcy5sZW5ndGgsIGNodW5rLCBkYywgZHMpO1xuICAgICAgdGhpcy5jaHVua3MucHVzaChsYyk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIGZpbGUuc3ltYm9scyB8fCBbXSkge1xuICAgICAgdGhpcy5zeW1ib2xzLnB1c2godHJhbnNsYXRlU3ltYm9sKHN5bWJvbCwgZGMsIGRzKSk7XG4gICAgfVxuICAgIC8vIFRPRE8gLSB3aGF0IHRoZSBoZWNrIGRvIHdlIGRvIHdpdGggc2VnbWVudHM/XG4gICAgLy8gICAgICAtIGluIHBhcnRpY3VsYXIsIHdobyBpcyByZXNwb25zaWJsZSBmb3IgZGVmaW5pbmcgdGhlbT8/P1xuXG4gICAgLy8gQmFzaWMgaWRlYTpcbiAgICAvLyAgMS4gZ2V0IGFsbCB0aGUgY2h1bmtzXG4gICAgLy8gIDIuIGJ1aWxkIHVwIGEgZGVwZW5kZW5jeSBncmFwaFxuICAgIC8vICAzLiB3cml0ZSBhbGwgZml4ZWQgY2h1bmtzLCBtZW1vaXppbmcgYWJzb2x1dGUgb2Zmc2V0cyBvZlxuICAgIC8vICAgICBtaXNzaW5nIHN1YnMgKHRoZXNlIGFyZSBub3QgZWxpZ2libGUgZm9yIGNvYWxlc2NpbmcpLlxuICAgIC8vICAgICAtLSBwcm9iYWJseSBzYW1lIHRyZWF0bWVudCBmb3IgZnJlZWQgc2VjdGlvbnNcbiAgICAvLyAgNC4gZm9yIHJlbG9jIGNodW5rcywgZmluZCB0aGUgYmlnZ2VzdCBjaHVuayB3aXRoIG5vIGRlcHMuXG4gIH1cblxuICAvLyByZXNvbHZlQ2h1bmsoY2h1bms6IExpbmtDaHVuaykge1xuICAvLyAgIC8vaWYgKGNodW5rLnJlc29sdmluZykgcmV0dXJuOyAvLyBicmVhayBhbnkgY3ljbGVzXG4gICAgXG4gIC8vIH1cblxuICByZXNvbHZlTGluayhleHByOiBFeHByKTogRXhwciB7XG4gICAgaWYgKGV4cHIub3AgPT09ICcub3JpZycgJiYgZXhwci5hcmdzPy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGNvbnN0IGNoaWxkID0gZXhwci5hcmdzWzBdO1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gY2hpbGQubWV0YT8ub2Zmc2V0O1xuICAgICAgaWYgKG9mZnNldCAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IG51bSA9IHRoaXMub3JpZy5nZXQob2Zmc2V0ICsgY2hpbGQubnVtISk7XG4gICAgICAgIGlmIChudW0gIT0gbnVsbCkgcmV0dXJuIHtvcDogJ251bScsIG51bX07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChleHByLm9wID09PSAnbnVtJyAmJiBleHByLm1ldGE/LmNodW5rICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSBleHByLm1ldGE7XG4gICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW21ldGEuY2h1bmshXTtcbiAgICAgIGlmIChjaHVuay5vcmcgIT09IG1ldGEub3JnIHx8XG4gICAgICAgICAgY2h1bmsuc2VnbWVudD8uYmFuayAhPT0gbWV0YS5iYW5rIHx8XG4gICAgICAgICAgY2h1bmsub2Zmc2V0ICE9PSBtZXRhLm9mZnNldCkge1xuICAgICAgICBjb25zdCBtZXRhMiA9IHtcbiAgICAgICAgICBvcmc6IGNodW5rLm9yZyxcbiAgICAgICAgICBvZmZzZXQ6IGNodW5rLm9mZnNldCxcbiAgICAgICAgICBiYW5rOiBjaHVuay5zZWdtZW50Py5iYW5rLFxuICAgICAgICB9O1xuICAgICAgICBleHByID0gRXhwci5ldmFsdWF0ZSh7Li4uZXhwciwgbWV0YTogey4uLm1ldGEsIC4uLm1ldGEyfX0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIC8vIE5PVEU6IHNvIGZhciB0aGlzIGlzIG9ubHkgdXNlZCBmb3IgYXNzZXJ0cz9cbiAgLy8gSXQgYmFzaWNhbGx5IGNvcHktcGFzdGVzIGZyb20gcmVzb2x2ZVN1YnMuLi4gOi0oXG5cbiAgcmVzb2x2ZUV4cHIoZXhwcjogRXhwcik6IG51bWJlciB7XG4gICAgZXhwciA9IEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICB9KTtcblxuICAgIGlmIChleHByLm9wID09PSAnbnVtJyAmJiAhZXhwci5tZXRhPy5yZWwpIHJldHVybiBleHByLm51bSE7XG4gICAgY29uc3QgYXQgPSBUb2tlbi5hdChleHByKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmdWxseSByZXNvbHZlIGV4cHIke2F0fWApO1xuICB9XG5cbiAgbGluaygpOiBTcGFyc2VCeXRlQXJyYXkge1xuICAgIC8vIEJ1aWxkIHVwIHRoZSBMaW5rU2VnbWVudCBvYmplY3RzXG4gICAgZm9yIChjb25zdCBbbmFtZSwgc2VnbWVudHNdIG9mIHRoaXMucmF3U2VnbWVudHMpIHtcbiAgICAgIGxldCBzID0gc2VnbWVudHNbMF07XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHMgPSBTZWdtZW50Lm1lcmdlKHMsIHNlZ21lbnRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2VnbWVudHMuc2V0KG5hbWUsIG5ldyBMaW5rU2VnbWVudChzKSk7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZnJlZSBzcGFjZVxuICAgIGZvciAoY29uc3QgW25hbWUsIHNlZ21lbnRzXSBvZiB0aGlzLnJhd1NlZ21lbnRzKSB7XG4gICAgICBjb25zdCBzID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICAgIGNvbnN0IGZyZWUgPSBzZWdtZW50LmZyZWU7XG4gICAgICAgIC8vIEFkZCB0aGUgZnJlZSBzcGFjZVxuICAgICAgICBmb3IgKGNvbnN0IFtzdGFydCwgZW5kXSBvZiBmcmVlIHx8IFtdKSB7XG4gICAgICAgICAgdGhpcy5mcmVlLmFkZChzdGFydCArIHMuZGVsdGEsIGVuZCArIHMuZGVsdGEpO1xuICAgICAgICAgIHRoaXMuZGF0YS5zcGxpY2Uoc3RhcnQgKyBzLmRlbHRhLCBlbmQgLSBzdGFydCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gU2V0IHVwIGFsbCB0aGUgaW5pdGlhbCBwbGFjZW1lbnRzLlxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGNodW5rLmluaXRpYWxQbGFjZW1lbnQoKTtcbiAgICB9XG4gICAgLy8gRmluZCBhbGwgdGhlIGV4cG9ydHMuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuc3ltYm9sc1tpXTtcbiAgICAgIC8vIFRPRE8gLSB3ZSdkIHJlYWxseSBsaWtlIHRvIGlkZW50aWZ5IHRoaXMgZWFybGllciBpZiBhdCBhbGwgcG9zc2libGUhXG4gICAgICBpZiAoIXN5bWJvbC5leHByKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCAke2l9IG5ldmVyIHJlc29sdmVkYCk7XG4gICAgICAvLyBsb29rIGZvciBpbXBvcnRzL2V4cG9ydHNcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0ICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5leHBvcnRzLnNldChzeW1ib2wuZXhwb3J0LCBpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzb2x2ZSBhbGwgdGhlIGltcG9ydHMgaW4gYWxsIHN5bWJvbCBhbmQgY2h1bmsuc3VicyBleHBycy5cbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIHN5bWJvbC5leHByID0gdGhpcy5yZXNvbHZlU3ltYm9scyhzeW1ib2wuZXhwciEpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBmb3IgKGNvbnN0IHN1YiBvZiBbLi4uY2h1bmsuc3VicywgLi4uY2h1bmsuc2VsZlN1YnNdKSB7XG4gICAgICAgIHN1Yi5leHByID0gdGhpcy5yZXNvbHZlU3ltYm9scyhzdWIuZXhwcik7XG4gICAgICB9XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNodW5rLmFzc2VydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2h1bmsuYXNzZXJ0c1tpXSA9IHRoaXMucmVzb2x2ZVN5bWJvbHMoY2h1bmsuYXNzZXJ0c1tpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIHdlIGRvbid0IGNhcmUgYWJvdXQgdGhpcy5zeW1ib2xzIGF0IGFsbCBhbnltb3JlLlxuICAgIC8vIE5vdyBmaWd1cmUgb3V0IHRoZSBmdWxsIGRlcGVuZGVuY3kgdHJlZTogY2h1bmsgI1ggcmVxdWlyZXMgY2h1bmsgI1lcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGMucmVzb2x2ZVN1YnModHJ1ZSk7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGZpbGwgKHVuKXJlc29sdmVkQ2h1bmtzXG4gICAgLy8gICAtIGdldHMgXG5cbiAgICBjb25zdCBjaHVua3MgPSBbLi4udGhpcy5jaHVua3NdO1xuICAgIGNodW5rcy5zb3J0KChhLCBiKSA9PiBiLnNpemUgLSBhLnNpemUpO1xuXG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIGNodW5rLnJlc29sdmVTdWJzKCk7XG4gICAgICBpZiAoY2h1bmsuc3Vicy5zaXplKSB7XG4gICAgICAgIHRoaXMudW5yZXNvbHZlZENodW5rcy5hZGQoY2h1bmspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbnNlcnRSZXNvbHZlZChjaHVuayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGNvdW50ID0gdGhpcy5yZXNvbHZlZENodW5rcy5sZW5ndGggKyAyICogdGhpcy51bnJlc29sdmVkQ2h1bmtzLnNpemU7XG4gICAgd2hpbGUgKGNvdW50KSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5yZXNvbHZlZENodW5rcy5wb3AoKTtcbiAgICAgIGlmIChjKSB7XG4gICAgICAgIHRoaXMucGxhY2VDaHVuayhjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJlc29sdmUgYWxsIHRoZSBmaXJzdCB1bnJlc29sdmVkIGNodW5rcycgZGVwc1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gdGhpcy51bnJlc29sdmVkQ2h1bmtzO1xuICAgICAgICBmb3IgKGNvbnN0IGRlcCBvZiBmaXJzdC5kZXBzKSB7XG4gICAgICAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tkZXBdO1xuICAgICAgICAgIGlmIChjaHVuay5vcmcgPT0gbnVsbCkgdGhpcy5wbGFjZUNodW5rKGNodW5rKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgbmV4dCA9IHRoaXMucmVzb2x2ZWRDaHVua3MubGVuZ3RoICsgMiAqIHRoaXMudW5yZXNvbHZlZENodW5rcy5zaXplO1xuICAgICAgaWYgKG5leHQgPT09IGNvdW50KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IodGhpcy5yZXNvbHZlZENodW5rcywgdGhpcy51bnJlc29sdmVkQ2h1bmtzKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBOb3QgbWFraW5nIHByb2dyZXNzYCk7XG4gICAgICB9XG4gICAgICBjb3VudCA9IG5leHQ7XG4gICAgfVxuXG4gICAgLy8gaWYgKCFjaHVuay5vcmcgJiYgIWNodW5rLnN1YnMubGVuZ3RoKSB0aGlzLnBsYWNlQ2h1bmsoY2h1bmspO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCB0aGUgZGVwIGdyYXBoIGlzIGJ1aWx0IC0gbm93IHRyYXZlcnNlIGl0LlxuXG4gICAgLy8gY29uc3QgcGxhY2UgPSAoaTogbnVtYmVyKSA9PiB7XG4gICAgLy8gICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bmtzW2ldO1xuICAgIC8vICAgaWYgKGNodW5rLm9yZyAhPSBudWxsKSByZXR1cm47XG4gICAgLy8gICAvLyByZXNvbHZlIGZpcnN0XG4gICAgLy8gICBjb25zdCByZW1haW5pbmc6IFN1YnN0aXR1dGlvbltdID0gW107XG4gICAgLy8gICBmb3IgKGNvbnN0IHN1YiBvZiBjaHVuay5zdWJzKSB7XG4gICAgLy8gICAgIGlmICh0aGlzLnJlc29sdmVTdWIoY2h1bmssIHN1YikpIHJlbWFpbmluZy5wdXNoKHN1Yik7XG4gICAgLy8gICB9XG4gICAgLy8gICBjaHVuay5zdWJzID0gcmVtYWluaW5nO1xuICAgIC8vICAgLy8gbm93IHBsYWNlIHRoZSBjaHVua1xuICAgIC8vICAgdGhpcy5wbGFjZUNodW5rKGNodW5rKTsgLy8gVE9ETyAuLi5cbiAgICAvLyAgIC8vIHVwZGF0ZSB0aGUgZ3JhcGg7IGRvbid0IGJvdGhlciBkZWxldGluZyBmb3JtIGJsb2NrZWQuXG4gICAgLy8gICBmb3IgKGNvbnN0IHJldkRlcCBvZiByZXZEZXBzW2ldKSB7XG4gICAgLy8gICAgIGNvbnN0IGZ3ZCA9IGZ3ZERlcHNbcmV2RGVwXTtcbiAgICAvLyAgICAgZndkLmRlbGV0ZShpKTtcbiAgICAvLyAgICAgaWYgKCFmd2Quc2l6ZSkgaW5zZXJ0KHVuYmxvY2tlZCwgcmV2RGVwKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLy8gd2hpbGUgKHVuYmxvY2tlZC5sZW5ndGggfHwgYmxvY2tlZC5sZW5ndGgpIHtcbiAgICAvLyAgIGxldCBuZXh0ID0gdW5ibG9ja2VkLnNoaWZ0KCk7XG4gICAgLy8gICBpZiAobmV4dCkge1xuICAgIC8vICAgICBwbGFjZShuZXh0KTtcbiAgICAvLyAgICAgY29udGludWU7XG4gICAgLy8gICB9XG4gICAgLy8gICBuZXh0ID0gYmxvY2tlZFswXTtcbiAgICAvLyAgIGZvciAoY29uc3QgcmV2IG9mIHJldkRlcHNbbmV4dF0pIHtcbiAgICAvLyAgICAgaWYgKHRoaXMuY2h1bmtzW3Jldl0ub3JnICE9IG51bGwpIHsgLy8gYWxyZWFkeSBwbGFjZWRcbiAgICAvLyAgICAgICBibG9ja2VkLnNoaWZ0KCk7XG4gICAgLy8gICAgICAgY29udGludWU7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcGxhY2UocmV2KTtcbiAgICAvLyAgIH1cbiAgICAvLyB9XG4gICAgLy8gQXQgdGhpcyBwb2ludCwgZXZlcnl0aGluZyBzaG91bGQgYmUgcGxhY2VkLCBzbyBkbyBvbmUgbGFzdCByZXNvbHZlLlxuXG4gICAgY29uc3QgcGF0Y2ggPSBuZXcgU3BhcnNlQnl0ZUFycmF5KCk7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBmb3IgKGNvbnN0IGEgb2YgYy5hc3NlcnRzKSB7XG4gICAgICAgIGNvbnN0IHYgPSB0aGlzLnJlc29sdmVFeHByKGEpO1xuICAgICAgICBpZiAodikgY29udGludWU7XG4gICAgICAgIGNvbnN0IGF0ID0gVG9rZW4uYXQoYSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIGZhaWxlZCR7YXR9YCk7XG4gICAgICB9XG4gICAgICBpZiAoYy5vdmVybGFwcykgY29udGludWU7XG4gICAgICBwYXRjaC5zZXQoYy5vZmZzZXQhLCAuLi50aGlzLmRhdGEuc2xpY2UoYy5vZmZzZXQhLCBjLm9mZnNldCEgKyBjLnNpemUhKSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRjaDtcbiAgfVxuXG4gIHBsYWNlQ2h1bmsoY2h1bms6IExpbmtDaHVuaykge1xuICAgIGlmIChjaHVuay5vcmcgIT0gbnVsbCkgcmV0dXJuOyAvLyBkb24ndCByZS1wbGFjZS5cbiAgICBjb25zdCBzaXplID0gY2h1bmsuc2l6ZTtcbiAgICBpZiAoIWNodW5rLnN1YnMuc2l6ZSAmJiAhY2h1bmsuc2VsZlN1YnMuc2l6ZSkge1xuICAgICAgLy8gY2h1bmsgaXMgcmVzb2x2ZWQ6IHNlYXJjaCBmb3IgYW4gZXhpc3RpbmcgY29weSBvZiBpdCBmaXJzdFxuICAgICAgY29uc3QgcGF0dGVybiA9IHRoaXMuZGF0YS5wYXR0ZXJuKGNodW5rLmRhdGEpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnQgPSB0aGlzLnNlZ21lbnRzLmdldChuYW1lKSE7XG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gc2VnbWVudC5vZmZzZXQhO1xuICAgICAgICBjb25zdCBlbmQgPSBzdGFydCArIHNlZ21lbnQuc2l6ZSE7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gcGF0dGVybi5zZWFyY2goc3RhcnQsIGVuZCk7XG4gICAgICAgIGlmIChpbmRleCA8IDApIGNvbnRpbnVlO1xuICAgICAgICBjaHVuay5wbGFjZShpbmRleCAtIHNlZ21lbnQuZGVsdGEsIHNlZ21lbnQpO1xuICAgICAgICBjaHVuay5vdmVybGFwcyA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZWl0aGVyIHVucmVzb2x2ZWQsIG9yIGRpZG4ndCBmaW5kIGEgbWF0Y2g7IGp1c3QgYWxsb2NhdGUgc3BhY2UuXG4gICAgLy8gbG9vayBmb3IgdGhlIHNtYWxsZXN0IHBvc3NpYmxlIGZyZWUgYmxvY2suXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGNodW5rLnNlZ21lbnRzKSB7XG4gICAgICBjb25zdCBzZWdtZW50ID0gdGhpcy5zZWdtZW50cy5nZXQobmFtZSkhO1xuICAgICAgY29uc3QgczAgPSBzZWdtZW50Lm9mZnNldCE7XG4gICAgICBjb25zdCBzMSA9IHMwICsgc2VnbWVudC5zaXplITtcbiAgICAgIGxldCBmb3VuZDogbnVtYmVyfHVuZGVmaW5lZDtcbiAgICAgIGxldCBzbWFsbGVzdCA9IEluZmluaXR5O1xuICAgICAgZm9yIChjb25zdCBbZjAsIGYxXSBvZiB0aGlzLmZyZWUudGFpbChzMCkpIHtcbiAgICAgICAgaWYgKGYwID49IHMxKSBicmVhaztcbiAgICAgICAgY29uc3QgZGYgPSBNYXRoLm1pbihmMSwgczEpIC0gZjA7XG4gICAgICAgIGlmIChkZiA8IHNpemUpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZGYgPCBzbWFsbGVzdCkge1xuICAgICAgICAgIGZvdW5kID0gZjA7XG4gICAgICAgICAgc21hbGxlc3QgPSBkZjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kICE9IG51bGwpIHtcbiAgICAgICAgLy8gZm91bmQgYSByZWdpb25cbiAgICAgICAgY2h1bmsucGxhY2UoZm91bmQgLSBzZWdtZW50LmRlbHRhLCBzZWdtZW50KTtcbiAgICAgICAgLy8gdGhpcy5mcmVlLmRlbGV0ZShmMCwgZjAgKyBzaXplKTtcbiAgICAgICAgLy8gVE9ETyAtIGZhY3RvciBvdXQgdGhlIHN1YnMtYXdhcmUgY29weSBtZXRob2QhXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coYEFmdGVyIGZpbGxpbmc6YCk7XG4gICAgdGhpcy5yZXBvcnQoKTtcbiAgICBjb25zdCBuYW1lID0gY2h1bmsubmFtZSA/IGAke2NodW5rLm5hbWV9IGAgOiAnJztcbiAgICBjb25zb2xlLmxvZyh0aGlzLnNlZ21lbnRzLmdldChjaHVuay5zZWdtZW50c1swXSkpO1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgc3BhY2UgZm9yICR7c2l6ZX0tYnl0ZSBjaHVuayAke25hbWV9aW4gJHtcbiAgICAgICAgICAgICAgICAgICAgIGNodW5rLnNlZ21lbnRzLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICByZXNvbHZlU3ltYm9scyhleHByOiBFeHByKTogRXhwciB7XG4gICAgLy8gcHJlLXRyYXZlcnNlIHNvIHRoYXQgdHJhbnNpdGl2ZSBpbXBvcnRzIHdvcmtcbiAgICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZSwgcmVjKSA9PiB7XG4gICAgICB3aGlsZSAoZS5vcCA9PT0gJ2ltJyB8fCBlLm9wID09PSAnc3ltJykge1xuICAgICAgICBpZiAoZS5vcCA9PT0gJ2ltJykge1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBlLnN5bSE7XG4gICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLmV4cG9ydHMuZ2V0KG5hbWUpO1xuICAgICAgICAgIGlmIChpbXBvcnRlZCA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBhdCA9IFRva2VuLmF0KGV4cHIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgbmV2ZXIgZXhwb3J0ZWQgJHtuYW1lfSR7YXR9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGUgPSB0aGlzLnN5bWJvbHNbaW1wb3J0ZWRdLmV4cHIhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChlLm51bSA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCBub3QgZ2xvYmFsYCk7XG4gICAgICAgICAgZSA9IHRoaXMuc3ltYm9sc1tlLm51bV0uZXhwciE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHJlYyhlKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyByZXNvbHZlQmFua0J5dGVzKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgLy8gICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZTogRXhwcikgPT4ge1xuICAvLyAgICAgaWYgKGUub3AgIT09ICdeJyB8fCBlLmFyZ3M/Lmxlbmd0aCAhPT0gMSkgcmV0dXJuIGU7XG4gIC8vICAgICBjb25zdCBjaGlsZCA9IGUuYXJnc1swXTtcbiAgLy8gICAgIGlmIChjaGlsZC5vcCAhPT0gJ29mZicpIHJldHVybiBlO1xuICAvLyAgICAgY29uc3QgY2h1bmsgPSB0aGlzLmNodW5rc1tjaGlsZC5udW0hXTtcbiAgLy8gICAgIGNvbnN0IGJhbmtzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIC8vICAgICBmb3IgKGNvbnN0IHMgb2YgY2h1bmsuc2VnbWVudHMpIHtcbiAgLy8gICAgICAgY29uc3Qgc2VnbWVudCA9IHRoaXMuc2VnbWVudHMuZ2V0KHMpO1xuICAvLyAgICAgICBpZiAoc2VnbWVudD8uYmFuayAhPSBudWxsKSBiYW5rcy5hZGQoc2VnbWVudC5iYW5rKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmIChiYW5rcy5zaXplICE9PSAxKSByZXR1cm4gZTtcbiAgLy8gICAgIGNvbnN0IFtiXSA9IGJhbmtzO1xuICAvLyAgICAgcmV0dXJuIHtvcDogJ251bScsIHNpemU6IDEsIG51bTogYn07XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyAgICAgaWYgKGV4cHIub3AgPT09ICdpbXBvcnQnKSB7XG4gIC8vICAgICAgIGlmICghZXhwci5zeW0pIHRocm93IG5ldyBFcnJvcihgSW1wb3J0IHdpdGggbm8gc3ltYm9sLmApO1xuICAvLyAgICAgICBjb25zdCBzeW0gPSB0aGlzLnN5bWJvbHNbdGhpcy5leHBvcnRzLmdldChleHByLnN5bSldO1xuICAvLyAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlSW1wb3J0cyhzeW0uZXhwcik7XG4gIC8vICAgICB9XG4gIC8vICAgICAvLyBUT0RPIC0gdGhpcyBpcyBub25zZW5zZS4uLlxuICAvLyAgICAgY29uc3QgYXJncyA9IFtdO1xuICAvLyAgICAgbGV0IG11dCA9IGZhbHNlO1xuICAvLyAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHByLmFyZ3M7IGkrKykge1xuICAvLyAgICAgICBjb25zdCBjaGlsZCA9IGV4cHIuYXJnc1tpXTtcbiAgLy8gICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVJbXBvcnRzKGNoaWxkKTtcbiAgLy8gICAgICAgYXJncy5wdXNoKHJlc29sdmVkKTtcbiAgLy8gICAgICAgaWYgKGNoaWxkICE9PSByZXNvbHZlZCkgZXhwci5hcmdzW2ldID0gcmVzb2x2ZWQ7XG4gIC8vICAgICAgIHJldHVybiBcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgLy8gVE9ETyAtIGFkZCBhbGwgdGhlIHRoaW5nc1xuICAvLyAgIHJldHVybiBwYXRjaDtcbiAgLy8gfVxuXG4gIGFkZFJhd1NlZ21lbnQoc2VnbWVudDogU2VnbWVudCkge1xuICAgIGxldCBsaXN0ID0gdGhpcy5yYXdTZWdtZW50cy5nZXQoc2VnbWVudC5uYW1lKTtcbiAgICBpZiAoIWxpc3QpIHRoaXMucmF3U2VnbWVudHMuc2V0KHNlZ21lbnQubmFtZSwgbGlzdCA9IFtdKTtcbiAgICBsaXN0LnB1c2goc2VnbWVudCk7XG4gIH1cblxuICBidWlsZEV4cG9ydHMoKTogTWFwPHN0cmluZywgRXhwb3J0PiB7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIEV4cG9ydD4oKTtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIGlmICghc3ltYm9sLmV4cG9ydCkgY29udGludWU7XG4gICAgICBjb25zdCBlID0gRXhwci50cmF2ZXJzZShzeW1ib2wuZXhwciEsIChlLCByZWMpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUxpbmsoRXhwci5ldmFsdWF0ZShyZWMoZSkpKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKGUub3AgIT09ICdudW0nKSB0aHJvdyBuZXcgRXJyb3IoYG5ldmVyIHJlc29sdmVkOiAke3N5bWJvbC5leHBvcnR9YCk7XG4gICAgICBjb25zdCB2YWx1ZSA9IGUubnVtITtcbiAgICAgIGNvbnN0IG91dDogRXhwb3J0ID0ge3ZhbHVlfTtcbiAgICAgIGlmIChlLm1ldGE/Lm9mZnNldCAhPSBudWxsICYmIGUubWV0YS5vcmcgIT0gbnVsbCkge1xuICAgICAgICBvdXQub2Zmc2V0ID0gZS5tZXRhLm9mZnNldCArIHZhbHVlIC0gZS5tZXRhLm9yZztcbiAgICAgIH1cbiAgICAgIGlmIChlLm1ldGE/LmJhbmsgIT0gbnVsbCkgb3V0LmJhbmsgPSBlLm1ldGEuYmFuaztcbiAgICAgIG1hcC5zZXQoc3ltYm9sLmV4cG9ydCwgb3V0KTtcbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHJlcG9ydCgpIHtcbiAgICBmb3IgKGNvbnN0IFtzLGVdIG9mIHRoaXMuZnJlZSkge1xuICAgICAgY29uc29sZS5sb2coYEZyZWU6ICR7cy50b1N0cmluZygxNil9Li4ke2UudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgfVxufVxuIl19