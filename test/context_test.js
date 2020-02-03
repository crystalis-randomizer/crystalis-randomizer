require('source-map-support').install();
const {describe, it} = require('mocha');
const {expect} = require('chai');
const {Context, Define} = require('../dist/js/asm/context.js');
const {Token} = require('../dist/js/asm/token.js');
const {tokenize} = require('../dist/js/asm/tokenize.js');
const {Deque} = require('../dist/js/util.js');
const util = require('util');
//const value = require('../dist/js/asm/value.js');

const MATCH = Symbol();

describe('Define', function() {

  function testExpand(define, input, output) {
    const defTok = tok(define);
    const defName = defTok.get(1) || expect.fail('no name');
    const def = Define.from(defTok);
    const deq = tok(input);
    // TODO - handle this better...
    let found = -1;
    for (let i = 0; i < deq.length; i++) {
      if (Token.eq(defName, deq.get(i))) {
        deq.splice(found = i, 1);
        break;
      }
    }
    expect(found).to.not.equal(-1);
    expect(def.expand(deq, found)).to.equal(true);
    expect([...deq]).to.eql([...tok(output)]);
  }

  describe('with no parameters', function() {
    it('should expand in place', function() {
      testExpand('.define foo .bar baz',
                 'qux foo bar',
                 'qux .bar baz bar');
    });
  });

  describe('with unary C-style argument list', function() {
    it('should expand correctly when called without parens', function() {
      testExpand('.define foo(baz) .bar baz baz',
                 'qux foo bar',
                 'qux .bar bar bar');
    });

    it('should expand correctly when called with parens', function() {
      testExpand('.define foo(baz) .bar baz baz',
                 'qux foo(bar)',
                 'qux .bar bar bar');
    });

    it('should expand correctly when called with braces', function() {
      testExpand('.define foo(baz) .bar baz baz',
                 'qux foo {bar}',
                 'qux .bar bar bar');
    });

    it('should expand correctly when called with ({})', function() {
      testExpand('.define foo(baz) .bar baz baz',
                 'qux foo({bar})',
                 'qux .bar bar bar');
    });
  });

  describe('with n-ary C-style parameter list', function() {
    it('should expand correctly when called withut parens', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo x, y, z',
                 'qux 1 x 2 y 3 z 4');
    });

    it('should expand correctly with blanks in the middle', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo , , z',
                 'qux 1 2 3 z 4');
    });

    it('should expand correctly with one blank at the end', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo x, y',
                 'qux 1 x 2 y 3 4');
    });

    it('should expand correctly with two blanks at the end', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo x',
                 'qux 1 x 2 3 4');
    });

    it('should expand correctly with no parameters given', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo',
                 'qux 1 2 3 4');
    });

    it('should glob to end of line on last parameter', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo a b c d e, f g h i j, k l m n o',
                 'qux 1 a b c d e 2 f g h i j 3 k l m n o 4');
    });

    it('should expand a parenthesized call site', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo(x, y yy, z) w',
                 'qux 1 x 2 y yy 3 z 4 w');
    });

    it('should pass through braces in call-site', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo x, {y )}, {z}',
                 'qux 1 x 2 y ) 3 z 4');
    });

    it('should pass through braces in parenthesized call site', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo({x}, {y )}, {z})',
                 'qux 1 x 2 y ) 3 z 4');
    });

    it('should expand to end of line', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c 4',
                 'qux foo {x}, {y )}, {z} w',
                 'qux 1 x 2 y ) 3 {z} w 4');
    });

    it('should not retain a pair of braces in a single arg', function() {
      testExpand('.define foo(a, b) [a:b]',
                 'foo({1}{2}, 3)',
                 '[{1}{2} : 3]');
    });

    it('should retain non-single-group braces', function() {
      testExpand('.define foo(a, b) [a:b]',
                 'foo({1} 2, 3)',
                 '[{1} 2 : 3]');
      testExpand('.define foo(a, b) [a:b]',
                 'foo {1} 2, 3',
                 '[{1} 2 : 3]'); 
      testExpand('.define foo(a, b) [a:b]',
                 'foo(1, {2} 3)',
                 '[1 : {2} 3]'); 
    });

    it('should fail on parenthesized calls with too many args', function() {
      const define = Define.from(tok('.define foo(a, b) [a:b]'));
      expect(define.expand(tok('(1, 2, 3)'))).to.equal(false);      
    });

    // TODO - is it possible to make an invalid call???
    // TODO - junk at end of line?
  });
  // optional parens
  // skipping args implicitly
  // extra braces
  // don't inspect stray groups for delimiters
  //   (e.g. (\a,b)(1 {2, 3}, 4) => a=1 {2, 3}   b=4

  describe('with TeX-style argument list', function() {
    it('should capture empty last argument', function() {
      testExpand('.define foo {a b c} [a:b:c]',
                 'qux foo bar baz',
                 'qux [bar:baz:]');
    });

    it('should fail on empty undelimited argument', function() {
      const define = Define.from(tok('.define foo {a b c} [a:b:c]'));
      expect(define.expand(tok('bar'))).to.equal(false);      
    });

    it('should fail on missing delimiter', function() {
      const define = Define.from(tok('.define foo {a,b} [a:b]'));
      expect(define.expand(tok('bar baz qux'))).to.equal(false);      
    });

    it('should capture entire group for undelimited arg', function() {
      testExpand('.define foo {a b c} [a:b:c]',
                 'qux foo {bar baz} qux corge',
                 'qux [bar baz:qux:corge]');
    });

    it('should capture entire group for undelimited arg', function() {
      testExpand('.define foo {a b c} [a:b:c]',
                 'qux foo {bar baz} qux corge',
                 'qux [bar baz:qux:corge]');
    });

    it('should capture delimited arg', function() {
      testExpand('.define foo {a,b,c} [a:b:c]',
                 'qux foo bar baz, qux, corge',
                 'qux [bar baz:qux:corge]');
    });

    it('should retain braces for delimited arg', function() {
      testExpand('.define foo {a,b,c} [a:b:c]',
                 'qux foo {bar baz}, qux, corge',
                 'qux [{bar baz}:qux:corge]');
    });

    it('should skip param delimiter in braces', function() {
      testExpand('.define foo {a,b,c} [a:b:c]',
                 'qux foo {bar, baz}, qux, corge',
                 'qux [{bar, baz}:qux:corge]');
    });

    it('should not gobble to end of line if delimited at end', function() {
      testExpand('.define foo {a,b,c,} [a:b:c]',
                 'qux foo bar, baz, qux, corge',
                 'qux [bar:baz:qux] corge');
    });

    it('should allow arbitrary tokens as delimiters', function() {
      testExpand('.define foo {a .d b 1 c ]} [a:b:c]',
                 'qux foo bar .d baz 1 qux ] corge',
                 'qux [bar:baz:qux] corge');
    });
  });

});

function tok(str) {
  const d = new Deque([...tokenize(str)].map(s => {
    delete s.source;
    return s;
  }).filter(s => s.token !== 'eof' && s.token !== 'eol'));
  return d;
}
