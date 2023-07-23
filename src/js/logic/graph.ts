import {Bits} from '../bits';
import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Spoiler} from '../rom/spoiler';
import {hex} from '../rom/util';
import {Keyed, ArrayMap, MutableArrayBiMap, iters, spread} from '../util';
import {die} from '../assert';

const SLOT_TEMPERATURE = 2;
const ITEM_TEMPERATURE = 2;

/** Input for the graph. */
export interface LocationList {
  worldName: string;
  items: ReadonlyMap<number, ItemInfo>;
  slots: ReadonlyMap<number, SlotInfo>;
  requirements: ReadonlyMap<number, Iterable<Iterable<number>>>;
  checkName: (node: number) => string;
  prefill: (random: Random) => Map<number, number>;
}

export interface ItemInfo {
  /** Unique items can optionally be shuffled separately. */
  unique?: boolean;
  /**
   * Losable items are at risk of being lost if they are placed in a lossy slot
   * (i.e. if the inventory is full).
   */
  losable?: boolean;
  /**
   * Losable items may be protected, meaning that they will not be placed in a
   * lossy slot.
   */
  preventLoss?: boolean;
  /**
   * Weight for placement.  Higher numbers are more likely to be placed earlier.
   * Default is 1.  Powerful and important items should be given larger weights
   * to make it less likely that they always end up in early spheres.
   */
  weight?: number;
}

export interface SlotInfo {
  /** Whether the slot can hold a unique item. */
  unique?: boolean;
  /** Whether losable items in this slot are at risk of being lost. */
  lossy: boolean;
  /** Whether the slot is disallowed from losing items (e.g. triggers). */
  preventLoss?: boolean;
  /**
   * Weight for placing progression items.  Default is 1.  Useful for making
   * distant and out-of-the way checks more worthwhile.  Alternatively, we
   * could just avoid ever placing mimics in these areas?
   */
  weight?: number;
  /** Whether slot is currently broken */
  broken?: boolean;
}

export type SlotIndex = number & {__slotIndex__: never};
export type ItemIndex = number & {__itemIndex__: never};
export type SlotId = number & {__slotId__: never};
export type ItemId = number & {__itemId__: never};

/**
 * A graph data structure.  Initialized with one or more location lists
 * (a set of DNF expressions providing a bunch of numeric flags).
 */
export class Graph {

  //private readonly reverseWorlds: ReadonlyMap<LocationList, number>;
  private readonly common: number;
  private readonly slots: ArrayMap<SlotIndex, SlotId>;
  private readonly items: ArrayMap<ItemIndex, ItemId>;
  // Note that not every item gets an index - only those in the graph.
  private readonly slotInfos: ReadonlyMap<SlotId, SlotInfo>;
  private readonly itemInfos: ReadonlyMap<ItemId, ItemInfo>;

  // Items that provide progression.
  private readonly progression: Set<ItemId>;

  // /** Mapping of provides to the same requires. */
  // private readonly commonFill: ArrayMap<SlotIndex, ItemIndex>;

  /** Bitsets keyed by ItemIndex, represent a DNF condition. */
  readonly graph: Keyed<SlotIndex, readonly Bits[]>;
  readonly unlocks: Keyed<ItemIndex, readonly SlotIndex[]>;
  private lastFailure = '';

  constructor(private readonly worlds: readonly LocationList[]) {
    //const reverseWorlds = new Map<LocationList, number>();
    //for (let i = 0; i < worlds.length; i++) {
    //  reverseWorlds.set(worlds[i], i);
    //}
    //this.reverseWorlds = reverseWorlds;

    // Build up a list of all known provides/requires.
    const provided = new Set<number>();
    const required = new Set<number>();
    const slots = new Map<SlotId, SlotInfo>();
    const items = new Map<ItemId, ItemInfo>();
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

      // Probably just make a common index fill and do a full indirection?
      //  - if it's in the common fill, use it, otherwise fall back on the
      //    item fill?

      for (const [itemId, info] of world.items) {
        items.set((worldId | itemId) as ItemId, info);
      }
      for (const [slotId, info] of world.slots) {
        slots.set((worldId | slotId) as SlotId, info);
      }
    }

    // Copy the maps and save them before we start deleting elements.
    this.itemInfos = new Map(items);
    this.slotInfos = new Map(slots);

    this.progression = new Set(required as Set<ItemId>);
    for (const item of items.keys()) required.add(item); // non-progression last

    const common = new Set<number>();
    const extraProvides = new Set<number>();
    const extraRequires = new Set<number>();
    for (const check of required) {
      (provided.has(check) ? common : extraRequires).add(check);
    }
    for (const check of provided) {
      if (!required.has(check)) extraProvides.add(check);
    }

    this.common = common.size;
    this.slots = new ArrayMap([...common, ...extraProvides] as SlotId[]);
    this.items = new ArrayMap([...common, ...extraRequires] as ItemId[]);

    // Build up the graph now that we have the array maps.
    const graph: Bits[][] = [];
    const unlocks: Array<Set<SlotIndex>> = [];
    for (let i = 0; i < worlds.length; i++) {
      const worldId = i << 24;
      for (const [slot, req] of worlds[i].requirements) {
        const slotIndex = this.slots.index((worldId | slot) as SlotId);
        if (slotIndex == null) {
          throw new Error(`Provided a non-slot? ${hex(slot)}`);
        }
        for (const cs of req) {
          const is =
              [...cs].map(c =>
                          this.items.index((worldId | c) as ItemId) ?? die());
          (graph[slotIndex] || (graph[slotIndex] = [])).push(Bits.from(is));
          for (const i of is) {
            (unlocks[i] || (unlocks[i] = new Set())).add(slotIndex);
          }
        }
      }
    }

    // Sanity check to make sure all slots are provided.
    for (let i = 0 as SlotIndex; i < this.slots.length; i++) {
      if (!graph[i] || !graph[i].length) {
        const id = this.slots.get(i) ?? NaN as SlotId;
        const name = this.checkName(id);
        console.error(`Nothing provided $${hex(id)}: ${name} (index ${i})`);
      }
    }
    this.graph = new Keyed(graph);
    this.unlocks = new Keyed(unlocks.map(spread));
  }

  /**
   * Do one or more samples of an arbitrary-ordered item pickup to
   * measure roughly the weight of each item and slot.
   */
  computeWeights(random = new Random(), traverses = 1): Weights {
    const itemWeights = Array.from({length: this.items.length}, () => 0);
    const slotWeights = Array.from({length: this.slots.length}, () => 0);
    const progressionItems = [];
    for (const [index, id] of this.items) {
      if (id >= 0x200 && id < 0x280 && this.progression.has(id)) progressionItems.push(index);
    }
    for (let i = 0; i < traverses; i++) {
      const items = random.shuffle([...progressionItems]);
      let has = Bits.of();
      let reachable = this.traverse(() => undefined, has); //(c) => c <= this.common ? c as any : undefined, has);
      let step = 0;
      for (const item of items) {
        step++;
        has = Bits.with(has, item);
        const newReachable = this.traverse(() => undefined, has); //(c) => c <= this.common ? c as any : undefined, has);
        let newCount = 0;
        for (const slot of newReachable) {
          if (reachable.has(slot)) continue;
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
    const itemWeights = weights.items.map((w, i) => [i, w] as [ItemIndex, number]);
    const slotWeights = weights.slots.map((w, i) => [i, w] as [SlotIndex, number]);
    function itemName(id: number) {
      const rom = (globalThis as any).rom;
      if ((id & ~0xff) === 0x200 && rom && rom.items[id & 0xff]) {
        return rom.items[id & 0xff].messageName;
      }
      return `$${id.toString(16).padStart(2, '0')}`;
    }
    itemWeights.sort((a, b) => b[1] - a[1]);
    slotWeights.sort((a, b) => b[1] - a[1]);
    for (const [index, weight] of itemWeights) {
      //if (index < this.common) continue;
      const id = this.items.get(index as ItemIndex)!;
      if (!this.itemInfos.has(id)) continue;
      if (!this.progression.has(id)) continue;
      console.log(`Item ${itemName(id)}: ${weight}`);
    }
    for (const [index, weight] of slotWeights) {
      //if (index < this.common) continue;
      const id = this.slots.get(index as SlotIndex)!;
      if (!this.slotInfos.has(id)) continue;
      console.log(`Slot ${this.checkName(id)}: ${weight}`);
    }
  }

  async shuffle(flagset: FlagSet,
                random: Random,
                attempts = 200, // 0
                progress?: ProgressTracker,
                spoiler?: Spoiler): Promise<Map<SlotId, ItemId>|null> {
    (globalThis as any).graph = this;
    if (progress) progress.addTasks(Math.floor(attempts / 10));
    const weights = this.computeWeights(random, 1); // 1000);
    // const itemWeights = new Map(weights.items.map((w, i) => [i, w] as [ItemIndex, number]));
    // const slotWeights = new Map(weights.slots.map((w, i) => [i, w] as [SlotIndex, number]));
ATTEMPT:
    for (let attempt = 0; attempt < attempts; attempt++) {
      this.lastFailure = '';
      if (progress && (attempt % 10 === 9)) {
        progress.addCompleted(1); 
        await new Promise(requestAnimationFrame); // this probably shouldn't be rAF
      }
      const fill = new MutableArrayBiMap<SlotId, ItemId>();
      this.prefill(fill, random);
      const indexFill = this.compressFill(fill);
      const items = [...random.ishuffleMetropolis(this.itemPool(indexFill.values(), weights), ITEM_TEMPERATURE)].reverse();
      let has = Bits.from(new Set(items));
      const backtracks = Math.floor(attempt / 5);
      if (!this.fillInternal(indexFill, items, has, random, weights, flagset, backtracks)) {
        continue;
      }
      const path: number[][]|undefined = spoiler ? [] : undefined;
      const final = this.traverse(i => indexFill.get(i), Bits.of(), path);
      // Make an effort to bury flight.
      const sphereAnalysis = this.analyzeSpheres(i => indexFill.get(i));
      const targetFlightSphere = flagset.buryFlightStartSphere() - attempt / 4
      for (const [id,, sphere] of sphereAnalysis) {
        if (id === 0x248 && sphere < targetFlightSphere) continue ATTEMPT;
      }
      // for (const [, item, sphere, check] of sphereAnalysis) {
      //   if ('document' in globalThis) {
      //     console.log(`${item}: ${sphere} (${check})`);
      //   }
      // }
      // if ('sphereAnalysis' in globalThis) {
      //   for (const [, item, sphere] of sphereAnalysis) {
      //     const stats = (globalThis as any).sphereAnalysis.get(item) || [];
      //     (globalThis as any).sphereAnalysis.set(item, stats);
      //     stats[sphere] = (stats[sphere] || 0) + 1;
      //   }
      // }
      // TODO - flags to loosen this requirement (before logging)???
      //      - but it's also a useful diagnostic.
      if (final.size !== this.slots.length) {
        const ns = (si: SlotIndex) => `${String(si).padStart(3)} ${
            this.slots.get(si)!.toString(16).padStart(3, '0')} ${
            this.checkName(this.slots.get(si)!)}`;
        const ni = (ii: ItemIndex) => `${String(ii).padStart(3)} ${
            this.items.get(ii)!.toString(16).padStart(3, '0')} ${
            this.checkName(this.items.get(ii)!)}`;
        const missing = new Set([...this.slots].map(x => x[0]));
        for (const slot of final) missing.delete(slot);
        const missingMap = new Map<string, string>();
        for (const slot of missing) {
          missingMap.set(
              ns(slot),
              this.graph.get(slot)!
                  .map(r => '\n    ' + (Bits.bits(r) as ItemIndex[]).map(ni)
                  .join(' & ')).join(''));
        }
        // NOTE: path[i][0] is slot indexes, not items, so this does not work.
        // const has =
        //     (new Set(path ? path.map(i => i[0]) : seq(this.items.length))) as
        //         Set<ItemIndex>;
        // const notHas =
        //     seq(this.items.length, i => i as ItemIndex).filter(i => !has.has(i))
        //         .sort((a, b) => a - b).map(ni);
        console.error(`Initial fill never reached slots:\n  ${
                      [...missingMap.keys()].sort()
                          .map(k => k + missingMap.get(k)!).join('\n  ')}`);
                      // }\nUnavailable items:\n  ${notHas.join('\n  ')}`);
                      // final, this);
        this.lastFailure = `unreachable slots?`;
        continue;
      }
      this.expandFill(indexFill, fill);
      const out = this.fillNonProgression(fill, flagset, random);
      if (out == null) continue;
      if (progress) {
        progress.addCompleted(Math.floor((attempts - attempt) / 100));
      }
      if (spoiler) {
        for (const [slot, item] of fill) {
          // TODO - clean this up.
          const name = this.checkName(slot).replace(/^[0-9a-f]{3} /, '');
          spoiler.addSlot(slot, name, item);
        }
        if (path) {
          for (const [target, ...deps] of path) {
            if (target < this.common || indexFill.has(target as SlotIndex)) {
              spoiler.addCheck(
                  this.slots.get(target as SlotIndex)!,
                  deps.map(d => this.items.get(d as ItemIndex)!));
            }
          }
        }
      }
      return out;
    }
    throw new Error(`Shuffle failed: ${this.lastFailure || 'unknown error'}`);
    //return null;
  }

  private fillInternal(fill: MutableArrayBiMap<SlotIndex, ItemIndex>,
                       items: ItemIndex[],
                       has: Bits,
                       random: Random,
                       weights: Weights,
                       flagset: FlagSet,
                       backsteps: number): boolean {
    const fixed = new Set(fill.keys());
    for (let bit: ItemIndex | undefined = items.pop(); bit != null; bit = items.pop()) {
      if (!Bits.has(has, bit)) continue; // item already placed: skip
      const itemInfo = this.itemInfoFromIndex(bit);
      has = Bits.without(has, bit);
      // const reachable =
      //     this.expandReachable(this.traverse(i => fill.get(i), has),
      //                          flagset);
      // arr.sort((a, b) => b[0] - a[0]);
      // random.shuffle(reachable);
      const reachable = [...this.traverse(i => fill.get(i), has)].map(i => [weights.slots.get(i) || 0, i] as [number, SlotIndex]);

      let found = false;
      const checked = new Set(fill.keys());
      // Increase the temperature with more backsteps
      for (const slot of random.ishuffleMetropolis(reachable, (SLOT_TEMPERATURE + backsteps) * (backsteps + 1))) {
        if (checked.has(slot)) continue;
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
      if (found) continue;
      checked.clear();
      if (backsteps-- > 0) {
        // take a back-step
        for (const slot of random.ishuffleMetropolis(reachable, 100)) {
          if (checked.has(slot) || !fill.has(slot) || fixed.has(slot)) continue;
          checked.add(slot);
          const slotInfo = this.slotInfoFromIndex(slot);
          if (!slotInfo || !this.fits(slotInfo, itemInfo, flagset)) continue;
          const previousItem = fill.replace(slot, bit) ?? die();
          has = Bits.with(has, previousItem);
          items.push(previousItem);
          random.shuffle(items);
          found = true;
          break;
        }
        if (found) continue;
      }
      // const ns = (si: SlotIndex) => this.checkName(this.slots.get(si)!);
      // const ni = (ii: ItemIndex) => this.checkName(this.items.get(ii)!);
      // console.log(`Pool:\n  ${items.map(ni).join('\n  ')}`);
      // console.log(`Fill:\n  ${[...fill].map(([s,i]) => `${ns(s)}: ${ni(i)}`).join('\n  ')}`);
      // console.error(`REROLL: Could not place item index ${bit}: ${ni(bit)}`);
      this.lastFailure = `could not place ${this.checkName(this.items.get(bit)!)
          }, ${items.filter(i => Bits.has(has, i)).length} remaining`;
      return false;
    }
    return true;
  }

  private itemPool(exclude: Iterable<ItemIndex>, weights: Weights): [number, ItemIndex][] {
    const excludeSet = new Set(exclude);
    const arr: [number, ItemIndex][] = [];
    for (const [id] of this.itemInfos) {
      const index = this.items.index(id);
      // skip non-progression and already-placed items
      if (index == null) continue;
      if (!this.progression.has(id)) continue;
      if (excludeSet.has(index)) continue;
      arr.push([weights.items.get(index) || 0, index]);
    }
    return arr;
  }

  // TODO - instead of plumbing the flagset through here, consider
  // building it into the SlotInfo?  Or the ItemInfo, since it's
  // possible for a unique slot to accept a nonunique item, but
  // a unique item must be in a unique slot... same difference
  private fits(slot: SlotInfo, item: ItemInfo, flagset: FlagSet): boolean {
    if (flagset.preserveUniqueChecks() &&
        item.unique && !slot.unique) {
      return false;
    }
    if ((item.unique || item.preventLoss) && slot.broken) return false;
    const preventLoss = item.preventLoss || slot.preventLoss;
    if (slot.lossy && item.losable && preventLoss) return false;
    // TODO - flag for "protect all losable items"
    return true;
  }

  fillNonProgression(fill: MutableArrayBiMap<SlotId, ItemId>,
                     flagset: FlagSet,
                     random: Random): Map<SlotId, ItemId>|null {
    // Figure out what still needs to be filled.  Will be mostly filler
    // items.  Items are split into three groups: (1) first items is any
    // uniques that need to go into unique slots (i.e. only if `Eu` is
    // set), (2) early items is anything that needs special treatment to
    // prevent placement in a lossy slot, (3) other items is everything else.
    const itemPasses: ItemId[][] = [[], [], []];
    // Slots are broken into two passes: (1) restricted and (2) unrestricted.
    const slotPasses: SlotId[][] = [[], []];

    for (const [itemId, info] of this.itemInfos) {
      if (fill.hasValue(itemId)) continue;
      let index = 2;
      if (info.losable && info.preventLoss) index = 1;
      if (flagset.preserveUniqueChecks() && info.unique) index = 0;
      itemPasses[index].push(itemId);
    }
    for (const [slotId, info] of this.slotInfos) {
      if (fill.has(slotId)) continue;
      const index = info.lossy && info.preventLoss ? 0 : 1;
      slotPasses[index].push(slotId);
    }
    for (const pass of [...itemPasses, ...slotPasses]) {
      random.shuffle(pass);
    }

    const n = (si: number) => this.checkName(si);
    const sc = iters.count(iters.concat(...slotPasses));
    const ic = iters.count(iters.concat(...itemPasses));
    if (ic > sc) {
      console.log(`Slots ${sc}:\n  ${[...iters.concat(...slotPasses)].map(n).join('\n  ')}`);
      console.log(`Items ${ic}:\n  ${[...iters.concat(...itemPasses)].map(n).join('\n  ')}`);
      throw new Error(`Too many items`);
    }
    for (const item of iters.concat(...itemPasses)) {
      // Try to place the item, starting with earlies first.
      // Mimics come before consumables because there's fewer places they can go.
      // Since key slots are allowed to contain consumables (even in full shuffle),
      // we need to make sure that the uniques go into those slots first.
      let found = false;
      for (const slots of [...slotPasses]) {
        if (found) break;
        for (let i = 0; i < slots.length; i++) {
          if (this.fits(this.slotInfos.get(slots[i])!,
                        this.itemInfos.get(item)!, flagset)) {
            fill.set(slots[i], item);
            found = true;
            slots.splice(i, 1);
            break;
          }
        }
      }
      if (!found) {
        // console.error(`Failed to fill extra item ${item}. Slots: ${earlySlots}, ${otherSlots}`);
        console.log(`Slots:\n  ${[...iters.concat(...slotPasses)].map(n).join('\n  ')}`);
        //console.log(`Fill:\n  ${[...fill].map(([s,i]) => `${ns(s)}: ${ni(i)}`).join('\n  ')}`);
        console.error(`REROLL: Could not place item ${n(item)}`);
        this.lastFailure = `could not place non-progression ${n(item)}`;
        return null;
      }
    }
    return new Map(fill);
  }

  // NOTE: for an IndexFill, this is just get(), but for
  // an IdFill, we need to map it back and forth...
  traverse(fill: (slot: SlotIndex) => ItemIndex|undefined,
           has: Bits,
           path?: number[][]): Set<SlotIndex> {
    has = Bits.clone(has);
    const reachable = new Set<SlotIndex>();
    const queue = new Set<SlotIndex>();
    for (let i = 0 as SlotIndex; i < this.slots.length; i++) {
      if (this.graph.get(i) == null) {
        console.dir(this);
        const id = this.slots.get(i);
        throw new Error(`Unreachable slot ${id?.toString(16)}`);
      }
      queue.add(i as SlotIndex);
    }
    for (const n of queue) {
      queue.delete(n);
      if (reachable.has(n)) continue;
      // can we reach it?
      const needed = this.graph.get(n);
      if (needed == null) throw new Error(`Not in graph: ${n}`);
      for (let i = 0, len = needed.length; i < len; i++) {
        if (!Bits.containsAll(has, needed[i])) continue;
        if (path) path.push([n, ...Bits.bits(needed[i])]);
        reachable.add(n);
        // TODO --- need to figure out what to do here.
        //      --- fill would like to be zero-based but doesn't need to be.
        //          could use a simple pair of Maps, possibly?
        //          or front-load the items?
        //   slots: 1xx others
        //   items: 2xx others
        // but we want same flags to have same index
        //   slots: (fixed) (required slots) (extra slots)
        //   items: (fixed) (required slots) (items)
        // if n is a slot then add the item to has.
        const items: ItemIndex[] = [];
        if (n < this.common) items.push(n as number as ItemIndex);
        const filled = fill(n);
        if (filled != null) items.push(filled);
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

    // If we get errors about initial fill never filled slots, see what
    // items are missing (note: rom is global)
//     if(path)console.log(new Array(this.items.length).fill(0).map((_,i) => i)
//         .filter(i=>!Bits.has(has, i)).map(i => [i,this.items.get(i)]).sort((a,b)=>a[1]-b[1])
//         .map(([j,i]) => `${String(j).padStart(3)} ${hex(i).padStart(3,'0')} ${
//                            this.checkName(i)}`).join('\n'));
// (globalThis as any).FINALHAS = has;

    return reachable;
  }

  analyzeSpheres2(fill: (slot: SlotIndex) => ItemIndex|undefined): Array<[string, number, string]> {
    let has = Bits.of();
    let sphere = 0;
    let next = Bits.of();
    const result: Array<[string, number, string]> = [];
    const unseen = new Set<SlotIndex>(
        Array.from({length: this.slots.length}, (_, i) => i as SlotIndex));
    do {
      const queue = new Set<SlotIndex>(unseen);
      next = Bits.of();
      for (const n of queue) {
        const needed = this.graph.get(n)!;
        for (let i = 0, len = needed.length; i < len; i++) {
          if (!Bits.containsAll(has, needed[i])) continue;
          unseen.delete(n);
          const items: ItemIndex[] = [];
          if (n < this.common) items.push(n as number as ItemIndex);
          const filled = fill(n);
          if (filled != null) items.push(filled);
          for (const item of items) {
            const id = this.items.get(item);
            if (id != null && id >= 0x200 && id < 0x280) {
              // If it's an item, then save it for later.
              result.push([this.itemNameFromIndex(item), sphere, this.checkName(this.slots.get(n)!)]);
              next = Bits.with(next, item);
            } else {
              // If it's pseudo, then add it immediately.
              has = Bits.with(has, item);
              for (const j of this.unlocks.get(item) || []) {
                if (unseen.has(j)) queue.add(j);
              }
            }
          }
          break;
        }
      }
      has = Bits.union(has, next);
      if (!Bits.empty(next)) sphere++;
    } while (unseen.size); // !Bits.empty(next));
    return result;
  }

  analyzeSpheres(fill: (slot: SlotIndex) => ItemIndex|undefined): Array<[ItemId, string, number, string]> {
    let has = Bits.of();
    let sphere = 0;
    const result: Array<[ItemId, string, number, string]> = [];
    while (true) {
      const reachable = this.traverse(() => undefined, has);
      let progress = false;
      for (const slot of reachable) {
        const item = fill(slot);
        if (item == null || Bits.has(has, item)) continue;
        has = Bits.with(has, item);
        progress = true;
        const id = this.items.get(item);
        if (id != null && id >= 0x200 && id < 0x280) {
          result.push([id, this.itemNameFromIndex(item), sphere, this.checkName(this.slots.get(slot)!)]);
        }
      }
      if (!progress) break;
      sphere++;
    }
    return result;
  }

  expandFill(indexFill: MutableArrayBiMap<SlotIndex, ItemIndex>,
             fill: MutableArrayBiMap<SlotId, ItemId>) {
    for (const [slotIndex, itemIndex] of indexFill) {
      const slotId = this.slots.get(slotIndex);
      const itemId = this.items.get(itemIndex);
      if (slotId == null || itemId == null) throw new Error(`missing`);
      fill.replace(slotId, itemId);
    }
  }

  compressFill(fill: MutableArrayBiMap<SlotId, ItemId>):
  MutableArrayBiMap<SlotIndex, ItemIndex> {
    const indexFill = new MutableArrayBiMap<SlotIndex, ItemIndex>();
    for (const [slotId, itemId] of fill) {
      const slotIndex = this.slots.index(slotId);
      const itemIndex = this.items.index(itemId);
      if (slotIndex == null || itemIndex == null) {
        // TODO - this is not unreasonable - we can pre-fill a slot (always
        // tracked) with a non-progression item... how to handle? what to map
        // to?  Can we make up a dummy index or something?
        throw new Error(
            `Bad slot/item: ${slotId} ${slotIndex} ${itemId} ${itemIndex}`);
      }
      indexFill.set(slotIndex, itemIndex);
    }
    return indexFill;
  }

  checkName(id: number): string {
    return this.worlds[id >>> 24].checkName(id & 0xffffff);
  }

  itemNameFromIndex(index: number): string {
    if (index < this.common) return this.checkName(this.slots.get(index as any) as any);
    const id = this.items.get(index as any);
    if (!id || (id & ~0xff) !== 0x200) return '$' + hex(id as any);
    return (globalThis as any).rom.items[id & 0xff]?.messageName || '$' + hex(id as any);
  }

  prefill(fill: MutableArrayBiMap<SlotId, ItemId>, random: Random) {
    for (let i = 0; i < this.worlds.length; i++) {
      const worldId = i << 24;
      const worldFill = this.worlds[i].prefill(random);
      for (const [slot, item] of worldFill) {
        fill.set((worldId | slot) as SlotId, (worldId | item) as ItemId);
      }
    }
  }

  itemInfoFromIndex(item: ItemIndex): ItemInfo {
    const id = this.items.get(item);
    if (id == null) throw new Error(`Bad item: ${item}`);
    return this.itemInfoFromId(id);
  }

  itemInfoFromId(id: ItemId): ItemInfo {
    const info = this.itemInfos.get(id);
    if (info == null) throw new Error(`Missing info: ${hex(id)}`);
    return info;
  }

  slotInfoFromIndex(slot: SlotIndex): SlotInfo|undefined {
    const id = this.slots.get(slot);
    if (id == null) throw new Error(`Bad slot: ${slot}`);
    return this.slotInfoFromId(id);
  }

  slotInfoFromId(id: SlotId): SlotInfo|undefined {
    const info = this.slotInfos.get(id);
    if (info != null) return info;
    // throw new Error(`Missing info: ${hex(id)}`);
    return undefined;
  }
}

interface Weights {
  /** Weight (power) of each item. */
  items: Keyed<ItemIndex, number>;
  /** Weight (depth) of each slot. */
  slots: Keyed<SlotIndex, number>;
}


// TODO - clean this up
interface ProgressTracker {
  addTasks(tasks: number): void;
  addCompleted(tasks: number): void;
}
