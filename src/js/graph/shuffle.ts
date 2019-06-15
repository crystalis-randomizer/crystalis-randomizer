// Basic graph shuffle algorithm
import {Bits} from '../bits.js';
import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {seq} from '../rom/util.js';

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
type IndexFill = GenericFill<SlotIndex, ItemIndex>;

function expandFill(g: Graph, f: IndexFill): Fill {
  const out = new GenericFill<SlotId, ItemId>();
  for (let s = g.fixed; s < g.slots.length; s++) {
    const i: ItemIndex = f.slots[s];
    out.set(g.slots[s].item!, g.items[i].item!);
  }
  return out;
}


export interface Shuffle {
  shuffle(graph: Graph, random: Random): Fill | null;
}

/** @return The set of reachable slots. */
export function traverse(graph: Graph, fill: IndexFill, has: Bits): Set<SlotIndex> {
  // NOTE: we can't use isArray because the non-bigint polyfill IS an array
  has = Bits.clone(has);
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
      reachable.add(n);
      const item = n < graph.fixed ? n : fill.slots[n];
      if (item != null) {
        has = Bits.with(has, item);
        for (const j of graph.unlocks[item]) {
          queue.add(j);
        }
      }
      break;
    }
  }
  return reachable;
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

enum Type {
  EMPTY = 0,
  MIMIC = 1,
  CONSUMABLE = 2,
  KEY = 3,
  BOSS_DROP = 4,
  NPC = 5,
  // TODO - separate out MAGIC = 5, TRIGGER = 6?
  TRIGGER = 6,
}

// TODO - pull out a base class with fits, etc.
export class AssumedFill implements Shuffle {
  // TODO - other configuration?

  slotTypes: ReadonlyKeyed<SlotId | ItemId, Type | undefined>;

  shuffleTraps: boolean = false;
  shuffleFull: boolean = false;
 
  constructor(private readonly rom: Rom, private readonly flags: FlagSet) {
    // First compute a table of allowed locations, and whether items are unique.

    // For each slot, figure out (a) is it a chest (or mimic), (b) is it a trigger square.
    // If neither then it's an NPC or bossdrop.

    const triggers = new Set([0x41, 0x42, 0x46]);
    const chests = new Set();
    const bossDrops = new Set();
    for (const l of rom.locations) {
      if (!l.used) continue;
      for (const s of l.spawns) {
        if (s.isChest()) chests.add(s.id);
      }
    }
    for (const b of rom.bosses) {
      if (b.drop != null) bossDrops.add(b.drop);
    }

    this.slotTypes = seq(0x7c, i => {
      if (triggers.has(i)) return Type.TRIGGER;
      if (i >= 0x70) return Type.MIMIC;
      const item = rom.items[i];
      if (chests.has(i)) return item && item.unique ? Type.KEY : Type.CONSUMABLE;
      if (bossDrops.has(i)) return Type.BOSS_DROP;
      return item && item.unique ? Type.NPC : Type.EMPTY;
    });

    for (const f of flags.get('S') || []) {
      if (/c.*k/.test(f)) this.shuffleFull = true;
      if (/t/.test(f)) this.shuffleTraps = true;
    }
  }

  private fits(slot: SlotId, item: ItemId /* , uniquesLeft: boolean */): boolean {
    const slotType = this.slotTypes[slot] || Type.EMPTY;
    if (item >= 0x70) {
      // Mimics
      if (!this.shuffleTraps) return slotType === Type.MIMIC;
      if (!this.shuffleFull) return slotType <= Type.CONSUMABLE;
      return slotType <= Type.KEY;
    } else if (item <= 0x48 && this.rom.items[item].unique) {
      // Unique item
      if (!this.shuffleFull) return slotType >= Type.KEY;
      if (!this.shuffleTraps) return slotType !== Type.MIMIC;
      return true;
    }
    // Consumable
    // if (uniquesLeft && slotType > Type.CONSUMABLE) return false;
    if (!this.shuffleTraps) return slotType !== Type.MIMIC;
    return slotType !== Type.TRIGGER;
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

  shuffle(graph: Graph, random: Random): Fill | null {
    const items = this.items(graph, random);
//      this.itemToUid.map(uid => this.worldGraph.nodes[uid] as ItemGet), random);
    let has = Bits.from(new Set(items));
    const fill: IndexFill = new GenericFill();

    if (this.flags.guaranteeSword()) {
      // pick a sword at random and put it in slot 0
      // TODO: if exits shuffled then find a slot in zero-sphere.
    }

    for (let bit: ItemIndex | undefined = items.pop(); bit != null; bit = items.pop()) {
      if (!Bits.has(has, bit)) continue; // item already placed: skip
      const itemId = graph.items[bit].item;
      if (!itemId) throw new Error(`bad item: ${Object.entries(graph.items[bit])}`);
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
      if (!found) return null;
    }
    return this.fill(expandFill(graph, fill), random);
  }

  fill(fill: Fill, random: Random): Fill | null {
    // Figure out what still needs to be filled.  Will be mostlu consumables or mimics.
    // Start with unique items since we have rules to prevent putting uniques in non-unique
    // slots (if the flag is set) but not vice versa.

    const uniques: ItemId[] = [];
    const consumables: ItemId[] = [];
    const mimics: ItemId[] = [];
    // earlySlots are filled first, if they're non-empty.
    const earlySlots: SlotId[] = [];
    const otherSlots: SlotId[] = [];
    for (let i = 0; i < 0x7c; i++) {
      if (!fill.hasSlot(i as SlotId)) {
        const slotType = this.slotTypes[i] || Type.EMPTY;
        if (slotType <= (this.shuffleFull ? Type.NPC : Type.CONSUMABLE)) {
          otherSlots.push(i as SlotId);
        } else {
          earlySlots.push(i as SlotId);
        }
      }
      if (!fill.hasItem(i as ItemId)) {
        if (i <= 0x48 && this.rom.items[i].unique) {
          uniques.push(i as ItemId);
        } else if (i >= 0x7c) {
          mimics.push(i as ItemId);
        } else {
          consumables.push(i as ItemId);
        }
      }
    }
    random.shuffle(earlySlots);
    random.shuffle(otherSlots);
    random.shuffle(uniques);
    random.shuffle(consumables);

    for (const item of [...uniques, ...mimics, ...consumables]) {
      // Try to place the item, starting with earlies first.
      // Mimics come before consumables because there's fewer places they can go.
      // Since key slots are allowed to contain consumables (even in full shuffle),
      // we need to make sure that the uniques go into those slots first.
      let found = false;
      for (const slot of (earlySlots.length ? earlySlots : otherSlots)) {
        if (this.fits(slot, item /*, false*/)) {
          fill.set(slot, item);
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    return fill;
  }
}
