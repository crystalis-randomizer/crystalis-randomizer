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
                const pit = location.pits.find(p => p.fromScreen === screenId);
                if (pit) {
                    this.exits.set(TileId(screenId << 8 | 0x88), TileId(pit.toScreen << 8 | 0x88));
                }
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
            else if (npc === this.rom.npcs.SoldierGuard) {
                antiReq = undefined;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUV2QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBZWpCLE1BQU0sT0FBTyxLQUFLO0lBbUVoQixZQUFxQixHQUFRLEVBQVcsT0FBZ0IsRUFDbkMsVUFBVSxLQUFLO1FBRGYsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUFXLFlBQU8s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QUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNQLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsRUFDMUQsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUs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QUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUFFLFNBQVM7WUFDL0QsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNsRDtJQUNILENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEdBQVE7UUFFdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBRS9CLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQy9EO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBRS9CLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFD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LEVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQVVELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXJlYX0gZnJvbSAnLi4vc3BvaWxlci9hcmVhLmpzJztcbmltcG9ydCB7ZGllfSBmcm9tICcuLi9hc3NlcnQuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0Jvc3N9IGZyb20gJy4uL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtGbGFnLCBMb2dpY30gZnJvbSAnLi4vcm9tL2ZsYWdzLmpzJztcbmltcG9ydCB7SXRlbSwgSXRlbVVzZX0gZnJvbSAnLi4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge0xvY2FsRGlhbG9nLCBOcGN9IGZyb20gJy4uL3JvbS9ucGMuanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXgsIHNlcX0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXAsIExhYmVsZWRTZXQsIGl0ZXJzLCBzcHJlYWR9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtEaXJ9IGZyb20gJy4vZGlyLmpzJztcbmltcG9ydCB7SXRlbUluZm8sIExvY2F0aW9uTGlzdCwgU2xvdEluZm99IGZyb20gJy4vZ3JhcGguanMnO1xuaW1wb3J0IHtIaXRib3h9IGZyb20gJy4vaGl0Ym94LmpzJztcbmltcG9ydCB7Q29uZGl0aW9uLCBSZXF1aXJlbWVudCwgUm91dGV9IGZyb20gJy4vcmVxdWlyZW1lbnQuanMnO1xuaW1wb3J0IHtTY3JlZW5JZH0gZnJvbSAnLi9zY3JlZW5pZC5qcyc7XG5pbXBvcnQge1RlcnJhaW4sIFRlcnJhaW5zfSBmcm9tICcuL3RlcnJhaW4uanMnO1xuaW1wb3J0IHtUaWxlSWR9IGZyb20gJy4vdGlsZWlkLmpzJztcbmltcG9ydCB7VGlsZVBhaXJ9IGZyb20gJy4vdGlsZXBhaXIuanMnO1xuaW1wb3J0IHtXYWxsVHlwZX0gZnJvbSAnLi93YWxsdHlwZS5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbmludGVyZmFjZSBDaGVjayB7XG4gIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudDtcbiAgY2hlY2tzOiBudW1iZXJbXTtcbn1cblxuLy8gQmFzaWMgYWxnb3JpdGhtOlxuLy8gIDEuIGZpbGwgdGVycmFpbnMgZnJvbSBtYXBzXG4vLyAgMi4gbW9kaWZ5IHRlcnJhaW5zIGJhc2VkIG9uIG5wY3MsIHRyaWdnZXJzLCBib3NzZXMsIGV0Y1xuLy8gIDIuIGZpbGwgYWxsRXhpdHNcbi8vICAzLiBzdGFydCB1bmlvbmZpbmRcbi8vICA0LiBmaWxsIC4uLj9cblxuLyoqIFN0b3JlcyBhbGwgdGhlIHJlbGV2YW50IGluZm9ybWF0aW9uIGFib3V0IHRoZSB3b3JsZCdzIGxvZ2ljLiAqL1xuZXhwb3J0IGNsYXNzIFdvcmxkIHtcblxuICAvKiogQnVpbGRzIGFuZCBjYWNoZXMgVGVycmFpbiBvYmplY3RzLiAqL1xuICByZWFkb25seSB0ZXJyYWluRmFjdG9yeSA9IG5ldyBUZXJyYWlucyh0aGlzLnJvbSk7XG5cbiAgLyoqIFRlcnJhaW5zIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5zID0gbmV3IE1hcDxUaWxlSWQsIFRlcnJhaW4+KCk7XG5cbiAgLyoqIENoZWNrcyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSBjaGVja3MgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFNldDxDaGVjaz4+KCgpID0+IG5ldyBTZXQoKSk7XG5cbiAgLyoqIFNsb3QgaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IHNsb3RzID0gbmV3IE1hcDxudW1iZXIsIFNsb3RJbmZvPigpO1xuICAvKiogSXRlbSBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgaXRlbXMgPSBuZXcgTWFwPG51bWJlciwgSXRlbUluZm8+KCk7XG5cbiAgLyoqIEZsYWdzIHRoYXQgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgZGlyZWN0IGFsaWFzZXMgZm9yIGxvZ2ljLiAqL1xuICByZWFkb25seSBhbGlhc2VzOiBNYXA8RmxhZywgRmxhZz47XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBpdGVtdXNlIHRyaWdnZXJzIHRvIHRoZSBpdGVtdXNlIHRoYXQgd2FudHMgaXQuICovXG4gIHJlYWRvbmx5IGl0ZW1Vc2VzID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBbSXRlbSwgSXRlbVVzZV1bXT4oKCkgPT4gW10pO1xuXG4gIC8qKiBSYXcgbWFwcGluZyBvZiBleGl0cywgd2l0aG91dCBjYW5vbmljYWxpemluZy4gKi9cbiAgcmVhZG9ubHkgZXhpdHMgPSBuZXcgTWFwPFRpbGVJZCwgVGlsZUlkPigpO1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gZXhpdHMgdG8gZW50cmFuY2VzLiAgVGlsZVBhaXIgaXMgY2Fub25pY2FsaXplZC4gKi9cbiAgcmVhZG9ubHkgZXhpdFNldCA9IG5ldyBTZXQ8VGlsZVBhaXI+KCk7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBUaWxlSWRzIHdpdGggc2VhbWxlc3MgZXhpdHMuICBUaGlzIGlzIHVzZWQgdG8gZW5zdXJlIHRoZVxuICAgKiBsb2dpYyB1bmRlcnN0YW5kcyB0aGF0IHRoZSBwbGF5ZXIgY2FuJ3Qgd2FsayBhY3Jvc3MgYW4gZXhpdCB0aWxlXG4gICAqIHdpdGhvdXQgY2hhbmdpbmcgbG9jYXRpb25zIChwcmltYXJpbHkgZm9yIGRpc2FibGluZyB0ZWxlcG9ydFxuICAgKiBza2lwKS5cbiAgICovXG4gIHJlYWRvbmx5IHNlYW1sZXNzRXhpdHMgPSBuZXcgU2V0PFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogVW5pb25maW5kIG9mIGNvbm5lY3RlZCBjb21wb25lbnRzIG9mIHRpbGVzLiAgTm90ZSB0aGF0IGFsbCB0aGVcbiAgICogYWJvdmUgcHJvcGVydGllcyBjYW4gYmUgYnVpbHQgdXAgaW4gcGFyYWxsZWwsIGJ1dCB0aGUgdW5pb25maW5kXG4gICAqIGNhbm5vdCBiZSBzdGFydGVkIHVudGlsIGFmdGVyIGFsbCB0ZXJyYWlucyBhbmQgZXhpdHMgYXJlXG4gICAqIHJlZ2lzdGVyZWQsIHNpbmNlIHdlIHNwZWNpZmljYWxseSBuZWVkIHRvICpub3QqIHVuaW9uIGNlcnRhaW5cbiAgICogbmVpZ2hib3JzLlxuICAgKi9cbiAgcmVhZG9ubHkgdGlsZXMgPSBuZXcgVW5pb25GaW5kPFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIFRpbGVQYWlycyBvZiBjYW5vbmljYWwgdW5pb25maW5kIHJlcHJlc2VudGF0aXZlIFRpbGVJZHMgdG9cbiAgICogYSBiaXRzZXQgb2YgbmVpZ2hib3IgZGlyZWN0aW9ucy4gIFdlIG9ubHkgbmVlZCB0byB3b3JyeSBhYm91dFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyBiZWNhdXNlIGFsbCBUaWxlSWRzIGhhdmUgdGhlIHNhbWUgdGVycmFpbi5cbiAgICogV2Ugd2lsbCBhZGQgYSByb3V0ZSBmb3IgZWFjaCBkaXJlY3Rpb24gd2l0aCB1bmlxdWUgcmVxdWlyZW1lbnRzLlxuICAgKi9cbiAgcmVhZG9ubHkgbmVpZ2hib3JzID0gbmV3IERlZmF1bHRNYXA8VGlsZVBhaXIsIG51bWJlcj4oKCkgPT4gMCk7XG5cbiAgLyoqIFJlcXVpcmVtZW50IGJ1aWxkZXIgZm9yIHJlYWNoaW5nIGVhY2ggY2Fub25pY2FsIFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgcm91dGVzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKCkgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKSk7XG5cbiAgLyoqIFJvdXRlcyBvcmlnaW5hdGluZyBmcm9tIGVhY2ggY2Fub25pY2FsIHRpbGUuICovXG4gIHJlYWRvbmx5IHJvdXRlRWRnZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBMYWJlbGVkU2V0PFJvdXRlPj4oKCkgPT4gbmV3IExhYmVsZWRTZXQoKSk7XG5cbiAgLyoqIExvY2F0aW9uIGxpc3Q6IHRoaXMgaXMgdGhlIHJlc3VsdCBvZiBjb21iaW5pbmcgcm91dGVzIHdpdGggY2hlY2tzLiAqL1xuICByZWFkb25seSByZXF1aXJlbWVudE1hcCA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxDb25kaXRpb24sIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgIChjOiBDb25kaXRpb24pID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKGMpKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSwgcmVhZG9ubHkgZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgdHJhY2tlciA9IGZhbHNlKSB7XG4gICAgLy8gQnVpbGQgaXRlbVVzZXNcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZSBvZiBpdGVtLml0ZW1Vc2VEYXRhKSB7XG4gICAgICAgIGlmICh1c2Uua2luZCA9PT0gJ2V4cGVjdCcpIHtcbiAgICAgICAgICB0aGlzLml0ZW1Vc2VzLmdldCh1c2Uud2FudCkucHVzaChbaXRlbSwgdXNlXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodXNlLmtpbmQgPT09ICdsb2NhdGlvbicpIHtcbiAgICAgICAgICB0aGlzLml0ZW1Vc2VzLmdldCh+dXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ1aWxkIGFsaWFzZXNcbiAgICB0aGlzLmFsaWFzZXMgPSBuZXcgTWFwKFtcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlQWthaGFuYSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVNvbGRpZXIsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTdG9tLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlV29tYW4sIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5QYXJhbHl6ZWRLZW5zdUluRGFuY2VIYWxsLCByb20uZmxhZ3MuUGFyYWx5c2lzXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJblRhdmVybiwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgXSk7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGxvY2F0aW9ucyB0byBidWlsZCB1cCBpbmZvIGFib3V0IHRpbGVzLCB0ZXJyYWlucywgY2hlY2tzLlxuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgdGhpcy5wcm9jZXNzTG9jYXRpb24obG9jYXRpb24pO1xuICAgIH1cbiAgICB0aGlzLmFkZEV4dHJhQ2hlY2tzKCk7XG5cbiAgICAvLyBCdWlsZCB1cCB0aGUgVW5pb25GaW5kIGFuZCB0aGUgZXhpdHMgYW5kIG5laWdoYm9ycyBzdHJ1Y3R1cmVzLlxuICAgIHRoaXMudW5pb25OZWlnaGJvcnMoKTtcbiAgICB0aGlzLnJlY29yZEV4aXRzKCk7XG4gICAgdGhpcy5idWlsZE5laWdoYm9ycygpO1xuXG4gICAgLy8gQnVpbGQgdGhlIHJvdXRlcy9lZGdlcy5cbiAgICB0aGlzLmFkZEFsbFJvdXRlcygpO1xuXG4gICAgLy8gQnVpbGQgdGhlIGxvY2F0aW9uIGxpc3QuXG4gICAgdGhpcy5jb25zb2xpZGF0ZUNoZWNrcygpO1xuICAgIHRoaXMuYnVpbGRSZXF1aXJlbWVudE1hcCgpO1xuICB9XG5cbiAgLyoqIEFkZHMgY2hlY2tzIHRoYXQgYXJlIG5vdCBkZXRlY3RhYmxlIGZyb20gZGF0YSB0YWJsZXMuICovXG4gIGFkZEV4dHJhQ2hlY2tzKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGxvY2F0aW9uczoge1xuICAgICAgICBMZWFmX1Rvb2xTaG9wLFxuICAgICAgICBNZXphbWVTaHJpbmUsXG4gICAgICAgIE9hayxcbiAgICAgICAgU2h5cm9uX1Rvb2xTaG9wLFxuICAgICAgfSxcbiAgICAgIGZsYWdzOiB7XG4gICAgICAgIEFibGVUb1JpZGVEb2xwaGluLFxuICAgICAgICBCYWxsT2ZGaXJlLCBCYWxsT2ZUaHVuZGVyLCBCYWxsT2ZXYXRlciwgQmFsbE9mV2luZCxcbiAgICAgICAgQmFycmllciwgQmxpenphcmRCcmFjZWxldCwgQm93T2ZNb29uLCBCb3dPZlN1bixcbiAgICAgICAgQnJlYWtTdG9uZSwgQnJlYWtJY2UsIEJyZWFrSXJvbixcbiAgICAgICAgQnJva2VuU3RhdHVlLCBCdXlIZWFsaW5nLCBCdXlXYXJwLFxuICAgICAgICBDbGltYldhdGVyZmFsbCwgQ2xpbWJTbG9wZTgsIENsaW1iU2xvcGU5LCBDdXJyZW50bHlSaWRpbmdEb2xwaGluLFxuICAgICAgICBGbGlnaHQsIEZsYW1lQnJhY2VsZXQsIEZvcm1CcmlkZ2UsXG4gICAgICAgIEdhc01hc2ssIEdsb3dpbmdMYW1wLFxuICAgICAgICBJbmp1cmVkRG9scGhpbixcbiAgICAgICAgTGVhZGluZ0NoaWxkLCBMZWF0aGVyQm9vdHMsXG4gICAgICAgIE1vbmV5LFxuICAgICAgICBPcGVuZWRDcnlwdCxcbiAgICAgICAgUmFiYml0Qm9vdHMsIFJlZnJlc2gsIFJlcGFpcmVkU3RhdHVlLCBSZXNjdWVkQ2hpbGQsXG4gICAgICAgIFNoZWxsRmx1dGUsIFNoaWVsZFJpbmcsIFNob290aW5nU3RhdHVlLCBTdG9ybUJyYWNlbGV0LFxuICAgICAgICBTd29yZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZUaHVuZGVyLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZXaW5kLFxuICAgICAgICBUb3JuYWRvQnJhY2VsZXQsIFRyYXZlbFN3YW1wLFxuICAgICAgICBXaWxkV2FycCxcbiAgICAgIH0sXG4gICAgICBpdGVtczoge1xuICAgICAgICBNZWRpY2FsSGVyYixcbiAgICAgICAgV2FycEJvb3RzLFxuICAgICAgfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSk7XG4gICAgY29uc3QgZW50ZXJPYWsgPSB0aGlzLmVudHJhbmNlKE9hayk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQm93T2ZNb29uLCBCb3dPZlN1biksIFtPcGVuZWRDcnlwdC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEFibGVUb1JpZGVEb2xwaGluLCBTaGVsbEZsdXRlKSxcbiAgICAgICAgICAgICAgICAgIFtDdXJyZW50bHlSaWRpbmdEb2xwaGluLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbZW50ZXJPYWtdLCBhbmQoTGVhZGluZ0NoaWxkKSwgW1Jlc2N1ZWRDaGlsZC5pZF0pO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtzdGFydF0sIGFuZChHbG93aW5nTGFtcCwgQnJva2VuU3RhdHVlKSxcbiAgICAgICAgICAgICAgICAgICAgICBSZXBhaXJlZFN0YXR1ZS5pZCwge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcblxuICAgIC8vIEFkZCBzaG9wc1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBMZWFmX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBTaHlyb25fVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KV07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gTWVkaWNhbEhlcmIuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eUhlYWxpbmcuaWRdKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSBXYXJwQm9vdHMuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eVdhcnAuaWRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBwc2V1ZG8gZmxhZ3NcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2luZC5yO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mRmlyZS5yO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXYXRlci5yO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gU3dvcmRPZlRodW5kZXIucjtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgY29uc3Qgd2luZDIgPSBvcihCYWxsT2ZXaW5kLCBUb3JuYWRvQnJhY2VsZXQpO1xuICAgICAgY29uc3QgZmlyZTIgPSBvcihCYWxsT2ZGaXJlLCBGbGFtZUJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHdhdGVyMiA9IG9yKEJhbGxPZldhdGVyLCBCbGl6emFyZEJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHRodW5kZXIyID0gb3IoQmFsbE9mVGh1bmRlciwgU3Rvcm1CcmFjZWxldCk7XG4gICAgICBicmVha1N0b25lID0gUmVxdWlyZW1lbnQubWVldChicmVha1N0b25lLCB3aW5kMik7XG4gICAgICBicmVha0ljZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJY2UsIGZpcmUyKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBSZXF1aXJlbWVudC5tZWV0KGZvcm1CcmlkZ2UsIHdhdGVyMik7XG4gICAgICBicmVha0lyb24gPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSXJvbiwgdGh1bmRlcjIpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9XG4gICAgICAgICAgICBSZXF1aXJlbWVudC5vcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogRmxhZyk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChcbiAgICAgICAgICAgICAgKGM6IHJlYWRvbmx5IENvbmRpdGlvbltdKSA9PlxuICAgICAgICAgICAgICAgICAgY1swXSA9PT0gc3dvcmQuYyA/IGMgOiBbc3dvcmQuYywgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKFN3b3JkT2ZXaW5kKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKFN3b3JkT2ZGaXJlKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoU3dvcmRPZldhdGVyKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChTd29yZE9mVGh1bmRlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtTdG9uZSwgW0JyZWFrU3RvbmUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSWNlLCBbQnJlYWtJY2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGZvcm1CcmlkZ2UsIFtGb3JtQnJpZGdlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0lyb24sIFtCcmVha0lyb24uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICBvcihTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXIpLFxuICAgICAgICAgICAgICAgICAgW1N3b3JkLmlkLCBNb25leS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgRmxpZ2h0LnIsIFtDbGltYldhdGVyZmFsbC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgb3IoRmxpZ2h0LCBSYWJiaXRCb290cyksIFtDbGltYlNsb3BlOC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgb3IoRmxpZ2h0LCBSYWJiaXRCb290cyksIFtDbGltYlNsb3BlOS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgQmFycmllci5yLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEdhc01hc2suciwgW1RyYXZlbFN3YW1wLmlkXSk7XG5cbiAgICBpZiAodGhpcy5mbGFnc2V0LmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIExlYXRoZXJCb290cy5yLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhcbiAgICAgICAgW3N0YXJ0XSwgYW5kKEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sIFJhYmJpdEJvb3RzKSxcbiAgICAgICAgW0NsaW1iV2F0ZXJmYWxsLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuZm9nTGFtcE5vdFJlcXVpcmVkKCkpIHtcbiAgICAgIC8vIG5vdCBhY3R1YWxseSB1c2VkLi4uP1xuICAgICAgY29uc3QgcmVxdWlyZUhlYWxlZCA9IHRoaXMuZmxhZ3NldC5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpO1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlSGVhbGVkID8gSW5qdXJlZERvbHBoaW4uciA6IFtbXV0sXG4gICAgICAgICAgICAgICAgICAgIFtBYmxlVG9SaWRlRG9scGhpbi5pZF0pO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVCYXJyaWVyKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBCdXlIZWFsaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFNoaWVsZFJpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sXG4gICAgICAgICAgICAgICAgICAgIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5hc3N1bWVGbGlnaHRTdGF0dWVTa2lwKCkpIHtcbiAgICAgIC8vIE5PVEU6IHdpdGggbm8gbW9uZXksIHdlJ3ZlIGdvdCAxNiBNUCwgd2hpY2ggaXNuJ3QgZW5vdWdoXG4gICAgICAvLyB0byBnZXQgcGFzdCBzZXZlbiBzdGF0dWVzLlxuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEZsaWdodC5jXV0sIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVHYXNNYXNrKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBCdXlIZWFsaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLCBbVHJhdmVsU3dhbXAuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFJlcXVpcmVtZW50Lk9QRU4sIFtXaWxkV2FycC5pZF0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBZGRzIHJvdXRlcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYVJvdXRlcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBmbGFnczoge0J1eVdhcnAsIFN3b3JkT2ZUaHVuZGVyLCBUZWxlcG9ydCwgV2lsZFdhcnB9LFxuICAgICAgbG9jYXRpb25zOiB7TWV6YW1lU2hyaW5lfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgYXQgTWV6YW1lIFNocmluZS5cbiAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSksIFtdKSk7XG4gICAgLy8gU3dvcmQgb2YgVGh1bmRlciB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIGNvbnN0IHdhcnAgPSB0aGlzLnJvbS50b3duV2FycC50aHVuZGVyU3dvcmRXYXJwO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgQnV5V2FycC5jXSkpO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgVGVsZXBvcnQuY10pKTtcbiAgICB9XG4gICAgLy8gV2lsZCB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICAvLyBEb24ndCBjb3VudCBjaGFubmVsIGluIGxvZ2ljIGJlY2F1c2UgeW91IGNhbid0IGFjdHVhbGx5IG1vdmUuXG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdGhpcy5yb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbC5pZCkgY29udGludWU7XG4gICAgICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2UgdGlsZXMgaGFzIGV4dHJhIHJlcXVpcmVtZW50cyB0byBlbnRlciAoZS5nLlxuICAgICAgICAvLyBzd2FtcCkgLSBmaW5kIHRoZW0gYW5kIGNvbmNhdGVudGUuXG4gICAgICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZShsb2NhdGlvbik7XG4gICAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChlbnRyYW5jZSkgPz8gZGllKCdiYWQgZW50cmFuY2UnKTtcbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0ZXJyYWluLmVudGVyKSB7XG4gICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoZW50cmFuY2UsIFtXaWxkV2FycC5jLCAuLi5yb3V0ZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBDaGFuZ2UgdGhlIGtleSBvZiB0aGUgY2hlY2tzIG1hcCB0byBvbmx5IGJlIGNhbm9uaWNhbCBUaWxlSWRzLiAqL1xuICBjb25zb2xpZGF0ZUNoZWNrcygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCByb290ID0gdGhpcy50aWxlcy5maW5kKHRpbGUpO1xuICAgICAgaWYgKHRpbGUgPT09IHJvb3QpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgdGhpcy5jaGVja3MuZ2V0KHJvb3QpLmFkZChjaGVjayk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrcy5kZWxldGUodGlsZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEF0IHRoaXMgcG9pbnQgd2Uga25vdyB0aGF0IGFsbCBvZiB0aGlzLmNoZWNrcycga2V5cyBhcmUgY2Fub25pY2FsLiAqL1xuICBidWlsZFJlcXVpcmVtZW50TWFwKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCByZXEgPSB0aGlzLnJlcXVpcmVtZW50TWFwLmdldChjaGVjayBhcyBDb25kaXRpb24pO1xuICAgICAgICAgIGZvciAoY29uc3QgcjEgb2YgcmVxdWlyZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcjIgb2YgdGhpcy5yb3V0ZXMuZ2V0KHRpbGUpIHx8IFtdKSB7XG4gICAgICAgICAgICAgIHJlcS5hZGRMaXN0KFsuLi5yMSwgLi4ucjJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gbG9nIHRoZSBtYXA/XG4gICAgaWYgKCFERUJVRykgcmV0dXJuO1xuICAgIGNvbnN0IGxvZyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2NoZWNrLCByZXFdIG9mIHRoaXMucmVxdWlyZW1lbnRNYXApIHtcbiAgICAgIGNvbnN0IG5hbWUgPSAoYzogbnVtYmVyKSA9PiB0aGlzLnJvbS5mbGFnc1tjXS5uYW1lO1xuICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiByZXEpIHtcbiAgICAgICAgbG9nLnB1c2goYCR7bmFtZShjaGVjayl9OiAke1suLi5yb3V0ZV0ubWFwKG5hbWUpLmpvaW4oJyAmICcpfVxcbmApO1xuICAgICAgfVxuICAgIH1cbiAgICBsb2cuc29ydCgoYTogYW55LCBiOiBhbnkpID0+IGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwKTtcbiAgICBjb25zb2xlLmxvZyhsb2cuam9pbignJykpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYSBMb2NhdGlvbkxpc3Qgc3RydWN0dXJlIGFmdGVyIHRoZSByZXF1aXJlbWVudCBtYXAgaXMgYnVpbHQuICovXG4gIGdldExvY2F0aW9uTGlzdCh3b3JsZE5hbWUgPSAnQ3J5c3RhbGlzJyk6IExvY2F0aW9uTGlzdCB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGp1c3QgaW1wbGVtZW50aW5nIHRoaXMgZGlyZWN0bHk/XG4gICAgY29uc3QgY2hlY2tOYW1lID0gREVCVUcgPyAoZjogRmxhZykgPT4gZi5kZWJ1ZyA6IChmOiBGbGFnKSA9PiBmLm5hbWU7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmxkTmFtZSxcbiAgICAgIHJlcXVpcmVtZW50czogdGhpcy5yZXF1aXJlbWVudE1hcCxcbiAgICAgIGl0ZW1zOiB0aGlzLml0ZW1zLFxuICAgICAgc2xvdHM6IHRoaXMuc2xvdHMsXG4gICAgICBjaGVja05hbWU6IChjaGVjazogbnVtYmVyKSA9PiBjaGVja05hbWUodGhpcy5yb20uZmxhZ3NbY2hlY2tdKSxcbiAgICAgIHByZWZpbGw6IChyYW5kb206IFJhbmRvbSkgPT4ge1xuICAgICAgICBjb25zdCB7Q3J5c3RhbGlzLCBNZXNpYUluVG93ZXIsIExlYWZFbGRlcn0gPSB0aGlzLnJvbS5mbGFncztcbiAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChbW01lc2lhSW5Ub3dlci5pZCwgQ3J5c3RhbGlzLmlkXV0pO1xuICAgICAgICBpZiAodGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVN3b3JkKCkpIHtcbiAgICAgICAgICAvLyBQaWNrIGEgc3dvcmQgYXQgcmFuZG9tLi4uPyBpbnZlcnNlIHdlaWdodD9cbiAgICAgICAgICBtYXAuc2V0KExlYWZFbGRlci5pZCwgMHgyMDAgfCByYW5kb20ubmV4dEludCg0KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgICAgLy8gVE9ETyAtIGlmIGFueSBpdGVtcyBzaG91bGRuJ3QgYmUgc2h1ZmZsZWQsIHRoZW4gZG8gdGhlIHByZS1maWxsLi4uXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKiogQWRkIHRlcnJhaW5zIGFuZCBjaGVja3MgZm9yIGEgbG9jYXRpb24sIGZyb20gdGlsZXMgYW5kIHNwYXducy4gKi9cbiAgcHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgcmV0dXJuO1xuICAgIC8vIExvb2sgZm9yIHdhbGxzLCB3aGljaCB3ZSBuZWVkIHRvIGtub3cgYWJvdXQgbGF0ZXIuXG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb24pO1xuICB9XG5cbiAgLyoqIFJ1biB0aGUgZmlyc3QgcGFzcyBvZiB1bmlvbnMgbm93IHRoYXQgYWxsIHRlcnJhaW5zIGFyZSBmaW5hbC4gKi9cbiAgdW5pb25OZWlnaGJvcnMoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHgxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeDFdKTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh5MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHkxXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEJ1aWxkcyB1cCB0aGUgcm91dGVzIGFuZCByb3V0ZUVkZ2VzIGRhdGEgc3RydWN0dXJlcy4gKi9cbiAgYWRkQWxsUm91dGVzKCkge1xuICAgIC8vIEFkZCBhbnkgZXh0cmEgcm91dGVzIGZpcnN0LCBzdWNoIGFzIHRoZSBzdGFydGluZyB0aWxlLlxuICAgIHRoaXMuYWRkRXh0cmFSb3V0ZXMoKTtcbiAgICAvLyBBZGQgYWxsIHRoZSBlZGdlcyBmcm9tIGFsbCBuZWlnaGJvcnMuXG4gICAgZm9yIChjb25zdCBbcGFpciwgZGlyc10gb2YgdGhpcy5uZWlnaGJvcnMpIHtcbiAgICAgIGNvbnN0IFtjMCwgYzFdID0gVGlsZVBhaXIuc3BsaXQocGFpcik7XG4gICAgICBjb25zdCB0MCA9IHRoaXMudGVycmFpbnMuZ2V0KGMwKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy50ZXJyYWlucy5nZXQoYzEpO1xuICAgICAgaWYgKCF0MCB8fCAhdDEpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyB0ZXJyYWluICR7aGV4KHQwID8gYzAgOiBjMSl9YCk7XG4gICAgICBmb3IgKGNvbnN0IFtkaXIsIGV4aXRSZXFdIG9mIHQwLmV4aXQpIHtcbiAgICAgICAgaWYgKCEoZGlyICYgZGlycykpIGNvbnRpbnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGV4aXRDb25kcyBvZiBleGl0UmVxKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBlbnRlckNvbmRzIG9mIHQxLmVudGVyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShjMSwgWy4uLmV4aXRDb25kcywgLi4uZW50ZXJDb25kc10pLCBjMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBkZWJ1ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWJ1ZycpO1xuICAgICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGRlYnVnLmFwcGVuZENoaWxkKG5ldyBBcmVhKHRoaXMucm9tLCB0aGlzLmdldFdvcmxkRGF0YSgpKS5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRXb3JsZERhdGEoKTogV29ybGREYXRhIHtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGNvbnN0IHRpbGVzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBUaWxlRGF0YT4oKCkgPT4gKHt9KSBhcyBUaWxlRGF0YSk7XG4gICAgY29uc3QgbG9jYXRpb25zID1cbiAgICAgICAgc2VxKDI1NiwgKCkgPT4gKHthcmVhczogbmV3IFNldCgpLCB0aWxlczogbmV3IFNldCgpfSBhcyBMb2NhdGlvbkRhdGEpKTtcbiAgICBjb25zdCBhcmVhczogQXJlYURhdGFbXSA9IFtdO1xuXG4gICAgLy8gZGlnZXN0IHRoZSBhcmVhc1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHRoaXMudGlsZXMuc2V0cygpKSB7XG4gICAgICBjb25zdCBjYW5vbmljYWwgPSB0aGlzLnRpbGVzLmZpbmQoaXRlcnMuZmlyc3Qoc2V0KSk7XG4gICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoY2Fub25pY2FsKTtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCByb3V0ZXMgPVxuICAgICAgICAgIHRoaXMucm91dGVzLmhhcyhjYW5vbmljYWwpID9cbiAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuZnJlZXplKHRoaXMucm91dGVzLmdldChjYW5vbmljYWwpKSA6IFtdO1xuICAgICAgaWYgKCFyb3V0ZXMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGFyZWE6IEFyZWFEYXRhID0ge1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICBpZDogaW5kZXgrKyxcbiAgICAgICAgbG9jYXRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgdGVycmFpbixcbiAgICAgICAgdGlsZXM6IG5ldyBTZXQoKSxcbiAgICAgIH07XG4gICAgICBhcmVhcy5wdXNoKGFyZWEpO1xuICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNldCkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHRpbGUgPj4+IDE2O1xuICAgICAgICBhcmVhLmxvY2F0aW9ucy5hZGQobG9jYXRpb24pO1xuICAgICAgICBhcmVhLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS5hcmVhcy5hZGQoYXJlYSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0udGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICB0aWxlcy5nZXQodGlsZSkuYXJlYSA9IGFyZWE7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgZXhpdHNcbiAgICBmb3IgKGNvbnN0IFthLCBiXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAodGlsZXMuaGFzKGEpKSB7XG4gICAgICAgIHRpbGVzLmdldChhKS5leGl0ID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBjaGVja3NcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IGFyZWEgPSB0aWxlcy5nZXQodGlsZSkuYXJlYTtcbiAgICAgIGlmICghYXJlYSkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKGBBYmFuZG9uZWQgY2hlY2sgJHtbLi4uY2hlY2tTZXRdLm1hcChcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgIHggPT4gWy4uLnguY2hlY2tzXS5tYXAoeSA9PiB5LnRvU3RyaW5nKDE2KSkpXG4gICAgICAgIC8vICAgICAgICAgICAgICAgIH0gYXQgJHt0aWxlLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLnJvbS5mbGFnc1tjaGVja10gfHwgZGllKCk7XG4gICAgICAgICAgYXJlYS5jaGVja3MucHVzaChbZmxhZywgcmVxdWlyZW1lbnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge3RpbGVzLCBhcmVhcywgbG9jYXRpb25zfTtcbiAgfVxuXG4gIC8qKiBBZGRzIGEgcm91dGUsIG9wdGlvbmFsbHkgd2l0aCBhIHByZXJlcXVpc2l0ZSAoY2Fub25pY2FsKSBzb3VyY2UgdGlsZS4gKi9cbiAgYWRkUm91dGUocm91dGU6IFJvdXRlLCBzb3VyY2U/OiBUaWxlSWQpIHtcbiAgICBpZiAoc291cmNlICE9IG51bGwpIHtcbiAgICAgIC8vIEFkZCBhbiBlZGdlIGluc3RlYWQgb2YgYSByb3V0ZSwgcmVjdXJzaW5nIG9uIHRoZSBzb3VyY2Unc1xuICAgICAgLy8gcmVxdWlyZW1lbnRzLlxuICAgICAgdGhpcy5yb3V0ZUVkZ2VzLmdldChzb3VyY2UpLmFkZChyb3V0ZSk7XG4gICAgICBmb3IgKGNvbnN0IHNyY1JvdXRlIG9mIHRoaXMucm91dGVzLmdldChzb3VyY2UpKSB7XG4gICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHJvdXRlLnRhcmdldCwgWy4uLnNyY1JvdXRlLCAuLi5yb3V0ZS5kZXBzXSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUaGlzIGlzIG5vdyBhbiBcImluaXRpYWwgcm91dGVcIiB3aXRoIG5vIHByZXJlcXVpc2l0ZSBzb3VyY2UuXG4gICAgY29uc3QgcXVldWUgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzZWVuID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc3RhcnQgPSByb3V0ZTsgLy8gVE9ETyBpbmxpbmVcbiAgICBxdWV1ZS5hZGQoc3RhcnQpO1xuICAgIGNvbnN0IGl0ZXIgPSBxdWV1ZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHt2YWx1ZSwgZG9uZX0gPSBpdGVyLm5leHQoKTtcbiAgICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgICBzZWVuLmFkZCh2YWx1ZSk7XG4gICAgICBxdWV1ZS5kZWxldGUodmFsdWUpO1xuICAgICAgY29uc3QgZm9sbG93ID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgICBjb25zdCB0YXJnZXQgPSB2YWx1ZS50YXJnZXQ7XG4gICAgICBjb25zdCBidWlsZGVyID0gdGhpcy5yb3V0ZXMuZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoYnVpbGRlci5hZGRSb3V0ZSh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRoaXMucm91dGVFZGdlcy5nZXQodGFyZ2V0KSkge1xuICAgICAgICAgIGZvbGxvdy5hZGQobmV3IFJvdXRlKG5leHQudGFyZ2V0LCBbLi4udmFsdWUuZGVwcywgLi4ubmV4dC5kZXBzXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5leHQgb2YgZm9sbG93KSB7XG4gICAgICAgIGlmIChzZWVuLmhhcyhuZXh0KSkgY29udGludWU7XG4gICAgICAgIHF1ZXVlLmRlbGV0ZShuZXh0KTsgLy8gcmUtYWRkIGF0IHRoZSBlbmQgb2YgdGhlIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmFkZChuZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIHVwIGB0aGlzLmV4aXRTZXRgIHRvIGluY2x1ZGUgYWxsIHRoZSBcImZyb20tdG9cIiB0aWxlIHBhaXJzXG4gICAqIG9mIGV4aXRzIHRoYXQgX2Rvbid0XyBzaGFyZSB0aGUgc2FtZSB0ZXJyYWluIEZvciBhbnkgdHdvLXdheSBleGl0XG4gICAqIHRoYXQgc2hhcmVzIHRoZSBzYW1lIHRlcnJhaW4sIGp1c3QgYWRkIGl0IGRpcmVjdGx5IHRvIHRoZVxuICAgKiB1bmlvbmZpbmQuXG4gICAqL1xuICByZWNvcmRFeGl0cygpIHtcbiAgICAvLyBBZGQgZXhpdCBUaWxlUGFpcnMgdG8gZXhpdFNldCBmcm9tIGFsbCBsb2NhdGlvbnMnIGV4aXRzLlxuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICB0aGlzLmV4aXRTZXQuYWRkKFxuICAgICAgICAgIFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZChmcm9tKSwgdGhpcy50aWxlcy5maW5kKHRvKSkpO1xuICAgIH1cbiAgICAvLyBMb29rIGZvciB0d28td2F5IGV4aXRzIHdpdGggdGhlIHNhbWUgdGVycmFpbjogcmVtb3ZlIHRoZW0gZnJvbVxuICAgIC8vIGV4aXRTZXQgYW5kIGFkZCB0aGVtIHRvIHRoZSB0aWxlcyB1bmlvbmZpbmQuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KGZyb20pICE9PSB0aGlzLnRlcnJhaW5zLmdldCh0bykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcmV2ZXJzZSA9IFRpbGVQYWlyLm9mKHRvLCBmcm9tKTtcbiAgICAgIGlmICh0aGlzLmV4aXRTZXQuaGFzKHJldmVyc2UpKSB7XG4gICAgICAgIHRoaXMudGlsZXMudW5pb24oW2Zyb20sIHRvXSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUoZXhpdCk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUocmV2ZXJzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgZGlmZmVyZW50LXRlcnJhaW4gbmVpZ2hib3JzIGluIHRoZSBzYW1lIGxvY2F0aW9uLiAgQWRkXG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIHRvIGB0aGlzLm5laWdoYm9yc2Agd2l0aCBhbGwgdGhlXG4gICAqIGRpcmVjdGlvbnMgdGhhdCBpdCBuZWlnaGJvcnMgaW4uICBBbHNvIGFkZCBleGl0cyBhcyBuZWlnaGJvcnMuXG4gICAqIFRoaXMgbXVzdCBoYXBwZW4gKmFmdGVyKiB0aGUgZW50aXJlIHVuaW9uZmluZCBpcyBjb21wbGV0ZSBzb1xuICAgKiB0aGF0IHdlIGNhbiBsZXZlcmFnZSBpdC5cbiAgICovXG4gIGJ1aWxkTmVpZ2hib3JzKCkge1xuICAgIC8vIEFkamFjZW50IGRpZmZlcmVudC10ZXJyYWluIHRpbGVzLlxuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBjb25zdCB0eTEgPSB0aGlzLnRlcnJhaW5zLmdldCh5MSk7XG4gICAgICBpZiAodHkxICYmIHR5MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHkxLCBEaXIuTm9ydGgpO1xuICAgICAgfVxuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgY29uc3QgdHgxID0gdGhpcy50ZXJyYWlucy5nZXQoeDEpO1xuICAgICAgaWYgKHR4MSAmJiB0eDEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB4MSwgRGlyLldlc3QpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBFeGl0cyAoanVzdCB1c2UgXCJub3J0aFwiIGZvciB0aGVzZSkuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW3QwLCB0MV0gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModDApIHx8ICF0aGlzLnRlcnJhaW5zLmhhcyh0MSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcCA9IFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZCh0MCksIHRoaXMudGlsZXMuZmluZCh0MSkpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAsIHRoaXMubmVpZ2hib3JzLmdldChwKSB8IDEpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHQwOiBUaWxlSWQsIHQxOiBUaWxlSWQsIGRpcjogRGlyKSB7XG4gICAgLy8gTk9URTogdDAgPCB0MSBiZWNhdXNlIGRpciBpcyBhbHdheXMgV0VTVCBvciBOT1JUSC5cbiAgICBjb25zdCBjMCA9IHRoaXMudGlsZXMuZmluZCh0MCk7XG4gICAgY29uc3QgYzEgPSB0aGlzLnRpbGVzLmZpbmQodDEpO1xuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MSkpIHtcbiAgICAgIC8vIDEgLT4gMCAod2VzdC9ub3J0aCkuICBJZiAxIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IHAxMCA9IFRpbGVQYWlyLm9mKGMxLCBjMCk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDEwLCB0aGlzLm5laWdoYm9ycy5nZXQocDEwKSB8ICgxIDw8IGRpcikpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDApKSB7XG4gICAgICAvLyAwIC0+IDEgKGVhc3Qvc291dGgpLiAgSWYgMCBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBvcHAgPSBkaXIgXiAyO1xuICAgICAgY29uc3QgcDAxID0gVGlsZVBhaXIub2YoYzAsIGMxKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMDEsIHRoaXMubmVpZ2hib3JzLmdldChwMDEpIHwgKDEgPDwgb3BwKSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qgd2FsbHMgPSBuZXcgTWFwPFNjcmVlbklkLCBXYWxsVHlwZT4oKTtcbiAgICBjb25zdCBzaG9vdGluZ1N0YXR1ZXMgPSBuZXcgU2V0PFNjcmVlbklkPigpO1xuICAgIGNvbnN0IGluVG93ZXIgPSAobG9jYXRpb24uaWQgJiAweGY4KSA9PT0gMHg1ODtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gV2FsbHMgbmVlZCB0byBjb21lIGZpcnN0IHNvIHdlIGNhbiBhdm9pZCBhZGRpbmcgc2VwYXJhdGVcbiAgICAgIC8vIHJlcXVpcmVtZW50cyBmb3IgZXZlcnkgc2luZ2xlIHdhbGwgLSBqdXN0IHVzZSB0aGUgdHlwZS5cbiAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICB3YWxscy5zZXQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCAoc3Bhd24uaWQgJiAzKSBhcyBXYWxsVHlwZSk7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgc2hvb3RpbmdTdGF0dWVzLmFkZChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpO1xuICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0c1tsb2NhdGlvbi50aWxlc2V0XTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM107XG5cbiAgICBjb25zdCBnZXRFZmZlY3RzID0gKHRpbGU6IFRpbGVJZCkgPT4ge1xuICAgICAgY29uc3QgcyA9IGxvY2F0aW9uLnNjcmVlbnNbKHRpbGUgJiAweGYwMDApID4+PiAxMl1bKHRpbGUgJiAweGYwMCkgPj4+IDhdO1xuICAgICAgcmV0dXJuIHRpbGVFZmZlY3RzLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgIH07XG5cbiAgICAvLyBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLlxuICAgIGNvbnN0IG1ha2VUZXJyYWluID0gKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkLCBiYXJyaWVyOiBib29sZWFuKSA9PiB7XG4gICAgICAvLyBDaGVjayBmb3IgZG9scGhpbiBvciBzd2FtcC4gIEN1cnJlbnRseSBkb24ndCBzdXBwb3J0IHNodWZmbGluZyB0aGVzZS5cbiAgICAgIGVmZmVjdHMgJj0gVGVycmFpbi5CSVRTO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDFhKSBlZmZlY3RzIHw9IFRlcnJhaW4uU1dBTVA7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjAgfHwgbG9jYXRpb24uaWQgPT09IDB4NjgpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDY0ICYmICgodGlsZSAmIDB4ZjBmMCkgPCAweDEwMzApKSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgaWYgKGJhcnJpZXIpIGVmZmVjdHMgfD0gVGVycmFpbi5CQVJSSUVSO1xuICAgICAgaWYgKCEoZWZmZWN0cyAmIFRlcnJhaW4uRE9MUEhJTikgJiYgZWZmZWN0cyAmIFRlcnJhaW4uU0xPUEUpIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAgIC8vIDYtOCBhcmUgYm90aCBkb2FibGUgd2l0aCBib290c1xuICAgICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgICAgLy8gMTAgaXMgcmlnaHQgb3V0XG4gICAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gMDtcbiAgICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIFRlcnJhaW4uU0xPUEUpIHtcbiAgICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgICAgaGVpZ2h0Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlaWdodCA8IDYpIHtcbiAgICAgICAgICBlZmZlY3RzICY9IH5UZXJyYWluLlNMT1BFO1xuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU4O1xuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDEwKSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFOTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudGVycmFpbkZhY3RvcnkudGlsZShlZmZlY3RzKTtcbiAgICB9O1xuXG4gICAgZm9yIChsZXQgeSA9IDAsIGhlaWdodCA9IGxvY2F0aW9uLmhlaWdodDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBsb2NhdGlvbi5zY3JlZW5zW3ldO1xuICAgICAgY29uc3Qgcm93SWQgPSBsb2NhdGlvbi5pZCA8PCA4IHwgeSA8PCA0O1xuICAgICAgZm9yIChsZXQgeCA9IDAsIHdpZHRoID0gbG9jYXRpb24ud2lkdGg7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuSWQgPSBTY3JlZW5JZChyb3dJZCB8IHgpO1xuICAgICAgICBjb25zdCBiYXJyaWVyID0gc2hvb3RpbmdTdGF0dWVzLmhhcyhzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWdZeCA9IHNjcmVlbklkICYgMHhmZjtcbiAgICAgICAgY29uc3Qgd2FsbCA9IHdhbGxzLmdldChzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWcgPVxuICAgICAgICAgICAgaW5Ub3dlciA/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQgOlxuICAgICAgICAgICAgd2FsbCAhPSBudWxsID8gdGhpcy53YWxsQ2FwYWJpbGl0eSh3YWxsKSA6XG4gICAgICAgICAgICBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IGZsYWdZeCk/LmZsYWc7XG4gICAgICAgIGNvbnN0IHBpdCA9IGxvY2F0aW9uLnBpdHMuZmluZChwID0+IHAuZnJvbVNjcmVlbiA9PT0gc2NyZWVuSWQpO1xuICAgICAgICBpZiAocGl0KSB7XG4gICAgICAgICAgdGhpcy5leGl0cy5zZXQoVGlsZUlkKHNjcmVlbklkIDw8IDggfCAweDg4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBUaWxlSWQocGl0LnRvU2NyZWVuIDw8IDggfCAweDg4KSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbG9naWM6IExvZ2ljID0gdGhpcy5yb20uZmxhZ3NbZmxhZyFdPy5sb2dpYyA/PyB7fTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWQgPSBUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IHQpO1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBpZiAobG9naWMuYXNzdW1lVHJ1ZSAmJiB0aWxlIDwgMHgyMCkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZWZmZWN0cyA9XG4gICAgICAgICAgICAgIGxvY2F0aW9uLmlzU2hvcCgpID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV0gJiAweDI2O1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gbWFrZVRlcnJhaW4oZWZmZWN0cywgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAvL2lmICghdGVycmFpbikgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgaWYgKHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPT0gdGlsZSAmJlxuICAgICAgICAgICAgICBmbGFnICE9IG51bGwgJiYgIWxvZ2ljLmFzc3VtZVRydWUgJiYgIWxvZ2ljLmFzc3VtZUZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGUgPVxuICAgICAgICAgICAgICAgIG1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgICAvL2lmICghYWx0ZXJuYXRlKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgLy8gTk9URTogdGhlcmUncyBhbiBvZGRpdHkgZnJvbSBob2xsb3dpbmcgb3V0IHRoZSBiYWNrcyBvZiBpcm9uXG4gICAgICAgICAgICAgIC8vIHdhbGxzIHRoYXQgb25lIGNvcm5lciBvZiBzdG9uZSB3YWxscyBhcmUgYWxzbyBob2xsb3dlZCBvdXQsXG4gICAgICAgICAgICAgIC8vIGJ1dCBvbmx5IHByZS1mbGFnLiAgSXQgZG9lc24ndCBhY3R1YWxseSBodXJ0IGFueXRoaW5nLlxuICAgICAgICAgICAgICB0ZXJyYWluID1cbiAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3RvcnkuZmxhZyh0ZXJyYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljLnRyYWNrID8gZmxhZyA6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0ZXJyYWluKSB0aGlzLnRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHtkZXN0LCBlbnRyYW5jZX0gPSBleGl0O1xuICAgICAgY29uc3QgZnJvbSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgIC8vIFNlYW1sZXNzIGV4aXRzICgweDIwKSBpZ25vcmUgdGhlIGVudHJhbmNlIGluZGV4LCBhbmRcbiAgICAgIC8vIGluc3RlYWQgcHJlc2VydmUgdGhlIFRpbGVJZCwganVzdCBjaGFuZ2luZyB0aGUgbG9jYXRpb24uXG4gICAgICBsZXQgdG86IFRpbGVJZDtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICB0byA9IFRpbGVJZChmcm9tICYgMHhmZmZmIHwgKGRlc3QgPDwgMTYpKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5zZWFtbGVzcyhwcmV2aW91cykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0byA9IHRoaXMuZW50cmFuY2UodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLCBlbnRyYW5jZSAmIDB4MWYpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc1RyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NOcGMobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQm9zcyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0NoZXN0KCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2hlc3QobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3Rlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi50eXBlID09PSAzICYmIHNwYXduLmlkID09PSAweGUwKSB7XG4gICAgICAgIC8vIHdpbmRtaWxsIGJsYWRlc1xuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoXG4gICAgICAgICAgICBIaXRib3guc2NyZWVuKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpLFxuICAgICAgICAgICAgdGhpcy5yb20uZmxhZ3MuVXNlZFdpbmRtaWxsS2V5LnIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gRm9yIHRyaWdnZXJzLCB3aGljaCB0aWxlcyBkbyB3ZSBtYXJrP1xuICAgIC8vIFRoZSB0cmlnZ2VyIGhpdGJveCBpcyAyIHRpbGVzIHdpZGUgYW5kIDEgdGlsZSB0YWxsLCBidXQgaXQgZG9lcyBub3RcbiAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgIC8vICRjIHdpZGUgKHRob3VnaCBpdCdzICQxNCB0YWxsKSBzbyB0aGVyZSdzIHNvbWUgc2xpZ2h0IGRpc3Bhcml0eS5cbiAgICAvLyBJdCBzZWVtcyBsaWtlIHByb2JhYmx5IG1hcmtpbmcgaXQgYXMgKHgtMSwgeS0xKSAuLiAoeCwgeSkgbWFrZXMgdGhlXG4gICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAvLyB0aWxlIHNob3VsZCBnbyBmcm9tIHggLi4geCsxIGluc3RlYWQuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY2hlY2tpbmcgdHJpZ2dlcidzIGFjdGlvbjogJDE5IC0+IHB1c2gtZG93biBtZXNzYWdlXG5cbiAgICAvLyBUT0RPIC0gcHVsbCBvdXQgdGhpcy5yZWNvcmRUcmlnZ2VyVGVycmFpbigpIGFuZCB0aGlzLnJlY29yZFRyaWdnZXJDaGVjaygpXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXIoc3Bhd24uaWQpO1xuICAgIGlmICghdHJpZ2dlcikgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHRyaWdnZXIgJHtzcGF3bi5pZC50b1N0cmluZygxNil9YCk7XG5cbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgIGxldCBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBsZXQgaGl0Ym94ID0gSGl0Ym94LnRyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcblxuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiB0cmlnZ2VyLmZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgY2hlY2tzKTtcblxuICAgIHN3aXRjaCAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDE5OlxuICAgICAgICAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICAgIC8vIGJpZ2dlciBoaXRib3ggdG8gbm90IGZpbmQgdGhlIHBhdGggdGhyb3VnaFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTFdLCBbMCwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmFzc3VtZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5kaXNhYmxlVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBjb3B5IHRoZSB0ZWxlcG9ydCBoaXRib3ggaW50byB0aGUgb3RoZXIgc2lkZSBvZiBjb3JkZWxcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYXRMb2NhdGlvbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxdWlyZW1lbnRzKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWQ6XG4gICAgICAgIC8vIHN0YXJ0IG1hZG8gMSBib3NzIGZpZ2h0XG4gICAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLk1hZG8xLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciB0cmlnZ2VyIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcXVpcmVtZW50cywgdHJpZ2dlci5pZCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTg6IHsgLy8gc3RvbSBmaWdodFxuICAgICAgICAvLyBTcGVjaWFsIGNhc2U6IHdhcnAgYm9vdHMgZ2xpdGNoIHJlcXVpcmVkIGlmIGNoYXJnZSBzaG90cyBvbmx5LlxuICAgICAgICBjb25zdCByZXEgPVxuICAgICAgICAgIHRoaXMuZmxhZ3NldC5jaGFyZ2VTaG90c09ubHkoKSA/XG4gICAgICAgICAgUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIGFuZCh0aGlzLnJvbS5mbGFncy5XYXJwQm9vdHMpKSA6XG4gICAgICAgICAgcmVxdWlyZW1lbnRzO1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgdGhpcy5yb20uZmxhZ3MuU3RvbUZpZ2h0UmV3YXJkLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSAweDFlOlxuICAgICAgICAvLyBmb3JnZSBjcnlzdGFsaXNcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLk1lc2lhSW5Ub3dlci5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZjpcbiAgICAgICAgdGhpcy5oYW5kbGVCb2F0KHRpbGUsIGxvY2F0aW9uLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBNb3ZpbmcgZ3VhcmRcbiAgICAgICAgLy8gdHJlYXQgdGhpcyBhcyBhIHN0YXR1ZT8gIGJ1dCB0aGUgY29uZGl0aW9ucyBhcmUgbm90IHN1cGVyIHVzZWZ1bC4uLlxuICAgICAgICAvLyAgIC0gb25seSB0cmFja2VkIGNvbmRpdGlvbnMgbWF0dGVyPyA5ZSA9PSBwYXJhbHlzaXMuLi4gZXhjZXB0IG5vdC5cbiAgICAgICAgLy8gcGFyYWx5emFibGU/ICBjaGVjayBEYXRhVGFibGVfMzUwNDVcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuUG9ydG9hX1BhbGFjZUVudHJhbmNlKSB7XG4gICAgICAgICAgLy8gUG9ydG9hIHBhbGFjZSBmcm9udCBndWFyZCBub3JtYWxseSBibG9ja3Mgb24gTWVzaWEgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEJ1dCB0aGUgcXVlZW4gaXMgYWN0dWFsbHkgYWNjZXNzaWJsZSB3aXRob3V0IHNlZWluZyB0aGUgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEluc3RlYWQsIGJsb2NrIGFjY2VzcyB0byB0aGUgdGhyb25lIHJvb20gb24gYmVpbmcgYWJsZSB0byB0YWxrIHRvXG4gICAgICAgICAgLy8gdGhlIGZvcnR1bmUgdGVsbGVyLCBpbiBjYXNlIHRoZSBndWFyZCBtb3ZlcyBiZWZvcmUgd2UgY2FuIGdldCB0aGVcbiAgICAgICAgICAvLyBpdGVtLiAgQWxzbyBtb3ZlIHRoZSBoaXRib3ggdXAgc2luY2UgdGhlIHR3byBzaWRlIHJvb21zIF9hcmVfIHN0aWxsXG4gICAgICAgICAgLy8gYWNjZXNzaWJsZS5cbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWy0yLCAwXSk7XG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMucm9tLmZsYWdzLlRhbGtlZFRvRm9ydHVuZVRlbGxlci5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94LCBsb2NhdGlvbiwgYW50aVJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTnBjKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tzcGF3bi5pZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbnBjOiAke2hleChzcGF3bi5pZCl9YCk7XG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jYXRpb24uaWQpIHx8IFtdO1xuICAgIGNvbnN0IHJlcSA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7IC8vIHNob3VsZCBiZSBzaW5nbGVcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgLy8gTk9URTogUmFnZSBoYXMgbm8gd2Fsa2FibGUgbmVpZ2hib3JzLCBhbmQgd2UgbmVlZCB0aGUgc2FtZSBoaXRib3hcbiAgICAvLyBmb3IgYm90aCB0aGUgdGVycmFpbiBhbmQgdGhlIGNoZWNrLlxuICAgIC8vXG4gICAgLy8gTk9URSBBTFNPIC0gUmFnZSBwcm9iYWJseSBzaG93cyB1cCBhcyBhIGJvc3MsIG5vdCBhbiBOUEM/XG4gICAgbGV0IGhpdGJveDogSGl0Ym94ID1cbiAgICAgICAgW3RoaXMudGVycmFpbnMuaGFzKHRpbGUpID8gdGlsZSA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKSA/PyB0aWxlXTtcblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKGhpdGJveCwgcmVxLCBpdGVtLCB1c2UpO1xuICAgIH1cblxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU2FiZXJhRGlzZ3Vpc2VkQXNNZXNpYSkge1xuICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuU2FiZXJhMSwgcmVxKTtcbiAgICB9XG5cbiAgICBpZiAoKG5wYy5kYXRhWzJdICYgMHgwNCkgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgICAgbGV0IGFudGlSZXE7XG4gICAgICBhbnRpUmVxID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7XG4gICAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlJhZ2UpIHtcbiAgICAgICAgLy8gVE9ETyAtIG1vdmUgaGl0Ym94IGRvd24sIGNoYW5nZSByZXF1aXJlbWVudD9cbiAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFsyLCAtMV0sIFsyLCAwXSwgWzIsIDFdLCBbMiwgMl0pO1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC02XSwgWzAsIC0yXSwgWzAsIDJdLCBbMCwgNl0pO1xuICAgICAgICAvLyBUT0RPIC0gY2hlY2sgaWYgdGhpcyB3b3Jrcz8gIHRoZSB+Y2hlY2sgc3Bhd24gY29uZGl0aW9uIHNob3VsZFxuICAgICAgICAvLyBhbGxvdyBwYXNzaW5nIGlmIGdvdHRlbiB0aGUgY2hlY2ssIHdoaWNoIGlzIHRoZSBzYW1lIGFzIGdvdHRlblxuICAgICAgICAvLyB0aGUgY29ycmVjdCBzd29yZC5cbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSBhbnRpUmVxID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUG9ydG9hVGhyb25lUm9vbUJhY2tEb29yR3VhcmQpIHtcbiAgICAgICAgLy8gUG9ydG9hIGJhY2sgZG9vciBndWFyZCBzcGF3bnMgaWYgKDEpIHRoZSBtZXNpYSByZWNvcmRpbmcgaGFzIG5vdCB5ZXRcbiAgICAgICAgLy8gYmVlbiBwbGF5ZWQsIGFuZCAoMikgdGhlIHBsYXllciBkaWRuJ3Qgc25lYWsgcGFzdCB0aGUgZWFybGllciBndWFyZC5cbiAgICAgICAgLy8gV2UgY2FuIHNpbXVsYXRlIHRoaXMgYnkgaGFyZC1jb2RpbmcgYSByZXF1aXJlbWVudCBvbiBlaXRoZXIgdG8gZ2V0XG4gICAgICAgIC8vIHBhc3QgaGltLlxuICAgICAgICBhbnRpUmVxID0gb3IodGhpcy5yb20uZmxhZ3MuTWVzaWFSZWNvcmRpbmcsIHRoaXMucm9tLmZsYWdzLlBhcmFseXNpcyk7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Tb2xkaWVyR3VhcmQpIHtcbiAgICAgICAgYW50aVJlcSA9IHVuZGVmaW5lZDsgLy8gdGhleSdsbCBqdXN0IGF0dGFjayBpZiBhcHByb2FjaGVkLlxuICAgICAgfVxuICAgICAgLy8gaWYgc3Bhd24gaXMgYWx3YXlzIGZhbHNlIHRoZW4gcmVxIG5lZWRzIHRvIGJlIG9wZW4/XG4gICAgICBpZiAoYW50aVJlcSkgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoYW50aVJlcSkpO1xuICAgIH1cblxuICAgIC8vIEZvcnR1bmUgdGVsbGVyIGNhbiBiZSB0YWxrZWQgdG8gYWNyb3NzIHRoZSBkZXNrLlxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuRm9ydHVuZVRlbGxlcikge1xuICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAwXSwgWzIsIDBdKTtcbiAgICB9XG5cbiAgICAvLyByZXEgaXMgbm93IG11dGFibGVcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxKSkgcmV0dXJuOyAvLyBub3RoaW5nIHRvIGRvIGlmIGl0IG5ldmVyIHNwYXducy5cbiAgICBjb25zdCBbWy4uLmNvbmRzXV0gPSByZXE7XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGdsb2JhbCBkaWFsb2dzIC0gZG8gbm90aGluZyBpZiB3ZSBjYW4ndCBwYXNzIHRoZW0uXG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5kLmNvbmRpdGlvbik7XG4gICAgICBpZiAoIWY/LmxvZ2ljLnRyYWNrKSBjb250aW51ZTtcbiAgICAgIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgYXBwcm9wcmlhdGUgbG9jYWwgZGlhbG9nc1xuICAgIGNvbnN0IGxvY2FscyA9XG4gICAgICAgIG5wYy5sb2NhbERpYWxvZ3MuZ2V0KGxvY2F0aW9uLmlkKSA/PyBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgPz8gW107XG4gICAgZm9yIChjb25zdCBkIG9mIGxvY2Fscykge1xuICAgICAgLy8gQ29tcHV0ZSB0aGUgY29uZGl0aW9uICdyJyBmb3IgdGhpcyBtZXNzYWdlLlxuICAgICAgY29uc3QgciA9IFsuLi5jb25kc107XG4gICAgICBjb25zdCBmMCA9IHRoaXMuZmxhZyhkLmNvbmRpdGlvbik7XG4gICAgICBpZiAoZjA/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIHIucHVzaChmMC5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgICAgdGhpcy5wcm9jZXNzRGlhbG9nKGhpdGJveCwgbnBjLCByLCBkKTtcbiAgICAgIC8vIEFkZCBhbnkgbmV3IGNvbmRpdGlvbnMgdG8gJ2NvbmRzJyB0byBnZXQgYmV5b25kIHRoaXMgbWVzc2FnZS5cbiAgICAgIGNvbnN0IGYxID0gdGhpcy5mbGFnKH5kLmNvbmRpdGlvbik7XG4gICAgICBpZiAoZjE/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNvbmRzLnB1c2goZjEuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzRGlhbG9nKGhpdGJveDogSGl0Ym94LCBucGM6IE5wYyxcbiAgICAgICAgICAgICAgICByZXE6IHJlYWRvbmx5IENvbmRpdGlvbltdLCBkaWFsb2c6IExvY2FsRGlhbG9nKSB7XG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIFtyZXFdLCBkaWFsb2cuZmxhZ3MpO1xuXG4gICAgY29uc3QgaW5mbyA9IHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfTtcbiAgICBzd2l0Y2ggKGRpYWxvZy5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDA4OiAvLyBvcGVuIHN3YW4gZ2F0ZVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCBbcmVxXSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGM6IC8vIGR3YXJmIGNoaWxkIHN0YXJ0cyBmb2xsb3dpbmdcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwZDogLy8gbnBjIHdhbGtzIGF3YXlcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxNDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuU2xpbWVkS2Vuc3UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDEwOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFzaW5hSW5CYWNrUm9vbS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTE6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMV0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDAzOlxuICAgICAgY2FzZSAweDBhOiAvLyBub3JtYWxseSB0aGlzIGhhcmQtY29kZXMgZ2xvd2luZyBsYW1wLCBidXQgd2UgZXh0ZW5kZWQgaXRcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVswXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDk6XG4gICAgICAgIC8vIElmIHplYnUgc3R1ZGVudCBoYXMgYW4gaXRlbS4uLj8gIFRPRE8gLSBzdG9yZSBmZiBpZiB1bnVzZWRcbiAgICAgICAgY29uc3QgaXRlbSA9IG5wYy5kYXRhWzFdO1xuICAgICAgICBpZiAoaXRlbSAhPT0gMHhmZikgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBpdGVtLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Ba2FoYW5hRmx1dGVPZkxpbWVUcmFkZWluLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYTpcbiAgICAgICAgLy8gVE9ETyAtIGNhbiB3ZSByZWFjaCB0aGlzIHNwb3Q/ICBtYXkgbmVlZCB0byBtb3ZlIGRvd24/XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlJhZ2UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBSYWdlIHRocm93aW5nIHBsYXllciBvdXQuLi5cbiAgICAgICAgLy8gVGhpcyBzaG91bGQgYWN0dWFsbHkgYWxyZWFkeSBiZSBoYW5kbGVkIGJ5IHRoZSBzdGF0dWUgY29kZSBhYm92ZT9cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFkZCBleHRyYSBkaWFsb2dzIGZvciBpdGVtdXNlIHRyYWRlcywgZXh0cmEgdHJpZ2dlcnNcbiAgICAvLyAgICAgIC0gaWYgaXRlbSB0cmFkZWQgYnV0IG5vIHJld2FyZCwgdGhlbiByZS1naXZlIHJld2FyZC4uLlxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldCh+bG9jYXRpb24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFt0aGlzLmVudHJhbmNlKGxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlcXVpcmVtZW50Lk9QRU4sIGl0ZW0sIHVzZSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94OiBIaXRib3gsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIFRoaXMgaXMgdGhlIDFiIHRyaWdnZXIgYWN0aW9uIGZvbGxvdy11cC4gIEl0IGxvb2tzIGZvciBhbiBOUEMgaW4gMGQgb3IgMGVcbiAgICAvLyBhbmQgbW92ZXMgdGhlbSBvdmVyIGEgcGl4ZWwuICBGb3IgdGhlIGxvZ2ljLCBpdCdzIGFsd2F5cyBpbiBhIHBvc2l0aW9uXG4gICAgLy8gd2hlcmUganVzdCBtYWtpbmcgdGhlIHRyaWdnZXIgc3F1YXJlIGJlIGEgbm8tZXhpdCBzcXVhcmUgaXMgc3VmZmljaWVudCxcbiAgICAvLyBidXQgd2UgbmVlZCB0byBnZXQgdGhlIGNvbmRpdGlvbnMgcmlnaHQuICBXZSBwYXNzIGluIHRoZSByZXF1aXJlbWVudHMgdG9cbiAgICAvLyBOT1QgdHJpZ2dlciB0aGUgdHJpZ2dlciwgYW5kIHRoZW4gd2Ugam9pbiBpbiBwYXJhbHlzaXMgYW5kL29yIHN0YXR1ZVxuICAgIC8vIGdsaXRjaCBpZiBhcHByb3ByaWF0ZS4gIFRoZXJlIGNvdWxkIHRoZW9yZXRpY2FsbHkgYmUgY2FzZXMgd2hlcmUgdGhlXG4gICAgLy8gZ3VhcmQgaXMgcGFyYWx5emFibGUgYnV0IHRoZSBnZW9tZXRyeSBwcmV2ZW50cyB0aGUgcGxheWVyIGZyb20gYWN0dWFsbHlcbiAgICAvLyBoaXR0aW5nIHRoZW0gYmVmb3JlIHRoZXkgbW92ZSwgYnV0IGl0IGRvZXNuJ3QgaGFwcGVuIGluIHByYWN0aWNlLlxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHJldHVybjtcbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW11bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zLnNsaWNlKDAsIDIpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNOcGMoKSAmJiB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXS5pc1BhcmFseXphYmxlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChbdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoWy4uLnJlcSwgLi4uZXh0cmFdLm1hcChzcHJlYWQpKSk7XG5cblxuICAgIC8vIFRPRE8gLSBQb3J0b2EgZ3VhcmRzIGFyZSBicm9rZW4gOi0oXG4gICAgLy8gVGhlIGJhY2sgZ3VhcmQgbmVlZHMgdG8gYmxvY2sgb24gdGhlIGZyb250IGd1YXJkJ3MgY29uZGl0aW9ucyxcbiAgICAvLyB3aGlsZSB0aGUgZnJvbnQgZ3VhcmQgc2hvdWxkIGJsb2NrIG9uIGZvcnR1bmUgdGVsbGVyP1xuXG4gIH1cblxuICBoYW5kbGVCb2F0KHRpbGU6IFRpbGVJZCwgbG9jYXRpb246IExvY2F0aW9uLCByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gYm9hcmQgYm9hdCAtIHRoaXMgYW1vdW50cyB0byBhZGRpbmcgYSByb3V0ZSBlZGdlIGZyb20gdGhlIHRpbGVcbiAgICAvLyB0byB0aGUgbGVmdCwgdGhyb3VnaCBhbiBleGl0LCBhbmQgdGhlbiBjb250aW51aW5nIHVudGlsIGZpbmRpbmcgbGFuZC5cbiAgICBjb25zdCB0MCA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKTtcbiAgICBpZiAodDAgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB3YWxrYWJsZSBuZWlnaGJvci5gKTtcbiAgICBjb25zdCB5dCA9ICh0aWxlID4+IDgpICYgMHhmMCB8ICh0aWxlID4+IDQpICYgMHhmO1xuICAgIGNvbnN0IHh0ID0gKHRpbGUgPj4gNCkgJiAweGYwIHwgdGlsZSAmIDB4ZjtcbiAgICBsZXQgYm9hdEV4aXQ7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC55dCA9PT0geXQgJiYgZXhpdC54dCA8IHh0KSBib2F0RXhpdCA9IGV4aXQ7XG4gICAgfVxuICAgIGlmICghYm9hdEV4aXQpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYm9hdCBleGl0YCk7XG4gICAgLy8gVE9ETyAtIGxvb2sgdXAgdGhlIGVudHJhbmNlLlxuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbYm9hdEV4aXQuZGVzdF07XG4gICAgaWYgKCFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBkZXN0aW5hdGlvbmApO1xuICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbYm9hdEV4aXQuZW50cmFuY2VdO1xuICAgIGNvbnN0IGVudHJhbmNlVGlsZSA9IFRpbGVJZC5mcm9tKGRlc3QsIGVudHJhbmNlKTtcbiAgICBsZXQgdCA9IGVudHJhbmNlVGlsZTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdCA9IFRpbGVJZC5hZGQodCwgMCwgLTEpO1xuICAgICAgY29uc3QgdDEgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodCk7XG4gICAgICBpZiAodDEgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBib2F0OiBUZXJyYWluID0ge1xuICAgICAgICAgIGVudGVyOiBSZXF1aXJlbWVudC5mcmVlemUocmVxdWlyZW1lbnRzKSxcbiAgICAgICAgICBleGl0OiBbWzB4ZiwgUmVxdWlyZW1lbnQuT1BFTl1dLFxuICAgICAgICB9O1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBib2F0IHRyaWdnZXIuXG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihbdDBdLCBib2F0KTtcbiAgICAgICAgdGhpcy5leGl0cy5zZXQodDAsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZih0MCwgdDEpKTtcbiAgICAgICAgLy8gQWRkIGEgdGVycmFpbiBhbmQgZXhpdCBwYWlyIGZvciB0aGUgZW50cmFuY2Ugd2UgcGFzc2VkXG4gICAgICAgIC8vICh0aGlzIGlzIHByaW1hcmlseSBuZWNlc3NhcnkgZm9yIHdpbGQgd2FycCB0byB3b3JrIGluIGxvZ2ljKS5cbiAgICAgICAgdGhpcy5leGl0cy5zZXQoZW50cmFuY2VUaWxlLCB0MSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5hZGQoVGlsZVBhaXIub2YoZW50cmFuY2VUaWxlLCB0MSkpO1xuICAgICAgICB0aGlzLnRlcnJhaW5zLnNldChlbnRyYW5jZVRpbGUsIHRoaXMudGVycmFpbkZhY3RvcnkudGlsZSgwKSEpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50LCBncmFudElkOiBudW1iZXIpIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtR3JhbnQoZ3JhbnRJZCk7XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgaXRlbTtcbiAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgaXRlbSBncmFudCBmb3IgJHtncmFudElkLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgLy8gaXMgdGhlIDEwMCBmbGFnIHN1ZmZpY2llbnQgaGVyZT8gIHByb2JhYmx5P1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gZ3JhbnRJZCA+PSAweDgwOyAvLyBncmFudGVkIGZyb20gYSB0cmlnZ2VyXG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsIHNsb3QsXG4gICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWUsIHByZXZlbnRMb3NzfSk7XG4gIH1cblxuICBhZGRUZXJyYWluKGhpdGJveDogSGl0Ym94LCB0ZXJyYWluOiBUZXJyYWluKSB7XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgY29uc3QgdCA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgaWYgKHQgPT0gbnVsbCkgY29udGludWU7IC8vIHVucmVhY2hhYmxlIHRpbGVzIGRvbid0IG5lZWQgZXh0cmEgcmVxc1xuICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5tZWV0KHQsIHRlcnJhaW4pKTtcbiAgICB9XG4gIH1cblxuICBhZGRDaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBjaGVja3M6IG51bWJlcltdKSB7XG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcXVpcmVtZW50KSkgcmV0dXJuOyAvLyBkbyBub3RoaW5nIGlmIHVucmVhY2hhYmxlXG4gICAgY29uc3QgY2hlY2sgPSB7cmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudCksIGNoZWNrc307XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0aWxlKSkgY29udGludWU7XG4gICAgICB0aGlzLmNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICB9XG4gIH1cblxuICBhZGRJdGVtQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCxcbiAgICAgICAgICAgICAgIGNoZWNrOiBudW1iZXIsIHNsb3Q6IFNsb3RJbmZvKSB7XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBbY2hlY2tdKTtcbiAgICB0aGlzLnNsb3RzLnNldChjaGVjaywgc2xvdCk7XG4gICAgLy8gYWxzbyBhZGQgY29ycmVzcG9uZGluZyBJdGVtSW5mbyB0byBrZWVwIHRoZW0gaW4gcGFyaXR5LlxuICAgIGNvbnN0IGl0ZW1nZXQgPSB0aGlzLnJvbS5pdGVtR2V0c1t0aGlzLnJvbS5zbG90c1tjaGVjayAmIDB4ZmZdXTtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbaXRlbWdldC5pdGVtSWRdO1xuICAgIGNvbnN0IHVuaXF1ZSA9IGl0ZW0/LnVuaXF1ZTtcbiAgICBjb25zdCBsb3NhYmxlID0gaXRlbWdldC5pc0xvc2FibGUoKTtcbiAgICAvLyBUT0RPIC0gcmVmYWN0b3IgdG8ganVzdCBcImNhbid0IGJlIGJvdWdodFwiP1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gdW5pcXVlIHx8IGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk9wZWxTdGF0dWU7XG4gICAgbGV0IHdlaWdodCA9IDE7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXaW5kKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mRmlyZSkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldhdGVyKSB3ZWlnaHQgPSAxMDtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZlRodW5kZXIpIHdlaWdodCA9IDE1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5GbGlnaHQpIHdlaWdodCA9IDE1O1xuICAgIHRoaXMuaXRlbXMuc2V0KDB4MjAwIHwgaXRlbWdldC5pZCwge3VuaXF1ZSwgbG9zYWJsZSwgcHJldmVudExvc3MsIHdlaWdodH0pO1xuICB9XG5cbiAgYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCwgZmxhZ3M6IG51bWJlcltdKSB7XG4gICAgY29uc3QgY2hlY2tzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBjaGVja3MpO1xuICB9XG5cbiAgd2Fsa2FibGVOZWlnaGJvcih0OiBUaWxlSWQpOiBUaWxlSWR8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQpKSByZXR1cm4gdDtcbiAgICBmb3IgKGxldCBkIG9mIFstMSwgMV0pIHtcbiAgICAgIGNvbnN0IHQxID0gVGlsZUlkLmFkZCh0LCBkLCAwKTtcbiAgICAgIGNvbnN0IHQyID0gVGlsZUlkLmFkZCh0LCAwLCBkKTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDEpKSByZXR1cm4gdDE7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQyKSkgcmV0dXJuIHQyO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNXYWxrYWJsZSh0OiBUaWxlSWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISh0aGlzLmdldEVmZmVjdHModCkgJiBUZXJyYWluLkJJVFMpO1xuICB9XG5cbiAgZW5zdXJlUGFzc2FibGUodDogVGlsZUlkKTogVGlsZUlkIHtcbiAgICByZXR1cm4gdGhpcy5pc1dhbGthYmxlKHQpID8gdCA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0O1xuICB9XG5cbiAgZ2V0RWZmZWN0cyh0OiBUaWxlSWQpOiBudW1iZXIge1xuICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW3QgPj4+IDE2XTtcbiAgICAvL2NvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdLmVmZmVjdHM7XG4gICAgY29uc3Qgc2NyID0gbG9jYXRpb24uc2NyZWVuc1sodCAmIDB4ZjAwMCkgPj4+IDEyXVsodCAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgcmV0dXJuIGVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXV07XG4gIH1cblxuICBwcm9jZXNzQm9zcyhsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEJvc3NlcyB3aWxsIGNsb2JiZXIgdGhlIGVudHJhbmNlIHBvcnRpb24gb2YgYWxsIHRpbGVzIG9uIHRoZSBzY3JlZW4sXG4gICAgLy8gYW5kIHdpbGwgYWxzbyBhZGQgdGhlaXIgZHJvcC5cbiAgICBpZiAoc3Bhd24uaWQgPT09IDB4YzkgfHwgc3Bhd24uaWQgPT09IDB4Y2EpIHJldHVybjsgLy8gc3RhdHVlc1xuICAgIGNvbnN0IGlzUmFnZSA9IHNwYXduLmlkID09PSAweGMzO1xuICAgIGNvbnN0IGJvc3MgPVxuICAgICAgICBpc1JhZ2UgPyB0aGlzLnJvbS5ib3NzZXMuUmFnZSA6XG4gICAgICAgIHRoaXMucm9tLmJvc3Nlcy5mcm9tTG9jYXRpb24obG9jYXRpb24uaWQpO1xuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuICAgIGlmICghYm9zcyB8fCAhYm9zcy5mbGFnKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBib3NzIGF0ICR7bG9jYXRpb24ubmFtZX1gKTtcbiAgICBjb25zdCBzY3JlZW4gPSB0aWxlICYgfjB4ZmY7XG4gICAgLy8gTk9URTogUmFnZSBjYW4gYmUgZXhpdGVkIHNvdXRoLi4uIGJ1dCB0aGlzIG9ubHkgbWF0dGVycyBpZiB0aGVyZSdzXG4gICAgLy8gYW55dGhpbmcgb3RoZXIgdGhhbiBNZXNpYSdzIHNocmluZSBiZWhpbmQgaGltLCB3aGljaCBtYWtlcyBhIGxvdCBvZlxuICAgIC8vIGxvZ2ljIG1vcmUgZGlmZmljdWx0LCBzbyBsaWtlbHkgdGhpcyBlbnRyYW5jZSB3aWxsIHN0YXkgcHV0IGZvcmV2ZXIuXG4gICAgY29uc3QgYm9zc1RlcnJhaW4gPSB0aGlzLnRlcnJhaW5GYWN0b3J5LmJvc3MoYm9zcy5mbGFnLmlkKTtcbiAgICBjb25zdCBoaXRib3ggPSBzZXEoMHhmMCwgKHQ6IG51bWJlcikgPT4gKHNjcmVlbiB8IHQpIGFzIFRpbGVJZCk7XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgYm9zc1RlcnJhaW4pO1xuICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgYm9zcyk7XG4gIH1cblxuICBhZGRCb3NzQ2hlY2soaGl0Ym94OiBIaXRib3gsIGJvc3M6IEJvc3MsXG4gICAgICAgICAgICAgICByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50ID0gUmVxdWlyZW1lbnQuT1BFTikge1xuICAgIGlmIChib3NzLmZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhIGZsYWc6ICR7Ym9zc31gKTtcbiAgICBjb25zdCByZXEgPSBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKGJvc3MpKTtcbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbYm9zcy5mbGFnLmlkXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgIGhpdGJveCwgcmVxLCBib3NzLmZsYWcuaWQsIHtsb3NzeTogZmFsc2UsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NDaGVzdChsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEFkZCBhIGNoZWNrIGZvciB0aGUgMXh4IGZsYWcuICBNYWtlIHN1cmUgaXQncyBub3QgYSBtaW1pYy5cbiAgICBpZiAodGhpcy5yb20uc2xvdHNbc3Bhd24uaWRdID49IDB4NzApIHJldHVybjtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBzcGF3bi5pZDtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF07XG4gICAgaWYgKG1hcHBlZCA+PSAweDcwKSByZXR1cm47IC8vIFRPRE8gLSBtaW1pYyUgbWF5IGNhcmVcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbbWFwcGVkXTtcbiAgICBjb25zdCB1bmlxdWUgPSB0aGlzLmZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSA/ICEhaXRlbT8udW5pcXVlIDogdHJ1ZTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sIFJlcXVpcmVtZW50Lk9QRU4sXG4gICAgICAgICAgICAgICAgICAgICAgc2xvdCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlfSk7XG4gIH1cblxuICBwcm9jZXNzTW9uc3RlcihfbG9jYXRpb246IExvY2F0aW9uLCBfc3Bhd246IFNwYXduKSB7XG4gICAgICAgIC8vIFRPRE8gLSBjb21wdXRlIG1vbmV5LWRyb3BwaW5nIG1vbnN0ZXIgdnVsbmVyYWJpbGl0aWVzIGFuZCBhZGQgYSB0cmlnZ2VyXG4gICAgICAgIC8vIGZvciB0aGUgTU9ORVkgY2FwYWJpbGl0eSBkZXBlbmRlbnQgb24gYW55IG9mIHRoZSBzd29yZHMuXG4gICAgLy8gY29uc3QgbW9uc3RlciA9IHJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgLy8gaWYgKG1vbnN0ZXIuZ29sZERyb3ApIG1vbnN0ZXJzLnNldChUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCBtb25zdGVyLmVsZW1lbnRzKTtcbiAgfVxuXG4gIHByb2Nlc3NJdGVtVXNlKGhpdGJveDogSGl0Ym94LCByZXExOiBSZXF1aXJlbWVudCwgaXRlbTogSXRlbSwgdXNlOiBJdGVtVXNlKSB7XG4gICAgLy8gdGhpcyBzaG91bGQgaGFuZGxlIG1vc3QgdHJhZGUtaW5zIGF1dG9tYXRpY2FsbHlcbiAgICBoaXRib3ggPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0KSk7XG4gICAgY29uc3QgcmVxMiA9IFtbKDB4MjAwIHwgaXRlbS5pZCkgYXMgQ29uZGl0aW9uXV07IC8vIHJlcXVpcmVzIHRoZSBpdGVtLlxuICAgIC8vIGNoZWNrIGZvciBraXJpc2EgcGxhbnQsIGFkZCBjaGFuZ2UgYXMgYSByZXF1aXJlbWVudC5cbiAgICBpZiAoaXRlbS5pZCA9PT0gdGhpcy5yb20ucHJnWzB4M2Q0YjVdICsgMHgxYykge1xuICAgICAgcmVxMlswXS5wdXNoKHRoaXMucm9tLmZsYWdzLkNoYW5nZS5jKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk1lZGljYWxIZXJiKSB7IC8vIGRvbHBoaW5cbiAgICAgIHJlcTJbMF1bMF0gPSB0aGlzLnJvbS5mbGFncy5CdXlIZWFsaW5nLmM7IC8vIG5vdGU6IG5vIG90aGVyIGhlYWxpbmcgaXRlbXNcbiAgICB9XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXExLCByZXEyKTtcbiAgICAvLyBzZXQgYW55IGZsYWdzXG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIHJlcSwgdXNlLmZsYWdzKTtcbiAgICAvLyBoYW5kbGUgYW55IGV4dHJhIGFjdGlvbnNcbiAgICBzd2l0Y2ggKHVzZS5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDEwOlxuICAgICAgICAvLyB1c2Uga2V5XG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIHJlcSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6IGNhc2UgMHgxYzpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIGl0ZW0gSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxLCBpdGVtLmlkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDI6XG4gICAgICAgIC8vIGRvbHBoaW4gZGVmZXJzIHRvIGRpYWxvZyBhY3Rpb24gMTEgKGFuZCAwZCB0byBzd2ltIGF3YXkpXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAweDEwMCB8IHRoaXMucm9tLm5wY3NbdXNlLndhbnQgJiAweGZmXS5kYXRhWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzS2V5VXNlKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gc2V0IHRoZSBjdXJyZW50IHNjcmVlbidzIGZsYWcgaWYgdGhlIGNvbmRpdGlvbnMgYXJlIG1ldC4uLlxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIG9ubHkgYSBzaW5nbGUgc2NyZWVuLlxuICAgIGNvbnN0IFtzY3JlZW4sIC4uLnJlc3RdID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiBTY3JlZW5JZC5mcm9tKHQpKSk7XG4gICAgaWYgKHNjcmVlbiA9PSBudWxsIHx8IHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG9uZSBzY3JlZW5gKTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tzY3JlZW4gPj4+IDhdO1xuICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IChzY3JlZW4gJiAweGZmKSk7XG4gICAgaWYgKGZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBmbGFnIG9uIHNjcmVlbmApO1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtmbGFnLmZsYWddKTtcbiAgfVxuXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuUmFnZSkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBSYWdlLiAgRmlndXJlIG91dCB3aGF0IGhlIHdhbnRzIGZyb20gdGhlIGRpYWxvZy5cbiAgICAgIGNvbnN0IHVua25vd25Td29yZCA9IHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQucmFuZG9taXplVHJhZGVzKCk7XG4gICAgICBpZiAodW5rbm93blN3b3JkKSByZXR1cm4gdGhpcy5yb20uZmxhZ3MuU3dvcmQucjsgLy8gYW55IHN3b3JkIG1pZ2h0IGRvLlxuICAgICAgcmV0dXJuIFtbdGhpcy5yb20ubnBjcy5SYWdlLmRpYWxvZygpWzBdLmNvbmRpdGlvbiBhcyBDb25kaXRpb25dXTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCByID0gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgfHxcbiAgICAgICAgIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHIuYWRkQWxsKHRoaXMucm9tLmZsYWdzLlN3b3JkLnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgci5hZGRBbGwodGhpcy5zd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENhbid0IGFjdHVhbGx5IGtpbGwgdGhlIGJvc3MgaWYgaXQgZG9lc24ndCBzcGF3bi5cbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW10gPSBbXTtcbiAgICBpZiAoYm9zcy5ucGMgIT0gbnVsbCAmJiBib3NzLmxvY2F0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uID0gYm9zcy5ucGMuc3Bhd25zKHRoaXMucm9tLmxvY2F0aW9uc1tib3NzLmxvY2F0aW9uXSk7XG4gICAgICBleHRyYS5wdXNoKC4uLnRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9uKVswXSk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuSW5zZWN0KSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkluc2VjdEZsdXRlLmMsIHRoaXMucm9tLmZsYWdzLkdhc01hc2suYyk7XG4gICAgfSBlbHNlIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuQm93T2ZUcnV0aC5jKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuUmVmcmVzaC5jKTtcbiAgICB9XG4gICAgci5yZXN0cmljdChbZXh0cmFdKTtcbiAgICByZXR1cm4gUmVxdWlyZW1lbnQuZnJlZXplKHIpO1xuICB9XG5cbiAgc3dvcmRSZXF1aXJlbWVudChlbGVtZW50OiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gICAgY29uc3Qgc3dvcmQgPSBbXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZkZpcmUsXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAxKSByZXR1cm4gc3dvcmQucjtcbiAgICBjb25zdCBwb3dlcnMgPSBbXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuVG9ybmFkb0JyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZGaXJlLCB0aGlzLnJvbS5mbGFncy5GbGFtZUJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuQmxpenphcmRCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mVGh1bmRlciwgdGhpcy5yb20uZmxhZ3MuU3Rvcm1CcmFjZWxldF0sXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDMpIHJldHVybiBhbmQoc3dvcmQsIC4uLnBvd2Vycyk7XG4gICAgcmV0dXJuIHBvd2Vycy5tYXAocG93ZXIgPT4gW3N3b3JkLmMsIHBvd2VyLmNdKTtcbiAgfVxuXG4gIGl0ZW1HcmFudChpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0aGlzLnJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMpIHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaXRlbSBncmFudCAke2lkLnRvU3RyaW5nKDE2KX1gKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3IgYWxsIG9mIHRoZSBmbGFncyBiZWluZyBtZXQuICovXG4gIGZpbHRlclJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IGNvbmRzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA8IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvbmRzXTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3Igc29tZSBmbGFnIG5vdCBiZWluZyBtZXQuICovXG4gIGZpbHRlckFudGlSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCByZXEgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnID49IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5mbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIHJlcS5wdXNoKFtmLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVxO1xuICB9XG5cbiAgZmxhZyhmbGFnOiBudW1iZXIpOiBGbGFnfHVuZGVmaW5lZCB7XG4gICAgLy9jb25zdCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgIGNvbnN0IHVuc2lnbmVkID0gZmxhZzsgIC8vIFRPRE8gLSBzaG91bGQgd2UgYXV0by1pbnZlcnQ/XG4gICAgY29uc3QgZiA9IHRoaXMucm9tLmZsYWdzW3Vuc2lnbmVkXTtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmFsaWFzZXMuZ2V0KGYpID8/IGY7XG4gICAgcmV0dXJuIG1hcHBlZDtcbiAgfVxuXG4gIGVudHJhbmNlKGxvY2F0aW9uOiBMb2NhdGlvbnxudW1iZXIsIGluZGV4ID0gMCk6IFRpbGVJZCB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ251bWJlcicpIGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICByZXR1cm4gdGhpcy50aWxlcy5maW5kKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBsb2NhdGlvbi5lbnRyYW5jZXNbaW5kZXhdKSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh3YWxsOiBXYWxsVHlwZSk6IG51bWJlciB7XG4gICAgc3dpdGNoICh3YWxsKSB7XG4gICAgICBjYXNlIFdhbGxUeXBlLldJTkQ6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha1N0b25lLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5GSVJFOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJY2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLldBVEVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuRm9ybUJyaWRnZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuVEhVTkRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSXJvbi5pZDtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgYmFkIHdhbGwgdHlwZTogJHt3YWxsfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhbmQoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gIHJldHVybiBbZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBmLmlkIGFzIENvbmRpdGlvbildO1xufVxuXG5mdW5jdGlvbiBvciguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgcmV0dXJuIGZsYWdzLm1hcCgoZjogRmxhZykgPT4gW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG59XG5cbi8vIEFuIGludGVyZXN0aW5nIHdheSB0byB0cmFjayB0ZXJyYWluIGNvbWJpbmF0aW9ucyBpcyB3aXRoIHByaW1lcy5cbi8vIElmIHdlIGhhdmUgTiBlbGVtZW50cyB3ZSBjYW4gbGFiZWwgZWFjaCBhdG9tIHdpdGggYSBwcmltZSBhbmRcbi8vIHRoZW4gbGFiZWwgYXJiaXRyYXJ5IGNvbWJpbmF0aW9ucyB3aXRoIHRoZSBwcm9kdWN0LiAgRm9yIE49MTAwMFxuLy8gdGhlIGhpZ2hlc3QgbnVtYmVyIGlzIDgwMDAsIHNvIHRoYXQgaXQgY29udHJpYnV0ZXMgYWJvdXQgMTMgYml0c1xuLy8gdG8gdGhlIHByb2R1Y3QsIG1lYW5pbmcgd2UgY2FuIHN0b3JlIGNvbWJpbmF0aW9ucyBvZiA0IHNhZmVseVxuLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gYmlnaW50LiAgVGhpcyBpcyBpbmhlcmVudGx5IG9yZGVyLWluZGVwZW5kZW50LlxuLy8gSWYgdGhlIHJhcmVyIG9uZXMgYXJlIGhpZ2hlciwgd2UgY2FuIGZpdCBzaWduaWZpY2FudGx5IG1vcmUgdGhhbiA0LlxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyBEZWJ1ZyBpbnRlcmZhY2UuXG5leHBvcnQgaW50ZXJmYWNlIEFyZWFEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xuICBjaGVja3M6IEFycmF5PFtGbGFnLCBSZXF1aXJlbWVudF0+O1xuICB0ZXJyYWluOiBUZXJyYWluO1xuICBsb2NhdGlvbnM6IFNldDxudW1iZXI+O1xuICByb3V0ZXM6IFJlcXVpcmVtZW50LkZyb3plbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZURhdGEge1xuICBhcmVhOiBBcmVhRGF0YTtcbiAgZXhpdD86IFRpbGVJZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYXM6IFNldDxBcmVhRGF0YT47XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV29ybGREYXRhIHtcbiAgdGlsZXM6IE1hcDxUaWxlSWQsIFRpbGVEYXRhPjtcbiAgYXJlYXM6IEFyZWFEYXRhW107XG4gIGxvY2F0aW9uczogTG9jYXRpb25EYXRhW107XG59XG4iXX0=