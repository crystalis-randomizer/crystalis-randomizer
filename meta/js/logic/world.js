import { Area } from '../spoiler/area.js';
import { die } from '../assert.js';
import { ShopType } from '../rom/shop.js';
import { hex, seq } from '../rom/util.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap, LabeledSet, iters, spread } from '../util.js';
import { Dir } from './dir.js';
import { Hitbox } from './hitbox.js';
import { Requirement, Route } from './requirement.js';
import { ScreenId } from './screenid.js';
import { Terrain, Terrains } from './terrain.js';
import { TileId } from './tileid.js';
import { TilePair } from './tilepair.js';
import { WallType } from './walltype.js';
const [] = [hex];
export class World {
    constructor(rom, flagset, tracker = false) {
        this.rom = rom;
        this.flagset = flagset;
        this.tracker = tracker;
        this.terrainFactory = new Terrains(this.rom);
        this.terrains = new Map();
        this.checks = new DefaultMap(() => new Set());
        this.slots = new Map();
        this.items = new Map();
        this.itemUses = new DefaultMap(() => []);
        this.exits = new Map();
        this.exitSet = new Set();
        this.seamlessExits = new Set();
        this.tiles = new UnionFind();
        this.neighbors = new DefaultMap(() => 0);
        this.routes = new DefaultMap(() => new Requirement.Builder());
        this.routeEdges = new DefaultMap(() => new LabeledSet());
        this.requirementMap = new DefaultMap((c) => new Requirement.Builder(c));
        for (const item of rom.items) {
            for (const use of item.itemUseData) {
                if (use.kind === 'expect') {
                    this.itemUses.get(use.want).push([item, use]);
                }
                else if (use.kind === 'location') {
                    this.itemUses.get(~use.want).push([item, use]);
                }
            }
        }
        this.aliases = new Map([
            [rom.flags.ChangeAkahana, rom.flags.Change],
            [rom.flags.ChangeSoldier, rom.flags.Change],
            [rom.flags.ChangeStom, rom.flags.Change],
            [rom.flags.ChangeWoman, rom.flags.Change],
            [rom.flags.ParalyzedKensuInDanceHall, rom.flags.Paralysis],
            [rom.flags.ParalyzedKensuInTavern, rom.flags.Paralysis],
        ]);
        for (const location of rom.locations) {
            this.processLocation(location);
        }
        this.addExtraChecks();
        this.unionNeighbors();
        this.recordExits();
        this.buildNeighbors();
        this.addAllRoutes();
        this.consolidateChecks();
        this.buildRequirementMap();
    }
    addExtraChecks() {
        const { locations: { Leaf_ToolShop, MezameShrine, Oak, Shyron_ToolShop, }, flags: { AbleToRideDolphin, BallOfFire, BallOfThunder, BallOfWater, BallOfWind, Barrier, BlizzardBracelet, BowOfMoon, BowOfSun, BreakStone, BreakIce, BreakIron, BrokenStatue, BuyHealing, BuyWarp, ClimbWaterfall, ClimbSlope8, ClimbSlope9, CurrentlyRidingDolphin, Flight, FlameBracelet, FormBridge, GasMask, GlowingLamp, InjuredDolphin, LeadingChild, LeatherBoots, Money, OpenedCrypt, RabbitBoots, Refresh, RepairedStatue, RescuedChild, ShellFlute, ShieldRing, ShootingStatue, StormBracelet, Sword, SwordOfFire, SwordOfThunder, SwordOfWater, SwordOfWind, TornadoBracelet, TravelSwamp, WildWarp, }, items: { MedicalHerb, WarpBoots, }, } = this.rom;
        const start = this.entrance(MezameShrine);
        const enterOak = this.entrance(Oak);
        this.addCheck([start], and(BowOfMoon, BowOfSun), [OpenedCrypt.id]);
        this.addCheck([start], and(AbleToRideDolphin, ShellFlute), [CurrentlyRidingDolphin.id]);
        this.addCheck([enterOak], and(LeadingChild), [RescuedChild.id]);
        this.addItemCheck([start], and(GlowingLamp, BrokenStatue), RepairedStatue.id, { lossy: true, unique: true });
        for (const shop of this.rom.shops) {
            if (shop.location === Leaf_ToolShop.id)
                continue;
            if (shop.location === Shyron_ToolShop.id)
                continue;
            if (!shop.used)
                continue;
            if (shop.type !== ShopType.TOOL)
                continue;
            const hitbox = [TileId(shop.location << 16 | 0x88)];
            for (const item of shop.contents) {
                if (item === MedicalHerb.id) {
                    this.addCheck(hitbox, Money.r, [BuyHealing.id]);
                }
                else if (item === WarpBoots.id) {
                    this.addCheck(hitbox, Money.r, [BuyWarp.id]);
                }
            }
        }
        let breakStone = SwordOfWind.r;
        let breakIce = SwordOfFire.r;
        let formBridge = SwordOfWater.r;
        let breakIron = SwordOfThunder.r;
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
                const level2 = Requirement.or(breakStone, breakIce, formBridge, breakIron);
                function need(sword) {
                    return level2.map((c) => c[0] === sword.c ? c : [sword.c, ...c]);
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
        this.addCheck([start], or(SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder), [Sword.id, Money.id]);
        this.addCheck([start], Flight.r, [ClimbWaterfall.id]);
        this.addCheck([start], or(Flight, RabbitBoots), [ClimbSlope8.id]);
        this.addCheck([start], or(Flight, RabbitBoots), [ClimbSlope9.id]);
        this.addCheck([start], Barrier.r, [ShootingStatue.id]);
        this.addCheck([start], GasMask.r, [TravelSwamp.id]);
        if (this.flagset.leatherBootsGiveSpeed()) {
            this.addCheck([start], LeatherBoots.r, [ClimbSlope8.id]);
        }
        if (this.flagset.assumeGhettoFlight()) {
            this.addCheck([start], and(CurrentlyRidingDolphin, RabbitBoots), [ClimbWaterfall.id]);
        }
        if (this.flagset.fogLampNotRequired()) {
            const requireHealed = this.flagset.requireHealedDolphinToRide();
            this.addCheck([start], requireHealed ? InjuredDolphin.r : [[]], [AbleToRideDolphin.id]);
        }
        if (!this.flagset.guaranteeBarrier()) {
            this.addCheck([start], [[Money.c, BuyHealing.c],
                [Money.c, ShieldRing.c],
                [Money.c, Refresh.c]], [ShootingStatue.id]);
        }
        if (!this.flagset.assumeFlightStatueSkip()) {
            this.addCheck([start], [[Money.c, Flight.c]], [ShootingStatue.id]);
        }
        if (!this.flagset.guaranteeGasMask()) {
            this.addCheck([start], [[Money.c, BuyHealing.c],
                [Money.c, Refresh.c]], [TravelSwamp.id]);
        }
        if (this.flagset.assumeWildWarp()) {
            this.addCheck([start], Requirement.OPEN, [WildWarp.id]);
        }
    }
    addExtraRoutes() {
        var _a;
        const { flags: { BuyWarp, SwordOfThunder, Teleport, WildWarp }, locations: { MezameShrine }, } = this.rom;
        this.addRoute(new Route(this.entrance(MezameShrine), []));
        if (this.flagset.teleportOnThunderSword()) {
            const warp = this.rom.townWarp.thunderSwordWarp;
            this.addRoute(new Route(this.entrance(warp[0], warp[1] & 0x1f), [SwordOfThunder.c, BuyWarp.c]));
            this.addRoute(new Route(this.entrance(warp[0], warp[1] & 0x1f), [SwordOfThunder.c, Teleport.c]));
        }
        if (this.flagset.assumeWildWarp()) {
            for (const location of this.rom.wildWarp.locations) {
                if (location === this.rom.locations.UndergroundChannel.id)
                    continue;
                const entrance = this.entrance(location);
                const terrain = (_a = this.terrains.get(entrance)) !== null && _a !== void 0 ? _a : die('bad entrance');
                for (const route of terrain.enter) {
                    this.addRoute(new Route(entrance, [WildWarp.c, ...route]));
                }
            }
        }
    }
    consolidateChecks() {
        for (const [tile, checks] of this.checks) {
            const root = this.tiles.find(tile);
            if (tile === root)
                continue;
            for (const check of checks) {
                this.checks.get(root).add(check);
            }
            this.checks.delete(tile);
        }
    }
    buildRequirementMap() {
        for (const [tile, checkSet] of this.checks) {
            for (const { checks, requirement } of checkSet) {
                for (const check of checks) {
                    const req = this.requirementMap.get(check);
                    for (const r1 of requirement) {
                        for (const r2 of this.routes.get(tile) || []) {
                            req.addList([...r1, ...r2]);
                        }
                    }
                }
            }
        }
        if (!DEBUG)
            return;
        const log = [];
        for (const [check, req] of this.requirementMap) {
            const name = (c) => this.rom.flags[c].name;
            for (const route of req) {
                log.push(`${name(check)}: ${[...route].map(name).join(' & ')}\n`);
            }
        }
        log.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
        console.log(log.join(''));
    }
    getLocationList(worldName = 'Crystalis') {
        const checkName = DEBUG ? (f) => f.debug : (f) => f.name;
        return {
            worldName,
            requirements: this.requirementMap,
            items: this.items,
            slots: this.slots,
            checkName: (check) => checkName(this.rom.flags[check]),
            prefill: (random) => {
                const { Crystalis, MesiaInTower, LeafElder } = this.rom.flags;
                const map = new Map([[MesiaInTower.id, Crystalis.id]]);
                if (this.flagset.guaranteeSword()) {
                    map.set(LeafElder.id, 0x200 | random.nextInt(4));
                }
                return map;
            },
        };
    }
    processLocation(location) {
        if (!location.used)
            return;
        this.processLocationTiles(location);
        this.processLocationSpawns(location);
        this.processLocationItemUses(location);
    }
    unionNeighbors() {
        for (const [tile, terrain] of this.terrains) {
            const x1 = TileId.add(tile, 0, 1);
            if (this.terrains.get(x1) === terrain)
                this.tiles.union([tile, x1]);
            const y1 = TileId.add(tile, 1, 0);
            if (this.terrains.get(y1) === terrain)
                this.tiles.union([tile, y1]);
        }
    }
    addAllRoutes() {
        this.addExtraRoutes();
        for (const [pair, dirs] of this.neighbors) {
            const [c0, c1] = TilePair.split(pair);
            const t0 = this.terrains.get(c0);
            const t1 = this.terrains.get(c1);
            if (!t0 || !t1)
                throw new Error(`missing terrain ${hex(t0 ? c0 : c1)}`);
            for (const [dir, exitReq] of t0.exit) {
                if (!(dir & dirs))
                    continue;
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
    getWorldData() {
        let index = 0;
        const tiles = new DefaultMap(() => ({}));
        const locations = seq(256, () => ({ areas: new Set(), tiles: new Set() }));
        const areas = [];
        for (const set of this.tiles.sets()) {
            const canonical = this.tiles.find(iters.first(set));
            const terrain = this.terrains.get(canonical);
            if (!terrain)
                continue;
            const routes = this.routes.has(canonical) ?
                Requirement.freeze(this.routes.get(canonical)) : [];
            if (!routes.length)
                continue;
            const area = {
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
        for (const [a, b] of this.exits) {
            if (tiles.has(a)) {
                tiles.get(a).exit = b;
            }
        }
        for (const [tile, checkSet] of this.checks) {
            const area = tiles.get(tile).area;
            if (!area) {
                continue;
            }
            for (const { checks, requirement } of checkSet) {
                for (const check of checks) {
                    const flag = this.rom.flags[check] || die();
                    area.checks.push([flag, requirement]);
                }
            }
        }
        return { tiles, areas, locations };
    }
    addRoute(route, source) {
        if (source != null) {
            this.routeEdges.get(source).add(route);
            for (const srcRoute of this.routes.get(source)) {
                this.addRoute(new Route(route.target, [...srcRoute, ...route.deps]));
            }
            return;
        }
        const queue = new LabeledSet();
        const seen = new LabeledSet();
        const start = route;
        queue.add(start);
        const iter = queue[Symbol.iterator]();
        while (true) {
            const { value, done } = iter.next();
            if (done)
                return;
            seen.add(value);
            queue.delete(value);
            const follow = new LabeledSet();
            const target = value.target;
            const builder = this.routes.get(target);
            if (builder.addRoute(value)) {
                for (const next of this.routeEdges.get(target)) {
                    follow.add(new Route(next.target, [...value.deps, ...next.deps]));
                }
            }
            for (const next of follow) {
                if (seen.has(next))
                    continue;
                queue.delete(next);
                queue.add(next);
            }
        }
    }
    recordExits() {
        for (const [from, to] of this.exits) {
            this.exitSet.add(TilePair.of(this.tiles.find(from), this.tiles.find(to)));
        }
        for (const exit of this.exitSet) {
            const [from, to] = TilePair.split(exit);
            if (this.terrains.get(from) !== this.terrains.get(to))
                continue;
            const reverse = TilePair.of(to, from);
            if (this.exitSet.has(reverse)) {
                this.tiles.union([from, to]);
                this.exitSet.delete(exit);
                this.exitSet.delete(reverse);
            }
        }
    }
    buildNeighbors() {
        for (const [tile, terrain] of this.terrains) {
            if (!terrain)
                continue;
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
        for (const exit of this.exitSet) {
            const [t0, t1] = TilePair.split(exit);
            if (!this.terrains.has(t0) || !this.terrains.has(t1))
                continue;
            const p = TilePair.of(this.tiles.find(t0), this.tiles.find(t1));
            this.neighbors.set(p, this.neighbors.get(p) | 1);
        }
    }
    handleAdjacentNeighbors(t0, t1, dir) {
        const c0 = this.tiles.find(t0);
        const c1 = this.tiles.find(t1);
        if (!this.seamlessExits.has(t1)) {
            const p10 = TilePair.of(c1, c0);
            this.neighbors.set(p10, this.neighbors.get(p10) | (1 << dir));
        }
        if (!this.seamlessExits.has(t0)) {
            const opp = dir ^ 2;
            const p01 = TilePair.of(c0, c1);
            this.neighbors.set(p01, this.neighbors.get(p01) | (1 << opp));
        }
    }
    processLocationTiles(location) {
        var _a, _b, _c;
        const walls = new Map();
        const shootingStatues = new Set();
        const inTower = (location.id & 0xf8) === 0x58;
        for (const spawn of location.spawns) {
            if (spawn.isWall()) {
                walls.set(ScreenId.from(location, spawn), (spawn.id & 3));
            }
            else if (spawn.isMonster() && spawn.id === 0x3f) {
                shootingStatues.add(ScreenId.from(location, spawn));
            }
        }
        const tileset = this.rom.tilesets[location.tileset];
        const tileEffects = this.rom.tileEffects[location.tileEffects - 0xb3];
        const getEffects = (tile) => {
            const s = location.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8];
            return tileEffects.effects[this.rom.screens[s].tiles[tile & 0xff]];
        };
        const makeTerrain = (effects, tile, barrier) => {
            effects &= Terrain.BITS;
            if (location.id === 0x1a)
                effects |= Terrain.SWAMP;
            if (location.id === 0x60 || location.id === 0x68) {
                effects |= Terrain.DOLPHIN;
            }
            if (location.id === 0x64 && ((tile & 0xf0f0) < 0x1030)) {
                effects |= Terrain.DOLPHIN;
            }
            if (barrier)
                effects |= Terrain.BARRIER;
            if (!(effects & Terrain.DOLPHIN) && effects & Terrain.SLOPE) {
                let bottom = tile;
                let height = 0;
                while (getEffects(bottom) & Terrain.SLOPE) {
                    bottom = TileId.add(bottom, 1, 0);
                    height++;
                }
                if (height < 6) {
                    effects &= ~Terrain.SLOPE;
                }
                else if (height < 9) {
                    effects |= Terrain.SLOPE8;
                }
                else if (height < 10) {
                    effects |= Terrain.SLOPE9;
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
                const barrier = shootingStatues.has(screenId);
                const flagYx = screenId & 0xff;
                const wall = walls.get(screenId);
                const flag = inTower ? this.rom.flags.AlwaysTrue.id :
                    wall != null ? this.wallCapability(wall) : (_a = location.flags.find(f => f.screen === flagYx)) === null || _a === void 0 ? void 0 : _a.flag;
                const logic = (_c = (_b = this.rom.flags[flag]) === null || _b === void 0 ? void 0 : _b.logic) !== null && _c !== void 0 ? _c : {};
                for (let t = 0; t < 0xf0; t++) {
                    const tid = TileId(screenId << 8 | t);
                    let tile = screen.tiles[t];
                    if (logic.assumeTrue && tile < 0x20) {
                        tile = tileset.alternates[tile];
                    }
                    const effects = location.isShop() ? 0 : tileEffects.effects[tile] & 0x26;
                    let terrain = makeTerrain(effects, tid, barrier);
                    if (tile < 0x20 && tileset.alternates[tile] !== tile &&
                        flag != null && !logic.assumeTrue && !logic.assumeFalse) {
                        const alternate = makeTerrain(tileEffects.effects[tileset.alternates[tile]], tid, barrier);
                        if (alternate) {
                            terrain =
                                this.terrainFactory.flag(terrain, logic.track ? flag : -1, alternate);
                        }
                    }
                    if (terrain)
                        this.terrains.set(tid, terrain);
                }
            }
        }
        for (const exit of location.exits) {
            const { dest, entrance } = exit;
            const from = TileId.from(location, exit);
            let to;
            if (exit.isSeamless()) {
                to = TileId(from & 0xffff | (dest << 16));
                const tile = TileId.from(location, exit);
                this.seamlessExits.add(tile);
                const previous = this.terrains.get(tile);
                if (previous) {
                    this.terrains.set(tile, this.terrainFactory.seamless(previous));
                }
            }
            else {
                to = this.entrance(this.rom.locations[dest], entrance & 0x1f);
            }
            this.exits.set(from, to);
        }
    }
    processLocationSpawns(location) {
        for (const spawn of location.spawns) {
            if (spawn.isTrigger()) {
                this.processTrigger(location, spawn);
            }
            else if (spawn.isNpc()) {
                this.processNpc(location, spawn);
            }
            else if (spawn.isBoss()) {
                this.processBoss(location, spawn);
            }
            else if (spawn.isChest()) {
                this.processChest(location, spawn);
            }
            else if (spawn.isMonster()) {
                this.processMonster(location, spawn);
            }
            else if (spawn.type === 3 && spawn.id === 0xe0) {
                this.processKeyUse(Hitbox.screen(TileId.from(location, spawn)), this.rom.flags.UsedWindmillKey.r);
            }
        }
    }
    processTrigger(location, spawn) {
        const trigger = this.rom.trigger(spawn.id);
        if (!trigger)
            throw new Error(`Missing trigger ${spawn.id.toString(16)}`);
        const requirements = this.filterRequirements(trigger.conditions);
        let antiRequirements = this.filterAntiRequirements(trigger.conditions);
        const tile = TileId.from(location, spawn);
        let hitbox = Hitbox.trigger(location, spawn);
        const checks = [];
        for (const flag of trigger.flags) {
            const f = this.flag(flag);
            if (f === null || f === void 0 ? void 0 : f.logic.track) {
                checks.push(f.id);
            }
        }
        if (checks.length)
            this.addCheck(hitbox, requirements, checks);
        switch (trigger.message.action) {
            case 0x19:
                if (trigger.id === 0x86 && !this.flagset.assumeRabbitSkip()) {
                    hitbox = Hitbox.adjust(hitbox, [0, -1], [0, 1]);
                }
                else if (trigger.id === 0xba &&
                    !this.flagset.assumeTeleportSkip() &&
                    !this.flagset.disableTeleportSkip()) {
                    hitbox = Hitbox.atLocation(hitbox, this.rom.locations.CordelPlainEast, this.rom.locations.CordelPlainWest);
                }
                this.addTerrain(hitbox, this.terrainFactory.statue(antiRequirements));
                break;
            case 0x1d:
                this.addBossCheck(hitbox, this.rom.bosses.Mado1, requirements);
                break;
            case 0x08:
            case 0x0b:
            case 0x0c:
            case 0x0d:
            case 0x0f:
                this.addItemGrantChecks(hitbox, requirements, trigger.id);
                break;
            case 0x18: {
                const req = this.flagset.chargeShotsOnly() ?
                    Requirement.meet(requirements, and(this.rom.flags.WarpBoots)) :
                    requirements;
                this.addItemCheck(hitbox, req, this.rom.flags.StomFightReward.id, { lossy: true, unique: true });
                break;
            }
            case 0x1e:
                this.addItemCheck(hitbox, requirements, this.rom.flags.MesiaInTower.id, { lossy: true, unique: true });
                break;
            case 0x1f:
                this.handleBoat(tile, location, requirements);
                break;
            case 0x1b:
                if (location === this.rom.locations.Portoa_PalaceEntrance) {
                    hitbox = Hitbox.adjust(hitbox, [-2, 0]);
                    antiRequirements = this.rom.flags.TalkedToFortuneTeller.r;
                }
                this.handleMovingGuard(hitbox, location, antiRequirements);
                break;
        }
        for (const [item, use] of this.itemUses.get(spawn.type << 8 | spawn.id)) {
            this.processItemUse([TileId.from(location, spawn)], Requirement.OPEN, item, use);
        }
    }
    processNpc(location, spawn) {
        var _a, _b, _c;
        const npc = this.rom.npcs[spawn.id];
        if (!npc || !npc.used)
            throw new Error(`Unknown npc: ${hex(spawn.id)}`);
        const spawnConditions = npc.spawnConditions.get(location.id) || [];
        const req = this.filterRequirements(spawnConditions);
        const tile = TileId.from(location, spawn);
        let hitbox = [this.terrains.has(tile) ? tile : (_a = this.walkableNeighbor(tile)) !== null && _a !== void 0 ? _a : tile];
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
                hitbox = Hitbox.adjust(hitbox, [2, -1], [2, 0], [2, 1], [2, 2]);
                hitbox = Hitbox.adjust(hitbox, [0, -6], [0, -2], [0, 2], [0, 6]);
                if (this.flagset.assumeRageSkip())
                    antiReq = undefined;
            }
            else if (npc === this.rom.npcs.PortoaThroneRoomBackDoorGuard) {
                antiReq = or(this.rom.flags.MesiaRecording, this.rom.flags.Paralysis);
            }
            if (antiReq)
                this.addTerrain(hitbox, this.terrainFactory.statue(antiReq));
        }
        if (npc === this.rom.npcs.FortuneTeller) {
            hitbox = Hitbox.adjust(hitbox, [0, 0], [2, 0]);
        }
        if (Requirement.isClosed(req))
            return;
        const [[...conds]] = req;
        for (const d of npc.globalDialogs) {
            const f = this.flag(~d.condition);
            if (!(f === null || f === void 0 ? void 0 : f.logic.track))
                continue;
            conds.push(f.id);
        }
        const locals = (_c = (_b = npc.localDialogs.get(location.id)) !== null && _b !== void 0 ? _b : npc.localDialogs.get(-1)) !== null && _c !== void 0 ? _c : [];
        for (const d of locals) {
            const r = [...conds];
            const f0 = this.flag(d.condition);
            if (f0 === null || f0 === void 0 ? void 0 : f0.logic.track) {
                r.push(f0.id);
            }
            this.processDialog(hitbox, npc, r, d);
            const f1 = this.flag(~d.condition);
            if (f1 === null || f1 === void 0 ? void 0 : f1.logic.track) {
                conds.push(f1.id);
            }
        }
    }
    processDialog(hitbox, npc, req, dialog) {
        this.addCheckFromFlags(hitbox, [req], dialog.flags);
        const info = { lossy: true, unique: true };
        switch (dialog.message.action) {
            case 0x08:
                this.processKeyUse(hitbox, [req]);
                break;
            case 0x14:
                this.addItemCheck(hitbox, [req], this.rom.flags.SlimedKensu.id, info);
                break;
            case 0x10:
                this.addItemCheck(hitbox, [req], this.rom.flags.AsinaInBackRoom.id, info);
                break;
            case 0x11:
                this.addItemCheck(hitbox, [req], 0x100 | npc.data[1], info);
                break;
            case 0x03:
            case 0x0a:
                this.addItemCheck(hitbox, [req], 0x100 | npc.data[0], info);
                break;
            case 0x09:
                const item = npc.data[1];
                if (item !== 0xff)
                    this.addItemCheck(hitbox, [req], 0x100 | item, info);
                break;
            case 0x19:
                this.addItemCheck(hitbox, [req], this.rom.flags.AkahanaFluteOfLimeTradein.id, info);
                break;
            case 0x1a:
                this.addItemCheck(hitbox, [req], this.rom.flags.Rage.id, info);
                break;
            case 0x1b:
                break;
        }
    }
    processLocationItemUses(location) {
        for (const [item, use] of this.itemUses.get(~location.id)) {
            this.processItemUse([this.entrance(location)], Requirement.OPEN, item, use);
        }
    }
    handleMovingGuard(hitbox, location, req) {
        if (this.flagset.assumeStatueGlitch())
            return;
        const extra = [];
        for (const spawn of location.spawns.slice(0, 2)) {
            if (spawn.isNpc() && this.rom.npcs[spawn.id].isParalyzable()) {
                extra.push([this.rom.flags.Paralysis.id]);
                break;
            }
        }
        this.addTerrain(hitbox, this.terrainFactory.statue([...req, ...extra].map(spread)));
    }
    handleBoat(tile, location, requirements) {
        const t0 = this.walkableNeighbor(tile);
        if (t0 == null)
            throw new Error(`Could not find walkable neighbor.`);
        const yt = (tile >> 8) & 0xf0 | (tile >> 4) & 0xf;
        const xt = (tile >> 4) & 0xf0 | tile & 0xf;
        let boatExit;
        for (const exit of location.exits) {
            if (exit.yt === yt && exit.xt < xt)
                boatExit = exit;
        }
        if (!boatExit)
            throw new Error(`Could not find boat exit`);
        const dest = this.rom.locations[boatExit.dest];
        if (!dest)
            throw new Error(`Bad destination`);
        const entrance = dest.entrances[boatExit.entrance];
        const entranceTile = TileId.from(dest, entrance);
        let t = entranceTile;
        while (true) {
            t = TileId.add(t, 0, -1);
            const t1 = this.walkableNeighbor(t);
            if (t1 != null) {
                const boat = {
                    enter: Requirement.freeze(requirements),
                    exit: [[0xf, Requirement.OPEN]],
                };
                this.addTerrain([t0], boat);
                this.exits.set(t0, t1);
                this.exitSet.add(TilePair.of(t0, t1));
                this.exits.set(entranceTile, t1);
                this.exitSet.add(TilePair.of(entranceTile, t1));
                this.terrains.set(entranceTile, this.terrainFactory.tile(0));
                return;
            }
        }
    }
    addItemGrantChecks(hitbox, req, grantId) {
        const item = this.itemGrant(grantId);
        const slot = 0x100 | item;
        if (item == null) {
            throw new Error(`missing item grant for ${grantId.toString(16)}`);
        }
        const preventLoss = grantId >= 0x80;
        this.addItemCheck(hitbox, req, slot, { lossy: true, unique: true, preventLoss });
    }
    addTerrain(hitbox, terrain) {
        for (const tile of hitbox) {
            const t = this.terrains.get(tile);
            if (t == null)
                continue;
            this.terrains.set(tile, this.terrainFactory.meet(t, terrain));
        }
    }
    addCheck(hitbox, requirement, checks) {
        if (Requirement.isClosed(requirement))
            return;
        const check = { requirement: Requirement.freeze(requirement), checks };
        for (const tile of hitbox) {
            if (!this.terrains.has(tile))
                continue;
            this.checks.get(tile).add(check);
        }
    }
    addItemCheck(hitbox, requirement, check, slot) {
        this.addCheck(hitbox, requirement, [check]);
        this.slots.set(check, slot);
        const itemget = this.rom.itemGets[this.rom.slots[check & 0xff]];
        const item = this.rom.items[itemget.itemId];
        const unique = item === null || item === void 0 ? void 0 : item.unique;
        const losable = itemget.isLosable();
        const preventLoss = unique || item === this.rom.items.OpelStatue;
        let weight = 1;
        if (item === this.rom.items.SwordOfWind)
            weight = 5;
        if (item === this.rom.items.SwordOfFire)
            weight = 5;
        if (item === this.rom.items.SwordOfWater)
            weight = 10;
        if (item === this.rom.items.SwordOfThunder)
            weight = 15;
        if (item === this.rom.items.Flight)
            weight = 15;
        this.items.set(0x200 | itemget.id, { unique, losable, preventLoss, weight });
    }
    addCheckFromFlags(hitbox, requirement, flags) {
        const checks = [];
        for (const flag of flags) {
            const f = this.flag(flag);
            if (f === null || f === void 0 ? void 0 : f.logic.track) {
                checks.push(f.id);
            }
        }
        if (checks.length)
            this.addCheck(hitbox, requirement, checks);
    }
    walkableNeighbor(t) {
        if (this.isWalkable(t))
            return t;
        for (let d of [-1, 1]) {
            const t1 = TileId.add(t, d, 0);
            const t2 = TileId.add(t, 0, d);
            if (this.isWalkable(t1))
                return t1;
            if (this.isWalkable(t2))
                return t2;
        }
        return undefined;
    }
    isWalkable(t) {
        return !(this.getEffects(t) & Terrain.BITS);
    }
    ensurePassable(t) {
        var _a;
        return this.isWalkable(t) ? t : (_a = this.walkableNeighbor(t)) !== null && _a !== void 0 ? _a : t;
    }
    getEffects(t) {
        const location = this.rom.locations[t >>> 16];
        const effects = this.rom.tileEffects[location.tileEffects - 0xb3].effects;
        const scr = location.screens[(t & 0xf000) >>> 12][(t & 0xf00) >>> 8];
        return effects[this.rom.screens[scr].tiles[t & 0xff]];
    }
    processBoss(location, spawn) {
        if (spawn.id === 0xc9 || spawn.id === 0xca)
            return;
        const isRage = spawn.id === 0xc3;
        const boss = isRage ? this.rom.bosses.Rage :
            this.rom.bosses.fromLocation(location.id);
        const tile = TileId.from(location, spawn);
        if (!boss || !boss.flag)
            throw new Error(`Bad boss at ${location.name}`);
        const screen = tile & ~0xff;
        const bossTerrain = this.terrainFactory.boss(boss.flag.id);
        const hitbox = seq(0xf0, (t) => (screen | t));
        this.addTerrain(hitbox, bossTerrain);
        this.addBossCheck(hitbox, boss);
    }
    addBossCheck(hitbox, boss, requirements = Requirement.OPEN) {
        if (boss.flag == null)
            throw new Error(`Expected a flag: ${boss}`);
        const req = Requirement.meet(requirements, this.bossRequirements(boss));
        if (boss === this.rom.bosses.Draygon2) {
            this.addCheck(hitbox, req, [boss.flag.id]);
        }
        else {
            this.addItemCheck(hitbox, req, boss.flag.id, { lossy: false, unique: true });
        }
    }
    processChest(location, spawn) {
        if (this.rom.slots[spawn.id] >= 0x70)
            return;
        const slot = 0x100 | spawn.id;
        const mapped = this.rom.slots[spawn.id];
        if (mapped >= 0x70)
            return;
        const item = this.rom.items[mapped];
        const unique = this.flagset.preserveUniqueChecks() ? !!(item === null || item === void 0 ? void 0 : item.unique) : true;
        this.addItemCheck([TileId.from(location, spawn)], Requirement.OPEN, slot, { lossy: false, unique });
    }
    processMonster(_location, _spawn) {
    }
    processItemUse(hitbox, req1, item, use) {
        hitbox = new Set([...hitbox].map(t => { var _a; return (_a = this.walkableNeighbor(t)) !== null && _a !== void 0 ? _a : t; }));
        const req2 = [[(0x200 | item.id)]];
        if (item.id === this.rom.prg[0x3d4b5] + 0x1c) {
            req2[0].push(this.rom.flags.Change.c);
        }
        if (item === this.rom.items.MedicalHerb) {
            req2[0][0] = this.rom.flags.BuyHealing.c;
        }
        const req = Requirement.meet(req1, req2);
        this.addCheckFromFlags(hitbox, req, use.flags);
        switch (use.message.action) {
            case 0x10:
                this.processKeyUse(hitbox, req);
                break;
            case 0x08:
            case 0x0b:
            case 0x0c:
            case 0x0d:
            case 0x0f:
            case 0x1c:
                this.addItemGrantChecks(hitbox, req, item.id);
                break;
            case 0x02:
                this.addItemCheck(hitbox, req, 0x100 | this.rom.npcs[use.want & 0xff].data[1], { lossy: true, unique: true });
                break;
        }
    }
    processKeyUse(hitbox, req) {
        const [screen, ...rest] = new Set([...hitbox].map(t => ScreenId.from(t)));
        if (screen == null || rest.length)
            throw new Error(`Expected one screen`);
        const location = this.rom.locations[screen >>> 8];
        const flag = location.flags.find(f => f.screen === (screen & 0xff));
        if (flag == null)
            throw new Error(`Expected flag on screen`);
        this.addCheck(hitbox, req, [flag.flag]);
    }
    bossRequirements(boss) {
        if (boss === this.rom.bosses.Rage) {
            const unknownSword = this.tracker && this.flagset.randomizeTrades();
            if (unknownSword)
                return this.rom.flags.Sword.r;
            return [[this.rom.npcs.Rage.dialog()[0].condition]];
        }
        const id = boss.object;
        const r = new Requirement.Builder();
        if (this.tracker && this.flagset.shuffleBossElements() ||
            !this.flagset.guaranteeMatchingSword()) {
            r.addAll(this.rom.flags.Sword.r);
        }
        else {
            const level = this.flagset.guaranteeSwordMagic() ? boss.swordLevel : 1;
            const obj = this.rom.objects[id];
            for (let i = 0; i < 4; i++) {
                if (obj.isVulnerable(i))
                    r.addAll(this.swordRequirement(i, level));
            }
        }
        const extra = [];
        if (boss.npc != null && boss.location != null) {
            const spawnCondition = boss.npc.spawns(this.rom.locations[boss.location]);
            extra.push(...this.filterRequirements(spawnCondition)[0]);
        }
        if (boss === this.rom.bosses.Insect) {
            extra.push(this.rom.flags.InsectFlute.c, this.rom.flags.GasMask.c);
        }
        else if (boss === this.rom.bosses.Draygon2) {
            extra.push(this.rom.flags.BowOfTruth.c);
        }
        if (this.flagset.guaranteeRefresh()) {
            extra.push(this.rom.flags.Refresh.c);
        }
        r.restrict([extra]);
        return Requirement.freeze(r);
    }
    swordRequirement(element, level) {
        const sword = [
            this.rom.flags.SwordOfWind, this.rom.flags.SwordOfFire,
            this.rom.flags.SwordOfWater, this.rom.flags.SwordOfThunder,
        ][element];
        if (level === 1)
            return sword.r;
        const powers = [
            [this.rom.flags.BallOfWind, this.rom.flags.TornadoBracelet],
            [this.rom.flags.BallOfFire, this.rom.flags.FlameBracelet],
            [this.rom.flags.BallOfWater, this.rom.flags.BlizzardBracelet],
            [this.rom.flags.BallOfThunder, this.rom.flags.StormBracelet],
        ][element];
        if (level === 3)
            return and(sword, ...powers);
        return powers.map(power => [sword.c, power.c]);
    }
    itemGrant(id) {
        for (const [key, value] of this.rom.itemGets.actionGrants) {
            if (key === id)
                return value;
        }
        throw new Error(`Could not find item grant ${id.toString(16)}`);
    }
    filterRequirements(flags) {
        var _a;
        const conds = [];
        for (const flag of flags) {
            if (flag < 0) {
                const logic = (_a = this.flag(~flag)) === null || _a === void 0 ? void 0 : _a.logic;
                if (logic === null || logic === void 0 ? void 0 : logic.assumeTrue)
                    return Requirement.CLOSED;
            }
            else {
                const f = this.flag(flag);
                if (f === null || f === void 0 ? void 0 : f.logic.assumeFalse)
                    return Requirement.CLOSED;
                if (f === null || f === void 0 ? void 0 : f.logic.track)
                    conds.push(f.id);
            }
        }
        return [conds];
    }
    filterAntiRequirements(flags) {
        var _a;
        const req = [];
        for (const flag of flags) {
            if (flag >= 0) {
                const logic = (_a = this.flag(~flag)) === null || _a === void 0 ? void 0 : _a.logic;
                if (logic === null || logic === void 0 ? void 0 : logic.assumeFalse)
                    return Requirement.OPEN;
            }
            else {
                const f = this.flag(~flag);
                if (f === null || f === void 0 ? void 0 : f.logic.assumeTrue)
                    return Requirement.OPEN;
                if (f === null || f === void 0 ? void 0 : f.logic.track)
                    req.push([f.id]);
            }
        }
        return req;
    }
    flag(flag) {
        var _a;
        const unsigned = flag;
        const f = this.rom.flags[unsigned];
        const mapped = (_a = this.aliases.get(f)) !== null && _a !== void 0 ? _a : f;
        return mapped;
    }
    entrance(location, index = 0) {
        if (typeof location === 'number')
            location = this.rom.locations[location];
        return this.tiles.find(TileId.from(location, location.entrances[index]));
    }
    wallCapability(wall) {
        switch (wall) {
            case WallType.WIND: return this.rom.flags.BreakStone.id;
            case WallType.FIRE: return this.rom.flags.BreakIce.id;
            case WallType.WATER: return this.rom.flags.FormBridge.id;
            case WallType.THUNDER: return this.rom.flags.BreakIron.id;
            default: throw new Error(`bad wall type: ${wall}`);
        }
    }
}
function and(...flags) {
    return [flags.map((f) => f.id)];
}
function or(...flags) {
    return flags.map((f) => [f.id]);
}
const DEBUG = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBZWpCLE1BQU0sT0FBTyxLQUFLO0lBbUVoQixZQUFxQixHQUFRLEVBQVcsT0FBZ0IsRUFDbkMsVUFBVSxLQUFLO1FBRGYsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFXLFlBQU8s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QUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNQLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsRUFDMUQsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUs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QUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUFFLFNBQVM7WUFDL0QsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNsRDtJQUNILENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEdBQVE7UUFFdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBRS9CLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQy9EO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBRS9CLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFD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LENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN0RCxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDekQsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzFELE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFHLEtBQWE7SUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLEtBQWE7SUFDMUIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFVRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FyZWF9IGZyb20gJy4uL3Nwb2lsZXIvYXJlYS5qcyc7XG5pbXBvcnQge2RpZX0gZnJvbSAnLi4vYXNzZXJ0LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7RmxhZywgTG9naWN9IGZyb20gJy4uL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0l0ZW0sIEl0ZW1Vc2V9IGZyb20gJy4uL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtMb2NhbERpYWxvZywgTnBjfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4LCBzZXF9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwLCBMYWJlbGVkU2V0LCBpdGVycywgc3ByZWFkfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7RGlyfSBmcm9tICcuL2Rpci5qcyc7XG5pbXBvcnQge0l0ZW1JbmZvLCBMb2NhdGlvbkxpc3QsIFNsb3RJbmZvfSBmcm9tICcuL2dyYXBoLmpzJztcbmltcG9ydCB7SGl0Ym94fSBmcm9tICcuL2hpdGJveC5qcyc7XG5pbXBvcnQge0NvbmRpdGlvbiwgUmVxdWlyZW1lbnQsIFJvdXRlfSBmcm9tICcuL3JlcXVpcmVtZW50LmpzJztcbmltcG9ydCB7U2NyZWVuSWR9IGZyb20gJy4vc2NyZWVuaWQuanMnO1xuaW1wb3J0IHtUZXJyYWluLCBUZXJyYWluc30gZnJvbSAnLi90ZXJyYWluLmpzJztcbmltcG9ydCB7VGlsZUlkfSBmcm9tICcuL3RpbGVpZC5qcyc7XG5pbXBvcnQge1RpbGVQYWlyfSBmcm9tICcuL3RpbGVwYWlyLmpzJztcbmltcG9ydCB7V2FsbFR5cGV9IGZyb20gJy4vd2FsbHR5cGUuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG5pbnRlcmZhY2UgQ2hlY2sge1xuICByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQ7XG4gIGNoZWNrczogbnVtYmVyW107XG59XG5cbi8vIEJhc2ljIGFsZ29yaXRobTpcbi8vICAxLiBmaWxsIHRlcnJhaW5zIGZyb20gbWFwc1xuLy8gIDIuIG1vZGlmeSB0ZXJyYWlucyBiYXNlZCBvbiBucGNzLCB0cmlnZ2VycywgYm9zc2VzLCBldGNcbi8vICAyLiBmaWxsIGFsbEV4aXRzXG4vLyAgMy4gc3RhcnQgdW5pb25maW5kXG4vLyAgNC4gZmlsbCAuLi4/XG5cbi8qKiBTdG9yZXMgYWxsIHRoZSByZWxldmFudCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgd29ybGQncyBsb2dpYy4gKi9cbmV4cG9ydCBjbGFzcyBXb3JsZCB7XG5cbiAgLyoqIEJ1aWxkcyBhbmQgY2FjaGVzIFRlcnJhaW4gb2JqZWN0cy4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbkZhY3RvcnkgPSBuZXcgVGVycmFpbnModGhpcy5yb20pO1xuXG4gIC8qKiBUZXJyYWlucyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSB0ZXJyYWlucyA9IG5ldyBNYXA8VGlsZUlkLCBUZXJyYWluPigpO1xuXG4gIC8qKiBDaGVja3MgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgY2hlY2tzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBTZXQ8Q2hlY2s+PigoKSA9PiBuZXcgU2V0KCkpO1xuXG4gIC8qKiBTbG90IGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBzbG90cyA9IG5ldyBNYXA8bnVtYmVyLCBTbG90SW5mbz4oKTtcbiAgLyoqIEl0ZW0gaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IGl0ZW1zID0gbmV3IE1hcDxudW1iZXIsIEl0ZW1JbmZvPigpO1xuXG4gIC8qKiBGbGFncyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGRpcmVjdCBhbGlhc2VzIGZvciBsb2dpYy4gKi9cbiAgcmVhZG9ubHkgYWxpYXNlczogTWFwPEZsYWcsIEZsYWc+O1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gaXRlbXVzZSB0cmlnZ2VycyB0byB0aGUgaXRlbXVzZSB0aGF0IHdhbnRzIGl0LiAqL1xuICByZWFkb25seSBpdGVtVXNlcyA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgW0l0ZW0sIEl0ZW1Vc2VdW10+KCgpID0+IFtdKTtcblxuICAvKiogUmF3IG1hcHBpbmcgb2YgZXhpdHMsIHdpdGhvdXQgY2Fub25pY2FsaXppbmcuICovXG4gIHJlYWRvbmx5IGV4aXRzID0gbmV3IE1hcDxUaWxlSWQsIFRpbGVJZD4oKTtcblxuICAvKiogTWFwcGluZyBmcm9tIGV4aXRzIHRvIGVudHJhbmNlcy4gIFRpbGVQYWlyIGlzIGNhbm9uaWNhbGl6ZWQuICovXG4gIHJlYWRvbmx5IGV4aXRTZXQgPSBuZXcgU2V0PFRpbGVQYWlyPigpO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgVGlsZUlkcyB3aXRoIHNlYW1sZXNzIGV4aXRzLiAgVGhpcyBpcyB1c2VkIHRvIGVuc3VyZSB0aGVcbiAgICogbG9naWMgdW5kZXJzdGFuZHMgdGhhdCB0aGUgcGxheWVyIGNhbid0IHdhbGsgYWNyb3NzIGFuIGV4aXQgdGlsZVxuICAgKiB3aXRob3V0IGNoYW5naW5nIGxvY2F0aW9ucyAocHJpbWFyaWx5IGZvciBkaXNhYmxpbmcgdGVsZXBvcnRcbiAgICogc2tpcCkuXG4gICAqL1xuICByZWFkb25seSBzZWFtbGVzc0V4aXRzID0gbmV3IFNldDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIFVuaW9uZmluZCBvZiBjb25uZWN0ZWQgY29tcG9uZW50cyBvZiB0aWxlcy4gIE5vdGUgdGhhdCBhbGwgdGhlXG4gICAqIGFib3ZlIHByb3BlcnRpZXMgY2FuIGJlIGJ1aWx0IHVwIGluIHBhcmFsbGVsLCBidXQgdGhlIHVuaW9uZmluZFxuICAgKiBjYW5ub3QgYmUgc3RhcnRlZCB1bnRpbCBhZnRlciBhbGwgdGVycmFpbnMgYW5kIGV4aXRzIGFyZVxuICAgKiByZWdpc3RlcmVkLCBzaW5jZSB3ZSBzcGVjaWZpY2FsbHkgbmVlZCB0byAqbm90KiB1bmlvbiBjZXJ0YWluXG4gICAqIG5laWdoYm9ycy5cbiAgICovXG4gIHJlYWRvbmx5IHRpbGVzID0gbmV3IFVuaW9uRmluZDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBUaWxlUGFpcnMgb2YgY2Fub25pY2FsIHVuaW9uZmluZCByZXByZXNlbnRhdGl2ZSBUaWxlSWRzIHRvXG4gICAqIGEgYml0c2V0IG9mIG5laWdoYm9yIGRpcmVjdGlvbnMuICBXZSBvbmx5IG5lZWQgdG8gd29ycnkgYWJvdXRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgYmVjYXVzZSBhbGwgVGlsZUlkcyBoYXZlIHRoZSBzYW1lIHRlcnJhaW4uXG4gICAqIFdlIHdpbGwgYWRkIGEgcm91dGUgZm9yIGVhY2ggZGlyZWN0aW9uIHdpdGggdW5pcXVlIHJlcXVpcmVtZW50cy5cbiAgICovXG4gIHJlYWRvbmx5IG5laWdoYm9ycyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVQYWlyLCBudW1iZXI+KCgpID0+IDApO1xuXG4gIC8qKiBSZXF1aXJlbWVudCBidWlsZGVyIGZvciByZWFjaGluZyBlYWNoIGNhbm9uaWNhbCBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHJvdXRlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgICgpID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCkpO1xuXG4gIC8qKiBSb3V0ZXMgb3JpZ2luYXRpbmcgZnJvbSBlYWNoIGNhbm9uaWNhbCB0aWxlLiAqL1xuICByZWFkb25seSByb3V0ZUVkZ2VzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgTGFiZWxlZFNldDxSb3V0ZT4+KCgpID0+IG5ldyBMYWJlbGVkU2V0KCkpO1xuXG4gIC8qKiBMb2NhdGlvbiBsaXN0OiB0aGlzIGlzIHRoZSByZXN1bHQgb2YgY29tYmluaW5nIHJvdXRlcyB3aXRoIGNoZWNrcy4gKi9cbiAgcmVhZG9ubHkgcmVxdWlyZW1lbnRNYXAgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8Q29uZGl0aW9uLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoYzogQ29uZGl0aW9uKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcihjKSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sIHJlYWRvbmx5IGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHRyYWNrZXIgPSBmYWxzZSkge1xuICAgIC8vIEJ1aWxkIGl0ZW1Vc2VzXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCB1c2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAodXNlLmtpbmQgPT09ICdleHBlY3QnKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQodXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHVzZS5raW5kID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQofnVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBCdWlsZCBhbGlhc2VzXG4gICAgdGhpcy5hbGlhc2VzID0gbmV3IE1hcChbXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZUFrYWhhbmEsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTb2xkaWVyLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU3RvbSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVdvbWFuLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5UYXZlcm4sIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgIF0pO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBsb2NhdGlvbnMgdG8gYnVpbGQgdXAgaW5mbyBhYm91dCB0aWxlcywgdGVycmFpbnMsIGNoZWNrcy5cbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5hZGRFeHRyYUNoZWNrcygpO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIFVuaW9uRmluZCBhbmQgdGhlIGV4aXRzIGFuZCBuZWlnaGJvcnMgc3RydWN0dXJlcy5cbiAgICB0aGlzLnVuaW9uTmVpZ2hib3JzKCk7XG4gICAgdGhpcy5yZWNvcmRFeGl0cygpO1xuICAgIHRoaXMuYnVpbGROZWlnaGJvcnMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSByb3V0ZXMvZWRnZXMuXG4gICAgdGhpcy5hZGRBbGxSb3V0ZXMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBsb2NhdGlvbiBsaXN0LlxuICAgIHRoaXMuY29uc29saWRhdGVDaGVja3MoKTtcbiAgICB0aGlzLmJ1aWxkUmVxdWlyZW1lbnRNYXAoKTtcbiAgfVxuXG4gIC8qKiBBZGRzIGNoZWNrcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYUNoZWNrcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBsb2NhdGlvbnM6IHtcbiAgICAgICAgTGVhZl9Ub29sU2hvcCxcbiAgICAgICAgTWV6YW1lU2hyaW5lLFxuICAgICAgICBPYWssXG4gICAgICAgIFNoeXJvbl9Ub29sU2hvcCxcbiAgICAgIH0sXG4gICAgICBmbGFnczoge1xuICAgICAgICBBYmxlVG9SaWRlRG9scGhpbixcbiAgICAgICAgQmFsbE9mRmlyZSwgQmFsbE9mVGh1bmRlciwgQmFsbE9mV2F0ZXIsIEJhbGxPZldpbmQsXG4gICAgICAgIEJhcnJpZXIsIEJsaXp6YXJkQnJhY2VsZXQsIEJvd09mTW9vbiwgQm93T2ZTdW4sXG4gICAgICAgIEJyZWFrU3RvbmUsIEJyZWFrSWNlLCBCcmVha0lyb24sXG4gICAgICAgIEJyb2tlblN0YXR1ZSwgQnV5SGVhbGluZywgQnV5V2FycCxcbiAgICAgICAgQ2xpbWJXYXRlcmZhbGwsIENsaW1iU2xvcGU4LCBDbGltYlNsb3BlOSwgQ3VycmVudGx5UmlkaW5nRG9scGhpbixcbiAgICAgICAgRmxpZ2h0LCBGbGFtZUJyYWNlbGV0LCBGb3JtQnJpZGdlLFxuICAgICAgICBHYXNNYXNrLCBHbG93aW5nTGFtcCxcbiAgICAgICAgSW5qdXJlZERvbHBoaW4sXG4gICAgICAgIExlYWRpbmdDaGlsZCwgTGVhdGhlckJvb3RzLFxuICAgICAgICBNb25leSxcbiAgICAgICAgT3BlbmVkQ3J5cHQsXG4gICAgICAgIFJhYmJpdEJvb3RzLCBSZWZyZXNoLCBSZXBhaXJlZFN0YXR1ZSwgUmVzY3VlZENoaWxkLFxuICAgICAgICBTaGVsbEZsdXRlLCBTaGllbGRSaW5nLCBTaG9vdGluZ1N0YXR1ZSwgU3Rvcm1CcmFjZWxldCxcbiAgICAgICAgU3dvcmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mVGh1bmRlciwgU3dvcmRPZldhdGVyLCBTd29yZE9mV2luZCxcbiAgICAgICAgVG9ybmFkb0JyYWNlbGV0LCBUcmF2ZWxTd2FtcCxcbiAgICAgICAgV2lsZFdhcnAsXG4gICAgICB9LFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgTWVkaWNhbEhlcmIsXG4gICAgICAgIFdhcnBCb290cyxcbiAgICAgIH0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpO1xuICAgIGNvbnN0IGVudGVyT2FrID0gdGhpcy5lbnRyYW5jZShPYWspO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEJvd09mTW9vbiwgQm93T2ZTdW4pLCBbT3BlbmVkQ3J5cHQuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGFuZChBYmxlVG9SaWRlRG9scGhpbiwgU2hlbGxGbHV0ZSksXG4gICAgICAgICAgICAgICAgICBbQ3VycmVudGx5UmlkaW5nRG9scGhpbi5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW2VudGVyT2FrXSwgYW5kKExlYWRpbmdDaGlsZCksIFtSZXNjdWVkQ2hpbGQuaWRdKTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbc3RhcnRdLCBhbmQoR2xvd2luZ0xhbXAsIEJyb2tlblN0YXR1ZSksXG4gICAgICAgICAgICAgICAgICAgICAgUmVwYWlyZWRTdGF0dWUuaWQsIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG5cbiAgICAvLyBBZGQgc2hvcHNcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gTGVhZl9Ub29sU2hvcC5pZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gU2h5cm9uX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaGl0Ym94ID0gW1RpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCldO1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IE1lZGljYWxIZXJiLmlkKSB7XG4gICAgICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIE1vbmV5LnIsIFtCdXlIZWFsaW5nLmlkXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gV2FycEJvb3RzLmlkKSB7XG4gICAgICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIE1vbmV5LnIsIFtCdXlXYXJwLmlkXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgcHNldWRvIGZsYWdzXG4gICAgbGV0IGJyZWFrU3RvbmU6IFJlcXVpcmVtZW50ID0gU3dvcmRPZldpbmQucjtcbiAgICBsZXQgYnJlYWtJY2U6IFJlcXVpcmVtZW50ID0gU3dvcmRPZkZpcmUucjtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2F0ZXIucjtcbiAgICBsZXQgYnJlYWtJcm9uOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZUaHVuZGVyLnI7XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQub3Jic09wdGlvbmFsKCkpIHtcbiAgICAgIGNvbnN0IHdpbmQyID0gb3IoQmFsbE9mV2luZCwgVG9ybmFkb0JyYWNlbGV0KTtcbiAgICAgIGNvbnN0IGZpcmUyID0gb3IoQmFsbE9mRmlyZSwgRmxhbWVCcmFjZWxldCk7XG4gICAgICBjb25zdCB3YXRlcjIgPSBvcihCYWxsT2ZXYXRlciwgQmxpenphcmRCcmFjZWxldCk7XG4gICAgICBjb25zdCB0aHVuZGVyMiA9IG9yKEJhbGxPZlRodW5kZXIsIFN0b3JtQnJhY2VsZXQpO1xuICAgICAgYnJlYWtTdG9uZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtTdG9uZSwgd2luZDIpO1xuICAgICAgYnJlYWtJY2UgPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSWNlLCBmaXJlMik7XG4gICAgICBmb3JtQnJpZGdlID0gUmVxdWlyZW1lbnQubWVldChmb3JtQnJpZGdlLCB3YXRlcjIpO1xuICAgICAgYnJlYWtJcm9uID0gUmVxdWlyZW1lbnQubWVldChicmVha0lyb24sIHRodW5kZXIyKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPVxuICAgICAgICAgICAgUmVxdWlyZW1lbnQub3IoYnJlYWtTdG9uZSwgYnJlYWtJY2UsIGZvcm1CcmlkZ2UsIGJyZWFrSXJvbik7XG4gICAgICAgIGZ1bmN0aW9uIG5lZWQoc3dvcmQ6IEZsYWcpOiBSZXF1aXJlbWVudCB7XG4gICAgICAgICAgcmV0dXJuIGxldmVsMi5tYXAoXG4gICAgICAgICAgICAgIChjOiByZWFkb25seSBDb25kaXRpb25bXSkgPT5cbiAgICAgICAgICAgICAgICAgIGNbMF0gPT09IHN3b3JkLmMgPyBjIDogW3N3b3JkLmMsIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChTd29yZE9mV2luZCk7XG4gICAgICAgIGJyZWFrSWNlID0gbmVlZChTd29yZE9mRmlyZSk7XG4gICAgICAgIGZvcm1CcmlkZ2UgPSBuZWVkKFN3b3JkT2ZXYXRlcik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoU3dvcmRPZlRodW5kZXIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrU3RvbmUsIFtCcmVha1N0b25lLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0ljZSwgW0JyZWFrSWNlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBmb3JtQnJpZGdlLCBbRm9ybUJyaWRnZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtJcm9uLCBbQnJlYWtJcm9uLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLFxuICAgICAgICAgICAgICAgICAgb3IoU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyKSxcbiAgICAgICAgICAgICAgICAgIFtTd29yZC5pZCwgTW9uZXkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEZsaWdodC5yLCBbQ2xpbWJXYXRlcmZhbGwuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEJhcnJpZXIuciwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBHYXNNYXNrLnIsIFtUcmF2ZWxTd2FtcC5pZF0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBMZWF0aGVyQm9vdHMuciwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soXG4gICAgICAgIFtzdGFydF0sIGFuZChDdXJyZW50bHlSaWRpbmdEb2xwaGluLCBSYWJiaXRCb290cyksXG4gICAgICAgIFtDbGltYldhdGVyZmFsbC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSB7XG4gICAgICAvLyBub3QgYWN0dWFsbHkgdXNlZC4uLj9cbiAgICAgIGNvbnN0IHJlcXVpcmVIZWFsZWQgPSB0aGlzLmZsYWdzZXQucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZUhlYWxlZCA/IEluanVyZWREb2xwaGluLnIgOiBbW11dLFxuICAgICAgICAgICAgICAgICAgICBbQWJsZVRvUmlkZURvbHBoaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBTaGllbGRSaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLFxuICAgICAgICAgICAgICAgICAgICBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpKSB7XG4gICAgICAvLyBOT1RFOiB3aXRoIG5vIG1vbmV5LCB3ZSd2ZSBnb3QgMTYgTVAsIHdoaWNoIGlzbid0IGVub3VnaFxuICAgICAgLy8gdG8gZ2V0IHBhc3Qgc2V2ZW4gc3RhdHVlcy5cbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBGbGlnaHQuY11dLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSwgW1RyYXZlbFN3YW1wLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBSZXF1aXJlbWVudC5PUEVOLCBbV2lsZFdhcnAuaWRdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQWRkcyByb3V0ZXMgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFSb3V0ZXMoKSB7XG4gICAgY29uc3Qge1xuICAgICAgZmxhZ3M6IHtCdXlXYXJwLCBTd29yZE9mVGh1bmRlciwgVGVsZXBvcnQsIFdpbGRXYXJwfSxcbiAgICAgIGxvY2F0aW9uczoge01lemFtZVNocmluZX0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IE1lemFtZSBTaHJpbmUuXG4gICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpLCBbXSkpO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgICBjb25zdCB3YXJwID0gdGhpcy5yb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycDtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIEJ1eVdhcnAuY10pKTtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIFRlbGVwb3J0LmNdKSk7XG4gICAgfVxuICAgIC8vIFdpbGQgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS53aWxkV2FycC5sb2NhdGlvbnMpIHtcbiAgICAgICAgLy8gRG9uJ3QgY291bnQgY2hhbm5lbCBpbiBsb2dpYyBiZWNhdXNlIHlvdSBjYW4ndCBhY3R1YWxseSBtb3ZlLlxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwuaWQpIGNvbnRpbnVlO1xuICAgICAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlIHRpbGVzIGhhcyBleHRyYSByZXF1aXJlbWVudHMgdG8gZW50ZXIgKGUuZy5cbiAgICAgICAgLy8gc3dhbXApIC0gZmluZCB0aGVtIGFuZCBjb25jYXRlbnRlLlxuICAgICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2UobG9jYXRpb24pO1xuICAgICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoZW50cmFuY2UpID8/IGRpZSgnYmFkIGVudHJhbmNlJyk7XG4gICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGVycmFpbi5lbnRlcikge1xuICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGVudHJhbmNlLCBbV2lsZFdhcnAuYywgLi4ucm91dGVdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogQ2hhbmdlIHRoZSBrZXkgb2YgdGhlIGNoZWNrcyBtYXAgdG8gb25seSBiZSBjYW5vbmljYWwgVGlsZUlkcy4gKi9cbiAgY29uc29saWRhdGVDaGVja3MoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tzXSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3Qgcm9vdCA9IHRoaXMudGlsZXMuZmluZCh0aWxlKTtcbiAgICAgIGlmICh0aWxlID09PSByb290KSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgIHRoaXMuY2hlY2tzLmdldChyb290KS5hZGQoY2hlY2spO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja3MuZGVsZXRlKHRpbGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBdCB0aGlzIHBvaW50IHdlIGtub3cgdGhhdCBhbGwgb2YgdGhpcy5jaGVja3MnIGtleXMgYXJlIGNhbm9uaWNhbC4gKi9cbiAgYnVpbGRSZXF1aXJlbWVudE1hcCgpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgcmVxID0gdGhpcy5yZXF1aXJlbWVudE1hcC5nZXQoY2hlY2sgYXMgQ29uZGl0aW9uKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHIxIG9mIHJlcXVpcmVtZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHIyIG9mIHRoaXMucm91dGVzLmdldCh0aWxlKSB8fCBbXSkge1xuICAgICAgICAgICAgICByZXEuYWRkTGlzdChbLi4ucjEsIC4uLnIyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGxvZyB0aGUgbWFwP1xuICAgIGlmICghREVCVUcpIHJldHVybjtcbiAgICBjb25zdCBsb2cgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjaGVjaywgcmVxXSBvZiB0aGlzLnJlcXVpcmVtZW50TWFwKSB7XG4gICAgICBjb25zdCBuYW1lID0gKGM6IG51bWJlcikgPT4gdGhpcy5yb20uZmxhZ3NbY10ubmFtZTtcbiAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgcmVxKSB7XG4gICAgICAgIGxvZy5wdXNoKGAke25hbWUoY2hlY2spfTogJHtbLi4ucm91dGVdLm1hcChuYW1lKS5qb2luKCcgJiAnKX1cXG5gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9nLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMCk7XG4gICAgY29uc29sZS5sb2cobG9nLmpvaW4oJycpKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGEgTG9jYXRpb25MaXN0IHN0cnVjdHVyZSBhZnRlciB0aGUgcmVxdWlyZW1lbnQgbWFwIGlzIGJ1aWx0LiAqL1xuICBnZXRMb2NhdGlvbkxpc3Qod29ybGROYW1lID0gJ0NyeXN0YWxpcycpOiBMb2NhdGlvbkxpc3Qge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBqdXN0IGltcGxlbWVudGluZyB0aGlzIGRpcmVjdGx5P1xuICAgIGNvbnN0IGNoZWNrTmFtZSA9IERFQlVHID8gKGY6IEZsYWcpID0+IGYuZGVidWcgOiAoZjogRmxhZykgPT4gZi5uYW1lO1xuICAgIHJldHVybiB7XG4gICAgICB3b3JsZE5hbWUsXG4gICAgICByZXF1aXJlbWVudHM6IHRoaXMucmVxdWlyZW1lbnRNYXAsXG4gICAgICBpdGVtczogdGhpcy5pdGVtcyxcbiAgICAgIHNsb3RzOiB0aGlzLnNsb3RzLFxuICAgICAgY2hlY2tOYW1lOiAoY2hlY2s6IG51bWJlcikgPT4gY2hlY2tOYW1lKHRoaXMucm9tLmZsYWdzW2NoZWNrXSksXG4gICAgICBwcmVmaWxsOiAocmFuZG9tOiBSYW5kb20pID0+IHtcbiAgICAgICAgY29uc3Qge0NyeXN0YWxpcywgTWVzaWFJblRvd2VyLCBMZWFmRWxkZXJ9ID0gdGhpcy5yb20uZmxhZ3M7XG4gICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoW1tNZXNpYUluVG93ZXIuaWQsIENyeXN0YWxpcy5pZF1dKTtcbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZCgpKSB7XG4gICAgICAgICAgLy8gUGljayBhIHN3b3JkIGF0IHJhbmRvbS4uLj8gaW52ZXJzZSB3ZWlnaHQ/XG4gICAgICAgICAgbWFwLnNldChMZWFmRWxkZXIuaWQsIDB4MjAwIHwgcmFuZG9tLm5leHRJbnQoNCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgIC8vIFRPRE8gLSBpZiBhbnkgaXRlbXMgc2hvdWxkbid0IGJlIHNodWZmbGVkLCB0aGVuIGRvIHRoZSBwcmUtZmlsbC4uLlxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqIEFkZCB0ZXJyYWlucyBhbmQgY2hlY2tzIGZvciBhIGxvY2F0aW9uLCBmcm9tIHRpbGVzIGFuZCBzcGF3bnMuICovXG4gIHByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIHJldHVybjtcbiAgICAvLyBMb29rIGZvciB3YWxscywgd2hpY2ggd2UgbmVlZCB0byBrbm93IGFib3V0IGxhdGVyLlxuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uKTtcbiAgfVxuXG4gIC8qKiBSdW4gdGhlIGZpcnN0IHBhc3Mgb2YgdW5pb25zIG5vdyB0aGF0IGFsbCB0ZXJyYWlucyBhcmUgZmluYWwuICovXG4gIHVuaW9uTmVpZ2hib3JzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh4MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHgxXSk7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeTEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB5MV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBCdWlsZHMgdXAgdGhlIHJvdXRlcyBhbmQgcm91dGVFZGdlcyBkYXRhIHN0cnVjdHVyZXMuICovXG4gIGFkZEFsbFJvdXRlcygpIHtcbiAgICAvLyBBZGQgYW55IGV4dHJhIHJvdXRlcyBmaXJzdCwgc3VjaCBhcyB0aGUgc3RhcnRpbmcgdGlsZS5cbiAgICB0aGlzLmFkZEV4dHJhUm91dGVzKCk7XG4gICAgLy8gQWRkIGFsbCB0aGUgZWRnZXMgZnJvbSBhbGwgbmVpZ2hib3JzLlxuICAgIGZvciAoY29uc3QgW3BhaXIsIGRpcnNdIG9mIHRoaXMubmVpZ2hib3JzKSB7XG4gICAgICBjb25zdCBbYzAsIGMxXSA9IFRpbGVQYWlyLnNwbGl0KHBhaXIpO1xuICAgICAgY29uc3QgdDAgPSB0aGlzLnRlcnJhaW5zLmdldChjMCk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMudGVycmFpbnMuZ2V0KGMxKTtcbiAgICAgIGlmICghdDAgfHwgIXQxKSB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgdGVycmFpbiAke2hleCh0MCA/IGMwIDogYzEpfWApO1xuICAgICAgZm9yIChjb25zdCBbZGlyLCBleGl0UmVxXSBvZiB0MC5leGl0KSB7XG4gICAgICAgIGlmICghKGRpciAmIGRpcnMpKSBjb250aW51ZTtcbiAgICAgICAgZm9yIChjb25zdCBleGl0Q29uZHMgb2YgZXhpdFJlcSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZW50ZXJDb25kcyBvZiB0MS5lbnRlcikge1xuICAgICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoYzEsIFsuLi5leGl0Q29uZHMsIC4uLmVudGVyQ29uZHNdKSwgYzApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgZGVidWcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVidWcnKTtcbiAgICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBkZWJ1Zy5hcHBlbmRDaGlsZChuZXcgQXJlYSh0aGlzLnJvbSwgdGhpcy5nZXRXb3JsZERhdGEoKSkuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0V29ybGREYXRhKCk6IFdvcmxkRGF0YSB7XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBjb25zdCB0aWxlcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgVGlsZURhdGE+KCgpID0+ICh7fSkgYXMgVGlsZURhdGEpO1xuICAgIGNvbnN0IGxvY2F0aW9ucyA9XG4gICAgICAgIHNlcSgyNTYsICgpID0+ICh7YXJlYXM6IG5ldyBTZXQoKSwgdGlsZXM6IG5ldyBTZXQoKX0gYXMgTG9jYXRpb25EYXRhKSk7XG4gICAgY29uc3QgYXJlYXM6IEFyZWFEYXRhW10gPSBbXTtcblxuICAgIC8vIGRpZ2VzdCB0aGUgYXJlYXNcbiAgICBmb3IgKGNvbnN0IHNldCBvZiB0aGlzLnRpbGVzLnNldHMoKSkge1xuICAgICAgY29uc3QgY2Fub25pY2FsID0gdGhpcy50aWxlcy5maW5kKGl0ZXJzLmZpcnN0KHNldCkpO1xuICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGNhbm9uaWNhbCk7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgcm91dGVzID1cbiAgICAgICAgICB0aGlzLnJvdXRlcy5oYXMoY2Fub25pY2FsKSA/XG4gICAgICAgICAgICAgIFJlcXVpcmVtZW50LmZyZWV6ZSh0aGlzLnJvdXRlcy5nZXQoY2Fub25pY2FsKSkgOiBbXTtcbiAgICAgIGlmICghcm91dGVzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBjb25zdCBhcmVhOiBBcmVhRGF0YSA9IHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgaWQ6IGluZGV4KyssXG4gICAgICAgIGxvY2F0aW9uczogbmV3IFNldCgpLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHRlcnJhaW4sXG4gICAgICAgIHRpbGVzOiBuZXcgU2V0KCksXG4gICAgICB9O1xuICAgICAgYXJlYXMucHVzaChhcmVhKTtcbiAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBzZXQpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSB0aWxlID4+PiAxNjtcbiAgICAgICAgYXJlYS5sb2NhdGlvbnMuYWRkKGxvY2F0aW9uKTtcbiAgICAgICAgYXJlYS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0uYXJlYXMuYWRkKGFyZWEpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgdGlsZXMuZ2V0KHRpbGUpLmFyZWEgPSBhcmVhO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGV4aXRzXG4gICAgZm9yIChjb25zdCBbYSwgYl0gb2YgdGhpcy5leGl0cykge1xuICAgICAgaWYgKHRpbGVzLmhhcyhhKSkge1xuICAgICAgICB0aWxlcy5nZXQoYSkuZXhpdCA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgY2hlY2tzXG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCBhcmVhID0gdGlsZXMuZ2V0KHRpbGUpLmFyZWE7XG4gICAgICBpZiAoIWFyZWEpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihgQWJhbmRvbmVkIGNoZWNrICR7Wy4uLmNoZWNrU2V0XS5tYXAoXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICB4ID0+IFsuLi54LmNoZWNrc10ubWFwKHkgPT4geS50b1N0cmluZygxNikpKVxuICAgICAgICAvLyAgICAgICAgICAgICAgICB9IGF0ICR7dGlsZS50b1N0cmluZygxNil9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5yb20uZmxhZ3NbY2hlY2tdIHx8IGRpZSgpO1xuICAgICAgICAgIGFyZWEuY2hlY2tzLnB1c2goW2ZsYWcsIHJlcXVpcmVtZW50XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHt0aWxlcywgYXJlYXMsIGxvY2F0aW9uc307XG4gIH1cblxuICAvKiogQWRkcyBhIHJvdXRlLCBvcHRpb25hbGx5IHdpdGggYSBwcmVyZXF1aXNpdGUgKGNhbm9uaWNhbCkgc291cmNlIHRpbGUuICovXG4gIGFkZFJvdXRlKHJvdXRlOiBSb3V0ZSwgc291cmNlPzogVGlsZUlkKSB7XG4gICAgaWYgKHNvdXJjZSAhPSBudWxsKSB7XG4gICAgICAvLyBBZGQgYW4gZWRnZSBpbnN0ZWFkIG9mIGEgcm91dGUsIHJlY3Vyc2luZyBvbiB0aGUgc291cmNlJ3NcbiAgICAgIC8vIHJlcXVpcmVtZW50cy5cbiAgICAgIHRoaXMucm91dGVFZGdlcy5nZXQoc291cmNlKS5hZGQocm91dGUpO1xuICAgICAgZm9yIChjb25zdCBzcmNSb3V0ZSBvZiB0aGlzLnJvdXRlcy5nZXQoc291cmNlKSkge1xuICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShyb3V0ZS50YXJnZXQsIFsuLi5zcmNSb3V0ZSwgLi4ucm91dGUuZGVwc10pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBub3cgYW4gXCJpbml0aWFsIHJvdXRlXCIgd2l0aCBubyBwcmVyZXF1aXNpdGUgc291cmNlLlxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHN0YXJ0ID0gcm91dGU7IC8vIFRPRE8gaW5saW5lXG4gICAgcXVldWUuYWRkKHN0YXJ0KTtcbiAgICBjb25zdCBpdGVyID0gcXVldWVbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCB7dmFsdWUsIGRvbmV9ID0gaXRlci5uZXh0KCk7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgICAgc2Vlbi5hZGQodmFsdWUpO1xuICAgICAgcXVldWUuZGVsZXRlKHZhbHVlKTtcbiAgICAgIGNvbnN0IGZvbGxvdyA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdmFsdWUudGFyZ2V0O1xuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMucm91dGVzLmdldCh0YXJnZXQpO1xuICAgICAgaWYgKGJ1aWxkZXIuYWRkUm91dGUodmFsdWUpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0aGlzLnJvdXRlRWRnZXMuZ2V0KHRhcmdldCkpIHtcbiAgICAgICAgICBmb2xsb3cuYWRkKG5ldyBSb3V0ZShuZXh0LnRhcmdldCwgWy4uLnZhbHVlLmRlcHMsIC4uLm5leHQuZGVwc10pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuZXh0IG9mIGZvbGxvdykge1xuICAgICAgICBpZiAoc2Vlbi5oYXMobmV4dCkpIGNvbnRpbnVlO1xuICAgICAgICBxdWV1ZS5kZWxldGUobmV4dCk7IC8vIHJlLWFkZCBhdCB0aGUgZW5kIG9mIHRoZSBxdWV1ZVxuICAgICAgICBxdWV1ZS5hZGQobmV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyB1cCBgdGhpcy5leGl0U2V0YCB0byBpbmNsdWRlIGFsbCB0aGUgXCJmcm9tLXRvXCIgdGlsZSBwYWlyc1xuICAgKiBvZiBleGl0cyB0aGF0IF9kb24ndF8gc2hhcmUgdGhlIHNhbWUgdGVycmFpbiBGb3IgYW55IHR3by13YXkgZXhpdFxuICAgKiB0aGF0IHNoYXJlcyB0aGUgc2FtZSB0ZXJyYWluLCBqdXN0IGFkZCBpdCBkaXJlY3RseSB0byB0aGVcbiAgICogdW5pb25maW5kLlxuICAgKi9cbiAgcmVjb3JkRXhpdHMoKSB7XG4gICAgLy8gQWRkIGV4aXQgVGlsZVBhaXJzIHRvIGV4aXRTZXQgZnJvbSBhbGwgbG9jYXRpb25zJyBleGl0cy5cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5leGl0cykge1xuICAgICAgdGhpcy5leGl0U2V0LmFkZChcbiAgICAgICAgICBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQoZnJvbSksIHRoaXMudGlsZXMuZmluZCh0bykpKTtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgdHdvLXdheSBleGl0cyB3aXRoIHRoZSBzYW1lIHRlcnJhaW46IHJlbW92ZSB0aGVtIGZyb21cbiAgICAvLyBleGl0U2V0IGFuZCBhZGQgdGhlbSB0byB0aGUgdGlsZXMgdW5pb25maW5kLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldChmcm9tKSAhPT0gdGhpcy50ZXJyYWlucy5nZXQodG8pKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJldmVyc2UgPSBUaWxlUGFpci5vZih0bywgZnJvbSk7XG4gICAgICBpZiAodGhpcy5leGl0U2V0LmhhcyhyZXZlcnNlKSkge1xuICAgICAgICB0aGlzLnRpbGVzLnVuaW9uKFtmcm9tLCB0b10pO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKGV4aXQpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKHJldmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGRpZmZlcmVudC10ZXJyYWluIG5laWdoYm9ycyBpbiB0aGUgc2FtZSBsb2NhdGlvbi4gIEFkZFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyB0byBgdGhpcy5uZWlnaGJvcnNgIHdpdGggYWxsIHRoZVxuICAgKiBkaXJlY3Rpb25zIHRoYXQgaXQgbmVpZ2hib3JzIGluLiAgQWxzbyBhZGQgZXhpdHMgYXMgbmVpZ2hib3JzLlxuICAgKiBUaGlzIG11c3QgaGFwcGVuICphZnRlciogdGhlIGVudGlyZSB1bmlvbmZpbmQgaXMgY29tcGxldGUgc29cbiAgICogdGhhdCB3ZSBjYW4gbGV2ZXJhZ2UgaXQuXG4gICAqL1xuICBidWlsZE5laWdoYm9ycygpIHtcbiAgICAvLyBBZGphY2VudCBkaWZmZXJlbnQtdGVycmFpbiB0aWxlcy5cbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgY29uc3QgdHkxID0gdGhpcy50ZXJyYWlucy5nZXQoeTEpO1xuICAgICAgaWYgKHR5MSAmJiB0eTEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB5MSwgRGlyLk5vcnRoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGNvbnN0IHR4MSA9IHRoaXMudGVycmFpbnMuZ2V0KHgxKTtcbiAgICAgIGlmICh0eDEgJiYgdHgxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeDEsIERpci5XZXN0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRXhpdHMgKGp1c3QgdXNlIFwibm9ydGhcIiBmb3IgdGhlc2UpLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFt0MCwgdDFdID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHQwKSB8fCAhdGhpcy50ZXJyYWlucy5oYXModDEpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHAgPSBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQodDApLCB0aGlzLnRpbGVzLmZpbmQodDEpKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwLCB0aGlzLm5laWdoYm9ycy5nZXQocCkgfCAxKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVBZGphY2VudE5laWdoYm9ycyh0MDogVGlsZUlkLCB0MTogVGlsZUlkLCBkaXI6IERpcikge1xuICAgIC8vIE5PVEU6IHQwIDwgdDEgYmVjYXVzZSBkaXIgaXMgYWx3YXlzIFdFU1Qgb3IgTk9SVEguXG4gICAgY29uc3QgYzAgPSB0aGlzLnRpbGVzLmZpbmQodDApO1xuICAgIGNvbnN0IGMxID0gdGhpcy50aWxlcy5maW5kKHQxKTtcbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDEpKSB7XG4gICAgICAvLyAxIC0+IDAgKHdlc3Qvbm9ydGgpLiAgSWYgMSBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBwMTAgPSBUaWxlUGFpci5vZihjMSwgYzApO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAxMCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAxMCkgfCAoMSA8PCBkaXIpKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQwKSkge1xuICAgICAgLy8gMCAtPiAxIChlYXN0L3NvdXRoKS4gIElmIDAgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3Qgb3BwID0gZGlyIF4gMjtcbiAgICAgIGNvbnN0IHAwMSA9IFRpbGVQYWlyLm9mKGMwLCBjMSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDAxLCB0aGlzLm5laWdoYm9ycy5nZXQocDAxKSB8ICgxIDw8IG9wcCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGNvbnN0IHdhbGxzID0gbmV3IE1hcDxTY3JlZW5JZCwgV2FsbFR5cGU+KCk7XG4gICAgY29uc3Qgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcbiAgICBjb25zdCBpblRvd2VyID0gKGxvY2F0aW9uLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIFdhbGxzIG5lZWQgdG8gY29tZSBmaXJzdCBzbyB3ZSBjYW4gYXZvaWQgYWRkaW5nIHNlcGFyYXRlXG4gICAgICAvLyByZXF1aXJlbWVudHMgZm9yIGV2ZXJ5IHNpbmdsZSB3YWxsIC0ganVzdCB1c2UgdGhlIHR5cGUuXG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgd2FsbHMuc2V0KFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSwgKHNwYXduLmlkICYgMykgYXMgV2FsbFR5cGUpO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgIHNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldHNbbG9jYXRpb24udGlsZXNldF07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdO1xuXG4gICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpID0+IHtcbiAgICAgIGNvbnN0IHMgPSBsb2NhdGlvbi5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgIHJldHVybiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc10udGlsZXNbdGlsZSAmIDB4ZmZdXTtcbiAgICB9O1xuXG4gICAgLy8gUmV0dXJucyB1bmRlZmluZWQgaWYgaW1wYXNzYWJsZS5cbiAgICBjb25zdCBtYWtlVGVycmFpbiA9IChlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCwgYmFycmllcjogYm9vbGVhbikgPT4ge1xuICAgICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgICBlZmZlY3RzICY9IFRlcnJhaW4uQklUUztcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHgxYSkgZWZmZWN0cyB8PSBUZXJyYWluLlNXQU1QO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDYwIHx8IGxvY2F0aW9uLmlkID09PSAweDY4KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgLy8gTk9URTogb25seSB0aGUgdG9wIGhhbGYtc2NyZWVuIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgaXMgZG9scGhpbmFibGVcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHgxMDMwKSkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIGlmIChiYXJyaWVyKSBlZmZlY3RzIHw9IFRlcnJhaW4uQkFSUklFUjtcbiAgICAgIGlmICghKGVmZmVjdHMgJiBUZXJyYWluLkRPTFBISU4pICYmIGVmZmVjdHMgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgICAgLy8gMC01IGlzIGRvYWJsZSB3aXRoIG5vIGJvb3RzXG4gICAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgICBsZXQgYm90dG9tID0gdGlsZTtcbiAgICAgICAgbGV0IGhlaWdodCA9IDA7XG4gICAgICAgIHdoaWxlIChnZXRFZmZlY3RzKGJvdHRvbSkgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICAgIGhlaWdodCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgICAgZWZmZWN0cyAmPSB+VGVycmFpbi5TTE9QRTtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFODtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCAxMCkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoZWZmZWN0cyk7XG4gICAgfTtcblxuICAgIGZvciAobGV0IHkgPSAwLCBoZWlnaHQgPSBsb2NhdGlvbi5oZWlnaHQ7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gbG9jYXRpb24uc2NyZWVuc1t5XTtcbiAgICAgIGNvbnN0IHJvd0lkID0gbG9jYXRpb24uaWQgPDwgOCB8IHkgPDwgNDtcbiAgICAgIGZvciAobGV0IHggPSAwLCB3aWR0aCA9IGxvY2F0aW9uLndpZHRoOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHNjcmVlbklkID0gU2NyZWVuSWQocm93SWQgfCB4KTtcbiAgICAgICAgY29uc3QgYmFycmllciA9IHNob290aW5nU3RhdHVlcy5oYXMoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnWXggPSBzY3JlZW5JZCAmIDB4ZmY7XG4gICAgICAgIGNvbnN0IHdhbGwgPSB3YWxscy5nZXQoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnID1cbiAgICAgICAgICAgIGluVG93ZXIgPyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkIDpcbiAgICAgICAgICAgIHdhbGwgIT0gbnVsbCA/IHRoaXMud2FsbENhcGFiaWxpdHkod2FsbCkgOlxuICAgICAgICAgICAgbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBmbGFnWXgpPy5mbGFnO1xuICAgICAgICBjb25zdCBsb2dpYzogTG9naWMgPSB0aGlzLnJvbS5mbGFnc1tmbGFnIV0/LmxvZ2ljID8/IHt9O1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpZCA9IFRpbGVJZChzY3JlZW5JZCA8PCA4IHwgdCk7XG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGlmIChsb2dpYy5hc3N1bWVUcnVlICYmIHRpbGUgPCAweDIwKSB7XG4gICAgICAgICAgICB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBlZmZlY3RzID1cbiAgICAgICAgICAgICAgbG9jYXRpb24uaXNTaG9wKCkgPyAwIDogdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXSAmIDB4MjY7XG4gICAgICAgICAgbGV0IHRlcnJhaW4gPSBtYWtlVGVycmFpbihlZmZlY3RzLCB0aWQsIGJhcnJpZXIpO1xuICAgICAgICAgIC8vaWYgKCF0ZXJyYWluKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICBpZiAodGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9PSB0aWxlICYmXG4gICAgICAgICAgICAgIGZsYWcgIT0gbnVsbCAmJiAhbG9naWMuYXNzdW1lVHJ1ZSAmJiAhbG9naWMuYXNzdW1lRmFsc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0ZSA9XG4gICAgICAgICAgICAgICAgbWFrZVRlcnJhaW4odGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAgIC8vaWYgKCFhbHRlcm5hdGUpIHRocm93IG5ldyBFcnJvcihgYmFkIHRlcnJhaW4gZm9yIGFsdGVybmF0ZWApO1xuICAgICAgICAgICAgaWYgKGFsdGVybmF0ZSkge1xuICAgICAgICAgICAgICAvLyBOT1RFOiB0aGVyZSdzIGFuIG9kZGl0eSBmcm9tIGhvbGxvd2luZyBvdXQgdGhlIGJhY2tzIG9mIGlyb25cbiAgICAgICAgICAgICAgLy8gd2FsbHMgdGhhdCBvbmUgY29ybmVyIG9mIHN0b25lIHdhbGxzIGFyZSBhbHNvIGhvbGxvd2VkIG91dCxcbiAgICAgICAgICAgICAgLy8gYnV0IG9ubHkgcHJlLWZsYWcuICBJdCBkb2Vzbid0IGFjdHVhbGx5IGh1cnQgYW55dGhpbmcuXG4gICAgICAgICAgICAgIHRlcnJhaW4gPVxuICAgICAgICAgICAgICAgICAgdGhpcy50ZXJyYWluRmFjdG9yeS5mbGFnKHRlcnJhaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9naWMudHJhY2sgPyBmbGFnIDogLTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRlcnJhaW4pIHRoaXMudGVycmFpbnMuc2V0KHRpZCwgdGVycmFpbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDbG9iYmVyIHRlcnJhaW4gd2l0aCBzZWFtbGVzcyBleGl0c1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgY29uc3Qge2Rlc3QsIGVudHJhbmNlfSA9IGV4aXQ7XG4gICAgICBjb25zdCBmcm9tID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgLy8gU2VhbWxlc3MgZXhpdHMgKDB4MjApIGlnbm9yZSB0aGUgZW50cmFuY2UgaW5kZXgsIGFuZFxuICAgICAgLy8gaW5zdGVhZCBwcmVzZXJ2ZSB0aGUgVGlsZUlkLCBqdXN0IGNoYW5naW5nIHRoZSBsb2NhdGlvbi5cbiAgICAgIGxldCB0bzogVGlsZUlkO1xuICAgICAgaWYgKGV4aXQuaXNTZWFtbGVzcygpKSB7XG4gICAgICAgIHRvID0gVGlsZUlkKGZyb20gJiAweGZmZmYgfCAoZGVzdCA8PCAxNikpO1xuICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgICB0aGlzLnNlYW1sZXNzRXhpdHMuYWRkKHRpbGUpO1xuICAgICAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgICBpZiAocHJldmlvdXMpIHtcbiAgICAgICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5LnNlYW1sZXNzKHByZXZpb3VzKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvID0gdGhpcy5lbnRyYW5jZSh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF0sIGVudHJhbmNlICYgMHgxZik7XG4gICAgICB9XG4gICAgICB0aGlzLmV4aXRzLnNldChmcm9tLCB0byk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzVHJpZ2dlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc05wYyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NCb3NzKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQ2hlc3QoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NDaGVzdChsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NNb25zdGVyKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLnR5cGUgPT09IDMgJiYgc3Bhd24uaWQgPT09IDB4ZTApIHtcbiAgICAgICAgLy8gd2luZG1pbGwgYmxhZGVzXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShcbiAgICAgICAgICAgIEhpdGJveC5zY3JlZW4oVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSksXG4gICAgICAgICAgICB0aGlzLnJvbS5mbGFncy5Vc2VkV2luZG1pbGxLZXkucik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc1RyaWdnZXIobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBGb3IgdHJpZ2dlcnMsIHdoaWNoIHRpbGVzIGRvIHdlIG1hcms/XG4gICAgLy8gVGhlIHRyaWdnZXIgaGl0Ym94IGlzIDIgdGlsZXMgd2lkZSBhbmQgMSB0aWxlIHRhbGwsIGJ1dCBpdCBkb2VzIG5vdFxuICAgIC8vIGxpbmUgdXAgbmljZWx5IHRvIHRoZSB0aWxlIGdyaWQuICBBbHNvLCB0aGUgcGxheWVyIGhpdGJveCBpcyBvbmx5XG4gICAgLy8gJGMgd2lkZSAodGhvdWdoIGl0J3MgJDE0IHRhbGwpIHNvIHRoZXJlJ3Mgc29tZSBzbGlnaHQgZGlzcGFyaXR5LlxuICAgIC8vIEl0IHNlZW1zIGxpa2UgcHJvYmFibHkgbWFya2luZyBpdCBhcyAoeC0xLCB5LTEpIC4uICh4LCB5KSBtYWtlcyB0aGVcbiAgICAvLyBtb3N0IHNlbnNlLCB3aXRoIHRoZSBjYXZlYXQgdGhhdCB0cmlnZ2VycyBzaGlmdGVkIHJpZ2h0IGJ5IGEgaGFsZlxuICAgIC8vIHRpbGUgc2hvdWxkIGdvIGZyb20geCAuLiB4KzEgaW5zdGVhZC5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBjaGVja2luZyB0cmlnZ2VyJ3MgYWN0aW9uOiAkMTkgLT4gcHVzaC1kb3duIG1lc3NhZ2VcblxuICAgIC8vIFRPRE8gLSBwdWxsIG91dCB0aGlzLnJlY29yZFRyaWdnZXJUZXJyYWluKCkgYW5kIHRoaXMucmVjb3JkVHJpZ2dlckNoZWNrKClcbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5yb20udHJpZ2dlcihzcGF3bi5pZCk7XG4gICAgaWYgKCF0cmlnZ2VyKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgdHJpZ2dlciAke3NwYXduLmlkLnRvU3RyaW5nKDE2KX1gKTtcblxuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgbGV0IGFudGlSZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHModHJpZ2dlci5jb25kaXRpb25zKTtcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuICAgIGxldCBoaXRib3ggPSBIaXRib3gudHJpZ2dlcihsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgY29uc3QgY2hlY2tzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHRyaWdnZXIuZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnRzLCBjaGVja3MpO1xuXG4gICAgc3dpdGNoICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MTk6XG4gICAgICAgIC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzZXQuYXNzdW1lUmFiYml0U2tpcCgpKSB7XG4gICAgICAgICAgLy8gYmlnZ2VyIGhpdGJveCB0byBub3QgZmluZCB0aGUgcGF0aCB0aHJvdWdoXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAtMV0sIFswLCAxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpZ2dlci5pZCA9PT0gMHhiYSAmJlxuICAgICAgICAgICAgICAgICAgICF0aGlzLmZsYWdzZXQuYXNzdW1lVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmRpc2FibGVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICAgIC8vIGNvcHkgdGhlIHRlbGVwb3J0IGhpdGJveCBpbnRvIHRoZSBvdGhlciBzaWRlIG9mIGNvcmRlbFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hdExvY2F0aW9uKGhpdGJveCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5FYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbldlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXF1aXJlbWVudHMpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZDpcbiAgICAgICAgLy8gc3RhcnQgbWFkbyAxIGJvc3MgZmlnaHRcbiAgICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuTWFkbzEsIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDg6IGNhc2UgMHgwYjogY2FzZSAweDBjOiBjYXNlIDB4MGQ6IGNhc2UgMHgwZjpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIHRyaWdnZXIgSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxdWlyZW1lbnRzLCB0cmlnZ2VyLmlkKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxODogeyAvLyBzdG9tIGZpZ2h0XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZTogd2FycCBib290cyBnbGl0Y2ggcmVxdWlyZWQgaWYgY2hhcmdlIHNob3RzIG9ubHkuXG4gICAgICAgIGNvbnN0IHJlcSA9XG4gICAgICAgICAgdGhpcy5mbGFnc2V0LmNoYXJnZVNob3RzT25seSgpID9cbiAgICAgICAgICBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgYW5kKHRoaXMucm9tLmZsYWdzLldhcnBCb290cykpIDpcbiAgICAgICAgICByZXF1aXJlbWVudHM7XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCB0aGlzLnJvbS5mbGFncy5TdG9tRmlnaHRSZXdhcmQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIDB4MWU6XG4gICAgICAgIC8vIGZvcmdlIGNyeXN0YWxpc1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgdGhpcy5yb20uZmxhZ3MuTWVzaWFJblRvd2VyLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFmOlxuICAgICAgICB0aGlzLmhhbmRsZUJvYXQodGlsZSwgbG9jYXRpb24sIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIE1vdmluZyBndWFyZFxuICAgICAgICAvLyB0cmVhdCB0aGlzIGFzIGEgc3RhdHVlPyAgYnV0IHRoZSBjb25kaXRpb25zIGFyZSBub3Qgc3VwZXIgdXNlZnVsLi4uXG4gICAgICAgIC8vICAgLSBvbmx5IHRyYWNrZWQgY29uZGl0aW9ucyBtYXR0ZXI/IDllID09IHBhcmFseXNpcy4uLiBleGNlcHQgbm90LlxuICAgICAgICAvLyBwYXJhbHl6YWJsZT8gIGNoZWNrIERhdGFUYWJsZV8zNTA0NVxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5Qb3J0b2FfUGFsYWNlRW50cmFuY2UpIHtcbiAgICAgICAgICAvLyBQb3J0b2EgcGFsYWNlIGZyb250IGd1YXJkIG5vcm1hbGx5IGJsb2NrcyBvbiBNZXNpYSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gQnV0IHRoZSBxdWVlbiBpcyBhY3R1YWxseSBhY2Nlc3NpYmxlIHdpdGhvdXQgc2VlaW5nIHRoZSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gSW5zdGVhZCwgYmxvY2sgYWNjZXNzIHRvIHRoZSB0aHJvbmUgcm9vbSBvbiBiZWluZyBhYmxlIHRvIHRhbGsgdG9cbiAgICAgICAgICAvLyB0aGUgZm9ydHVuZSB0ZWxsZXIsIGluIGNhc2UgdGhlIGd1YXJkIG1vdmVzIGJlZm9yZSB3ZSBjYW4gZ2V0IHRoZVxuICAgICAgICAgIC8vIGl0ZW0uICBBbHNvIG1vdmUgdGhlIGhpdGJveCB1cCBzaW5jZSB0aGUgdHdvIHNpZGUgcm9vbXMgX2FyZV8gc3RpbGxcbiAgICAgICAgICAvLyBhY2Nlc3NpYmxlLlxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbLTIsIDBdKTtcbiAgICAgICAgICBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5yb20uZmxhZ3MuVGFsa2VkVG9Gb3J0dW5lVGVsbGVyLnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oYW5kbGVNb3ZpbmdHdWFyZChoaXRib3gsIGxvY2F0aW9uLCBhbnRpUmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXF1aXJlbWVudC5PUEVOLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NOcGMobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBucGM6ICR7aGV4KHNwYXduLmlkKX1gKTtcbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnMgPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2NhdGlvbi5pZCkgfHwgW107XG4gICAgY29uc3QgcmVxID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTsgLy8gc2hvdWxkIGJlIHNpbmdsZVxuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICAvLyBOT1RFOiBSYWdlIGhhcyBubyB3YWxrYWJsZSBuZWlnaGJvcnMsIGFuZCB3ZSBuZWVkIHRoZSBzYW1lIGhpdGJveFxuICAgIC8vIGZvciBib3RoIHRoZSB0ZXJyYWluIGFuZCB0aGUgY2hlY2suXG4gICAgLy9cbiAgICAvLyBOT1RFIEFMU08gLSBSYWdlIHByb2JhYmx5IHNob3dzIHVwIGFzIGEgYm9zcywgbm90IGFuIE5QQz9cbiAgICBsZXQgaGl0Ym94OiBIaXRib3ggPVxuICAgICAgICBbdGhpcy50ZXJyYWlucy5oYXModGlsZSkgPyB0aWxlIDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpID8/IHRpbGVdO1xuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoaGl0Ym94LCByZXEsIGl0ZW0sIHVzZSk7XG4gICAgfVxuXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5TYWJlcmFEaXNndWlzZWRBc01lc2lhKSB7XG4gICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5TYWJlcmExLCByZXEpO1xuICAgIH1cblxuICAgIGlmICgobnBjLmRhdGFbMl0gJiAweDA0KSAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgICBsZXQgYW50aVJlcTtcbiAgICAgIGFudGlSZXEgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTtcbiAgICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUmFnZSkge1xuICAgICAgICAvLyBUT0RPIC0gbW92ZSBoaXRib3ggZG93biwgY2hhbmdlIHJlcXVpcmVtZW50P1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzIsIC0xXSwgWzIsIDBdLCBbMiwgMV0sIFsyLCAyXSk7XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTZdLCBbMCwgLTJdLCBbMCwgMl0sIFswLCA2XSk7XG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayBpZiB0aGlzIHdvcmtzPyAgdGhlIH5jaGVjayBzcGF3biBjb25kaXRpb24gc2hvdWxkXG4gICAgICAgIC8vIGFsbG93IHBhc3NpbmcgaWYgZ290dGVuIHRoZSBjaGVjaywgd2hpY2ggaXMgdGhlIHNhbWUgYXMgZ290dGVuXG4gICAgICAgIC8vIHRoZSBjb3JyZWN0IHN3b3JkLlxuICAgICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVJhZ2VTa2lwKCkpIGFudGlSZXEgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Qb3J0b2FUaHJvbmVSb29tQmFja0Rvb3JHdWFyZCkge1xuICAgICAgICAvLyBQb3J0b2EgYmFjayBkb29yIGd1YXJkIHNwYXducyBpZiAoMSkgdGhlIG1lc2lhIHJlY29yZGluZyBoYXMgbm90IHlldFxuICAgICAgICAvLyBiZWVuIHBsYXllZCwgYW5kICgyKSB0aGUgcGxheWVyIGRpZG4ndCBzbmVhayBwYXN0IHRoZSBlYXJsaWVyIGd1YXJkLlxuICAgICAgICAvLyBXZSBjYW4gc2ltdWxhdGUgdGhpcyBieSBoYXJkLWNvZGluZyBhIHJlcXVpcmVtZW50IG9uIGVpdGhlciB0byBnZXRcbiAgICAgICAgLy8gcGFzdCBoaW0uXG4gICAgICAgIGFudGlSZXEgPSBvcih0aGlzLnJvbS5mbGFncy5NZXNpYVJlY29yZGluZywgdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzKTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIHNwYXduIGlzIGFsd2F5cyBmYWxzZSB0aGVuIHJlcSBuZWVkcyB0byBiZSBvcGVuP1xuICAgICAgaWYgKGFudGlSZXEpIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXEpKTtcbiAgICB9XG5cbiAgICAvLyBGb3J0dW5lIHRlbGxlciBjYW4gYmUgdGFsa2VkIHRvIGFjcm9zcyB0aGUgZGVzay5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLkZvcnR1bmVUZWxsZXIpIHtcbiAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgMF0sIFsyLCAwXSk7XG4gICAgfVxuXG4gICAgLy8gcmVxIGlzIG5vdyBtdXRhYmxlXG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcSkpIHJldHVybjsgLy8gbm90aGluZyB0byBkbyBpZiBpdCBuZXZlciBzcGF3bnMuXG4gICAgY29uc3QgW1suLi5jb25kc11dID0gcmVxO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBnbG9iYWwgZGlhbG9ncyAtIGRvIG5vdGhpbmcgaWYgd2UgY2FuJ3QgcGFzcyB0aGVtLlxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKCFmPy5sb2dpYy50cmFjaykgY29udGludWU7XG4gICAgICBjb25kcy5wdXNoKGYuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGFwcHJvcHJpYXRlIGxvY2FsIGRpYWxvZ3NcbiAgICBjb25zdCBsb2NhbHMgPVxuICAgICAgICBucGMubG9jYWxEaWFsb2dzLmdldChsb2NhdGlvbi5pZCkgPz8gbnBjLmxvY2FsRGlhbG9ncy5nZXQoLTEpID8/IFtdO1xuICAgIGZvciAoY29uc3QgZCBvZiBsb2NhbHMpIHtcbiAgICAgIC8vIENvbXB1dGUgdGhlIGNvbmRpdGlvbiAncicgZm9yIHRoaXMgbWVzc2FnZS5cbiAgICAgIGNvbnN0IHIgPSBbLi4uY29uZHNdO1xuICAgICAgY29uc3QgZjAgPSB0aGlzLmZsYWcoZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYwPy5sb2dpYy50cmFjaykge1xuICAgICAgICByLnB1c2goZjAuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHJvY2Vzc0RpYWxvZyhoaXRib3gsIG5wYywgciwgZCk7XG4gICAgICAvLyBBZGQgYW55IG5ldyBjb25kaXRpb25zIHRvICdjb25kcycgdG8gZ2V0IGJleW9uZCB0aGlzIG1lc3NhZ2UuXG4gICAgICBjb25zdCBmMSA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYxPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjb25kcy5wdXNoKGYxLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0RpYWxvZyhoaXRib3g6IEhpdGJveCwgbnBjOiBOcGMsXG4gICAgICAgICAgICAgICAgcmVxOiByZWFkb25seSBDb25kaXRpb25bXSwgZGlhbG9nOiBMb2NhbERpYWxvZykge1xuICAgIHRoaXMuYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94LCBbcmVxXSwgZGlhbG9nLmZsYWdzKTtcblxuICAgIGNvbnN0IGluZm8gPSB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX07XG4gICAgc3dpdGNoIChkaWFsb2cubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgwODogLy8gb3BlbiBzd2FuIGdhdGVcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKGhpdGJveCwgW3JlcV0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBjOiAvLyBkd2FyZiBjaGlsZCBzdGFydHMgZm9sbG93aW5nXG4gICAgICAvLyAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGQ6IC8vIG5wYyB3YWxrcyBhd2F5XG4gICAgICAvLyAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTQ6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlNsaW1lZEtlbnN1LmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Bc2luYUluQmFja1Jvb20uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDExOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzFdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwMzpcbiAgICAgIGNhc2UgMHgwYTogLy8gbm9ybWFsbHkgdGhpcyBoYXJkLWNvZGVzIGdsb3dpbmcgbGFtcCwgYnV0IHdlIGV4dGVuZGVkIGl0XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMF0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA5OlxuICAgICAgICAvLyBJZiB6ZWJ1IHN0dWRlbnQgaGFzIGFuIGl0ZW0uLi4/ICBUT0RPIC0gc3RvcmUgZmYgaWYgdW51c2VkXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBucGMuZGF0YVsxXTtcbiAgICAgICAgaWYgKGl0ZW0gIT09IDB4ZmYpIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgaXRlbSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTk6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQWthaGFuYUZsdXRlT2ZMaW1lVHJhZGVpbi5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWE6XG4gICAgICAgIC8vIFRPRE8gLSBjYW4gd2UgcmVhY2ggdGhpcyBzcG90PyAgbWF5IG5lZWQgdG8gbW92ZSBkb3duP1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5SYWdlLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYjpcbiAgICAgICAgLy8gUmFnZSB0aHJvd2luZyBwbGF5ZXIgb3V0Li4uXG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIGFjdHVhbGx5IGFscmVhZHkgYmUgaGFuZGxlZCBieSB0aGUgc3RhdHVlIGNvZGUgYWJvdmU/XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBhZGQgZXh0cmEgZGlhbG9ncyBmb3IgaXRlbXVzZSB0cmFkZXMsIGV4dHJhIHRyaWdnZXJzXG4gICAgLy8gICAgICAtIGlmIGl0ZW0gdHJhZGVkIGJ1dCBubyByZXdhcmQsIHRoZW4gcmUtZ2l2ZSByZXdhcmQuLi5cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQofmxvY2F0aW9uLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShbdGhpcy5lbnRyYW5jZShsb2NhdGlvbildLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXF1aXJlbWVudC5PUEVOLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZU1vdmluZ0d1YXJkKGhpdGJveDogSGl0Ym94LCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcTogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBUaGlzIGlzIHRoZSAxYiB0cmlnZ2VyIGFjdGlvbiBmb2xsb3ctdXAuICBJdCBsb29rcyBmb3IgYW4gTlBDIGluIDBkIG9yIDBlXG4gICAgLy8gYW5kIG1vdmVzIHRoZW0gb3ZlciBhIHBpeGVsLiAgRm9yIHRoZSBsb2dpYywgaXQncyBhbHdheXMgaW4gYSBwb3NpdGlvblxuICAgIC8vIHdoZXJlIGp1c3QgbWFraW5nIHRoZSB0cmlnZ2VyIHNxdWFyZSBiZSBhIG5vLWV4aXQgc3F1YXJlIGlzIHN1ZmZpY2llbnQsXG4gICAgLy8gYnV0IHdlIG5lZWQgdG8gZ2V0IHRoZSBjb25kaXRpb25zIHJpZ2h0LiAgV2UgcGFzcyBpbiB0aGUgcmVxdWlyZW1lbnRzIHRvXG4gICAgLy8gTk9UIHRyaWdnZXIgdGhlIHRyaWdnZXIsIGFuZCB0aGVuIHdlIGpvaW4gaW4gcGFyYWx5c2lzIGFuZC9vciBzdGF0dWVcbiAgICAvLyBnbGl0Y2ggaWYgYXBwcm9wcmlhdGUuICBUaGVyZSBjb3VsZCB0aGVvcmV0aWNhbGx5IGJlIGNhc2VzIHdoZXJlIHRoZVxuICAgIC8vIGd1YXJkIGlzIHBhcmFseXphYmxlIGJ1dCB0aGUgZ2VvbWV0cnkgcHJldmVudHMgdGhlIHBsYXllciBmcm9tIGFjdHVhbGx5XG4gICAgLy8gaGl0dGluZyB0aGVtIGJlZm9yZSB0aGV5IG1vdmUsIGJ1dCBpdCBkb2Vzbid0IGhhcHBlbiBpbiBwcmFjdGljZS5cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSByZXR1cm47XG4gICAgY29uc3QgZXh0cmE6IENvbmRpdGlvbltdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducy5zbGljZSgwLCAyKSkge1xuICAgICAgaWYgKHNwYXduLmlzTnBjKCkgJiYgdGhpcy5yb20ubnBjc1tzcGF3bi5pZF0uaXNQYXJhbHl6YWJsZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goW3RoaXMucm9tLmZsYWdzLlBhcmFseXNpcy5pZCBhcyBDb25kaXRpb25dKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKFsuLi5yZXEsIC4uLmV4dHJhXS5tYXAoc3ByZWFkKSkpO1xuXG5cbiAgICAvLyBUT0RPIC0gUG9ydG9hIGd1YXJkcyBhcmUgYnJva2VuIDotKFxuICAgIC8vIFRoZSBiYWNrIGd1YXJkIG5lZWRzIHRvIGJsb2NrIG9uIHRoZSBmcm9udCBndWFyZCdzIGNvbmRpdGlvbnMsXG4gICAgLy8gd2hpbGUgdGhlIGZyb250IGd1YXJkIHNob3VsZCBibG9jayBvbiBmb3J0dW5lIHRlbGxlcj9cblxuICB9XG5cbiAgaGFuZGxlQm9hdCh0aWxlOiBUaWxlSWQsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIGJvYXJkIGJvYXQgLSB0aGlzIGFtb3VudHMgdG8gYWRkaW5nIGEgcm91dGUgZWRnZSBmcm9tIHRoZSB0aWxlXG4gICAgLy8gdG8gdGhlIGxlZnQsIHRocm91Z2ggYW4gZXhpdCwgYW5kIHRoZW4gY29udGludWluZyB1bnRpbCBmaW5kaW5nIGxhbmQuXG4gICAgY29uc3QgdDAgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodGlsZSk7XG4gICAgaWYgKHQwID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgd2Fsa2FibGUgbmVpZ2hib3IuYCk7XG4gICAgY29uc3QgeXQgPSAodGlsZSA+PiA4KSAmIDB4ZjAgfCAodGlsZSA+PiA0KSAmIDB4ZjtcbiAgICBjb25zdCB4dCA9ICh0aWxlID4+IDQpICYgMHhmMCB8IHRpbGUgJiAweGY7XG4gICAgbGV0IGJvYXRFeGl0O1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgaWYgKGV4aXQueXQgPT09IHl0ICYmIGV4aXQueHQgPCB4dCkgYm9hdEV4aXQgPSBleGl0O1xuICAgIH1cbiAgICBpZiAoIWJvYXRFeGl0KSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGJvYXQgZXhpdGApO1xuICAgIC8vIFRPRE8gLSBsb29rIHVwIHRoZSBlbnRyYW5jZS5cbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2JvYXRFeGl0LmRlc3RdO1xuICAgIGlmICghZGVzdCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZGVzdGluYXRpb25gKTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2JvYXRFeGl0LmVudHJhbmNlXTtcbiAgICBjb25zdCBlbnRyYW5jZVRpbGUgPSBUaWxlSWQuZnJvbShkZXN0LCBlbnRyYW5jZSk7XG4gICAgbGV0IHQgPSBlbnRyYW5jZVRpbGU7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHQgPSBUaWxlSWQuYWRkKHQsIDAsIC0xKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpO1xuICAgICAgaWYgKHQxICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgYm9hdDogVGVycmFpbiA9IHtcbiAgICAgICAgICBlbnRlcjogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50cyksXG4gICAgICAgICAgZXhpdDogW1sweGYsIFJlcXVpcmVtZW50Lk9QRU5dXSxcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWRkIGEgdGVycmFpbiBhbmQgZXhpdCBwYWlyIGZvciB0aGUgYm9hdCB0cmlnZ2VyLlxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oW3QwXSwgYm9hdCk7XG4gICAgICAgIHRoaXMuZXhpdHMuc2V0KHQwLCB0MSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5hZGQoVGlsZVBhaXIub2YodDAsIHQxKSk7XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGVudHJhbmNlIHdlIHBhc3NlZFxuICAgICAgICAvLyAodGhpcyBpcyBwcmltYXJpbHkgbmVjZXNzYXJ5IGZvciB3aWxkIHdhcnAgdG8gd29yayBpbiBsb2dpYykuXG4gICAgICAgIHRoaXMuZXhpdHMuc2V0KGVudHJhbmNlVGlsZSwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKGVudHJhbmNlVGlsZSwgdDEpKTtcbiAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQoZW50cmFuY2VUaWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoMCkhKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3g6IEhpdGJveCwgcmVxOiBSZXF1aXJlbWVudCwgZ3JhbnRJZDogbnVtYmVyKSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbUdyYW50KGdyYW50SWQpO1xuICAgIGNvbnN0IHNsb3QgPSAweDEwMCB8IGl0ZW07XG4gICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGl0ZW0gZ3JhbnQgZm9yICR7Z3JhbnRJZC50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIC8vIGlzIHRoZSAxMDAgZmxhZyBzdWZmaWNpZW50IGhlcmU/ICBwcm9iYWJseT9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IGdyYW50SWQgPj0gMHg4MDsgLy8gZ3JhbnRlZCBmcm9tIGEgdHJpZ2dlclxuICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCBzbG90LFxuICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlLCBwcmV2ZW50TG9zc30pO1xuICB9XG5cbiAgYWRkVGVycmFpbihoaXRib3g6IEhpdGJveCwgdGVycmFpbjogVGVycmFpbikge1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiBoaXRib3gpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgIGlmICh0ID09IG51bGwpIGNvbnRpbnVlOyAvLyB1bnJlYWNoYWJsZSB0aWxlcyBkb24ndCBuZWVkIGV4dHJhIHJlcXNcbiAgICAgIHRoaXMudGVycmFpbnMuc2V0KHRpbGUsIHRoaXMudGVycmFpbkZhY3RvcnkubWVldCh0LCB0ZXJyYWluKSk7XG4gICAgfVxuICB9XG5cbiAgYWRkQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCwgY2hlY2tzOiBudW1iZXJbXSkge1xuICAgIGlmIChSZXF1aXJlbWVudC5pc0Nsb3NlZChyZXF1aXJlbWVudCkpIHJldHVybjsgLy8gZG8gbm90aGluZyBpZiB1bnJlYWNoYWJsZVxuICAgIGNvbnN0IGNoZWNrID0ge3JlcXVpcmVtZW50OiBSZXF1aXJlbWVudC5mcmVlemUocmVxdWlyZW1lbnQpLCBjaGVja3N9O1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiBoaXRib3gpIHtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModGlsZSkpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5jaGVja3MuZ2V0KHRpbGUpLmFkZChjaGVjayk7XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUNoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsXG4gICAgICAgICAgICAgICBjaGVjazogbnVtYmVyLCBzbG90OiBTbG90SW5mbykge1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgW2NoZWNrXSk7XG4gICAgdGhpcy5zbG90cy5zZXQoY2hlY2ssIHNsb3QpO1xuICAgIC8vIGFsc28gYWRkIGNvcnJlc3BvbmRpbmcgSXRlbUluZm8gdG8ga2VlcCB0aGVtIGluIHBhcml0eS5cbiAgICBjb25zdCBpdGVtZ2V0ID0gdGhpcy5yb20uaXRlbUdldHNbdGhpcy5yb20uc2xvdHNbY2hlY2sgJiAweGZmXV07XG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgICBjb25zdCB1bmlxdWUgPSBpdGVtPy51bmlxdWU7XG4gICAgY29uc3QgbG9zYWJsZSA9IGl0ZW1nZXQuaXNMb3NhYmxlKCk7XG4gICAgLy8gVE9ETyAtIHJlZmFjdG9yIHRvIGp1c3QgXCJjYW4ndCBiZSBib3VnaHRcIj9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IHVuaXF1ZSB8fCBpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5PcGVsU3RhdHVlO1xuICAgIGxldCB3ZWlnaHQgPSAxO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2luZCkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZkZpcmUpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXYXRlcikgd2VpZ2h0ID0gMTA7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZUaHVuZGVyKSB3ZWlnaHQgPSAxNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuRmxpZ2h0KSB3ZWlnaHQgPSAxNTtcbiAgICB0aGlzLml0ZW1zLnNldCgweDIwMCB8IGl0ZW1nZXQuaWQsIHt1bmlxdWUsIGxvc2FibGUsIHByZXZlbnRMb3NzLCB3ZWlnaHR9KTtcbiAgfVxuXG4gIGFkZENoZWNrRnJvbUZsYWdzKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGZsYWdzOiBudW1iZXJbXSkge1xuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgY2hlY2tzKTtcbiAgfVxuXG4gIHdhbGthYmxlTmVpZ2hib3IodDogVGlsZUlkKTogVGlsZUlkfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0KSkgcmV0dXJuIHQ7XG4gICAgZm9yIChsZXQgZCBvZiBbLTEsIDFdKSB7XG4gICAgICBjb25zdCB0MSA9IFRpbGVJZC5hZGQodCwgZCwgMCk7XG4gICAgICBjb25zdCB0MiA9IFRpbGVJZC5hZGQodCwgMCwgZCk7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQxKSkgcmV0dXJuIHQxO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MikpIHJldHVybiB0MjtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlzV2Fsa2FibGUodDogVGlsZUlkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEodGhpcy5nZXRFZmZlY3RzKHQpICYgVGVycmFpbi5CSVRTKTtcbiAgfVxuXG4gIGVuc3VyZVBhc3NhYmxlKHQ6IFRpbGVJZCk6IFRpbGVJZCB7XG4gICAgcmV0dXJuIHRoaXMuaXNXYWxrYWJsZSh0KSA/IHQgOiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdDtcbiAgfVxuXG4gIGdldEVmZmVjdHModDogVGlsZUlkKTogbnVtYmVyIHtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1t0ID4+PiAxNl07XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCBlZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXS5lZmZlY3RzO1xuICAgIGNvbnN0IHNjciA9IGxvY2F0aW9uLnNjcmVlbnNbKHQgJiAweGYwMDApID4+PiAxMl1bKHQgJiAweGYwMCkgPj4+IDhdO1xuICAgIHJldHVybiBlZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl1dO1xuICB9XG5cbiAgcHJvY2Vzc0Jvc3MobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgIC8vIGFuZCB3aWxsIGFsc28gYWRkIHRoZWlyIGRyb3AuXG4gICAgaWYgKHNwYXduLmlkID09PSAweGM5IHx8IHNwYXduLmlkID09PSAweGNhKSByZXR1cm47IC8vIHN0YXR1ZXNcbiAgICBjb25zdCBpc1JhZ2UgPSBzcGF3bi5pZCA9PT0gMHhjMztcbiAgICBjb25zdCBib3NzID1cbiAgICAgICAgaXNSYWdlID8gdGhpcy5yb20uYm9zc2VzLlJhZ2UgOlxuICAgICAgICB0aGlzLnJvbS5ib3NzZXMuZnJvbUxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBpZiAoIWJvc3MgfHwgIWJvc3MuZmxhZykgdGhyb3cgbmV3IEVycm9yKGBCYWQgYm9zcyBhdCAke2xvY2F0aW9uLm5hbWV9YCk7XG4gICAgY29uc3Qgc2NyZWVuID0gdGlsZSAmIH4weGZmO1xuICAgIC8vIE5PVEU6IFJhZ2UgY2FuIGJlIGV4aXRlZCBzb3V0aC4uLiBidXQgdGhpcyBvbmx5IG1hdHRlcnMgaWYgdGhlcmUnc1xuICAgIC8vIGFueXRoaW5nIG90aGVyIHRoYW4gTWVzaWEncyBzaHJpbmUgYmVoaW5kIGhpbSwgd2hpY2ggbWFrZXMgYSBsb3Qgb2ZcbiAgICAvLyBsb2dpYyBtb3JlIGRpZmZpY3VsdCwgc28gbGlrZWx5IHRoaXMgZW50cmFuY2Ugd2lsbCBzdGF5IHB1dCBmb3JldmVyLlxuICAgIGNvbnN0IGJvc3NUZXJyYWluID0gdGhpcy50ZXJyYWluRmFjdG9yeS5ib3NzKGJvc3MuZmxhZy5pZCk7XG4gICAgY29uc3QgaGl0Ym94ID0gc2VxKDB4ZjAsICh0OiBudW1iZXIpID0+IChzY3JlZW4gfCB0KSBhcyBUaWxlSWQpO1xuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIGJvc3NUZXJyYWluKTtcbiAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIGJvc3MpO1xuICB9XG5cbiAgYWRkQm9zc0NoZWNrKGhpdGJveDogSGl0Ym94LCBib3NzOiBCb3NzLFxuICAgICAgICAgICAgICAgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCA9IFJlcXVpcmVtZW50Lk9QRU4pIHtcbiAgICBpZiAoYm9zcy5mbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYSBmbGFnOiAke2Jvc3N9YCk7XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyhib3NzKSk7XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5EcmF5Z29uMikge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcSwgW2Jvc3MuZmxhZy5pZF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICBoaXRib3gsIHJlcSwgYm9zcy5mbGFnLmlkLCB7bG9zc3k6IGZhbHNlLCB1bmlxdWU6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzQ2hlc3QobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBBZGQgYSBjaGVjayBmb3IgdGhlIDF4eCBmbGFnLiAgTWFrZSBzdXJlIGl0J3Mgbm90IGEgbWltaWMuXG4gICAgaWYgKHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXSA+PSAweDcwKSByZXR1cm47XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgc3Bhd24uaWQ7XG4gICAgY29uc3QgbWFwcGVkID0gdGhpcy5yb20uc2xvdHNbc3Bhd24uaWRdO1xuICAgIGlmIChtYXBwZWQgPj0gMHg3MCkgcmV0dXJuOyAvLyBUT0RPIC0gbWltaWMlIG1heSBjYXJlXG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW21hcHBlZF07XG4gICAgY29uc3QgdW5pcXVlID0gdGhpcy5mbGFnc2V0LnByZXNlcnZlVW5pcXVlQ2hlY2tzKCkgPyAhIWl0ZW0/LnVuaXF1ZSA6IHRydWU7XG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLCBSZXF1aXJlbWVudC5PUEVOLFxuICAgICAgICAgICAgICAgICAgICAgIHNsb3QsIHtsb3NzeTogZmFsc2UsIHVuaXF1ZX0pO1xuICB9XG5cbiAgcHJvY2Vzc01vbnN0ZXIoX2xvY2F0aW9uOiBMb2NhdGlvbiwgX3NwYXduOiBTcGF3bikge1xuICAgICAgICAvLyBUT0RPIC0gY29tcHV0ZSBtb25leS1kcm9wcGluZyBtb25zdGVyIHZ1bG5lcmFiaWxpdGllcyBhbmQgYWRkIGEgdHJpZ2dlclxuICAgICAgICAvLyBmb3IgdGhlIE1PTkVZIGNhcGFiaWxpdHkgZGVwZW5kZW50IG9uIGFueSBvZiB0aGUgc3dvcmRzLlxuICAgIC8vIGNvbnN0IG1vbnN0ZXIgPSByb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgIC8vIGlmIChtb25zdGVyLmdvbGREcm9wKSBtb25zdGVycy5zZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSwgbW9uc3Rlci5lbGVtZW50cyk7XG4gIH1cblxuICBwcm9jZXNzSXRlbVVzZShoaXRib3g6IEhpdGJveCwgcmVxMTogUmVxdWlyZW1lbnQsIGl0ZW06IEl0ZW0sIHVzZTogSXRlbVVzZSkge1xuICAgIC8vIHRoaXMgc2hvdWxkIGhhbmRsZSBtb3N0IHRyYWRlLWlucyBhdXRvbWF0aWNhbGx5XG4gICAgaGl0Ym94ID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdCkpO1xuICAgIGNvbnN0IHJlcTIgPSBbWygweDIwMCB8IGl0ZW0uaWQpIGFzIENvbmRpdGlvbl1dOyAvLyByZXF1aXJlcyB0aGUgaXRlbS5cbiAgICAvLyBjaGVjayBmb3Iga2lyaXNhIHBsYW50LCBhZGQgY2hhbmdlIGFzIGEgcmVxdWlyZW1lbnQuXG4gICAgaWYgKGl0ZW0uaWQgPT09IHRoaXMucm9tLnByZ1sweDNkNGI1XSArIDB4MWMpIHtcbiAgICAgIHJlcTJbMF0ucHVzaCh0aGlzLnJvbS5mbGFncy5DaGFuZ2UuYyk7XG4gICAgfVxuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5NZWRpY2FsSGVyYikgeyAvLyBkb2xwaGluXG4gICAgICByZXEyWzBdWzBdID0gdGhpcy5yb20uZmxhZ3MuQnV5SGVhbGluZy5jOyAvLyBub3RlOiBubyBvdGhlciBoZWFsaW5nIGl0ZW1zXG4gICAgfVxuICAgIGNvbnN0IHJlcSA9IFJlcXVpcmVtZW50Lm1lZXQocmVxMSwgcmVxMik7XG4gICAgLy8gc2V0IGFueSBmbGFnc1xuICAgIHRoaXMuYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94LCByZXEsIHVzZS5mbGFncyk7XG4gICAgLy8gaGFuZGxlIGFueSBleHRyYSBhY3Rpb25zXG4gICAgc3dpdGNoICh1c2UubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgLy8gdXNlIGtleVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCByZXEpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgwODogY2FzZSAweDBiOiBjYXNlIDB4MGM6IGNhc2UgMHgwZDogY2FzZSAweDBmOiBjYXNlIDB4MWM6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciBpdGVtIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcSwgaXRlbS5pZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDAyOlxuICAgICAgICAvLyBkb2xwaGluIGRlZmVycyB0byBkaWFsb2cgYWN0aW9uIDExIChhbmQgMGQgdG8gc3dpbSBhd2F5KVxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgMHgxMDAgfCB0aGlzLnJvbS5ucGNzW3VzZS53YW50ICYgMHhmZl0uZGF0YVsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0tleVVzZShoaXRib3g6IEhpdGJveCwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIHNldCB0aGUgY3VycmVudCBzY3JlZW4ncyBmbGFnIGlmIHRoZSBjb25kaXRpb25zIGFyZSBtZXQuLi5cbiAgICAvLyBtYWtlIHN1cmUgdGhlcmUncyBvbmx5IGEgc2luZ2xlIHNjcmVlbi5cbiAgICBjb25zdCBbc2NyZWVuLCAuLi5yZXN0XSA9IG5ldyBTZXQoWy4uLmhpdGJveF0ubWFwKHQgPT4gU2NyZWVuSWQuZnJvbSh0KSkpO1xuICAgIGlmIChzY3JlZW4gPT0gbnVsbCB8fCByZXN0Lmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBvbmUgc2NyZWVuYCk7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbc2NyZWVuID4+PiA4XTtcbiAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoc2NyZWVuICYgMHhmZikpO1xuICAgIGlmIChmbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgZmxhZyBvbiBzY3JlZW5gKTtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbZmxhZy5mbGFnXSk7XG4gIH1cblxuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IEJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLlJhZ2UpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgUmFnZS4gIEZpZ3VyZSBvdXQgd2hhdCBoZSB3YW50cyBmcm9tIHRoZSBkaWFsb2cuXG4gICAgICBjb25zdCB1bmtub3duU3dvcmQgPSB0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFnc2V0LnJhbmRvbWl6ZVRyYWRlcygpO1xuICAgICAgaWYgKHVua25vd25Td29yZCkgcmV0dXJuIHRoaXMucm9tLmZsYWdzLlN3b3JkLnI7IC8vIGFueSBzd29yZCBtaWdodCBkby5cbiAgICAgIHJldHVybiBbW3RoaXMucm9tLm5wY3MuUmFnZS5kaWFsb2coKVswXS5jb25kaXRpb24gYXMgQ29uZGl0aW9uXV07XG4gICAgfVxuICAgIGNvbnN0IGlkID0gYm9zcy5vYmplY3Q7XG4gICAgY29uc3QgciA9IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQuc2h1ZmZsZUJvc3NFbGVtZW50cygpIHx8XG4gICAgICAgICF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICByLmFkZEFsbCh0aGlzLnJvbS5mbGFncy5Td29yZC5yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbGV2ZWwgPSB0aGlzLmZsYWdzZXQuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIHIuYWRkQWxsKHRoaXMuc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBDYW4ndCBhY3R1YWxseSBraWxsIHRoZSBib3NzIGlmIGl0IGRvZXNuJ3Qgc3Bhd24uXG4gICAgY29uc3QgZXh0cmE6IENvbmRpdGlvbltdID0gW107XG4gICAgaWYgKGJvc3MubnBjICE9IG51bGwgJiYgYm9zcy5sb2NhdGlvbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzcGF3bkNvbmRpdGlvbiA9IGJvc3MubnBjLnNwYXducyh0aGlzLnJvbS5sb2NhdGlvbnNbYm9zcy5sb2NhdGlvbl0pO1xuICAgICAgZXh0cmEucHVzaCguLi50aGlzLmZpbHRlclJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbilbMF0pO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkluc2VjdCkge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5JbnNlY3RGbHV0ZS5jLCB0aGlzLnJvbS5mbGFncy5HYXNNYXNrLmMpO1xuICAgIH0gZWxzZSBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkJvd09mVHJ1dGguYyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLlJlZnJlc2guYyk7XG4gICAgfVxuICAgIHIucmVzdHJpY3QoW2V4dHJhXSk7XG4gICAgcmV0dXJuIFJlcXVpcmVtZW50LmZyZWV6ZShyKTtcbiAgfVxuXG4gIHN3b3JkUmVxdWlyZW1lbnQoZWxlbWVudDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICAgIGNvbnN0IHN3b3JkID0gW1xuICAgICAgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZldpbmQsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZGaXJlLFxuICAgICAgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZldhdGVyLCB0aGlzLnJvbS5mbGFncy5Td29yZE9mVGh1bmRlcixcbiAgICBdW2VsZW1lbnRdO1xuICAgIGlmIChsZXZlbCA9PT0gMSkgcmV0dXJuIHN3b3JkLnI7XG4gICAgY29uc3QgcG93ZXJzID0gW1xuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZldpbmQsIHRoaXMucm9tLmZsYWdzLlRvcm5hZG9CcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mRmlyZSwgdGhpcy5yb20uZmxhZ3MuRmxhbWVCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLkJsaXp6YXJkQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZlRodW5kZXIsIHRoaXMucm9tLmZsYWdzLlN0b3JtQnJhY2VsZXRdLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAzKSByZXR1cm4gYW5kKHN3b3JkLCAuLi5wb3dlcnMpO1xuICAgIHJldHVybiBwb3dlcnMubWFwKHBvd2VyID0+IFtzd29yZC5jLCBwb3dlci5jXSk7XG4gIH1cblxuICBpdGVtR3JhbnQoaWQ6IG51bWJlcik6IG51bWJlciB7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgdGhpcy5yb20uaXRlbUdldHMuYWN0aW9uR3JhbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSBpZCkgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGl0ZW0gZ3JhbnQgJHtpZC50b1N0cmluZygxNil9YCk7XG4gIH1cblxuICAvKiogUmV0dXJuIGEgUmVxdWlyZW1lbnQgZm9yIGFsbCBvZiB0aGUgZmxhZ3MgYmVpbmcgbWV0LiAqL1xuICBmaWx0ZXJSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCBjb25kcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgaWYgKGZsYWcgPCAwKSB7XG4gICAgICAgIGNvbnN0IGxvZ2ljID0gdGhpcy5mbGFnKH5mbGFnKT8ubG9naWM7XG4gICAgICAgIGlmIChsb2dpYz8uYXNzdW1lVHJ1ZSkgcmV0dXJuIFJlcXVpcmVtZW50LkNMT1NFRDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50LkNMT1NFRDtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSBjb25kcy5wdXNoKGYuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtjb25kc107XG4gIH1cblxuICAvKiogUmV0dXJuIGEgUmVxdWlyZW1lbnQgZm9yIHNvbWUgZmxhZyBub3QgYmVpbmcgbWV0LiAqL1xuICBmaWx0ZXJBbnRpUmVxdWlyZW1lbnRzKGZsYWdzOiBudW1iZXJbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gICAgY29uc3QgcmVxID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA+PSAwKSB7XG4gICAgICAgIGNvbnN0IGxvZ2ljID0gdGhpcy5mbGFnKH5mbGFnKT8ubG9naWM7XG4gICAgICAgIGlmIChsb2dpYz8uYXNzdW1lRmFsc2UpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZmxhZyk7XG4gICAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuT1BFTjtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSByZXEucHVzaChbZi5pZCBhcyBDb25kaXRpb25dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcTtcbiAgfVxuXG4gIGZsYWcoZmxhZzogbnVtYmVyKTogRmxhZ3x1bmRlZmluZWQge1xuICAgIC8vY29uc3QgdW5zaWduZWQgPSBmbGFnIDwgMCA/IH5mbGFnIDogZmxhZztcbiAgICBjb25zdCB1bnNpZ25lZCA9IGZsYWc7ICAvLyBUT0RPIC0gc2hvdWxkIHdlIGF1dG8taW52ZXJ0P1xuICAgIGNvbnN0IGYgPSB0aGlzLnJvbS5mbGFnc1t1bnNpZ25lZF07XG4gICAgY29uc3QgbWFwcGVkID0gdGhpcy5hbGlhc2VzLmdldChmKSA/PyBmO1xuICAgIHJldHVybiBtYXBwZWQ7XG4gIH1cblxuICBlbnRyYW5jZShsb2NhdGlvbjogTG9jYXRpb258bnVtYmVyLCBpbmRleCA9IDApOiBUaWxlSWQge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gPT09ICdudW1iZXInKSBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tsb2NhdGlvbl07XG4gICAgcmV0dXJuIHRoaXMudGlsZXMuZmluZChUaWxlSWQuZnJvbShsb2NhdGlvbiwgbG9jYXRpb24uZW50cmFuY2VzW2luZGV4XSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkod2FsbDogV2FsbFR5cGUpOiBudW1iZXIge1xuICAgIHN3aXRjaCAod2FsbCkge1xuICAgICAgY2FzZSBXYWxsVHlwZS5XSU5EOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtTdG9uZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuRklSRTogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSWNlLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5XQVRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkZvcm1CcmlkZ2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLlRIVU5ERVI6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha0lyb24uaWQ7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYGJhZCB3YWxsIHR5cGU6ICR7d2FsbH1gKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYW5kKC4uLmZsYWdzOiBGbGFnW10pOiBSZXF1aXJlbWVudC5TaW5nbGUge1xuICByZXR1cm4gW2ZsYWdzLm1hcCgoZjogRmxhZykgPT4gZi5pZCBhcyBDb25kaXRpb24pXTtcbn1cblxuZnVuY3Rpb24gb3IoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gIHJldHVybiBmbGFncy5tYXAoKGY6IEZsYWcpID0+IFtmLmlkIGFzIENvbmRpdGlvbl0pO1xufVxuXG4vLyBBbiBpbnRlcmVzdGluZyB3YXkgdG8gdHJhY2sgdGVycmFpbiBjb21iaW5hdGlvbnMgaXMgd2l0aCBwcmltZXMuXG4vLyBJZiB3ZSBoYXZlIE4gZWxlbWVudHMgd2UgY2FuIGxhYmVsIGVhY2ggYXRvbSB3aXRoIGEgcHJpbWUgYW5kXG4vLyB0aGVuIGxhYmVsIGFyYml0cmFyeSBjb21iaW5hdGlvbnMgd2l0aCB0aGUgcHJvZHVjdC4gIEZvciBOPTEwMDBcbi8vIHRoZSBoaWdoZXN0IG51bWJlciBpcyA4MDAwLCBzbyB0aGF0IGl0IGNvbnRyaWJ1dGVzIGFib3V0IDEzIGJpdHNcbi8vIHRvIHRoZSBwcm9kdWN0LCBtZWFuaW5nIHdlIGNhbiBzdG9yZSBjb21iaW5hdGlvbnMgb2YgNCBzYWZlbHlcbi8vIHdpdGhvdXQgcmVzb3J0aW5nIHRvIGJpZ2ludC4gIFRoaXMgaXMgaW5oZXJlbnRseSBvcmRlci1pbmRlcGVuZGVudC5cbi8vIElmIHRoZSByYXJlciBvbmVzIGFyZSBoaWdoZXIsIHdlIGNhbiBmaXQgc2lnbmlmaWNhbnRseSBtb3JlIHRoYW4gNC5cblxuY29uc3QgREVCVUcgPSBmYWxzZTtcblxuLy8gRGVidWcgaW50ZXJmYWNlLlxuZXhwb3J0IGludGVyZmFjZSBBcmVhRGF0YSB7XG4gIGlkOiBudW1iZXI7XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbiAgY2hlY2tzOiBBcnJheTxbRmxhZywgUmVxdWlyZW1lbnRdPjtcbiAgdGVycmFpbjogVGVycmFpbjtcbiAgbG9jYXRpb25zOiBTZXQ8bnVtYmVyPjtcbiAgcm91dGVzOiBSZXF1aXJlbWVudC5Gcm96ZW47XG59XG5leHBvcnQgaW50ZXJmYWNlIFRpbGVEYXRhIHtcbiAgYXJlYTogQXJlYURhdGE7XG4gIGV4aXQ/OiBUaWxlSWQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIExvY2F0aW9uRGF0YSB7XG4gIGFyZWFzOiBTZXQ8QXJlYURhdGE+O1xuICB0aWxlczogU2V0PFRpbGVJZD47XG59XG5leHBvcnQgaW50ZXJmYWNlIFdvcmxkRGF0YSB7XG4gIHRpbGVzOiBNYXA8VGlsZUlkLCBUaWxlRGF0YT47XG4gIGFyZWFzOiBBcmVhRGF0YVtdO1xuICBsb2NhdGlvbnM6IExvY2F0aW9uRGF0YVtdO1xufVxuIl19