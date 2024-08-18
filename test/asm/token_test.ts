import {describe, it, expect} from 'bun:test';
import {Token} from '../../src/js/asm/token';

const {LP, LB, RP, RB} = Token;

describe('Token', function() {
  describe('Token.eq', function() {
    it('should return true for different instances', function() {
      expect(Token.eq(op(':'), op(':'))).toBe(true);
      expect(Token.eq(str('x'), str('x'))).toBe(true);
      expect(Token.eq(ident('x'), ident('x'))).toBe(true);
      expect(Token.eq(cs('.x'), cs('.x'))).toBe(true);
      expect(Token.eq(num(1), num(1))).toBe(true);
    });
    it('should return false for different token types', function() {
      expect(Token.eq(str('x'), ident('x'))).toBe(false);
    });
    it('should return false for different operators', function() {
      expect(Token.eq(op('::'), op(':'))).toBe(false);
    });
    it('should return false for different numbers', function() {
      expect(Token.eq(num(1), num(2))).toBe(false);
    });
    it('should return false for different strings', function() {
      expect(Token.eq(str('x'), str('y'))).toBe(false);
    });
    it('should return false for different identifiers', function() {
      expect(Token.eq(ident('x'), ident('y'))).toBe(false);
    });
    it('should return false for different dirctives', function() {
      expect(Token.eq(cs('.x'), cs('.y'))).toBe(false);
    });
    it('should return false for all groups', function() {
      expect(Token.eq(grp(), grp())).toBe(false);
    });
    it('should return false any undefined', function() {
      expect(Token.eq(undefined, num(1))).toBe(false);
      expect(Token.eq(num(1), undefined)).toBe(false);
      expect(Token.eq(undefined, undefined)).toBe(false);
    });
  });
  describe('Token.match', function() {
    it('should return true for different instances', function() {
      expect(Token.match(op(':'), op(':'))).toBe(true);
      expect(Token.match(str('x'), str('x'))).toBe(true);
      expect(Token.match(ident('x'), ident('x'))).toBe(true);
      expect(Token.match(cs('.x'), cs('.x'))).toBe(true);
      expect(Token.match(num(1), num(1))).toBe(true);
    });
    it('should return false for different token types', function() {
      expect(Token.match(str('x'), ident('x'))).toBe(false);
    });
    it('should return false for different operators', function() {
      expect(Token.match(op('::'), op(':'))).toBe(false);
    });
    it('should return true for different numbers', function() {
      expect(Token.match(num(1), num(2))).toBe(true);
    });
    it('should return true for different strings', function() {
      expect(Token.match(str('x'), str('y'))).toBe(true);
    });
    it('should return false for different identifiers', function() {
      expect(Token.match(ident('x'), ident('y'))).toBe(false);
    });
    it('should return false for different directives', function() {
      expect(Token.match(cs('.x'), cs('.y'))).toBe(false);
    });
    it('should return true for any groups', function() {
      expect(Token.match(grp(num(1)), grp(str('x')))).toBe(true);
    });
  });
  describe('Token.identsFromCList', function() {
    it('should return empty for an empty list', function() {
      expect(Token.identsFromCList([])).toEqual([]);
    });
    it('should return a single identifier from a singleton list', function() {
      expect(Token.identsFromCList([ident('x')])).toEqual(['x']);
    });
    it('should return two identifiers', function() {
      expect(Token.identsFromCList([ident('x'), op(','), ident('y')]))
          .toEqual(['x', 'y']);
    });
    it('should throw from bad separator', function() {
      expect(() => Token.identsFromCList([ident('x'), op(':'), ident('y')]))
          .toThrow(/Expected comma: :/);
    });
    it('should throw from extra identifier', function() {
      expect(() => Token.identsFromCList([ident('x'), ident('y')]))
          .toThrow(/Expected comma: y/);
    });
    it('should throw from non-identifier', function() {
      expect(() => Token.identsFromCList([ident('x'), op(','), cs('.y')]))
          .toThrow(/Expected identifier: .y/i);
    });
  });
  describe('Token.findBalanced', function() {
    it('should find a close paren', function() {
      expect(Token.findBalanced([ident('x'), LP, num(1), RP, num(2)], 1))
          .toBe(3);
    });
    it('should find a close square bracket', function() {
      expect(Token.findBalanced([ident('x'), LB, num(1), RB, num(2)], 1))
          .toBe(3);
    });
    it('should skip over nested balanced groups', function() {
      expect(Token.findBalanced([num(1), LP, RB, LP, RP, RB, RP, num(2)], 1))
          .toBe(6);
    });
    it('should throw on a non-grouping token', function() {
      expect(() => Token.findBalanced([num(1), LP, RP, num(2)], 0))
          .toThrow(/non-grouping token/);;
    });
    it('should return -1 on a non-balanced group', function() {
      expect(Token.findBalanced([num(1), LP, num(2)], 1)).toBe(-1);
    });
  });
  describe('Token.parseArgList', function() {
    it('should return a single empty arg for an empty list', function() {
      expect(Token.parseArgList([])).toEqual([[]]);
    });
    it('should return a singleton token', function() {
      expect(Token.parseArgList([num(1)])).toEqual([[num(1)]]);
    });
    it('should return multiple tokens in an arg', function() {
      expect(Token.parseArgList([num(1), num(2)])).toEqual([[num(1), num(2)]]);
    });
    it('should split args on comma', function() {
      expect(Token.parseArgList([num(1), op(','), num(2)]))
          .toEqual([[num(1)], [num(2)]]);
    });
    it('should skip a nested comma', function() {
      expect(Token.parseArgList([num(1), LP, op(','), RP, num(2)]))
          .toEqual([[num(1), LP, op(','), RP, num(2)]]);
    });
    it('should ignore square brackets', function() {
      expect(Token.parseArgList([num(1), LB, op(','), RB, num(2)]))
          .toEqual([[num(1), LB], [RB, num(2)]]);
    });
    it('should fail to parse unbalanced parentheses', function() {
      expect(() => Token.parseArgList([num(1), RP, op(','), LP, num(2)]))
          .toThrow(/Unbalanced paren/);
    });
  });
  describe('Token.count', function() {
    it('should return 0 for an empty list', function() {
      expect(Token.count([])).toBe(0);
    });
    it('should return 1 for an singleton list', function() {
      expect(Token.count([LP])).toBe(1);
    }); 
    it('should return 2 for an doubleton list', function() {
      expect(Token.count([LP, RP])).toBe(2);
    });
    it('should recurse into groups', function() {
      expect(Token.count([grp(LP, RP), grp(LB, RB)])).toBe(8);
    });
  });
  describe('Token.isRegister', function() {
    it('should return true for registers', function() {
      expect(Token.isRegister(ident('a'), 'a')).toBe(true);
      expect(Token.isRegister(ident('A'), 'a')).toBe(true);
      expect(Token.isRegister(ident('x'), 'x')).toBe(true);
      expect(Token.isRegister(ident('X'), 'x')).toBe(true);
      expect(Token.isRegister(ident('y'), 'y')).toBe(true);
      expect(Token.isRegister(ident('Y'), 'y')).toBe(true);
    });
    it('should return false for wrong register', function() {
      expect(Token.isRegister(ident('a'), 'x')).toBe(false);
      expect(Token.isRegister(ident('x'), 'a')).toBe(false);
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
