import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Cpu} from '../../src/js/asm/cpu';
import {Processor} from '../../src/js/asm/processor';
import {Token} from '../../src/js/asm/token';
import * as util from 'util';

const [] = [util];

function ident(str: string): Token { return {token: 'ident', str}; }
function num(num: number): Token { return {token: 'num', num}; }
function str(str: string): Token { return {token: 'str', str}; }
const {COMMA, ASSIGN, IMMEDIATE, LP, RP} = Token;

const [] = [str, COMMA, LP, RP];

describe('Processor', function() {

  describe('Simple mnemonics', function() {
    it('should handle `lda #$03`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('lda'), IMMEDIATE, num(3)]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0xa9, 3)}],
        symbols: [],
      });
    });

    it('should handle `sta $02`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('sta'), num(2)]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x85, 2)}],
        symbols: [],
      });
    });

    it('should handle `ldy $032f`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('ldy'), num(0x32f)]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0xac, 0x2f, 3)}],
        symbols: [],
      });
    });

    it('should handle `rts`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('rts')]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x60)}],
        symbols: [],
      });
    });

    it('should handle `lda ($24),y`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('lda'), LP, num(0x24), RP, COMMA, ident('y')]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0xb1, 0x24)}],
        symbols: [],
      });
    });

    it('should handle `sta ($0320,x)`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('sta'), LP, num(0x320), COMMA, ident('x'), RP]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x81, 0x20, 3)}],
        symbols: [],
      });
    });

    it('should handle `lsr`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('lsr')]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x4a)}],
        symbols: [],
      });
    });

    it('should handle `lsr a`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('lsr'), ident('A')]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x4a)}],
        symbols: [],
      });
    });

    it('should handle `ora $480,x`', function() {
      const p = new Processor(Cpu.P02);
      p.mnemonic([ident('ora'), num(0x480), COMMA, ident('x')]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{segments: ['code'], data: Uint8Array.of(0x1d, 0x80, 4)}],
        symbols: [],
      });
    });
  });

  describe('Symbols', function() {
    it.only('should fill in an immediately-available address', function() {
      const p = new Processor(Cpu.P02);
      p.assign([ident('r'), ASSIGN, num(0x8123)]);
      p.org([num(0x8000)]);
      p.mnemonic([ident('jsr'), ident('r')]);
      expect(p.result()).to.eql({
        segments: [],
        chunks: [{
          segments: ['code'],
          org: 0x8000,
          data: Uint8Array.of(0x20, 0x23, 0x81),
        }],
        symbols: [],
      });
    });
  });
});
