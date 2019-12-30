import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {FlagSet} from '../flagset.js';
import {MutableArrayBiMap} from '../util.js';
import {Graph, ItemId, ItemIndex, ItemInfo,
        SlotId, SlotIndex, SlotInfo} from './graph.js';

export interface ProgressTracker {
  addTasks(tasks: number): void;
  addCompleted(tasks: number): void;
}

export class AssumedFill {
  constructor(readonly flags: FlagSet,
              readonly graph: Graph,
              readonly random: Random,
              readonly attempts = 2000,
              readonly progress?: ProgressTracker) {}

  private items(filled: Iterable<ItemIndex>): ItemIndex[] {
    const arr = [];
    const skip = new Set(filled);
    for (let index = 0; index < this.graph.items.length; index++) {
      if (skip.has(index)) continue;
      const item = this.graph.items.get(index);
      const info = this.graph.itemInfos.get(item);
      for (let i = 0; i < (info.weight || 1); i++) {
        arr.push(index);
      }
    }
    this.random.shuffle(arr);
    return arr;
  }

  async shuffle(): Promise<Map<SlotId, ItemId>|null> {
    if (this.progress) this.progress.addTasks(Math.floor(this.attempts / 100));
    for (let attempt = 0; attempt < this.attempts; attempt++) {
      if (this.progress && (attempt % 100 === 99)) {
        progress.addCompleted(1);
        await new Promise(requestAnimationFrame);
      }
      const fill = new MutableArrayBiMap<SlotId, ItemId>();
      this.graph.prefill(fill, this.random);
      const indexFill = this.compressFill(fill);
      const items = this.items(indexFill.values());
      let has = Bits.from(new Set(items));
      if (!this.fillInternal(indexFill, items, has, Math.floor(attempt / 5))) {
        continue;
      }
      const final = this.traverse(indexFill, Bits.of());
      // TODO - flags to loosen this requirement?
      if (final.size !== this.graph.slots.length) {
        console.error(`Unexpected size mismatch!`, final, graph);
        continue;
      }
      this.expandFill(indexFill, fill);
      const out = this.fillNonProgression(fill, this.random);
      if (out == null) continue;
      if (progress) {
        progress.addCompleted(Math.floor((this.attempts - attempt) / 100));
      }
      return out;
    }
  }

  private fillInternal(fill: MutableArrayBiMap<SlotIndex, ItemIndex>,
                       items: ItemIndex[],
                       has: Bits,
                       backSteps: number): boolean {
    for (let bit: ItemIndex | undefined = items.pop(); bit != null; bit = items.pop()) {
      if (!Bits.has(has, bit)) continue; // item already placed: skip
      const itemInfo = this.graph.itemInfoFromIndex(bit);
      has = Bits.without(has, bit);
      const reachable = this.expandReachable(this.traverse(graph, fill, has));
      this.random.shuffle(reachable);
      let found = false;
      const checked = new Set(fill.keys());
      for (const slot of reachable) {
        if (checked.has(slot)) continue;
        checked.add(slot);
        const slotInfo = this.graph.slotInfoFromIndex(slot);
        if (!this.fits(slotInfo, itemInfo)) continue;
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
          if (!this.fits(slotInfo, itemInfo)) continue;
          const previousItem = fill.replace(slot, bit);
          has = Bits.with(has, previousItem);
          items.push(previousItem);
          this.random.shuffle(items);
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
      const info = this.graph.slotInfoFromIndex(slot);
      // if (this.flags.preserveUnique() && !info.unique) continue;
      const weight = info.weight || 1;
      for (let i = 0; i < weight; i++) {
        out.push(slot);
      }
    }
    return out;
  }

  private fits(slot: SlotInfo, item: ItemInfo): boolean {
    // if (this.flags.preserveUnique() && anyUniquesLeft(...)) ...
    if (slot.lossy && (item.losable && item.protect)) return false;
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
}
