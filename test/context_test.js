require('source-map-support').install();
const {describe, it} = require('mocha');
const {expect} = require('chai');
const {Context, Define} = require('../dist/js/asm/context.js');
const {Deque} = require('../dist/js/util.js');
const util = require('util');
//const value = require('../dist/js/asm/value.js');

const MATCH = Symbol();

describe('Define', function() {
  it('should handle nullary token lists', function() {
    const define = Define.from(new Deque([
      {token: 'cs', str: '.define'},
      {token: 'ident', str: 'foo'},
      {token: 'cs', str: '.bar'},
      {token: 'ident', str: 'baz'},
    ]));
    const deq = new Deque([
      {token: 'ident', str: 'qux'},
      {token: 'ident', str: 'foo'},
      {token: 'ident', str: 'bar'},
    ]);
    deq.splice(1, 1);
    expect(define.expand(deq, 1)).to.be.true;
    expect([...deq]).to.eql([
      {token: 'ident', str: 'qux'},
      {token: 'cs', str: '.bar'},
      {token: 'ident', str: 'baz'},
      {token: 'ident', str: 'bar'},
    ]);    
  });

  it('should handle C-style argument lists', function() {
    const define = Define.from(new Deque([
      {token: 'cs', str: '.define'},
      {token: 'ident', str: 'foo'},
      {token: 'lp'},
      {token: 'ident', str: 'baz'},
      {token: 'rp'},
      {token: 'cs', str: '.bar'},
      {token: 'ident', str: 'baz'},
      {token: 'ident', str: 'baz'},
    ]));
    const deq = new Deque([
      {token: 'ident', str: 'qux'},
      {token: 'ident', str: 'foo'},
      {token: 'ident', str: 'bar'},
    ]);
    deq.splice(1, 1);
    expect(define.expand(deq, 1)).to.be.true;
    expect([...deq]).to.eql([
      {token: 'ident', str: 'qux'},
      {token: 'cs', str: '.bar'},
      {token: 'ident', str: 'bar'},
      {token: 'ident', str: 'bar'},
    ]);    
  });

  // optional parens
  // skipping args implicitly
  // extra braces
});
