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
            if (!val) {
                let pc = '';
                const chunk = this.chunk;
                if (chunk.org != null) {
                    pc = ` (PC=$${(chunk.org + chunk.data.length).toString(16)})`;
                }
                this.fail(`Assertion failed${pc}`, expr);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZW1ibGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9hc3NlbWJsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QixPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBYSxLQUFLLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFDMUQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFLdkMsTUFBTSxNQUFNO0NBb0JYO0FBRUQsTUFBZSxTQUFTO0lBQXhCO1FBRVcsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBaUMvQyxDQUFDO0lBL0JXLFNBQVMsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsZUFBeUI7UUFDN0MsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLElBQUksR0FBRyxFQUFFO1lBQ1AsSUFBSSxJQUFJLEtBQUssSUFBSTtnQkFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNyQyxPQUFPLEdBQUcsQ0FBQztTQUNaO1FBQ0QsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQU12QyxNQUFNLE1BQU0sR0FBVyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLE9BQU8s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QUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sV0FBSSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxJQUFJLENBQUEsRUFBRTtZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNyRDtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQWMsRUFBRSxJQUFZLEVBQUUsR0FBWTtRQUlwRCxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RCxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2xEO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNDLElBQUksR0FBRyxJQUFJLElBQUk7Z0JBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztTQUM1QjtJQUNILENBQUM7Q0FDRjtBQUVELFNBQVMsV0FBVyxDQUFDLElBQWMsRUFBRSxHQUFXO0lBRTlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzlCO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q3B1fSBmcm9tICcuL2NwdS5qcyc7XG5pbXBvcnQge0V4cHJ9IGZyb20gJy4vZXhwci5qcyc7XG5pbXBvcnQgKiBhcyBtb2QgZnJvbSAnLi9tb2R1bGUuanMnO1xuaW1wb3J0IHtTb3VyY2VJbmZvLCBUb2tlbiwgVG9rZW5Tb3VyY2V9IGZyb20gJy4vdG9rZW4uanMnO1xuaW1wb3J0IHtUb2tlbml6ZXJ9IGZyb20gJy4vdG9rZW5pemVyLmpzJztcbmltcG9ydCB7YXNzZXJ0TmV2ZXJ9IGZyb20gJy4uL3V0aWwuanMnO1xuXG50eXBlIENodW5rID0gbW9kLkNodW5rPG51bWJlcltdPjtcbnR5cGUgTW9kdWxlID0gbW9kLk1vZHVsZTtcblxuY2xhc3MgU3ltYm9sIHtcbiAgLyoqXG4gICAqIEluZGV4IGludG8gdGhlIGdsb2JhbCBzeW1ib2wgYXJyYXkuICBPbmx5IGFwcGxpZXMgdG8gaW1tdXRhYmxlXG4gICAqIHN5bWJvbHMgdGhhdCBuZWVkIHRvIGJlIGFjY2Vzc2libGUgYXQgbGluayB0aW1lLiAgTXV0YWJsZSBzeW1ib2xzXG4gICAqIGFuZCBzeW1ib2xzIHdpdGgga25vd24gdmFsdWVzIGF0IHVzZSB0aW1lIGFyZSBub3QgYWRkZWQgdG8gdGhlXG4gICAqIGdsb2JhbCBsaXN0IGFuZCBhcmUgdGhlcmVmb3JlIGhhdmUgbm8gaWQuICBNdXRhYmlsaXR5IGlzIHRyYWNrZWRcbiAgICogYnkgc3RvcmluZyBhIC0xIGhlcmUuXG4gICAqL1xuICBpZD86IG51bWJlcjtcbiAgLyoqIFdoZXRoZXIgdGhlIHN5bWJvbCBoYXMgYmVlbiBleHBsaWNpdGx5IHNjb3BlZC4gKi9cbiAgc2NvcGVkPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBleHByZXNzaW9uIGZvciB0aGUgc3ltYm9sLiAgTXVzdCBiZSBhIHN0YXRpY2FsbHktZXZhbHVhdGFibGUgY29uc3RhbnRcbiAgICogZm9yIG11dGFibGUgc3ltYm9scy4gIFVuZGVmaW5lZCBmb3IgZm9yd2FyZC1yZWZlcmVuY2VkIHN5bWJvbHMuXG4gICAqL1xuICBleHByPzogRXhwcjtcbiAgLyoqIE5hbWUgdGhpcyBzeW1ib2wgaXMgZXhwb3J0ZWQgYXMuICovXG4gIGV4cG9ydD86IHN0cmluZztcbiAgLyoqIFRva2VuIHdoZXJlIHRoaXMgc3ltYm9sIHdhcyByZWYnZC4gKi9cbiAgcmVmPzoge3NvdXJjZT86IFNvdXJjZUluZm99OyAvLyBUT0RPIC0gcGx1bWIgdGhpcyB0aHJvdWdoXG59XG5cbmFic3RyYWN0IGNsYXNzIEJhc2VTY29wZSB7XG4gIC8vY2xvc2VkID0gZmFsc2U7XG4gIHJlYWRvbmx5IHN5bWJvbHMgPSBuZXcgTWFwPHN0cmluZywgU3ltYm9sPigpO1xuXG4gIHByb3RlY3RlZCBwaWNrU2NvcGUobmFtZTogc3RyaW5nKTogW3N0cmluZywgQmFzZVNjb3BlXSB7XG4gICAgcmV0dXJuIFtuYW1lLCB0aGlzXTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBtYXkgbmVlZCBhZGRpdGlvbmFsIG9wdGlvbnM6XG4gIC8vICAgLSBsb29rdXAgY29uc3RhbnQgLSB3b24ndCByZXR1cm4gYSBtdXRhYmxlIHZhbHVlIG9yIGEgdmFsdWUgZnJvbVxuICAvLyAgICAgYSBwYXJlbnQgc2NvcGUsIGltcGxpZXMgbm8gZm9yd2FyZCByZWZcbiAgLy8gICAtIHNoYWxsb3cgLSBkb24ndCByZWN1cnNlIHVwIHRoZSBjaGFpbiwgZm9yIGFzc2lnbm1lbnQgb25seT8/XG4gIC8vIE1pZ2h0IGp1c3QgbWVhbiBhbGxvd0ZvcndhcmRSZWYgaXMgYWN0dWFsbHkganVzdCBhIG1vZGUgc3RyaW5nP1xuICAvLyAgKiBjYTY1J3MgLmRlZmluZWRzeW1ib2wgaXMgbW9yZSBwZXJtaXNzaXZlIHRoYW4gLmlmY29uc3RcbiAgcmVzb2x2ZShuYW1lOiBzdHJpbmcsIGFsbG93Rm9yd2FyZFJlZjogdHJ1ZSk6IFN5bWJvbDtcbiAgcmVzb2x2ZShuYW1lOiBzdHJpbmcsIGFsbG93Rm9yd2FyZFJlZj86IGJvb2xlYW4pOiBTeW1ib2x8dW5kZWZpbmVkO1xuICByZXNvbHZlKG5hbWU6IHN0cmluZywgYWxsb3dGb3J3YXJkUmVmPzogYm9vbGVhbik6IFN5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IFt0YWlsLCBzY29wZV0gPSB0aGlzLnBpY2tTY29wZShuYW1lKTtcbiAgICBsZXQgc3ltID0gc2NvcGUuc3ltYm9scy5nZXQodGFpbCk7XG4vL2NvbnNvbGUubG9nKCdyZXNvbHZlOicsbmFtZSwnc3ltPScsc3ltLCdmd2Q/JyxhbGxvd0ZvcndhcmRSZWYpO1xuICAgIGlmIChzeW0pIHtcbiAgICAgIGlmICh0YWlsICE9PSBuYW1lKSBzeW0uc2NvcGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBzeW07XG4gICAgfVxuICAgIGlmICghYWxsb3dGb3J3YXJkUmVmKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIC8vIGlmIChzY29wZS5jbG9zZWQpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgc3ltYm9sOiAke25hbWV9YCk7XG4gICAgLy8gbWFrZSBhIG5ldyBzeW1ib2wgLSBidXQgb25seSBpbiBhbiBvcGVuIHNjb3BlXG4gICAgLy9jb25zdCBzeW1ib2wgPSB7aWQ6IHRoaXMuc3ltYm9sQXJyYXkubGVuZ3RofTtcbi8vY29uc29sZS5sb2coJ2NyZWF0ZWQ6JyxzeW1ib2wpO1xuICAgIC8vdGhpcy5zeW1ib2xBcnJheS5wdXNoKHN5bWJvbCk7XG4gICAgY29uc3Qgc3ltYm9sOiBTeW1ib2wgPSB7fTtcbiAgICBzY29wZS5zeW1ib2xzLnNldCh0YWlsLCBzeW1ib2wpO1xuICAgIGlmICh0YWlsICE9PSBuYW1lKSBzeW1ib2wuc2NvcGVkID0gdHJ1ZTtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG59XG5cbmNsYXNzIFNjb3BlIGV4dGVuZHMgQmFzZVNjb3BlIHtcbiAgcmVhZG9ubHkgZ2xvYmFsOiBTY29wZTtcbiAgcmVhZG9ubHkgY2hpbGRyZW4gPSBuZXcgTWFwPHN0cmluZywgU2NvcGU+KCk7XG4gIHJlYWRvbmx5IGFub255bW91c0NoaWxkcmVuOiBTY29wZVtdID0gW107XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcGFyZW50PzogU2NvcGUsIHJlYWRvbmx5IGtpbmQ/OiAnc2NvcGUnfCdwcm9jJykge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5nbG9iYWwgPSBwYXJlbnQgPyBwYXJlbnQuZ2xvYmFsIDogdGhpcztcbiAgfVxuXG4gIHBpY2tTY29wZShuYW1lOiBzdHJpbmcpOiBbc3RyaW5nLCBTY29wZV0ge1xuICAgIC8vIFRPRE8gLSBwbHVtYiB0aGUgc291cmNlIGluZm9ybWF0aW9uIHRocm91Z2ggaGVyZT9cbiAgICBsZXQgc2NvcGU6IFNjb3BlID0gdGhpcztcbiAgICBjb25zdCBzcGxpdCA9IG5hbWUuc3BsaXQoLzo6L2cpO1xuICAgIGNvbnN0IHRhaWwgPSBzcGxpdC5wb3AoKSE7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGxpdC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFpICYmICFzcGxpdFtpXSkgeyAvLyBnbG9iYWxcbiAgICAgICAgc2NvcGUgPSBzY29wZS5nbG9iYWw7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgbGV0IGNoaWxkID0gc2NvcGUuY2hpbGRyZW4uZ2V0KHNwbGl0W2ldKTtcbiAgICAgIHdoaWxlICghaSAmJiBzY29wZS5wYXJlbnQgJiYgIWNoaWxkKSB7XG4gICAgICAgIGNoaWxkID0gKHNjb3BlID0gc2NvcGUucGFyZW50KS5jaGlsZHJlbi5nZXQoc3BsaXRbaV0pO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIG5hbWUgaGFzIGFuIGV4cGxpY2l0IHNjb3BlLCB0aGlzIGlzIGFuIGVycm9yP1xuICAgICAgaWYgKCFjaGlsZCkge1xuICAgICAgICBjb25zdCBzY29wZU5hbWUgPSBzcGxpdC5zbGljZSgwLCBpICsgMSkuam9pbignOjonKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgcmVzb2x2ZSBzY29wZSAke3Njb3BlTmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHNjb3BlID0gY2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiBbdGFpbCwgc2NvcGVdO1xuICB9XG5cbiAgLy8gY2xvc2UoKSB7XG4gIC8vICAgaWYgKCF0aGlzLnBhcmVudCkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgY2xvc2UgZ2xvYmFsIHNjb3BlYCk7XG4gIC8vICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAvLyAgIC8vIEFueSB1bmRlZmluZWQgaWRlbnRpZmllcnMgaW4gdGhlIHNjb3BlIGFyZSBhdXRvbWF0aWNhbGx5XG4gIC8vICAgLy8gcHJvbW90ZWQgdG8gdGhlIHBhcmVudCBzY29wZS5cbiAgLy8gICBmb3IgKGNvbnN0IFtuYW1lLCBzeW1dIG9mIHRoaXMuc3ltYm9scykge1xuICAvLyAgICAgaWYgKHN5bS5leHByKSBjb250aW51ZTsgLy8gaWYgaXQncyBkZWZpbmVkIGluIHRoZSBzY29wZSwgZG8gbm90aGluZ1xuICAvLyAgICAgY29uc3QgcGFyZW50U3ltID0gdGhpcy5wYXJlbnQuc3ltYm9scy5nZXQoc3ltKTtcbiAgLy8gICB9XG4gIC8vIH1cbn1cblxuY2xhc3MgQ2hlYXBTY29wZSBleHRlbmRzIEJhc2VTY29wZSB7XG5cbiAgLyoqIENsZWFyIGV2ZXJ5dGhpbmcgb3V0LCBtYWtpbmcgc3VyZSBldmVyeXRoaW5nIHdhcyBkZWZpbmVkLiAqL1xuICBjbGVhcigpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBzeW1dIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgaWYgKCFzeW0uZXhwcikge1xuICAgICAgICBjb25zdCBhdCA9IHN5bS5yZWYgPyBUb2tlbi5hdChzeW0ucmVmKSA6ICcnO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENoZWFwIGxvY2FsIGxhYmVsIG5ldmVyIGRlZmluZWQ6ICR7bmFtZX0ke2F0fWApO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN5bWJvbHMuY2xlYXIoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXNzZW1ibGVyIHtcblxuICAvKiogVGhlIGN1cnJlbnRseS1vcGVuIHNlZ21lbnQocykuICovXG4gIHByaXZhdGUgc2VnbWVudHM6IHJlYWRvbmx5IHN0cmluZ1tdID0gWydjb2RlJ107XG5cbiAgLyoqIERhdGEgb24gYWxsIHRoZSBzZWdtZW50cy4gKi9cbiAgcHJpdmF0ZSBzZWdtZW50RGF0YSA9IG5ldyBNYXA8c3RyaW5nLCBtb2QuU2VnbWVudD4oKTtcblxuICAvKiogU3RhY2sgb2Ygc2VnbWVudHMgZm9yIC5wdXNoc2VnLy5wb3BzZWcuICovXG4gIHByaXZhdGUgc2VnbWVudFN0YWNrOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgc3RyaW5nW10sIENodW5rP10+ID0gW107XG5cbiAgLyoqIEFsbCBzeW1ib2xzIGluIHRoaXMgb2JqZWN0LiAqL1xuICBwcml2YXRlIHN5bWJvbHM6IFN5bWJvbFtdID0gW107XG5cbiAgLyoqIEdsb2JhbCBzeW1ib2xzLiAqL1xuICAvLyBOT1RFOiB3ZSBjb3VsZCBhZGQgJ2ZvcmNlLWltcG9ydCcsICdkZXRlY3QnLCBvciBvdGhlcnMuLi5cbiAgcHJpdmF0ZSBnbG9iYWxzID0gbmV3IE1hcDxzdHJpbmcsICdleHBvcnQnfCdpbXBvcnQnPigpO1xuXG4gIC8qKiBUaGUgY3VycmVudCBzY29wZS4gKi9cbiAgcHJpdmF0ZSBjdXJyZW50U2NvcGUgPSBuZXcgU2NvcGUoKTtcblxuICAvKiogQSBzY29wZSBmb3IgY2hlYXAgbG9jYWwgbGFiZWxzLiAqL1xuICBwcml2YXRlIGNoZWFwTG9jYWxzID0gbmV3IENoZWFwU2NvcGUoKTtcblxuICAvKiogTGlzdCBvZiBnbG9iYWwgc3ltYm9sIGluZGljZXMgdXNlZCBieSBmb3J3YXJkIHJlZnMgdG8gYW5vbnltb3VzIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBhbm9ueW1vdXNGb3J3YXJkOiBudW1iZXJbXSA9IFtdO1xuXG4gIC8qKiBMaXN0IG9mIGNodW5rL29mZnNldCBwb3NpdGlvbnMgb2YgcHJldmlvdXMgYW5vbnltb3VzIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBhbm9ueW1vdXNSZXZlcnNlOiBFeHByW10gPSBbXTtcblxuICAvKiogTWFwIG9mIGdsb2JhbCBzeW1ib2wgaW5jaWRlcyB1c2VkIGJ5IGZvcndhcmQgcmVmcyB0byByZWxhdGl2ZSBsYWJlbHMuICovXG4gIHByaXZhdGUgcmVsYXRpdmVGb3J3YXJkOiBudW1iZXJbXSA9IFtdO1xuXG4gIC8qKiBNYXAgb2YgY2h1bmsvb2Zmc2V0IHBvc2l0aW9ucyBvZiBiYWNrLXJlZmVyYWJsZSByZWxhdGl2ZSBsYWJlbHMuICovXG4gIHByaXZhdGUgcmVsYXRpdmVSZXZlcnNlOiBFeHByW10gPSBbXTtcblxuICAvKiogQWxsIHRoZSBjaHVua3Mgc28gZmFyLiAqL1xuICBwcml2YXRlIGNodW5rczogQ2h1bmtbXSA9IFtdO1xuXG4gIC8qKiBDdXJyZW50bHkgYWN0aXZlIGNodW5rICovXG4gIHByaXZhdGUgX2NodW5rOiBDaHVua3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLyoqIE5hbWUgb2YgdGhlIG5leHQgY2h1bmsgKi9cbiAgcHJpdmF0ZSBfbmFtZTogc3RyaW5nfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvKiogT3JpZ2luIG9mIHRoZSBjdXJybmV0IGNodW5rLCBpZiBmaXhlZC4gKi9cbiAgcHJpdmF0ZSBfb3JnOiBudW1iZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKiBQcmVmaXggdG8gcHJlcGVuZCB0byBhbGwgc2VnbWVudCBuYW1lcy4gKi9cbiAgcHJpdmF0ZSBfc2VnbWVudFByZWZpeCA9ICcnO1xuXG4gIC8qKiBDdXJyZW50IHNvdXJjZSBsb2NhdGlvbiwgZm9yIGVycm9yIG1lc3NhZ2VzLiAqL1xuICBwcml2YXRlIF9zb3VyY2U/OiBTb3VyY2VJbmZvO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNwdSA9IENwdS5QMDIsIHJlYWRvbmx5IG9wdHM6IEFzc2VtYmxlci5PcHRpb25zID0ge30pIHt9XG5cbiAgcHJpdmF0ZSBnZXQgY2h1bmsoKTogQ2h1bmsge1xuICAgIC8vIG1ha2UgY2h1bmsgb25seSB3aGVuIG5lZWRlZFxuICAgIHRoaXMuZW5zdXJlQ2h1bmsoKTtcbiAgICByZXR1cm4gdGhpcy5fY2h1bmshO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDaHVuaygpIHtcbiAgICBpZiAoIXRoaXMuX2NodW5rKSB7XG4gICAgICAvLyBOT1RFOiBtdWx0aXBsZSBzZWdtZW50cyBPSyBpZiBkaXNqb2ludCBtZW1vcnkuLi5cbiAgICAgIC8vIGlmICh0aGlzLl9vcmcgIT0gbnVsbCAmJiB0aGlzLnNlZ21lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgLy8gICB0aGlzLmZhaWwoYC5vcmcgY2h1bmtzIG11c3QgYmUgc2luZ2xlLXNlZ21lbnRgKTtcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuX2NodW5rID0ge3NlZ21lbnRzOiB0aGlzLnNlZ21lbnRzLCBkYXRhOiBbXX07XG4gICAgICBpZiAodGhpcy5fb3JnICE9IG51bGwpIHRoaXMuX2NodW5rLm9yZyA9IHRoaXMuX29yZztcbiAgICAgIGlmICh0aGlzLl9uYW1lKSB0aGlzLl9jaHVuay5uYW1lID0gdGhpcy5fbmFtZTtcbiAgICAgIHRoaXMuY2h1bmtzLnB1c2godGhpcy5fY2h1bmspO1xuICAgIH1cbiAgfVxuXG4gIGRlZmluZWRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJbiB0aGlzIGNhc2UsIGl0J3Mgb2theSB0byB0cmF2ZXJzZSB1cCB0aGUgc2NvcGUgY2hhaW4gc2luY2UgaWYgd2VcbiAgICAvLyB3ZXJlIHRvIHJlZmVyZW5jZSB0aGUgc3ltYm9sLCBpdCdzIGd1YXJhbnRlZWQgdG8gYmUgZGVmaW5lZCBzb21laG93LlxuICAgIGxldCBzY29wZTogU2NvcGV8dW5kZWZpbmVkID0gdGhpcy5jdXJyZW50U2NvcGU7XG4gICAgY29uc3QgdW5zY29wZWQgPSAhc3ltLmluY2x1ZGVzKCc6OicpO1xuICAgIGRvIHtcbiAgICAgIGNvbnN0IHMgPSBzY29wZS5yZXNvbHZlKHN5bSwgZmFsc2UpO1xuICAgICAgaWYgKHMpIHJldHVybiBCb29sZWFuKHMuZXhwcik7XG4gICAgfSB3aGlsZSAodW5zY29wZWQgJiYgKHNjb3BlID0gc2NvcGUucGFyZW50KSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3RhbnRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgc3ltYm9sIGluIGEgZGlmZmVyZW50IHNjb3BlLCBpdCdzIG5vdCBhY3R1YWxseSBjb25zdGFudC5cbiAgICBjb25zdCBzID0gdGhpcy5jdXJyZW50U2NvcGUucmVzb2x2ZShzeW0sIGZhbHNlKTtcbiAgICByZXR1cm4gQm9vbGVhbihzICYmIHMuZXhwciAmJiAhKHMuaWQhIDwgMCkpO1xuICB9XG5cbiAgcmVmZXJlbmNlZFN5bWJvbChzeW06IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIElmIG5vdCByZWZlcmVuY2VkIGluIHRoaXMgc2NvcGUsIHdlIGRvbid0IGtub3cgd2hpY2ggaXQgaXMuLi5cbiAgICAvLyBOT1RFOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIGNhNjUuXG4gICAgY29uc3QgcyA9IHRoaXMuY3VycmVudFNjb3BlLnJlc29sdmUoc3ltLCBmYWxzZSk7XG4gICAgcmV0dXJuIHMgIT0gbnVsbDsgLy8gTk9URTogdGhpcyBjb3VudHMgZGVmaW5pdGlvbnMuXG4gIH1cblxuICBldmFsdWF0ZShleHByOiBFeHByKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBpZiAoZXhwci5vcCA9PT0gJ251bScgJiYgIWV4cHIubWV0YT8ucmVsKSByZXR1cm4gZXhwci5udW07XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIHByaXZhdGUgZ2V0IHBjKCk6IG51bWJlcnx1bmRlZmluZWQge1xuICAvLyAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgLy8gICByZXR1cm4gdGhpcy5fb3JnICsgdGhpcy5vZmZzZXQ7XG4gIC8vIH1cblxuICBwYygpOiBFeHByIHtcbiAgICBjb25zdCBudW0gPSB0aGlzLmNodW5rLmRhdGEubGVuZ3RoOyAvLyBOT1RFOiBiZWZvcmUgY291bnRpbmcgY2h1bmtzXG4gICAgY29uc3QgbWV0YTogRXhwci5NZXRhID0ge3JlbDogdHJ1ZSwgY2h1bms6IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDF9O1xuICAgIGlmICh0aGlzLl9jaHVuaz8ub3JnICE9IG51bGwpIG1ldGEub3JnID0gdGhpcy5fY2h1bmsub3JnO1xuICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHtvcDogJ251bScsIG51bSwgbWV0YX0pO1xuICB9XG5cbiAgcmVzb2x2ZShleHByOiBFeHByKTogRXhwciB7XG4gICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgd2hpbGUgKGUub3AgPT09ICdzeW0nICYmIGUuc3ltKSB7XG4gICAgICAgIGUgPSB0aGlzLnJlc29sdmVTeW1ib2woZS5zeW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEV4cHIuZXZhbHVhdGUocmVjKGUpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlc29sdmVTeW1ib2wobmFtZTogc3RyaW5nKTogRXhwciB7XG4gICAgaWYgKG5hbWUgPT09ICcqJykge1xuICAgICAgcmV0dXJuIHRoaXMucGMoKTtcbiAgICB9IGVsc2UgaWYgKC9eOlxcKyskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgZm9yd2FyZCByZWZcbiAgICAgIGNvbnN0IGkgPSBuYW1lLmxlbmd0aCAtIDI7XG4gICAgICBsZXQgbnVtID0gdGhpcy5hbm9ueW1vdXNGb3J3YXJkW2ldO1xuICAgICAgaWYgKG51bSAhPSBudWxsKSByZXR1cm4ge29wOiAnc3ltJywgbnVtfTtcbiAgICAgIHRoaXMuYW5vbnltb3VzRm9yd2FyZFtpXSA9IG51bSA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh7aWQ6IG51bX0pO1xuICAgICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgfSBlbHNlIGlmICgvXlxcKyskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBmb3J3YXJkIHJlZlxuICAgICAgbGV0IG51bSA9IHRoaXMucmVsYXRpdmVGb3J3YXJkW25hbWUubGVuZ3RoIC0gMV07XG4gICAgICBpZiAobnVtICE9IG51bGwpIHJldHVybiB7b3A6ICdzeW0nLCBudW19O1xuICAgICAgdGhpcy5yZWxhdGl2ZUZvcndhcmRbbmFtZS5sZW5ndGggLSAxXSA9IG51bSA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh7aWQ6IG51bX0pO1xuICAgICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgfSBlbHNlIGlmICgvXjotKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIGFub255bW91cyBiYWNrIHJlZlxuICAgICAgY29uc3QgaSA9IHRoaXMuYW5vbnltb3VzUmV2ZXJzZS5sZW5ndGggLSBuYW1lLmxlbmd0aCArIDE7XG4gICAgICBpZiAoaSA8IDApIHRoaXMuZmFpbChgQmFkIGFub255bW91cyBiYWNrcmVmOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gdGhpcy5hbm9ueW1vdXNSZXZlcnNlW2ldO1xuICAgIH0gZWxzZSBpZiAoL14tKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGJhY2sgcmVmXG4gICAgICBjb25zdCBleHByID0gdGhpcy5yZWxhdGl2ZVJldmVyc2VbbmFtZS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChleHByID09IG51bGwpIHRoaXMuZmFpbChgQmFkIHJlbGF0aXZlIGJhY2tyZWY6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBleHByO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IG5hbWUuc3RhcnRzV2l0aCgnQCcpID8gdGhpcy5jaGVhcExvY2FscyA6IHRoaXMuY3VycmVudFNjb3BlO1xuICAgIGNvbnN0IHN5bSA9IHNjb3BlLnJlc29sdmUobmFtZSwgdHJ1ZSk7XG4gICAgaWYgKHN5bS5leHByKSByZXR1cm4gc3ltLmV4cHI7XG4gICAgLy8gaWYgdGhlIGV4cHJlc3Npb24gaXMgbm90IHlldCBrbm93biB0aGVuIHJlZmVyIHRvIHRoZSBzeW1ib2wgdGFibGUsXG4gICAgLy8gYWRkaW5nIGl0IGlmIG5lY2Vzc2FyeS5cbiAgICBpZiAoc3ltLmlkID09IG51bGwpIHtcbiAgICAgIHN5bS5pZCA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaChzeW0pO1xuICAgIH1cbiAgICByZXR1cm4ge29wOiAnc3ltJywgbnVtOiBzeW0uaWR9O1xuICB9XG5cbiAgLy8gTm8gYmFua3MgYXJlIHJlc29sdmVkIHlldC5cbiAgY2h1bmtEYXRhKGNodW5rOiBudW1iZXIpOiB7b3JnPzogbnVtYmVyfSB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSB6cCBzZWdtZW50cz9cbiAgICByZXR1cm4ge29yZzogdGhpcy5jaHVua3NbY2h1bmtdLm9yZ307XG4gIH1cblxuICBjbG9zZVNjb3BlcygpIHtcbiAgICB0aGlzLmNoZWFwTG9jYWxzLmNsZWFyKCk7XG4gICAgLy8gTmVlZCB0byBmaW5kIGFueSB1bmRlY2xhcmVkIHN5bWJvbHMgaW4gbmVzdGVkIHNjb3BlcyBhbmQgbGlua1xuICAgIC8vIHRoZW0gdG8gYSBwYXJlbnQgc2NvcGUgc3ltYm9sIGlmIHBvc3NpYmxlLlxuICAgIGZ1bmN0aW9uIGNsb3NlKHNjb3BlOiBTY29wZSkge1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzY29wZS5jaGlsZHJlbi52YWx1ZXMoKSkge1xuICAgICAgICBjbG9zZShjaGlsZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHNjb3BlLmFub255bW91c0NoaWxkcmVuKSB7XG4gICAgICAgIGNsb3NlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2Ygc2NvcGUuc3ltYm9scykge1xuICAgICAgICBpZiAoc3ltLmV4cHIgfHwgc3ltLmlkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoc2NvcGUucGFyZW50KSB7XG4gICAgICAgICAgLy8gVE9ETyAtIHJlY29yZCB3aGVyZSBpdCB3YXMgcmVmZXJlbmNlZD9cbiAgICAgICAgICBpZiAoc3ltLnNjb3BlZCkgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgICAgICAgIGNvbnN0IHBhcmVudFN5bSA9IHNjb3BlLnBhcmVudC5zeW1ib2xzLmdldChuYW1lKTtcbiAgICAgICAgICBpZiAoIXBhcmVudFN5bSkge1xuICAgICAgICAgICAgLy8ganVzdCBhbGlhcyBpdCBkaXJlY3RseSBpbiB0aGUgcGFyZW50IHNjb3BlXG4gICAgICAgICAgICBzY29wZS5wYXJlbnQuc3ltYm9scy5zZXQobmFtZSwgc3ltKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudFN5bS5pZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzeW0uZXhwciA9IHtvcDogJ3N5bScsIG51bTogcGFyZW50U3ltLmlkfTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudFN5bS5leHByKSB7XG4gICAgICAgICAgICBzeW0uZXhwciA9IHBhcmVudFN5bS5leHByO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBtdXN0IGhhdmUgZWl0aGVyIGlkIG9yIGV4cHIuLi4/XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGU6ICR7bmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gaGFuZGxlIGdsb2JhbCBzY29wZSBzZXBhcmF0ZWx5Li4uXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdGVzdCBjYXNlOiByZWYgYSBuYW1lIGluIHR3byBjaGlsZCBzY29wZXMsIGRlZmluZSBpdCBpbiBncmFuZHBhcmVudFxuXG4gICAgaWYgKHRoaXMuY3VycmVudFNjb3BlLnBhcmVudCkge1xuICAgICAgLy8gVE9ETyAtIHJlY29yZCB3aGVyZSBpdCB3YXMgb3BlbmVkP1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTY29wZSBuZXZlciBjbG9zZWRgKTtcbiAgICB9XG4gICAgY2xvc2UodGhpcy5jdXJyZW50U2NvcGUpO1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgZ2xvYmFsXSBvZiB0aGlzLmdsb2JhbHMpIHtcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMuY3VycmVudFNjb3BlLnN5bWJvbHMuZ2V0KG5hbWUpO1xuICAgICAgaWYgKGdsb2JhbCA9PT0gJ2V4cG9ydCcpIHtcbiAgICAgICAgaWYgKCFzeW0/LmV4cHIpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sICcke25hbWV9JyB1bmRlZmluZWRgKTtcbiAgICAgICAgaWYgKHN5bS5pZCA9PSBudWxsKSB7XG4gICAgICAgICAgc3ltLmlkID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAgICAgICB0aGlzLnN5bWJvbHMucHVzaChzeW0pO1xuICAgICAgICB9XG4gICAgICAgIHN5bS5leHBvcnQgPSBuYW1lO1xuICAgICAgfSBlbHNlIGlmIChnbG9iYWwgPT09ICdpbXBvcnQnKSB7XG4gICAgICAgIGlmICghc3ltKSBjb250aW51ZTsgLy8gb2theSB0byBpbXBvcnQgYnV0IG5vdCB1c2UuXG4gICAgICAgIC8vIFRPRE8gLSByZWNvcmQgYm90aCBwb3NpdGlvbnM/XG4gICAgICAgIGlmIChzeW0uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBBbHJlYWR5IGRlZmluZWQ6ICR7bmFtZX1gKTtcbiAgICAgICAgc3ltLmV4cHIgPSB7b3A6ICdpbScsIHN5bTogbmFtZX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnROZXZlcihnbG9iYWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2YgdGhpcy5jdXJyZW50U2NvcGUuc3ltYm9scykge1xuICAgICAgaWYgKCFzeW0uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgIH1cbiAgfVxuXG4gIG1vZHVsZSgpOiBNb2R1bGUge1xuICAgIHRoaXMuY2xvc2VTY29wZXMoKTtcblxuICAgIC8vIFRPRE8gLSBoYW5kbGUgaW1wb3J0cyBhbmQgZXhwb3J0cyBvdXQgb2YgdGhlIHNjb3BlXG4gICAgLy8gVE9ETyAtIGFkZCAuc2NvcGUgYW5kIC5lbmRzY29wZSBhbmQgZm9yd2FyZCBzY29wZSB2YXJzIGF0IGVuZCB0byBwYXJlbnRcblxuICAgIC8vIFByb2Nlc3MgYW5kIHdyaXRlIHRoZSBkYXRhXG4gICAgY29uc3QgY2h1bmtzOiBtb2QuQ2h1bms8VWludDhBcnJheT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGNodW5rcy5wdXNoKHsuLi5jaHVuaywgZGF0YTogVWludDhBcnJheS5mcm9tKGNodW5rLmRhdGEpfSk7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbHM6IG1vZC5TeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgaWYgKHN5bWJvbC5leHByID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sIHVuZGVmaW5lZGApO1xuICAgICAgY29uc3Qgb3V0OiBtb2QuU3ltYm9sID0ge2V4cHI6IHN5bWJvbC5leHByfTtcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0ICE9IG51bGwpIG91dC5leHBvcnQgPSBzeW1ib2wuZXhwb3J0O1xuICAgICAgc3ltYm9scy5wdXNoKG91dCk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnRzOiBtb2QuU2VnbWVudFtdID0gWy4uLnRoaXMuc2VnbWVudERhdGEudmFsdWVzKCldO1xuICAgIHJldHVybiB7Y2h1bmtzLCBzeW1ib2xzLCBzZWdtZW50c307XG4gIH1cblxuICBsaW5lKHRva2VuczogVG9rZW5bXSkge1xuICAgIHRoaXMuX3NvdXJjZSA9IHRva2Vuc1swXS5zb3VyY2U7XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCAzICYmIFRva2VuLmVxKHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV0sIFRva2VuLkNPTE9OKSkge1xuICAgICAgdGhpcy5sYWJlbCh0b2tlbnNbMF0pO1xuICAgIH0gZWxzZSBpZiAoVG9rZW4uZXEodG9rZW5zWzFdLCBUb2tlbi5BU1NJR04pKSB7XG4gICAgICB0aGlzLmFzc2lnbihUb2tlbi5zdHIodG9rZW5zWzBdKSwgdGhpcy5wYXJzZUV4cHIodG9rZW5zLCAyKSk7XG4gICAgfSBlbHNlIGlmIChUb2tlbi5lcSh0b2tlbnNbMV0sIFRva2VuLlNFVCkpIHtcbiAgICAgIHRoaXMuc2V0KFRva2VuLnN0cih0b2tlbnNbMF0pLCB0aGlzLnBhcnNlRXhwcih0b2tlbnMsIDIpKTtcbiAgICB9IGVsc2UgaWYgKHRva2Vuc1swXS50b2tlbiA9PT0gJ2NzJykge1xuICAgICAgdGhpcy5kaXJlY3RpdmUodG9rZW5zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnN0cnVjdGlvbih0b2tlbnMpO1xuICAgIH1cbiAgfVxuXG4gIHRva2Vucyhzb3VyY2U6IFRva2VuU291cmNlKSB7XG4gICAgbGV0IGxpbmU7XG4gICAgd2hpbGUgKChsaW5lID0gc291cmNlLm5leHQoKSkpIHtcbiAgICAgIHRoaXMubGluZShsaW5lKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB0b2tlbnNBc3luYyhzb3VyY2U6IFRva2VuU291cmNlLkFzeW5jKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGxpbmU7XG4gICAgd2hpbGUgKChsaW5lID0gYXdhaXQgc291cmNlLm5leHRBc3luYygpKSkge1xuICAgICAgdGhpcy5saW5lKGxpbmUpO1xuICAgIH1cbiAgfVxuXG5cbiAgZGlyZWN0aXZlKHRva2VuczogVG9rZW5bXSkge1xuICAgIC8vIFRPRE8gLSByZWNvcmQgbGluZSBpbmZvcm1hdGlvbiwgcmV3cmFwIGVycm9yIG1lc3NhZ2VzP1xuICAgIHN3aXRjaCAoVG9rZW4uc3RyKHRva2Vuc1swXSkpIHtcbiAgICAgIGNhc2UgJy5vcmcnOiByZXR1cm4gdGhpcy5vcmcodGhpcy5wYXJzZUNvbnN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLnJlbG9jJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5yZWxvYygpO1xuICAgICAgY2FzZSAnLmFzc2VydCc6IHJldHVybiB0aGlzLmFzc2VydCh0aGlzLnBhcnNlRXhwcih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5zZWdtZW50JzogcmV0dXJuIHRoaXMuc2VnbWVudCguLi50aGlzLnBhcnNlU2VnbWVudExpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuYnl0ZSc6IHJldHVybiB0aGlzLmJ5dGUoLi4udGhpcy5wYXJzZURhdGFMaXN0KHRva2VucywgdHJ1ZSkpO1xuICAgICAgY2FzZSAnLnJlcyc6IHJldHVybiB0aGlzLnJlcyguLi50aGlzLnBhcnNlUmVzQXJncyh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy53b3JkJzogcmV0dXJuIHRoaXMud29yZCguLi50aGlzLnBhcnNlRGF0YUxpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZnJlZSc6IHJldHVybiB0aGlzLmZyZWUodGhpcy5wYXJzZUNvbnN0KHRva2VucyksIHRva2Vuc1swXSk7XG4gICAgICBjYXNlICcuc2VnbWVudHByZWZpeCc6IHJldHVybiB0aGlzLnNlZ21lbnRQcmVmaXgodGhpcy5wYXJzZVN0cih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5pbXBvcnQnOiByZXR1cm4gdGhpcy5pbXBvcnQoLi4udGhpcy5wYXJzZUlkZW50aWZpZXJMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLmV4cG9ydCc6IHJldHVybiB0aGlzLmV4cG9ydCguLi50aGlzLnBhcnNlSWRlbnRpZmllckxpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuc2NvcGUnOiByZXR1cm4gdGhpcy5zY29wZSh0aGlzLnBhcnNlT3B0aW9uYWxJZGVudGlmaWVyKHRva2VucykpO1xuICAgICAgY2FzZSAnLmVuZHNjb3BlJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5lbmRTY29wZSgpO1xuICAgICAgY2FzZSAnLnByb2MnOiByZXR1cm4gdGhpcy5wcm9jKHRoaXMucGFyc2VSZXF1aXJlZElkZW50aWZpZXIodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZW5kcHJvYyc6IHJldHVybiB0aGlzLnBhcnNlTm9BcmdzKHRva2VucyksIHRoaXMuZW5kUHJvYygpO1xuICAgICAgY2FzZSAnLnB1c2hzZWcnOiByZXR1cm4gdGhpcy5wdXNoU2VnKC4uLnRoaXMucGFyc2VTZWdtZW50TGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5wb3BzZWcnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLnBvcFNlZygpO1xuICAgICAgY2FzZSAnLm1vdmUnOiByZXR1cm4gdGhpcy5tb3ZlKC4uLnRoaXMucGFyc2VNb3ZlQXJncyh0b2tlbnMpKTtcbiAgICB9XG4gICAgdGhpcy5mYWlsKGBVbmtub3duIGRpcmVjdGl2ZTogJHtUb2tlbi5uYW1lQXQodG9rZW5zWzBdKX1gKTtcbiAgfVxuXG4gIGxhYmVsKGxhYmVsOiBzdHJpbmd8VG9rZW4pIHtcbiAgICBsZXQgaWRlbnQ6IHN0cmluZztcbiAgICBsZXQgdG9rZW46IFRva2VufHVuZGVmaW5lZDtcbiAgICBjb25zdCBleHByID0gdGhpcy5wYygpO1xuICAgIGlmICh0eXBlb2YgbGFiZWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZGVudCA9IGxhYmVsO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZGVudCA9IFRva2VuLnN0cih0b2tlbiA9IGxhYmVsKTtcbiAgICAgIGlmIChsYWJlbC5zb3VyY2UpIGV4cHIuc291cmNlID0gbGFiZWwuc291cmNlO1xuICAgIH1cbiAgICBpZiAoaWRlbnQgPT09ICc6Jykge1xuICAgICAgLy8gYW5vbnltb3VzIGxhYmVsIC0gc2hpZnQgYW55IGZvcndhcmQgcmVmcyBvZmYsIGFuZCBwdXNoIG9udG8gdGhlIGJhY2tzLlxuICAgICAgdGhpcy5hbm9ueW1vdXNSZXZlcnNlLnB1c2goZXhwcik7XG4gICAgICBjb25zdCBzeW0gPSB0aGlzLmFub255bW91c0ZvcndhcmQuc2hpZnQoKTtcbiAgICAgIGlmIChzeW0gIT0gbnVsbCkgdGhpcy5zeW1ib2xzW3N5bV0uZXhwciA9IGV4cHI7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgvXlxcKyskLy50ZXN0KGlkZW50KSkge1xuICAgICAgLy8gcmVsYXRpdmUgZm9yd2FyZCByZWYgLSBmaWxsIGluIGdsb2JhbCBzeW1ib2wgd2UgbWFkZSBlYXJsaWVyXG4gICAgICBjb25zdCBzeW0gPSB0aGlzLnJlbGF0aXZlRm9yd2FyZFtpZGVudC5sZW5ndGggLSAxXTtcbiAgICAgIGRlbGV0ZSB0aGlzLnJlbGF0aXZlRm9yd2FyZFtpZGVudC5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChzeW0gIT0gbnVsbCkgdGhpcy5zeW1ib2xzW3N5bV0uZXhwciA9IGV4cHI7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICgvXi0rJC8udGVzdChpZGVudCkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGJhY2tyZWYgLSBzdG9yZSB0aGUgZXhwciBmb3IgbGF0ZXJcbiAgICAgIHRoaXMucmVsYXRpdmVSZXZlcnNlW2lkZW50Lmxlbmd0aCAtIDFdID0gZXhwcjtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlkZW50LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgdGhpcy5jaGVhcExvY2Fscy5jbGVhcigpO1xuICAgICAgaWYgKCF0aGlzLmNodW5rLm5hbWUgJiYgIXRoaXMuY2h1bmsuZGF0YS5sZW5ndGgpIHRoaXMuY2h1bmsubmFtZSA9IGlkZW50O1xuICAgIH1cbiAgICB0aGlzLmFzc2lnblN5bWJvbChpZGVudCwgZmFsc2UsIGV4cHIsIHRva2VuKTtcbiAgICAvLyBjb25zdCBzeW1ib2wgPSB0aGlzLnNjb3BlLnJlc29sdmUoc3RyLCB0cnVlKTtcbiAgICAvLyBpZiAoc3ltYm9sLmV4cHIpIHRocm93IG5ldyBFcnJvcihgQWxyZWFkeSBkZWZpbmVkOiAke2xhYmVsfWApO1xuICAgIC8vIGlmICghdGhpcy5jaHVuaykgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlP2ApO1xuICAgIC8vIGNvbnN0IGNodW5rSWQgPSB0aGlzLmNodW5rcy5sZW5ndGggLSAxOyAvLyBtdXN0IGJlIEFGVEVSIHRoaXMuY2h1bmtcbiAgICAvLyBzeW1ib2wuZXhwciA9IHtvcDogJ29mZicsIG51bTogdGhpcy5vZmZzZXQsIGNodW5rOiBjaHVua0lkfTtcbiAgICAvLyBpZiAoc291cmNlKSBzeW1ib2wuZXhwci5zb3VyY2UgPSBzb3VyY2U7XG4gICAgLy8gLy8gQWRkIHRoZSBsYWJlbCB0byB0aGUgY3VycmVudCBjaHVuay4uLj9cbiAgICAvLyAvLyBSZWNvcmQgdGhlIGRlZmluaXRpb24sIGV0Yy4uLj9cbiAgfVxuXG4gIGFzc2lnbihpZGVudDogc3RyaW5nLCBleHByOiBFeHByfG51bWJlcikge1xuICAgIGlmIChpZGVudC5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIHRoaXMuZmFpbChgQ2hlYXAgbG9jYWxzIG1heSBvbmx5IGJlIGxhYmVsczogJHtpZGVudH1gKTtcbiAgICB9XG4gICAgLy8gTm93IG1ha2UgdGhlIGFzc2lnbm1lbnQuXG4gICAgaWYgKHR5cGVvZiBleHByICE9PSAnbnVtYmVyJykgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICB0aGlzLmFzc2lnblN5bWJvbChpZGVudCwgZmFsc2UsIGV4cHIpO1xuICB9XG5cbiAgc2V0KGlkZW50OiBzdHJpbmcsIGV4cHI6IEV4cHJ8bnVtYmVyKSB7XG4gICAgaWYgKGlkZW50LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgdGhpcy5mYWlsKGBDaGVhcCBsb2NhbHMgbWF5IG9ubHkgYmUgbGFiZWxzOiAke2lkZW50fWApO1xuICAgIH1cbiAgICAvLyBOb3cgbWFrZSB0aGUgYXNzaWdubWVudC5cbiAgICBpZiAodHlwZW9mIGV4cHIgIT09ICdudW1iZXInKSBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpO1xuICAgIHRoaXMuYXNzaWduU3ltYm9sKGlkZW50LCB0cnVlLCBleHByKTtcbiAgfVxuXG4gIGFzc2lnblN5bWJvbChpZGVudDogc3RyaW5nLCBtdXQ6IGJvb2xlYW4sIGV4cHI6IEV4cHJ8bnVtYmVyLCB0b2tlbj86IFRva2VuKSB7XG4gICAgLy8gTk9URTogKiBfd2lsbF8gZ2V0IGN1cnJlbnQgY2h1bmshXG4gICAgaWYgKHR5cGVvZiBleHByID09PSAnbnVtYmVyJykgZXhwciA9IHtvcDogJ251bScsIG51bTogZXhwcn07XG4gICAgY29uc3Qgc2NvcGUgPSBpZGVudC5zdGFydHNXaXRoKCdAJykgPyB0aGlzLmNoZWFwTG9jYWxzIDogdGhpcy5jdXJyZW50U2NvcGU7XG4gICAgLy8gTk9URTogVGhpcyBpcyBpbmNvcnJlY3QgLSBpdCB3aWxsIGxvb2sgdXAgdGhlIHNjb3BlIGNoYWluIHdoZW4gaXRcbiAgICAvLyBzaG91bGRuJ3QuICBNdXRhYmxlcyBtYXkgb3IgbWF5IG5vdCB3YW50IHRoaXMsIGltbXV0YWJsZXMgbXVzdCBub3QuXG4gICAgLy8gV2hldGhlciB0aGlzIGlzIHRpZWQgdG8gYWxsb3dGd2RSZWYgb3Igbm90IGlzIHVuY2xlYXIuICBJdCdzIGFsc29cbiAgICAvLyB1bmNsZWFyIHdoZXRoZXIgd2Ugd2FudCB0byBhbGxvdyBkZWZpbmluZyBzeW1ib2xzIGluIG91dHNpZGUgc2NvcGVzOlxuICAgIC8vICAgOjpmb28gPSA0M1xuICAgIC8vIEZXSVcsIGNhNjUgX2RvZXNfIGFsbG93IHRoaXMsIGFzIHdlbGwgYXMgZm9vOjpiYXIgPSA0MiBhZnRlciB0aGUgc2NvcGUuXG4gICAgbGV0IHN5bSA9IHNjb3BlLnJlc29sdmUoaWRlbnQsICFtdXQpO1xuICAgIGlmIChzeW0gJiYgKG11dCAhPT0gKHN5bS5pZCEgPCAwKSkpIHtcbiAgICAgIHRoaXMuZmFpbChgQ2Fubm90IGNoYW5nZSBtdXRhYmlsaXR5IG9mICR7aWRlbnR9YCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAobXV0ICYmIGV4cHIub3AgIT0gJ251bScpIHtcbiAgICAgIHRoaXMuZmFpbChgTXV0YWJsZSBzZXQgcmVxdWlyZXMgY29uc3RhbnRgLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmICghc3ltKSB7XG4gICAgICBpZiAoIW11dCkgdGhyb3cgbmV3IEVycm9yKGBpbXBvc3NpYmxlYCk7XG4gICAgICBzY29wZS5zeW1ib2xzLnNldChpZGVudCwgc3ltID0ge2lkOiAtMX0pO1xuICAgIH0gZWxzZSBpZiAoIW11dCAmJiBzeW0uZXhwcikge1xuICAgICAgY29uc3Qgb3JpZyA9XG4gICAgICAgICAgc3ltLmV4cHIuc291cmNlID8gYFxcbk9yaWdpbmFsbHkgZGVmaW5lZCR7VG9rZW4uYXQoc3ltLmV4cHIpfWAgOiAnJztcbiAgICAgIGNvbnN0IG5hbWUgPSB0b2tlbiA/IFRva2VuLm5hbWVBdCh0b2tlbikgOlxuICAgICAgICAgIGlkZW50ICsgKHRoaXMuX3NvdXJjZSA/IFRva2VuLmF0KHtzb3VyY2U6IHRoaXMuX3NvdXJjZX0pIDogJycpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWRlZmluaW5nIHN5bWJvbCAke25hbWV9JHtvcmlnfWApO1xuICAgIH1cbiAgICBzeW0uZXhwciA9IGV4cHI7XG4gIH1cblxuICBpbnN0cnVjdGlvbihtbmVtb25pYzogc3RyaW5nLCBhcmc/OiBBcmd8c3RyaW5nKTogdm9pZDtcbiAgaW5zdHJ1Y3Rpb24odG9rZW5zOiBUb2tlbltdKTogdm9pZDtcbiAgaW5zdHJ1Y3Rpb24oLi4uYXJnczogW1Rva2VuW11dfFtzdHJpbmcsIChBcmd8c3RyaW5nKT9dKTogdm9pZCB7XG4gICAgbGV0IG1uZW1vbmljOiBzdHJpbmc7XG4gICAgbGV0IGFyZzogQXJnO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSAmJiBBcnJheS5pc0FycmF5KGFyZ3NbMF0pKSB7XG4gICAgICAvLyBoYW5kbGUgdGhlIGxpbmUuLi5cbiAgICAgIGNvbnN0IHRva2VucyA9IGFyZ3NbMF07XG4gICAgICBtbmVtb25pYyA9IFRva2VuLmV4cGVjdElkZW50aWZpZXIodG9rZW5zWzBdKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgYXJnID0gdGhpcy5wYXJzZUFyZyh0b2tlbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBwYXJzZSB0aGUgdG9rZW5zIGZpcnN0XG4gICAgICBtbmVtb25pYyA9IGFyZ3NbMF0gYXMgc3RyaW5nO1xuICAgICAgY29uc3QgdG9rZW5pemVyID0gbmV3IFRva2VuaXplcihhcmdzWzFdKTtcbiAgICAgIGFyZyA9IHRoaXMucGFyc2VBcmcodG9rZW5pemVyLm5leHQoKSEsIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBbbW5lbW9uaWMsIGFyZ10gPSBhcmdzIGFzIFtzdHJpbmcsIEFyZ107XG4gICAgICBpZiAoIWFyZykgYXJnID0gWydpbXAnXTtcbiAgICAgIG1uZW1vbmljID0gbW5lbW9uaWMudG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgLy8gbWF5IG5lZWQgdG8gc2l6ZSB0aGUgYXJnLCBkZXBlbmRpbmcuXG4gICAgLy8gY3B1IHdpbGwgdGFrZSAnYWRkJywgJ2EseCcsIGFuZCAnYSx5JyBhbmQgaW5kaWNhdGUgd2hpY2ggaXQgYWN0dWFsbHkgaXMuXG4gICAgY29uc3Qgb3BzID0gdGhpcy5jcHUub3AobW5lbW9uaWMpOyAvLyB3aWxsIHRocm93IGlmIG1uZW1vbmljIHVua25vd25cbiAgICBjb25zdCBtID0gYXJnWzBdO1xuICAgIGlmIChtID09PSAnYWRkJyB8fCBtID09PSAnYSx4JyB8fCBtID09PSAnYSx5Jykge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBhZGRyZXNzIG1uZW1vbmljc1xuICAgICAgY29uc3QgZXhwciA9IGFyZ1sxXSE7XG4gICAgICBjb25zdCBzID0gZXhwci5tZXRhPy5zaXplIHx8IDI7XG4gICAgICBpZiAobSA9PT0gJ2FkZCcgJiYgcyA9PT0gMSAmJiAnenBnJyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy56cGchLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2FkZCcgJiYgJ2FicycgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuYWJzISwgMiwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhZGQnICYmICdyZWwnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWxhdGl2ZShvcHMucmVsISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHgnICYmIHMgPT09IDEgJiYgJ3pweCcgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuenB4ISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHgnICYmICdhYngnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLmFieCEsIDIsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYSx5JyAmJiBzID09PSAxICYmICd6cHknIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLnpweSEsIDEsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYSx5JyAmJiAnYWJ5JyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy5hYnkhLCAyLCBleHByKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmFpbChgQmFkIGFkZHJlc3MgbW9kZSAke219IGZvciAke21uZW1vbmljfWApO1xuICAgIH1cbiAgICAvLyBBbGwgb3RoZXIgbW5lbW9uaWNzXG4gICAgaWYgKG0gaW4gb3BzKSB7XG4gICAgICBjb25zdCBhcmdMZW4gPSB0aGlzLmNwdS5hcmdMZW4obSk7XG4gICAgICBpZiAobSA9PT0gJ3JlbCcpIHJldHVybiB0aGlzLnJlbGF0aXZlKG9wc1ttXSEsIGFyZ0xlbiwgYXJnWzFdISk7XG4gICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzW21dISwgYXJnTGVuLCBhcmdbMV0hKTtcbiAgICB9XG4gICAgdGhpcy5mYWlsKGBCYWQgYWRkcmVzcyBtb2RlICR7bX0gZm9yICR7bW5lbW9uaWN9YCk7XG4gIH1cblxuICBwYXJzZUFyZyh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IEFyZyB7XG4gICAgLy8gTG9vayBmb3IgcGFyZW5zL2JyYWNrZXRzIGFuZC9vciBhIGNvbW1hXG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IHN0YXJ0KSByZXR1cm4gWydpbXAnXTtcbiAgICBjb25zdCBmcm9udCA9IHRva2Vuc1tzdGFydF07XG4gICAgY29uc3QgbmV4dCA9IHRva2Vuc1tzdGFydCArIDFdO1xuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSBzdGFydCArIDEpIHtcbiAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGZyb250LCAnYScpKSByZXR1cm4gWydhY2MnXTtcbiAgICB9IGVsc2UgaWYgKFRva2VuLmVxKGZyb250LCBUb2tlbi5JTU1FRElBVEUpKSB7XG4gICAgICByZXR1cm4gWydpbW0nLCBFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0ICsgMSldO1xuICAgIH1cbiAgICAvLyBMb29rIGZvciByZWxhdGl2ZSBvciBhbm9ueW1vdXMgbGFiZWxzLCB3aGljaCBhcmUgbm90IHZhbGlkIG9uIHRoZWlyIG93blxuICAgIGlmIChUb2tlbi5lcShmcm9udCwgVG9rZW4uQ09MT04pICYmIHRva2Vucy5sZW5ndGggPT09IHN0YXJ0ICsgMiAmJlxuICAgICAgICBuZXh0LnRva2VuID09PSAnb3AnICYmIC9eWy0rXSskLy50ZXN0KG5leHQuc3RyKSkge1xuICAgICAgLy8gYW5vbnltb3VzIGxhYmVsXG4gICAgICByZXR1cm4gWydhZGQnLCB7b3A6ICdzeW0nLCBzeW06ICc6JyArIG5leHQuc3RyfV07XG4gICAgfSBlbHNlIGlmICh0b2tlbnMubGVuZ3RoID09PSBzdGFydCArIDEgJiYgZnJvbnQudG9rZW4gPT09ICdvcCcgJiZcbiAgICAgICAgICAgICAgIC9eWy0rXSskLy50ZXN0KGZyb250LnN0cikpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGxhYmVsXG4gICAgICByZXR1cm4gWydhZGQnLCB7b3A6ICdzeW0nLCBzeW06IGZyb250LnN0cn1dO1xuICAgIH1cbiAgICAvLyBpdCBtdXN0IGJlIGFuIGFkZHJlc3Mgb2Ygc29tZSBzb3J0IC0gaXMgaXQgaW5kaXJlY3Q/XG4gICAgaWYgKFRva2VuLmVxKGZyb250LCBUb2tlbi5MUCkgfHxcbiAgICAgICAgKHRoaXMub3B0cy5hbGxvd0JyYWNrZXRzICYmIFRva2VuLmVxKGZyb250LCBUb2tlbi5MQikpKSB7XG4gICAgICBjb25zdCBjbG9zZSA9IFRva2VuLmZpbmRCYWxhbmNlZCh0b2tlbnMsIHN0YXJ0KTtcbiAgICAgIGlmIChjbG9zZSA8IDApIHRoaXMuZmFpbChgVW5iYWxhbmNlZCAke1Rva2VuLm5hbWUoZnJvbnQpfWAsIGZyb250KTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCBzdGFydCArIDEsIGNsb3NlKTtcbiAgICAgIGlmICghYXJncy5sZW5ndGgpIHRoaXMuZmFpbChgQmFkIGFyZ3VtZW50YCwgZnJvbnQpO1xuICAgICAgY29uc3QgZXhwciA9IEV4cHIucGFyc2VPbmx5KGFyZ3NbMF0pO1xuICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIGVpdGhlciBJTkQgb3IgSU5ZXG4gICAgICAgIGlmIChUb2tlbi5lcSh0b2tlbnNbY2xvc2UgKyAxXSwgVG9rZW4uQ09NTUEpICYmXG4gICAgICAgICAgICBUb2tlbi5pc1JlZ2lzdGVyKHRva2Vuc1tjbG9zZSArIDJdLCAneScpKSB7XG4gICAgICAgICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1tjbG9zZSArIDNdKTtcbiAgICAgICAgICByZXR1cm4gWydpbnknLCBleHByXTtcbiAgICAgICAgfVxuICAgICAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zW2Nsb3NlICsgMV0pO1xuICAgICAgICByZXR1cm4gWydpbmQnLCBleHByXTtcbiAgICAgIH0gZWxzZSBpZiAoYXJncy5sZW5ndGggPT09IDIgJiYgYXJnc1sxXS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gSU5YXG4gICAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGFyZ3NbMV1bMF0sICd4JykpIHJldHVybiBbJ2lueCcsIGV4cHJdO1xuICAgICAgfVxuICAgICAgdGhpcy5mYWlsKGBCYWQgYXJndW1lbnRgLCBmcm9udCk7XG4gICAgfVxuICAgIGNvbnN0IGFyZ3MgPSBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCBzdGFydCk7XG4gICAgaWYgKCFhcmdzLmxlbmd0aCkgdGhpcy5mYWlsKGBCYWQgYXJnYCwgZnJvbnQpO1xuICAgIGNvbnN0IGV4cHIgPSBFeHByLnBhcnNlT25seShhcmdzWzBdKTtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHJldHVybiBbJ2FkZCcsIGV4cHJdO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMiAmJiBhcmdzWzFdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoYXJnc1sxXVswXSwgJ3gnKSkgcmV0dXJuIFsnYSx4JywgZXhwcl07XG4gICAgICBpZiAoVG9rZW4uaXNSZWdpc3RlcihhcmdzWzFdWzBdLCAneScpKSByZXR1cm4gWydhLHknLCBleHByXTtcbiAgICB9XG4gICAgdGhpcy5mYWlsKGBCYWQgYXJnYCwgZnJvbnQpO1xuICB9XG5cbiAgcmVsYXRpdmUob3A6IG51bWJlciwgYXJnbGVuOiBudW1iZXIsIGV4cHI6IEV4cHIpIHtcbiAgICAvLyBDYW4gYXJnbGVuIGV2ZXIgYmUgMj8gKHllcyAtIGJybCBvbiA2NTgxNilcbiAgICAvLyBCYXNpYyBwbGFuIGhlcmUgaXMgdGhhdCB3ZSBhY3R1YWxseSB3YW50IGEgcmVsYXRpdmUgZXhwci5cbiAgICAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cCB0byBiZSBtb3JlIGVmZmljaWVudC5cbiAgICAvLyBUT0RPIC0gaGFuZGxlIGxvY2FsL2Fub255bW91cyBsYWJlbHMgc2VwYXJhdGVseT9cbiAgICAvLyBUT0RPIC0gY2hlY2sgdGhlIHJhbmdlIHNvbWVob3c/XG4gICAgY29uc3QgbnVtID0gdGhpcy5jaHVuay5kYXRhLmxlbmd0aCArIGFyZ2xlbiArIDE7XG4gICAgY29uc3QgbWV0YTogRXhwci5NZXRhID0ge3JlbDogdHJ1ZSwgY2h1bms6IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDF9O1xuICAgIGlmICh0aGlzLl9jaHVuaz8ub3JnKSBtZXRhLm9yZyA9IHRoaXMuX2NodW5rLm9yZztcbiAgICBjb25zdCBuZXh0UGMgPSB7b3A6ICdudW0nLCBudW0sIG1ldGF9O1xuICAgIGNvbnN0IHJlbDogRXhwciA9IHtvcDogJy0nLCBhcmdzOiBbZXhwciwgbmV4dFBjXX07XG4gICAgaWYgKGV4cHIuc291cmNlKSByZWwuc291cmNlID0gZXhwci5zb3VyY2U7XG4gICAgdGhpcy5vcGNvZGUob3AsIGFyZ2xlbiwgcmVsKTtcbiAgfVxuXG4gIG9wY29kZShvcDogbnVtYmVyLCBhcmdsZW46IG51bWJlciwgZXhwcjogRXhwcikge1xuICAgIC8vIEVtaXQgc29tZSBieXRlcy5cbiAgICBpZiAoYXJnbGVuKSBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpOyAvLyBCRUZPUkUgb3Bjb2RlIChpbiBjYXNlIG9mICopXG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgY2h1bmsuZGF0YS5wdXNoKG9wKTtcbiAgICBpZiAoYXJnbGVuKSB0aGlzLmFwcGVuZChleHByLCBhcmdsZW4pO1xuICAgIGlmICghY2h1bmsubmFtZSkgY2h1bmsubmFtZSA9IGBDb2RlYDtcbiAgICAvLyBUT0RPIC0gZm9yIHJlbGF0aXZlLCBpZiB3ZSdyZSBpbiB0aGUgc2FtZSBjaHVuaywganVzdCBjb21wYXJlXG4gICAgLy8gdGhlIG9mZnNldC4uLlxuICB9XG5cbiAgYXBwZW5kKGV4cHI6IEV4cHIsIHNpemU6IG51bWJlcikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgbGV0IHZhbCA9IGV4cHIubnVtITtcbi8vY29uc29sZS5sb2coJ2V4cHI6JywgZXhwciwgJ3ZhbDonLCB2YWwpO1xuICAgIGlmIChleHByLm9wICE9PSAnbnVtJyB8fCBleHByLm1ldGE/LnJlbCkge1xuICAgICAgLy8gdXNlIGEgcGxhY2Vob2xkZXIgYW5kIGFkZCBhIHN1YnN0aXR1dGlvblxuICAgICAgY29uc3Qgb2Zmc2V0ID0gY2h1bmsuZGF0YS5sZW5ndGg7XG4gICAgICAoY2h1bmsuc3VicyB8fCAoY2h1bmsuc3VicyA9IFtdKSkucHVzaCh7b2Zmc2V0LCBzaXplLCBleHByfSk7XG4gICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIHNpemUpOyAvLyB3cml0ZSBnb2VzIGFmdGVyIHN1YnNcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53cml0ZU51bWJlcihjaHVuay5kYXRhLCBzaXplLCB2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gRGlyZWN0aXZlIGhhbmRsZXJzXG5cbiAgb3JnKGFkZHI6IG51bWJlciwgbmFtZT86IHN0cmluZykge1xuICAgIHRoaXMuX29yZyA9IGFkZHI7XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIH1cblxuICByZWxvYyhuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5fb3JnID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NodW5rID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICB9XG5cbiAgc2VnbWVudCguLi5zZWdtZW50czogQXJyYXk8c3RyaW5nfG1vZC5TZWdtZW50Pikge1xuICAgIC8vIFVzYWdlOiAuc2VnbWVudCBcIjFhXCIsIFwiMWJcIiwgLi4uXG4gICAgdGhpcy5zZWdtZW50cyA9IHNlZ21lbnRzLm1hcChzID0+IHR5cGVvZiBzID09PSAnc3RyaW5nJyA/IHMgOiBzLm5hbWUpO1xuICAgIGZvciAoY29uc3QgcyBvZiBzZWdtZW50cykge1xuICAgICAgaWYgKHR5cGVvZiBzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5zZWdtZW50RGF0YS5nZXQocy5uYW1lKSB8fCB7bmFtZTogcy5uYW1lfTtcbiAgICAgICAgdGhpcy5zZWdtZW50RGF0YS5zZXQocy5uYW1lLCBtb2QuU2VnbWVudC5tZXJnZShkYXRhLCBzKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2NodW5rID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX25hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhc3NlcnQoZXhwcjogRXhwcikge1xuICAgIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgY29uc3QgdmFsID0gdGhpcy5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodmFsICE9IG51bGwpIHtcbiAgICAgIGlmICghdmFsKSB7XG4gICAgICAgIGxldCBwYyA9ICcnO1xuICAgICAgICBjb25zdCBjaHVuayA9IHRoaXMuY2h1bms7XG4gICAgICAgIGlmIChjaHVuay5vcmcgIT0gbnVsbCkge1xuICAgICAgICAgIHBjID0gYCAoUEM9JCR7KGNodW5rLm9yZyArIGNodW5rLmRhdGEubGVuZ3RoKS50b1N0cmluZygxNil9KWA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mYWlsKGBBc3NlcnRpb24gZmFpbGVkJHtwY31gLCBleHByKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgICAoY2h1bmsuYXNzZXJ0cyB8fCAoY2h1bmsuYXNzZXJ0cyA9IFtdKSkucHVzaChleHByKTtcbiAgICB9XG4gIH1cblxuICBieXRlKC4uLmFyZ3M6IEFycmF5PEV4cHJ8c3RyaW5nfG51bWJlcj4pIHtcbiAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICBmb3IgKGNvbnN0IGFyZyBvZiBhcmdzKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhpcy53cml0ZU51bWJlcihjaHVuay5kYXRhLCAxLCBhcmcpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgICAgICB3cml0ZVN0cmluZyhjaHVuay5kYXRhLCBhcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoYXJnLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXMoY291bnQ6IG51bWJlciwgdmFsdWU/OiBudW1iZXIpIHtcbiAgICBpZiAoIWNvdW50KSByZXR1cm47XG4gICAgdGhpcy5ieXRlKC4uLm5ldyBBcnJheShjb3VudCkuZmlsbCh2YWx1ZSA/PyAwKSk7XG4gIH1cblxuICB3b3JkKC4uLmFyZ3M6IEFycmF5PEV4cHJ8bnVtYmVyPikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIDIsIGFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFwcGVuZChhcmcsIDIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZyZWUoc2l6ZTogbnVtYmVyLCB0b2tlbj86IFRva2VuKSB7XG4gICAgLy8gTXVzdCBiZSBpbiAub3JnIGZvciBhIHNpbmdsZSBzZWdtZW50LlxuICAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgdGhpcy5mYWlsKGAuZnJlZSBpbiAucmVsb2MgbW9kZWAsIHRva2VuKTtcbiAgICBjb25zdCBzZWdtZW50cyA9IHRoaXMuc2VnbWVudHMubGVuZ3RoID4gMSA/IHRoaXMuc2VnbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMuc2VnbWVudERhdGEuZ2V0KHMpO1xuICAgICAgaWYgKCFkYXRhIHx8IGRhdGEubWVtb3J5ID09IG51bGwgfHwgZGF0YS5zaXplID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkYXRhLm1lbW9yeSA+IHRoaXMuX29yZyEpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkYXRhLm1lbW9yeSArIGRhdGEuc2l6ZSA8PSB0aGlzLl9vcmchKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KSA6IHRoaXMuc2VnbWVudHM7XG4gICAgaWYgKHNlZ21lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhpcy5mYWlsKGAuZnJlZSB3aXRoIG5vbi11bmlxdWUgc2VnbWVudDogJHt0aGlzLnNlZ21lbnRzfWAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgICB0aGlzLmZhaWwoYC5mcmVlIHdpdGggbmVnYXRpdmUgc2l6ZTogJHtzaXplfWAsIHRva2VuKTtcbiAgICB9XG4gICAgLy8gSWYgd2UndmUgZ290IGFuIG9wZW4gY2h1bmssIGVuZCBpdC5cbiAgICBpZiAodGhpcy5fY2h1bmspIHtcbiAgICAgIHRoaXMuX29yZyArPSB0aGlzLl9jaHVuay5kYXRhLmxlbmd0aDtcbiAgICB9XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgLy8gRW5zdXJlIGEgc2VnbWVudCBvYmplY3QgZXhpc3RzLlxuICAgIGNvbnN0IG5hbWUgPSBzZWdtZW50c1swXTtcbiAgICBsZXQgcyA9IHRoaXMuc2VnbWVudERhdGEuZ2V0KG5hbWUpO1xuICAgIGlmICghcykgdGhpcy5zZWdtZW50RGF0YS5zZXQobmFtZSwgcyA9IHtuYW1lfSk7XG4gICAgKHMuZnJlZSB8fCAocy5mcmVlID0gW10pKS5wdXNoKFt0aGlzLl9vcmcsIHRoaXMuX29yZyArIHNpemVdKTtcbiAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIGZyZWUgc3BhY2UuXG4gICAgdGhpcy5fb3JnICs9IHNpemU7XG4gIH1cblxuICBzZWdtZW50UHJlZml4KHByZWZpeDogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyAtIG1ha2UgbW9yZSBvZiBhIHRvZG8gYWJvdXQgY2hhbmdpbmcgdGhpcz9cbiAgICB0aGlzLl9zZWdtZW50UHJlZml4ID0gcHJlZml4O1xuICB9XG5cbiAgaW1wb3J0KC4uLmlkZW50czogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGlkZW50IG9mIGlkZW50cykge1xuICAgICAgdGhpcy5nbG9iYWxzLnNldChpZGVudCwgJ2ltcG9ydCcpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCguLi5pZGVudHM6IHN0cmluZ1tdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudCBvZiBpZGVudHMpIHtcbiAgICAgIHRoaXMuZ2xvYmFscy5zZXQoaWRlbnQsICdleHBvcnQnKTtcbiAgICB9XG4gIH1cblxuICBzY29wZShuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5lbnRlclNjb3BlKG5hbWUsICdzY29wZScpO1xuICB9XG5cbiAgcHJvYyhuYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmxhYmVsKG5hbWUpO1xuICAgIHRoaXMuZW50ZXJTY29wZShuYW1lLCAncHJvYycpO1xuICB9XG5cbiAgZW50ZXJTY29wZShuYW1lOiBzdHJpbmd8dW5kZWZpbmVkLCBraW5kOiAnc2NvcGUnfCdwcm9jJykge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gbmFtZSA/IHRoaXMuY3VycmVudFNjb3BlLmNoaWxkcmVuLmdldChuYW1lKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGlmICh0aGlzLm9wdHMucmVlbnRyYW50U2NvcGVzKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFNjb3BlID0gZXhpc3Rpbmc7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmFpbChgQ2Fubm90IHJlLWVudGVyIHNjb3BlICR7bmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgY2hpbGQgPSBuZXcgU2NvcGUodGhpcy5jdXJyZW50U2NvcGUsIGtpbmQpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY29wZS5jaGlsZHJlbi5zZXQobmFtZSwgY2hpbGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY29wZS5hbm9ueW1vdXNDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50U2NvcGUgPSBjaGlsZDtcbiAgfVxuXG4gIGVuZFNjb3BlKCkgeyB0aGlzLmV4aXRTY29wZSgnc2NvcGUnKTsgfVxuICBlbmRQcm9jKCkgeyB0aGlzLmV4aXRTY29wZSgncHJvYycpOyB9XG5cbiAgZXhpdFNjb3BlKGtpbmQ6ICdzY29wZSd8J3Byb2MnKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFNjb3BlLmtpbmQgIT09IGtpbmQgfHwgIXRoaXMuY3VycmVudFNjb3BlLnBhcmVudCkge1xuICAgICAgdGhpcy5mYWlsKGAuZW5kJHtraW5kfSB3aXRob3V0IC4ke2tpbmR9YCk7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFNjb3BlID0gdGhpcy5jdXJyZW50U2NvcGUucGFyZW50O1xuICB9XG5cbiAgcHVzaFNlZyguLi5zZWdtZW50czogQXJyYXk8c3RyaW5nfG1vZC5TZWdtZW50Pikge1xuICAgIHRoaXMuc2VnbWVudFN0YWNrLnB1c2goW3RoaXMuc2VnbWVudHMsIHRoaXMuX2NodW5rXSk7XG4gICAgdGhpcy5zZWdtZW50KC4uLnNlZ21lbnRzKTtcbiAgfVxuXG4gIHBvcFNlZygpIHtcbiAgICBpZiAoIXRoaXMuc2VnbWVudFN0YWNrLmxlbmd0aCkgdGhpcy5mYWlsKGAucG9wc2VnIHdpdGhvdXQgLnB1c2hzZWdgKTtcbiAgICBbdGhpcy5zZWdtZW50cywgdGhpcy5fY2h1bmtdID0gdGhpcy5zZWdtZW50U3RhY2sucG9wKCkhO1xuICB9XG5cbiAgbW92ZShzaXplOiBudW1iZXIsIHNvdXJjZTogRXhwcikge1xuICAgIHRoaXMuYXBwZW5kKHtvcDogJy5tb3ZlJywgYXJnczogW3NvdXJjZV0sIG1ldGE6IHtzaXplfX0sIHNpemUpO1xuICB9XG5cbiAgLy8gVXRpbGl0eSBtZXRob2RzIGZvciBwcm9jZXNzaW5nIGFyZ3VtZW50c1xuXG4gIHBhcnNlQ29uc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBudW1iZXIge1xuICAgIGNvbnN0IHZhbCA9IHRoaXMuZXZhbHVhdGUoRXhwci5wYXJzZU9ubHkodG9rZW5zLCBzdGFydCkpO1xuICAgIGlmICh2YWwgIT0gbnVsbCkgcmV0dXJuIHZhbDtcbiAgICB0aGlzLmZhaWwoYEV4cHJlc3Npb24gaXMgbm90IGNvbnN0YW50YCwgdG9rZW5zWzFdKTtcbiAgfVxuICBwYXJzZU5vQXJncyh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSkge1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMV0pO1xuICB9XG4gIHBhcnNlRXhwcih0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IEV4cHIge1xuICAgIHJldHVybiBFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0KTtcbiAgfVxuICAvLyBwYXJzZVN0cmluZ0xpc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBzdHJpbmdbXSB7XG4gIC8vICAgcmV0dXJuIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpLm1hcCh0cyA9PiB7XG4gIC8vICAgICBjb25zdCBzdHIgPSBUb2tlbi5leHBlY3RTdHJpbmcodHNbMF0pO1xuICAvLyAgICAgVG9rZW4uZXhwZWN0RW9sKHRzWzFdLCBcImEgc2luZ2xlIHN0cmluZ1wiKTtcbiAgLy8gICAgIHJldHVybiBzdHI7XG4gIC8vICAgfSk7XG4gIC8vIH1cbiAgcGFyc2VTdHIodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0ciA9IFRva2VuLmV4cGVjdFN0cmluZyh0b2tlbnNbc3RhcnRdKTtcbiAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zW3N0YXJ0ICsgMV0sIFwiYSBzaW5nbGUgc3RyaW5nXCIpO1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBwYXJzZVNlZ21lbnRMaXN0KHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogQXJyYXk8c3RyaW5nfG1vZC5TZWdtZW50PiB7XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCBzdGFydCArIDEpIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgYSBzZWdtZW50IGxpc3RgLCB0b2tlbnNbc3RhcnQgLSAxXSk7XG4gICAgfVxuICAgIHJldHVybiBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCAxKS5tYXAodHMgPT4ge1xuICAgICAgY29uc3Qgc3RyID0gdGhpcy5fc2VnbWVudFByZWZpeCArIFRva2VuLmV4cGVjdFN0cmluZyh0c1swXSk7XG4gICAgICBpZiAodHMubGVuZ3RoID09PSAxKSByZXR1cm4gc3RyO1xuICAgICAgaWYgKCFUb2tlbi5lcSh0c1sxXSwgVG9rZW4uQ09MT04pKSB7XG4gICAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29tbWEgb3IgY29sb246ICR7VG9rZW4ubmFtZSh0c1sxXSl9YCwgdHNbMV0pO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2VnID0ge25hbWU6IHN0cn0gYXMgbW9kLlNlZ21lbnQ7XG4gICAgICAvLyBUT0RPIC0gcGFyc2UgZXhwcmVzc2lvbnMuLi5cbiAgICAgIGNvbnN0IGF0dHJzID0gVG9rZW4ucGFyc2VBdHRyTGlzdCh0cywgMSk7IC8vIDogaWRlbnQgWy4uLl1cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsXSBvZiBhdHRycykge1xuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgIGNhc2UgJ2JhbmsnOiBzZWcuYmFuayA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdzaXplJzogc2VnLnNpemUgPSB0aGlzLnBhcnNlQ29uc3QodmFsLCAwKTsgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnb2ZmJzogc2VnLm9mZnNldCA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdtZW0nOiBzZWcubWVtb3J5ID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIC8vIFRPRE8gLSBJIGRvbid0IGZ1bGx5IHVuZGVyc3RhbmQgdGhlc2UuLi5cbiAgICAgICAgICAvLyBjYXNlICd6ZXJvcGFnZSc6IHNlZy5hZGRyZXNzaW5nID0gMTtcbiAgICAgICAgICBkZWZhdWx0OiB0aGlzLmZhaWwoYFVua25vd24gc2VnbWVudCBhdHRyOiAke2tleX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlZztcbiAgICB9KTtcbiAgfVxuXG4gIHBhcnNlUmVzQXJncyh0b2tlbnM6IFRva2VuW10pOiBbbnVtYmVyLCBudW1iZXI/XSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMucGFyc2VEYXRhTGlzdCh0b2tlbnMpO1xuICAgIGlmIChkYXRhLmxlbmd0aCA+IDIpIHRoaXMuZmFpbChgRXhwZWN0ZWQgYXQgbW9zdCAyIGFyZ3NgLCBkYXRhWzJdKTtcbiAgICBpZiAoIWRhdGEubGVuZ3RoKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGF0IGxlYXN0IDEgYXJnYCk7XG4gICAgY29uc3QgY291bnQgPSB0aGlzLmV2YWx1YXRlKGRhdGFbMF0pO1xuICAgIGlmIChjb3VudCA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IGNvdW50YCk7XG4gICAgY29uc3QgdmFsID0gZGF0YVsxXSAmJiB0aGlzLmV2YWx1YXRlKGRhdGFbMV0pO1xuICAgIGlmIChkYXRhWzFdICYmIHZhbCA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IHZhbHVlYCk7XG4gICAgcmV0dXJuIFtjb3VudCwgdmFsXTtcbiAgfVxuXG4gIHBhcnNlRGF0YUxpc3QodG9rZW5zOiBUb2tlbltdKTogQXJyYXk8RXhwcj47XG4gIHBhcnNlRGF0YUxpc3QodG9rZW5zOiBUb2tlbltdLCBhbGxvd1N0cmluZzogdHJ1ZSk6IEFycmF5PEV4cHJ8c3RyaW5nPjtcbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10sIGFsbG93U3RyaW5nID0gZmFsc2UpOiBBcnJheTxFeHByfHN0cmluZz4ge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgMikge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGRhdGEgbGlzdGAsIHRva2Vuc1swXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogQXJyYXk8RXhwcnxzdHJpbmc+ID0gW107XG4gICAgZm9yIChjb25zdCB0ZXJtIG9mIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpKSB7XG4gICAgICBpZiAoYWxsb3dTdHJpbmcgJiYgdGVybS5sZW5ndGggPT09IDEgJiYgdGVybVswXS50b2tlbiA9PT0gJ3N0cicpIHtcbiAgICAgICAgb3V0LnB1c2godGVybVswXS5zdHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0LnB1c2godGhpcy5yZXNvbHZlKEV4cHIucGFyc2VPbmx5KHRlcm0pKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwYXJzZUlkZW50aWZpZXJMaXN0KHRva2VuczogVG9rZW5bXSk6IHN0cmluZ1tdIHtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IDIpIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgaWRlbnRpZmllcihzKWAsIHRva2Vuc1swXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlcm0gb2YgVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkpIHtcbiAgICAgIGlmICh0ZXJtLmxlbmd0aCAhPT0gMSB8fCB0ZXJtWzBdLnRva2VuICE9PSAnaWRlbnQnKSB7XG4gICAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgaWRlbnRpZmllcjogJHtUb2tlbi5uYW1lKHRlcm1bMF0pfWAsIHRlcm1bMF0pO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2goVG9rZW4uc3RyKHRlcm1bMF0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHBhcnNlT3B0aW9uYWxJZGVudGlmaWVyKHRva2VuczogVG9rZW5bXSk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGNvbnN0IHRvayA9IHRva2Vuc1sxXTtcbiAgICBpZiAoIXRvaykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCBpZGVudCA9IFRva2VuLmV4cGVjdElkZW50aWZpZXIodG9rKTtcbiAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zWzJdKTtcbiAgICByZXR1cm4gaWRlbnQ7XG4gIH1cblxuICBwYXJzZVJlcXVpcmVkSWRlbnRpZmllcih0b2tlbnM6IFRva2VuW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkZW50ID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2tlbnNbMV0pO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMl0pO1xuICAgIHJldHVybiBpZGVudDtcbiAgfVxuXG4gIHBhcnNlTW92ZUFyZ3ModG9rZW5zOiBUb2tlbltdKTogW251bWJlciwgRXhwcl0ge1xuICAgIC8vIC5tb3ZlIDEwLCBpZGVudCAgICAgICAgOyBtdXN0IGJlIGFuIG9mZnNldFxuICAgIC8vIC5tb3ZlIDEwLCAkMTIzNCwgXCJzZWdcIiA7IG1heWJlIHN1cHBvcnQgdGhpcz9cbiAgICBjb25zdCBhcmdzID0gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAyIC8qICYmIGFyZ3MubGVuZ3RoICE9PSAzICovKSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IG51bWJlciwgdGhlbiBpZGVudGlmaWVyYCk7XG4gICAgfVxuICAgIGNvbnN0IG51bSA9IHRoaXMuZXZhbHVhdGUoRXhwci5wYXJzZU9ubHkoYXJnc1swXSkpO1xuICAgIGlmIChudW0gPT0gbnVsbCkgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGNvbnN0YW50IG51bWJlcmApO1xuXG4gICAgLy8gbGV0IHNlZ05hbWUgPSB0aGlzLnNlZ21lbnRzLmxlbmd0aCA9PT0gMSA/IHRoaXMuc2VnbWVudHNbMF0gOiB1bmRlZmluZWQ7XG4gICAgLy8gaWYgKGFyZ3MubGVuZ3RoID09PSAzKSB7XG4gICAgLy8gICBpZiAoYXJnc1syXS5sZW5ndGggIT09IDEgfHwgYXJnc1syXVswXS50b2tlbiAhPT0gJ3N0cicpIHtcbiAgICAvLyAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIHNpbmdsZSBzZWdtZW50IG5hbWVgLCB0aGlzLmFyZ3NbMl1bMF0pO1xuICAgIC8vICAgfVxuICAgIC8vICAgc2VnTmFtZSA9IGFyZ3NbMl1bMF0uc3RyO1xuICAgIC8vIH1cbiAgICAvLyBjb25zdCBzZWcgPSBzZWdOYW1lID8gdGhpcy5zZWdtZW50RGF0YS5nZXQoc2VnTmFtZSkgOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLnJlc29sdmUoRXhwci5wYXJzZU9ubHkoYXJnc1sxXSkpO1xuICAgIGlmIChvZmZzZXQub3AgPT09ICdudW0nICYmIG9mZnNldC5tZXRhPy5jaHVuayAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW251bSwgb2Zmc2V0XTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGNvbnN0YW50IG9mZnNldGAsIGFyZ3NbMV1bMF0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIERpYWdub3N0aWNzXG5cbiAgZmFpbChtc2c6IHN0cmluZywgYXQ/OiB7c291cmNlPzogU291cmNlSW5mb30pOiBuZXZlciB7XG4gICAgaWYgKGF0Py5zb3VyY2UpIHRocm93IG5ldyBFcnJvcihtc2cgKyBUb2tlbi5hdChhdCkpO1xuICAgIGlmICghdGhpcy5fc291cmNlICYmIHRoaXMuX2NodW5rPy5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IobXNnICsgYFxcbiAgaW4gJHt0aGlzLl9jaHVuay5uYW1lfWApO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnICsgVG9rZW4uYXQoe3NvdXJjZTogdGhpcy5fc291cmNlfSkpO1xuICB9XG5cbiAgd3JpdGVOdW1iZXIoZGF0YTogbnVtYmVyW10sIHNpemU6IG51bWJlciwgdmFsPzogbnVtYmVyKSB7XG4gICAgLy8gVE9ETyAtIGlmIHZhbCBpcyBhIHNpZ25lZC91bnNpZ25lZCAzMi1iaXQgbnVtYmVyLCBpdCdzIG5vdCBjbGVhclxuICAgIC8vIHdoZXRoZXIgd2UgbmVlZCB0byB0cmVhdCBpdCBvbmUgd2F5IG9yIHRoZSBvdGhlci4uLj8gIGJ1dCBtYXliZVxuICAgIC8vIGl0IGRvZXNuJ3QgbWF0dGVyIHNpbmNlIHdlJ3JlIG9ubHkgbG9va2luZyBhdCAzMiBiaXRzIGFueXdheS5cbiAgICBjb25zdCBzID0gKHNpemUpIDw8IDM7XG4gICAgaWYgKHZhbCAhPSBudWxsICYmICh2YWwgPCAoLTEgPDwgcykgfHwgdmFsID49ICgxIDw8IHMpKSkge1xuICAgICAgY29uc3QgbmFtZSA9IFsnYnl0ZScsICd3b3JkJywgJ2ZhcndvcmQnLCAnZHdvcmQnXVtzaXplIC0gMV07XG4gICAgICB0aGlzLmZhaWwoYE5vdCBhICR7bmFtZX06ICQke3ZhbC50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgICBkYXRhLnB1c2godmFsICE9IG51bGwgPyB2YWwgJiAweGZmIDogMHhmZik7XG4gICAgICBpZiAodmFsICE9IG51bGwpIHZhbCA+Pj0gODtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVTdHJpbmcoZGF0YTogbnVtYmVyW10sIHN0cjogc3RyaW5nKSB7XG4gIC8vIFRPRE8gLSBzdXBwb3J0IGNoYXJhY3RlciBtYXBzIChwYXNzIGFzIHRoaXJkIGFyZz8pXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgZGF0YS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKTtcbiAgfVxufVxuXG50eXBlIEFyZ01vZGUgPVxuICAgICdhZGQnIHwgJ2EseCcgfCAnYSx5JyB8IC8vIHBzZXVkbyBtb2Rlc1xuICAgICdhYnMnIHwgJ2FieCcgfCAnYWJ5JyB8XG4gICAgJ2ltbScgfCAnaW5kJyB8ICdpbngnIHwgJ2lueScgfFxuICAgICdyZWwnIHwgJ3pwZycgfCAnenB4JyB8ICd6cHknO1xuXG5leHBvcnQgdHlwZSBBcmcgPSBbJ2FjYycgfCAnaW1wJ10gfCBbQXJnTW9kZSwgRXhwcl07XG5cbmV4cG9ydCBuYW1lc3BhY2UgQXNzZW1ibGVyIHtcbiAgZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgICBhbGxvd0JyYWNrZXRzPzogYm9vbGVhbjtcbiAgICByZWVudHJhbnRTY29wZXM/OiBib29sZWFuO1xuICB9XG59XG4iXX0=