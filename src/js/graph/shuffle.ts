// Basic graph shuffle algorithm
import {Bits} from '../bits.js';
import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import { seq } from '../rom/util.js';

declare const SLOTINDEX: unique symbol;
declare const ITEMINDEX: unique symbol;

// NOTE: a tagged newtype would be better here, but TS won't take it as a key
// export type SlotKey = {[SLOTINDEX]: never};
// export type ItemKey = {[ITEMINDEX]: never};
// type KeyOf<T> = T extends SlotIndex ? SlotKey : T extends ItemIndex ? ItemKey : {};
export type SlotIndex = 'slotIndex'; // typeof SLOTINDEX; //  & number;
export type ItemIndex = 'itemIndex'; // typeof ITEMINDEX; //  & number;

export function SlotIndex(i: number): SlotIndex { return i as any; }
export function ItemIndex(i: number): ItemIndex { return i as any; }

// interface Keys<V> {
//   [SLOTINDEX]: {[SLOTINDEX]: V};
//   [ITEMINDEX]: {[ITEMINDEX]: V};
// }

interface Keys<V> {
  slotIndex: {slotIndex: V};
  itemIndex: {itemIndex: V};
}

// export type SlotArray<V> = Array<unknown> & {[SLOTINDEX]: V};
// export type ReadonlySlotArray<V> = ReadonlyArray<unknown> & {readonly [SLOTINDEX]: V};

// export type ItemArray<V> = Array<unknown> & {[ITEMINDEX]: V};
// export type ReadonlyItemArray<V> = ReadonlyArray<unknown> & {readonly [ITEMINDEX]: V};

// export type Keyed<K, V> = Array<unknown> & {[E in keyof KeyOf<K>]: V};
// export type ReadonlyKeyed<K extends keyof Keys, V> = ReadonlyArray<unknown> & {readonly [E in keyof Keys[K]]: V};


export type Keyed<K extends keyof Keys<V>, V> = Array<unknown> & Keys<V>[K];
export type ReadonlyKeyed<K extends keyof Keys<V>, V> = ReadonlyArray<unknown> & Keys<V>[K];

export function Keyed<K extends keyof Keys<V>, V>() { return [] as any; }

export interface Node {
  item?: number; // only set for legit items/slots
  name:  string;
  condition: number; // condition number for tracking this node
  //index: number;
}
export interface SlotNode extends Node {
  index: SlotIndex;
}
export interface ItemNode extends Node {
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

export class Fill {
  /** Maps location to item. */
  slots: Keyed<SlotIndex, ItemIndex> = Keyed();
  /** Maps item to location. */
  items: Keyed<ItemIndex, SlotIndex> = Keyed();

  set(slot: SlotIndex, item: ItemIndex) {
    if (this.slots[slot] != null) throw new Error(`already filled slot ${slot}`);
    if (this.items[item] != null) throw new Error(`already filled item ${item}`);
    this.slots[slot] = item;
    this.items[item] = slot;
  }
}

export interface Shuffle {
  shuffle(graph: Graph, random: Random): Fill | null;
}

/** @return The set of reachable slots. */
export function traverse(graph: Graph, fill: Fill, has: Bits): Set<SlotIndex> {
  // NOTE: we can't use isArray because the non-bigint polyfill IS an array
  has = Bits.clone(has);
  const reachable = new Set<SlotIndex>();
  const queue = new Set<SlotIndex>();
  for (let i = 0; i < graph.slots.length; i++) {
    queue.add(SlotIndex(i));
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
  MIMIC = 0,
  CONSUMABLE = 1,
  KEY = 2,
  BOSS_DROP = 3,
  NPC = 4,
  // TODO - separate out MAGIC = 5, TRIGGER = 6?
  TRIGGER = 5,
}

// TODO - pull out a base class with fits, etc.
export class AssumedFill implements Shuffle {
  // TODO - other configuration?

  slotTypes: Type[];

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
      if (i > 0x48) return Type.CONSUMABLE;
      // if (i >= 0x41) return SlotType.MAGIC;
      const item = rom.items[i];
      if (!item.unique) return Type.CONSUMABLE;
      if (chests.has(i)) return Type.KEY;
      if (bossDrops.has(i)) return Type.BOSS_DROP;
      return Type.NPC;
    });

    for (const f of flags.get('S') || []) {
      if (/c.*k/.test(f)) this.shuffleFull = true;
      if (/t/.test(f)) this.shuffleTraps = true;
    }
  }

  private fits(graph: Graph, slot: number, item: number): boolean {
    const slotType = this.slotTypes[slot];
    if (item >= 0x70) {
      // Mimics
      if (!this.shuffleTraps) return slotType === Type.MIMIC;
      if (!this.shuffleFull) return slotType <= Type.CONSUMABLE;
      return slotType <= Type.KEY;
    } else if (this.rom.items[item].unique) {
      // Unique item
      if (!this.shuffleFull) return slotType >= Type.KEY;
      if (!this.shuffleTraps) return slotType !== Type.MIMIC;
      return true;
    }
    // Consumable
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
    const fill = new Fill();

  //   if (this.flags.guaranteeSword()) {
  //     // pick a sword at random and put it in slot 0
  //     // TODO: if exits shuffled then find a slot in zero-sphere.
  //   }


  //   const slots: Slot[] = graph.nodes.filter(s => s instanceof Slot && s.slots && !s.isFixed()) as Slot[];
  // const allItems =
  //         new Map<Slot, [ItemGet, number]>(
  //             random.shuffle(slots.map((s: Slot) =>
  //                                      [s, [s.item, s.itemIndex]] as [Slot, [ItemGet, number]])));
  // const allSlots = new Set<Slot>(random.shuffle(slots));
  // const itemToSlot = new Map<ItemGet, Slot>();
  // const slotType = (slot: Slot): string => slot.slotType ? slot.slotType[0] : 'c';
  // const buckets: {[type: string]: number} = {};

  // for (const slot of allSlots) {
  //   itemToSlot.set(slot.item, slot);
  // }

  // const isSword = (item: Slot) => item.item.id < 4;
  // const swords = new Set<Slot>();

  //   // Start with all items.
  //   const hasArr = strategy.shuffleItems(
  //       this.itemToUid.map(uid => this.worldGraph.nodes[uid] as ItemGet), random);
  //   let has = Bits.from(hasArr);
  //   const filling = new Array(this.locationToUid.length).fill(null);
  //   // Start something...
  //   while (hasArr.length) {
  //     const bit = hasArr.pop()!;
  //     if (!Bits.has(has, bit)) continue;
  //     const item = this.item(bit);
  //     has = Bits.without(has, bit);
  //     const reachable =
  //         [...this.traverse(has, filling)].filter(n => filling[n] == null);

  //     // NOTE: shuffle the whole thing b/c some items can't
  //     // go into some slots, so try the next one.
  //     strategy.shuffleSlots(item, reachable, random);
  //     // For now, we don't have any way to know...
  //     let found = false;
  //     for (const slot of reachable) {
  //       if (filling[slot] == null &&
  //           slot !== this.win &&
  //           fits(this.location(slot), item)) {
  //         if (slot > 100) throw new Error('Something went horribly wrong');
  //         filling[slot] = bit;
  //         found = true;
  //         break;
  //       }
  //     }
  //     if (!found) return null;
  //   }
    return fill;


  }


}
