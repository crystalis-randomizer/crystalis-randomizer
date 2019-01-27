import {Requirements, Items} from './sat.js';
import {PMap,equal} from './pmap.js';

class Edge {
  constructor(left, right, arrow, attrs) {
    this.left = left;
    this.right = right;
    this.arrow = arrow;
    this.attrs = attrs;
  }

  // reverse() {
  //   return new Edge(this.right, this.left, this.arrow, this.attrs);
  // }

  toDot() {
    const attrs = this.attrs.length ? ` [${this.attrs.join(', ')}]` : '';
    return `  ${this.left.uid} ${this.arrow} ${this.right.uid}${attrs};`;
  }
}

class Node {
  constructor(graph) {
    this.graph = graph;
    this.hashCode_ = graph.nodes.length;
    this.uid = 'n' + graph.nodes.length;
    graph.nodes.push(this);
  }

  equals(that) {
    return this.uid === that.uid;
  }
  hashCode() {
    return this.hashCode_;
  }
  toString() {
    return this.uid;
  }
}

export class Graph {
  constructor() {
    const nodes = [];
    this.nodes = nodes;
  }

  findSlot(name) {
    return this.nodes.find(n => n instanceof Slot && n.name == name);
  }

  // There's two different kind of dot outputs.
  // 1. just the locations, with edges annotated
  // 2. items and triggers, (all directed edges,locations integrated out)

  // Outputs a .dot file.
  toLocationGraph() {
    const parts = [];
    parts.push(
      'digraph locations {',
      'node [shape=record, style=filled, color=white];',
    );
    const subgraphs = {};
    const edges = new Set();
    const areas = [];

    for (const n of this.nodes) {
      if (n instanceof Location) {
        let area = subgraphs[n.area.uid];
        if (!(n.area.uid in subgraphs)) {
          areas.push(n.area);
          area = subgraphs[n.area.uid] = [];
        }
        area.push(n.toDot());
        for (const e of n.edges()) {
          edges.add(e);
        }
      }
    }

    for (const area of areas) {
      parts.push(
        `  subgraph cluster_${area.uid} {`,
        `    style=filled;`,
        `    color="lightgrey";`,
        `    label="${area.name}";`,
        ...subgraphs[area.uid],
        '  }',
      );
    }

    for (const edge of edges) {
      parts.push(edge.toDot());
    }

    parts.push('}');
    return parts.join('\n');
  }

  locations() {
    return this.nodes.filter(n => n instanceof Location);
  }

  gettables() {
    return this.nodes.filter(n => n instanceof Slot || n instanceof Trigger);
  }

  slots() {
    return this.nodes.filter(n => n instanceof Slot);
  }

  traverse(start = this.locations()[0]) {
    // Turn this into a mostly-standard depth-first traversal.
    // Basically what we do is build up a new graph where each edge has a list
    // of other nodes that all need to be seen first to take it.

    // Map<Node, Map<string, Array<Node>>>
    const stack = [];
    const seen = new Map();
    const g = new Map();
    const addEdge = (to, ...deps) => {
      for (const from of deps) {
        if (!g.has(from)) {
          g.set(from, new Map());
        }
        const entry = [to, ...deps];
        g.get(from).set(entry.map(n => n.uid).join(' '), entry);
      }
    }
    for (const n of this.nodes) {
      if (n instanceof Location) {
        for (const c of n.connections) {
          addEdge(c.to, c.from, ...c.deps, ...(c.from.bossNode ? [c.from.bossNode] : []));
          if (c.bidi) addEdge(c.from, c.to, ...c.deps, ...(c.to.bossNode ? [c.to.bossNode] : []));
        }
        for (const {trigger, deps} of n.triggers) {
          addEdge(trigger, n, ...deps);
        }
        for (const c of n.chests) {
          addEdge(c, n);
        }
        if (n.bossNode) {
          addEdge(n.bossNode, n, ...n.bossNode.deps);
        }
      } else if (n instanceof Condition) {
        for (const o of n.options) {
          addEdge(n, ...o);
        }
      } else if (n instanceof Option) {
        if (n.value) {
          stack.push([n, [{name: 'OPTION'}]]);
        }
      } else if (n instanceof Slot) {
        addEdge(n.item, n);
      } else if (n instanceof Trigger && n.slot) {
        addEdge(n.slot, n);
      }
    }

    stack.push([start, [{name: 'START'}]]);

    // We now have a complete graph that we can do a simple DFS on.
    const want = new Set(this.gettables());
    const empty = new Map();

    // loop until we don't make any progress
    while (want.size && stack.length) {
      const [n, deps] = stack.pop();
      if (seen.has(n)) continue;
      //console.log(`traverse ${n.name}`);
      seen.set(n, deps);
      want.delete(n);
      for (const [next, ...deps] of (g.get(n) || empty).values()) {
        //const sat = deps.every(d => seen.has(d));
        //console.log(`  follow-on: \x1b[1;3${sat+1}m${next.name}\x1b[m${deps.length ? ' if ' : ''}${deps.map(d => `\x1b[1;3${seen.has(d)+1}m${d.name}\x1b[m`).join(', ')}`);
        if (seen.has(next)) continue;
        if (deps.every(d => seen.has(d))) stack.push([next, deps]);
      }
    }
    return {
      win: !want.size,
      seen,
      path: [...seen].map(([n, deps]) => {
        const str = o => [
          o instanceof Location ? o.area.name + ': ' : '',
          o.name,
          o instanceof Slot && o.index != o.id ? ' $' + o.index.toString(16) : '',
        ];
        return [
          ...str(n),
          ' [',
          deps.map(d => str(d).join('').replace(/\s+\(.*\)/, '')).join(', '),
          ']',
        ].join('');
      }),
    };
  }

  // Returns a list of items and all prerequisites.
  integrate(start = this.locations()[0]) {
    // Build up a mapping of Slot <--> index
    const slots = new Map();
    const revSlots = [];
    for (const slot of this.nodes.filter(n => n instanceof Slot)) {
      slots.set(slot, BigInt(revSlots.length));
      revSlots.push(slot);
    }
    // Now start traversing the graph. Save results in map<node, req>.
    const all = new Map();
    for (const n of this.traverse(start).seen) {
      
    }
  }

  // Here's the thing, slots reqire items.
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

// Need ALL PATHS from a given location to start.
// For each path, what are all the requirements?
// May include Conditions, in which case we need to
// decompose and then recompose them correctly.
// For now, let's just traverse the graph and treat
// all other types of nodes as opaque?

// Can we start with a big graph of everything and then
// systematically eliminate nodes of the wrong type by substituting
// them in everywhere else?
//  - e.g.
//    start <- {T}
//    leaf <- {start|valleyofwind}
//    Slot$0 <- {leaf}
//    valleyofwind <- {leaf|windmillcave}
//    Slot$23 <- {windmillcave&zebu&alarm}
//  then sub in start<-T everywhere
//    leaf <- {T|valleyofwind}
//  when we hit a cycle,
//    valleyofwind <- {valleyofwind&X | T}
//  then remove that conjunction entirely... it is irrelevant.
// Just use arrays of arrays here?

// type PSet>T> = PMap<T, true>


// This isn't working - scaling is too bad.
// We need to simplify the location graph first.
// Break it up into domains with all the same requirements.
// For each location, find all *shortest* paths to start.
//  -> identify direction and dead ends, at the very least
//     what paths can go in reverse at all???
//  -> reduce number of locations to ~50
// Then drop the graph and just represent as alternative requirements,
// with lots and triggers.


// TODO - these are kind of redundant and messy!!
// Consider cleaning up and rewriting a bunch of this in typescript

class Depgraph {
  constructor() {
    /** @const {!Map<string, !Map<string, !Set<string>>>} */
    this.graph = new Map();
    /** @const {!Set<string>} */
    this.removed = new Set();
  }

addRoute(...args){
const check =()=>{for(const a of (this.graph.get('n13')||new Map).values())for(const d of a)if('n13'==d)return false;return true;};
const GOOD=check();//this.graph.get('n628')&&this.graph.get('n628').size;
const r=this.addRoute2(...args);
if (GOOD && !check()){console.log(`WTF?`);console.dir(args);}
//this.graph.get('n628').size) {console.log(`LOST ROUTE TO n628`);console.dir(args);}
return r;
}

  // Before adding a route, any target is unreachable
  // To make a target always reachable, add an empty route
  addRoute2(/** string */ target, /** !Iterable<string> */ deps) /** !Array<!Depgraph.Route> */ {
//PR=target=='n13';
if(PR)console.log(`  addRoute(${target}, [${[...deps].join(', ')}])`);
if(PR)console.log(`  routes=[${[...this.graph.get(target).keys()].join(', ')}]`);
if(this.removed.has(target))throw new Error('CANNOT ADD ONCE FINALIZED');
    if (!this.graph.has(target)) this.graph.set(target, new Map());
    // NOTE: if any deps are already integrated out, replace them right away
    let s = new Set(deps);
    while (true) {
      let changed = false;
      for (const d of s) {
if(PR)console.log(`  target=${target}, d=${d}`);
        if (d === target) return [];
        if (this.removed.has(d)) {
          // need to replace before admitting.  may need to be recursive.
          const /** !Map<string, !Set<string>> */ replacement = this.graph.get(d)||new Map();
if(PR)console.log(`  replacement=${[...replacement.values()].map(s=>[...s].join(' & ')).join(' | ')}`);
          if (!replacement.size) return [];
          s.delete(d);
          // if there's a single option then just inline it directly
          if (replacement.size == 1) {
            for (const dd of replacement.values().next().value) {
              s.add(dd);
            }
            changed = true;
            break;
          }
          // otherwise we need to be recursive
          const routes = new Map();
if(PR)console.log(`  recursing`);
          for (const r of replacement.values()) {
            for (const r2 of this.addRoute(target, [...s, ...r])) {
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
    const current = this.graph.get(target);
if(PR)console.log(`  current [${[...current.keys()].join(', ')}] label ${label}`);
    if (current.has(label)) return [];
    for (const [l, d] of current) {
if(PR&&containsAll(s, d))console.log(`  nothing to do: already has ${[...s].join('&')}, ${[...d].join('&')}`);
if(PR&&containsAll(d, s))console.log(`  delete existing: ${[...s].join('&')}, ${[...d].join('&')}`);
      if (containsAll(s, d)) return [];
      if (containsAll(d, s)) current.delete(l);
    }
    current.set(label, s);
if(PR)console.log(`  CURRENT => [${[...current.keys()].join(', ')}]`);
    return [new Depgraph.Route(target, s, `${target}:${label}`)];
  }

  integrateOut(/** string */ node) {
    // pull the key, remove it from *all* other nodes
    const alternatives = this.graph.get(node) || new Map();
    this.removed.add(node);
    for (const [target, /** !Map<string, !Set<string>> */ routes] of this.graph) {
//PR=(node=='n411'&&target=='n628');
if(PR)console.log(`removing ${node} from ${target} routes=[${[...routes.keys()].join(', ')}]`);
      for (const [label, route] of routes) {
if(PR)console.log(`  route [${[...route].join(', ')}] `);
        // substitute... (reusing the code in addRoute)
        if (route.has(node)) {
if(PR)console.log(`  label=${label}`);
if(PR&&this.graph.get('n628')&&!this.graph.get('n628').size)console.log(`WTF: ${node}`);
const removed = this.removed.has(target);
this.removed.delete(target);
          routes.delete(label);
          this.addRoute(target, route);
if(removed)this.removed.add(target);
if(PR&&this.graph.get('n628')&&!this.graph.get('n628').size)console.log(`WTF2: ${node}`);
        }
      }
    }
//if(this.removed.get('n628')&&!this.removed.get('n628').size)console.log(`WTF: ${node}`);
if(this.graph.get('n628')&&!this.graph.get('n628').size)console.log(`WTF: ${node}`);
PR=false;
  }
}
let PR=false;
Depgraph.Route = class {
  constructor(/** string */ target, /** !Set<string> */ deps, /** string */ label) {
    this.target = target;
    this.deps = deps;
    this.label = label;
  }  
};

function* concatIterables(...iters) {
  for (const iter of iters) {
    yield* iter;
  }
}


// TODO - it's really obnoxious that I can't break this line without screwing
// up indentation for the entire body of the function!
export const integrateLocations2 = (graph, {start = graph.locations()[0], removeConditions = true, removeTriggers = true, removeOptions = true} = {}) => {

  const /** !Object<string, !Array<!Connection>> */ locs = {};
  const /** !Object<string, !Node> */ nodes = {};
  const /** !Set<!Connection> */ connections = new Set();
  const depgraph = new Depgraph();

  // First index all the nodes and connections.
  for (const n of graph.nodes) {
    nodes[n.uid] = n;
    if (removeOptions && n instanceof Option) {
      console.log(`Removing option ${n.name}: ${n.value}`);
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
        if (n instanceof Boss) depgraph.addRoute(n.uid, n.deps.map(d => d.uid));
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
if (!locs[route.target])console.error(`route: ${route} route.target: ${route.target} locs: ${locs[route.target]}`);
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

console.dir(depgraph.graph.get('n13'));
const check =()=>{for(const a of (depgraph.graph.get('n13')||new Map).values())for(const d of a)if('n13'==d)return false;return true;};
if(!check())console.log(`WTF!!!`);

//   for (const loc in locs) {
// //   console.log(`${nodes[loc].uid} ${nodes[loc].area.name} ${nodes[loc].name}: ${[...(depgraph.graph.get(loc)||new Map()).values()].map(([...s]) => '(' + s.map(n => nodes[n].uid + ' ' + nodes[n].name).join(' & ') + ')').join(' | ')}`);
//     console.log(`${nodes[loc].area.name} ${nodes[loc].name}: ${[...(depgraph.graph.get(loc)||new Map()).values()].map(([...s]) => '(' + s.map(n => nodes[n].name).join(' & ') + ')').join(' | ')}`);
//   }
  // console.log('================');
  for (const s of graph.nodes) {
    if (s instanceof Slot) {
      console.log(`${s.orig} ($${s.origIndex.toString(16).padStart(2,0)}): ${[...(depgraph.graph.get(s.uid)||new Map()).values()].map(([...s]) => '(' + s.map(n => nodes[n].name).join(' & ') + ')').join(' | ')}`);
    }
  }

  // // Now depgraph has a map from all locations to routes with no locations in them
  // // But we still have options, triggers, conditions, bosses.
  // if (removeOptions) {
  //   for (const loc of Loc.all()) {
  //     loc.removeOptions();
  //   }
  // }

  // // for (const loc of Loc.all()) {
  // //   console.log(`${loc.location.area.name}: ${loc.location.name}
  // // ${[...loc.allRoutes()].map(r => [...r.deps].map(d => nodes[d].name)).join('\n  ')}`);
  // // }

  // return new Map([...Loc.all()].map(loc =>
  //     [loc.location, [...loc.allRoutes()].map(r =>
  //         DepSet.of([...r.deps].map(d => nodes[d])))]));
  // returns a Map<Location, Array<DepSet>>

  // TODO - what to return?
  // TODO - instantiate options
  return depgraph;
};

class Loc {
  constructor(/** !Location */ location) {
    this.location = location;
    this.routes = {};
    this.connections = [];
  }

  addRoute(/** !Route */ route) {
    if (this != route.destination) throw new Error('Bad route for this destination');
    if (route.label in this.routes) return false;
    for (let label in this.routes) {
      const r = this.routes[label];
      if (route.containsAll(r)) return false;
      if (r.containsAll(route)) delete this.routes[label];
    }
    this.routes[route.label] = route;
    return true;
  }

  replace(/** Map<string, !Array<!Array<string>> */) {
    for (const r in this.routes) {
      r.removeOptions();
    }
  }

  * allRoutes() {
    for (const r in this.routes) {
      yield this.routes[r];
    }
  }

  static of(/** !Location */ loc) {
    if (!Loc.map) Loc.map = {};
    if (!(loc.uid in Loc.map)) Loc.map[loc.uid] = new Loc(loc);
    return Loc.map[loc.uid];
  }

  static * all() {
    if (!Loc.map) Loc.map = {};
    for (let id in Loc.map) {
      yield Loc.map[id];
    }
  }
}

const containsAll = (/** !Set */ left, /** !Set */ right) => /** boolean */ {
  if (left.size < right.size) return false;
    for (const d of right) {
      if (!left.has(d)) return false;
    }
  return true;
};

class Route {
  constructor(/** !Loc */ destination, /** !Set<string> */ deps) {
    if (!destination) throw new Error('no destination');
    this.destination = destination;
    this.deps = deps;
    // TODO - require sorted...
    this.label = destination.location.uid + ':' + [...deps].join(' ');
  }

  containsAll(/** !Route */ that) /** boolean */ {
    if (this.destination != that.destination) throw new Error('bad comparison');
    return containsAll(this.deps, that.deps);
  }

  follow(/** !Connection */ connection) /** !Route */ {
    if (connection.from != this.destination.location) {
      throw new Error('bad link');
    }
    // TODO - realize options?
    
    const deps = [
      ...connection.deps,
      ...(connection.from.bossNode ? [connection.from.bossNode] : []),
    ];//.filter(
    return new Route(
        Loc.of(connection.to),
        new Set([...this.deps, ...deps.map(x => x.uid)].sort()));
  }
}

// TODO - it's really obnoxious that I can't break this line without screwing
// up indentation for the entire body of the function!
export const integrateLocations = (graph, {start = graph.locations()[0], removeConditions = true, removeTriggers = true, removeOptions = true} = {}) => {

  // Index the locations and connections.
  const /** !Array<!Loc> */ locations = [];
  const /** !Object<string, !Node> */ nodes = {};
  const /** !Object<string, !Loc> */ locationIndex = {};
  const /** !Set<Connection> */ connections = new Set();
  for (const n of graph.nodes) {
    nodes[n.uid] = n;
    if (!(n instanceof Location)) continue;
    const l = Loc.of(n);
    locationIndex[n.uid] = l;
    locations.push(l);
    for (const c of n.connections) {
      if (connections.has(c)) continue;
      // add connection and maybe everse to the set
      connections.add(c);
      if (c.bidi) connections.add(c.reverse());
    }
  }
  // group connections by "from" location
  for (const c of connections) {
    locationIndex[c.from.uid].connections.push(c);
  }

  //console.log(locationIndex);
  

  // Start the traversal.
  const startRoute = new Route(Loc.of(start), new Set());
  const queue = new Map([[startRoute.label, startRoute]]);
  const iter = queue[Symbol.iterator]();
  let next;
  while (!(next = iter.next()).done) {
    const route = next.value[1];
    for (const c of route.destination.connections) {
      const r = route.follow(c);
      if (!queue.has(r.label) && r.destination.addRoute(r)) {
        queue.set(r.label, r);
      }
    }
  }

  if (removeOptions) {
    for (const loc of Loc.all()) {
      loc.removeOptions();
    }
  }

  // for (const loc of Loc.all()) {
  //   console.log(`${loc.location.area.name}: ${loc.location.name}
  // ${[...loc.allRoutes()].map(r => [...r.deps].map(d => nodes[d].name)).join('\n  ')}`);
  // }

  return new Map([...Loc.all()].map(loc =>
      [loc.location, [...loc.allRoutes()].map(r =>
          DepSet.of([...r.deps].map(d => nodes[d])))]));
  // returns a Map<Location, Array<DepSet>>

  // TODO - what to return?
  // TODO - instantiate options
};

export const integrateItems = (graph, start = graph.locations()[0]) => {
  const locs = integrateLocations(graph, start);
  // integrate out the options.
};

class DepSet {
  constructor(/** !Map<string, !Node> */ deps) {
    // NOTE: deps MUST be sorted.
    this.deps = deps;
    this.label = [...this.deps.keys()].join('&');
  }

  static of(/** ...!Node */ nodes) {
    nodes.sort((a, b) => a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
    return new DepSet(new Map(nodes.map(n => [n.uid, n])));
  }

  [Symbol.iterator]() {
    return this.deps.values();
  }

  containsAll(that) {
    if (this.deps.size < that.deps.size) return false;
    for (const d of that.deps) {
      if (!this.deps.has(d)) return false;
    }
    return true;
  }

  union(that) {
    return DepSet.of(...this.deps.value(), ...that.deps.values());
  }
}

class DepAlternatives {
  constructor(alternatives) {
    this.alternatives = alternatives;
  }

  addAlternative(deps) {
    // Add the given depset as an 
  }

  concat(deps) {
    // Concatenates to all
  }

  flatMap(func) {
    // func takes a single node and returns either a node, a list, a depset, or a depalternatives
    // We do the right thing with it from there, mapping it as appropriate.
    // For conditions, this will be straightforward but very useful
    // Returns a new DepAlternatives
  }
}

//   while (queue.length) {
//     const route = queue.shift();
//     if (

//   }

//   // 1. Simplify the location graph.
//   const nodes = {};
//   const nodeToLocationNumber = {};
//   const locations = [];
//   const connections = [];
//   const seen = new Set();
//   const queue = [];
//   for (const n of graph.nodes) {
//     nodes[n.uid] = n;
//     if (!(n instanceof Location)) continue;
//     nodeToLocationNumber[n.uid] = locations.length;
//     locations.push(n);
//     for (const c of n.connections) {
//       connections[c.from] = c;
//       if (c.bidi) connections[c.to] = c.reverse();
//     }
//   }
//   // LocationDeps is a map from location number to a set of alternatives.
//   // Alternatives are represented as a list of sorted requirement lists.
//   const locationDeps = new Array(locations.length).fill(0).map(() => []);
//   // No requirements to get to start.
//   const startNum = nodeToLocationNumber[start.uid];
//   locationDeps[startNum].push([]);
//   seen.add(startNum);
//   queue.push(startNum);

//   while (queue.length) {
//     const from = queue.shift();
//     const deps = locationDeps[from];
//     for (const c of connections[from]) {
//       const to = c.to;
//       // TODO - simple "seen" approach does not work.
//       // only want to stop actual cycles, but will need to
//       // revisit nodes to do work IF they got a new path...
//       // Could use "loc:deps" as seen...
//     }
//   }


  
//   function addAlternative(alternatives, newAlt) {
//     // TODO - consider bigint, but would need polyfill
//     for (let i = 0; i < alternatives.length; i++) {
//       const alt = alternatives[i];
//       const common = findCommon(alt, newAlt);
//       if (common != null) {
//         newAlt = common;
//         alternatives.splice(i, 1);
//         i = -1;
//       }
//     }
//     alternatives.push(newAlt);
//   }
  
//   function findCommon(left, right) {
//     // both should be sorted.
//     // Find if one is a subset of the other.
//     if (left.length < right.length) return findCommon(right, left);
//     let i = 0;
//     let j = 0;
//     while (i < left.length && j < right.length) {
//       i++;
//       if (left[i] === right[j]) j++;
//       if (right[j] < left[i]) return null;
//     }
//     return j == right.length ? right : null;
//   }

//   function merge(left, right) {
//     let i = 0;
//     let j = 0;
//     const out = [];
//     while (i < left.length && j < right.length) {
//       if (left[i] < right[j]) out.push(left[i++]);
//       else if (right[j] < left[i]) out.push(right[j++]);
//       else out.push(left[i++]), j++;
//     }
//     while (i < left.length) out.push(left[i++]);
//     while (j < right.length) out.push(right[j++]);
//     return out;
//   }
// };



export const integrate2 = (graph, start = graph.locations()[0]) => {
  const empty = PMap.EMPTY;
  // PMap<Node, PSet<PSet<Node>>>
  let result = empty;
  // Set<Connection>
  const connections = new Set();
  // Object<string, Node>
  const nodes = {};

  const add = (n, ...deps) => { 
    result = result.plus(n, (result.get(n) || empty).plus(PMap.setFrom(deps)));
  };

  // Substitute all instances of the given node with the alternates.
  const subs = (toDelete, deletedRequirements, toKeep, keepRequirements) => {
    
    // requirements and target are both PSet<PSet<Node>>
    let found = false;
    for (const t of keepRequirements.keys()) {
//if(!t.has)console.dir(t);
      if (t.has(toDelete)) {
        found = true;
        break;
      }
    }
    if (!found) return; // nothing to do
//console.log(`  Found dependent: ${toKeep}: ${keepRequirements}`);
    // We found a reference, so do the substitution
    let out = empty;
    for (const t of keepRequirements.keys()) {
//console.log(`    t: ${t}`);
      if (t.has(toDelete)) {
//console.log(`    has: ${deletedRequirements}`);
        for (const r of deletedRequirements.keys()) {
//console.log(`      r: ${r}`);
          let s = t.minus(toDelete);
//console.log(`      s: ${s}`);
          for (const d of r.keys()) { // TODO - plusAll?
            s = s.plus(d);
          }
//console.log(`      s: ${s}`);
          // remove any option that's left with a cycle
          if (!s.has(toKeep)) out = out.plus(s);
//console.log(`      out: ${out}`);
        }
      } else {
        out = out.plus(t);
//console.log(`    out: ${out}`);
      }
    }

//console.log(`  =1=> ${out}`);
    let terms = [...out.keys()];
    for (let i = 0; i < terms.length; i++) {
      let reset = false;
      for (let j = 0; j < terms.length && !reset; j++) {
        if (i == j) continue;
        if (terms[i].includes(terms[j])) {
          terms.splice(i, 1);
          reset = true;
        }
      }
      if (reset) i = -1;
    }
    out = PMap.setFrom(terms);
//console.log(`    sorted: ${toKeep} <- ${out}`);

    // return a PSet<PSet<Node>>
//console.log(`  =2=> ${out}`);
//PMap.PR=toKeep.hashCode()==281;
    result = result.plus(toKeep, out);
//console.log(`    after: ${result.get(toKeep)}`);
  };

  // Start by populating with only shallow edges.
  add(start);
  for (const n of graph.nodes) {
    if (n instanceof Location) {
      nodes[n.uid] = n;
      for (const c of n.connections) {
        connections.add(c);
      }
      for (const {trigger, deps} of n.triggers) {
        add(trigger, n, ...deps);
        nodes[trigger.uid] = trigger;
      }
      for (const c of n.chests) {
        add(c, n);
        nodes[c.uid] = c;
      }
      for (const b of n.bossNode ? [n.bossNode] : []) {
        add(b, n, ...n.bossNode.deps);
        nodes[b.uid] = b;
      }
    } else if (n instanceof Trigger && n.slot) {
      add(n.slot, n);
      nodes[n.slot.uid] = n.slot;
    } else if (n instanceof Condition) {
      for (const option of n.options) {
        add(n, ...option);
      }
      nodes[n.uid] = n;
    } else if (n instanceof Option && n.value) {
      add(n);
      nodes[n.uid] = n;
    }
  }
  // All locations/triggers/slots/bosses included in LHS, a
  for (const c of [...connections]) {
    // add reverse connections
    if (c.bidi) connections.add(c.reverse());
  }
  for (const c of connections) {
    const bossDep = c.from.bossNode ? [c.from.bossNode] : [];
    add(c.to, c.from, ...c.deps, ...bossDep);
  }

console.log(`Built up graph: ${result.size} nodes`);
  // At this point we have three levels of ORs
  // Start doing substitutions...
  const ordered = new Set(graph.traverse().seen.keys());
  for (const n of graph.nodes) {
    if (!ordered.has(n) && !(n instanceof Area)) ordered.add(n);
    if (n instanceof Condition) {
      ordered.delete(n);
      ordered.add(n);
    }
  }
  for (const toDelete of ordered/*result.keys()*/) {
    if (toDelete instanceof ItemGet) continue;
console.log(`Node: ${toDelete}: ${result.get(toDelete)}`);
    //if (toDelete.name === 'Start') continue; // leave "Start" in the RHS.
    const deleteRequirements = result.get(toDelete) || empty;
// console.log(`Deleting: ${toDelete.name} with reqs ${[...deleteRequirements].map(o=>[...o].map(r=>r.name).join(',')).join('|')}`);
//console.dir(deleteRequirements);
// console.log(`Deleting: ${toDelete.name}: ${deleteRequirements}`);
    // Leave all the slots
    if (!(toDelete instanceof Slot)) result = result.minus(toDelete);
    for (const [toKeep, keepRequirements] of result) {
      subs(toDelete, deleteRequirements, toKeep, keepRequirements);
    }
if (!(toDelete instanceof Slot)) {
  for (const [n, deps] of result) {
    for (const r of deps.keys()) {
      for (const s of r.keys()) {
        if (s === toDelete) {
//for(const[n1,deps]of result)if(equal(n1,n))console.log(`ENTRY: ${n1} ${n1.hashCode()} <- ${deps}`);
//          console.log(`\x1b[1;31mFailed to delete\x1b[m ${toDelete} in ${n}: ${deps}`);
          //console.log(String([...result.keys()]));
        }
      }
    }
  }
}


  }

  // At this point, we should have only slots left in the keys and only
  // items (and Start?) left in the values.

//console.log(String(result));

  for (const [node, [...terms]] of result) {
    // need to simplify everything now
    // for any node n, if p and q are in n's requirements and if
    //  p contains a subset of terms of q, we can delete q.
    // if this happens, we should start over?
    for (let i = 0; i < terms.length; i++) {
      let reset = false;
      for (let j = 0; j < terms.length && !reset; j++) {
        if (i == j) continue;
        if (terms[i].includes(terms[j])) {
          terms.splice(j, 1);
          reset = true;
        }
      }
      if (reset) i = -1;
    }
    console.log(`Slot ${node.name}:
  ${terms.map(([[...t]]) => t.map(([i]) => String(i)).join(', ')).join('\n  ')}`);
//  ${terms.map(([[...t]]) => t.map(i => i.name).join(', ')).join('\n  ')}`);
//  ${terms.map(([...t]) => t.map(i => i.name).join(', ')).join('\n  ')}`);
  }

  // let progress = true;
  // while (progress) {
  //   progress = false;
  //   for (const key of result.keys()) {
  //     // if it's not an item, substitute it everywhere.
  //     // it's never an item...
  //     for (const k in result) {
  //       const r = result[k];
  //       // find all instances, substitute
  //       // NOTE: we have a quadratic expansion here
  //     }

  //   }
         

  // }


};



// class LocationGraph {
//   // For each location, a list of options, where each option is a list of reqs
//   // Reqs include all other node types other than locations.
//   constructor(g, start = g.locations()[0]) {
//     this.graph = g;
    

//     for (const l of g.locations()) {
      
//     }

//   }
// }

// class IntegratedGraph {
//   constructor(g) {
//     this.graph = g;
//     this.reqs = new Map(); // Node -> [[Item]]
//   }

//   requirements(n) {
//     // what to do about cycles? if 
//     if (this.reqs
       
//   }

// }


export class Option extends Node {
  constructor(graph, name, value) {
    super(graph);
    this.name = name;
    this.value = value;
  }
  toString() {
    return `Option ${this.name}`;
  }
}

export class Slot extends Node {
  constructor(graph, item, index, slots = []) {
    super(graph);
    this.item = item;
    this.index = index;
    this.slots = slots;
    this.type = item instanceof Magic ? 'magic' : null;
    this.origIndex = index;
    this.orig = item.name;
  }

  toString() {
    return `Slot ${this.orig}`;
  }
  get name() {
    return this.item.name;
  }
  get name2() {
    if (this.name == this.orig) return this.name;
    return `${this.name} (${this.orig})`;
  }

  set(item, index) {
    this.item = item;
    this.index = index;
  }

  write(rom) {
    if (!this.slots) return;
    for (const slot of this.slots) {
      // TODO - not clear where to write this.
      slot(rom.subarray(0x10), this);
    }
  }

  swap(other) {
    const item = this.item;
    const index = this.index;
    this.set(other.item, other.index);
    other.set(item, index);
  }

  key() {
    this.type = 'key';
    return this;
  }

  bonus() {
    this.type = 'bonus';
    return this;
  }

  direct(addr) {
    // slot is usually 'this' for the Slot object that owns this.
    this.slots.push((rom, slot) => {
      rom[addr] = slot.index;
console.log(`${this.name2}: ${addr.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    });
    return this;
  }

  npcSpawn(id, location = null, offset = 0) {
    this.slots.push((rom, slot) => {
      let a = addr(rom, 0x1c5e0, 0x14000, id);
//console.log(`looking for npc spawn ${id.toString(16)} loc ${(location||-1).toString(16)} => a=${a.toString(16)}`);
      // Find the location
      while (location != null && rom[a] != location) {
        a++;
        while (!(rom[a] & 0x80)) {
          a += 2;
          if (a > rom.length) throw new Error(`never found end: ${this.name2}`);
        }
        a += 2;
      }
      a += 2 * offset + 1;
      rom[a] &= ~1;
      rom[a] |= 2;
      rom[a + 1] = slot.index;
console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }

  dialog(id, location = null, offset = 0, result = null) {
    this.slots.push((rom, slot) => {
      let a = addr(rom, 0x1c95d, 0x14000, id);
console.log(`${this.name2}: ${id.toString(16)} dialog start ${a.toString(16)}`);
      // Skip the pre-location parts
      while (rom[a] & 0x80) {
        a += 4;
        if (a > rom.length) throw new Error(`never found end: ${this.name2}`);
      }
      // Now find the location
      let next = 0;
      while (rom[a] != 0xff) {
        if (location != null && rom[a] == location) next = rom[a + 1];
        a += 2;
      }
      a += next + 1; // skip the ff
console.log(`next=${next}`);
      // Jump to the location
      while (offset) {
        if (rom[a] & 0x40) {
          a += 5;
          while (!(rom[a] & 0x40)) {
            a += 2;
            if (a > rom.length) throw new Error(`never found end: ${this.name2}`);
          }
          a += 2;
        } else {
          a += 5;
        }
        --offset;
      }
      // Jump to the selected result if appropriate
      if (result != null) {
        a += 5;
        while (result) {
          a += 2;
          --result;
        }
      }
      // update condition
      rom[a] &= ~1;
      rom[a] |= 2;
      rom[a + 1] = slot.index;
console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }

  trigger(id, offset = 0, result = null) {
    this.slots.push((rom, slot) => {
      let a = addr(rom, 0x1e17a, 0x14000, id & 0x7f);

      if (result == null) {
        // Find the appropriate condition
        a += 2 * offset;
      } else {
        while (!(rom[a] & 0x80)) {
          a += 2;
          if (a > rom.length) throw new Error(`never found end: ${this.name2}`);
        }
        a += 4; // skip the message, too
        a += 2 * result;
      }
      // update condition
      rom[a] &= ~1;
      rom[a] |= 2;
      rom[a + 1] = slot.index;
console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }
}

export class Chest extends Slot {
  objectSlot(loc, spawnSlot) {
    this.slots.push((rom, slot) => {
      const base = addr(rom, 0x19201, 0x10000, loc);
      const a = base + 4 * (spawnSlot - 0x0b);
      rom[a] = slot.index;
console.log(`${this.name2}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    });
    return this;
  }

  invisible(addr) {
    return this.direct(addr);
  }
}

const addr =
    (rom, base, offset, index) =>
        (/*console.log(`pointer = ${(base + 2 * index).toString(16)}`),*/ rom[base + 2 * index] | rom[base + 2 * index + 1] << 8) + offset;

export class ItemGet extends Node {
  constructor(graph, id, name, index, item) {
    super(graph);
    this.id = id;
    this.name = name;
  }

  toString() {
    return `ItemGet ${this.name}`;
  }

  chest(index = this.id) {
    return new Chest(this.graph, this, index);
  }

  fromPerson(personId, offset = 0) {
    return this.direct(0x80f0 | (personId & ~3) << 6 | (personId & 3) << 2 | offset);
  }

  bossDrop(bossId, itemGetIndex = this.id) {
    return new Slot(this.graph, this, itemGetIndex, [(rom, slot) => {
      const a = addr(rom, 0x1f96b, 0x14000, bossId) + 4;
      rom[a] = slot.index;
console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  direct(a) {
    return new Slot(this.graph, this, this.id, [(rom, slot) => {
      rom[a] = slot.index;
console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  fixed() {
    return new Slot(this.graph, this, this.id, null);
  }
}

export class Item extends ItemGet {}

export class Magic extends ItemGet {}

export class Trigger extends Node {
  constructor(graph, name) {
    super(graph);
    this.name = name;
    this.slot = null;
  }
  toString() {
    return `Trigger ${this.name}`;
  }

  get(slot) {
    if (this.slot) throw new Error('already have a slot');
    this.slot = slot;
    return this;
  }
}

// // TODO - move these to just do direct byte manipulation maybe?
// //      - add PersonData, Dialog, NpcSpawn, etc...
// const fromNpc = (id, offset = 0) => (rom, index) => {
//   rom.prg[rom.npcs[id].base + offset] = index;
// };
// const directPrg = (address) => (rom, index) => {
//   rom.prg[address] = index;
// };
// const chest = (chest) => (rom, index) => {
//   rom.locations[location].objects[slot - 0xd][3] = index;
// };


export class Condition extends Node {
  constructor(graph, name) {
    super(graph);
    this.name = name;
    this.options = [];
  }
  toString() {
    return `Condition ${this.name}`;
  }

  option(...deps) {
    this.options.push(deps.map(x => x instanceof Slot ? x.item : x));
    return this;
  }
}

export class Boss extends Trigger {
  constructor(graph, index, name, ...deps) {
    super(graph, name);
    this.index = index;
    this.deps = deps.map(x => x instanceof Slot ? x.item : x);
  }
  toString() {
    return `Boss ${this.name}`;
  }
}

export class Area extends Node {
  constructor(graph, name) {
    super(graph);
    this.name = name;
  }
}

class Connection {
  constructor(from, to, bidi = false, deps = []) {
    this.from = from;
    this.to = to;
    this.bidi = bidi;
    this.deps = deps.map(x => x instanceof Slot ? x.item : x);
  }

  reverse() {
    return new Connection(this.to, this.from, this.bidi, this.deps);
  }

  toDot() {
    //const arr = this.bidi ? '--' : '->';
    const attrs = [];
    if (this.deps.length) {
      attrs.push(`label="${this.deps.map(d => d.name).join(', ')}"`);
    }
    if (this.bidi) {
      attrs.push(`dir=none`);
    }
    const attrsStr = attrs.length ? ` [${attrs.join(', ')}]` : '';
    return `  ${this.from.uid} -> ${this.to.uid}${attrsStr};`;
  }
}

export class Location extends Node {
  constructor(graph, id, area, name) {
    super(graph);
    this.id = id;
    this.area = area;
    this.name = name;
    this.connections = [];
    this.triggers = [];
    this.chests = [];
    this.mimics = []; // fold into chests
    this.bossNode = null;
    this.type = null;
  }

  toString() {
    return `Location ${this.id.toString(16).padStart(2,0)} ${this.name}`;
  }
  addConnection(c) {
    c.from.connections.push(c);
    c.to.connections.push(c);
    return this;
  }

  from(location, ...deps) {
    return this.addConnection(new Connection(location, this, false, deps));
  }

  to(location, ...deps) {
    return this.addConnection(new Connection(this, location, false, deps));
  }

  connect(location, ...deps) {
    return this.addConnection(new Connection(location, this, true, deps));
  }

  connectTo(location, ...deps) {
    return this.addConnection(new Connection(this, location, true, deps));
  }

  chest(item, spawn, chest = undefined) {
    if (item instanceof Slot && !(item instanceof Chest) && chest != null) {
      // Consider making this an error?
      item = item.item;
    }
    if (item instanceof ItemGet) {
      item = item.chest(chest);
    }
    this.chests.push(item.objectSlot(this.id, spawn));
    return this;
  }

  trigger(trigger, ...deps) {
    this.triggers.push({trigger, deps: deps.map(x => x instanceof Slot ? x.item : x)});
    return this;
  }

  boss(boss) {
    this.bossNode = boss;
    return this;
  }

  // Location types - basic idea would be to leave misc alone, but otherwise
  // shuffle among areas of the same type.  We could mix caves and fortresses
  // if relevant, as well as sea and overworld.  We should mark each connection
  // with a value indicating the threshold for shuffling it - 1 = always shuffle,
  // 2 = medium, 3 = crazy (e.g. shuffle all exits).
  overworld() {
    this.type = 'overworld';
    return this;
  }

  town() {
    this.type = 'town';
    return this;
  }

  cave() {
    this.type = 'cave';
    return this;
  }

  sea() {
    this.type = 'sea';
    return this;
  }

  fortress() {
    this.type = 'fortress';
    return this;
  }

  house() {
    this.type = 'house';
    return this;
  }

  shop() {
    this.type = 'house';
    return this;
  }

  misc() {
    this.type = 'misc';
    return this;
  }

  edges() {
    const out = [...this.connections];
    const prefix = n => ({uid: `${this.uid}_${n.uid}`});
    for (const chest of this.chests) {
      out.push(new Connection(this, prefix(chest), false, []));
    }
    for (const {trigger, deps} of this.triggers) {
      out.push(new Connection(this, prefix(trigger), false, deps));
      if (trigger.slot) {
        out.push(new Connection(prefix(trigger), prefix(trigger.slot), false, []));
      }
    }
    if (this.bossNode && this.bossNode.slot) {
      out.push(new Connection(this, prefix(this.bossNode.slot), false, this.bossNode.deps));
    }
    return out;
  }

  // Specifies several edges.
  toDot() {
    const fmt = (n, c) => `    ${this.uid}_${n.uid} [label="${n.name}", color="${c}", shape=oval];`;
    const color = this.bossNode ? ' color="#ffbbbb"' : '';
    const nodes = [`    ${this.uid} [label="${this.fullName()}"${color}];`];
    for (const chest of this.chests) {
      nodes.push(fmt(chest, '#ddffdd'));
    }
    for (const {trigger} of this.triggers) {
      nodes.push(fmt(trigger, '#ddddff'));
      if (trigger.slot) {
        if (!trigger.slot) {
          throw new Error(`missing item: ${trigger.slot.name}`);
        }
        nodes.push(fmt(trigger.slot, '#ddffdd'));
      }
    }
    if (this.bossNode && this.bossNode.slot) {
      if (!this.bossNode.slot) {
        throw new Error(`missing item: ${this.bossNode.slot.name}`);
      }
      nodes.push(fmt(this.bossNode.slot, '#ddffdd'));
    }
    return nodes.join('\n');
  }

  fullName() {
    //const lines = [`${this.area.name}: ${this.name}`];
    const lines = [this.name];
    if (this.bossNode) {
      lines.push(this.bossNode.name);
    }
    return lines.join('\\n');
  }
}
