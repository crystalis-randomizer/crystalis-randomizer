// Basic graph shuffle algorithm
import {Bits} from '../bits.js';
import {FlagSet} from '../flagset.js';
import {Random} from '../random.js';
import {Rom} from '../rom.js';
import { seq } from '../rom/util.js';

type SlotIndex = number & {__slotIndex__: never};
type ItemIndex = number & {__itemIndex__: never};

export interface Node {
  item?: number; // only set for legit items/slots
  name:  string;
  condition: number; // condition number for tracking this node
  index: number;
}
export interface SlotNode extends Node {
  index: SlotIndex;
}
export interface ItemNode extends Node {
  index: ItemIndex;
}

export interface Graph {
  readonly fixed: number;  // index before which slots & deps are the same?
  readonly slots: Node[];
  readonly items: Node[];
  /** Map from location to DNF of items required to reach. */
  readonly graph: ReadonlyArray<readonly Bits[]>;
  /** Map from item to locations that may now be reachable. */
  readonly unlocks: ReadonlyArray<Set<number>>;
}

export class Fill {
  /** Maps location to item. */
  slots: number[] = [];
  /** Maps item to location. */
  items: number[] = [];

  set(slot: number, item: number) {
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
export function traverse(graph: Graph, fill: Fill, has: Bits): Set<number> {
  // NOTE: we can't use isArray because the non-bigint polyfill IS an array
  has = Bits.clone(has);
  const reachable = new Set<number>();
  const queue = new Set<number>();
  for (let i = 0; i < graph.slots.length; i++) {
    queue.add(i);
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

  shuffle(graph: Graph, random: Random): Fill | null {
    for (const item of this.rom.items) {
      

    }



    const slots: Slot[] = graph.nodes.filter(s => s instanceof Slot && s.slots && !s.isFixed()) as Slot[];
  const allItems =
          new Map<Slot, [ItemGet, number]>(
              random.shuffle(slots.map((s: Slot) =>
                                       [s, [s.item, s.itemIndex]] as [Slot, [ItemGet, number]])));
  const allSlots = new Set<Slot>(random.shuffle(slots));
  const itemToSlot = new Map<ItemGet, Slot>();
  const slotType = (slot: Slot): string => slot.slotType ? slot.slotType[0] : 'c';
  const buckets: {[type: string]: number} = {};

  for (const slot of allSlots) {
    itemToSlot.set(slot.item, slot);
  }

  const isSword = (item: Slot) => item.item.id < 4;
  const swords = new Set<Slot>();

    // Start with all items.
    const hasArr = strategy.shuffleItems(
        this.itemToUid.map(uid => this.worldGraph.nodes[uid] as ItemGet), random);
    let has = Bits.from(hasArr);
    const filling = new Array(this.locationToUid.length).fill(null);
    // Start something...
    while (hasArr.length) {
      const bit = hasArr.pop()!;
      if (!Bits.has(has, bit)) continue;
      const item = this.item(bit);
      has = Bits.without(has, bit);
      const reachable =
          [...this.traverse(has, filling)].filter(n => filling[n] == null);

      // NOTE: shuffle the whole thing b/c some items can't
      // go into some slots, so try the next one.
      strategy.shuffleSlots(item, reachable, random);
      // For now, we don't have any way to know...
      let found = false;
      for (const slot of reachable) {
        if (filling[slot] == null &&
            slot !== this.win &&
            fits(this.location(slot), item)) {
          if (slot > 100) throw new Error('Something went horribly wrong');
          filling[slot] = bit;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    return filling;


  }


}
