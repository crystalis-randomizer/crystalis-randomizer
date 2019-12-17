# Overview

The logic package contains the data structures and algorithms
necessary to understand the structure of the ROM, construct a world
graph/location list, and randomly distribute items across the various
checks.

The following key assumptions are made:
 1. No time dependence: if a location is reachable or an item is
    usable at any one point in time, it is assumed to be available
    forever thereafter.  This makes consumable progression items
    (e.g. 1-time-use keys) infeasible to handle.
 2. All state is represented with numeric flags, including dialog and
    other events, checks, and items.  Some composite state is tracked
    with pseudo flags that do not correspond to actual flags in the
    game.
 3. The geometry of the world can be fully understood by the flag
    state.  The connectivity graph between all possible locations
    (down to the tile level) is determined entirely by flags.
 4. All checks are fully represented by a location and a set of flag
    requirements.  The check is available only if (1) the location is
    reachable, and (2) the flag requirements are met.

# Types

We define a number of simple types to ease bookkeeping:
 * `TileId` - a hex number representing the unique ID of a tile in the
   world.  The format is `LLYXyx` where each letter represents a 4-bit
   nibble, `LL` is the 8-bit location id, `YX` is the position of the
   screen on the map, and `yx` is the position of the tile within the
   screen (NOTE: this maxes at `$ef` since there are only 15 rows per
   screen, not 16; we have special handling in the `TileId` namespace
   to account for this mathematical oddity.
 * `ScreenId` - a hex number representing the upper 16 bits of
   `TileId`: `LLXY`.  The sub-screen tile is irrelevant.
 * `TilePair` - a 48-bit pair of `TileId`s.  Bitwise arithmetic does
   not work on this type since it's past 32 bits.
 * `Condition` - a number representing a flag or pseudo flag.
 * `Requirement` - a DNF expression on `Condition`s, represented as an
   array of arrays.
 * `MutableRequirement` - a complex data satructure tracking a bit
   more information about the subrequirements, heplful for efficiency.
 * `LabeledRoute` - a `TileId` coupled with a single conjunction of
   `Condition`s required to reach that tile.  `label` an `depsLabel`
   track strings that can be used as map keys to store the route.
 * `Terrain` - information about a tile or group of tiles.  Contains
   requirements for entry and exit of the tile (in various directions).
 * `Check` - available checks, with requirements, for a given tile.

# Data Structures

The fully-parsed information is stored in some higher order data structures.

## Graph

The graph stores ...?



# Fields

## World.Builder

 * `overlay: Overlay`
 * `terrains: TileId => Terrain`
 * `walls: ScreenId => WallType`
 * `bosses: TileId => number`
 * `npcs: TileId => number` - unused
 * `checks: TileId => Set<Check>`
 * `monsters: TileId => number` - maps to elemental weaknesses, for gold - unused
 * `allExits: Set<TileId>`
 * `tiles: UnionFind<TileId>`
 * `exitSet: Set<TilePair>`
 * `neighbors: Neighbors`
 * `routes: Routes`
 * `reqs: Slot => MutableRequirement`

Basic idea:
 * dumb data structure for just the world map
 * record tiles (with effects), exits, etc on it
 * record actual blocks (terrain) and checks
    - blocks are ultimately just a number?
    - cached, don't need to dedupe uniil later.
    - combine numbers into unique string for CNF?
    - possibly memoize it?
    - can we build a better Requirements class that has richer
      structure?  Maybe add the "meetWith" weak map directly
      there?  Passing through doesn't seem quite right since
      it will repeat calculations a little too much.
 * order:
    1. build up full map with no NPCs/triggers
    2. add NPCs/triggers/checks - method to "add terrain"
       to an area of tiles.  Checks may need to be added
       slightly more broadly in case actual tile is
       unreachable (or less reachable)?
    3. then do unionfind after all this...


## Neighbors

A singleton in `World.Builder`.

 * `south: Set<TilePair>`
 * `other: Set<TilePair>`

Uses the following from `World.Builder`:

 * `allExits: Set<TileId>`
 * `tiles: UnionFind<TileId>`


## Routes

A singleton in `World.Builder`.

 * `routes: TileId => MutableRequirements`
 * `edges: TileId => (string => LabeledRoute)`


