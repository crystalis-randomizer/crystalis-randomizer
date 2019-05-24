// TODO - rename to nodes.js ?

import {Node, Edge, EdgeT, Graph, SparseDependencyGraph} from './graph.js';
import {Bits} from './bits.js';

// TODO - move the options into these nodes...?
//  - then the Dt flag will determine whether to connect or not?
//  --- or ditch the distinct node types?
//      they do behave slightly differently, tho...
// We basically have a tri-state:
//   1. in tracker or troll mode, traverse but don't integrate out - keep track
//   2. in normal mode with glitch/hard flag on, traverse and integrate out
//   3. in normal mode with glitch/hard flag off, don't traverse
// The edges() method needs to behave differently depending on this.
// Given that, we probably need to accept 'flags'.
export class TrackerNode extends Node {
  constructor(graph, type, name /*, option, missing, weight */) {
    super(graph, name); // + ': ' + option);
    this.type = type;
    // this.option = option;
    // this.missing = missing;
    // this.weight = weight;
  }

  get nodeType() {
    return 'Tracker';
  }

  // NOTE: Tracker nodes are only ever created when a particular route
  // is off-logic.  So integrating them should make them disappear
  // entirely as impossible.  The tracker does *not* 'integrate them,
  // but retains them for tracking purposes.  Evil mode will want to
  // retain them as well, but we'll have a bunch more nodes in that
  // case to track missing items.
  edges({tracker = false} = {}) {
    // return []; // this.option.value ? [Edge.of(this)] : [];
    // return tracker ? [] : [Edge.of(this)];
    return [];
  }
}

TrackerNode.OFF_ROUTE = 1;
TrackerNode.GLITCH = 2;
TrackerNode.HARD = 3;

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
    this.slotType = item instanceof Magic ? 'magic' : 'consumable';
    this.vanillaItemName = item.name;
    this.slots = slots;
    // Information about the current item (if any)
    this.item = item;
    this.itemIndex = index;
    this.requiresUnique = false;
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

  isMimic() {
    return this.itemIndex >= 0x70;
  }

  requireUnique() {
    this.requiresUnique = true;
    return this;
  }

  canHoldMimic() {
    // NOTE: boss drops cannot hold mimics because they cause boss respawn.
    return this instanceof Chest && !this.isInvisible;
  }

  needsChest() {
    const i = this.itemIndex;
    // NOTE: if alarm flute goes in 3rd row, 0x31 should go away.
    return i >= 0x0d && i <= 0x24 ||
        i === 0x26 ||
        //i === 0x28 ||
        //i === 0x31 ||
        i > 0x48;
  }

  isChest() {
    // Only chests can hold consumables (unless we override with a flag).
    // Rage is not a chest.
    return (this instanceof Chest || this instanceof BossDrop) &&
        this.origIndex !== 0x09;
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

  /** @override */
  write(rom) {
    if (!this.slots) return;
    for (const slot of this.slots) {
      // TODO - not clear where to write this.
      slot(rom, this);
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
      write(rom, addr, slot.itemIndex);
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
      write(rom, a + 1, slot.itemIndex);
//console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
    });
    return this;
  }

  dialog(id, location = null, offset = 0, result = null) {
    this.slots.push((rom, slot) => {
      let a = addr(rom, 0x1c95d, 0x14000, id);
//console.log(`${this.name2}: ${id.toString(16)} dialog start ${a.toString(16)}`);
      // Skip the pre-location parts
      while (!(rom[a] & 0x80)) {
        a += 4;
        checkBounds(a, rom, this.name2);
      }
      a += 4;
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
//console.log(`${this.name2}: ${a.toString(16)} <- ${rom[a].toString(16).padStart(2,0)} ${rom[a+1].toString(16).padStart(2,0)}`);
      write(rom, a + 1, slot.itemIndex);
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
      write(rom, a + 1, slot.itemIndex);
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
      // mimics are initial spawns now, too
      rom[a - 1] &= 0x7f;
      write(rom, a, Math.min(0x70, slot.itemIndex));
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
    this.shufflePriority = 1;
    this.inventoryRow = 'unique';
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
      write(rom, a, slot.itemIndex);
//console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  direct(name, a) {
    return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
      write(rom, a, slot.itemIndex);
//console.log(`${this.name == slot.name ? this.name : `${slot.name} (${this.name})`}: ${a.toString(16)} <- ${slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  fixed() {
    return new Slot(this.graph, null, this, this.id);
  }

  weight(w) {
    this.shufflePriority = w;
    return this;
  }

  consumable() {
    this.inventoryRow = 'consumable';
    return this;
  }

  armor() {
    this.inventoryRow = 'armor';
    return this;
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
    /** !Array<!EdgeT> */
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
    /** @type {!Array<!Array<!Node>>} */
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
    this.isEnd = false;
    this.sells = [];
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
    if (slot.itemIndex >= 0x70) slot.slotType = 'trap';
    if (!slot.slotName || slot.slotName.endsWith(' chest')) {
      slot.slotName = item.name + ' in ' + this.area.name;
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

  shop(...items) {
    this.type = 'house';
    this.sells = items.map(x => x instanceof Slot ? x.item : x);
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

  end() {
    this.isEnd = true;
    return this;
  }

  fullName() {
    const lines = [this.simpleName];
    if (this.bossNode) {
      lines.push(this.bossNode.name);
    }
    return lines.join('\\n');
  }

  write(rom) {
    if (!this.sells.length) return;
    const isArmor = this.sells[0].inventoryRow == 'armor';
    // look up shop index in table
    const LOCS = 0x21f54;
    const INDS = 0x21f75;
    let index = 0;
    for (let i = LOCS; i < INDS; i++) {
      if (rom[i] == this.id) {
        index = rom[i + INDS - LOCS];
        break;
      }
    }
    const addr = (isArmor ? 0x21da4 : 0x21e28) + (index << 2);
    for (let i = 0; i < 4; i++) {
      rom[addr + i] = this.sells[i] ? this.sells[i].id : 0xff;
      if (!rom[addr + i]) console.error(`uh oh: ${this.sells[i].id} => ${this.sells[i]}`);
    }
  }
}

const checkBounds = (a, rom, ...data) => {
  if (a > rom.length) {
    throw new Error(
        'never found: ' + data.map(x => typeof x == 'number' ? x.toString(16) : x).join(' '));
  }
}


export class WorldGraph extends Graph {

  write(rom) {
    rom = rom.subarray(0x10);
    for (const n of this.nodes) {
      n.write(rom);
    }
  }

  shuffleShops(random) {
    // for now we just dump everything into a pool and shuffle them up.
    const armor = {shops: [], items: []};
    const tools = {shops: [], items: []};
    for (const n of this.nodes) {
      if (!n.sells || !n.sells.length) continue;
      const s = n.sells[0].inventoryRow == 'armor' ? armor : tools
      s.shops.push(n);
      for (let i = 0; i < 4; i++) {
        s.items.push(n.sells[i] || null);
      }
      n.sells = [];
    }
    random.shuffle(armor.items);
    random.shuffle(tools.items);

    for (const {shops, items} of [armor, tools]) {
      let s = 0;
      while (items.length && s < 100000) {
        const item = items.pop();
        let shop = shops[s++ % shops.length];
        if (!item) continue;
        if (shop.sells.indexOf(item) >= 0 || shop.sells.length >= 4) {
          items.push(item);
          continue;
        }
        shop.sells.push(item);
      }
    }
    // sort items
    for (const {shops} of [armor, tools]) {
      for (const shop of shops) {
        shop.sells.sort((a, b) => a.id - b.id);
      }
    }
  }

  /**
   * @param {!Object} opts
   * @return {!LocationList}
   */
  integrate(opts = {}) {
// for(let i=0;i<this.nodes.length;i++)
// console.log(`${i} ${this.nodes[i]}`);

    const {
      tracker = false,
    } = opts;

    const removeConditions = true;
    const removeTriggers = true;
    const removeOptions = true;
    const removeTrackers = !tracker;

    const depgraph = new SparseDependencyGraph(this.nodes.length);
    const /** !Array<!Array<!Connection>> */ connectionsByFrom = [];
    const /** !Array<!Array<!Connection>> */ connectionsByTo = [];
    const /** !Set<!Connection> */ connections = new Set();
    const /** !Map<string, !EdgeT> */ queue = new Map();

    const options = [];
    const trackers = [];
    const conditions = [];
    const triggers = [];
    const items = [];
    const slots = new Set();


    // TODO - how to handle tracker nodes?
    //   - if we leave them in, then we should ensure
    //     the HAS field inits to include them usually?
    // For filling, only maintain the tracker node if the option
    // is present; then whenever a tracker item disappears,
    // remove the tracker alternative as well and see what locations
    // disappear - those are the best candidates for maximal difficulty.

    // Could also add a TrackerNode type for LEAP_OF_FAITH or something?
    //  - option is always true, so always routed and ignored for tracker,
    //    but we could keep track of e.g. most people won't enter the
    //    temple without BoT, or various caves without certain items;
    //    by simply adding LEAP_OF_FAITH deps to these, we'll increase
    //    the chance that items end up in trollish places?


    // First index all the nodes and connections.
    for (const n of this.nodes) {
      if (n instanceof Location) {
        if (n.isStart) {
          const [route] = depgraph.addRoute([n.uid]);
          queue.set(route.label, route);
        }
        connectionsByFrom[n.uid] = [];
        connectionsByTo[n.uid] = [];
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

      //// Use Crystalis as a proxy for winning
      // if (n instanceof Slot && n.slotName == null) {
      //   continue;
      // }
      if (n instanceof ItemGet && n.name === 'Medical Herb') {
        depgraph.addRoute([n.uid]);
        depgraph.finalize(n.uid);
      }
      // END TEMPORARY HACK

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
      connectionsByFrom[c.from.uid].push(c);
      connectionsByTo[c.to.uid].push(c);
    }

    const integrate = (nodes) => {
      for (const n of nodes) {
        for (const edge of n.edges({tracker})) {
          depgraph.addRoute(edge);
        }
        depgraph.finalize(n.uid);
      }
    };

    // Do options and triggers first
    if (removeOptions) integrate(options);
    if (removeTrackers) integrate(trackers);

//     if (tracker) {
//       const trackerMap = new Map();
//       // retain a single off-route tracker node for each type.
//       for (const t of trackers) {
// console.error(`Looking at tracker ${t} (${t.option}): value=${t.option.value}`);
//         if (t.option.value) {
// console.error('  INTEGRATION');
//           depgraph.addRoute([t.uid]);
//           depgraph.finalize(t.uid);
//         } else if (trackerMap.has(t)) {
//           depgraph.addRoute([t.uid, trackerMap.get(t.type).uid]);
//           depgraph.finalize(t.uid);
//         } else {
//           trackerMap.set(t.type, t);
//         }
//       }
//     }

    if (removeTriggers) integrate(triggers);

    // Next do locations, leaving conditions intact
    const iter = queue.values();
    let next;
    while (!(next = iter.next()).done) {
      const route = next.value; // (SparseRoute)
      const target = route.target;
//console.error(`loc: ${target} ${this.nodes[target]}: ${[...route.deps]}`);
      for (const c of connectionsByFrom[target]) {
//console.error(`c: ${c.from.uid} -> ${c.to.uid} if ${c.deps.map(x=>x.uid)}`); // TODO - no connections???
        const newRoute = [c.to.uid, ...route.deps];
        for (let i = c.deps.length - 1; i >= 0; i--) {
          newRoute.push(c.deps[i].uid);
        }
        if (c.from.bossNode) newRoute.push(c.from.bossNode.uid);
//console.error(`newRoute: ${newRoute}`);
        for (const r of depgraph.addRoute(newRoute)) {
          if (!queue.has(r.label)) queue.set(r.label, r);
        }
      }
    }

    if (removeConditions) integrate(conditions);
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i] instanceof ItemGet
          || this.nodes[i] instanceof TrackerNode
         ) continue;
//console.error(`finalizing ${this.nodes[i]}`);
      depgraph.finalize(i);
    }
//console.error(`done w/ nodes`);

    // Now we have a dependency graph, where all slots should
    // have only item dependencies (unless we left some in).
    const out = new LocationList(this);
    for (const slot of slots) {
//console.error(`slot ${slot.uid}: ${[...depgraph.nodes[slot.uid]]}`);
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

    /** @const {!Array<!Array<!Bits>>} */
    this.routes = [];

    /** @const {!Array<!Set<number>>} */
    this.unlocks = [];

    /** @type {?number} Slot for "win" */
    this.win = null;

    // TODO - custom width?  for now we hardcode width=2
  }

  /** @return {!Node} */
  item(/** number */ index) {
    return this.worldGraph.nodes[this.itemToUid[index]];
  }

  /** @return {!Node} */
  location(/** number */ index) {
    return this.worldGraph.nodes[this.locationToUid[index]];
  }

  // NOTE: 'route' is in terms of worldgraph uids
  addRoute(/** !EdgeT */ route) {
    // Make sure all nodes are mapped.
    let /** !Bits */ deps = Bits.of();
    let target;
    const unlocks = [];
    for (let i = route.length - 1; i >= 0; i--) {
      const fwd = i ? this.uidToItem : this.uidToLocation;
      const bwd = i ? this.itemToUid : this.locationToUid;
      const n = route[i];
      let index = fwd[n];
      if (index == null) {
        index = bwd.length;
//console.error(`${i}: ${this.worldGraph.nodes[n]} => ${index}`);
        bwd.push(n);
        fwd[n] = index;
        // identify the win location
        if (!i && this.worldGraph.nodes[n].slotName == null) {
          this.win = index;
        }
      }
      if (i) {
        deps = Bits.with(deps, index);
        unlocks.push(this.unlocks[index] || (this.unlocks[index] = new Set()));
      } else {
        target = index;
      }
    }
    // Now add route and the unlocks.
    (this.routes[target] || (this.routes[target] = [])).push(deps);
    for (const unlock of unlocks) {
      unlock.add(target);
    }
  }

  // NOTE: does not take this.slots into account!
  canReach(/** !Node */ want, /** !Bits */ has) {
    const target = this.uidToLocation(want.uid);
    const need = this.routes[target];
    for (let i = 0; i < need.length; i++) {
      if (Bits.containsAll(has, need[i])) return true;
    }
    return false;
  }

  /**
   * Returns a bitmask of reachable locations.
   * @param {!Bits=} has Bitmask of gotten items.
   * @param {!Array<number>=} slots Location-to-item
   * @return {!Set<number>} Reachable locations
   */
  traverse(has = Bits.of(), slots = []) {
    // NOTE: we can't use isArray because the non-bigint polyfill IS an array
    // let hasOut = Array.isArray(has) ? has : null;
    // if (hasOut) has = has[0];
    has = Bits.clone(has);

    const reachable = new Set();
    let queue = new Set();
    for (let i = 0; i < this.locationToUid.length; i++) {
      queue.add(i);
    }
    const iter = queue[Symbol.iterator]();
    let next;
    while (!(next = iter.next()).done) {
      const n = next.value;
      queue.delete(n);
      if (reachable.has(n)) continue;
      // can we reach it?
      const needed = this.routes[n];
      for (let i = 0; i < needed.length; i++) {
//if(n==4)console.log(`can reach 4? ${Bits.bits(needed[i])} has ${Bits.bits(has)} => ${Bits.containsAll(has, needed[i])}`);
        if (!Bits.containsAll(has, needed[i])) continue;
        reachable.add(n);
        if (slots[n]) {
          has = Bits.with(has, slots[n]);
          for (let j of this.unlocks[slots[n]]) queue.add(j);
        }
        break;
      }
    }
    //if (hasOut) hasOut[0] = has;
    return reachable;
  }

  /**
   * Returns a bitmask of reachable locations.
   * @param {!Array<number>} slots Location-to-item
   * @return {!Array<number>} Depth of each slot
   */
  traverseDepths(slots) {
    let has = Bits.of();
    let depth = 0;
    const depths = [];
    const BOUNDARY = {};
    let queue = new Set();
    for (let i = 0; i < this.locationToUid.length; i++) {
      queue.add(i);
    }
    queue.add(BOUNDARY);
    const iter = queue[Symbol.iterator]();
    let next;
    while (!(next = iter.next()).done) {
      const n = next.value;
      queue.delete(n);
      if (n === BOUNDARY) {
        if (queue.size) queue.add(BOUNDARY);
        depth++;
        continue;
      }
      if (depths[n] != null) continue;
      // can we reach it?
      const needed = this.routes[n];
      for (let i = 0; i < needed.length; i++) {
        if (!Bits.containsAll(has, needed[i])) continue;
        depths[n] = depth;
        if (slots[n]) {
          has = Bits.with(has, slots[n]);
          for (let j of this.unlocks[slots[n]]) queue.add(j);
        }
        break;
      }
    }
    return depths;
  }

  toString() {
    const lines = [];
    for (let i = 0; i < this.routes.length; i++) {
      const loc = this.worldGraph.nodes[this.locationToUid[i]];
      const route = this.routes[i];
      const terms = [];
      for (let j = 0; j < route.length; j++) {
        const term = [];
        for (const bit of Bits.bits(route[j])) {
          term.push(this.worldGraph.nodes[this.itemToUid[bit]]);
        }
        terms.push('(' + term.join(' & ') + ')');
      }
      lines.push(`${loc}: ${terms.join(' | ')}`);
    }
    return lines.join('\n');
  }

  /**
   * Attempts to do an assumed fill.  Returns null if the
   * attempt failed.
   * @param {!Random} random
   * @param {function(!Slot, !ItemGet): boolean} fits
   * @param {function(!ItemGet, !Array<number>, !Random)} strategy
   * @return {?Array<number>}
   */
  assumedFill(random, fits = (slot, item) => true, strategy = FillStrategy) {
    // Start with all items.
    const hasArr = strategy.shuffleItems(
        this.itemToUid.map(uid => this.worldGraph.nodes[uid]), random);
    let has = Bits.from(hasArr);
    const filling = new Array(this.locationToUid.length).fill(null);
    // Start something...
    while (hasArr.length) {
      const bit = hasArr.pop();
      if (!Bits.has(has, bit)) continue;
      const item = this.worldGraph.nodes[this.itemToUid[bit]];
      has = Bits.without(has, bit);
      const reachable = 
          [...this.traverse(has, filling)].filter(n=>filling[n]==null);

      // NOTE: shuffle the whole thing b/c some items can't
      // go into some slots, so try the next one.
      strategy.shuffleSlots(item, reachable, random);
      // For now, we don't have any way to know...
      let found = false;
      for (const slot of reachable) {
        if (filling[slot] == null &&
            slot != this.win &&
            fits(this.worldGraph.nodes[this.locationToUid[slot]], item)) {
if(slot>100)throw new Error('WTF');
          filling[slot] = bit;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    return filling;
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


  // /**
  //  * Attempts to do an assumed fill.  Returns null if the
  //  * attempt failed.
  //  * @param {!Random} random
  //  * @param {function(!Slot, !ItemGet): boolean} fits
  //  * @return {?Array<number>}
  //  */
  // forwardFill(random, fits = (slot, item) => true) {
  //   // This is a simpler algorithm, but hopefully it's a little more reliable
  //   // in hairy situations?  Basic plan: find a route with few requirements
  //   // and drop one requirement from it into a reachable location.
  //   const need = new Set(this.itemToUid.map((_, i) => i));
  //   let has = Bits.of();
  //   const filling = new Array(this.locationToUid.length).fill(null);
  //   // Start something...
  //   while (need.size) {
  //     const obtainable = [has];
  //     const reachable =
  //         new Set(
  //             random.shuffle(
  //                 [...this.traverse(obtainable, filling)]
  //                     .filter(n => filling[n] == null)));
  //     // Iterate over the routes, subtracting ontainable[0]
  //     const routes = [];
  //     for (let i = 0; i < this.routes.length; i++) {
  //       if (filling[i] || reachable.has(i)) continue;
  //       for (const /** !Bits */ route of this.routes[i]) {
  //         const r = Bits.bits(Bits.difference(route, has));
          
  //       }
  //   /** @const {!Array<!Array<!Bits>>} */
  //   this.routes = [];

  //     const bit = hasArr.pop();
  //     if (!Bits.has(has, bit)) continue;
  //     const item = this.worldGraph.nodes[this.itemToUid[bit]];
  //     has = Bits.without(has, bit);
      
  //     const reachable = 
  //         [...this.traverse(has, filling)].filter(n=>filling[n]==null);

  //     // NOTE: shuffle the whole thing b/c some items can't
  //     // go into some slots, so try the next one.
  //     strategy.shuffleSlots(item, reachable, random);
  //     // For now, we don't have any way to know...
  //     let found = false;
  //     for (const slot of reachable) {
  //       if (filling[slot] == null &&
  //           slot != this.win &&
  //           fits(this.worldGraph.nodes[this.locationToUid[slot]], item)) {
  //         filling[slot] = bit;
  //         found = true;
  //         break;
  //       }
  //     }
  //     if (!found) return null;
  //   }
  //   return filling;
  // }

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


/** @record */
export class FillStrategy {
  /**
   * @param {!ItemGet} item
   * @param {!Array<number>} reachable Shuffles in-place
   * @param {!Random} random
   */
  shuffleSlots(item, reachable, random) {}

  static shuffleSlots(item, reachable, random) {
    random.shuffle(reachable);
  }

  /**
   * @param {!Array<!ItemGet>} items
   * @param {!Random} random
   * @return {!Array<number>}
   */
  shuffleItems(items, random) {}

  static shuffleItems(items, random) {
    const shuffled = [];
    for (let i = 0; i < items.length; i++) {
      const {shufflePriority = 1} = items[i];
      for (let j = 0; j < shufflePriority; j++) shuffled.push(i);
    }
    random.shuffle(shuffled);
    return shuffled;
  }
}

// Funnel all the writes into a single place to find errant writes.
const write = (rom, addr, value) => {
  rom[addr] = value;
}

// statistics we can do
//  - distribution of locations for each item
//  - was item necessary? (remove and traverse)
//    - gas mask, shell flute, rabbit boots,
//      change, telepathy
//  - was slot necessary?
//    - broken statue/eyeglasses, stxy, bow of sun, ...
//  - how many necessary items are there?
//    (obviously this is separately-necessary...
//     there will be some alternatives where neither
//     single item is necessary but one or the other is)
//  - correlations between item locations in the same seed?
//  - how deep was item --- how to compute?  would like
//    e.g. minimum path to get it, but that seems hard.
//  - what blocks what - remove shell flute, can still get flight?
//  - index in dfs
// success rate, where are seeds failing?

//  - usefulness of each item
//    - given each slot, what are requirements?
//    - need to remove impossible paths?
//    - then for N paths, 1/N for each path item is in
//    -> how many slots does item unlock.
//       - could do this cumulatively?

// A : B | C & D
// B : A & C | A & D
// C : D
// D :
// Then A : B is useless because all B : A.
// But could be transitive
// A : B | D
// B : C
// C : A & D
// D : E
// E :
// If we sub
//   A -> (C) | (E)
//     -> (A & D) | ()
// Eventually everything should either cycle or
// empty out... we want the paths that don't cycle
// but we don't have a good way to sub and keep track
// of where everything came from...

// DEPTH -> how many unlocks do you need...


export class Filling {
  constructor() {
    this.data = [];
  }


  has(slot) {}

  get(slot) {}

  set(slot, item) {}

  /** for override */
  fits(slot, item) {
    // todo - in subclass, keep track of number of
    // non-chest slots that need to be filled...

    // alternatively, just have set() return a boolean
    // for whether it succeeded...
    return true;
  }

}
