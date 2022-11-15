import {Rom} from '../rom';

/**
 * Stores organized information about the shuffle, including
 *   - which items are in which slots
 *   - a known-working route through the game
 *   - which enemies are shuffle where
 *   - enemy vulnerabilities
 *   - location connections
 *   - routes to each area
 */
export class Spoiler {
  readonly slots: Slot[] = [];
  readonly route: Check[] = [];
  readonly mazes: Maze[] = [];
  readonly trades: Trade[] = [];
  readonly walls: Wall[] = [];
  readonly unidentifiedItems: UnidentifiedItem[] = [];
  readonly wildWarps: WildWarp[] = [];
  readonly houses: House[] = [];
  flags: string = '';

  // TODO - shops, boss weaknesses

  constructor(readonly rom: Rom) {}

  addCheck(condition: number, deps: readonly number[]): void {
    this.route.push(new Check(this, condition, deps));
  }

  addSlot(slot: number, slotName: string, item: number): void {
    this.slots[slot & 0xff] =
        new Slot(this.rom, slot & 0xff, slotName, item & 0xff);
  }

  addMaze(id: number, name: string, maze: string): void {
    this.mazes.push({id, name, maze});
  }

  addTrade(itemId: number, item: string, npc: string): void {
    this.trades.push({itemId, item, npc});
  }

  addUnidentifiedItem(itemId: number, oldName: string, newName: string): void {
    this.unidentifiedItems.push({itemId, oldName, newName});
  }

  addWall(location: string, oldElement: number, newElement: number): void {
    this.walls.push({location, oldElement, newElement});
  }

  addWildWarp(id: number, name: string): void {
    this.wildWarps.push({id, name});
  }

  addHouse(houseId: number, townId: number): void {
    this.houses.push({
      houseId, townId,
      house: this.rom.locations[houseId].name,
      town: this.rom.locations[townId].name,
    });
  }

  formatCondition(id: number): string {
    return this.rom.flags[id]?.name
  }

  formatConditionList(conditions: readonly number[]): string {
    const terms: string[] = [];
    for (const c of conditions) {
      const f = this.rom.flags[c];
      if (f?.logic.track) terms.push(f.name);
    }
    return terms.join(', ');
  }
}

interface Maze {
  id: number;
  name: string;
  maze: string;
}

interface Trade {
  itemId: number;
  item: string;
  npc: string;
}

interface UnidentifiedItem {
  itemId: number;
  oldName: string;
  newName: string;
}

interface Wall {
  location: string;
  oldElement: number;
  newElement: number;
}

interface WildWarp {
  id: number;
  name: string;
}

interface House {
  houseId: number;
  house: string;
  townId: number;
  town: string;
}

class Check {
  constructor(readonly spoiler: Spoiler,
              readonly condition: number,
              readonly deps: readonly number[]) {}

  toString(): string {
    let item = 0;
    if ((this.condition & ~0x7f) === 0x100) {
      item = 0x200 | this.spoiler.rom.slots[this.condition & 0xff];
    }
    return `${this.spoiler.formatCondition(this.condition)}${
            item ? ` (${this.spoiler.formatCondition(item)})` : ''
            }: [${this.spoiler.formatConditionList(this.deps)}]`;
  }
}

class Slot {
  readonly itemName: string;
  readonly originalItem: string;

  constructor(rom: Rom,
              readonly slot: number,
              readonly slotName: string,
              readonly item: number) {
    this.itemName = slotToItem(rom, item);
    this.originalItem = slotToItem(rom, slot);
  }

  toString(): string {
    // Figure out the name of the slot, the original item, etc
    return `${this.itemName}: ${this.slotName} (${this.originalItem})`;
  }
}

function slotToItem(rom: Rom, slot: number): string {
  if (slot >= 0x70) return 'Mimic';
  return rom.items[rom.itemGets[slot].itemId].messageName;
}
