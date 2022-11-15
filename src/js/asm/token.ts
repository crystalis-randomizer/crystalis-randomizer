import {assertNever} from '../util';

export interface TokenSource {
  next(): Token[]|undefined;
}

export namespace TokenSource {
  export interface Async {
    nextAsync(): Promise<Token[]|undefined>;
  }

  // TODO - consider moving into a namespace?
  export abstract class Abstract implements TokenSource {
    // TODO - move pump() into here, refactor Preprocessor as a TokenSource
    // TODO - rename Processor into Assembler, fix up the clunky methods
    //      - add line(Token[]), tokens(TokenSource) and asyncTokens(ATS)
    //        the latter returns Promise<void> and must be awaited.
    // Delegate the 
    private sink: Iterator<Token[]|undefined>|undefined;

    abstract pump(): Generator<Token[]|undefined>;

    next(): Token[]|undefined {
      while (true) {
        if (!this.sink) this.sink = this.pump();
        const {value, done} = this.sink.next();
        if (!done) return value;
        this.sink = undefined;
      }
    }
  }

  export function concat(...sources: TokenSource[]): TokenSource {
    let source: TokenSource|undefined;
    return {
      next: (): Token[]|undefined => {
        while (true) {
          if (!source) source = sources.shift();
          if (!source) return undefined;
          const line = source.next();
          if (line) return line;
          source = undefined;
        }
      },
    };
  }
}

export interface SourceInfo {
  file: string;
  line: number;
  column: number;
  parent?: SourceInfo; // macro-expansion stack...
}

export type GroupTok = 'grp';
export type StringTok = 'ident' | 'op' | 'cs' | 'str';
export type NumberTok = 'num';
export type NullTok = 'lb' | 'lc' | 'lp' | 'rb' | 'rc' | 'rp' | 'eol' | 'eof';

// NOTE: This is not tokenized initially, but is added *very* early for
// curly-brace groups since basically everything wants to skip over them
// in a single go.  We don't treat any other grouping operators as strongly.
export interface GroupToken {
  token: GroupTok;
  inner: Token[];
  source?: SourceInfo;
}
export interface StringToken {
  token: StringTok;
  str: string;
  source?: SourceInfo;
}
export interface NumberToken {
  token: NumberTok;
  num: number;
  source?: SourceInfo;
  width?: number; // number of bytes in literal
}
export interface NullaryToken {
  token: NullTok;
  source?: SourceInfo;
}

export type Token = GroupToken | StringToken | NumberToken | NullaryToken;

export namespace Token {
  // Grouping tokens
  export const LB: Token = {token: 'lb'};
  export const LC: Token = {token: 'lc'};
  export const LP: Token = {token: 'lp'};
  export const RB: Token = {token: 'rb'};
  export const RC: Token = {token: 'rc'};
  export const RP: Token = {token: 'rp'};
  export const EOL: Token = {token: 'eol'};
  export const EOF: Token = {token: 'eof'};
  // Important macro expansion tokens
  export const DEFINE: Token = {token: 'cs', str: '.define'};
  export const DOT_EOL: Token = {token: 'cs', str: '.eol'};
  export const ELSE: Token = {token: 'cs', str: '.else'};
  export const ELSEIF: Token = {token: 'cs', str: '.elseif'};
  export const ENDIF: Token = {token: 'cs', str: '.endif'};
  export const ENDMAC: Token = {token: 'cs', str: '.endmac'};
  export const ENDMACRO: Token = {token: 'cs', str: '.endmacro'};
  export const ENDREP: Token = {token: 'cs', str: '.endrep'};
  export const ENDREPEAT: Token = {token: 'cs', str: '.endrepeat'};
  export const ENDPROC: Token = {token: 'cs', str: '.endproc'};
  export const ENDSCOPE: Token = {token: 'cs', str: '.endscope'};
  export const LOCAL: Token = {token: 'cs', str: '.local'};
  export const MACRO: Token = {token: 'cs', str: '.macro'};
  export const REPEAT: Token = {token: 'cs', str: '.repeat'};
  export const SET: Token = {token: 'cs', str: '.set'};
  export const SKIP: Token = {token: 'cs', str: '.skip'};

  // Tokens we match
  export const BYTE: Token = {token: 'cs', str: '.byte'};
  export const WORD: Token = {token: 'cs', str: '.word'};

  // Important operator tokens
  export const COLON: Token = {token: 'op', str: ':'};
  //export const DCOLON: Token = {token: 'op', str: '::'};
  export const COMMA: Token = {token: 'op', str: ','};
  export const STAR: Token = {token: 'op', str: '*'};
  export const IMMEDIATE: Token = {token: 'op', str: '#'};
  export const ASSIGN: Token = {token: 'op', str: '='};

  export function match(left: Token, right: Token): boolean {
    if (left.token !== right.token) return false;
    if (left.token === 'num' || left.token === 'str') return true;
    if ((left as StringToken).str !== (right as StringToken).str) return false;
    // NOTE: don't compare num because 'num' already early-returned.
    return true;
  }

  export function eq(left: Token|undefined, right: Token|undefined): boolean {
    if (!left || !right) return false;
    if (left.token !== right.token) return false;
    if (left.token === 'grp') return false; // don't check groups.
    if ((left as StringToken).str !== (right as StringToken).str) return false;
    if ((left as NumberToken).num !== (right as NumberToken).num) return false;
    return true;
  }

  export function name(arg: Token): string {
    switch (arg.token) {
      case 'num': return `NUM[$${arg.num.toString(16)}]`;
      case 'str': return `STR[$${arg.str}]`;
      case 'lb': return `[`;
      case 'rb': return `]`;
      case 'grp': return `{`;
      case 'lc': return `{`;
      case 'rc': return `}`;
      case 'lp': return `(`;
      case 'rp': return `)`;
      case 'eol': return `EOL`;
      case 'eof': return `EOF`;
      case 'ident':
        return arg.str;
      case 'cs':
      case 'op':
        return `${arg.str.toUpperCase()}`;
      default:
        assertNever(arg);
    }
  }

  export function at(arg: {source?: SourceInfo}): string {
    const s = arg.source;
    if (!s) return '';
    const parent = s.parent ? at({source: s.parent}) : '';
    return `\n  at ${s.file}:${s.line}:${s.column}${parent}`;
    // TODO - definition vs usage?
  }

  export function nameAt(arg: {source?: SourceInfo}|undefined): string {
    if (!arg) return 'at unknown';
    const token = arg as Token;
    return (token.token ? name(token) : '') + at(arg);
  }

  export function expectEol(token: Token|undefined, name = 'end of line') {
    if (token) throw new Error(`Expected ${name}: ${Token.nameAt(token)}`);
  }

  export function expect(want: Token, token: Token, prev?: Token) {
    if (!token) {
      if (!prev) throw new Error(`Expected ${name(want)}`);
      throw new Error(`Expected ${name(want)} after ${nameAt(token)}`);
    }
    if (!eq(want, token)) {
      throw new Error(`Expected ${name(want)}: ${nameAt(token)}`);
    }
  }

  export function expectIdentifier(token: Token|undefined,
                                   prev?: Token): string {
    return expectStringToken('ident', 'identifier', token, prev);
  }

  export function expectString(token: Token|undefined, prev?: Token): string {
    return expectStringToken('str', 'constant string', token, prev);
  }

  function expectStringToken(want: StringTok,
                             name: string,
                             token: Token|undefined,
                             prev?: Token): string {
    if (!token) {
      if (!prev) throw new Error(`Expected ${name}`);
      throw new Error(`Expected ${name} after ${nameAt(prev)}`);
    }
    if (token.token !== want) {
      throw new Error(`Expected ${name}: ${nameAt(token)}`);
    }
    return token.str;
  }
    
  // export function fail(token: Token, msg: string): never {
  //   if 
  //   throw new Error(msg + 

  // }

  /**
   * Given a comma-separated list of identifiers, return the
   * identifiers as a list of strings.  Throws an error if
   * the input is not actually a comma-separated list.
   */
  export function identsFromCList(list: Token[]): string[] {
    if (!list.length) return [];
    const out: string[] = [];
    for (let i = 0; i <= list.length; i += 2) {
      const ident = list[i];
      if (ident?.token !== 'ident') {
        if (ident) throw new Error(`Expected identifier: ${nameAt(ident)}`);
        const last = list[list.length - 1];
        throw new Error(`Expected identifier after ${nameAt(last)}`);
      } else if (i + 1 < list.length && !eq(list[i + 1], COMMA)) {
        const sep = list[i + 1];
        throw new Error(`Expected comma: ${nameAt(sep)}`);
      }
      out.push(ident.str);
    }
    return out;
  }

  /** Finds a balanced paren/bracket: returns its index, or -1. */
  export function findBalanced(tokens: Token[], i: number): number {
    const open = tokens[i++].token;
    if (open !== 'lp' && open !== 'lb') throw new Error(`non-grouping token`);
    const close = open === 'lp' ? 'rp' : 'rb';
    let depth = 1;
    for (; i < tokens.length; i++) {
      const tok = tokens[i].token;
      depth += Number(tok === open) - Number(tok === close);
      if (!depth) return i;
    }
    return -1;
  }

  /**
   * Splits on commas not enclosed in balanced parens.  Braces are
   * ignored/not allowed at this point.  This is intended for arithmetic.
   */
  export function parseArgList(tokens: Token[],
                               start = 0, end = tokens.length): Token[][] {
    let arg: Token[] = [];
    const args = [arg];
    let parens = 0;
    for (let i = start; i < end; i++) {
      const token = tokens[i];
      if (!parens && eq(token, COMMA)) {
        args.push(arg = []);
      } else {
        arg.push(token);
        if (eq(token, LP)) parens++;
        if (eq(token, RP)) {
          if (--parens < 0) throw new Error(`Unbalanced paren${at(token)}`);
        }
      }
    }
    return args;
  }

  export function parseAttrList(tokens: Token[],
                                start: number): Map<string, Token[]> {
    // Expect a colon...
    // TODO - allow colon inside balanced parens? allow a single group?
    //   .segment "foo" :bar {foo:bar} :baz
    const out = new Map<string, Token[]>();
    let key: string|undefined;
    let val: Token[] = [];
    if (start >= tokens.length) return out;
    if (!eq(tokens[start], COLON)) {
      throw new Error(`Unexpected: ${nameAt(tokens[start])}`);
    }
    for (let i = start + 1; i < tokens.length; i++) {
      const tok = tokens[i];
      if (eq(tok, COLON)) {
        if (key == null) throw new Error(`Missing key${at(tok)}`);
        out.set(key, val);
        key = undefined;
        val = [];
      } else if (key == null) {
        key = expectIdentifier(tok);
      } else {
        val.push(tok);
      }
    }
    if (key != null) {
      out.set(key, val);
    } else {
      expectIdentifier(undefined, tokens[tokens.length - 1]);
    }
    return out;
  }

  /** Finds a comma or EOL. */
  export function findComma(tokens: Token[], start: number): number {
    const index = find(tokens, COMMA, start);
    return index < 0 ? tokens.length : index;
  }

  /** Finds a token, or -1 if not found. */
  export function find(tokens: Token[], want: Token, start: number): number {
    for (let i = start; i < tokens.length; i++) {
      if (eq(tokens[i], want)) return i;
    }
    return -1;
  }

  export function count(ts: Token[]): number {
    let total = 0;
    for (const t of ts) {
      if (t.token === 'grp') {
        total += 2 + count(t.inner);
      } else {
        total++;
      }
    }
    return total;
  }

  export function isRegister(t: Token, reg: 'a'|'x'|'y'): boolean {
    return t.token === 'ident' && t.str.toLowerCase() === reg;
  }

  export function str(t: Token) {
    switch (t.token) {
      case 'cs':
      case 'ident':
      case 'str':
      case 'op':
        return t.str;
    }
    throw new Error(`Non-string token: ${Token.nameAt(t)}`);
  }

  export function strip(t: Token): Token {
    delete t.source;
    return t;
  }
}

// interface Expr {
//   // operator, function name, '()', '{}', 'num', 'str', 'ident'
//   op: string;
//   // one arg for a unary, two for binary, or N for comma or function
//   args: Expr[];
//   // if op === 'num'
//   num: number;
//   // if op === 'str' or 'ident'
//   str: string;
// }

export const TOKENFUNCS = new Set([
  '.blank',
  '.const',
  '.defined', // .def ?
  '.left',
  '.match',
  '.mid',
  '.right',
  '.tcount',
  '.xmatch',
]);

export const DIRECTIVES = [
  '.define',
  '.else',
  '.elseif',
  '.endif',
  '.endmacro',
  '.endproc',
  '.endscope',
  '.ident',
  '.if',
  '.ifblank',
  '.ifdef',
  '.ifnblank',
  '.ifndef',
  '.ifnref',
  '.ifref',
  '.include',
  '.local',
  '.macro',
  '.proc',
  '.scope',
  '.skip',
] as const;
