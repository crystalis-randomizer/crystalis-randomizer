import { Bits } from './bits.js';
import { Edge, Graph, Node, SparseDependencyGraph } from './graph.js';
import { hex } from './rom/util.js';
export class TrackerNode extends Node {
    constructor(graph, type, name) {
        super(graph, name);
        this.type = type;
    }
    get nodeType() {
        return 'Tracker';
    }
    edges({ tracker = false } = {}) {
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
    edges() {
        return this.value ? [Edge.of(this)] : [];
    }
}
export class Slot extends Node {
    constructor(graph, name, item, index, slots = []) {
        super(graph, name);
        this.item = item;
        this.slots = slots;
        this.requiresUnique = false;
        this.isInvisible = false;
        this.slotName = name;
        this.slotIndex = index;
        this.slotType = item instanceof Magic ? 'magic' : 'consumable';
        this.vanillaItemName = item.name;
        this.itemIndex = index;
    }
    get nodeType() {
        return 'Slot';
    }
    toString() {
        return `${super.toString()} [${this.vanillaItemName} $${this.slotIndex.toString(16).padStart(2, '0')}]`;
    }
    edges() {
        return this.item != null && this.itemIndex != null ?
            [Edge.of(this.item, this)] : [];
    }
    isFixed() { return false; }
    isMimic() { return this.itemIndex >= 0x70; }
    requireUnique() {
        this.requiresUnique = true;
        return this;
    }
    canHoldMimic() {
        return this instanceof Chest && !this.isInvisible;
    }
    needsChest() {
        const i = this.itemIndex;
        return i >= 0x0d && i <= 0x24 ||
            i === 0x26 ||
            i > 0x48;
    }
    isChest() {
        return (this instanceof Chest || this instanceof BossDrop) &&
            this.slotIndex !== 0x09;
    }
    get name2() {
        if (this.item.name === this.vanillaItemName)
            return this.name;
        return `${this.item.name} [${this.vanillaItemName}]`;
    }
    set(item, index) {
        this.item = item;
        this.itemIndex = index;
    }
    write() {
        if (!this.slots)
            return;
        const rom = this.graph.rom;
        if (rom) {
            for (const slot of this.slots) {
                slot(rom, this);
            }
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
    direct(address) {
        this.slots.push((rom, slot) => {
            write(rom.prg, address, slot.itemIndex);
        });
        return this;
    }
    fromPerson(name, personId, offset = 0) {
        this.slots.push((rom, slot) => {
            rom.npcs[personId].data[offset] = slot.itemIndex;
        });
        return this;
    }
    npcSpawn(id, location, offset = 0) {
        this.slots.push((rom, slot) => {
            const spawns = rom.npcs[id].spawnConditions;
            if (location == null)
                location = getFirst(spawns.keys());
            const spawn = spawns.get(location);
            if (!spawn)
                throw new Error(`No spawn found for NPC $${hex(id)} @ $${hex(location)}`);
            spawn[offset] = setItem(spawn[offset], slot);
        });
        return this;
    }
    dialog(id, location, offset = 0, result) {
        this.slots.push((rom, slot) => {
            const allDialogs = rom.npcs[id].localDialogs;
            if (location == null)
                location = getFirst(allDialogs.keys());
            const dialogs = allDialogs.get(location);
            if (!dialogs)
                throw new Error(`No dialog found for NPC $${hex(id)} @ $${hex(location)}`);
            const dialog = dialogs[offset];
            if (!dialog)
                throw new Error(`No such dialog ${offset}`);
            if (result == null) {
                dialog.condition = setItem(dialog.condition, slot);
            }
            else {
                dialog.flags[result] = setItem(dialog.flags[result], slot);
            }
        });
        return this;
    }
    trigger(id, offset = 0, result) {
        this.slots.push((rom, slot) => {
            const trigger = rom.triggers[id & 0x7f];
            if (result == null) {
                trigger.conditions[offset] = setItem(trigger.conditions[offset], slot);
            }
            else {
                trigger.flags[result] = setItem(trigger.flags[result], slot);
            }
        });
        return this;
    }
}
export class FixedSlot extends Slot {
    isFixed() { return true; }
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
            const location = rom.locations[loc];
            if (!location || !location.used)
                throw new Error(`No such location: $${hex(loc)}`);
            const spawn = location.spawns[spawnSlot - 0x0d];
            if (!spawn || !spawn.isChest()) {
                throw new Error(`No chest $${hex(spawnSlot)} on $${hex(loc)}`);
            }
            spawn.timed = false;
            spawn.id = Math.min(slot.itemIndex, 0x70);
        });
        return this;
    }
    invisible(address) {
        this.isInvisible = true;
        return this.direct(address);
    }
}
export class ItemGet extends Node {
    constructor(graph, id, name) {
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
        return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
                rom.npcs[personId].data[offset] = slot.itemIndex;
            }]);
    }
    bossDrop(name, bossId, itemGetIndex = this.id) {
        return new BossDrop(this.graph, name, this, itemGetIndex, [(rom, slot) => {
                rom.bossKills[bossId].itemDrop = slot.itemIndex;
            }]);
    }
    direct(name, a) {
        return new Slot(this.graph, name, this, this.id, [(rom, slot) => {
                write(rom.prg, a, slot.itemIndex);
            }]);
    }
    fixed() {
        return new FixedSlot(this.graph, this.name, this, this.id);
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
        this.reqs = [];
    }
    get nodeType() {
        return 'Trigger';
    }
    edges() {
        const out = [...this.reqs];
        if (this.slot)
            out.push(Edge.of(this.slot, this));
        return out;
    }
    get(slot) {
        if (this.slot)
            throw new Error('already have a slot');
        this.slot = slot;
        return this;
    }
}
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
        this.id = id;
        this.area = area;
        this.connections = [];
        this.chests = [];
        this.bossNode = null;
        this.type = null;
        this.isStart = false;
        this.isEnd = false;
        this.sells = [];
        this.simpleName = name;
    }
    get nodeType() {
        return 'Location';
    }
    toString() {
        return `Location ${this.id.toString(16).padStart(2, '0')} ${this.name}`;
    }
    edges() {
        const out = [];
        for (const c of this.connections) {
            out.push(Edge.of(c.to, c.from, ...c.deps, ...(c.from.bossNode ? [c.from.bossNode] : [])));
            if (c.bidi)
                out.push(Edge.of(c.from, c.to, ...c.deps, ...(c.to.bossNode ? [c.to.bossNode] : [])));
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
    chest(item, spawn, chest) {
        if (item instanceof Slot && !(item instanceof Chest) && chest != null) {
            item = item.item;
        }
        if (item instanceof ItemGet) {
            item = item.chest(undefined, chest);
        }
        const chestNode = item;
        const slot = chestNode.objectSlot(this.id, spawn);
        this.chests.push(slot);
        if (slot.itemIndex >= 0x70)
            slot.slotType = 'trap';
        if (!slot.slotName || slot.slotName.endsWith(' chest')) {
            slot.slotName = chestNode.name + ' in ' + this.area.name;
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
    write() {
        if (!this.sells.length)
            return;
        const rom = this.graph.rom;
        if (!rom)
            throw new Error(`Cannot write without a rom`);
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
    shuffleShops(random) {
        const armor = { shops: [], items: [] };
        const tools = { shops: [], items: [] };
        for (const n of this.nodes) {
            if (!(n instanceof Location) || !n.sells.length)
                continue;
            const s = n.sells[0].inventoryRow === 'armor' ? armor : tools;
            s.shops.push(n);
            for (let i = 0; i < 4; i++) {
                s.items.push(n.sells[i] || null);
            }
            n.sells = [];
        }
        random.shuffle(armor.items);
        random.shuffle(tools.items);
        for (const { shops, items } of [armor, tools]) {
            let s = 0;
            while (items.length && s < 100000) {
                const item = items.pop();
                const shop = shops[s++ % shops.length];
                if (!item)
                    continue;
                if (shop.sells.indexOf(item) >= 0 || shop.sells.length >= 4) {
                    items.push(item);
                    continue;
                }
                shop.sells.push(item);
            }
        }
        for (const { shops } of [armor, tools]) {
            for (const shop of shops) {
                shop.sells.sort((a, b) => a.id - b.id);
            }
        }
    }
    integrate({ tracker = false } = {}) {
        const removeConditions = true;
        const removeTriggers = true;
        const removeOptions = true;
        const removeTrackers = !tracker;
        const depgraph = new SparseDependencyGraph(this.nodes.length);
        const connectionsByFrom = [];
        const connectionsByTo = [];
        const connections = new Set();
        const queue = new Map();
        const options = [];
        const trackers = [];
        const conditions = [];
        const triggers = [];
        const items = [];
        const slots = new Set();
        for (const n of this.nodes) {
            if (n instanceof Location) {
                if (n.isStart) {
                    const [route] = depgraph.addRoute([n.uid]);
                    queue.set(route.label, route);
                }
                connectionsByFrom[n.uid] = [];
                connectionsByTo[n.uid] = [];
                for (const c of n.connections) {
                    if (connections.has(c))
                        continue;
                    connections.add(c);
                    if (c.bidi)
                        connections.add(c.reverse());
                }
                for (const c of n.chests) {
                    depgraph.addRoute([c.uid, n.uid]);
                }
                continue;
            }
            if (n instanceof ItemGet && n.name === 'Medical Herb') {
                depgraph.addRoute([n.uid]);
                depgraph.finalize(n.uid);
            }
            if (n instanceof Option)
                options.push(n);
            else if (n instanceof TrackerNode)
                trackers.push(n);
            else if (n instanceof Condition)
                conditions.push(n);
            else if (n instanceof Trigger)
                triggers.push(n);
            else if (n instanceof ItemGet)
                items.push(n);
            else if (n instanceof Slot)
                slots.add(n);
            else if (n instanceof Area)
                (() => { })();
            else
                throw new Error(`Unknown node type: ${n.nodeType}`);
        }
        for (const c of connections) {
            connectionsByFrom[c.from.uid].push(c);
            connectionsByTo[c.to.uid].push(c);
        }
        const integrate = (nodes) => {
            for (const n of nodes) {
                for (const edge of n.edges({ tracker })) {
                    depgraph.addRoute(edge);
                }
                depgraph.finalize(n.uid);
            }
        };
        if (removeOptions)
            integrate(options);
        if (removeTrackers)
            integrate(trackers);
        if (removeTriggers)
            integrate(triggers);
        for (const route of queue.values()) {
            const target = route.target;
            for (const c of connectionsByFrom[target]) {
                const newRoute = [c.to.uid, ...route.deps];
                for (let i = c.deps.length - 1; i >= 0; i--) {
                    newRoute.push(c.deps[i].uid);
                }
                if (c.from.bossNode)
                    newRoute.push(c.from.bossNode.uid);
                for (const r of depgraph.addRoute(newRoute)) {
                    if (!queue.has(r.label))
                        queue.set(r.label, r);
                }
            }
        }
        if (removeConditions)
            integrate(conditions);
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i] instanceof ItemGet
                || this.nodes[i] instanceof TrackerNode)
                continue;
            depgraph.finalize(i);
        }
        const out = new LocationList(this);
        for (const slot of slots) {
            for (const alt of depgraph.nodes[slot.uid].values()) {
                out.addRoute([slot.uid, ...alt]);
            }
        }
        return out;
    }
}
export class LocationList {
    constructor(worldGraph) {
        this.worldGraph = worldGraph;
        this.uidToLocation = [];
        this.locationToUid = [];
        this.uidToItem = [];
        this.itemToUid = [];
        this.routes = [];
        this.unlocks = [];
        this.win = null;
    }
    item(index) {
        return this.worldGraph.nodes[this.itemToUid[index]];
    }
    location(index) {
        return this.worldGraph.nodes[this.locationToUid[index]];
    }
    addRoute(route) {
        let deps = Bits.of();
        let target = -1;
        const unlocks = [];
        for (let i = route.length - 1; i >= 0; i--) {
            const fwd = i ? this.uidToItem : this.uidToLocation;
            const bwd = i ? this.itemToUid : this.locationToUid;
            const n = route[i];
            let index = fwd[n];
            if (index == null) {
                index = bwd.length;
                bwd.push(n);
                fwd[n] = index;
                const node = this.worldGraph.nodes[n];
                if (!i && node instanceof Slot && node.isFixed()) {
                    this.win = index;
                }
            }
            if (i) {
                deps = Bits.with(deps, index);
                unlocks.push(this.unlocks[index] ||
                    (this.unlocks[index] = new Set()));
            }
            else {
                target = index;
            }
        }
        (this.routes[target] || (this.routes[target] = [])).push(deps);
        for (const unlock of unlocks) {
            unlock.add(target);
        }
    }
    canReach(want, has) {
        const target = this.uidToLocation[want.uid];
        const need = this.routes[target];
        for (let i = 0, len = need.length; i < len; i++) {
            if (Bits.containsAll(has, need[i]))
                return true;
        }
        return false;
    }
    traverse(has = Bits.of(), slots = []) {
        has = Bits.clone(has);
        const reachable = new Set();
        const queue = new Set();
        for (let i = 0; i < this.locationToUid.length; i++) {
            queue.add(i);
        }
        for (const n of queue) {
            queue.delete(n);
            if (reachable.has(n))
                continue;
            const needed = this.routes[n];
            for (let i = 0, len = needed.length; i < len; i++) {
                if (!Bits.containsAll(has, needed[i]))
                    continue;
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
        return reachable;
    }
    traverseDepths(slots) {
        let has = Bits.of();
        let depth = 0;
        const depths = [];
        const BOUNDARY = {};
        const queue = new Set();
        for (let i = 0; i < this.locationToUid.length; i++) {
            queue.add(i);
        }
        queue.add(BOUNDARY);
        for (const n of queue) {
            queue.delete(n);
            if (typeof n !== 'number') {
                if (queue.size)
                    queue.add(BOUNDARY);
                depth++;
                continue;
            }
            if (depths[n] != null)
                continue;
            const needed = this.routes[n];
            for (let i = 0, len = needed.length; i < len; i++) {
                if (!Bits.containsAll(has, needed[i]))
                    continue;
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
    toString() {
        const lines = [];
        for (let i = 0; i < this.routes.length; i++) {
            const loc = this.location(i);
            const route = this.routes[i];
            const terms = [];
            for (let j = 0, len = route.length; j < len; j++) {
                const term = [];
                for (const bit of Bits.bits(route[j])) {
                    term.push(this.item(bit));
                }
                terms.push('(' + term.join(' & ') + ')');
            }
            lines.push(`${loc}: ${terms.join(' | ')}`);
        }
        return lines.join('\n');
    }
    assumedFill(random, fits = (slot, item) => true, strategy = FillStrategy) {
        const hasArr = strategy.shuffleItems(this.itemToUid.map(uid => this.worldGraph.nodes[uid]), random);
        let has = Bits.from(hasArr);
        const filling = new Array(this.locationToUid.length).fill(null);
        while (hasArr.length) {
            const bit = hasArr.pop();
            if (!Bits.has(has, bit))
                continue;
            const item = this.item(bit);
            has = Bits.without(has, bit);
            const reachable = [...this.traverse(has, filling)].filter(n => filling[n] == null);
            strategy.shuffleSlots(item, reachable, random);
            let found = false;
            for (const slot of reachable) {
                if (filling[slot] == null &&
                    slot !== this.win &&
                    fits(this.location(slot), item)) {
                    if (slot > 100)
                        throw new Error('Something went horribly wrong');
                    filling[slot] = bit;
                    found = true;
                    break;
                }
            }
            if (!found)
                return null;
        }
        return filling;
    }
}
export const FillStrategy = {
    shuffleSlots: (item, reachable, random) => {
        random.shuffle(reachable);
    },
    shuffleItems: (items, random) => {
        const shuffled = [];
        for (let i = 0; i < items.length; i++) {
            const { shufflePriority = 1 } = items[i];
            for (let j = 0; j < shufflePriority; j++)
                shuffled.push(i);
        }
        random.shuffle(shuffled);
        return shuffled;
    },
};
const write = (rom, address, value) => {
    rom[address] = value;
};
function getFirst(iter) {
    for (const i of iter)
        return i;
    throw new Error('Empty iterable');
}
function setItem(flag, slot) {
    return flag < 0 ? ~(0x200 | slot.itemIndex) : 0x200 | slot.itemIndex;
}
//# sourceMappingURL=nodes.js.map