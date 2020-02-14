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
      test(['.define foo {x, rest} [ x ] foo rest',
            '.define foo {x} [x]',
            'a foo 1, 2, 3'],
           mnemonic('a [ 1 ] [ 2 ] [ 3 ]'));
    });
  });
});

function mnemonic(line: string) { return parseLine('mnemonic', line); }
function label(line: string) { return parseLine('label', line); }
function assign(line: string) { return parseLine('assign', line); }
function directive(line: string) { return parseLine('directive', line); }
const [] = [label, assign, directive];

function parseLine(type: string, line: string): string {
  const ts = new TokenStream({});
  ts.enter(line);
  return `${type}(${ts.next().map(Token.name).join(' ')})`;
}
