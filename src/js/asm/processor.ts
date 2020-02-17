import {Cpu} from './cpu';
import {Expr} from './expr';
import * as objectFile from './objectfile';
import {Token} from './token';

type Chunk = objectFile.Chunk<number[]>;
type ObjectFile = objectFile.ObjectFile;

class Symbol {
  /**
   * Index into the global symbol array.  Only applies to immutable
   * symbols that need to be accessible at link time.  Mutable symbols
   * and symbols with known values at use time are not added to the
   * global list and are therefore have no id.  Mutability is tracked
   * by storing a -1 here.
   */
  id?: number;
  /**
   * The expression for the symbol.  Must be a statically-evaluatable constant
   * for mutable symbols.  Undefined for forward-referenced symbols.
   */
  expr?: Expr;
  /** Name this symbol is exported as. */
  export?: string;
}

class Scope {
  closed = false;
  readonly global: Scope;
  readonly children = new Map<string, Scope>();
  readonly symbols = new Map<string, Symbol>();

  constructor(readonly symbolArray: Symbol[], readonly parent?: Scope) {
    this.global = parent ? parent.global : this;
  }

  // TODO - plumb the source information through here?
  resolve(name: string, allowForwardRef: true): Symbol;
  resolve(name: string, allowForwardRef?: boolean): Symbol|undefined;
  resolve(name: string, allowForwardRef?: boolean): Symbol|undefined {
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
    let sym = scope.symbols.get(tail);
//console.log('resolve:',name,'sym=',sym,'fwd?',allowForwardRef);
    if (sym) return sym;
    if (scope.closed) throw new Error(`Could not resolve symbol: ${name}`);
    if (!allowForwardRef) return undefined;
    // make a new symbol - but only in an open scope
    //const symbol = {id: this.symbolArray.length};
//console.log('created:',symbol);
    //this.symbolArray.push(symbol);
    const symbol = {};
    scope.symbols.set(tail, symbol);
    return symbol;
  }
}

export class Processor implements Expr.Resolver {

  /** The currently-open segment(s). */
  private segments: readonly string[] = ['code'];

  /** All symbols in this object. */
  private symbols: Symbol[] = [];

  /** The current scope. */
  private scope = new Scope(this.symbols);

  /** All the chunks so far. */
  private chunks: Chunk[] = [];

  /** Currently active chunk */
  private _chunk: Chunk|undefined = undefined;

  /** Origin of the currnet chunk, if fixed. */
  private _org: number|undefined = undefined;

  constructor(readonly cpu: Cpu, readonly opts: Processor.Options = {}) {}

  private get chunk(): Chunk {
    // make chunk only when needed
    this.ensureChunk();
    return this._chunk!;
  }

  private ensureChunk() {
    if (!this._chunk) {
      this._chunk = {segments: this.segments, data: []};
      if (this._org != null) this._chunk.org = this._org;
      this.chunks.push(this._chunk);
    }
  }

  // private get pc(): number|undefined {
  //   if (this._org == null) return undefined;
  //   return this._org + this.offset;
  // }

  resolve(name: string): Expr {
    if (name === '*') {
      const num = this.chunk.data.length; // NOTE: before counting chunks
      return {op: 'off', chunk: this.chunks.length - 1, num};
    }
    const sym = this.scope.resolve(name, true);
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

  result(): ObjectFile {
    const chunks: objectFile.Chunk<Uint8Array>[] = [];
    for (const chunk of this.chunks) {
      chunks.push({...chunk, data: Uint8Array.from(chunk.data)});
    }
    const symbols: objectFile.Symbol[] = [];
    for (const {id, ...symbol} of this.symbols) {
      symbols.push(symbol);
    }
    const segments: objectFile.Segment[] = [];
    return {chunks, symbols, segments};
  }

  directive(directive: string, tokens: Token[]) {
    switch (directive) {
      case '.org': return this.org(this.parseConst(tokens));
      case '.reloc': return this.parseNoArgs(tokens), this.reloc();
      case '.assert': return this.assert(this.parseExpr(tokens));
      case '.segment': return this.segment(...this.parseStringList(tokens));
      case '.byte': return this.byte(...this.parseDataList(tokens, true));
      case '.word': return this.word(...this.parseDataList(tokens));
    }
    throw new Error(`Unknown directive: ${Token.nameAt(tokens[0])}`);
  }

  label(label: string|Token) {
    let ident: string;
    let token: Token|undefined;
    const expr = this.resolve('*');
    if (typeof label === 'string') {
      ident = label;
    } else {
      ident = Token.str(token = label);
      if (label.source) expr.source = label.source;
    }
    // TODO - handle anonymous and cheap local labels...
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

  assign(tokens: Token[]) {
    // Pull the line apart, figure out if it's mutable or not.
    const ident = Token.expectIdentifier(tokens[0]);
    const mut = Token.eq(tokens[1], Token.SET);
    let expr = Expr.parseOnly(tokens.slice(2));
    // Now make the assignment.
    expr = Expr.resolve(expr, this); // NOTE: * _will_ get current chunk!
    this.assignSymbol(ident, mut, expr, tokens[0]);
  }

  assignSymbol(ident: string, mut: boolean, expr: Expr, token?: Token) {
    let sym = this.scope.resolve(ident, !mut);
    if (sym && (mut !== (sym.id! < 0))) {
      const at = token ? Token.at(token) : '';
      throw new Error(`Cannot change mutability of ${ident}${at}`);
    } else if (mut && expr.op != 'num') {
      const at = token ? Token.at(token) : '';
      throw new Error(`Mutable set requires constant${at}`);
    } else if (!sym) {
      if (!mut) throw new Error(`impossible`);
      this.scope.symbols.set(ident, sym = {id: -1});
    } else if (!mut && sym.expr) {
      const orig =
          sym.expr.source ? `\nOriginally defined${Token.at(sym.expr)}` : '';
      const name = token ? Token.nameAt(token) : ident;
      throw new Error(`Redefining symbol ${name}${orig}`);
    }
    sym.expr = expr;
  }

  instruction(mnemonic: string, arg: Arg): void;
  instruction(tokens: Token[]): void;
  instruction(...args: [Token[]]|[string, Arg]): void {
    let mnemonic: string;
    let arg: Arg;
    if (args.length === 1) {
      // handle the line...
      const tokens = args[0];
      mnemonic = Token.expectIdentifier(tokens[0]).toLowerCase();
      arg = this.parseArg(tokens);
    } else {
      [mnemonic, arg] = args;
      mnemonic = mnemonic.toLowerCase();
    }
    // may need to size the arg, depending.
    // cpu will take 'add', 'a,x', and 'a,y' and indicate which it actually is.
    const ops = this.cpu.op(mnemonic); // will throw if mnemonic unknown
    const m = arg[0];
    if (m === 'add' || m === 'a,x' || m === 'a,y') {
      // Special case for address mnemonics
      const expr = arg[1]!;
      const s = expr.size || 2;
      if (m === 'add' && s === 1 && 'zpg' in ops) {
        return this.opcode(ops.zpg!, 1, expr);
      } else if (m === 'add' && 'abs' in ops) {
        return this.opcode(ops.abs!, 2, expr);
      } else if (m === 'add' && 'rel' in ops) {
        const offset = {op: '-', args: [expr, null!]}; // TODO - PC
        // TODO - check range!
        return this.opcode(ops.rel!, 1, offset);
      } else if (m === 'a,x' && s === 1 && 'zpx' in ops) {
        return this.opcode(ops.zpx!, 1, expr);
      } else if (m === 'a,x' && 'abx' in ops) {
        return this.opcode(ops.abx!, 2, expr);
      } else if (m === 'a,y' && s === 1 && 'zpy' in ops) {
        return this.opcode(ops.zpy!, 1, expr);
      } else if (m === 'a,y' && 'aby' in ops) {
        return this.opcode(ops.aby!, 2, expr);
      }
      throw new Error(`Bad address mode ${m} for ${mnemonic}`);
    }
    // All other mnemonics
    if (m in ops) {
      const argLen = this.cpu.argLen(m);
      if (m === 'rel') return this.relative(ops[m]!, argLen, arg[1]!);
      return this.opcode(ops[m]!, argLen, arg[1]!);
    }
    throw new Error(`Bad address mode ${m} for ${mnemonic}`);
  }

  parseArg(tokens: Token[]): Arg {
    // Look for parens/brackets and/or a comma
    if (tokens.length === 1) return ['imp'];
    const front = tokens[1];
    if (tokens.length === 2) {
      if (Token.isRegister(front, 'a')) return ['acc'];
    } else if (Token.eq(front, Token.IMMEDIATE)) {
      return ['imm', Expr.parseOnly(tokens, 2)];
    }
    // it must be an address of some sort - is it indirect?
    if (Token.eq(front, Token.LP) ||
        (this.opts.allowBrackets && Token.eq(front, Token.LB))) {
      const close = Token.findBalanced(tokens, 1);
      if (close < 0) throw new Error(`Unbalanced ${Token.nameAt(front)}`);
      const args = Token.parseArgList(tokens, 2, close);
      if (!args.length) throw new Error(`Bad argument${Token.at(front)}`);
      const expr = Expr.parseOnly(args[0]);
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
      throw new Error(`Bad argument${Token.at(front)}`);
    }
    const args = Token.parseArgList(tokens, 1);
    if (!args.length) throw new Error(`Bad arg${Token.at(front)}`);
    const expr = Expr.parseOnly(args[0]);
    if (args.length === 1) return ['add', expr];
    if (args.length === 2 && args[1].length === 1) {
      if (Token.isRegister(args[1][0], 'x')) return ['a,x', expr];
      if (Token.isRegister(args[1][0], 'y')) return ['a,y', expr];
    }
    throw new Error(`Bad arg${Token.at(front)}`);
  }

  relative(op: number, arglen: number, expr: Expr) {
    // Can arglen ever be 2? (yes - brl on 65816)
    // Basic plan here is that we actually want a relative expr.
    // TODO - clean this up to be more efficient.
    // TODO - handle local/anonymous labels separately?
    const rel: Expr = {op: '-', args: [expr, {op: 'sym', sym: '*'}]};
    if (expr.source) rel.source = expr.source;
    this.opcode(op, arglen, rel);
  }

  opcode(op: number, arglen: number, expr: Expr) {
    // Emit some bytes.
    const {chunk} = this;
    chunk.data.push(op);
    if (arglen) {
      // TODO - for relative, if we're in the same chunk, just compare
      // the offset...
      expr = Expr.resolve(expr, this);
      this.append(expr, arglen);
    }
  }

  append(expr: Expr, size: number) {
    const {chunk} = this;
    let val = expr.num!;
//console.log('expr:', expr, 'val:', val);
    if (expr.op !== 'num') {
      // use a placeholder and add a substitution
      const offset = chunk.data.length;
      (chunk.subs || (chunk.subs = [])).push({offset, size, expr});
      writeNumber(chunk.data, size); // write goes after subs
    } else {
      writeNumber(chunk.data, size, val);
    }
  }

  ////////////////////////////////////////////////////////////////
  // Directive handlers

  org(addr: number) {
    this._org = addr;
    this._chunk = undefined;
  }

  reloc() {
    this._org = undefined;
    this._chunk = undefined;
  }

  segment(...segments: string[]) {
    // Usage: .segment "1a", "1b", ...
    this.segments = segments;
    this._chunk = undefined;
  }

  assert(expr: Expr) {
    expr = Expr.resolve(expr, this);
    const val = Expr.evaluate(expr);
    if (val != null) {
      if (!val) throw new Error(`Assertion failed${Token.at(expr)}`);
    } else {
      const {chunk} = this;
      (chunk.asserts || (chunk.asserts = [])).push(expr);
    }
  }

  byte(...args: Array<Expr|string|number>) {
    const {chunk} = this;
    for (const arg of args) {
      if (typeof arg === 'number') {
        writeNumber(chunk.data, 1, arg);
      } else if (typeof arg === 'string') {
        writeString(chunk.data, arg);
      } else {
        this.append(arg, 1);
      }
    }
  }

  word(...args: Array<Expr|number>) {
    const {chunk} = this;
    for (const arg of args) {
      if (typeof arg === 'number') {
        writeNumber(chunk.data, 2, arg);
      } else {
        this.append(arg, 2);
      }
    }
  }

  // Utility methods for processing arguments

  parseConst(tokens: Token[], start = 1): number {
    const expr = Expr.resolve(Expr.parseOnly(tokens, start), this);
    const val = Expr.evaluate(expr);
    if (val == null) {
      throw new Error(`Expression is not constant: ${Token.at(tokens[1])}`);
    }
    return val;
  }
  parseNoArgs(tokens: Token[], start = 1) {
    Token.expectEol(tokens[1]);
  }
  parseExpr(tokens: Token[], start = 1): Expr {
    return Expr.parseOnly(tokens, start);
  }
  parseStringList(tokens: Token[], start = 1): string[] {
    return Token.parseArgList(tokens, 1).map(ts => {
      const str = Token.expectString(ts[0]);
      Token.expectEol(ts[1], "a single string");
      return str;
    });
  }
  parseDataList(tokens: Token[]): Array<Expr>;
  parseDataList(tokens: Token[], allowString: true): Array<Expr|string>;
  parseDataList(tokens: Token[], allowString = false): Array<Expr|string> {
    const out: Array<Expr|string> = [];
    for (const term of Token.parseArgList(tokens, 1)) {
      if (allowString && term.length === 1 && term[0].token === 'str') {
        out.push(term[0].str);
      } else {
        out.push(Expr.resolve(Expr.parseOnly(term), this));
      }
    }
    return out;
  }
}

function writeNumber(data: number[], size: number, val?: number) {
  if (val != null && (val < 0 || val >= (1 << ((size + 1) << 3)))) {
    const name = ['byte', 'word', 'farword', 'dword'][size - 1];
    throw new Error(`Not a ${name}: $${val.toString(16)}`);
  }
  if (val == null) val = 0xffffffff;
  for (let i = 0; i < size; i++) {
    data.push(val & 0xff);
    val >>>= 8;
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

export namespace Processor {
  export interface Options {
    allowBrackets?: boolean;
  }
}
