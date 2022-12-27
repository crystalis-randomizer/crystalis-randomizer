import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Preprocessor} from '../../src/js/asm/preprocessor';
import {Token} from '../../src/js/asm/token';
import {TokenStream} from '../../src/js/asm/tokenstream';
import {Tokenizer} from '../../src/js/asm/tokenizer';
import * as util from 'util';

const [] = [util];

describe('Preprocessor', function() {

  function test(lines: string[], ...want: string[]) {
    const code = lines.join('\n');
    const toks = new TokenStream();
    toks.enter(new Tokenizer(code, 'input.s'));
    // TODO - figure out what's up with env
    const out: string[] = [];
    const preprocessor = new Preprocessor(toks, {} as any);
    for (let line = preprocessor.next(); line; line = preprocessor.next()) {
      out.push(line.map(Token.name).join(' '));
    }
    expect(out).to.eql(want);
  }

  function testError(lines: string[], msg: RegExp) {
    const code = lines.join('\n');
    const toks = new TokenStream();
    toks.enter(new Tokenizer(code, 'input.s'));
    // TODO - figure out what's up with env
    const preprocessor = new Preprocessor(toks, {} as any);
    expect(() => { while (preprocessor.next()); })
        .to.throw(Error, msg);
  }

  describe('pass-through', function() {
    it('should pass through an instruction', function() {
      test(['lda #$01'], instruction('lda #$01'));
    });

    it('should pass through two instructions', function() {
      test(['lda #$01', 'sta $02'],
           instruction('lda #$01'),
           instruction('sta $02'));
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
           instruction('x 1 y 2 z x 1 y 2 z'));
    });

    it('should expand a C-style macro with parameters', function() {
      test(['.define foo(x, y) [ x : y ]', 'a foo(2, 3)'],
           instruction('a [ 2 : 3 ]'));
    });

    it('should expand a TeX-style macro with parameters', function() {
      test(['.define foo {x y} [ x : y ]', 'a foo 2 3'],
           instruction('a [ 2 : 3 ]'));
    });

    it('should expand an overloaded TeX-style macro', function() {
      test(['.define foo {x, rest .eol} [ x ] foo rest',
            '.define foo {x} [x]',
            'a foo 1, 2, 3'],
           instruction('a [ 1 ] [ 2 ] [ 3 ]'));
    });

    it('should expand a macro with .eol in the production', function() {
      test(['.define foo {x y} [ x ] .eol b y 5',
            '.define bar {x} ( x )',
            'a foo 1 bar'],
           instruction('a [ 1 ]'),
           instruction('b ( 5 )'));
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
           instruction('a 6'));
    });

    it('should terminate instead of recursing infinitely', function() {
      testError(['.define x x', 'x'], /Maximum expansion depth reached: x/);
    });
  });

  describe('.tcount', function() {
    it('should count the number of tokens', function() {
      test(['a .tcount(1 1 1)'],
           instruction('a 3'));
    });

    it('should absorb one layer of braces', function() {
      test(['a .tcount({1 1 1})'],
           instruction('a 3'));
    });

    it('should count the second layer of braces', function() {
      test(['a .tcount({{1 1 1}})'],
           instruction('a 5'));
    });
  });

  describe('.string', function() {
    it('should produce a string', function() {
      test(['a .string(b)'], instruction('a "b"'));
    });
  });

  describe('.concat', function() {
    it('should join strings', function() {
      test(['a .concat("b", "c", "d")'], instruction('a "bcd"'));
    });

    it('should expand its argument first', function() {
      test(['a .concat("b", .string(c), "d")'], instruction('a "bcd"'));
    });
  });

  describe('.ident', function() {
    it('should produce an identifier', function() {
      test(['.ident("b")'], instruction('b'));
    });

    it('should expand its argument first', function() {
      test(['.ident(.concat("a", .string(b), "c"))'],
           instruction('abc'));
    });
  });

  describe('.skip', function() {
    it('should skip over .define', function() {
      test(['.define abc def',
            '.skip .define abc xyz',
            '.undefine abc',
            'def'],
           instruction('xyz'));
    });

    it('should descend into groups', function() {
      test(['.define bar a',
            '.define foo (x) .skip .noexpand .skip { bar bar x }',
            '.undefine bar',
            'foo 5'],
           instruction('a bar 5'));
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
           instruction('x y'),
           instruction('y z'),
           instruction('z x'));
    });

    it('should not pre-expand production', function() {
      test(['.define b c',
            '.macro q a',
            'b .tcount({a})',
            '.endmacro',
            '.undefine b',
            'q a b c d e'],
           instruction('b 5'));
    });

    it('should fill in unfilled args with blank', function() {
      test(['.macro q a,b,c',
            'x .tcount({a}) .tcount({b}) .tcount({c})',
            '.endmacro',
            'q ,a a c c'],
           instruction('x 0 4 0'));
    });

    it('should recurse', function() {
      test(['.macro q a,b,c',
            'x a',
            '.ifnblank b',
            'q b,c',
            '.endif',
            '.endmacro',
            'q 3,1,2'],
           instruction('x 3'),
           instruction('x 1'),
           instruction('x 2'));
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
           instruction('x 3'),
           instruction('x 1'),
           instruction('x 2'));
    });

    it('should terminate instead of recursing infinitely', function() {
      testError(['.macro q',
                 'q',
                 '.endmacro',
                 'q'],
                /stack overflow/i);
    });
  });

  describe('.repeat', function() {
    it('should repeat its argument', function() {
      test(['.repeat 5',
            'foo',
            '.endrep'],
           instruction('foo'),
           instruction('foo'),
           instruction('foo'),
           instruction('foo'),
           instruction('foo'));
    });

    it('should expand the current position', function() {
      test(['.repeat 5, i',
            'foo i',
            '.endrep'],
           instruction('foo 0'),
           instruction('foo 1'),
           instruction('foo 2'),
           instruction('foo 3'),
           instruction('foo 4'));
    });

    it('should support nested repeats', function() {
      test(['.repeat 4, i',
            '.repeat i, j',
            'foo j i',
            '.endrep',
            '.endrep'],
           instruction('foo 0 1'),
           instruction('foo 0 2'),
           instruction('foo 1 2'),
           instruction('foo 0 3'),
           instruction('foo 1 3'),
           instruction('foo 2 3'));
    });
  });

  describe('.if', function() {
    it('should expand the then branch', function() {
      test(['.if 1',
            'x y',
            '.else',
            'a b',
            '.endif',
            'z'],
           instruction('x y'),
           instruction('z'));
    });

    it('should expand the else branch', function() {
      test(['.if 0',
            'x y',
            '.else',
            'a b',
            '.endif',
            'z'],
           instruction('a b'),
           instruction('z'));
    });

    it('should handle else-if', function() {
      test(['.if 0',
            'a b',
            '.elseif 1',
            'c d',
            '.elseif 2',
            'e f',
            '.else',
            'g h',
            '.endif',
            'z'],
           instruction('c d'),
           instruction('z'));
    });

    it('should handle nested ifs', function() {
      test(['.if 0',
            '  a',
            '  .if 1',
            '    b',
            '  .else',
            '    c',
            '  .endif',
            '  d',
            '.else',
            '  e',
            '  .if 1',
            '    f',
            '  .else',
            '    g',
            '  .endif',
            '  h',
            '.endif',
            'z'],
           instruction('e'),
           instruction('f'),
           instruction('h'),
           instruction('z'));
    });
  });
  // TODO - test .local, both for symbols AND for defines.

  // TODO - tests for .if, make sure it evaluates numbers, etc...

});

function instruction(line: string) { return parseLine(line); }
function label(line: string) { return parseLine(line); }
function assign(line: string) { return parseLine(line); }
function directive(line: string) { return parseLine(line); }

function parseLine(line: string): string {
  const ts = new TokenStream();
  ts.enter(new Tokenizer(line));
  return ts.next()!.map(Token.name).join(' ');
}
