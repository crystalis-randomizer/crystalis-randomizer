import {Deque} from '../util.js';
import {IdGenerator} from './idgenerator.js';
import {Scanner} from './scanner.js';
import {Token} from './token.js';

const MAX_STACK_DEPTH = 100;


interface TokenSource {
  next(): Token[];
  include(file: string): Promise<void>;
  unshift(...lines: Token[][]): void;
  enter(): void;
  exit(): void;
  options(): Tokenizer.Options;
}

interface Evaluator {
  // These need to come from Processor and will depend on scope...
  definedSymbol(sym: string): boolean;
  referencedSymbol(sym: string): boolean;
  // also want methods to apply shunting yard to token list?
  //  - turn it into a json tree...?
}

export class Preprocessor {
  private readonly macros = new Map<string, Define|Macro>();
  private sink: AsyncIterator<Token[]>|undefined;
  private leftovers: Token[]|undefined = undefined;
  // NOTE: there is no scope here... - not for macros
  //  - only symbols have scope
  // TODO - evaluate constants...

  constructor(readonly source: TokenSource,
              readonly idGenerator: IdGenerator) {}

  // For use as a token source in the next stage.
  async next(): Promise<Token[]> {
    while (true) {
      if (!this.sink) this.sink = this.pump();
      const {value, done} = await this.sink.next();
      if (done) {
        this.sink = undefined;
        continue;
      }
      return value;
    }
  }

  /** Attempt to emit a new line. */
  private async * pump(): AsyncGenerator<Token[]> {
    const line = this.readLine();
    const first = line[0];
    if (!first) return void (yield line); // EOF
    switch (first.token) {
      case 'ident':
        // Possibilities: (1) label, (2) mnemonic/assign, (3) macro
        // Labels get split out.  We don't distinguish assigns yet.
        if (Token.eq(line[1], Token.COLON)) {
          yield line.splice(0, 2);
          this.putBack(line);
          return;
        }
        if (!this.tryExpandMacro(line)) yield line;
        return;

      case 'cs':
        if (!this.tryRunDirective(line)) yield line;
        return;

      case 'op':
        // Probably an anonymous label...
        if (/^[-+]+$/.test(front.str)) {
          const label = [front];
          const second = line[1];
          if (second && Token.eq(second, Token.COLON)) {
            label.push(second);
            line.splice(0, 2);
          } else {
            label.push({token: 'op', str: ':'});
            line.splice(0, 1);
          }
          yield label;
          return;
        } else if (front.str === ':') {
          yield line.splice(0, 1);
          return;
        }

      default:
        throw new Error(`Unexpected: ${Token.nameAt(line[0])}`);
    }
  }

  tryExpandMacro(line: Token[]): boolean {
    const [first, ...args] = line;
    if (first.token !== 'ident') throw new Error(`impossible`);
    const macro = this.macros.get(first.str);
    if (!(macro instanceof Macro)) return false;
    const expansion = macro.expand(line);
    this.source.enter();
    this.source.unshift(...expansion); // process them all over again...
    return true;
  }

  tryRunDirective(line: Token[]): boolean {
    const first = line[0];
    if (first.token !== 'cs') throw new Error(`impossible`);
    const handler = this.runDirectives[first.str];
    if (!handler) return false;
    handler(line);
    return true;
  }

  private readonly runDirectives = {
    '.define': (line) => this.parseDefine(line),
    '.else': ([cs]) => badClose('.if', cs),
    '.elseif': ([cs]) => badClose('.if', cs),
    '.endif': ([cs]) => badClose('.if', cs),
    '.endmacro': ([cs]) => badClose('.macro', cs),
    '.exitmacro': ([, a]) => { noGarbage(a); this.source.exit(); },
    '.if': ([cs, ...args]) => this.parseIf(parseOneExpr(args, cs)),
    '.ifdef': ([cs, ...args]) =>
        this.parseIf(this.def(parseOneIdent(args, cs))),
    '.ifndef': ([cs, ...args]) =>
        this.parseIf(!this.def(parseOneIdent(args, cs))),
    '.ifblank': ([, ...args]) => this.parseIf(!args.length),
    '.ifnblank': ([, ...args]) => this.parseIf(!!args.length),
    '.ifref': ([cs, ...args]) =>
        this.parseIf(this.ref(parseOneIdent(args, cs))),
    '.ifnref': ([cs, ...args]) =>
        this.parseIf(!this.ref(parseOneIdent(args, cs))),
    '.macro': (line) => this.parseMacro(line),
  };

  private readonly expandDirectives = {
    '.define': (line, i) => {
    },
    '.skip': (line, i) => {
      // expand i + 1, then splice self out
      const rest = line.splice(i + 2, line.length - i - 2);
      const skipped = line.pop();
      line.pop(); // .skip
      this.expandToken(rest, 0);
      line.push(...rest);
      return i;
    },
    '.tcount': parseArgs((cs, arg) => {
      return [{token: 'num', num: arg.length}];
    }, 1),  // at most one arg
    '.ident': parseArgs((cs, arg) => {
      const str = this.parseConstStr(arg, cs);
      if (result.valueType !== 'str') {
        throw new Error(`Expected a constant string: ${Token.nameAt(arg[0])}`);
      }
      return [{token: 'ident', str: result.str}];
    }, 1),
    '.concat': parseArgs((cs, ...args) => {
      const strs = [];
      for (const arg of args) {
        if (!arg.length) continue; // blanks ok
        strs.push(this.parseConstStr(arg));
      }
      return [{token: 'ident', str: strs.join('')}];
    }), // as many args as wanted
    '.sprintf': parseArgs((cs, fmt, ...rest) => {
      throw new Error('not impl');
    }),
    '.cond': parseArgs((cs, ...args) => {
      throw new Error('not impl');
    }),
  }

  private parseDefine(line: Token[]) {
    const name = Token.expectIdentifier(line[1], line[0]);
    const define = Define.from(line);
    const prev = this.macros.get(name);
    if (prev instanceof Define) {
      prev.append(define);
    } else if (prev) {
      throw new Error(`Already defined: ${name}`);
    } else {
      this.macros.set(name, define);
    }
  }

  private parseMacro(line: Token[]) {
    const name = Token.expectIdentifier(line[1], line[0]);
    const macro = Macro.from(line, this.source);
    const prev = this.macros.get(name);
    if (prev) throw new Error(`Already defined: ${name}`);
    this.macros.set(name, macro);
  }

  private parseIf(cond: boolean) {
    let depth = 1;
    let done = false;
    const result: Token[][] = [];
    while (depth > 0) {
      const line = this.source.next();
      const front = line[0];
      if (!front) throw new Error(`EOF looking for .endif`); // TODO: start?
      if (Token.eq(front, Token.ENDIF)) {
        depth--;
        continue;
      } else if (depth === 1 && !done) {
        if (cond && (Token.eq(front, Token.ELSE) ||
                     Token.eq(front, Token.ELSEIF))) {
          // if true ... else .....
          cond = false;
          done = true;
          continue;
        } else if (Token.eq(front, Token.ELSEIF)) {
          // if false ... else if .....
          cond = parseOneExpr(line.slice(1), front);
          continue;
        } else if (Token.eq(front, Token.ELSE)) {
          // if false ... else .....
          cond = true;
          continue;
        }
      }
      // anything else on the line
      if (cond) result.push(line);
    }
    // result has the expansion: unshift it
    this.source.unshift(...result);
  }

  private putBack(tokens: Token[]) {
    if (this.leftovers) throw new Error(`Impossible`);
    if (tokens.length) this.leftovers = tokens;
  }

  // Expand a single line of tokens from the front of toks.
  private readLine(): Token[] {
    if (this.leftovers) { // check for leftovers first
      const out = this.leftovers;
      this.leftovers = undefined;
      return out;
    }
    // Apply .define expansions as necessary.
    return this.expandLine(this.source.next());
  }

  /** Returns the next position to expand. */
  private expandToken(line: Token[], pos: number): number {
    const front = line[i]!;
    if (front.token === 'ident') {
      const define = this.macros.get(front.str);
      if (define) {
        const out = [];
        if (define.expand(line, i, out)) {
          // need to re-expand...
          line.splice(i, line.length - i, ...out);
          return i;
        }
      }
    } else if (front.token === 'cs') {
      if (front.str === '.define' || front.str === '.undefine') {
        const next = line[i + 1];
        if (next?.token === 'cs') {
          this.expandToken(line, i + 1);
          return i;
        } else if (next?.token === 'ident') {
          return i + 2; // skip the identifier
        }
      } else if (front.str === '.skip') {
        const rest = line.splice(i + 2, line.length - i - 2);
        line.pop();
        this.expandToken(rest, 0);
        line.push(...rest);
        return i;
      } else {
        const directive = this.expandDirectives[front.str];
        if (directive) {
          // say whether to look for parens?
          // look for parens
          return directive(line, i);
        }
      }
    }
    return i + 1;
  }

  private expandLine(line: Token[], pos = 0): Token[] {
    for (let i = 0; i < line.length; i++) {
    }
  }

  defined(name: string): boolean {
    return this.macros.has(name) ||
        this.parent && this.parent.defined(name) ||
        false;
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
}

function parseOneIdent(ts: Token[], prev?: Token): string {
  // TODO - .ident?
  noGarbage(ts[1]);
  return Token.expectIdentifier(ts[0], prev);
}

function parseOneExpr(ts: Token[], prev?: Token): string {

}

function parseArgs(fn: (cs: Token, ...args: Token[][]) => Token[],
                   count?: number) {
  return (line: Token[], start: number) => {
    // look for paren, then comma-separated args
    // unwrap any braces
  };
}

function fail(t: Token, msg: string): never {
  const s = t.source;
  if (s) {
    msg += `\n  at ${s.file}:${s.line}:${s.column}: ${s.content}`;
    // TODO - expanded from?
  }
  throw new Error(msg);
}

function badClose(open: string, tok: Token): never {
  throw new Error(`${Token.name(tok)} with no ${open}${Token.at(tok)}`);
}

export interface Line {
  labels: string[];
  tokens: Token[];
}
