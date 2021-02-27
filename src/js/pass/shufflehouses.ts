// Shuffle house/shop/shed/palace entrances.
// This is tricky for a number of reasons.  We need to pay attention to
// keep the right icon above each door, which is extra tricky for the
// (vanilla) 5 screens that share two towns.  This can be mitigated by
// expanding the screen space into the extra ROM area, but it's nice to
// still work without that.

// NOTE: It's possible that we shuffle all the sphere-0 checks away from
// Leaf.  If there's no extra passage then we may end up with an impossible
// shuffle.  In that case, we need to find a way to regroup.  For now, the
// easiest option may be to leave those two houses out of the shuffle...


import {Random} from '../random.js';
import {Rom} from '../rom.js';
import {ExitSpec, Metalocation} from '../rom/metalocation.js';
import {HouseType} from '../rom/location.js';
import {ConnectionType} from '../rom/metascreendata.js';
import {FlagSet} from '../flagset.js';
import { DefaultMap } from '../util.js';

interface House {
  type: HouseType;
  inside: ExitSpec;
  outside: ExitSpec;
}

const shops = new Set<HouseType>(['inn', 'armor', 'tool', 'pawn']);
const compat = new Set<HouseType>([...shops, 'house', 'tavern']);

export function shuffleHouses(rom: Rom, flags: FlagSet, random: Random) {
  const {locations: {
    BoatHouse, Leaf_ElderHouse, Leaf_StudentHouse,
  }} = rom;
  // First order of business: collect all the connections.
  const byType = new DefaultMap<HouseType, House[]>(() => []);
  const byLocPos = new DefaultMap<number, House[]>(() => []); // key: LocPos
  const screens = new DefaultMap<number, Set<number>>(() => new Set()); // ScrId -> LocPos
  for (const location of rom.locations) {
    if (!location.used) continue;
    if (location.data.houseType == null) continue;
    // Prevent impossible shuffles by ensuring items in sphere-0
    // Note: if we have the GBC cave, we could potentially let these
    // houses float, since we're guaranteed two extra checks (though
    // mimics are shuffled early now, so that could still cause a problem).
    if (location === Leaf_ElderHouse || location === Leaf_StudentHouse) continue;
    // There's something glitchy about this one - when we emerge,
    // the screen scrolls and locks.
    if (location === BoatHouse) continue;

    // For non-shops, find the bottom edge
    for (const [pos, type, spec] of location.meta.exits()) {
      if (type === 'edge:bottom' || shops.has(location.data.houseType)) {
        const house: House = {
          type: location.data.houseType,
          inside: [location.id << 8 | pos, type],
          outside: spec,
        };
        let locpos = spec[0];
        // Check outside spec for shyron...
        // if (location === Shyron &&
        //     (location.data.houseType === 'armor' ||
        //      location.data.houseType === 'tool')) {
        //   locpos -= 0x10; // icon is actually on previous screen
        // }
        byLocPos.get(locpos).push(house);
        byType.get(location.data.houseType).push(house);
        const screen = rom.locations[locpos >>> 8].screens[(locpos >>> 4) & 0xf][locpos & 0xf];
        screens.get(screen).add(locpos);
      }
    }
  }

  // Two passes: 1. only handle overloaded screens; 2. all the rest.
  for (const [scr, locposs] of screens) {
    if (locposs.size >= 2) shuffle(scr, locposs);
  }
  for (const [scr, locposs] of screens) {
    if (locposs.size < 2) shuffle(scr, locposs);
  }

  function shuffle(scr: number, locposs: Set<number>) {
    console.log(`shuffling screen ${scr.toString(16)}: ${[...locposs].map(l=>l.toString(16)).join(',')}`);
    const map = new Map<ConnectionType, HouseType>();
    let first = true;
    for (const locpos of locposs) {
      for (const house of byLocPos.get(locpos)) {
        const eligible = first && compat.has(house.type) ?
          [...compat].map(t => byType.get(t)) :
          [byType.get(map.get(house.outside[1]) ?? house.type)];
        const replacement = random.pickAndRemove(...eligible);
        map.set(house.outside[1], replacement.type);
        // TODO - REPLACE ICON

        


        console.log(`connect ${house.outside[0].toString(16)} ${house.outside[1]} -- ${replacement.inside[0].toString(16)} ${replacement.inside[1]}`);
        Metalocation.connect(rom, house.outside, replacement.inside);
      }
    }
  }
}

