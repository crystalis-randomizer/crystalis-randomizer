// TODO - rename to nodes.js ?

import {Node, Edge, Graph} from './graph.js';

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
  }

  get nodeType() {
    return 'Trigger';
  }

  edges() {
    return this.slot ? [Edge.of(this.slot, this)] : [];
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
    this.triggers = [];
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
    for (const {trigger, deps} of this.triggers) {
      out.push(Edge.of(trigger, this, ...deps));
    }
    for (const c of this.chests) {
      out.push(Edge.of(c, this));
    }
    if (this.bossNode) {
      out.push(Edge.of(this.bossNode, this, ...this.bossNode.deps));
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
  integrate() {}

}

export class LocationList extends Graph {

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

}
