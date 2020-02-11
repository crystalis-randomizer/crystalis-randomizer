import {IdGenerator} from './idgenerator.js';
import {Token} from './token.js';

const DEBUG = true;

interface TokenSource {
  next(): Token[];
}

export class Macro {
  private constructor(readonly params: string[],
                      readonly production: Token[][]) {}

  static from(line: Token[], source: TokenSource) {
    // First line must start with .macro <name> [args]
    // Last line is the line BEFORE the .endmacro
    // Nested macro definitions are not allowed!
    if (!Token.eq(line[0], Token.MACRO)) throw new Error(`invalid`);
    if (line[1]?.token !== 'ident') throw new Error(`invalid`);
    const params = Token.identsFromCList(line.slice(2));
    const lines = [];
    let next: Token[];
    while ((next = source.next()).length) {
      if (Token.eq(next[0], Token.ENDMACRO)) return new Macro(params, lines);
      lines.push(next);
    }
    throw new Error(`EOF looking for .endmacro: ${Token.nameAt(line[1])}`);
  }

  expand(tokens: Token[], idGen: IdGenerator): Token[][] {
    // Find the parameters.
    // This is a little more principled than Define, but we do need to be
    // a little careful.
    let i = 1; // start looking _after_ macro ident
    const replacements = new Map<string, Token[]>();
    const lines: Token[][] = [];
    
    // Find a comma, skipping balanced curlies.  Parens are not special.
    for (const param of this.params) {
      const comma = Token.findComma(tokens, i);
      let slice = tokens.slice(i, comma);
      i = comma + 1;
      if (slice.length === 1 && slice[0].token === 'grp') {
        // unwrap one layer
        slice = slice[0].inner;
      }
      replacements.set(param, slice);
    }
    if (i < tokens.length) {
      throw new Error(`Too many macro parameters: ${Token.nameAt(tokens[i])}`);
    }
    // All params filled in, make replacement
    const locals = new Map<string, string>();
    for (const line of this.production) {
      if (Token.eq(line[0], Token.LOCAL)) {
        for (const local of Token.identsFromCList(line.slice(1))) {
          locals.set(local, `${local}~${idGen.next()}`);
        }
      }
      // TODO - check for .local here and rename?  move into assemlber
      // or preprocessing...?  probably want to keep track elsewhere.
      const mapped = [];
      for (const tok of line) {
        if (tok.token === 'ident') {
          const param = replacements.get(tok.str);
          if (param) {
            // this is actually a parameter
            mapped.push(...param); // TODO - copy w/ child sourceinfo?
            continue;
          }
          const local = locals.get(tok.str);
          if (local) {
            mapped.push({token: 'ident', str: local});
            continue;
          }
        }
        mapped.push(tok); 
      }
      lines.push(line);
    }
    return lines;
  }
}

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
    if (!this.canOverload()) throw new Error(`non-overloadable`);
    this.overloads.push(...define.overloads);
  }

  /**
   * Expands, possibly in the middle of a line!  Dumps output tokens
   * into `out` and returns true if successful.  Otherwise return false
   * and do nothing.  Output array may not be empty at the start.
   */
  expand(tokens: Token[], start: number, out: Token[]): boolean {
    const reasons = [];
    for (const overload of this.overloads) {
      const reason = overload.expand(tokens, start, out);
      if (!reason) return true;
      reasons.push(reason);
    }
    if (DEBUG) console.error(reasons.join('\n'));
    return false;
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
      overload = new TexStyleDefine([], []);
    } else if (paramStart.token === 'grp') {
      // TeX-style param list
      overload = new TexStyleDefine(paramStart.inner, macro.slice(3));
    } else if (paramStart.token === 'lp') {
      // C-style param list
      const paramEnd = Token.findBalanced(macro, 2);
      if (paramEnd < 0) {
        throw new Error(`Expected close paren ${Token.nameAt(macro[2])}`);
      }
      overload =
          new CStyleDefine(Token.identsFromCList(macro.slice(3, paramEnd)),
                           macro.slice(paramEnd + 1));
    } else {
      // no param list
      overload = new TexStyleDefine([], macro.slice(2));
    }
    return new Define([overload]);
  }
}

interface DefineOverload {
  expand(tokens: Token[], start: number, out: Token[]): string;
  canOverload(): boolean;
}

function produce(out: Token[],
                 replacements: Map<string, Token[]>,
                 production: Token[]) {
  for (const tok of production) {
    if (tok.token === 'ident') {
      const param = replacements.get(tok.str);
      if (param) {
        // this is actually a parameter
        out.push(...param); // TODO - copy w/ child sourceinfo?
        continue;
      }
    }
    out.push(tok);
  }
}

class CStyleDefine implements DefineOverload {
  constructor(readonly params: string[],
              readonly production: Token[]) {}

  expand(tokens: Token[], start: number, out: Token[]): string {
    start++; // skip past the macro call identifier
    let i = start;
    let splice = this.params.length ? tokens.length : start;
    let end = splice;
    const replacements = new Map<string, Token[]>();
    
    if (start < tokens.length && Token.eq(Token.LP, tokens[start])) {
      end = Token.findBalanced(tokens, start);
      if (end < 0) {
        // throw?
        return 'missing close paren for enclosed C-style expansion';
      }
      splice = end + 1;
      i++;
      //tok = new Scanner(tokens.slice(0, i), start + 1);
    }
    // Find a comma, skipping balanced parens.
    let arg: Token[] = [];
    const args = [arg];
    let parens = 0;
    while (i < end) {
      const tok = tokens[i++];
      if (!parens && Token.eq(tok, Token.COMMA)) {
        args.push(arg = []);
      } else {
        arg.push(tok)
        if (tok.token === 'lp') {
          parens++;
        } else if (tok.token === 'rp') {
          if (--parens < 0) return 'unbalanced parens';
        }
      }
    }
    if (parens) return 'unbalaned parens';
    if (!arg.length) args.pop();

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
    // All params filled in, make replacement
    produce(out, replacements, this.production);
    // Now fill to end of line
    out.push(...tokens.slice(end));
    return '';
  }

  canOverload() { return Boolean(this.params.length); }
}

class TexStyleDefine implements DefineOverload {
  constructor(readonly pattern: Token[],
              readonly production: Token[]) {}
  expand(tokens: Token[], start: number, out: Token[]): string {
    let i = ++start; // skip past the macro call identifier
    let end = this.pattern.length ? tokens.length : start;
    const replacements = new Map<string, Token[]>();
    for (let patPos = 0; patPos < this.pattern.length; patPos++) {
      const pat = this.pattern[patPos];
      if (pat.token === 'ident') {
        const delim = this.pattern[patPos + 1];
        if (delim?.token === 'ident') {
          // parse undelimited
          const tok = tokens[i];
          if (!tok) return `missing undelimited argument ${Token.name(pat)}`;
          replacements.set(pat.str, tok.token === 'grp' ? tok.inner : [tok]);
        } else {
          // parse delimited
          if (delim) {
            end = Token.find(tokens, delim, i);
            if (end < 0) return `could not find delimiter ${Token.name(delim)}`;
          } else {
            // final arg eats entire line
            end = tokens.length;
          }
          patPos++;
          replacements.set(pat.str, tokens.slice(i, end));
          i = end + 1;
        }
      } else {
        // token to match
        if (!Token.eq(tokens[i++], pat)) {
          return `could not match: ${Token.name(pat)}`;
        }
        end = i;
      }
    }
    //console.log(replacements);
    produce(out, replacements, this.production);
    // Now fill to end of line
    out.push(...tokens.slice(end));
    return '';
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
