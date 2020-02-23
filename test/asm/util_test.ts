import {describe, it} from 'mocha';
import {expect} from 'chai';
import {BitSet, IntervalSet, SparseArray, SparseByteArray,
        binaryInsert, binarySearch} from '../../src/js/asm/util';
import * as util from 'util';

const [] = [util];

describe('binarySearch', function() {
  const arr = [3, 6, 8, 10, 12, 16, 18, 22, 27, 35];
  function find(target: number) {
    return binarySearch(arr.length, (i: number) => target - arr[i]);
  }
  
  it('should return index of a present element', function() {
    for (let i = 0; i < arr.length; i++) {
      expect(find(arr[i])).to.equal(i);
    }
  });
  it('should return ~0 for before first element', function() {
    expect(find(-Infinity)).to.equal(~0)
  });
  it('should return ~n for after last element', function() {
    expect(find(Infinity)).to.equal(~arr.length)
  });
  it('should return ~i for just before element i', function() {
    for (let i = 1; i < arr.length; i++) {
      expect(find((arr[i - 1] + arr[i]) / 2)).to.equal(~i);
    }
  });
});

describe('binaryInsert', function() {
  it('should insert at the beginning', function() {
    const arr = ['x', 'xx', 'xxx'];
    binaryInsert(arr, x => x.length, '');
    expect(arr).to.eql(['', 'x', 'xx', 'xxx']);
  });

  it('should insert at the end', function() {
    const arr = ['x', 'xx', 'xxx'];
    binaryInsert(arr, x => x.length, 'xxxx');
    expect(arr).to.eql(['x', 'xx', 'xxx', 'xxxx']);
  });

  it('should insert in the middle', function() {
    const arr = ['x', 'xxx'];
    binaryInsert(arr, x => x.length, 'xx');
    expect(arr).to.eql(['x', 'xx', 'xxx']);
  });

  it('should insert an element with the same result', function() {
    const arr = ['x', 'xx', 'xxx'];
    binaryInsert(arr, x => x.length, 'yy');
    expect(arr).to.eql(['x', 'xx', 'yy', 'xxx']);
  });
});

describe('BitSet', function() {
  it('should support adding a new element', function() {
    const s = new BitSet();
    expect(s.has(1234)).to.equal(false);
    s.add(1234);
    expect(s.has(1233)).to.equal(false);
    expect(s.has(1234)).to.equal(true);
    expect(s.has(1235)).to.equal(false);
  });

  it('should support deleting an element', function() {
    const s = new BitSet();
    s.add(1233);
    s.add(1234);
    s.add(1235);
    expect(s.has(1233)).to.equal(true);
    expect(s.has(1234)).to.equal(true);
    expect(s.has(1235)).to.equal(true);
    s.delete(1234);
    expect(s.has(1233)).to.equal(true);
    expect(s.has(1234)).to.equal(false);
    expect(s.has(1235)).to.equal(true);
  });
});

describe('IntervalSet', function() {
  it('should start empty', function() {
    expect([...new IntervalSet()]).to.eql([]);
  });

  describe('IntervalSet#add', function() {
    it('should add an interval', function() {
      const s = new IntervalSet();
      s.add(5, 10);
      expect([...s]).to.eql([[5, 10]]);
    });

    it('should add a second interval', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(5, 7);
      expect([...s]).to.eql([[2, 4], [5, 7]]);
    });

    it('should add an interval that abuts on the left', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(5, 7);
      s.add(7, 9);
      expect([...s]).to.eql([[2, 4], [5, 9]]);
    });

    it('should add an interval that abuts on the right', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(5, 7);
      s.add(0, 2);
      expect([...s]).to.eql([[0, 4], [5, 7]]);
    });

    it('should add an interval that abuts on both sides', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(5, 7);
      s.add(4, 5);
      expect([...s]).to.eql([[2, 7]]);
    });

    it('should add an interval that encloses one other', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(6, 8);
      s.add(5, 9);
      expect([...s]).to.eql([[2, 4], [5, 9]]);
    });

    it('should add an interval that overlaps on the left', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(6, 8);
      s.add(3, 5);
      expect([...s]).to.eql([[2, 5], [6, 8]]);
    });

    it('should add an interval that overlaps multiple on the left', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(6, 8);
      s.add(3, 9);
      expect([...s]).to.eql([[2, 9]]);
    });

    it('should add an interval that overlaps on the right', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(6, 8);
      s.add(5, 7);
      expect([...s]).to.eql([[2, 4], [5, 8]]);
    });

    it('should add an interval that overlaps multiple on the right', function() {
      const s = new IntervalSet();
      s.add(2, 4);
      s.add(6, 8);
      s.add(1, 7);
      expect([...s]).to.eql([[1, 8]]);
    });
  });

  describe('IntervalSet#has', function() {
    it('should be false on the far left', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      expect(s.has(0)).to.equal(false);
    });

    it('should be true at the start of an interval', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      expect(s.has(1)).to.equal(true);
    });

    it('should be true in the middle of an interval', function() {
      const s = new IntervalSet();
      s.add(1, 3);
      s.add(4, 5);
      expect(s.has(2)).to.equal(true);
    });

    it('should be false at the end of an interval', function() {
      const s = new IntervalSet();
      s.add(1, 3);
      s.add(4, 5);
      expect(s.has(3)).to.equal(false);
    });

    it('should be false between intervals', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(4, 5);
      expect(s.has(3)).to.equal(false);
    });

    it('should be false on the far right', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(4, 5);
      expect(s.has(6)).to.equal(false);
    });
  });

  describe('IntervalSet#delete', function() {
    it('should delete an absent interval', function() {
      const s = new IntervalSet();
      s.add(3, 4);
      s.delete(1, 2);
      expect([...s]).to.eql([[3, 4]]);
    });

    it('should delete an interval from the middle of another', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 7);
      s.add(8, 9);
      s.delete(4, 5);
      expect([...s]).to.eql([[1, 2], [3, 4], [5, 7], [8, 9]]);
    });

    it('should delete an interval that abuts on the inside left', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 7);
      s.add(8, 9);
      s.delete(3, 5);
      expect([...s]).to.eql([[1, 2], [5, 7], [8, 9]]);
    });

    it('should delete an interval that abuts on the inside right', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 7);
      s.add(8, 9);
      s.delete(5, 7);
      expect([...s]).to.eql([[1, 2], [3, 5], [8, 9]]);
    });

    it('should delete an interval that abuts on the outside left', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 7);
      s.add(8, 9);
      s.delete(2, 5);
      expect([...s]).to.eql([[1, 2], [5, 7], [8, 9]]);
    });

    it('should delete an interval that abuts on the outside right', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 7);
      s.add(8, 9);
      s.delete(5, 8);
      expect([...s]).to.eql([[1, 2], [3, 5], [8, 9]]);
    });

    it('should delete an interval that outerlaps on the left', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(4, 6);
      s.add(8, 9);
      s.delete(3, 5);
      expect([...s]).to.eql([[1, 2], [5, 6], [8, 9]]);
    });

    it('should delete an interval that outerlaps on the right', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(4, 6);
      s.add(8, 9);
      s.delete(5, 7);
      expect([...s]).to.eql([[1, 2], [4, 5], [8, 9]]);
    });

    it('should delete an interval that overlaps multiple', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      s.add(5, 6);
      s.add(8, 9);
      s.delete(3, 6);
      expect([...s]).to.eql([[1, 2], [8, 9]]);
    });

    it('should delete an interval that outerlaps multiple', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      s.add(5, 6);
      s.add(8, 9);
      s.delete(2, 8);
      expect([...s]).to.eql([[1, 2], [8, 9]]);
    });
  });

  describe('IntervalSet#tail', function() {
    it('should be empty when past the end', function() {
      const s = new IntervalSet();
      s.add(1, 4);
      expect([...s.tail(5)]).to.eql([]);
    });

    it('should handle targets between intervals', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      s.add(6, 7);
      s.add(8, 9);
      expect([...s.tail(5)]).to.eql([[6, 7], [8, 9]]);
    });

    it('should handle targets at the start of an interval', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      s.add(6, 7);
      s.add(8, 9);
      expect([...s.tail(6)]).to.eql([[6, 7], [8, 9]]);
    });

    it('should handle targets at the end of an interval', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      s.add(6, 7);
      s.add(8, 9);
      expect([...s.tail(4)]).to.eql([[6, 7], [8, 9]]);
    });

    it('should handle targets at the middle of an interval', function() {
      const s = new IntervalSet();
      s.add(1, 2);
      s.add(3, 4);
      s.add(6, 8);
      s.add(9, 10);
      expect([...s.tail(7)]).to.eql([[7, 8], [9, 10]]);
    });
  });
});

describe('SparseArray', function() {
  it('should start empty', function() {
    expect([...new SparseArray().chunks()]).to.eql([]);
  });

  describe('SparseArray#set', function() {
    it('should set some values', function() {
      const a = new SparseArray<number>();
      a.set(5, 1, 3, 4);
      expect([...a.chunks()]).to.eql([[5, [1, 3, 4]]]);
    });

    it('should add a second chunk', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(5, 3, 4);
      expect([...a.chunks()]).to.eql([[2, [1, 2]], [5, [3, 4]]]);
    });

    it('should add a chunk that abuts on the left', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(5, 3, 4);
      a.set(7, 5, 6);
      expect([...a.chunks()]).to.eql([[2, [1, 2]], [5, [3, 4, 5, 6]]]);
    });

    it('should add a chunk that abuts on the right', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(5, 3, 4);
      a.set(0, 5, 6);
      expect([...a.chunks()]).to.eql([[0, [5, 6, 1, 2]], [5, [3, 4]]]);
    });

    it('should add a chunk that abuts on both sides', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(5, 3, 4);
      a.set(4, 5);
      expect([...a.chunks()]).to.eql([[2, [1, 2, 5, 3, 4]]]);
    });

    it('should add a chunk that encloses another', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(6, 3, 4);
      a.set(5, 5, 6, 7, 8);
      expect([...a.chunks()]).to.eql([[2, [1, 2]], [5, [5, 6, 7, 8]]]);
    });

    it('should add a chunk within another', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2, 3, 4, 5, 6);
      a.set(4, 7, 8);
      expect([...a.chunks()]).to.eql([[2, [1, 2, 7, 8, 5, 6]]]);
    });

    it('should add a chunk that overlaps on the left', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(6, 3, 4);
      a.set(3, 5, 6);
      expect([...a.chunks()]).to.eql([[2, [1, 5, 6]], [6, [3, 4]]]);
    });

    it('should add a chunk that overlaps multiple on the left', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(6, 3, 4);
      a.set(3, 4, 5, 6, 7, 8, 9);
      expect([...a.chunks()]).to.eql([[2, [1, 4, 5, 6, 7, 8, 9]]]);
    });

    it('should add a chunk that overlaps on the right', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(6, 3, 4);
      a.set(5, 5, 6);
      expect([...a.chunks()]).to.eql([[2, [1, 2]], [5, [5, 6, 4]]]);
    });

    it('should add a chunk that overlaps multiple on the right', function() {
      const a = new SparseArray<number>();
      a.set(2, 1, 2);
      a.set(6, 3, 4);
      a.set(1, 5, 6, 7, 8, 9, 10);
      expect([...a.chunks()]).to.eql([[1, [5, 6, 7, 8, 9, 10, 4]]]);
    });
  });

  describe('SparseArray#get', function() {
    it('should be undefined on the far left', function() {
      const a = new SparseArray<number>();
      a.set(1, 5);
      a.set(3, 7);
      expect(a.get(0)).to.equal(undefined);
    });

    it('should fetch from the start of a chunk', function() {
      const a = new SparseArray<number>();
      a.set(1, 5);
      a.set(3, 7);
      expect(a.get(1)).to.equal(5);
    });

    it('should fetch from the middle of a chunk', function() {
      const a = new SparseArray<number>();
      a.set(1, 5, 6);
      a.set(4, 7);
      expect(a.get(2)).to.equal(6);
    });

    it('should be undefined at the end of a chunk', function() {
      const a = new SparseArray<number>();
      a.set(1, 5, 6);
      a.set(4, 7);
      expect(a.get(3)).to.equal(undefined);
    });

    it('should be undefined between chunks', function() {
      const a = new SparseArray<number>();
      a.set(1, 5);
      a.set(4, 7);
      expect(a.get(3)).to.equal(undefined);
    });

    it('should be undefined on the far right', function() {
      const a = new SparseArray<number>();
      a.set(1, 5);
      a.set(4, 7);
      expect(a.get(6)).to.equal(undefined);
    });
  });

  describe('SparseArray#splice', function() {
    it('should splice an absent chunk', function() {
      const a = new SparseArray<number>();
      a.set(3, 5);
      a.splice(1);
      expect([...a.chunks()]).to.eql([[3, [5]]]);
    });

    it('should splice from the middle of a chunk', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2, 3, 4, 5);
      a.set(8, 6);
      a.splice(4);
      expect([...a.chunks()])
          .to.eql([[1, [1]], [3, [2]], [5, [4, 5]], [8, [6]]]);
    });

    it('should splice a chunk that abuts on the inside left', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2, 3, 4, 5);
      a.set(8, 6);
      a.splice(3, 2);
      expect([...a.chunks()]).to.eql([[1, [1]], [5, [4, 5]], [8, [6]]]);
    });

    it('should splice a chunk that abuts on the inside right', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2, 3, 4, 5);
      a.set(8, 6);
      a.splice(5, 2);
      expect([...a.chunks()]).to.eql([[1, [1]], [3, [2, 3]], [8, [6]]]);
    });

    it('should splice a chunk that abuts on the outside left', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2, 3, 4, 5);
      a.set(8, 6);
      a.splice(2, 3);
      expect([...a.chunks()]).to.eql([[1, [1]], [5, [4, 5]], [8, [6]]]);
    });

    it('should splice a chunk that abuts on the outside right', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2, 3, 4, 5);
      a.set(8, 6);
      a.splice(5, 3);
      expect([...a.chunks()]).to.eql([[1, [1]], [3, [2, 3]], [8, [6]]]);
    });

    it('should splice a chunk that outerlaps on the left', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(4, 2, 3);
      a.set(8, 4);
      a.splice(3, 2);
      expect([...a.chunks()]).to.eql([[1, [1]], [5, [3]], [8, [4]]]);
    });

    it('should splice a chunk that outerlaps on the right', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(4, 2, 3);
      a.set(8, 4);
      a.splice(5, 2);
      expect([...a.chunks()]).to.eql([[1, [1]], [4, [2]], [8, [4]]]);
    });

    it('should splice a chunk that overlaps multiple', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2);
      a.set(5, 3);
      a.set(8, 4);
      a.splice(3, 3);
      expect([...a.chunks()]).to.eql([[1, [1]], [8, [4]]]);
    });

    it('should splice a chunk that outerlaps multiple', function() {
      const a = new SparseArray<number>();
      a.set(1, 1);
      a.set(3, 2);
      a.set(5, 3);
      a.set(8, 4);
      a.splice(2, 6);
      expect([...a.chunks()]).to.eql([[1, [1]], [8, [4]]]);
    });
  });

  describe('SparseArray.slice', function() {
    it('should return a slice', function() {
      const a = new SparseArray<number>();
      a.set(5, 1, 2, 3, 4, 5);
      expect(a.slice(6, 8)).to.eql([2, 3]);
    });

    it('should return an entire chunk', function() {
      const a = new SparseArray<number>();
      a.set(5, 1, 2);
      expect(a.slice(5, 7)).to.eql([1, 2]);
    });

    it('should throw if across a gap', function() {
      const a = new SparseArray<number>();
      a.set(5, 1, 2);
      a.set(8, 3, 4);
      expect(() => a.slice(6, 9)).to.throw(Error, /^Absent: 7/);
    });

    it('should throw if left edge is missing', function() {
      const a = new SparseArray<number>();
      a.set(5, 1, 2);
      expect(() => a.slice(4, 6)).to.throw(Error, /^Absent: 4/);
    });

    it('should throw if right edge is missing', function() {
      const a = new SparseArray<number>();
      a.set(5, 1, 2);
      expect(() => a.slice(5, 8)).to.throw(Error, /^Absent: 7/);
    });
  });

  describe('SparseByteArray search', function() {
    const a = new SparseByteArray();
    a.set(0, 1, 2, 3, 4, 2, 3, 5, 6);
    a.set(10, 1, 2, 3, 5, 2, 3, 6, 8);

    it('should find the first occurrence of a pattern', function() {
      expect(a.search([2, 3, 5])).to.equal(4);
    });

    it('should respect the bounds', function() {
      expect(a.search([2, 3, 5], 8)).to.equal(11);
    });

    it('should return -1 if the pattern is not found', function() {
      expect(a.search([2, 3, 7])).to.equal(-1);
    });

    it('should return -1 if the bounds are right of the data', function() {
      expect(a.search([2, 3, 4], 20)).to.equal(-1);
    });

    it('should return -1 if the bounds are left of the match', function() {
      expect(a.search([2, 3, 4], 0, 3)).to.equal(-1);
    });
  });
});
