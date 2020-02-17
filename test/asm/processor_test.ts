import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Cpu} from '../../src/js/asm/cpu';
import {Expr} from '../../src/js/asm/expr';
import {ObjectFile} from '../../src/js/asm/objectfile';
import {Processor} from '../../src/js/asm/processor';
import {Token} from '../../src/js/asm/token';
import * as util from 'util';

const [] = [util];

function ident(str: string): Token { return {token: 'ident', str}; }
function num(num: number): Token { return {token: 'num', num}; }
function str(str: string): Token { return {token: 'str', str}; }
function cs(str: string): Token { return {token: 'cs', str}; }
function op(str: string): Token { return {token: 'op', str}; }
const {COMMA, ASSIGN, IMMEDIATE, LP, RP} = Token;
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
          data: Uint8Array.of(0xa2, 0x35,
                              0xa0, 0x91),
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
          subs: [{
            offset: 1,
            size: 1,
            expr: {
              op: 'sym',
              num: 0,
            }
          }],
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
          subs: [{
            offset: 1,
            size: 2,
            expr: {
              op: 'sym',
              num: 0,
            }
          }]
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
  });


  // TODO - test all the error cases...
});

function strip(o: ObjectFile): ObjectFile {
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
