import {Condition, Requirement} from './requirement.js';
import {Terrain} from './terrain.js';
import {TileId} from './tileid.js';
import {WallType} from './walltype.js';
import {Location} from '../rom/location.js';
import {Rom} from '../rom.js';

// Mostly dumb data type storing all the information about the world's geometry.
export class World {

  readonly terrainFactory = new Terrains(this.rom);

  readonly terrains = new Map<TileId, Terrain>();

  readonly checks = new DefaultMap<TileId, Set<Check>>(() => new Set());

  readonly allExits = new Set<TileId>();

  readonly exitSet = new Set<TilePair>();

  readonly tiles = new UnionFind<TileId>();

  readonly itemUseTriggers = new Map<number, ItemUseData>();

  constructor(readonly rom: Rom) {
    // build itemUseTriggers
    for (const item of rom.items) {
      for (const use of item.itemUseData) {
        if (use.kind === 'expect') {
          this.itemUseTriggers.set(use.want, use);
        }
      }
    }
  }

  wallCapability(wall: WallType) {
    switch (wall) {
    case WallType.WIND: return this.rom.flags.BreakStone;
    case WallType.FIRE: return this.rom.flags.BreakIce;
    case WallType.WATER: return this.rom.flags.FormBridge;
    case WallType.THUNDER: return this.rom.flags.BreakIron;
    default: throw new Error(`bad wall type: ${wall}`);
    }
  }

  processLocation(location: Location) {
    if (!location.used) return;
    // Look for walls, which we need to know about later.
    this.processLocationTiles(location);
    this.processLocationSpawns(location);
    this.processLocationTriggers(location); // location-triggered trades/etc
  }

  processLocationTiles(location: Location) {
    const walls = new Map<ScreenId, WallType>();
    const shootingStatues = new Set<ScreenId>();
    for (const spawn of location.spawns) {
      // Walls need to come first so we can avoid adding separate
      // requirements for every single wall - just use the type.
      if (spawn.isWall()) {
        walls.set(ScreenId.from(location, spawn), (spawn.id & 3) as WallType);
      } else if (spawn.isMonster() && spawn.id === 0x3f) { // shooting statues
        shootingStatues.add(ScreenId.from(locaction, spawn));
      }
    }
    const page = location.screenPage;
    const tileset = rom.tileset(location.tileset);
    const tileEffects = rom.tileEffects[location.tileEffects - 0xb3];
    const alwaysTrue = this.rom.flags.AlwaysTrue.id;

    const getEffects = (tile: TileId) => {
      const screen =
          location.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8] | page;
      return tileEffects[this.rom.screens[screen].tiles[tile & 0xff]];
    }

    // Returns undefined if impassable.
    const makeTerrain = (effects: number, tile: TileId, barrier: boolean) => {
      // Check for dolphin or swamp.  Currently don't support shuffling these.
      effects &= Terrain.BITS;
      if (location.id === 0x1a) effects |= Terrain.SWAMP;
      if (location.id === 0x60 || location.id === 0x68) {
        effects |= Terrain.DOLPHIN;
      }
      // NOTE: only the top half-screen in underground channel is dolphinable
      if (location.id === 0x64 && ((tile & 0xf0f0) < 0x90)) {
        effects |= Terrain.DOLPHIN;
      }
      if (barrier) effects |= Terrain.BARRIER;
      if (effects & Terrain.SLOPE) { // slope
        // Determine length of slope: short slopes are climbable.
        // 6-8 are both doable with boots
        // 0-5 is doable with no boots
        // 9 is doable with rabbit boots only (not aware of any of these...)
        // 10 is right out
        let bottom = tile;
        let height = 0;
        while (getEffects(bottom) & Terrain.SLOPE) {
          bottom = TileId.add(bottom, 1, 0);
          height++;
        }
        if (height < 6) {
          effects &= ~Terrain.SLOPE;
        } else if (height < 9) {
          effects |= Terrain.SLOPE8;
        } else if (height < 10) {
          effects |= Terrain.SLOPE9;
        }
      }
      return this.terrainFactory.tile(effects);
    }

    for (let y = 0, height = location.height; y < height; y++) {
      const row = location.screens[y];
      const rowId = location.id << 8 | y << 4;
      for (let x = 0, width = location.width; x < width; x++) {
        const screen = rom.screens[row[x] | page];
        const screenId = ScreenId(rowId | x);
        const barrier = shootingStatues.has(screenId);
        const flagYx = screenId & 0xff;
        const wall = walls.get(screenId);
        const flag =
            wall != null ?
                wallCapability(wall) :
                location.flags.find(f => f.yx === flagYx)?.flag;
        for (let t = 0; t < 0xf0; t++) {
          const tid = TileId(screenId << 8 | t);
          let tile = screen.tiles[t];
          // flag 2ef is "always on", don't even bother making it conditional.
          if (flag === alwaysTrue && tile < 0x20) {
            tile = tileset.alternates[tile];
          }
          const effects =
              location.isShop() ? 0 : tileEffects.effects[tile] & 0x26;
          let terrain = this.makeTerrain(effects, tid, barrier);
          if (tile < 0x20 && tileset.alternates[tile] != tile &&
              flag !== alwaysTrue) {
            const alternate =
                this.makeTerrain(tileEffects.effects[tileset.alternates[tile]],
                                 tid, barrier);
            terrain = this.terrainFactory.flag(terrain, alternate);
          }
          if (terrain) this.terrains.set(tid, terrain);
        }
      }
    }

    // Clobber terrain with seamless exits
    for (const exit of location.exits) {
      if (exit.entrance & 0x20) {
        const tile = TileId.from(location, exit);
        allExits.add(tile);
        const previous = this.terrains.get(tile);
        if (previous) {
          this.terrains.set(tile, this.terrainFactory.seamless(previous));
        }
      }
    }
  }

  // Basic algorithm:
  //  1. fill terrains from maps
  //  2. modify terrains based on npcs, triggers, bosses, etc
  //  2. fill allExits
  //  3. start unionfind
  //  4. fill ...?

  processLocationSpawns(location: Location) {
    for (const spawn of location.spawns) {
      if (spawn.isTrigger()) {
        this.processTrigger(location, spawn);
      } else if (spawn.isNpc()) {
        this.processNpc(location, spawn);
      } else if (spawn.isBoss()) {
        this.processBoss(location, spawn);
      } else if (spawn.isChest()) {
        this.processChest(location, spawn);
      } else if (spawn.isMonster()) {
        this.processMonster(location, spawn);
      }
      // At what point does this logic belong elsewhere?
      const use = this.itemUseTriggers.get(spawn.type << 8 | spawn.id);
      if (use != null) {
        this.processItemUseTrigger(location, spawn, use);
      }
    }
  }

  processTrigger(location: Location, spawn: Spawn) {
    // For triggers, which tiles do we mark?
    // The trigger hitbox is 2 tiles wide and 1 tile tall, but it does not
    // line up nicely to the tile grid.  Also, the player hitbox is only
    // $c wide (though it's $14 tall) so there's some slight disparity.
    // It seems like probably marking it as (x-1, y-1) .. (x, y) makes the
    // most sense, with the caveat that triggers shifted right by a half
    // tile should go from x .. x+1 instead.

    // TODO - consider checking trigger's action: $19 -> push-down message


    // TODO - pull out this.recordTriggerTerrain() and this.recordTriggerCheck()
    const trigger = this.rom.trigger(spawn.id);
    if (!trigger) throw new Error(`Missing trigger ${spawn.id.toString(16)}`);

    const requirements = this.filterRequirements(trigger.conditions);
    const antiRequirements = this.filterAntiRequirements(trigger.conditions);

    const tile = TileId.from(location, spawn);
    let hitbox = [[-16, 0], [-16, 0]];

    switch (trigger.message.action) {
    case 0x19:
      // push-down trigger
      if (trigger.id === 0x86 && !this.flags.assumeRabbitSkip()) {
        // bigger hitbox to not find the path through
        hitbox[1] = [-32, -16, 0, 16];
      }
      this.addTerrain(tile, hitbox, this.terrainFactory.statue(antiRequirements));
      break;

    case 0x1d:
      // start mado 1 boss fight
      this.addCheck(tile, hitbox, requirements, this.rom.flags.Mado1.id);
      break;

    case 0x08:
    case 0x0b:
    case 0x0c:
    case 0x0d:
    case 0x0e:
    case 0x0f:
      // find itemgrant for trigger ID => add check
      const item = this.itemGrant(trigger.id);
      if (item == null) {
        throw new Error(`missing item grant for ${trigger.id.toString(16)}`);
      }
      // is the 100 flag sufficient here?  probably?
      this.addCheck(tile, hitbox, requirements, 0x100 | item);
      break;

    case 0x18:
      // stom fight
      this.addCheck(tile, hitbox, requirements, this.rom.flags.StomFightReward.id);
      break;

    case 0x1e:
      // forge crystalis
      this.addCheck(tile, hitbox, requirements, this.rom.flags.Crystalis.id);
      break;

    case 0x1f:
      this.handleBoat(tile, location);
      break;

    case 0x1b:
      // portoa palace guard moves
      // treat this as a statue?  but the conditions are not super useful...
      //   - only tracked conditions matter? 9e == paralysis... except not.
      // paralyzable?  check DataTable_35045
      
      break;

    }


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
  }


  handleBoat(tile: TileId, location: Location) {
    // board boat - this amounts to adding a route edge from the tile
    // to the left, through an exit, and then continuing until finding land.
    const t0 = this.walkableNeighbor(tile);
    if (t0 == null) throw new Error(`Could not find walkable neighbor.`);
    const yt = (tile >> 8) & 0xf0 | (tile >> 4) & 0xf;
    const xt = (tile >> 4) & 0xf0 | tile & 0xf;
    let boatExit;
    for (const exit of location.exits) {
      if (exit.yt === yt && exit.xt < xt) boatExit = exit;
    }
    if (!boatExit) throw new Error(`Could not find boat exit`);
    // TODO - look up the entrance.
    const dest = this.rom.locations[boatExit.dest];
    if (!dest) throw new Error(`Bad destination`);
    const entrance = dest.entrances[boatExit.entrance];
    const entranceTile = TileId.from(dest, entrance);
    let t = entranceTile;
    while (true) {
      t = TileId.add(t, 0, -1);
      const t1 = this.walkableNeighbor(tile);
      if (t1 != null) {
        this.connect(this.walkableNeighbor(tile), t1, requirements);
        return;
      }
    }
  }

  walkableNeighbor(t: TileId): TileId|undefined {
    for (let d of [-1, 1]) {
      const t1 = TileId.add(t, d, 0);
      const t2 = TileId.add(t, 0, d);
      if (!(this.getEffects(t1) & Terrain.BITS)) return t1;
      if (!(this.getEffects(t2) & Terrain.BITS)) return t2;
    }
    return undefined;
  }

  processNpc(location: Location, spawn: Spawn) {
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
  }

  processBoss(location: Location, spawn: Spawn) {
        // Bosses will clobber the entrance portion of all tiles on the screen,
        // and will also add their drop.
        bosses.set(TileId.from(location, spawn), spawn.id);
  }

  processChest(location: Location, spawn: Spawn) {
        checks.get(TileId.from(location, spawn)).add(Check.chest(spawn.id));
  }

  processMonster(location: Location, spawn: Spawn) {
        // TODO - compute money-dropping monster vulnerabilities and add a trigger
        // for the MONEY capability dependent on any of the swords.
        const monster = rom.objects[spawn.monsterId];
        if (monster.goldDrop) monsters.set(TileId.from(location, spawn), monster.elements);
  }



  processLocationTriggers(location: Location) {
    switch (location.id) {
    case this.rom.locations.Oak.id:
      // add check for child
    case this.rom.locations.Windmill.id:
      // add check for windmill key usage?
      // need to know about ItemUse data?!?
      //   --> don't even need special case???

    case this.rom.locations.Crypt_Entrance.id:
      // bow of sun + moon => flag (may not need location base? just make it
      // a nonlocal check)
    }
  }

  processItemUseTrigger(location: Location, spawn: Spawn, item: Item, use: ItemUse) {
    // this should handle most trade-ins automatically?

    switch (use.message.action) {
    case 0x0a:
      // calm sea
    case 0x10:
      // set the current screen flag if the conditions are met...
    case 0x08:
    case 0x0b:
    case 0x0c:
    case 0x0d:
    case 0x0e:
    case 0x0f:
      // find itemgrant for item ID => add check
    }

  }

  itemGrant(id: number): number {
    for (let i = 0x3d6d5; this.rom.prg[i] !== 0xff; i += 2) {
      if (this.rom.prg[i] === id) return this.rom.prg[i + 1];
    }
    throw new Error(`Could not find item grant ${i.toString(16)}`);
  }

  /** Return a Requirement for all of the flags being met. */
  filterRequirements(flags: number[]): Requirement.Frozen {
    
  }

  /** Return a Requirement for all of the flags not being met. */
  filterAntiRequirements(flags: number[]): Requirement.Frozen {
    const req = [];
    for (const flag of flags) {
      if (flag >= 0) continue;
      const f = this.rom.flags[~flag];
      if (f?.logic.track) {
        req.push([~flag as Condition]);
      }
    }
    return req;
  }

}


// An interesting way to track terrain combinations is with primes.
// If we have N elements we can label each atom with a prime and
// then label arbitrary combinations with the product.  For N=1000
// the highest number is 8000, so that it contributes about 13 bits
// to the product, meaning we can store combinations of 4 safely
// without resorting to bigint.  This is inherently order-independent.
// If the rarer ones are higher, we can fit significantly more than 4.
