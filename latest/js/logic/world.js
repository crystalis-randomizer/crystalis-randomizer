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
import { Monster } from '../rom/monster.js';
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
        this.addCheck([start], or(SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder), [Sword.id]);
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
    processMonster(location, spawn) {
        const monster = this.rom.objects[spawn.monsterId];
        if (!(monster instanceof Monster))
            return;
        if (!(monster.goldDrop))
            return;
        const { Money, Sword, SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder, } = this.rom.flags;
        const hitbox = [TileId.from(location, spawn)];
        if (!this.flagset.guaranteeMatchingSword()) {
            this.addCheck(hitbox, Sword.r, [Money.id]);
            return;
        }
        const swords = [SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder]
            .filter((_, i) => monster.elements & (1 << i));
        this.addCheck(hitbox, or(...swords), [Money.id]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQW1FaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVB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LENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDUCxFQUFFLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQzFELENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBELElBQUksSUFBSSxDQUFD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LENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQUUsU0FBUztZQUMvRCxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2xEO0lBQ0gsQ0FBQztJQUVELHVCQUF1QixDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsR0FBUTtRQUV0RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFL0IsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDL0Q7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFL0IsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUNwQixNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztTQUMvRDtJQUNILENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFrQjs7UUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7UUFDNUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVksQ0FBQztRQUM1QyxNQUFNLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDO1FBQzlDLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUduQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDbEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFhLENBQUMsQ0FBQzthQUN2RTtpQkFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDakQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQ3JEO1NBQ0Y7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUV0RSxNQUFNLFVBQVUsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ2xDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDekUsT0FBTyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRSxDQUFDLENBQUM7UUFHRixNQUFNLFdBQVcsR0FBRyxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsT0FBZ0IsRUFBRSxFQUFFO1lBRXRFLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ3hCLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxJQUFJO2dCQUFFLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDO1lBQ25ELElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hELE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzVCO1lBRUQsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFO2dCQUN0RCxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUM1QjtZQUNELElBQUksT0FBTztnQkFBRSxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUN4QyxJQUFJLENBQUMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFO2dCQU0zRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ2xCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDZixPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxFQUFFO29CQUN6QyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxNQUFNLEVBQUUsQ0FBQztpQkFDVjtnQkFDRCxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztpQkFDM0I7cUJBQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFO29CQUNyQixPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQztpQkFDM0I7cUJBQU0sSUFBSSxNQUFNLEdBQUcsRUFBRSxFQUFFO29CQUN0QixPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQztpQkFDM0I7YUFDRjtZQUNELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDO1FBRUYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6RCxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDdEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sTUFBTSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQy9CLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2pDLE1BQU0sSUFBSSxHQUNOLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FDMUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQywwQ0FBRSxJQUFJLENBQUM7Z0JBQ3hELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUMsQ0FBQztnQkFDL0QsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQzVCLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNsRDtnQkFDRCxNQUFNLEtBQUssZUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFLLENBQUMsMENBQUUsS0FBSyxtQ0FBSSxFQUFFLENBQUM7Z0JBQ3hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQzdCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUN0QyxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUUzQixJQUFJLEtBQUssQ0FBQyxVQUFVLElBQUksSUFBSSxHQUFHLElBQUksRUFBRTt3QkFDbkMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ2pDO29CQUNELE1BQU0sT0FBTyxHQUNULFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztvQkFDN0QsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBRWpELElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUk7d0JBQ2hELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRTt3QkFDM0QsTUFBTSxTQUFTLEdBQ1gsV0FBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUN4QyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBRW5DLElBQUksU0FBUyxFQUFFOzRCQUliLE9BQU87Z0NBQ0gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUNQLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3ZCLFNBQVMsQ0FBQyxDQUFDO3lCQUN6QztxQkFDRjtvQkFDRCxJQUFJLE9BQU87d0JBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUM5QzthQUNGO1NBQ0Y7UUFHRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDakMsTUFBTSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsR0FBRyxJQUFJLENBQUM7WUFDOUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFHekMsSUFBSSxFQUFVLENBQUM7WUFDZixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRTtnQkFDckIsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksUUFBUSxFQUFFO29CQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2lCQUNqRTthQUNGO2lCQUFNO2dCQUNMLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUMvRDtZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMxQjtJQUNILENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxRQUFrQjtRQUN0QyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDbkMsSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNsQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDbkM7aUJBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFO2dCQUM1QixJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUN0QztpQkFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUVoRCxJQUFJLENBQUMsYUFBYSxDQUNkLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3ZDO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWtCLEVBQUUsS0FBWTtRQVk3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU87WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFMUUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNqRSxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdkUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUMsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFN0MsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNoQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ25CO1NBQ0Y7UUFDRCxJQUFJLE1BQU0sQ0FBQyxNQUFNO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRS9ELFFBQVEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDOUIsS0FBSyxJQUFJO2dCQUVQLElBQUksT0FBTyxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUU7b0JBRTNELE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2pEO3FCQUFNLElBQUksT0FBTyxDQUFDLEVBQUUsS0FBSyxJQUFJO29CQUNuQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUU7b0JBQ2xDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFO29CQUU5QyxNQUFNLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQ04sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUNsQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztpQkFDaEU7Z0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUN0RSxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUVQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDL0QsTUFBTTtZQUVSLEtBQUssSUFBSSxDQUFDO1lBQUMsS0FBSyxJQUFJLENBQUM7WUFBQyxLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSSxDQUFDO1lBQUMsS0FBSyxJQUFJO2dCQUVuRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzFELE1BQU07WUFFUixLQUFLLElBQUksQ0FBQyxDQUFDO2dCQUVULE1BQU0sR0FBRyxHQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztvQkFDaEMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0QsWUFBWSxDQUFDO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUM5QyxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7Z0JBQy9DLE1BQU07YUFDUDtZQUVELEtBQUssSUFBSTtnQkFFUCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFDcEQsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDOUMsTUFBTTtZQUVSLEtBQUssSUFBSTtnQkFLUCxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRTtvQkFPekQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO2lCQUMzRDtnQkFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUMzRCxNQUFNO1NBQ1Q7UUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUM5QixXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNsRDtJQUNILENBQUM7SUFFRCxVQUFVLENBQUMsUUFBa0IsRUFBRSxLQUFZOztRQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEUsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFckQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFNMUMsSUFBSSxNQUFNLEdBQ04sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLG1DQUFJLElBQUksQ0FBQyxDQUFDO1FBRTNFLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztTQUM3QztRQUVELElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFO1lBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztTQUN6RDtRQUVELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO1lBQzlELElBQUksT0FBTyxDQUFDO1lBQ1osT0FBTyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2RCxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBRTlCLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFJakUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRTtvQkFBRSxPQUFPLEdBQUcsU0FBUyxDQUFDO2FBQ3hEO2lCQUFNLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO2dCQUs5RCxPQUFPLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN2RTtpQkFBTSxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUU7Z0JBQzdDLE9BQU8sR0FBRyxTQUFTLENBQUM7YUFDckI7WUFFRCxJQUFJLE9BQU87Z0JBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMzRTtRQUdELElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN2QyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNoRDtRQUdELElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7WUFBRSxPQUFPO1FBQ3RDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFHekIsS0FBSyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEMsSUFBSSxFQUFDLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxLQUFLLENBQUMsS0FBSyxDQUFBO2dCQUFFLFNBQVM7WUFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUM7U0FDL0I7UUFHRCxNQUFNLE1BQU0sZUFDUixHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLG1DQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1DQUFJLEVBQUUsQ0FBQztRQUN4RSxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRTtZQUV0QixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFDckIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbEMsSUFBSSxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBZSxDQUFDLENBQUM7YUFDNUI7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkMsSUFBSSxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDbkIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBZSxDQUFDLENBQUM7YUFDaEM7U0FDRjtJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsTUFBYyxFQUFFLEdBQVEsRUFDeEIsR0FBeUIsRUFBRSxNQUFtQjtRQUMxRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBELE1BQU0sSUFBSSxHQUFHLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFDekMsUUFBUSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUM3QixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxNQUFNO1lBUVIsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEUsTUFBTTtZQUVSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsWUFBWSxDQUNiLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzVELE1BQU07WUFFUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUQsTUFBTTtZQUVSLEtBQUssSUFBSSxDQUFDO1lBQ1YsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzVELE1BQU07WUFFUixLQUFLLElBQUk7Z0JBRVAsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekIsSUFBSSxJQUFJLEtBQUssSUFBSTtvQkFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hFLE1BQU07WUFFUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FDYixNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3RFLE1BQU07WUFFUixLQUFLLElBQUk7Z0JBRVAsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvRCxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUdQLE1BQU07U0FDVDtJQUlILENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxRQUFrQjtRQUN4QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDekQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDekIsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDbEQ7SUFDSCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsTUFBYyxFQUFFLFFBQWtCLEVBQUUsR0FBZ0I7UUFTcEUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFO1lBQUUsT0FBTztRQUM5QyxNQUFNLEtBQUssR0FBa0IsRUFBRSxDQUFDO1FBQ2hDLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQy9DLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDNUQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNO2FBQ1A7U0FDRjtRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUNOLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBTzlFLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWSxFQUFFLFFBQWtCLEVBQUUsWUFBeUI7UUFHcEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZDLElBQUksRUFBRSxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDckUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUNsRCxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUMzQyxJQUFJLFFBQVEsQ0FBQztRQUNiLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtZQUNqQyxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFBRSxRQUFRLEdBQUcsSUFBSSxDQUFDO1NBQ3JEO1FBQ0QsSUFBSSxDQUFDLFFBQVE7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFFM0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQztRQUNyQixPQUFPLElBQUksRUFBRTtZQUNYLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEMsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNkLE1BQU0sSUFBSSxHQUFZO29CQUNwQixLQUFLLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7b0JBQ3ZDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDaEMsQ0FBQztnQkFFRixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFHdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQztnQkFDOUQsT0FBTzthQUNSO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsTUFBYyxFQUFFLEdBQWdCLEVBQUUsT0FBZTtRQUNsRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ25FO1FBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQztRQUNwQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUNqQixFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxVQUFVLENBQUMsTUFBYyxFQUFFLE9BQWdCO1FBQ3pDLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFO1lBQ3pCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxJQUFJLElBQUk7Z0JBQUUsU0FBUztZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDL0Q7SUFDSCxDQUFDO0lBRUQsUUFBUSxDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUFFLE1BQWdCO1FBQ2pFLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7WUFBRSxPQUFPO1FBQzlDLE1BQU0sS0FBSyxHQUFHLEVBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFDLENBQUM7UUFDckUsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLEVBQUU7WUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFBRSxTQUFTO1lBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNsQztJQUNILENBQUM7SUFFRCxZQUFZLENBQUMsTUFBYyxFQUFFLFdBQXdCLEVBQ3hDLEtBQWEsRUFBRSxJQUFjO1FBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsTUFBTSxDQUFDO1FBQzVCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVwQyxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUNqRSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZO1lBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUN0RCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjO1lBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUN4RCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNoRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELGlCQUFpQixDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUFFLEtBQWU7UUFDekUsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsSUFBSSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDbkI7U0FDRjtRQUNELElBQUksTUFBTSxDQUFDLE1BQU07WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELGdCQUFnQixDQUFDLENBQVM7UUFDeEIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNyQixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDL0IsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQUUsT0FBTyxFQUFFLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFBRSxPQUFPLEVBQUUsQ0FBQztTQUNwQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRCxVQUFVLENBQUMsQ0FBUztRQUNsQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsY0FBYyxDQUFDLENBQVM7O1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLG1DQUFJLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsVUFBVSxDQUFDLENBQVM7UUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTlDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzFFLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckUsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxXQUFXLENBQUMsUUFBa0IsRUFBRSxLQUFZO1FBRzFDLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxJQUFJO1lBQUUsT0FBTztRQUNuRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQztRQUNqQyxNQUFNLElBQUksR0FDTixNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQztRQUk1QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBVyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFjLEVBQUUsSUFBVSxFQUMxQixlQUE0QixXQUFXLENBQUMsSUFBSTtRQUN2RCxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkUsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDeEUsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM1QzthQUFNO1lBQ0wsSUFBSSxDQUFDLFlBQVksQ0FDYixNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztTQUM5RDtJQUNILENBQUM7SUFFRCxZQUFZLENBQUMsUUFBa0IsRUFBRSxLQUFZO1FBRTNDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUk7WUFBRSxPQUFPO1FBQzdDLE1BQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzlCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QyxJQUFJLE1BQU0sSUFBSSxJQUFJO1lBQUUsT0FBTztRQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsTUFBTSxDQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMzRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUNoRCxJQUFJLEVBQUUsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUFrQixFQUFFLEtBQVk7UUFNN0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxPQUFPLENBQUM7WUFBRSxPQUFPO1FBQzFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFBRSxPQUFPO1FBQ2hDLE1BQU0sRUFDSixLQUFLLEVBQ0wsS0FBSyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsR0FDOUQsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQixNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsT0FBTztTQUNSO1FBQ0QsTUFBTSxNQUFNLEdBQ1IsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUM7YUFDbkQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELGNBQWMsQ0FBQyxNQUFjLEVBQUUsSUFBaUIsRUFBRSxJQUFVLEVBQUUsR0FBWTtRQUV4RSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSx3QkFBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLG1DQUFJLENBQUMsR0FBQSxDQUFDLENBQUMsQ0FBQztRQUN0RSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBYyxDQUFDLENBQUMsQ0FBQztRQUVoRCxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxFQUFFO1lBQzVDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDO1FBQ0QsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1NBQzFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRS9DLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDMUIsS0FBSyxJQUFJO2dCQUVQLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxNQUFNO1lBQ1IsS0FBSyxJQUFJLENBQUM7WUFBQyxLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSSxDQUFDO1lBQUMsS0FBSyxJQUFJLENBQUM7WUFBQyxLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSTtnQkFFOUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUVQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFDWCxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQzlDLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDL0MsTUFBTTtTQUNUO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFjLEVBQUUsR0FBZ0I7UUFHNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU07WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDMUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksSUFBSSxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVU7UUFFekIsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFO1lBRWpDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwRSxJQUFJLFlBQVk7Z0JBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFzQixDQUFDLENBQUMsQ0FBQztTQUNsRTtRQUNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDdkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUU7WUFDbEQsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEVBQUU7WUFDMUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEM7YUFBTTtZQUNMLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFCLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDcEU7U0FDRjtRQUVELE1BQU0sS0FBSyxHQUFnQixFQUFFLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRTtZQUM3QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMxRSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7UUFDRCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDbkMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNwRTthQUFNLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQ25DLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxPQUFlLEVBQUUsS0FBYTtRQUM3QyxNQUFNLEtBQUssR0FBRztZQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjO1NBQzNELENBQUMsT0FBTyxDQUFDLENBQUM7UUFDWCxJQUFJLEtBQUssS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHO1lBQ2IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO1lBQzNELENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUN6RCxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztZQUM3RCxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7U0FDN0QsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNYLElBQUksS0FBSyxLQUFLLENBQUM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUM5QyxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFNBQVMsQ0FBQyxFQUFVO1FBQ2xCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7WUFDekQsSUFBSSxHQUFHLEtBQUssRUFBRTtnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUM5QjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFHRCxrQkFBa0IsQ0FBQyxLQUFlOztRQUNoQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDeEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO2dCQUNaLE1BQU0sS0FBSyxTQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsMENBQUUsS0FBSyxDQUFDO2dCQUN0QyxJQUFJLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxVQUFVO29CQUFFLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQzthQUNsRDtpQkFBTTtnQkFDTCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixJQUFJLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxLQUFLLENBQUMsV0FBVztvQkFBRSxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxLQUFLO29CQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQWUsQ0FBQyxDQUFDO2FBQ25EO1NBQ0Y7UUFDRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUdELHNCQUFzQixDQUFDLEtBQWU7O1FBQ3BDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtnQkFDYixNQUFNLEtBQUssU0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLDBDQUFFLEtBQUssQ0FBQztnQkFDdEMsSUFBSSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsV0FBVztvQkFBRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUM7YUFDakQ7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQixJQUFJLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxLQUFLLENBQUMsVUFBVTtvQkFBRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxLQUFLO29CQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7O1FBRWYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxTQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQ0FBSSxDQUFDLENBQUM7UUFDeEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVELFFBQVEsQ0FBQyxRQUF5QixFQUFFLEtBQUssR0FBRyxDQUFDO1FBQzNDLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUTtZQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBYztRQUMzQixRQUFRLElBQUksRUFBRTtZQUNaLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN4RCxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEQsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3pELEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztDQUNGO0FBRUQsU0FBUyxHQUFHLENBQUMsR0FBRyxLQUFhO0lBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFhO0lBQzFCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBVUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcmVhfSBmcm9tICcuLi9zcG9pbGVyL2FyZWEuanMnO1xuaW1wb3J0IHtkaWV9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0ZsYWcsIExvZ2ljfSBmcm9tICcuLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtJdGVtLCBJdGVtVXNlfSBmcm9tICcuLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TG9jYWxEaWFsb2csIE5wY30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleCwgc2VxfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcCwgTGFiZWxlZFNldCwgaXRlcnMsIHNwcmVhZH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge0Rpcn0gZnJvbSAnLi9kaXIuanMnO1xuaW1wb3J0IHtJdGVtSW5mbywgTG9jYXRpb25MaXN0LCBTbG90SW5mb30gZnJvbSAnLi9ncmFwaC5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9oaXRib3guanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50LCBSb3V0ZX0gZnJvbSAnLi9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1NjcmVlbklkfSBmcm9tICcuL3NjcmVlbmlkLmpzJztcbmltcG9ydCB7VGVycmFpbiwgVGVycmFpbnN9IGZyb20gJy4vdGVycmFpbi5qcyc7XG5pbXBvcnQge1RpbGVJZH0gZnJvbSAnLi90aWxlaWQuanMnO1xuaW1wb3J0IHtUaWxlUGFpcn0gZnJvbSAnLi90aWxlcGFpci5qcyc7XG5pbXBvcnQge1dhbGxUeXBlfSBmcm9tICcuL3dhbGx0eXBlLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuLi9yb20vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbmludGVyZmFjZSBDaGVjayB7XG4gIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudDtcbiAgY2hlY2tzOiBudW1iZXJbXTtcbn1cblxuLy8gQmFzaWMgYWxnb3JpdGhtOlxuLy8gIDEuIGZpbGwgdGVycmFpbnMgZnJvbSBtYXBzXG4vLyAgMi4gbW9kaWZ5IHRlcnJhaW5zIGJhc2VkIG9uIG5wY3MsIHRyaWdnZXJzLCBib3NzZXMsIGV0Y1xuLy8gIDIuIGZpbGwgYWxsRXhpdHNcbi8vICAzLiBzdGFydCB1bmlvbmZpbmRcbi8vICA0LiBmaWxsIC4uLj9cblxuLyoqIFN0b3JlcyBhbGwgdGhlIHJlbGV2YW50IGluZm9ybWF0aW9uIGFib3V0IHRoZSB3b3JsZCdzIGxvZ2ljLiAqL1xuZXhwb3J0IGNsYXNzIFdvcmxkIHtcblxuICAvKiogQnVpbGRzIGFuZCBjYWNoZXMgVGVycmFpbiBvYmplY3RzLiAqL1xuICByZWFkb25seSB0ZXJyYWluRmFjdG9yeSA9IG5ldyBUZXJyYWlucyh0aGlzLnJvbSk7XG5cbiAgLyoqIFRlcnJhaW5zIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5zID0gbmV3IE1hcDxUaWxlSWQsIFRlcnJhaW4+KCk7XG5cbiAgLyoqIENoZWNrcyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSBjaGVja3MgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFNldDxDaGVjaz4+KCgpID0+IG5ldyBTZXQoKSk7XG5cbiAgLyoqIFNsb3QgaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IHNsb3RzID0gbmV3IE1hcDxudW1iZXIsIFNsb3RJbmZvPigpO1xuICAvKiogSXRlbSBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgaXRlbXMgPSBuZXcgTWFwPG51bWJlciwgSXRlbUluZm8+KCk7XG5cbiAgLyoqIEZsYWdzIHRoYXQgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgZGlyZWN0IGFsaWFzZXMgZm9yIGxvZ2ljLiAqL1xuICByZWFkb25seSBhbGlhc2VzOiBNYXA8RmxhZywgRmxhZz47XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBpdGVtdXNlIHRyaWdnZXJzIHRvIHRoZSBpdGVtdXNlIHRoYXQgd2FudHMgaXQuICovXG4gIHJlYWRvbmx5IGl0ZW1Vc2VzID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBbSXRlbSwgSXRlbVVzZV1bXT4oKCkgPT4gW10pO1xuXG4gIC8qKiBSYXcgbWFwcGluZyBvZiBleGl0cywgd2l0aG91dCBjYW5vbmljYWxpemluZy4gKi9cbiAgcmVhZG9ubHkgZXhpdHMgPSBuZXcgTWFwPFRpbGVJZCwgVGlsZUlkPigpO1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gZXhpdHMgdG8gZW50cmFuY2VzLiAgVGlsZVBhaXIgaXMgY2Fub25pY2FsaXplZC4gKi9cbiAgcmVhZG9ubHkgZXhpdFNldCA9IG5ldyBTZXQ8VGlsZVBhaXI+KCk7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBUaWxlSWRzIHdpdGggc2VhbWxlc3MgZXhpdHMuICBUaGlzIGlzIHVzZWQgdG8gZW5zdXJlIHRoZVxuICAgKiBsb2dpYyB1bmRlcnN0YW5kcyB0aGF0IHRoZSBwbGF5ZXIgY2FuJ3Qgd2FsayBhY3Jvc3MgYW4gZXhpdCB0aWxlXG4gICAqIHdpdGhvdXQgY2hhbmdpbmcgbG9jYXRpb25zIChwcmltYXJpbHkgZm9yIGRpc2FibGluZyB0ZWxlcG9ydFxuICAgKiBza2lwKS5cbiAgICovXG4gIHJlYWRvbmx5IHNlYW1sZXNzRXhpdHMgPSBuZXcgU2V0PFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogVW5pb25maW5kIG9mIGNvbm5lY3RlZCBjb21wb25lbnRzIG9mIHRpbGVzLiAgTm90ZSB0aGF0IGFsbCB0aGVcbiAgICogYWJvdmUgcHJvcGVydGllcyBjYW4gYmUgYnVpbHQgdXAgaW4gcGFyYWxsZWwsIGJ1dCB0aGUgdW5pb25maW5kXG4gICAqIGNhbm5vdCBiZSBzdGFydGVkIHVudGlsIGFmdGVyIGFsbCB0ZXJyYWlucyBhbmQgZXhpdHMgYXJlXG4gICAqIHJlZ2lzdGVyZWQsIHNpbmNlIHdlIHNwZWNpZmljYWxseSBuZWVkIHRvICpub3QqIHVuaW9uIGNlcnRhaW5cbiAgICogbmVpZ2hib3JzLlxuICAgKi9cbiAgcmVhZG9ubHkgdGlsZXMgPSBuZXcgVW5pb25GaW5kPFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIFRpbGVQYWlycyBvZiBjYW5vbmljYWwgdW5pb25maW5kIHJlcHJlc2VudGF0aXZlIFRpbGVJZHMgdG9cbiAgICogYSBiaXRzZXQgb2YgbmVpZ2hib3IgZGlyZWN0aW9ucy4gIFdlIG9ubHkgbmVlZCB0byB3b3JyeSBhYm91dFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyBiZWNhdXNlIGFsbCBUaWxlSWRzIGhhdmUgdGhlIHNhbWUgdGVycmFpbi5cbiAgICogV2Ugd2lsbCBhZGQgYSByb3V0ZSBmb3IgZWFjaCBkaXJlY3Rpb24gd2l0aCB1bmlxdWUgcmVxdWlyZW1lbnRzLlxuICAgKi9cbiAgcmVhZG9ubHkgbmVpZ2hib3JzID0gbmV3IERlZmF1bHRNYXA8VGlsZVBhaXIsIG51bWJlcj4oKCkgPT4gMCk7XG5cbiAgLyoqIFJlcXVpcmVtZW50IGJ1aWxkZXIgZm9yIHJlYWNoaW5nIGVhY2ggY2Fub25pY2FsIFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgcm91dGVzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKCkgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKSk7XG5cbiAgLyoqIFJvdXRlcyBvcmlnaW5hdGluZyBmcm9tIGVhY2ggY2Fub25pY2FsIHRpbGUuICovXG4gIHJlYWRvbmx5IHJvdXRlRWRnZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBMYWJlbGVkU2V0PFJvdXRlPj4oKCkgPT4gbmV3IExhYmVsZWRTZXQoKSk7XG5cbiAgLyoqIExvY2F0aW9uIGxpc3Q6IHRoaXMgaXMgdGhlIHJlc3VsdCBvZiBjb21iaW5pbmcgcm91dGVzIHdpdGggY2hlY2tzLiAqL1xuICByZWFkb25seSByZXF1aXJlbWVudE1hcCA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxDb25kaXRpb24sIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgIChjOiBDb25kaXRpb24pID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKGMpKTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSwgcmVhZG9ubHkgZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgdHJhY2tlciA9IGZhbHNlKSB7XG4gICAgLy8gQnVpbGQgaXRlbVVzZXNcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZSBvZiBpdGVtLml0ZW1Vc2VEYXRhKSB7XG4gICAgICAgIGlmICh1c2Uua2luZCA9PT0gJ2V4cGVjdCcpIHtcbiAgICAgICAgICB0aGlzLml0ZW1Vc2VzLmdldCh1c2Uud2FudCkucHVzaChbaXRlbSwgdXNlXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodXNlLmtpbmQgPT09ICdsb2NhdGlvbicpIHtcbiAgICAgICAgICB0aGlzLml0ZW1Vc2VzLmdldCh+dXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ1aWxkIGFsaWFzZXNcbiAgICB0aGlzLmFsaWFzZXMgPSBuZXcgTWFwKFtcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlQWthaGFuYSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVNvbGRpZXIsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTdG9tLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlV29tYW4sIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5QYXJhbHl6ZWRLZW5zdUluRGFuY2VIYWxsLCByb20uZmxhZ3MuUGFyYWx5c2lzXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJblRhdmVybiwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgXSk7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIGxvY2F0aW9ucyB0byBidWlsZCB1cCBpbmZvIGFib3V0IHRpbGVzLCB0ZXJyYWlucywgY2hlY2tzLlxuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgdGhpcy5wcm9jZXNzTG9jYXRpb24obG9jYXRpb24pO1xuICAgIH1cbiAgICB0aGlzLmFkZEV4dHJhQ2hlY2tzKCk7XG5cbiAgICAvLyBCdWlsZCB1cCB0aGUgVW5pb25GaW5kIGFuZCB0aGUgZXhpdHMgYW5kIG5laWdoYm9ycyBzdHJ1Y3R1cmVzLlxuICAgIHRoaXMudW5pb25OZWlnaGJvcnMoKTtcbiAgICB0aGlzLnJlY29yZEV4aXRzKCk7XG4gICAgdGhpcy5idWlsZE5laWdoYm9ycygpO1xuXG4gICAgLy8gQnVpbGQgdGhlIHJvdXRlcy9lZGdlcy5cbiAgICB0aGlzLmFkZEFsbFJvdXRlcygpO1xuXG4gICAgLy8gQnVpbGQgdGhlIGxvY2F0aW9uIGxpc3QuXG4gICAgdGhpcy5jb25zb2xpZGF0ZUNoZWNrcygpO1xuICAgIHRoaXMuYnVpbGRSZXF1aXJlbWVudE1hcCgpO1xuICB9XG5cbiAgLyoqIEFkZHMgY2hlY2tzIHRoYXQgYXJlIG5vdCBkZXRlY3RhYmxlIGZyb20gZGF0YSB0YWJsZXMuICovXG4gIGFkZEV4dHJhQ2hlY2tzKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGxvY2F0aW9uczoge1xuICAgICAgICBMZWFmX1Rvb2xTaG9wLFxuICAgICAgICBNZXphbWVTaHJpbmUsXG4gICAgICAgIE9hayxcbiAgICAgICAgU2h5cm9uX1Rvb2xTaG9wLFxuICAgICAgfSxcbiAgICAgIGZsYWdzOiB7XG4gICAgICAgIEFibGVUb1JpZGVEb2xwaGluLFxuICAgICAgICBCYWxsT2ZGaXJlLCBCYWxsT2ZUaHVuZGVyLCBCYWxsT2ZXYXRlciwgQmFsbE9mV2luZCxcbiAgICAgICAgQmFycmllciwgQmxpenphcmRCcmFjZWxldCwgQm93T2ZNb29uLCBCb3dPZlN1bixcbiAgICAgICAgQnJlYWtTdG9uZSwgQnJlYWtJY2UsIEJyZWFrSXJvbixcbiAgICAgICAgQnJva2VuU3RhdHVlLCBCdXlIZWFsaW5nLCBCdXlXYXJwLFxuICAgICAgICBDbGltYldhdGVyZmFsbCwgQ2xpbWJTbG9wZTgsIENsaW1iU2xvcGU5LCBDdXJyZW50bHlSaWRpbmdEb2xwaGluLFxuICAgICAgICBGbGlnaHQsIEZsYW1lQnJhY2VsZXQsIEZvcm1CcmlkZ2UsXG4gICAgICAgIEdhc01hc2ssIEdsb3dpbmdMYW1wLFxuICAgICAgICBJbmp1cmVkRG9scGhpbixcbiAgICAgICAgTGVhZGluZ0NoaWxkLCBMZWF0aGVyQm9vdHMsXG4gICAgICAgIE1vbmV5LFxuICAgICAgICBPcGVuZWRDcnlwdCxcbiAgICAgICAgUmFiYml0Qm9vdHMsIFJlZnJlc2gsIFJlcGFpcmVkU3RhdHVlLCBSZXNjdWVkQ2hpbGQsXG4gICAgICAgIFNoZWxsRmx1dGUsIFNoaWVsZFJpbmcsIFNob290aW5nU3RhdHVlLCBTdG9ybUJyYWNlbGV0LFxuICAgICAgICBTd29yZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZUaHVuZGVyLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZXaW5kLFxuICAgICAgICBUb3JuYWRvQnJhY2VsZXQsIFRyYXZlbFN3YW1wLFxuICAgICAgICBXaWxkV2FycCxcbiAgICAgIH0sXG4gICAgICBpdGVtczoge1xuICAgICAgICBNZWRpY2FsSGVyYixcbiAgICAgICAgV2FycEJvb3RzLFxuICAgICAgfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSk7XG4gICAgY29uc3QgZW50ZXJPYWsgPSB0aGlzLmVudHJhbmNlKE9hayk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQm93T2ZNb29uLCBCb3dPZlN1biksIFtPcGVuZWRDcnlwdC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEFibGVUb1JpZGVEb2xwaGluLCBTaGVsbEZsdXRlKSxcbiAgICAgICAgICAgICAgICAgIFtDdXJyZW50bHlSaWRpbmdEb2xwaGluLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbZW50ZXJPYWtdLCBhbmQoTGVhZGluZ0NoaWxkKSwgW1Jlc2N1ZWRDaGlsZC5pZF0pO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtzdGFydF0sIGFuZChHbG93aW5nTGFtcCwgQnJva2VuU3RhdHVlKSxcbiAgICAgICAgICAgICAgICAgICAgICBSZXBhaXJlZFN0YXR1ZS5pZCwge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcblxuICAgIC8vIEFkZCBzaG9wc1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBMZWFmX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBTaHlyb25fVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KV07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gTWVkaWNhbEhlcmIuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eUhlYWxpbmcuaWRdKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSBXYXJwQm9vdHMuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eVdhcnAuaWRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBwc2V1ZG8gZmxhZ3NcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2luZC5yO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mRmlyZS5yO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXYXRlci5yO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gU3dvcmRPZlRodW5kZXIucjtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgY29uc3Qgd2luZDIgPSBvcihCYWxsT2ZXaW5kLCBUb3JuYWRvQnJhY2VsZXQpO1xuICAgICAgY29uc3QgZmlyZTIgPSBvcihCYWxsT2ZGaXJlLCBGbGFtZUJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHdhdGVyMiA9IG9yKEJhbGxPZldhdGVyLCBCbGl6emFyZEJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHRodW5kZXIyID0gb3IoQmFsbE9mVGh1bmRlciwgU3Rvcm1CcmFjZWxldCk7XG4gICAgICBicmVha1N0b25lID0gUmVxdWlyZW1lbnQubWVldChicmVha1N0b25lLCB3aW5kMik7XG4gICAgICBicmVha0ljZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJY2UsIGZpcmUyKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBSZXF1aXJlbWVudC5tZWV0KGZvcm1CcmlkZ2UsIHdhdGVyMik7XG4gICAgICBicmVha0lyb24gPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSXJvbiwgdGh1bmRlcjIpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9XG4gICAgICAgICAgICBSZXF1aXJlbWVudC5vcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogRmxhZyk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChcbiAgICAgICAgICAgICAgKGM6IHJlYWRvbmx5IENvbmRpdGlvbltdKSA9PlxuICAgICAgICAgICAgICAgICAgY1swXSA9PT0gc3dvcmQuYyA/IGMgOiBbc3dvcmQuYywgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKFN3b3JkT2ZXaW5kKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKFN3b3JkT2ZGaXJlKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoU3dvcmRPZldhdGVyKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChTd29yZE9mVGh1bmRlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtTdG9uZSwgW0JyZWFrU3RvbmUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSWNlLCBbQnJlYWtJY2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGZvcm1CcmlkZ2UsIFtGb3JtQnJpZGdlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0lyb24sIFtCcmVha0lyb24uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICBvcihTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXIpLFxuICAgICAgICAgICAgICAgICAgW1N3b3JkLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBGbGlnaHQuciwgW0NsaW1iV2F0ZXJmYWxsLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU5LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBCYXJyaWVyLnIsIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgR2FzTWFzay5yLCBbVHJhdmVsU3dhbXAuaWRdKTtcblxuICAgIGlmICh0aGlzLmZsYWdzZXQubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgTGVhdGhlckJvb3RzLnIsIFtDbGltYlNsb3BlOC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZUdoZXR0b0ZsaWdodCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFxuICAgICAgICBbc3RhcnRdLCBhbmQoQ3VycmVudGx5UmlkaW5nRG9scGhpbiwgUmFiYml0Qm9vdHMpLFxuICAgICAgICBbQ2xpbWJXYXRlcmZhbGwuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5mb2dMYW1wTm90UmVxdWlyZWQoKSkge1xuICAgICAgLy8gbm90IGFjdHVhbGx5IHVzZWQuLi4/XG4gICAgICBjb25zdCByZXF1aXJlSGVhbGVkID0gdGhpcy5mbGFnc2V0LnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVIZWFsZWQgPyBJbmp1cmVkRG9scGhpbi5yIDogW1tdXSxcbiAgICAgICAgICAgICAgICAgICAgW0FibGVUb1JpZGVEb2xwaGluLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUJhcnJpZXIoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgU2hpZWxkUmluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSxcbiAgICAgICAgICAgICAgICAgICAgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0LmFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSkge1xuICAgICAgLy8gTk9URTogd2l0aCBubyBtb25leSwgd2UndmUgZ290IDE2IE1QLCB3aGljaCBpc24ndCBlbm91Z2hcbiAgICAgIC8vIHRvIGdldCBwYXN0IHNldmVuIHN0YXR1ZXMuXG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgRmxpZ2h0LmNdXSwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sIFtUcmF2ZWxTd2FtcC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgUmVxdWlyZW1lbnQuT1BFTiwgW1dpbGRXYXJwLmlkXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEFkZHMgcm91dGVzIHRoYXQgYXJlIG5vdCBkZXRlY3RhYmxlIGZyb20gZGF0YSB0YWJsZXMuICovXG4gIGFkZEV4dHJhUm91dGVzKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGZsYWdzOiB7QnV5V2FycCwgU3dvcmRPZlRodW5kZXIsIFRlbGVwb3J0LCBXaWxkV2FycH0sXG4gICAgICBsb2NhdGlvbnM6IHtNZXphbWVTaHJpbmV9LFxuICAgIH0gPSB0aGlzLnJvbTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCBNZXphbWUgU2hyaW5lLlxuICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2UoTWV6YW1lU2hyaW5lKSwgW10pKTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICBpZiAodGhpcy5mbGFnc2V0LnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgY29uc3Qgd2FycCA9IHRoaXMucm9tLnRvd25XYXJwLnRodW5kZXJTd29yZFdhcnA7XG4gICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTd29yZE9mVGh1bmRlci5jLCBCdXlXYXJwLmNdKSk7XG4gICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTd29yZE9mVGh1bmRlci5jLCBUZWxlcG9ydC5jXSkpO1xuICAgIH1cbiAgICAvLyBXaWxkIHdhcnBcbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIC8vIERvbid0IGNvdW50IGNoYW5uZWwgaW4gbG9naWMgYmVjYXVzZSB5b3UgY2FuJ3QgYWN0dWFsbHkgbW92ZS5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLmlkKSBjb250aW51ZTtcbiAgICAgICAgLy8gTk9URTogc29tZSBlbnRyYW5jZSB0aWxlcyBoYXMgZXh0cmEgcmVxdWlyZW1lbnRzIHRvIGVudGVyIChlLmcuXG4gICAgICAgIC8vIHN3YW1wKSAtIGZpbmQgdGhlbSBhbmQgY29uY2F0ZW50ZS5cbiAgICAgICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlKGxvY2F0aW9uKTtcbiAgICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGVudHJhbmNlKSA/PyBkaWUoJ2JhZCBlbnRyYW5jZScpO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRlcnJhaW4uZW50ZXIpIHtcbiAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShlbnRyYW5jZSwgW1dpbGRXYXJwLmMsIC4uLnJvdXRlXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIENoYW5nZSB0aGUga2V5IG9mIHRoZSBjaGVja3MgbWFwIHRvIG9ubHkgYmUgY2Fub25pY2FsIFRpbGVJZHMuICovXG4gIGNvbnNvbGlkYXRlQ2hlY2tzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrc10gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IHJvb3QgPSB0aGlzLnRpbGVzLmZpbmQodGlsZSk7XG4gICAgICBpZiAodGlsZSA9PT0gcm9vdCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICB0aGlzLmNoZWNrcy5nZXQocm9vdCkuYWRkKGNoZWNrKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tzLmRlbGV0ZSh0aWxlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQXQgdGhpcyBwb2ludCB3ZSBrbm93IHRoYXQgYWxsIG9mIHRoaXMuY2hlY2tzJyBrZXlzIGFyZSBjYW5vbmljYWwuICovXG4gIGJ1aWxkUmVxdWlyZW1lbnRNYXAoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IHJlcSA9IHRoaXMucmVxdWlyZW1lbnRNYXAuZ2V0KGNoZWNrIGFzIENvbmRpdGlvbik7XG4gICAgICAgICAgZm9yIChjb25zdCByMSBvZiByZXF1aXJlbWVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCByMiBvZiB0aGlzLnJvdXRlcy5nZXQodGlsZSkgfHwgW10pIHtcbiAgICAgICAgICAgICAgcmVxLmFkZExpc3QoWy4uLnIxLCAuLi5yMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8gLSBsb2cgdGhlIG1hcD9cbiAgICBpZiAoIURFQlVHKSByZXR1cm47XG4gICAgY29uc3QgbG9nID0gW107XG4gICAgZm9yIChjb25zdCBbY2hlY2ssIHJlcV0gb2YgdGhpcy5yZXF1aXJlbWVudE1hcCkge1xuICAgICAgY29uc3QgbmFtZSA9IChjOiBudW1iZXIpID0+IHRoaXMucm9tLmZsYWdzW2NdLm5hbWU7XG4gICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJlcSkge1xuICAgICAgICBsb2cucHVzaChgJHtuYW1lKGNoZWNrKX06ICR7Wy4uLnJvdXRlXS5tYXAobmFtZSkuam9pbignICYgJyl9XFxuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIGxvZy5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDApO1xuICAgIGNvbnNvbGUubG9nKGxvZy5qb2luKCcnKSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIExvY2F0aW9uTGlzdCBzdHJ1Y3R1cmUgYWZ0ZXIgdGhlIHJlcXVpcmVtZW50IG1hcCBpcyBidWlsdC4gKi9cbiAgZ2V0TG9jYXRpb25MaXN0KHdvcmxkTmFtZSA9ICdDcnlzdGFsaXMnKTogTG9jYXRpb25MaXN0IHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIganVzdCBpbXBsZW1lbnRpbmcgdGhpcyBkaXJlY3RseT9cbiAgICBjb25zdCBjaGVja05hbWUgPSBERUJVRyA/IChmOiBGbGFnKSA9PiBmLmRlYnVnIDogKGY6IEZsYWcpID0+IGYubmFtZTtcbiAgICByZXR1cm4ge1xuICAgICAgd29ybGROYW1lLFxuICAgICAgcmVxdWlyZW1lbnRzOiB0aGlzLnJlcXVpcmVtZW50TWFwLFxuICAgICAgaXRlbXM6IHRoaXMuaXRlbXMsXG4gICAgICBzbG90czogdGhpcy5zbG90cyxcbiAgICAgIGNoZWNrTmFtZTogKGNoZWNrOiBudW1iZXIpID0+IGNoZWNrTmFtZSh0aGlzLnJvbS5mbGFnc1tjaGVja10pLFxuICAgICAgcHJlZmlsbDogKHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gICAgICAgIGNvbnN0IHtDcnlzdGFsaXMsIE1lc2lhSW5Ub3dlciwgTGVhZkVsZGVyfSA9IHRoaXMucm9tLmZsYWdzO1xuICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKFtbTWVzaWFJblRvd2VyLmlkLCBDcnlzdGFsaXMuaWRdXSk7XG4gICAgICAgIGlmICh0aGlzLmZsYWdzZXQuZ3VhcmFudGVlU3dvcmQoKSkge1xuICAgICAgICAgIC8vIFBpY2sgYSBzd29yZCBhdCByYW5kb20uLi4/IGludmVyc2Ugd2VpZ2h0P1xuICAgICAgICAgIG1hcC5zZXQoTGVhZkVsZGVyLmlkLCAweDIwMCB8IHJhbmRvbS5uZXh0SW50KDQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgICAvLyBUT0RPIC0gaWYgYW55IGl0ZW1zIHNob3VsZG4ndCBiZSBzaHVmZmxlZCwgdGhlbiBkbyB0aGUgcHJlLWZpbGwuLi5cbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBBZGQgdGVycmFpbnMgYW5kIGNoZWNrcyBmb3IgYSBsb2NhdGlvbiwgZnJvbSB0aWxlcyBhbmQgc3Bhd25zLiAqL1xuICBwcm9jZXNzTG9jYXRpb24obG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgaWYgKCFsb2NhdGlvbi51c2VkKSByZXR1cm47XG4gICAgLy8gTG9vayBmb3Igd2FsbHMsIHdoaWNoIHdlIG5lZWQgdG8ga25vdyBhYm91dCBsYXRlci5cbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbik7XG4gIH1cblxuICAvKiogUnVuIHRoZSBmaXJzdCBwYXNzIG9mIHVuaW9ucyBub3cgdGhhdCBhbGwgdGVycmFpbnMgYXJlIGZpbmFsLiAqL1xuICB1bmlvbk5laWdoYm9ycygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeDEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB4MV0pO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHkxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeTFdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQnVpbGRzIHVwIHRoZSByb3V0ZXMgYW5kIHJvdXRlRWRnZXMgZGF0YSBzdHJ1Y3R1cmVzLiAqL1xuICBhZGRBbGxSb3V0ZXMoKSB7XG4gICAgLy8gQWRkIGFueSBleHRyYSByb3V0ZXMgZmlyc3QsIHN1Y2ggYXMgdGhlIHN0YXJ0aW5nIHRpbGUuXG4gICAgdGhpcy5hZGRFeHRyYVJvdXRlcygpO1xuICAgIC8vIEFkZCBhbGwgdGhlIGVkZ2VzIGZyb20gYWxsIG5laWdoYm9ycy5cbiAgICBmb3IgKGNvbnN0IFtwYWlyLCBkaXJzXSBvZiB0aGlzLm5laWdoYm9ycykge1xuICAgICAgY29uc3QgW2MwLCBjMV0gPSBUaWxlUGFpci5zcGxpdChwYWlyKTtcbiAgICAgIGNvbnN0IHQwID0gdGhpcy50ZXJyYWlucy5nZXQoYzApO1xuICAgICAgY29uc3QgdDEgPSB0aGlzLnRlcnJhaW5zLmdldChjMSk7XG4gICAgICBpZiAoIXQwIHx8ICF0MSkgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIHRlcnJhaW4gJHtoZXgodDAgPyBjMCA6IGMxKX1gKTtcbiAgICAgIGZvciAoY29uc3QgW2RpciwgZXhpdFJlcV0gb2YgdDAuZXhpdCkge1xuICAgICAgICBpZiAoIShkaXIgJiBkaXJzKSkgY29udGludWU7XG4gICAgICAgIGZvciAoY29uc3QgZXhpdENvbmRzIG9mIGV4aXRSZXEpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGVudGVyQ29uZHMgb2YgdDEuZW50ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGMxLCBbLi4uZXhpdENvbmRzLCAuLi5lbnRlckNvbmRzXSksIGMwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IGRlYnVnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlYnVnJyk7XG4gICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgZGVidWcuYXBwZW5kQ2hpbGQobmV3IEFyZWEodGhpcy5yb20sIHRoaXMuZ2V0V29ybGREYXRhKCkpLmVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFdvcmxkRGF0YSgpOiBXb3JsZERhdGEge1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3QgdGlsZXMgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFRpbGVEYXRhPigoKSA9PiAoe30pIGFzIFRpbGVEYXRhKTtcbiAgICBjb25zdCBsb2NhdGlvbnMgPVxuICAgICAgICBzZXEoMjU2LCAoKSA9PiAoe2FyZWFzOiBuZXcgU2V0KCksIHRpbGVzOiBuZXcgU2V0KCl9IGFzIExvY2F0aW9uRGF0YSkpO1xuICAgIGNvbnN0IGFyZWFzOiBBcmVhRGF0YVtdID0gW107XG5cbiAgICAvLyBkaWdlc3QgdGhlIGFyZWFzXG4gICAgZm9yIChjb25zdCBzZXQgb2YgdGhpcy50aWxlcy5zZXRzKCkpIHtcbiAgICAgIGNvbnN0IGNhbm9uaWNhbCA9IHRoaXMudGlsZXMuZmluZChpdGVycy5maXJzdChzZXQpKTtcbiAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChjYW5vbmljYWwpO1xuICAgICAgaWYgKCF0ZXJyYWluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJvdXRlcyA9XG4gICAgICAgICAgdGhpcy5yb3V0ZXMuaGFzKGNhbm9uaWNhbCkgP1xuICAgICAgICAgICAgICBSZXF1aXJlbWVudC5mcmVlemUodGhpcy5yb3V0ZXMuZ2V0KGNhbm9uaWNhbCkpIDogW107XG4gICAgICBpZiAoIXJvdXRlcy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgYXJlYTogQXJlYURhdGEgPSB7XG4gICAgICAgIGNoZWNrczogW10sXG4gICAgICAgIGlkOiBpbmRleCsrLFxuICAgICAgICBsb2NhdGlvbnM6IG5ldyBTZXQoKSxcbiAgICAgICAgcm91dGVzLFxuICAgICAgICB0ZXJyYWluLFxuICAgICAgICB0aWxlczogbmV3IFNldCgpLFxuICAgICAgfTtcbiAgICAgIGFyZWFzLnB1c2goYXJlYSk7XG4gICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGlsZSA+Pj4gMTY7XG4gICAgICAgIGFyZWEubG9jYXRpb25zLmFkZChsb2NhdGlvbik7XG4gICAgICAgIGFyZWEudGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLmFyZWFzLmFkZChhcmVhKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIHRpbGVzLmdldCh0aWxlKS5hcmVhID0gYXJlYTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBleGl0c1xuICAgIGZvciAoY29uc3QgW2EsIGJdIG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIGlmICh0aWxlcy5oYXMoYSkpIHtcbiAgICAgICAgdGlsZXMuZ2V0KGEpLmV4aXQgPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGNoZWNrc1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3QgYXJlYSA9IHRpbGVzLmdldCh0aWxlKS5hcmVhO1xuICAgICAgaWYgKCFhcmVhKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYEFiYW5kb25lZCBjaGVjayAke1suLi5jaGVja1NldF0ubWFwKFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgeCA9PiBbLi4ueC5jaGVja3NdLm1hcCh5ID0+IHkudG9TdHJpbmcoMTYpKSlcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgfSBhdCAke3RpbGUudG9TdHJpbmcoMTYpfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMucm9tLmZsYWdzW2NoZWNrXSB8fCBkaWUoKTtcbiAgICAgICAgICBhcmVhLmNoZWNrcy5wdXNoKFtmbGFnLCByZXF1aXJlbWVudF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7dGlsZXMsIGFyZWFzLCBsb2NhdGlvbnN9O1xuICB9XG5cbiAgLyoqIEFkZHMgYSByb3V0ZSwgb3B0aW9uYWxseSB3aXRoIGEgcHJlcmVxdWlzaXRlIChjYW5vbmljYWwpIHNvdXJjZSB0aWxlLiAqL1xuICBhZGRSb3V0ZShyb3V0ZTogUm91dGUsIHNvdXJjZT86IFRpbGVJZCkge1xuICAgIGlmIChzb3VyY2UgIT0gbnVsbCkge1xuICAgICAgLy8gQWRkIGFuIGVkZ2UgaW5zdGVhZCBvZiBhIHJvdXRlLCByZWN1cnNpbmcgb24gdGhlIHNvdXJjZSdzXG4gICAgICAvLyByZXF1aXJlbWVudHMuXG4gICAgICB0aGlzLnJvdXRlRWRnZXMuZ2V0KHNvdXJjZSkuYWRkKHJvdXRlKTtcbiAgICAgIGZvciAoY29uc3Qgc3JjUm91dGUgb2YgdGhpcy5yb3V0ZXMuZ2V0KHNvdXJjZSkpIHtcbiAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUocm91dGUudGFyZ2V0LCBbLi4uc3JjUm91dGUsIC4uLnJvdXRlLmRlcHNdKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoaXMgaXMgbm93IGFuIFwiaW5pdGlhbCByb3V0ZVwiIHdpdGggbm8gcHJlcmVxdWlzaXRlIHNvdXJjZS5cbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzdGFydCA9IHJvdXRlOyAvLyBUT0RPIGlubGluZVxuICAgIHF1ZXVlLmFkZChzdGFydCk7XG4gICAgY29uc3QgaXRlciA9IHF1ZXVlW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3Qge3ZhbHVlLCBkb25lfSA9IGl0ZXIubmV4dCgpO1xuICAgICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICAgIHNlZW4uYWRkKHZhbHVlKTtcbiAgICAgIHF1ZXVlLmRlbGV0ZSh2YWx1ZSk7XG4gICAgICBjb25zdCBmb2xsb3cgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHZhbHVlLnRhcmdldDtcbiAgICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLnJvdXRlcy5nZXQodGFyZ2V0KTtcbiAgICAgIGlmIChidWlsZGVyLmFkZFJvdXRlKHZhbHVlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IG5leHQgb2YgdGhpcy5yb3V0ZUVkZ2VzLmdldCh0YXJnZXQpKSB7XG4gICAgICAgICAgZm9sbG93LmFkZChuZXcgUm91dGUobmV4dC50YXJnZXQsIFsuLi52YWx1ZS5kZXBzLCAuLi5uZXh0LmRlcHNdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbmV4dCBvZiBmb2xsb3cpIHtcbiAgICAgICAgaWYgKHNlZW4uaGFzKG5leHQpKSBjb250aW51ZTtcbiAgICAgICAgcXVldWUuZGVsZXRlKG5leHQpOyAvLyByZS1hZGQgYXQgdGhlIGVuZCBvZiB0aGUgcXVldWVcbiAgICAgICAgcXVldWUuYWRkKG5leHQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgdXAgYHRoaXMuZXhpdFNldGAgdG8gaW5jbHVkZSBhbGwgdGhlIFwiZnJvbS10b1wiIHRpbGUgcGFpcnNcbiAgICogb2YgZXhpdHMgdGhhdCBfZG9uJ3RfIHNoYXJlIHRoZSBzYW1lIHRlcnJhaW4gRm9yIGFueSB0d28td2F5IGV4aXRcbiAgICogdGhhdCBzaGFyZXMgdGhlIHNhbWUgdGVycmFpbiwganVzdCBhZGQgaXQgZGlyZWN0bHkgdG8gdGhlXG4gICAqIHVuaW9uZmluZC5cbiAgICovXG4gIHJlY29yZEV4aXRzKCkge1xuICAgIC8vIEFkZCBleGl0IFRpbGVQYWlycyB0byBleGl0U2V0IGZyb20gYWxsIGxvY2F0aW9ucycgZXhpdHMuXG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9dIG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdFNldC5hZGQoXG4gICAgICAgICAgVGlsZVBhaXIub2YodGhpcy50aWxlcy5maW5kKGZyb20pLCB0aGlzLnRpbGVzLmZpbmQodG8pKSk7XG4gICAgfVxuICAgIC8vIExvb2sgZm9yIHR3by13YXkgZXhpdHMgd2l0aCB0aGUgc2FtZSB0ZXJyYWluOiByZW1vdmUgdGhlbSBmcm9tXG4gICAgLy8gZXhpdFNldCBhbmQgYWRkIHRoZW0gdG8gdGhlIHRpbGVzIHVuaW9uZmluZC5cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0U2V0KSB7XG4gICAgICBjb25zdCBbZnJvbSwgdG9dID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoZnJvbSkgIT09IHRoaXMudGVycmFpbnMuZ2V0KHRvKSkgY29udGludWU7XG4gICAgICBjb25zdCByZXZlcnNlID0gVGlsZVBhaXIub2YodG8sIGZyb20pO1xuICAgICAgaWYgKHRoaXMuZXhpdFNldC5oYXMocmV2ZXJzZSkpIHtcbiAgICAgICAgdGhpcy50aWxlcy51bmlvbihbZnJvbSwgdG9dKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmRlbGV0ZShleGl0KTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmRlbGV0ZShyZXZlcnNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBkaWZmZXJlbnQtdGVycmFpbiBuZWlnaGJvcnMgaW4gdGhlIHNhbWUgbG9jYXRpb24uICBBZGRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgdG8gYHRoaXMubmVpZ2hib3JzYCB3aXRoIGFsbCB0aGVcbiAgICogZGlyZWN0aW9ucyB0aGF0IGl0IG5laWdoYm9ycyBpbi4gIEFsc28gYWRkIGV4aXRzIGFzIG5laWdoYm9ycy5cbiAgICogVGhpcyBtdXN0IGhhcHBlbiAqYWZ0ZXIqIHRoZSBlbnRpcmUgdW5pb25maW5kIGlzIGNvbXBsZXRlIHNvXG4gICAqIHRoYXQgd2UgY2FuIGxldmVyYWdlIGl0LlxuICAgKi9cbiAgYnVpbGROZWlnaGJvcnMoKSB7XG4gICAgLy8gQWRqYWNlbnQgZGlmZmVyZW50LXRlcnJhaW4gdGlsZXMuXG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgaWYgKCF0ZXJyYWluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGNvbnN0IHR5MSA9IHRoaXMudGVycmFpbnMuZ2V0KHkxKTtcbiAgICAgIGlmICh0eTEgJiYgdHkxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeTEsIERpci5Ob3J0aCk7XG4gICAgICB9XG4gICAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgICBjb25zdCB0eDEgPSB0aGlzLnRlcnJhaW5zLmdldCh4MSk7XG4gICAgICBpZiAodHgxICYmIHR4MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHgxLCBEaXIuV2VzdCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEV4aXRzIChqdXN0IHVzZSBcIm5vcnRoXCIgZm9yIHRoZXNlKS5cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0U2V0KSB7XG4gICAgICBjb25zdCBbdDAsIHQxXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0MCkgfHwgIXRoaXMudGVycmFpbnMuaGFzKHQxKSkgY29udGludWU7XG4gICAgICBjb25zdCBwID0gVGlsZVBhaXIub2YodGhpcy50aWxlcy5maW5kKHQwKSwgdGhpcy50aWxlcy5maW5kKHQxKSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHApIHwgMSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModDA6IFRpbGVJZCwgdDE6IFRpbGVJZCwgZGlyOiBEaXIpIHtcbiAgICAvLyBOT1RFOiB0MCA8IHQxIGJlY2F1c2UgZGlyIGlzIGFsd2F5cyBXRVNUIG9yIE5PUlRILlxuICAgIGNvbnN0IGMwID0gdGhpcy50aWxlcy5maW5kKHQwKTtcbiAgICBjb25zdCBjMSA9IHRoaXMudGlsZXMuZmluZCh0MSk7XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQxKSkge1xuICAgICAgLy8gMSAtPiAwICh3ZXN0L25vcnRoKS4gIElmIDEgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3QgcDEwID0gVGlsZVBhaXIub2YoYzEsIGMwKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMTAsIHRoaXMubmVpZ2hib3JzLmdldChwMTApIHwgKDEgPDwgZGlyKSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MCkpIHtcbiAgICAgIC8vIDAgLT4gMSAoZWFzdC9zb3V0aCkuICBJZiAwIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IG9wcCA9IGRpciBeIDI7XG4gICAgICBjb25zdCBwMDEgPSBUaWxlUGFpci5vZihjMCwgYzEpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAwMSwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAwMSkgfCAoMSA8PCBvcHApKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBjb25zdCB3YWxscyA9IG5ldyBNYXA8U2NyZWVuSWQsIFdhbGxUeXBlPigpO1xuICAgIGNvbnN0IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG4gICAgY29uc3QgaW5Ub3dlciA9IChsb2NhdGlvbi5pZCAmIDB4ZjgpID09PSAweDU4O1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBXYWxscyBuZWVkIHRvIGNvbWUgZmlyc3Qgc28gd2UgY2FuIGF2b2lkIGFkZGluZyBzZXBhcmF0ZVxuICAgICAgLy8gcmVxdWlyZW1lbnRzIGZvciBldmVyeSBzaW5nbGUgd2FsbCAtIGp1c3QgdXNlIHRoZSB0eXBlLlxuICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIHdhbGxzLnNldChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIChzcGF3bi5pZCAmIDMpIGFzIFdhbGxUeXBlKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24uaWQgPT09IDB4M2YpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgICBzaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXRzW2xvY2F0aW9uLnRpbGVzZXRdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXTtcblxuICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKSA9PiB7XG4gICAgICBjb25zdCBzID0gbG9jYXRpb24uc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICByZXR1cm4gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3NdLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgfTtcblxuICAgIC8vIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuXG4gICAgY29uc3QgbWFrZVRlcnJhaW4gPSAoZWZmZWN0czogbnVtYmVyLCB0aWxlOiBUaWxlSWQsIGJhcnJpZXI6IGJvb2xlYW4pID0+IHtcbiAgICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgICAgZWZmZWN0cyAmPSBUZXJyYWluLkJJVFM7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4MWEpIGVmZmVjdHMgfD0gVGVycmFpbi5TV0FNUDtcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2MCB8fCBsb2NhdGlvbi5pZCA9PT0gMHg2OCkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4MTAzMCkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICBpZiAoYmFycmllcikgZWZmZWN0cyB8PSBUZXJyYWluLkJBUlJJRVI7XG4gICAgICBpZiAoIShlZmZlY3RzICYgVGVycmFpbi5ET0xQSElOKSAmJiBlZmZlY3RzICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgbGVuZ3RoIG9mIHNsb3BlOiBzaG9ydCBzbG9wZXMgYXJlIGNsaW1iYWJsZS5cbiAgICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgICAvLyA5IGlzIGRvYWJsZSB3aXRoIHJhYmJpdCBib290cyBvbmx5IChub3QgYXdhcmUgb2YgYW55IG9mIHRoZXNlLi4uKVxuICAgICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICAgIGxldCBoZWlnaHQgPSAwO1xuICAgICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAgIGJvdHRvbSA9IFRpbGVJZC5hZGQoYm90dG9tLCAxLCAwKTtcbiAgICAgICAgICBoZWlnaHQrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICAgIGVmZmVjdHMgJj0gflRlcnJhaW4uU0xPUEU7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgOSkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTg7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgMTApIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKGVmZmVjdHMpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB5ID0gMCwgaGVpZ2h0ID0gbG9jYXRpb24uaGVpZ2h0OyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxvY2F0aW9uLnNjcmVlbnNbeV07XG4gICAgICBjb25zdCByb3dJZCA9IGxvY2F0aW9uLmlkIDw8IDggfCB5IDw8IDQ7XG4gICAgICBmb3IgKGxldCB4ID0gMCwgd2lkdGggPSBsb2NhdGlvbi53aWR0aDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF1dO1xuICAgICAgICBjb25zdCBzY3JlZW5JZCA9IFNjcmVlbklkKHJvd0lkIHwgeCk7XG4gICAgICAgIGNvbnN0IGJhcnJpZXIgPSBzaG9vdGluZ1N0YXR1ZXMuaGFzKHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZ1l4ID0gc2NyZWVuSWQgJiAweGZmO1xuICAgICAgICBjb25zdCB3YWxsID0gd2FsbHMuZ2V0KHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZyA9XG4gICAgICAgICAgICBpblRvd2VyID8gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZCA6XG4gICAgICAgICAgICB3YWxsICE9IG51bGwgPyB0aGlzLndhbGxDYXBhYmlsaXR5KHdhbGwpIDpcbiAgICAgICAgICAgIGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gZmxhZ1l4KT8uZmxhZztcbiAgICAgICAgY29uc3QgcGl0ID0gbG9jYXRpb24ucGl0cy5maW5kKHAgPT4gcC5mcm9tU2NyZWVuID09PSBzY3JlZW5JZCk7XG4gICAgICAgIGlmIChwaXQpIHtcbiAgICAgICAgICB0aGlzLmV4aXRzLnNldChUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IDB4ODgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFRpbGVJZChwaXQudG9TY3JlZW4gPDwgOCB8IDB4ODgpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsb2dpYzogTG9naWMgPSB0aGlzLnJvbS5mbGFnc1tmbGFnIV0/LmxvZ2ljID8/IHt9O1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpZCA9IFRpbGVJZChzY3JlZW5JZCA8PCA4IHwgdCk7XG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGlmIChsb2dpYy5hc3N1bWVUcnVlICYmIHRpbGUgPCAweDIwKSB7XG4gICAgICAgICAgICB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBlZmZlY3RzID1cbiAgICAgICAgICAgICAgbG9jYXRpb24uaXNTaG9wKCkgPyAwIDogdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXSAmIDB4MjY7XG4gICAgICAgICAgbGV0IHRlcnJhaW4gPSBtYWtlVGVycmFpbihlZmZlY3RzLCB0aWQsIGJhcnJpZXIpO1xuICAgICAgICAgIC8vaWYgKCF0ZXJyYWluKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICBpZiAodGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9PSB0aWxlICYmXG4gICAgICAgICAgICAgIGZsYWcgIT0gbnVsbCAmJiAhbG9naWMuYXNzdW1lVHJ1ZSAmJiAhbG9naWMuYXNzdW1lRmFsc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0ZSA9XG4gICAgICAgICAgICAgICAgbWFrZVRlcnJhaW4odGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAgIC8vaWYgKCFhbHRlcm5hdGUpIHRocm93IG5ldyBFcnJvcihgYmFkIHRlcnJhaW4gZm9yIGFsdGVybmF0ZWApO1xuICAgICAgICAgICAgaWYgKGFsdGVybmF0ZSkge1xuICAgICAgICAgICAgICAvLyBOT1RFOiB0aGVyZSdzIGFuIG9kZGl0eSBmcm9tIGhvbGxvd2luZyBvdXQgdGhlIGJhY2tzIG9mIGlyb25cbiAgICAgICAgICAgICAgLy8gd2FsbHMgdGhhdCBvbmUgY29ybmVyIG9mIHN0b25lIHdhbGxzIGFyZSBhbHNvIGhvbGxvd2VkIG91dCxcbiAgICAgICAgICAgICAgLy8gYnV0IG9ubHkgcHJlLWZsYWcuICBJdCBkb2Vzbid0IGFjdHVhbGx5IGh1cnQgYW55dGhpbmcuXG4gICAgICAgICAgICAgIHRlcnJhaW4gPVxuICAgICAgICAgICAgICAgICAgdGhpcy50ZXJyYWluRmFjdG9yeS5mbGFnKHRlcnJhaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9naWMudHJhY2sgPyBmbGFnIDogLTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRlcnJhaW4pIHRoaXMudGVycmFpbnMuc2V0KHRpZCwgdGVycmFpbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDbG9iYmVyIHRlcnJhaW4gd2l0aCBzZWFtbGVzcyBleGl0c1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgY29uc3Qge2Rlc3QsIGVudHJhbmNlfSA9IGV4aXQ7XG4gICAgICBjb25zdCBmcm9tID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgLy8gU2VhbWxlc3MgZXhpdHMgKDB4MjApIGlnbm9yZSB0aGUgZW50cmFuY2UgaW5kZXgsIGFuZFxuICAgICAgLy8gaW5zdGVhZCBwcmVzZXJ2ZSB0aGUgVGlsZUlkLCBqdXN0IGNoYW5naW5nIHRoZSBsb2NhdGlvbi5cbiAgICAgIGxldCB0bzogVGlsZUlkO1xuICAgICAgaWYgKGV4aXQuaXNTZWFtbGVzcygpKSB7XG4gICAgICAgIHRvID0gVGlsZUlkKGZyb20gJiAweGZmZmYgfCAoZGVzdCA8PCAxNikpO1xuICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgICB0aGlzLnNlYW1sZXNzRXhpdHMuYWRkKHRpbGUpO1xuICAgICAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgICBpZiAocHJldmlvdXMpIHtcbiAgICAgICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5LnNlYW1sZXNzKHByZXZpb3VzKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvID0gdGhpcy5lbnRyYW5jZSh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF0sIGVudHJhbmNlICYgMHgxZik7XG4gICAgICB9XG4gICAgICB0aGlzLmV4aXRzLnNldChmcm9tLCB0byk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzVHJpZ2dlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc05wYyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NCb3NzKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQ2hlc3QoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NDaGVzdChsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NNb25zdGVyKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLnR5cGUgPT09IDMgJiYgc3Bhd24uaWQgPT09IDB4ZTApIHtcbiAgICAgICAgLy8gd2luZG1pbGwgYmxhZGVzXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShcbiAgICAgICAgICAgIEhpdGJveC5zY3JlZW4oVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSksXG4gICAgICAgICAgICB0aGlzLnJvbS5mbGFncy5Vc2VkV2luZG1pbGxLZXkucik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc1RyaWdnZXIobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBGb3IgdHJpZ2dlcnMsIHdoaWNoIHRpbGVzIGRvIHdlIG1hcms/XG4gICAgLy8gVGhlIHRyaWdnZXIgaGl0Ym94IGlzIDIgdGlsZXMgd2lkZSBhbmQgMSB0aWxlIHRhbGwsIGJ1dCBpdCBkb2VzIG5vdFxuICAgIC8vIGxpbmUgdXAgbmljZWx5IHRvIHRoZSB0aWxlIGdyaWQuICBBbHNvLCB0aGUgcGxheWVyIGhpdGJveCBpcyBvbmx5XG4gICAgLy8gJGMgd2lkZSAodGhvdWdoIGl0J3MgJDE0IHRhbGwpIHNvIHRoZXJlJ3Mgc29tZSBzbGlnaHQgZGlzcGFyaXR5LlxuICAgIC8vIEl0IHNlZW1zIGxpa2UgcHJvYmFibHkgbWFya2luZyBpdCBhcyAoeC0xLCB5LTEpIC4uICh4LCB5KSBtYWtlcyB0aGVcbiAgICAvLyBtb3N0IHNlbnNlLCB3aXRoIHRoZSBjYXZlYXQgdGhhdCB0cmlnZ2VycyBzaGlmdGVkIHJpZ2h0IGJ5IGEgaGFsZlxuICAgIC8vIHRpbGUgc2hvdWxkIGdvIGZyb20geCAuLiB4KzEgaW5zdGVhZC5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBjaGVja2luZyB0cmlnZ2VyJ3MgYWN0aW9uOiAkMTkgLT4gcHVzaC1kb3duIG1lc3NhZ2VcblxuICAgIC8vIFRPRE8gLSBwdWxsIG91dCB0aGlzLnJlY29yZFRyaWdnZXJUZXJyYWluKCkgYW5kIHRoaXMucmVjb3JkVHJpZ2dlckNoZWNrKClcbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5yb20udHJpZ2dlcihzcGF3bi5pZCk7XG4gICAgaWYgKCF0cmlnZ2VyKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgdHJpZ2dlciAke3NwYXduLmlkLnRvU3RyaW5nKDE2KX1gKTtcblxuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgbGV0IGFudGlSZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHModHJpZ2dlci5jb25kaXRpb25zKTtcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuICAgIGxldCBoaXRib3ggPSBIaXRib3gudHJpZ2dlcihsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgY29uc3QgY2hlY2tzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHRyaWdnZXIuZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnRzLCBjaGVja3MpO1xuXG4gICAgc3dpdGNoICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MTk6XG4gICAgICAgIC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzZXQuYXNzdW1lUmFiYml0U2tpcCgpKSB7XG4gICAgICAgICAgLy8gYmlnZ2VyIGhpdGJveCB0byBub3QgZmluZCB0aGUgcGF0aCB0aHJvdWdoXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAtMV0sIFswLCAxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpZ2dlci5pZCA9PT0gMHhiYSAmJlxuICAgICAgICAgICAgICAgICAgICF0aGlzLmZsYWdzZXQuYXNzdW1lVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmRpc2FibGVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICAgIC8vIGNvcHkgdGhlIHRlbGVwb3J0IGhpdGJveCBpbnRvIHRoZSBvdGhlciBzaWRlIG9mIGNvcmRlbFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hdExvY2F0aW9uKGhpdGJveCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5FYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbldlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXF1aXJlbWVudHMpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZDpcbiAgICAgICAgLy8gc3RhcnQgbWFkbyAxIGJvc3MgZmlnaHRcbiAgICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuTWFkbzEsIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDg6IGNhc2UgMHgwYjogY2FzZSAweDBjOiBjYXNlIDB4MGQ6IGNhc2UgMHgwZjpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIHRyaWdnZXIgSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxdWlyZW1lbnRzLCB0cmlnZ2VyLmlkKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxODogeyAvLyBzdG9tIGZpZ2h0XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZTogd2FycCBib290cyBnbGl0Y2ggcmVxdWlyZWQgaWYgY2hhcmdlIHNob3RzIG9ubHkuXG4gICAgICAgIGNvbnN0IHJlcSA9XG4gICAgICAgICAgdGhpcy5mbGFnc2V0LmNoYXJnZVNob3RzT25seSgpID9cbiAgICAgICAgICBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgYW5kKHRoaXMucm9tLmZsYWdzLldhcnBCb290cykpIDpcbiAgICAgICAgICByZXF1aXJlbWVudHM7XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCB0aGlzLnJvbS5mbGFncy5TdG9tRmlnaHRSZXdhcmQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIDB4MWU6XG4gICAgICAgIC8vIGZvcmdlIGNyeXN0YWxpc1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgdGhpcy5yb20uZmxhZ3MuTWVzaWFJblRvd2VyLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFmOlxuICAgICAgICB0aGlzLmhhbmRsZUJvYXQodGlsZSwgbG9jYXRpb24sIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIE1vdmluZyBndWFyZFxuICAgICAgICAvLyB0cmVhdCB0aGlzIGFzIGEgc3RhdHVlPyAgYnV0IHRoZSBjb25kaXRpb25zIGFyZSBub3Qgc3VwZXIgdXNlZnVsLi4uXG4gICAgICAgIC8vICAgLSBvbmx5IHRyYWNrZWQgY29uZGl0aW9ucyBtYXR0ZXI/IDllID09IHBhcmFseXNpcy4uLiBleGNlcHQgbm90LlxuICAgICAgICAvLyBwYXJhbHl6YWJsZT8gIGNoZWNrIERhdGFUYWJsZV8zNTA0NVxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5Qb3J0b2FfUGFsYWNlRW50cmFuY2UpIHtcbiAgICAgICAgICAvLyBQb3J0b2EgcGFsYWNlIGZyb250IGd1YXJkIG5vcm1hbGx5IGJsb2NrcyBvbiBNZXNpYSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gQnV0IHRoZSBxdWVlbiBpcyBhY3R1YWxseSBhY2Nlc3NpYmxlIHdpdGhvdXQgc2VlaW5nIHRoZSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gSW5zdGVhZCwgYmxvY2sgYWNjZXNzIHRvIHRoZSB0aHJvbmUgcm9vbSBvbiBiZWluZyBhYmxlIHRvIHRhbGsgdG9cbiAgICAgICAgICAvLyB0aGUgZm9ydHVuZSB0ZWxsZXIsIGluIGNhc2UgdGhlIGd1YXJkIG1vdmVzIGJlZm9yZSB3ZSBjYW4gZ2V0IHRoZVxuICAgICAgICAgIC8vIGl0ZW0uICBBbHNvIG1vdmUgdGhlIGhpdGJveCB1cCBzaW5jZSB0aGUgdHdvIHNpZGUgcm9vbXMgX2FyZV8gc3RpbGxcbiAgICAgICAgICAvLyBhY2Nlc3NpYmxlLlxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbLTIsIDBdKTtcbiAgICAgICAgICBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5yb20uZmxhZ3MuVGFsa2VkVG9Gb3J0dW5lVGVsbGVyLnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oYW5kbGVNb3ZpbmdHdWFyZChoaXRib3gsIGxvY2F0aW9uLCBhbnRpUmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXF1aXJlbWVudC5PUEVOLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NOcGMobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBucGM6ICR7aGV4KHNwYXduLmlkKX1gKTtcbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnMgPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2NhdGlvbi5pZCkgfHwgW107XG4gICAgY29uc3QgcmVxID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTsgLy8gc2hvdWxkIGJlIHNpbmdsZVxuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICAvLyBOT1RFOiBSYWdlIGhhcyBubyB3YWxrYWJsZSBuZWlnaGJvcnMsIGFuZCB3ZSBuZWVkIHRoZSBzYW1lIGhpdGJveFxuICAgIC8vIGZvciBib3RoIHRoZSB0ZXJyYWluIGFuZCB0aGUgY2hlY2suXG4gICAgLy9cbiAgICAvLyBOT1RFIEFMU08gLSBSYWdlIHByb2JhYmx5IHNob3dzIHVwIGFzIGEgYm9zcywgbm90IGFuIE5QQz9cbiAgICBsZXQgaGl0Ym94OiBIaXRib3ggPVxuICAgICAgICBbdGhpcy50ZXJyYWlucy5oYXModGlsZSkgPyB0aWxlIDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpID8/IHRpbGVdO1xuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoaGl0Ym94LCByZXEsIGl0ZW0sIHVzZSk7XG4gICAgfVxuXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5TYWJlcmFEaXNndWlzZWRBc01lc2lhKSB7XG4gICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5TYWJlcmExLCByZXEpO1xuICAgIH1cblxuICAgIGlmICgobnBjLmRhdGFbMl0gJiAweDA0KSAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgICBsZXQgYW50aVJlcTtcbiAgICAgIGFudGlSZXEgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTtcbiAgICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUmFnZSkge1xuICAgICAgICAvLyBUT0RPIC0gbW92ZSBoaXRib3ggZG93biwgY2hhbmdlIHJlcXVpcmVtZW50P1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzIsIC0xXSwgWzIsIDBdLCBbMiwgMV0sIFsyLCAyXSk7XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTZdLCBbMCwgLTJdLCBbMCwgMl0sIFswLCA2XSk7XG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayBpZiB0aGlzIHdvcmtzPyAgdGhlIH5jaGVjayBzcGF3biBjb25kaXRpb24gc2hvdWxkXG4gICAgICAgIC8vIGFsbG93IHBhc3NpbmcgaWYgZ290dGVuIHRoZSBjaGVjaywgd2hpY2ggaXMgdGhlIHNhbWUgYXMgZ290dGVuXG4gICAgICAgIC8vIHRoZSBjb3JyZWN0IHN3b3JkLlxuICAgICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVJhZ2VTa2lwKCkpIGFudGlSZXEgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Qb3J0b2FUaHJvbmVSb29tQmFja0Rvb3JHdWFyZCkge1xuICAgICAgICAvLyBQb3J0b2EgYmFjayBkb29yIGd1YXJkIHNwYXducyBpZiAoMSkgdGhlIG1lc2lhIHJlY29yZGluZyBoYXMgbm90IHlldFxuICAgICAgICAvLyBiZWVuIHBsYXllZCwgYW5kICgyKSB0aGUgcGxheWVyIGRpZG4ndCBzbmVhayBwYXN0IHRoZSBlYXJsaWVyIGd1YXJkLlxuICAgICAgICAvLyBXZSBjYW4gc2ltdWxhdGUgdGhpcyBieSBoYXJkLWNvZGluZyBhIHJlcXVpcmVtZW50IG9uIGVpdGhlciB0byBnZXRcbiAgICAgICAgLy8gcGFzdCBoaW0uXG4gICAgICAgIGFudGlSZXEgPSBvcih0aGlzLnJvbS5mbGFncy5NZXNpYVJlY29yZGluZywgdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzKTtcbiAgICAgIH0gZWxzZSBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlNvbGRpZXJHdWFyZCkge1xuICAgICAgICBhbnRpUmVxID0gdW5kZWZpbmVkOyAvLyB0aGV5J2xsIGp1c3QgYXR0YWNrIGlmIGFwcHJvYWNoZWQuXG4gICAgICB9XG4gICAgICAvLyBpZiBzcGF3biBpcyBhbHdheXMgZmFsc2UgdGhlbiByZXEgbmVlZHMgdG8gYmUgb3Blbj9cbiAgICAgIGlmIChhbnRpUmVxKSB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxKSk7XG4gICAgfVxuXG4gICAgLy8gRm9ydHVuZSB0ZWxsZXIgY2FuIGJlIHRhbGtlZCB0byBhY3Jvc3MgdGhlIGRlc2suXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Gb3J0dW5lVGVsbGVyKSB7XG4gICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIDBdLCBbMiwgMF0pO1xuICAgIH1cblxuICAgIC8vIHJlcSBpcyBub3cgbXV0YWJsZVxuICAgIGlmIChSZXF1aXJlbWVudC5pc0Nsb3NlZChyZXEpKSByZXR1cm47IC8vIG5vdGhpbmcgdG8gZG8gaWYgaXQgbmV2ZXIgc3Bhd25zLlxuICAgIGNvbnN0IFtbLi4uY29uZHNdXSA9IHJlcTtcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgZ2xvYmFsIGRpYWxvZ3MgLSBkbyBub3RoaW5nIGlmIHdlIGNhbid0IHBhc3MgdGhlbS5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcofmQuY29uZGl0aW9uKTtcbiAgICAgIGlmICghZj8ubG9naWMudHJhY2spIGNvbnRpbnVlO1xuICAgICAgY29uZHMucHVzaChmLmlkIGFzIENvbmRpdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBhcHByb3ByaWF0ZSBsb2NhbCBkaWFsb2dzXG4gICAgY29uc3QgbG9jYWxzID1cbiAgICAgICAgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jYXRpb24uaWQpID8/IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSA/PyBbXTtcbiAgICBmb3IgKGNvbnN0IGQgb2YgbG9jYWxzKSB7XG4gICAgICAvLyBDb21wdXRlIHRoZSBjb25kaXRpb24gJ3InIGZvciB0aGlzIG1lc3NhZ2UuXG4gICAgICBjb25zdCByID0gWy4uLmNvbmRzXTtcbiAgICAgIGNvbnN0IGYwID0gdGhpcy5mbGFnKGQuY29uZGl0aW9uKTtcbiAgICAgIGlmIChmMD8ubG9naWMudHJhY2spIHtcbiAgICAgICAgci5wdXNoKGYwLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgICB0aGlzLnByb2Nlc3NEaWFsb2coaGl0Ym94LCBucGMsIHIsIGQpO1xuICAgICAgLy8gQWRkIGFueSBuZXcgY29uZGl0aW9ucyB0byAnY29uZHMnIHRvIGdldCBiZXlvbmQgdGhpcyBtZXNzYWdlLlxuICAgICAgY29uc3QgZjEgPSB0aGlzLmZsYWcofmQuY29uZGl0aW9uKTtcbiAgICAgIGlmIChmMT8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY29uZHMucHVzaChmMS5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NEaWFsb2coaGl0Ym94OiBIaXRib3gsIG5wYzogTnBjLFxuICAgICAgICAgICAgICAgIHJlcTogcmVhZG9ubHkgQ29uZGl0aW9uW10sIGRpYWxvZzogTG9jYWxEaWFsb2cpIHtcbiAgICB0aGlzLmFkZENoZWNrRnJvbUZsYWdzKGhpdGJveCwgW3JlcV0sIGRpYWxvZy5mbGFncyk7XG5cbiAgICBjb25zdCBpbmZvID0ge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9O1xuICAgIHN3aXRjaCAoZGlhbG9nLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MDg6IC8vIG9wZW4gc3dhbiBnYXRlXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIFtyZXFdKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwYzogLy8gZHdhcmYgY2hpbGQgc3RhcnRzIGZvbGxvd2luZ1xuICAgICAgLy8gICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBkOiAvLyBucGMgd2Fsa3MgYXdheVxuICAgICAgLy8gICBicmVhaztcblxuICAgICAgY2FzZSAweDE0OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5TbGltZWRLZW5zdS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTA6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQXNpbmFJbkJhY2tSb29tLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVsxXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDM6XG4gICAgICBjYXNlIDB4MGE6IC8vIG5vcm1hbGx5IHRoaXMgaGFyZC1jb2RlcyBnbG93aW5nIGxhbXAsIGJ1dCB3ZSBleHRlbmRlZCBpdFxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzBdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwOTpcbiAgICAgICAgLy8gSWYgemVidSBzdHVkZW50IGhhcyBhbiBpdGVtLi4uPyAgVE9ETyAtIHN0b3JlIGZmIGlmIHVudXNlZFxuICAgICAgICBjb25zdCBpdGVtID0gbnBjLmRhdGFbMV07XG4gICAgICAgIGlmIChpdGVtICE9PSAweGZmKSB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IGl0ZW0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDE5OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFrYWhhbmFGbHV0ZU9mTGltZVRyYWRlaW4uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFhOlxuICAgICAgICAvLyBUT0RPIC0gY2FuIHdlIHJlYWNoIHRoaXMgc3BvdD8gIG1heSBuZWVkIHRvIG1vdmUgZG93bj9cbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuUmFnZS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIFJhZ2UgdGhyb3dpbmcgcGxheWVyIG91dC4uLlxuICAgICAgICAvLyBUaGlzIHNob3VsZCBhY3R1YWxseSBhbHJlYWR5IGJlIGhhbmRsZWQgYnkgdGhlIHN0YXR1ZSBjb2RlIGFib3ZlP1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gYWRkIGV4dHJhIGRpYWxvZ3MgZm9yIGl0ZW11c2UgdHJhZGVzLCBleHRyYSB0cmlnZ2Vyc1xuICAgIC8vICAgICAgLSBpZiBpdGVtIHRyYWRlZCBidXQgbm8gcmV3YXJkLCB0aGVuIHJlLWdpdmUgcmV3YXJkLi4uXG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KH5sb2NhdGlvbi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW3RoaXMuZW50cmFuY2UobG9jYXRpb24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVNb3ZpbmdHdWFyZChoaXRib3g6IEhpdGJveCwgbG9jYXRpb246IExvY2F0aW9uLCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gVGhpcyBpcyB0aGUgMWIgdHJpZ2dlciBhY3Rpb24gZm9sbG93LXVwLiAgSXQgbG9va3MgZm9yIGFuIE5QQyBpbiAwZCBvciAwZVxuICAgIC8vIGFuZCBtb3ZlcyB0aGVtIG92ZXIgYSBwaXhlbC4gIEZvciB0aGUgbG9naWMsIGl0J3MgYWx3YXlzIGluIGEgcG9zaXRpb25cbiAgICAvLyB3aGVyZSBqdXN0IG1ha2luZyB0aGUgdHJpZ2dlciBzcXVhcmUgYmUgYSBuby1leGl0IHNxdWFyZSBpcyBzdWZmaWNpZW50LFxuICAgIC8vIGJ1dCB3ZSBuZWVkIHRvIGdldCB0aGUgY29uZGl0aW9ucyByaWdodC4gIFdlIHBhc3MgaW4gdGhlIHJlcXVpcmVtZW50cyB0b1xuICAgIC8vIE5PVCB0cmlnZ2VyIHRoZSB0cmlnZ2VyLCBhbmQgdGhlbiB3ZSBqb2luIGluIHBhcmFseXNpcyBhbmQvb3Igc3RhdHVlXG4gICAgLy8gZ2xpdGNoIGlmIGFwcHJvcHJpYXRlLiAgVGhlcmUgY291bGQgdGhlb3JldGljYWxseSBiZSBjYXNlcyB3aGVyZSB0aGVcbiAgICAvLyBndWFyZCBpcyBwYXJhbHl6YWJsZSBidXQgdGhlIGdlb21ldHJ5IHByZXZlbnRzIHRoZSBwbGF5ZXIgZnJvbSBhY3R1YWxseVxuICAgIC8vIGhpdHRpbmcgdGhlbSBiZWZvcmUgdGhleSBtb3ZlLCBidXQgaXQgZG9lc24ndCBoYXBwZW4gaW4gcHJhY3RpY2UuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkgcmV0dXJuO1xuICAgIGNvbnN0IGV4dHJhOiBDb25kaXRpb25bXVtdID0gW107XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMuc2xpY2UoMCwgMikpIHtcbiAgICAgIGlmIChzcGF3bi5pc05wYygpICYmIHRoaXMucm9tLm5wY3Nbc3Bhd24uaWRdLmlzUGFyYWx5emFibGUoKSkge1xuICAgICAgICBleHRyYS5wdXNoKFt0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMuaWQgYXMgQ29uZGl0aW9uXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShbLi4ucmVxLCAuLi5leHRyYV0ubWFwKHNwcmVhZCkpKTtcblxuXG4gICAgLy8gVE9ETyAtIFBvcnRvYSBndWFyZHMgYXJlIGJyb2tlbiA6LShcbiAgICAvLyBUaGUgYmFjayBndWFyZCBuZWVkcyB0byBibG9jayBvbiB0aGUgZnJvbnQgZ3VhcmQncyBjb25kaXRpb25zLFxuICAgIC8vIHdoaWxlIHRoZSBmcm9udCBndWFyZCBzaG91bGQgYmxvY2sgb24gZm9ydHVuZSB0ZWxsZXI/XG5cbiAgfVxuXG4gIGhhbmRsZUJvYXQodGlsZTogVGlsZUlkLCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBib2FyZCBib2F0IC0gdGhpcyBhbW91bnRzIHRvIGFkZGluZyBhIHJvdXRlIGVkZ2UgZnJvbSB0aGUgdGlsZVxuICAgIC8vIHRvIHRoZSBsZWZ0LCB0aHJvdWdoIGFuIGV4aXQsIGFuZCB0aGVuIGNvbnRpbnVpbmcgdW50aWwgZmluZGluZyBsYW5kLlxuICAgIGNvbnN0IHQwID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpO1xuICAgIGlmICh0MCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHdhbGthYmxlIG5laWdoYm9yLmApO1xuICAgIGNvbnN0IHl0ID0gKHRpbGUgPj4gOCkgJiAweGYwIHwgKHRpbGUgPj4gNCkgJiAweGY7XG4gICAgY29uc3QgeHQgPSAodGlsZSA+PiA0KSAmIDB4ZjAgfCB0aWxlICYgMHhmO1xuICAgIGxldCBib2F0RXhpdDtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0Lnl0ID09PSB5dCAmJiBleGl0Lnh0IDwgeHQpIGJvYXRFeGl0ID0gZXhpdDtcbiAgICB9XG4gICAgaWYgKCFib2F0RXhpdCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBib2F0IGV4aXRgKTtcbiAgICAvLyBUT0RPIC0gbG9vayB1cCB0aGUgZW50cmFuY2UuXG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tib2F0RXhpdC5kZXN0XTtcbiAgICBpZiAoIWRlc3QpIHRocm93IG5ldyBFcnJvcihgQmFkIGRlc3RpbmF0aW9uYCk7XG4gICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tib2F0RXhpdC5lbnRyYW5jZV07XG4gICAgY29uc3QgZW50cmFuY2VUaWxlID0gVGlsZUlkLmZyb20oZGVzdCwgZW50cmFuY2UpO1xuICAgIGxldCB0ID0gZW50cmFuY2VUaWxlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB0ID0gVGlsZUlkLmFkZCh0LCAwLCAtMSk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KTtcbiAgICAgIGlmICh0MSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJvYXQ6IFRlcnJhaW4gPSB7XG4gICAgICAgICAgZW50ZXI6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudHMpLFxuICAgICAgICAgIGV4aXQ6IFtbMHhmLCBSZXF1aXJlbWVudC5PUEVOXV0sXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGJvYXQgdHJpZ2dlci5cbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKFt0MF0sIGJvYXQpO1xuICAgICAgICB0aGlzLmV4aXRzLnNldCh0MCwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKHQwLCB0MSkpO1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBlbnRyYW5jZSB3ZSBwYXNzZWRcbiAgICAgICAgLy8gKHRoaXMgaXMgcHJpbWFyaWx5IG5lY2Vzc2FyeSBmb3Igd2lsZCB3YXJwIHRvIHdvcmsgaW4gbG9naWMpLlxuICAgICAgICB0aGlzLmV4aXRzLnNldChlbnRyYW5jZVRpbGUsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZihlbnRyYW5jZVRpbGUsIHQxKSk7XG4gICAgICAgIHRoaXMudGVycmFpbnMuc2V0KGVudHJhbmNlVGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKDApISk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94OiBIaXRib3gsIHJlcTogUmVxdWlyZW1lbnQsIGdyYW50SWQ6IG51bWJlcikge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1HcmFudChncmFudElkKTtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBpdGVtO1xuICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBpdGVtIGdyYW50IGZvciAke2dyYW50SWQudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICAvLyBpcyB0aGUgMTAwIGZsYWcgc3VmZmljaWVudCBoZXJlPyAgcHJvYmFibHk/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSBncmFudElkID49IDB4ODA7IC8vIGdyYW50ZWQgZnJvbSBhIHRyaWdnZXJcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgc2xvdCxcbiAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZSwgcHJldmVudExvc3N9KTtcbiAgfVxuXG4gIGFkZFRlcnJhaW4oaGl0Ym94OiBIaXRib3gsIHRlcnJhaW46IFRlcnJhaW4pIHtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy50ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICBpZiAodCA9PSBudWxsKSBjb250aW51ZTsgLy8gdW5yZWFjaGFibGUgdGlsZXMgZG9uJ3QgbmVlZCBleHRyYSByZXFzXG4gICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5Lm1lZXQodCwgdGVycmFpbikpO1xuICAgIH1cbiAgfVxuXG4gIGFkZENoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGNoZWNrczogbnVtYmVyW10pIHtcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxdWlyZW1lbnQpKSByZXR1cm47IC8vIGRvIG5vdGhpbmcgaWYgdW5yZWFjaGFibGVcbiAgICBjb25zdCBjaGVjayA9IHtyZXF1aXJlbWVudDogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50KSwgY2hlY2tzfTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHRpbGUpKSBjb250aW51ZTtcbiAgICAgIHRoaXMuY2hlY2tzLmdldCh0aWxlKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1DaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LFxuICAgICAgICAgICAgICAgY2hlY2s6IG51bWJlciwgc2xvdDogU2xvdEluZm8pIHtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIFtjaGVja10pO1xuICAgIHRoaXMuc2xvdHMuc2V0KGNoZWNrLCBzbG90KTtcbiAgICAvLyBhbHNvIGFkZCBjb3JyZXNwb25kaW5nIEl0ZW1JbmZvIHRvIGtlZXAgdGhlbSBpbiBwYXJpdHkuXG4gICAgY29uc3QgaXRlbWdldCA9IHRoaXMucm9tLml0ZW1HZXRzW3RoaXMucm9tLnNsb3RzW2NoZWNrICYgMHhmZl1dO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1tpdGVtZ2V0Lml0ZW1JZF07XG4gICAgY29uc3QgdW5pcXVlID0gaXRlbT8udW5pcXVlO1xuICAgIGNvbnN0IGxvc2FibGUgPSBpdGVtZ2V0LmlzTG9zYWJsZSgpO1xuICAgIC8vIFRPRE8gLSByZWZhY3RvciB0byBqdXN0IFwiY2FuJ3QgYmUgYm91Z2h0XCI/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSB1bmlxdWUgfHwgaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuT3BlbFN0YXR1ZTtcbiAgICBsZXQgd2VpZ2h0ID0gMTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldpbmQpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZGaXJlKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2F0ZXIpIHdlaWdodCA9IDEwO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mVGh1bmRlcikgd2VpZ2h0ID0gMTU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLkZsaWdodCkgd2VpZ2h0ID0gMTU7XG4gICAgdGhpcy5pdGVtcy5zZXQoMHgyMDAgfCBpdGVtZ2V0LmlkLCB7dW5pcXVlLCBsb3NhYmxlLCBwcmV2ZW50TG9zcywgd2VpZ2h0fSk7XG4gIH1cblxuICBhZGRDaGVja0Zyb21GbGFncyhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBmbGFnczogbnVtYmVyW10pIHtcbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIGNoZWNrcyk7XG4gIH1cblxuICB3YWxrYWJsZU5laWdoYm9yKHQ6IFRpbGVJZCk6IFRpbGVJZHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodCkpIHJldHVybiB0O1xuICAgIGZvciAobGV0IGQgb2YgWy0xLCAxXSkge1xuICAgICAgY29uc3QgdDEgPSBUaWxlSWQuYWRkKHQsIGQsIDApO1xuICAgICAgY29uc3QgdDIgPSBUaWxlSWQuYWRkKHQsIDAsIGQpO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MSkpIHJldHVybiB0MTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDIpKSByZXR1cm4gdDI7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpc1dhbGthYmxlKHQ6IFRpbGVJZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKHRoaXMuZ2V0RWZmZWN0cyh0KSAmIFRlcnJhaW4uQklUUyk7XG4gIH1cblxuICBlbnN1cmVQYXNzYWJsZSh0OiBUaWxlSWQpOiBUaWxlSWQge1xuICAgIHJldHVybiB0aGlzLmlzV2Fsa2FibGUodCkgPyB0IDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQ7XG4gIH1cblxuICBnZXRFZmZlY3RzKHQ6IFRpbGVJZCk6IG51bWJlciB7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbdCA+Pj4gMTZdO1xuICAgIC8vY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgZWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM10uZWZmZWN0cztcbiAgICBjb25zdCBzY3IgPSBsb2NhdGlvbi5zY3JlZW5zWyh0ICYgMHhmMDAwKSA+Pj4gMTJdWyh0ICYgMHhmMDApID4+PiA4XTtcbiAgICByZXR1cm4gZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3Njcl0udGlsZXNbdCAmIDB4ZmZdXTtcbiAgfVxuXG4gIHByb2Nlc3NCb3NzKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gQm9zc2VzIHdpbGwgY2xvYmJlciB0aGUgZW50cmFuY2UgcG9ydGlvbiBvZiBhbGwgdGlsZXMgb24gdGhlIHNjcmVlbixcbiAgICAvLyBhbmQgd2lsbCBhbHNvIGFkZCB0aGVpciBkcm9wLlxuICAgIGlmIChzcGF3bi5pZCA9PT0gMHhjOSB8fCBzcGF3bi5pZCA9PT0gMHhjYSkgcmV0dXJuOyAvLyBzdGF0dWVzXG4gICAgY29uc3QgaXNSYWdlID0gc3Bhd24uaWQgPT09IDB4YzM7XG4gICAgY29uc3QgYm9zcyA9XG4gICAgICAgIGlzUmFnZSA/IHRoaXMucm9tLmJvc3Nlcy5SYWdlIDpcbiAgICAgICAgdGhpcy5yb20uYm9zc2VzLmZyb21Mb2NhdGlvbihsb2NhdGlvbi5pZCk7XG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgaWYgKCFib3NzIHx8ICFib3NzLmZsYWcpIHRocm93IG5ldyBFcnJvcihgQmFkIGJvc3MgYXQgJHtsb2NhdGlvbi5uYW1lfWApO1xuICAgIGNvbnN0IHNjcmVlbiA9IHRpbGUgJiB+MHhmZjtcbiAgICAvLyBOT1RFOiBSYWdlIGNhbiBiZSBleGl0ZWQgc291dGguLi4gYnV0IHRoaXMgb25seSBtYXR0ZXJzIGlmIHRoZXJlJ3NcbiAgICAvLyBhbnl0aGluZyBvdGhlciB0aGFuIE1lc2lhJ3Mgc2hyaW5lIGJlaGluZCBoaW0sIHdoaWNoIG1ha2VzIGEgbG90IG9mXG4gICAgLy8gbG9naWMgbW9yZSBkaWZmaWN1bHQsIHNvIGxpa2VseSB0aGlzIGVudHJhbmNlIHdpbGwgc3RheSBwdXQgZm9yZXZlci5cbiAgICBjb25zdCBib3NzVGVycmFpbiA9IHRoaXMudGVycmFpbkZhY3RvcnkuYm9zcyhib3NzLmZsYWcuaWQpO1xuICAgIGNvbnN0IGhpdGJveCA9IHNlcSgweGYwLCAodDogbnVtYmVyKSA9PiAoc2NyZWVuIHwgdCkgYXMgVGlsZUlkKTtcbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCBib3NzVGVycmFpbik7XG4gICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCBib3NzKTtcbiAgfVxuXG4gIGFkZEJvc3NDaGVjayhoaXRib3g6IEhpdGJveCwgYm9zczogQm9zcyxcbiAgICAgICAgICAgICAgIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQgPSBSZXF1aXJlbWVudC5PUEVOKSB7XG4gICAgaWYgKGJvc3MuZmxhZyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGEgZmxhZzogJHtib3NzfWApO1xuICAgIGNvbnN0IHJlcSA9IFJlcXVpcmVtZW50Lm1lZXQocmVxdWlyZW1lbnRzLCB0aGlzLmJvc3NSZXF1aXJlbWVudHMoYm9zcykpO1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtib3NzLmZsYWcuaWRdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgaGl0Ym94LCByZXEsIGJvc3MuZmxhZy5pZCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0NoZXN0KGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gQWRkIGEgY2hlY2sgZm9yIHRoZSAxeHggZmxhZy4gIE1ha2Ugc3VyZSBpdCdzIG5vdCBhIG1pbWljLlxuICAgIGlmICh0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF0gPj0gMHg3MCkgcmV0dXJuO1xuICAgIGNvbnN0IHNsb3QgPSAweDEwMCB8IHNwYXduLmlkO1xuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXTtcbiAgICBpZiAobWFwcGVkID49IDB4NzApIHJldHVybjsgLy8gVE9ETyAtIG1pbWljJSBtYXkgY2FyZVxuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1ttYXBwZWRdO1xuICAgIGNvbnN0IHVuaXF1ZSA9IHRoaXMuZmxhZ3NldC5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpID8gISFpdGVtPy51bmlxdWUgOiB0cnVlO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSwgUmVxdWlyZW1lbnQuT1BFTixcbiAgICAgICAgICAgICAgICAgICAgICBzbG90LCB7bG9zc3k6IGZhbHNlLCB1bmlxdWV9KTtcbiAgfVxuXG4gIHByb2Nlc3NNb25zdGVyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG5cbiAgICAvLyBUT0RPIC0gY3VycmVudGx5IGRvbid0IGhhbmRsZSBmbHllcnMgd2VsbCAtIGNvdWxkIGluc3RlYWQgYWRkIGZseWVyc1xuICAgIC8vICAgICAgICB0byBhbGwgZW50cmFuY2VzP1xuXG4gICAgLy8gQ2hlY2sgbW9uc3RlcidzIHZ1bG5lcmFiaWxpdGllcyBhbmQgYWRkIGEgY2hlY2sgZm9yIE1vbmV5IGdpdmVuIHN3b3Jkcy5cbiAgICBjb25zdCBtb25zdGVyID0gdGhpcy5yb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgcmV0dXJuO1xuICAgIGlmICghKG1vbnN0ZXIuZ29sZERyb3ApKSByZXR1cm47XG4gICAgY29uc3Qge1xuICAgICAgTW9uZXksXG4gICAgICBTd29yZCwgU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyLFxuICAgIH0gPSB0aGlzLnJvbS5mbGFncztcbiAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV07XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgU3dvcmQuciwgW01vbmV5LmlkXSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHN3b3JkcyA9XG4gICAgICAgIFtTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXJdXG4gICAgICAgICAgICAuZmlsdGVyKChfLCBpKSA9PiBtb25zdGVyLmVsZW1lbnRzICYgKDEgPDwgaSkpO1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBjb2xsZWN0aW5nIGFsbCB0aGUgZWxlbWVudHMgaW4gb25lIHBsYWNlIGZpcnN0XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIG9yKC4uLnN3b3JkcyksIFtNb25leS5pZF0pO1xuICB9XG5cbiAgcHJvY2Vzc0l0ZW1Vc2UoaGl0Ym94OiBIaXRib3gsIHJlcTE6IFJlcXVpcmVtZW50LCBpdGVtOiBJdGVtLCB1c2U6IEl0ZW1Vc2UpIHtcbiAgICAvLyB0aGlzIHNob3VsZCBoYW5kbGUgbW9zdCB0cmFkZS1pbnMgYXV0b21hdGljYWxseVxuICAgIGhpdGJveCA9IG5ldyBTZXQoWy4uLmhpdGJveF0ubWFwKHQgPT4gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQpKTtcbiAgICBjb25zdCByZXEyID0gW1soMHgyMDAgfCBpdGVtLmlkKSBhcyBDb25kaXRpb25dXTsgLy8gcmVxdWlyZXMgdGhlIGl0ZW0uXG4gICAgLy8gY2hlY2sgZm9yIGtpcmlzYSBwbGFudCwgYWRkIGNoYW5nZSBhcyBhIHJlcXVpcmVtZW50LlxuICAgIGlmIChpdGVtLmlkID09PSB0aGlzLnJvbS5wcmdbMHgzZDRiNV0gKyAweDFjKSB7XG4gICAgICByZXEyWzBdLnB1c2godGhpcy5yb20uZmxhZ3MuQ2hhbmdlLmMpO1xuICAgIH1cbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuTWVkaWNhbEhlcmIpIHsgLy8gZG9scGhpblxuICAgICAgcmVxMlswXVswXSA9IHRoaXMucm9tLmZsYWdzLkJ1eUhlYWxpbmcuYzsgLy8gbm90ZTogbm8gb3RoZXIgaGVhbGluZyBpdGVtc1xuICAgIH1cbiAgICBjb25zdCByZXEgPSBSZXF1aXJlbWVudC5tZWV0KHJlcTEsIHJlcTIpO1xuICAgIC8vIHNldCBhbnkgZmxhZ3NcbiAgICB0aGlzLmFkZENoZWNrRnJvbUZsYWdzKGhpdGJveCwgcmVxLCB1c2UuZmxhZ3MpO1xuICAgIC8vIGhhbmRsZSBhbnkgZXh0cmEgYWN0aW9uc1xuICAgIHN3aXRjaCAodXNlLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MTA6XG4gICAgICAgIC8vIHVzZSBrZXlcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKGhpdGJveCwgcmVxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDg6IGNhc2UgMHgwYjogY2FzZSAweDBjOiBjYXNlIDB4MGQ6IGNhc2UgMHgwZjogY2FzZSAweDFjOlxuICAgICAgICAvLyBmaW5kIGl0ZW1ncmFudCBmb3IgaXRlbSBJRCA9PiBhZGQgY2hlY2tcbiAgICAgICAgdGhpcy5hZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94LCByZXEsIGl0ZW0uaWQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgwMjpcbiAgICAgICAgLy8gZG9scGhpbiBkZWZlcnMgdG8gZGlhbG9nIGFjdGlvbiAxMSAoYW5kIDBkIHRvIHN3aW0gYXdheSlcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDB4MTAwIHwgdGhpcy5yb20ubnBjc1t1c2Uud2FudCAmIDB4ZmZdLmRhdGFbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NLZXlVc2UoaGl0Ym94OiBIaXRib3gsIHJlcTogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBzZXQgdGhlIGN1cnJlbnQgc2NyZWVuJ3MgZmxhZyBpZiB0aGUgY29uZGl0aW9ucyBhcmUgbWV0Li4uXG4gICAgLy8gbWFrZSBzdXJlIHRoZXJlJ3Mgb25seSBhIHNpbmdsZSBzY3JlZW4uXG4gICAgY29uc3QgW3NjcmVlbiwgLi4ucmVzdF0gPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IFNjcmVlbklkLmZyb20odCkpKTtcbiAgICBpZiAoc2NyZWVuID09IG51bGwgfHwgcmVzdC5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgb25lIHNjcmVlbmApO1xuICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW3NjcmVlbiA+Pj4gOF07XG4gICAgY29uc3QgZmxhZyA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gKHNjcmVlbiAmIDB4ZmYpKTtcbiAgICBpZiAoZmxhZyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGZsYWcgb24gc2NyZWVuYCk7XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcSwgW2ZsYWcuZmxhZ10pO1xuICB9XG5cbiAgYm9zc1JlcXVpcmVtZW50cyhib3NzOiBCb3NzKTogUmVxdWlyZW1lbnQge1xuICAgIC8vIFRPRE8gLSBoYW5kbGUgYm9zcyBzaHVmZmxlIHNvbWVob3c/XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5SYWdlKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIFJhZ2UuICBGaWd1cmUgb3V0IHdoYXQgaGUgd2FudHMgZnJvbSB0aGUgZGlhbG9nLlxuICAgICAgY29uc3QgdW5rbm93blN3b3JkID0gdGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5yYW5kb21pemVUcmFkZXMoKTtcbiAgICAgIGlmICh1bmtub3duU3dvcmQpIHJldHVybiB0aGlzLnJvbS5mbGFncy5Td29yZC5yOyAvLyBhbnkgc3dvcmQgbWlnaHQgZG8uXG4gICAgICByZXR1cm4gW1t0aGlzLnJvbS5ucGNzLlJhZ2UuZGlhbG9nKClbMF0uY29uZGl0aW9uIGFzIENvbmRpdGlvbl1dO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGJvc3Mub2JqZWN0O1xuICAgIGNvbnN0IHIgPSBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcigpO1xuICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFnc2V0LnNodWZmbGVCb3NzRWxlbWVudHMoKSB8fFxuICAgICAgICAhdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgci5hZGRBbGwodGhpcy5yb20uZmxhZ3MuU3dvcmQucik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVN3b3JkTWFnaWMoKSA/IGJvc3Muc3dvcmRMZXZlbCA6IDE7XG4gICAgICBjb25zdCBvYmogPSB0aGlzLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGlmIChvYmouaXNWdWxuZXJhYmxlKGkpKSByLmFkZEFsbCh0aGlzLnN3b3JkUmVxdWlyZW1lbnQoaSwgbGV2ZWwpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2FuJ3QgYWN0dWFsbHkga2lsbCB0aGUgYm9zcyBpZiBpdCBkb2Vzbid0IHNwYXduLlxuICAgIGNvbnN0IGV4dHJhOiBDb25kaXRpb25bXSA9IFtdO1xuICAgIGlmIChib3NzLm5wYyAhPSBudWxsICYmIGJvc3MubG9jYXRpb24gIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc3Bhd25Db25kaXRpb24gPSBib3NzLm5wYy5zcGF3bnModGhpcy5yb20ubG9jYXRpb25zW2Jvc3MubG9jYXRpb25dKTtcbiAgICAgIGV4dHJhLnB1c2goLi4udGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb24pWzBdKTtcbiAgICB9XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5JbnNlY3QpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuSW5zZWN0Rmx1dGUuYywgdGhpcy5yb20uZmxhZ3MuR2FzTWFzay5jKTtcbiAgICB9IGVsc2UgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5EcmF5Z29uMikge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5Cb3dPZlRydXRoLmMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVJlZnJlc2goKSkge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5SZWZyZXNoLmMpO1xuICAgIH1cbiAgICByLnJlc3RyaWN0KFtleHRyYV0pO1xuICAgIHJldHVybiBSZXF1aXJlbWVudC5mcmVlemUocik7XG4gIH1cblxuICBzd29yZFJlcXVpcmVtZW50KGVsZW1lbnQ6IG51bWJlciwgbGV2ZWw6IG51bWJlcik6IFJlcXVpcmVtZW50IHtcbiAgICBjb25zdCBzd29yZCA9IFtcbiAgICAgIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZXaW5kLCB0aGlzLnJvbS5mbGFncy5Td29yZE9mRmlyZSxcbiAgICAgIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZlRodW5kZXIsXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDEpIHJldHVybiBzd29yZC5yO1xuICAgIGNvbnN0IHBvd2VycyA9IFtcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXaW5kLCB0aGlzLnJvbS5mbGFncy5Ub3JuYWRvQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZkZpcmUsIHRoaXMucm9tLmZsYWdzLkZsYW1lQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZldhdGVyLCB0aGlzLnJvbS5mbGFncy5CbGl6emFyZEJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZUaHVuZGVyLCB0aGlzLnJvbS5mbGFncy5TdG9ybUJyYWNlbGV0XSxcbiAgICBdW2VsZW1lbnRdO1xuICAgIGlmIChsZXZlbCA9PT0gMykgcmV0dXJuIGFuZChzd29yZCwgLi4ucG93ZXJzKTtcbiAgICByZXR1cm4gcG93ZXJzLm1hcChwb3dlciA9PiBbc3dvcmQuYywgcG93ZXIuY10pO1xuICB9XG5cbiAgaXRlbUdyYW50KGlkOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHRoaXMucm9tLml0ZW1HZXRzLmFjdGlvbkdyYW50cykge1xuICAgICAgaWYgKGtleSA9PT0gaWQpIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBpdGVtIGdyYW50ICR7aWQudG9TdHJpbmcoMTYpfWApO1xuICB9XG5cbiAgLyoqIFJldHVybiBhIFJlcXVpcmVtZW50IGZvciBhbGwgb2YgdGhlIGZsYWdzIGJlaW5nIG1ldC4gKi9cbiAgZmlsdGVyUmVxdWlyZW1lbnRzKGZsYWdzOiBudW1iZXJbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gICAgY29uc3QgY29uZHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnIDwgMCkge1xuICAgICAgICBjb25zdCBsb2dpYyA9IHRoaXMuZmxhZyh+ZmxhZyk/LmxvZ2ljO1xuICAgICAgICBpZiAobG9naWM/LmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5DTE9TRUQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgICBpZiAoZj8ubG9naWMuYXNzdW1lRmFsc2UpIHJldHVybiBSZXF1aXJlbWVudC5DTE9TRUQ7XG4gICAgICAgIGlmIChmPy5sb2dpYy50cmFjaykgY29uZHMucHVzaChmLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbY29uZHNdO1xuICB9XG5cbiAgLyoqIFJldHVybiBhIFJlcXVpcmVtZW50IGZvciBzb21lIGZsYWcgbm90IGJlaW5nIG1ldC4gKi9cbiAgZmlsdGVyQW50aVJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IHJlcSA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgaWYgKGZsYWcgPj0gMCkge1xuICAgICAgICBjb25zdCBsb2dpYyA9IHRoaXMuZmxhZyh+ZmxhZyk/LmxvZ2ljO1xuICAgICAgICBpZiAobG9naWM/LmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuT1BFTjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcofmZsYWcpO1xuICAgICAgICBpZiAoZj8ubG9naWMuYXNzdW1lVHJ1ZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICAgIGlmIChmPy5sb2dpYy50cmFjaykgcmVxLnB1c2goW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXE7XG4gIH1cblxuICBmbGFnKGZsYWc6IG51bWJlcik6IEZsYWd8dW5kZWZpbmVkIHtcbiAgICAvL2NvbnN0IHVuc2lnbmVkID0gZmxhZyA8IDAgPyB+ZmxhZyA6IGZsYWc7XG4gICAgY29uc3QgdW5zaWduZWQgPSBmbGFnOyAgLy8gVE9ETyAtIHNob3VsZCB3ZSBhdXRvLWludmVydD9cbiAgICBjb25zdCBmID0gdGhpcy5yb20uZmxhZ3NbdW5zaWduZWRdO1xuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMuYWxpYXNlcy5nZXQoZikgPz8gZjtcbiAgICByZXR1cm4gbWFwcGVkO1xuICB9XG5cbiAgZW50cmFuY2UobG9jYXRpb246IExvY2F0aW9ufG51bWJlciwgaW5kZXggPSAwKTogVGlsZUlkIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uID09PSAnbnVtYmVyJykgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbbG9jYXRpb25dO1xuICAgIHJldHVybiB0aGlzLnRpbGVzLmZpbmQoVGlsZUlkLmZyb20obG9jYXRpb24sIGxvY2F0aW9uLmVudHJhbmNlc1tpbmRleF0pKTtcbiAgfVxuXG4gIHdhbGxDYXBhYmlsaXR5KHdhbGw6IFdhbGxUeXBlKTogbnVtYmVyIHtcbiAgICBzd2l0Y2ggKHdhbGwpIHtcbiAgICAgIGNhc2UgV2FsbFR5cGUuV0lORDogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrU3RvbmUuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLkZJUkU6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha0ljZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuV0FURVI6IHJldHVybiB0aGlzLnJvbS5mbGFncy5Gb3JtQnJpZGdlLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5USFVOREVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJcm9uLmlkO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGBiYWQgd2FsbCB0eXBlOiAke3dhbGx9YCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFuZCguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuU2luZ2xlIHtcbiAgcmV0dXJuIFtmbGFncy5tYXAoKGY6IEZsYWcpID0+IGYuaWQgYXMgQ29uZGl0aW9uKV07XG59XG5cbmZ1bmN0aW9uIG9yKC4uLmZsYWdzOiBGbGFnW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICByZXR1cm4gZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBbZi5pZCBhcyBDb25kaXRpb25dKTtcbn1cblxuLy8gQW4gaW50ZXJlc3Rpbmcgd2F5IHRvIHRyYWNrIHRlcnJhaW4gY29tYmluYXRpb25zIGlzIHdpdGggcHJpbWVzLlxuLy8gSWYgd2UgaGF2ZSBOIGVsZW1lbnRzIHdlIGNhbiBsYWJlbCBlYWNoIGF0b20gd2l0aCBhIHByaW1lIGFuZFxuLy8gdGhlbiBsYWJlbCBhcmJpdHJhcnkgY29tYmluYXRpb25zIHdpdGggdGhlIHByb2R1Y3QuICBGb3IgTj0xMDAwXG4vLyB0aGUgaGlnaGVzdCBudW1iZXIgaXMgODAwMCwgc28gdGhhdCBpdCBjb250cmlidXRlcyBhYm91dCAxMyBiaXRzXG4vLyB0byB0aGUgcHJvZHVjdCwgbWVhbmluZyB3ZSBjYW4gc3RvcmUgY29tYmluYXRpb25zIG9mIDQgc2FmZWx5XG4vLyB3aXRob3V0IHJlc29ydGluZyB0byBiaWdpbnQuICBUaGlzIGlzIGluaGVyZW50bHkgb3JkZXItaW5kZXBlbmRlbnQuXG4vLyBJZiB0aGUgcmFyZXIgb25lcyBhcmUgaGlnaGVyLCB3ZSBjYW4gZml0IHNpZ25pZmljYW50bHkgbW9yZSB0aGFuIDQuXG5cbmNvbnN0IERFQlVHID0gZmFsc2U7XG5cbi8vIERlYnVnIGludGVyZmFjZS5cbmV4cG9ydCBpbnRlcmZhY2UgQXJlYURhdGEge1xuICBpZDogbnVtYmVyO1xuICB0aWxlczogU2V0PFRpbGVJZD47XG4gIGNoZWNrczogQXJyYXk8W0ZsYWcsIFJlcXVpcmVtZW50XT47XG4gIHRlcnJhaW46IFRlcnJhaW47XG4gIGxvY2F0aW9uczogU2V0PG51bWJlcj47XG4gIHJvdXRlczogUmVxdWlyZW1lbnQuRnJvemVuO1xufVxuZXhwb3J0IGludGVyZmFjZSBUaWxlRGF0YSB7XG4gIGFyZWE6IEFyZWFEYXRhO1xuICBleGl0PzogVGlsZUlkO1xufVxuZXhwb3J0IGludGVyZmFjZSBMb2NhdGlvbkRhdGEge1xuICBhcmVhczogU2V0PEFyZWFEYXRhPjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xufVxuZXhwb3J0IGludGVyZmFjZSBXb3JsZERhdGEge1xuICB0aWxlczogTWFwPFRpbGVJZCwgVGlsZURhdGE+O1xuICBhcmVhczogQXJlYURhdGFbXTtcbiAgbG9jYXRpb25zOiBMb2NhdGlvbkRhdGFbXTtcbn1cbiJdfQ==