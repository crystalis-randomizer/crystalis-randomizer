import {Buffer} from './buffer';
import {StringToken, Token, TokenSource} from './token';

export class Tokenizer implements TokenSource {
  readonly buffer: Buffer;

  constructor(str: string,
              readonly file = 'input.s',
              readonly opts: Tokenizer.Options = {}) {
    this.buffer = new Buffer(str);
  }

  next(): Token[]|undefined {
    let tok = this.token();
    while (Token.eq(tok, Token.EOL)) {
      // Skip EOLs at beginning of line.
      tok = this.token();
    }
    // Group curly brace groups into a single effective token.
    const stack: Token[][] = [[]];
    let depth = 0;
    while (!Token.eq(tok, Token.EOL) && !Token.eq(tok, Token.EOF)) {
      if (Token.eq(tok, Token.LC)) {
        stack[depth++].push(tok);
        stack.push([]);
      } else if (Token.eq(tok, Token.RC)) {
        if (!depth) throw new Error(`Missing open curly: ${Token.nameAt(tok)}`);
        const inner = stack.pop()!;
        const source = stack[--depth].pop()!.source;
        const token: Token = {token: 'grp', inner};
        if (source) token.source = source;
        stack[depth].push(token);
      } else {
        stack[depth].push(tok);
      }
      tok = this.token();
    }
    if (depth) {
      const open = stack[depth - 1].pop()!;
      throw new Error(`Missing close curly: ${Token.nameAt(open)}`);
    }
    return stack[0].length ? stack[0] : undefined;
  }

  private token(): Token {
    // skip whitespace
    while (this.buffer.space() ||
           this.buffer.token(/^;.*/) ||
           (this.opts.lineContinuations && this.buffer.token(/^\\(\r\n|\n|\r)/))) {}
    if (this.buffer.eof()) return Token.EOF;

    // remember position of non-whitespace
    const source = {
      file: this.file,
      line: this.buffer.line,
      column: this.buffer.column,
    };
    try {
      const tok = this.tokenInternal();
      if (!this.opts.skipSourceAnnotations) tok.source = source;
      return tok;
    } catch (err) {
      const {file, line, column} = source;
      let last = this.buffer.group();
      last = last ? ` near '${last}'` : '';
      err.message += `\n  at ${file}:${line}:${column}${last}`;
      throw err;
    }
  }

  private tokenInternal(): Token {
    if (this.buffer.newline()) return {token: 'eol'};
    if (this.buffer.token(/^@+[a-z0-9_]*/i) ||
        this.buffer.token(/^((::)?[a-z_][a-z0-9_]*)+/i)) {
      return this.strTok('ident');
    }
    if (this.buffer.token(/^\.[a-z]+/i)) return this.strTok('cs');
    if (this.buffer.token(/^:([+-]\d+|[-+]+|<+rts|>*rts)/)) return this.strTok('ident');
    if (this.buffer.token(/^(:|\++|-+|&&?|\|\|?|[#*/,=~!^]|<[<>=]?|>[>=]?)/)) {
      return this.strTok('op');
    }
    if (this.buffer.token('[')) return {token: 'lb'};
    if (this.buffer.token('{')) return {token: 'lc'};
    if (this.buffer.token('(')) return {token: 'lp'};
    if (this.buffer.token(']')) return {token: 'rb'};
    if (this.buffer.token('}')) return {token: 'rc'};
    if (this.buffer.token(')')) return {token: 'rp'};
    if (this.buffer.token(/^["']/)) return this.tokenizeStr();
    if (this.buffer.token(/^[$%]?[0-9a-z_]+/i)) return this.tokenizeNum();
    throw new Error(`Syntax error`);
  }

  private tokenizeStr(): Token {
    const b = this.buffer;
    const m = b.match()!;
    const end = m[0];
    let str = '';
    while (!b.lookingAt(end)) {
      if (b.eof()) throw new Error(`EOF while looking for ${end}`);
      if (b.token(/^\\u([0-9a-f]{4})/i)) {
        str += String.fromCodePoint(parseInt(b.group(1)!, 16));
      } else if (b.token(/^\\x([0-9a-f]{2})/i)) {
        str += String.fromCharCode(parseInt(b.group(1)!, 16));
      } else if (b.token(/^\\(.)/)) {
        str += b.group(1)!;
      } else {
        b.token(/^./);
        str += b.group(0)!;
      }
    }
    b.token(end);
    return {token: 'str', str};
  }

  private strTok(token: StringToken['token']): Token {
    return {token, str: this.buffer.group()!};
  }

  private tokenizeNum(str: string = this.buffer.group()!): Token {
    if (this.opts.numberSeparators) str = str.replace(/_/g, '');
    if (str[0] === '$') return parseHex(str.substring(1));
    if (str[0] === '%') return parseBin(str.substring(1));
    if (str[0] === '0') return parseOct(str);
    return parseDec(str);
  }
}

function parseHex(str: string): Token {
  if (!/^[0-9a-f]+$/i.test(str)) throw new Error(`Bad hex number: $${str}`);
  return {token: 'num', num: Number.parseInt(str, 16), width: Math.ceil(str.length / 2)};
}

function parseDec(str: string): Token {
  if (!/^[0-9]+$/.test(str)) throw new Error(`Bad decimal number: ${str}`);
  return {token: 'num', num: Number.parseInt(str, 10)};
}

function parseOct(str: string): Token {
  if (!/^[0-7]+$/.test(str)) throw new Error(`Bad octal number: ${str}`);
  return {token: 'num', num: Number.parseInt(str, 8)};
}

function parseBin(str: string): Token {
  if (!/^[01]+$/.test(str)) throw new Error(`Bad binary number: %${str}`);
  return {token: 'num', num: Number.parseInt(str, 2), width: Math.ceil(str.length / 8)};
}

export namespace Tokenizer {
  export interface Options {
    // caseInsensitive?: boolean; // handle elsewhere?
    lineContinuations?: boolean;
    numberSeparators?: boolean;
    skipSourceAnnotations?: boolean;
  }
}
