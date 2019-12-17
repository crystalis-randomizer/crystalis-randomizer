import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Boss, Check, Capability, Condition, Event, Item, Magic,
        MutableRequirement, Neighbors, ScreenId, Slot, Terrain,
        TileId, TilePair, WallType, meet, memoize, memoize2
       } from './condition.js';

export class Graph {

  private readonly terrains = new Map<TileId, Terrain>();
  private readonly walls = new Map<ScreenId, WallType>();

  constructor(readonly rom: Rom,
              readonly flagset: FlagSet,
              readonly tracker = false) {
  }

  readLocation(location: Location) {
    if (!location.used) continue;
    const ext = location.screenPage;
    const tileset = this.rom.tileset(location.tileset);
    const tileEffects = this.rom.tileEffects[location.tileEffects - 0xb3];
    this.recordWalls(location);

    // Add terrains
    for (let y = 0, height = location.height; y < height; y++) {
      const row = location.screens[y];
      const rowId = location.id << 8 | y << 4;
      for (let x = 0, width = location.width; x < width; x++) {
        this.recordScreen(location, y, x, ScreenId(rowId | x), ext | row[x]);
      }
    }

    // Clobber terrain with seamless exits
    for (const exit of location.exits) {
      if (exit.entrance & 0x20) {
        const tile = TileId.from(location, exit);
        allExits.add(tile);
        const previous = terrains.get(tile);
        if (previous) terrains.set(tile, Terrain.seamless(previous));
      }
    }

    // Find "terrain triggers" that prevent movement one way or another
    function meetTerrain(tile: TileId, terrain: Terrain): void {
      const previous = terrains.get(tile);
      // if tile is impossible to reach, don't bother.
      if (!previous) return;
      terrains.set(tile, Terrain.meet(previous, terrain));
    }
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
        if (trigger.terrain || trigger.check) {
          let {x: x0, y: y0} = spawn;
          x0 += 8;
          for (const loc of [location, ...(trigger.extraLocations || [])]) {
            for (const dx of trigger.dx || [-16, 0]) {
              for (const dy of [-16, 0]) {
                const x = x0 + dx;
                const y = y0 + dy;
                const tile = TileId.from(loc, {x, y});
                if (trigger.terrain) meetTerrain(tile, trigger.terrain);
                for (const check of trigger.check || []) {
                  checks.get(tile).add(check);
                }
              }
            }
          }
        }
      } else if (spawn.isNpc()) {
        npcs.set(TileId.from(location, spawn), spawn.id);
        const npc = overlay.npc(spawn.id, location);
        if (npc.terrain || npc.check) {
          let {x: xs, y: ys} = spawn;
          let {x0, x1, y0, y1} = npc.hitbox || {x0: 0, y0: 0, x1: 1, y1: 1};
          for (let dx = x0; dx < x1; dx++) {
            for (let dy = y0; dy < y1; dy++) {
              const x = xs + 16 * dx;
              const y = ys + 16 * dy;
              const tile = TileId.from(location, {x, y});
              if (npc.terrain) meetTerrain(tile, npc.terrain);
              for (const check of npc.check || []) {
                checks.get(tile).add(check);
              }
            }
          }
        }
      } else if (spawn.isBoss()) {
        // Bosses will clobber the entrance portion of all tiles on the screen,
        // and will also add their drop.
        bosses.set(TileId.from(location, spawn), spawn.id);
      } else if (spawn.isChest()) {
        checks.get(TileId.from(location, spawn)).add(Check.chest(spawn.id));
      } else if (spawn.isMonster()) {
        // TODO - compute money-dropping monster vulnerabilities and add a trigger
        // for the MONEY capability dependent on any of the swords.
        const monster = rom.objects[spawn.monsterId];
        if (monster.goldDrop) monsters.set(TileId.from(location, spawn), monster.elements);
      }
    }
  }

  recordWalls(location: Location) {
    // Find a few spawns early
    for (const spawn of location.spawns) {
      // Walls need to come first so we can avoid adding separate
      // requirements for every single wall - just use the type.
      if (spawn.isWall()) {
        this.walls.set(ScreenId.from(location, spawn),
                       (spawn.id & 3) as WallType);
      }
    }
  }

  recordScreen(location: Location,
               y: number,
               x: number,
               screenId: ScreenId,
               screenIndex: number) {
    const screen = rom.screens[screenIndex];
    const flagYx = screenId & 0xff;
    const wall = this.walls.get(screenId);
    const flag = wall != null ? this.wallCapability(wall) :
                                location.flags.find(f => f.yx === flagYx);
    const withFlagMemoized = memoize2((t1: Terrain, t2: Terrain) => {
      if (!flag) throw new Error(`flag expected`);
      t2 = {...t2, enter: meet(t2.enter || [[]], [[flag.flag]])};
      return Terrain.join(t1, t2);
    });
    function withFlag(t1: Terrain | undefined, t2: Terrain | undefined) {
      if (!flag) throw new Error(`flag expected`);
      if (!t2) return t1;
      if (!t1) return Terrain.meet({enter: Condition(flag.flag)}, t2);
      return withFlagMemoized(t1, t2);
    };
    const flagLogic = flag && this.rom.flags[flag.flag].logic || {};
    const flagTrue = flagLogic.assumeTrue;
    const flagTracked = flagLogic.track && !flagLogic.assumeTrue;

    for (let t = 0; t < 0xf0; t++) {
      const tid = TileId(screenId << 8 | t);
      let tile = screen.tiles[t];
      // flag 2ef is "always on", don't even bother making it conditional.
      if (flagTrue && tile < 0x20) tile = tileset.alternates[tile];
      const effects = ext ? 0 : tileEffects.effects[tile] & 0x26;
      let terrain = overlay.makeTerrain(effects, tid);
      if (tile < 0x20 && tileset.alternates[tile] != tile && flagTracked) {
        const alternate =
            overlay.makeTerrain(tileEffects.effects[tileset.alternates[tile]],
                                tid);
        terrain = withFlag(terrain, alternate);
      }
      if (terrain) this.terrains.set(tid, terrain);
    }
  }

  readTiles() {


  }

  // OVERLAY

  makeTerrain(effects: number, tile: TileId): Terrain | undefined {
    // Check for dolphin or swamp.  Currently don't support shuffling these.
    const loc = tile >>> 16;
    effects &= 0x26;
    if (loc === 0x1a) effects |= 0x08;
    if (loc === 0x60 || loc === 0x68) effects |= 0x10;
    // NOTE: only the top half-screen in underground channel is dolphinable
    if (loc === 0x64 && ((tile & 0xf0f0) < 0x90)) effects |= 0x10;
    if (this.shootingStatues.has(ScreenId.fromTile(tile))) effects |= 0x01;
    if (effects & 0x20) { // slope
      // Determine length of slope: short slopes are climbable.
      //   - 20 indicates flight is required to go up
      //   - 40 indicates rabbit boots can work as well
      //   - 80 indicates speed boots can work as well
      // 0-5 is doable with no boots        => 00
      // 6-8 are doable with either boots   => e0
      // 9 is doable with rabbit boots only => 60
      // 10 is flight only                  => 20
      const height = this.measureSlope(tile);
      if (height < 6) {
        effects &= ~0x20; // walkable
      } else if (height < 9) {
        effects |= 0xc0; // indicate speed or rabbit boots
      } else if (height < 10) {
        effects |= 0x40; // indicate rabbit boots only
      }
    }
    return TERRAINS[effects];

 }



  // Utility
  measureSlope(tile: TileId): number {
    const getEffects = (tile: TileId): number => {
      const l = this.rom.locations[tile >>> 16];
      const screen = l.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8];
      return this.rom.tileEffects[l.tileEffects - 0xb3]
          .effects[this.rom.screens[screen].tiles[tile & 0xff]];
    };
    let bottom = tile;
    let height = -1; // double-count initial tile.
    while (getEffects(bottom) & 0x20) {
      bottom = TileId.add(bottom, 1, 0);
      height++;
    }
    let top = tile;
    while (getEffects(top) & 0x20) {
      top = TileId.add(top, -1, 0);
      height++;
    }
    return height;
  }
}
