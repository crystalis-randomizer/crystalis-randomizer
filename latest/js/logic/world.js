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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQXNFaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVBQVUsS0FBSztRQURmLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ25DLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFwRTNCLG1CQUFjLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBR3hDLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztRQUd0QyxXQUFNLEdBQUcsSUFBSSxVQUFVLENBQXFCLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztRQUc3RCxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFFcEMsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBTXBDLGFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBNEIsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFHL0QsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBR2xDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBWSxDQUFDO1FBUTlCLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQVNsQyxVQUFLLEdBQUcsSUFBSSxTQUFTLEVBQVUsQ0FBQztRQVFoQyxjQUFTLEdBQUcsSUFBSSxVQUFVLENBQW1CLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBR3RELFdBQU0sR0FDWCxJQUFJLFVBQVUsQ0FDVixHQUFHLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBR2hDLGVBQVUsR0FDZixJQUFJLFVBQVUsQ0FBNEIsR0FBRyxFQUFFLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRzdELG1CQUFjLEdBQ25CLElBQUksVUFBVSxDQUNWLENBQUMsQ0FBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUc5Qyw2QkFBd0IsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUtwQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7WUFDNUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNsQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQy9DO3FCQUFNLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7b0JBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUNoRDthQUNGO1NBQ0Y7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDO1lBQ3JCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDM0MsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUMzQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ3hDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFDekMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO1lBQzFELENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztTQUN4RCxDQUFDLENBQUM7UUFHSCxJQUFJLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFO1lBR2pDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7U0FDbkQ7UUFHRCxLQUFLLE1BQU0sUUFBUSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUU7WUFDcEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNoQztRQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUd0QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUd0QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFHcEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUdELGNBQWM7UUFDWixNQUFNLEVBQ0osU0FBUyxFQUFFLEVBQ1QsYUFBYSxFQUNiLFlBQVksRUFDWixHQUFHLEVBQ0gsZUFBZSxHQUNoQixFQUNELEtBQUssRUFBRSxFQUNMLGlCQUFpQixFQUNqQixVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQ2xELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUM5QyxVQUFVLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFDL0IsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQ2pDLGNBQWMsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFDdEQsU0FBUyxFQUFFLHNCQUFzQixFQUNqQyxNQUFNLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFDakMsT0FBTyxFQUFFLFdBQVcsRUFDcEIsY0FBYyxFQUNkLFlBQVksRUFBRSxZQUFZLEVBQzFCLEtBQUssRUFDTCxXQUFXLEVBQ1gsV0FBVyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUNsRCxVQUFVLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQ3JELEtBQUssRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQzdELGVBQWUsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUN6QyxRQUFRLEdBQ1QsRUFDRCxLQUFLLEVBQUUsRUFDTCxXQUFXLEVBQ1gsU0FBUyxHQUNWLEdBQ0YsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ2IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLENBQUMsRUFDM0MsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsRUFDdkMsY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFHbEUsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtZQUVqQyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssYUFBYSxDQUFDLEVBQUU7Z0JBQUUsU0FBUztZQUNqRCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssZUFBZSxDQUFDLEVBQUU7Z0JBQUUsU0FBUztZQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUMxQyxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3BELEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDaEMsSUFBSSxJQUFJLEtBQUssV0FBVyxDQUFDLEVBQUUsRUFBRTtvQkFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2lCQUNqRDtxQkFBTSxJQUFJLElBQUksS0FBSyxTQUFTLENBQUMsRUFBRSxFQUFFO29CQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQzlDO2FBQ0Y7U0FDRjtRQUdELElBQUksVUFBVSxHQUFnQixXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksUUFBUSxHQUFnQixXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksVUFBVSxHQUFnQixZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksU0FBUyxHQUFnQixjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ2hDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDOUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM1QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDakQsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNsRCxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakQsUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzdDLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNsRCxTQUFTLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUU7Z0JBQzFDLE1BQU0sTUFBTSxHQUNSLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2hFLFNBQVMsSUFBSSxDQUFDLEtBQVc7b0JBQ3ZCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FDYixDQUFDLENBQXVCLEVBQUUsRUFBRSxDQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO2dCQUNELFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQy9CLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzdCLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2hDLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7YUFDbEM7U0FDRjtRQUNELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQ1AsRUFBRSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxFQUMxRCxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFDL0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMxRDtRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxRQUFRLENBQ1gsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxDQUFDLEVBQ2pELENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDeEI7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtZQUVyQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNQLGFBQWEsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFDdkMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDL0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUNwQztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxFQUFFO1lBR3pDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3BFO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMvQixDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDL0M7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN6RDtRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFO1lBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQ3RCLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsRUFBRTtnQkFDNUIsV0FBVyxDQUFDLEVBQUUsQ0FBd0IsQ0FBQyxDQUFDO1NBQ3hEO0lBQ0gsQ0FBQztJQUdELGNBQWM7O1FBQ1osTUFBTSxFQUNKLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBQyxFQUNwRCxTQUFTLEVBQUUsRUFBQyxZQUFZLEVBQUMsR0FDMUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBRWIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEVBQUU7WUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7WUFDaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQ3RDLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUN0QyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMxRDtRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRTtZQUNqQyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRTtnQkFFbEQsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsRUFBRTtvQkFBRSxTQUFTO2dCQUdwRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLE9BQU8sU0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRSxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUU7b0JBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDNUQ7YUFDRjtTQUNGO0lBQ0gsQ0FBQztJQUdELGlCQUFpQjtRQUNmLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksSUFBSSxLQUFLLElBQUk7Z0JBQUUsU0FBUztZQUM1QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtnQkFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2xDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDMUI7SUFDSCxDQUFDO0lBR0QsbUJBQW1CO1FBQ2pCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzFDLEtBQUssTUFBTSxFQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUMsSUFBSSxRQUFRLEVBQUU7Z0JBQzVDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO29CQUMxQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFrQixDQUFDLENBQUM7b0JBQ3hELEtBQUssTUFBTSxFQUFFLElBQUksV0FBVyxFQUFFO3dCQUM1QixLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTs0QkFDNUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDN0I7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGO1FBR0QsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPO1FBQ25CLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQzlDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbkQsS0FBSyxNQUFNLEtBQUssSUFBSSxHQUFHLEVBQUU7Z0JBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25FO1NBQ0Y7UUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUdELGVBQWUsQ0FBQyxTQUFTLEdBQUcsV0FBVztRQUVyQyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRSxPQUFPO1lBQ0wsU0FBUztZQUNULFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYztZQUNqQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFNBQVMsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzlELE9BQU8sRUFBRSxDQUFDLE1BQWMsRUFBRSxFQUFFO2dCQUMxQixNQUFNLEVBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztnQkFDNUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFO29CQUVqQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbEQ7Z0JBQ0QsT0FBTyxHQUFHLENBQUM7WUFFYixDQUFDO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFHRCxlQUFlLENBQUMsUUFBa0I7UUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQUUsT0FBTztRQUUzQixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBR0QsY0FBYztRQUNaLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQzNDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLE9BQU87Z0JBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwRSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxPQUFPO2dCQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDckU7SUFDSCxDQUFDO0lBR0QsWUFBWTtRQUVWLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUV0QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUN6QyxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEUsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7b0JBQUUsU0FBUztnQkFDNUIsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLEVBQUU7b0JBQy9CLEtBQUssTUFBTSxVQUFVLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRTt3QkFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7cUJBQ2pFO2lCQUNGO2FBQ0Y7U0FDRjtRQUNELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFO1lBQ2hDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3BFO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsWUFBWTtRQUNWLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFtQixHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBYSxDQUFDLENBQUM7UUFDdkUsTUFBTSxTQUFTLEdBQ1gsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUMsS0FBSyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQWtCLENBQUEsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sS0FBSyxHQUFlLEVBQUUsQ0FBQztRQUc3QixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDbkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxPQUFPO2dCQUFFLFNBQVM7WUFDdkIsTUFBTSxNQUFNLEdBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNO2dCQUFFLFNBQVM7WUFDN0IsTUFBTSxJQUFJLEdBQWE7Z0JBQ3JCLE1BQU0sRUFBRSxFQUFFO2dCQUNWLEVBQUUsRUFBRSxLQUFLLEVBQUU7Z0JBQ1gsU0FBUyxFQUFFLElBQUksR0FBRyxFQUFFO2dCQUNwQixNQUFNO2dCQUNOLE9BQU87Z0JBQ1AsS0FBSyxFQUFFLElBQUksR0FBRyxFQUFFO2FBQ2pCLENBQUM7WUFDRixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pCLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxFQUFFO2dCQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDcEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO2FBQzdCO1NBQ0Y7UUFFRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtZQUMvQixJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2hCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQzthQUN2QjtTQUNGO1FBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDMUMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFJVCxTQUFTO2FBQ1Y7WUFDRCxLQUFLLE1BQU0sRUFBQyxNQUFNLEVBQUUsV0FBVyxFQUFDLElBQUksUUFBUSxFQUFFO2dCQUM1QyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtvQkFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZDO2FBQ0Y7U0FDRjtRQUNELE9BQU8sRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBQyxDQUFDO0lBQ25DLENBQUM7SUFHRCxRQUFRLENBQUMsS0FBWSxFQUFFLE1BQWU7UUFDcEMsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBR2xCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdEU7WUFDRCxPQUFPO1NBQ1I7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLFVBQVUsRUFBUyxDQUFDO1FBQ3RDLE1BQU0sSUFBSSxHQUFHLElBQUksVUFBVSxFQUFTLENBQUM7UUFDckMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsTUFBTSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEMsSUFBSSxJQUFJO2dCQUFFLE9BQU87WUFDakIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQixLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxFQUFTLENBQUM7WUFDdkMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUM1QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzNCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQzlDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ25FO2FBQ0Y7WUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRTtnQkFDekIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztvQkFBRSxTQUFTO2dCQUM3QixLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2pCO1NBQ0Y7SUFDSCxDQUFDO0lBUUQsV0FBVztRQUVULEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUNaLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzlEO1FBR0QsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFBRSxTQUFTO1lBQ2hFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3RDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUM5QjtTQUNGO0lBQ0gsQ0FBQztJQVNELGNBQWM7UUFFWixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUMzQyxJQUFJLENBQUMsT0FBTztnQkFBRSxTQUFTO1lBQ3ZCLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsQyxJQUFJLEdBQUcsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFO2dCQUMxQixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDbkQ7WUFDRCxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEMsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtnQkFDMUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2xEO1NBQ0Y7UUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDL0IsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFBRSxTQUFTO1lBQy9ELE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDbEQ7SUFDSCxDQUFDO0lBRUQsdUJBQXVCLENBQUMsRUFBVSxFQUFFLEVBQVUsRUFBRSxHQUFRO1FBRXRELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUUvQixNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztTQUMvRDtRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUUvQixNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQy9EO0lBQ0gsQ0FBQztJQUVELG9CQUFvQixDQUFDLFFBQWtCOztRQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztRQUM1QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBWSxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUM7UUFDOUMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO1lBR25DLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNsQixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQWEsQ0FBQyxDQUFDO2FBQ3ZFO2lCQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNqRCxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDckQ7U0FDRjtRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBRXRFLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7WUFDbEMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6RSxPQUFPLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQztRQUdGLE1BQU0sV0FBVyxHQUFHLENBQUMsT0FBZSxFQUFFLElBQVksRUFBRSxPQUFnQixFQUFFLEVBQUU7WUFFdEUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDeEIsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLElBQUk7Z0JBQUUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDbkQsSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDaEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUM7YUFDNUI7WUFFRCxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUU7Z0JBQ3RELE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzVCO1lBQ0QsSUFBSSxPQUFPO2dCQUFFLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUU7Z0JBTTNELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbEIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUNmLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUU7b0JBQ3pDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2xDLE1BQU0sRUFBRSxDQUFDO2lCQUNWO2dCQUNELElBQUksTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDZCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO2lCQUMzQjtxQkFBTSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUU7b0JBQ3JCLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDO2lCQUMzQjtxQkFBTSxJQUFJLE1BQU0sR0FBRyxFQUFFLEVBQUU7b0JBQ3RCLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDO2lCQUMzQjthQUNGO1lBQ0QsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRTtnQkFJMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBVSxFQUFFO29CQUMvRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQzt3QkFDdEMsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO3dCQUNuQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUN6QixNQUFNO3FCQUNQO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQztRQUVGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDekQsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLE1BQU0sR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUMvQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLElBQUksR0FDTixPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDeEMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQzFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsMENBQUUsSUFBSSxDQUFDO2dCQUN4RCxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFDLENBQUM7Z0JBQy9ELElBQUksR0FBRyxFQUFFO29CQUNQLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDbEQ7Z0JBQ0QsTUFBTSxLQUFLLGVBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSyxDQUFDLDBDQUFFLEtBQUssbUNBQUksRUFBRSxDQUFDO2dCQUN4RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUM3QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFM0IsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLElBQUksR0FBRyxJQUFJLEVBQUU7d0JBQ25DLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNqQztvQkFDRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbEUsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBRWpELElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUk7d0JBQ2hELElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRTt3QkFDM0QsTUFBTSxTQUFTLEdBQ1gsV0FBVyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUN4QyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBRW5DLElBQUksU0FBUyxFQUFFOzRCQUliLE9BQU87Z0NBQ0gsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUNQLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3ZCLFNBQVMsQ0FBQyxDQUFDO3lCQUN6QztxQkFDRjtvQkFDRCxJQUFJLE9BQU87d0JBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUM5QzthQUNGO1NBQ0Y7UUFHRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDakMsTUFBTSxFQUFDLElBQUksRUFBRSxRQUFRLEVBQUMsR0FBRyxJQUFJLENBQUM7WUFDOUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFHekMsSUFBSSxFQUFVLENBQUM7WUFDZixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRTtnQkFDckIsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLElBQUksUUFBUSxFQUFFO29CQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2lCQUNqRTthQUNGO2lCQUFNO2dCQUNMLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUMvRDtZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN6QixJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFO2dCQUVoRSxJQUFJLENBQUMsd0JBQXdCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQzthQUM3QztTQUNGO0lBQ0gsQ0FBQztJQUVELHFCQUFxQixDQUFDLFFBQWtCO1FBQ3RDLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUNuQyxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDdEM7aUJBQU0sSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2xDO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNuQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDcEM7aUJBQU0sSUFBSSxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBRWhELElBQUksQ0FBQyxhQUFhLENBQ2QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkM7U0FDRjtJQUNILENBQUM7SUFFRCxjQUFjLENBQUMsUUFBa0IsRUFBRSxLQUFZO1FBWTdDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUxRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pFLElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV2RSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxQyxJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDbEIsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsSUFBSSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDbkI7U0FDRjtRQUNELElBQUksTUFBTSxDQUFDLE1BQU07WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFL0QsUUFBUSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUM5QixLQUFLLElBQUk7Z0JBRVAsSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsRUFBRTtvQkFFM0QsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakQ7cUJBQU0sSUFBSSxPQUFPLENBQUMsRUFBRSxLQUFLLElBQUk7b0JBQ25CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRTtvQkFDbEMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFLEVBQUU7b0JBRTlDLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFDTixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2lCQUNoRTtnQkFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRTtvQkFFdEMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ25GO2dCQUNELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdEUsTUFBTTtZQUVSLEtBQUssSUFBSTtnQkFFUCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQy9ELE1BQU07WUFFUixLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSSxDQUFDO1lBQUMsS0FBSyxJQUFJLENBQUM7WUFBQyxLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSTtnQkFFbkQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRCxNQUFNO1lBRVIsS0FBSyxJQUFJLENBQUMsQ0FBQztnQkFFVCxNQUFNLEdBQUcsR0FDUCxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7b0JBQ2hDLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELFlBQVksQ0FBQztnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFDOUMsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO2dCQUMvQyxNQUFNO2FBQ1A7WUFFRCxLQUFLLElBQUk7Z0JBRVAsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQ3BELEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDL0MsTUFBTTtZQUVSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQzlDLE1BQU07WUFFUixLQUFLLElBQUk7Z0JBS1AsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUU7b0JBT3pELE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztpQkFDM0Q7Z0JBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztnQkFDM0QsTUFBTTtTQUNUO1FBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUN2RSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFDOUIsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDbEQ7SUFDSCxDQUFDO0lBRUQsVUFBVSxDQUFDLFFBQWtCLEVBQUUsS0FBWTs7UUFDekMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBTTFDLElBQUksTUFBTSxHQUNOLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxtQ0FBSSxJQUFJLENBQUMsQ0FBQztRQUUzRSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDN0M7UUFFRCxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtZQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDekQ7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRTtZQUM5RCxJQUFJLE9BQU8sQ0FBQztZQUNaLE9BQU8sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdkQsSUFBSSxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUU5QixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRSxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFNbEU7aUJBQU0sSUFBSSxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUU7Z0JBSzlELE9BQU8sR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3ZFO2lCQUFNLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtnQkFDN0MsT0FBTyxHQUFHLFNBQVMsQ0FBQzthQUNyQjtZQUVELElBQUksT0FBTztnQkFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQzNFO1FBR0QsSUFBSSxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ3ZDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2hEO1FBR0QsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztZQUFFLE9BQU87UUFDdEMsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUd6QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxhQUFhLEVBQUU7WUFDakMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxXQUFXLE1BQUksRUFBRSxhQUFGLEVBQUUsdUJBQUYsRUFBRSxDQUFFLEtBQUssQ0FBQyxVQUFVLENBQUE7Z0JBQUUsT0FBTztZQUN6RCxJQUFJLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxLQUFLLENBQUMsS0FBSztnQkFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFlLENBQUMsQ0FBQztTQUNuRDtRQUdELE1BQU0sTUFBTSxlQUNSLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsbUNBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsbUNBQUksRUFBRSxDQUFDO1FBQ3hFLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxFQUFFO1lBRXRCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztZQUNyQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNsQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxhQUFGLEVBQUUsdUJBQUYsRUFBRSxDQUFFLEtBQUssQ0FBQyxLQUFLO2dCQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQWUsQ0FBQyxDQUFDO1lBQ2hELElBQUksRUFBQyxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQSxJQUFJLEVBQUMsRUFBRSxhQUFGLEVBQUUsdUJBQUYsRUFBRSxDQUFFLEtBQUssQ0FBQyxVQUFVLENBQUEsRUFBRTtnQkFFbkQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN2QztZQUVELElBQUksQ0FBQSxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsS0FBSyxDQUFDLFVBQVUsTUFBSSxFQUFFLGFBQUYsRUFBRSx1QkFBRixFQUFFLENBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQTtnQkFBRSxNQUFNO1lBRXpELElBQUksRUFBRSxhQUFGLEVBQUUsdUJBQUYsRUFBRSxDQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUU7Z0JBQ25CLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQWUsQ0FBQyxDQUFDO2FBQ2hDO1NBQ0Y7SUFDSCxDQUFDO0lBRUQsYUFBYSxDQUFDLE1BQWMsRUFBRSxHQUFRLEVBQ3hCLEdBQXlCLEVBQUUsTUFBbUI7UUFDMUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRCxNQUFNLElBQUksR0FBRyxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDO1FBQ3pDLFFBQVEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDN0IsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbEMsTUFBTTtZQVFSLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3RFLE1BQU07WUFFUixLQUFLLElBQUk7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FDYixNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1RCxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzVELE1BQU07WUFFUixLQUFLLElBQUksQ0FBQztZQUNWLEtBQUssSUFBSTtnQkFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1RCxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUVQLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLElBQUksSUFBSSxLQUFLLElBQUk7b0JBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN4RSxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUNQLElBQUksQ0FBQyxZQUFZLENBQ2IsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN0RSxNQUFNO1lBRVIsS0FBSyxJQUFJO2dCQUVQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0QsTUFBTTtZQUVSLEtBQUssSUFBSTtnQkFHUCxNQUFNO1NBQ1Q7SUFJSCxDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBa0I7UUFDeEMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3pELElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQ3pCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ2xEO0lBQ0gsQ0FBQztJQUVELGlCQUFpQixDQUFDLE1BQWMsRUFBRSxRQUFrQixFQUFFLEdBQWdCO1FBU3BFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRTtZQUFFLE9BQU87UUFDOUMsTUFBTSxLQUFLLEdBQWtCLEVBQUUsQ0FBQztRQUNoQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMvQyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUU7Z0JBQzVELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekMsTUFBTTthQUNQO1NBQ0Y7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRTtZQUN0QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDNUM7UUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFDTixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQU85RSxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxRQUFrQixFQUFFLFlBQXlCO1FBR3BFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLEVBQUUsSUFBSSxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDbEQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLENBQUM7UUFDM0MsSUFBSSxRQUFRLENBQUM7UUFDYixLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUU7WUFDakMsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUU7Z0JBQUUsUUFBUSxHQUFHLElBQUksQ0FBQztTQUNyRDtRQUNELElBQUksQ0FBQyxRQUFRO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRTNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUM7UUFDckIsT0FBTyxJQUFJLEVBQUU7WUFDWCxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtnQkFDZCxNQUFNLElBQUksR0FBWTtvQkFDcEIsS0FBSyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO29CQUN2QyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBRUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM1QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBR3RDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUM7Z0JBQzlELE9BQU87YUFDUjtTQUNGO0lBQ0gsQ0FBQztJQUVELGtCQUFrQixDQUFDLE1BQWMsRUFBRSxHQUFnQixFQUFFLE9BQWU7UUFDbEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQzFCLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNuRTtRQUVELE1BQU0sV0FBVyxHQUFHLE9BQU8sSUFBSSxJQUFJLENBQUM7UUFDcEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFDakIsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQWMsRUFBRSxPQUFnQjtRQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sRUFBRTtZQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsSUFBSSxJQUFJO2dCQUFFLFNBQVM7WUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQy9EO0lBQ0gsQ0FBQztJQUVELFFBQVEsQ0FBQyxNQUFjLEVBQUUsV0FBd0IsRUFBRSxNQUFnQjtRQUNqRSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1lBQUUsT0FBTztRQUM5QyxNQUFNLEtBQUssR0FBRyxFQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBQyxDQUFDO1FBQ3JFLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUztZQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDbEM7SUFDSCxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUN4QyxLQUFhLEVBQUUsSUFBYztRQUN4QyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU1QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLE1BQU0sQ0FBQztRQUM1QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFcEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDakUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVztZQUFFLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEQsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVztZQUFFLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDcEQsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWTtZQUFFLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDdEQsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYztZQUFFLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDeEQsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUFFLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsV0FBd0IsRUFBRSxLQUFlO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNsQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ25CO1NBQ0Y7UUFDRCxJQUFJLE1BQU0sQ0FBQyxNQUFNO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxDQUFTO1FBQ3hCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDckIsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUFFLE9BQU8sRUFBRSxDQUFDO1lBQ25DLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQUUsT0FBTyxFQUFFLENBQUM7U0FDcEM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQsVUFBVSxDQUFDLENBQVM7UUFDbEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELGNBQWMsQ0FBQyxDQUFTOztRQUN0QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxtQ0FBSSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELFVBQVUsQ0FBQyxDQUFTO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUU5QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMxRSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWtCLEVBQUUsS0FBWTtRQUcxQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssSUFBSTtZQUFFLE9BQU87UUFDbkQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUM7UUFDakMsTUFBTSxJQUFJLEdBQ04sTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkUsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFXLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWMsRUFBRSxJQUFVLEVBQzFCLGVBQTRCLFdBQVcsQ0FBQyxJQUFJO1FBQ3ZELElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNuRSxNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN4RSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzVDO2FBQU07WUFDTCxJQUFJLENBQUMsWUFBWSxDQUNiLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1NBQzlEO0lBQ0gsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFrQixFQUFFLEtBQVk7UUFFM0MsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSTtZQUFFLE9BQU87UUFDN0MsTUFBTSxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDOUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLElBQUksTUFBTSxJQUFJLElBQUk7WUFBRSxPQUFPO1FBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxNQUFNLENBQUEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzNFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQ2hELElBQUksRUFBRSxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWtCLEVBQUUsS0FBWTtRQU03QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLE9BQU8sQ0FBQztZQUFFLE9BQU87UUFDMUMsTUFBTSxFQUNKLEtBQUssRUFBRSxRQUFRLEVBQ2YsS0FBSyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsR0FDOUQsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQixJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLHdCQUF3QixJQUFJLE9BQU8sQ0FBQyxPQUFPO1lBQ2hFLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FFM0U7UUFDRCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBQUUsT0FBTztRQUNoQyxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsT0FBTztTQUNSO1FBQ0QsTUFBTSxNQUFNLEdBQ1IsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUM7YUFDbkQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELGNBQWMsQ0FBQyxNQUFjLEVBQUUsSUFBaUIsRUFBRSxJQUFVLEVBQUUsR0FBWTtRQUV4RSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSx3QkFBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLG1DQUFJLENBQUMsR0FBQSxDQUFDLENBQUMsQ0FBQztRQUN0RSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBYyxDQUFDLENBQUMsQ0FBQztRQUVoRCxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxFQUFFO1lBQzVDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3ZDO1FBQ0QsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1NBQzFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRS9DLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDMUIsS0FBSyxJQUFJO2dCQUVQLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxNQUFNO1lBQ1IsS0FBSyxJQUFJLENBQUM7WUFBQyxLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSSxDQUFDO1lBQUMsS0FBSyxJQUFJLENBQUM7WUFBQyxLQUFLLElBQUksQ0FBQztZQUFDLEtBQUssSUFBSTtnQkFFOUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNO1lBQ1IsS0FBSyxJQUFJO2dCQUVQLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFDWCxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQzlDLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDL0MsTUFBTTtTQUNUO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxNQUFjLEVBQUUsR0FBZ0I7UUFHNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU07WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDMUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksSUFBSSxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQVU7UUFFekIsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFO1lBRWpDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNwRSxJQUFJLFlBQVk7Z0JBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFzQixDQUFDLENBQUMsQ0FBQztTQUNsRTtRQUNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDdkIsTUFBTSxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUU7WUFDbEQsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEVBQUU7WUFDMUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEM7YUFBTTtZQUNMLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFCLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDcEU7U0FDRjtRQUVELE1BQU0sS0FBSyxHQUFnQixFQUFFLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRTtZQUM3QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMxRSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7UUFDRCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDbkMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNwRTthQUFNLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFO1lBQ25DLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3RDO1FBQ0QsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxPQUFlLEVBQUUsS0FBYTtRQUM3QyxNQUFNLEtBQUssR0FBRztZQUNaLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXO1lBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjO1NBQzNELENBQUMsT0FBTyxDQUFDLENBQUM7UUFDWCxJQUFJLEtBQUssS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHO1lBQ2IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO1lBQzNELENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUN6RCxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztZQUM3RCxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7U0FDN0QsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNYLElBQUksS0FBSyxLQUFLLENBQUM7WUFBRSxPQUFPLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUM5QyxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFNBQVMsQ0FBQyxFQUFVO1FBQ2xCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7WUFDekQsSUFBSSxHQUFHLEtBQUssRUFBRTtnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUM5QjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFHRCxrQkFBa0IsQ0FBQyxLQUFlOztRQUNoQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDeEIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO2dCQUNaLE1BQU0sS0FBSyxTQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsMENBQUUsS0FBSyxDQUFDO2dCQUN0QyxJQUFJLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxVQUFVO29CQUFFLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQzthQUNsRDtpQkFBTTtnQkFDTCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixJQUFJLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxLQUFLLENBQUMsV0FBVztvQkFBRSxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxLQUFLO29CQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQWUsQ0FBQyxDQUFDO2FBQ25EO1NBQ0Y7UUFDRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUdELHNCQUFzQixDQUFDLEtBQWU7O1FBQ3BDLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3hCLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtnQkFDYixNQUFNLEtBQUssU0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLDBDQUFFLEtBQUssQ0FBQztnQkFDdEMsSUFBSSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsV0FBVztvQkFBRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUM7YUFDakQ7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMzQixJQUFJLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxLQUFLLENBQUMsVUFBVTtvQkFBRSxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLEtBQUssQ0FBQyxLQUFLO29CQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNGO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQVk7O1FBRWYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxTQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQ0FBSSxDQUFDLENBQUM7UUFDeEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVELFFBQVEsQ0FBQyxRQUF5QixFQUFFLEtBQUssR0FBRyxDQUFDO1FBQzNDLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUTtZQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBYztRQUMzQixRQUFRLElBQUksRUFBRTtZQUNaLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN4RCxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEQsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3pELEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztDQUNGO0FBRUQsU0FBUyxHQUFHLENBQUMsR0FBRyxLQUFhO0lBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRUQsU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFhO0lBQzFCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBVUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcmVhfSBmcm9tICcuLi9zcG9pbGVyL2FyZWEuanMnO1xuaW1wb3J0IHtkaWV9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0ZsYWcsIExvZ2ljfSBmcm9tICcuLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtJdGVtLCBJdGVtVXNlfSBmcm9tICcuLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TG9jYWxEaWFsb2csIE5wY30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleCwgc2VxfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcCwgTGFiZWxlZFNldCwgaXRlcnMsIHNwcmVhZH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge0Rpcn0gZnJvbSAnLi9kaXIuanMnO1xuaW1wb3J0IHtJdGVtSW5mbywgTG9jYXRpb25MaXN0LCBTbG90SW5mb30gZnJvbSAnLi9ncmFwaC5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9oaXRib3guanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50LCBSb3V0ZX0gZnJvbSAnLi9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1NjcmVlbklkfSBmcm9tICcuL3NjcmVlbmlkLmpzJztcbmltcG9ydCB7VGVycmFpbiwgVGVycmFpbnN9IGZyb20gJy4vdGVycmFpbi5qcyc7XG5pbXBvcnQge1RpbGVJZH0gZnJvbSAnLi90aWxlaWQuanMnO1xuaW1wb3J0IHtUaWxlUGFpcn0gZnJvbSAnLi90aWxlcGFpci5qcyc7XG5pbXBvcnQge1dhbGxUeXBlfSBmcm9tICcuL3dhbGx0eXBlLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuLi9yb20vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbmludGVyZmFjZSBDaGVjayB7XG4gIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudDtcbiAgY2hlY2tzOiBudW1iZXJbXTtcbn1cblxuLy8gQmFzaWMgYWxnb3JpdGhtOlxuLy8gIDEuIGZpbGwgdGVycmFpbnMgZnJvbSBtYXBzXG4vLyAgMi4gbW9kaWZ5IHRlcnJhaW5zIGJhc2VkIG9uIG5wY3MsIHRyaWdnZXJzLCBib3NzZXMsIGV0Y1xuLy8gIDIuIGZpbGwgYWxsRXhpdHNcbi8vICAzLiBzdGFydCB1bmlvbmZpbmRcbi8vICA0LiBmaWxsIC4uLj9cblxuLyoqIFN0b3JlcyBhbGwgdGhlIHJlbGV2YW50IGluZm9ybWF0aW9uIGFib3V0IHRoZSB3b3JsZCdzIGxvZ2ljLiAqL1xuZXhwb3J0IGNsYXNzIFdvcmxkIHtcblxuICAvKiogQnVpbGRzIGFuZCBjYWNoZXMgVGVycmFpbiBvYmplY3RzLiAqL1xuICByZWFkb25seSB0ZXJyYWluRmFjdG9yeSA9IG5ldyBUZXJyYWlucyh0aGlzLnJvbSk7XG5cbiAgLyoqIFRlcnJhaW5zIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5zID0gbmV3IE1hcDxUaWxlSWQsIFRlcnJhaW4+KCk7XG5cbiAgLyoqIENoZWNrcyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSBjaGVja3MgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFNldDxDaGVjaz4+KCgpID0+IG5ldyBTZXQoKSk7XG5cbiAgLyoqIFNsb3QgaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IHNsb3RzID0gbmV3IE1hcDxudW1iZXIsIFNsb3RJbmZvPigpO1xuICAvKiogSXRlbSBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgaXRlbXMgPSBuZXcgTWFwPG51bWJlciwgSXRlbUluZm8+KCk7XG5cbiAgLyoqIEZsYWdzIHRoYXQgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgZGlyZWN0IGFsaWFzZXMgZm9yIGxvZ2ljLiAqL1xuICByZWFkb25seSBhbGlhc2VzOiBNYXA8RmxhZywgRmxhZz47XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBpdGVtdXNlIHRyaWdnZXJzIHRvIHRoZSBpdGVtdXNlIHRoYXQgd2FudHMgaXQuICovXG4gIHJlYWRvbmx5IGl0ZW1Vc2VzID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBbSXRlbSwgSXRlbVVzZV1bXT4oKCkgPT4gW10pO1xuXG4gIC8qKiBSYXcgbWFwcGluZyBvZiBleGl0cywgd2l0aG91dCBjYW5vbmljYWxpemluZy4gKi9cbiAgcmVhZG9ubHkgZXhpdHMgPSBuZXcgTWFwPFRpbGVJZCwgVGlsZUlkPigpO1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gZXhpdHMgdG8gZW50cmFuY2VzLiAgVGlsZVBhaXIgaXMgY2Fub25pY2FsaXplZC4gKi9cbiAgcmVhZG9ubHkgZXhpdFNldCA9IG5ldyBTZXQ8VGlsZVBhaXI+KCk7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBUaWxlSWRzIHdpdGggc2VhbWxlc3MgZXhpdHMuICBUaGlzIGlzIHVzZWQgdG8gZW5zdXJlIHRoZVxuICAgKiBsb2dpYyB1bmRlcnN0YW5kcyB0aGF0IHRoZSBwbGF5ZXIgY2FuJ3Qgd2FsayBhY3Jvc3MgYW4gZXhpdCB0aWxlXG4gICAqIHdpdGhvdXQgY2hhbmdpbmcgbG9jYXRpb25zIChwcmltYXJpbHkgZm9yIGRpc2FibGluZyB0ZWxlcG9ydFxuICAgKiBza2lwKS5cbiAgICovXG4gIHJlYWRvbmx5IHNlYW1sZXNzRXhpdHMgPSBuZXcgU2V0PFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogVW5pb25maW5kIG9mIGNvbm5lY3RlZCBjb21wb25lbnRzIG9mIHRpbGVzLiAgTm90ZSB0aGF0IGFsbCB0aGVcbiAgICogYWJvdmUgcHJvcGVydGllcyBjYW4gYmUgYnVpbHQgdXAgaW4gcGFyYWxsZWwsIGJ1dCB0aGUgdW5pb25maW5kXG4gICAqIGNhbm5vdCBiZSBzdGFydGVkIHVudGlsIGFmdGVyIGFsbCB0ZXJyYWlucyBhbmQgZXhpdHMgYXJlXG4gICAqIHJlZ2lzdGVyZWQsIHNpbmNlIHdlIHNwZWNpZmljYWxseSBuZWVkIHRvICpub3QqIHVuaW9uIGNlcnRhaW5cbiAgICogbmVpZ2hib3JzLlxuICAgKi9cbiAgcmVhZG9ubHkgdGlsZXMgPSBuZXcgVW5pb25GaW5kPFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIFRpbGVQYWlycyBvZiBjYW5vbmljYWwgdW5pb25maW5kIHJlcHJlc2VudGF0aXZlIFRpbGVJZHMgdG9cbiAgICogYSBiaXRzZXQgb2YgbmVpZ2hib3IgZGlyZWN0aW9ucy4gIFdlIG9ubHkgbmVlZCB0byB3b3JyeSBhYm91dFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyBiZWNhdXNlIGFsbCBUaWxlSWRzIGhhdmUgdGhlIHNhbWUgdGVycmFpbi5cbiAgICogV2Ugd2lsbCBhZGQgYSByb3V0ZSBmb3IgZWFjaCBkaXJlY3Rpb24gd2l0aCB1bmlxdWUgcmVxdWlyZW1lbnRzLlxuICAgKi9cbiAgcmVhZG9ubHkgbmVpZ2hib3JzID0gbmV3IERlZmF1bHRNYXA8VGlsZVBhaXIsIG51bWJlcj4oKCkgPT4gMCk7XG5cbiAgLyoqIFJlcXVpcmVtZW50IGJ1aWxkZXIgZm9yIHJlYWNoaW5nIGVhY2ggY2Fub25pY2FsIFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgcm91dGVzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKCkgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKSk7XG5cbiAgLyoqIFJvdXRlcyBvcmlnaW5hdGluZyBmcm9tIGVhY2ggY2Fub25pY2FsIHRpbGUuICovXG4gIHJlYWRvbmx5IHJvdXRlRWRnZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBMYWJlbGVkU2V0PFJvdXRlPj4oKCkgPT4gbmV3IExhYmVsZWRTZXQoKSk7XG5cbiAgLyoqIExvY2F0aW9uIGxpc3Q6IHRoaXMgaXMgdGhlIHJlc3VsdCBvZiBjb21iaW5pbmcgcm91dGVzIHdpdGggY2hlY2tzLiAqL1xuICByZWFkb25seSByZXF1aXJlbWVudE1hcCA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxDb25kaXRpb24sIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgIChjOiBDb25kaXRpb24pID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKGMpKTtcblxuICAvKiogTG9jYXRpb24gd2l0aCBhIG5vcnRoIGV4aXQgdG8gTGltZSBUcmVlIExha2UgKGkuZS4gUmFnZSkuICovXG4gIHByaXZhdGUgbGltZVRyZWVFbnRyYW5jZUxvY2F0aW9uID0gLTE7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sIHJlYWRvbmx5IGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHRyYWNrZXIgPSBmYWxzZSkge1xuICAgIC8vIEJ1aWxkIGl0ZW1Vc2VzXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCB1c2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAodXNlLmtpbmQgPT09ICdleHBlY3QnKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQodXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHVzZS5raW5kID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQofnVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBCdWlsZCBhbGlhc2VzXG4gICAgdGhpcy5hbGlhc2VzID0gbmV3IE1hcChbXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZUFrYWhhbmEsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTb2xkaWVyLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU3RvbSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVdvbWFuLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5UYXZlcm4sIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgIF0pO1xuXG4gICAgLy8gSWYgdHJpZ2dlciBza2lwIGlzIG9uLCBzZWFtbGVzcyBleGl0cyBjYW4gYmUgY3Jvc3NlZCFcbiAgICBpZiAoZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgIC8vIE5PVEU6IHRoaXMgaXMgYSB0ZXJyaWJsZSBoYWNrLCBidXQgaXQgZWZmaWNpZW50bHkgcHJldmVudHNcbiAgICAgIC8vIGFkZGluZyB0aWxlcyB0byB0aGUgc2V0LCB3aXRob3V0IGNoZWNraW5nIHRoZSBmbGFnIGV2ZXJ5IHRpbWUuXG4gICAgICB0aGlzLnNlYW1sZXNzRXhpdHMuYWRkID0gKCkgPT4gdGhpcy5zZWFtbGVzc0V4aXRzO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciBsb2NhdGlvbnMgdG8gYnVpbGQgdXAgaW5mbyBhYm91dCB0aWxlcywgdGVycmFpbnMsIGNoZWNrcy5cbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5hZGRFeHRyYUNoZWNrcygpO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIFVuaW9uRmluZCBhbmQgdGhlIGV4aXRzIGFuZCBuZWlnaGJvcnMgc3RydWN0dXJlcy5cbiAgICB0aGlzLnVuaW9uTmVpZ2hib3JzKCk7XG4gICAgdGhpcy5yZWNvcmRFeGl0cygpO1xuICAgIHRoaXMuYnVpbGROZWlnaGJvcnMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSByb3V0ZXMvZWRnZXMuXG4gICAgdGhpcy5hZGRBbGxSb3V0ZXMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBsb2NhdGlvbiBsaXN0LlxuICAgIHRoaXMuY29uc29saWRhdGVDaGVja3MoKTtcbiAgICB0aGlzLmJ1aWxkUmVxdWlyZW1lbnRNYXAoKTtcbiAgfVxuXG4gIC8qKiBBZGRzIGNoZWNrcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYUNoZWNrcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBsb2NhdGlvbnM6IHtcbiAgICAgICAgTGVhZl9Ub29sU2hvcCxcbiAgICAgICAgTWV6YW1lU2hyaW5lLFxuICAgICAgICBPYWssXG4gICAgICAgIFNoeXJvbl9Ub29sU2hvcCxcbiAgICAgIH0sXG4gICAgICBmbGFnczoge1xuICAgICAgICBBYmxlVG9SaWRlRG9scGhpbixcbiAgICAgICAgQmFsbE9mRmlyZSwgQmFsbE9mVGh1bmRlciwgQmFsbE9mV2F0ZXIsIEJhbGxPZldpbmQsXG4gICAgICAgIEJhcnJpZXIsIEJsaXp6YXJkQnJhY2VsZXQsIEJvd09mTW9vbiwgQm93T2ZTdW4sXG4gICAgICAgIEJyZWFrU3RvbmUsIEJyZWFrSWNlLCBCcmVha0lyb24sXG4gICAgICAgIEJyb2tlblN0YXR1ZSwgQnV5SGVhbGluZywgQnV5V2FycCxcbiAgICAgICAgQ2xpbWJXYXRlcmZhbGwsIENsaW1iU2xvcGU4LCBDbGltYlNsb3BlOSwgQ2xpbWJTbG9wZTEwLFxuICAgICAgICBDcm9zc1BhaW4sIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sXG4gICAgICAgIEZsaWdodCwgRmxhbWVCcmFjZWxldCwgRm9ybUJyaWRnZSxcbiAgICAgICAgR2FzTWFzaywgR2xvd2luZ0xhbXAsXG4gICAgICAgIEluanVyZWREb2xwaGluLFxuICAgICAgICBMZWFkaW5nQ2hpbGQsIExlYXRoZXJCb290cyxcbiAgICAgICAgTW9uZXksXG4gICAgICAgIE9wZW5lZENyeXB0LFxuICAgICAgICBSYWJiaXRCb290cywgUmVmcmVzaCwgUmVwYWlyZWRTdGF0dWUsIFJlc2N1ZWRDaGlsZCxcbiAgICAgICAgU2hlbGxGbHV0ZSwgU2hpZWxkUmluZywgU2hvb3RpbmdTdGF0dWUsIFN0b3JtQnJhY2VsZXQsXG4gICAgICAgIFN3b3JkLCBTd29yZE9mRmlyZSwgU3dvcmRPZlRodW5kZXIsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZldpbmQsXG4gICAgICAgIFRvcm5hZG9CcmFjZWxldCwgVHJhdmVsU3dhbXAsIFRyaWdnZXJTa2lwLFxuICAgICAgICBXaWxkV2FycCxcbiAgICAgIH0sXG4gICAgICBpdGVtczoge1xuICAgICAgICBNZWRpY2FsSGVyYixcbiAgICAgICAgV2FycEJvb3RzLFxuICAgICAgfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSk7XG4gICAgY29uc3QgZW50ZXJPYWsgPSB0aGlzLmVudHJhbmNlKE9hayk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQm93T2ZNb29uLCBCb3dPZlN1biksIFtPcGVuZWRDcnlwdC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEFibGVUb1JpZGVEb2xwaGluLCBTaGVsbEZsdXRlKSxcbiAgICAgICAgICAgICAgICAgIFtDdXJyZW50bHlSaWRpbmdEb2xwaGluLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbZW50ZXJPYWtdLCBhbmQoTGVhZGluZ0NoaWxkKSwgW1Jlc2N1ZWRDaGlsZC5pZF0pO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtzdGFydF0sIGFuZChHbG93aW5nTGFtcCwgQnJva2VuU3RhdHVlKSxcbiAgICAgICAgICAgICAgICAgICAgICBSZXBhaXJlZFN0YXR1ZS5pZCwge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcblxuICAgIC8vIEFkZCBzaG9wc1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBMZWFmX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBTaHlyb25fVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KV07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gTWVkaWNhbEhlcmIuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eUhlYWxpbmcuaWRdKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSBXYXJwQm9vdHMuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eVdhcnAuaWRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBwc2V1ZG8gZmxhZ3NcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2luZC5yO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mRmlyZS5yO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXYXRlci5yO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gU3dvcmRPZlRodW5kZXIucjtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgY29uc3Qgd2luZDIgPSBvcihCYWxsT2ZXaW5kLCBUb3JuYWRvQnJhY2VsZXQpO1xuICAgICAgY29uc3QgZmlyZTIgPSBvcihCYWxsT2ZGaXJlLCBGbGFtZUJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHdhdGVyMiA9IG9yKEJhbGxPZldhdGVyLCBCbGl6emFyZEJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHRodW5kZXIyID0gb3IoQmFsbE9mVGh1bmRlciwgU3Rvcm1CcmFjZWxldCk7XG4gICAgICBicmVha1N0b25lID0gUmVxdWlyZW1lbnQubWVldChicmVha1N0b25lLCB3aW5kMik7XG4gICAgICBicmVha0ljZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJY2UsIGZpcmUyKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBSZXF1aXJlbWVudC5tZWV0KGZvcm1CcmlkZ2UsIHdhdGVyMik7XG4gICAgICBicmVha0lyb24gPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSXJvbiwgdGh1bmRlcjIpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9XG4gICAgICAgICAgICBSZXF1aXJlbWVudC5vcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogRmxhZyk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChcbiAgICAgICAgICAgICAgKGM6IHJlYWRvbmx5IENvbmRpdGlvbltdKSA9PlxuICAgICAgICAgICAgICAgICAgY1swXSA9PT0gc3dvcmQuYyA/IGMgOiBbc3dvcmQuYywgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKFN3b3JkT2ZXaW5kKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKFN3b3JkT2ZGaXJlKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoU3dvcmRPZldhdGVyKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChTd29yZE9mVGh1bmRlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtTdG9uZSwgW0JyZWFrU3RvbmUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSWNlLCBbQnJlYWtJY2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGZvcm1CcmlkZ2UsIFtGb3JtQnJpZGdlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0lyb24sIFtCcmVha0lyb24uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICBvcihTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXIpLFxuICAgICAgICAgICAgICAgICAgW1N3b3JkLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBGbGlnaHQuciwgW0NsaW1iV2F0ZXJmYWxsLmlkLCBDbGltYlNsb3BlMTAuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEJhcnJpZXIuciwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBHYXNNYXNrLnIsIFtUcmF2ZWxTd2FtcC5pZF0pO1xuICAgIGNvbnN0IHBhaW4gPSB0aGlzLmZsYWdzZXQuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpID8gR2FzTWFzayA6IExlYXRoZXJCb290cztcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMsIHBhaW4pLCBbQ3Jvc3NQYWluLmlkXSk7XG5cbiAgICBpZiAodGhpcy5mbGFnc2V0LmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIExlYXRoZXJCb290cy5yLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhcbiAgICAgICAgW3N0YXJ0XSwgYW5kKEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sIFJhYmJpdEJvb3RzKSxcbiAgICAgICAgW0NsaW1iV2F0ZXJmYWxsLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuZm9nTGFtcE5vdFJlcXVpcmVkKCkpIHtcbiAgICAgIC8vIG5vdCBhY3R1YWxseSB1c2VkLi4uP1xuICAgICAgY29uc3QgcmVxdWlyZUhlYWxlZCA9IHRoaXMuZmxhZ3NldC5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpO1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlSGVhbGVkID8gSW5qdXJlZERvbHBoaW4uciA6IFtbXV0sXG4gICAgICAgICAgICAgICAgICAgIFtBYmxlVG9SaWRlRG9scGhpbi5pZF0pO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVCYXJyaWVyKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBCdXlIZWFsaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFNoaWVsZFJpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sXG4gICAgICAgICAgICAgICAgICAgIFtTaG9vdGluZ1N0YXR1ZS5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSkge1xuICAgICAgLy8gTk9URTogd2l0aCBubyBtb25leSwgd2UndmUgZ290IDE2IE1QLCB3aGljaCBpc24ndCBlbm91Z2hcbiAgICAgIC8vIHRvIGdldCBwYXN0IHNldmVuIHN0YXR1ZXMuXG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgRmxpZ2h0LmNdXSwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sXG4gICAgICAgICAgICAgICAgICAgIFtUcmF2ZWxTd2FtcC5pZCwgQ3Jvc3NQYWluLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBSZXF1aXJlbWVudC5PUEVOLCBbV2lsZFdhcnAuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgUmVxdWlyZW1lbnQuT1BFTiwgW1RyaWdnZXJTa2lwLmlkXSk7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFRyaWdnZXJTa2lwLnIsXG4gICAgICAgICAgICAgICAgICAgIFtDcm9zc1BhaW4uaWQsIENsaW1iU2xvcGU4LmlkLFxuICAgICAgICAgICAgICAgICAgICAgQ2xpbWJTbG9wZTkuaWQgLyosIENsaW1iU2xvcGUxMC5pZCAqL10pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBZGRzIHJvdXRlcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYVJvdXRlcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBmbGFnczoge0J1eVdhcnAsIFN3b3JkT2ZUaHVuZGVyLCBUZWxlcG9ydCwgV2lsZFdhcnB9LFxuICAgICAgbG9jYXRpb25zOiB7TWV6YW1lU2hyaW5lfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgYXQgTWV6YW1lIFNocmluZS5cbiAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSksIFtdKSk7XG4gICAgLy8gU3dvcmQgb2YgVGh1bmRlciB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIGNvbnN0IHdhcnAgPSB0aGlzLnJvbS50b3duV2FycC50aHVuZGVyU3dvcmRXYXJwO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgQnV5V2FycC5jXSkpO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgVGVsZXBvcnQuY10pKTtcbiAgICB9XG4gICAgLy8gV2lsZCB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICAvLyBEb24ndCBjb3VudCBjaGFubmVsIGluIGxvZ2ljIGJlY2F1c2UgeW91IGNhbid0IGFjdHVhbGx5IG1vdmUuXG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdGhpcy5yb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbC5pZCkgY29udGludWU7XG4gICAgICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2UgdGlsZXMgaGFzIGV4dHJhIHJlcXVpcmVtZW50cyB0byBlbnRlciAoZS5nLlxuICAgICAgICAvLyBzd2FtcCkgLSBmaW5kIHRoZW0gYW5kIGNvbmNhdGVudGUuXG4gICAgICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZShsb2NhdGlvbik7XG4gICAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChlbnRyYW5jZSkgPz8gZGllKCdiYWQgZW50cmFuY2UnKTtcbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0ZXJyYWluLmVudGVyKSB7XG4gICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoZW50cmFuY2UsIFtXaWxkV2FycC5jLCAuLi5yb3V0ZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBDaGFuZ2UgdGhlIGtleSBvZiB0aGUgY2hlY2tzIG1hcCB0byBvbmx5IGJlIGNhbm9uaWNhbCBUaWxlSWRzLiAqL1xuICBjb25zb2xpZGF0ZUNoZWNrcygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCByb290ID0gdGhpcy50aWxlcy5maW5kKHRpbGUpO1xuICAgICAgaWYgKHRpbGUgPT09IHJvb3QpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgdGhpcy5jaGVja3MuZ2V0KHJvb3QpLmFkZChjaGVjayk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrcy5kZWxldGUodGlsZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEF0IHRoaXMgcG9pbnQgd2Uga25vdyB0aGF0IGFsbCBvZiB0aGlzLmNoZWNrcycga2V5cyBhcmUgY2Fub25pY2FsLiAqL1xuICBidWlsZFJlcXVpcmVtZW50TWFwKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCByZXEgPSB0aGlzLnJlcXVpcmVtZW50TWFwLmdldChjaGVjayBhcyBDb25kaXRpb24pO1xuICAgICAgICAgIGZvciAoY29uc3QgcjEgb2YgcmVxdWlyZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcjIgb2YgdGhpcy5yb3V0ZXMuZ2V0KHRpbGUpIHx8IFtdKSB7XG4gICAgICAgICAgICAgIHJlcS5hZGRMaXN0KFsuLi5yMSwgLi4ucjJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gbG9nIHRoZSBtYXA/XG4gICAgaWYgKCFERUJVRykgcmV0dXJuO1xuICAgIGNvbnN0IGxvZyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2NoZWNrLCByZXFdIG9mIHRoaXMucmVxdWlyZW1lbnRNYXApIHtcbiAgICAgIGNvbnN0IG5hbWUgPSAoYzogbnVtYmVyKSA9PiB0aGlzLnJvbS5mbGFnc1tjXS5uYW1lO1xuICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiByZXEpIHtcbiAgICAgICAgbG9nLnB1c2goYCR7bmFtZShjaGVjayl9OiAke1suLi5yb3V0ZV0ubWFwKG5hbWUpLmpvaW4oJyAmICcpfVxcbmApO1xuICAgICAgfVxuICAgIH1cbiAgICBsb2cuc29ydCgoYTogYW55LCBiOiBhbnkpID0+IGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwKTtcbiAgICBjb25zb2xlLmxvZyhsb2cuam9pbignJykpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYSBMb2NhdGlvbkxpc3Qgc3RydWN0dXJlIGFmdGVyIHRoZSByZXF1aXJlbWVudCBtYXAgaXMgYnVpbHQuICovXG4gIGdldExvY2F0aW9uTGlzdCh3b3JsZE5hbWUgPSAnQ3J5c3RhbGlzJyk6IExvY2F0aW9uTGlzdCB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGp1c3QgaW1wbGVtZW50aW5nIHRoaXMgZGlyZWN0bHk/XG4gICAgY29uc3QgY2hlY2tOYW1lID0gREVCVUcgPyAoZjogRmxhZykgPT4gZi5kZWJ1ZyA6IChmOiBGbGFnKSA9PiBmLm5hbWU7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmxkTmFtZSxcbiAgICAgIHJlcXVpcmVtZW50czogdGhpcy5yZXF1aXJlbWVudE1hcCxcbiAgICAgIGl0ZW1zOiB0aGlzLml0ZW1zLFxuICAgICAgc2xvdHM6IHRoaXMuc2xvdHMsXG4gICAgICBjaGVja05hbWU6IChjaGVjazogbnVtYmVyKSA9PiBjaGVja05hbWUodGhpcy5yb20uZmxhZ3NbY2hlY2tdKSxcbiAgICAgIHByZWZpbGw6IChyYW5kb206IFJhbmRvbSkgPT4ge1xuICAgICAgICBjb25zdCB7Q3J5c3RhbGlzLCBNZXNpYUluVG93ZXIsIExlYWZFbGRlcn0gPSB0aGlzLnJvbS5mbGFncztcbiAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChbW01lc2lhSW5Ub3dlci5pZCwgQ3J5c3RhbGlzLmlkXV0pO1xuICAgICAgICBpZiAodGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVN3b3JkKCkpIHtcbiAgICAgICAgICAvLyBQaWNrIGEgc3dvcmQgYXQgcmFuZG9tLi4uPyBpbnZlcnNlIHdlaWdodD9cbiAgICAgICAgICBtYXAuc2V0KExlYWZFbGRlci5pZCwgMHgyMDAgfCByYW5kb20ubmV4dEludCg0KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgICAgLy8gVE9ETyAtIGlmIGFueSBpdGVtcyBzaG91bGRuJ3QgYmUgc2h1ZmZsZWQsIHRoZW4gZG8gdGhlIHByZS1maWxsLi4uXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKiogQWRkIHRlcnJhaW5zIGFuZCBjaGVja3MgZm9yIGEgbG9jYXRpb24sIGZyb20gdGlsZXMgYW5kIHNwYXducy4gKi9cbiAgcHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgcmV0dXJuO1xuICAgIC8vIExvb2sgZm9yIHdhbGxzLCB3aGljaCB3ZSBuZWVkIHRvIGtub3cgYWJvdXQgbGF0ZXIuXG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb24pO1xuICB9XG5cbiAgLyoqIFJ1biB0aGUgZmlyc3QgcGFzcyBvZiB1bmlvbnMgbm93IHRoYXQgYWxsIHRlcnJhaW5zIGFyZSBmaW5hbC4gKi9cbiAgdW5pb25OZWlnaGJvcnMoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHgxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeDFdKTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh5MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHkxXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEJ1aWxkcyB1cCB0aGUgcm91dGVzIGFuZCByb3V0ZUVkZ2VzIGRhdGEgc3RydWN0dXJlcy4gKi9cbiAgYWRkQWxsUm91dGVzKCkge1xuICAgIC8vIEFkZCBhbnkgZXh0cmEgcm91dGVzIGZpcnN0LCBzdWNoIGFzIHRoZSBzdGFydGluZyB0aWxlLlxuICAgIHRoaXMuYWRkRXh0cmFSb3V0ZXMoKTtcbiAgICAvLyBBZGQgYWxsIHRoZSBlZGdlcyBmcm9tIGFsbCBuZWlnaGJvcnMuXG4gICAgZm9yIChjb25zdCBbcGFpciwgZGlyc10gb2YgdGhpcy5uZWlnaGJvcnMpIHtcbiAgICAgIGNvbnN0IFtjMCwgYzFdID0gVGlsZVBhaXIuc3BsaXQocGFpcik7XG4gICAgICBjb25zdCB0MCA9IHRoaXMudGVycmFpbnMuZ2V0KGMwKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy50ZXJyYWlucy5nZXQoYzEpO1xuICAgICAgaWYgKCF0MCB8fCAhdDEpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyB0ZXJyYWluICR7aGV4KHQwID8gYzAgOiBjMSl9YCk7XG4gICAgICBmb3IgKGNvbnN0IFtkaXIsIGV4aXRSZXFdIG9mIHQwLmV4aXQpIHtcbiAgICAgICAgaWYgKCEoZGlyICYgZGlycykpIGNvbnRpbnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGV4aXRDb25kcyBvZiBleGl0UmVxKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBlbnRlckNvbmRzIG9mIHQxLmVudGVyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShjMSwgWy4uLmV4aXRDb25kcywgLi4uZW50ZXJDb25kc10pLCBjMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBkZWJ1ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWJ1ZycpO1xuICAgICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGRlYnVnLmFwcGVuZENoaWxkKG5ldyBBcmVhKHRoaXMucm9tLCB0aGlzLmdldFdvcmxkRGF0YSgpKS5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRXb3JsZERhdGEoKTogV29ybGREYXRhIHtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGNvbnN0IHRpbGVzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBUaWxlRGF0YT4oKCkgPT4gKHt9KSBhcyBUaWxlRGF0YSk7XG4gICAgY29uc3QgbG9jYXRpb25zID1cbiAgICAgICAgc2VxKDI1NiwgKCkgPT4gKHthcmVhczogbmV3IFNldCgpLCB0aWxlczogbmV3IFNldCgpfSBhcyBMb2NhdGlvbkRhdGEpKTtcbiAgICBjb25zdCBhcmVhczogQXJlYURhdGFbXSA9IFtdO1xuXG4gICAgLy8gZGlnZXN0IHRoZSBhcmVhc1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHRoaXMudGlsZXMuc2V0cygpKSB7XG4gICAgICBjb25zdCBjYW5vbmljYWwgPSB0aGlzLnRpbGVzLmZpbmQoaXRlcnMuZmlyc3Qoc2V0KSk7XG4gICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoY2Fub25pY2FsKTtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCByb3V0ZXMgPVxuICAgICAgICAgIHRoaXMucm91dGVzLmhhcyhjYW5vbmljYWwpID9cbiAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuZnJlZXplKHRoaXMucm91dGVzLmdldChjYW5vbmljYWwpKSA6IFtdO1xuICAgICAgaWYgKCFyb3V0ZXMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGFyZWE6IEFyZWFEYXRhID0ge1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICBpZDogaW5kZXgrKyxcbiAgICAgICAgbG9jYXRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgdGVycmFpbixcbiAgICAgICAgdGlsZXM6IG5ldyBTZXQoKSxcbiAgICAgIH07XG4gICAgICBhcmVhcy5wdXNoKGFyZWEpO1xuICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNldCkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHRpbGUgPj4+IDE2O1xuICAgICAgICBhcmVhLmxvY2F0aW9ucy5hZGQobG9jYXRpb24pO1xuICAgICAgICBhcmVhLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS5hcmVhcy5hZGQoYXJlYSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0udGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICB0aWxlcy5nZXQodGlsZSkuYXJlYSA9IGFyZWE7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgZXhpdHNcbiAgICBmb3IgKGNvbnN0IFthLCBiXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAodGlsZXMuaGFzKGEpKSB7XG4gICAgICAgIHRpbGVzLmdldChhKS5leGl0ID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBjaGVja3NcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IGFyZWEgPSB0aWxlcy5nZXQodGlsZSkuYXJlYTtcbiAgICAgIGlmICghYXJlYSkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKGBBYmFuZG9uZWQgY2hlY2sgJHtbLi4uY2hlY2tTZXRdLm1hcChcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgIHggPT4gWy4uLnguY2hlY2tzXS5tYXAoeSA9PiB5LnRvU3RyaW5nKDE2KSkpXG4gICAgICAgIC8vICAgICAgICAgICAgICAgIH0gYXQgJHt0aWxlLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLnJvbS5mbGFnc1tjaGVja10gfHwgZGllKCk7XG4gICAgICAgICAgYXJlYS5jaGVja3MucHVzaChbZmxhZywgcmVxdWlyZW1lbnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge3RpbGVzLCBhcmVhcywgbG9jYXRpb25zfTtcbiAgfVxuXG4gIC8qKiBBZGRzIGEgcm91dGUsIG9wdGlvbmFsbHkgd2l0aCBhIHByZXJlcXVpc2l0ZSAoY2Fub25pY2FsKSBzb3VyY2UgdGlsZS4gKi9cbiAgYWRkUm91dGUocm91dGU6IFJvdXRlLCBzb3VyY2U/OiBUaWxlSWQpIHtcbiAgICBpZiAoc291cmNlICE9IG51bGwpIHtcbiAgICAgIC8vIEFkZCBhbiBlZGdlIGluc3RlYWQgb2YgYSByb3V0ZSwgcmVjdXJzaW5nIG9uIHRoZSBzb3VyY2Unc1xuICAgICAgLy8gcmVxdWlyZW1lbnRzLlxuICAgICAgdGhpcy5yb3V0ZUVkZ2VzLmdldChzb3VyY2UpLmFkZChyb3V0ZSk7XG4gICAgICBmb3IgKGNvbnN0IHNyY1JvdXRlIG9mIHRoaXMucm91dGVzLmdldChzb3VyY2UpKSB7XG4gICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHJvdXRlLnRhcmdldCwgWy4uLnNyY1JvdXRlLCAuLi5yb3V0ZS5kZXBzXSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUaGlzIGlzIG5vdyBhbiBcImluaXRpYWwgcm91dGVcIiB3aXRoIG5vIHByZXJlcXVpc2l0ZSBzb3VyY2UuXG4gICAgY29uc3QgcXVldWUgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzZWVuID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc3RhcnQgPSByb3V0ZTsgLy8gVE9ETyBpbmxpbmVcbiAgICBxdWV1ZS5hZGQoc3RhcnQpO1xuICAgIGNvbnN0IGl0ZXIgPSBxdWV1ZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHt2YWx1ZSwgZG9uZX0gPSBpdGVyLm5leHQoKTtcbiAgICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgICBzZWVuLmFkZCh2YWx1ZSk7XG4gICAgICBxdWV1ZS5kZWxldGUodmFsdWUpO1xuICAgICAgY29uc3QgZm9sbG93ID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgICBjb25zdCB0YXJnZXQgPSB2YWx1ZS50YXJnZXQ7XG4gICAgICBjb25zdCBidWlsZGVyID0gdGhpcy5yb3V0ZXMuZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoYnVpbGRlci5hZGRSb3V0ZSh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRoaXMucm91dGVFZGdlcy5nZXQodGFyZ2V0KSkge1xuICAgICAgICAgIGZvbGxvdy5hZGQobmV3IFJvdXRlKG5leHQudGFyZ2V0LCBbLi4udmFsdWUuZGVwcywgLi4ubmV4dC5kZXBzXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5leHQgb2YgZm9sbG93KSB7XG4gICAgICAgIGlmIChzZWVuLmhhcyhuZXh0KSkgY29udGludWU7XG4gICAgICAgIHF1ZXVlLmRlbGV0ZShuZXh0KTsgLy8gcmUtYWRkIGF0IHRoZSBlbmQgb2YgdGhlIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmFkZChuZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIHVwIGB0aGlzLmV4aXRTZXRgIHRvIGluY2x1ZGUgYWxsIHRoZSBcImZyb20tdG9cIiB0aWxlIHBhaXJzXG4gICAqIG9mIGV4aXRzIHRoYXQgX2Rvbid0XyBzaGFyZSB0aGUgc2FtZSB0ZXJyYWluIEZvciBhbnkgdHdvLXdheSBleGl0XG4gICAqIHRoYXQgc2hhcmVzIHRoZSBzYW1lIHRlcnJhaW4sIGp1c3QgYWRkIGl0IGRpcmVjdGx5IHRvIHRoZVxuICAgKiB1bmlvbmZpbmQuXG4gICAqL1xuICByZWNvcmRFeGl0cygpIHtcbiAgICAvLyBBZGQgZXhpdCBUaWxlUGFpcnMgdG8gZXhpdFNldCBmcm9tIGFsbCBsb2NhdGlvbnMnIGV4aXRzLlxuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICB0aGlzLmV4aXRTZXQuYWRkKFxuICAgICAgICAgIFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZChmcm9tKSwgdGhpcy50aWxlcy5maW5kKHRvKSkpO1xuICAgIH1cbiAgICAvLyBMb29rIGZvciB0d28td2F5IGV4aXRzIHdpdGggdGhlIHNhbWUgdGVycmFpbjogcmVtb3ZlIHRoZW0gZnJvbVxuICAgIC8vIGV4aXRTZXQgYW5kIGFkZCB0aGVtIHRvIHRoZSB0aWxlcyB1bmlvbmZpbmQuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KGZyb20pICE9PSB0aGlzLnRlcnJhaW5zLmdldCh0bykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcmV2ZXJzZSA9IFRpbGVQYWlyLm9mKHRvLCBmcm9tKTtcbiAgICAgIGlmICh0aGlzLmV4aXRTZXQuaGFzKHJldmVyc2UpKSB7XG4gICAgICAgIHRoaXMudGlsZXMudW5pb24oW2Zyb20sIHRvXSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUoZXhpdCk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUocmV2ZXJzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgZGlmZmVyZW50LXRlcnJhaW4gbmVpZ2hib3JzIGluIHRoZSBzYW1lIGxvY2F0aW9uLiAgQWRkXG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIHRvIGB0aGlzLm5laWdoYm9yc2Agd2l0aCBhbGwgdGhlXG4gICAqIGRpcmVjdGlvbnMgdGhhdCBpdCBuZWlnaGJvcnMgaW4uICBBbHNvIGFkZCBleGl0cyBhcyBuZWlnaGJvcnMuXG4gICAqIFRoaXMgbXVzdCBoYXBwZW4gKmFmdGVyKiB0aGUgZW50aXJlIHVuaW9uZmluZCBpcyBjb21wbGV0ZSBzb1xuICAgKiB0aGF0IHdlIGNhbiBsZXZlcmFnZSBpdC5cbiAgICovXG4gIGJ1aWxkTmVpZ2hib3JzKCkge1xuICAgIC8vIEFkamFjZW50IGRpZmZlcmVudC10ZXJyYWluIHRpbGVzLlxuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBjb25zdCB0eTEgPSB0aGlzLnRlcnJhaW5zLmdldCh5MSk7XG4gICAgICBpZiAodHkxICYmIHR5MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHkxLCBEaXIuTm9ydGgpO1xuICAgICAgfVxuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgY29uc3QgdHgxID0gdGhpcy50ZXJyYWlucy5nZXQoeDEpO1xuICAgICAgaWYgKHR4MSAmJiB0eDEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB4MSwgRGlyLldlc3QpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBFeGl0cyAoanVzdCB1c2UgXCJub3J0aFwiIGZvciB0aGVzZSkuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW3QwLCB0MV0gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModDApIHx8ICF0aGlzLnRlcnJhaW5zLmhhcyh0MSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcCA9IFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZCh0MCksIHRoaXMudGlsZXMuZmluZCh0MSkpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAsIHRoaXMubmVpZ2hib3JzLmdldChwKSB8IDEpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHQwOiBUaWxlSWQsIHQxOiBUaWxlSWQsIGRpcjogRGlyKSB7XG4gICAgLy8gTk9URTogdDAgPCB0MSBiZWNhdXNlIGRpciBpcyBhbHdheXMgV0VTVCBvciBOT1JUSC5cbiAgICBjb25zdCBjMCA9IHRoaXMudGlsZXMuZmluZCh0MCk7XG4gICAgY29uc3QgYzEgPSB0aGlzLnRpbGVzLmZpbmQodDEpO1xuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MSkpIHtcbiAgICAgIC8vIDEgLT4gMCAod2VzdC9ub3J0aCkuICBJZiAxIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IHAxMCA9IFRpbGVQYWlyLm9mKGMxLCBjMCk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDEwLCB0aGlzLm5laWdoYm9ycy5nZXQocDEwKSB8ICgxIDw8IGRpcikpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDApKSB7XG4gICAgICAvLyAwIC0+IDEgKGVhc3Qvc291dGgpLiAgSWYgMCBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBvcHAgPSBkaXIgXiAyO1xuICAgICAgY29uc3QgcDAxID0gVGlsZVBhaXIub2YoYzAsIGMxKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMDEsIHRoaXMubmVpZ2hib3JzLmdldChwMDEpIHwgKDEgPDwgb3BwKSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qgd2FsbHMgPSBuZXcgTWFwPFNjcmVlbklkLCBXYWxsVHlwZT4oKTtcbiAgICBjb25zdCBzaG9vdGluZ1N0YXR1ZXMgPSBuZXcgU2V0PFNjcmVlbklkPigpO1xuICAgIGNvbnN0IGluVG93ZXIgPSAobG9jYXRpb24uaWQgJiAweGY4KSA9PT0gMHg1ODtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gV2FsbHMgbmVlZCB0byBjb21lIGZpcnN0IHNvIHdlIGNhbiBhdm9pZCBhZGRpbmcgc2VwYXJhdGVcbiAgICAgIC8vIHJlcXVpcmVtZW50cyBmb3IgZXZlcnkgc2luZ2xlIHdhbGwgLSBqdXN0IHVzZSB0aGUgdHlwZS5cbiAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICB3YWxscy5zZXQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCAoc3Bhd24uaWQgJiAzKSBhcyBXYWxsVHlwZSk7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLmlkID09PSAweDNmKSB7IC8vIHNob290aW5nIHN0YXR1ZXNcbiAgICAgICAgc2hvb3RpbmdTdGF0dWVzLmFkZChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3bikpO1xuICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLnJvbS50aWxlc2V0c1tsb2NhdGlvbi50aWxlc2V0XTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM107XG5cbiAgICBjb25zdCBnZXRFZmZlY3RzID0gKHRpbGU6IFRpbGVJZCkgPT4ge1xuICAgICAgY29uc3QgcyA9IGxvY2F0aW9uLnNjcmVlbnNbKHRpbGUgJiAweGYwMDApID4+PiAxMl1bKHRpbGUgJiAweGYwMCkgPj4+IDhdO1xuICAgICAgcmV0dXJuIHRpbGVFZmZlY3RzLmVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzXS50aWxlc1t0aWxlICYgMHhmZl1dO1xuICAgIH07XG5cbiAgICAvLyBSZXR1cm5zIHVuZGVmaW5lZCBpZiBpbXBhc3NhYmxlLlxuICAgIGNvbnN0IG1ha2VUZXJyYWluID0gKGVmZmVjdHM6IG51bWJlciwgdGlsZTogVGlsZUlkLCBiYXJyaWVyOiBib29sZWFuKSA9PiB7XG4gICAgICAvLyBDaGVjayBmb3IgZG9scGhpbiBvciBzd2FtcC4gIEN1cnJlbnRseSBkb24ndCBzdXBwb3J0IHNodWZmbGluZyB0aGVzZS5cbiAgICAgIGVmZmVjdHMgJj0gVGVycmFpbi5CSVRTO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDFhKSBlZmZlY3RzIHw9IFRlcnJhaW4uU1dBTVA7XG4gICAgICBpZiAobG9jYXRpb24uaWQgPT09IDB4NjAgfHwgbG9jYXRpb24uaWQgPT09IDB4NjgpIHtcbiAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLkRPTFBISU47XG4gICAgICB9XG4gICAgICAvLyBOT1RFOiBvbmx5IHRoZSB0b3AgaGFsZi1zY3JlZW4gaW4gdW5kZXJncm91bmQgY2hhbm5lbCBpcyBkb2xwaGluYWJsZVxuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDY0ICYmICgodGlsZSAmIDB4ZjBmMCkgPCAweDEwMzApKSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgaWYgKGJhcnJpZXIpIGVmZmVjdHMgfD0gVGVycmFpbi5CQVJSSUVSO1xuICAgICAgaWYgKCEoZWZmZWN0cyAmIFRlcnJhaW4uRE9MUEhJTikgJiYgZWZmZWN0cyAmIFRlcnJhaW4uU0xPUEUpIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGxlbmd0aCBvZiBzbG9wZTogc2hvcnQgc2xvcGVzIGFyZSBjbGltYmFibGUuXG4gICAgICAgIC8vIDYtOCBhcmUgYm90aCBkb2FibGUgd2l0aCBib290c1xuICAgICAgICAvLyAwLTUgaXMgZG9hYmxlIHdpdGggbm8gYm9vdHNcbiAgICAgICAgLy8gOSBpcyBkb2FibGUgd2l0aCByYWJiaXQgYm9vdHMgb25seSAobm90IGF3YXJlIG9mIGFueSBvZiB0aGVzZS4uLilcbiAgICAgICAgLy8gMTAgaXMgcmlnaHQgb3V0XG4gICAgICAgIGxldCBib3R0b20gPSB0aWxlO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gMDtcbiAgICAgICAgd2hpbGUgKGdldEVmZmVjdHMoYm90dG9tKSAmIFRlcnJhaW4uU0xPUEUpIHtcbiAgICAgICAgICBib3R0b20gPSBUaWxlSWQuYWRkKGJvdHRvbSwgMSwgMCk7XG4gICAgICAgICAgaGVpZ2h0Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlaWdodCA8IDYpIHtcbiAgICAgICAgICBlZmZlY3RzICY9IH5UZXJyYWluLlNMT1BFO1xuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDkpIHtcbiAgICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uU0xPUEU4O1xuICAgICAgICB9IGVsc2UgaWYgKGhlaWdodCA8IDEwKSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFOTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGVmZmVjdHMgJiBUZXJyYWluLlBBSU4pIHtcbiAgICAgICAgLy8gUGFpbiB0ZXJyYWlucyBhcmUgb25seSBpbXBhc3NpYmxlIGlmIHRoZXkncmUgYWxsIHN1cnJvdW5kZWRcbiAgICAgICAgLy8gYnkgb3RoZXIgcGFpbiB0ZXJyYWlucy5cbiAgICAgICAgdHlwZSBEZWx0YSA9IFtudW1iZXIsIG51bWJlcl1bXTtcbiAgICAgICAgZm9yIChjb25zdCBkZWx0YSBvZiBbWzAsIDFdLCBbMSwgMF0sIFswLCAtMV0sIFstMSwgMF1dIGFzIERlbHRhKSB7XG4gICAgICAgICAgaWYgKCEoZ2V0RWZmZWN0cyhUaWxlSWQuYWRkKHRpbGUsIC4uLmRlbHRhKSkgJlxuICAgICAgICAgICAgICAgIChUZXJyYWluLlBBSU4gfCBUZXJyYWluLkZMWSkpKSB7XG4gICAgICAgICAgICBlZmZlY3RzICY9IH5UZXJyYWluLlBBSU47XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRlcnJhaW5GYWN0b3J5LnRpbGUoZWZmZWN0cyk7XG4gICAgfTtcblxuICAgIGZvciAobGV0IHkgPSAwLCBoZWlnaHQgPSBsb2NhdGlvbi5oZWlnaHQ7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gbG9jYXRpb24uc2NyZWVuc1t5XTtcbiAgICAgIGNvbnN0IHJvd0lkID0gbG9jYXRpb24uaWQgPDwgOCB8IHkgPDwgNDtcbiAgICAgIGZvciAobGV0IHggPSAwLCB3aWR0aCA9IGxvY2F0aW9uLndpZHRoOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSB0aGlzLnJvbS5zY3JlZW5zW3Jvd1t4XV07XG4gICAgICAgIGNvbnN0IHNjcmVlbklkID0gU2NyZWVuSWQocm93SWQgfCB4KTtcbiAgICAgICAgY29uc3QgYmFycmllciA9IHNob290aW5nU3RhdHVlcy5oYXMoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnWXggPSBzY3JlZW5JZCAmIDB4ZmY7XG4gICAgICAgIGNvbnN0IHdhbGwgPSB3YWxscy5nZXQoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnID1cbiAgICAgICAgICAgIGluVG93ZXIgPyB0aGlzLnJvbS5mbGFncy5BbHdheXNUcnVlLmlkIDpcbiAgICAgICAgICAgIHdhbGwgIT0gbnVsbCA/IHRoaXMud2FsbENhcGFiaWxpdHkod2FsbCkgOlxuICAgICAgICAgICAgbG9jYXRpb24uZmxhZ3MuZmluZChmID0+IGYuc2NyZWVuID09PSBmbGFnWXgpPy5mbGFnO1xuICAgICAgICBjb25zdCBwaXQgPSBsb2NhdGlvbi5waXRzLmZpbmQocCA9PiBwLmZyb21TY3JlZW4gPT09IHNjcmVlbklkKTtcbiAgICAgICAgaWYgKHBpdCkge1xuICAgICAgICAgIHRoaXMuZXhpdHMuc2V0KFRpbGVJZChzY3JlZW5JZCA8PCA4IHwgMHg4OCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgVGlsZUlkKHBpdC50b1NjcmVlbiA8PCA4IHwgMHg4OCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxvZ2ljOiBMb2dpYyA9IHRoaXMucm9tLmZsYWdzW2ZsYWchXT8ubG9naWMgPz8ge307XG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlkID0gVGlsZUlkKHNjcmVlbklkIDw8IDggfCB0KTtcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgaWYgKGxvZ2ljLmFzc3VtZVRydWUgJiYgdGlsZSA8IDB4MjApIHtcbiAgICAgICAgICAgIHRpbGUgPSB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGVmZmVjdHMgPSBsb2NhdGlvbi5pc1Nob3AoKSA/IDAgOiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVdO1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gbWFrZVRlcnJhaW4oZWZmZWN0cywgdGlkLCBiYXJyaWVyKTtcbiAgICAgICAgICAvL2lmICghdGVycmFpbikgdGhyb3cgbmV3IEVycm9yKGBiYWQgdGVycmFpbiBmb3IgYWx0ZXJuYXRlYCk7XG4gICAgICAgICAgaWYgKHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPT0gdGlsZSAmJlxuICAgICAgICAgICAgICBmbGFnICE9IG51bGwgJiYgIWxvZ2ljLmFzc3VtZVRydWUgJiYgIWxvZ2ljLmFzc3VtZUZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGUgPVxuICAgICAgICAgICAgICAgIG1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgICAvL2lmICghYWx0ZXJuYXRlKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgLy8gTk9URTogdGhlcmUncyBhbiBvZGRpdHkgZnJvbSBob2xsb3dpbmcgb3V0IHRoZSBiYWNrcyBvZiBpcm9uXG4gICAgICAgICAgICAgIC8vIHdhbGxzIHRoYXQgb25lIGNvcm5lciBvZiBzdG9uZSB3YWxscyBhcmUgYWxzbyBob2xsb3dlZCBvdXQsXG4gICAgICAgICAgICAgIC8vIGJ1dCBvbmx5IHByZS1mbGFnLiAgSXQgZG9lc24ndCBhY3R1YWxseSBodXJ0IGFueXRoaW5nLlxuICAgICAgICAgICAgICB0ZXJyYWluID1cbiAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3RvcnkuZmxhZyh0ZXJyYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljLnRyYWNrID8gZmxhZyA6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0ZXJyYWluKSB0aGlzLnRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHtkZXN0LCBlbnRyYW5jZX0gPSBleGl0O1xuICAgICAgY29uc3QgZnJvbSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgIC8vIFNlYW1sZXNzIGV4aXRzICgweDIwKSBpZ25vcmUgdGhlIGVudHJhbmNlIGluZGV4LCBhbmRcbiAgICAgIC8vIGluc3RlYWQgcHJlc2VydmUgdGhlIFRpbGVJZCwganVzdCBjaGFuZ2luZyB0aGUgbG9jYXRpb24uXG4gICAgICBsZXQgdG86IFRpbGVJZDtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICB0byA9IFRpbGVJZChmcm9tICYgMHhmZmZmIHwgKGRlc3QgPDwgMTYpKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5zZWFtbGVzcyhwcmV2aW91cykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0byA9IHRoaXMuZW50cmFuY2UodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLCBlbnRyYW5jZSAmIDB4MWYpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgICAgaWYgKGRlc3QgPT09IHRoaXMucm9tLmxvY2F0aW9ucy5MaW1lVHJlZUxha2UuaWQgJiZcbiAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuTGltZVRyZWVMYWtlLmVudHJhbmNlc1tlbnRyYW5jZV0ueSA+IDB4YTApIHtcbiAgICAgICAgLy8gTm9ydGggZXhpdCB0byBsaW1lIHRyZWUgbGFrZTogbWFyayBsb2NhdGlvbi5cbiAgICAgICAgdGhpcy5saW1lVHJlZUVudHJhbmNlTG9jYXRpb24gPSBsb2NhdGlvbi5pZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTnBjKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0Jvc3MobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNDaGVzdCgpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0NoZXN0KGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24udHlwZSA9PT0gMyAmJiBzcGF3bi5pZCA9PT0gMHhlMCkge1xuICAgICAgICAvLyB3aW5kbWlsbCBibGFkZXNcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKFxuICAgICAgICAgICAgSGl0Ym94LnNjcmVlbihUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKSxcbiAgICAgICAgICAgIHRoaXMucm9tLmZsYWdzLlVzZWRXaW5kbWlsbEtleS5yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzVHJpZ2dlcihsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEZvciB0cmlnZ2Vycywgd2hpY2ggdGlsZXMgZG8gd2UgbWFyaz9cbiAgICAvLyBUaGUgdHJpZ2dlciBoaXRib3ggaXMgMiB0aWxlcyB3aWRlIGFuZCAxIHRpbGUgdGFsbCwgYnV0IGl0IGRvZXMgbm90XG4gICAgLy8gbGluZSB1cCBuaWNlbHkgdG8gdGhlIHRpbGUgZ3JpZC4gIEFsc28sIHRoZSBwbGF5ZXIgaGl0Ym94IGlzIG9ubHlcbiAgICAvLyAkYyB3aWRlICh0aG91Z2ggaXQncyAkMTQgdGFsbCkgc28gdGhlcmUncyBzb21lIHNsaWdodCBkaXNwYXJpdHkuXG4gICAgLy8gSXQgc2VlbXMgbGlrZSBwcm9iYWJseSBtYXJraW5nIGl0IGFzICh4LTEsIHktMSkgLi4gKHgsIHkpIG1ha2VzIHRoZVxuICAgIC8vIG1vc3Qgc2Vuc2UsIHdpdGggdGhlIGNhdmVhdCB0aGF0IHRyaWdnZXJzIHNoaWZ0ZWQgcmlnaHQgYnkgYSBoYWxmXG4gICAgLy8gdGlsZSBzaG91bGQgZ28gZnJvbSB4IC4uIHgrMSBpbnN0ZWFkLlxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNoZWNraW5nIHRyaWdnZXIncyBhY3Rpb246ICQxOSAtPiBwdXNoLWRvd24gbWVzc2FnZVxuXG4gICAgLy8gVE9ETyAtIHB1bGwgb3V0IHRoaXMucmVjb3JkVHJpZ2dlclRlcnJhaW4oKSBhbmQgdGhpcy5yZWNvcmRUcmlnZ2VyQ2hlY2soKVxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2VyKHNwYXduLmlkKTtcbiAgICBpZiAoIXRyaWdnZXIpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB0cmlnZ2VyICR7c3Bhd24uaWQudG9TdHJpbmcoMTYpfWApO1xuXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHModHJpZ2dlci5jb25kaXRpb25zKTtcbiAgICBsZXQgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMuZmlsdGVyQW50aVJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgbGV0IGhpdGJveCA9IEhpdGJveC50cmlnZ2VyKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgdHJpZ2dlci5mbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIGNoZWNrcyk7XG5cbiAgICBzd2l0Y2ggKHRyaWdnZXIubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgLy8gcHVzaC1kb3duIHRyaWdnZXJcbiAgICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4ODYgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVSYWJiaXRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBiaWdnZXIgaGl0Ym94IHRvIG5vdCBmaW5kIHRoZSBwYXRoIHRocm91Z2hcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC0xXSwgWzAsIDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmlnZ2VyLmlkID09PSAweGJhICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5hc3N1bWVUZWxlcG9ydFNraXAoKSAmJlxuICAgICAgICAgICAgICAgICAgICF0aGlzLmZsYWdzZXQuZGlzYWJsZVRlbGVwb3J0U2tpcCgpKSB7XG4gICAgICAgICAgLy8gY29weSB0aGUgdGVsZXBvcnQgaGl0Ym94IGludG8gdGhlIG90aGVyIHNpZGUgb2YgY29yZGVsXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmF0TG9jYXRpb24oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluV2VzdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgICAgICAvLyBhbGwgcHVzaC1kb3duIHRyaWdnZXJzIGNhbiBiZSBza2lwcGVkIHdpdGggdHJpZ2dlciBza2lwLi4uXG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IFJlcXVpcmVtZW50Lm9yKGFudGlSZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLlRyaWdnZXJTa2lwLnIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXF1aXJlbWVudHMpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZDpcbiAgICAgICAgLy8gc3RhcnQgbWFkbyAxIGJvc3MgZmlnaHRcbiAgICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuTWFkbzEsIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDg6IGNhc2UgMHgwYjogY2FzZSAweDBjOiBjYXNlIDB4MGQ6IGNhc2UgMHgwZjpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIHRyaWdnZXIgSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxdWlyZW1lbnRzLCB0cmlnZ2VyLmlkKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxODogeyAvLyBzdG9tIGZpZ2h0XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZTogd2FycCBib290cyBnbGl0Y2ggcmVxdWlyZWQgaWYgY2hhcmdlIHNob3RzIG9ubHkuXG4gICAgICAgIGNvbnN0IHJlcSA9XG4gICAgICAgICAgdGhpcy5mbGFnc2V0LmNoYXJnZVNob3RzT25seSgpID9cbiAgICAgICAgICBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgYW5kKHRoaXMucm9tLmZsYWdzLldhcnBCb290cykpIDpcbiAgICAgICAgICByZXF1aXJlbWVudHM7XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCB0aGlzLnJvbS5mbGFncy5TdG9tRmlnaHRSZXdhcmQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIDB4MWU6XG4gICAgICAgIC8vIGZvcmdlIGNyeXN0YWxpc1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgdGhpcy5yb20uZmxhZ3MuTWVzaWFJblRvd2VyLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFmOlxuICAgICAgICB0aGlzLmhhbmRsZUJvYXQodGlsZSwgbG9jYXRpb24sIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIE1vdmluZyBndWFyZFxuICAgICAgICAvLyB0cmVhdCB0aGlzIGFzIGEgc3RhdHVlPyAgYnV0IHRoZSBjb25kaXRpb25zIGFyZSBub3Qgc3VwZXIgdXNlZnVsLi4uXG4gICAgICAgIC8vICAgLSBvbmx5IHRyYWNrZWQgY29uZGl0aW9ucyBtYXR0ZXI/IDllID09IHBhcmFseXNpcy4uLiBleGNlcHQgbm90LlxuICAgICAgICAvLyBwYXJhbHl6YWJsZT8gIGNoZWNrIERhdGFUYWJsZV8zNTA0NVxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5Qb3J0b2FfUGFsYWNlRW50cmFuY2UpIHtcbiAgICAgICAgICAvLyBQb3J0b2EgcGFsYWNlIGZyb250IGd1YXJkIG5vcm1hbGx5IGJsb2NrcyBvbiBNZXNpYSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gQnV0IHRoZSBxdWVlbiBpcyBhY3R1YWxseSBhY2Nlc3NpYmxlIHdpdGhvdXQgc2VlaW5nIHRoZSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gSW5zdGVhZCwgYmxvY2sgYWNjZXNzIHRvIHRoZSB0aHJvbmUgcm9vbSBvbiBiZWluZyBhYmxlIHRvIHRhbGsgdG9cbiAgICAgICAgICAvLyB0aGUgZm9ydHVuZSB0ZWxsZXIsIGluIGNhc2UgdGhlIGd1YXJkIG1vdmVzIGJlZm9yZSB3ZSBjYW4gZ2V0IHRoZVxuICAgICAgICAgIC8vIGl0ZW0uICBBbHNvIG1vdmUgdGhlIGhpdGJveCB1cCBzaW5jZSB0aGUgdHdvIHNpZGUgcm9vbXMgX2FyZV8gc3RpbGxcbiAgICAgICAgICAvLyBhY2Nlc3NpYmxlLlxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbLTIsIDBdKTtcbiAgICAgICAgICBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5yb20uZmxhZ3MuVGFsa2VkVG9Gb3J0dW5lVGVsbGVyLnI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5oYW5kbGVNb3ZpbmdHdWFyZChoaXRib3gsIGxvY2F0aW9uLCBhbnRpUmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXF1aXJlbWVudC5PUEVOLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NOcGMobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBucGM6ICR7aGV4KHNwYXduLmlkKX1gKTtcbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnMgPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2NhdGlvbi5pZCkgfHwgW107XG4gICAgY29uc3QgcmVxID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTsgLy8gc2hvdWxkIGJlIHNpbmdsZVxuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICAvLyBOT1RFOiBSYWdlIGhhcyBubyB3YWxrYWJsZSBuZWlnaGJvcnMsIGFuZCB3ZSBuZWVkIHRoZSBzYW1lIGhpdGJveFxuICAgIC8vIGZvciBib3RoIHRoZSB0ZXJyYWluIGFuZCB0aGUgY2hlY2suXG4gICAgLy9cbiAgICAvLyBOT1RFIEFMU08gLSBSYWdlIHByb2JhYmx5IHNob3dzIHVwIGFzIGEgYm9zcywgbm90IGFuIE5QQz9cbiAgICBsZXQgaGl0Ym94OiBIaXRib3ggPVxuICAgICAgICBbdGhpcy50ZXJyYWlucy5oYXModGlsZSkgPyB0aWxlIDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpID8/IHRpbGVdO1xuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoaGl0Ym94LCByZXEsIGl0ZW0sIHVzZSk7XG4gICAgfVxuXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5TYWJlcmFEaXNndWlzZWRBc01lc2lhKSB7XG4gICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5TYWJlcmExLCByZXEpO1xuICAgIH1cblxuICAgIGlmICgobnBjLmRhdGFbMl0gJiAweDA0KSAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgICBsZXQgYW50aVJlcTtcbiAgICAgIGFudGlSZXEgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTtcbiAgICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUmFnZSkge1xuICAgICAgICAvLyBUT0RPIC0gbW92ZSBoaXRib3ggZG93biwgY2hhbmdlIHJlcXVpcmVtZW50P1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzIsIC0xXSwgWzIsIDBdLCBbMiwgMV0sIFsyLCAyXSk7XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTZdLCBbMCwgLTJdLCBbMCwgMl0sIFswLCA2XSk7XG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayBpZiB0aGlzIHdvcmtzPyAgdGhlIH5jaGVjayBzcGF3biBjb25kaXRpb24gc2hvdWxkXG4gICAgICAgIC8vIGFsbG93IHBhc3NpbmcgaWYgZ290dGVuIHRoZSBjaGVjaywgd2hpY2ggaXMgdGhlIHNhbWUgYXMgZ290dGVuXG4gICAgICAgIC8vIHRoZSBjb3JyZWN0IHN3b3JkLlxuICAgICAgICAvLyBUT0RPIC0gaXMgdGhpcyBldmVuIHJlcXVpcmVkIG9uY2Ugd2UgaGF2ZSB0aGUgUmFnZVRlcnJhaW4/Pz9cbiAgICAgICAgLy8gaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSBhbnRpUmVxID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUG9ydG9hVGhyb25lUm9vbUJhY2tEb29yR3VhcmQpIHtcbiAgICAgICAgLy8gUG9ydG9hIGJhY2sgZG9vciBndWFyZCBzcGF3bnMgaWYgKDEpIHRoZSBtZXNpYSByZWNvcmRpbmcgaGFzIG5vdCB5ZXRcbiAgICAgICAgLy8gYmVlbiBwbGF5ZWQsIGFuZCAoMikgdGhlIHBsYXllciBkaWRuJ3Qgc25lYWsgcGFzdCB0aGUgZWFybGllciBndWFyZC5cbiAgICAgICAgLy8gV2UgY2FuIHNpbXVsYXRlIHRoaXMgYnkgaGFyZC1jb2RpbmcgYSByZXF1aXJlbWVudCBvbiBlaXRoZXIgdG8gZ2V0XG4gICAgICAgIC8vIHBhc3QgaGltLlxuICAgICAgICBhbnRpUmVxID0gb3IodGhpcy5yb20uZmxhZ3MuTWVzaWFSZWNvcmRpbmcsIHRoaXMucm9tLmZsYWdzLlBhcmFseXNpcyk7XG4gICAgICB9IGVsc2UgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Tb2xkaWVyR3VhcmQpIHtcbiAgICAgICAgYW50aVJlcSA9IHVuZGVmaW5lZDsgLy8gdGhleSdsbCBqdXN0IGF0dGFjayBpZiBhcHByb2FjaGVkLlxuICAgICAgfVxuICAgICAgLy8gaWYgc3Bhd24gaXMgYWx3YXlzIGZhbHNlIHRoZW4gcmVxIG5lZWRzIHRvIGJlIG9wZW4/XG4gICAgICBpZiAoYW50aVJlcSkgdGhpcy5hZGRUZXJyYWluKGhpdGJveCwgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoYW50aVJlcSkpO1xuICAgIH1cblxuICAgIC8vIEZvcnR1bmUgdGVsbGVyIGNhbiBiZSB0YWxrZWQgdG8gYWNyb3NzIHRoZSBkZXNrLlxuICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuRm9ydHVuZVRlbGxlcikge1xuICAgICAgaGl0Ym94ID0gSGl0Ym94LmFkanVzdChoaXRib3gsIFswLCAwXSwgWzIsIDBdKTtcbiAgICB9XG5cbiAgICAvLyByZXEgaXMgbm93IG11dGFibGVcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxKSkgcmV0dXJuOyAvLyBub3RoaW5nIHRvIGRvIGlmIGl0IG5ldmVyIHNwYXducy5cbiAgICBjb25zdCBbWy4uLmNvbmRzXV0gPSByZXE7XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGdsb2JhbCBkaWFsb2dzIC0gZG8gbm90aGluZyBpZiB3ZSBjYW4ndCBwYXNzIHRoZW0uXG4gICAgZm9yIChjb25zdCBkIG9mIG5wYy5nbG9iYWxEaWFsb2dzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5kLmNvbmRpdGlvbik7XG4gICAgICBjb25zdCBmYyA9IHRoaXMuZmxhZyhkLmNvbmRpdGlvbik7XG4gICAgICBpZiAoZj8ubG9naWMuYXNzdW1lRmFsc2UgfHwgZmM/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybjtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykgY29uZHMucHVzaChmLmlkIGFzIENvbmRpdGlvbik7XG4gICAgfVxuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBhcHByb3ByaWF0ZSBsb2NhbCBkaWFsb2dzXG4gICAgY29uc3QgbG9jYWxzID1cbiAgICAgICAgbnBjLmxvY2FsRGlhbG9ncy5nZXQobG9jYXRpb24uaWQpID8/IG5wYy5sb2NhbERpYWxvZ3MuZ2V0KC0xKSA/PyBbXTtcbiAgICBmb3IgKGNvbnN0IGQgb2YgbG9jYWxzKSB7XG4gICAgICAvLyBDb21wdXRlIHRoZSBjb25kaXRpb24gJ3InIGZvciB0aGlzIG1lc3NhZ2UuXG4gICAgICBjb25zdCByID0gWy4uLmNvbmRzXTtcbiAgICAgIGNvbnN0IGYwID0gdGhpcy5mbGFnKGQuY29uZGl0aW9uKTtcbiAgICAgIGNvbnN0IGYxID0gdGhpcy5mbGFnKH5kLmNvbmRpdGlvbik7XG4gICAgICBpZiAoZjA/LmxvZ2ljLnRyYWNrKSByLnB1c2goZjAuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICAgIGlmICghZjA/LmxvZ2ljLmFzc3VtZUZhbHNlICYmICFmMT8ubG9naWMuYXNzdW1lVHJ1ZSkge1xuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdGhpcyBkaWFsb2cgaWYgaXQncyBwb3NzaWJsZSB0byBwYXNzIHRoZSBjb25kaXRpb24uXG4gICAgICAgIHRoaXMucHJvY2Vzc0RpYWxvZyhoaXRib3gsIG5wYywgciwgZCk7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBpZiB3ZSBjYW4gbmV2ZXIgYWN0dWFsbHkgZ2V0IHBhc3QgdGhpcyBkaWFsb2cuXG4gICAgICBpZiAoZjA/LmxvZ2ljLmFzc3VtZVRydWUgfHwgZjE/LmxvZ2ljLmFzc3VtZUZhbHNlKSBicmVhaztcbiAgICAgIC8vIEFkZCBhbnkgbmV3IGNvbmRpdGlvbnMgdG8gJ2NvbmRzJyB0byBnZXQgYmV5b25kIHRoaXMgbWVzc2FnZS5cbiAgICAgIGlmIChmMT8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY29uZHMucHVzaChmMS5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NEaWFsb2coaGl0Ym94OiBIaXRib3gsIG5wYzogTnBjLFxuICAgICAgICAgICAgICAgIHJlcTogcmVhZG9ubHkgQ29uZGl0aW9uW10sIGRpYWxvZzogTG9jYWxEaWFsb2cpIHtcbiAgICB0aGlzLmFkZENoZWNrRnJvbUZsYWdzKGhpdGJveCwgW3JlcV0sIGRpYWxvZy5mbGFncyk7XG5cbiAgICBjb25zdCBpbmZvID0ge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9O1xuICAgIHN3aXRjaCAoZGlhbG9nLm1lc3NhZ2UuYWN0aW9uKSB7XG4gICAgICBjYXNlIDB4MDg6IC8vIG9wZW4gc3dhbiBnYXRlXG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIFtyZXFdKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIC8vIGNhc2UgMHgwYzogLy8gZHdhcmYgY2hpbGQgc3RhcnRzIGZvbGxvd2luZ1xuICAgICAgLy8gICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBkOiAvLyBucGMgd2Fsa3MgYXdheVxuICAgICAgLy8gICBicmVhaztcblxuICAgICAgY2FzZSAweDE0OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5TbGltZWRLZW5zdS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTA6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQXNpbmFJbkJhY2tSb29tLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMTpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgMHgxMDAgfCBucGMuZGF0YVsxXSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDM6XG4gICAgICBjYXNlIDB4MGE6IC8vIG5vcm1hbGx5IHRoaXMgaGFyZC1jb2RlcyBnbG93aW5nIGxhbXAsIGJ1dCB3ZSBleHRlbmRlZCBpdFxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzBdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwOTpcbiAgICAgICAgLy8gSWYgemVidSBzdHVkZW50IGhhcyBhbiBpdGVtLi4uPyAgVE9ETyAtIHN0b3JlIGZmIGlmIHVudXNlZFxuICAgICAgICBjb25zdCBpdGVtID0gbnBjLmRhdGFbMV07XG4gICAgICAgIGlmIChpdGVtICE9PSAweGZmKSB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IGl0ZW0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDE5OlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICAgIGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLkFrYWhhbmFGbHV0ZU9mTGltZVRyYWRlaW4uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFhOlxuICAgICAgICAvLyBUT0RPIC0gY2FuIHdlIHJlYWNoIHRoaXMgc3BvdD8gIG1heSBuZWVkIHRvIG1vdmUgZG93bj9cbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuUmFnZS5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIFJhZ2UgdGhyb3dpbmcgcGxheWVyIG91dC4uLlxuICAgICAgICAvLyBUaGlzIHNob3VsZCBhY3R1YWxseSBhbHJlYWR5IGJlIGhhbmRsZWQgYnkgdGhlIHN0YXR1ZSBjb2RlIGFib3ZlP1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gYWRkIGV4dHJhIGRpYWxvZ3MgZm9yIGl0ZW11c2UgdHJhZGVzLCBleHRyYSB0cmlnZ2Vyc1xuICAgIC8vICAgICAgLSBpZiBpdGVtIHRyYWRlZCBidXQgbm8gcmV3YXJkLCB0aGVuIHJlLWdpdmUgcmV3YXJkLi4uXG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25JdGVtVXNlcyhsb2NhdGlvbjogTG9jYXRpb24pIHtcbiAgICBmb3IgKGNvbnN0IFtpdGVtLCB1c2VdIG9mIHRoaXMuaXRlbVVzZXMuZ2V0KH5sb2NhdGlvbi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW3RoaXMuZW50cmFuY2UobG9jYXRpb24pXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuT1BFTiwgaXRlbSwgdXNlKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVNb3ZpbmdHdWFyZChoaXRib3g6IEhpdGJveCwgbG9jYXRpb246IExvY2F0aW9uLCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gVGhpcyBpcyB0aGUgMWIgdHJpZ2dlciBhY3Rpb24gZm9sbG93LXVwLiAgSXQgbG9va3MgZm9yIGFuIE5QQyBpbiAwZCBvciAwZVxuICAgIC8vIGFuZCBtb3ZlcyB0aGVtIG92ZXIgYSBwaXhlbC4gIEZvciB0aGUgbG9naWMsIGl0J3MgYWx3YXlzIGluIGEgcG9zaXRpb25cbiAgICAvLyB3aGVyZSBqdXN0IG1ha2luZyB0aGUgdHJpZ2dlciBzcXVhcmUgYmUgYSBuby1leGl0IHNxdWFyZSBpcyBzdWZmaWNpZW50LFxuICAgIC8vIGJ1dCB3ZSBuZWVkIHRvIGdldCB0aGUgY29uZGl0aW9ucyByaWdodC4gIFdlIHBhc3MgaW4gdGhlIHJlcXVpcmVtZW50cyB0b1xuICAgIC8vIE5PVCB0cmlnZ2VyIHRoZSB0cmlnZ2VyLCBhbmQgdGhlbiB3ZSBqb2luIGluIHBhcmFseXNpcyBhbmQvb3Igc3RhdHVlXG4gICAgLy8gZ2xpdGNoIGlmIGFwcHJvcHJpYXRlLiAgVGhlcmUgY291bGQgdGhlb3JldGljYWxseSBiZSBjYXNlcyB3aGVyZSB0aGVcbiAgICAvLyBndWFyZCBpcyBwYXJhbHl6YWJsZSBidXQgdGhlIGdlb21ldHJ5IHByZXZlbnRzIHRoZSBwbGF5ZXIgZnJvbSBhY3R1YWxseVxuICAgIC8vIGhpdHRpbmcgdGhlbSBiZWZvcmUgdGhleSBtb3ZlLCBidXQgaXQgZG9lc24ndCBoYXBwZW4gaW4gcHJhY3RpY2UuXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTdGF0dWVHbGl0Y2goKSkgcmV0dXJuO1xuICAgIGNvbnN0IGV4dHJhOiBDb25kaXRpb25bXVtdID0gW107XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMuc2xpY2UoMCwgMikpIHtcbiAgICAgIGlmIChzcGF3bi5pc05wYygpICYmIHRoaXMucm9tLm5wY3Nbc3Bhd24uaWRdLmlzUGFyYWx5emFibGUoKSkge1xuICAgICAgICBleHRyYS5wdXNoKFt0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMuY10pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2goW3RoaXMucm9tLmZsYWdzLlRyaWdnZXJTa2lwLmNdKTtcbiAgICB9XG4gICAgdGhpcy5hZGRUZXJyYWluKGhpdGJveCxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50ZXJyYWluRmFjdG9yeS5zdGF0dWUoWy4uLnJlcSwgLi4uZXh0cmFdLm1hcChzcHJlYWQpKSk7XG5cblxuICAgIC8vIFRPRE8gLSBQb3J0b2EgZ3VhcmRzIGFyZSBicm9rZW4gOi0oXG4gICAgLy8gVGhlIGJhY2sgZ3VhcmQgbmVlZHMgdG8gYmxvY2sgb24gdGhlIGZyb250IGd1YXJkJ3MgY29uZGl0aW9ucyxcbiAgICAvLyB3aGlsZSB0aGUgZnJvbnQgZ3VhcmQgc2hvdWxkIGJsb2NrIG9uIGZvcnR1bmUgdGVsbGVyP1xuXG4gIH1cblxuICBoYW5kbGVCb2F0KHRpbGU6IFRpbGVJZCwgbG9jYXRpb246IExvY2F0aW9uLCByZXF1aXJlbWVudHM6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gYm9hcmQgYm9hdCAtIHRoaXMgYW1vdW50cyB0byBhZGRpbmcgYSByb3V0ZSBlZGdlIGZyb20gdGhlIHRpbGVcbiAgICAvLyB0byB0aGUgbGVmdCwgdGhyb3VnaCBhbiBleGl0LCBhbmQgdGhlbiBjb250aW51aW5nIHVudGlsIGZpbmRpbmcgbGFuZC5cbiAgICBjb25zdCB0MCA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0aWxlKTtcbiAgICBpZiAodDAgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB3YWxrYWJsZSBuZWlnaGJvci5gKTtcbiAgICBjb25zdCB5dCA9ICh0aWxlID4+IDgpICYgMHhmMCB8ICh0aWxlID4+IDQpICYgMHhmO1xuICAgIGNvbnN0IHh0ID0gKHRpbGUgPj4gNCkgJiAweGYwIHwgdGlsZSAmIDB4ZjtcbiAgICBsZXQgYm9hdEV4aXQ7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBpZiAoZXhpdC55dCA9PT0geXQgJiYgZXhpdC54dCA8IHh0KSBib2F0RXhpdCA9IGV4aXQ7XG4gICAgfVxuICAgIGlmICghYm9hdEV4aXQpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgYm9hdCBleGl0YCk7XG4gICAgLy8gVE9ETyAtIGxvb2sgdXAgdGhlIGVudHJhbmNlLlxuICAgIGNvbnN0IGRlc3QgPSB0aGlzLnJvbS5sb2NhdGlvbnNbYm9hdEV4aXQuZGVzdF07XG4gICAgaWYgKCFkZXN0KSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBkZXN0aW5hdGlvbmApO1xuICAgIGNvbnN0IGVudHJhbmNlID0gZGVzdC5lbnRyYW5jZXNbYm9hdEV4aXQuZW50cmFuY2VdO1xuICAgIGNvbnN0IGVudHJhbmNlVGlsZSA9IFRpbGVJZC5mcm9tKGRlc3QsIGVudHJhbmNlKTtcbiAgICBsZXQgdCA9IGVudHJhbmNlVGlsZTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdCA9IFRpbGVJZC5hZGQodCwgMCwgLTEpO1xuICAgICAgY29uc3QgdDEgPSB0aGlzLndhbGthYmxlTmVpZ2hib3IodCk7XG4gICAgICBpZiAodDEgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBib2F0OiBUZXJyYWluID0ge1xuICAgICAgICAgIGVudGVyOiBSZXF1aXJlbWVudC5mcmVlemUocmVxdWlyZW1lbnRzKSxcbiAgICAgICAgICBleGl0OiBbWzB4ZiwgUmVxdWlyZW1lbnQuT1BFTl1dLFxuICAgICAgICB9O1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBib2F0IHRyaWdnZXIuXG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihbdDBdLCBib2F0KTtcbiAgICAgICAgdGhpcy5leGl0cy5zZXQodDAsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZih0MCwgdDEpKTtcbiAgICAgICAgLy8gQWRkIGEgdGVycmFpbiBhbmQgZXhpdCBwYWlyIGZvciB0aGUgZW50cmFuY2Ugd2UgcGFzc2VkXG4gICAgICAgIC8vICh0aGlzIGlzIHByaW1hcmlseSBuZWNlc3NhcnkgZm9yIHdpbGQgd2FycCB0byB3b3JrIGluIGxvZ2ljKS5cbiAgICAgICAgdGhpcy5leGl0cy5zZXQoZW50cmFuY2VUaWxlLCB0MSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5hZGQoVGlsZVBhaXIub2YoZW50cmFuY2VUaWxlLCB0MSkpO1xuICAgICAgICB0aGlzLnRlcnJhaW5zLnNldChlbnRyYW5jZVRpbGUsIHRoaXMudGVycmFpbkZhY3RvcnkudGlsZSgwKSEpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50LCBncmFudElkOiBudW1iZXIpIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtR3JhbnQoZ3JhbnRJZCk7XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgaXRlbTtcbiAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgaXRlbSBncmFudCBmb3IgJHtncmFudElkLnRvU3RyaW5nKDE2KX1gKTtcbiAgICB9XG4gICAgLy8gaXMgdGhlIDEwMCBmbGFnIHN1ZmZpY2llbnQgaGVyZT8gIHByb2JhYmx5P1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gZ3JhbnRJZCA+PSAweDgwOyAvLyBncmFudGVkIGZyb20gYSB0cmlnZ2VyXG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soaGl0Ym94LCByZXEsIHNsb3QsXG4gICAgICAgICAgICAgICAgICAgICAge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWUsIHByZXZlbnRMb3NzfSk7XG4gIH1cblxuICBhZGRUZXJyYWluKGhpdGJveDogSGl0Ym94LCB0ZXJyYWluOiBUZXJyYWluKSB7XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgY29uc3QgdCA9IHRoaXMudGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgaWYgKHQgPT0gbnVsbCkgY29udGludWU7IC8vIHVucmVhY2hhYmxlIHRpbGVzIGRvbid0IG5lZWQgZXh0cmEgcmVxc1xuICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5tZWV0KHQsIHRlcnJhaW4pKTtcbiAgICB9XG4gIH1cblxuICBhZGRDaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBjaGVja3M6IG51bWJlcltdKSB7XG4gICAgaWYgKFJlcXVpcmVtZW50LmlzQ2xvc2VkKHJlcXVpcmVtZW50KSkgcmV0dXJuOyAvLyBkbyBub3RoaW5nIGlmIHVucmVhY2hhYmxlXG4gICAgY29uc3QgY2hlY2sgPSB7cmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudCksIGNoZWNrc307XG4gICAgZm9yIChjb25zdCB0aWxlIG9mIGhpdGJveCkge1xuICAgICAgaWYgKCF0aGlzLnRlcnJhaW5zLmhhcyh0aWxlKSkgY29udGludWU7XG4gICAgICB0aGlzLmNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICB9XG4gIH1cblxuICBhZGRJdGVtQ2hlY2soaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCxcbiAgICAgICAgICAgICAgIGNoZWNrOiBudW1iZXIsIHNsb3Q6IFNsb3RJbmZvKSB7XG4gICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBbY2hlY2tdKTtcbiAgICB0aGlzLnNsb3RzLnNldChjaGVjaywgc2xvdCk7XG4gICAgLy8gYWxzbyBhZGQgY29ycmVzcG9uZGluZyBJdGVtSW5mbyB0byBrZWVwIHRoZW0gaW4gcGFyaXR5LlxuICAgIGNvbnN0IGl0ZW1nZXQgPSB0aGlzLnJvbS5pdGVtR2V0c1t0aGlzLnJvbS5zbG90c1tjaGVjayAmIDB4ZmZdXTtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5yb20uaXRlbXNbaXRlbWdldC5pdGVtSWRdO1xuICAgIGNvbnN0IHVuaXF1ZSA9IGl0ZW0/LnVuaXF1ZTtcbiAgICBjb25zdCBsb3NhYmxlID0gaXRlbWdldC5pc0xvc2FibGUoKTtcbiAgICAvLyBUT0RPIC0gcmVmYWN0b3IgdG8ganVzdCBcImNhbid0IGJlIGJvdWdodFwiP1xuICAgIGNvbnN0IHByZXZlbnRMb3NzID0gdW5pcXVlIHx8IGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk9wZWxTdGF0dWU7XG4gICAgbGV0IHdlaWdodCA9IDE7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZXaW5kKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mRmlyZSkgd2VpZ2h0ID0gNTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldhdGVyKSB3ZWlnaHQgPSAxMDtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZlRodW5kZXIpIHdlaWdodCA9IDE1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5GbGlnaHQpIHdlaWdodCA9IDE1O1xuICAgIHRoaXMuaXRlbXMuc2V0KDB4MjAwIHwgaXRlbWdldC5pZCwge3VuaXF1ZSwgbG9zYWJsZSwgcHJldmVudExvc3MsIHdlaWdodH0pO1xuICB9XG5cbiAgYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94OiBIaXRib3gsIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudCwgZmxhZ3M6IG51bWJlcltdKSB7XG4gICAgY29uc3QgY2hlY2tzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBjb25zdCBmID0gdGhpcy5mbGFnKGZsYWcpO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSB7XG4gICAgICAgIGNoZWNrcy5wdXNoKGYuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hlY2tzLmxlbmd0aCkgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcXVpcmVtZW50LCBjaGVja3MpO1xuICB9XG5cbiAgd2Fsa2FibGVOZWlnaGJvcih0OiBUaWxlSWQpOiBUaWxlSWR8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQpKSByZXR1cm4gdDtcbiAgICBmb3IgKGxldCBkIG9mIFstMSwgMV0pIHtcbiAgICAgIGNvbnN0IHQxID0gVGlsZUlkLmFkZCh0LCBkLCAwKTtcbiAgICAgIGNvbnN0IHQyID0gVGlsZUlkLmFkZCh0LCAwLCBkKTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDEpKSByZXR1cm4gdDE7XG4gICAgICBpZiAodGhpcy5pc1dhbGthYmxlKHQyKSkgcmV0dXJuIHQyO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgaXNXYWxrYWJsZSh0OiBUaWxlSWQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISh0aGlzLmdldEVmZmVjdHModCkgJiBUZXJyYWluLkJJVFMpO1xuICB9XG5cbiAgZW5zdXJlUGFzc2FibGUodDogVGlsZUlkKTogVGlsZUlkIHtcbiAgICByZXR1cm4gdGhpcy5pc1dhbGthYmxlKHQpID8gdCA6IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0O1xuICB9XG5cbiAgZ2V0RWZmZWN0cyh0OiBUaWxlSWQpOiBudW1iZXIge1xuICAgIGNvbnN0IGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW3QgPj4+IDE2XTtcbiAgICAvL2NvbnN0IHBhZ2UgPSBsb2NhdGlvbi5zY3JlZW5QYWdlO1xuICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdLmVmZmVjdHM7XG4gICAgY29uc3Qgc2NyID0gbG9jYXRpb24uc2NyZWVuc1sodCAmIDB4ZjAwMCkgPj4+IDEyXVsodCAmIDB4ZjAwKSA+Pj4gOF07XG4gICAgcmV0dXJuIGVmZmVjdHNbdGhpcy5yb20uc2NyZWVuc1tzY3JdLnRpbGVzW3QgJiAweGZmXV07XG4gIH1cblxuICBwcm9jZXNzQm9zcyhsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEJvc3NlcyB3aWxsIGNsb2JiZXIgdGhlIGVudHJhbmNlIHBvcnRpb24gb2YgYWxsIHRpbGVzIG9uIHRoZSBzY3JlZW4sXG4gICAgLy8gYW5kIHdpbGwgYWxzbyBhZGQgdGhlaXIgZHJvcC5cbiAgICBpZiAoc3Bhd24uaWQgPT09IDB4YzkgfHwgc3Bhd24uaWQgPT09IDB4Y2EpIHJldHVybjsgLy8gc3RhdHVlc1xuICAgIGNvbnN0IGlzUmFnZSA9IHNwYXduLmlkID09PSAweGMzO1xuICAgIGNvbnN0IGJvc3MgPVxuICAgICAgICBpc1JhZ2UgPyB0aGlzLnJvbS5ib3NzZXMuUmFnZSA6XG4gICAgICAgIHRoaXMucm9tLmJvc3Nlcy5mcm9tTG9jYXRpb24obG9jYXRpb24uaWQpO1xuICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pO1xuICAgIGlmICghYm9zcyB8fCAhYm9zcy5mbGFnKSB0aHJvdyBuZXcgRXJyb3IoYEJhZCBib3NzIGF0ICR7bG9jYXRpb24ubmFtZX1gKTtcbiAgICBjb25zdCBzY3JlZW4gPSB0aWxlICYgfjB4ZmY7XG4gICAgY29uc3QgYm9zc1RlcnJhaW4gPSB0aGlzLnRlcnJhaW5GYWN0b3J5LmJvc3MoYm9zcy5mbGFnLmlkLCBpc1JhZ2UpO1xuICAgIGNvbnN0IGhpdGJveCA9IHNlcSgweGYwLCAodDogbnVtYmVyKSA9PiAoc2NyZWVuIHwgdCkgYXMgVGlsZUlkKTtcbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCBib3NzVGVycmFpbik7XG4gICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCBib3NzKTtcbiAgfVxuXG4gIGFkZEJvc3NDaGVjayhoaXRib3g6IEhpdGJveCwgYm9zczogQm9zcyxcbiAgICAgICAgICAgICAgIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQgPSBSZXF1aXJlbWVudC5PUEVOKSB7XG4gICAgaWYgKGJvc3MuZmxhZyA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGEgZmxhZzogJHtib3NzfWApO1xuICAgIGNvbnN0IHJlcSA9IFJlcXVpcmVtZW50Lm1lZXQocmVxdWlyZW1lbnRzLCB0aGlzLmJvc3NSZXF1aXJlbWVudHMoYm9zcykpO1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtib3NzLmZsYWcuaWRdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgaGl0Ym94LCByZXEsIGJvc3MuZmxhZy5pZCwge2xvc3N5OiBmYWxzZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0NoZXN0KGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gQWRkIGEgY2hlY2sgZm9yIHRoZSAxeHggZmxhZy4gIE1ha2Ugc3VyZSBpdCdzIG5vdCBhIG1pbWljLlxuICAgIGlmICh0aGlzLnJvbS5zbG90c1tzcGF3bi5pZF0gPj0gMHg3MCkgcmV0dXJuO1xuICAgIGNvbnN0IHNsb3QgPSAweDEwMCB8IHNwYXduLmlkO1xuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXTtcbiAgICBpZiAobWFwcGVkID49IDB4NzApIHJldHVybjsgLy8gVE9ETyAtIG1pbWljJSBtYXkgY2FyZVxuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1ttYXBwZWRdO1xuICAgIGNvbnN0IHVuaXF1ZSA9IHRoaXMuZmxhZ3NldC5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpID8gISFpdGVtPy51bmlxdWUgOiB0cnVlO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pXSwgUmVxdWlyZW1lbnQuT1BFTixcbiAgICAgICAgICAgICAgICAgICAgICBzbG90LCB7bG9zc3k6IGZhbHNlLCB1bmlxdWV9KTtcbiAgfVxuXG4gIHByb2Nlc3NNb25zdGVyKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG5cbiAgICAvLyBUT0RPIC0gY3VycmVudGx5IGRvbid0IGhhbmRsZSBmbHllcnMgd2VsbCAtIGNvdWxkIGluc3RlYWQgYWRkIGZseWVyc1xuICAgIC8vICAgICAgICB0byBhbGwgZW50cmFuY2VzP1xuXG4gICAgLy8gQ2hlY2sgbW9uc3RlcidzIHZ1bG5lcmFiaWxpdGllcyBhbmQgYWRkIGEgY2hlY2sgZm9yIE1vbmV5IGdpdmVuIHN3b3Jkcy5cbiAgICBjb25zdCBtb25zdGVyID0gdGhpcy5yb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgIGlmICghKG1vbnN0ZXIgaW5zdGFuY2VvZiBNb25zdGVyKSkgcmV0dXJuO1xuICAgIGNvbnN0IHtcbiAgICAgIE1vbmV5LCBSYWdlU2tpcCxcbiAgICAgIFN3b3JkLCBTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXIsXG4gICAgfSA9IHRoaXMucm9tLmZsYWdzO1xuICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gdGhpcy5saW1lVHJlZUVudHJhbmNlTG9jYXRpb24gJiYgbW9uc3Rlci5pc0ZseWVyICYmXG4gICAgICAgIHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFt0aGlzLmVudHJhbmNlKGxvY2F0aW9uKV0sIFJlcXVpcmVtZW50Lk9QRU4sIFtSYWdlU2tpcC5pZF0pO1xuXG4gICAgfVxuICAgIGlmICghKG1vbnN0ZXIuZ29sZERyb3ApKSByZXR1cm47XG4gICAgY29uc3QgaGl0Ym94ID0gW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildO1xuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIFN3b3JkLnIsIFtNb25leS5pZF0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzd29yZHMgPVxuICAgICAgICBbU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyXVxuICAgICAgICAgICAgLmZpbHRlcigoXywgaSkgPT4gbW9uc3Rlci5lbGVtZW50cyAmICgxIDw8IGkpKTtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY29sbGVjdGluZyBhbGwgdGhlIGVsZW1lbnRzIGluIG9uZSBwbGFjZSBmaXJzdFxuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBvciguLi5zd29yZHMpLCBbTW9uZXkuaWRdKTtcbiAgfVxuXG4gIHByb2Nlc3NJdGVtVXNlKGhpdGJveDogSGl0Ym94LCByZXExOiBSZXF1aXJlbWVudCwgaXRlbTogSXRlbSwgdXNlOiBJdGVtVXNlKSB7XG4gICAgLy8gdGhpcyBzaG91bGQgaGFuZGxlIG1vc3QgdHJhZGUtaW5zIGF1dG9tYXRpY2FsbHlcbiAgICBoaXRib3ggPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0KSk7XG4gICAgY29uc3QgcmVxMiA9IFtbKDB4MjAwIHwgaXRlbS5pZCkgYXMgQ29uZGl0aW9uXV07IC8vIHJlcXVpcmVzIHRoZSBpdGVtLlxuICAgIC8vIGNoZWNrIGZvciBraXJpc2EgcGxhbnQsIGFkZCBjaGFuZ2UgYXMgYSByZXF1aXJlbWVudC5cbiAgICBpZiAoaXRlbS5pZCA9PT0gdGhpcy5yb20ucHJnWzB4M2Q0YjVdICsgMHgxYykge1xuICAgICAgcmVxMlswXS5wdXNoKHRoaXMucm9tLmZsYWdzLkNoYW5nZS5jKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk1lZGljYWxIZXJiKSB7IC8vIGRvbHBoaW5cbiAgICAgIHJlcTJbMF1bMF0gPSB0aGlzLnJvbS5mbGFncy5CdXlIZWFsaW5nLmM7IC8vIG5vdGU6IG5vIG90aGVyIGhlYWxpbmcgaXRlbXNcbiAgICB9XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXExLCByZXEyKTtcbiAgICAvLyBzZXQgYW55IGZsYWdzXG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIHJlcSwgdXNlLmZsYWdzKTtcbiAgICAvLyBoYW5kbGUgYW55IGV4dHJhIGFjdGlvbnNcbiAgICBzd2l0Y2ggKHVzZS5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDEwOlxuICAgICAgICAvLyB1c2Uga2V5XG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIHJlcSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6IGNhc2UgMHgxYzpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIGl0ZW0gSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxLCBpdGVtLmlkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDI6XG4gICAgICAgIC8vIGRvbHBoaW4gZGVmZXJzIHRvIGRpYWxvZyBhY3Rpb24gMTEgKGFuZCAwZCB0byBzd2ltIGF3YXkpXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAweDEwMCB8IHRoaXMucm9tLm5wY3NbdXNlLndhbnQgJiAweGZmXS5kYXRhWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzS2V5VXNlKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gc2V0IHRoZSBjdXJyZW50IHNjcmVlbidzIGZsYWcgaWYgdGhlIGNvbmRpdGlvbnMgYXJlIG1ldC4uLlxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIG9ubHkgYSBzaW5nbGUgc2NyZWVuLlxuICAgIGNvbnN0IFtzY3JlZW4sIC4uLnJlc3RdID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiBTY3JlZW5JZC5mcm9tKHQpKSk7XG4gICAgaWYgKHNjcmVlbiA9PSBudWxsIHx8IHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG9uZSBzY3JlZW5gKTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tzY3JlZW4gPj4+IDhdO1xuICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IChzY3JlZW4gJiAweGZmKSk7XG4gICAgaWYgKGZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBmbGFnIG9uIHNjcmVlbmApO1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtmbGFnLmZsYWddKTtcbiAgfVxuXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuUmFnZSkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBSYWdlLiAgRmlndXJlIG91dCB3aGF0IGhlIHdhbnRzIGZyb20gdGhlIGRpYWxvZy5cbiAgICAgIGNvbnN0IHVua25vd25Td29yZCA9IHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQucmFuZG9taXplVHJhZGVzKCk7XG4gICAgICBpZiAodW5rbm93blN3b3JkKSByZXR1cm4gdGhpcy5yb20uZmxhZ3MuU3dvcmQucjsgLy8gYW55IHN3b3JkIG1pZ2h0IGRvLlxuICAgICAgcmV0dXJuIFtbdGhpcy5yb20ubnBjcy5SYWdlLmRpYWxvZygpWzBdLmNvbmRpdGlvbiBhcyBDb25kaXRpb25dXTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCByID0gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgfHxcbiAgICAgICAgIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHIuYWRkQWxsKHRoaXMucm9tLmZsYWdzLlN3b3JkLnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgci5hZGRBbGwodGhpcy5zd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENhbid0IGFjdHVhbGx5IGtpbGwgdGhlIGJvc3MgaWYgaXQgZG9lc24ndCBzcGF3bi5cbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW10gPSBbXTtcbiAgICBpZiAoYm9zcy5ucGMgIT0gbnVsbCAmJiBib3NzLmxvY2F0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uID0gYm9zcy5ucGMuc3Bhd25zKHRoaXMucm9tLmxvY2F0aW9uc1tib3NzLmxvY2F0aW9uXSk7XG4gICAgICBleHRyYS5wdXNoKC4uLnRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9uKVswXSk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuSW5zZWN0KSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkluc2VjdEZsdXRlLmMsIHRoaXMucm9tLmZsYWdzLkdhc01hc2suYyk7XG4gICAgfSBlbHNlIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuQm93T2ZUcnV0aC5jKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuUmVmcmVzaC5jKTtcbiAgICB9XG4gICAgci5yZXN0cmljdChbZXh0cmFdKTtcbiAgICByZXR1cm4gUmVxdWlyZW1lbnQuZnJlZXplKHIpO1xuICB9XG5cbiAgc3dvcmRSZXF1aXJlbWVudChlbGVtZW50OiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gICAgY29uc3Qgc3dvcmQgPSBbXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZkZpcmUsXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAxKSByZXR1cm4gc3dvcmQucjtcbiAgICBjb25zdCBwb3dlcnMgPSBbXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuVG9ybmFkb0JyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZGaXJlLCB0aGlzLnJvbS5mbGFncy5GbGFtZUJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuQmxpenphcmRCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mVGh1bmRlciwgdGhpcy5yb20uZmxhZ3MuU3Rvcm1CcmFjZWxldF0sXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDMpIHJldHVybiBhbmQoc3dvcmQsIC4uLnBvd2Vycyk7XG4gICAgcmV0dXJuIHBvd2Vycy5tYXAocG93ZXIgPT4gW3N3b3JkLmMsIHBvd2VyLmNdKTtcbiAgfVxuXG4gIGl0ZW1HcmFudChpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0aGlzLnJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMpIHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaXRlbSBncmFudCAke2lkLnRvU3RyaW5nKDE2KX1gKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3IgYWxsIG9mIHRoZSBmbGFncyBiZWluZyBtZXQuICovXG4gIGZpbHRlclJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IGNvbmRzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA8IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvbmRzXTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3Igc29tZSBmbGFnIG5vdCBiZWluZyBtZXQuICovXG4gIGZpbHRlckFudGlSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCByZXEgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnID49IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5mbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIHJlcS5wdXNoKFtmLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVxO1xuICB9XG5cbiAgZmxhZyhmbGFnOiBudW1iZXIpOiBGbGFnfHVuZGVmaW5lZCB7XG4gICAgLy9jb25zdCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgIGNvbnN0IHVuc2lnbmVkID0gZmxhZzsgIC8vIFRPRE8gLSBzaG91bGQgd2UgYXV0by1pbnZlcnQ/XG4gICAgY29uc3QgZiA9IHRoaXMucm9tLmZsYWdzW3Vuc2lnbmVkXTtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmFsaWFzZXMuZ2V0KGYpID8/IGY7XG4gICAgcmV0dXJuIG1hcHBlZDtcbiAgfVxuXG4gIGVudHJhbmNlKGxvY2F0aW9uOiBMb2NhdGlvbnxudW1iZXIsIGluZGV4ID0gMCk6IFRpbGVJZCB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ251bWJlcicpIGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICByZXR1cm4gdGhpcy50aWxlcy5maW5kKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBsb2NhdGlvbi5lbnRyYW5jZXNbaW5kZXhdKSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh3YWxsOiBXYWxsVHlwZSk6IG51bWJlciB7XG4gICAgc3dpdGNoICh3YWxsKSB7XG4gICAgICBjYXNlIFdhbGxUeXBlLldJTkQ6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha1N0b25lLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5GSVJFOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJY2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLldBVEVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuRm9ybUJyaWRnZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuVEhVTkRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSXJvbi5pZDtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgYmFkIHdhbGwgdHlwZTogJHt3YWxsfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhbmQoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gIHJldHVybiBbZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBmLmlkIGFzIENvbmRpdGlvbildO1xufVxuXG5mdW5jdGlvbiBvciguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgcmV0dXJuIGZsYWdzLm1hcCgoZjogRmxhZykgPT4gW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG59XG5cbi8vIEFuIGludGVyZXN0aW5nIHdheSB0byB0cmFjayB0ZXJyYWluIGNvbWJpbmF0aW9ucyBpcyB3aXRoIHByaW1lcy5cbi8vIElmIHdlIGhhdmUgTiBlbGVtZW50cyB3ZSBjYW4gbGFiZWwgZWFjaCBhdG9tIHdpdGggYSBwcmltZSBhbmRcbi8vIHRoZW4gbGFiZWwgYXJiaXRyYXJ5IGNvbWJpbmF0aW9ucyB3aXRoIHRoZSBwcm9kdWN0LiAgRm9yIE49MTAwMFxuLy8gdGhlIGhpZ2hlc3QgbnVtYmVyIGlzIDgwMDAsIHNvIHRoYXQgaXQgY29udHJpYnV0ZXMgYWJvdXQgMTMgYml0c1xuLy8gdG8gdGhlIHByb2R1Y3QsIG1lYW5pbmcgd2UgY2FuIHN0b3JlIGNvbWJpbmF0aW9ucyBvZiA0IHNhZmVseVxuLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gYmlnaW50LiAgVGhpcyBpcyBpbmhlcmVudGx5IG9yZGVyLWluZGVwZW5kZW50LlxuLy8gSWYgdGhlIHJhcmVyIG9uZXMgYXJlIGhpZ2hlciwgd2UgY2FuIGZpdCBzaWduaWZpY2FudGx5IG1vcmUgdGhhbiA0LlxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyBEZWJ1ZyBpbnRlcmZhY2UuXG5leHBvcnQgaW50ZXJmYWNlIEFyZWFEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xuICBjaGVja3M6IEFycmF5PFtGbGFnLCBSZXF1aXJlbWVudF0+O1xuICB0ZXJyYWluOiBUZXJyYWluO1xuICBsb2NhdGlvbnM6IFNldDxudW1iZXI+O1xuICByb3V0ZXM6IFJlcXVpcmVtZW50LkZyb3plbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZURhdGEge1xuICBhcmVhOiBBcmVhRGF0YTtcbiAgZXhpdD86IFRpbGVJZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYXM6IFNldDxBcmVhRGF0YT47XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV29ybGREYXRhIHtcbiAgdGlsZXM6IE1hcDxUaWxlSWQsIFRpbGVEYXRhPjtcbiAgYXJlYXM6IEFyZWFEYXRhW107XG4gIGxvY2F0aW9uczogTG9jYXRpb25EYXRhW107XG59XG4iXX0=