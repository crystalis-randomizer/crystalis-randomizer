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
    this.uid = 'n' + graph.nodes.length;
    graph.nodes.push(this);
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
}

export class Option extends Node {
  constructor(graph, name, value) {
    super(graph);
    this.name = name;
    this.value = value;
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
