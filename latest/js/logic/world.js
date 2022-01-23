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
                ClimbSlope9.id]);
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
                antiReq = Requirement.or(this.rom.flags.MesiaRecording.r, and(this.rom.flags.Paralysis, this.rom.flags.QueenNotInThroneRoom));
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
        if (item.itemUseData.some(u => u.tradeNpc() === this.rom.npcs.Aryllis.id)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQXNFaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVB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LEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN0RCxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDekQsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzFELE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUM7U0FDcEQ7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxTQUFTLEdBQUcsQ0FBQyxHQUFHLEtBQWE7SUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLEtBQWE7SUFDMUIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFVRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0FyZWF9IGZyb20gJy4uL3Nwb2lsZXIvYXJlYS5qcyc7XG5pbXBvcnQge2RpZX0gZnJvbSAnLi4vYXNzZXJ0LmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtCb3NzfSBmcm9tICcuLi9yb20vYm9zc2VzLmpzJztcbmltcG9ydCB7RmxhZywgTG9naWN9IGZyb20gJy4uL3JvbS9mbGFncy5qcyc7XG5pbXBvcnQge0l0ZW0sIEl0ZW1Vc2V9IGZyb20gJy4uL3JvbS9pdGVtLmpzJztcbmltcG9ydCB7TG9jYXRpb24sIFNwYXdufSBmcm9tICcuLi9yb20vbG9jYXRpb24uanMnO1xuaW1wb3J0IHtMb2NhbERpYWxvZywgTnBjfSBmcm9tICcuLi9yb20vbnBjLmpzJztcbmltcG9ydCB7U2hvcFR5cGV9IGZyb20gJy4uL3JvbS9zaG9wLmpzJztcbmltcG9ydCB7aGV4LCBzZXF9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwLCBMYWJlbGVkU2V0LCBpdGVycywgc3ByZWFkfSBmcm9tICcuLi91dGlsLmpzJztcbmltcG9ydCB7RGlyfSBmcm9tICcuL2Rpci5qcyc7XG5pbXBvcnQge0l0ZW1JbmZvLCBMb2NhdGlvbkxpc3QsIFNsb3RJbmZvfSBmcm9tICcuL2dyYXBoLmpzJztcbmltcG9ydCB7SGl0Ym94fSBmcm9tICcuL2hpdGJveC5qcyc7XG5pbXBvcnQge0NvbmRpdGlvbiwgUmVxdWlyZW1lbnQsIFJvdXRlfSBmcm9tICcuL3JlcXVpcmVtZW50LmpzJztcbmltcG9ydCB7U2NyZWVuSWR9IGZyb20gJy4vc2NyZWVuaWQuanMnO1xuaW1wb3J0IHtUZXJyYWluLCBUZXJyYWluc30gZnJvbSAnLi90ZXJyYWluLmpzJztcbmltcG9ydCB7VGlsZUlkfSBmcm9tICcuL3RpbGVpZC5qcyc7XG5pbXBvcnQge1RpbGVQYWlyfSBmcm9tICcuL3RpbGVwYWlyLmpzJztcbmltcG9ydCB7V2FsbFR5cGV9IGZyb20gJy4vd2FsbHR5cGUuanMnO1xuaW1wb3J0IHsgTW9uc3RlciB9IGZyb20gJy4uL3JvbS9tb25zdGVyLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuaW50ZXJmYWNlIENoZWNrIHtcbiAgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50O1xuICBjaGVja3M6IG51bWJlcltdO1xufVxuXG4vLyBCYXNpYyBhbGdvcml0aG06XG4vLyAgMS4gZmlsbCB0ZXJyYWlucyBmcm9tIG1hcHNcbi8vICAyLiBtb2RpZnkgdGVycmFpbnMgYmFzZWQgb24gbnBjcywgdHJpZ2dlcnMsIGJvc3NlcywgZXRjXG4vLyAgMi4gZmlsbCBhbGxFeGl0c1xuLy8gIDMuIHN0YXJ0IHVuaW9uZmluZFxuLy8gIDQuIGZpbGwgLi4uP1xuXG4vKiogU3RvcmVzIGFsbCB0aGUgcmVsZXZhbnQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHdvcmxkJ3MgbG9naWMuICovXG5leHBvcnQgY2xhc3MgV29ybGQge1xuXG4gIC8qKiBCdWlsZHMgYW5kIGNhY2hlcyBUZXJyYWluIG9iamVjdHMuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5GYWN0b3J5ID0gbmV3IFRlcnJhaW5zKHRoaXMucm9tKTtcblxuICAvKiogVGVycmFpbnMgbWFwcGVkIGJ5IFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgdGVycmFpbnMgPSBuZXcgTWFwPFRpbGVJZCwgVGVycmFpbj4oKTtcblxuICAvKiogQ2hlY2tzIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IGNoZWNrcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgU2V0PENoZWNrPj4oKCkgPT4gbmV3IFNldCgpKTtcblxuICAvKiogU2xvdCBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgc2xvdHMgPSBuZXcgTWFwPG51bWJlciwgU2xvdEluZm8+KCk7XG4gIC8qKiBJdGVtIGluZm8sIGJ1aWx0IHVwIGFzIHdlIGRpc2NvdmVyIHNsb3RzLiAqL1xuICByZWFkb25seSBpdGVtcyA9IG5ldyBNYXA8bnVtYmVyLCBJdGVtSW5mbz4oKTtcblxuICAvKiogRmxhZ3MgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBkaXJlY3QgYWxpYXNlcyBmb3IgbG9naWMuICovXG4gIHJlYWRvbmx5IGFsaWFzZXM6IE1hcDxGbGFnLCBGbGFnPjtcblxuICAvKiogTWFwcGluZyBmcm9tIGl0ZW11c2UgdHJpZ2dlcnMgdG8gdGhlIGl0ZW11c2UgdGhhdCB3YW50cyBpdC4gKi9cbiAgcmVhZG9ubHkgaXRlbVVzZXMgPSBuZXcgRGVmYXVsdE1hcDxudW1iZXIsIFtJdGVtLCBJdGVtVXNlXVtdPigoKSA9PiBbXSk7XG5cbiAgLyoqIFJhdyBtYXBwaW5nIG9mIGV4aXRzLCB3aXRob3V0IGNhbm9uaWNhbGl6aW5nLiAqL1xuICByZWFkb25seSBleGl0cyA9IG5ldyBNYXA8VGlsZUlkLCBUaWxlSWQ+KCk7XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBleGl0cyB0byBlbnRyYW5jZXMuICBUaWxlUGFpciBpcyBjYW5vbmljYWxpemVkLiAqL1xuICByZWFkb25seSBleGl0U2V0ID0gbmV3IFNldDxUaWxlUGFpcj4oKTtcblxuICAvKipcbiAgICogU2V0IG9mIFRpbGVJZHMgd2l0aCBzZWFtbGVzcyBleGl0cy4gIFRoaXMgaXMgdXNlZCB0byBlbnN1cmUgdGhlXG4gICAqIGxvZ2ljIHVuZGVyc3RhbmRzIHRoYXQgdGhlIHBsYXllciBjYW4ndCB3YWxrIGFjcm9zcyBhbiBleGl0IHRpbGVcbiAgICogd2l0aG91dCBjaGFuZ2luZyBsb2NhdGlvbnMgKHByaW1hcmlseSBmb3IgZGlzYWJsaW5nIHRlbGVwb3J0XG4gICAqIHNraXApLlxuICAgKi9cbiAgcmVhZG9ubHkgc2VhbWxlc3NFeGl0cyA9IG5ldyBTZXQ8VGlsZUlkPigpO1xuXG4gIC8qKlxuICAgKiBVbmlvbmZpbmQgb2YgY29ubmVjdGVkIGNvbXBvbmVudHMgb2YgdGlsZXMuICBOb3RlIHRoYXQgYWxsIHRoZVxuICAgKiBhYm92ZSBwcm9wZXJ0aWVzIGNhbiBiZSBidWlsdCB1cCBpbiBwYXJhbGxlbCwgYnV0IHRoZSB1bmlvbmZpbmRcbiAgICogY2Fubm90IGJlIHN0YXJ0ZWQgdW50aWwgYWZ0ZXIgYWxsIHRlcnJhaW5zIGFuZCBleGl0cyBhcmVcbiAgICogcmVnaXN0ZXJlZCwgc2luY2Ugd2Ugc3BlY2lmaWNhbGx5IG5lZWQgdG8gKm5vdCogdW5pb24gY2VydGFpblxuICAgKiBuZWlnaGJvcnMuXG4gICAqL1xuICByZWFkb25seSB0aWxlcyA9IG5ldyBVbmlvbkZpbmQ8VGlsZUlkPigpO1xuXG4gIC8qKlxuICAgKiBNYXAgb2YgVGlsZVBhaXJzIG9mIGNhbm9uaWNhbCB1bmlvbmZpbmQgcmVwcmVzZW50YXRpdmUgVGlsZUlkcyB0b1xuICAgKiBhIGJpdHNldCBvZiBuZWlnaGJvciBkaXJlY3Rpb25zLiAgV2Ugb25seSBuZWVkIHRvIHdvcnJ5IGFib3V0XG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIGJlY2F1c2UgYWxsIFRpbGVJZHMgaGF2ZSB0aGUgc2FtZSB0ZXJyYWluLlxuICAgKiBXZSB3aWxsIGFkZCBhIHJvdXRlIGZvciBlYWNoIGRpcmVjdGlvbiB3aXRoIHVuaXF1ZSByZXF1aXJlbWVudHMuXG4gICAqL1xuICByZWFkb25seSBuZWlnaGJvcnMgPSBuZXcgRGVmYXVsdE1hcDxUaWxlUGFpciwgbnVtYmVyPigoKSA9PiAwKTtcblxuICAvKiogUmVxdWlyZW1lbnQgYnVpbGRlciBmb3IgcmVhY2hpbmcgZWFjaCBjYW5vbmljYWwgVGlsZUlkLiAqL1xuICByZWFkb25seSByb3V0ZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBSZXF1aXJlbWVudC5CdWlsZGVyPihcbiAgICAgICAgICAoKSA9PiBuZXcgUmVxdWlyZW1lbnQuQnVpbGRlcigpKTtcblxuICAvKiogUm91dGVzIG9yaWdpbmF0aW5nIGZyb20gZWFjaCBjYW5vbmljYWwgdGlsZS4gKi9cbiAgcmVhZG9ubHkgcm91dGVFZGdlcyA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIExhYmVsZWRTZXQ8Um91dGU+PigoKSA9PiBuZXcgTGFiZWxlZFNldCgpKTtcblxuICAvKiogTG9jYXRpb24gbGlzdDogdGhpcyBpcyB0aGUgcmVzdWx0IG9mIGNvbWJpbmluZyByb3V0ZXMgd2l0aCBjaGVja3MuICovXG4gIHJlYWRvbmx5IHJlcXVpcmVtZW50TWFwID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPENvbmRpdGlvbiwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKGM6IENvbmRpdGlvbikgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoYykpO1xuXG4gIC8qKiBMb2NhdGlvbiB3aXRoIGEgbm9ydGggZXhpdCB0byBMaW1lIFRyZWUgTGFrZSAoaS5lLiBSYWdlKS4gKi9cbiAgcHJpdmF0ZSBsaW1lVHJlZUVudHJhbmNlTG9jYXRpb24gPSAtMTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSwgcmVhZG9ubHkgZmxhZ3NldDogRmxhZ1NldCxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgdHJhY2tlciA9IGZhbHNlKSB7XG4gICAgLy8gQnVpbGQgaXRlbVVzZXMgKGUuZy4gd2luZG1pbGwga2V5IGluc2lkZSB3aW5kbWlsbCwgYm93IG9mIHN1bi9tb29uPylcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygcm9tLml0ZW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZSBvZiBpdGVtLml0ZW1Vc2VEYXRhKSB7XG4gICAgICAgIGlmICh1c2Uua2luZCA9PT0gJ2V4cGVjdCcpIHtcbiAgICAgICAgICB0aGlzLml0ZW1Vc2VzLmdldCh1c2Uud2FudCkucHVzaChbaXRlbSwgdXNlXSk7XG4gICAgICAgIH0gZWxzZSBpZiAodXNlLmtpbmQgPT09ICdsb2NhdGlvbicpIHtcbiAgICAgICAgICB0aGlzLml0ZW1Vc2VzLmdldCh+dXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ1aWxkIGFsaWFzZXNcbiAgICB0aGlzLmFsaWFzZXMgPSBuZXcgTWFwKFtcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlQWthaGFuYSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVNvbGRpZXIsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTdG9tLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlV29tYW4sIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5QYXJhbHl6ZWRLZW5zdUluRGFuY2VIYWxsLCByb20uZmxhZ3MuUGFyYWx5c2lzXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJblRhdmVybiwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgXSk7XG5cbiAgICAvLyBJZiB0cmlnZ2VyIHNraXAgaXMgb24sIHNlYW1sZXNzIGV4aXRzIGNhbiBiZSBjcm9zc2VkIVxuICAgIGlmIChmbGFnc2V0LmFzc3VtZVRyaWdnZXJHbGl0Y2goKSkge1xuICAgICAgLy8gTk9URTogdGhpcyBpcyBhIHRlcnJpYmxlIGhhY2ssIGJ1dCBpdCBlZmZpY2llbnRseSBwcmV2ZW50c1xuICAgICAgLy8gYWRkaW5nIHRpbGVzIHRvIHRoZSBzZXQsIHdpdGhvdXQgY2hlY2tpbmcgdGhlIGZsYWcgZXZlcnkgdGltZS5cbiAgICAgIHRoaXMuc2VhbWxlc3NFeGl0cy5hZGQgPSAoKSA9PiB0aGlzLnNlYW1sZXNzRXhpdHM7XG4gICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGxvY2F0aW9ucyB0byBidWlsZCB1cCBpbmZvIGFib3V0IHRpbGVzLCB0ZXJyYWlucywgY2hlY2tzLlxuICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgICAgdGhpcy5wcm9jZXNzTG9jYXRpb24obG9jYXRpb24pO1xuICAgIH1cbiAgICB0aGlzLmFkZEV4dHJhQ2hlY2tzKCk7XG5cbiAgICAvLyBCdWlsZCB1cCB0aGUgVW5pb25GaW5kIGFuZCB0aGUgZXhpdHMgYW5kIG5laWdoYm9ycyBzdHJ1Y3R1cmVzLlxuICAgIHRoaXMudW5pb25OZWlnaGJvcnMoKTtcbiAgICB0aGlzLnJlY29yZEV4aXRzKCk7XG4gICAgdGhpcy5idWlsZE5laWdoYm9ycygpO1xuXG4gICAgLy8gQnVpbGQgdGhlIHJvdXRlcy9lZGdlcy5cbiAgICB0aGlzLmFkZEFsbFJvdXRlcygpO1xuXG4gICAgLy8gQnVpbGQgdGhlIGxvY2F0aW9uIGxpc3QuXG4gICAgdGhpcy5jb25zb2xpZGF0ZUNoZWNrcygpO1xuICAgIHRoaXMuYnVpbGRSZXF1aXJlbWVudE1hcCgpO1xuICB9XG5cbiAgLyoqIEFkZHMgY2hlY2tzIHRoYXQgYXJlIG5vdCBkZXRlY3RhYmxlIGZyb20gZGF0YSB0YWJsZXMuICovXG4gIGFkZEV4dHJhQ2hlY2tzKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGxvY2F0aW9uczoge1xuICAgICAgICBMZWFmX1Rvb2xTaG9wLFxuICAgICAgICBNZXphbWVTaHJpbmUsXG4gICAgICAgIE9hayxcbiAgICAgICAgU2h5cm9uX1Rvb2xTaG9wLFxuICAgICAgfSxcbiAgICAgIGZsYWdzOiB7XG4gICAgICAgIEFibGVUb1JpZGVEb2xwaGluLFxuICAgICAgICBCYWxsT2ZGaXJlLCBCYWxsT2ZUaHVuZGVyLCBCYWxsT2ZXYXRlciwgQmFsbE9mV2luZCxcbiAgICAgICAgQmFycmllciwgQmxpenphcmRCcmFjZWxldCwgQm93T2ZNb29uLCBCb3dPZlN1bixcbiAgICAgICAgQnJlYWtTdG9uZSwgQnJlYWtJY2UsIEJyZWFrSXJvbixcbiAgICAgICAgQnJva2VuU3RhdHVlLCBCdXlIZWFsaW5nLCBCdXlXYXJwLFxuICAgICAgICBDbGltYldhdGVyZmFsbCwgQ2xpbWJTbG9wZTgsIENsaW1iU2xvcGU5LCBDbGltYlNsb3BlMTAsXG4gICAgICAgIENyb3NzUGFpbiwgQ3VycmVudGx5UmlkaW5nRG9scGhpbixcbiAgICAgICAgRmxpZ2h0LCBGbGFtZUJyYWNlbGV0LCBGb3JtQnJpZGdlLFxuICAgICAgICBHYXNNYXNrLCBHbG93aW5nTGFtcCxcbiAgICAgICAgSW5qdXJlZERvbHBoaW4sXG4gICAgICAgIExlYWRpbmdDaGlsZCwgTGVhdGhlckJvb3RzLFxuICAgICAgICBNb25leSxcbiAgICAgICAgT3BlbmVkQ3J5cHQsXG4gICAgICAgIFJhYmJpdEJvb3RzLCBSZWZyZXNoLCBSZXBhaXJlZFN0YXR1ZSwgUmVzY3VlZENoaWxkLFxuICAgICAgICBTaGVsbEZsdXRlLCBTaGllbGRSaW5nLCBTaG9vdGluZ1N0YXR1ZSwgU3Rvcm1CcmFjZWxldCxcbiAgICAgICAgU3dvcmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mVGh1bmRlciwgU3dvcmRPZldhdGVyLCBTd29yZE9mV2luZCxcbiAgICAgICAgVG9ybmFkb0JyYWNlbGV0LCBUcmF2ZWxTd2FtcCwgVHJpZ2dlclNraXAsXG4gICAgICAgIFdpbGRXYXJwLFxuICAgICAgfSxcbiAgICAgIGl0ZW1zOiB7XG4gICAgICAgIE1lZGljYWxIZXJiLFxuICAgICAgICBXYXJwQm9vdHMsXG4gICAgICB9LFxuICAgIH0gPSB0aGlzLnJvbTtcbiAgICBjb25zdCBzdGFydCA9IHRoaXMuZW50cmFuY2UoTWV6YW1lU2hyaW5lKTtcbiAgICBjb25zdCBlbnRlck9hayA9IHRoaXMuZW50cmFuY2UoT2FrKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGFuZChCb3dPZk1vb24sIEJvd09mU3VuKSwgW09wZW5lZENyeXB0LmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQWJsZVRvUmlkZURvbHBoaW4sIFNoZWxsRmx1dGUpLFxuICAgICAgICAgICAgICAgICAgW0N1cnJlbnRseVJpZGluZ0RvbHBoaW4uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtlbnRlck9ha10sIGFuZChMZWFkaW5nQ2hpbGQpLCBbUmVzY3VlZENoaWxkLmlkXSk7XG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soW3N0YXJ0XSwgYW5kKEdsb3dpbmdMYW1wLCBCcm9rZW5TdGF0dWUpLFxuICAgICAgICAgICAgICAgICAgICAgIFJlcGFpcmVkU3RhdHVlLmlkLCB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuXG4gICAgLy8gQWRkIHNob3BzXG4gICAgZm9yIChjb25zdCBzaG9wIG9mIHRoaXMucm9tLnNob3BzKSB7XG4gICAgICAvLyBsZWFmIGFuZCBzaHlyb24gbWF5IG5vdCBhbHdheXMgYmUgYWNjZXNzaWJsZSwgc28gZG9uJ3QgcmVseSBvbiB0aGVtLlxuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IExlYWZfVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AubG9jYXRpb24gPT09IFNoeXJvbl9Ub29sU2hvcC5pZCkgY29udGludWU7XG4gICAgICBpZiAoIXNob3AudXNlZCkgY29udGludWU7XG4gICAgICBpZiAoc2hvcC50eXBlICE9PSBTaG9wVHlwZS5UT09MKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhpdGJveCA9IFtUaWxlSWQoc2hvcC5sb2NhdGlvbiA8PCAxNiB8IDB4ODgpXTtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBzaG9wLmNvbnRlbnRzKSB7XG4gICAgICAgIGlmIChpdGVtID09PSBNZWRpY2FsSGVyYi5pZCkge1xuICAgICAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBNb25leS5yLCBbQnV5SGVhbGluZy5pZF0pO1xuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09IFdhcnBCb290cy5pZCkge1xuICAgICAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBNb25leS5yLCBbQnV5V2FycC5pZF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIHBzZXVkbyBmbGFnc1xuICAgIGxldCBicmVha1N0b25lOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXaW5kLnI7XG4gICAgbGV0IGJyZWFrSWNlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZGaXJlLnI7XG4gICAgbGV0IGZvcm1CcmlkZ2U6IFJlcXVpcmVtZW50ID0gU3dvcmRPZldhdGVyLnI7XG4gICAgbGV0IGJyZWFrSXJvbjogUmVxdWlyZW1lbnQgPSBTd29yZE9mVGh1bmRlci5yO1xuICAgIGlmICghdGhpcy5mbGFnc2V0Lm9yYnNPcHRpb25hbCgpKSB7XG4gICAgICBjb25zdCB3aW5kMiA9IG9yKEJhbGxPZldpbmQsIFRvcm5hZG9CcmFjZWxldCk7XG4gICAgICBjb25zdCBmaXJlMiA9IG9yKEJhbGxPZkZpcmUsIEZsYW1lQnJhY2VsZXQpO1xuICAgICAgY29uc3Qgd2F0ZXIyID0gb3IoQmFsbE9mV2F0ZXIsIEJsaXp6YXJkQnJhY2VsZXQpO1xuICAgICAgY29uc3QgdGh1bmRlcjIgPSBvcihCYWxsT2ZUaHVuZGVyLCBTdG9ybUJyYWNlbGV0KTtcbiAgICAgIGJyZWFrU3RvbmUgPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrU3RvbmUsIHdpbmQyKTtcbiAgICAgIGJyZWFrSWNlID0gUmVxdWlyZW1lbnQubWVldChicmVha0ljZSwgZmlyZTIpO1xuICAgICAgZm9ybUJyaWRnZSA9IFJlcXVpcmVtZW50Lm1lZXQoZm9ybUJyaWRnZSwgd2F0ZXIyKTtcbiAgICAgIGJyZWFrSXJvbiA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJcm9uLCB0aHVuZGVyMik7XG4gICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVN3b3JkQ2hhcmdlR2xpdGNoKCkpIHtcbiAgICAgICAgY29uc3QgbGV2ZWwyID1cbiAgICAgICAgICAgIFJlcXVpcmVtZW50Lm9yKGJyZWFrU3RvbmUsIGJyZWFrSWNlLCBmb3JtQnJpZGdlLCBicmVha0lyb24pO1xuICAgICAgICBmdW5jdGlvbiBuZWVkKHN3b3JkOiBGbGFnKTogUmVxdWlyZW1lbnQge1xuICAgICAgICAgIHJldHVybiBsZXZlbDIubWFwKFxuICAgICAgICAgICAgICAoYzogcmVhZG9ubHkgQ29uZGl0aW9uW10pID0+XG4gICAgICAgICAgICAgICAgICBjWzBdID09PSBzd29yZC5jID8gYyA6IFtzd29yZC5jLCAuLi5jXSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtTdG9uZSA9IG5lZWQoU3dvcmRPZldpbmQpO1xuICAgICAgICBicmVha0ljZSA9IG5lZWQoU3dvcmRPZkZpcmUpO1xuICAgICAgICBmb3JtQnJpZGdlID0gbmVlZChTd29yZE9mV2F0ZXIpO1xuICAgICAgICBicmVha0lyb24gPSBuZWVkKFN3b3JkT2ZUaHVuZGVyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha1N0b25lLCBbQnJlYWtTdG9uZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtJY2UsIFtCcmVha0ljZS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgZm9ybUJyaWRnZSwgW0Zvcm1CcmlkZ2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSXJvbiwgW0JyZWFrSXJvbi5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSxcbiAgICAgICAgICAgICAgICAgIG9yKFN3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlciksXG4gICAgICAgICAgICAgICAgICBbU3dvcmQuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEZsaWdodC5yLCBbQ2xpbWJXYXRlcmZhbGwuaWQsIENsaW1iU2xvcGUxMC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgb3IoRmxpZ2h0LCBSYWJiaXRCb290cyksIFtDbGltYlNsb3BlOC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgb3IoRmxpZ2h0LCBSYWJiaXRCb290cyksIFtDbGltYlNsb3BlOS5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgQmFycmllci5yLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEdhc01hc2suciwgW1RyYXZlbFN3YW1wLmlkXSk7XG4gICAgY29uc3QgcGFpbiA9IHRoaXMuZmxhZ3NldC5jaGFuZ2VHYXNNYXNrVG9IYXptYXRTdWl0KCkgPyBHYXNNYXNrIDogTGVhdGhlckJvb3RzO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgb3IoRmxpZ2h0LCBSYWJiaXRCb290cywgcGFpbiksIFtDcm9zc1BhaW4uaWRdKTtcblxuICAgIGlmICh0aGlzLmZsYWdzZXQubGVhdGhlckJvb3RzR2l2ZVNwZWVkKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgTGVhdGhlckJvb3RzLnIsIFtDbGltYlNsb3BlOC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZUdoZXR0b0ZsaWdodCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFxuICAgICAgICBbc3RhcnRdLCBhbmQoQ3VycmVudGx5UmlkaW5nRG9scGhpbiwgUmFiYml0Qm9vdHMpLFxuICAgICAgICBbQ2xpbWJXYXRlcmZhbGwuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5mb2dMYW1wTm90UmVxdWlyZWQoKSkge1xuICAgICAgLy8gbm90IGFjdHVhbGx5IHVzZWQuLi4/XG4gICAgICBjb25zdCByZXF1aXJlSGVhbGVkID0gdGhpcy5mbGFnc2V0LnJlcXVpcmVIZWFsZWREb2xwaGluVG9SaWRlKCk7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVIZWFsZWQgPyBJbmp1cmVkRG9scGhpbi5yIDogW1tdXSxcbiAgICAgICAgICAgICAgICAgICAgW0FibGVUb1JpZGVEb2xwaGluLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUJhcnJpZXIoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgU2hpZWxkUmluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSxcbiAgICAgICAgICAgICAgICAgICAgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lRmxpZ2h0U3RhdHVlU2tpcCgpKSB7XG4gICAgICAvLyBOT1RFOiB3aXRoIG5vIG1vbmV5LCB3ZSd2ZSBnb3QgMTYgTVAsIHdoaWNoIGlzbid0IGVub3VnaFxuICAgICAgLy8gdG8gZ2V0IHBhc3Qgc2V2ZW4gc3RhdHVlcy5cbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBGbGlnaHQuY11dLCBbU2hvb3RpbmdTdGF0dWUuaWRdKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlR2FzTWFzaygpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgQnV5SGVhbGluZy5jXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtNb25leS5jLCBSZWZyZXNoLmNdXSxcbiAgICAgICAgICAgICAgICAgICAgW1RyYXZlbFN3YW1wLmlkLCBDcm9zc1BhaW4uaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFJlcXVpcmVtZW50Lk9QRU4sIFtXaWxkV2FycC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVRyaWdnZXJHbGl0Y2goKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBSZXF1aXJlbWVudC5PUEVOLCBbVHJpZ2dlclNraXAuaWRdKTtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgVHJpZ2dlclNraXAucixcbiAgICAgICAgICAgICAgICAgICAgW0Nyb3NzUGFpbi5pZCwgQ2xpbWJTbG9wZTguaWQsXG4gICAgICAgICAgICAgICAgICAgICBDbGltYlNsb3BlOS5pZCAvKiwgQ2xpbWJTbG9wZTEwLmlkICovXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEFkZHMgcm91dGVzIHRoYXQgYXJlIG5vdCBkZXRlY3RhYmxlIGZyb20gZGF0YSB0YWJsZXMuICovXG4gIGFkZEV4dHJhUm91dGVzKCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGZsYWdzOiB7QnV5V2FycCwgU3dvcmRPZlRodW5kZXIsIFRlbGVwb3J0LCBXaWxkV2FycH0sXG4gICAgICBsb2NhdGlvbnM6IHtNZXphbWVTaHJpbmV9LFxuICAgIH0gPSB0aGlzLnJvbTtcbiAgICAvLyBTdGFydCB0aGUgZ2FtZSBhdCBNZXphbWUgU2hyaW5lLlxuICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHRoaXMuZW50cmFuY2UoTWV6YW1lU2hyaW5lKSwgW10pKTtcbiAgICAvLyBTd29yZCBvZiBUaHVuZGVyIHdhcnBcbiAgICBpZiAodGhpcy5mbGFnc2V0LnRlbGVwb3J0T25UaHVuZGVyU3dvcmQoKSkge1xuICAgICAgY29uc3Qgd2FycCA9IHRoaXMucm9tLnRvd25XYXJwLnRodW5kZXJTd29yZFdhcnA7XG4gICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTd29yZE9mVGh1bmRlci5jLCBCdXlXYXJwLmNdKSk7XG4gICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKHdhcnBbMF0sIHdhcnBbMV0gJiAweDFmKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTd29yZE9mVGh1bmRlci5jLCBUZWxlcG9ydC5jXSkpO1xuICAgIH1cbiAgICAvLyBXaWxkIHdhcnBcbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVdpbGRXYXJwKCkpIHtcbiAgICAgIGZvciAoY29uc3QgbG9jYXRpb24gb2YgdGhpcy5yb20ud2lsZFdhcnAubG9jYXRpb25zKSB7XG4gICAgICAgIC8vIERvbid0IGNvdW50IGNoYW5uZWwgaW4gbG9naWMgYmVjYXVzZSB5b3UgY2FuJ3QgYWN0dWFsbHkgbW92ZS5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB0aGlzLnJvbS5sb2NhdGlvbnMuVW5kZXJncm91bmRDaGFubmVsLmlkKSBjb250aW51ZTtcbiAgICAgICAgLy8gTk9URTogc29tZSBlbnRyYW5jZSB0aWxlcyBoYXMgZXh0cmEgcmVxdWlyZW1lbnRzIHRvIGVudGVyIChlLmcuXG4gICAgICAgIC8vIHN3YW1wKSAtIGZpbmQgdGhlbSBhbmQgY29uY2F0ZW50ZS5cbiAgICAgICAgY29uc3QgZW50cmFuY2UgPSB0aGlzLmVudHJhbmNlKGxvY2F0aW9uKTtcbiAgICAgICAgY29uc3QgdGVycmFpbiA9IHRoaXMudGVycmFpbnMuZ2V0KGVudHJhbmNlKSA/PyBkaWUoJ2JhZCBlbnRyYW5jZScpO1xuICAgICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHRlcnJhaW4uZW50ZXIpIHtcbiAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShlbnRyYW5jZSwgW1dpbGRXYXJwLmMsIC4uLnJvdXRlXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIENoYW5nZSB0aGUga2V5IG9mIHRoZSBjaGVja3MgbWFwIHRvIG9ubHkgYmUgY2Fub25pY2FsIFRpbGVJZHMuICovXG4gIGNvbnNvbGlkYXRlQ2hlY2tzKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrc10gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IHJvb3QgPSB0aGlzLnRpbGVzLmZpbmQodGlsZSk7XG4gICAgICBpZiAodGlsZSA9PT0gcm9vdCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICB0aGlzLmNoZWNrcy5nZXQocm9vdCkuYWRkKGNoZWNrKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuY2hlY2tzLmRlbGV0ZSh0aWxlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQXQgdGhpcyBwb2ludCB3ZSBrbm93IHRoYXQgYWxsIG9mIHRoaXMuY2hlY2tzJyBrZXlzIGFyZSBjYW5vbmljYWwuICovXG4gIGJ1aWxkUmVxdWlyZW1lbnRNYXAoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgY2hlY2tTZXRdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IHJlcSA9IHRoaXMucmVxdWlyZW1lbnRNYXAuZ2V0KGNoZWNrIGFzIENvbmRpdGlvbik7XG4gICAgICAgICAgZm9yIChjb25zdCByMSBvZiByZXF1aXJlbWVudCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCByMiBvZiB0aGlzLnJvdXRlcy5nZXQodGlsZSkgfHwgW10pIHtcbiAgICAgICAgICAgICAgcmVxLmFkZExpc3QoWy4uLnIxLCAuLi5yMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8gLSBsb2cgdGhlIG1hcD9cbiAgICBpZiAoIURFQlVHKSByZXR1cm47XG4gICAgY29uc3QgbG9nID0gW107XG4gICAgZm9yIChjb25zdCBbY2hlY2ssIHJlcV0gb2YgdGhpcy5yZXF1aXJlbWVudE1hcCkge1xuICAgICAgY29uc3QgbmFtZSA9IChjOiBudW1iZXIpID0+IHRoaXMucm9tLmZsYWdzW2NdLm5hbWU7XG4gICAgICBmb3IgKGNvbnN0IHJvdXRlIG9mIHJlcSkge1xuICAgICAgICBsb2cucHVzaChgJHtuYW1lKGNoZWNrKX06ICR7Wy4uLnJvdXRlXS5tYXAobmFtZSkuam9pbignICYgJyl9XFxuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIGxvZy5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDApO1xuICAgIGNvbnNvbGUubG9nKGxvZy5qb2luKCcnKSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIExvY2F0aW9uTGlzdCBzdHJ1Y3R1cmUgYWZ0ZXIgdGhlIHJlcXVpcmVtZW50IG1hcCBpcyBidWlsdC4gKi9cbiAgZ2V0TG9jYXRpb25MaXN0KHdvcmxkTmFtZSA9ICdDcnlzdGFsaXMnKTogTG9jYXRpb25MaXN0IHtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIganVzdCBpbXBsZW1lbnRpbmcgdGhpcyBkaXJlY3RseT9cbiAgICBjb25zdCBjaGVja05hbWUgPSBERUJVRyA/IChmOiBGbGFnKSA9PiBmLmRlYnVnIDogKGY6IEZsYWcpID0+IGYubmFtZTtcbiAgICByZXR1cm4ge1xuICAgICAgd29ybGROYW1lLFxuICAgICAgcmVxdWlyZW1lbnRzOiB0aGlzLnJlcXVpcmVtZW50TWFwLFxuICAgICAgaXRlbXM6IHRoaXMuaXRlbXMsXG4gICAgICBzbG90czogdGhpcy5zbG90cyxcbiAgICAgIGNoZWNrTmFtZTogKGNoZWNrOiBudW1iZXIpID0+IGNoZWNrTmFtZSh0aGlzLnJvbS5mbGFnc1tjaGVja10pLFxuICAgICAgcHJlZmlsbDogKHJhbmRvbTogUmFuZG9tKSA9PiB7XG4gICAgICAgIGNvbnN0IHtDcnlzdGFsaXMsIE1lc2lhSW5Ub3dlciwgTGVhZkVsZGVyfSA9IHRoaXMucm9tLmZsYWdzO1xuICAgICAgICBjb25zdCBtYXAgPSBuZXcgTWFwKFtbTWVzaWFJblRvd2VyLmlkLCBDcnlzdGFsaXMuaWRdXSk7XG4gICAgICAgIGlmICh0aGlzLmZsYWdzZXQuZ3VhcmFudGVlU3dvcmQoKSkge1xuICAgICAgICAgIC8vIFBpY2sgYSBzd29yZCBhdCByYW5kb20uLi4/IGludmVyc2Ugd2VpZ2h0P1xuICAgICAgICAgIG1hcC5zZXQoTGVhZkVsZGVyLmlkLCAweDIwMCB8IHJhbmRvbS5uZXh0SW50KDQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgICAvLyBUT0RPIC0gaWYgYW55IGl0ZW1zIHNob3VsZG4ndCBiZSBzaHVmZmxlZCwgdGhlbiBkbyB0aGUgcHJlLWZpbGwuLi5cbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBBZGQgdGVycmFpbnMgYW5kIGNoZWNrcyBmb3IgYSBsb2NhdGlvbiwgZnJvbSB0aWxlcyBhbmQgc3Bhd25zLiAqL1xuICBwcm9jZXNzTG9jYXRpb24obG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgaWYgKCFsb2NhdGlvbi51c2VkKSByZXR1cm47XG4gICAgLy8gTG9vayBmb3Igd2FsbHMsIHdoaWNoIHdlIG5lZWQgdG8ga25vdyBhYm91dCBsYXRlci5cbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvblRpbGVzKGxvY2F0aW9uKTtcbiAgICB0aGlzLnByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbik7XG4gIH1cblxuICAvKiogUnVuIHRoZSBmaXJzdCBwYXNzIG9mIHVuaW9ucyBub3cgdGhhdCBhbGwgdGVycmFpbnMgYXJlIGZpbmFsLiAqL1xuICB1bmlvbk5laWdoYm9ycygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0aGlzLnRlcnJhaW5zKSB7XG4gICAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoeDEpID09PSB0ZXJyYWluKSB0aGlzLnRpbGVzLnVuaW9uKFt0aWxlLCB4MV0pO1xuICAgICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHkxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeTFdKTtcbiAgICB9XG4gIH1cblxuICAvKiogQnVpbGRzIHVwIHRoZSByb3V0ZXMgYW5kIHJvdXRlRWRnZXMgZGF0YSBzdHJ1Y3R1cmVzLiAqL1xuICBhZGRBbGxSb3V0ZXMoKSB7XG4gICAgLy8gQWRkIGFueSBleHRyYSByb3V0ZXMgZmlyc3QsIHN1Y2ggYXMgdGhlIHN0YXJ0aW5nIHRpbGUuXG4gICAgdGhpcy5hZGRFeHRyYVJvdXRlcygpO1xuICAgIC8vIEFkZCBhbGwgdGhlIGVkZ2VzIGZyb20gYWxsIG5laWdoYm9ycy5cbiAgICBmb3IgKGNvbnN0IFtwYWlyLCBkaXJzXSBvZiB0aGlzLm5laWdoYm9ycykge1xuICAgICAgY29uc3QgW2MwLCBjMV0gPSBUaWxlUGFpci5zcGxpdChwYWlyKTtcbiAgICAgIGNvbnN0IHQwID0gdGhpcy50ZXJyYWlucy5nZXQoYzApO1xuICAgICAgY29uc3QgdDEgPSB0aGlzLnRlcnJhaW5zLmdldChjMSk7XG4gICAgICBpZiAoIXQwIHx8ICF0MSkgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIHRlcnJhaW4gJHtoZXgodDAgPyBjMCA6IGMxKX1gKTtcbiAgICAgIGZvciAoY29uc3QgW2RpciwgZXhpdFJlcV0gb2YgdDAuZXhpdCkge1xuICAgICAgICBpZiAoIShkaXIgJiBkaXJzKSkgY29udGludWU7XG4gICAgICAgIGZvciAoY29uc3QgZXhpdENvbmRzIG9mIGV4aXRSZXEpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGVudGVyQ29uZHMgb2YgdDEuZW50ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKGMxLCBbLi4uZXhpdENvbmRzLCAuLi5lbnRlckNvbmRzXSksIGMwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IGRlYnVnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlYnVnJyk7XG4gICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgZGVidWcuYXBwZW5kQ2hpbGQobmV3IEFyZWEodGhpcy5yb20sIHRoaXMuZ2V0V29ybGREYXRhKCkpLmVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFdvcmxkRGF0YSgpOiBXb3JsZERhdGEge1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3QgdGlsZXMgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFRpbGVEYXRhPigoKSA9PiAoe30pIGFzIFRpbGVEYXRhKTtcbiAgICBjb25zdCBsb2NhdGlvbnMgPVxuICAgICAgICBzZXEoMjU2LCAoKSA9PiAoe2FyZWFzOiBuZXcgU2V0KCksIHRpbGVzOiBuZXcgU2V0KCl9IGFzIExvY2F0aW9uRGF0YSkpO1xuICAgIGNvbnN0IGFyZWFzOiBBcmVhRGF0YVtdID0gW107XG5cbiAgICAvLyBkaWdlc3QgdGhlIGFyZWFzXG4gICAgZm9yIChjb25zdCBzZXQgb2YgdGhpcy50aWxlcy5zZXRzKCkpIHtcbiAgICAgIGNvbnN0IGNhbm9uaWNhbCA9IHRoaXMudGlsZXMuZmluZChpdGVycy5maXJzdChzZXQpKTtcbiAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChjYW5vbmljYWwpO1xuICAgICAgaWYgKCF0ZXJyYWluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHJvdXRlcyA9XG4gICAgICAgICAgdGhpcy5yb3V0ZXMuaGFzKGNhbm9uaWNhbCkgP1xuICAgICAgICAgICAgICBSZXF1aXJlbWVudC5mcmVlemUodGhpcy5yb3V0ZXMuZ2V0KGNhbm9uaWNhbCkpIDogW107XG4gICAgICBpZiAoIXJvdXRlcy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgYXJlYTogQXJlYURhdGEgPSB7XG4gICAgICAgIGNoZWNrczogW10sXG4gICAgICAgIGlkOiBpbmRleCsrLFxuICAgICAgICBsb2NhdGlvbnM6IG5ldyBTZXQoKSxcbiAgICAgICAgcm91dGVzLFxuICAgICAgICB0ZXJyYWluLFxuICAgICAgICB0aWxlczogbmV3IFNldCgpLFxuICAgICAgfTtcbiAgICAgIGFyZWFzLnB1c2goYXJlYSk7XG4gICAgICBmb3IgKGNvbnN0IHRpbGUgb2Ygc2V0KSB7XG4gICAgICAgIGNvbnN0IGxvY2F0aW9uID0gdGlsZSA+Pj4gMTY7XG4gICAgICAgIGFyZWEubG9jYXRpb25zLmFkZChsb2NhdGlvbik7XG4gICAgICAgIGFyZWEudGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICBsb2NhdGlvbnNbbG9jYXRpb25dLmFyZWFzLmFkZChhcmVhKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS50aWxlcy5hZGQodGlsZSk7XG4gICAgICAgIHRpbGVzLmdldCh0aWxlKS5hcmVhID0gYXJlYTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBleGl0c1xuICAgIGZvciAoY29uc3QgW2EsIGJdIG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIGlmICh0aWxlcy5oYXMoYSkpIHtcbiAgICAgICAgdGlsZXMuZ2V0KGEpLmV4aXQgPSBiO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkaWdlc3QgdGhlIGNoZWNrc1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgY29uc3QgYXJlYSA9IHRpbGVzLmdldCh0aWxlKS5hcmVhO1xuICAgICAgaWYgKCFhcmVhKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZXJyb3IoYEFiYW5kb25lZCBjaGVjayAke1suLi5jaGVja1NldF0ubWFwKFxuICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgeCA9PiBbLi4ueC5jaGVja3NdLm1hcCh5ID0+IHkudG9TdHJpbmcoMTYpKSlcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgfSBhdCAke3RpbGUudG9TdHJpbmcoMTYpfWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge2NoZWNrcywgcmVxdWlyZW1lbnR9IG9mIGNoZWNrU2V0KSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzKSB7XG4gICAgICAgICAgY29uc3QgZmxhZyA9IHRoaXMucm9tLmZsYWdzW2NoZWNrXSB8fCBkaWUoKTtcbiAgICAgICAgICBhcmVhLmNoZWNrcy5wdXNoKFtmbGFnLCByZXF1aXJlbWVudF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7dGlsZXMsIGFyZWFzLCBsb2NhdGlvbnN9O1xuICB9XG5cbiAgLyoqIEFkZHMgYSByb3V0ZSwgb3B0aW9uYWxseSB3aXRoIGEgcHJlcmVxdWlzaXRlIChjYW5vbmljYWwpIHNvdXJjZSB0aWxlLiAqL1xuICBhZGRSb3V0ZShyb3V0ZTogUm91dGUsIHNvdXJjZT86IFRpbGVJZCkge1xuICAgIGlmIChzb3VyY2UgIT0gbnVsbCkge1xuICAgICAgLy8gQWRkIGFuIGVkZ2UgaW5zdGVhZCBvZiBhIHJvdXRlLCByZWN1cnNpbmcgb24gdGhlIHNvdXJjZSdzXG4gICAgICAvLyByZXF1aXJlbWVudHMuXG4gICAgICB0aGlzLnJvdXRlRWRnZXMuZ2V0KHNvdXJjZSkuYWRkKHJvdXRlKTtcbiAgICAgIGZvciAoY29uc3Qgc3JjUm91dGUgb2YgdGhpcy5yb3V0ZXMuZ2V0KHNvdXJjZSkpIHtcbiAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUocm91dGUudGFyZ2V0LCBbLi4uc3JjUm91dGUsIC4uLnJvdXRlLmRlcHNdKSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFRoaXMgaXMgbm93IGFuIFwiaW5pdGlhbCByb3V0ZVwiIHdpdGggbm8gcHJlcmVxdWlzaXRlIHNvdXJjZS5cbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBMYWJlbGVkU2V0PFJvdXRlPigpO1xuICAgIGNvbnN0IHNlZW4gPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzdGFydCA9IHJvdXRlOyAvLyBUT0RPIGlubGluZVxuICAgIHF1ZXVlLmFkZChzdGFydCk7XG4gICAgY29uc3QgaXRlciA9IHF1ZXVlW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgY29uc3Qge3ZhbHVlLCBkb25lfSA9IGl0ZXIubmV4dCgpO1xuICAgICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICAgIHNlZW4uYWRkKHZhbHVlKTtcbiAgICAgIHF1ZXVlLmRlbGV0ZSh2YWx1ZSk7XG4gICAgICBjb25zdCBmb2xsb3cgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHZhbHVlLnRhcmdldDtcbiAgICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLnJvdXRlcy5nZXQodGFyZ2V0KTtcbiAgICAgIGlmIChidWlsZGVyLmFkZFJvdXRlKHZhbHVlKSkge1xuICAgICAgICBmb3IgKGNvbnN0IG5leHQgb2YgdGhpcy5yb3V0ZUVkZ2VzLmdldCh0YXJnZXQpKSB7XG4gICAgICAgICAgZm9sbG93LmFkZChuZXcgUm91dGUobmV4dC50YXJnZXQsIFsuLi52YWx1ZS5kZXBzLCAuLi5uZXh0LmRlcHNdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbmV4dCBvZiBmb2xsb3cpIHtcbiAgICAgICAgaWYgKHNlZW4uaGFzKG5leHQpKSBjb250aW51ZTtcbiAgICAgICAgcXVldWUuZGVsZXRlKG5leHQpOyAvLyByZS1hZGQgYXQgdGhlIGVuZCBvZiB0aGUgcXVldWVcbiAgICAgICAgcXVldWUuYWRkKG5leHQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgdXAgYHRoaXMuZXhpdFNldGAgdG8gaW5jbHVkZSBhbGwgdGhlIFwiZnJvbS10b1wiIHRpbGUgcGFpcnNcbiAgICogb2YgZXhpdHMgdGhhdCBfZG9uJ3RfIHNoYXJlIHRoZSBzYW1lIHRlcnJhaW4gRm9yIGFueSB0d28td2F5IGV4aXRcbiAgICogdGhhdCBzaGFyZXMgdGhlIHNhbWUgdGVycmFpbiwganVzdCBhZGQgaXQgZGlyZWN0bHkgdG8gdGhlXG4gICAqIHVuaW9uZmluZC5cbiAgICovXG4gIHJlY29yZEV4aXRzKCkge1xuICAgIC8vIEFkZCBleGl0IFRpbGVQYWlycyB0byBleGl0U2V0IGZyb20gYWxsIGxvY2F0aW9ucycgZXhpdHMuXG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9dIG9mIHRoaXMuZXhpdHMpIHtcbiAgICAgIHRoaXMuZXhpdFNldC5hZGQoXG4gICAgICAgICAgVGlsZVBhaXIub2YodGhpcy50aWxlcy5maW5kKGZyb20pLCB0aGlzLnRpbGVzLmZpbmQodG8pKSk7XG4gICAgfVxuICAgIC8vIExvb2sgZm9yIHR3by13YXkgZXhpdHMgd2l0aCB0aGUgc2FtZSB0ZXJyYWluOiByZW1vdmUgdGhlbSBmcm9tXG4gICAgLy8gZXhpdFNldCBhbmQgYWRkIHRoZW0gdG8gdGhlIHRpbGVzIHVuaW9uZmluZC5cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0U2V0KSB7XG4gICAgICBjb25zdCBbZnJvbSwgdG9dID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgICBpZiAodGhpcy50ZXJyYWlucy5nZXQoZnJvbSkgIT09IHRoaXMudGVycmFpbnMuZ2V0KHRvKSkgY29udGludWU7XG4gICAgICBjb25zdCByZXZlcnNlID0gVGlsZVBhaXIub2YodG8sIGZyb20pO1xuICAgICAgaWYgKHRoaXMuZXhpdFNldC5oYXMocmV2ZXJzZSkpIHtcbiAgICAgICAgdGhpcy50aWxlcy51bmlvbihbZnJvbSwgdG9dKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmRlbGV0ZShleGl0KTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmRlbGV0ZShyZXZlcnNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBkaWZmZXJlbnQtdGVycmFpbiBuZWlnaGJvcnMgaW4gdGhlIHNhbWUgbG9jYXRpb24uICBBZGRcbiAgICogcmVwcmVzZW50YXRpdmUgZWxlbWVudHMgdG8gYHRoaXMubmVpZ2hib3JzYCB3aXRoIGFsbCB0aGVcbiAgICogZGlyZWN0aW9ucyB0aGF0IGl0IG5laWdoYm9ycyBpbi4gIEFsc28gYWRkIGV4aXRzIGFzIG5laWdoYm9ycy5cbiAgICogVGhpcyBtdXN0IGhhcHBlbiAqYWZ0ZXIqIHRoZSBlbnRpcmUgdW5pb25maW5kIGlzIGNvbXBsZXRlIHNvXG4gICAqIHRoYXQgd2UgY2FuIGxldmVyYWdlIGl0LlxuICAgKi9cbiAgYnVpbGROZWlnaGJvcnMoKSB7XG4gICAgLy8gQWRqYWNlbnQgZGlmZmVyZW50LXRlcnJhaW4gdGlsZXMuXG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgaWYgKCF0ZXJyYWluKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGNvbnN0IHR5MSA9IHRoaXMudGVycmFpbnMuZ2V0KHkxKTtcbiAgICAgIGlmICh0eTEgJiYgdHkxICE9PSB0ZXJyYWluKSB7XG4gICAgICAgIHRoaXMuaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModGlsZSwgeTEsIERpci5Ob3J0aCk7XG4gICAgICB9XG4gICAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgICBjb25zdCB0eDEgPSB0aGlzLnRlcnJhaW5zLmdldCh4MSk7XG4gICAgICBpZiAodHgxICYmIHR4MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHgxLCBEaXIuV2VzdCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEV4aXRzIChqdXN0IHVzZSBcIm5vcnRoXCIgZm9yIHRoZXNlKS5cbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgdGhpcy5leGl0U2V0KSB7XG4gICAgICBjb25zdCBbdDAsIHQxXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0MCkgfHwgIXRoaXMudGVycmFpbnMuaGFzKHQxKSkgY29udGludWU7XG4gICAgICBjb25zdCBwID0gVGlsZVBhaXIub2YodGhpcy50aWxlcy5maW5kKHQwKSwgdGhpcy50aWxlcy5maW5kKHQxKSk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocCwgdGhpcy5uZWlnaGJvcnMuZ2V0KHApIHwgMSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlQWRqYWNlbnROZWlnaGJvcnModDA6IFRpbGVJZCwgdDE6IFRpbGVJZCwgZGlyOiBEaXIpIHtcbiAgICAvLyBOT1RFOiB0MCA8IHQxIGJlY2F1c2UgZGlyIGlzIGFsd2F5cyBXRVNUIG9yIE5PUlRILlxuICAgIGNvbnN0IGMwID0gdGhpcy50aWxlcy5maW5kKHQwKTtcbiAgICBjb25zdCBjMSA9IHRoaXMudGlsZXMuZmluZCh0MSk7XG4gICAgaWYgKCF0aGlzLnNlYW1sZXNzRXhpdHMuaGFzKHQxKSkge1xuICAgICAgLy8gMSAtPiAwICh3ZXN0L25vcnRoKS4gIElmIDEgaXMgYW4gZXhpdCB0aGVuIHRoaXMgZG9lc24ndCB3b3JrLlxuICAgICAgY29uc3QgcDEwID0gVGlsZVBhaXIub2YoYzEsIGMwKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMTAsIHRoaXMubmVpZ2hib3JzLmdldChwMTApIHwgKDEgPDwgZGlyKSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MCkpIHtcbiAgICAgIC8vIDAgLT4gMSAoZWFzdC9zb3V0aCkuICBJZiAwIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IG9wcCA9IGRpciBeIDI7XG4gICAgICBjb25zdCBwMDEgPSBUaWxlUGFpci5vZihjMCwgYzEpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAwMSwgdGhpcy5uZWlnaGJvcnMuZ2V0KHAwMSkgfCAoMSA8PCBvcHApKTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBjb25zdCB3YWxscyA9IG5ldyBNYXA8U2NyZWVuSWQsIFdhbGxUeXBlPigpO1xuICAgIGNvbnN0IHNob290aW5nU3RhdHVlcyA9IG5ldyBTZXQ8U2NyZWVuSWQ+KCk7XG4gICAgY29uc3QgaW5Ub3dlciA9IChsb2NhdGlvbi5pZCAmIDB4ZjgpID09PSAweDU4O1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBXYWxscyBuZWVkIHRvIGNvbWUgZmlyc3Qgc28gd2UgY2FuIGF2b2lkIGFkZGluZyBzZXBhcmF0ZVxuICAgICAgLy8gcmVxdWlyZW1lbnRzIGZvciBldmVyeSBzaW5nbGUgd2FsbCAtIGp1c3QgdXNlIHRoZSB0eXBlLlxuICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIHdhbGxzLnNldChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIChzcGF3bi5pZCAmIDMpIGFzIFdhbGxUeXBlKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24uaWQgPT09IDB4M2YpIHsgLy8gc2hvb3Rpbmcgc3RhdHVlc1xuICAgICAgICBzaG9vdGluZ1N0YXR1ZXMuYWRkKFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgdGlsZXNldCA9IHRoaXMucm9tLnRpbGVzZXRzW2xvY2F0aW9uLnRpbGVzZXRdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXTtcblxuICAgIGNvbnN0IGdldEVmZmVjdHMgPSAodGlsZTogVGlsZUlkKSA9PiB7XG4gICAgICBjb25zdCBzID0gbG9jYXRpb24uc2NyZWVuc1sodGlsZSAmIDB4ZjAwMCkgPj4+IDEyXVsodGlsZSAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgICByZXR1cm4gdGlsZUVmZmVjdHMuZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3NdLnRpbGVzW3RpbGUgJiAweGZmXV07XG4gICAgfTtcblxuICAgIC8vIFJldHVybnMgdW5kZWZpbmVkIGlmIGltcGFzc2FibGUuXG4gICAgY29uc3QgbWFrZVRlcnJhaW4gPSAoZWZmZWN0czogbnVtYmVyLCB0aWxlOiBUaWxlSWQsIGJhcnJpZXI6IGJvb2xlYW4pID0+IHtcbiAgICAgIC8vIENoZWNrIGZvciBkb2xwaGluIG9yIHN3YW1wLiAgQ3VycmVudGx5IGRvbid0IHN1cHBvcnQgc2h1ZmZsaW5nIHRoZXNlLlxuICAgICAgZWZmZWN0cyAmPSBUZXJyYWluLkJJVFM7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4MWEpIGVmZmVjdHMgfD0gVGVycmFpbi5TV0FNUDtcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2MCB8fCBsb2NhdGlvbi5pZCA9PT0gMHg2OCkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIC8vIE5PVEU6IG9ubHkgdGhlIHRvcCBoYWxmLXNjcmVlbiBpbiB1bmRlcmdyb3VuZCBjaGFubmVsIGlzIGRvbHBoaW5hYmxlXG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjQgJiYgKCh0aWxlICYgMHhmMGYwKSA8IDB4MTAzMCkpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICBpZiAoYmFycmllcikgZWZmZWN0cyB8PSBUZXJyYWluLkJBUlJJRVI7XG4gICAgICBpZiAoIShlZmZlY3RzICYgVGVycmFpbi5ET0xQSElOKSAmJiBlZmZlY3RzICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgbGVuZ3RoIG9mIHNsb3BlOiBzaG9ydCBzbG9wZXMgYXJlIGNsaW1iYWJsZS5cbiAgICAgICAgLy8gNi04IGFyZSBib3RoIGRvYWJsZSB3aXRoIGJvb3RzXG4gICAgICAgIC8vIDAtNSBpcyBkb2FibGUgd2l0aCBubyBib290c1xuICAgICAgICAvLyA5IGlzIGRvYWJsZSB3aXRoIHJhYmJpdCBib290cyBvbmx5IChub3QgYXdhcmUgb2YgYW55IG9mIHRoZXNlLi4uKVxuICAgICAgICAvLyAxMCBpcyByaWdodCBvdXRcbiAgICAgICAgbGV0IGJvdHRvbSA9IHRpbGU7XG4gICAgICAgIGxldCBoZWlnaHQgPSAwO1xuICAgICAgICB3aGlsZSAoZ2V0RWZmZWN0cyhib3R0b20pICYgVGVycmFpbi5TTE9QRSkge1xuICAgICAgICAgIGJvdHRvbSA9IFRpbGVJZC5hZGQoYm90dG9tLCAxLCAwKTtcbiAgICAgICAgICBoZWlnaHQrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVpZ2h0IDwgNikge1xuICAgICAgICAgIGVmZmVjdHMgJj0gflRlcnJhaW4uU0xPUEU7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgOSkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTg7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVpZ2h0IDwgMTApIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZWZmZWN0cyAmIFRlcnJhaW4uUEFJTikge1xuICAgICAgICAvLyBQYWluIHRlcnJhaW5zIGFyZSBvbmx5IGltcGFzc2libGUgaWYgdGhleSdyZSBhbGwgc3Vycm91bmRlZFxuICAgICAgICAvLyBieSBvdGhlciBwYWluIHRlcnJhaW5zLlxuICAgICAgICB0eXBlIERlbHRhID0gW251bWJlciwgbnVtYmVyXVtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRlbHRhIG9mIFtbMCwgMV0sIFsxLCAwXSwgWzAsIC0xXSwgWy0xLCAwXV0gYXMgRGVsdGEpIHtcbiAgICAgICAgICBpZiAoIShnZXRFZmZlY3RzKFRpbGVJZC5hZGQodGlsZSwgLi4uZGVsdGEpKSAmXG4gICAgICAgICAgICAgICAgKFRlcnJhaW4uUEFJTiB8IFRlcnJhaW4uRkxZKSkpIHtcbiAgICAgICAgICAgIGVmZmVjdHMgJj0gflRlcnJhaW4uUEFJTjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudGVycmFpbkZhY3RvcnkudGlsZShlZmZlY3RzKTtcbiAgICB9O1xuXG4gICAgZm9yIChsZXQgeSA9IDAsIGhlaWdodCA9IGxvY2F0aW9uLmhlaWdodDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBsb2NhdGlvbi5zY3JlZW5zW3ldO1xuICAgICAgY29uc3Qgcm93SWQgPSBsb2NhdGlvbi5pZCA8PCA4IHwgeSA8PCA0O1xuICAgICAgZm9yIChsZXQgeCA9IDAsIHdpZHRoID0gbG9jYXRpb24ud2lkdGg7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHRoaXMucm9tLnNjcmVlbnNbcm93W3hdXTtcbiAgICAgICAgY29uc3Qgc2NyZWVuSWQgPSBTY3JlZW5JZChyb3dJZCB8IHgpO1xuICAgICAgICBjb25zdCBiYXJyaWVyID0gc2hvb3RpbmdTdGF0dWVzLmhhcyhzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWdZeCA9IHNjcmVlbklkICYgMHhmZjtcbiAgICAgICAgY29uc3Qgd2FsbCA9IHdhbGxzLmdldChzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWcgPVxuICAgICAgICAgICAgaW5Ub3dlciA/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQgOlxuICAgICAgICAgICAgd2FsbCAhPSBudWxsID8gdGhpcy53YWxsQ2FwYWJpbGl0eSh3YWxsKSA6XG4gICAgICAgICAgICBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IGZsYWdZeCk/LmZsYWc7XG4gICAgICAgIGNvbnN0IHBpdCA9IGxvY2F0aW9uLnBpdHMuZmluZChwID0+IHAuZnJvbVNjcmVlbiA9PT0gc2NyZWVuSWQpO1xuICAgICAgICBpZiAocGl0KSB7XG4gICAgICAgICAgdGhpcy5leGl0cy5zZXQoVGlsZUlkKHNjcmVlbklkIDw8IDggfCAweDg4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBUaWxlSWQocGl0LnRvU2NyZWVuIDw8IDggfCAweDg4KSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbG9naWM6IExvZ2ljID0gdGhpcy5yb20uZmxhZ3NbZmxhZyFdPy5sb2dpYyA/PyB7fTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWQgPSBUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IHQpO1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBpZiAobG9naWMuYXNzdW1lVHJ1ZSAmJiB0aWxlIDwgMHgyMCkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZWZmZWN0cyA9IGxvY2F0aW9uLmlzU2hvcCgpID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgbGV0IHRlcnJhaW4gPSBtYWtlVGVycmFpbihlZmZlY3RzLCB0aWQsIGJhcnJpZXIpO1xuICAgICAgICAgIC8vaWYgKCF0ZXJyYWluKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICBpZiAodGlsZSA8IDB4MjAgJiYgdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdICE9PSB0aWxlICYmXG4gICAgICAgICAgICAgIGZsYWcgIT0gbnVsbCAmJiAhbG9naWMuYXNzdW1lVHJ1ZSAmJiAhbG9naWMuYXNzdW1lRmFsc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0ZSA9XG4gICAgICAgICAgICAgICAgbWFrZVRlcnJhaW4odGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV1dLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAgIC8vaWYgKCFhbHRlcm5hdGUpIHRocm93IG5ldyBFcnJvcihgYmFkIHRlcnJhaW4gZm9yIGFsdGVybmF0ZWApO1xuICAgICAgICAgICAgaWYgKGFsdGVybmF0ZSkge1xuICAgICAgICAgICAgICAvLyBOT1RFOiB0aGVyZSdzIGFuIG9kZGl0eSBmcm9tIGhvbGxvd2luZyBvdXQgdGhlIGJhY2tzIG9mIGlyb25cbiAgICAgICAgICAgICAgLy8gd2FsbHMgdGhhdCBvbmUgY29ybmVyIG9mIHN0b25lIHdhbGxzIGFyZSBhbHNvIGhvbGxvd2VkIG91dCxcbiAgICAgICAgICAgICAgLy8gYnV0IG9ubHkgcHJlLWZsYWcuICBJdCBkb2Vzbid0IGFjdHVhbGx5IGh1cnQgYW55dGhpbmcuXG4gICAgICAgICAgICAgIHRlcnJhaW4gPVxuICAgICAgICAgICAgICAgICAgdGhpcy50ZXJyYWluRmFjdG9yeS5mbGFnKHRlcnJhaW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9naWMudHJhY2sgPyBmbGFnIDogLTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRlcnJhaW4pIHRoaXMudGVycmFpbnMuc2V0KHRpZCwgdGVycmFpbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDbG9iYmVyIHRlcnJhaW4gd2l0aCBzZWFtbGVzcyBleGl0c1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgY29uc3Qge2Rlc3QsIGVudHJhbmNlfSA9IGV4aXQ7XG4gICAgICBjb25zdCBmcm9tID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgLy8gU2VhbWxlc3MgZXhpdHMgKDB4MjApIGlnbm9yZSB0aGUgZW50cmFuY2UgaW5kZXgsIGFuZFxuICAgICAgLy8gaW5zdGVhZCBwcmVzZXJ2ZSB0aGUgVGlsZUlkLCBqdXN0IGNoYW5naW5nIHRoZSBsb2NhdGlvbi5cbiAgICAgIGxldCB0bzogVGlsZUlkO1xuICAgICAgaWYgKGV4aXQuaXNTZWFtbGVzcygpKSB7XG4gICAgICAgIHRvID0gVGlsZUlkKGZyb20gJiAweGZmZmYgfCAoZGVzdCA8PCAxNikpO1xuICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgICB0aGlzLnNlYW1sZXNzRXhpdHMuYWRkKHRpbGUpO1xuICAgICAgICBjb25zdCBwcmV2aW91cyA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgICBpZiAocHJldmlvdXMpIHtcbiAgICAgICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5LnNlYW1sZXNzKHByZXZpb3VzKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvID0gdGhpcy5lbnRyYW5jZSh0aGlzLnJvbS5sb2NhdGlvbnNbZGVzdF0sIGVudHJhbmNlICYgMHgxZik7XG4gICAgICB9XG4gICAgICB0aGlzLmV4aXRzLnNldChmcm9tLCB0byk7XG4gICAgICBpZiAoZGVzdCA9PT0gdGhpcy5yb20ubG9jYXRpb25zLkxpbWVUcmVlTGFrZS5pZCAmJlxuICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5MaW1lVHJlZUxha2UuZW50cmFuY2VzW2VudHJhbmNlXS55ID4gMHhhMCkge1xuICAgICAgICAvLyBOb3J0aCBleGl0IHRvIGxpbWUgdHJlZSBsYWtlOiBtYXJrIGxvY2F0aW9uLlxuICAgICAgICB0aGlzLmxpbWVUcmVlRW50cmFuY2VMb2NhdGlvbiA9IGxvY2F0aW9uLmlkO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvblNwYXducyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc1RyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NOcGMobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNCb3NzKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQm9zcyhsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0NoZXN0KCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzQ2hlc3QobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTW9uc3Rlcihsb2NhdGlvbiwgc3Bhd24pO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi50eXBlID09PSAzICYmIHNwYXduLmlkID09PSAweGUwKSB7XG4gICAgICAgIC8vIFdpbmRtaWxsIGJsYWRlczogdGhlIGNhdmUgZmxhZyAoMmVlKSBpc24ndCBzZXQgZGlyZWN0bHkgYnkgdXNpbmcgdGhlXG4gICAgICAgIC8vIGtleS4gIFJhdGhlciwgdGhlIHdpbmRtaWxsIGJsYWRlcyAoZTAsIGFjdGlvbiA1MSBhdCAkMzY2ZGIpIGNoZWNrIGZvclxuICAgICAgICAvLyAwMGEgdG8gc3Bhd24gZXhwbG9zaW9uIGFuZCBzZXQgMmVlLlxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoXG4gICAgICAgICAgICBIaXRib3guc2NyZWVuKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpLFxuICAgICAgICAgICAgdGhpcy5yb20uZmxhZ3MuVXNlZFdpbmRtaWxsS2V5LnIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gRm9yIHRyaWdnZXJzLCB3aGljaCB0aWxlcyBkbyB3ZSBtYXJrP1xuICAgIC8vIFRoZSB0cmlnZ2VyIGhpdGJveCBpcyAyIHRpbGVzIHdpZGUgYW5kIDEgdGlsZSB0YWxsLCBidXQgaXQgZG9lcyBub3RcbiAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgIC8vICRjIHdpZGUgKHRob3VnaCBpdCdzICQxNCB0YWxsKSBzbyB0aGVyZSdzIHNvbWUgc2xpZ2h0IGRpc3Bhcml0eS5cbiAgICAvLyBJdCBzZWVtcyBsaWtlIHByb2JhYmx5IG1hcmtpbmcgaXQgYXMgKHgtMSwgeS0xKSAuLiAoeCwgeSkgbWFrZXMgdGhlXG4gICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAvLyB0aWxlIHNob3VsZCBnbyBmcm9tIHggLi4geCsxIGluc3RlYWQuXG5cbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY2hlY2tpbmcgdHJpZ2dlcidzIGFjdGlvbjogJDE5IC0+IHB1c2gtZG93biBtZXNzYWdlXG5cbiAgICAvLyBUT0RPIC0gcHVsbCBvdXQgdGhpcy5yZWNvcmRUcmlnZ2VyVGVycmFpbigpIGFuZCB0aGlzLnJlY29yZFRyaWdnZXJDaGVjaygpXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMucm9tLnRyaWdnZXIoc3Bhd24uaWQpO1xuICAgIGlmICghdHJpZ2dlcikgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHRyaWdnZXIgJHtzcGF3bi5pZC50b1N0cmluZygxNil9YCk7XG5cbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuICAgIGxldCBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJBbnRpUmVxdWlyZW1lbnRzKHRyaWdnZXIuY29uZGl0aW9ucyk7XG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBsZXQgaGl0Ym94ID0gSGl0Ym94LnRyaWdnZXIobG9jYXRpb24sIHNwYXduKTtcblxuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiB0cmlnZ2VyLmZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgY2hlY2tzKTtcblxuICAgIHN3aXRjaCAodHJpZ2dlci5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDE5OlxuICAgICAgICAvLyBwdXNoLWRvd24gdHJpZ2dlclxuICAgICAgICBpZiAodHJpZ2dlci5pZCA9PT0gMHg4NiAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVJhYmJpdFNraXAoKSkge1xuICAgICAgICAgIC8vIGJpZ2dlciBoaXRib3ggdG8gbm90IGZpbmQgdGhlIHBhdGggdGhyb3VnaFxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTFdLCBbMCwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHRyaWdnZXIuaWQgPT09IDB4YmEgJiZcbiAgICAgICAgICAgICAgICAgICAhdGhpcy5mbGFnc2V0LmFzc3VtZVRlbGVwb3J0U2tpcCgpICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5kaXNhYmxlVGVsZXBvcnRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBjb3B5IHRoZSB0ZWxlcG9ydCBoaXRib3ggaW50byB0aGUgb3RoZXIgc2lkZSBvZiBjb3JkZWxcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYXRMb2NhdGlvbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluRWFzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuQ29yZGVsUGxhaW5XZXN0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVRyaWdnZXJHbGl0Y2goKSkge1xuICAgICAgICAgIC8vIGFsbCBwdXNoLWRvd24gdHJpZ2dlcnMgY2FuIGJlIHNraXBwZWQgd2l0aCB0cmlnZ2VyIHNraXAuLi5cbiAgICAgICAgICBhbnRpUmVxdWlyZW1lbnRzID0gUmVxdWlyZW1lbnQub3IoYW50aVJlcXVpcmVtZW50cywgdGhpcy5yb20uZmxhZ3MuVHJpZ2dlclNraXAucik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoYW50aVJlcXVpcmVtZW50cykpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFkOlxuICAgICAgICAvLyBzdGFydCBtYWRvIDEgYm9zcyBmaWdodFxuICAgICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5NYWRvMSwgcmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwODogY2FzZSAweDBiOiBjYXNlIDB4MGM6IGNhc2UgMHgwZDogY2FzZSAweDBmOlxuICAgICAgICAvLyBmaW5kIGl0ZW1ncmFudCBmb3IgdHJpZ2dlciBJRCA9PiBhZGQgY2hlY2tcbiAgICAgICAgdGhpcy5hZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94LCByZXF1aXJlbWVudHMsIHRyaWdnZXIuaWQpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDE4OiB7IC8vIHN0b20gZmlnaHRcbiAgICAgICAgLy8gU3BlY2lhbCBjYXNlOiB3YXJwIGJvb3RzIGdsaXRjaCByZXF1aXJlZCBpZiBjaGFyZ2Ugc2hvdHMgb25seS5cbiAgICAgICAgY29uc3QgcmVxID1cbiAgICAgICAgICB0aGlzLmZsYWdzZXQuY2hhcmdlU2hvdHNPbmx5KCkgP1xuICAgICAgICAgIFJlcXVpcmVtZW50Lm1lZXQocmVxdWlyZW1lbnRzLCBhbmQodGhpcy5yb20uZmxhZ3MuV2FycEJvb3RzKSkgOlxuICAgICAgICAgIHJlcXVpcmVtZW50cztcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsIHRoaXMucm9tLmZsYWdzLlN0b21GaWdodFJld2FyZC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgMHgxZTpcbiAgICAgICAgLy8gZm9yZ2UgY3J5c3RhbGlzXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnRzLCB0aGlzLnJvbS5mbGFncy5NZXNpYUluVG93ZXIuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWY6XG4gICAgICAgIHRoaXMuaGFuZGxlQm9hdCh0aWxlLCBsb2NhdGlvbiwgcmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYjpcbiAgICAgICAgLy8gTW92aW5nIGd1YXJkXG4gICAgICAgIC8vIHRyZWF0IHRoaXMgYXMgYSBzdGF0dWU/ICBidXQgdGhlIGNvbmRpdGlvbnMgYXJlIG5vdCBzdXBlciB1c2VmdWwuLi5cbiAgICAgICAgLy8gICAtIG9ubHkgdHJhY2tlZCBjb25kaXRpb25zIG1hdHRlcj8gOWUgPT0gcGFyYWx5c2lzLi4uIGV4Y2VwdCBub3QuXG4gICAgICAgIC8vIHBhcmFseXphYmxlPyAgY2hlY2sgRGF0YVRhYmxlXzM1MDQ1XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdGhpcy5yb20ubG9jYXRpb25zLlBvcnRvYV9QYWxhY2VFbnRyYW5jZSkge1xuICAgICAgICAgIC8vIFBvcnRvYSBwYWxhY2UgZnJvbnQgZ3VhcmQgbm9ybWFsbHkgYmxvY2tzIG9uIE1lc2lhIHJlY29yZGluZy5cbiAgICAgICAgICAvLyBCdXQgdGhlIHF1ZWVuIGlzIGFjdHVhbGx5IGFjY2Vzc2libGUgd2l0aG91dCBzZWVpbmcgdGhlIHJlY29yZGluZy5cbiAgICAgICAgICAvLyBJbnN0ZWFkLCBibG9jayBhY2Nlc3MgdG8gdGhlIHRocm9uZSByb29tIG9uIGJlaW5nIGFibGUgdG8gdGFsayB0b1xuICAgICAgICAgIC8vIHRoZSBmb3J0dW5lIHRlbGxlciwgaW4gY2FzZSB0aGUgZ3VhcmQgbW92ZXMgYmVmb3JlIHdlIGNhbiBnZXQgdGhlXG4gICAgICAgICAgLy8gaXRlbS4gIEFsc28gbW92ZSB0aGUgaGl0Ym94IHVwIHNpbmNlIHRoZSB0d28gc2lkZSByb29tcyBfYXJlXyBzdGlsbFxuICAgICAgICAgIC8vIGFjY2Vzc2libGUuXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFstMiwgMF0pO1xuICAgICAgICAgIGFudGlSZXF1aXJlbWVudHMgPSB0aGlzLnJvbS5mbGFncy5UYWxrZWRUb0ZvcnR1bmVUZWxsZXIucjtcbiAgICAgICAgfVxuICAgICAgICAvLyBOb3RlOiBhbnRpUmVxdWlyZW1lbnRzIG11c3QgYmUgbWV0IGluIG9yZGVyIHRvIGdldCB0aHJvdWdoLCBzaW5jZSB3ZVxuICAgICAgICAvLyBuZWVkIHRoZSBndWFyZCBfbm90XyB0byBtb3ZlLlxuICAgICAgICB0aGlzLmhhbmRsZU1vdmluZ0d1YXJkKGhpdGJveCwgbG9jYXRpb24sIGFudGlSZXF1aXJlbWVudHMpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KHNwYXduLnR5cGUgPDwgOCB8IHNwYXduLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlcXVpcmVtZW50Lk9QRU4sIGl0ZW0sIHVzZSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc05wYyhsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIGNvbnN0IG5wYyA9IHRoaXMucm9tLm5wY3Nbc3Bhd24uaWRdO1xuICAgIGlmICghbnBjIHx8ICFucGMudXNlZCkgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIG5wYzogJHtoZXgoc3Bhd24uaWQpfWApO1xuICAgIGNvbnN0IHNwYXduQ29uZGl0aW9ucyA9IG5wYy5zcGF3bkNvbmRpdGlvbnMuZ2V0KGxvY2F0aW9uLmlkKSB8fCBbXTtcbiAgICBjb25zdCByZXEgPSB0aGlzLmZpbHRlclJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbnMpOyAvLyBzaG91bGQgYmUgc2luZ2xlXG5cbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcblxuICAgIC8vIE5PVEU6IFJhZ2UgaGFzIG5vIHdhbGthYmxlIG5laWdoYm9ycywgYW5kIHdlIG5lZWQgdGhlIHNhbWUgaGl0Ym94XG4gICAgLy8gZm9yIGJvdGggdGhlIHRlcnJhaW4gYW5kIHRoZSBjaGVjay5cbiAgICAvL1xuICAgIC8vIE5PVEUgQUxTTyAtIFJhZ2UgcHJvYmFibHkgc2hvd3MgdXAgYXMgYSBib3NzLCBub3QgYW4gTlBDP1xuICAgIGxldCBoaXRib3g6IEhpdGJveCA9XG4gICAgICAgIFt0aGlzLnRlcnJhaW5zLmhhcyh0aWxlKSA/IHRpbGUgOiB0aGlzLndhbGthYmxlTmVpZ2hib3IodGlsZSkgPz8gdGlsZV07XG5cbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KHNwYXduLnR5cGUgPDwgOCB8IHNwYXduLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShoaXRib3gsIHJlcSwgaXRlbSwgdXNlKTtcbiAgICB9XG5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlNhYmVyYURpc2d1aXNlZEFzTWVzaWEpIHtcbiAgICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgdGhpcy5yb20uYm9zc2VzLlNhYmVyYTEsIHJlcSk7XG4gICAgfVxuXG4gICAgaWYgKChucGMuZGF0YVsyXSAmIDB4MDQpICYmICF0aGlzLmZsYWdzZXQuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHtcbiAgICAgIGxldCBhbnRpUmVxO1xuICAgICAgYW50aVJlcSA9IHRoaXMuZmlsdGVyQW50aVJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbnMpO1xuICAgICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5SYWdlKSB7XG4gICAgICAgIC8vIFRPRE8gLSBtb3ZlIGhpdGJveCBkb3duLCBjaGFuZ2UgcmVxdWlyZW1lbnQ/XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMiwgLTFdLCBbMiwgMF0sIFsyLCAxXSwgWzIsIDJdKTtcbiAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAtNl0sIFswLCAtMl0sIFswLCAyXSwgWzAsIDZdKTtcbiAgICAgICAgLy8gVE9ETyAtIGNoZWNrIGlmIHRoaXMgd29ya3M/ICB0aGUgfmNoZWNrIHNwYXduIGNvbmRpdGlvbiBzaG91bGRcbiAgICAgICAgLy8gYWxsb3cgcGFzc2luZyBpZiBnb3R0ZW4gdGhlIGNoZWNrLCB3aGljaCBpcyB0aGUgc2FtZSBhcyBnb3R0ZW5cbiAgICAgICAgLy8gdGhlIGNvcnJlY3Qgc3dvcmQuXG4gICAgICAgIC8vIFRPRE8gLSBpcyB0aGlzIGV2ZW4gcmVxdWlyZWQgb25jZSB3ZSBoYXZlIHRoZSBSYWdlVGVycmFpbj8/P1xuICAgICAgICAvLyBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVJhZ2VTa2lwKCkpIGFudGlSZXEgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Qb3J0b2FUaHJvbmVSb29tQmFja0Rvb3JHdWFyZCkge1xuICAgICAgICAvLyBQb3J0b2EgYmFjayBkb29yIGd1YXJkIHNwYXducyBpZiAoMSkgdGhlIG1lc2lhIHJlY29yZGluZyBoYXMgbm90IHlldFxuICAgICAgICAvLyBiZWVuIHBsYXllZCwgYW5kICgyKSB0aGUgcGxheWVyIGRpZG4ndCBzbmVhayBwYXN0IHRoZSBlYXJsaWVyIGd1YXJkLlxuICAgICAgICAvLyBXZSBjYW4gc2ltdWxhdGUgdGhpcyBieSBoYXJkLWNvZGluZyBhIHJlcXVpcmVtZW50IG9uIGVpdGhlciB0byBnZXRcbiAgICAgICAgLy8gcGFzdCBoaW0uXG4gICAgICAgIGFudGlSZXEgPSBSZXF1aXJlbWVudC5vcih0aGlzLnJvbS5mbGFncy5NZXNpYVJlY29yZGluZy5yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kKHRoaXMucm9tLmZsYWdzLlBhcmFseXNpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJvbS5mbGFncy5RdWVlbk5vdEluVGhyb25lUm9vbSkpO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuU29sZGllckd1YXJkKSB7XG4gICAgICAgIGFudGlSZXEgPSB1bmRlZmluZWQ7IC8vIHRoZXknbGwganVzdCBhdHRhY2sgaWYgYXBwcm9hY2hlZC5cbiAgICAgIH1cbiAgICAgIC8vIGlmIHNwYXduIGlzIGFsd2F5cyBmYWxzZSB0aGVuIHJlcSBuZWVkcyB0byBiZSBvcGVuP1xuICAgICAgaWYgKGFudGlSZXEpIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXEpKTtcbiAgICB9XG5cbiAgICAvLyBGb3J0dW5lIHRlbGxlciBjYW4gYmUgdGFsa2VkIHRvIGFjcm9zcyB0aGUgZGVzay5cbiAgICBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLkZvcnR1bmVUZWxsZXIpIHtcbiAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgMF0sIFsyLCAwXSk7XG4gICAgfVxuXG4gICAgLy8gcmVxIGlzIG5vdyBtdXRhYmxlXG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcSkpIHJldHVybjsgLy8gbm90aGluZyB0byBkbyBpZiBpdCBuZXZlciBzcGF3bnMuXG4gICAgY29uc3QgW1suLi5jb25kc11dID0gcmVxO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBnbG9iYWwgZGlhbG9ncyAtIGRvIG5vdGhpbmcgaWYgd2UgY2FuJ3QgcGFzcyB0aGVtLlxuICAgIGZvciAoY29uc3QgZCBvZiBucGMuZ2xvYmFsRGlhbG9ncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmZsYWcoZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlIHx8IGZjPy5sb2dpYy5hc3N1bWVUcnVlKSByZXR1cm47XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgYXBwcm9wcmlhdGUgbG9jYWwgZGlhbG9nc1xuICAgIGNvbnN0IGxvY2FscyA9XG4gICAgICAgIG5wYy5sb2NhbERpYWxvZ3MuZ2V0KGxvY2F0aW9uLmlkKSA/PyBucGMubG9jYWxEaWFsb2dzLmdldCgtMSkgPz8gW107XG4gICAgZm9yIChjb25zdCBkIG9mIGxvY2Fscykge1xuICAgICAgLy8gQ29tcHV0ZSB0aGUgY29uZGl0aW9uICdyJyBmb3IgdGhpcyBtZXNzYWdlLlxuICAgICAgY29uc3QgciA9IFsuLi5jb25kc107XG4gICAgICBjb25zdCBmMCA9IHRoaXMuZmxhZyhkLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBmMSA9IHRoaXMuZmxhZyh+ZC5jb25kaXRpb24pO1xuICAgICAgaWYgKGYwPy5sb2dpYy50cmFjaykgci5wdXNoKGYwLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICBpZiAoIWYwPy5sb2dpYy5hc3N1bWVGYWxzZSAmJiAhZjE/LmxvZ2ljLmFzc3VtZVRydWUpIHtcbiAgICAgICAgLy8gT25seSBwcm9jZXNzIHRoaXMgZGlhbG9nIGlmIGl0J3MgcG9zc2libGUgdG8gcGFzcyB0aGUgY29uZGl0aW9uLlxuICAgICAgICB0aGlzLnByb2Nlc3NEaWFsb2coaGl0Ym94LCBucGMsIHIsIGQpO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgaWYgd2UgY2FuIG5ldmVyIGFjdHVhbGx5IGdldCBwYXN0IHRoaXMgZGlhbG9nLlxuICAgICAgaWYgKGYwPy5sb2dpYy5hc3N1bWVUcnVlIHx8IGYxPy5sb2dpYy5hc3N1bWVGYWxzZSkgYnJlYWs7XG4gICAgICAvLyBBZGQgYW55IG5ldyBjb25kaXRpb25zIHRvICdjb25kcycgdG8gZ2V0IGJleW9uZCB0aGlzIG1lc3NhZ2UuXG4gICAgICBpZiAoZjE/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNvbmRzLnB1c2goZjEuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzRGlhbG9nKGhpdGJveDogSGl0Ym94LCBucGM6IE5wYyxcbiAgICAgICAgICAgICAgICByZXE6IHJlYWRvbmx5IENvbmRpdGlvbltdLCBkaWFsb2c6IExvY2FsRGlhbG9nKSB7XG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIFtyZXFdLCBkaWFsb2cuZmxhZ3MpO1xuXG4gICAgY29uc3QgaW5mbyA9IHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfTtcbiAgICBzd2l0Y2ggKGRpYWxvZy5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDA4OiAvLyBvcGVuIHN3YW4gZ2F0ZVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCBbcmVxXSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGM6IC8vIGR3YXJmIGNoaWxkIHN0YXJ0cyBmb2xsb3dpbmdcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwZDogLy8gbnBjIHdhbGtzIGF3YXlcbiAgICAgIC8vICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxNDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuU2xpbWVkS2Vuc3UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDEwOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFzaW5hSW5CYWNrUm9vbS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTE6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMV0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDAzOlxuICAgICAgY2FzZSAweDBhOiAvLyBub3JtYWxseSB0aGlzIGhhcmQtY29kZXMgZ2xvd2luZyBsYW1wLCBidXQgd2UgZXh0ZW5kZWQgaXRcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVswXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDk6XG4gICAgICAgIC8vIElmIHplYnUgc3R1ZGVudCBoYXMgYW4gaXRlbS4uLj8gIFRPRE8gLSBzdG9yZSBmZiBpZiB1bnVzZWRcbiAgICAgICAgY29uc3QgaXRlbSA9IG5wYy5kYXRhWzFdO1xuICAgICAgICBpZiAoaXRlbSAhPT0gMHhmZikgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBpdGVtLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Ba2FoYW5hRmx1dGVPZkxpbWVUcmFkZWluLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYTpcbiAgICAgICAgLy8gVE9ETyAtIGNhbiB3ZSByZWFjaCB0aGlzIHNwb3Q/ICBtYXkgbmVlZCB0byBtb3ZlIGRvd24/XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlJhZ2UuaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFiOlxuICAgICAgICAvLyBSYWdlIHRocm93aW5nIHBsYXllciBvdXQuLi5cbiAgICAgICAgLy8gVGhpcyBzaG91bGQgYWN0dWFsbHkgYWxyZWFkeSBiZSBoYW5kbGVkIGJ5IHRoZSBzdGF0dWUgY29kZSBhYm92ZT9cbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gVE9ETyAtIGFkZCBleHRyYSBkaWFsb2dzIGZvciBpdGVtdXNlIHRyYWRlcywgZXh0cmEgdHJpZ2dlcnNcbiAgICAvLyAgICAgIC0gaWYgaXRlbSB0cmFkZWQgYnV0IG5vIHJld2FyZCwgdGhlbiByZS1naXZlIHJld2FyZC4uLlxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldCh+bG9jYXRpb24uaWQpKSB7XG4gICAgICB0aGlzLnByb2Nlc3NJdGVtVXNlKFt0aGlzLmVudHJhbmNlKGxvY2F0aW9uKV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlcXVpcmVtZW50Lk9QRU4sIGl0ZW0sIHVzZSk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlTW92aW5nR3VhcmQoaGl0Ym94OiBIaXRib3gsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIFRoaXMgaXMgdGhlIDFiIHRyaWdnZXIgYWN0aW9uIGZvbGxvdy11cC4gIEl0IGxvb2tzIGZvciBhbiBOUEMgaW4gMGQgb3IgMGVcbiAgICAvLyBhbmQgbW92ZXMgdGhlbSBvdmVyIGEgcGl4ZWwuICBGb3IgdGhlIGxvZ2ljLCBpdCdzIGFsd2F5cyBpbiBhIHBvc2l0aW9uXG4gICAgLy8gd2hlcmUganVzdCBtYWtpbmcgdGhlIHRyaWdnZXIgc3F1YXJlIGJlIGEgbm8tZXhpdCBzcXVhcmUgaXMgc3VmZmljaWVudCxcbiAgICAvLyBidXQgd2UgbmVlZCB0byBnZXQgdGhlIGNvbmRpdGlvbnMgcmlnaHQuICBXZSBwYXNzIGluIHRoZSByZXF1aXJlbWVudHMgdG9cbiAgICAvLyBOT1QgdHJpZ2dlciB0aGUgdHJpZ2dlciwgYW5kIHRoZW4gd2Ugam9pbiBpbiBwYXJhbHlzaXMgYW5kL29yIHN0YXR1ZVxuICAgIC8vIGdsaXRjaCBpZiBhcHByb3ByaWF0ZS4gIFRoZXJlIGNvdWxkIHRoZW9yZXRpY2FsbHkgYmUgY2FzZXMgd2hlcmUgdGhlXG4gICAgLy8gZ3VhcmQgaXMgcGFyYWx5emFibGUgYnV0IHRoZSBnZW9tZXRyeSBwcmV2ZW50cyB0aGUgcGxheWVyIGZyb20gYWN0dWFsbHlcbiAgICAvLyBoaXR0aW5nIHRoZW0gYmVmb3JlIHRoZXkgbW92ZSwgYnV0IGl0IGRvZXNuJ3QgaGFwcGVuIGluIHByYWN0aWNlLlxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lU3RhdHVlR2xpdGNoKCkpIHJldHVybjtcbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW11bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zLnNsaWNlKDAsIDIpKSB7XG4gICAgICBpZiAoc3Bhd24uaXNOcGMoKSAmJiB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXS5pc1BhcmFseXphYmxlKCkpIHtcbiAgICAgICAgZXh0cmEucHVzaChbdGhpcy5yb20uZmxhZ3MuUGFyYWx5c2lzLmNdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lVHJpZ2dlckdsaXRjaCgpKSB7XG4gICAgICBleHRyYS5wdXNoKFt0aGlzLnJvbS5mbGFncy5UcmlnZ2VyU2tpcC5jXSk7XG4gICAgfVxuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKFsuLi5yZXEsIC4uLmV4dHJhXS5tYXAoc3ByZWFkKSkpO1xuXG5cbiAgICAvLyBUT0RPIC0gUG9ydG9hIGd1YXJkcyBhcmUgYnJva2VuIDotKFxuICAgIC8vIFRoZSBiYWNrIGd1YXJkIG5lZWRzIHRvIGJsb2NrIG9uIHRoZSBmcm9udCBndWFyZCdzIGNvbmRpdGlvbnMsXG4gICAgLy8gd2hpbGUgdGhlIGZyb250IGd1YXJkIHNob3VsZCBibG9jayBvbiBmb3J0dW5lIHRlbGxlcj9cblxuICB9XG5cbiAgaGFuZGxlQm9hdCh0aWxlOiBUaWxlSWQsIGxvY2F0aW9uOiBMb2NhdGlvbiwgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIGJvYXJkIGJvYXQgLSB0aGlzIGFtb3VudHMgdG8gYWRkaW5nIGEgcm91dGUgZWRnZSBmcm9tIHRoZSB0aWxlXG4gICAgLy8gdG8gdGhlIGxlZnQsIHRocm91Z2ggYW4gZXhpdCwgYW5kIHRoZW4gY29udGludWluZyB1bnRpbCBmaW5kaW5nIGxhbmQuXG4gICAgY29uc3QgdDAgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodGlsZSk7XG4gICAgaWYgKHQwID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgd2Fsa2FibGUgbmVpZ2hib3IuYCk7XG4gICAgY29uc3QgeXQgPSAodGlsZSA+PiA4KSAmIDB4ZjAgfCAodGlsZSA+PiA0KSAmIDB4ZjtcbiAgICBjb25zdCB4dCA9ICh0aWxlID4+IDQpICYgMHhmMCB8IHRpbGUgJiAweGY7XG4gICAgbGV0IGJvYXRFeGl0O1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgaWYgKGV4aXQueXQgPT09IHl0ICYmIGV4aXQueHQgPCB4dCkgYm9hdEV4aXQgPSBleGl0O1xuICAgIH1cbiAgICBpZiAoIWJvYXRFeGl0KSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGJvYXQgZXhpdGApO1xuICAgIC8vIFRPRE8gLSBsb29rIHVwIHRoZSBlbnRyYW5jZS5cbiAgICBjb25zdCBkZXN0ID0gdGhpcy5yb20ubG9jYXRpb25zW2JvYXRFeGl0LmRlc3RdO1xuICAgIGlmICghZGVzdCkgdGhyb3cgbmV3IEVycm9yKGBCYWQgZGVzdGluYXRpb25gKTtcbiAgICBjb25zdCBlbnRyYW5jZSA9IGRlc3QuZW50cmFuY2VzW2JvYXRFeGl0LmVudHJhbmNlXTtcbiAgICBjb25zdCBlbnRyYW5jZVRpbGUgPSBUaWxlSWQuZnJvbShkZXN0LCBlbnRyYW5jZSk7XG4gICAgbGV0IHQgPSBlbnRyYW5jZVRpbGU7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHQgPSBUaWxlSWQuYWRkKHQsIDAsIC0xKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpO1xuICAgICAgaWYgKHQxICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgYm9hdDogVGVycmFpbiA9IHtcbiAgICAgICAgICBlbnRlcjogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50cyksXG4gICAgICAgICAgZXhpdDogW1sweGYsIFJlcXVpcmVtZW50Lk9QRU5dXSxcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWRkIGEgdGVycmFpbiBhbmQgZXhpdCBwYWlyIGZvciB0aGUgYm9hdCB0cmlnZ2VyLlxuICAgICAgICB0aGlzLmFkZFRlcnJhaW4oW3QwXSwgYm9hdCk7XG4gICAgICAgIHRoaXMuZXhpdHMuc2V0KHQwLCB0MSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5hZGQoVGlsZVBhaXIub2YodDAsIHQxKSk7XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGVudHJhbmNlIHdlIHBhc3NlZFxuICAgICAgICAvLyAodGhpcyBpcyBwcmltYXJpbHkgbmVjZXNzYXJ5IGZvciB3aWxkIHdhcnAgdG8gd29yayBpbiBsb2dpYykuXG4gICAgICAgIHRoaXMuZXhpdHMuc2V0KGVudHJhbmNlVGlsZSwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKGVudHJhbmNlVGlsZSwgdDEpKTtcbiAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQoZW50cmFuY2VUaWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoMCkhKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3g6IEhpdGJveCwgcmVxOiBSZXF1aXJlbWVudCwgZ3JhbnRJZDogbnVtYmVyKSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMuaXRlbUdyYW50KGdyYW50SWQpO1xuICAgIGNvbnN0IHNsb3QgPSAweDEwMCB8IGl0ZW07XG4gICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGl0ZW0gZ3JhbnQgZm9yICR7Z3JhbnRJZC50b1N0cmluZygxNil9YCk7XG4gICAgfVxuICAgIC8vIGlzIHRoZSAxMDAgZmxhZyBzdWZmaWNpZW50IGhlcmU/ICBwcm9iYWJseT9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IGdyYW50SWQgPj0gMHg4MDsgLy8gZ3JhbnRlZCBmcm9tIGEgdHJpZ2dlclxuICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCBzbG90LFxuICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlLCBwcmV2ZW50TG9zc30pO1xuICB9XG5cbiAgYWRkVGVycmFpbihoaXRib3g6IEhpdGJveCwgdGVycmFpbjogVGVycmFpbikge1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiBoaXRib3gpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgIGlmICh0ID09IG51bGwpIGNvbnRpbnVlOyAvLyB1bnJlYWNoYWJsZSB0aWxlcyBkb24ndCBuZWVkIGV4dHJhIHJlcXNcbiAgICAgIHRoaXMudGVycmFpbnMuc2V0KHRpbGUsIHRoaXMudGVycmFpbkZhY3RvcnkubWVldCh0LCB0ZXJyYWluKSk7XG4gICAgfVxuICB9XG5cbiAgYWRkQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCwgY2hlY2tzOiBudW1iZXJbXSkge1xuICAgIGlmIChSZXF1aXJlbWVudC5pc0Nsb3NlZChyZXF1aXJlbWVudCkpIHJldHVybjsgLy8gZG8gbm90aGluZyBpZiB1bnJlYWNoYWJsZVxuICAgIGNvbnN0IGNoZWNrID0ge3JlcXVpcmVtZW50OiBSZXF1aXJlbWVudC5mcmVlemUocmVxdWlyZW1lbnQpLCBjaGVja3N9O1xuICAgIGZvciAoY29uc3QgdGlsZSBvZiBoaXRib3gpIHtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModGlsZSkpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5jaGVja3MuZ2V0KHRpbGUpLmFkZChjaGVjayk7XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUNoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsXG4gICAgICAgICAgICAgICBjaGVjazogbnVtYmVyLCBzbG90OiBTbG90SW5mbykge1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgW2NoZWNrXSk7XG4gICAgdGhpcy5zbG90cy5zZXQoY2hlY2ssIHNsb3QpO1xuICAgIC8vIGFsc28gYWRkIGNvcnJlc3BvbmRpbmcgSXRlbUluZm8gdG8ga2VlcCB0aGVtIGluIHBhcml0eS5cbiAgICBjb25zdCBpdGVtZ2V0ID0gdGhpcy5yb20uaXRlbUdldHNbdGhpcy5yb20uc2xvdHNbY2hlY2sgJiAweGZmXV07XG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW2l0ZW1nZXQuaXRlbUlkXTtcbiAgICBjb25zdCB1bmlxdWUgPSBpdGVtPy51bmlxdWU7XG4gICAgY29uc3QgbG9zYWJsZSA9IGl0ZW1nZXQuaXNMb3NhYmxlKCk7XG4gICAgLy8gVE9ETyAtIHJlZmFjdG9yIHRvIGp1c3QgXCJjYW4ndCBiZSBib3VnaHRcIj9cbiAgICBjb25zdCBwcmV2ZW50TG9zcyA9IHVuaXF1ZSB8fCBpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5PcGVsU3RhdHVlO1xuICAgIGxldCB3ZWlnaHQgPSAxO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2luZCkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZkZpcmUpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXYXRlcikgd2VpZ2h0ID0gMTA7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZUaHVuZGVyKSB3ZWlnaHQgPSAxNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuRmxpZ2h0KSB3ZWlnaHQgPSAxNTtcbiAgICB0aGlzLml0ZW1zLnNldCgweDIwMCB8IGl0ZW1nZXQuaWQsIHt1bmlxdWUsIGxvc2FibGUsIHByZXZlbnRMb3NzLCB3ZWlnaHR9KTtcbiAgfVxuXG4gIGFkZENoZWNrRnJvbUZsYWdzKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGZsYWdzOiBudW1iZXJbXSkge1xuICAgIGNvbnN0IGNoZWNrcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudCwgY2hlY2tzKTtcbiAgfVxuXG4gIHdhbGthYmxlTmVpZ2hib3IodDogVGlsZUlkKTogVGlsZUlkfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0KSkgcmV0dXJuIHQ7XG4gICAgZm9yIChsZXQgZCBvZiBbLTEsIDFdKSB7XG4gICAgICBjb25zdCB0MSA9IFRpbGVJZC5hZGQodCwgZCwgMCk7XG4gICAgICBjb25zdCB0MiA9IFRpbGVJZC5hZGQodCwgMCwgZCk7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQxKSkgcmV0dXJuIHQxO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MikpIHJldHVybiB0MjtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlzV2Fsa2FibGUodDogVGlsZUlkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEodGhpcy5nZXRFZmZlY3RzKHQpICYgVGVycmFpbi5CSVRTKTtcbiAgfVxuXG4gIGVuc3VyZVBhc3NhYmxlKHQ6IFRpbGVJZCk6IFRpbGVJZCB7XG4gICAgcmV0dXJuIHRoaXMuaXNXYWxrYWJsZSh0KSA/IHQgOiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdDtcbiAgfVxuXG4gIGdldEVmZmVjdHModDogVGlsZUlkKTogbnVtYmVyIHtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1t0ID4+PiAxNl07XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCBlZmZlY3RzID0gdGhpcy5yb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXS5lZmZlY3RzO1xuICAgIGNvbnN0IHNjciA9IGxvY2F0aW9uLnNjcmVlbnNbKHQgJiAweGYwMDApID4+PiAxMl1bKHQgJiAweGYwMCkgPj4+IDhdO1xuICAgIHJldHVybiBlZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc2NyXS50aWxlc1t0ICYgMHhmZl1dO1xuICB9XG5cbiAgcHJvY2Vzc0Jvc3MobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgIC8vIGFuZCB3aWxsIGFsc28gYWRkIHRoZWlyIGRyb3AuXG4gICAgaWYgKHNwYXduLmlkID09PSAweGM5IHx8IHNwYXduLmlkID09PSAweGNhKSByZXR1cm47IC8vIHN0YXR1ZXNcbiAgICBjb25zdCBpc1JhZ2UgPSBzcGF3bi5pZCA9PT0gMHhjMztcbiAgICBjb25zdCBib3NzID1cbiAgICAgICAgaXNSYWdlID8gdGhpcy5yb20uYm9zc2VzLlJhZ2UgOlxuICAgICAgICB0aGlzLnJvbS5ib3NzZXMuZnJvbUxvY2F0aW9uKGxvY2F0aW9uLmlkKTtcbiAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKTtcbiAgICBpZiAoIWJvc3MgfHwgIWJvc3MuZmxhZykgdGhyb3cgbmV3IEVycm9yKGBCYWQgYm9zcyBhdCAke2xvY2F0aW9uLm5hbWV9YCk7XG4gICAgY29uc3Qgc2NyZWVuID0gdGlsZSAmIH4weGZmO1xuICAgIGNvbnN0IGJvc3NUZXJyYWluID0gdGhpcy50ZXJyYWluRmFjdG9yeS5ib3NzKGJvc3MuZmxhZy5pZCwgaXNSYWdlKTtcbiAgICBjb25zdCBoaXRib3ggPSBzZXEoMHhmMCwgKHQ6IG51bWJlcikgPT4gKHNjcmVlbiB8IHQpIGFzIFRpbGVJZCk7XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgYm9zc1RlcnJhaW4pO1xuICAgIHRoaXMuYWRkQm9zc0NoZWNrKGhpdGJveCwgYm9zcyk7XG4gIH1cblxuICBhZGRCb3NzQ2hlY2soaGl0Ym94OiBIaXRib3gsIGJvc3M6IEJvc3MsXG4gICAgICAgICAgICAgICByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50ID0gUmVxdWlyZW1lbnQuT1BFTikge1xuICAgIGlmIChib3NzLmZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhIGZsYWc6ICR7Ym9zc31gKTtcbiAgICBjb25zdCByZXEgPSBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgdGhpcy5ib3NzUmVxdWlyZW1lbnRzKGJvc3MpKTtcbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbYm9zcy5mbGFnLmlkXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgIGhpdGJveCwgcmVxLCBib3NzLmZsYWcuaWQsIHtsb3NzeTogZmFsc2UsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NDaGVzdChsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEFkZCBhIGNoZWNrIGZvciB0aGUgMXh4IGZsYWcuICBNYWtlIHN1cmUgaXQncyBub3QgYSBtaW1pYy5cbiAgICBpZiAodGhpcy5yb20uc2xvdHNbc3Bhd24uaWRdID49IDB4NzApIHJldHVybjtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBzcGF3bi5pZDtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF07XG4gICAgaWYgKG1hcHBlZCA+PSAweDcwKSByZXR1cm47IC8vIFRPRE8gLSBtaW1pYyUgbWF5IGNhcmVcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbbWFwcGVkXTtcbiAgICBjb25zdCB1bmlxdWUgPSB0aGlzLmZsYWdzZXQucHJlc2VydmVVbmlxdWVDaGVja3MoKSA/ICEhaXRlbT8udW5pcXVlIDogdHJ1ZTtcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhbVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKV0sIFJlcXVpcmVtZW50Lk9QRU4sXG4gICAgICAgICAgICAgICAgICAgICAgc2xvdCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlfSk7XG4gIH1cblxuICBwcm9jZXNzTW9uc3Rlcihsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuXG4gICAgLy8gVE9ETyAtIGN1cnJlbnRseSBkb24ndCBoYW5kbGUgZmx5ZXJzIHdlbGwgLSBjb3VsZCBpbnN0ZWFkIGFkZCBmbHllcnNcbiAgICAvLyAgICAgICAgdG8gYWxsIGVudHJhbmNlcz9cblxuICAgIC8vIENoZWNrIG1vbnN0ZXIncyB2dWxuZXJhYmlsaXRpZXMgYW5kIGFkZCBhIGNoZWNrIGZvciBNb25leSBnaXZlbiBzd29yZHMuXG4gICAgY29uc3QgbW9uc3RlciA9IHRoaXMucm9tLm9iamVjdHNbc3Bhd24ubW9uc3RlcklkXTtcbiAgICBpZiAoIShtb25zdGVyIGluc3RhbmNlb2YgTW9uc3RlcikpIHJldHVybjtcbiAgICBjb25zdCB7XG4gICAgICBNb25leSwgUmFnZVNraXAsXG4gICAgICBTd29yZCwgU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyLFxuICAgIH0gPSB0aGlzLnJvbS5mbGFncztcbiAgICBpZiAobG9jYXRpb24uaWQgPT09IHRoaXMubGltZVRyZWVFbnRyYW5jZUxvY2F0aW9uICYmIG1vbnN0ZXIuaXNGbHllciAmJlxuICAgICAgICB0aGlzLmZsYWdzZXQuYXNzdW1lUmFnZVNraXAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbdGhpcy5lbnRyYW5jZShsb2NhdGlvbildLCBSZXF1aXJlbWVudC5PUEVOLCBbUmFnZVNraXAuaWRdKTtcblxuICAgIH1cbiAgICBpZiAoIShtb25zdGVyLmdvbGREcm9wKSkgcmV0dXJuO1xuICAgIGNvbnN0IGhpdGJveCA9IFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXTtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBTd29yZC5yLCBbTW9uZXkuaWRdKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc3dvcmRzID1cbiAgICAgICAgW1N3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlcl1cbiAgICAgICAgICAgIC5maWx0ZXIoKF8sIGkpID0+IG1vbnN0ZXIuZWxlbWVudHMgJiAoMSA8PCBpKSk7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNvbGxlY3RpbmcgYWxsIHRoZSBlbGVtZW50cyBpbiBvbmUgcGxhY2UgZmlyc3RcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgb3IoLi4uc3dvcmRzKSwgW01vbmV5LmlkXSk7XG4gIH1cblxuICBwcm9jZXNzSXRlbVVzZShoaXRib3g6IEhpdGJveCwgcmVxMTogUmVxdWlyZW1lbnQsIGl0ZW06IEl0ZW0sIHVzZTogSXRlbVVzZSkge1xuICAgIC8vIHRoaXMgc2hvdWxkIGhhbmRsZSBtb3N0IHRyYWRlLWlucyBhdXRvbWF0aWNhbGx5XG4gICAgaGl0Ym94ID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiB0aGlzLndhbGthYmxlTmVpZ2hib3IodCkgPz8gdCkpO1xuICAgIGNvbnN0IHJlcTIgPSBbWygweDIwMCB8IGl0ZW0uaWQpIGFzIENvbmRpdGlvbl1dOyAvLyByZXF1aXJlcyB0aGUgaXRlbS5cbiAgICAvLyBjaGVjayBmb3IgQXJ5bGxpcyB0cmFkZS1pbiwgYWRkIGNoYW5nZSBhcyBhIHJlcXVpcmVtZW50LlxuICAgIGlmIChpdGVtLml0ZW1Vc2VEYXRhLnNvbWUodSA9PiB1LnRyYWRlTnBjKCkgPT09IHRoaXMucm9tLm5wY3MuQXJ5bGxpcy5pZCkpIHtcbiAgICAgIHJlcTJbMF0ucHVzaCh0aGlzLnJvbS5mbGFncy5DaGFuZ2UuYyk7XG4gICAgfVxuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5NZWRpY2FsSGVyYikgeyAvLyBkb2xwaGluXG4gICAgICByZXEyWzBdWzBdID0gdGhpcy5yb20uZmxhZ3MuQnV5SGVhbGluZy5jOyAvLyBub3RlOiBubyBvdGhlciBoZWFsaW5nIGl0ZW1zXG4gICAgfVxuICAgIGNvbnN0IHJlcSA9IFJlcXVpcmVtZW50Lm1lZXQocmVxMSwgcmVxMik7XG4gICAgLy8gc2V0IGFueSBmbGFnc1xuICAgIHRoaXMuYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94LCByZXEsIHVzZS5mbGFncyk7XG4gICAgLy8gaGFuZGxlIGFueSBleHRyYSBhY3Rpb25zXG4gICAgc3dpdGNoICh1c2UubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgLy8gdXNlIGtleVxuICAgICAgICB0aGlzLnByb2Nlc3NLZXlVc2UoaGl0Ym94LCByZXEpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMHgwODogY2FzZSAweDBiOiBjYXNlIDB4MGM6IGNhc2UgMHgwZDogY2FzZSAweDBmOiBjYXNlIDB4MWM6XG4gICAgICAgIC8vIGZpbmQgaXRlbWdyYW50IGZvciBpdGVtIElEID0+IGFkZCBjaGVja1xuICAgICAgICB0aGlzLmFkZEl0ZW1HcmFudENoZWNrcyhoaXRib3gsIHJlcSwgaXRlbS5pZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDAyOlxuICAgICAgICAvLyBkb2xwaGluIGRlZmVycyB0byBkaWFsb2cgYWN0aW9uIDExIChhbmQgMGQgdG8gc3dpbSBhd2F5KVxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgMHgxMDAgfCB0aGlzLnJvbS5ucGNzW3VzZS53YW50ICYgMHhmZl0uZGF0YVsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0tleVVzZShoaXRib3g6IEhpdGJveCwgcmVxOiBSZXF1aXJlbWVudCkge1xuICAgIC8vIHNldCB0aGUgY3VycmVudCBzY3JlZW4ncyBmbGFnIGlmIHRoZSBjb25kaXRpb25zIGFyZSBtZXQuLi5cbiAgICAvLyBtYWtlIHN1cmUgdGhlcmUncyBvbmx5IGEgc2luZ2xlIHNjcmVlbi5cbiAgICBjb25zdCBbc2NyZWVuLCAuLi5yZXN0XSA9IG5ldyBTZXQoWy4uLmhpdGJveF0ubWFwKHQgPT4gU2NyZWVuSWQuZnJvbSh0KSkpO1xuICAgIGlmIChzY3JlZW4gPT0gbnVsbCB8fCByZXN0Lmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBvbmUgc2NyZWVuYCk7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbc2NyZWVuID4+PiA4XTtcbiAgICBjb25zdCBmbGFnID0gbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSAoc2NyZWVuICYgMHhmZikpO1xuICAgIGlmIChmbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgZmxhZyBvbiBzY3JlZW5gKTtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxLCBbZmxhZy5mbGFnXSk7XG4gIH1cblxuICBib3NzUmVxdWlyZW1lbnRzKGJvc3M6IEJvc3MpOiBSZXF1aXJlbWVudCB7XG4gICAgLy8gVE9ETyAtIGhhbmRsZSBib3NzIHNodWZmbGUgc29tZWhvdz9cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLlJhZ2UpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgUmFnZS4gIEZpZ3VyZSBvdXQgd2hhdCBoZSB3YW50cyBmcm9tIHRoZSBkaWFsb2cuXG4gICAgICBjb25zdCB1bmtub3duU3dvcmQgPSB0aGlzLnRyYWNrZXIgJiYgdGhpcy5mbGFnc2V0LnJhbmRvbWl6ZVRyYWRlcygpO1xuICAgICAgaWYgKHVua25vd25Td29yZCkgcmV0dXJuIHRoaXMucm9tLmZsYWdzLlN3b3JkLnI7IC8vIGFueSBzd29yZCBtaWdodCBkby5cbiAgICAgIHJldHVybiBbW3RoaXMucm9tLm5wY3MuUmFnZS5kaWFsb2coKVswXS5jb25kaXRpb24gYXMgQ29uZGl0aW9uXV07XG4gICAgfVxuICAgIGNvbnN0IGlkID0gYm9zcy5vYmplY3Q7XG4gICAgY29uc3QgciA9IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKCk7XG4gICAgaWYgKHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQuc2h1ZmZsZUJvc3NFbGVtZW50cygpIHx8XG4gICAgICAgICF0aGlzLmZsYWdzZXQuZ3VhcmFudGVlTWF0Y2hpbmdTd29yZCgpKSB7XG4gICAgICByLmFkZEFsbCh0aGlzLnJvbS5mbGFncy5Td29yZC5yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbGV2ZWwgPSB0aGlzLmZsYWdzZXQuZ3VhcmFudGVlU3dvcmRNYWdpYygpID8gYm9zcy5zd29yZExldmVsIDogMTtcbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMucm9tLm9iamVjdHNbaWRdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0OyBpKyspIHtcbiAgICAgICAgaWYgKG9iai5pc1Z1bG5lcmFibGUoaSkpIHIuYWRkQWxsKHRoaXMuc3dvcmRSZXF1aXJlbWVudChpLCBsZXZlbCkpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBDYW4ndCBhY3R1YWxseSBraWxsIHRoZSBib3NzIGlmIGl0IGRvZXNuJ3Qgc3Bhd24uXG4gICAgY29uc3QgZXh0cmE6IENvbmRpdGlvbltdID0gW107XG4gICAgaWYgKGJvc3MubnBjICE9IG51bGwgJiYgYm9zcy5sb2NhdGlvbiAhPSBudWxsKSB7XG4gICAgICBjb25zdCBzcGF3bkNvbmRpdGlvbiA9IGJvc3MubnBjLnNwYXducyh0aGlzLnJvbS5sb2NhdGlvbnNbYm9zcy5sb2NhdGlvbl0pO1xuICAgICAgZXh0cmEucHVzaCguLi50aGlzLmZpbHRlclJlcXVpcmVtZW50cyhzcGF3bkNvbmRpdGlvbilbMF0pO1xuICAgIH1cbiAgICBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkluc2VjdCkge1xuICAgICAgZXh0cmEucHVzaCh0aGlzLnJvbS5mbGFncy5JbnNlY3RGbHV0ZS5jLCB0aGlzLnJvbS5mbGFncy5HYXNNYXNrLmMpO1xuICAgIH0gZWxzZSBpZiAoYm9zcyA9PT0gdGhpcy5yb20uYm9zc2VzLkRyYXlnb24yKSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkJvd09mVHJ1dGguYyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuZ3VhcmFudGVlUmVmcmVzaCgpKSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLlJlZnJlc2guYyk7XG4gICAgfVxuICAgIHIucmVzdHJpY3QoW2V4dHJhXSk7XG4gICAgcmV0dXJuIFJlcXVpcmVtZW50LmZyZWV6ZShyKTtcbiAgfVxuXG4gIHN3b3JkUmVxdWlyZW1lbnQoZWxlbWVudDogbnVtYmVyLCBsZXZlbDogbnVtYmVyKTogUmVxdWlyZW1lbnQge1xuICAgIGNvbnN0IHN3b3JkID0gW1xuICAgICAgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZldpbmQsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZGaXJlLFxuICAgICAgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZldhdGVyLCB0aGlzLnJvbS5mbGFncy5Td29yZE9mVGh1bmRlcixcbiAgICBdW2VsZW1lbnRdO1xuICAgIGlmIChsZXZlbCA9PT0gMSkgcmV0dXJuIHN3b3JkLnI7XG4gICAgY29uc3QgcG93ZXJzID0gW1xuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZldpbmQsIHRoaXMucm9tLmZsYWdzLlRvcm5hZG9CcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mRmlyZSwgdGhpcy5yb20uZmxhZ3MuRmxhbWVCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLkJsaXp6YXJkQnJhY2VsZXRdLFxuICAgICAgW3RoaXMucm9tLmZsYWdzLkJhbGxPZlRodW5kZXIsIHRoaXMucm9tLmZsYWdzLlN0b3JtQnJhY2VsZXRdLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAzKSByZXR1cm4gYW5kKHN3b3JkLCAuLi5wb3dlcnMpO1xuICAgIHJldHVybiBwb3dlcnMubWFwKHBvd2VyID0+IFtzd29yZC5jLCBwb3dlci5jXSk7XG4gIH1cblxuICBpdGVtR3JhbnQoaWQ6IG51bWJlcik6IG51bWJlciB7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgdGhpcy5yb20uaXRlbUdldHMuYWN0aW9uR3JhbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSBpZCkgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIGl0ZW0gZ3JhbnQgJHtpZC50b1N0cmluZygxNil9YCk7XG4gIH1cblxuICAvKiogUmV0dXJuIGEgUmVxdWlyZW1lbnQgZm9yIGFsbCBvZiB0aGUgZmxhZ3MgYmVpbmcgbWV0LiAqL1xuICBmaWx0ZXJSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCBjb25kcyA9IFtdO1xuICAgIGZvciAoY29uc3QgZmxhZyBvZiBmbGFncykge1xuICAgICAgaWYgKGZsYWcgPCAwKSB7XG4gICAgICAgIGNvbnN0IGxvZ2ljID0gdGhpcy5mbGFnKH5mbGFnKT8ubG9naWM7XG4gICAgICAgIGlmIChsb2dpYz8uYXNzdW1lVHJ1ZSkgcmV0dXJuIFJlcXVpcmVtZW50LkNMT1NFRDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50LkNMT1NFRDtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSBjb25kcy5wdXNoKGYuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtjb25kc107XG4gIH1cblxuICAvKiogUmV0dXJuIGEgUmVxdWlyZW1lbnQgZm9yIHNvbWUgZmxhZyBub3QgYmVpbmcgbWV0LiAqL1xuICBmaWx0ZXJBbnRpUmVxdWlyZW1lbnRzKGZsYWdzOiBudW1iZXJbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gICAgY29uc3QgcmVxID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA+PSAwKSB7XG4gICAgICAgIGNvbnN0IGxvZ2ljID0gdGhpcy5mbGFnKH5mbGFnKT8ubG9naWM7XG4gICAgICAgIGlmIChsb2dpYz8uYXNzdW1lRmFsc2UpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyh+ZmxhZyk7XG4gICAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuT1BFTjtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSByZXEucHVzaChbZi5pZCBhcyBDb25kaXRpb25dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcTtcbiAgfVxuXG4gIGZsYWcoZmxhZzogbnVtYmVyKTogRmxhZ3x1bmRlZmluZWQge1xuICAgIC8vY29uc3QgdW5zaWduZWQgPSBmbGFnIDwgMCA/IH5mbGFnIDogZmxhZztcbiAgICBjb25zdCB1bnNpZ25lZCA9IGZsYWc7ICAvLyBUT0RPIC0gc2hvdWxkIHdlIGF1dG8taW52ZXJ0P1xuICAgIGNvbnN0IGYgPSB0aGlzLnJvbS5mbGFnc1t1bnNpZ25lZF07XG4gICAgY29uc3QgbWFwcGVkID0gdGhpcy5hbGlhc2VzLmdldChmKSA/PyBmO1xuICAgIHJldHVybiBtYXBwZWQ7XG4gIH1cblxuICBlbnRyYW5jZShsb2NhdGlvbjogTG9jYXRpb258bnVtYmVyLCBpbmRleCA9IDApOiBUaWxlSWQge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gPT09ICdudW1iZXInKSBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tsb2NhdGlvbl07XG4gICAgcmV0dXJuIHRoaXMudGlsZXMuZmluZChUaWxlSWQuZnJvbShsb2NhdGlvbiwgbG9jYXRpb24uZW50cmFuY2VzW2luZGV4XSkpO1xuICB9XG5cbiAgd2FsbENhcGFiaWxpdHkod2FsbDogV2FsbFR5cGUpOiBudW1iZXIge1xuICAgIHN3aXRjaCAod2FsbCkge1xuICAgICAgY2FzZSBXYWxsVHlwZS5XSU5EOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtTdG9uZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuRklSRTogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSWNlLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5XQVRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkZvcm1CcmlkZ2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLlRIVU5ERVI6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha0lyb24uaWQ7XG4gICAgICBkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYGJhZCB3YWxsIHR5cGU6ICR7d2FsbH1gKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYW5kKC4uLmZsYWdzOiBGbGFnW10pOiBSZXF1aXJlbWVudC5TaW5nbGUge1xuICByZXR1cm4gW2ZsYWdzLm1hcCgoZjogRmxhZykgPT4gZi5pZCBhcyBDb25kaXRpb24pXTtcbn1cblxuZnVuY3Rpb24gb3IoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LkZyb3plbiB7XG4gIHJldHVybiBmbGFncy5tYXAoKGY6IEZsYWcpID0+IFtmLmlkIGFzIENvbmRpdGlvbl0pO1xufVxuXG4vLyBBbiBpbnRlcmVzdGluZyB3YXkgdG8gdHJhY2sgdGVycmFpbiBjb21iaW5hdGlvbnMgaXMgd2l0aCBwcmltZXMuXG4vLyBJZiB3ZSBoYXZlIE4gZWxlbWVudHMgd2UgY2FuIGxhYmVsIGVhY2ggYXRvbSB3aXRoIGEgcHJpbWUgYW5kXG4vLyB0aGVuIGxhYmVsIGFyYml0cmFyeSBjb21iaW5hdGlvbnMgd2l0aCB0aGUgcHJvZHVjdC4gIEZvciBOPTEwMDBcbi8vIHRoZSBoaWdoZXN0IG51bWJlciBpcyA4MDAwLCBzbyB0aGF0IGl0IGNvbnRyaWJ1dGVzIGFib3V0IDEzIGJpdHNcbi8vIHRvIHRoZSBwcm9kdWN0LCBtZWFuaW5nIHdlIGNhbiBzdG9yZSBjb21iaW5hdGlvbnMgb2YgNCBzYWZlbHlcbi8vIHdpdGhvdXQgcmVzb3J0aW5nIHRvIGJpZ2ludC4gIFRoaXMgaXMgaW5oZXJlbnRseSBvcmRlci1pbmRlcGVuZGVudC5cbi8vIElmIHRoZSByYXJlciBvbmVzIGFyZSBoaWdoZXIsIHdlIGNhbiBmaXQgc2lnbmlmaWNhbnRseSBtb3JlIHRoYW4gNC5cblxuY29uc3QgREVCVUcgPSBmYWxzZTtcblxuLy8gRGVidWcgaW50ZXJmYWNlLlxuZXhwb3J0IGludGVyZmFjZSBBcmVhRGF0YSB7XG4gIGlkOiBudW1iZXI7XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbiAgY2hlY2tzOiBBcnJheTxbRmxhZywgUmVxdWlyZW1lbnRdPjtcbiAgdGVycmFpbjogVGVycmFpbjtcbiAgbG9jYXRpb25zOiBTZXQ8bnVtYmVyPjtcbiAgcm91dGVzOiBSZXF1aXJlbWVudC5Gcm96ZW47XG59XG5leHBvcnQgaW50ZXJmYWNlIFRpbGVEYXRhIHtcbiAgYXJlYTogQXJlYURhdGE7XG4gIGV4aXQ/OiBUaWxlSWQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIExvY2F0aW9uRGF0YSB7XG4gIGFyZWFzOiBTZXQ8QXJlYURhdGE+O1xuICB0aWxlczogU2V0PFRpbGVJZD47XG59XG5leHBvcnQgaW50ZXJmYWNlIFdvcmxkRGF0YSB7XG4gIHRpbGVzOiBNYXA8VGlsZUlkLCBUaWxlRGF0YT47XG4gIGFyZWFzOiBBcmVhRGF0YVtdO1xuICBsb2NhdGlvbnM6IExvY2F0aW9uRGF0YVtdO1xufVxuIl19