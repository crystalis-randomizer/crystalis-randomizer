import {Area} from '../spoiler/area';
import {die} from '../assert';
import {FlagSet} from '../flagset';
import {Random} from '../random';
import {Rom} from '../rom';
import {Boss} from '../rom/bosses';
import {Flag, Logic} from '../rom/flags';
import {Item, ItemUse} from '../rom/item';
import {Location, Spawn} from '../rom/location';
import {LocalDialog, Npc} from '../rom/npc';
import {ShopType} from '../rom/shop';
import {hex, seq} from '../rom/util';
import {UnionFind} from '../unionfind';
import {DefaultMap, LabeledSet, iters, spread} from '../util';
import {Dir} from './dir';
import {ItemInfo, LocationList, SlotInfo} from './graph';
import {Hitbox} from './hitbox';
import {Condition, Requirement, Route} from './requirement';
import {ScreenId} from './screenid';
import {Terrain, Terrains} from './terrain';
import {TileId} from './tileid';
import {TilePair} from './tilepair';
import {WallType} from './walltype';
import { Monster } from '../rom/monster';

const [] = [hex];

interface Check {
  requirement: Requirement;
  checks: number[];
}

// Basic algorithm:
//  1. fill terrains from maps
//  2. modify terrains based on npcs, triggers, bosses, etc
//  2. fill allExits
//  3. start unionfind
//  4. fill ...?

/** Stores all the relevant information about the world's logic. */
export class World {

  /** Builds and caches Terrain objects. */
  readonly terrainFactory = new Terrains(this.rom);

  /** Terrains mapped by TileId. */
  readonly terrains = new Map<TileId, Terrain>();

  /** Checks mapped by TileId. */
  readonly checks = new DefaultMap<TileId, Set<Check>>(() => new Set());

  /** Slot info, built up as we discover slots. */
  readonly slots = new Map<number, SlotInfo>();
  /** Item info, built up as we discover slots. */
  readonly items = new Map<number, ItemInfo>();

  /** Flags that should be treated as direct aliases for logic. */
  readonly aliases: Map<Flag, Flag>;

  /** Mapping from itemuse triggers to the itemuse that wants it. */
  readonly itemUses = new DefaultMap<number, [Item, ItemUse][]>(() => []);

  /** Raw mapping of exits, without canonicalizing. */
  readonly exits = new Map<TileId, TileId>();

  /** Mapping from exits to entrances.  TilePair is canonicalized. */
  readonly exitSet = new Set<TilePair>();

  /**
   * Set of TileIds with seamless exits.  This is used to ensure the
   * logic understands that the player can't walk across an exit tile
   * without changing locations (primarily for disabling teleport
   * skip).
   */
  readonly seamlessExits = new Set<TileId>();

  /**
   * Unionfind of connected components of tiles.  Note that all the
   * above properties can be built up in parallel, but the unionfind
   * cannot be started until after all terrains and exits are
   * registered, since we specifically need to *not* union certain
   * neighbors.
   */
  readonly tiles = new UnionFind<TileId>();

  /**
   * Map of TilePairs of canonical unionfind representative TileIds to
   * a bitset of neighbor directions.  We only need to worry about
   * representative elements because all TileIds have the same terrain.
   * We will add a route for each direction with unique requirements.
   */
  readonly neighbors = new DefaultMap<TilePair, number>(() => 0);

  /** Requirement builder for reaching each canonical TileId. */
  readonly routes =
      new DefaultMap<TileId, Requirement.Builder>(
          () => new Requirement.Builder());

  /** Routes originating from each canonical tile. */
  readonly routeEdges =
      new DefaultMap<TileId, LabeledSet<Route>>(() => new LabeledSet());

  /** Location list: this is the result of combining routes with checks. */
  readonly requirementMap =
      new DefaultMap<Condition, Requirement.Builder>(
          (c: Condition) => new Requirement.Builder(c));

  /** Location with a north exit to Lime Tree Lake (i.e. Rage). */
  private limeTreeEntranceLocation = -1;

  private chestRequirement: Requirement = Requirement.OPEN;

  constructor(readonly rom: Rom, readonly flagset: FlagSet,
              readonly tracker = false) {
    // Set up some initial state
    if (flagset.alwaysMimics()) {
      const swords = [rom.flags.SwordOfWind, rom.flags.SwordOfFire, rom.flags.SwordOfWater, rom.flags.SwordOfThunder];
      const mimicSwords = swords.filter((_, i) => rom.objects.mimic.elements & (1 << i));
      this.chestRequirement = or(...mimicSwords)
    }
    // Build itemUses (e.g. windmill key inside windmill, bow of sun/moon?)
    for (const item of rom.items) {
      for (const use of item.itemUseData) {
        if (use.kind === 'expect') {
          this.itemUses.get(use.want).push([item, use]);
        } else if (use.kind === 'location') {
          this.itemUses.get(~use.want).push([item, use]);
        }
      }
    }
    // Build aliases
    this.aliases = new Map([
      [rom.flags.ChangeAkahana, rom.flags.Change],
      [rom.flags.ChangeSoldier, rom.flags.Change],
      [rom.flags.ChangeStom, rom.flags.Change],
      [rom.flags.ChangeWoman, rom.flags.Change],
      [rom.flags.ParalyzedKensuInDanceHall, rom.flags.Paralysis],
      [rom.flags.ParalyzedKensuInTavern, rom.flags.Paralysis],
    ]);

    // If trigger skip is on, seamless exits can be crossed!
    if (flagset.assumeTriggerGlitch()) {
      // NOTE: this is a terrible hack, but it efficiently prevents
      // adding tiles to the set, without checking the flag every time.
      this.seamlessExits.add = () => this.seamlessExits;
    }

    // Iterate over locations to build up info about tiles, terrains, checks.
    for (const location of rom.locations) {
      this.processLocation(location);
    }
    this.addExtraChecks();

    // Build up the UnionFind and the exits and neighbors structures.
    this.unionNeighbors();
    this.recordExits();
    this.buildNeighbors();

    // Build the routes/edges.
    this.addAllRoutes();

    // Build the location list.
    this.consolidateChecks();
    this.buildRequirementMap();
  }

  /** Adds checks that are not detectable from data tables. */
  addExtraChecks() {
    const {
      locations: {
        Leaf_ToolShop,
        MezameShrine,
        Oak,
        Shyron_ToolShop,
      },
      flags: {
        AbleToRideDolphin,
        BallOfFire, BallOfThunder, BallOfWater, BallOfWind,
        Barrier, BlizzardBracelet, BowOfMoon, BowOfSun,
        BreakStone, BreakIce, BreakIron,
        BrokenStatue, BuyHealing, BuyWarp,
        ClimbWaterfall, ClimbSlope8, ClimbSlope9, ClimbSlope10,
        CrossPain, CurrentlyRidingDolphin,
        Flight, FlameBracelet, FormBridge,
        GasMask, GlowingLamp,
        InjuredDolphin,
        LeadingChild, LeatherBoots,
        Money,
        OpenedCrypt,
        RabbitBoots, Refresh, RepairedStatue, RescuedChild,
        ShellFlute, ShieldRing,
        ShootingStatue, ShootingStatueSouth, StomSkip, StormBracelet,
        Sword, SwordOfFire, SwordOfThunder, SwordOfWater, SwordOfWind,
        TornadoBracelet, TravelSwamp, TriggerSkip,
        UsedBowOfMoon, UsedBowOfSun,
        WildWarp,
      },
      items: {
        MedicalHerb,
        WarpBoots,
      },
    } = this.rom;
    const start = this.entrance(MezameShrine);
    const enterOak = this.entrance(Oak);
    this.addCheck([start], and(BowOfMoon, BowOfSun), [OpenedCrypt.id]);
    this.addCheck([start], BowOfMoon.r, [UsedBowOfMoon.id]);
    this.addCheck([start], BowOfSun.r, [UsedBowOfSun.id]);
    this.addCheck([start], and(AbleToRideDolphin, ShellFlute),
                  [CurrentlyRidingDolphin.id]);
    this.addCheck([enterOak], and(LeadingChild), [RescuedChild.id]);
    this.addItemCheck([start], and(GlowingLamp, BrokenStatue),
                      RepairedStatue.id, {lossy: true, unique: true});

    // Add shops
    for (const shop of this.rom.shops) {
      // leaf and shyron may not always be accessible, so don't rely on them.
      if (shop.location === Leaf_ToolShop.id) continue;
      if (shop.location === Shyron_ToolShop.id) continue;
      if (!shop.used) continue;
      if (shop.type !== ShopType.TOOL) continue;
      const hitbox = [TileId(shop.location << 16 | 0x88)];
      for (const item of shop.contents) {
        if (item === MedicalHerb.id) {
          this.addCheck(hitbox, Money.r, [BuyHealing.id]);
        } else if (item === WarpBoots.id) {
          this.addCheck(hitbox, Money.r, [BuyWarp.id]);
        }
      }
    }

    // Add pseudo flags
    let breakStone: Requirement = SwordOfWind.r;
    let breakIce: Requirement = SwordOfFire.r;
    let formBridge: Requirement = SwordOfWater.r;
    let breakIron: Requirement = SwordOfThunder.r;
    if (!this.flagset.orbsOptional()) {
      const wind2 = or(BallOfWind, TornadoBracelet);
      const fire2 = or(BallOfFire, FlameBracelet);
      const water2 = or(BallOfWater, BlizzardBracelet);
      const thunder2 = or(BallOfThunder, StormBracelet);
      breakStone = Requirement.meet(breakStone, wind2);
      breakIce = Requirement.meet(breakIce, fire2);
      formBridge = Requirement.meet(formBridge, water2);
      breakIron = Requirement.meet(breakIron, thunder2);
      if (this.flagset.assumeSwordChargeGlitch()) {
        const level2 =
            Requirement.or(breakStone, breakIce, formBridge, breakIron);
        function need(sword: Flag): Requirement {
          return level2.map(
              (c: readonly Condition[]) =>
                  c[0] === sword.c ? c : [sword.c, ...c]);
        }
        breakStone = need(SwordOfWind);
        breakIce = need(SwordOfFire);
        formBridge = need(SwordOfWater);
        breakIron = need(SwordOfThunder);
      }
    }
    this.addCheck([start], breakStone, [BreakStone.id]);
    this.addCheck([start], breakIce, [BreakIce.id]);
    this.addCheck([start], formBridge, [FormBridge.id]);
    this.addCheck([start], breakIron, [BreakIron.id]);
    this.addCheck([start],
                  or(SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder),
                  [Sword.id]);
    this.addCheck([start], Flight.r, [ClimbWaterfall.id, ClimbSlope10.id]);
    this.addCheck([start], or(Flight, RabbitBoots), [ClimbSlope8.id]);
    this.addCheck([start], or(Flight, RabbitBoots), [ClimbSlope9.id]);
    this.addCheck([start], Barrier.r, [ShootingStatue.id, ShootingStatueSouth.id]);
    this.addCheck([start], GasMask.r, [TravelSwamp.id]);
    const pain = this.flagset.changeGasMaskToHazmatSuit() ? GasMask : LeatherBoots;
    this.addCheck([start], or(Flight, RabbitBoots, pain), [CrossPain.id]);

    if (this.flagset.leatherBootsGiveSpeed()) {
      this.addCheck([start], LeatherBoots.r, [ClimbSlope8.id]);
    }
    if (this.flagset.assumeGhettoFlight()) {
      this.addCheck(
        [start], and(CurrentlyRidingDolphin, RabbitBoots),
        [ClimbWaterfall.id]);
    }
    if (this.flagset.fogLampNotRequired()) {
      // not actually used...?
      const requireHealed = this.flagset.requireHealedDolphinToRide();
      this.addCheck([start],
                    requireHealed ? InjuredDolphin.r : [[]],
                    [AbleToRideDolphin.id]);
    }
    if (!this.flagset.guaranteeBarrier()) {
      this.addCheck([start], [[Money.c, BuyHealing.c],
                              [Money.c, ShieldRing.c],
                              [Money.c, Refresh.c]],
                    [ShootingStatue.id, ShootingStatueSouth.id]);
    }
    if (this.flagset.assumeFlightStatueSkip()) {
      // NOTE: with no money, we've got 16 MP, which isn't enough
      // to get past seven statues.
      this.addCheck([start], [[Money.c, Flight.c]], [ShootingStatue.id]);
    }
    if (!this.flagset.guaranteeGasMask()) {
      this.addCheck([start], [[Money.c, BuyHealing.c],
                              [Money.c, Refresh.c]],
                    [TravelSwamp.id, CrossPain.id]);
    }
    if (this.flagset.assumeWildWarp()) {
      this.addCheck([start], Requirement.OPEN, [WildWarp.id]);
    }
    if (this.flagset.assumeTriggerGlitch()) {
      this.addCheck([start], Requirement.OPEN, [TriggerSkip.id]);
      this.addCheck([start], TriggerSkip.r,
                    [CrossPain.id, ClimbSlope8.id,
                     ClimbSlope9.id /*, ClimbSlope10.id */]);
    }
    // Stom skip (only required for charge-shots only)
    if (this.flagset.chargeShotsOnly()) {
      for (const location of this.rom.townWarp.locations) {
        const loc = this.rom.locations[location];
        const entrance = loc.entrances[0];
        // Check if the entrance is above y<$58, which is the requirement
        // for skipping the fight (see check in $362b4).
        if ((entrance.y & 0xff) < 0x58) {
          this.addCheck([this.entrance(location)], BuyWarp.r, [StomSkip.id]);
        }
      }
    }
  }

  /** Adds routes that are not detectable from data tables. */
  addExtraRoutes() {
    const {
      flags: {BuyWarp, SwordOfThunder, Teleport, WildWarp},
      locations: {MezameShrine},
    } = this.rom;
    // Start the game at Mezame Shrine.
    this.addRoute(new Route(this.entrance(MezameShrine), []));
    // Sword of Thunder warp
    if (this.flagset.teleportOnThunderSword()) {
      const warp = this.rom.townWarp.thunderSwordWarp;
      this.addRoute(new Route(this.entrance(warp[0], warp[1] & 0x1f),
                              [SwordOfThunder.c, BuyWarp.c]));
      this.addRoute(new Route(this.entrance(warp[0], warp[1] & 0x1f),
                              [SwordOfThunder.c, Teleport.c]));
    }
    // Wild warp
    if (this.flagset.assumeWildWarp()) {
      for (const location of this.rom.wildWarp.locations) {
        // Don't count channel in logic because you can't actually move.
        if (location === this.rom.locations.UndergroundChannel.id) continue;
        // NOTE: some entrance tiles has extra requirements to enter (e.g.
        // swamp) - find them and concatente.
        const entrance = this.entrance(location);
        const terrain = this.terrains.get(entrance) ?? die('bad entrance');
        for (const route of terrain.enter) {
          this.addRoute(new Route(entrance, [WildWarp.c, ...route]));
        }
      }
    }
  }

  /** Change the key of the checks map to only be canonical TileIds. */
  consolidateChecks() {
    for (const [tile, checks] of this.checks) {
      const root = this.tiles.find(tile);
      if (tile === root) continue;
      for (const check of checks) {
        this.checks.get(root).add(check);
      }
      this.checks.delete(tile);
    }
  }

  /** At this point we know that all of this.checks' keys are canonical. */
  buildRequirementMap() {
    for (const [tile, checkSet] of this.checks) {
      for (const {checks, requirement} of checkSet) {
        for (const check of checks) {
          const req = this.requirementMap.get(check as Condition);
          for (const r1 of requirement) {
            for (const r2 of this.routes.get(tile) || []) {
              req.addList([...r1, ...r2]);
            }
          }
        }
      }
    }

    // TODO - log the map?
    if (!DEBUG) return;
    const log = [];
    for (const [check, req] of this.requirementMap) {
      const name = (c: number) => this.rom.flags[c].name;
      for (const route of req) {
        log.push(`${name(check)}: ${[...route].map(name).join(' & ')}\n`);
      }
    }
    log.sort((a: any, b: any) => a < b ? -1 : a > b ? 1 : 0);
    console.log(log.join(''));
  }

  /** Returns a LocationList structure after the requirement map is built. */
  getLocationList(worldName = 'Crystalis'): LocationList {
    // TODO - consider just implementing this directly?
    const checkName = DEBUG ? (f: Flag) => f.debug : (f: Flag) => f.name;
    return {
      worldName,
      requirements: this.requirementMap,
      items: this.items,
      slots: this.slots,
      checkName: (check: number) => checkName(this.rom.flags[check]),
      prefill: (random: Random) => {
        const {Crystalis, MesiaInTower, LeafElder} = this.rom.flags;
        const map = new Map([[MesiaInTower.id, Crystalis.id]]);
        if (this.flagset.guaranteeSword()) {
          // Pick a sword at random...? inverse weight?
          map.set(LeafElder.id, 0x200 | random.nextInt(4));
        }
        return map;
        // TODO - if any items shouldn't be shuffled, then do the pre-fill...
      },
    };
  }

  /** Add terrains and checks for a location, from tiles and spawns. */
  processLocation(location: Location) {
    if (!location.used) return;
    // Look for walls, which we need to know about later.
    this.processLocationTiles(location);
    this.processLocationSpawns(location);
    this.processLocationItemUses(location);
  }

  /** Run the first pass of unions now that all terrains are final. */
  unionNeighbors() {
    for (const [tile, terrain] of this.terrains) {
      const x1 = TileId.add(tile, 0, 1);
      if (this.terrains.get(x1) === terrain) this.tiles.union([tile, x1]);
      const y1 = TileId.add(tile, 1, 0);
      if (this.terrains.get(y1) === terrain) this.tiles.union([tile, y1]);
    }
  }

  /** Builds up the routes and routeEdges data structures. */
  addAllRoutes() {
    // Add any extra routes first, such as the starting tile.
    this.addExtraRoutes();
    // Add all the edges from all neighbors.
    for (const [pair, dirs] of this.neighbors) {
      const [c0, c1] = TilePair.split(pair);
      const t0 = this.terrains.get(c0);
      const t1 = this.terrains.get(c1);
      if (!t0 || !t1) throw new Error(`missing terrain ${hex(t0 ? c0 : c1)}`);
      for (const [dir, exitReq] of t0.exit) {
        if (!(dir & dirs)) continue;
        for (const exitConds of exitReq) {
          for (const enterConds of t1.enter) {
            this.addRoute(new Route(c1, [...exitConds, ...enterConds]), c0);
          }
        }
      }
    }
    if (typeof document === 'object') {
      const debug = document.getElementById('debug');
      if (debug) {
        debug.appendChild(new Area(this.rom, this.getWorldData()).element);
      }
    }
  }

  getWorldData(): WorldData {
    let index = 0;
    const tiles = new DefaultMap<TileId, TileData>(() => ({}) as TileData);
    const locations =
        seq(256, () => ({areas: new Set(), tiles: new Set()} as LocationData));
    const areas: AreaData[] = [];

    // digest the areas
    for (const set of this.tiles.sets()) {
      const canonical = this.tiles.find(iters.first(set));
      const terrain = this.terrains.get(canonical);
      if (!terrain) continue;
      const routes =
          this.routes.has(canonical) ?
              Requirement.freeze(this.routes.get(canonical)) : [];
      if (!routes.length) continue;
      const area: AreaData = {
        checks: [],
        id: index++,
        locations: new Set(),
        routes,
        terrain,
        tiles: new Set(),
      };
      areas.push(area);
      for (const tile of set) {
        const location = tile >>> 16;
        area.locations.add(location);
        area.tiles.add(tile);
        locations[location].areas.add(area);
        locations[location].tiles.add(tile);
        tiles.get(tile).area = area;
      }
    }
    // digest the exits
    for (const [a, b] of this.exits) {
      if (tiles.has(a)) {
        tiles.get(a).exit = b;
      }
    }
    // digest the checks
    for (const [tile, checkSet] of this.checks) {
      const area = tiles.get(tile).area;
      if (!area) {
        // console.error(`Abandoned check ${[...checkSet].map(
        //                    x => [...x.checks].map(y => y.toString(16)))
        //                } at ${tile.toString(16)}`);
        continue;
      }
      for (const {checks, requirement} of checkSet) {
        for (const check of checks) {
          const flag = this.rom.flags[check] || die();
          area.checks.push([flag, requirement]);
        }
      }
    }
    return {tiles, areas, locations};
  }

  /** Adds a route, optionally with a prerequisite (canonical) source tile. */
  addRoute(route: Route, source?: TileId) {
    if (source != null) {
      // Add an edge instead of a route, recursing on the source's
      // requirements.
      this.routeEdges.get(source).add(route);
      for (const srcRoute of this.routes.get(source)) {
        this.addRoute(new Route(route.target, [...srcRoute, ...route.deps]));
      }
      return;
    }
    // This is now an "initial route" with no prerequisite source.
    const queue = new LabeledSet<Route>();
    const seen = new LabeledSet<Route>();
    const start = route; // TODO inline
    queue.add(start);
    const iter = queue[Symbol.iterator]();
    while (true) {
      const {value, done} = iter.next();
      if (done) return;
      seen.add(value);
      queue.delete(value);
      const follow = new LabeledSet<Route>();
      const target = value.target;
      const builder = this.routes.get(target);
      if (builder.addRoute(value)) {
        for (const next of this.routeEdges.get(target)) {
          follow.add(new Route(next.target, [...value.deps, ...next.deps]));
        }
      }
      for (const next of follow) {
        if (seen.has(next)) continue;
        queue.delete(next); // re-add at the end of the queue
        queue.add(next);
      }
    }
  }

  /**
   * Builds up `this.exitSet` to include all the "from-to" tile pairs
   * of exits that _don't_ share the same terrain For any two-way exit
   * that shares the same terrain, just add it directly to the
   * unionfind.
   */
  recordExits() {
    // Add exit TilePairs to exitSet from all locations' exits.
    for (const [from, to] of this.exits) {
      this.exitSet.add(
          TilePair.of(this.tiles.find(from), this.tiles.find(to)));
    }
    // Look for two-way exits with the same terrain: remove them from
    // exitSet and add them to the tiles unionfind.
    for (const exit of this.exitSet) {
      const [from, to] = TilePair.split(exit);
      if (this.terrains.get(from) !== this.terrains.get(to)) continue;
      const reverse = TilePair.of(to, from);
      if (this.exitSet.has(reverse)) {
        this.tiles.union([from, to]);
        this.exitSet.delete(exit);
        this.exitSet.delete(reverse);
      }
    }
  }

  /**
   * Find different-terrain neighbors in the same location.  Add
   * representative elements to `this.neighbors` with all the
   * directions that it neighbors in.  Also add exits as neighbors.
   * This must happen *after* the entire unionfind is complete so
   * that we can leverage it.
   */
  buildNeighbors() {
    // Adjacent different-terrain tiles.
    for (const [tile, terrain] of this.terrains) {
      if (!terrain) continue;
      const y1 = TileId.add(tile, 1, 0);
      const ty1 = this.terrains.get(y1);
      if (ty1 && ty1 !== terrain) {
        this.handleAdjacentNeighbors(tile, y1, Dir.North);
      }
      const x1 = TileId.add(tile, 0, 1);
      const tx1 = this.terrains.get(x1);
      if (tx1 && tx1 !== terrain) {
        this.handleAdjacentNeighbors(tile, x1, Dir.West);
      }
    }
    // Exits (just use "north" for these).
    for (const exit of this.exitSet) {
      const [t0, t1] = TilePair.split(exit);
      if (!this.terrains.has(t0) || !this.terrains.has(t1)) continue;
      const p = TilePair.of(this.tiles.find(t0), this.tiles.find(t1));
      this.neighbors.set(p, this.neighbors.get(p) | 1);
    }
  }

  handleAdjacentNeighbors(t0: TileId, t1: TileId, dir: Dir) {
    // NOTE: t0 < t1 because dir is always WEST or NORTH.
    const c0 = this.tiles.find(t0);
    const c1 = this.tiles.find(t1);
    if (!this.seamlessExits.has(t1)) {
      // 1 -> 0 (west/north).  If 1 is an exit then this doesn't work.
      const p10 = TilePair.of(c1, c0);
      this.neighbors.set(p10, this.neighbors.get(p10) | (1 << dir));
    }
    if (!this.seamlessExits.has(t0)) {
      // 0 -> 1 (east/south).  If 0 is an exit then this doesn't work.
      const opp = dir ^ 2;
      const p01 = TilePair.of(c0, c1);
      this.neighbors.set(p01, this.neighbors.get(p01) | (1 << opp));
    }
  }

  processLocationTiles(location: Location) {
    const walls = new Map<ScreenId, WallType>();
    const shootingStatues = new Set<TileId>();
    const inTower = (location.id & 0xf8) === 0x58;
    for (const spawn of location.spawns) {
      // Walls need to come first so we can avoid adding separate
      // requirements for every single wall - just use the type.
      if (spawn.isWall()) {
        walls.set(ScreenId.from(location, spawn), (spawn.id & 3) as WallType);
      } else if (spawn.isMonster() && spawn.id === 0x3f) { // shooting statues
        // Add constraint only between the statues: x in [4..b] and y in
        // [yt-3..yt+3], rather than just a single entire row.  This is hard
        // because the ScreenId puts the screen y in an inconvenient nibble
        // relative to the tile y, so we need to do some weird math to get this
        // correct.
        const center = TileId(ScreenId.from(location, spawn) << 8 | spawn.yt << 4);
        for (let dx = 4; dx <= 0xb; dx++) {
          for (let dy = -3; dy <= 3; dy++) {
            shootingStatues.add(TileId.add(center, dy, dx));
          }
        }
      }
    }
    //const page = location.screenPage;
    const tileset = this.rom.tilesets[location.tileset];
    const tileEffects = this.rom.tileEffects[location.tileEffects - 0xb3];

    const getEffects = (tile: TileId) => {
      const s = location.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8];
      return tileEffects.effects[this.rom.screens[s].tiles[tile & 0xff]];
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
      if (location.id === 0x64 && ((tile & 0xf0f0) < 0x1030)) {
        effects |= Terrain.DOLPHIN;
      }
      if (barrier) effects |= Terrain.BARRIER;
      if (!(effects & Terrain.DOLPHIN) && effects & Terrain.SLOPE) {
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
      if (effects & Terrain.PAIN) {
        // Pain terrains are only impassible if they're all surrounded
        // by other pain terrains.
        type Delta = [number, number][];
        for (const delta of [[0, 1], [1, 0], [0, -1], [-1, 0]] as Delta) {
          if (!(getEffects(TileId.add(tile, ...delta)) &
                (Terrain.PAIN | Terrain.FLY))) {
            effects &= ~Terrain.PAIN;
            break;
          }
        }
      }
      return this.terrainFactory.tile(effects);
    };

    for (let y = 0, height = location.height; y < height; y++) {
      const row = location.screens[y];
      const rowId = location.id << 8 | y << 4;
      for (let x = 0, width = location.width; x < width; x++) {
        const screen = this.rom.screens[row[x]];
        const screenId = ScreenId(rowId | x);
        const flagYx = screenId & 0xff;
        const wall = walls.get(screenId);
        const flag =
            inTower ? this.rom.flags.AlwaysTrue.id :
            wall != null ? this.wallCapability(wall) :
            location.flags.find(f => f.screen === flagYx)?.flag;
        const pit = location.pits.find(p => p.fromScreen === screenId);
        if (pit) {
          this.exits.set(TileId(screenId << 8 | 0x88),
                         TileId(pit.toScreen << 8 | 0x88));
        }
        const logic: Logic = this.rom.flags[flag!]?.logic ?? {};
        for (let t = 0; t < 0xf0; t++) {
          const tid = TileId(screenId << 8 | t);
          let tile = screen.tiles[t];
          // flag 2ef is "always on", don't even bother making it conditional.
          if (logic.assumeTrue && tile < 0x20) {
            tile = tileset.alternates[tile];
          }
          const effects = location.isShop() ? 0 : tileEffects.effects[tile];
          const barrier = shootingStatues.has(tid);
          let terrain = makeTerrain(effects, tid, barrier);
          //if (!terrain) throw new Error(`bad terrain for alternate`);
          if (tile < 0x20 && tileset.alternates[tile] !== tile &&
              flag != null && !logic.assumeTrue && !logic.assumeFalse) {
            // NOTE: barrier=true is probably an error here?
            const alternate =
                makeTerrain(tileEffects.effects[tileset.alternates[tile]],
                                 tid, barrier);
            //if (!alternate) throw new Error(`bad terrain for alternate`);
            if (alternate) {
              // NOTE: there's an oddity from hollowing out the backs of iron
              // walls that one corner of stone walls are also hollowed out,
              // but only pre-flag.  It doesn't actually hurt anything.
              terrain =
                  this.terrainFactory.flag(terrain,
                                           logic.track ? flag : -1,
                                           alternate);
            }
          }
          if (terrain) this.terrains.set(tid, terrain);
        }
      }
    }

    // Clobber terrain with seamless exits
    for (const exit of location.exits) {
      const {dest, entrance} = exit;
      const from = TileId.from(location, exit);
      // Seamless exits (0x20) ignore the entrance index, and
      // instead preserve the TileId, just changing the location.
      let to: TileId;
      if (exit.isSeamless()) {
        to = TileId(from & 0xffff | (dest << 16));
        const tile = TileId.from(location, exit);
        this.seamlessExits.add(tile);
        const previous = this.terrains.get(tile);
        if (previous) {
          this.terrains.set(tile, this.terrainFactory.seamless(previous));
        }
      } else {
        to = this.entrance(this.rom.locations[dest], entrance & 0x1f);
      }
      this.exits.set(from, to);
      if (dest === this.rom.locations.LimeTreeLake.id &&
          this.rom.locations.LimeTreeLake.entrances[entrance].y > 0xa0) {
        // North exit to lime tree lake: mark location.
        this.limeTreeEntranceLocation = location.id;
      }
    }
  }

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
      } else if (spawn.type === 3 && spawn.id === 0xe0) {
        // Windmill blades: the cave flag (2ee) isn't set directly by using the
        // key.  Rather, the windmill blades (e0, action 51 at $366db) check for
        // 00a to spawn explosion and set 2ee.
        this.processKeyUse(
            Hitbox.screen(TileId.from(location, spawn)),
            this.rom.flags.UsedWindmillKey.r);
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
    let antiRequirements = this.filterAntiRequirements(trigger.conditions);

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
          hitbox = Hitbox.adjust(hitbox, [0, -1], [0, 1]);
        } else if (trigger.id === 0xba &&
                   !this.flagset.assumeTeleportSkip() &&
                   !this.flagset.disableTeleportSkip()) {
          // copy the teleport hitbox into the other side of cordel
          hitbox = Hitbox.atLocation(hitbox,
                                     this.rom.locations.CordelPlainEast,
                                     this.rom.locations.CordelPlainWest);
        }
        if (this.flagset.assumeTriggerGlitch()) {
          // all push-down triggers can be skipped with trigger skip...
          antiRequirements = Requirement.or(antiRequirements, this.rom.flags.TriggerSkip.r);
        }
        this.addTerrain(hitbox, this.terrainFactory.statue(antiRequirements));
        break;

      case 0x1d:
        // start mado 1 boss fight
        this.addBossCheck(hitbox, this.rom.bosses.Mado1, requirements);
        break;

      case 0x08: case 0x0b: case 0x0c: case 0x0d: case 0x0f:
        // find itemgrant for trigger ID => add check
        this.addItemGrantChecks(hitbox, requirements, trigger.id);
        break;

      case 0x18: { // stom fight
        // Special case: warp boots glitch required if charge shots only.
        const req =
          this.flagset.chargeShotsOnly() ?
          Requirement.meet(requirements, this.rom.flags.StomSkip.r) :
          requirements;
        this.addItemCheck(hitbox, req, this.rom.flags.StomFightReward.id,
                          {lossy: true, unique: true});
        break;
      }

      case 0x1e:
        // forge crystalis
        this.addItemCheck(hitbox, requirements, this.rom.flags.MesiaInTower.id,
                          {lossy: true, unique: true});
        break;

      case 0x1f:
        this.handleBoat(tile, location, requirements);
        break;

      case 0x1b:
        // Moving guard
        // treat this as a statue?  but the conditions are not super useful...
        //   - only tracked conditions matter? 9e == paralysis... except not.
        // paralyzable?  check DataTable_35045
        if (location === this.rom.locations.Portoa_PalaceEntrance) {
          // Portoa palace front guard normally blocks on Mesia recording.
          // But the queen is actually accessible without seeing the recording.
          // Instead, block access to the throne room on being able to talk to
          // the fortune teller, in case the guard moves before we can get the
          // item.  Also move the hitbox up since the two side rooms _are_ still
          // accessible.
          hitbox = Hitbox.adjust(hitbox, [-2, 0]);
          antiRequirements = this.rom.flags.TalkedToFortuneTeller.r;
        }
        // Note: antiRequirements must be met in order to get through, since we
        // need the guard _not_ to move.
        this.handleMovingGuard(hitbox, location, antiRequirements);
        break;
    }

    for (const [item, use] of this.itemUses.get(spawn.type << 8 | spawn.id)) {
      this.processItemUse([TileId.from(location, spawn)],
                          Requirement.OPEN, item, use);
    }
  }

  processNpc(location: Location, spawn: Spawn) {
    const npc = this.rom.npcs[spawn.id];
    if (!npc || !npc.used) throw new Error(`Unknown npc: ${hex(spawn.id)}`);
    const spawnConditions = npc.spawnConditions.get(location.id) || [];
    const req = this.filterRequirements(spawnConditions); // should be single

    const tile = TileId.from(location, spawn);

    // NOTE: Rage has no walkable neighbors, and we need the same hitbox
    // for both the terrain and the check.
    //
    // NOTE ALSO - Rage probably shows up as a boss, not an NPC?
    let hitbox: Hitbox =
        [this.terrains.has(tile) ? tile : this.walkableNeighbor(tile) ?? tile];

    for (const [item, use] of this.itemUses.get(spawn.type << 8 | spawn.id)) {
      this.processItemUse(hitbox, req, item, use);
    }

    if (npc === this.rom.npcs.SaberaDisguisedAsMesia) {
      this.addBossCheck(hitbox, this.rom.bosses.Sabera1, req);
    }

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
        // TODO - is this even required once we have the RageTerrain???
        // if (this.flagset.assumeRageSkip()) antiReq = undefined;
      } else if (npc === this.rom.npcs.PortoaThroneRoomBackDoorGuard) {
        // Portoa back door guard spawns if (1) the mesia recording has not yet
        // been played, and (2) the player didn't sneak past the earlier guard.
        // We can simulate this by hard-coding a requirement on either to get
        // past him.
        antiReq = Requirement.or(this.rom.flags.MesiaRecording.r,
                                 and(this.rom.flags.Paralysis,
                                     this.rom.flags.QueenNotInThroneRoom));
      } else if (npc === this.rom.npcs.SoldierGuard) {
        antiReq = undefined; // they'll just attack if approached.
      }
      // if spawn is always false then req needs to be open?
      if (antiReq) this.addTerrain(hitbox, this.terrainFactory.statue(antiReq));
    }

    // Fortune teller can be talked to across the desk.
    if (npc === this.rom.npcs.FortuneTeller) {
      hitbox = Hitbox.adjust(hitbox, [0, 0], [2, 0]);
    }

    // req is now mutable
    if (Requirement.isClosed(req)) return; // nothing to do if it never spawns.
    const [[...conds]] = req;

    // Iterate over the global dialogs - do nothing if we can't pass them.
    for (const d of npc.globalDialogs) {
      const f = this.flag(~d.condition);
      const fc = this.flag(d.condition);
      if (f?.logic.assumeFalse || fc?.logic.assumeTrue) return;
      if (f?.logic.track) conds.push(f.id as Condition);
    }

    // Iterate over the appropriate local dialogs
    const locals =
        npc.localDialogs.get(location.id) ?? npc.localDialogs.get(-1) ?? [];
    for (const d of locals) {
      // Compute the condition 'r' for this message.
      const r = [...conds];
      const f0 = this.flag(d.condition);
      const f1 = this.flag(~d.condition);
      if (f0?.logic.track) r.push(f0.id as Condition);
      if (!f0?.logic.assumeFalse && !f1?.logic.assumeTrue) {
        // Only process this dialog if it's possible to pass the condition.
        this.processDialog(hitbox, npc, r, d);
      }
      // Check if we can never actually get past this dialog.
      if (f0?.logic.assumeTrue || f1?.logic.assumeFalse) break;
      // Add any new conditions to 'conds' to get beyond this message.
      if (f1?.logic.track) {
        conds.push(f1.id as Condition);
      }
    }
  }

  processDialog(hitbox: Hitbox, npc: Npc,
                req: readonly Condition[], dialog: LocalDialog) {
    this.addCheckFromFlags(hitbox, [req], dialog.flags);

    const info = {lossy: true, unique: true};
    switch (dialog.message.action) {
      case 0x08: // open swan gate
        this.processKeyUse(hitbox, [req]);
        break;

      // case 0x0c: // dwarf child starts following
      //   break;

      // case 0x0d: // npc walks away
      //   break;

      case 0x14:
        this.addItemCheck(hitbox, [req], this.rom.flags.SlimedKensu.id, info);
        break;

      case 0x10:
        this.addItemCheck(
            hitbox, [req], this.rom.flags.AsinaInBackRoom.id, info);
        break;

      case 0x11: // give item through trigger (loading from $6a0)
        this.addItemCheck(hitbox, [req], 0x100 | npc.data[1], info);
        break;

      case 0x03: // give item through trigger (loading from $680)
        this.addItemCheck(hitbox, [req], 0x100 | npc.data[0], info);
        break;

      case 0x0a: // normally this hard-codes glowing lamp, but we extended it to drop any chest
        // since we drop a chest, we want to add a sword requirement if it turns into a mimic
        const swordReq = this.flagset.alwaysMimics() ? [[...req, this.rom.flags.Sword.c]] : [req];
        this.addItemCheck(hitbox, swordReq, 0x100 | npc.data[0], info);
        break;

      case 0x09:
        // If zebu student has an item...?  TODO - store ff if unused
        const item = npc.data[1];
        if (item !== 0xff) this.addItemCheck(hitbox, [req], 0x100 | item, info);
        break;

      case 0x19:
        this.addItemCheck(
            hitbox, [req], this.rom.flags.AkahanaFluteOfLimeTradein.id, info);
        break;

      case 0x1a:
        // TODO - can we reach this spot?  may need to move down?
        this.addItemCheck(hitbox, [req], this.rom.flags.Rage.id, info);
        break;

      case 0x1b:
        // Rage throwing player out...
        // This should actually already be handled by the statue code above?
        break;
    }

    // TODO - add extra dialogs for itemuse trades, extra triggers
    //      - if item traded but no reward, then re-give reward...
  }

  processLocationItemUses(location: Location) {
    for (const [item, use] of this.itemUses.get(~location.id)) {
      this.processItemUse([this.entrance(location)],
                          Requirement.OPEN, item, use);
    }
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
        extra.push([this.rom.flags.Paralysis.c]);
        break;
      }
    }
    if (this.flagset.assumeTriggerGlitch()) {
      extra.push([this.rom.flags.TriggerSkip.c]);
    }
    this.addTerrain(hitbox,
                    this.terrainFactory.statue([...req, ...extra].map(spread)));

    // TODO - Portoa guards are broken :-(
    // The back guard needs to block on the front guard's conditions,
    // while the front guard should block on fortune teller?

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
      const t1 = this.walkableNeighbor(t);
      if (t1 != null) {
        const boat: Terrain = {
          enter: Requirement.freeze(requirements),
          exit: [[0xf, Requirement.OPEN]],
        };
        // Add a terrain and exit pair for the boat trigger.
        this.addTerrain([t0], boat);
        this.exits.set(t0, t1);
        this.exitSet.add(TilePair.of(t0, t1));
        // Add a terrain and exit pair for the entrance we passed
        // (this is primarily necessary for wild warp to work in logic).
        this.exits.set(entranceTile, t1);
        this.exitSet.add(TilePair.of(entranceTile, t1));
        this.terrains.set(entranceTile, this.terrainFactory.tile(0)!);
        return;
      }
    }
  }

  addItemGrantChecks(hitbox: Hitbox, req: Requirement, grantId: number) {
    const item = this.itemGrant(grantId);
    const slot = 0x100 | item;
    if (item == null) {
      throw new Error(`missing item grant for ${grantId.toString(16)}`);
    }
    // is the 100 flag sufficient here?  probably?
    const preventLoss = grantId >= 0x80; // granted from a trigger
    this.addItemCheck(hitbox, req, slot,
                      {lossy: true, unique: true, preventLoss});
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
    const check = {requirement: Requirement.freeze(requirement), checks};
    for (const tile of hitbox) {
      if (!this.terrains.has(tile)) continue;
      this.checks.get(tile).add(check);
    }
  }

  addItemCheck(hitbox: Hitbox, requirement: Requirement,
               check: number, slot: SlotInfo) {
    this.addCheck(hitbox, requirement, [check]);
    this.slots.set(check, slot);
    // also add corresponding ItemInfo to keep them in parity.
    const itemget = this.rom.itemGets[this.rom.slots[check & 0xff]];
    const item = this.rom.items[itemget.itemId];
    const unique = item?.unique;
    const losable = itemget.isLosable();
    // TODO - refactor to just "can't be bought"?
    const preventLoss = unique || item === this.rom.items.OpelStatue;
    // let weight = 1;
    // if (item === this.rom.items.SwordOfWind) weight = 5;
    // if (item === this.rom.items.SwordOfFire) weight = 5;
    // if (item === this.rom.items.SwordOfWater) weight = 10;
    // if (item === this.rom.items.SwordOfThunder) weight = 15;
    // if (item === this.rom.items.Flight) weight = 15;
    this.items.set(0x200 | itemget.id, {unique, losable, preventLoss});
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
    //const page = location.screenPage;
    const effects = this.rom.tileEffects[location.tileEffects - 0xb3].effects;
    const scr = location.screens[(t & 0xf000) >>> 12][(t & 0xf00) >>> 8];
    return effects[this.rom.screens[scr].tiles[t & 0xff]];
  }

  processBoss(location: Location, spawn: Spawn) {
    // Bosses will clobber the entrance portion of all tiles on the screen,
    // and will also add their drop.
    const {bosses} = this.rom;
    const {Rage, StatueOfSun, StatueOfMoon} = bosses;
    const isStatueOfMoon = spawn.id === 0xc9;
    const isStatueOfSun = spawn.id === 0xca;
    const isRage = spawn.id === 0xc3;
    const boss =
        isRage ? Rage :
        isStatueOfMoon ? StatueOfMoon :
        isStatueOfSun ? StatueOfSun :
        bosses.fromLocation(location.id);
    const tile = TileId.from(location, spawn);
    if (!boss || !boss.flag) throw new Error(`Bad boss at ${location.name}`);
    const screen = tile & ~0xff;
    const bossTerrain = this.terrainFactory.boss(boss.flag.id, isRage);
    const hitbox = seq(0xf0, (t: number) => (screen | t) as TileId);
    this.addTerrain(hitbox, bossTerrain);
    if (!isStatueOfMoon && !isStatueOfSun) {
      this.addBossCheck(hitbox, boss);
    }
  }

  addBossCheck(hitbox: Hitbox, boss: Boss,
               requirements: Requirement = Requirement.OPEN) {
    if (boss.flag == null) throw new Error(`Expected a flag: ${boss}`);
    const req = Requirement.meet(requirements, this.bossRequirements(boss));
    if (boss === this.rom.bosses.Draygon2) {
      this.addCheck(hitbox, req, [boss.flag.id]);
    } else {
      this.addItemCheck(
          hitbox, req, boss.flag.id, {lossy: false, unique: true});
    }
  }

  processChest(location: Location, spawn: Spawn) {
    // Add a check for the 1xx flag.  Make sure it's not a mimic.
    if (this.rom.slots[spawn.id] >= 0x70) return;
    const slot = 0x100 | spawn.id;
    const mapped = this.rom.slots[spawn.id];
    if (mapped >= 0x70) return; // TODO - mimic% may care
    const item = this.rom.items[mapped];
    const unique = this.flagset.preserveUniqueChecks() ? !!item?.unique : true;
    this.addItemCheck([TileId.from(location, spawn)], this.chestRequirement,
                      slot, {lossy: false, unique});
  }

  processMonster(location: Location, spawn: Spawn) {

    // TODO - currently don't handle flyers well - could instead add flyers
    //        to all entrances?

    // Check monster's vulnerabilities and add a check for Money given swords.
    const monster = this.rom.objects[spawn.monsterId];
    if (!(monster instanceof Monster)) return;
    const {
      Money, RageSkip,
      Sword, SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder,
    } = this.rom.flags;
    if (location.id === this.limeTreeEntranceLocation && monster.isBird() &&
        this.flagset.assumeRageSkip()) {
      this.addCheck([this.entrance(location)], Requirement.OPEN, [RageSkip.id]);

    }
    if (!(monster.goldDrop)) return;
    const hitbox = [TileId.from(location, spawn)];
    if (!this.flagset.guaranteeMatchingSword()) {
      this.addCheck(hitbox, Sword.r, [Money.id]);
      return;
    }
    const swords =
        [SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder]
            .filter((_, i) => monster.elements & (1 << i));
    // TODO - consider collecting all the elements in one place first
    this.addCheck(hitbox, or(...swords), [Money.id]);
  }

  processItemUse(hitbox: Hitbox, req1: Requirement, item: Item, use: ItemUse) {
    // this should handle most trade-ins automatically
    hitbox = new Set([...hitbox].map(t => this.walkableNeighbor(t) ?? t));
    const req2 = [[(0x200 | item.id) as Condition]]; // requires the item.
    // check for Aryllis trade-in, add change as a requirement.
    if (item.itemUseData.some(u => u.tradeNpc() === this.rom.npcs.Aryllis.id)) {
      req2[0].push(this.rom.flags.Change.c);
    }
    if (item === this.rom.items.MedicalHerb) { // dolphin
      req2[0][0] = this.rom.flags.BuyHealing.c; // note: no other healing items
    }
    const req = Requirement.meet(req1, req2);
    // set any flags
    this.addCheckFromFlags(hitbox, req, use.flags);
    // handle any extra actions
    switch (use.message.action) {
      case 0x10:
        // use key
        this.processKeyUse(hitbox, req);
        break;
      case 0x08: case 0x0b: case 0x0c: case 0x0d: case 0x0f: case 0x1c:
        // find itemgrant for item ID => add check
        this.addItemGrantChecks(hitbox, req, item.id);
        break;
      case 0x02:
        // dolphin defers to dialog action 11 (and 0d to swim away)
        this.addItemCheck(hitbox, req,
                          0x100 | this.rom.npcs[use.want & 0xff].data[1],
                          {lossy: true, unique: true});
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

  bossRequirements(boss: Boss): Requirement {
    // TODO - handle boss shuffle somehow?
    if (boss === this.rom.bosses.Rage) {
      // Special case for Rage.  Figure out what he wants from the dialog.
      const unknownSword = this.tracker && this.flagset.randomizeTrades();
      if (unknownSword) return this.rom.flags.Sword.r; // any sword might do.
      return [[this.rom.npcs.Rage.dialog()[0].condition as Condition]];
    }
    const id = boss.object;
    const r = new Requirement.Builder();
    if (this.tracker && this.flagset.shuffleBossElements() ||
        !this.flagset.guaranteeMatchingSword()) {
      r.addAll(this.rom.flags.Sword.r);
    } else {
      const level = this.flagset.guaranteeSwordMagic() ? boss.swordLevel : 1;
      const obj = this.rom.objects[id];
      for (let i = 0; i < 4; i++) {
        if (obj.isVulnerable(i)) r.addAll(this.swordRequirement(i, level));
      }
    }
    // Can't actually kill the boss if it doesn't spawn.
    const extra: Condition[] = [];
    if (boss.npc != null && boss.location != null) {
      const spawnCondition = boss.npc.spawns(this.rom.locations[boss.location]);
      extra.push(...this.filterRequirements(spawnCondition)[0]);
    }
    if (boss === this.rom.bosses.Insect) {
      extra.push(this.rom.flags.InsectFlute.c, this.rom.flags.GasMask.c);
    } else if (boss === this.rom.bosses.Draygon2) {
      extra.push(this.rom.flags.BowOfTruth.c);
    }
    if (this.flagset.guaranteeRefresh()) {
      extra.push(this.rom.flags.Refresh.c);
    }
    r.restrict([extra]);
    return Requirement.freeze(r);
  }

  swordRequirement(element: number, level: number): Requirement {
    const sword = [
      this.rom.flags.SwordOfWind, this.rom.flags.SwordOfFire,
      this.rom.flags.SwordOfWater, this.rom.flags.SwordOfThunder,
    ][element];
    if (level === 1) return sword.r;
    const powers = [
      [this.rom.flags.BallOfWind, this.rom.flags.TornadoBracelet],
      [this.rom.flags.BallOfFire, this.rom.flags.FlameBracelet],
      [this.rom.flags.BallOfWater, this.rom.flags.BlizzardBracelet],
      [this.rom.flags.BallOfThunder, this.rom.flags.StormBracelet],
    ][element];
    if (level === 3) return and(sword, ...powers);
    return powers.map(power => [sword.c, power.c]);
  }

  itemGrant(id: number): number {
    for (const [key, value] of this.rom.itemGets.actionGrants) {
      if (key === id) return value;
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
        const f = this.flag(flag);
        if (f?.logic.assumeFalse) return Requirement.CLOSED;
        if (f?.logic.track) conds.push(f.id as Condition);
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
        const f = this.flag(~flag);
        if (f?.logic.assumeTrue) return Requirement.OPEN;
        if (f?.logic.track) req.push([f.id as Condition]);
      }
    }
    return req;
  }

  flag(flag: number): Flag|undefined {
    //const unsigned = flag < 0 ? ~flag : flag;
    const unsigned = flag;  // TODO - should we auto-invert?
    const f = this.rom.flags[unsigned];
    const mapped = this.aliases.get(f) ?? f;
    return mapped;
  }

  entrance(location: Location|number, index = 0): TileId {
    if (typeof location === 'number') location = this.rom.locations[location];
    return this.tiles.find(TileId.from(location, location.entrances[index]));
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
}

function and(...flags: Flag[]): Requirement.Single {
  return [flags.map((f: Flag) => f.id as Condition)];
}

function or(...flags: Flag[]): Requirement.Frozen {
  return flags.map((f: Flag) => [f.id as Condition]);
}

// An interesting way to track terrain combinations is with primes.
// If we have N elements we can label each atom with a prime and
// then label arbitrary combinations with the product.  For N=1000
// the highest number is 8000, so that it contributes about 13 bits
// to the product, meaning we can store combinations of 4 safely
// without resorting to bigint.  This is inherently order-independent.
// If the rarer ones are higher, we can fit significantly more than 4.

const DEBUG = false;

// Debug interface.
export interface AreaData {
  id: number;
  tiles: Set<TileId>;
  checks: Array<[Flag, Requirement]>;
  terrain: Terrain;
  locations: Set<number>;
  routes: Requirement.Frozen;
}
export interface TileData {
  area: AreaData;
  exit?: TileId;
}
export interface LocationData {
  areas: Set<AreaData>;
  tiles: Set<TileId>;
}
export interface WorldData {
  tiles: Map<TileId, TileData>;
  areas: AreaData[];
  locations: LocationData[];
}
