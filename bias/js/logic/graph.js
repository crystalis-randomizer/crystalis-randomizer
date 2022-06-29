import { Bits } from '../bits.js';
import { Random } from '../random.js';
import { hex } from '../rom/util.js';
import { Keyed, ArrayMap, MutableArrayBiMap, iters, spread } from '../util.js';
import { die } from '../assert.js';
const SLOT_TEMPERATURE = 2;
const ITEM_TEMPERATURE = 2;
export class Graph {
    constructor(worlds) {
        var _a;
        this.worlds = worlds;
        const provided = new Set();
        const required = new Set();
        const slots = new Map();
        const items = new Map();
        for (let i = 0; i < worlds.length; i++) {
            const world = worlds[i];
            const worldId = i << 24;
            for (const [providedId, requirement] of world.requirements) {
                provided.add(worldId | providedId);
                for (const route of requirement) {
                    for (const cond of route) {
                        required.add(worldId | cond);
                    }
                }
            }
            for (const [itemId, info] of world.items) {
                items.set((worldId | itemId), info);
            }
            for (const [slotId, info] of world.slots) {
                slots.set((worldId | slotId), info);
            }
        }
        this.itemInfos = new Map(items);
        this.slotInfos = new Map(slots);
        this.progression = new Set(required);
        for (const item of items.keys())
            required.add(item);
        const common = new Set();
        const extraProvides = new Set();
        const extraRequires = new Set();
        for (const check of required) {
            (provided.has(check) ? common : extraRequires).add(check);
        }
        for (const check of provided) {
            if (!required.has(check))
                extraProvides.add(check);
        }
        this.common = common.size;
        this.slots = new ArrayMap([...common, ...extraProvides]);
        this.items = new ArrayMap([...common, ...extraRequires]);
        const graph = [];
        const unlocks = [];
        for (let i = 0; i < worlds.length; i++) {
            const worldId = i << 24;
            for (const [slot, req] of worlds[i].requirements) {
                const slotIndex = this.slots.index((worldId | slot));
                if (slotIndex == null) {
                    throw new Error(`Provided a non-slot? ${hex(slot)}`);
                }
                for (const cs of req) {
                    const is = [...cs].map(c => { var _a; return (_a = this.items.index((worldId | c))) !== null && _a !== void 0 ? _a : die(); });
                    (graph[slotIndex] || (graph[slotIndex] = [])).push(Bits.from(is));
                    for (const i of is) {
                        (unlocks[i] || (unlocks[i] = new Set())).add(slotIndex);
                    }
                }
            }
        }
        for (let i = 0; i < this.slots.length; i++) {
            if (!graph[i] || !graph[i].length) {
                const id = (_a = this.slots.get(i)) !== null && _a !== void 0 ? _a : NaN;
                const name = this.checkName(id);
                console.error(`Nothing provided $${hex(id)}: ${name} (index ${i})`);
            }
        }
        this.graph = new Keyed(graph);
        this.unlocks = new Keyed(unlocks.map(spread));
    }
    computeWeights(random = new Random(), traverses = 1) {
        const itemWeights = Array.from({ length: this.items.length }, () => 0);
        const slotWeights = Array.from({ length: this.slots.length }, () => 0);
        const progressionItems = [];
        for (const [index, id] of this.items) {
            if (id >= 0x200 && id < 0x280 && this.progression.has(id))
                progressionItems.push(index);
        }
        for (let i = 0; i < traverses; i++) {
            const items = random.shuffle([...progressionItems]);
            let has = Bits.of();
            let reachable = this.traverse(() => undefined, has);
            let step = 0;
            for (const item of items) {
                step++;
                has = Bits.with(has, item);
                const newReachable = this.traverse(() => undefined, has);
                let newCount = 0;
                for (const slot of newReachable) {
                    if (reachable.has(slot))
                        continue;
                    slotWeights[slot] += step;
                    newCount++;
                }
                itemWeights[item] += newCount;
                reachable = newReachable;
            }
        }
        return {
            items: new Keyed(itemWeights.map(x => x / traverses)),
            slots: new Keyed(slotWeights.map(x => x / traverses)),
        };
    }
    reportWeights() {
        const weights = this.computeWeights(new Random(), 10);
        const itemWeights = weights.items.map((w, i) => [i, w]);
        const slotWeights = weights.slots.map((w, i) => [i, w]);
        function itemName(id) {
            const rom = globalThis.rom;
            if ((id & ~0xff) === 0x200 && rom && rom.items[id & 0xff]) {
                return rom.items[id & 0xff].messageName;
            }
            return `$${id.toString(16).padStart(2, '0')}`;
        }
        itemWeights.sort((a, b) => b[1] - a[1]);
        slotWeights.sort((a, b) => b[1] - a[1]);
        for (const [index, weight] of itemWeights) {
            const id = this.items.get(index);
            if (!this.itemInfos.has(id))
                continue;
            if (!this.progression.has(id))
                continue;
            console.log(`Item ${itemName(id)}: ${weight}`);
        }
        for (const [index, weight] of slotWeights) {
            const id = this.slots.get(index);
            if (!this.slotInfos.has(id))
                continue;
            console.log(`Slot ${this.checkName(id)}: ${weight}`);
        }
    }
    async shuffle(flagset, random, attempts = 200, progress, spoiler) {
        globalThis.graph = this;
        if (progress)
            progress.addTasks(Math.floor(attempts / 10));
        const weights = this.computeWeights(random, 1);
        ATTEMPT: for (let attempt = 0; attempt < attempts; attempt++) {
            if (progress && (attempt % 10 === 9)) {
                progress.addCompleted(1);
                await new Promise(requestAnimationFrame);
            }
            const fill = new MutableArrayBiMap();
            this.prefill(fill, random);
            const indexFill = this.compressFill(fill);
            const items = [...random.ishuffleMetropolis(this.itemPool(indexFill.values(), weights), ITEM_TEMPERATURE)].reverse();
            let has = Bits.from(new Set(items));
            const backtracks = Math.floor(attempt / 5);
            if (!this.fillInternal(indexFill, items, has, random, weights, flagset, backtracks)) {
                continue;
            }
            const path = spoiler ? [] : undefined;
            const final = this.traverse(i => indexFill.get(i), Bits.of(), path);
            const sphereAnalysis = this.analyzeSpheres(i => indexFill.get(i));
            for (const [id, , sphere] of sphereAnalysis) {
                if (id === 0x248 && sphere < 10 - attempt / 4)
                    continue ATTEMPT;
            }
            if (final.size !== this.slots.length) {
                const ns = (si) => `${String(si).padStart(3)} ${this.slots.get(si).toString(16).padStart(3, '0')} ${this.checkName(this.slots.get(si))}`;
                const ni = (ii) => `${String(ii).padStart(3)} ${this.items.get(ii).toString(16).padStart(3, '0')} ${this.checkName(this.items.get(ii))}`;
                const missing = new Set([...this.slots].map(x => x[0]));
                for (const slot of final)
                    missing.delete(slot);
                const missingMap = new Map();
                for (const slot of missing) {
                    missingMap.set(ns(slot), this.graph.get(slot)
                        .map(r => '\n    ' + Bits.bits(r).map(ni)
                        .join(' & ')).join(''));
                }
                console.error(`Initial fill never reached slots:\n  ${[...missingMap.keys()].sort()
                    .map(k => k + missingMap.get(k)).join('\n  ')}`);
                continue;
            }
            this.expandFill(indexFill, fill);
            const out = this.fillNonProgression(fill, flagset, random);
            if (out == null)
                continue;
            if (progress) {
                progress.addCompleted(Math.floor((attempts - attempt) / 100));
            }
            if (spoiler) {
                for (const [slot, item] of fill) {
                    const name = this.checkName(slot).replace(/^[0-9a-f]{3} /, '');
                    spoiler.addSlot(slot, name, item);
                }
                if (path) {
                    for (const [target, ...deps] of path) {
                        if (target < this.common || indexFill.has(target)) {
                            spoiler.addCheck(this.slots.get(target), deps.map(d => this.items.get(d)));
                        }
                    }
                }
            }
            return out;
        }
        return null;
    }
    fillInternal(fill, items, has, random, weights, flagset, backsteps) {
        var _a;
        const fixed = new Set(fill.keys());
        for (let bit = items.pop(); bit != null; bit = items.pop()) {
            if (!Bits.has(has, bit))
                continue;
            const itemInfo = this.itemInfoFromIndex(bit);
            has = Bits.without(has, bit);
            const reachable = [...this.traverse(i => fill.get(i), has)].map(i => [weights.slots.get(i) || 0, i]);
            let found = false;
            const checked = new Set(fill.keys());
            for (const slot of random.ishuffleMetropolis(reachable, (SLOT_TEMPERATURE + backsteps) * (backsteps + 1))) {
                if (checked.has(slot))
                    continue;
                checked.add(slot);
                const slotInfo = this.slotInfoFromIndex(slot);
                if (!slotInfo ||
                    flagset.preserveUniqueChecks() && !slotInfo.unique ||
                    !this.fits(slotInfo, itemInfo, flagset)) {
                    continue;
                }
                fill.set(slot, bit);
                found = true;
                break;
            }
            if (found)
                continue;
            checked.clear();
            if (backsteps-- > 0) {
                for (const slot of random.ishuffleMetropolis(reachable, 100)) {
                    if (checked.has(slot) || !fill.has(slot) || fixed.has(slot))
                        continue;
                    checked.add(slot);
                    const slotInfo = this.slotInfoFromIndex(slot);
                    if (!slotInfo || !this.fits(slotInfo, itemInfo, flagset))
                        continue;
                    const previousItem = (_a = fill.replace(slot, bit)) !== null && _a !== void 0 ? _a : die();
                    has = Bits.with(has, previousItem);
                    items.push(previousItem);
                    random.shuffle(items);
                    found = true;
                    break;
                }
                if (found)
                    continue;
            }
            return false;
        }
        return true;
    }
    itemPool(exclude, weights) {
        const excludeSet = new Set(exclude);
        const arr = [];
        for (const [id] of this.itemInfos) {
            const index = this.items.index(id);
            if (index == null)
                continue;
            if (!this.progression.has(id))
                continue;
            if (excludeSet.has(index))
                continue;
            arr.push([weights.items.get(index) || 0, index]);
        }
        return arr;
    }
    fits(slot, item, flagset) {
        if (flagset.preserveUniqueChecks() &&
            item.unique && !slot.unique) {
            return false;
        }
        const preventLoss = item.preventLoss || slot.preventLoss;
        if (slot.lossy && item.losable && preventLoss)
            return false;
        return true;
    }
    fillNonProgression(fill, flagset, random) {
        const itemPasses = [[], [], []];
        const slotPasses = [[], []];
        for (const [itemId, info] of this.itemInfos) {
            if (fill.hasValue(itemId))
                continue;
            let index = 2;
            if (info.losable && info.preventLoss)
                index = 1;
            if (flagset.preserveUniqueChecks() && info.unique)
                index = 0;
            itemPasses[index].push(itemId);
        }
        for (const [slotId, info] of this.slotInfos) {
            if (fill.has(slotId))
                continue;
            const index = info.lossy && info.preventLoss ? 0 : 1;
            slotPasses[index].push(slotId);
        }
        for (const pass of [...itemPasses, ...slotPasses]) {
            random.shuffle(pass);
        }
        const n = (si) => this.checkName(si);
        const sc = iters.count(iters.concat(...slotPasses));
        const ic = iters.count(iters.concat(...itemPasses));
        if (ic > sc) {
            console.log(`Slots ${sc}:\n  ${[...iters.concat(...slotPasses)].map(n).join('\n  ')}`);
            console.log(`Items ${ic}:\n  ${[...iters.concat(...itemPasses)].map(n).join('\n  ')}`);
            throw new Error(`Too many items`);
        }
        for (const item of iters.concat(...itemPasses)) {
            let found = false;
            for (const slots of [...slotPasses]) {
                if (found)
                    break;
                for (let i = 0; i < slots.length; i++) {
                    if (this.fits(this.slotInfos.get(slots[i]), this.itemInfos.get(item), flagset)) {
                        fill.set(slots[i], item);
                        found = true;
                        slots.splice(i, 1);
                        break;
                    }
                }
            }
            if (!found) {
                console.log(`Slots:\n  ${[...iters.concat(...slotPasses)].map(n).join('\n  ')}`);
                console.error(`REROLL: Could not place item ${n(item)}`);
                return null;
            }
        }
        return new Map(fill);
    }
    traverse(fill, has, path) {
        has = Bits.clone(has);
        const reachable = new Set();
        const queue = new Set();
        for (let i = 0; i < this.slots.length; i++) {
            if (this.graph.get(i) == null) {
                console.dir(this);
                const id = this.slots.get(i);
                throw new Error(`Unreachable slot ${id === null || id === void 0 ? void 0 : id.toString(16)}`);
            }
            queue.add(i);
        }
        for (const n of queue) {
            queue.delete(n);
            if (reachable.has(n))
                continue;
            const needed = this.graph.get(n);
            if (needed == null)
                throw new Error(`Not in graph: ${n}`);
            for (let i = 0, len = needed.length; i < len; i++) {
                if (!Bits.containsAll(has, needed[i]))
                    continue;
                if (path)
                    path.push([n, ...Bits.bits(needed[i])]);
                reachable.add(n);
                const items = [];
                if (n < this.common)
                    items.push(n);
                const filled = fill(n);
                if (filled != null)
                    items.push(filled);
                for (const item of items) {
                    has = Bits.with(has, item);
                    for (const j of this.unlocks.get(item) || []) {
                        if (this.graph.get(j) == null) {
                            console.dir(this);
                            throw new Error(`Adding bad node ${j} from unlock ${item}`);
                        }
                        queue.add(j);
                    }
                }
                break;
            }
        }
        return reachable;
    }
    analyzeSpheres2(fill) {
        let has = Bits.of();
        let sphere = 0;
        let next = Bits.of();
        const result = [];
        const unseen = new Set(Array.from({ length: this.slots.length }, (_, i) => i));
        do {
            const queue = new Set(unseen);
            next = Bits.of();
            for (const n of queue) {
                const needed = this.graph.get(n);
                for (let i = 0, len = needed.length; i < len; i++) {
                    if (!Bits.containsAll(has, needed[i]))
                        continue;
                    unseen.delete(n);
                    const items = [];
                    if (n < this.common)
                        items.push(n);
                    const filled = fill(n);
                    if (filled != null)
                        items.push(filled);
                    for (const item of items) {
                        const id = this.items.get(item);
                        if (id != null && id >= 0x200 && id < 0x280) {
                            result.push([this.itemNameFromIndex(item), sphere, this.checkName(this.slots.get(n))]);
                            next = Bits.with(next, item);
                        }
                        else {
                            has = Bits.with(has, item);
                            for (const j of this.unlocks.get(item) || []) {
                                if (unseen.has(j))
                                    queue.add(j);
                            }
                        }
                    }
                    break;
                }
            }
            has = Bits.union(has, next);
            if (!Bits.empty(next))
                sphere++;
        } while (unseen.size);
        return result;
    }
    analyzeSpheres(fill) {
        let has = Bits.of();
        let sphere = 0;
        const result = [];
        while (true) {
            const reachable = this.traverse(() => undefined, has);
            let progress = false;
            for (const slot of reachable) {
                const item = fill(slot);
                if (item == null || Bits.has(has, item))
                    continue;
                has = Bits.with(has, item);
                progress = true;
                const id = this.items.get(item);
                if (id != null && id >= 0x200 && id < 0x280) {
                    result.push([id, this.itemNameFromIndex(item), sphere, this.checkName(this.slots.get(slot))]);
                }
            }
            if (!progress)
                break;
            sphere++;
        }
        return result;
    }
    expandFill(indexFill, fill) {
        for (const [slotIndex, itemIndex] of indexFill) {
            const slotId = this.slots.get(slotIndex);
            const itemId = this.items.get(itemIndex);
            if (slotId == null || itemId == null)
                throw new Error(`missing`);
            fill.replace(slotId, itemId);
        }
    }
    compressFill(fill) {
        const indexFill = new MutableArrayBiMap();
        for (const [slotId, itemId] of fill) {
            const slotIndex = this.slots.index(slotId);
            const itemIndex = this.items.index(itemId);
            if (slotIndex == null || itemIndex == null) {
                throw new Error(`Bad slot/item: ${slotId} ${slotIndex} ${itemId} ${itemIndex}`);
            }
            indexFill.set(slotIndex, itemIndex);
        }
        return indexFill;
    }
    checkName(id) {
        return this.worlds[id >>> 24].checkName(id & 0xffffff);
    }
    itemNameFromIndex(index) {
        var _a;
        if (index < this.common)
            return this.checkName(this.slots.get(index));
        const id = this.items.get(index);
        if (!id || (id & ~0xff) !== 0x200)
            return '$' + hex(id);
        return ((_a = globalThis.rom.items[id & 0xff]) === null || _a === void 0 ? void 0 : _a.messageName) || '$' + hex(id);
    }
    prefill(fill, random) {
        for (let i = 0; i < this.worlds.length; i++) {
            const worldId = i << 24;
            const worldFill = this.worlds[i].prefill(random);
            for (const [slot, item] of worldFill) {
                fill.set((worldId | slot), (worldId | item));
            }
        }
    }
    itemInfoFromIndex(item) {
        const id = this.items.get(item);
        if (id == null)
            throw new Error(`Bad item: ${item}`);
        return this.itemInfoFromId(id);
    }
    itemInfoFromId(id) {
        const info = this.itemInfos.get(id);
        if (info == null)
            throw new Error(`Missing info: ${hex(id)}`);
        return info;
    }
    slotInfoFromIndex(slot) {
        const id = this.slots.get(slot);
        if (id == null)
            throw new Error(`Bad slot: ${slot}`);
        return this.slotInfoFromId(id);
    }
    slotInfoFromId(id) {
        const info = this.slotInfos.get(id);
        if (info != null)
            return info;
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvZ3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVoQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRXBDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuQyxPQUFPLEVBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFakMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7QUFDM0IsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7QUF5RDNCLE1BQU0sT0FBTyxLQUFLO0lBb0JoQixZQUE2QixNQUErQjs7UUFBL0IsV0FBTSxHQUFOLE1BQU0sQ0FBeUI7UUFRMUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hCLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO2dC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QWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsY0FBYyxDQUFDLEVBQVU7UUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEMsSUFBSSxJQUFJLElBQUksSUFBSTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRTlCLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Qml0c30gZnJvbSAnLi4vYml0cy5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4uL3JvbS9zcG9pbGVyLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge0tleWVkLCBBcnJheU1hcCwgTXV0YWJsZUFycmF5QmlNYXAsIGl0ZXJzLCBzcHJlYWR9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtkaWV9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5cbmNvbnN0IFNMT1RfVEVNUEVSQVRVUkUgPSAyO1xuY29uc3QgSVRFTV9URU1QRVJBVFVSRSA9IDI7XG5cbi8qKiBJbnB1dCBmb3IgdGhlIGdyYXBoLiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2NhdGlvbkxpc3Qge1xuICB3b3JsZE5hbWU6IHN0cmluZztcbiAgaXRlbXM6IFJlYWRvbmx5TWFwPG51bWJlciwgSXRlbUluZm8+O1xuICBzbG90czogUmVhZG9ubHlNYXA8bnVtYmVyLCBTbG90SW5mbz47XG4gIHJlcXVpcmVtZW50czogUmVhZG9ubHlNYXA8bnVtYmVyLCBJdGVyYWJsZTxJdGVyYWJsZTxudW1iZXI+Pj47XG4gIGNoZWNrTmFtZTogKG5vZGU6IG51bWJlcikgPT4gc3RyaW5nO1xuICBwcmVmaWxsOiAocmFuZG9tOiBSYW5kb20pID0+IE1hcDxudW1iZXIsIG51bWJlcj47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSXRlbUluZm8ge1xuICAvKiogVW5pcXVlIGl0ZW1zIGNhbiBvcHRpb25hbGx5IGJlIHNodWZmbGVkIHNlcGFyYXRlbHkuICovXG4gIHVuaXF1ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBMb3NhYmxlIGl0ZW1zIGFyZSBhdCByaXNrIG9mIGJlaW5nIGxvc3QgaWYgdGhleSBhcmUgcGxhY2VkIGluIGEgbG9zc3kgc2xvdFxuICAgKiAoaS5lLiBpZiB0aGUgaW52ZW50b3J5IGlzIGZ1bGwpLlxuICAgKi9cbiAgbG9zYWJsZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBMb3NhYmxlIGl0ZW1zIG1heSBiZSBwcm90ZWN0ZWQsIG1lYW5pbmcgdGhhdCB0aGV5IHdpbGwgbm90IGJlIHBsYWNlZCBpbiBhXG4gICAqIGxvc3N5IHNsb3QuXG4gICAqL1xuICBwcmV2ZW50TG9zcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXZWlnaHQgZm9yIHBsYWNlbWVudC4gIEhpZ2hlciBudW1iZXJzIGFyZSBtb3JlIGxpa2VseSB0byBiZSBwbGFjZWQgZWFybGllci5cbiAgICogRGVmYXVsdCBpcyAxLiAgUG93ZXJmdWwgYW5kIGltcG9ydGFudCBpdGVtcyBzaG91bGQgYmUgZ2l2ZW4gbGFyZ2VyIHdlaWdodHNcbiAgICogdG8gbWFrZSBpdCBsZXNzIGxpa2VseSB0aGF0IHRoZXkgYWx3YXlzIGVuZCB1cCBpbiBlYXJseSBzcGhlcmVzLlxuICAgKi9cbiAgd2VpZ2h0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNsb3RJbmZvIHtcbiAgLyoqIFdoZXRoZXIgdGhlIHNsb3QgY2FuIGhvbGQgYSB1bmlxdWUgaXRlbS4gKi9cbiAgdW5pcXVlPzogYm9vbGVhbjtcbiAgLyoqIFdoZXRoZXIgbG9zYWJsZSBpdGVtcyBpbiB0aGlzIHNsb3QgYXJlIGF0IHJpc2sgb2YgYmVpbmcgbG9zdC4gKi9cbiAgbG9zc3k6IGJvb2xlYW47XG4gIC8qKiBXaGV0aGVyIHRoZSBzbG90IGlzIGRpc2FsbG93ZWQgZnJvbSBsb3NpbmcgaXRlbXMgKGUuZy4gdHJpZ2dlcnMpLiAqL1xuICBwcmV2ZW50TG9zcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXZWlnaHQgZm9yIHBsYWNpbmcgcHJvZ3Jlc3Npb24gaXRlbXMuICBEZWZhdWx0IGlzIDEuICBVc2VmdWwgZm9yIG1ha2luZ1xuICAgKiBkaXN0YW50IGFuZCBvdXQtb2YtdGhlIHdheSBjaGVja3MgbW9yZSB3b3J0aHdoaWxlLiAgQWx0ZXJuYXRpdmVseSwgd2VcbiAgICogY291bGQganVzdCBhdm9pZCBldmVyIHBsYWNpbmcgbWltaWNzIGluIHRoZXNlIGFyZWFzP1xuICAgKi9cbiAgd2VpZ2h0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgdHlwZSBTbG90SW5kZXggPSBudW1iZXIgJiB7X19zbG90SW5kZXhfXzogbmV2ZXJ9O1xuZXhwb3J0IHR5cGUgSXRlbUluZGV4ID0gbnVtYmVyICYge19faXRlbUluZGV4X186IG5ldmVyfTtcbmV4cG9ydCB0eXBlIFNsb3RJZCA9IG51bWJlciAmIHtfX3Nsb3RJZF9fOiBuZXZlcn07XG5leHBvcnQgdHlwZSBJdGVtSWQgPSBudW1iZXIgJiB7X19pdGVtSWRfXzogbmV2ZXJ9O1xuXG4vKipcbiAqIEEgZ3JhcGggZGF0YSBzdHJ1Y3R1cmUuICBJbml0aWFsaXplZCB3aXRoIG9uZSBvciBtb3JlIGxvY2F0aW9uIGxpc3RzXG4gKiAoYSBzZXQgb2YgRE5GIGV4cHJlc3Npb25zIHByb3ZpZGluZyBhIGJ1bmNoIG9mIG51bWVyaWMgZmxhZ3MpLlxuICovXG5leHBvcnQgY2xhc3MgR3JhcGgge1xuXG4gIC8vcHJpdmF0ZSByZWFkb25seSByZXZlcnNlV29ybGRzOiBSZWFkb25seU1hcDxMb2NhdGlvbkxpc3QsIG51bWJlcj47XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tbW9uOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2xvdHM6IEFycmF5TWFwPFNsb3RJbmRleCwgU2xvdElkPjtcbiAgcHJpdmF0ZSByZWFkb25seSBpdGVtczogQXJyYXlNYXA8SXRlbUluZGV4LCBJdGVtSWQ+O1xuICAvLyBOb3RlIHRoYXQgbm90IGV2ZXJ5IGl0ZW0gZ2V0cyBhbiBpbmRleCAtIG9ubHkgdGhvc2UgaW4gdGhlIGdyYXBoLlxuICBwcml2YXRlIHJlYWRvbmx5IHNsb3RJbmZvczogUmVhZG9ubHlNYXA8U2xvdElkLCBTbG90SW5mbz47XG4gIHByaXZhdGUgcmVhZG9ubHkgaXRlbUluZm9zOiBSZWFkb25seU1hcDxJdGVtSWQsIEl0ZW1JbmZvPjtcblxuICAvLyBJdGVtcyB0aGF0IHByb3ZpZGUgcHJvZ3Jlc3Npb24uXG4gIHByaXZhdGUgcmVhZG9ubHkgcHJvZ3Jlc3Npb246IFNldDxJdGVtSWQ+O1xuXG4gIC8vIC8qKiBNYXBwaW5nIG9mIHByb3ZpZGVzIHRvIHRoZSBzYW1lIHJlcXVpcmVzLiAqL1xuICAvLyBwcml2YXRlIHJlYWRvbmx5IGNvbW1vbkZpbGw6IEFycmF5TWFwPFNsb3RJbmRleCwgSXRlbUluZGV4PjtcblxuICAvKiogQml0c2V0cyBrZXllZCBieSBJdGVtSW5kZXgsIHJlcHJlc2VudCBhIERORiBjb25kaXRpb24uICovXG4gIHJlYWRvbmx5IGdyYXBoOiBLZXllZDxTbG90SW5kZXgsIHJlYWRvbmx5IEJpdHNbXT47XG4gIHJlYWRvbmx5IHVubG9ja3M6IEtleWVkPEl0ZW1JbmRleCwgcmVhZG9ubHkgU2xvdEluZGV4W10+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgd29ybGRzOiByZWFkb25seSBMb2NhdGlvbkxpc3RbXSkge1xuICAgIC8vY29uc3QgcmV2ZXJzZVdvcmxkcyA9IG5ldyBNYXA8TG9jYXRpb25MaXN0LCBudW1iZXI+KCk7XG4gICAgLy9mb3IgKGxldCBpID0gMDsgaSA8IHdvcmxkcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICByZXZlcnNlV29ybGRzLnNldCh3b3JsZHNbaV0sIGkpO1xuICAgIC8vfVxuICAgIC8vdGhpcy5yZXZlcnNlV29ybGRzID0gcmV2ZXJzZVdvcmxkcztcblxuICAgIC8vIEJ1aWxkIHVwIGEgbGlzdCBvZiBhbGwga25vd24gcHJvdmlkZXMvcmVxdWlyZXMuXG4gICAgY29uc3QgcHJvdmlkZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCByZXF1aXJlZCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHNsb3RzID0gbmV3IE1hcDxTbG90SWQsIFNsb3RJbmZvPigpO1xuICAgIGNvbnN0IGl0ZW1zID0gbmV3IE1hcDxJdGVtSWQsIEl0ZW1JbmZvPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd29ybGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB3b3JsZCA9IHdvcmxkc1tpXTtcbiAgICAgIGNvbnN0IHdvcmxkSWQgPSBpIDw8IDI0O1xuICAgICAgZm9yIChjb25zdCBbcHJvdmlkZWRJZCwgcmVxdWlyZW1lbnRdIG9mIHdvcmxkLnJlcXVpcmVtZW50cykge1xuICAgICAgICBwcm92aWRlZC5hZGQod29ybGRJZCB8IHByb3ZpZGVkSWQpO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJlcXVpcmVtZW50KSB7XG4gICAgICAgICAgZm9yIChjb25zdCBjb25kIG9mIHJvdXRlKSB7XG4gICAgICAgICAgICByZXF1aXJlZC5hZGQod29ybGRJZCB8IGNvbmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSAgICAgICAgXG4gICAgICB9XG5cbiAgICAgIC8vIFByb2JhYmx5IGp1c3QgbWFrZSBhIGNvbW1vbiBpbmRleCBmaWxsIGFuZCBkbyBhIGZ1bGwgaW5kaXJlY3Rpb24/XG4gICAgICAvLyAgLSBpZiBpdCdzIGluIHRoZSBjb21tb24gZmlsbCwgdXNlIGl0LCBvdGhlcndpc2UgZmFsbCBiYWNrIG9uIHRoZVxuICAgICAgLy8gICAgaXRlbSBmaWxsP1xuXG4gICAgICBmb3IgKGNvbnN0IFtpdGVtSWQsIGluZm9dIG9mIHdvcmxkLml0ZW1zKSB7XG4gICAgICAgIGl0ZW1zLnNldCgod29ybGRJZCB8IGl0ZW1JZCkgYXMgSXRlbUlkLCBpbmZvKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW3Nsb3RJZCwgaW5mb10gb2Ygd29ybGQuc2xvdHMpIHtcbiAgICAgICAgc2xvdHMuc2V0KCh3b3JsZElkIHwgc2xvdElkKSBhcyBTbG90SWQsIGluZm8pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvcHkgdGhlIG1hcHMgYW5kIHNhdmUgdGhlbSBiZWZvcmUgd2Ugc3RhcnQgZGVsZXRpbmcgZWxlbWVudHMuXG4gICAgdGhpcy5pdGVtSW5mb3MgPSBuZXcgTWFwKGl0ZW1zKTtcbiAgICB0aGlzLnNsb3RJbmZvcyA9IG5ldyBNYXAoc2xvdHMpO1xuXG4gICAgdGhpcy5wcm9ncmVzc2lvbiA9IG5ldyBTZXQocmVxdWlyZWQgYXMgU2V0PEl0ZW1JZD4pO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcy5rZXlzKCkpIHJlcXVpcmVkLmFkZChpdGVtKTsgLy8gbm9uLXByb2dyZXNzaW9uIGxhc3RcblxuICAgIGNvbnN0IGNvbW1vbiA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IGV4dHJhUHJvdmlkZXMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCBleHRyYVJlcXVpcmVzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBjaGVjayBvZiByZXF1aXJlZCkge1xuICAgICAgKHByb3ZpZGVkLmhhcyhjaGVjaykgPyBjb21tb24gOiBleHRyYVJlcXVpcmVzKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHByb3ZpZGVkKSB7XG4gICAgICBpZiAoIXJlcXVpcmVkLmhhcyhjaGVjaykpIGV4dHJhUHJvdmlkZXMuYWRkKGNoZWNrKTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbW1vbiA9IGNvbW1vbi5zaXplO1xuICAgIHRoaXMuc2xvdHMgPSBuZXcgQXJyYXlNYXAoWy4uLmNvbW1vbiwgLi4uZXh0cmFQcm92aWRlc10gYXMgU2xvdElkW10pO1xuICAgIHRoaXMuaXRlbXMgPSBuZXcgQXJyYXlNYXAoWy4uLmNvbW1vbiwgLi4uZXh0cmFSZXF1aXJlc10gYXMgSXRlbUlkW10pO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIGdyYXBoIG5vdyB0aGF0IHdlIGhhdmUgdGhlIGFycmF5IG1hcHMuXG4gICAgY29uc3QgZ3JhcGg6IEJpdHNbXVtdID0gW107XG4gICAgY29uc3QgdW5sb2NrczogQXJyYXk8U2V0PFNsb3RJbmRleD4+ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHdvcmxkSWQgPSBpIDw8IDI0O1xuICAgICAgZm9yIChjb25zdCBbc2xvdCwgcmVxXSBvZiB3b3JsZHNbaV0ucmVxdWlyZW1lbnRzKSB7XG4gICAgICAgIGNvbnN0IHNsb3RJbmRleCA9IHRoaXMuc2xvdHMuaW5kZXgoKHdvcmxkSWQgfCBzbG90KSBhcyBTbG90SWQpO1xuICAgICAgICBpZiAoc2xvdEluZGV4ID09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb3ZpZGVkIGEgbm9uLXNsb3Q/ICR7aGV4KHNsb3QpfWApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICAgICAgY29uc3QgaXMgPVxuICAgICAgICAgICAgICBbLi4uY3NdLm1hcChjID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuaW5kZXgoKHdvcmxkSWQgfCBjKSBhcyBJdGVtSWQpID8/IGRpZSgpKTtcbiAgICAgICAgICAoZ3JhcGhbc2xvdEluZGV4XSB8fCAoZ3JhcGhbc2xvdEluZGV4XSA9IFtdKSkucHVzaChCaXRzLmZyb20oaXMpKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGkgb2YgaXMpIHtcbiAgICAgICAgICAgICh1bmxvY2tzW2ldIHx8ICh1bmxvY2tzW2ldID0gbmV3IFNldCgpKSkuYWRkKHNsb3RJbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2FuaXR5IGNoZWNrIHRvIG1ha2Ugc3VyZSBhbGwgc2xvdHMgYXJlIHByb3ZpZGVkLlxuICAgIGZvciAobGV0IGkgPSAwIGFzIFNsb3RJbmRleDsgaSA8IHRoaXMuc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghZ3JhcGhbaV0gfHwgIWdyYXBoW2ldLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBpZCA9IHRoaXMuc2xvdHMuZ2V0KGkpID8/IE5hTiBhcyBTbG90SWQ7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLmNoZWNrTmFtZShpZCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYE5vdGhpbmcgcHJvdmlkZWQgJCR7aGV4KGlkKX06ICR7bmFtZX0gKGluZGV4ICR7aX0pYCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZ3JhcGggPSBuZXcgS2V5ZWQoZ3JhcGgpO1xuICAgIHRoaXMudW5sb2NrcyA9IG5ldyBLZXllZCh1bmxvY2tzLm1hcChzcHJlYWQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEbyBvbmUgb3IgbW9yZSBzYW1wbGVzIG9mIGFuIGFyYml0cmFyeS1vcmRlcmVkIGl0ZW0gcGlja3VwIHRvXG4gICAqIG1lYXN1cmUgcm91Z2hseSB0aGUgd2VpZ2h0IG9mIGVhY2ggaXRlbSBhbmQgc2xvdC5cbiAgICovXG4gIGNvbXB1dGVXZWlnaHRzKHJhbmRvbSA9IG5ldyBSYW5kb20oKSwgdHJhdmVyc2VzID0gMSk6IFdlaWdodHMge1xuICAgIGNvbnN0IGl0ZW1XZWlnaHRzID0gQXJyYXkuZnJvbSh7bGVuZ3RoOiB0aGlzLml0ZW1zLmxlbmd0aH0sICgpID0+IDApO1xuICAgIGNvbnN0IHNsb3RXZWlnaHRzID0gQXJyYXkuZnJvbSh7bGVuZ3RoOiB0aGlzLnNsb3RzLmxlbmd0aH0sICgpID0+IDApO1xuICAgIGNvbnN0IHByb2dyZXNzaW9uSXRlbXMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtpbmRleCwgaWRdIG9mIHRoaXMuaXRlbXMpIHtcbiAgICAgIGlmIChpZCA+PSAweDIwMCAmJiBpZCA8IDB4MjgwICYmIHRoaXMucHJvZ3Jlc3Npb24uaGFzKGlkKSkgcHJvZ3Jlc3Npb25JdGVtcy5wdXNoKGluZGV4KTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0cmF2ZXJzZXM7IGkrKykge1xuICAgICAgY29uc3QgaXRlbXMgPSByYW5kb20uc2h1ZmZsZShbLi4ucHJvZ3Jlc3Npb25JdGVtc10pO1xuICAgICAgbGV0IGhhcyA9IEJpdHMub2YoKTtcbiAgICAgIGxldCByZWFjaGFibGUgPSB0aGlzLnRyYXZlcnNlKCgpID0+IHVuZGVmaW5lZCwgaGFzKTsgLy8oYykgPT4gYyA8PSB0aGlzLmNvbW1vbiA/IGMgYXMgYW55IDogdW5kZWZpbmVkLCBoYXMpO1xuICAgICAgbGV0IHN0ZXAgPSAwO1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgIHN0ZXArKztcbiAgICAgICAgaGFzID0gQml0cy53aXRoKGhhcywgaXRlbSk7XG4gICAgICAgIGNvbnN0IG5ld1JlYWNoYWJsZSA9IHRoaXMudHJhdmVyc2UoKCkgPT4gdW5kZWZpbmVkLCBoYXMpOyAvLyhjKSA9PiBjIDw9IHRoaXMuY29tbW9uID8gYyBhcyBhbnkgOiB1bmRlZmluZWQsIGhhcyk7XG4gICAgICAgIGxldCBuZXdDb3VudCA9IDA7XG4gICAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiBuZXdSZWFjaGFibGUpIHtcbiAgICAgICAgICBpZiAocmVhY2hhYmxlLmhhcyhzbG90KSkgY29udGludWU7XG4gICAgICAgICAgc2xvdFdlaWdodHNbc2xvdF0gKz0gc3RlcDtcbiAgICAgICAgICBuZXdDb3VudCsrO1xuICAgICAgICB9XG4gICAgICAgIGl0ZW1XZWlnaHRzW2l0ZW1dICs9IG5ld0NvdW50O1xuICAgICAgICByZWFjaGFibGUgPSBuZXdSZWFjaGFibGU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpdGVtczogbmV3IEtleWVkKGl0ZW1XZWlnaHRzLm1hcCh4ID0+IHggLyB0cmF2ZXJzZXMpKSxcbiAgICAgIHNsb3RzOiBuZXcgS2V5ZWQoc2xvdFdlaWdodHMubWFwKHggPT4geCAvIHRyYXZlcnNlcykpLFxuICAgIH07XG4gIH1cblxuICByZXBvcnRXZWlnaHRzKCkge1xuICAgIGNvbnN0IHdlaWdodHMgPSB0aGlzLmNvbXB1dGVXZWlnaHRzKG5ldyBSYW5kb20oKSwgMTApO1xuICAgIGNvbnN0IGl0ZW1XZWlnaHRzID0gd2VpZ2h0cy5pdGVtcy5tYXAoKHcsIGkpID0+IFtpLCB3XSBhcyBbSXRlbUluZGV4LCBudW1iZXJdKTtcbiAgICBjb25zdCBzbG90V2VpZ2h0cyA9IHdlaWdodHMuc2xvdHMubWFwKCh3LCBpKSA9PiBbaSwgd10gYXMgW1Nsb3RJbmRleCwgbnVtYmVyXSk7XG4gICAgZnVuY3Rpb24gaXRlbU5hbWUoaWQ6IG51bWJlcikge1xuICAgICAgY29uc3Qgcm9tID0gKGdsb2JhbFRoaXMgYXMgYW55KS5yb207XG4gICAgICBpZiAoKGlkICYgfjB4ZmYpID09PSAweDIwMCAmJiByb20gJiYgcm9tLml0ZW1zW2lkICYgMHhmZl0pIHtcbiAgICAgICAgcmV0dXJuIHJvbS5pdGVtc1tpZCAmIDB4ZmZdLm1lc3NhZ2VOYW1lO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGAkJHtpZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgIH1cbiAgICBpdGVtV2VpZ2h0cy5zb3J0KChhLCBiKSA9PiBiWzFdIC0gYVsxXSk7XG4gICAgc2xvdFdlaWdodHMuc29ydCgoYSwgYikgPT4gYlsxXSAtIGFbMV0pO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCB3ZWlnaHRdIG9mIGl0ZW1XZWlnaHRzKSB7XG4gICAgICAvL2lmIChpbmRleCA8IHRoaXMuY29tbW9uKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkID0gdGhpcy5pdGVtcy5nZXQoaW5kZXggYXMgSXRlbUluZGV4KSE7XG4gICAgICBpZiAoIXRoaXMuaXRlbUluZm9zLmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0aGlzLnByb2dyZXNzaW9uLmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgY29uc29sZS5sb2coYEl0ZW0gJHtpdGVtTmFtZShpZCl9OiAke3dlaWdodH1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIHdlaWdodF0gb2Ygc2xvdFdlaWdodHMpIHtcbiAgICAgIC8vaWYgKGluZGV4IDwgdGhpcy5jb21tb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSB0aGlzLnNsb3RzLmdldChpbmRleCBhcyBTbG90SW5kZXgpITtcbiAgICAgIGlmICghdGhpcy5zbG90SW5mb3MuaGFzKGlkKSkgY29udGludWU7XG4gICAgICBjb25zb2xlLmxvZyhgU2xvdCAke3RoaXMuY2hlY2tOYW1lKGlkKX06ICR7d2VpZ2h0fWApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNodWZmbGUoZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICBhdHRlbXB0cyA9IDIwMCwgLy8gMFxuICAgICAgICAgICAgICAgIHByb2dyZXNzPzogUHJvZ3Jlc3NUcmFja2VyLFxuICAgICAgICAgICAgICAgIHNwb2lsZXI/OiBTcG9pbGVyKTogUHJvbWlzZTxNYXA8U2xvdElkLCBJdGVtSWQ+fG51bGw+IHtcbiAgICAoZ2xvYmFsVGhpcyBhcyBhbnkpLmdyYXBoID0gdGhpcztcbiAgICBpZiAocHJvZ3Jlc3MpIHByb2dyZXNzLmFkZFRhc2tzKE1hdGguZmxvb3IoYXR0ZW1wdHMgLyAxMCkpO1xuICAgIGNvbnN0IHdlaWdodHMgPSB0aGlzLmNvbXB1dGVXZWlnaHRzKHJhbmRvbSwgMSk7IC8vIDEwMDApO1xuICAgIC8vIGNvbnN0IGl0ZW1XZWlnaHRzID0gbmV3IE1hcCh3ZWlnaHRzLml0ZW1zLm1hcCgodywgaSkgPT4gW2ksIHddIGFzIFtJdGVtSW5kZXgsIG51bWJlcl0pKTtcbiAgICAvLyBjb25zdCBzbG90V2VpZ2h0cyA9IG5ldyBNYXAod2VpZ2h0cy5zbG90cy5tYXAoKHcsIGkpID0+IFtpLCB3XSBhcyBbU2xvdEluZGV4LCBudW1iZXJdKSk7XG5BVFRFTVBUOlxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgYXR0ZW1wdHM7IGF0dGVtcHQrKykge1xuICAgICAgaWYgKHByb2dyZXNzICYmIChhdHRlbXB0ICUgMTAgPT09IDkpKSB7XG4gICAgICAgIHByb2dyZXNzLmFkZENvbXBsZXRlZCgxKTsgXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSk7IC8vIHRoaXMgcHJvYmFibHkgc2hvdWxkbid0IGJlIHJBRlxuICAgICAgfVxuICAgICAgY29uc3QgZmlsbCA9IG5ldyBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4oKTtcbiAgICAgIHRoaXMucHJlZmlsbChmaWxsLCByYW5kb20pO1xuICAgICAgY29uc3QgaW5kZXhGaWxsID0gdGhpcy5jb21wcmVzc0ZpbGwoZmlsbCk7XG4gICAgICBjb25zdCBpdGVtcyA9IFsuLi5yYW5kb20uaXNodWZmbGVNZXRyb3BvbGlzKHRoaXMuaXRlbVBvb2woaW5kZXhGaWxsLnZhbHVlcygpLCB3ZWlnaHRzKSwgSVRFTV9URU1QRVJBVFVSRSldLnJldmVyc2UoKTtcbiAgICAgIGxldCBoYXMgPSBCaXRzLmZyb20obmV3IFNldChpdGVtcykpO1xuICAgICAgY29uc3QgYmFja3RyYWNrcyA9IE1hdGguZmxvb3IoYXR0ZW1wdCAvIDUpO1xuICAgICAgaWYgKCF0aGlzLmZpbGxJbnRlcm5hbChpbmRleEZpbGwsIGl0ZW1zLCBoYXMsIHJhbmRvbSwgd2VpZ2h0cywgZmxhZ3NldCwgYmFja3RyYWNrcykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBwYXRoOiBudW1iZXJbXVtdfHVuZGVmaW5lZCA9IHNwb2lsZXIgPyBbXSA6IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGZpbmFsID0gdGhpcy50cmF2ZXJzZShpID0+IGluZGV4RmlsbC5nZXQoaSksIEJpdHMub2YoKSwgcGF0aCk7XG4gICAgICBjb25zdCBzcGhlcmVBbmFseXNpcyA9IHRoaXMuYW5hbHl6ZVNwaGVyZXMoaSA9PiBpbmRleEZpbGwuZ2V0KGkpKTtcbiAgICAgIGZvciAoY29uc3QgW2lkLCwgc3BoZXJlXSBvZiBzcGhlcmVBbmFseXNpcykge1xuICAgICAgICAvLyBNYWtlIGFuIGVmZm9ydCB0byBidXJ5IGZsaWdodC5cbiAgICAgICAgaWYgKGlkID09PSAweDI0OCAmJiBzcGhlcmUgPCAxMCAtIGF0dGVtcHQgLyA0KSBjb250aW51ZSBBVFRFTVBUO1xuICAgICAgfVxuICAgICAgLy8gZm9yIChjb25zdCBbLCBpdGVtLCBzcGhlcmUsIGNoZWNrXSBvZiBzcGhlcmVBbmFseXNpcykge1xuICAgICAgLy8gICBpZiAoJ2RvY3VtZW50JyBpbiBnbG9iYWxUaGlzKSB7XG4gICAgICAvLyAgICAgY29uc29sZS5sb2coYCR7aXRlbX06ICR7c3BoZXJlfSAoJHtjaGVja30pYCk7XG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH1cbiAgICAgIC8vIGlmICgnc3BoZXJlQW5hbHlzaXMnIGluIGdsb2JhbFRoaXMpIHtcbiAgICAgIC8vICAgZm9yIChjb25zdCBbLCBpdGVtLCBzcGhlcmVdIG9mIHNwaGVyZUFuYWx5c2lzKSB7XG4gICAgICAvLyAgICAgY29uc3Qgc3RhdHMgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLnNwaGVyZUFuYWx5c2lzLmdldChpdGVtKSB8fCBbXTtcbiAgICAgIC8vICAgICAoZ2xvYmFsVGhpcyBhcyBhbnkpLnNwaGVyZUFuYWx5c2lzLnNldChpdGVtLCBzdGF0cyk7XG4gICAgICAvLyAgICAgc3RhdHNbc3BoZXJlXSA9IChzdGF0c1tzcGhlcmVdIHx8IDApICsgMTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfVxuICAgICAgLy8gVE9ETyAtIGZsYWdzIHRvIGxvb3NlbiB0aGlzIHJlcXVpcmVtZW50IChiZWZvcmUgbG9nZ2luZyk/Pz9cbiAgICAgIC8vICAgICAgLSBidXQgaXQncyBhbHNvIGEgdXNlZnVsIGRpYWdub3N0aWMuXG4gICAgICBpZiAoZmluYWwuc2l6ZSAhPT0gdGhpcy5zbG90cy5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgbnMgPSAoc2k6IFNsb3RJbmRleCkgPT4gYCR7U3RyaW5nKHNpKS5wYWRTdGFydCgzKX0gJHtcbiAgICAgICAgICAgIHRoaXMuc2xvdHMuZ2V0KHNpKSEudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDMsICcwJyl9ICR7XG4gICAgICAgICAgICB0aGlzLmNoZWNrTmFtZSh0aGlzLnNsb3RzLmdldChzaSkhKX1gO1xuICAgICAgICBjb25zdCBuaSA9IChpaTogSXRlbUluZGV4KSA9PiBgJHtTdHJpbmcoaWkpLnBhZFN0YXJ0KDMpfSAke1xuICAgICAgICAgICAgdGhpcy5pdGVtcy5nZXQoaWkpIS50b1N0cmluZygxNikucGFkU3RhcnQoMywgJzAnKX0gJHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tOYW1lKHRoaXMuaXRlbXMuZ2V0KGlpKSEpfWA7XG4gICAgICAgIGNvbnN0IG1pc3NpbmcgPSBuZXcgU2V0KFsuLi50aGlzLnNsb3RzXS5tYXAoeCA9PiB4WzBdKSk7XG4gICAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiBmaW5hbCkgbWlzc2luZy5kZWxldGUoc2xvdCk7XG4gICAgICAgIGNvbnN0IG1pc3NpbmdNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgbWlzc2luZykge1xuICAgICAgICAgIG1pc3NpbmdNYXAuc2V0KFxuICAgICAgICAgICAgICBucyhzbG90KSxcbiAgICAgICAgICAgICAgdGhpcy5ncmFwaC5nZXQoc2xvdCkhXG4gICAgICAgICAgICAgICAgICAubWFwKHIgPT4gJ1xcbiAgICAnICsgKEJpdHMuYml0cyhyKSBhcyBJdGVtSW5kZXhbXSkubWFwKG5pKVxuICAgICAgICAgICAgICAgICAgLmpvaW4oJyAmICcpKS5qb2luKCcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTk9URTogcGF0aFtpXVswXSBpcyBzbG90IGluZGV4ZXMsIG5vdCBpdGVtcywgc28gdGhpcyBkb2VzIG5vdCB3b3JrLlxuICAgICAgICAvLyBjb25zdCBoYXMgPVxuICAgICAgICAvLyAgICAgKG5ldyBTZXQocGF0aCA/IHBhdGgubWFwKGkgPT4gaVswXSkgOiBzZXEodGhpcy5pdGVtcy5sZW5ndGgpKSkgYXNcbiAgICAgICAgLy8gICAgICAgICBTZXQ8SXRlbUluZGV4PjtcbiAgICAgICAgLy8gY29uc3Qgbm90SGFzID1cbiAgICAgICAgLy8gICAgIHNlcSh0aGlzLml0ZW1zLmxlbmd0aCwgaSA9PiBpIGFzIEl0ZW1JbmRleCkuZmlsdGVyKGkgPT4gIWhhcy5oYXMoaSkpXG4gICAgICAgIC8vICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEgLSBiKS5tYXAobmkpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGBJbml0aWFsIGZpbGwgbmV2ZXIgcmVhY2hlZCBzbG90czpcXG4gICR7XG4gICAgICAgICAgICAgICAgICAgICAgWy4uLm1pc3NpbmdNYXAua2V5cygpXS5zb3J0KClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChrID0+IGsgKyBtaXNzaW5nTWFwLmdldChrKSEpLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gfVxcblVuYXZhaWxhYmxlIGl0ZW1zOlxcbiAgJHtub3RIYXMuam9pbignXFxuICAnKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBmaW5hbCwgdGhpcyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5leHBhbmRGaWxsKGluZGV4RmlsbCwgZmlsbCk7XG4gICAgICBjb25zdCBvdXQgPSB0aGlzLmZpbGxOb25Qcm9ncmVzc2lvbihmaWxsLCBmbGFnc2V0LCByYW5kb20pO1xuICAgICAgaWYgKG91dCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGlmIChwcm9ncmVzcykge1xuICAgICAgICBwcm9ncmVzcy5hZGRDb21wbGV0ZWQoTWF0aC5mbG9vcigoYXR0ZW1wdHMgLSBhdHRlbXB0KSAvIDEwMCkpO1xuICAgICAgfVxuICAgICAgaWYgKHNwb2lsZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBbc2xvdCwgaXRlbV0gb2YgZmlsbCkge1xuICAgICAgICAgIC8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwLlxuICAgICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLmNoZWNrTmFtZShzbG90KS5yZXBsYWNlKC9eWzAtOWEtZl17M30gLywgJycpO1xuICAgICAgICAgIHNwb2lsZXIuYWRkU2xvdChzbG90LCBuYW1lLCBpdGVtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgIGZvciAoY29uc3QgW3RhcmdldCwgLi4uZGVwc10gb2YgcGF0aCkge1xuICAgICAgICAgICAgaWYgKHRhcmdldCA8IHRoaXMuY29tbW9uIHx8IGluZGV4RmlsbC5oYXModGFyZ2V0IGFzIFNsb3RJbmRleCkpIHtcbiAgICAgICAgICAgICAgc3BvaWxlci5hZGRDaGVjayhcbiAgICAgICAgICAgICAgICAgIHRoaXMuc2xvdHMuZ2V0KHRhcmdldCBhcyBTbG90SW5kZXgpISxcbiAgICAgICAgICAgICAgICAgIGRlcHMubWFwKGQgPT4gdGhpcy5pdGVtcy5nZXQoZCBhcyBJdGVtSW5kZXgpISkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGZpbGxJbnRlcm5hbChmaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SW5kZXgsIEl0ZW1JbmRleD4sXG4gICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiBJdGVtSW5kZXhbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgaGFzOiBCaXRzLFxuICAgICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgd2VpZ2h0czogV2VpZ2h0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgICAgYmFja3N0ZXBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBmaXhlZCA9IG5ldyBTZXQoZmlsbC5rZXlzKCkpO1xuICAgIGZvciAobGV0IGJpdDogSXRlbUluZGV4IHwgdW5kZWZpbmVkID0gaXRlbXMucG9wKCk7IGJpdCAhPSBudWxsOyBiaXQgPSBpdGVtcy5wb3AoKSkge1xuICAgICAgaWYgKCFCaXRzLmhhcyhoYXMsIGJpdCkpIGNvbnRpbnVlOyAvLyBpdGVtIGFscmVhZHkgcGxhY2VkOiBza2lwXG4gICAgICBjb25zdCBpdGVtSW5mbyA9IHRoaXMuaXRlbUluZm9Gcm9tSW5kZXgoYml0KTtcbiAgICAgIGhhcyA9IEJpdHMud2l0aG91dChoYXMsIGJpdCk7XG4gICAgICAvLyBjb25zdCByZWFjaGFibGUgPVxuICAgICAgLy8gICAgIHRoaXMuZXhwYW5kUmVhY2hhYmxlKHRoaXMudHJhdmVyc2UoaSA9PiBmaWxsLmdldChpKSwgaGFzKSxcbiAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnc2V0KTtcbiAgICAgIC8vIGFyci5zb3J0KChhLCBiKSA9PiBiWzBdIC0gYVswXSk7XG4gICAgICAvLyByYW5kb20uc2h1ZmZsZShyZWFjaGFibGUpO1xuICAgICAgY29uc3QgcmVhY2hhYmxlID0gWy4uLnRoaXMudHJhdmVyc2UoaSA9PiBmaWxsLmdldChpKSwgaGFzKV0ubWFwKGkgPT4gW3dlaWdodHMuc2xvdHMuZ2V0KGkpIHx8IDAsIGldIGFzIFtudW1iZXIsIFNsb3RJbmRleF0pO1xuXG4gICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGNoZWNrZWQgPSBuZXcgU2V0KGZpbGwua2V5cygpKTtcbiAgICAgIC8vIEluY3JlYXNlIHRoZSB0ZW1wZXJhdHVyZSB3aXRoIG1vcmUgYmFja3N0ZXBzXG4gICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgcmFuZG9tLmlzaHVmZmxlTWV0cm9wb2xpcyhyZWFjaGFibGUsIChTTE9UX1RFTVBFUkFUVVJFICsgYmFja3N0ZXBzKSAqIChiYWNrc3RlcHMgKyAxKSkpIHtcbiAgICAgICAgaWYgKGNoZWNrZWQuaGFzKHNsb3QpKSBjb250aW51ZTtcbiAgICAgICAgY2hlY2tlZC5hZGQoc2xvdCk7XG4gICAgICAgIGNvbnN0IHNsb3RJbmZvID0gdGhpcy5zbG90SW5mb0Zyb21JbmRleChzbG90KTtcbiAgICAgICAgaWYgKCFzbG90SW5mbyB8fFxuICAgICAgICAgICAgZmxhZ3NldC5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpICYmICFzbG90SW5mby51bmlxdWUgfHxcbiAgICAgICAgICAgICF0aGlzLmZpdHMoc2xvdEluZm8sIGl0ZW1JbmZvLCBmbGFnc2V0KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGZpbGwuc2V0KHNsb3QsIGJpdCk7XG4gICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIGNvbnRpbnVlO1xuICAgICAgY2hlY2tlZC5jbGVhcigpO1xuICAgICAgaWYgKGJhY2tzdGVwcy0tID4gMCkge1xuICAgICAgICAvLyB0YWtlIGEgYmFjay1zdGVwXG4gICAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiByYW5kb20uaXNodWZmbGVNZXRyb3BvbGlzKHJlYWNoYWJsZSwgMTAwKSkge1xuICAgICAgICAgIGlmIChjaGVja2VkLmhhcyhzbG90KSB8fCAhZmlsbC5oYXMoc2xvdCkgfHwgZml4ZWQuaGFzKHNsb3QpKSBjb250aW51ZTtcbiAgICAgICAgICBjaGVja2VkLmFkZChzbG90KTtcbiAgICAgICAgICBjb25zdCBzbG90SW5mbyA9IHRoaXMuc2xvdEluZm9Gcm9tSW5kZXgoc2xvdCk7XG4gICAgICAgICAgaWYgKCFzbG90SW5mbyB8fCAhdGhpcy5maXRzKHNsb3RJbmZvLCBpdGVtSW5mbywgZmxhZ3NldCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IHByZXZpb3VzSXRlbSA9IGZpbGwucmVwbGFjZShzbG90LCBiaXQpID8/IGRpZSgpO1xuICAgICAgICAgIGhhcyA9IEJpdHMud2l0aChoYXMsIHByZXZpb3VzSXRlbSk7XG4gICAgICAgICAgaXRlbXMucHVzaChwcmV2aW91c0l0ZW0pO1xuICAgICAgICAgIHJhbmRvbS5zaHVmZmxlKGl0ZW1zKTtcbiAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZvdW5kKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIGNvbnN0IG5zID0gKHNpOiBTbG90SW5kZXgpID0+IHRoaXMuY2hlY2tOYW1lKHRoaXMuc2xvdHMuZ2V0KHNpKSEpO1xuICAgICAgLy8gY29uc3QgbmkgPSAoaWk6IEl0ZW1JbmRleCkgPT4gdGhpcy5jaGVja05hbWUodGhpcy5pdGVtcy5nZXQoaWkpISk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgUG9vbDpcXG4gICR7aXRlbXMubWFwKG5pKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgLy8gY29uc29sZS5sb2coYEZpbGw6XFxuICAke1suLi5maWxsXS5tYXAoKFtzLGldKSA9PiBgJHtucyhzKX06ICR7bmkoaSl9YCkuam9pbignXFxuICAnKX1gKTtcbiAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYFJFUk9MTDogQ291bGQgbm90IHBsYWNlIGl0ZW0gaW5kZXggJHtiaXR9OiAke25pKGJpdCl9YCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBpdGVtUG9vbChleGNsdWRlOiBJdGVyYWJsZTxJdGVtSW5kZXg+LCB3ZWlnaHRzOiBXZWlnaHRzKTogW251bWJlciwgSXRlbUluZGV4XVtdIHtcbiAgICBjb25zdCBleGNsdWRlU2V0ID0gbmV3IFNldChleGNsdWRlKTtcbiAgICBjb25zdCBhcnI6IFtudW1iZXIsIEl0ZW1JbmRleF1bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2lkXSBvZiB0aGlzLml0ZW1JbmZvcykge1xuICAgICAgY29uc3QgaW5kZXggPSB0aGlzLml0ZW1zLmluZGV4KGlkKTtcbiAgICAgIC8vIHNraXAgbm9uLXByb2dyZXNzaW9uIGFuZCBhbHJlYWR5LXBsYWNlZCBpdGVtc1xuICAgICAgaWYgKGluZGV4ID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0aGlzLnByb2dyZXNzaW9uLmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgaWYgKGV4Y2x1ZGVTZXQuaGFzKGluZGV4KSkgY29udGludWU7XG4gICAgICBhcnIucHVzaChbd2VpZ2h0cy5pdGVtcy5nZXQoaW5kZXgpIHx8IDAsIGluZGV4XSk7XG4gICAgfVxuICAgIHJldHVybiBhcnI7XG4gIH1cblxuICAvLyBUT0RPIC0gaW5zdGVhZCBvZiBwbHVtYmluZyB0aGUgZmxhZ3NldCB0aHJvdWdoIGhlcmUsIGNvbnNpZGVyXG4gIC8vIGJ1aWxkaW5nIGl0IGludG8gdGhlIFNsb3RJbmZvPyAgT3IgdGhlIEl0ZW1JbmZvLCBzaW5jZSBpdCdzXG4gIC8vIHBvc3NpYmxlIGZvciBhIHVuaXF1ZSBzbG90IHRvIGFjY2VwdCBhIG5vbnVuaXF1ZSBpdGVtLCBidXRcbiAgLy8gYSB1bmlxdWUgaXRlbSBtdXN0IGJlIGluIGEgdW5pcXVlIHNsb3QuLi4gc2FtZSBkaWZmZXJlbmNlXG4gIHByaXZhdGUgZml0cyhzbG90OiBTbG90SW5mbywgaXRlbTogSXRlbUluZm8sIGZsYWdzZXQ6IEZsYWdTZXQpOiBib29sZWFuIHtcbiAgICBpZiAoZmxhZ3NldC5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpICYmXG4gICAgICAgIGl0ZW0udW5pcXVlICYmICFzbG90LnVuaXF1ZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IGl0ZW0ucHJldmVudExvc3MgfHwgc2xvdC5wcmV2ZW50TG9zcztcbiAgICBpZiAoc2xvdC5sb3NzeSAmJiBpdGVtLmxvc2FibGUgJiYgcHJldmVudExvc3MpIHJldHVybiBmYWxzZTtcbiAgICAvLyBUT0RPIC0gZmxhZyBmb3IgXCJwcm90ZWN0IGFsbCBsb3NhYmxlIGl0ZW1zXCJcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZpbGxOb25Qcm9ncmVzc2lvbihmaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4sXG4gICAgICAgICAgICAgICAgICAgICBmbGFnc2V0OiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgcmFuZG9tOiBSYW5kb20pOiBNYXA8U2xvdElkLCBJdGVtSWQ+fG51bGwge1xuICAgIC8vIEZpZ3VyZSBvdXQgd2hhdCBzdGlsbCBuZWVkcyB0byBiZSBmaWxsZWQuICBXaWxsIGJlIG1vc3RseSBmaWxsZXJcbiAgICAvLyBpdGVtcy4gIEl0ZW1zIGFyZSBzcGxpdCBpbnRvIHRocmVlIGdyb3VwczogKDEpIGZpcnN0IGl0ZW1zIGlzIGFueVxuICAgIC8vIHVuaXF1ZXMgdGhhdCBuZWVkIHRvIGdvIGludG8gdW5pcXVlIHNsb3RzIChpLmUuIG9ubHkgaWYgYEV1YCBpc1xuICAgIC8vIHNldCksICgyKSBlYXJseSBpdGVtcyBpcyBhbnl0aGluZyB0aGF0IG5lZWRzIHNwZWNpYWwgdHJlYXRtZW50IHRvXG4gICAgLy8gcHJldmVudCBwbGFjZW1lbnQgaW4gYSBsb3NzeSBzbG90LCAoMykgb3RoZXIgaXRlbXMgaXMgZXZlcnl0aGluZyBlbHNlLlxuICAgIGNvbnN0IGl0ZW1QYXNzZXM6IEl0ZW1JZFtdW10gPSBbW10sIFtdLCBbXV07XG4gICAgLy8gU2xvdHMgYXJlIGJyb2tlbiBpbnRvIHR3byBwYXNzZXM6ICgxKSByZXN0cmljdGVkIGFuZCAoMikgdW5yZXN0cmljdGVkLlxuICAgIGNvbnN0IHNsb3RQYXNzZXM6IFNsb3RJZFtdW10gPSBbW10sIFtdXTtcblxuICAgIGZvciAoY29uc3QgW2l0ZW1JZCwgaW5mb10gb2YgdGhpcy5pdGVtSW5mb3MpIHtcbiAgICAgIGlmIChmaWxsLmhhc1ZhbHVlKGl0ZW1JZCkpIGNvbnRpbnVlO1xuICAgICAgbGV0IGluZGV4ID0gMjtcbiAgICAgIGlmIChpbmZvLmxvc2FibGUgJiYgaW5mby5wcmV2ZW50TG9zcykgaW5kZXggPSAxO1xuICAgICAgaWYgKGZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSAmJiBpbmZvLnVuaXF1ZSkgaW5kZXggPSAwO1xuICAgICAgaXRlbVBhc3Nlc1tpbmRleF0ucHVzaChpdGVtSWQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtzbG90SWQsIGluZm9dIG9mIHRoaXMuc2xvdEluZm9zKSB7XG4gICAgICBpZiAoZmlsbC5oYXMoc2xvdElkKSkgY29udGludWU7XG4gICAgICBjb25zdCBpbmRleCA9IGluZm8ubG9zc3kgJiYgaW5mby5wcmV2ZW50TG9zcyA/IDAgOiAxO1xuICAgICAgc2xvdFBhc3Nlc1tpbmRleF0ucHVzaChzbG90SWQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBhc3Mgb2YgWy4uLml0ZW1QYXNzZXMsIC4uLnNsb3RQYXNzZXNdKSB7XG4gICAgICByYW5kb20uc2h1ZmZsZShwYXNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBuID0gKHNpOiBudW1iZXIpID0+IHRoaXMuY2hlY2tOYW1lKHNpKTtcbiAgICBjb25zdCBzYyA9IGl0ZXJzLmNvdW50KGl0ZXJzLmNvbmNhdCguLi5zbG90UGFzc2VzKSk7XG4gICAgY29uc3QgaWMgPSBpdGVycy5jb3VudChpdGVycy5jb25jYXQoLi4uaXRlbVBhc3NlcykpO1xuICAgIGlmIChpYyA+IHNjKSB7XG4gICAgICBjb25zb2xlLmxvZyhgU2xvdHMgJHtzY306XFxuICAke1suLi5pdGVycy5jb25jYXQoLi4uc2xvdFBhc3NlcyldLm1hcChuKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgY29uc29sZS5sb2coYEl0ZW1zICR7aWN9OlxcbiAgJHtbLi4uaXRlcnMuY29uY2F0KC4uLml0ZW1QYXNzZXMpXS5tYXAobikuam9pbignXFxuICAnKX1gKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVG9vIG1hbnkgaXRlbXNgKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZXJzLmNvbmNhdCguLi5pdGVtUGFzc2VzKSkge1xuICAgICAgLy8gVHJ5IHRvIHBsYWNlIHRoZSBpdGVtLCBzdGFydGluZyB3aXRoIGVhcmxpZXMgZmlyc3QuXG4gICAgICAvLyBNaW1pY3MgY29tZSBiZWZvcmUgY29uc3VtYWJsZXMgYmVjYXVzZSB0aGVyZSdzIGZld2VyIHBsYWNlcyB0aGV5IGNhbiBnby5cbiAgICAgIC8vIFNpbmNlIGtleSBzbG90cyBhcmUgYWxsb3dlZCB0byBjb250YWluIGNvbnN1bWFibGVzIChldmVuIGluIGZ1bGwgc2h1ZmZsZSksXG4gICAgICAvLyB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB1bmlxdWVzIGdvIGludG8gdGhvc2Ugc2xvdHMgZmlyc3QuXG4gICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgIGZvciAoY29uc3Qgc2xvdHMgb2YgWy4uLnNsb3RQYXNzZXNdKSB7XG4gICAgICAgIGlmIChmb3VuZCkgYnJlYWs7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAodGhpcy5maXRzKHRoaXMuc2xvdEluZm9zLmdldChzbG90c1tpXSkhLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pdGVtSW5mb3MuZ2V0KGl0ZW0pISwgZmxhZ3NldCkpIHtcbiAgICAgICAgICAgIGZpbGwuc2V0KHNsb3RzW2ldLCBpdGVtKTtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIHNsb3RzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFmb3VuZCkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZmlsbCBleHRyYSBpdGVtICR7aXRlbX0uIFNsb3RzOiAke2Vhcmx5U2xvdHN9LCAke290aGVyU2xvdHN9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBTbG90czpcXG4gICR7Wy4uLml0ZXJzLmNvbmNhdCguLi5zbG90UGFzc2VzKV0ubWFwKG4pLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYEZpbGw6XFxuICAke1suLi5maWxsXS5tYXAoKFtzLGldKSA9PiBgJHtucyhzKX06ICR7bmkoaSl9YCkuam9pbignXFxuICAnKX1gKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihgUkVST0xMOiBDb3VsZCBub3QgcGxhY2UgaXRlbSAke24oaXRlbSl9YCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IE1hcChmaWxsKTtcbiAgfVxuXG4gIC8vIE5PVEU6IGZvciBhbiBJbmRleEZpbGwsIHRoaXMgaXMganVzdCBnZXQoKSwgYnV0IGZvclxuICAvLyBhbiBJZEZpbGwsIHdlIG5lZWQgdG8gbWFwIGl0IGJhY2sgYW5kIGZvcnRoLi4uXG4gIHRyYXZlcnNlKGZpbGw6IChzbG90OiBTbG90SW5kZXgpID0+IEl0ZW1JbmRleHx1bmRlZmluZWQsXG4gICAgICAgICAgIGhhczogQml0cyxcbiAgICAgICAgICAgcGF0aD86IG51bWJlcltdW10pOiBTZXQ8U2xvdEluZGV4PiB7XG4gICAgaGFzID0gQml0cy5jbG9uZShoYXMpO1xuICAgIGNvbnN0IHJlYWNoYWJsZSA9IG5ldyBTZXQ8U2xvdEluZGV4PigpO1xuICAgIGNvbnN0IHF1ZXVlID0gbmV3IFNldDxTbG90SW5kZXg+KCk7XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgU2xvdEluZGV4OyBpIDwgdGhpcy5zbG90cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuZ3JhcGguZ2V0KGkpID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5kaXIodGhpcyk7XG4gICAgICAgIGNvbnN0IGlkID0gdGhpcy5zbG90cy5nZXQoaSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWFjaGFibGUgc2xvdCAke2lkPy50b1N0cmluZygxNil9YCk7XG4gICAgICB9XG4gICAgICBxdWV1ZS5hZGQoaSBhcyBTbG90SW5kZXgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG4gb2YgcXVldWUpIHtcbiAgICAgIHF1ZXVlLmRlbGV0ZShuKTtcbiAgICAgIGlmIChyZWFjaGFibGUuaGFzKG4pKSBjb250aW51ZTtcbiAgICAgIC8vIGNhbiB3ZSByZWFjaCBpdD9cbiAgICAgIGNvbnN0IG5lZWRlZCA9IHRoaXMuZ3JhcGguZ2V0KG4pO1xuICAgICAgaWYgKG5lZWRlZCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYE5vdCBpbiBncmFwaDogJHtufWApO1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IG5lZWRlZC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoIUJpdHMuY29udGFpbnNBbGwoaGFzLCBuZWVkZWRbaV0pKSBjb250aW51ZTtcbiAgICAgICAgaWYgKHBhdGgpIHBhdGgucHVzaChbbiwgLi4uQml0cy5iaXRzKG5lZWRlZFtpXSldKTtcbiAgICAgICAgcmVhY2hhYmxlLmFkZChuKTtcbiAgICAgICAgLy8gVE9ETyAtLS0gbmVlZCB0byBmaWd1cmUgb3V0IHdoYXQgdG8gZG8gaGVyZS5cbiAgICAgICAgLy8gICAgICAtLS0gZmlsbCB3b3VsZCBsaWtlIHRvIGJlIHplcm8tYmFzZWQgYnV0IGRvZXNuJ3QgbmVlZCB0byBiZS5cbiAgICAgICAgLy8gICAgICAgICAgY291bGQgdXNlIGEgc2ltcGxlIHBhaXIgb2YgTWFwcywgcG9zc2libHk/XG4gICAgICAgIC8vICAgICAgICAgIG9yIGZyb250LWxvYWQgdGhlIGl0ZW1zP1xuICAgICAgICAvLyAgIHNsb3RzOiAxeHggb3RoZXJzXG4gICAgICAgIC8vICAgaXRlbXM6IDJ4eCBvdGhlcnNcbiAgICAgICAgLy8gYnV0IHdlIHdhbnQgc2FtZSBmbGFncyB0byBoYXZlIHNhbWUgaW5kZXhcbiAgICAgICAgLy8gICBzbG90czogKGZpeGVkKSAocmVxdWlyZWQgc2xvdHMpIChleHRyYSBzbG90cylcbiAgICAgICAgLy8gICBpdGVtczogKGZpeGVkKSAocmVxdWlyZWQgc2xvdHMpIChpdGVtcylcbiAgICAgICAgLy8gaWYgbiBpcyBhIHNsb3QgdGhlbiBhZGQgdGhlIGl0ZW0gdG8gaGFzLlxuICAgICAgICBjb25zdCBpdGVtczogSXRlbUluZGV4W10gPSBbXTtcbiAgICAgICAgaWYgKG4gPCB0aGlzLmNvbW1vbikgaXRlbXMucHVzaChuIGFzIG51bWJlciBhcyBJdGVtSW5kZXgpO1xuICAgICAgICBjb25zdCBmaWxsZWQgPSBmaWxsKG4pO1xuICAgICAgICBpZiAoZmlsbGVkICE9IG51bGwpIGl0ZW1zLnB1c2goZmlsbGVkKTtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgaGFzID0gQml0cy53aXRoKGhhcywgaXRlbSk7XG4gICAgICAgICAgZm9yIChjb25zdCBqIG9mIHRoaXMudW5sb2Nrcy5nZXQoaXRlbSkgfHwgW10pIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdyYXBoLmdldChqKSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHRoaXMpO1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFkZGluZyBiYWQgbm9kZSAke2p9IGZyb20gdW5sb2NrICR7aXRlbX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLmFkZChqKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgZ2V0IGVycm9ycyBhYm91dCBpbml0aWFsIGZpbGwgbmV2ZXIgZmlsbGVkIHNsb3RzLCBzZWUgd2hhdFxuICAgIC8vIGl0ZW1zIGFyZSBtaXNzaW5nIChub3RlOiByb20gaXMgZ2xvYmFsKVxuLy8gICAgIGlmKHBhdGgpY29uc29sZS5sb2cobmV3IEFycmF5KHRoaXMuaXRlbXMubGVuZ3RoKS5maWxsKDApLm1hcCgoXyxpKSA9PiBpKVxuLy8gICAgICAgICAuZmlsdGVyKGk9PiFCaXRzLmhhcyhoYXMsIGkpKS5tYXAoaSA9PiBbaSx0aGlzLml0ZW1zLmdldChpKV0pLnNvcnQoKGEsYik9PmFbMV0tYlsxXSlcbi8vICAgICAgICAgLm1hcCgoW2osaV0pID0+IGAke1N0cmluZyhqKS5wYWRTdGFydCgzKX0gJHtoZXgoaSkucGFkU3RhcnQoMywnMCcpfSAke1xuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja05hbWUoaSl9YCkuam9pbignXFxuJykpO1xuLy8gKGdsb2JhbFRoaXMgYXMgYW55KS5GSU5BTEhBUyA9IGhhcztcblxuICAgIHJldHVybiByZWFjaGFibGU7XG4gIH1cblxuICBhbmFseXplU3BoZXJlczIoZmlsbDogKHNsb3Q6IFNsb3RJbmRleCkgPT4gSXRlbUluZGV4fHVuZGVmaW5lZCk6IEFycmF5PFtzdHJpbmcsIG51bWJlciwgc3RyaW5nXT4ge1xuICAgIGxldCBoYXMgPSBCaXRzLm9mKCk7XG4gICAgbGV0IHNwaGVyZSA9IDA7XG4gICAgbGV0IG5leHQgPSBCaXRzLm9mKCk7XG4gICAgY29uc3QgcmVzdWx0OiBBcnJheTxbc3RyaW5nLCBudW1iZXIsIHN0cmluZ10+ID0gW107XG4gICAgY29uc3QgdW5zZWVuID0gbmV3IFNldDxTbG90SW5kZXg+KFxuICAgICAgICBBcnJheS5mcm9tKHtsZW5ndGg6IHRoaXMuc2xvdHMubGVuZ3RofSwgKF8sIGkpID0+IGkgYXMgU2xvdEluZGV4KSk7XG4gICAgZG8ge1xuICAgICAgY29uc3QgcXVldWUgPSBuZXcgU2V0PFNsb3RJbmRleD4odW5zZWVuKTtcbiAgICAgIG5leHQgPSBCaXRzLm9mKCk7XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgcXVldWUpIHtcbiAgICAgICAgY29uc3QgbmVlZGVkID0gdGhpcy5ncmFwaC5nZXQobikhO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gbmVlZGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFCaXRzLmNvbnRhaW5zQWxsKGhhcywgbmVlZGVkW2ldKSkgY29udGludWU7XG4gICAgICAgICAgdW5zZWVuLmRlbGV0ZShuKTtcbiAgICAgICAgICBjb25zdCBpdGVtczogSXRlbUluZGV4W10gPSBbXTtcbiAgICAgICAgICBpZiAobiA8IHRoaXMuY29tbW9uKSBpdGVtcy5wdXNoKG4gYXMgbnVtYmVyIGFzIEl0ZW1JbmRleCk7XG4gICAgICAgICAgY29uc3QgZmlsbGVkID0gZmlsbChuKTtcbiAgICAgICAgICBpZiAoZmlsbGVkICE9IG51bGwpIGl0ZW1zLnB1c2goZmlsbGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy5pdGVtcy5nZXQoaXRlbSk7XG4gICAgICAgICAgICBpZiAoaWQgIT0gbnVsbCAmJiBpZCA+PSAweDIwMCAmJiBpZCA8IDB4MjgwKSB7XG4gICAgICAgICAgICAgIC8vIElmIGl0J3MgYW4gaXRlbSwgdGhlbiBzYXZlIGl0IGZvciBsYXRlci5cbiAgICAgICAgICAgICAgcmVzdWx0LnB1c2goW3RoaXMuaXRlbU5hbWVGcm9tSW5kZXgoaXRlbSksIHNwaGVyZSwgdGhpcy5jaGVja05hbWUodGhpcy5zbG90cy5nZXQobikhKV0pO1xuICAgICAgICAgICAgICBuZXh0ID0gQml0cy53aXRoKG5leHQsIGl0ZW0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gSWYgaXQncyBwc2V1ZG8sIHRoZW4gYWRkIGl0IGltbWVkaWF0ZWx5LlxuICAgICAgICAgICAgICBoYXMgPSBCaXRzLndpdGgoaGFzLCBpdGVtKTtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBqIG9mIHRoaXMudW5sb2Nrcy5nZXQoaXRlbSkgfHwgW10pIHtcbiAgICAgICAgICAgICAgICBpZiAodW5zZWVuLmhhcyhqKSkgcXVldWUuYWRkKGopO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBoYXMgPSBCaXRzLnVuaW9uKGhhcywgbmV4dCk7XG4gICAgICBpZiAoIUJpdHMuZW1wdHkobmV4dCkpIHNwaGVyZSsrO1xuICAgIH0gd2hpbGUgKHVuc2Vlbi5zaXplKTsgLy8gIUJpdHMuZW1wdHkobmV4dCkpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhbmFseXplU3BoZXJlcyhmaWxsOiAoc2xvdDogU2xvdEluZGV4KSA9PiBJdGVtSW5kZXh8dW5kZWZpbmVkKTogQXJyYXk8W0l0ZW1JZCwgc3RyaW5nLCBudW1iZXIsIHN0cmluZ10+IHtcbiAgICBsZXQgaGFzID0gQml0cy5vZigpO1xuICAgIGxldCBzcGhlcmUgPSAwO1xuICAgIGNvbnN0IHJlc3VsdDogQXJyYXk8W0l0ZW1JZCwgc3RyaW5nLCBudW1iZXIsIHN0cmluZ10+ID0gW107XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHJlYWNoYWJsZSA9IHRoaXMudHJhdmVyc2UoKCkgPT4gdW5kZWZpbmVkLCBoYXMpO1xuICAgICAgbGV0IHByb2dyZXNzID0gZmFsc2U7XG4gICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgcmVhY2hhYmxlKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBmaWxsKHNsb3QpO1xuICAgICAgICBpZiAoaXRlbSA9PSBudWxsIHx8IEJpdHMuaGFzKGhhcywgaXRlbSkpIGNvbnRpbnVlO1xuICAgICAgICBoYXMgPSBCaXRzLndpdGgoaGFzLCBpdGVtKTtcbiAgICAgICAgcHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICBjb25zdCBpZCA9IHRoaXMuaXRlbXMuZ2V0KGl0ZW0pO1xuICAgICAgICBpZiAoaWQgIT0gbnVsbCAmJiBpZCA+PSAweDIwMCAmJiBpZCA8IDB4MjgwKSB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goW2lkLCB0aGlzLml0ZW1OYW1lRnJvbUluZGV4KGl0ZW0pLCBzcGhlcmUsIHRoaXMuY2hlY2tOYW1lKHRoaXMuc2xvdHMuZ2V0KHNsb3QpISldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFwcm9ncmVzcykgYnJlYWs7XG4gICAgICBzcGhlcmUrKztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGV4cGFuZEZpbGwoaW5kZXhGaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SW5kZXgsIEl0ZW1JbmRleD4sXG4gICAgICAgICAgICAgZmlsbDogTXV0YWJsZUFycmF5QmlNYXA8U2xvdElkLCBJdGVtSWQ+KSB7XG4gICAgZm9yIChjb25zdCBbc2xvdEluZGV4LCBpdGVtSW5kZXhdIG9mIGluZGV4RmlsbCkge1xuICAgICAgY29uc3Qgc2xvdElkID0gdGhpcy5zbG90cy5nZXQoc2xvdEluZGV4KTtcbiAgICAgIGNvbnN0IGl0ZW1JZCA9IHRoaXMuaXRlbXMuZ2V0KGl0ZW1JbmRleCk7XG4gICAgICBpZiAoc2xvdElkID09IG51bGwgfHwgaXRlbUlkID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZ2ApO1xuICAgICAgZmlsbC5yZXBsYWNlKHNsb3RJZCwgaXRlbUlkKTtcbiAgICB9XG4gIH1cblxuICBjb21wcmVzc0ZpbGwoZmlsbDogTXV0YWJsZUFycmF5QmlNYXA8U2xvdElkLCBJdGVtSWQ+KTpcbiAgTXV0YWJsZUFycmF5QmlNYXA8U2xvdEluZGV4LCBJdGVtSW5kZXg+IHtcbiAgICBjb25zdCBpbmRleEZpbGwgPSBuZXcgTXV0YWJsZUFycmF5QmlNYXA8U2xvdEluZGV4LCBJdGVtSW5kZXg+KCk7XG4gICAgZm9yIChjb25zdCBbc2xvdElkLCBpdGVtSWRdIG9mIGZpbGwpIHtcbiAgICAgIGNvbnN0IHNsb3RJbmRleCA9IHRoaXMuc2xvdHMuaW5kZXgoc2xvdElkKTtcbiAgICAgIGNvbnN0IGl0ZW1JbmRleCA9IHRoaXMuaXRlbXMuaW5kZXgoaXRlbUlkKTtcbiAgICAgIGlmIChzbG90SW5kZXggPT0gbnVsbCB8fCBpdGVtSW5kZXggPT0gbnVsbCkge1xuICAgICAgICAvLyBUT0RPIC0gdGhpcyBpcyBub3QgdW5yZWFzb25hYmxlIC0gd2UgY2FuIHByZS1maWxsIGEgc2xvdCAoYWx3YXlzXG4gICAgICAgIC8vIHRyYWNrZWQpIHdpdGggYSBub24tcHJvZ3Jlc3Npb24gaXRlbS4uLiBob3cgdG8gaGFuZGxlPyB3aGF0IHRvIG1hcFxuICAgICAgICAvLyB0bz8gIENhbiB3ZSBtYWtlIHVwIGEgZHVtbXkgaW5kZXggb3Igc29tZXRoaW5nP1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgQmFkIHNsb3QvaXRlbTogJHtzbG90SWR9ICR7c2xvdEluZGV4fSAke2l0ZW1JZH0gJHtpdGVtSW5kZXh9YCk7XG4gICAgICB9XG4gICAgICBpbmRleEZpbGwuc2V0KHNsb3RJbmRleCwgaXRlbUluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4RmlsbDtcbiAgfVxuXG4gIGNoZWNrTmFtZShpZDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy53b3JsZHNbaWQgPj4+IDI0XS5jaGVja05hbWUoaWQgJiAweGZmZmZmZik7XG4gIH1cblxuICBpdGVtTmFtZUZyb21JbmRleChpbmRleDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBpZiAoaW5kZXggPCB0aGlzLmNvbW1vbikgcmV0dXJuIHRoaXMuY2hlY2tOYW1lKHRoaXMuc2xvdHMuZ2V0KGluZGV4IGFzIGFueSkgYXMgYW55KTtcbiAgICBjb25zdCBpZCA9IHRoaXMuaXRlbXMuZ2V0KGluZGV4IGFzIGFueSk7XG4gICAgaWYgKCFpZCB8fCAoaWQgJiB+MHhmZikgIT09IDB4MjAwKSByZXR1cm4gJyQnICsgaGV4KGlkIGFzIGFueSk7XG4gICAgcmV0dXJuIChnbG9iYWxUaGlzIGFzIGFueSkucm9tLml0ZW1zW2lkICYgMHhmZl0/Lm1lc3NhZ2VOYW1lIHx8ICckJyArIGhleChpZCBhcyBhbnkpO1xuICB9XG5cbiAgcHJlZmlsbChmaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLndvcmxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgd29ybGRJZCA9IGkgPDwgMjQ7XG4gICAgICBjb25zdCB3b3JsZEZpbGwgPSB0aGlzLndvcmxkc1tpXS5wcmVmaWxsKHJhbmRvbSk7XG4gICAgICBmb3IgKGNvbnN0IFtzbG90LCBpdGVtXSBvZiB3b3JsZEZpbGwpIHtcbiAgICAgICAgZmlsbC5zZXQoKHdvcmxkSWQgfCBzbG90KSBhcyBTbG90SWQsICh3b3JsZElkIHwgaXRlbSkgYXMgSXRlbUlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpdGVtSW5mb0Zyb21JbmRleChpdGVtOiBJdGVtSW5kZXgpOiBJdGVtSW5mbyB7XG4gICAgY29uc3QgaWQgPSB0aGlzLml0ZW1zLmdldChpdGVtKTtcbiAgICBpZiAoaWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgaXRlbTogJHtpdGVtfWApO1xuICAgIHJldHVybiB0aGlzLml0ZW1JbmZvRnJvbUlkKGlkKTtcbiAgfVxuXG4gIGl0ZW1JbmZvRnJvbUlkKGlkOiBJdGVtSWQpOiBJdGVtSW5mbyB7XG4gICAgY29uc3QgaW5mbyA9IHRoaXMuaXRlbUluZm9zLmdldChpZCk7XG4gICAgaWYgKGluZm8gPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGluZm86ICR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gaW5mbztcbiAgfVxuXG4gIHNsb3RJbmZvRnJvbUluZGV4KHNsb3Q6IFNsb3RJbmRleCk6IFNsb3RJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnNsb3RzLmdldChzbG90KTtcbiAgICBpZiAoaWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgc2xvdDogJHtzbG90fWApO1xuICAgIHJldHVybiB0aGlzLnNsb3RJbmZvRnJvbUlkKGlkKTtcbiAgfVxuXG4gIHNsb3RJbmZvRnJvbUlkKGlkOiBTbG90SWQpOiBTbG90SW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnNsb3RJbmZvcy5nZXQoaWQpO1xuICAgIGlmIChpbmZvICE9IG51bGwpIHJldHVybiBpbmZvO1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpbmZvOiAke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5pbnRlcmZhY2UgV2VpZ2h0cyB7XG4gIC8qKiBXZWlnaHQgKHBvd2VyKSBvZiBlYWNoIGl0ZW0uICovXG4gIGl0ZW1zOiBLZXllZDxJdGVtSW5kZXgsIG51bWJlcj47XG4gIC8qKiBXZWlnaHQgKGRlcHRoKSBvZiBlYWNoIHNsb3QuICovXG4gIHNsb3RzOiBLZXllZDxTbG90SW5kZXgsIG51bWJlcj47XG59XG5cblxuLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXBcbmludGVyZmFjZSBQcm9ncmVzc1RyYWNrZXIge1xuICBhZGRUYXNrcyh0YXNrczogbnVtYmVyKTogdm9pZDtcbiAgYWRkQ29tcGxldGVkKHRhc2tzOiBudW1iZXIpOiB2b2lkO1xufVxuIl19