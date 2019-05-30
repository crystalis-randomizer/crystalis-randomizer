import {Neighbors, ScreenId, TileId, TilePair} from './geometry.js';
import {Condition, Magic, Terrain, Trigger, WallType, or} from './condition.js';
import {Overlay} from './overlay.js';
import {FlagSet} from '../flagset.js';
import {TileEffects} from '../rom/tileeffects.js';
import {hex} from '../rom/util.js';
import {Rom} from '../rom.js';
import {UnionFind} from '../unionfind.js';

const {} = {hex} as any; // for debugging

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

  constructor(readonly rom: Rom, flags: FlagSet, start = 0) {    
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

    for (const location of rom.locations/*.slice(0,2)*/) {
      if (!location.used) continue;
      const ext = location.extended ? 0x100 : 0;
      const locBits = location.id << 16;
      const tileset = rom.tilesets[(location.tileset & 0x7f) >> 2];
      const tileEffects = rom.tileEffects[location.tileEffects - 0xb3];

      // Add terrains
      for (let y = 0, height = location.height; y < height; y++) {
        const row = location.screens[y];
        const rowBits = locBits | (y << 12);
        for (let x = 0, width = location.width; x < width; x++) {
          const screen = rom.screens[row[x] | ext];
          const scrBits = rowBits | (x << 8);
          const flagYx = y << 4 | x;
          const flag = location.flags.find(f => f.yx === flagYx);
          const flagTerrain = flag && {enter: Condition(flag.flag)};
          const flagFlyTerrain = flag && {enter: or(Condition(flag.flag), Magic.FLIGHT)};
          for (let t = 0; t < 0xf0; t++) {
            const tid = TileId(scrBits | t);
            let tile = screen.tiles[t];
            // flag 2ef is "always on", don't even bother making it conditional.
            if (flag && flag.flag === 0x2ef && tile < 0x20) tile = tileset.alternates[tile];
            const effects = tileEffects.effects[tile] & 0x26;
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
                if (trigger.terrain) {
                  terrains.set(TileId.from(location, {x: x0 + dx, y: y0 + dy}), trigger.terrain);
                }
                if (trigger.trigger) {
                  triggers.set(TileId.from(location, {x: x0 + dx, y: y0 + dy}), trigger.trigger);
                }
              }
            }
          }
        } else if (spawn.isNpc()) {
          npcs.set(TileId.from(location, spawn), spawn.id);
          const npc = overlay.npc(spawn.id, location);
          if (npc.terrain || npc.trigger) {
            let {x, y} = spawn;
            let {x0, x1, y0, y1} = npc.hitbox || {x0: 0, y0: 0, x1: 1, y1: 1};
            for (let dx = x0; dx < x1; dx++) {
              for (let dy = y0; dy < y1; dy++) {
                terrains.set(TileId.from(location, {x: x + 16 * dx, y: y + 16 * dy}),
                             npc.terrain);
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
        exitSet.add(TilePair.of(this.tiles.find(from), this.tiles.find(to)));
      }
    }
    for (const exit of exitSet) {
//console.log(`exit: ${exit.toString(16)}`);
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
      neighbors.addExit(...TilePair.split(exit));
    }

    // const entrance = rom.locations[start].entrances[0];
    // this.addEntrance(parseCoord(start, entrance));

    const w = window as any;
    console.log(w.roots = (w.tiles = this.tiles).roots());
    console.log([...(w.neighbors = neighbors)]);

    // Summary: 1055 roots, 1724 neighbors
    // This is too much for a full graph traversal, but many can be removed???
    //   -> specifically what?

    // Add itemgets and npcs to roots
    //  - NPC will need to come from a metastructure of shuffled NPCs, maybe?
    //  --- if we move akahana out of brynmaer, need to know which item is which

  }
}


/////////////
