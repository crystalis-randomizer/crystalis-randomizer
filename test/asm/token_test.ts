import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Token} from '../../src/js/asm/token';

describe('Token.eq', function() {
  it('should return true for different instances', function() {
    expect(Token.eq({token: 'op', str: ':'}, Token.COLON)).to.equal(true);
  });
  it('should return false for different operators', function() {
    expect(Token.eq({token: 'op', str: '::'}, Token.COLON)).to.equal(false);
  });
  it('should return false for different token types', function() {
    expect(Token.eq({token: 'str', str: 'x'}, {token: 'ident', str: 'x'}))
        .to.equal(false);
  });
});
