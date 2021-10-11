import { Rom } from '../rom.js';
import { ConnectionType } from '../rom/metascreendata.js';
import { Location, Spawn } from '../rom/location.js';

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
