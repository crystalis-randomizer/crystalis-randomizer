import { Rom } from '../rom';
import { ConnectionType } from '../rom/metascreendata';
import { Location, Spawn } from '../rom/location';
import { Pos, ExitSpec } from '../rom/metalocation';
import { Flag } from '../rom/flags';

/**
 * Moves entrance-based triggers that should be attached to
 * the opposite side of specific exits.  This should ideally
 * run after shuffling any location-to-location connections
 * (i.e. shuffle houses) but _before_ randomizing the maps,
 * in case we need to disambiguate multiple same-type exits
 * at some point.
 */
export function fixEntranceTriggers(rom: Rom) {
  const {
    locations: {
      Portoa,
      PortoaPalace_ThroneRoom,
      Portoa_PalaceEntrance,
      UndergroundChannel,
      WaterfallCave2,
      WaterfallCave3,
    },
  } = rom;

  fixTrigger(Portoa_PalaceEntrance, 'edge:bottom', 0xb7, Portoa);
  fixTrigger(PortoaPalace_ThroneRoom, 'door', 0x92, UndergroundChannel);
  fixTrigger(WaterfallCave2, 'stair:up', 0xbf, WaterfallCave3);
  fixClosedCaveExits(rom);
}

/**
 * Check if the given `type` of exit from `exitLocation` connects to
 * the `originalEntrance` location.  If not, remove `trigger` from
 * the original location and add it to the actual other side of the
 * given exit.
 */
function fixTrigger(exitLocation: Location, exitType: ConnectionType,
                    trigger: number, originalEntrance: Location) {
  const [exit, ...rest] =
      [...exitLocation.meta.exits()].filter(([, type]) => type === exitType);
  if (!exit) throw new Error(`Could not find ${exitType} in ${exitLocation}`);
  if (rest.length) throw new Error(`Ambiguous ${exitType} in ${exitLocation}`);
  const [entranceLocPos, entranceType] = exit[2];
  const entranceLoc = entranceLocPos >>> 8;
  if (entranceLoc === originalEntrance.id) return; // nothing to do
  const entrancePos = entranceLocPos & 0xff;
  const entranceLocation = exitLocation.rom.locations[entranceLoc];
  const scr = entranceLocation.meta.get(entrancePos);
  const entrance = scr.data.exits!.find(e => e.type === entranceType);
  if (!entrance) throw new Error(`Bad entrance in ${entranceLocation}`);
  const triggerCoord =
      ((entrance.entrance & 0xf000) >>> 8 | (entrance.entrance & 0xf0) >>> 4) +
      triggerDirectionAdjustments[entrance.dir];
  if (entranceLocation.spawns.length > 17) entranceLocation.spawns.pop();
  const triggerSpawnIndex =
      originalEntrance.spawns.findIndex(s => s.isTrigger() && s.id === trigger);
  const triggerSpawn =
      triggerSpawnIndex >= 0 ?
      originalEntrance.spawns.splice(triggerSpawnIndex, 1)[0] :
      Spawn.of({type: 2, id: trigger});
  triggerSpawn.xt = (entrancePos & 0xf) << 4 | (triggerCoord & 0xf);
  triggerSpawn.yt = (entrancePos & 0xf0) | triggerCoord >>> 4;
  entranceLocation.spawns.push(triggerSpawn);
}

const triggerDirectionAdjustments = [0x10, 0, 0, 0];

/**
 * Moves "closed" caves.  Normally ScreenFix marks the sealed cave exit
 * on Cordel and the Mt Sabre summit cave exit on Waterfall Valley as
 * closed by setting a custom flag.  Instead, walk through the caves to
 * determine any cave exits they connect to.  This is "best effort": if
 * we run into problems, just leave it open.
 */
function fixClosedCaveExits(rom: Rom) {
  const {locations: {MtSabreNorth_Main, ValleyOfWind}} = rom;
  for (const locPos of findClosedCaveExits(ValleyOfWind, 0x11)) {
    const loc = rom.locations[locPos >>> 8];
    const pos = locPos & 0xff;
    setCustomFlag(loc, pos, rom.flags.OpenedSealedCave);
  }
  for (const locPos of findClosedCaveExits(MtSabreNorth_Main, 0x04)) {
    const loc = rom.locations[locPos >>> 8];
    if (loc.data.fixed) continue; // don't add if there's a fixed slot
    if (loc.spawns.length > 15) continue; // not enough room to add spawns
    const pos = locPos & 0xff;
    setCustomFlag(loc, pos, rom.flags.OpenedPrison);
    const coord = loc.meta.get(pos).findExitByType('cave').entrance;
    const keyTrigger = Spawn.of({screen: pos, coord: coord, type: 2, id: 0xad});
    loc.spawns.push(keyTrigger);
    if (loc.spawns.length > 15) continue; // is this a problem? could we ad-hoc?
    const explosion = Spawn.of({screen: pos, coord: coord - 0x1010,
                                type: 4, id: 0x2c});
    loc.spawns.splice(1, 0, explosion);
  }
}

function findClosedCaveExits(loc: Location, pos: Pos): number[] {
  const seen = new Set<Location|number>([loc, loc.id << 8 | pos]);
  const queue = new Set<ExitSpec>();
  for (const exit of loc.meta.exits()) {
    if (exit[0] === pos && (exit[1] === 'cave' || exit[1] === 'gate')) {
      queue.add(exit[2]);
    }
  }
  const out: number[] = [];

  // // TEST CAVES
  // if (pos === 0x11) {
  //   for (const scr of [0x7c, 0x7e]) {
  //     for (const e of loc.rom.locations[scr].meta.exits()) {
  //       if (e[1] === 'cave' || e[1] === 'gate') out.push(scr << 8 | e[0]);
  //     }
  //   }
  // }

  for (const exit of queue) {
    if (seen.has(exit[0])) continue;
    const exitLoc = loc.rom.locations[exit[0] >>> 8];
    const exitPos = exit[0] & 0xff;
    if (exitLoc.meta.customFlags.has(exitPos)) continue; // already blocked
    if (exit[1] === 'cave' || exit[1] === 'gate') { // Found a cave
      const scr = exitLoc.meta.get(exitPos);
      if (scr.flag === 'custom:true') {
        out.push(exit[0]);
      } else {
        console.error(`No flag for ${scr.name}`);
      }
      continue;
    }
    if (seen.has(exitLoc)) continue;
    seen.add(exitLoc);
    for (const entrance of exitLoc.meta.exits()) {
      // Don't recurse into a different cave
      if (entrance[1] === 'cave' || entrance[1] === 'gate') continue;
      queue.add(entrance[2]);
    }
  }
  //console.log(`From ${loc}: ${out.map(x=>x.toString(16))}`);;
  return out;
}

function setCustomFlag(loc: Location, pos: Pos, val: Flag|null,
                       noMirror?: boolean) {
  if (val) {
    loc.meta.customFlags.set(pos, val);
  } else {
    loc.meta.customFlags.delete(pos);
  }
  if (noMirror) return;
  if (loc === loc.rom.locations.CordelPlainEast) {
    setCustomFlag(loc.rom.locations.CordelPlainWest, pos, val, true);
  } else if (loc === loc.rom.locations.CordelPlainWest) {
    setCustomFlag(loc.rom.locations.CordelPlainEast, pos, val, true);
  }
}
