require = require('esm')(module);

const {PMap} = require('./pmap.js');
const {expect} = require('chai');

describe('PMap.EMPTY', function() {
  it('should behave correctly when empty', function() {
    const empty = PMap.EMPTY;
    expect(empty.get('x')).to.be.undefined;
    expect([...empty]).to.be.empty;
    expect([...empty.values()]).to.be.empty;
    expect(empty.isEmpty()).to.be.true;
  });
});

describe('PMap.plus', function() {
  it('should add the first element', function() {
    const empty = PMap.EMPTY;
    const map = empty.plus('foo', 42);
    expect(map.get('foo')).to.equal(42);
    expect([...map]).to.eql([['foo', 42]]);
    expect([...map.keys()]).to.eql(['foo']);
    expect([...map.values()]).to.eql([42]);
    expect(map.equals(empty)).to.be.false;
    expect(map.size).to.equal(1);
  });

  it('should do nothing when key already exists', function() {
    const empty = PMap.EMPTY;
    const map = empty.plus('foo', 42);
    expect(map.plus('foo', 42)).to.equal(map); // shallow equality
  });

  it('should update an existing key', function() {
    const empty = PMap.EMPTY;
    const map = empty.plus('foo', 42);
    const map2 = map.plus('foo', 12);
    expect(map2.get('foo')).to.equal(12);
    expect([...map2]).to.eql([['foo', 12]]);
    expect([...map2.keys()]).to.eql(['foo']);
    expect([...map2.values()]).to.eql([12]);
    expect(map2.size).to.equal(1);
    expect(map2.equals(map)).to.be.false;
  });

  it('should add a new key', function() {
    const empty = PMap.EMPTY;
    const map = empty.plus('foo', 42).plus('bar', 12);
    expect(map.get('foo')).to.equal(42);
    expect(map.get('bar')).to.equal(12);
    expect([...map]).to.deep.include.members([['foo', 42], ['bar', 12]]);
    expect([...map.keys()]).to.deep.include.members(['foo', 'bar']);
    expect([...map.values()]).to.deep.include.members([42, 12]);
    expect(map.size).to.equal(2);
  });

  it('should add a new key in the other order', function() {
    const empty = PMap.EMPTY;
    const map = empty.plus('bar', 12).plus('foo', 42);
    expect(map.get('foo')).to.equal(42);
    expect(map.get('bar')).to.equal(12);
    expect([...map]).to.deep.include.members([['foo', 42], ['bar', 12]]);
    expect([...map.keys()]).to.deep.include.members(['foo', 'bar']);
    expect([...map.values()]).to.deep.include.members([42, 12]);
    expect(map.size).to.equal(2);
  });

  it('should work with object keys', function() {
    const k1 = {};
    const k2 = {};
    const empty = PMap.EMPTY;
    const map = empty.plus(k1, 5).plus(k2, 17);
    expect(map.get(k1)).to.equal(5);
    expect(map.get(k2)).to.equal(17);
    expect(map.size).to.equal(2);
    expect(map.plus(k1, 5)).to.equal(map); // shallow
  });

  it('should work with custom equals', function() {
    class Foo {
      constructor(x) {
        this.x = x;
      }
      hashCode() {
        return this.x;
      }
      equals(that) {
        return this.x === that.x;
      }
    }
    const k1 = new Foo(4);
    const k2 = new Foo(4);
    const k3 = new Foo(5);
    const empty = PMap.EMPTY;
    const map = empty.plus(k1, 5).plus(k3, 17);
    expect(map.size).to.equal(2);
    expect(map.get(k2)).to.equal(5);
    expect(map.get(k3)).to.equal(17);
    expect(map.plus(k2, 5)).to.equal(map); // shallow
  });

  it('should handle hash collisions', function() {
    class Foo {
      constructor(x) {
        this.x = x;
      }
      equals(that) {
        return this.x == that.x;
      }
      hashCode() {
        return this.x & 7;
      }
    }
    const e = PMap.EMPTY;
    const m1 = e.plus(new Foo(1), 12);
    const m2 = m1.plus(new Foo(9), 15);
    expect(m2.size).to.equal(2);
    expect(m2.get(new Foo(1))).to.equal(12);
    expect(m2.get(new Foo(9))).to.equal(15);
    const m3 = m2.minus(new Foo(1));
    expect(m3.size).to.equal(1);
    expect(m3.get(new Foo(1))).to.be.undefined;
    expect(m3.get(new Foo(9))).to.equal(15);
  });
});

describe('PMap.minus', function() {
  it('should delete the only element', function() {
    const map = PMap.EMPTY.plus('x', 'y');
    const empty = map.minus('x');
    expect(empty).to.equal(PMap.EMPTY);
  });

  it('should do nothing if the key is missing', function() {
    const map = PMap.EMPTY.plus(2, 3);
    expect(map.minus(3)).to.equal(map);
  });

  it('should delete the first element added', function() {
    const map = PMap.EMPTY.plus(2, 3).plus(4, 5);
    const map2 = map.minus(2);
    expect(map2.size).to.equal(1);
    expect(map2.get(2)).to.be.undefined;
    expect(map2.get(4)).to.equal(5);
    expect([...map2]).to.eql([[4, 5]]);
  });

  it('should delete the last element added', function() {
    const map = PMap.EMPTY.plus(2, 3).plus(4, 5);
    const map2 = map.minus(4);
    expect(map2.size).to.equal(1);
    expect(map2.get(4)).to.be.undefined;
    expect(map2.get(2)).to.equal(3);
    expect([...map2]).to.eql([[2, 3]]);
  });

});

describe('PMap.includes', function() {
  it('should work as expected', function() {
    const empty = PMap.EMPTY;
    const map1 = empty.plus('a', 4);
    const map2 = map1.plus('b', 6);
    const map3 = map1.plus('c', 5);
    const map4 = map1.plus('b', 5);

    expect(empty.includes(empty)).to.be.true;
    expect(map1.includes(empty)).to.be.true;
    expect(map2.includes(empty)).to.be.true;
    expect(map3.includes(empty)).to.be.true;
    expect(map4.includes(empty)).to.be.true;

    expect(empty.includes(map1)).to.be.false;
    expect(map1.includes(map1)).to.be.true;
    expect(map2.includes(map1)).to.be.true;
    expect(map3.includes(map1)).to.be.true;
    expect(map4.includes(map1)).to.be.true;

    expect(empty.includes(map2)).to.be.false;
    expect(map1.includes(map2)).to.be.false;
    expect(map2.includes(map2)).to.be.true;
    expect(map3.includes(map2)).to.be.false;
    expect(map4.includes(map2)).to.be.false;

    expect(empty.includes(map3)).to.be.false;
    expect(map1.includes(map3)).to.be.false;
    expect(map2.includes(map3)).to.be.false;
    expect(map3.includes(map3)).to.be.true;
    expect(map4.includes(map3)).to.be.false;

    expect(empty.includes(map4)).to.be.false;
    expect(map1.includes(map4)).to.be.false;
    expect(map2.includes(map4)).to.be.false;
    expect(map3.includes(map4)).to.be.false;
    expect(map4.includes(map4)).to.be.true;
  });
});

describe('PMap.hashCode', function() {
  it('should be zero for all empty maps', function() {
    const empty = PMap.EMPTY;
    expect(empty.hashCode()).to.equal(0);
    expect(empty.plus(2, 5).minus(2).hashCode()).to.equal(0);
  });

  it('should be the same for the same 1-element map', function() {
    const empty = PMap.EMPTY;
    const hash = empty.plus(2, 5).hashCode();
    expect(empty.plus(2, 6).plus(2, 5).hashCode()).to.equal(hash);
    expect(empty.plus(3, 6).plus(2, 5).minus(3).hashCode()).to.equal(hash);
  });

  it('should be the same for the same 2-element map', function() {
    const empty = PMap.EMPTY;
    const hash = empty.plus(5, 3).plus(1, 6).hashCode();
    expect(empty.plus(1, 6).plus(5, 3).hashCode()).to.equal(hash);
    expect(empty.plus(5, 3).plus(2, 2).plus(1, 6).minus(2).hashCode()).to.equal(hash);
  });
});


// TODO - test minus, incl hash code, etc
