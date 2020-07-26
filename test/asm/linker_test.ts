import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Expr} from '../../src/js/asm/expr';
import {Linker} from '../../src/js/asm/linker';
import * as util from 'util';

const [] = [util];

const link = Linker.link;

function off(chunk: number, num: number): Expr {
  return {op: 'num', num, meta: {rel: true, chunk}};
}
function op(op: string, ...args: Expr[]): Expr {
  return {op, args};
}
function num(num: number): Expr {
  return {op: 'num', num};
}

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

  it('should link .org chunks into the right segment', function() {
    const m = {
      chunks: [{
        segments: ['a', 'b'],
        org: 100,
        data: Uint8Array.of(2, 4, 6, 8),
      }, {
        segments: ['a', 'b'],
        org: 500,
        data: Uint8Array.of(1, 2, 3, 4),
      }],
      segments: [
        {name: 'a', size: 400, offset: 30, memory: 80},
        {name: 'b', size: 400, offset: 1030, memory: 480},
      ],
    };
    expect([...link(m).chunks()])
        .to.eql([[50, [2, 4, 6, 8]], [1050, [1, 2, 3, 4]]]);
  });

  it('should fill in a same-chunk offset expression', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        org: 100,
        data: Uint8Array.of(2, 4, 0xff, 8),
        subs: [{offset: 2, size: 1, expr: off(0, 3)}],
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
        expr: off(1, 1),
      }, {
        expr: off(0, 2),
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
      symbols: [{expr: op('+', num(80), off(0, 1))}],
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
        expr: off(1, 3),
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
        subs: [{offset: 2, size: 2, expr: off(0, 0)}],
      }, {
        segments: ['code'],
        data: Uint8Array.of(1, 3, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: off(0, 2)}],
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

  it('should fail to relocate chunks with no free allocations', function() {
    const m = {
      chunks: [{
        segments: ['code'],
        data: Uint8Array.of(2, 4, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: off(0, 0)}],
      }, {
        segments: ['code'],
        data: Uint8Array.of(1, 3, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: off(0, 2)}],
      }],
      segments: [{
        name: 'code',
        size: 0x400, offset: 0x0010, memory: 0xc000,
      }],
    };
    expect(() => link(m)).to.throw(Error, /Could not find space/);
  });

  it('should choose an eligible segment for .reloc chunks', function() {
    const m = {
      chunks: [{
        segments: ['a', 'b'],
        data: Uint8Array.of(1, 3, 5, 7),
      }, {
        segments: ['a'],
        org: 0x80,
        data: Uint8Array.of(2, 4, 0xff, 0xff),
        subs: [{offset: 2, size: 2, expr: off(0, 2)}],
      }],
      segments: [{
        name: 'a', size: 6, offset: 0, memory: 0x80,
        free: [[0x80, 0x84] as const],
      }, {
        name: 'b', size: 100, offset: 100, memory: 0x100,
        free: [[0x100, 0x164] as const],
      }],
    };
    expect([...link(m).chunks()])
        .to.eql([[0, [2, 4, 0x02, 0x01]], [100, [1, 3, 5, 7]]]);
  });

  it('should overlap segments with common bytes', function() {
    const m = {
      chunks: [{
        segments: ['a', 'b'],
        data: Uint8Array.of(3, 5, 7),
      }, {
        segments: ['b'],
        data: Uint8Array.of(1, 3, 5, 7, 9),
      }, {
        segments: ['a'],
        data: Uint8Array.of(0xff, 0xff),
        subs: [{offset: 0, size: 2, expr: off(0, 0)}],
      }],
      segments: [{
        name: 'a', size: 100, offset: 0, memory: 0,
        free: [[0, 100] as const],
      }, {
        name: 'b', size: 100, offset: 100, memory: 100,
        free: [[100, 200] as const],
      }],
    };
    expect([...link(m).chunks()])
        .to.eql([[0, [101, 0]], [100, [1, 3, 5, 7, 9]]]);
  });

  it('should share with existing data', function() {
    const base = Uint8Array.of(
      // starts at 10
      0, 2, 4, 6, 8, 0, 2, 4, 6, 8,
      1, 3, 5, 7, 9, 1, 1, 3, 3, 5, // 21 is the spot: 3 5 7
      5, 7, 7, 9, 9, 0, 0, 0, 2, 2,
      2, 4, 4, 4, 6, 6, 6, 8, 8, 8);
    const m = {
      chunks: [{
        segments: ['a'],
        data: Uint8Array.of(3, 5, 7),
      }, {
        segments: ['a'],
        data: Uint8Array.of(0xff, 0xff),
        subs: [{offset: 0, size: 2, expr: off(0, 0)}],
      }],
      segments: [{
        name: 'a', size: 100, offset: 0, memory: 0x8000,
        free: [[0x8005, 0x800a] as const],
      }],
    };
    const patch = new Linker().base(base, 10).read(m).link();      
    expect([...patch.chunks()]).to.eql([[5, [21, 0x80]]]);
  });

  it('should .move existing data', function() {
    const base = Uint8Array.of(
      // starts at 10
      0, 2, 4, 6, 8, 0, 2, 4, 6, 8,
      1, 3, 5, 7, 9, 1, 1, 3, 3, 5,
      5, 7, 7, 9, 9, 0, 0, 0, 2, 2,
      2, 4, 4, 4, 6, 6, 6, 8, 8, 8);
    const m = {
      chunks: [{
        segments: ['b'],
        data: Uint8Array.of(),
      }, {
        segments: ['a'],
        data: Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
        subs: [{offset: 0, size: 7, expr: {op: '.move', args: [off(0, 22)]}}],
      }],
      segments: [{
        name: 'a', size: 100, offset: 100, memory: 0,
        free: [[50, 100] as const],
      }, {name: 'b', size: 40, offset: 0, memory: 0}],
    };
    const patch = new Linker().base(base, 10).read(m).link();
    expect([...patch.chunks()]).to.eql([[150, [5, 7, 9, 1, 1, 3, 3]]]);
  });

  it('should .move existing data from an absolute offset', function() {
    const base = Uint8Array.of(
      // starts at 10
      0, 2, 4, 6, 8, 0, 2, 4, 6, 8,
      1, 3, 5, 7, 9, 1, 1, 3, 3, 5,
      5, 7, 7, 9, 9, 0, 0, 0, 2, 2,
      2, 4, 4, 4, 6, 6, 6, 8, 8, 8);
    const m = {
      chunks: [{
        segments: ['b'],
        data: Uint8Array.of(),
      }, {
        segments: ['a'],
        data: Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
        subs: [{offset: 0, size: 7, expr: {op: '.move', args: [
          {op: 'num', num: 12, meta: {org: 10, offset: 20}},
        ]}}],
      }],
      segments: [{
        name: 'a', size: 100, offset: 100, memory: 0,
        free: [[50, 100] as const],
      }, {name: 'b', size: 40, offset: 0, memory: 0}],
    };
    const patch = new Linker().base(base, 10).read(m).link();
    expect([...patch.chunks()]).to.eql([[150, [5, 7, 9, 1, 1, 3, 3]]]);
  });

  it('should resolve bank bytes', function() {
    const m = {
      chunks: [{
        segments: ['a'],
        data: Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
        subs: [
          {offset: 0, size: 1, expr: op('^', off(1, 0))},
          {offset: 1, size: 2, expr: off(1, 0)},
          {offset: 3, size: 1, expr: op('^', off(2, 0))},
          {offset: 4, size: 2, expr: off(2, 0)},
        ],
      }, {
        segments: ['b'],
        data: Uint8Array.of(1, 3, 5, 7, 9),
      }, {
        segments: ['a'],
        data: Uint8Array.of(2, 4),
      }],
      segments: [{
        name: 'a', size: 100, offset: 0, memory: 0x8000, bank: 8,
        free: [[0x8000, 0x8064] as const],
      }, {
        name: 'b', size: 100, offset: 100, memory: 0x8000, bank: 9,
        free: [[0x8000, 0x8064] as const],
      }],
    };
    expect([...link(m).chunks()]).to.eql([
      [0, [2, 4, 9, 0, 0x80, 8, 0, 0x80]],
      [100, [1, 3, 5, 7, 9]],
    ]);
  });

  it('should support imports and exports', function() {
    const m1 = {
      chunks: [{
        segments: ['a'],
        data: Uint8Array.of(3, 5, 0xff),
        subs: [{offset: 2, size: 1, expr: {op: 'im', sym: 'foo'}}],
      }],
      segments: [{
        name: 'a', size: 100, offset: 0, memory: 0,
        free: [[0, 100] as const],
      }],
    };
    const m2 = {
      chunks: [{
        segments: ['b'],
        data: Uint8Array.of(1, 2, 3),
      }],
      symbols: [{export: 'foo', expr: off(0, 1)}],
      segments: [{
        name: 'b', size: 100, offset: 100, memory: 100,
        free: [[100, 200] as const],
      }],
    };
    expect([...link(m1, m2).chunks()])
        .to.eql([[0, [3, 5, 101]], [100, [1, 2, 3]]]);
  });

  it('should check a passing assert', function() {
    const m = {
      chunks: [{
        segments: ['a'],
        org: 100,
        data: Uint8Array.of(2, 4, 6, 8),
        asserts: [op('=', off(0, 4), num(104))],
      }],
      segments: [{name: 'a', size: 100, offset: 100, memory: 100}],
    };
    expect([...link(m).chunks()]).to.eql([[100, [2, 4, 6, 8]]]);
  });

  it('should check a failing assert', function() {
    const m = {
      chunks: [{
        segments: ['a'],
        org: 100,
        data: Uint8Array.of(2, 4, 6, 8),
        asserts: [op('=', off(0, 4), num(105))],
      }],
      segments: [{name: 'a', size: 100, offset: 100, memory: 100}],
    };
    expect(() => link(m)).to.throw(Error, /Assertion failed/);
  });

  it('should support circular references', function() {
    const m = {
      chunks: [{
        segments: ['a'],
        data: Uint8Array.of(3, 5, 0xff, 0xff, 7, 9),
        subs: [{offset: 2, size: 2, expr: off(1, 0)}],
      }, {
        segments: ['a'],
        data: Uint8Array.of(2, 0xff, 0xff, 4),
        subs: [{offset: 1, size: 2, expr: off(0, 0)}],
      }],
      segments: [{
        name: 'a', size: 0x2000, offset: 0, memory: 0x8000,
        free: [[0x8000, 0xa000] as const],
      }],
    };
    expect([...link(m).chunks()])
        .to.eql([[0, [2, 0x04, 0x80, 4, 3, 5, 0x00, 0x80, 7, 9]]]);
  });
});
