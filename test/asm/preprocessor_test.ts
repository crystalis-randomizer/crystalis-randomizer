import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Preprocessor} from '../../src/js/asm/preprocessor';
import {Token} from '../../src/js/asm/token';
import {TokenStream} from '../../src/js/asm/tokenstream';
import * as util from 'util';

const [] = [util];
//const value = require('../dist/js/asm/value.js');

describe('Preprocessor', function() {

  function testPreprocess(lines: string[], want: Array<[string, string]>) {
    const code = lines.join('\n');
    const toks = new TokenStream({});
    toks.enter(code, 'input.s');
    let id = 0;
    const idGen = {next: () => ++id};
    // TODO - figure out what's up with env
    const out =
        [...new Preprocessor(toks, idGen, null!)]
            .map(({kind, tokens}) => [kind, tokens.map(Token.name).join(' ')]);
    expect(out).to.eql(want);
  }

  describe('.define', function() {
    it('should expand with no parameters', function() {
      testPreprocess([
        '.define foo x 1 y 2 z',
        'foo foo',
      ], [
        ['mnemonic', 'x 1 y 2 z x 1 y 2 z'],
      ]);
    });
  });
});
