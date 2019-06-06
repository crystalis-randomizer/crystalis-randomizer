export namespace Event {
  export const STARTED_WINDMILL = Condition(0x00a);
  export const DEFEATED_SABERA = Condition(0x013);
  export const RETURNED_FOG_LAMP = Condition(0x021);
  export const HEALED_DOLPHIN = Condition(0x025);
  export const ENTERED_SHYRON = Condition(0x026);
  export const SHYRON_MASSACRE = Condition(0x027);
  export const LEAF_ABDUCTION = Condition(0x038);
  export const FOUND_KENSU = Condition(0x072);
  export const RIDE_DOLPHIN = Condition(0x09b);
  export const TALKED_TO_LEAF_RABBIT = Condition(0x0a9);
  export const CALMED_SEA = Condition(0x283);
  export const OPENED_CRYPT = Condition(0x28e);
  export const OPENED_STYX = Condition(0x2b0);
  export const OPENED_PRISON = Condition(0x2d8);
}

// NOTE: these items and capabilities are ones complements, not negatives
export type Capability = readonly [readonly [Condition]];
export namespace Capability {
  export const SWORD = Condition(~0);
  // export const MONEY = Condition(~1); // TODO - should this be an event?
  export const BREAK_STONE = Condition(~2);
  export const BREAK_ICE = Condition(~3);
  export const FORM_BRIDGE = Condition(~4);
  export const BREAK_IRON = Condition(~5);

  export const STATUE_GLITCH = Condition(~10);
}

// NOTE: use complement for items
export namespace Item {
  export const SWORD_OF_WIND = Condition(0x200);
  export const SWORD_OF_FIRE = Condition(0x201);
  export const SWORD_OF_WATER = Condition(0x202);
  export const SWORD_OF_THUNDER = Condition(0x203);
  export const CRYSTALIS = Condition(0x204);
  export const ORB_OF_WIND = Condition(0x205);
  export const TORNADO_BRACELET = Condition(0x206);
  export const ORB_OF_FIRE = Condition(0x207);
  export const FLAME_BRACELET = Condition(0x208);
  export const ORB_OF_WATER = Condition(0x209);
  export const BLIZZARD_BRACELET = Condition(0x20a);
  export const ORB_OF_THUNDER = Condition(0x20b);
  export const STORM_BRACELET = Condition(0x20c);

  export const MEDICAL_HERB = Condition(0x21d);
  export const WARP_BOOTS = Condition(0x224);

  export const STATUE_OF_ONYX = Condition(0x225);
  export const INSECT_FLUTE = Condition(0x227);
  export const FLUTE_OF_LIME = Condition(0x228);
  export const GAS_MASK = Condition(0x229);
  export const POWER_RING = Condition(0x22a);
  export const WARRIOR_RING = Condition(0x22b);
  export const IRON_NECKLACE = Condition(0x22c);
  export const DEOS_PENDANT = Condition(0x22d);
  export const RABBIT_BOOTS = Condition(0x22e);
  export const LEATHER_BOOTS = Condition(0x22f);
  export const SHIELD_RING = Condition(0x230);
  export const ALARM_FLUTE = Condition(0x231);
  export const WINDMILL_KEY = Condition(0x232);
  export const KEY_TO_PRISON = Condition(0x233);
  export const KEY_TO_STYX = Condition(0x234);
  export const FOG_LAMP = Condition(0x235);
  export const SHELL_FLUTE = Condition(0x236);
  export const EYE_GLASSES = Condition(0x237);
  export const BROKEN_STATUE = Condition(0x238);
  export const GLOWING_LAMP = Condition(0x239);
  // TODO - consider making this an actual item.
  export const STATUE_OF_GOLD = and(Item.BROKEN_STATUE, Item.GLOWING_LAMP);
  export const LOVE_PENDANT = Condition(0x23b);
  export const KIRISA_PLANT = Condition(0x23c);
  export const IVORY_STATUE = Condition(0x23d);
  export const BOW_OF_MOON = Condition(0x23e);
  export const BOW_OF_SUN = Condition(0x23f);
  export const BOW_OF_TRUTH = Condition(0x240);
}

export namespace Magic {
  export const REFRESH = Condition(0x241);
  export const PARALYSIS = Condition(0x242);
  export const TELEPATHY = Condition(0x243);
  export const TELEPORT = Condition(0x244);
  export const RECOVER = Condition(0x245);
  export const BARRIER = Condition(0x246);
  export const CHANGE = Condition(0x247);
  export const FLIGHT = Condition(0x248);
}

export function statue(...reqs: Requirement[]): Terrain {
  return {exit: or(...reqs, Capability.STATUE_GLITCH)};
};

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
  return [([] as Condition[]).concat(...cs.map(([c]) => c))];
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

  export const OPEN = {};

  export const SLOPE = {
    exit: Magic.FLIGHT,
  };

  // export function flag(id: number, flight?: boolean) {
  //   return {enter: flight ? [[id], [~0x248]] : [[id]]};
  // }

  export function flag(id: number) {
    return {enter: Condition(id)};
  }

  export const FLY = {
    enter: Magic.FLIGHT,
  };

  // TODO - make a version of waterfall that requires flight?
  //      - it probably doesn't matter, since flight is required
  //        to get to the waterfall in the first place?
  //        -> ghetto flight will need to just skip to past the waterfalls
  export const WATERFALL = SLOPE;

  // Seamless exits: same effect as OPEN but a different object so it
  // doesn't get unioned together.  This way we can distinguish the
  // exits clearly.
  export const SEAMLESS = {};
}
