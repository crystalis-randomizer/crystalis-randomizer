// TODO - rename to nodes.js ?

import {Bits} from './bits';
import {Edge, Graph, Node, NodeId, SparseDependencyGraph, SparseRoute} from './graph';
import {Random} from './random';
import {Rom} from './rom';
import {hex} from './rom/util';

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

type TrackerNodeType = 1 | 2 | 3;

export class TrackerNode extends Node {

  static readonly OFF_ROUTE = 1;
  static readonly GLITCH = 2;
  static readonly HARD = 3;

  constructor(graph: Graph, readonly type: TrackerNodeType, name: string) {
              // , option, missing, weight
    super(graph, name); // + ': ' + option);
    // this.option = option;
    // this.missing = missing;
    // this.weight = weight;
  }

  get nodeType(): string {
    return 'Tracker';
  }

  // NOTE: Tracker nodes are only ever created when a particular route
  // is off-logic.  So integrating them should make them disappear
  // entirely as impossible.  The tracker does *not* 'integrate them,
  // but retains them for tracking purposes.  Evil mode will want to
  // retain them as well, but we'll have a bunch more nodes in that
  // case to track missing items.
  edges({tracker = false}: {tracker?: boolean} = {}): Edge[] {
    // return []; // this.option.value ? [Edge.of(this)] : [];
    // return tracker ? [] : [Edge.of(this)];
    return [];
  }
}

export class Option extends Node {
  constructor(graph: Graph, name: string, readonly value: boolean) {
    super(graph, name);
  }

  get nodeType(): string {
    return 'Option';
  }

  edges(): Edge[] {
    return this.value ? [Edge.of(this)] : [];
  }
}

type SlotType = 'magic' | 'consumable' | 'trap' | 'key' | 'bonus';

export class Slot extends Node {

  slotName: string;
  slotIndex: number;
  slotType: SlotType;
  vanillaItemName: string;
  itemIndex: number;
  requiresUnique: boolean = false;
  isInvisible: boolean = false;

  constructor(graph: Graph,
              name: string,
              public item: ItemGet,
              index: number,
              readonly slots: ((rom: Rom, slot: Slot) => void)[] = []) {
    super(graph, name);
    // Information about the slot itself
    this.slotName = name;
    this.slotIndex = index;
    this.slotType = item instanceof Magic ? 'magic' : 'consumable';
    this.vanillaItemName = item.name;
    // Information about the current item (if any)
    this.itemIndex = index;
  }

  get nodeType(): string {
    return 'Slot';
  }

  toString(): string {
    return `${super.toString()} [${this.vanillaItemName} $${
            this.slotIndex.toString(16).padStart(2, '0')}]`;
  }

  edges(): Edge[] {
    return this.item != null && this.itemIndex != null ?
        [Edge.of(this.item, this)] : [];
  }

  isFixed(): boolean { return false; }

  isMimic(): boolean { return this.itemIndex >= 0x70; }

  requireUnique(): this {
    this.requiresUnique = true;
    return this;
  }

  canHoldMimic(): boolean {
    // NOTE: boss drops cannot hold mimics because they cause boss respawn.
    return this instanceof Chest && !this.isInvisible;
  }

  needsChest(): boolean {
    const i = this.itemIndex;
    // NOTE: if alarm flute goes in 3rd row, 0x31 should go away.
    return i >= 0x0d && i <= 0x24 ||
        i === 0x26 ||
        // i === 0x28 ||
        // i === 0x31 ||
        i > 0x48;
  }

  isChest(): boolean {
    // Only chests can hold consumables (unless we override with a flag).
    // Rage is not a chest.
    return (this instanceof Chest || this instanceof BossDrop) &&
        this.slotIndex !== 0x09;
  }

  get name2(): string {
    if (this.item.name === this.vanillaItemName) return this.name;
    return `${this.item.name} [${this.vanillaItemName}]`;
  }

  set(item: ItemGet, index: number): void {
    // NOTE: we can't just use item.index because repeated
    // items need separate indices but we don't make extra
    // Item nodes for them.
    this.item = item;
    this.itemIndex = index;
  }

  write(): void {
    if (!this.slots) return;
    const rom = this.graph.rom;
    if (rom) {
      for (const slot of this.slots) {
        // TODO - not clear where to write this.
        slot(rom, this);
      }
    }
  }

  swap(other: Slot): void {
    const item = this.item;
    const index = this.itemIndex;
    this.set(other.item, other.itemIndex);
    other.set(item, index);
  }

  key(): this {
    this.slotType = 'key';
    return this;
  }

  bonus(): this {
    this.slotType = 'bonus';
    return this;
  }

  direct(address: number): this {
    // slot is usually 'this' for the Slot object that owns this.
    this.slots.push((rom, slot) => {
      write(rom.prg, address, slot.itemIndex);
      // console.log(`${this.name2}: ${addr.toString(16)} <- ${
      //              slot.index.toString(16).padStart(2,0)}`);
    });
    return this;
  }

  fromPerson(name: string, personId: number, offset: number = 0): this {
    this.slots.push((rom, slot) => {
      rom.npcs[personId].data[offset] = slot.itemIndex;
    });
    return this;
  }

  npcSpawn(id: number, location?: number, offset: number = 0): this {
    this.slots.push((rom, slot) => {
      const spawns = rom.npcs[id].spawnConditions;
      if (location == null) location = getFirst(spawns.keys());
      const spawn = spawns.get(location);
      if (!spawn) throw new Error(`No spawn found for NPC $${hex(id)} @ $${hex(location)}`);
      spawn[offset] = setItem(spawn[offset], slot); // 0x200 | slot.itemIndex;
    });
    return this;
  }

  // TODO - better matching, e.g. which condition to replace?

  dialog(id: number,
         location?: number, offset: number = 0, result?: number): this {
    this.slots.push((rom, slot) => {
      const allDialogs = rom.npcs[id].localDialogs;
      if (location == null) location = getFirst(allDialogs.keys());
      const dialogs = allDialogs.get(location);
      if (!dialogs) throw new Error(`No dialog found for NPC $${hex(id)} @ $${hex(location)}`);
      const dialog = dialogs[offset];
      if (!dialog) throw new Error(`No such dialog ${offset}`);
      if (result == null) {
        dialog.condition = setItem(dialog.condition, slot); // 0x200 | slot.itemIndex;
      } else {
        dialog.flags[result] = setItem(dialog.flags[result], slot); // 0x200 | slot.itemIndex;
      }
    });
    return this;
  }

  trigger(id: number, offset: number = 0, result?: number): this {
    this.slots.push((rom, slot) => {
      const trigger = rom.triggers[id & 0x7f];
      if (result == null) {
        trigger.conditions[offset] = setItem(trigger.conditions[offset], slot);
      } else {
        trigger.flags[result] = setItem(trigger.flags[result], slot);
      }
    });
    return this;
  }
}

export class FixedSlot extends Slot {
  isFixed(): boolean { return true; }
}

export class BossDrop extends Slot {
  get nodeType(): string {
    return 'BossDrop';
  }
}

export class Chest extends Slot {

  spawnSlot: number | null = null;
  isInvisible: boolean = false;

  constructor(graph: Graph, name: string, item: ItemGet, index: number) {
    super(graph, name, item, index);
  }

  get nodeType(): string {
    return 'Chest';
  }

  objectSlot(loc: number, spawnSlot: number) {
    this.spawnSlot = spawnSlot;
    this.slots.push((rom, slot) => {
      const location = rom.locations[loc];
      if (!location || !location.used) throw new Error(`No such location: $${hex(loc)}`);
      const spawn = location.spawns[spawnSlot - 0x0d];
      if (!spawn || !spawn.isChest()) {
        throw new Error(`No chest $${hex(spawnSlot)} on $${hex(loc)}`);
      }
      // NOTE: vanilla mimics are timer spawns, but that doesn't work as well for us.
      spawn.timed = false;
      spawn.id = Math.min(slot.itemIndex, 0x70);
    });
    return this;
  }

  invisible(address: number) {
    this.isInvisible = true;
    return this.direct(address);
  }
}

type InventoryRow = 'armor' | 'consumable' | 'unique';

export class ItemGet extends Node {

  shufflePriority: number = 1;
  inventoryRow: InventoryRow = 'unique';

  constructor(graph: Graph,
              readonly id: number,
              name: string) {
    super(graph, name);
  }

  get nodeType(): string {
    return 'ItemGet';
  }

  chest(name: string = this.name + ' chest', index: number = this.id): Chest {
    return new Chest(this.graph, name, this, index);
  }

  fromPerson(name: string, personId: number, offset: number = 0): Slot {
    return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
      rom.npcs[personId].data[offset] = slot.itemIndex;
    }]);
  }

  bossDrop(name: string, bossId: number, itemGetIndex: number = this.id): BossDrop {
    return new BossDrop(this.graph, name, this, itemGetIndex, [(rom, slot) => {
      rom.bossKills[bossId].itemDrop = slot.itemIndex;
    }]);
  }

  direct(name: string, a: number): Slot {
    return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
      write(rom.prg, a, slot.itemIndex);
      // console.log(`${this.name == slot.name ? this.name : `${slot.name} (${
      //              this.name})`}: ${a.toString(16)} <- ${
      //              slot.index.toString(16).padStart(2,0)}`);
    }]);
  }

  fixed(): Slot {
    return new FixedSlot(this.graph, this.name, this, this.id);
  }

  weight(w: number): this {
    this.shufflePriority = w;
    return this;
  }

  consumable(): this {
    this.inventoryRow = 'consumable';
    return this;
  }

  armor(): this {
    this.inventoryRow = 'armor';
    return this;
  }
}

export class Item extends ItemGet {
  get nodeType(): string {
    return 'Item';
  }
}

export class Magic extends ItemGet {
  get nodeType(): string {
    return 'Magic';
  }
}

export class Trigger extends Node {

  slot: Slot | null = null;
  readonly reqs: Edge[] = [];

  constructor(graph: Graph, name: string) {
    super(graph, name);
  }

  get nodeType(): string {
    return 'Trigger';
  }

  edges(): Edge[] {
    const out = [...this.reqs];
    if (this.slot) out.push(Edge.of(this.slot, this));
    return out;
  }

  get(slot: Slot): this {
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

  readonly options: Node[][] = [];

  constructor(graph: Graph, name: string) {
    super(graph, name);
  }

  get nodeType(): string {
    return 'Condition';
  }

  edges(): Edge[] {
    return this.options.map((opt) => Edge.of(this, ...opt));
  }

  option(...deps: Node[]): this {
    this.options.push(deps.map(x => x instanceof Slot ? x.item : x));
    return this;
  }
}

export class Boss extends Trigger {

  readonly deps: Node[];

  constructor(graph: Graph,
              readonly index: number,
              name: string,
              ...deps: Node[]) {
    super(graph, name);
    this.deps = deps.map(x => x instanceof Slot ? x.item : x);
  }

  get nodeType() {
    return 'Boss';
  }
}

export class Area extends Node {
  get nodeType(): string {
    return 'Area';
  }
}

export class Connection {

  readonly deps: Node[];

  constructor(readonly from: Location,
              readonly to: Location,
              readonly bidi: boolean = false,
              deps: Node[] = []) {
    this.deps = deps.map(x => x instanceof Slot ? x.item : x);
  }

  reverse(): Connection {
    return new Connection(this.to, this.from, this.bidi, this.deps);
  }
}

export class Location extends Node {

  readonly simpleName: string;
  readonly connections: Connection[] = [];
  readonly chests: Chest[] = [];
  bossNode: Boss | null = null;
  type: string | null = null;
  isStart: boolean = false;
  isEnd: boolean = false;
  sells: Item[] = [];

  constructor(graph: Graph,
              readonly id: number,
              readonly area: Area,
              name: string) {
    super(graph, area.name + ': ' + name);
    this.simpleName = name;
  }

  get nodeType(): string {
    return 'Location';
  }

  toString(): string {
    return `Location ${this.id.toString(16).padStart(2, '0')} ${this.name}`;
  }

  edges(): Edge[] {
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

  addConnection(c: Connection): this {
    c.from.connections.push(c);
    c.to.connections.push(c);
    return this;
  }

  from(location: Location, ...deps: Node[]): this {
    return this.addConnection(new Connection(location, this, false, deps));
  }

  to(location: Location, ...deps: Node[]): this {
    return this.addConnection(new Connection(this, location, false, deps));
  }

  connect(location: Location, ...deps: Node[]): this {
    return this.addConnection(new Connection(location, this, true, deps));
  }

  connectTo(location: Location, ...deps: Node[]): this {
    return this.addConnection(new Connection(this, location, true, deps));
  }

  chest(item: ItemGet | Slot, spawn: number, chest?: number): this {
    if (item instanceof Slot && !(item instanceof Chest) && chest != null) {
      // Consider making this an error?
      item = item.item;
    }
    if (item instanceof ItemGet) {
      item = item.chest(undefined, chest);
    }
    const chestNode = item as Chest;
    const slot = chestNode.objectSlot(this.id, spawn);
    this.chests.push(slot);
    if (slot.itemIndex >= 0x70) slot.slotType = 'trap';
    if (!slot.slotName || slot.slotName.endsWith(' chest')) {
      slot.slotName = chestNode.name + ' in ' + this.area.name;
    }
    return this;
  }

  trigger(trigger: Trigger, ...deps: Node[]): this {
    deps = deps.map(n => n instanceof Slot ? n.item : n);
    trigger.reqs.push(Edge.of(trigger, this, ...deps));
    return this;
  }

  boss(boss: Boss): this {
    this.bossNode = boss;
    boss.reqs.push(Edge.of(boss, this, ...boss.deps));
    return this;
  }

  // Location types - basic idea would be to leave misc alone, but otherwise
  // shuffle among areas of the same type.  We could mix caves and fortresses
  // if relevant, as well as sea and overworld.  We should mark each connection
  // with a value indicating the threshold for shuffling it - 1 = always shuffle,
  // 2 = medium, 3 = crazy (e.g. shuffle all exits).
  overworld(): this {
    this.type = 'overworld';
    return this;
  }

  town(): this {
    this.type = 'town';
    return this;
  }

  cave(): this {
    this.type = 'cave';
    return this;
  }

  sea(): this {
    this.type = 'sea';
    return this;
  }

  fortress(): this {
    this.type = 'fortress';
    return this;
  }

  house(): this {
    this.type = 'house';
    return this;
  }

  shop(...items: (Item | Slot)[]): this {
    this.type = 'house';
    this.sells = items.map(x => x instanceof Slot ? x.item as Item : x);
    return this;
  }

  misc(): this {
    this.type = 'misc';
    return this;
  }

  start(): this {
    this.isStart = true;
    return this;
  }

  end(): this {
    this.isEnd = true;
    return this;
  }

  fullName(): string {
    const lines = [this.simpleName];
    if (this.bossNode) {
      lines.push(this.bossNode.name);
    }
    return lines.join('\\n');
  }

  write(): void {
    if (!this.sells.length) return;
    // Write shop contents, ignore prices for now.
    // Later maybe have mode for shuffle but not renormalize?
    const rom = this.graph.rom;
    if (!rom) throw new Error(`Cannot write without a rom`);
    for (const shop of rom.shops) {
      if (shop.location === this.id) {
        for (let i = 0; i < 4; i++) {
          shop.contents[i] = this.sells[i] ? this.sells[i].id : 0xff;
        }
      }
    }
  }
}

export class WorldGraph extends Graph {

  write() {
    for (const n of this.nodes) {
      n.write();
    }
  }

  shuffleShops(random: Random) {
    // for now we just dump everything into a pool and shuffle them up.
    interface ShopType {
      shops: Location[];
      items: Item[];
    }
    const armor: ShopType = {shops: [], items: []};
    const tools: ShopType = {shops: [], items: []};
    for (const n of this.nodes) {
      if (!(n instanceof Location) || !n.sells.length) continue;
      const s = n.sells[0].inventoryRow === 'armor' ? armor : tools;
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
        const shop = shops[s++ % shops.length];
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
  integrate({tracker = false}: {tracker?: boolean} = {}) {
    // for(let i=0;i<this.nodes.length;i++)
    // console.log(`${i} ${this.nodes[i]}`);

    const removeConditions = true;
    const removeTriggers = true;
    const removeOptions = true;
    const removeTrackers = !tracker;

    const depgraph = new SparseDependencyGraph(this.nodes.length);
    const connectionsByFrom: Connection[][] = [];
    const connectionsByTo: Connection[][] = [];
    const connections = new Set<Connection>();
    const queue = new Map<string, SparseRoute>(); // was: Edge ???

    const options: Option[] = [];
    const trackers: TrackerNode[] = [];
    const conditions: Condition[] = [];
    const triggers: Trigger[] = [];
    const items: ItemGet[] = [];
    const slots = new Set<Slot>();

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
      else if (n instanceof Area) (() => {})(); // do nothing
      else throw new Error(`Unknown node type: ${n.nodeType}`);
    }

    for (const c of connections) {
      connectionsByFrom[c.from.uid].push(c);
      connectionsByTo[c.to.uid].push(c);
    }

    const integrate = (nodes: Node[]) => {
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
    for (const route /* : SparseRoute */ of queue.values()) {
      const target = route.target;
      // console.error(`loc: ${target} ${this.nodes[target]}: ${[...route.deps]}`);
      for (const c of connectionsByFrom[target]) {
        // console.error(`c: ${c.from.uid} -> ${c.to.uid} if ${
        //                c.deps.map(x=>x.uid)}`); // TODO - no connections???
        const newRoute = [c.to.uid, ...route.deps];
        for (let i = c.deps.length - 1; i >= 0; i--) {
          newRoute.push(c.deps[i].uid);
        }
        if (c.from.bossNode) newRoute.push(c.from.bossNode.uid);
        // console.error(`newRoute: ${newRoute}`);
        for (const r of depgraph.addRoute(newRoute)) {
          if (!queue.has(r.label)) queue.set(r.label, r);
        }
      }
    }

    if (removeConditions) integrate(conditions);
    for (let i = 0 as NodeId; i < this.nodes.length; i++) {
      if (this.nodes[i] instanceof ItemGet
          || this.nodes[i] instanceof TrackerNode
         ) continue;
      // console.error(`finalizing ${this.nodes[i]}`);
      depgraph.finalize(i);
    }
    // console.error(`done w/ nodes`);

    // Now we have a dependency graph, where all slots should
    // have only item dependencies (unless we left some in).
    const out = new LocationList(this);
    for (const slot of slots) {
      // console.error(`slot ${slot.uid}: ${[...depgraph.nodes[slot.uid]]}`);
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

  // Bimap between nodes and indices.
  readonly uidToLocation: NodeId[] = [];
  readonly locationToUid: NodeId[] = [];
  readonly uidToItem: NodeId[] = [];
  readonly itemToUid: NodeId[] = [];
  readonly routes: Bits[][] = [];
  readonly unlocks: Set<NodeId>[] = [];
  // Slot for the "win condition" node.
  win: NodeId | null = null;

  // TODO - custom width?  for now we hardcode width=2
  constructor(readonly worldGraph: WorldGraph) {}

  item(index: NodeId): ItemGet {
    return this.worldGraph.nodes[this.itemToUid[index]] as ItemGet;
  }

  location(index: NodeId): Slot {
    return this.worldGraph.nodes[this.locationToUid[index]] as Slot;
  }

  // NOTE: 'route' is in terms of worldgraph uids
  addRoute(route: Edge): void {
    // Make sure all nodes are mapped.
    let deps: Bits = Bits.of();
    let target: NodeId = -1 as NodeId; // will always be reassigned
    const unlocks = [];
    for (let i = route.length - 1; i >= 0; i--) {
      const fwd = i ? this.uidToItem : this.uidToLocation;
      const bwd = i ? this.itemToUid : this.locationToUid;
      const n = route[i];
      let index = fwd[n];
      if (index == null) {
        index = bwd.length as NodeId;
        // console.error(`${i}: ${this.worldGraph.nodes[n]} => ${index}`);
        bwd.push(n);
        fwd[n] = index;
        // identify the win location
        const node = this.worldGraph.nodes[n];
        if (!i && node instanceof Slot && node.isFixed()) {
          this.win = index;
        }
      }
      if (i) {
        deps = Bits.with(deps, index);
        unlocks.push(this.unlocks[index] ||
                     (this.unlocks[index] = new Set<NodeId>()));
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
  canReach(want: Node, has: Bits): boolean {
    const target = this.uidToLocation[want.uid];
    const need = this.routes[target];
    for (let i = 0, len = need.length; i < len; i++) {
      if (Bits.containsAll(has, need[i])) return true;
    }
    return false;
  }

  /**
   * Returns a bitmask of reachable locations.
   * @param has Bitmask of gotten items
   * @param slots Location-to-item mapping
   * @return Set of reachable locations
   */
  traverse(has: Bits = Bits.of(), slots: NodeId[] = []): Set<NodeId> {
    // NOTE: we can't use isArray because the non-bigint polyfill IS an array
    // let hasOut = Array.isArray(has) ? has : null;
    // if (hasOut) has = has[0];
    has = Bits.clone(has);

    const reachable = new Set<NodeId>();
    const queue = new Set<NodeId>();
    for (let i = 0 as NodeId; i < this.locationToUid.length; i++) {
      queue.add(i);
    }
    for (const n of queue) {
      queue.delete(n);
      if (reachable.has(n)) continue;
      // can we reach it?
      const needed = this.routes[n];
      for (let i = 0, len = needed.length; i < len; i++) {
        // if(n==4)console.log(`can reach 4? ${Bits.bits(needed[i])} has ${
        //           Bits.bits(has)} => ${Bits.containsAll(has, needed[i])}`);
        if (!Bits.containsAll(has, needed[i])) continue;
        reachable.add(n);
        if (slots[n]) {
          has = Bits.with(has, slots[n]);
          for (const j of this.unlocks[slots[n]]) {
            queue.add(j);
          }
        }
        break;
      }
    }
    // if (hasOut) hasOut[0] = has;
    return reachable;
  }

  /**
   * Returns a bitmask of reachable locations.
   * @param slots Location-to-item mapping
   * @return Depth of each slot
   */
  traverseDepths(slots: NodeId[]): number[] {
    let has = Bits.of();
    let depth = 0;
    const depths: number[] = [];
    const BOUNDARY = {};
    const queue = new Set<NodeId | typeof BOUNDARY>();
    for (let i = 0; i < this.locationToUid.length; i++) {
      queue.add(i);
    }
    queue.add(BOUNDARY);
    for (const n of queue) {
      queue.delete(n);
      if (typeof n !== 'number') {
        if (queue.size) queue.add(BOUNDARY);
        depth++;
        continue;
      }
      if (depths[n] != null) continue;
      // can we reach it?
      const needed = this.routes[n];
      for (let i = 0, len = needed.length; i < len; i++) {
        if (!Bits.containsAll(has, needed[i])) continue;
        depths[n] = depth;
        if (slots[n]) {
          has = Bits.with(has, slots[n]);
          for (const j of this.unlocks[slots[n]]) {
            queue.add(j);
          }
        }
        break;
      }
    }
    return depths;
  }

  toString(): string {
    const lines = [];
    // Note: routes are indexed by location NodeId
    for (let i = 0 as NodeId; i < this.routes.length; i++) {
      const loc = this.location(i);
      const route = this.routes[i];
      const terms = [];
      for (let j = 0, len = route.length; j < len; j++) {
        const term = [];
        for (const bit of Bits.bits(route[j])) {
          term.push(this.item(bit as NodeId));
        }
        terms.push('(' + term.join(' & ') + ')');
      }
      lines.push(`${loc}: ${terms.join(' | ')}`);
    }
    return lines.join('\n');
  }

  /**
   * Attempts to do an assumed fill.  Returns null if the attempt failed.
   * Otherwise returns a mapping of location to item.
   */
  assumedFill(random: Random,
              fits: (slot: Slot, item: ItemGet) => boolean = (slot, item) => true,
              strategy: FillStrategy = FillStrategy): NodeId[] | null {
    // Start with all items.
    const hasArr = strategy.shuffleItems(
        this.itemToUid.map(uid => this.worldGraph.nodes[uid] as ItemGet), random);
    let has = Bits.from(hasArr);
    const filling = new Array(this.locationToUid.length).fill(null);
    // Start something...
    while (hasArr.length) {
      const bit = hasArr.pop()!;
      if (!Bits.has(has, bit)) continue;
      const item = this.item(bit);
      has = Bits.without(has, bit);
      const reachable =
          [...this.traverse(has, filling)].filter(n => filling[n] == null);

      // NOTE: shuffle the whole thing b/c some items can't
      // go into some slots, so try the next one.
      strategy.shuffleSlots(item, reachable, random);
      // For now, we don't have any way to know...
      let found = false;
      for (const slot of reachable) {
        if (filling[slot] == null &&
            slot !== this.win &&
            fits(this.location(slot), item)) {
          if (slot > 100) throw new Error('Something went horribly wrong');
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

////////////////////////////////////////////////////////////////

export interface FillStrategy {
  /** Shuffles `reachable` in-place. */
  shuffleSlots(item: ItemGet, reachable: NodeId[], random: Random): void;

  /** Returns amn array of indices into the `items` array. */
  shuffleItems(items: ItemGet[], random: Random): NodeId[];
}

// Basic FillStrategy that shuffles slots fairly but populates
// items based on weight.
export const FillStrategy: FillStrategy = {
  shuffleSlots: (item, reachable, random) => {
    random.shuffle(reachable);
  },

  shuffleItems: (items, random) => {
    const shuffled = [];
    for (let i = 0 as NodeId; i < items.length; i++) {
      const {shufflePriority = 1} = items[i];
      for (let j = 0; j < shufflePriority; j++) shuffled.push(i);
    }
    random.shuffle(shuffled);
    return shuffled;
  },
};

// Funnel all the writes into a single place to find errant writes.
const write = (rom: Uint8Array, address: number, value: number) => {
  rom[address] = value;
};

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

////////////////////////////////////////////////////////////////

// export class Filling {
//   constructor() {
//     this.data = [];
//   }

//   has(slot) {}

//   get(slot) {}

//   set(slot, item) {}

//   /** for override */
//   fits(slot, item) {
//     // todo - in subclass, keep track of number of
//     // non-chest slots that need to be filled...

//     // alternatively, just have set() return a boolean
//     // for whether it succeeded...
//     return true;
//   }

// }

function getFirst<T>(iter: Iterable<T>): T {
  for (const i of iter) return i;
  throw new Error('Empty iterable');
}

function setItem(flag: number, slot: Slot): number {
  return flag < 0 ? ~(0x200 | slot.itemIndex) : 0x200 | slot.itemIndex;
}
