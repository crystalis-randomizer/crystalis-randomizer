export namespace Event {
  export const LEAF_ABDUCTION = Condition(0x38);
  export const TALKED_TO_LEAF_RABBIT = Condition(0xa9);
}

export namespace Capability {
  export const SWORD = Condition(-1);
  // export const MONEY = Condition(-2); // TODO - should this be an event?
  export const BREAK_STONE = Condition(-3);
  export const BREAK_ICE = Condition(-4);
  export const FORM_BRIDGE = Condition(-5);
  export const BREAK_IRON = Condition(-6);

  export const STATUE_GLITCH = Condition(-10);
}

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
}

export namespace Magic {
  export const PARALYSIS = Condition(0x242);
  export const TELEPATHY = Condition(0x243);
  export const CHANGE = Condition(0x247);
  export const FLIGHT = Condition(0x248);
}

export function statue(...reqs: Requirement[]): Terrain {
  return {exit: or(...reqs, Capability.STATUE_GLITCH), exitSouth: Condition.OPEN};
};

// Newtypes for different number purposes

export enum WallType {
  WIND = 0,
  FIRE = 1,
  WATER = 2,
  THUNDER = 3,
}

// Flag, item, or condition.
export type Condition = number & {__condition__: never};
export type Requirement = readonly (readonly Condition[])[];

export function Condition(x: number): readonly [readonly [Condition]] {
  return [[x as Condition]];
}
export function and(...cs: (readonly [readonly Condition[]])[]): Requirement {
  return [([] as Condition[]).concat(...cs.map(([c]) => c))];
}
export function or(...cs: Requirement[]): Requirement {
  return ([] as Requirement).concat(...cs);
}

export namespace Condition {
  export const OPEN: Requirement = [[]];
}


export interface Trigger {
  condition?: Requirement;
  set: readonly [readonly Condition[]];
}

export namespace Trigger {
  export function chest(id: number): Trigger[] {
    return [{set: Condition(0x200 | id)}];
  }
}


export interface Terrain {
  enter?: Requirement;
  exit?: Requirement;
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
    exitSouth: Condition.OPEN,
  };
  // export function flag(id: number, flight?: boolean) {
  //   return {enter: flight ? [[id], [0x248]] : [[id]]};
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
