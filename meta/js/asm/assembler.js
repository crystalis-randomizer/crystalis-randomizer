import { Cpu } from './cpu.js';
import { Expr } from './expr.js';
import * as mod from './module.js';
import { Token } from './token.js';
import { Tokenizer } from './tokenizer.js';
import { assertNever } from '../util.js';
class Symbol {
}
class BaseScope {
    constructor() {
        this.symbols = new Map();
    }
    pickScope(name) {
        return [name, this];
    }
    resolve(name, allowForwardRef) {
        const [tail, scope] = this.pickScope(name);
        let sym = scope.symbols.get(tail);
        if (sym) {
            if (tail !== name)
                sym.scoped = true;
            return sym;
        }
        if (!allowForwardRef)
            return undefined;
        const symbol = {};
        scope.symbols.set(tail, symbol);
        if (tail !== name)
            symbol.scoped = true;
        return symbol;
    }
}
class Scope extends BaseScope {
    constructor(parent, kind) {
        super();
        this.parent = parent;
        this.kind = kind;
        this.children = new Map();
        this.anonymousChildren = [];
        this.global = parent ? parent.global : this;
    }
    pickScope(name) {
        let scope = this;
        const split = name.split(/::/g);
        const tail = split.pop();
        for (let i = 0; i < split.length; i++) {
            if (!i && !split[i]) {
                scope = scope.global;
                continue;
            }
            let child = scope.children.get(split[i]);
            while (!i && scope.parent && !child) {
                child = (scope = scope.parent).children.get(split[i]);
            }
            if (!child) {
                const scopeName = split.slice(0, i + 1).join('::');
                throw new Error(`Could not resolve scope ${scopeName}`);
            }
            scope = child;
        }
        return [tail, scope];
    }
}
class CheapScope extends BaseScope {
    clear() {
        for (const [name, sym] of this.symbols) {
            if (!sym.expr) {
                const at = sym.ref ? Token.at(sym.ref) : '';
                throw new Error(`Cheap local label never defined: ${name}${at}`);
            }
        }
        this.symbols.clear();
    }
}
export class Assembler {
    constructor(cpu = Cpu.P02, opts = {}) {
        this.cpu = cpu;
        this.opts = opts;
        this.segments = ['code'];
        this.segmentData = new Map();
        this.segmentStack = [];
        this.symbols = [];
        this.globals = new Map();
        this.currentScope = new Scope();
        this.cheapLocals = new CheapScope();
        this.anonymousForward = [];
        this.anonymousReverse = [];
        this.relativeForward = [];
        this.relativeReverse = [];
        this.chunks = [];
        this._chunk = undefined;
        this._name = undefined;
        this._org = undefined;
        this._segmentPrefix = '';
    }
    get chunk() {
        this.ensureChunk();
        return this._chunk;
    }
    ensureChunk() {
        if (!this._chunk) {
            this._chunk = { segments: this.segments, data: [] };
            if (this._org != null)
                this._chunk.org = this._org;
            if (this._name)
                this._chunk.name = this._name;
            this.chunks.push(this._chunk);
        }
    }
    definedSymbol(sym) {
        let scope = this.currentScope;
        const unscoped = !sym.includes('::');
        do {
            const s = scope.resolve(sym, false);
            if (s)
                return Boolean(s.expr);
        } while (unscoped && (scope = scope.parent));
        return false;
    }
    constantSymbol(sym) {
        const s = this.currentScope.resolve(sym, false);
        return Boolean(s && s.expr && !(s.id < 0));
    }
    referencedSymbol(sym) {
        const s = this.currentScope.resolve(sym, false);
        return s != null;
    }
    evaluate(expr) {
        var _a;
        expr = this.resolve(expr);
        if (expr.op === 'num' && !((_a = expr.meta) === null || _a === void 0 ? void 0 : _a.rel))
            return expr.num;
        return undefined;
    }
    pc() {
        var _a;
        const num = this.chunk.data.length;
        const meta = { rel: true, chunk: this.chunks.length - 1 };
        if (((_a = this._chunk) === null || _a === void 0 ? void 0 : _a.org) != null)
            meta.org = this._chunk.org;
        return Expr.evaluate({ op: 'num', num, meta });
    }
    resolve(expr) {
        return Expr.traverse(expr, (e, rec) => {
            while (e.op === 'sym' && e.sym) {
                e = this.resolveSymbol(e.sym);
            }
            return Expr.evaluate(rec(e));
        });
    }
    resolveSymbol(name) {
        if (name === '*') {
            return this.pc();
        }
        else if (/^:\++$/.test(name)) {
            const i = name.length - 2;
            let num = this.anonymousForward[i];
            if (num != null)
                return { op: 'sym', num };
            this.anonymousForward[i] = num = this.symbols.length;
            this.symbols.push({ id: num });
            return { op: 'sym', num };
        }
        else if (/^\++$/.test(name)) {
            let num = this.relativeForward[name.length - 1];
            if (num != null)
                return { op: 'sym', num };
            this.relativeForward[name.length - 1] = num = this.symbols.length;
            this.symbols.push({ id: num });
            return { op: 'sym', num };
        }
        else if (/^:-+$/.test(name)) {
            const i = this.anonymousReverse.length - name.length + 1;
            if (i < 0)
                this.fail(`Bad anonymous backref: ${name}`);
            return this.anonymousReverse[i];
        }
        else if (/^-+$/.test(name)) {
            const expr = this.relativeReverse[name.length - 1];
            if (expr == null)
                this.fail(`Bad relative backref: ${name}`);
            return expr;
        }
        const scope = name.startsWith('@') ? this.cheapLocals : this.currentScope;
        const sym = scope.resolve(name, true);
        if (sym.expr)
            return sym.expr;
        if (sym.id == null) {
            sym.id = this.symbols.length;
            this.symbols.push(sym);
        }
        return { op: 'sym', num: sym.id };
    }
    chunkData(chunk) {
        return { org: this.chunks[chunk].org };
    }
    closeScopes() {
        this.cheapLocals.clear();
        function close(scope) {
            for (const child of scope.children.values()) {
                close(child);
            }
            for (const child of scope.anonymousChildren) {
                close(child);
            }
            for (const [name, sym] of scope.symbols) {
                if (sym.expr || sym.id == null)
                    continue;
                if (scope.parent) {
                    if (sym.scoped)
                        throw new Error(`Symbol '${name}' undefined`);
                    const parentSym = scope.parent.symbols.get(name);
                    if (!parentSym) {
                        scope.parent.symbols.set(name, sym);
                    }
                    else if (parentSym.id != null) {
                        sym.expr = { op: 'sym', num: parentSym.id };
                    }
                    else if (parentSym.expr) {
                        sym.expr = parentSym.expr;
                    }
                    else {
                        throw new Error(`Impossible: ${name}`);
                    }
                }
            }
        }
        if (this.currentScope.parent) {
            throw new Error(`Scope never closed`);
        }
        close(this.currentScope);
        for (const [name, global] of this.globals) {
            const sym = this.currentScope.symbols.get(name);
            if (global === 'export') {
                if (!(sym === null || sym === void 0 ? void 0 : sym.expr))
                    throw new Error(`Symbol '${name}' undefined`);
                if (sym.id == null) {
                    sym.id = this.symbols.length;
                    this.symbols.push(sym);
                }
                sym.export = name;
            }
            else if (global === 'import') {
                if (!sym)
                    continue;
                if (sym.expr)
                    throw new Error(`Already defined: ${name}`);
                sym.expr = { op: 'im', sym: name };
            }
            else {
                assertNever(global);
            }
        }
        for (const [name, sym] of this.currentScope.symbols) {
            if (!sym.expr)
                throw new Error(`Symbol '${name}' undefined`);
        }
    }
    module() {
        this.closeScopes();
        const chunks = [];
        for (const chunk of this.chunks) {
            chunks.push({ ...chunk, data: Uint8Array.from(chunk.data) });
        }
        const symbols = [];
        for (const symbol of this.symbols) {
            if (symbol.expr == null)
                throw new Error(`Symbol undefined`);
            const out = { expr: symbol.expr };
            if (symbol.export != null)
                out.export = symbol.export;
            symbols.push(out);
        }
        const segments = [...this.segmentData.values()];
        return { chunks, symbols, segments };
    }
    line(tokens) {
        this._source = tokens[0].source;
        if (tokens.length < 3 && Token.eq(tokens[tokens.length - 1], Token.COLON)) {
            this.label(tokens[0]);
        }
        else if (Token.eq(tokens[1], Token.ASSIGN)) {
            this.assign(Token.str(tokens[0]), this.parseExpr(tokens, 2));
        }
        else if (Token.eq(tokens[1], Token.SET)) {
            this.set(Token.str(tokens[0]), this.parseExpr(tokens, 2));
        }
        else if (tokens[0].token === 'cs') {
            this.directive(tokens);
        }
        else {
            this.instruction(tokens);
        }
    }
    tokens(source) {
        let line;
        while ((line = source.next())) {
            this.line(line);
        }
    }
    async tokensAsync(source) {
        let line;
        while ((line = await source.nextAsync())) {
            this.line(line);
        }
    }
    directive(tokens) {
        switch (Token.str(tokens[0])) {
            case '.org': return this.org(this.parseConst(tokens));
            case '.reloc': return this.parseNoArgs(tokens), this.reloc();
            case '.assert': return this.assert(this.parseExpr(tokens));
            case '.segment': return this.segment(...this.parseSegmentList(tokens));
            case '.byte': return this.byte(...this.parseDataList(tokens, true));
            case '.res': return this.res(...this.parseResArgs(tokens));
            case '.word': return this.word(...this.parseDataList(tokens));
            case '.free': return this.free(this.parseConst(tokens), tokens[0]);
            case '.segmentprefix': return this.segmentPrefix(this.parseStr(tokens));
            case '.import': return this.import(...this.parseIdentifierList(tokens));
            case '.export': return this.export(...this.parseIdentifierList(tokens));
            case '.scope': return this.scope(this.parseOptionalIdentifier(tokens));
            case '.endscope': return this.parseNoArgs(tokens), this.endScope();
            case '.proc': return this.proc(this.parseRequiredIdentifier(tokens));
            case '.endproc': return this.parseNoArgs(tokens), this.endProc();
            case '.pushseg': return this.pushSeg(...this.parseSegmentList(tokens));
            case '.popseg': return this.parseNoArgs(tokens), this.popSeg();
            case '.move': return this.move(...this.parseMoveArgs(tokens));
        }
        this.fail(`Unknown directive: ${Token.nameAt(tokens[0])}`);
    }
    label(label) {
        let ident;
        let token;
        const expr = this.pc();
        if (typeof label === 'string') {
            ident = label;
        }
        else {
            ident = Token.str(token = label);
            if (label.source)
                expr.source = label.source;
        }
        if (ident === ':') {
            this.anonymousReverse.push(expr);
            const sym = this.anonymousForward.shift();
            if (sym != null)
                this.symbols[sym].expr = expr;
            return;
        }
        else if (/^\++$/.test(ident)) {
            const sym = this.relativeForward[ident.length - 1];
            delete this.relativeForward[ident.length - 1];
            if (sym != null)
                this.symbols[sym].expr = expr;
            return;
        }
        else if (/^-+$/.test(ident)) {
            this.relativeReverse[ident.length - 1] = expr;
            return;
        }
        if (!ident.startsWith('@')) {
            this.cheapLocals.clear();
            if (!this.chunk.name && !this.chunk.data.length)
                this.chunk.name = ident;
        }
        this.assignSymbol(ident, false, expr, token);
    }
    assign(ident, expr) {
        if (ident.startsWith('@')) {
            this.fail(`Cheap locals may only be labels: ${ident}`);
        }
        if (typeof expr !== 'number')
            expr = this.resolve(expr);
        this.assignSymbol(ident, false, expr);
    }
    set(ident, expr) {
        if (ident.startsWith('@')) {
            this.fail(`Cheap locals may only be labels: ${ident}`);
        }
        if (typeof expr !== 'number')
            expr = this.resolve(expr);
        this.assignSymbol(ident, true, expr);
    }
    assignSymbol(ident, mut, expr, token) {
        if (typeof expr === 'number')
            expr = { op: 'num', num: expr };
        const scope = ident.startsWith('@') ? this.cheapLocals : this.currentScope;
        let sym = scope.resolve(ident, !mut);
        if (sym && (mut !== (sym.id < 0))) {
            this.fail(`Cannot change mutability of ${ident}`, token);
        }
        else if (mut && expr.op != 'num') {
            this.fail(`Mutable set requires constant`, token);
        }
        else if (!sym) {
            if (!mut)
                throw new Error(`impossible`);
            scope.symbols.set(ident, sym = { id: -1 });
        }
        else if (!mut && sym.expr) {
            const orig = sym.expr.source ? `\nOriginally defined${Token.at(sym.expr)}` : '';
            const name = token ? Token.nameAt(token) :
                ident + (this._source ? Token.at({ source: this._source }) : '');
            throw new Error(`Redefining symbol ${name}${orig}`);
        }
        sym.expr = expr;
    }
    instruction(...args) {
        var _a;
        let mnemonic;
        let arg;
        if (args.length === 1 && Array.isArray(args[0])) {
            const tokens = args[0];
            mnemonic = Token.expectIdentifier(tokens[0]).toLowerCase();
            arg = this.parseArg(tokens);
        }
        else if (typeof args[1] === 'string') {
            mnemonic = args[0];
            const tokenizer = new Tokenizer(args[1]);
            arg = this.parseArg(tokenizer.next(), 0);
        }
        else {
            [mnemonic, arg] = args;
            if (!arg)
                arg = ['imp'];
            mnemonic = mnemonic.toLowerCase();
        }
        const ops = this.cpu.op(mnemonic);
        const m = arg[0];
        if (m === 'add' || m === 'a,x' || m === 'a,y') {
            const expr = arg[1];
            const s = ((_a = expr.meta) === null || _a === void 0 ? void 0 : _a.size) || 2;
            if (m === 'add' && s === 1 && 'zpg' in ops) {
                return this.opcode(ops.zpg, 1, expr);
            }
            else if (m === 'add' && 'abs' in ops) {
                return this.opcode(ops.abs, 2, expr);
            }
            else if (m === 'add' && 'rel' in ops) {
                return this.relative(ops.rel, 1, expr);
            }
            else if (m === 'a,x' && s === 1 && 'zpx' in ops) {
                return this.opcode(ops.zpx, 1, expr);
            }
            else if (m === 'a,x' && 'abx' in ops) {
                return this.opcode(ops.abx, 2, expr);
            }
            else if (m === 'a,y' && s === 1 && 'zpy' in ops) {
                return this.opcode(ops.zpy, 1, expr);
            }
            else if (m === 'a,y' && 'aby' in ops) {
                return this.opcode(ops.aby, 2, expr);
            }
            this.fail(`Bad address mode ${m} for ${mnemonic}`);
        }
        if (m in ops) {
            const argLen = this.cpu.argLen(m);
            if (m === 'rel')
                return this.relative(ops[m], argLen, arg[1]);
            return this.opcode(ops[m], argLen, arg[1]);
        }
        this.fail(`Bad address mode ${m} for ${mnemonic}`);
    }
    parseArg(tokens, start = 1) {
        if (tokens.length === start)
            return ['imp'];
        const front = tokens[start];
        const next = tokens[start + 1];
        if (tokens.length === start + 1) {
            if (Token.isRegister(front, 'a'))
                return ['acc'];
        }
        else if (Token.eq(front, Token.IMMEDIATE)) {
            return ['imm', Expr.parseOnly(tokens, start + 1)];
        }
        if (Token.eq(front, Token.COLON) && tokens.length === start + 2 &&
            next.token === 'op' && /^[-+]+$/.test(next.str)) {
            return ['add', { op: 'sym', sym: ':' + next.str }];
        }
        else if (tokens.length === start + 1 && front.token === 'op' &&
            /^[-+]+$/.test(front.str)) {
            return ['add', { op: 'sym', sym: front.str }];
        }
        if (Token.eq(front, Token.LP) ||
            (this.opts.allowBrackets && Token.eq(front, Token.LB))) {
            const close = Token.findBalanced(tokens, start);
            if (close < 0)
                this.fail(`Unbalanced ${Token.name(front)}`, front);
            const args = Token.parseArgList(tokens, start + 1, close);
            if (!args.length)
                this.fail(`Bad argument`, front);
            const expr = Expr.parseOnly(args[0]);
            if (args.length === 1) {
                if (Token.eq(tokens[close + 1], Token.COMMA) &&
                    Token.isRegister(tokens[close + 2], 'y')) {
                    Token.expectEol(tokens[close + 3]);
                    return ['iny', expr];
                }
                Token.expectEol(tokens[close + 1]);
                return ['ind', expr];
            }
            else if (args.length === 2 && args[1].length === 1) {
                if (Token.isRegister(args[1][0], 'x'))
                    return ['inx', expr];
            }
            this.fail(`Bad argument`, front);
        }
        const args = Token.parseArgList(tokens, start);
        if (!args.length)
            this.fail(`Bad arg`, front);
        const expr = Expr.parseOnly(args[0]);
        if (args.length === 1)
            return ['add', expr];
        if (args.length === 2 && args[1].length === 1) {
            if (Token.isRegister(args[1][0], 'x'))
                return ['a,x', expr];
            if (Token.isRegister(args[1][0], 'y'))
                return ['a,y', expr];
        }
        this.fail(`Bad arg`, front);
    }
    relative(op, arglen, expr) {
        var _a;
        const num = this.chunk.data.length + arglen + 1;
        const meta = { rel: true, chunk: this.chunks.length - 1 };
        if ((_a = this._chunk) === null || _a === void 0 ? void 0 : _a.org)
            meta.org = this._chunk.org;
        const nextPc = { op: 'num', num, meta };
        const rel = { op: '-', args: [expr, nextPc] };
        if (expr.source)
            rel.source = expr.source;
        this.opcode(op, arglen, rel);
    }
    opcode(op, arglen, expr) {
        if (arglen)
            expr = this.resolve(expr);
        const { chunk } = this;
        chunk.data.push(op);
        if (arglen)
            this.append(expr, arglen);
        if (!chunk.name)
            chunk.name = `Code`;
    }
    append(expr, size) {
        var _a;
        const { chunk } = this;
        expr = this.resolve(expr);
        let val = expr.num;
        if (expr.op !== 'num' || ((_a = expr.meta) === null || _a === void 0 ? void 0 : _a.rel)) {
            const offset = chunk.data.length;
            (chunk.subs || (chunk.subs = [])).push({ offset, size, expr });
            this.writeNumber(chunk.data, size);
        }
        else {
            this.writeNumber(chunk.data, size, val);
        }
    }
    org(addr, name) {
        this._org = addr;
        this._chunk = undefined;
        this._name = name;
    }
    reloc(name) {
        this._org = undefined;
        this._chunk = undefined;
        this._name = name;
    }
    segment(...segments) {
        this.segments = segments.map(s => typeof s === 'string' ? s : s.name);
        for (const s of segments) {
            if (typeof s === 'object') {
                const data = this.segmentData.get(s.name) || { name: s.name };
                this.segmentData.set(s.name, mod.Segment.merge(data, s));
            }
        }
        this._chunk = undefined;
        this._name = undefined;
    }
    assert(expr) {
        expr = this.resolve(expr);
        const val = this.evaluate(expr);
        if (val != null) {
            if (!val)
                this.fail(`Assertion failed`, expr);
        }
        else {
            const { chunk } = this;
            (chunk.asserts || (chunk.asserts = [])).push(expr);
        }
    }
    byte(...args) {
        const { chunk } = this;
        for (const arg of args) {
            if (typeof arg === 'number') {
                this.writeNumber(chunk.data, 1, arg);
            }
            else if (typeof arg === 'string') {
                writeString(chunk.data, arg);
            }
            else {
                this.append(arg, 1);
            }
        }
    }
    res(count, value) {
        if (!count)
            return;
        this.byte(...new Array(count).fill(value !== null && value !== void 0 ? value : 0));
    }
    word(...args) {
        const { chunk } = this;
        for (const arg of args) {
            if (typeof arg === 'number') {
                this.writeNumber(chunk.data, 2, arg);
            }
            else {
                this.append(arg, 2);
            }
        }
    }
    free(size, token) {
        if (this._org == null)
            this.fail(`.free in .reloc mode`, token);
        const segments = this.segments.length > 1 ? this.segments.filter(s => {
            const data = this.segmentData.get(s);
            if (!data || data.memory == null || data.size == null)
                return false;
            if (data.memory > this._org)
                return false;
            if (data.memory + data.size <= this._org)
                return false;
            return true;
        }) : this.segments;
        if (segments.length !== 1) {
            this.fail(`.free with non-unique segment: ${this.segments}`, token);
        }
        else if (size < 0) {
            this.fail(`.free with negative size: ${size}`, token);
        }
        if (this._chunk) {
            this._org += this._chunk.data.length;
        }
        this._chunk = undefined;
        const name = segments[0];
        let s = this.segmentData.get(name);
        if (!s)
            this.segmentData.set(name, s = { name });
        (s.free || (s.free = [])).push([this._org, this._org + size]);
        this._org += size;
    }
    segmentPrefix(prefix) {
        this._segmentPrefix = prefix;
    }
    import(...idents) {
        for (const ident of idents) {
            this.globals.set(ident, 'import');
        }
    }
    export(...idents) {
        for (const ident of idents) {
            this.globals.set(ident, 'export');
        }
    }
    scope(name) {
        this.enterScope(name, 'scope');
    }
    proc(name) {
        this.label(name);
        this.enterScope(name, 'proc');
    }
    enterScope(name, kind) {
        const existing = name ? this.currentScope.children.get(name) : undefined;
        if (existing) {
            if (this.opts.reentrantScopes) {
                this.currentScope = existing;
                return;
            }
            this.fail(`Cannot re-enter scope ${name}`);
        }
        const child = new Scope(this.currentScope, kind);
        if (name) {
            this.currentScope.children.set(name, child);
        }
        else {
            this.currentScope.anonymousChildren.push(child);
        }
        this.currentScope = child;
    }
    endScope() { this.exitScope('scope'); }
    endProc() { this.exitScope('proc'); }
    exitScope(kind) {
        if (this.currentScope.kind !== kind || !this.currentScope.parent) {
            this.fail(`.end${kind} without .${kind}`);
        }
        this.currentScope = this.currentScope.parent;
    }
    pushSeg(...segments) {
        this.segmentStack.push([this.segments, this._chunk]);
        this.segment(...segments);
    }
    popSeg() {
        if (!this.segmentStack.length)
            this.fail(`.popseg without .pushseg`);
        [this.segments, this._chunk] = this.segmentStack.pop();
    }
    move(size, source) {
        this.append({ op: '.move', args: [source], meta: { size } }, size);
    }
    parseConst(tokens, start = 1) {
        const val = this.evaluate(Expr.parseOnly(tokens, start));
        if (val != null)
            return val;
        this.fail(`Expression is not constant`, tokens[1]);
    }
    parseNoArgs(tokens, start = 1) {
        Token.expectEol(tokens[1]);
    }
    parseExpr(tokens, start = 1) {
        return Expr.parseOnly(tokens, start);
    }
    parseStr(tokens, start = 1) {
        const str = Token.expectString(tokens[start]);
        Token.expectEol(tokens[start + 1], "a single string");
        return str;
    }
    parseSegmentList(tokens, start = 1) {
        if (tokens.length < start + 1) {
            this.fail(`Expected a segment list`, tokens[start - 1]);
        }
        return Token.parseArgList(tokens, 1).map(ts => {
            const str = this._segmentPrefix + Token.expectString(ts[0]);
            if (ts.length === 1)
                return str;
            if (!Token.eq(ts[1], Token.COLON)) {
                this.fail(`Expected comma or colon: ${Token.name(ts[1])}`, ts[1]);
            }
            const seg = { name: str };
            const attrs = Token.parseAttrList(ts, 1);
            for (const [key, val] of attrs) {
                switch (key) {
                    case 'bank':
                        seg.bank = this.parseConst(val, 0);
                        break;
                    case 'size':
                        seg.size = this.parseConst(val, 0);
                        break;
                    case 'off':
                        seg.offset = this.parseConst(val, 0);
                        break;
                    case 'mem':
                        seg.memory = this.parseConst(val, 0);
                        break;
                    default: this.fail(`Unknown segment attr: ${key}`);
                }
            }
            return seg;
        });
    }
    parseResArgs(tokens) {
        const data = this.parseDataList(tokens);
        if (data.length > 2)
            this.fail(`Expected at most 2 args`, data[2]);
        if (!data.length)
            this.fail(`Expected at least 1 arg`);
        const count = this.evaluate(data[0]);
        if (count == null)
            this.fail(`Expected constant count`);
        const val = data[1] && this.evaluate(data[1]);
        if (data[1] && val == null)
            this.fail(`Expected constant value`);
        return [count, val];
    }
    parseDataList(tokens, allowString = false) {
        if (tokens.length < 2) {
            this.fail(`Expected a data list`, tokens[0]);
        }
        const out = [];
        for (const term of Token.parseArgList(tokens, 1)) {
            if (allowString && term.length === 1 && term[0].token === 'str') {
                out.push(term[0].str);
            }
            else {
                out.push(this.resolve(Expr.parseOnly(term)));
            }
        }
        return out;
    }
    parseIdentifierList(tokens) {
        if (tokens.length < 2) {
            this.fail(`Expected identifier(s)`, tokens[0]);
        }
        const out = [];
        for (const term of Token.parseArgList(tokens, 1)) {
            if (term.length !== 1 || term[0].token !== 'ident') {
                this.fail(`Expected identifier: ${Token.name(term[0])}`, term[0]);
            }
            out.push(Token.str(term[0]));
        }
        return out;
    }
    parseOptionalIdentifier(tokens) {
        const tok = tokens[1];
        if (!tok)
            return undefined;
        const ident = Token.expectIdentifier(tok);
        Token.expectEol(tokens[2]);
        return ident;
    }
    parseRequiredIdentifier(tokens) {
        const ident = Token.expectIdentifier(tokens[1]);
        Token.expectEol(tokens[2]);
        return ident;
    }
    parseMoveArgs(tokens) {
        var _a;
        const args = Token.parseArgList(tokens, 1);
        if (args.length !== 2) {
            this.fail(`Expected constant number, then identifier`);
        }
        const num = this.evaluate(Expr.parseOnly(args[0]));
        if (num == null)
            this.fail(`Expected a constant number`);
        const offset = this.resolve(Expr.parseOnly(args[1]));
        if (offset.op === 'num' && ((_a = offset.meta) === null || _a === void 0 ? void 0 : _a.chunk) != null) {
            return [num, offset];
        }
        else {
            this.fail(`Expected a constant offset`, args[1][0]);
        }
    }
    fail(msg, at) {
        var _a;
        if (at === null || at === void 0 ? void 0 : at.source)
            throw new Error(msg + Token.at(at));
        if (!this._source && ((_a = this._chunk) === null || _a === void 0 ? void 0 : _a.name)) {
            throw new Error(msg + `\n  in ${this._chunk.name}`);
        }
        throw new Error(msg + Token.at({ source: this._source }));
    }
    writeNumber(data, size, val) {
        const s = (size) << 3;
        if (val != null && (val < (-1 << s) || val >= (1 << s))) {
            const name = ['byte', 'word', 'farword', 'dword'][size - 1];
            this.fail(`Not a ${name}: $${val.toString(16)}`);
        }
        for (let i = 0; i < size; i++) {
            data.push(val != null ? val & 0xff : 0xff);
            if (val != null)
                val >>= 8;
        }
    }
}
function writeString(data, str) {
    for (let i = 0; i < str.length; i++) {
        data.push(str.charCodeAt(i));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZW1ibGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9hc3NlbWJsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QixPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBYSxLQUFLLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFDMUQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFLdkMsTUFBTSxNQUFNO0NBb0JYO0FBRUQsTUFBZSxTQUFTO0lBQXhCO1FBRVcsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBaUMvQyxDQUFDO0lBL0JXLFNBQVMsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsZUFBeUI7UUFDN0MsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLElBQUksR0FBRyxFQUFFO1lBQ1AsSUFBSSxJQUFJLEtBQUssSUFBSTtnQkFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNyQyxPQUFPLEdBQUcsQ0FBQztTQUNaO1FBQ0QsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQU12QyxNQUFNLE1BQU0sR0FBVyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLE9BQU8s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Q0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxXQUFXLENBQUMsSUFBYyxFQUFFLElBQVksRUFBRSxHQUFZO1FBSXBELE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZELE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbEQ7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsSUFBSSxHQUFHLElBQUksSUFBSTtnQkFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQzVCO0lBQ0gsQ0FBQztDQUNGO0FBRUQsU0FBUyxXQUFXLENBQUMsSUFBYyxFQUFFLEdBQVc7SUFFOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDOUI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDcHV9IGZyb20gJy4vY3B1LmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi9leHByLmpzJztcbmltcG9ydCAqIGFzIG1vZCBmcm9tICcuL21vZHVsZS5qcyc7XG5pbXBvcnQge1NvdXJjZUluZm8sIFRva2VuLCBUb2tlblNvdXJjZX0gZnJvbSAnLi90b2tlbi5qcyc7XG5pbXBvcnQge1Rva2VuaXplcn0gZnJvbSAnLi90b2tlbml6ZXIuanMnO1xuaW1wb3J0IHthc3NlcnROZXZlcn0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbnR5cGUgQ2h1bmsgPSBtb2QuQ2h1bms8bnVtYmVyW10+O1xudHlwZSBNb2R1bGUgPSBtb2QuTW9kdWxlO1xuXG5jbGFzcyBTeW1ib2wge1xuICAvKipcbiAgICogSW5kZXggaW50byB0aGUgZ2xvYmFsIHN5bWJvbCBhcnJheS4gIE9ubHkgYXBwbGllcyB0byBpbW11dGFibGVcbiAgICogc3ltYm9scyB0aGF0IG5lZWQgdG8gYmUgYWNjZXNzaWJsZSBhdCBsaW5rIHRpbWUuICBNdXRhYmxlIHN5bWJvbHNcbiAgICogYW5kIHN5bWJvbHMgd2l0aCBrbm93biB2YWx1ZXMgYXQgdXNlIHRpbWUgYXJlIG5vdCBhZGRlZCB0byB0aGVcbiAgICogZ2xvYmFsIGxpc3QgYW5kIGFyZSB0aGVyZWZvcmUgaGF2ZSBubyBpZC4gIE11dGFiaWxpdHkgaXMgdHJhY2tlZFxuICAgKiBieSBzdG9yaW5nIGEgLTEgaGVyZS5cbiAgICovXG4gIGlkPzogbnVtYmVyO1xuICAvKiogV2hldGhlciB0aGUgc3ltYm9sIGhhcyBiZWVuIGV4cGxpY2l0bHkgc2NvcGVkLiAqL1xuICBzY29wZWQ/OiBib29sZWFuO1xuICAvKipcbiAgICogVGhlIGV4cHJlc3Npb24gZm9yIHRoZSBzeW1ib2wuICBNdXN0IGJlIGEgc3RhdGljYWxseS1ldmFsdWF0YWJsZSBjb25zdGFudFxuICAgKiBmb3IgbXV0YWJsZSBzeW1ib2xzLiAgVW5kZWZpbmVkIGZvciBmb3J3YXJkLXJlZmVyZW5jZWQgc3ltYm9scy5cbiAgICovXG4gIGV4cHI/OiBFeHByO1xuICAvKiogTmFtZSB0aGlzIHN5bWJvbCBpcyBleHBvcnRlZCBhcy4gKi9cbiAgZXhwb3J0Pzogc3RyaW5nO1xuICAvKiogVG9rZW4gd2hlcmUgdGhpcyBzeW1ib2wgd2FzIHJlZidkLiAqL1xuICByZWY/OiB7c291cmNlPzogU291cmNlSW5mb307IC8vIFRPRE8gLSBwbHVtYiB0aGlzIHRocm91Z2hcbn1cblxuYWJzdHJhY3QgY2xhc3MgQmFzZVNjb3BlIHtcbiAgLy9jbG9zZWQgPSBmYWxzZTtcbiAgcmVhZG9ubHkgc3ltYm9scyA9IG5ldyBNYXA8c3RyaW5nLCBTeW1ib2w+KCk7XG5cbiAgcHJvdGVjdGVkIHBpY2tTY29wZShuYW1lOiBzdHJpbmcpOiBbc3RyaW5nLCBCYXNlU2NvcGVdIHtcbiAgICByZXR1cm4gW25hbWUsIHRoaXNdO1xuICB9XG5cbiAgLy8gVE9ETyAtIG1heSBuZWVkIGFkZGl0aW9uYWwgb3B0aW9uczpcbiAgLy8gICAtIGxvb2t1cCBjb25zdGFudCAtIHdvbid0IHJldHVybiBhIG11dGFibGUgdmFsdWUgb3IgYSB2YWx1ZSBmcm9tXG4gIC8vICAgICBhIHBhcmVudCBzY29wZSwgaW1wbGllcyBubyBmb3J3YXJkIHJlZlxuICAvLyAgIC0gc2hhbGxvdyAtIGRvbid0IHJlY3Vyc2UgdXAgdGhlIGNoYWluLCBmb3IgYXNzaWdubWVudCBvbmx5Pz9cbiAgLy8gTWlnaHQganVzdCBtZWFuIGFsbG93Rm9yd2FyZFJlZiBpcyBhY3R1YWxseSBqdXN0IGEgbW9kZSBzdHJpbmc/XG4gIC8vICAqIGNhNjUncyAuZGVmaW5lZHN5bWJvbCBpcyBtb3JlIHBlcm1pc3NpdmUgdGhhbiAuaWZjb25zdFxuICByZXNvbHZlKG5hbWU6IHN0cmluZywgYWxsb3dGb3J3YXJkUmVmOiB0cnVlKTogU3ltYm9sO1xuICByZXNvbHZlKG5hbWU6IHN0cmluZywgYWxsb3dGb3J3YXJkUmVmPzogYm9vbGVhbik6IFN5bWJvbHx1bmRlZmluZWQ7XG4gIHJlc29sdmUobmFtZTogc3RyaW5nLCBhbGxvd0ZvcndhcmRSZWY/OiBib29sZWFuKTogU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgW3RhaWwsIHNjb3BlXSA9IHRoaXMucGlja1Njb3BlKG5hbWUpO1xuICAgIGxldCBzeW0gPSBzY29wZS5zeW1ib2xzLmdldCh0YWlsKTtcbi8vY29uc29sZS5sb2coJ3Jlc29sdmU6JyxuYW1lLCdzeW09JyxzeW0sJ2Z3ZD8nLGFsbG93Rm9yd2FyZFJlZik7XG4gICAgaWYgKHN5bSkge1xuICAgICAgaWYgKHRhaWwgIT09IG5hbWUpIHN5bS5zY29wZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIHN5bTtcbiAgICB9XG4gICAgaWYgKCFhbGxvd0ZvcndhcmRSZWYpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgLy8gaWYgKHNjb3BlLmNsb3NlZCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSBzeW1ib2w6ICR7bmFtZX1gKTtcbiAgICAvLyBtYWtlIGEgbmV3IHN5bWJvbCAtIGJ1dCBvbmx5IGluIGFuIG9wZW4gc2NvcGVcbiAgICAvL2NvbnN0IHN5bWJvbCA9IHtpZDogdGhpcy5zeW1ib2xBcnJheS5sZW5ndGh9O1xuLy9jb25zb2xlLmxvZygnY3JlYXRlZDonLHN5bWJvbCk7XG4gICAgLy90aGlzLnN5bWJvbEFycmF5LnB1c2goc3ltYm9sKTtcbiAgICBjb25zdCBzeW1ib2w6IFN5bWJvbCA9IHt9O1xuICAgIHNjb3BlLnN5bWJvbHMuc2V0KHRhaWwsIHN5bWJvbCk7XG4gICAgaWYgKHRhaWwgIT09IG5hbWUpIHN5bWJvbC5zY29wZWQgPSB0cnVlO1xuICAgIHJldHVybiBzeW1ib2w7XG4gIH1cbn1cblxuY2xhc3MgU2NvcGUgZXh0ZW5kcyBCYXNlU2NvcGUge1xuICByZWFkb25seSBnbG9iYWw6IFNjb3BlO1xuICByZWFkb25seSBjaGlsZHJlbiA9IG5ldyBNYXA8c3RyaW5nLCBTY29wZT4oKTtcbiAgcmVhZG9ubHkgYW5vbnltb3VzQ2hpbGRyZW46IFNjb3BlW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBwYXJlbnQ/OiBTY29wZSwgcmVhZG9ubHkga2luZD86ICdzY29wZSd8J3Byb2MnKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmdsb2JhbCA9IHBhcmVudCA/IHBhcmVudC5nbG9iYWwgOiB0aGlzO1xuICB9XG5cbiAgcGlja1Njb3BlKG5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIFNjb3BlXSB7XG4gICAgLy8gVE9ETyAtIHBsdW1iIHRoZSBzb3VyY2UgaW5mb3JtYXRpb24gdGhyb3VnaCBoZXJlP1xuICAgIGxldCBzY29wZTogU2NvcGUgPSB0aGlzO1xuICAgIGNvbnN0IHNwbGl0ID0gbmFtZS5zcGxpdCgvOjovZyk7XG4gICAgY29uc3QgdGFpbCA9IHNwbGl0LnBvcCgpITtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwbGl0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWkgJiYgIXNwbGl0W2ldKSB7IC8vIGdsb2JhbFxuICAgICAgICBzY29wZSA9IHNjb3BlLmdsb2JhbDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBsZXQgY2hpbGQgPSBzY29wZS5jaGlsZHJlbi5nZXQoc3BsaXRbaV0pO1xuICAgICAgd2hpbGUgKCFpICYmIHNjb3BlLnBhcmVudCAmJiAhY2hpbGQpIHtcbiAgICAgICAgY2hpbGQgPSAoc2NvcGUgPSBzY29wZS5wYXJlbnQpLmNoaWxkcmVuLmdldChzcGxpdFtpXSk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgbmFtZSBoYXMgYW4gZXhwbGljaXQgc2NvcGUsIHRoaXMgaXMgYW4gZXJyb3I/XG4gICAgICBpZiAoIWNoaWxkKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlTmFtZSA9IHNwbGl0LnNsaWNlKDAsIGkgKyAxKS5qb2luKCc6OicpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIHNjb3BlICR7c2NvcGVOYW1lfWApO1xuICAgICAgfVxuICAgICAgc2NvcGUgPSBjaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIFt0YWlsLCBzY29wZV07XG4gIH1cblxuICAvLyBjbG9zZSgpIHtcbiAgLy8gICBpZiAoIXRoaXMucGFyZW50KSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBjbG9zZSBnbG9iYWwgc2NvcGVgKTtcbiAgLy8gICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gIC8vICAgLy8gQW55IHVuZGVmaW5lZCBpZGVudGlmaWVycyBpbiB0aGUgc2NvcGUgYXJlIGF1dG9tYXRpY2FsbHlcbiAgLy8gICAvLyBwcm9tb3RlZCB0byB0aGUgcGFyZW50IHNjb3BlLlxuICAvLyAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2YgdGhpcy5zeW1ib2xzKSB7XG4gIC8vICAgICBpZiAoc3ltLmV4cHIpIGNvbnRpbnVlOyAvLyBpZiBpdCdzIGRlZmluZWQgaW4gdGhlIHNjb3BlLCBkbyBub3RoaW5nXG4gIC8vICAgICBjb25zdCBwYXJlbnRTeW0gPSB0aGlzLnBhcmVudC5zeW1ib2xzLmdldChzeW0pO1xuICAvLyAgIH1cbiAgLy8gfVxufVxuXG5jbGFzcyBDaGVhcFNjb3BlIGV4dGVuZHMgQmFzZVNjb3BlIHtcblxuICAvKiogQ2xlYXIgZXZlcnl0aGluZyBvdXQsIG1ha2luZyBzdXJlIGV2ZXJ5dGhpbmcgd2FzIGRlZmluZWQuICovXG4gIGNsZWFyKCkge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2YgdGhpcy5zeW1ib2xzKSB7XG4gICAgICBpZiAoIXN5bS5leHByKSB7XG4gICAgICAgIGNvbnN0IGF0ID0gc3ltLnJlZiA/IFRva2VuLmF0KHN5bS5yZWYpIDogJyc7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2hlYXAgbG9jYWwgbGFiZWwgbmV2ZXIgZGVmaW5lZDogJHtuYW1lfSR7YXR9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuc3ltYm9scy5jbGVhcigpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBc3NlbWJsZXIge1xuXG4gIC8qKiBUaGUgY3VycmVudGx5LW9wZW4gc2VnbWVudChzKS4gKi9cbiAgcHJpdmF0ZSBzZWdtZW50czogcmVhZG9ubHkgc3RyaW5nW10gPSBbJ2NvZGUnXTtcblxuICAvKiogRGF0YSBvbiBhbGwgdGhlIHNlZ21lbnRzLiAqL1xuICBwcml2YXRlIHNlZ21lbnREYXRhID0gbmV3IE1hcDxzdHJpbmcsIG1vZC5TZWdtZW50PigpO1xuXG4gIC8qKiBTdGFjayBvZiBzZWdtZW50cyBmb3IgLnB1c2hzZWcvLnBvcHNlZy4gKi9cbiAgcHJpdmF0ZSBzZWdtZW50U3RhY2s6IEFycmF5PHJlYWRvbmx5IFtyZWFkb25seSBzdHJpbmdbXSwgQ2h1bms/XT4gPSBbXTtcblxuICAvKiogQWxsIHN5bWJvbHMgaW4gdGhpcyBvYmplY3QuICovXG4gIHByaXZhdGUgc3ltYm9sczogU3ltYm9sW10gPSBbXTtcblxuICAvKiogR2xvYmFsIHN5bWJvbHMuICovXG4gIC8vIE5PVEU6IHdlIGNvdWxkIGFkZCAnZm9yY2UtaW1wb3J0JywgJ2RldGVjdCcsIG9yIG90aGVycy4uLlxuICBwcml2YXRlIGdsb2JhbHMgPSBuZXcgTWFwPHN0cmluZywgJ2V4cG9ydCd8J2ltcG9ydCc+KCk7XG5cbiAgLyoqIFRoZSBjdXJyZW50IHNjb3BlLiAqL1xuICBwcml2YXRlIGN1cnJlbnRTY29wZSA9IG5ldyBTY29wZSgpO1xuXG4gIC8qKiBBIHNjb3BlIGZvciBjaGVhcCBsb2NhbCBsYWJlbHMuICovXG4gIHByaXZhdGUgY2hlYXBMb2NhbHMgPSBuZXcgQ2hlYXBTY29wZSgpO1xuXG4gIC8qKiBMaXN0IG9mIGdsb2JhbCBzeW1ib2wgaW5kaWNlcyB1c2VkIGJ5IGZvcndhcmQgcmVmcyB0byBhbm9ueW1vdXMgbGFiZWxzLiAqL1xuICBwcml2YXRlIGFub255bW91c0ZvcndhcmQ6IG51bWJlcltdID0gW107XG5cbiAgLyoqIExpc3Qgb2YgY2h1bmsvb2Zmc2V0IHBvc2l0aW9ucyBvZiBwcmV2aW91cyBhbm9ueW1vdXMgbGFiZWxzLiAqL1xuICBwcml2YXRlIGFub255bW91c1JldmVyc2U6IEV4cHJbXSA9IFtdO1xuXG4gIC8qKiBNYXAgb2YgZ2xvYmFsIHN5bWJvbCBpbmNpZGVzIHVzZWQgYnkgZm9yd2FyZCByZWZzIHRvIHJlbGF0aXZlIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSByZWxhdGl2ZUZvcndhcmQ6IG51bWJlcltdID0gW107XG5cbiAgLyoqIE1hcCBvZiBjaHVuay9vZmZzZXQgcG9zaXRpb25zIG9mIGJhY2stcmVmZXJhYmxlIHJlbGF0aXZlIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSByZWxhdGl2ZVJldmVyc2U6IEV4cHJbXSA9IFtdO1xuXG4gIC8qKiBBbGwgdGhlIGNodW5rcyBzbyBmYXIuICovXG4gIHByaXZhdGUgY2h1bmtzOiBDaHVua1tdID0gW107XG5cbiAgLyoqIEN1cnJlbnRseSBhY3RpdmUgY2h1bmsgKi9cbiAgcHJpdmF0ZSBfY2h1bms6IENodW5rfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvKiogTmFtZSBvZiB0aGUgbmV4dCBjaHVuayAqL1xuICBwcml2YXRlIF9uYW1lOiBzdHJpbmd8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKiBPcmlnaW4gb2YgdGhlIGN1cnJuZXQgY2h1bmssIGlmIGZpeGVkLiAqL1xuICBwcml2YXRlIF9vcmc6IG51bWJlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLyoqIFByZWZpeCB0byBwcmVwZW5kIHRvIGFsbCBzZWdtZW50IG5hbWVzLiAqL1xuICBwcml2YXRlIF9zZWdtZW50UHJlZml4ID0gJyc7XG5cbiAgLyoqIEN1cnJlbnQgc291cmNlIGxvY2F0aW9uLCBmb3IgZXJyb3IgbWVzc2FnZXMuICovXG4gIHByaXZhdGUgX3NvdXJjZT86IFNvdXJjZUluZm87XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgY3B1ID0gQ3B1LlAwMiwgcmVhZG9ubHkgb3B0czogQXNzZW1ibGVyLk9wdGlvbnMgPSB7fSkge31cblxuICBwcml2YXRlIGdldCBjaHVuaygpOiBDaHVuayB7XG4gICAgLy8gbWFrZSBjaHVuayBvbmx5IHdoZW4gbmVlZGVkXG4gICAgdGhpcy5lbnN1cmVDaHVuaygpO1xuICAgIHJldHVybiB0aGlzLl9jaHVuayE7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNodW5rKCkge1xuICAgIGlmICghdGhpcy5fY2h1bmspIHtcbiAgICAgIC8vIE5PVEU6IG11bHRpcGxlIHNlZ21lbnRzIE9LIGlmIGRpc2pvaW50IG1lbW9yeS4uLlxuICAgICAgLy8gaWYgKHRoaXMuX29yZyAhPSBudWxsICYmIHRoaXMuc2VnbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAvLyAgIHRoaXMuZmFpbChgLm9yZyBjaHVua3MgbXVzdCBiZSBzaW5nbGUtc2VnbWVudGApO1xuICAgICAgLy8gfVxuICAgICAgdGhpcy5fY2h1bmsgPSB7c2VnbWVudHM6IHRoaXMuc2VnbWVudHMsIGRhdGE6IFtdfTtcbiAgICAgIGlmICh0aGlzLl9vcmcgIT0gbnVsbCkgdGhpcy5fY2h1bmsub3JnID0gdGhpcy5fb3JnO1xuICAgICAgaWYgKHRoaXMuX25hbWUpIHRoaXMuX2NodW5rLm5hbWUgPSB0aGlzLl9uYW1lO1xuICAgICAgdGhpcy5jaHVua3MucHVzaCh0aGlzLl9jaHVuayk7XG4gICAgfVxuICB9XG5cbiAgZGVmaW5lZFN5bWJvbChzeW06IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIEluIHRoaXMgY2FzZSwgaXQncyBva2F5IHRvIHRyYXZlcnNlIHVwIHRoZSBzY29wZSBjaGFpbiBzaW5jZSBpZiB3ZVxuICAgIC8vIHdlcmUgdG8gcmVmZXJlbmNlIHRoZSBzeW1ib2wsIGl0J3MgZ3VhcmFudGVlZCB0byBiZSBkZWZpbmVkIHNvbWVob3cuXG4gICAgbGV0IHNjb3BlOiBTY29wZXx1bmRlZmluZWQgPSB0aGlzLmN1cnJlbnRTY29wZTtcbiAgICBjb25zdCB1bnNjb3BlZCA9ICFzeW0uaW5jbHVkZXMoJzo6Jyk7XG4gICAgZG8ge1xuICAgICAgY29uc3QgcyA9IHNjb3BlLnJlc29sdmUoc3ltLCBmYWxzZSk7XG4gICAgICBpZiAocykgcmV0dXJuIEJvb2xlYW4ocy5leHByKTtcbiAgICB9IHdoaWxlICh1bnNjb3BlZCAmJiAoc2NvcGUgPSBzY29wZS5wYXJlbnQpKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdGFudFN5bWJvbChzeW06IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIElmIHRoZXJlJ3MgYSBzeW1ib2wgaW4gYSBkaWZmZXJlbnQgc2NvcGUsIGl0J3Mgbm90IGFjdHVhbGx5IGNvbnN0YW50LlxuICAgIGNvbnN0IHMgPSB0aGlzLmN1cnJlbnRTY29wZS5yZXNvbHZlKHN5bSwgZmFsc2UpO1xuICAgIHJldHVybiBCb29sZWFuKHMgJiYgcy5leHByICYmICEocy5pZCEgPCAwKSk7XG4gIH1cblxuICByZWZlcmVuY2VkU3ltYm9sKHN5bTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gSWYgbm90IHJlZmVyZW5jZWQgaW4gdGhpcyBzY29wZSwgd2UgZG9uJ3Qga25vdyB3aGljaCBpdCBpcy4uLlxuICAgIC8vIE5PVEU6IHRoaXMgaXMgZGlmZmVyZW50IGZyb20gY2E2NS5cbiAgICBjb25zdCBzID0gdGhpcy5jdXJyZW50U2NvcGUucmVzb2x2ZShzeW0sIGZhbHNlKTtcbiAgICByZXR1cm4gcyAhPSBudWxsOyAvLyBOT1RFOiB0aGlzIGNvdW50cyBkZWZpbml0aW9ucy5cbiAgfVxuXG4gIGV2YWx1YXRlKGV4cHI6IEV4cHIpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgICBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpO1xuICAgIGlmIChleHByLm9wID09PSAnbnVtJyAmJiAhZXhwci5tZXRhPy5yZWwpIHJldHVybiBleHByLm51bTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLy8gcHJpdmF0ZSBnZXQgcGMoKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gIC8vICAgaWYgKHRoaXMuX29yZyA9PSBudWxsKSByZXR1cm4gdW5kZWZpbmVkO1xuICAvLyAgIHJldHVybiB0aGlzLl9vcmcgKyB0aGlzLm9mZnNldDtcbiAgLy8gfVxuXG4gIHBjKCk6IEV4cHIge1xuICAgIGNvbnN0IG51bSA9IHRoaXMuY2h1bmsuZGF0YS5sZW5ndGg7IC8vIE5PVEU6IGJlZm9yZSBjb3VudGluZyBjaHVua3NcbiAgICBjb25zdCBtZXRhOiBFeHByLk1ldGEgPSB7cmVsOiB0cnVlLCBjaHVuazogdGhpcy5jaHVua3MubGVuZ3RoIC0gMX07XG4gICAgaWYgKHRoaXMuX2NodW5rPy5vcmcgIT0gbnVsbCkgbWV0YS5vcmcgPSB0aGlzLl9jaHVuay5vcmc7XG4gICAgcmV0dXJuIEV4cHIuZXZhbHVhdGUoe29wOiAnbnVtJywgbnVtLCBtZXRhfSk7XG4gIH1cblxuICByZXNvbHZlKGV4cHI6IEV4cHIpOiBFeHByIHtcbiAgICByZXR1cm4gRXhwci50cmF2ZXJzZShleHByLCAoZSwgcmVjKSA9PiB7XG4gICAgICB3aGlsZSAoZS5vcCA9PT0gJ3N5bScgJiYgZS5zeW0pIHtcbiAgICAgICAgZSA9IHRoaXMucmVzb2x2ZVN5bWJvbChlLnN5bSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gRXhwci5ldmFsdWF0ZShyZWMoZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgcmVzb2x2ZVN5bWJvbChuYW1lOiBzdHJpbmcpOiBFeHByIHtcbiAgICBpZiAobmFtZSA9PT0gJyonKSB7XG4gICAgICByZXR1cm4gdGhpcy5wYygpO1xuICAgIH0gZWxzZSBpZiAoL146XFwrKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIGFub255bW91cyBmb3J3YXJkIHJlZlxuICAgICAgY29uc3QgaSA9IG5hbWUubGVuZ3RoIC0gMjtcbiAgICAgIGxldCBudW0gPSB0aGlzLmFub255bW91c0ZvcndhcmRbaV07XG4gICAgICBpZiAobnVtICE9IG51bGwpIHJldHVybiB7b3A6ICdzeW0nLCBudW19O1xuICAgICAgdGhpcy5hbm9ueW1vdXNGb3J3YXJkW2ldID0gbnVtID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAgIHRoaXMuc3ltYm9scy5wdXNoKHtpZDogbnVtfSk7XG4gICAgICByZXR1cm4ge29wOiAnc3ltJywgbnVtfTtcbiAgICB9IGVsc2UgaWYgKC9eXFwrKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGZvcndhcmQgcmVmXG4gICAgICBsZXQgbnVtID0gdGhpcy5yZWxhdGl2ZUZvcndhcmRbbmFtZS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChudW0gIT0gbnVsbCkgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgICB0aGlzLnJlbGF0aXZlRm9yd2FyZFtuYW1lLmxlbmd0aCAtIDFdID0gbnVtID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAgIHRoaXMuc3ltYm9scy5wdXNoKHtpZDogbnVtfSk7XG4gICAgICByZXR1cm4ge29wOiAnc3ltJywgbnVtfTtcbiAgICB9IGVsc2UgaWYgKC9eOi0rJC8udGVzdChuYW1lKSkge1xuICAgICAgLy8gYW5vbnltb3VzIGJhY2sgcmVmXG4gICAgICBjb25zdCBpID0gdGhpcy5hbm9ueW1vdXNSZXZlcnNlLmxlbmd0aCAtIG5hbWUubGVuZ3RoICsgMTtcbiAgICAgIGlmIChpIDwgMCkgdGhpcy5mYWlsKGBCYWQgYW5vbnltb3VzIGJhY2tyZWY6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiB0aGlzLmFub255bW91c1JldmVyc2VbaV07XG4gICAgfSBlbHNlIGlmICgvXi0rJC8udGVzdChuYW1lKSkge1xuICAgICAgLy8gcmVsYXRpdmUgYmFjayByZWZcbiAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnJlbGF0aXZlUmV2ZXJzZVtuYW1lLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGV4cHIgPT0gbnVsbCkgdGhpcy5mYWlsKGBCYWQgcmVsYXRpdmUgYmFja3JlZjogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuICAgIGNvbnN0IHNjb3BlID0gbmFtZS5zdGFydHNXaXRoKCdAJykgPyB0aGlzLmNoZWFwTG9jYWxzIDogdGhpcy5jdXJyZW50U2NvcGU7XG4gICAgY29uc3Qgc3ltID0gc2NvcGUucmVzb2x2ZShuYW1lLCB0cnVlKTtcbiAgICBpZiAoc3ltLmV4cHIpIHJldHVybiBzeW0uZXhwcjtcbiAgICAvLyBpZiB0aGUgZXhwcmVzc2lvbiBpcyBub3QgeWV0IGtub3duIHRoZW4gcmVmZXIgdG8gdGhlIHN5bWJvbCB0YWJsZSxcbiAgICAvLyBhZGRpbmcgaXQgaWYgbmVjZXNzYXJ5LlxuICAgIGlmIChzeW0uaWQgPT0gbnVsbCkge1xuICAgICAgc3ltLmlkID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAgIHRoaXMuc3ltYm9scy5wdXNoKHN5bSk7XG4gICAgfVxuICAgIHJldHVybiB7b3A6ICdzeW0nLCBudW06IHN5bS5pZH07XG4gIH1cblxuICAvLyBObyBiYW5rcyBhcmUgcmVzb2x2ZWQgeWV0LlxuICBjaHVua0RhdGEoY2h1bms6IG51bWJlcik6IHtvcmc/OiBudW1iZXJ9IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIHpwIHNlZ21lbnRzP1xuICAgIHJldHVybiB7b3JnOiB0aGlzLmNodW5rc1tjaHVua10ub3JnfTtcbiAgfVxuXG4gIGNsb3NlU2NvcGVzKCkge1xuICAgIHRoaXMuY2hlYXBMb2NhbHMuY2xlYXIoKTtcbiAgICAvLyBOZWVkIHRvIGZpbmQgYW55IHVuZGVjbGFyZWQgc3ltYm9scyBpbiBuZXN0ZWQgc2NvcGVzIGFuZCBsaW5rXG4gICAgLy8gdGhlbSB0byBhIHBhcmVudCBzY29wZSBzeW1ib2wgaWYgcG9zc2libGUuXG4gICAgZnVuY3Rpb24gY2xvc2Uoc2NvcGU6IFNjb3BlKSB7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHNjb3BlLmNoaWxkcmVuLnZhbHVlcygpKSB7XG4gICAgICAgIGNsb3NlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygc2NvcGUuYW5vbnltb3VzQ2hpbGRyZW4pIHtcbiAgICAgICAgY2xvc2UoY2hpbGQpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBbbmFtZSwgc3ltXSBvZiBzY29wZS5zeW1ib2xzKSB7XG4gICAgICAgIGlmIChzeW0uZXhwciB8fCBzeW0uaWQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGlmIChzY29wZS5wYXJlbnQpIHtcbiAgICAgICAgICAvLyBUT0RPIC0gcmVjb3JkIHdoZXJlIGl0IHdhcyByZWZlcmVuY2VkP1xuICAgICAgICAgIGlmIChzeW0uc2NvcGVkKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCAnJHtuYW1lfScgdW5kZWZpbmVkYCk7XG4gICAgICAgICAgY29uc3QgcGFyZW50U3ltID0gc2NvcGUucGFyZW50LnN5bWJvbHMuZ2V0KG5hbWUpO1xuICAgICAgICAgIGlmICghcGFyZW50U3ltKSB7XG4gICAgICAgICAgICAvLyBqdXN0IGFsaWFzIGl0IGRpcmVjdGx5IGluIHRoZSBwYXJlbnQgc2NvcGVcbiAgICAgICAgICAgIHNjb3BlLnBhcmVudC5zeW1ib2xzLnNldChuYW1lLCBzeW0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAocGFyZW50U3ltLmlkICE9IG51bGwpIHtcbiAgICAgICAgICAgIHN5bS5leHByID0ge29wOiAnc3ltJywgbnVtOiBwYXJlbnRTeW0uaWR9O1xuICAgICAgICAgIH0gZWxzZSBpZiAocGFyZW50U3ltLmV4cHIpIHtcbiAgICAgICAgICAgIHN5bS5leHByID0gcGFyZW50U3ltLmV4cHI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG11c3QgaGF2ZSBlaXRoZXIgaWQgb3IgZXhwci4uLj9cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZTogJHtuYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBoYW5kbGUgZ2xvYmFsIHNjb3BlIHNlcGFyYXRlbHkuLi5cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB0ZXN0IGNhc2U6IHJlZiBhIG5hbWUgaW4gdHdvIGNoaWxkIHNjb3BlcywgZGVmaW5lIGl0IGluIGdyYW5kcGFyZW50XG5cbiAgICBpZiAodGhpcy5jdXJyZW50U2NvcGUucGFyZW50KSB7XG4gICAgICAvLyBUT0RPIC0gcmVjb3JkIHdoZXJlIGl0IHdhcyBvcGVuZWQ/XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNjb3BlIG5ldmVyIGNsb3NlZGApO1xuICAgIH1cbiAgICBjbG9zZSh0aGlzLmN1cnJlbnRTY29wZSk7XG5cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBnbG9iYWxdIG9mIHRoaXMuZ2xvYmFscykge1xuICAgICAgY29uc3Qgc3ltID0gdGhpcy5jdXJyZW50U2NvcGUuc3ltYm9scy5nZXQobmFtZSk7XG4gICAgICBpZiAoZ2xvYmFsID09PSAnZXhwb3J0Jykge1xuICAgICAgICBpZiAoIXN5bT8uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgICAgICBpZiAoc3ltLmlkID09IG51bGwpIHtcbiAgICAgICAgICBzeW0uaWQgPSB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICAgICAgICAgIHRoaXMuc3ltYm9scy5wdXNoKHN5bSk7XG4gICAgICAgIH1cbiAgICAgICAgc3ltLmV4cG9ydCA9IG5hbWU7XG4gICAgICB9IGVsc2UgaWYgKGdsb2JhbCA9PT0gJ2ltcG9ydCcpIHtcbiAgICAgICAgaWYgKCFzeW0pIGNvbnRpbnVlOyAvLyBva2F5IHRvIGltcG9ydCBidXQgbm90IHVzZS5cbiAgICAgICAgLy8gVE9ETyAtIHJlY29yZCBib3RoIHBvc2l0aW9ucz9cbiAgICAgICAgaWYgKHN5bS5leHByKSB0aHJvdyBuZXcgRXJyb3IoYEFscmVhZHkgZGVmaW5lZDogJHtuYW1lfWApO1xuICAgICAgICBzeW0uZXhwciA9IHtvcDogJ2ltJywgc3ltOiBuYW1lfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFzc2VydE5ldmVyKGdsb2JhbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgc3ltXSBvZiB0aGlzLmN1cnJlbnRTY29wZS5zeW1ib2xzKSB7XG4gICAgICBpZiAoIXN5bS5leHByKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCAnJHtuYW1lfScgdW5kZWZpbmVkYCk7XG4gICAgfVxuICB9XG5cbiAgbW9kdWxlKCk6IE1vZHVsZSB7XG4gICAgdGhpcy5jbG9zZVNjb3BlcygpO1xuXG4gICAgLy8gVE9ETyAtIGhhbmRsZSBpbXBvcnRzIGFuZCBleHBvcnRzIG91dCBvZiB0aGUgc2NvcGVcbiAgICAvLyBUT0RPIC0gYWRkIC5zY29wZSBhbmQgLmVuZHNjb3BlIGFuZCBmb3J3YXJkIHNjb3BlIHZhcnMgYXQgZW5kIHRvIHBhcmVudFxuXG4gICAgLy8gUHJvY2VzcyBhbmQgd3JpdGUgdGhlIGRhdGFcbiAgICBjb25zdCBjaHVua3M6IG1vZC5DaHVuazxVaW50OEFycmF5PltdID0gW107XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiB0aGlzLmNodW5rcykge1xuICAgICAgY2h1bmtzLnB1c2goey4uLmNodW5rLCBkYXRhOiBVaW50OEFycmF5LmZyb20oY2h1bmsuZGF0YSl9KTtcbiAgICB9XG4gICAgY29uc3Qgc3ltYm9sczogbW9kLlN5bWJvbFtdID0gW107XG4gICAgZm9yIChjb25zdCBzeW1ib2wgb2YgdGhpcy5zeW1ib2xzKSB7XG4gICAgICBpZiAoc3ltYm9sLmV4cHIgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgdW5kZWZpbmVkYCk7XG4gICAgICBjb25zdCBvdXQ6IG1vZC5TeW1ib2wgPSB7ZXhwcjogc3ltYm9sLmV4cHJ9O1xuICAgICAgaWYgKHN5bWJvbC5leHBvcnQgIT0gbnVsbCkgb3V0LmV4cG9ydCA9IHN5bWJvbC5leHBvcnQ7XG4gICAgICBzeW1ib2xzLnB1c2gob3V0KTtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudHM6IG1vZC5TZWdtZW50W10gPSBbLi4udGhpcy5zZWdtZW50RGF0YS52YWx1ZXMoKV07XG4gICAgcmV0dXJuIHtjaHVua3MsIHN5bWJvbHMsIHNlZ21lbnRzfTtcbiAgfVxuXG4gIGxpbmUodG9rZW5zOiBUb2tlbltdKSB7XG4gICAgdGhpcy5fc291cmNlID0gdG9rZW5zWzBdLnNvdXJjZTtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IDMgJiYgVG9rZW4uZXEodG9rZW5zW3Rva2Vucy5sZW5ndGggLSAxXSwgVG9rZW4uQ09MT04pKSB7XG4gICAgICB0aGlzLmxhYmVsKHRva2Vuc1swXSk7XG4gICAgfSBlbHNlIGlmIChUb2tlbi5lcSh0b2tlbnNbMV0sIFRva2VuLkFTU0lHTikpIHtcbiAgICAgIHRoaXMuYXNzaWduKFRva2VuLnN0cih0b2tlbnNbMF0pLCB0aGlzLnBhcnNlRXhwcih0b2tlbnMsIDIpKTtcbiAgICB9IGVsc2UgaWYgKFRva2VuLmVxKHRva2Vuc1sxXSwgVG9rZW4uU0VUKSkge1xuICAgICAgdGhpcy5zZXQoVG9rZW4uc3RyKHRva2Vuc1swXSksIHRoaXMucGFyc2VFeHByKHRva2VucywgMikpO1xuICAgIH0gZWxzZSBpZiAodG9rZW5zWzBdLnRva2VuID09PSAnY3MnKSB7XG4gICAgICB0aGlzLmRpcmVjdGl2ZSh0b2tlbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluc3RydWN0aW9uKHRva2Vucyk7XG4gICAgfVxuICB9XG5cbiAgdG9rZW5zKHNvdXJjZTogVG9rZW5Tb3VyY2UpIHtcbiAgICBsZXQgbGluZTtcbiAgICB3aGlsZSAoKGxpbmUgPSBzb3VyY2UubmV4dCgpKSkge1xuICAgICAgdGhpcy5saW5lKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHRva2Vuc0FzeW5jKHNvdXJjZTogVG9rZW5Tb3VyY2UuQXN5bmMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsZXQgbGluZTtcbiAgICB3aGlsZSAoKGxpbmUgPSBhd2FpdCBzb3VyY2UubmV4dEFzeW5jKCkpKSB7XG4gICAgICB0aGlzLmxpbmUobGluZSk7XG4gICAgfVxuICB9XG5cblxuICBkaXJlY3RpdmUodG9rZW5zOiBUb2tlbltdKSB7XG4gICAgLy8gVE9ETyAtIHJlY29yZCBsaW5lIGluZm9ybWF0aW9uLCByZXdyYXAgZXJyb3IgbWVzc2FnZXM/XG4gICAgc3dpdGNoIChUb2tlbi5zdHIodG9rZW5zWzBdKSkge1xuICAgICAgY2FzZSAnLm9yZyc6IHJldHVybiB0aGlzLm9yZyh0aGlzLnBhcnNlQ29uc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcucmVsb2MnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLnJlbG9jKCk7XG4gICAgICBjYXNlICcuYXNzZXJ0JzogcmV0dXJuIHRoaXMuYXNzZXJ0KHRoaXMucGFyc2VFeHByKHRva2VucykpO1xuICAgICAgY2FzZSAnLnNlZ21lbnQnOiByZXR1cm4gdGhpcy5zZWdtZW50KC4uLnRoaXMucGFyc2VTZWdtZW50TGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5ieXRlJzogcmV0dXJuIHRoaXMuYnl0ZSguLi50aGlzLnBhcnNlRGF0YUxpc3QodG9rZW5zLCB0cnVlKSk7XG4gICAgICBjYXNlICcucmVzJzogcmV0dXJuIHRoaXMucmVzKC4uLnRoaXMucGFyc2VSZXNBcmdzKHRva2VucykpO1xuICAgICAgY2FzZSAnLndvcmQnOiByZXR1cm4gdGhpcy53b3JkKC4uLnRoaXMucGFyc2VEYXRhTGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5mcmVlJzogcmV0dXJuIHRoaXMuZnJlZSh0aGlzLnBhcnNlQ29uc3QodG9rZW5zKSwgdG9rZW5zWzBdKTtcbiAgICAgIGNhc2UgJy5zZWdtZW50cHJlZml4JzogcmV0dXJuIHRoaXMuc2VnbWVudFByZWZpeCh0aGlzLnBhcnNlU3RyKHRva2VucykpO1xuICAgICAgY2FzZSAnLmltcG9ydCc6IHJldHVybiB0aGlzLmltcG9ydCguLi50aGlzLnBhcnNlSWRlbnRpZmllckxpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZXhwb3J0JzogcmV0dXJuIHRoaXMuZXhwb3J0KC4uLnRoaXMucGFyc2VJZGVudGlmaWVyTGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5zY29wZSc6IHJldHVybiB0aGlzLnNjb3BlKHRoaXMucGFyc2VPcHRpb25hbElkZW50aWZpZXIodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZW5kc2NvcGUnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLmVuZFNjb3BlKCk7XG4gICAgICBjYXNlICcucHJvYyc6IHJldHVybiB0aGlzLnByb2ModGhpcy5wYXJzZVJlcXVpcmVkSWRlbnRpZmllcih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5lbmRwcm9jJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5lbmRQcm9jKCk7XG4gICAgICBjYXNlICcucHVzaHNlZyc6IHJldHVybiB0aGlzLnB1c2hTZWcoLi4udGhpcy5wYXJzZVNlZ21lbnRMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLnBvcHNlZyc6IHJldHVybiB0aGlzLnBhcnNlTm9BcmdzKHRva2VucyksIHRoaXMucG9wU2VnKCk7XG4gICAgICBjYXNlICcubW92ZSc6IHJldHVybiB0aGlzLm1vdmUoLi4udGhpcy5wYXJzZU1vdmVBcmdzKHRva2VucykpO1xuICAgIH1cbiAgICB0aGlzLmZhaWwoYFVua25vd24gZGlyZWN0aXZlOiAke1Rva2VuLm5hbWVBdCh0b2tlbnNbMF0pfWApO1xuICB9XG5cbiAgbGFiZWwobGFiZWw6IHN0cmluZ3xUb2tlbikge1xuICAgIGxldCBpZGVudDogc3RyaW5nO1xuICAgIGxldCB0b2tlbjogVG9rZW58dW5kZWZpbmVkO1xuICAgIGNvbnN0IGV4cHIgPSB0aGlzLnBjKCk7XG4gICAgaWYgKHR5cGVvZiBsYWJlbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlkZW50ID0gbGFiZWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkZW50ID0gVG9rZW4uc3RyKHRva2VuID0gbGFiZWwpO1xuICAgICAgaWYgKGxhYmVsLnNvdXJjZSkgZXhwci5zb3VyY2UgPSBsYWJlbC5zb3VyY2U7XG4gICAgfVxuICAgIGlmIChpZGVudCA9PT0gJzonKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgbGFiZWwgLSBzaGlmdCBhbnkgZm9yd2FyZCByZWZzIG9mZiwgYW5kIHB1c2ggb250byB0aGUgYmFja3MuXG4gICAgICB0aGlzLmFub255bW91c1JldmVyc2UucHVzaChleHByKTtcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMuYW5vbnltb3VzRm9yd2FyZC5zaGlmdCgpO1xuICAgICAgaWYgKHN5bSAhPSBudWxsKSB0aGlzLnN5bWJvbHNbc3ltXS5leHByID0gZXhwcjtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKC9eXFwrKyQvLnRlc3QoaWRlbnQpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBmb3J3YXJkIHJlZiAtIGZpbGwgaW4gZ2xvYmFsIHN5bWJvbCB3ZSBtYWRlIGVhcmxpZXJcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMucmVsYXRpdmVGb3J3YXJkW2lkZW50Lmxlbmd0aCAtIDFdO1xuICAgICAgZGVsZXRlIHRoaXMucmVsYXRpdmVGb3J3YXJkW2lkZW50Lmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKHN5bSAhPSBudWxsKSB0aGlzLnN5bWJvbHNbc3ltXS5leHByID0gZXhwcjtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKC9eLSskLy50ZXN0KGlkZW50KSkge1xuICAgICAgLy8gcmVsYXRpdmUgYmFja3JlZiAtIHN0b3JlIHRoZSBleHByIGZvciBsYXRlclxuICAgICAgdGhpcy5yZWxhdGl2ZVJldmVyc2VbaWRlbnQubGVuZ3RoIC0gMV0gPSBleHByO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghaWRlbnQuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICB0aGlzLmNoZWFwTG9jYWxzLmNsZWFyKCk7XG4gICAgICBpZiAoIXRoaXMuY2h1bmsubmFtZSAmJiAhdGhpcy5jaHVuay5kYXRhLmxlbmd0aCkgdGhpcy5jaHVuay5uYW1lID0gaWRlbnQ7XG4gICAgfVxuICAgIHRoaXMuYXNzaWduU3ltYm9sKGlkZW50LCBmYWxzZSwgZXhwciwgdG9rZW4pO1xuICAgIC8vIGNvbnN0IHN5bWJvbCA9IHRoaXMuc2NvcGUucmVzb2x2ZShzdHIsIHRydWUpO1xuICAgIC8vIGlmIChzeW1ib2wuZXhwcikgdGhyb3cgbmV3IEVycm9yKGBBbHJlYWR5IGRlZmluZWQ6ICR7bGFiZWx9YCk7XG4gICAgLy8gaWYgKCF0aGlzLmNodW5rKSB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGU/YCk7XG4gICAgLy8gY29uc3QgY2h1bmtJZCA9IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDE7IC8vIG11c3QgYmUgQUZURVIgdGhpcy5jaHVua1xuICAgIC8vIHN5bWJvbC5leHByID0ge29wOiAnb2ZmJywgbnVtOiB0aGlzLm9mZnNldCwgY2h1bms6IGNodW5rSWR9O1xuICAgIC8vIGlmIChzb3VyY2UpIHN5bWJvbC5leHByLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAvLyAvLyBBZGQgdGhlIGxhYmVsIHRvIHRoZSBjdXJyZW50IGNodW5rLi4uP1xuICAgIC8vIC8vIFJlY29yZCB0aGUgZGVmaW5pdGlvbiwgZXRjLi4uP1xuICB9XG5cbiAgYXNzaWduKGlkZW50OiBzdHJpbmcsIGV4cHI6IEV4cHJ8bnVtYmVyKSB7XG4gICAgaWYgKGlkZW50LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgdGhpcy5mYWlsKGBDaGVhcCBsb2NhbHMgbWF5IG9ubHkgYmUgbGFiZWxzOiAke2lkZW50fWApO1xuICAgIH1cbiAgICAvLyBOb3cgbWFrZSB0aGUgYXNzaWdubWVudC5cbiAgICBpZiAodHlwZW9mIGV4cHIgIT09ICdudW1iZXInKSBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpO1xuICAgIHRoaXMuYXNzaWduU3ltYm9sKGlkZW50LCBmYWxzZSwgZXhwcik7XG4gIH1cblxuICBzZXQoaWRlbnQ6IHN0cmluZywgZXhwcjogRXhwcnxudW1iZXIpIHtcbiAgICBpZiAoaWRlbnQuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICB0aGlzLmZhaWwoYENoZWFwIGxvY2FscyBtYXkgb25seSBiZSBsYWJlbHM6ICR7aWRlbnR9YCk7XG4gICAgfVxuICAgIC8vIE5vdyBtYWtlIHRoZSBhc3NpZ25tZW50LlxuICAgIGlmICh0eXBlb2YgZXhwciAhPT0gJ251bWJlcicpIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgdGhpcy5hc3NpZ25TeW1ib2woaWRlbnQsIHRydWUsIGV4cHIpO1xuICB9XG5cbiAgYXNzaWduU3ltYm9sKGlkZW50OiBzdHJpbmcsIG11dDogYm9vbGVhbiwgZXhwcjogRXhwcnxudW1iZXIsIHRva2VuPzogVG9rZW4pIHtcbiAgICAvLyBOT1RFOiAqIF93aWxsXyBnZXQgY3VycmVudCBjaHVuayFcbiAgICBpZiAodHlwZW9mIGV4cHIgPT09ICdudW1iZXInKSBleHByID0ge29wOiAnbnVtJywgbnVtOiBleHByfTtcbiAgICBjb25zdCBzY29wZSA9IGlkZW50LnN0YXJ0c1dpdGgoJ0AnKSA/IHRoaXMuY2hlYXBMb2NhbHMgOiB0aGlzLmN1cnJlbnRTY29wZTtcbiAgICAvLyBOT1RFOiBUaGlzIGlzIGluY29ycmVjdCAtIGl0IHdpbGwgbG9vayB1cCB0aGUgc2NvcGUgY2hhaW4gd2hlbiBpdFxuICAgIC8vIHNob3VsZG4ndC4gIE11dGFibGVzIG1heSBvciBtYXkgbm90IHdhbnQgdGhpcywgaW1tdXRhYmxlcyBtdXN0IG5vdC5cbiAgICAvLyBXaGV0aGVyIHRoaXMgaXMgdGllZCB0byBhbGxvd0Z3ZFJlZiBvciBub3QgaXMgdW5jbGVhci4gIEl0J3MgYWxzb1xuICAgIC8vIHVuY2xlYXIgd2hldGhlciB3ZSB3YW50IHRvIGFsbG93IGRlZmluaW5nIHN5bWJvbHMgaW4gb3V0c2lkZSBzY29wZXM6XG4gICAgLy8gICA6OmZvbyA9IDQzXG4gICAgLy8gRldJVywgY2E2NSBfZG9lc18gYWxsb3cgdGhpcywgYXMgd2VsbCBhcyBmb286OmJhciA9IDQyIGFmdGVyIHRoZSBzY29wZS5cbiAgICBsZXQgc3ltID0gc2NvcGUucmVzb2x2ZShpZGVudCwgIW11dCk7XG4gICAgaWYgKHN5bSAmJiAobXV0ICE9PSAoc3ltLmlkISA8IDApKSkge1xuICAgICAgdGhpcy5mYWlsKGBDYW5ub3QgY2hhbmdlIG11dGFiaWxpdHkgb2YgJHtpZGVudH1gLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmIChtdXQgJiYgZXhwci5vcCAhPSAnbnVtJykge1xuICAgICAgdGhpcy5mYWlsKGBNdXRhYmxlIHNldCByZXF1aXJlcyBjb25zdGFudGAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKCFzeW0pIHtcbiAgICAgIGlmICghbXV0KSB0aHJvdyBuZXcgRXJyb3IoYGltcG9zc2libGVgKTtcbiAgICAgIHNjb3BlLnN5bWJvbHMuc2V0KGlkZW50LCBzeW0gPSB7aWQ6IC0xfSk7XG4gICAgfSBlbHNlIGlmICghbXV0ICYmIHN5bS5leHByKSB7XG4gICAgICBjb25zdCBvcmlnID1cbiAgICAgICAgICBzeW0uZXhwci5zb3VyY2UgPyBgXFxuT3JpZ2luYWxseSBkZWZpbmVkJHtUb2tlbi5hdChzeW0uZXhwcil9YCA6ICcnO1xuICAgICAgY29uc3QgbmFtZSA9IHRva2VuID8gVG9rZW4ubmFtZUF0KHRva2VuKSA6XG4gICAgICAgICAgaWRlbnQgKyAodGhpcy5fc291cmNlID8gVG9rZW4uYXQoe3NvdXJjZTogdGhpcy5fc291cmNlfSkgOiAnJyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZGVmaW5pbmcgc3ltYm9sICR7bmFtZX0ke29yaWd9YCk7XG4gICAgfVxuICAgIHN5bS5leHByID0gZXhwcjtcbiAgfVxuXG4gIGluc3RydWN0aW9uKG1uZW1vbmljOiBzdHJpbmcsIGFyZz86IEFyZ3xzdHJpbmcpOiB2b2lkO1xuICBpbnN0cnVjdGlvbih0b2tlbnM6IFRva2VuW10pOiB2b2lkO1xuICBpbnN0cnVjdGlvbiguLi5hcmdzOiBbVG9rZW5bXV18W3N0cmluZywgKEFyZ3xzdHJpbmcpP10pOiB2b2lkIHtcbiAgICBsZXQgbW5lbW9uaWM6IHN0cmluZztcbiAgICBsZXQgYXJnOiBBcmc7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxICYmIEFycmF5LmlzQXJyYXkoYXJnc1swXSkpIHtcbiAgICAgIC8vIGhhbmRsZSB0aGUgbGluZS4uLlxuICAgICAgY29uc3QgdG9rZW5zID0gYXJnc1swXTtcbiAgICAgIG1uZW1vbmljID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2tlbnNbMF0pLnRvTG93ZXJDYXNlKCk7XG4gICAgICBhcmcgPSB0aGlzLnBhcnNlQXJnKHRva2Vucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIHBhcnNlIHRoZSB0b2tlbnMgZmlyc3RcbiAgICAgIG1uZW1vbmljID0gYXJnc1swXSBhcyBzdHJpbmc7XG4gICAgICBjb25zdCB0b2tlbml6ZXIgPSBuZXcgVG9rZW5pemVyKGFyZ3NbMV0pO1xuICAgICAgYXJnID0gdGhpcy5wYXJzZUFyZyh0b2tlbml6ZXIubmV4dCgpISwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFttbmVtb25pYywgYXJnXSA9IGFyZ3MgYXMgW3N0cmluZywgQXJnXTtcbiAgICAgIGlmICghYXJnKSBhcmcgPSBbJ2ltcCddO1xuICAgICAgbW5lbW9uaWMgPSBtbmVtb25pYy50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICAvLyBtYXkgbmVlZCB0byBzaXplIHRoZSBhcmcsIGRlcGVuZGluZy5cbiAgICAvLyBjcHUgd2lsbCB0YWtlICdhZGQnLCAnYSx4JywgYW5kICdhLHknIGFuZCBpbmRpY2F0ZSB3aGljaCBpdCBhY3R1YWxseSBpcy5cbiAgICBjb25zdCBvcHMgPSB0aGlzLmNwdS5vcChtbmVtb25pYyk7IC8vIHdpbGwgdGhyb3cgaWYgbW5lbW9uaWMgdW5rbm93blxuICAgIGNvbnN0IG0gPSBhcmdbMF07XG4gICAgaWYgKG0gPT09ICdhZGQnIHx8IG0gPT09ICdhLHgnIHx8IG0gPT09ICdhLHknKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIGFkZHJlc3MgbW5lbW9uaWNzXG4gICAgICBjb25zdCBleHByID0gYXJnWzFdITtcbiAgICAgIGNvbnN0IHMgPSBleHByLm1ldGE/LnNpemUgfHwgMjtcbiAgICAgIGlmIChtID09PSAnYWRkJyAmJiBzID09PSAxICYmICd6cGcnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLnpwZyEsIDEsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYWRkJyAmJiAnYWJzJyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy5hYnMhLCAyLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2FkZCcgJiYgJ3JlbCcgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbGF0aXZlKG9wcy5yZWwhLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2EseCcgJiYgcyA9PT0gMSAmJiAnenB4JyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy56cHghLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2EseCcgJiYgJ2FieCcgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuYWJ4ISwgMiwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHknICYmIHMgPT09IDEgJiYgJ3pweScgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuenB5ISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHknICYmICdhYnknIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLmFieSEsIDIsIGV4cHIpO1xuICAgICAgfVxuICAgICAgdGhpcy5mYWlsKGBCYWQgYWRkcmVzcyBtb2RlICR7bX0gZm9yICR7bW5lbW9uaWN9YCk7XG4gICAgfVxuICAgIC8vIEFsbCBvdGhlciBtbmVtb25pY3NcbiAgICBpZiAobSBpbiBvcHMpIHtcbiAgICAgIGNvbnN0IGFyZ0xlbiA9IHRoaXMuY3B1LmFyZ0xlbihtKTtcbiAgICAgIGlmIChtID09PSAncmVsJykgcmV0dXJuIHRoaXMucmVsYXRpdmUob3BzW21dISwgYXJnTGVuLCBhcmdbMV0hKTtcbiAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHNbbV0hLCBhcmdMZW4sIGFyZ1sxXSEpO1xuICAgIH1cbiAgICB0aGlzLmZhaWwoYEJhZCBhZGRyZXNzIG1vZGUgJHttfSBmb3IgJHttbmVtb25pY31gKTtcbiAgfVxuXG4gIHBhcnNlQXJnKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogQXJnIHtcbiAgICAvLyBMb29rIGZvciBwYXJlbnMvYnJhY2tldHMgYW5kL29yIGEgY29tbWFcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gc3RhcnQpIHJldHVybiBbJ2ltcCddO1xuICAgIGNvbnN0IGZyb250ID0gdG9rZW5zW3N0YXJ0XTtcbiAgICBjb25zdCBuZXh0ID0gdG9rZW5zW3N0YXJ0ICsgMV07XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IHN0YXJ0ICsgMSkge1xuICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoZnJvbnQsICdhJykpIHJldHVybiBbJ2FjYyddO1xuICAgIH0gZWxzZSBpZiAoVG9rZW4uZXEoZnJvbnQsIFRva2VuLklNTUVESUFURSkpIHtcbiAgICAgIHJldHVybiBbJ2ltbScsIEV4cHIucGFyc2VPbmx5KHRva2Vucywgc3RhcnQgKyAxKV07XG4gICAgfVxuICAgIC8vIExvb2sgZm9yIHJlbGF0aXZlIG9yIGFub255bW91cyBsYWJlbHMsIHdoaWNoIGFyZSBub3QgdmFsaWQgb24gdGhlaXIgb3duXG4gICAgaWYgKFRva2VuLmVxKGZyb250LCBUb2tlbi5DT0xPTikgJiYgdG9rZW5zLmxlbmd0aCA9PT0gc3RhcnQgKyAyICYmXG4gICAgICAgIG5leHQudG9rZW4gPT09ICdvcCcgJiYgL15bLStdKyQvLnRlc3QobmV4dC5zdHIpKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgbGFiZWxcbiAgICAgIHJldHVybiBbJ2FkZCcsIHtvcDogJ3N5bScsIHN5bTogJzonICsgbmV4dC5zdHJ9XTtcbiAgICB9IGVsc2UgaWYgKHRva2Vucy5sZW5ndGggPT09IHN0YXJ0ICsgMSAmJiBmcm9udC50b2tlbiA9PT0gJ29wJyAmJlxuICAgICAgICAgICAgICAgL15bLStdKyQvLnRlc3QoZnJvbnQuc3RyKSkge1xuICAgICAgLy8gcmVsYXRpdmUgbGFiZWxcbiAgICAgIHJldHVybiBbJ2FkZCcsIHtvcDogJ3N5bScsIHN5bTogZnJvbnQuc3RyfV07XG4gICAgfVxuICAgIC8vIGl0IG11c3QgYmUgYW4gYWRkcmVzcyBvZiBzb21lIHNvcnQgLSBpcyBpdCBpbmRpcmVjdD9cbiAgICBpZiAoVG9rZW4uZXEoZnJvbnQsIFRva2VuLkxQKSB8fFxuICAgICAgICAodGhpcy5vcHRzLmFsbG93QnJhY2tldHMgJiYgVG9rZW4uZXEoZnJvbnQsIFRva2VuLkxCKSkpIHtcbiAgICAgIGNvbnN0IGNsb3NlID0gVG9rZW4uZmluZEJhbGFuY2VkKHRva2Vucywgc3RhcnQpO1xuICAgICAgaWYgKGNsb3NlIDwgMCkgdGhpcy5mYWlsKGBVbmJhbGFuY2VkICR7VG9rZW4ubmFtZShmcm9udCl9YCwgZnJvbnQpO1xuICAgICAgY29uc3QgYXJncyA9IFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIHN0YXJ0ICsgMSwgY2xvc2UpO1xuICAgICAgaWYgKCFhcmdzLmxlbmd0aCkgdGhpcy5mYWlsKGBCYWQgYXJndW1lbnRgLCBmcm9udCk7XG4gICAgICBjb25zdCBleHByID0gRXhwci5wYXJzZU9ubHkoYXJnc1swXSk7XG4gICAgICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gZWl0aGVyIElORCBvciBJTllcbiAgICAgICAgaWYgKFRva2VuLmVxKHRva2Vuc1tjbG9zZSArIDFdLCBUb2tlbi5DT01NQSkgJiZcbiAgICAgICAgICAgIFRva2VuLmlzUmVnaXN0ZXIodG9rZW5zW2Nsb3NlICsgMl0sICd5JykpIHtcbiAgICAgICAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zW2Nsb3NlICsgM10pO1xuICAgICAgICAgIHJldHVybiBbJ2lueScsIGV4cHJdO1xuICAgICAgICB9XG4gICAgICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbY2xvc2UgKyAxXSk7XG4gICAgICAgIHJldHVybiBbJ2luZCcsIGV4cHJdO1xuICAgICAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA9PT0gMiAmJiBhcmdzWzFdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBJTlhcbiAgICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoYXJnc1sxXVswXSwgJ3gnKSkgcmV0dXJuIFsnaW54JywgZXhwcl07XG4gICAgICB9XG4gICAgICB0aGlzLmZhaWwoYEJhZCBhcmd1bWVudGAsIGZyb250KTtcbiAgICB9XG4gICAgY29uc3QgYXJncyA9IFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIHN0YXJ0KTtcbiAgICBpZiAoIWFyZ3MubGVuZ3RoKSB0aGlzLmZhaWwoYEJhZCBhcmdgLCBmcm9udCk7XG4gICAgY29uc3QgZXhwciA9IEV4cHIucGFyc2VPbmx5KGFyZ3NbMF0pO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIFsnYWRkJywgZXhwcl07XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAyICYmIGFyZ3NbMV0ubGVuZ3RoID09PSAxKSB7XG4gICAgICBpZiAoVG9rZW4uaXNSZWdpc3RlcihhcmdzWzFdWzBdLCAneCcpKSByZXR1cm4gWydhLHgnLCBleHByXTtcbiAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGFyZ3NbMV1bMF0sICd5JykpIHJldHVybiBbJ2EseScsIGV4cHJdO1xuICAgIH1cbiAgICB0aGlzLmZhaWwoYEJhZCBhcmdgLCBmcm9udCk7XG4gIH1cblxuICByZWxhdGl2ZShvcDogbnVtYmVyLCBhcmdsZW46IG51bWJlciwgZXhwcjogRXhwcikge1xuICAgIC8vIENhbiBhcmdsZW4gZXZlciBiZSAyPyAoeWVzIC0gYnJsIG9uIDY1ODE2KVxuICAgIC8vIEJhc2ljIHBsYW4gaGVyZSBpcyB0aGF0IHdlIGFjdHVhbGx5IHdhbnQgYSByZWxhdGl2ZSBleHByLlxuICAgIC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwIHRvIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIC8vIFRPRE8gLSBoYW5kbGUgbG9jYWwvYW5vbnltb3VzIGxhYmVscyBzZXBhcmF0ZWx5P1xuICAgIC8vIFRPRE8gLSBjaGVjayB0aGUgcmFuZ2Ugc29tZWhvdz9cbiAgICBjb25zdCBudW0gPSB0aGlzLmNodW5rLmRhdGEubGVuZ3RoICsgYXJnbGVuICsgMTtcbiAgICBjb25zdCBtZXRhOiBFeHByLk1ldGEgPSB7cmVsOiB0cnVlLCBjaHVuazogdGhpcy5jaHVua3MubGVuZ3RoIC0gMX07XG4gICAgaWYgKHRoaXMuX2NodW5rPy5vcmcpIG1ldGEub3JnID0gdGhpcy5fY2h1bmsub3JnO1xuICAgIGNvbnN0IG5leHRQYyA9IHtvcDogJ251bScsIG51bSwgbWV0YX07XG4gICAgY29uc3QgcmVsOiBFeHByID0ge29wOiAnLScsIGFyZ3M6IFtleHByLCBuZXh0UGNdfTtcbiAgICBpZiAoZXhwci5zb3VyY2UpIHJlbC5zb3VyY2UgPSBleHByLnNvdXJjZTtcbiAgICB0aGlzLm9wY29kZShvcCwgYXJnbGVuLCByZWwpO1xuICB9XG5cbiAgb3Bjb2RlKG9wOiBudW1iZXIsIGFyZ2xlbjogbnVtYmVyLCBleHByOiBFeHByKSB7XG4gICAgLy8gRW1pdCBzb21lIGJ5dGVzLlxuICAgIGlmIChhcmdsZW4pIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7IC8vIEJFRk9SRSBvcGNvZGUgKGluIGNhc2Ugb2YgKilcbiAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICBjaHVuay5kYXRhLnB1c2gob3ApO1xuICAgIGlmIChhcmdsZW4pIHRoaXMuYXBwZW5kKGV4cHIsIGFyZ2xlbik7XG4gICAgaWYgKCFjaHVuay5uYW1lKSBjaHVuay5uYW1lID0gYENvZGVgO1xuICAgIC8vIFRPRE8gLSBmb3IgcmVsYXRpdmUsIGlmIHdlJ3JlIGluIHRoZSBzYW1lIGNodW5rLCBqdXN0IGNvbXBhcmVcbiAgICAvLyB0aGUgb2Zmc2V0Li4uXG4gIH1cblxuICBhcHBlbmQoZXhwcjogRXhwciwgc2l6ZTogbnVtYmVyKSB7XG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBsZXQgdmFsID0gZXhwci5udW0hO1xuLy9jb25zb2xlLmxvZygnZXhwcjonLCBleHByLCAndmFsOicsIHZhbCk7XG4gICAgaWYgKGV4cHIub3AgIT09ICdudW0nIHx8IGV4cHIubWV0YT8ucmVsKSB7XG4gICAgICAvLyB1c2UgYSBwbGFjZWhvbGRlciBhbmQgYWRkIGEgc3Vic3RpdHV0aW9uXG4gICAgICBjb25zdCBvZmZzZXQgPSBjaHVuay5kYXRhLmxlbmd0aDtcbiAgICAgIChjaHVuay5zdWJzIHx8IChjaHVuay5zdWJzID0gW10pKS5wdXNoKHtvZmZzZXQsIHNpemUsIGV4cHJ9KTtcbiAgICAgIHRoaXMud3JpdGVOdW1iZXIoY2h1bmsuZGF0YSwgc2l6ZSk7IC8vIHdyaXRlIGdvZXMgYWZ0ZXIgc3Vic1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIHNpemUsIHZhbCk7XG4gICAgfVxuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBEaXJlY3RpdmUgaGFuZGxlcnNcblxuICBvcmcoYWRkcjogbnVtYmVyLCBuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5fb3JnID0gYWRkcjtcbiAgICB0aGlzLl9jaHVuayA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgfVxuXG4gIHJlbG9jKG5hbWU/OiBzdHJpbmcpIHtcbiAgICB0aGlzLl9vcmcgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIH1cblxuICBzZWdtZW50KC4uLnNlZ21lbnRzOiBBcnJheTxzdHJpbmd8bW9kLlNlZ21lbnQ+KSB7XG4gICAgLy8gVXNhZ2U6IC5zZWdtZW50IFwiMWFcIiwgXCIxYlwiLCAuLi5cbiAgICB0aGlzLnNlZ21lbnRzID0gc2VnbWVudHMubWFwKHMgPT4gdHlwZW9mIHMgPT09ICdzdHJpbmcnID8gcyA6IHMubmFtZSk7XG4gICAgZm9yIChjb25zdCBzIG9mIHNlZ21lbnRzKSB7XG4gICAgICBpZiAodHlwZW9mIHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnNlZ21lbnREYXRhLmdldChzLm5hbWUpIHx8IHtuYW1lOiBzLm5hbWV9O1xuICAgICAgICB0aGlzLnNlZ21lbnREYXRhLnNldChzLm5hbWUsIG1vZC5TZWdtZW50Lm1lcmdlKGRhdGEsIHMpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFzc2VydChleHByOiBFeHByKSB7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBjb25zdCB2YWwgPSB0aGlzLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh2YWwgIT0gbnVsbCkge1xuICAgICAgaWYgKCF2YWwpIHRoaXMuZmFpbChgQXNzZXJ0aW9uIGZhaWxlZGAsIGV4cHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICAgIChjaHVuay5hc3NlcnRzIHx8IChjaHVuay5hc3NlcnRzID0gW10pKS5wdXNoKGV4cHIpO1xuICAgIH1cbiAgfVxuXG4gIGJ5dGUoLi4uYXJnczogQXJyYXk8RXhwcnxzdHJpbmd8bnVtYmVyPikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIDEsIGFyZyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHdyaXRlU3RyaW5nKGNodW5rLmRhdGEsIGFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFwcGVuZChhcmcsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlcyhjb3VudDogbnVtYmVyLCB2YWx1ZT86IG51bWJlcikge1xuICAgIGlmICghY291bnQpIHJldHVybjtcbiAgICB0aGlzLmJ5dGUoLi4ubmV3IEFycmF5KGNvdW50KS5maWxsKHZhbHVlID8/IDApKTtcbiAgfVxuXG4gIHdvcmQoLi4uYXJnczogQXJyYXk8RXhwcnxudW1iZXI+KSB7XG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHRoaXMud3JpdGVOdW1iZXIoY2h1bmsuZGF0YSwgMiwgYXJnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGFyZywgMik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnJlZShzaXplOiBudW1iZXIsIHRva2VuPzogVG9rZW4pIHtcbiAgICAvLyBNdXN0IGJlIGluIC5vcmcgZm9yIGEgc2luZ2xlIHNlZ21lbnQuXG4gICAgaWYgKHRoaXMuX29yZyA9PSBudWxsKSB0aGlzLmZhaWwoYC5mcmVlIGluIC5yZWxvYyBtb2RlYCwgdG9rZW4pO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zZWdtZW50cy5sZW5ndGggPiAxID8gdGhpcy5zZWdtZW50cy5maWx0ZXIocyA9PiB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5zZWdtZW50RGF0YS5nZXQocyk7XG4gICAgICBpZiAoIWRhdGEgfHwgZGF0YS5tZW1vcnkgPT0gbnVsbCB8fCBkYXRhLnNpemUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGRhdGEubWVtb3J5ID4gdGhpcy5fb3JnISkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGRhdGEubWVtb3J5ICsgZGF0YS5zaXplIDw9IHRoaXMuX29yZyEpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pIDogdGhpcy5zZWdtZW50cztcbiAgICBpZiAoc2VnbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aGlzLmZhaWwoYC5mcmVlIHdpdGggbm9uLXVuaXF1ZSBzZWdtZW50OiAke3RoaXMuc2VnbWVudHN9YCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICAgIHRoaXMuZmFpbChgLmZyZWUgd2l0aCBuZWdhdGl2ZSBzaXplOiAke3NpemV9YCwgdG9rZW4pO1xuICAgIH1cbiAgICAvLyBJZiB3ZSd2ZSBnb3QgYW4gb3BlbiBjaHVuaywgZW5kIGl0LlxuICAgIGlmICh0aGlzLl9jaHVuaykge1xuICAgICAgdGhpcy5fb3JnICs9IHRoaXMuX2NodW5rLmRhdGEubGVuZ3RoO1xuICAgIH1cbiAgICB0aGlzLl9jaHVuayA9IHVuZGVmaW5lZDtcbiAgICAvLyBFbnN1cmUgYSBzZWdtZW50IG9iamVjdCBleGlzdHMuXG4gICAgY29uc3QgbmFtZSA9IHNlZ21lbnRzWzBdO1xuICAgIGxldCBzID0gdGhpcy5zZWdtZW50RGF0YS5nZXQobmFtZSk7XG4gICAgaWYgKCFzKSB0aGlzLnNlZ21lbnREYXRhLnNldChuYW1lLCBzID0ge25hbWV9KTtcbiAgICAocy5mcmVlIHx8IChzLmZyZWUgPSBbXSkpLnB1c2goW3RoaXMuX29yZywgdGhpcy5fb3JnICsgc2l6ZV0pO1xuICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgZnJlZSBzcGFjZS5cbiAgICB0aGlzLl9vcmcgKz0gc2l6ZTtcbiAgfVxuXG4gIHNlZ21lbnRQcmVmaXgocHJlZml4OiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPIC0gbWFrZSBtb3JlIG9mIGEgdG9kbyBhYm91dCBjaGFuZ2luZyB0aGlzP1xuICAgIHRoaXMuX3NlZ21lbnRQcmVmaXggPSBwcmVmaXg7XG4gIH1cblxuICBpbXBvcnQoLi4uaWRlbnRzOiBzdHJpbmdbXSkge1xuICAgIGZvciAoY29uc3QgaWRlbnQgb2YgaWRlbnRzKSB7XG4gICAgICB0aGlzLmdsb2JhbHMuc2V0KGlkZW50LCAnaW1wb3J0Jyk7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0KC4uLmlkZW50czogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGlkZW50IG9mIGlkZW50cykge1xuICAgICAgdGhpcy5nbG9iYWxzLnNldChpZGVudCwgJ2V4cG9ydCcpO1xuICAgIH1cbiAgfVxuXG4gIHNjb3BlKG5hbWU/OiBzdHJpbmcpIHtcbiAgICB0aGlzLmVudGVyU2NvcGUobmFtZSwgJ3Njb3BlJyk7XG4gIH1cblxuICBwcm9jKG5hbWU6IHN0cmluZykge1xuICAgIHRoaXMubGFiZWwobmFtZSk7XG4gICAgdGhpcy5lbnRlclNjb3BlKG5hbWUsICdwcm9jJyk7XG4gIH1cblxuICBlbnRlclNjb3BlKG5hbWU6IHN0cmluZ3x1bmRlZmluZWQsIGtpbmQ6ICdzY29wZSd8J3Byb2MnKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBuYW1lID8gdGhpcy5jdXJyZW50U2NvcGUuY2hpbGRyZW4uZ2V0KG5hbWUpIDogdW5kZWZpbmVkO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgaWYgKHRoaXMub3B0cy5yZWVudHJhbnRTY29wZXMpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUgPSBleGlzdGluZztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5mYWlsKGBDYW5ub3QgcmUtZW50ZXIgc2NvcGUgJHtuYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZCA9IG5ldyBTY29wZSh0aGlzLmN1cnJlbnRTY29wZSwga2luZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFNjb3BlLmNoaWxkcmVuLnNldChuYW1lLCBjaGlsZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFNjb3BlLmFub255bW91c0NoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRTY29wZSA9IGNoaWxkO1xuICB9XG5cbiAgZW5kU2NvcGUoKSB7IHRoaXMuZXhpdFNjb3BlKCdzY29wZScpOyB9XG4gIGVuZFByb2MoKSB7IHRoaXMuZXhpdFNjb3BlKCdwcm9jJyk7IH1cblxuICBleGl0U2NvcGUoa2luZDogJ3Njb3BlJ3wncHJvYycpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50U2NvcGUua2luZCAhPT0ga2luZCB8fCAhdGhpcy5jdXJyZW50U2NvcGUucGFyZW50KSB7XG4gICAgICB0aGlzLmZhaWwoYC5lbmQke2tpbmR9IHdpdGhvdXQgLiR7a2luZH1gKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50U2NvcGUgPSB0aGlzLmN1cnJlbnRTY29wZS5wYXJlbnQ7XG4gIH1cblxuICBwdXNoU2VnKC4uLnNlZ21lbnRzOiBBcnJheTxzdHJpbmd8bW9kLlNlZ21lbnQ+KSB7XG4gICAgdGhpcy5zZWdtZW50U3RhY2sucHVzaChbdGhpcy5zZWdtZW50cywgdGhpcy5fY2h1bmtdKTtcbiAgICB0aGlzLnNlZ21lbnQoLi4uc2VnbWVudHMpO1xuICB9XG5cbiAgcG9wU2VnKCkge1xuICAgIGlmICghdGhpcy5zZWdtZW50U3RhY2subGVuZ3RoKSB0aGlzLmZhaWwoYC5wb3BzZWcgd2l0aG91dCAucHVzaHNlZ2ApO1xuICAgIFt0aGlzLnNlZ21lbnRzLCB0aGlzLl9jaHVua10gPSB0aGlzLnNlZ21lbnRTdGFjay5wb3AoKSE7XG4gIH1cblxuICBtb3ZlKHNpemU6IG51bWJlciwgc291cmNlOiBFeHByKSB7XG4gICAgdGhpcy5hcHBlbmQoe29wOiAnLm1vdmUnLCBhcmdzOiBbc291cmNlXSwgbWV0YToge3NpemV9fSwgc2l6ZSk7XG4gIH1cblxuICAvLyBVdGlsaXR5IG1ldGhvZHMgZm9yIHByb2Nlc3NpbmcgYXJndW1lbnRzXG5cbiAgcGFyc2VDb25zdCh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IG51bWJlciB7XG4gICAgY29uc3QgdmFsID0gdGhpcy5ldmFsdWF0ZShFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0KSk7XG4gICAgaWYgKHZhbCAhPSBudWxsKSByZXR1cm4gdmFsO1xuICAgIHRoaXMuZmFpbChgRXhwcmVzc2lvbiBpcyBub3QgY29uc3RhbnRgLCB0b2tlbnNbMV0pO1xuICB9XG4gIHBhcnNlTm9BcmdzKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKSB7XG4gICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1sxXSk7XG4gIH1cbiAgcGFyc2VFeHByKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogRXhwciB7XG4gICAgcmV0dXJuIEV4cHIucGFyc2VPbmx5KHRva2Vucywgc3RhcnQpO1xuICB9XG4gIC8vIHBhcnNlU3RyaW5nTGlzdCh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IHN0cmluZ1tdIHtcbiAgLy8gICByZXR1cm4gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkubWFwKHRzID0+IHtcbiAgLy8gICAgIGNvbnN0IHN0ciA9IFRva2VuLmV4cGVjdFN0cmluZyh0c1swXSk7XG4gIC8vICAgICBUb2tlbi5leHBlY3RFb2wodHNbMV0sIFwiYSBzaW5nbGUgc3RyaW5nXCIpO1xuICAvLyAgICAgcmV0dXJuIHN0cjtcbiAgLy8gICB9KTtcbiAgLy8gfVxuICBwYXJzZVN0cih0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RyID0gVG9rZW4uZXhwZWN0U3RyaW5nKHRva2Vuc1tzdGFydF0pO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbc3RhcnQgKyAxXSwgXCJhIHNpbmdsZSBzdHJpbmdcIik7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIHBhcnNlU2VnbWVudExpc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBBcnJheTxzdHJpbmd8bW9kLlNlZ21lbnQ+IHtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IHN0YXJ0ICsgMSkge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIHNlZ21lbnQgbGlzdGAsIHRva2Vuc1tzdGFydCAtIDFdKTtcbiAgICB9XG4gICAgcmV0dXJuIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpLm1hcCh0cyA9PiB7XG4gICAgICBjb25zdCBzdHIgPSB0aGlzLl9zZWdtZW50UHJlZml4ICsgVG9rZW4uZXhwZWN0U3RyaW5nKHRzWzBdKTtcbiAgICAgIGlmICh0cy5sZW5ndGggPT09IDEpIHJldHVybiBzdHI7XG4gICAgICBpZiAoIVRva2VuLmVxKHRzWzFdLCBUb2tlbi5DT0xPTikpIHtcbiAgICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBjb21tYSBvciBjb2xvbjogJHtUb2tlbi5uYW1lKHRzWzFdKX1gLCB0c1sxXSk7XG4gICAgICB9XG4gICAgICBjb25zdCBzZWcgPSB7bmFtZTogc3RyfSBhcyBtb2QuU2VnbWVudDtcbiAgICAgIC8vIFRPRE8gLSBwYXJzZSBleHByZXNzaW9ucy4uLlxuICAgICAgY29uc3QgYXR0cnMgPSBUb2tlbi5wYXJzZUF0dHJMaXN0KHRzLCAxKTsgLy8gOiBpZGVudCBbLi4uXVxuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWxdIG9mIGF0dHJzKSB7XG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgY2FzZSAnYmFuayc6IHNlZy5iYW5rID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3NpemUnOiBzZWcuc2l6ZSA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdvZmYnOiBzZWcub2Zmc2V0ID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21lbSc6IHNlZy5tZW1vcnkgPSB0aGlzLnBhcnNlQ29uc3QodmFsLCAwKTsgYnJlYWs7XG4gICAgICAgICAgLy8gVE9ETyAtIEkgZG9uJ3QgZnVsbHkgdW5kZXJzdGFuZCB0aGVzZS4uLlxuICAgICAgICAgIC8vIGNhc2UgJ3plcm9wYWdlJzogc2VnLmFkZHJlc3NpbmcgPSAxO1xuICAgICAgICAgIGRlZmF1bHQ6IHRoaXMuZmFpbChgVW5rbm93biBzZWdtZW50IGF0dHI6ICR7a2V5fWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc2VnO1xuICAgIH0pO1xuICB9XG5cbiAgcGFyc2VSZXNBcmdzKHRva2VuczogVG9rZW5bXSk6IFtudW1iZXIsIG51bWJlcj9dIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5wYXJzZURhdGFMaXN0KHRva2Vucyk7XG4gICAgaWYgKGRhdGEubGVuZ3RoID4gMikgdGhpcy5mYWlsKGBFeHBlY3RlZCBhdCBtb3N0IDIgYXJnc2AsIGRhdGFbMl0pO1xuICAgIGlmICghZGF0YS5sZW5ndGgpIHRoaXMuZmFpbChgRXhwZWN0ZWQgYXQgbGVhc3QgMSBhcmdgKTtcbiAgICBjb25zdCBjb3VudCA9IHRoaXMuZXZhbHVhdGUoZGF0YVswXSk7XG4gICAgaWYgKGNvdW50ID09IG51bGwpIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29uc3RhbnQgY291bnRgKTtcbiAgICBjb25zdCB2YWwgPSBkYXRhWzFdICYmIHRoaXMuZXZhbHVhdGUoZGF0YVsxXSk7XG4gICAgaWYgKGRhdGFbMV0gJiYgdmFsID09IG51bGwpIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29uc3RhbnQgdmFsdWVgKTtcbiAgICByZXR1cm4gW2NvdW50LCB2YWxdO1xuICB9XG5cbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10pOiBBcnJheTxFeHByPjtcbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10sIGFsbG93U3RyaW5nOiB0cnVlKTogQXJyYXk8RXhwcnxzdHJpbmc+O1xuICBwYXJzZURhdGFMaXN0KHRva2VuczogVG9rZW5bXSwgYWxsb3dTdHJpbmcgPSBmYWxzZSk6IEFycmF5PEV4cHJ8c3RyaW5nPiB7XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCAyKSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgZGF0YSBsaXN0YCwgdG9rZW5zWzBdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0OiBBcnJheTxFeHByfHN0cmluZz4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlcm0gb2YgVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkpIHtcbiAgICAgIGlmIChhbGxvd1N0cmluZyAmJiB0ZXJtLmxlbmd0aCA9PT0gMSAmJiB0ZXJtWzBdLnRva2VuID09PSAnc3RyJykge1xuICAgICAgICBvdXQucHVzaCh0ZXJtWzBdLnN0cik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQucHVzaCh0aGlzLnJlc29sdmUoRXhwci5wYXJzZU9ubHkodGVybSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHBhcnNlSWRlbnRpZmllckxpc3QodG9rZW5zOiBUb2tlbltdKTogc3RyaW5nW10ge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgMikge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBpZGVudGlmaWVyKHMpYCwgdG9rZW5zWzBdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0OiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgdGVybSBvZiBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCAxKSkge1xuICAgICAgaWYgKHRlcm0ubGVuZ3RoICE9PSAxIHx8IHRlcm1bMF0udG9rZW4gIT09ICdpZGVudCcpIHtcbiAgICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBpZGVudGlmaWVyOiAke1Rva2VuLm5hbWUodGVybVswXSl9YCwgdGVybVswXSk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChUb2tlbi5zdHIodGVybVswXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgcGFyc2VPcHRpb25hbElkZW50aWZpZXIodG9rZW5zOiBUb2tlbltdKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdG9rID0gdG9rZW5zWzFdO1xuICAgIGlmICghdG9rKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IGlkZW50ID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2spO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMl0pO1xuICAgIHJldHVybiBpZGVudDtcbiAgfVxuXG4gIHBhcnNlUmVxdWlyZWRJZGVudGlmaWVyKHRva2VuczogVG9rZW5bXSk6IHN0cmluZyB7XG4gICAgY29uc3QgaWRlbnQgPSBUb2tlbi5leHBlY3RJZGVudGlmaWVyKHRva2Vuc1sxXSk7XG4gICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1syXSk7XG4gICAgcmV0dXJuIGlkZW50O1xuICB9XG5cbiAgcGFyc2VNb3ZlQXJncyh0b2tlbnM6IFRva2VuW10pOiBbbnVtYmVyLCBFeHByXSB7XG4gICAgLy8gLm1vdmUgMTAsIGlkZW50ICAgICAgICA7IG11c3QgYmUgYW4gb2Zmc2V0XG4gICAgLy8gLm1vdmUgMTAsICQxMjM0LCBcInNlZ1wiIDsgbWF5YmUgc3VwcG9ydCB0aGlzP1xuICAgIGNvbnN0IGFyZ3MgPSBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCAxKTtcbiAgICBpZiAoYXJncy5sZW5ndGggIT09IDIgLyogJiYgYXJncy5sZW5ndGggIT09IDMgKi8pIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29uc3RhbnQgbnVtYmVyLCB0aGVuIGlkZW50aWZpZXJgKTtcbiAgICB9XG4gICAgY29uc3QgbnVtID0gdGhpcy5ldmFsdWF0ZShFeHByLnBhcnNlT25seShhcmdzWzBdKSk7XG4gICAgaWYgKG51bSA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgY29uc3RhbnQgbnVtYmVyYCk7XG5cbiAgICAvLyBsZXQgc2VnTmFtZSA9IHRoaXMuc2VnbWVudHMubGVuZ3RoID09PSAxID8gdGhpcy5zZWdtZW50c1swXSA6IHVuZGVmaW5lZDtcbiAgICAvLyBpZiAoYXJncy5sZW5ndGggPT09IDMpIHtcbiAgICAvLyAgIGlmIChhcmdzWzJdLmxlbmd0aCAhPT0gMSB8fCBhcmdzWzJdWzBdLnRva2VuICE9PSAnc3RyJykge1xuICAgIC8vICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgc2luZ2xlIHNlZ21lbnQgbmFtZWAsIHRoaXMuYXJnc1syXVswXSk7XG4gICAgLy8gICB9XG4gICAgLy8gICBzZWdOYW1lID0gYXJnc1syXVswXS5zdHI7XG4gICAgLy8gfVxuICAgIC8vIGNvbnN0IHNlZyA9IHNlZ05hbWUgPyB0aGlzLnNlZ21lbnREYXRhLmdldChzZWdOYW1lKSA6IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IG9mZnNldCA9IHRoaXMucmVzb2x2ZShFeHByLnBhcnNlT25seShhcmdzWzFdKSk7XG4gICAgaWYgKG9mZnNldC5vcCA9PT0gJ251bScgJiYgb2Zmc2V0Lm1ldGE/LmNodW5rICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBbbnVtLCBvZmZzZXRdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgY29uc3RhbnQgb2Zmc2V0YCwgYXJnc1sxXVswXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gRGlhZ25vc3RpY3NcblxuICBmYWlsKG1zZzogc3RyaW5nLCBhdD86IHtzb3VyY2U/OiBTb3VyY2VJbmZvfSk6IG5ldmVyIHtcbiAgICBpZiAoYXQ/LnNvdXJjZSkgdGhyb3cgbmV3IEVycm9yKG1zZyArIFRva2VuLmF0KGF0KSk7XG4gICAgaWYgKCF0aGlzLl9zb3VyY2UgJiYgdGhpcy5fY2h1bms/Lm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cgKyBgXFxuICBpbiAke3RoaXMuX2NodW5rLm5hbWV9YCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihtc2cgKyBUb2tlbi5hdCh7c291cmNlOiB0aGlzLl9zb3VyY2V9KSk7XG4gIH1cblxuICB3cml0ZU51bWJlcihkYXRhOiBudW1iZXJbXSwgc2l6ZTogbnVtYmVyLCB2YWw/OiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gaWYgdmFsIGlzIGEgc2lnbmVkL3Vuc2lnbmVkIDMyLWJpdCBudW1iZXIsIGl0J3Mgbm90IGNsZWFyXG4gICAgLy8gd2hldGhlciB3ZSBuZWVkIHRvIHRyZWF0IGl0IG9uZSB3YXkgb3IgdGhlIG90aGVyLi4uPyAgYnV0IG1heWJlXG4gICAgLy8gaXQgZG9lc24ndCBtYXR0ZXIgc2luY2Ugd2UncmUgb25seSBsb29raW5nIGF0IDMyIGJpdHMgYW55d2F5LlxuICAgIGNvbnN0IHMgPSAoc2l6ZSkgPDwgMztcbiAgICBpZiAodmFsICE9IG51bGwgJiYgKHZhbCA8ICgtMSA8PCBzKSB8fCB2YWwgPj0gKDEgPDwgcykpKSB7XG4gICAgICBjb25zdCBuYW1lID0gWydieXRlJywgJ3dvcmQnLCAnZmFyd29yZCcsICdkd29yZCddW3NpemUgLSAxXTtcbiAgICAgIHRoaXMuZmFpbChgTm90IGEgJHtuYW1lfTogJCR7dmFsLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGRhdGEucHVzaCh2YWwgIT0gbnVsbCA/IHZhbCAmIDB4ZmYgOiAweGZmKTtcbiAgICAgIGlmICh2YWwgIT0gbnVsbCkgdmFsID4+PSA4O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVN0cmluZyhkYXRhOiBudW1iZXJbXSwgc3RyOiBzdHJpbmcpIHtcbiAgLy8gVE9ETyAtIHN1cHBvcnQgY2hhcmFjdGVyIG1hcHMgKHBhc3MgYXMgdGhpcmQgYXJnPylcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBkYXRhLnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xuICB9XG59XG5cbnR5cGUgQXJnTW9kZSA9XG4gICAgJ2FkZCcgfCAnYSx4JyB8ICdhLHknIHwgLy8gcHNldWRvIG1vZGVzXG4gICAgJ2FicycgfCAnYWJ4JyB8ICdhYnknIHxcbiAgICAnaW1tJyB8ICdpbmQnIHwgJ2lueCcgfCAnaW55JyB8XG4gICAgJ3JlbCcgfCAnenBnJyB8ICd6cHgnIHwgJ3pweSc7XG5cbmV4cG9ydCB0eXBlIEFyZyA9IFsnYWNjJyB8ICdpbXAnXSB8IFtBcmdNb2RlLCBFeHByXTtcblxuZXhwb3J0IG5hbWVzcGFjZSBBc3NlbWJsZXIge1xuICBleHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICAgIGFsbG93QnJhY2tldHM/OiBib29sZWFuO1xuICAgIHJlZW50cmFudFNjb3Blcz86IGJvb2xlYW47XG4gIH1cbn1cbiJdfQ==