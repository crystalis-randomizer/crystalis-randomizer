import {Neighbors, ScreenId, TileId, TilePair} from './geometry.js';
import {Condition, Magic, Terrain, Trigger, WallType, or} from './condition.js';
import {LocationList, LocationListBuilder} from './locationlist.js';
import {Overlay} from './overlay.js';
import {FlagSet} from '../flagset.js';
import {TileEffects} from '../rom/tileeffects.js';
import {hex} from '../rom/util.js';
import {Rom} from '../rom.js';
import {UnionFind} from '../unionfind.js';

const {} = {hex, LocationList} as any; // for debugging

// A tile is a 24-bit number:
//   <loc><ys><xs><yt><xt>
// We do a giant flood-fill of the entire game, starting at $000055 or whatever.
// Filling is a union-find, so we start by assigning each element itself, but
// when we find a neighbor, we join them.

export class World {

  // All tiles unioned by same reachability.
  private readonly tiles = new UnionFind<TileId>();

  // Exits between groups of different reachability.
  // Optional third element is list of requirements to use the exit.
  // private readonly exits = new Array<[number, number, number[][]?]>();

  // Blocks for any given tile group.
  // private readonly blocks = new Array<[number, number[][]]>();

  constructor(readonly rom: Rom, flags = new FlagSet('@FullShuffle'), start = 0) {    
    // 1. start with entrance 0 at the start location, add it to the tiles and queue.
    // 2. for tile T in the queue
    //    - for each passable neighbor N of T:
    //      - if N has the same passage as T, union them
    //      - if N has different passage, add an exit from T to N
    //      - if N is not yet seen, add it to the queue
    // passage can be one of:
    //  - open
    //  - blocked(item/trigger - both are just numbers...)
    //  - one-way 

    // Start by getting a full map of all terrains and triggers
    const overlay = new Overlay(rom, flags);
    const terrains = new Map<TileId, Terrain>();
    const walls = new Map<ScreenId, WallType>();
    const bosses = new Map<ScreenId, number>();
    const npcs = new Map<TileId, number>();
    const triggers = new Map<TileId, Trigger[]>();
    const monsters = new Map<TileId, number>(); // elemental immunities

    for (const location of rom.locations/*.slice(0,2)*/) {
      if (!location.used) continue;
      const ext = location.extended ? 0x100 : 0;
      const tileset = rom.tilesets[(location.tileset & 0x7f) >> 2];
      const tileEffects = rom.tileEffects[location.tileEffects - 0xb3];

      // Add terrains
      for (let y = 0, height = location.height; y < height; y++) {
        const row = location.screens[y];
        const rowId = location.id << 8 | y << 4;
        for (let x = 0, width = location.width; x < width; x++) {
          const screen = rom.screens[row[x] | ext];
          const screenId = ScreenId(rowId | x);
          const flagYx = screenId & 0xff;
          const wall = walls.get(screenId);
          const flag = wall != null ? overlay.wallCapability(wall) :
                                      location.flags.find(f => f.yx === flagYx);
          const flagTerrain = flag && {enter: Condition(flag.flag)};
          const flagFlyTerrain = flag && {enter: or(Condition(flag.flag), Magic.FLIGHT)};
          for (let t = 0; t < 0xf0; t++) {
            const tid = TileId(screenId << 8 | t);
            let tile = screen.tiles[t];
            // flag 2ef is "always on", don't even bother making it conditional.
            if (flag && flag.flag === 0x2ef && tile < 0x20) tile = tileset.alternates[tile];
            const effects = ext ? 0 : tileEffects.effects[tile] & 0x26;
            let terrain: Terrain | undefined = Terrain.OPEN;
            if (effects & TileEffects.SLOPE) {
              terrain = effects & TileEffects.NO_WALK ? Terrain.WATERFALL : Terrain.SLOPE;
            } else if (tile < 0x20 && tileset.alternates[tile] !== tile && flagTerrain &&
                       !(tileEffects.effects[tileset.alternates[tile]] & TileEffects.NO_WALK)) {
              terrain = effects & TileEffects.IMPASSIBLE ? flagTerrain : flagFlyTerrain;
            } else if (effects & TileEffects.IMPASSIBLE) {
              terrain = undefined;
            } else if (effects & TileEffects.NO_WALK) {
              terrain = Terrain.FLY;
            }
            if (terrain) terrains.set(tid, terrain);
          }          
        }
      }

      // Clobber terrain with seamless exits
      for (const exit of location.exits) {
        if (exit.entrance & 0x20) {
          terrains.set(TileId.from(location, exit), Terrain.SEAMLESS);
        }
      }

      // Find "terrain triggers" that prevent movement one way or another
      for (const spawn of location.spawns) {
        if (spawn.isTrigger()) {
          // For triggers, which tiles do we mark?
          // The trigger hitbox is 2 tiles wide and 1 tile tall, but it does not
          // line up nicely to the tile grid.  Also, the player hitbox is only
          // $c wide (though it's $14 tall) so there's some slight disparity.
          // It seems like probably marking it as (x-1, y-1) .. (x, y) makes the
          // most sense, with the caveat that triggers shifted right by a half
          // tile should go from x .. x+1 instead.
          const trigger = overlay.trigger(spawn.id);
          // TODO - consider checking trigger's action: $19 -> push-down message
          if (trigger.terrain || trigger.trigger) {
            let {x: x0, y: y0} = spawn;
            x0 += 8;
            for (const dx of [-16, 0]) {
              for (const dy of [-16, 0]) {
                const x = x0 + dx;
                const y = y0 + dy;
                const tile = TileId.from(location, {x, y});
                if (trigger.terrain) terrains.set(tile, trigger.terrain);
                if (trigger.trigger) triggers.set(tile, trigger.trigger);
              }
            }
          }
        } else if (spawn.isNpc()) {
          npcs.set(TileId.from(location, spawn), spawn.id);
          const npc = overlay.npc(spawn.id, location);
          if (npc.terrain || npc.trigger) {
            let {x: xs, y: ys} = spawn;
            let {x0, x1, y0, y1} = npc.hitbox || {x0: 0, y0: 0, x1: 1, y1: 1};
            for (let dx = x0; dx < x1; dx++) {
              for (let dy = y0; dy < y1; dy++) {
                const x = xs + 16 * dx;
                const y = ys + 16 * dy;
                const tile = TileId.from(location, {x, y});
                if (npc.terrain) terrains.set(tile, npc.terrain);
                if (npc.trigger) triggers.set(tile, npc.trigger);
              }
            }
          }
        } else if (spawn.isBoss()) {
          // Bosses will clobber the entrance portion of all tiles on the screen,
          // and will also add their drop.
          bosses.set(ScreenId.from(location, spawn), spawn.id);
        } else if (spawn.isWall()) {
          walls.set(ScreenId.from(location, spawn), spawn.id as WallType);
        } else if (spawn.isChest()) {
          triggers.set(TileId.from(location, spawn), Trigger.chest(spawn.id));
        } else if (spawn.isMonster()) {
          // TODO - compute money-dropping monster vulnerabilities and add a trigger
          // for the MONEY capability dependent on any of the swords.
          const monster = rom.objects[spawn.monsterId];
          if (monster.goldDrop) monsters.set(TileId.from(location, spawn), monster.elements);
        }
      }
    }

    // let s = 1;
    // const weak = new WeakMap<object, number>();
    // function uid(x: unknown): number {
    //   if (typeof x !== 'object' || !x) return -1;
    //   if (!weak.has(x)) weak.set(x, s++);
    //   return weak.get(x) || -1;
    // }

    // At this point we've got a full mapping of all terrains per location.
    // Now we do a giant unionfind and establish connections between same areas.
    for (const [tile, terrain] of terrains) {
      const x1 = TileId.add(tile, 0, 1);
      if (terrains.get(x1) === terrain) this.tiles.union([tile, x1]);
      const y1 = TileId.add(tile, 1, 0);
      if (terrains.get(y1) === terrain) this.tiles.union([tile, y1]);
      //console.log(`${hex(tile)}: ${uid(terrain)}`);
      //console.log(terrain);
      //console.log(` +x: ${hex(x1)}: ${uid(terrains.get(x1))}`);
      //console.log(` +y: ${hex(y1)}: ${uid(terrains.get(y1))}`);
    }

    // Add exits to a map.  We do this *after* the initial unionfind so that
    // two-way exits can be unioned easily.
    const exitSet = new Set<TilePair>();
    for (const location of rom.locations/*.slice(0,2)*/) {
      if (!location.used) continue;
      for (const exit of location.exits) {
        const {dest, entrance} = exit;
        const from = TileId.from(location, exit);
        // Handle seamless exits
        const to = entrance & 0x20 ?
            TileId(from & 0xffff | (dest << 16)) :
            TileId.from({id: dest} as any, rom.locations[dest].entrances[entrance]);
        // NOTE: we could skip adding exits if the tiles are not known
        exitSet.add(TilePair.of(this.tiles.find(from), this.tiles.find(to)));
      }
    }
    for (const exit of exitSet) {
      const [from, to] = TilePair.split(exit);
      if (terrains.get(from) !== terrains.get(to)) continue;
      const reverse = TilePair.of(to, from);
      if (exitSet.has(reverse)) {
        this.tiles.union([from, to]);
        exitSet.delete(exit);
        exitSet.delete(reverse);
      }
    }

    // Now look for all different-terrain neighbors and track connections.
    const neighbors = new Neighbors(this.tiles);
    for (const [tile, terrain] of terrains) {
      const x1 = TileId.add(tile, 0, 1);
      const tx1 = terrains.get(x1);
      if (tx1 && tx1 !== terrain) neighbors.addAdjacent(tile, x1, false);
      const y1 = TileId.add(tile, 1, 0);
      const ty1 = terrains.get(y1);
      if (ty1 && ty1 !== terrain) neighbors.addAdjacent(tile, y1, true);
    }

    // Also add all the remaining exits.  We decompose and recompose them to
    // take advantage of any new unions from the previous exit step.
    for (const exit of exitSet) {
      const [from, to] = TilePair.split(exit);
      if (!terrains.has(from) || !terrains.has(to)) continue;
      neighbors.addExit(from, to);
    }

    // TODO - hardcode some exits
    //  - the transition from $51 to $60 is impassible on both sides:
    //    add a conditional exit from the boat tile to the beach (both ways)
    //  - some transitions in the tower are on top of impassible-looking tiles

    const builder = new LocationListBuilder(terrains);
    const startLoc = rom.locations[start];
    const startTile = this.tiles.find(TileId.from(startLoc, startLoc.entrances[0]));
    builder.routes.addRoute(startTile, []);
    for (const {from, to, south} of neighbors) {
      builder.addEdge(from, to, south);
    }

    // Build up a graph?!?
    // Will need to map to smaller numbers?
    // Can we compress lazily?
    //  - everything we see as a requirement goes into one list/map
    //  - everything we see as a "get" goes into another
    //  - filling maps between them
    // start at entrance, build full requirements for each place
    // follow exits:
    //  - for each exit, update requirements, queue recheck if changed
    //  - we could do a less-thorough version:
    //     - start at entrance, add (open) requirement
    //     - queue all exits, ignoring any already seen
    //       keep track of which locations had changed reqs
    //     - once queue flushes, replace queue with changed
    //     - repeat until changed is empty at end of queue

    // For monsters - figure out which swords lead to money
          // if (!(elements & 0x1)) moneySwords.add(0);
          // if (!(elements & 0x2)) moneySwords.add(1);
          // if (!(elements & 0x4)) moneySwords.add(2);
          // if (!(elements & 0x8)) moneySwords.add(3);

    // const entrance = rom.locations[start].entrances[0];
    // this.addEntrance(parseCoord(start, entrance));

    const w = window as any;
    console.log(w.roots = (w.tiles = this.tiles).roots());
    console.log([...(w.neighbors = neighbors)]);
    console.log(w.ll = builder);

    // Summary: 1055 roots, 1724 neighbors
    // This is too much for a full graph traversal, but many can be removed???
    //   -> specifically what?

    // Add itemgets and npcs to roots
    //  - NPC will need to come from a metastructure of shuffled NPCs, maybe?
    //  --- if we move akahana out of brynmaer, need to know which item is which

  }
}


/////////////
