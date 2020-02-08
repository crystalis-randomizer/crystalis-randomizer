import {Buffer} from './buffer.js';
import {StringToken, Token} from './token.js';

export class Tokenizer {
  readonly buffer: Buffer;

  constructor(str: string,
              readonly file = 'input.s',
              readonly opts: Tokenizer.Options = {}) {
    this.buffer = new Buffer(str);
  }

  line(): Token[] {
    let tok = this.token();
    while (Token.eq(tok, Token.EOL)) {
      // Skip EOLs at beginning of line.
      tok = this.token();
    }
    const out: Token[] = [];
    while (!Token.eq(tok, Token.EOL) && !Token.eq(tok, Token.EOF)) {
      out.push(tok);
      tok = this.token();
    }
    return out;
  }

  token(): Token {
    // skip whitespace
    while (this.buffer.space() ||
           this.buffer.token(/^;.*/) ||
           (this.opts.lineContinuations && this.buffer.token(/^\\\n/))) {}
    if (this.buffer.eof()) return Token.EOF;

    // remember position of non-whitespace
    const source = {
      file: this.file,
      line: this.buffer.line,
      column: this.buffer.column,
    };
    try {
      const tok = this.tokenInternal();
      tok.source = source;
      return tok;
    } catch (err) {
      const {file, line, column} = source;
      let last = this.buffer.group();
      last = last ? ` near '${last}'` : '';
      err.message += `\n  at ${file}:${line}:${column}${last}`;
      throw err;
    }
  }

  tokenInternal(): Token {
    if (this.buffer.newline()) return {token: 'eol'};
    if (this.buffer.token(/^@+[a-z0-9_]*/i) ||
        this.buffer.token(/^[a-z_][a-z0-9_]*/i)) return this.strTok('ident');
    if (this.buffer.token(/^\.[a-z]+/i)) return this.strTok('cs');
    if (this.buffer.token(/^:(\++|-+)/)) return this.strTok('ident');
    if (this.buffer.token(/^(::?|\++|-+|&&?|\|\|?|[#*/,=~!^]|<[<>=]?|>[>=]?)/)) {
      return this.strTok('op');
    }
    if (this.buffer.token('[')) return {token: 'lb'};
    if (this.buffer.token('{')) return {token: 'lc'};
    if (this.buffer.token('(')) return {token: 'lp'};
    if (this.buffer.token(']')) return {token: 'rb'};
    if (this.buffer.token('}')) return {token: 'rc'};
    if (this.buffer.token(')')) return {token: 'rp'};
    if (this.buffer.token(/^["']/)) return this.tokenizeStr();
    if (this.buffer.token(/^[1-9][0-9a-z_]+/i)) return this.tokenizeNum();
    if (this.buffer.token(/^0[0-9a-z_]+/i)) return this.tokenizeNum();
    if (this.buffer.token(/^[$%][0-9a-z_]+/i)) return this.tokenizeNum();
    throw new Error(`Syntax error`);
  }

  tokenizeStr(): Token {
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

  strTok(token: StringToken['token']): Token {
    return {token, str: this.buffer.group()!};
  }

  tokenizeNum(str: string = this.buffer.group()!): Token {
    if (this.opts.numberSeparators) str = str.replace(/_/g, '');
    if (str[0] === '$') return parseNum(str, 16, 'hex');
    if (str[0] === '%') return parseNum(str, 2, 'binary');
    if (str[0] === '0') return parseNum(str, 8, 'octal');
    return parseNum(str, 10, 'decimal');
  }
}

export namespace Tokenizer {
  export interface Options {
    // caseInsensitive?: boolean; // handle elsewhere?
    lineContinuations?: boolean;
    numberSeparators?: boolean;
  }
}

function parseNum(str: string, radix: number, radixName: string): Token {
  const num = Number.parseInt(str, radix);
  if (isNaN(num)) throw new Error(`Bad ${radixName} number: ${str}`);
  return {token: 'num', num};
}
