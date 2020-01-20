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
                const terrain = (_a = this.terrains.get(entrance), (_a !== null && _a !== void 0 ? _a : die('bad entrance')));
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
        const page = location.screenPage;
        const tileset = this.rom.tileset(location.tileset);
        const tileEffects = this.rom.tileEffects[location.tileEffects - 0xb3];
        const getEffects = (tile) => {
            const screen = location.screens[(tile & 0xf000) >>> 12][(tile & 0xf00) >>> 8] | page;
            return tileEffects.effects[this.rom.screens[screen].tiles[tile & 0xff]];
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
                const screen = this.rom.screens[row[x] | page];
                const screenId = ScreenId(rowId | x);
                const barrier = shootingStatues.has(screenId);
                const flagYx = screenId & 0xff;
                const wall = walls.get(screenId);
                const flag = inTower ? this.rom.flags.AlwaysTrue.id :
                    wall != null ? this.wallCapability(wall) : (_a = location.flags.find(f => f.yx === flagYx)) === null || _a === void 0 ? void 0 : _a.flag;
                const logic = (_c = (_b = this.rom.flags[flag]) === null || _b === void 0 ? void 0 : _b.logic, (_c !== null && _c !== void 0 ? _c : {}));
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
            for (const [item, use] of this.itemUses.get(spawn.type << 8 | spawn.id)) {
                this.processItemUse([TileId.from(location, spawn)], item, use);
            }
        }
    }
    processTrigger(location, spawn) {
        var _a;
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
            if ((_a = f) === null || _a === void 0 ? void 0 : _a.logic.track) {
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
                if (location === this.rom.locations.PortoaPalace_Entrance) {
                    hitbox = Hitbox.adjust(hitbox, [-2, 0]);
                    antiRequirements = this.rom.flags.TalkedToFortuneTeller.r;
                }
                this.handleMovingGuard(hitbox, location, antiRequirements);
                break;
        }
    }
    processNpc(location, spawn) {
        var _a, _b, _c, _d, _e, _f;
        const npc = this.rom.npcs[spawn.id];
        if (!npc || !npc.used)
            throw new Error(`Unknown npc: ${hex(spawn.id)}`);
        const spawnConditions = npc.spawnConditions.get(location.id) || [];
        const req = this.filterRequirements(spawnConditions);
        const tile = TileId.from(location, spawn);
        let hitbox = [this.terrains.has(tile) ? tile : (_a = this.walkableNeighbor(tile), (_a !== null && _a !== void 0 ? _a : tile))];
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
            if (!((_b = f) === null || _b === void 0 ? void 0 : _b.logic.track))
                continue;
            conds.push(f.id);
        }
        const locals = (_d = (_c = npc.localDialogs.get(location.id), (_c !== null && _c !== void 0 ? _c : npc.localDialogs.get(-1))), (_d !== null && _d !== void 0 ? _d : []));
        for (const d of locals) {
            const r = [...conds];
            const f0 = this.flag(d.condition);
            if ((_e = f0) === null || _e === void 0 ? void 0 : _e.logic.track) {
                r.push(f0.id);
            }
            this.processDialog(hitbox, npc, r, d);
            const f1 = this.flag(~d.condition);
            if ((_f = f1) === null || _f === void 0 ? void 0 : _f.logic.track) {
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
            this.processItemUse([this.entrance(location)], item, use);
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
        var _a;
        this.addCheck(hitbox, requirement, [check]);
        this.slots.set(check, slot);
        const itemget = this.rom.itemGets[check & 0xff];
        const item = this.rom.items[itemget.itemId];
        const unique = (_a = item) === null || _a === void 0 ? void 0 : _a.unique;
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
        var _a;
        const checks = [];
        for (const flag of flags) {
            const f = this.flag(flag);
            if ((_a = f) === null || _a === void 0 ? void 0 : _a.logic.track) {
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
        return this.isWalkable(t) ? t : (_a = this.walkableNeighbor(t), (_a !== null && _a !== void 0 ? _a : t));
    }
    getEffects(t) {
        const location = this.rom.locations[t >>> 16];
        const page = location.screenPage;
        const effects = this.rom.tileEffects[location.tileEffects - 0xb3].effects;
        const scr = location.screens[(t & 0xf000) >>> 12][(t & 0xf00) >>> 8] | page;
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
        var _a;
        if (this.rom.slots[spawn.id] >= 0x70)
            return;
        const slot = 0x100 | spawn.id;
        const item = this.rom.items[spawn.id];
        const unique = this.flagset.preserveUniqueChecks() ? !!((_a = item) === null || _a === void 0 ? void 0 : _a.unique) : true;
        this.addItemCheck([TileId.from(location, spawn)], Requirement.OPEN, slot, { lossy: false, unique });
    }
    processMonster(_location, _spawn) {
    }
    processItemUse(hitbox, item, use) {
        hitbox = new Set([...hitbox].map(t => { var _a; return _a = this.walkableNeighbor(t), (_a !== null && _a !== void 0 ? _a : t); }));
        const req = [[(0x200 | item.id)]];
        if (item.id === this.rom.prg[0x3d4b5] + 0x1c) {
            req[0].push(this.rom.flags.Change.c);
        }
        if (item === this.rom.items.MedicalHerb) {
            req[0][0] = this.rom.flags.BuyHealing.c;
        }
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
        var _a, _b, _c, _d;
        const conds = [];
        for (const flag of flags) {
            if (flag < 0) {
                const logic = (_a = this.flag(~flag)) === null || _a === void 0 ? void 0 : _a.logic;
                if ((_b = logic) === null || _b === void 0 ? void 0 : _b.assumeTrue)
                    return Requirement.CLOSED;
            }
            else {
                const f = this.flag(flag);
                if ((_c = f) === null || _c === void 0 ? void 0 : _c.logic.assumeFalse)
                    return Requirement.CLOSED;
                if ((_d = f) === null || _d === void 0 ? void 0 : _d.logic.track)
                    conds.push(f.id);
            }
        }
        return [conds];
    }
    filterAntiRequirements(flags) {
        var _a, _b, _c, _d;
        const req = [];
        for (const flag of flags) {
            if (flag >= 0) {
                const logic = (_a = this.flag(~flag)) === null || _a === void 0 ? void 0 : _a.logic;
                if ((_b = logic) === null || _b === void 0 ? void 0 : _b.assumeFalse)
                    return Requirement.OPEN;
            }
            else {
                const f = this.flag(~flag);
                if ((_c = f) === null || _c === void 0 ? void 0 : _c.logic.assumeTrue)
                    return Requirement.OPEN;
                if ((_d = f) === null || _d === void 0 ? void 0 : _d.logic.track)
                    req.push([f.id]);
            }
        }
        return req;
    }
    flag(flag) {
        var _a;
        const unsigned = flag;
        const f = this.rom.flags[unsigned];
        const mapped = (_a = this.aliases.get(f), (_a !== null && _a !== void 0 ? _a : f));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBZWpCLE1BQU0sT0FBTyxLQUFLO0lBbUVoQixZQUFxQixHQUFRLEVBQVcsT0FBZ0IsRUFDbkMsVUFBVSxLQUFLO1FBRGYsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFXLFlBQU8s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QUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNQLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsRUFDMUQsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUs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QUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQUUsU0FBUztZQUMvRCxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2xEO0lBQ0gsQ0FBQztJQUVELHVCQUF1QixDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsR0FBUTtRQUV0RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFL0IsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDL0Q7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFL0IsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FB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QUMsRUFBRSxDQUFDO1lBQ3hELEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN0RCxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDekQsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzFELE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFHLEtBQWE7SUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLEtBQWE7SUFDMUIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFVRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FyZWF9IGZyb20gJy4uL3Nwb2lsZXIvYXJlYS5qcyc7XG5pbXBvcnQge2RpZX0gZnJvbSAnLi4vYXNzZXJ0LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7RmxhZywgTG9naWN9IGZyb20gJy4uL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0l0ZW0sIEl0ZW1Vc2V9IGZyb20gJy4uL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtMb2NhbERpYWxvZywgTnBjfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4LCBzZXF9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwLCBMYWJlbGVkU2V0LCBpdGVycywgc3ByZWFkfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7RGlyfSBmcm9tICcuL2Rpci5qcyc7XG5pbXBvcnQge0l0ZW1JbmZvLCBMb2NhdGlvbkxpc3QsIFNsb3RJbmZvfSBmcm9tICcuL2dyYXBoLmpzJztcbmltcG9ydCB7SGl0Ym94fSBmcm9tICcuL2hpdGJveC5qcyc7XG5pbXBvcnQge0NvbmRpdGlvbiwgUmVxdWlyZW1lbnQsIFJvdXRlfSBmcm9tICcuL3JlcXVpcmVtZW50LmpzJztcbmltcG9ydCB7U2NyZWVuSWR9IGZyb20gJy4vc2NyZWVuaWQuanMnO1xuaW1wb3J0IHtUZXJyYWluLCBUZXJyYWluc30gZnJvbSAnLi90ZXJyYWluLmpzJztcbmltcG9ydCB7VGlsZUlkfSBmcm9tICcuL3RpbGVpZC5qcyc7XG5pbXBvcnQge1RpbGVQYWlyfSBmcm9tICcuL3RpbGVwYWlyLmpzJztcbmltcG9ydCB7V2FsbFR5cGV9IGZyb20gJy4vd2FsbHR5cGUuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG5pbnRlcmZhY2UgQ2hlY2sge1xuICByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQ7XG4gIGNoZWNrczogbnVtYmVyW107XG59XG5cbi8vIEJhc2ljIGFsZ29yaXRobTpcbi8vICAxLiBmaWxsIHRlcnJhaW5zIGZyb20gbWFwc1xuLy8gIDIuIG1vZGlmeSB0ZXJyYWlucyBiYXNlZCBvbiBucGNzLCB0cmlnZ2VycywgYm9zc2VzLCBldGNcbi8vICAyLiBmaWxsIGFsbEV4aXRzXG4vLyAgMy4gc3RhcnQgdW5pb25maW5kXG4vLyAgNC4gZmlsbCAuLi4/XG5cbi8qKiBTdG9yZXMgYWxsIHRoZSByZWxldmFudCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgd29ybGQncyBsb2dpYy4gKi9cbmV4cG9ydCBjbGFzcyBXb3JsZCB7XG5cbiAgLyoqIEJ1aWxkcyBhbmQgY2FjaGVzIFRlcnJhaW4gb2JqZWN0cy4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbkZhY3RvcnkgPSBuZXcgVGVycmFpbnModGhpcy5yb20pO1xuXG4gIC8qKiBUZXJyYWlucyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSB0ZXJyYWlucyA9IG5ldyBNYXA8VGlsZUlkLCBUZXJyYWluPigpO1xuXG4gIC8qKiBDaGVja3MgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgY2hlY2tzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBTZXQ8Q2hlY2s+PigoKSA9PiBuZXcgU2V0KCkpO1xuXG4gIC8qKiBTbG90IGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBzbG90cyA9IG5ldyBNYXA8bnVtYmVyLCBTbG90SW5mbz4oKTtcbiAgLyoqIEl0ZW0gaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IGl0ZW1zID0gbmV3IE1hcDxudW1iZXIsIEl0ZW1JbmZvPigpO1xuXG4gIC8qKiBGbGFncyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGRpcmVjdCBhbGlhc2VzIGZvciBsb2dpYy4gKi9cbiAgcmVhZG9ubHkgYWxpYXNlczogTWFwPEZsYWcsIEZsYWc+O1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gaXRlbXVzZSB0cmlnZ2VycyB0byB0aGUgaXRlbXVzZSB0aGF0IHdhbnRzIGl0LiAqL1xuICByZWFkb25seSBpdGVtVXNlcyA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgW0l0ZW0sIEl0ZW1Vc2VdW10+KCgpID0+IFtdKTtcblxuICAvKiogUmF3IG1hcHBpbmcgb2YgZXhpdHMsIHdpdGhvdXQgY2Fub25pY2FsaXppbmcuICovXG4gIHJlYWRvbmx5IGV4aXRzID0gbmV3IE1hcDxUaWxlSWQsIFRpbGVJZD4oKTtcblxuICAvKiogTWFwcGluZyBmcm9tIGV4aXRzIHRvIGVudHJhbmNlcy4gIFRpbGVQYWlyIGlzIGNhbm9uaWNhbGl6ZWQuICovXG4gIHJlYWRvbmx5IGV4aXRTZXQgPSBuZXcgU2V0PFRpbGVQYWlyPigpO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgVGlsZUlkcyB3aXRoIHNlYW1sZXNzIGV4aXRzLiAgVGhpcyBpcyB1c2VkIHRvIGVuc3VyZSB0aGVcbiAgICogbG9naWMgdW5kZXJzdGFuZHMgdGhhdCB0aGUgcGxheWVyIGNhbid0IHdhbGsgYWNyb3NzIGFuIGV4aXQgdGlsZVxuICAgKiB3aXRob3V0IGNoYW5naW5nIGxvY2F0aW9ucyAocHJpbWFyaWx5IGZvciBkaXNhYmxpbmcgdGVsZXBvcnRcbiAgICogc2tpcCkuXG4gICAqL1xuICByZWFkb25seSBzZWFtbGVzc0V4aXRzID0gbmV3IFNldDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIFVuaW9uZmluZCBvZiBjb25uZWN0ZWQgY29tcG9uZW50cyBvZiB0aWxlcy4gIE5vdGUgdGhhdCBhbGwgdGhlXG4gICAqIGFib3ZlIHByb3BlcnRpZXMgY2FuIGJlIGJ1aWx0IHVwIGluIHBhcmFsbGVsLCBidXQgdGhlIHVuaW9uZmluZFxuICAgKiBjYW5ub3QgYmUgc3RhcnRlZCB1bnRpbCBhZnRlciBhbGwgdGVycmFpbnMgYW5kIGV4aXRzIGFyZVxuICAgKiByZWdpc3RlcmVkLCBzaW5jZSB3ZSBzcGVjaWZpY2FsbHkgbmVlZCB0byAqbm90KiB1bmlvbiBjZXJ0YWluXG4gICAqIG5laWdoYm9ycy5cbiAgICovXG4gIHJlYWRvbmx5IHRpbGVzID0gbmV3IFVuaW9uRmluZDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBUaWxlUGFpcnMgb2YgY2Fub25pY2FsIHVuaW9uZmluZCByZXByZXNlbnRhdGl2ZSBUaWxlSWRzIHRvXG4gICAqIGEgYml0c2V0IG9mIG5laWdoYm9yIGRpcmVjdGlvbnMuICBXZSBvbmx5IG5lZWQgdG8gd29ycnkgYWJvdXRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgYmVjYXVzZSBhbGwgVGlsZUlkcyBoYXZlIHRoZSBzYW1lIHRlcnJhaW4uXG4gICAqIFdlIHdpbGwgYWRkIGEgcm91dGUgZm9yIGVhY2ggZGlyZWN0aW9uIHdpdGggdW5pcXVlIHJlcXVpcmVtZW50cy5cbiAgICovXG4gIHJlYWRvbmx5IG5laWdoYm9ycyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVQYWlyLCBudW1iZXI+KCgpID0+IDApO1xuXG4gIC8qKiBSZXF1aXJlbWVudCBidWlsZGVyIGZvciByZWFjaGluZyBlYWNoIGNhbm9uaWNhbCBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHJvdXRlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgICgpID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCkpO1xuXG4gIC8qKiBSb3V0ZXMgb3JpZ2luYXRpbmcgZnJvbSBlYWNoIGNhbm9uaWNhbCB0aWxlLiAqL1xuICByZWFkb25seSByb3V0ZUVkZ2VzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgTGFiZWxlZFNldDxSb3V0ZT4+KCgpID0+IG5ldyBMYWJlbGVkU2V0KCkpO1xuXG4gIC8qKiBMb2NhdGlvbiBsaXN0OiB0aGlzIGlzIHRoZSByZXN1bHQgb2YgY29tYmluaW5nIHJvdXRlcyB3aXRoIGNoZWNrcy4gKi9cbiAgcmVhZG9ubHkgcmVxdWlyZW1lbnRNYXAgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8Q29uZGl0aW9uLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoYzogQ29uZGl0aW9uKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcihjKSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sIHJlYWRvbmx5IGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHRyYWNrZXIgPSBmYWxzZSkge1xuICAgIC8vIEJ1aWxkIGl0ZW1Vc2VzXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCB1c2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAodXNlLmtpbmQgPT09ICdleHBlY3QnKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQodXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHVzZS5raW5kID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQofnVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBCdWlsZCBhbGlhc2VzXG4gICAgdGhpcy5hbGlhc2VzID0gbmV3IE1hcChbXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZUFrYWhhbmEsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTb2xkaWVyLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU3RvbSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVdvbWFuLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5UYXZlcm4sIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgIF0pO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBsb2NhdGlvbnMgdG8gYnVpbGQgdXAgaW5mbyBhYm91dCB0aWxlcywgdGVycmFpbnMsIGNoZWNrcy5cbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5hZGRFeHRyYUNoZWNrcygpO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIFVuaW9uRmluZCBhbmQgdGhlIGV4aXRzIGFuZCBuZWlnaGJvcnMgc3RydWN0dXJlcy5cbiAgICB0aGlzLnVuaW9uTmVpZ2hib3JzKCk7XG4gICAgdGhpcy5yZWNvcmRFeGl0cygpO1xuICAgIHRoaXMuYnVpbGROZWlnaGJvcnMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSByb3V0ZXMvZWRnZXMuXG4gICAgdGhpcy5hZGRBbGxSb3V0ZXMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBsb2NhdGlvbiBsaXN0LlxuICAgIHRoaXMuY29uc29saWRhdGVDaGVja3MoKTtcbiAgICB0aGlzLmJ1aWxkUmVxdWlyZW1lbnRNYXAoKTtcbiAgfVxuXG4gIC8qKiBBZGRzIGNoZWNrcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYUNoZWNrcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBsb2NhdGlvbnM6IHtcbiAgICAgICAgTGVhZl9Ub29sU2hvcCxcbiAgICAgICAgTWV6YW1lU2hyaW5lLFxuICAgICAgICBPYWssXG4gICAgICAgIFNoeXJvbl9Ub29sU2hvcCxcbiAgICAgIH0sXG4gICAgICBmbGFnczoge1xuICAgICAgICBBYmxlVG9SaWRlRG9scGhpbixcbiAgICAgICAgQmFsbE9mRmlyZSwgQmFsbE9mVGh1bmRlciwgQmFsbE9mV2F0ZXIsIEJhbGxPZldpbmQsXG4gICAgICAgIEJhcnJpZXIsIEJsaXp6YXJkQnJhY2VsZXQsIEJvd09mTW9vbiwgQm93T2ZTdW4sXG4gICAgICAgIEJyZWFrU3RvbmUsIEJyZWFrSWNlLCBCcmVha0lyb24sXG4gICAgICAgIEJyb2tlblN0YXR1ZSwgQnV5SGVhbGluZywgQnV5V2FycCxcbiAgICAgICAgQ2xpbWJXYXRlcmZhbGwsIENsaW1iU2xvcGU4LCBDbGltYlNsb3BlOSwgQ3VycmVudGx5UmlkaW5nRG9scGhpbixcbiAgICAgICAgRmxpZ2h0LCBGbGFtZUJyYWNlbGV0LCBGb3JtQnJpZGdlLFxuICAgICAgICBHYXNNYXNrLCBHbG93aW5nTGFtcCxcbiAgICAgICAgSW5qdXJlZERvbHBoaW4sXG4gICAgICAgIExlYWRpbmdDaGlsZCwgTGVhdGhlckJvb3RzLFxuICAgICAgICBNb25leSxcbiAgICAgICAgT3BlbmVkQ3J5cHQsXG4gICAgICAgIFJhYmJpdEJvb3RzLCBSZWZyZXNoLCBSZXBhaXJlZFN0YXR1ZSwgUmVzY3VlZENoaWxkLFxuICAgICAgICBTaGVsbEZsdXRlLCBTaGllbGRSaW5nLCBTaG9vdGluZ1N0YXR1ZSwgU3Rvcm1CcmFjZWxldCxcbiAgICAgICAgU3dvcmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mVGh1bmRlciwgU3dvcmRPZldhdGVyLCBTd29yZE9mV2luZCxcbiAgICAgICAgVG9ybmFkb0JyYWNlbGV0LCBUcmF2ZWxTd2FtcCxcbiAgICAgICAgV2lsZFdhcnAsXG4gICAgICB9LFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgTWVkaWNhbEhlcmIsXG4gICAgICAgIFdhcnBCb290cyxcbiAgICAgIH0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpO1xuICAgIGNvbnN0IGVudGVyT2FrID0gdGhpcy5lbnRyYW5jZShPYWspO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEJvd09mTW9vbiwgQm93T2ZTdW4pLCBbT3BlbmVkQ3J5cHQuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGFuZChBYmxlVG9SaWRlRG9scGhpbiwgU2hlbGxGbHV0ZSksXG4gICAgICAgICAgICAgICAgICBbQ3VycmVudGx5UmlkaW5nRG9scGhpbi5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW2VudGVyT2FrXSwgYW5kKExlYWRpbmdDaGlsZCksIFtSZXNjdWVkQ2hpbGQuaWRdKTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbc3RhcnRdLCBhbmQoR2xvd2luZ0xhbXAsIEJyb2tlblN0YXR1ZSksXG4gICAgICAgICAgICAgICAgICAgICAgUmVwYWlyZWRTdGF0dWUuaWQsIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG5cbiAgICAvLyBBZGQgc2hvcHNcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gTGVhZl9Ub29sU2hvcC5pZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gU2h5cm9uX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaGl0Ym94ID0gW1RpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCldO1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IE1lZGljYWxIZXJiLmlkKSB7XG4gICAgICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIE1vbmV5LnIsIFtCdXlIZWFsaW5nLmlkXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gV2FycEJvb3RzLmlkKSB7XG4gICAgICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIE1vbmV5LnIsIFtCdXlXYXJwLmlkXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgcHNldWRvIGZsYWdzXG4gICAgbGV0IGJyZWFrU3RvbmU6IFJlcXVpcmVtZW50ID0gU3dvcmRPZldpbmQucjtcbiAgICBsZXQgYnJlYWtJY2U6IFJlcXVpcmVtZW50ID0gU3dvcmRPZkZpcmUucjtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2F0ZXIucjtcbiAgICBsZXQgYnJlYWtJcm9uOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZUaHVuZGVyLnI7XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQub3Jic09wdGlvbmFsKCkpIHtcbiAgICAgIGNvbnN0IHdpbmQyID0gb3IoQmFsbE9mV2luZCwgVG9ybmFkb0JyYWNlbGV0KTtcbiAgICAgIGNvbnN0IGZpcmUyID0gb3IoQmFsbE9mRmlyZSwgRmxhbWVCcmFjZWxldCk7XG4gICAgICBjb25zdCB3YXRlcjIgPSBvcihCYWxsT2ZXYXRlciwgQmxpenphcmRCcmFjZWxldCk7XG4gICAgICBjb25zdCB0aHVuZGVyMiA9IG9yKEJhbGxPZlRodW5kZXIsIFN0b3JtQnJhY2VsZXQpO1xuICAgICAgYnJlYWtTdG9uZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtTdG9uZSwgd2luZDIpO1xuICAgICAgYnJlYWtJY2UgPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSWNlLCBmaXJlMik7XG4gICAgICBmb3JtQnJpZGdlID0gUmVxdWlyZW1lbnQubWVldChmb3JtQnJpZGdlLCB3YXRlcjIpO1xuICAgICAgYnJlYWtJcm9uID0gUmVxdWlyZW1lbnQubWVldChicmVha0lyb24sIHRodW5kZXIyKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPVxuICAgICAgICAgICAgUmVxdWlyZW1lbnQub3IoYnJlYWtTdG9uZSwgYnJlYWtJY2UsIGZvcm1CcmlkZ2UsIGJyZWFrSXJvbik7XG4gICAgICAgIGZ1bmN0aW9uIG5lZWQoc3dvcmQ6IEZsYWcpOiBSZXF1aXJlbWVudCB7XG4gICAgICAgICAgcmV0dXJuIGxldmVsMi5tYXAoXG4gICAgICAgICAgICAgIChjOiByZWFkb25seSBDb25kaXRpb25bXSkgPT5cbiAgICAgICAgICAgICAgICAgIGNbMF0gPT09IHN3b3JkLmMgPyBjIDogW3N3b3JkLmMsIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChTd29yZE9mV2luZCk7XG4gICAgICAgIGJyZWFrSWNlID0gbmVlZChTd29yZE9mRmlyZSk7XG4gICAgICAgIGZvcm1CcmlkZ2UgPSBuZWVkKFN3b3JkT2ZXYXRlcik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoU3dvcmRPZlRodW5kZXIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrU3RvbmUsIFtCcmVha1N0b25lLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0ljZSwgW0JyZWFrSWNlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBmb3JtQnJpZGdlLCBbRm9ybUJyaWRnZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtJcm9uLCBbQnJlYWtJcm9uLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLFxuICAgICAgICAgICAgICAgICAgb3IoU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyKSxcbiAgICAgICAgICAgICAgICAgIFtTd29yZC5pZCwgTW9uZXkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEZsaWdodC5yLCBbQ2xpbWJXYXRlcmZhbGwuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEJhcnJpZXIuciwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBHYXNNYXNrLnIsIFtUcmF2ZWxTd2FtcC5pZF0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBMZWF0aGVyQm9vdHMuciwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soXG4gICAgICAgIFtzdGFydF0sIGFuZChDdXJyZW50bHlSaWRpbmdEb2xwaGluLCBSYWJiaXRCb290cyksXG4gICAgICAgIFtDbGltYldhdGVyZmFsbC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSB7XG4gICAgICAvLyBub3QgYWN0dWFsbHkgdXNlZC4uLj9cbiAgICAgIGNvbnN0IHJlcXVpcmVIZWFsZWQgPSB0aGlzLmZsYWdzZXQucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZUhlYWxlZCA/IEluanVyZWREb2xwaGluLnIgOiBbW11dLFxuICAgICAgICAgICAgICAgICAgICBbQWJsZVRvUmlkZURvbHBoaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBTaGllbGRSaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLFxuICAgICAgICAgICAgICAgICAgICBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpKSB7XG4gICAgICAvLyBOT1RFOiB3aXRoIG5vIG1vbmV5LCB3ZSd2ZSBnb3QgMTYgTVAsIHdoaWNoIGlzbid0IGVub3VnaFxuICAgICAgLy8gdG8gZ2V0IHBhc3Qgc2V2ZW4gc3RhdHVlcy5cbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBGbGlnaHQuY11dLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSwgW1RyYXZlbFN3YW1wLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBSZXF1aXJlbWVudC5PUEVOLCBbV2lsZFdhcnAuaWRdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQWRkcyByb3V0ZXMgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFSb3V0ZXMoKSB7XG4gICAgY29uc3Qge1xuICAgICAgZmxhZ3M6IHtCdXlXYXJwLCBTd29yZE9mVGh1bmRlciwgVGVsZXBvcnQsIFdpbGRXYXJwfSxcbiAgICAgIGxvY2F0aW9uczoge01lemFtZVNocmluZX0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IE1lemFtZSBTaHJpbmUuXG4gICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpLCBbXSkpO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgICBjb25zdCB3YXJwID0gdGhpcy5yb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycDtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIEJ1eVdhcnAuY10pKTtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIFRlbGVwb3J0LmNdKSk7XG4gICAgfVxuICAgIC8vIFdpbGQgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS53aWxkV2FycC5sb2NhdGlvbnMpIHtcbiAgICAgICAgLy8gRG9uJ3QgY291bnQgY2hhbm5lbCBpbiBsb2dpYyBiZWNhdXNlIHlvdSBjYW4ndCBhY3R1YWxseSBtb3ZlLlxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwuaWQpIGNvbnRpbnVlO1xuICAgICAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlIHRpbGVzIGhhcyBleHRyYSByZXF1aXJlbWVudHMgdG8gZW50ZXIgKGUuZy5cbiAgICAgICAgLy8gc3dhbXApIC0gZmluZCB0aGVtIGFuZCBjb25jYXRlbnRlLlxuICAgICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2UobG9jYXRpb24pO1xuICAgICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoZW50cmFuY2UpID8/IGRpZSgnYmFkIGVudHJhbmNlJyk7XG4gICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGVycmFpbi5lbnRlcikge1xuICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGVudHJhbmNlLCBbV2lsZFdhcnAuYywgLi4ucm91dGVdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogQ2hhbmdlIHRoZSBrZXkgb2YgdGhlIGNoZWNrcyBtYXAgdG8gb25seSBiZSBjYW5vbmljYWwgVGlsZUlkcy4gKi9cbiAgY29uc29saWRhdGVDaGVja3MoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tzXSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3Qgcm9vdCA9IHRoaXMudGlsZXMuZmluZCh0aWxlKTtcbiAgICAgIGlmICh0aWxlID09PSByb290KSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgIHRoaXMuY2hlY2tzLmdldChyb290KS5hZGQoY2hlY2spO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja3MuZGVsZXRlKHRpbGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBdCB0aGlzIHBvaW50IHdlIGtub3cgdGhhdCBhbGwgb2YgdGhpcy5jaGVja3MnIGtleXMgYXJlIGNhbm9uaWNhbC4gKi9cbiAgYnVpbGRSZXF1aXJlbWVudE1hcCgpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgcmVxID0gdGhpcy5yZXF1aXJlbWVudE1hcC5nZXQoY2hlY2sgYXMgQ29uZGl0aW9uKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHIxIG9mIHJlcXVpcmVtZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHIyIG9mIHRoaXMucm91dGVzLmdldCh0aWxlKSB8fCBbXSkge1xuICAgICAgICAgICAgICByZXEuYWRkTGlzdChbLi4ucjEsIC4uLnIyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGxvZyB0aGUgbWFwP1xuICAgIGlmICghREVCVUcpIHJldHVybjtcbiAgICBjb25zdCBsb2cgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjaGVjaywgcmVxXSBvZiB0aGlzLnJlcXVpcmVtZW50TWFwKSB7XG4gICAgICBjb25zdCBuYW1lID0gKGM6IG51bWJlcikgPT4gdGhpcy5yb20uZmxhZ3NbY10ubmFtZTtcbiAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgcmVxKSB7XG4gICAgICAgIGxvZy5wdXNoKGAke25hbWUoY2hlY2spfTogJHtbLi4ucm91dGVdLm1hcChuYW1lKS5qb2luKCcgJiAnKX1cXG5gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9nLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMCk7XG4gICAgY29uc29sZS5sb2cobG9nLmpvaW4oJycpKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGEgTG9jYXRpb25MaXN0IHN0cnVjdHVyZSBhZnRlciB0aGUgcmVxdWlyZW1lbnQgbWFwIGlzIGJ1aWx0LiAqL1xuICBnZXRMb2NhdGlvbkxpc3Qod29ybGROYW1lID0gJ0NyeXN0YWxpcycpOiBMb2NhdGlvbkxpc3Qge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBqdXN0IGltcGxlbWVudGluZyB0aGlzIGRpcmVjdGx5P1xuICAgIGNvbnN0IGNoZWNrTmFtZSA9IERFQlVHID8gKGY6IEZsYWcpID0+IGYuZGVidWcgOiAoZjogRmxhZykgPT4gZi5uYW1lO1xuICAgIHJldHVybiB7XG4gICAgICB3b3JsZE5hbWUsXG4gICAgICByZXF1aXJlbWVudHM6IHRoaXMucmVxdWlyZW1lbnRNYXAsXG4gICAgICBpdGVtczogdGhpcy5pdGVtcyxcbiAgICAgIHNsb3RzOiB0aGlzLnNsb3RzLFxuICAgICAgY2hlY2tOYW1lOiAoY2hlY2s6IG51bWJlcikgPT4gY2hlY2tOYW1lKHRoaXMucm9tLmZsYWdzW2NoZWNrXSksXG4gICAgICBwcmVmaWxsOiAocmFuZG9tOiBSYW5kb20pID0+IHtcbiAgICAgICAgY29uc3Qge0NyeXN0YWxpcywgTWVzaWFJblRvd2VyLCBMZWFmRWxkZXJ9ID0gdGhpcy5yb20uZmxhZ3M7XG4gICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoW1tNZXNpYUluVG93ZXIuaWQsIENyeXN0YWxpcy5pZF1dKTtcbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZCgpKSB7XG4gICAgICAgICAgLy8gUGljayBhIHN3b3JkIGF0IHJhbmRvbS4uLj8gaW52ZXJzZSB3ZWlnaHQ/XG4gICAgICAgICAgbWFwLnNldChMZWFmRWxkZXIuaWQsIDB4MjAwIHwgcmFuZG9tLm5leHRJbnQoNCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgIC8vIFRPRE8gLSBpZiBhbnkgaXRlbXMgc2hvdWxkbid0IGJlIHNodWZmbGVkLCB0aGVuIGRvIHRoZSBwcmUtZmlsbC4uLlxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqIEFkZCB0ZXJyYWlucyBhbmQgY2hlY2tzIGZvciBhIGxvY2F0aW9uLCBmcm9tIHRpbGVzIGFuZCBzcGF3bnMuICovXG4gIHByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIHJldHVybjtcbiAgICAvLyBMb29rIGZvciB3YWxscywgd2hpY2ggd2UgbmVlZCB0byBrbm93IGFib3V0IGxhdGVyLlxuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uKTtcbiAgfVxuXG4gIC8qKiBSdW4gdGhlIGZpcnN0IHBhc3Mgb2YgdW5pb25zIG5vdyB0aGF0IGFsbCB0ZXJyYWlucyBhcmUgZmluYWwuICovXG4gIHVuaW9uTmVpZ2hib3JzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh4MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHgxXSk7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeTEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB5MV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBCdWlsZHMgdXAgdGhlIHJvdXRlcyBhbmQgcm91dGVFZGdlcyBkYXRhIHN0cnVjdHVyZXMuICovXG4gIGFkZEFsbFJvdXRlcygpIHtcbiAgICAvLyBBZGQgYW55IGV4dHJhIHJvdXRlcyBmaXJzdCwgc3VjaCBhcyB0aGUgc3RhcnRpbmcgdGlsZS5cbiAgICB0aGlzLmFkZEV4dHJhUm91dGVzKCk7XG4gICAgLy8gQWRkIGFsbCB0aGUgZWRnZXMgZnJvbSBhbGwgbmVpZ2hib3JzLlxuICAgIGZvciAoY29uc3QgW3BhaXIsIGRpcnNdIG9mIHRoaXMubmVpZ2hib3JzKSB7XG4gICAgICBjb25zdCBbYzAsIGMxXSA9IFRpbGVQYWlyLnNwbGl0KHBhaXIpO1xuICAgICAgY29uc3QgdDAgPSB0aGlzLnRlcnJhaW5zLmdldChjMCk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMudGVycmFpbnMuZ2V0KGMxKTtcbiAgICAgIGlmICghdDAgfHwgIXQxKSB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgdGVycmFpbiAke2hleCh0MCA/IGMwIDogYzEpfWApO1xuICAgICAgZm9yIChjb25zdCBbZGlyLCBleGl0UmVxXSBvZiB0MC5leGl0KSB7XG4gICAgICAgIGlmICghKGRpciAmIGRpcnMpKSBjb250aW51ZTtcbiAgICAgICAgZm9yIChjb25zdCBleGl0Q29uZHMgb2YgZXhpdFJlcSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZW50ZXJDb25kcyBvZiB0MS5lbnRlcikge1xuICAgICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoYzEsIFsuLi5leGl0Q29uZHMsIC4uLmVudGVyQ29uZHNdKSwgYzApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgZGVidWcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVidWcnKTtcbiAgICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBkZWJ1Zy5hcHBlbmRDaGlsZChuZXcgQXJlYSh0aGlzLnJvbSwgdGhpcy5nZXRXb3JsZERhdGEoKSkuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0V29ybGREYXRhKCk6IFdvcmxkRGF0YSB7XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBjb25zdCB0aWxlcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgVGlsZURhdGE+KCgpID0+ICh7fSkgYXMgVGlsZURhdGEpO1xuICAgIGNvbnN0IGxvY2F0aW9ucyA9XG4gICAgICAgIHNlcSgyNTYsICgpID0+ICh7YXJlYXM6IG5ldyBTZXQoKSwgdGlsZXM6IG5ldyBTZXQoKX0gYXMgTG9jYXRpb25EYXRhKSk7XG4gICAgY29uc3QgYXJlYXM6IEFyZWFEYXRhW10gPSBbXTtcblxuICAgIC8vIGRpZ2VzdCB0aGUgYXJlYXNcbiAgICBmb3IgKGNvbnN0IHNldCBvZiB0aGlzLnRpbGVzLnNldHMoKSkge1xuICAgICAgY29uc3QgY2Fub25pY2FsID0gdGhpcy50aWxlcy5maW5kKGl0ZXJzLmZpcnN0KHNldCkpO1xuICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGNhbm9uaWNhbCk7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgcm91dGVzID1cbiAgICAgICAgICB0aGlzLnJvdXRlcy5oYXMoY2Fub25pY2FsKSA/XG4gICAgICAgICAgICAgIFJlcXVpcmVtZW50LmZyZWV6ZSh0aGlzLnJvdXRlcy5nZXQoY2Fub25pY2FsKSkgOiBbXTtcbiAgICAgIGlmICghcm91dGVzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBjb25zdCBhcmVhOiBBcmVhRGF0YSA9IHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgaWQ6IGluZGV4KyssXG4gICAgICAgIGxvY2F0aW9uczogbmV3IFNldCgpLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHRlcnJhaW4sXG4gICAgICAgIHRpbGVzOiBuZXcgU2V0KCksXG4gICAgICB9O1xuICAgICAgYXJlYXMucHVzaChhcmVhKTtcbiAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBzZXQpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSB0aWxlID4+PiAxNjtcbiAgICAgICAgYXJlYS5sb2NhdGlvbnMuYWRkKGxvY2F0aW9uKTtcbiAgICAgICAgYXJlYS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0uYXJlYXMuYWRkKGFyZWEpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgdGlsZXMuZ2V0KHRpbGUpLmFyZWEgPSBhcmVhO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGV4aXRzXG4gICAgZm9yIChjb25zdCBbYSwgYl0gb2YgdGhpcy5leGl0cykge1xuICAgICAgaWYgKHRpbGVzLmhhcyhhKSkge1xuICAgICAgICB0aWxlcy5nZXQoYSkuZXhpdCA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgY2hlY2tzXG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCBhcmVhID0gdGlsZXMuZ2V0KHRpbGUpLmFyZWE7XG4gICAgICBpZiAoIWFyZWEpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihgQWJhbmRvbmVkIGNoZWNrICR7Wy4uLmNoZWNrU2V0XS5tYXAoXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICB4ID0+IFsuLi54LmNoZWNrc10ubWFwKHkgPT4geS50b1N0cmluZygxNikpKVxuICAgICAgICAvLyAgICAgICAgICAgICAgICB9IGF0ICR7dGlsZS50b1N0cmluZygxNil9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5yb20uZmxhZ3NbY2hlY2tdIHx8IGRpZSgpO1xuICAgICAgICAgIGFyZWEuY2hlY2tzLnB1c2goW2ZsYWcsIHJlcXVpcmVtZW50XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHt0aWxlcywgYXJlYXMsIGxvY2F0aW9uc307XG4gIH1cblxuICAvKiogQWRkcyBhIHJvdXRlLCBvcHRpb25hbGx5IHdpdGggYSBwcmVyZXF1aXNpdGUgKGNhbm9uaWNhbCkgc291cmNlIHRpbGUuICovXG4gIGFkZFJvdXRlKHJvdXRlOiBSb3V0ZSwgc291cmNlPzogVGlsZUlkKSB7XG4gICAgaWYgKHNvdXJjZSAhPSBudWxsKSB7XG4gICAgICAvLyBBZGQgYW4gZWRnZSBpbnN0ZWFkIG9mIGEgcm91dGUsIHJlY3Vyc2luZyBvbiB0aGUgc291cmNlJ3NcbiAgICAgIC8vIHJlcXVpcmVtZW50cy5cbiAgICAgIHRoaXMucm91dGVFZGdlcy5nZXQoc291cmNlKS5hZGQocm91dGUpO1xuICAgICAgZm9yIChjb25zdCBzcmNSb3V0ZSBvZiB0aGlzLnJvdXRlcy5nZXQoc291cmNlKSkge1xuICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShyb3V0ZS50YXJnZXQsIFsuLi5zcmNSb3V0ZSwgLi4ucm91dGUuZGVwc10pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBub3cgYW4gXCJpbml0aWFsIHJvdXRlXCIgd2l0aCBubyBwcmVyZXF1aXNpdGUgc291cmNlLlxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHN0YXJ0ID0gcm91dGU7IC8vIFRPRE8gaW5saW5lXG4gICAgcXVldWUuYWRkKHN0YXJ0KTtcbiAgICBjb25zdCBpdGVyID0gcXVldWVbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCB7dmFsdWUsIGRvbmV9ID0gaXRlci5uZXh0KCk7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgICAgc2Vlbi5hZGQodmFsdWUpO1xuICAgICAgcXVldWUuZGVsZXRlKHZhbHVlKTtcbiAgICAgIGNvbnN0IGZvbGxvdyA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdmFsdWUudGFyZ2V0O1xuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMucm91dGVzLmdldCh0YXJnZXQpO1xuICAgICAgaWYgKGJ1aWxkZXIuYWRkUm91dGUodmFsdWUpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0aGlzLnJvdXRlRWRnZXMuZ2V0KHRhcmdldCkpIHtcbiAgICAgICAgICBmb2xsb3cuYWRkKG5ldyBSb3V0ZShuZXh0LnRhcmdldCwgWy4uLnZhbHVlLmRlcHMsIC4uLm5leHQuZGVwc10pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuZXh0IG9mIGZvbGxvdykge1xuICAgICAgICBpZiAoc2Vlbi5oYXMobmV4dCkpIGNvbnRpbnVlO1xuICAgICAgICBxdWV1ZS5kZWxldGUobmV4dCk7IC8vIHJlLWFkZCBhdCB0aGUgZW5kIG9mIHRoZSBxdWV1ZVxuICAgICAgICBxdWV1ZS5hZGQobmV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyB1cCBgdGhpcy5leGl0U2V0YCB0byBpbmNsdWRlIGFsbCB0aGUgXCJmcm9tLXRvXCIgdGlsZSBwYWlyc1xuICAgKiBvZiBleGl0cyB0aGF0IF9kb24ndF8gc2hhcmUgdGhlIHNhbWUgdGVycmFpbiBGb3IgYW55IHR3by13YXkgZXhpdFxuICAgKiB0aGF0IHNoYXJlcyB0aGUgc2FtZSB0ZXJyYWluLCBqdXN0IGFkZCBpdCBkaXJlY3RseSB0byB0aGVcbiAgICogdW5pb25maW5kLlxuICAgKi9cbiAgcmVjb3JkRXhpdHMoKSB7XG4gICAgLy8gQWRkIGV4aXQgVGlsZVBhaXJzIHRvIGV4aXRTZXQgZnJvbSBhbGwgbG9jYXRpb25zJyBleGl0cy5cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5leGl0cykge1xuICAgICAgdGhpcy5leGl0U2V0LmFkZChcbiAgICAgICAgICBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQoZnJvbSksIHRoaXMudGlsZXMuZmluZCh0bykpKTtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgdHdvLXdheSBleGl0cyB3aXRoIHRoZSBzYW1lIHRlcnJhaW46IHJlbW92ZSB0aGVtIGZyb21cbiAgICAvLyBleGl0U2V0IGFuZCBhZGQgdGhlbSB0byB0aGUgdGlsZXMgdW5pb25maW5kLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldChmcm9tKSAhPT0gdGhpcy50ZXJyYWlucy5nZXQodG8pKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJldmVyc2UgPSBUaWxlUGFpci5vZih0bywgZnJvbSk7XG4gICAgICBpZiAodGhpcy5leGl0U2V0LmhhcyhyZXZlcnNlKSkge1xuICAgICAgICB0aGlzLnRpbGVzLnVuaW9uKFtmcm9tLCB0b10pO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKGV4aXQpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKHJldmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGRpZmZlcmVudC10ZXJyYWluIG5laWdoYm9ycyBpbiB0aGUgc2FtZSBsb2NhdGlvbi4gIEFkZFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyB0byBgdGhpcy5uZWlnaGJvcnNgIHdpdGggYWxsIHRoZVxuICAgKiBkaXJlY3Rpb25zIHRoYXQgaXQgbmVpZ2hib3JzIGluLiAgQWxzbyBhZGQgZXhpdHMgYXMgbmVpZ2hib3JzLlxuICAgKiBUaGlzIG11c3QgaGFwcGVuICphZnRlciogdGhlIGVudGlyZSB1bmlvbmZpbmQgaXMgY29tcGxldGUgc29cbiAgICogdGhhdCB3ZSBjYW4gbGV2ZXJhZ2UgaXQuXG4gICAqL1xuICBidWlsZE5laWdoYm9ycygpIHtcbiAgICAvLyBBZGphY2VudCBkaWZmZXJlbnQtdGVycmFpbiB0aWxlcy5cbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgY29uc3QgdHkxID0gdGhpcy50ZXJyYWlucy5nZXQoeTEpO1xuICAgICAgaWYgKHR5MSAmJiB0eTEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB5MSwgRGlyLk5vcnRoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGNvbnN0IHR4MSA9IHRoaXMudGVycmFpbnMuZ2V0KHgxKTtcbiAgICAgIGlmICh0eDEgJiYgdHgxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeDEsIERpci5XZXN0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRXhpdHMgKGp1c3QgdXNlIFwibm9ydGhcIiBmb3IgdGhlc2UpLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFt0MCwgdDFdID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHQwKSB8fCAhdGhpcy50ZXJyYWlucy5oYXModDEpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHAgPSBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQodDApLCB0aGlzLnRpbGVzLmZpbmQodDEpKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwLCB0aGlzLm5laWdoYm9ycy5nZXQocCkgfCAxKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVBZGphY2VudE5laWdoYm9ycyh0MDogVGlsZUlkLCB0MTogVGlsZUlkLCBkaXI6IERpcikge1xuICAgIC8vIE5PVEU6IHQwIDwgdDEgYmVjYXVzZSBkaXIgaXMgYWx3YXlzIFdFU1Qgb3IgTk9SVEguXG4gICAgY29uc3QgYzAgPSB0aGlzLnRpbGVzLmZpbmQodDApO1xuICAgIGNvbnN0IGMxID0gdGhpcy50aWxlcy5maW5kKHQxKTtcbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDEpKSB7XG4gICAgICAvLyAxIC0+IDAgKHdlc3Qvbm9ydGgpLiAgSWYgMSBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBwMTAgPSBUaWxlUGFpci5vZihjMSwgYzApO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAxMCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAxMCkgfCAoMSA8PCBkaXIpKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQwKSkge1xuICAgICAgLy8gMCAtPiAxIChlYXN0L3NvdXRoKS4gIElmIDAgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3Qgb3BwID0gZGlyIF4gMjtcbiAgICAgIGNvbnN0IHAwMSA9IFRpbGVQYWlyLm9mKGMwLCBjMSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDAxLCB0aGlzLm5laWdoYm9ycy5nZXQocDAxKSB8ICgxIDw8IG9wcCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGNvbnN0IHdhbGxzID0gbmV3IE1hcDxTY3JlZW5JZCwgV2FsbFR5cGU+KCk7XG4gICAgY29uc3Qgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcbiAgICBjb25zdCBpblRvd2VyID0gKGxvY2F0aW9uLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIFdhbGxzIG5lZWQgdG8gY29tZSBmaXJzdCBzbyB3ZSBjYW4gYXZvaWQgYWRkaW5nIHNlcGFyYXRlXG4gICAgICAvLyByZXF1aXJlbWVudHMgZm9yIGV2ZXJ5IHNpbmdsZSB3YWxsIC0ganVzdCB1c2UgdGhlIHR5cGUuXG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgd2FsbHMuc2V0KFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSwgKHNwYXduLmlkICYgMykgYXMgV2FsbFR5cGUpO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgIHNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXQobG9jYXRpb24udGlsZXNldCk7XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdO1xuXG4gICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpID0+IHtcbiAgICAgIGNvbnN0IHNjcmVlbiA9XG4gICAgICAgICAgbG9jYXRpb24uc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF0gfCBwYWdlO1xuICAgICAgcmV0dXJuIHRpbGVFZmZlY3RzLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JlZW5dLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgfTtcblxuICAgIC8vIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuXG4gICAgY29uc3QgbWFrZVRlcnJhaW4gPSAoZWZmZWN0czogbnVtYmVyLCB0aWxlOiBUaWxlSWQsIGJhcnJpZXI6IGJvb2xlYW4pID0+IHtcbiAgICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgICAgZWZmZWN0cyAmPSBUZXJyYWluLkJJVFM7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4MWEpIGVmZmVjdHMgfD0gVGVycmFpbi5TV0FNUDtcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2MCB8fCBsb2NhdGlvbi5pZCA9PT0gMHg2OCkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4MTAzMCkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICBpZiAoYmFycmllcikgZWZmZWN0cyB8PSBUZXJyYWluLkJBUlJJRVI7XG4gICAgICBpZiAoIShlZmZlY3RzICYgVGVycmFpbi5ET0xQSElOKSAmJiBlZmZlY3RzICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgbGVuZ3RoIG9mIHNsb3BlOiBzaG9ydCBzbG9wZXMgYXJlIGNsaW1iYWJsZS5cbiAgICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgICAvLyA5IGlzIGRvYWJsZSB3aXRoIHJhYmJpdCBib290cyBvbmx5IChub3QgYXdhcmUgb2YgYW55IG9mIHRoZXNlLi4uKVxuICAgICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICAgIGxldCBoZWlnaHQgPSAwO1xuICAgICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAgIGJvdHRvbSA9IFRpbGVJZC5hZGQoYm90dG9tLCAxLCAwKTtcbiAgICAgICAgICBoZWlnaHQrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICAgIGVmZmVjdHMgJj0gflRlcnJhaW4uU0xPUEU7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgOSkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTg7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgMTApIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKGVmZmVjdHMpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB5ID0gMCwgaGVpZ2h0ID0gbG9jYXRpb24uaGVpZ2h0OyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxvY2F0aW9uLnNjcmVlbnNbeV07XG4gICAgICBjb25zdCByb3dJZCA9IGxvY2F0aW9uLmlkIDw8IDggfCB5IDw8IDQ7XG4gICAgICBmb3IgKGxldCB4ID0gMCwgd2lkdGggPSBsb2NhdGlvbi53aWR0aDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF0gfCBwYWdlXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuSWQgPSBTY3JlZW5JZChyb3dJZCB8IHgpO1xuICAgICAgICBjb25zdCBiYXJyaWVyID0gc2hvb3RpbmdTdGF0dWVzLmhhcyhzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWdZeCA9IHNjcmVlbklkICYgMHhmZjtcbiAgICAgICAgY29uc3Qgd2FsbCA9IHdhbGxzLmdldChzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWcgPVxuICAgICAgICAgICAgaW5Ub3dlciA/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQgOlxuICAgICAgICAgICAgd2FsbCAhPSBudWxsID8gdGhpcy53YWxsQ2FwYWJpbGl0eSh3YWxsKSA6XG4gICAgICAgICAgICBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi55eCA9PT0gZmxhZ1l4KT8uZmxhZztcbiAgICAgICAgY29uc3QgbG9naWM6IExvZ2ljID0gdGhpcy5yb20uZmxhZ3NbZmxhZyFdPy5sb2dpYyA/PyB7fTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWQgPSBUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IHQpO1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBpZiAobG9naWMuYXNzdW1lVHJ1ZSAmJiB0aWxlIDwgMHgyMCkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZWZmZWN0cyA9XG4gICAgICAgICAgICAgIGxvY2F0aW9uLmlzU2hvcCgpID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV0gJiAweDI2O1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gbWFrZVRlcnJhaW4oZWZmZWN0cywgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAvL2lmICghdGVycmFpbikgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgaWYgKHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPT0gdGlsZSAmJlxuICAgICAgICAgICAgICBmbGFnICE9IG51bGwgJiYgIWxvZ2ljLmFzc3VtZVRydWUgJiYgIWxvZ2ljLmFzc3VtZUZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGUgPVxuICAgICAgICAgICAgICAgIG1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgICAvL2lmICghYWx0ZXJuYXRlKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgLy8gTk9URTogdGhlcmUncyBhbiBvZGRpdHkgZnJvbSBob2xsb3dpbmcgb3V0IHRoZSBiYWNrcyBvZiBpcm9uXG4gICAgICAgICAgICAgIC8vIHdhbGxzIHRoYXQgb25lIGNvcm5lciBvZiBzdG9uZSB3YWxscyBhcmUgYWxzbyBob2xsb3dlZCBvdXQsXG4gICAgICAgICAgICAgIC8vIGJ1dCBvbmx5IHByZS1mbGFnLiAgSXQgZG9lc24ndCBhY3R1YWxseSBodXJ0IGFueXRoaW5nLlxuICAgICAgICAgICAgICB0ZXJyYWluID1cbiAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3RvcnkuZmxhZyh0ZXJyYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljLnRyYWNrID8gZmxhZyA6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0ZXJyYWluKSB0aGlzLnRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHtkZXN0LCBlbnRyYW5jZX0gPSBleGl0O1xuICAgICAgY29uc3QgZnJvbSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgIC8vIFNlYW1sZXNzIGV4aXRzICgweDIwKSBpZ25vcmUgdGhlIGVudHJhbmNlIGluZGV4LCBhbmRcbiAgICAgIC8vIGluc3RlYWQgcHJlc2VydmUgdGhlIFRpbGVJZCwganVzdCBjaGFuZ2luZyB0aGUgbG9jYXRpb24uXG4gICAgICBsZXQgdG86IFRpbGVJZDtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICB0byA9IFRpbGVJZChmcm9tICYgMHhmZmZmIHwgKGRlc3QgPDwgMTYpKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5zZWFtbGVzcyhwcmV2aW91cykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0byA9IHRoaXMuZW50cmFuY2UodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLCBlbnRyYW5jZSAmIDB4MWYpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc1RyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NOcGMobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQm9zcyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0NoZXN0KCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2hlc3QobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3Rlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi50eXBlID09PSAzICYmIHNwYXduLmlkID09PSAweGUwKSB7XG4gICAgICAgIC8vIHdpbmRtaWxsIGJsYWRlc1xuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoXG4gICAgICAgICAgICBIaXRib3guc2NyZWVuKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpLFxuICAgICAgICAgICAgdGhpcy5yb20uZmxhZ3MuVXNlZFdpbmRtaWxsS2V5LnIpO1xuICAgICAgfVxuICAgICAgLy8gQXQgd2hhdCBwb2ludCBkb2VzIHRoaXMgbG9naWMgYmVsb25nIGVsc2V3aGVyZT9cbiAgICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLCBpdGVtLCB1c2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gRm9yIHRyaWdnZXJzLCB3aGljaCB0aWxlcyBkbyB3ZSBtYXJrP1xuICAgIC8vIFRoZSB0cmlnZ2VyIGhpdGJveCBpcyAyIHRpbGVzIHdpZGUgYW5kIDEgdGlsZSB0YWxsLCBidXQgaXQgZG9lcyBub3RcbiAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgIC8vICRjIHdpZGUgKHRob3VnaCBpdCdzICQxNCB0YWxsKSBzbyB0aGVyZSdzIHNvbWUgc2xpZ2h0IGRpc3Bhcml0eS5cbiAgICAvLyBJdCBzZWVtcyBsaWtlIHByb2JhYmx5IG1hcmtpbmcgaXQgYXMgKHgtMSwgeS0xKSAuLiAoeCwgeSkgbWFrZXMgdGhlXG4gICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAvLyB0aWxlIHNob3VsZCBnbyBmcm9tIHggLi4geCsxIGluc3RlYWQuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY2hlY2tpbmcgdHJpZ2dlcidzIGFjdGlvbjogJDE5IC0+IHB1c2gtZG93biBtZXNzYWdlXG5cbiAgICAvLyBUT0RPIC0gcHVsbCBvdXQgdGhpcy5yZWNvcmRUcmlnZ2VyVGVycmFpbigpIGFuZCB0aGlzLnJlY29yZFRyaWdnZXJDaGVjaygpXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXIoc3Bhd24uaWQpO1xuICAgIGlmICghdHJpZ2dlcikgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHRyaWdnZXIgJHtzcGF3bi5pZC50b1N0cmluZygxNil9YCk7XG5cbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgIGxldCBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBsZXQgaGl0Ym94ID0gSGl0Ym94LnRyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcblxuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiB0cmlnZ2VyLmZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgY2hlY2tzKTtcblxuICAgIHN3aXRjaCAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDE5OlxuICAgICAgICAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICAgIC8vIGJpZ2dlciBoaXRib3ggdG8gbm90IGZpbmQgdGhlIHBhdGggdGhyb3VnaFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTFdLCBbMCwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmFzc3VtZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5kaXNhYmxlVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBjb3B5IHRoZSB0ZWxlcG9ydCBoaXRib3ggaW50byB0aGUgb3RoZXIgc2lkZSBvZiBjb3JkZWxcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYXRMb2NhdGlvbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxdWlyZW1lbnRzKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWQ6XG4gICAgICAgIC8vIHN0YXJ0IG1hZG8gMSBib3NzIGZpZ2h0XG4gICAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLk1hZG8xLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciB0cmlnZ2VyIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcXVpcmVtZW50cywgdHJpZ2dlci5pZCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTg6IHsgLy8gc3RvbSBmaWdodFxuICAgICAgICAvLyBTcGVjaWFsIGNhc2U6IHdhcnAgYm9vdHMgZ2xpdGNoIHJlcXVpcmVkIGlmIGNoYXJnZSBzaG90cyBvbmx5LlxuICAgICAgICBjb25zdCByZXEgPVxuICAgICAgICAgIHRoaXMuZmxhZ3NldC5jaGFyZ2VTaG90c09ubHkoKSA/XG4gICAgICAgICAgUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIGFuZCh0aGlzLnJvbS5mbGFncy5XYXJwQm9vdHMpKSA6XG4gICAgICAgICAgcmVxdWlyZW1lbnRzO1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgdGhpcy5yb20uZmxhZ3MuU3RvbUZpZ2h0UmV3YXJkLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSAweDFlOlxuICAgICAgICAvLyBmb3JnZSBjcnlzdGFsaXNcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLk1lc2lhSW5Ub3dlci5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZjpcbiAgICAgICAgdGhpcy5oYW5kbGVCb2F0KHRpbGUsIGxvY2F0aW9uLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBNb3ZpbmcgZ3VhcmRcbiAgICAgICAgLy8gdHJlYXQgdGhpcyBhcyBhIHN0YXR1ZT8gIGJ1dCB0aGUgY29uZGl0aW9ucyBhcmUgbm90IHN1cGVyIHVzZWZ1bC4uLlxuICAgICAgICAvLyAgIC0gb25seSB0cmFja2VkIGNvbmRpdGlvbnMgbWF0dGVyPyA5ZSA9PSBwYXJhbHlzaXMuLi4gZXhjZXB0IG5vdC5cbiAgICAgICAgLy8gcGFyYWx5emFibGU/ICBjaGVjayBEYXRhVGFibGVfMzUwNDVcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuUG9ydG9hUGFsYWNlX0VudHJhbmNlKSB7XG4gICAgICAgICAgLy8gUG9ydG9hIHBhbGFjZSBmcm9udCBndWFyZCBub3JtYWxseSBibG9ja3Mgb24gTWVzaWEgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEJ1dCB0aGUgcXVlZW4gaXMgYWN0dWFsbHkgYWNjZXNzaWJsZSB3aXRob3V0IHNlZWluZyB0aGUgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEluc3RlYWQsIGJsb2NrIGFjY2VzcyB0byB0aGUgdGhyb25lIHJvb20gb24gYmVpbmcgYWJsZSB0byB0YWxrIHRvXG4gICAgICAgICAgLy8gdGhlIGZvcnR1bmUgdGVsbGVyLCBpbiBjYXNlIHRoZSBndWFyZCBtb3ZlcyBiZWZvcmUgd2UgY2FuIGdldCB0aGVcbiAgICAgICAgICAvLyBpdGVtLiAgQWxzbyBtb3ZlIHRoZSBoaXRib3ggdXAgc2luY2UgdGhlIHR3byBzaWRlIHJvb21zIF9hcmVfIHN0aWxsXG4gICAgICAgICAgLy8gYWNjZXNzaWJsZS5cbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWy0yLCAwXSk7XG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMucm9tLmZsYWdzLlRhbGtlZFRvRm9ydHVuZVRlbGxlci5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94LCBsb2NhdGlvbiwgYW50aVJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NOcGMobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBucGM6ICR7aGV4KHNwYXduLmlkKX1gKTtcbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnMgPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2NhdGlvbi5pZCkgfHwgW107XG4gICAgY29uc3QgcmVxID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTsgLy8gc2hvdWxkIGJlIHNpbmdsZVxuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICAvLyBOT1RFOiBSYWdlIGhhcyBubyB3YWxrYWJsZSBuZWlnaGJvcnMsIGFuZCB3ZSBuZWVkIHRoZSBzYW1lIGhpdGJveFxuICAgIC8vIGZvciBib3RoIHRoZSB0ZXJyYWluIGFuZCB0aGUgY2hlY2suXG4gICAgLy9cbiAgICAvLyBOT1RFIEFMU08gLSBSYWdlIHByb2JhYmx5IHNob3dzIHVwIGFzIGEgYm9zcywgbm90IGFuIE5QQz9cbiAgICBsZXQgaGl0Ym94OiBIaXRib3ggPVxuICAgICAgICBbdGhpcy50ZXJyYWlucy5oYXModGlsZSkgPyB0aWxlIDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpID8/IHRpbGVdO1xuXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5TYWJlcmFEaXNndWlzZWRBc01lc2lhKSB7XG4gICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5TYWJlcmExLCByZXEpO1xuICAgIH1cblxuICAgIGlmICgobnBjLmRhdGFbMl0gJiAweDA0KSAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgICBsZXQgYW50aVJlcTtcbiAgICAgIGFudGlSZXEgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTtcbiAgICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUmFnZSkge1xuICAgICAgICAvLyBUT0RPIC0gbW92ZSBoaXRib3ggZG93biwgY2hhbmdlIHJlcXVpcmVtZW50P1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzIsIC0xXSwgWzIsIDBdLCBbMiwgMV0sIFsyLCAyXSk7XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTZdLCBbMCwgLTJdLCBbMCwgMl0sIFswLCA2XSk7XG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayBpZiB0aGlzIHdvcmtzPyAgdGhlIH5jaGVjayBzcGF3biBjb25kaXRpb24gc2hvdWxkXG4gICAgICAgIC8vIGFsbG93IHBhc3NpbmcgaWYgZ290dGVuIHRoZSBjaGVjaywgd2hpY2ggaXMgdGhlIHNhbWUgYXMgZ290dGVuXG4gICAgICAgIC8vIHRoZSBjb3JyZWN0IHN3b3JkLlxuICAgICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVJhZ2VTa2lwKCkpIGFudGlSZXEgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Qb3J0b2FUaHJvbmVSb29tQmFja0Rvb3JHdWFyZCkge1xuICAgICAgICAvLyBQb3J0b2EgYmFjayBkb29yIGd1YXJkIHNwYXducyBpZiAoMSkgdGhlIG1lc2lhIHJlY29yZGluZyBoYXMgbm90IHlldFxuICAgICAgICAvLyBiZWVuIHBsYXllZCwgYW5kICgyKSB0aGUgcGxheWVyIGRpZG4ndCBzbmVhayBwYXN0IHRoZSBlYXJsaWVyIGd1YXJkLlxuICAgICAgICAvLyBXZSBjYW4gc2ltdWxhdGUgdGhpcyBieSBoYXJkLWNvZGluZyBhIHJlcXVpcmVtZW50IG9uIGVpdGhlciB0byBnZXRcbiAgICAgICAgLy8gcGFzdCBoaW0uXG4gICAgICAgIGFudGlSZXEgPSBvcih0aGlzLnJvbS5mbGFncy5NZXNpYVJlY29yZGluZywgdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzKTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIHNwYXduIGlzIGFsd2F5cyBmYWxzZSB0aGVuIHJlcSBuZWVkcyB0byBiZSBvcGVuP1xuICAgICAgaWYgKGFudGlSZXEpIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXEpKTtcbiAgICB9XG5cbiAgICAvLyBGb3J0dW5lIHRlbGxlciBjYW4gYmUgdGFsa2VkIHRvIGFjcm9zcyB0aGUgZGVzay5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLkZvcnR1bmVUZWxsZXIpIHtcbiAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgMF0sIFsyLCAwXSk7XG4gICAgfVxuXG4gICAgLy8gcmVxIGlzIG5vdyBtdXRhYmxlXG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcSkpIHJldHVybjsgLy8gbm90aGluZyB0byBkbyBpZiBpdCBuZXZlciBzcGF3bnMuXG4gICAgY29uc3QgW1suLi5jb25kc11dID0gcmVxO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBnbG9iYWwgZGlhbG9ncyAtIGRvIG5vdGhpbmcgaWYgd2UgY2FuJ3QgcGFzcyB0aGVtLlxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKCFmPy5sb2dpYy50cmFjaykgY29udGludWU7XG4gICAgICBjb25kcy5wdXNoKGYuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGFwcHJvcHJpYXRlIGxvY2FsIGRpYWxvZ3NcbiAgICBjb25zdCBsb2NhbHMgPVxuICAgICAgICBucGMubG9jYWxEaWFsb2dzLmdldChsb2NhdGlvbi5pZCkgPz8gbnBjLmxvY2FsRGlhbG9ncy5nZXQoLTEpID8/IFtdO1xuICAgIGZvciAoY29uc3QgZCBvZiBsb2NhbHMpIHtcbiAgICAgIC8vIENvbXB1dGUgdGhlIGNvbmRpdGlvbiAncicgZm9yIHRoaXMgbWVzc2FnZS5cbiAgICAgIGNvbnN0IHIgPSBbLi4uY29uZHNdO1xuICAgICAgY29uc3QgZjAgPSB0aGlzLmZsYWcoZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYwPy5sb2dpYy50cmFjaykge1xuICAgICAgICByLnB1c2goZjAuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHJvY2Vzc0RpYWxvZyhoaXRib3gsIG5wYywgciwgZCk7XG4gICAgICAvLyBBZGQgYW55IG5ldyBjb25kaXRpb25zIHRvICdjb25kcycgdG8gZ2V0IGJleW9uZCB0aGlzIG1lc3NhZ2UuXG4gICAgICBjb25zdCBmMSA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYxPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjb25kcy5wdXNoKGYxLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0RpYWxvZyhoaXRib3g6IEhpdGJveCwgbnBjOiBOcGMsXG4gICAgICAgICAgICAgICAgcmVxOiByZWFkb25seSBDb25kaXRpb25bXSwgZGlhbG9nOiBMb2NhbERpYWxvZykge1xuICAgIHRoaXMuYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94LCBbcmVxXSwgZGlhbG9nLmZsYWdzKTtcblxuICAgIGNvbnN0IGluZm8gPSB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX07XG4gICAgc3dpdGNoIChkaWFsb2cubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgwODogLy8gb3BlbiBzd2FuIGdhdGVcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKGhpdGJveCwgW3JlcV0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBjOiAvLyBkd2FyZiBjaGlsZCBzdGFydHMgZm9sbG93aW5nXG4gICAgICAvLyAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGQ6IC8vIG5wYyB3YWxrcyBhd2F5XG4gICAgICAvLyAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTQ6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlNsaW1lZEtlbnN1LmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Bc2luYUluQmFja1Jvb20uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDExOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzFdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwMzpcbiAgICAgIGNhc2UgMHgwYTogLy8gbm9ybWFsbHkgdGhpcyBoYXJkLWNvZGVzIGdsb3dpbmcgbGFtcCwgYnV0IHdlIGV4dGVuZGVkIGl0XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMF0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA5OlxuICAgICAgICAvLyBJZiB6ZWJ1IHN0dWRlbnQgaGFzIGFuIGl0ZW0uLi4/ICBUT0RPIC0gc3RvcmUgZmYgaWYgdW51c2VkXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBucGMuZGF0YVsxXTtcbiAgICAgICAgaWYgKGl0ZW0gIT09IDB4ZmYpIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgaXRlbSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTk6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQWthaGFuYUZsdXRlT2ZMaW1lVHJhZGVpbi5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWE6XG4gICAgICAgIC8vIFRPRE8gLSBjYW4gd2UgcmVhY2ggdGhpcyBzcG90PyAgbWF5IG5lZWQgdG8gbW92ZSBkb3duP1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5SYWdlLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYjpcbiAgICAgICAgLy8gUmFnZSB0aHJvd2luZyBwbGF5ZXIgb3V0Li4uXG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIGFjdHVhbGx5IGFscmVhZHkgYmUgaGFuZGxlZCBieSB0aGUgc3RhdHVlIGNvZGUgYWJvdmU/XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBhZGQgZXh0cmEgZGlhbG9ncyBmb3IgaXRlbXVzZSB0cmFkZXMsIGV4dHJhIHRyaWdnZXJzXG4gICAgLy8gICAgICAtIGlmIGl0ZW0gdHJhZGVkIGJ1dCBubyByZXdhcmQsIHRoZW4gcmUtZ2l2ZSByZXdhcmQuLi5cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQofmxvY2F0aW9uLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShbdGhpcy5lbnRyYW5jZShsb2NhdGlvbildLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZU1vdmluZ0d1YXJkKGhpdGJveDogSGl0Ym94LCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcTogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBUaGlzIGlzIHRoZSAxYiB0cmlnZ2VyIGFjdGlvbiBmb2xsb3ctdXAuICBJdCBsb29rcyBmb3IgYW4gTlBDIGluIDBkIG9yIDBlXG4gICAgLy8gYW5kIG1vdmVzIHRoZW0gb3ZlciBhIHBpeGVsLiAgRm9yIHRoZSBsb2dpYywgaXQncyBhbHdheXMgaW4gYSBwb3NpdGlvblxuICAgIC8vIHdoZXJlIGp1c3QgbWFraW5nIHRoZSB0cmlnZ2VyIHNxdWFyZSBiZSBhIG5vLWV4aXQgc3F1YXJlIGlzIHN1ZmZpY2llbnQsXG4gICAgLy8gYnV0IHdlIG5lZWQgdG8gZ2V0IHRoZSBjb25kaXRpb25zIHJpZ2h0LiAgV2UgcGFzcyBpbiB0aGUgcmVxdWlyZW1lbnRzIHRvXG4gICAgLy8gTk9UIHRyaWdnZXIgdGhlIHRyaWdnZXIsIGFuZCB0aGVuIHdlIGpvaW4gaW4gcGFyYWx5c2lzIGFuZC9vciBzdGF0dWVcbiAgICAvLyBnbGl0Y2ggaWYgYXBwcm9wcmlhdGUuICBUaGVyZSBjb3VsZCB0aGVvcmV0aWNhbGx5IGJlIGNhc2VzIHdoZXJlIHRoZVxuICAgIC8vIGd1YXJkIGlzIHBhcmFseXphYmxlIGJ1dCB0aGUgZ2VvbWV0cnkgcHJldmVudHMgdGhlIHBsYXllciBmcm9tIGFjdHVhbGx5XG4gICAgLy8gaGl0dGluZyB0aGVtIGJlZm9yZSB0aGV5IG1vdmUsIGJ1dCBpdCBkb2Vzbid0IGhhcHBlbiBpbiBwcmFjdGljZS5cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSByZXR1cm47XG4gICAgY29uc3QgZXh0cmE6IENvbmRpdGlvbltdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducy5zbGljZSgwLCAyKSkge1xuICAgICAgaWYgKHNwYXduLmlzTnBjKCkgJiYgdGhpcy5yb20ubnBjc1tzcGF3bi5pZF0uaXNQYXJhbHl6YWJsZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goW3RoaXMucm9tLmZsYWdzLlBhcmFseXNpcy5pZCBhcyBDb25kaXRpb25dKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKFsuLi5yZXEsIC4uLmV4dHJhXS5tYXAoc3ByZWFkKSkpO1xuXG5cbiAgICAvLyBUT0RPIC0gUG9ydG9hIGd1YXJkcyBhcmUgYnJva2VuIDotKFxuICAgIC8vIFRoZSBiYWNrIGd1YXJkIG5lZWRzIHRvIGJsb2NrIG9uIHRoZSBmcm9udCBndWFyZCdzIGNvbmRpdGlvbnMsXG4gICAgLy8gd2hpbGUgdGhlIGZyb250IGd1YXJkIHNob3VsZCBibG9jayBvbiBmb3J0dW5lIHRlbGxlcj9cblxuICB9XG5cbiAgaGFuZGxlQm9hdCh0aWxlOiBUaWxlSWQsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIGJvYXJkIGJvYXQgLSB0aGlzIGFtb3VudHMgdG8gYWRkaW5nIGEgcm91dGUgZWRnZSBmcm9tIHRoZSB0aWxlXG4gICAgLy8gdG8gdGhlIGxlZnQsIHRocm91Z2ggYW4gZXhpdCwgYW5kIHRoZW4gY29udGludWluZyB1bnRpbCBmaW5kaW5nIGxhbmQuXG4gICAgY29uc3QgdDAgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodGlsZSk7XG4gICAgaWYgKHQwID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgd2Fsa2FibGUgbmVpZ2hib3IuYCk7XG4gICAgY29uc3QgeXQgPSAodGlsZSA+PiA4KSAmIDB4ZjAgfCAodGlsZSA+PiA0KSAmIDB4ZjtcbiAgICBjb25zdCB4dCA9ICh0aWxlID4+IDQpICYgMHhmMCB8IHRpbGUgJiAweGY7XG4gICAgbGV0IGJvYXRFeGl0O1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgaWYgKGV4aXQueXQgPT09IHl0ICYmIGV4aXQueHQgPCB4dCkgYm9hdEV4aXQgPSBleGl0O1xuICAgIH1cbiAgICBpZiAoIWJvYXRFeGl0KSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGJvYXQgZXhpdGApO1xuICAgIC8vIFRPRE8gLSBsb29rIHVwIHRoZSBlbnRyYW5jZS5cbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2JvYXRFeGl0LmRlc3RdO1xuICAgIGlmICghZGVzdCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZGVzdGluYXRpb25gKTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2JvYXRFeGl0LmVudHJhbmNlXTtcbiAgICBjb25zdCBlbnRyYW5jZVRpbGUgPSBUaWxlSWQuZnJvbShkZXN0LCBlbnRyYW5jZSk7XG4gICAgbGV0IHQgPSBlbnRyYW5jZVRpbGU7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHQgPSBUaWxlSWQuYWRkKHQsIDAsIC0xKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpO1xuICAgICAgaWYgKHQxICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgYm9hdDogVGVycmFpbiA9IHtcbiAgICAgICAgICBlbnRlcjogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50cyksXG4gICAgICAgICAgZXhpdDogW1sweGYsIFJlcXVpcmVtZW50Lk9QRU5dXSxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKFt0MF0sIGJvYXQpO1xuICAgICAgICB0aGlzLmV4aXRzLnNldCh0MCwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKHQwLCB0MSkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50LCBncmFudElkOiBudW1iZXIpIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtR3JhbnQoZ3JhbnRJZCk7XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgaXRlbTtcbiAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgaXRlbSBncmFudCBmb3IgJHtncmFudElkLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgLy8gaXMgdGhlIDEwMCBmbGFnIHN1ZmZpY2llbnQgaGVyZT8gIHByb2JhYmx5P1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gZ3JhbnRJZCA+PSAweDgwOyAvLyBncmFudGVkIGZyb20gYSB0cmlnZ2VyXG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsIHNsb3QsXG4gICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWUsIHByZXZlbnRMb3NzfSk7XG4gIH1cblxuICBhZGRUZXJyYWluKGhpdGJveDogSGl0Ym94LCB0ZXJyYWluOiBUZXJyYWluKSB7XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgY29uc3QgdCA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgaWYgKHQgPT0gbnVsbCkgY29udGludWU7IC8vIHVucmVhY2hhYmxlIHRpbGVzIGRvbid0IG5lZWQgZXh0cmEgcmVxc1xuICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5tZWV0KHQsIHRlcnJhaW4pKTtcbiAgICB9XG4gIH1cblxuICBhZGRDaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBjaGVja3M6IG51bWJlcltdKSB7XG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcXVpcmVtZW50KSkgcmV0dXJuOyAvLyBkbyBub3RoaW5nIGlmIHVucmVhY2hhYmxlXG4gICAgY29uc3QgY2hlY2sgPSB7cmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudCksIGNoZWNrc307XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0aWxlKSkgY29udGludWU7XG4gICAgICB0aGlzLmNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICB9XG4gIH1cblxuICBhZGRJdGVtQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCxcbiAgICAgICAgICAgICAgIGNoZWNrOiBudW1iZXIsIHNsb3Q6IFNsb3RJbmZvKSB7XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBbY2hlY2tdKTtcbiAgICB0aGlzLnNsb3RzLnNldChjaGVjaywgc2xvdCk7XG4gICAgLy8gYWxzbyBhZGQgY29ycmVzcG9uZGluZyBJdGVtSW5mbyB0byBrZWVwIHRoZW0gaW4gcGFyaXR5LlxuICAgIGNvbnN0IGl0ZW1nZXQgPSB0aGlzLnJvbS5pdGVtR2V0c1tjaGVjayAmIDB4ZmZdO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1tpdGVtZ2V0Lml0ZW1JZF07XG4gICAgY29uc3QgdW5pcXVlID0gaXRlbT8udW5pcXVlO1xuICAgIGNvbnN0IGxvc2FibGUgPSBpdGVtZ2V0LmlzTG9zYWJsZSgpO1xuICAgIC8vIFRPRE8gLSByZWZhY3RvciB0byBqdXN0IFwiY2FuJ3QgYmUgYm91Z2h0XCI/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSB1bmlxdWUgfHwgaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuT3BlbFN0YXR1ZTtcbiAgICBsZXQgd2VpZ2h0ID0gMTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldpbmQpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZGaXJlKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2F0ZXIpIHdlaWdodCA9IDEwO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mVGh1bmRlcikgd2VpZ2h0ID0gMTU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLkZsaWdodCkgd2VpZ2h0ID0gMTU7XG4gICAgdGhpcy5pdGVtcy5zZXQoMHgyMDAgfCBpdGVtZ2V0LmlkLCB7dW5pcXVlLCBsb3NhYmxlLCBwcmV2ZW50TG9zcywgd2VpZ2h0fSk7XG4gIH1cblxuICBhZGRDaGVja0Zyb21GbGFncyhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBmbGFnczogbnVtYmVyW10pIHtcbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIGNoZWNrcyk7XG4gIH1cblxuICB3YWxrYWJsZU5laWdoYm9yKHQ6IFRpbGVJZCk6IFRpbGVJZHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodCkpIHJldHVybiB0O1xuICAgIGZvciAobGV0IGQgb2YgWy0xLCAxXSkge1xuICAgICAgY29uc3QgdDEgPSBUaWxlSWQuYWRkKHQsIGQsIDApO1xuICAgICAgY29uc3QgdDIgPSBUaWxlSWQuYWRkKHQsIDAsIGQpO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MSkpIHJldHVybiB0MTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDIpKSByZXR1cm4gdDI7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpc1dhbGthYmxlKHQ6IFRpbGVJZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKHRoaXMuZ2V0RWZmZWN0cyh0KSAmIFRlcnJhaW4uQklUUyk7XG4gIH1cblxuICBlbnN1cmVQYXNzYWJsZSh0OiBUaWxlSWQpOiBUaWxlSWQge1xuICAgIHJldHVybiB0aGlzLmlzV2Fsa2FibGUodCkgPyB0IDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQ7XG4gIH1cblxuICBnZXRFZmZlY3RzKHQ6IFRpbGVJZCk6IG51bWJlciB7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbdCA+Pj4gMTZdO1xuICAgIGNvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdLmVmZmVjdHM7XG4gICAgY29uc3Qgc2NyID0gbG9jYXRpb24uc2NyZWVuc1sodCAmIDB4ZjAwMCkgPj4+IDEyXVsodCAmIDB4ZjAwKSA+Pj4gOF0gfCBwYWdlO1xuICAgIHJldHVybiBlZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl1dO1xuICB9XG5cbiAgcHJvY2Vzc0Jvc3MobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgIC8vIGFuZCB3aWxsIGFsc28gYWRkIHRoZWlyIGRyb3AuXG4gICAgaWYgKHNwYXduLmlkID09PSAweGM5IHx8IHNwYXduLmlkID09PSAweGNhKSByZXR1cm47IC8vIHN0YXR1ZXNcbiAgICBjb25zdCBpc1JhZ2UgPSBzcGF3bi5pZCA9PT0gMHhjMztcbiAgICBjb25zdCBib3NzID1cbiAgICAgICAgaXNSYWdlID8gdGhpcy5yb20uYm9zc2VzLlJhZ2UgOlxuICAgICAgICB0aGlzLnJvbS5ib3NzZXMuZnJvbUxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBpZiAoIWJvc3MgfHwgIWJvc3MuZmxhZykgdGhyb3cgbmV3IEVycm9yKGBCYWQgYm9zcyBhdCAke2xvY2F0aW9uLm5hbWV9YCk7XG4gICAgY29uc3Qgc2NyZWVuID0gdGlsZSAmIH4weGZmO1xuICAgIC8vIE5PVEU6IFJhZ2UgY2FuIGJlIGV4aXRlZCBzb3V0aC4uLiBidXQgdGhpcyBvbmx5IG1hdHRlcnMgaWYgdGhlcmUnc1xuICAgIC8vIGFueXRoaW5nIG90aGVyIHRoYW4gTWVzaWEncyBzaHJpbmUgYmVoaW5kIGhpbSwgd2hpY2ggbWFrZXMgYSBsb3Qgb2ZcbiAgICAvLyBsb2dpYyBtb3JlIGRpZmZpY3VsdCwgc28gbGlrZWx5IHRoaXMgZW50cmFuY2Ugd2lsbCBzdGF5IHB1dCBmb3JldmVyLlxuICAgIGNvbnN0IGJvc3NUZXJyYWluID0gdGhpcy50ZXJyYWluRmFjdG9yeS5ib3NzKGJvc3MuZmxhZy5pZCk7XG4gICAgY29uc3QgaGl0Ym94ID0gc2VxKDB4ZjAsICh0OiBudW1iZXIpID0+IChzY3JlZW4gfCB0KSBhcyBUaWxlSWQpO1xuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIGJvc3NUZXJyYWluKTtcbiAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIGJvc3MpO1xuICB9XG5cbiAgYWRkQm9zc0NoZWNrKGhpdGJveDogSGl0Ym94LCBib3NzOiBCb3NzLFxuICAgICAgICAgICAgICAgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCA9IFJlcXVpcmVtZW50Lk9QRU4pIHtcbiAgICBpZiAoYm9zcy5mbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYSBmbGFnOiAke2Jvc3N9YCk7XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyhib3NzKSk7XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5EcmF5Z29uMikge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcSwgW2Jvc3MuZmxhZy5pZF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICBoaXRib3gsIHJlcSwgYm9zcy5mbGFnLmlkLCB7bG9zc3k6IGZhbHNlLCB1bmlxdWU6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzQ2hlc3QobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBBZGQgYSBjaGVjayBmb3IgdGhlIDF4eCBmbGFnLiAgTWFrZSBzdXJlIGl0J3Mgbm90IGEgbWltaWMuXG4gICAgaWYgKHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXSA+PSAweDcwKSByZXR1cm47XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgc3Bhd24uaWQ7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW3NwYXduLmlkXTtcbiAgICBjb25zdCB1bmlxdWUgPSB0aGlzLmZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSA/ICEhaXRlbT8udW5pcXVlIDogdHJ1ZTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sIFJlcXVpcmVtZW50Lk9QRU4sXG4gICAgICAgICAgICAgICAgICAgICAgc2xvdCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlfSk7XG4gIH1cblxuICBwcm9jZXNzTW9uc3RlcihfbG9jYXRpb246IExvY2F0aW9uLCBfc3Bhd246IFNwYXduKSB7XG4gICAgICAgIC8vIFRPRE8gLSBjb21wdXRlIG1vbmV5LWRyb3BwaW5nIG1vbnN0ZXIgdnVsbmVyYWJpbGl0aWVzIGFuZCBhZGQgYSB0cmlnZ2VyXG4gICAgICAgIC8vIGZvciB0aGUgTU9ORVkgY2FwYWJpbGl0eSBkZXBlbmRlbnQgb24gYW55IG9mIHRoZSBzd29yZHMuXG4gICAgLy8gY29uc3QgbW9uc3RlciA9IHJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgLy8gaWYgKG1vbnN0ZXIuZ29sZERyb3ApIG1vbnN0ZXJzLnNldChUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCBtb25zdGVyLmVsZW1lbnRzKTtcbiAgfVxuXG4gIHByb2Nlc3NJdGVtVXNlKGhpdGJveDogSGl0Ym94LCBpdGVtOiBJdGVtLCB1c2U6IEl0ZW1Vc2UpIHtcbiAgICAvLyB0aGlzIHNob3VsZCBoYW5kbGUgbW9zdCB0cmFkZS1pbnMgYXV0b21hdGljYWxseVxuICAgIGhpdGJveCA9IG5ldyBTZXQoWy4uLmhpdGJveF0ubWFwKHQgPT4gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQpKTtcbiAgICBjb25zdCByZXEgPSBbWygweDIwMCB8IGl0ZW0uaWQpIGFzIENvbmRpdGlvbl1dOyAvLyByZXF1aXJlcyB0aGUgaXRlbS5cbiAgICAvLyBjaGVjayBmb3Iga2lyaXNhIHBsYW50LCBhZGQgY2hhbmdlIGFzIGEgcmVxdWlyZW1lbnQuXG4gICAgaWYgKGl0ZW0uaWQgPT09IHRoaXMucm9tLnByZ1sweDNkNGI1XSArIDB4MWMpIHtcbiAgICAgIHJlcVswXS5wdXNoKHRoaXMucm9tLmZsYWdzLkNoYW5nZS5jKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk1lZGljYWxIZXJiKSB7IC8vIGRvbHBoaW5cbiAgICAgIHJlcVswXVswXSA9IHRoaXMucm9tLmZsYWdzLkJ1eUhlYWxpbmcuYzsgLy8gbm90ZTogbm8gb3RoZXIgaGVhbGluZyBpdGVtc1xuICAgIH1cbiAgICAvLyBzZXQgYW55IGZsYWdzXG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIHJlcSwgdXNlLmZsYWdzKTtcbiAgICAvLyBoYW5kbGUgYW55IGV4dHJhIGFjdGlvbnNcbiAgICBzd2l0Y2ggKHVzZS5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDEwOlxuICAgICAgICAvLyB1c2Uga2V5XG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIHJlcSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6IGNhc2UgMHgxYzpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIGl0ZW0gSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxLCBpdGVtLmlkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDI6XG4gICAgICAgIC8vIGRvbHBoaW4gZGVmZXJzIHRvIGRpYWxvZyBhY3Rpb24gMTEgKGFuZCAwZCB0byBzd2ltIGF3YXkpXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAweDEwMCB8IHRoaXMucm9tLm5wY3NbdXNlLndhbnQgJiAweGZmXS5kYXRhWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzS2V5VXNlKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gc2V0IHRoZSBjdXJyZW50IHNjcmVlbidzIGZsYWcgaWYgdGhlIGNvbmRpdGlvbnMgYXJlIG1ldC4uLlxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIG9ubHkgYSBzaW5nbGUgc2NyZWVuLlxuICAgIGNvbnN0IFtzY3JlZW4sIC4uLnJlc3RdID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiBTY3JlZW5JZC5mcm9tKHQpKSk7XG4gICAgaWYgKHNjcmVlbiA9PSBudWxsIHx8IHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG9uZSBzY3JlZW5gKTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tzY3JlZW4gPj4+IDhdO1xuICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IChzY3JlZW4gJiAweGZmKSk7XG4gICAgaWYgKGZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBmbGFnIG9uIHNjcmVlbmApO1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtmbGFnLmZsYWddKTtcbiAgfVxuXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuUmFnZSkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBSYWdlLiAgRmlndXJlIG91dCB3aGF0IGhlIHdhbnRzIGZyb20gdGhlIGRpYWxvZy5cbiAgICAgIGNvbnN0IHVua25vd25Td29yZCA9IHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQucmFuZG9taXplVHJhZGVzKCk7XG4gICAgICBpZiAodW5rbm93blN3b3JkKSByZXR1cm4gdGhpcy5yb20uZmxhZ3MuU3dvcmQucjsgLy8gYW55IHN3b3JkIG1pZ2h0IGRvLlxuICAgICAgcmV0dXJuIFtbdGhpcy5yb20ubnBjcy5SYWdlLmRpYWxvZygpWzBdLmNvbmRpdGlvbiBhcyBDb25kaXRpb25dXTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCByID0gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgfHxcbiAgICAgICAgIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHIuYWRkQWxsKHRoaXMucm9tLmZsYWdzLlN3b3JkLnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgci5hZGRBbGwodGhpcy5zd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENhbid0IGFjdHVhbGx5IGtpbGwgdGhlIGJvc3MgaWYgaXQgZG9lc24ndCBzcGF3bi5cbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW10gPSBbXTtcbiAgICBpZiAoYm9zcy5ucGMgIT0gbnVsbCAmJiBib3NzLmxvY2F0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uID0gYm9zcy5ucGMuc3Bhd25zKHRoaXMucm9tLmxvY2F0aW9uc1tib3NzLmxvY2F0aW9uXSk7XG4gICAgICBleHRyYS5wdXNoKC4uLnRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9uKVswXSk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuSW5zZWN0KSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkluc2VjdEZsdXRlLmMsIHRoaXMucm9tLmZsYWdzLkdhc01hc2suYyk7XG4gICAgfSBlbHNlIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuQm93T2ZUcnV0aC5jKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuUmVmcmVzaC5jKTtcbiAgICB9XG4gICAgci5yZXN0cmljdChbZXh0cmFdKTtcbiAgICByZXR1cm4gUmVxdWlyZW1lbnQuZnJlZXplKHIpO1xuICB9XG5cbiAgc3dvcmRSZXF1aXJlbWVudChlbGVtZW50OiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gICAgY29uc3Qgc3dvcmQgPSBbXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZkZpcmUsXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAxKSByZXR1cm4gc3dvcmQucjtcbiAgICBjb25zdCBwb3dlcnMgPSBbXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuVG9ybmFkb0JyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZGaXJlLCB0aGlzLnJvbS5mbGFncy5GbGFtZUJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuQmxpenphcmRCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mVGh1bmRlciwgdGhpcy5yb20uZmxhZ3MuU3Rvcm1CcmFjZWxldF0sXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDMpIHJldHVybiBhbmQoc3dvcmQsIC4uLnBvd2Vycyk7XG4gICAgcmV0dXJuIHBvd2Vycy5tYXAocG93ZXIgPT4gW3N3b3JkLmMsIHBvd2VyLmNdKTtcbiAgfVxuXG4gIGl0ZW1HcmFudChpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0aGlzLnJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMpIHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaXRlbSBncmFudCAke2lkLnRvU3RyaW5nKDE2KX1gKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3IgYWxsIG9mIHRoZSBmbGFncyBiZWluZyBtZXQuICovXG4gIGZpbHRlclJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IGNvbmRzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA8IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvbmRzXTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3Igc29tZSBmbGFnIG5vdCBiZWluZyBtZXQuICovXG4gIGZpbHRlckFudGlSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCByZXEgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnID49IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5mbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIHJlcS5wdXNoKFtmLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVxO1xuICB9XG5cbiAgZmxhZyhmbGFnOiBudW1iZXIpOiBGbGFnfHVuZGVmaW5lZCB7XG4gICAgLy9jb25zdCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgIGNvbnN0IHVuc2lnbmVkID0gZmxhZzsgIC8vIFRPRE8gLSBzaG91bGQgd2UgYXV0by1pbnZlcnQ/XG4gICAgY29uc3QgZiA9IHRoaXMucm9tLmZsYWdzW3Vuc2lnbmVkXTtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmFsaWFzZXMuZ2V0KGYpID8/IGY7XG4gICAgcmV0dXJuIG1hcHBlZDtcbiAgfVxuXG4gIGVudHJhbmNlKGxvY2F0aW9uOiBMb2NhdGlvbnxudW1iZXIsIGluZGV4ID0gMCk6IFRpbGVJZCB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ251bWJlcicpIGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICByZXR1cm4gdGhpcy50aWxlcy5maW5kKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBsb2NhdGlvbi5lbnRyYW5jZXNbaW5kZXhdKSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh3YWxsOiBXYWxsVHlwZSk6IG51bWJlciB7XG4gICAgc3dpdGNoICh3YWxsKSB7XG4gICAgICBjYXNlIFdhbGxUeXBlLldJTkQ6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha1N0b25lLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5GSVJFOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJY2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLldBVEVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuRm9ybUJyaWRnZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuVEhVTkRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSXJvbi5pZDtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgYmFkIHdhbGwgdHlwZTogJHt3YWxsfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhbmQoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gIHJldHVybiBbZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBmLmlkIGFzIENvbmRpdGlvbildO1xufVxuXG5mdW5jdGlvbiBvciguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgcmV0dXJuIGZsYWdzLm1hcCgoZjogRmxhZykgPT4gW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG59XG5cbi8vIEFuIGludGVyZXN0aW5nIHdheSB0byB0cmFjayB0ZXJyYWluIGNvbWJpbmF0aW9ucyBpcyB3aXRoIHByaW1lcy5cbi8vIElmIHdlIGhhdmUgTiBlbGVtZW50cyB3ZSBjYW4gbGFiZWwgZWFjaCBhdG9tIHdpdGggYSBwcmltZSBhbmRcbi8vIHRoZW4gbGFiZWwgYXJiaXRyYXJ5IGNvbWJpbmF0aW9ucyB3aXRoIHRoZSBwcm9kdWN0LiAgRm9yIE49MTAwMFxuLy8gdGhlIGhpZ2hlc3QgbnVtYmVyIGlzIDgwMDAsIHNvIHRoYXQgaXQgY29udHJpYnV0ZXMgYWJvdXQgMTMgYml0c1xuLy8gdG8gdGhlIHByb2R1Y3QsIG1lYW5pbmcgd2UgY2FuIHN0b3JlIGNvbWJpbmF0aW9ucyBvZiA0IHNhZmVseVxuLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gYmlnaW50LiAgVGhpcyBpcyBpbmhlcmVudGx5IG9yZGVyLWluZGVwZW5kZW50LlxuLy8gSWYgdGhlIHJhcmVyIG9uZXMgYXJlIGhpZ2hlciwgd2UgY2FuIGZpdCBzaWduaWZpY2FudGx5IG1vcmUgdGhhbiA0LlxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyBEZWJ1ZyBpbnRlcmZhY2UuXG5leHBvcnQgaW50ZXJmYWNlIEFyZWFEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xuICBjaGVja3M6IEFycmF5PFtGbGFnLCBSZXF1aXJlbWVudF0+O1xuICB0ZXJyYWluOiBUZXJyYWluO1xuICBsb2NhdGlvbnM6IFNldDxudW1iZXI+O1xuICByb3V0ZXM6IFJlcXVpcmVtZW50LkZyb3plbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZURhdGEge1xuICBhcmVhOiBBcmVhRGF0YTtcbiAgZXhpdD86IFRpbGVJZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYXM6IFNldDxBcmVhRGF0YT47XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV29ybGREYXRhIHtcbiAgdGlsZXM6IE1hcDxUaWxlSWQsIFRpbGVEYXRhPjtcbiAgYXJlYXM6IEFyZWFEYXRhW107XG4gIGxvY2F0aW9uczogTG9jYXRpb25EYXRhW107XG59XG4iXX0=