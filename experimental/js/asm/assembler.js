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
        if (!ident.startsWith('@'))
            this.cheapLocals.clear();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZW1ibGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9hc3NlbWJsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QixPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBYSxLQUFLLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFDMUQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFLdkMsTUFBTSxNQUFNO0NBb0JYO0FBRUQsTUFBZSxTQUFTO0lBQXhCO1FBRVcsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBaUMvQyxDQUFDO0lBL0JXLFNBQVMsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQVVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsZUFBeUI7UUFDN0MsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLElBQUksR0FBRyxFQUFFO1lBQ1AsSUFBSSxJQUFJLEtBQUssSUFBSTtnQkFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNyQyxPQUFPLEdBQUcsQ0FBQztTQUNaO1FBQ0QsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQU12QyxNQUFNLE1BQU0sR0FBVyxFQUFFLENBQUM7UUFDMUIsS0FBSyxDQUFDLE9BQU8s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SUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBRXBELElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO29CQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDN0Q7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNsQztRQUNELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDN0MsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7Z0JBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztnQkFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzdEO1FBQ0QsSUFBSSxD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SSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckQsSUFBSSxNQUFNLENBQUMsRUFBRSxLQUFLLEtBQUssSUFBSSxPQUFBLE1BQU0sQ0FBQyxJQUFJLDBDQUFFLEtBQUssS0FBSSxJQUFJLEVBQUU7WUFDckQsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN0QjthQUFNO1lBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRDtJQUNILENBQUM7SUFJRCxJQUFJLENBQUMsR0FBVyxFQUFFLEVBQTBCOztRQUMxQyxVQUFJLEVBQUUsMENBQUUsTUFBTTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFjLEVBQUUsSUFBWSxFQUFFLEdBQVk7UUFJcEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNsRDtRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQyxJQUFJLEdBQUcsSUFBSSxJQUFJO2dCQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7U0FDNUI7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFjLEVBQUUsR0FBVztJQUU5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUM5QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NwdX0gZnJvbSAnLi9jcHUuanMnO1xuaW1wb3J0IHtFeHByfSBmcm9tICcuL2V4cHIuanMnO1xuaW1wb3J0ICogYXMgbW9kIGZyb20gJy4vbW9kdWxlLmpzJztcbmltcG9ydCB7U291cmNlSW5mbywgVG9rZW4sIFRva2VuU291cmNlfSBmcm9tICcuL3Rva2VuLmpzJztcbmltcG9ydCB7VG9rZW5pemVyfSBmcm9tICcuL3Rva2VuaXplci5qcyc7XG5pbXBvcnQge2Fzc2VydE5ldmVyfSBmcm9tICcuLi91dGlsLmpzJztcblxudHlwZSBDaHVuayA9IG1vZC5DaHVuazxudW1iZXJbXT47XG50eXBlIE1vZHVsZSA9IG1vZC5Nb2R1bGU7XG5cbmNsYXNzIFN5bWJvbCB7XG4gIC8qKlxuICAgKiBJbmRleCBpbnRvIHRoZSBnbG9iYWwgc3ltYm9sIGFycmF5LiAgT25seSBhcHBsaWVzIHRvIGltbXV0YWJsZVxuICAgKiBzeW1ib2xzIHRoYXQgbmVlZCB0byBiZSBhY2Nlc3NpYmxlIGF0IGxpbmsgdGltZS4gIE11dGFibGUgc3ltYm9sc1xuICAgKiBhbmQgc3ltYm9scyB3aXRoIGtub3duIHZhbHVlcyBhdCB1c2UgdGltZSBhcmUgbm90IGFkZGVkIHRvIHRoZVxuICAgKiBnbG9iYWwgbGlzdCBhbmQgYXJlIHRoZXJlZm9yZSBoYXZlIG5vIGlkLiAgTXV0YWJpbGl0eSBpcyB0cmFja2VkXG4gICAqIGJ5IHN0b3JpbmcgYSAtMSBoZXJlLlxuICAgKi9cbiAgaWQ/OiBudW1iZXI7XG4gIC8qKiBXaGV0aGVyIHRoZSBzeW1ib2wgaGFzIGJlZW4gZXhwbGljaXRseSBzY29wZWQuICovXG4gIHNjb3BlZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZXhwcmVzc2lvbiBmb3IgdGhlIHN5bWJvbC4gIE11c3QgYmUgYSBzdGF0aWNhbGx5LWV2YWx1YXRhYmxlIGNvbnN0YW50XG4gICAqIGZvciBtdXRhYmxlIHN5bWJvbHMuICBVbmRlZmluZWQgZm9yIGZvcndhcmQtcmVmZXJlbmNlZCBzeW1ib2xzLlxuICAgKi9cbiAgZXhwcj86IEV4cHI7XG4gIC8qKiBOYW1lIHRoaXMgc3ltYm9sIGlzIGV4cG9ydGVkIGFzLiAqL1xuICBleHBvcnQ/OiBzdHJpbmc7XG4gIC8qKiBUb2tlbiB3aGVyZSB0aGlzIHN5bWJvbCB3YXMgcmVmJ2QuICovXG4gIHJlZj86IHtzb3VyY2U/OiBTb3VyY2VJbmZvfTsgLy8gVE9ETyAtIHBsdW1iIHRoaXMgdGhyb3VnaFxufVxuXG5hYnN0cmFjdCBjbGFzcyBCYXNlU2NvcGUge1xuICAvL2Nsb3NlZCA9IGZhbHNlO1xuICByZWFkb25seSBzeW1ib2xzID0gbmV3IE1hcDxzdHJpbmcsIFN5bWJvbD4oKTtcblxuICBwcm90ZWN0ZWQgcGlja1Njb3BlKG5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIEJhc2VTY29wZV0ge1xuICAgIHJldHVybiBbbmFtZSwgdGhpc107XG4gIH1cblxuICAvLyBUT0RPIC0gbWF5IG5lZWQgYWRkaXRpb25hbCBvcHRpb25zOlxuICAvLyAgIC0gbG9va3VwIGNvbnN0YW50IC0gd29uJ3QgcmV0dXJuIGEgbXV0YWJsZSB2YWx1ZSBvciBhIHZhbHVlIGZyb21cbiAgLy8gICAgIGEgcGFyZW50IHNjb3BlLCBpbXBsaWVzIG5vIGZvcndhcmQgcmVmXG4gIC8vICAgLSBzaGFsbG93IC0gZG9uJ3QgcmVjdXJzZSB1cCB0aGUgY2hhaW4sIGZvciBhc3NpZ25tZW50IG9ubHk/P1xuICAvLyBNaWdodCBqdXN0IG1lYW4gYWxsb3dGb3J3YXJkUmVmIGlzIGFjdHVhbGx5IGp1c3QgYSBtb2RlIHN0cmluZz9cbiAgLy8gICogY2E2NSdzIC5kZWZpbmVkc3ltYm9sIGlzIG1vcmUgcGVybWlzc2l2ZSB0aGFuIC5pZmNvbnN0XG4gIHJlc29sdmUobmFtZTogc3RyaW5nLCBhbGxvd0ZvcndhcmRSZWY6IHRydWUpOiBTeW1ib2w7XG4gIHJlc29sdmUobmFtZTogc3RyaW5nLCBhbGxvd0ZvcndhcmRSZWY/OiBib29sZWFuKTogU3ltYm9sfHVuZGVmaW5lZDtcbiAgcmVzb2x2ZShuYW1lOiBzdHJpbmcsIGFsbG93Rm9yd2FyZFJlZj86IGJvb2xlYW4pOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBbdGFpbCwgc2NvcGVdID0gdGhpcy5waWNrU2NvcGUobmFtZSk7XG4gICAgbGV0IHN5bSA9IHNjb3BlLnN5bWJvbHMuZ2V0KHRhaWwpO1xuLy9jb25zb2xlLmxvZygncmVzb2x2ZTonLG5hbWUsJ3N5bT0nLHN5bSwnZndkPycsYWxsb3dGb3J3YXJkUmVmKTtcbiAgICBpZiAoc3ltKSB7XG4gICAgICBpZiAodGFpbCAhPT0gbmFtZSkgc3ltLnNjb3BlZCA9IHRydWU7XG4gICAgICByZXR1cm4gc3ltO1xuICAgIH1cbiAgICBpZiAoIWFsbG93Rm9yd2FyZFJlZikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAvLyBpZiAoc2NvcGUuY2xvc2VkKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIHN5bWJvbDogJHtuYW1lfWApO1xuICAgIC8vIG1ha2UgYSBuZXcgc3ltYm9sIC0gYnV0IG9ubHkgaW4gYW4gb3BlbiBzY29wZVxuICAgIC8vY29uc3Qgc3ltYm9sID0ge2lkOiB0aGlzLnN5bWJvbEFycmF5Lmxlbmd0aH07XG4vL2NvbnNvbGUubG9nKCdjcmVhdGVkOicsc3ltYm9sKTtcbiAgICAvL3RoaXMuc3ltYm9sQXJyYXkucHVzaChzeW1ib2wpO1xuICAgIGNvbnN0IHN5bWJvbDogU3ltYm9sID0ge307XG4gICAgc2NvcGUuc3ltYm9scy5zZXQodGFpbCwgc3ltYm9sKTtcbiAgICBpZiAodGFpbCAhPT0gbmFtZSkgc3ltYm9sLnNjb3BlZCA9IHRydWU7XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxufVxuXG5jbGFzcyBTY29wZSBleHRlbmRzIEJhc2VTY29wZSB7XG4gIHJlYWRvbmx5IGdsb2JhbDogU2NvcGU7XG4gIHJlYWRvbmx5IGNoaWxkcmVuID0gbmV3IE1hcDxzdHJpbmcsIFNjb3BlPigpO1xuICByZWFkb25seSBhbm9ueW1vdXNDaGlsZHJlbjogU2NvcGVbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHBhcmVudD86IFNjb3BlLCByZWFkb25seSBraW5kPzogJ3Njb3BlJ3wncHJvYycpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZ2xvYmFsID0gcGFyZW50ID8gcGFyZW50Lmdsb2JhbCA6IHRoaXM7XG4gIH1cblxuICBwaWNrU2NvcGUobmFtZTogc3RyaW5nKTogW3N0cmluZywgU2NvcGVdIHtcbiAgICAvLyBUT0RPIC0gcGx1bWIgdGhlIHNvdXJjZSBpbmZvcm1hdGlvbiB0aHJvdWdoIGhlcmU/XG4gICAgbGV0IHNjb3BlOiBTY29wZSA9IHRoaXM7XG4gICAgY29uc3Qgc3BsaXQgPSBuYW1lLnNwbGl0KC86Oi9nKTtcbiAgICBjb25zdCB0YWlsID0gc3BsaXQucG9wKCkhO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghaSAmJiAhc3BsaXRbaV0pIHsgLy8gZ2xvYmFsXG4gICAgICAgIHNjb3BlID0gc2NvcGUuZ2xvYmFsO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxldCBjaGlsZCA9IHNjb3BlLmNoaWxkcmVuLmdldChzcGxpdFtpXSk7XG4gICAgICB3aGlsZSAoIWkgJiYgc2NvcGUucGFyZW50ICYmICFjaGlsZCkge1xuICAgICAgICBjaGlsZCA9IChzY29wZSA9IHNjb3BlLnBhcmVudCkuY2hpbGRyZW4uZ2V0KHNwbGl0W2ldKTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBuYW1lIGhhcyBhbiBleHBsaWNpdCBzY29wZSwgdGhpcyBpcyBhbiBlcnJvcj9cbiAgICAgIGlmICghY2hpbGQpIHtcbiAgICAgICAgY29uc3Qgc2NvcGVOYW1lID0gc3BsaXQuc2xpY2UoMCwgaSArIDEpLmpvaW4oJzo6Jyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgc2NvcGUgJHtzY29wZU5hbWV9YCk7XG4gICAgICB9XG4gICAgICBzY29wZSA9IGNoaWxkO1xuICAgIH1cbiAgICByZXR1cm4gW3RhaWwsIHNjb3BlXTtcbiAgfVxuXG4gIC8vIGNsb3NlKCkge1xuICAvLyAgIGlmICghdGhpcy5wYXJlbnQpIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGNsb3NlIGdsb2JhbCBzY29wZWApO1xuICAvLyAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgLy8gICAvLyBBbnkgdW5kZWZpbmVkIGlkZW50aWZpZXJzIGluIHRoZSBzY29wZSBhcmUgYXV0b21hdGljYWxseVxuICAvLyAgIC8vIHByb21vdGVkIHRvIHRoZSBwYXJlbnQgc2NvcGUuXG4gIC8vICAgZm9yIChjb25zdCBbbmFtZSwgc3ltXSBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgLy8gICAgIGlmIChzeW0uZXhwcikgY29udGludWU7IC8vIGlmIGl0J3MgZGVmaW5lZCBpbiB0aGUgc2NvcGUsIGRvIG5vdGhpbmdcbiAgLy8gICAgIGNvbnN0IHBhcmVudFN5bSA9IHRoaXMucGFyZW50LnN5bWJvbHMuZ2V0KHN5bSk7XG4gIC8vICAgfVxuICAvLyB9XG59XG5cbmNsYXNzIENoZWFwU2NvcGUgZXh0ZW5kcyBCYXNlU2NvcGUge1xuXG4gIC8qKiBDbGVhciBldmVyeXRoaW5nIG91dCwgbWFraW5nIHN1cmUgZXZlcnl0aGluZyB3YXMgZGVmaW5lZC4gKi9cbiAgY2xlYXIoKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgc3ltXSBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIGlmICghc3ltLmV4cHIpIHtcbiAgICAgICAgY29uc3QgYXQgPSBzeW0ucmVmID8gVG9rZW4uYXQoc3ltLnJlZikgOiAnJztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDaGVhcCBsb2NhbCBsYWJlbCBuZXZlciBkZWZpbmVkOiAke25hbWV9JHthdH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zeW1ib2xzLmNsZWFyKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFzc2VtYmxlciB7XG5cbiAgLyoqIFRoZSBjdXJyZW50bHktb3BlbiBzZWdtZW50KHMpLiAqL1xuICBwcml2YXRlIHNlZ21lbnRzOiByZWFkb25seSBzdHJpbmdbXSA9IFsnY29kZSddO1xuXG4gIC8qKiBEYXRhIG9uIGFsbCB0aGUgc2VnbWVudHMuICovXG4gIHByaXZhdGUgc2VnbWVudERhdGEgPSBuZXcgTWFwPHN0cmluZywgbW9kLlNlZ21lbnQ+KCk7XG5cbiAgLyoqIFN0YWNrIG9mIHNlZ21lbnRzIGZvciAucHVzaHNlZy8ucG9wc2VnLiAqL1xuICBwcml2YXRlIHNlZ21lbnRTdGFjazogQXJyYXk8cmVhZG9ubHkgW3JlYWRvbmx5IHN0cmluZ1tdLCBDaHVuaz9dPiA9IFtdO1xuXG4gIC8qKiBBbGwgc3ltYm9scyBpbiB0aGlzIG9iamVjdC4gKi9cbiAgcHJpdmF0ZSBzeW1ib2xzOiBTeW1ib2xbXSA9IFtdO1xuXG4gIC8qKiBHbG9iYWwgc3ltYm9scy4gKi9cbiAgLy8gTk9URTogd2UgY291bGQgYWRkICdmb3JjZS1pbXBvcnQnLCAnZGV0ZWN0Jywgb3Igb3RoZXJzLi4uXG4gIHByaXZhdGUgZ2xvYmFscyA9IG5ldyBNYXA8c3RyaW5nLCAnZXhwb3J0J3wnaW1wb3J0Jz4oKTtcblxuICAvKiogVGhlIGN1cnJlbnQgc2NvcGUuICovXG4gIHByaXZhdGUgY3VycmVudFNjb3BlID0gbmV3IFNjb3BlKCk7XG5cbiAgLyoqIEEgc2NvcGUgZm9yIGNoZWFwIGxvY2FsIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBjaGVhcExvY2FscyA9IG5ldyBDaGVhcFNjb3BlKCk7XG5cbiAgLyoqIExpc3Qgb2YgZ2xvYmFsIHN5bWJvbCBpbmRpY2VzIHVzZWQgYnkgZm9yd2FyZCByZWZzIHRvIGFub255bW91cyBsYWJlbHMuICovXG4gIHByaXZhdGUgYW5vbnltb3VzRm9yd2FyZDogbnVtYmVyW10gPSBbXTtcblxuICAvKiogTGlzdCBvZiBjaHVuay9vZmZzZXQgcG9zaXRpb25zIG9mIHByZXZpb3VzIGFub255bW91cyBsYWJlbHMuICovXG4gIHByaXZhdGUgYW5vbnltb3VzUmV2ZXJzZTogRXhwcltdID0gW107XG5cbiAgLyoqIE1hcCBvZiBnbG9iYWwgc3ltYm9sIGluY2lkZXMgdXNlZCBieSBmb3J3YXJkIHJlZnMgdG8gcmVsYXRpdmUgbGFiZWxzLiAqL1xuICBwcml2YXRlIHJlbGF0aXZlRm9yd2FyZDogbnVtYmVyW10gPSBbXTtcblxuICAvKiogTWFwIG9mIGNodW5rL29mZnNldCBwb3NpdGlvbnMgb2YgYmFjay1yZWZlcmFibGUgcmVsYXRpdmUgbGFiZWxzLiAqL1xuICBwcml2YXRlIHJlbGF0aXZlUmV2ZXJzZTogRXhwcltdID0gW107XG5cbiAgLyoqIEFsbCB0aGUgY2h1bmtzIHNvIGZhci4gKi9cbiAgcHJpdmF0ZSBjaHVua3M6IENodW5rW10gPSBbXTtcblxuICAvKiogQ3VycmVudGx5IGFjdGl2ZSBjaHVuayAqL1xuICBwcml2YXRlIF9jaHVuazogQ2h1bmt8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKiBOYW1lIG9mIHRoZSBuZXh0IGNodW5rICovXG4gIHByaXZhdGUgX25hbWU6IHN0cmluZ3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLyoqIE9yaWdpbiBvZiB0aGUgY3Vycm5ldCBjaHVuaywgaWYgZml4ZWQuICovXG4gIHByaXZhdGUgX29yZzogbnVtYmVyfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvKiogUHJlZml4IHRvIHByZXBlbmQgdG8gYWxsIHNlZ21lbnQgbmFtZXMuICovXG4gIHByaXZhdGUgX3NlZ21lbnRQcmVmaXggPSAnJztcblxuICAvKiogQ3VycmVudCBzb3VyY2UgbG9jYXRpb24sIGZvciBlcnJvciBtZXNzYWdlcy4gKi9cbiAgcHJpdmF0ZSBfc291cmNlPzogU291cmNlSW5mbztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBjcHUgPSBDcHUuUDAyLCByZWFkb25seSBvcHRzOiBBc3NlbWJsZXIuT3B0aW9ucyA9IHt9KSB7fVxuXG4gIHByaXZhdGUgZ2V0IGNodW5rKCk6IENodW5rIHtcbiAgICAvLyBtYWtlIGNodW5rIG9ubHkgd2hlbiBuZWVkZWRcbiAgICB0aGlzLmVuc3VyZUNodW5rKCk7XG4gICAgcmV0dXJuIHRoaXMuX2NodW5rITtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ2h1bmsoKSB7XG4gICAgaWYgKCF0aGlzLl9jaHVuaykge1xuICAgICAgLy8gTk9URTogbXVsdGlwbGUgc2VnbWVudHMgT0sgaWYgZGlzam9pbnQgbWVtb3J5Li4uXG4gICAgICAvLyBpZiAodGhpcy5fb3JnICE9IG51bGwgJiYgdGhpcy5zZWdtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIC8vICAgdGhpcy5mYWlsKGAub3JnIGNodW5rcyBtdXN0IGJlIHNpbmdsZS1zZWdtZW50YCk7XG4gICAgICAvLyB9XG4gICAgICB0aGlzLl9jaHVuayA9IHtzZWdtZW50czogdGhpcy5zZWdtZW50cywgZGF0YTogW119O1xuICAgICAgaWYgKHRoaXMuX29yZyAhPSBudWxsKSB0aGlzLl9jaHVuay5vcmcgPSB0aGlzLl9vcmc7XG4gICAgICBpZiAodGhpcy5fbmFtZSkgdGhpcy5fY2h1bmsubmFtZSA9IHRoaXMuX25hbWU7XG4gICAgICB0aGlzLmNodW5rcy5wdXNoKHRoaXMuX2NodW5rKTtcbiAgICB9XG4gIH1cblxuICBkZWZpbmVkU3ltYm9sKHN5bTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gSW4gdGhpcyBjYXNlLCBpdCdzIG9rYXkgdG8gdHJhdmVyc2UgdXAgdGhlIHNjb3BlIGNoYWluIHNpbmNlIGlmIHdlXG4gICAgLy8gd2VyZSB0byByZWZlcmVuY2UgdGhlIHN5bWJvbCwgaXQncyBndWFyYW50ZWVkIHRvIGJlIGRlZmluZWQgc29tZWhvdy5cbiAgICBsZXQgc2NvcGU6IFNjb3BlfHVuZGVmaW5lZCA9IHRoaXMuY3VycmVudFNjb3BlO1xuICAgIGNvbnN0IHVuc2NvcGVkID0gIXN5bS5pbmNsdWRlcygnOjonKTtcbiAgICBkbyB7XG4gICAgICBjb25zdCBzID0gc2NvcGUucmVzb2x2ZShzeW0sIGZhbHNlKTtcbiAgICAgIGlmIChzKSByZXR1cm4gQm9vbGVhbihzLmV4cHIpO1xuICAgIH0gd2hpbGUgKHVuc2NvcGVkICYmIChzY29wZSA9IHNjb3BlLnBhcmVudCkpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0YW50U3ltYm9sKHN5bTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gSWYgdGhlcmUncyBhIHN5bWJvbCBpbiBhIGRpZmZlcmVudCBzY29wZSwgaXQncyBub3QgYWN0dWFsbHkgY29uc3RhbnQuXG4gICAgY29uc3QgcyA9IHRoaXMuY3VycmVudFNjb3BlLnJlc29sdmUoc3ltLCBmYWxzZSk7XG4gICAgcmV0dXJuIEJvb2xlYW4ocyAmJiBzLmV4cHIgJiYgIShzLmlkISA8IDApKTtcbiAgfVxuXG4gIHJlZmVyZW5jZWRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJZiBub3QgcmVmZXJlbmNlZCBpbiB0aGlzIHNjb3BlLCB3ZSBkb24ndCBrbm93IHdoaWNoIGl0IGlzLi4uXG4gICAgLy8gTk9URTogdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSBjYTY1LlxuICAgIGNvbnN0IHMgPSB0aGlzLmN1cnJlbnRTY29wZS5yZXNvbHZlKHN5bSwgZmFsc2UpO1xuICAgIHJldHVybiBzICE9IG51bGw7IC8vIE5PVEU6IHRoaXMgY291bnRzIGRlZmluaXRpb25zLlxuICB9XG5cbiAgZXZhbHVhdGUoZXhwcjogRXhwcik6IG51bWJlcnx1bmRlZmluZWQge1xuICAgIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgaWYgKGV4cHIub3AgPT09ICdudW0nICYmICFleHByLm1ldGE/LnJlbCkgcmV0dXJuIGV4cHIubnVtO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBwcml2YXRlIGdldCBwYygpOiBudW1iZXJ8dW5kZWZpbmVkIHtcbiAgLy8gICBpZiAodGhpcy5fb3JnID09IG51bGwpIHJldHVybiB1bmRlZmluZWQ7XG4gIC8vICAgcmV0dXJuIHRoaXMuX29yZyArIHRoaXMub2Zmc2V0O1xuICAvLyB9XG5cbiAgcGMoKTogRXhwciB7XG4gICAgY29uc3QgbnVtID0gdGhpcy5jaHVuay5kYXRhLmxlbmd0aDsgLy8gTk9URTogYmVmb3JlIGNvdW50aW5nIGNodW5rc1xuICAgIGNvbnN0IG1ldGE6IEV4cHIuTWV0YSA9IHtyZWw6IHRydWUsIGNodW5rOiB0aGlzLmNodW5rcy5sZW5ndGggLSAxfTtcbiAgICBpZiAodGhpcy5fY2h1bms/Lm9yZyAhPSBudWxsKSBtZXRhLm9yZyA9IHRoaXMuX2NodW5rLm9yZztcbiAgICByZXR1cm4gRXhwci5ldmFsdWF0ZSh7b3A6ICdudW0nLCBudW0sIG1ldGF9KTtcbiAgfVxuXG4gIHJlc29sdmUoZXhwcjogRXhwcik6IEV4cHIge1xuICAgIHJldHVybiBFeHByLnRyYXZlcnNlKGV4cHIsIChlLCByZWMpID0+IHtcbiAgICAgIHdoaWxlIChlLm9wID09PSAnc3ltJyAmJiBlLnN5bSkge1xuICAgICAgICBlID0gdGhpcy5yZXNvbHZlU3ltYm9sKGUuc3ltKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHJlYyhlKSk7XG4gICAgfSk7XG4gIH1cblxuICByZXNvbHZlU3ltYm9sKG5hbWU6IHN0cmluZyk6IEV4cHIge1xuICAgIGlmIChuYW1lID09PSAnKicpIHtcbiAgICAgIHJldHVybiB0aGlzLnBjKCk7XG4gICAgfSBlbHNlIGlmICgvXjpcXCsrJC8udGVzdChuYW1lKSkge1xuICAgICAgLy8gYW5vbnltb3VzIGZvcndhcmQgcmVmXG4gICAgICBjb25zdCBpID0gbmFtZS5sZW5ndGggLSAyO1xuICAgICAgbGV0IG51bSA9IHRoaXMuYW5vbnltb3VzRm9yd2FyZFtpXTtcbiAgICAgIGlmIChudW0gIT0gbnVsbCkgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgICB0aGlzLmFub255bW91c0ZvcndhcmRbaV0gPSBudW0gPSB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICAgICAgdGhpcy5zeW1ib2xzLnB1c2goe2lkOiBudW19KTtcbiAgICAgIHJldHVybiB7b3A6ICdzeW0nLCBudW19O1xuICAgIH0gZWxzZSBpZiAoL15cXCsrJC8udGVzdChuYW1lKSkge1xuICAgICAgLy8gcmVsYXRpdmUgZm9yd2FyZCByZWZcbiAgICAgIGxldCBudW0gPSB0aGlzLnJlbGF0aXZlRm9yd2FyZFtuYW1lLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKG51bSAhPSBudWxsKSByZXR1cm4ge29wOiAnc3ltJywgbnVtfTtcbiAgICAgIHRoaXMucmVsYXRpdmVGb3J3YXJkW25hbWUubGVuZ3RoIC0gMV0gPSBudW0gPSB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICAgICAgdGhpcy5zeW1ib2xzLnB1c2goe2lkOiBudW19KTtcbiAgICAgIHJldHVybiB7b3A6ICdzeW0nLCBudW19O1xuICAgIH0gZWxzZSBpZiAoL146LSskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgYmFjayByZWZcbiAgICAgIGNvbnN0IGkgPSB0aGlzLmFub255bW91c1JldmVyc2UubGVuZ3RoIC0gbmFtZS5sZW5ndGggKyAxO1xuICAgICAgaWYgKGkgPCAwKSB0aGlzLmZhaWwoYEJhZCBhbm9ueW1vdXMgYmFja3JlZjogJHtuYW1lfWApO1xuICAgICAgcmV0dXJuIHRoaXMuYW5vbnltb3VzUmV2ZXJzZVtpXTtcbiAgICB9IGVsc2UgaWYgKC9eLSskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBiYWNrIHJlZlxuICAgICAgY29uc3QgZXhwciA9IHRoaXMucmVsYXRpdmVSZXZlcnNlW25hbWUubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoZXhwciA9PSBudWxsKSB0aGlzLmZhaWwoYEJhZCByZWxhdGl2ZSBiYWNrcmVmOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG4gICAgY29uc3Qgc2NvcGUgPSBuYW1lLnN0YXJ0c1dpdGgoJ0AnKSA/IHRoaXMuY2hlYXBMb2NhbHMgOiB0aGlzLmN1cnJlbnRTY29wZTtcbiAgICBjb25zdCBzeW0gPSBzY29wZS5yZXNvbHZlKG5hbWUsIHRydWUpO1xuICAgIGlmIChzeW0uZXhwcikgcmV0dXJuIHN5bS5leHByO1xuICAgIC8vIGlmIHRoZSBleHByZXNzaW9uIGlzIG5vdCB5ZXQga25vd24gdGhlbiByZWZlciB0byB0aGUgc3ltYm9sIHRhYmxlLFxuICAgIC8vIGFkZGluZyBpdCBpZiBuZWNlc3NhcnkuXG4gICAgaWYgKHN5bS5pZCA9PSBudWxsKSB7XG4gICAgICBzeW0uaWQgPSB0aGlzLnN5bWJvbHMubGVuZ3RoO1xuICAgICAgdGhpcy5zeW1ib2xzLnB1c2goc3ltKTtcbiAgICB9XG4gICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bTogc3ltLmlkfTtcbiAgfVxuXG4gIC8vIE5vIGJhbmtzIGFyZSByZXNvbHZlZCB5ZXQuXG4gIGNodW5rRGF0YShjaHVuazogbnVtYmVyKToge29yZz86IG51bWJlcn0ge1xuICAgIC8vIFRPRE8gLSBoYW5kbGUgenAgc2VnbWVudHM/XG4gICAgcmV0dXJuIHtvcmc6IHRoaXMuY2h1bmtzW2NodW5rXS5vcmd9O1xuICB9XG5cbiAgY2xvc2VTY29wZXMoKSB7XG4gICAgdGhpcy5jaGVhcExvY2Fscy5jbGVhcigpO1xuICAgIC8vIE5lZWQgdG8gZmluZCBhbnkgdW5kZWNsYXJlZCBzeW1ib2xzIGluIG5lc3RlZCBzY29wZXMgYW5kIGxpbmtcbiAgICAvLyB0aGVtIHRvIGEgcGFyZW50IHNjb3BlIHN5bWJvbCBpZiBwb3NzaWJsZS5cbiAgICBmdW5jdGlvbiBjbG9zZShzY29wZTogU2NvcGUpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygc2NvcGUuY2hpbGRyZW4udmFsdWVzKCkpIHtcbiAgICAgICAgY2xvc2UoY2hpbGQpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzY29wZS5hbm9ueW1vdXNDaGlsZHJlbikge1xuICAgICAgICBjbG9zZShjaGlsZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtuYW1lLCBzeW1dIG9mIHNjb3BlLnN5bWJvbHMpIHtcbiAgICAgICAgaWYgKHN5bS5leHByIHx8IHN5bS5pZCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHNjb3BlLnBhcmVudCkge1xuICAgICAgICAgIC8vIFRPRE8gLSByZWNvcmQgd2hlcmUgaXQgd2FzIHJlZmVyZW5jZWQ/XG4gICAgICAgICAgaWYgKHN5bS5zY29wZWQpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sICcke25hbWV9JyB1bmRlZmluZWRgKTtcbiAgICAgICAgICBjb25zdCBwYXJlbnRTeW0gPSBzY29wZS5wYXJlbnQuc3ltYm9scy5nZXQobmFtZSk7XG4gICAgICAgICAgaWYgKCFwYXJlbnRTeW0pIHtcbiAgICAgICAgICAgIC8vIGp1c3QgYWxpYXMgaXQgZGlyZWN0bHkgaW4gdGhlIHBhcmVudCBzY29wZVxuICAgICAgICAgICAgc2NvcGUucGFyZW50LnN5bWJvbHMuc2V0KG5hbWUsIHN5bSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJlbnRTeW0uaWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgc3ltLmV4cHIgPSB7b3A6ICdzeW0nLCBudW06IHBhcmVudFN5bS5pZH07XG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJlbnRTeW0uZXhwcikge1xuICAgICAgICAgICAgc3ltLmV4cHIgPSBwYXJlbnRTeW0uZXhwcjtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbXVzdCBoYXZlIGVpdGhlciBpZCBvciBleHByLi4uP1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlOiAke25hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGhhbmRsZSBnbG9iYWwgc2NvcGUgc2VwYXJhdGVseS4uLlxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRlc3QgY2FzZTogcmVmIGEgbmFtZSBpbiB0d28gY2hpbGQgc2NvcGVzLCBkZWZpbmUgaXQgaW4gZ3JhbmRwYXJlbnRcblxuICAgIGlmICh0aGlzLmN1cnJlbnRTY29wZS5wYXJlbnQpIHtcbiAgICAgIC8vIFRPRE8gLSByZWNvcmQgd2hlcmUgaXQgd2FzIG9wZW5lZD9cbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2NvcGUgbmV2ZXIgY2xvc2VkYCk7XG4gICAgfVxuICAgIGNsb3NlKHRoaXMuY3VycmVudFNjb3BlKTtcblxuICAgIGZvciAoY29uc3QgW25hbWUsIGdsb2JhbF0gb2YgdGhpcy5nbG9iYWxzKSB7XG4gICAgICBjb25zdCBzeW0gPSB0aGlzLmN1cnJlbnRTY29wZS5zeW1ib2xzLmdldChuYW1lKTtcbiAgICAgIGlmIChnbG9iYWwgPT09ICdleHBvcnQnKSB7XG4gICAgICAgIGlmICghc3ltPy5leHByKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCAnJHtuYW1lfScgdW5kZWZpbmVkYCk7XG4gICAgICAgIGlmIChzeW0uaWQgPT0gbnVsbCkge1xuICAgICAgICAgIHN5bS5pZCA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICAgICAgdGhpcy5zeW1ib2xzLnB1c2goc3ltKTtcbiAgICAgICAgfVxuICAgICAgICBzeW0uZXhwb3J0ID0gbmFtZTtcbiAgICAgIH0gZWxzZSBpZiAoZ2xvYmFsID09PSAnaW1wb3J0Jykge1xuICAgICAgICBpZiAoIXN5bSkgY29udGludWU7IC8vIG9rYXkgdG8gaW1wb3J0IGJ1dCBub3QgdXNlLlxuICAgICAgICAvLyBUT0RPIC0gcmVjb3JkIGJvdGggcG9zaXRpb25zP1xuICAgICAgICBpZiAoc3ltLmV4cHIpIHRocm93IG5ldyBFcnJvcihgQWxyZWFkeSBkZWZpbmVkOiAke25hbWV9YCk7XG4gICAgICAgIHN5bS5leHByID0ge29wOiAnaW0nLCBzeW06IG5hbWV9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXNzZXJ0TmV2ZXIoZ2xvYmFsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBzeW1dIG9mIHRoaXMuY3VycmVudFNjb3BlLnN5bWJvbHMpIHtcbiAgICAgIGlmICghc3ltLmV4cHIpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sICcke25hbWV9JyB1bmRlZmluZWRgKTtcbiAgICB9XG4gIH1cblxuICBtb2R1bGUoKTogTW9kdWxlIHtcbiAgICB0aGlzLmNsb3NlU2NvcGVzKCk7XG5cbiAgICAvLyBUT0RPIC0gaGFuZGxlIGltcG9ydHMgYW5kIGV4cG9ydHMgb3V0IG9mIHRoZSBzY29wZVxuICAgIC8vIFRPRE8gLSBhZGQgLnNjb3BlIGFuZCAuZW5kc2NvcGUgYW5kIGZvcndhcmQgc2NvcGUgdmFycyBhdCBlbmQgdG8gcGFyZW50XG5cbiAgICAvLyBQcm9jZXNzIGFuZCB3cml0ZSB0aGUgZGF0YVxuICAgIGNvbnN0IGNodW5rczogbW9kLkNodW5rPFVpbnQ4QXJyYXk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIHRoaXMuY2h1bmtzKSB7XG4gICAgICBjaHVua3MucHVzaCh7Li4uY2h1bmssIGRhdGE6IFVpbnQ4QXJyYXkuZnJvbShjaHVuay5kYXRhKX0pO1xuICAgIH1cbiAgICBjb25zdCBzeW1ib2xzOiBtb2QuU3ltYm9sW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHN5bWJvbCBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIGlmIChzeW1ib2wuZXhwciA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYFN5bWJvbCB1bmRlZmluZWRgKTtcbiAgICAgIGNvbnN0IG91dDogbW9kLlN5bWJvbCA9IHtleHByOiBzeW1ib2wuZXhwcn07XG4gICAgICBpZiAoc3ltYm9sLmV4cG9ydCAhPSBudWxsKSBvdXQuZXhwb3J0ID0gc3ltYm9sLmV4cG9ydDtcbiAgICAgIHN5bWJvbHMucHVzaChvdXQpO1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50czogbW9kLlNlZ21lbnRbXSA9IFsuLi50aGlzLnNlZ21lbnREYXRhLnZhbHVlcygpXTtcbiAgICByZXR1cm4ge2NodW5rcywgc3ltYm9scywgc2VnbWVudHN9O1xuICB9XG5cbiAgbGluZSh0b2tlbnM6IFRva2VuW10pIHtcbiAgICB0aGlzLl9zb3VyY2UgPSB0b2tlbnNbMF0uc291cmNlO1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgMyAmJiBUb2tlbi5lcSh0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdLCBUb2tlbi5DT0xPTikpIHtcbiAgICAgIHRoaXMubGFiZWwodG9rZW5zWzBdKTtcbiAgICB9IGVsc2UgaWYgKFRva2VuLmVxKHRva2Vuc1sxXSwgVG9rZW4uQVNTSUdOKSkge1xuICAgICAgdGhpcy5hc3NpZ24oVG9rZW4uc3RyKHRva2Vuc1swXSksIHRoaXMucGFyc2VFeHByKHRva2VucywgMikpO1xuICAgIH0gZWxzZSBpZiAoVG9rZW4uZXEodG9rZW5zWzFdLCBUb2tlbi5TRVQpKSB7XG4gICAgICB0aGlzLnNldChUb2tlbi5zdHIodG9rZW5zWzBdKSwgdGhpcy5wYXJzZUV4cHIodG9rZW5zLCAyKSk7XG4gICAgfSBlbHNlIGlmICh0b2tlbnNbMF0udG9rZW4gPT09ICdjcycpIHtcbiAgICAgIHRoaXMuZGlyZWN0aXZlKHRva2Vucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW5zdHJ1Y3Rpb24odG9rZW5zKTtcbiAgICB9XG4gIH1cblxuICB0b2tlbnMoc291cmNlOiBUb2tlblNvdXJjZSkge1xuICAgIGxldCBsaW5lO1xuICAgIHdoaWxlICgobGluZSA9IHNvdXJjZS5uZXh0KCkpKSB7XG4gICAgICB0aGlzLmxpbmUobGluZSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdG9rZW5zQXN5bmMoc291cmNlOiBUb2tlblNvdXJjZS5Bc3luYyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxldCBsaW5lO1xuICAgIHdoaWxlICgobGluZSA9IGF3YWl0IHNvdXJjZS5uZXh0QXN5bmMoKSkpIHtcbiAgICAgIHRoaXMubGluZShsaW5lKTtcbiAgICB9XG4gIH1cblxuXG4gIGRpcmVjdGl2ZSh0b2tlbnM6IFRva2VuW10pIHtcbiAgICAvLyBUT0RPIC0gcmVjb3JkIGxpbmUgaW5mb3JtYXRpb24sIHJld3JhcCBlcnJvciBtZXNzYWdlcz9cbiAgICBzd2l0Y2ggKFRva2VuLnN0cih0b2tlbnNbMF0pKSB7XG4gICAgICBjYXNlICcub3JnJzogcmV0dXJuIHRoaXMub3JnKHRoaXMucGFyc2VDb25zdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5yZWxvYyc6IHJldHVybiB0aGlzLnBhcnNlTm9BcmdzKHRva2VucyksIHRoaXMucmVsb2MoKTtcbiAgICAgIGNhc2UgJy5hc3NlcnQnOiByZXR1cm4gdGhpcy5hc3NlcnQodGhpcy5wYXJzZUV4cHIodG9rZW5zKSk7XG4gICAgICBjYXNlICcuc2VnbWVudCc6IHJldHVybiB0aGlzLnNlZ21lbnQoLi4udGhpcy5wYXJzZVNlZ21lbnRMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLmJ5dGUnOiByZXR1cm4gdGhpcy5ieXRlKC4uLnRoaXMucGFyc2VEYXRhTGlzdCh0b2tlbnMsIHRydWUpKTtcbiAgICAgIGNhc2UgJy5yZXMnOiByZXR1cm4gdGhpcy5yZXMoLi4udGhpcy5wYXJzZVJlc0FyZ3ModG9rZW5zKSk7XG4gICAgICBjYXNlICcud29yZCc6IHJldHVybiB0aGlzLndvcmQoLi4udGhpcy5wYXJzZURhdGFMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLmZyZWUnOiByZXR1cm4gdGhpcy5mcmVlKHRoaXMucGFyc2VDb25zdCh0b2tlbnMpLCB0b2tlbnNbMF0pO1xuICAgICAgY2FzZSAnLnNlZ21lbnRwcmVmaXgnOiByZXR1cm4gdGhpcy5zZWdtZW50UHJlZml4KHRoaXMucGFyc2VTdHIodG9rZW5zKSk7XG4gICAgICBjYXNlICcuaW1wb3J0JzogcmV0dXJuIHRoaXMuaW1wb3J0KC4uLnRoaXMucGFyc2VJZGVudGlmaWVyTGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5leHBvcnQnOiByZXR1cm4gdGhpcy5leHBvcnQoLi4udGhpcy5wYXJzZUlkZW50aWZpZXJMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLnNjb3BlJzogcmV0dXJuIHRoaXMuc2NvcGUodGhpcy5wYXJzZU9wdGlvbmFsSWRlbnRpZmllcih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5lbmRzY29wZSc6IHJldHVybiB0aGlzLnBhcnNlTm9BcmdzKHRva2VucyksIHRoaXMuZW5kU2NvcGUoKTtcbiAgICAgIGNhc2UgJy5wcm9jJzogcmV0dXJuIHRoaXMucHJvYyh0aGlzLnBhcnNlUmVxdWlyZWRJZGVudGlmaWVyKHRva2VucykpO1xuICAgICAgY2FzZSAnLmVuZHByb2MnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLmVuZFByb2MoKTtcbiAgICAgIGNhc2UgJy5wdXNoc2VnJzogcmV0dXJuIHRoaXMucHVzaFNlZyguLi50aGlzLnBhcnNlU2VnbWVudExpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcucG9wc2VnJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5wb3BTZWcoKTtcbiAgICAgIGNhc2UgJy5tb3ZlJzogcmV0dXJuIHRoaXMubW92ZSguLi50aGlzLnBhcnNlTW92ZUFyZ3ModG9rZW5zKSk7XG4gICAgfVxuICAgIHRoaXMuZmFpbChgVW5rbm93biBkaXJlY3RpdmU6ICR7VG9rZW4ubmFtZUF0KHRva2Vuc1swXSl9YCk7XG4gIH1cblxuICBsYWJlbChsYWJlbDogc3RyaW5nfFRva2VuKSB7XG4gICAgbGV0IGlkZW50OiBzdHJpbmc7XG4gICAgbGV0IHRva2VuOiBUb2tlbnx1bmRlZmluZWQ7XG4gICAgY29uc3QgZXhwciA9IHRoaXMucGMoKTtcbiAgICBpZiAodHlwZW9mIGxhYmVsID09PSAnc3RyaW5nJykge1xuICAgICAgaWRlbnQgPSBsYWJlbDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWRlbnQgPSBUb2tlbi5zdHIodG9rZW4gPSBsYWJlbCk7XG4gICAgICBpZiAobGFiZWwuc291cmNlKSBleHByLnNvdXJjZSA9IGxhYmVsLnNvdXJjZTtcbiAgICB9XG4gICAgaWYgKGlkZW50ID09PSAnOicpIHtcbiAgICAgIC8vIGFub255bW91cyBsYWJlbCAtIHNoaWZ0IGFueSBmb3J3YXJkIHJlZnMgb2ZmLCBhbmQgcHVzaCBvbnRvIHRoZSBiYWNrcy5cbiAgICAgIHRoaXMuYW5vbnltb3VzUmV2ZXJzZS5wdXNoKGV4cHIpO1xuICAgICAgY29uc3Qgc3ltID0gdGhpcy5hbm9ueW1vdXNGb3J3YXJkLnNoaWZ0KCk7XG4gICAgICBpZiAoc3ltICE9IG51bGwpIHRoaXMuc3ltYm9sc1tzeW1dLmV4cHIgPSBleHByO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoL15cXCsrJC8udGVzdChpZGVudCkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGZvcndhcmQgcmVmIC0gZmlsbCBpbiBnbG9iYWwgc3ltYm9sIHdlIG1hZGUgZWFybGllclxuICAgICAgY29uc3Qgc3ltID0gdGhpcy5yZWxhdGl2ZUZvcndhcmRbaWRlbnQubGVuZ3RoIC0gMV07XG4gICAgICBkZWxldGUgdGhpcy5yZWxhdGl2ZUZvcndhcmRbaWRlbnQubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoc3ltICE9IG51bGwpIHRoaXMuc3ltYm9sc1tzeW1dLmV4cHIgPSBleHByO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoL14tKyQvLnRlc3QoaWRlbnQpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBiYWNrcmVmIC0gc3RvcmUgdGhlIGV4cHIgZm9yIGxhdGVyXG4gICAgICB0aGlzLnJlbGF0aXZlUmV2ZXJzZVtpZGVudC5sZW5ndGggLSAxXSA9IGV4cHI7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFpZGVudC5zdGFydHNXaXRoKCdAJykpIHRoaXMuY2hlYXBMb2NhbHMuY2xlYXIoKTtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGFub255bW91cyBhbmQgY2hlYXAgbG9jYWwgbGFiZWxzLi4uXG4gICAgdGhpcy5hc3NpZ25TeW1ib2woaWRlbnQsIGZhbHNlLCBleHByLCB0b2tlbik7XG4gICAgLy8gY29uc3Qgc3ltYm9sID0gdGhpcy5zY29wZS5yZXNvbHZlKHN0ciwgdHJ1ZSk7XG4gICAgLy8gaWYgKHN5bWJvbC5leHByKSB0aHJvdyBuZXcgRXJyb3IoYEFscmVhZHkgZGVmaW5lZDogJHtsYWJlbH1gKTtcbiAgICAvLyBpZiAoIXRoaXMuY2h1bmspIHRocm93IG5ldyBFcnJvcihgSW1wb3NzaWJsZT9gKTtcbiAgICAvLyBjb25zdCBjaHVua0lkID0gdGhpcy5jaHVua3MubGVuZ3RoIC0gMTsgLy8gbXVzdCBiZSBBRlRFUiB0aGlzLmNodW5rXG4gICAgLy8gc3ltYm9sLmV4cHIgPSB7b3A6ICdvZmYnLCBudW06IHRoaXMub2Zmc2V0LCBjaHVuazogY2h1bmtJZH07XG4gICAgLy8gaWYgKHNvdXJjZSkgc3ltYm9sLmV4cHIuc291cmNlID0gc291cmNlO1xuICAgIC8vIC8vIEFkZCB0aGUgbGFiZWwgdG8gdGhlIGN1cnJlbnQgY2h1bmsuLi4/XG4gICAgLy8gLy8gUmVjb3JkIHRoZSBkZWZpbml0aW9uLCBldGMuLi4/XG4gIH1cblxuICBhc3NpZ24oaWRlbnQ6IHN0cmluZywgZXhwcjogRXhwcnxudW1iZXIpIHtcbiAgICBpZiAoaWRlbnQuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICB0aGlzLmZhaWwoYENoZWFwIGxvY2FscyBtYXkgb25seSBiZSBsYWJlbHM6ICR7aWRlbnR9YCk7XG4gICAgfVxuICAgIC8vIE5vdyBtYWtlIHRoZSBhc3NpZ25tZW50LlxuICAgIGlmICh0eXBlb2YgZXhwciAhPT0gJ251bWJlcicpIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgdGhpcy5hc3NpZ25TeW1ib2woaWRlbnQsIGZhbHNlLCBleHByKTtcbiAgfVxuXG4gIHNldChpZGVudDogc3RyaW5nLCBleHByOiBFeHByfG51bWJlcikge1xuICAgIGlmIChpZGVudC5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgIHRoaXMuZmFpbChgQ2hlYXAgbG9jYWxzIG1heSBvbmx5IGJlIGxhYmVsczogJHtpZGVudH1gKTtcbiAgICB9XG4gICAgLy8gTm93IG1ha2UgdGhlIGFzc2lnbm1lbnQuXG4gICAgaWYgKHR5cGVvZiBleHByICE9PSAnbnVtYmVyJykgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICB0aGlzLmFzc2lnblN5bWJvbChpZGVudCwgdHJ1ZSwgZXhwcik7XG4gIH1cblxuICBhc3NpZ25TeW1ib2woaWRlbnQ6IHN0cmluZywgbXV0OiBib29sZWFuLCBleHByOiBFeHByfG51bWJlciwgdG9rZW4/OiBUb2tlbikge1xuICAgIC8vIE5PVEU6ICogX3dpbGxfIGdldCBjdXJyZW50IGNodW5rIVxuICAgIGlmICh0eXBlb2YgZXhwciA9PT0gJ251bWJlcicpIGV4cHIgPSB7b3A6ICdudW0nLCBudW06IGV4cHJ9O1xuICAgIGNvbnN0IHNjb3BlID0gaWRlbnQuc3RhcnRzV2l0aCgnQCcpID8gdGhpcy5jaGVhcExvY2FscyA6IHRoaXMuY3VycmVudFNjb3BlO1xuICAgIC8vIE5PVEU6IFRoaXMgaXMgaW5jb3JyZWN0IC0gaXQgd2lsbCBsb29rIHVwIHRoZSBzY29wZSBjaGFpbiB3aGVuIGl0XG4gICAgLy8gc2hvdWxkbid0LiAgTXV0YWJsZXMgbWF5IG9yIG1heSBub3Qgd2FudCB0aGlzLCBpbW11dGFibGVzIG11c3Qgbm90LlxuICAgIC8vIFdoZXRoZXIgdGhpcyBpcyB0aWVkIHRvIGFsbG93RndkUmVmIG9yIG5vdCBpcyB1bmNsZWFyLiAgSXQncyBhbHNvXG4gICAgLy8gdW5jbGVhciB3aGV0aGVyIHdlIHdhbnQgdG8gYWxsb3cgZGVmaW5pbmcgc3ltYm9scyBpbiBvdXRzaWRlIHNjb3BlczpcbiAgICAvLyAgIDo6Zm9vID0gNDNcbiAgICAvLyBGV0lXLCBjYTY1IF9kb2VzXyBhbGxvdyB0aGlzLCBhcyB3ZWxsIGFzIGZvbzo6YmFyID0gNDIgYWZ0ZXIgdGhlIHNjb3BlLlxuICAgIGxldCBzeW0gPSBzY29wZS5yZXNvbHZlKGlkZW50LCAhbXV0KTtcbiAgICBpZiAoc3ltICYmIChtdXQgIT09IChzeW0uaWQhIDwgMCkpKSB7XG4gICAgICB0aGlzLmZhaWwoYENhbm5vdCBjaGFuZ2UgbXV0YWJpbGl0eSBvZiAke2lkZW50fWAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKG11dCAmJiBleHByLm9wICE9ICdudW0nKSB7XG4gICAgICB0aGlzLmZhaWwoYE11dGFibGUgc2V0IHJlcXVpcmVzIGNvbnN0YW50YCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAoIXN5bSkge1xuICAgICAgaWYgKCFtdXQpIHRocm93IG5ldyBFcnJvcihgaW1wb3NzaWJsZWApO1xuICAgICAgc2NvcGUuc3ltYm9scy5zZXQoaWRlbnQsIHN5bSA9IHtpZDogLTF9KTtcbiAgICB9IGVsc2UgaWYgKCFtdXQgJiYgc3ltLmV4cHIpIHtcbiAgICAgIGNvbnN0IG9yaWcgPVxuICAgICAgICAgIHN5bS5leHByLnNvdXJjZSA/IGBcXG5PcmlnaW5hbGx5IGRlZmluZWQke1Rva2VuLmF0KHN5bS5leHByKX1gIDogJyc7XG4gICAgICBjb25zdCBuYW1lID0gdG9rZW4gPyBUb2tlbi5uYW1lQXQodG9rZW4pIDpcbiAgICAgICAgICBpZGVudCArICh0aGlzLl9zb3VyY2UgPyBUb2tlbi5hdCh7c291cmNlOiB0aGlzLl9zb3VyY2V9KSA6ICcnKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUmVkZWZpbmluZyBzeW1ib2wgJHtuYW1lfSR7b3JpZ31gKTtcbiAgICB9XG4gICAgc3ltLmV4cHIgPSBleHByO1xuICB9XG5cbiAgaW5zdHJ1Y3Rpb24obW5lbW9uaWM6IHN0cmluZywgYXJnPzogQXJnfHN0cmluZyk6IHZvaWQ7XG4gIGluc3RydWN0aW9uKHRva2VuczogVG9rZW5bXSk6IHZvaWQ7XG4gIGluc3RydWN0aW9uKC4uLmFyZ3M6IFtUb2tlbltdXXxbc3RyaW5nLCAoQXJnfHN0cmluZyk/XSk6IHZvaWQge1xuICAgIGxldCBtbmVtb25pYzogc3RyaW5nO1xuICAgIGxldCBhcmc6IEFyZztcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDEgJiYgQXJyYXkuaXNBcnJheShhcmdzWzBdKSkge1xuICAgICAgLy8gaGFuZGxlIHRoZSBsaW5lLi4uXG4gICAgICBjb25zdCB0b2tlbnMgPSBhcmdzWzBdO1xuICAgICAgbW5lbW9uaWMgPSBUb2tlbi5leHBlY3RJZGVudGlmaWVyKHRva2Vuc1swXSkudG9Mb3dlckNhc2UoKTtcbiAgICAgIGFyZyA9IHRoaXMucGFyc2VBcmcodG9rZW5zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gcGFyc2UgdGhlIHRva2VucyBmaXJzdFxuICAgICAgbW5lbW9uaWMgPSBhcmdzWzBdIGFzIHN0cmluZztcbiAgICAgIGNvbnN0IHRva2VuaXplciA9IG5ldyBUb2tlbml6ZXIoYXJnc1sxXSk7XG4gICAgICBhcmcgPSB0aGlzLnBhcnNlQXJnKHRva2VuaXplci5uZXh0KCkhLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgW21uZW1vbmljLCBhcmddID0gYXJncyBhcyBbc3RyaW5nLCBBcmddO1xuICAgICAgaWYgKCFhcmcpIGFyZyA9IFsnaW1wJ107XG4gICAgICBtbmVtb25pYyA9IG1uZW1vbmljLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIC8vIG1heSBuZWVkIHRvIHNpemUgdGhlIGFyZywgZGVwZW5kaW5nLlxuICAgIC8vIGNwdSB3aWxsIHRha2UgJ2FkZCcsICdhLHgnLCBhbmQgJ2EseScgYW5kIGluZGljYXRlIHdoaWNoIGl0IGFjdHVhbGx5IGlzLlxuICAgIGNvbnN0IG9wcyA9IHRoaXMuY3B1Lm9wKG1uZW1vbmljKTsgLy8gd2lsbCB0aHJvdyBpZiBtbmVtb25pYyB1bmtub3duXG4gICAgY29uc3QgbSA9IGFyZ1swXTtcbiAgICBpZiAobSA9PT0gJ2FkZCcgfHwgbSA9PT0gJ2EseCcgfHwgbSA9PT0gJ2EseScpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgYWRkcmVzcyBtbmVtb25pY3NcbiAgICAgIGNvbnN0IGV4cHIgPSBhcmdbMV0hO1xuICAgICAgY29uc3QgcyA9IGV4cHIubWV0YT8uc2l6ZSB8fCAyO1xuICAgICAgaWYgKG0gPT09ICdhZGQnICYmIHMgPT09IDEgJiYgJ3pwZycgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuenBnISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhZGQnICYmICdhYnMnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLmFicyEsIDIsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYWRkJyAmJiAncmVsJyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVsYXRpdmUob3BzLnJlbCEsIDEsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYSx4JyAmJiBzID09PSAxICYmICd6cHgnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLnpweCEsIDEsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYSx4JyAmJiAnYWJ4JyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy5hYnghLCAyLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2EseScgJiYgcyA9PT0gMSAmJiAnenB5JyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy56cHkhLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2EseScgJiYgJ2FieScgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuYWJ5ISwgMiwgZXhwcik7XG4gICAgICB9XG4gICAgICB0aGlzLmZhaWwoYEJhZCBhZGRyZXNzIG1vZGUgJHttfSBmb3IgJHttbmVtb25pY31gKTtcbiAgICB9XG4gICAgLy8gQWxsIG90aGVyIG1uZW1vbmljc1xuICAgIGlmIChtIGluIG9wcykge1xuICAgICAgY29uc3QgYXJnTGVuID0gdGhpcy5jcHUuYXJnTGVuKG0pO1xuICAgICAgaWYgKG0gPT09ICdyZWwnKSByZXR1cm4gdGhpcy5yZWxhdGl2ZShvcHNbbV0hLCBhcmdMZW4sIGFyZ1sxXSEpO1xuICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wc1ttXSEsIGFyZ0xlbiwgYXJnWzFdISk7XG4gICAgfVxuICAgIHRoaXMuZmFpbChgQmFkIGFkZHJlc3MgbW9kZSAke219IGZvciAke21uZW1vbmljfWApO1xuICB9XG5cbiAgcGFyc2VBcmcodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBBcmcge1xuICAgIC8vIExvb2sgZm9yIHBhcmVucy9icmFja2V0cyBhbmQvb3IgYSBjb21tYVxuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSBzdGFydCkgcmV0dXJuIFsnaW1wJ107XG4gICAgY29uc3QgZnJvbnQgPSB0b2tlbnNbc3RhcnRdO1xuICAgIGNvbnN0IG5leHQgPSB0b2tlbnNbc3RhcnQgKyAxXTtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gc3RhcnQgKyAxKSB7XG4gICAgICBpZiAoVG9rZW4uaXNSZWdpc3Rlcihmcm9udCwgJ2EnKSkgcmV0dXJuIFsnYWNjJ107XG4gICAgfSBlbHNlIGlmIChUb2tlbi5lcShmcm9udCwgVG9rZW4uSU1NRURJQVRFKSkge1xuICAgICAgcmV0dXJuIFsnaW1tJywgRXhwci5wYXJzZU9ubHkodG9rZW5zLCBzdGFydCArIDEpXTtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgcmVsYXRpdmUgb3IgYW5vbnltb3VzIGxhYmVscywgd2hpY2ggYXJlIG5vdCB2YWxpZCBvbiB0aGVpciBvd25cbiAgICBpZiAoVG9rZW4uZXEoZnJvbnQsIFRva2VuLkNPTE9OKSAmJiB0b2tlbnMubGVuZ3RoID09PSBzdGFydCArIDIgJiZcbiAgICAgICAgbmV4dC50b2tlbiA9PT0gJ29wJyAmJiAvXlstK10rJC8udGVzdChuZXh0LnN0cikpIHtcbiAgICAgIC8vIGFub255bW91cyBsYWJlbFxuICAgICAgcmV0dXJuIFsnYWRkJywge29wOiAnc3ltJywgc3ltOiAnOicgKyBuZXh0LnN0cn1dO1xuICAgIH0gZWxzZSBpZiAodG9rZW5zLmxlbmd0aCA9PT0gc3RhcnQgKyAxICYmIGZyb250LnRva2VuID09PSAnb3AnICYmXG4gICAgICAgICAgICAgICAvXlstK10rJC8udGVzdChmcm9udC5zdHIpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBsYWJlbFxuICAgICAgcmV0dXJuIFsnYWRkJywge29wOiAnc3ltJywgc3ltOiBmcm9udC5zdHJ9XTtcbiAgICB9XG4gICAgLy8gaXQgbXVzdCBiZSBhbiBhZGRyZXNzIG9mIHNvbWUgc29ydCAtIGlzIGl0IGluZGlyZWN0P1xuICAgIGlmIChUb2tlbi5lcShmcm9udCwgVG9rZW4uTFApIHx8XG4gICAgICAgICh0aGlzLm9wdHMuYWxsb3dCcmFja2V0cyAmJiBUb2tlbi5lcShmcm9udCwgVG9rZW4uTEIpKSkge1xuICAgICAgY29uc3QgY2xvc2UgPSBUb2tlbi5maW5kQmFsYW5jZWQodG9rZW5zLCBzdGFydCk7XG4gICAgICBpZiAoY2xvc2UgPCAwKSB0aGlzLmZhaWwoYFVuYmFsYW5jZWQgJHtUb2tlbi5uYW1lKGZyb250KX1gLCBmcm9udCk7XG4gICAgICBjb25zdCBhcmdzID0gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2Vucywgc3RhcnQgKyAxLCBjbG9zZSk7XG4gICAgICBpZiAoIWFyZ3MubGVuZ3RoKSB0aGlzLmZhaWwoYEJhZCBhcmd1bWVudGAsIGZyb250KTtcbiAgICAgIGNvbnN0IGV4cHIgPSBFeHByLnBhcnNlT25seShhcmdzWzBdKTtcbiAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBlaXRoZXIgSU5EIG9yIElOWVxuICAgICAgICBpZiAoVG9rZW4uZXEodG9rZW5zW2Nsb3NlICsgMV0sIFRva2VuLkNPTU1BKSAmJlxuICAgICAgICAgICAgVG9rZW4uaXNSZWdpc3Rlcih0b2tlbnNbY2xvc2UgKyAyXSwgJ3knKSkge1xuICAgICAgICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbY2xvc2UgKyAzXSk7XG4gICAgICAgICAgcmV0dXJuIFsnaW55JywgZXhwcl07XG4gICAgICAgIH1cbiAgICAgICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1tjbG9zZSArIDFdKTtcbiAgICAgICAgcmV0dXJuIFsnaW5kJywgZXhwcl07XG4gICAgICB9IGVsc2UgaWYgKGFyZ3MubGVuZ3RoID09PSAyICYmIGFyZ3NbMV0ubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIC8vIElOWFxuICAgICAgICBpZiAoVG9rZW4uaXNSZWdpc3RlcihhcmdzWzFdWzBdLCAneCcpKSByZXR1cm4gWydpbngnLCBleHByXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmFpbChgQmFkIGFyZ3VtZW50YCwgZnJvbnQpO1xuICAgIH1cbiAgICBjb25zdCBhcmdzID0gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2Vucywgc3RhcnQpO1xuICAgIGlmICghYXJncy5sZW5ndGgpIHRoaXMuZmFpbChgQmFkIGFyZ2AsIGZyb250KTtcbiAgICBjb25zdCBleHByID0gRXhwci5wYXJzZU9ubHkoYXJnc1swXSk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxKSByZXR1cm4gWydhZGQnLCBleHByXTtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDIgJiYgYXJnc1sxXS5sZW5ndGggPT09IDEpIHtcbiAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGFyZ3NbMV1bMF0sICd4JykpIHJldHVybiBbJ2EseCcsIGV4cHJdO1xuICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoYXJnc1sxXVswXSwgJ3knKSkgcmV0dXJuIFsnYSx5JywgZXhwcl07XG4gICAgfVxuICAgIHRoaXMuZmFpbChgQmFkIGFyZ2AsIGZyb250KTtcbiAgfVxuXG4gIHJlbGF0aXZlKG9wOiBudW1iZXIsIGFyZ2xlbjogbnVtYmVyLCBleHByOiBFeHByKSB7XG4gICAgLy8gQ2FuIGFyZ2xlbiBldmVyIGJlIDI/ICh5ZXMgLSBicmwgb24gNjU4MTYpXG4gICAgLy8gQmFzaWMgcGxhbiBoZXJlIGlzIHRoYXQgd2UgYWN0dWFsbHkgd2FudCBhIHJlbGF0aXZlIGV4cHIuXG4gICAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAgdG8gYmUgbW9yZSBlZmZpY2llbnQuXG4gICAgLy8gVE9ETyAtIGhhbmRsZSBsb2NhbC9hbm9ueW1vdXMgbGFiZWxzIHNlcGFyYXRlbHk/XG4gICAgLy8gVE9ETyAtIGNoZWNrIHRoZSByYW5nZSBzb21laG93P1xuICAgIGNvbnN0IG51bSA9IHRoaXMuY2h1bmsuZGF0YS5sZW5ndGggKyBhcmdsZW4gKyAxO1xuICAgIGNvbnN0IG1ldGE6IEV4cHIuTWV0YSA9IHtyZWw6IHRydWUsIGNodW5rOiB0aGlzLmNodW5rcy5sZW5ndGggLSAxfTtcbiAgICBpZiAodGhpcy5fY2h1bms/Lm9yZykgbWV0YS5vcmcgPSB0aGlzLl9jaHVuay5vcmc7XG4gICAgY29uc3QgbmV4dFBjID0ge29wOiAnbnVtJywgbnVtLCBtZXRhfTtcbiAgICBjb25zdCByZWw6IEV4cHIgPSB7b3A6ICctJywgYXJnczogW2V4cHIsIG5leHRQY119O1xuICAgIGlmIChleHByLnNvdXJjZSkgcmVsLnNvdXJjZSA9IGV4cHIuc291cmNlO1xuICAgIHRoaXMub3Bjb2RlKG9wLCBhcmdsZW4sIHJlbCk7XG4gIH1cblxuICBvcGNvZGUob3A6IG51bWJlciwgYXJnbGVuOiBudW1iZXIsIGV4cHI6IEV4cHIpIHtcbiAgICAvLyBFbWl0IHNvbWUgYnl0ZXMuXG4gICAgaWYgKGFyZ2xlbikgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTsgLy8gQkVGT1JFIG9wY29kZSAoaW4gY2FzZSBvZiAqKVxuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGNodW5rLmRhdGEucHVzaChvcCk7XG4gICAgaWYgKGFyZ2xlbikgdGhpcy5hcHBlbmQoZXhwciwgYXJnbGVuKTtcbiAgICAvLyBUT0RPIC0gZm9yIHJlbGF0aXZlLCBpZiB3ZSdyZSBpbiB0aGUgc2FtZSBjaHVuaywganVzdCBjb21wYXJlXG4gICAgLy8gdGhlIG9mZnNldC4uLlxuICB9XG5cbiAgYXBwZW5kKGV4cHI6IEV4cHIsIHNpemU6IG51bWJlcikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgbGV0IHZhbCA9IGV4cHIubnVtITtcbi8vY29uc29sZS5sb2coJ2V4cHI6JywgZXhwciwgJ3ZhbDonLCB2YWwpO1xuICAgIGlmIChleHByLm9wICE9PSAnbnVtJyB8fCBleHByLm1ldGE/LnJlbCkge1xuICAgICAgLy8gdXNlIGEgcGxhY2Vob2xkZXIgYW5kIGFkZCBhIHN1YnN0aXR1dGlvblxuICAgICAgY29uc3Qgb2Zmc2V0ID0gY2h1bmsuZGF0YS5sZW5ndGg7XG4gICAgICAoY2h1bmsuc3VicyB8fCAoY2h1bmsuc3VicyA9IFtdKSkucHVzaCh7b2Zmc2V0LCBzaXplLCBleHByfSk7XG4gICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIHNpemUpOyAvLyB3cml0ZSBnb2VzIGFmdGVyIHN1YnNcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53cml0ZU51bWJlcihjaHVuay5kYXRhLCBzaXplLCB2YWwpO1xuICAgIH1cbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gRGlyZWN0aXZlIGhhbmRsZXJzXG5cbiAgb3JnKGFkZHI6IG51bWJlciwgbmFtZT86IHN0cmluZykge1xuICAgIHRoaXMuX29yZyA9IGFkZHI7XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIH1cblxuICByZWxvYyhuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5fb3JnID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2NodW5rID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICB9XG5cbiAgc2VnbWVudCguLi5zZWdtZW50czogQXJyYXk8c3RyaW5nfG1vZC5TZWdtZW50Pikge1xuICAgIC8vIFVzYWdlOiAuc2VnbWVudCBcIjFhXCIsIFwiMWJcIiwgLi4uXG4gICAgdGhpcy5zZWdtZW50cyA9IHNlZ21lbnRzLm1hcChzID0+IHR5cGVvZiBzID09PSAnc3RyaW5nJyA/IHMgOiBzLm5hbWUpO1xuICAgIGZvciAoY29uc3QgcyBvZiBzZWdtZW50cykge1xuICAgICAgaWYgKHR5cGVvZiBzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5zZWdtZW50RGF0YS5nZXQocy5uYW1lKSB8fCB7bmFtZTogcy5uYW1lfTtcbiAgICAgICAgdGhpcy5zZWdtZW50RGF0YS5zZXQocy5uYW1lLCBtb2QuU2VnbWVudC5tZXJnZShkYXRhLCBzKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2NodW5rID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX25hbWUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBhc3NlcnQoZXhwcjogRXhwcikge1xuICAgIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgY29uc3QgdmFsID0gdGhpcy5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodmFsICE9IG51bGwpIHtcbiAgICAgIGlmICghdmFsKSB0aGlzLmZhaWwoYEFzc2VydGlvbiBmYWlsZWRgLCBleHByKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgICAoY2h1bmsuYXNzZXJ0cyB8fCAoY2h1bmsuYXNzZXJ0cyA9IFtdKSkucHVzaChleHByKTtcbiAgICB9XG4gIH1cblxuICBieXRlKC4uLmFyZ3M6IEFycmF5PEV4cHJ8c3RyaW5nfG51bWJlcj4pIHtcbiAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICBmb3IgKGNvbnN0IGFyZyBvZiBhcmdzKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhpcy53cml0ZU51bWJlcihjaHVuay5kYXRhLCAxLCBhcmcpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgICAgICB3cml0ZVN0cmluZyhjaHVuay5kYXRhLCBhcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoYXJnLCAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXMoY291bnQ6IG51bWJlciwgdmFsdWU/OiBudW1iZXIpIHtcbiAgICBpZiAoIWNvdW50KSByZXR1cm47XG4gICAgdGhpcy5ieXRlKC4uLm5ldyBBcnJheShjb3VudCkuZmlsbCh2YWx1ZSA/PyAwKSk7XG4gIH1cblxuICB3b3JkKC4uLmFyZ3M6IEFycmF5PEV4cHJ8bnVtYmVyPikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIDIsIGFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFwcGVuZChhcmcsIDIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZyZWUoc2l6ZTogbnVtYmVyLCB0b2tlbj86IFRva2VuKSB7XG4gICAgLy8gTXVzdCBiZSBpbiAub3JnIGZvciBhIHNpbmdsZSBzZWdtZW50LlxuICAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgdGhpcy5mYWlsKGAuZnJlZSBpbiAucmVsb2MgbW9kZWAsIHRva2VuKTtcbiAgICBjb25zdCBzZWdtZW50cyA9IHRoaXMuc2VnbWVudHMubGVuZ3RoID4gMSA/IHRoaXMuc2VnbWVudHMuZmlsdGVyKHMgPT4ge1xuICAgICAgY29uc3QgZGF0YSA9IHRoaXMuc2VnbWVudERhdGEuZ2V0KHMpO1xuICAgICAgaWYgKCFkYXRhIHx8IGRhdGEubWVtb3J5ID09IG51bGwgfHwgZGF0YS5zaXplID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkYXRhLm1lbW9yeSA+IHRoaXMuX29yZyEpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChkYXRhLm1lbW9yeSArIGRhdGEuc2l6ZSA8PSB0aGlzLl9vcmchKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KSA6IHRoaXMuc2VnbWVudHM7XG4gICAgaWYgKHNlZ21lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhpcy5mYWlsKGAuZnJlZSB3aXRoIG5vbi11bmlxdWUgc2VnbWVudDogJHt0aGlzLnNlZ21lbnRzfWAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgICB0aGlzLmZhaWwoYC5mcmVlIHdpdGggbmVnYXRpdmUgc2l6ZTogJHtzaXplfWAsIHRva2VuKTtcbiAgICB9XG4gICAgLy8gSWYgd2UndmUgZ290IGFuIG9wZW4gY2h1bmssIGVuZCBpdC5cbiAgICBpZiAodGhpcy5fY2h1bmspIHtcbiAgICAgIHRoaXMuX29yZyArPSB0aGlzLl9jaHVuay5kYXRhLmxlbmd0aDtcbiAgICB9XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgLy8gRW5zdXJlIGEgc2VnbWVudCBvYmplY3QgZXhpc3RzLlxuICAgIGNvbnN0IG5hbWUgPSBzZWdtZW50c1swXTtcbiAgICBsZXQgcyA9IHRoaXMuc2VnbWVudERhdGEuZ2V0KG5hbWUpO1xuICAgIGlmICghcykgdGhpcy5zZWdtZW50RGF0YS5zZXQobmFtZSwgcyA9IHtuYW1lfSk7XG4gICAgKHMuZnJlZSB8fCAocy5mcmVlID0gW10pKS5wdXNoKFt0aGlzLl9vcmcsIHRoaXMuX29yZyArIHNpemVdKTtcbiAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIGZyZWUgc3BhY2UuXG4gICAgdGhpcy5fb3JnICs9IHNpemU7XG4gIH1cblxuICBzZWdtZW50UHJlZml4KHByZWZpeDogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyAtIG1ha2UgbW9yZSBvZiBhIHRvZG8gYWJvdXQgY2hhbmdpbmcgdGhpcz9cbiAgICB0aGlzLl9zZWdtZW50UHJlZml4ID0gcHJlZml4O1xuICB9XG5cbiAgaW1wb3J0KC4uLmlkZW50czogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGlkZW50IG9mIGlkZW50cykge1xuICAgICAgdGhpcy5nbG9iYWxzLnNldChpZGVudCwgJ2ltcG9ydCcpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCguLi5pZGVudHM6IHN0cmluZ1tdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudCBvZiBpZGVudHMpIHtcbiAgICAgIHRoaXMuZ2xvYmFscy5zZXQoaWRlbnQsICdleHBvcnQnKTtcbiAgICB9XG4gIH1cblxuICBzY29wZShuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5lbnRlclNjb3BlKG5hbWUsICdzY29wZScpO1xuICB9XG5cbiAgcHJvYyhuYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmxhYmVsKG5hbWUpO1xuICAgIHRoaXMuZW50ZXJTY29wZShuYW1lLCAncHJvYycpO1xuICB9XG5cbiAgZW50ZXJTY29wZShuYW1lOiBzdHJpbmd8dW5kZWZpbmVkLCBraW5kOiAnc2NvcGUnfCdwcm9jJykge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gbmFtZSA/IHRoaXMuY3VycmVudFNjb3BlLmNoaWxkcmVuLmdldChuYW1lKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGlmICh0aGlzLm9wdHMucmVlbnRyYW50U2NvcGVzKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFNjb3BlID0gZXhpc3Rpbmc7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmFpbChgQ2Fubm90IHJlLWVudGVyIHNjb3BlICR7bmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgY2hpbGQgPSBuZXcgU2NvcGUodGhpcy5jdXJyZW50U2NvcGUsIGtpbmQpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY29wZS5jaGlsZHJlbi5zZXQobmFtZSwgY2hpbGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY29wZS5hbm9ueW1vdXNDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50U2NvcGUgPSBjaGlsZDtcbiAgfVxuXG4gIGVuZFNjb3BlKCkgeyB0aGlzLmV4aXRTY29wZSgnc2NvcGUnKTsgfVxuICBlbmRQcm9jKCkgeyB0aGlzLmV4aXRTY29wZSgncHJvYycpOyB9XG5cbiAgZXhpdFNjb3BlKGtpbmQ6ICdzY29wZSd8J3Byb2MnKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFNjb3BlLmtpbmQgIT09IGtpbmQgfHwgIXRoaXMuY3VycmVudFNjb3BlLnBhcmVudCkge1xuICAgICAgdGhpcy5mYWlsKGAuZW5kJHtraW5kfSB3aXRob3V0IC4ke2tpbmR9YCk7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFNjb3BlID0gdGhpcy5jdXJyZW50U2NvcGUucGFyZW50O1xuICB9XG5cbiAgcHVzaFNlZyguLi5zZWdtZW50czogQXJyYXk8c3RyaW5nfG1vZC5TZWdtZW50Pikge1xuICAgIHRoaXMuc2VnbWVudFN0YWNrLnB1c2goW3RoaXMuc2VnbWVudHMsIHRoaXMuX2NodW5rXSk7XG4gICAgdGhpcy5zZWdtZW50KC4uLnNlZ21lbnRzKTtcbiAgfVxuXG4gIHBvcFNlZygpIHtcbiAgICBpZiAoIXRoaXMuc2VnbWVudFN0YWNrLmxlbmd0aCkgdGhpcy5mYWlsKGAucG9wc2VnIHdpdGhvdXQgLnB1c2hzZWdgKTtcbiAgICBbdGhpcy5zZWdtZW50cywgdGhpcy5fY2h1bmtdID0gdGhpcy5zZWdtZW50U3RhY2sucG9wKCkhO1xuICB9XG5cbiAgbW92ZShzaXplOiBudW1iZXIsIHNvdXJjZTogRXhwcikge1xuICAgIHRoaXMuYXBwZW5kKHtvcDogJy5tb3ZlJywgYXJnczogW3NvdXJjZV0sIG1ldGE6IHtzaXplfX0sIHNpemUpO1xuICB9XG5cbiAgLy8gVXRpbGl0eSBtZXRob2RzIGZvciBwcm9jZXNzaW5nIGFyZ3VtZW50c1xuXG4gIHBhcnNlQ29uc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBudW1iZXIge1xuICAgIGNvbnN0IHZhbCA9IHRoaXMuZXZhbHVhdGUoRXhwci5wYXJzZU9ubHkodG9rZW5zLCBzdGFydCkpO1xuICAgIGlmICh2YWwgIT0gbnVsbCkgcmV0dXJuIHZhbDtcbiAgICB0aGlzLmZhaWwoYEV4cHJlc3Npb24gaXMgbm90IGNvbnN0YW50YCwgdG9rZW5zWzFdKTtcbiAgfVxuICBwYXJzZU5vQXJncyh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSkge1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMV0pO1xuICB9XG4gIHBhcnNlRXhwcih0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IEV4cHIge1xuICAgIHJldHVybiBFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0KTtcbiAgfVxuICAvLyBwYXJzZVN0cmluZ0xpc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBzdHJpbmdbXSB7XG4gIC8vICAgcmV0dXJuIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpLm1hcCh0cyA9PiB7XG4gIC8vICAgICBjb25zdCBzdHIgPSBUb2tlbi5leHBlY3RTdHJpbmcodHNbMF0pO1xuICAvLyAgICAgVG9rZW4uZXhwZWN0RW9sKHRzWzFdLCBcImEgc2luZ2xlIHN0cmluZ1wiKTtcbiAgLy8gICAgIHJldHVybiBzdHI7XG4gIC8vICAgfSk7XG4gIC8vIH1cbiAgcGFyc2VTdHIodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0ciA9IFRva2VuLmV4cGVjdFN0cmluZyh0b2tlbnNbc3RhcnRdKTtcbiAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zW3N0YXJ0ICsgMV0sIFwiYSBzaW5nbGUgc3RyaW5nXCIpO1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBwYXJzZVNlZ21lbnRMaXN0KHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogQXJyYXk8c3RyaW5nfG1vZC5TZWdtZW50PiB7XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPCBzdGFydCArIDEpIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgYSBzZWdtZW50IGxpc3RgLCB0b2tlbnNbc3RhcnQgLSAxXSk7XG4gICAgfVxuICAgIHJldHVybiBUb2tlbi5wYXJzZUFyZ0xpc3QodG9rZW5zLCAxKS5tYXAodHMgPT4ge1xuICAgICAgY29uc3Qgc3RyID0gdGhpcy5fc2VnbWVudFByZWZpeCArIFRva2VuLmV4cGVjdFN0cmluZyh0c1swXSk7XG4gICAgICBpZiAodHMubGVuZ3RoID09PSAxKSByZXR1cm4gc3RyO1xuICAgICAgaWYgKCFUb2tlbi5lcSh0c1sxXSwgVG9rZW4uQ09MT04pKSB7XG4gICAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgY29tbWEgb3IgY29sb246ICR7VG9rZW4ubmFtZSh0c1sxXSl9YCwgdHNbMV0pO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2VnID0ge25hbWU6IHN0cn0gYXMgbW9kLlNlZ21lbnQ7XG4gICAgICAvLyBUT0RPIC0gcGFyc2UgZXhwcmVzc2lvbnMuLi5cbiAgICAgIGNvbnN0IGF0dHJzID0gVG9rZW4ucGFyc2VBdHRyTGlzdCh0cywgMSk7IC8vIDogaWRlbnQgWy4uLl1cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsXSBvZiBhdHRycykge1xuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgIGNhc2UgJ2JhbmsnOiBzZWcuYmFuayA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdzaXplJzogc2VnLnNpemUgPSB0aGlzLnBhcnNlQ29uc3QodmFsLCAwKTsgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnb2ZmJzogc2VnLm9mZnNldCA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdtZW0nOiBzZWcubWVtb3J5ID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIC8vIFRPRE8gLSBJIGRvbid0IGZ1bGx5IHVuZGVyc3RhbmQgdGhlc2UuLi5cbiAgICAgICAgICAvLyBjYXNlICd6ZXJvcGFnZSc6IHNlZy5hZGRyZXNzaW5nID0gMTtcbiAgICAgICAgICBkZWZhdWx0OiB0aGlzLmZhaWwoYFVua25vd24gc2VnbWVudCBhdHRyOiAke2tleX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlZztcbiAgICB9KTtcbiAgfVxuXG4gIHBhcnNlUmVzQXJncyh0b2tlbnM6IFRva2VuW10pOiBbbnVtYmVyLCBudW1iZXI/XSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMucGFyc2VEYXRhTGlzdCh0b2tlbnMpO1xuICAgIGlmIChkYXRhLmxlbmd0aCA+IDIpIHRoaXMuZmFpbChgRXhwZWN0ZWQgYXQgbW9zdCAyIGFyZ3NgLCBkYXRhWzJdKTtcbiAgICBpZiAoIWRhdGEubGVuZ3RoKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGF0IGxlYXN0IDEgYXJnYCk7XG4gICAgY29uc3QgY291bnQgPSB0aGlzLmV2YWx1YXRlKGRhdGFbMF0pO1xuICAgIGlmIChjb3VudCA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IGNvdW50YCk7XG4gICAgY29uc3QgdmFsID0gZGF0YVsxXSAmJiB0aGlzLmV2YWx1YXRlKGRhdGFbMV0pO1xuICAgIGlmIChkYXRhWzFdICYmIHZhbCA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IHZhbHVlYCk7XG4gICAgcmV0dXJuIFtjb3VudCwgdmFsXTtcbiAgfVxuXG4gIHBhcnNlRGF0YUxpc3QodG9rZW5zOiBUb2tlbltdKTogQXJyYXk8RXhwcj47XG4gIHBhcnNlRGF0YUxpc3QodG9rZW5zOiBUb2tlbltdLCBhbGxvd1N0cmluZzogdHJ1ZSk6IEFycmF5PEV4cHJ8c3RyaW5nPjtcbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10sIGFsbG93U3RyaW5nID0gZmFsc2UpOiBBcnJheTxFeHByfHN0cmluZz4ge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgMikge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGRhdGEgbGlzdGAsIHRva2Vuc1swXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogQXJyYXk8RXhwcnxzdHJpbmc+ID0gW107XG4gICAgZm9yIChjb25zdCB0ZXJtIG9mIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpKSB7XG4gICAgICBpZiAoYWxsb3dTdHJpbmcgJiYgdGVybS5sZW5ndGggPT09IDEgJiYgdGVybVswXS50b2tlbiA9PT0gJ3N0cicpIHtcbiAgICAgICAgb3V0LnB1c2godGVybVswXS5zdHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0LnB1c2godGhpcy5yZXNvbHZlKEV4cHIucGFyc2VPbmx5KHRlcm0pKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwYXJzZUlkZW50aWZpZXJMaXN0KHRva2VuczogVG9rZW5bXSk6IHN0cmluZ1tdIHtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IDIpIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgaWRlbnRpZmllcihzKWAsIHRva2Vuc1swXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlcm0gb2YgVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkpIHtcbiAgICAgIGlmICh0ZXJtLmxlbmd0aCAhPT0gMSB8fCB0ZXJtWzBdLnRva2VuICE9PSAnaWRlbnQnKSB7XG4gICAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgaWRlbnRpZmllcjogJHtUb2tlbi5uYW1lKHRlcm1bMF0pfWAsIHRlcm1bMF0pO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2goVG9rZW4uc3RyKHRlcm1bMF0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHBhcnNlT3B0aW9uYWxJZGVudGlmaWVyKHRva2VuczogVG9rZW5bXSk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGNvbnN0IHRvayA9IHRva2Vuc1sxXTtcbiAgICBpZiAoIXRvaykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCBpZGVudCA9IFRva2VuLmV4cGVjdElkZW50aWZpZXIodG9rKTtcbiAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zWzJdKTtcbiAgICByZXR1cm4gaWRlbnQ7XG4gIH1cblxuICBwYXJzZVJlcXVpcmVkSWRlbnRpZmllcih0b2tlbnM6IFRva2VuW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkZW50ID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2tlbnNbMV0pO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMl0pO1xuICAgIHJldHVybiBpZGVudDtcbiAgfVxuXG4gIHBhcnNlTW92ZUFyZ3ModG9rZW5zOiBUb2tlbltdKTogW251bWJlciwgRXhwcl0ge1xuICAgIC8vIC5tb3ZlIDEwLCBpZGVudCAgICAgICAgOyBtdXN0IGJlIGFuIG9mZnNldFxuICAgIC8vIC5tb3ZlIDEwLCAkMTIzNCwgXCJzZWdcIiA7IG1heWJlIHN1cHBvcnQgdGhpcz9cbiAgICBjb25zdCBhcmdzID0gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAyIC8qICYmIGFyZ3MubGVuZ3RoICE9PSAzICovKSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IG51bWJlciwgdGhlbiBpZGVudGlmaWVyYCk7XG4gICAgfVxuICAgIGNvbnN0IG51bSA9IHRoaXMuZXZhbHVhdGUoRXhwci5wYXJzZU9ubHkoYXJnc1swXSkpO1xuICAgIGlmIChudW0gPT0gbnVsbCkgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGNvbnN0YW50IG51bWJlcmApO1xuXG4gICAgLy8gbGV0IHNlZ05hbWUgPSB0aGlzLnNlZ21lbnRzLmxlbmd0aCA9PT0gMSA/IHRoaXMuc2VnbWVudHNbMF0gOiB1bmRlZmluZWQ7XG4gICAgLy8gaWYgKGFyZ3MubGVuZ3RoID09PSAzKSB7XG4gICAgLy8gICBpZiAoYXJnc1syXS5sZW5ndGggIT09IDEgfHwgYXJnc1syXVswXS50b2tlbiAhPT0gJ3N0cicpIHtcbiAgICAvLyAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIHNpbmdsZSBzZWdtZW50IG5hbWVgLCB0aGlzLmFyZ3NbMl1bMF0pO1xuICAgIC8vICAgfVxuICAgIC8vICAgc2VnTmFtZSA9IGFyZ3NbMl1bMF0uc3RyO1xuICAgIC8vIH1cbiAgICAvLyBjb25zdCBzZWcgPSBzZWdOYW1lID8gdGhpcy5zZWdtZW50RGF0YS5nZXQoc2VnTmFtZSkgOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLnJlc29sdmUoRXhwci5wYXJzZU9ubHkoYXJnc1sxXSkpO1xuICAgIGlmIChvZmZzZXQub3AgPT09ICdudW0nICYmIG9mZnNldC5tZXRhPy5jaHVuayAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW251bSwgb2Zmc2V0XTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGNvbnN0YW50IG9mZnNldGAsIGFyZ3NbMV1bMF0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIERpYWdub3N0aWNzXG5cbiAgZmFpbChtc2c6IHN0cmluZywgYXQ/OiB7c291cmNlPzogU291cmNlSW5mb30pOiBuZXZlciB7XG4gICAgaWYgKGF0Py5zb3VyY2UpIHRocm93IG5ldyBFcnJvcihtc2cgKyBUb2tlbi5hdChhdCkpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cgKyBUb2tlbi5hdCh7c291cmNlOiB0aGlzLl9zb3VyY2V9KSk7XG4gIH1cblxuICB3cml0ZU51bWJlcihkYXRhOiBudW1iZXJbXSwgc2l6ZTogbnVtYmVyLCB2YWw/OiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gaWYgdmFsIGlzIGEgc2lnbmVkL3Vuc2lnbmVkIDMyLWJpdCBudW1iZXIsIGl0J3Mgbm90IGNsZWFyXG4gICAgLy8gd2hldGhlciB3ZSBuZWVkIHRvIHRyZWF0IGl0IG9uZSB3YXkgb3IgdGhlIG90aGVyLi4uPyAgYnV0IG1heWJlXG4gICAgLy8gaXQgZG9lc24ndCBtYXR0ZXIgc2luY2Ugd2UncmUgb25seSBsb29raW5nIGF0IDMyIGJpdHMgYW55d2F5LlxuICAgIGNvbnN0IHMgPSAoc2l6ZSkgPDwgMztcbiAgICBpZiAodmFsICE9IG51bGwgJiYgKHZhbCA8ICgtMSA8PCBzKSB8fCB2YWwgPj0gKDEgPDwgcykpKSB7XG4gICAgICBjb25zdCBuYW1lID0gWydieXRlJywgJ3dvcmQnLCAnZmFyd29yZCcsICdkd29yZCddW3NpemUgLSAxXTtcbiAgICAgIHRoaXMuZmFpbChgTm90IGEgJHtuYW1lfTogJCR7dmFsLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGRhdGEucHVzaCh2YWwgIT0gbnVsbCA/IHZhbCAmIDB4ZmYgOiAweGZmKTtcbiAgICAgIGlmICh2YWwgIT0gbnVsbCkgdmFsID4+PSA4O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVN0cmluZyhkYXRhOiBudW1iZXJbXSwgc3RyOiBzdHJpbmcpIHtcbiAgLy8gVE9ETyAtIHN1cHBvcnQgY2hhcmFjdGVyIG1hcHMgKHBhc3MgYXMgdGhpcmQgYXJnPylcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBkYXRhLnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xuICB9XG59XG5cbnR5cGUgQXJnTW9kZSA9XG4gICAgJ2FkZCcgfCAnYSx4JyB8ICdhLHknIHwgLy8gcHNldWRvIG1vZGVzXG4gICAgJ2FicycgfCAnYWJ4JyB8ICdhYnknIHxcbiAgICAnaW1tJyB8ICdpbmQnIHwgJ2lueCcgfCAnaW55JyB8XG4gICAgJ3JlbCcgfCAnenBnJyB8ICd6cHgnIHwgJ3pweSc7XG5cbmV4cG9ydCB0eXBlIEFyZyA9IFsnYWNjJyB8ICdpbXAnXSB8IFtBcmdNb2RlLCBFeHByXTtcblxuZXhwb3J0IG5hbWVzcGFjZSBBc3NlbWJsZXIge1xuICBleHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICAgIGFsbG93QnJhY2tldHM/OiBib29sZWFuO1xuICAgIHJlZW50cmFudFNjb3Blcz86IGJvb2xlYW47XG4gIH1cbn1cbiJdfQ==