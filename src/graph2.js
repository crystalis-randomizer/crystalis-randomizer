import {Requirements, Items} from './sat.js';
import {PMap} from './pmap.js';

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

export const integrate = (graph) => {
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
    // We found a reference, so do the substitution
    let out = empty;
    for (const t of keepRequirements.keys()) {
      if (t.has(toDelete)) {
        for (const r of deletedRequirements.keys()) {
          let s = t.minus(toDelete);
          for (const d of r.keys()) { // TODO - plusAll?
            s = s.plus(d);
          }
          // remove any option that's left with a cycle
          if (!s.has(toKeep)) out = out.plus(s);
        }
      } else {
        out = out.plus(t);
      }

    let terms = [...out.keys()];
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
    out = PMap.setFrom(terms);

    }
    // return a PSet<PSet<Node>>
    result = result.plus(toKeep, out);
  };

  // Start by populating with only shallow edges.
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
  for (const toDelete of result.keys()) {
    //if (toDelete.name === 'Start') continue; // leave "Start" in the RHS.
    const deleteRequirements = result.get(toDelete);
// console.log(`Deleting: ${toDelete.name} with reqs ${[...deleteRequirements].map(o=>[...o].map(r=>r.name).join(',')).join('|')}`);
//console.dir(deleteRequirements);
// console.log(`Deleting: ${toDelete.name}: ${deleteRequirements}`);
    // Leave all the slots
    if (!(toDelete instanceof Slot)) result = result.minus(toDelete);
    for (const [toKeep, keepRequirements] of result) {
      subs(toDelete, deleteRequirements, toKeep, keepRequirements);
    }
  }

  // At this point, we should have only slots left in the keys and only
  // items (and Start?) left in the values.

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
  ${terms.map(([...t]) => t.map(i => i.name).join(', ')).join('\n  ')}`);
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
