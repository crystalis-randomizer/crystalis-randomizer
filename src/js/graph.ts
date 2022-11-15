import {Rom} from './rom';
import {Deque} from './util';

declare const NODE_ID: unique symbol;

export type NodeId = number & {[NODE_ID]: never};

export type Edge = NodeId[];
export const Edge: {of: (...nodes: Node[]) => Edge} = {
  of: (...nodes) => nodes.map(n => n.uid),
};

// TODO - consider parametrizing Node and Graph?
export class Node {

  readonly uid: NodeId;

  constructor(readonly graph: Graph, readonly name: string) {
    this.uid = graph.nodes.length as NodeId;
    graph.nodes.push(this);
  }

  get nodeType(): string {
    return 'Node';
  }

  toString(): string {
    return `${this.nodeType} ${this.name}`;
  }

  edges(opts?: {}): Edge[] {
    return [];
  }

  /** @param rom The PRG rom image. */
  write() {}
}

export class Graph {

  readonly nodes: Node[] = [];

  constructor(readonly rom?: Rom) {}

  // TODO - options for depth vs breadth first?
  //      - pass wanted list as a named param?
  traverse({wanted, dfs = false}: {wanted?: Node[], dfs?: boolean} = {}): {
    path: [NodeId, string][],
    seen: Map<NodeId, Edge>,
    win: boolean,
  } {
    // Turn this into a mostly-standard depth-first traversal.
    // Basically what we do is build up a new graph where each edge has a list
    // of other nodes that all need to be seen first to take it.

    // Map<Node, Map<string, Array<Node>>>
    const stack = new Deque<NodeId>(); // TODO option for BFS or DFS
    const seen = new Map<NodeId, Edge>();
    const g = new Map<NodeId, Map<string, Edge>>();

    for (const n of this.nodes) {
      for (const edge of n.edges()) {
        const label = edge.join(' ');
        for (let i = 1; i < edge.length; i++) {
          const from = edge[i];
          if (!g.has(from)) g.set(from, new Map());
          g.get(from)!.set(label, edge);
        }
        if (edge.length === 1) {
          const to = edge[0];
          if (!seen.has(to)) {
            stack.push(to);
            seen.set(to, edge);
          }
        }
      }
    }

    // We now have a complete graph that we can do a simple DFS on.
    const want =
        new Set<NodeId>((wanted || this.nodes).map((n: Node | NodeId) =>
                                                   n instanceof Node ? n.uid : n));
    const empty = new Map<string, Edge>();

    // loop until we don't make any progress
    while (want.size && stack.length) {
      const n = dfs ? stack.pop()! : stack.shift()!;
      want.delete(n);
      NEXT_EDGE:
      for (const edge of (g.get(n) || empty).values()) {
        const next = edge[0];
        if (seen.has(next)) continue;
        for (let i = 1; i < edge.length; i++) {
          if (!seen.has(edge[i])) continue NEXT_EDGE;
        }
        seen.set(next, edge);
        stack.push(next);
      }
    }
    return {
      path: [...seen.values()].map(([n, ...deps]) => {
        const str = (o: NodeId) => [
          // o instanceof Location ? o.area.name + ': ' : '',
          this.nodes[o],
          // o instanceof Slot && o.index != o.id ?
          //     ' $' + o.index.toString(16) : '',
        ];
        return [n, [
          ...str(n),
          ' (',
          deps.map(d => str(d).join('').replace(/\s+\(.*\)/, '')).join(', '),
          ')',
        ].join('')];
      }),
      seen,
      win: !want.size,
    };
  }

  // Here's the thing, slots require items.
  // We don't want to transitively require dependent slots' requirements,
  // but we *do* need to transitively require location requirements.

  // I think we need to do this whole thing all at once, but can we just
  // compute location requirements somehow?  And trigger requirements?
  //  - only care about direct requirements, nothing transitive.
  // Build up a map of nodes to requirements...

  // We have a dichotomy:
  //  - items can BE requirements
  //  - everything else can HAVE requirements, including slots
  //  - no link between slot and item

  // The node graph contains the location graph, which has cycles
  // Recursive method

}

export class SparseDependencyGraph {

  readonly nodes: Map<string, Set<NodeId>>[];
  readonly finalized: boolean[];

  constructor(size: number) {
    this.nodes = new Array(size).fill(0).map(() => new Map());
    this.finalized = new Array(size).fill(false);
  }

  // Before adding a route, any target is unreachable
  // To make a target always reachable, add an empty route

  addRoute(edge: Edge): SparseRoute[] {
    // console.error(`addRoute: ${edge}`);
    const target = edge[0];
    if (this.finalized[target]) {
      throw new Error(`Attempted to add a route for finalized node ${target}`);
    }
    // NOTE: if any deps are already integrated out, replace them right away
    let s = new Set<NodeId>();
    for (let i = edge.length - 1; i >= 1; i--) s.add(edge[i]);
    while (true) {
      let changed = false;
      for (const d of s) {
        if (d === target) return [];
        if (this.finalized[d]) {
          // need to replace before admitting.  may need to be recursive.
          const /** !Map<string, !Set<number>> */ repl = this.nodes[d];
          if (!repl.size) return [];
          s.delete(d);
          // if there's a single option then just inline it directly
          if (repl.size === 1) {
            for (const dd of repl.values().next().value) {
              s.add(dd);
            }
            changed = true;
            break;
          }
          // otherwise we need to be recursive
          const routes = new Map();
          for (const r of repl.values()) {
            for (const r2 of this.addRoute([target, ...s, ...r])) {
              routes.set(r2.label, r2);
            }
          }
          return [...routes.values()];
        }
      }
      if (!changed) break;
    }
    const sorted = [...s].sort();
    s = new Set(sorted);
    const label = sorted.join(' ');
    const current = this.nodes[target];
    // console.error(`${target}: ${sorted}`);
    if (current.has(label)) return [];
    for (const [l, d] of current) {
      if (containsAll(s, d)) return [];
      if (containsAll(d, s)) current.delete(l);
    }
    // console.error(`  => set`);
    current.set(label, s);
    // console.error(`  => ${target}: ${[...current.keys()].map(x=>`(${x})`)}`);
    return [{target, deps: s, label: `${target}:${label}`}];
  }

  finalize(node: NodeId) {
    // const PR = node === 301;
    if (this.finalized[node]) return;
    // pull the key, remove it from *all* other nodes
    this.finalized[node] = true;
    for (let target = 0 as NodeId; target < this.nodes.length; target++) {
      const routes: Map<string, Set<NodeId>> = this.nodes[target];
      // if(PR)console.log(`finalizing ${node}: target=${target} ${
      //                    [...routes.keys()].map(x=>`(${x})`)}`);
      if (!routes.size) continue;
      for (const [label, route] of routes) {
        // substitute... (reusing the code in addRoute)
        if (route.has(node)) {
          const removed = this.finalized[target];
          this.finalized[target] = false;
          routes.delete(label);
          this.addRoute([target, ...route.values()]);
          this.finalized[target] = removed;
        }
      }
    }
    // console.error(`finalized ${node}: ${[...this.nodes[node].values()]
    //                    .map(a => [...a].join('&')).join(' | ')}`);
  }
}

export interface SparseRoute {
  readonly target: NodeId;
  readonly deps: Set<NodeId>;
  readonly label: string;
}

const containsAll = <T>(left: Set<T>, right: Set<T>): boolean => {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
};
