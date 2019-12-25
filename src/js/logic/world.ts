import {FlagSet} from '../flagset.js';
import {Rom} from '../rom.js';
import {Boss} from '../rom/bosses.js';
import {Flag} from '../rom/flags.js';
import {Item, ItemUse} from '../rom/item.js';
import {Location, Spawn} from '../rom/location.js';
import {LocalDialog, Npc} from '../rom/npc.js';
import {hex} from '../rom/util.js';
import {UnionFind} from '../unionfind.js';
import {DefaultMap} from '../util.js';
import {Hitbox} from './hitbox.js';
import {Condition, Requirement} from './requirement.js';
import {ScreenId} from './screenid.js';
import {Terrain, Terrains} from './terrain.js';
import {TileId} from './tileid.js';
import {TilePair} from './tilepair.js';
import {WallType} from './walltype.js';

const [] = [hex];

interface Check {
  requirement: Requirement;
  checks: number[];
}

// Mostly dumb data type storing all the information about the world's geometry.
export class World {

  /** Builds and caches Terrain objects. */
  readonly terrainFactory = new Terrains(this.rom);

  /** Terrains mapped by TileId. */
  readonly terrains = new Map<TileId, Terrain>();

  /** Checks mapped by TileId. */
  readonly checks = new DefaultMap<TileId, Set<Check>>(() => new Set());

  /** Flags that should be treated as direct aliases for logic. */
  readonly aliases = new Map<Flag, Flag>();

  /** Mapping from itemuse triggers to the itemuse that wants it. */
  readonly itemUses = new DefaultMap<number, [Item, ItemUse][]>(() => []);

  /** Set of all TileIds with exits. */
  readonly allExits = new Set<TileId>();

  /** Mapping from exits to entrances. */
  readonly exitSet = new Set<TilePair>();

  /**
   * Unionfind of connected components of tiles.  Note that all the
   * above properties can be built up in parallel, but the unionfind
   * cannot be started until after all terrains and exits are
   * registered, since we specifically need to *not* union certain
   * neighbors.
   */
  readonly tiles = new UnionFind<TileId>();

  constructor(readonly rom: Rom, readonly flagset: FlagSet) {
    // build itemUseTriggers
    for (const item of rom.items) {
      for (const use of item.itemUseData) {
        if (use.kind === 'expect') {
          this.itemUses.get(use.want).push([item, use]);
        } else if (use.kind === 'location') {
          this.itemUses.get(~use.want).push([item, use]);
        }
      }
    }
    // build aliases
    this.aliases.set(rom.flags.ChangeAkahana, rom.flags.Change);
    this.aliases.set(rom.flags.ChangeSoldier, rom.flags.Change);
    this.aliases.set(rom.flags.ChangeStom, rom.flags.Change);
    this.aliases.set(rom.flags.ChangeWoman, rom.flags.Change);
    this.aliases.set(rom.flags.ParalyzedKensuInDanceHall, rom.flags.Paralysis);
    this.aliases.set(rom.flags.ParalyzedKensuInTavern, rom.flags.Paralysis);
    // iterate over locations to build up information.
    for (const location of rom.locations) {
      this.processLocation(location);
    }
    this.addExtraChecks();
    // TODO - add capabilities:
    //  * flags.OpenedCrypt = and(flags.BowOfMoon, flags.BowOfSun)
    //  *

  }

  build() {
  }

  addExtraChecks() {
    const {
      locations: {
        MezameShrine,
        Oak,
      },
      flags: {
        BowOfMoon,
        BowOfSun,
        LeadingChild,
        OpenedCrypt,
        RescuedChild,
      },
    } = this.rom;
    const start = [this.entrance(MezameShrine)];
    const enterOak = [this.entrance(Oak)];
    this.addCheck(start, and(BowOfMoon, BowOfSun), [OpenedCrypt.id]);
    this.addCheck(enterOak, and(LeadingChild), [RescuedChild.id]);
  }

  wallCapability(wall: WallType): number {
    switch (wall) {
    case WallType.WIND: return this.rom.flags.BreakStone.id;
    case WallType.FIRE: return this.rom.flags.BreakIce.id;
    case WallType.WATER: return this.rom.flags.FormBridge.id;
    case WallType.THUNDER: return this.rom.flags.BreakIron.id;
    default: throw new Error(`bad wall type: ${wall}`);
    }
  }

  processLocation(location: Location) {
    if (!location.used) return;
    // Look for walls, which we need to know about later.
    this.processLocationTiles(location);
    this.processLocationSpawns(location);
    this.processLocationItemUses(location);
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
        shootingStatues.add(ScreenId.from(location, spawn));
      }
    }
    const page = location.screenPage;
    const tileset = this.rom.tileset(location.tileset);
    const tileEffects = this.rom.tileEffects[location.tileEffects - 0xb3];
    const alwaysTrue = this.rom.flags.AlwaysTrue.id;

    const getEffects = (tile: TileId) => {
      const screen =
          location.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8] | page;
      return tileEffects.effects[this.rom.screens[screen].tiles[tile & 0xff]];
    };

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
    };

    for (let y = 0, height = location.height; y < height; y++) {
      const row = location.screens[y];
      const rowId = location.id << 8 | y << 4;
      for (let x = 0, width = location.width; x < width; x++) {
        const screen = this.rom.screens[row[x] | page];
        const screenId = ScreenId(rowId | x);
        const barrier = shootingStatues.has(screenId);
        const flagYx = screenId & 0xff;
        const wall = walls.get(screenId);
        const flag =
            wall != null ?
                this.wallCapability(wall) :
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
          let terrain = makeTerrain(effects, tid, barrier);
          if (!terrain) throw new Error(`bad terrain for alternate`);
          if (tile < 0x20 && tileset.alternates[tile] !== tile &&
              flag !== alwaysTrue) {
            const alternate =
                makeTerrain(tileEffects.effects[tileset.alternates[tile]],
                                 tid, barrier);
            if (!alternate) throw new Error(`bad terrain for alternate`);
            if (flag == null) throw new Error(`missing flag`);
            terrain = this.terrainFactory.flag(terrain, flag, alternate);
          }
          if (terrain) this.terrains.set(tid, terrain);
        }
      }
    }

    // Clobber terrain with seamless exits
    for (const exit of location.exits) {
      if (exit.entrance & 0x20) {
        const tile = TileId.from(location, exit);
        this.allExits.add(tile);
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
      for (const [item, use] of this.itemUses.get(spawn.type << 8 | spawn.id)) {
        this.processItemUse([TileId.from(location, spawn)], item, use);
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
    if (checks.length) this.addCheck(hitbox, requirements, checks);

    switch (trigger.message.action) {
    case 0x19:
      // push-down trigger
      if (trigger.id === 0x86 && !this.flagset.assumeRabbitSkip()) {
        // bigger hitbox to not find the path through
        hitbox = Hitbox.adjust(hitbox, [0, -16], [0, 16]);
      } else if (trigger.id === 0xba &&
                 !this.flagset.assumeTeleportSkip() &&
                 !this.flagset.disableTeleportSkip()) {
        // copy the teleport hitbox into the other side of cordel
        hitbox = Hitbox.atLocation(hitbox,
                                   this.rom.locations.CordelPlainEast,
                                   this.rom.locations.CordelPlainWest);
      }
      this.addTerrain(hitbox, this.terrainFactory.statue(antiRequirements));
      break;

    case 0x1d:
      // start mado 1 boss fight
      {
        const req = Requirement.meet(requirements,
                                     this.bossRequirements(this.rom.bosses.Mado1));
        this.addCheck(hitbox, req, [this.rom.flags.Mado1.id]);
      }
      break;

    case 0x08: case 0x0b: case 0x0c: case 0x0d: case 0x0e: case 0x0f:
      // find itemgrant for trigger ID => add check
      this.addItemGrantChecks(hitbox, requirements, trigger.id);
      break;

    case 0x18:
      // stom fight
      {
        // Special case: warp boots glitch required if charge shots only.
        const req =
            this.flagset.chargeShotsOnly() ?
                Requirement.meet(requirements, and(this.rom.flags.WarpBoots)) :
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

    const tile = TileId.from(location, spawn);

    // NOTE: Rage has no walkable neighbors, and we need the same hitbox
    // for both the terrain and the check
    let hitbox: Hitbox =
        [this.terrains.has(tile) ? tile : this.walkableNeighbor(tile) ?? tile];
    if ((npc.data[2] & 0x04) && !this.flagset.assumeStatueGlitch()) {
      let antiReq;
      antiReq = this.filterAntiRequirements(spawnConditions);
      if (npc === this.rom.npcs.Rage) {
        // TODO - move hitbox down, change requirement?
        hitbox = Hitbox.adjust(hitbox, [2, -1], [2, 0], [2, 1], [2, 2]);
        hitbox = Hitbox.adjust(hitbox, [0, -6], [0, -2], [0, 2], [0, 6]);
        // TODO - check if this works?  the ~check spawn condition should
        // allow passing if gotten the check, which is the same as gotten
        // the correct sword.
        if (this.flagset.assumeRageSkip()) antiReq = undefined;
      }
      // if spawn is always false then req needs to be open?
      if (antiReq) this.addTerrain(hitbox, this.terrainFactory.statue(antiReq));
    }

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
      this.processDialog(hitbox, npc, r, d);
      // Add any new conditions to 'req' to get beyond this message.
      const f1 = this.flag(~d.condition);
      if (f1?.logic.track) {
        req.push(f1.id as Condition);
      }
    }
  }

  processDialog(hitbox: Hitbox, npc: Npc,
                req: readonly Condition[], dialog: LocalDialog) {
    this.addCheckFromFlags(hitbox, [req], dialog.flags);

    const checks = [];
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
      // This should actually already be handled by the statue code above?
      break;
    }

    // TODO - add extra dialogs for itemuse trades, extra triggers
    //      - if item traded but no reward, then re-give reward...
    if (checks.length) this.addCheck(hitbox, [req], checks);
  }

  processLocationItemUses(location: Location) {
    for (const [item, use] of this.itemUses.get(~location.id)) {
      this.processItemUse([this.entrance(location)], item, use);
    }
  }

  addItemGrantChecks(hitbox: Hitbox, req: Requirement, grantId: number) {
    const item = this.itemGrant(grantId);
    if (item == null) {
      throw new Error(`missing item grant for ${grantId.toString(16)}`);
    }
    // is the 100 flag sufficient here?  probably?
    this.addCheck(hitbox, req, [0x100 | item]);
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
    const check = {requirement, checks};
    for (const tile of hitbox) {
      if (!this.terrains.has(tile)) continue;
      this.checks.get(tile).add(check);
    }
  }

  addCheckFromFlags(hitbox: Hitbox, requirement: Requirement, flags: number[]) {
    const checks = [];
    for (const flag of flags) {
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
    const extra: Condition[][] = [];
    for (const spawn of location.spawns.slice(0, 2)) {
      if (spawn.isNpc() && this.rom.npcs[spawn.id].isParalyzable()) {
        extra.push([this.rom.flags.Paralysis.id as Condition]);
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
        this.connect(t0, t1, requirements);
        return;
      }
    }
  }

  connect(_t0: TileId, _t1: TileId, _req: Requirement) {
    // TODO - implement!
  }

  walkableNeighbor(t: TileId): TileId|undefined {
    if (this.isWalkable(t)) return t;
    for (let d of [-1, 1]) {
      const t1 = TileId.add(t, d, 0);
      const t2 = TileId.add(t, 0, d);
      if (this.isWalkable(t1)) return t1;
      if (this.isWalkable(t2)) return t2;
    }
    return undefined;
  }

  isWalkable(t: TileId): boolean {
    return !(this.getEffects(t) & Terrain.BITS);
  }

  ensurePassable(t: TileId): TileId {
    return this.isWalkable(t) ? t : this.walkableNeighbor(t) ?? t;
  }

  getEffects(t: TileId): number {
    const location = this.rom.locations[t >>> 16];
    const page = location.screenPage;
    const effects = this.rom.tileEffects[location.tileEffects - 0xb3].effects;
    const scr = location.screens[(t & 0xf000) >>> 12][(t & 0xf00) >>> 8] | page;
    return effects[this.rom.screens[scr].tiles[t & 0xff]];
  }

  processBoss(_location: Location, _spawn: Spawn) {
        // Bosses will clobber the entrance portion of all tiles on the screen,
        // and will also add their drop.

    // bosses.set(TileId.from(location, spawn), spawn.id);
  }

  processChest(location: Location, spawn: Spawn) {
    // Add a check for the 1xx flag.  TODO - keep track of the fact that it was
    // a chest, for item eligibility purposes.
    this.addCheck([TileId.from(location, spawn)], Requirement.OPEN,
                  [0x100 | spawn.id]);
  }

  processMonster(_location: Location, _spawn: Spawn) {
        // TODO - compute money-dropping monster vulnerabilities and add a trigger
        // for the MONEY capability dependent on any of the swords.
    // const monster = rom.objects[spawn.monsterId];
    // if (monster.goldDrop) monsters.set(TileId.from(location, spawn), monster.elements);
  }

  processItemUse(hitbox: Hitbox, item: Item, use: ItemUse) {
    // this should handle most trade-ins automatically
    hitbox = new Set([...hitbox].map(t => this.walkableNeighbor(t) ?? t));
    const req = [[(0x200 | item.id) as Condition]]; // requires the item.
    // set any flags
    this.addCheckFromFlags(hitbox, req, use.flags);
    // handle any extra actions
    switch (use.message.action) {
    case 0x10:
      // use key
      this.processKeyUse(hitbox, req);
      break;
    case 0x08: case 0x0b: case 0x0c: case 0x0d: case 0x0e: case 0x0f:
      // find itemgrant for item ID => add check
      this.addItemGrantChecks(hitbox, req, item.id);
      break;
    }
  }

  processKeyUse(hitbox: Hitbox, req: Requirement) {
    // set the current screen's flag if the conditions are met...
    // make sure there's only a single screen.
    const [screen, ...rest] = new Set([...hitbox].map(t => ScreenId.from(t)));
    if (screen == null || rest.length) throw new Error(`Expected one screen`);
    const location = this.rom.locations[screen >>> 8];
    const flag = location.flags.find(f => f.screen === (screen & 0xff));
    if (flag == null) throw new Error(`Expected flag on screen`);
    this.addCheck(hitbox, req, [flag.flag]);
  }

  itemGrant(id: number): number {
    for (let i = 0x3d6d5; this.rom.prg[i] !== 0xff; i += 2) {
      if (this.rom.prg[i] === id) return this.rom.prg[i + 1];
    }
    throw new Error(`Could not find item grant ${id.toString(16)}`);
  }

  /** Return a Requirement for all of the flags being met. */
  filterRequirements(flags: number[]): Requirement.Frozen {
    const conds = [];
    for (const flag of flags) {
      if (flag < 0) {
        const logic = this.flag(~flag)?.logic;
        if (logic?.assumeTrue) return Requirement.CLOSED;
      } else {
        const logic = this.flag(flag)?.logic;
        if (logic?.assumeFalse) return Requirement.CLOSED;
        if (logic?.track) conds.push(flag as Condition);
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

  entrance(location: Location, index = 0): TileId {
    return TileId.from(location, location.entrances[index]);
  }

  bossRequirements(_boss: Boss): Requirement {
    throw new Error(`unimplemented`);
  }
}

function and(...flags: Flag[]): Requirement.Single {
  return [flags.map((f: Flag) => f.id as Condition)];
}

function or(...flags: Flag[]): Requirement.Frozen {
  return flags.map((f: Flag) => [f.id as Condition]);
}
const [] = [or];


// An interesting way to track terrain combinations is with primes.
// If we have N elements we can label each atom with a prime and
// then label arbitrary combinations with the product.  For N=1000
// the highest number is 8000, so that it contributes about 13 bits
// to the product, meaning we can store combinations of 4 safely
// without resorting to bigint.  This is inherently order-independent.
// If the rarer ones are higher, we can fit significantly more than 4.
