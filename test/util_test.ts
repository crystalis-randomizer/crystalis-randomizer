require('source-map-support').install();
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {Random} from '../src/js/random';
import {Deque} from '../src/js/util';
import * as util from 'util';

const [] = [util];

describe('Deque', function() {
  it('should support various splices', function() {
    const arr = [1, 2, 3, 4, 5];
    const deq = new Deque([1, 2, 3, 4, 5]);
    const rand = new Random(1);
    let i = 6;
    for (let turn = 0; turn < 200; turn++) {
      const start = rand.nextInt(2 * arr.length) - arr.length;
      const count = rand.nextInt(arr.length >> 1);
      const elemCount =
          rand.nextInt(Math.min(100 - arr.length, arr.length >> 1) + 1);
      const elems = [];
      while (elems.length < elemCount) elems.push(i++);
      expect(deq.splice(start, count, ...elems))
          .to.eql(arr.splice(start, count, ...elems));
      expect([...deq]).to.eql(arr);
      expect(deq).to.have.length(arr.length);
    }
  });

  it('should be constructible with a variety of sizes of inputs', function() {
    const arr = [];
    for (let i = 0; i < 100; i++) {
      const deq = new Deque(arr);
      expect([...deq]).to.eql(arr);
      arr.push(i);
    }
  });
});
