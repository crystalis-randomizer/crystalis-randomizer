import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Cpu} from '../../src/js/asm/cpu';
import {Expr} from '../../src/js/asm/expr';
import {Module} from '../../src/js/asm/module';
import {Processor} from '../../src/js/asm/processor';
import {Token} from '../../src/js/asm/token';
import * as util from 'util';

const [] = [util];

function ident(str: string): Token { return {token: 'ident', str}; }
function num(num: number): Token { return {token: 'num', num}; }
function str(str: string): Token { return {token: 'str', str}; }
function cs(str: string): Token { return {token: 'cs', str}; }
function op(str: string): Token { return {token: 'op', str}; }
const {COLON, COMMA, ASSIGN, IMMEDIATE, LP, RP} = Token;
const ORG = cs('.org');
const RELOC = cs('.reloc');
const ASSERT = cs('.assert');
const SEGMENT = cs('.segment');

const [] = [str, COMMA, LP, RP, ORG, RELOC, ASSERT, SEGMENT];

describe('Processor', function() {

  describe('Simple instructions', function() {
    it('should handle `lda #$03`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('lda'), IMMEDIATE, num(3)]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0xa9, 3)}],
        symbols: [],
      });
    });

    it('should handle `sta $02`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('sta'), num(2)]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x85, 2)}],
        symbols: [],
      });
    });

    it('should handle `ldy $032f`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('ldy'), num(0x32f)]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0xac, 0x2f, 3)}],
        symbols: [],
      });
    });

    it('should handle `rts`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('rts')]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x60)}],
        symbols: [],
      });
    });

    it('should handle `lda ($24),y`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('lda'), LP, num(0x24), RP, COMMA, ident('y')]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0xb1, 0x24)}],
        symbols: [],
      });
    });

    it('should handle `sta ($0320,x)`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('sta'), LP, num(0x320), COMMA, ident('x'), RP]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x81, 0x20, 3)}],
        symbols: [],
      });
    });

    it('should handle `lsr`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('lsr')]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x4a)}],
        symbols: [],
      });
    });

    it('should handle `lsr a`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('lsr'), ident('A')]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x4a)}],
        symbols: [],
      });
    });

    it('should handle `ora $480,x`', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('ora'), num(0x480), COMMA, ident('x')]);
      expect(strip(p.result())).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x1d, 0x80, 4)}],
        symbols: [],
      });
    });
  });

  describe('Symbols', function() {
    it('should fill in an immediately-available value', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('val'), ASSIGN, num(0x23)]);
      p.instruction([ident('lda'), IMMEDIATE, ident('val')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xa9, 0x23),
        }],
        symbols: [],
        segments: [],
      });
    });

    it('should fill in an immediately-available label', function() {
      const p = new Processor(Cpu.P02);
      p.org(0x9135);
      p.label('foo');
      p.instruction([ident('ldx'), IMMEDIATE, op('<'), ident('foo')]);
      p.instruction([ident('ldy'), IMMEDIATE, op('>'), ident('foo')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          org: 0x9135,
          data: Uint8Array.of(0xa2, 0x35, 0xa0, 0x91),
        }],
        symbols: [],
        segments: [],
      });
    });

    it('should substitute a forward referenced value', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('lda'), IMMEDIATE, ident('val')]);
      p.assign([ident('val'), ASSIGN, num(0x23)]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xa9, 0xff),
          subs: [{offset: 1, size: 1, expr: {op: 'sym', num: 0}}],
        }],
        symbols: [{expr: {op: 'num', num: 0x23, size: 1}}],
        segments: [],
      });
    });

    it('should substitute a forward referenced label', function() {
      const p = new Processor(Cpu.P02);
      p.directive('.org', [cs('.org'), num(0x8000)]);
      p.instruction([ident('jsr'), ident('foo')]);
      p.instruction([ident('lda'), IMMEDIATE, num(0)]);
      p.label('foo');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          org: 0x8000,
          data: Uint8Array.of(0x20, 0xff, 0xff,
                              0xa9, 0x00),
          subs: [{offset: 1, size: 2, expr: {op: 'sym', num: 0}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 5}}],
        segments: [],
      });
    });

    it('should allow overwriting mutable symbols', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('foo'), cs('.set'), num(5)]);
      p.instruction([ident('lda'), IMMEDIATE, ident('foo')]);
      p.assign([ident('foo'), cs('.set'), num(6)]);
      p.instruction([ident('lda'), IMMEDIATE, ident('foo')]);

      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xa9, 5, 0xa9, 6),
        }],
        symbols: [], segments: []});
    });

    it('should not allow redefining immutable symbols', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('foo'), op('='), num(5)]);
      expect(() => p.assign([ident('foo'), op('='), num(5)]))
          .to.throw(Error, /Redefining symbol foo/);
      expect(() => p.label('foo')).to.throw(Error, /Redefining symbol foo/);
    });

    it('should not allow redefining labels', function() {
      const p = new Processor(Cpu.P02);
      p.label('foo');
      expect(() => p.assign([ident('foo'), op('='), num(5)]))
          .to.throw(Error, /Redefining symbol foo/);
      expect(() => p.label('foo')).to.throw(Error, /Redefining symbol foo/);
    });
  });

  describe('Cheap locals', function() {
    it('should handle backward refs', function() {
      const p = new Processor(Cpu.P02);
      p.label('@foo');
      p.instruction([ident('ldx'), IMMEDIATE, op('<'), ident('@foo')]);
      p.instruction([ident('ldy'), IMMEDIATE, op('>'), ident('@foo')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xa2, 0xff, 0xa0, 0xff),
          subs: [{
            offset: 1, size: 1,
            expr: {op: '<', size: 1, args: [{op: 'off', chunk: 0, num: 0}]},
          }, {
            offset: 3, size: 1,
            expr: {op: '>', size: 1, args: [{op: 'off', chunk: 0, num: 0}]},
          }],
        }],
        symbols: [],
        segments: [],
      });
    });

    it('should hanle forward refs', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('jsr'), ident('@foo')]);
      p.instruction([ident('lda'), IMMEDIATE, num(0)]);
      p.label('@foo');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0x20, 0xff, 0xff,
                              0xa9, 0x00),
          subs: [{offset: 1, size: 2, expr: {op: 'sym', num: 0}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 5}}],
        segments: [],
      });
    });

    it('should not allow using a cheap local name for non-labels', function() {
      const p = new Processor(Cpu.P02);
      expect(() => p.assign([ident('@foo'), op('='), num(5)]))
          .to.throw(Error, /Cheap locals may only be labels: @foo/);
    });

    it('should not allow reusing names in the same cheap scope', function() {
      const p = new Processor(Cpu.P02);
      p.label('@foo');
      expect(() => p.label('@foo')).to.throw(Error, /Redefining symbol @foo/);
    });

    it('should clear the scope on a non-cheap label', function() {
      const p = new Processor(Cpu.P02);
      p.label('@foo');
      p.instruction([ident('jsr'), ident('@foo')]);
      p.label('bar');
      p.instruction([ident('jsr'), ident('@foo')]);
      p.label('@foo');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0x20, 0xff, 0xff,
                              0x20, 0xff, 0xff),
          subs: [
            {offset: 1, size: 2, expr: {op: 'off', chunk: 0, num: 0}},
            {offset: 4, size: 2, expr: {op: 'sym', num: 0}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 6}}],
        segments: [],
      });
    });

    it('should not clear the scope on a symbol', function() {
      const p = new Processor(Cpu.P02);
      p.label('@foo');
      p.assign([ident('bar'), op('='), num(2)]);
      expect(() => p.label('@foo')).to.throw(Error, /Redefining symbol @foo/);
    });

    it('should be an error if a cheap label is never defined', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('jsr'), ident('@foo')]);
      expect(() => p.label('bar'))
          .to.throw(Error, /Cheap local label never defined: @foo/);
      expect(() => p.result())
          .to.throw(Error, /Cheap local label never defined: @foo/);
    });
  });

  describe('Anonymous labels', function() {
    it('should work for forward references', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('bne'), op(':'), op('++')]);
      p.label(':');
      p.instruction([ident('bcc'), op(':'), op('+++')]);
      p.label(':'); // first target
      p.instruction([ident('lsr')]);
      p.label(':');
      p.instruction([ident('lsr')]);
      p.label(':'); // second target
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xd0, 0xff, 0x90, 0xff, 0x4a, 0x4a),
          subs: [{offset: 1, size: 1,
                  expr: {op: '-', args: [{op: 'sym', num: 0},
                                         {op: 'off', num: 2, chunk: 0}]}},
                 {offset: 3, size: 1,
                  expr: {op: '-', args: [{op: 'sym', num: 1},
                                         {op: 'off', num: 4, chunk: 0}]}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 4}},
                  {expr: {op: 'off', chunk: 0, num: 6}}],
        segments: []});
    });

    it('should work for backward references', function() {
      const p = new Processor(Cpu.P02);
      p.label(':'); // first target
      p.instruction([ident('lsr')]);
      p.label(':');
      p.instruction([ident('lsr')]);
      p.instruction([ident('lsr')]);
      p.label(':'); // second target
      p.instruction([ident('bne'), op(':'), op('---')]);
      p.label(':');
      p.instruction([ident('bcc'), op(':'), op('--')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0x4a, 0x4a, 0x4a, 0xd0, 0xfb, 0x90, 0xfc),
        }],
        symbols: [], segments: []});
    });

    it('should allow one label for both forward directions', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('bne'), op(':'), op('+')]);
      p.label(':');
      p.instruction([ident('bcc'), op(':'), op('-')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xd0, 0xff, 0x90, 0xfe),
          subs: [{offset: 1, size: 1,
                  expr: {op: '-', args: [{op: 'sym', num: 0},
                                         {op: 'off', num: 2, chunk: 0}]}}],
        }],
        symbols: [{expr: {op: 'off', num: 2, chunk: 0}}],
        segments: []});
    });
  });

  describe('Relative labels', function() {
    it('should work for forward references', function() {
      const p = new Processor(Cpu.P02);
      p.instruction([ident('bne'), op('++')]);
      p.label('+');
      p.instruction([ident('bcc'), op('+++')]);
      p.label('++');
      p.instruction([ident('lsr')]);
      p.instruction([ident('lsr')]);
      p.label('+++');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xd0, 0xff, 0x90, 0xff, 0x4a, 0x4a),
          subs: [{offset: 1, size: 1,
                  expr: {op: '-', args: [{op: 'sym', num: 0},
                                         {op: 'off', num: 2, chunk: 0}]}},
                 {offset: 3, size: 1,
                  expr: {op: '-', args: [{op: 'sym', num: 1},
                                         {op: 'off', num: 4, chunk: 0}]}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 4}},
                  {expr: {op: 'off', chunk: 0, num: 6}}],
        segments: []});
    });

    it('should work for backward references', function() {
      const p = new Processor(Cpu.P02);
      p.label('--'); // first target
      p.instruction([ident('lsr')]);
      p.instruction([ident('lsr')]);
      p.instruction([ident('lsr')]);
      p.label('-'); // second target
      p.instruction([ident('bne'), op('--')]);
      p.instruction([ident('bcc'), op('-')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0x4a, 0x4a, 0x4a, 0xd0, 0xfb, 0x90, 0xfc),
        }],
        symbols: [], segments: []});
    });
  });

  describe('.byte', function() {
    it('should support numbers', function() {
      const p = new Processor(Cpu.P02);
      p.byte(1, 2, 3);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(1, 2, 3),
        }],
        symbols: [], segments: []});
    });

    it('should support strings', function() {
      const p = new Processor(Cpu.P02);
      p.byte('ab', 'cd');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0x61, 0x62, 0x63, 0x64),
        }],
        symbols: [], segments: []});
    });

    it('should support expressions', function() {
      const p = new Processor(Cpu.P02);
      p.directive('.byte', [cs('.byte'), num(1), op('+'), num(2)]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(3),
        }],
        symbols: [], segments: []});
    });

    it('should support expressions with backward refs', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('q'), Token.ASSIGN, num(5)]);
      p.directive('.byte', [cs('.byte'), ident('q')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(5),
        }],
        symbols: [], segments: []});
    });

    it('should support expressions with forward refs', function() {
      const p = new Processor(Cpu.P02);
      p.directive('.byte', [cs('.byte'), ident('q'), op('+'), num(1)]);
      p.label('q');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xff),
          subs: [{offset: 0, size: 1,
                  expr: {op: '+', args: [{op: 'sym', num: 0},
                                         {op: 'num', num: 1, size: 1}]}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 1}}],
        segments: []});
    });
  });

  describe('.word', function() {
    it('should support numbers', function() {
      const p = new Processor(Cpu.P02);
      p.word(1, 2, 0x403);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(1, 0, 2, 0, 3, 4),
        }],
        symbols: [], segments: []});
    });

    it('should support expressions', function() {
      const p = new Processor(Cpu.P02);
      p.directive('.word', [cs('.word'), num(1), op('+'), num(2)]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(3, 0),
        }],
        symbols: [], segments: []});
    });

    it('should support expressions with backward refs', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('q'), Token.ASSIGN, num(0x305)]);
      p.directive('.word', [cs('.word'), ident('q')]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(5, 3),
        }],
        symbols: [], segments: []});
    });

    it('should support expressions with forward refs', function() {
      const p = new Processor(Cpu.P02);
      p.directive('.word', [cs('.word'), ident('q'), op('+'), num(1)]);
      p.label('q');
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(0xff, 0xff),
          subs: [{offset: 0, size: 2,
                  expr: {op: '+', args: [{op: 'sym', num: 0},
                                         {op: 'num', num: 1, size: 1}]}}],
        }],
        symbols: [{expr: {op: 'off', chunk: 0, num: 2}}],
        segments: []});
    });
  });

  describe('.segment', function() {
    it('should change the segment', function() {
      const p = new Processor(Cpu.P02);
      p.segment('01');
      p.byte(4);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['01'],
          data: Uint8Array.of(4),
        }], symbols: [], segments: []});
    });

    it('should allow multiple segments', function() {
      const p = new Processor(Cpu.P02);
      p.segment('01', '02');
      p.byte(4);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['01', '02'],
          data: Uint8Array.of(4),
        }], symbols: [], segments: []});
    });

    it('should configure the segment', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('size'), ASSIGN, num(100)])
      p.directive('.segment', [cs('.segment'), str('03'),
                               COLON, ident('bank'), num(2), op('+'), num(1),
                               COLON, ident('size'), ident('size')]);
      expect(strip(p.result())).to.eql({
        chunks: [], symbols: [], segments: [{
          name: '03',
          bank: 3,
          size: 100,
        }]});
    });

    it('should merge multiple attr lists', function() {
      const p = new Processor(Cpu.P02);
      p.directive('.segment', [cs('.segment'), str('02'),
                               COLON, ident('bank'), num(2)]);
      p.directive('.segment', [cs('.segment'), str('02'),
                               COLON, ident('size'), num(200)]);
      expect(strip(p.result())).to.eql({
        chunks: [], symbols: [], segments: [{
          name: '02',
          bank: 2,
          size: 200,
        }]});
    });

    it('should track free regions', function() {
      const p = new Processor(Cpu.P02);
      p.segment('02');
      p.org(0x8000);
      p.free(0x200);
      p.org(0x9000);
      p.free(0x400);
      expect(strip(p.result())).to.eql({
        chunks: [], symbols: [], segments: [{
          name: '02',
          free: [[0x8000, 0x8200], [0x9000, 0x9400]],
        }]});
    });

    it('should allow setting a prefix', function() {
      const p = new Processor(Cpu.P02);
      p.segmentPrefix('cr:');
      p.directive('.segment', [cs('.segment'), str('02')]);
      p.instruction([ident('lsr')]);
      expect(strip(p.result())).to.eql({
        chunks: [{segments: ['cr:02'], data: Uint8Array.of(0x4a)}],
        segments: [], symbols: [],
      });          
    });
  });

  describe('.assert', function() {
    it('should pass immediately when true', function() {
      const p = new Processor(Cpu.P02);
      p.assert({op: 'num', num: 1});
      expect(strip(p.result())).to.eql({chunks: [], symbols: [], segments: []});
    });

    it('should fail immediately when false', function() {
      const p = new Processor(Cpu.P02);
      expect(() => p.assert({op: 'num', num: 0}))
          .to.throw(Error, /Assertion failed/);
    });

    it('should defer indeterminate assertions to the linker', function() {
      const p = new Processor(Cpu.P02);
      p.label('Foo');
      p.directive('.assert', [cs('.assert'), ident('Foo'), op('>'), num(8)]);
      expect(strip(p.result())).to.eql({
        chunks: [{
          segments: ['code'],
          data: Uint8Array.of(),
          asserts: [{op: '>', size: 1, args: [{op: 'off', chunk: 0, num: 0},
                                              {op: 'num', num: 8, size: 1}]}],
        }],
        symbols: [], segments: []});
    });
  });

  // TODO - test all the error cases...
});

function strip(o: Module): Module {
  for (const s of o.symbols || []) {
    stripExpr(s.expr);
  }
  for (const c of o.chunks || []) {
    for (const a of c.asserts || []) {
      stripExpr(a);
    }
    for (const s of c.subs || []) {
      stripExpr(s.expr);
    }
  }
  return o;
  function stripExpr(e: Expr|undefined) {
    if (!e) return;
    delete e.source;
    for (const a of e.args || []) {
      stripExpr(a);
    }
  }
}
