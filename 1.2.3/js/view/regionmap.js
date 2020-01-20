// Maps 2d rectangular regions onto one or more values.

// We want to have a ton of elements more or less spanning the whole thing,
// which is why we want a complex data structure.

// I think a binary quad tree probably makes the most sense,
// where we just split the thing in half based on MSB, which will
// mesh well with the types of data we're storing.

// What happens when an element crosses a boundary?
//  - we store it in the higher-level one, rather than duplicating it.
//  - so searches are linear in the number of things that span regions,
//    but who cares?  If we wanted to be clever we coud use the fact
//    that all such elements intersect the center to provide an order
//    for more efficient lookup, but this doesn't seem worth the extra
//    complexity.

export class RegionMap {
  constructor() {
    this.node = null;
  }

  // Precondition: x0 < x1, y0 < y1 - the ranges are half-open [x0, x1).
  insert(x0, x1, y0, y1, value) {
    x1--; // it's actually more convenient to work with include coordinates.
    y1--;
    const b = bits(Math.max(x1, y1));
    if (this.node == null) {
      this.node = new Node(b);
    }
    while (b > this.node.bits) {
      // grow if necessary.
      const child = this.node;
      this.node = new Node(child.bits + 1);
      this.node.children[0] = child;
    }
    let node = this.node;
    const xor = x0 ^ x1 | y0 ^ y1;
    //console.log(`inserting ${[x0,x1,y0,y1,xor].map(x=>x.toString(2))}`);
    while (node.bit && !(xor & node.bit)) {
      //console.log(`node: ${node.bits} ${node.bit.toString(2)}`);
      const childIndex = ((y0 & node.bit) << 1 | x0 & node.bit) >> node.bits;
      let child = node.children[childIndex];
      if (!child) child = node.children[childIndex] = new Node(node.bits - 1);
      node = child;
    }
    node.values.add([x0, x1, y0, y1, value]);
  }

  * get(x, y) {
    //console.log(`get ${x.toString(2)}, ${y.toString(2)}`);
    if (!this.node) return;
    const b = bits(Math.max(x, y));
    if (this.node.bits < b) return;
    let node = this.node;
    while (node) {
      //console.log(`checking bit ${node.bits}`);
      for (const e of node.values) {
        //console.log(`  entry ${e}`);
        if (x >= e[0] && x <= e[1] && y >= e[2] && y <= e[3]) {
          yield e[4];
        }
      }
      //console.log(`  next: ${((y & node.bit) << 1 | x & node.bit) >> node.bits}`);
      node = node.children[((y & node.bit) << 1 | x & node.bit) >> node.bits];
    }
  }

  // TODO - a way to delete individual entries?

  clear() {
    this.node = null;
  }
}

class Node {
  constructor(bits) {
    this.bits = bits;
    this.bit = bits < 0 ? 0 : 1 << bits;
    this.children = [];
    this.values = new Set();
  }
}

// 0 => -1    (0)
// 1 => 0     (1)
// 2,3 => 1   (2)
// 4..7 => 2  (4)
// 8..15 => 3 (8)
const bits = (x) => 31 - Math.clz32(x);
