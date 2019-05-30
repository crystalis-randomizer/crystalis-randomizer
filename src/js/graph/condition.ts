export namespace Events {
  export const STATUE_GLITCH = Condition(-2);
  export const LEAF_ABDUCTION = Condition(0x28);
}

export namespace Flags {
  export const TALKED_TO_LEAF_RABBIT = Condition(0xa9);
  
}

//function 

export namespace Magic {
  export const PARALYSIS = Condition(0x242);
  export const TELEPATHY = Condition(0x243);
  export const CHANGE = Condition(0x247);
  export const FLIGHT = Condition(0x248);
}

export function statue(...reqs: Requirement[]): Terrain {
  return {exit: or(...reqs, Events.STATUE_GLITCH), exitSouth: Condition.OPEN};
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
