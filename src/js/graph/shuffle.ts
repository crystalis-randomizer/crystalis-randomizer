// Basic graph shuffle algorithm
import {Bits} from '../bits.js';
import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {seq} from '../rom/util.js';
import {iters} from '../util.js';

export interface Shuffle {
  shuffle(graph: Graph,
          random: Random,
          progress?: ProgressTracker,
          attempts?: number): Promise<Fill | null>;
}
export interface ProgressTracker {
  addTasks(tasks: number): void;
  addCompleted(tasks: number): void;
}

export type SlotIndex = number & {__slotIndex__: never};
export type ItemIndex = number & {__itemIndex__: never};
export type SlotId = number & {__slotId__: never};
export type ItemId = number & {__itemId__: never};

export type Keyed<_K, V> = Array<V>;
export type ReadonlyKeyed<_K, V> = ReadonlyArray<V>;

// declare const s: SlotIndex;
// declare const i: ItemIndex;
// const a: Keyed<SlotIndex, ItemIndex> = [];
// const x = a[s];
// const [] = [s, i, a, x];

export interface Node {
  item?: number; // only set for legit items/slots
  name:  string;
  condition: number; // flag/condition number for tracking this node (e.g. 0x248 for flight)
  index: number;
}
export interface SlotNode extends Node {
  item?: SlotId;
  index: SlotIndex;
}
export interface ItemNode extends Node {
  item?: ItemId;
  index: ItemIndex;
}

// type Keyed<K, V> = Array<V>; // & {__keyed__: (k: K) => V, __writeable__: never};
// type ReadonlyKeyed<K, V> = ReadonlyArray<V>; // & {__keyed__: (k: K) => V};
// function Keyed<K, V>(a: V[]): Keyed<K, V> { return a as any; }
// namespace Keyed {
//   // export const toArray: {<K, V>(a: Keyed<K, V>): Array<V>,
//   //                        <K, V>(a: ReadonlyKeyed<K, V>): ReadonlyArray<V>} = (a: any) => a;
//   export function get<K, V>(a: ReadonlyKeyed<K, V>, k: K): V {
//     return (a as any)[k];
//   }
//   export function set<K, V>(a: Keyed<K, V>, k: K, v: V): void {
//     (a as any)[k] = v;
//   }
// }

export interface Graph {
  readonly fixed: number;  // index before which slots & deps are the same?
  readonly slots: ReadonlyKeyed<SlotIndex, SlotNode>;
  readonly items: ReadonlyKeyed<ItemIndex, ItemNode>;
  /** Map from location to DNF of items required to reach. */
  readonly graph: ReadonlyKeyed<SlotIndex, readonly Bits[]>;
  /** Map from item to locations that may now be reachable. */
  readonly unlocks: ReadonlyKeyed<ItemIndex, readonly SlotIndex[]>;
  readonly rom: Rom;
}

class GenericFill<S extends number, I extends number> {
  /** Maps location to item. */
  slots: Keyed<S, I> = [];
  /** Maps item to location. */
  items: Keyed<I, S> = [];

  set(slot: S, item: I) {
    if (this.slots[slot] != null) throw new Error(`already filled slot ${slot}`);
    if (this.items[item] != null) throw new Error(`already filled item ${item}`);
    this.slots[slot] = item;
    this.items[item] = slot;
  }

  hasSlot(slot: S): boolean {
    return this.slots[slot] != null;
  }

  hasItem(item: I): boolean {
    return this.items[item] != null;
  }
}

export type Fill = GenericFill<SlotId, ItemId>;
//export const Fill: {new(): Fill} = GenericFill;
export type IndexFill = GenericFill<SlotIndex, ItemIndex>;

/** Converts an IndexFill to a full Fill. */
function expandFill(g: Graph, f: IndexFill): Fill {
  const out = new GenericFill<SlotId, ItemId>();
  for (let i = g.fixed; i < g.items.length; i++) {
    const s: SlotIndex = f.items[i];
    out.set(g.slots[s].item!, g.items[i].item!);
  }
  return out;
}

export function newFill<S extends number, I extends number>(): GenericFill<S, I> {
  return new GenericFill();
}


/** @return The set of reachable slots. */
export function traverse(graph: Graph, fill: IndexFill, has: Bits): Set<SlotIndex> {
  // NOTE: we can't use isArray because the non-bigint polyfill IS an array
  has = Bits.clone(has);
  const reachable = new Set<SlotIndex>();
  const queue = new Set<SlotIndex>();
  for (let i = 0; i < graph.slots.length; i++) {
    if (graph.graph[i] == null) {console.dir(graph);throw new Error(`adding bad node ${i} (${graph.slots[i].name}) from slot`);}
    queue.add(i as SlotIndex);
  }
  for (const n of queue) {
    queue.delete(n);
    if (reachable.has(n)) continue;
    // can we reach it?
    const needed = graph.graph[n];
    if (needed == null) throw new Error(`not in graph: ${n}`);
    for (let i = 0, len = needed.length; i < len; i++) {
      if (!Bits.containsAll(has, needed[i])) continue;
      reachable.add(n);
      const item = n < graph.fixed ? n : fill.slots[n];
      if (item != null) {
        has = Bits.with(has, item);
        for (const j of graph.unlocks[item] || []) {
          if (graph.graph[j] == null) {console.dir(graph);throw new Error(`adding bad node ${j} from unlock ${item}`);}
          queue.add(j);
        }
      }
      break;
    }
  }
  return reachable;
}

// TODO - this is a lot of copy pasta, we should consolidate!
/** Copy of traverse but outputs a human-readable path. */
export function traverseFill(graph: Graph, fill: Fill): number[][] {
  const items = [];
  for (const i of graph.items) {
    if (i.item != null) items[i.item] = i.index;
  }
  const slots = [];
  for (const s of graph.slots) {
    if (s.item != null && fill.slots[s.item] != null) {
      slots[s.index] = items[fill.slots[s.item]];
    }
  }
  const out = [];

  let has = Bits.of()
  const reachable = new Set<SlotIndex>();
  const queue = new Set<SlotIndex>();
  for (let i = 0; i < graph.slots.length; i++) {
    queue.add(i as SlotIndex);
  }
  for (const n of queue) {
    queue.delete(n);
    if (reachable.has(n)) continue;
    // can we reach it?
    const needed = graph.graph[n];
    for (let i = 0, len = needed.length; i < len; i++) {
      if (!Bits.containsAll(has, needed[i])) continue;
      out.push([n, ...Bits.bits(needed[i])]);
      reachable.add(n);
      const item = n < graph.fixed ? n : slots[n];
      if (item != null) {
        has = Bits.with(has, item);
        for (const j of graph.unlocks[item] || []) {
          queue.add(j);
        }
      }
      break;
    }
  }
  return out;
}

// Shuffle modes:
//  1. key item shuffle Sk(t)
//  2. full shuffle Sf(t)
// For now we proxy a few things for this...

// Slot properties:
//  1. consumable or key
//  2. chest (incl. boss drops, may be consumable)
//  3. trigger (always key, must be key)
//  4. mimic

// Rules:
//  - If key shuffle then initial fill ignores all non-key slots
//  - If trap shuffle off then ignore mimic slots
//  - Consumables may not go into triggers
//  - Mimics may not go into npcs, triggers, or boss drops.
//  - We treat invisible chests like boss drops.

enum Type {
  EMPTY = 0,
  MIMIC = 1,
  CONSUMABLE = 2,
  KEY = 3,
  BOSS_DROP = 4,
  NPC = 5,
  MAGIC = 6,
  TRIGGER = 7,
}

export class ShuffleRules {
  private readonly slotTypes: ReadonlyKeyed<SlotId | ItemId, Type | undefined>;
  private readonly pools = new Map<Type, number>();

  constructor(private readonly rom: Rom, flags: FlagSet) {
    const triggers = new Set([0x41, 0x42, 0x46]);
    const chests = new Set();
    const bossDrops = new Set();
    for (const l of rom.locations) {
      if (!l.used) continue;
      for (const s of l.spawns) {
        if (s.isInvisible()) {
          bossDrops.add(s.id);
        } else if (s.isChest()) {
          if (l.bossId() != null) {
            // Non-drop chests on boss screens also don't work for mimics,
            // so count those chests as boss drops, too (e.g. storm bracelet)
            bossDrops.add(s.id);
          } else {
            chests.add(s.id);
          }
        }
      }
    }
    for (const b of rom.bosses) {
      if (b.drop != null) bossDrops.add(b.drop);
    }

    this.slotTypes = seq(0x7c, i => {
      if (triggers.has(i)) return Type.TRIGGER;
      if (i >= 0x70) return Type.MIMIC;
      if (i <= 0x48 && i >= 0x41) return Type.MAGIC;
      const item = rom.items[i];
      if (chests.has(i)) return item && item.unique ? Type.KEY : Type.CONSUMABLE;
      if (bossDrops.has(i)) return Type.BOSS_DROP;
      return item && item.unique ? Type.NPC : Type.EMPTY;
    });

    const poolFlags = flags.get('S') || [];
    for (let i = 0; i < poolFlags.length; i++) {
      const flag = poolFlags[i];
      if (/c/.test(flag)) {
        this.pools.set(Type.CONSUMABLE, i + 1);
      }
      if (/t/.test(flag)) {
        this.pools.set(Type.MIMIC, i + 1);
      }
      if (/k/.test(flag)) {
        this.pools.set(Type.KEY, i + 1);
        this.pools.set(Type.BOSS_DROP, i + 1);
        this.pools.set(Type.NPC, i + 1);
      }
      if (/m/.test(flag)) {
        this.pools.set(Type.MAGIC, i + 1);
        this.pools.set(Type.TRIGGER, i + 1);
      }
    }
  }

  fits(slot: SlotId, item: ItemId): boolean {
    // Vanilla placement is always legal.
    if (slot as number === item) return true;
    const slotType = this.slotTypes[slot] || Type.EMPTY;
    const slotPool = this.pools.get(slotType);
    if (slotPool == null) return false;
    // Special handling to prevent opels and unique armors on NPCs.
    if (requiresChest(item) && slotType >= Type.BOSS_DROP) return false;
    // TODO - account for new MAGIC type and use pools instead!
    let itemPool;
    if (item >= 0x70) {
      // Mimics - can never show up except in non-boss-drop chests.
      if (slotType > Type.KEY) return false;
      itemPool = this.pools.get(Type.MIMIC);
    } else if (item <= 0x48 && item >= 0x41) {
      // Magics - can be anywhere.
      itemPool = this.pools.get(Type.MAGIC);
    } else if (item < 0x41 && this.rom.items[item].unique) {
      // Unique item - can be anywhere.
      itemPool = this.pools.get(Type.KEY);
    } else if (this.pools.get(Type.CONSUMABLE) == null &&
               this.slotTypes[item] === Type.BOSS_DROP) {
      // If consumables are *not* shuffled then all boss drops
      // need to be treated as key items, not consumables.
      itemPool = this.pools.get(Type.BOSS_DROP)
    } else {
      // Consumables - cannot be on an NPC, Magic, or Trigger.
      if (slotType === Type.TRIGGER) return false;
      itemPool = this.pools.get(Type.CONSUMABLE);
    }
    if (itemPool == null) return false;

    // No hard blocker, so check for same pool.
    if (slotPool === itemPool) return true;

    // Different pools, but we need to shuffle some consumables
    // into key item slots occasionally.
    return (itemPool === this.pools.get(Type.CONSUMABLE));

  //     if (!this.shuffleFull) return slotType >= Type.KEY;
  //     if (!this.shuffleTraps) return slotType !== Type.MIMIC;
  //     return true;
  //   }
  //   // Consumable
  //   // if (uniquesLeft && slotType > Type.CONSUMABLE) return false;
  //   if (!this.shuffleTraps) return slotType !== Type.MIMIC;
  //   return slotType !== Type.TRIGGER;


  // // mimic
  //     if (!this.shuffleTraps) return slotType === Type.MIMIC;
  //     if (!this.shuffleFull) return slotType <= Type.CONSUMABLE;
  //     return slotType <= Type.KEY;

  }

  shouldShuffle(id: number): boolean {
    return this.pools.get(this.slotTypes[id] || 0) != null;
  }

  isEarly(slot: SlotId): boolean {
    const slotType = this.slotTypes[slot] || Type.EMPTY;

    // Early slots:
    //  - Trigger slots are always early, for all flags, since they cannot get
    //    consumables (or mimics).
    //  - TODO - consider a compromise full-shuffle flag/mode where NPCs don't
    //    ever have consumables.
    //  - Otherwise any slot type that does not shuffle w/ consumables needs
    //    to be early.

    if (slotType >= Type.TRIGGER) return true;
    const pool = this.pools.get(slotType);
    const consumablePool = this.pools.get(Type.CONSUMABLE);
    const mimicPool = this.pools.get(Type.MIMIC);
    return pool !== consumablePool && pool !== mimicPool;

    // return slotType > (fullShuffle ? Type.NPC : Type.CONSUMABLE);
  }
}


// TODO - pull out a base class with fits, etc.
export class AssumedFill implements Shuffle {
  // TODO - other configuration?

  readonly shuffleRules: ShuffleRules;
 
  constructor(private readonly rom: Rom,
              private readonly flags: FlagSet) {
    this.shuffleRules = new ShuffleRules(rom, flags);
    // First compute a table of allowed locations, and whether items are unique.

    // For each slot, figure out (a) is it a chest (or mimic), (b) is it a trigger square.
    // If neither then it's an NPC or bossdrop.

  }

  private fits(slot: SlotId, item: ItemId /* , uniquesLeft: boolean */): boolean {
    return this.shuffleRules.fits(slot, item);
  }

  // Note: duplicates are allowed.
  protected items(graph: Graph, random: Random): ItemIndex[] {
    const arr = [];
    for (const item of graph.items) {
      if (item.item == null) continue;
      let count = 1;
      if (item.item === 0x00 || item.item === 0x01) count = 5;
      if (item.item === 0x02) count = 10;
      if (item.item === 0x03 || item.item === 0x48) count = 15;
      for (let i = 0; i < count; i++) arr.push(item.index);
    }
    random.shuffle(arr);
    return arr;
  }

  async shuffle(graph: Graph,
                random: Random,
                progress?: ProgressTracker,
                attempts: number = 2000): Promise<Fill | null> {
    if (progress) progress.addTasks(Math.floor(attempts / 100));
    for (let attempt = 0; attempt < attempts; attempt++) {
      // ensure UI updates
      if (progress && (attempt % 100 === 99)) {
        await new Promise(requestAnimationFrame);
        progress.addCompleted(1);
      }
      const items = this.items(graph, random);
      let has = Bits.from(new Set(items));
      const fill: IndexFill = new GenericFill();

      // Initialize fill with non-shuffled items.
      const itemIndex = new Map<ItemId | SlotId, ItemIndex>();
      const slotIndex = new Map<ItemId | SlotId, SlotIndex>();
      const nonShuffledItems: ItemId[] = [];
      for (let i = graph.fixed as ItemIndex; i < graph.items.length; i++) {
        const id = graph.items[i].item;
        if (id == null) continue;
        itemIndex.set(id, i);
        if (!this.shuffleRules.shouldShuffle(id)) nonShuffledItems.push(id);
      }

      for (let s = graph.fixed as SlotIndex; s < graph.slots.length; s++) {
        const id = graph.slots[s].item;
        if (id != null) slotIndex.set(id, s);
      }

      for (const id of nonShuffledItems) {
        const i = itemIndex.get(id);
        const s = slotIndex.get(id);
        if (s == null || i == null) continue;
        fill.set(s, i);
        has = Bits.without(has, i);
      }

      if (this.flags.guaranteeSword()) {
        // pick a sword at random and put it in slot 0
        const sword = random.nextInt(4) as ItemId;
        const i = itemIndex.get(sword);
        const s = slotIndex.get(0 as SlotId); // elder normall gives sword of wind
        if (i != null && s != null && !fill.hasSlot(s) && !fill.hasItem(i)) {
          fill.set(s, i);
          has = Bits.without(has, i);
        }
        // TODO: if exits shuffled then find a slot in zero-sphere.
      }

      if (!this.fillInternal(graph, random, fill, items, has, Math.floor(attempt / 5))) continue;

      const final = traverse(graph, fill, Bits.of());
      if (final.size !== graph.slots.length) {
        console.error('unexpected size mismatch!', final, graph);
        continue;
      }
      const out = this.fill(graph, expandFill(graph, fill), random);
      if (out == null) continue;
      if (progress) progress.addCompleted(Math.floor((attempts - attempt) / 100));
      return out;
    }
    return null;
  }

  protected fillInternal(graph: Graph,
                         random: Random,
                         fill: IndexFill,
                         items: ItemIndex[],
                         has: Bits,
                         backSteps: number): boolean {
    for (let bit: ItemIndex | undefined = items.pop(); bit != null; bit = items.pop()) {
      if (!Bits.has(has, bit)) continue; // item already placed: skip
      const itemId = graph.items[bit].item;
      if (itemId == null) throw new Error(`bad item: ${Object.entries(graph.items[bit])}`);
      has = Bits.without(has, bit);
      const reachable = [...traverse(graph, fill, has)];
      random.shuffle(reachable);
      let found = false;
      for (const slot of reachable) {
        const slotId = graph.slots[slot].item;
        if (slotId == null) continue;
        if (!fill.hasSlot(slot) && this.fits(slotId, itemId /*, true*/)) { // slot !== this.win &&
          fill.set(slot, bit);
          found = true;
          break;
        }
      }
      if (found) continue;
      if (backSteps-- > 0) {
        // take a back step.
        for (const slot of reachable) {
          const slotId = graph.slots[slot].item;
          if (slotId == null) continue;
          if (this.fits(slotId, itemId)) {
            const previousItem = fill.slots[slot];
            fill.slots[slot] = fill.items[previousItem] = undefined as any;
            has = Bits.with(has, previousItem);
            items.push(previousItem);
            random.shuffle(items);
            fill.set(slot, bit);
            found = true;
            break;            
          }
        }
        if (found) continue;
      }
      // TODO - it looks like we're placing random items in magic slots when Sm is off?!?
      //     ----> figure out what was placed in its spot?
      // console.error(`Failed to place key item ${itemId}: available ${reachable.map(s => graph.slots[s].item)}`);
      return false;
    }
    return true;
  }

  /** Fils the remaining slots with non-progression items. */
  private fill(graph: Graph, fill: Fill, random: Random): Fill | null {
    // Figure out what still needs to be filled.  Will be mostlu consumables or mimics.
    // Start with unique items since we have rules to prevent putting uniques in non-unique
    // slots (if the flag is set) but not vice versa.
    const validItems = new Set<number>();
    for (const slot of graph.slots) {
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
}

function requiresChest(id: ItemId): boolean {
  // psychos, battle armor, and 3 opels
  return id === 0x14 || id === 0x1b || id === 0x1c ||
      id === 0x26 || id === 0x63 || id === 0x6d;
}

// export class ForwardFill extends AssumedFill {
//   protected fillInternal(graph: Graph,
//                          random: Random,
//                          fill: IndexFill,
//                          items: ItemIndex[],
//                          has: Bits): boolean {
//     while (!Bits.empty(has)) {
//       // What's reachable with nothing?
//       const reachable = [...traverse(graph, fill, Bits.of())];
//       // What are the immediate blocks?!? Need to add an API to get these?
//       // Translate reachabble into a "has"
//       let gettable = Bits.from(
//           reachable.map(s => s < graph.fixed ? s : fill.slots[s]).filter(i => i));
//       let unlocks = new Set<ItemIndex>();
//       const unlocks2 = new Set<ItemIndex>();
//       for (let s = 0 as SlotIndex; s < graph.graph.length; s++) {
//         for (const route of graph.graph[s]) {
//           const bits = Bits.bits(Bits.difference(route, gettable)) as ItemIndex[];
//           if (bits.length === 1) unlocks.add(bits[0]);
//           if (bits.length === 2) {
//             unlocks2.add(bits[0]);
//             unlocks2.add(bits[1]);
//             // TODO - multimap, and then go with item that's least eventful
//           }
//         }        
//       }

//       // Pick an unlockable and a slot.
//       const allItems = [...(unlocks.size ? unlocks : unlocks2)];
//       const item = allItems[random.nextInt(allItems.length)];
      
//     //   random.shuffle(reachable);
//     //   let found = false;
//     //   for (const slot of reachable) {
//     //     const slotId = graph.slots[slot].item;
//     //     if (slotId == null) continue;
//     //     if (!fill.hasSlot(slot) && this.fits(slotId, itemId /*, true*/)) { // slot !== this.win &&
//     //       fill.set(slot, bit);
//     //       found = true;
//     //       break;
//     //     }
//     //   }
//     //   if (!found) {

//     //     // TODO - it looks like we're placing random items in magic slots when Sm is off?!?
//     //     //     ----> figure out what was placed in its spot?

//     //     console.error(`Failed to place key item ${itemId}: available ${reachable.map(s => graph.slots[s].item)}`);
//     //     return false;
//     //   }
                       
//     // }


//     for (let bit: ItemIndex | undefined = items.pop(); bit != null; bit = items.pop()) {
//       if (!Bits.has(has, bit)) continue; // item already placed: skip
//       const itemId = graph.items[bit].item;
//       if (itemId == null) throw new Error(`bad item: ${Object.entries(graph.items[bit])}`);
//       has = Bits.without(has, bit);
//       const reachable = [...traverse(graph, fill, has)];
//       random.shuffle(reachable);
//       let found = false;
//       for (const slot of reachable) {
//         const slotId = graph.slots[slot].item;
//         if (slotId == null) continue;
//         if (!fill.hasSlot(slot) && this.fits(slotId, itemId /*, true*/)) { // slot !== this.win &&
//           fill.set(slot, bit);
//           found = true;
//           break;
//         }
//       }
//       if (!found) {

//         // TODO - it looks like we're placing random items in magic slots when Sm is off?!?
//         //     ----> figure out what was placed in its spot?

//         console.error(`Failed to place key item ${itemId}: available ${reachable.map(s => graph.slots[s].item)}`);
//         return false;
//       }
//     }
//     return true;
//   }
// }
