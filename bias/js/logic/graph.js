import { Bits } from '../bits.js';
import { Random } from '../random.js';
import { hex } from '../rom/util.js';
import { Keyed, ArrayMap, MutableArrayBiMap, iters, spread } from '../util.js';
import { die } from '../assert.js';
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
            const rom = window.rom;
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
        window.graph = this;
        if (progress)
            progress.addTasks(Math.floor(attempts / 10));
        const weights = this.computeWeights(random, 1000);
        for (let attempt = 0; attempt < attempts; attempt++) {
            if (progress && (attempt % 10 === 9)) {
                progress.addCompleted(1);
                await new Promise(requestAnimationFrame);
            }
            const fill = new MutableArrayBiMap();
            this.prefill(fill, random);
            const indexFill = this.compressFill(fill);
            const items = [...random.ishuffleMetropolis(this.itemPool(indexFill.values(), weights), 0)].reverse();
            let has = Bits.from(new Set(items));
            const backtracks = Math.floor(attempt / 5);
            if (!this.fillInternal(indexFill, items, has, random, weights, flagset, backtracks)) {
                continue;
            }
            const path = spoiler ? [] : undefined;
            const final = this.traverse(i => indexFill.get(i), Bits.of(), path);
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
            for (const slot of random.ishuffleMetropolis(reachable, (0 + backsteps) * (backsteps + 1))) {
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
        return ((_a = window.rom.items[id & 0xff]) === null || _a === void 0 ? void 0 : _a.messageName) || '$' + hex(id);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvZ3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVoQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRXBDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuQyxPQUFPLEVBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUF5RGpDLE1BQU0sT0FBTyxLQUFLO0lBb0JoQixZQUE2QixNQUErQjs7UUFBL0IsV0FBTSxHQUFOLE1BQU0sQ0FBeUI7UUFRMUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hCLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO2dCQUMxRCxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQztnQkFDbkMsS0FBSyxNQUFN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LElBQUksRUFBRSxDQUFDLENBQUM7UUFDckQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxjQUFjLENBQUMsRUFBVTtRQUN2QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwQyxJQUFJLElBQUksSUFBSSxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxJQUFlO1FBQy9CLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUksRUFBRSxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNyRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELGNBQWMsQ0FBQyxFQUFVO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksSUFBSSxJQUFJLElBQUk7WUFBRSxPQUFPLElBQUksQ0FBQztRQUU5QixPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0JpdHN9IGZyb20gJy4uL2JpdHMuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHtTcG9pbGVyfSBmcm9tICcuLi9yb20vc3BvaWxlci5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtLZXllZCwgQXJyYXlNYXAsIE11dGFibGVBcnJheUJpTWFwLCBpdGVycywgc3ByZWFkfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7ZGllfSBmcm9tICcuLi9hc3NlcnQuanMnO1xuXG4vKiogSW5wdXQgZm9yIHRoZSBncmFwaC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25MaXN0IHtcbiAgd29ybGROYW1lOiBzdHJpbmc7XG4gIGl0ZW1zOiBSZWFkb25seU1hcDxudW1iZXIsIEl0ZW1JbmZvPjtcbiAgc2xvdHM6IFJlYWRvbmx5TWFwPG51bWJlciwgU2xvdEluZm8+O1xuICByZXF1aXJlbWVudHM6IFJlYWRvbmx5TWFwPG51bWJlciwgSXRlcmFibGU8SXRlcmFibGU8bnVtYmVyPj4+O1xuICBjaGVja05hbWU6IChub2RlOiBudW1iZXIpID0+IHN0cmluZztcbiAgcHJlZmlsbDogKHJhbmRvbTogUmFuZG9tKSA9PiBNYXA8bnVtYmVyLCBudW1iZXI+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEl0ZW1JbmZvIHtcbiAgLyoqIFVuaXF1ZSBpdGVtcyBjYW4gb3B0aW9uYWxseSBiZSBzaHVmZmxlZCBzZXBhcmF0ZWx5LiAqL1xuICB1bmlxdWU/OiBib29sZWFuO1xuICAvKipcbiAgICogTG9zYWJsZSBpdGVtcyBhcmUgYXQgcmlzayBvZiBiZWluZyBsb3N0IGlmIHRoZXkgYXJlIHBsYWNlZCBpbiBhIGxvc3N5IHNsb3RcbiAgICogKGkuZS4gaWYgdGhlIGludmVudG9yeSBpcyBmdWxsKS5cbiAgICovXG4gIGxvc2FibGU/OiBib29sZWFuO1xuICAvKipcbiAgICogTG9zYWJsZSBpdGVtcyBtYXkgYmUgcHJvdGVjdGVkLCBtZWFuaW5nIHRoYXQgdGhleSB3aWxsIG5vdCBiZSBwbGFjZWQgaW4gYVxuICAgKiBsb3NzeSBzbG90LlxuICAgKi9cbiAgcHJldmVudExvc3M/OiBib29sZWFuO1xuICAvKipcbiAgICogV2VpZ2h0IGZvciBwbGFjZW1lbnQuICBIaWdoZXIgbnVtYmVycyBhcmUgbW9yZSBsaWtlbHkgdG8gYmUgcGxhY2VkIGVhcmxpZXIuXG4gICAqIERlZmF1bHQgaXMgMS4gIFBvd2VyZnVsIGFuZCBpbXBvcnRhbnQgaXRlbXMgc2hvdWxkIGJlIGdpdmVuIGxhcmdlciB3ZWlnaHRzXG4gICAqIHRvIG1ha2UgaXQgbGVzcyBsaWtlbHkgdGhhdCB0aGV5IGFsd2F5cyBlbmQgdXAgaW4gZWFybHkgc3BoZXJlcy5cbiAgICovXG4gIHdlaWdodD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTbG90SW5mbyB7XG4gIC8qKiBXaGV0aGVyIHRoZSBzbG90IGNhbiBob2xkIGEgdW5pcXVlIGl0ZW0uICovXG4gIHVuaXF1ZT86IGJvb2xlYW47XG4gIC8qKiBXaGV0aGVyIGxvc2FibGUgaXRlbXMgaW4gdGhpcyBzbG90IGFyZSBhdCByaXNrIG9mIGJlaW5nIGxvc3QuICovXG4gIGxvc3N5OiBib29sZWFuO1xuICAvKiogV2hldGhlciB0aGUgc2xvdCBpcyBkaXNhbGxvd2VkIGZyb20gbG9zaW5nIGl0ZW1zIChlLmcuIHRyaWdnZXJzKS4gKi9cbiAgcHJldmVudExvc3M/OiBib29sZWFuO1xuICAvKipcbiAgICogV2VpZ2h0IGZvciBwbGFjaW5nIHByb2dyZXNzaW9uIGl0ZW1zLiAgRGVmYXVsdCBpcyAxLiAgVXNlZnVsIGZvciBtYWtpbmdcbiAgICogZGlzdGFudCBhbmQgb3V0LW9mLXRoZSB3YXkgY2hlY2tzIG1vcmUgd29ydGh3aGlsZS4gIEFsdGVybmF0aXZlbHksIHdlXG4gICAqIGNvdWxkIGp1c3QgYXZvaWQgZXZlciBwbGFjaW5nIG1pbWljcyBpbiB0aGVzZSBhcmVhcz9cbiAgICovXG4gIHdlaWdodD86IG51bWJlcjtcbn1cblxuZXhwb3J0IHR5cGUgU2xvdEluZGV4ID0gbnVtYmVyICYge19fc2xvdEluZGV4X186IG5ldmVyfTtcbmV4cG9ydCB0eXBlIEl0ZW1JbmRleCA9IG51bWJlciAmIHtfX2l0ZW1JbmRleF9fOiBuZXZlcn07XG5leHBvcnQgdHlwZSBTbG90SWQgPSBudW1iZXIgJiB7X19zbG90SWRfXzogbmV2ZXJ9O1xuZXhwb3J0IHR5cGUgSXRlbUlkID0gbnVtYmVyICYge19faXRlbUlkX186IG5ldmVyfTtcblxuLyoqXG4gKiBBIGdyYXBoIGRhdGEgc3RydWN0dXJlLiAgSW5pdGlhbGl6ZWQgd2l0aCBvbmUgb3IgbW9yZSBsb2NhdGlvbiBsaXN0c1xuICogKGEgc2V0IG9mIERORiBleHByZXNzaW9ucyBwcm92aWRpbmcgYSBidW5jaCBvZiBudW1lcmljIGZsYWdzKS5cbiAqL1xuZXhwb3J0IGNsYXNzIEdyYXBoIHtcblxuICAvL3ByaXZhdGUgcmVhZG9ubHkgcmV2ZXJzZVdvcmxkczogUmVhZG9ubHlNYXA8TG9jYXRpb25MaXN0LCBudW1iZXI+O1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbW1vbjogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHNsb3RzOiBBcnJheU1hcDxTbG90SW5kZXgsIFNsb3RJZD47XG4gIHByaXZhdGUgcmVhZG9ubHkgaXRlbXM6IEFycmF5TWFwPEl0ZW1JbmRleCwgSXRlbUlkPjtcbiAgLy8gTm90ZSB0aGF0IG5vdCBldmVyeSBpdGVtIGdldHMgYW4gaW5kZXggLSBvbmx5IHRob3NlIGluIHRoZSBncmFwaC5cbiAgcHJpdmF0ZSByZWFkb25seSBzbG90SW5mb3M6IFJlYWRvbmx5TWFwPFNsb3RJZCwgU2xvdEluZm8+O1xuICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1JbmZvczogUmVhZG9ubHlNYXA8SXRlbUlkLCBJdGVtSW5mbz47XG5cbiAgLy8gSXRlbXMgdGhhdCBwcm92aWRlIHByb2dyZXNzaW9uLlxuICBwcml2YXRlIHJlYWRvbmx5IHByb2dyZXNzaW9uOiBTZXQ8SXRlbUlkPjtcblxuICAvLyAvKiogTWFwcGluZyBvZiBwcm92aWRlcyB0byB0aGUgc2FtZSByZXF1aXJlcy4gKi9cbiAgLy8gcHJpdmF0ZSByZWFkb25seSBjb21tb25GaWxsOiBBcnJheU1hcDxTbG90SW5kZXgsIEl0ZW1JbmRleD47XG5cbiAgLyoqIEJpdHNldHMga2V5ZWQgYnkgSXRlbUluZGV4LCByZXByZXNlbnQgYSBETkYgY29uZGl0aW9uLiAqL1xuICByZWFkb25seSBncmFwaDogS2V5ZWQ8U2xvdEluZGV4LCByZWFkb25seSBCaXRzW10+O1xuICByZWFkb25seSB1bmxvY2tzOiBLZXllZDxJdGVtSW5kZXgsIHJlYWRvbmx5IFNsb3RJbmRleFtdPjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHdvcmxkczogcmVhZG9ubHkgTG9jYXRpb25MaXN0W10pIHtcbiAgICAvL2NvbnN0IHJldmVyc2VXb3JsZHMgPSBuZXcgTWFwPExvY2F0aW9uTGlzdCwgbnVtYmVyPigpO1xuICAgIC8vZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyAgcmV2ZXJzZVdvcmxkcy5zZXQod29ybGRzW2ldLCBpKTtcbiAgICAvL31cbiAgICAvL3RoaXMucmV2ZXJzZVdvcmxkcyA9IHJldmVyc2VXb3JsZHM7XG5cbiAgICAvLyBCdWlsZCB1cCBhIGxpc3Qgb2YgYWxsIGtub3duIHByb3ZpZGVzL3JlcXVpcmVzLlxuICAgIGNvbnN0IHByb3ZpZGVkID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCBzbG90cyA9IG5ldyBNYXA8U2xvdElkLCBTbG90SW5mbz4oKTtcbiAgICBjb25zdCBpdGVtcyA9IG5ldyBNYXA8SXRlbUlkLCBJdGVtSW5mbz4oKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdvcmxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgd29ybGQgPSB3b3JsZHNbaV07XG4gICAgICBjb25zdCB3b3JsZElkID0gaSA8PCAyNDtcbiAgICAgIGZvciAoY29uc3QgW3Byb3ZpZGVkSWQsIHJlcXVpcmVtZW50XSBvZiB3b3JsZC5yZXF1aXJlbWVudHMpIHtcbiAgICAgICAgcHJvdmlkZWQuYWRkKHdvcmxkSWQgfCBwcm92aWRlZElkKTtcbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiByZXF1aXJlbWVudCkge1xuICAgICAgICAgIGZvciAoY29uc3QgY29uZCBvZiByb3V0ZSkge1xuICAgICAgICAgICAgcmVxdWlyZWQuYWRkKHdvcmxkSWQgfCBjb25kKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gICAgICAgIFxuICAgICAgfVxuXG4gICAgICAvLyBQcm9iYWJseSBqdXN0IG1ha2UgYSBjb21tb24gaW5kZXggZmlsbCBhbmQgZG8gYSBmdWxsIGluZGlyZWN0aW9uP1xuICAgICAgLy8gIC0gaWYgaXQncyBpbiB0aGUgY29tbW9uIGZpbGwsIHVzZSBpdCwgb3RoZXJ3aXNlIGZhbGwgYmFjayBvbiB0aGVcbiAgICAgIC8vICAgIGl0ZW0gZmlsbD9cblxuICAgICAgZm9yIChjb25zdCBbaXRlbUlkLCBpbmZvXSBvZiB3b3JsZC5pdGVtcykge1xuICAgICAgICBpdGVtcy5zZXQoKHdvcmxkSWQgfCBpdGVtSWQpIGFzIEl0ZW1JZCwgaW5mbyk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtzbG90SWQsIGluZm9dIG9mIHdvcmxkLnNsb3RzKSB7XG4gICAgICAgIHNsb3RzLnNldCgod29ybGRJZCB8IHNsb3RJZCkgYXMgU2xvdElkLCBpbmZvKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDb3B5IHRoZSBtYXBzIGFuZCBzYXZlIHRoZW0gYmVmb3JlIHdlIHN0YXJ0IGRlbGV0aW5nIGVsZW1lbnRzLlxuICAgIHRoaXMuaXRlbUluZm9zID0gbmV3IE1hcChpdGVtcyk7XG4gICAgdGhpcy5zbG90SW5mb3MgPSBuZXcgTWFwKHNsb3RzKTtcblxuICAgIHRoaXMucHJvZ3Jlc3Npb24gPSBuZXcgU2V0KHJlcXVpcmVkIGFzIFNldDxJdGVtSWQ+KTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMua2V5cygpKSByZXF1aXJlZC5hZGQoaXRlbSk7IC8vIG5vbi1wcm9ncmVzc2lvbiBsYXN0XG5cbiAgICBjb25zdCBjb21tb24gPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCBleHRyYVByb3ZpZGVzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgY29uc3QgZXh0cmFSZXF1aXJlcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGZvciAoY29uc3QgY2hlY2sgb2YgcmVxdWlyZWQpIHtcbiAgICAgIChwcm92aWRlZC5oYXMoY2hlY2spID8gY29tbW9uIDogZXh0cmFSZXF1aXJlcykuYWRkKGNoZWNrKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjaGVjayBvZiBwcm92aWRlZCkge1xuICAgICAgaWYgKCFyZXF1aXJlZC5oYXMoY2hlY2spKSBleHRyYVByb3ZpZGVzLmFkZChjaGVjayk7XG4gICAgfVxuXG4gICAgdGhpcy5jb21tb24gPSBjb21tb24uc2l6ZTtcbiAgICB0aGlzLnNsb3RzID0gbmV3IEFycmF5TWFwKFsuLi5jb21tb24sIC4uLmV4dHJhUHJvdmlkZXNdIGFzIFNsb3RJZFtdKTtcbiAgICB0aGlzLml0ZW1zID0gbmV3IEFycmF5TWFwKFsuLi5jb21tb24sIC4uLmV4dHJhUmVxdWlyZXNdIGFzIEl0ZW1JZFtdKTtcblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBncmFwaCBub3cgdGhhdCB3ZSBoYXZlIHRoZSBhcnJheSBtYXBzLlxuICAgIGNvbnN0IGdyYXBoOiBCaXRzW11bXSA9IFtdO1xuICAgIGNvbnN0IHVubG9ja3M6IEFycmF5PFNldDxTbG90SW5kZXg+PiA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd29ybGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB3b3JsZElkID0gaSA8PCAyNDtcbiAgICAgIGZvciAoY29uc3QgW3Nsb3QsIHJlcV0gb2Ygd29ybGRzW2ldLnJlcXVpcmVtZW50cykge1xuICAgICAgICBjb25zdCBzbG90SW5kZXggPSB0aGlzLnNsb3RzLmluZGV4KCh3b3JsZElkIHwgc2xvdCkgYXMgU2xvdElkKTtcbiAgICAgICAgaWYgKHNsb3RJbmRleCA9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcm92aWRlZCBhIG5vbi1zbG90PyAke2hleChzbG90KX1gKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGNzIG9mIHJlcSkge1xuICAgICAgICAgIGNvbnN0IGlzID1cbiAgICAgICAgICAgICAgWy4uLmNzXS5tYXAoYyA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1zLmluZGV4KCh3b3JsZElkIHwgYykgYXMgSXRlbUlkKSA/PyBkaWUoKSk7XG4gICAgICAgICAgKGdyYXBoW3Nsb3RJbmRleF0gfHwgKGdyYXBoW3Nsb3RJbmRleF0gPSBbXSkpLnB1c2goQml0cy5mcm9tKGlzKSk7XG4gICAgICAgICAgZm9yIChjb25zdCBpIG9mIGlzKSB7XG4gICAgICAgICAgICAodW5sb2Nrc1tpXSB8fCAodW5sb2Nrc1tpXSA9IG5ldyBTZXQoKSkpLmFkZChzbG90SW5kZXgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNhbml0eSBjaGVjayB0byBtYWtlIHN1cmUgYWxsIHNsb3RzIGFyZSBwcm92aWRlZC5cbiAgICBmb3IgKGxldCBpID0gMCBhcyBTbG90SW5kZXg7IGkgPCB0aGlzLnNsb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWdyYXBoW2ldIHx8ICFncmFwaFtpXS5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLnNsb3RzLmdldChpKSA/PyBOYU4gYXMgU2xvdElkO1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5jaGVja05hbWUoaWQpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGBOb3RoaW5nIHByb3ZpZGVkICQke2hleChpZCl9OiAke25hbWV9IChpbmRleCAke2l9KWApO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmdyYXBoID0gbmV3IEtleWVkKGdyYXBoKTtcbiAgICB0aGlzLnVubG9ja3MgPSBuZXcgS2V5ZWQodW5sb2Nrcy5tYXAoc3ByZWFkKSk7XG4gIH1cblxuICAvKipcbiAgICogRG8gb25lIG9yIG1vcmUgc2FtcGxlcyBvZiBhbiBhcmJpdHJhcnktb3JkZXJlZCBpdGVtIHBpY2t1cCB0b1xuICAgKiBtZWFzdXJlIHJvdWdobHkgdGhlIHdlaWdodCBvZiBlYWNoIGl0ZW0gYW5kIHNsb3QuXG4gICAqL1xuICBjb21wdXRlV2VpZ2h0cyhyYW5kb20gPSBuZXcgUmFuZG9tKCksIHRyYXZlcnNlcyA9IDEpOiBXZWlnaHRzIHtcbiAgICBjb25zdCBpdGVtV2VpZ2h0cyA9IEFycmF5LmZyb20oe2xlbmd0aDogdGhpcy5pdGVtcy5sZW5ndGh9LCAoKSA9PiAwKTtcbiAgICBjb25zdCBzbG90V2VpZ2h0cyA9IEFycmF5LmZyb20oe2xlbmd0aDogdGhpcy5zbG90cy5sZW5ndGh9LCAoKSA9PiAwKTtcbiAgICBjb25zdCBwcm9ncmVzc2lvbkl0ZW1zID0gW107XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIGlkXSBvZiB0aGlzLml0ZW1zKSB7XG4gICAgICBpZiAoaWQgPj0gMHgyMDAgJiYgaWQgPCAweDI4MCAmJiB0aGlzLnByb2dyZXNzaW9uLmhhcyhpZCkpIHByb2dyZXNzaW9uSXRlbXMucHVzaChpbmRleCk7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHJhdmVyc2VzOyBpKyspIHtcbiAgICAgIGNvbnN0IGl0ZW1zID0gcmFuZG9tLnNodWZmbGUoWy4uLnByb2dyZXNzaW9uSXRlbXNdKTtcbiAgICAgIGxldCBoYXMgPSBCaXRzLm9mKCk7XG4gICAgICBsZXQgcmVhY2hhYmxlID0gdGhpcy50cmF2ZXJzZSgoKSA9PiB1bmRlZmluZWQsIGhhcyk7IC8vKGMpID0+IGMgPD0gdGhpcy5jb21tb24gPyBjIGFzIGFueSA6IHVuZGVmaW5lZCwgaGFzKTtcbiAgICAgIGxldCBzdGVwID0gMDtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICBzdGVwKys7XG4gICAgICAgIGhhcyA9IEJpdHMud2l0aChoYXMsIGl0ZW0pO1xuICAgICAgICBjb25zdCBuZXdSZWFjaGFibGUgPSB0aGlzLnRyYXZlcnNlKCgpID0+IHVuZGVmaW5lZCwgaGFzKTsgLy8oYykgPT4gYyA8PSB0aGlzLmNvbW1vbiA/IGMgYXMgYW55IDogdW5kZWZpbmVkLCBoYXMpO1xuICAgICAgICBsZXQgbmV3Q291bnQgPSAwO1xuICAgICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgbmV3UmVhY2hhYmxlKSB7XG4gICAgICAgICAgaWYgKHJlYWNoYWJsZS5oYXMoc2xvdCkpIGNvbnRpbnVlO1xuICAgICAgICAgIHNsb3RXZWlnaHRzW3Nsb3RdICs9IHN0ZXA7XG4gICAgICAgICAgbmV3Q291bnQrKztcbiAgICAgICAgfVxuICAgICAgICBpdGVtV2VpZ2h0c1tpdGVtXSArPSBuZXdDb3VudDtcbiAgICAgICAgcmVhY2hhYmxlID0gbmV3UmVhY2hhYmxlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaXRlbXM6IG5ldyBLZXllZChpdGVtV2VpZ2h0cy5tYXAoeCA9PiB4IC8gdHJhdmVyc2VzKSksXG4gICAgICBzbG90czogbmV3IEtleWVkKHNsb3RXZWlnaHRzLm1hcCh4ID0+IHggLyB0cmF2ZXJzZXMpKSxcbiAgICB9O1xuICB9XG5cbiAgcmVwb3J0V2VpZ2h0cygpIHtcbiAgICBjb25zdCB3ZWlnaHRzID0gdGhpcy5jb21wdXRlV2VpZ2h0cyhuZXcgUmFuZG9tKCksIDEwKTtcbiAgICBjb25zdCBpdGVtV2VpZ2h0cyA9IHdlaWdodHMuaXRlbXMubWFwKCh3LCBpKSA9PiBbaSwgd10gYXMgW0l0ZW1JbmRleCwgbnVtYmVyXSk7XG4gICAgY29uc3Qgc2xvdFdlaWdodHMgPSB3ZWlnaHRzLnNsb3RzLm1hcCgodywgaSkgPT4gW2ksIHddIGFzIFtTbG90SW5kZXgsIG51bWJlcl0pO1xuICAgIGZ1bmN0aW9uIGl0ZW1OYW1lKGlkOiBudW1iZXIpIHtcbiAgICAgIGNvbnN0IHJvbSA9ICh3aW5kb3cgYXMgYW55KS5yb207XG4gICAgICBpZiAoKGlkICYgfjB4ZmYpID09PSAweDIwMCAmJiByb20gJiYgcm9tLml0ZW1zW2lkICYgMHhmZl0pIHtcbiAgICAgICAgcmV0dXJuIHJvbS5pdGVtc1tpZCAmIDB4ZmZdLm1lc3NhZ2VOYW1lO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGAkJHtpZC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgIH1cbiAgICBpdGVtV2VpZ2h0cy5zb3J0KChhLCBiKSA9PiBiWzFdIC0gYVsxXSk7XG4gICAgc2xvdFdlaWdodHMuc29ydCgoYSwgYikgPT4gYlsxXSAtIGFbMV0pO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCB3ZWlnaHRdIG9mIGl0ZW1XZWlnaHRzKSB7XG4gICAgICAvL2lmIChpbmRleCA8IHRoaXMuY29tbW9uKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkID0gdGhpcy5pdGVtcy5nZXQoaW5kZXggYXMgSXRlbUluZGV4KSE7XG4gICAgICBpZiAoIXRoaXMuaXRlbUluZm9zLmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0aGlzLnByb2dyZXNzaW9uLmhhcyhpZCkpIGNvbnRpbnVlO1xuICAgICAgY29uc29sZS5sb2coYEl0ZW0gJHtpdGVtTmFtZShpZCl9OiAke3dlaWdodH1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIHdlaWdodF0gb2Ygc2xvdFdlaWdodHMpIHtcbiAgICAgIC8vaWYgKGluZGV4IDwgdGhpcy5jb21tb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSB0aGlzLnNsb3RzLmdldChpbmRleCBhcyBTbG90SW5kZXgpITtcbiAgICAgIGlmICghdGhpcy5zbG90SW5mb3MuaGFzKGlkKSkgY29udGludWU7XG4gICAgICBjb25zb2xlLmxvZyhgU2xvdCAke3RoaXMuY2hlY2tOYW1lKGlkKX06ICR7d2VpZ2h0fWApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNodWZmbGUoZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSxcbiAgICAgICAgICAgICAgICBhdHRlbXB0cyA9IDIwMCwgLy8gMFxuICAgICAgICAgICAgICAgIHByb2dyZXNzPzogUHJvZ3Jlc3NUcmFja2VyLFxuICAgICAgICAgICAgICAgIHNwb2lsZXI/OiBTcG9pbGVyKTogUHJvbWlzZTxNYXA8U2xvdElkLCBJdGVtSWQ+fG51bGw+IHtcbiAgICAod2luZG93IGFzIGFueSkuZ3JhcGggPSB0aGlzO1xuICAgIGlmIChwcm9ncmVzcykgcHJvZ3Jlc3MuYWRkVGFza3MoTWF0aC5mbG9vcihhdHRlbXB0cyAvIDEwKSk7XG4gICAgY29uc3Qgd2VpZ2h0cyA9IHRoaXMuY29tcHV0ZVdlaWdodHMocmFuZG9tLCAxMDAwKTtcbiAgICAvLyBjb25zdCBpdGVtV2VpZ2h0cyA9IG5ldyBNYXAod2VpZ2h0cy5pdGVtcy5tYXAoKHcsIGkpID0+IFtpLCB3XSBhcyBbSXRlbUluZGV4LCBudW1iZXJdKSk7XG4gICAgLy8gY29uc3Qgc2xvdFdlaWdodHMgPSBuZXcgTWFwKHdlaWdodHMuc2xvdHMubWFwKCh3LCBpKSA9PiBbaSwgd10gYXMgW1Nsb3RJbmRleCwgbnVtYmVyXSkpO1xuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgYXR0ZW1wdHM7IGF0dGVtcHQrKykge1xuICAgICAgaWYgKHByb2dyZXNzICYmIChhdHRlbXB0ICUgMTAgPT09IDkpKSB7XG4gICAgICAgIHByb2dyZXNzLmFkZENvbXBsZXRlZCgxKTsgXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSk7IC8vIHRoaXMgcHJvYmFibHkgc2hvdWxkbid0IGJlIHJBRlxuICAgICAgfVxuICAgICAgY29uc3QgZmlsbCA9IG5ldyBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4oKTtcbiAgICAgIHRoaXMucHJlZmlsbChmaWxsLCByYW5kb20pO1xuICAgICAgY29uc3QgaW5kZXhGaWxsID0gdGhpcy5jb21wcmVzc0ZpbGwoZmlsbCk7XG4gICAgICBjb25zdCBpdGVtcyA9IFsuLi5yYW5kb20uaXNodWZmbGVNZXRyb3BvbGlzKHRoaXMuaXRlbVBvb2woaW5kZXhGaWxsLnZhbHVlcygpLCB3ZWlnaHRzKSwgMCldLnJldmVyc2UoKTtcbiAgICAgIGxldCBoYXMgPSBCaXRzLmZyb20obmV3IFNldChpdGVtcykpO1xuICAgICAgY29uc3QgYmFja3RyYWNrcyA9IE1hdGguZmxvb3IoYXR0ZW1wdCAvIDUpO1xuICAgICAgaWYgKCF0aGlzLmZpbGxJbnRlcm5hbChpbmRleEZpbGwsIGl0ZW1zLCBoYXMsIHJhbmRvbSwgd2VpZ2h0cywgZmxhZ3NldCwgYmFja3RyYWNrcykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBwYXRoOiBudW1iZXJbXVtdfHVuZGVmaW5lZCA9IHNwb2lsZXIgPyBbXSA6IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGZpbmFsID0gdGhpcy50cmF2ZXJzZShpID0+IGluZGV4RmlsbC5nZXQoaSksIEJpdHMub2YoKSwgcGF0aCk7XG4gICAgICAvLyBUT0RPIC0gZmxhZ3MgdG8gbG9vc2VuIHRoaXMgcmVxdWlyZW1lbnQgKGJlZm9yZSBsb2dnaW5nKT8/P1xuICAgICAgLy8gICAgICAtIGJ1dCBpdCdzIGFsc28gYSB1c2VmdWwgZGlhZ25vc3RpYy5cbiAgICAgIGlmIChmaW5hbC5zaXplICE9PSB0aGlzLnNsb3RzLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBucyA9IChzaTogU2xvdEluZGV4KSA9PiBgJHtTdHJpbmcoc2kpLnBhZFN0YXJ0KDMpfSAke1xuICAgICAgICAgICAgdGhpcy5zbG90cy5nZXQoc2kpIS50b1N0cmluZygxNikucGFkU3RhcnQoMywgJzAnKX0gJHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tOYW1lKHRoaXMuc2xvdHMuZ2V0KHNpKSEpfWA7XG4gICAgICAgIGNvbnN0IG5pID0gKGlpOiBJdGVtSW5kZXgpID0+IGAke1N0cmluZyhpaSkucGFkU3RhcnQoMyl9ICR7XG4gICAgICAgICAgICB0aGlzLml0ZW1zLmdldChpaSkhLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgzLCAnMCcpfSAke1xuICAgICAgICAgICAgdGhpcy5jaGVja05hbWUodGhpcy5pdGVtcy5nZXQoaWkpISl9YDtcbiAgICAgICAgY29uc3QgbWlzc2luZyA9IG5ldyBTZXQoWy4uLnRoaXMuc2xvdHNdLm1hcCh4ID0+IHhbMF0pKTtcbiAgICAgICAgZm9yIChjb25zdCBzbG90IG9mIGZpbmFsKSBtaXNzaW5nLmRlbGV0ZShzbG90KTtcbiAgICAgICAgY29uc3QgbWlzc2luZ01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiBtaXNzaW5nKSB7XG4gICAgICAgICAgbWlzc2luZ01hcC5zZXQoXG4gICAgICAgICAgICAgIG5zKHNsb3QpLFxuICAgICAgICAgICAgICB0aGlzLmdyYXBoLmdldChzbG90KSFcbiAgICAgICAgICAgICAgICAgIC5tYXAociA9PiAnXFxuICAgICcgKyAoQml0cy5iaXRzKHIpIGFzIEl0ZW1JbmRleFtdKS5tYXAobmkpXG4gICAgICAgICAgICAgICAgICAuam9pbignICYgJykpLmpvaW4oJycpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBOT1RFOiBwYXRoW2ldWzBdIGlzIHNsb3QgaW5kZXhlcywgbm90IGl0ZW1zLCBzbyB0aGlzIGRvZXMgbm90IHdvcmsuXG4gICAgICAgIC8vIGNvbnN0IGhhcyA9XG4gICAgICAgIC8vICAgICAobmV3IFNldChwYXRoID8gcGF0aC5tYXAoaSA9PiBpWzBdKSA6IHNlcSh0aGlzLml0ZW1zLmxlbmd0aCkpKSBhc1xuICAgICAgICAvLyAgICAgICAgIFNldDxJdGVtSW5kZXg+O1xuICAgICAgICAvLyBjb25zdCBub3RIYXMgPVxuICAgICAgICAvLyAgICAgc2VxKHRoaXMuaXRlbXMubGVuZ3RoLCBpID0+IGkgYXMgSXRlbUluZGV4KS5maWx0ZXIoaSA9PiAhaGFzLmhhcyhpKSlcbiAgICAgICAgLy8gICAgICAgICAuc29ydCgoYSwgYikgPT4gYSAtIGIpLm1hcChuaSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEluaXRpYWwgZmlsbCBuZXZlciByZWFjaGVkIHNsb3RzOlxcbiAgJHtcbiAgICAgICAgICAgICAgICAgICAgICBbLi4ubWlzc2luZ01hcC5rZXlzKCldLnNvcnQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGsgPT4gayArIG1pc3NpbmdNYXAuZ2V0KGspISkuam9pbignXFxuICAnKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyB9XFxuVW5hdmFpbGFibGUgaXRlbXM6XFxuICAke25vdEhhcy5qb2luKCdcXG4gICcpfWApO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmFsLCB0aGlzKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLmV4cGFuZEZpbGwoaW5kZXhGaWxsLCBmaWxsKTtcbiAgICAgIGNvbnN0IG91dCA9IHRoaXMuZmlsbE5vblByb2dyZXNzaW9uKGZpbGwsIGZsYWdzZXQsIHJhbmRvbSk7XG4gICAgICBpZiAob3V0ID09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgaWYgKHByb2dyZXNzKSB7XG4gICAgICAgIHByb2dyZXNzLmFkZENvbXBsZXRlZChNYXRoLmZsb29yKChhdHRlbXB0cyAtIGF0dGVtcHQpIC8gMTAwKSk7XG4gICAgICB9XG4gICAgICBpZiAoc3BvaWxlcikge1xuICAgICAgICBmb3IgKGNvbnN0IFtzbG90LCBpdGVtXSBvZiBmaWxsKSB7XG4gICAgICAgICAgLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXAuXG4gICAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMuY2hlY2tOYW1lKHNsb3QpLnJlcGxhY2UoL15bMC05YS1mXXszfSAvLCAnJyk7XG4gICAgICAgICAgc3BvaWxlci5hZGRTbG90KHNsb3QsIG5hbWUsIGl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBbdGFyZ2V0LCAuLi5kZXBzXSBvZiBwYXRoKSB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0IDwgdGhpcy5jb21tb24gfHwgaW5kZXhGaWxsLmhhcyh0YXJnZXQgYXMgU2xvdEluZGV4KSkge1xuICAgICAgICAgICAgICBzcG9pbGVyLmFkZENoZWNrKFxuICAgICAgICAgICAgICAgICAgdGhpcy5zbG90cy5nZXQodGFyZ2V0IGFzIFNsb3RJbmRleCkhLFxuICAgICAgICAgICAgICAgICAgZGVwcy5tYXAoZCA9PiB0aGlzLml0ZW1zLmdldChkIGFzIEl0ZW1JbmRleCkhKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZmlsbEludGVybmFsKGZpbGw6IE11dGFibGVBcnJheUJpTWFwPFNsb3RJbmRleCwgSXRlbUluZGV4PixcbiAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IEl0ZW1JbmRleFtdLFxuICAgICAgICAgICAgICAgICAgICAgICBoYXM6IEJpdHMsXG4gICAgICAgICAgICAgICAgICAgICAgIHJhbmRvbTogUmFuZG9tLFxuICAgICAgICAgICAgICAgICAgICAgICB3ZWlnaHRzOiBXZWlnaHRzLFxuICAgICAgICAgICAgICAgICAgICAgICBmbGFnc2V0OiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgICAgICAgICBiYWNrc3RlcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZpeGVkID0gbmV3IFNldChmaWxsLmtleXMoKSk7XG4gICAgZm9yIChsZXQgYml0OiBJdGVtSW5kZXggfCB1bmRlZmluZWQgPSBpdGVtcy5wb3AoKTsgYml0ICE9IG51bGw7IGJpdCA9IGl0ZW1zLnBvcCgpKSB7XG4gICAgICBpZiAoIUJpdHMuaGFzKGhhcywgYml0KSkgY29udGludWU7IC8vIGl0ZW0gYWxyZWFkeSBwbGFjZWQ6IHNraXBcbiAgICAgIGNvbnN0IGl0ZW1JbmZvID0gdGhpcy5pdGVtSW5mb0Zyb21JbmRleChiaXQpO1xuICAgICAgaGFzID0gQml0cy53aXRob3V0KGhhcywgYml0KTtcbiAgICAgIC8vIGNvbnN0IHJlYWNoYWJsZSA9XG4gICAgICAvLyAgICAgdGhpcy5leHBhbmRSZWFjaGFibGUodGhpcy50cmF2ZXJzZShpID0+IGZpbGwuZ2V0KGkpLCBoYXMpLFxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzZXQpO1xuICAgICAgLy8gYXJyLnNvcnQoKGEsIGIpID0+IGJbMF0gLSBhWzBdKTtcbiAgICAgIC8vIHJhbmRvbS5zaHVmZmxlKHJlYWNoYWJsZSk7XG4gICAgICBjb25zdCByZWFjaGFibGUgPSBbLi4udGhpcy50cmF2ZXJzZShpID0+IGZpbGwuZ2V0KGkpLCBoYXMpXS5tYXAoaSA9PiBbd2VpZ2h0cy5zbG90cy5nZXQoaSkgfHwgMCwgaV0gYXMgW251bWJlciwgU2xvdEluZGV4XSk7XG5cbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgY29uc3QgY2hlY2tlZCA9IG5ldyBTZXQoZmlsbC5rZXlzKCkpO1xuICAgICAgLy8gSW5jcmVhc2UgdGhlIHRlbXBlcmF0dXJlIHdpdGggbW9yZSBiYWNrc3RlcHNcbiAgICAgIGZvciAoY29uc3Qgc2xvdCBvZiByYW5kb20uaXNodWZmbGVNZXRyb3BvbGlzKHJlYWNoYWJsZSwgKDAgKyBiYWNrc3RlcHMpICogKGJhY2tzdGVwcyArIDEpKSkge1xuICAgICAgICBpZiAoY2hlY2tlZC5oYXMoc2xvdCkpIGNvbnRpbnVlO1xuICAgICAgICBjaGVja2VkLmFkZChzbG90KTtcbiAgICAgICAgY29uc3Qgc2xvdEluZm8gPSB0aGlzLnNsb3RJbmZvRnJvbUluZGV4KHNsb3QpO1xuICAgICAgICBpZiAoIXNsb3RJbmZvIHx8XG4gICAgICAgICAgICBmbGFnc2V0LnByZXNlcnZlVW5pcXVlQ2hlY2tzKCkgJiYgIXNsb3RJbmZvLnVuaXF1ZSB8fFxuICAgICAgICAgICAgIXRoaXMuZml0cyhzbG90SW5mbywgaXRlbUluZm8sIGZsYWdzZXQpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZmlsbC5zZXQoc2xvdCwgYml0KTtcbiAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgY29udGludWU7XG4gICAgICBjaGVja2VkLmNsZWFyKCk7XG4gICAgICBpZiAoYmFja3N0ZXBzLS0gPiAwKSB7XG4gICAgICAgIC8vIHRha2UgYSBiYWNrLXN0ZXBcbiAgICAgICAgZm9yIChjb25zdCBzbG90IG9mIHJhbmRvbS5pc2h1ZmZsZU1ldHJvcG9saXMocmVhY2hhYmxlLCAxMDApKSB7XG4gICAgICAgICAgaWYgKGNoZWNrZWQuaGFzKHNsb3QpIHx8ICFmaWxsLmhhcyhzbG90KSB8fCBmaXhlZC5oYXMoc2xvdCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGNoZWNrZWQuYWRkKHNsb3QpO1xuICAgICAgICAgIGNvbnN0IHNsb3RJbmZvID0gdGhpcy5zbG90SW5mb0Zyb21JbmRleChzbG90KTtcbiAgICAgICAgICBpZiAoIXNsb3RJbmZvIHx8ICF0aGlzLmZpdHMoc2xvdEluZm8sIGl0ZW1JbmZvLCBmbGFnc2V0KSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgcHJldmlvdXNJdGVtID0gZmlsbC5yZXBsYWNlKHNsb3QsIGJpdCkgPz8gZGllKCk7XG4gICAgICAgICAgaGFzID0gQml0cy53aXRoKGhhcywgcHJldmlvdXNJdGVtKTtcbiAgICAgICAgICBpdGVtcy5wdXNoKHByZXZpb3VzSXRlbSk7XG4gICAgICAgICAgcmFuZG9tLnNodWZmbGUoaXRlbXMpO1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZm91bmQpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gY29uc3QgbnMgPSAoc2k6IFNsb3RJbmRleCkgPT4gdGhpcy5jaGVja05hbWUodGhpcy5zbG90cy5nZXQoc2kpISk7XG4gICAgICAvLyBjb25zdCBuaSA9IChpaTogSXRlbUluZGV4KSA9PiB0aGlzLmNoZWNrTmFtZSh0aGlzLml0ZW1zLmdldChpaSkhKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBQb29sOlxcbiAgJHtpdGVtcy5tYXAobmkpLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgRmlsbDpcXG4gICR7Wy4uLmZpbGxdLm1hcCgoW3MsaV0pID0+IGAke25zKHMpfTogJHtuaShpKX1gKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgLy8gY29uc29sZS5lcnJvcihgUkVST0xMOiBDb3VsZCBub3QgcGxhY2UgaXRlbSBpbmRleCAke2JpdH06ICR7bmkoYml0KX1gKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGl0ZW1Qb29sKGV4Y2x1ZGU6IEl0ZXJhYmxlPEl0ZW1JbmRleD4sIHdlaWdodHM6IFdlaWdodHMpOiBbbnVtYmVyLCBJdGVtSW5kZXhdW10ge1xuICAgIGNvbnN0IGV4Y2x1ZGVTZXQgPSBuZXcgU2V0KGV4Y2x1ZGUpO1xuICAgIGNvbnN0IGFycjogW251bWJlciwgSXRlbUluZGV4XVtdID0gW107XG4gICAgZm9yIChjb25zdCBbaWRdIG9mIHRoaXMuaXRlbUluZm9zKSB7XG4gICAgICBjb25zdCBpbmRleCA9IHRoaXMuaXRlbXMuaW5kZXgoaWQpO1xuICAgICAgLy8gc2tpcCBub24tcHJvZ3Jlc3Npb24gYW5kIGFscmVhZHktcGxhY2VkIGl0ZW1zXG4gICAgICBpZiAoaW5kZXggPT0gbnVsbCkgY29udGludWU7XG4gICAgICBpZiAoIXRoaXMucHJvZ3Jlc3Npb24uaGFzKGlkKSkgY29udGludWU7XG4gICAgICBpZiAoZXhjbHVkZVNldC5oYXMoaW5kZXgpKSBjb250aW51ZTtcbiAgICAgIGFyci5wdXNoKFt3ZWlnaHRzLml0ZW1zLmdldChpbmRleCkgfHwgMCwgaW5kZXhdKTtcbiAgICB9XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuXG4gIC8vIFRPRE8gLSBpbnN0ZWFkIG9mIHBsdW1iaW5nIHRoZSBmbGFnc2V0IHRocm91Z2ggaGVyZSwgY29uc2lkZXJcbiAgLy8gYnVpbGRpbmcgaXQgaW50byB0aGUgU2xvdEluZm8/ICBPciB0aGUgSXRlbUluZm8sIHNpbmNlIGl0J3NcbiAgLy8gcG9zc2libGUgZm9yIGEgdW5pcXVlIHNsb3QgdG8gYWNjZXB0IGEgbm9udW5pcXVlIGl0ZW0sIGJ1dFxuICAvLyBhIHVuaXF1ZSBpdGVtIG11c3QgYmUgaW4gYSB1bmlxdWUgc2xvdC4uLiBzYW1lIGRpZmZlcmVuY2VcbiAgcHJpdmF0ZSBmaXRzKHNsb3Q6IFNsb3RJbmZvLCBpdGVtOiBJdGVtSW5mbywgZmxhZ3NldDogRmxhZ1NldCk6IGJvb2xlYW4ge1xuICAgIGlmIChmbGFnc2V0LnByZXNlcnZlVW5pcXVlQ2hlY2tzKCkgJiZcbiAgICAgICAgaXRlbS51bmlxdWUgJiYgIXNsb3QudW5pcXVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gaXRlbS5wcmV2ZW50TG9zcyB8fCBzbG90LnByZXZlbnRMb3NzO1xuICAgIGlmIChzbG90Lmxvc3N5ICYmIGl0ZW0ubG9zYWJsZSAmJiBwcmV2ZW50TG9zcykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIFRPRE8gLSBmbGFnIGZvciBcInByb3RlY3QgYWxsIGxvc2FibGUgaXRlbXNcIlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZmlsbE5vblByb2dyZXNzaW9uKGZpbGw6IE11dGFibGVBcnJheUJpTWFwPFNsb3RJZCwgSXRlbUlkPixcbiAgICAgICAgICAgICAgICAgICAgIGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICByYW5kb206IFJhbmRvbSk6IE1hcDxTbG90SWQsIEl0ZW1JZD58bnVsbCB7XG4gICAgLy8gRmlndXJlIG91dCB3aGF0IHN0aWxsIG5lZWRzIHRvIGJlIGZpbGxlZC4gIFdpbGwgYmUgbW9zdGx5IGZpbGxlclxuICAgIC8vIGl0ZW1zLiAgSXRlbXMgYXJlIHNwbGl0IGludG8gdGhyZWUgZ3JvdXBzOiAoMSkgZmlyc3QgaXRlbXMgaXMgYW55XG4gICAgLy8gdW5pcXVlcyB0aGF0IG5lZWQgdG8gZ28gaW50byB1bmlxdWUgc2xvdHMgKGkuZS4gb25seSBpZiBgRXVgIGlzXG4gICAgLy8gc2V0KSwgKDIpIGVhcmx5IGl0ZW1zIGlzIGFueXRoaW5nIHRoYXQgbmVlZHMgc3BlY2lhbCB0cmVhdG1lbnQgdG9cbiAgICAvLyBwcmV2ZW50IHBsYWNlbWVudCBpbiBhIGxvc3N5IHNsb3QsICgzKSBvdGhlciBpdGVtcyBpcyBldmVyeXRoaW5nIGVsc2UuXG4gICAgY29uc3QgaXRlbVBhc3NlczogSXRlbUlkW11bXSA9IFtbXSwgW10sIFtdXTtcbiAgICAvLyBTbG90cyBhcmUgYnJva2VuIGludG8gdHdvIHBhc3NlczogKDEpIHJlc3RyaWN0ZWQgYW5kICgyKSB1bnJlc3RyaWN0ZWQuXG4gICAgY29uc3Qgc2xvdFBhc3NlczogU2xvdElkW11bXSA9IFtbXSwgW11dO1xuXG4gICAgZm9yIChjb25zdCBbaXRlbUlkLCBpbmZvXSBvZiB0aGlzLml0ZW1JbmZvcykge1xuICAgICAgaWYgKGZpbGwuaGFzVmFsdWUoaXRlbUlkKSkgY29udGludWU7XG4gICAgICBsZXQgaW5kZXggPSAyO1xuICAgICAgaWYgKGluZm8ubG9zYWJsZSAmJiBpbmZvLnByZXZlbnRMb3NzKSBpbmRleCA9IDE7XG4gICAgICBpZiAoZmxhZ3NldC5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpICYmIGluZm8udW5pcXVlKSBpbmRleCA9IDA7XG4gICAgICBpdGVtUGFzc2VzW2luZGV4XS5wdXNoKGl0ZW1JZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3Nsb3RJZCwgaW5mb10gb2YgdGhpcy5zbG90SW5mb3MpIHtcbiAgICAgIGlmIChmaWxsLmhhcyhzbG90SWQpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGluZGV4ID0gaW5mby5sb3NzeSAmJiBpbmZvLnByZXZlbnRMb3NzID8gMCA6IDE7XG4gICAgICBzbG90UGFzc2VzW2luZGV4XS5wdXNoKHNsb3RJZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgcGFzcyBvZiBbLi4uaXRlbVBhc3NlcywgLi4uc2xvdFBhc3Nlc10pIHtcbiAgICAgIHJhbmRvbS5zaHVmZmxlKHBhc3MpO1xuICAgIH1cblxuICAgIGNvbnN0IG4gPSAoc2k6IG51bWJlcikgPT4gdGhpcy5jaGVja05hbWUoc2kpO1xuICAgIGNvbnN0IHNjID0gaXRlcnMuY291bnQoaXRlcnMuY29uY2F0KC4uLnNsb3RQYXNzZXMpKTtcbiAgICBjb25zdCBpYyA9IGl0ZXJzLmNvdW50KGl0ZXJzLmNvbmNhdCguLi5pdGVtUGFzc2VzKSk7XG4gICAgaWYgKGljID4gc2MpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBTbG90cyAke3NjfTpcXG4gICR7Wy4uLml0ZXJzLmNvbmNhdCguLi5zbG90UGFzc2VzKV0ubWFwKG4pLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICBjb25zb2xlLmxvZyhgSXRlbXMgJHtpY306XFxuICAke1suLi5pdGVycy5jb25jYXQoLi4uaXRlbVBhc3NlcyldLm1hcChuKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb28gbWFueSBpdGVtc2ApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlcnMuY29uY2F0KC4uLml0ZW1QYXNzZXMpKSB7XG4gICAgICAvLyBUcnkgdG8gcGxhY2UgdGhlIGl0ZW0sIHN0YXJ0aW5nIHdpdGggZWFybGllcyBmaXJzdC5cbiAgICAgIC8vIE1pbWljcyBjb21lIGJlZm9yZSBjb25zdW1hYmxlcyBiZWNhdXNlIHRoZXJlJ3MgZmV3ZXIgcGxhY2VzIHRoZXkgY2FuIGdvLlxuICAgICAgLy8gU2luY2Uga2V5IHNsb3RzIGFyZSBhbGxvd2VkIHRvIGNvbnRhaW4gY29uc3VtYWJsZXMgKGV2ZW4gaW4gZnVsbCBzaHVmZmxlKSxcbiAgICAgIC8vIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHVuaXF1ZXMgZ28gaW50byB0aG9zZSBzbG90cyBmaXJzdC5cbiAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBzbG90cyBvZiBbLi4uc2xvdFBhc3Nlc10pIHtcbiAgICAgICAgaWYgKGZvdW5kKSBicmVhaztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzbG90cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmICh0aGlzLmZpdHModGhpcy5zbG90SW5mb3MuZ2V0KHNsb3RzW2ldKSEsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1JbmZvcy5nZXQoaXRlbSkhLCBmbGFnc2V0KSkge1xuICAgICAgICAgICAgZmlsbC5zZXQoc2xvdHNbaV0sIGl0ZW0pO1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgc2xvdHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBmaWxsIGV4dHJhIGl0ZW0gJHtpdGVtfS4gU2xvdHM6ICR7ZWFybHlTbG90c30sICR7b3RoZXJTbG90c31gKTtcbiAgICAgICAgY29uc29sZS5sb2coYFNsb3RzOlxcbiAgJHtbLi4uaXRlcnMuY29uY2F0KC4uLnNsb3RQYXNzZXMpXS5tYXAobikuam9pbignXFxuICAnKX1gKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgRmlsbDpcXG4gICR7Wy4uLmZpbGxdLm1hcCgoW3MsaV0pID0+IGAke25zKHMpfTogJHtuaShpKX1gKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgICBjb25zb2xlLmVycm9yKGBSRVJPTEw6IENvdWxkIG5vdCBwbGFjZSBpdGVtICR7bihpdGVtKX1gKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgTWFwKGZpbGwpO1xuICB9XG5cbiAgLy8gTk9URTogZm9yIGFuIEluZGV4RmlsbCwgdGhpcyBpcyBqdXN0IGdldCgpLCBidXQgZm9yXG4gIC8vIGFuIElkRmlsbCwgd2UgbmVlZCB0byBtYXAgaXQgYmFjayBhbmQgZm9ydGguLi5cbiAgdHJhdmVyc2UoZmlsbDogKHNsb3Q6IFNsb3RJbmRleCkgPT4gSXRlbUluZGV4fHVuZGVmaW5lZCxcbiAgICAgICAgICAgaGFzOiBCaXRzLFxuICAgICAgICAgICBwYXRoPzogbnVtYmVyW11bXSk6IFNldDxTbG90SW5kZXg+IHtcbiAgICBoYXMgPSBCaXRzLmNsb25lKGhhcyk7XG4gICAgY29uc3QgcmVhY2hhYmxlID0gbmV3IFNldDxTbG90SW5kZXg+KCk7XG4gICAgY29uc3QgcXVldWUgPSBuZXcgU2V0PFNsb3RJbmRleD4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBTbG90SW5kZXg7IGkgPCB0aGlzLnNsb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5ncmFwaC5nZXQoaSkgPT0gbnVsbCkge1xuICAgICAgICBjb25zb2xlLmRpcih0aGlzKTtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLnNsb3RzLmdldChpKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlYWNoYWJsZSBzbG90ICR7aWQ/LnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgIH1cbiAgICAgIHF1ZXVlLmFkZChpIGFzIFNsb3RJbmRleCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbiBvZiBxdWV1ZSkge1xuICAgICAgcXVldWUuZGVsZXRlKG4pO1xuICAgICAgaWYgKHJlYWNoYWJsZS5oYXMobikpIGNvbnRpbnVlO1xuICAgICAgLy8gY2FuIHdlIHJlYWNoIGl0P1xuICAgICAgY29uc3QgbmVlZGVkID0gdGhpcy5ncmFwaC5nZXQobik7XG4gICAgICBpZiAobmVlZGVkID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTm90IGluIGdyYXBoOiAke259YCk7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gbmVlZGVkLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmICghQml0cy5jb250YWluc0FsbChoYXMsIG5lZWRlZFtpXSkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAocGF0aCkgcGF0aC5wdXNoKFtuLCAuLi5CaXRzLmJpdHMobmVlZGVkW2ldKV0pO1xuICAgICAgICByZWFjaGFibGUuYWRkKG4pO1xuICAgICAgICAvLyBUT0RPIC0tLSBuZWVkIHRvIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyBoZXJlLlxuICAgICAgICAvLyAgICAgIC0tLSBmaWxsIHdvdWxkIGxpa2UgdG8gYmUgemVyby1iYXNlZCBidXQgZG9lc24ndCBuZWVkIHRvIGJlLlxuICAgICAgICAvLyAgICAgICAgICBjb3VsZCB1c2UgYSBzaW1wbGUgcGFpciBvZiBNYXBzLCBwb3NzaWJseT9cbiAgICAgICAgLy8gICAgICAgICAgb3IgZnJvbnQtbG9hZCB0aGUgaXRlbXM/XG4gICAgICAgIC8vICAgc2xvdHM6IDF4eCBvdGhlcnNcbiAgICAgICAgLy8gICBpdGVtczogMnh4IG90aGVyc1xuICAgICAgICAvLyBidXQgd2Ugd2FudCBzYW1lIGZsYWdzIHRvIGhhdmUgc2FtZSBpbmRleFxuICAgICAgICAvLyAgIHNsb3RzOiAoZml4ZWQpIChyZXF1aXJlZCBzbG90cykgKGV4dHJhIHNsb3RzKVxuICAgICAgICAvLyAgIGl0ZW1zOiAoZml4ZWQpIChyZXF1aXJlZCBzbG90cykgKGl0ZW1zKVxuICAgICAgICAvLyBpZiBuIGlzIGEgc2xvdCB0aGVuIGFkZCB0aGUgaXRlbSB0byBoYXMuXG4gICAgICAgIGNvbnN0IGl0ZW1zOiBJdGVtSW5kZXhbXSA9IFtdO1xuICAgICAgICBpZiAobiA8IHRoaXMuY29tbW9uKSBpdGVtcy5wdXNoKG4gYXMgbnVtYmVyIGFzIEl0ZW1JbmRleCk7XG4gICAgICAgIGNvbnN0IGZpbGxlZCA9IGZpbGwobik7XG4gICAgICAgIGlmIChmaWxsZWQgIT0gbnVsbCkgaXRlbXMucHVzaChmaWxsZWQpO1xuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICBoYXMgPSBCaXRzLndpdGgoaGFzLCBpdGVtKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGogb2YgdGhpcy51bmxvY2tzLmdldChpdGVtKSB8fCBbXSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ3JhcGguZ2V0KGopID09IG51bGwpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5kaXIodGhpcyk7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQWRkaW5nIGJhZCBub2RlICR7an0gZnJvbSB1bmxvY2sgJHtpdGVtfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUuYWRkKGopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBnZXQgZXJyb3JzIGFib3V0IGluaXRpYWwgZmlsbCBuZXZlciBmaWxsZWQgc2xvdHMsIHNlZSB3aGF0XG4gICAgLy8gaXRlbXMgYXJlIG1pc3NpbmcgKG5vdGU6IHJvbSBpcyBnbG9iYWwpXG4vLyAgICAgaWYocGF0aCljb25zb2xlLmxvZyhuZXcgQXJyYXkodGhpcy5pdGVtcy5sZW5ndGgpLmZpbGwoMCkubWFwKChfLGkpID0+IGkpXG4vLyAgICAgICAgIC5maWx0ZXIoaT0+IUJpdHMuaGFzKGhhcywgaSkpLm1hcChpID0+IFtpLHRoaXMuaXRlbXMuZ2V0KGkpXSkuc29ydCgoYSxiKT0+YVsxXS1iWzFdKVxuLy8gICAgICAgICAubWFwKChbaixpXSkgPT4gYCR7U3RyaW5nKGopLnBhZFN0YXJ0KDMpfSAke2hleChpKS5wYWRTdGFydCgzLCcwJyl9ICR7XG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrTmFtZShpKX1gKS5qb2luKCdcXG4nKSk7XG4vLyAod2luZG93IGFzIGFueSkuRklOQUxIQVMgPSBoYXM7XG5cbiAgICByZXR1cm4gcmVhY2hhYmxlO1xuICB9XG5cbiAgZXhwYW5kRmlsbChpbmRleEZpbGw6IE11dGFibGVBcnJheUJpTWFwPFNsb3RJbmRleCwgSXRlbUluZGV4PixcbiAgICAgICAgICAgICBmaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4pIHtcbiAgICBmb3IgKGNvbnN0IFtzbG90SW5kZXgsIGl0ZW1JbmRleF0gb2YgaW5kZXhGaWxsKSB7XG4gICAgICBjb25zdCBzbG90SWQgPSB0aGlzLnNsb3RzLmdldChzbG90SW5kZXgpO1xuICAgICAgY29uc3QgaXRlbUlkID0gdGhpcy5pdGVtcy5nZXQoaXRlbUluZGV4KTtcbiAgICAgIGlmIChzbG90SWQgPT0gbnVsbCB8fCBpdGVtSWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nYCk7XG4gICAgICBmaWxsLnJlcGxhY2Uoc2xvdElkLCBpdGVtSWQpO1xuICAgIH1cbiAgfVxuXG4gIGNvbXByZXNzRmlsbChmaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4pOlxuICBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SW5kZXgsIEl0ZW1JbmRleD4ge1xuICAgIGNvbnN0IGluZGV4RmlsbCA9IG5ldyBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SW5kZXgsIEl0ZW1JbmRleD4oKTtcbiAgICBmb3IgKGNvbnN0IFtzbG90SWQsIGl0ZW1JZF0gb2YgZmlsbCkge1xuICAgICAgY29uc3Qgc2xvdEluZGV4ID0gdGhpcy5zbG90cy5pbmRleChzbG90SWQpO1xuICAgICAgY29uc3QgaXRlbUluZGV4ID0gdGhpcy5pdGVtcy5pbmRleChpdGVtSWQpO1xuICAgICAgaWYgKHNsb3RJbmRleCA9PSBudWxsIHx8IGl0ZW1JbmRleCA9PSBudWxsKSB7XG4gICAgICAgIC8vIFRPRE8gLSB0aGlzIGlzIG5vdCB1bnJlYXNvbmFibGUgLSB3ZSBjYW4gcHJlLWZpbGwgYSBzbG90IChhbHdheXNcbiAgICAgICAgLy8gdHJhY2tlZCkgd2l0aCBhIG5vbi1wcm9ncmVzc2lvbiBpdGVtLi4uIGhvdyB0byBoYW5kbGU/IHdoYXQgdG8gbWFwXG4gICAgICAgIC8vIHRvPyAgQ2FuIHdlIG1ha2UgdXAgYSBkdW1teSBpbmRleCBvciBzb21ldGhpbmc/XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBCYWQgc2xvdC9pdGVtOiAke3Nsb3RJZH0gJHtzbG90SW5kZXh9ICR7aXRlbUlkfSAke2l0ZW1JbmRleH1gKTtcbiAgICAgIH1cbiAgICAgIGluZGV4RmlsbC5zZXQoc2xvdEluZGV4LCBpdGVtSW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gaW5kZXhGaWxsO1xuICB9XG5cbiAgY2hlY2tOYW1lKGlkOiBudW1iZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLndvcmxkc1tpZCA+Pj4gMjRdLmNoZWNrTmFtZShpZCAmIDB4ZmZmZmZmKTtcbiAgfVxuXG4gIGl0ZW1OYW1lRnJvbUluZGV4KGluZGV4OiBudW1iZXIpOiBzdHJpbmcge1xuICAgIGlmIChpbmRleCA8IHRoaXMuY29tbW9uKSByZXR1cm4gdGhpcy5jaGVja05hbWUodGhpcy5zbG90cy5nZXQoaW5kZXggYXMgYW55KSBhcyBhbnkpO1xuICAgIGNvbnN0IGlkID0gdGhpcy5pdGVtcy5nZXQoaW5kZXggYXMgYW55KTtcbiAgICBpZiAoIWlkIHx8IChpZCAmIH4weGZmKSAhPT0gMHgyMDApIHJldHVybiAnJCcgKyBoZXgoaWQgYXMgYW55KTtcbiAgICByZXR1cm4gKHdpbmRvdyBhcyBhbnkpLnJvbS5pdGVtc1tpZCAmIDB4ZmZdPy5tZXNzYWdlTmFtZSB8fCAnJCcgKyBoZXgoaWQgYXMgYW55KTtcbiAgfVxuXG4gIHByZWZpbGwoZmlsbDogTXV0YWJsZUFycmF5QmlNYXA8U2xvdElkLCBJdGVtSWQ+LCByYW5kb206IFJhbmRvbSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy53b3JsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHdvcmxkSWQgPSBpIDw8IDI0O1xuICAgICAgY29uc3Qgd29ybGRGaWxsID0gdGhpcy53b3JsZHNbaV0ucHJlZmlsbChyYW5kb20pO1xuICAgICAgZm9yIChjb25zdCBbc2xvdCwgaXRlbV0gb2Ygd29ybGRGaWxsKSB7XG4gICAgICAgIGZpbGwuc2V0KCh3b3JsZElkIHwgc2xvdCkgYXMgU2xvdElkLCAod29ybGRJZCB8IGl0ZW0pIGFzIEl0ZW1JZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXRlbUluZm9Gcm9tSW5kZXgoaXRlbTogSXRlbUluZGV4KTogSXRlbUluZm8ge1xuICAgIGNvbnN0IGlkID0gdGhpcy5pdGVtcy5nZXQoaXRlbSk7XG4gICAgaWYgKGlkID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgQmFkIGl0ZW06ICR7aXRlbX1gKTtcbiAgICByZXR1cm4gdGhpcy5pdGVtSW5mb0Zyb21JZChpZCk7XG4gIH1cblxuICBpdGVtSW5mb0Zyb21JZChpZDogSXRlbUlkKTogSXRlbUluZm8ge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLml0ZW1JbmZvcy5nZXQoaWQpO1xuICAgIGlmIChpbmZvID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpbmZvOiAke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIGluZm87XG4gIH1cblxuICBzbG90SW5mb0Zyb21JbmRleChzbG90OiBTbG90SW5kZXgpOiBTbG90SW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGlkID0gdGhpcy5zbG90cy5nZXQoc2xvdCk7XG4gICAgaWYgKGlkID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgQmFkIHNsb3Q6ICR7c2xvdH1gKTtcbiAgICByZXR1cm4gdGhpcy5zbG90SW5mb0Zyb21JZChpZCk7XG4gIH1cblxuICBzbG90SW5mb0Zyb21JZChpZDogU2xvdElkKTogU2xvdEluZm98dW5kZWZpbmVkIHtcbiAgICBjb25zdCBpbmZvID0gdGhpcy5zbG90SW5mb3MuZ2V0KGlkKTtcbiAgICBpZiAoaW5mbyAhPSBudWxsKSByZXR1cm4gaW5mbztcbiAgICAvLyB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaW5mbzogJHtoZXgoaWQpfWApO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFdlaWdodHMge1xuICAvKiogV2VpZ2h0IChwb3dlcikgb2YgZWFjaCBpdGVtLiAqL1xuICBpdGVtczogS2V5ZWQ8SXRlbUluZGV4LCBudW1iZXI+O1xuICAvKiogV2VpZ2h0IChkZXB0aCkgb2YgZWFjaCBzbG90LiAqL1xuICBzbG90czogS2V5ZWQ8U2xvdEluZGV4LCBudW1iZXI+O1xufVxuXG5cbi8vIFRPRE8gLSBjbGVhbiB0aGlzIHVwXG5pbnRlcmZhY2UgUHJvZ3Jlc3NUcmFja2VyIHtcbiAgYWRkVGFza3ModGFza3M6IG51bWJlcik6IHZvaWQ7XG4gIGFkZENvbXBsZXRlZCh0YXNrczogbnVtYmVyKTogdm9pZDtcbn1cbiJdfQ==