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
            const fc = this.flag(d.condition);
            if ((f === null || f === void 0 ? void 0 : f.logic.assumeFalse) || (fc === null || fc === void 0 ? void 0 : fc.logic.assumeTrue))
                return;
            if (f === null || f === void 0 ? void 0 : f.logic.track)
                conds.push(f.id);
        }
        const locals = (_c = (_b = npc.localDialogs.get(location.id)) !== null && _b !== void 0 ? _b : npc.localDialogs.get(-1)) !== null && _c !== void 0 ? _c : [];
        for (const d of locals) {
            const r = [...conds];
            const f0 = this.flag(d.condition);
            const f1 = this.flag(~d.condition);
            if (f0 === null || f0 === void 0 ? void 0 : f0.logic.track)
                r.push(f0.id);
            if (!(f0 === null || f0 === void 0 ? void 0 : f0.logic.assumeFalse) && !(f1 === null || f1 === void 0 ? void 0 : f1.logic.assumeTrue)) {
                this.processDialog(hitbox, npc, r, d);
            }
            if ((f0 === null || f0 === void 0 ? void 0 : f0.logic.assumeTrue) || (f1 === null || f1 === void 0 ? void 0 : f1.logic.assumeFalse))
                break;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQW1FaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVB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LENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDUCxFQUFFLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQzFELENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBELElBQUksSUFBSSxDQUFD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LENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQUUsU0FBUztZQUMvRCxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2xEO0lBQ0gsQ0FBQztJQUVELHVCQUF1QixDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsR0FBUTtRQUV0RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFL0IsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDL0Q7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFFL0IsTUFBTSxHQUFHLEdBQUcs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LEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzFELE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFHLEtBQWE7SUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLEtBQWE7SUFDMUIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFVRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FyZWF9IGZyb20gJy4uL3Nwb2lsZXIvYXJlYS5qcyc7XG5pbXBvcnQge2RpZX0gZnJvbSAnLi4vYXNzZXJ0LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7RmxhZywgTG9naWN9IGZyb20gJy4uL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0l0ZW0sIEl0ZW1Vc2V9IGZyb20gJy4uL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtMb2NhbERpYWxvZywgTnBjfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4LCBzZXF9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwLCBMYWJlbGVkU2V0LCBpdGVycywgc3ByZWFkfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7RGlyfSBmcm9tICcuL2Rpci5qcyc7XG5pbXBvcnQge0l0ZW1JbmZvLCBMb2NhdGlvbkxpc3QsIFNsb3RJbmZvfSBmcm9tICcuL2dyYXBoLmpzJztcbmltcG9ydCB7SGl0Ym94fSBmcm9tICcuL2hpdGJveC5qcyc7XG5pbXBvcnQge0NvbmRpdGlvbiwgUmVxdWlyZW1lbnQsIFJvdXRlfSBmcm9tICcuL3JlcXVpcmVtZW50LmpzJztcbmltcG9ydCB7U2NyZWVuSWR9IGZyb20gJy4vc2NyZWVuaWQuanMnO1xuaW1wb3J0IHtUZXJyYWluLCBUZXJyYWluc30gZnJvbSAnLi90ZXJyYWluLmpzJztcbmltcG9ydCB7VGlsZUlkfSBmcm9tICcuL3RpbGVpZC5qcyc7XG5pbXBvcnQge1RpbGVQYWlyfSBmcm9tICcuL3RpbGVwYWlyLmpzJztcbmltcG9ydCB7V2FsbFR5cGV9IGZyb20gJy4vd2FsbHR5cGUuanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4uL3JvbS9tb25zdGVyLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuaW50ZXJmYWNlIENoZWNrIHtcbiAgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50O1xuICBjaGVja3M6IG51bWJlcltdO1xufVxuXG4vLyBCYXNpYyBhbGdvcml0aG06XG4vLyAgMS4gZmlsbCB0ZXJyYWlucyBmcm9tIG1hcHNcbi8vICAyLiBtb2RpZnkgdGVycmFpbnMgYmFzZWQgb24gbnBjcywgdHJpZ2dlcnMsIGJvc3NlcywgZXRjXG4vLyAgMi4gZmlsbCBhbGxFeGl0c1xuLy8gIDMuIHN0YXJ0IHVuaW9uZmluZFxuLy8gIDQuIGZpbGwgLi4uP1xuXG4vKiogU3RvcmVzIGFsbCB0aGUgcmVsZXZhbnQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHdvcmxkJ3MgbG9naWMuICovXG5leHBvcnQgY2xhc3MgV29ybGQge1xuXG4gIC8qKiBCdWlsZHMgYW5kIGNhY2hlcyBUZXJyYWluIG9iamVjdHMuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5GYWN0b3J5ID0gbmV3IFRlcnJhaW5zKHRoaXMucm9tKTtcblxuICAvKiogVGVycmFpbnMgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbnMgPSBuZXcgTWFwPFRpbGVJZCwgVGVycmFpbj4oKTtcblxuICAvKiogQ2hlY2tzIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IGNoZWNrcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgU2V0PENoZWNrPj4oKCkgPT4gbmV3IFNldCgpKTtcblxuICAvKiogU2xvdCBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgc2xvdHMgPSBuZXcgTWFwPG51bWJlciwgU2xvdEluZm8+KCk7XG4gIC8qKiBJdGVtIGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBpdGVtcyA9IG5ldyBNYXA8bnVtYmVyLCBJdGVtSW5mbz4oKTtcblxuICAvKiogRmxhZ3MgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBkaXJlY3QgYWxpYXNlcyBmb3IgbG9naWMuICovXG4gIHJlYWRvbmx5IGFsaWFzZXM6IE1hcDxGbGFnLCBGbGFnPjtcblxuICAvKiogTWFwcGluZyBmcm9tIGl0ZW11c2UgdHJpZ2dlcnMgdG8gdGhlIGl0ZW11c2UgdGhhdCB3YW50cyBpdC4gKi9cbiAgcmVhZG9ubHkgaXRlbVVzZXMgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIFtJdGVtLCBJdGVtVXNlXVtdPigoKSA9PiBbXSk7XG5cbiAgLyoqIFJhdyBtYXBwaW5nIG9mIGV4aXRzLCB3aXRob3V0IGNhbm9uaWNhbGl6aW5nLiAqL1xuICByZWFkb25seSBleGl0cyA9IG5ldyBNYXA8VGlsZUlkLCBUaWxlSWQ+KCk7XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBleGl0cyB0byBlbnRyYW5jZXMuICBUaWxlUGFpciBpcyBjYW5vbmljYWxpemVkLiAqL1xuICByZWFkb25seSBleGl0U2V0ID0gbmV3IFNldDxUaWxlUGFpcj4oKTtcblxuICAvKipcbiAgICogU2V0IG9mIFRpbGVJZHMgd2l0aCBzZWFtbGVzcyBleGl0cy4gIFRoaXMgaXMgdXNlZCB0byBlbnN1cmUgdGhlXG4gICAqIGxvZ2ljIHVuZGVyc3RhbmRzIHRoYXQgdGhlIHBsYXllciBjYW4ndCB3YWxrIGFjcm9zcyBhbiBleGl0IHRpbGVcbiAgICogd2l0aG91dCBjaGFuZ2luZyBsb2NhdGlvbnMgKHByaW1hcmlseSBmb3IgZGlzYWJsaW5nIHRlbGVwb3J0XG4gICAqIHNraXApLlxuICAgKi9cbiAgcmVhZG9ubHkgc2VhbWxlc3NFeGl0cyA9IG5ldyBTZXQ8VGlsZUlkPigpO1xuXG4gIC8qKlxuICAgKiBVbmlvbmZpbmQgb2YgY29ubmVjdGVkIGNvbXBvbmVudHMgb2YgdGlsZXMuICBOb3RlIHRoYXQgYWxsIHRoZVxuICAgKiBhYm92ZSBwcm9wZXJ0aWVzIGNhbiBiZSBidWlsdCB1cCBpbiBwYXJhbGxlbCwgYnV0IHRoZSB1bmlvbmZpbmRcbiAgICogY2Fubm90IGJlIHN0YXJ0ZWQgdW50aWwgYWZ0ZXIgYWxsIHRlcnJhaW5zIGFuZCBleGl0cyBhcmVcbiAgICogcmVnaXN0ZXJlZCwgc2luY2Ugd2Ugc3BlY2lmaWNhbGx5IG5lZWQgdG8gKm5vdCogdW5pb24gY2VydGFpblxuICAgKiBuZWlnaGJvcnMuXG4gICAqL1xuICByZWFkb25seSB0aWxlcyA9IG5ldyBVbmlvbkZpbmQ8VGlsZUlkPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgVGlsZVBhaXJzIG9mIGNhbm9uaWNhbCB1bmlvbmZpbmQgcmVwcmVzZW50YXRpdmUgVGlsZUlkcyB0b1xuICAgKiBhIGJpdHNldCBvZiBuZWlnaGJvciBkaXJlY3Rpb25zLiAgV2Ugb25seSBuZWVkIHRvIHdvcnJ5IGFib3V0XG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIGJlY2F1c2UgYWxsIFRpbGVJZHMgaGF2ZSB0aGUgc2FtZSB0ZXJyYWluLlxuICAgKiBXZSB3aWxsIGFkZCBhIHJvdXRlIGZvciBlYWNoIGRpcmVjdGlvbiB3aXRoIHVuaXF1ZSByZXF1aXJlbWVudHMuXG4gICAqL1xuICByZWFkb25seSBuZWlnaGJvcnMgPSBuZXcgRGVmYXVsdE1hcDxUaWxlUGFpciwgbnVtYmVyPigoKSA9PiAwKTtcblxuICAvKiogUmVxdWlyZW1lbnQgYnVpbGRlciBmb3IgcmVhY2hpbmcgZWFjaCBjYW5vbmljYWwgVGlsZUlkLiAqL1xuICByZWFkb25seSByb3V0ZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcigpKTtcblxuICAvKiogUm91dGVzIG9yaWdpbmF0aW5nIGZyb20gZWFjaCBjYW5vbmljYWwgdGlsZS4gKi9cbiAgcmVhZG9ubHkgcm91dGVFZGdlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIExhYmVsZWRTZXQ8Um91dGU+PigoKSA9PiBuZXcgTGFiZWxlZFNldCgpKTtcblxuICAvKiogTG9jYXRpb24gbGlzdDogdGhpcyBpcyB0aGUgcmVzdWx0IG9mIGNvbWJpbmluZyByb3V0ZXMgd2l0aCBjaGVja3MuICovXG4gIHJlYWRvbmx5IHJlcXVpcmVtZW50TWFwID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPENvbmRpdGlvbiwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKGM6IENvbmRpdGlvbikgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoYykpO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLCByZWFkb25seSBmbGFnc2V0OiBGbGFnU2V0LFxuICAgICAgICAgICAgICByZWFkb25seSB0cmFja2VyID0gZmFsc2UpIHtcbiAgICAvLyBCdWlsZCBpdGVtVXNlc1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiByb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgdXNlIG9mIGl0ZW0uaXRlbVVzZURhdGEpIHtcbiAgICAgICAgaWYgKHVzZS5raW5kID09PSAnZXhwZWN0Jykge1xuICAgICAgICAgIHRoaXMuaXRlbVVzZXMuZ2V0KHVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfSBlbHNlIGlmICh1c2Uua2luZCA9PT0gJ2xvY2F0aW9uJykge1xuICAgICAgICAgIHRoaXMuaXRlbVVzZXMuZ2V0KH51c2Uud2FudCkucHVzaChbaXRlbSwgdXNlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQnVpbGQgYWxpYXNlc1xuICAgIHRoaXMuYWxpYXNlcyA9IG5ldyBNYXAoW1xuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VBa2FoYW5hLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU29sZGllciwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVN0b20sIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VXb21hbiwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5EYW5jZUhhbGwsIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgICAgW3JvbS5mbGFncy5QYXJhbHl6ZWRLZW5zdUluVGF2ZXJuLCByb20uZmxhZ3MuUGFyYWx5c2lzXSxcbiAgICBdKTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgbG9jYXRpb25zIHRvIGJ1aWxkIHVwIGluZm8gYWJvdXQgdGlsZXMsIHRlcnJhaW5zLCBjaGVja3MuXG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbik7XG4gICAgfVxuICAgIHRoaXMuYWRkRXh0cmFDaGVja3MoKTtcblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBVbmlvbkZpbmQgYW5kIHRoZSBleGl0cyBhbmQgbmVpZ2hib3JzIHN0cnVjdHVyZXMuXG4gICAgdGhpcy51bmlvbk5laWdoYm9ycygpO1xuICAgIHRoaXMucmVjb3JkRXhpdHMoKTtcbiAgICB0aGlzLmJ1aWxkTmVpZ2hib3JzKCk7XG5cbiAgICAvLyBCdWlsZCB0aGUgcm91dGVzL2VkZ2VzLlxuICAgIHRoaXMuYWRkQWxsUm91dGVzKCk7XG5cbiAgICAvLyBCdWlsZCB0aGUgbG9jYXRpb24gbGlzdC5cbiAgICB0aGlzLmNvbnNvbGlkYXRlQ2hlY2tzKCk7XG4gICAgdGhpcy5idWlsZFJlcXVpcmVtZW50TWFwKCk7XG4gIH1cblxuICAvKiogQWRkcyBjaGVja3MgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFDaGVja3MoKSB7XG4gICAgY29uc3Qge1xuICAgICAgbG9jYXRpb25zOiB7XG4gICAgICAgIExlYWZfVG9vbFNob3AsXG4gICAgICAgIE1lemFtZVNocmluZSxcbiAgICAgICAgT2FrLFxuICAgICAgICBTaHlyb25fVG9vbFNob3AsXG4gICAgICB9LFxuICAgICAgZmxhZ3M6IHtcbiAgICAgICAgQWJsZVRvUmlkZURvbHBoaW4sXG4gICAgICAgIEJhbGxPZkZpcmUsIEJhbGxPZlRodW5kZXIsIEJhbGxPZldhdGVyLCBCYWxsT2ZXaW5kLFxuICAgICAgICBCYXJyaWVyLCBCbGl6emFyZEJyYWNlbGV0LCBCb3dPZk1vb24sIEJvd09mU3VuLFxuICAgICAgICBCcmVha1N0b25lLCBCcmVha0ljZSwgQnJlYWtJcm9uLFxuICAgICAgICBCcm9rZW5TdGF0dWUsIEJ1eUhlYWxpbmcsIEJ1eVdhcnAsXG4gICAgICAgIENsaW1iV2F0ZXJmYWxsLCBDbGltYlNsb3BlOCwgQ2xpbWJTbG9wZTksIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sXG4gICAgICAgIEZsaWdodCwgRmxhbWVCcmFjZWxldCwgRm9ybUJyaWRnZSxcbiAgICAgICAgR2FzTWFzaywgR2xvd2luZ0xhbXAsXG4gICAgICAgIEluanVyZWREb2xwaGluLFxuICAgICAgICBMZWFkaW5nQ2hpbGQsIExlYXRoZXJCb290cyxcbiAgICAgICAgTW9uZXksXG4gICAgICAgIE9wZW5lZENyeXB0LFxuICAgICAgICBSYWJiaXRCb290cywgUmVmcmVzaCwgUmVwYWlyZWRTdGF0dWUsIFJlc2N1ZWRDaGlsZCxcbiAgICAgICAgU2hlbGxGbHV0ZSwgU2hpZWxkUmluZywgU2hvb3RpbmdTdGF0dWUsIFN0b3JtQnJhY2VsZXQsXG4gICAgICAgIFN3b3JkLCBTd29yZE9mRmlyZSwgU3dvcmRPZlRodW5kZXIsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZldpbmQsXG4gICAgICAgIFRvcm5hZG9CcmFjZWxldCwgVHJhdmVsU3dhbXAsXG4gICAgICAgIFdpbGRXYXJwLFxuICAgICAgfSxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIE1lZGljYWxIZXJiLFxuICAgICAgICBXYXJwQm9vdHMsXG4gICAgICB9LFxuICAgIH0gPSB0aGlzLnJvbTtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMuZW50cmFuY2UoTWV6YW1lU2hyaW5lKTtcbiAgICBjb25zdCBlbnRlck9hayA9IHRoaXMuZW50cmFuY2UoT2FrKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGFuZChCb3dPZk1vb24sIEJvd09mU3VuKSwgW09wZW5lZENyeXB0LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQWJsZVRvUmlkZURvbHBoaW4sIFNoZWxsRmx1dGUpLFxuICAgICAgICAgICAgICAgICAgW0N1cnJlbnRseVJpZGluZ0RvbHBoaW4uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtlbnRlck9ha10sIGFuZChMZWFkaW5nQ2hpbGQpLCBbUmVzY3VlZENoaWxkLmlkXSk7XG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soW3N0YXJ0XSwgYW5kKEdsb3dpbmdMYW1wLCBCcm9rZW5TdGF0dWUpLFxuICAgICAgICAgICAgICAgICAgICAgIFJlcGFpcmVkU3RhdHVlLmlkLCB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuXG4gICAgLy8gQWRkIHNob3BzXG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IExlYWZfVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IFNoeXJvbl9Ub29sU2hvcC5pZCkgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhpdGJveCA9IFtUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpXTtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBzaG9wLmNvbnRlbnRzKSB7XG4gICAgICAgIGlmIChpdGVtID09PSBNZWRpY2FsSGVyYi5pZCkge1xuICAgICAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBNb25leS5yLCBbQnV5SGVhbGluZy5pZF0pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09IFdhcnBCb290cy5pZCkge1xuICAgICAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBNb25leS5yLCBbQnV5V2FycC5pZF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIHBzZXVkbyBmbGFnc1xuICAgIGxldCBicmVha1N0b25lOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXaW5kLnI7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZGaXJlLnI7XG4gICAgbGV0IGZvcm1CcmlkZ2U6IFJlcXVpcmVtZW50ID0gU3dvcmRPZldhdGVyLnI7XG4gICAgbGV0IGJyZWFrSXJvbjogUmVxdWlyZW1lbnQgPSBTd29yZE9mVGh1bmRlci5yO1xuICAgIGlmICghdGhpcy5mbGFnc2V0Lm9yYnNPcHRpb25hbCgpKSB7XG4gICAgICBjb25zdCB3aW5kMiA9IG9yKEJhbGxPZldpbmQsIFRvcm5hZG9CcmFjZWxldCk7XG4gICAgICBjb25zdCBmaXJlMiA9IG9yKEJhbGxPZkZpcmUsIEZsYW1lQnJhY2VsZXQpO1xuICAgICAgY29uc3Qgd2F0ZXIyID0gb3IoQmFsbE9mV2F0ZXIsIEJsaXp6YXJkQnJhY2VsZXQpO1xuICAgICAgY29uc3QgdGh1bmRlcjIgPSBvcihCYWxsT2ZUaHVuZGVyLCBTdG9ybUJyYWNlbGV0KTtcbiAgICAgIGJyZWFrU3RvbmUgPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrU3RvbmUsIHdpbmQyKTtcbiAgICAgIGJyZWFrSWNlID0gUmVxdWlyZW1lbnQubWVldChicmVha0ljZSwgZmlyZTIpO1xuICAgICAgZm9ybUJyaWRnZSA9IFJlcXVpcmVtZW50Lm1lZXQoZm9ybUJyaWRnZSwgd2F0ZXIyKTtcbiAgICAgIGJyZWFrSXJvbiA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJcm9uLCB0aHVuZGVyMik7XG4gICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkpIHtcbiAgICAgICAgY29uc3QgbGV2ZWwyID1cbiAgICAgICAgICAgIFJlcXVpcmVtZW50Lm9yKGJyZWFrU3RvbmUsIGJyZWFrSWNlLCBmb3JtQnJpZGdlLCBicmVha0lyb24pO1xuICAgICAgICBmdW5jdGlvbiBuZWVkKHN3b3JkOiBGbGFnKTogUmVxdWlyZW1lbnQge1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKFxuICAgICAgICAgICAgICAoYzogcmVhZG9ubHkgQ29uZGl0aW9uW10pID0+XG4gICAgICAgICAgICAgICAgICBjWzBdID09PSBzd29yZC5jID8gYyA6IFtzd29yZC5jLCAuLi5jXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtTdG9uZSA9IG5lZWQoU3dvcmRPZldpbmQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoU3dvcmRPZkZpcmUpO1xuICAgICAgICBmb3JtQnJpZGdlID0gbmVlZChTd29yZE9mV2F0ZXIpO1xuICAgICAgICBicmVha0lyb24gPSBuZWVkKFN3b3JkT2ZUaHVuZGVyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha1N0b25lLCBbQnJlYWtTdG9uZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtJY2UsIFtCcmVha0ljZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgZm9ybUJyaWRnZSwgW0Zvcm1CcmlkZ2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSXJvbiwgW0JyZWFrSXJvbi5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgIG9yKFN3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlciksXG4gICAgICAgICAgICAgICAgICBbU3dvcmQuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEZsaWdodC5yLCBbQ2xpbWJXYXRlcmZhbGwuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEJhcnJpZXIuciwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBHYXNNYXNrLnIsIFtUcmF2ZWxTd2FtcC5pZF0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBMZWF0aGVyQm9vdHMuciwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soXG4gICAgICAgIFtzdGFydF0sIGFuZChDdXJyZW50bHlSaWRpbmdEb2xwaGluLCBSYWJiaXRCb290cyksXG4gICAgICAgIFtDbGltYldhdGVyZmFsbC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSB7XG4gICAgICAvLyBub3QgYWN0dWFsbHkgdXNlZC4uLj9cbiAgICAgIGNvbnN0IHJlcXVpcmVIZWFsZWQgPSB0aGlzLmZsYWdzZXQucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZUhlYWxlZCA/IEluanVyZWREb2xwaGluLnIgOiBbW11dLFxuICAgICAgICAgICAgICAgICAgICBbQWJsZVRvUmlkZURvbHBoaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBTaGllbGRSaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLFxuICAgICAgICAgICAgICAgICAgICBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpKSB7XG4gICAgICAvLyBOT1RFOiB3aXRoIG5vIG1vbmV5LCB3ZSd2ZSBnb3QgMTYgTVAsIHdoaWNoIGlzbid0IGVub3VnaFxuICAgICAgLy8gdG8gZ2V0IHBhc3Qgc2V2ZW4gc3RhdHVlcy5cbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBGbGlnaHQuY11dLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSwgW1RyYXZlbFN3YW1wLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBSZXF1aXJlbWVudC5PUEVOLCBbV2lsZFdhcnAuaWRdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQWRkcyByb3V0ZXMgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFSb3V0ZXMoKSB7XG4gICAgY29uc3Qge1xuICAgICAgZmxhZ3M6IHtCdXlXYXJwLCBTd29yZE9mVGh1bmRlciwgVGVsZXBvcnQsIFdpbGRXYXJwfSxcbiAgICAgIGxvY2F0aW9uczoge01lemFtZVNocmluZX0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IE1lemFtZSBTaHJpbmUuXG4gICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpLCBbXSkpO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgICBjb25zdCB3YXJwID0gdGhpcy5yb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycDtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIEJ1eVdhcnAuY10pKTtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIFRlbGVwb3J0LmNdKSk7XG4gICAgfVxuICAgIC8vIFdpbGQgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS53aWxkV2FycC5sb2NhdGlvbnMpIHtcbiAgICAgICAgLy8gRG9uJ3QgY291bnQgY2hhbm5lbCBpbiBsb2dpYyBiZWNhdXNlIHlvdSBjYW4ndCBhY3R1YWxseSBtb3ZlLlxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwuaWQpIGNvbnRpbnVlO1xuICAgICAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlIHRpbGVzIGhhcyBleHRyYSByZXF1aXJlbWVudHMgdG8gZW50ZXIgKGUuZy5cbiAgICAgICAgLy8gc3dhbXApIC0gZmluZCB0aGVtIGFuZCBjb25jYXRlbnRlLlxuICAgICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2UobG9jYXRpb24pO1xuICAgICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoZW50cmFuY2UpID8/IGRpZSgnYmFkIGVudHJhbmNlJyk7XG4gICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGVycmFpbi5lbnRlcikge1xuICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGVudHJhbmNlLCBbV2lsZFdhcnAuYywgLi4ucm91dGVdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogQ2hhbmdlIHRoZSBrZXkgb2YgdGhlIGNoZWNrcyBtYXAgdG8gb25seSBiZSBjYW5vbmljYWwgVGlsZUlkcy4gKi9cbiAgY29uc29saWRhdGVDaGVja3MoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tzXSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3Qgcm9vdCA9IHRoaXMudGlsZXMuZmluZCh0aWxlKTtcbiAgICAgIGlmICh0aWxlID09PSByb290KSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgIHRoaXMuY2hlY2tzLmdldChyb290KS5hZGQoY2hlY2spO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja3MuZGVsZXRlKHRpbGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBdCB0aGlzIHBvaW50IHdlIGtub3cgdGhhdCBhbGwgb2YgdGhpcy5jaGVja3MnIGtleXMgYXJlIGNhbm9uaWNhbC4gKi9cbiAgYnVpbGRSZXF1aXJlbWVudE1hcCgpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgcmVxID0gdGhpcy5yZXF1aXJlbWVudE1hcC5nZXQoY2hlY2sgYXMgQ29uZGl0aW9uKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHIxIG9mIHJlcXVpcmVtZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHIyIG9mIHRoaXMucm91dGVzLmdldCh0aWxlKSB8fCBbXSkge1xuICAgICAgICAgICAgICByZXEuYWRkTGlzdChbLi4ucjEsIC4uLnIyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGxvZyB0aGUgbWFwP1xuICAgIGlmICghREVCVUcpIHJldHVybjtcbiAgICBjb25zdCBsb2cgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjaGVjaywgcmVxXSBvZiB0aGlzLnJlcXVpcmVtZW50TWFwKSB7XG4gICAgICBjb25zdCBuYW1lID0gKGM6IG51bWJlcikgPT4gdGhpcy5yb20uZmxhZ3NbY10ubmFtZTtcbiAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgcmVxKSB7XG4gICAgICAgIGxvZy5wdXNoKGAke25hbWUoY2hlY2spfTogJHtbLi4ucm91dGVdLm1hcChuYW1lKS5qb2luKCcgJiAnKX1cXG5gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9nLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMCk7XG4gICAgY29uc29sZS5sb2cobG9nLmpvaW4oJycpKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGEgTG9jYXRpb25MaXN0IHN0cnVjdHVyZSBhZnRlciB0aGUgcmVxdWlyZW1lbnQgbWFwIGlzIGJ1aWx0LiAqL1xuICBnZXRMb2NhdGlvbkxpc3Qod29ybGROYW1lID0gJ0NyeXN0YWxpcycpOiBMb2NhdGlvbkxpc3Qge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBqdXN0IGltcGxlbWVudGluZyB0aGlzIGRpcmVjdGx5P1xuICAgIGNvbnN0IGNoZWNrTmFtZSA9IERFQlVHID8gKGY6IEZsYWcpID0+IGYuZGVidWcgOiAoZjogRmxhZykgPT4gZi5uYW1lO1xuICAgIHJldHVybiB7XG4gICAgICB3b3JsZE5hbWUsXG4gICAgICByZXF1aXJlbWVudHM6IHRoaXMucmVxdWlyZW1lbnRNYXAsXG4gICAgICBpdGVtczogdGhpcy5pdGVtcyxcbiAgICAgIHNsb3RzOiB0aGlzLnNsb3RzLFxuICAgICAgY2hlY2tOYW1lOiAoY2hlY2s6IG51bWJlcikgPT4gY2hlY2tOYW1lKHRoaXMucm9tLmZsYWdzW2NoZWNrXSksXG4gICAgICBwcmVmaWxsOiAocmFuZG9tOiBSYW5kb20pID0+IHtcbiAgICAgICAgY29uc3Qge0NyeXN0YWxpcywgTWVzaWFJblRvd2VyLCBMZWFmRWxkZXJ9ID0gdGhpcy5yb20uZmxhZ3M7XG4gICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoW1tNZXNpYUluVG93ZXIuaWQsIENyeXN0YWxpcy5pZF1dKTtcbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZCgpKSB7XG4gICAgICAgICAgLy8gUGljayBhIHN3b3JkIGF0IHJhbmRvbS4uLj8gaW52ZXJzZSB3ZWlnaHQ/XG4gICAgICAgICAgbWFwLnNldChMZWFmRWxkZXIuaWQsIDB4MjAwIHwgcmFuZG9tLm5leHRJbnQoNCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgIC8vIFRPRE8gLSBpZiBhbnkgaXRlbXMgc2hvdWxkbid0IGJlIHNodWZmbGVkLCB0aGVuIGRvIHRoZSBwcmUtZmlsbC4uLlxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqIEFkZCB0ZXJyYWlucyBhbmQgY2hlY2tzIGZvciBhIGxvY2F0aW9uLCBmcm9tIHRpbGVzIGFuZCBzcGF3bnMuICovXG4gIHByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIHJldHVybjtcbiAgICAvLyBMb29rIGZvciB3YWxscywgd2hpY2ggd2UgbmVlZCB0byBrbm93IGFib3V0IGxhdGVyLlxuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uKTtcbiAgfVxuXG4gIC8qKiBSdW4gdGhlIGZpcnN0IHBhc3Mgb2YgdW5pb25zIG5vdyB0aGF0IGFsbCB0ZXJyYWlucyBhcmUgZmluYWwuICovXG4gIHVuaW9uTmVpZ2hib3JzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh4MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHgxXSk7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeTEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB5MV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBCdWlsZHMgdXAgdGhlIHJvdXRlcyBhbmQgcm91dGVFZGdlcyBkYXRhIHN0cnVjdHVyZXMuICovXG4gIGFkZEFsbFJvdXRlcygpIHtcbiAgICAvLyBBZGQgYW55IGV4dHJhIHJvdXRlcyBmaXJzdCwgc3VjaCBhcyB0aGUgc3RhcnRpbmcgdGlsZS5cbiAgICB0aGlzLmFkZEV4dHJhUm91dGVzKCk7XG4gICAgLy8gQWRkIGFsbCB0aGUgZWRnZXMgZnJvbSBhbGwgbmVpZ2hib3JzLlxuICAgIGZvciAoY29uc3QgW3BhaXIsIGRpcnNdIG9mIHRoaXMubmVpZ2hib3JzKSB7XG4gICAgICBjb25zdCBbYzAsIGMxXSA9IFRpbGVQYWlyLnNwbGl0KHBhaXIpO1xuICAgICAgY29uc3QgdDAgPSB0aGlzLnRlcnJhaW5zLmdldChjMCk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMudGVycmFpbnMuZ2V0KGMxKTtcbiAgICAgIGlmICghdDAgfHwgIXQxKSB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgdGVycmFpbiAke2hleCh0MCA/IGMwIDogYzEpfWApO1xuICAgICAgZm9yIChjb25zdCBbZGlyLCBleGl0UmVxXSBvZiB0MC5leGl0KSB7XG4gICAgICAgIGlmICghKGRpciAmIGRpcnMpKSBjb250aW51ZTtcbiAgICAgICAgZm9yIChjb25zdCBleGl0Q29uZHMgb2YgZXhpdFJlcSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZW50ZXJDb25kcyBvZiB0MS5lbnRlcikge1xuICAgICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoYzEsIFsuLi5leGl0Q29uZHMsIC4uLmVudGVyQ29uZHNdKSwgYzApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgZGVidWcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVidWcnKTtcbiAgICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBkZWJ1Zy5hcHBlbmRDaGlsZChuZXcgQXJlYSh0aGlzLnJvbSwgdGhpcy5nZXRXb3JsZERhdGEoKSkuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0V29ybGREYXRhKCk6IFdvcmxkRGF0YSB7XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBjb25zdCB0aWxlcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgVGlsZURhdGE+KCgpID0+ICh7fSkgYXMgVGlsZURhdGEpO1xuICAgIGNvbnN0IGxvY2F0aW9ucyA9XG4gICAgICAgIHNlcSgyNTYsICgpID0+ICh7YXJlYXM6IG5ldyBTZXQoKSwgdGlsZXM6IG5ldyBTZXQoKX0gYXMgTG9jYXRpb25EYXRhKSk7XG4gICAgY29uc3QgYXJlYXM6IEFyZWFEYXRhW10gPSBbXTtcblxuICAgIC8vIGRpZ2VzdCB0aGUgYXJlYXNcbiAgICBmb3IgKGNvbnN0IHNldCBvZiB0aGlzLnRpbGVzLnNldHMoKSkge1xuICAgICAgY29uc3QgY2Fub25pY2FsID0gdGhpcy50aWxlcy5maW5kKGl0ZXJzLmZpcnN0KHNldCkpO1xuICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGNhbm9uaWNhbCk7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgcm91dGVzID1cbiAgICAgICAgICB0aGlzLnJvdXRlcy5oYXMoY2Fub25pY2FsKSA/XG4gICAgICAgICAgICAgIFJlcXVpcmVtZW50LmZyZWV6ZSh0aGlzLnJvdXRlcy5nZXQoY2Fub25pY2FsKSkgOiBbXTtcbiAgICAgIGlmICghcm91dGVzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBjb25zdCBhcmVhOiBBcmVhRGF0YSA9IHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgaWQ6IGluZGV4KyssXG4gICAgICAgIGxvY2F0aW9uczogbmV3IFNldCgpLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHRlcnJhaW4sXG4gICAgICAgIHRpbGVzOiBuZXcgU2V0KCksXG4gICAgICB9O1xuICAgICAgYXJlYXMucHVzaChhcmVhKTtcbiAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBzZXQpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSB0aWxlID4+PiAxNjtcbiAgICAgICAgYXJlYS5sb2NhdGlvbnMuYWRkKGxvY2F0aW9uKTtcbiAgICAgICAgYXJlYS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0uYXJlYXMuYWRkKGFyZWEpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgdGlsZXMuZ2V0KHRpbGUpLmFyZWEgPSBhcmVhO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGV4aXRzXG4gICAgZm9yIChjb25zdCBbYSwgYl0gb2YgdGhpcy5leGl0cykge1xuICAgICAgaWYgKHRpbGVzLmhhcyhhKSkge1xuICAgICAgICB0aWxlcy5nZXQoYSkuZXhpdCA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgY2hlY2tzXG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCBhcmVhID0gdGlsZXMuZ2V0KHRpbGUpLmFyZWE7XG4gICAgICBpZiAoIWFyZWEpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihgQWJhbmRvbmVkIGNoZWNrICR7Wy4uLmNoZWNrU2V0XS5tYXAoXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICB4ID0+IFsuLi54LmNoZWNrc10ubWFwKHkgPT4geS50b1N0cmluZygxNikpKVxuICAgICAgICAvLyAgICAgICAgICAgICAgICB9IGF0ICR7dGlsZS50b1N0cmluZygxNil9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5yb20uZmxhZ3NbY2hlY2tdIHx8IGRpZSgpO1xuICAgICAgICAgIGFyZWEuY2hlY2tzLnB1c2goW2ZsYWcsIHJlcXVpcmVtZW50XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHt0aWxlcywgYXJlYXMsIGxvY2F0aW9uc307XG4gIH1cblxuICAvKiogQWRkcyBhIHJvdXRlLCBvcHRpb25hbGx5IHdpdGggYSBwcmVyZXF1aXNpdGUgKGNhbm9uaWNhbCkgc291cmNlIHRpbGUuICovXG4gIGFkZFJvdXRlKHJvdXRlOiBSb3V0ZSwgc291cmNlPzogVGlsZUlkKSB7XG4gICAgaWYgKHNvdXJjZSAhPSBudWxsKSB7XG4gICAgICAvLyBBZGQgYW4gZWRnZSBpbnN0ZWFkIG9mIGEgcm91dGUsIHJlY3Vyc2luZyBvbiB0aGUgc291cmNlJ3NcbiAgICAgIC8vIHJlcXVpcmVtZW50cy5cbiAgICAgIHRoaXMucm91dGVFZGdlcy5nZXQoc291cmNlKS5hZGQocm91dGUpO1xuICAgICAgZm9yIChjb25zdCBzcmNSb3V0ZSBvZiB0aGlzLnJvdXRlcy5nZXQoc291cmNlKSkge1xuICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShyb3V0ZS50YXJnZXQsIFsuLi5zcmNSb3V0ZSwgLi4ucm91dGUuZGVwc10pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBub3cgYW4gXCJpbml0aWFsIHJvdXRlXCIgd2l0aCBubyBwcmVyZXF1aXNpdGUgc291cmNlLlxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHN0YXJ0ID0gcm91dGU7IC8vIFRPRE8gaW5saW5lXG4gICAgcXVldWUuYWRkKHN0YXJ0KTtcbiAgICBjb25zdCBpdGVyID0gcXVldWVbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCB7dmFsdWUsIGRvbmV9ID0gaXRlci5uZXh0KCk7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgICAgc2Vlbi5hZGQodmFsdWUpO1xuICAgICAgcXVldWUuZGVsZXRlKHZhbHVlKTtcbiAgICAgIGNvbnN0IGZvbGxvdyA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdmFsdWUudGFyZ2V0O1xuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMucm91dGVzLmdldCh0YXJnZXQpO1xuICAgICAgaWYgKGJ1aWxkZXIuYWRkUm91dGUodmFsdWUpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0aGlzLnJvdXRlRWRnZXMuZ2V0KHRhcmdldCkpIHtcbiAgICAgICAgICBmb2xsb3cuYWRkKG5ldyBSb3V0ZShuZXh0LnRhcmdldCwgWy4uLnZhbHVlLmRlcHMsIC4uLm5leHQuZGVwc10pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuZXh0IG9mIGZvbGxvdykge1xuICAgICAgICBpZiAoc2Vlbi5oYXMobmV4dCkpIGNvbnRpbnVlO1xuICAgICAgICBxdWV1ZS5kZWxldGUobmV4dCk7IC8vIHJlLWFkZCBhdCB0aGUgZW5kIG9mIHRoZSBxdWV1ZVxuICAgICAgICBxdWV1ZS5hZGQobmV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyB1cCBgdGhpcy5leGl0U2V0YCB0byBpbmNsdWRlIGFsbCB0aGUgXCJmcm9tLXRvXCIgdGlsZSBwYWlyc1xuICAgKiBvZiBleGl0cyB0aGF0IF9kb24ndF8gc2hhcmUgdGhlIHNhbWUgdGVycmFpbiBGb3IgYW55IHR3by13YXkgZXhpdFxuICAgKiB0aGF0IHNoYXJlcyB0aGUgc2FtZSB0ZXJyYWluLCBqdXN0IGFkZCBpdCBkaXJlY3RseSB0byB0aGVcbiAgICogdW5pb25maW5kLlxuICAgKi9cbiAgcmVjb3JkRXhpdHMoKSB7XG4gICAgLy8gQWRkIGV4aXQgVGlsZVBhaXJzIHRvIGV4aXRTZXQgZnJvbSBhbGwgbG9jYXRpb25zJyBleGl0cy5cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5leGl0cykge1xuICAgICAgdGhpcy5leGl0U2V0LmFkZChcbiAgICAgICAgICBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQoZnJvbSksIHRoaXMudGlsZXMuZmluZCh0bykpKTtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgdHdvLXdheSBleGl0cyB3aXRoIHRoZSBzYW1lIHRlcnJhaW46IHJlbW92ZSB0aGVtIGZyb21cbiAgICAvLyBleGl0U2V0IGFuZCBhZGQgdGhlbSB0byB0aGUgdGlsZXMgdW5pb25maW5kLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldChmcm9tKSAhPT0gdGhpcy50ZXJyYWlucy5nZXQodG8pKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJldmVyc2UgPSBUaWxlUGFpci5vZih0bywgZnJvbSk7XG4gICAgICBpZiAodGhpcy5leGl0U2V0LmhhcyhyZXZlcnNlKSkge1xuICAgICAgICB0aGlzLnRpbGVzLnVuaW9uKFtmcm9tLCB0b10pO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKGV4aXQpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKHJldmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGRpZmZlcmVudC10ZXJyYWluIG5laWdoYm9ycyBpbiB0aGUgc2FtZSBsb2NhdGlvbi4gIEFkZFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyB0byBgdGhpcy5uZWlnaGJvcnNgIHdpdGggYWxsIHRoZVxuICAgKiBkaXJlY3Rpb25zIHRoYXQgaXQgbmVpZ2hib3JzIGluLiAgQWxzbyBhZGQgZXhpdHMgYXMgbmVpZ2hib3JzLlxuICAgKiBUaGlzIG11c3QgaGFwcGVuICphZnRlciogdGhlIGVudGlyZSB1bmlvbmZpbmQgaXMgY29tcGxldGUgc29cbiAgICogdGhhdCB3ZSBjYW4gbGV2ZXJhZ2UgaXQuXG4gICAqL1xuICBidWlsZE5laWdoYm9ycygpIHtcbiAgICAvLyBBZGphY2VudCBkaWZmZXJlbnQtdGVycmFpbiB0aWxlcy5cbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgY29uc3QgdHkxID0gdGhpcy50ZXJyYWlucy5nZXQoeTEpO1xuICAgICAgaWYgKHR5MSAmJiB0eTEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB5MSwgRGlyLk5vcnRoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGNvbnN0IHR4MSA9IHRoaXMudGVycmFpbnMuZ2V0KHgxKTtcbiAgICAgIGlmICh0eDEgJiYgdHgxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeDEsIERpci5XZXN0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRXhpdHMgKGp1c3QgdXNlIFwibm9ydGhcIiBmb3IgdGhlc2UpLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFt0MCwgdDFdID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHQwKSB8fCAhdGhpcy50ZXJyYWlucy5oYXModDEpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHAgPSBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQodDApLCB0aGlzLnRpbGVzLmZpbmQodDEpKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwLCB0aGlzLm5laWdoYm9ycy5nZXQocCkgfCAxKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVBZGphY2VudE5laWdoYm9ycyh0MDogVGlsZUlkLCB0MTogVGlsZUlkLCBkaXI6IERpcikge1xuICAgIC8vIE5PVEU6IHQwIDwgdDEgYmVjYXVzZSBkaXIgaXMgYWx3YXlzIFdFU1Qgb3IgTk9SVEguXG4gICAgY29uc3QgYzAgPSB0aGlzLnRpbGVzLmZpbmQodDApO1xuICAgIGNvbnN0IGMxID0gdGhpcy50aWxlcy5maW5kKHQxKTtcbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDEpKSB7XG4gICAgICAvLyAxIC0+IDAgKHdlc3Qvbm9ydGgpLiAgSWYgMSBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBwMTAgPSBUaWxlUGFpci5vZihjMSwgYzApO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAxMCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAxMCkgfCAoMSA8PCBkaXIpKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQwKSkge1xuICAgICAgLy8gMCAtPiAxIChlYXN0L3NvdXRoKS4gIElmIDAgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3Qgb3BwID0gZGlyIF4gMjtcbiAgICAgIGNvbnN0IHAwMSA9IFRpbGVQYWlyLm9mKGMwLCBjMSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDAxLCB0aGlzLm5laWdoYm9ycy5nZXQocDAxKSB8ICgxIDw8IG9wcCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGNvbnN0IHdhbGxzID0gbmV3IE1hcDxTY3JlZW5JZCwgV2FsbFR5cGU+KCk7XG4gICAgY29uc3Qgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcbiAgICBjb25zdCBpblRvd2VyID0gKGxvY2F0aW9uLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIFdhbGxzIG5lZWQgdG8gY29tZSBmaXJzdCBzbyB3ZSBjYW4gYXZvaWQgYWRkaW5nIHNlcGFyYXRlXG4gICAgICAvLyByZXF1aXJlbWVudHMgZm9yIGV2ZXJ5IHNpbmdsZSB3YWxsIC0ganVzdCB1c2UgdGhlIHR5cGUuXG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgd2FsbHMuc2V0KFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSwgKHNwYXduLmlkICYgMykgYXMgV2FsbFR5cGUpO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgIHNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldHNbbG9jYXRpb24udGlsZXNldF07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdO1xuXG4gICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpID0+IHtcbiAgICAgIGNvbnN0IHMgPSBsb2NhdGlvbi5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgIHJldHVybiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc10udGlsZXNbdGlsZSAmIDB4ZmZdXTtcbiAgICB9O1xuXG4gICAgLy8gUmV0dXJucyB1bmRlZmluZWQgaWYgaW1wYXNzYWJsZS5cbiAgICBjb25zdCBtYWtlVGVycmFpbiA9IChlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCwgYmFycmllcjogYm9vbGVhbikgPT4ge1xuICAgICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgICBlZmZlY3RzICY9IFRlcnJhaW4uQklUUztcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHgxYSkgZWZmZWN0cyB8PSBUZXJyYWluLlNXQU1QO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDYwIHx8IGxvY2F0aW9uLmlkID09PSAweDY4KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgLy8gTk9URTogb25seSB0aGUgdG9wIGhhbGYtc2NyZWVuIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgaXMgZG9scGhpbmFibGVcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHgxMDMwKSkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIGlmIChiYXJyaWVyKSBlZmZlY3RzIHw9IFRlcnJhaW4uQkFSUklFUjtcbiAgICAgIGlmICghKGVmZmVjdHMgJiBUZXJyYWluLkRPTFBISU4pICYmIGVmZmVjdHMgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgICAgLy8gMC01IGlzIGRvYWJsZSB3aXRoIG5vIGJvb3RzXG4gICAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgICBsZXQgYm90dG9tID0gdGlsZTtcbiAgICAgICAgbGV0IGhlaWdodCA9IDA7XG4gICAgICAgIHdoaWxlIChnZXRFZmZlY3RzKGJvdHRvbSkgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICAgIGhlaWdodCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgICAgZWZmZWN0cyAmPSB+VGVycmFpbi5TTE9QRTtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFODtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCAxMCkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoZWZmZWN0cyk7XG4gICAgfTtcblxuICAgIGZvciAobGV0IHkgPSAwLCBoZWlnaHQgPSBsb2NhdGlvbi5oZWlnaHQ7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gbG9jYXRpb24uc2NyZWVuc1t5XTtcbiAgICAgIGNvbnN0IHJvd0lkID0gbG9jYXRpb24uaWQgPDwgOCB8IHkgPDwgNDtcbiAgICAgIGZvciAobGV0IHggPSAwLCB3aWR0aCA9IGxvY2F0aW9uLndpZHRoOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHNjcmVlbklkID0gU2NyZWVuSWQocm93SWQgfCB4KTtcbiAgICAgICAgY29uc3QgYmFycmllciA9IHNob290aW5nU3RhdHVlcy5oYXMoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnWXggPSBzY3JlZW5JZCAmIDB4ZmY7XG4gICAgICAgIGNvbnN0IHdhbGwgPSB3YWxscy5nZXQoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnID1cbiAgICAgICAgICAgIGluVG93ZXIgPyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkIDpcbiAgICAgICAgICAgIHdhbGwgIT0gbnVsbCA/IHRoaXMud2FsbENhcGFiaWxpdHkod2FsbCkgOlxuICAgICAgICAgICAgbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBmbGFnWXgpPy5mbGFnO1xuICAgICAgICBjb25zdCBwaXQgPSBsb2NhdGlvbi5waXRzLmZpbmQocCA9PiBwLmZyb21TY3JlZW4gPT09IHNjcmVlbklkKTtcbiAgICAgICAgaWYgKHBpdCkge1xuICAgICAgICAgIHRoaXMuZXhpdHMuc2V0KFRpbGVJZChzY3JlZW5JZCA8PCA4IHwgMHg4OCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgVGlsZUlkKHBpdC50b1NjcmVlbiA8PCA4IHwgMHg4OCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxvZ2ljOiBMb2dpYyA9IHRoaXMucm9tLmZsYWdzW2ZsYWchXT8ubG9naWMgPz8ge307XG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlkID0gVGlsZUlkKHNjcmVlbklkIDw8IDggfCB0KTtcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgaWYgKGxvZ2ljLmFzc3VtZVRydWUgJiYgdGlsZSA8IDB4MjApIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGVmZmVjdHMgPVxuICAgICAgICAgICAgICBsb2NhdGlvbi5pc1Nob3AoKSA/IDAgOiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdICYgMHgyNjtcbiAgICAgICAgICBsZXQgdGVycmFpbiA9IG1ha2VUZXJyYWluKGVmZmVjdHMsIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgLy9pZiAoIXRlcnJhaW4pIHRocm93IG5ldyBFcnJvcihgYmFkIHRlcnJhaW4gZm9yIGFsdGVybmF0ZWApO1xuICAgICAgICAgIGlmICh0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT09IHRpbGUgJiZcbiAgICAgICAgICAgICAgZmxhZyAhPSBudWxsICYmICFsb2dpYy5hc3N1bWVUcnVlICYmICFsb2dpYy5hc3N1bWVGYWxzZSkge1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRlID1cbiAgICAgICAgICAgICAgICBtYWtlVGVycmFpbih0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aWQsIGJhcnJpZXIpO1xuICAgICAgICAgICAgLy9pZiAoIWFsdGVybmF0ZSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgICBpZiAoYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgIC8vIE5PVEU6IHRoZXJlJ3MgYW4gb2RkaXR5IGZyb20gaG9sbG93aW5nIG91dCB0aGUgYmFja3Mgb2YgaXJvblxuICAgICAgICAgICAgICAvLyB3YWxscyB0aGF0IG9uZSBjb3JuZXIgb2Ygc3RvbmUgd2FsbHMgYXJlIGFsc28gaG9sbG93ZWQgb3V0LFxuICAgICAgICAgICAgICAvLyBidXQgb25seSBwcmUtZmxhZy4gIEl0IGRvZXNuJ3QgYWN0dWFsbHkgaHVydCBhbnl0aGluZy5cbiAgICAgICAgICAgICAgdGVycmFpbiA9XG4gICAgICAgICAgICAgICAgICB0aGlzLnRlcnJhaW5GYWN0b3J5LmZsYWcodGVycmFpbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dpYy50cmFjayA/IGZsYWcgOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGVycmFpbikgdGhpcy50ZXJyYWlucy5zZXQodGlkLCB0ZXJyYWluKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENsb2JiZXIgdGVycmFpbiB3aXRoIHNlYW1sZXNzIGV4aXRzXG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBjb25zdCB7ZGVzdCwgZW50cmFuY2V9ID0gZXhpdDtcbiAgICAgIGNvbnN0IGZyb20gPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgZXhpdCk7XG4gICAgICAvLyBTZWFtbGVzcyBleGl0cyAoMHgyMCkgaWdub3JlIHRoZSBlbnRyYW5jZSBpbmRleCwgYW5kXG4gICAgICAvLyBpbnN0ZWFkIHByZXNlcnZlIHRoZSBUaWxlSWQsIGp1c3QgY2hhbmdpbmcgdGhlIGxvY2F0aW9uLlxuICAgICAgbGV0IHRvOiBUaWxlSWQ7XG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkpIHtcbiAgICAgICAgdG8gPSBUaWxlSWQoZnJvbSAmIDB4ZmZmZiB8IChkZXN0IDw8IDE2KSk7XG4gICAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgZXhpdCk7XG4gICAgICAgIHRoaXMuc2VhbWxlc3NFeGl0cy5hZGQodGlsZSk7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy50ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICAgIHRoaXMudGVycmFpbnMuc2V0KHRpbGUsIHRoaXMudGVycmFpbkZhY3Rvcnkuc2VhbWxlc3MocHJldmlvdXMpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG8gPSB0aGlzLmVudHJhbmNlKHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XSwgZW50cmFuY2UgJiAweDFmKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXhpdHMuc2V0KGZyb20sIHRvKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTnBjKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0Jvc3MobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNDaGVzdCgpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0NoZXN0KGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24udHlwZSA9PT0gMyAmJiBzcGF3bi5pZCA9PT0gMHhlMCkge1xuICAgICAgICAvLyB3aW5kbWlsbCBibGFkZXNcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKFxuICAgICAgICAgICAgSGl0Ym94LnNjcmVlbihUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKSxcbiAgICAgICAgICAgIHRoaXMucm9tLmZsYWdzLlVzZWRXaW5kbWlsbEtleS5yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzVHJpZ2dlcihsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEZvciB0cmlnZ2Vycywgd2hpY2ggdGlsZXMgZG8gd2UgbWFyaz9cbiAgICAvLyBUaGUgdHJpZ2dlciBoaXRib3ggaXMgMiB0aWxlcyB3aWRlIGFuZCAxIHRpbGUgdGFsbCwgYnV0IGl0IGRvZXMgbm90XG4gICAgLy8gbGluZSB1cCBuaWNlbHkgdG8gdGhlIHRpbGUgZ3JpZC4gIEFsc28sIHRoZSBwbGF5ZXIgaGl0Ym94IGlzIG9ubHlcbiAgICAvLyAkYyB3aWRlICh0aG91Z2ggaXQncyAkMTQgdGFsbCkgc28gdGhlcmUncyBzb21lIHNsaWdodCBkaXNwYXJpdHkuXG4gICAgLy8gSXQgc2VlbXMgbGlrZSBwcm9iYWJseSBtYXJraW5nIGl0IGFzICh4LTEsIHktMSkgLi4gKHgsIHkpIG1ha2VzIHRoZVxuICAgIC8vIG1vc3Qgc2Vuc2UsIHdpdGggdGhlIGNhdmVhdCB0aGF0IHRyaWdnZXJzIHNoaWZ0ZWQgcmlnaHQgYnkgYSBoYWxmXG4gICAgLy8gdGlsZSBzaG91bGQgZ28gZnJvbSB4IC4uIHgrMSBpbnN0ZWFkLlxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNoZWNraW5nIHRyaWdnZXIncyBhY3Rpb246ICQxOSAtPiBwdXNoLWRvd24gbWVzc2FnZVxuXG4gICAgLy8gVE9ETyAtIHB1bGwgb3V0IHRoaXMucmVjb3JkVHJpZ2dlclRlcnJhaW4oKSBhbmQgdGhpcy5yZWNvcmRUcmlnZ2VyQ2hlY2soKVxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2VyKHNwYXduLmlkKTtcbiAgICBpZiAoIXRyaWdnZXIpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB0cmlnZ2VyICR7c3Bhd24uaWQudG9TdHJpbmcoMTYpfWApO1xuXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHModHJpZ2dlci5jb25kaXRpb25zKTtcbiAgICBsZXQgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMuZmlsdGVyQW50aVJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgbGV0IGhpdGJveCA9IEhpdGJveC50cmlnZ2VyKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgdHJpZ2dlci5mbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIGNoZWNrcyk7XG5cbiAgICBzd2l0Y2ggKHRyaWdnZXIubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgLy8gcHVzaC1kb3duIHRyaWdnZXJcbiAgICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4ODYgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVSYWJiaXRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBiaWdnZXIgaGl0Ym94IHRvIG5vdCBmaW5kIHRoZSBwYXRoIHRocm91Z2hcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC0xXSwgWzAsIDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmlnZ2VyLmlkID09PSAweGJhICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5hc3N1bWVUZWxlcG9ydFNraXAoKSAmJlxuICAgICAgICAgICAgICAgICAgICF0aGlzLmZsYWdzZXQuZGlzYWJsZVRlbGVwb3J0U2tpcCgpKSB7XG4gICAgICAgICAgLy8gY29weSB0aGUgdGVsZXBvcnQgaGl0Ym94IGludG8gdGhlIG90aGVyIHNpZGUgb2YgY29yZGVsXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmF0TG9jYXRpb24oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluV2VzdCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoYW50aVJlcXVpcmVtZW50cykpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFkOlxuICAgICAgICAvLyBzdGFydCBtYWRvIDEgYm9zcyBmaWdodFxuICAgICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5NYWRvMSwgcmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwODogY2FzZSAweDBiOiBjYXNlIDB4MGM6IGNhc2UgMHgwZDogY2FzZSAweDBmOlxuICAgICAgICAvLyBmaW5kIGl0ZW1ncmFudCBmb3IgdHJpZ2dlciBJRCA9PiBhZGQgY2hlY2tcbiAgICAgICAgdGhpcy5hZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94LCByZXF1aXJlbWVudHMsIHRyaWdnZXIuaWQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDE4OiB7IC8vIHN0b20gZmlnaHRcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlOiB3YXJwIGJvb3RzIGdsaXRjaCByZXF1aXJlZCBpZiBjaGFyZ2Ugc2hvdHMgb25seS5cbiAgICAgICAgY29uc3QgcmVxID1cbiAgICAgICAgICB0aGlzLmZsYWdzZXQuY2hhcmdlU2hvdHNPbmx5KCkgP1xuICAgICAgICAgIFJlcXVpcmVtZW50Lm1lZXQocmVxdWlyZW1lbnRzLCBhbmQodGhpcy5yb20uZmxhZ3MuV2FycEJvb3RzKSkgOlxuICAgICAgICAgIHJlcXVpcmVtZW50cztcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsIHRoaXMucm9tLmZsYWdzLlN0b21GaWdodFJld2FyZC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgMHgxZTpcbiAgICAgICAgLy8gZm9yZ2UgY3J5c3RhbGlzXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnRzLCB0aGlzLnJvbS5mbGFncy5NZXNpYUluVG93ZXIuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWY6XG4gICAgICAgIHRoaXMuaGFuZGxlQm9hdCh0aWxlLCBsb2NhdGlvbiwgcmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYjpcbiAgICAgICAgLy8gTW92aW5nIGd1YXJkXG4gICAgICAgIC8vIHRyZWF0IHRoaXMgYXMgYSBzdGF0dWU/ICBidXQgdGhlIGNvbmRpdGlvbnMgYXJlIG5vdCBzdXBlciB1c2VmdWwuLi5cbiAgICAgICAgLy8gICAtIG9ubHkgdHJhY2tlZCBjb25kaXRpb25zIG1hdHRlcj8gOWUgPT0gcGFyYWx5c2lzLi4uIGV4Y2VwdCBub3QuXG4gICAgICAgIC8vIHBhcmFseXphYmxlPyAgY2hlY2sgRGF0YVRhYmxlXzM1MDQ1XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdGhpcy5yb20ubG9jYXRpb25zLlBvcnRvYV9QYWxhY2VFbnRyYW5jZSkge1xuICAgICAgICAgIC8vIFBvcnRvYSBwYWxhY2UgZnJvbnQgZ3VhcmQgbm9ybWFsbHkgYmxvY2tzIG9uIE1lc2lhIHJlY29yZGluZy5cbiAgICAgICAgICAvLyBCdXQgdGhlIHF1ZWVuIGlzIGFjdHVhbGx5IGFjY2Vzc2libGUgd2l0aG91dCBzZWVpbmcgdGhlIHJlY29yZGluZy5cbiAgICAgICAgICAvLyBJbnN0ZWFkLCBibG9jayBhY2Nlc3MgdG8gdGhlIHRocm9uZSByb29tIG9uIGJlaW5nIGFibGUgdG8gdGFsayB0b1xuICAgICAgICAgIC8vIHRoZSBmb3J0dW5lIHRlbGxlciwgaW4gY2FzZSB0aGUgZ3VhcmQgbW92ZXMgYmVmb3JlIHdlIGNhbiBnZXQgdGhlXG4gICAgICAgICAgLy8gaXRlbS4gIEFsc28gbW92ZSB0aGUgaGl0Ym94IHVwIHNpbmNlIHRoZSB0d28gc2lkZSByb29tcyBfYXJlXyBzdGlsbFxuICAgICAgICAgIC8vIGFjY2Vzc2libGUuXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFstMiwgMF0pO1xuICAgICAgICAgIGFudGlSZXF1aXJlbWVudHMgPSB0aGlzLnJvbS5mbGFncy5UYWxrZWRUb0ZvcnR1bmVUZWxsZXIucjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmhhbmRsZU1vdmluZ0d1YXJkKGhpdGJveCwgbG9jYXRpb24sIGFudGlSZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KHNwYXduLnR5cGUgPDwgOCB8IHNwYXduLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlcXVpcmVtZW50Lk9QRU4sIGl0ZW0sIHVzZSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc05wYyhsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIGNvbnN0IG5wYyA9IHRoaXMucm9tLm5wY3Nbc3Bhd24uaWRdO1xuICAgIGlmICghbnBjIHx8ICFucGMudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIG5wYzogJHtoZXgoc3Bhd24uaWQpfWApO1xuICAgIGNvbnN0IHNwYXduQ29uZGl0aW9ucyA9IG5wYy5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvY2F0aW9uLmlkKSB8fCBbXTtcbiAgICBjb25zdCByZXEgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbnMpOyAvLyBzaG91bGQgYmUgc2luZ2xlXG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcblxuICAgIC8vIE5PVEU6IFJhZ2UgaGFzIG5vIHdhbGthYmxlIG5laWdoYm9ycywgYW5kIHdlIG5lZWQgdGhlIHNhbWUgaGl0Ym94XG4gICAgLy8gZm9yIGJvdGggdGhlIHRlcnJhaW4gYW5kIHRoZSBjaGVjay5cbiAgICAvL1xuICAgIC8vIE5PVEUgQUxTTyAtIFJhZ2UgcHJvYmFibHkgc2hvd3MgdXAgYXMgYSBib3NzLCBub3QgYW4gTlBDP1xuICAgIGxldCBoaXRib3g6IEhpdGJveCA9XG4gICAgICAgIFt0aGlzLnRlcnJhaW5zLmhhcyh0aWxlKSA/IHRpbGUgOiB0aGlzLndhbGthYmxlTmVpZ2hib3IodGlsZSkgPz8gdGlsZV07XG5cbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KHNwYXduLnR5cGUgPDwgOCB8IHNwYXduLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShoaXRib3gsIHJlcSwgaXRlbSwgdXNlKTtcbiAgICB9XG5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlNhYmVyYURpc2d1aXNlZEFzTWVzaWEpIHtcbiAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLlNhYmVyYTEsIHJlcSk7XG4gICAgfVxuXG4gICAgaWYgKChucGMuZGF0YVsyXSAmIDB4MDQpICYmICF0aGlzLmZsYWdzZXQuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHtcbiAgICAgIGxldCBhbnRpUmVxO1xuICAgICAgYW50aVJlcSA9IHRoaXMuZmlsdGVyQW50aVJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbnMpO1xuICAgICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5SYWdlKSB7XG4gICAgICAgIC8vIFRPRE8gLSBtb3ZlIGhpdGJveCBkb3duLCBjaGFuZ2UgcmVxdWlyZW1lbnQ/XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMiwgLTFdLCBbMiwgMF0sIFsyLCAxXSwgWzIsIDJdKTtcbiAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAtNl0sIFswLCAtMl0sIFswLCAyXSwgWzAsIDZdKTtcbiAgICAgICAgLy8gVE9ETyAtIGNoZWNrIGlmIHRoaXMgd29ya3M/ICB0aGUgfmNoZWNrIHNwYXduIGNvbmRpdGlvbiBzaG91bGRcbiAgICAgICAgLy8gYWxsb3cgcGFzc2luZyBpZiBnb3R0ZW4gdGhlIGNoZWNrLCB3aGljaCBpcyB0aGUgc2FtZSBhcyBnb3R0ZW5cbiAgICAgICAgLy8gdGhlIGNvcnJlY3Qgc3dvcmQuXG4gICAgICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lUmFnZVNraXAoKSkgYW50aVJlcSA9IHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlBvcnRvYVRocm9uZVJvb21CYWNrRG9vckd1YXJkKSB7XG4gICAgICAgIC8vIFBvcnRvYSBiYWNrIGRvb3IgZ3VhcmQgc3Bhd25zIGlmICgxKSB0aGUgbWVzaWEgcmVjb3JkaW5nIGhhcyBub3QgeWV0XG4gICAgICAgIC8vIGJlZW4gcGxheWVkLCBhbmQgKDIpIHRoZSBwbGF5ZXIgZGlkbid0IHNuZWFrIHBhc3QgdGhlIGVhcmxpZXIgZ3VhcmQuXG4gICAgICAgIC8vIFdlIGNhbiBzaW11bGF0ZSB0aGlzIGJ5IGhhcmQtY29kaW5nIGEgcmVxdWlyZW1lbnQgb24gZWl0aGVyIHRvIGdldFxuICAgICAgICAvLyBwYXN0IGhpbS5cbiAgICAgICAgYW50aVJlcSA9IG9yKHRoaXMucm9tLmZsYWdzLk1lc2lhUmVjb3JkaW5nLCB0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMpO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU29sZGllckd1YXJkKSB7XG4gICAgICAgIGFudGlSZXEgPSB1bmRlZmluZWQ7IC8vIHRoZXknbGwganVzdCBhdHRhY2sgaWYgYXBwcm9hY2hlZC5cbiAgICAgIH1cbiAgICAgIC8vIGlmIHNwYXduIGlzIGFsd2F5cyBmYWxzZSB0aGVuIHJlcSBuZWVkcyB0byBiZSBvcGVuP1xuICAgICAgaWYgKGFudGlSZXEpIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXEpKTtcbiAgICB9XG5cbiAgICAvLyBGb3J0dW5lIHRlbGxlciBjYW4gYmUgdGFsa2VkIHRvIGFjcm9zcyB0aGUgZGVzay5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLkZvcnR1bmVUZWxsZXIpIHtcbiAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgMF0sIFsyLCAwXSk7XG4gICAgfVxuXG4gICAgLy8gcmVxIGlzIG5vdyBtdXRhYmxlXG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcSkpIHJldHVybjsgLy8gbm90aGluZyB0byBkbyBpZiBpdCBuZXZlciBzcGF3bnMuXG4gICAgY29uc3QgW1suLi5jb25kc11dID0gcmVxO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBnbG9iYWwgZGlhbG9ncyAtIGRvIG5vdGhpbmcgaWYgd2UgY2FuJ3QgcGFzcyB0aGVtLlxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmZsYWcoZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlIHx8IGZjPy5sb2dpYy5hc3N1bWVUcnVlKSByZXR1cm47XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgYXBwcm9wcmlhdGUgbG9jYWwgZGlhbG9nc1xuICAgIGNvbnN0IGxvY2FscyA9XG4gICAgICAgIG5wYy5sb2NhbERpYWxvZ3MuZ2V0KGxvY2F0aW9uLmlkKSA/PyBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgPz8gW107XG4gICAgZm9yIChjb25zdCBkIG9mIGxvY2Fscykge1xuICAgICAgLy8gQ29tcHV0ZSB0aGUgY29uZGl0aW9uICdyJyBmb3IgdGhpcyBtZXNzYWdlLlxuICAgICAgY29uc3QgciA9IFsuLi5jb25kc107XG4gICAgICBjb25zdCBmMCA9IHRoaXMuZmxhZyhkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBmMSA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYwPy5sb2dpYy50cmFjaykgci5wdXNoKGYwLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICBpZiAoIWYwPy5sb2dpYy5hc3N1bWVGYWxzZSAmJiAhZjE/LmxvZ2ljLmFzc3VtZVRydWUpIHtcbiAgICAgICAgLy8gT25seSBwcm9jZXNzIHRoaXMgZGlhbG9nIGlmIGl0J3MgcG9zc2libGUgdG8gcGFzcyB0aGUgY29uZGl0aW9uLlxuICAgICAgICB0aGlzLnByb2Nlc3NEaWFsb2coaGl0Ym94LCBucGMsIHIsIGQpO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgd2UgY2FuIG5ldmVyIGFjdHVhbGx5IGdldCBwYXN0IHRoaXMgZGlhbG9nLlxuICAgICAgaWYgKGYwPy5sb2dpYy5hc3N1bWVUcnVlIHx8IGYxPy5sb2dpYy5hc3N1bWVGYWxzZSkgYnJlYWs7XG4gICAgICAvLyBBZGQgYW55IG5ldyBjb25kaXRpb25zIHRvICdjb25kcycgdG8gZ2V0IGJleW9uZCB0aGlzIG1lc3NhZ2UuXG4gICAgICBpZiAoZjE/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNvbmRzLnB1c2goZjEuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzRGlhbG9nKGhpdGJveDogSGl0Ym94LCBucGM6IE5wYyxcbiAgICAgICAgICAgICAgICByZXE6IHJlYWRvbmx5IENvbmRpdGlvbltdLCBkaWFsb2c6IExvY2FsRGlhbG9nKSB7XG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIFtyZXFdLCBkaWFsb2cuZmxhZ3MpO1xuXG4gICAgY29uc3QgaW5mbyA9IHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfTtcbiAgICBzd2l0Y2ggKGRpYWxvZy5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDA4OiAvLyBvcGVuIHN3YW4gZ2F0ZVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCBbcmVxXSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGM6IC8vIGR3YXJmIGNoaWxkIHN0YXJ0cyBmb2xsb3dpbmdcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwZDogLy8gbnBjIHdhbGtzIGF3YXlcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxNDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuU2xpbWVkS2Vuc3UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDEwOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFzaW5hSW5CYWNrUm9vbS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTE6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMV0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDAzOlxuICAgICAgY2FzZSAweDBhOiAvLyBub3JtYWxseSB0aGlzIGhhcmQtY29kZXMgZ2xvd2luZyBsYW1wLCBidXQgd2UgZXh0ZW5kZWQgaXRcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVswXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDk6XG4gICAgICAgIC8vIElmIHplYnUgc3R1ZGVudCBoYXMgYW4gaXRlbS4uLj8gIFRPRE8gLSBzdG9yZSBmZiBpZiB1bnVzZWRcbiAgICAgICAgY29uc3QgaXRlbSA9IG5wYy5kYXRhWzFdO1xuICAgICAgICBpZiAoaXRlbSAhPT0gMHhmZikgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBpdGVtLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Ba2FoYW5hRmx1dGVPZkxpbWVUcmFkZWluLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYTpcbiAgICAgICAgLy8gVE9ETyAtIGNhbiB3ZSByZWFjaCB0aGlzIHNwb3Q/ICBtYXkgbmVlZCB0byBtb3ZlIGRvd24/XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlJhZ2UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBSYWdlIHRocm93aW5nIHBsYXllciBvdXQuLi5cbiAgICAgICAgLy8gVGhpcyBzaG91bGQgYWN0dWFsbHkgYWxyZWFkeSBiZSBoYW5kbGVkIGJ5IHRoZSBzdGF0dWUgY29kZSBhYm92ZT9cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFkZCBleHRyYSBkaWFsb2dzIGZvciBpdGVtdXNlIHRyYWRlcywgZXh0cmEgdHJpZ2dlcnNcbiAgICAvLyAgICAgIC0gaWYgaXRlbSB0cmFkZWQgYnV0IG5vIHJld2FyZCwgdGhlbiByZS1naXZlIHJld2FyZC4uLlxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldCh+bG9jYXRpb24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFt0aGlzLmVudHJhbmNlKGxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlcXVpcmVtZW50Lk9QRU4sIGl0ZW0sIHVzZSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94OiBIaXRib3gsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIFRoaXMgaXMgdGhlIDFiIHRyaWdnZXIgYWN0aW9uIGZvbGxvdy11cC4gIEl0IGxvb2tzIGZvciBhbiBOUEMgaW4gMGQgb3IgMGVcbiAgICAvLyBhbmQgbW92ZXMgdGhlbSBvdmVyIGEgcGl4ZWwuICBGb3IgdGhlIGxvZ2ljLCBpdCdzIGFsd2F5cyBpbiBhIHBvc2l0aW9uXG4gICAgLy8gd2hlcmUganVzdCBtYWtpbmcgdGhlIHRyaWdnZXIgc3F1YXJlIGJlIGEgbm8tZXhpdCBzcXVhcmUgaXMgc3VmZmljaWVudCxcbiAgICAvLyBidXQgd2UgbmVlZCB0byBnZXQgdGhlIGNvbmRpdGlvbnMgcmlnaHQuICBXZSBwYXNzIGluIHRoZSByZXF1aXJlbWVudHMgdG9cbiAgICAvLyBOT1QgdHJpZ2dlciB0aGUgdHJpZ2dlciwgYW5kIHRoZW4gd2Ugam9pbiBpbiBwYXJhbHlzaXMgYW5kL29yIHN0YXR1ZVxuICAgIC8vIGdsaXRjaCBpZiBhcHByb3ByaWF0ZS4gIFRoZXJlIGNvdWxkIHRoZW9yZXRpY2FsbHkgYmUgY2FzZXMgd2hlcmUgdGhlXG4gICAgLy8gZ3VhcmQgaXMgcGFyYWx5emFibGUgYnV0IHRoZSBnZW9tZXRyeSBwcmV2ZW50cyB0aGUgcGxheWVyIGZyb20gYWN0dWFsbHlcbiAgICAvLyBoaXR0aW5nIHRoZW0gYmVmb3JlIHRoZXkgbW92ZSwgYnV0IGl0IGRvZXNuJ3QgaGFwcGVuIGluIHByYWN0aWNlLlxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHJldHVybjtcbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW11bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zLnNsaWNlKDAsIDIpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNOcGMoKSAmJiB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXS5pc1BhcmFseXphYmxlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChbdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoWy4uLnJlcSwgLi4uZXh0cmFdLm1hcChzcHJlYWQpKSk7XG5cblxuICAgIC8vIFRPRE8gLSBQb3J0b2EgZ3VhcmRzIGFyZSBicm9rZW4gOi0oXG4gICAgLy8gVGhlIGJhY2sgZ3VhcmQgbmVlZHMgdG8gYmxvY2sgb24gdGhlIGZyb250IGd1YXJkJ3MgY29uZGl0aW9ucyxcbiAgICAvLyB3aGlsZSB0aGUgZnJvbnQgZ3VhcmQgc2hvdWxkIGJsb2NrIG9uIGZvcnR1bmUgdGVsbGVyP1xuXG4gIH1cblxuICBoYW5kbGVCb2F0KHRpbGU6IFRpbGVJZCwgbG9jYXRpb246IExvY2F0aW9uLCByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gYm9hcmQgYm9hdCAtIHRoaXMgYW1vdW50cyB0byBhZGRpbmcgYSByb3V0ZSBlZGdlIGZyb20gdGhlIHRpbGVcbiAgICAvLyB0byB0aGUgbGVmdCwgdGhyb3VnaCBhbiBleGl0LCBhbmQgdGhlbiBjb250aW51aW5nIHVudGlsIGZpbmRpbmcgbGFuZC5cbiAgICBjb25zdCB0MCA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKTtcbiAgICBpZiAodDAgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB3YWxrYWJsZSBuZWlnaGJvci5gKTtcbiAgICBjb25zdCB5dCA9ICh0aWxlID4+IDgpICYgMHhmMCB8ICh0aWxlID4+IDQpICYgMHhmO1xuICAgIGNvbnN0IHh0ID0gKHRpbGUgPj4gNCkgJiAweGYwIHwgdGlsZSAmIDB4ZjtcbiAgICBsZXQgYm9hdEV4aXQ7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC55dCA9PT0geXQgJiYgZXhpdC54dCA8IHh0KSBib2F0RXhpdCA9IGV4aXQ7XG4gICAgfVxuICAgIGlmICghYm9hdEV4aXQpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYm9hdCBleGl0YCk7XG4gICAgLy8gVE9ETyAtIGxvb2sgdXAgdGhlIGVudHJhbmNlLlxuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbYm9hdEV4aXQuZGVzdF07XG4gICAgaWYgKCFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBkZXN0aW5hdGlvbmApO1xuICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbYm9hdEV4aXQuZW50cmFuY2VdO1xuICAgIGNvbnN0IGVudHJhbmNlVGlsZSA9IFRpbGVJZC5mcm9tKGRlc3QsIGVudHJhbmNlKTtcbiAgICBsZXQgdCA9IGVudHJhbmNlVGlsZTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdCA9IFRpbGVJZC5hZGQodCwgMCwgLTEpO1xuICAgICAgY29uc3QgdDEgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodCk7XG4gICAgICBpZiAodDEgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBib2F0OiBUZXJyYWluID0ge1xuICAgICAgICAgIGVudGVyOiBSZXF1aXJlbWVudC5mcmVlemUocmVxdWlyZW1lbnRzKSxcbiAgICAgICAgICBleGl0OiBbWzB4ZiwgUmVxdWlyZW1lbnQuT1BFTl1dLFxuICAgICAgICB9O1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBib2F0IHRyaWdnZXIuXG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihbdDBdLCBib2F0KTtcbiAgICAgICAgdGhpcy5leGl0cy5zZXQodDAsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZih0MCwgdDEpKTtcbiAgICAgICAgLy8gQWRkIGEgdGVycmFpbiBhbmQgZXhpdCBwYWlyIGZvciB0aGUgZW50cmFuY2Ugd2UgcGFzc2VkXG4gICAgICAgIC8vICh0aGlzIGlzIHByaW1hcmlseSBuZWNlc3NhcnkgZm9yIHdpbGQgd2FycCB0byB3b3JrIGluIGxvZ2ljKS5cbiAgICAgICAgdGhpcy5leGl0cy5zZXQoZW50cmFuY2VUaWxlLCB0MSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5hZGQoVGlsZVBhaXIub2YoZW50cmFuY2VUaWxlLCB0MSkpO1xuICAgICAgICB0aGlzLnRlcnJhaW5zLnNldChlbnRyYW5jZVRpbGUsIHRoaXMudGVycmFpbkZhY3RvcnkudGlsZSgwKSEpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50LCBncmFudElkOiBudW1iZXIpIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtR3JhbnQoZ3JhbnRJZCk7XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgaXRlbTtcbiAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgaXRlbSBncmFudCBmb3IgJHtncmFudElkLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgLy8gaXMgdGhlIDEwMCBmbGFnIHN1ZmZpY2llbnQgaGVyZT8gIHByb2JhYmx5P1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gZ3JhbnRJZCA+PSAweDgwOyAvLyBncmFudGVkIGZyb20gYSB0cmlnZ2VyXG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsIHNsb3QsXG4gICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWUsIHByZXZlbnRMb3NzfSk7XG4gIH1cblxuICBhZGRUZXJyYWluKGhpdGJveDogSGl0Ym94LCB0ZXJyYWluOiBUZXJyYWluKSB7XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgY29uc3QgdCA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgaWYgKHQgPT0gbnVsbCkgY29udGludWU7IC8vIHVucmVhY2hhYmxlIHRpbGVzIGRvbid0IG5lZWQgZXh0cmEgcmVxc1xuICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5tZWV0KHQsIHRlcnJhaW4pKTtcbiAgICB9XG4gIH1cblxuICBhZGRDaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBjaGVja3M6IG51bWJlcltdKSB7XG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcXVpcmVtZW50KSkgcmV0dXJuOyAvLyBkbyBub3RoaW5nIGlmIHVucmVhY2hhYmxlXG4gICAgY29uc3QgY2hlY2sgPSB7cmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudCksIGNoZWNrc307XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0aWxlKSkgY29udGludWU7XG4gICAgICB0aGlzLmNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICB9XG4gIH1cblxuICBhZGRJdGVtQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCxcbiAgICAgICAgICAgICAgIGNoZWNrOiBudW1iZXIsIHNsb3Q6IFNsb3RJbmZvKSB7XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBbY2hlY2tdKTtcbiAgICB0aGlzLnNsb3RzLnNldChjaGVjaywgc2xvdCk7XG4gICAgLy8gYWxzbyBhZGQgY29ycmVzcG9uZGluZyBJdGVtSW5mbyB0byBrZWVwIHRoZW0gaW4gcGFyaXR5LlxuICAgIGNvbnN0IGl0ZW1nZXQgPSB0aGlzLnJvbS5pdGVtR2V0c1t0aGlzLnJvbS5zbG90c1tjaGVjayAmIDB4ZmZdXTtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbaXRlbWdldC5pdGVtSWRdO1xuICAgIGNvbnN0IHVuaXF1ZSA9IGl0ZW0/LnVuaXF1ZTtcbiAgICBjb25zdCBsb3NhYmxlID0gaXRlbWdldC5pc0xvc2FibGUoKTtcbiAgICAvLyBUT0RPIC0gcmVmYWN0b3IgdG8ganVzdCBcImNhbid0IGJlIGJvdWdodFwiP1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gdW5pcXVlIHx8IGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk9wZWxTdGF0dWU7XG4gICAgbGV0IHdlaWdodCA9IDE7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXaW5kKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mRmlyZSkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldhdGVyKSB3ZWlnaHQgPSAxMDtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZlRodW5kZXIpIHdlaWdodCA9IDE1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5GbGlnaHQpIHdlaWdodCA9IDE1O1xuICAgIHRoaXMuaXRlbXMuc2V0KDB4MjAwIHwgaXRlbWdldC5pZCwge3VuaXF1ZSwgbG9zYWJsZSwgcHJldmVudExvc3MsIHdlaWdodH0pO1xuICB9XG5cbiAgYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCwgZmxhZ3M6IG51bWJlcltdKSB7XG4gICAgY29uc3QgY2hlY2tzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBjaGVja3MpO1xuICB9XG5cbiAgd2Fsa2FibGVOZWlnaGJvcih0OiBUaWxlSWQpOiBUaWxlSWR8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQpKSByZXR1cm4gdDtcbiAgICBmb3IgKGxldCBkIG9mIFstMSwgMV0pIHtcbiAgICAgIGNvbnN0IHQxID0gVGlsZUlkLmFkZCh0LCBkLCAwKTtcbiAgICAgIGNvbnN0IHQyID0gVGlsZUlkLmFkZCh0LCAwLCBkKTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDEpKSByZXR1cm4gdDE7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQyKSkgcmV0dXJuIHQyO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNXYWxrYWJsZSh0OiBUaWxlSWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISh0aGlzLmdldEVmZmVjdHModCkgJiBUZXJyYWluLkJJVFMpO1xuICB9XG5cbiAgZW5zdXJlUGFzc2FibGUodDogVGlsZUlkKTogVGlsZUlkIHtcbiAgICByZXR1cm4gdGhpcy5pc1dhbGthYmxlKHQpID8gdCA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0O1xuICB9XG5cbiAgZ2V0RWZmZWN0cyh0OiBUaWxlSWQpOiBudW1iZXIge1xuICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW3QgPj4+IDE2XTtcbiAgICAvL2NvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdLmVmZmVjdHM7XG4gICAgY29uc3Qgc2NyID0gbG9jYXRpb24uc2NyZWVuc1sodCAmIDB4ZjAwMCkgPj4+IDEyXVsodCAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgcmV0dXJuIGVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXV07XG4gIH1cblxuICBwcm9jZXNzQm9zcyhsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEJvc3NlcyB3aWxsIGNsb2JiZXIgdGhlIGVudHJhbmNlIHBvcnRpb24gb2YgYWxsIHRpbGVzIG9uIHRoZSBzY3JlZW4sXG4gICAgLy8gYW5kIHdpbGwgYWxzbyBhZGQgdGhlaXIgZHJvcC5cbiAgICBpZiAoc3Bhd24uaWQgPT09IDB4YzkgfHwgc3Bhd24uaWQgPT09IDB4Y2EpIHJldHVybjsgLy8gc3RhdHVlc1xuICAgIGNvbnN0IGlzUmFnZSA9IHNwYXduLmlkID09PSAweGMzO1xuICAgIGNvbnN0IGJvc3MgPVxuICAgICAgICBpc1JhZ2UgPyB0aGlzLnJvbS5ib3NzZXMuUmFnZSA6XG4gICAgICAgIHRoaXMucm9tLmJvc3Nlcy5mcm9tTG9jYXRpb24obG9jYXRpb24uaWQpO1xuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuICAgIGlmICghYm9zcyB8fCAhYm9zcy5mbGFnKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBib3NzIGF0ICR7bG9jYXRpb24ubmFtZX1gKTtcbiAgICBjb25zdCBzY3JlZW4gPSB0aWxlICYgfjB4ZmY7XG4gICAgLy8gTk9URTogUmFnZSBjYW4gYmUgZXhpdGVkIHNvdXRoLi4uIGJ1dCB0aGlzIG9ubHkgbWF0dGVycyBpZiB0aGVyZSdzXG4gICAgLy8gYW55dGhpbmcgb3RoZXIgdGhhbiBNZXNpYSdzIHNocmluZSBiZWhpbmQgaGltLCB3aGljaCBtYWtlcyBhIGxvdCBvZlxuICAgIC8vIGxvZ2ljIG1vcmUgZGlmZmljdWx0LCBzbyBsaWtlbHkgdGhpcyBlbnRyYW5jZSB3aWxsIHN0YXkgcHV0IGZvcmV2ZXIuXG4gICAgY29uc3QgYm9zc1RlcnJhaW4gPSB0aGlzLnRlcnJhaW5GYWN0b3J5LmJvc3MoYm9zcy5mbGFnLmlkKTtcbiAgICBjb25zdCBoaXRib3ggPSBzZXEoMHhmMCwgKHQ6IG51bWJlcikgPT4gKHNjcmVlbiB8IHQpIGFzIFRpbGVJZCk7XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgYm9zc1RlcnJhaW4pO1xuICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgYm9zcyk7XG4gIH1cblxuICBhZGRCb3NzQ2hlY2soaGl0Ym94OiBIaXRib3gsIGJvc3M6IEJvc3MsXG4gICAgICAgICAgICAgICByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50ID0gUmVxdWlyZW1lbnQuT1BFTikge1xuICAgIGlmIChib3NzLmZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhIGZsYWc6ICR7Ym9zc31gKTtcbiAgICBjb25zdCByZXEgPSBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKGJvc3MpKTtcbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbYm9zcy5mbGFnLmlkXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgIGhpdGJveCwgcmVxLCBib3NzLmZsYWcuaWQsIHtsb3NzeTogZmFsc2UsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NDaGVzdChsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEFkZCBhIGNoZWNrIGZvciB0aGUgMXh4IGZsYWcuICBNYWtlIHN1cmUgaXQncyBub3QgYSBtaW1pYy5cbiAgICBpZiAodGhpcy5yb20uc2xvdHNbc3Bhd24uaWRdID49IDB4NzApIHJldHVybjtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBzcGF3bi5pZDtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF07XG4gICAgaWYgKG1hcHBlZCA+PSAweDcwKSByZXR1cm47IC8vIFRPRE8gLSBtaW1pYyUgbWF5IGNhcmVcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbbWFwcGVkXTtcbiAgICBjb25zdCB1bmlxdWUgPSB0aGlzLmZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSA/ICEhaXRlbT8udW5pcXVlIDogdHJ1ZTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sIFJlcXVpcmVtZW50Lk9QRU4sXG4gICAgICAgICAgICAgICAgICAgICAgc2xvdCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlfSk7XG4gIH1cblxuICBwcm9jZXNzTW9uc3Rlcihsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuXG4gICAgLy8gVE9ETyAtIGN1cnJlbnRseSBkb24ndCBoYW5kbGUgZmx5ZXJzIHdlbGwgLSBjb3VsZCBpbnN0ZWFkIGFkZCBmbHllcnNcbiAgICAvLyAgICAgICAgdG8gYWxsIGVudHJhbmNlcz9cblxuICAgIC8vIENoZWNrIG1vbnN0ZXIncyB2dWxuZXJhYmlsaXRpZXMgYW5kIGFkZCBhIGNoZWNrIGZvciBNb25leSBnaXZlbiBzd29yZHMuXG4gICAgY29uc3QgbW9uc3RlciA9IHRoaXMucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIHJldHVybjtcbiAgICBpZiAoIShtb25zdGVyLmdvbGREcm9wKSkgcmV0dXJuO1xuICAgIGNvbnN0IHtcbiAgICAgIE1vbmV5LFxuICAgICAgU3dvcmQsIFN3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlcixcbiAgICB9ID0gdGhpcy5yb20uZmxhZ3M7XG4gICAgY29uc3QgaGl0Ym94ID0gW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildO1xuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIFN3b3JkLnIsIFtNb25leS5pZF0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzd29yZHMgPVxuICAgICAgICBbU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyXVxuICAgICAgICAgICAgLmZpbHRlcigoXywgaSkgPT4gbW9uc3Rlci5lbGVtZW50cyAmICgxIDw8IGkpKTtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY29sbGVjdGluZyBhbGwgdGhlIGVsZW1lbnRzIGluIG9uZSBwbGFjZSBmaXJzdFxuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBvciguLi5zd29yZHMpLCBbTW9uZXkuaWRdKTtcbiAgfVxuXG4gIHByb2Nlc3NJdGVtVXNlKGhpdGJveDogSGl0Ym94LCByZXExOiBSZXF1aXJlbWVudCwgaXRlbTogSXRlbSwgdXNlOiBJdGVtVXNlKSB7XG4gICAgLy8gdGhpcyBzaG91bGQgaGFuZGxlIG1vc3QgdHJhZGUtaW5zIGF1dG9tYXRpY2FsbHlcbiAgICBoaXRib3ggPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0KSk7XG4gICAgY29uc3QgcmVxMiA9IFtbKDB4MjAwIHwgaXRlbS5pZCkgYXMgQ29uZGl0aW9uXV07IC8vIHJlcXVpcmVzIHRoZSBpdGVtLlxuICAgIC8vIGNoZWNrIGZvciBraXJpc2EgcGxhbnQsIGFkZCBjaGFuZ2UgYXMgYSByZXF1aXJlbWVudC5cbiAgICBpZiAoaXRlbS5pZCA9PT0gdGhpcy5yb20ucHJnWzB4M2Q0YjVdICsgMHgxYykge1xuICAgICAgcmVxMlswXS5wdXNoKHRoaXMucm9tLmZsYWdzLkNoYW5nZS5jKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk1lZGljYWxIZXJiKSB7IC8vIGRvbHBoaW5cbiAgICAgIHJlcTJbMF1bMF0gPSB0aGlzLnJvbS5mbGFncy5CdXlIZWFsaW5nLmM7IC8vIG5vdGU6IG5vIG90aGVyIGhlYWxpbmcgaXRlbXNcbiAgICB9XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXExLCByZXEyKTtcbiAgICAvLyBzZXQgYW55IGZsYWdzXG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIHJlcSwgdXNlLmZsYWdzKTtcbiAgICAvLyBoYW5kbGUgYW55IGV4dHJhIGFjdGlvbnNcbiAgICBzd2l0Y2ggKHVzZS5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDEwOlxuICAgICAgICAvLyB1c2Uga2V5XG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIHJlcSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6IGNhc2UgMHgxYzpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIGl0ZW0gSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxLCBpdGVtLmlkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDI6XG4gICAgICAgIC8vIGRvbHBoaW4gZGVmZXJzIHRvIGRpYWxvZyBhY3Rpb24gMTEgKGFuZCAwZCB0byBzd2ltIGF3YXkpXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAweDEwMCB8IHRoaXMucm9tLm5wY3NbdXNlLndhbnQgJiAweGZmXS5kYXRhWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzS2V5VXNlKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gc2V0IHRoZSBjdXJyZW50IHNjcmVlbidzIGZsYWcgaWYgdGhlIGNvbmRpdGlvbnMgYXJlIG1ldC4uLlxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIG9ubHkgYSBzaW5nbGUgc2NyZWVuLlxuICAgIGNvbnN0IFtzY3JlZW4sIC4uLnJlc3RdID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiBTY3JlZW5JZC5mcm9tKHQpKSk7XG4gICAgaWYgKHNjcmVlbiA9PSBudWxsIHx8IHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG9uZSBzY3JlZW5gKTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tzY3JlZW4gPj4+IDhdO1xuICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IChzY3JlZW4gJiAweGZmKSk7XG4gICAgaWYgKGZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBmbGFnIG9uIHNjcmVlbmApO1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtmbGFnLmZsYWddKTtcbiAgfVxuXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuUmFnZSkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBSYWdlLiAgRmlndXJlIG91dCB3aGF0IGhlIHdhbnRzIGZyb20gdGhlIGRpYWxvZy5cbiAgICAgIGNvbnN0IHVua25vd25Td29yZCA9IHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQucmFuZG9taXplVHJhZGVzKCk7XG4gICAgICBpZiAodW5rbm93blN3b3JkKSByZXR1cm4gdGhpcy5yb20uZmxhZ3MuU3dvcmQucjsgLy8gYW55IHN3b3JkIG1pZ2h0IGRvLlxuICAgICAgcmV0dXJuIFtbdGhpcy5yb20ubnBjcy5SYWdlLmRpYWxvZygpWzBdLmNvbmRpdGlvbiBhcyBDb25kaXRpb25dXTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCByID0gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgfHxcbiAgICAgICAgIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHIuYWRkQWxsKHRoaXMucm9tLmZsYWdzLlN3b3JkLnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgci5hZGRBbGwodGhpcy5zd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENhbid0IGFjdHVhbGx5IGtpbGwgdGhlIGJvc3MgaWYgaXQgZG9lc24ndCBzcGF3bi5cbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW10gPSBbXTtcbiAgICBpZiAoYm9zcy5ucGMgIT0gbnVsbCAmJiBib3NzLmxvY2F0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uID0gYm9zcy5ucGMuc3Bhd25zKHRoaXMucm9tLmxvY2F0aW9uc1tib3NzLmxvY2F0aW9uXSk7XG4gICAgICBleHRyYS5wdXNoKC4uLnRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9uKVswXSk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuSW5zZWN0KSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkluc2VjdEZsdXRlLmMsIHRoaXMucm9tLmZsYWdzLkdhc01hc2suYyk7XG4gICAgfSBlbHNlIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuQm93T2ZUcnV0aC5jKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuUmVmcmVzaC5jKTtcbiAgICB9XG4gICAgci5yZXN0cmljdChbZXh0cmFdKTtcbiAgICByZXR1cm4gUmVxdWlyZW1lbnQuZnJlZXplKHIpO1xuICB9XG5cbiAgc3dvcmRSZXF1aXJlbWVudChlbGVtZW50OiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gICAgY29uc3Qgc3dvcmQgPSBbXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZkZpcmUsXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAxKSByZXR1cm4gc3dvcmQucjtcbiAgICBjb25zdCBwb3dlcnMgPSBbXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuVG9ybmFkb0JyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZGaXJlLCB0aGlzLnJvbS5mbGFncy5GbGFtZUJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuQmxpenphcmRCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mVGh1bmRlciwgdGhpcy5yb20uZmxhZ3MuU3Rvcm1CcmFjZWxldF0sXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDMpIHJldHVybiBhbmQoc3dvcmQsIC4uLnBvd2Vycyk7XG4gICAgcmV0dXJuIHBvd2Vycy5tYXAocG93ZXIgPT4gW3N3b3JkLmMsIHBvd2VyLmNdKTtcbiAgfVxuXG4gIGl0ZW1HcmFudChpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0aGlzLnJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMpIHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaXRlbSBncmFudCAke2lkLnRvU3RyaW5nKDE2KX1gKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3IgYWxsIG9mIHRoZSBmbGFncyBiZWluZyBtZXQuICovXG4gIGZpbHRlclJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IGNvbmRzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA8IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvbmRzXTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3Igc29tZSBmbGFnIG5vdCBiZWluZyBtZXQuICovXG4gIGZpbHRlckFudGlSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCByZXEgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnID49IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5mbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIHJlcS5wdXNoKFtmLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVxO1xuICB9XG5cbiAgZmxhZyhmbGFnOiBudW1iZXIpOiBGbGFnfHVuZGVmaW5lZCB7XG4gICAgLy9jb25zdCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgIGNvbnN0IHVuc2lnbmVkID0gZmxhZzsgIC8vIFRPRE8gLSBzaG91bGQgd2UgYXV0by1pbnZlcnQ/XG4gICAgY29uc3QgZiA9IHRoaXMucm9tLmZsYWdzW3Vuc2lnbmVkXTtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmFsaWFzZXMuZ2V0KGYpID8/IGY7XG4gICAgcmV0dXJuIG1hcHBlZDtcbiAgfVxuXG4gIGVudHJhbmNlKGxvY2F0aW9uOiBMb2NhdGlvbnxudW1iZXIsIGluZGV4ID0gMCk6IFRpbGVJZCB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ251bWJlcicpIGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICByZXR1cm4gdGhpcy50aWxlcy5maW5kKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBsb2NhdGlvbi5lbnRyYW5jZXNbaW5kZXhdKSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh3YWxsOiBXYWxsVHlwZSk6IG51bWJlciB7XG4gICAgc3dpdGNoICh3YWxsKSB7XG4gICAgICBjYXNlIFdhbGxUeXBlLldJTkQ6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha1N0b25lLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5GSVJFOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJY2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLldBVEVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuRm9ybUJyaWRnZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuVEhVTkRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSXJvbi5pZDtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgYmFkIHdhbGwgdHlwZTogJHt3YWxsfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhbmQoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gIHJldHVybiBbZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBmLmlkIGFzIENvbmRpdGlvbildO1xufVxuXG5mdW5jdGlvbiBvciguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgcmV0dXJuIGZsYWdzLm1hcCgoZjogRmxhZykgPT4gW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG59XG5cbi8vIEFuIGludGVyZXN0aW5nIHdheSB0byB0cmFjayB0ZXJyYWluIGNvbWJpbmF0aW9ucyBpcyB3aXRoIHByaW1lcy5cbi8vIElmIHdlIGhhdmUgTiBlbGVtZW50cyB3ZSBjYW4gbGFiZWwgZWFjaCBhdG9tIHdpdGggYSBwcmltZSBhbmRcbi8vIHRoZW4gbGFiZWwgYXJiaXRyYXJ5IGNvbWJpbmF0aW9ucyB3aXRoIHRoZSBwcm9kdWN0LiAgRm9yIE49MTAwMFxuLy8gdGhlIGhpZ2hlc3QgbnVtYmVyIGlzIDgwMDAsIHNvIHRoYXQgaXQgY29udHJpYnV0ZXMgYWJvdXQgMTMgYml0c1xuLy8gdG8gdGhlIHByb2R1Y3QsIG1lYW5pbmcgd2UgY2FuIHN0b3JlIGNvbWJpbmF0aW9ucyBvZiA0IHNhZmVseVxuLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gYmlnaW50LiAgVGhpcyBpcyBpbmhlcmVudGx5IG9yZGVyLWluZGVwZW5kZW50LlxuLy8gSWYgdGhlIHJhcmVyIG9uZXMgYXJlIGhpZ2hlciwgd2UgY2FuIGZpdCBzaWduaWZpY2FudGx5IG1vcmUgdGhhbiA0LlxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyBEZWJ1ZyBpbnRlcmZhY2UuXG5leHBvcnQgaW50ZXJmYWNlIEFyZWFEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xuICBjaGVja3M6IEFycmF5PFtGbGFnLCBSZXF1aXJlbWVudF0+O1xuICB0ZXJyYWluOiBUZXJyYWluO1xuICBsb2NhdGlvbnM6IFNldDxudW1iZXI+O1xuICByb3V0ZXM6IFJlcXVpcmVtZW50LkZyb3plbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZURhdGEge1xuICBhcmVhOiBBcmVhRGF0YTtcbiAgZXhpdD86IFRpbGVJZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYXM6IFNldDxBcmVhRGF0YT47XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV29ybGREYXRhIHtcbiAgdGlsZXM6IE1hcDxUaWxlSWQsIFRpbGVEYXRhPjtcbiAgYXJlYXM6IEFyZWFEYXRhW107XG4gIGxvY2F0aW9uczogTG9jYXRpb25EYXRhW107XG59XG4iXX0=