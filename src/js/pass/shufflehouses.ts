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


// NOTE: there's a bug when entrances are out of order
//   - warp to towns comes out of door
//   - boat broken if not entrance 0 (e.g. lighthouse or boat house)
// -> might be nice to fix boat, but generally we've had all sorts of
//    issues from entrance reordering - we should try to fix it so
//    that the entrance types are preserved as much as possible
//    (i.e. edge/direction vs door, etc)
//   - can we defer the decision of which entrance number to use
//     until a little later, and just indirect it for a while?
//   - if maze shuffle is on, it could be hard to figure out which
//     is which? except we do know the exit types and the number
//     before we assign anything... so make a mapping and then fill
//     in any gaps.


import { Random } from '../random';
import { Rom } from '../rom';
import { ExitSpec, Metalocation } from '../rom/metalocation';
import { HouseType } from '../rom/location';
import { ConnectionType } from '../rom/metascreendata';
import { FlagSet } from '../flagset';
import { DefaultMap } from '../util';

interface House {
  type: HouseType;
  inside: ExitSpec;
  outside: ExitSpec;
}

const HOUSE_ICON = 0x06;
const TALL_HOUSE_ICON = 0x21;
const icons = new Map<HouseType, number>([
  ['pawn', 0x36],
  ['inn', 0x37],
  ['armor', 0x38],
  ['tool', 0x39],
  ['tavern', 0x3b],
]);

const shops = new Set<HouseType>(['inn', 'armor', 'tool', 'pawn']);
const compat = new Set<HouseType>([...shops, 'house', 'tavern']);

export function shuffleHouses(rom: Rom, flags: FlagSet, random: Random) {
  const {
    locations: {Crypt_Hall1, Goa, GoaFortress_Exit, Shyron},
    metascreens: {squareTownNE_house,
                  fortressTownEntrance,
                  mountainPathE_gate},
  } = rom;
  const palaceTowns = new Set([Goa.id, Shyron.id]);
  const firstPassOutsides = new Set([
    // NOTE: student/brokahana should be in first pass.
    squareTownNE_house.data.id,
    fortressTownEntrance.data.id,
    mountainPathE_gate.data.id,
  ]);

  if (flags.shuffleAreas()) {
    // Set a few additional locations as palaces
    for (const loc of [Goa, GoaFortress_Exit, Shyron, Crypt_Hall1]) {
      loc.data.houseType = 'palace';
    }
  }

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
    //if (location === Leaf_ElderHouse || location === Leaf_StudentHouse) continue;
    // There's something glitchy about this one - when we emerge,
    // the screen scrolls and locks.
    //if (location === BoatHouse) continue;

    // For non-shops, find the bottom edge
    let bottomExit!: [number, ConnectionType, ExitSpec, number];
    for (const [pos, type, spec] of location.meta.exits()) {
      // Find absolute Y coordinate of actual exit
      const coord =
          (pos & 0xf0) << 4 |
          (location.meta.get(pos).findExitByType(type).entrance >>> 8);
      if (!bottomExit || coord > bottomExit[3]) {
        bottomExit = [pos, type, spec, coord];
      }
    }
    for (const [pos, type, spec] of [bottomExit]) {
      // if (type === 'edge:bottom' || shops.has(location.data.houseType) ||
      //    (location.meta.tileset === rom.metatilesets.fortress &&
      //     type === 'stair:down') ||
      //    (location === GoaFortress_Exit &&
      //     type === 'stair:down' &&
      //     pos === 0x31)) {
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
        const screen =
            rom.locations[locpos >>> 8]
                .screens[(locpos >>> 4) & 0xf][locpos & 0xf];
        screens.get(screen).add(locpos);
      // }
    }
  }

  // Two passes: 1. only handle overloaded screens; 2. all the rest.
  const secondPass = new Map<number, Set<number>>();
  const firstPass = new Map<number, Set<number>>();
  for (const [scr, locposs] of random.ishuffle(screens)) {
    if (locposs.size >= 2 || firstPassOutsides.has(scr)) {
      firstPass.set(scr, locposs);
    } else {
      secondPass.set(scr, locposs);
    }
  }
  const hasInn = new Set<number>();
  const inns = byType.get('inn');
  for (const [, locposs] of [...firstPass, ...secondPass]) {
    //console.log(`shuffling screen ${scr.toString(16)}: ${[...locposs].map(l=>l.toString(16)).join(',')}`);
    const map = new Map<ConnectionType, HouseType>();
    let first = true;
    for (const locpos of locposs) {
      for (const house of byLocPos.get(locpos)) {
        let eligible = first && compat.has(house.type) ?
          [...compat].map(t => byType.get(t)) :
          [byType.get(map.get(house.outside[1]) ?? house.type)];
        eligible = eligible.filter(x => x.length);
        // Make sure we don't connect the "palace towns" (goa and shyron) in
        // a closed loop, either to itself (goa's entrance is inside itself)
        // or in a figure-either (goa top => shyron, and shyron temple => goa).
        if (house.type === 'palace' && palaceTowns.has(house.outside[0] >>> 8)) {
          eligible = eligible.map(x => x.filter(
              h => !palaceTowns.has(h.inside[0] >>> 8)));
        }
        // Avoid more than one inn per town, since that's lame.
        // Also, place inns first so as to most evenly distribute them.
        const allowInn = [...locposs].every(lp => !hasInn.has(lp >>> 8));
        if (!allowInn && eligible.length > 1) {
          eligible = eligible.filter(x => x !== inns);
        } else if (allowInn && eligible.some(x => x === inns)) {
          eligible = [inns];
        }
        // NOTE: if student is staying put then don't shuffle brokahana to a non-house
        // TODO - better condition, particularly if we _do_ shuffle student or if we split screens
        // if ((house.outside[0] >>> 8) === Goa_House.id && byType.get('house').length) {
        //   eligible = [byType.get('house')];
        // }
        // Also prevent multiple inns in the same town?
        const replacement = random.pickAndRemove(...eligible);
        if (replacement.type === 'inn') {
          for (const lp of locposs) {
            hasInn.add(lp >>> 8);
          }
        }
        map.set(house.outside[1], replacement.type);
        if (rom.spoiler) {
          rom.spoiler.addHouse(replacement.inside[0] >>> 8, house.outside[0] >>> 8);
        }
        // Make the connection
        //console.log(`connect ${rom.locations[house.outside[0]>>>8].name} ${house.outside[0].toString(16)} ${house.outside[1]} -- ${rom.locations[replacement.inside[0]>>>8].name} ${replacement.inside[0].toString(16)} ${replacement.inside[1]}`);
        Metalocation.connect(rom, house.outside, replacement.inside);
        // Replace the icon (if applicable)
        if (!first) continue;
        if (icons.get(house.type) === icons.get(replacement.type)) continue;
        const outside = rom.locations[house.outside[0] >>> 8];
        if (outside.meta.tileset !== rom.metatilesets.town) continue;
        const exits = Metalocation.findExitTiles(rom, house.outside);
        if (exits.length > 1) continue;
        let coord = exits[0] - 0x20;
        if ((exits[0] & 0xf0) < 0x20) coord -= 0x0f10; // funny vertical math
        const pos = coord >> 8;
        const tile = coord & 0xff;
        const icon = icons.get(replacement.type) ??
          (outside.meta.get(pos).data.tallHouses?.includes(tile) ?
           TALL_HOUSE_ICON : HOUSE_ICON);
        rom.screens[outside.screens[pos >> 4][pos & 0xf]].tiles[tile] = icon;
      }
      first = false;
    }
  }
}
