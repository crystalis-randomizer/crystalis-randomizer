import {Token} from './token.js';

/** A token list scanner. */
export class Scanner {
  constructor(private readonly tokens: readonly Token[], private i = 0) {}

  get pos(): number {
    return this.i;
  }

  get(): Token {
    return this.tokens[this.i] ??
        (() => { throw new Error(`out of bounds`); })();
  }

  lookingAt(token: Token): boolean {
    return this.i < this.tokens.length && Token.eq(this.tokens[this.i], token);
  }

  lookingAtIdentifier(): boolean {
    return this.tokens[this.i]?.token === 'ident';
  }

  peekingAtIdentifier(): boolean {
    return this.tokens[this.i + 1]?.token === 'ident';
  }

  atEnd(): boolean {
    return this.i >= this.tokens.length;
  }

  advance(): Token {
    if (this.i >= this.tokens.length) throw new Error(`past end`);
    const cur = this.tokens[this.i++];
    if (cur.token !== 'lc') return cur;
    let count = 1;
    while (this.i < this.tokens.length && count) {
      const token = this.tokens[this.i++].token;
      if (token === 'lc') count++;
      if (token === 'rc') count--;
    }
    return cur;
  }

  // Note that if the current token is the inc token then count should be
  // passed as zero instead of the default 1.  Final state will be the token
  // _after_ the one searched for (or end).
  find(token: Token, inc?: Token, count = 1): boolean {
    while (this.i < this.tokens.length && count) {
      const cur = this.tokens[this.i];
      if (Token.eq(cur, token)) count--;
      else if (inc && Token.eq(cur, inc)) count++;
      this.advance();
    }
    return !count;
  }
}
