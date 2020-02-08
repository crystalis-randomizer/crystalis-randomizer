import {IdGenerator} from './idgenerator.js';
import {Scanner} from './scanner.js';
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
    let line;
    while ((line = source.next()).length) {
      if (Token.eq(line[0], Token.ENDMACRO)) return new Macro(params, lines);
      lines.push(line);
    }
    throw new Error(`EOF looking for .endmacro: ${Token.nameAt(line[1])}`);
  }

  expand(tokens: Token[], idGen: IdGenerator): Token[][] {
    // Find the parameters.
    // This is a little more principled than Define, but we do need to be
    // a little careful.
    let tok = new Scanner(tokens, 1); // start looking _after_ macro ident
    const replacements = new Map<string, Token[]>();
    const lines = [];
    
    // Find a comma, skipping balanced curlies.  Parens are not special.
    for (const param of this.params) {
      let paramStart = tok.pos;
      while (!tok.atEnd()) {
        if (tok.lookingAt(Token.LC)) {
          paramStart++;
          const paramEnd = tok.pos;
          tok.advance(); // advanced past entire block
          if (!tok.atEnd() && !tok.lookingAt(Token.COMMA)) {
            throw new Error(
                `Garbage at end of line: ${Token.nameAt(tok.get())}`);
          }
          tok.advance();
          replacements.set(param, tokens.slice(paramStart, paramEnd));
        } else {
          tok.find(Token.COMMA); // or EOL...
          const paramEnd = tok.pos - 1;
          replacements.set(param, tokens.slice(paramStart, paramEnd));
        }
      }
    }
    if (!tok.atEnd()) {
      return 'too many parameters'
    }
    // All params filled in, make replacement
    const locals = new Map<string, string>();
    for (const line of production) {
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
      out.push(line);
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

  append(define: Define) {
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

  // NOTE: macro[0] is either .define or .macro
  static from(macro: Token[]) {
    const scanner = new Scanner(macro);
    if (!scanner.lookingAt(Token.DEFINE)) throw new Error(`invalid`);
    scanner.advance();
    if (!scanner.lookingAtIdentifier()) throw new Error(`invalid`);
    scanner.advance(); // don't care about name...
    // parse the parameter list, if any
    let paren = false;
    const patStart = scanner.pos + 1;
    let patEnd = patStart;
    if (scanner.lookingAt(Token.LP)) {
      paren = true;
      scanner.advance();
      if (!scanner.find(Token.RP)) throw new Error(`bad .define`);
      patEnd = scanner.pos - 1;
    } else if (scanner.lookingAt(Token.LC)) {
      scanner.advance(); // automatically skips balanced braces
      patEnd = scanner.pos - 1; // exactly the RC
    }
    const pattern = macro.slice(patStart, patEnd); // could be empty...
    const production = macro.slice(scanner.pos);

    return new Define([
      paren ?
          new CStyleDefine(Token.identsFromCList(pattern), production) :
          new TexStyleDefine(pattern, production)
    ]);
  }
}

interface DefineOverload {
  expand(tokens: Token[], start: number, out: Token[]): string;
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
    let end = this.params.length ? tokens.length : start;
    let tok = new Scanner(tokens, start);
    const replacements = new Map<string, Token[]>();
    
    if (start < tokens.length &&
        Token.eq(Token.LP, tokens[start])) {
      tok.advance();
      // Question: balanced find or not?
      if (!tok.find(Token.RP, Token.LP)) {
        return 'missing close paren for enclosed C-style expansion';
      }
      end = tok.pos;
      tok = new Scanner(tokens.slice(0, tok.pos - 1), start + 1);
    }
    // Find a comma, skipping balanced parens.
    for (const param of this.params) {
      let paramStart = tok.pos;
      let singleGroup = true;
      // TODO - consider making it an error to start with a brace but not be
      // completely surrounded?
      let parens = 0;
      while (!tok.atEnd()) {
        const cur = tok.get();
        if (!parens && Token.eq(cur, Token.COMMA)) break;
        if (cur.token === 'lp') parens++;
        if (cur.token === 'rp') {
          if (--parens < 0) return 'unbalanced right parenthesis';
        }
        if (cur.token !== 'lc' || tok.pos !== paramStart) singleGroup = false;
        tok.advance();
      }
      // whether we're at the end or not, accept the parameter.
      let paramEnd = tok.pos;
      if (singleGroup) { // drop the braces only if it's the whole arg
        paramStart++;
        paramEnd--;
      }
      replacements.set(param, tokens.slice(paramStart, paramEnd));
      if (tok.lookingAt(Token.COMMA)) tok.advance();
    }
    if (!tok.atEnd()) {
      return 'too many parameters'
    }
    // All params filled in, make replacement
    produce(out, replacements, this.production);
    // Now fill to end of line
    out.push(...tokens.slice(end));
    return '';
  }
}

class TexStyleDefine implements DefineOverload {
  constructor(readonly pattern: Token[],
              readonly production: Token[]) {}

  expand(tokens: Token[], start: number, out: Token[]): string {
    start++; // skip past the macro call identifier
    let end = this.pattern.length ? tokens.length : start;
    let tok = new Scanner(tokens, start);
    const replacements = new Map<string, Token[]>();
    
    for (let patPos = 0; patPos < this.pattern.length; patPos++) {
      const pat = this.pattern[patPos];
      if (pat.token === 'ident') {
        let patNext = this.pattern[patPos + 1];
        let argStart = tok.pos;
        let argEnd = argStart + 1;
        if (patNext?.token === 'ident') {
          // parse undelimited
          if (tok.lookingAt(Token.LC)) {
            argStart++;
            tok.advance();
            argEnd = tok.pos - 1;
          } else if (tok.atEnd()) {
            return `missing undelimited argument ${Token.name(pat)}`;
          } else {
            tok.advance();
          }
        } else {
          // parse delimited
          if (!patNext) {
            // final arg eats entire line
            end = argEnd = tokens.length;
          } else {
            // non-empty next token
            if (!tok.find(patNext)) {
              return `could not find delimiter ${Token.name(patNext)}`;
            }
            argEnd = tok.pos - 1;
            end = tok.pos;
            patPos++;
          }
        }
        // all cases handled: save the replacement
        replacements.set(pat.str, tokens.slice(argStart, argEnd));
      } else {
        // token to match
        if (!tok.lookingAt(pat)) return `could not match: ${Token.name(pat)}`;
        tok.advance();
        end = tok.pos;
      }
    }
    //console.log(replacements);
    produce(out, replacements, this.production);
    // Now fill to end of line
    out.push(...tokens.slice(end));
    return '';
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


// function fail(t: Token, msg: string): never {
//   let s = t.source;
//   if (s) msg += `\n  at ${s.file}:${s.line}:${s.column}: ${s.content}`;
//   while (s?.parent) {
//     s = s.parent;
//     msg += `\n  included from ${s.file}:${s.line}:${s.column}: ${s.content}`;
//   }
//   throw new Error(msg);
// }
