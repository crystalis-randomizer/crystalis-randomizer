import {Rom} from '../rom';
import {Entrance} from '../rom/location';
import {DolphinSpawnScript} from '../rom/npc';
import {seq} from '../rom/util';

/** Fixes movement scripts to work based on where NPCs ended up. */
export function fixMovementScripts(rom: Rom) {
  fixAkahanaExits(rom);
  fixDolphinSpawns(rom);
}


function fixAkahanaExits(_rom: Rom) {
  // const {
  //   npcs: {
  //     AkahanaInBrynmaer, // not really needed unless we move NPCs.
  //     StonedAkahana,
  //   },
  // } = rom;

  // for (const location of rom.locations) {
  //   for (const spawn of location.spawns) {
  //     // TODO - check for akahana, look at location.meta, etc.
  //   }
  // }
}


function fixDolphinSpawns(rom: Rom) {
  const {
    locations: {
      AngrySea,
    },
    npcs: {
      //AkahanaInBrynmaer, // not really needed unless we move NPCs.
      Dolphin,
      //StonedAkahana,
    },
    metascreens: {
      beachCabinEntrance, // cabin
      beachCave, // joel
      beachExitN, // swan
      boatChannel, // boat
    },
  } = rom;

  Dolphin.spawnScripts = [];
  const free = new Set<number>(seq(16, i => i));
  for (let i = 0; i < AngrySea.entrances.length; i++) {
    let entrance = AngrySea.entrances[i];
    let meta = AngrySea.meta.get(entrance.screen);
    let spawn: DolphinSpawnScript|undefined;
    if (meta === boatChannel) {
      if (AngrySea.meta.get(entrance.screen - 1) !== beachCabinEntrance) {
        throw new Error(`Bad boatChannel entrance ${entrance}`);
      }
      entrance = Entrance.of({screen: entrance.screen - 1, tile: 0});
      meta = beachCabinEntrance;
    }
    if (meta === beachCabinEntrance) {
      spawn = {
        entrance: Entrance.of({screen: entrance.screen - 17, coord: 0xb8e8}),
        movement: 5,
      };
    } else if (meta === beachCave) {
      spawn = {
        entrance: Entrance.of({screen: entrance.screen, coord: 0xe808}),
        movement: 8,
      };
    } else if (meta === beachExitN) {
      spawn = {
        entrance: Entrance.of({screen: entrance.screen, coord: 0xd8f8}),
        movement: 9,
      };
    }
    if (spawn) {
      free.delete(i);
      Dolphin.spawnScripts[i] = spawn;
    }
  }
  [Dolphin.channelSpawn, Dolphin.evilSpiritIslandSpawn] = free;
  Dolphin.spawnScripts[Dolphin.channelSpawn] =
      {entrance: Entrance.of({x: 0x1a8, y: 0x078}), movement: 6};
  Dolphin.spawnScripts[Dolphin.evilSpiritIslandSpawn] =
      {entrance: Entrance.of({x: 0x1a8, y: 0x078}), movement: 7};
}
