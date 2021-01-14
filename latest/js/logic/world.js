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
        this.limeTreeEntranceLocation = -1;
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
        if (flagset.assumeTriggerGlitch()) {
            this.seamlessExits.add = () => this.seamlessExits;
        }
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
        const { locations: { Leaf_ToolShop, MezameShrine, Oak, Shyron_ToolShop, }, flags: { AbleToRideDolphin, BallOfFire, BallOfThunder, BallOfWater, BallOfWind, Barrier, BlizzardBracelet, BowOfMoon, BowOfSun, BreakStone, BreakIce, BreakIron, BrokenStatue, BuyHealing, BuyWarp, ClimbWaterfall, ClimbSlope8, ClimbSlope9, ClimbSlope10, CrossPain, CurrentlyRidingDolphin, Flight, FlameBracelet, FormBridge, GasMask, GlowingLamp, InjuredDolphin, LeadingChild, LeatherBoots, Money, OpenedCrypt, RabbitBoots, Refresh, RepairedStatue, RescuedChild, ShellFlute, ShieldRing, ShootingStatue, StormBracelet, Sword, SwordOfFire, SwordOfThunder, SwordOfWater, SwordOfWind, TornadoBracelet, TravelSwamp, TriggerSkip, WildWarp, }, items: { MedicalHerb, WarpBoots, }, } = this.rom;
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
        this.addCheck([start], Flight.r, [ClimbWaterfall.id, ClimbSlope10.id]);
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
        if (this.flagset.assumeFlightStatueSkip()) {
            this.addCheck([start], [[Money.c, Flight.c]], [ShootingStatue.id]);
        }
        if (!this.flagset.guaranteeGasMask()) {
            this.addCheck([start], [[Money.c, BuyHealing.c],
                [Money.c, Refresh.c]], [TravelSwamp.id, CrossPain.id]);
        }
        if (this.flagset.assumeWildWarp()) {
            this.addCheck([start], Requirement.OPEN, [WildWarp.id]);
        }
        if (this.flagset.assumeTriggerGlitch()) {
            this.addCheck([start], Requirement.OPEN, [TriggerSkip.id]);
            this.addCheck([start], TriggerSkip.r, [CrossPain.id, ClimbSlope8.id,
                ClimbSlope9.id, ClimbSlope10.id]);
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
            if (dest === this.rom.locations.LimeTreeLake.id &&
                this.rom.locations.LimeTreeLake.entrances[entrance].y > 0xa0) {
                this.limeTreeEntranceLocation = location.id;
            }
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
                if (this.flagset.assumeTriggerGlitch()) {
                    antiRequirements = Requirement.or(antiRequirements, this.rom.flags.TriggerSkip.r);
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
                extra.push([this.rom.flags.Paralysis.c]);
                break;
            }
        }
        if (this.flagset.assumeTriggerGlitch()) {
            extra.push([this.rom.flags.TriggerSkip.c]);
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
        const bossTerrain = this.terrainFactory.boss(boss.flag.id, isRage);
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
        const { Money, RageSkip, Sword, SwordOfWind, SwordOfFire, SwordOfWater, SwordOfThunder, } = this.rom.flags;
        if (location.id === this.limeTreeEntranceLocation && monster.isFlyer &&
            this.flagset.assumeRageSkip()) {
            this.addCheck([this.entrance(location)], Requirement.OPEN, [RageSkip.id]);
        }
        if (!(monster.goldDrop))
            return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQXNFaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVB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VSxDQUFDLEVBQUUsQ0FBQztZQUN6RCxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDMUQsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxFQUFFLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUM7Q0FDRjtBQUVELFNBQVMsR0FBRyxDQUFDLEdBQUcsS0FBYTtJQUMzQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQUVELFNBQVMsRUFBRSxDQUFDLEdBQUcsS0FBYTtJQUMxQixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQVVELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7QXJlYX0gZnJvbSAnLi4vc3BvaWxlci9hcmVhLmpzJztcbmltcG9ydCB7ZGllfSBmcm9tICcuLi9hc3NlcnQuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7UmFuZG9tfSBmcm9tICcuLi9yYW5kb20uanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0Jvc3N9IGZyb20gJy4uL3JvbS9ib3NzZXMuanMnO1xuaW1wb3J0IHtGbGFnLCBMb2dpY30gZnJvbSAnLi4vcm9tL2ZsYWdzLmpzJztcbmltcG9ydCB7SXRlbSwgSXRlbVVzZX0gZnJvbSAnLi4vcm9tL2l0ZW0uanMnO1xuaW1wb3J0IHtMb2NhdGlvbiwgU3Bhd259IGZyb20gJy4uL3JvbS9sb2NhdGlvbi5qcyc7XG5pbXBvcnQge0xvY2FsRGlhbG9nLCBOcGN9IGZyb20gJy4uL3JvbS9ucGMuanMnO1xuaW1wb3J0IHtTaG9wVHlwZX0gZnJvbSAnLi4vcm9tL3Nob3AuanMnO1xuaW1wb3J0IHtoZXgsIHNlcX0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXAsIExhYmVsZWRTZXQsIGl0ZXJzLCBzcHJlYWR9IGZyb20gJy4uL3V0aWwuanMnO1xuaW1wb3J0IHtEaXJ9IGZyb20gJy4vZGlyLmpzJztcbmltcG9ydCB7SXRlbUluZm8sIExvY2F0aW9uTGlzdCwgU2xvdEluZm99IGZyb20gJy4vZ3JhcGguanMnO1xuaW1wb3J0IHtIaXRib3h9IGZyb20gJy4vaGl0Ym94LmpzJztcbmltcG9ydCB7Q29uZGl0aW9uLCBSZXF1aXJlbWVudCwgUm91dGV9IGZyb20gJy4vcmVxdWlyZW1lbnQuanMnO1xuaW1wb3J0IHtTY3JlZW5JZH0gZnJvbSAnLi9zY3JlZW5pZC5qcyc7XG5pbXBvcnQge1RlcnJhaW4sIFRlcnJhaW5zfSBmcm9tICcuL3RlcnJhaW4uanMnO1xuaW1wb3J0IHtUaWxlSWR9IGZyb20gJy4vdGlsZWlkLmpzJztcbmltcG9ydCB7VGlsZVBhaXJ9IGZyb20gJy4vdGlsZXBhaXIuanMnO1xuaW1wb3J0IHtXYWxsVHlwZX0gZnJvbSAnLi93YWxsdHlwZS5qcyc7XG5pbXBvcnQgeyBNb25zdGVyIH0gZnJvbSAnLi4vcm9tL21vbnN0ZXIuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG5pbnRlcmZhY2UgQ2hlY2sge1xuICByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQ7XG4gIGNoZWNrczogbnVtYmVyW107XG59XG5cbi8vIEJhc2ljIGFsZ29yaXRobTpcbi8vICAxLiBmaWxsIHRlcnJhaW5zIGZyb20gbWFwc1xuLy8gIDIuIG1vZGlmeSB0ZXJyYWlucyBiYXNlZCBvbiBucGNzLCB0cmlnZ2VycywgYm9zc2VzLCBldGNcbi8vICAyLiBmaWxsIGFsbEV4aXRzXG4vLyAgMy4gc3RhcnQgdW5pb25maW5kXG4vLyAgNC4gZmlsbCAuLi4/XG5cbi8qKiBTdG9yZXMgYWxsIHRoZSByZWxldmFudCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgd29ybGQncyBsb2dpYy4gKi9cbmV4cG9ydCBjbGFzcyBXb3JsZCB7XG5cbiAgLyoqIEJ1aWxkcyBhbmQgY2FjaGVzIFRlcnJhaW4gb2JqZWN0cy4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbkZhY3RvcnkgPSBuZXcgVGVycmFpbnModGhpcy5yb20pO1xuXG4gIC8qKiBUZXJyYWlucyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSB0ZXJyYWlucyA9IG5ldyBNYXA8VGlsZUlkLCBUZXJyYWluPigpO1xuXG4gIC8qKiBDaGVja3MgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgY2hlY2tzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBTZXQ8Q2hlY2s+PigoKSA9PiBuZXcgU2V0KCkpO1xuXG4gIC8qKiBTbG90IGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBzbG90cyA9IG5ldyBNYXA8bnVtYmVyLCBTbG90SW5mbz4oKTtcbiAgLyoqIEl0ZW0gaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IGl0ZW1zID0gbmV3IE1hcDxudW1iZXIsIEl0ZW1JbmZvPigpO1xuXG4gIC8qKiBGbGFncyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGRpcmVjdCBhbGlhc2VzIGZvciBsb2dpYy4gKi9cbiAgcmVhZG9ubHkgYWxpYXNlczogTWFwPEZsYWcsIEZsYWc+O1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gaXRlbXVzZSB0cmlnZ2VycyB0byB0aGUgaXRlbXVzZSB0aGF0IHdhbnRzIGl0LiAqL1xuICByZWFkb25seSBpdGVtVXNlcyA9IG5ldyBEZWZhdWx0TWFwPG51bWJlciwgW0l0ZW0sIEl0ZW1Vc2VdW10+KCgpID0+IFtdKTtcblxuICAvKiogUmF3IG1hcHBpbmcgb2YgZXhpdHMsIHdpdGhvdXQgY2Fub25pY2FsaXppbmcuICovXG4gIHJlYWRvbmx5IGV4aXRzID0gbmV3IE1hcDxUaWxlSWQsIFRpbGVJZD4oKTtcblxuICAvKiogTWFwcGluZyBmcm9tIGV4aXRzIHRvIGVudHJhbmNlcy4gIFRpbGVQYWlyIGlzIGNhbm9uaWNhbGl6ZWQuICovXG4gIHJlYWRvbmx5IGV4aXRTZXQgPSBuZXcgU2V0PFRpbGVQYWlyPigpO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgVGlsZUlkcyB3aXRoIHNlYW1sZXNzIGV4aXRzLiAgVGhpcyBpcyB1c2VkIHRvIGVuc3VyZSB0aGVcbiAgICogbG9naWMgdW5kZXJzdGFuZHMgdGhhdCB0aGUgcGxheWVyIGNhbid0IHdhbGsgYWNyb3NzIGFuIGV4aXQgdGlsZVxuICAgKiB3aXRob3V0IGNoYW5naW5nIGxvY2F0aW9ucyAocHJpbWFyaWx5IGZvciBkaXNhYmxpbmcgdGVsZXBvcnRcbiAgICogc2tpcCkuXG4gICAqL1xuICByZWFkb25seSBzZWFtbGVzc0V4aXRzID0gbmV3IFNldDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIFVuaW9uZmluZCBvZiBjb25uZWN0ZWQgY29tcG9uZW50cyBvZiB0aWxlcy4gIE5vdGUgdGhhdCBhbGwgdGhlXG4gICAqIGFib3ZlIHByb3BlcnRpZXMgY2FuIGJlIGJ1aWx0IHVwIGluIHBhcmFsbGVsLCBidXQgdGhlIHVuaW9uZmluZFxuICAgKiBjYW5ub3QgYmUgc3RhcnRlZCB1bnRpbCBhZnRlciBhbGwgdGVycmFpbnMgYW5kIGV4aXRzIGFyZVxuICAgKiByZWdpc3RlcmVkLCBzaW5jZSB3ZSBzcGVjaWZpY2FsbHkgbmVlZCB0byAqbm90KiB1bmlvbiBjZXJ0YWluXG4gICAqIG5laWdoYm9ycy5cbiAgICovXG4gIHJlYWRvbmx5IHRpbGVzID0gbmV3IFVuaW9uRmluZDxUaWxlSWQ+KCk7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiBUaWxlUGFpcnMgb2YgY2Fub25pY2FsIHVuaW9uZmluZCByZXByZXNlbnRhdGl2ZSBUaWxlSWRzIHRvXG4gICAqIGEgYml0c2V0IG9mIG5laWdoYm9yIGRpcmVjdGlvbnMuICBXZSBvbmx5IG5lZWQgdG8gd29ycnkgYWJvdXRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgYmVjYXVzZSBhbGwgVGlsZUlkcyBoYXZlIHRoZSBzYW1lIHRlcnJhaW4uXG4gICAqIFdlIHdpbGwgYWRkIGEgcm91dGUgZm9yIGVhY2ggZGlyZWN0aW9uIHdpdGggdW5pcXVlIHJlcXVpcmVtZW50cy5cbiAgICovXG4gIHJlYWRvbmx5IG5laWdoYm9ycyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVQYWlyLCBudW1iZXI+KCgpID0+IDApO1xuXG4gIC8qKiBSZXF1aXJlbWVudCBidWlsZGVyIGZvciByZWFjaGluZyBlYWNoIGNhbm9uaWNhbCBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHJvdXRlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgICgpID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCkpO1xuXG4gIC8qKiBSb3V0ZXMgb3JpZ2luYXRpbmcgZnJvbSBlYWNoIGNhbm9uaWNhbCB0aWxlLiAqL1xuICByZWFkb25seSByb3V0ZUVkZ2VzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgTGFiZWxlZFNldDxSb3V0ZT4+KCgpID0+IG5ldyBMYWJlbGVkU2V0KCkpO1xuXG4gIC8qKiBMb2NhdGlvbiBsaXN0OiB0aGlzIGlzIHRoZSByZXN1bHQgb2YgY29tYmluaW5nIHJvdXRlcyB3aXRoIGNoZWNrcy4gKi9cbiAgcmVhZG9ubHkgcmVxdWlyZW1lbnRNYXAgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8Q29uZGl0aW9uLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoYzogQ29uZGl0aW9uKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcihjKSk7XG5cbiAgLyoqIExvY2F0aW9uIHdpdGggYSBub3J0aCBleGl0IHRvIExpbWUgVHJlZSBMYWtlIChpLmUuIFJhZ2UpLiAqL1xuICBwcml2YXRlIGxpbWVUcmVlRW50cmFuY2VMb2NhdGlvbiA9IC0xO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLCByZWFkb25seSBmbGFnc2V0OiBGbGFnU2V0LFxuICAgICAgICAgICAgICByZWFkb25seSB0cmFja2VyID0gZmFsc2UpIHtcbiAgICAvLyBCdWlsZCBpdGVtVXNlc1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiByb20uaXRlbXMpIHtcbiAgICAgIGZvciAoY29uc3QgdXNlIG9mIGl0ZW0uaXRlbVVzZURhdGEpIHtcbiAgICAgICAgaWYgKHVzZS5raW5kID09PSAnZXhwZWN0Jykge1xuICAgICAgICAgIHRoaXMuaXRlbVVzZXMuZ2V0KHVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfSBlbHNlIGlmICh1c2Uua2luZCA9PT0gJ2xvY2F0aW9uJykge1xuICAgICAgICAgIHRoaXMuaXRlbVVzZXMuZ2V0KH51c2Uud2FudCkucHVzaChbaXRlbSwgdXNlXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQnVpbGQgYWxpYXNlc1xuICAgIHRoaXMuYWxpYXNlcyA9IG5ldyBNYXAoW1xuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VBa2FoYW5hLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU29sZGllciwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVN0b20sIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VXb21hbiwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5EYW5jZUhhbGwsIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgICAgW3JvbS5mbGFncy5QYXJhbHl6ZWRLZW5zdUluVGF2ZXJuLCByb20uZmxhZ3MuUGFyYWx5c2lzXSxcbiAgICBdKTtcblxuICAgIC8vIElmIHRyaWdnZXIgc2tpcCBpcyBvbiwgc2VhbWxlc3MgZXhpdHMgY2FuIGJlIGNyb3NzZWQhXG4gICAgaWYgKGZsYWdzZXQuYXNzdW1lVHJpZ2dlckdsaXRjaCgpKSB7XG4gICAgICAvLyBOT1RFOiB0aGlzIGlzIGEgdGVycmlibGUgaGFjaywgYnV0IGl0IGVmZmljaWVudGx5IHByZXZlbnRzXG4gICAgICAvLyBhZGRpbmcgdGlsZXMgdG8gdGhlIHNldCwgd2l0aG91dCBjaGVja2luZyB0aGUgZmxhZyBldmVyeSB0aW1lLlxuICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCA9ICgpID0+IHRoaXMuc2VhbWxlc3NFeGl0cztcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgbG9jYXRpb25zIHRvIGJ1aWxkIHVwIGluZm8gYWJvdXQgdGlsZXMsIHRlcnJhaW5zLCBjaGVja3MuXG4gICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbik7XG4gICAgfVxuICAgIHRoaXMuYWRkRXh0cmFDaGVja3MoKTtcblxuICAgIC8vIEJ1aWxkIHVwIHRoZSBVbmlvbkZpbmQgYW5kIHRoZSBleGl0cyBhbmQgbmVpZ2hib3JzIHN0cnVjdHVyZXMuXG4gICAgdGhpcy51bmlvbk5laWdoYm9ycygpO1xuICAgIHRoaXMucmVjb3JkRXhpdHMoKTtcbiAgICB0aGlzLmJ1aWxkTmVpZ2hib3JzKCk7XG5cbiAgICAvLyBCdWlsZCB0aGUgcm91dGVzL2VkZ2VzLlxuICAgIHRoaXMuYWRkQWxsUm91dGVzKCk7XG5cbiAgICAvLyBCdWlsZCB0aGUgbG9jYXRpb24gbGlzdC5cbiAgICB0aGlzLmNvbnNvbGlkYXRlQ2hlY2tzKCk7XG4gICAgdGhpcy5idWlsZFJlcXVpcmVtZW50TWFwKCk7XG4gIH1cblxuICAvKiogQWRkcyBjaGVja3MgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFDaGVja3MoKSB7XG4gICAgY29uc3Qge1xuICAgICAgbG9jYXRpb25zOiB7XG4gICAgICAgIExlYWZfVG9vbFNob3AsXG4gICAgICAgIE1lemFtZVNocmluZSxcbiAgICAgICAgT2FrLFxuICAgICAgICBTaHlyb25fVG9vbFNob3AsXG4gICAgICB9LFxuICAgICAgZmxhZ3M6IHtcbiAgICAgICAgQWJsZVRvUmlkZURvbHBoaW4sXG4gICAgICAgIEJhbGxPZkZpcmUsIEJhbGxPZlRodW5kZXIsIEJhbGxPZldhdGVyLCBCYWxsT2ZXaW5kLFxuICAgICAgICBCYXJyaWVyLCBCbGl6emFyZEJyYWNlbGV0LCBCb3dPZk1vb24sIEJvd09mU3VuLFxuICAgICAgICBCcmVha1N0b25lLCBCcmVha0ljZSwgQnJlYWtJcm9uLFxuICAgICAgICBCcm9rZW5TdGF0dWUsIEJ1eUhlYWxpbmcsIEJ1eVdhcnAsXG4gICAgICAgIENsaW1iV2F0ZXJmYWxsLCBDbGltYlNsb3BlOCwgQ2xpbWJTbG9wZTksIENsaW1iU2xvcGUxMCxcbiAgICAgICAgQ3Jvc3NQYWluLCBDdXJyZW50bHlSaWRpbmdEb2xwaGluLFxuICAgICAgICBGbGlnaHQsIEZsYW1lQnJhY2VsZXQsIEZvcm1CcmlkZ2UsXG4gICAgICAgIEdhc01hc2ssIEdsb3dpbmdMYW1wLFxuICAgICAgICBJbmp1cmVkRG9scGhpbixcbiAgICAgICAgTGVhZGluZ0NoaWxkLCBMZWF0aGVyQm9vdHMsXG4gICAgICAgIE1vbmV5LFxuICAgICAgICBPcGVuZWRDcnlwdCxcbiAgICAgICAgUmFiYml0Qm9vdHMsIFJlZnJlc2gsIFJlcGFpcmVkU3RhdHVlLCBSZXNjdWVkQ2hpbGQsXG4gICAgICAgIFNoZWxsRmx1dGUsIFNoaWVsZFJpbmcsIFNob290aW5nU3RhdHVlLCBTdG9ybUJyYWNlbGV0LFxuICAgICAgICBTd29yZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZUaHVuZGVyLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZXaW5kLFxuICAgICAgICBUb3JuYWRvQnJhY2VsZXQsIFRyYXZlbFN3YW1wLCBUcmlnZ2VyU2tpcCxcbiAgICAgICAgV2lsZFdhcnAsXG4gICAgICB9LFxuICAgICAgaXRlbXM6IHtcbiAgICAgICAgTWVkaWNhbEhlcmIsXG4gICAgICAgIFdhcnBCb290cyxcbiAgICAgIH0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpO1xuICAgIGNvbnN0IGVudGVyT2FrID0gdGhpcy5lbnRyYW5jZShPYWspO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEJvd09mTW9vbiwgQm93T2ZTdW4pLCBbT3BlbmVkQ3J5cHQuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGFuZChBYmxlVG9SaWRlRG9scGhpbiwgU2hlbGxGbHV0ZSksXG4gICAgICAgICAgICAgICAgICBbQ3VycmVudGx5UmlkaW5nRG9scGhpbi5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW2VudGVyT2FrXSwgYW5kKExlYWRpbmdDaGlsZCksIFtSZXNjdWVkQ2hpbGQuaWRdKTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbc3RhcnRdLCBhbmQoR2xvd2luZ0xhbXAsIEJyb2tlblN0YXR1ZSksXG4gICAgICAgICAgICAgICAgICAgICAgUmVwYWlyZWRTdGF0dWUuaWQsIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG5cbiAgICAvLyBBZGQgc2hvcHNcbiAgICBmb3IgKGNvbnN0IHNob3Agb2YgdGhpcy5yb20uc2hvcHMpIHtcbiAgICAgIC8vIGxlYWYgYW5kIHNoeXJvbiBtYXkgbm90IGFsd2F5cyBiZSBhY2Nlc3NpYmxlLCBzbyBkb24ndCByZWx5IG9uIHRoZW0uXG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gTGVhZl9Ub29sU2hvcC5pZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC5sb2NhdGlvbiA9PT0gU2h5cm9uX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmICghc2hvcC51c2VkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLnR5cGUgIT09IFNob3BUeXBlLlRPT0wpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaGl0Ym94ID0gW1RpbGVJZChzaG9wLmxvY2F0aW9uIDw8IDE2IHwgMHg4OCldO1xuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHNob3AuY29udGVudHMpIHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IE1lZGljYWxIZXJiLmlkKSB7XG4gICAgICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIE1vbmV5LnIsIFtCdXlIZWFsaW5nLmlkXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gV2FycEJvb3RzLmlkKSB7XG4gICAgICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIE1vbmV5LnIsIFtCdXlXYXJwLmlkXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgcHNldWRvIGZsYWdzXG4gICAgbGV0IGJyZWFrU3RvbmU6IFJlcXVpcmVtZW50ID0gU3dvcmRPZldpbmQucjtcbiAgICBsZXQgYnJlYWtJY2U6IFJlcXVpcmVtZW50ID0gU3dvcmRPZkZpcmUucjtcbiAgICBsZXQgZm9ybUJyaWRnZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2F0ZXIucjtcbiAgICBsZXQgYnJlYWtJcm9uOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZUaHVuZGVyLnI7XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQub3Jic09wdGlvbmFsKCkpIHtcbiAgICAgIGNvbnN0IHdpbmQyID0gb3IoQmFsbE9mV2luZCwgVG9ybmFkb0JyYWNlbGV0KTtcbiAgICAgIGNvbnN0IGZpcmUyID0gb3IoQmFsbE9mRmlyZSwgRmxhbWVCcmFjZWxldCk7XG4gICAgICBjb25zdCB3YXRlcjIgPSBvcihCYWxsT2ZXYXRlciwgQmxpenphcmRCcmFjZWxldCk7XG4gICAgICBjb25zdCB0aHVuZGVyMiA9IG9yKEJhbGxPZlRodW5kZXIsIFN0b3JtQnJhY2VsZXQpO1xuICAgICAgYnJlYWtTdG9uZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtTdG9uZSwgd2luZDIpO1xuICAgICAgYnJlYWtJY2UgPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSWNlLCBmaXJlMik7XG4gICAgICBmb3JtQnJpZGdlID0gUmVxdWlyZW1lbnQubWVldChmb3JtQnJpZGdlLCB3YXRlcjIpO1xuICAgICAgYnJlYWtJcm9uID0gUmVxdWlyZW1lbnQubWVldChicmVha0lyb24sIHRodW5kZXIyKTtcbiAgICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3dvcmRDaGFyZ2VHbGl0Y2goKSkge1xuICAgICAgICBjb25zdCBsZXZlbDIgPVxuICAgICAgICAgICAgUmVxdWlyZW1lbnQub3IoYnJlYWtTdG9uZSwgYnJlYWtJY2UsIGZvcm1CcmlkZ2UsIGJyZWFrSXJvbik7XG4gICAgICAgIGZ1bmN0aW9uIG5lZWQoc3dvcmQ6IEZsYWcpOiBSZXF1aXJlbWVudCB7XG4gICAgICAgICAgcmV0dXJuIGxldmVsMi5tYXAoXG4gICAgICAgICAgICAgIChjOiByZWFkb25seSBDb25kaXRpb25bXSkgPT5cbiAgICAgICAgICAgICAgICAgIGNbMF0gPT09IHN3b3JkLmMgPyBjIDogW3N3b3JkLmMsIC4uLmNdKTtcbiAgICAgICAgfVxuICAgICAgICBicmVha1N0b25lID0gbmVlZChTd29yZE9mV2luZCk7XG4gICAgICAgIGJyZWFrSWNlID0gbmVlZChTd29yZE9mRmlyZSk7XG4gICAgICAgIGZvcm1CcmlkZ2UgPSBuZWVkKFN3b3JkT2ZXYXRlcik7XG4gICAgICAgIGJyZWFrSXJvbiA9IG5lZWQoU3dvcmRPZlRodW5kZXIpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrU3RvbmUsIFtCcmVha1N0b25lLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0ljZSwgW0JyZWFrSWNlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBmb3JtQnJpZGdlLCBbRm9ybUJyaWRnZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtJcm9uLCBbQnJlYWtJcm9uLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLFxuICAgICAgICAgICAgICAgICAgb3IoU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyKSxcbiAgICAgICAgICAgICAgICAgIFtTd29yZC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgRmxpZ2h0LnIsIFtDbGltYldhdGVyZmFsbC5pZCwgQ2xpbWJTbG9wZTEwLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzKSwgW0NsaW1iU2xvcGU5LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBCYXJyaWVyLnIsIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgR2FzTWFzay5yLCBbVHJhdmVsU3dhbXAuaWRdKTtcbiAgICBjb25zdCBwYWluID0gdGhpcy5mbGFnc2V0LmNoYW5nZUdhc01hc2tUb0hhem1hdFN1aXQoKSA/IEdhc01hc2sgOiBMZWF0aGVyQm9vdHM7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBvcihGbGlnaHQsIFJhYmJpdEJvb3RzLCBwYWluKSwgW0Nyb3NzUGFpbi5pZF0pO1xuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5sZWF0aGVyQm9vdHNHaXZlU3BlZWQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBMZWF0aGVyQm9vdHMuciwgW0NsaW1iU2xvcGU4LmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lR2hldHRvRmxpZ2h0KCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soXG4gICAgICAgIFtzdGFydF0sIGFuZChDdXJyZW50bHlSaWRpbmdEb2xwaGluLCBSYWJiaXRCb290cyksXG4gICAgICAgIFtDbGltYldhdGVyZmFsbC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmZvZ0xhbXBOb3RSZXF1aXJlZCgpKSB7XG4gICAgICAvLyBub3QgYWN0dWFsbHkgdXNlZC4uLj9cbiAgICAgIGNvbnN0IHJlcXVpcmVIZWFsZWQgPSB0aGlzLmZsYWdzZXQucmVxdWlyZUhlYWxlZERvbHBoaW5Ub1JpZGUoKTtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZUhlYWxlZCA/IEluanVyZWREb2xwaGluLnIgOiBbW11dLFxuICAgICAgICAgICAgICAgICAgICBbQWJsZVRvUmlkZURvbHBoaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlQmFycmllcigpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBTaGllbGRSaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLFxuICAgICAgICAgICAgICAgICAgICBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVGbGlnaHRTdGF0dWVTa2lwKCkpIHtcbiAgICAgIC8vIE5PVEU6IHdpdGggbm8gbW9uZXksIHdlJ3ZlIGdvdCAxNiBNUCwgd2hpY2ggaXNuJ3QgZW5vdWdoXG4gICAgICAvLyB0byBnZXQgcGFzdCBzZXZlbiBzdGF0dWVzLlxuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEZsaWdodC5jXV0sIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVHYXNNYXNrKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBCdXlIZWFsaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFJlZnJlc2guY11dLFxuICAgICAgICAgICAgICAgICAgICBbVHJhdmVsU3dhbXAuaWQsIENyb3NzUGFpbi5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgUmVxdWlyZW1lbnQuT1BFTiwgW1dpbGRXYXJwLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lVHJpZ2dlckdsaXRjaCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFJlcXVpcmVtZW50Lk9QRU4sIFtUcmlnZ2VyU2tpcC5pZF0pO1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBUcmlnZ2VyU2tpcC5yLFxuICAgICAgICAgICAgICAgICAgICBbQ3Jvc3NQYWluLmlkLCBDbGltYlNsb3BlOC5pZCxcbiAgICAgICAgICAgICAgICAgICAgIENsaW1iU2xvcGU5LmlkLCBDbGltYlNsb3BlMTAuaWRdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQWRkcyByb3V0ZXMgdGhhdCBhcmUgbm90IGRldGVjdGFibGUgZnJvbSBkYXRhIHRhYmxlcy4gKi9cbiAgYWRkRXh0cmFSb3V0ZXMoKSB7XG4gICAgY29uc3Qge1xuICAgICAgZmxhZ3M6IHtCdXlXYXJwLCBTd29yZE9mVGh1bmRlciwgVGVsZXBvcnQsIFdpbGRXYXJwfSxcbiAgICAgIGxvY2F0aW9uczoge01lemFtZVNocmluZX0sXG4gICAgfSA9IHRoaXMucm9tO1xuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGF0IE1lemFtZSBTaHJpbmUuXG4gICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZShNZXphbWVTaHJpbmUpLCBbXSkpO1xuICAgIC8vIFN3b3JkIG9mIFRodW5kZXIgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQudGVsZXBvcnRPblRodW5kZXJTd29yZCgpKSB7XG4gICAgICBjb25zdCB3YXJwID0gdGhpcy5yb20udG93bldhcnAudGh1bmRlclN3b3JkV2FycDtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIEJ1eVdhcnAuY10pKTtcbiAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2Uod2FycFswXSwgd2FycFsxXSAmIDB4MWYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW1N3b3JkT2ZUaHVuZGVyLmMsIFRlbGVwb3J0LmNdKSk7XG4gICAgfVxuICAgIC8vIFdpbGQgd2FycFxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiB0aGlzLnJvbS53aWxkV2FycC5sb2NhdGlvbnMpIHtcbiAgICAgICAgLy8gRG9uJ3QgY291bnQgY2hhbm5lbCBpbiBsb2dpYyBiZWNhdXNlIHlvdSBjYW4ndCBhY3R1YWxseSBtb3ZlLlxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5VbmRlcmdyb3VuZENoYW5uZWwuaWQpIGNvbnRpbnVlO1xuICAgICAgICAvLyBOT1RFOiBzb21lIGVudHJhbmNlIHRpbGVzIGhhcyBleHRyYSByZXF1aXJlbWVudHMgdG8gZW50ZXIgKGUuZy5cbiAgICAgICAgLy8gc3dhbXApIC0gZmluZCB0aGVtIGFuZCBjb25jYXRlbnRlLlxuICAgICAgICBjb25zdCBlbnRyYW5jZSA9IHRoaXMuZW50cmFuY2UobG9jYXRpb24pO1xuICAgICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoZW50cmFuY2UpID8/IGRpZSgnYmFkIGVudHJhbmNlJyk7XG4gICAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgdGVycmFpbi5lbnRlcikge1xuICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGVudHJhbmNlLCBbV2lsZFdhcnAuYywgLi4ucm91dGVdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogQ2hhbmdlIHRoZSBrZXkgb2YgdGhlIGNoZWNrcyBtYXAgdG8gb25seSBiZSBjYW5vbmljYWwgVGlsZUlkcy4gKi9cbiAgY29uc29saWRhdGVDaGVja3MoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tzXSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3Qgcm9vdCA9IHRoaXMudGlsZXMuZmluZCh0aWxlKTtcbiAgICAgIGlmICh0aWxlID09PSByb290KSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgIHRoaXMuY2hlY2tzLmdldChyb290KS5hZGQoY2hlY2spO1xuICAgICAgfVxuICAgICAgdGhpcy5jaGVja3MuZGVsZXRlKHRpbGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBdCB0aGlzIHBvaW50IHdlIGtub3cgdGhhdCBhbGwgb2YgdGhpcy5jaGVja3MnIGtleXMgYXJlIGNhbm9uaWNhbC4gKi9cbiAgYnVpbGRSZXF1aXJlbWVudE1hcCgpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgcmVxID0gdGhpcy5yZXF1aXJlbWVudE1hcC5nZXQoY2hlY2sgYXMgQ29uZGl0aW9uKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHIxIG9mIHJlcXVpcmVtZW50KSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHIyIG9mIHRoaXMucm91dGVzLmdldCh0aWxlKSB8fCBbXSkge1xuICAgICAgICAgICAgICByZXEuYWRkTGlzdChbLi4ucjEsIC4uLnIyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGxvZyB0aGUgbWFwP1xuICAgIGlmICghREVCVUcpIHJldHVybjtcbiAgICBjb25zdCBsb2cgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjaGVjaywgcmVxXSBvZiB0aGlzLnJlcXVpcmVtZW50TWFwKSB7XG4gICAgICBjb25zdCBuYW1lID0gKGM6IG51bWJlcikgPT4gdGhpcy5yb20uZmxhZ3NbY10ubmFtZTtcbiAgICAgIGZvciAoY29uc3Qgcm91dGUgb2YgcmVxKSB7XG4gICAgICAgIGxvZy5wdXNoKGAke25hbWUoY2hlY2spfTogJHtbLi4ucm91dGVdLm1hcChuYW1lKS5qb2luKCcgJiAnKX1cXG5gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9nLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMCk7XG4gICAgY29uc29sZS5sb2cobG9nLmpvaW4oJycpKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGEgTG9jYXRpb25MaXN0IHN0cnVjdHVyZSBhZnRlciB0aGUgcmVxdWlyZW1lbnQgbWFwIGlzIGJ1aWx0LiAqL1xuICBnZXRMb2NhdGlvbkxpc3Qod29ybGROYW1lID0gJ0NyeXN0YWxpcycpOiBMb2NhdGlvbkxpc3Qge1xuICAgIC8vIFRPRE8gLSBjb25zaWRlciBqdXN0IGltcGxlbWVudGluZyB0aGlzIGRpcmVjdGx5P1xuICAgIGNvbnN0IGNoZWNrTmFtZSA9IERFQlVHID8gKGY6IEZsYWcpID0+IGYuZGVidWcgOiAoZjogRmxhZykgPT4gZi5uYW1lO1xuICAgIHJldHVybiB7XG4gICAgICB3b3JsZE5hbWUsXG4gICAgICByZXF1aXJlbWVudHM6IHRoaXMucmVxdWlyZW1lbnRNYXAsXG4gICAgICBpdGVtczogdGhpcy5pdGVtcyxcbiAgICAgIHNsb3RzOiB0aGlzLnNsb3RzLFxuICAgICAgY2hlY2tOYW1lOiAoY2hlY2s6IG51bWJlcikgPT4gY2hlY2tOYW1lKHRoaXMucm9tLmZsYWdzW2NoZWNrXSksXG4gICAgICBwcmVmaWxsOiAocmFuZG9tOiBSYW5kb20pID0+IHtcbiAgICAgICAgY29uc3Qge0NyeXN0YWxpcywgTWVzaWFJblRvd2VyLCBMZWFmRWxkZXJ9ID0gdGhpcy5yb20uZmxhZ3M7XG4gICAgICAgIGNvbnN0IG1hcCA9IG5ldyBNYXAoW1tNZXNpYUluVG93ZXIuaWQsIENyeXN0YWxpcy5pZF1dKTtcbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZCgpKSB7XG4gICAgICAgICAgLy8gUGljayBhIHN3b3JkIGF0IHJhbmRvbS4uLj8gaW52ZXJzZSB3ZWlnaHQ/XG4gICAgICAgICAgbWFwLnNldChMZWFmRWxkZXIuaWQsIDB4MjAwIHwgcmFuZG9tLm5leHRJbnQoNCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICAgIC8vIFRPRE8gLSBpZiBhbnkgaXRlbXMgc2hvdWxkbid0IGJlIHNodWZmbGVkLCB0aGVuIGRvIHRoZSBwcmUtZmlsbC4uLlxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqIEFkZCB0ZXJyYWlucyBhbmQgY2hlY2tzIGZvciBhIGxvY2F0aW9uLCBmcm9tIHRpbGVzIGFuZCBzcGF3bnMuICovXG4gIHByb2Nlc3NMb2NhdGlvbihsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIHJldHVybjtcbiAgICAvLyBMb29rIGZvciB3YWxscywgd2hpY2ggd2UgbmVlZCB0byBrbm93IGFib3V0IGxhdGVyLlxuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uKTtcbiAgfVxuXG4gIC8qKiBSdW4gdGhlIGZpcnN0IHBhc3Mgb2YgdW5pb25zIG5vdyB0aGF0IGFsbCB0ZXJyYWlucyBhcmUgZmluYWwuICovXG4gIHVuaW9uTmVpZ2hib3JzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh4MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHgxXSk7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeTEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB5MV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBCdWlsZHMgdXAgdGhlIHJvdXRlcyBhbmQgcm91dGVFZGdlcyBkYXRhIHN0cnVjdHVyZXMuICovXG4gIGFkZEFsbFJvdXRlcygpIHtcbiAgICAvLyBBZGQgYW55IGV4dHJhIHJvdXRlcyBmaXJzdCwgc3VjaCBhcyB0aGUgc3RhcnRpbmcgdGlsZS5cbiAgICB0aGlzLmFkZEV4dHJhUm91dGVzKCk7XG4gICAgLy8gQWRkIGFsbCB0aGUgZWRnZXMgZnJvbSBhbGwgbmVpZ2hib3JzLlxuICAgIGZvciAoY29uc3QgW3BhaXIsIGRpcnNdIG9mIHRoaXMubmVpZ2hib3JzKSB7XG4gICAgICBjb25zdCBbYzAsIGMxXSA9IFRpbGVQYWlyLnNwbGl0KHBhaXIpO1xuICAgICAgY29uc3QgdDAgPSB0aGlzLnRlcnJhaW5zLmdldChjMCk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMudGVycmFpbnMuZ2V0KGMxKTtcbiAgICAgIGlmICghdDAgfHwgIXQxKSB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgdGVycmFpbiAke2hleCh0MCA/IGMwIDogYzEpfWApO1xuICAgICAgZm9yIChjb25zdCBbZGlyLCBleGl0UmVxXSBvZiB0MC5leGl0KSB7XG4gICAgICAgIGlmICghKGRpciAmIGRpcnMpKSBjb250aW51ZTtcbiAgICAgICAgZm9yIChjb25zdCBleGl0Q29uZHMgb2YgZXhpdFJlcSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZW50ZXJDb25kcyBvZiB0MS5lbnRlcikge1xuICAgICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoYzEsIFsuLi5leGl0Q29uZHMsIC4uLmVudGVyQ29uZHNdKSwgYzApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgZGVidWcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVidWcnKTtcbiAgICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBkZWJ1Zy5hcHBlbmRDaGlsZChuZXcgQXJlYSh0aGlzLnJvbSwgdGhpcy5nZXRXb3JsZERhdGEoKSkuZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0V29ybGREYXRhKCk6IFdvcmxkRGF0YSB7XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBjb25zdCB0aWxlcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgVGlsZURhdGE+KCgpID0+ICh7fSkgYXMgVGlsZURhdGEpO1xuICAgIGNvbnN0IGxvY2F0aW9ucyA9XG4gICAgICAgIHNlcSgyNTYsICgpID0+ICh7YXJlYXM6IG5ldyBTZXQoKSwgdGlsZXM6IG5ldyBTZXQoKX0gYXMgTG9jYXRpb25EYXRhKSk7XG4gICAgY29uc3QgYXJlYXM6IEFyZWFEYXRhW10gPSBbXTtcblxuICAgIC8vIGRpZ2VzdCB0aGUgYXJlYXNcbiAgICBmb3IgKGNvbnN0IHNldCBvZiB0aGlzLnRpbGVzLnNldHMoKSkge1xuICAgICAgY29uc3QgY2Fub25pY2FsID0gdGhpcy50aWxlcy5maW5kKGl0ZXJzLmZpcnN0KHNldCkpO1xuICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGNhbm9uaWNhbCk7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgcm91dGVzID1cbiAgICAgICAgICB0aGlzLnJvdXRlcy5oYXMoY2Fub25pY2FsKSA/XG4gICAgICAgICAgICAgIFJlcXVpcmVtZW50LmZyZWV6ZSh0aGlzLnJvdXRlcy5nZXQoY2Fub25pY2FsKSkgOiBbXTtcbiAgICAgIGlmICghcm91dGVzLmxlbmd0aCkgY29udGludWU7XG4gICAgICBjb25zdCBhcmVhOiBBcmVhRGF0YSA9IHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgaWQ6IGluZGV4KyssXG4gICAgICAgIGxvY2F0aW9uczogbmV3IFNldCgpLFxuICAgICAgICByb3V0ZXMsXG4gICAgICAgIHRlcnJhaW4sXG4gICAgICAgIHRpbGVzOiBuZXcgU2V0KCksXG4gICAgICB9O1xuICAgICAgYXJlYXMucHVzaChhcmVhKTtcbiAgICAgIGZvciAoY29uc3QgdGlsZSBvZiBzZXQpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPSB0aWxlID4+PiAxNjtcbiAgICAgICAgYXJlYS5sb2NhdGlvbnMuYWRkKGxvY2F0aW9uKTtcbiAgICAgICAgYXJlYS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0uYXJlYXMuYWRkKGFyZWEpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgdGlsZXMuZ2V0KHRpbGUpLmFyZWEgPSBhcmVhO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGV4aXRzXG4gICAgZm9yIChjb25zdCBbYSwgYl0gb2YgdGhpcy5leGl0cykge1xuICAgICAgaWYgKHRpbGVzLmhhcyhhKSkge1xuICAgICAgICB0aWxlcy5nZXQoYSkuZXhpdCA9IGI7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgY2hlY2tzXG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCBhcmVhID0gdGlsZXMuZ2V0KHRpbGUpLmFyZWE7XG4gICAgICBpZiAoIWFyZWEpIHtcbiAgICAgICAgLy8gY29uc29sZS5lcnJvcihgQWJhbmRvbmVkIGNoZWNrICR7Wy4uLmNoZWNrU2V0XS5tYXAoXG4gICAgICAgIC8vICAgICAgICAgICAgICAgICAgICB4ID0+IFsuLi54LmNoZWNrc10ubWFwKHkgPT4geS50b1N0cmluZygxNikpKVxuICAgICAgICAvLyAgICAgICAgICAgICAgICB9IGF0ICR7dGlsZS50b1N0cmluZygxNil9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCBmbGFnID0gdGhpcy5yb20uZmxhZ3NbY2hlY2tdIHx8IGRpZSgpO1xuICAgICAgICAgIGFyZWEuY2hlY2tzLnB1c2goW2ZsYWcsIHJlcXVpcmVtZW50XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHt0aWxlcywgYXJlYXMsIGxvY2F0aW9uc307XG4gIH1cblxuICAvKiogQWRkcyBhIHJvdXRlLCBvcHRpb25hbGx5IHdpdGggYSBwcmVyZXF1aXNpdGUgKGNhbm9uaWNhbCkgc291cmNlIHRpbGUuICovXG4gIGFkZFJvdXRlKHJvdXRlOiBSb3V0ZSwgc291cmNlPzogVGlsZUlkKSB7XG4gICAgaWYgKHNvdXJjZSAhPSBudWxsKSB7XG4gICAgICAvLyBBZGQgYW4gZWRnZSBpbnN0ZWFkIG9mIGEgcm91dGUsIHJlY3Vyc2luZyBvbiB0aGUgc291cmNlJ3NcbiAgICAgIC8vIHJlcXVpcmVtZW50cy5cbiAgICAgIHRoaXMucm91dGVFZGdlcy5nZXQoc291cmNlKS5hZGQocm91dGUpO1xuICAgICAgZm9yIChjb25zdCBzcmNSb3V0ZSBvZiB0aGlzLnJvdXRlcy5nZXQoc291cmNlKSkge1xuICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShyb3V0ZS50YXJnZXQsIFsuLi5zcmNSb3V0ZSwgLi4ucm91dGUuZGVwc10pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVGhpcyBpcyBub3cgYW4gXCJpbml0aWFsIHJvdXRlXCIgd2l0aCBubyBwcmVyZXF1aXNpdGUgc291cmNlLlxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHN0YXJ0ID0gcm91dGU7IC8vIFRPRE8gaW5saW5lXG4gICAgcXVldWUuYWRkKHN0YXJ0KTtcbiAgICBjb25zdCBpdGVyID0gcXVldWVbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCB7dmFsdWUsIGRvbmV9ID0gaXRlci5uZXh0KCk7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuICAgICAgc2Vlbi5hZGQodmFsdWUpO1xuICAgICAgcXVldWUuZGVsZXRlKHZhbHVlKTtcbiAgICAgIGNvbnN0IGZvbGxvdyA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdmFsdWUudGFyZ2V0O1xuICAgICAgY29uc3QgYnVpbGRlciA9IHRoaXMucm91dGVzLmdldCh0YXJnZXQpO1xuICAgICAgaWYgKGJ1aWxkZXIuYWRkUm91dGUodmFsdWUpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0aGlzLnJvdXRlRWRnZXMuZ2V0KHRhcmdldCkpIHtcbiAgICAgICAgICBmb2xsb3cuYWRkKG5ldyBSb3V0ZShuZXh0LnRhcmdldCwgWy4uLnZhbHVlLmRlcHMsIC4uLm5leHQuZGVwc10pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuZXh0IG9mIGZvbGxvdykge1xuICAgICAgICBpZiAoc2Vlbi5oYXMobmV4dCkpIGNvbnRpbnVlO1xuICAgICAgICBxdWV1ZS5kZWxldGUobmV4dCk7IC8vIHJlLWFkZCBhdCB0aGUgZW5kIG9mIHRoZSBxdWV1ZVxuICAgICAgICBxdWV1ZS5hZGQobmV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyB1cCBgdGhpcy5leGl0U2V0YCB0byBpbmNsdWRlIGFsbCB0aGUgXCJmcm9tLXRvXCIgdGlsZSBwYWlyc1xuICAgKiBvZiBleGl0cyB0aGF0IF9kb24ndF8gc2hhcmUgdGhlIHNhbWUgdGVycmFpbiBGb3IgYW55IHR3by13YXkgZXhpdFxuICAgKiB0aGF0IHNoYXJlcyB0aGUgc2FtZSB0ZXJyYWluLCBqdXN0IGFkZCBpdCBkaXJlY3RseSB0byB0aGVcbiAgICogdW5pb25maW5kLlxuICAgKi9cbiAgcmVjb3JkRXhpdHMoKSB7XG4gICAgLy8gQWRkIGV4aXQgVGlsZVBhaXJzIHRvIGV4aXRTZXQgZnJvbSBhbGwgbG9jYXRpb25zJyBleGl0cy5cbiAgICBmb3IgKGNvbnN0IFtmcm9tLCB0b10gb2YgdGhpcy5leGl0cykge1xuICAgICAgdGhpcy5leGl0U2V0LmFkZChcbiAgICAgICAgICBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQoZnJvbSksIHRoaXMudGlsZXMuZmluZCh0bykpKTtcbiAgICB9XG4gICAgLy8gTG9vayBmb3IgdHdvLXdheSBleGl0cyB3aXRoIHRoZSBzYW1lIHRlcnJhaW46IHJlbW92ZSB0aGVtIGZyb21cbiAgICAvLyBleGl0U2V0IGFuZCBhZGQgdGhlbSB0byB0aGUgdGlsZXMgdW5pb25maW5kLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldChmcm9tKSAhPT0gdGhpcy50ZXJyYWlucy5nZXQodG8pKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJldmVyc2UgPSBUaWxlUGFpci5vZih0bywgZnJvbSk7XG4gICAgICBpZiAodGhpcy5leGl0U2V0LmhhcyhyZXZlcnNlKSkge1xuICAgICAgICB0aGlzLnRpbGVzLnVuaW9uKFtmcm9tLCB0b10pO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKGV4aXQpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuZGVsZXRlKHJldmVyc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGRpZmZlcmVudC10ZXJyYWluIG5laWdoYm9ycyBpbiB0aGUgc2FtZSBsb2NhdGlvbi4gIEFkZFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyB0byBgdGhpcy5uZWlnaGJvcnNgIHdpdGggYWxsIHRoZVxuICAgKiBkaXJlY3Rpb25zIHRoYXQgaXQgbmVpZ2hib3JzIGluLiAgQWxzbyBhZGQgZXhpdHMgYXMgbmVpZ2hib3JzLlxuICAgKiBUaGlzIG11c3QgaGFwcGVuICphZnRlciogdGhlIGVudGlyZSB1bmlvbmZpbmQgaXMgY29tcGxldGUgc29cbiAgICogdGhhdCB3ZSBjYW4gbGV2ZXJhZ2UgaXQuXG4gICAqL1xuICBidWlsZE5laWdoYm9ycygpIHtcbiAgICAvLyBBZGphY2VudCBkaWZmZXJlbnQtdGVycmFpbiB0aWxlcy5cbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBpZiAoIXRlcnJhaW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgY29uc3QgdHkxID0gdGhpcy50ZXJyYWlucy5nZXQoeTEpO1xuICAgICAgaWYgKHR5MSAmJiB0eTEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB5MSwgRGlyLk5vcnRoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICAgIGNvbnN0IHR4MSA9IHRoaXMudGVycmFpbnMuZ2V0KHgxKTtcbiAgICAgIGlmICh0eDEgJiYgdHgxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeDEsIERpci5XZXN0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gRXhpdHMgKGp1c3QgdXNlIFwibm9ydGhcIiBmb3IgdGhlc2UpLlxuICAgIGZvciAoY29uc3QgZXhpdCBvZiB0aGlzLmV4aXRTZXQpIHtcbiAgICAgIGNvbnN0IFt0MCwgdDFdID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHQwKSB8fCAhdGhpcy50ZXJyYWlucy5oYXModDEpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHAgPSBUaWxlUGFpci5vZih0aGlzLnRpbGVzLmZpbmQodDApLCB0aGlzLnRpbGVzLmZpbmQodDEpKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwLCB0aGlzLm5laWdoYm9ycy5nZXQocCkgfCAxKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVBZGphY2VudE5laWdoYm9ycyh0MDogVGlsZUlkLCB0MTogVGlsZUlkLCBkaXI6IERpcikge1xuICAgIC8vIE5PVEU6IHQwIDwgdDEgYmVjYXVzZSBkaXIgaXMgYWx3YXlzIFdFU1Qgb3IgTk9SVEguXG4gICAgY29uc3QgYzAgPSB0aGlzLnRpbGVzLmZpbmQodDApO1xuICAgIGNvbnN0IGMxID0gdGhpcy50aWxlcy5maW5kKHQxKTtcbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDEpKSB7XG4gICAgICAvLyAxIC0+IDAgKHdlc3Qvbm9ydGgpLiAgSWYgMSBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBwMTAgPSBUaWxlUGFpci5vZihjMSwgYzApO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAxMCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAxMCkgfCAoMSA8PCBkaXIpKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQwKSkge1xuICAgICAgLy8gMCAtPiAxIChlYXN0L3NvdXRoKS4gIElmIDAgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3Qgb3BwID0gZGlyIF4gMjtcbiAgICAgIGNvbnN0IHAwMSA9IFRpbGVQYWlyLm9mKGMwLCBjMSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDAxLCB0aGlzLm5laWdoYm9ycy5nZXQocDAxKSB8ICgxIDw8IG9wcCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGNvbnN0IHdhbGxzID0gbmV3IE1hcDxTY3JlZW5JZCwgV2FsbFR5cGU+KCk7XG4gICAgY29uc3Qgc2hvb3RpbmdTdGF0dWVzID0gbmV3IFNldDxTY3JlZW5JZD4oKTtcbiAgICBjb25zdCBpblRvd2VyID0gKGxvY2F0aW9uLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIFdhbGxzIG5lZWQgdG8gY29tZSBmaXJzdCBzbyB3ZSBjYW4gYXZvaWQgYWRkaW5nIHNlcGFyYXRlXG4gICAgICAvLyByZXF1aXJlbWVudHMgZm9yIGV2ZXJ5IHNpbmdsZSB3YWxsIC0ganVzdCB1c2UgdGhlIHR5cGUuXG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgd2FsbHMuc2V0KFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSwgKHNwYXduLmlkICYgMykgYXMgV2FsbFR5cGUpO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgIHNob290aW5nU3RhdHVlcy5hZGQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldHNbbG9jYXRpb24udGlsZXNldF07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdO1xuXG4gICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpID0+IHtcbiAgICAgIGNvbnN0IHMgPSBsb2NhdGlvbi5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgIHJldHVybiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc10udGlsZXNbdGlsZSAmIDB4ZmZdXTtcbiAgICB9O1xuXG4gICAgLy8gUmV0dXJucyB1bmRlZmluZWQgaWYgaW1wYXNzYWJsZS5cbiAgICBjb25zdCBtYWtlVGVycmFpbiA9IChlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCwgYmFycmllcjogYm9vbGVhbikgPT4ge1xuICAgICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgICBlZmZlY3RzICY9IFRlcnJhaW4uQklUUztcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHgxYSkgZWZmZWN0cyB8PSBUZXJyYWluLlNXQU1QO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDYwIHx8IGxvY2F0aW9uLmlkID09PSAweDY4KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgLy8gTk9URTogb25seSB0aGUgdG9wIGhhbGYtc2NyZWVuIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgaXMgZG9scGhpbmFibGVcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHgxMDMwKSkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIGlmIChiYXJyaWVyKSBlZmZlY3RzIHw9IFRlcnJhaW4uQkFSUklFUjtcbiAgICAgIGlmICghKGVmZmVjdHMgJiBUZXJyYWluLkRPTFBISU4pICYmIGVmZmVjdHMgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgICAgLy8gMC01IGlzIGRvYWJsZSB3aXRoIG5vIGJvb3RzXG4gICAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgICBsZXQgYm90dG9tID0gdGlsZTtcbiAgICAgICAgbGV0IGhlaWdodCA9IDA7XG4gICAgICAgIHdoaWxlIChnZXRFZmZlY3RzKGJvdHRvbSkgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICAgIGhlaWdodCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgICAgZWZmZWN0cyAmPSB+VGVycmFpbi5TTE9QRTtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFODtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCAxMCkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChlZmZlY3RzICYgVGVycmFpbi5QQUlOKSB7XG4gICAgICAgIC8vIFBhaW4gdGVycmFpbnMgYXJlIG9ubHkgaW1wYXNzaWJsZSBpZiB0aGV5J3JlIGFsbCBzdXJyb3VuZGVkXG4gICAgICAgIC8vIGJ5IG90aGVyIHBhaW4gdGVycmFpbnMuXG4gICAgICAgIHR5cGUgRGVsdGEgPSBbbnVtYmVyLCBudW1iZXJdW107XG4gICAgICAgIGZvciAoY29uc3QgZGVsdGEgb2YgW1swLCAxXSwgWzEsIDBdLCBbMCwgLTFdLCBbLTEsIDBdXSBhcyBEZWx0YSkge1xuICAgICAgICAgIGlmICghKGdldEVmZmVjdHMoVGlsZUlkLmFkZCh0aWxlLCAuLi5kZWx0YSkpICZcbiAgICAgICAgICAgICAgICAoVGVycmFpbi5QQUlOIHwgVGVycmFpbi5GTFkpKSkge1xuICAgICAgICAgICAgZWZmZWN0cyAmPSB+VGVycmFpbi5QQUlOO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKGVmZmVjdHMpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB5ID0gMCwgaGVpZ2h0ID0gbG9jYXRpb24uaGVpZ2h0OyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxvY2F0aW9uLnNjcmVlbnNbeV07XG4gICAgICBjb25zdCByb3dJZCA9IGxvY2F0aW9uLmlkIDw8IDggfCB5IDw8IDQ7XG4gICAgICBmb3IgKGxldCB4ID0gMCwgd2lkdGggPSBsb2NhdGlvbi53aWR0aDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF1dO1xuICAgICAgICBjb25zdCBzY3JlZW5JZCA9IFNjcmVlbklkKHJvd0lkIHwgeCk7XG4gICAgICAgIGNvbnN0IGJhcnJpZXIgPSBzaG9vdGluZ1N0YXR1ZXMuaGFzKHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZ1l4ID0gc2NyZWVuSWQgJiAweGZmO1xuICAgICAgICBjb25zdCB3YWxsID0gd2FsbHMuZ2V0KHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZyA9XG4gICAgICAgICAgICBpblRvd2VyID8gdGhpcy5yb20uZmxhZ3MuQWx3YXlzVHJ1ZS5pZCA6XG4gICAgICAgICAgICB3YWxsICE9IG51bGwgPyB0aGlzLndhbGxDYXBhYmlsaXR5KHdhbGwpIDpcbiAgICAgICAgICAgIGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gZmxhZ1l4KT8uZmxhZztcbiAgICAgICAgY29uc3QgcGl0ID0gbG9jYXRpb24ucGl0cy5maW5kKHAgPT4gcC5mcm9tU2NyZWVuID09PSBzY3JlZW5JZCk7XG4gICAgICAgIGlmIChwaXQpIHtcbiAgICAgICAgICB0aGlzLmV4aXRzLnNldChUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IDB4ODgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIFRpbGVJZChwaXQudG9TY3JlZW4gPDwgOCB8IDB4ODgpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsb2dpYzogTG9naWMgPSB0aGlzLnJvbS5mbGFnc1tmbGFnIV0/LmxvZ2ljID8/IHt9O1xuICAgICAgICBmb3IgKGxldCB0ID0gMDsgdCA8IDB4ZjA7IHQrKykge1xuICAgICAgICAgIGNvbnN0IHRpZCA9IFRpbGVJZChzY3JlZW5JZCA8PCA4IHwgdCk7XG4gICAgICAgICAgbGV0IHRpbGUgPSBzY3JlZW4udGlsZXNbdF07XG4gICAgICAgICAgLy8gZmxhZyAyZWYgaXMgXCJhbHdheXMgb25cIiwgZG9uJ3QgZXZlbiBib3RoZXIgbWFraW5nIGl0IGNvbmRpdGlvbmFsLlxuICAgICAgICAgIGlmIChsb2dpYy5hc3N1bWVUcnVlICYmIHRpbGUgPCAweDIwKSB7XG4gICAgICAgICAgICB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBlZmZlY3RzID0gbG9jYXRpb24uaXNTaG9wKCkgPyAwIDogdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXTtcbiAgICAgICAgICBsZXQgdGVycmFpbiA9IG1ha2VUZXJyYWluKGVmZmVjdHMsIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgLy9pZiAoIXRlcnJhaW4pIHRocm93IG5ldyBFcnJvcihgYmFkIHRlcnJhaW4gZm9yIGFsdGVybmF0ZWApO1xuICAgICAgICAgIGlmICh0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT09IHRpbGUgJiZcbiAgICAgICAgICAgICAgZmxhZyAhPSBudWxsICYmICFsb2dpYy5hc3N1bWVUcnVlICYmICFsb2dpYy5hc3N1bWVGYWxzZSkge1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRlID1cbiAgICAgICAgICAgICAgICBtYWtlVGVycmFpbih0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aWQsIGJhcnJpZXIpO1xuICAgICAgICAgICAgLy9pZiAoIWFsdGVybmF0ZSkgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgICBpZiAoYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgIC8vIE5PVEU6IHRoZXJlJ3MgYW4gb2RkaXR5IGZyb20gaG9sbG93aW5nIG91dCB0aGUgYmFja3Mgb2YgaXJvblxuICAgICAgICAgICAgICAvLyB3YWxscyB0aGF0IG9uZSBjb3JuZXIgb2Ygc3RvbmUgd2FsbHMgYXJlIGFsc28gaG9sbG93ZWQgb3V0LFxuICAgICAgICAgICAgICAvLyBidXQgb25seSBwcmUtZmxhZy4gIEl0IGRvZXNuJ3QgYWN0dWFsbHkgaHVydCBhbnl0aGluZy5cbiAgICAgICAgICAgICAgdGVycmFpbiA9XG4gICAgICAgICAgICAgICAgICB0aGlzLnRlcnJhaW5GYWN0b3J5LmZsYWcodGVycmFpbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dpYy50cmFjayA/IGZsYWcgOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGVycmFpbikgdGhpcy50ZXJyYWlucy5zZXQodGlkLCB0ZXJyYWluKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENsb2JiZXIgdGVycmFpbiB3aXRoIHNlYW1sZXNzIGV4aXRzXG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBjb25zdCB7ZGVzdCwgZW50cmFuY2V9ID0gZXhpdDtcbiAgICAgIGNvbnN0IGZyb20gPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgZXhpdCk7XG4gICAgICAvLyBTZWFtbGVzcyBleGl0cyAoMHgyMCkgaWdub3JlIHRoZSBlbnRyYW5jZSBpbmRleCwgYW5kXG4gICAgICAvLyBpbnN0ZWFkIHByZXNlcnZlIHRoZSBUaWxlSWQsIGp1c3QgY2hhbmdpbmcgdGhlIGxvY2F0aW9uLlxuICAgICAgbGV0IHRvOiBUaWxlSWQ7XG4gICAgICBpZiAoZXhpdC5pc1NlYW1sZXNzKCkpIHtcbiAgICAgICAgdG8gPSBUaWxlSWQoZnJvbSAmIDB4ZmZmZiB8IChkZXN0IDw8IDE2KSk7XG4gICAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgZXhpdCk7XG4gICAgICAgIHRoaXMuc2VhbWxlc3NFeGl0cy5hZGQodGlsZSk7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gdGhpcy50ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICAgIHRoaXMudGVycmFpbnMuc2V0KHRpbGUsIHRoaXMudGVycmFpbkZhY3Rvcnkuc2VhbWxlc3MocHJldmlvdXMpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG8gPSB0aGlzLmVudHJhbmNlKHRoaXMucm9tLmxvY2F0aW9uc1tkZXN0XSwgZW50cmFuY2UgJiAweDFmKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXhpdHMuc2V0KGZyb20sIHRvKTtcbiAgICAgIGlmIChkZXN0ID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuTGltZVRyZWVMYWtlLmlkICYmXG4gICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkxpbWVUcmVlTGFrZS5lbnRyYW5jZXNbZW50cmFuY2VdLnkgPiAweGEwKSB7XG4gICAgICAgIC8vIE5vcnRoIGV4aXQgdG8gbGltZSB0cmVlIGxha2U6IG1hcmsgbG9jYXRpb24uXG4gICAgICAgIHRoaXMubGltZVRyZWVFbnRyYW5jZUxvY2F0aW9uID0gbG9jYXRpb24uaWQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uU3Bhd25zKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzVHJpZ2dlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc05wYygpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc05wYyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NCb3NzKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQ2hlc3QoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NDaGVzdChsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NNb25zdGVyKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLnR5cGUgPT09IDMgJiYgc3Bhd24uaWQgPT09IDB4ZTApIHtcbiAgICAgICAgLy8gd2luZG1pbGwgYmxhZGVzXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShcbiAgICAgICAgICAgIEhpdGJveC5zY3JlZW4oVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSksXG4gICAgICAgICAgICB0aGlzLnJvbS5mbGFncy5Vc2VkV2luZG1pbGxLZXkucik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc1RyaWdnZXIobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBGb3IgdHJpZ2dlcnMsIHdoaWNoIHRpbGVzIGRvIHdlIG1hcms/XG4gICAgLy8gVGhlIHRyaWdnZXIgaGl0Ym94IGlzIDIgdGlsZXMgd2lkZSBhbmQgMSB0aWxlIHRhbGwsIGJ1dCBpdCBkb2VzIG5vdFxuICAgIC8vIGxpbmUgdXAgbmljZWx5IHRvIHRoZSB0aWxlIGdyaWQuICBBbHNvLCB0aGUgcGxheWVyIGhpdGJveCBpcyBvbmx5XG4gICAgLy8gJGMgd2lkZSAodGhvdWdoIGl0J3MgJDE0IHRhbGwpIHNvIHRoZXJlJ3Mgc29tZSBzbGlnaHQgZGlzcGFyaXR5LlxuICAgIC8vIEl0IHNlZW1zIGxpa2UgcHJvYmFibHkgbWFya2luZyBpdCBhcyAoeC0xLCB5LTEpIC4uICh4LCB5KSBtYWtlcyB0aGVcbiAgICAvLyBtb3N0IHNlbnNlLCB3aXRoIHRoZSBjYXZlYXQgdGhhdCB0cmlnZ2VycyBzaGlmdGVkIHJpZ2h0IGJ5IGEgaGFsZlxuICAgIC8vIHRpbGUgc2hvdWxkIGdvIGZyb20geCAuLiB4KzEgaW5zdGVhZC5cblxuICAgIC8vIFRPRE8gLSBjb25zaWRlciBjaGVja2luZyB0cmlnZ2VyJ3MgYWN0aW9uOiAkMTkgLT4gcHVzaC1kb3duIG1lc3NhZ2VcblxuICAgIC8vIFRPRE8gLSBwdWxsIG91dCB0aGlzLnJlY29yZFRyaWdnZXJUZXJyYWluKCkgYW5kIHRoaXMucmVjb3JkVHJpZ2dlckNoZWNrKClcbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5yb20udHJpZ2dlcihzcGF3bi5pZCk7XG4gICAgaWYgKCF0cmlnZ2VyKSB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgdHJpZ2dlciAke3NwYXduLmlkLnRvU3RyaW5nKDE2KX1gKTtcblxuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG4gICAgbGV0IGFudGlSZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHModHJpZ2dlci5jb25kaXRpb25zKTtcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuICAgIGxldCBoaXRib3ggPSBIaXRib3gudHJpZ2dlcihsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgY29uc3QgY2hlY2tzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIHRyaWdnZXIuZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnRzLCBjaGVja3MpO1xuXG4gICAgc3dpdGNoICh0cmlnZ2VyLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MTk6XG4gICAgICAgIC8vIHB1c2gtZG93biB0cmlnZ2VyXG4gICAgICAgIGlmICh0cmlnZ2VyLmlkID09PSAweDg2ICYmICF0aGlzLmZsYWdzZXQuYXNzdW1lUmFiYml0U2tpcCgpKSB7XG4gICAgICAgICAgLy8gYmlnZ2VyIGhpdGJveCB0byBub3QgZmluZCB0aGUgcGF0aCB0aHJvdWdoXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAtMV0sIFswLCAxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHJpZ2dlci5pZCA9PT0gMHhiYSAmJlxuICAgICAgICAgICAgICAgICAgICF0aGlzLmZsYWdzZXQuYXNzdW1lVGVsZXBvcnRTa2lwKCkgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmRpc2FibGVUZWxlcG9ydFNraXAoKSkge1xuICAgICAgICAgIC8vIGNvcHkgdGhlIHRlbGVwb3J0IGhpdGJveCBpbnRvIHRoZSBvdGhlciBzaWRlIG9mIGNvcmRlbFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hdExvY2F0aW9uKGhpdGJveCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5FYXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbldlc3QpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lVHJpZ2dlckdsaXRjaCgpKSB7XG4gICAgICAgICAgLy8gYWxsIHB1c2gtZG93biB0cmlnZ2VycyBjYW4gYmUgc2tpcHBlZCB3aXRoIHRyaWdnZXIgc2tpcC4uLlxuICAgICAgICAgIGFudGlSZXF1aXJlbWVudHMgPSBSZXF1aXJlbWVudC5vcihhbnRpUmVxdWlyZW1lbnRzLCB0aGlzLnJvbS5mbGFncy5UcmlnZ2VyU2tpcC5yKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxdWlyZW1lbnRzKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWQ6XG4gICAgICAgIC8vIHN0YXJ0IG1hZG8gMSBib3NzIGZpZ2h0XG4gICAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLk1hZG8xLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciB0cmlnZ2VyIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcXVpcmVtZW50cywgdHJpZ2dlci5pZCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTg6IHsgLy8gc3RvbSBmaWdodFxuICAgICAgICAvLyBTcGVjaWFsIGNhc2U6IHdhcnAgYm9vdHMgZ2xpdGNoIHJlcXVpcmVkIGlmIGNoYXJnZSBzaG90cyBvbmx5LlxuICAgICAgICBjb25zdCByZXEgPVxuICAgICAgICAgIHRoaXMuZmxhZ3NldC5jaGFyZ2VTaG90c09ubHkoKSA/XG4gICAgICAgICAgUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIGFuZCh0aGlzLnJvbS5mbGFncy5XYXJwQm9vdHMpKSA6XG4gICAgICAgICAgcmVxdWlyZW1lbnRzO1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgdGhpcy5yb20uZmxhZ3MuU3RvbUZpZ2h0UmV3YXJkLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSAweDFlOlxuICAgICAgICAvLyBmb3JnZSBjcnlzdGFsaXNcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLk1lc2lhSW5Ub3dlci5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZjpcbiAgICAgICAgdGhpcy5oYW5kbGVCb2F0KHRpbGUsIGxvY2F0aW9uLCByZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBNb3ZpbmcgZ3VhcmRcbiAgICAgICAgLy8gdHJlYXQgdGhpcyBhcyBhIHN0YXR1ZT8gIGJ1dCB0aGUgY29uZGl0aW9ucyBhcmUgbm90IHN1cGVyIHVzZWZ1bC4uLlxuICAgICAgICAvLyAgIC0gb25seSB0cmFja2VkIGNvbmRpdGlvbnMgbWF0dGVyPyA5ZSA9PSBwYXJhbHlzaXMuLi4gZXhjZXB0IG5vdC5cbiAgICAgICAgLy8gcGFyYWx5emFibGU/ICBjaGVjayBEYXRhVGFibGVfMzUwNDVcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuUG9ydG9hX1BhbGFjZUVudHJhbmNlKSB7XG4gICAgICAgICAgLy8gUG9ydG9hIHBhbGFjZSBmcm9udCBndWFyZCBub3JtYWxseSBibG9ja3Mgb24gTWVzaWEgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEJ1dCB0aGUgcXVlZW4gaXMgYWN0dWFsbHkgYWNjZXNzaWJsZSB3aXRob3V0IHNlZWluZyB0aGUgcmVjb3JkaW5nLlxuICAgICAgICAgIC8vIEluc3RlYWQsIGJsb2NrIGFjY2VzcyB0byB0aGUgdGhyb25lIHJvb20gb24gYmVpbmcgYWJsZSB0byB0YWxrIHRvXG4gICAgICAgICAgLy8gdGhlIGZvcnR1bmUgdGVsbGVyLCBpbiBjYXNlIHRoZSBndWFyZCBtb3ZlcyBiZWZvcmUgd2UgY2FuIGdldCB0aGVcbiAgICAgICAgICAvLyBpdGVtLiAgQWxzbyBtb3ZlIHRoZSBoaXRib3ggdXAgc2luY2UgdGhlIHR3byBzaWRlIHJvb21zIF9hcmVfIHN0aWxsXG4gICAgICAgICAgLy8gYWNjZXNzaWJsZS5cbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWy0yLCAwXSk7XG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMucm9tLmZsYWdzLlRhbGtlZFRvRm9ydHVuZVRlbGxlci5yO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94LCBsb2NhdGlvbiwgYW50aVJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTnBjKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgY29uc3QgbnBjID0gdGhpcy5yb20ubnBjc1tzcGF3bi5pZF07XG4gICAgaWYgKCFucGMgfHwgIW5wYy51c2VkKSB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbnBjOiAke2hleChzcGF3bi5pZCl9YCk7XG4gICAgY29uc3Qgc3Bhd25Db25kaXRpb25zID0gbnBjLnNwYXduQ29uZGl0aW9ucy5nZXQobG9jYXRpb24uaWQpIHx8IFtdO1xuICAgIGNvbnN0IHJlcSA9IHRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7IC8vIHNob3VsZCBiZSBzaW5nbGVcblxuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuXG4gICAgLy8gTk9URTogUmFnZSBoYXMgbm8gd2Fsa2FibGUgbmVpZ2hib3JzLCBhbmQgd2UgbmVlZCB0aGUgc2FtZSBoaXRib3hcbiAgICAvLyBmb3IgYm90aCB0aGUgdGVycmFpbiBhbmQgdGhlIGNoZWNrLlxuICAgIC8vXG4gICAgLy8gTk9URSBBTFNPIC0gUmFnZSBwcm9iYWJseSBzaG93cyB1cCBhcyBhIGJvc3MsIG5vdCBhbiBOUEM/XG4gICAgbGV0IGhpdGJveDogSGl0Ym94ID1cbiAgICAgICAgW3RoaXMudGVycmFpbnMuaGFzKHRpbGUpID8gdGlsZSA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKSA/PyB0aWxlXTtcblxuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQoc3Bhd24udHlwZSA8PCA4IHwgc3Bhd24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKGhpdGJveCwgcmVxLCBpdGVtLCB1c2UpO1xuICAgIH1cblxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU2FiZXJhRGlzZ3Vpc2VkQXNNZXNpYSkge1xuICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuU2FiZXJhMSwgcmVxKTtcbiAgICB9XG5cbiAgICBpZiAoKG5wYy5kYXRhWzJdICYgMHgwNCkgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkge1xuICAgICAgbGV0IGFudGlSZXE7XG4gICAgICBhbnRpUmVxID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9ucyk7XG4gICAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlJhZ2UpIHtcbiAgICAgICAgLy8gVE9ETyAtIG1vdmUgaGl0Ym94IGRvd24sIGNoYW5nZSByZXF1aXJlbWVudD9cbiAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFsyLCAtMV0sIFsyLCAwXSwgWzIsIDFdLCBbMiwgMl0pO1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC02XSwgWzAsIC0yXSwgWzAsIDJdLCBbMCwgNl0pO1xuICAgICAgICAvLyBUT0RPIC0gY2hlY2sgaWYgdGhpcyB3b3Jrcz8gIHRoZSB+Y2hlY2sgc3Bhd24gY29uZGl0aW9uIHNob3VsZFxuICAgICAgICAvLyBhbGxvdyBwYXNzaW5nIGlmIGdvdHRlbiB0aGUgY2hlY2ssIHdoaWNoIGlzIHRoZSBzYW1lIGFzIGdvdHRlblxuICAgICAgICAvLyB0aGUgY29ycmVjdCBzd29yZC5cbiAgICAgICAgLy8gVE9ETyAtIGlzIHRoaXMgZXZlbiByZXF1aXJlZCBvbmNlIHdlIGhhdmUgdGhlIFJhZ2VUZXJyYWluPz8/XG4gICAgICAgIC8vIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lUmFnZVNraXAoKSkgYW50aVJlcSA9IHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlBvcnRvYVRocm9uZVJvb21CYWNrRG9vckd1YXJkKSB7XG4gICAgICAgIC8vIFBvcnRvYSBiYWNrIGRvb3IgZ3VhcmQgc3Bhd25zIGlmICgxKSB0aGUgbWVzaWEgcmVjb3JkaW5nIGhhcyBub3QgeWV0XG4gICAgICAgIC8vIGJlZW4gcGxheWVkLCBhbmQgKDIpIHRoZSBwbGF5ZXIgZGlkbid0IHNuZWFrIHBhc3QgdGhlIGVhcmxpZXIgZ3VhcmQuXG4gICAgICAgIC8vIFdlIGNhbiBzaW11bGF0ZSB0aGlzIGJ5IGhhcmQtY29kaW5nIGEgcmVxdWlyZW1lbnQgb24gZWl0aGVyIHRvIGdldFxuICAgICAgICAvLyBwYXN0IGhpbS5cbiAgICAgICAgYW50aVJlcSA9IG9yKHRoaXMucm9tLmZsYWdzLk1lc2lhUmVjb3JkaW5nLCB0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMpO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU29sZGllckd1YXJkKSB7XG4gICAgICAgIGFudGlSZXEgPSB1bmRlZmluZWQ7IC8vIHRoZXknbGwganVzdCBhdHRhY2sgaWYgYXBwcm9hY2hlZC5cbiAgICAgIH1cbiAgICAgIC8vIGlmIHNwYXduIGlzIGFsd2F5cyBmYWxzZSB0aGVuIHJlcSBuZWVkcyB0byBiZSBvcGVuP1xuICAgICAgaWYgKGFudGlSZXEpIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXEpKTtcbiAgICB9XG5cbiAgICAvLyBGb3J0dW5lIHRlbGxlciBjYW4gYmUgdGFsa2VkIHRvIGFjcm9zcyB0aGUgZGVzay5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLkZvcnR1bmVUZWxsZXIpIHtcbiAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgMF0sIFsyLCAwXSk7XG4gICAgfVxuXG4gICAgLy8gcmVxIGlzIG5vdyBtdXRhYmxlXG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcSkpIHJldHVybjsgLy8gbm90aGluZyB0byBkbyBpZiBpdCBuZXZlciBzcGF3bnMuXG4gICAgY29uc3QgW1suLi5jb25kc11dID0gcmVxO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBnbG9iYWwgZGlhbG9ncyAtIGRvIG5vdGhpbmcgaWYgd2UgY2FuJ3QgcGFzcyB0aGVtLlxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmZsYWcoZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlIHx8IGZjPy5sb2dpYy5hc3N1bWVUcnVlKSByZXR1cm47XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgYXBwcm9wcmlhdGUgbG9jYWwgZGlhbG9nc1xuICAgIGNvbnN0IGxvY2FscyA9XG4gICAgICAgIG5wYy5sb2NhbERpYWxvZ3MuZ2V0KGxvY2F0aW9uLmlkKSA/PyBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgPz8gW107XG4gICAgZm9yIChjb25zdCBkIG9mIGxvY2Fscykge1xuICAgICAgLy8gQ29tcHV0ZSB0aGUgY29uZGl0aW9uICdyJyBmb3IgdGhpcyBtZXNzYWdlLlxuICAgICAgY29uc3QgciA9IFsuLi5jb25kc107XG4gICAgICBjb25zdCBmMCA9IHRoaXMuZmxhZyhkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBmMSA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYwPy5sb2dpYy50cmFjaykgci5wdXNoKGYwLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICBpZiAoIWYwPy5sb2dpYy5hc3N1bWVGYWxzZSAmJiAhZjE/LmxvZ2ljLmFzc3VtZVRydWUpIHtcbiAgICAgICAgLy8gT25seSBwcm9jZXNzIHRoaXMgZGlhbG9nIGlmIGl0J3MgcG9zc2libGUgdG8gcGFzcyB0aGUgY29uZGl0aW9uLlxuICAgICAgICB0aGlzLnByb2Nlc3NEaWFsb2coaGl0Ym94LCBucGMsIHIsIGQpO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgd2UgY2FuIG5ldmVyIGFjdHVhbGx5IGdldCBwYXN0IHRoaXMgZGlhbG9nLlxuICAgICAgaWYgKGYwPy5sb2dpYy5hc3N1bWVUcnVlIHx8IGYxPy5sb2dpYy5hc3N1bWVGYWxzZSkgYnJlYWs7XG4gICAgICAvLyBBZGQgYW55IG5ldyBjb25kaXRpb25zIHRvICdjb25kcycgdG8gZ2V0IGJleW9uZCB0aGlzIG1lc3NhZ2UuXG4gICAgICBpZiAoZjE/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNvbmRzLnB1c2goZjEuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzRGlhbG9nKGhpdGJveDogSGl0Ym94LCBucGM6IE5wYyxcbiAgICAgICAgICAgICAgICByZXE6IHJlYWRvbmx5IENvbmRpdGlvbltdLCBkaWFsb2c6IExvY2FsRGlhbG9nKSB7XG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIFtyZXFdLCBkaWFsb2cuZmxhZ3MpO1xuXG4gICAgY29uc3QgaW5mbyA9IHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfTtcbiAgICBzd2l0Y2ggKGRpYWxvZy5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDA4OiAvLyBvcGVuIHN3YW4gZ2F0ZVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCBbcmVxXSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGM6IC8vIGR3YXJmIGNoaWxkIHN0YXJ0cyBmb2xsb3dpbmdcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwZDogLy8gbnBjIHdhbGtzIGF3YXlcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxNDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuU2xpbWVkS2Vuc3UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDEwOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFzaW5hSW5CYWNrUm9vbS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTE6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMV0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDAzOlxuICAgICAgY2FzZSAweDBhOiAvLyBub3JtYWxseSB0aGlzIGhhcmQtY29kZXMgZ2xvd2luZyBsYW1wLCBidXQgd2UgZXh0ZW5kZWQgaXRcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVswXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDk6XG4gICAgICAgIC8vIElmIHplYnUgc3R1ZGVudCBoYXMgYW4gaXRlbS4uLj8gIFRPRE8gLSBzdG9yZSBmZiBpZiB1bnVzZWRcbiAgICAgICAgY29uc3QgaXRlbSA9IG5wYy5kYXRhWzFdO1xuICAgICAgICBpZiAoaXRlbSAhPT0gMHhmZikgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBpdGVtLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Ba2FoYW5hRmx1dGVPZkxpbWVUcmFkZWluLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYTpcbiAgICAgICAgLy8gVE9ETyAtIGNhbiB3ZSByZWFjaCB0aGlzIHNwb3Q/ICBtYXkgbmVlZCB0byBtb3ZlIGRvd24/XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlJhZ2UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBSYWdlIHRocm93aW5nIHBsYXllciBvdXQuLi5cbiAgICAgICAgLy8gVGhpcyBzaG91bGQgYWN0dWFsbHkgYWxyZWFkeSBiZSBoYW5kbGVkIGJ5IHRoZSBzdGF0dWUgY29kZSBhYm92ZT9cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFkZCBleHRyYSBkaWFsb2dzIGZvciBpdGVtdXNlIHRyYWRlcywgZXh0cmEgdHJpZ2dlcnNcbiAgICAvLyAgICAgIC0gaWYgaXRlbSB0cmFkZWQgYnV0IG5vIHJld2FyZCwgdGhlbiByZS1naXZlIHJld2FyZC4uLlxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldCh+bG9jYXRpb24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFt0aGlzLmVudHJhbmNlKGxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlcXVpcmVtZW50Lk9QRU4sIGl0ZW0sIHVzZSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94OiBIaXRib3gsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIFRoaXMgaXMgdGhlIDFiIHRyaWdnZXIgYWN0aW9uIGZvbGxvdy11cC4gIEl0IGxvb2tzIGZvciBhbiBOUEMgaW4gMGQgb3IgMGVcbiAgICAvLyBhbmQgbW92ZXMgdGhlbSBvdmVyIGEgcGl4ZWwuICBGb3IgdGhlIGxvZ2ljLCBpdCdzIGFsd2F5cyBpbiBhIHBvc2l0aW9uXG4gICAgLy8gd2hlcmUganVzdCBtYWtpbmcgdGhlIHRyaWdnZXIgc3F1YXJlIGJlIGEgbm8tZXhpdCBzcXVhcmUgaXMgc3VmZmljaWVudCxcbiAgICAvLyBidXQgd2UgbmVlZCB0byBnZXQgdGhlIGNvbmRpdGlvbnMgcmlnaHQuICBXZSBwYXNzIGluIHRoZSByZXF1aXJlbWVudHMgdG9cbiAgICAvLyBOT1QgdHJpZ2dlciB0aGUgdHJpZ2dlciwgYW5kIHRoZW4gd2Ugam9pbiBpbiBwYXJhbHlzaXMgYW5kL29yIHN0YXR1ZVxuICAgIC8vIGdsaXRjaCBpZiBhcHByb3ByaWF0ZS4gIFRoZXJlIGNvdWxkIHRoZW9yZXRpY2FsbHkgYmUgY2FzZXMgd2hlcmUgdGhlXG4gICAgLy8gZ3VhcmQgaXMgcGFyYWx5emFibGUgYnV0IHRoZSBnZW9tZXRyeSBwcmV2ZW50cyB0aGUgcGxheWVyIGZyb20gYWN0dWFsbHlcbiAgICAvLyBoaXR0aW5nIHRoZW0gYmVmb3JlIHRoZXkgbW92ZSwgYnV0IGl0IGRvZXNuJ3QgaGFwcGVuIGluIHByYWN0aWNlLlxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHJldHVybjtcbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW11bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zLnNsaWNlKDAsIDIpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNOcGMoKSAmJiB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXS5pc1BhcmFseXphYmxlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChbdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzLmNdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lVHJpZ2dlckdsaXRjaCgpKSB7XG4gICAgICBleHRyYS5wdXNoKFt0aGlzLnJvbS5mbGFncy5UcmlnZ2VyU2tpcC5jXSk7XG4gICAgfVxuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKFsuLi5yZXEsIC4uLmV4dHJhXS5tYXAoc3ByZWFkKSkpO1xuXG5cbiAgICAvLyBUT0RPIC0gUG9ydG9hIGd1YXJkcyBhcmUgYnJva2VuIDotKFxuICAgIC8vIFRoZSBiYWNrIGd1YXJkIG5lZWRzIHRvIGJsb2NrIG9uIHRoZSBmcm9udCBndWFyZCdzIGNvbmRpdGlvbnMsXG4gICAgLy8gd2hpbGUgdGhlIGZyb250IGd1YXJkIHNob3VsZCBibG9jayBvbiBmb3J0dW5lIHRlbGxlcj9cblxuICB9XG5cbiAgaGFuZGxlQm9hdCh0aWxlOiBUaWxlSWQsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIGJvYXJkIGJvYXQgLSB0aGlzIGFtb3VudHMgdG8gYWRkaW5nIGEgcm91dGUgZWRnZSBmcm9tIHRoZSB0aWxlXG4gICAgLy8gdG8gdGhlIGxlZnQsIHRocm91Z2ggYW4gZXhpdCwgYW5kIHRoZW4gY29udGludWluZyB1bnRpbCBmaW5kaW5nIGxhbmQuXG4gICAgY29uc3QgdDAgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodGlsZSk7XG4gICAgaWYgKHQwID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgd2Fsa2FibGUgbmVpZ2hib3IuYCk7XG4gICAgY29uc3QgeXQgPSAodGlsZSA+PiA4KSAmIDB4ZjAgfCAodGlsZSA+PiA0KSAmIDB4ZjtcbiAgICBjb25zdCB4dCA9ICh0aWxlID4+IDQpICYgMHhmMCB8IHRpbGUgJiAweGY7XG4gICAgbGV0IGJvYXRFeGl0O1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgaWYgKGV4aXQueXQgPT09IHl0ICYmIGV4aXQueHQgPCB4dCkgYm9hdEV4aXQgPSBleGl0O1xuICAgIH1cbiAgICBpZiAoIWJvYXRFeGl0KSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGJvYXQgZXhpdGApO1xuICAgIC8vIFRPRE8gLSBsb29rIHVwIHRoZSBlbnRyYW5jZS5cbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2JvYXRFeGl0LmRlc3RdO1xuICAgIGlmICghZGVzdCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZGVzdGluYXRpb25gKTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2JvYXRFeGl0LmVudHJhbmNlXTtcbiAgICBjb25zdCBlbnRyYW5jZVRpbGUgPSBUaWxlSWQuZnJvbShkZXN0LCBlbnRyYW5jZSk7XG4gICAgbGV0IHQgPSBlbnRyYW5jZVRpbGU7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHQgPSBUaWxlSWQuYWRkKHQsIDAsIC0xKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpO1xuICAgICAgaWYgKHQxICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgYm9hdDogVGVycmFpbiA9IHtcbiAgICAgICAgICBlbnRlcjogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50cyksXG4gICAgICAgICAgZXhpdDogW1sweGYsIFJlcXVpcmVtZW50Lk9QRU5dXSxcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWRkIGEgdGVycmFpbiBhbmQgZXhpdCBwYWlyIGZvciB0aGUgYm9hdCB0cmlnZ2VyLlxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oW3QwXSwgYm9hdCk7XG4gICAgICAgIHRoaXMuZXhpdHMuc2V0KHQwLCB0MSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5hZGQoVGlsZVBhaXIub2YodDAsIHQxKSk7XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGVudHJhbmNlIHdlIHBhc3NlZFxuICAgICAgICAvLyAodGhpcyBpcyBwcmltYXJpbHkgbmVjZXNzYXJ5IGZvciB3aWxkIHdhcnAgdG8gd29yayBpbiBsb2dpYykuXG4gICAgICAgIHRoaXMuZXhpdHMuc2V0KGVudHJhbmNlVGlsZSwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKGVudHJhbmNlVGlsZSwgdDEpKTtcbiAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQoZW50cmFuY2VUaWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoMCkhKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3g6IEhpdGJveCwgcmVxOiBSZXF1aXJlbWVudCwgZ3JhbnRJZDogbnVtYmVyKSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbUdyYW50KGdyYW50SWQpO1xuICAgIGNvbnN0IHNsb3QgPSAweDEwMCB8IGl0ZW07XG4gICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGl0ZW0gZ3JhbnQgZm9yICR7Z3JhbnRJZC50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIC8vIGlzIHRoZSAxMDAgZmxhZyBzdWZmaWNpZW50IGhlcmU/ICBwcm9iYWJseT9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IGdyYW50SWQgPj0gMHg4MDsgLy8gZ3JhbnRlZCBmcm9tIGEgdHJpZ2dlclxuICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCBzbG90LFxuICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlLCBwcmV2ZW50TG9zc30pO1xuICB9XG5cbiAgYWRkVGVycmFpbihoaXRib3g6IEhpdGJveCwgdGVycmFpbjogVGVycmFpbikge1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiBoaXRib3gpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgIGlmICh0ID09IG51bGwpIGNvbnRpbnVlOyAvLyB1bnJlYWNoYWJsZSB0aWxlcyBkb24ndCBuZWVkIGV4dHJhIHJlcXNcbiAgICAgIHRoaXMudGVycmFpbnMuc2V0KHRpbGUsIHRoaXMudGVycmFpbkZhY3RvcnkubWVldCh0LCB0ZXJyYWluKSk7XG4gICAgfVxuICB9XG5cbiAgYWRkQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCwgY2hlY2tzOiBudW1iZXJbXSkge1xuICAgIGlmIChSZXF1aXJlbWVudC5pc0Nsb3NlZChyZXF1aXJlbWVudCkpIHJldHVybjsgLy8gZG8gbm90aGluZyBpZiB1bnJlYWNoYWJsZVxuICAgIGNvbnN0IGNoZWNrID0ge3JlcXVpcmVtZW50OiBSZXF1aXJlbWVudC5mcmVlemUocmVxdWlyZW1lbnQpLCBjaGVja3N9O1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiBoaXRib3gpIHtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModGlsZSkpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5jaGVja3MuZ2V0KHRpbGUpLmFkZChjaGVjayk7XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUNoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsXG4gICAgICAgICAgICAgICBjaGVjazogbnVtYmVyLCBzbG90OiBTbG90SW5mbykge1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgW2NoZWNrXSk7XG4gICAgdGhpcy5zbG90cy5zZXQoY2hlY2ssIHNsb3QpO1xuICAgIC8vIGFsc28gYWRkIGNvcnJlc3BvbmRpbmcgSXRlbUluZm8gdG8ga2VlcCB0aGVtIGluIHBhcml0eS5cbiAgICBjb25zdCBpdGVtZ2V0ID0gdGhpcy5yb20uaXRlbUdldHNbdGhpcy5yb20uc2xvdHNbY2hlY2sgJiAweGZmXV07XG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgICBjb25zdCB1bmlxdWUgPSBpdGVtPy51bmlxdWU7XG4gICAgY29uc3QgbG9zYWJsZSA9IGl0ZW1nZXQuaXNMb3NhYmxlKCk7XG4gICAgLy8gVE9ETyAtIHJlZmFjdG9yIHRvIGp1c3QgXCJjYW4ndCBiZSBib3VnaHRcIj9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IHVuaXF1ZSB8fCBpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5PcGVsU3RhdHVlO1xuICAgIGxldCB3ZWlnaHQgPSAxO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2luZCkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZkZpcmUpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXYXRlcikgd2VpZ2h0ID0gMTA7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZUaHVuZGVyKSB3ZWlnaHQgPSAxNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuRmxpZ2h0KSB3ZWlnaHQgPSAxNTtcbiAgICB0aGlzLml0ZW1zLnNldCgweDIwMCB8IGl0ZW1nZXQuaWQsIHt1bmlxdWUsIGxvc2FibGUsIHByZXZlbnRMb3NzLCB3ZWlnaHR9KTtcbiAgfVxuXG4gIGFkZENoZWNrRnJvbUZsYWdzKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGZsYWdzOiBudW1iZXJbXSkge1xuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgY2hlY2tzKTtcbiAgfVxuXG4gIHdhbGthYmxlTmVpZ2hib3IodDogVGlsZUlkKTogVGlsZUlkfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0KSkgcmV0dXJuIHQ7XG4gICAgZm9yIChsZXQgZCBvZiBbLTEsIDFdKSB7XG4gICAgICBjb25zdCB0MSA9IFRpbGVJZC5hZGQodCwgZCwgMCk7XG4gICAgICBjb25zdCB0MiA9IFRpbGVJZC5hZGQodCwgMCwgZCk7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQxKSkgcmV0dXJuIHQxO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MikpIHJldHVybiB0MjtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlzV2Fsa2FibGUodDogVGlsZUlkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEodGhpcy5nZXRFZmZlY3RzKHQpICYgVGVycmFpbi5CSVRTKTtcbiAgfVxuXG4gIGVuc3VyZVBhc3NhYmxlKHQ6IFRpbGVJZCk6IFRpbGVJZCB7XG4gICAgcmV0dXJuIHRoaXMuaXNXYWxrYWJsZSh0KSA/IHQgOiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdDtcbiAgfVxuXG4gIGdldEVmZmVjdHModDogVGlsZUlkKTogbnVtYmVyIHtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1t0ID4+PiAxNl07XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCBlZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXS5lZmZlY3RzO1xuICAgIGNvbnN0IHNjciA9IGxvY2F0aW9uLnNjcmVlbnNbKHQgJiAweGYwMDApID4+PiAxMl1bKHQgJiAweGYwMCkgPj4+IDhdO1xuICAgIHJldHVybiBlZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl1dO1xuICB9XG5cbiAgcHJvY2Vzc0Jvc3MobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgIC8vIGFuZCB3aWxsIGFsc28gYWRkIHRoZWlyIGRyb3AuXG4gICAgaWYgKHNwYXduLmlkID09PSAweGM5IHx8IHNwYXduLmlkID09PSAweGNhKSByZXR1cm47IC8vIHN0YXR1ZXNcbiAgICBjb25zdCBpc1JhZ2UgPSBzcGF3bi5pZCA9PT0gMHhjMztcbiAgICBjb25zdCBib3NzID1cbiAgICAgICAgaXNSYWdlID8gdGhpcy5yb20uYm9zc2VzLlJhZ2UgOlxuICAgICAgICB0aGlzLnJvbS5ib3NzZXMuZnJvbUxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBpZiAoIWJvc3MgfHwgIWJvc3MuZmxhZykgdGhyb3cgbmV3IEVycm9yKGBCYWQgYm9zcyBhdCAke2xvY2F0aW9uLm5hbWV9YCk7XG4gICAgY29uc3Qgc2NyZWVuID0gdGlsZSAmIH4weGZmO1xuICAgIGNvbnN0IGJvc3NUZXJyYWluID0gdGhpcy50ZXJyYWluRmFjdG9yeS5ib3NzKGJvc3MuZmxhZy5pZCwgaXNSYWdlKTtcbiAgICBjb25zdCBoaXRib3ggPSBzZXEoMHhmMCwgKHQ6IG51bWJlcikgPT4gKHNjcmVlbiB8IHQpIGFzIFRpbGVJZCk7XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgYm9zc1RlcnJhaW4pO1xuICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgYm9zcyk7XG4gIH1cblxuICBhZGRCb3NzQ2hlY2soaGl0Ym94OiBIaXRib3gsIGJvc3M6IEJvc3MsXG4gICAgICAgICAgICAgICByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50ID0gUmVxdWlyZW1lbnQuT1BFTikge1xuICAgIGlmIChib3NzLmZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhIGZsYWc6ICR7Ym9zc31gKTtcbiAgICBjb25zdCByZXEgPSBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKGJvc3MpKTtcbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbYm9zcy5mbGFnLmlkXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgIGhpdGJveCwgcmVxLCBib3NzLmZsYWcuaWQsIHtsb3NzeTogZmFsc2UsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NDaGVzdChsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEFkZCBhIGNoZWNrIGZvciB0aGUgMXh4IGZsYWcuICBNYWtlIHN1cmUgaXQncyBub3QgYSBtaW1pYy5cbiAgICBpZiAodGhpcy5yb20uc2xvdHNbc3Bhd24uaWRdID49IDB4NzApIHJldHVybjtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBzcGF3bi5pZDtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF07XG4gICAgaWYgKG1hcHBlZCA+PSAweDcwKSByZXR1cm47IC8vIFRPRE8gLSBtaW1pYyUgbWF5IGNhcmVcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbbWFwcGVkXTtcbiAgICBjb25zdCB1bmlxdWUgPSB0aGlzLmZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSA/ICEhaXRlbT8udW5pcXVlIDogdHJ1ZTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sIFJlcXVpcmVtZW50Lk9QRU4sXG4gICAgICAgICAgICAgICAgICAgICAgc2xvdCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlfSk7XG4gIH1cblxuICBwcm9jZXNzTW9uc3Rlcihsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuXG4gICAgLy8gVE9ETyAtIGN1cnJlbnRseSBkb24ndCBoYW5kbGUgZmx5ZXJzIHdlbGwgLSBjb3VsZCBpbnN0ZWFkIGFkZCBmbHllcnNcbiAgICAvLyAgICAgICAgdG8gYWxsIGVudHJhbmNlcz9cblxuICAgIC8vIENoZWNrIG1vbnN0ZXIncyB2dWxuZXJhYmlsaXRpZXMgYW5kIGFkZCBhIGNoZWNrIGZvciBNb25leSBnaXZlbiBzd29yZHMuXG4gICAgY29uc3QgbW9uc3RlciA9IHRoaXMucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIHJldHVybjtcbiAgICBjb25zdCB7XG4gICAgICBNb25leSwgUmFnZVNraXAsXG4gICAgICBTd29yZCwgU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyLFxuICAgIH0gPSB0aGlzLnJvbS5mbGFncztcbiAgICBpZiAobG9jYXRpb24uaWQgPT09IHRoaXMubGltZVRyZWVFbnRyYW5jZUxvY2F0aW9uICYmIG1vbnN0ZXIuaXNGbHllciAmJlxuICAgICAgICB0aGlzLmZsYWdzZXQuYXNzdW1lUmFnZVNraXAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbdGhpcy5lbnRyYW5jZShsb2NhdGlvbildLCBSZXF1aXJlbWVudC5PUEVOLCBbUmFnZVNraXAuaWRdKTtcblxuICAgIH1cbiAgICBpZiAoIShtb25zdGVyLmdvbGREcm9wKSkgcmV0dXJuO1xuICAgIGNvbnN0IGhpdGJveCA9IFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXTtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBTd29yZC5yLCBbTW9uZXkuaWRdKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc3dvcmRzID1cbiAgICAgICAgW1N3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlcl1cbiAgICAgICAgICAgIC5maWx0ZXIoKF8sIGkpID0+IG1vbnN0ZXIuZWxlbWVudHMgJiAoMSA8PCBpKSk7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNvbGxlY3RpbmcgYWxsIHRoZSBlbGVtZW50cyBpbiBvbmUgcGxhY2UgZmlyc3RcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgb3IoLi4uc3dvcmRzKSwgW01vbmV5LmlkXSk7XG4gIH1cblxuICBwcm9jZXNzSXRlbVVzZShoaXRib3g6IEhpdGJveCwgcmVxMTogUmVxdWlyZW1lbnQsIGl0ZW06IEl0ZW0sIHVzZTogSXRlbVVzZSkge1xuICAgIC8vIHRoaXMgc2hvdWxkIGhhbmRsZSBtb3N0IHRyYWRlLWlucyBhdXRvbWF0aWNhbGx5XG4gICAgaGl0Ym94ID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdCkpO1xuICAgIGNvbnN0IHJlcTIgPSBbWygweDIwMCB8IGl0ZW0uaWQpIGFzIENvbmRpdGlvbl1dOyAvLyByZXF1aXJlcyB0aGUgaXRlbS5cbiAgICAvLyBjaGVjayBmb3Iga2lyaXNhIHBsYW50LCBhZGQgY2hhbmdlIGFzIGEgcmVxdWlyZW1lbnQuXG4gICAgaWYgKGl0ZW0uaWQgPT09IHRoaXMucm9tLnByZ1sweDNkNGI1XSArIDB4MWMpIHtcbiAgICAgIHJlcTJbMF0ucHVzaCh0aGlzLnJvbS5mbGFncy5DaGFuZ2UuYyk7XG4gICAgfVxuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5NZWRpY2FsSGVyYikgeyAvLyBkb2xwaGluXG4gICAgICByZXEyWzBdWzBdID0gdGhpcy5yb20uZmxhZ3MuQnV5SGVhbGluZy5jOyAvLyBub3RlOiBubyBvdGhlciBoZWFsaW5nIGl0ZW1zXG4gICAgfVxuICAgIGNvbnN0IHJlcSA9IFJlcXVpcmVtZW50Lm1lZXQocmVxMSwgcmVxMik7XG4gICAgLy8gc2V0IGFueSBmbGFnc1xuICAgIHRoaXMuYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94LCByZXEsIHVzZS5mbGFncyk7XG4gICAgLy8gaGFuZGxlIGFueSBleHRyYSBhY3Rpb25zXG4gICAgc3dpdGNoICh1c2UubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgLy8gdXNlIGtleVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCByZXEpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgwODogY2FzZSAweDBiOiBjYXNlIDB4MGM6IGNhc2UgMHgwZDogY2FzZSAweDBmOiBjYXNlIDB4MWM6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciBpdGVtIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcSwgaXRlbS5pZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDAyOlxuICAgICAgICAvLyBkb2xwaGluIGRlZmVycyB0byBkaWFsb2cgYWN0aW9uIDExIChhbmQgMGQgdG8gc3dpbSBhd2F5KVxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgMHgxMDAgfCB0aGlzLnJvbS5ucGNzW3VzZS53YW50ICYgMHhmZl0uZGF0YVsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0tleVVzZShoaXRib3g6IEhpdGJveCwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIHNldCB0aGUgY3VycmVudCBzY3JlZW4ncyBmbGFnIGlmIHRoZSBjb25kaXRpb25zIGFyZSBtZXQuLi5cbiAgICAvLyBtYWtlIHN1cmUgdGhlcmUncyBvbmx5IGEgc2luZ2xlIHNjcmVlbi5cbiAgICBjb25zdCBbc2NyZWVuLCAuLi5yZXN0XSA9IG5ldyBTZXQoWy4uLmhpdGJveF0ubWFwKHQgPT4gU2NyZWVuSWQuZnJvbSh0KSkpO1xuICAgIGlmIChzY3JlZW4gPT0gbnVsbCB8fCByZXN0Lmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBvbmUgc2NyZWVuYCk7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbc2NyZWVuID4+PiA4XTtcbiAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoc2NyZWVuICYgMHhmZikpO1xuICAgIGlmIChmbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgZmxhZyBvbiBzY3JlZW5gKTtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbZmxhZy5mbGFnXSk7XG4gIH1cblxuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IEJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLlJhZ2UpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgUmFnZS4gIEZpZ3VyZSBvdXQgd2hhdCBoZSB3YW50cyBmcm9tIHRoZSBkaWFsb2cuXG4gICAgICBjb25zdCB1bmtub3duU3dvcmQgPSB0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFnc2V0LnJhbmRvbWl6ZVRyYWRlcygpO1xuICAgICAgaWYgKHVua25vd25Td29yZCkgcmV0dXJuIHRoaXMucm9tLmZsYWdzLlN3b3JkLnI7IC8vIGFueSBzd29yZCBtaWdodCBkby5cbiAgICAgIHJldHVybiBbW3RoaXMucm9tLm5wY3MuUmFnZS5kaWFsb2coKVswXS5jb25kaXRpb24gYXMgQ29uZGl0aW9uXV07XG4gICAgfVxuICAgIGNvbnN0IGlkID0gYm9zcy5vYmplY3Q7XG4gICAgY29uc3QgciA9IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQuc2h1ZmZsZUJvc3NFbGVtZW50cygpIHx8XG4gICAgICAgICF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICByLmFkZEFsbCh0aGlzLnJvbS5mbGFncy5Td29yZC5yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbGV2ZWwgPSB0aGlzLmZsYWdzZXQuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIHIuYWRkQWxsKHRoaXMuc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBDYW4ndCBhY3R1YWxseSBraWxsIHRoZSBib3NzIGlmIGl0IGRvZXNuJ3Qgc3Bhd24uXG4gICAgY29uc3QgZXh0cmE6IENvbmRpdGlvbltdID0gW107XG4gICAgaWYgKGJvc3MubnBjICE9IG51bGwgJiYgYm9zcy5sb2NhdGlvbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzcGF3bkNvbmRpdGlvbiA9IGJvc3MubnBjLnNwYXducyh0aGlzLnJvbS5sb2NhdGlvbnNbYm9zcy5sb2NhdGlvbl0pO1xuICAgICAgZXh0cmEucHVzaCguLi50aGlzLmZpbHRlclJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbilbMF0pO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkluc2VjdCkge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5JbnNlY3RGbHV0ZS5jLCB0aGlzLnJvbS5mbGFncy5HYXNNYXNrLmMpO1xuICAgIH0gZWxzZSBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkJvd09mVHJ1dGguYyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLlJlZnJlc2guYyk7XG4gICAgfVxuICAgIHIucmVzdHJpY3QoW2V4dHJhXSk7XG4gICAgcmV0dXJuIFJlcXVpcmVtZW50LmZyZWV6ZShyKTtcbiAgfVxuXG4gIHN3b3JkUmVxdWlyZW1lbnQoZWxlbWVudDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICAgIGNvbnN0IHN3b3JkID0gW1xuICAgICAgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZldpbmQsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZGaXJlLFxuICAgICAgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZldhdGVyLCB0aGlzLnJvbS5mbGFncy5Td29yZE9mVGh1bmRlcixcbiAgICBdW2VsZW1lbnRdO1xuICAgIGlmIChsZXZlbCA9PT0gMSkgcmV0dXJuIHN3b3JkLnI7XG4gICAgY29uc3QgcG93ZXJzID0gW1xuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZldpbmQsIHRoaXMucm9tLmZsYWdzLlRvcm5hZG9CcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mRmlyZSwgdGhpcy5yb20uZmxhZ3MuRmxhbWVCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLkJsaXp6YXJkQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZlRodW5kZXIsIHRoaXMucm9tLmZsYWdzLlN0b3JtQnJhY2VsZXRdLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAzKSByZXR1cm4gYW5kKHN3b3JkLCAuLi5wb3dlcnMpO1xuICAgIHJldHVybiBwb3dlcnMubWFwKHBvd2VyID0+IFtzd29yZC5jLCBwb3dlci5jXSk7XG4gIH1cblxuICBpdGVtR3JhbnQoaWQ6IG51bWJlcik6IG51bWJlciB7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgdGhpcy5yb20uaXRlbUdldHMuYWN0aW9uR3JhbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSBpZCkgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGl0ZW0gZ3JhbnQgJHtpZC50b1N0cmluZygxNil9YCk7XG4gIH1cblxuICAvKiogUmV0dXJuIGEgUmVxdWlyZW1lbnQgZm9yIGFsbCBvZiB0aGUgZmxhZ3MgYmVpbmcgbWV0LiAqL1xuICBmaWx0ZXJSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCBjb25kcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgaWYgKGZsYWcgPCAwKSB7XG4gICAgICAgIGNvbnN0IGxvZ2ljID0gdGhpcy5mbGFnKH5mbGFnKT8ubG9naWM7XG4gICAgICAgIGlmIChsb2dpYz8uYXNzdW1lVHJ1ZSkgcmV0dXJuIFJlcXVpcmVtZW50LkNMT1NFRDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50LkNMT1NFRDtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSBjb25kcy5wdXNoKGYuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtjb25kc107XG4gIH1cblxuICAvKiogUmV0dXJuIGEgUmVxdWlyZW1lbnQgZm9yIHNvbWUgZmxhZyBub3QgYmVpbmcgbWV0LiAqL1xuICBmaWx0ZXJBbnRpUmVxdWlyZW1lbnRzKGZsYWdzOiBudW1iZXJbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gICAgY29uc3QgcmVxID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA+PSAwKSB7XG4gICAgICAgIGNvbnN0IGxvZ2ljID0gdGhpcy5mbGFnKH5mbGFnKT8ubG9naWM7XG4gICAgICAgIGlmIChsb2dpYz8uYXNzdW1lRmFsc2UpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZmxhZyk7XG4gICAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuT1BFTjtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSByZXEucHVzaChbZi5pZCBhcyBDb25kaXRpb25dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcTtcbiAgfVxuXG4gIGZsYWcoZmxhZzogbnVtYmVyKTogRmxhZ3x1bmRlZmluZWQge1xuICAgIC8vY29uc3QgdW5zaWduZWQgPSBmbGFnIDwgMCA/IH5mbGFnIDogZmxhZztcbiAgICBjb25zdCB1bnNpZ25lZCA9IGZsYWc7ICAvLyBUT0RPIC0gc2hvdWxkIHdlIGF1dG8taW52ZXJ0P1xuICAgIGNvbnN0IGYgPSB0aGlzLnJvbS5mbGFnc1t1bnNpZ25lZF07XG4gICAgY29uc3QgbWFwcGVkID0gdGhpcy5hbGlhc2VzLmdldChmKSA/PyBmO1xuICAgIHJldHVybiBtYXBwZWQ7XG4gIH1cblxuICBlbnRyYW5jZShsb2NhdGlvbjogTG9jYXRpb258bnVtYmVyLCBpbmRleCA9IDApOiBUaWxlSWQge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gPT09ICdudW1iZXInKSBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tsb2NhdGlvbl07XG4gICAgcmV0dXJuIHRoaXMudGlsZXMuZmluZChUaWxlSWQuZnJvbShsb2NhdGlvbiwgbG9jYXRpb24uZW50cmFuY2VzW2luZGV4XSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkod2FsbDogV2FsbFR5cGUpOiBudW1iZXIge1xuICAgIHN3aXRjaCAod2FsbCkge1xuICAgICAgY2FzZSBXYWxsVHlwZS5XSU5EOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtTdG9uZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuRklSRTogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSWNlLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5XQVRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkZvcm1CcmlkZ2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLlRIVU5ERVI6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha0lyb24uaWQ7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYGJhZCB3YWxsIHR5cGU6ICR7d2FsbH1gKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYW5kKC4uLmZsYWdzOiBGbGFnW10pOiBSZXF1aXJlbWVudC5TaW5nbGUge1xuICByZXR1cm4gW2ZsYWdzLm1hcCgoZjogRmxhZykgPT4gZi5pZCBhcyBDb25kaXRpb24pXTtcbn1cblxuZnVuY3Rpb24gb3IoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gIHJldHVybiBmbGFncy5tYXAoKGY6IEZsYWcpID0+IFtmLmlkIGFzIENvbmRpdGlvbl0pO1xufVxuXG4vLyBBbiBpbnRlcmVzdGluZyB3YXkgdG8gdHJhY2sgdGVycmFpbiBjb21iaW5hdGlvbnMgaXMgd2l0aCBwcmltZXMuXG4vLyBJZiB3ZSBoYXZlIE4gZWxlbWVudHMgd2UgY2FuIGxhYmVsIGVhY2ggYXRvbSB3aXRoIGEgcHJpbWUgYW5kXG4vLyB0aGVuIGxhYmVsIGFyYml0cmFyeSBjb21iaW5hdGlvbnMgd2l0aCB0aGUgcHJvZHVjdC4gIEZvciBOPTEwMDBcbi8vIHRoZSBoaWdoZXN0IG51bWJlciBpcyA4MDAwLCBzbyB0aGF0IGl0IGNvbnRyaWJ1dGVzIGFib3V0IDEzIGJpdHNcbi8vIHRvIHRoZSBwcm9kdWN0LCBtZWFuaW5nIHdlIGNhbiBzdG9yZSBjb21iaW5hdGlvbnMgb2YgNCBzYWZlbHlcbi8vIHdpdGhvdXQgcmVzb3J0aW5nIHRvIGJpZ2ludC4gIFRoaXMgaXMgaW5oZXJlbnRseSBvcmRlci1pbmRlcGVuZGVudC5cbi8vIElmIHRoZSByYXJlciBvbmVzIGFyZSBoaWdoZXIsIHdlIGNhbiBmaXQgc2lnbmlmaWNhbnRseSBtb3JlIHRoYW4gNC5cblxuY29uc3QgREVCVUcgPSBmYWxzZTtcblxuLy8gRGVidWcgaW50ZXJmYWNlLlxuZXhwb3J0IGludGVyZmFjZSBBcmVhRGF0YSB7XG4gIGlkOiBudW1iZXI7XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbiAgY2hlY2tzOiBBcnJheTxbRmxhZywgUmVxdWlyZW1lbnRdPjtcbiAgdGVycmFpbjogVGVycmFpbjtcbiAgbG9jYXRpb25zOiBTZXQ8bnVtYmVyPjtcbiAgcm91dGVzOiBSZXF1aXJlbWVudC5Gcm96ZW47XG59XG5leHBvcnQgaW50ZXJmYWNlIFRpbGVEYXRhIHtcbiAgYXJlYTogQXJlYURhdGE7XG4gIGV4aXQ/OiBUaWxlSWQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIExvY2F0aW9uRGF0YSB7XG4gIGFyZWFzOiBTZXQ8QXJlYURhdGE+O1xuICB0aWxlczogU2V0PFRpbGVJZD47XG59XG5leHBvcnQgaW50ZXJmYWNlIFdvcmxkRGF0YSB7XG4gIHRpbGVzOiBNYXA8VGlsZUlkLCBUaWxlRGF0YT47XG4gIGFyZWFzOiBBcmVhRGF0YVtdO1xuICBsb2NhdGlvbnM6IExvY2F0aW9uRGF0YVtdO1xufVxuIl19