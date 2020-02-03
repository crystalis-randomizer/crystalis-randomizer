import {Buffer} from './buffer.js';

import {NumberTok, NullaryTok, StringTok, Token} from './token.js';

export function* tokenize(str: string, file = 'input.s'): Generator<Token> {
  let last: Token|undefined;
  for (const token of tokenizeInternal(str, file)) {
    if (Token.eq(token, Token.EOL)) {
      if (!last || Token.eq(last, Token.EOL)) continue;
    }
    yield token;
    last = token;
  }
  if (!last || !Token.eq(last, Token.EOL)) yield {token: 'eol'};
  yield {token: 'eof'};
}

function* tokenizeInternal(str: string, file = 'input.s'): Generator<Token> {
  const b = new Buffer(str);

  while (!b.eof()) {
    if (b.space() || b.token(/^;.*/)) continue;
    if (b.token(/^\\\n/)) continue; // skip continuation tokens
    if (b.newline()) {
      yield token('eol');
    } else if (b.token(/^@+[a-z0-9_]*/i) ||
               b.token(/^[a-z_][a-z0-9_]*/i)) {
      yield token('ident', b.group()!);
    } else if (b.token(/^\.[a-z]+/i)) {
      yield token('cs', b.group()!);
    } else if (b.token(/^:(\++|-+)/)) {
      yield token('ident', b.group()!);
    } else if (b.token(/^(::?|\++|-+|&&?|\|\|?|[#*/,=~!^]|<[<>=]?|>[>=]?)/)) {
      yield token('op', b.group()!);
    } else if (b.token('[')) {
      yield token('lb');
    } else if (b.token('{')) {
      yield token('lc');
    } else if (b.token('(')) {
      yield token('lp');
    } else if (b.token(']')) {
      yield token('rb');
    } else if (b.token('}')) {
      yield token('rc');
    } else if (b.token(')')) {
      yield token('rp');
    } else if (b.token(/^["']/)) {
      const m = b.match()!;
      const end = m[0];
      let str = '';
      while (!b.lookingAt(end)) {
        if (b.eof()) fail(`EOF while looking for ${end}`);
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
      yield token('str', str);
    } else if (b.token(/^[1-9][0-9]*([a-z_]?)/i)) {
      if (b.group(1)) fail(`Invalid digits in decimal number`);
      yield token('num', Number.parseInt(b.group()!));
    } else if (b.token(/^0[0-7]*([89a-z_]?)/i)) {
      if (b.group(1)) fail(`Invalid digits in octal number`);
      yield token('num', Number.parseInt(b.group()!, 8));
    } else if (b.token(/^\$([0-9a-f]+)([g-z_]?)/i)) {
      if (b.group(2)) fail(`Invalid digits in hex number`);
      yield token('num', Number.parseInt(b.group(1)!, 16));
    } else if (b.token(/^\%([01]+)([2-9a-z_]?)/i)) {
      if (b.group(2)) fail(`Invalid digits in binary number`);
      yield token('num', Number.parseInt(b.group(1)!, 2));
    } else {
      fail(`Syntax error`);
    }    
  }

  function token(...[token, arg]: TokenArgs): Token {
    const m = b.match();
    const source = m && {file, line: m.line, column: m.column, content: m[0]};
    if (token === 'cs') {
      return {token, str: (arg as string).toLowerCase(), source};
    } else if (token === 'str' || token === 'ident' || token === 'op') {
      return {token, str: arg as string, source};
    } else if (token === 'num') {
      return {token, num: arg as number, source};
    }
    return {token, source};
  }

  function fail(msg: string): never {
    let m = b.match()!;
    m = m || (b as typeof m);
    const snip = m === (b as unknown) ? b.remainder.substring(0, 40) : m[0];
    throw new Error(`${msg}\n  at ${file}:${m.line}:${m.column}: '${snip}'`);
  }
}

type TokenArgs = [NullaryTok] | [NumberTok, number] | [StringTok, string];
