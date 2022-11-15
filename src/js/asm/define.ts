import {Token} from './token';

const DEBUG = false;

export class Define {
  private constructor(private readonly overloads: DefineOverload[]) {}

  // override(macro: MacroExpansion): MacroExpansion {
  //   if (macro instanceof Define) {
  //     return new Define([...this.overloads, ...macro.overloads]);
  //   }
  //   return macro;
  // }

  canOverload(): boolean {
    return this.overloads[this.overloads.length - 1].canOverload();
  }

  append(define: Define) {
    if (!this.canOverload()) {
      const prevDef = this.overloads[this.overloads.length - 1].definition;
      const at = prevDef ? Token.at(prevDef) : '';
      const prev = at.replace(/at/, 'previously defined at');
      const nextDef = define.overloads[0].definition;
      const next = nextDef ? Token.nameAt(nextDef) : '';
      throw new Error(`Non-overloadable: ${next}${prev}`);
    }
    this.overloads.push(...define.overloads);
  }

  /**
   * Expands in place, possibly in the middle of a line!  Returns true
   * if successful.  Otherwise return false and do nothing.
   */
  expand(tokens: Token[], start: number): Token[][]|undefined {
    const reasons = [];
    for (const overload of this.overloads) {
      const result = overload.expand(tokens, start);
      if (Array.isArray(result)) return result;
      reasons.push(result);
    }
    if (DEBUG) console.error(reasons.join('\n'));
    return undefined;
  }

  // NOTE: macro[0] is .define
  static from(macro: Token[]) {
    if (!Token.eq(macro[0], Token.DEFINE)) throw new Error(`invalid`);
    if (macro[1]?.token !== 'ident') throw new Error(`invalid`);
    // parse the parameter list, if any
    const paramStart = macro[2];
    let overload: DefineOverload;
    if (!paramStart) {
      // blank macro
      overload = new TexStyleDefine([], [], macro[1]);
    } else if (paramStart.token === 'grp') {
      // TeX-style param list
      overload = new TexStyleDefine(paramStart.inner, macro.slice(3), macro[1]);
    } else if (paramStart.token === 'lp') {
      // C-style param list
      const paramEnd = Token.findBalanced(macro, 2);
      if (paramEnd < 0) {
        throw new Error(`Expected close paren ${Token.nameAt(macro[2])}`);
      }
      overload =
          new CStyleDefine(Token.identsFromCList(macro.slice(3, paramEnd)),
                           macro.slice(paramEnd + 1), macro[1]);
    } else {
      // no param list
      overload = new TexStyleDefine([], macro.slice(2), macro[1]);
    }
    return new Define([overload]);
  }
}

interface DefineOverload {
  readonly definition?: Token;
  expand(tokens: Token[], start: number): string|Token[][];
  canOverload(): boolean;
}

function produce(tokens: Token[],
                 start: number,
                 end: number,
                 replacements: Map<string, Token[]>,
                 production: Token[]): string|Token[][] {
  const splice: Token[] = [];
  let overflow: Token[][] = [];
  let line = splice;
  for (const tok of production) {
    if (tok.token === 'ident') {
      const param = replacements.get(tok.str);
      if (param) {
        // this is actually a parameter
        line.push(...param); // TODO - copy w/ child sourceinfo?
        continue;
      }
    } else if (Token.eq(tok, Token.DOT_EOL)) {
      overflow.push(line = []);
      continue;
    }
    const source =
        tok.source && tokens[0].source ?
            {...tok.source, parent: tokens[0].source} :
            tok.source || tokens[0].source;
    line.push(source ? {...tok, source} : tok);
  }
  overflow = overflow.filter(l => l.length);
  if (overflow.length && end < tokens.length) {
    return 'cannot expand .eol without consuming to end of line';
  }
  tokens.splice(start, end - start, ...splice);
  return overflow;
}

class CStyleDefine implements DefineOverload {
  constructor(readonly params: string[],
              readonly production: Token[],
              readonly definition?: Token) {}

  expand(tokens: Token[], start: number): string|Token[][] {
    let i = start + 1; // skip past the macro call identifier
    let splice = this.params.length ? tokens.length : start;
    let end = splice;
    const replacements = new Map<string, Token[]>();
    
    if (start < tokens.length && Token.eq(Token.LP, tokens[i])) {
      end = Token.findBalanced(tokens, i);
      if (end < 0) {
        // throw?
        return 'missing close paren for enclosed C-style expansion';
      }
      splice = end + 1;
      i++;
      //tok = new Scanner(tokens.slice(0, i), start + 1);
    }
    // Find a comma, skipping balanced parens.
    const args = Token.parseArgList(tokens, i, end);
    if (args.length > this.params.length) {
      return 'too many args';
    }

    for (i = 0; i < this.params.length; i++) {
      let arg = args[i] || [];
      const front = arg[0];
      if (arg.length === 1 && front.token === 'grp') {
        arg = front.inner;
      }
      replacements.set(this.params[i], arg);
    }
    // All params filled in, make replacement and fill it in.
    return produce(tokens, start, splice, replacements, this.production);
  }

  canOverload() { return Boolean(this.params.length); }
}

class TexStyleDefine implements DefineOverload {
  constructor(readonly pattern: Token[],
              readonly production: Token[],
              readonly definition?: Token) {}
  expand(tokens: Token[], start: number): string|Token[][] {
    let i = start + 1; // skip past the macro call identifier
    const replacements = new Map<string, Token[]>();
    for (let patPos = 0; patPos < this.pattern.length; patPos++) {
      const pat = this.pattern[patPos];
      if (pat.token === 'ident') {
        const delim = this.pattern[patPos + 1];
        if (!delim || delim?.token === 'ident') {
          // parse undelimited
          const tok = tokens[i++];
          if (!tok) return `missing undelimited argument ${Token.name(pat)}`;
          replacements.set(pat.str, tok.token === 'grp' ? tok.inner : [tok]);
        } else {
          // parse delimited
          const end = Token.eq(delim, Token.DOT_EOL) ?
              tokens.length : Token.find(tokens, delim, i);
          if (end < 0) return `could not find delimiter ${Token.name(delim)}`;
          //patPos++;
          replacements.set(pat.str, tokens.slice(i, end));
          i = end;
        }
      } else if (Token.eq(pat, Token.DOT_EOL)) {
        if (i < tokens.length) return `could not match .eol`;
      } else {
        // token to match
        if (!Token.eq(tokens[i++], pat)) {
          return `could not match: ${Token.name(pat)}`;
        }
      }
    }
    // Now splice in the production and fill to end of line 
    return produce(tokens, start, i, replacements, this.production);
  }

  canOverload() { return Boolean(this.pattern.length); }
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


// function fail(t: Token, msg: string): never {
//   let s = t.source;
//   if (s) msg += `\n  at ${s.file}:${s.line}:${s.column}: ${s.content}`;
//   while (s?.parent) {
//     s = s.parent;
//     msg += `\n  included from ${s.file}:${s.line}:${s.column}: ${s.content}`;
//   }
//   throw new Error(msg);
// }
