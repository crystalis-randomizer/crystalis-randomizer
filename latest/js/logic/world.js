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
        const { locations: { Leaf_ToolShop, MezameShrine, Oak, Shyron_ToolShop, }, flags: { AbleToRideDolphin, BallOfFire, BallOfThunder, BallOfWater, BallOfWind, Barrier, BlizzardBracelet, BowOfMoon, BowOfSun, BreakStone, BreakIce, BreakIron, BrokenStatue, BuyHealing, BuyWarp, ClimbWaterfall, ClimbSlope8, ClimbSlope9, CrossPain, CurrentlyRidingDolphin, Flight, FlameBracelet, FormBridge, GasMask, GlowingLamp, InjuredDolphin, LeadingChild, LeatherBoots, Money, OpenedCrypt, RabbitBoots, Refresh, RepairedStatue, RescuedChild, ShellFlute, ShieldRing, ShootingStatue, StormBracelet, Sword, SwordOfFire, SwordOfThunder, SwordOfWater, SwordOfWind, TornadoBracelet, TravelSwamp, WildWarp, }, items: { MedicalHerb, WarpBoots, }, } = this.rom;
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
        const pain = this.flagset.changeGasMaskToHazmatSuit() ? GasMask : LeatherBoots;
        this.addCheck([start], or(Flight, RabbitBoots, pain), [CrossPain.id]);
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
                [Money.c, Refresh.c]], [TravelSwamp.id, CrossPain.id]);
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
            if (effects & Terrain.PAIN) {
                for (const delta of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
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
                    const effects = location.isShop() ? 0 : tileEffects.effects[tile];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQW1FaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVB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QUFDLENBQUM7QUFDckQsQ0FBQztBQUVELFNBQVMsRUFBRSxDQUFDLEdBQUcsS0FBYTtJQUMxQixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQVVELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXJlYX0gZnJvbSAnLi4vc3BvaWxlci9hcmVhLmpzJztcbmltcG9ydCB7ZGllfSBmcm9tICcuLi9hc3NlcnQuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0Jvc3N9IGZyb20gJy4uL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtGbGFnLCBMb2dpY30gZnJvbSAnLi4vcm9tL2ZsYWdzLmpzJztcbmltcG9ydCB7SXRlbSwgSXRlbVVzZX0gZnJvbSAnLi4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge0xvY2FsRGlhbG9nLCBOcGN9IGZyb20gJy4uL3JvbS9ucGMuanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXgsIHNlcX0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXAsIExhYmVsZWRTZXQsIGl0ZXJzLCBzcHJlYWR9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtEaXJ9IGZyb20gJy4vZGlyLmpzJztcbmltcG9ydCB7SXRlbUluZm8sIExvY2F0aW9uTGlzdCwgU2xvdEluZm99IGZyb20gJy4vZ3JhcGguanMnO1xuaW1wb3J0IHtIaXRib3h9IGZyb20gJy4vaGl0Ym94LmpzJztcbmltcG9ydCB7Q29uZGl0aW9uLCBSZXF1aXJlbWVudCwgUm91dGV9IGZyb20gJy4vcmVxdWlyZW1lbnQuanMnO1xuaW1wb3J0IHtTY3JlZW5JZH0gZnJvbSAnLi9zY3JlZW5pZC5qcyc7XG5pbXBvcnQge1RlcnJhaW4sIFRlcnJhaW5zfSBmcm9tICcuL3RlcnJhaW4uanMnO1xuaW1wb3J0IHtUaWxlSWR9IGZyb20gJy4vdGlsZWlkLmpzJztcbmltcG9ydCB7VGlsZVBhaXJ9IGZyb20gJy4vdGlsZXBhaXIuanMnO1xuaW1wb3J0IHtXYWxsVHlwZX0gZnJvbSAnLi93YWxsdHlwZS5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi4vcm9tL21vbnN0ZXIuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG5pbnRlcmZhY2UgQ2hlY2sge1xuICByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQ7XG4gIGNoZWNrczogbnVtYmVyW107XG59XG5cbi8vIEJhc2ljIGFsZ29yaXRobTpcbi8vICAxLiBmaWxsIHRlcnJhaW5zIGZyb20gbWFwc1xuLy8gIDIuIG1vZGlmeSB0ZXJyYWlucyBiYXNlZCBvbiBucGNzLCB0cmlnZ2VycywgYm9zc2VzLCBldGNcbi8vICAyLiBmaWxsIGFsbEV4aXRzXG4vLyAgMy4gc3RhcnQgdW5pb25maW5kXG4vLyAgNC4gZmlsbCAuLi4/XG5cbi8qKiBTdG9yZXMgYWxsIHRoZSByZWxldmFudCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgd29ybGQncyBsb2dpYy4gKi9cbmV4cG9ydCBjbGFzcyBXb3JsZCB7XG5cbiAgLyoqIEJ1aWxkcyBhbmQgY2FjaGVzIFRlcnJhaW4gb2JqZWN0cy4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbkZhY3RvcnkgPSBuZXcgVGVycmFpbnModGhpcy5yb20pO1xuXG4gIC8qKiBUZXJyYWlucyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSB0ZXJyYWlucyA9IG5ldyBNYXA8VGlsZUlkLCBUZXJyYWluPigpO1xuXG4gIC8qKiBDaGVja3MgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgY2hlY2tzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBTZXQ8Q2hlY2s+PigoKSA9PiBuZXcgU2V0KCkpO1xuXG4gIC8qKiBTbG90IGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBzbG90cyA9IG5ldyBNYXA8bnVtYmVyLCBTbG90SW5mbz4oKTtcbiAgLyoqIEl0ZW0gaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IGl0ZW1zID0gbmV3IE1hcDxudW1iZXIsIEl0ZW1JbmZvPigpO1xuXG4gIC8qKiBGbGFncyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGRpcmVjdCBhbGlhc2VzIGZvciBsb2dpYy4gKi9cbiAgcmVhZG9ubHkgYWxpYXNlczogTWFwPEZsYWcsIEZsYWc+O1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gaXRlbXVzZSB0cmlnZ2VycyB0byB0aGUgaXRlbXVzZSB0aGF0IHdhbnRzIGl0LiAqL1xuICByZWFkb25seSBpdGVtVXNlcyA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgW0l0ZW0sIEl0ZW1Vc2VdW10+KCgpID0+IFtdKTtcblxuICAvKiogUmF3IG1hcHBpbmcgb2YgZXhpdHMsIHdpdGhvdXQgY2Fub25pY2FsaXppbmcuICovXG4gIHJlYWRvbmx5IGV4aXRzID0gbmV3IE1hcDxUaWxlSWQsIFRpbGVJZD4oKTtcblxuICAvKiogTWFwcGluZyBmcm9tIGV4aXRzIHRvIGVudHJhbmNlcy4gIFRpbGVQYWlyIGlzIGNhbm9uaWNhbGl6ZWQuICovXG4gIHJlYWRvbmx5IGV4aXRTZXQgPSBuZXcgU2V0PFRpbGVQYWlyPigpO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgVGlsZUlkcyB3aXRoIHNlYW1sZXNzIGV4aXRzLiAgVGhpcyBpcyB1c2VkIHRvIGVuc3VyZSB0aGVcbiAgICogbG9naWMgdW5kZXJzdGFuZHMgdGhhdCB0aGUgcGxheWVyIGNhbid0IHdhbGsgYWNyb3NzIGFuIGV4aXQgdGlsZVxuICAgKiB3aXRob3V0IGNoYW5naW5nIGxvY2F0aW9ucyAocHJpbWFyaWx5IGZvciBkaXNhYmxpbmcgdGVsZXBvcnRcbiAgICogc2tpcCkuXG4gICAqL1xuICByZWFkb25seSBzZWFtbGVzc0V4aXRzID0gbmV3IFNldDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIFVuaW9uZmluZCBvZiBjb25uZWN0ZWQgY29tcG9uZW50cyBvZiB0aWxlcy4gIE5vdGUgdGhhdCBhbGwgdGhlXG4gICAqIGFib3ZlIHByb3BlcnRpZXMgY2FuIGJlIGJ1aWx0IHVwIGluIHBhcmFsbGVsLCBidXQgdGhlIHVuaW9uZmluZFxuICAgKiBjYW5ub3QgYmUgc3RhcnRlZCB1bnRpbCBhZnRlciBhbGwgdGVycmFpbnMgYW5kIGV4aXRzIGFyZVxuICAgKiByZWdpc3RlcmVkLCBzaW5jZSB3ZSBzcGVjaWZpY2FsbHkgbmVlZCB0byAqbm90KiB1bmlvbiBjZXJ0YWluXG4gICAqIG5laWdoYm9ycy5cbiAgICovXG4gIHJlYWRvbmx5IHRpbGVzID0gbmV3IFVuaW9uRmluZDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBUaWxlUGFpcnMgb2YgY2Fub25pY2FsIHVuaW9uZmluZCByZXByZXNlbnRhdGl2ZSBUaWxlSWRzIHRvXG4gICAqIGEgYml0c2V0IG9mIG5laWdoYm9yIGRpcmVjdGlvbnMuICBXZSBvbmx5IG5lZWQgdG8gd29ycnkgYWJvdXRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgYmVjYXVzZSBhbGwgVGlsZUlkcyBoYXZlIHRoZSBzYW1lIHRlcnJhaW4uXG4gICAqIFdlIHdpbGwgYWRkIGEgcm91dGUgZm9yIGVhY2ggZGlyZWN0aW9uIHdpdGggdW5pcXVlIHJlcXVpcmVtZW50cy5cbiAgICovXG4gIHJlYWRvbmx5IG5laWdoYm9ycyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVQYWlyLCBudW1iZXI+KCgpID0+IDApO1xuXG4gIC8qKiBSZXF1aXJlbWVudCBidWlsZGVyIGZvciByZWFjaGluZyBlYWNoIGNhbm9uaWNhbCBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHJvdXRlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgICgpID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCkpO1xuXG4gIC8qKiBSb3V0ZXMgb3JpZ2luYXRpbmcgZnJvbSBlYWNoIGNhbm9uaWNhbCB0aWxlLiAqL1xuICByZWFkb25seSByb3V0ZUVkZ2VzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgTGFiZWxlZFNldDxSb3V0ZT4+KCgpID0+IG5ldyBMYWJlbGVkU2V0KCkpO1xuXG4gIC8qKiBMb2NhdGlvbiBsaXN0OiB0aGlzIGlzIHRoZSByZXN1bHQgb2YgY29tYmluaW5nIHJvdXRlcyB3aXRoIGNoZWNrcy4gKi9cbiAgcmVhZG9ubHkgcmVxdWlyZW1lbnRNYXAgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8Q29uZGl0aW9uLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoYzogQ29uZGl0aW9uKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcihjKSk7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sIHJlYWRvbmx5IGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHRyYWNrZXIgPSBmYWxzZSkge1xuICAgIC8vIEJ1aWxkIGl0ZW1Vc2VzXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCB1c2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAodXNlLmtpbmQgPT09ICdleHBlY3QnKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQodXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHVzZS5raW5kID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQofnVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBCdWlsZCBhbGlhc2VzXG4gICAgdGhpcy5hbGlhc2VzID0gbmV3IE1hcChbXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZUFrYWhhbmEsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTb2xkaWVyLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU3RvbSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVdvbWFuLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5UYXZlcm4sIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgIF0pO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBsb2NhdGlvbnMgdG8gYnVpbGQgdXAgaW5mbyBhYm91dCB0aWxlcywgdGVycmFpbnMsIGNoZWNrcy5cbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5hZGRFeHRyYUNoZWNrcygpO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIFVuaW9uRmluZCBhbmQgdGhlIGV4aXRzIGFuZCBuZWlnaGJvcnMgc3RydWN0dXJlcy5cbiAgICB0aGlzLnVuaW9uTmVpZ2hib3JzKCk7XG4gICAgdGhpcy5yZWNvcmRFeGl0cygpO1xuICAgIHRoaXMuYnVpbGROZWlnaGJvcnMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSByb3V0ZXMvZWRnZXMuXG4gICAgdGhpcy5hZGRBbGxSb3V0ZXMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBsb2NhdGlvbiBsaXN0LlxuICAgIHRoaXMuY29uc29saWRhdGVDaGVja3MoKTtcbiAgICB0aGlzLmJ1aWxkUmVxdWlyZW1lbnRNYXAoKTtcbiAgfVxuXG4gIC8qKiBBZGRzIGNoZWNrcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYUNoZWNrcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBsb2NhdGlvbnM6IHtcbiAgICAgICAgTGVhZl9Ub29sU2hvcCxcbiAgICAgICAgTWV6YW1lU2hyaW5lLFxuICAgICAgICBPYWssXG4gICAgICAgIFNoeXJvbl9Ub29sU2hvcCxcbiAgICAgIH0sXG4gICAgICBmbGFnczoge1xuICAgICAgICBBYmxlVG9SaWRlRG9scGhpbixcbiAgICAgICAgQmFsbE9mRmlyZSwgQmFsbE9mVGh1bmRlciwgQmFsbE9mV2F0ZXIsIEJhbGxPZldpbmQsXG4gICAgICAgIEJhcnJpZXIsIEJsaXp6YXJkQnJhY2VsZXQsIEJvd09mTW9vbiwgQm93T2ZTdW4sXG4gICAgICAgIEJyZWFrU3RvbmUsIEJyZWFrSWNlLCBCcmVha0lyb24sXG4gICAgICAgIEJyb2tlblN0YXR1ZSwgQnV5SGVhbGluZywgQnV5V2FycCxcbiAgICAgICAgQ2xpbWJXYXRlcmZhbGwsIENsaW1iU2xvcGU4LCBDbGltYlNsb3BlOSxcbiAgICAgICAgQ3Jvc3NQYWluLCBDdXJyZW50bHlSaWRpbmdEb2xwaGluLFxuICAgICAgICBGbGlnaHQsIEZsYW1lQnJhY2VsZXQsIEZvcm1CcmlkZ2UsXG4gICAgICAgIEdhc01hc2ssIEdsb3dpbmdMYW1wLFxuICAgICAgICBJbmp1cmVkRG9scGhpbixcbiAgICAgICAgTGVhZGluZ0NoaWxkLCBMZWF0aGVyQm9vdHMsXG4gICAgICAgIE1vbmV5LFxuICAgICAgICBPcGVuZWRDcnlwdCxcbiAgICAgICAgUmFiYml0Qm9vdHMsIFJlZnJlc2gsIFJlcGFpcmVkU3RhdHVlLCBSZXNjdWVkQ2hpbGQsXG4gICAgICAgIFNoZWxsRmx1dGUsIFNoaWVsZFJpbmcsIFNob290aW5nU3RhdHVlLCBTdG9ybUJyYWNlbGV0LFxuICAgICAgICBTd29yZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZUaHVuZGVyLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZXaW5kLFxuICAgICAgICBUb3JuYWRvQnJhY2VsZXQsIFRyYXZlbFN3YW1wLFxuICAgICAgICBXaWxkV2FycCxcbiAgICAgIH0sXG4gICAgICBpdGVtczoge1xuICAgICAgICBNZWRpY2FsSGVyYixcbiAgICAgICAgV2FycEJvb3RzLFxuICAgICAgfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSk7XG4gICAgY29uc3QgZW50ZXJPYWsgPSB0aGlzLmVudHJhbmNlKE9hayk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQm93T2ZNb29uLCBCb3dPZlN1biksIFtPcGVuZWRDcnlwdC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEFibGVUb1JpZGVEb2xwaGluLCBTaGVsbEZsdXRlKSxcbiAgICAgICAgICAgICAgICAgIFtDdXJyZW50bHlSaWRpbmdEb2xwaGluLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbZW50ZXJPYWtdLCBhbmQoTGVhZGluZ0NoaWxkKSwgW1Jlc2N1ZWRDaGlsZC5pZF0pO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtzdGFydF0sIGFuZChHbG93aW5nTGFtcCwgQnJva2VuU3RhdHVlKSxcbiAgICAgICAgICAgICAgICAgICAgICBSZXBhaXJlZFN0YXR1ZS5pZCwge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcblxuICAgIC8vIEFkZCBzaG9wc1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBMZWFmX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBTaHlyb25fVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KV07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gTWVkaWNhbEhlcmIuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eUhlYWxpbmcuaWRdKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSBXYXJwQm9vdHMuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eVdhcnAuaWRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBwc2V1ZG8gZmxhZ3NcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2luZC5yO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mRmlyZS5yO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXYXRlci5yO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gU3dvcmRPZlRodW5kZXIucjtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgY29uc3Qgd2luZDIgPSBvcihCYWxsT2ZXaW5kLCBUb3JuYWRvQnJhY2VsZXQpO1xuICAgICAgY29uc3QgZmlyZTIgPSBvcihCYWxsT2ZGaXJlLCBGbGFtZUJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHdhdGVyMiA9IG9yKEJhbGxPZldhdGVyLCBCbGl6emFyZEJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHRodW5kZXIyID0gb3IoQmFsbE9mVGh1bmRlciwgU3Rvcm1CcmFjZWxldCk7XG4gICAgICBicmVha1N0b25lID0gUmVxdWlyZW1lbnQubWVldChicmVha1N0b25lLCB3aW5kMik7XG4gICAgICBicmVha0ljZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJY2UsIGZpcmUyKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBSZXF1aXJlbWVudC5tZWV0KGZvcm1CcmlkZ2UsIHdhdGVyMik7XG4gICAgICBicmVha0lyb24gPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSXJvbiwgdGh1bmRlcjIpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9XG4gICAgICAgICAgICBSZXF1aXJlbWVudC5vcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogRmxhZyk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChcbiAgICAgICAgICAgICAgKGM6IHJlYWRvbmx5IENvbmRpdGlvbltdKSA9PlxuICAgICAgICAgICAgICAgICAgY1swXSA9PT0gc3dvcmQuYyA/IGMgOiBbc3dvcmQuYywgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKFN3b3JkT2ZXaW5kKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKFN3b3JkT2ZGaXJlKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoU3dvcmRPZldhdGVyKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChTd29yZE9mVGh1bmRlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtTdG9uZSwgW0JyZWFrU3RvbmUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSWNlLCBbQnJlYWtJY2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGZvcm1CcmlkZ2UsIFtGb3JtQnJpZGdlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0lyb24sIFtCcmVha0lyb24uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICBvcihTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXIpLFxuICAgICAgICAgICAgICAgICAgW1N3b3JkLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBGbGlnaHQuciwgW0NsaW1iV2F0ZXJmYWxsLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU5LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBCYXJyaWVyLnIsIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgR2FzTWFzay5yLCBbVHJhdmVsU3dhbXAuaWRdKTtcbiAgICBjb25zdCBwYWluID0gdGhpcy5mbGFnc2V0LmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSA/IEdhc01hc2sgOiBMZWF0aGVyQm9vdHM7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzLCBwYWluKSwgW0Nyb3NzUGFpbi5pZF0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBMZWF0aGVyQm9vdHMuciwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soXG4gICAgICAgIFtzdGFydF0sIGFuZChDdXJyZW50bHlSaWRpbmdEb2xwaGluLCBSYWJiaXRCb290cyksXG4gICAgICAgIFtDbGltYldhdGVyZmFsbC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSB7XG4gICAgICAvLyBub3QgYWN0dWFsbHkgdXNlZC4uLj9cbiAgICAgIGNvbnN0IHJlcXVpcmVIZWFsZWQgPSB0aGlzLmZsYWdzZXQucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZUhlYWxlZCA/IEluanVyZWREb2xwaGluLnIgOiBbW11dLFxuICAgICAgICAgICAgICAgICAgICBbQWJsZVRvUmlkZURvbHBoaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBTaGllbGRSaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLFxuICAgICAgICAgICAgICAgICAgICBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpKSB7XG4gICAgICAvLyBOT1RFOiB3aXRoIG5vIG1vbmV5LCB3ZSd2ZSBnb3QgMTYgTVAsIHdoaWNoIGlzbid0IGVub3VnaFxuICAgICAgLy8gdG8gZ2V0IHBhc3Qgc2V2ZW4gc3RhdHVlcy5cbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBGbGlnaHQuY11dLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSxcbiAgICAgICAgICAgICAgICAgICAgW1RyYXZlbFN3YW1wLmlkLCBDcm9zc1BhaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFJlcXVpcmVtZW50Lk9QRU4sIFtXaWxkV2FycC5pZF0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBZGRzIHJvdXRlcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYVJvdXRlcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBmbGFnczoge0J1eVdhcnAsIFN3b3JkT2ZUaHVuZGVyLCBUZWxlcG9ydCwgV2lsZFdhcnB9LFxuICAgICAgbG9jYXRpb25zOiB7TWV6YW1lU2hyaW5lfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgYXQgTWV6YW1lIFNocmluZS5cbiAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSksIFtdKSk7XG4gICAgLy8gU3dvcmQgb2YgVGh1bmRlciB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIGNvbnN0IHdhcnAgPSB0aGlzLnJvbS50b3duV2FycC50aHVuZGVyU3dvcmRXYXJwO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgQnV5V2FycC5jXSkpO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgVGVsZXBvcnQuY10pKTtcbiAgICB9XG4gICAgLy8gV2lsZCB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICAvLyBEb24ndCBjb3VudCBjaGFubmVsIGluIGxvZ2ljIGJlY2F1c2UgeW91IGNhbid0IGFjdHVhbGx5IG1vdmUuXG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdGhpcy5yb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbC5pZCkgY29udGludWU7XG4gICAgICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2UgdGlsZXMgaGFzIGV4dHJhIHJlcXVpcmVtZW50cyB0byBlbnRlciAoZS5nLlxuICAgICAgICAvLyBzd2FtcCkgLSBmaW5kIHRoZW0gYW5kIGNvbmNhdGVudGUuXG4gICAgICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZShsb2NhdGlvbik7XG4gICAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChlbnRyYW5jZSkgPz8gZGllKCdiYWQgZW50cmFuY2UnKTtcbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0ZXJyYWluLmVudGVyKSB7XG4gICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoZW50cmFuY2UsIFtXaWxkV2FycC5jLCAuLi5yb3V0ZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBDaGFuZ2UgdGhlIGtleSBvZiB0aGUgY2hlY2tzIG1hcCB0byBvbmx5IGJlIGNhbm9uaWNhbCBUaWxlSWRzLiAqL1xuICBjb25zb2xpZGF0ZUNoZWNrcygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCByb290ID0gdGhpcy50aWxlcy5maW5kKHRpbGUpO1xuICAgICAgaWYgKHRpbGUgPT09IHJvb3QpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgdGhpcy5jaGVja3MuZ2V0KHJvb3QpLmFkZChjaGVjayk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrcy5kZWxldGUodGlsZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEF0IHRoaXMgcG9pbnQgd2Uga25vdyB0aGF0IGFsbCBvZiB0aGlzLmNoZWNrcycga2V5cyBhcmUgY2Fub25pY2FsLiAqL1xuICBidWlsZFJlcXVpcmVtZW50TWFwKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCByZXEgPSB0aGlzLnJlcXVpcmVtZW50TWFwLmdldChjaGVjayBhcyBDb25kaXRpb24pO1xuICAgICAgICAgIGZvciAoY29uc3QgcjEgb2YgcmVxdWlyZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcjIgb2YgdGhpcy5yb3V0ZXMuZ2V0KHRpbGUpIHx8IFtdKSB7XG4gICAgICAgICAgICAgIHJlcS5hZGRMaXN0KFsuLi5yMSwgLi4ucjJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gbG9nIHRoZSBtYXA/XG4gICAgaWYgKCFERUJVRykgcmV0dXJuO1xuICAgIGNvbnN0IGxvZyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2NoZWNrLCByZXFdIG9mIHRoaXMucmVxdWlyZW1lbnRNYXApIHtcbiAgICAgIGNvbnN0IG5hbWUgPSAoYzogbnVtYmVyKSA9PiB0aGlzLnJvbS5mbGFnc1tjXS5uYW1lO1xuICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiByZXEpIHtcbiAgICAgICAgbG9nLnB1c2goYCR7bmFtZShjaGVjayl9OiAke1suLi5yb3V0ZV0ubWFwKG5hbWUpLmpvaW4oJyAmICcpfVxcbmApO1xuICAgICAgfVxuICAgIH1cbiAgICBsb2cuc29ydCgoYTogYW55LCBiOiBhbnkpID0+IGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwKTtcbiAgICBjb25zb2xlLmxvZyhsb2cuam9pbignJykpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYSBMb2NhdGlvbkxpc3Qgc3RydWN0dXJlIGFmdGVyIHRoZSByZXF1aXJlbWVudCBtYXAgaXMgYnVpbHQuICovXG4gIGdldExvY2F0aW9uTGlzdCh3b3JsZE5hbWUgPSAnQ3J5c3RhbGlzJyk6IExvY2F0aW9uTGlzdCB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGp1c3QgaW1wbGVtZW50aW5nIHRoaXMgZGlyZWN0bHk/XG4gICAgY29uc3QgY2hlY2tOYW1lID0gREVCVUcgPyAoZjogRmxhZykgPT4gZi5kZWJ1ZyA6IChmOiBGbGFnKSA9PiBmLm5hbWU7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmxkTmFtZSxcbiAgICAgIHJlcXVpcmVtZW50czogdGhpcy5yZXF1aXJlbWVudE1hcCxcbiAgICAgIGl0ZW1zOiB0aGlzLml0ZW1zLFxuICAgICAgc2xvdHM6IHRoaXMuc2xvdHMsXG4gICAgICBjaGVja05hbWU6IChjaGVjazogbnVtYmVyKSA9PiBjaGVja05hbWUodGhpcy5yb20uZmxhZ3NbY2hlY2tdKSxcbiAgICAgIHByZWZpbGw6IChyYW5kb206IFJhbmRvbSkgPT4ge1xuICAgICAgICBjb25zdCB7Q3J5c3RhbGlzLCBNZXNpYUluVG93ZXIsIExlYWZFbGRlcn0gPSB0aGlzLnJvbS5mbGFncztcbiAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChbW01lc2lhSW5Ub3dlci5pZCwgQ3J5c3RhbGlzLmlkXV0pO1xuICAgICAgICBpZiAodGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVN3b3JkKCkpIHtcbiAgICAgICAgICAvLyBQaWNrIGEgc3dvcmQgYXQgcmFuZG9tLi4uPyBpbnZlcnNlIHdlaWdodD9cbiAgICAgICAgICBtYXAuc2V0KExlYWZFbGRlci5pZCwgMHgyMDAgfCByYW5kb20ubmV4dEludCg0KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgICAgLy8gVE9ETyAtIGlmIGFueSBpdGVtcyBzaG91bGRuJ3QgYmUgc2h1ZmZsZWQsIHRoZW4gZG8gdGhlIHByZS1maWxsLi4uXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKiogQWRkIHRlcnJhaW5zIGFuZCBjaGVja3MgZm9yIGEgbG9jYXRpb24sIGZyb20gdGlsZXMgYW5kIHNwYXducy4gKi9cbiAgcHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgcmV0dXJuO1xuICAgIC8vIExvb2sgZm9yIHdhbGxzLCB3aGljaCB3ZSBuZWVkIHRvIGtub3cgYWJvdXQgbGF0ZXIuXG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb24pO1xuICB9XG5cbiAgLyoqIFJ1biB0aGUgZmlyc3QgcGFzcyBvZiB1bmlvbnMgbm93IHRoYXQgYWxsIHRlcnJhaW5zIGFyZSBmaW5hbC4gKi9cbiAgdW5pb25OZWlnaGJvcnMoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHgxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeDFdKTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh5MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHkxXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEJ1aWxkcyB1cCB0aGUgcm91dGVzIGFuZCByb3V0ZUVkZ2VzIGRhdGEgc3RydWN0dXJlcy4gKi9cbiAgYWRkQWxsUm91dGVzKCkge1xuICAgIC8vIEFkZCBhbnkgZXh0cmEgcm91dGVzIGZpcnN0LCBzdWNoIGFzIHRoZSBzdGFydGluZyB0aWxlLlxuICAgIHRoaXMuYWRkRXh0cmFSb3V0ZXMoKTtcbiAgICAvLyBBZGQgYWxsIHRoZSBlZGdlcyBmcm9tIGFsbCBuZWlnaGJvcnMuXG4gICAgZm9yIChjb25zdCBbcGFpciwgZGlyc10gb2YgdGhpcy5uZWlnaGJvcnMpIHtcbiAgICAgIGNvbnN0IFtjMCwgYzFdID0gVGlsZVBhaXIuc3BsaXQocGFpcik7XG4gICAgICBjb25zdCB0MCA9IHRoaXMudGVycmFpbnMuZ2V0KGMwKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy50ZXJyYWlucy5nZXQoYzEpO1xuICAgICAgaWYgKCF0MCB8fCAhdDEpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyB0ZXJyYWluICR7aGV4KHQwID8gYzAgOiBjMSl9YCk7XG4gICAgICBmb3IgKGNvbnN0IFtkaXIsIGV4aXRSZXFdIG9mIHQwLmV4aXQpIHtcbiAgICAgICAgaWYgKCEoZGlyICYgZGlycykpIGNvbnRpbnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGV4aXRDb25kcyBvZiBleGl0UmVxKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBlbnRlckNvbmRzIG9mIHQxLmVudGVyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShjMSwgWy4uLmV4aXRDb25kcywgLi4uZW50ZXJDb25kc10pLCBjMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBkZWJ1ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWJ1ZycpO1xuICAgICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGRlYnVnLmFwcGVuZENoaWxkKG5ldyBBcmVhKHRoaXMucm9tLCB0aGlzLmdldFdvcmxkRGF0YSgpKS5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRXb3JsZERhdGEoKTogV29ybGREYXRhIHtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGNvbnN0IHRpbGVzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBUaWxlRGF0YT4oKCkgPT4gKHt9KSBhcyBUaWxlRGF0YSk7XG4gICAgY29uc3QgbG9jYXRpb25zID1cbiAgICAgICAgc2VxKDI1NiwgKCkgPT4gKHthcmVhczogbmV3IFNldCgpLCB0aWxlczogbmV3IFNldCgpfSBhcyBMb2NhdGlvbkRhdGEpKTtcbiAgICBjb25zdCBhcmVhczogQXJlYURhdGFbXSA9IFtdO1xuXG4gICAgLy8gZGlnZXN0IHRoZSBhcmVhc1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHRoaXMudGlsZXMuc2V0cygpKSB7XG4gICAgICBjb25zdCBjYW5vbmljYWwgPSB0aGlzLnRpbGVzLmZpbmQoaXRlcnMuZmlyc3Qoc2V0KSk7XG4gICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoY2Fub25pY2FsKTtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCByb3V0ZXMgPVxuICAgICAgICAgIHRoaXMucm91dGVzLmhhcyhjYW5vbmljYWwpID9cbiAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuZnJlZXplKHRoaXMucm91dGVzLmdldChjYW5vbmljYWwpKSA6IFtdO1xuICAgICAgaWYgKCFyb3V0ZXMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGFyZWE6IEFyZWFEYXRhID0ge1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICBpZDogaW5kZXgrKyxcbiAgICAgICAgbG9jYXRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgdGVycmFpbixcbiAgICAgICAgdGlsZXM6IG5ldyBTZXQoKSxcbiAgICAgIH07XG4gICAgICBhcmVhcy5wdXNoKGFyZWEpO1xuICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNldCkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHRpbGUgPj4+IDE2O1xuICAgICAgICBhcmVhLmxvY2F0aW9ucy5hZGQobG9jYXRpb24pO1xuICAgICAgICBhcmVhLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS5hcmVhcy5hZGQoYXJlYSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0udGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICB0aWxlcy5nZXQodGlsZSkuYXJlYSA9IGFyZWE7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgZXhpdHNcbiAgICBmb3IgKGNvbnN0IFthLCBiXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAodGlsZXMuaGFzKGEpKSB7XG4gICAgICAgIHRpbGVzLmdldChhKS5leGl0ID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBjaGVja3NcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IGFyZWEgPSB0aWxlcy5nZXQodGlsZSkuYXJlYTtcbiAgICAgIGlmICghYXJlYSkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKGBBYmFuZG9uZWQgY2hlY2sgJHtbLi4uY2hlY2tTZXRdLm1hcChcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgIHggPT4gWy4uLnguY2hlY2tzXS5tYXAoeSA9PiB5LnRvU3RyaW5nKDE2KSkpXG4gICAgICAgIC8vICAgICAgICAgICAgICAgIH0gYXQgJHt0aWxlLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLnJvbS5mbGFnc1tjaGVja10gfHwgZGllKCk7XG4gICAgICAgICAgYXJlYS5jaGVja3MucHVzaChbZmxhZywgcmVxdWlyZW1lbnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge3RpbGVzLCBhcmVhcywgbG9jYXRpb25zfTtcbiAgfVxuXG4gIC8qKiBBZGRzIGEgcm91dGUsIG9wdGlvbmFsbHkgd2l0aCBhIHByZXJlcXVpc2l0ZSAoY2Fub25pY2FsKSBzb3VyY2UgdGlsZS4gKi9cbiAgYWRkUm91dGUocm91dGU6IFJvdXRlLCBzb3VyY2U/OiBUaWxlSWQpIHtcbiAgICBpZiAoc291cmNlICE9IG51bGwpIHtcbiAgICAgIC8vIEFkZCBhbiBlZGdlIGluc3RlYWQgb2YgYSByb3V0ZSwgcmVjdXJzaW5nIG9uIHRoZSBzb3VyY2Unc1xuICAgICAgLy8gcmVxdWlyZW1lbnRzLlxuICAgICAgdGhpcy5yb3V0ZUVkZ2VzLmdldChzb3VyY2UpLmFkZChyb3V0ZSk7XG4gICAgICBmb3IgKGNvbnN0IHNyY1JvdXRlIG9mIHRoaXMucm91dGVzLmdldChzb3VyY2UpKSB7XG4gICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHJvdXRlLnRhcmdldCwgWy4uLnNyY1JvdXRlLCAuLi5yb3V0ZS5kZXBzXSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUaGlzIGlzIG5vdyBhbiBcImluaXRpYWwgcm91dGVcIiB3aXRoIG5vIHByZXJlcXVpc2l0ZSBzb3VyY2UuXG4gICAgY29uc3QgcXVldWUgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzZWVuID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc3RhcnQgPSByb3V0ZTsgLy8gVE9ETyBpbmxpbmVcbiAgICBxdWV1ZS5hZGQoc3RhcnQpO1xuICAgIGNvbnN0IGl0ZXIgPSBxdWV1ZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHt2YWx1ZSwgZG9uZX0gPSBpdGVyLm5leHQoKTtcbiAgICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgICBzZWVuLmFkZCh2YWx1ZSk7XG4gICAgICBxdWV1ZS5kZWxldGUodmFsdWUpO1xuICAgICAgY29uc3QgZm9sbG93ID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgICBjb25zdCB0YXJnZXQgPSB2YWx1ZS50YXJnZXQ7XG4gICAgICBjb25zdCBidWlsZGVyID0gdGhpcy5yb3V0ZXMuZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoYnVpbGRlci5hZGRSb3V0ZSh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRoaXMucm91dGVFZGdlcy5nZXQodGFyZ2V0KSkge1xuICAgICAgICAgIGZvbGxvdy5hZGQobmV3IFJvdXRlKG5leHQudGFyZ2V0LCBbLi4udmFsdWUuZGVwcywgLi4ubmV4dC5kZXBzXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5leHQgb2YgZm9sbG93KSB7XG4gICAgICAgIGlmIChzZWVuLmhhcyhuZXh0KSkgY29udGludWU7XG4gICAgICAgIHF1ZXVlLmRlbGV0ZShuZXh0KTsgLy8gcmUtYWRkIGF0IHRoZSBlbmQgb2YgdGhlIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmFkZChuZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIHVwIGB0aGlzLmV4aXRTZXRgIHRvIGluY2x1ZGUgYWxsIHRoZSBcImZyb20tdG9cIiB0aWxlIHBhaXJzXG4gICAqIG9mIGV4aXRzIHRoYXQgX2Rvbid0XyBzaGFyZSB0aGUgc2FtZSB0ZXJyYWluIEZvciBhbnkgdHdvLXdheSBleGl0XG4gICAqIHRoYXQgc2hhcmVzIHRoZSBzYW1lIHRlcnJhaW4sIGp1c3QgYWRkIGl0IGRpcmVjdGx5IHRvIHRoZVxuICAgKiB1bmlvbmZpbmQuXG4gICAqL1xuICByZWNvcmRFeGl0cygpIHtcbiAgICAvLyBBZGQgZXhpdCBUaWxlUGFpcnMgdG8gZXhpdFNldCBmcm9tIGFsbCBsb2NhdGlvbnMnIGV4aXRzLlxuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICB0aGlzLmV4aXRTZXQuYWRkKFxuICAgICAgICAgIFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZChmcm9tKSwgdGhpcy50aWxlcy5maW5kKHRvKSkpO1xuICAgIH1cbiAgICAvLyBMb29rIGZvciB0d28td2F5IGV4aXRzIHdpdGggdGhlIHNhbWUgdGVycmFpbjogcmVtb3ZlIHRoZW0gZnJvbVxuICAgIC8vIGV4aXRTZXQgYW5kIGFkZCB0aGVtIHRvIHRoZSB0aWxlcyB1bmlvbmZpbmQuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KGZyb20pICE9PSB0aGlzLnRlcnJhaW5zLmdldCh0bykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcmV2ZXJzZSA9IFRpbGVQYWlyLm9mKHRvLCBmcm9tKTtcbiAgICAgIGlmICh0aGlzLmV4aXRTZXQuaGFzKHJldmVyc2UpKSB7XG4gICAgICAgIHRoaXMudGlsZXMudW5pb24oW2Zyb20sIHRvXSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUoZXhpdCk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUocmV2ZXJzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgZGlmZmVyZW50LXRlcnJhaW4gbmVpZ2hib3JzIGluIHRoZSBzYW1lIGxvY2F0aW9uLiAgQWRkXG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIHRvIGB0aGlzLm5laWdoYm9yc2Agd2l0aCBhbGwgdGhlXG4gICAqIGRpcmVjdGlvbnMgdGhhdCBpdCBuZWlnaGJvcnMgaW4uICBBbHNvIGFkZCBleGl0cyBhcyBuZWlnaGJvcnMuXG4gICAqIFRoaXMgbXVzdCBoYXBwZW4gKmFmdGVyKiB0aGUgZW50aXJlIHVuaW9uZmluZCBpcyBjb21wbGV0ZSBzb1xuICAgKiB0aGF0IHdlIGNhbiBsZXZlcmFnZSBpdC5cbiAgICovXG4gIGJ1aWxkTmVpZ2hib3JzKCkge1xuICAgIC8vIEFkamFjZW50IGRpZmZlcmVudC10ZXJyYWluIHRpbGVzLlxuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBjb25zdCB0eTEgPSB0aGlzLnRlcnJhaW5zLmdldCh5MSk7XG4gICAgICBpZiAodHkxICYmIHR5MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHkxLCBEaXIuTm9ydGgpO1xuICAgICAgfVxuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgY29uc3QgdHgxID0gdGhpcy50ZXJyYWlucy5nZXQoeDEpO1xuICAgICAgaWYgKHR4MSAmJiB0eDEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB4MSwgRGlyLldlc3QpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBFeGl0cyAoanVzdCB1c2UgXCJub3J0aFwiIGZvciB0aGVzZSkuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW3QwLCB0MV0gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModDApIHx8ICF0aGlzLnRlcnJhaW5zLmhhcyh0MSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcCA9IFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZCh0MCksIHRoaXMudGlsZXMuZmluZCh0MSkpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAsIHRoaXMubmVpZ2hib3JzLmdldChwKSB8IDEpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHQwOiBUaWxlSWQsIHQxOiBUaWxlSWQsIGRpcjogRGlyKSB7XG4gICAgLy8gTk9URTogdDAgPCB0MSBiZWNhdXNlIGRpciBpcyBhbHdheXMgV0VTVCBvciBOT1JUSC5cbiAgICBjb25zdCBjMCA9IHRoaXMudGlsZXMuZmluZCh0MCk7XG4gICAgY29uc3QgYzEgPSB0aGlzLnRpbGVzLmZpbmQodDEpO1xuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MSkpIHtcbiAgICAgIC8vIDEgLT4gMCAod2VzdC9ub3J0aCkuICBJZiAxIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IHAxMCA9IFRpbGVQYWlyLm9mKGMxLCBjMCk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDEwLCB0aGlzLm5laWdoYm9ycy5nZXQocDEwKSB8ICgxIDw8IGRpcikpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDApKSB7XG4gICAgICAvLyAwIC0+IDEgKGVhc3Qvc291dGgpLiAgSWYgMCBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBvcHAgPSBkaXIgXiAyO1xuICAgICAgY29uc3QgcDAxID0gVGlsZVBhaXIub2YoYzAsIGMxKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMDEsIHRoaXMubmVpZ2hib3JzLmdldChwMDEpIHwgKDEgPDwgb3BwKSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qgd2FsbHMgPSBuZXcgTWFwPFNjcmVlbklkLCBXYWxsVHlwZT4oKTtcbiAgICBjb25zdCBzaG9vdGluZ1N0YXR1ZXMgPSBuZXcgU2V0PFNjcmVlbklkPigpO1xuICAgIGNvbnN0IGluVG93ZXIgPSAobG9jYXRpb24uaWQgJiAweGY4KSA9PT0gMHg1ODtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gV2FsbHMgbmVlZCB0byBjb21lIGZpcnN0IHNvIHdlIGNhbiBhdm9pZCBhZGRpbmcgc2VwYXJhdGVcbiAgICAgIC8vIHJlcXVpcmVtZW50cyBmb3IgZXZlcnkgc2luZ2xlIHdhbGwgLSBqdXN0IHVzZSB0aGUgdHlwZS5cbiAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICB3YWxscy5zZXQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCAoc3Bhd24uaWQgJiAzKSBhcyBXYWxsVHlwZSk7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgc2hvb3RpbmdTdGF0dWVzLmFkZChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpO1xuICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0c1tsb2NhdGlvbi50aWxlc2V0XTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM107XG5cbiAgICBjb25zdCBnZXRFZmZlY3RzID0gKHRpbGU6IFRpbGVJZCkgPT4ge1xuICAgICAgY29uc3QgcyA9IGxvY2F0aW9uLnNjcmVlbnNbKHRpbGUgJiAweGYwMDApID4+PiAxMl1bKHRpbGUgJiAweGYwMCkgPj4+IDhdO1xuICAgICAgcmV0dXJuIHRpbGVFZmZlY3RzLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgIH07XG5cbiAgICAvLyBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLlxuICAgIGNvbnN0IG1ha2VUZXJyYWluID0gKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkLCBiYXJyaWVyOiBib29sZWFuKSA9PiB7XG4gICAgICAvLyBDaGVjayBmb3IgZG9scGhpbiBvciBzd2FtcC4gIEN1cnJlbnRseSBkb24ndCBzdXBwb3J0IHNodWZmbGluZyB0aGVzZS5cbiAgICAgIGVmZmVjdHMgJj0gVGVycmFpbi5CSVRTO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDFhKSBlZmZlY3RzIHw9IFRlcnJhaW4uU1dBTVA7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjAgfHwgbG9jYXRpb24uaWQgPT09IDB4NjgpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDY0ICYmICgodGlsZSAmIDB4ZjBmMCkgPCAweDEwMzApKSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgaWYgKGJhcnJpZXIpIGVmZmVjdHMgfD0gVGVycmFpbi5CQVJSSUVSO1xuICAgICAgaWYgKCEoZWZmZWN0cyAmIFRlcnJhaW4uRE9MUEhJTikgJiYgZWZmZWN0cyAmIFRlcnJhaW4uU0xPUEUpIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAgIC8vIDYtOCBhcmUgYm90aCBkb2FibGUgd2l0aCBib290c1xuICAgICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgICAgLy8gMTAgaXMgcmlnaHQgb3V0XG4gICAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gMDtcbiAgICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIFRlcnJhaW4uU0xPUEUpIHtcbiAgICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgICAgaGVpZ2h0Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlaWdodCA8IDYpIHtcbiAgICAgICAgICBlZmZlY3RzICY9IH5UZXJyYWluLlNMT1BFO1xuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU4O1xuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDEwKSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFOTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGVmZmVjdHMgJiBUZXJyYWluLlBBSU4pIHtcbiAgICAgICAgLy8gUGFpbiB0ZXJyYWlucyBhcmUgb25seSBpbXBhc3NpYmxlIGlmIHRoZXkncmUgYWxsIHN1cnJvdW5kZWRcbiAgICAgICAgLy8gYnkgb3RoZXIgcGFpbiB0ZXJyYWlucy5cbiAgICAgICAgdHlwZSBEZWx0YSA9IFtudW1iZXIsIG51bWJlcl1bXTtcbiAgICAgICAgZm9yIChjb25zdCBkZWx0YSBvZiBbWzAsIDFdLCBbMSwgMF0sIFswLCAtMV0sIFstMSwgMF1dIGFzIERlbHRhKSB7XG4gICAgICAgICAgaWYgKCEoZ2V0RWZmZWN0cyhUaWxlSWQuYWRkKHRpbGUsIC4uLmRlbHRhKSkgJlxuICAgICAgICAgICAgICAgIChUZXJyYWluLlBBSU4gfCBUZXJyYWluLkZMWSkpKSB7XG4gICAgICAgICAgICBlZmZlY3RzICY9IH5UZXJyYWluLlBBSU47XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoZWZmZWN0cyk7XG4gICAgfTtcblxuICAgIGZvciAobGV0IHkgPSAwLCBoZWlnaHQgPSBsb2NhdGlvbi5oZWlnaHQ7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gbG9jYXRpb24uc2NyZWVuc1t5XTtcbiAgICAgIGNvbnN0IHJvd0lkID0gbG9jYXRpb24uaWQgPDwgOCB8IHkgPDwgNDtcbiAgICAgIGZvciAobGV0IHggPSAwLCB3aWR0aCA9IGxvY2F0aW9uLndpZHRoOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHNjcmVlbklkID0gU2NyZWVuSWQocm93SWQgfCB4KTtcbiAgICAgICAgY29uc3QgYmFycmllciA9IHNob290aW5nU3RhdHVlcy5oYXMoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnWXggPSBzY3JlZW5JZCAmIDB4ZmY7XG4gICAgICAgIGNvbnN0IHdhbGwgPSB3YWxscy5nZXQoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnID1cbiAgICAgICAgICAgIGluVG93ZXIgPyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkIDpcbiAgICAgICAgICAgIHdhbGwgIT0gbnVsbCA/IHRoaXMud2FsbENhcGFiaWxpdHkod2FsbCkgOlxuICAgICAgICAgICAgbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBmbGFnWXgpPy5mbGFnO1xuICAgICAgICBjb25zdCBwaXQgPSBsb2NhdGlvbi5waXRzLmZpbmQocCA9PiBwLmZyb21TY3JlZW4gPT09IHNjcmVlbklkKTtcbiAgICAgICAgaWYgKHBpdCkge1xuICAgICAgICAgIHRoaXMuZXhpdHMuc2V0KFRpbGVJZChzY3JlZW5JZCA8PCA4IHwgMHg4OCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgVGlsZUlkKHBpdC50b1NjcmVlbiA8PCA4IHwgMHg4OCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxvZ2ljOiBMb2dpYyA9IHRoaXMucm9tLmZsYWdzW2ZsYWchXT8ubG9naWMgPz8ge307XG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlkID0gVGlsZUlkKHNjcmVlbklkIDw8IDggfCB0KTtcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgaWYgKGxvZ2ljLmFzc3VtZVRydWUgJiYgdGlsZSA8IDB4MjApIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGVmZmVjdHMgPSBsb2NhdGlvbi5pc1Nob3AoKSA/IDAgOiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gbWFrZVRlcnJhaW4oZWZmZWN0cywgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAvL2lmICghdGVycmFpbikgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgaWYgKHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPT0gdGlsZSAmJlxuICAgICAgICAgICAgICBmbGFnICE9IG51bGwgJiYgIWxvZ2ljLmFzc3VtZVRydWUgJiYgIWxvZ2ljLmFzc3VtZUZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGUgPVxuICAgICAgICAgICAgICAgIG1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgICAvL2lmICghYWx0ZXJuYXRlKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgLy8gTk9URTogdGhlcmUncyBhbiBvZGRpdHkgZnJvbSBob2xsb3dpbmcgb3V0IHRoZSBiYWNrcyBvZiBpcm9uXG4gICAgICAgICAgICAgIC8vIHdhbGxzIHRoYXQgb25lIGNvcm5lciBvZiBzdG9uZSB3YWxscyBhcmUgYWxzbyBob2xsb3dlZCBvdXQsXG4gICAgICAgICAgICAgIC8vIGJ1dCBvbmx5IHByZS1mbGFnLiAgSXQgZG9lc24ndCBhY3R1YWxseSBodXJ0IGFueXRoaW5nLlxuICAgICAgICAgICAgICB0ZXJyYWluID1cbiAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3RvcnkuZmxhZyh0ZXJyYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljLnRyYWNrID8gZmxhZyA6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0ZXJyYWluKSB0aGlzLnRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHtkZXN0LCBlbnRyYW5jZX0gPSBleGl0O1xuICAgICAgY29uc3QgZnJvbSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgIC8vIFNlYW1sZXNzIGV4aXRzICgweDIwKSBpZ25vcmUgdGhlIGVudHJhbmNlIGluZGV4LCBhbmRcbiAgICAgIC8vIGluc3RlYWQgcHJlc2VydmUgdGhlIFRpbGVJZCwganVzdCBjaGFuZ2luZyB0aGUgbG9jYXRpb24uXG4gICAgICBsZXQgdG86IFRpbGVJZDtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICB0byA9IFRpbGVJZChmcm9tICYgMHhmZmZmIHwgKGRlc3QgPDwgMTYpKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5zZWFtbGVzcyhwcmV2aW91cykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0byA9IHRoaXMuZW50cmFuY2UodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLCBlbnRyYW5jZSAmIDB4MWYpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc1RyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NOcGMobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQm9zcyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0NoZXN0KCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2hlc3QobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3Rlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi50eXBlID09PSAzICYmIHNwYXduLmlkID09PSAweGUwKSB7XG4gICAgICAgIC8vIHdpbmRtaWxsIGJsYWRlc1xuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoXG4gICAgICAgICAgICBIaXRib3guc2NyZWVuKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpLFxuICAgICAgICAgICAgdGhpcy5yb20uZmxhZ3MuVXNlZFdpbmRtaWxsS2V5LnIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gRm9yIHRyaWdnZXJzLCB3aGljaCB0aWxlcyBkbyB3ZSBtYXJrP1xuICAgIC8vIFRoZSB0cmlnZ2VyIGhpdGJveCBpcyAyIHRpbGVzIHdpZGUgYW5kIDEgdGlsZSB0YWxsLCBidXQgaXQgZG9lcyBub3RcbiAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgIC8vICRjIHdpZGUgKHRob3VnaCBpdCdzICQxNCB0YWxsKSBzbyB0aGVyZSdzIHNvbWUgc2xpZ2h0IGRpc3Bhcml0eS5cbiAgICAvLyBJdCBzZWVtcyBsaWtlIHByb2JhYmx5IG1hcmtpbmcgaXQgYXMgKHgtMSwgeS0xKSAuLiAoeCwgeSkgbWFrZXMgdGhlXG4gICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAvLyB0aWxlIHNob3VsZCBnbyBmcm9tIHggLi4geCsxIGluc3RlYWQuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY2hlY2tpbmcgdHJpZ2dlcidzIGFjdGlvbjogJDE5IC0+IHB1c2gtZG93biBtZXNzYWdlXG5cbiAgICAvLyBUT0RPIC0gcHVsbCBvdXQgdGhpcy5yZWNvcmRUcmlnZ2VyVGVycmFpbigpIGFuZCB0aGlzLnJlY29yZFRyaWdnZXJDaGVjaygpXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXIoc3Bhd24uaWQpO1xuICAgIGlmICghdHJpZ2dlcikgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHRyaWdnZXIgJHtzcGF3bi5pZC50b1N0cmluZygxNil9YCk7XG5cbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgIGxldCBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBsZXQgaGl0Ym94ID0gSGl0Ym94LnRyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcblxuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiB0cmlnZ2VyLmZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgY2hlY2tzKTtcblxuICAgIHN3aXRjaCAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDE5OlxuICAgICAgICAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICAgIC8vIGJpZ2dlciBoaXRib3ggdG8gbm90IGZpbmQgdGhlIHBhdGggdGhyb3VnaFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTFdLCBbMCwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmFzc3VtZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5kaXNhYmxlVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBjb3B5IHRoZSB0ZWxlcG9ydCBoaXRib3ggaW50byB0aGUgb3RoZXIgc2lkZSBvZiBjb3JkZWxcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYXRMb2NhdGlvbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxdWlyZW1lbnRzKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWQ6XG4gICAgICAgIC8vIHN0YXJ0IG1hZG8gMSBib3NzIGZpZ2h0XG4gICAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLk1hZG8xLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciB0cmlnZ2VyIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcXVpcmVtZW50cywgdHJpZ2dlci5pZCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTg6IHsgLy8gc3RvbSBmaWdodFxuICAgICAgICAvLyBTcGVjaWFsIGNhc2U6IHdhcnAgYm9vdHMgZ2xpdGNoIHJlcXVpcmVkIGlmIGNoYXJnZSBzaG90cyBvbmx5LlxuICAgICAgICBjb25zdCByZXEgPVxuICAgICAgICAgIHRoaXMuZmxhZ3NldC5jaGFyZ2VTaG90c09ubHkoKSA/XG4gICAgICAgICAgUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIGFuZCh0aGlzLnJvbS5mbGFncy5XYXJwQm9vdHMpKSA6XG4gICAgICAgICAgcmVxdWlyZW1lbnRzO1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgdGhpcy5yb20uZmxhZ3MuU3RvbUZpZ2h0UmV3YXJkLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSAweDFlOlxuICAgICAgICAvLyBmb3JnZSBjcnlzdGFsaXNcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLk1lc2lhSW5Ub3dlci5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZjpcbiAgICAgICAgdGhpcy5oYW5kbGVCb2F0KHRpbGUsIGxvY2F0aW9uLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBNb3ZpbmcgZ3VhcmRcbiAgICAgICAgLy8gdHJlYXQgdGhpcyBhcyBhIHN0YXR1ZT8gIGJ1dCB0aGUgY29uZGl0aW9ucyBhcmUgbm90IHN1cGVyIHVzZWZ1bC4uLlxuICAgICAgICAvLyAgIC0gb25seSB0cmFja2VkIGNvbmRpdGlvbnMgbWF0dGVyPyA5ZSA9PSBwYXJhbHlzaXMuLi4gZXhjZXB0IG5vdC5cbiAgICAgICAgLy8gcGFyYWx5emFibGU/ICBjaGVjayBEYXRhVGFibGVfMzUwNDVcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuUG9ydG9hX1BhbGFjZUVudHJhbmNlKSB7XG4gICAgICAgICAgLy8gUG9ydG9hIHBhbGFjZSBmcm9udCBndWFyZCBub3JtYWxseSBibG9ja3Mgb24gTWVzaWEgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEJ1dCB0aGUgcXVlZW4gaXMgYWN0dWFsbHkgYWNjZXNzaWJsZSB3aXRob3V0IHNlZWluZyB0aGUgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEluc3RlYWQsIGJsb2NrIGFjY2VzcyB0byB0aGUgdGhyb25lIHJvb20gb24gYmVpbmcgYWJsZSB0byB0YWxrIHRvXG4gICAgICAgICAgLy8gdGhlIGZvcnR1bmUgdGVsbGVyLCBpbiBjYXNlIHRoZSBndWFyZCBtb3ZlcyBiZWZvcmUgd2UgY2FuIGdldCB0aGVcbiAgICAgICAgICAvLyBpdGVtLiAgQWxzbyBtb3ZlIHRoZSBoaXRib3ggdXAgc2luY2UgdGhlIHR3byBzaWRlIHJvb21zIF9hcmVfIHN0aWxsXG4gICAgICAgICAgLy8gYWNjZXNzaWJsZS5cbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWy0yLCAwXSk7XG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMucm9tLmZsYWdzLlRhbGtlZFRvRm9ydHVuZVRlbGxlci5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94LCBsb2NhdGlvbiwgYW50aVJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTnBjKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tzcGF3bi5pZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbnBjOiAke2hleChzcGF3bi5pZCl9YCk7XG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jYXRpb24uaWQpIHx8IFtdO1xuICAgIGNvbnN0IHJlcSA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7IC8vIHNob3VsZCBiZSBzaW5nbGVcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgLy8gTk9URTogUmFnZSBoYXMgbm8gd2Fsa2FibGUgbmVpZ2hib3JzLCBhbmQgd2UgbmVlZCB0aGUgc2FtZSBoaXRib3hcbiAgICAvLyBmb3IgYm90aCB0aGUgdGVycmFpbiBhbmQgdGhlIGNoZWNrLlxuICAgIC8vXG4gICAgLy8gTk9URSBBTFNPIC0gUmFnZSBwcm9iYWJseSBzaG93cyB1cCBhcyBhIGJvc3MsIG5vdCBhbiBOUEM/XG4gICAgbGV0IGhpdGJveDogSGl0Ym94ID1cbiAgICAgICAgW3RoaXMudGVycmFpbnMuaGFzKHRpbGUpID8gdGlsZSA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKSA/PyB0aWxlXTtcblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKGhpdGJveCwgcmVxLCBpdGVtLCB1c2UpO1xuICAgIH1cblxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU2FiZXJhRGlzZ3Vpc2VkQXNNZXNpYSkge1xuICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuU2FiZXJhMSwgcmVxKTtcbiAgICB9XG5cbiAgICBpZiAoKG5wYy5kYXRhWzJdICYgMHgwNCkgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgICAgbGV0IGFudGlSZXE7XG4gICAgICBhbnRpUmVxID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7XG4gICAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlJhZ2UpIHtcbiAgICAgICAgLy8gVE9ETyAtIG1vdmUgaGl0Ym94IGRvd24sIGNoYW5nZSByZXF1aXJlbWVudD9cbiAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFsyLCAtMV0sIFsyLCAwXSwgWzIsIDFdLCBbMiwgMl0pO1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC02XSwgWzAsIC0yXSwgWzAsIDJdLCBbMCwgNl0pO1xuICAgICAgICAvLyBUT0RPIC0gY2hlY2sgaWYgdGhpcyB3b3Jrcz8gIHRoZSB+Y2hlY2sgc3Bhd24gY29uZGl0aW9uIHNob3VsZFxuICAgICAgICAvLyBhbGxvdyBwYXNzaW5nIGlmIGdvdHRlbiB0aGUgY2hlY2ssIHdoaWNoIGlzIHRoZSBzYW1lIGFzIGdvdHRlblxuICAgICAgICAvLyB0aGUgY29ycmVjdCBzd29yZC5cbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSBhbnRpUmVxID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUG9ydG9hVGhyb25lUm9vbUJhY2tEb29yR3VhcmQpIHtcbiAgICAgICAgLy8gUG9ydG9hIGJhY2sgZG9vciBndWFyZCBzcGF3bnMgaWYgKDEpIHRoZSBtZXNpYSByZWNvcmRpbmcgaGFzIG5vdCB5ZXRcbiAgICAgICAgLy8gYmVlbiBwbGF5ZWQsIGFuZCAoMikgdGhlIHBsYXllciBkaWRuJ3Qgc25lYWsgcGFzdCB0aGUgZWFybGllciBndWFyZC5cbiAgICAgICAgLy8gV2UgY2FuIHNpbXVsYXRlIHRoaXMgYnkgaGFyZC1jb2RpbmcgYSByZXF1aXJlbWVudCBvbiBlaXRoZXIgdG8gZ2V0XG4gICAgICAgIC8vIHBhc3QgaGltLlxuICAgICAgICBhbnRpUmVxID0gb3IodGhpcy5yb20uZmxhZ3MuTWVzaWFSZWNvcmRpbmcsIHRoaXMucm9tLmZsYWdzLlBhcmFseXNpcyk7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Tb2xkaWVyR3VhcmQpIHtcbiAgICAgICAgYW50aVJlcSA9IHVuZGVmaW5lZDsgLy8gdGhleSdsbCBqdXN0IGF0dGFjayBpZiBhcHByb2FjaGVkLlxuICAgICAgfVxuICAgICAgLy8gaWYgc3Bhd24gaXMgYWx3YXlzIGZhbHNlIHRoZW4gcmVxIG5lZWRzIHRvIGJlIG9wZW4/XG4gICAgICBpZiAoYW50aVJlcSkgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoYW50aVJlcSkpO1xuICAgIH1cblxuICAgIC8vIEZvcnR1bmUgdGVsbGVyIGNhbiBiZSB0YWxrZWQgdG8gYWNyb3NzIHRoZSBkZXNrLlxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuRm9ydHVuZVRlbGxlcikge1xuICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAwXSwgWzIsIDBdKTtcbiAgICB9XG5cbiAgICAvLyByZXEgaXMgbm93IG11dGFibGVcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxKSkgcmV0dXJuOyAvLyBub3RoaW5nIHRvIGRvIGlmIGl0IG5ldmVyIHNwYXducy5cbiAgICBjb25zdCBbWy4uLmNvbmRzXV0gPSByZXE7XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGdsb2JhbCBkaWFsb2dzIC0gZG8gbm90aGluZyBpZiB3ZSBjYW4ndCBwYXNzIHRoZW0uXG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5kLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBmYyA9IHRoaXMuZmxhZyhkLmNvbmRpdGlvbik7XG4gICAgICBpZiAoZj8ubG9naWMuYXNzdW1lRmFsc2UgfHwgZmM/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybjtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykgY29uZHMucHVzaChmLmlkIGFzIENvbmRpdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBhcHByb3ByaWF0ZSBsb2NhbCBkaWFsb2dzXG4gICAgY29uc3QgbG9jYWxzID1cbiAgICAgICAgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jYXRpb24uaWQpID8/IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSA/PyBbXTtcbiAgICBmb3IgKGNvbnN0IGQgb2YgbG9jYWxzKSB7XG4gICAgICAvLyBDb21wdXRlIHRoZSBjb25kaXRpb24gJ3InIGZvciB0aGlzIG1lc3NhZ2UuXG4gICAgICBjb25zdCByID0gWy4uLmNvbmRzXTtcbiAgICAgIGNvbnN0IGYwID0gdGhpcy5mbGFnKGQuY29uZGl0aW9uKTtcbiAgICAgIGNvbnN0IGYxID0gdGhpcy5mbGFnKH5kLmNvbmRpdGlvbik7XG4gICAgICBpZiAoZjA/LmxvZ2ljLnRyYWNrKSByLnB1c2goZjAuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIGlmICghZjA/LmxvZ2ljLmFzc3VtZUZhbHNlICYmICFmMT8ubG9naWMuYXNzdW1lVHJ1ZSkge1xuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdGhpcyBkaWFsb2cgaWYgaXQncyBwb3NzaWJsZSB0byBwYXNzIHRoZSBjb25kaXRpb24uXG4gICAgICAgIHRoaXMucHJvY2Vzc0RpYWxvZyhoaXRib3gsIG5wYywgciwgZCk7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBpZiB3ZSBjYW4gbmV2ZXIgYWN0dWFsbHkgZ2V0IHBhc3QgdGhpcyBkaWFsb2cuXG4gICAgICBpZiAoZjA/LmxvZ2ljLmFzc3VtZVRydWUgfHwgZjE/LmxvZ2ljLmFzc3VtZUZhbHNlKSBicmVhaztcbiAgICAgIC8vIEFkZCBhbnkgbmV3IGNvbmRpdGlvbnMgdG8gJ2NvbmRzJyB0byBnZXQgYmV5b25kIHRoaXMgbWVzc2FnZS5cbiAgICAgIGlmIChmMT8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY29uZHMucHVzaChmMS5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NEaWFsb2coaGl0Ym94OiBIaXRib3gsIG5wYzogTnBjLFxuICAgICAgICAgICAgICAgIHJlcTogcmVhZG9ubHkgQ29uZGl0aW9uW10sIGRpYWxvZzogTG9jYWxEaWFsb2cpIHtcbiAgICB0aGlzLmFkZENoZWNrRnJvbUZsYWdzKGhpdGJveCwgW3JlcV0sIGRpYWxvZy5mbGFncyk7XG5cbiAgICBjb25zdCBpbmZvID0ge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9O1xuICAgIHN3aXRjaCAoZGlhbG9nLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MDg6IC8vIG9wZW4gc3dhbiBnYXRlXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIFtyZXFdKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwYzogLy8gZHdhcmYgY2hpbGQgc3RhcnRzIGZvbGxvd2luZ1xuICAgICAgLy8gICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBkOiAvLyBucGMgd2Fsa3MgYXdheVxuICAgICAgLy8gICBicmVhaztcblxuICAgICAgY2FzZSAweDE0OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5TbGltZWRLZW5zdS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTA6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQXNpbmFJbkJhY2tSb29tLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVsxXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDM6XG4gICAgICBjYXNlIDB4MGE6IC8vIG5vcm1hbGx5IHRoaXMgaGFyZC1jb2RlcyBnbG93aW5nIGxhbXAsIGJ1dCB3ZSBleHRlbmRlZCBpdFxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzBdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwOTpcbiAgICAgICAgLy8gSWYgemVidSBzdHVkZW50IGhhcyBhbiBpdGVtLi4uPyAgVE9ETyAtIHN0b3JlIGZmIGlmIHVudXNlZFxuICAgICAgICBjb25zdCBpdGVtID0gbnBjLmRhdGFbMV07XG4gICAgICAgIGlmIChpdGVtICE9PSAweGZmKSB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IGl0ZW0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDE5OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFrYWhhbmFGbHV0ZU9mTGltZVRyYWRlaW4uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFhOlxuICAgICAgICAvLyBUT0RPIC0gY2FuIHdlIHJlYWNoIHRoaXMgc3BvdD8gIG1heSBuZWVkIHRvIG1vdmUgZG93bj9cbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuUmFnZS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIFJhZ2UgdGhyb3dpbmcgcGxheWVyIG91dC4uLlxuICAgICAgICAvLyBUaGlzIHNob3VsZCBhY3R1YWxseSBhbHJlYWR5IGJlIGhhbmRsZWQgYnkgdGhlIHN0YXR1ZSBjb2RlIGFib3ZlP1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gYWRkIGV4dHJhIGRpYWxvZ3MgZm9yIGl0ZW11c2UgdHJhZGVzLCBleHRyYSB0cmlnZ2Vyc1xuICAgIC8vICAgICAgLSBpZiBpdGVtIHRyYWRlZCBidXQgbm8gcmV3YXJkLCB0aGVuIHJlLWdpdmUgcmV3YXJkLi4uXG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KH5sb2NhdGlvbi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW3RoaXMuZW50cmFuY2UobG9jYXRpb24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVNb3ZpbmdHdWFyZChoaXRib3g6IEhpdGJveCwgbG9jYXRpb246IExvY2F0aW9uLCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gVGhpcyBpcyB0aGUgMWIgdHJpZ2dlciBhY3Rpb24gZm9sbG93LXVwLiAgSXQgbG9va3MgZm9yIGFuIE5QQyBpbiAwZCBvciAwZVxuICAgIC8vIGFuZCBtb3ZlcyB0aGVtIG92ZXIgYSBwaXhlbC4gIEZvciB0aGUgbG9naWMsIGl0J3MgYWx3YXlzIGluIGEgcG9zaXRpb25cbiAgICAvLyB3aGVyZSBqdXN0IG1ha2luZyB0aGUgdHJpZ2dlciBzcXVhcmUgYmUgYSBuby1leGl0IHNxdWFyZSBpcyBzdWZmaWNpZW50LFxuICAgIC8vIGJ1dCB3ZSBuZWVkIHRvIGdldCB0aGUgY29uZGl0aW9ucyByaWdodC4gIFdlIHBhc3MgaW4gdGhlIHJlcXVpcmVtZW50cyB0b1xuICAgIC8vIE5PVCB0cmlnZ2VyIHRoZSB0cmlnZ2VyLCBhbmQgdGhlbiB3ZSBqb2luIGluIHBhcmFseXNpcyBhbmQvb3Igc3RhdHVlXG4gICAgLy8gZ2xpdGNoIGlmIGFwcHJvcHJpYXRlLiAgVGhlcmUgY291bGQgdGhlb3JldGljYWxseSBiZSBjYXNlcyB3aGVyZSB0aGVcbiAgICAvLyBndWFyZCBpcyBwYXJhbHl6YWJsZSBidXQgdGhlIGdlb21ldHJ5IHByZXZlbnRzIHRoZSBwbGF5ZXIgZnJvbSBhY3R1YWxseVxuICAgIC8vIGhpdHRpbmcgdGhlbSBiZWZvcmUgdGhleSBtb3ZlLCBidXQgaXQgZG9lc24ndCBoYXBwZW4gaW4gcHJhY3RpY2UuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkgcmV0dXJuO1xuICAgIGNvbnN0IGV4dHJhOiBDb25kaXRpb25bXVtdID0gW107XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMuc2xpY2UoMCwgMikpIHtcbiAgICAgIGlmIChzcGF3bi5pc05wYygpICYmIHRoaXMucm9tLm5wY3Nbc3Bhd24uaWRdLmlzUGFyYWx5emFibGUoKSkge1xuICAgICAgICBleHRyYS5wdXNoKFt0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMuaWQgYXMgQ29uZGl0aW9uXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShbLi4ucmVxLCAuLi5leHRyYV0ubWFwKHNwcmVhZCkpKTtcblxuXG4gICAgLy8gVE9ETyAtIFBvcnRvYSBndWFyZHMgYXJlIGJyb2tlbiA6LShcbiAgICAvLyBUaGUgYmFjayBndWFyZCBuZWVkcyB0byBibG9jayBvbiB0aGUgZnJvbnQgZ3VhcmQncyBjb25kaXRpb25zLFxuICAgIC8vIHdoaWxlIHRoZSBmcm9udCBndWFyZCBzaG91bGQgYmxvY2sgb24gZm9ydHVuZSB0ZWxsZXI/XG5cbiAgfVxuXG4gIGhhbmRsZUJvYXQodGlsZTogVGlsZUlkLCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBib2FyZCBib2F0IC0gdGhpcyBhbW91bnRzIHRvIGFkZGluZyBhIHJvdXRlIGVkZ2UgZnJvbSB0aGUgdGlsZVxuICAgIC8vIHRvIHRoZSBsZWZ0LCB0aHJvdWdoIGFuIGV4aXQsIGFuZCB0aGVuIGNvbnRpbnVpbmcgdW50aWwgZmluZGluZyBsYW5kLlxuICAgIGNvbnN0IHQwID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpO1xuICAgIGlmICh0MCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHdhbGthYmxlIG5laWdoYm9yLmApO1xuICAgIGNvbnN0IHl0ID0gKHRpbGUgPj4gOCkgJiAweGYwIHwgKHRpbGUgPj4gNCkgJiAweGY7XG4gICAgY29uc3QgeHQgPSAodGlsZSA+PiA0KSAmIDB4ZjAgfCB0aWxlICYgMHhmO1xuICAgIGxldCBib2F0RXhpdDtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0Lnl0ID09PSB5dCAmJiBleGl0Lnh0IDwgeHQpIGJvYXRFeGl0ID0gZXhpdDtcbiAgICB9XG4gICAgaWYgKCFib2F0RXhpdCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBib2F0IGV4aXRgKTtcbiAgICAvLyBUT0RPIC0gbG9vayB1cCB0aGUgZW50cmFuY2UuXG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tib2F0RXhpdC5kZXN0XTtcbiAgICBpZiAoIWRlc3QpIHRocm93IG5ldyBFcnJvcihgQmFkIGRlc3RpbmF0aW9uYCk7XG4gICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tib2F0RXhpdC5lbnRyYW5jZV07XG4gICAgY29uc3QgZW50cmFuY2VUaWxlID0gVGlsZUlkLmZyb20oZGVzdCwgZW50cmFuY2UpO1xuICAgIGxldCB0ID0gZW50cmFuY2VUaWxlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB0ID0gVGlsZUlkLmFkZCh0LCAwLCAtMSk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KTtcbiAgICAgIGlmICh0MSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJvYXQ6IFRlcnJhaW4gPSB7XG4gICAgICAgICAgZW50ZXI6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudHMpLFxuICAgICAgICAgIGV4aXQ6IFtbMHhmLCBSZXF1aXJlbWVudC5PUEVOXV0sXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGJvYXQgdHJpZ2dlci5cbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKFt0MF0sIGJvYXQpO1xuICAgICAgICB0aGlzLmV4aXRzLnNldCh0MCwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKHQwLCB0MSkpO1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBlbnRyYW5jZSB3ZSBwYXNzZWRcbiAgICAgICAgLy8gKHRoaXMgaXMgcHJpbWFyaWx5IG5lY2Vzc2FyeSBmb3Igd2lsZCB3YXJwIHRvIHdvcmsgaW4gbG9naWMpLlxuICAgICAgICB0aGlzLmV4aXRzLnNldChlbnRyYW5jZVRpbGUsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZihlbnRyYW5jZVRpbGUsIHQxKSk7XG4gICAgICAgIHRoaXMudGVycmFpbnMuc2V0KGVudHJhbmNlVGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKDApISk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94OiBIaXRib3gsIHJlcTogUmVxdWlyZW1lbnQsIGdyYW50SWQ6IG51bWJlcikge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1HcmFudChncmFudElkKTtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBpdGVtO1xuICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBpdGVtIGdyYW50IGZvciAke2dyYW50SWQudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICAvLyBpcyB0aGUgMTAwIGZsYWcgc3VmZmljaWVudCBoZXJlPyAgcHJvYmFibHk/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSBncmFudElkID49IDB4ODA7IC8vIGdyYW50ZWQgZnJvbSBhIHRyaWdnZXJcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgc2xvdCxcbiAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZSwgcHJldmVudExvc3N9KTtcbiAgfVxuXG4gIGFkZFRlcnJhaW4oaGl0Ym94OiBIaXRib3gsIHRlcnJhaW46IFRlcnJhaW4pIHtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy50ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICBpZiAodCA9PSBudWxsKSBjb250aW51ZTsgLy8gdW5yZWFjaGFibGUgdGlsZXMgZG9uJ3QgbmVlZCBleHRyYSByZXFzXG4gICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5Lm1lZXQodCwgdGVycmFpbikpO1xuICAgIH1cbiAgfVxuXG4gIGFkZENoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGNoZWNrczogbnVtYmVyW10pIHtcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxdWlyZW1lbnQpKSByZXR1cm47IC8vIGRvIG5vdGhpbmcgaWYgdW5yZWFjaGFibGVcbiAgICBjb25zdCBjaGVjayA9IHtyZXF1aXJlbWVudDogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50KSwgY2hlY2tzfTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHRpbGUpKSBjb250aW51ZTtcbiAgICAgIHRoaXMuY2hlY2tzLmdldCh0aWxlKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1DaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LFxuICAgICAgICAgICAgICAgY2hlY2s6IG51bWJlciwgc2xvdDogU2xvdEluZm8pIHtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIFtjaGVja10pO1xuICAgIHRoaXMuc2xvdHMuc2V0KGNoZWNrLCBzbG90KTtcbiAgICAvLyBhbHNvIGFkZCBjb3JyZXNwb25kaW5nIEl0ZW1JbmZvIHRvIGtlZXAgdGhlbSBpbiBwYXJpdHkuXG4gICAgY29uc3QgaXRlbWdldCA9IHRoaXMucm9tLml0ZW1HZXRzW3RoaXMucm9tLnNsb3RzW2NoZWNrICYgMHhmZl1dO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1tpdGVtZ2V0Lml0ZW1JZF07XG4gICAgY29uc3QgdW5pcXVlID0gaXRlbT8udW5pcXVlO1xuICAgIGNvbnN0IGxvc2FibGUgPSBpdGVtZ2V0LmlzTG9zYWJsZSgpO1xuICAgIC8vIFRPRE8gLSByZWZhY3RvciB0byBqdXN0IFwiY2FuJ3QgYmUgYm91Z2h0XCI/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSB1bmlxdWUgfHwgaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuT3BlbFN0YXR1ZTtcbiAgICBsZXQgd2VpZ2h0ID0gMTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldpbmQpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZGaXJlKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2F0ZXIpIHdlaWdodCA9IDEwO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mVGh1bmRlcikgd2VpZ2h0ID0gMTU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLkZsaWdodCkgd2VpZ2h0ID0gMTU7XG4gICAgdGhpcy5pdGVtcy5zZXQoMHgyMDAgfCBpdGVtZ2V0LmlkLCB7dW5pcXVlLCBsb3NhYmxlLCBwcmV2ZW50TG9zcywgd2VpZ2h0fSk7XG4gIH1cblxuICBhZGRDaGVja0Zyb21GbGFncyhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBmbGFnczogbnVtYmVyW10pIHtcbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIGNoZWNrcyk7XG4gIH1cblxuICB3YWxrYWJsZU5laWdoYm9yKHQ6IFRpbGVJZCk6IFRpbGVJZHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodCkpIHJldHVybiB0O1xuICAgIGZvciAobGV0IGQgb2YgWy0xLCAxXSkge1xuICAgICAgY29uc3QgdDEgPSBUaWxlSWQuYWRkKHQsIGQsIDApO1xuICAgICAgY29uc3QgdDIgPSBUaWxlSWQuYWRkKHQsIDAsIGQpO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MSkpIHJldHVybiB0MTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDIpKSByZXR1cm4gdDI7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpc1dhbGthYmxlKHQ6IFRpbGVJZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKHRoaXMuZ2V0RWZmZWN0cyh0KSAmIFRlcnJhaW4uQklUUyk7XG4gIH1cblxuICBlbnN1cmVQYXNzYWJsZSh0OiBUaWxlSWQpOiBUaWxlSWQge1xuICAgIHJldHVybiB0aGlzLmlzV2Fsa2FibGUodCkgPyB0IDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQ7XG4gIH1cblxuICBnZXRFZmZlY3RzKHQ6IFRpbGVJZCk6IG51bWJlciB7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbdCA+Pj4gMTZdO1xuICAgIC8vY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgZWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM10uZWZmZWN0cztcbiAgICBjb25zdCBzY3IgPSBsb2NhdGlvbi5zY3JlZW5zWyh0ICYgMHhmMDAwKSA+Pj4gMTJdWyh0ICYgMHhmMDApID4+PiA4XTtcbiAgICByZXR1cm4gZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3Njcl0udGlsZXNbdCAmIDB4ZmZdXTtcbiAgfVxuXG4gIHByb2Nlc3NCb3NzKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gQm9zc2VzIHdpbGwgY2xvYmJlciB0aGUgZW50cmFuY2UgcG9ydGlvbiBvZiBhbGwgdGlsZXMgb24gdGhlIHNjcmVlbixcbiAgICAvLyBhbmQgd2lsbCBhbHNvIGFkZCB0aGVpciBkcm9wLlxuICAgIGlmIChzcGF3bi5pZCA9PT0gMHhjOSB8fCBzcGF3bi5pZCA9PT0gMHhjYSkgcmV0dXJuOyAvLyBzdGF0dWVzXG4gICAgY29uc3QgaXNSYWdlID0gc3Bhd24uaWQgPT09IDB4YzM7XG4gICAgY29uc3QgYm9zcyA9XG4gICAgICAgIGlzUmFnZSA/IHRoaXMucm9tLmJvc3Nlcy5SYWdlIDpcbiAgICAgICAgdGhpcy5yb20uYm9zc2VzLmZyb21Mb2NhdGlvbihsb2NhdGlvbi5pZCk7XG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgaWYgKCFib3NzIHx8ICFib3NzLmZsYWcpIHRocm93IG5ldyBFcnJvcihgQmFkIGJvc3MgYXQgJHtsb2NhdGlvbi5uYW1lfWApO1xuICAgIGNvbnN0IHNjcmVlbiA9IHRpbGUgJiB+MHhmZjtcbiAgICAvLyBOT1RFOiBSYWdlIGNhbiBiZSBleGl0ZWQgc291dGguLi4gYnV0IHRoaXMgb25seSBtYXR0ZXJzIGlmIHRoZXJlJ3NcbiAgICAvLyBhbnl0aGluZyBvdGhlciB0aGFuIE1lc2lhJ3Mgc2hyaW5lIGJlaGluZCBoaW0sIHdoaWNoIG1ha2VzIGEgbG90IG9mXG4gICAgLy8gbG9naWMgbW9yZSBkaWZmaWN1bHQsIHNvIGxpa2VseSB0aGlzIGVudHJhbmNlIHdpbGwgc3RheSBwdXQgZm9yZXZlci5cbiAgICBjb25zdCBib3NzVGVycmFpbiA9IHRoaXMudGVycmFpbkZhY3RvcnkuYm9zcyhib3NzLmZsYWcuaWQpO1xuICAgIGNvbnN0IGhpdGJveCA9IHNlcSgweGYwLCAodDogbnVtYmVyKSA9PiAoc2NyZWVuIHwgdCkgYXMgVGlsZUlkKTtcbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCBib3NzVGVycmFpbik7XG4gICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCBib3NzKTtcbiAgfVxuXG4gIGFkZEJvc3NDaGVjayhoaXRib3g6IEhpdGJveCwgYm9zczogQm9zcyxcbiAgICAgICAgICAgICAgIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQgPSBSZXF1aXJlbWVudC5PUEVOKSB7XG4gICAgaWYgKGJvc3MuZmxhZyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGEgZmxhZzogJHtib3NzfWApO1xuICAgIGNvbnN0IHJlcSA9IFJlcXVpcmVtZW50Lm1lZXQocmVxdWlyZW1lbnRzLCB0aGlzLmJvc3NSZXF1aXJlbWVudHMoYm9zcykpO1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtib3NzLmZsYWcuaWRdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgaGl0Ym94LCByZXEsIGJvc3MuZmxhZy5pZCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0NoZXN0KGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gQWRkIGEgY2hlY2sgZm9yIHRoZSAxeHggZmxhZy4gIE1ha2Ugc3VyZSBpdCdzIG5vdCBhIG1pbWljLlxuICAgIGlmICh0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF0gPj0gMHg3MCkgcmV0dXJuO1xuICAgIGNvbnN0IHNsb3QgPSAweDEwMCB8IHNwYXduLmlkO1xuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXTtcbiAgICBpZiAobWFwcGVkID49IDB4NzApIHJldHVybjsgLy8gVE9ETyAtIG1pbWljJSBtYXkgY2FyZVxuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1ttYXBwZWRdO1xuICAgIGNvbnN0IHVuaXF1ZSA9IHRoaXMuZmxhZ3NldC5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpID8gISFpdGVtPy51bmlxdWUgOiB0cnVlO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSwgUmVxdWlyZW1lbnQuT1BFTixcbiAgICAgICAgICAgICAgICAgICAgICBzbG90LCB7bG9zc3k6IGZhbHNlLCB1bmlxdWV9KTtcbiAgfVxuXG4gIHByb2Nlc3NNb25zdGVyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG5cbiAgICAvLyBUT0RPIC0gY3VycmVudGx5IGRvbid0IGhhbmRsZSBmbHllcnMgd2VsbCAtIGNvdWxkIGluc3RlYWQgYWRkIGZseWVyc1xuICAgIC8vICAgICAgICB0byBhbGwgZW50cmFuY2VzP1xuXG4gICAgLy8gQ2hlY2sgbW9uc3RlcidzIHZ1bG5lcmFiaWxpdGllcyBhbmQgYWRkIGEgY2hlY2sgZm9yIE1vbmV5IGdpdmVuIHN3b3Jkcy5cbiAgICBjb25zdCBtb25zdGVyID0gdGhpcy5yb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgcmV0dXJuO1xuICAgIGlmICghKG1vbnN0ZXIuZ29sZERyb3ApKSByZXR1cm47XG4gICAgY29uc3Qge1xuICAgICAgTW9uZXksXG4gICAgICBTd29yZCwgU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyLFxuICAgIH0gPSB0aGlzLnJvbS5mbGFncztcbiAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV07XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgU3dvcmQuciwgW01vbmV5LmlkXSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHN3b3JkcyA9XG4gICAgICAgIFtTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXJdXG4gICAgICAgICAgICAuZmlsdGVyKChfLCBpKSA9PiBtb25zdGVyLmVsZW1lbnRzICYgKDEgPDwgaSkpO1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBjb2xsZWN0aW5nIGFsbCB0aGUgZWxlbWVudHMgaW4gb25lIHBsYWNlIGZpcnN0XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIG9yKC4uLnN3b3JkcyksIFtNb25leS5pZF0pO1xuICB9XG5cbiAgcHJvY2Vzc0l0ZW1Vc2UoaGl0Ym94OiBIaXRib3gsIHJlcTE6IFJlcXVpcmVtZW50LCBpdGVtOiBJdGVtLCB1c2U6IEl0ZW1Vc2UpIHtcbiAgICAvLyB0aGlzIHNob3VsZCBoYW5kbGUgbW9zdCB0cmFkZS1pbnMgYXV0b21hdGljYWxseVxuICAgIGhpdGJveCA9IG5ldyBTZXQoWy4uLmhpdGJveF0ubWFwKHQgPT4gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQpKTtcbiAgICBjb25zdCByZXEyID0gW1soMHgyMDAgfCBpdGVtLmlkKSBhcyBDb25kaXRpb25dXTsgLy8gcmVxdWlyZXMgdGhlIGl0ZW0uXG4gICAgLy8gY2hlY2sgZm9yIGtpcmlzYSBwbGFudCwgYWRkIGNoYW5nZSBhcyBhIHJlcXVpcmVtZW50LlxuICAgIGlmIChpdGVtLmlkID09PSB0aGlzLnJvbS5wcmdbMHgzZDRiNV0gKyAweDFjKSB7XG4gICAgICByZXEyWzBdLnB1c2godGhpcy5yb20uZmxhZ3MuQ2hhbmdlLmMpO1xuICAgIH1cbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuTWVkaWNhbEhlcmIpIHsgLy8gZG9scGhpblxuICAgICAgcmVxMlswXVswXSA9IHRoaXMucm9tLmZsYWdzLkJ1eUhlYWxpbmcuYzsgLy8gbm90ZTogbm8gb3RoZXIgaGVhbGluZyBpdGVtc1xuICAgIH1cbiAgICBjb25zdCByZXEgPSBSZXF1aXJlbWVudC5tZWV0KHJlcTEsIHJlcTIpO1xuICAgIC8vIHNldCBhbnkgZmxhZ3NcbiAgICB0aGlzLmFkZENoZWNrRnJvbUZsYWdzKGhpdGJveCwgcmVxLCB1c2UuZmxhZ3MpO1xuICAgIC8vIGhhbmRsZSBhbnkgZXh0cmEgYWN0aW9uc1xuICAgIHN3aXRjaCAodXNlLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MTA6XG4gICAgICAgIC8vIHVzZSBrZXlcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKGhpdGJveCwgcmVxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDg6IGNhc2UgMHgwYjogY2FzZSAweDBjOiBjYXNlIDB4MGQ6IGNhc2UgMHgwZjogY2FzZSAweDFjOlxuICAgICAgICAvLyBmaW5kIGl0ZW1ncmFudCBmb3IgaXRlbSBJRCA9PiBhZGQgY2hlY2tcbiAgICAgICAgdGhpcy5hZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94LCByZXEsIGl0ZW0uaWQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgwMjpcbiAgICAgICAgLy8gZG9scGhpbiBkZWZlcnMgdG8gZGlhbG9nIGFjdGlvbiAxMSAoYW5kIDBkIHRvIHN3aW0gYXdheSlcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDB4MTAwIHwgdGhpcy5yb20ubnBjc1t1c2Uud2FudCAmIDB4ZmZdLmRhdGFbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NLZXlVc2UoaGl0Ym94OiBIaXRib3gsIHJlcTogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBzZXQgdGhlIGN1cnJlbnQgc2NyZWVuJ3MgZmxhZyBpZiB0aGUgY29uZGl0aW9ucyBhcmUgbWV0Li4uXG4gICAgLy8gbWFrZSBzdXJlIHRoZXJlJ3Mgb25seSBhIHNpbmdsZSBzY3JlZW4uXG4gICAgY29uc3QgW3NjcmVlbiwgLi4ucmVzdF0gPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IFNjcmVlbklkLmZyb20odCkpKTtcbiAgICBpZiAoc2NyZWVuID09IG51bGwgfHwgcmVzdC5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgb25lIHNjcmVlbmApO1xuICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW3NjcmVlbiA+Pj4gOF07XG4gICAgY29uc3QgZmxhZyA9IGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gKHNjcmVlbiAmIDB4ZmYpKTtcbiAgICBpZiAoZmxhZyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGZsYWcgb24gc2NyZWVuYCk7XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcSwgW2ZsYWcuZmxhZ10pO1xuICB9XG5cbiAgYm9zc1JlcXVpcmVtZW50cyhib3NzOiBCb3NzKTogUmVxdWlyZW1lbnQge1xuICAgIC8vIFRPRE8gLSBoYW5kbGUgYm9zcyBzaHVmZmxlIHNvbWVob3c/XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5SYWdlKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIFJhZ2UuICBGaWd1cmUgb3V0IHdoYXQgaGUgd2FudHMgZnJvbSB0aGUgZGlhbG9nLlxuICAgICAgY29uc3QgdW5rbm93blN3b3JkID0gdGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5yYW5kb21pemVUcmFkZXMoKTtcbiAgICAgIGlmICh1bmtub3duU3dvcmQpIHJldHVybiB0aGlzLnJvbS5mbGFncy5Td29yZC5yOyAvLyBhbnkgc3dvcmQgbWlnaHQgZG8uXG4gICAgICByZXR1cm4gW1t0aGlzLnJvbS5ucGNzLlJhZ2UuZGlhbG9nKClbMF0uY29uZGl0aW9uIGFzIENvbmRpdGlvbl1dO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGJvc3Mub2JqZWN0O1xuICAgIGNvbnN0IHIgPSBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcigpO1xuICAgIGlmICh0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFnc2V0LnNodWZmbGVCb3NzRWxlbWVudHMoKSB8fFxuICAgICAgICAhdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgci5hZGRBbGwodGhpcy5yb20uZmxhZ3MuU3dvcmQucik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGxldmVsID0gdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVN3b3JkTWFnaWMoKSA/IGJvc3Muc3dvcmRMZXZlbCA6IDE7XG4gICAgICBjb25zdCBvYmogPSB0aGlzLnJvbS5vYmplY3RzW2lkXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgIGlmIChvYmouaXNWdWxuZXJhYmxlKGkpKSByLmFkZEFsbCh0aGlzLnN3b3JkUmVxdWlyZW1lbnQoaSwgbGV2ZWwpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2FuJ3QgYWN0dWFsbHkga2lsbCB0aGUgYm9zcyBpZiBpdCBkb2Vzbid0IHNwYXduLlxuICAgIGNvbnN0IGV4dHJhOiBDb25kaXRpb25bXSA9IFtdO1xuICAgIGlmIChib3NzLm5wYyAhPSBudWxsICYmIGJvc3MubG9jYXRpb24gIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc3Bhd25Db25kaXRpb24gPSBib3NzLm5wYy5zcGF3bnModGhpcy5yb20ubG9jYXRpb25zW2Jvc3MubG9jYXRpb25dKTtcbiAgICAgIGV4dHJhLnB1c2goLi4udGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb24pWzBdKTtcbiAgICB9XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5JbnNlY3QpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuSW5zZWN0Rmx1dGUuYywgdGhpcy5yb20uZmxhZ3MuR2FzTWFzay5jKTtcbiAgICB9IGVsc2UgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5EcmF5Z29uMikge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5Cb3dPZlRydXRoLmMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVJlZnJlc2goKSkge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5SZWZyZXNoLmMpO1xuICAgIH1cbiAgICByLnJlc3RyaWN0KFtleHRyYV0pO1xuICAgIHJldHVybiBSZXF1aXJlbWVudC5mcmVlemUocik7XG4gIH1cblxuICBzd29yZFJlcXVpcmVtZW50KGVsZW1lbnQ6IG51bWJlciwgbGV2ZWw6IG51bWJlcik6IFJlcXVpcmVtZW50IHtcbiAgICBjb25zdCBzd29yZCA9IFtcbiAgICAgIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZXaW5kLCB0aGlzLnJvbS5mbGFncy5Td29yZE9mRmlyZSxcbiAgICAgIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZlRodW5kZXIsXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDEpIHJldHVybiBzd29yZC5yO1xuICAgIGNvbnN0IHBvd2VycyA9IFtcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXaW5kLCB0aGlzLnJvbS5mbGFncy5Ub3JuYWRvQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZkZpcmUsIHRoaXMucm9tLmZsYWdzLkZsYW1lQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZldhdGVyLCB0aGlzLnJvbS5mbGFncy5CbGl6emFyZEJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZUaHVuZGVyLCB0aGlzLnJvbS5mbGFncy5TdG9ybUJyYWNlbGV0XSxcbiAgICBdW2VsZW1lbnRdO1xuICAgIGlmIChsZXZlbCA9PT0gMykgcmV0dXJuIGFuZChzd29yZCwgLi4ucG93ZXJzKTtcbiAgICByZXR1cm4gcG93ZXJzLm1hcChwb3dlciA9PiBbc3dvcmQuYywgcG93ZXIuY10pO1xuICB9XG5cbiAgaXRlbUdyYW50KGlkOiBudW1iZXIpOiBudW1iZXIge1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHRoaXMucm9tLml0ZW1HZXRzLmFjdGlvbkdyYW50cykge1xuICAgICAgaWYgKGtleSA9PT0gaWQpIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBpdGVtIGdyYW50ICR7aWQudG9TdHJpbmcoMTYpfWApO1xuICB9XG5cbiAgLyoqIFJldHVybiBhIFJlcXVpcmVtZW50IGZvciBhbGwgb2YgdGhlIGZsYWdzIGJlaW5nIG1ldC4gKi9cbiAgZmlsdGVyUmVxdWlyZW1lbnRzKGZsYWdzOiBudW1iZXJbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gICAgY29uc3QgY29uZHMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnIDwgMCkge1xuICAgICAgICBjb25zdCBsb2dpYyA9IHRoaXMuZmxhZyh+ZmxhZyk/LmxvZ2ljO1xuICAgICAgICBpZiAobG9naWM/LmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5DTE9TRUQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgICBpZiAoZj8ubG9naWMuYXNzdW1lRmFsc2UpIHJldHVybiBSZXF1aXJlbWVudC5DTE9TRUQ7XG4gICAgICAgIGlmIChmPy5sb2dpYy50cmFjaykgY29uZHMucHVzaChmLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbY29uZHNdO1xuICB9XG5cbiAgLyoqIFJldHVybiBhIFJlcXVpcmVtZW50IGZvciBzb21lIGZsYWcgbm90IGJlaW5nIG1ldC4gKi9cbiAgZmlsdGVyQW50aVJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IHJlcSA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgaWYgKGZsYWcgPj0gMCkge1xuICAgICAgICBjb25zdCBsb2dpYyA9IHRoaXMuZmxhZyh+ZmxhZyk/LmxvZ2ljO1xuICAgICAgICBpZiAobG9naWM/LmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuT1BFTjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcofmZsYWcpO1xuICAgICAgICBpZiAoZj8ubG9naWMuYXNzdW1lVHJ1ZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICAgIGlmIChmPy5sb2dpYy50cmFjaykgcmVxLnB1c2goW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXE7XG4gIH1cblxuICBmbGFnKGZsYWc6IG51bWJlcik6IEZsYWd8dW5kZWZpbmVkIHtcbiAgICAvL2NvbnN0IHVuc2lnbmVkID0gZmxhZyA8IDAgPyB+ZmxhZyA6IGZsYWc7XG4gICAgY29uc3QgdW5zaWduZWQgPSBmbGFnOyAgLy8gVE9ETyAtIHNob3VsZCB3ZSBhdXRvLWludmVydD9cbiAgICBjb25zdCBmID0gdGhpcy5yb20uZmxhZ3NbdW5zaWduZWRdO1xuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMuYWxpYXNlcy5nZXQoZikgPz8gZjtcbiAgICByZXR1cm4gbWFwcGVkO1xuICB9XG5cbiAgZW50cmFuY2UobG9jYXRpb246IExvY2F0aW9ufG51bWJlciwgaW5kZXggPSAwKTogVGlsZUlkIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uID09PSAnbnVtYmVyJykgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbbG9jYXRpb25dO1xuICAgIHJldHVybiB0aGlzLnRpbGVzLmZpbmQoVGlsZUlkLmZyb20obG9jYXRpb24sIGxvY2F0aW9uLmVudHJhbmNlc1tpbmRleF0pKTtcbiAgfVxuXG4gIHdhbGxDYXBhYmlsaXR5KHdhbGw6IFdhbGxUeXBlKTogbnVtYmVyIHtcbiAgICBzd2l0Y2ggKHdhbGwpIHtcbiAgICAgIGNhc2UgV2FsbFR5cGUuV0lORDogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrU3RvbmUuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLkZJUkU6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha0ljZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuV0FURVI6IHJldHVybiB0aGlzLnJvbS5mbGFncy5Gb3JtQnJpZGdlLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5USFVOREVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJcm9uLmlkO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKGBiYWQgd2FsbCB0eXBlOiAke3dhbGx9YCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFuZCguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuU2luZ2xlIHtcbiAgcmV0dXJuIFtmbGFncy5tYXAoKGY6IEZsYWcpID0+IGYuaWQgYXMgQ29uZGl0aW9uKV07XG59XG5cbmZ1bmN0aW9uIG9yKC4uLmZsYWdzOiBGbGFnW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICByZXR1cm4gZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBbZi5pZCBhcyBDb25kaXRpb25dKTtcbn1cblxuLy8gQW4gaW50ZXJlc3Rpbmcgd2F5IHRvIHRyYWNrIHRlcnJhaW4gY29tYmluYXRpb25zIGlzIHdpdGggcHJpbWVzLlxuLy8gSWYgd2UgaGF2ZSBOIGVsZW1lbnRzIHdlIGNhbiBsYWJlbCBlYWNoIGF0b20gd2l0aCBhIHByaW1lIGFuZFxuLy8gdGhlbiBsYWJlbCBhcmJpdHJhcnkgY29tYmluYXRpb25zIHdpdGggdGhlIHByb2R1Y3QuICBGb3IgTj0xMDAwXG4vLyB0aGUgaGlnaGVzdCBudW1iZXIgaXMgODAwMCwgc28gdGhhdCBpdCBjb250cmlidXRlcyBhYm91dCAxMyBiaXRzXG4vLyB0byB0aGUgcHJvZHVjdCwgbWVhbmluZyB3ZSBjYW4gc3RvcmUgY29tYmluYXRpb25zIG9mIDQgc2FmZWx5XG4vLyB3aXRob3V0IHJlc29ydGluZyB0byBiaWdpbnQuICBUaGlzIGlzIGluaGVyZW50bHkgb3JkZXItaW5kZXBlbmRlbnQuXG4vLyBJZiB0aGUgcmFyZXIgb25lcyBhcmUgaGlnaGVyLCB3ZSBjYW4gZml0IHNpZ25pZmljYW50bHkgbW9yZSB0aGFuIDQuXG5cbmNvbnN0IERFQlVHID0gZmFsc2U7XG5cbi8vIERlYnVnIGludGVyZmFjZS5cbmV4cG9ydCBpbnRlcmZhY2UgQXJlYURhdGEge1xuICBpZDogbnVtYmVyO1xuICB0aWxlczogU2V0PFRpbGVJZD47XG4gIGNoZWNrczogQXJyYXk8W0ZsYWcsIFJlcXVpcmVtZW50XT47XG4gIHRlcnJhaW46IFRlcnJhaW47XG4gIGxvY2F0aW9uczogU2V0PG51bWJlcj47XG4gIHJvdXRlczogUmVxdWlyZW1lbnQuRnJvemVuO1xufVxuZXhwb3J0IGludGVyZmFjZSBUaWxlRGF0YSB7XG4gIGFyZWE6IEFyZWFEYXRhO1xuICBleGl0PzogVGlsZUlkO1xufVxuZXhwb3J0IGludGVyZmFjZSBMb2NhdGlvbkRhdGEge1xuICBhcmVhczogU2V0PEFyZWFEYXRhPjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xufVxuZXhwb3J0IGludGVyZmFjZSBXb3JsZERhdGEge1xuICB0aWxlczogTWFwPFRpbGVJZCwgVGlsZURhdGE+O1xuICBhcmVhczogQXJlYURhdGFbXTtcbiAgbG9jYXRpb25zOiBMb2NhdGlvbkRhdGFbXTtcbn1cbiJdfQ==