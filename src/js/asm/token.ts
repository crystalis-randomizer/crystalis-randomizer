import {assertNever} from "../util";

export interface SourceInfo {
  file: string;
  line: number;
  column: number;
  parent?: SourceInfo; // macro-expansion stack...
}

export type StringTok = 'ident' | 'op' | 'cs' | 'str';
export type NumberTok = 'num';
export type NullaryTok = 'lb' | 'lc' | 'lp' | 'rb' | 'rc' | 'rp' | 'eol' | 'eof';

export interface StringToken {
  token: StringTok;
  str: string;
  source?: SourceInfo;
}
export interface NumberToken {
  token: NumberTok;
  num: number;
  source?: SourceInfo;
}
export interface NullaryToken {
  token: NullaryTok;
  source?: SourceInfo;
}

export type Token = StringToken | NumberToken | NullaryToken;  

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
  export const MACRO: Token = {token: 'cs', str: '.macro'};
  export const ENDMACRO: Token = {token: 'cs', str: '.endmacro'};
  export const ENDSCOPE: Token = {token: 'cs', str: '.endscope'};
  export const ENDPROC: Token = {token: 'cs', str: '.endproc'};
  export const ENDIF: Token = {token: 'cs', str: '.endif'};
  export const ELSE: Token = {token: 'cs', str: '.else'};
  export const ELSEIF: Token = {token: 'cs', str: '.elseif'};
  export const LOCAL: Token = {token: 'cs', str: '.local'};
  export const SKIP: Token = {token: 'cs', str: '.skip'};
  // Important operator tokens
  export const COLON: Token = {token: 'op', str: ':'};
  export const DCOLON: Token = {token: 'op', str: '::'};
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

  export function at(arg: Token): string {
    const s = arg.source;
    return s ? `\n  at ${s.file}:${s.line}:${s.column}` : '';
    // TODO - definition vs usage?
  }

  export function nameAt(arg: Token): string {
    return name(arg) + at(arg);
  }

  export function expectIdentifier(token: Token|undefined, prev?: Token) {
    if (!token) {
      if (!prev) throw new Error(`Expected identifier`);
      throw new Error(`Expected identifier after ${nameAt(prev)}`);
    }
    if (token.token !== 'ident') {
      throw new Error(`Expected identifier: ${nameAt(token)}`);
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

  function parseExprAtom(tokens: Token[],
                         index: number): [Expr, number]|undefined {
    const next = tokens[index];
    if (!next) return undefined;
    if (next.token === 'lp' || next.token === 'lb') {
      // find a balanced RP
      let i = index;
      let paren = 1;
      let brace = 0;
      const close = eq(next, LP) ? RP : RB;
      while (++i < tokens.length && paren) {
        const tok = tokens[i];
        if (!brace && eq(tok, close)) paren--;
        if (!brace && eq(tok, next)) paren++;
        if (eq(tok, LC)) brace++;
        if (eq(tok, RC)) brace--;
      }
      if (paren) throw new Error(`No balanced close paren ${nameAt(next)}`);
      return [{expr: next.token, tokens: tokens.slice(index + 1, i - 1)}, i];
    } else if (eq(next, LC)) {
      // find a balanced RC
      let i = index;
      let brace = 0;
      while (++i < tokens.length && brace) {
        const tok = tokens[i];
        if (eq(tok, LC)) brace++;
        if (eq(tok, RC)) brace--;
      }
      if (brace) throw new Error(`No balanced close curly ${nameAt(next)}`);
      return [{op: 'lc', tokens: tokens.slice(index + 1, i - 1)}, i];
    } else if (next.token === 'num' || next.token === 'str' ||
               next.token === 'ident' || eq(next, STAR)) {
      return [{op: 'lit', token: next}, index + 1];
    }
    console.error(`No atom: ${name(next)}`);
    return undefined;
  }

  // returns the expr and a number
  export function parseExpr(tokens: Token[],
                            index: number,
                            context?: OperatorMeta): [Expr, number]|undefined {
    const next = tokens[index];
    if (!next) return undefined;
    let left: Expr | undefined;
    if (next.token === 'op' || next.token === 'cs') {
      const prefixop = PREFIXOPS.get(next.str);
      if (prefixop) {
        // prefix op is always faster than whatever is before it, even
        // if it's a lower number: e.g. '2 - .not 2 - 2' will evaluate
        // as '2 - .not(2 - 2) => 2 - 1 => 1' rather than '2 - 0 - 2'.
        const inner = parseExpr(tokens, index + 1, prefixop);
        if (!inner) return undefined; // anything else to do?  throw?
        [left, index] = inner;
      } else if (next.token === 'cs' && eq(tokens[index + 1], LP)) {
        // function directive?
        const [inner, nextIndex] = parseExprAtom(tokens, index + 1)!;
        // split based on commas?
        if (inner.expr !== 'lp') throw new Error(`impossible`);
        inner.tokens
        
      }
    }
    if (!left)

}
    
    
  }



}

interface GroupExpr {
  expr: 'lb' | 'lc' | 'lp';
  tokens: Token[];
}
interface LitExpr {
  expr: 'lit';
  token: Token;
}
interface UnaryExpr {
  expr: 'unary';
  op: string;
  arg: Expr;
}
interface InfixExpr {
  expr: 'infix';
  op: string;
  left: Expr;
  right: Expr;
}
interface CommaExpr {
  expr: 'comma';
  terms: Expr;
}
type Expr = GroupExpr | LitExpr | UnaryExpr | InfixExpr | CommaExpr;

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

type OperatorMeta = readonly [number, number]; // precedence, associativity
export const BINOPS = new Map<string, OperatorMeta>([
  // Multiplicative operators: note that bitwise and arithmetic cannot associate
  ['*', [5, 4]],
  ['/', [5, 4]],
  ['.mod', [5, 3]],
  ['&', [5, 2]],
  ['.bitand', [5, 2]],
  ['^', [5, 1]],
  ['.bitxor', [5, 1]],
  ['<<', [5, 0]],
  ['.shl', [5, 0]],
  ['>>', [5, 0]],
  ['.shr', [5, 0]],
  // Arithmetic operators: note that bitwise and arithmetic cannot associate
  ['+', [4, 2]],
  ['-', [4, 2]],
  ['|', [4, 1]],
  ['.bitor', [5, 1]],
  // Comparison operators
  ['<', [3, 0]],
  ['<=', [3, 0]],
  ['>', [3, 0]],
  ['>=', [3, 0]],
  ['=', [3, 0]],
  ['<>', [3, 0]],
  // Logical operators: different kinds cannot associate
  ['&&', [2, 3]],
  ['.and', [2, 3]],
  ['.xor', [2, 2]],
  ['||', [2, 1]],
  ['.or', [2, 1]],
  // Comma
  [',', [1, 1]],
]);

const PREFIXOPS = new Map<string, OperatorMeta>([
  ['+', [6, -1]],
  ['-', [6, -1]],
  ['~', [6, -1]],
  ['.bitnot', [6, -1]],
  ['<', [6, -1]],
  ['.lobyte', [6, -1]],
  ['>', [6, -1]],
  ['.hibyte', [6, -1]],
  ['^', [6, -1]],
  ['.bankbyte', [6, -1]],
  ['!', [2, -1]],
  ['.not', [2, -1]],
]);
