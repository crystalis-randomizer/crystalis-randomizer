import {Rom} from '../rom.js';
import {Location, LOCATIONS} from './location.js';

class LocationsClass extends Array<Location> {
  
  static get [Symbol.species]() { return Array; }

  constructor(readonly rom: Rom) {
    super(0x100);
    for (let id = 0; id < 0x100; id++) {
      this[id] = new Location(rom, id);
    }
    for (const key of Object.keys(LOCATIONS)) {
      const [id,] = namesTyped[key];
      (this as unknown as {[name: string]: Location})[key] = this[id];
    }
  }

  // Find all groups of neighboring locations with matching properties.
  // TODO - optional arg: check adjacent # IDs...?
  partition<T>(func: (loc: Location) => T, eq: Eq<T> = (a, b) => a === b, joinNexuses = false): [Location[], T][] {
    const seen = new Set<Location>();
    const out: [Location[], T][] = [];
    for (let loc of this) {
      if (seen.has(loc) || !loc.used) continue;
      seen.add(loc);
      const value = func(loc);
      const group = [];
      const queue = [loc];
      while (queue.length) {
        const next = queue.pop()!;
        group.push(next);
        for (const n of next.neighbors(joinNexuses)) {
          if (!seen.has(n) && eq(func(n), value)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      out.push([[...group], value]);
    }
    return out;
  }
}

type Eq<T> = (a: T, b: T) => boolean;

const namesTyped = LOCATIONS as unknown as {[name: string]: [number, string]};

export type Locations = LocationsClass & {[T in keyof typeof LOCATIONS]: Location};

export const Locations: {new(rom: Rom): Locations} = LocationsClass as any;
