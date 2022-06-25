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
    computeWeights(traverses = 1) {
        const itemWeights = Array.from({ length: this.items.length }, () => 0);
        const slotWeights = Array.from({ length: this.slots.length }, () => 0);
        const random = new Random();
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
        const weights = this.computeWeights(10);
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
        const weights = this.computeWeights(100);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvZ3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVoQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBRXBDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuQyxPQUFPLEVBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQzdFLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUF5RGpDLE1BQU0sT0FBTyxLQUFLO0lBb0JoQixZQUE2QixNQUErQjs7UUFBL0IsV0FBTSxHQUFOLE1BQU0sQ0FBeUI7UUFRMUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hCLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFO2dCQUMxRCxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQztnQkFDbkMsS0FBSyxNQUFN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QztRQUNyRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELGNBQWMsQ0FBQyxFQUFVO1FBQ3ZCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksSUFBSSxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELGlCQUFpQixDQUFDLElBQWU7UUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsSUFBSSxFQUFFLElBQUksSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsY0FBYyxDQUFDLEVBQVU7UUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEMsSUFBSSxJQUFJLElBQUksSUFBSTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRTlCLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Qml0c30gZnJvbSAnLi4vYml0cy5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1Nwb2lsZXJ9IGZyb20gJy4uL3JvbS9zcG9pbGVyLmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge0tleWVkLCBBcnJheU1hcCwgTXV0YWJsZUFycmF5QmlNYXAsIGl0ZXJzLCBzcHJlYWR9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtkaWV9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5cbi8qKiBJbnB1dCBmb3IgdGhlIGdyYXBoLiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2NhdGlvbkxpc3Qge1xuICB3b3JsZE5hbWU6IHN0cmluZztcbiAgaXRlbXM6IFJlYWRvbmx5TWFwPG51bWJlciwgSXRlbUluZm8+O1xuICBzbG90czogUmVhZG9ubHlNYXA8bnVtYmVyLCBTbG90SW5mbz47XG4gIHJlcXVpcmVtZW50czogUmVhZG9ubHlNYXA8bnVtYmVyLCBJdGVyYWJsZTxJdGVyYWJsZTxudW1iZXI+Pj47XG4gIGNoZWNrTmFtZTogKG5vZGU6IG51bWJlcikgPT4gc3RyaW5nO1xuICBwcmVmaWxsOiAocmFuZG9tOiBSYW5kb20pID0+IE1hcDxudW1iZXIsIG51bWJlcj47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSXRlbUluZm8ge1xuICAvKiogVW5pcXVlIGl0ZW1zIGNhbiBvcHRpb25hbGx5IGJlIHNodWZmbGVkIHNlcGFyYXRlbHkuICovXG4gIHVuaXF1ZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBMb3NhYmxlIGl0ZW1zIGFyZSBhdCByaXNrIG9mIGJlaW5nIGxvc3QgaWYgdGhleSBhcmUgcGxhY2VkIGluIGEgbG9zc3kgc2xvdFxuICAgKiAoaS5lLiBpZiB0aGUgaW52ZW50b3J5IGlzIGZ1bGwpLlxuICAgKi9cbiAgbG9zYWJsZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBMb3NhYmxlIGl0ZW1zIG1heSBiZSBwcm90ZWN0ZWQsIG1lYW5pbmcgdGhhdCB0aGV5IHdpbGwgbm90IGJlIHBsYWNlZCBpbiBhXG4gICAqIGxvc3N5IHNsb3QuXG4gICAqL1xuICBwcmV2ZW50TG9zcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXZWlnaHQgZm9yIHBsYWNlbWVudC4gIEhpZ2hlciBudW1iZXJzIGFyZSBtb3JlIGxpa2VseSB0byBiZSBwbGFjZWQgZWFybGllci5cbiAgICogRGVmYXVsdCBpcyAxLiAgUG93ZXJmdWwgYW5kIGltcG9ydGFudCBpdGVtcyBzaG91bGQgYmUgZ2l2ZW4gbGFyZ2VyIHdlaWdodHNcbiAgICogdG8gbWFrZSBpdCBsZXNzIGxpa2VseSB0aGF0IHRoZXkgYWx3YXlzIGVuZCB1cCBpbiBlYXJseSBzcGhlcmVzLlxuICAgKi9cbiAgd2VpZ2h0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNsb3RJbmZvIHtcbiAgLyoqIFdoZXRoZXIgdGhlIHNsb3QgY2FuIGhvbGQgYSB1bmlxdWUgaXRlbS4gKi9cbiAgdW5pcXVlPzogYm9vbGVhbjtcbiAgLyoqIFdoZXRoZXIgbG9zYWJsZSBpdGVtcyBpbiB0aGlzIHNsb3QgYXJlIGF0IHJpc2sgb2YgYmVpbmcgbG9zdC4gKi9cbiAgbG9zc3k6IGJvb2xlYW47XG4gIC8qKiBXaGV0aGVyIHRoZSBzbG90IGlzIGRpc2FsbG93ZWQgZnJvbSBsb3NpbmcgaXRlbXMgKGUuZy4gdHJpZ2dlcnMpLiAqL1xuICBwcmV2ZW50TG9zcz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXZWlnaHQgZm9yIHBsYWNpbmcgcHJvZ3Jlc3Npb24gaXRlbXMuICBEZWZhdWx0IGlzIDEuICBVc2VmdWwgZm9yIG1ha2luZ1xuICAgKiBkaXN0YW50IGFuZCBvdXQtb2YtdGhlIHdheSBjaGVja3MgbW9yZSB3b3J0aHdoaWxlLiAgQWx0ZXJuYXRpdmVseSwgd2VcbiAgICogY291bGQganVzdCBhdm9pZCBldmVyIHBsYWNpbmcgbWltaWNzIGluIHRoZXNlIGFyZWFzP1xuICAgKi9cbiAgd2VpZ2h0PzogbnVtYmVyO1xufVxuXG5leHBvcnQgdHlwZSBTbG90SW5kZXggPSBudW1iZXIgJiB7X19zbG90SW5kZXhfXzogbmV2ZXJ9O1xuZXhwb3J0IHR5cGUgSXRlbUluZGV4ID0gbnVtYmVyICYge19faXRlbUluZGV4X186IG5ldmVyfTtcbmV4cG9ydCB0eXBlIFNsb3RJZCA9IG51bWJlciAmIHtfX3Nsb3RJZF9fOiBuZXZlcn07XG5leHBvcnQgdHlwZSBJdGVtSWQgPSBudW1iZXIgJiB7X19pdGVtSWRfXzogbmV2ZXJ9O1xuXG4vKipcbiAqIEEgZ3JhcGggZGF0YSBzdHJ1Y3R1cmUuICBJbml0aWFsaXplZCB3aXRoIG9uZSBvciBtb3JlIGxvY2F0aW9uIGxpc3RzXG4gKiAoYSBzZXQgb2YgRE5GIGV4cHJlc3Npb25zIHByb3ZpZGluZyBhIGJ1bmNoIG9mIG51bWVyaWMgZmxhZ3MpLlxuICovXG5leHBvcnQgY2xhc3MgR3JhcGgge1xuXG4gIC8vcHJpdmF0ZSByZWFkb25seSByZXZlcnNlV29ybGRzOiBSZWFkb25seU1hcDxMb2NhdGlvbkxpc3QsIG51bWJlcj47XG4gIHByaXZhdGUgcmVhZG9ubHkgY29tbW9uOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2xvdHM6IEFycmF5TWFwPFNsb3RJbmRleCwgU2xvdElkPjtcbiAgcHJpdmF0ZSByZWFkb25seSBpdGVtczogQXJyYXlNYXA8SXRlbUluZGV4LCBJdGVtSWQ+O1xuICAvLyBOb3RlIHRoYXQgbm90IGV2ZXJ5IGl0ZW0gZ2V0cyBhbiBpbmRleCAtIG9ubHkgdGhvc2UgaW4gdGhlIGdyYXBoLlxuICBwcml2YXRlIHJlYWRvbmx5IHNsb3RJbmZvczogUmVhZG9ubHlNYXA8U2xvdElkLCBTbG90SW5mbz47XG4gIHByaXZhdGUgcmVhZG9ubHkgaXRlbUluZm9zOiBSZWFkb25seU1hcDxJdGVtSWQsIEl0ZW1JbmZvPjtcblxuICAvLyBJdGVtcyB0aGF0IHByb3ZpZGUgcHJvZ3Jlc3Npb24uXG4gIHByaXZhdGUgcmVhZG9ubHkgcHJvZ3Jlc3Npb246IFNldDxJdGVtSWQ+O1xuXG4gIC8vIC8qKiBNYXBwaW5nIG9mIHByb3ZpZGVzIHRvIHRoZSBzYW1lIHJlcXVpcmVzLiAqL1xuICAvLyBwcml2YXRlIHJlYWRvbmx5IGNvbW1vbkZpbGw6IEFycmF5TWFwPFNsb3RJbmRleCwgSXRlbUluZGV4PjtcblxuICAvKiogQml0c2V0cyBrZXllZCBieSBJdGVtSW5kZXgsIHJlcHJlc2VudCBhIERORiBjb25kaXRpb24uICovXG4gIHJlYWRvbmx5IGdyYXBoOiBLZXllZDxTbG90SW5kZXgsIHJlYWRvbmx5IEJpdHNbXT47XG4gIHJlYWRvbmx5IHVubG9ja3M6IEtleWVkPEl0ZW1JbmRleCwgcmVhZG9ubHkgU2xvdEluZGV4W10+O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgd29ybGRzOiByZWFkb25seSBMb2NhdGlvbkxpc3RbXSkge1xuICAgIC8vY29uc3QgcmV2ZXJzZVdvcmxkcyA9IG5ldyBNYXA8TG9jYXRpb25MaXN0LCBudW1iZXI+KCk7XG4gICAgLy9mb3IgKGxldCBpID0gMDsgaSA8IHdvcmxkcy5sZW5ndGg7IGkrKykge1xuICAgIC8vICByZXZlcnNlV29ybGRzLnNldCh3b3JsZHNbaV0sIGkpO1xuICAgIC8vfVxuICAgIC8vdGhpcy5yZXZlcnNlV29ybGRzID0gcmV2ZXJzZVdvcmxkcztcblxuICAgIC8vIEJ1aWxkIHVwIGEgbGlzdCBvZiBhbGwga25vd24gcHJvdmlkZXMvcmVxdWlyZXMuXG4gICAgY29uc3QgcHJvdmlkZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCByZXF1aXJlZCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IHNsb3RzID0gbmV3IE1hcDxTbG90SWQsIFNsb3RJbmZvPigpO1xuICAgIGNvbnN0IGl0ZW1zID0gbmV3IE1hcDxJdGVtSWQsIEl0ZW1JbmZvPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd29ybGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB3b3JsZCA9IHdvcmxkc1tpXTtcbiAgICAgIGNvbnN0IHdvcmxkSWQgPSBpIDw8IDI0O1xuICAgICAgZm9yIChjb25zdCBbcHJvdmlkZWRJZCwgcmVxdWlyZW1lbnRdIG9mIHdvcmxkLnJlcXVpcmVtZW50cykge1xuICAgICAgICBwcm92aWRlZC5hZGQod29ybGRJZCB8IHByb3ZpZGVkSWQpO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJlcXVpcmVtZW50KSB7XG4gICAgICAgICAgZm9yIChjb25zdCBjb25kIG9mIHJvdXRlKSB7XG4gICAgICAgICAgICByZXF1aXJlZC5hZGQod29ybGRJZCB8IGNvbmQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSAgICAgICAgXG4gICAgICB9XG5cbiAgICAgIC8vIFByb2JhYmx5IGp1c3QgbWFrZSBhIGNvbW1vbiBpbmRleCBmaWxsIGFuZCBkbyBhIGZ1bGwgaW5kaXJlY3Rpb24/XG4gICAgICAvLyAgLSBpZiBpdCdzIGluIHRoZSBjb21tb24gZmlsbCwgdXNlIGl0LCBvdGhlcndpc2UgZmFsbCBiYWNrIG9uIHRoZVxuICAgICAgLy8gICAgaXRlbSBmaWxsP1xuXG4gICAgICBmb3IgKGNvbnN0IFtpdGVtSWQsIGluZm9dIG9mIHdvcmxkLml0ZW1zKSB7XG4gICAgICAgIGl0ZW1zLnNldCgod29ybGRJZCB8IGl0ZW1JZCkgYXMgSXRlbUlkLCBpbmZvKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW3Nsb3RJZCwgaW5mb10gb2Ygd29ybGQuc2xvdHMpIHtcbiAgICAgICAgc2xvdHMuc2V0KCh3b3JsZElkIHwgc2xvdElkKSBhcyBTbG90SWQsIGluZm8pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvcHkgdGhlIG1hcHMgYW5kIHNhdmUgdGhlbSBiZWZvcmUgd2Ugc3RhcnQgZGVsZXRpbmcgZWxlbWVudHMuXG4gICAgdGhpcy5pdGVtSW5mb3MgPSBuZXcgTWFwKGl0ZW1zKTtcbiAgICB0aGlzLnNsb3RJbmZvcyA9IG5ldyBNYXAoc2xvdHMpO1xuXG4gICAgdGhpcy5wcm9ncmVzc2lvbiA9IG5ldyBTZXQocmVxdWlyZWQgYXMgU2V0PEl0ZW1JZD4pO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcy5rZXlzKCkpIHJlcXVpcmVkLmFkZChpdGVtKTsgLy8gbm9uLXByb2dyZXNzaW9uIGxhc3RcblxuICAgIGNvbnN0IGNvbW1vbiA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIGNvbnN0IGV4dHJhUHJvdmlkZXMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjb25zdCBleHRyYVJlcXVpcmVzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgZm9yIChjb25zdCBjaGVjayBvZiByZXF1aXJlZCkge1xuICAgICAgKHByb3ZpZGVkLmhhcyhjaGVjaykgPyBjb21tb24gOiBleHRyYVJlcXVpcmVzKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHByb3ZpZGVkKSB7XG4gICAgICBpZiAoIXJlcXVpcmVkLmhhcyhjaGVjaykpIGV4dHJhUHJvdmlkZXMuYWRkKGNoZWNrKTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbW1vbiA9IGNvbW1vbi5zaXplO1xuICAgIHRoaXMuc2xvdHMgPSBuZXcgQXJyYXlNYXAoWy4uLmNvbW1vbiwgLi4uZXh0cmFQcm92aWRlc10gYXMgU2xvdElkW10pO1xuICAgIHRoaXMuaXRlbXMgPSBuZXcgQXJyYXlNYXAoWy4uLmNvbW1vbiwgLi4uZXh0cmFSZXF1aXJlc10gYXMgSXRlbUlkW10pO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIGdyYXBoIG5vdyB0aGF0IHdlIGhhdmUgdGhlIGFycmF5IG1hcHMuXG4gICAgY29uc3QgZ3JhcGg6IEJpdHNbXVtdID0gW107XG4gICAgY29uc3QgdW5sb2NrczogQXJyYXk8U2V0PFNsb3RJbmRleD4+ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3JsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHdvcmxkSWQgPSBpIDw8IDI0O1xuICAgICAgZm9yIChjb25zdCBbc2xvdCwgcmVxXSBvZiB3b3JsZHNbaV0ucmVxdWlyZW1lbnRzKSB7XG4gICAgICAgIGNvbnN0IHNsb3RJbmRleCA9IHRoaXMuc2xvdHMuaW5kZXgoKHdvcmxkSWQgfCBzbG90KSBhcyBTbG90SWQpO1xuICAgICAgICBpZiAoc2xvdEluZGV4ID09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb3ZpZGVkIGEgbm9uLXNsb3Q/ICR7aGV4KHNsb3QpfWApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICAgICAgY29uc3QgaXMgPVxuICAgICAgICAgICAgICBbLi4uY3NdLm1hcChjID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuaW5kZXgoKHdvcmxkSWQgfCBjKSBhcyBJdGVtSWQpID8/IGRpZSgpKTtcbiAgICAgICAgICAoZ3JhcGhbc2xvdEluZGV4XSB8fCAoZ3JhcGhbc2xvdEluZGV4XSA9IFtdKSkucHVzaChCaXRzLmZyb20oaXMpKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGkgb2YgaXMpIHtcbiAgICAgICAgICAgICh1bmxvY2tzW2ldIHx8ICh1bmxvY2tzW2ldID0gbmV3IFNldCgpKSkuYWRkKHNsb3RJbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2FuaXR5IGNoZWNrIHRvIG1ha2Ugc3VyZSBhbGwgc2xvdHMgYXJlIHByb3ZpZGVkLlxuICAgIGZvciAobGV0IGkgPSAwIGFzIFNsb3RJbmRleDsgaSA8IHRoaXMuc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghZ3JhcGhbaV0gfHwgIWdyYXBoW2ldLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBpZCA9IHRoaXMuc2xvdHMuZ2V0KGkpID8/IE5hTiBhcyBTbG90SWQ7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLmNoZWNrTmFtZShpZCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYE5vdGhpbmcgcHJvdmlkZWQgJCR7aGV4KGlkKX06ICR7bmFtZX0gKGluZGV4ICR7aX0pYCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZ3JhcGggPSBuZXcgS2V5ZWQoZ3JhcGgpO1xuICAgIHRoaXMudW5sb2NrcyA9IG5ldyBLZXllZCh1bmxvY2tzLm1hcChzcHJlYWQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEbyBvbmUgb3IgbW9yZSBzYW1wbGVzIG9mIGFuIGFyYml0cmFyeS1vcmRlcmVkIGl0ZW0gcGlja3VwIHRvXG4gICAqIG1lYXN1cmUgcm91Z2hseSB0aGUgd2VpZ2h0IG9mIGVhY2ggaXRlbSBhbmQgc2xvdC5cbiAgICovXG4gIGNvbXB1dGVXZWlnaHRzKHRyYXZlcnNlcyA9IDEpOiBXZWlnaHRzIHtcbiAgICBjb25zdCBpdGVtV2VpZ2h0cyA9IEFycmF5LmZyb20oe2xlbmd0aDogdGhpcy5pdGVtcy5sZW5ndGh9LCAoKSA9PiAwKTtcbiAgICBjb25zdCBzbG90V2VpZ2h0cyA9IEFycmF5LmZyb20oe2xlbmd0aDogdGhpcy5zbG90cy5sZW5ndGh9LCAoKSA9PiAwKTtcbiAgICBjb25zdCByYW5kb20gPSBuZXcgUmFuZG9tKCk7XG4gICAgY29uc3QgcHJvZ3Jlc3Npb25JdGVtcyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2luZGV4LCBpZF0gb2YgdGhpcy5pdGVtcykge1xuICAgICAgaWYgKGlkID49IDB4MjAwICYmIGlkIDwgMHgyODAgJiYgdGhpcy5wcm9ncmVzc2lvbi5oYXMoaWQpKSBwcm9ncmVzc2lvbkl0ZW1zLnB1c2goaW5kZXgpO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRyYXZlcnNlczsgaSsrKSB7XG4gICAgICBjb25zdCBpdGVtcyA9IHJhbmRvbS5zaHVmZmxlKFsuLi5wcm9ncmVzc2lvbkl0ZW1zXSk7XG4gICAgICBsZXQgaGFzID0gQml0cy5vZigpO1xuICAgICAgbGV0IHJlYWNoYWJsZSA9IHRoaXMudHJhdmVyc2UoKCkgPT4gdW5kZWZpbmVkLCBoYXMpOyAvLyhjKSA9PiBjIDw9IHRoaXMuY29tbW9uID8gYyBhcyBhbnkgOiB1bmRlZmluZWQsIGhhcyk7XG4gICAgICBsZXQgc3RlcCA9IDA7XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgc3RlcCsrO1xuICAgICAgICBoYXMgPSBCaXRzLndpdGgoaGFzLCBpdGVtKTtcbiAgICAgICAgY29uc3QgbmV3UmVhY2hhYmxlID0gdGhpcy50cmF2ZXJzZSgoKSA9PiB1bmRlZmluZWQsIGhhcyk7IC8vKGMpID0+IGMgPD0gdGhpcy5jb21tb24gPyBjIGFzIGFueSA6IHVuZGVmaW5lZCwgaGFzKTtcbiAgICAgICAgbGV0IG5ld0NvdW50ID0gMDtcbiAgICAgICAgZm9yIChjb25zdCBzbG90IG9mIG5ld1JlYWNoYWJsZSkge1xuICAgICAgICAgIGlmIChyZWFjaGFibGUuaGFzKHNsb3QpKSBjb250aW51ZTtcbiAgICAgICAgICBzbG90V2VpZ2h0c1tzbG90XSArPSBzdGVwO1xuICAgICAgICAgIG5ld0NvdW50Kys7XG4gICAgICAgIH1cbiAgICAgICAgaXRlbVdlaWdodHNbaXRlbV0gKz0gbmV3Q291bnQ7XG4gICAgICAgIHJlYWNoYWJsZSA9IG5ld1JlYWNoYWJsZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGl0ZW1zOiBuZXcgS2V5ZWQoaXRlbVdlaWdodHMubWFwKHggPT4geCAvIHRyYXZlcnNlcykpLFxuICAgICAgc2xvdHM6IG5ldyBLZXllZChzbG90V2VpZ2h0cy5tYXAoeCA9PiB4IC8gdHJhdmVyc2VzKSksXG4gICAgfTtcbiAgfVxuXG4gIHJlcG9ydFdlaWdodHMoKSB7XG4gICAgY29uc3Qgd2VpZ2h0cyA9IHRoaXMuY29tcHV0ZVdlaWdodHMoMTApO1xuICAgIGNvbnN0IGl0ZW1XZWlnaHRzID0gd2VpZ2h0cy5pdGVtcy5tYXAoKHcsIGkpID0+IFtpLCB3XSBhcyBbSXRlbUluZGV4LCBudW1iZXJdKTtcbiAgICBjb25zdCBzbG90V2VpZ2h0cyA9IHdlaWdodHMuc2xvdHMubWFwKCh3LCBpKSA9PiBbaSwgd10gYXMgW1Nsb3RJbmRleCwgbnVtYmVyXSk7XG4gICAgZnVuY3Rpb24gaXRlbU5hbWUoaWQ6IG51bWJlcikge1xuICAgICAgY29uc3Qgcm9tID0gKHdpbmRvdyBhcyBhbnkpLnJvbTtcbiAgICAgIGlmICgoaWQgJiB+MHhmZikgPT09IDB4MjAwICYmIHJvbSAmJiByb20uaXRlbXNbaWQgJiAweGZmXSkge1xuICAgICAgICByZXR1cm4gcm9tLml0ZW1zW2lkICYgMHhmZl0ubWVzc2FnZU5hbWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gYCQke2lkLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpfWA7XG4gICAgfVxuICAgIGl0ZW1XZWlnaHRzLnNvcnQoKGEsIGIpID0+IGJbMV0gLSBhWzFdKTtcbiAgICBzbG90V2VpZ2h0cy5zb3J0KChhLCBiKSA9PiBiWzFdIC0gYVsxXSk7XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIHdlaWdodF0gb2YgaXRlbVdlaWdodHMpIHtcbiAgICAgIC8vaWYgKGluZGV4IDwgdGhpcy5jb21tb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWQgPSB0aGlzLml0ZW1zLmdldChpbmRleCBhcyBJdGVtSW5kZXgpITtcbiAgICAgIGlmICghdGhpcy5pdGVtSW5mb3MuaGFzKGlkKSkgY29udGludWU7XG4gICAgICBpZiAoIXRoaXMucHJvZ3Jlc3Npb24uaGFzKGlkKSkgY29udGludWU7XG4gICAgICBjb25zb2xlLmxvZyhgSXRlbSAke2l0ZW1OYW1lKGlkKX06ICR7d2VpZ2h0fWApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtpbmRleCwgd2VpZ2h0XSBvZiBzbG90V2VpZ2h0cykge1xuICAgICAgLy9pZiAoaW5kZXggPCB0aGlzLmNvbW1vbikgY29udGludWU7XG4gICAgICBjb25zdCBpZCA9IHRoaXMuc2xvdHMuZ2V0KGluZGV4IGFzIFNsb3RJbmRleCkhO1xuICAgICAgaWYgKCF0aGlzLnNsb3RJbmZvcy5oYXMoaWQpKSBjb250aW51ZTtcbiAgICAgIGNvbnNvbGUubG9nKGBTbG90ICR7dGhpcy5jaGVja05hbWUoaWQpfTogJHt3ZWlnaHR9YCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2h1ZmZsZShmbGFnc2V0OiBGbGFnU2V0LFxuICAgICAgICAgICAgICAgIHJhbmRvbTogUmFuZG9tLFxuICAgICAgICAgICAgICAgIGF0dGVtcHRzID0gMjAwLCAvLyAwXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3M/OiBQcm9ncmVzc1RyYWNrZXIsXG4gICAgICAgICAgICAgICAgc3BvaWxlcj86IFNwb2lsZXIpOiBQcm9taXNlPE1hcDxTbG90SWQsIEl0ZW1JZD58bnVsbD4ge1xuICAgICh3aW5kb3cgYXMgYW55KS5ncmFwaCA9IHRoaXM7XG4gICAgaWYgKHByb2dyZXNzKSBwcm9ncmVzcy5hZGRUYXNrcyhNYXRoLmZsb29yKGF0dGVtcHRzIC8gMTApKTtcbiAgICBjb25zdCB3ZWlnaHRzID0gdGhpcy5jb21wdXRlV2VpZ2h0cygxMDApO1xuICAgIC8vIGNvbnN0IGl0ZW1XZWlnaHRzID0gbmV3IE1hcCh3ZWlnaHRzLml0ZW1zLm1hcCgodywgaSkgPT4gW2ksIHddIGFzIFtJdGVtSW5kZXgsIG51bWJlcl0pKTtcbiAgICAvLyBjb25zdCBzbG90V2VpZ2h0cyA9IG5ldyBNYXAod2VpZ2h0cy5zbG90cy5tYXAoKHcsIGkpID0+IFtpLCB3XSBhcyBbU2xvdEluZGV4LCBudW1iZXJdKSk7XG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBhdHRlbXB0czsgYXR0ZW1wdCsrKSB7XG4gICAgICBpZiAocHJvZ3Jlc3MgJiYgKGF0dGVtcHQgJSAxMCA9PT0gOSkpIHtcbiAgICAgICAgcHJvZ3Jlc3MuYWRkQ29tcGxldGVkKDEpOyBcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVxdWVzdEFuaW1hdGlvbkZyYW1lKTsgLy8gdGhpcyBwcm9iYWJseSBzaG91bGRuJ3QgYmUgckFGXG4gICAgICB9XG4gICAgICBjb25zdCBmaWxsID0gbmV3IE11dGFibGVBcnJheUJpTWFwPFNsb3RJZCwgSXRlbUlkPigpO1xuICAgICAgdGhpcy5wcmVmaWxsKGZpbGwsIHJhbmRvbSk7XG4gICAgICBjb25zdCBpbmRleEZpbGwgPSB0aGlzLmNvbXByZXNzRmlsbChmaWxsKTtcbiAgICAgIGNvbnN0IGl0ZW1zID0gWy4uLnJhbmRvbS5pc2h1ZmZsZU1ldHJvcG9saXModGhpcy5pdGVtUG9vbChpbmRleEZpbGwudmFsdWVzKCksIHdlaWdodHMpLCAwKV0ucmV2ZXJzZSgpO1xuICAgICAgbGV0IGhhcyA9IEJpdHMuZnJvbShuZXcgU2V0KGl0ZW1zKSk7XG4gICAgICBjb25zdCBiYWNrdHJhY2tzID0gTWF0aC5mbG9vcihhdHRlbXB0IC8gNSk7XG4gICAgICBpZiAoIXRoaXMuZmlsbEludGVybmFsKGluZGV4RmlsbCwgaXRlbXMsIGhhcywgcmFuZG9tLCB3ZWlnaHRzLCBmbGFnc2V0LCBiYWNrdHJhY2tzKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhdGg6IG51bWJlcltdW118dW5kZWZpbmVkID0gc3BvaWxlciA/IFtdIDogdW5kZWZpbmVkO1xuICAgICAgY29uc3QgZmluYWwgPSB0aGlzLnRyYXZlcnNlKGkgPT4gaW5kZXhGaWxsLmdldChpKSwgQml0cy5vZigpLCBwYXRoKTtcbiAgICAgIC8vIFRPRE8gLSBmbGFncyB0byBsb29zZW4gdGhpcyByZXF1aXJlbWVudCAoYmVmb3JlIGxvZ2dpbmcpPz8/XG4gICAgICAvLyAgICAgIC0gYnV0IGl0J3MgYWxzbyBhIHVzZWZ1bCBkaWFnbm9zdGljLlxuICAgICAgaWYgKGZpbmFsLnNpemUgIT09IHRoaXMuc2xvdHMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IG5zID0gKHNpOiBTbG90SW5kZXgpID0+IGAke1N0cmluZyhzaSkucGFkU3RhcnQoMyl9ICR7XG4gICAgICAgICAgICB0aGlzLnNsb3RzLmdldChzaSkhLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgzLCAnMCcpfSAke1xuICAgICAgICAgICAgdGhpcy5jaGVja05hbWUodGhpcy5zbG90cy5nZXQoc2kpISl9YDtcbiAgICAgICAgY29uc3QgbmkgPSAoaWk6IEl0ZW1JbmRleCkgPT4gYCR7U3RyaW5nKGlpKS5wYWRTdGFydCgzKX0gJHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXMuZ2V0KGlpKSEudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDMsICcwJyl9ICR7XG4gICAgICAgICAgICB0aGlzLmNoZWNrTmFtZSh0aGlzLml0ZW1zLmdldChpaSkhKX1gO1xuICAgICAgICBjb25zdCBtaXNzaW5nID0gbmV3IFNldChbLi4udGhpcy5zbG90c10ubWFwKHggPT4geFswXSkpO1xuICAgICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgZmluYWwpIG1pc3NpbmcuZGVsZXRlKHNsb3QpO1xuICAgICAgICBjb25zdCBtaXNzaW5nTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgZm9yIChjb25zdCBzbG90IG9mIG1pc3NpbmcpIHtcbiAgICAgICAgICBtaXNzaW5nTWFwLnNldChcbiAgICAgICAgICAgICAgbnMoc2xvdCksXG4gICAgICAgICAgICAgIHRoaXMuZ3JhcGguZ2V0KHNsb3QpIVxuICAgICAgICAgICAgICAgICAgLm1hcChyID0+ICdcXG4gICAgJyArIChCaXRzLmJpdHMocikgYXMgSXRlbUluZGV4W10pLm1hcChuaSlcbiAgICAgICAgICAgICAgICAgIC5qb2luKCcgJiAnKSkuam9pbignJykpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5PVEU6IHBhdGhbaV1bMF0gaXMgc2xvdCBpbmRleGVzLCBub3QgaXRlbXMsIHNvIHRoaXMgZG9lcyBub3Qgd29yay5cbiAgICAgICAgLy8gY29uc3QgaGFzID1cbiAgICAgICAgLy8gICAgIChuZXcgU2V0KHBhdGggPyBwYXRoLm1hcChpID0+IGlbMF0pIDogc2VxKHRoaXMuaXRlbXMubGVuZ3RoKSkpIGFzXG4gICAgICAgIC8vICAgICAgICAgU2V0PEl0ZW1JbmRleD47XG4gICAgICAgIC8vIGNvbnN0IG5vdEhhcyA9XG4gICAgICAgIC8vICAgICBzZXEodGhpcy5pdGVtcy5sZW5ndGgsIGkgPT4gaSBhcyBJdGVtSW5kZXgpLmZpbHRlcihpID0+ICFoYXMuaGFzKGkpKVxuICAgICAgICAvLyAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBhIC0gYikubWFwKG5pKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihgSW5pdGlhbCBmaWxsIG5ldmVyIHJlYWNoZWQgc2xvdHM6XFxuICAke1xuICAgICAgICAgICAgICAgICAgICAgIFsuLi5taXNzaW5nTWFwLmtleXMoKV0uc29ydCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoayA9PiBrICsgbWlzc2luZ01hcC5nZXQoaykhKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgICAgICAgICAgICAgICAgIC8vIH1cXG5VbmF2YWlsYWJsZSBpdGVtczpcXG4gICR7bm90SGFzLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gZmluYWwsIHRoaXMpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXhwYW5kRmlsbChpbmRleEZpbGwsIGZpbGwpO1xuICAgICAgY29uc3Qgb3V0ID0gdGhpcy5maWxsTm9uUHJvZ3Jlc3Npb24oZmlsbCwgZmxhZ3NldCwgcmFuZG9tKTtcbiAgICAgIGlmIChvdXQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICBpZiAocHJvZ3Jlc3MpIHtcbiAgICAgICAgcHJvZ3Jlc3MuYWRkQ29tcGxldGVkKE1hdGguZmxvb3IoKGF0dGVtcHRzIC0gYXR0ZW1wdCkgLyAxMDApKTtcbiAgICAgIH1cbiAgICAgIGlmIChzcG9pbGVyKSB7XG4gICAgICAgIGZvciAoY29uc3QgW3Nsb3QsIGl0ZW1dIG9mIGZpbGwpIHtcbiAgICAgICAgICAvLyBUT0RPIC0gY2xlYW4gdGhpcyB1cC5cbiAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5jaGVja05hbWUoc2xvdCkucmVwbGFjZSgvXlswLTlhLWZdezN9IC8sICcnKTtcbiAgICAgICAgICBzcG9pbGVyLmFkZFNsb3Qoc2xvdCwgbmFtZSwgaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IFt0YXJnZXQsIC4uLmRlcHNdIG9mIHBhdGgpIHtcbiAgICAgICAgICAgIGlmICh0YXJnZXQgPCB0aGlzLmNvbW1vbiB8fCBpbmRleEZpbGwuaGFzKHRhcmdldCBhcyBTbG90SW5kZXgpKSB7XG4gICAgICAgICAgICAgIHNwb2lsZXIuYWRkQ2hlY2soXG4gICAgICAgICAgICAgICAgICB0aGlzLnNsb3RzLmdldCh0YXJnZXQgYXMgU2xvdEluZGV4KSEsXG4gICAgICAgICAgICAgICAgICBkZXBzLm1hcChkID0+IHRoaXMuaXRlbXMuZ2V0KGQgYXMgSXRlbUluZGV4KSEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBmaWxsSW50ZXJuYWwoZmlsbDogTXV0YWJsZUFycmF5QmlNYXA8U2xvdEluZGV4LCBJdGVtSW5kZXg+LFxuICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogSXRlbUluZGV4W10sXG4gICAgICAgICAgICAgICAgICAgICAgIGhhczogQml0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgcmFuZG9tOiBSYW5kb20sXG4gICAgICAgICAgICAgICAgICAgICAgIHdlaWdodHM6IFdlaWdodHMsXG4gICAgICAgICAgICAgICAgICAgICAgIGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgICAgICAgICAgIGJhY2tzdGVwczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZml4ZWQgPSBuZXcgU2V0KGZpbGwua2V5cygpKTtcbiAgICBmb3IgKGxldCBiaXQ6IEl0ZW1JbmRleCB8IHVuZGVmaW5lZCA9IGl0ZW1zLnBvcCgpOyBiaXQgIT0gbnVsbDsgYml0ID0gaXRlbXMucG9wKCkpIHtcbiAgICAgIGlmICghQml0cy5oYXMoaGFzLCBiaXQpKSBjb250aW51ZTsgLy8gaXRlbSBhbHJlYWR5IHBsYWNlZDogc2tpcFxuICAgICAgY29uc3QgaXRlbUluZm8gPSB0aGlzLml0ZW1JbmZvRnJvbUluZGV4KGJpdCk7XG4gICAgICBoYXMgPSBCaXRzLndpdGhvdXQoaGFzLCBiaXQpO1xuICAgICAgLy8gY29uc3QgcmVhY2hhYmxlID1cbiAgICAgIC8vICAgICB0aGlzLmV4cGFuZFJlYWNoYWJsZSh0aGlzLnRyYXZlcnNlKGkgPT4gZmlsbC5nZXQoaSksIGhhcyksXG4gICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3NldCk7XG4gICAgICAvLyBhcnIuc29ydCgoYSwgYikgPT4gYlswXSAtIGFbMF0pO1xuICAgICAgLy8gcmFuZG9tLnNodWZmbGUocmVhY2hhYmxlKTtcbiAgICAgIGNvbnN0IHJlYWNoYWJsZSA9IFsuLi50aGlzLnRyYXZlcnNlKGkgPT4gZmlsbC5nZXQoaSksIGhhcyldLm1hcChpID0+IFt3ZWlnaHRzLnNsb3RzLmdldChpKSB8fCAwLCBpXSBhcyBbbnVtYmVyLCBTbG90SW5kZXhdKTtcblxuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBjb25zdCBjaGVja2VkID0gbmV3IFNldChmaWxsLmtleXMoKSk7XG4gICAgICAvLyBJbmNyZWFzZSB0aGUgdGVtcGVyYXR1cmUgd2l0aCBtb3JlIGJhY2tzdGVwc1xuICAgICAgZm9yIChjb25zdCBzbG90IG9mIHJhbmRvbS5pc2h1ZmZsZU1ldHJvcG9saXMocmVhY2hhYmxlLCAoMCArIGJhY2tzdGVwcykgKiAoYmFja3N0ZXBzICsgMSkpKSB7XG4gICAgICAgIGlmIChjaGVja2VkLmhhcyhzbG90KSkgY29udGludWU7XG4gICAgICAgIGNoZWNrZWQuYWRkKHNsb3QpO1xuICAgICAgICBjb25zdCBzbG90SW5mbyA9IHRoaXMuc2xvdEluZm9Gcm9tSW5kZXgoc2xvdCk7XG4gICAgICAgIGlmICghc2xvdEluZm8gfHxcbiAgICAgICAgICAgIGZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSAmJiAhc2xvdEluZm8udW5pcXVlIHx8XG4gICAgICAgICAgICAhdGhpcy5maXRzKHNsb3RJbmZvLCBpdGVtSW5mbywgZmxhZ3NldCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBmaWxsLnNldChzbG90LCBiaXQpO1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSBjb250aW51ZTtcbiAgICAgIGNoZWNrZWQuY2xlYXIoKTtcbiAgICAgIGlmIChiYWNrc3RlcHMtLSA+IDApIHtcbiAgICAgICAgLy8gdGFrZSBhIGJhY2stc3RlcFxuICAgICAgICBmb3IgKGNvbnN0IHNsb3Qgb2YgcmFuZG9tLmlzaHVmZmxlTWV0cm9wb2xpcyhyZWFjaGFibGUsIDEwMCkpIHtcbiAgICAgICAgICBpZiAoY2hlY2tlZC5oYXMoc2xvdCkgfHwgIWZpbGwuaGFzKHNsb3QpIHx8IGZpeGVkLmhhcyhzbG90KSkgY29udGludWU7XG4gICAgICAgICAgY2hlY2tlZC5hZGQoc2xvdCk7XG4gICAgICAgICAgY29uc3Qgc2xvdEluZm8gPSB0aGlzLnNsb3RJbmZvRnJvbUluZGV4KHNsb3QpO1xuICAgICAgICAgIGlmICghc2xvdEluZm8gfHwgIXRoaXMuZml0cyhzbG90SW5mbywgaXRlbUluZm8sIGZsYWdzZXQpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBwcmV2aW91c0l0ZW0gPSBmaWxsLnJlcGxhY2Uoc2xvdCwgYml0KSA/PyBkaWUoKTtcbiAgICAgICAgICBoYXMgPSBCaXRzLndpdGgoaGFzLCBwcmV2aW91c0l0ZW0pO1xuICAgICAgICAgIGl0ZW1zLnB1c2gocHJldmlvdXNJdGVtKTtcbiAgICAgICAgICByYW5kb20uc2h1ZmZsZShpdGVtcyk7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmb3VuZCkgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBjb25zdCBucyA9IChzaTogU2xvdEluZGV4KSA9PiB0aGlzLmNoZWNrTmFtZSh0aGlzLnNsb3RzLmdldChzaSkhKTtcbiAgICAgIC8vIGNvbnN0IG5pID0gKGlpOiBJdGVtSW5kZXgpID0+IHRoaXMuY2hlY2tOYW1lKHRoaXMuaXRlbXMuZ2V0KGlpKSEpO1xuICAgICAgLy8gY29uc29sZS5sb2coYFBvb2w6XFxuICAke2l0ZW1zLm1hcChuaSkuam9pbignXFxuICAnKX1gKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBGaWxsOlxcbiAgJHtbLi4uZmlsbF0ubWFwKChbcyxpXSkgPT4gYCR7bnMocyl9OiAke25pKGkpfWApLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICAvLyBjb25zb2xlLmVycm9yKGBSRVJPTEw6IENvdWxkIG5vdCBwbGFjZSBpdGVtIGluZGV4ICR7Yml0fTogJHtuaShiaXQpfWApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgaXRlbVBvb2woZXhjbHVkZTogSXRlcmFibGU8SXRlbUluZGV4Piwgd2VpZ2h0czogV2VpZ2h0cyk6IFtudW1iZXIsIEl0ZW1JbmRleF1bXSB7XG4gICAgY29uc3QgZXhjbHVkZVNldCA9IG5ldyBTZXQoZXhjbHVkZSk7XG4gICAgY29uc3QgYXJyOiBbbnVtYmVyLCBJdGVtSW5kZXhdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtpZF0gb2YgdGhpcy5pdGVtSW5mb3MpIHtcbiAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5pdGVtcy5pbmRleChpZCk7XG4gICAgICAvLyBza2lwIG5vbi1wcm9ncmVzc2lvbiBhbmQgYWxyZWFkeS1wbGFjZWQgaXRlbXNcbiAgICAgIGlmIChpbmRleCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIGlmICghdGhpcy5wcm9ncmVzc2lvbi5oYXMoaWQpKSBjb250aW51ZTtcbiAgICAgIGlmIChleGNsdWRlU2V0LmhhcyhpbmRleCkpIGNvbnRpbnVlO1xuICAgICAgYXJyLnB1c2goW3dlaWdodHMuaXRlbXMuZ2V0KGluZGV4KSB8fCAwLCBpbmRleF0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyO1xuICB9XG5cbiAgLy8gVE9ETyAtIGluc3RlYWQgb2YgcGx1bWJpbmcgdGhlIGZsYWdzZXQgdGhyb3VnaCBoZXJlLCBjb25zaWRlclxuICAvLyBidWlsZGluZyBpdCBpbnRvIHRoZSBTbG90SW5mbz8gIE9yIHRoZSBJdGVtSW5mbywgc2luY2UgaXQnc1xuICAvLyBwb3NzaWJsZSBmb3IgYSB1bmlxdWUgc2xvdCB0byBhY2NlcHQgYSBub251bmlxdWUgaXRlbSwgYnV0XG4gIC8vIGEgdW5pcXVlIGl0ZW0gbXVzdCBiZSBpbiBhIHVuaXF1ZSBzbG90Li4uIHNhbWUgZGlmZmVyZW5jZVxuICBwcml2YXRlIGZpdHMoc2xvdDogU2xvdEluZm8sIGl0ZW06IEl0ZW1JbmZvLCBmbGFnc2V0OiBGbGFnU2V0KTogYm9vbGVhbiB7XG4gICAgaWYgKGZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSAmJlxuICAgICAgICBpdGVtLnVuaXF1ZSAmJiAhc2xvdC51bmlxdWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgcHJldmVudExvc3MgPSBpdGVtLnByZXZlbnRMb3NzIHx8IHNsb3QucHJldmVudExvc3M7XG4gICAgaWYgKHNsb3QubG9zc3kgJiYgaXRlbS5sb3NhYmxlICYmIHByZXZlbnRMb3NzKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gVE9ETyAtIGZsYWcgZm9yIFwicHJvdGVjdCBhbGwgbG9zYWJsZSBpdGVtc1wiXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBmaWxsTm9uUHJvZ3Jlc3Npb24oZmlsbDogTXV0YWJsZUFycmF5QmlNYXA8U2xvdElkLCBJdGVtSWQ+LFxuICAgICAgICAgICAgICAgICAgICAgZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgICAgICAgIHJhbmRvbTogUmFuZG9tKTogTWFwPFNsb3RJZCwgSXRlbUlkPnxudWxsIHtcbiAgICAvLyBGaWd1cmUgb3V0IHdoYXQgc3RpbGwgbmVlZHMgdG8gYmUgZmlsbGVkLiAgV2lsbCBiZSBtb3N0bHkgZmlsbGVyXG4gICAgLy8gaXRlbXMuICBJdGVtcyBhcmUgc3BsaXQgaW50byB0aHJlZSBncm91cHM6ICgxKSBmaXJzdCBpdGVtcyBpcyBhbnlcbiAgICAvLyB1bmlxdWVzIHRoYXQgbmVlZCB0byBnbyBpbnRvIHVuaXF1ZSBzbG90cyAoaS5lLiBvbmx5IGlmIGBFdWAgaXNcbiAgICAvLyBzZXQpLCAoMikgZWFybHkgaXRlbXMgaXMgYW55dGhpbmcgdGhhdCBuZWVkcyBzcGVjaWFsIHRyZWF0bWVudCB0b1xuICAgIC8vIHByZXZlbnQgcGxhY2VtZW50IGluIGEgbG9zc3kgc2xvdCwgKDMpIG90aGVyIGl0ZW1zIGlzIGV2ZXJ5dGhpbmcgZWxzZS5cbiAgICBjb25zdCBpdGVtUGFzc2VzOiBJdGVtSWRbXVtdID0gW1tdLCBbXSwgW11dO1xuICAgIC8vIFNsb3RzIGFyZSBicm9rZW4gaW50byB0d28gcGFzc2VzOiAoMSkgcmVzdHJpY3RlZCBhbmQgKDIpIHVucmVzdHJpY3RlZC5cbiAgICBjb25zdCBzbG90UGFzc2VzOiBTbG90SWRbXVtdID0gW1tdLCBbXV07XG5cbiAgICBmb3IgKGNvbnN0IFtpdGVtSWQsIGluZm9dIG9mIHRoaXMuaXRlbUluZm9zKSB7XG4gICAgICBpZiAoZmlsbC5oYXNWYWx1ZShpdGVtSWQpKSBjb250aW51ZTtcbiAgICAgIGxldCBpbmRleCA9IDI7XG4gICAgICBpZiAoaW5mby5sb3NhYmxlICYmIGluZm8ucHJldmVudExvc3MpIGluZGV4ID0gMTtcbiAgICAgIGlmIChmbGFnc2V0LnByZXNlcnZlVW5pcXVlQ2hlY2tzKCkgJiYgaW5mby51bmlxdWUpIGluZGV4ID0gMDtcbiAgICAgIGl0ZW1QYXNzZXNbaW5kZXhdLnB1c2goaXRlbUlkKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbc2xvdElkLCBpbmZvXSBvZiB0aGlzLnNsb3RJbmZvcykge1xuICAgICAgaWYgKGZpbGwuaGFzKHNsb3RJZCkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaW5kZXggPSBpbmZvLmxvc3N5ICYmIGluZm8ucHJldmVudExvc3MgPyAwIDogMTtcbiAgICAgIHNsb3RQYXNzZXNbaW5kZXhdLnB1c2goc2xvdElkKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwYXNzIG9mIFsuLi5pdGVtUGFzc2VzLCAuLi5zbG90UGFzc2VzXSkge1xuICAgICAgcmFuZG9tLnNodWZmbGUocGFzcyk7XG4gICAgfVxuXG4gICAgY29uc3QgbiA9IChzaTogbnVtYmVyKSA9PiB0aGlzLmNoZWNrTmFtZShzaSk7XG4gICAgY29uc3Qgc2MgPSBpdGVycy5jb3VudChpdGVycy5jb25jYXQoLi4uc2xvdFBhc3NlcykpO1xuICAgIGNvbnN0IGljID0gaXRlcnMuY291bnQoaXRlcnMuY29uY2F0KC4uLml0ZW1QYXNzZXMpKTtcbiAgICBpZiAoaWMgPiBzYykge1xuICAgICAgY29uc29sZS5sb2coYFNsb3RzICR7c2N9OlxcbiAgJHtbLi4uaXRlcnMuY29uY2F0KC4uLnNsb3RQYXNzZXMpXS5tYXAobikuam9pbignXFxuICAnKX1gKTtcbiAgICAgIGNvbnNvbGUubG9nKGBJdGVtcyAke2ljfTpcXG4gICR7Wy4uLml0ZXJzLmNvbmNhdCguLi5pdGVtUGFzc2VzKV0ubWFwKG4pLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRvbyBtYW55IGl0ZW1zYCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVycy5jb25jYXQoLi4uaXRlbVBhc3NlcykpIHtcbiAgICAgIC8vIFRyeSB0byBwbGFjZSB0aGUgaXRlbSwgc3RhcnRpbmcgd2l0aCBlYXJsaWVzIGZpcnN0LlxuICAgICAgLy8gTWltaWNzIGNvbWUgYmVmb3JlIGNvbnN1bWFibGVzIGJlY2F1c2UgdGhlcmUncyBmZXdlciBwbGFjZXMgdGhleSBjYW4gZ28uXG4gICAgICAvLyBTaW5jZSBrZXkgc2xvdHMgYXJlIGFsbG93ZWQgdG8gY29udGFpbiBjb25zdW1hYmxlcyAoZXZlbiBpbiBmdWxsIHNodWZmbGUpLFxuICAgICAgLy8gd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhhdCB0aGUgdW5pcXVlcyBnbyBpbnRvIHRob3NlIHNsb3RzIGZpcnN0LlxuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBmb3IgKGNvbnN0IHNsb3RzIG9mIFsuLi5zbG90UGFzc2VzXSkge1xuICAgICAgICBpZiAoZm91bmQpIGJyZWFrO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNsb3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZml0cyh0aGlzLnNsb3RJbmZvcy5nZXQoc2xvdHNbaV0pISxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbUluZm9zLmdldChpdGVtKSEsIGZsYWdzZXQpKSB7XG4gICAgICAgICAgICBmaWxsLnNldChzbG90c1tpXSwgaXRlbSk7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICBzbG90cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGZpbGwgZXh0cmEgaXRlbSAke2l0ZW19LiBTbG90czogJHtlYXJseVNsb3RzfSwgJHtvdGhlclNsb3RzfWApO1xuICAgICAgICBjb25zb2xlLmxvZyhgU2xvdHM6XFxuICAke1suLi5pdGVycy5jb25jYXQoLi4uc2xvdFBhc3NlcyldLm1hcChuKS5qb2luKCdcXG4gICcpfWApO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBGaWxsOlxcbiAgJHtbLi4uZmlsbF0ubWFwKChbcyxpXSkgPT4gYCR7bnMocyl9OiAke25pKGkpfWApLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFJFUk9MTDogQ291bGQgbm90IHBsYWNlIGl0ZW0gJHtuKGl0ZW0pfWApO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBNYXAoZmlsbCk7XG4gIH1cblxuICAvLyBOT1RFOiBmb3IgYW4gSW5kZXhGaWxsLCB0aGlzIGlzIGp1c3QgZ2V0KCksIGJ1dCBmb3JcbiAgLy8gYW4gSWRGaWxsLCB3ZSBuZWVkIHRvIG1hcCBpdCBiYWNrIGFuZCBmb3J0aC4uLlxuICB0cmF2ZXJzZShmaWxsOiAoc2xvdDogU2xvdEluZGV4KSA9PiBJdGVtSW5kZXh8dW5kZWZpbmVkLFxuICAgICAgICAgICBoYXM6IEJpdHMsXG4gICAgICAgICAgIHBhdGg/OiBudW1iZXJbXVtdKTogU2V0PFNsb3RJbmRleD4ge1xuICAgIGhhcyA9IEJpdHMuY2xvbmUoaGFzKTtcbiAgICBjb25zdCByZWFjaGFibGUgPSBuZXcgU2V0PFNsb3RJbmRleD4oKTtcbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBTZXQ8U2xvdEluZGV4PigpO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIFNsb3RJbmRleDsgaSA8IHRoaXMuc2xvdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmdyYXBoLmdldChpKSA9PSBudWxsKSB7XG4gICAgICAgIGNvbnNvbGUuZGlyKHRoaXMpO1xuICAgICAgICBjb25zdCBpZCA9IHRoaXMuc2xvdHMuZ2V0KGkpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVucmVhY2hhYmxlIHNsb3QgJHtpZD8udG9TdHJpbmcoMTYpfWApO1xuICAgICAgfVxuICAgICAgcXVldWUuYWRkKGkgYXMgU2xvdEluZGV4KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBuIG9mIHF1ZXVlKSB7XG4gICAgICBxdWV1ZS5kZWxldGUobik7XG4gICAgICBpZiAocmVhY2hhYmxlLmhhcyhuKSkgY29udGludWU7XG4gICAgICAvLyBjYW4gd2UgcmVhY2ggaXQ/XG4gICAgICBjb25zdCBuZWVkZWQgPSB0aGlzLmdyYXBoLmdldChuKTtcbiAgICAgIGlmIChuZWVkZWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBOb3QgaW4gZ3JhcGg6ICR7bn1gKTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBuZWVkZWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKCFCaXRzLmNvbnRhaW5zQWxsKGhhcywgbmVlZGVkW2ldKSkgY29udGludWU7XG4gICAgICAgIGlmIChwYXRoKSBwYXRoLnB1c2goW24sIC4uLkJpdHMuYml0cyhuZWVkZWRbaV0pXSk7XG4gICAgICAgIHJlYWNoYWJsZS5hZGQobik7XG4gICAgICAgIC8vIFRPRE8gLS0tIG5lZWQgdG8gZmlndXJlIG91dCB3aGF0IHRvIGRvIGhlcmUuXG4gICAgICAgIC8vICAgICAgLS0tIGZpbGwgd291bGQgbGlrZSB0byBiZSB6ZXJvLWJhc2VkIGJ1dCBkb2Vzbid0IG5lZWQgdG8gYmUuXG4gICAgICAgIC8vICAgICAgICAgIGNvdWxkIHVzZSBhIHNpbXBsZSBwYWlyIG9mIE1hcHMsIHBvc3NpYmx5P1xuICAgICAgICAvLyAgICAgICAgICBvciBmcm9udC1sb2FkIHRoZSBpdGVtcz9cbiAgICAgICAgLy8gICBzbG90czogMXh4IG90aGVyc1xuICAgICAgICAvLyAgIGl0ZW1zOiAyeHggb3RoZXJzXG4gICAgICAgIC8vIGJ1dCB3ZSB3YW50IHNhbWUgZmxhZ3MgdG8gaGF2ZSBzYW1lIGluZGV4XG4gICAgICAgIC8vICAgc2xvdHM6IChmaXhlZCkgKHJlcXVpcmVkIHNsb3RzKSAoZXh0cmEgc2xvdHMpXG4gICAgICAgIC8vICAgaXRlbXM6IChmaXhlZCkgKHJlcXVpcmVkIHNsb3RzKSAoaXRlbXMpXG4gICAgICAgIC8vIGlmIG4gaXMgYSBzbG90IHRoZW4gYWRkIHRoZSBpdGVtIHRvIGhhcy5cbiAgICAgICAgY29uc3QgaXRlbXM6IEl0ZW1JbmRleFtdID0gW107XG4gICAgICAgIGlmIChuIDwgdGhpcy5jb21tb24pIGl0ZW1zLnB1c2gobiBhcyBudW1iZXIgYXMgSXRlbUluZGV4KTtcbiAgICAgICAgY29uc3QgZmlsbGVkID0gZmlsbChuKTtcbiAgICAgICAgaWYgKGZpbGxlZCAhPSBudWxsKSBpdGVtcy5wdXNoKGZpbGxlZCk7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgIGhhcyA9IEJpdHMud2l0aChoYXMsIGl0ZW0pO1xuICAgICAgICAgIGZvciAoY29uc3QgaiBvZiB0aGlzLnVubG9ja3MuZ2V0KGl0ZW0pIHx8IFtdKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5ncmFwaC5nZXQoaikgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmRpcih0aGlzKTtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBZGRpbmcgYmFkIG5vZGUgJHtqfSBmcm9tIHVubG9jayAke2l0ZW19YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5hZGQoaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIGdldCBlcnJvcnMgYWJvdXQgaW5pdGlhbCBmaWxsIG5ldmVyIGZpbGxlZCBzbG90cywgc2VlIHdoYXRcbiAgICAvLyBpdGVtcyBhcmUgbWlzc2luZyAobm90ZTogcm9tIGlzIGdsb2JhbClcbi8vICAgICBpZihwYXRoKWNvbnNvbGUubG9nKG5ldyBBcnJheSh0aGlzLml0ZW1zLmxlbmd0aCkuZmlsbCgwKS5tYXAoKF8saSkgPT4gaSlcbi8vICAgICAgICAgLmZpbHRlcihpPT4hQml0cy5oYXMoaGFzLCBpKSkubWFwKGkgPT4gW2ksdGhpcy5pdGVtcy5nZXQoaSldKS5zb3J0KChhLGIpPT5hWzFdLWJbMV0pXG4vLyAgICAgICAgIC5tYXAoKFtqLGldKSA9PiBgJHtTdHJpbmcoaikucGFkU3RhcnQoMyl9ICR7aGV4KGkpLnBhZFN0YXJ0KDMsJzAnKX0gJHtcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tOYW1lKGkpfWApLmpvaW4oJ1xcbicpKTtcbi8vICh3aW5kb3cgYXMgYW55KS5GSU5BTEhBUyA9IGhhcztcblxuICAgIHJldHVybiByZWFjaGFibGU7XG4gIH1cblxuICBleHBhbmRGaWxsKGluZGV4RmlsbDogTXV0YWJsZUFycmF5QmlNYXA8U2xvdEluZGV4LCBJdGVtSW5kZXg+LFxuICAgICAgICAgICAgIGZpbGw6IE11dGFibGVBcnJheUJpTWFwPFNsb3RJZCwgSXRlbUlkPikge1xuICAgIGZvciAoY29uc3QgW3Nsb3RJbmRleCwgaXRlbUluZGV4XSBvZiBpbmRleEZpbGwpIHtcbiAgICAgIGNvbnN0IHNsb3RJZCA9IHRoaXMuc2xvdHMuZ2V0KHNsb3RJbmRleCk7XG4gICAgICBjb25zdCBpdGVtSWQgPSB0aGlzLml0ZW1zLmdldChpdGVtSW5kZXgpO1xuICAgICAgaWYgKHNsb3RJZCA9PSBudWxsIHx8IGl0ZW1JZCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmdgKTtcbiAgICAgIGZpbGwucmVwbGFjZShzbG90SWQsIGl0ZW1JZCk7XG4gICAgfVxuICB9XG5cbiAgY29tcHJlc3NGaWxsKGZpbGw6IE11dGFibGVBcnJheUJpTWFwPFNsb3RJZCwgSXRlbUlkPik6XG4gIE11dGFibGVBcnJheUJpTWFwPFNsb3RJbmRleCwgSXRlbUluZGV4PiB7XG4gICAgY29uc3QgaW5kZXhGaWxsID0gbmV3IE11dGFibGVBcnJheUJpTWFwPFNsb3RJbmRleCwgSXRlbUluZGV4PigpO1xuICAgIGZvciAoY29uc3QgW3Nsb3RJZCwgaXRlbUlkXSBvZiBmaWxsKSB7XG4gICAgICBjb25zdCBzbG90SW5kZXggPSB0aGlzLnNsb3RzLmluZGV4KHNsb3RJZCk7XG4gICAgICBjb25zdCBpdGVtSW5kZXggPSB0aGlzLml0ZW1zLmluZGV4KGl0ZW1JZCk7XG4gICAgICBpZiAoc2xvdEluZGV4ID09IG51bGwgfHwgaXRlbUluZGV4ID09IG51bGwpIHtcbiAgICAgICAgLy8gVE9ETyAtIHRoaXMgaXMgbm90IHVucmVhc29uYWJsZSAtIHdlIGNhbiBwcmUtZmlsbCBhIHNsb3QgKGFsd2F5c1xuICAgICAgICAvLyB0cmFja2VkKSB3aXRoIGEgbm9uLXByb2dyZXNzaW9uIGl0ZW0uLi4gaG93IHRvIGhhbmRsZT8gd2hhdCB0byBtYXBcbiAgICAgICAgLy8gdG8/ICBDYW4gd2UgbWFrZSB1cCBhIGR1bW15IGluZGV4IG9yIHNvbWV0aGluZz9cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEJhZCBzbG90L2l0ZW06ICR7c2xvdElkfSAke3Nsb3RJbmRleH0gJHtpdGVtSWR9ICR7aXRlbUluZGV4fWApO1xuICAgICAgfVxuICAgICAgaW5kZXhGaWxsLnNldChzbG90SW5kZXgsIGl0ZW1JbmRleCk7XG4gICAgfVxuICAgIHJldHVybiBpbmRleEZpbGw7XG4gIH1cblxuICBjaGVja05hbWUoaWQ6IG51bWJlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMud29ybGRzW2lkID4+PiAyNF0uY2hlY2tOYW1lKGlkICYgMHhmZmZmZmYpO1xuICB9XG5cbiAgaXRlbU5hbWVGcm9tSW5kZXgoaW5kZXg6IG51bWJlcik6IHN0cmluZyB7XG4gICAgaWYgKGluZGV4IDwgdGhpcy5jb21tb24pIHJldHVybiB0aGlzLmNoZWNrTmFtZSh0aGlzLnNsb3RzLmdldChpbmRleCBhcyBhbnkpIGFzIGFueSk7XG4gICAgY29uc3QgaWQgPSB0aGlzLml0ZW1zLmdldChpbmRleCBhcyBhbnkpO1xuICAgIGlmICghaWQgfHwgKGlkICYgfjB4ZmYpICE9PSAweDIwMCkgcmV0dXJuICckJyArIGhleChpZCBhcyBhbnkpO1xuICAgIHJldHVybiAod2luZG93IGFzIGFueSkucm9tLml0ZW1zW2lkICYgMHhmZl0/Lm1lc3NhZ2VOYW1lIHx8ICckJyArIGhleChpZCBhcyBhbnkpO1xuICB9XG5cbiAgcHJlZmlsbChmaWxsOiBNdXRhYmxlQXJyYXlCaU1hcDxTbG90SWQsIEl0ZW1JZD4sIHJhbmRvbTogUmFuZG9tKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLndvcmxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgd29ybGRJZCA9IGkgPDwgMjQ7XG4gICAgICBjb25zdCB3b3JsZEZpbGwgPSB0aGlzLndvcmxkc1tpXS5wcmVmaWxsKHJhbmRvbSk7XG4gICAgICBmb3IgKGNvbnN0IFtzbG90LCBpdGVtXSBvZiB3b3JsZEZpbGwpIHtcbiAgICAgICAgZmlsbC5zZXQoKHdvcmxkSWQgfCBzbG90KSBhcyBTbG90SWQsICh3b3JsZElkIHwgaXRlbSkgYXMgSXRlbUlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpdGVtSW5mb0Zyb21JbmRleChpdGVtOiBJdGVtSW5kZXgpOiBJdGVtSW5mbyB7XG4gICAgY29uc3QgaWQgPSB0aGlzLml0ZW1zLmdldChpdGVtKTtcbiAgICBpZiAoaWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgaXRlbTogJHtpdGVtfWApO1xuICAgIHJldHVybiB0aGlzLml0ZW1JbmZvRnJvbUlkKGlkKTtcbiAgfVxuXG4gIGl0ZW1JbmZvRnJvbUlkKGlkOiBJdGVtSWQpOiBJdGVtSW5mbyB7XG4gICAgY29uc3QgaW5mbyA9IHRoaXMuaXRlbUluZm9zLmdldChpZCk7XG4gICAgaWYgKGluZm8gPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGluZm86ICR7aGV4KGlkKX1gKTtcbiAgICByZXR1cm4gaW5mbztcbiAgfVxuXG4gIHNsb3RJbmZvRnJvbUluZGV4KHNsb3Q6IFNsb3RJbmRleCk6IFNsb3RJbmZvfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaWQgPSB0aGlzLnNsb3RzLmdldChzbG90KTtcbiAgICBpZiAoaWQgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgc2xvdDogJHtzbG90fWApO1xuICAgIHJldHVybiB0aGlzLnNsb3RJbmZvRnJvbUlkKGlkKTtcbiAgfVxuXG4gIHNsb3RJbmZvRnJvbUlkKGlkOiBTbG90SWQpOiBTbG90SW5mb3x1bmRlZmluZWQge1xuICAgIGNvbnN0IGluZm8gPSB0aGlzLnNsb3RJbmZvcy5nZXQoaWQpO1xuICAgIGlmIChpbmZvICE9IG51bGwpIHJldHVybiBpbmZvO1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpbmZvOiAke2hleChpZCl9YCk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5pbnRlcmZhY2UgV2VpZ2h0cyB7XG4gIC8qKiBXZWlnaHQgKHBvd2VyKSBvZiBlYWNoIGl0ZW0uICovXG4gIGl0ZW1zOiBLZXllZDxJdGVtSW5kZXgsIG51bWJlcj47XG4gIC8qKiBXZWlnaHQgKGRlcHRoKSBvZiBlYWNoIHNsb3QuICovXG4gIHNsb3RzOiBLZXllZDxTbG90SW5kZXgsIG51bWJlcj47XG59XG5cblxuLy8gVE9ETyAtIGNsZWFuIHRoaXMgdXBcbmludGVyZmFjZSBQcm9ncmVzc1RyYWNrZXIge1xuICBhZGRUYXNrcyh0YXNrczogbnVtYmVyKTogdm9pZDtcbiAgYWRkQ29tcGxldGVkKHRhc2tzOiBudW1iZXIpOiB2b2lkO1xufVxuIl19