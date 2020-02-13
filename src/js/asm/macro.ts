import {Token} from './token';

const DEBUG = true;
const [] = [DEBUG];

interface Source<T> {
  next(): T;
}

export class Macro {
  private constructor(readonly params: string[],
                      readonly production: Token[][]) {}

  static from(line: Token[], source: Source<Token[]>) {
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

  expand(tokens: Token[], idGen: Source<number>): Token[][] {
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
      function map(toks: Token[]): Token[] {
        const mapped: Token[] = [];
        for (const tok of toks) {
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
          } else if (tok.token === 'grp') {
            mapped.push({token: 'grp', inner: map(tok.inner)});
            continue;
          }
          mapped.push(tok);
        }
        return mapped;
      }
      lines.push(map(line));
    }
    return lines;
  }
}
