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
        const itemget = this.rom.itemGets[check & 0xff];
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
        const item = this.rom.items[spawn.id];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBZWpCLE1BQU0sT0FBTyxLQUFLO0lBbUVoQixZQUFxQixHQUFRLEVBQVcsT0FBZ0IsRUFDbkMsVUFBVSxLQUFLO1FBRGYsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFXLFlBQU8s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QUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNQLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsRUFDMUQsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsRUFBRTtZQUN4QyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzFEO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FDWCxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxXQUFXLENBQUMsRUFDakQsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN4QjtRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO1lBRXJDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQ1AsYUFBYSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUN2QyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDdkM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMvQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3BDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUcxQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNwRTtRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUU7WUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2xFO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDekQ7SUFDSCxDQUFDO0lBR0QsY0FBYzs7UUFDWixNQUFNLEVBQ0osS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFDLEVBQ3BELFNBQVMsRUFBRSxFQUFDLFlBQVksRUFBQyxHQUMxQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFFYixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUN6QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFDdEMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQ3RDLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFEO1FBRUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lBQ2pDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO2dCQUVsRCxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO29CQUFFLFNBQVM7Z0JBR3BFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3pDLE1BQU0sT0FBTyxTQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxtQ0FBSSxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ25FLEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtvQkFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUM1RDthQUNGO1NBQ0Y7SUFDSCxDQUFDO0lBR0QsaUJBQWlCO1FBQ2YsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDeEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkMsSUFBSSxJQUFJLEtBQUssSUFBSTtnQkFBRSxTQUFTO1lBQzVCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO2dCQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDbEM7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMxQjtJQUNILENBQUM7SUFHRCxtQkFBbUI7UUFDakIsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDMUMsS0FBSyxNQUFNLEVBQUMsTUFBTSxFQUFFLFdBQVcsRUFBQyxJQUFJLFFBQVEsRUFBRTtnQkFDNUMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7b0JBQzFCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQWtCLENBQUMsQ0FBQztvQkFDeEQsS0FBSyxNQUFNLEVBQUUsSUFBSSxXQUFXLEVBQUU7d0JBQzVCLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFOzRCQUM1QyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO3lCQUM3QjtxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7UUFHRCxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU87UUFDbkIsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2YsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDOUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuRCxLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsRUFBRTtnQkFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbkU7U0FDRjtRQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBR0QsZUFBZSxDQUFDLFNBQVMsR0FBRyxXQUFXO1FBRXJDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3JFLE9BQU87WUFDTCxTQUFTO1lBQ1QsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjO1lBQ2pDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsU0FBUyxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUQsT0FBTyxFQUFFLENBQUMsTUFBYyxFQUFFLEVBQUU7Z0JBQzFCLE1BQU0sRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUU7b0JBRWpDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNsRDtnQkFDRCxPQUFPLEdBQUcsQ0FBQztZQUViLENBQUM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQUdELGVBQWUsQ0FBQyxRQUFrQjtRQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7WUFBRSxPQUFPO1FBRTNCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFHRCxjQUFjO1FBQ1osS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDM0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssT0FBTztnQkFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLE9BQU87Z0JBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNyRTtJQUNILENBQUM7SUFHRCxZQUFZO1FBRVYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXRCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3pDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRTtnQkFDcEMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztvQkFBRSxTQUFTO2dCQUM1QixLQUFLLE1BQU0sU0FBUyxJQUFJLE9BQU8sRUFBRTtvQkFDL0IsS0FBSyxNQUFNLFVBQVUsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFO3dCQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLEdBQUcsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDakU7aUJBQ0Y7YUFDRjtTQUNGO1FBQ0QsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUU7WUFDaEMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMvQyxJQUFJLEtBQUssRUFBRTtnQkFDVCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEU7U0FDRjtJQUNILENBQUM7SUFFRCxZQUFZO1FBQ1YsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQW1CLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFhLENBQUMsQ0FBQztRQUN2RSxNQUFNLFNBQVMsR0FDWCxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBQyxLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBa0IsQ0FBQSxDQUFDLENBQUM7UUFDM0UsTUFBTSxLQUFLLEdBQWUsRUFBRSxDQUFDO1FBRzdCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLE9BQU87Z0JBQUUsU0FBUztZQUN2QixNQUFNLE1BQU0sR0FDUixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQUUsU0FBUztZQUM3QixNQUFNLElBQUksR0FBYTtnQkFDckIsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsRUFBRSxFQUFFLEtBQUssRUFBRTtnQkFDWCxTQUFTLEVBQUUsSUFBSSxHQUFHLEVBQUU7Z0JBQ3BCLE1BQU07Z0JBQ04sT0FBTztnQkFDUCxLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUU7YUFDakIsQ0FBQztZQUNGLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakIsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLEVBQUU7Z0JBQ3RCLE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7YUFDN0I7U0FDRjtRQUVELEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQy9CLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDaEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO2FBQ3ZCO1NBQ0Y7UUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUMxQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNsQyxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUlULFNBQVM7YUFDVjtZQUNELEtBQUssTUFBTSxFQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUMsSUFBSSxRQUFRLEVBQUU7Z0JBQzVDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO29CQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztpQkFDdkM7YUFDRjtTQUNGO1FBQ0QsT0FBTyxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFDLENBQUM7SUFDbkMsQ0FBQztJQUdELFFBQVEsQ0FBQyxLQUFZLEVBQUUsTUFBZTtRQUNwQyxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFHbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN0RTtZQUNELE9BQU87U0FDUjtRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxFQUFTLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLEVBQVMsQ0FBQztRQUNyQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDcEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDdEMsT0FBTyxJQUFJLEVBQUU7WUFDWCxNQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQyxJQUFJLElBQUk7Z0JBQUUsT0FBTztZQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQVMsQ0FBQztZQUN2QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDM0IsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDOUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbkU7YUFDRjtZQUNELEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFO2dCQUN6QixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO29CQUFFLFNBQVM7Z0JBQzdCLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25CLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakI7U0FDRjtJQUNILENBQUM7SUFRRCxXQUFXO1FBRVQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQ1osUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUQ7UUFHRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDL0IsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUFFLFNBQVM7WUFDaEUsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzlCO1NBQ0Y7SUFDSCxDQUFDO0lBU0QsY0FBYztRQUVaLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQzNDLElBQUksQ0FBQyxPQUFPO2dCQUFFLFNBQVM7WUFDdkIsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2xDLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxPQUFPLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNuRDtZQUNELE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsQyxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFO2dCQUMxQixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbEQ7U0FDRjtRQUVELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUMvQixNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUFFLFNBQVM7WUFDL0QsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNsRDtJQUNILENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEdBQVE7UUFFdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBRS9CLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQy9EO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBRS9CLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFD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LE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztDQUNGO0FBRUQsU0FBUyxHQUFHLENBQUMsR0FBRyxLQUFhO0lBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFhO0lBQzFCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBVUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcmVhfSBmcm9tICcuLi9zcG9pbGVyL2FyZWEuanMnO1xuaW1wb3J0IHtkaWV9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0ZsYWcsIExvZ2ljfSBmcm9tICcuLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtJdGVtLCBJdGVtVXNlfSBmcm9tICcuLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TG9jYWxEaWFsb2csIE5wY30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleCwgc2VxfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcCwgTGFiZWxlZFNldCwgaXRlcnMsIHNwcmVhZH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge0Rpcn0gZnJvbSAnLi9kaXIuanMnO1xuaW1wb3J0IHtJdGVtSW5mbywgTG9jYXRpb25MaXN0LCBTbG90SW5mb30gZnJvbSAnLi9ncmFwaC5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9oaXRib3guanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50LCBSb3V0ZX0gZnJvbSAnLi9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1NjcmVlbklkfSBmcm9tICcuL3NjcmVlbmlkLmpzJztcbmltcG9ydCB7VGVycmFpbiwgVGVycmFpbnN9IGZyb20gJy4vdGVycmFpbi5qcyc7XG5pbXBvcnQge1RpbGVJZH0gZnJvbSAnLi90aWxlaWQuanMnO1xuaW1wb3J0IHtUaWxlUGFpcn0gZnJvbSAnLi90aWxlcGFpci5qcyc7XG5pbXBvcnQge1dhbGxUeXBlfSBmcm9tICcuL3dhbGx0eXBlLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuaW50ZXJmYWNlIENoZWNrIHtcbiAgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50O1xuICBjaGVja3M6IG51bWJlcltdO1xufVxuXG4vLyBCYXNpYyBhbGdvcml0aG06XG4vLyAgMS4gZmlsbCB0ZXJyYWlucyBmcm9tIG1hcHNcbi8vICAyLiBtb2RpZnkgdGVycmFpbnMgYmFzZWQgb24gbnBjcywgdHJpZ2dlcnMsIGJvc3NlcywgZXRjXG4vLyAgMi4gZmlsbCBhbGxFeGl0c1xuLy8gIDMuIHN0YXJ0IHVuaW9uZmluZFxuLy8gIDQuIGZpbGwgLi4uP1xuXG4vKiogU3RvcmVzIGFsbCB0aGUgcmVsZXZhbnQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHdvcmxkJ3MgbG9naWMuICovXG5leHBvcnQgY2xhc3MgV29ybGQge1xuXG4gIC8qKiBCdWlsZHMgYW5kIGNhY2hlcyBUZXJyYWluIG9iamVjdHMuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5GYWN0b3J5ID0gbmV3IFRlcnJhaW5zKHRoaXMucm9tKTtcblxuICAvKiogVGVycmFpbnMgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbnMgPSBuZXcgTWFwPFRpbGVJZCwgVGVycmFpbj4oKTtcblxuICAvKiogQ2hlY2tzIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IGNoZWNrcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgU2V0PENoZWNrPj4oKCkgPT4gbmV3IFNldCgpKTtcblxuICAvKiogU2xvdCBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgc2xvdHMgPSBuZXcgTWFwPG51bWJlciwgU2xvdEluZm8+KCk7XG4gIC8qKiBJdGVtIGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBpdGVtcyA9IG5ldyBNYXA8bnVtYmVyLCBJdGVtSW5mbz4oKTtcblxuICAvKiogRmxhZ3MgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBkaXJlY3QgYWxpYXNlcyBmb3IgbG9naWMuICovXG4gIHJlYWRvbmx5IGFsaWFzZXM6IE1hcDxGbGFnLCBGbGFnPjtcblxuICAvKiogTWFwcGluZyBmcm9tIGl0ZW11c2UgdHJpZ2dlcnMgdG8gdGhlIGl0ZW11c2UgdGhhdCB3YW50cyBpdC4gKi9cbiAgcmVhZG9ubHkgaXRlbVVzZXMgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIFtJdGVtLCBJdGVtVXNlXVtdPigoKSA9PiBbXSk7XG5cbiAgLyoqIFJhdyBtYXBwaW5nIG9mIGV4aXRzLCB3aXRob3V0IGNhbm9uaWNhbGl6aW5nLiAqL1xuICByZWFkb25seSBleGl0cyA9IG5ldyBNYXA8VGlsZUlkLCBUaWxlSWQ+KCk7XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBleGl0cyB0byBlbnRyYW5jZXMuICBUaWxlUGFpciBpcyBjYW5vbmljYWxpemVkLiAqL1xuICByZWFkb25seSBleGl0U2V0ID0gbmV3IFNldDxUaWxlUGFpcj4oKTtcblxuICAvKipcbiAgICogU2V0IG9mIFRpbGVJZHMgd2l0aCBzZWFtbGVzcyBleGl0cy4gIFRoaXMgaXMgdXNlZCB0byBlbnN1cmUgdGhlXG4gICAqIGxvZ2ljIHVuZGVyc3RhbmRzIHRoYXQgdGhlIHBsYXllciBjYW4ndCB3YWxrIGFjcm9zcyBhbiBleGl0IHRpbGVcbiAgICogd2l0aG91dCBjaGFuZ2luZyBsb2NhdGlvbnMgKHByaW1hcmlseSBmb3IgZGlzYWJsaW5nIHRlbGVwb3J0XG4gICAqIHNraXApLlxuICAgKi9cbiAgcmVhZG9ubHkgc2VhbWxlc3NFeGl0cyA9IG5ldyBTZXQ8VGlsZUlkPigpO1xuXG4gIC8qKlxuICAgKiBVbmlvbmZpbmQgb2YgY29ubmVjdGVkIGNvbXBvbmVudHMgb2YgdGlsZXMuICBOb3RlIHRoYXQgYWxsIHRoZVxuICAgKiBhYm92ZSBwcm9wZXJ0aWVzIGNhbiBiZSBidWlsdCB1cCBpbiBwYXJhbGxlbCwgYnV0IHRoZSB1bmlvbmZpbmRcbiAgICogY2Fubm90IGJlIHN0YXJ0ZWQgdW50aWwgYWZ0ZXIgYWxsIHRlcnJhaW5zIGFuZCBleGl0cyBhcmVcbiAgICogcmVnaXN0ZXJlZCwgc2luY2Ugd2Ugc3BlY2lmaWNhbGx5IG5lZWQgdG8gKm5vdCogdW5pb24gY2VydGFpblxuICAgKiBuZWlnaGJvcnMuXG4gICAqL1xuICByZWFkb25seSB0aWxlcyA9IG5ldyBVbmlvbkZpbmQ8VGlsZUlkPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgVGlsZVBhaXJzIG9mIGNhbm9uaWNhbCB1bmlvbmZpbmQgcmVwcmVzZW50YXRpdmUgVGlsZUlkcyB0b1xuICAgKiBhIGJpdHNldCBvZiBuZWlnaGJvciBkaXJlY3Rpb25zLiAgV2Ugb25seSBuZWVkIHRvIHdvcnJ5IGFib3V0XG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIGJlY2F1c2UgYWxsIFRpbGVJZHMgaGF2ZSB0aGUgc2FtZSB0ZXJyYWluLlxuICAgKiBXZSB3aWxsIGFkZCBhIHJvdXRlIGZvciBlYWNoIGRpcmVjdGlvbiB3aXRoIHVuaXF1ZSByZXF1aXJlbWVudHMuXG4gICAqL1xuICByZWFkb25seSBuZWlnaGJvcnMgPSBuZXcgRGVmYXVsdE1hcDxUaWxlUGFpciwgbnVtYmVyPigoKSA9PiAwKTtcblxuICAvKiogUmVxdWlyZW1lbnQgYnVpbGRlciBmb3IgcmVhY2hpbmcgZWFjaCBjYW5vbmljYWwgVGlsZUlkLiAqL1xuICByZWFkb25seSByb3V0ZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcigpKTtcblxuICAvKiogUm91dGVzIG9yaWdpbmF0aW5nIGZyb20gZWFjaCBjYW5vbmljYWwgdGlsZS4gKi9cbiAgcmVhZG9ubHkgcm91dGVFZGdlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIExhYmVsZWRTZXQ8Um91dGU+PigoKSA9PiBuZXcgTGFiZWxlZFNldCgpKTtcblxuICAvKiogTG9jYXRpb24gbGlzdDogdGhpcyBpcyB0aGUgcmVzdWx0IG9mIGNvbWJpbmluZyByb3V0ZXMgd2l0aCBjaGVja3MuICovXG4gIHJlYWRvbmx5IHJlcXVpcmVtZW50TWFwID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPENvbmRpdGlvbiwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKGM6IENvbmRpdGlvbikgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoYykpO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLCByZWFkb25seSBmbGFnc2V0OiBGbGFnU2V0LFxuICAgICAgICAgICAgICByZWFkb25seSB0cmFja2VyID0gZmFsc2UpIHtcbiAgICAvLyBCdWlsZCBpdGVtVXNlc1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiByb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgdXNlIG9mIGl0ZW0uaXRlbVVzZURhdGEpIHtcbiAgICAgICAgaWYgKHVzZS5raW5kID09PSAnZXhwZWN0Jykge1xuICAgICAgICAgIHRoaXMuaXRlbVVzZXMuZ2V0KHVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfSBlbHNlIGlmICh1c2Uua2luZCA9PT0gJ2xvY2F0aW9uJykge1xuICAgICAgICAgIHRoaXMuaXRlbVVzZXMuZ2V0KH51c2Uud2FudCkucHVzaChbaXRlbSwgdXNlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQnVpbGQgYWxpYXNlc1xuICAgIHRoaXMuYWxpYXNlcyA9IG5ldyBNYXAoW1xuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VBa2FoYW5hLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU29sZGllciwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVN0b20sIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VXb21hbiwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5EYW5jZUhhbGwsIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgICAgW3JvbS5mbGFncy5QYXJhbHl6ZWRLZW5zdUluVGF2ZXJuLCByb20uZmxhZ3MuUGFyYWx5c2lzXSxcbiAgICBdKTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgbG9jYXRpb25zIHRvIGJ1aWxkIHVwIGluZm8gYWJvdXQgdGlsZXMsIHRlcnJhaW5zLCBjaGVja3MuXG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbik7XG4gICAgfVxuICAgIHRoaXMuYWRkRXh0cmFDaGVja3MoKTtcblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBVbmlvbkZpbmQgYW5kIHRoZSBleGl0cyBhbmQgbmVpZ2hib3JzIHN0cnVjdHVyZXMuXG4gICAgdGhpcy51bmlvbk5laWdoYm9ycygpO1xuICAgIHRoaXMucmVjb3JkRXhpdHMoKTtcbiAgICB0aGlzLmJ1aWxkTmVpZ2hib3JzKCk7XG5cbiAgICAvLyBCdWlsZCB0aGUgcm91dGVzL2VkZ2VzLlxuICAgIHRoaXMuYWRkQWxsUm91dGVzKCk7XG5cbiAgICAvLyBCdWlsZCB0aGUgbG9jYXRpb24gbGlzdC5cbiAgICB0aGlzLmNvbnNvbGlkYXRlQ2hlY2tzKCk7XG4gICAgdGhpcy5idWlsZFJlcXVpcmVtZW50TWFwKCk7XG4gIH1cblxuICAvKiogQWRkcyBjaGVja3MgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFDaGVja3MoKSB7XG4gICAgY29uc3Qge1xuICAgICAgbG9jYXRpb25zOiB7XG4gICAgICAgIExlYWZfVG9vbFNob3AsXG4gICAgICAgIE1lemFtZVNocmluZSxcbiAgICAgICAgT2FrLFxuICAgICAgICBTaHlyb25fVG9vbFNob3AsXG4gICAgICB9LFxuICAgICAgZmxhZ3M6IHtcbiAgICAgICAgQWJsZVRvUmlkZURvbHBoaW4sXG4gICAgICAgIEJhbGxPZkZpcmUsIEJhbGxPZlRodW5kZXIsIEJhbGxPZldhdGVyLCBCYWxsT2ZXaW5kLFxuICAgICAgICBCYXJyaWVyLCBCbGl6emFyZEJyYWNlbGV0LCBCb3dPZk1vb24sIEJvd09mU3VuLFxuICAgICAgICBCcmVha1N0b25lLCBCcmVha0ljZSwgQnJlYWtJcm9uLFxuICAgICAgICBCcm9rZW5TdGF0dWUsIEJ1eUhlYWxpbmcsIEJ1eVdhcnAsXG4gICAgICAgIENsaW1iV2F0ZXJmYWxsLCBDbGltYlNsb3BlOCwgQ2xpbWJTbG9wZTksIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sXG4gICAgICAgIEZsaWdodCwgRmxhbWVCcmFjZWxldCwgRm9ybUJyaWRnZSxcbiAgICAgICAgR2FzTWFzaywgR2xvd2luZ0xhbXAsXG4gICAgICAgIEluanVyZWREb2xwaGluLFxuICAgICAgICBMZWFkaW5nQ2hpbGQsIExlYXRoZXJCb290cyxcbiAgICAgICAgTW9uZXksXG4gICAgICAgIE9wZW5lZENyeXB0LFxuICAgICAgICBSYWJiaXRCb290cywgUmVmcmVzaCwgUmVwYWlyZWRTdGF0dWUsIFJlc2N1ZWRDaGlsZCxcbiAgICAgICAgU2hlbGxGbHV0ZSwgU2hpZWxkUmluZywgU2hvb3RpbmdTdGF0dWUsIFN0b3JtQnJhY2VsZXQsXG4gICAgICAgIFN3b3JkLCBTd29yZE9mRmlyZSwgU3dvcmRPZlRodW5kZXIsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZldpbmQsXG4gICAgICAgIFRvcm5hZG9CcmFjZWxldCwgVHJhdmVsU3dhbXAsXG4gICAgICAgIFdpbGRXYXJwLFxuICAgICAgfSxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIE1lZGljYWxIZXJiLFxuICAgICAgICBXYXJwQm9vdHMsXG4gICAgICB9LFxuICAgIH0gPSB0aGlzLnJvbTtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMuZW50cmFuY2UoTWV6YW1lU2hyaW5lKTtcbiAgICBjb25zdCBlbnRlck9hayA9IHRoaXMuZW50cmFuY2UoT2FrKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGFuZChCb3dPZk1vb24sIEJvd09mU3VuKSwgW09wZW5lZENyeXB0LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQWJsZVRvUmlkZURvbHBoaW4sIFNoZWxsRmx1dGUpLFxuICAgICAgICAgICAgICAgICAgW0N1cnJlbnRseVJpZGluZ0RvbHBoaW4uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtlbnRlck9ha10sIGFuZChMZWFkaW5nQ2hpbGQpLCBbUmVzY3VlZENoaWxkLmlkXSk7XG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soW3N0YXJ0XSwgYW5kKEdsb3dpbmdMYW1wLCBCcm9rZW5TdGF0dWUpLFxuICAgICAgICAgICAgICAgICAgICAgIFJlcGFpcmVkU3RhdHVlLmlkLCB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuXG4gICAgLy8gQWRkIHNob3BzXG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IExlYWZfVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IFNoeXJvbl9Ub29sU2hvcC5pZCkgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhpdGJveCA9IFtUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpXTtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBzaG9wLmNvbnRlbnRzKSB7XG4gICAgICAgIGlmIChpdGVtID09PSBNZWRpY2FsSGVyYi5pZCkge1xuICAgICAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBNb25leS5yLCBbQnV5SGVhbGluZy5pZF0pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09IFdhcnBCb290cy5pZCkge1xuICAgICAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBNb25leS5yLCBbQnV5V2FycC5pZF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIHBzZXVkbyBmbGFnc1xuICAgIGxldCBicmVha1N0b25lOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXaW5kLnI7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZGaXJlLnI7XG4gICAgbGV0IGZvcm1CcmlkZ2U6IFJlcXVpcmVtZW50ID0gU3dvcmRPZldhdGVyLnI7XG4gICAgbGV0IGJyZWFrSXJvbjogUmVxdWlyZW1lbnQgPSBTd29yZE9mVGh1bmRlci5yO1xuICAgIGlmICghdGhpcy5mbGFnc2V0Lm9yYnNPcHRpb25hbCgpKSB7XG4gICAgICBjb25zdCB3aW5kMiA9IG9yKEJhbGxPZldpbmQsIFRvcm5hZG9CcmFjZWxldCk7XG4gICAgICBjb25zdCBmaXJlMiA9IG9yKEJhbGxPZkZpcmUsIEZsYW1lQnJhY2VsZXQpO1xuICAgICAgY29uc3Qgd2F0ZXIyID0gb3IoQmFsbE9mV2F0ZXIsIEJsaXp6YXJkQnJhY2VsZXQpO1xuICAgICAgY29uc3QgdGh1bmRlcjIgPSBvcihCYWxsT2ZUaHVuZGVyLCBTdG9ybUJyYWNlbGV0KTtcbiAgICAgIGJyZWFrU3RvbmUgPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrU3RvbmUsIHdpbmQyKTtcbiAgICAgIGJyZWFrSWNlID0gUmVxdWlyZW1lbnQubWVldChicmVha0ljZSwgZmlyZTIpO1xuICAgICAgZm9ybUJyaWRnZSA9IFJlcXVpcmVtZW50Lm1lZXQoZm9ybUJyaWRnZSwgd2F0ZXIyKTtcbiAgICAgIGJyZWFrSXJvbiA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJcm9uLCB0aHVuZGVyMik7XG4gICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkpIHtcbiAgICAgICAgY29uc3QgbGV2ZWwyID1cbiAgICAgICAgICAgIFJlcXVpcmVtZW50Lm9yKGJyZWFrU3RvbmUsIGJyZWFrSWNlLCBmb3JtQnJpZGdlLCBicmVha0lyb24pO1xuICAgICAgICBmdW5jdGlvbiBuZWVkKHN3b3JkOiBGbGFnKTogUmVxdWlyZW1lbnQge1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKFxuICAgICAgICAgICAgICAoYzogcmVhZG9ubHkgQ29uZGl0aW9uW10pID0+XG4gICAgICAgICAgICAgICAgICBjWzBdID09PSBzd29yZC5jID8gYyA6IFtzd29yZC5jLCAuLi5jXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtTdG9uZSA9IG5lZWQoU3dvcmRPZldpbmQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoU3dvcmRPZkZpcmUpO1xuICAgICAgICBmb3JtQnJpZGdlID0gbmVlZChTd29yZE9mV2F0ZXIpO1xuICAgICAgICBicmVha0lyb24gPSBuZWVkKFN3b3JkT2ZUaHVuZGVyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha1N0b25lLCBbQnJlYWtTdG9uZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtJY2UsIFtCcmVha0ljZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgZm9ybUJyaWRnZSwgW0Zvcm1CcmlkZ2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSXJvbiwgW0JyZWFrSXJvbi5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgIG9yKFN3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlciksXG4gICAgICAgICAgICAgICAgICBbU3dvcmQuaWQsIE1vbmV5LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBGbGlnaHQuciwgW0NsaW1iV2F0ZXJmYWxsLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU5LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBCYXJyaWVyLnIsIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgR2FzTWFzay5yLCBbVHJhdmVsU3dhbXAuaWRdKTtcblxuICAgIGlmICh0aGlzLmZsYWdzZXQubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgTGVhdGhlckJvb3RzLnIsIFtDbGltYlNsb3BlOC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZUdoZXR0b0ZsaWdodCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFxuICAgICAgICBbc3RhcnRdLCBhbmQoQ3VycmVudGx5UmlkaW5nRG9scGhpbiwgUmFiYml0Qm9vdHMpLFxuICAgICAgICBbQ2xpbWJXYXRlcmZhbGwuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5mb2dMYW1wTm90UmVxdWlyZWQoKSkge1xuICAgICAgLy8gbm90IGFjdHVhbGx5IHVzZWQuLi4/XG4gICAgICBjb25zdCByZXF1aXJlSGVhbGVkID0gdGhpcy5mbGFnc2V0LnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVIZWFsZWQgPyBJbmp1cmVkRG9scGhpbi5yIDogW1tdXSxcbiAgICAgICAgICAgICAgICAgICAgW0FibGVUb1JpZGVEb2xwaGluLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUJhcnJpZXIoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgU2hpZWxkUmluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSxcbiAgICAgICAgICAgICAgICAgICAgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0LmFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSkge1xuICAgICAgLy8gTk9URTogd2l0aCBubyBtb25leSwgd2UndmUgZ290IDE2IE1QLCB3aGljaCBpc24ndCBlbm91Z2hcbiAgICAgIC8vIHRvIGdldCBwYXN0IHNldmVuIHN0YXR1ZXMuXG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgRmxpZ2h0LmNdXSwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sIFtUcmF2ZWxTd2FtcC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgUmVxdWlyZW1lbnQuT1BFTiwgW1dpbGRXYXJwLmlkXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEFkZHMgcm91dGVzIHRoYXQgYXJlIG5vdCBkZXRlY3RhYmxlIGZyb20gZGF0YSB0YWJsZXMuICovXG4gIGFkZEV4dHJhUm91dGVzKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGZsYWdzOiB7QnV5V2FycCwgU3dvcmRPZlRodW5kZXIsIFRlbGVwb3J0LCBXaWxkV2FycH0sXG4gICAgICBsb2NhdGlvbnM6IHtNZXphbWVTaHJpbmV9LFxuICAgIH0gPSB0aGlzLnJvbTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCBNZXphbWUgU2hyaW5lLlxuICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2UoTWV6YW1lU2hyaW5lKSwgW10pKTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICBpZiAodGhpcy5mbGFnc2V0LnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgY29uc3Qgd2FycCA9IHRoaXMucm9tLnRvd25XYXJwLnRodW5kZXJTd29yZFdhcnA7XG4gICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTd29yZE9mVGh1bmRlci5jLCBCdXlXYXJwLmNdKSk7XG4gICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTd29yZE9mVGh1bmRlci5jLCBUZWxlcG9ydC5jXSkpO1xuICAgIH1cbiAgICAvLyBXaWxkIHdhcnBcbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIC8vIERvbid0IGNvdW50IGNoYW5uZWwgaW4gbG9naWMgYmVjYXVzZSB5b3UgY2FuJ3QgYWN0dWFsbHkgbW92ZS5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLmlkKSBjb250aW51ZTtcbiAgICAgICAgLy8gTk9URTogc29tZSBlbnRyYW5jZSB0aWxlcyBoYXMgZXh0cmEgcmVxdWlyZW1lbnRzIHRvIGVudGVyIChlLmcuXG4gICAgICAgIC8vIHN3YW1wKSAtIGZpbmQgdGhlbSBhbmQgY29uY2F0ZW50ZS5cbiAgICAgICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlKGxvY2F0aW9uKTtcbiAgICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGVudHJhbmNlKSA/PyBkaWUoJ2JhZCBlbnRyYW5jZScpO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRlcnJhaW4uZW50ZXIpIHtcbiAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShlbnRyYW5jZSwgW1dpbGRXYXJwLmMsIC4uLnJvdXRlXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIENoYW5nZSB0aGUga2V5IG9mIHRoZSBjaGVja3MgbWFwIHRvIG9ubHkgYmUgY2Fub25pY2FsIFRpbGVJZHMuICovXG4gIGNvbnNvbGlkYXRlQ2hlY2tzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrc10gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IHJvb3QgPSB0aGlzLnRpbGVzLmZpbmQodGlsZSk7XG4gICAgICBpZiAodGlsZSA9PT0gcm9vdCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICB0aGlzLmNoZWNrcy5nZXQocm9vdCkuYWRkKGNoZWNrKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tzLmRlbGV0ZSh0aWxlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQXQgdGhpcyBwb2ludCB3ZSBrbm93IHRoYXQgYWxsIG9mIHRoaXMuY2hlY2tzJyBrZXlzIGFyZSBjYW5vbmljYWwuICovXG4gIGJ1aWxkUmVxdWlyZW1lbnRNYXAoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IHJlcSA9IHRoaXMucmVxdWlyZW1lbnRNYXAuZ2V0KGNoZWNrIGFzIENvbmRpdGlvbik7XG4gICAgICAgICAgZm9yIChjb25zdCByMSBvZiByZXF1aXJlbWVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCByMiBvZiB0aGlzLnJvdXRlcy5nZXQodGlsZSkgfHwgW10pIHtcbiAgICAgICAgICAgICAgcmVxLmFkZExpc3QoWy4uLnIxLCAuLi5yMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8gLSBsb2cgdGhlIG1hcD9cbiAgICBpZiAoIURFQlVHKSByZXR1cm47XG4gICAgY29uc3QgbG9nID0gW107XG4gICAgZm9yIChjb25zdCBbY2hlY2ssIHJlcV0gb2YgdGhpcy5yZXF1aXJlbWVudE1hcCkge1xuICAgICAgY29uc3QgbmFtZSA9IChjOiBudW1iZXIpID0+IHRoaXMucm9tLmZsYWdzW2NdLm5hbWU7XG4gICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJlcSkge1xuICAgICAgICBsb2cucHVzaChgJHtuYW1lKGNoZWNrKX06ICR7Wy4uLnJvdXRlXS5tYXAobmFtZSkuam9pbignICYgJyl9XFxuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIGxvZy5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDApO1xuICAgIGNvbnNvbGUubG9nKGxvZy5qb2luKCcnKSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIExvY2F0aW9uTGlzdCBzdHJ1Y3R1cmUgYWZ0ZXIgdGhlIHJlcXVpcmVtZW50IG1hcCBpcyBidWlsdC4gKi9cbiAgZ2V0TG9jYXRpb25MaXN0KHdvcmxkTmFtZSA9ICdDcnlzdGFsaXMnKTogTG9jYXRpb25MaXN0IHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIganVzdCBpbXBsZW1lbnRpbmcgdGhpcyBkaXJlY3RseT9cbiAgICBjb25zdCBjaGVja05hbWUgPSBERUJVRyA/IChmOiBGbGFnKSA9PiBmLmRlYnVnIDogKGY6IEZsYWcpID0+IGYubmFtZTtcbiAgICByZXR1cm4ge1xuICAgICAgd29ybGROYW1lLFxuICAgICAgcmVxdWlyZW1lbnRzOiB0aGlzLnJlcXVpcmVtZW50TWFwLFxuICAgICAgaXRlbXM6IHRoaXMuaXRlbXMsXG4gICAgICBzbG90czogdGhpcy5zbG90cyxcbiAgICAgIGNoZWNrTmFtZTogKGNoZWNrOiBudW1iZXIpID0+IGNoZWNrTmFtZSh0aGlzLnJvbS5mbGFnc1tjaGVja10pLFxuICAgICAgcHJlZmlsbDogKHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gICAgICAgIGNvbnN0IHtDcnlzdGFsaXMsIE1lc2lhSW5Ub3dlciwgTGVhZkVsZGVyfSA9IHRoaXMucm9tLmZsYWdzO1xuICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKFtbTWVzaWFJblRvd2VyLmlkLCBDcnlzdGFsaXMuaWRdXSk7XG4gICAgICAgIGlmICh0aGlzLmZsYWdzZXQuZ3VhcmFudGVlU3dvcmQoKSkge1xuICAgICAgICAgIC8vIFBpY2sgYSBzd29yZCBhdCByYW5kb20uLi4/IGludmVyc2Ugd2VpZ2h0P1xuICAgICAgICAgIG1hcC5zZXQoTGVhZkVsZGVyLmlkLCAweDIwMCB8IHJhbmRvbS5uZXh0SW50KDQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgICAvLyBUT0RPIC0gaWYgYW55IGl0ZW1zIHNob3VsZG4ndCBiZSBzaHVmZmxlZCwgdGhlbiBkbyB0aGUgcHJlLWZpbGwuLi5cbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBBZGQgdGVycmFpbnMgYW5kIGNoZWNrcyBmb3IgYSBsb2NhdGlvbiwgZnJvbSB0aWxlcyBhbmQgc3Bhd25zLiAqL1xuICBwcm9jZXNzTG9jYXRpb24obG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgaWYgKCFsb2NhdGlvbi51c2VkKSByZXR1cm47XG4gICAgLy8gTG9vayBmb3Igd2FsbHMsIHdoaWNoIHdlIG5lZWQgdG8ga25vdyBhYm91dCBsYXRlci5cbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbik7XG4gIH1cblxuICAvKiogUnVuIHRoZSBmaXJzdCBwYXNzIG9mIHVuaW9ucyBub3cgdGhhdCBhbGwgdGVycmFpbnMgYXJlIGZpbmFsLiAqL1xuICB1bmlvbk5laWdoYm9ycygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeDEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB4MV0pO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHkxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeTFdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQnVpbGRzIHVwIHRoZSByb3V0ZXMgYW5kIHJvdXRlRWRnZXMgZGF0YSBzdHJ1Y3R1cmVzLiAqL1xuICBhZGRBbGxSb3V0ZXMoKSB7XG4gICAgLy8gQWRkIGFueSBleHRyYSByb3V0ZXMgZmlyc3QsIHN1Y2ggYXMgdGhlIHN0YXJ0aW5nIHRpbGUuXG4gICAgdGhpcy5hZGRFeHRyYVJvdXRlcygpO1xuICAgIC8vIEFkZCBhbGwgdGhlIGVkZ2VzIGZyb20gYWxsIG5laWdoYm9ycy5cbiAgICBmb3IgKGNvbnN0IFtwYWlyLCBkaXJzXSBvZiB0aGlzLm5laWdoYm9ycykge1xuICAgICAgY29uc3QgW2MwLCBjMV0gPSBUaWxlUGFpci5zcGxpdChwYWlyKTtcbiAgICAgIGNvbnN0IHQwID0gdGhpcy50ZXJyYWlucy5nZXQoYzApO1xuICAgICAgY29uc3QgdDEgPSB0aGlzLnRlcnJhaW5zLmdldChjMSk7XG4gICAgICBpZiAoIXQwIHx8ICF0MSkgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIHRlcnJhaW4gJHtoZXgodDAgPyBjMCA6IGMxKX1gKTtcbiAgICAgIGZvciAoY29uc3QgW2RpciwgZXhpdFJlcV0gb2YgdDAuZXhpdCkge1xuICAgICAgICBpZiAoIShkaXIgJiBkaXJzKSkgY29udGludWU7XG4gICAgICAgIGZvciAoY29uc3QgZXhpdENvbmRzIG9mIGV4aXRSZXEpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGVudGVyQ29uZHMgb2YgdDEuZW50ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGMxLCBbLi4uZXhpdENvbmRzLCAuLi5lbnRlckNvbmRzXSksIGMwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IGRlYnVnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlYnVnJyk7XG4gICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgZGVidWcuYXBwZW5kQ2hpbGQobmV3IEFyZWEodGhpcy5yb20sIHRoaXMuZ2V0V29ybGREYXRhKCkpLmVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFdvcmxkRGF0YSgpOiBXb3JsZERhdGEge1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3QgdGlsZXMgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFRpbGVEYXRhPigoKSA9PiAoe30pIGFzIFRpbGVEYXRhKTtcbiAgICBjb25zdCBsb2NhdGlvbnMgPVxuICAgICAgICBzZXEoMjU2LCAoKSA9PiAoe2FyZWFzOiBuZXcgU2V0KCksIHRpbGVzOiBuZXcgU2V0KCl9IGFzIExvY2F0aW9uRGF0YSkpO1xuICAgIGNvbnN0IGFyZWFzOiBBcmVhRGF0YVtdID0gW107XG5cbiAgICAvLyBkaWdlc3QgdGhlIGFyZWFzXG4gICAgZm9yIChjb25zdCBzZXQgb2YgdGhpcy50aWxlcy5zZXRzKCkpIHtcbiAgICAgIGNvbnN0IGNhbm9uaWNhbCA9IHRoaXMudGlsZXMuZmluZChpdGVycy5maXJzdChzZXQpKTtcbiAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChjYW5vbmljYWwpO1xuICAgICAgaWYgKCF0ZXJyYWluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJvdXRlcyA9XG4gICAgICAgICAgdGhpcy5yb3V0ZXMuaGFzKGNhbm9uaWNhbCkgP1xuICAgICAgICAgICAgICBSZXF1aXJlbWVudC5mcmVlemUodGhpcy5yb3V0ZXMuZ2V0KGNhbm9uaWNhbCkpIDogW107XG4gICAgICBpZiAoIXJvdXRlcy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgYXJlYTogQXJlYURhdGEgPSB7XG4gICAgICAgIGNoZWNrczogW10sXG4gICAgICAgIGlkOiBpbmRleCsrLFxuICAgICAgICBsb2NhdGlvbnM6IG5ldyBTZXQoKSxcbiAgICAgICAgcm91dGVzLFxuICAgICAgICB0ZXJyYWluLFxuICAgICAgICB0aWxlczogbmV3IFNldCgpLFxuICAgICAgfTtcbiAgICAgIGFyZWFzLnB1c2goYXJlYSk7XG4gICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGlsZSA+Pj4gMTY7XG4gICAgICAgIGFyZWEubG9jYXRpb25zLmFkZChsb2NhdGlvbik7XG4gICAgICAgIGFyZWEudGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLmFyZWFzLmFkZChhcmVhKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIHRpbGVzLmdldCh0aWxlKS5hcmVhID0gYXJlYTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBleGl0c1xuICAgIGZvciAoY29uc3QgW2EsIGJdIG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIGlmICh0aWxlcy5oYXMoYSkpIHtcbiAgICAgICAgdGlsZXMuZ2V0KGEpLmV4aXQgPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGNoZWNrc1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3QgYXJlYSA9IHRpbGVzLmdldCh0aWxlKS5hcmVhO1xuICAgICAgaWYgKCFhcmVhKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYEFiYW5kb25lZCBjaGVjayAke1suLi5jaGVja1NldF0ubWFwKFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgeCA9PiBbLi4ueC5jaGVja3NdLm1hcCh5ID0+IHkudG9TdHJpbmcoMTYpKSlcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgfSBhdCAke3RpbGUudG9TdHJpbmcoMTYpfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMucm9tLmZsYWdzW2NoZWNrXSB8fCBkaWUoKTtcbiAgICAgICAgICBhcmVhLmNoZWNrcy5wdXNoKFtmbGFnLCByZXF1aXJlbWVudF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7dGlsZXMsIGFyZWFzLCBsb2NhdGlvbnN9O1xuICB9XG5cbiAgLyoqIEFkZHMgYSByb3V0ZSwgb3B0aW9uYWxseSB3aXRoIGEgcHJlcmVxdWlzaXRlIChjYW5vbmljYWwpIHNvdXJjZSB0aWxlLiAqL1xuICBhZGRSb3V0ZShyb3V0ZTogUm91dGUsIHNvdXJjZT86IFRpbGVJZCkge1xuICAgIGlmIChzb3VyY2UgIT0gbnVsbCkge1xuICAgICAgLy8gQWRkIGFuIGVkZ2UgaW5zdGVhZCBvZiBhIHJvdXRlLCByZWN1cnNpbmcgb24gdGhlIHNvdXJjZSdzXG4gICAgICAvLyByZXF1aXJlbWVudHMuXG4gICAgICB0aGlzLnJvdXRlRWRnZXMuZ2V0KHNvdXJjZSkuYWRkKHJvdXRlKTtcbiAgICAgIGZvciAoY29uc3Qgc3JjUm91dGUgb2YgdGhpcy5yb3V0ZXMuZ2V0KHNvdXJjZSkpIHtcbiAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUocm91dGUudGFyZ2V0LCBbLi4uc3JjUm91dGUsIC4uLnJvdXRlLmRlcHNdKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoaXMgaXMgbm93IGFuIFwiaW5pdGlhbCByb3V0ZVwiIHdpdGggbm8gcHJlcmVxdWlzaXRlIHNvdXJjZS5cbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzdGFydCA9IHJvdXRlOyAvLyBUT0RPIGlubGluZVxuICAgIHF1ZXVlLmFkZChzdGFydCk7XG4gICAgY29uc3QgaXRlciA9IHF1ZXVlW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3Qge3ZhbHVlLCBkb25lfSA9IGl0ZXIubmV4dCgpO1xuICAgICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICAgIHNlZW4uYWRkKHZhbHVlKTtcbiAgICAgIHF1ZXVlLmRlbGV0ZSh2YWx1ZSk7XG4gICAgICBjb25zdCBmb2xsb3cgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHZhbHVlLnRhcmdldDtcbiAgICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLnJvdXRlcy5nZXQodGFyZ2V0KTtcbiAgICAgIGlmIChidWlsZGVyLmFkZFJvdXRlKHZhbHVlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IG5leHQgb2YgdGhpcy5yb3V0ZUVkZ2VzLmdldCh0YXJnZXQpKSB7XG4gICAgICAgICAgZm9sbG93LmFkZChuZXcgUm91dGUobmV4dC50YXJnZXQsIFsuLi52YWx1ZS5kZXBzLCAuLi5uZXh0LmRlcHNdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbmV4dCBvZiBmb2xsb3cpIHtcbiAgICAgICAgaWYgKHNlZW4uaGFzKG5leHQpKSBjb250aW51ZTtcbiAgICAgICAgcXVldWUuZGVsZXRlKG5leHQpOyAvLyByZS1hZGQgYXQgdGhlIGVuZCBvZiB0aGUgcXVldWVcbiAgICAgICAgcXVldWUuYWRkKG5leHQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgdXAgYHRoaXMuZXhpdFNldGAgdG8gaW5jbHVkZSBhbGwgdGhlIFwiZnJvbS10b1wiIHRpbGUgcGFpcnNcbiAgICogb2YgZXhpdHMgdGhhdCBfZG9uJ3RfIHNoYXJlIHRoZSBzYW1lIHRlcnJhaW4gRm9yIGFueSB0d28td2F5IGV4aXRcbiAgICogdGhhdCBzaGFyZXMgdGhlIHNhbWUgdGVycmFpbiwganVzdCBhZGQgaXQgZGlyZWN0bHkgdG8gdGhlXG4gICAqIHVuaW9uZmluZC5cbiAgICovXG4gIHJlY29yZEV4aXRzKCkge1xuICAgIC8vIEFkZCBleGl0IFRpbGVQYWlycyB0byBleGl0U2V0IGZyb20gYWxsIGxvY2F0aW9ucycgZXhpdHMuXG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9dIG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdFNldC5hZGQoXG4gICAgICAgICAgVGlsZVBhaXIub2YodGhpcy50aWxlcy5maW5kKGZyb20pLCB0aGlzLnRpbGVzLmZpbmQodG8pKSk7XG4gICAgfVxuICAgIC8vIExvb2sgZm9yIHR3by13YXkgZXhpdHMgd2l0aCB0aGUgc2FtZSB0ZXJyYWluOiByZW1vdmUgdGhlbSBmcm9tXG4gICAgLy8gZXhpdFNldCBhbmQgYWRkIHRoZW0gdG8gdGhlIHRpbGVzIHVuaW9uZmluZC5cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0U2V0KSB7XG4gICAgICBjb25zdCBbZnJvbSwgdG9dID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoZnJvbSkgIT09IHRoaXMudGVycmFpbnMuZ2V0KHRvKSkgY29udGludWU7XG4gICAgICBjb25zdCByZXZlcnNlID0gVGlsZVBhaXIub2YodG8sIGZyb20pO1xuICAgICAgaWYgKHRoaXMuZXhpdFNldC5oYXMocmV2ZXJzZSkpIHtcbiAgICAgICAgdGhpcy50aWxlcy51bmlvbihbZnJvbSwgdG9dKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmRlbGV0ZShleGl0KTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmRlbGV0ZShyZXZlcnNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBkaWZmZXJlbnQtdGVycmFpbiBuZWlnaGJvcnMgaW4gdGhlIHNhbWUgbG9jYXRpb24uICBBZGRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgdG8gYHRoaXMubmVpZ2hib3JzYCB3aXRoIGFsbCB0aGVcbiAgICogZGlyZWN0aW9ucyB0aGF0IGl0IG5laWdoYm9ycyBpbi4gIEFsc28gYWRkIGV4aXRzIGFzIG5laWdoYm9ycy5cbiAgICogVGhpcyBtdXN0IGhhcHBlbiAqYWZ0ZXIqIHRoZSBlbnRpcmUgdW5pb25maW5kIGlzIGNvbXBsZXRlIHNvXG4gICAqIHRoYXQgd2UgY2FuIGxldmVyYWdlIGl0LlxuICAgKi9cbiAgYnVpbGROZWlnaGJvcnMoKSB7XG4gICAgLy8gQWRqYWNlbnQgZGlmZmVyZW50LXRlcnJhaW4gdGlsZXMuXG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgaWYgKCF0ZXJyYWluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGNvbnN0IHR5MSA9IHRoaXMudGVycmFpbnMuZ2V0KHkxKTtcbiAgICAgIGlmICh0eTEgJiYgdHkxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeTEsIERpci5Ob3J0aCk7XG4gICAgICB9XG4gICAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgICBjb25zdCB0eDEgPSB0aGlzLnRlcnJhaW5zLmdldCh4MSk7XG4gICAgICBpZiAodHgxICYmIHR4MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHgxLCBEaXIuV2VzdCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEV4aXRzIChqdXN0IHVzZSBcIm5vcnRoXCIgZm9yIHRoZXNlKS5cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0U2V0KSB7XG4gICAgICBjb25zdCBbdDAsIHQxXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0MCkgfHwgIXRoaXMudGVycmFpbnMuaGFzKHQxKSkgY29udGludWU7XG4gICAgICBjb25zdCBwID0gVGlsZVBhaXIub2YodGhpcy50aWxlcy5maW5kKHQwKSwgdGhpcy50aWxlcy5maW5kKHQxKSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHApIHwgMSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModDA6IFRpbGVJZCwgdDE6IFRpbGVJZCwgZGlyOiBEaXIpIHtcbiAgICAvLyBOT1RFOiB0MCA8IHQxIGJlY2F1c2UgZGlyIGlzIGFsd2F5cyBXRVNUIG9yIE5PUlRILlxuICAgIGNvbnN0IGMwID0gdGhpcy50aWxlcy5maW5kKHQwKTtcbiAgICBjb25zdCBjMSA9IHRoaXMudGlsZXMuZmluZCh0MSk7XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQxKSkge1xuICAgICAgLy8gMSAtPiAwICh3ZXN0L25vcnRoKS4gIElmIDEgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3QgcDEwID0gVGlsZVBhaXIub2YoYzEsIGMwKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMTAsIHRoaXMubmVpZ2hib3JzLmdldChwMTApIHwgKDEgPDwgZGlyKSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MCkpIHtcbiAgICAgIC8vIDAgLT4gMSAoZWFzdC9zb3V0aCkuICBJZiAwIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IG9wcCA9IGRpciBeIDI7XG4gICAgICBjb25zdCBwMDEgPSBUaWxlUGFpci5vZihjMCwgYzEpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAwMSwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAwMSkgfCAoMSA8PCBvcHApKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBjb25zdCB3YWxscyA9IG5ldyBNYXA8U2NyZWVuSWQsIFdhbGxUeXBlPigpO1xuICAgIGNvbnN0IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG4gICAgY29uc3QgaW5Ub3dlciA9IChsb2NhdGlvbi5pZCAmIDB4ZjgpID09PSAweDU4O1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBXYWxscyBuZWVkIHRvIGNvbWUgZmlyc3Qgc28gd2UgY2FuIGF2b2lkIGFkZGluZyBzZXBhcmF0ZVxuICAgICAgLy8gcmVxdWlyZW1lbnRzIGZvciBldmVyeSBzaW5nbGUgd2FsbCAtIGp1c3QgdXNlIHRoZSB0eXBlLlxuICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIHdhbGxzLnNldChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIChzcGF3bi5pZCAmIDMpIGFzIFdhbGxUeXBlKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24uaWQgPT09IDB4M2YpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgICBzaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXRzW2xvY2F0aW9uLnRpbGVzZXRdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXTtcblxuICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKSA9PiB7XG4gICAgICBjb25zdCBzID0gbG9jYXRpb24uc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICByZXR1cm4gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3NdLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgfTtcblxuICAgIC8vIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuXG4gICAgY29uc3QgbWFrZVRlcnJhaW4gPSAoZWZmZWN0czogbnVtYmVyLCB0aWxlOiBUaWxlSWQsIGJhcnJpZXI6IGJvb2xlYW4pID0+IHtcbiAgICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgICAgZWZmZWN0cyAmPSBUZXJyYWluLkJJVFM7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4MWEpIGVmZmVjdHMgfD0gVGVycmFpbi5TV0FNUDtcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2MCB8fCBsb2NhdGlvbi5pZCA9PT0gMHg2OCkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4MTAzMCkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICBpZiAoYmFycmllcikgZWZmZWN0cyB8PSBUZXJyYWluLkJBUlJJRVI7XG4gICAgICBpZiAoIShlZmZlY3RzICYgVGVycmFpbi5ET0xQSElOKSAmJiBlZmZlY3RzICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgbGVuZ3RoIG9mIHNsb3BlOiBzaG9ydCBzbG9wZXMgYXJlIGNsaW1iYWJsZS5cbiAgICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgICAvLyA5IGlzIGRvYWJsZSB3aXRoIHJhYmJpdCBib290cyBvbmx5IChub3QgYXdhcmUgb2YgYW55IG9mIHRoZXNlLi4uKVxuICAgICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICAgIGxldCBoZWlnaHQgPSAwO1xuICAgICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAgIGJvdHRvbSA9IFRpbGVJZC5hZGQoYm90dG9tLCAxLCAwKTtcbiAgICAgICAgICBoZWlnaHQrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICAgIGVmZmVjdHMgJj0gflRlcnJhaW4uU0xPUEU7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgOSkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTg7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgMTApIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKGVmZmVjdHMpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB5ID0gMCwgaGVpZ2h0ID0gbG9jYXRpb24uaGVpZ2h0OyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxvY2F0aW9uLnNjcmVlbnNbeV07XG4gICAgICBjb25zdCByb3dJZCA9IGxvY2F0aW9uLmlkIDw8IDggfCB5IDw8IDQ7XG4gICAgICBmb3IgKGxldCB4ID0gMCwgd2lkdGggPSBsb2NhdGlvbi53aWR0aDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF1dO1xuICAgICAgICBjb25zdCBzY3JlZW5JZCA9IFNjcmVlbklkKHJvd0lkIHwgeCk7XG4gICAgICAgIGNvbnN0IGJhcnJpZXIgPSBzaG9vdGluZ1N0YXR1ZXMuaGFzKHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZ1l4ID0gc2NyZWVuSWQgJiAweGZmO1xuICAgICAgICBjb25zdCB3YWxsID0gd2FsbHMuZ2V0KHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZyA9XG4gICAgICAgICAgICBpblRvd2VyID8gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZCA6XG4gICAgICAgICAgICB3YWxsICE9IG51bGwgPyB0aGlzLndhbGxDYXBhYmlsaXR5KHdhbGwpIDpcbiAgICAgICAgICAgIGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gZmxhZ1l4KT8uZmxhZztcbiAgICAgICAgY29uc3QgbG9naWM6IExvZ2ljID0gdGhpcy5yb20uZmxhZ3NbZmxhZyFdPy5sb2dpYyA/PyB7fTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWQgPSBUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IHQpO1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBpZiAobG9naWMuYXNzdW1lVHJ1ZSAmJiB0aWxlIDwgMHgyMCkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZWZmZWN0cyA9XG4gICAgICAgICAgICAgIGxvY2F0aW9uLmlzU2hvcCgpID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV0gJiAweDI2O1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gbWFrZVRlcnJhaW4oZWZmZWN0cywgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAvL2lmICghdGVycmFpbikgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgaWYgKHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPT0gdGlsZSAmJlxuICAgICAgICAgICAgICBmbGFnICE9IG51bGwgJiYgIWxvZ2ljLmFzc3VtZVRydWUgJiYgIWxvZ2ljLmFzc3VtZUZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGUgPVxuICAgICAgICAgICAgICAgIG1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgICAvL2lmICghYWx0ZXJuYXRlKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgLy8gTk9URTogdGhlcmUncyBhbiBvZGRpdHkgZnJvbSBob2xsb3dpbmcgb3V0IHRoZSBiYWNrcyBvZiBpcm9uXG4gICAgICAgICAgICAgIC8vIHdhbGxzIHRoYXQgb25lIGNvcm5lciBvZiBzdG9uZSB3YWxscyBhcmUgYWxzbyBob2xsb3dlZCBvdXQsXG4gICAgICAgICAgICAgIC8vIGJ1dCBvbmx5IHByZS1mbGFnLiAgSXQgZG9lc24ndCBhY3R1YWxseSBodXJ0IGFueXRoaW5nLlxuICAgICAgICAgICAgICB0ZXJyYWluID1cbiAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3RvcnkuZmxhZyh0ZXJyYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljLnRyYWNrID8gZmxhZyA6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0ZXJyYWluKSB0aGlzLnRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHtkZXN0LCBlbnRyYW5jZX0gPSBleGl0O1xuICAgICAgY29uc3QgZnJvbSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgIC8vIFNlYW1sZXNzIGV4aXRzICgweDIwKSBpZ25vcmUgdGhlIGVudHJhbmNlIGluZGV4LCBhbmRcbiAgICAgIC8vIGluc3RlYWQgcHJlc2VydmUgdGhlIFRpbGVJZCwganVzdCBjaGFuZ2luZyB0aGUgbG9jYXRpb24uXG4gICAgICBsZXQgdG86IFRpbGVJZDtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICB0byA9IFRpbGVJZChmcm9tICYgMHhmZmZmIHwgKGRlc3QgPDwgMTYpKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5zZWFtbGVzcyhwcmV2aW91cykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0byA9IHRoaXMuZW50cmFuY2UodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLCBlbnRyYW5jZSAmIDB4MWYpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc1RyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NOcGMobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQm9zcyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0NoZXN0KCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2hlc3QobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3Rlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi50eXBlID09PSAzICYmIHNwYXduLmlkID09PSAweGUwKSB7XG4gICAgICAgIC8vIHdpbmRtaWxsIGJsYWRlc1xuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoXG4gICAgICAgICAgICBIaXRib3guc2NyZWVuKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpLFxuICAgICAgICAgICAgdGhpcy5yb20uZmxhZ3MuVXNlZFdpbmRtaWxsS2V5LnIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gRm9yIHRyaWdnZXJzLCB3aGljaCB0aWxlcyBkbyB3ZSBtYXJrP1xuICAgIC8vIFRoZSB0cmlnZ2VyIGhpdGJveCBpcyAyIHRpbGVzIHdpZGUgYW5kIDEgdGlsZSB0YWxsLCBidXQgaXQgZG9lcyBub3RcbiAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgIC8vICRjIHdpZGUgKHRob3VnaCBpdCdzICQxNCB0YWxsKSBzbyB0aGVyZSdzIHNvbWUgc2xpZ2h0IGRpc3Bhcml0eS5cbiAgICAvLyBJdCBzZWVtcyBsaWtlIHByb2JhYmx5IG1hcmtpbmcgaXQgYXMgKHgtMSwgeS0xKSAuLiAoeCwgeSkgbWFrZXMgdGhlXG4gICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAvLyB0aWxlIHNob3VsZCBnbyBmcm9tIHggLi4geCsxIGluc3RlYWQuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY2hlY2tpbmcgdHJpZ2dlcidzIGFjdGlvbjogJDE5IC0+IHB1c2gtZG93biBtZXNzYWdlXG5cbiAgICAvLyBUT0RPIC0gcHVsbCBvdXQgdGhpcy5yZWNvcmRUcmlnZ2VyVGVycmFpbigpIGFuZCB0aGlzLnJlY29yZFRyaWdnZXJDaGVjaygpXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXIoc3Bhd24uaWQpO1xuICAgIGlmICghdHJpZ2dlcikgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHRyaWdnZXIgJHtzcGF3bi5pZC50b1N0cmluZygxNil9YCk7XG5cbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgIGxldCBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBsZXQgaGl0Ym94ID0gSGl0Ym94LnRyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcblxuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiB0cmlnZ2VyLmZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgY2hlY2tzKTtcblxuICAgIHN3aXRjaCAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDE5OlxuICAgICAgICAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICAgIC8vIGJpZ2dlciBoaXRib3ggdG8gbm90IGZpbmQgdGhlIHBhdGggdGhyb3VnaFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTFdLCBbMCwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmFzc3VtZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5kaXNhYmxlVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBjb3B5IHRoZSB0ZWxlcG9ydCBoaXRib3ggaW50byB0aGUgb3RoZXIgc2lkZSBvZiBjb3JkZWxcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYXRMb2NhdGlvbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxdWlyZW1lbnRzKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWQ6XG4gICAgICAgIC8vIHN0YXJ0IG1hZG8gMSBib3NzIGZpZ2h0XG4gICAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLk1hZG8xLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciB0cmlnZ2VyIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcXVpcmVtZW50cywgdHJpZ2dlci5pZCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTg6IHsgLy8gc3RvbSBmaWdodFxuICAgICAgICAvLyBTcGVjaWFsIGNhc2U6IHdhcnAgYm9vdHMgZ2xpdGNoIHJlcXVpcmVkIGlmIGNoYXJnZSBzaG90cyBvbmx5LlxuICAgICAgICBjb25zdCByZXEgPVxuICAgICAgICAgIHRoaXMuZmxhZ3NldC5jaGFyZ2VTaG90c09ubHkoKSA/XG4gICAgICAgICAgUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIGFuZCh0aGlzLnJvbS5mbGFncy5XYXJwQm9vdHMpKSA6XG4gICAgICAgICAgcmVxdWlyZW1lbnRzO1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgdGhpcy5yb20uZmxhZ3MuU3RvbUZpZ2h0UmV3YXJkLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSAweDFlOlxuICAgICAgICAvLyBmb3JnZSBjcnlzdGFsaXNcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLk1lc2lhSW5Ub3dlci5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZjpcbiAgICAgICAgdGhpcy5oYW5kbGVCb2F0KHRpbGUsIGxvY2F0aW9uLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBNb3ZpbmcgZ3VhcmRcbiAgICAgICAgLy8gdHJlYXQgdGhpcyBhcyBhIHN0YXR1ZT8gIGJ1dCB0aGUgY29uZGl0aW9ucyBhcmUgbm90IHN1cGVyIHVzZWZ1bC4uLlxuICAgICAgICAvLyAgIC0gb25seSB0cmFja2VkIGNvbmRpdGlvbnMgbWF0dGVyPyA5ZSA9PSBwYXJhbHlzaXMuLi4gZXhjZXB0IG5vdC5cbiAgICAgICAgLy8gcGFyYWx5emFibGU/ICBjaGVjayBEYXRhVGFibGVfMzUwNDVcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuUG9ydG9hX1BhbGFjZUVudHJhbmNlKSB7XG4gICAgICAgICAgLy8gUG9ydG9hIHBhbGFjZSBmcm9udCBndWFyZCBub3JtYWxseSBibG9ja3Mgb24gTWVzaWEgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEJ1dCB0aGUgcXVlZW4gaXMgYWN0dWFsbHkgYWNjZXNzaWJsZSB3aXRob3V0IHNlZWluZyB0aGUgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEluc3RlYWQsIGJsb2NrIGFjY2VzcyB0byB0aGUgdGhyb25lIHJvb20gb24gYmVpbmcgYWJsZSB0byB0YWxrIHRvXG4gICAgICAgICAgLy8gdGhlIGZvcnR1bmUgdGVsbGVyLCBpbiBjYXNlIHRoZSBndWFyZCBtb3ZlcyBiZWZvcmUgd2UgY2FuIGdldCB0aGVcbiAgICAgICAgICAvLyBpdGVtLiAgQWxzbyBtb3ZlIHRoZSBoaXRib3ggdXAgc2luY2UgdGhlIHR3byBzaWRlIHJvb21zIF9hcmVfIHN0aWxsXG4gICAgICAgICAgLy8gYWNjZXNzaWJsZS5cbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWy0yLCAwXSk7XG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMucm9tLmZsYWdzLlRhbGtlZFRvRm9ydHVuZVRlbGxlci5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94LCBsb2NhdGlvbiwgYW50aVJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTnBjKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tzcGF3bi5pZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbnBjOiAke2hleChzcGF3bi5pZCl9YCk7XG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jYXRpb24uaWQpIHx8IFtdO1xuICAgIGNvbnN0IHJlcSA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7IC8vIHNob3VsZCBiZSBzaW5nbGVcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgLy8gTk9URTogUmFnZSBoYXMgbm8gd2Fsa2FibGUgbmVpZ2hib3JzLCBhbmQgd2UgbmVlZCB0aGUgc2FtZSBoaXRib3hcbiAgICAvLyBmb3IgYm90aCB0aGUgdGVycmFpbiBhbmQgdGhlIGNoZWNrLlxuICAgIC8vXG4gICAgLy8gTk9URSBBTFNPIC0gUmFnZSBwcm9iYWJseSBzaG93cyB1cCBhcyBhIGJvc3MsIG5vdCBhbiBOUEM/XG4gICAgbGV0IGhpdGJveDogSGl0Ym94ID1cbiAgICAgICAgW3RoaXMudGVycmFpbnMuaGFzKHRpbGUpID8gdGlsZSA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKSA/PyB0aWxlXTtcblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKGhpdGJveCwgcmVxLCBpdGVtLCB1c2UpO1xuICAgIH1cblxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU2FiZXJhRGlzZ3Vpc2VkQXNNZXNpYSkge1xuICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuU2FiZXJhMSwgcmVxKTtcbiAgICB9XG5cbiAgICBpZiAoKG5wYy5kYXRhWzJdICYgMHgwNCkgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgICAgbGV0IGFudGlSZXE7XG4gICAgICBhbnRpUmVxID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7XG4gICAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlJhZ2UpIHtcbiAgICAgICAgLy8gVE9ETyAtIG1vdmUgaGl0Ym94IGRvd24sIGNoYW5nZSByZXF1aXJlbWVudD9cbiAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFsyLCAtMV0sIFsyLCAwXSwgWzIsIDFdLCBbMiwgMl0pO1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC02XSwgWzAsIC0yXSwgWzAsIDJdLCBbMCwgNl0pO1xuICAgICAgICAvLyBUT0RPIC0gY2hlY2sgaWYgdGhpcyB3b3Jrcz8gIHRoZSB+Y2hlY2sgc3Bhd24gY29uZGl0aW9uIHNob3VsZFxuICAgICAgICAvLyBhbGxvdyBwYXNzaW5nIGlmIGdvdHRlbiB0aGUgY2hlY2ssIHdoaWNoIGlzIHRoZSBzYW1lIGFzIGdvdHRlblxuICAgICAgICAvLyB0aGUgY29ycmVjdCBzd29yZC5cbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSBhbnRpUmVxID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUG9ydG9hVGhyb25lUm9vbUJhY2tEb29yR3VhcmQpIHtcbiAgICAgICAgLy8gUG9ydG9hIGJhY2sgZG9vciBndWFyZCBzcGF3bnMgaWYgKDEpIHRoZSBtZXNpYSByZWNvcmRpbmcgaGFzIG5vdCB5ZXRcbiAgICAgICAgLy8gYmVlbiBwbGF5ZWQsIGFuZCAoMikgdGhlIHBsYXllciBkaWRuJ3Qgc25lYWsgcGFzdCB0aGUgZWFybGllciBndWFyZC5cbiAgICAgICAgLy8gV2UgY2FuIHNpbXVsYXRlIHRoaXMgYnkgaGFyZC1jb2RpbmcgYSByZXF1aXJlbWVudCBvbiBlaXRoZXIgdG8gZ2V0XG4gICAgICAgIC8vIHBhc3QgaGltLlxuICAgICAgICBhbnRpUmVxID0gb3IodGhpcy5yb20uZmxhZ3MuTWVzaWFSZWNvcmRpbmcsIHRoaXMucm9tLmZsYWdzLlBhcmFseXNpcyk7XG4gICAgICB9XG4gICAgICAvLyBpZiBzcGF3biBpcyBhbHdheXMgZmFsc2UgdGhlbiByZXEgbmVlZHMgdG8gYmUgb3Blbj9cbiAgICAgIGlmIChhbnRpUmVxKSB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxKSk7XG4gICAgfVxuXG4gICAgLy8gRm9ydHVuZSB0ZWxsZXIgY2FuIGJlIHRhbGtlZCB0byBhY3Jvc3MgdGhlIGRlc2suXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Gb3J0dW5lVGVsbGVyKSB7XG4gICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIDBdLCBbMiwgMF0pO1xuICAgIH1cblxuICAgIC8vIHJlcSBpcyBub3cgbXV0YWJsZVxuICAgIGlmIChSZXF1aXJlbWVudC5pc0Nsb3NlZChyZXEpKSByZXR1cm47IC8vIG5vdGhpbmcgdG8gZG8gaWYgaXQgbmV2ZXIgc3Bhd25zLlxuICAgIGNvbnN0IFtbLi4uY29uZHNdXSA9IHJlcTtcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgZ2xvYmFsIGRpYWxvZ3MgLSBkbyBub3RoaW5nIGlmIHdlIGNhbid0IHBhc3MgdGhlbS5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcofmQuY29uZGl0aW9uKTtcbiAgICAgIGlmICghZj8ubG9naWMudHJhY2spIGNvbnRpbnVlO1xuICAgICAgY29uZHMucHVzaChmLmlkIGFzIENvbmRpdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBhcHByb3ByaWF0ZSBsb2NhbCBkaWFsb2dzXG4gICAgY29uc3QgbG9jYWxzID1cbiAgICAgICAgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jYXRpb24uaWQpID8/IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSA/PyBbXTtcbiAgICBmb3IgKGNvbnN0IGQgb2YgbG9jYWxzKSB7XG4gICAgICAvLyBDb21wdXRlIHRoZSBjb25kaXRpb24gJ3InIGZvciB0aGlzIG1lc3NhZ2UuXG4gICAgICBjb25zdCByID0gWy4uLmNvbmRzXTtcbiAgICAgIGNvbnN0IGYwID0gdGhpcy5mbGFnKGQuY29uZGl0aW9uKTtcbiAgICAgIGlmIChmMD8ubG9naWMudHJhY2spIHtcbiAgICAgICAgci5wdXNoKGYwLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgICB0aGlzLnByb2Nlc3NEaWFsb2coaGl0Ym94LCBucGMsIHIsIGQpO1xuICAgICAgLy8gQWRkIGFueSBuZXcgY29uZGl0aW9ucyB0byAnY29uZHMnIHRvIGdldCBiZXlvbmQgdGhpcyBtZXNzYWdlLlxuICAgICAgY29uc3QgZjEgPSB0aGlzLmZsYWcofmQuY29uZGl0aW9uKTtcbiAgICAgIGlmIChmMT8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY29uZHMucHVzaChmMS5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NEaWFsb2coaGl0Ym94OiBIaXRib3gsIG5wYzogTnBjLFxuICAgICAgICAgICAgICAgIHJlcTogcmVhZG9ubHkgQ29uZGl0aW9uW10sIGRpYWxvZzogTG9jYWxEaWFsb2cpIHtcbiAgICB0aGlzLmFkZENoZWNrRnJvbUZsYWdzKGhpdGJveCwgW3JlcV0sIGRpYWxvZy5mbGFncyk7XG5cbiAgICBjb25zdCBpbmZvID0ge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9O1xuICAgIHN3aXRjaCAoZGlhbG9nLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MDg6IC8vIG9wZW4gc3dhbiBnYXRlXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIFtyZXFdKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwYzogLy8gZHdhcmYgY2hpbGQgc3RhcnRzIGZvbGxvd2luZ1xuICAgICAgLy8gICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBkOiAvLyBucGMgd2Fsa3MgYXdheVxuICAgICAgLy8gICBicmVhaztcblxuICAgICAgY2FzZSAweDE0OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5TbGltZWRLZW5zdS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTA6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQXNpbmFJbkJhY2tSb29tLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVsxXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDM6XG4gICAgICBjYXNlIDB4MGE6IC8vIG5vcm1hbGx5IHRoaXMgaGFyZC1jb2RlcyBnbG93aW5nIGxhbXAsIGJ1dCB3ZSBleHRlbmRlZCBpdFxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzBdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwOTpcbiAgICAgICAgLy8gSWYgemVidSBzdHVkZW50IGhhcyBhbiBpdGVtLi4uPyAgVE9ETyAtIHN0b3JlIGZmIGlmIHVudXNlZFxuICAgICAgICBjb25zdCBpdGVtID0gbnBjLmRhdGFbMV07XG4gICAgICAgIGlmIChpdGVtICE9PSAweGZmKSB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IGl0ZW0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDE5OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFrYWhhbmFGbHV0ZU9mTGltZVRyYWRlaW4uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFhOlxuICAgICAgICAvLyBUT0RPIC0gY2FuIHdlIHJlYWNoIHRoaXMgc3BvdD8gIG1heSBuZWVkIHRvIG1vdmUgZG93bj9cbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuUmFnZS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIFJhZ2UgdGhyb3dpbmcgcGxheWVyIG91dC4uLlxuICAgICAgICAvLyBUaGlzIHNob3VsZCBhY3R1YWxseSBhbHJlYWR5IGJlIGhhbmRsZWQgYnkgdGhlIHN0YXR1ZSBjb2RlIGFib3ZlP1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gYWRkIGV4dHJhIGRpYWxvZ3MgZm9yIGl0ZW11c2UgdHJhZGVzLCBleHRyYSB0cmlnZ2Vyc1xuICAgIC8vICAgICAgLSBpZiBpdGVtIHRyYWRlZCBidXQgbm8gcmV3YXJkLCB0aGVuIHJlLWdpdmUgcmV3YXJkLi4uXG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KH5sb2NhdGlvbi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW3RoaXMuZW50cmFuY2UobG9jYXRpb24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVNb3ZpbmdHdWFyZChoaXRib3g6IEhpdGJveCwgbG9jYXRpb246IExvY2F0aW9uLCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gVGhpcyBpcyB0aGUgMWIgdHJpZ2dlciBhY3Rpb24gZm9sbG93LXVwLiAgSXQgbG9va3MgZm9yIGFuIE5QQyBpbiAwZCBvciAwZVxuICAgIC8vIGFuZCBtb3ZlcyB0aGVtIG92ZXIgYSBwaXhlbC4gIEZvciB0aGUgbG9naWMsIGl0J3MgYWx3YXlzIGluIGEgcG9zaXRpb25cbiAgICAvLyB3aGVyZSBqdXN0IG1ha2luZyB0aGUgdHJpZ2dlciBzcXVhcmUgYmUgYSBuby1leGl0IHNxdWFyZSBpcyBzdWZmaWNpZW50LFxuICAgIC8vIGJ1dCB3ZSBuZWVkIHRvIGdldCB0aGUgY29uZGl0aW9ucyByaWdodC4gIFdlIHBhc3MgaW4gdGhlIHJlcXVpcmVtZW50cyB0b1xuICAgIC8vIE5PVCB0cmlnZ2VyIHRoZSB0cmlnZ2VyLCBhbmQgdGhlbiB3ZSBqb2luIGluIHBhcmFseXNpcyBhbmQvb3Igc3RhdHVlXG4gICAgLy8gZ2xpdGNoIGlmIGFwcHJvcHJpYXRlLiAgVGhlcmUgY291bGQgdGhlb3JldGljYWxseSBiZSBjYXNlcyB3aGVyZSB0aGVcbiAgICAvLyBndWFyZCBpcyBwYXJhbHl6YWJsZSBidXQgdGhlIGdlb21ldHJ5IHByZXZlbnRzIHRoZSBwbGF5ZXIgZnJvbSBhY3R1YWxseVxuICAgIC8vIGhpdHRpbmcgdGhlbSBiZWZvcmUgdGhleSBtb3ZlLCBidXQgaXQgZG9lc24ndCBoYXBwZW4gaW4gcHJhY3RpY2UuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkgcmV0dXJuO1xuICAgIGNvbnN0IGV4dHJhOiBDb25kaXRpb25bXVtdID0gW107XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMuc2xpY2UoMCwgMikpIHtcbiAgICAgIGlmIChzcGF3bi5pc05wYygpICYmIHRoaXMucm9tLm5wY3Nbc3Bhd24uaWRdLmlzUGFyYWx5emFibGUoKSkge1xuICAgICAgICBleHRyYS5wdXNoKFt0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMuaWQgYXMgQ29uZGl0aW9uXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShbLi4ucmVxLCAuLi5leHRyYV0ubWFwKHNwcmVhZCkpKTtcblxuXG4gICAgLy8gVE9ETyAtIFBvcnRvYSBndWFyZHMgYXJlIGJyb2tlbiA6LShcbiAgICAvLyBUaGUgYmFjayBndWFyZCBuZWVkcyB0byBibG9jayBvbiB0aGUgZnJvbnQgZ3VhcmQncyBjb25kaXRpb25zLFxuICAgIC8vIHdoaWxlIHRoZSBmcm9udCBndWFyZCBzaG91bGQgYmxvY2sgb24gZm9ydHVuZSB0ZWxsZXI/XG5cbiAgfVxuXG4gIGhhbmRsZUJvYXQodGlsZTogVGlsZUlkLCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBib2FyZCBib2F0IC0gdGhpcyBhbW91bnRzIHRvIGFkZGluZyBhIHJvdXRlIGVkZ2UgZnJvbSB0aGUgdGlsZVxuICAgIC8vIHRvIHRoZSBsZWZ0LCB0aHJvdWdoIGFuIGV4aXQsIGFuZCB0aGVuIGNvbnRpbnVpbmcgdW50aWwgZmluZGluZyBsYW5kLlxuICAgIGNvbnN0IHQwID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpO1xuICAgIGlmICh0MCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHdhbGthYmxlIG5laWdoYm9yLmApO1xuICAgIGNvbnN0IHl0ID0gKHRpbGUgPj4gOCkgJiAweGYwIHwgKHRpbGUgPj4gNCkgJiAweGY7XG4gICAgY29uc3QgeHQgPSAodGlsZSA+PiA0KSAmIDB4ZjAgfCB0aWxlICYgMHhmO1xuICAgIGxldCBib2F0RXhpdDtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0Lnl0ID09PSB5dCAmJiBleGl0Lnh0IDwgeHQpIGJvYXRFeGl0ID0gZXhpdDtcbiAgICB9XG4gICAgaWYgKCFib2F0RXhpdCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBib2F0IGV4aXRgKTtcbiAgICAvLyBUT0RPIC0gbG9vayB1cCB0aGUgZW50cmFuY2UuXG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tib2F0RXhpdC5kZXN0XTtcbiAgICBpZiAoIWRlc3QpIHRocm93IG5ldyBFcnJvcihgQmFkIGRlc3RpbmF0aW9uYCk7XG4gICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tib2F0RXhpdC5lbnRyYW5jZV07XG4gICAgY29uc3QgZW50cmFuY2VUaWxlID0gVGlsZUlkLmZyb20oZGVzdCwgZW50cmFuY2UpO1xuICAgIGxldCB0ID0gZW50cmFuY2VUaWxlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB0ID0gVGlsZUlkLmFkZCh0LCAwLCAtMSk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KTtcbiAgICAgIGlmICh0MSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJvYXQ6IFRlcnJhaW4gPSB7XG4gICAgICAgICAgZW50ZXI6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudHMpLFxuICAgICAgICAgIGV4aXQ6IFtbMHhmLCBSZXF1aXJlbWVudC5PUEVOXV0sXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGJvYXQgdHJpZ2dlci5cbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKFt0MF0sIGJvYXQpO1xuICAgICAgICB0aGlzLmV4aXRzLnNldCh0MCwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKHQwLCB0MSkpO1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBlbnRyYW5jZSB3ZSBwYXNzZWRcbiAgICAgICAgLy8gKHRoaXMgaXMgcHJpbWFyaWx5IG5lY2Vzc2FyeSBmb3Igd2lsZCB3YXJwIHRvIHdvcmsgaW4gbG9naWMpLlxuICAgICAgICB0aGlzLmV4aXRzLnNldChlbnRyYW5jZVRpbGUsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZihlbnRyYW5jZVRpbGUsIHQxKSk7XG4gICAgICAgIHRoaXMudGVycmFpbnMuc2V0KGVudHJhbmNlVGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKDApISk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94OiBIaXRib3gsIHJlcTogUmVxdWlyZW1lbnQsIGdyYW50SWQ6IG51bWJlcikge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1HcmFudChncmFudElkKTtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBpdGVtO1xuICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBpdGVtIGdyYW50IGZvciAke2dyYW50SWQudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICAvLyBpcyB0aGUgMTAwIGZsYWcgc3VmZmljaWVudCBoZXJlPyAgcHJvYmFibHk/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSBncmFudElkID49IDB4ODA7IC8vIGdyYW50ZWQgZnJvbSBhIHRyaWdnZXJcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgc2xvdCxcbiAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZSwgcHJldmVudExvc3N9KTtcbiAgfVxuXG4gIGFkZFRlcnJhaW4oaGl0Ym94OiBIaXRib3gsIHRlcnJhaW46IFRlcnJhaW4pIHtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy50ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICBpZiAodCA9PSBudWxsKSBjb250aW51ZTsgLy8gdW5yZWFjaGFibGUgdGlsZXMgZG9uJ3QgbmVlZCBleHRyYSByZXFzXG4gICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5Lm1lZXQodCwgdGVycmFpbikpO1xuICAgIH1cbiAgfVxuXG4gIGFkZENoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGNoZWNrczogbnVtYmVyW10pIHtcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxdWlyZW1lbnQpKSByZXR1cm47IC8vIGRvIG5vdGhpbmcgaWYgdW5yZWFjaGFibGVcbiAgICBjb25zdCBjaGVjayA9IHtyZXF1aXJlbWVudDogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50KSwgY2hlY2tzfTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHRpbGUpKSBjb250aW51ZTtcbiAgICAgIHRoaXMuY2hlY2tzLmdldCh0aWxlKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1DaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LFxuICAgICAgICAgICAgICAgY2hlY2s6IG51bWJlciwgc2xvdDogU2xvdEluZm8pIHtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIFtjaGVja10pO1xuICAgIHRoaXMuc2xvdHMuc2V0KGNoZWNrLCBzbG90KTtcbiAgICAvLyBhbHNvIGFkZCBjb3JyZXNwb25kaW5nIEl0ZW1JbmZvIHRvIGtlZXAgdGhlbSBpbiBwYXJpdHkuXG4gICAgY29uc3QgaXRlbWdldCA9IHRoaXMucm9tLml0ZW1HZXRzW2NoZWNrICYgMHhmZl07XG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgICBjb25zdCB1bmlxdWUgPSBpdGVtPy51bmlxdWU7XG4gICAgY29uc3QgbG9zYWJsZSA9IGl0ZW1nZXQuaXNMb3NhYmxlKCk7XG4gICAgLy8gVE9ETyAtIHJlZmFjdG9yIHRvIGp1c3QgXCJjYW4ndCBiZSBib3VnaHRcIj9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IHVuaXF1ZSB8fCBpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5PcGVsU3RhdHVlO1xuICAgIGxldCB3ZWlnaHQgPSAxO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2luZCkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZkZpcmUpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXYXRlcikgd2VpZ2h0ID0gMTA7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZUaHVuZGVyKSB3ZWlnaHQgPSAxNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuRmxpZ2h0KSB3ZWlnaHQgPSAxNTtcbiAgICB0aGlzLml0ZW1zLnNldCgweDIwMCB8IGl0ZW1nZXQuaWQsIHt1bmlxdWUsIGxvc2FibGUsIHByZXZlbnRMb3NzLCB3ZWlnaHR9KTtcbiAgfVxuXG4gIGFkZENoZWNrRnJvbUZsYWdzKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGZsYWdzOiBudW1iZXJbXSkge1xuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgY2hlY2tzKTtcbiAgfVxuXG4gIHdhbGthYmxlTmVpZ2hib3IodDogVGlsZUlkKTogVGlsZUlkfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0KSkgcmV0dXJuIHQ7XG4gICAgZm9yIChsZXQgZCBvZiBbLTEsIDFdKSB7XG4gICAgICBjb25zdCB0MSA9IFRpbGVJZC5hZGQodCwgZCwgMCk7XG4gICAgICBjb25zdCB0MiA9IFRpbGVJZC5hZGQodCwgMCwgZCk7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQxKSkgcmV0dXJuIHQxO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MikpIHJldHVybiB0MjtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlzV2Fsa2FibGUodDogVGlsZUlkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEodGhpcy5nZXRFZmZlY3RzKHQpICYgVGVycmFpbi5CSVRTKTtcbiAgfVxuXG4gIGVuc3VyZVBhc3NhYmxlKHQ6IFRpbGVJZCk6IFRpbGVJZCB7XG4gICAgcmV0dXJuIHRoaXMuaXNXYWxrYWJsZSh0KSA/IHQgOiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdDtcbiAgfVxuXG4gIGdldEVmZmVjdHModDogVGlsZUlkKTogbnVtYmVyIHtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1t0ID4+PiAxNl07XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCBlZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXS5lZmZlY3RzO1xuICAgIGNvbnN0IHNjciA9IGxvY2F0aW9uLnNjcmVlbnNbKHQgJiAweGYwMDApID4+PiAxMl1bKHQgJiAweGYwMCkgPj4+IDhdO1xuICAgIHJldHVybiBlZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl1dO1xuICB9XG5cbiAgcHJvY2Vzc0Jvc3MobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgIC8vIGFuZCB3aWxsIGFsc28gYWRkIHRoZWlyIGRyb3AuXG4gICAgaWYgKHNwYXduLmlkID09PSAweGM5IHx8IHNwYXduLmlkID09PSAweGNhKSByZXR1cm47IC8vIHN0YXR1ZXNcbiAgICBjb25zdCBpc1JhZ2UgPSBzcGF3bi5pZCA9PT0gMHhjMztcbiAgICBjb25zdCBib3NzID1cbiAgICAgICAgaXNSYWdlID8gdGhpcy5yb20uYm9zc2VzLlJhZ2UgOlxuICAgICAgICB0aGlzLnJvbS5ib3NzZXMuZnJvbUxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBpZiAoIWJvc3MgfHwgIWJvc3MuZmxhZykgdGhyb3cgbmV3IEVycm9yKGBCYWQgYm9zcyBhdCAke2xvY2F0aW9uLm5hbWV9YCk7XG4gICAgY29uc3Qgc2NyZWVuID0gdGlsZSAmIH4weGZmO1xuICAgIC8vIE5PVEU6IFJhZ2UgY2FuIGJlIGV4aXRlZCBzb3V0aC4uLiBidXQgdGhpcyBvbmx5IG1hdHRlcnMgaWYgdGhlcmUnc1xuICAgIC8vIGFueXRoaW5nIG90aGVyIHRoYW4gTWVzaWEncyBzaHJpbmUgYmVoaW5kIGhpbSwgd2hpY2ggbWFrZXMgYSBsb3Qgb2ZcbiAgICAvLyBsb2dpYyBtb3JlIGRpZmZpY3VsdCwgc28gbGlrZWx5IHRoaXMgZW50cmFuY2Ugd2lsbCBzdGF5IHB1dCBmb3JldmVyLlxuICAgIGNvbnN0IGJvc3NUZXJyYWluID0gdGhpcy50ZXJyYWluRmFjdG9yeS5ib3NzKGJvc3MuZmxhZy5pZCk7XG4gICAgY29uc3QgaGl0Ym94ID0gc2VxKDB4ZjAsICh0OiBudW1iZXIpID0+IChzY3JlZW4gfCB0KSBhcyBUaWxlSWQpO1xuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIGJvc3NUZXJyYWluKTtcbiAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIGJvc3MpO1xuICB9XG5cbiAgYWRkQm9zc0NoZWNrKGhpdGJveDogSGl0Ym94LCBib3NzOiBCb3NzLFxuICAgICAgICAgICAgICAgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCA9IFJlcXVpcmVtZW50Lk9QRU4pIHtcbiAgICBpZiAoYm9zcy5mbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYSBmbGFnOiAke2Jvc3N9YCk7XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyhib3NzKSk7XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5EcmF5Z29uMikge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcSwgW2Jvc3MuZmxhZy5pZF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICBoaXRib3gsIHJlcSwgYm9zcy5mbGFnLmlkLCB7bG9zc3k6IGZhbHNlLCB1bmlxdWU6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzQ2hlc3QobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBBZGQgYSBjaGVjayBmb3IgdGhlIDF4eCBmbGFnLiAgTWFrZSBzdXJlIGl0J3Mgbm90IGEgbWltaWMuXG4gICAgaWYgKHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXSA+PSAweDcwKSByZXR1cm47XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgc3Bhd24uaWQ7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW3NwYXduLmlkXTtcbiAgICBjb25zdCB1bmlxdWUgPSB0aGlzLmZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSA/ICEhaXRlbT8udW5pcXVlIDogdHJ1ZTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sIFJlcXVpcmVtZW50Lk9QRU4sXG4gICAgICAgICAgICAgICAgICAgICAgc2xvdCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlfSk7XG4gIH1cblxuICBwcm9jZXNzTW9uc3RlcihfbG9jYXRpb246IExvY2F0aW9uLCBfc3Bhd246IFNwYXduKSB7XG4gICAgICAgIC8vIFRPRE8gLSBjb21wdXRlIG1vbmV5LWRyb3BwaW5nIG1vbnN0ZXIgdnVsbmVyYWJpbGl0aWVzIGFuZCBhZGQgYSB0cmlnZ2VyXG4gICAgICAgIC8vIGZvciB0aGUgTU9ORVkgY2FwYWJpbGl0eSBkZXBlbmRlbnQgb24gYW55IG9mIHRoZSBzd29yZHMuXG4gICAgLy8gY29uc3QgbW9uc3RlciA9IHJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgLy8gaWYgKG1vbnN0ZXIuZ29sZERyb3ApIG1vbnN0ZXJzLnNldChUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCBtb25zdGVyLmVsZW1lbnRzKTtcbiAgfVxuXG4gIHByb2Nlc3NJdGVtVXNlKGhpdGJveDogSGl0Ym94LCByZXExOiBSZXF1aXJlbWVudCwgaXRlbTogSXRlbSwgdXNlOiBJdGVtVXNlKSB7XG4gICAgLy8gdGhpcyBzaG91bGQgaGFuZGxlIG1vc3QgdHJhZGUtaW5zIGF1dG9tYXRpY2FsbHlcbiAgICBoaXRib3ggPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0KSk7XG4gICAgY29uc3QgcmVxMiA9IFtbKDB4MjAwIHwgaXRlbS5pZCkgYXMgQ29uZGl0aW9uXV07IC8vIHJlcXVpcmVzIHRoZSBpdGVtLlxuICAgIC8vIGNoZWNrIGZvciBraXJpc2EgcGxhbnQsIGFkZCBjaGFuZ2UgYXMgYSByZXF1aXJlbWVudC5cbiAgICBpZiAoaXRlbS5pZCA9PT0gdGhpcy5yb20ucHJnWzB4M2Q0YjVdICsgMHgxYykge1xuICAgICAgcmVxMlswXS5wdXNoKHRoaXMucm9tLmZsYWdzLkNoYW5nZS5jKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk1lZGljYWxIZXJiKSB7IC8vIGRvbHBoaW5cbiAgICAgIHJlcTJbMF1bMF0gPSB0aGlzLnJvbS5mbGFncy5CdXlIZWFsaW5nLmM7IC8vIG5vdGU6IG5vIG90aGVyIGhlYWxpbmcgaXRlbXNcbiAgICB9XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXExLCByZXEyKTtcbiAgICAvLyBzZXQgYW55IGZsYWdzXG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIHJlcSwgdXNlLmZsYWdzKTtcbiAgICAvLyBoYW5kbGUgYW55IGV4dHJhIGFjdGlvbnNcbiAgICBzd2l0Y2ggKHVzZS5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDEwOlxuICAgICAgICAvLyB1c2Uga2V5XG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIHJlcSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6IGNhc2UgMHgxYzpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIGl0ZW0gSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxLCBpdGVtLmlkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDI6XG4gICAgICAgIC8vIGRvbHBoaW4gZGVmZXJzIHRvIGRpYWxvZyBhY3Rpb24gMTEgKGFuZCAwZCB0byBzd2ltIGF3YXkpXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAweDEwMCB8IHRoaXMucm9tLm5wY3NbdXNlLndhbnQgJiAweGZmXS5kYXRhWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzS2V5VXNlKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gc2V0IHRoZSBjdXJyZW50IHNjcmVlbidzIGZsYWcgaWYgdGhlIGNvbmRpdGlvbnMgYXJlIG1ldC4uLlxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIG9ubHkgYSBzaW5nbGUgc2NyZWVuLlxuICAgIGNvbnN0IFtzY3JlZW4sIC4uLnJlc3RdID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiBTY3JlZW5JZC5mcm9tKHQpKSk7XG4gICAgaWYgKHNjcmVlbiA9PSBudWxsIHx8IHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG9uZSBzY3JlZW5gKTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tzY3JlZW4gPj4+IDhdO1xuICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IChzY3JlZW4gJiAweGZmKSk7XG4gICAgaWYgKGZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBmbGFnIG9uIHNjcmVlbmApO1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtmbGFnLmZsYWddKTtcbiAgfVxuXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuUmFnZSkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBSYWdlLiAgRmlndXJlIG91dCB3aGF0IGhlIHdhbnRzIGZyb20gdGhlIGRpYWxvZy5cbiAgICAgIGNvbnN0IHVua25vd25Td29yZCA9IHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQucmFuZG9taXplVHJhZGVzKCk7XG4gICAgICBpZiAodW5rbm93blN3b3JkKSByZXR1cm4gdGhpcy5yb20uZmxhZ3MuU3dvcmQucjsgLy8gYW55IHN3b3JkIG1pZ2h0IGRvLlxuICAgICAgcmV0dXJuIFtbdGhpcy5yb20ubnBjcy5SYWdlLmRpYWxvZygpWzBdLmNvbmRpdGlvbiBhcyBDb25kaXRpb25dXTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCByID0gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgfHxcbiAgICAgICAgIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHIuYWRkQWxsKHRoaXMucm9tLmZsYWdzLlN3b3JkLnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgci5hZGRBbGwodGhpcy5zd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENhbid0IGFjdHVhbGx5IGtpbGwgdGhlIGJvc3MgaWYgaXQgZG9lc24ndCBzcGF3bi5cbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW10gPSBbXTtcbiAgICBpZiAoYm9zcy5ucGMgIT0gbnVsbCAmJiBib3NzLmxvY2F0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uID0gYm9zcy5ucGMuc3Bhd25zKHRoaXMucm9tLmxvY2F0aW9uc1tib3NzLmxvY2F0aW9uXSk7XG4gICAgICBleHRyYS5wdXNoKC4uLnRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9uKVswXSk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuSW5zZWN0KSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkluc2VjdEZsdXRlLmMsIHRoaXMucm9tLmZsYWdzLkdhc01hc2suYyk7XG4gICAgfSBlbHNlIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuQm93T2ZUcnV0aC5jKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuUmVmcmVzaC5jKTtcbiAgICB9XG4gICAgci5yZXN0cmljdChbZXh0cmFdKTtcbiAgICByZXR1cm4gUmVxdWlyZW1lbnQuZnJlZXplKHIpO1xuICB9XG5cbiAgc3dvcmRSZXF1aXJlbWVudChlbGVtZW50OiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gICAgY29uc3Qgc3dvcmQgPSBbXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZkZpcmUsXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAxKSByZXR1cm4gc3dvcmQucjtcbiAgICBjb25zdCBwb3dlcnMgPSBbXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuVG9ybmFkb0JyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZGaXJlLCB0aGlzLnJvbS5mbGFncy5GbGFtZUJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuQmxpenphcmRCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mVGh1bmRlciwgdGhpcy5yb20uZmxhZ3MuU3Rvcm1CcmFjZWxldF0sXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDMpIHJldHVybiBhbmQoc3dvcmQsIC4uLnBvd2Vycyk7XG4gICAgcmV0dXJuIHBvd2Vycy5tYXAocG93ZXIgPT4gW3N3b3JkLmMsIHBvd2VyLmNdKTtcbiAgfVxuXG4gIGl0ZW1HcmFudChpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0aGlzLnJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMpIHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaXRlbSBncmFudCAke2lkLnRvU3RyaW5nKDE2KX1gKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3IgYWxsIG9mIHRoZSBmbGFncyBiZWluZyBtZXQuICovXG4gIGZpbHRlclJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IGNvbmRzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA8IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvbmRzXTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3Igc29tZSBmbGFnIG5vdCBiZWluZyBtZXQuICovXG4gIGZpbHRlckFudGlSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCByZXEgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnID49IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5mbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIHJlcS5wdXNoKFtmLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVxO1xuICB9XG5cbiAgZmxhZyhmbGFnOiBudW1iZXIpOiBGbGFnfHVuZGVmaW5lZCB7XG4gICAgLy9jb25zdCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgIGNvbnN0IHVuc2lnbmVkID0gZmxhZzsgIC8vIFRPRE8gLSBzaG91bGQgd2UgYXV0by1pbnZlcnQ/XG4gICAgY29uc3QgZiA9IHRoaXMucm9tLmZsYWdzW3Vuc2lnbmVkXTtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmFsaWFzZXMuZ2V0KGYpID8/IGY7XG4gICAgcmV0dXJuIG1hcHBlZDtcbiAgfVxuXG4gIGVudHJhbmNlKGxvY2F0aW9uOiBMb2NhdGlvbnxudW1iZXIsIGluZGV4ID0gMCk6IFRpbGVJZCB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ251bWJlcicpIGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICByZXR1cm4gdGhpcy50aWxlcy5maW5kKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBsb2NhdGlvbi5lbnRyYW5jZXNbaW5kZXhdKSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh3YWxsOiBXYWxsVHlwZSk6IG51bWJlciB7XG4gICAgc3dpdGNoICh3YWxsKSB7XG4gICAgICBjYXNlIFdhbGxUeXBlLldJTkQ6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha1N0b25lLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5GSVJFOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJY2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLldBVEVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuRm9ybUJyaWRnZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuVEhVTkRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSXJvbi5pZDtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgYmFkIHdhbGwgdHlwZTogJHt3YWxsfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhbmQoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gIHJldHVybiBbZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBmLmlkIGFzIENvbmRpdGlvbildO1xufVxuXG5mdW5jdGlvbiBvciguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgcmV0dXJuIGZsYWdzLm1hcCgoZjogRmxhZykgPT4gW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG59XG5cbi8vIEFuIGludGVyZXN0aW5nIHdheSB0byB0cmFjayB0ZXJyYWluIGNvbWJpbmF0aW9ucyBpcyB3aXRoIHByaW1lcy5cbi8vIElmIHdlIGhhdmUgTiBlbGVtZW50cyB3ZSBjYW4gbGFiZWwgZWFjaCBhdG9tIHdpdGggYSBwcmltZSBhbmRcbi8vIHRoZW4gbGFiZWwgYXJiaXRyYXJ5IGNvbWJpbmF0aW9ucyB3aXRoIHRoZSBwcm9kdWN0LiAgRm9yIE49MTAwMFxuLy8gdGhlIGhpZ2hlc3QgbnVtYmVyIGlzIDgwMDAsIHNvIHRoYXQgaXQgY29udHJpYnV0ZXMgYWJvdXQgMTMgYml0c1xuLy8gdG8gdGhlIHByb2R1Y3QsIG1lYW5pbmcgd2UgY2FuIHN0b3JlIGNvbWJpbmF0aW9ucyBvZiA0IHNhZmVseVxuLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gYmlnaW50LiAgVGhpcyBpcyBpbmhlcmVudGx5IG9yZGVyLWluZGVwZW5kZW50LlxuLy8gSWYgdGhlIHJhcmVyIG9uZXMgYXJlIGhpZ2hlciwgd2UgY2FuIGZpdCBzaWduaWZpY2FudGx5IG1vcmUgdGhhbiA0LlxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyBEZWJ1ZyBpbnRlcmZhY2UuXG5leHBvcnQgaW50ZXJmYWNlIEFyZWFEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xuICBjaGVja3M6IEFycmF5PFtGbGFnLCBSZXF1aXJlbWVudF0+O1xuICB0ZXJyYWluOiBUZXJyYWluO1xuICBsb2NhdGlvbnM6IFNldDxudW1iZXI+O1xuICByb3V0ZXM6IFJlcXVpcmVtZW50LkZyb3plbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZURhdGEge1xuICBhcmVhOiBBcmVhRGF0YTtcbiAgZXhpdD86IFRpbGVJZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYXM6IFNldDxBcmVhRGF0YT47XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV29ybGREYXRhIHtcbiAgdGlsZXM6IE1hcDxUaWxlSWQsIFRpbGVEYXRhPjtcbiAgYXJlYXM6IEFyZWFEYXRhW107XG4gIGxvY2F0aW9uczogTG9jYXRpb25EYXRhW107XG59XG4iXX0=