import { Config } from '../config';
import { Area } from '../rom/area';
import { Location } from '../rom/location';
import { Spawn } from '../rom/locationtables';
import { Shuffle } from '../shuffle';
import { DefaultMap } from '../util';

export function updateWalls(s: Shuffle) {
  // NOTE: update the spawn format first
  updateWallSpawnFormat(s);
  randomizeWalls(s);
}

/**
 * We rearrange how walls spawn to support custom shooting walls,
 * among other things.  The signal to the game (and later passes)
 * that we've made this change is to set the 0x20 bit on the 3rd
 * spawn byte (i.e. the spawn type).
 */
function updateWallSpawnFormat(s: Shuffle) {
  const {rom} = s;
  for (const location of rom.locations) {
    if (!location.used) continue;
    for (const spawn of location.spawns) {
      if (spawn.isWall()) {
        const elem = spawn.id & 0xf;
        spawn.id = elem | (elem << 4);
        const shooting = spawn.isShootingWall(location);
        spawn.data[2] = shooting ? 0x33 : 0x23;
        // const iron = spawn.isIronWall();
        // spawn.data[2] = 0x23 | (shooting ? 0x10 : 0) | (iron ? 0x40 : 0);
      }
    }
  }
}

function randomizeWalls(s: Shuffle): void {
  const {config, random, rom} = s;
  // NOTE: We can make any wall shoot by setting its $10 bit on the type byte.
  // But this also requires matching pattern tables, so we'll leave that alone
  // for now to avoid gross graphics.

  // All other walls will need their type moved into the upper nibble and then
  // the new element goes in the lower nibble.  Since there are so few iron
  // walls, we will give them arbitrary elements independent of the palette.
  // Rock/ice walls can also have any element, but the third palette will
  // indicate what they expect.

  if (config.maps.wallElements === Config.Randomization.VANILLA) return;

  // Basic plan: partition based on palette, look for walls.
  const pals = [
    [0x05, 0x38], // rock wall palettes
    [0x11], // ice wall palettes
    [0x6a], // "ember wall" palettes
    [0x14], // "iron wall" palettes
  ];

  function wallType(spawn: Spawn): number {
    if (spawn.data[2] & 0x20) {
      return (spawn.id >>> 4) & 3;
    }
    return spawn.id & 3;
  }

  const partition = new DefaultMap<Area, Location[]>(() => []);
  for (const location of rom.locations) {
    partition.get(location.data.area).push(location);
  }
  for (const locations of partition.values()) {
    // pick a random wall type.
    const elt = random.nextInt(4);
    const pal = random.pick(pals[elt]);
    let found = false;
    for (const location of locations) {
      for (const spawn of location.spawns) {
        if (spawn.isWall()) {
          const type = wallType(spawn);
          if (type === 2) continue;
          if (type === 3) {
            const newElt = random.nextInt(4);
            if (rom.spoiler) rom.spoiler.addWall(location.name, type, newElt);
            spawn.data[2] |= 0x20;
            spawn.id = 0x30 | newElt;
          } else {
            // console.log(`${location.name} ${type} => ${elt}`);
            if (!found && rom.spoiler) {
              rom.spoiler.addWall(location.name, type, elt);
              found = true;
            }
            spawn.data[2] |= 0x20;
            spawn.id = type << 4 | elt;
            location.tilePalettes[2] = pal;
          }
        }
      }
    }
  }
}
