// TODO - rename to nodes.js ?

import {Node, Edge, Graph, SparseDependencyGraph} from './graph.js';

export class TrackerNode extends Node {
  constructor(graph, name) {
    super(graph, name);
  }

  get nodeType() {
    return 'Tracker';
  }
}

export class Option extends Node {
  constructor(graph, name, value) {
    super(graph, name);
    this.value = value;
  }

  get nodeType() {
    return 'Option';
  }

  /** @override */
  edges() {
    return this.value ? [Edge.of(this)] : [];
  }
}

export class Slot extends Node {
  constructor(graph, name, item, index, slots = []) {
    super(graph, name);
    // Information about the slot itself
    this.slotName = name;
    this.slotIndex = index;
    this.slotType = item instanceof Magic ? 'magic' : null;
    this.vanillaItemName = item.name;
    this.slots = slots;
    // Information about the current item (if any)
    this.item = item;
    this.itemIndex = index;
  }

  get nodeType() {
    return 'Slot';
  }

  toString() {
    return `${super.toString()} [${this.vanillaItemName} $${
            this.slotIndex.toString(16).padStart(2, 0)}]`;
  }

  edges() {
    return this.item != null && this.itemIndex != null ?
        [Edge.of(this.item, this)] : [];
  }

  get name2() {
    if (this.item == this.vanilla) return this.name;
    return `${this.item.name} [${this.vanillaItemName}]`;
  }

  set(item, index) {
    // NOTE: we can't just use item.index because repeated
    // items need separate indices but we don't make extra
    // Item nodes for them.
    this.item = item;
    this.itemIndex = index;
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
    const index = this.itemIndex;
    this.set(other.item, other.itemIndex);
    other.set(item, index);
  }

  key() {
    this.slotType = 'key';
    return this;
  }

  bonus() {
    this.slotType = 'bonus';
    return this;
  }

  direct(addr) {
    // slot is usually 'this' for the Slot object that owns this.
    this.slots.push((rom, slot) => {
      rom[addr] = slot.itemIndex;
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
          checkBounds(a, rom, this.name2, location);
        }
        a += 2;
        checkBounds(a, rom, this.name2, location);
      }
      a += 2 * offset + 1;
      rom[a] &= ~1;
      rom[a] |= 2;
      rom[a + 1] = slot.itemIndex;
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
        checkBounds(a, rom, this.name2);
      }
      // Now find the location
      let next = 0;
      while (rom[a] != 0xff) {
        if (location != null && rom[a] == location) next = rom[a + 1];
        a += 2;
        checkBounds(a, rom, location);
      }
      a += next + 1; // skip the ff
//console.log(`next=${next}`);
      // Jump to the location
      while (offset) {
        if (rom[a] & 0x40) {
          a += 5;
          while (!(rom[a] & 0x40)) {
            a += 2;
            checkBounds(a, rom, this.name2);
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
      rom[a + 1] = slot.itemIndex;
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
          checkBounds(a, rom, this.name2);
        }
        a += 4; // skip the message, too
        a += 2 * result;
      }
      // update condition
      rom[a] &= ~1;
      rom[a] |= 2;
      rom[a + 1] = slot.itemIndex;
//console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }
}

export class BossDrop extends Slot {
  get nodeType() {
    return 'BossDrop';
  }
}

export class Chest extends Slot {
  constructor(graph, name, item, index) {
    super(graph, name, item, index);
    this.spawnSlot = null;
    this.isInvisible = false;
  }

  get nodeType() {
    return 'Chest';
  }

  objectSlot(loc, spawnSlot) {
    this.spawnSlot = spawnSlot;
    this.slots.push((rom, slot) => {
      const base = addr(rom, 0x19201, 0x10000, loc);
      const a = base + 4 * (spawnSlot - 0x0b);
      if (slot.itemIndex === 0x70) {
        // mimics respawn on a timer
        rom[a - 1] |= 0x80;
      } else {
        // non-mimics should spawn once on load
        rom[a - 1] &= 0x7f;
      }
      rom[a] = slot.itemIndex;
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
    super(graph, name);
    this.id = id;
  }

  get nodeType() {
    return 'ItemGet';
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
      rom[a] = slot.itemIndex;
//console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  direct(name, a) {
    return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
      rom[a] = slot.itemIndex;
//console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  fixed() {
    return new Slot(this.graph, null, this, this.id);
  }
}

export class Item extends ItemGet {
  get nodeType() {
    return 'Item';
  }
}

export class Magic extends ItemGet {
  get nodeType() {
    return 'Magic';
  }
}

export class Trigger extends Node {
  constructor(graph, name) {
    super(graph, name);
    this.slot = null;
    /** !Array<!Edge> */
    this.reqs = [];
  }

  get nodeType() {
    return 'Trigger';
  }

  edges() {
    const out = [...this.reqs];
    if (this.slot) out.push(Edge.of(this.slot, this));
    return out;
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
    super(graph, name);
    this.options = [];
  }

  get nodeType() {
    return 'Condition';
  }

  edges() {
    return this.options.map((opt) => Edge.of(this, ...opt));
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

  get nodeType() {
    return 'Boss';
  }
}

export class Area extends Node {
  constructor(graph, name) {
    super(graph, name);
    this.name = name;
  }

  get nodeType() {
    return 'Area';
  }
}

export class Connection {
  constructor(from, to, bidi = false, deps = []) {
    this.from = from;
    this.to = to;
    this.bidi = bidi;
    this.deps = deps.map(x => x instanceof Slot ? x.item : x);
  }

  reverse() {
    return new Connection(this.to, this.from, this.bidi, this.deps);
  }
}

export class Location extends Node {
  constructor(graph, id, area, name) {
    super(graph, area.name + ': ' + name);
    this.simpleName = name;
    this.id = id;
    this.area = area;
    this.connections = [];
    this.chests = [];
    this.bossNode = null;
    this.type = null;
    this.isStart = false;
  }

  get nodeType() {
    return 'Location';
  }

  toString() {
    return `Location ${this.id.toString(16).padStart(2,0)} ${this.name}`;
  }

  edges() {
    const out = [];
    for (const c of this.connections) {
      out.push(Edge.of(c.to, c.from, ...c.deps, ...(c.from.bossNode ? [c.from.bossNode] : [])));
      if (c.bidi) out.push(Edge.of(c.from, c.to, ...c.deps, ...(c.to.bossNode ? [c.to.bossNode] : [])));
    }
    for (const c of this.chests) {
      out.push(Edge.of(c, this));
    }
    if (this.isStart) {
      out.push(Edge.of(this));
    }
    return out;
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
    if (slot.itemIndex == 0x70) slot.slotType = 'trap';
    if (!slot.slotName || slot.slotName.endsWith(' chest')) {
      slot.slotName = item.name + ' chest in ' + this.area.name;
    }
    return this;
  }

  trigger(trigger, ...deps) {
    deps = deps.map(n => n instanceof Slot ? n.item : n);
    trigger.reqs.push(Edge.of(trigger, this, ...deps));
    return this;
  }

  boss(boss) {
    this.bossNode = boss;
    boss.reqs.push(Edge.of(boss, this, ...boss.deps));
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

  start() {
    this.isStart = true;
    return this;
  }

  fullName() {
    const lines = [this.simpleName];
    if (this.bossNode) {
      lines.push(this.bossNode.name);
    }
    return lines.join('\\n');
  }
}

const checkBounds = (a, rom, ...data) => {
  if (a > rom.length) {
    throw new Error(
        'never found: ' + data.map(x => typeof x == 'number' ? x.toString(16) : x).join(' '));
  }
}


export class WorldGraph extends Graph {

  /** @return {!LocationList} */
  integrate(opts = {}) {
// for(let i=0;i<this.nodes.length;i++)
// console.log(`${i} ${this.nodes[i]}`);

    const {
      removeConditions = true,
      removeTriggers = true,
      removeOptions = true,
      removeTrackers = true,
    } = opts;
    const depgraph = new SparseDependencyGraph(this.nodes.length);
    const /** !Array<!Array<!Connection>> */ connectionsByLocation = [];
    const /** !Set<!Connection> */ connections = new Set();
    const /** !Map<string, !Edge> */ queue = new Map();

    const options = [];
    const trackers = [];
    const conditions = [];
    const triggers = [];
    const items = [];
    const slots = new Set();

    // First index all the nodes and connections.
    for (const n of this.nodes) {
      if (n instanceof Location) {
        if (n.isStart) {
          const [route] = depgraph.addRoute([n.uid]);
          queue.set(route.label, route);
        }
        connectionsByLocation[n.uid] = [];
        for (const c of n.connections) {
          if (connections.has(c)) continue;
          // add connection and maybe everse to the set
          connections.add(c);
          if (c.bidi) connections.add(c.reverse());
        }
        for (const c of n.chests) {
          depgraph.addRoute([c.uid, n.uid]);
        }
        continue;
      }

      if (n instanceof Option) options.push(n);
      else if (n instanceof TrackerNode) trackers.push(n);
      else if (n instanceof Condition) conditions.push(n);
      else if (n instanceof Trigger) triggers.push(n);
      else if (n instanceof ItemGet) items.push(n);
      else if (n instanceof Slot) slots.add(n);
      else if (n instanceof Area) {}
      else throw new Error(`Unknown node type: ${n.nodeType}`);
    }

    for (const c of connections) {
      connectionsByLocation[c.from.uid].push(c);
    }

    const integrate = (nodes) => {
      for (const n of nodes) {
        for (const edge of n.edges()) {
          depgraph.addRoute(edge);
        }
        depgraph.finalize(n.uid);
      }
    };

    // Do options and triggers first
    if (removeOptions) integrate(options);
    if (removeTrackers) integrate(trackers);
    if (removeTriggers) integrate(triggers);

    // Next do locations, leaving conditions intact
    const iter = queue.values();
    let next;
    while (!(next = iter.next()).done) {
      const route = next.value; // (SparseRoute)
      const target = route.target;
//console.log(`loc: ${target} ${this.nodes[target]}: ${[...route.deps]}`);
      for (const c of connectionsByLocation[target]) {
//console.log(`c: ${c}`); // TODO - no connections???
        const newRoute = [c.to.uid, ...route.deps];
        for (let i = c.deps.length - 1; i >= 0; i--) {
          newRoute.push(c.deps[i].uid);
        }
        if (c.from.bossNode) newRoute.push(c.from.bossNode.uid);
//console.log(`newRoute: ${newRoute}`);
        for (const r of depgraph.addRoute(newRoute)) {
          if (!queue.has(r.label)) queue.set(r.label, r);
        }
      }
    }

    if (removeConditions) integrate(conditions);
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i] instanceof ItemGet) continue;
      depgraph.finalize(i);
    }

    // Now we have a dependency graph, where all slots should
    // have only item dependencies (unless we left some in).

    // // It's time to renumber everything.
    // const mapped = new Map();
    // for (const slot of slots) {
    //   for (const alternative of depgraph.nodes[slot.uid].values()) {
    //     for (const dep of alternative) {
    //       if (!mapped.has(dep)) mapped.set(dep, mapped.size);
    //     }
    //   }
    // }
    // for (const slot of slots) {
    //   if (!mapped.has(slot.uid)) mapped.set(slot.uid, mapped.size);
    // }
    // // `mapped` now has a full dense mapping for slots and items
    // const out = new LocationList();
    // for (const [from, to] of mapped) {
    //   const origNode = this.nodes[from];
    //   const newNode = Object.create(origNode, {graph: out, uid: to});
    //   out.nodes[to] = newNode;
    // }

// for (let i = 0; i < depgraph.nodes.length; i++) {
//   console.log(`${i} ${this.nodes[i]}: ${[...depgraph.nodes[i].values()].map(s => '(' + [...s].join('&') + ')').join(' | ')}`);

// }

    const out = new LocationList(this);
    for (const slot of slots) {
//console.log(`slot ${slot.uid}: ${[...depgraph.nodes[slot.uid]]}`);
      for (const alt of depgraph.nodes[slot.uid].values()) {
        out.addRoute([slot.uid, ...alt]);
      }
    }
    return out;
  }

}

export class LocationList {

  // renumbered nodes -> mapping between them?
  //  - full integrated requirements
  //  - how to optimize for assumed fill??
  //  - will want a separate traverse method

  // use 2x uint32 for a compressed bitset as Route
  //  - easy to check, will need to do a lot of checks


  // could reuse node objects if instead of a single id
  // they had a weakmap from graphs to ids in the graph,
  // then the id is assigned when they're added to the
  // graph, tho that would muck up a lot of stuff...

  constructor(/** !WorldGraph */ graph) {
    // Bimap between nodes and indices.

    /** @const */
    this.worldGraph = graph;

    /** @const {!Array<number>} */
    this.uidToLocation = [];
    /** @const {!Array<number>} */
    this.locationToUid = [];

    /** @const {!Array<number>} */
    this.uidToItem = [];
    /** @const {!Array<number>} */
    this.itemToUid = [];

    /** @const {!Array<!Array<number>>} */
    this.routes = [];

    /** @const {!Array<!Array<!Edge>>} */
    this.unlocks = [];

    // TODO - custom width?  for now we hardcode width=2
  }

  // NOTE: 'route' is in terms of worldgraph uids
  addRoute(/** !Edge */ route) {
    // Make sure all nodes are mapped.
    const deps = [0, 0];
    let target;
    for (let i = route.length - 1; i >= 0; i--) {
      const fwd = i ? this.uidToItem : this.uidToLocation;
      const bwd = i ? this.itemToUid : this.locationToUid;
      const n = route[i];
      let index = fwd[n];
      if (index == null) {
        index = bwd.length;
//console.log(`${i}: ${n} => ${index}`);
        bwd.push(n);
        fwd[n] = index;
      }
      if (i) {
        deps[index >> 5] |= (1 << (index & 31));
      } else {
        target = index;
      }
    }
    // Now add route
    (this.routes[target] || (this.routes[target] = [])).push(...deps);
    const edge = [target, ...deps];
    for (let i = route.length - 1; i >= 1; i--) {
      const from = this.itemToUid[route[i]];
      (this.unlocks[from] || (this.unlocks[from] = [])).push(edge);
    }
  }

  // NOTE: does not take this.slots into account!
  canReach(want, has) {
    const target = this.uidToLocation(want.uid);
    const alternatives = this.routes[target];
   OUTER:
    for (let i = 0; i < alternatives.length; i += 2) {
      for (let j = 0; j < 2; j++) {
        if (alternatives[i + j] & ~has[j]) continue OUTER;
      }
      return true;
    }
    return false;
  }

  /**
   * Returns a bitmask of reachable locations.
   * @param {!Array<number>} has Bitmask of gotten items
   * @param {!Array<number>} slots Location-to-item
   * @return {!Array<number>} Reachable locations
   */
  traverse(has, slots) {
    has = [...has]; // make a clone
    ////// .... ???

  }

  toString() {
    const lines = [];
    for (let i = 0; i < this.routes.length; i++) {
      const loc = this.worldGraph.nodes[this.locationToUid[i]];
      const route = this.routes[i];
      const terms = [];
      for (let j = 0; j < route.length; j += 2) {
        const term = [];
        for (let k = 0; k < 2; k++) {
          let x = route[j + k];
          let y = 32;
          while (x) {
            const z = Math.clz32(x) + 1;
            y -= z;
            x <<= z;
            if (z == 32) x = 0;
            term.push(this.worldGraph.nodes[this.itemToUid[(k << 5) | (y + 1)]]);
          }
        }
        terms.push('(' + term.join(' & ') + ')');
      }
      lines.push(`${loc}: ${terms.join(' | ')}`);
    }
    return lines.join('\n');
  }

  // TODO - we need a clean way to translate indices...?
  //  - instance methods for dealing with 'has' arrays
  //    and 'slots' arrays - i.e.
  //        addItem(has, itemNode)
  //        fillSlot(slots, slotNode, itemNode)
  //        ... read location bitmask?
  // Location bitmasks will be wider than items?
  //  - 128 bits OK...?
  //  - once all *key* items are assigned, rest can be
  //    filled in totally randomly.


}
