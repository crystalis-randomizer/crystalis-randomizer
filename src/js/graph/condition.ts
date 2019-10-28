export namespace Event {
  export const STARTED_WINDMILL = Condition(0x00a);
  export const LEAF_ELDER = Condition(0x00b);
  export const UNDERGROUND_CHANNEL = Condition(0x018);
  export const MESIA_RECORDING = Condition(0x01b);
  export const QUEEN_REVEALED = Condition(0x01e);
  export const RETURNED_FOG_LAMP = Condition(0x021);
  export const GENERALS_DEFEATED = Condition(0x024);
  export const HEALED_DOLPHIN = Condition(0x025);
  export const ENTERED_SHYRON = Condition(0x026);
  export const SHYRON_MASSACRE = Condition(0x027);
  export const LEAF_ABDUCTION = Condition(0x038);
  export const ZEBU_CAVE = Condition(0x03a);
  export const ZEBU_SHYRON = Condition(0x03b);
  export const RESCUED_CHILD = Condition(0x045);
  export const DWARF_MOTHER = Condition(0x052); // talked to w/ telepathy
  export const DWARF_CHILD = Condition(0x053); // following
  export const STOM_IN_SWAN = Condition(0x061);
  export const DRAYGON1 = Condition(0x06c);
  export const FOUND_KENSU = Condition(0x072);
  export const SHELL_FLUTE = Condition(0x08b); // used for non-slot dialog ~ fisherman
  export const RIDE_DOLPHIN = Condition(0x09b);
  export const ZEBU_STUDENT = Condition(0x0a5);
  export const LEAF_RABBIT = Condition(0x0a9);
  export const CALMED_SEA = Condition(0x283);
  export const OPENED_JOEL_SHED = Condition(0x287);
  export const OPENED_CRYPT = Condition(0x28e);
  export const OPENED_STYX = Condition(0x2b0);
  export const OPENED_SWAN = Condition(0x2b3);
  export const OPENED_PRISON = Condition(0x2d8);
  export const OPENED_SEALED_CAVE = Condition(0x2ee);
  export const ALWAYS_TRUE = Condition(0x2f0);
  export const WARP_OAK = Condition(0x2f7);
  export const WARP_JOEL = Condition(0x2fb);
  // export const WARP_SHYRON = Condition(0x2fd);
  // export const WARP_SAHARA = Condition(0x2ff);
}

// NOTE: these items and capabilities are ones complements, not negatives
export type Capability = readonly [readonly [Condition]];
export namespace Capability {
  export const SWORD = Condition(~0);
  export const MONEY = Condition(~1);
  export const BREAK_STONE = Condition(~2);
  export const BREAK_ICE = Condition(~3);
  export const FORM_BRIDGE = Condition(~4);
  export const BREAK_IRON = Condition(~5);
  export const TRAVEL_SWAMP = Condition(~6);
  export const CLIMB_WATERFALL = Condition(~7);
  export const BUY_HEALING = Condition(~8);
  export const BUY_WARP = Condition(~9);
  export const SHOOTING_STATUE = Condition(~10);
  export const CLIMB_SLOPE = Condition(~11);
}

// These indicate the boss is actually defeated.
export type Boss = readonly [readonly [Condition]];
export function Boss(id: number): Boss {
  return Condition(0x100 | id);
}
export namespace Boss {
  export const VAMPIRE1 = Boss(0x0);
  export const INSECT = Boss(0x1);
  export const KELBESQUE1 = Boss(0x2);
  export const RAGE = Boss(0x3);
  export const SABERA1 = Boss(0x4);
  export const MADO1 = Boss(0x5);
  export const KELBESQUE2 = Boss(0x6);
  export const SABERA2 = Boss(0x7);
  export const MADO2 = Boss(0x8);
  export const KARMINE = Boss(0x9);
  export const DRAYGON1 = Boss(0xa);
  export const DRAYGON2 = Boss(0xb);
  export const VAMPIRE2 = Boss(0xc);
}

export type Item = readonly [readonly [Condition]];
export function Item(id: number): Item {
  if (id >= 0x70) throw new Error(`expected item: ${id.toString(16)}`);
  return Condition(0x200 | id);
}
export namespace Item {
  export const SWORD_OF_WIND = Item(0x00);
  export const SWORD_OF_FIRE = Item(0x01);
  export const SWORD_OF_WATER = Item(0x02);
  export const SWORD_OF_THUNDER = Item(0x03);
  export const CRYSTALIS = Item(0x04);
  export const ORB_OF_WIND = Item(0x05);
  export const TORNADO_BRACELET = Item(0x06);
  export const ORB_OF_FIRE = Item(0x07);
  export const FLAME_BRACELET = Item(0x08);
  export const ORB_OF_WATER = Item(0x09);
  export const BLIZZARD_BRACELET = Item(0x0a);
  export const ORB_OF_THUNDER = Item(0x0b);
  export const STORM_BRACELET = Item(0x0c);

  export const MEDICAL_HERB = Item(0x1d);
  export const WARP_BOOTS = Item(0x24);

  export const STATUE_OF_ONYX = Item(0x25);
  export const INSECT_FLUTE = Item(0x27);
  export const FLUTE_OF_LIME = Item(0x28);
  export const GAS_MASK = Item(0x29);
  export const POWER_RING = Item(0x2a);
  export const WARRIOR_RING = Item(0x2b);
  export const IRON_NECKLACE = Item(0x2c);
  export const DEOS_PENDANT = Item(0x2d);
  export const RABBIT_BOOTS = Item(0x2e);
  export const LEATHER_BOOTS = Item(0x2f);
  export const SHIELD_RING = Item(0x30);
  export const ALARM_FLUTE = Item(0x31);
  export const WINDMILL_KEY = Item(0x32);
  export const KEY_TO_PRISON = Item(0x33);
  export const KEY_TO_STYX = Item(0x34);
  export const FOG_LAMP = Item(0x35);
  export const SHELL_FLUTE = Item(0x36);
  export const EYE_GLASSES = Item(0x37);
  export const BROKEN_STATUE = Item(0x38);
  export const GLOWING_LAMP = Item(0x39);
  // TODO - consider making this an actual item.
  export const STATUE_OF_GOLD = and(Item.BROKEN_STATUE, Item.GLOWING_LAMP);
  export const LOVE_PENDANT = Item(0x3b);
  export const KIRISA_PLANT = Item(0x3c);
  export const IVORY_STATUE = Item(0x3d);
  export const BOW_OF_MOON = Item(0x3e);
  export const BOW_OF_SUN = Item(0x3f);
  export const BOW_OF_TRUTH = Item(0x40);
}

export namespace Magic {
  export const REFRESH = Item(0x41);
  export const PARALYSIS = Item(0x42);
  export const TELEPATHY = Item(0x43);
  export const TELEPORT = Item(0x44);
  export const RECOVER = Item(0x45);
  export const BARRIER = Item(0x46);
  export const CHANGE = Item(0x47);
  export const FLIGHT = Item(0x48);
}

// export function statue(...reqs: Requirement[]): Terrain {
//   return {exit: or(...reqs, Capability.STATUE_GLITCH)};
// };

// Newtypes for different number purposes

export enum WallType {
  WIND = 0,
  FIRE = 1,
  WATER = 2,
  THUNDER = 3,
}

// Class for keeping track of a disjunctive normal form expression
export class MutableRequirement {
  private readonly map = new Map<string, Set<Condition>>();

  [Symbol.iterator](): Iterator<Iterable<Condition>> {
    return this.map.values();
  }

  add(newLabel: string, newDeps: Set<Condition>): boolean {
    for (const c of newDeps) if (Array.isArray(c)) throw new Error();

    if (this.map.has(newLabel)) return false;
    for (const [curLabel, curDeps] of this.map) {
      if (containsAll(newDeps, curDeps)) return false;
      if (containsAll(curDeps, newDeps)) this.map.delete(curLabel);
    }
    this.map.set(newLabel, newDeps);
    return true;
  }

  addAll(requirement: Requirement): void {
    for (const conditions of requirement) {
      this.addList(conditions);
    }
  }

  addList(conditions: readonly Condition[]): void {
    const sorted = [...new Set(conditions)].sort();
    const deps = new Set(sorted);
    this.add(sorted.join(' '), deps);
  }

  /** Appends the given requirement to all routes. */
  restrict(r: Requirement): void {
    const l = [...this.map.values()];
    this.map.clear();
    for (const ls of l) {
      for (const rs of r) {
        this.addList([...ls, ...rs]);
      }
    }
  }

  freeze(): Requirement {
    return [...this].map(cs => [...cs]);
  }
}

const containsAll = <T>(left: Set<T>, right: Set<T>): boolean => {
  if (left.size < right.size) return false;
  for (const d of right) {
    if (!left.has(d)) return false;
  }
  return true;
};

// Flag, item, or condition.
export type Condition = number & {__condition__: never};

export function Condition(x: number): readonly [readonly [Condition]] {
  return [[x as Condition]];
}
export function and(...cs: (readonly [readonly Condition[]])[]): Requirement {
  // TODO - this was a destructuring function ([c]) => c but Closure is destroying
  // it into (c) => [c] = c.
  //return [([] as Condition[]).concat(...cs.map(([c]) => c))];
  return [([] as Condition[]).concat(...cs.map((c) => c[0]))];
}
export function or(...cs: Requirement[]): Requirement {
  return ([] as Requirement).concat(...cs);
}
export function meet(left: Requirement, right: Requirement): Requirement {
  const out = new MutableRequirement();
  for (const ls of left) {
    for (const rs of right) {
      out.addList([...ls, ...rs]);
    }
  }
  return out.freeze();
}

// alias for use in Terrain.meet
const meetReq = meet;

export namespace Condition {
  export const OPEN: Requirement = [[]];
}

// An immutable DNF expression.  All exported constants are in this form.
export type Requirement = readonly (readonly Condition[])[];

// Slot for an item or flag to get.  Almost the same thing as a single
// condition, but used in different contexts.
export type Slot = number & {__slot__: never};

export function Slot(x: number | readonly [readonly [Condition]]): Slot {
  if (typeof x === 'number') return x as Slot;
  return x[0][0] as any;
}
export namespace Slot {
  export function item(x: number): Slot {
    return (x | 0x200) as Slot;
  }
  // export function boss(x: number): Slot {
  //   return (~(x | 0x100)) as Slot;
  // }
}


// Metadata about getting slots.
export interface Check {
  condition?: Requirement;
  slot: Slot;
}

export namespace Check {
  export function chest(id: number): Check {
    return {slot: Slot(0x200 | id)};
  }
}


export interface Terrain {
  // Requirement to enter tile, defaults to OPEN
  enter?: Requirement;
  // Requirement to exit any direction other than south
  exit?: Requirement;
  // Requirement to exit south
  exitSouth?: Requirement;
}

export namespace Terrain {
  // Positive numbers represent flags, items, etc.
  // // Negative numbers represent composite conditions.
  // export const CROSS_RIVERS = -1;
  // export const CROSS_SEA = -2;

  // TODO - how to handle dolphin?!?
  //   -- it's possible we could hard-code that anything connected
  //      to angry sea is enterable w/ dolphin as well?
  //   -- requires land bridge in underground channel...
  //      - could also just use summon points?
  // What about flags over water - not impassable? shouldn't matter?

  /** Makes a single extra copy of a terrain for seamless exits. */
  // Seamless exits: same effect as OPEN but a different object so it
  // doesn't get unioned together.  This way we can distinguish the
  // exits clearly.
  export const seamless = memoize((t: Terrain): Terrain => ({...t}));

  // export function flag(id: number, flight?: boolean) {
  //   return {enter: flight ? [[id], [~0x248]] : [[id]]};
  // }

  export function meet(left: Terrain, right: Terrain): Terrain {
    const out: Terrain = {};
    if (left.enter || right.enter) {
      out.enter = meetReq(left.enter || [[]], right.enter || [[]]);
    }
    if (left.exit || right.exit) {
      out.exit = meetReq(left.exit || [[]], right.exit || [[]]);
    }
    if (left.exitSouth || right.exitSouth) {
      out.exitSouth = meetReq(left.exitSouth || [[]], right.exitSouth || [[]]);
    }
    return out;
  }

  export function join(left: Terrain, right: Terrain): Terrain {
    const out: Terrain = {};
    if (left.enter || right.enter) {
      out.enter = (left.enter || [[]]).concat(right.enter || [[]]);
    }
    if (left.exit || right.exit) {
      out.exit = (left.exit || [[]]).concat(right.exit || [[]]);
    }
    if (left.exitSouth || right.exitSouth) {
      out.exitSouth = (left.exitSouth || [[]]).concat(right.exitSouth || [[]]);
    }
    return out;
  }

  export function flag(id: number) {
    return {enter: Condition(id)};
  }
}

export function memoize<T extends object, U>(f: (x: T) => U): (x: T) => U {
  const map = new WeakMap<T, U>();
  const undef = {} as U;
  return (x: T): U => {
    let y = map.get(x);
    if (y === undefined) {
      y = f(x);
      map.set(x, y === undefined ? undef : y);
    } else if (y === undef) {
      y = undefined;
    }
    return y as U;
  };
}

export function memoize2<T extends object, U extends object, V>(
    f: (x: T, y: U) => V): (x: T, y: U) => V {
  const map = new WeakMap<T, WeakMap<U, V>>();
  const undef: V = {} as V;
  return (x: T, y: U): V => {
    let ys = map.get(x);
    if (ys == undefined) map.set(x, ys = new WeakMap());
    let z = ys.get(y);
    if (z === undefined) {
      z = f(x, y);
      ys.set(y, z === undefined ? undef : z);
    } else if (z === undef) {
      z = undefined;
    }
    return z as V;
  };
}
