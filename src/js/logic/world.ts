import {Condition, Requirement} from './requirement.js';
import {Terrain} from './terrain.js';
import {TileId} from './tileid.js';
import {WallType} from './walltype.js';
import {Location} from '../rom/location.js';
import {Rom} from '../rom.js';
import {FlagSet} from '../flagset.js';
import {hex} from '../util.js';

interface Check {
  requirement: Requirement;
  check: number;
}

// Mostly dumb data type storing all the information about the world's geometry.
export class World {

  readonly terrainFactory = new Terrains(this.rom);

  readonly terrains = new Map<TileId, Terrain>();

  readonly checks = new DefaultMap<TileId, Set<Check>>(() => new Set());

  readonly allExits = new Set<TileId>();

  readonly exitSet = new Set<TilePair>();

  readonly tiles = new UnionFind<TileId>();

  readonly itemUseTriggers = new Map<number, ItemUseData>();

  readonly aliases = new Map<Flag, Flag>();

  constructor(readonly rom: Rom, readonly flagset: FlagSet) {
    // build itemUseTriggers
    for (const item of rom.items) {
      for (const use of item.itemUseData) {
        if (use.kind === 'expect') {
          this.itemUseTriggers.set(use.want, use);
        }
      }
    }
    // build aliases
    aliases.set(rom.flags.ChangeAkahana, rom.flags.Change);
    aliases.set(rom.flags.ChangeSoldier, rom.flags.Change);
    aliases.set(rom.flags.ChangeStom, rom.flags.Change);
    aliases.set(rom.flags.ChangeWoman, rom.flags.Change);
    aliases.set(rom.flags.ParalyzedKensuInDanceHall, rom.flags.Paralysis);
    aliases.set(rom.flags.ParalyzedKensuInTavern, rom.flags.Paralysis);
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
    let hitbox = Hitbox.trigger(location, spawn);

    const checks = [];
    for (const flag of trigger.flags) {
      const f = this.flag(flag);
      if (f?.logic.track) {
        checks.push(f.id);
      }
    }
    if (checks.length) this.addCheck(hitbox, requirement, checks);

    switch (trigger.message.action) {
    case 0x19:
      // push-down trigger
      if (trigger.id === 0x86 && !this.flags.assumeRabbitSkip()) {
        // bigger hitbox to not find the path through
        hitbox = Hitbox.adjust(hitbox, [0, -16], [0, 16]);
      }
      this.addTerrain(hitbox, this.terrainFactory.statue(antiRequirements));
      break;

    case 0x1d:
      // start mado 1 boss fight
      {
        const req = Requirement.meet(requirements, bossRequirements(2, 3));
        this.addCheck(hitbox, req, [this.rom.flags.Mado1.id]);
      }
      break;

    case 0x08: case 0x0b: case 0x0c: case 0x0d: case 0x0e: case 0x0f:
      // find itemgrant for trigger ID => add check
      {
        const item = this.itemGrant(trigger.id);
        if (item == null) {
          throw new Error(`missing item grant for ${trigger.id.toString(16)}`);
        }
        // is the 100 flag sufficient here?  probably?
        this.addCheck(hitbox, requirements, [0x100 | item]);
      }
      break;

    case 0x18:
      // stom fight
      {
        // Special case: warp boots glitch required if charge shots only.
        const req =
            this.flagset.chargeShotsOnly() ?
                Requirement.meet(requirements, this.rom.flags.WarpBoots) :
                requirements;
        this.addCheck(hitbox, req, [this.rom.flags.StomFightReward.id]);
      }
      break;

    case 0x1e:
      // forge crystalis
      this.addCheck(hitbox, requirements, [this.rom.flags.Crystalis.id]);
      break;

    case 0x1f:
      this.handleBoat(tile, location, requirements);
      break;

    case 0x1b:
      // portoa palace guard moves
      // treat this as a statue?  but the conditions are not super useful...
      //   - only tracked conditions matter? 9e == paralysis... except not.
      // paralyzable?  check DataTable_35045
      this.handleMovingGuard(hitbox, location, antiRequirements);
      break;
    }
  }

  processNpc(location: Location, spawn: Spawn) {
    const npc = this.rom.npcs[spawn.id];
    if (!npc || !npc.used) throw new Error(`Unknown npc: ${hex(spawn.id)}`);
    const spawnConditions = npc.spawnConditions.get(location.id) || [];

    // Special case: mt sabre guards move if you talk to them, and have no other
    // effect, so just ignore them.

    const tile = TileId.from(location, spawn);

    if ((npc.data[2] & 0x04) && !this.flagset.assumeStatueGlitch()) {
      const req = this.filterAntiRequirements(spawnConditions);
      // if spawn is always false then req needs to be open?
      if (req) this.addTerrain([tile], this.terrainFactory.statue(req));
    }

    const hitbox =
        [this.terrains.has(tile) ? tile : this.walkableNeighbor(tile)];
    if (!hitbox[0]) throw new Error(`Unreachable NPC: ${hex(npc.id)}`);

    // req is now mutable
    const [[...req]] = this.filterRequirements(spawnConditions); // single

    // Iterate over the global dialogs - do nothing if we can't pass them.
    for (const d of npc.globalDialogs) {
      const f = this.flag(~d.condition);
      if (!f?.logic.track) continue;
      req.push(f.id as Condition);
    }

    // Iterate over the appropriate local dialogs
    const locals =
        npc.localDialogs.get(location.id) ?? npc.localDialogs.get(-1) ?? [];
    for (const d of locals) {
      // Compute the condition 'r' for this message.
      const r = [...req];
      const f0 = this.flag(d.condition);
      if (f0?.logic.track) {
        r.push(f0.id as Condition);
      }
      this.processDialog(hitbox, location, npc, r, d);
      // Add any new conditions to 'req' to get beyond this message.
      const f1 = this.flag(~d.condition);
      if (f1?.logic.track) {
        req.push(f1.id as Condition);
      }
    }
  }

  processDialog(hitbox: Hitbox, location: Location, npc: Npc,
                req: readonly Condition[], dialog: LocalDialog) {
    const checks = [];
    this.addCheckFromFlags(hitbox, requirement, dialog.flags);

    switch (dialog.message.action) {
    case 0x08: case 0x0b: case 0x0c: case 0x0d: case 0x0e: case 0x0f:
      throw new Error(`Bad dialog action: ${dialog}`);

    case 0x14:
      checks.push(this.rom.flags.SlimedKensu.id);
      break;

    case 0x10:
      checks.push(this.rom.flags.AsinaInBackRoom.id);
      break;

    case 0x11:
      checks.push(0x100 | npc.data[1]);
      break;

    case 0x03:
    case 0x0a: // normally this hard-codes glowing lamp, but we extended it
      checks.push(0x100 | npc.data[0]);
      break;

    case 0x09:
      // If zebu student has an item...?  TODO - store ff if unused
      const item = npc.data[1];
      if (item !== 0xff) checks.push(0x100 | item);
      break;

    case 0x19:
      checks.push(this.rom.flags.AkahanaStoneTradein.id);
      break;

    case 0x1a:
      // TODO - can we reach this spot?  may need to move down?
      checks.push(this.rom.flags.Rage.id);
      break;

    case 0x1b:
      // Rage throwing player out...
      // But we need the anti-requirement for this.......
      //   -> add a terrain blocking an expanded hitbox somehow?
      // If we invert the dialog order so this is first then it could work.

      // Probably instead just treat c3 as a statue with condition on Rage,
      //   - add a flag for assuming skip?  ghetto rage?  ensure flier?


      // TODO - add extra dialogs for itemuse trades, extra triggers
      //      - if item traded but no reward, then re-give reward...


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

  addTerrain(hitbox: Hitbox, terrain: Terrain) {
    for (const tile of hitbox) {
      const t = this.terrains.get(tile);
      if (t == null) continue; // unreachable tiles don't need extra reqs
      this.terrains.set(tile, this.terrainFactory.meet(t, terrain));
    }
  }

  addCheck(hitbox: Hitbox, requirement: Requirement, checks: number[]) {
    if (Requirement.isClosed(requirement)) return; // do nothing if unreachable
    for (const tile of hitbox) {
      if (!this.terrains.has(tile)) continue;
      this.checks.get(tile).add({requirement, check});
    }
  }

  addCheckFromFlags(hitbox: Hitbox, requirement: Requirement, flags: number[]) {
    const checks = [];
    for (const flag of dialog.flags) {
      const f = this.flag(flag);
      if (f?.logic.track) {
        checks.push(f.id);
      }
    }
    if (checks.length) this.addCheck(hitbox, requirement, checks);
  }

  handleMovingGuard(hitbox: Hitbox, location: Location, req: Requirement) {
    // This is the 1b trigger action follow-up.  It looks for an NPC in 0d or 0e
    // and moves them over a pixel.  For the logic, it's always in a position
    // where just making the trigger square be a no-exit square is sufficient,
    // but we need to get the conditions right.  We pass in the requirements to
    // NOT trigger the trigger, and then we join in paralysis and/or statue
    // glitch if appropriate.  There could theoretically be cases where the
    // guard is paralyzable but the geometry prevents the player from actually
    // hitting them before they move, but it doesn't happen in practice.
    if (this.flagset.assumeStatueGlitch()) return;
    const extra = [];
    for (const spawn of location.spawns.slice(0, 2)) {
      if (spawn.isNpc() && this.rom.npcs[spawn.id].isParalyzable()) {
        extra.push([this.rom.flags.Paralysis.id]);
        break;
      }
    }
    this.addTerrain(hitbox, this.terrainFactory.statue([...req, ...extra]));
  }


  handleBoat(tile: TileId, location: Location, requirements: Requirement) {
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

  connect(t0: TileId, t1: TileId, req: Requirements) {
    // TODO
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

    case this.rom.locations.Crypt_Entrance.id:
      // bow of sun + moon => flag (may not need location base? just make it
      // a nonlocal check)
    }
  }

  processItemUseTrigger(location: Location, spawn: Spawn, item: Item, use: ItemUse) {
    // this should handle most trade-ins automatically?

    switch (use.message.action) {
    case 0x10: // key
      // set the current screen's flag if the conditions are met...
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
  filterRequirements(flags: number[]): Requirement.Single {
    const conds = [];
    for (const flag of flags) {
      if (flag < 0) {
        const logic = this.flag(~flag)?.logic;
        if (logic?.assumeTrue) return Requirement.CLOSED;
      } else {
        const logic = this.flag(flag)?.logic;
        if (logic?.assumeFalse) return Requirement.CLOSED;
        if (logic?.track) conds.push([flag as Condition]);
      }
    }
    return [conds];    
  }

  /** Return a Requirement for some flag not being met. */
  filterAntiRequirements(flags: number[]): Requirement.Frozen {
    const req = [];
    for (const flag of flags) {
      if (flag >= 0) {
        const logic = this.flag(~flag)?.logic;
        if (logic?.assumeFalse) return Requirement.OPEN;
      } else {
        const logic = this.flag(~flag)?.logic;
        if (logic?.assumeTrue) return Requirement.OPEN;
        if (logic?.track) req.push([~flag as Condition]);
      }
    }
    return req;
  }

  flag(flag: number): Flag|undefined {
    const f = this.rom.flags[~flag];
    return this.aliases.get(f) ?? f;
  }

}





// An interesting way to track terrain combinations is with primes.
// If we have N elements we can label each atom with a prime and
// then label arbitrary combinations with the product.  For N=1000
// the highest number is 8000, so that it contributes about 13 bits
// to the product, meaning we can store combinations of 4 safely
// without resorting to bigint.  This is inherently order-independent.
// If the rarer ones are higher, we can fit significantly more than 4.
