import {Deque} from '../util.js';
import {Scanner} from './scanner.js';
import {Token} from './token.js';

const MAX_STACK_DEPTH = 100;

export interface Line {
  labels: string[];
  tokens: Token[];
}

export interface MacroExpansion {
  // Given: a token list: either .DEFINE ... (EOL) or .MACRO ... (.ENDMACRO),
  // where the parenthesized token is not actually included in the list.
  override(macro: MacroExpansion): MacroExpansion;
  // Return true if expansion succeeds.  Throw if not???
  expand(tokens: Deque<Token>, start?: number): boolean;
  // Whether the macro expands immediately, or only after a line is assembled.
  expandsEarly: boolean;
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
  private line(toks: Deque<Token>): Deque<Token> {
    // find the next end of line
    const line = new Deque<Token>();
    let curlies = 0;
    while (toks.length) {
      const tok = toks.shift();
      if (Token.eq(Token.EOL, tok)) break;
      if (Token.eq(Token.LC, tok)) {
        curlies++;
      } else if (Token.eq(Token.RC, tok)) {
        if (--curlies < 0) throw new Eror(`unbalanced curly`);
      }
      line.push(tok);
    }
    if (curlies) throw new Error(`unbalanced curly`);
    // now do the early expansions
    for (let i = 0; i < line.length; i++) {
      const tok = line.get(i)!;
      if (Token.eq(Token.SKIP, tok)) {
        const next = line.get(i + 1);
        const count = next?.token === 'num' ? next.num : 1;
        i += count;
        continue;
      }
      if (tok.token === 'ident') {
        const macro = this.macros.get(tok.str);
        if (macro?.expandsEarly) {
          if (!macro.expand(line, i)) fail(tok, `Could not expand ${tok.str}`);
          i = -1; // start back at the beginning
          continue;
        }
      }
    }
    return line;
  }

  * lines(rest: Deque<Token>, depth = 0): Generator<Line> {
    if (depth > MAX_STACK_DEPTH) throw new Error(`max recursion depth`);
    while (rest.length) {
      // lines should have no define-macros in it at this point
      let labels = [];
      let line = this.line(rest);
      while (line.length) {
        // look for labels, but could be a mnemonic or macro
        const front = line.front()!;
        if (front.token === 'ident') {
          if (Token.eq(Token.COLON, line.get(1))) {
            // it's a label
            labels.push(front.str);
            line.splice(0, 2);
            continue;
          }
          // check for a macro
          const macro = this.macros.get(front.str);
          if (macro) {
            if (macro.expandsEarly) throw new Error(`early macro late`);
            if (!macro.expand(line)) throw new Error(`bad expansion`);
            // by recursing rather than unshifting we can support .exitmacro?
            yield * this.lines(line, depth + 1);
            break;
          }
          // it's a regular mnemonic
          yield {labels, tokens: [...line]};
          break;
        } else if (Token.eq(Token.COLON, front)) { // special label
          labels.push(':');
          line.shift();
          continue;
        } else if (front.token === 'op') {
          // other special labels
          if (/^(\++|-+)$/.test(front.str)) {
            labels.push(front.str);
            line.shift();
            if (Token.eq(Token.COLON, line.front())) line.shift();
            continue;
          }
          // otherwise... syntax error? any other operator allowed?
          throw new Error(`Syntax error: unexpected ${Token.nameAt(front)}`);
        } else if (front.token === 'cs') {
          switch (front.str) {
            case '.exitmacro':
              line = new Deque(); // no more expansion
              break;
            case '.ifdef':
              // TODO - call helper method? but how? closure?
              
              break;
            case '.define':
              break;
            case '.macro':
              break;
          }
        }
      }
      
    }
  }

  expand(name: string, toks: Token[]) {
    
  }
}

function fail(t: Token, msg: string): never {
  const s = t.source;
  if (s) {
    msg += `\n  at ${s.file}:${s.line}:${s.column}: ${s.content}`;
    // TODO - expanded from?
  }
  throw new Error(msg);
}
