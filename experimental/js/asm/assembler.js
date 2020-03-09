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
        var _a;
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
                if (!((_a = sym) === null || _a === void 0 ? void 0 : _a.expr))
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
        this.byte(...new Array(count).fill((value !== null && value !== void 0 ? value : 0)));
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
        if ((_a = at) === null || _a === void 0 ? void 0 : _a.source)
            throw new Error(msg + Token.at(at));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZW1ibGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9hc3NlbWJsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QixPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBYSxLQUFLLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFDMUQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFLdkMsTUFBTSxNQUFNO0NBb0JYO0FBRUQsTUFBZSxTQUFTO0lBQXhCO1FBRVcsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBaUMvQyxDQUFDO0lBL0JXLFNBQVMsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsZUFBeUI7UUFDN0MsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLElBQUksR0FBRyxFQUFFO1lBQ1AsSUFBSSxJQUFJLEtBQUssSUFBSTtnQkFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNyQyxPQUFPLEdBQUcsQ0FBQztTQUNaO1FBQ0QsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQU12QyxNQUFNLE1BQU0sR0FBVyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLE9BQU8s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Q0FBQyxDQUFDO1FBQzVDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxLQUFLLEdBQUcsQ0FBQyxFQUFFO1lBQy9CLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNsRDthQUFNLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzNDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkQ7UUFFRCxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLEtBQUssR0FBRyxDQUFDO1lBQzNELElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBRW5ELE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7U0FDbEQ7YUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLElBQUk7WUFDbkQsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFFcEMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1NBQzdDO1FBRUQsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDMUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEQsSUFBSSxLQUFLLEdBQUcsQ0FBQztnQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25FLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO2dCQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFFckIsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQztvQkFDeEMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFO29CQUM1QyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDdEI7Z0JBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDdEI7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFFcEQsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7b0JBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQzthQUM3RDtZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUM3QyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztnQkFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzVELElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsUUFBUSxDQUFDLEVBQVUsRUFBRSxNQUFjLEVBQUUsSUFBVTs7UUFNN0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDaEQsTUFBTSxJQUFJLEdBQWMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUMsQ0FBQztRQUNuRSxVQUFJLElBQUksQ0FBQyxNQUFNLDBDQUFFLEdBQUc7WUFBRSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2pELE1BQU0sTUFBTSxHQUFHLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFDdEMsTUFBTSxHQUFHLEdBQVMsRUFBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBQyxDQUFDO1FBQ2xELElBQUksSUFBSSxDQUFDLE1BQU07WUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNLENBQUMsRUFBVSxFQUFFLE1BQWMsRUFBRSxJQUFVO1FBRTNDLElBQUksTUFBTTtZQUFFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxJQUFJLENBQUM7UUFDckIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEIsSUFBSSxNQUFNO1lBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFHeEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFVLEVBQUUsSUFBWTs7UUFDN0IsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQztRQUNyQixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBSSxDQUFDO1FBRXBCLElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyxLQUFLLFdBQUksSUFBSSxDQUFDLElBQUksMENBQUUsR0FBRyxDQUFBLEVBQUU7WUFFdkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDakMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDcEM7YUFBTTtZQUNMLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDO0lBS0QsR0FBRyxDQUFDLElBQVksRUFBRSxJQUFhO1FBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBYTtRQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUNwQixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsUUFBbUM7UUFFNUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLFFBQVEsRUFBRTtZQUN4QixJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsRUFBRTtnQkFDekIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMxRDtTQUNGO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7SUFDekIsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFVO1FBQ2YsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixJQUFJLENBQUMsR0FBRztnQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1NBQy9DO2FBQU07WUFDTCxNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQUcsSUFBK0I7UUFDckMsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQztRQUNyQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtZQUN0QixJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUN0QztpQkFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtnQkFDbEMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDOUI7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDckI7U0FDRjtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWM7UUFDL0IsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUMsS0FBSyxhQUFMLEtBQUssY0FBTCxLQUFLLEdBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQUcsSUFBd0I7UUFDOUIsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQztRQUNyQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtZQUN0QixJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUN0QztpQkFBTTtnQkFDTCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNyQjtTQUNGO0lBQ0gsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFZLEVBQUUsS0FBYTtRQUU5QixJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSTtnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUNwRSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUs7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUs7Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFDeEQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUNuQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsa0NBQWtDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNyRTthQUFNLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtZQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN2RDtRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3RDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFFeEIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxDQUFDO1lBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFDLElBQUksRUFBQyxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTlELElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxhQUFhLENBQUMsTUFBYztRQUUxQixJQUFJLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQztJQUMvQixDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQUcsTUFBZ0I7UUFDeEIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ25DO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFHLE1BQWdCO1FBQ3hCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1lBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNuQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsSUFBYTtRQUNqQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBc0IsRUFBRSxJQUFvQjtRQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3pFLElBQUksUUFBUSxFQUFFO1lBQ1osSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUM7Z0JBQzdCLE9BQU87YUFDUjtZQUNELElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLElBQUksRUFBRSxDQUFDLENBQUM7U0FDNUM7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksSUFBSSxFQUFFO1lBQ1IsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztTQUM3QzthQUFNO1lBQ0wsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDakQ7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztJQUM1QixDQUFDO0lBRUQsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVyQyxTQUFTLENBQUMsSUFBb0I7UUFDNUIsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtZQUNoRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxhQUFhLElBQUksRUFBRSxDQUFDLENBQUM7U0FDM0M7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0lBQy9DLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxRQUFtQztRQUM1QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxNQUFNO1FBQ0osSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNyRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFHLENBQUM7SUFDMUQsQ0FBQztJQUVELElBQUksQ0FBQyxJQUFZLEVBQUUsTUFBWTtRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUMsRUFBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFJRCxVQUFVLENBQUMsTUFBZSxFQUFFLEtBQUssR0FBRyxDQUFDO1FBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RCxJQUFJLEdBQUcsSUFBSSxJQUFJO1lBQUUsT0FBTyxHQUFHLENBQUM7UUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBQ0QsV0FBVyxDQUFDLE1BQWUsRUFBRSxLQUFLLEdBQUcsQ0FBQztRQUNwQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFDRCxTQUFTLENBQUMsTUFBZSxFQUFFLEtBQUssR0FBRyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQVFELFFBQVEsQ0FBQyxNQUFlLEVBQUUsS0FBSyxHQUFHLENBQUM7UUFDakMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM5QyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN0RCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxNQUFlLEVBQUUsS0FBSyxHQUFHLENBQUM7UUFDekMsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUU7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDekQ7UUFDRCxPQUFPLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUM7Z0JBQUUsT0FBTyxHQUFHLENBQUM7WUFDaEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ25FO1lBQ0QsTUFBTSxHQUFHLEdBQUcsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFnQixDQUFDO1lBRXZDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxLQUFLLEVBQUU7Z0JBQzlCLFFBQVEsR0FBRyxFQUFFO29CQUNYLEtBQUssTUFBTTt3QkFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUFDLE1BQU07b0JBQ3ZELEtBQUssTUFBTTt3QkFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUFDLE1BQU07b0JBQ3ZELEtBQUssS0FBSzt3QkFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUFDLE1BQU07b0JBQ3hELEtBQUssS0FBSzt3QkFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUFDLE1BQU07b0JBR3hELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLEdBQUcsRUFBRSxDQUFDLENBQUM7aUJBQ3BEO2FBQ0Y7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFlO1FBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7WUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN2RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksS0FBSyxJQUFJLElBQUk7WUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDeEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUk7WUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBSUQsYUFBYSxDQUFDLE1BQWUsRUFBRSxXQUFXLEdBQUcsS0FBSztRQUNoRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUM7UUFDRCxNQUFNLEdBQUcsR0FBdUIsRUFBRSxDQUFDO1FBQ25DLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDaEQsSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLEVBQUU7Z0JBQy9ELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3ZCO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM5QztTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsbUJBQW1CLENBQUMsTUFBZTtRQUNqQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEQ7UUFDRCxNQUFNLEdBQUcsR0FBYSxFQUFFLENBQUM7UUFDekIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNoRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssT0FBTyxFQUFFO2dCQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbkU7WUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5QjtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELHVCQUF1QixDQUFDLE1BQWU7UUFDckMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxHQUFHO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFDM0IsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsdUJBQXVCLENBQUMsTUFBZTtRQUNyQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxhQUFhLENBQUMsTUFBZTs7UUFHM0IsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBNkI7WUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsSUFBSSxHQUFHLElBQUksSUFBSTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQVd6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssS0FBSyxJQUFJLE9BQUEsTUFBTSxDQUFDLElBQUksMENBQUUsS0FBSyxLQUFJLElBQUksRUFBRTtZQUNyRCxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3RCO2FBQU07WUFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO0lBQ0gsQ0FBQztJQUlELElBQUksQ0FBQyxHQUFXLEVBQUUsRUFBMEI7O1FBQzFDLFVBQUksRUFBRSwwQ0FBRSxNQUFNO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQWMsRUFBRSxJQUFZLEVBQUUsR0FBWTtRQUlwRCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RCxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2xEO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNDLElBQUksR0FBRyxJQUFJLElBQUk7Z0JBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztTQUM1QjtJQUNILENBQUM7Q0FDRjtBQUVELFNBQVMsV0FBVyxDQUFDLElBQWMsRUFBRSxHQUFXO0lBRTlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzlCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q3B1fSBmcm9tICcuL2NwdS5qcyc7XG5pbXBvcnQge0V4cHJ9IGZyb20gJy4vZXhwci5qcyc7XG5pbXBvcnQgKiBhcyBtb2QgZnJvbSAnLi9tb2R1bGUuanMnO1xuaW1wb3J0IHtTb3VyY2VJbmZvLCBUb2tlbiwgVG9rZW5Tb3VyY2V9IGZyb20gJy4vdG9rZW4uanMnO1xuaW1wb3J0IHtUb2tlbml6ZXJ9IGZyb20gJy4vdG9rZW5pemVyLmpzJztcbmltcG9ydCB7YXNzZXJ0TmV2ZXJ9IGZyb20gJy4uL3V0aWwuanMnO1xuXG50eXBlIENodW5rID0gbW9kLkNodW5rPG51bWJlcltdPjtcbnR5cGUgTW9kdWxlID0gbW9kLk1vZHVsZTtcblxuY2xhc3MgU3ltYm9sIHtcbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIGdsb2JhbCBzeW1ib2wgYXJyYXkuICBPbmx5IGFwcGxpZXMgdG8gaW1tdXRhYmxlXG4gICAqIHN5bWJvbHMgdGhhdCBuZWVkIHRvIGJlIGFjY2Vzc2libGUgYXQgbGluayB0aW1lLiAgTXV0YWJsZSBzeW1ib2xzXG4gICAqIGFuZCBzeW1ib2xzIHdpdGgga25vd24gdmFsdWVzIGF0IHVzZSB0aW1lIGFyZSBub3QgYWRkZWQgdG8gdGhlXG4gICAqIGdsb2JhbCBsaXN0IGFuZCBhcmUgdGhlcmVmb3JlIGhhdmUgbm8gaWQuICBNdXRhYmlsaXR5IGlzIHRyYWNrZWRcbiAgICogYnkgc3RvcmluZyBhIC0xIGhlcmUuXG4gICAqL1xuICBpZD86IG51bWJlcjtcbiAgLyoqIFdoZXRoZXIgdGhlIHN5bWJvbCBoYXMgYmVlbiBleHBsaWNpdGx5IHNjb3BlZC4gKi9cbiAgc2NvcGVkPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBleHByZXNzaW9uIGZvciB0aGUgc3ltYm9sLiAgTXVzdCBiZSBhIHN0YXRpY2FsbHktZXZhbHVhdGFibGUgY29uc3RhbnRcbiAgICogZm9yIG11dGFibGUgc3ltYm9scy4gIFVuZGVmaW5lZCBmb3IgZm9yd2FyZC1yZWZlcmVuY2VkIHN5bWJvbHMuXG4gICAqL1xuICBleHByPzogRXhwcjtcbiAgLyoqIE5hbWUgdGhpcyBzeW1ib2wgaXMgZXhwb3J0ZWQgYXMuICovXG4gIGV4cG9ydD86IHN0cmluZztcbiAgLyoqIFRva2VuIHdoZXJlIHRoaXMgc3ltYm9sIHdhcyByZWYnZC4gKi9cbiAgcmVmPzoge3NvdXJjZT86IFNvdXJjZUluZm99OyAvLyBUT0RPIC0gcGx1bWIgdGhpcyB0aHJvdWdoXG59XG5cbmFic3RyYWN0IGNsYXNzIEJhc2VTY29wZSB7XG4gIC8vY2xvc2VkID0gZmFsc2U7XG4gIHJlYWRvbmx5IHN5bWJvbHMgPSBuZXcgTWFwPHN0cmluZywgU3ltYm9sPigpO1xuXG4gIHByb3RlY3RlZCBwaWNrU2NvcGUobmFtZTogc3RyaW5nKTogW3N0cmluZywgQmFzZVNjb3BlXSB7XG4gICAgcmV0dXJuIFtuYW1lLCB0aGlzXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBtYXkgbmVlZCBhZGRpdGlvbmFsIG9wdGlvbnM6XG4gIC8vICAgLSBsb29rdXAgY29uc3RhbnQgLSB3b24ndCByZXR1cm4gYSBtdXRhYmxlIHZhbHVlIG9yIGEgdmFsdWUgZnJvbVxuICAvLyAgICAgYSBwYXJlbnQgc2NvcGUsIGltcGxpZXMgbm8gZm9yd2FyZCByZWZcbiAgLy8gICAtIHNoYWxsb3cgLSBkb24ndCByZWN1cnNlIHVwIHRoZSBjaGFpbiwgZm9yIGFzc2lnbm1lbnQgb25seT8/XG4gIC8vIE1pZ2h0IGp1c3QgbWVhbiBhbGxvd0ZvcndhcmRSZWYgaXMgYWN0dWFsbHkganVzdCBhIG1vZGUgc3RyaW5nP1xuICAvLyAgKiBjYTY1J3MgLmRlZmluZWRzeW1ib2wgaXMgbW9yZSBwZXJtaXNzaXZlIHRoYW4gLmlmY29uc3RcbiAgcmVzb2x2ZShuYW1lOiBzdHJpbmcsIGFsbG93Rm9yd2FyZFJlZjogdHJ1ZSk6IFN5bWJvbDtcbiAgcmVzb2x2ZShuYW1lOiBzdHJpbmcsIGFsbG93Rm9yd2FyZFJlZj86IGJvb2xlYW4pOiBTeW1ib2x8dW5kZWZpbmVkO1xuICByZXNvbHZlKG5hbWU6IHN0cmluZywgYWxsb3dGb3J3YXJkUmVmPzogYm9vbGVhbik6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IFt0YWlsLCBzY29wZV0gPSB0aGlzLnBpY2tTY29wZShuYW1lKTtcbiAgICBsZXQgc3ltID0gc2NvcGUuc3ltYm9scy5nZXQodGFpbCk7XG4vL2NvbnNvbGUubG9nKCdyZXNvbHZlOicsbmFtZSwnc3ltPScsc3ltLCdmd2Q/JyxhbGxvd0ZvcndhcmRSZWYpO1xuICAgIGlmIChzeW0pIHtcbiAgICAgIGlmICh0YWlsICE9PSBuYW1lKSBzeW0uc2NvcGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBzeW07XG4gICAgfVxuICAgIGlmICghYWxsb3dGb3J3YXJkUmVmKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIC8vIGlmIChzY29wZS5jbG9zZWQpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgc3ltYm9sOiAke25hbWV9YCk7XG4gICAgLy8gbWFrZSBhIG5ldyBzeW1ib2wgLSBidXQgb25seSBpbiBhbiBvcGVuIHNjb3BlXG4gICAgLy9jb25zdCBzeW1ib2wgPSB7aWQ6IHRoaXMuc3ltYm9sQXJyYXkubGVuZ3RofTtcbi8vY29uc29sZS5sb2coJ2NyZWF0ZWQ6JyxzeW1ib2wpO1xuICAgIC8vdGhpcy5zeW1ib2xBcnJheS5wdXNoKHN5bWJvbCk7XG4gICAgY29uc3Qgc3ltYm9sOiBTeW1ib2wgPSB7fTtcbiAgICBzY29wZS5zeW1ib2xzLnNldCh0YWlsLCBzeW1ib2wpO1xuICAgIGlmICh0YWlsICE9PSBuYW1lKSBzeW1ib2wuc2NvcGVkID0gdHJ1ZTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG59XG5cbmNsYXNzIFNjb3BlIGV4dGVuZHMgQmFzZVNjb3BlIHtcbiAgcmVhZG9ubHkgZ2xvYmFsOiBTY29wZTtcbiAgcmVhZG9ubHkgY2hpbGRyZW4gPSBuZXcgTWFwPHN0cmluZywgU2NvcGU+KCk7XG4gIHJlYWRvbmx5IGFub255bW91c0NoaWxkcmVuOiBTY29wZVtdID0gW107XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcGFyZW50PzogU2NvcGUsIHJlYWRvbmx5IGtpbmQ/OiAnc2NvcGUnfCdwcm9jJykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5nbG9iYWwgPSBwYXJlbnQgPyBwYXJlbnQuZ2xvYmFsIDogdGhpcztcbiAgfVxuXG4gIHBpY2tTY29wZShuYW1lOiBzdHJpbmcpOiBbc3RyaW5nLCBTY29wZV0ge1xuICAgIC8vIFRPRE8gLSBwbHVtYiB0aGUgc291cmNlIGluZm9ybWF0aW9uIHRocm91Z2ggaGVyZT9cbiAgICBsZXQgc2NvcGU6IFNjb3BlID0gdGhpcztcbiAgICBjb25zdCBzcGxpdCA9IG5hbWUuc3BsaXQoLzo6L2cpO1xuICAgIGNvbnN0IHRhaWwgPSBzcGxpdC5wb3AoKSE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGxpdC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFpICYmICFzcGxpdFtpXSkgeyAvLyBnbG9iYWxcbiAgICAgICAgc2NvcGUgPSBzY29wZS5nbG9iYWw7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbGV0IGNoaWxkID0gc2NvcGUuY2hpbGRyZW4uZ2V0KHNwbGl0W2ldKTtcbiAgICAgIHdoaWxlICghaSAmJiBzY29wZS5wYXJlbnQgJiYgIWNoaWxkKSB7XG4gICAgICAgIGNoaWxkID0gKHNjb3BlID0gc2NvcGUucGFyZW50KS5jaGlsZHJlbi5nZXQoc3BsaXRbaV0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIG5hbWUgaGFzIGFuIGV4cGxpY2l0IHNjb3BlLCB0aGlzIGlzIGFuIGVycm9yP1xuICAgICAgaWYgKCFjaGlsZCkge1xuICAgICAgICBjb25zdCBzY29wZU5hbWUgPSBzcGxpdC5zbGljZSgwLCBpICsgMSkuam9pbignOjonKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSBzY29wZSAke3Njb3BlTmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHNjb3BlID0gY2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiBbdGFpbCwgc2NvcGVdO1xuICB9XG5cbiAgLy8gY2xvc2UoKSB7XG4gIC8vICAgaWYgKCF0aGlzLnBhcmVudCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgY2xvc2UgZ2xvYmFsIHNjb3BlYCk7XG4gIC8vICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAvLyAgIC8vIEFueSB1bmRlZmluZWQgaWRlbnRpZmllcnMgaW4gdGhlIHNjb3BlIGFyZSBhdXRvbWF0aWNhbGx5XG4gIC8vICAgLy8gcHJvbW90ZWQgdG8gdGhlIHBhcmVudCBzY29wZS5cbiAgLy8gICBmb3IgKGNvbnN0IFtuYW1lLCBzeW1dIG9mIHRoaXMuc3ltYm9scykge1xuICAvLyAgICAgaWYgKHN5bS5leHByKSBjb250aW51ZTsgLy8gaWYgaXQncyBkZWZpbmVkIGluIHRoZSBzY29wZSwgZG8gbm90aGluZ1xuICAvLyAgICAgY29uc3QgcGFyZW50U3ltID0gdGhpcy5wYXJlbnQuc3ltYm9scy5nZXQoc3ltKTtcbiAgLy8gICB9XG4gIC8vIH1cbn1cblxuY2xhc3MgQ2hlYXBTY29wZSBleHRlbmRzIEJhc2VTY29wZSB7XG5cbiAgLyoqIENsZWFyIGV2ZXJ5dGhpbmcgb3V0LCBtYWtpbmcgc3VyZSBldmVyeXRoaW5nIHdhcyBkZWZpbmVkLiAqL1xuICBjbGVhcigpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBzeW1dIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgaWYgKCFzeW0uZXhwcikge1xuICAgICAgICBjb25zdCBhdCA9IHN5bS5yZWYgPyBUb2tlbi5hdChzeW0ucmVmKSA6ICcnO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENoZWFwIGxvY2FsIGxhYmVsIG5ldmVyIGRlZmluZWQ6ICR7bmFtZX0ke2F0fWApO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN5bWJvbHMuY2xlYXIoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXNzZW1ibGVyIHtcblxuICAvKiogVGhlIGN1cnJlbnRseS1vcGVuIHNlZ21lbnQocykuICovXG4gIHByaXZhdGUgc2VnbWVudHM6IHJlYWRvbmx5IHN0cmluZ1tdID0gWydjb2RlJ107XG5cbiAgLyoqIERhdGEgb24gYWxsIHRoZSBzZWdtZW50cy4gKi9cbiAgcHJpdmF0ZSBzZWdtZW50RGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBtb2QuU2VnbWVudD4oKTtcblxuICAvKiogU3RhY2sgb2Ygc2VnbWVudHMgZm9yIC5wdXNoc2VnLy5wb3BzZWcuICovXG4gIHByaXZhdGUgc2VnbWVudFN0YWNrOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgc3RyaW5nW10sIENodW5rP10+ID0gW107XG5cbiAgLyoqIEFsbCBzeW1ib2xzIGluIHRoaXMgb2JqZWN0LiAqL1xuICBwcml2YXRlIHN5bWJvbHM6IFN5bWJvbFtdID0gW107XG5cbiAgLyoqIEdsb2JhbCBzeW1ib2xzLiAqL1xuICAvLyBOT1RFOiB3ZSBjb3VsZCBhZGQgJ2ZvcmNlLWltcG9ydCcsICdkZXRlY3QnLCBvciBvdGhlcnMuLi5cbiAgcHJpdmF0ZSBnbG9iYWxzID0gbmV3IE1hcDxzdHJpbmcsICdleHBvcnQnfCdpbXBvcnQnPigpO1xuXG4gIC8qKiBUaGUgY3VycmVudCBzY29wZS4gKi9cbiAgcHJpdmF0ZSBjdXJyZW50U2NvcGUgPSBuZXcgU2NvcGUoKTtcblxuICAvKiogQSBzY29wZSBmb3IgY2hlYXAgbG9jYWwgbGFiZWxzLiAqL1xuICBwcml2YXRlIGNoZWFwTG9jYWxzID0gbmV3IENoZWFwU2NvcGUoKTtcblxuICAvKiogTGlzdCBvZiBnbG9iYWwgc3ltYm9sIGluZGljZXMgdXNlZCBieSBmb3J3YXJkIHJlZnMgdG8gYW5vbnltb3VzIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBhbm9ueW1vdXNGb3J3YXJkOiBudW1iZXJbXSA9IFtdO1xuXG4gIC8qKiBMaXN0IG9mIGNodW5rL29mZnNldCBwb3NpdGlvbnMgb2YgcHJldmlvdXMgYW5vbnltb3VzIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBhbm9ueW1vdXNSZXZlcnNlOiBFeHByW10gPSBbXTtcblxuICAvKiogTWFwIG9mIGdsb2JhbCBzeW1ib2wgaW5jaWRlcyB1c2VkIGJ5IGZvcndhcmQgcmVmcyB0byByZWxhdGl2ZSBsYWJlbHMuICovXG4gIHByaXZhdGUgcmVsYXRpdmVGb3J3YXJkOiBudW1iZXJbXSA9IFtdO1xuXG4gIC8qKiBNYXAgb2YgY2h1bmsvb2Zmc2V0IHBvc2l0aW9ucyBvZiBiYWNrLXJlZmVyYWJsZSByZWxhdGl2ZSBsYWJlbHMuICovXG4gIHByaXZhdGUgcmVsYXRpdmVSZXZlcnNlOiBFeHByW10gPSBbXTtcblxuICAvKiogQWxsIHRoZSBjaHVua3Mgc28gZmFyLiAqL1xuICBwcml2YXRlIGNodW5rczogQ2h1bmtbXSA9IFtdO1xuXG4gIC8qKiBDdXJyZW50bHkgYWN0aXZlIGNodW5rICovXG4gIHByaXZhdGUgX2NodW5rOiBDaHVua3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLyoqIE5hbWUgb2YgdGhlIG5leHQgY2h1bmsgKi9cbiAgcHJpdmF0ZSBfbmFtZTogc3RyaW5nfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvKiogT3JpZ2luIG9mIHRoZSBjdXJybmV0IGNodW5rLCBpZiBmaXhlZC4gKi9cbiAgcHJpdmF0ZSBfb3JnOiBudW1iZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKiBQcmVmaXggdG8gcHJlcGVuZCB0byBhbGwgc2VnbWVudCBuYW1lcy4gKi9cbiAgcHJpdmF0ZSBfc2VnbWVudFByZWZpeCA9ICcnO1xuXG4gIC8qKiBDdXJyZW50IHNvdXJjZSBsb2NhdGlvbiwgZm9yIGVycm9yIG1lc3NhZ2VzLiAqL1xuICBwcml2YXRlIF9zb3VyY2U/OiBTb3VyY2VJbmZvO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNwdSA9IENwdS5QMDIsIHJlYWRvbmx5IG9wdHM6IEFzc2VtYmxlci5PcHRpb25zID0ge30pIHt9XG5cbiAgcHJpdmF0ZSBnZXQgY2h1bmsoKTogQ2h1bmsge1xuICAgIC8vIG1ha2UgY2h1bmsgb25seSB3aGVuIG5lZWRlZFxuICAgIHRoaXMuZW5zdXJlQ2h1bmsoKTtcbiAgICByZXR1cm4gdGhpcy5fY2h1bmshO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDaHVuaygpIHtcbiAgICBpZiAoIXRoaXMuX2NodW5rKSB7XG4gICAgICAvLyBOT1RFOiBtdWx0aXBsZSBzZWdtZW50cyBPSyBpZiBkaXNqb2ludCBtZW1vcnkuLi5cbiAgICAgIC8vIGlmICh0aGlzLl9vcmcgIT0gbnVsbCAmJiB0aGlzLnNlZ21lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgLy8gICB0aGlzLmZhaWwoYC5vcmcgY2h1bmtzIG11c3QgYmUgc2luZ2xlLXNlZ21lbnRgKTtcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuX2NodW5rID0ge3NlZ21lbnRzOiB0aGlzLnNlZ21lbnRzLCBkYXRhOiBbXX07XG4gICAgICBpZiAodGhpcy5fb3JnICE9IG51bGwpIHRoaXMuX2NodW5rLm9yZyA9IHRoaXMuX29yZztcbiAgICAgIGlmICh0aGlzLl9uYW1lKSB0aGlzLl9jaHVuay5uYW1lID0gdGhpcy5fbmFtZTtcbiAgICAgIHRoaXMuY2h1bmtzLnB1c2godGhpcy5fY2h1bmspO1xuICAgIH1cbiAgfVxuXG4gIGRlZmluZWRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJbiB0aGlzIGNhc2UsIGl0J3Mgb2theSB0byB0cmF2ZXJzZSB1cCB0aGUgc2NvcGUgY2hhaW4gc2luY2UgaWYgd2VcbiAgICAvLyB3ZXJlIHRvIHJlZmVyZW5jZSB0aGUgc3ltYm9sLCBpdCdzIGd1YXJhbnRlZWQgdG8gYmUgZGVmaW5lZCBzb21laG93LlxuICAgIGxldCBzY29wZTogU2NvcGV8dW5kZWZpbmVkID0gdGhpcy5jdXJyZW50U2NvcGU7XG4gICAgY29uc3QgdW5zY29wZWQgPSAhc3ltLmluY2x1ZGVzKCc6OicpO1xuICAgIGRvIHtcbiAgICAgIGNvbnN0IHMgPSBzY29wZS5yZXNvbHZlKHN5bSwgZmFsc2UpO1xuICAgICAgaWYgKHMpIHJldHVybiBCb29sZWFuKHMuZXhwcik7XG4gICAgfSB3aGlsZSAodW5zY29wZWQgJiYgKHNjb3BlID0gc2NvcGUucGFyZW50KSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3RhbnRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgc3ltYm9sIGluIGEgZGlmZmVyZW50IHNjb3BlLCBpdCdzIG5vdCBhY3R1YWxseSBjb25zdGFudC5cbiAgICBjb25zdCBzID0gdGhpcy5jdXJyZW50U2NvcGUucmVzb2x2ZShzeW0sIGZhbHNlKTtcbiAgICByZXR1cm4gQm9vbGVhbihzICYmIHMuZXhwciAmJiAhKHMuaWQhIDwgMCkpO1xuICB9XG5cbiAgcmVmZXJlbmNlZFN5bWJvbChzeW06IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIElmIG5vdCByZWZlcmVuY2VkIGluIHRoaXMgc2NvcGUsIHdlIGRvbid0IGtub3cgd2hpY2ggaXQgaXMuLi5cbiAgICAvLyBOT1RFOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIGNhNjUuXG4gICAgY29uc3QgcyA9IHRoaXMuY3VycmVudFNjb3BlLnJlc29sdmUoc3ltLCBmYWxzZSk7XG4gICAgcmV0dXJuIHMgIT0gbnVsbDsgLy8gTk9URTogdGhpcyBjb3VudHMgZGVmaW5pdGlvbnMuXG4gIH1cblxuICBldmFsdWF0ZShleHByOiBFeHByKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBpZiAoZXhwci5vcCA9PT0gJ251bScgJiYgIWV4cHIubWV0YT8ucmVsKSByZXR1cm4gZXhwci5udW07XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIHByaXZhdGUgZ2V0IHBjKCk6IG51bWJlcnx1bmRlZmluZWQge1xuICAvLyAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgLy8gICByZXR1cm4gdGhpcy5fb3JnICsgdGhpcy5vZmZzZXQ7XG4gIC8vIH1cblxuICBwYygpOiBFeHByIHtcbiAgICBjb25zdCBudW0gPSB0aGlzLmNodW5rLmRhdGEubGVuZ3RoOyAvLyBOT1RFOiBiZWZvcmUgY291bnRpbmcgY2h1bmtzXG4gICAgY29uc3QgbWV0YTogRXhwci5NZXRhID0ge3JlbDogdHJ1ZSwgY2h1bms6IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDF9O1xuICAgIGlmICh0aGlzLl9jaHVuaz8ub3JnICE9IG51bGwpIG1ldGEub3JnID0gdGhpcy5fY2h1bmsub3JnO1xuICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHtvcDogJ251bScsIG51bSwgbWV0YX0pO1xuICB9XG5cbiAgcmVzb2x2ZShleHByOiBFeHByKTogRXhwciB7XG4gICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgd2hpbGUgKGUub3AgPT09ICdzeW0nICYmIGUuc3ltKSB7XG4gICAgICAgIGUgPSB0aGlzLnJlc29sdmVTeW1ib2woZS5zeW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEV4cHIuZXZhbHVhdGUocmVjKGUpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlc29sdmVTeW1ib2wobmFtZTogc3RyaW5nKTogRXhwciB7XG4gICAgaWYgKG5hbWUgPT09ICcqJykge1xuICAgICAgcmV0dXJuIHRoaXMucGMoKTtcbiAgICB9IGVsc2UgaWYgKC9eOlxcKyskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgZm9yd2FyZCByZWZcbiAgICAgIGNvbnN0IGkgPSBuYW1lLmxlbmd0aCAtIDI7XG4gICAgICBsZXQgbnVtID0gdGhpcy5hbm9ueW1vdXNGb3J3YXJkW2ldO1xuICAgICAgaWYgKG51bSAhPSBudWxsKSByZXR1cm4ge29wOiAnc3ltJywgbnVtfTtcbiAgICAgIHRoaXMuYW5vbnltb3VzRm9yd2FyZFtpXSA9IG51bSA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh7aWQ6IG51bX0pO1xuICAgICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgfSBlbHNlIGlmICgvXlxcKyskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBmb3J3YXJkIHJlZlxuICAgICAgbGV0IG51bSA9IHRoaXMucmVsYXRpdmVGb3J3YXJkW25hbWUubGVuZ3RoIC0gMV07XG4gICAgICBpZiAobnVtICE9IG51bGwpIHJldHVybiB7b3A6ICdzeW0nLCBudW19O1xuICAgICAgdGhpcy5yZWxhdGl2ZUZvcndhcmRbbmFtZS5sZW5ndGggLSAxXSA9IG51bSA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh7aWQ6IG51bX0pO1xuICAgICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgfSBlbHNlIGlmICgvXjotKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIGFub255bW91cyBiYWNrIHJlZlxuICAgICAgY29uc3QgaSA9IHRoaXMuYW5vbnltb3VzUmV2ZXJzZS5sZW5ndGggLSBuYW1lLmxlbmd0aCArIDE7XG4gICAgICBpZiAoaSA8IDApIHRoaXMuZmFpbChgQmFkIGFub255bW91cyBiYWNrcmVmOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gdGhpcy5hbm9ueW1vdXNSZXZlcnNlW2ldO1xuICAgIH0gZWxzZSBpZiAoL14tKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGJhY2sgcmVmXG4gICAgICBjb25zdCBleHByID0gdGhpcy5yZWxhdGl2ZVJldmVyc2VbbmFtZS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChleHByID09IG51bGwpIHRoaXMuZmFpbChgQmFkIHJlbGF0aXZlIGJhY2tyZWY6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBleHByO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IG5hbWUuc3RhcnRzV2l0aCgnQCcpID8gdGhpcy5jaGVhcExvY2FscyA6IHRoaXMuY3VycmVudFNjb3BlO1xuICAgIGNvbnN0IHN5bSA9IHNjb3BlLnJlc29sdmUobmFtZSwgdHJ1ZSk7XG4gICAgaWYgKHN5bS5leHByKSByZXR1cm4gc3ltLmV4cHI7XG4gICAgLy8gaWYgdGhlIGV4cHJlc3Npb24gaXMgbm90IHlldCBrbm93biB0aGVuIHJlZmVyIHRvIHRoZSBzeW1ib2wgdGFibGUsXG4gICAgLy8gYWRkaW5nIGl0IGlmIG5lY2Vzc2FyeS5cbiAgICBpZiAoc3ltLmlkID09IG51bGwpIHtcbiAgICAgIHN5bS5pZCA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaChzeW0pO1xuICAgIH1cbiAgICByZXR1cm4ge29wOiAnc3ltJywgbnVtOiBzeW0uaWR9O1xuICB9XG5cbiAgLy8gTm8gYmFua3MgYXJlIHJlc29sdmVkIHlldC5cbiAgY2h1bmtEYXRhKGNodW5rOiBudW1iZXIpOiB7b3JnPzogbnVtYmVyfSB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSB6cCBzZWdtZW50cz9cbiAgICByZXR1cm4ge29yZzogdGhpcy5jaHVua3NbY2h1bmtdLm9yZ307XG4gIH1cblxuICBjbG9zZVNjb3BlcygpIHtcbiAgICB0aGlzLmNoZWFwTG9jYWxzLmNsZWFyKCk7XG4gICAgLy8gTmVlZCB0byBmaW5kIGFueSB1bmRlY2xhcmVkIHN5bWJvbHMgaW4gbmVzdGVkIHNjb3BlcyBhbmQgbGlua1xuICAgIC8vIHRoZW0gdG8gYSBwYXJlbnQgc2NvcGUgc3ltYm9sIGlmIHBvc3NpYmxlLlxuICAgIGZ1bmN0aW9uIGNsb3NlKHNjb3BlOiBTY29wZSkge1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzY29wZS5jaGlsZHJlbi52YWx1ZXMoKSkge1xuICAgICAgICBjbG9zZShjaGlsZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHNjb3BlLmFub255bW91c0NoaWxkcmVuKSB7XG4gICAgICAgIGNsb3NlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2Ygc2NvcGUuc3ltYm9scykge1xuICAgICAgICBpZiAoc3ltLmV4cHIgfHwgc3ltLmlkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoc2NvcGUucGFyZW50KSB7XG4gICAgICAgICAgLy8gVE9ETyAtIHJlY29yZCB3aGVyZSBpdCB3YXMgcmVmZXJlbmNlZD9cbiAgICAgICAgICBpZiAoc3ltLnNjb3BlZCkgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgICAgICAgIGNvbnN0IHBhcmVudFN5bSA9IHNjb3BlLnBhcmVudC5zeW1ib2xzLmdldChuYW1lKTtcbiAgICAgICAgICBpZiAoIXBhcmVudFN5bSkge1xuICAgICAgICAgICAgLy8ganVzdCBhbGlhcyBpdCBkaXJlY3RseSBpbiB0aGUgcGFyZW50IHNjb3BlXG4gICAgICAgICAgICBzY29wZS5wYXJlbnQuc3ltYm9scy5zZXQobmFtZSwgc3ltKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudFN5bS5pZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzeW0uZXhwciA9IHtvcDogJ3N5bScsIG51bTogcGFyZW50U3ltLmlkfTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudFN5bS5leHByKSB7XG4gICAgICAgICAgICBzeW0uZXhwciA9IHBhcmVudFN5bS5leHByO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBtdXN0IGhhdmUgZWl0aGVyIGlkIG9yIGV4cHIuLi4/XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGU6ICR7bmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gaGFuZGxlIGdsb2JhbCBzY29wZSBzZXBhcmF0ZWx5Li4uXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdGVzdCBjYXNlOiByZWYgYSBuYW1lIGluIHR3byBjaGlsZCBzY29wZXMsIGRlZmluZSBpdCBpbiBncmFuZHBhcmVudFxuXG4gICAgaWYgKHRoaXMuY3VycmVudFNjb3BlLnBhcmVudCkge1xuICAgICAgLy8gVE9ETyAtIHJlY29yZCB3aGVyZSBpdCB3YXMgb3BlbmVkP1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTY29wZSBuZXZlciBjbG9zZWRgKTtcbiAgICB9XG4gICAgY2xvc2UodGhpcy5jdXJyZW50U2NvcGUpO1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgZ2xvYmFsXSBvZiB0aGlzLmdsb2JhbHMpIHtcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMuY3VycmVudFNjb3BlLnN5bWJvbHMuZ2V0KG5hbWUpO1xuICAgICAgaWYgKGdsb2JhbCA9PT0gJ2V4cG9ydCcpIHtcbiAgICAgICAgaWYgKCFzeW0/LmV4cHIpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sICcke25hbWV9JyB1bmRlZmluZWRgKTtcbiAgICAgICAgaWYgKHN5bS5pZCA9PSBudWxsKSB7XG4gICAgICAgICAgc3ltLmlkID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAgICAgICB0aGlzLnN5bWJvbHMucHVzaChzeW0pO1xuICAgICAgICB9XG4gICAgICAgIHN5bS5leHBvcnQgPSBuYW1lO1xuICAgICAgfSBlbHNlIGlmIChnbG9iYWwgPT09ICdpbXBvcnQnKSB7XG4gICAgICAgIGlmICghc3ltKSBjb250aW51ZTsgLy8gb2theSB0byBpbXBvcnQgYnV0IG5vdCB1c2UuXG4gICAgICAgIC8vIFRPRE8gLSByZWNvcmQgYm90aCBwb3NpdGlvbnM/XG4gICAgICAgIGlmIChzeW0uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBBbHJlYWR5IGRlZmluZWQ6ICR7bmFtZX1gKTtcbiAgICAgICAgc3ltLmV4cHIgPSB7b3A6ICdpbScsIHN5bTogbmFtZX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnROZXZlcihnbG9iYWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2YgdGhpcy5jdXJyZW50U2NvcGUuc3ltYm9scykge1xuICAgICAgaWYgKCFzeW0uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgIH1cbiAgfVxuXG4gIG1vZHVsZSgpOiBNb2R1bGUge1xuICAgIHRoaXMuY2xvc2VTY29wZXMoKTtcblxuICAgIC8vIFRPRE8gLSBoYW5kbGUgaW1wb3J0cyBhbmQgZXhwb3J0cyBvdXQgb2YgdGhlIHNjb3BlXG4gICAgLy8gVE9ETyAtIGFkZCAuc2NvcGUgYW5kIC5lbmRzY29wZSBhbmQgZm9yd2FyZCBzY29wZSB2YXJzIGF0IGVuZCB0byBwYXJlbnRcblxuICAgIC8vIFByb2Nlc3MgYW5kIHdyaXRlIHRoZSBkYXRhXG4gICAgY29uc3QgY2h1bmtzOiBtb2QuQ2h1bms8VWludDhBcnJheT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGNodW5rcy5wdXNoKHsuLi5jaHVuaywgZGF0YTogVWludDhBcnJheS5mcm9tKGNodW5rLmRhdGEpfSk7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbHM6IG1vZC5TeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgaWYgKHN5bWJvbC5leHByID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sIHVuZGVmaW5lZGApO1xuICAgICAgY29uc3Qgb3V0OiBtb2QuU3ltYm9sID0ge2V4cHI6IHN5bWJvbC5leHByfTtcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0ICE9IG51bGwpIG91dC5leHBvcnQgPSBzeW1ib2wuZXhwb3J0O1xuICAgICAgc3ltYm9scy5wdXNoKG91dCk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnRzOiBtb2QuU2VnbWVudFtdID0gWy4uLnRoaXMuc2VnbWVudERhdGEudmFsdWVzKCldO1xuICAgIHJldHVybiB7Y2h1bmtzLCBzeW1ib2xzLCBzZWdtZW50c307XG4gIH1cblxuICBsaW5lKHRva2VuczogVG9rZW5bXSkge1xuICAgIHRoaXMuX3NvdXJjZSA9IHRva2Vuc1swXS5zb3VyY2U7XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCAzICYmIFRva2VuLmVxKHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV0sIFRva2VuLkNPTE9OKSkge1xuICAgICAgdGhpcy5sYWJlbCh0b2tlbnNbMF0pO1xuICAgIH0gZWxzZSBpZiAoVG9rZW4uZXEodG9rZW5zWzFdLCBUb2tlbi5BU1NJR04pKSB7XG4gICAgICB0aGlzLmFzc2lnbihUb2tlbi5zdHIodG9rZW5zWzBdKSwgdGhpcy5wYXJzZUV4cHIodG9rZW5zLCAyKSk7XG4gICAgfSBlbHNlIGlmIChUb2tlbi5lcSh0b2tlbnNbMV0sIFRva2VuLlNFVCkpIHtcbiAgICAgIHRoaXMuc2V0KFRva2VuLnN0cih0b2tlbnNbMF0pLCB0aGlzLnBhcnNlRXhwcih0b2tlbnMsIDIpKTtcbiAgICB9IGVsc2UgaWYgKHRva2Vuc1swXS50b2tlbiA9PT0gJ2NzJykge1xuICAgICAgdGhpcy5kaXJlY3RpdmUodG9rZW5zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnN0cnVjdGlvbih0b2tlbnMpO1xuICAgIH1cbiAgfVxuXG4gIHRva2Vucyhzb3VyY2U6IFRva2VuU291cmNlKSB7XG4gICAgbGV0IGxpbmU7XG4gICAgd2hpbGUgKChsaW5lID0gc291cmNlLm5leHQoKSkpIHtcbiAgICAgIHRoaXMubGluZShsaW5lKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB0b2tlbnNBc3luYyhzb3VyY2U6IFRva2VuU291cmNlLkFzeW5jKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGxpbmU7XG4gICAgd2hpbGUgKChsaW5lID0gYXdhaXQgc291cmNlLm5leHRBc3luYygpKSkge1xuICAgICAgdGhpcy5saW5lKGxpbmUpO1xuICAgIH1cbiAgfVxuXG5cbiAgZGlyZWN0aXZlKHRva2VuczogVG9rZW5bXSkge1xuICAgIC8vIFRPRE8gLSByZWNvcmQgbGluZSBpbmZvcm1hdGlvbiwgcmV3cmFwIGVycm9yIG1lc3NhZ2VzP1xuICAgIHN3aXRjaCAoVG9rZW4uc3RyKHRva2Vuc1swXSkpIHtcbiAgICAgIGNhc2UgJy5vcmcnOiByZXR1cm4gdGhpcy5vcmcodGhpcy5wYXJzZUNvbnN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLnJlbG9jJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5yZWxvYygpO1xuICAgICAgY2FzZSAnLmFzc2VydCc6IHJldHVybiB0aGlzLmFzc2VydCh0aGlzLnBhcnNlRXhwcih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5zZWdtZW50JzogcmV0dXJuIHRoaXMuc2VnbWVudCguLi50aGlzLnBhcnNlU2VnbWVudExpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuYnl0ZSc6IHJldHVybiB0aGlzLmJ5dGUoLi4udGhpcy5wYXJzZURhdGFMaXN0KHRva2VucywgdHJ1ZSkpO1xuICAgICAgY2FzZSAnLnJlcyc6IHJldHVybiB0aGlzLnJlcyguLi50aGlzLnBhcnNlUmVzQXJncyh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy53b3JkJzogcmV0dXJuIHRoaXMud29yZCguLi50aGlzLnBhcnNlRGF0YUxpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZnJlZSc6IHJldHVybiB0aGlzLmZyZWUodGhpcy5wYXJzZUNvbnN0KHRva2VucyksIHRva2Vuc1swXSk7XG4gICAgICBjYXNlICcuc2VnbWVudHByZWZpeCc6IHJldHVybiB0aGlzLnNlZ21lbnRQcmVmaXgodGhpcy5wYXJzZVN0cih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5pbXBvcnQnOiByZXR1cm4gdGhpcy5pbXBvcnQoLi4udGhpcy5wYXJzZUlkZW50aWZpZXJMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLmV4cG9ydCc6IHJldHVybiB0aGlzLmV4cG9ydCguLi50aGlzLnBhcnNlSWRlbnRpZmllckxpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuc2NvcGUnOiByZXR1cm4gdGhpcy5zY29wZSh0aGlzLnBhcnNlT3B0aW9uYWxJZGVudGlmaWVyKHRva2VucykpO1xuICAgICAgY2FzZSAnLmVuZHNjb3BlJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5lbmRTY29wZSgpO1xuICAgICAgY2FzZSAnLnByb2MnOiByZXR1cm4gdGhpcy5wcm9jKHRoaXMucGFyc2VSZXF1aXJlZElkZW50aWZpZXIodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZW5kcHJvYyc6IHJldHVybiB0aGlzLnBhcnNlTm9BcmdzKHRva2VucyksIHRoaXMuZW5kUHJvYygpO1xuICAgICAgY2FzZSAnLnB1c2hzZWcnOiByZXR1cm4gdGhpcy5wdXNoU2VnKC4uLnRoaXMucGFyc2VTZWdtZW50TGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5wb3BzZWcnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLnBvcFNlZygpO1xuICAgICAgY2FzZSAnLm1vdmUnOiByZXR1cm4gdGhpcy5tb3ZlKC4uLnRoaXMucGFyc2VNb3ZlQXJncyh0b2tlbnMpKTtcbiAgICB9XG4gICAgdGhpcy5mYWlsKGBVbmtub3duIGRpcmVjdGl2ZTogJHtUb2tlbi5uYW1lQXQodG9rZW5zWzBdKX1gKTtcbiAgfVxuXG4gIGxhYmVsKGxhYmVsOiBzdHJpbmd8VG9rZW4pIHtcbiAgICBsZXQgaWRlbnQ6IHN0cmluZztcbiAgICBsZXQgdG9rZW46IFRva2VufHVuZGVmaW5lZDtcbiAgICBjb25zdCBleHByID0gdGhpcy5wYygpO1xuICAgIGlmICh0eXBlb2YgbGFiZWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZGVudCA9IGxhYmVsO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZGVudCA9IFRva2VuLnN0cih0b2tlbiA9IGxhYmVsKTtcbiAgICAgIGlmIChsYWJlbC5zb3VyY2UpIGV4cHIuc291cmNlID0gbGFiZWwuc291cmNlO1xuICAgIH1cbiAgICBpZiAoaWRlbnQgPT09ICc6Jykge1xuICAgICAgLy8gYW5vbnltb3VzIGxhYmVsIC0gc2hpZnQgYW55IGZvcndhcmQgcmVmcyBvZmYsIGFuZCBwdXNoIG9udG8gdGhlIGJhY2tzLlxuICAgICAgdGhpcy5hbm9ueW1vdXNSZXZlcnNlLnB1c2goZXhwcik7XG4gICAgICBjb25zdCBzeW0gPSB0aGlzLmFub255bW91c0ZvcndhcmQuc2hpZnQoKTtcbiAgICAgIGlmIChzeW0gIT0gbnVsbCkgdGhpcy5zeW1ib2xzW3N5bV0uZXhwciA9IGV4cHI7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgvXlxcKyskLy50ZXN0KGlkZW50KSkge1xuICAgICAgLy8gcmVsYXRpdmUgZm9yd2FyZCByZWYgLSBmaWxsIGluIGdsb2JhbCBzeW1ib2wgd2UgbWFkZSBlYXJsaWVyXG4gICAgICBjb25zdCBzeW0gPSB0aGlzLnJlbGF0aXZlRm9yd2FyZFtpZGVudC5sZW5ndGggLSAxXTtcbiAgICAgIGRlbGV0ZSB0aGlzLnJlbGF0aXZlRm9yd2FyZFtpZGVudC5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChzeW0gIT0gbnVsbCkgdGhpcy5zeW1ib2xzW3N5bV0uZXhwciA9IGV4cHI7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgvXi0rJC8udGVzdChpZGVudCkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGJhY2tyZWYgLSBzdG9yZSB0aGUgZXhwciBmb3IgbGF0ZXJcbiAgICAgIHRoaXMucmVsYXRpdmVSZXZlcnNlW2lkZW50Lmxlbmd0aCAtIDFdID0gZXhwcjtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlkZW50LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgdGhpcy5jaGVhcExvY2Fscy5jbGVhcigpO1xuICAgICAgaWYgKCF0aGlzLmNodW5rLm5hbWUgJiYgIXRoaXMuY2h1bmsuZGF0YS5sZW5ndGgpIHRoaXMuY2h1bmsubmFtZSA9IGlkZW50O1xuICAgIH1cbiAgICB0aGlzLmFzc2lnblN5bWJvbChpZGVudCwgZmFsc2UsIGV4cHIsIHRva2VuKTtcbiAgICAvLyBjb25zdCBzeW1ib2wgPSB0aGlzLnNjb3BlLnJlc29sdmUoc3RyLCB0cnVlKTtcbiAgICAvLyBpZiAoc3ltYm9sLmV4cHIpIHRocm93IG5ldyBFcnJvcihgQWxyZWFkeSBkZWZpbmVkOiAke2xhYmVsfWApO1xuICAgIC8vIGlmICghdGhpcy5jaHVuaykgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlP2ApO1xuICAgIC8vIGNvbnN0IGNodW5rSWQgPSB0aGlzLmNodW5rcy5sZW5ndGggLSAxOyAvLyBtdXN0IGJlIEFGVEVSIHRoaXMuY2h1bmtcbiAgICAvLyBzeW1ib2wuZXhwciA9IHtvcDogJ29mZicsIG51bTogdGhpcy5vZmZzZXQsIGNodW5rOiBjaHVua0lkfTtcbiAgICAvLyBpZiAoc291cmNlKSBzeW1ib2wuZXhwci5zb3VyY2UgPSBzb3VyY2U7XG4gICAgLy8gLy8gQWRkIHRoZSBsYWJlbCB0byB0aGUgY3VycmVudCBjaHVuay4uLj9cbiAgICAvLyAvLyBSZWNvcmQgdGhlIGRlZmluaXRpb24sIGV0Yy4uLj9cbiAgfVxuXG4gIGFzc2lnbihpZGVudDogc3RyaW5nLCBleHByOiBFeHByfG51bWJlcikge1xuICAgIGlmIChpZGVudC5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIHRoaXMuZmFpbChgQ2hlYXAgbG9jYWxzIG1heSBvbmx5IGJlIGxhYmVsczogJHtpZGVudH1gKTtcbiAgICB9XG4gICAgLy8gTm93IG1ha2UgdGhlIGFzc2lnbm1lbnQuXG4gICAgaWYgKHR5cGVvZiBleHByICE9PSAnbnVtYmVyJykgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICB0aGlzLmFzc2lnblN5bWJvbChpZGVudCwgZmFsc2UsIGV4cHIpO1xuICB9XG5cbiAgc2V0KGlkZW50OiBzdHJpbmcsIGV4cHI6IEV4cHJ8bnVtYmVyKSB7XG4gICAgaWYgKGlkZW50LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgdGhpcy5mYWlsKGBDaGVhcCBsb2NhbHMgbWF5IG9ubHkgYmUgbGFiZWxzOiAke2lkZW50fWApO1xuICAgIH1cbiAgICAvLyBOb3cgbWFrZSB0aGUgYXNzaWdubWVudC5cbiAgICBpZiAodHlwZW9mIGV4cHIgIT09ICdudW1iZXInKSBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpO1xuICAgIHRoaXMuYXNzaWduU3ltYm9sKGlkZW50LCB0cnVlLCBleHByKTtcbiAgfVxuXG4gIGFzc2lnblN5bWJvbChpZGVudDogc3RyaW5nLCBtdXQ6IGJvb2xlYW4sIGV4cHI6IEV4cHJ8bnVtYmVyLCB0b2tlbj86IFRva2VuKSB7XG4gICAgLy8gTk9URTogKiBfd2lsbF8gZ2V0IGN1cnJlbnQgY2h1bmshXG4gICAgaWYgKHR5cGVvZiBleHByID09PSAnbnVtYmVyJykgZXhwciA9IHtvcDogJ251bScsIG51bTogZXhwcn07XG4gICAgY29uc3Qgc2NvcGUgPSBpZGVudC5zdGFydHNXaXRoKCdAJykgPyB0aGlzLmNoZWFwTG9jYWxzIDogdGhpcy5jdXJyZW50U2NvcGU7XG4gICAgLy8gTk9URTogVGhpcyBpcyBpbmNvcnJlY3QgLSBpdCB3aWxsIGxvb2sgdXAgdGhlIHNjb3BlIGNoYWluIHdoZW4gaXRcbiAgICAvLyBzaG91bGRuJ3QuICBNdXRhYmxlcyBtYXkgb3IgbWF5IG5vdCB3YW50IHRoaXMsIGltbXV0YWJsZXMgbXVzdCBub3QuXG4gICAgLy8gV2hldGhlciB0aGlzIGlzIHRpZWQgdG8gYWxsb3dGd2RSZWYgb3Igbm90IGlzIHVuY2xlYXIuICBJdCdzIGFsc29cbiAgICAvLyB1bmNsZWFyIHdoZXRoZXIgd2Ugd2FudCB0byBhbGxvdyBkZWZpbmluZyBzeW1ib2xzIGluIG91dHNpZGUgc2NvcGVzOlxuICAgIC8vICAgOjpmb28gPSA0M1xuICAgIC8vIEZXSVcsIGNhNjUgX2RvZXNfIGFsbG93IHRoaXMsIGFzIHdlbGwgYXMgZm9vOjpiYXIgPSA0MiBhZnRlciB0aGUgc2NvcGUuXG4gICAgbGV0IHN5bSA9IHNjb3BlLnJlc29sdmUoaWRlbnQsICFtdXQpO1xuICAgIGlmIChzeW0gJiYgKG11dCAhPT0gKHN5bS5pZCEgPCAwKSkpIHtcbiAgICAgIHRoaXMuZmFpbChgQ2Fubm90IGNoYW5nZSBtdXRhYmlsaXR5IG9mICR7aWRlbnR9YCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAobXV0ICYmIGV4cHIub3AgIT0gJ251bScpIHtcbiAgICAgIHRoaXMuZmFpbChgTXV0YWJsZSBzZXQgcmVxdWlyZXMgY29uc3RhbnRgLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmICghc3ltKSB7XG4gICAgICBpZiAoIW11dCkgdGhyb3cgbmV3IEVycm9yKGBpbXBvc3NpYmxlYCk7XG4gICAgICBzY29wZS5zeW1ib2xzLnNldChpZGVudCwgc3ltID0ge2lkOiAtMX0pO1xuICAgIH0gZWxzZSBpZiAoIW11dCAmJiBzeW0uZXhwcikge1xuICAgICAgY29uc3Qgb3JpZyA9XG4gICAgICAgICAgc3ltLmV4cHIuc291cmNlID8gYFxcbk9yaWdpbmFsbHkgZGVmaW5lZCR7VG9rZW4uYXQoc3ltLmV4cHIpfWAgOiAnJztcbiAgICAgIGNvbnN0IG5hbWUgPSB0b2tlbiA/IFRva2VuLm5hbWVBdCh0b2tlbikgOlxuICAgICAgICAgIGlkZW50ICsgKHRoaXMuX3NvdXJjZSA/IFRva2VuLmF0KHtzb3VyY2U6IHRoaXMuX3NvdXJjZX0pIDogJycpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWRlZmluaW5nIHN5bWJvbCAke25hbWV9JHtvcmlnfWApO1xuICAgIH1cbiAgICBzeW0uZXhwciA9IGV4cHI7XG4gIH1cblxuICBpbnN0cnVjdGlvbihtbmVtb25pYzogc3RyaW5nLCBhcmc/OiBBcmd8c3RyaW5nKTogdm9pZDtcbiAgaW5zdHJ1Y3Rpb24odG9rZW5zOiBUb2tlbltdKTogdm9pZDtcbiAgaW5zdHJ1Y3Rpb24oLi4uYXJnczogW1Rva2VuW11dfFtzdHJpbmcsIChBcmd8c3RyaW5nKT9dKTogdm9pZCB7XG4gICAgbGV0IG1uZW1vbmljOiBzdHJpbmc7XG4gICAgbGV0IGFyZzogQXJnO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSAmJiBBcnJheS5pc0FycmF5KGFyZ3NbMF0pKSB7XG4gICAgICAvLyBoYW5kbGUgdGhlIGxpbmUuLi5cbiAgICAgIGNvbnN0IHRva2VucyA9IGFyZ3NbMF07XG4gICAgICBtbmVtb25pYyA9IFRva2VuLmV4cGVjdElkZW50aWZpZXIodG9rZW5zWzBdKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgYXJnID0gdGhpcy5wYXJzZUFyZyh0b2tlbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBwYXJzZSB0aGUgdG9rZW5zIGZpcnN0XG4gICAgICBtbmVtb25pYyA9IGFyZ3NbMF0gYXMgc3RyaW5nO1xuICAgICAgY29uc3QgdG9rZW5pemVyID0gbmV3IFRva2VuaXplcihhcmdzWzFdKTtcbiAgICAgIGFyZyA9IHRoaXMucGFyc2VBcmcodG9rZW5pemVyLm5leHQoKSEsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBbbW5lbW9uaWMsIGFyZ10gPSBhcmdzIGFzIFtzdHJpbmcsIEFyZ107XG4gICAgICBpZiAoIWFyZykgYXJnID0gWydpbXAnXTtcbiAgICAgIG1uZW1vbmljID0gbW5lbW9uaWMudG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgLy8gbWF5IG5lZWQgdG8gc2l6ZSB0aGUgYXJnLCBkZXBlbmRpbmcuXG4gICAgLy8gY3B1IHdpbGwgdGFrZSAnYWRkJywgJ2EseCcsIGFuZCAnYSx5JyBhbmQgaW5kaWNhdGUgd2hpY2ggaXQgYWN0dWFsbHkgaXMuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5jcHUub3AobW5lbW9uaWMpOyAvLyB3aWxsIHRocm93IGlmIG1uZW1vbmljIHVua25vd25cbiAgICBjb25zdCBtID0gYXJnWzBdO1xuICAgIGlmIChtID09PSAnYWRkJyB8fCBtID09PSAnYSx4JyB8fCBtID09PSAnYSx5Jykge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBhZGRyZXNzIG1uZW1vbmljc1xuICAgICAgY29uc3QgZXhwciA9IGFyZ1sxXSE7XG4gICAgICBjb25zdCBzID0gZXhwci5tZXRhPy5zaXplIHx8IDI7XG4gICAgICBpZiAobSA9PT0gJ2FkZCcgJiYgcyA9PT0gMSAmJiAnenBnJyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy56cGchLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2FkZCcgJiYgJ2FicycgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuYWJzISwgMiwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhZGQnICYmICdyZWwnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWxhdGl2ZShvcHMucmVsISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHgnICYmIHMgPT09IDEgJiYgJ3pweCcgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuenB4ISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHgnICYmICdhYngnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLmFieCEsIDIsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYSx5JyAmJiBzID09PSAxICYmICd6cHknIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLnpweSEsIDEsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYSx5JyAmJiAnYWJ5JyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy5hYnkhLCAyLCBleHByKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmFpbChgQmFkIGFkZHJlc3MgbW9kZSAke219IGZvciAke21uZW1vbmljfWApO1xuICAgIH1cbiAgICAvLyBBbGwgb3RoZXIgbW5lbW9uaWNzXG4gICAgaWYgKG0gaW4gb3BzKSB7XG4gICAgICBjb25zdCBhcmdMZW4gPSB0aGlzLmNwdS5hcmdMZW4obSk7XG4gICAgICBpZiAobSA9PT0gJ3JlbCcpIHJldHVybiB0aGlzLnJlbGF0aXZlKG9wc1ttXSEsIGFyZ0xlbiwgYXJnWzFdISk7XG4gICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzW21dISwgYXJnTGVuLCBhcmdbMV0hKTtcbiAgICB9XG4gICAgdGhpcy5mYWlsKGBCYWQgYWRkcmVzcyBtb2RlICR7bX0gZm9yICR7bW5lbW9uaWN9YCk7XG4gIH1cblxuICBwYXJzZUFyZyh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IEFyZyB7XG4gICAgLy8gTG9vayBmb3IgcGFyZW5zL2JyYWNrZXRzIGFuZC9vciBhIGNvbW1hXG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IHN0YXJ0KSByZXR1cm4gWydpbXAnXTtcbiAgICBjb25zdCBmcm9udCA9IHRva2Vuc1tzdGFydF07XG4gICAgY29uc3QgbmV4dCA9IHRva2Vuc1tzdGFydCArIDFdO1xuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSBzdGFydCArIDEpIHtcbiAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGZyb250LCAnYScpKSByZXR1cm4gWydhY2MnXTtcbiAgICB9IGVsc2UgaWYgKFRva2VuLmVxKGZyb250LCBUb2tlbi5JTU1FRElBVEUpKSB7XG4gICAgICByZXR1cm4gWydpbW0nLCBFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0ICsgMSldO1xuICAgIH1cbiAgICAvLyBMb29rIGZvciByZWxhdGl2ZSBvciBhbm9ueW1vdXMgbGFiZWxzLCB3aGljaCBhcmUgbm90IHZhbGlkIG9uIHRoZWlyIG93blxuICAgIGlmIChUb2tlbi5lcShmcm9udCwgVG9rZW4uQ09MT04pICYmIHRva2Vucy5sZW5ndGggPT09IHN0YXJ0ICsgMiAmJlxuICAgICAgICBuZXh0LnRva2VuID09PSAnb3AnICYmIC9eWy0rXSskLy50ZXN0KG5leHQuc3RyKSkge1xuICAgICAgLy8gYW5vbnltb3VzIGxhYmVsXG4gICAgICByZXR1cm4gWydhZGQnLCB7b3A6ICdzeW0nLCBzeW06ICc6JyArIG5leHQuc3RyfV07XG4gICAgfSBlbHNlIGlmICh0b2tlbnMubGVuZ3RoID09PSBzdGFydCArIDEgJiYgZnJvbnQudG9rZW4gPT09ICdvcCcgJiZcbiAgICAgICAgICAgICAgIC9eWy0rXSskLy50ZXN0KGZyb250LnN0cikpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGxhYmVsXG4gICAgICByZXR1cm4gWydhZGQnLCB7b3A6ICdzeW0nLCBzeW06IGZyb250LnN0cn1dO1xuICAgIH1cbiAgICAvLyBpdCBtdXN0IGJlIGFuIGFkZHJlc3Mgb2Ygc29tZSBzb3J0IC0gaXMgaXQgaW5kaXJlY3Q/XG4gICAgaWYgKFRva2VuLmVxKGZyb250LCBUb2tlbi5MUCkgfHxcbiAgICAgICAgKHRoaXMub3B0cy5hbGxvd0JyYWNrZXRzICYmIFRva2VuLmVxKGZyb250LCBUb2tlbi5MQikpKSB7XG4gICAgICBjb25zdCBjbG9zZSA9IFRva2VuLmZpbmRCYWxhbmNlZCh0b2tlbnMsIHN0YXJ0KTtcbiAgICAgIGlmIChjbG9zZSA8IDApIHRoaXMuZmFpbChgVW5iYWxhbmNlZCAke1Rva2VuLm5hbWUoZnJvbnQpfWAsIGZyb250KTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCBzdGFydCArIDEsIGNsb3NlKTtcbiAgICAgIGlmICghYXJncy5sZW5ndGgpIHRoaXMuZmFpbChgQmFkIGFyZ3VtZW50YCwgZnJvbnQpO1xuICAgICAgY29uc3QgZXhwciA9IEV4cHIucGFyc2VPbmx5KGFyZ3NbMF0pO1xuICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIGVpdGhlciBJTkQgb3IgSU5ZXG4gICAgICAgIGlmIChUb2tlbi5lcSh0b2tlbnNbY2xvc2UgKyAxXSwgVG9rZW4uQ09NTUEpICYmXG4gICAgICAgICAgICBUb2tlbi5pc1JlZ2lzdGVyKHRva2Vuc1tjbG9zZSArIDJdLCAneScpKSB7XG4gICAgICAgICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1tjbG9zZSArIDNdKTtcbiAgICAgICAgICByZXR1cm4gWydpbnknLCBleHByXTtcbiAgICAgICAgfVxuICAgICAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zW2Nsb3NlICsgMV0pO1xuICAgICAgICByZXR1cm4gWydpbmQnLCBleHByXTtcbiAgICAgIH0gZWxzZSBpZiAoYXJncy5sZW5ndGggPT09IDIgJiYgYXJnc1sxXS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gSU5YXG4gICAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGFyZ3NbMV1bMF0sICd4JykpIHJldHVybiBbJ2lueCcsIGV4cHJdO1xuICAgICAgfVxuICAgICAgdGhpcy5mYWlsKGBCYWQgYXJndW1lbnRgLCBmcm9udCk7XG4gICAgfVxuICAgIGNvbnN0IGFyZ3MgPSBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCBzdGFydCk7XG4gICAgaWYgKCFhcmdzLmxlbmd0aCkgdGhpcy5mYWlsKGBCYWQgYXJnYCwgZnJvbnQpO1xuICAgIGNvbnN0IGV4cHIgPSBFeHByLnBhcnNlT25seShhcmdzWzBdKTtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHJldHVybiBbJ2FkZCcsIGV4cHJdO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMiAmJiBhcmdzWzFdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoYXJnc1sxXVswXSwgJ3gnKSkgcmV0dXJuIFsnYSx4JywgZXhwcl07XG4gICAgICBpZiAoVG9rZW4uaXNSZWdpc3RlcihhcmdzWzFdWzBdLCAneScpKSByZXR1cm4gWydhLHknLCBleHByXTtcbiAgICB9XG4gICAgdGhpcy5mYWlsKGBCYWQgYXJnYCwgZnJvbnQpO1xuICB9XG5cbiAgcmVsYXRpdmUob3A6IG51bWJlciwgYXJnbGVuOiBudW1iZXIsIGV4cHI6IEV4cHIpIHtcbiAgICAvLyBDYW4gYXJnbGVuIGV2ZXIgYmUgMj8gKHllcyAtIGJybCBvbiA2NTgxNilcbiAgICAvLyBCYXNpYyBwbGFuIGhlcmUgaXMgdGhhdCB3ZSBhY3R1YWxseSB3YW50IGEgcmVsYXRpdmUgZXhwci5cbiAgICAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cCB0byBiZSBtb3JlIGVmZmljaWVudC5cbiAgICAvLyBUT0RPIC0gaGFuZGxlIGxvY2FsL2Fub255bW91cyBsYWJlbHMgc2VwYXJhdGVseT9cbiAgICAvLyBUT0RPIC0gY2hlY2sgdGhlIHJhbmdlIHNvbWVob3c/XG4gICAgY29uc3QgbnVtID0gdGhpcy5jaHVuay5kYXRhLmxlbmd0aCArIGFyZ2xlbiArIDE7XG4gICAgY29uc3QgbWV0YTogRXhwci5NZXRhID0ge3JlbDogdHJ1ZSwgY2h1bms6IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDF9O1xuICAgIGlmICh0aGlzLl9jaHVuaz8ub3JnKSBtZXRhLm9yZyA9IHRoaXMuX2NodW5rLm9yZztcbiAgICBjb25zdCBuZXh0UGMgPSB7b3A6ICdudW0nLCBudW0sIG1ldGF9O1xuICAgIGNvbnN0IHJlbDogRXhwciA9IHtvcDogJy0nLCBhcmdzOiBbZXhwciwgbmV4dFBjXX07XG4gICAgaWYgKGV4cHIuc291cmNlKSByZWwuc291cmNlID0gZXhwci5zb3VyY2U7XG4gICAgdGhpcy5vcGNvZGUob3AsIGFyZ2xlbiwgcmVsKTtcbiAgfVxuXG4gIG9wY29kZShvcDogbnVtYmVyLCBhcmdsZW46IG51bWJlciwgZXhwcjogRXhwcikge1xuICAgIC8vIEVtaXQgc29tZSBieXRlcy5cbiAgICBpZiAoYXJnbGVuKSBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpOyAvLyBCRUZPUkUgb3Bjb2RlIChpbiBjYXNlIG9mICopXG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgY2h1bmsuZGF0YS5wdXNoKG9wKTtcbiAgICBpZiAoYXJnbGVuKSB0aGlzLmFwcGVuZChleHByLCBhcmdsZW4pO1xuICAgIC8vIFRPRE8gLSBmb3IgcmVsYXRpdmUsIGlmIHdlJ3JlIGluIHRoZSBzYW1lIGNodW5rLCBqdXN0IGNvbXBhcmVcbiAgICAvLyB0aGUgb2Zmc2V0Li4uXG4gIH1cblxuICBhcHBlbmQoZXhwcjogRXhwciwgc2l6ZTogbnVtYmVyKSB7XG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBsZXQgdmFsID0gZXhwci5udW0hO1xuLy9jb25zb2xlLmxvZygnZXhwcjonLCBleHByLCAndmFsOicsIHZhbCk7XG4gICAgaWYgKGV4cHIub3AgIT09ICdudW0nIHx8IGV4cHIubWV0YT8ucmVsKSB7XG4gICAgICAvLyB1c2UgYSBwbGFjZWhvbGRlciBhbmQgYWRkIGEgc3Vic3RpdHV0aW9uXG4gICAgICBjb25zdCBvZmZzZXQgPSBjaHVuay5kYXRhLmxlbmd0aDtcbiAgICAgIChjaHVuay5zdWJzIHx8IChjaHVuay5zdWJzID0gW10pKS5wdXNoKHtvZmZzZXQsIHNpemUsIGV4cHJ9KTtcbiAgICAgIHRoaXMud3JpdGVOdW1iZXIoY2h1bmsuZGF0YSwgc2l6ZSk7IC8vIHdyaXRlIGdvZXMgYWZ0ZXIgc3Vic1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIHNpemUsIHZhbCk7XG4gICAgfVxuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBEaXJlY3RpdmUgaGFuZGxlcnNcblxuICBvcmcoYWRkcjogbnVtYmVyLCBuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5fb3JnID0gYWRkcjtcbiAgICB0aGlzLl9jaHVuayA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgfVxuXG4gIHJlbG9jKG5hbWU/OiBzdHJpbmcpIHtcbiAgICB0aGlzLl9vcmcgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIH1cblxuICBzZWdtZW50KC4uLnNlZ21lbnRzOiBBcnJheTxzdHJpbmd8bW9kLlNlZ21lbnQ+KSB7XG4gICAgLy8gVXNhZ2U6IC5zZWdtZW50IFwiMWFcIiwgXCIxYlwiLCAuLi5cbiAgICB0aGlzLnNlZ21lbnRzID0gc2VnbWVudHMubWFwKHMgPT4gdHlwZW9mIHMgPT09ICdzdHJpbmcnID8gcyA6IHMubmFtZSk7XG4gICAgZm9yIChjb25zdCBzIG9mIHNlZ21lbnRzKSB7XG4gICAgICBpZiAodHlwZW9mIHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnNlZ21lbnREYXRhLmdldChzLm5hbWUpIHx8IHtuYW1lOiBzLm5hbWV9O1xuICAgICAgICB0aGlzLnNlZ21lbnREYXRhLnNldChzLm5hbWUsIG1vZC5TZWdtZW50Lm1lcmdlKGRhdGEsIHMpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFzc2VydChleHByOiBFeHByKSB7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBjb25zdCB2YWwgPSB0aGlzLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh2YWwgIT0gbnVsbCkge1xuICAgICAgaWYgKCF2YWwpIHRoaXMuZmFpbChgQXNzZXJ0aW9uIGZhaWxlZGAsIGV4cHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICAgIChjaHVuay5hc3NlcnRzIHx8IChjaHVuay5hc3NlcnRzID0gW10pKS5wdXNoKGV4cHIpO1xuICAgIH1cbiAgfVxuXG4gIGJ5dGUoLi4uYXJnczogQXJyYXk8RXhwcnxzdHJpbmd8bnVtYmVyPikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIDEsIGFyZyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHdyaXRlU3RyaW5nKGNodW5rLmRhdGEsIGFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFwcGVuZChhcmcsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlcyhjb3VudDogbnVtYmVyLCB2YWx1ZT86IG51bWJlcikge1xuICAgIGlmICghY291bnQpIHJldHVybjtcbiAgICB0aGlzLmJ5dGUoLi4ubmV3IEFycmF5KGNvdW50KS5maWxsKHZhbHVlID8/IDApKTtcbiAgfVxuXG4gIHdvcmQoLi4uYXJnczogQXJyYXk8RXhwcnxudW1iZXI+KSB7XG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHRoaXMud3JpdGVOdW1iZXIoY2h1bmsuZGF0YSwgMiwgYXJnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGFyZywgMik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnJlZShzaXplOiBudW1iZXIsIHRva2VuPzogVG9rZW4pIHtcbiAgICAvLyBNdXN0IGJlIGluIC5vcmcgZm9yIGEgc2luZ2xlIHNlZ21lbnQuXG4gICAgaWYgKHRoaXMuX29yZyA9PSBudWxsKSB0aGlzLmZhaWwoYC5mcmVlIGluIC5yZWxvYyBtb2RlYCwgdG9rZW4pO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zZWdtZW50cy5sZW5ndGggPiAxID8gdGhpcy5zZWdtZW50cy5maWx0ZXIocyA9PiB7XG4gICAgICBjb25zdCBkYXRhID0gdGhpcy5zZWdtZW50RGF0YS5nZXQocyk7XG4gICAgICBpZiAoIWRhdGEgfHwgZGF0YS5tZW1vcnkgPT0gbnVsbCB8fCBkYXRhLnNpemUgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGRhdGEubWVtb3J5ID4gdGhpcy5fb3JnISkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGRhdGEubWVtb3J5ICsgZGF0YS5zaXplIDw9IHRoaXMuX29yZyEpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pIDogdGhpcy5zZWdtZW50cztcbiAgICBpZiAoc2VnbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aGlzLmZhaWwoYC5mcmVlIHdpdGggbm9uLXVuaXF1ZSBzZWdtZW50OiAke3RoaXMuc2VnbWVudHN9YCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICAgIHRoaXMuZmFpbChgLmZyZWUgd2l0aCBuZWdhdGl2ZSBzaXplOiAke3NpemV9YCwgdG9rZW4pO1xuICAgIH1cbiAgICAvLyBJZiB3ZSd2ZSBnb3QgYW4gb3BlbiBjaHVuaywgZW5kIGl0LlxuICAgIGlmICh0aGlzLl9jaHVuaykge1xuICAgICAgdGhpcy5fb3JnICs9IHRoaXMuX2NodW5rLmRhdGEubGVuZ3RoO1xuICAgIH1cbiAgICB0aGlzLl9jaHVuayA9IHVuZGVmaW5lZDtcbiAgICAvLyBFbnN1cmUgYSBzZWdtZW50IG9iamVjdCBleGlzdHMuXG4gICAgY29uc3QgbmFtZSA9IHNlZ21lbnRzWzBdO1xuICAgIGxldCBzID0gdGhpcy5zZWdtZW50RGF0YS5nZXQobmFtZSk7XG4gICAgaWYgKCFzKSB0aGlzLnNlZ21lbnREYXRhLnNldChuYW1lLCBzID0ge25hbWV9KTtcbiAgICAocy5mcmVlIHx8IChzLmZyZWUgPSBbXSkpLnB1c2goW3RoaXMuX29yZywgdGhpcy5fb3JnICsgc2l6ZV0pO1xuICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgZnJlZSBzcGFjZS5cbiAgICB0aGlzLl9vcmcgKz0gc2l6ZTtcbiAgfVxuXG4gIHNlZ21lbnRQcmVmaXgocHJlZml4OiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPIC0gbWFrZSBtb3JlIG9mIGEgdG9kbyBhYm91dCBjaGFuZ2luZyB0aGlzP1xuICAgIHRoaXMuX3NlZ21lbnRQcmVmaXggPSBwcmVmaXg7XG4gIH1cblxuICBpbXBvcnQoLi4uaWRlbnRzOiBzdHJpbmdbXSkge1xuICAgIGZvciAoY29uc3QgaWRlbnQgb2YgaWRlbnRzKSB7XG4gICAgICB0aGlzLmdsb2JhbHMuc2V0KGlkZW50LCAnaW1wb3J0Jyk7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0KC4uLmlkZW50czogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGlkZW50IG9mIGlkZW50cykge1xuICAgICAgdGhpcy5nbG9iYWxzLnNldChpZGVudCwgJ2V4cG9ydCcpO1xuICAgIH1cbiAgfVxuXG4gIHNjb3BlKG5hbWU/OiBzdHJpbmcpIHtcbiAgICB0aGlzLmVudGVyU2NvcGUobmFtZSwgJ3Njb3BlJyk7XG4gIH1cblxuICBwcm9jKG5hbWU6IHN0cmluZykge1xuICAgIHRoaXMubGFiZWwobmFtZSk7XG4gICAgdGhpcy5lbnRlclNjb3BlKG5hbWUsICdwcm9jJyk7XG4gIH1cblxuICBlbnRlclNjb3BlKG5hbWU6IHN0cmluZ3x1bmRlZmluZWQsIGtpbmQ6ICdzY29wZSd8J3Byb2MnKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBuYW1lID8gdGhpcy5jdXJyZW50U2NvcGUuY2hpbGRyZW4uZ2V0KG5hbWUpIDogdW5kZWZpbmVkO1xuICAgIGlmIChleGlzdGluZykge1xuICAgICAgaWYgKHRoaXMub3B0cy5yZWVudHJhbnRTY29wZXMpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U2NvcGUgPSBleGlzdGluZztcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5mYWlsKGBDYW5ub3QgcmUtZW50ZXIgc2NvcGUgJHtuYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCBjaGlsZCA9IG5ldyBTY29wZSh0aGlzLmN1cnJlbnRTY29wZSwga2luZCk7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHRoaXMuY3VycmVudFNjb3BlLmNoaWxkcmVuLnNldChuYW1lLCBjaGlsZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFNjb3BlLmFub255bW91c0NoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRTY29wZSA9IGNoaWxkO1xuICB9XG5cbiAgZW5kU2NvcGUoKSB7IHRoaXMuZXhpdFNjb3BlKCdzY29wZScpOyB9XG4gIGVuZFByb2MoKSB7IHRoaXMuZXhpdFNjb3BlKCdwcm9jJyk7IH1cblxuICBleGl0U2NvcGUoa2luZDogJ3Njb3BlJ3wncHJvYycpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50U2NvcGUua2luZCAhPT0ga2luZCB8fCAhdGhpcy5jdXJyZW50U2NvcGUucGFyZW50KSB7XG4gICAgICB0aGlzLmZhaWwoYC5lbmQke2tpbmR9IHdpdGhvdXQgLiR7a2luZH1gKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50U2NvcGUgPSB0aGlzLmN1cnJlbnRTY29wZS5wYXJlbnQ7XG4gIH1cblxuICBwdXNoU2VnKC4uLnNlZ21lbnRzOiBBcnJheTxzdHJpbmd8bW9kLlNlZ21lbnQ+KSB7XG4gICAgdGhpcy5zZWdtZW50U3RhY2sucHVzaChbdGhpcy5zZWdtZW50cywgdGhpcy5fY2h1bmtdKTtcbiAgICB0aGlzLnNlZ21lbnQoLi4uc2VnbWVudHMpO1xuICB9XG5cbiAgcG9wU2VnKCkge1xuICAgIGlmICghdGhpcy5zZWdtZW50U3RhY2subGVuZ3RoKSB0aGlzLmZhaWwoYC5wb3BzZWcgd2l0aG91dCAucHVzaHNlZ2ApO1xuICAgIFt0aGlzLnNlZ21lbnRzLCB0aGlzLl9jaHVua10gPSB0aGlzLnNlZ21lbnRTdGFjay5wb3AoKSE7XG4gIH1cblxuICBtb3ZlKHNpemU6IG51bWJlciwgc291cmNlOiBFeHByKSB7XG4gICAgdGhpcy5hcHBlbmQoe29wOiAnLm1vdmUnLCBhcmdzOiBbc291cmNlXSwgbWV0YToge3NpemV9fSwgc2l6ZSk7XG4gIH1cblxuICAvLyBVdGlsaXR5IG1ldGhvZHMgZm9yIHByb2Nlc3NpbmcgYXJndW1lbnRzXG5cbiAgcGFyc2VDb25zdCh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IG51bWJlciB7XG4gICAgY29uc3QgdmFsID0gdGhpcy5ldmFsdWF0ZShFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0KSk7XG4gICAgaWYgKHZhbCAhPSBudWxsKSByZXR1cm4gdmFsO1xuICAgIHRoaXMuZmFpbChgRXhwcmVzc2lvbiBpcyBub3QgY29uc3RhbnRgLCB0b2tlbnNbMV0pO1xuICB9XG4gIHBhcnNlTm9BcmdzKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKSB7XG4gICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1sxXSk7XG4gIH1cbiAgcGFyc2VFeHByKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogRXhwciB7XG4gICAgcmV0dXJuIEV4cHIucGFyc2VPbmx5KHRva2Vucywgc3RhcnQpO1xuICB9XG4gIC8vIHBhcnNlU3RyaW5nTGlzdCh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IHN0cmluZ1tdIHtcbiAgLy8gICByZXR1cm4gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkubWFwKHRzID0+IHtcbiAgLy8gICAgIGNvbnN0IHN0ciA9IFRva2VuLmV4cGVjdFN0cmluZyh0c1swXSk7XG4gIC8vICAgICBUb2tlbi5leHBlY3RFb2wodHNbMV0sIFwiYSBzaW5nbGUgc3RyaW5nXCIpO1xuICAvLyAgICAgcmV0dXJuIHN0cjtcbiAgLy8gICB9KTtcbiAgLy8gfVxuICBwYXJzZVN0cih0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RyID0gVG9rZW4uZXhwZWN0U3RyaW5nKHRva2Vuc1tzdGFydF0pO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbc3RhcnQgKyAxXSwgXCJhIHNpbmdsZSBzdHJpbmdcIik7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIHBhcnNlU2VnbWVudExpc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBBcnJheTxzdHJpbmd8bW9kLlNlZ21lbnQ+IHtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IHN0YXJ0ICsgMSkge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIHNlZ21lbnQgbGlzdGAsIHRva2Vuc1tzdGFydCAtIDFdKTtcbiAgICB9XG4gICAgcmV0dXJuIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpLm1hcCh0cyA9PiB7XG4gICAgICBjb25zdCBzdHIgPSB0aGlzLl9zZWdtZW50UHJlZml4ICsgVG9rZW4uZXhwZWN0U3RyaW5nKHRzWzBdKTtcbiAgICAgIGlmICh0cy5sZW5ndGggPT09IDEpIHJldHVybiBzdHI7XG4gICAgICBpZiAoIVRva2VuLmVxKHRzWzFdLCBUb2tlbi5DT0xPTikpIHtcbiAgICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBjb21tYSBvciBjb2xvbjogJHtUb2tlbi5uYW1lKHRzWzFdKX1gLCB0c1sxXSk7XG4gICAgICB9XG4gICAgICBjb25zdCBzZWcgPSB7bmFtZTogc3RyfSBhcyBtb2QuU2VnbWVudDtcbiAgICAgIC8vIFRPRE8gLSBwYXJzZSBleHByZXNzaW9ucy4uLlxuICAgICAgY29uc3QgYXR0cnMgPSBUb2tlbi5wYXJzZUF0dHJMaXN0KHRzLCAxKTsgLy8gOiBpZGVudCBbLi4uXVxuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWxdIG9mIGF0dHJzKSB7XG4gICAgICAgIHN3aXRjaCAoa2V5KSB7XG4gICAgICAgICAgY2FzZSAnYmFuayc6IHNlZy5iYW5rID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3NpemUnOiBzZWcuc2l6ZSA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdvZmYnOiBzZWcub2Zmc2V0ID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21lbSc6IHNlZy5tZW1vcnkgPSB0aGlzLnBhcnNlQ29uc3QodmFsLCAwKTsgYnJlYWs7XG4gICAgICAgICAgLy8gVE9ETyAtIEkgZG9uJ3QgZnVsbHkgdW5kZXJzdGFuZCB0aGVzZS4uLlxuICAgICAgICAgIC8vIGNhc2UgJ3plcm9wYWdlJzogc2VnLmFkZHJlc3NpbmcgPSAxO1xuICAgICAgICAgIGRlZmF1bHQ6IHRoaXMuZmFpbChgVW5rbm93biBzZWdtZW50IGF0dHI6ICR7a2V5fWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc2VnO1xuICAgIH0pO1xuICB9XG5cbiAgcGFyc2VSZXNBcmdzKHRva2VuczogVG9rZW5bXSk6IFtudW1iZXIsIG51bWJlcj9dIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5wYXJzZURhdGFMaXN0KHRva2Vucyk7XG4gICAgaWYgKGRhdGEubGVuZ3RoID4gMikgdGhpcy5mYWlsKGBFeHBlY3RlZCBhdCBtb3N0IDIgYXJnc2AsIGRhdGFbMl0pO1xuICAgIGlmICghZGF0YS5sZW5ndGgpIHRoaXMuZmFpbChgRXhwZWN0ZWQgYXQgbGVhc3QgMSBhcmdgKTtcbiAgICBjb25zdCBjb3VudCA9IHRoaXMuZXZhbHVhdGUoZGF0YVswXSk7XG4gICAgaWYgKGNvdW50ID09IG51bGwpIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29uc3RhbnQgY291bnRgKTtcbiAgICBjb25zdCB2YWwgPSBkYXRhWzFdICYmIHRoaXMuZXZhbHVhdGUoZGF0YVsxXSk7XG4gICAgaWYgKGRhdGFbMV0gJiYgdmFsID09IG51bGwpIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29uc3RhbnQgdmFsdWVgKTtcbiAgICByZXR1cm4gW2NvdW50LCB2YWxdO1xuICB9XG5cbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10pOiBBcnJheTxFeHByPjtcbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10sIGFsbG93U3RyaW5nOiB0cnVlKTogQXJyYXk8RXhwcnxzdHJpbmc+O1xuICBwYXJzZURhdGFMaXN0KHRva2VuczogVG9rZW5bXSwgYWxsb3dTdHJpbmcgPSBmYWxzZSk6IEFycmF5PEV4cHJ8c3RyaW5nPiB7XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCAyKSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgZGF0YSBsaXN0YCwgdG9rZW5zWzBdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0OiBBcnJheTxFeHByfHN0cmluZz4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlcm0gb2YgVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkpIHtcbiAgICAgIGlmIChhbGxvd1N0cmluZyAmJiB0ZXJtLmxlbmd0aCA9PT0gMSAmJiB0ZXJtWzBdLnRva2VuID09PSAnc3RyJykge1xuICAgICAgICBvdXQucHVzaCh0ZXJtWzBdLnN0cik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXQucHVzaCh0aGlzLnJlc29sdmUoRXhwci5wYXJzZU9ubHkodGVybSkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHBhcnNlSWRlbnRpZmllckxpc3QodG9rZW5zOiBUb2tlbltdKTogc3RyaW5nW10ge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgMikge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBpZGVudGlmaWVyKHMpYCwgdG9rZW5zWzBdKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0OiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgdGVybSBvZiBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCAxKSkge1xuICAgICAgaWYgKHRlcm0ubGVuZ3RoICE9PSAxIHx8IHRlcm1bMF0udG9rZW4gIT09ICdpZGVudCcpIHtcbiAgICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBpZGVudGlmaWVyOiAke1Rva2VuLm5hbWUodGVybVswXSl9YCwgdGVybVswXSk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChUb2tlbi5zdHIodGVybVswXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgcGFyc2VPcHRpb25hbElkZW50aWZpZXIodG9rZW5zOiBUb2tlbltdKTogc3RyaW5nfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgdG9rID0gdG9rZW5zWzFdO1xuICAgIGlmICghdG9rKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IGlkZW50ID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2spO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMl0pO1xuICAgIHJldHVybiBpZGVudDtcbiAgfVxuXG4gIHBhcnNlUmVxdWlyZWRJZGVudGlmaWVyKHRva2VuczogVG9rZW5bXSk6IHN0cmluZyB7XG4gICAgY29uc3QgaWRlbnQgPSBUb2tlbi5leHBlY3RJZGVudGlmaWVyKHRva2Vuc1sxXSk7XG4gICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1syXSk7XG4gICAgcmV0dXJuIGlkZW50O1xuICB9XG5cbiAgcGFyc2VNb3ZlQXJncyh0b2tlbnM6IFRva2VuW10pOiBbbnVtYmVyLCBFeHByXSB7XG4gICAgLy8gLm1vdmUgMTAsIGlkZW50ICAgICAgICA7IG11c3QgYmUgYW4gb2Zmc2V0XG4gICAgLy8gLm1vdmUgMTAsICQxMjM0LCBcInNlZ1wiIDsgbWF5YmUgc3VwcG9ydCB0aGlzP1xuICAgIGNvbnN0IGFyZ3MgPSBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCAxKTtcbiAgICBpZiAoYXJncy5sZW5ndGggIT09IDIgLyogJiYgYXJncy5sZW5ndGggIT09IDMgKi8pIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29uc3RhbnQgbnVtYmVyLCB0aGVuIGlkZW50aWZpZXJgKTtcbiAgICB9XG4gICAgY29uc3QgbnVtID0gdGhpcy5ldmFsdWF0ZShFeHByLnBhcnNlT25seShhcmdzWzBdKSk7XG4gICAgaWYgKG51bSA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgY29uc3RhbnQgbnVtYmVyYCk7XG5cbiAgICAvLyBsZXQgc2VnTmFtZSA9IHRoaXMuc2VnbWVudHMubGVuZ3RoID09PSAxID8gdGhpcy5zZWdtZW50c1swXSA6IHVuZGVmaW5lZDtcbiAgICAvLyBpZiAoYXJncy5sZW5ndGggPT09IDMpIHtcbiAgICAvLyAgIGlmIChhcmdzWzJdLmxlbmd0aCAhPT0gMSB8fCBhcmdzWzJdWzBdLnRva2VuICE9PSAnc3RyJykge1xuICAgIC8vICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgc2luZ2xlIHNlZ21lbnQgbmFtZWAsIHRoaXMuYXJnc1syXVswXSk7XG4gICAgLy8gICB9XG4gICAgLy8gICBzZWdOYW1lID0gYXJnc1syXVswXS5zdHI7XG4gICAgLy8gfVxuICAgIC8vIGNvbnN0IHNlZyA9IHNlZ05hbWUgPyB0aGlzLnNlZ21lbnREYXRhLmdldChzZWdOYW1lKSA6IHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IG9mZnNldCA9IHRoaXMucmVzb2x2ZShFeHByLnBhcnNlT25seShhcmdzWzFdKSk7XG4gICAgaWYgKG9mZnNldC5vcCA9PT0gJ251bScgJiYgb2Zmc2V0Lm1ldGE/LmNodW5rICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBbbnVtLCBvZmZzZXRdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgY29uc3RhbnQgb2Zmc2V0YCwgYXJnc1sxXVswXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gRGlhZ25vc3RpY3NcblxuICBmYWlsKG1zZzogc3RyaW5nLCBhdD86IHtzb3VyY2U/OiBTb3VyY2VJbmZvfSk6IG5ldmVyIHtcbiAgICBpZiAoYXQ/LnNvdXJjZSkgdGhyb3cgbmV3IEVycm9yKG1zZyArIFRva2VuLmF0KGF0KSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyArIFRva2VuLmF0KHtzb3VyY2U6IHRoaXMuX3NvdXJjZX0pKTtcbiAgfVxuXG4gIHdyaXRlTnVtYmVyKGRhdGE6IG51bWJlcltdLCBzaXplOiBudW1iZXIsIHZhbD86IG51bWJlcikge1xuICAgIC8vIFRPRE8gLSBpZiB2YWwgaXMgYSBzaWduZWQvdW5zaWduZWQgMzItYml0IG51bWJlciwgaXQncyBub3QgY2xlYXJcbiAgICAvLyB3aGV0aGVyIHdlIG5lZWQgdG8gdHJlYXQgaXQgb25lIHdheSBvciB0aGUgb3RoZXIuLi4/ICBidXQgbWF5YmVcbiAgICAvLyBpdCBkb2Vzbid0IG1hdHRlciBzaW5jZSB3ZSdyZSBvbmx5IGxvb2tpbmcgYXQgMzIgYml0cyBhbnl3YXkuXG4gICAgY29uc3QgcyA9IChzaXplKSA8PCAzO1xuICAgIGlmICh2YWwgIT0gbnVsbCAmJiAodmFsIDwgKC0xIDw8IHMpIHx8IHZhbCA+PSAoMSA8PCBzKSkpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBbJ2J5dGUnLCAnd29yZCcsICdmYXJ3b3JkJywgJ2R3b3JkJ11bc2l6ZSAtIDFdO1xuICAgICAgdGhpcy5mYWlsKGBOb3QgYSAke25hbWV9OiAkJHt2YWwudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgZGF0YS5wdXNoKHZhbCAhPSBudWxsID8gdmFsICYgMHhmZiA6IDB4ZmYpO1xuICAgICAgaWYgKHZhbCAhPSBudWxsKSB2YWwgPj49IDg7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlU3RyaW5nKGRhdGE6IG51bWJlcltdLCBzdHI6IHN0cmluZykge1xuICAvLyBUT0RPIC0gc3VwcG9ydCBjaGFyYWN0ZXIgbWFwcyAocGFzcyBhcyB0aGlyZCBhcmc/KVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGRhdGEucHVzaChzdHIuY2hhckNvZGVBdChpKSk7XG4gIH1cbn1cblxudHlwZSBBcmdNb2RlID1cbiAgICAnYWRkJyB8ICdhLHgnIHwgJ2EseScgfCAvLyBwc2V1ZG8gbW9kZXNcbiAgICAnYWJzJyB8ICdhYngnIHwgJ2FieScgfFxuICAgICdpbW0nIHwgJ2luZCcgfCAnaW54JyB8ICdpbnknIHxcbiAgICAncmVsJyB8ICd6cGcnIHwgJ3pweCcgfCAnenB5JztcblxuZXhwb3J0IHR5cGUgQXJnID0gWydhY2MnIHwgJ2ltcCddIHwgW0FyZ01vZGUsIEV4cHJdO1xuXG5leHBvcnQgbmFtZXNwYWNlIEFzc2VtYmxlciB7XG4gIGV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gICAgYWxsb3dCcmFja2V0cz86IGJvb2xlYW47XG4gICAgcmVlbnRyYW50U2NvcGVzPzogYm9vbGVhbjtcbiAgfVxufVxuIl19