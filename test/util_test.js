require('source-map-support').install();
const {describe, it} = require('mocha');
const {expect} = require('chai');
const {Random} = require('../dist/js/random.js');
const {Deque} = require('../dist/js/util.js');
const util = require('util');
//const value = require('../dist/js/asm/value.js');

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
});
