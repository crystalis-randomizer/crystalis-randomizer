import {Rom} from '../rom.js';
import {Location} from './location.js';

class LocationsClass extends Array<Location> {
  
  static get [Symbol.species]() { return Array; }

  constructor(readonly rom: Rom) {
    super(0x100);
    for (let id = 0; id < 0x100; id++) {
      this[id] = new Location(rom, id);
    }
    for (const name of Object.keys(names)) {
      const id = namesTyped[name];
      (this as unknown as LocationsByName)[name] = this[id];
    }
  }

  // Find all groups of neighboring locations with matching properties.
  partition<T>(func: (loc: Location) => T, eq: Eq<T> = (a, b) => a === b): [Location[], T][] {
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
        for (const n of next.neighbors()) {
          if (!seen.has(n) && eq(func(n), value)) {
            seen.add(n);
            queue.push(n);
            group.push(n);
          }
        }
      }
      out.push([[...group], value]);
    }
    return out;
  }
}

type Eq<T> = (a: T, b: T) => boolean;

const names = {
  mezameShrine: 0x00,
  outsideStart: 0x01,
  leaf: 0x02,
  valleyOfWind: 0x03,
  sealedCave1: 0x04,
  sealedCave2: 0x05,
  sealedCave6: 0x06,
  sealedCave4: 0x07,
  sealedCave5: 0x08,
  sealedCave3: 0x09,
  sealedCave7: 0x0a,
  sealedCave8: 0x0c,
  windmillCave: 0x0e,
  windmill: 0x0f,
  zebuCave: 0x10,
  mtSabreWestTunnel1: 0x11,
  cordelPlainWest: 0x14,
  cordelPlainEast: 0x15,
  brynmaer: 0x18,
  outsideStomsHouse: 0x19,
  swamp: 0x1a,
  amazones: 0x1b,
  oak: 0x1c,
  stomsHouse: 0x1e,
  mtSabreWestLower: 0x20,
  mtSabreWestUpper: 0x21,
  mtSabreWestTunnel2: 0x22,
  mtSabreWestTunnel3: 0x23,
  mtSabreWestTunnel4: 0x24,
  mtSabreWestTunnel5: 0x25,
  mtSabreWestTunnel6: 0x26,
  mtSabreWestTunnel7: 0x27,
  mtSabreNorthMain: 0x28,
  mtSabreNorthMiddle: 0x29,
  mtSabreNorthTunnel2: 0x2a,
  mtSabreNorthTunnel3: 0x2b,
  mtSabreNorthTunnel4: 0x2c,
  mtSabreNorthTunnel5: 0x2d,
  mtSabreNorthTunnel6: 0x2e,
  mtSabreNorthPrison: 0x2f,
  mtSabreNorthLeftCell: 0x30,
  mtSabreNorthLeftCell2: 0x31,
  mtSabreNorthRightCell: 0x32,
  mtSabreNorthTunnel8: 0x33,
  mtSabreNorthTunnel9: 0x34,
  mtSabreNorthTunnel10: 0x35,
  mtSabreNorthTunnel1: 0x38,
  mtSabreNorthTunnel7: 0x39,
  nadareInn: 0x3c,
  nadareToolShop: 0x3d,
  nadareBackRoom: 0x3e,
  waterfallValleyNorth: 0x40,
  // ...
};

const namesTyped = names as {[name: string]: number};

export type Locations = LocationsClass & {[T in keyof typeof names]: Location};
interface LocationsByName {
  [name: string]: Location;
}

export const Locations: {new(rom: Rom): Locations} = LocationsClass as any;
