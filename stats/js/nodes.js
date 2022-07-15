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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvbm9kZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMvQixPQUFPLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQVUscUJBQXFCLEVBQWMsTUFBTSxZQUFZLENBQUM7QUFHekYsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQWVsQyxNQUFNLE9BQU8sV0FBWSxTQUFRLElBQUk7SUFNbkMsWUFBWSxLQUFZLEVBQVcsSUFBcUIsRUFBRSxJQUFZO1FBRXBFLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFGYyxTQUFJLEdBQUosSUFBSSxDQUFpQjtJQU14RCxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1YsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQVFELEtBQUssQ0FBQyxFQUFDLE9BQU8sR0FBRyxLQUFLLEtBQXlCLEVBQUU7UUFHL0MsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDOztBQTFCZSxxQkFBUyxHQUFHLENBQUMsQ0FBQztBQUNkLGtCQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ1gsZ0JBQUksR0FBRyxDQUFDLENBQUM7QUEyQjNCLE1BQU0sT0FBTyxNQUFPLFNBQVEsSUFBSTtJQUM5QixZQUFZLEtBQVksRUFBRSxJQUFZLEVBQVcsS0FBYztRQUM3RCxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRDRCLFVBQUssR0FBTCxLQUFLLENBQVM7SUFFL0QsQ0FBQztJQUVELElBQUksUUFBUTtRQUNWLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLO1FBQ0gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFD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SSxDQUFDLFNBQVMsQ0FBQztBQUN2RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVE9ETyAtIHJlbmFtZSB0byBub2Rlcy5qcyA/XG5cbmltcG9ydCB7Qml0c30gZnJvbSAnLi9iaXRzLmpzJztcbmltcG9ydCB7RWRnZSwgR3JhcGgsIE5vZGUsIE5vZGVJZCwgU3BhcnNlRGVwZW5kZW5jeUdyYXBoLCBTcGFyc2VSb3V0ZX0gZnJvbSAnLi9ncmFwaC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4vcm9tLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuL3JvbS91dGlsLmpzJztcblxuLy8gVE9ETyAtIG1vdmUgdGhlIG9wdGlvbnMgaW50byB0aGVzZSBub2Rlcy4uLj9cbi8vICAtIHRoZW4gdGhlIER0IGZsYWcgd2lsbCBkZXRlcm1pbmUgd2hldGhlciB0byBjb25uZWN0IG9yIG5vdD9cbi8vICAtLS0gb3IgZGl0Y2ggdGhlIGRpc3RpbmN0IG5vZGUgdHlwZXM/XG4vLyAgICAgIHRoZXkgZG8gYmVoYXZlIHNsaWdodGx5IGRpZmZlcmVudGx5LCB0aG8uLi5cbi8vIFdlIGJhc2ljYWxseSBoYXZlIGEgdHJpLXN0YXRlOlxuLy8gICAxLiBpbiB0cmFja2VyIG9yIHRyb2xsIG1vZGUsIHRyYXZlcnNlIGJ1dCBkb24ndCBpbnRlZ3JhdGUgb3V0IC0ga2VlcCB0cmFja1xuLy8gICAyLiBpbiBub3JtYWwgbW9kZSB3aXRoIGdsaXRjaC9oYXJkIGZsYWcgb24sIHRyYXZlcnNlIGFuZCBpbnRlZ3JhdGUgb3V0XG4vLyAgIDMuIGluIG5vcm1hbCBtb2RlIHdpdGggZ2xpdGNoL2hhcmQgZmxhZyBvZmYsIGRvbid0IHRyYXZlcnNlXG4vLyBUaGUgZWRnZXMoKSBtZXRob2QgbmVlZHMgdG8gYmVoYXZlIGRpZmZlcmVudGx5IGRlcGVuZGluZyBvbiB0aGlzLlxuLy8gR2l2ZW4gdGhhdCwgd2UgcHJvYmFibHkgbmVlZCB0byBhY2NlcHQgJ2ZsYWdzJy5cblxudHlwZSBUcmFja2VyTm9kZVR5cGUgPSAxIHwgMiB8IDM7XG5cbmV4cG9ydCBjbGFzcyBUcmFja2VyTm9kZSBleHRlbmRzIE5vZGUge1xuXG4gIHN0YXRpYyByZWFkb25seSBPRkZfUk9VVEUgPSAxO1xuICBzdGF0aWMgcmVhZG9ubHkgR0xJVENIID0gMjtcbiAgc3RhdGljIHJlYWRvbmx5IEhBUkQgPSAzO1xuXG4gIGNvbnN0cnVjdG9yKGdyYXBoOiBHcmFwaCwgcmVhZG9ubHkgdHlwZTogVHJhY2tlck5vZGVUeXBlLCBuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgLy8gLCBvcHRpb24sIG1pc3NpbmcsIHdlaWdodFxuICAgIHN1cGVyKGdyYXBoLCBuYW1lKTsgLy8gKyAnOiAnICsgb3B0aW9uKTtcbiAgICAvLyB0aGlzLm9wdGlvbiA9IG9wdGlvbjtcbiAgICAvLyB0aGlzLm1pc3NpbmcgPSBtaXNzaW5nO1xuICAgIC8vIHRoaXMud2VpZ2h0ID0gd2VpZ2h0O1xuICB9XG5cbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdUcmFja2VyJztcbiAgfVxuXG4gIC8vIE5PVEU6IFRyYWNrZXIgbm9kZXMgYXJlIG9ubHkgZXZlciBjcmVhdGVkIHdoZW4gYSBwYXJ0aWN1bGFyIHJvdXRlXG4gIC8vIGlzIG9mZi1sb2dpYy4gIFNvIGludGVncmF0aW5nIHRoZW0gc2hvdWxkIG1ha2UgdGhlbSBkaXNhcHBlYXJcbiAgLy8gZW50aXJlbHkgYXMgaW1wb3NzaWJsZS4gIFRoZSB0cmFja2VyIGRvZXMgKm5vdCogJ2ludGVncmF0ZSB0aGVtLFxuICAvLyBidXQgcmV0YWlucyB0aGVtIGZvciB0cmFja2luZyBwdXJwb3Nlcy4gIEV2aWwgbW9kZSB3aWxsIHdhbnQgdG9cbiAgLy8gcmV0YWluIHRoZW0gYXMgd2VsbCwgYnV0IHdlJ2xsIGhhdmUgYSBidW5jaCBtb3JlIG5vZGVzIGluIHRoYXRcbiAgLy8gY2FzZSB0byB0cmFjayBtaXNzaW5nIGl0ZW1zLlxuICBlZGdlcyh7dHJhY2tlciA9IGZhbHNlfToge3RyYWNrZXI/OiBib29sZWFufSA9IHt9KTogRWRnZVtdIHtcbiAgICAvLyByZXR1cm4gW107IC8vIHRoaXMub3B0aW9uLnZhbHVlID8gW0VkZ2Uub2YodGhpcyldIDogW107XG4gICAgLy8gcmV0dXJuIHRyYWNrZXIgPyBbXSA6IFtFZGdlLm9mKHRoaXMpXTtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE9wdGlvbiBleHRlbmRzIE5vZGUge1xuICBjb25zdHJ1Y3RvcihncmFwaDogR3JhcGgsIG5hbWU6IHN0cmluZywgcmVhZG9ubHkgdmFsdWU6IGJvb2xlYW4pIHtcbiAgICBzdXBlcihncmFwaCwgbmFtZSk7XG4gIH1cblxuICBnZXQgbm9kZVR5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ09wdGlvbic7XG4gIH1cblxuICBlZGdlcygpOiBFZGdlW10ge1xuICAgIHJldHVybiB0aGlzLnZhbHVlID8gW0VkZ2Uub2YodGhpcyldIDogW107XG4gIH1cbn1cblxudHlwZSBTbG90VHlwZSA9ICdtYWdpYycgfCAnY29uc3VtYWJsZScgfCAndHJhcCcgfCAna2V5JyB8ICdib251cyc7XG5cbmV4cG9ydCBjbGFzcyBTbG90IGV4dGVuZHMgTm9kZSB7XG5cbiAgc2xvdE5hbWU6IHN0cmluZztcbiAgc2xvdEluZGV4OiBudW1iZXI7XG4gIHNsb3RUeXBlOiBTbG90VHlwZTtcbiAgdmFuaWxsYUl0ZW1OYW1lOiBzdHJpbmc7XG4gIGl0ZW1JbmRleDogbnVtYmVyO1xuICByZXF1aXJlc1VuaXF1ZTogYm9vbGVhbiA9IGZhbHNlO1xuICBpc0ludmlzaWJsZTogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKGdyYXBoOiBHcmFwaCxcbiAgICAgICAgICAgICAgbmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICBwdWJsaWMgaXRlbTogSXRlbUdldCxcbiAgICAgICAgICAgICAgaW5kZXg6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgc2xvdHM6ICgocm9tOiBSb20sIHNsb3Q6IFNsb3QpID0+IHZvaWQpW10gPSBbXSkge1xuICAgIHN1cGVyKGdyYXBoLCBuYW1lKTtcbiAgICAvLyBJbmZvcm1hdGlvbiBhYm91dCB0aGUgc2xvdCBpdHNlbGZcbiAgICB0aGlzLnNsb3ROYW1lID0gbmFtZTtcbiAgICB0aGlzLnNsb3RJbmRleCA9IGluZGV4O1xuICAgIHRoaXMuc2xvdFR5cGUgPSBpdGVtIGluc3RhbmNlb2YgTWFnaWMgPyAnbWFnaWMnIDogJ2NvbnN1bWFibGUnO1xuICAgIHRoaXMudmFuaWxsYUl0ZW1OYW1lID0gaXRlbS5uYW1lO1xuICAgIC8vIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IGl0ZW0gKGlmIGFueSlcbiAgICB0aGlzLml0ZW1JbmRleCA9IGluZGV4O1xuICB9XG5cbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdTbG90JztcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3N1cGVyLnRvU3RyaW5nKCl9IFske3RoaXMudmFuaWxsYUl0ZW1OYW1lfSAkJHtcbiAgICAgICAgICAgIHRoaXMuc2xvdEluZGV4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpfV1gO1xuICB9XG5cbiAgZWRnZXMoKTogRWRnZVtdIHtcbiAgICByZXR1cm4gdGhpcy5pdGVtICE9IG51bGwgJiYgdGhpcy5pdGVtSW5kZXggIT0gbnVsbCA/XG4gICAgICAgIFtFZGdlLm9mKHRoaXMuaXRlbSwgdGhpcyldIDogW107XG4gIH1cblxuICBpc0ZpeGVkKCk6IGJvb2xlYW4geyByZXR1cm4gZmFsc2U7IH1cblxuICBpc01pbWljKCk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5pdGVtSW5kZXggPj0gMHg3MDsgfVxuXG4gIHJlcXVpcmVVbmlxdWUoKTogdGhpcyB7XG4gICAgdGhpcy5yZXF1aXJlc1VuaXF1ZSA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBjYW5Ib2xkTWltaWMoKTogYm9vbGVhbiB7XG4gICAgLy8gTk9URTogYm9zcyBkcm9wcyBjYW5ub3QgaG9sZCBtaW1pY3MgYmVjYXVzZSB0aGV5IGNhdXNlIGJvc3MgcmVzcGF3bi5cbiAgICByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIENoZXN0ICYmICF0aGlzLmlzSW52aXNpYmxlO1xuICB9XG5cbiAgbmVlZHNDaGVzdCgpOiBib29sZWFuIHtcbiAgICBjb25zdCBpID0gdGhpcy5pdGVtSW5kZXg7XG4gICAgLy8gTk9URTogaWYgYWxhcm0gZmx1dGUgZ29lcyBpbiAzcmQgcm93LCAweDMxIHNob3VsZCBnbyBhd2F5LlxuICAgIHJldHVybiBpID49IDB4MGQgJiYgaSA8PSAweDI0IHx8XG4gICAgICAgIGkgPT09IDB4MjYgfHxcbiAgICAgICAgLy8gaSA9PT0gMHgyOCB8fFxuICAgICAgICAvLyBpID09PSAweDMxIHx8XG4gICAgICAgIGkgPiAweDQ4O1xuICB9XG5cbiAgaXNDaGVzdCgpOiBib29sZWFuIHtcbiAgICAvLyBPbmx5IGNoZXN0cyBjYW4gaG9sZCBjb25zdW1hYmxlcyAodW5sZXNzIHdlIG92ZXJyaWRlIHdpdGggYSBmbGFnKS5cbiAgICAvLyBSYWdlIGlzIG5vdCBhIGNoZXN0LlxuICAgIHJldHVybiAodGhpcyBpbnN0YW5jZW9mIENoZXN0IHx8IHRoaXMgaW5zdGFuY2VvZiBCb3NzRHJvcCkgJiZcbiAgICAgICAgdGhpcy5zbG90SW5kZXggIT09IDB4MDk7XG4gIH1cblxuICBnZXQgbmFtZTIoKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy5pdGVtLm5hbWUgPT09IHRoaXMudmFuaWxsYUl0ZW1OYW1lKSByZXR1cm4gdGhpcy5uYW1lO1xuICAgIHJldHVybiBgJHt0aGlzLml0ZW0ubmFtZX0gWyR7dGhpcy52YW5pbGxhSXRlbU5hbWV9XWA7XG4gIH1cblxuICBzZXQoaXRlbTogSXRlbUdldCwgaW5kZXg6IG51bWJlcik6IHZvaWQge1xuICAgIC8vIE5PVEU6IHdlIGNhbid0IGp1c3QgdXNlIGl0ZW0uaW5kZXggYmVjYXVzZSByZXBlYXRlZFxuICAgIC8vIGl0ZW1zIG5lZWQgc2VwYXJhdGUgaW5kaWNlcyBidXQgd2UgZG9uJ3QgbWFrZSBleHRyYVxuICAgIC8vIEl0ZW0gbm9kZXMgZm9yIHRoZW0uXG4gICAgdGhpcy5pdGVtID0gaXRlbTtcbiAgICB0aGlzLml0ZW1JbmRleCA9IGluZGV4O1xuICB9XG5cbiAgd3JpdGUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnNsb3RzKSByZXR1cm47XG4gICAgY29uc3Qgcm9tID0gdGhpcy5ncmFwaC5yb207XG4gICAgaWYgKHJvbSkge1xuICAgICAgZm9yIChjb25zdCBzbG90IG9mIHRoaXMuc2xvdHMpIHtcbiAgICAgICAgLy8gVE9ETyAtIG5vdCBjbGVhciB3aGVyZSB0byB3cml0ZSB0aGlzLlxuICAgICAgICBzbG90KHJvbSwgdGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3dhcChvdGhlcjogU2xvdCk6IHZvaWQge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW07XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLml0ZW1JbmRleDtcbiAgICB0aGlzLnNldChvdGhlci5pdGVtLCBvdGhlci5pdGVtSW5kZXgpO1xuICAgIG90aGVyLnNldChpdGVtLCBpbmRleCk7XG4gIH1cblxuICBrZXkoKTogdGhpcyB7XG4gICAgdGhpcy5zbG90VHlwZSA9ICdrZXknO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYm9udXMoKTogdGhpcyB7XG4gICAgdGhpcy5zbG90VHlwZSA9ICdib251cyc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBkaXJlY3QoYWRkcmVzczogbnVtYmVyKTogdGhpcyB7XG4gICAgLy8gc2xvdCBpcyB1c3VhbGx5ICd0aGlzJyBmb3IgdGhlIFNsb3Qgb2JqZWN0IHRoYXQgb3ducyB0aGlzLlxuICAgIHRoaXMuc2xvdHMucHVzaCgocm9tLCBzbG90KSA9PiB7XG4gICAgICB3cml0ZShyb20ucHJnLCBhZGRyZXNzLCBzbG90Lml0ZW1JbmRleCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgJHt0aGlzLm5hbWUyfTogJHthZGRyLnRvU3RyaW5nKDE2KX0gPC0gJHtcbiAgICAgIC8vICAgICAgICAgICAgICBzbG90LmluZGV4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLDApfWApO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZnJvbVBlcnNvbihuYW1lOiBzdHJpbmcsIHBlcnNvbklkOiBudW1iZXIsIG9mZnNldDogbnVtYmVyID0gMCk6IHRoaXMge1xuICAgIHRoaXMuc2xvdHMucHVzaCgocm9tLCBzbG90KSA9PiB7XG4gICAgICByb20ubnBjc1twZXJzb25JZF0uZGF0YVtvZmZzZXRdID0gc2xvdC5pdGVtSW5kZXg7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBucGNTcGF3bihpZDogbnVtYmVyLCBsb2NhdGlvbj86IG51bWJlciwgb2Zmc2V0OiBudW1iZXIgPSAwKTogdGhpcyB7XG4gICAgdGhpcy5zbG90cy5wdXNoKChyb20sIHNsb3QpID0+IHtcbiAgICAgIGNvbnN0IHNwYXducyA9IHJvbS5ucGNzW2lkXS5zcGF3bkNvbmRpdGlvbnM7XG4gICAgICBpZiAobG9jYXRpb24gPT0gbnVsbCkgbG9jYXRpb24gPSBnZXRGaXJzdChzcGF3bnMua2V5cygpKTtcbiAgICAgIGNvbnN0IHNwYXduID0gc3Bhd25zLmdldChsb2NhdGlvbik7XG4gICAgICBpZiAoIXNwYXduKSB0aHJvdyBuZXcgRXJyb3IoYE5vIHNwYXduIGZvdW5kIGZvciBOUEMgJCR7aGV4KGlkKX0gQCAkJHtoZXgobG9jYXRpb24pfWApO1xuICAgICAgc3Bhd25bb2Zmc2V0XSA9IHNldEl0ZW0oc3Bhd25bb2Zmc2V0XSwgc2xvdCk7IC8vIDB4MjAwIHwgc2xvdC5pdGVtSW5kZXg7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBUT0RPIC0gYmV0dGVyIG1hdGNoaW5nLCBlLmcuIHdoaWNoIGNvbmRpdGlvbiB0byByZXBsYWNlP1xuXG4gIGRpYWxvZyhpZDogbnVtYmVyLFxuICAgICAgICAgbG9jYXRpb24/OiBudW1iZXIsIG9mZnNldDogbnVtYmVyID0gMCwgcmVzdWx0PzogbnVtYmVyKTogdGhpcyB7XG4gICAgdGhpcy5zbG90cy5wdXNoKChyb20sIHNsb3QpID0+IHtcbiAgICAgIGNvbnN0IGFsbERpYWxvZ3MgPSByb20ubnBjc1tpZF0ubG9jYWxEaWFsb2dzO1xuICAgICAgaWYgKGxvY2F0aW9uID09IG51bGwpIGxvY2F0aW9uID0gZ2V0Rmlyc3QoYWxsRGlhbG9ncy5rZXlzKCkpO1xuICAgICAgY29uc3QgZGlhbG9ncyA9IGFsbERpYWxvZ3MuZ2V0KGxvY2F0aW9uKTtcbiAgICAgIGlmICghZGlhbG9ncykgdGhyb3cgbmV3IEVycm9yKGBObyBkaWFsb2cgZm91bmQgZm9yIE5QQyAkJHtoZXgoaWQpfSBAICQke2hleChsb2NhdGlvbil9YCk7XG4gICAgICBjb25zdCBkaWFsb2cgPSBkaWFsb2dzW29mZnNldF07XG4gICAgICBpZiAoIWRpYWxvZykgdGhyb3cgbmV3IEVycm9yKGBObyBzdWNoIGRpYWxvZyAke29mZnNldH1gKTtcbiAgICAgIGlmIChyZXN1bHQgPT0gbnVsbCkge1xuICAgICAgICBkaWFsb2cuY29uZGl0aW9uID0gc2V0SXRlbShkaWFsb2cuY29uZGl0aW9uLCBzbG90KTsgLy8gMHgyMDAgfCBzbG90Lml0ZW1JbmRleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRpYWxvZy5mbGFnc1tyZXN1bHRdID0gc2V0SXRlbShkaWFsb2cuZmxhZ3NbcmVzdWx0XSwgc2xvdCk7IC8vIDB4MjAwIHwgc2xvdC5pdGVtSW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB0cmlnZ2VyKGlkOiBudW1iZXIsIG9mZnNldDogbnVtYmVyID0gMCwgcmVzdWx0PzogbnVtYmVyKTogdGhpcyB7XG4gICAgdGhpcy5zbG90cy5wdXNoKChyb20sIHNsb3QpID0+IHtcbiAgICAgIGNvbnN0IHRyaWdnZXIgPSByb20udHJpZ2dlcnNbaWQgJiAweDdmXTtcbiAgICAgIGlmIChyZXN1bHQgPT0gbnVsbCkge1xuICAgICAgICB0cmlnZ2VyLmNvbmRpdGlvbnNbb2Zmc2V0XSA9IHNldEl0ZW0odHJpZ2dlci5jb25kaXRpb25zW29mZnNldF0sIHNsb3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJpZ2dlci5mbGFnc1tyZXN1bHRdID0gc2V0SXRlbSh0cmlnZ2VyLmZsYWdzW3Jlc3VsdF0sIHNsb3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGaXhlZFNsb3QgZXh0ZW5kcyBTbG90IHtcbiAgaXNGaXhlZCgpOiBib29sZWFuIHsgcmV0dXJuIHRydWU7IH1cbn1cblxuZXhwb3J0IGNsYXNzIEJvc3NEcm9wIGV4dGVuZHMgU2xvdCB7XG4gIGdldCBub2RlVHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnQm9zc0Ryb3AnO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDaGVzdCBleHRlbmRzIFNsb3Qge1xuXG4gIHNwYXduU2xvdDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gIGlzSW52aXNpYmxlOiBib29sZWFuID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoZ3JhcGg6IEdyYXBoLCBuYW1lOiBzdHJpbmcsIGl0ZW06IEl0ZW1HZXQsIGluZGV4OiBudW1iZXIpIHtcbiAgICBzdXBlcihncmFwaCwgbmFtZSwgaXRlbSwgaW5kZXgpO1xuICB9XG5cbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdDaGVzdCc7XG4gIH1cblxuICBvYmplY3RTbG90KGxvYzogbnVtYmVyLCBzcGF3blNsb3Q6IG51bWJlcikge1xuICAgIHRoaXMuc3Bhd25TbG90ID0gc3Bhd25TbG90O1xuICAgIHRoaXMuc2xvdHMucHVzaCgocm9tLCBzbG90KSA9PiB7XG4gICAgICBjb25zdCBsb2NhdGlvbiA9IHJvbS5sb2NhdGlvbnNbbG9jXTtcbiAgICAgIGlmICghbG9jYXRpb24gfHwgIWxvY2F0aW9uLnVzZWQpIHRocm93IG5ldyBFcnJvcihgTm8gc3VjaCBsb2NhdGlvbjogJCR7aGV4KGxvYyl9YCk7XG4gICAgICBjb25zdCBzcGF3biA9IGxvY2F0aW9uLnNwYXduc1tzcGF3blNsb3QgLSAweDBkXTtcbiAgICAgIGlmICghc3Bhd24gfHwgIXNwYXduLmlzQ2hlc3QoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGNoZXN0ICQke2hleChzcGF3blNsb3QpfSBvbiAkJHtoZXgobG9jKX1gKTtcbiAgICAgIH1cbiAgICAgIC8vIE5PVEU6IHZhbmlsbGEgbWltaWNzIGFyZSB0aW1lciBzcGF3bnMsIGJ1dCB0aGF0IGRvZXNuJ3Qgd29yayBhcyB3ZWxsIGZvciB1cy5cbiAgICAgIHNwYXduLnRpbWVkID0gZmFsc2U7XG4gICAgICBzcGF3bi5pZCA9IE1hdGgubWluKHNsb3QuaXRlbUluZGV4LCAweDcwKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGludmlzaWJsZShhZGRyZXNzOiBudW1iZXIpIHtcbiAgICB0aGlzLmlzSW52aXNpYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5kaXJlY3QoYWRkcmVzcyk7XG4gIH1cbn1cblxudHlwZSBJbnZlbnRvcnlSb3cgPSAnYXJtb3InIHwgJ2NvbnN1bWFibGUnIHwgJ3VuaXF1ZSc7XG5cbmV4cG9ydCBjbGFzcyBJdGVtR2V0IGV4dGVuZHMgTm9kZSB7XG5cbiAgc2h1ZmZsZVByaW9yaXR5OiBudW1iZXIgPSAxO1xuICBpbnZlbnRvcnlSb3c6IEludmVudG9yeVJvdyA9ICd1bmlxdWUnO1xuXG4gIGNvbnN0cnVjdG9yKGdyYXBoOiBHcmFwaCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgaWQ6IG51bWJlcixcbiAgICAgICAgICAgICAgbmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoZ3JhcGgsIG5hbWUpO1xuICB9XG5cbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdJdGVtR2V0JztcbiAgfVxuXG4gIGNoZXN0KG5hbWU6IHN0cmluZyA9IHRoaXMubmFtZSArICcgY2hlc3QnLCBpbmRleDogbnVtYmVyID0gdGhpcy5pZCk6IENoZXN0IHtcbiAgICByZXR1cm4gbmV3IENoZXN0KHRoaXMuZ3JhcGgsIG5hbWUsIHRoaXMsIGluZGV4KTtcbiAgfVxuXG4gIGZyb21QZXJzb24obmFtZTogc3RyaW5nLCBwZXJzb25JZDogbnVtYmVyLCBvZmZzZXQ6IG51bWJlciA9IDApOiBTbG90IHtcbiAgICByZXR1cm4gbmV3IFNsb3QodGhpcy5ncmFwaCwgbmFtZSwgdGhpcywgdGhpcy5pZCwgWyhyb20sIHNsb3QpID0+IHtcbiAgICAgIHJvbS5ucGNzW3BlcnNvbklkXS5kYXRhW29mZnNldF0gPSBzbG90Lml0ZW1JbmRleDtcbiAgICB9XSk7XG4gIH1cblxuICBib3NzRHJvcChuYW1lOiBzdHJpbmcsIGJvc3NJZDogbnVtYmVyLCBpdGVtR2V0SW5kZXg6IG51bWJlciA9IHRoaXMuaWQpOiBCb3NzRHJvcCB7XG4gICAgcmV0dXJuIG5ldyBCb3NzRHJvcCh0aGlzLmdyYXBoLCBuYW1lLCB0aGlzLCBpdGVtR2V0SW5kZXgsIFsocm9tLCBzbG90KSA9PiB7XG4gICAgICByb20uYm9zc0tpbGxzW2Jvc3NJZF0uaXRlbURyb3AgPSBzbG90Lml0ZW1JbmRleDtcbiAgICB9XSk7XG4gIH1cblxuICBkaXJlY3QobmFtZTogc3RyaW5nLCBhOiBudW1iZXIpOiBTbG90IHtcbiAgICByZXR1cm4gbmV3IFNsb3QodGhpcy5ncmFwaCwgbmFtZSwgdGhpcywgdGhpcy5pZCwgWyhyb20sIHNsb3QpID0+IHtcbiAgICAgIHdyaXRlKHJvbS5wcmcsIGEsIHNsb3QuaXRlbUluZGV4KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGAke3RoaXMubmFtZSA9PSBzbG90Lm5hbWUgPyB0aGlzLm5hbWUgOiBgJHtzbG90Lm5hbWV9ICgke1xuICAgICAgLy8gICAgICAgICAgICAgIHRoaXMubmFtZX0pYH06ICR7YS50b1N0cmluZygxNil9IDwtICR7XG4gICAgICAvLyAgICAgICAgICAgICAgc2xvdC5pbmRleC50b1N0cmluZygxNikucGFkU3RhcnQoMiwwKX1gKTtcbiAgICB9XSk7XG4gIH1cblxuICBmaXhlZCgpOiBTbG90IHtcbiAgICByZXR1cm4gbmV3IEZpeGVkU2xvdCh0aGlzLmdyYXBoLCB0aGlzLm5hbWUsIHRoaXMsIHRoaXMuaWQpO1xuICB9XG5cbiAgd2VpZ2h0KHc6IG51bWJlcik6IHRoaXMge1xuICAgIHRoaXMuc2h1ZmZsZVByaW9yaXR5ID0gdztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGNvbnN1bWFibGUoKTogdGhpcyB7XG4gICAgdGhpcy5pbnZlbnRvcnlSb3cgPSAnY29uc3VtYWJsZSc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBhcm1vcigpOiB0aGlzIHtcbiAgICB0aGlzLmludmVudG9yeVJvdyA9ICdhcm1vcic7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBJdGVtR2V0IHtcbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdJdGVtJztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTWFnaWMgZXh0ZW5kcyBJdGVtR2V0IHtcbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdNYWdpYyc7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRyaWdnZXIgZXh0ZW5kcyBOb2RlIHtcblxuICBzbG90OiBTbG90IHwgbnVsbCA9IG51bGw7XG4gIHJlYWRvbmx5IHJlcXM6IEVkZ2VbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGdyYXBoOiBHcmFwaCwgbmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoZ3JhcGgsIG5hbWUpO1xuICB9XG5cbiAgZ2V0IG5vZGVUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICdUcmlnZ2VyJztcbiAgfVxuXG4gIGVkZ2VzKCk6IEVkZ2VbXSB7XG4gICAgY29uc3Qgb3V0ID0gWy4uLnRoaXMucmVxc107XG4gICAgaWYgKHRoaXMuc2xvdCkgb3V0LnB1c2goRWRnZS5vZih0aGlzLnNsb3QsIHRoaXMpKTtcbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgZ2V0KHNsb3Q6IFNsb3QpOiB0aGlzIHtcbiAgICBpZiAodGhpcy5zbG90KSB0aHJvdyBuZXcgRXJyb3IoJ2FscmVhZHkgaGF2ZSBhIHNsb3QnKTtcbiAgICB0aGlzLnNsb3QgPSBzbG90O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG5cbi8vIC8vIFRPRE8gLSBtb3ZlIHRoZXNlIHRvIGp1c3QgZG8gZGlyZWN0IGJ5dGUgbWFuaXB1bGF0aW9uIG1heWJlP1xuLy8gLy8gICAgICAtIGFkZCBQZXJzb25EYXRhLCBEaWFsb2csIE5wY1NwYXduLCBldGMuLi5cbi8vIGNvbnN0IGZyb21OcGMgPSAoaWQsIG9mZnNldCA9IDApID0+IChyb20sIGluZGV4KSA9PiB7XG4vLyAgIHJvbS5wcmdbcm9tLm5wY3NbaWRdLmJhc2UgKyBvZmZzZXRdID0gaW5kZXg7XG4vLyB9O1xuLy8gY29uc3QgZGlyZWN0UHJnID0gKGFkZHJlc3MpID0+IChyb20sIGluZGV4KSA9PiB7XG4vLyAgIHJvbS5wcmdbYWRkcmVzc10gPSBpbmRleDtcbi8vIH07XG4vLyBjb25zdCBjaGVzdCA9IChjaGVzdCkgPT4gKHJvbSwgaW5kZXgpID0+IHtcbi8vICAgcm9tLmxvY2F0aW9uc1tsb2NhdGlvbl0ub2JqZWN0c1tzbG90IC0gMHhkXVszXSA9IGluZGV4O1xuLy8gfTtcblxuZXhwb3J0IGNsYXNzIENvbmRpdGlvbiBleHRlbmRzIE5vZGUge1xuXG4gIHJlYWRvbmx5IG9wdGlvbnM6IE5vZGVbXVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoZ3JhcGg6IEdyYXBoLCBuYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihncmFwaCwgbmFtZSk7XG4gIH1cblxuICBnZXQgbm9kZVR5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0NvbmRpdGlvbic7XG4gIH1cblxuICBlZGdlcygpOiBFZGdlW10ge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMubWFwKChvcHQpID0+IEVkZ2Uub2YodGhpcywgLi4ub3B0KSk7XG4gIH1cblxuICBvcHRpb24oLi4uZGVwczogTm9kZVtdKTogdGhpcyB7XG4gICAgdGhpcy5vcHRpb25zLnB1c2goZGVwcy5tYXAoeCA9PiB4IGluc3RhbmNlb2YgU2xvdCA/IHguaXRlbSA6IHgpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQm9zcyBleHRlbmRzIFRyaWdnZXIge1xuXG4gIHJlYWRvbmx5IGRlcHM6IE5vZGVbXTtcblxuICBjb25zdHJ1Y3RvcihncmFwaDogR3JhcGgsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGluZGV4OiBudW1iZXIsXG4gICAgICAgICAgICAgIG5hbWU6IHN0cmluZyxcbiAgICAgICAgICAgICAgLi4uZGVwczogTm9kZVtdKSB7XG4gICAgc3VwZXIoZ3JhcGgsIG5hbWUpO1xuICAgIHRoaXMuZGVwcyA9IGRlcHMubWFwKHggPT4geCBpbnN0YW5jZW9mIFNsb3QgPyB4Lml0ZW0gOiB4KTtcbiAgfVxuXG4gIGdldCBub2RlVHlwZSgpIHtcbiAgICByZXR1cm4gJ0Jvc3MnO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBcmVhIGV4dGVuZHMgTm9kZSB7XG4gIGdldCBub2RlVHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiAnQXJlYSc7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbm5lY3Rpb24ge1xuXG4gIHJlYWRvbmx5IGRlcHM6IE5vZGVbXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBmcm9tOiBMb2NhdGlvbixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgdG86IExvY2F0aW9uLFxuICAgICAgICAgICAgICByZWFkb25seSBiaWRpOiBib29sZWFuID0gZmFsc2UsXG4gICAgICAgICAgICAgIGRlcHM6IE5vZGVbXSA9IFtdKSB7XG4gICAgdGhpcy5kZXBzID0gZGVwcy5tYXAoeCA9PiB4IGluc3RhbmNlb2YgU2xvdCA/IHguaXRlbSA6IHgpO1xuICB9XG5cbiAgcmV2ZXJzZSgpOiBDb25uZWN0aW9uIHtcbiAgICByZXR1cm4gbmV3IENvbm5lY3Rpb24odGhpcy50bywgdGhpcy5mcm9tLCB0aGlzLmJpZGksIHRoaXMuZGVwcyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIExvY2F0aW9uIGV4dGVuZHMgTm9kZSB7XG5cbiAgcmVhZG9ubHkgc2ltcGxlTmFtZTogc3RyaW5nO1xuICByZWFkb25seSBjb25uZWN0aW9uczogQ29ubmVjdGlvbltdID0gW107XG4gIHJlYWRvbmx5IGNoZXN0czogQ2hlc3RbXSA9IFtdO1xuICBib3NzTm9kZTogQm9zcyB8IG51bGwgPSBudWxsO1xuICB0eXBlOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgaXNTdGFydDogYm9vbGVhbiA9IGZhbHNlO1xuICBpc0VuZDogYm9vbGVhbiA9IGZhbHNlO1xuICBzZWxsczogSXRlbVtdID0gW107XG5cbiAgY29uc3RydWN0b3IoZ3JhcGg6IEdyYXBoLFxuICAgICAgICAgICAgICByZWFkb25seSBpZDogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBhcmVhOiBBcmVhLFxuICAgICAgICAgICAgICBuYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcihncmFwaCwgYXJlYS5uYW1lICsgJzogJyArIG5hbWUpO1xuICAgIHRoaXMuc2ltcGxlTmFtZSA9IG5hbWU7XG4gIH1cblxuICBnZXQgbm9kZVR5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ0xvY2F0aW9uJztcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBMb2NhdGlvbiAke3RoaXMuaWQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJyl9ICR7dGhpcy5uYW1lfWA7XG4gIH1cblxuICBlZGdlcygpOiBFZGdlW10ge1xuICAgIGNvbnN0IG91dCA9IFtdO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLmNvbm5lY3Rpb25zKSB7XG4gICAgICBvdXQucHVzaChFZGdlLm9mKGMudG8sIGMuZnJvbSwgLi4uYy5kZXBzLCAuLi4oYy5mcm9tLmJvc3NOb2RlID8gW2MuZnJvbS5ib3NzTm9kZV0gOiBbXSkpKTtcbiAgICAgIGlmIChjLmJpZGkpIG91dC5wdXNoKEVkZ2Uub2YoYy5mcm9tLCBjLnRvLCAuLi5jLmRlcHMsIC4uLihjLnRvLmJvc3NOb2RlID8gW2MudG8uYm9zc05vZGVdIDogW10pKSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLmNoZXN0cykge1xuICAgICAgb3V0LnB1c2goRWRnZS5vZihjLCB0aGlzKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzU3RhcnQpIHtcbiAgICAgIG91dC5wdXNoKEVkZ2Uub2YodGhpcykpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgYWRkQ29ubmVjdGlvbihjOiBDb25uZWN0aW9uKTogdGhpcyB7XG4gICAgYy5mcm9tLmNvbm5lY3Rpb25zLnB1c2goYyk7XG4gICAgYy50by5jb25uZWN0aW9ucy5wdXNoKGMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZnJvbShsb2NhdGlvbjogTG9jYXRpb24sIC4uLmRlcHM6IE5vZGVbXSk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLmFkZENvbm5lY3Rpb24obmV3IENvbm5lY3Rpb24obG9jYXRpb24sIHRoaXMsIGZhbHNlLCBkZXBzKSk7XG4gIH1cblxuICB0byhsb2NhdGlvbjogTG9jYXRpb24sIC4uLmRlcHM6IE5vZGVbXSk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLmFkZENvbm5lY3Rpb24obmV3IENvbm5lY3Rpb24odGhpcywgbG9jYXRpb24sIGZhbHNlLCBkZXBzKSk7XG4gIH1cblxuICBjb25uZWN0KGxvY2F0aW9uOiBMb2NhdGlvbiwgLi4uZGVwczogTm9kZVtdKTogdGhpcyB7XG4gICAgcmV0dXJuIHRoaXMuYWRkQ29ubmVjdGlvbihuZXcgQ29ubmVjdGlvbihsb2NhdGlvbiwgdGhpcywgdHJ1ZSwgZGVwcykpO1xuICB9XG5cbiAgY29ubmVjdFRvKGxvY2F0aW9uOiBMb2NhdGlvbiwgLi4uZGVwczogTm9kZVtdKTogdGhpcyB7XG4gICAgcmV0dXJuIHRoaXMuYWRkQ29ubmVjdGlvbihuZXcgQ29ubmVjdGlvbih0aGlzLCBsb2NhdGlvbiwgdHJ1ZSwgZGVwcykpO1xuICB9XG5cbiAgY2hlc3QoaXRlbTogSXRlbUdldCB8IFNsb3QsIHNwYXduOiBudW1iZXIsIGNoZXN0PzogbnVtYmVyKTogdGhpcyB7XG4gICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBTbG90ICYmICEoaXRlbSBpbnN0YW5jZW9mIENoZXN0KSAmJiBjaGVzdCAhPSBudWxsKSB7XG4gICAgICAvLyBDb25zaWRlciBtYWtpbmcgdGhpcyBhbiBlcnJvcj9cbiAgICAgIGl0ZW0gPSBpdGVtLml0ZW07XG4gICAgfVxuICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSXRlbUdldCkge1xuICAgICAgaXRlbSA9IGl0ZW0uY2hlc3QodW5kZWZpbmVkLCBjaGVzdCk7XG4gICAgfVxuICAgIGNvbnN0IGNoZXN0Tm9kZSA9IGl0ZW0gYXMgQ2hlc3Q7XG4gICAgY29uc3Qgc2xvdCA9IGNoZXN0Tm9kZS5vYmplY3RTbG90KHRoaXMuaWQsIHNwYXduKTtcbiAgICB0aGlzLmNoZXN0cy5wdXNoKHNsb3QpO1xuICAgIGlmIChzbG90Lml0ZW1JbmRleCA+PSAweDcwKSBzbG90LnNsb3RUeXBlID0gJ3RyYXAnO1xuICAgIGlmICghc2xvdC5zbG90TmFtZSB8fCBzbG90LnNsb3ROYW1lLmVuZHNXaXRoKCcgY2hlc3QnKSkge1xuICAgICAgc2xvdC5zbG90TmFtZSA9IGNoZXN0Tm9kZS5uYW1lICsgJyBpbiAnICsgdGhpcy5hcmVhLm5hbWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdHJpZ2dlcih0cmlnZ2VyOiBUcmlnZ2VyLCAuLi5kZXBzOiBOb2RlW10pOiB0aGlzIHtcbiAgICBkZXBzID0gZGVwcy5tYXAobiA9PiBuIGluc3RhbmNlb2YgU2xvdCA/IG4uaXRlbSA6IG4pO1xuICAgIHRyaWdnZXIucmVxcy5wdXNoKEVkZ2Uub2YodHJpZ2dlciwgdGhpcywgLi4uZGVwcykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYm9zcyhib3NzOiBCb3NzKTogdGhpcyB7XG4gICAgdGhpcy5ib3NzTm9kZSA9IGJvc3M7XG4gICAgYm9zcy5yZXFzLnB1c2goRWRnZS5vZihib3NzLCB0aGlzLCAuLi5ib3NzLmRlcHMpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIExvY2F0aW9uIHR5cGVzIC0gYmFzaWMgaWRlYSB3b3VsZCBiZSB0byBsZWF2ZSBtaXNjIGFsb25lLCBidXQgb3RoZXJ3aXNlXG4gIC8vIHNodWZmbGUgYW1vbmcgYXJlYXMgb2YgdGhlIHNhbWUgdHlwZS4gIFdlIGNvdWxkIG1peCBjYXZlcyBhbmQgZm9ydHJlc3Nlc1xuICAvLyBpZiByZWxldmFudCwgYXMgd2VsbCBhcyBzZWEgYW5kIG92ZXJ3b3JsZC4gIFdlIHNob3VsZCBtYXJrIGVhY2ggY29ubmVjdGlvblxuICAvLyB3aXRoIGEgdmFsdWUgaW5kaWNhdGluZyB0aGUgdGhyZXNob2xkIGZvciBzaHVmZmxpbmcgaXQgLSAxID0gYWx3YXlzIHNodWZmbGUsXG4gIC8vIDIgPSBtZWRpdW0sIDMgPSBjcmF6eSAoZS5nLiBzaHVmZmxlIGFsbCBleGl0cykuXG4gIG92ZXJ3b3JsZCgpOiB0aGlzIHtcbiAgICB0aGlzLnR5cGUgPSAnb3ZlcndvcmxkJztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRvd24oKTogdGhpcyB7XG4gICAgdGhpcy50eXBlID0gJ3Rvd24nO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgY2F2ZSgpOiB0aGlzIHtcbiAgICB0aGlzLnR5cGUgPSAnY2F2ZSc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZWEoKTogdGhpcyB7XG4gICAgdGhpcy50eXBlID0gJ3NlYSc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBmb3J0cmVzcygpOiB0aGlzIHtcbiAgICB0aGlzLnR5cGUgPSAnZm9ydHJlc3MnO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaG91c2UoKTogdGhpcyB7XG4gICAgdGhpcy50eXBlID0gJ2hvdXNlJztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNob3AoLi4uaXRlbXM6IChJdGVtIHwgU2xvdClbXSk6IHRoaXMge1xuICAgIHRoaXMudHlwZSA9ICdob3VzZSc7XG4gICAgdGhpcy5zZWxscyA9IGl0ZW1zLm1hcCh4ID0+IHggaW5zdGFuY2VvZiBTbG90ID8geC5pdGVtIGFzIEl0ZW0gOiB4KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG1pc2MoKTogdGhpcyB7XG4gICAgdGhpcy50eXBlID0gJ21pc2MnO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc3RhcnQoKTogdGhpcyB7XG4gICAgdGhpcy5pc1N0YXJ0ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGVuZCgpOiB0aGlzIHtcbiAgICB0aGlzLmlzRW5kID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGZ1bGxOYW1lKCk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBbdGhpcy5zaW1wbGVOYW1lXTtcbiAgICBpZiAodGhpcy5ib3NzTm9kZSkge1xuICAgICAgbGluZXMucHVzaCh0aGlzLmJvc3NOb2RlLm5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gbGluZXMuam9pbignXFxcXG4nKTtcbiAgfVxuXG4gIHdyaXRlKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5zZWxscy5sZW5ndGgpIHJldHVybjtcbiAgICAvLyBXcml0ZSBzaG9wIGNvbnRlbnRzLCBpZ25vcmUgcHJpY2VzIGZvciBub3cuXG4gICAgLy8gTGF0ZXIgbWF5YmUgaGF2ZSBtb2RlIGZvciBzaHVmZmxlIGJ1dCBub3QgcmVub3JtYWxpemU/XG4gICAgY29uc3Qgcm9tID0gdGhpcy5ncmFwaC5yb207XG4gICAgaWYgKCFyb20pIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHdyaXRlIHdpdGhvdXQgYSByb21gKTtcbiAgICBmb3IgKGNvbnN0IHNob3Agb2Ygcm9tLnNob3BzKSB7XG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gdGhpcy5pZCkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICAgIHNob3AuY29udGVudHNbaV0gPSB0aGlzLnNlbGxzW2ldID8gdGhpcy5zZWxsc1tpXS5pZCA6IDB4ZmY7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFdvcmxkR3JhcGggZXh0ZW5kcyBHcmFwaCB7XG5cbiAgd3JpdGUoKSB7XG4gICAgZm9yIChjb25zdCBuIG9mIHRoaXMubm9kZXMpIHtcbiAgICAgIG4ud3JpdGUoKTtcbiAgICB9XG4gIH1cblxuICBzaHVmZmxlU2hvcHMocmFuZG9tOiBSYW5kb20pIHtcbiAgICAvLyBmb3Igbm93IHdlIGp1c3QgZHVtcCBldmVyeXRoaW5nIGludG8gYSBwb29sIGFuZCBzaHVmZmxlIHRoZW0gdXAuXG4gICAgaW50ZXJmYWNlIFNob3BUeXBlIHtcbiAgICAgIHNob3BzOiBMb2NhdGlvbltdO1xuICAgICAgaXRlbXM6IEl0ZW1bXTtcbiAgICB9XG4gICAgY29uc3QgYXJtb3I6IFNob3BUeXBlID0ge3Nob3BzOiBbXSwgaXRlbXM6IFtdfTtcbiAgICBjb25zdCB0b29sczogU2hvcFR5cGUgPSB7c2hvcHM6IFtdLCBpdGVtczogW119O1xuICAgIGZvciAoY29uc3QgbiBvZiB0aGlzLm5vZGVzKSB7XG4gICAgICBpZiAoIShuIGluc3RhbmNlb2YgTG9jYXRpb24pIHx8ICFuLnNlbGxzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBjb25zdCBzID0gbi5zZWxsc1swXS5pbnZlbnRvcnlSb3cgPT09ICdhcm1vcicgPyBhcm1vciA6IHRvb2xzO1xuICAgICAgcy5zaG9wcy5wdXNoKG4pO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgcy5pdGVtcy5wdXNoKG4uc2VsbHNbaV0gfHwgbnVsbCk7XG4gICAgICB9XG4gICAgICBuLnNlbGxzID0gW107XG4gICAgfVxuICAgIHJhbmRvbS5zaHVmZmxlKGFybW9yLml0ZW1zKTtcbiAgICByYW5kb20uc2h1ZmZsZSh0b29scy5pdGVtcyk7XG5cbiAgICBmb3IgKGNvbnN0IHtzaG9wcywgaXRlbXN9IG9mIFthcm1vciwgdG9vbHNdKSB7XG4gICAgICBsZXQgcyA9IDA7XG4gICAgICB3aGlsZSAoaXRlbXMubGVuZ3RoICYmIHMgPCAxMDAwMDApIHtcbiAgICAgICAgY29uc3QgaXRlbSA9IGl0ZW1zLnBvcCgpO1xuICAgICAgICBjb25zdCBzaG9wID0gc2hvcHNbcysrICUgc2hvcHMubGVuZ3RoXTtcbiAgICAgICAgaWYgKCFpdGVtKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHNob3Auc2VsbHMuaW5kZXhPZihpdGVtKSA+PSAwIHx8IHNob3Auc2VsbHMubGVuZ3RoID49IDQpIHtcbiAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHNob3Auc2VsbHMucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gc29ydCBpdGVtc1xuICAgIGZvciAoY29uc3Qge3Nob3BzfSBvZiBbYXJtb3IsIHRvb2xzXSkge1xuICAgICAgZm9yIChjb25zdCBzaG9wIG9mIHNob3BzKSB7XG4gICAgICAgIHNob3Auc2VsbHMuc29ydCgoYSwgYikgPT4gYS5pZCAtIGIuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyFPYmplY3R9IG9wdHNcbiAgICogQHJldHVybiB7IUxvY2F0aW9uTGlzdH1cbiAgICovXG4gIGludGVncmF0ZSh7dHJhY2tlciA9IGZhbHNlfToge3RyYWNrZXI/OiBib29sZWFufSA9IHt9KSB7XG4gICAgLy8gZm9yKGxldCBpPTA7aTx0aGlzLm5vZGVzLmxlbmd0aDtpKyspXG4gICAgLy8gY29uc29sZS5sb2coYCR7aX0gJHt0aGlzLm5vZGVzW2ldfWApO1xuXG4gICAgY29uc3QgcmVtb3ZlQ29uZGl0aW9ucyA9IHRydWU7XG4gICAgY29uc3QgcmVtb3ZlVHJpZ2dlcnMgPSB0cnVlO1xuICAgIGNvbnN0IHJlbW92ZU9wdGlvbnMgPSB0cnVlO1xuICAgIGNvbnN0IHJlbW92ZVRyYWNrZXJzID0gIXRyYWNrZXI7XG5cbiAgICBjb25zdCBkZXBncmFwaCA9IG5ldyBTcGFyc2VEZXBlbmRlbmN5R3JhcGgodGhpcy5ub2Rlcy5sZW5ndGgpO1xuICAgIGNvbnN0IGNvbm5lY3Rpb25zQnlGcm9tOiBDb25uZWN0aW9uW11bXSA9IFtdO1xuICAgIGNvbnN0IGNvbm5lY3Rpb25zQnlUbzogQ29ubmVjdGlvbltdW10gPSBbXTtcbiAgICBjb25zdCBjb25uZWN0aW9ucyA9IG5ldyBTZXQ8Q29ubmVjdGlvbj4oKTtcbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBNYXA8c3RyaW5nLCBTcGFyc2VSb3V0ZT4oKTsgLy8gd2FzOiBFZGdlID8/P1xuXG4gICAgY29uc3Qgb3B0aW9uczogT3B0aW9uW10gPSBbXTtcbiAgICBjb25zdCB0cmFja2VyczogVHJhY2tlck5vZGVbXSA9IFtdO1xuICAgIGNvbnN0IGNvbmRpdGlvbnM6IENvbmRpdGlvbltdID0gW107XG4gICAgY29uc3QgdHJpZ2dlcnM6IFRyaWdnZXJbXSA9IFtdO1xuICAgIGNvbnN0IGl0ZW1zOiBJdGVtR2V0W10gPSBbXTtcbiAgICBjb25zdCBzbG90cyA9IG5ldyBTZXQ8U2xvdD4oKTtcblxuICAgIC8vIFRPRE8gLSBob3cgdG8gaGFuZGxlIHRyYWNrZXIgbm9kZXM/XG4gICAgLy8gICAtIGlmIHdlIGxlYXZlIHRoZW0gaW4sIHRoZW4gd2Ugc2hvdWxkIGVuc3VyZVxuICAgIC8vICAgICB0aGUgSEFTIGZpZWxkIGluaXRzIHRvIGluY2x1ZGUgdGhlbSB1c3VhbGx5P1xuICAgIC8vIEZvciBmaWxsaW5nLCBvbmx5IG1haW50YWluIHRoZSB0cmFja2VyIG5vZGUgaWYgdGhlIG9wdGlvblxuICAgIC8vIGlzIHByZXNlbnQ7IHRoZW4gd2hlbmV2ZXIgYSB0cmFja2VyIGl0ZW0gZGlzYXBwZWFycyxcbiAgICAvLyByZW1vdmUgdGhlIHRyYWNrZXIgYWx0ZXJuYXRpdmUgYXMgd2VsbCBhbmQgc2VlIHdoYXQgbG9jYXRpb25zXG4gICAgLy8gZGlzYXBwZWFyIC0gdGhvc2UgYXJlIHRoZSBiZXN0IGNhbmRpZGF0ZXMgZm9yIG1heGltYWwgZGlmZmljdWx0eS5cblxuICAgIC8vIENvdWxkIGFsc28gYWRkIGEgVHJhY2tlck5vZGUgdHlwZSBmb3IgTEVBUF9PRl9GQUlUSCBvciBzb21ldGhpbmc/XG4gICAgLy8gIC0gb3B0aW9uIGlzIGFsd2F5cyB0cnVlLCBzbyBhbHdheXMgcm91dGVkIGFuZCBpZ25vcmVkIGZvciB0cmFja2VyLFxuICAgIC8vICAgIGJ1dCB3ZSBjb3VsZCBrZWVwIHRyYWNrIG9mIGUuZy4gbW9zdCBwZW9wbGUgd29uJ3QgZW50ZXIgdGhlXG4gICAgLy8gICAgdGVtcGxlIHdpdGhvdXQgQm9ULCBvciB2YXJpb3VzIGNhdmVzIHdpdGhvdXQgY2VydGFpbiBpdGVtcztcbiAgICAvLyAgICBieSBzaW1wbHkgYWRkaW5nIExFQVBfT0ZfRkFJVEggZGVwcyB0byB0aGVzZSwgd2UnbGwgaW5jcmVhc2VcbiAgICAvLyAgICB0aGUgY2hhbmNlIHRoYXQgaXRlbXMgZW5kIHVwIGluIHRyb2xsaXNoIHBsYWNlcz9cblxuICAgIC8vIEZpcnN0IGluZGV4IGFsbCB0aGUgbm9kZXMgYW5kIGNvbm5lY3Rpb25zLlxuICAgIGZvciAoY29uc3QgbiBvZiB0aGlzLm5vZGVzKSB7XG4gICAgICBpZiAobiBpbnN0YW5jZW9mIExvY2F0aW9uKSB7XG4gICAgICAgIGlmIChuLmlzU3RhcnQpIHtcbiAgICAgICAgICBjb25zdCBbcm91dGVdID0gZGVwZ3JhcGguYWRkUm91dGUoW24udWlkXSk7XG4gICAgICAgICAgcXVldWUuc2V0KHJvdXRlLmxhYmVsLCByb3V0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29ubmVjdGlvbnNCeUZyb21bbi51aWRdID0gW107XG4gICAgICAgIGNvbm5lY3Rpb25zQnlUb1tuLnVpZF0gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBjIG9mIG4uY29ubmVjdGlvbnMpIHtcbiAgICAgICAgICBpZiAoY29ubmVjdGlvbnMuaGFzKGMpKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBhZGQgY29ubmVjdGlvbiBhbmQgbWF5YmUgZXZlcnNlIHRvIHRoZSBzZXRcbiAgICAgICAgICBjb25uZWN0aW9ucy5hZGQoYyk7XG4gICAgICAgICAgaWYgKGMuYmlkaSkgY29ubmVjdGlvbnMuYWRkKGMucmV2ZXJzZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGMgb2Ygbi5jaGVzdHMpIHtcbiAgICAgICAgICBkZXBncmFwaC5hZGRSb3V0ZShbYy51aWQsIG4udWlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vLy8gVXNlIENyeXN0YWxpcyBhcyBhIHByb3h5IGZvciB3aW5uaW5nXG4gICAgICAvLyBpZiAobiBpbnN0YW5jZW9mIFNsb3QgJiYgbi5zbG90TmFtZSA9PSBudWxsKSB7XG4gICAgICAvLyAgIGNvbnRpbnVlO1xuICAgICAgLy8gfVxuICAgICAgaWYgKG4gaW5zdGFuY2VvZiBJdGVtR2V0ICYmIG4ubmFtZSA9PT0gJ01lZGljYWwgSGVyYicpIHtcbiAgICAgICAgZGVwZ3JhcGguYWRkUm91dGUoW24udWlkXSk7XG4gICAgICAgIGRlcGdyYXBoLmZpbmFsaXplKG4udWlkKTtcbiAgICAgIH1cbiAgICAgIC8vIEVORCBURU1QT1JBUlkgSEFDS1xuXG4gICAgICBpZiAobiBpbnN0YW5jZW9mIE9wdGlvbikgb3B0aW9ucy5wdXNoKG4pO1xuICAgICAgZWxzZSBpZiAobiBpbnN0YW5jZW9mIFRyYWNrZXJOb2RlKSB0cmFja2Vycy5wdXNoKG4pO1xuICAgICAgZWxzZSBpZiAobiBpbnN0YW5jZW9mIENvbmRpdGlvbikgY29uZGl0aW9ucy5wdXNoKG4pO1xuICAgICAgZWxzZSBpZiAobiBpbnN0YW5jZW9mIFRyaWdnZXIpIHRyaWdnZXJzLnB1c2gobik7XG4gICAgICBlbHNlIGlmIChuIGluc3RhbmNlb2YgSXRlbUdldCkgaXRlbXMucHVzaChuKTtcbiAgICAgIGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBTbG90KSBzbG90cy5hZGQobik7XG4gICAgICBlbHNlIGlmIChuIGluc3RhbmNlb2YgQXJlYSkgKCgpID0+IHt9KSgpOyAvLyBkbyBub3RoaW5nXG4gICAgICBlbHNlIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBub2RlIHR5cGU6ICR7bi5ub2RlVHlwZX1gKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGMgb2YgY29ubmVjdGlvbnMpIHtcbiAgICAgIGNvbm5lY3Rpb25zQnlGcm9tW2MuZnJvbS51aWRdLnB1c2goYyk7XG4gICAgICBjb25uZWN0aW9uc0J5VG9bYy50by51aWRdLnB1c2goYyk7XG4gICAgfVxuXG4gICAgY29uc3QgaW50ZWdyYXRlID0gKG5vZGVzOiBOb2RlW10pID0+IHtcbiAgICAgIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xuICAgICAgICBmb3IgKGNvbnN0IGVkZ2Ugb2Ygbi5lZGdlcyh7dHJhY2tlcn0pKSB7XG4gICAgICAgICAgZGVwZ3JhcGguYWRkUm91dGUoZWRnZSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVwZ3JhcGguZmluYWxpemUobi51aWQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBEbyBvcHRpb25zIGFuZCB0cmlnZ2VycyBmaXJzdFxuICAgIGlmIChyZW1vdmVPcHRpb25zKSBpbnRlZ3JhdGUob3B0aW9ucyk7XG4gICAgaWYgKHJlbW92ZVRyYWNrZXJzKSBpbnRlZ3JhdGUodHJhY2tlcnMpO1xuXG4vLyAgICAgaWYgKHRyYWNrZXIpIHtcbi8vICAgICAgIGNvbnN0IHRyYWNrZXJNYXAgPSBuZXcgTWFwKCk7XG4vLyAgICAgICAvLyByZXRhaW4gYSBzaW5nbGUgb2ZmLXJvdXRlIHRyYWNrZXIgbm9kZSBmb3IgZWFjaCB0eXBlLlxuLy8gICAgICAgZm9yIChjb25zdCB0IG9mIHRyYWNrZXJzKSB7XG4vLyBjb25zb2xlLmVycm9yKGBMb29raW5nIGF0IHRyYWNrZXIgJHt0fSAoJHt0Lm9wdGlvbn0pOiB2YWx1ZT0ke3Qub3B0aW9uLnZhbHVlfWApO1xuLy8gICAgICAgICBpZiAodC5vcHRpb24udmFsdWUpIHtcbi8vIGNvbnNvbGUuZXJyb3IoJyAgSU5URUdSQVRJT04nKTtcbi8vICAgICAgICAgICBkZXBncmFwaC5hZGRSb3V0ZShbdC51aWRdKTtcbi8vICAgICAgICAgICBkZXBncmFwaC5maW5hbGl6ZSh0LnVpZCk7XG4vLyAgICAgICAgIH0gZWxzZSBpZiAodHJhY2tlck1hcC5oYXModCkpIHtcbi8vICAgICAgICAgICBkZXBncmFwaC5hZGRSb3V0ZShbdC51aWQsIHRyYWNrZXJNYXAuZ2V0KHQudHlwZSkudWlkXSk7XG4vLyAgICAgICAgICAgZGVwZ3JhcGguZmluYWxpemUodC51aWQpO1xuLy8gICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgIHRyYWNrZXJNYXAuc2V0KHQudHlwZSwgdCk7XG4vLyAgICAgICAgIH1cbi8vICAgICAgIH1cbi8vICAgICB9XG5cbiAgICBpZiAocmVtb3ZlVHJpZ2dlcnMpIGludGVncmF0ZSh0cmlnZ2Vycyk7XG5cbiAgICAvLyBOZXh0IGRvIGxvY2F0aW9ucywgbGVhdmluZyBjb25kaXRpb25zIGludGFjdFxuICAgIGZvciAoY29uc3Qgcm91dGUgLyogOiBTcGFyc2VSb3V0ZSAqLyBvZiBxdWV1ZS52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gcm91dGUudGFyZ2V0O1xuICAgICAgLy8gY29uc29sZS5lcnJvcihgbG9jOiAke3RhcmdldH0gJHt0aGlzLm5vZGVzW3RhcmdldF19OiAke1suLi5yb3V0ZS5kZXBzXX1gKTtcbiAgICAgIGZvciAoY29uc3QgYyBvZiBjb25uZWN0aW9uc0J5RnJvbVt0YXJnZXRdKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYGM6ICR7Yy5mcm9tLnVpZH0gLT4gJHtjLnRvLnVpZH0gaWYgJHtcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgYy5kZXBzLm1hcCh4PT54LnVpZCl9YCk7IC8vIFRPRE8gLSBubyBjb25uZWN0aW9ucz8/P1xuICAgICAgICBjb25zdCBuZXdSb3V0ZSA9IFtjLnRvLnVpZCwgLi4ucm91dGUuZGVwc107XG4gICAgICAgIGZvciAobGV0IGkgPSBjLmRlcHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBuZXdSb3V0ZS5wdXNoKGMuZGVwc1tpXS51aWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjLmZyb20uYm9zc05vZGUpIG5ld1JvdXRlLnB1c2goYy5mcm9tLmJvc3NOb2RlLnVpZCk7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYG5ld1JvdXRlOiAke25ld1JvdXRlfWApO1xuICAgICAgICBmb3IgKGNvbnN0IHIgb2YgZGVwZ3JhcGguYWRkUm91dGUobmV3Um91dGUpKSB7XG4gICAgICAgICAgaWYgKCFxdWV1ZS5oYXMoci5sYWJlbCkpIHF1ZXVlLnNldChyLmxhYmVsLCByKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChyZW1vdmVDb25kaXRpb25zKSBpbnRlZ3JhdGUoY29uZGl0aW9ucyk7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgTm9kZUlkOyBpIDwgdGhpcy5ub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMubm9kZXNbaV0gaW5zdGFuY2VvZiBJdGVtR2V0XG4gICAgICAgICAgfHwgdGhpcy5ub2Rlc1tpXSBpbnN0YW5jZW9mIFRyYWNrZXJOb2RlXG4gICAgICAgICApIGNvbnRpbnVlO1xuICAgICAgLy8gY29uc29sZS5lcnJvcihgZmluYWxpemluZyAke3RoaXMubm9kZXNbaV19YCk7XG4gICAgICBkZXBncmFwaC5maW5hbGl6ZShpKTtcbiAgICB9XG4gICAgLy8gY29uc29sZS5lcnJvcihgZG9uZSB3LyBub2Rlc2ApO1xuXG4gICAgLy8gTm93IHdlIGhhdmUgYSBkZXBlbmRlbmN5IGdyYXBoLCB3aGVyZSBhbGwgc2xvdHMgc2hvdWxkXG4gICAgLy8gaGF2ZSBvbmx5IGl0ZW0gZGVwZW5kZW5jaWVzICh1bmxlc3Mgd2UgbGVmdCBzb21lIGluKS5cbiAgICBjb25zdCBvdXQgPSBuZXcgTG9jYXRpb25MaXN0KHRoaXMpO1xuICAgIGZvciAoY29uc3Qgc2xvdCBvZiBzbG90cykge1xuICAgICAgLy8gY29uc29sZS5lcnJvcihgc2xvdCAke3Nsb3QudWlkfTogJHtbLi4uZGVwZ3JhcGgubm9kZXNbc2xvdC51aWRdXX1gKTtcbiAgICAgIGZvciAoY29uc3QgYWx0IG9mIGRlcGdyYXBoLm5vZGVzW3Nsb3QudWlkXS52YWx1ZXMoKSkge1xuICAgICAgICBvdXQuYWRkUm91dGUoW3Nsb3QudWlkLCAuLi5hbHRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTG9jYXRpb25MaXN0IHtcblxuICAvLyByZW51bWJlcmVkIG5vZGVzIC0+IG1hcHBpbmcgYmV0d2VlbiB0aGVtP1xuICAvLyAgLSBmdWxsIGludGVncmF0ZWQgcmVxdWlyZW1lbnRzXG4gIC8vICAtIGhvdyB0byBvcHRpbWl6ZSBmb3IgYXNzdW1lZCBmaWxsPz9cbiAgLy8gIC0gd2lsbCB3YW50IGEgc2VwYXJhdGUgdHJhdmVyc2UgbWV0aG9kXG5cbiAgLy8gY291bGQgcmV1c2Ugbm9kZSBvYmplY3RzIGlmIGluc3RlYWQgb2YgYSBzaW5nbGUgaWRcbiAgLy8gdGhleSBoYWQgYSB3ZWFrbWFwIGZyb20gZ3JhcGhzIHRvIGlkcyBpbiB0aGUgZ3JhcGgsXG4gIC8vIHRoZW4gdGhlIGlkIGlzIGFzc2lnbmVkIHdoZW4gdGhleSdyZSBhZGRlZCB0byB0aGVcbiAgLy8gZ3JhcGgsIHRobyB0aGF0IHdvdWxkIG11Y2sgdXAgYSBsb3Qgb2Ygc3R1ZmYuLi5cblxuICAvLyBCaW1hcCBiZXR3ZWVuIG5vZGVzIGFuZCBpbmRpY2VzLlxuICByZWFkb25seSB1aWRUb0xvY2F0aW9uOiBOb2RlSWRbXSA9IFtdO1xuICByZWFkb25seSBsb2NhdGlvblRvVWlkOiBOb2RlSWRbXSA9IFtdO1xuICByZWFkb25seSB1aWRUb0l0ZW06IE5vZGVJZFtdID0gW107XG4gIHJlYWRvbmx5IGl0ZW1Ub1VpZDogTm9kZUlkW10gPSBbXTtcbiAgcmVhZG9ubHkgcm91dGVzOiBCaXRzW11bXSA9IFtdO1xuICByZWFkb25seSB1bmxvY2tzOiBTZXQ8Tm9kZUlkPltdID0gW107XG4gIC8vIFNsb3QgZm9yIHRoZSBcIndpbiBjb25kaXRpb25cIiBub2RlLlxuICB3aW46IE5vZGVJZCB8IG51bGwgPSBudWxsO1xuXG4gIC8vIFRPRE8gLSBjdXN0b20gd2lkdGg/ICBmb3Igbm93IHdlIGhhcmRjb2RlIHdpZHRoPTJcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgd29ybGRHcmFwaDogV29ybGRHcmFwaCkge31cblxuICBpdGVtKGluZGV4OiBOb2RlSWQpOiBJdGVtR2V0IHtcbiAgICByZXR1cm4gdGhpcy53b3JsZEdyYXBoLm5vZGVzW3RoaXMuaXRlbVRvVWlkW2luZGV4XV0gYXMgSXRlbUdldDtcbiAgfVxuXG4gIGxvY2F0aW9uKGluZGV4OiBOb2RlSWQpOiBTbG90IHtcbiAgICByZXR1cm4gdGhpcy53b3JsZEdyYXBoLm5vZGVzW3RoaXMubG9jYXRpb25Ub1VpZFtpbmRleF1dIGFzIFNsb3Q7XG4gIH1cblxuICAvLyBOT1RFOiAncm91dGUnIGlzIGluIHRlcm1zIG9mIHdvcmxkZ3JhcGggdWlkc1xuICBhZGRSb3V0ZShyb3V0ZTogRWRnZSk6IHZvaWQge1xuICAgIC8vIE1ha2Ugc3VyZSBhbGwgbm9kZXMgYXJlIG1hcHBlZC5cbiAgICBsZXQgZGVwczogQml0cyA9IEJpdHMub2YoKTtcbiAgICBsZXQgdGFyZ2V0OiBOb2RlSWQgPSAtMSBhcyBOb2RlSWQ7IC8vIHdpbGwgYWx3YXlzIGJlIHJlYXNzaWduZWRcbiAgICBjb25zdCB1bmxvY2tzID0gW107XG4gICAgZm9yIChsZXQgaSA9IHJvdXRlLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBjb25zdCBmd2QgPSBpID8gdGhpcy51aWRUb0l0ZW0gOiB0aGlzLnVpZFRvTG9jYXRpb247XG4gICAgICBjb25zdCBid2QgPSBpID8gdGhpcy5pdGVtVG9VaWQgOiB0aGlzLmxvY2F0aW9uVG9VaWQ7XG4gICAgICBjb25zdCBuID0gcm91dGVbaV07XG4gICAgICBsZXQgaW5kZXggPSBmd2Rbbl07XG4gICAgICBpZiAoaW5kZXggPT0gbnVsbCkge1xuICAgICAgICBpbmRleCA9IGJ3ZC5sZW5ndGggYXMgTm9kZUlkO1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKGAke2l9OiAke3RoaXMud29ybGRHcmFwaC5ub2Rlc1tuXX0gPT4gJHtpbmRleH1gKTtcbiAgICAgICAgYndkLnB1c2gobik7XG4gICAgICAgIGZ3ZFtuXSA9IGluZGV4O1xuICAgICAgICAvLyBpZGVudGlmeSB0aGUgd2luIGxvY2F0aW9uXG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLndvcmxkR3JhcGgubm9kZXNbbl07XG4gICAgICAgIGlmICghaSAmJiBub2RlIGluc3RhbmNlb2YgU2xvdCAmJiBub2RlLmlzRml4ZWQoKSkge1xuICAgICAgICAgIHRoaXMud2luID0gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpKSB7XG4gICAgICAgIGRlcHMgPSBCaXRzLndpdGgoZGVwcywgaW5kZXgpO1xuICAgICAgICB1bmxvY2tzLnB1c2godGhpcy51bmxvY2tzW2luZGV4XSB8fFxuICAgICAgICAgICAgICAgICAgICAgKHRoaXMudW5sb2Nrc1tpbmRleF0gPSBuZXcgU2V0PE5vZGVJZD4oKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFyZ2V0ID0gaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIE5vdyBhZGQgcm91dGUgYW5kIHRoZSB1bmxvY2tzLlxuICAgICh0aGlzLnJvdXRlc1t0YXJnZXRdIHx8ICh0aGlzLnJvdXRlc1t0YXJnZXRdID0gW10pKS5wdXNoKGRlcHMpO1xuICAgIGZvciAoY29uc3QgdW5sb2NrIG9mIHVubG9ja3MpIHtcbiAgICAgIHVubG9jay5hZGQodGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICAvLyBOT1RFOiBkb2VzIG5vdCB0YWtlIHRoaXMuc2xvdHMgaW50byBhY2NvdW50IVxuICBjYW5SZWFjaCh3YW50OiBOb2RlLCBoYXM6IEJpdHMpOiBib29sZWFuIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnVpZFRvTG9jYXRpb25bd2FudC51aWRdO1xuICAgIGNvbnN0IG5lZWQgPSB0aGlzLnJvdXRlc1t0YXJnZXRdO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBuZWVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoQml0cy5jb250YWluc0FsbChoYXMsIG5lZWRbaV0pKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBiaXRtYXNrIG9mIHJlYWNoYWJsZSBsb2NhdGlvbnMuXG4gICAqIEBwYXJhbSBoYXMgQml0bWFzayBvZiBnb3R0ZW4gaXRlbXNcbiAgICogQHBhcmFtIHNsb3RzIExvY2F0aW9uLXRvLWl0ZW0gbWFwcGluZ1xuICAgKiBAcmV0dXJuIFNldCBvZiByZWFjaGFibGUgbG9jYXRpb25zXG4gICAqL1xuICB0cmF2ZXJzZShoYXM6IEJpdHMgPSBCaXRzLm9mKCksIHNsb3RzOiBOb2RlSWRbXSA9IFtdKTogU2V0PE5vZGVJZD4ge1xuICAgIC8vIE5PVEU6IHdlIGNhbid0IHVzZSBpc0FycmF5IGJlY2F1c2UgdGhlIG5vbi1iaWdpbnQgcG9seWZpbGwgSVMgYW4gYXJyYXlcbiAgICAvLyBsZXQgaGFzT3V0ID0gQXJyYXkuaXNBcnJheShoYXMpID8gaGFzIDogbnVsbDtcbiAgICAvLyBpZiAoaGFzT3V0KSBoYXMgPSBoYXNbMF07XG4gICAgaGFzID0gQml0cy5jbG9uZShoYXMpO1xuXG4gICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxOb2RlSWQ+KCk7XG4gICAgY29uc3QgcXVldWUgPSBuZXcgU2V0PE5vZGVJZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBOb2RlSWQ7IGkgPCB0aGlzLmxvY2F0aW9uVG9VaWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIHF1ZXVlLmFkZChpKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuIG9mIHF1ZXVlKSB7XG4gICAgICBxdWV1ZS5kZWxldGUobik7XG4gICAgICBpZiAocmVhY2hhYmxlLmhhcyhuKSkgY29udGludWU7XG4gICAgICAvLyBjYW4gd2UgcmVhY2ggaXQ/XG4gICAgICBjb25zdCBuZWVkZWQgPSB0aGlzLnJvdXRlc1tuXTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBuZWVkZWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgLy8gaWYobj09NCljb25zb2xlLmxvZyhgY2FuIHJlYWNoIDQ/ICR7Qml0cy5iaXRzKG5lZWRlZFtpXSl9IGhhcyAke1xuICAgICAgICAvLyAgICAgICAgICAgQml0cy5iaXRzKGhhcyl9ID0+ICR7Qml0cy5jb250YWluc0FsbChoYXMsIG5lZWRlZFtpXSl9YCk7XG4gICAgICAgIGlmICghQml0cy5jb250YWluc0FsbChoYXMsIG5lZWRlZFtpXSkpIGNvbnRpbnVlO1xuICAgICAgICByZWFjaGFibGUuYWRkKG4pO1xuICAgICAgICBpZiAoc2xvdHNbbl0pIHtcbiAgICAgICAgICBoYXMgPSBCaXRzLndpdGgoaGFzLCBzbG90c1tuXSk7XG4gICAgICAgICAgZm9yIChjb25zdCBqIG9mIHRoaXMudW5sb2Nrc1tzbG90c1tuXV0pIHtcbiAgICAgICAgICAgIHF1ZXVlLmFkZChqKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGlmIChoYXNPdXQpIGhhc091dFswXSA9IGhhcztcbiAgICByZXR1cm4gcmVhY2hhYmxlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBiaXRtYXNrIG9mIHJlYWNoYWJsZSBsb2NhdGlvbnMuXG4gICAqIEBwYXJhbSBzbG90cyBMb2NhdGlvbi10by1pdGVtIG1hcHBpbmdcbiAgICogQHJldHVybiBEZXB0aCBvZiBlYWNoIHNsb3RcbiAgICovXG4gIHRyYXZlcnNlRGVwdGhzKHNsb3RzOiBOb2RlSWRbXSk6IG51bWJlcltdIHtcbiAgICBsZXQgaGFzID0gQml0cy5vZigpO1xuICAgIGxldCBkZXB0aCA9IDA7XG4gICAgY29uc3QgZGVwdGhzOiBudW1iZXJbXSA9IFtdO1xuICAgIGNvbnN0IEJPVU5EQVJZID0ge307XG4gICAgY29uc3QgcXVldWUgPSBuZXcgU2V0PE5vZGVJZCB8IHR5cGVvZiBCT1VOREFSWT4oKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubG9jYXRpb25Ub1VpZC5sZW5ndGg7IGkrKykge1xuICAgICAgcXVldWUuYWRkKGkpO1xuICAgIH1cbiAgICBxdWV1ZS5hZGQoQk9VTkRBUlkpO1xuICAgIGZvciAoY29uc3QgbiBvZiBxdWV1ZSkge1xuICAgICAgcXVldWUuZGVsZXRlKG4pO1xuICAgICAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAocXVldWUuc2l6ZSkgcXVldWUuYWRkKEJPVU5EQVJZKTtcbiAgICAgICAgZGVwdGgrKztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoZGVwdGhzW25dICE9IG51bGwpIGNvbnRpbnVlO1xuICAgICAgLy8gY2FuIHdlIHJlYWNoIGl0P1xuICAgICAgY29uc3QgbmVlZGVkID0gdGhpcy5yb3V0ZXNbbl07XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gbmVlZGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICghQml0cy5jb250YWluc0FsbChoYXMsIG5lZWRlZFtpXSkpIGNvbnRpbnVlO1xuICAgICAgICBkZXB0aHNbbl0gPSBkZXB0aDtcbiAgICAgICAgaWYgKHNsb3RzW25dKSB7XG4gICAgICAgICAgaGFzID0gQml0cy53aXRoKGhhcywgc2xvdHNbbl0pO1xuICAgICAgICAgIGZvciAoY29uc3QgaiBvZiB0aGlzLnVubG9ja3Nbc2xvdHNbbl1dKSB7XG4gICAgICAgICAgICBxdWV1ZS5hZGQoaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVwdGhzO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgIC8vIE5vdGU6IHJvdXRlcyBhcmUgaW5kZXhlZCBieSBsb2NhdGlvbiBOb2RlSWRcbiAgICBmb3IgKGxldCBpID0gMCBhcyBOb2RlSWQ7IGkgPCB0aGlzLnJvdXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgbG9jID0gdGhpcy5sb2NhdGlvbihpKTtcbiAgICAgIGNvbnN0IHJvdXRlID0gdGhpcy5yb3V0ZXNbaV07XG4gICAgICBjb25zdCB0ZXJtcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaiA9IDAsIGxlbiA9IHJvdXRlLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgIGNvbnN0IHRlcm0gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBiaXQgb2YgQml0cy5iaXRzKHJvdXRlW2pdKSkge1xuICAgICAgICAgIHRlcm0ucHVzaCh0aGlzLml0ZW0oYml0IGFzIE5vZGVJZCkpO1xuICAgICAgICB9XG4gICAgICAgIHRlcm1zLnB1c2goJygnICsgdGVybS5qb2luKCcgJiAnKSArICcpJyk7XG4gICAgICB9XG4gICAgICBsaW5lcy5wdXNoKGAke2xvY306ICR7dGVybXMuam9pbignIHwgJyl9YCk7XG4gICAgfVxuICAgIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBkbyBhbiBhc3N1bWVkIGZpbGwuICBSZXR1cm5zIG51bGwgaWYgdGhlIGF0dGVtcHQgZmFpbGVkLlxuICAgKiBPdGhlcndpc2UgcmV0dXJucyBhIG1hcHBpbmcgb2YgbG9jYXRpb24gdG8gaXRlbS5cbiAgICovXG4gIGFzc3VtZWRGaWxsKHJhbmRvbTogUmFuZG9tLFxuICAgICAgICAgICAgICBmaXRzOiAoc2xvdDogU2xvdCwgaXRlbTogSXRlbUdldCkgPT4gYm9vbGVhbiA9IChzbG90LCBpdGVtKSA9PiB0cnVlLFxuICAgICAgICAgICAgICBzdHJhdGVneTogRmlsbFN0cmF0ZWd5ID0gRmlsbFN0cmF0ZWd5KTogTm9kZUlkW10gfCBudWxsIHtcbiAgICAvLyBTdGFydCB3aXRoIGFsbCBpdGVtcy5cbiAgICBjb25zdCBoYXNBcnIgPSBzdHJhdGVneS5zaHVmZmxlSXRlbXMoXG4gICAgICAgIHRoaXMuaXRlbVRvVWlkLm1hcCh1aWQgPT4gdGhpcy53b3JsZEdyYXBoLm5vZGVzW3VpZF0gYXMgSXRlbUdldCksIHJhbmRvbSk7XG4gICAgbGV0IGhhcyA9IEJpdHMuZnJvbShoYXNBcnIpO1xuICAgIGNvbnN0IGZpbGxpbmcgPSBuZXcgQXJyYXkodGhpcy5sb2NhdGlvblRvVWlkLmxlbmd0aCkuZmlsbChudWxsKTtcbiAgICAvLyBTdGFydCBzb21ldGhpbmcuLi5cbiAgICB3aGlsZSAoaGFzQXJyLmxlbmd0aCkge1xuICAgICAgY29uc3QgYml0ID0gaGFzQXJyLnBvcCgpITtcbiAgICAgIGlmICghQml0cy5oYXMoaGFzLCBiaXQpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW0oYml0KTtcbiAgICAgIGhhcyA9IEJpdHMud2l0aG91dChoYXMsIGJpdCk7XG4gICAgICBjb25zdCByZWFjaGFibGUgPVxuICAgICAgICAgIFsuLi50aGlzLnRyYXZlcnNlKGhhcywgZmlsbGluZyldLmZpbHRlcihuID0+IGZpbGxpbmdbbl0gPT0gbnVsbCk7XG5cbiAgICAgIC8vIE5PVEU6IHNodWZmbGUgdGhlIHdob2xlIHRoaW5nIGIvYyBzb21lIGl0ZW1zIGNhbid0XG4gICAgICAvLyBnbyBpbnRvIHNvbWUgc2xvdHMsIHNvIHRyeSB0aGUgbmV4dCBvbmUuXG4gICAgICBzdHJhdGVneS5zaHVmZmxlU2xvdHMoaXRlbSwgcmVhY2hhYmxlLCByYW5kb20pO1xuICAgICAgLy8gRm9yIG5vdywgd2UgZG9uJ3QgaGF2ZSBhbnkgd2F5IHRvIGtub3cuLi5cbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBzbG90IG9mIHJlYWNoYWJsZSkge1xuICAgICAgICBpZiAoZmlsbGluZ1tzbG90XSA9PSBudWxsICYmXG4gICAgICAgICAgICBzbG90ICE9PSB0aGlzLndpbiAmJlxuICAgICAgICAgICAgZml0cyh0aGlzLmxvY2F0aW9uKHNsb3QpLCBpdGVtKSkge1xuICAgICAgICAgIGlmIChzbG90ID4gMTAwKSB0aHJvdyBuZXcgRXJyb3IoJ1NvbWV0aGluZyB3ZW50IGhvcnJpYmx5IHdyb25nJyk7XG4gICAgICAgICAgZmlsbGluZ1tzbG90XSA9IGJpdDtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmlsbGluZztcbiAgfVxuXG4gIC8vIFRPRE8gLSB3ZSBuZWVkIGEgY2xlYW4gd2F5IHRvIHRyYW5zbGF0ZSBpbmRpY2VzLi4uP1xuICAvLyAgLSBpbnN0YW5jZSBtZXRob2RzIGZvciBkZWFsaW5nIHdpdGggJ2hhcycgYXJyYXlzXG4gIC8vICAgIGFuZCAnc2xvdHMnIGFycmF5cyAtIGkuZS5cbiAgLy8gICAgICAgIGFkZEl0ZW0oaGFzLCBpdGVtTm9kZSlcbiAgLy8gICAgICAgIGZpbGxTbG90KHNsb3RzLCBzbG90Tm9kZSwgaXRlbU5vZGUpXG4gIC8vICAgICAgICAuLi4gcmVhZCBsb2NhdGlvbiBiaXRtYXNrP1xuICAvLyBMb2NhdGlvbiBiaXRtYXNrcyB3aWxsIGJlIHdpZGVyIHRoYW4gaXRlbXM/XG4gIC8vICAtIDEyOCBiaXRzIE9LLi4uP1xuICAvLyAgLSBvbmNlIGFsbCAqa2V5KiBpdGVtcyBhcmUgYXNzaWduZWQsIHJlc3QgY2FuIGJlXG4gIC8vICAgIGZpbGxlZCBpbiB0b3RhbGx5IHJhbmRvbWx5LlxuXG4gIC8vIC8qKlxuICAvLyAgKiBBdHRlbXB0cyB0byBkbyBhbiBhc3N1bWVkIGZpbGwuICBSZXR1cm5zIG51bGwgaWYgdGhlXG4gIC8vICAqIGF0dGVtcHQgZmFpbGVkLlxuICAvLyAgKiBAcGFyYW0geyFSYW5kb219IHJhbmRvbVxuICAvLyAgKiBAcGFyYW0ge2Z1bmN0aW9uKCFTbG90LCAhSXRlbUdldCk6IGJvb2xlYW59IGZpdHNcbiAgLy8gICogQHJldHVybiB7P0FycmF5PG51bWJlcj59XG4gIC8vICAqL1xuICAvLyBmb3J3YXJkRmlsbChyYW5kb20sIGZpdHMgPSAoc2xvdCwgaXRlbSkgPT4gdHJ1ZSkge1xuICAvLyAgIC8vIFRoaXMgaXMgYSBzaW1wbGVyIGFsZ29yaXRobSwgYnV0IGhvcGVmdWxseSBpdCdzIGEgbGl0dGxlIG1vcmUgcmVsaWFibGVcbiAgLy8gICAvLyBpbiBoYWlyeSBzaXR1YXRpb25zPyAgQmFzaWMgcGxhbjogZmluZCBhIHJvdXRlIHdpdGggZmV3IHJlcXVpcmVtZW50c1xuICAvLyAgIC8vIGFuZCBkcm9wIG9uZSByZXF1aXJlbWVudCBmcm9tIGl0IGludG8gYSByZWFjaGFibGUgbG9jYXRpb24uXG4gIC8vICAgY29uc3QgbmVlZCA9IG5ldyBTZXQodGhpcy5pdGVtVG9VaWQubWFwKChfLCBpKSA9PiBpKSk7XG4gIC8vICAgbGV0IGhhcyA9IEJpdHMub2YoKTtcbiAgLy8gICBjb25zdCBmaWxsaW5nID0gbmV3IEFycmF5KHRoaXMubG9jYXRpb25Ub1VpZC5sZW5ndGgpLmZpbGwobnVsbCk7XG4gIC8vICAgLy8gU3RhcnQgc29tZXRoaW5nLi4uXG4gIC8vICAgd2hpbGUgKG5lZWQuc2l6ZSkge1xuICAvLyAgICAgY29uc3Qgb2J0YWluYWJsZSA9IFtoYXNdO1xuICAvLyAgICAgY29uc3QgcmVhY2hhYmxlID1cbiAgLy8gICAgICAgICBuZXcgU2V0KFxuICAvLyAgICAgICAgICAgICByYW5kb20uc2h1ZmZsZShcbiAgLy8gICAgICAgICAgICAgICAgIFsuLi50aGlzLnRyYXZlcnNlKG9idGFpbmFibGUsIGZpbGxpbmcpXVxuICAvLyAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIobiA9PiBmaWxsaW5nW25dID09IG51bGwpKSk7XG4gIC8vICAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIHJvdXRlcywgc3VidHJhY3Rpbmcgb250YWluYWJsZVswXVxuICAvLyAgICAgY29uc3Qgcm91dGVzID0gW107XG4gIC8vICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucm91dGVzLmxlbmd0aDsgaSsrKSB7XG4gIC8vICAgICAgIGlmIChmaWxsaW5nW2ldIHx8IHJlYWNoYWJsZS5oYXMoaSkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBmb3IgKGNvbnN0IC8qKiAhQml0cyAqLyByb3V0ZSBvZiB0aGlzLnJvdXRlc1tpXSkge1xuICAvLyAgICAgICAgIGNvbnN0IHIgPSBCaXRzLmJpdHMoQml0cy5kaWZmZXJlbmNlKHJvdXRlLCBoYXMpKTtcblxuICAvLyAgICAgICB9XG4gIC8vICAgLyoqIEBjb25zdCB7IUFycmF5PCFBcnJheTwhQml0cz4+fSAqL1xuICAvLyAgIHRoaXMucm91dGVzID0gW107XG5cbiAgLy8gICAgIGNvbnN0IGJpdCA9IGhhc0Fyci5wb3AoKTtcbiAgLy8gICAgIGlmICghQml0cy5oYXMoaGFzLCBiaXQpKSBjb250aW51ZTtcbiAgLy8gICAgIGNvbnN0IGl0ZW0gPSB0aGlzLndvcmxkR3JhcGgubm9kZXNbdGhpcy5pdGVtVG9VaWRbYml0XV07XG4gIC8vICAgICBoYXMgPSBCaXRzLndpdGhvdXQoaGFzLCBiaXQpO1xuXG4gIC8vICAgICBjb25zdCByZWFjaGFibGUgPVxuICAvLyAgICAgICAgIFsuLi50aGlzLnRyYXZlcnNlKGhhcywgZmlsbGluZyldLmZpbHRlcihuPT5maWxsaW5nW25dPT1udWxsKTtcblxuICAvLyAgICAgLy8gTk9URTogc2h1ZmZsZSB0aGUgd2hvbGUgdGhpbmcgYi9jIHNvbWUgaXRlbXMgY2FuJ3RcbiAgLy8gICAgIC8vIGdvIGludG8gc29tZSBzbG90cywgc28gdHJ5IHRoZSBuZXh0IG9uZS5cbiAgLy8gICAgIHN0cmF0ZWd5LnNodWZmbGVTbG90cyhpdGVtLCByZWFjaGFibGUsIHJhbmRvbSk7XG4gIC8vICAgICAvLyBGb3Igbm93LCB3ZSBkb24ndCBoYXZlIGFueSB3YXkgdG8ga25vdy4uLlxuICAvLyAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gIC8vICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgcmVhY2hhYmxlKSB7XG4gIC8vICAgICAgIGlmIChmaWxsaW5nW3Nsb3RdID09IG51bGwgJiZcbiAgLy8gICAgICAgICAgIHNsb3QgIT0gdGhpcy53aW4gJiZcbiAgLy8gICAgICAgICAgIGZpdHModGhpcy53b3JsZEdyYXBoLm5vZGVzW3RoaXMubG9jYXRpb25Ub1VpZFtzbG90XV0sIGl0ZW0pKSB7XG4gIC8vICAgICAgICAgZmlsbGluZ1tzbG90XSA9IGJpdDtcbiAgLy8gICAgICAgICBmb3VuZCA9IHRydWU7XG4gIC8vICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmICghZm91bmQpIHJldHVybiBudWxsO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gZmlsbGluZztcbiAgLy8gfVxuXG4gIC8vIFRPRE8gLSB3ZSBuZWVkIGEgY2xlYW4gd2F5IHRvIHRyYW5zbGF0ZSBpbmRpY2VzLi4uP1xuICAvLyAgLSBpbnN0YW5jZSBtZXRob2RzIGZvciBkZWFsaW5nIHdpdGggJ2hhcycgYXJyYXlzXG4gIC8vICAgIGFuZCAnc2xvdHMnIGFycmF5cyAtIGkuZS5cbiAgLy8gICAgICAgIGFkZEl0ZW0oaGFzLCBpdGVtTm9kZSlcbiAgLy8gICAgICAgIGZpbGxTbG90KHNsb3RzLCBzbG90Tm9kZSwgaXRlbU5vZGUpXG4gIC8vICAgICAgICAuLi4gcmVhZCBsb2NhdGlvbiBiaXRtYXNrP1xuICAvLyBMb2NhdGlvbiBiaXRtYXNrcyB3aWxsIGJlIHdpZGVyIHRoYW4gaXRlbXM/XG4gIC8vICAtIDEyOCBiaXRzIE9LLi4uP1xuICAvLyAgLSBvbmNlIGFsbCAqa2V5KiBpdGVtcyBhcmUgYXNzaWduZWQsIHJlc3QgY2FuIGJlXG4gIC8vICAgIGZpbGxlZCBpbiB0b3RhbGx5IHJhbmRvbWx5LlxufVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbmV4cG9ydCBpbnRlcmZhY2UgRmlsbFN0cmF0ZWd5IHtcbiAgLyoqIFNodWZmbGVzIGByZWFjaGFibGVgIGluLXBsYWNlLiAqL1xuICBzaHVmZmxlU2xvdHMoaXRlbTogSXRlbUdldCwgcmVhY2hhYmxlOiBOb2RlSWRbXSwgcmFuZG9tOiBSYW5kb20pOiB2b2lkO1xuXG4gIC8qKiBSZXR1cm5zIGFtbiBhcnJheSBvZiBpbmRpY2VzIGludG8gdGhlIGBpdGVtc2AgYXJyYXkuICovXG4gIHNodWZmbGVJdGVtcyhpdGVtczogSXRlbUdldFtdLCByYW5kb206IFJhbmRvbSk6IE5vZGVJZFtdO1xufVxuXG4vLyBCYXNpYyBGaWxsU3RyYXRlZ3kgdGhhdCBzaHVmZmxlcyBzbG90cyBmYWlybHkgYnV0IHBvcHVsYXRlc1xuLy8gaXRlbXMgYmFzZWQgb24gd2VpZ2h0LlxuZXhwb3J0IGNvbnN0IEZpbGxTdHJhdGVneTogRmlsbFN0cmF0ZWd5ID0ge1xuICBzaHVmZmxlU2xvdHM6IChpdGVtLCByZWFjaGFibGUsIHJhbmRvbSkgPT4ge1xuICAgIHJhbmRvbS5zaHVmZmxlKHJlYWNoYWJsZSk7XG4gIH0sXG5cbiAgc2h1ZmZsZUl0ZW1zOiAoaXRlbXMsIHJhbmRvbSkgPT4ge1xuICAgIGNvbnN0IHNodWZmbGVkID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgTm9kZUlkOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHtzaHVmZmxlUHJpb3JpdHkgPSAxfSA9IGl0ZW1zW2ldO1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBzaHVmZmxlUHJpb3JpdHk7IGorKykgc2h1ZmZsZWQucHVzaChpKTtcbiAgICB9XG4gICAgcmFuZG9tLnNodWZmbGUoc2h1ZmZsZWQpO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfSxcbn07XG5cbi8vIEZ1bm5lbCBhbGwgdGhlIHdyaXRlcyBpbnRvIGEgc2luZ2xlIHBsYWNlIHRvIGZpbmQgZXJyYW50IHdyaXRlcy5cbmNvbnN0IHdyaXRlID0gKHJvbTogVWludDhBcnJheSwgYWRkcmVzczogbnVtYmVyLCB2YWx1ZTogbnVtYmVyKSA9PiB7XG4gIHJvbVthZGRyZXNzXSA9IHZhbHVlO1xufTtcblxuLy8gc3RhdGlzdGljcyB3ZSBjYW4gZG9cbi8vICAtIGRpc3RyaWJ1dGlvbiBvZiBsb2NhdGlvbnMgZm9yIGVhY2ggaXRlbVxuLy8gIC0gd2FzIGl0ZW0gbmVjZXNzYXJ5PyAocmVtb3ZlIGFuZCB0cmF2ZXJzZSlcbi8vICAgIC0gZ2FzIG1hc2ssIHNoZWxsIGZsdXRlLCByYWJiaXQgYm9vdHMsXG4vLyAgICAgIGNoYW5nZSwgdGVsZXBhdGh5XG4vLyAgLSB3YXMgc2xvdCBuZWNlc3Nhcnk/XG4vLyAgICAtIGJyb2tlbiBzdGF0dWUvZXllZ2xhc3Nlcywgc3R4eSwgYm93IG9mIHN1biwgLi4uXG4vLyAgLSBob3cgbWFueSBuZWNlc3NhcnkgaXRlbXMgYXJlIHRoZXJlP1xuLy8gICAgKG9idmlvdXNseSB0aGlzIGlzIHNlcGFyYXRlbHktbmVjZXNzYXJ5Li4uXG4vLyAgICAgdGhlcmUgd2lsbCBiZSBzb21lIGFsdGVybmF0aXZlcyB3aGVyZSBuZWl0aGVyXG4vLyAgICAgc2luZ2xlIGl0ZW0gaXMgbmVjZXNzYXJ5IGJ1dCBvbmUgb3IgdGhlIG90aGVyIGlzKVxuLy8gIC0gY29ycmVsYXRpb25zIGJldHdlZW4gaXRlbSBsb2NhdGlvbnMgaW4gdGhlIHNhbWUgc2VlZD9cbi8vICAtIGhvdyBkZWVwIHdhcyBpdGVtIC0tLSBob3cgdG8gY29tcHV0ZT8gIHdvdWxkIGxpa2Vcbi8vICAgIGUuZy4gbWluaW11bSBwYXRoIHRvIGdldCBpdCwgYnV0IHRoYXQgc2VlbXMgaGFyZC5cbi8vICAtIHdoYXQgYmxvY2tzIHdoYXQgLSByZW1vdmUgc2hlbGwgZmx1dGUsIGNhbiBzdGlsbCBnZXQgZmxpZ2h0P1xuLy8gIC0gaW5kZXggaW4gZGZzXG4vLyBzdWNjZXNzIHJhdGUsIHdoZXJlIGFyZSBzZWVkcyBmYWlsaW5nP1xuXG4vLyAgLSB1c2VmdWxuZXNzIG9mIGVhY2ggaXRlbVxuLy8gICAgLSBnaXZlbiBlYWNoIHNsb3QsIHdoYXQgYXJlIHJlcXVpcmVtZW50cz9cbi8vICAgIC0gbmVlZCB0byByZW1vdmUgaW1wb3NzaWJsZSBwYXRocz9cbi8vICAgIC0gdGhlbiBmb3IgTiBwYXRocywgMS9OIGZvciBlYWNoIHBhdGggaXRlbSBpcyBpblxuLy8gICAgLT4gaG93IG1hbnkgc2xvdHMgZG9lcyBpdGVtIHVubG9jay5cbi8vICAgICAgIC0gY291bGQgZG8gdGhpcyBjdW11bGF0aXZlbHk/XG5cbi8vIEEgOiBCIHwgQyAmIERcbi8vIEIgOiBBICYgQyB8IEEgJiBEXG4vLyBDIDogRFxuLy8gRCA6XG4vLyBUaGVuIEEgOiBCIGlzIHVzZWxlc3MgYmVjYXVzZSBhbGwgQiA6IEEuXG4vLyBCdXQgY291bGQgYmUgdHJhbnNpdGl2ZVxuLy8gQSA6IEIgfCBEXG4vLyBCIDogQ1xuLy8gQyA6IEEgJiBEXG4vLyBEIDogRVxuLy8gRSA6XG4vLyBJZiB3ZSBzdWJcbi8vICAgQSAtPiAoQykgfCAoRSlcbi8vICAgICAtPiAoQSAmIEQpIHwgKClcbi8vIEV2ZW50dWFsbHkgZXZlcnl0aGluZyBzaG91bGQgZWl0aGVyIGN5Y2xlIG9yXG4vLyBlbXB0eSBvdXQuLi4gd2Ugd2FudCB0aGUgcGF0aHMgdGhhdCBkb24ndCBjeWNsZVxuLy8gYnV0IHdlIGRvbid0IGhhdmUgYSBnb29kIHdheSB0byBzdWIgYW5kIGtlZXAgdHJhY2tcbi8vIG9mIHdoZXJlIGV2ZXJ5dGhpbmcgY2FtZSBmcm9tLi4uXG5cbi8vIERFUFRIIC0+IGhvdyBtYW55IHVubG9ja3MgZG8geW91IG5lZWQuLi5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vLyBleHBvcnQgY2xhc3MgRmlsbGluZyB7XG4vLyAgIGNvbnN0cnVjdG9yKCkge1xuLy8gICAgIHRoaXMuZGF0YSA9IFtdO1xuLy8gICB9XG5cbi8vICAgaGFzKHNsb3QpIHt9XG5cbi8vICAgZ2V0KHNsb3QpIHt9XG5cbi8vICAgc2V0KHNsb3QsIGl0ZW0pIHt9XG5cbi8vICAgLyoqIGZvciBvdmVycmlkZSAqL1xuLy8gICBmaXRzKHNsb3QsIGl0ZW0pIHtcbi8vICAgICAvLyB0b2RvIC0gaW4gc3ViY2xhc3MsIGtlZXAgdHJhY2sgb2YgbnVtYmVyIG9mXG4vLyAgICAgLy8gbm9uLWNoZXN0IHNsb3RzIHRoYXQgbmVlZCB0byBiZSBmaWxsZWQuLi5cblxuLy8gICAgIC8vIGFsdGVybmF0aXZlbHksIGp1c3QgaGF2ZSBzZXQoKSByZXR1cm4gYSBib29sZWFuXG4vLyAgICAgLy8gZm9yIHdoZXRoZXIgaXQgc3VjY2VlZGVkLi4uXG4vLyAgICAgcmV0dXJuIHRydWU7XG4vLyAgIH1cblxuLy8gfVxuXG5mdW5jdGlvbiBnZXRGaXJzdDxUPihpdGVyOiBJdGVyYWJsZTxUPik6IFQge1xuICBmb3IgKGNvbnN0IGkgb2YgaXRlcikgcmV0dXJuIGk7XG4gIHRocm93IG5ldyBFcnJvcignRW1wdHkgaXRlcmFibGUnKTtcbn1cblxuZnVuY3Rpb24gc2V0SXRlbShmbGFnOiBudW1iZXIsIHNsb3Q6IFNsb3QpOiBudW1iZXIge1xuICByZXR1cm4gZmxhZyA8IDAgPyB+KDB4MjAwIHwgc2xvdC5pdGVtSW5kZXgpIDogMHgyMDAgfCBzbG90Lml0ZW1JbmRleDtcbn1cbiJdfQ==