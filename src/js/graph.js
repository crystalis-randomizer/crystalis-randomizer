import {Deque} from './util.js';

/**
 * First element is destination, rest are requirements.
 * @typedef {!Array<number>}
 */
export const Edge = {};

/** @return {!Edge} */
Edge.of = (/** ...!Node */ ...nodes) => nodes.map(n => n.uid);

export class Node {
  constructor(graph, name) {
    this.graph = graph;
    this.name = name;
    this.uid = graph.nodes.length;
    graph.nodes.push(this);
  }

  get nodeType() {
    return 'Node';
  }

  toString() {
    return `${this.nodeType} ${this.name}`;
  }

  /** @return {!Array<!Edge>} */
  edges() {
    return [];
  }
}

export class Graph {
  constructor() {
    this.nodes = [];
  }

  // TODO - options for depth vs breadth first?
  //      - pass wanted list as a named param?
  traverse(opts = {}) {
    const {
      wanted = undefined,
      dfs = false,
    } = opts;
    // Turn this into a mostly-standard depth-first traversal.
    // Basically what we do is build up a new graph where each edge has a list
    // of other nodes that all need to be seen first to take it.

    // Map<Node, Map<string, Array<Node>>>
    const stack = new Deque(); // TODO option for BFS or DFS
    const seen = new Map();
    const g = new Map();

    for (const n of this.nodes) {
      for (const edge of n.edges()) {
        const label = edge.join(' ');
        for (let i = 1; i < edge.length; i++) {
          const from = edge[i];
          if (!g.has(from)) g.set(from, new Map());
          g.get(from).set(label, edge);
        }
        if (edge.length == 1) {
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
        new Set((wanted || this.nodes).map(n => n instanceof Node ? n.uid : n));
    const empty = new Map();

    // loop until we don't make any progress
    while (want.size && stack.length) {
      const n = dfs ? stack.pop() : stack.shift();
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
      win: !want.size,
      seen,
      path: [...seen.values()].map(([n, ...deps]) => {
        const str = o => [
          //o instanceof Location ? o.area.name + ': ' : '',
          this.nodes[o],
          //o instanceof Slot && o.index != o.id ? ' $' + o.index.toString(16) : '',
        ];
        return [n, [
          ...str(n),
          ' (',
          deps.map(d => str(d).join('').replace(/\s+\(.*\)/, '')).join(', '),
          ')',
        ].join('')];
      }),
    };
  }

  integrate(opts = {}) {
    // TODO - set of nodetypes to integrate and/or retain!
    //   - {itemget, tracker} are both useful here to retain...

    // Given required domain knowledge, should probably be in nodes.js

    return integrateLocations(this, opts);
  }

  // Here's the thing, slots require items.
  // We don't want to transitively require dependent slots' requirements,
  // but we *do* need to transitively require location requirements.

  // I think we need to do this whole thing all at once, but can we just
  // compute location requirements somehow?  And trigger requirements?
  //  - only care about direct requirements, nothing transitive.
  // Build up a map of nodes to requirements...

  // We have a dichotomy:
  //  - items can BE reqirements
  //  - everything else can HAVE requirements, including slots
  //  - no link between slot and item

  // The node graph contains the location graph, which has cycles
  // Recursive method

}

class WatchedMap extends Map {
// set(k,v) { console.log(`${k} <= ${[...v]}`);
// const ret=super.set(k,v);
// console.log(`  ${[...this.keys()].map(x=>`(${x})`)}`); return ret;}
// delete(k) { console.log(`DELETE ${k}`); return super.delete(k); }
// clear() { console.log(`CLEAR`); return super.clear(); }
}
// Consider cleaning up and rewriting a bunch of this in typescript

export class SparseDependencyGraph {
  constructor(size) {
    /** @const {!Array<!Map<string, !Set<number>>>} */
    this.nodes = new Array(size).fill(0).map((_,i) => i==101?new WatchedMap:new Map());
    /** @const {!Array<boolean>} */
    this.finalized = new Array(size).fill(false);
  }

  // Before adding a route, any target is unreachable
  // To make a target always reachable, add an empty route

  /** @return {!Array<!SparseRoute>} */
  addRoute(/** !Array<number> */ edge) {
//console.log(`addRoute: ${edge}`);
    const target = edge[0];
    if(this.finalized[target]) {
      throw new Error(`Attempted to add a route for finalized node ${target}`);
    }
    // NOTE: if any deps are already integrated out, replace them right away
    let s = new Set();
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
          if (repl.size == 1) {
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
//console.log(`${target}: ${sorted}`);
    if (current.has(label)) return [];
    for (const [l, d] of current) {
      if (containsAll(s, d)) return [];
      if (containsAll(d, s)) current.delete(l);
    }
//console.log(`  => set`);
    current.set(label, s);
//console.log(`  => ${target}: ${[...current.keys()].map(x=>`(${x})`)}`);
    return [new SparseRoute(target, s, `${target}:${label}`)];
  }

  finalize(/** number */ node) {
const PR=node==301;
//console.log(`finalize ${node}`);
    if (this.finalized[node]) return;
    // pull the key, remove it from *all* other nodes
    const alternatives = this.nodes[node];
    this.finalized[node] = true;
    for (let target = 0; target < this.nodes.length; target++) {
      const /** !Map<string, !Set<number>> */ routes = this.nodes[target];
//if(PR)console.log(`finalizing ${node}: target=${target} ${[...routes.keys()].map(x=>`(${x})`)}`);
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
  }
}

class SparseRoute {
  constructor(/** number */ target, /** !Set<number> */ deps, /** string */ label) {
    this.target = target;
    this.deps = deps;
    this.label = label;
  }  
}

// TODO - it's really obnoxious that I can't break this line without screwing
// up indentation for the entire body of the function!
const integrateLocations = (graph, {start = graph.locations()[0], removeConditions = true, removeTriggers = true, removeOptions = true} = {}) => {

  const /** !Object<string, !Array<!Connection>> */ locs = {};
  const /** !Object<string, !Node> */ nodes = {};
  const /** !Set<!Connection> */ connections = new Set();
  const depgraph = new Depgraph();

  // First index all the nodes and connections.
  for (const n of graph.nodes) {
    nodes[n.uid] = n;
    if (removeOptions && n instanceof Option) {
      //console.log(`Option ${n.name}: ${n.value}`);
      if (n.value) depgraph.addRoute(n.uid, []);
      depgraph.integrateOut(n.uid);
    }
    if (!(n instanceof Location)) continue;
    locs[n.uid] = [];
    for (const c of n.connections) {
      if (connections.has(c)) continue;
      // add connection and maybe everse to the set
      connections.add(c);
      if (c.bidi) connections.add(c.reverse());
    }
    if (removeTriggers) {
      for (const {trigger, deps} of n.triggers) {
        depgraph.addRoute(trigger.uid, [n.uid, ...deps.map(d => d.uid)]);
      }
      if (n.bossNode) {
        depgraph.addRoute(n.bossNode.uid, [n.uid, ...n.bossNode.deps.map(d => d.uid)]);
      }
    }
    for (const c of n.chests) {
      depgraph.addRoute(c.uid, [n.uid]);
    }
  }
  // Group connections by "from" location.
  for (const c of connections) {
    locs[c.from.uid].push(c);
  }
  if (removeTriggers) {
    for (const n of graph.nodes) {
      if (n instanceof Trigger) {
        if (n.slot) depgraph.addRoute(n.slot.uid, [n.uid]);
        depgraph.integrateOut(n.uid);
      }
    }
  }

  // Start the traversal.
  const startRoute = depgraph.addRoute(start.uid, [])[0];
  // queue is a queue of routes - each successfully-added route gets added
  const queue = new Map([[startRoute.label, startRoute]]);
  const iter = queue.values();
  let next;
  while (!(next = iter.next()).done) {
    const route = next.value;
    for (const c of locs[route.target]) {
      const deps = [...route.deps, ...c.deps.map(d => d.uid)];
      if (c.from.bossNode) deps.push(c.from.bossNode.uid);
      for (const r of depgraph.addRoute(c.to.uid, deps)) {
        if (!queue.has(r.label)) queue.set(r.label, r);
      }
    }
  }

  if (removeConditions) {
    for (const n of graph.nodes) {
      if (!(n instanceof Condition)) continue;
      for (const o of n.options) {
        depgraph.addRoute(n.uid, o.map(x => x.uid));
      }
      depgraph.integrateOut(n.uid);
    }
  }

  // Integrate out all the locations - maybe just always integrate everything out?
  for (const n of depgraph.graph.keys()) {
    depgraph.integrateOut(n);
  }

  // for (const s of graph.nodes) {
  //   if (s instanceof Slot) {
  //     console.log(`${s.orig} ($${s.origIndex.toString(16).padStart(2,0)}): ${[...(depgraph.graph.get(s.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => nodes[n].name).join(' & ') + ')').join(' | ')}`);
  //   }
  // }

  return depgraph;
};

const containsAll = (/** !Set */ left, /** !Set */ right) => /** boolean */ {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
};

