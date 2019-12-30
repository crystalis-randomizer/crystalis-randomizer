import {Bits} from '../bits.js';
import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {hex} from '../rom/util.js';
import {Keyed, ArrayMap, MutableArrayBiMap} from '../util.js';

/** Input for the graph. */
export interface LocationList {
  items: ReadonlyMap<number, ItemInfo>;
  slots: ReadonlyMap<number, SlotInfo>;
  requirements: ReadonlyMap<number, Iterable<Iterable<number>>>;
  name: (node: number) => string;
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

  private readonly reverseWorlds: ReadonlyMap<LocationList, number>;
  private readonly fixed: number;
  private readonly slots: ArrayMap<SlotIndex, SlotId>;
  private readonly items: ArrayMap<ItemIndex, ItemId>;
  // Note that not every item gets an index - only those in the graph.
  private readonly slotInfos: ReadonlyMap<SlotId, SlotInfo>;
  private readonly itemInfos: ReadonlyMap<ItemId, ItemInfo>;

  /** Bitsets keyed by ItemIndex, represent a DNF condition. */
  readonly graph: Keyed<SlotIndex, readonly Bits[]>;
  readonly unlocks: Keyed<ItemIndex, readonly SlotIndex[]>;

  constructor(private readonly worlds: Array<{name: string, graph: LocationList}>) {
    const reverseWorlds = new Map<LocationList, number>();
    for (let i = 0; i < worlds.length; i++) {
      reverseWorlds.set(worlds[i].graph, i);
    }
    this.reverseWorlds = reverseWorlds;

    // Build up a list of all known provides/requires.
    const provided = new Set<number>();
    const required = new Set<number>();
    const fixed = new Set<number>();
    const slots = new Map<SlotId, SlotInfo>();
    const items = new Map<ItemId, ItemInfo>();
    for (let i = 0; i < worlds.length; i++) {
      const {graph} = worlds[i];
      const worldId = i << 24;
      for (const [providedId, requirement] of graph.requirements()) {
        provided.add(worldId | providedId);
        fixed.add(worldId | providedId);
        for (const route of requirement) {
          for (const cond of route) {
            required.add(worldId | cond);
            fixed.add(worldId | cond);
          }
        }        
      }
      for (const [itemId, info] of graph.items()) {
        fixed.delete(worldId | itemId);
        items.set((worldId | itemId) as ItemId, info);
      }
      for (const [slotId, info] of graph.slots()) {
        fixed.delete(worldId | slotId);
        slots.set((worldId | slotId) as SlotId, info);
      }
    }

    // Copy the maps and save them before we start deleting elements.
    this.itemInfos = new Map(items);
    this.slotInfos = new Map(slots);

    // Delete anything that's not used for logical progression.
    for (const id of slots.keys()) {
      if (!provided.has(id) && !required.has(id)) slots.delete(id);
    }
    for (const id of items.keys()) {
      if (!provided.has(id) && !required.has(id)) items.delete(id);
    }
    this.fixed = fixed.size;
    this.slots = new ArrayMap([...fixed, ...slots]);
    this.items = new ArrayMap([...fixed, ...items]);

    // Build up the graph now that we have the array maps.
    const graph: Bits[][] = [];
    const unlocks: Array<Set<SlotIndex>> = [];
    for (let i = 0; i < worlds.length; i++) {
      const worldId = i << 24;
      for (const [slot, req] of worlds[i].graph.requirements) {
        const slotIndex = this.slots.index((worldId | slot) as SlotId);
        if (slotIndex == null) {
          throw new Error(`Provided a non-slot? ${hex(slot)}`);
        }
        for (const cs of req) {
          const is =
              [...cs].map(c => this.items.index((worldId | c) as ItemId));
          (graph[slotIndex] || (graph[slotIndex] = [])).push(Bits.from(is));
          for (const i of is) {
            (unlocks[i] || (unlocks[i] = new Set())).add(slotIndex);
          }
        }
      }
    }

    // Sanity check to make sure all slots are provided.
    for (let i = 0; i < this.slots.length; i++) {
      if (!graph[i] || !graph[i].length) {
        const id = this.slots.get(i);
        console.error(`Nothing provided $${hex(id)}: ${this.checkName(id)
                       } (index ${i})`);
      }
    }
    this.graph = graph;
    this.unlocks = unlocks.map(x => [...x]);
  }




  ////////////



  async shuffle(flagset: FlagSet,
                random: Random,
                attempts = 2000,
                progress?: ProgressTracker): Promise<Map<SlotId, ItemId>|null> {
    if (progress) progress.addTasks(Math.floor(attempts / 100));
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (progress && (attempt % 100 === 99)) {
        progress.addCompleted(1);
        await new Promise(requestAnimationFrame);
      }
      const fill = new MutableArrayBiMap<SlotId, ItemId>();
      this.prefill(fill, random);
      const indexFill = this.compressFill(fill);
      const items = this.items(indexFill.values(), random);
      let has = Bits.from(new Set(items));
      const backtracks = Math.floor(attempt / 5);
      if (!this.fillInternal(indexFill, items, has, random, flagset, backtracks)) {
        continue;
      }
      const final = this.traverse(indexFill, Bits.of());
      // TODO - flags to loosen this requirement?
      if (final.size !== this.slots.length) {
        console.error(`Unexpected size mismatch!`, final, graph);
        continue;
      }
      this.expandFill(indexFill, fill);
      const out = this.fillNonProgression(fill, random, flagset);
      if (out == null) continue;
      if (progress) {
        progress.addCompleted(Math.floor((attempts - attempt) / 100));
      }
      return out;
    }
  }

  private fillInternal(fill: MutableArrayBiMap<SlotIndex, ItemIndex>,
                       items: ItemIndex[],
                       has: Bits,
                       random: Random,
                       flagset: FlagSet,
                       backSteps: number): boolean {
    for (let bit: ItemIndex | undefined = items.pop(); bit != null; bit = items.pop()) {
      if (!Bits.has(has, bit)) continue; // item already placed: skip
      const itemInfo = this.itemInfoFromIndex(bit);
      has = Bits.without(has, bit);
      const reachable = this.expandReachable(this.traverse(fill, has));
      random.shuffle(reachable);
      let found = false;
      const checked = new Set(fill.keys());
      for (const slot of reachable) {
        if (checked.has(slot)) continue;
        checked.add(slot);
        const slotInfo = this.slotInfoFromIndex(slot);
        if (!this.fits(slotInfo, itemInfo, flagset)) continue;
        fill.set(slot, bit);
        found = true;
        break;
      }
      if (found) continue;
      checked.clear();
      if (backsteps-- > 0) {
        // take a back-step
        for (const slot of reachable) {
          if (checked.has(slot) || !fill.has(slot)) continue;
          checked.add(slot);
          const slotInfo = this.graph.slotInfoFromIndex(slot);
          if (!this.fits(slotInfo, itemInfo, flagset)) continue;
          const previousItem = fill.replace(slot, bit);
          has = Bits.with(has, previousItem);
          items.push(previousItem);
          random.shuffle(items);
          found = true;
          break;
        }
        if (found) continue;
      }
      return false;
    }
    return true;
  }

  // adds weights
  private expandReachable(slots: Iterable<SlotIndex>): SlotIndex[] {
    const out = [];
    for (const slot of slots) {
      const info = this.slotInfoFromIndex(slot);
      // if (this.flags.preserveUnique() && !info.unique) continue;
      const weight = info.weight || 1;
      for (let i = 0; i < weight; i++) {
        out.push(slot);
      }
    }
    return out;
  }

  // TODO - instead of plumbing the flagset through here, consider
  // building it into the SlotInfo?  Or the ItemInfo, since it's
  // possible for a unique slot to accept a nonunique item, but
  // a unique item must be in a unique slot... same difference
  private fits(slot: SlotInfo, item: ItemInfo, _flagset: FlagSet): boolean {
    // if (this.flags.preserveUnique() && anyUniquesLeft(...)) ...
    if (slot.lossy && (item.losable && item.preventLoss)) return false;
    // TODO - flag for "protect all losable items"
    return true;
  }

  fillNonProgression() {
    // Figure out what still needs to be filled.  Will be mostly filler
    // items.  Start with unique items since we may have rules to prevent
    // putting uniques in non-unique slots but not vice versa.
    const validItems = new Set<number>();
    for (const slot of this.graph.slots) {
      if (slot.item != null) validItems.add(slot.item);
    }

    const uniques: ItemId[] = [];
    const consumables: ItemId[] = [];
    const mimics: ItemId[] = [];
    // earlySlots are filled first, if they're non-empty.
    const earlySlots: SlotId[] = [];
    const otherSlots: SlotId[] = [];
    for (let i = 0 as SlotId & ItemId; i < 0x7c; i++) {
      if (i < 0x70 && !validItems.has(i)) {
        if (fill.hasSlot(i) !== fill.hasItem(i)) console.error('MISMATCH',i);
        continue;
      }
      if (!fill.hasSlot(i) && !fill.hasItem(i) && !this.shuffleRules.shouldShuffle(i)) {
        fill.set(i, i);
        continue;
      }
      if (!fill.hasSlot(i)) {
        if (this.shuffleRules.isEarly(i)) {
          earlySlots.push(i);
        } else {
          otherSlots.push(i);
        }
      }
      if (!fill.hasItem(i)) {
        if (i <= 0x48 && this.rom.items[i].unique) {
          uniques.push(i);
        } else if (i < 0x70) {
          consumables.push(i);
        } else {
          mimics.push(i);
        }
      }
    }
    random.shuffle(earlySlots);
    random.shuffle(otherSlots);
    random.shuffle(uniques);
    random.shuffle(consumables);

    for (const item of iters.concat(uniques, mimics, consumables)) {
      // Try to place the item, starting with earlies first.
      // Mimics come before consumables because there's fewer places they can go.
      // Since key slots are allowed to contain consumables (even in full shuffle),
      // we need to make sure that the uniques go into those slots first.
      let found = false;
      for (const slots of [earlySlots, otherSlots]) {
        if (found) break;
        for (const slot of slots) {
          if (this.fits(slot, item /*, false*/)) {
            fill.set(slot, item);
            found = true;
            slots.splice(slots.indexOf(slot), 1);
            break;
          }
        }
      }
      if (!found) {
        // console.error(`Failed to fill extra item ${item}. Slots: ${earlySlots}, ${otherSlots}`);
        return null;
      }
    }
    return fill;
  }

  traverse() {}

  expandFill(indexFill: MutableArrayBiMap<SlotIndex, ItemIndex>,
             fill: MutableArrayBiMap<SlotId, ItemId>) {
    
  }
  compressFill(fill: MutableArrayBiMap<SlotId, ItemId>):
  MutableArrayBiMap<SlotIndex, ItemIndex> {
    
  }



  ///////



  checkName(id: number): string {
    return this.worlds[id >>> 24].name(id & 0xffffff);
  }

  prefill(fill: MutableArrayBiMap<SlotId, ItemId>, random: Random) {
    for (let i = 0; i < this.worlds.length; i++) {
      const worldId = i << 24;
      const worldFill = this.worlds[i].graph.prefill(random);
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

  slotInfoFromIndex(slot: SlotIndex): SlotInfo {
    const id = this.slots.get(slot);
    if (id == null) throw new Error(`Bad slot: ${slot}`);
    return this.slotInfoFromId(id);
  }

  slotInfoFromId(id: SlotId): SlotInfo {
    const info = this.itemInfos.get(id);
    if (info == null) throw new Error(`Missing info: ${hex(id)}`);
    return info;
  }
}



// TODO - clean this up
interface ProgressTracker {
  addTasks(tasks: number): void;
  addCompleted(tasks: number): void;
}
