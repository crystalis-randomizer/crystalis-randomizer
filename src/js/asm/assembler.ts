import { assertNever } from '../util';
import { Cpu } from './cpu';
import { Expr } from './expr';
import * as mod from './module';
import { SourceInfo, Token, TokenSource } from './token';
import { Tokenizer } from './tokenizer';
import { IntervalSet } from './util';
type Chunk = mod.Chunk<number[]>;
type Module = mod.Module;

class Symbol {
  /**
   * Index into the global symbol array.  Only applies to immutable
   * symbols that need to be accessible at link time.  Mutable symbols
   * and symbols with known values at use time are not added to the
   * global list and are therefore have no id.  Mutability is tracked
   * by storing a -1 here.
   */
  id?: number;
  /** Whether the symbol has been explicitly scoped. */
  scoped?: boolean;
  /**
   * The expression for the symbol.  Must be a statically-evaluatable constant
   * for mutable symbols.  Undefined for forward-referenced symbols.
   */
  expr?: Expr;
  /** Name this symbol is exported as. */
  export?: string;
  /** Token where this symbol was ref'd. */
  ref?: {source?: SourceInfo}; // TODO - plumb this through
}

interface ResolveOpts {
  // Whether to create a forward reference for missing symbols.
  allowForwardRef?: boolean;
  // Reference token.
  ref?: {source?: SourceInfo};
}

interface FwdRefResolveOpts extends ResolveOpts {
  allowForwardRef: true;
}

abstract class BaseScope {
  //closed = false;
  readonly symbols = new Map<string, Symbol>();

  protected pickScope(name: string): [string, BaseScope] {
    return [name, this];
  }

  // TODO - may need additional options:
  //   - lookup constant - won't return a mutable value or a value from
  //     a parent scope, implies no forward ref
  //   - shallow - don't recurse up the chain, for assignment only??
  // Might just mean allowForwardRef is actually just a mode string?
  //  * ca65's .definedsymbol is more permissive than .ifconst
  resolve(name: string, opts: FwdRefResolveOpts): Symbol;
  resolve(name: string, opts?: ResolveOpts): Symbol|undefined;
  resolve(name: string, opts: ResolveOpts = {}):
      Symbol|undefined {
    const {allowForwardRef = false, ref} = opts;
    const [tail, scope] = this.pickScope(name);
    let sym = scope.symbols.get(tail);
//console.log('resolve:',name,'sym=',sym,'fwd?',allowForwardRef);
    if (sym) {
      if (tail !== name) sym.scoped = true;
      return sym;
    }
    if (!allowForwardRef) return undefined;
    // if (scope.closed) throw new Error(`Could not resolve symbol: ${name}`);
    // make a new symbol - but only in an open scope
    //const symbol = {id: this.symbolArray.length};
//console.log('created:',symbol);
    //this.symbolArray.push(symbol);
    const symbol: Symbol = {ref};
    scope.symbols.set(tail, symbol);
    if (tail !== name) symbol.scoped = true;
    return symbol;
  }
}

class Scope extends BaseScope {
  readonly global: Scope;
  readonly children = new Map<string, Scope>();
  readonly anonymousChildren: Scope[] = [];

  constructor(readonly parent?: Scope, readonly kind?: 'scope'|'proc') {
    super();
    this.global = parent ? parent.global : this;
  }

  pickScope(name: string): [string, Scope] {
    // TODO - plumb the source information through here?
    let scope: Scope = this;
    const split = name.split(/::/g);
    const tail = split.pop()!;
    for (let i = 0; i < split.length; i++) {
      if (!i && !split[i]) { // global
        scope = scope.global;
        continue;
      }
      let child = scope.children.get(split[i]);
      while (!i && scope.parent && !child) {
        child = (scope = scope.parent).children.get(split[i]);
      }
      // If the name has an explicit scope, this is an error?
      if (!child) {
        const scopeName = split.slice(0, i + 1).join('::');
        throw new Error(`Could not resolve scope ${scopeName}`);
      }
      scope = child;
    }
    return [tail, scope];
  }

  // close() {
  //   if (!this.parent) throw new Error(`Cannot close global scope`);
  //   this.closed = true;
  //   // Any undefined identifiers in the scope are automatically
  //   // promoted to the parent scope.
  //   for (const [name, sym] of this.symbols) {
  //     if (sym.expr) continue; // if it's defined in the scope, do nothing
  //     const parentSym = this.parent.symbols.get(sym);
  //   }
  // }
}

class CheapScope extends BaseScope {

  /** Clear everything out, making sure everything was defined. */
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

export interface RefExtractor {
  label?(name: string, addr: number, segments: readonly string[]): void;
  ref?(expr: Expr, bytes: number, addr: number, segments: readonly string[]): void;
  assign?(name: string, value: number): void;
}

export class Assembler {

  /** The currently-open segment(s). */
  private segments: readonly string[] = ['code'];

  /** Data on all the segments. */
  private segmentData = new Map<string, mod.Segment>();

  /** Stack of segments for .pushseg/.popseg. */
  private segmentStack: Array<readonly [readonly string[], Chunk?]> = [];

  /** All symbols in this object. */
  private symbols: Symbol[] = [];

  /** Global symbols. */
  // NOTE: we could add 'force-import', 'detect', or others...
  private globals = new Map<string, 'export'|'import'>();

  /** The current scope. */
  private currentScope = new Scope();

  /** A scope for cheap local labels. */
  private cheapLocals = new CheapScope();

  /** List of global symbol indices used by forward refs to anonymous labels. */
  private anonymousForward: number[] = [];

  /** List of chunk/offset positions of previous anonymous labels. */
  private anonymousReverse: Expr[] = [];

  /** Map of global symbol incides used by forward refs to relative labels. */
  private relativeForward: number[] = [];

  /** Map of chunk/offset positions of back-referable relative labels. */
  private relativeReverse: Expr[] = [];

  /** List of global symbol indices used by forward refs to rts statements. */
  private rtsRefsForward: number[] = [];

  /** List of chunk/offset positions of back-referable rts statements. */
  private rtsRefsReverse: Expr[] = [];

  /** All the chunks so far. */
  private chunks: Chunk[] = [];

  /** Set of offsets definitely written/freed so far. */
  private written = new IntervalSet();

  /** Currently active chunk */
  private _chunk: Chunk|undefined = undefined;

  /** Name of the next chunk */
  private _name: string|undefined = undefined;

  /** Origin of the currnet chunk, if fixed. */
  private _org: number|undefined = undefined;

  /** Prefix to prepend to all segment names. */
  private _segmentPrefix = '';

  /** Current source location, for error messages. */
  private _source?: SourceInfo;

  /** Token for reporting errors. */
  private errorToken?: Token;

  /** Supports refExtractor. */
  private _exprMap?: WeakMap<Expr, Expr> = undefined;

  constructor(readonly cpu = Cpu.P02, readonly opts: Assembler.Options = {}) {}

  private get chunk(): Chunk {
    // make chunk only when needed
    this.ensureChunk();
    return this._chunk!;
  }

  get exprMap() {
    return this._exprMap || (this._exprMap = new WeakMap());
  }

  get overwriteMode() {
    return this.opts.overwriteMode || 'allow';
  }

  private ensureChunk() {
    if (!this._chunk) {
      // NOTE: multiple segments OK if disjoint memory...
      // if (this._org != null && this.segments.length !== 1) {
      //   this.fail(`.org chunks must be single-segment`);
      // }
      this._chunk = {segments: this.segments, data: []};
      if (this._org != null) this._chunk.org = this._org;
      if (this._name) this._chunk.name = this._name;
      this.chunks.push(this._chunk);
      this._chunk.overwrite = this.overwriteMode;
    }
  }

  definedSymbol(sym: string): boolean {
    // In this case, it's okay to traverse up the scope chain since if we
    // were to reference the symbol, it's guaranteed to be defined somehow.
    if (this.globals.get(sym) === 'import') return true;
    let scope: Scope|undefined = this.currentScope;
    const unscoped = !sym.includes('::');
    do {
      const s = scope.resolve(sym, {allowForwardRef: false});
      if (s) return Boolean(s.expr);
    } while (unscoped && (scope = scope.parent));
    return false;
  }

  constantSymbol(sym: string): boolean {
    // If there's a symbol in a different scope, it's not actually constant.
    const s = this.currentScope.resolve(sym, {allowForwardRef: false});
    return Boolean(s && s.expr && !(s.id! < 0));
  }

  referencedSymbol(sym: string): boolean {
    // If not referenced in this scope, we don't know which it is...
    // NOTE: this is different from ca65.
    const s = this.currentScope.resolve(sym, {allowForwardRef: false});
    return s != null; // NOTE: this counts definitions.
  }

  evaluate(expr: Expr): number|undefined {
    expr = this.resolve(expr);
    if (expr.op === 'num' && !expr.meta?.rel) return expr.num;
    return undefined;
  }

  // private get pc(): number|undefined {
  //   if (this._org == null) return undefined;
  //   return this._org + this.offset;
  // }

  pc(): Expr {
    const num = this.chunk.data.length; // NOTE: before counting chunks
    const meta: Expr.Meta = {rel: true, chunk: this.chunks.length - 1};
    if (this._chunk?.org != null) meta.org = this._chunk.org;
    return Expr.evaluate({op: 'num', num, meta});
  }

  // Returns an expr resolving to a symbol name (e.g. a label)
  symbol(name: string): Expr {
    return Expr.evaluate(Expr.parseOnly([{token: 'ident', str: name}]));
  }

  where(): string {
    if (!this._chunk) return '';
    if (this.chunk.org == null) return '';
    return `${this.chunk.segments.join(',')}:$${
            (this.chunk.org + this.chunk.data.length).toString(16)}`;
  }

  resolve(expr: Expr): Expr {
    const out = Expr.traverse(expr, (e, rec) => {
      while (e.op === 'sym' && e.sym) {
        e = this.resolveSymbol(e);
      }
      return Expr.evaluate(rec(e));
    });
    if (this.opts.refExtractor?.ref && out !== expr) {
      const orig = this.exprMap.get(expr) || expr;
      this.exprMap.set(out, orig);
    }
    return out;
  }

  resolveSymbol(symbol: Expr): Expr {
    const name = symbol.sym!;
    const parsed = parseSymbol(name);
    if (parsed.type === 'pc') {
      return this.pc();
    } else if (parsed.type === 'anon' && parsed.num > 0) {
      // anonymous forward ref
      const i = parsed.num - 1;
      let num = this.anonymousForward[i];
      if (num != null) return {op: 'sym', num};
      this.anonymousForward[i] = num = this.symbols.length;
      this.symbols.push({id: num});
      return {op: 'sym', num};
    } else if (parsed.type === 'rts' && parsed.num > 0) {
      // rts forward ref
      const i = parsed.num - 1;
      let num = this.rtsRefsForward[i];
      if (num != null) return {op: 'sym', num};
      this.rtsRefsForward[i] = num = this.symbols.length;
      this.symbols.push({id: num});
      return {op: 'sym', num};
    } else if (parsed.type === 'rel' && parsed.num > 0) {
      // relative forward ref
      let num = this.relativeForward[parsed.num - 1];
      if (num != null) return {op: 'sym', num};
      this.relativeForward[name.length - 1] = num = this.symbols.length;
      this.symbols.push({id: num});
      return {op: 'sym', num};
    } else if (parsed.type === 'anon' && parsed.num < 0) {
      // anonymous back ref
      const i = this.anonymousReverse.length + parsed.num;
      if (i < 0) this.fail(`Bad anonymous backref: ${name}`);
      return this.anonymousReverse[i];
    } else if (parsed.type === 'rts' && parsed.num < 0) {
      // rts back ref
      const i = this.rtsRefsReverse.length + parsed.num;
      if (i < 0) this.fail(`Bad rts backref: ${name}`);
      return this.rtsRefsReverse[i];
    } else if (parsed.type === 'rel' && parsed.num < 0) {
      // relative back ref
      const expr = this.relativeReverse[name.length - 1];
      if (expr == null) this.fail(`Bad relative backref: ${name}`);
      return expr;
    }
    const scope = name.startsWith('@') ? this.cheapLocals : this.currentScope;
    const sym = scope.resolve(name, {allowForwardRef: true, ref: symbol});
    if (sym.expr) return sym.expr;
    // if the expression is not yet known then refer to the symbol table,
    // adding it if necessary.
    if (sym.id == null) {
      sym.id = this.symbols.length;
      this.symbols.push(sym);
    }
    return {op: 'sym', num: sym.id};
  }

  // No banks are resolved yet.
  chunkData(chunk: number): {org?: number} {
    // TODO - handle zp segments?
    return {org: this.chunks[chunk].org};
  }

  closeScopes() {
    this.cheapLocals.clear();
    // Need to find any undeclared symbols in nested scopes and link
    // them to a parent scope symbol if possible.
    function close(scope: Scope) {
      for (const child of scope.children.values()) {
        close(child);
      }
      for (const child of scope.anonymousChildren) {
        close(child);
      }
      for (const [name, sym] of scope.symbols) {
        if (sym.expr || sym.id == null) continue;
        if (scope.parent) {
          // TODO - record where it was referenced?
          if (sym.scoped) throw new Error(`Symbol '${name}' undefined: ${Token.nameAt(sym.ref)}`);
          const parentSym = scope.parent.symbols.get(name);
          if (!parentSym) {
            // just alias it directly in the parent scope
            scope.parent.symbols.set(name, sym);
          } else if (parentSym.id != null) {
            sym.expr = {op: 'sym', num: parentSym.id};
          } else if (parentSym.expr) {
            sym.expr = parentSym.expr;
          } else {
            // must have either id or expr...?
            throw new Error(`Impossible: ${name}`);
          }
        }
        // handle global scope separately...
      }
    }

    // test case: ref a name in two child scopes, define it in grandparent

    if (this.currentScope.parent) {
      // TODO - record where it was opened?
      throw new Error(`Scope never closed`);
    }
    close(this.currentScope);

    for (const [name, global] of this.globals) {
      const sym = this.currentScope.symbols.get(name);
      if (global === 'export') {
        if (!sym?.expr) throw new Error(`Symbol '${name}' undefined`);
        if (sym.id == null) {
          sym.id = this.symbols.length;
          this.symbols.push(sym);
        }
        sym.export = name;
      } else if (global === 'import') {
        if (!sym) continue; // okay to import but not use.
        // TODO - record both positions?
        if (sym.expr) throw new Error(`Already defined: ${name}`);
        sym.expr = {op: 'im', sym: name};
      } else {
        assertNever(global);
      }
    }

    for (const [name, sym] of this.currentScope.symbols) {
      if (!sym.expr) throw new Error(`Symbol '${name}' undefined: ${Token.nameAt(sym.ref)}`);
    }
  }

  module(): Module {
    this.closeScopes();

    // TODO - handle imports and exports out of the scope
    // TODO - add .scope and .endscope and forward scope vars at end to parent

    // Process and write the data
    const chunks: mod.Chunk<Uint8Array>[] = [];
    for (const chunk of this.chunks) {
      chunks.push({...chunk, data: Uint8Array.from(chunk.data)});
    }
    const symbols: mod.Symbol[] = [];
    for (const symbol of this.symbols) {
      if (symbol.expr == null) throw new Error(`Symbol undefined`);
      const out: mod.Symbol = {expr: symbol.expr};
      if (symbol.export != null) out.export = symbol.export;
      symbols.push(out);
    }
    const segments: mod.Segment[] = [...this.segmentData.values()];
    return {chunks, symbols, segments};
  }

  // Assemble from a list of tokens
  line(tokens: Token[]) {
    this._source = tokens[0].source;
    if (tokens.length < 3 && Token.eq(tokens[tokens.length - 1], Token.COLON)) {
      this.label(tokens[0]);
    } else if (Token.eq(tokens[1], Token.ASSIGN)) {
      this.assign(Token.str(tokens[0]), this.parseExpr(tokens, 2));
    } else if (Token.eq(tokens[1], Token.SET)) {
      this.set(Token.str(tokens[0]), this.parseExpr(tokens, 2));
    } else if (tokens[0].token === 'cs') {
      this.directive(tokens);
    } else {
      this.instruction(tokens);
    }
  }

  // Assemble from a token source
  tokens(source: TokenSource) {
    let line;
    while ((line = source.next())) {
      this.line(line);
    }
  }

  // Assemble from an async token source
  async tokensAsync(source: TokenSource.Async): Promise<void> {
    let line;
    while ((line = await source.nextAsync())) {
      this.line(line);
    }
  }

  directive(tokens: Token[]) {
    // TODO - record line information, rewrap error messages?
    this.errorToken = tokens[0];
    try {
      switch (Token.str(tokens[0])) {
        case '.org': return this.org(this.parseConst(tokens, 1));
        case '.reloc': return this.parseNoArgs(tokens, 1), this.reloc();
        case '.assert': return this.assert(this.parseExpr(tokens, 1));
        case '.segment': return this.segment(...this.parseSegmentList(tokens, 1));
        case '.byte': return this.byte(...this.parseDataList(tokens, true));
        case '.res': return this.res(...this.parseResArgs(tokens));
        case '.word': return this.word(...this.parseDataList(tokens));
        case '.free': return this.free(this.parseConst(tokens, 1));
        case '.segmentprefix': return this.segmentPrefix(this.parseStr(tokens, 1));
        case '.import': return this.import(...this.parseIdentifierList(tokens));
        case '.export': return this.export(...this.parseIdentifierList(tokens));
        case '.scope': return this.scope(this.parseOptionalIdentifier(tokens));
        case '.endscope': return this.parseNoArgs(tokens, 1), this.endScope();
        case '.proc': return this.proc(this.parseRequiredIdentifier(tokens));
        case '.endproc': return this.parseNoArgs(tokens, 1), this.endProc();
        case '.pushseg': return this.pushSeg(...this.parseSegmentList(tokens, 1));
        case '.popseg': return this.parseNoArgs(tokens, 1), this.popSeg();
        case '.move': return this.move(...this.parseMoveArgs(tokens));
      }
      this.fail(`Unknown directive: ${Token.nameAt(tokens[0])}`);
    } finally {
      this.errorToken = undefined;
    }
  }

  label(label: string|Token) {
    let ident: string;
    let token: Token|undefined;
    const expr = this.pc();
    if (typeof label === 'string') {
      ident = label;
    } else {
      ident = Token.str(token = label);
      if (label.source) expr.source = label.source;
    }
    if (ident === ':') {
      // anonymous label - shift any forward refs off, and push onto the backs.
      this.anonymousReverse.push(expr);
      const sym = this.anonymousForward.shift();
      if (sym != null) this.symbols[sym].expr = expr;
      return;
    } else if (/^\++$/.test(ident)) {
      // relative forward ref - fill in global symbol we made earlier
      const sym = this.relativeForward[ident.length - 1];
      delete this.relativeForward[ident.length - 1];
      if (sym != null) this.symbols[sym].expr = expr;
      return;
    } else if (/^-+$/.test(ident)) {
      // relative backref - store the expr for later
      this.relativeReverse[ident.length - 1] = expr;
      return;
    }

    if (!ident.startsWith('@')) {
      this.cheapLocals.clear();
      if (!this.chunk.name && !this.chunk.data.length) this.chunk.name = ident;
      if (this.opts.refExtractor?.label && this.chunk.org != null) {
        this.opts.refExtractor.label(
            ident, this.chunk.org + this.chunk.data.length, this.chunk.segments);
      }
    }
    this.assignSymbol(ident, false, expr, token);
    // const symbol = this.scope.resolve(str, true);
    // if (symbol.expr) throw new Error(`Already defined: ${label}`);
    // if (!this.chunk) throw new Error(`Impossible?`);
    // const chunkId = this.chunks.length - 1; // must be AFTER this.chunk
    // symbol.expr = {op: 'off', num: this.offset, chunk: chunkId};
    // if (source) symbol.expr.source = source;
    // // Add the label to the current chunk...?
    // // Record the definition, etc...?
  }

  assign(ident: string, expr: Expr|number) {
    if (ident.startsWith('@')) {
      this.fail(`Cheap locals may only be labels: ${ident}`);
    }
    // Now make the assignment.
    if (typeof expr !== 'number') expr = this.resolve(expr);
    this.assignSymbol(ident, false, expr);
    // TODO - no longer needed?
    if (this.opts.refExtractor?.assign && typeof expr === 'number') {
      this.opts.refExtractor.assign(ident, expr);
    }
  }

  set(ident: string, expr: Expr|number) {
    if (ident.startsWith('@')) {
      this.fail(`Cheap locals may only be labels: ${ident}`);
    }
    // Now make the assignment.
    if (typeof expr !== 'number') expr = this.resolve(expr);
    this.assignSymbol(ident, true, expr);
  }

  assignSymbol(ident: string, mut: boolean, expr: Expr|number, token?: Token) {
    // NOTE: * _will_ get current chunk!
    if (typeof expr === 'number') expr = {op: 'num', num: expr};
    const scope = ident.startsWith('@') ? this.cheapLocals : this.currentScope;
    // NOTE: This is incorrect - it will look up the scope chain when it
    // shouldn't.  Mutables may or may not want this, immutables must not.
    // Whether this is tied to allowFwdRef or not is unclear.  It's also
    // unclear whether we want to allow defining symbols in outside scopes:
    //   ::foo = 43
    // FWIW, ca65 _does_ allow this, as well as foo::bar = 42 after the scope.
    let sym = scope.resolve(ident, {allowForwardRef: !mut, ref: token});
    if (sym && (mut !== (sym.id! < 0))) {
      this.fail(`Cannot change mutability of ${ident}`, token);
    } else if (mut && expr.op != 'num') {
      this.fail(`Mutable set requires constant`, token);
    } else if (!sym) {
      if (!mut) throw new Error(`impossible`);
      scope.symbols.set(ident, sym = {id: -1});
    } else if (!mut && sym.expr) {
      const orig =
          sym.expr.source ? `\nOriginally defined${Token.at(sym.expr)}` : '';
      const name = token ? Token.nameAt(token) :
          ident + (this._source ? Token.at({source: this._source}) : '');
      throw new Error(`Redefining symbol ${name}${orig}`);
    }
    sym.expr = expr;
  }

  instruction(mnemonic: string, arg?: Arg|string): void;
  instruction(tokens: Token[]): void;
  instruction(...args: [Token[]]|[string, (Arg|string)?]): void {
    let mnemonic: string;
    let arg: Arg;
    if (args.length === 1 && Array.isArray(args[0])) {
      // handle the line...
      const tokens = args[0];
      mnemonic = Token.expectIdentifier(tokens[0]).toLowerCase();
      arg = this.parseArg(tokens, 1);
    } else if (typeof args[1] === 'string') {
      // parse the tokens first
      mnemonic = args[0] as string;
      const tokenizer = new Tokenizer(args[1]);
      arg = this.parseArg(tokenizer.next()!, 0);
    } else {
      [mnemonic, arg] = args as [string, Arg];
      if (!arg) arg = ['imp'];
      mnemonic = mnemonic.toLowerCase();
    }
    if (mnemonic === 'rts') {
      // NOTE: we special-case this in both the tokenizer and here so that
      // `rts:+` and `rts:-` work for pointing to an rts instruction.
      const expr = this.pc();
      this.rtsRefsReverse.push(expr);
      const sym = this.rtsRefsForward.shift();
      if (sym != null) this.symbols[sym].expr = expr;
    }
    // may need to size the arg, depending.
    // cpu will take 'add', 'a,x', and 'a,y' and indicate which it actually is.
    const ops = this.cpu.op(mnemonic); // will throw if mnemonic unknown
    const m = arg[0];
    if (m === 'add' || m === 'a,x' || m === 'a,y') {
      // Special case for address mnemonics
      const expr = arg[1]!;
      const s = expr.meta?.size || 2;
      if (m === 'add' && s === 1 && 'zpg' in ops) {
        return this.opcode(ops.zpg!, 1, expr);
      } else if (m === 'add' && 'abs' in ops) {
        return this.opcode(ops.abs!, 2, expr);
      } else if (m === 'add' && 'rel' in ops) {
        return this.relative(ops.rel!, 1, expr);
      } else if (m === 'a,x' && s === 1 && 'zpx' in ops) {
        return this.opcode(ops.zpx!, 1, expr);
      } else if (m === 'a,x' && 'abx' in ops) {
        return this.opcode(ops.abx!, 2, expr);
      } else if (m === 'a,y' && s === 1 && 'zpy' in ops) {
        return this.opcode(ops.zpy!, 1, expr);
      } else if (m === 'a,y' && 'aby' in ops) {
        return this.opcode(ops.aby!, 2, expr);
      }
      this.fail(`Bad address mode ${m} for ${mnemonic}`);
    }
    // All other mnemonics
    if (m in ops) {
      const argLen = this.cpu.argLen(m);
      if (m === 'rel') return this.relative(ops[m]!, argLen, arg[1]!);
      return this.opcode(ops[m]!, argLen, arg[1]!);
    }
    this.fail(`Bad address mode ${m} for ${mnemonic}`);
  }

  parseArg(tokens: Token[], start: number): Arg {
    // Look for parens/brackets and/or a comma
    if (tokens.length === start) return ['imp'];
    const front = tokens[start];
    const next = tokens[start + 1];
    if (tokens.length === start + 1) {
      if (Token.isRegister(front, 'a')) return ['acc'];
    } else if (Token.eq(front, Token.IMMEDIATE)) {
      return ['imm', this.parseExpr(tokens, start + 1)];
    }
    // Look for relative or anonymous labels, which are not valid on their own
    if (Token.eq(front, Token.COLON) && tokens.length === start + 2 &&
        next.token === 'op' && /^[-+]+$/.test(next.str)) {
      // anonymous label
      return ['add', {op: 'sym', sym: ':' + next.str}];
    } else if (tokens.length === start + 1 && front.token === 'op' &&
               /^[-+]+$/.test(front.str)) {
      // relative label
      return ['add', {op: 'sym', sym: front.str}];
    }
    // it must be an address of some sort - is it indirect?
    if (Token.eq(front, Token.LP) ||
        (this.opts.allowBrackets && Token.eq(front, Token.LB))) {
      const close = Token.findBalanced(tokens, start);
      if (close < 0) this.fail(`Unbalanced ${Token.name(front)}`, front);
      const args = Token.parseArgList(tokens, start + 1, close);
      if (!args.length) this.fail(`Bad argument`, front);
      const expr = this.parseExpr(args[0], 0);
      if (args.length === 1) {
        // either IND or INY
        if (Token.eq(tokens[close + 1], Token.COMMA) &&
            Token.isRegister(tokens[close + 2], 'y')) {
          Token.expectEol(tokens[close + 3]);
          return ['iny', expr];
        }
        Token.expectEol(tokens[close + 1]);
        return ['ind', expr];
      } else if (args.length === 2 && args[1].length === 1) {
        // INX
        if (Token.isRegister(args[1][0], 'x')) return ['inx', expr];
      }
      this.fail(`Bad argument`, front);
    }
    const args = Token.parseArgList(tokens, start);
    if (!args.length) this.fail(`Bad arg`, front);
    const expr = this.parseExpr(args[0], 0);
    if (args.length === 1) return ['add', expr];
    if (args.length === 2 && args[1].length === 1) {
      if (Token.isRegister(args[1][0], 'x')) return ['a,x', expr];
      if (Token.isRegister(args[1][0], 'y')) return ['a,y', expr];
    }
    this.fail(`Bad arg`, front);
  }

  relative(op: number, arglen: number, expr: Expr) {
    // Can arglen ever be 2? (yes - brl on 65816)
    // Basic plan here is that we actually want a relative expr.
    // TODO - clean this up to be more efficient.
    // TODO - handle local/anonymous labels separately?
    // TODO - check the range somehow?
    const num = this.chunk.data.length + arglen + 1;
    const meta: Expr.Meta = {rel: true, chunk: this.chunks.length - 1};
    if (this._chunk?.org) meta.org = this._chunk.org;
    const nextPc = {op: 'num', num, meta};
    const rel: Expr = {op: '-', args: [expr, nextPc]};
    if (expr.source) rel.source = expr.source;
    this.opcode(op, arglen, rel);
  }

  opcode(op: number, arglen: number, expr: Expr) {
    // Emit some bytes.
    if (arglen) expr = this.resolve(expr); // BEFORE opcode (in case of *)
    const {chunk} = this;
    this.markWritten(1 + arglen);
    chunk.data.push(op);
    if (arglen) {
      this.append(expr, arglen);
    }
    if (!chunk.name) chunk.name = `Code`;
    // TODO - for relative, if we're in the same chunk, just compare
    // the offset...
  }

  private markWritten(size: number) {
    if (this._chunk?.org == null) return;
    // NOTE: it's possible the chunk has spilled over into the next segment.
    // We just ignore this by asking for the offset of the _start_ of the
    // chunk, rather than the current position.  This is consistent with how
    // the linker works, but can lead to issues with free'd parts, etc.
    // Fortunately, the risk is relatively small because it's only relevant
    // for statically-placed chunks, and (one would hope) we know what we're
    // doing there.
    const offset = this.orgToOffset(this._chunk.org);
    if (offset != null) {
      this.written.add(offset + this._chunk.data.length,
                       offset + this._chunk.data.length + size);
    }
  }

  append(expr: Expr, size: number) {
    const {chunk} = this;
    // Save the ref, as long as it's actually interesting.
    if (this.opts.refExtractor?.ref && chunk.org != null) {
      const orig = this._exprMap?.get(expr) || expr;
      if (Expr.symbols(orig).length > 0) {
        this.opts.refExtractor.ref(orig, size,
                                      chunk.org + chunk.data.length,
                                      chunk.segments);
      }
    }
    // Append the number or placeholder
    expr = this.resolve(expr);
    let val = expr.num!;
    if (expr.op !== 'num' || expr.meta?.rel) {
      // use a placeholder and add a substitution
      const offset = chunk.data.length;
      (chunk.subs || (chunk.subs = [])).push({offset, size, expr});
      this.writeNumber(chunk.data, size); // write goes after subs
    } else {
      this.writeNumber(chunk.data, size, val);
    }
  }

  ////////////////////////////////////////////////////////////////
  // Directive handlers

  org(addr: number, name?: string) {
    if (this._org != null && this._chunk != null &&
      this._org + this._chunk.data.length === addr) {
      return; // nothing to do?
    }
    this._org = addr;
    this._chunk = undefined;
    this._name = name;
  }

  reloc(name?: string) {
    this._org = undefined;
    this._chunk = undefined;
    this._name = name;
  }

  segment(...segments: Array<string|mod.Segment>) {
    // Usage: .segment "1a", "1b", ...
    this.segments = segments.map(s => typeof s === 'string' ? s : s.name);
    for (const s of segments) {
      if (typeof s === 'object') {
        const data = this.segmentData.get(s.name) || {name: s.name};
        this.segmentData.set(s.name, mod.Segment.merge(data, s));
      }
    }
    this._chunk = undefined;
    this._name = undefined;
  }

  assert(expr: Expr) {
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
    } else {
      const {chunk} = this;
      (chunk.asserts || (chunk.asserts = [])).push(expr);
    }
  }

  byte(...args: Array<Expr|string|number>) {
    const {chunk} = this;
    this.markWritten(args.length);
    for (const arg of args) {
      // TODO - if we ran off the end of the segment, make a new chunk???
      // For now, we're avoiding needing to worry about it because orgToOffset
      // and markWritten are based on the start of the chunk, rather than where
      // it ends; but this is still a potential source of bugs!
      if (typeof arg === 'number') {
        this.writeNumber(chunk.data, 1, arg);
      } else if (typeof arg === 'string') {
        writeString(chunk.data, arg);
      } else {
        this.append(arg, 1);
      }
    }
  }

  res(count: number, value?: number) {
    if (!count) return;
    this.byte(...new Array(count).fill(value ?? 0));
  }

  word(...args: Array<Expr|number>) {
    const {chunk} = this;
    this.markWritten(2 * args.length);
    for (const arg of args) {
      if (typeof arg === 'number') {
        this.writeNumber(chunk.data, 2, arg);
      } else {
        this.append(arg, 2);
      }
    }
  }

  free(size: number) {
    // Must be in .org for a single segment.
    if (this._org == null) this.fail(`.free in .reloc mode`);
    this.markWritten(size);
    const segments = this.segments.length > 1 ? this.segments.filter(s => {
      const data = this.segmentData.get(s);
      if (!data || data.memory == null || data.size == null) return false;
      if (data.memory > this._org!) return false;
      if (data.memory + data.size <= this._org!) return false;
      return true;
    }) : this.segments;
    if (segments.length !== 1) {
      this.fail(`.free with non-unique segment: ${this.segments}`);
    } else if (size < 0) {
      this.fail(`.free with negative size: ${size}`);
    }
    // If we've got an open chunk, end it.
    if (this._chunk) {
      this._org += this._chunk.data.length;
    }
    this._chunk = undefined;
    // Ensure a segment object exists.
    const name = segments[0];
    let s = this.segmentData.get(name);
    if (!s) this.segmentData.set(name, s = {name});
    (s.free || (s.free = [])).push([this._org, this._org + size]);
    // Advance past the free space.
    this._org += size;
  }

  segmentPrefix(prefix: string) {
    // TODO - make more of a todo about changing this?
    this._segmentPrefix = prefix;
  }

  import(...idents: string[]) {
    for (const ident of idents) {
      this.globals.set(ident, 'import');
    }
  }

  export(...idents: string[]) {
    for (const ident of idents) {
      this.globals.set(ident, 'export');
    }
  }

  scope(name?: string) {
    this.enterScope(name, 'scope');
  }

  proc(name: string) {
    this.label(name);
    this.enterScope(name, 'proc');
  }

  enterScope(name: string|undefined, kind: 'scope'|'proc') {
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
    } else {
      this.currentScope.anonymousChildren.push(child);
    }
    this.currentScope = child;
  }

  endScope() { this.exitScope('scope'); }
  endProc() { this.exitScope('proc'); }

  exitScope(kind: 'scope'|'proc') {
    if (this.currentScope.kind !== kind || !this.currentScope.parent) {
      this.fail(`.end${kind} without .${kind}`);
    }
    this.currentScope = this.currentScope.parent;
  }

  pushSeg(...segments: Array<string|mod.Segment>) {
    this.segmentStack.push([this.segments, this._chunk]);
    this.segment(...segments);
  }

  popSeg() {
    if (!this.segmentStack.length) this.fail(`.popseg without .pushseg`);
    [this.segments, this._chunk] = this.segmentStack.pop()!;
    this._org = this._chunk?.org;
  }

  move(size: number, source: Expr) {
    this.append({op: '.move', args: [source], meta: {size}}, size);
  }

  // Utility methods for processing arguments

  parseConst(tokens: Token[], start: number): number {
    const val = this.evaluate(this.parseExpr(tokens, start));
    if (val != null) return val;
    this.fail(`Expression is not constant`, tokens[1]);
  }
  parseNoArgs(tokens: Token[], start: number) {
    Token.expectEol(tokens[1]);
  }
  parseExpr(tokens: Token[], start: number): Expr {
    return Expr.parseOnly(tokens, start);
  }
  // parseStringList(tokens: Token[], start = 1): string[] {
  //   return Token.parseArgList(tokens, 1).map(ts => {
  //     const str = Token.expectString(ts[0]);
  //     Token.expectEol(ts[1], "a single string");
  //     return str;
  //   });
  // }
  parseStr(tokens: Token[], start: number): string {
    const str = Token.expectString(tokens[start]);
    Token.expectEol(tokens[start + 1], "a single string");
    return str;
  }

  parseSegmentList(tokens: Token[], start: number): Array<string|mod.Segment> {
    if (tokens.length < start + 1) {
      this.fail(`Expected a segment list`, tokens[start - 1]);
    }
    return Token.parseArgList(tokens, 1).map(ts => {
      const str = this._segmentPrefix + Token.expectString(ts[0]);
      if (ts.length === 1) return str;
      if (!Token.eq(ts[1], Token.COLON)) {
        this.fail(`Expected comma or colon: ${Token.name(ts[1])}`, ts[1]);
      }
      const seg = {name: str} as mod.Segment;
      // TODO - parse expressions...
      const attrs = Token.parseAttrList(ts, 1); // : ident [...]
      for (const [key, val] of attrs) {
        switch (key) {
          case 'bank': seg.bank = this.parseConst(val, 0); break;
          case 'size': seg.size = this.parseConst(val, 0); break;
          case 'off': seg.offset = this.parseConst(val, 0); break;
          case 'mem': seg.memory = this.parseConst(val, 0); break;
          // TODO - I don't fully understand these...
          // case 'zeropage': seg.addressing = 1;
          default: this.fail(`Unknown segment attr: ${key}`);
        }
      }
      return seg;
    });
  }

  parseResArgs(tokens: Token[]): [number, number?] {
    const data = this.parseDataList(tokens);
    if (data.length > 2) this.fail(`Expected at most 2 args`, data[2]);
    if (!data.length) this.fail(`Expected at least 1 arg`);
    const count = this.evaluate(data[0]);
    if (count == null) this.fail(`Expected constant count`);
    const val = data[1] && this.evaluate(data[1]);
    if (data[1] && val == null) this.fail(`Expected constant value`);
    return [count, val];
  }

  parseDataList(tokens: Token[]): Array<Expr>;
  parseDataList(tokens: Token[], allowString: true): Array<Expr|string>;
  parseDataList(tokens: Token[], allowString = false): Array<Expr|string> {
    if (tokens.length < 2) {
      this.fail(`Expected a data list`, tokens[0]);
    }
    const out: Array<Expr|string> = [];
    for (const term of Token.parseArgList(tokens, 1)) {
      if (allowString && term.length === 1 && term[0].token === 'str') {
        out.push(term[0].str);
      } else if (term.length < 1) {
        this.fail(`Missing term`);
      } else {
        out.push(this.resolve(this.parseExpr(term, 0)));
      }
    }
    return out;
  }

  parseIdentifierList(tokens: Token[]): string[] {
    if (tokens.length < 2) {
      this.fail(`Expected identifier(s)`, tokens[0]);
    }
    const out: string[] = [];
    for (const term of Token.parseArgList(tokens, 1)) {
      if (term.length !== 1 || term[0].token !== 'ident') {
        this.fail(`Expected identifier: ${Token.name(term[0])}`, term[0]);
      }
      out.push(Token.str(term[0]));
    }
    return out;
  }

  parseOptionalIdentifier(tokens: Token[]): string|undefined {
    const tok = tokens[1];
    if (!tok) return undefined;
    const ident = Token.expectIdentifier(tok);
    Token.expectEol(tokens[2]);
    return ident;
  }

  parseRequiredIdentifier(tokens: Token[]): string {
    const ident = Token.expectIdentifier(tokens[1]);
    Token.expectEol(tokens[2]);
    return ident;
  }

  parseMoveArgs(tokens: Token[]): [number, Expr] {
    // .move 10, ident        ; must be an offset
    // .move 10, $1234, "seg" ; maybe support this?
    const args = Token.parseArgList(tokens, 1);
    if (args.length !== 2 /* && args.length !== 3 */) {
      this.fail(`Expected constant number, then identifier`);
    }
    const num = this.evaluate(this.parseExpr(args[0], 0));
    if (num == null) this.fail(`Expected a constant number`);

    // let segName = this.segments.length === 1 ? this.segments[0] : undefined;
    // if (args.length === 3) {
    //   if (args[2].length !== 1 || args[2][0].token !== 'str') {
    //     this.fail(`Expected a single segment name`, this.args[2][0]);
    //   }
    //   segName = args[2][0].str;
    // }
    // const seg = segName ? this.segmentData.get(segName) : undefined;

    const offset = this.resolve(this.parseExpr(args[1], 0));
    if (offset.op === 'num' && offset.meta?.chunk != null) {
      return [num, offset];
    } else {
      this.fail(`Expected a constant offset`, args[1][0]);
    }
  }

  // Diagnostics

  fail(msg: string, at?: {source?: SourceInfo}): never {
    if (!at && this.errorToken) at = this.errorToken;
    if (at?.source) throw new Error(msg + Token.at(at));
    if (!this._source && this._chunk?.name) {
      throw new Error(msg + `\n  in ${this._chunk.name}`);
    }
    throw new Error(msg + Token.at({source: this._source}));
  }

  writeNumber(data: number[], size: number, val?: number) {
    // TODO - if val is a signed/unsigned 32-bit number, it's not clear
    // whether we need to treat it one way or the other...?  but maybe
    // it doesn't matter since we're only looking at 32 bits anyway.
    const s = (size) << 3;
    if (val != null && (val < (-1 << s) || val >= (1 << s))) {
      const name = ['byte', 'word', 'farword', 'dword'][size - 1];
      this.fail(`Not a ${name}: $${val.toString(16)}`);
    }
    for (let i = 0; i < size; i++) {
      data.push(val != null ? val & 0xff : 0xff);
      if (val != null) val >>= 8;
    }
  }

  orgToOffset(org: number): number|undefined {
    const segment = this.segmentData.get(
        this.segments.find(s => {
          const data = this.segmentData.get(s);
          return data && mod.Segment.includesOrg(data, org);
        })!);
    return segment?.offset != null ?
        segment.offset + (org - segment.memory!) : undefined;
  }

  isWritten(offset: number): boolean {
    return this.written.has(offset);
  }
}

function writeString(data: number[], str: string) {
  // TODO - support character maps (pass as third arg?)
  for (let i = 0; i < str.length; i++) {
    data.push(str.charCodeAt(i));
  }
}

type ArgMode =
    'add' | 'a,x' | 'a,y' | // pseudo modes
    'abs' | 'abx' | 'aby' |
    'imm' | 'ind' | 'inx' | 'iny' |
    'rel' | 'zpg' | 'zpx' | 'zpy';

export type Arg = ['acc' | 'imp'] | [ArgMode, Expr];

export namespace Assembler {
  export interface Options {
    allowBrackets?: boolean;
    reentrantScopes?: boolean;
    overwriteMode?: mod.OverwriteMode;
    refExtractor?: RefExtractor;
  }
}

type ParsedSymbol = {type: 'pc'|'none'}|{type: 'anon'|'rel'|'rts', num: number};
function parseSymbol(name: string): ParsedSymbol {
  if (name === '*') return {type: 'pc'};

  if (/^:\++$/.test(name)) return {type: 'anon', num: name.length - 1};
  if (/^:\+\d+$/.test(name)) return {type: 'anon', num: parseInt(name.substring(2))};
  if (/^:-+$/.test(name)) return {type: 'anon', num: 1 - name.length};
  if (/^:-\d+$/.test(name)) return {type: 'anon', num: -parseInt(name.substring(2))};

  if (/^:>*rts$/.test(name)) return {type: 'rts', num: Math.max(name.length - 4, 1)};
  if (/^:<+rts$/.test(name)) return {type: 'rts', num: 4 - name.length};

  if (/^\++$/.test(name)) return {type: 'rel', num: name.length};
  if (/^-+$/.test(name)) return {type: 'rel', num: -name.length};
  return {type: 'none'};
}
