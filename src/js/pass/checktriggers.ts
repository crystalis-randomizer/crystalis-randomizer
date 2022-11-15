import { Rom } from '../rom';

/** Checks that there are no triggers on top of each other. */
export function checkTriggers(rom: Rom) {
  for (const loc of rom.locations) {
    const triggers = new Set<number>();
    for (const spawn of loc.spawns) {
      if (!spawn.isTrigger()) continue;
      if (triggers.has(spawn.coord)) {
        throw new Error(`Overlapping triggers on ${loc} at ${
                         spawn.coord.toString(16)}`);
      }
    }
  }
}
