import {describe, it} from 'mocha';
import {expect} from 'chai';
//import {Expr} from '../../src/js/asm/expr';
import {link} from '../../src/js/asm/linker';
//import {Module} from '../../src/js/asm/module';
//import {Token} from '../../src/js/asm/token';
import * as util from 'util';

const [] = [util];

// function ident(str: string): Token { return {token: 'ident', str}; }
// function num(num: number): Token { return {token: 'num', num}; }
// function str(str: string): Token { return {token: 'str', str}; }
// function cs(str: string): Token { return {token: 'cs', str}; }
// function op(str: string): Token { return {token: 'op', str}; }
// const {COLON, COMMA, ASSIGN, IMMEDIATE, LP, RP} = Token;
// const ORG = cs('.org');
// const RELOC = cs('.reloc');
// const ASSERT = cs('.assert');
// const SEGMENT = cs('.segment');

describe('Linker', function() {
  it('should link a simple .org chunk', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 100,
        data: Uint8Array.of(2, 4, 6, 8),
      }],
      segments: [{name: 'code', size: 400, offset: 30, memory: 80}],
    };
    expect([...link(m).chunks()]).to.eql([[50, [2, 4, 6, 8]]]);
  });

  it('should link two simple .org chunks', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 100,
        data: Uint8Array.of(2, 4, 6, 8),
      }, {
        segments: ['code'],
        org: 200,
        data: Uint8Array.of(3, 5, 7, 9),
      }],
      segments: [{name: 'code', size: 400, offset: 30, memory: 80}],
    };
    expect([...link(m).chunks()])
        .to.eql([[50, [2, 4, 6, 8]], [150, [3, 5, 7, 9]]]);
  });

  it('should fill in a same-chunk offset expression', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 100,
        data: Uint8Array.of(2, 4, 0xff, 8),
        subs: [{offset: 2, size: 1, expr: {op: 'off', num: 3, chunk: 0}}],
      }],
      segments: [{name: 'code', size: 400, offset: 30, memory: 80}],
    };
    expect([...link(m).chunks()]).to.eql([[50, [2, 4, 103, 8]]]);
  });

  it('should fill in an offset from a symbol', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 100,
        data: Uint8Array.of(2, 4, 0xff, 8),
        subs: [{offset: 2, size: 1, expr: {op: 'sym', num: 0}}],
      }, {
        segments: ['code'],
        org: 200,
        data: Uint8Array.of(1, 3, 0xff, 7),
        subs: [{offset: 2, size: 1, expr: {op: 'sym', num: 1}}],
      }],
      symbols: [{
        expr: {op: 'off', chunk: 1, num: 1},
      }, {
        expr: {op: 'off', chunk: 0, num: 2},
      }],
      segments: [{name: 'code', size: 400, offset: 30, memory: 80}],
    };
    expect([...link(m).chunks()])
        .to.eql([[50, [2, 4, 201, 8]], [150, [1, 3, 102, 7]]]);
  });

  it('should handle arithmetic expressions', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 100,
        data: Uint8Array.of(2, 4, 0xff, 8),
        subs: [{offset: 2, size: 1, expr: {op: 'sym', num: 0}}],
      }],
      symbols: [{
        expr: {op: '+',
               args: [{op: 'num', num: 80}, {op: 'off', chunk: 0, num: 1}]},
      }],
      segments: [{name: 'code', size: 400, offset: 30, memory: 80}],
    };
    expect([...link(m).chunks()]).to.eql([[50, [2, 4, 181, 8]]]);
  });

  it('should support multiple segments', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 0x100,
        data: Uint8Array.of(2, 4, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: {op: 'sym', num: 0}}],
      }, {
        segments: ['data'],
        org: 0x8123,
        data: Uint8Array.of(1, 1, 2, 3, 5),
      }],
      symbols: [{
        expr: {op: 'off', chunk: 1, num: 3},
      }],
      segments: [{name: 'code', size: 0x400, offset: 0x0010, memory: 0x0000},
                 {name: 'data', size: 0x400, offset: 0x0410, memory: 0x8000}],
    };
    expect([...link(m).chunks()])
        .to.eql([[0x0110, [2, 4, 0x26, 0x81]], [0x0533, [1, 1, 2, 3, 5]]]);
  });

  it('should relocate chunks', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        data: Uint8Array.of(2, 4, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: {op: 'off', num: 0, chunk: 0}}],
      }, {
        segments: ['code'],
        data: Uint8Array.of(1, 3, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: {op: 'off', num: 2, chunk: 0}}],
      }],
      segments: [{
        name: 'code',
        size: 0x400, offset: 0x0010, memory: 0xc000,
        free: [[0xc200, 0xc300] as const],
      }],
    };
    expect([...link(m).chunks()])
        .to.eql([[0x0210, [2, 4, 0x00, 0xc2, 1, 3, 0x02, 0xc2]]]);
  });
});
