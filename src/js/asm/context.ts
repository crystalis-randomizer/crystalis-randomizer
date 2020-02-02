import {Deque} from '../util.js';
import {Token} from './token.js';

interface MacroExpansion {
  // Given: a token list: either .DEFINE ... (EOL) or .MACRO ... (.ENDMACRO),
  // where the parenthesized token is not actually included in the list.
  override(macro: MacroExpansion): MacroExpansion;
  expand(tokens: Deque<Token>, start?: number): boolean;
}

export class Define {
  private constructor(readonly overloads: readonly DefineOverload[]) {}

  override(macro: MacroExpansion): MacroExpansion {
    if (macro instanceof Define) {
      return new Define([...this.overloads, ...macro.overloads]);
    }
    return macro;
  }

  expand(tokens: Deque<Token>, start = 0): boolean {
    for (const overload of this.overloads) {
      if (overload.expand(tokens, start)) return true;
    }
    return false;
  }

  // NOTE: macro[0] is either .define or .macro
  static from(macro: Deque<Token>) {
    if (!Token.eq(Token.DEFINE, macro.get(0)!)) throw new Error(`invalid`);
    // skip the name
    if (macro.get(1)!.token !== 'ident') throw new Error(`invalid`);
    // parse the parameter list, if any
    let parens = Token.eq(Token.LP, macro.get(2)!);
    let pattern: Token[] = [];
    let production: Token[];
    if (parens || Token.eq(Token.LC, macro.get(2)!)) {
      const end = (parens ? findBalancedParen : findBalancedBrace)(macro, 3);
      if (end < 0) {
        fail(macro.get(0)!, `.define macro parameter list never closed`);
      }
      pattern = macro.slice(3, end);
      // TODO - assert that pattern does not contain braces?
      production = macro.slice(end + 1);
    } else {
      // no parameters
      production = macro.slice(2);
    }
    return new Define([new DefineOverload(parens, pattern, production)]);
  }
}

class DefineOverload {
  constructor(readonly parens: boolean,
              readonly pattern: Token[],
              readonly production: Token[]) {}

  // TODO - consider providing a more useful error message?
  //      - may need to aggregate a bit?
  expand(tokens: Deque<Token>, start = 0): boolean {
    const enclosed = this.parens && Token.eq(Token.LP, tokens.get(start)!);
    let end = tokens.length;
    let splice = end;

    if (enclosed) {
      end = findBalancedParen(tokens, start + 1);
      if (end < 0) return false; // fail?
      splice = end + 1;
    } else if (!this.pattern.length) {
      splice = start;
    }

    // Start parsing parameters.
    const params = new Map<string, Token[]>();
    let j = 0;
    let i = start;
    while (j < this.pattern.length && i < end) {
      const pat = this.pattern[j++];
      const cur = tokens.get(i++)!;
      if (pat.token !== 'ident') {
        if (!Token.eq(pat, cur)) return false;
        i++;
        continue;
      }
      if (j === this.pattern.length) {
        params.set(pat.str, tokens.slice(i - 1, end));
        break;
      }
      const next = this.pattern[j];
      if (next.token === 'ident') {
        // undelimited parameter
        if (Token.eq(Token.LC, cur)) { // enclosed in braces
          const close = findBalancedBrace(tokens, i + 1);
          if (close < 0) return false; // fail?
          params.set(pat.str, tokens.slice(i + 1, close));
          i = close + 1;
        } else { // not enclosed
          params.set(pat.str, [tokens.get(i++)!]);
        }
      } else {
        // delimited parameter
        let delim = i;
        if (this.parens && Token.eq(Token.COMMA, next) &&
            Token.eq(Token.LC, tokens.get(i)!)) {
          // special case: paren macro w/ comma delimiter -> allow braces
          delim = findBalancedBrace(tokens, i);
          params.set(pat.str, tokens.slice(i + 1, delim));
          i = delim + 1; // should point to comma
          continue;
        }
        while (delim < end && !Token.eq(tokens.get(delim)!, next)) {
          delim++
        }
        if (delim >= end) return false; // never found
        params.set(pat.str, tokens.slice(i, delim));
        i = delim;
      }
    }
    // special case: paren macro w/ missing comma delimited params
    //  -> save blank
    while (this.parens && j < this.pattern.length) {
      const pat = this.pattern[j++];
      if (Token.eq(Token.COMMA, pat)) continue;
      if (pat.token !== 'ident') return false; // bad delimiter
      params.set(pat.str, []);
    }
    if (j < this.pattern.length) return false; // eol looking for pattern

    // Parameters parsed.  Now sub in the token stream.
    const out: Token[] = [];
    for (const tok of this.production) {
      if (tok.token === 'ident') {
        const param = params.get(tok.str);
        if (param) {
          // this is actually a parameter
          out.push(...param); // TODO - copy w/ child sourceinfo?
          continue;
        }
      }
      out.push(tok);
    }

    // Now replace
    tokens.splice(start, splice - start, ...out);
    return true;
  }
}

// Given that `i` is an index into list pointing to an open brace
// returns the index of the corresponding close brace, or -1.
// Ignores all other delimiters.
function findBalancedBrace(list: Deque<Token>, i: number): number {
  let count = 1;
  while (++i < list.length) {
    switch (list.get(i)!.token) {
      case 'lb':
        count++;
        break;
      case 'rb':
        if (--count === 0) return i;
        break;
      default:
        // do nothing
    }
  }
  return -1;
}

// Same as findBalancedBrace except parens are considered subordinate
// to braces, so any braces will immediately stop counting parens.
function findBalancedParen(list: Deque<Token>, i: number): number {
  let count = 1;
  while (++i < list.length) {
    switch (list.get(i)!.token) {
      case 'lb':
        i = findBalancedBrace(list, i);
        if (i < 0) return -1;
        break;
      case 'rb': return -1;
      case 'lp':
        count++;
        break;
      case 'rp':
        if (--count === 0) return i;
        break;
      default:
        // do nothing
    }
  }
  return -1;
}

export class Context {
  readonly macros = new Map<string, MacroExpansion>();
  // NOTE: there is no scope here... - not for macros
  //  - only symbols have scope
  // TODO - evaluate constants...

  constructor(readonly parent?: Context) {}

  defined(name: string): boolean {
    return this.macros.has(name) ||
        this.parent && this.parent.defined(name) ||
        false;
  }

  define(name: string, mac: MacroExpansion) {
    const cur = this.macros.get(name);
    if (cur) mac = cur.override(mac);
    this.macros.set(name, mac);
  }

  undefine(name: string) {
    this.macros.delete(name);
  }

  // Expands a single line of tokens from the front of toks.
  // .define macros are expanded inline, but .macro style macros
  // are left as-is.  Don't expand defines in certain circumstances,
  // such as when trying to override.
  line(toks: Deque<Token>): Token[] {
    const out: Token[] = [];
    return out;

  }

  expand(name: string, toks: Token[]) {
    
  }
}

// ca65 behavior
//  - expand macros in arguments before sending them into outer macro
//  - don't expand macros in production
//  - nested braces go away because expansion happens while looking for closing brace
//  - when scanning for arguments, comma terminates, so
//     AA(a1, a2) -> a1, a2, a1, a2
//     AA 1, 2, 3 ---> 1, 2, 1, 2, 3
//    but
//     AA {1, 2}, 3  doesn't seem to expand to  1, 2, 3, 1, 2, 3  ???
//  - space before paren in defn doesn't change anything


function fail(t: Token, msg: string): never {
  let s = t.source;
  if (s) msg += `\n  at ${s.file}:${s.line}:${s.column}: ${s.content}`;
  while (s?.parent) {
    s = s.parent;
    msg += `\n  included from ${s.file}:${s.line}:${s.column}: ${s.content}`;
  }
  throw new Error(msg);
}
