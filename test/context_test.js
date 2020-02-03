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
    it('should handle missing token lists', function() {
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
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo x, y, z',
                 'qux 1 x 2 y 3 z');
    });

    it('should expand correctly with blanks in the middle', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo , , z',
                 'qux 1 2 3 z');
    });

    it('should expand correctly with one blank at the end', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo x, y',
                 'qux 1 x 2 y 3');
    });

    it('should expand correctly with two blanks at the end', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo x',
                 'qux 1 x 2 3');
    });

    it('should expand correctly with no parameters given', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo',
                 'qux 1 2 3');
    });

    it('should glob to end of line on last parameter', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo a b c d e, f g h i j, k l m n o',
                 'qux 1 a b c d e 2 f g h i j 3 k l m n o');
    });

    it('should handle parenthesized call site', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo(x, y w, z)',
                 'qux 1 x 2 y w 3 z');
    });

    it('should handle braces in call-site', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo {x}, {y )}, {z}',
                 'qux 1 x 2 y ) 3 z');
    });

    it('should handle braces in parenthesized call site', function() {
      testExpand('.define foo(a, b, c) 1 a 2 b 3 c',
                 'qux foo({x}, {y )}, {z})',
                 'qux 1 x 2 y ) 3 z');
    });

    // TODO - missing final param(s)
    // TODO - is it possible to make an invalid call???
    // TODO - junk at end of line?


  });
  // optional parens
  // skipping args implicitly
  // extra braces
});

function tok(str) {
  const d = new Deque([...tokenize(str)].map(s => {
    delete s.source;
    return s;
  }).filter(s => s.token !== 'eof' && s.token !== 'eol'));
  return d;
}
