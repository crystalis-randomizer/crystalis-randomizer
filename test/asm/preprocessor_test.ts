import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Preprocessor} from '../../src/js/asm/preprocessor';
import {Token} from '../../src/js/asm/token';
import {TokenStream} from '../../src/js/asm/tokenstream';
import * as util from 'util';

const [] = [util];
//const value = require('../dist/js/asm/value.js');

describe('Preprocessor', function() {

  function test(lines: string[], ...want: string[]) {
    const code = lines.join('\n');
    const toks = new TokenStream({});
    toks.enter(code, 'input.s');
    let id = 0;
    const idGen = {next: () => ++id};
    // TODO - figure out what's up with env
    const out = [...new Preprocessor(toks, idGen, null!)];
    const mapped = out
            .map(({kind, tokens}) => `${kind}(${
                                      tokens.map(Token.name).join(' ')})`);
    expect(mapped).to.eql(want);
  }

  function testError(lines: string[], msg: RegExp) {
    const code = lines.join('\n');
    const toks = new TokenStream({});
    toks.enter(code, 'input.s');
    let id = 0;
    const idGen = {next: () => ++id};
    // TODO - figure out what's up with env
    expect(() => [...new Preprocessor(toks, idGen, null!)])
        .to.throw(Error, msg);
  }

  describe('pass-through', function() {
    it('should pass through a mnemonic', function() {
      test(['lda #$01'], mnemonic('lda #$01'));
    });

    it('should pass through two mnemonics', function() {
      test(['lda #$01', 'sta $02'],
           mnemonic('lda #$01'),
           mnemonic('sta $02'));
    });

    it('should pass through a label', function() {
      test(['foo:'], label('foo:'));
    });

    it('should pass through an immutable assignment', function() {
      test(['foo = 1'], assign('foo = 1'));
    });

    it('should pass through a mutable assignment', function() {
      test(['foo .set 1'], assign('foo .set 1'));
    });

    it('should pass through a directive', function() {
      test(['.reloc'], directive('.reloc'));
    });
  });

  describe('.define', function() {
    it('should expand with no parameters', function() {
      test(['.define foo x 1 y 2 z', 'foo foo'],
           mnemonic('x 1 y 2 z x 1 y 2 z'));
    });

    it('should expand a C-style macro with parameters', function() {
      test(['.define foo(x, y) [ x : y ]', 'a foo(2, 3)'],
           mnemonic('a [ 2 : 3 ]'));
    });

    it('should expand a TeX-style macro with parameters', function() {
      test(['.define foo {x y} [ x : y ]', 'a foo 2 3'],
           mnemonic('a [ 2 : 3 ]'));
    });

    it('should expand an overloaded TeX-style macro', function() {
      test(['.define foo {x, rest .eol} [ x ] foo rest',
            '.define foo {x} [x]',
            'a foo 1, 2, 3'],
           mnemonic('a [ 1 ] [ 2 ] [ 3 ]'));
    });

    it('should expand a macro with .eol in the production', function() {
      test(['.define foo {x y} [ x ] .eol b y 5',
            '.define bar {x} ( x )',
            'a foo 1 bar'],
           mnemonic('a [ 1 ]'),
           mnemonic('b ( 5 )'));
    });

    it('should be able to refer to not-yet-defined macros', function() {
      test(['.define foo bar',
            '.out foo',
            '.define bar baz',
            '.out foo',
            '.undefine bar',
            '.define bar qux',
            '.out foo'],
           directive('.out bar'),
           directive('.out baz'),
           directive('.out qux'));
    });

    it('should allow not expanding the production', function() {
      test(['.define foo (x) .noexpand .tcount(x(a b))',
            '.define bar (x) x x x',
            'a foo bar'],
           mnemonic('a 6'));
    });

    it('should terminate instead of recursing infinitely', function() {
      testError(['.define x x', 'x'], /Maximum expansion depth reached: x/);
    });
  });

  describe('.tcount', function() {
    it('should count the number of tokens', function() {
      test(['a .tcount(1 1 1)'],
           mnemonic('a 3'));
    });

    it('should absorb one layer of braces', function() {
      test(['a .tcount({1 1 1})'],
           mnemonic('a 3'));
    });

    it('should count the second layer of braces', function() {
      test(['a .tcount({{1 1 1}})'],
           mnemonic('a 5'));
    });
  });

  describe('.string', function() {
    it('should produce a string', function() {
      test(['a .string(b)'], mnemonic('a "b"'));
    });
  });

  describe('.concat', function() {
    it('should join strings', function() {
      test(['a .concat("b", "c", "d")'], mnemonic('a "bcd"'));
    });

    it('should expand its argument first', function() {
      test(['a .concat("b", .string(c), "d")'], mnemonic('a "bcd"'));
    });
  });

  describe('.ident', function() {
    it('should produce an identifier', function() {
      test(['.ident("b")'], mnemonic('b'));
    });

    it('should expand its argument first', function() {
      test(['.ident(.concat("a", .string(b), "c"))'],
           mnemonic('abc'));
    });
  });

  describe('.skip', function() {
    it('should skip over .define', function() {
      test(['.define abc def',
            '.skip .define abc xyz',
            '.undefine abc',
            'def'],
           mnemonic('xyz'));
    });

    it('should descend into groups', function() {
      test(['.define bar a',
            '.define foo (x) .skip .noexpand .skip { bar bar x }',
            '.undefine bar',
            'foo 5'],
           mnemonic('a bar 5'));
    });
  });

  describe('.macro', function() {
    it('should expand', function() {
      test(['.macro q a, b, c',
            'a b',
            'b c',
            'c a',
            '.endmacro',
            'q x, y, z'],
           mnemonic('x y'),
           mnemonic('y z'),
           mnemonic('z x'));
    });

    it('should not pre-expand production', function() {
      test(['.define b c',
            '.macro q a',
            'b .tcount({a})',
            '.endmacro',
            '.undefine b',
            'q a b c d e'],
           mnemonic('b 5'));
    });

    it('should fill in unfilled args with blank', function() {
      test(['.macro q a,b,c',
            'x .tcount({a}) .tcount({b}) .tcount({c})',
            '.endmacro',
            'q ,a a c c'],
           mnemonic('x 0 4 0'));
    });

    it('should recurse', function() {
      test(['.macro q a,b,c',
            'x a',
            '.ifnblank b',
            'q b,c',
            '.endif',
            '.endmacro',
            'q 3,1,2'],
           mnemonic('x 3'),
           mnemonic('x 1'),
           mnemonic('x 2'));
    });

    it('should support .exitmacro', function() {
      test(['.macro q a,b,c',
            'x a',
            '.ifblank b',
            '.exitmacro',
            '.endif',
            'q b,c',
            '.endmacro',
            'q 3,1,2'],
           mnemonic('x 3'),
           mnemonic('x 1'),
           mnemonic('x 2'));
    });

    it('should terminate instead of recursing infinitely', function() {
      testError(['.macro q',
                 'q',
                 '.endmacro',
                 'q'],
                /stack overflow/i);
    });
  });

  // TODO - test .local, both for symbols AND for defines.

  // TODO - tests for .if, make sure it evaluates numbers, etc...

});

function mnemonic(line: string) { return parseLine('mnemonic', line); }
function label(line: string) { return parseLine('label', line); }
function assign(line: string) { return parseLine('assign', line); }
function directive(line: string) { return parseLine('directive', line); }

function parseLine(type: string, line: string): string {
  const ts = new TokenStream({});
  ts.enter(line);
  return `${type}(${ts.next().map(Token.name).join(' ')})`;
}
