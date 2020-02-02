require('source-map-support').install();
const {describe, it} = require('mocha');
const {expect} = require('chai');
const {tokenize} = require('../dist/js/asm/tokenize.js');
const util = require('util');
//const value = require('../dist/js/asm/value.js');

const MATCH = Symbol();

describe('tokenize', function() {
  it('should tokenize a source file', function() {
    const toks = strip(tokenize(`
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
      .endif`));

    expect(toks).to.eql([
      {token: 'ident', str: 'label'},
      {token: 'op', str: ':'},
      {token: 'eol'},
      {token: 'ident', str: 'lda'},
      {token: 'op', str: '#'},
      {token: 'num', num: 0x1f},
      {token: 'eol'},
      {token: 'cs', str: '.org'},
      {token: 'num', num: 0x1c},
      {token: 'op', str: ':'},
      {token: 'num', num: 0x1234},
      {token: 'eol'},
      {token: 'cs', str: '.ifdef'},
      {token: 'ident', str: 'XX'},
      {token: 'eol'},
      {token: 'cs', str: '.define'},
      {token: 'ident', str: 'YY'},
      {token: 'eol'},
      {token: 'cs', str: '.define'},
      {token: 'ident', str: 'YYZ'},
      {token: 'num', num: 0b10101100},
      {token: 'eol'},
      {token: 'ident', str: 'pla'},
      {token: 'eol'},
      {token: 'ident', str: 'sta'},
      {token: 'lp'},
      {token: 'num', num: 0x11},
      {token: 'rp'},
      {token: 'op', str: ','},
      {token: 'ident', str: 'y'},
      {token: 'eol'},
      {token: 'cs', str: '.elseif'},
      {token: 'ident', str: 'YY'},
      {token: 'eol'},
      {token: 'ident', str: 'pha'},
      {token: 'eol'},
      {token: 'cs', str: '.endif'},
    ]);
  });

  it('should tokenize a label', function() { 
    expect(strip(tokenize('foo:'))).to.eql([
      {token: 'ident', str: 'foo'}, {token: 'op', str: ':'},
    ]);
  });

  it('should tokenize an .assert', function() {
    expect(strip(tokenize('.assert * = $0c:$8000'))).to.eql([
      {token: 'cs', str: '.assert'}, {token: 'op', str: '*'},
      {token: 'op', str: '='}, {token: 'num', num: 0x0c},
      {token: 'op', str: ':'}, {token: 'num', num: 0x8000},
    ]);
  });

  it('should tokenize a string literal with escapes', function() {
    expect(strip(tokenize(String.raw`"a\u1234\x12\;\"'"`))).to.eql([
      {token: 'str', str: 'a\u1234\x12;"\''},
    ]);
  });

  it('should tokenize grouping characters', function() {
    expect(strip(tokenize('{([}])'))).to.eql([
      {token: 'lc'}, {token: 'lp'}, {token: 'lb'},
      {token: 'rc'}, {token: 'rb'}, {token: 'rp'},
    ]);
  });

  it('should fail to parse a bad number', function() {
    expect(() => {
      tokenize('  adc $1g');
    }).to.throw(Error, /Invalid digits in hex number.*at input.s:0:6: '\$1g'/s);
  });

  it('should fail to parse a bad character', function() {
    expect(() => {
      tokenize('  `abc');
    }).to.throw(Error, /Syntax error.*at input.s:0:2: '`abc'/s);
  });

  it('should fail to parse a bad string', function() {
    expect(() => {
      tokenize('  "abc');
    }).to.throw(Error, /EOF while looking for "/);
  });
});

function strip(toks) {
  const out = [...toks].map(t => {
    const {source, ...rest} = t;
    return rest;
  });
  expect(out.pop()).to.eql({token: 'eof'});
  expect(out.pop()).to.eql({token: 'eol'});
  //console.log(util.inspect(out, {showHidden: false, depth: null}))
  return out;
}
