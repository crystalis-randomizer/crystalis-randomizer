// Basic quadtree implementation
// Main point is to store a multimap keyed by two-dimensional regions.
// Basic idea is that any node has at most one element; if it would have more
// then we subdivide it so that it has only one.  Note that a single region
// may end up in multiple nodes, and need not contain or be contained by its
// owner node.

export class QuadTree {
  constructor(x0, x1, y0, y1) {
    this.x0 = x0;
    this.x1 = x1;
    this.y0 = y0;
    this.y1 = y1;

    this.entry = 
  }
}


// insert A(0, 100)  -> A(0, 100)
// insert B(0, 80)   -> A(0, 100 : B(0, 80) (80, 100))
// insert C(20, 100) -> A(0, 100 : B(0, 80 : (0, 20) C(20, 80)) C(80, 100))

// need a balancing mechanism?
