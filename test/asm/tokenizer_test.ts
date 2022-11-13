import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Token} from '../../src/js/asm/token';
import {Tokenizer} from '../../src/js/asm/tokenizer';
import * as util from 'util';
//const value = require('../dist/js/asm/value.js');

const [] = [util];

//const MATCH = Symbol();

function tokenize(str: string, opts: Tokenizer.Options = {}): Token[][] {
  const out = [];
  const tokenizer = new Tokenizer(str, 'input.s', opts);
  for (let line = tokenizer.next(); line; line = tokenizer.next()) {
    out.push(line.map(strip));
  }
  return out;
}
function strip(token: Token): Token {
  delete token.source;
  if (token.token === 'grp') token.inner.forEach(strip);
  return token;
}

describe('Tokenizer.line', function() {
  it('should tokenize a source file', function() {
    const toks = tokenize(`
      ; comment is ignored
      label:
        lda #$1f ; also ignored
      .org $1c:$1234
      .ifdef XX
        .define YY
        .define YYZ %10101100
        pla
        sta ($11),y
      .elseif YY
        pha
      .endif`);

    expect(toks).to.eql([
      [{token: 'ident', str: 'label'}, Token.COLON],
      [{token: 'ident', str: 'lda'},
       {token: 'op', str: '#'}, {token: 'num', num: 0x1f, width: 1}],
      [{token: 'cs', str: '.org'}, {token: 'num', num: 0x1c, width: 1},
       {token: 'op', str: ':'}, {token: 'num', num: 0x1234, width: 2}],
      [{token: 'cs', str: '.ifdef'}, {token: 'ident', str: 'XX'}],
      [{token: 'cs', str: '.define'}, {token: 'ident', str: 'YY'}],
      [{token: 'cs', str: '.define'}, {token: 'ident', str: 'YYZ'},
       {token: 'num', num: 0b10101100, width: 1}],
      [{token: 'ident', str: 'pla'}],
      [{token: 'ident', str: 'sta'},
       {token: 'lp'}, {token: 'num', num: 0x11, width: 1}, {token: 'rp'},
       {token: 'op', str: ','}, {token: 'ident', str: 'y'}],
      [{token: 'cs', str: '.elseif'}, {token: 'ident', str: 'YY'}],
      [{token: 'ident', str: 'pha'}],
      [{token: 'cs', str: '.endif'}],
    ]);
  });

  it('should tokenize a label', function() { 
    expect(tokenize('foo:')).to.eql([
      [{token: 'ident', str: 'foo'}, {token: 'op', str: ':'}],
    ]);
  });

  it('should ignore comments', function() { 
    expect(tokenize('x ; ignored')).to.eql([
      [{token: 'ident', str: 'x'}],
    ]);
  });

  it('should tokenize an .assert', function() {
    expect(tokenize('.assert * = $0c:$8000')).to.eql([
      [{token: 'cs', str: '.assert'}, {token: 'op', str: '*'},
       {token: 'op', str: '='}, {token: 'num', num: 0x0c, width: 1},
       {token: 'op', str: ':'}, {token: 'num', num: 0x8000, width: 2}],
    ]);
  });

  it('should tokenize a string literal with escapes', function() {
    expect(tokenize(String.raw`"a\u1234\x12\;\"'"`)).to.eql([
      [{token: 'str', str: 'a\u1234\x12;"\''}],
    ]);
  });

  it('should tokenize grouping characters', function() {
    expect(tokenize('{([}])')).to.eql([
      [{token: 'grp',
        inner: [{token: 'lp'}, {token: 'lb'}]},
       {token: 'rb'},
       {token: 'rp'}],
    ]);
  });

  it('should tokenize a line with mismatched parens', function() {
    expect(tokenize('qux foo({x}, {y)}, {z})')).to.eql([
      [{token: 'ident', str: 'qux'},
       {token: 'ident', str: 'foo'},
       {token: 'lp'},
       {token: 'grp', inner: [{token: 'ident', str: 'x'}]},
       {token: 'op', str: ','},
       {token: 'grp', inner: [{token: 'ident', str: 'y'}, {token: 'rp'}]},
       {token: 'op', str: ','},
       {token: 'grp', inner: [{token: 'ident', str: 'z'}]},
       {token: 'rp'}],
    ]);
  });

  it('should tokenize all kinds of numbers', function() {
    expect(tokenize('123 0123 %10110 $123d')).to.eql([
      [{token: 'num', num: 123},
       {token: 'num', num: 0o123},
       {token: 'num', num: 0b10110, width: 1},
       {token: 'num', num: 0x123d, width: 2}],
    ]);
  });

  it('should tokenize relative and anonymous labels', function() {
    expect(tokenize('bcc :++')).to.eql([
      [{token: 'ident', str: 'bcc'},
       {token: 'ident', str: ':++'}],
    ]);
    expect(tokenize('bcc :+3')).to.eql([
      [{token: 'ident', str: 'bcc'},
       {token: 'ident', str: ':+3'}],
    ]);
    expect(tokenize('bne :---')).to.eql([
      [{token: 'ident', str: 'bne'},
       {token: 'ident', str: ':---'}],
    ]);
    expect(tokenize('beq :-7')).to.eql([
      [{token: 'ident', str: 'beq'},
       {token: 'ident', str: ':-7'}],
    ]);
    expect(tokenize('beq ++')).to.eql([
      [{token: 'ident', str: 'beq'},
       {token: 'op', str: '++'}],
    ]);
    expect(tokenize('bvc -')).to.eql([
      [{token: 'ident', str: 'bvc'},
       {token: 'op', str: '-'}],
    ]);
    expect(tokenize('bpl :>>>rts')).to.eql([
      [{token: 'ident', str: 'bpl'},
       {token: 'ident', str: ':>>>rts'}],
    ]);
    expect(tokenize('bpl :rts')).to.eql([
      [{token: 'ident', str: 'bpl'},
       {token: 'ident', str: ':rts'}],
    ]);
    expect(tokenize('bpl :<<rts')).to.eql([
      [{token: 'ident', str: 'bpl'},
       {token: 'ident', str: ':<<rts'}],
    ]);
  });

  it('should fail to parse a bad hex number', function() {
    expect(() => {
      tokenize('  adc $1g');
    }).to.throw(Error, /Bad hex number.*at input.s:1:6 near '\$1g'/s);
  });

  it('should fail to parse a bad decimal number', function() {
    expect(() => {
      tokenize('  12a');
    }).to.throw(Error, /Bad decimal.*at input.s:1:2 near '12a'/s);
  });

  it('should fail to parse a bad octal number', function() {
    expect(() => {
      tokenize('  018');
    }).to.throw(Error, /Bad octal.*at input.s:1:2 near '018'/s);
  });

  it('should fail to parse a bad binary number', function() {
    expect(() => {
      tokenize('  %012');
    }).to.throw(Error, /Bad binary.*at input.s:1:2 near '%012'/s);
  });

  it('should fail to parse a bad character', function() {
    expect(() => {
      tokenize('  `abc');
    }).to.throw(Error, /Syntax error.*at input.s:1:2/s);
  });

  it('should fail to parse a bad string', function() {
    expect(() => {
      tokenize('  "abc');
    }).to.throw(Error, /EOF while looking for "/);
  });
});
