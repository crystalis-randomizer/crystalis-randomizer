import {Rom} from '../rom.js';

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

  // TODO - shops, boss weaknesses

  // Used for lazily displaying route
  readonly slotNames: {[id: number]: string} = [];
  readonly conditionNames: {[id: number]: string} = {};

  constructor(readonly rom: Rom) {}

  addCondition(condition: number, name: string): void {
    this.conditionNames[condition] = name;
  }

  addCheck(condition: number, deps: readonly number[], item?: number): void {
    this.route.push(new Check(this, condition, deps, item));
  }

  addSlot(slot: number, slotName: string, item: number): void {
    this.slots[slot] = new Slot(this.rom, slot, slotName, item);
    if (slotName) this.slotNames[0x200 | slot] = slotName;
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

  formatCondition(id: number, item?: number): string {
    // Ordinary symmetic conditions
    if (id < 0x200 || id >= 0x280) return this.conditionNames[id] || conditionHex(id);
    // Dependency items - always < 248
    if (item == null) return slotToItem(this.rom, id & 0xff);
    // Slot - print both slot and item name
    return `${this.slotNames[id] || conditionHex(id)} (${this.formatCondition(item | 0x200)})`;
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

class Check {
  constructor(readonly spoiler: Spoiler,
              readonly condition: number,
              readonly deps: readonly number[],
              readonly item: number | undefined) {}

  toString(): string {
    return `${this.spoiler.formatCondition(this.condition, this.item)}: [${
            this.deps.map(d => this.spoiler.formatCondition(d))
                     .filter(x => x !== 'Always True').join(', ')}]`;
  }
}

function conditionHex(id: number): string {
  return id < 0 ? '~' + ~id.toString(16).padStart(2, '0') : id.toString(16).padStart(3, '0');
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
