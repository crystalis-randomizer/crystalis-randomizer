import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Token} from '../../src/js/asm/token';

const {LP, LB, RP, RB} = Token;

describe('Token', function() {
  describe('Token.eq', function() {
    it('should return true for different instances', function() {
      expect(Token.eq(op(':'), op(':'))).to.equal(true);
      expect(Token.eq(str('x'), str('x'))).to.equal(true);
      expect(Token.eq(ident('x'), ident('x'))).to.equal(true);
      expect(Token.eq(cs('.x'), cs('.x'))).to.equal(true);
      expect(Token.eq(num(1), num(1))).to.equal(true);
    });
    it('should return false for different token types', function() {
      expect(Token.eq(str('x'), ident('x'))).to.equal(false);
    });
    it('should return false for different operators', function() {
      expect(Token.eq(op('::'), op(':'))).to.equal(false);
    });
    it('should return false for different numbers', function() {
      expect(Token.eq(num(1), num(2))).to.equal(false);
    });
    it('should return false for different strings', function() {
      expect(Token.eq(str('x'), str('y'))).to.equal(false);
    });
    it('should return false for different identifiers', function() {
      expect(Token.eq(ident('x'), ident('y'))).to.equal(false);
    });
    it('should return false for different dirctives', function() {
      expect(Token.eq(cs('.x'), cs('.y'))).to.equal(false);
    });
    it('should return false for all groups', function() {
      expect(Token.eq(grp(), grp())).to.equal(false);
    });
    it('should return false any undefined', function() {
      expect(Token.eq(undefined, num(1))).to.equal(false);
      expect(Token.eq(num(1), undefined)).to.equal(false);
      expect(Token.eq(undefined, undefined)).to.equal(false);
    });
  });
  describe('Token.match', function() {
    it('should return true for different instances', function() {
      expect(Token.match(op(':'), op(':'))).to.equal(true);
      expect(Token.match(str('x'), str('x'))).to.equal(true);
      expect(Token.match(ident('x'), ident('x'))).to.equal(true);
      expect(Token.match(cs('.x'), cs('.x'))).to.equal(true);
      expect(Token.match(num(1), num(1))).to.equal(true);
    });
    it('should return false for different token types', function() {
      expect(Token.match(str('x'), ident('x'))).to.equal(false);
    });
    it('should return false for different operators', function() {
      expect(Token.match(op('::'), op(':'))).to.equal(false);
    });
    it('should return true for different numbers', function() {
      expect(Token.match(num(1), num(2))).to.equal(true);
    });
    it('should return true for different strings', function() {
      expect(Token.match(str('x'), str('y'))).to.equal(true);
    });
    it('should return false for different identifiers', function() {
      expect(Token.match(ident('x'), ident('y'))).to.equal(false);
    });
    it('should return false for different directives', function() {
      expect(Token.match(cs('.x'), cs('.y'))).to.equal(false);
    });
    it('should return true for any groups', function() {
      expect(Token.match(grp(num(1)), grp(str('x')))).to.equal(true);
    });
  });
  describe('Token.identsFromCList', function() {
    it('should return empty for an empty list', function() {
      expect(Token.identsFromCList([])).to.eql([]);
    });
    it('should return a single identifier from a singleton list', function() {
      expect(Token.identsFromCList([ident('x')])).to.eql(['x']);
    });
    it('should return two identifiers', function() {
      expect(Token.identsFromCList([ident('x'), op(','), ident('y')]))
          .to.eql(['x', 'y']);
    });
    it('should throw from bad separator', function() {
      expect(() => Token.identsFromCList([ident('x'), op(':'), ident('y')]))
          .to.throw(Error, /Expected comma: :/);
    });
    it('should throw from extra identifier', function() {
      expect(() => Token.identsFromCList([ident('x'), ident('y')]))
          .to.throw(Error, /Expected comma: y/);
    });
    it('should throw from non-identifier', function() {
      expect(() => Token.identsFromCList([ident('x'), op(','), cs('.y')]))
          .to.throw(Error, /Expected identifier: .y/i);
    });
  });
  describe('Token.findBalanced', function() {
    it('should find a close paren', function() {
      expect(Token.findBalanced([ident('x'), LP, num(1), RP, num(2)], 1))
          .to.equal(3);
    });
    it('should find a close square bracket', function() {
      expect(Token.findBalanced([ident('x'), LB, num(1), RB, num(2)], 1))
          .to.equal(3);
    });
    it('should skip over nested balanced groups', function() {
      expect(Token.findBalanced([num(1), LP, RB, LP, RP, RB, RP, num(2)], 1))
          .to.equal(6);
    });
    it('should throw on a non-grouping token', function() {
      expect(() => Token.findBalanced([num(1), LP, RP, num(2)], 0))
          .to.throw(Error, /non-grouping token/);;
    });
    it('should return -1 on a non-balanced group', function() {
      expect(Token.findBalanced([num(1), LP, num(2)], 1)).to.equal(-1);
    });
  });
  describe('Token.parseArgList', function() {
    it('should return a single empty arg for an empty list', function() {
      expect(Token.parseArgList([])).to.eql([[]]);
    });
    it('should return a singleton token', function() {
      expect(Token.parseArgList([num(1)])).to.eql([[num(1)]]);
    });
    it('should return multiple tokens in an arg', function() {
      expect(Token.parseArgList([num(1), num(2)])).to.eql([[num(1), num(2)]]);
    });
    it('should split args on comma', function() {
      expect(Token.parseArgList([num(1), op(','), num(2)]))
          .to.eql([[num(1)], [num(2)]]);
    });
    it('should skip a nested comma', function() {
      expect(Token.parseArgList([num(1), LP, op(','), RP, num(2)]))
          .to.eql([[num(1), LP, op(','), RP, num(2)]]);
    });
    it('should ignore square brackets', function() {
      expect(Token.parseArgList([num(1), LB, op(','), RB, num(2)]))
          .to.eql([[num(1), LB], [RB, num(2)]]);
    });
    it('should fail to parse unbalanced parentheses', function() {
      expect(() => Token.parseArgList([num(1), RP, op(','), LP, num(2)]))
          .to.throw(Error, /Unbalanced paren/);
    });
  });
  describe('Token.count', function() {
    it('should return 0 for an empty list', function() {
      expect(Token.count([])).to.equal(0);
    });
    it('should return 1 for an singleton list', function() {
      expect(Token.count([LP])).to.equal(1);
    }); 
    it('should return 2 for an doubleton list', function() {
      expect(Token.count([LP, RP])).to.equal(2);
    });
    it('should recurse into groups', function() {
      expect(Token.count([grp(LP, RP), grp(LB, RB)])).to.equal(8);
    });
  });
  describe('Token.isRegister', function() {
    it('should return true for registers', function() {
      expect(Token.isRegister(ident('a'), 'a')).to.equal(true);
      expect(Token.isRegister(ident('A'), 'a')).to.equal(true);
      expect(Token.isRegister(ident('x'), 'x')).to.equal(true);
      expect(Token.isRegister(ident('X'), 'x')).to.equal(true);
      expect(Token.isRegister(ident('y'), 'y')).to.equal(true);
      expect(Token.isRegister(ident('Y'), 'y')).to.equal(true);
    });
    it('should return false for wrong register', function() {
      expect(Token.isRegister(ident('a'), 'x')).to.equal(false);
      expect(Token.isRegister(ident('x'), 'a')).to.equal(false);
    });
    // TODO - fake registers return true, but TS won't allow passing it
  });
});

function ident(str: string): Token {
  return {token: 'ident', str};
}
function str(str: string): Token {
  return {token: 'str', str};
}
function op(str: string): Token {
  return {token: 'op', str};
}
function cs(str: string): Token {
  return {token: 'cs', str};
}
function num(num: number): Token {
  return {token: 'num', num};
}
function grp(...inner: Token[]): Token {
  return {token: 'grp', inner};
}
