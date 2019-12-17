import * as requirement from './requirement.js';
import {Condition} from '../util.js';
import {memoize} from '../util.js';

export interface Terrain {
  // Requirement to enter tile, defaults to OPEN
  enter?: requirement.Requirement;
  // Requirement to exit any direction other than south
  exit?: requirement.Requirement;
  // Requirement to exit south
  exitSouth?: requirement.Requirement;
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
      out.enter = requirement.meet(left.enter || [[]], right.enter || [[]]);
    }
    if (left.exit || right.exit) {
      out.exit = requirement.meet(left.exit || [[]], right.exit || [[]]);
    }
    if (left.exitSouth || right.exitSouth) {
      out.exitSouth =
          requirement.meet(left.exitSouth || [[]], right.exitSouth || [[]]);
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


// Static map of terrains.
export const TERRAINS: Array<Terrain | undefined> = (() => {
  const out = [];
  for (let effects = 0; effects < 256; effects++) {
    out[effects] = terrain(effects);
  }
  // console.log('TERRAINS', out);
  return out;

  /**
   * @param effects The $26 bits of tileeffects, plus $08 for swamp, $10 for dolphin,
   * $01 for shooting statues, $40 for short slope
   * @return undefined if the terrain is impassable.
   */
  function terrain(effects: number): Terrain | undefined {
    if (effects & 0x04) return undefined; // impassible
    const terrain: Terrain = {};
    if ((effects & 0x12) === 0x12) { // dolphin or fly
      if (effects & 0x20) terrain.exit = Capability.CLIMB_WATERFALL;
      terrain.enter = or(Event.RIDE_DOLPHIN, Magic.FLIGHT);
    } else {
      if (effects & 0x40) { // short slope
        terrain.exit = Capability.CLIMB_SLOPE;
      } else if (effects & 0x20) { // slope
        terrain.exit = Magic.FLIGHT;
      }
      if (effects & 0x02) terrain.enter = Magic.FLIGHT; // no-walk
    }
    if (effects & 0x08) { // swamp
      terrain.enter = (terrain.enter || [[]]).map(cs => Capability.TRAVEL_SWAMP[0].concat(cs));
    }
    if (effects & 0x01) { // shooting statues
      terrain.enter = (terrain.enter || [[]]).map(cs => Capability.SHOOTING_STATUE[0].concat(cs));
    }
    return terrain;
  }
})();
