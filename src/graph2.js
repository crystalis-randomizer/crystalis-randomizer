import {Requirements, Items} from './sat.js';

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

export class Node {
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

  node(uid) {
    return this.nodes[uid.substring(1)];
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
      'node [shape=record, style=filled, color=white];');
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
        '  }');
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
    };
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
        return [n, [
          ...str(n),
          ' [',
          deps.map(d => str(d).join('').replace(/\s+\(.*\)/, '')).join(', '),
          ']',
        ].join('')];
      }),
    };
  }

  integrate(opts = {}) {
    return integrateLocations(this, opts);
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


// Consider cleaning up and rewriting a bunch of this in typescript

class Depgraph {
  constructor() {
    /** @const {!Map<string, !Map<string, !Set<string>>>} */
    this.graph = new Map();
    /** @const {!Set<string>} */
    this.removed = new Set();
  }

  // Before adding a route, any target is unreachable
  // To make a target always reachable, add an empty route
  addRoute(/** string */ target, /** !Iterable<string> */ deps) /** !Array<!Depgraph.Route> */ {
    if(this.removed.has(target)) {
      throw new Error(`Attempted to add a route for finalized node ${target}`);
    }
    if (!this.graph.has(target)) this.graph.set(target, new Map());
    // NOTE: if any deps are already integrated out, replace them right away
    let s = new Set(deps);
    while (true) {
      let changed = false;
      for (const d of s) {
        if (d === target) return [];
        if (this.removed.has(d)) {
          // need to replace before admitting.  may need to be recursive.
          const /** !Map<string, !Set<string>> */ replacement = this.graph.get(d)||new Map();
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
    if (current.has(label)) return [];
    for (const [l, d] of current) {
      if (containsAll(s, d)) return [];
      if (containsAll(d, s)) current.delete(l);
    }
    current.set(label, s);
    return [new Depgraph.Route(target, s, `${target}:${label}`)];
  }

  integrateOut(/** string */ node) {
    // pull the key, remove it from *all* other nodes
    const alternatives = this.graph.get(node) || new Map();
    this.removed.add(node);
    for (const [target, /** !Map<string, !Set<string>> */ routes] of this.graph) {
      for (const [label, route] of routes) {
        // substitute... (reusing the code in addRoute)
        if (route.has(node)) {
          const removed = this.removed.has(target);
          if (removed) this.removed.delete(target);
          routes.delete(label);
          this.addRoute(target, route);
          if(removed) this.removed.add(target);
        }
      }
    }
  }
}

Depgraph.Route = class {
  constructor(/** string */ target, /** !Set<string> */ deps, /** string */ label) {
    this.target = target;
    this.deps = deps;
    this.label = label;
  }  
};

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
  constructor(graph, name, item, index, slots = []) {
    super(graph);
    this.slotName = name;
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
//console.log(`${this.name2}: ${addr.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
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
//console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }

  dialog(id, location = null, offset = 0, result = null) {
    this.slots.push((rom, slot) => {
      let a = addr(rom, 0x1c95d, 0x14000, id);
//console.log(`${this.name2}: ${id.toString(16)} dialog start ${a.toString(16)}`);
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
//console.log(`next=${next}`);
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
//console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
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
//console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }
}

export class BossDrop extends Slot {}

export class Chest extends Slot {
  constructor(...args) {
    super(...args);
    this.spawnSlot = null;
    this.isInvisible = false;
  }

  objectSlot(loc, spawnSlot) {
    this.spawnSlot = spawnSlot;
    this.slots.push((rom, slot) => {
      const base = addr(rom, 0x19201, 0x10000, loc);
      const a = base + 4 * (spawnSlot - 0x0b);
      if (slot.index === 0x70) {
        // mimics respawn on a timer
        rom[a - 1] |= 0x80;
      } else {
        // non-mimics should spawn once on load
        rom[a - 1] &= 0x7f;
      }
      rom[a] = slot.index;
//console.log(`${this.name2}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    });
    return this;
  }

  invisible(addr) {
    this.isInvisible = true;
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

  chest(name = this.name + ' chest', index = this.id) {
    return new Chest(this.graph, name, this, index);
  }

  fromPerson(name, personId, offset = 0) {
    return this.direct(name, 0x80f0 | (personId & ~3) << 6 | (personId & 3) << 2 | offset);
  }

  bossDrop(name, bossId, itemGetIndex = this.id) {
    return new BossDrop(this.graph, name, this, itemGetIndex, [(rom, slot) => {
      const a = addr(rom, 0x1f96b, 0x14000, bossId) + 4;
      rom[a] = slot.index;
//console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  direct(name, a) {
    return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
      rom[a] = slot.index;
//console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  fixed() {
    return new Slot(this.graph, null, this, this.id, null);
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
      item = item.chest(undefined, chest);
    }
    const slot = item.objectSlot(this.id, spawn);
    this.chests.push(slot);
    if (slot.index == 0x70) slot.type = 'trap';
    if (!slot.slotName || slot.slotName.endsWith(' chest')) {
      slot.slotName = item.name + ' chest in ' + this.area.name;
    }
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
