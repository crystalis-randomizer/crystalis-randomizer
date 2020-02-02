import {assertNever} from "../util";

export interface SourceInfo {
  file: string;
  line: number;
  column: number;
  content: string;
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

  export function eq(left: Token, right: Token): boolean {
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
      case 'cs':
      case 'op':
        return `${arg.str.toUpperCase()}`;
      default:
        assertNever(arg);
    }
  }
}
