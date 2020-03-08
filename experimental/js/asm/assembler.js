import { Cpu } from './cpu.js';
import { Expr } from './expr.js';
import * as mod from './module.js';
import { Token } from './token.js';
import { Tokenizer } from './tokenizer.js';
import { assertNever } from '../util.js';
const Segment = mod.Segment;
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
                this.segmentData.set(s.name, Segment.merge(data, s));
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
        if (this.segments.length !== 1) {
            this.fail(`.free with non-unique segment: ${this.segments}`, token);
        }
        else if (this._org == null) {
            this.fail(`.free in .reloc mode`, token);
        }
        else if (size < 0) {
            this.fail(`.free with negative size: ${size}`, token);
        }
        if (this._chunk) {
            this._org += this._chunk.data.length;
        }
        this._chunk = undefined;
        const name = this.segments[0];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZW1ibGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2FzbS9hc3NlbWJsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUM3QixPQUFPLEVBQUMsSUFBSSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQy9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBYSxLQUFLLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFDMUQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3pDLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFLdkMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztBQUU1QixNQUFNLE1BQU07Q0FvQlg7QUFFRCxNQUFlLFNBQVM7SUFBeEI7UUFFVyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7SUFpQy9DLENBQUM7SUEvQlcsU0FBUyxDQUFDLElBQVk7UUFDOUIsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBVUQsT0FBTyxDQUFDLElBQVksRUFBRSxlQUF5QjtRQUM3QyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbEMsSUFBSSxHQUFHLEVBQUU7WUFDUCxJQUFJLElBQUksS0FBSyxJQUFJO2dCQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ3JDLE9BQU8sR0FBRyxDQUFDO1NBQ1o7UUFDRCxJQUFJLENBQUMsZUFBZTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBTXZDLE1BQU0s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QUFDLENBQUM7UUFDL0IsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLEtBQUssR0FBRyxDQUFDLEVBQUU7WUFDL0IsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7Z0JBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2xEO2FBQU0sSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDM0MsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRDtRQUVELElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssS0FBSyxHQUFHLENBQUM7WUFDM0QsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFFbkQsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQztTQUNsRDthQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssSUFBSTtZQUNuRCxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUVwQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7U0FDN0M7UUFFRCxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsQ0FBQyxJQUFJLENBQUMsSUFB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TUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxXQUFXLENBQUMsSUFBYyxFQUFFLElBQVksRUFBRSxHQUFZO1FBSXBELE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZELE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbEQ7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0MsSUFBSSxHQUFHLElBQUksSUFBSTtnQkFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1NBQzVCO0lBQ0gsQ0FBQztDQUNGO0FBRUQsU0FBUyxXQUFXLENBQUMsSUFBYyxFQUFFLEdBQVc7SUFFOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDOUI7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDcHV9IGZyb20gJy4vY3B1LmpzJztcbmltcG9ydCB7RXhwcn0gZnJvbSAnLi9leHByLmpzJztcbmltcG9ydCAqIGFzIG1vZCBmcm9tICcuL21vZHVsZS5qcyc7XG5pbXBvcnQge1NvdXJjZUluZm8sIFRva2VuLCBUb2tlblNvdXJjZX0gZnJvbSAnLi90b2tlbi5qcyc7XG5pbXBvcnQge1Rva2VuaXplcn0gZnJvbSAnLi90b2tlbml6ZXIuanMnO1xuaW1wb3J0IHthc3NlcnROZXZlcn0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbnR5cGUgQ2h1bmsgPSBtb2QuQ2h1bms8bnVtYmVyW10+O1xudHlwZSBNb2R1bGUgPSBtb2QuTW9kdWxlO1xudHlwZSBTZWdtZW50ID0gbW9kLlNlZ21lbnQ7XG5jb25zdCBTZWdtZW50ID0gbW9kLlNlZ21lbnQ7XG5cbmNsYXNzIFN5bWJvbCB7XG4gIC8qKlxuICAgKiBJbmRleCBpbnRvIHRoZSBnbG9iYWwgc3ltYm9sIGFycmF5LiAgT25seSBhcHBsaWVzIHRvIGltbXV0YWJsZVxuICAgKiBzeW1ib2xzIHRoYXQgbmVlZCB0byBiZSBhY2Nlc3NpYmxlIGF0IGxpbmsgdGltZS4gIE11dGFibGUgc3ltYm9sc1xuICAgKiBhbmQgc3ltYm9scyB3aXRoIGtub3duIHZhbHVlcyBhdCB1c2UgdGltZSBhcmUgbm90IGFkZGVkIHRvIHRoZVxuICAgKiBnbG9iYWwgbGlzdCBhbmQgYXJlIHRoZXJlZm9yZSBoYXZlIG5vIGlkLiAgTXV0YWJpbGl0eSBpcyB0cmFja2VkXG4gICAqIGJ5IHN0b3JpbmcgYSAtMSBoZXJlLlxuICAgKi9cbiAgaWQ/OiBudW1iZXI7XG4gIC8qKiBXaGV0aGVyIHRoZSBzeW1ib2wgaGFzIGJlZW4gZXhwbGljaXRseSBzY29wZWQuICovXG4gIHNjb3BlZD86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGUgZXhwcmVzc2lvbiBmb3IgdGhlIHN5bWJvbC4gIE11c3QgYmUgYSBzdGF0aWNhbGx5LWV2YWx1YXRhYmxlIGNvbnN0YW50XG4gICAqIGZvciBtdXRhYmxlIHN5bWJvbHMuICBVbmRlZmluZWQgZm9yIGZvcndhcmQtcmVmZXJlbmNlZCBzeW1ib2xzLlxuICAgKi9cbiAgZXhwcj86IEV4cHI7XG4gIC8qKiBOYW1lIHRoaXMgc3ltYm9sIGlzIGV4cG9ydGVkIGFzLiAqL1xuICBleHBvcnQ/OiBzdHJpbmc7XG4gIC8qKiBUb2tlbiB3aGVyZSB0aGlzIHN5bWJvbCB3YXMgcmVmJ2QuICovXG4gIHJlZj86IHtzb3VyY2U/OiBTb3VyY2VJbmZvfTsgLy8gVE9ETyAtIHBsdW1iIHRoaXMgdGhyb3VnaFxufVxuXG5hYnN0cmFjdCBjbGFzcyBCYXNlU2NvcGUge1xuICAvL2Nsb3NlZCA9IGZhbHNlO1xuICByZWFkb25seSBzeW1ib2xzID0gbmV3IE1hcDxzdHJpbmcsIFN5bWJvbD4oKTtcblxuICBwcm90ZWN0ZWQgcGlja1Njb3BlKG5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIEJhc2VTY29wZV0ge1xuICAgIHJldHVybiBbbmFtZSwgdGhpc107XG4gIH1cblxuICAvLyBUT0RPIC0gbWF5IG5lZWQgYWRkaXRpb25hbCBvcHRpb25zOlxuICAvLyAgIC0gbG9va3VwIGNvbnN0YW50IC0gd29uJ3QgcmV0dXJuIGEgbXV0YWJsZSB2YWx1ZSBvciBhIHZhbHVlIGZyb21cbiAgLy8gICAgIGEgcGFyZW50IHNjb3BlLCBpbXBsaWVzIG5vIGZvcndhcmQgcmVmXG4gIC8vICAgLSBzaGFsbG93IC0gZG9uJ3QgcmVjdXJzZSB1cCB0aGUgY2hhaW4sIGZvciBhc3NpZ25tZW50IG9ubHk/P1xuICAvLyBNaWdodCBqdXN0IG1lYW4gYWxsb3dGb3J3YXJkUmVmIGlzIGFjdHVhbGx5IGp1c3QgYSBtb2RlIHN0cmluZz9cbiAgLy8gICogY2E2NSdzIC5kZWZpbmVkc3ltYm9sIGlzIG1vcmUgcGVybWlzc2l2ZSB0aGFuIC5pZmNvbnN0XG4gIHJlc29sdmUobmFtZTogc3RyaW5nLCBhbGxvd0ZvcndhcmRSZWY6IHRydWUpOiBTeW1ib2w7XG4gIHJlc29sdmUobmFtZTogc3RyaW5nLCBhbGxvd0ZvcndhcmRSZWY/OiBib29sZWFuKTogU3ltYm9sfHVuZGVmaW5lZDtcbiAgcmVzb2x2ZShuYW1lOiBzdHJpbmcsIGFsbG93Rm9yd2FyZFJlZj86IGJvb2xlYW4pOiBTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBbdGFpbCwgc2NvcGVdID0gdGhpcy5waWNrU2NvcGUobmFtZSk7XG4gICAgbGV0IHN5bSA9IHNjb3BlLnN5bWJvbHMuZ2V0KHRhaWwpO1xuLy9jb25zb2xlLmxvZygncmVzb2x2ZTonLG5hbWUsJ3N5bT0nLHN5bSwnZndkPycsYWxsb3dGb3J3YXJkUmVmKTtcbiAgICBpZiAoc3ltKSB7XG4gICAgICBpZiAodGFpbCAhPT0gbmFtZSkgc3ltLnNjb3BlZCA9IHRydWU7XG4gICAgICByZXR1cm4gc3ltO1xuICAgIH1cbiAgICBpZiAoIWFsbG93Rm9yd2FyZFJlZikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAvLyBpZiAoc2NvcGUuY2xvc2VkKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCByZXNvbHZlIHN5bWJvbDogJHtuYW1lfWApO1xuICAgIC8vIG1ha2UgYSBuZXcgc3ltYm9sIC0gYnV0IG9ubHkgaW4gYW4gb3BlbiBzY29wZVxuICAgIC8vY29uc3Qgc3ltYm9sID0ge2lkOiB0aGlzLnN5bWJvbEFycmF5Lmxlbmd0aH07XG4vL2NvbnNvbGUubG9nKCdjcmVhdGVkOicsc3ltYm9sKTtcbiAgICAvL3RoaXMuc3ltYm9sQXJyYXkucHVzaChzeW1ib2wpO1xuICAgIGNvbnN0IHN5bWJvbDogU3ltYm9sID0ge307XG4gICAgc2NvcGUuc3ltYm9scy5zZXQodGFpbCwgc3ltYm9sKTtcbiAgICBpZiAodGFpbCAhPT0gbmFtZSkgc3ltYm9sLnNjb3BlZCA9IHRydWU7XG4gICAgcmV0dXJuIHN5bWJvbDtcbiAgfVxufVxuXG5jbGFzcyBTY29wZSBleHRlbmRzIEJhc2VTY29wZSB7XG4gIHJlYWRvbmx5IGdsb2JhbDogU2NvcGU7XG4gIHJlYWRvbmx5IGNoaWxkcmVuID0gbmV3IE1hcDxzdHJpbmcsIFNjb3BlPigpO1xuICByZWFkb25seSBhbm9ueW1vdXNDaGlsZHJlbjogU2NvcGVbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHBhcmVudD86IFNjb3BlLCByZWFkb25seSBraW5kPzogJ3Njb3BlJ3wncHJvYycpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuZ2xvYmFsID0gcGFyZW50ID8gcGFyZW50Lmdsb2JhbCA6IHRoaXM7XG4gIH1cblxuICBwaWNrU2NvcGUobmFtZTogc3RyaW5nKTogW3N0cmluZywgU2NvcGVdIHtcbiAgICAvLyBUT0RPIC0gcGx1bWIgdGhlIHNvdXJjZSBpbmZvcm1hdGlvbiB0aHJvdWdoIGhlcmU/XG4gICAgbGV0IHNjb3BlOiBTY29wZSA9IHRoaXM7XG4gICAgY29uc3Qgc3BsaXQgPSBuYW1lLnNwbGl0KC86Oi9nKTtcbiAgICBjb25zdCB0YWlsID0gc3BsaXQucG9wKCkhO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghaSAmJiAhc3BsaXRbaV0pIHsgLy8gZ2xvYmFsXG4gICAgICAgIHNjb3BlID0gc2NvcGUuZ2xvYmFsO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxldCBjaGlsZCA9IHNjb3BlLmNoaWxkcmVuLmdldChzcGxpdFtpXSk7XG4gICAgICB3aGlsZSAoIWkgJiYgc2NvcGUucGFyZW50ICYmICFjaGlsZCkge1xuICAgICAgICBjaGlsZCA9IChzY29wZSA9IHNjb3BlLnBhcmVudCkuY2hpbGRyZW4uZ2V0KHNwbGl0W2ldKTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBuYW1lIGhhcyBhbiBleHBsaWNpdCBzY29wZSwgdGhpcyBpcyBhbiBlcnJvcj9cbiAgICAgIGlmICghY2hpbGQpIHtcbiAgICAgICAgY29uc3Qgc2NvcGVOYW1lID0gc3BsaXQuc2xpY2UoMCwgaSArIDEpLmpvaW4oJzo6Jyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IHJlc29sdmUgc2NvcGUgJHtzY29wZU5hbWV9YCk7XG4gICAgICB9XG4gICAgICBzY29wZSA9IGNoaWxkO1xuICAgIH1cbiAgICByZXR1cm4gW3RhaWwsIHNjb3BlXTtcbiAgfVxuXG4gIC8vIGNsb3NlKCkge1xuICAvLyAgIGlmICghdGhpcy5wYXJlbnQpIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGNsb3NlIGdsb2JhbCBzY29wZWApO1xuICAvLyAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgLy8gICAvLyBBbnkgdW5kZWZpbmVkIGlkZW50aWZpZXJzIGluIHRoZSBzY29wZSBhcmUgYXV0b21hdGljYWxseVxuICAvLyAgIC8vIHByb21vdGVkIHRvIHRoZSBwYXJlbnQgc2NvcGUuXG4gIC8vICAgZm9yIChjb25zdCBbbmFtZSwgc3ltXSBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgLy8gICAgIGlmIChzeW0uZXhwcikgY29udGludWU7IC8vIGlmIGl0J3MgZGVmaW5lZCBpbiB0aGUgc2NvcGUsIGRvIG5vdGhpbmdcbiAgLy8gICAgIGNvbnN0IHBhcmVudFN5bSA9IHRoaXMucGFyZW50LnN5bWJvbHMuZ2V0KHN5bSk7XG4gIC8vICAgfVxuICAvLyB9XG59XG5cbmNsYXNzIENoZWFwU2NvcGUgZXh0ZW5kcyBCYXNlU2NvcGUge1xuXG4gIC8qKiBDbGVhciBldmVyeXRoaW5nIG91dCwgbWFraW5nIHN1cmUgZXZlcnl0aGluZyB3YXMgZGVmaW5lZC4gKi9cbiAgY2xlYXIoKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgc3ltXSBvZiB0aGlzLnN5bWJvbHMpIHtcbiAgICAgIGlmICghc3ltLmV4cHIpIHtcbiAgICAgICAgY29uc3QgYXQgPSBzeW0ucmVmID8gVG9rZW4uYXQoc3ltLnJlZikgOiAnJztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDaGVhcCBsb2NhbCBsYWJlbCBuZXZlciBkZWZpbmVkOiAke25hbWV9JHthdH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5zeW1ib2xzLmNsZWFyKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFzc2VtYmxlciB7XG5cbiAgLyoqIFRoZSBjdXJyZW50bHktb3BlbiBzZWdtZW50KHMpLiAqL1xuICBwcml2YXRlIHNlZ21lbnRzOiByZWFkb25seSBzdHJpbmdbXSA9IFsnY29kZSddO1xuXG4gIC8qKiBEYXRhIG9uIGFsbCB0aGUgc2VnbWVudHMuICovXG4gIHByaXZhdGUgc2VnbWVudERhdGEgPSBuZXcgTWFwPHN0cmluZywgU2VnbWVudD4oKTtcblxuICAvKiogU3RhY2sgb2Ygc2VnbWVudHMgZm9yIC5wdXNoc2VnLy5wb3BzZWcuICovXG4gIHByaXZhdGUgc2VnbWVudFN0YWNrOiBBcnJheTxyZWFkb25seSBbcmVhZG9ubHkgc3RyaW5nW10sIENodW5rP10+ID0gW107XG5cbiAgLyoqIEFsbCBzeW1ib2xzIGluIHRoaXMgb2JqZWN0LiAqL1xuICBwcml2YXRlIHN5bWJvbHM6IFN5bWJvbFtdID0gW107XG5cbiAgLyoqIEdsb2JhbCBzeW1ib2xzLiAqL1xuICAvLyBOT1RFOiB3ZSBjb3VsZCBhZGQgJ2ZvcmNlLWltcG9ydCcsICdkZXRlY3QnLCBvciBvdGhlcnMuLi5cbiAgcHJpdmF0ZSBnbG9iYWxzID0gbmV3IE1hcDxzdHJpbmcsICdleHBvcnQnfCdpbXBvcnQnPigpO1xuXG4gIC8qKiBUaGUgY3VycmVudCBzY29wZS4gKi9cbiAgcHJpdmF0ZSBjdXJyZW50U2NvcGUgPSBuZXcgU2NvcGUoKTtcblxuICAvKiogQSBzY29wZSBmb3IgY2hlYXAgbG9jYWwgbGFiZWxzLiAqL1xuICBwcml2YXRlIGNoZWFwTG9jYWxzID0gbmV3IENoZWFwU2NvcGUoKTtcblxuICAvKiogTGlzdCBvZiBnbG9iYWwgc3ltYm9sIGluZGljZXMgdXNlZCBieSBmb3J3YXJkIHJlZnMgdG8gYW5vbnltb3VzIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBhbm9ueW1vdXNGb3J3YXJkOiBudW1iZXJbXSA9IFtdO1xuXG4gIC8qKiBMaXN0IG9mIGNodW5rL29mZnNldCBwb3NpdGlvbnMgb2YgcHJldmlvdXMgYW5vbnltb3VzIGxhYmVscy4gKi9cbiAgcHJpdmF0ZSBhbm9ueW1vdXNSZXZlcnNlOiBFeHByW10gPSBbXTtcblxuICAvKiogTWFwIG9mIGdsb2JhbCBzeW1ib2wgaW5jaWRlcyB1c2VkIGJ5IGZvcndhcmQgcmVmcyB0byByZWxhdGl2ZSBsYWJlbHMuICovXG4gIHByaXZhdGUgcmVsYXRpdmVGb3J3YXJkOiBudW1iZXJbXSA9IFtdO1xuXG4gIC8qKiBNYXAgb2YgY2h1bmsvb2Zmc2V0IHBvc2l0aW9ucyBvZiBiYWNrLXJlZmVyYWJsZSByZWxhdGl2ZSBsYWJlbHMuICovXG4gIHByaXZhdGUgcmVsYXRpdmVSZXZlcnNlOiBFeHByW10gPSBbXTtcblxuICAvKiogQWxsIHRoZSBjaHVua3Mgc28gZmFyLiAqL1xuICBwcml2YXRlIGNodW5rczogQ2h1bmtbXSA9IFtdO1xuXG4gIC8qKiBDdXJyZW50bHkgYWN0aXZlIGNodW5rICovXG4gIHByaXZhdGUgX2NodW5rOiBDaHVua3x1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgLyoqIE5hbWUgb2YgdGhlIG5leHQgY2h1bmsgKi9cbiAgcHJpdmF0ZSBfbmFtZTogc3RyaW5nfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAvKiogT3JpZ2luIG9mIHRoZSBjdXJybmV0IGNodW5rLCBpZiBmaXhlZC4gKi9cbiAgcHJpdmF0ZSBfb3JnOiBudW1iZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gIC8qKiBQcmVmaXggdG8gcHJlcGVuZCB0byBhbGwgc2VnbWVudCBuYW1lcy4gKi9cbiAgcHJpdmF0ZSBfc2VnbWVudFByZWZpeCA9ICcnO1xuXG4gIC8qKiBDdXJyZW50IHNvdXJjZSBsb2NhdGlvbiwgZm9yIGVycm9yIG1lc3NhZ2VzLiAqL1xuICBwcml2YXRlIF9zb3VyY2U/OiBTb3VyY2VJbmZvO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNwdSA9IENwdS5QMDIsIHJlYWRvbmx5IG9wdHM6IEFzc2VtYmxlci5PcHRpb25zID0ge30pIHt9XG5cbiAgcHJpdmF0ZSBnZXQgY2h1bmsoKTogQ2h1bmsge1xuICAgIC8vIG1ha2UgY2h1bmsgb25seSB3aGVuIG5lZWRlZFxuICAgIHRoaXMuZW5zdXJlQ2h1bmsoKTtcbiAgICByZXR1cm4gdGhpcy5fY2h1bmshO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDaHVuaygpIHtcbiAgICBpZiAoIXRoaXMuX2NodW5rKSB7XG4gICAgICAvLyBOT1RFOiBtdWx0aXBsZSBzZWdtZW50cyBPSyBpZiBkaXNqb2ludCBtZW1vcnkuLi5cbiAgICAgIC8vIGlmICh0aGlzLl9vcmcgIT0gbnVsbCAmJiB0aGlzLnNlZ21lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgLy8gICB0aGlzLmZhaWwoYC5vcmcgY2h1bmtzIG11c3QgYmUgc2luZ2xlLXNlZ21lbnRgKTtcbiAgICAgIC8vIH1cbiAgICAgIHRoaXMuX2NodW5rID0ge3NlZ21lbnRzOiB0aGlzLnNlZ21lbnRzLCBkYXRhOiBbXX07XG4gICAgICBpZiAodGhpcy5fb3JnICE9IG51bGwpIHRoaXMuX2NodW5rLm9yZyA9IHRoaXMuX29yZztcbiAgICAgIGlmICh0aGlzLl9uYW1lKSB0aGlzLl9jaHVuay5uYW1lID0gdGhpcy5fbmFtZTtcbiAgICAgIHRoaXMuY2h1bmtzLnB1c2godGhpcy5fY2h1bmspO1xuICAgIH1cbiAgfVxuXG4gIGRlZmluZWRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJbiB0aGlzIGNhc2UsIGl0J3Mgb2theSB0byB0cmF2ZXJzZSB1cCB0aGUgc2NvcGUgY2hhaW4gc2luY2UgaWYgd2VcbiAgICAvLyB3ZXJlIHRvIHJlZmVyZW5jZSB0aGUgc3ltYm9sLCBpdCdzIGd1YXJhbnRlZWQgdG8gYmUgZGVmaW5lZCBzb21laG93LlxuICAgIGxldCBzY29wZTogU2NvcGV8dW5kZWZpbmVkID0gdGhpcy5jdXJyZW50U2NvcGU7XG4gICAgY29uc3QgdW5zY29wZWQgPSAhc3ltLmluY2x1ZGVzKCc6OicpO1xuICAgIGRvIHtcbiAgICAgIGNvbnN0IHMgPSBzY29wZS5yZXNvbHZlKHN5bSwgZmFsc2UpO1xuICAgICAgaWYgKHMpIHJldHVybiBCb29sZWFuKHMuZXhwcik7XG4gICAgfSB3aGlsZSAodW5zY29wZWQgJiYgKHNjb3BlID0gc2NvcGUucGFyZW50KSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3RhbnRTeW1ib2woc3ltOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBJZiB0aGVyZSdzIGEgc3ltYm9sIGluIGEgZGlmZmVyZW50IHNjb3BlLCBpdCdzIG5vdCBhY3R1YWxseSBjb25zdGFudC5cbiAgICBjb25zdCBzID0gdGhpcy5jdXJyZW50U2NvcGUucmVzb2x2ZShzeW0sIGZhbHNlKTtcbiAgICByZXR1cm4gQm9vbGVhbihzICYmIHMuZXhwciAmJiAhKHMuaWQhIDwgMCkpO1xuICB9XG5cbiAgcmVmZXJlbmNlZFN5bWJvbChzeW06IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIElmIG5vdCByZWZlcmVuY2VkIGluIHRoaXMgc2NvcGUsIHdlIGRvbid0IGtub3cgd2hpY2ggaXQgaXMuLi5cbiAgICAvLyBOT1RFOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIGNhNjUuXG4gICAgY29uc3QgcyA9IHRoaXMuY3VycmVudFNjb3BlLnJlc29sdmUoc3ltLCBmYWxzZSk7XG4gICAgcmV0dXJuIHMgIT0gbnVsbDsgLy8gTk9URTogdGhpcyBjb3VudHMgZGVmaW5pdGlvbnMuXG4gIH1cblxuICBldmFsdWF0ZShleHByOiBFeHByKTogbnVtYmVyfHVuZGVmaW5lZCB7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBpZiAoZXhwci5vcCA9PT0gJ251bScgJiYgIWV4cHIubWV0YT8ucmVsKSByZXR1cm4gZXhwci5udW07XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8vIHByaXZhdGUgZ2V0IHBjKCk6IG51bWJlcnx1bmRlZmluZWQge1xuICAvLyAgIGlmICh0aGlzLl9vcmcgPT0gbnVsbCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgLy8gICByZXR1cm4gdGhpcy5fb3JnICsgdGhpcy5vZmZzZXQ7XG4gIC8vIH1cblxuICBwYygpOiBFeHByIHtcbiAgICBjb25zdCBudW0gPSB0aGlzLmNodW5rLmRhdGEubGVuZ3RoOyAvLyBOT1RFOiBiZWZvcmUgY291bnRpbmcgY2h1bmtzXG4gICAgY29uc3QgbWV0YTogRXhwci5NZXRhID0ge3JlbDogdHJ1ZSwgY2h1bms6IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDF9O1xuICAgIGlmICh0aGlzLl9jaHVuaz8ub3JnICE9IG51bGwpIG1ldGEub3JnID0gdGhpcy5fY2h1bmsub3JnO1xuICAgIHJldHVybiBFeHByLmV2YWx1YXRlKHtvcDogJ251bScsIG51bSwgbWV0YX0pO1xuICB9XG5cbiAgcmVzb2x2ZShleHByOiBFeHByKTogRXhwciB7XG4gICAgcmV0dXJuIEV4cHIudHJhdmVyc2UoZXhwciwgKGUsIHJlYykgPT4ge1xuICAgICAgd2hpbGUgKGUub3AgPT09ICdzeW0nICYmIGUuc3ltKSB7XG4gICAgICAgIGUgPSB0aGlzLnJlc29sdmVTeW1ib2woZS5zeW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEV4cHIuZXZhbHVhdGUocmVjKGUpKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlc29sdmVTeW1ib2wobmFtZTogc3RyaW5nKTogRXhwciB7XG4gICAgaWYgKG5hbWUgPT09ICcqJykge1xuICAgICAgcmV0dXJuIHRoaXMucGMoKTtcbiAgICB9IGVsc2UgaWYgKC9eOlxcKyskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgZm9yd2FyZCByZWZcbiAgICAgIGNvbnN0IGkgPSBuYW1lLmxlbmd0aCAtIDI7XG4gICAgICBsZXQgbnVtID0gdGhpcy5hbm9ueW1vdXNGb3J3YXJkW2ldO1xuICAgICAgaWYgKG51bSAhPSBudWxsKSByZXR1cm4ge29wOiAnc3ltJywgbnVtfTtcbiAgICAgIHRoaXMuYW5vbnltb3VzRm9yd2FyZFtpXSA9IG51bSA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh7aWQ6IG51bX0pO1xuICAgICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgfSBlbHNlIGlmICgvXlxcKyskLy50ZXN0KG5hbWUpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBmb3J3YXJkIHJlZlxuICAgICAgbGV0IG51bSA9IHRoaXMucmVsYXRpdmVGb3J3YXJkW25hbWUubGVuZ3RoIC0gMV07XG4gICAgICBpZiAobnVtICE9IG51bGwpIHJldHVybiB7b3A6ICdzeW0nLCBudW19O1xuICAgICAgdGhpcy5yZWxhdGl2ZUZvcndhcmRbbmFtZS5sZW5ndGggLSAxXSA9IG51bSA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaCh7aWQ6IG51bX0pO1xuICAgICAgcmV0dXJuIHtvcDogJ3N5bScsIG51bX07XG4gICAgfSBlbHNlIGlmICgvXjotKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIGFub255bW91cyBiYWNrIHJlZlxuICAgICAgY29uc3QgaSA9IHRoaXMuYW5vbnltb3VzUmV2ZXJzZS5sZW5ndGggLSBuYW1lLmxlbmd0aCArIDE7XG4gICAgICBpZiAoaSA8IDApIHRoaXMuZmFpbChgQmFkIGFub255bW91cyBiYWNrcmVmOiAke25hbWV9YCk7XG4gICAgICByZXR1cm4gdGhpcy5hbm9ueW1vdXNSZXZlcnNlW2ldO1xuICAgIH0gZWxzZSBpZiAoL14tKyQvLnRlc3QobmFtZSkpIHtcbiAgICAgIC8vIHJlbGF0aXZlIGJhY2sgcmVmXG4gICAgICBjb25zdCBleHByID0gdGhpcy5yZWxhdGl2ZVJldmVyc2VbbmFtZS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChleHByID09IG51bGwpIHRoaXMuZmFpbChgQmFkIHJlbGF0aXZlIGJhY2tyZWY6ICR7bmFtZX1gKTtcbiAgICAgIHJldHVybiBleHByO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IG5hbWUuc3RhcnRzV2l0aCgnQCcpID8gdGhpcy5jaGVhcExvY2FscyA6IHRoaXMuY3VycmVudFNjb3BlO1xuICAgIGNvbnN0IHN5bSA9IHNjb3BlLnJlc29sdmUobmFtZSwgdHJ1ZSk7XG4gICAgaWYgKHN5bS5leHByKSByZXR1cm4gc3ltLmV4cHI7XG4gICAgLy8gaWYgdGhlIGV4cHJlc3Npb24gaXMgbm90IHlldCBrbm93biB0aGVuIHJlZmVyIHRvIHRoZSBzeW1ib2wgdGFibGUsXG4gICAgLy8gYWRkaW5nIGl0IGlmIG5lY2Vzc2FyeS5cbiAgICBpZiAoc3ltLmlkID09IG51bGwpIHtcbiAgICAgIHN5bS5pZCA9IHRoaXMuc3ltYm9scy5sZW5ndGg7XG4gICAgICB0aGlzLnN5bWJvbHMucHVzaChzeW0pO1xuICAgIH1cbiAgICByZXR1cm4ge29wOiAnc3ltJywgbnVtOiBzeW0uaWR9O1xuICB9XG5cbiAgLy8gTm8gYmFua3MgYXJlIHJlc29sdmVkIHlldC5cbiAgY2h1bmtEYXRhKGNodW5rOiBudW1iZXIpOiB7b3JnPzogbnVtYmVyfSB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSB6cCBzZWdtZW50cz9cbiAgICByZXR1cm4ge29yZzogdGhpcy5jaHVua3NbY2h1bmtdLm9yZ307XG4gIH1cblxuICBjbG9zZVNjb3BlcygpIHtcbiAgICB0aGlzLmNoZWFwTG9jYWxzLmNsZWFyKCk7XG4gICAgLy8gTmVlZCB0byBmaW5kIGFueSB1bmRlY2xhcmVkIHN5bWJvbHMgaW4gbmVzdGVkIHNjb3BlcyBhbmQgbGlua1xuICAgIC8vIHRoZW0gdG8gYSBwYXJlbnQgc2NvcGUgc3ltYm9sIGlmIHBvc3NpYmxlLlxuICAgIGZ1bmN0aW9uIGNsb3NlKHNjb3BlOiBTY29wZSkge1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzY29wZS5jaGlsZHJlbi52YWx1ZXMoKSkge1xuICAgICAgICBjbG9zZShjaGlsZCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHNjb3BlLmFub255bW91c0NoaWxkcmVuKSB7XG4gICAgICAgIGNsb3NlKGNoaWxkKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2Ygc2NvcGUuc3ltYm9scykge1xuICAgICAgICBpZiAoc3ltLmV4cHIgfHwgc3ltLmlkID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoc2NvcGUucGFyZW50KSB7XG4gICAgICAgICAgLy8gVE9ETyAtIHJlY29yZCB3aGVyZSBpdCB3YXMgcmVmZXJlbmNlZD9cbiAgICAgICAgICBpZiAoc3ltLnNjb3BlZCkgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgICAgICAgIGNvbnN0IHBhcmVudFN5bSA9IHNjb3BlLnBhcmVudC5zeW1ib2xzLmdldChuYW1lKTtcbiAgICAgICAgICBpZiAoIXBhcmVudFN5bSkge1xuICAgICAgICAgICAgLy8ganVzdCBhbGlhcyBpdCBkaXJlY3RseSBpbiB0aGUgcGFyZW50IHNjb3BlXG4gICAgICAgICAgICBzY29wZS5wYXJlbnQuc3ltYm9scy5zZXQobmFtZSwgc3ltKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudFN5bS5pZCAhPSBudWxsKSB7XG4gICAgICAgICAgICBzeW0uZXhwciA9IHtvcDogJ3N5bScsIG51bTogcGFyZW50U3ltLmlkfTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcmVudFN5bS5leHByKSB7XG4gICAgICAgICAgICBzeW0uZXhwciA9IHBhcmVudFN5bS5leHByO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBtdXN0IGhhdmUgZWl0aGVyIGlkIG9yIGV4cHIuLi4/XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGU6ICR7bmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gaGFuZGxlIGdsb2JhbCBzY29wZSBzZXBhcmF0ZWx5Li4uXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gdGVzdCBjYXNlOiByZWYgYSBuYW1lIGluIHR3byBjaGlsZCBzY29wZXMsIGRlZmluZSBpdCBpbiBncmFuZHBhcmVudFxuXG4gICAgaWYgKHRoaXMuY3VycmVudFNjb3BlLnBhcmVudCkge1xuICAgICAgLy8gVE9ETyAtIHJlY29yZCB3aGVyZSBpdCB3YXMgb3BlbmVkP1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTY29wZSBuZXZlciBjbG9zZWRgKTtcbiAgICB9XG4gICAgY2xvc2UodGhpcy5jdXJyZW50U2NvcGUpO1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgZ2xvYmFsXSBvZiB0aGlzLmdsb2JhbHMpIHtcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMuY3VycmVudFNjb3BlLnN5bWJvbHMuZ2V0KG5hbWUpO1xuICAgICAgaWYgKGdsb2JhbCA9PT0gJ2V4cG9ydCcpIHtcbiAgICAgICAgaWYgKCFzeW0/LmV4cHIpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sICcke25hbWV9JyB1bmRlZmluZWRgKTtcbiAgICAgICAgaWYgKHN5bS5pZCA9PSBudWxsKSB7XG4gICAgICAgICAgc3ltLmlkID0gdGhpcy5zeW1ib2xzLmxlbmd0aDtcbiAgICAgICAgICB0aGlzLnN5bWJvbHMucHVzaChzeW0pO1xuICAgICAgICB9XG4gICAgICAgIHN5bS5leHBvcnQgPSBuYW1lO1xuICAgICAgfSBlbHNlIGlmIChnbG9iYWwgPT09ICdpbXBvcnQnKSB7XG4gICAgICAgIGlmICghc3ltKSBjb250aW51ZTsgLy8gb2theSB0byBpbXBvcnQgYnV0IG5vdCB1c2UuXG4gICAgICAgIC8vIFRPRE8gLSByZWNvcmQgYm90aCBwb3NpdGlvbnM/XG4gICAgICAgIGlmIChzeW0uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBBbHJlYWR5IGRlZmluZWQ6ICR7bmFtZX1gKTtcbiAgICAgICAgc3ltLmV4cHIgPSB7b3A6ICdpbScsIHN5bTogbmFtZX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnROZXZlcihnbG9iYWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgW25hbWUsIHN5bV0gb2YgdGhpcy5jdXJyZW50U2NvcGUuc3ltYm9scykge1xuICAgICAgaWYgKCFzeW0uZXhwcikgdGhyb3cgbmV3IEVycm9yKGBTeW1ib2wgJyR7bmFtZX0nIHVuZGVmaW5lZGApO1xuICAgIH1cbiAgfVxuXG4gIG1vZHVsZSgpOiBNb2R1bGUge1xuICAgIHRoaXMuY2xvc2VTY29wZXMoKTtcblxuICAgIC8vIFRPRE8gLSBoYW5kbGUgaW1wb3J0cyBhbmQgZXhwb3J0cyBvdXQgb2YgdGhlIHNjb3BlXG4gICAgLy8gVE9ETyAtIGFkZCAuc2NvcGUgYW5kIC5lbmRzY29wZSBhbmQgZm9yd2FyZCBzY29wZSB2YXJzIGF0IGVuZCB0byBwYXJlbnRcblxuICAgIC8vIFByb2Nlc3MgYW5kIHdyaXRlIHRoZSBkYXRhXG4gICAgY29uc3QgY2h1bmtzOiBtb2QuQ2h1bms8VWludDhBcnJheT5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgdGhpcy5jaHVua3MpIHtcbiAgICAgIGNodW5rcy5wdXNoKHsuLi5jaHVuaywgZGF0YTogVWludDhBcnJheS5mcm9tKGNodW5rLmRhdGEpfSk7XG4gICAgfVxuICAgIGNvbnN0IHN5bWJvbHM6IG1vZC5TeW1ib2xbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIHRoaXMuc3ltYm9scykge1xuICAgICAgaWYgKHN5bWJvbC5leHByID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgU3ltYm9sIHVuZGVmaW5lZGApO1xuICAgICAgY29uc3Qgb3V0OiBtb2QuU3ltYm9sID0ge2V4cHI6IHN5bWJvbC5leHByfTtcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0ICE9IG51bGwpIG91dC5leHBvcnQgPSBzeW1ib2wuZXhwb3J0O1xuICAgICAgc3ltYm9scy5wdXNoKG91dCk7XG4gICAgfVxuICAgIGNvbnN0IHNlZ21lbnRzOiBTZWdtZW50W10gPSBbLi4udGhpcy5zZWdtZW50RGF0YS52YWx1ZXMoKV07XG4gICAgcmV0dXJuIHtjaHVua3MsIHN5bWJvbHMsIHNlZ21lbnRzfTtcbiAgfVxuXG4gIGxpbmUodG9rZW5zOiBUb2tlbltdKSB7XG4gICAgdGhpcy5fc291cmNlID0gdG9rZW5zWzBdLnNvdXJjZTtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IDMgJiYgVG9rZW4uZXEodG9rZW5zW3Rva2Vucy5sZW5ndGggLSAxXSwgVG9rZW4uQ09MT04pKSB7XG4gICAgICB0aGlzLmxhYmVsKHRva2Vuc1swXSk7XG4gICAgfSBlbHNlIGlmIChUb2tlbi5lcSh0b2tlbnNbMV0sIFRva2VuLkFTU0lHTikpIHtcbiAgICAgIHRoaXMuYXNzaWduKFRva2VuLnN0cih0b2tlbnNbMF0pLCB0aGlzLnBhcnNlRXhwcih0b2tlbnMsIDIpKTtcbiAgICB9IGVsc2UgaWYgKFRva2VuLmVxKHRva2Vuc1sxXSwgVG9rZW4uU0VUKSkge1xuICAgICAgdGhpcy5zZXQoVG9rZW4uc3RyKHRva2Vuc1swXSksIHRoaXMucGFyc2VFeHByKHRva2VucywgMikpO1xuICAgIH0gZWxzZSBpZiAodG9rZW5zWzBdLnRva2VuID09PSAnY3MnKSB7XG4gICAgICB0aGlzLmRpcmVjdGl2ZSh0b2tlbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluc3RydWN0aW9uKHRva2Vucyk7XG4gICAgfVxuICB9XG5cbiAgdG9rZW5zKHNvdXJjZTogVG9rZW5Tb3VyY2UpIHtcbiAgICBsZXQgbGluZTtcbiAgICB3aGlsZSAoKGxpbmUgPSBzb3VyY2UubmV4dCgpKSkge1xuICAgICAgdGhpcy5saW5lKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHRva2Vuc0FzeW5jKHNvdXJjZTogVG9rZW5Tb3VyY2UuQXN5bmMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsZXQgbGluZTtcbiAgICB3aGlsZSAoKGxpbmUgPSBhd2FpdCBzb3VyY2UubmV4dEFzeW5jKCkpKSB7XG4gICAgICB0aGlzLmxpbmUobGluZSk7XG4gICAgfVxuICB9XG5cblxuICBkaXJlY3RpdmUodG9rZW5zOiBUb2tlbltdKSB7XG4gICAgLy8gVE9ETyAtIHJlY29yZCBsaW5lIGluZm9ybWF0aW9uLCByZXdyYXAgZXJyb3IgbWVzc2FnZXM/XG4gICAgc3dpdGNoIChUb2tlbi5zdHIodG9rZW5zWzBdKSkge1xuICAgICAgY2FzZSAnLm9yZyc6IHJldHVybiB0aGlzLm9yZyh0aGlzLnBhcnNlQ29uc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcucmVsb2MnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLnJlbG9jKCk7XG4gICAgICBjYXNlICcuYXNzZXJ0JzogcmV0dXJuIHRoaXMuYXNzZXJ0KHRoaXMucGFyc2VFeHByKHRva2VucykpO1xuICAgICAgY2FzZSAnLnNlZ21lbnQnOiByZXR1cm4gdGhpcy5zZWdtZW50KC4uLnRoaXMucGFyc2VTZWdtZW50TGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5ieXRlJzogcmV0dXJuIHRoaXMuYnl0ZSguLi50aGlzLnBhcnNlRGF0YUxpc3QodG9rZW5zLCB0cnVlKSk7XG4gICAgICBjYXNlICcucmVzJzogcmV0dXJuIHRoaXMucmVzKC4uLnRoaXMucGFyc2VSZXNBcmdzKHRva2VucykpO1xuICAgICAgY2FzZSAnLndvcmQnOiByZXR1cm4gdGhpcy53b3JkKC4uLnRoaXMucGFyc2VEYXRhTGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5mcmVlJzogcmV0dXJuIHRoaXMuZnJlZSh0aGlzLnBhcnNlQ29uc3QodG9rZW5zKSwgdG9rZW5zWzBdKTtcbiAgICAgIGNhc2UgJy5zZWdtZW50cHJlZml4JzogcmV0dXJuIHRoaXMuc2VnbWVudFByZWZpeCh0aGlzLnBhcnNlU3RyKHRva2VucykpO1xuICAgICAgY2FzZSAnLmltcG9ydCc6IHJldHVybiB0aGlzLmltcG9ydCguLi50aGlzLnBhcnNlSWRlbnRpZmllckxpc3QodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZXhwb3J0JzogcmV0dXJuIHRoaXMuZXhwb3J0KC4uLnRoaXMucGFyc2VJZGVudGlmaWVyTGlzdCh0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5zY29wZSc6IHJldHVybiB0aGlzLnNjb3BlKHRoaXMucGFyc2VPcHRpb25hbElkZW50aWZpZXIodG9rZW5zKSk7XG4gICAgICBjYXNlICcuZW5kc2NvcGUnOiByZXR1cm4gdGhpcy5wYXJzZU5vQXJncyh0b2tlbnMpLCB0aGlzLmVuZFNjb3BlKCk7XG4gICAgICBjYXNlICcucHJvYyc6IHJldHVybiB0aGlzLnByb2ModGhpcy5wYXJzZVJlcXVpcmVkSWRlbnRpZmllcih0b2tlbnMpKTtcbiAgICAgIGNhc2UgJy5lbmRwcm9jJzogcmV0dXJuIHRoaXMucGFyc2VOb0FyZ3ModG9rZW5zKSwgdGhpcy5lbmRQcm9jKCk7XG4gICAgICBjYXNlICcucHVzaHNlZyc6IHJldHVybiB0aGlzLnB1c2hTZWcoLi4udGhpcy5wYXJzZVNlZ21lbnRMaXN0KHRva2VucykpO1xuICAgICAgY2FzZSAnLnBvcHNlZyc6IHJldHVybiB0aGlzLnBhcnNlTm9BcmdzKHRva2VucyksIHRoaXMucG9wU2VnKCk7XG4gICAgICBjYXNlICcubW92ZSc6IHJldHVybiB0aGlzLm1vdmUoLi4udGhpcy5wYXJzZU1vdmVBcmdzKHRva2VucykpO1xuICAgIH1cbiAgICB0aGlzLmZhaWwoYFVua25vd24gZGlyZWN0aXZlOiAke1Rva2VuLm5hbWVBdCh0b2tlbnNbMF0pfWApO1xuICB9XG5cbiAgbGFiZWwobGFiZWw6IHN0cmluZ3xUb2tlbikge1xuICAgIGxldCBpZGVudDogc3RyaW5nO1xuICAgIGxldCB0b2tlbjogVG9rZW58dW5kZWZpbmVkO1xuICAgIGNvbnN0IGV4cHIgPSB0aGlzLnBjKCk7XG4gICAgaWYgKHR5cGVvZiBsYWJlbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlkZW50ID0gbGFiZWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkZW50ID0gVG9rZW4uc3RyKHRva2VuID0gbGFiZWwpO1xuICAgICAgaWYgKGxhYmVsLnNvdXJjZSkgZXhwci5zb3VyY2UgPSBsYWJlbC5zb3VyY2U7XG4gICAgfVxuICAgIGlmIChpZGVudCA9PT0gJzonKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgbGFiZWwgLSBzaGlmdCBhbnkgZm9yd2FyZCByZWZzIG9mZiwgYW5kIHB1c2ggb250byB0aGUgYmFja3MuXG4gICAgICB0aGlzLmFub255bW91c1JldmVyc2UucHVzaChleHByKTtcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMuYW5vbnltb3VzRm9yd2FyZC5zaGlmdCgpO1xuICAgICAgaWYgKHN5bSAhPSBudWxsKSB0aGlzLnN5bWJvbHNbc3ltXS5leHByID0gZXhwcjtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKC9eXFwrKyQvLnRlc3QoaWRlbnQpKSB7XG4gICAgICAvLyByZWxhdGl2ZSBmb3J3YXJkIHJlZiAtIGZpbGwgaW4gZ2xvYmFsIHN5bWJvbCB3ZSBtYWRlIGVhcmxpZXJcbiAgICAgIGNvbnN0IHN5bSA9IHRoaXMucmVsYXRpdmVGb3J3YXJkW2lkZW50Lmxlbmd0aCAtIDFdO1xuICAgICAgZGVsZXRlIHRoaXMucmVsYXRpdmVGb3J3YXJkW2lkZW50Lmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKHN5bSAhPSBudWxsKSB0aGlzLnN5bWJvbHNbc3ltXS5leHByID0gZXhwcjtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKC9eLSskLy50ZXN0KGlkZW50KSkge1xuICAgICAgLy8gcmVsYXRpdmUgYmFja3JlZiAtIHN0b3JlIHRoZSBleHByIGZvciBsYXRlclxuICAgICAgdGhpcy5yZWxhdGl2ZVJldmVyc2VbaWRlbnQubGVuZ3RoIC0gMV0gPSBleHByO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghaWRlbnQuc3RhcnRzV2l0aCgnQCcpKSB0aGlzLmNoZWFwTG9jYWxzLmNsZWFyKCk7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBhbm9ueW1vdXMgYW5kIGNoZWFwIGxvY2FsIGxhYmVscy4uLlxuICAgIHRoaXMuYXNzaWduU3ltYm9sKGlkZW50LCBmYWxzZSwgZXhwciwgdG9rZW4pO1xuICAgIC8vIGNvbnN0IHN5bWJvbCA9IHRoaXMuc2NvcGUucmVzb2x2ZShzdHIsIHRydWUpO1xuICAgIC8vIGlmIChzeW1ib2wuZXhwcikgdGhyb3cgbmV3IEVycm9yKGBBbHJlYWR5IGRlZmluZWQ6ICR7bGFiZWx9YCk7XG4gICAgLy8gaWYgKCF0aGlzLmNodW5rKSB0aHJvdyBuZXcgRXJyb3IoYEltcG9zc2libGU/YCk7XG4gICAgLy8gY29uc3QgY2h1bmtJZCA9IHRoaXMuY2h1bmtzLmxlbmd0aCAtIDE7IC8vIG11c3QgYmUgQUZURVIgdGhpcy5jaHVua1xuICAgIC8vIHN5bWJvbC5leHByID0ge29wOiAnb2ZmJywgbnVtOiB0aGlzLm9mZnNldCwgY2h1bms6IGNodW5rSWR9O1xuICAgIC8vIGlmIChzb3VyY2UpIHN5bWJvbC5leHByLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAvLyAvLyBBZGQgdGhlIGxhYmVsIHRvIHRoZSBjdXJyZW50IGNodW5rLi4uP1xuICAgIC8vIC8vIFJlY29yZCB0aGUgZGVmaW5pdGlvbiwgZXRjLi4uP1xuICB9XG5cbiAgYXNzaWduKGlkZW50OiBzdHJpbmcsIGV4cHI6IEV4cHJ8bnVtYmVyKSB7XG4gICAgaWYgKGlkZW50LnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgdGhpcy5mYWlsKGBDaGVhcCBsb2NhbHMgbWF5IG9ubHkgYmUgbGFiZWxzOiAke2lkZW50fWApO1xuICAgIH1cbiAgICAvLyBOb3cgbWFrZSB0aGUgYXNzaWdubWVudC5cbiAgICBpZiAodHlwZW9mIGV4cHIgIT09ICdudW1iZXInKSBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpO1xuICAgIHRoaXMuYXNzaWduU3ltYm9sKGlkZW50LCBmYWxzZSwgZXhwcik7XG4gIH1cblxuICBzZXQoaWRlbnQ6IHN0cmluZywgZXhwcjogRXhwcnxudW1iZXIpIHtcbiAgICBpZiAoaWRlbnQuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICB0aGlzLmZhaWwoYENoZWFwIGxvY2FscyBtYXkgb25seSBiZSBsYWJlbHM6ICR7aWRlbnR9YCk7XG4gICAgfVxuICAgIC8vIE5vdyBtYWtlIHRoZSBhc3NpZ25tZW50LlxuICAgIGlmICh0eXBlb2YgZXhwciAhPT0gJ251bWJlcicpIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7XG4gICAgdGhpcy5hc3NpZ25TeW1ib2woaWRlbnQsIHRydWUsIGV4cHIpO1xuICB9XG5cbiAgYXNzaWduU3ltYm9sKGlkZW50OiBzdHJpbmcsIG11dDogYm9vbGVhbiwgZXhwcjogRXhwcnxudW1iZXIsIHRva2VuPzogVG9rZW4pIHtcbiAgICAvLyBOT1RFOiAqIF93aWxsXyBnZXQgY3VycmVudCBjaHVuayFcbiAgICBpZiAodHlwZW9mIGV4cHIgPT09ICdudW1iZXInKSBleHByID0ge29wOiAnbnVtJywgbnVtOiBleHByfTtcbiAgICBjb25zdCBzY29wZSA9IGlkZW50LnN0YXJ0c1dpdGgoJ0AnKSA/IHRoaXMuY2hlYXBMb2NhbHMgOiB0aGlzLmN1cnJlbnRTY29wZTtcbiAgICAvLyBOT1RFOiBUaGlzIGlzIGluY29ycmVjdCAtIGl0IHdpbGwgbG9vayB1cCB0aGUgc2NvcGUgY2hhaW4gd2hlbiBpdFxuICAgIC8vIHNob3VsZG4ndC4gIE11dGFibGVzIG1heSBvciBtYXkgbm90IHdhbnQgdGhpcywgaW1tdXRhYmxlcyBtdXN0IG5vdC5cbiAgICAvLyBXaGV0aGVyIHRoaXMgaXMgdGllZCB0byBhbGxvd0Z3ZFJlZiBvciBub3QgaXMgdW5jbGVhci4gIEl0J3MgYWxzb1xuICAgIC8vIHVuY2xlYXIgd2hldGhlciB3ZSB3YW50IHRvIGFsbG93IGRlZmluaW5nIHN5bWJvbHMgaW4gb3V0c2lkZSBzY29wZXM6XG4gICAgLy8gICA6OmZvbyA9IDQzXG4gICAgLy8gRldJVywgY2E2NSBfZG9lc18gYWxsb3cgdGhpcywgYXMgd2VsbCBhcyBmb286OmJhciA9IDQyIGFmdGVyIHRoZSBzY29wZS5cbiAgICBsZXQgc3ltID0gc2NvcGUucmVzb2x2ZShpZGVudCwgIW11dCk7XG4gICAgaWYgKHN5bSAmJiAobXV0ICE9PSAoc3ltLmlkISA8IDApKSkge1xuICAgICAgdGhpcy5mYWlsKGBDYW5ub3QgY2hhbmdlIG11dGFiaWxpdHkgb2YgJHtpZGVudH1gLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmIChtdXQgJiYgZXhwci5vcCAhPSAnbnVtJykge1xuICAgICAgdGhpcy5mYWlsKGBNdXRhYmxlIHNldCByZXF1aXJlcyBjb25zdGFudGAsIHRva2VuKTtcbiAgICB9IGVsc2UgaWYgKCFzeW0pIHtcbiAgICAgIGlmICghbXV0KSB0aHJvdyBuZXcgRXJyb3IoYGltcG9zc2libGVgKTtcbiAgICAgIHNjb3BlLnN5bWJvbHMuc2V0KGlkZW50LCBzeW0gPSB7aWQ6IC0xfSk7XG4gICAgfSBlbHNlIGlmICghbXV0ICYmIHN5bS5leHByKSB7XG4gICAgICBjb25zdCBvcmlnID1cbiAgICAgICAgICBzeW0uZXhwci5zb3VyY2UgPyBgXFxuT3JpZ2luYWxseSBkZWZpbmVkJHtUb2tlbi5hdChzeW0uZXhwcil9YCA6ICcnO1xuICAgICAgY29uc3QgbmFtZSA9IHRva2VuID8gVG9rZW4ubmFtZUF0KHRva2VuKSA6XG4gICAgICAgICAgaWRlbnQgKyAodGhpcy5fc291cmNlID8gVG9rZW4uYXQoe3NvdXJjZTogdGhpcy5fc291cmNlfSkgOiAnJyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZGVmaW5pbmcgc3ltYm9sICR7bmFtZX0ke29yaWd9YCk7XG4gICAgfVxuICAgIHN5bS5leHByID0gZXhwcjtcbiAgfVxuXG4gIGluc3RydWN0aW9uKG1uZW1vbmljOiBzdHJpbmcsIGFyZz86IEFyZ3xzdHJpbmcpOiB2b2lkO1xuICBpbnN0cnVjdGlvbih0b2tlbnM6IFRva2VuW10pOiB2b2lkO1xuICBpbnN0cnVjdGlvbiguLi5hcmdzOiBbVG9rZW5bXV18W3N0cmluZywgKEFyZ3xzdHJpbmcpP10pOiB2b2lkIHtcbiAgICBsZXQgbW5lbW9uaWM6IHN0cmluZztcbiAgICBsZXQgYXJnOiBBcmc7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxICYmIEFycmF5LmlzQXJyYXkoYXJnc1swXSkpIHtcbiAgICAgIC8vIGhhbmRsZSB0aGUgbGluZS4uLlxuICAgICAgY29uc3QgdG9rZW5zID0gYXJnc1swXTtcbiAgICAgIG1uZW1vbmljID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2tlbnNbMF0pLnRvTG93ZXJDYXNlKCk7XG4gICAgICBhcmcgPSB0aGlzLnBhcnNlQXJnKHRva2Vucyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIHBhcnNlIHRoZSB0b2tlbnMgZmlyc3RcbiAgICAgIG1uZW1vbmljID0gYXJnc1swXSBhcyBzdHJpbmc7XG4gICAgICBjb25zdCB0b2tlbml6ZXIgPSBuZXcgVG9rZW5pemVyKGFyZ3NbMV0pO1xuICAgICAgYXJnID0gdGhpcy5wYXJzZUFyZyh0b2tlbml6ZXIubmV4dCgpISwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFttbmVtb25pYywgYXJnXSA9IGFyZ3MgYXMgW3N0cmluZywgQXJnXTtcbiAgICAgIGlmICghYXJnKSBhcmcgPSBbJ2ltcCddO1xuICAgICAgbW5lbW9uaWMgPSBtbmVtb25pYy50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICAvLyBtYXkgbmVlZCB0byBzaXplIHRoZSBhcmcsIGRlcGVuZGluZy5cbiAgICAvLyBjcHUgd2lsbCB0YWtlICdhZGQnLCAnYSx4JywgYW5kICdhLHknIGFuZCBpbmRpY2F0ZSB3aGljaCBpdCBhY3R1YWxseSBpcy5cbiAgICBjb25zdCBvcHMgPSB0aGlzLmNwdS5vcChtbmVtb25pYyk7IC8vIHdpbGwgdGhyb3cgaWYgbW5lbW9uaWMgdW5rbm93blxuICAgIGNvbnN0IG0gPSBhcmdbMF07XG4gICAgaWYgKG0gPT09ICdhZGQnIHx8IG0gPT09ICdhLHgnIHx8IG0gPT09ICdhLHknKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIGFkZHJlc3MgbW5lbW9uaWNzXG4gICAgICBjb25zdCBleHByID0gYXJnWzFdITtcbiAgICAgIGNvbnN0IHMgPSBleHByLm1ldGE/LnNpemUgfHwgMjtcbiAgICAgIGlmIChtID09PSAnYWRkJyAmJiBzID09PSAxICYmICd6cGcnIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLnpwZyEsIDEsIGV4cHIpO1xuICAgICAgfSBlbHNlIGlmIChtID09PSAnYWRkJyAmJiAnYWJzJyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy5hYnMhLCAyLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2FkZCcgJiYgJ3JlbCcgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbGF0aXZlKG9wcy5yZWwhLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2EseCcgJiYgcyA9PT0gMSAmJiAnenB4JyBpbiBvcHMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3Bjb2RlKG9wcy56cHghLCAxLCBleHByKTtcbiAgICAgIH0gZWxzZSBpZiAobSA9PT0gJ2EseCcgJiYgJ2FieCcgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuYWJ4ISwgMiwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHknICYmIHMgPT09IDEgJiYgJ3pweScgaW4gb3BzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHMuenB5ISwgMSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG0gPT09ICdhLHknICYmICdhYnknIGluIG9wcykge1xuICAgICAgICByZXR1cm4gdGhpcy5vcGNvZGUob3BzLmFieSEsIDIsIGV4cHIpO1xuICAgICAgfVxuICAgICAgdGhpcy5mYWlsKGBCYWQgYWRkcmVzcyBtb2RlICR7bX0gZm9yICR7bW5lbW9uaWN9YCk7XG4gICAgfVxuICAgIC8vIEFsbCBvdGhlciBtbmVtb25pY3NcbiAgICBpZiAobSBpbiBvcHMpIHtcbiAgICAgIGNvbnN0IGFyZ0xlbiA9IHRoaXMuY3B1LmFyZ0xlbihtKTtcbiAgICAgIGlmIChtID09PSAncmVsJykgcmV0dXJuIHRoaXMucmVsYXRpdmUob3BzW21dISwgYXJnTGVuLCBhcmdbMV0hKTtcbiAgICAgIHJldHVybiB0aGlzLm9wY29kZShvcHNbbV0hLCBhcmdMZW4sIGFyZ1sxXSEpO1xuICAgIH1cbiAgICB0aGlzLmZhaWwoYEJhZCBhZGRyZXNzIG1vZGUgJHttfSBmb3IgJHttbmVtb25pY31gKTtcbiAgfVxuXG4gIHBhcnNlQXJnKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogQXJnIHtcbiAgICAvLyBMb29rIGZvciBwYXJlbnMvYnJhY2tldHMgYW5kL29yIGEgY29tbWFcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gc3RhcnQpIHJldHVybiBbJ2ltcCddO1xuICAgIGNvbnN0IGZyb250ID0gdG9rZW5zW3N0YXJ0XTtcbiAgICBjb25zdCBuZXh0ID0gdG9rZW5zW3N0YXJ0ICsgMV07XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IHN0YXJ0ICsgMSkge1xuICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoZnJvbnQsICdhJykpIHJldHVybiBbJ2FjYyddO1xuICAgIH0gZWxzZSBpZiAoVG9rZW4uZXEoZnJvbnQsIFRva2VuLklNTUVESUFURSkpIHtcbiAgICAgIHJldHVybiBbJ2ltbScsIEV4cHIucGFyc2VPbmx5KHRva2Vucywgc3RhcnQgKyAxKV07XG4gICAgfVxuICAgIC8vIExvb2sgZm9yIHJlbGF0aXZlIG9yIGFub255bW91cyBsYWJlbHMsIHdoaWNoIGFyZSBub3QgdmFsaWQgb24gdGhlaXIgb3duXG4gICAgaWYgKFRva2VuLmVxKGZyb250LCBUb2tlbi5DT0xPTikgJiYgdG9rZW5zLmxlbmd0aCA9PT0gc3RhcnQgKyAyICYmXG4gICAgICAgIG5leHQudG9rZW4gPT09ICdvcCcgJiYgL15bLStdKyQvLnRlc3QobmV4dC5zdHIpKSB7XG4gICAgICAvLyBhbm9ueW1vdXMgbGFiZWxcbiAgICAgIHJldHVybiBbJ2FkZCcsIHtvcDogJ3N5bScsIHN5bTogJzonICsgbmV4dC5zdHJ9XTtcbiAgICB9IGVsc2UgaWYgKHRva2Vucy5sZW5ndGggPT09IHN0YXJ0ICsgMSAmJiBmcm9udC50b2tlbiA9PT0gJ29wJyAmJlxuICAgICAgICAgICAgICAgL15bLStdKyQvLnRlc3QoZnJvbnQuc3RyKSkge1xuICAgICAgLy8gcmVsYXRpdmUgbGFiZWxcbiAgICAgIHJldHVybiBbJ2FkZCcsIHtvcDogJ3N5bScsIHN5bTogZnJvbnQuc3RyfV07XG4gICAgfVxuICAgIC8vIGl0IG11c3QgYmUgYW4gYWRkcmVzcyBvZiBzb21lIHNvcnQgLSBpcyBpdCBpbmRpcmVjdD9cbiAgICBpZiAoVG9rZW4uZXEoZnJvbnQsIFRva2VuLkxQKSB8fFxuICAgICAgICAodGhpcy5vcHRzLmFsbG93QnJhY2tldHMgJiYgVG9rZW4uZXEoZnJvbnQsIFRva2VuLkxCKSkpIHtcbiAgICAgIGNvbnN0IGNsb3NlID0gVG9rZW4uZmluZEJhbGFuY2VkKHRva2Vucywgc3RhcnQpO1xuICAgICAgaWYgKGNsb3NlIDwgMCkgdGhpcy5mYWlsKGBVbmJhbGFuY2VkICR7VG9rZW4ubmFtZShmcm9udCl9YCwgZnJvbnQpO1xuICAgICAgY29uc3QgYXJncyA9IFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIHN0YXJ0ICsgMSwgY2xvc2UpO1xuICAgICAgaWYgKCFhcmdzLmxlbmd0aCkgdGhpcy5mYWlsKGBCYWQgYXJndW1lbnRgLCBmcm9udCk7XG4gICAgICBjb25zdCBleHByID0gRXhwci5wYXJzZU9ubHkoYXJnc1swXSk7XG4gICAgICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgLy8gZWl0aGVyIElORCBvciBJTllcbiAgICAgICAgaWYgKFRva2VuLmVxKHRva2Vuc1tjbG9zZSArIDFdLCBUb2tlbi5DT01NQSkgJiZcbiAgICAgICAgICAgIFRva2VuLmlzUmVnaXN0ZXIodG9rZW5zW2Nsb3NlICsgMl0sICd5JykpIHtcbiAgICAgICAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zW2Nsb3NlICsgM10pO1xuICAgICAgICAgIHJldHVybiBbJ2lueScsIGV4cHJdO1xuICAgICAgICB9XG4gICAgICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbY2xvc2UgKyAxXSk7XG4gICAgICAgIHJldHVybiBbJ2luZCcsIGV4cHJdO1xuICAgICAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA9PT0gMiAmJiBhcmdzWzFdLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAvLyBJTlhcbiAgICAgICAgaWYgKFRva2VuLmlzUmVnaXN0ZXIoYXJnc1sxXVswXSwgJ3gnKSkgcmV0dXJuIFsnaW54JywgZXhwcl07XG4gICAgICB9XG4gICAgICB0aGlzLmZhaWwoYEJhZCBhcmd1bWVudGAsIGZyb250KTtcbiAgICB9XG4gICAgY29uc3QgYXJncyA9IFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIHN0YXJ0KTtcbiAgICBpZiAoIWFyZ3MubGVuZ3RoKSB0aGlzLmZhaWwoYEJhZCBhcmdgLCBmcm9udCk7XG4gICAgY29uc3QgZXhwciA9IEV4cHIucGFyc2VPbmx5KGFyZ3NbMF0pO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIFsnYWRkJywgZXhwcl07XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAyICYmIGFyZ3NbMV0ubGVuZ3RoID09PSAxKSB7XG4gICAgICBpZiAoVG9rZW4uaXNSZWdpc3RlcihhcmdzWzFdWzBdLCAneCcpKSByZXR1cm4gWydhLHgnLCBleHByXTtcbiAgICAgIGlmIChUb2tlbi5pc1JlZ2lzdGVyKGFyZ3NbMV1bMF0sICd5JykpIHJldHVybiBbJ2EseScsIGV4cHJdO1xuICAgIH1cbiAgICB0aGlzLmZhaWwoYEJhZCBhcmdgLCBmcm9udCk7XG4gIH1cblxuICByZWxhdGl2ZShvcDogbnVtYmVyLCBhcmdsZW46IG51bWJlciwgZXhwcjogRXhwcikge1xuICAgIC8vIENhbiBhcmdsZW4gZXZlciBiZSAyPyAoeWVzIC0gYnJsIG9uIDY1ODE2KVxuICAgIC8vIEJhc2ljIHBsYW4gaGVyZSBpcyB0aGF0IHdlIGFjdHVhbGx5IHdhbnQgYSByZWxhdGl2ZSBleHByLlxuICAgIC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwIHRvIGJlIG1vcmUgZWZmaWNpZW50LlxuICAgIC8vIFRPRE8gLSBoYW5kbGUgbG9jYWwvYW5vbnltb3VzIGxhYmVscyBzZXBhcmF0ZWx5P1xuICAgIC8vIFRPRE8gLSBjaGVjayB0aGUgcmFuZ2Ugc29tZWhvdz9cbiAgICBjb25zdCBudW0gPSB0aGlzLmNodW5rLmRhdGEubGVuZ3RoICsgYXJnbGVuICsgMTtcbiAgICBjb25zdCBtZXRhOiBFeHByLk1ldGEgPSB7cmVsOiB0cnVlLCBjaHVuazogdGhpcy5jaHVua3MubGVuZ3RoIC0gMX07XG4gICAgaWYgKHRoaXMuX2NodW5rPy5vcmcpIG1ldGEub3JnID0gdGhpcy5fY2h1bmsub3JnO1xuICAgIGNvbnN0IG5leHRQYyA9IHtvcDogJ251bScsIG51bSwgbWV0YX07XG4gICAgY29uc3QgcmVsOiBFeHByID0ge29wOiAnLScsIGFyZ3M6IFtleHByLCBuZXh0UGNdfTtcbiAgICBpZiAoZXhwci5zb3VyY2UpIHJlbC5zb3VyY2UgPSBleHByLnNvdXJjZTtcbiAgICB0aGlzLm9wY29kZShvcCwgYXJnbGVuLCByZWwpO1xuICB9XG5cbiAgb3Bjb2RlKG9wOiBudW1iZXIsIGFyZ2xlbjogbnVtYmVyLCBleHByOiBFeHByKSB7XG4gICAgLy8gRW1pdCBzb21lIGJ5dGVzLlxuICAgIGlmIChhcmdsZW4pIGV4cHIgPSB0aGlzLnJlc29sdmUoZXhwcik7IC8vIEJFRk9SRSBvcGNvZGUgKGluIGNhc2Ugb2YgKilcbiAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICBjaHVuay5kYXRhLnB1c2gob3ApO1xuICAgIGlmIChhcmdsZW4pIHRoaXMuYXBwZW5kKGV4cHIsIGFyZ2xlbik7XG4gICAgLy8gVE9ETyAtIGZvciByZWxhdGl2ZSwgaWYgd2UncmUgaW4gdGhlIHNhbWUgY2h1bmssIGp1c3QgY29tcGFyZVxuICAgIC8vIHRoZSBvZmZzZXQuLi5cbiAgfVxuXG4gIGFwcGVuZChleHByOiBFeHByLCBzaXplOiBudW1iZXIpIHtcbiAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICBleHByID0gdGhpcy5yZXNvbHZlKGV4cHIpO1xuICAgIGxldCB2YWwgPSBleHByLm51bSE7XG4vL2NvbnNvbGUubG9nKCdleHByOicsIGV4cHIsICd2YWw6JywgdmFsKTtcbiAgICBpZiAoZXhwci5vcCAhPT0gJ251bScgfHwgZXhwci5tZXRhPy5yZWwpIHtcbiAgICAgIC8vIHVzZSBhIHBsYWNlaG9sZGVyIGFuZCBhZGQgYSBzdWJzdGl0dXRpb25cbiAgICAgIGNvbnN0IG9mZnNldCA9IGNodW5rLmRhdGEubGVuZ3RoO1xuICAgICAgKGNodW5rLnN1YnMgfHwgKGNodW5rLnN1YnMgPSBbXSkpLnB1c2goe29mZnNldCwgc2l6ZSwgZXhwcn0pO1xuICAgICAgdGhpcy53cml0ZU51bWJlcihjaHVuay5kYXRhLCBzaXplKTsgLy8gd3JpdGUgZ29lcyBhZnRlciBzdWJzXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud3JpdGVOdW1iZXIoY2h1bmsuZGF0YSwgc2l6ZSwgdmFsKTtcbiAgICB9XG4gIH1cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIERpcmVjdGl2ZSBoYW5kbGVyc1xuXG4gIG9yZyhhZGRyOiBudW1iZXIsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICB0aGlzLl9vcmcgPSBhZGRyO1xuICAgIHRoaXMuX2NodW5rID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICB9XG5cbiAgcmVsb2MobmFtZT86IHN0cmluZykge1xuICAgIHRoaXMuX29yZyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9jaHVuayA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgfVxuXG4gIHNlZ21lbnQoLi4uc2VnbWVudHM6IEFycmF5PHN0cmluZ3xTZWdtZW50Pikge1xuICAgIC8vIFVzYWdlOiAuc2VnbWVudCBcIjFhXCIsIFwiMWJcIiwgLi4uXG4gICAgdGhpcy5zZWdtZW50cyA9IHNlZ21lbnRzLm1hcChzID0+IHR5cGVvZiBzID09PSAnc3RyaW5nJyA/IHMgOiBzLm5hbWUpO1xuICAgIGZvciAoY29uc3QgcyBvZiBzZWdtZW50cykge1xuICAgICAgaWYgKHR5cGVvZiBzID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5zZWdtZW50RGF0YS5nZXQocy5uYW1lKSB8fCB7bmFtZTogcy5uYW1lfTtcbiAgICAgICAgdGhpcy5zZWdtZW50RGF0YS5zZXQocy5uYW1lLCBTZWdtZW50Lm1lcmdlKGRhdGEsIHMpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY2h1bmsgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fbmFtZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGFzc2VydChleHByOiBFeHByKSB7XG4gICAgZXhwciA9IHRoaXMucmVzb2x2ZShleHByKTtcbiAgICBjb25zdCB2YWwgPSB0aGlzLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh2YWwgIT0gbnVsbCkge1xuICAgICAgaWYgKCF2YWwpIHRoaXMuZmFpbChgQXNzZXJ0aW9uIGZhaWxlZGAsIGV4cHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7Y2h1bmt9ID0gdGhpcztcbiAgICAgIChjaHVuay5hc3NlcnRzIHx8IChjaHVuay5hc3NlcnRzID0gW10pKS5wdXNoKGV4cHIpO1xuICAgIH1cbiAgfVxuXG4gIGJ5dGUoLi4uYXJnczogQXJyYXk8RXhwcnxzdHJpbmd8bnVtYmVyPikge1xuICAgIGNvbnN0IHtjaHVua30gPSB0aGlzO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgICAgICB0aGlzLndyaXRlTnVtYmVyKGNodW5rLmRhdGEsIDEsIGFyZyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHdyaXRlU3RyaW5nKGNodW5rLmRhdGEsIGFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFwcGVuZChhcmcsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlcyhjb3VudDogbnVtYmVyLCB2YWx1ZT86IG51bWJlcikge1xuICAgIGlmICghY291bnQpIHJldHVybjtcbiAgICB0aGlzLmJ5dGUoLi4ubmV3IEFycmF5KGNvdW50KS5maWxsKHZhbHVlID8/IDApKTtcbiAgfVxuXG4gIHdvcmQoLi4uYXJnczogQXJyYXk8RXhwcnxudW1iZXI+KSB7XG4gICAgY29uc3Qge2NodW5rfSA9IHRoaXM7XG4gICAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHRoaXMud3JpdGVOdW1iZXIoY2h1bmsuZGF0YSwgMiwgYXJnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGFyZywgMik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnJlZShzaXplOiBudW1iZXIsIHRva2VuPzogVG9rZW4pIHtcbiAgICAvLyBNdXN0IGJlIGluIC5vcmcgZm9yIGEgc2luZ2xlIHNlZ21lbnQuXG4gICAgaWYgKHRoaXMuc2VnbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aGlzLmZhaWwoYC5mcmVlIHdpdGggbm9uLXVuaXF1ZSBzZWdtZW50OiAke3RoaXMuc2VnbWVudHN9YCwgdG9rZW4pO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fb3JnID09IG51bGwpIHtcbiAgICAgIHRoaXMuZmFpbChgLmZyZWUgaW4gLnJlbG9jIG1vZGVgLCB0b2tlbik7XG4gICAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgICAgdGhpcy5mYWlsKGAuZnJlZSB3aXRoIG5lZ2F0aXZlIHNpemU6ICR7c2l6ZX1gLCB0b2tlbik7XG4gICAgfVxuICAgIC8vIElmIHdlJ3ZlIGdvdCBhbiBvcGVuIGNodW5rLCBlbmQgaXQuXG4gICAgaWYgKHRoaXMuX2NodW5rKSB7XG4gICAgICB0aGlzLl9vcmcgKz0gdGhpcy5fY2h1bmsuZGF0YS5sZW5ndGg7XG4gICAgfVxuICAgIHRoaXMuX2NodW5rID0gdW5kZWZpbmVkO1xuICAgIC8vIEVuc3VyZSBhIHNlZ21lbnQgb2JqZWN0IGV4aXN0cy5cbiAgICBjb25zdCBuYW1lID0gdGhpcy5zZWdtZW50c1swXTtcbiAgICBsZXQgcyA9IHRoaXMuc2VnbWVudERhdGEuZ2V0KG5hbWUpO1xuICAgIGlmICghcykgdGhpcy5zZWdtZW50RGF0YS5zZXQobmFtZSwgcyA9IHtuYW1lfSk7XG4gICAgKHMuZnJlZSB8fCAocy5mcmVlID0gW10pKS5wdXNoKFt0aGlzLl9vcmcsIHRoaXMuX29yZyArIHNpemVdKTtcbiAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIGZyZWUgc3BhY2UuXG4gICAgdGhpcy5fb3JnICs9IHNpemU7XG4gIH1cblxuICBzZWdtZW50UHJlZml4KHByZWZpeDogc3RyaW5nKSB7XG4gICAgLy8gVE9ETyAtIG1ha2UgbW9yZSBvZiBhIHRvZG8gYWJvdXQgY2hhbmdpbmcgdGhpcz9cbiAgICB0aGlzLl9zZWdtZW50UHJlZml4ID0gcHJlZml4O1xuICB9XG5cbiAgaW1wb3J0KC4uLmlkZW50czogc3RyaW5nW10pIHtcbiAgICBmb3IgKGNvbnN0IGlkZW50IG9mIGlkZW50cykge1xuICAgICAgdGhpcy5nbG9iYWxzLnNldChpZGVudCwgJ2ltcG9ydCcpO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCguLi5pZGVudHM6IHN0cmluZ1tdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudCBvZiBpZGVudHMpIHtcbiAgICAgIHRoaXMuZ2xvYmFscy5zZXQoaWRlbnQsICdleHBvcnQnKTtcbiAgICB9XG4gIH1cblxuICBzY29wZShuYW1lPzogc3RyaW5nKSB7XG4gICAgdGhpcy5lbnRlclNjb3BlKG5hbWUsICdzY29wZScpO1xuICB9XG5cbiAgcHJvYyhuYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmxhYmVsKG5hbWUpO1xuICAgIHRoaXMuZW50ZXJTY29wZShuYW1lLCAncHJvYycpO1xuICB9XG5cbiAgZW50ZXJTY29wZShuYW1lOiBzdHJpbmd8dW5kZWZpbmVkLCBraW5kOiAnc2NvcGUnfCdwcm9jJykge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gbmFtZSA/IHRoaXMuY3VycmVudFNjb3BlLmNoaWxkcmVuLmdldChuYW1lKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGlmICh0aGlzLm9wdHMucmVlbnRyYW50U2NvcGVzKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFNjb3BlID0gZXhpc3Rpbmc7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmFpbChgQ2Fubm90IHJlLWVudGVyIHNjb3BlICR7bmFtZX1gKTtcbiAgICB9XG4gICAgY29uc3QgY2hpbGQgPSBuZXcgU2NvcGUodGhpcy5jdXJyZW50U2NvcGUsIGtpbmQpO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY29wZS5jaGlsZHJlbi5zZXQobmFtZSwgY2hpbGQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY29wZS5hbm9ueW1vdXNDaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50U2NvcGUgPSBjaGlsZDtcbiAgfVxuXG4gIGVuZFNjb3BlKCkgeyB0aGlzLmV4aXRTY29wZSgnc2NvcGUnKTsgfVxuICBlbmRQcm9jKCkgeyB0aGlzLmV4aXRTY29wZSgncHJvYycpOyB9XG5cbiAgZXhpdFNjb3BlKGtpbmQ6ICdzY29wZSd8J3Byb2MnKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFNjb3BlLmtpbmQgIT09IGtpbmQgfHwgIXRoaXMuY3VycmVudFNjb3BlLnBhcmVudCkge1xuICAgICAgdGhpcy5mYWlsKGAuZW5kJHtraW5kfSB3aXRob3V0IC4ke2tpbmR9YCk7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFNjb3BlID0gdGhpcy5jdXJyZW50U2NvcGUucGFyZW50O1xuICB9XG5cbiAgcHVzaFNlZyguLi5zZWdtZW50czogQXJyYXk8c3RyaW5nfFNlZ21lbnQ+KSB7XG4gICAgdGhpcy5zZWdtZW50U3RhY2sucHVzaChbdGhpcy5zZWdtZW50cywgdGhpcy5fY2h1bmtdKTtcbiAgICB0aGlzLnNlZ21lbnQoLi4uc2VnbWVudHMpO1xuICB9XG5cbiAgcG9wU2VnKCkge1xuICAgIGlmICghdGhpcy5zZWdtZW50U3RhY2subGVuZ3RoKSB0aGlzLmZhaWwoYC5wb3BzZWcgd2l0aG91dCAucHVzaHNlZ2ApO1xuICAgIFt0aGlzLnNlZ21lbnRzLCB0aGlzLl9jaHVua10gPSB0aGlzLnNlZ21lbnRTdGFjay5wb3AoKSE7XG4gIH1cblxuICBtb3ZlKHNpemU6IG51bWJlciwgc291cmNlOiBFeHByKSB7XG4gICAgdGhpcy5hcHBlbmQoe29wOiAnLm1vdmUnLCBhcmdzOiBbc291cmNlXSwgbWV0YToge3NpemV9fSwgc2l6ZSk7XG4gIH1cblxuICAvLyBVdGlsaXR5IG1ldGhvZHMgZm9yIHByb2Nlc3NpbmcgYXJndW1lbnRzXG5cbiAgcGFyc2VDb25zdCh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IG51bWJlciB7XG4gICAgY29uc3QgdmFsID0gdGhpcy5ldmFsdWF0ZShFeHByLnBhcnNlT25seSh0b2tlbnMsIHN0YXJ0KSk7XG4gICAgaWYgKHZhbCAhPSBudWxsKSByZXR1cm4gdmFsO1xuICAgIHRoaXMuZmFpbChgRXhwcmVzc2lvbiBpcyBub3QgY29uc3RhbnRgLCB0b2tlbnNbMV0pO1xuICB9XG4gIHBhcnNlTm9BcmdzKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKSB7XG4gICAgVG9rZW4uZXhwZWN0RW9sKHRva2Vuc1sxXSk7XG4gIH1cbiAgcGFyc2VFeHByKHRva2VuczogVG9rZW5bXSwgc3RhcnQgPSAxKTogRXhwciB7XG4gICAgcmV0dXJuIEV4cHIucGFyc2VPbmx5KHRva2Vucywgc3RhcnQpO1xuICB9XG4gIC8vIHBhcnNlU3RyaW5nTGlzdCh0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IHN0cmluZ1tdIHtcbiAgLy8gICByZXR1cm4gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkubWFwKHRzID0+IHtcbiAgLy8gICAgIGNvbnN0IHN0ciA9IFRva2VuLmV4cGVjdFN0cmluZyh0c1swXSk7XG4gIC8vICAgICBUb2tlbi5leHBlY3RFb2wodHNbMV0sIFwiYSBzaW5nbGUgc3RyaW5nXCIpO1xuICAvLyAgICAgcmV0dXJuIHN0cjtcbiAgLy8gICB9KTtcbiAgLy8gfVxuICBwYXJzZVN0cih0b2tlbnM6IFRva2VuW10sIHN0YXJ0ID0gMSk6IHN0cmluZyB7XG4gICAgY29uc3Qgc3RyID0gVG9rZW4uZXhwZWN0U3RyaW5nKHRva2Vuc1tzdGFydF0pO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbc3RhcnQgKyAxXSwgXCJhIHNpbmdsZSBzdHJpbmdcIik7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIHBhcnNlU2VnbWVudExpc3QodG9rZW5zOiBUb2tlbltdLCBzdGFydCA9IDEpOiBBcnJheTxzdHJpbmd8U2VnbWVudD4ge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgc3RhcnQgKyAxKSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGEgc2VnbWVudCBsaXN0YCwgdG9rZW5zW3N0YXJ0IC0gMV0pO1xuICAgIH1cbiAgICByZXR1cm4gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkubWFwKHRzID0+IHtcbiAgICAgIGNvbnN0IHN0ciA9IHRoaXMuX3NlZ21lbnRQcmVmaXggKyBUb2tlbi5leHBlY3RTdHJpbmcodHNbMF0pO1xuICAgICAgaWYgKHRzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0cjtcbiAgICAgIGlmICghVG9rZW4uZXEodHNbMV0sIFRva2VuLkNPTE9OKSkge1xuICAgICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbW1hIG9yIGNvbG9uOiAke1Rva2VuLm5hbWUodHNbMV0pfWAsIHRzWzFdKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNlZyA9IHtuYW1lOiBzdHJ9IGFzIFNlZ21lbnQ7XG4gICAgICAvLyBUT0RPIC0gcGFyc2UgZXhwcmVzc2lvbnMuLi5cbiAgICAgIGNvbnN0IGF0dHJzID0gVG9rZW4ucGFyc2VBdHRyTGlzdCh0cywgMSk7IC8vIDogaWRlbnQgWy4uLl1cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsXSBvZiBhdHRycykge1xuICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgIGNhc2UgJ2JhbmsnOiBzZWcuYmFuayA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdzaXplJzogc2VnLnNpemUgPSB0aGlzLnBhcnNlQ29uc3QodmFsLCAwKTsgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnb2ZmJzogc2VnLm9mZnNldCA9IHRoaXMucGFyc2VDb25zdCh2YWwsIDApOyBicmVhaztcbiAgICAgICAgICBjYXNlICdtZW0nOiBzZWcubWVtb3J5ID0gdGhpcy5wYXJzZUNvbnN0KHZhbCwgMCk7IGJyZWFrO1xuICAgICAgICAgIC8vIFRPRE8gLSBJIGRvbid0IGZ1bGx5IHVuZGVyc3RhbmQgdGhlc2UuLi5cbiAgICAgICAgICAvLyBjYXNlICd6ZXJvcGFnZSc6IHNlZy5hZGRyZXNzaW5nID0gMTtcbiAgICAgICAgICBkZWZhdWx0OiB0aGlzLmZhaWwoYFVua25vd24gc2VnbWVudCBhdHRyOiAke2tleX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlZztcbiAgICB9KTtcbiAgfVxuXG4gIHBhcnNlUmVzQXJncyh0b2tlbnM6IFRva2VuW10pOiBbbnVtYmVyLCBudW1iZXI/XSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMucGFyc2VEYXRhTGlzdCh0b2tlbnMpO1xuICAgIGlmIChkYXRhLmxlbmd0aCA+IDIpIHRoaXMuZmFpbChgRXhwZWN0ZWQgYXQgbW9zdCAyIGFyZ3NgLCBkYXRhWzJdKTtcbiAgICBpZiAoIWRhdGEubGVuZ3RoKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGF0IGxlYXN0IDEgYXJnYCk7XG4gICAgY29uc3QgY291bnQgPSB0aGlzLmV2YWx1YXRlKGRhdGFbMF0pO1xuICAgIGlmIChjb3VudCA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IGNvdW50YCk7XG4gICAgY29uc3QgdmFsID0gZGF0YVsxXSAmJiB0aGlzLmV2YWx1YXRlKGRhdGFbMV0pO1xuICAgIGlmIChkYXRhWzFdICYmIHZhbCA9PSBudWxsKSB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IHZhbHVlYCk7XG4gICAgcmV0dXJuIFtjb3VudCwgdmFsXTtcbiAgfVxuXG4gIHBhcnNlRGF0YUxpc3QodG9rZW5zOiBUb2tlbltdKTogQXJyYXk8RXhwcj47XG4gIHBhcnNlRGF0YUxpc3QodG9rZW5zOiBUb2tlbltdLCBhbGxvd1N0cmluZzogdHJ1ZSk6IEFycmF5PEV4cHJ8c3RyaW5nPjtcbiAgcGFyc2VEYXRhTGlzdCh0b2tlbnM6IFRva2VuW10sIGFsbG93U3RyaW5nID0gZmFsc2UpOiBBcnJheTxFeHByfHN0cmluZz4ge1xuICAgIGlmICh0b2tlbnMubGVuZ3RoIDwgMikge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGRhdGEgbGlzdGAsIHRva2Vuc1swXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogQXJyYXk8RXhwcnxzdHJpbmc+ID0gW107XG4gICAgZm9yIChjb25zdCB0ZXJtIG9mIFRva2VuLnBhcnNlQXJnTGlzdCh0b2tlbnMsIDEpKSB7XG4gICAgICBpZiAoYWxsb3dTdHJpbmcgJiYgdGVybS5sZW5ndGggPT09IDEgJiYgdGVybVswXS50b2tlbiA9PT0gJ3N0cicpIHtcbiAgICAgICAgb3V0LnB1c2godGVybVswXS5zdHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0LnB1c2godGhpcy5yZXNvbHZlKEV4cHIucGFyc2VPbmx5KHRlcm0pKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwYXJzZUlkZW50aWZpZXJMaXN0KHRva2VuczogVG9rZW5bXSk6IHN0cmluZ1tdIHtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA8IDIpIHtcbiAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgaWRlbnRpZmllcihzKWAsIHRva2Vuc1swXSk7XG4gICAgfVxuICAgIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHRlcm0gb2YgVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSkpIHtcbiAgICAgIGlmICh0ZXJtLmxlbmd0aCAhPT0gMSB8fCB0ZXJtWzBdLnRva2VuICE9PSAnaWRlbnQnKSB7XG4gICAgICAgIHRoaXMuZmFpbChgRXhwZWN0ZWQgaWRlbnRpZmllcjogJHtUb2tlbi5uYW1lKHRlcm1bMF0pfWAsIHRlcm1bMF0pO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2goVG9rZW4uc3RyKHRlcm1bMF0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHBhcnNlT3B0aW9uYWxJZGVudGlmaWVyKHRva2VuczogVG9rZW5bXSk6IHN0cmluZ3x1bmRlZmluZWQge1xuICAgIGNvbnN0IHRvayA9IHRva2Vuc1sxXTtcbiAgICBpZiAoIXRvaykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCBpZGVudCA9IFRva2VuLmV4cGVjdElkZW50aWZpZXIodG9rKTtcbiAgICBUb2tlbi5leHBlY3RFb2wodG9rZW5zWzJdKTtcbiAgICByZXR1cm4gaWRlbnQ7XG4gIH1cblxuICBwYXJzZVJlcXVpcmVkSWRlbnRpZmllcih0b2tlbnM6IFRva2VuW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IGlkZW50ID0gVG9rZW4uZXhwZWN0SWRlbnRpZmllcih0b2tlbnNbMV0pO1xuICAgIFRva2VuLmV4cGVjdEVvbCh0b2tlbnNbMl0pO1xuICAgIHJldHVybiBpZGVudDtcbiAgfVxuXG4gIHBhcnNlTW92ZUFyZ3ModG9rZW5zOiBUb2tlbltdKTogW251bWJlciwgRXhwcl0ge1xuICAgIC8vIC5tb3ZlIDEwLCBpZGVudCAgICAgICAgOyBtdXN0IGJlIGFuIG9mZnNldFxuICAgIC8vIC5tb3ZlIDEwLCAkMTIzNCwgXCJzZWdcIiA7IG1heWJlIHN1cHBvcnQgdGhpcz9cbiAgICBjb25zdCBhcmdzID0gVG9rZW4ucGFyc2VBcmdMaXN0KHRva2VucywgMSk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAyIC8qICYmIGFyZ3MubGVuZ3RoICE9PSAzICovKSB7XG4gICAgICB0aGlzLmZhaWwoYEV4cGVjdGVkIGNvbnN0YW50IG51bWJlciwgdGhlbiBpZGVudGlmaWVyYCk7XG4gICAgfVxuICAgIGNvbnN0IG51bSA9IHRoaXMuZXZhbHVhdGUoRXhwci5wYXJzZU9ubHkoYXJnc1swXSkpO1xuICAgIGlmIChudW0gPT0gbnVsbCkgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGNvbnN0YW50IG51bWJlcmApO1xuXG4gICAgLy8gbGV0IHNlZ05hbWUgPSB0aGlzLnNlZ21lbnRzLmxlbmd0aCA9PT0gMSA/IHRoaXMuc2VnbWVudHNbMF0gOiB1bmRlZmluZWQ7XG4gICAgLy8gaWYgKGFyZ3MubGVuZ3RoID09PSAzKSB7XG4gICAgLy8gICBpZiAoYXJnc1syXS5sZW5ndGggIT09IDEgfHwgYXJnc1syXVswXS50b2tlbiAhPT0gJ3N0cicpIHtcbiAgICAvLyAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIHNpbmdsZSBzZWdtZW50IG5hbWVgLCB0aGlzLmFyZ3NbMl1bMF0pO1xuICAgIC8vICAgfVxuICAgIC8vICAgc2VnTmFtZSA9IGFyZ3NbMl1bMF0uc3RyO1xuICAgIC8vIH1cbiAgICAvLyBjb25zdCBzZWcgPSBzZWdOYW1lID8gdGhpcy5zZWdtZW50RGF0YS5nZXQoc2VnTmFtZSkgOiB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBvZmZzZXQgPSB0aGlzLnJlc29sdmUoRXhwci5wYXJzZU9ubHkoYXJnc1sxXSkpO1xuICAgIGlmIChvZmZzZXQub3AgPT09ICdudW0nICYmIG9mZnNldC5tZXRhPy5jaHVuayAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gW251bSwgb2Zmc2V0XTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mYWlsKGBFeHBlY3RlZCBhIGNvbnN0YW50IG9mZnNldGAsIGFyZ3NbMV1bMF0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIERpYWdub3N0aWNzXG5cbiAgZmFpbChtc2c6IHN0cmluZywgYXQ/OiB7c291cmNlPzogU291cmNlSW5mb30pOiBuZXZlciB7XG4gICAgaWYgKGF0Py5zb3VyY2UpIHRocm93IG5ldyBFcnJvcihtc2cgKyBUb2tlbi5hdChhdCkpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cgKyBUb2tlbi5hdCh7c291cmNlOiB0aGlzLl9zb3VyY2V9KSk7XG4gIH1cblxuICB3cml0ZU51bWJlcihkYXRhOiBudW1iZXJbXSwgc2l6ZTogbnVtYmVyLCB2YWw/OiBudW1iZXIpIHtcbiAgICAvLyBUT0RPIC0gaWYgdmFsIGlzIGEgc2lnbmVkL3Vuc2lnbmVkIDMyLWJpdCBudW1iZXIsIGl0J3Mgbm90IGNsZWFyXG4gICAgLy8gd2hldGhlciB3ZSBuZWVkIHRvIHRyZWF0IGl0IG9uZSB3YXkgb3IgdGhlIG90aGVyLi4uPyAgYnV0IG1heWJlXG4gICAgLy8gaXQgZG9lc24ndCBtYXR0ZXIgc2luY2Ugd2UncmUgb25seSBsb29raW5nIGF0IDMyIGJpdHMgYW55d2F5LlxuICAgIGNvbnN0IHMgPSAoc2l6ZSkgPDwgMztcbiAgICBpZiAodmFsICE9IG51bGwgJiYgKHZhbCA8ICgtMSA8PCBzKSB8fCB2YWwgPj0gKDEgPDwgcykpKSB7XG4gICAgICBjb25zdCBuYW1lID0gWydieXRlJywgJ3dvcmQnLCAnZmFyd29yZCcsICdkd29yZCddW3NpemUgLSAxXTtcbiAgICAgIHRoaXMuZmFpbChgTm90IGEgJHtuYW1lfTogJCR7dmFsLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGRhdGEucHVzaCh2YWwgIT0gbnVsbCA/IHZhbCAmIDB4ZmYgOiAweGZmKTtcbiAgICAgIGlmICh2YWwgIT0gbnVsbCkgdmFsID4+PSA4O1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVN0cmluZyhkYXRhOiBudW1iZXJbXSwgc3RyOiBzdHJpbmcpIHtcbiAgLy8gVE9ETyAtIHN1cHBvcnQgY2hhcmFjdGVyIG1hcHMgKHBhc3MgYXMgdGhpcmQgYXJnPylcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBkYXRhLnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xuICB9XG59XG5cbnR5cGUgQXJnTW9kZSA9XG4gICAgJ2FkZCcgfCAnYSx4JyB8ICdhLHknIHwgLy8gcHNldWRvIG1vZGVzXG4gICAgJ2FicycgfCAnYWJ4JyB8ICdhYnknIHxcbiAgICAnaW1tJyB8ICdpbmQnIHwgJ2lueCcgfCAnaW55JyB8XG4gICAgJ3JlbCcgfCAnenBnJyB8ICd6cHgnIHwgJ3pweSc7XG5cbmV4cG9ydCB0eXBlIEFyZyA9IFsnYWNjJyB8ICdpbXAnXSB8IFtBcmdNb2RlLCBFeHByXTtcblxuZXhwb3J0IG5hbWVzcGFjZSBBc3NlbWJsZXIge1xuICBleHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICAgIGFsbG93QnJhY2tldHM/OiBib29sZWFuO1xuICAgIHJlZW50cmFudFNjb3Blcz86IGJvb2xlYW47XG4gIH1cbn1cbiJdfQ==