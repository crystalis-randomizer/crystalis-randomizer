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
        const { locations: { Leaf_ToolShop, MezameShrine, Oak, Shyron_ToolShop, }, flags: { AbleToRideDolphin, BallOfFire, BallOfThunder, BallOfWater, BallOfWind, Barrier, BlizzardBracelet, BowOfMoon, BowOfSun, BreakStone, BreakIce, BreakIron, BrokenStatue, BuyHealing, BuyWarp, ClimbWaterfall, ClimbSlope8, ClimbSlope9, ClimbSlope10, CrossPain, CurrentlyRidingDolphin, Flight, FlameBracelet, FormBridge, GasMask, GlowingLamp, InjuredDolphin, LeadingChild, LeatherBoots, Money, OpenedCrypt, RabbitBoots, Refresh, RepairedStatue, RescuedChild, ShellFlute, ShieldRing, ShootingStatue, ShootingStatueSouth, StormBracelet, Sword, SwordOfFire, SwordOfThunder, SwordOfWater, SwordOfWind, TornadoBracelet, TravelSwamp, TriggerSkip, WildWarp, }, items: { MedicalHerb, WarpBoots, }, } = this.rom;
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
        this.addCheck([start], Barrier.r, [ShootingStatue.id, ShootingStatueSouth.id]);
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
                [Money.c, Refresh.c]], [ShootingStatue.id, ShootingStatueSouth.id]);
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
                const center = TileId(ScreenId.from(location, spawn) << 8 | spawn.yt << 4);
                for (let dx = 4; dx <= 0xb; dx++) {
                    for (let dy = -3; dy <= 3; dy++) {
                        shootingStatues.add(TileId.add(center, dy, dx));
                    }
                }
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
                    const barrier = shootingStatues.has(tid);
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
        if (location.id === this.limeTreeEntranceLocation && monster.isBird() &&
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFTakMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3hDLE9BQU8sRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDakUsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUU3QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBWSxXQUFXLEVBQUUsS0FBSyxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDL0QsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDdkMsT0FBTyxFQUFDLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQWVqQixNQUFNLE9BQU8sS0FBSztJQXNFaEIsWUFBcUIsR0FBUSxFQUFXLE9BQWdCLEVBQ25DLFVB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SUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQ2xDO1NBQ0Y7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNQLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsRUFDMUQsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUks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RUFBZSxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBVUQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcmVhfSBmcm9tICcuLi9zcG9pbGVyL2FyZWEuanMnO1xuaW1wb3J0IHtkaWV9IGZyb20gJy4uL2Fzc2VydC5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtSYW5kb219IGZyb20gJy4uL3JhbmRvbS5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7Qm9zc30gZnJvbSAnLi4vcm9tL2Jvc3Nlcy5qcyc7XG5pbXBvcnQge0ZsYWcsIExvZ2ljfSBmcm9tICcuLi9yb20vZmxhZ3MuanMnO1xuaW1wb3J0IHtJdGVtLCBJdGVtVXNlfSBmcm9tICcuLi9yb20vaXRlbS5qcyc7XG5pbXBvcnQge0xvY2F0aW9uLCBTcGF3bn0gZnJvbSAnLi4vcm9tL2xvY2F0aW9uLmpzJztcbmltcG9ydCB7TG9jYWxEaWFsb2csIE5wY30gZnJvbSAnLi4vcm9tL25wYy5qcyc7XG5pbXBvcnQge1Nob3BUeXBlfSBmcm9tICcuLi9yb20vc2hvcC5qcyc7XG5pbXBvcnQge2hleCwgc2VxfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcCwgTGFiZWxlZFNldCwgaXRlcnMsIHNwcmVhZH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5pbXBvcnQge0Rpcn0gZnJvbSAnLi9kaXIuanMnO1xuaW1wb3J0IHtJdGVtSW5mbywgTG9jYXRpb25MaXN0LCBTbG90SW5mb30gZnJvbSAnLi9ncmFwaC5qcyc7XG5pbXBvcnQge0hpdGJveH0gZnJvbSAnLi9oaXRib3guanMnO1xuaW1wb3J0IHtDb25kaXRpb24sIFJlcXVpcmVtZW50LCBSb3V0ZX0gZnJvbSAnLi9yZXF1aXJlbWVudC5qcyc7XG5pbXBvcnQge1NjcmVlbklkfSBmcm9tICcuL3NjcmVlbmlkLmpzJztcbmltcG9ydCB7VGVycmFpbiwgVGVycmFpbnN9IGZyb20gJy4vdGVycmFpbi5qcyc7XG5pbXBvcnQge1RpbGVJZH0gZnJvbSAnLi90aWxlaWQuanMnO1xuaW1wb3J0IHtUaWxlUGFpcn0gZnJvbSAnLi90aWxlcGFpci5qcyc7XG5pbXBvcnQge1dhbGxUeXBlfSBmcm9tICcuL3dhbGx0eXBlLmpzJztcbmltcG9ydCB7IE1vbnN0ZXIgfSBmcm9tICcuLi9yb20vbW9uc3Rlci5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbmludGVyZmFjZSBDaGVjayB7XG4gIHJlcXVpcmVtZW50OiBSZXF1aXJlbWVudDtcbiAgY2hlY2tzOiBudW1iZXJbXTtcbn1cblxuLy8gQmFzaWMgYWxnb3JpdGhtOlxuLy8gIDEuIGZpbGwgdGVycmFpbnMgZnJvbSBtYXBzXG4vLyAgMi4gbW9kaWZ5IHRlcnJhaW5zIGJhc2VkIG9uIG5wY3MsIHRyaWdnZXJzLCBib3NzZXMsIGV0Y1xuLy8gIDIuIGZpbGwgYWxsRXhpdHNcbi8vICAzLiBzdGFydCB1bmlvbmZpbmRcbi8vICA0LiBmaWxsIC4uLj9cblxuLyoqIFN0b3JlcyBhbGwgdGhlIHJlbGV2YW50IGluZm9ybWF0aW9uIGFib3V0IHRoZSB3b3JsZCdzIGxvZ2ljLiAqL1xuZXhwb3J0IGNsYXNzIFdvcmxkIHtcblxuICAvKiogQnVpbGRzIGFuZCBjYWNoZXMgVGVycmFpbiBvYmplY3RzLiAqL1xuICByZWFkb25seSB0ZXJyYWluRmFjdG9yeSA9IG5ldyBUZXJyYWlucyh0aGlzLnJvbSk7XG5cbiAgLyoqIFRlcnJhaW5zIG1hcHBlZCBieSBUaWxlSWQuICovXG4gIHJlYWRvbmx5IHRlcnJhaW5zID0gbmV3IE1hcDxUaWxlSWQsIFRlcnJhaW4+KCk7XG5cbiAgLyoqIENoZWNrcyBtYXBwZWQgYnkgVGlsZUlkLiAqL1xuICByZWFkb25seSBjaGVja3MgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFNldDxDaGVjaz4+KCgpID0+IG5ldyBTZXQoKSk7XG5cbiAgLyoqIFNsb3QgaW5mbywgYnVpbHQgdXAgYXMgd2UgZGlzY292ZXIgc2xvdHMuICovXG4gIHJlYWRvbmx5IHNsb3RzID0gbmV3IE1hcDxudW1iZXIsIFNsb3RJbmZvPigpO1xuICAvKiogSXRlbSBpbmZvLCBidWlsdCB1cCBhcyB3ZSBkaXNjb3ZlciBzbG90cy4gKi9cbiAgcmVhZG9ubHkgaXRlbXMgPSBuZXcgTWFwPG51bWJlciwgSXRlbUluZm8+KCk7XG5cbiAgLyoqIEZsYWdzIHRoYXQgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgZGlyZWN0IGFsaWFzZXMgZm9yIGxvZ2ljLiAqL1xuICByZWFkb25seSBhbGlhc2VzOiBNYXA8RmxhZywgRmxhZz47XG5cbiAgLyoqIE1hcHBpbmcgZnJvbSBpdGVtdXNlIHRyaWdnZXJzIHRvIHRoZSBpdGVtdXNlIHRoYXQgd2FudHMgaXQuICovXG4gIHJlYWRvbmx5IGl0ZW1Vc2VzID0gbmV3IERlZmF1bHRNYXA8bnVtYmVyLCBbSXRlbSwgSXRlbVVzZV1bXT4oKCkgPT4gW10pO1xuXG4gIC8qKiBSYXcgbWFwcGluZyBvZiBleGl0cywgd2l0aG91dCBjYW5vbmljYWxpemluZy4gKi9cbiAgcmVhZG9ubHkgZXhpdHMgPSBuZXcgTWFwPFRpbGVJZCwgVGlsZUlkPigpO1xuXG4gIC8qKiBNYXBwaW5nIGZyb20gZXhpdHMgdG8gZW50cmFuY2VzLiAgVGlsZVBhaXIgaXMgY2Fub25pY2FsaXplZC4gKi9cbiAgcmVhZG9ubHkgZXhpdFNldCA9IG5ldyBTZXQ8VGlsZVBhaXI+KCk7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBUaWxlSWRzIHdpdGggc2VhbWxlc3MgZXhpdHMuICBUaGlzIGlzIHVzZWQgdG8gZW5zdXJlIHRoZVxuICAgKiBsb2dpYyB1bmRlcnN0YW5kcyB0aGF0IHRoZSBwbGF5ZXIgY2FuJ3Qgd2FsayBhY3Jvc3MgYW4gZXhpdCB0aWxlXG4gICAqIHdpdGhvdXQgY2hhbmdpbmcgbG9jYXRpb25zIChwcmltYXJpbHkgZm9yIGRpc2FibGluZyB0ZWxlcG9ydFxuICAgKiBza2lwKS5cbiAgICovXG4gIHJlYWRvbmx5IHNlYW1sZXNzRXhpdHMgPSBuZXcgU2V0PFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogVW5pb25maW5kIG9mIGNvbm5lY3RlZCBjb21wb25lbnRzIG9mIHRpbGVzLiAgTm90ZSB0aGF0IGFsbCB0aGVcbiAgICogYWJvdmUgcHJvcGVydGllcyBjYW4gYmUgYnVpbHQgdXAgaW4gcGFyYWxsZWwsIGJ1dCB0aGUgdW5pb25maW5kXG4gICAqIGNhbm5vdCBiZSBzdGFydGVkIHVudGlsIGFmdGVyIGFsbCB0ZXJyYWlucyBhbmQgZXhpdHMgYXJlXG4gICAqIHJlZ2lzdGVyZWQsIHNpbmNlIHdlIHNwZWNpZmljYWxseSBuZWVkIHRvICpub3QqIHVuaW9uIGNlcnRhaW5cbiAgICogbmVpZ2hib3JzLlxuICAgKi9cbiAgcmVhZG9ubHkgdGlsZXMgPSBuZXcgVW5pb25GaW5kPFRpbGVJZD4oKTtcblxuICAvKipcbiAgICogTWFwIG9mIFRpbGVQYWlycyBvZiBjYW5vbmljYWwgdW5pb25maW5kIHJlcHJlc2VudGF0aXZlIFRpbGVJZHMgdG9cbiAgICogYSBiaXRzZXQgb2YgbmVpZ2hib3IgZGlyZWN0aW9ucy4gIFdlIG9ubHkgbmVlZCB0byB3b3JyeSBhYm91dFxuICAgKiByZXByZXNlbnRhdGl2ZSBlbGVtZW50cyBiZWNhdXNlIGFsbCBUaWxlSWRzIGhhdmUgdGhlIHNhbWUgdGVycmFpbi5cbiAgICogV2Ugd2lsbCBhZGQgYSByb3V0ZSBmb3IgZWFjaCBkaXJlY3Rpb24gd2l0aCB1bmlxdWUgcmVxdWlyZW1lbnRzLlxuICAgKi9cbiAgcmVhZG9ubHkgbmVpZ2hib3JzID0gbmV3IERlZmF1bHRNYXA8VGlsZVBhaXIsIG51bWJlcj4oKCkgPT4gMCk7XG5cbiAgLyoqIFJlcXVpcmVtZW50IGJ1aWxkZXIgZm9yIHJlYWNoaW5nIGVhY2ggY2Fub25pY2FsIFRpbGVJZC4gKi9cbiAgcmVhZG9ubHkgcm91dGVzID1cbiAgICAgIG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgUmVxdWlyZW1lbnQuQnVpbGRlcj4oXG4gICAgICAgICAgKCkgPT4gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKSk7XG5cbiAgLyoqIFJvdXRlcyBvcmlnaW5hdGluZyBmcm9tIGVhY2ggY2Fub25pY2FsIHRpbGUuICovXG4gIHJlYWRvbmx5IHJvdXRlRWRnZXMgPVxuICAgICAgbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBMYWJlbGVkU2V0PFJvdXRlPj4oKCkgPT4gbmV3IExhYmVsZWRTZXQoKSk7XG5cbiAgLyoqIExvY2F0aW9uIGxpc3Q6IHRoaXMgaXMgdGhlIHJlc3VsdCBvZiBjb21iaW5pbmcgcm91dGVzIHdpdGggY2hlY2tzLiAqL1xuICByZWFkb25seSByZXF1aXJlbWVudE1hcCA9XG4gICAgICBuZXcgRGVmYXVsdE1hcDxDb25kaXRpb24sIFJlcXVpcmVtZW50LkJ1aWxkZXI+KFxuICAgICAgICAgIChjOiBDb25kaXRpb24pID0+IG5ldyBSZXF1aXJlbWVudC5CdWlsZGVyKGMpKTtcblxuICAvKiogTG9jYXRpb24gd2l0aCBhIG5vcnRoIGV4aXQgdG8gTGltZSBUcmVlIExha2UgKGkuZS4gUmFnZSkuICovXG4gIHByaXZhdGUgbGltZVRyZWVFbnRyYW5jZUxvY2F0aW9uID0gLTE7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sIHJlYWRvbmx5IGZsYWdzZXQ6IEZsYWdTZXQsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHRyYWNrZXIgPSBmYWxzZSkge1xuICAgIC8vIEJ1aWxkIGl0ZW1Vc2VzIChlLmcuIHdpbmRtaWxsIGtleSBpbnNpZGUgd2luZG1pbGwsIGJvdyBvZiBzdW4vbW9vbj8pXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJvbS5pdGVtcykge1xuICAgICAgZm9yIChjb25zdCB1c2Ugb2YgaXRlbS5pdGVtVXNlRGF0YSkge1xuICAgICAgICBpZiAodXNlLmtpbmQgPT09ICdleHBlY3QnKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQodXNlLndhbnQpLnB1c2goW2l0ZW0sIHVzZV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHVzZS5raW5kID09PSAnbG9jYXRpb24nKSB7XG4gICAgICAgICAgdGhpcy5pdGVtVXNlcy5nZXQofnVzZS53YW50KS5wdXNoKFtpdGVtLCB1c2VdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBCdWlsZCBhbGlhc2VzXG4gICAgdGhpcy5hbGlhc2VzID0gbmV3IE1hcChbXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZUFrYWhhbmEsIHJvbS5mbGFncy5DaGFuZ2VdLFxuICAgICAgW3JvbS5mbGFncy5DaGFuZ2VTb2xkaWVyLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuQ2hhbmdlU3RvbSwgcm9tLmZsYWdzLkNoYW5nZV0sXG4gICAgICBbcm9tLmZsYWdzLkNoYW5nZVdvbWFuLCByb20uZmxhZ3MuQ2hhbmdlXSxcbiAgICAgIFtyb20uZmxhZ3MuUGFyYWx5emVkS2Vuc3VJbkRhbmNlSGFsbCwgcm9tLmZsYWdzLlBhcmFseXNpc10sXG4gICAgICBbcm9tLmZsYWdzLlBhcmFseXplZEtlbnN1SW5UYXZlcm4sIHJvbS5mbGFncy5QYXJhbHlzaXNdLFxuICAgIF0pO1xuXG4gICAgLy8gSWYgdHJpZ2dlciBza2lwIGlzIG9uLCBzZWFtbGVzcyBleGl0cyBjYW4gYmUgY3Jvc3NlZCFcbiAgICBpZiAoZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgIC8vIE5PVEU6IHRoaXMgaXMgYSB0ZXJyaWJsZSBoYWNrLCBidXQgaXQgZWZmaWNpZW50bHkgcHJldmVudHNcbiAgICAgIC8vIGFkZGluZyB0aWxlcyB0byB0aGUgc2V0LCB3aXRob3V0IGNoZWNraW5nIHRoZSBmbGFnIGV2ZXJ5IHRpbWUuXG4gICAgICB0aGlzLnNlYW1sZXNzRXhpdHMuYWRkID0gKCkgPT4gdGhpcy5zZWFtbGVzc0V4aXRzO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGUgb3ZlciBsb2NhdGlvbnMgdG8gYnVpbGQgdXAgaW5mbyBhYm91dCB0aWxlcywgdGVycmFpbnMsIGNoZWNrcy5cbiAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5hZGRFeHRyYUNoZWNrcygpO1xuXG4gICAgLy8gQnVpbGQgdXAgdGhlIFVuaW9uRmluZCBhbmQgdGhlIGV4aXRzIGFuZCBuZWlnaGJvcnMgc3RydWN0dXJlcy5cbiAgICB0aGlzLnVuaW9uTmVpZ2hib3JzKCk7XG4gICAgdGhpcy5yZWNvcmRFeGl0cygpO1xuICAgIHRoaXMuYnVpbGROZWlnaGJvcnMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSByb3V0ZXMvZWRnZXMuXG4gICAgdGhpcy5hZGRBbGxSb3V0ZXMoKTtcblxuICAgIC8vIEJ1aWxkIHRoZSBsb2NhdGlvbiBsaXN0LlxuICAgIHRoaXMuY29uc29saWRhdGVDaGVja3MoKTtcbiAgICB0aGlzLmJ1aWxkUmVxdWlyZW1lbnRNYXAoKTtcbiAgfVxuXG4gIC8qKiBBZGRzIGNoZWNrcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYUNoZWNrcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBsb2NhdGlvbnM6IHtcbiAgICAgICAgTGVhZl9Ub29sU2hvcCxcbiAgICAgICAgTWV6YW1lU2hyaW5lLFxuICAgICAgICBPYWssXG4gICAgICAgIFNoeXJvbl9Ub29sU2hvcCxcbiAgICAgIH0sXG4gICAgICBmbGFnczoge1xuICAgICAgICBBYmxlVG9SaWRlRG9scGhpbixcbiAgICAgICAgQmFsbE9mRmlyZSwgQmFsbE9mVGh1bmRlciwgQmFsbE9mV2F0ZXIsIEJhbGxPZldpbmQsXG4gICAgICAgIEJhcnJpZXIsIEJsaXp6YXJkQnJhY2VsZXQsIEJvd09mTW9vbiwgQm93T2ZTdW4sXG4gICAgICAgIEJyZWFrU3RvbmUsIEJyZWFrSWNlLCBCcmVha0lyb24sXG4gICAgICAgIEJyb2tlblN0YXR1ZSwgQnV5SGVhbGluZywgQnV5V2FycCxcbiAgICAgICAgQ2xpbWJXYXRlcmZhbGwsIENsaW1iU2xvcGU4LCBDbGltYlNsb3BlOSwgQ2xpbWJTbG9wZTEwLFxuICAgICAgICBDcm9zc1BhaW4sIEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sXG4gICAgICAgIEZsaWdodCwgRmxhbWVCcmFjZWxldCwgRm9ybUJyaWRnZSxcbiAgICAgICAgR2FzTWFzaywgR2xvd2luZ0xhbXAsXG4gICAgICAgIEluanVyZWREb2xwaGluLFxuICAgICAgICBMZWFkaW5nQ2hpbGQsIExlYXRoZXJCb290cyxcbiAgICAgICAgTW9uZXksXG4gICAgICAgIE9wZW5lZENyeXB0LFxuICAgICAgICBSYWJiaXRCb290cywgUmVmcmVzaCwgUmVwYWlyZWRTdGF0dWUsIFJlc2N1ZWRDaGlsZCxcbiAgICAgICAgU2hlbGxGbHV0ZSwgU2hpZWxkUmluZyxcbiAgICAgICAgU2hvb3RpbmdTdGF0dWUsIFNob290aW5nU3RhdHVlU291dGgsIFN0b3JtQnJhY2VsZXQsXG4gICAgICAgIFN3b3JkLCBTd29yZE9mRmlyZSwgU3dvcmRPZlRodW5kZXIsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZldpbmQsXG4gICAgICAgIFRvcm5hZG9CcmFjZWxldCwgVHJhdmVsU3dhbXAsIFRyaWdnZXJTa2lwLFxuICAgICAgICBXaWxkV2FycCxcbiAgICAgIH0sXG4gICAgICBpdGVtczoge1xuICAgICAgICBNZWRpY2FsSGVyYixcbiAgICAgICAgV2FycEJvb3RzLFxuICAgICAgfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgY29uc3Qgc3RhcnQgPSB0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSk7XG4gICAgY29uc3QgZW50ZXJPYWsgPSB0aGlzLmVudHJhbmNlKE9hayk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBhbmQoQm93T2ZNb29uLCBCb3dPZlN1biksIFtPcGVuZWRDcnlwdC5pZF0pO1xuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYW5kKEFibGVUb1JpZGVEb2xwaGluLCBTaGVsbEZsdXRlKSxcbiAgICAgICAgICAgICAgICAgIFtDdXJyZW50bHlSaWRpbmdEb2xwaGluLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbZW50ZXJPYWtdLCBhbmQoTGVhZGluZ0NoaWxkKSwgW1Jlc2N1ZWRDaGlsZC5pZF0pO1xuICAgIHRoaXMuYWRkSXRlbUNoZWNrKFtzdGFydF0sIGFuZChHbG93aW5nTGFtcCwgQnJva2VuU3RhdHVlKSxcbiAgICAgICAgICAgICAgICAgICAgICBSZXBhaXJlZFN0YXR1ZS5pZCwge2xvc3N5OiB0cnVlLCB1bmlxdWU6IHRydWV9KTtcblxuICAgIC8vIEFkZCBzaG9wc1xuICAgIGZvciAoY29uc3Qgc2hvcCBvZiB0aGlzLnJvbS5zaG9wcykge1xuICAgICAgLy8gbGVhZiBhbmQgc2h5cm9uIG1heSBub3QgYWx3YXlzIGJlIGFjY2Vzc2libGUsIHNvIGRvbid0IHJlbHkgb24gdGhlbS5cbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBMZWFmX1Rvb2xTaG9wLmlkKSBjb250aW51ZTtcbiAgICAgIGlmIChzaG9wLmxvY2F0aW9uID09PSBTaHlyb25fVG9vbFNob3AuaWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzaG9wLnVzZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHNob3AudHlwZSAhPT0gU2hvcFR5cGUuVE9PTCkgY29udGludWU7XG4gICAgICBjb25zdCBoaXRib3ggPSBbVGlsZUlkKHNob3AubG9jYXRpb24gPDwgMTYgfCAweDg4KV07XG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygc2hvcC5jb250ZW50cykge1xuICAgICAgICBpZiAoaXRlbSA9PT0gTWVkaWNhbEhlcmIuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eUhlYWxpbmcuaWRdKTtcbiAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSBXYXJwQm9vdHMuaWQpIHtcbiAgICAgICAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgTW9uZXkuciwgW0J1eVdhcnAuaWRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBwc2V1ZG8gZmxhZ3NcbiAgICBsZXQgYnJlYWtTdG9uZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mV2luZC5yO1xuICAgIGxldCBicmVha0ljZTogUmVxdWlyZW1lbnQgPSBTd29yZE9mRmlyZS5yO1xuICAgIGxldCBmb3JtQnJpZGdlOiBSZXF1aXJlbWVudCA9IFN3b3JkT2ZXYXRlci5yO1xuICAgIGxldCBicmVha0lyb246IFJlcXVpcmVtZW50ID0gU3dvcmRPZlRodW5kZXIucjtcbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5vcmJzT3B0aW9uYWwoKSkge1xuICAgICAgY29uc3Qgd2luZDIgPSBvcihCYWxsT2ZXaW5kLCBUb3JuYWRvQnJhY2VsZXQpO1xuICAgICAgY29uc3QgZmlyZTIgPSBvcihCYWxsT2ZGaXJlLCBGbGFtZUJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHdhdGVyMiA9IG9yKEJhbGxPZldhdGVyLCBCbGl6emFyZEJyYWNlbGV0KTtcbiAgICAgIGNvbnN0IHRodW5kZXIyID0gb3IoQmFsbE9mVGh1bmRlciwgU3Rvcm1CcmFjZWxldCk7XG4gICAgICBicmVha1N0b25lID0gUmVxdWlyZW1lbnQubWVldChicmVha1N0b25lLCB3aW5kMik7XG4gICAgICBicmVha0ljZSA9IFJlcXVpcmVtZW50Lm1lZXQoYnJlYWtJY2UsIGZpcmUyKTtcbiAgICAgIGZvcm1CcmlkZ2UgPSBSZXF1aXJlbWVudC5tZWV0KGZvcm1CcmlkZ2UsIHdhdGVyMik7XG4gICAgICBicmVha0lyb24gPSBSZXF1aXJlbWVudC5tZWV0KGJyZWFrSXJvbiwgdGh1bmRlcjIpO1xuICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVTd29yZENoYXJnZUdsaXRjaCgpKSB7XG4gICAgICAgIGNvbnN0IGxldmVsMiA9XG4gICAgICAgICAgICBSZXF1aXJlbWVudC5vcihicmVha1N0b25lLCBicmVha0ljZSwgZm9ybUJyaWRnZSwgYnJlYWtJcm9uKTtcbiAgICAgICAgZnVuY3Rpb24gbmVlZChzd29yZDogRmxhZyk6IFJlcXVpcmVtZW50IHtcbiAgICAgICAgICByZXR1cm4gbGV2ZWwyLm1hcChcbiAgICAgICAgICAgICAgKGM6IHJlYWRvbmx5IENvbmRpdGlvbltdKSA9PlxuICAgICAgICAgICAgICAgICAgY1swXSA9PT0gc3dvcmQuYyA/IGMgOiBbc3dvcmQuYywgLi4uY10pO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrU3RvbmUgPSBuZWVkKFN3b3JkT2ZXaW5kKTtcbiAgICAgICAgYnJlYWtJY2UgPSBuZWVkKFN3b3JkT2ZGaXJlKTtcbiAgICAgICAgZm9ybUJyaWRnZSA9IG5lZWQoU3dvcmRPZldhdGVyKTtcbiAgICAgICAgYnJlYWtJcm9uID0gbmVlZChTd29yZE9mVGh1bmRlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgYnJlYWtTdG9uZSwgW0JyZWFrU3RvbmUuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGJyZWFrSWNlLCBbQnJlYWtJY2UuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIGZvcm1CcmlkZ2UsIFtGb3JtQnJpZGdlLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBicmVha0lyb24sIFtCcmVha0lyb24uaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sXG4gICAgICAgICAgICAgICAgICBvcihTd29yZE9mV2luZCwgU3dvcmRPZkZpcmUsIFN3b3JkT2ZXYXRlciwgU3dvcmRPZlRodW5kZXIpLFxuICAgICAgICAgICAgICAgICAgW1N3b3JkLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBGbGlnaHQuciwgW0NsaW1iV2F0ZXJmYWxsLmlkLCBDbGltYlNsb3BlMTAuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMpLCBbQ2xpbWJTbG9wZTkuaWRdKTtcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIEJhcnJpZXIuciwgW1Nob290aW5nU3RhdHVlLmlkLCBTaG9vdGluZ1N0YXR1ZVNvdXRoLmlkXSk7XG4gICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBHYXNNYXNrLnIsIFtUcmF2ZWxTd2FtcC5pZF0pO1xuICAgIGNvbnN0IHBhaW4gPSB0aGlzLmZsYWdzZXQuY2hhbmdlR2FzTWFza1RvSGF6bWF0U3VpdCgpID8gR2FzTWFzayA6IExlYXRoZXJCb290cztcbiAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIG9yKEZsaWdodCwgUmFiYml0Qm9vdHMsIHBhaW4pLCBbQ3Jvc3NQYWluLmlkXSk7XG5cbiAgICBpZiAodGhpcy5mbGFnc2V0LmxlYXRoZXJCb290c0dpdmVTcGVlZCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIExlYXRoZXJCb290cy5yLCBbQ2xpbWJTbG9wZTguaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVHaGV0dG9GbGlnaHQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhcbiAgICAgICAgW3N0YXJ0XSwgYW5kKEN1cnJlbnRseVJpZGluZ0RvbHBoaW4sIFJhYmJpdEJvb3RzKSxcbiAgICAgICAgW0NsaW1iV2F0ZXJmYWxsLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuZm9nTGFtcE5vdFJlcXVpcmVkKCkpIHtcbiAgICAgIC8vIG5vdCBhY3R1YWxseSB1c2VkLi4uP1xuICAgICAgY29uc3QgcmVxdWlyZUhlYWxlZCA9IHRoaXMuZmxhZ3NldC5yZXF1aXJlSGVhbGVkRG9scGhpblRvUmlkZSgpO1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlSGVhbGVkID8gSW5qdXJlZERvbHBoaW4uciA6IFtbXV0sXG4gICAgICAgICAgICAgICAgICAgIFtBYmxlVG9SaWRlRG9scGhpbi5pZF0pO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVCYXJyaWVyKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgW1tNb25leS5jLCBCdXlIZWFsaW5nLmNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW01vbmV5LmMsIFNoaWVsZFJpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sXG4gICAgICAgICAgICAgICAgICAgIFtTaG9vdGluZ1N0YXR1ZS5pZCwgU2hvb3RpbmdTdGF0dWVTb3V0aC5pZF0pO1xuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZUZsaWdodFN0YXR1ZVNraXAoKSkge1xuICAgICAgLy8gTk9URTogd2l0aCBubyBtb25leSwgd2UndmUgZ290IDE2IE1QLCB3aGljaCBpc24ndCBlbm91Z2hcbiAgICAgIC8vIHRvIGdldCBwYXN0IHNldmVuIHN0YXR1ZXMuXG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFtbTW9uZXkuYywgRmxpZ2h0LmNdXSwgW1Nob290aW5nU3RhdHVlLmlkXSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZUdhc01hc2soKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBbW01vbmV5LmMsIEJ1eUhlYWxpbmcuY10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbTW9uZXkuYywgUmVmcmVzaC5jXV0sXG4gICAgICAgICAgICAgICAgICAgIFtUcmF2ZWxTd2FtcC5pZCwgQ3Jvc3NQYWluLmlkXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmZsYWdzZXQuYXNzdW1lV2lsZFdhcnAoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhbc3RhcnRdLCBSZXF1aXJlbWVudC5PUEVOLCBbV2lsZFdhcnAuaWRdKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgIHRoaXMuYWRkQ2hlY2soW3N0YXJ0XSwgUmVxdWlyZW1lbnQuT1BFTiwgW1RyaWdnZXJTa2lwLmlkXSk7XG4gICAgICB0aGlzLmFkZENoZWNrKFtzdGFydF0sIFRyaWdnZXJTa2lwLnIsXG4gICAgICAgICAgICAgICAgICAgIFtDcm9zc1BhaW4uaWQsIENsaW1iU2xvcGU4LmlkLFxuICAgICAgICAgICAgICAgICAgICAgQ2xpbWJTbG9wZTkuaWQgLyosIENsaW1iU2xvcGUxMC5pZCAqL10pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBBZGRzIHJvdXRlcyB0aGF0IGFyZSBub3QgZGV0ZWN0YWJsZSBmcm9tIGRhdGEgdGFibGVzLiAqL1xuICBhZGRFeHRyYVJvdXRlcygpIHtcbiAgICBjb25zdCB7XG4gICAgICBmbGFnczoge0J1eVdhcnAsIFN3b3JkT2ZUaHVuZGVyLCBUZWxlcG9ydCwgV2lsZFdhcnB9LFxuICAgICAgbG9jYXRpb25zOiB7TWV6YW1lU2hyaW5lfSxcbiAgICB9ID0gdGhpcy5yb207XG4gICAgLy8gU3RhcnQgdGhlIGdhbWUgYXQgTWV6YW1lIFNocmluZS5cbiAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZSh0aGlzLmVudHJhbmNlKE1lemFtZVNocmluZSksIFtdKSk7XG4gICAgLy8gU3dvcmQgb2YgVGh1bmRlciB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC50ZWxlcG9ydE9uVGh1bmRlclN3b3JkKCkpIHtcbiAgICAgIGNvbnN0IHdhcnAgPSB0aGlzLnJvbS50b3duV2FycC50aHVuZGVyU3dvcmRXYXJwO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgQnV5V2FycC5jXSkpO1xuICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUodGhpcy5lbnRyYW5jZSh3YXJwWzBdLCB3YXJwWzFdICYgMHgxZiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbU3dvcmRPZlRodW5kZXIuYywgVGVsZXBvcnQuY10pKTtcbiAgICB9XG4gICAgLy8gV2lsZCB3YXJwXG4gICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVXaWxkV2FycCgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHRoaXMucm9tLndpbGRXYXJwLmxvY2F0aW9ucykge1xuICAgICAgICAvLyBEb24ndCBjb3VudCBjaGFubmVsIGluIGxvZ2ljIGJlY2F1c2UgeW91IGNhbid0IGFjdHVhbGx5IG1vdmUuXG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdGhpcy5yb20ubG9jYXRpb25zLlVuZGVyZ3JvdW5kQ2hhbm5lbC5pZCkgY29udGludWU7XG4gICAgICAgIC8vIE5PVEU6IHNvbWUgZW50cmFuY2UgdGlsZXMgaGFzIGV4dHJhIHJlcXVpcmVtZW50cyB0byBlbnRlciAoZS5nLlxuICAgICAgICAvLyBzd2FtcCkgLSBmaW5kIHRoZW0gYW5kIGNvbmNhdGVudGUuXG4gICAgICAgIGNvbnN0IGVudHJhbmNlID0gdGhpcy5lbnRyYW5jZShsb2NhdGlvbik7XG4gICAgICAgIGNvbnN0IHRlcnJhaW4gPSB0aGlzLnRlcnJhaW5zLmdldChlbnRyYW5jZSkgPz8gZGllKCdiYWQgZW50cmFuY2UnKTtcbiAgICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiB0ZXJyYWluLmVudGVyKSB7XG4gICAgICAgICAgdGhpcy5hZGRSb3V0ZShuZXcgUm91dGUoZW50cmFuY2UsIFtXaWxkV2FycC5jLCAuLi5yb3V0ZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBDaGFuZ2UgdGhlIGtleSBvZiB0aGUgY2hlY2tzIG1hcCB0byBvbmx5IGJlIGNhbm9uaWNhbCBUaWxlSWRzLiAqL1xuICBjb25zb2xpZGF0ZUNoZWNrcygpIHtcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NdIG9mIHRoaXMuY2hlY2tzKSB7XG4gICAgICBjb25zdCByb290ID0gdGhpcy50aWxlcy5maW5kKHRpbGUpO1xuICAgICAgaWYgKHRpbGUgPT09IHJvb3QpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgdGhpcy5jaGVja3MuZ2V0KHJvb3QpLmFkZChjaGVjayk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoZWNrcy5kZWxldGUodGlsZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEF0IHRoaXMgcG9pbnQgd2Uga25vdyB0aGF0IGFsbCBvZiB0aGlzLmNoZWNrcycga2V5cyBhcmUgY2Fub25pY2FsLiAqL1xuICBidWlsZFJlcXVpcmVtZW50TWFwKCkge1xuICAgIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrU2V0XSBvZiB0aGlzLmNoZWNrcykge1xuICAgICAgZm9yIChjb25zdCB7Y2hlY2tzLCByZXF1aXJlbWVudH0gb2YgY2hlY2tTZXQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3MpIHtcbiAgICAgICAgICBjb25zdCByZXEgPSB0aGlzLnJlcXVpcmVtZW50TWFwLmdldChjaGVjayBhcyBDb25kaXRpb24pO1xuICAgICAgICAgIGZvciAoY29uc3QgcjEgb2YgcmVxdWlyZW1lbnQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcjIgb2YgdGhpcy5yb3V0ZXMuZ2V0KHRpbGUpIHx8IFtdKSB7XG4gICAgICAgICAgICAgIHJlcS5hZGRMaXN0KFsuLi5yMSwgLi4ucjJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPIC0gbG9nIHRoZSBtYXA/XG4gICAgaWYgKCFERUJVRykgcmV0dXJuO1xuICAgIGNvbnN0IGxvZyA9IFtdO1xuICAgIGZvciAoY29uc3QgW2NoZWNrLCByZXFdIG9mIHRoaXMucmVxdWlyZW1lbnRNYXApIHtcbiAgICAgIGNvbnN0IG5hbWUgPSAoYzogbnVtYmVyKSA9PiB0aGlzLnJvbS5mbGFnc1tjXS5uYW1lO1xuICAgICAgZm9yIChjb25zdCByb3V0ZSBvZiByZXEpIHtcbiAgICAgICAgbG9nLnB1c2goYCR7bmFtZShjaGVjayl9OiAke1suLi5yb3V0ZV0ubWFwKG5hbWUpLmpvaW4oJyAmICcpfVxcbmApO1xuICAgICAgfVxuICAgIH1cbiAgICBsb2cuc29ydCgoYTogYW55LCBiOiBhbnkpID0+IGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwKTtcbiAgICBjb25zb2xlLmxvZyhsb2cuam9pbignJykpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYSBMb2NhdGlvbkxpc3Qgc3RydWN0dXJlIGFmdGVyIHRoZSByZXF1aXJlbWVudCBtYXAgaXMgYnVpbHQuICovXG4gIGdldExvY2F0aW9uTGlzdCh3b3JsZE5hbWUgPSAnQ3J5c3RhbGlzJyk6IExvY2F0aW9uTGlzdCB7XG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGp1c3QgaW1wbGVtZW50aW5nIHRoaXMgZGlyZWN0bHk/XG4gICAgY29uc3QgY2hlY2tOYW1lID0gREVCVUcgPyAoZjogRmxhZykgPT4gZi5kZWJ1ZyA6IChmOiBGbGFnKSA9PiBmLm5hbWU7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmxkTmFtZSxcbiAgICAgIHJlcXVpcmVtZW50czogdGhpcy5yZXF1aXJlbWVudE1hcCxcbiAgICAgIGl0ZW1zOiB0aGlzLml0ZW1zLFxuICAgICAgc2xvdHM6IHRoaXMuc2xvdHMsXG4gICAgICBjaGVja05hbWU6IChjaGVjazogbnVtYmVyKSA9PiBjaGVja05hbWUodGhpcy5yb20uZmxhZ3NbY2hlY2tdKSxcbiAgICAgIHByZWZpbGw6IChyYW5kb206IFJhbmRvbSkgPT4ge1xuICAgICAgICBjb25zdCB7Q3J5c3RhbGlzLCBNZXNpYUluVG93ZXIsIExlYWZFbGRlcn0gPSB0aGlzLnJvbS5mbGFncztcbiAgICAgICAgY29uc3QgbWFwID0gbmV3IE1hcChbW01lc2lhSW5Ub3dlci5pZCwgQ3J5c3RhbGlzLmlkXV0pO1xuICAgICAgICBpZiAodGhpcy5mbGFnc2V0Lmd1YXJhbnRlZVN3b3JkKCkpIHtcbiAgICAgICAgICAvLyBQaWNrIGEgc3dvcmQgYXQgcmFuZG9tLi4uPyBpbnZlcnNlIHdlaWdodD9cbiAgICAgICAgICBtYXAuc2V0KExlYWZFbGRlci5pZCwgMHgyMDAgfCByYW5kb20ubmV4dEludCg0KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hcDtcbiAgICAgICAgLy8gVE9ETyAtIGlmIGFueSBpdGVtcyBzaG91bGRuJ3QgYmUgc2h1ZmZsZWQsIHRoZW4gZG8gdGhlIHByZS1maWxsLi4uXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKiogQWRkIHRlcnJhaW5zIGFuZCBjaGVja3MgZm9yIGEgbG9jYXRpb24sIGZyb20gdGlsZXMgYW5kIHNwYXducy4gKi9cbiAgcHJvY2Vzc0xvY2F0aW9uKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgcmV0dXJuO1xuICAgIC8vIExvb2sgZm9yIHdhbGxzLCB3aGljaCB3ZSBuZWVkIHRvIGtub3cgYWJvdXQgbGF0ZXIuXG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25UaWxlcyhsb2NhdGlvbik7XG4gICAgdGhpcy5wcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb24pO1xuICAgIHRoaXMucHJvY2Vzc0xvY2F0aW9uSXRlbVVzZXMobG9jYXRpb24pO1xuICB9XG5cbiAgLyoqIFJ1biB0aGUgZmlyc3QgcGFzcyBvZiB1bmlvbnMgbm93IHRoYXQgYWxsIHRlcnJhaW5zIGFyZSBmaW5hbC4gKi9cbiAgdW5pb25OZWlnaGJvcnMoKSB7XG4gICAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGhpcy50ZXJyYWlucykge1xuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KHgxKSA9PT0gdGVycmFpbikgdGhpcy50aWxlcy51bmlvbihbdGlsZSwgeDFdKTtcbiAgICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICAgIGlmICh0aGlzLnRlcnJhaW5zLmdldCh5MSkgPT09IHRlcnJhaW4pIHRoaXMudGlsZXMudW5pb24oW3RpbGUsIHkxXSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEJ1aWxkcyB1cCB0aGUgcm91dGVzIGFuZCByb3V0ZUVkZ2VzIGRhdGEgc3RydWN0dXJlcy4gKi9cbiAgYWRkQWxsUm91dGVzKCkge1xuICAgIC8vIEFkZCBhbnkgZXh0cmEgcm91dGVzIGZpcnN0LCBzdWNoIGFzIHRoZSBzdGFydGluZyB0aWxlLlxuICAgIHRoaXMuYWRkRXh0cmFSb3V0ZXMoKTtcbiAgICAvLyBBZGQgYWxsIHRoZSBlZGdlcyBmcm9tIGFsbCBuZWlnaGJvcnMuXG4gICAgZm9yIChjb25zdCBbcGFpciwgZGlyc10gb2YgdGhpcy5uZWlnaGJvcnMpIHtcbiAgICAgIGNvbnN0IFtjMCwgYzFdID0gVGlsZVBhaXIuc3BsaXQocGFpcik7XG4gICAgICBjb25zdCB0MCA9IHRoaXMudGVycmFpbnMuZ2V0KGMwKTtcbiAgICAgIGNvbnN0IHQxID0gdGhpcy50ZXJyYWlucy5nZXQoYzEpO1xuICAgICAgaWYgKCF0MCB8fCAhdDEpIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyB0ZXJyYWluICR7aGV4KHQwID8gYzAgOiBjMSl9YCk7XG4gICAgICBmb3IgKGNvbnN0IFtkaXIsIGV4aXRSZXFdIG9mIHQwLmV4aXQpIHtcbiAgICAgICAgaWYgKCEoZGlyICYgZGlycykpIGNvbnRpbnVlO1xuICAgICAgICBmb3IgKGNvbnN0IGV4aXRDb25kcyBvZiBleGl0UmVxKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBlbnRlckNvbmRzIG9mIHQxLmVudGVyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFJvdXRlKG5ldyBSb3V0ZShjMSwgWy4uLmV4aXRDb25kcywgLi4uZW50ZXJDb25kc10pLCBjMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBkZWJ1ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWJ1ZycpO1xuICAgICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGRlYnVnLmFwcGVuZENoaWxkKG5ldyBBcmVhKHRoaXMucm9tLCB0aGlzLmdldFdvcmxkRGF0YSgpKS5lbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRXb3JsZERhdGEoKTogV29ybGREYXRhIHtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGNvbnN0IHRpbGVzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBUaWxlRGF0YT4oKCkgPT4gKHt9KSBhcyBUaWxlRGF0YSk7XG4gICAgY29uc3QgbG9jYXRpb25zID1cbiAgICAgICAgc2VxKDI1NiwgKCkgPT4gKHthcmVhczogbmV3IFNldCgpLCB0aWxlczogbmV3IFNldCgpfSBhcyBMb2NhdGlvbkRhdGEpKTtcbiAgICBjb25zdCBhcmVhczogQXJlYURhdGFbXSA9IFtdO1xuXG4gICAgLy8gZGlnZXN0IHRoZSBhcmVhc1xuICAgIGZvciAoY29uc3Qgc2V0IG9mIHRoaXMudGlsZXMuc2V0cygpKSB7XG4gICAgICBjb25zdCBjYW5vbmljYWwgPSB0aGlzLnRpbGVzLmZpbmQoaXRlcnMuZmlyc3Qoc2V0KSk7XG4gICAgICBjb25zdCB0ZXJyYWluID0gdGhpcy50ZXJyYWlucy5nZXQoY2Fub25pY2FsKTtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCByb3V0ZXMgPVxuICAgICAgICAgIHRoaXMucm91dGVzLmhhcyhjYW5vbmljYWwpID9cbiAgICAgICAgICAgICAgUmVxdWlyZW1lbnQuZnJlZXplKHRoaXMucm91dGVzLmdldChjYW5vbmljYWwpKSA6IFtdO1xuICAgICAgaWYgKCFyb3V0ZXMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGFyZWE6IEFyZWFEYXRhID0ge1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICBpZDogaW5kZXgrKyxcbiAgICAgICAgbG9jYXRpb25zOiBuZXcgU2V0KCksXG4gICAgICAgIHJvdXRlcyxcbiAgICAgICAgdGVycmFpbixcbiAgICAgICAgdGlsZXM6IG5ldyBTZXQoKSxcbiAgICAgIH07XG4gICAgICBhcmVhcy5wdXNoKGFyZWEpO1xuICAgICAgZm9yIChjb25zdCB0aWxlIG9mIHNldCkge1xuICAgICAgICBjb25zdCBsb2NhdGlvbiA9IHRpbGUgPj4+IDE2O1xuICAgICAgICBhcmVhLmxvY2F0aW9ucy5hZGQobG9jYXRpb24pO1xuICAgICAgICBhcmVhLnRpbGVzLmFkZCh0aWxlKTtcbiAgICAgICAgbG9jYXRpb25zW2xvY2F0aW9uXS5hcmVhcy5hZGQoYXJlYSk7XG4gICAgICAgIGxvY2F0aW9uc1tsb2NhdGlvbl0udGlsZXMuYWRkKHRpbGUpO1xuICAgICAgICB0aWxlcy5nZXQodGlsZSkuYXJlYSA9IGFyZWE7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGRpZ2VzdCB0aGUgZXhpdHNcbiAgICBmb3IgKGNvbnN0IFthLCBiXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICBpZiAodGlsZXMuaGFzKGEpKSB7XG4gICAgICAgIHRpbGVzLmdldChhKS5leGl0ID0gYjtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGlnZXN0IHRoZSBjaGVja3NcbiAgICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja1NldF0gb2YgdGhpcy5jaGVja3MpIHtcbiAgICAgIGNvbnN0IGFyZWEgPSB0aWxlcy5nZXQodGlsZSkuYXJlYTtcbiAgICAgIGlmICghYXJlYSkge1xuICAgICAgICAvLyBjb25zb2xlLmVycm9yKGBBYmFuZG9uZWQgY2hlY2sgJHtbLi4uY2hlY2tTZXRdLm1hcChcbiAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgIHggPT4gWy4uLnguY2hlY2tzXS5tYXAoeSA9PiB5LnRvU3RyaW5nKDE2KSkpXG4gICAgICAgIC8vICAgICAgICAgICAgICAgIH0gYXQgJHt0aWxlLnRvU3RyaW5nKDE2KX1gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHtjaGVja3MsIHJlcXVpcmVtZW50fSBvZiBjaGVja1NldCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIGNoZWNrcykge1xuICAgICAgICAgIGNvbnN0IGZsYWcgPSB0aGlzLnJvbS5mbGFnc1tjaGVja10gfHwgZGllKCk7XG4gICAgICAgICAgYXJlYS5jaGVja3MucHVzaChbZmxhZywgcmVxdWlyZW1lbnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge3RpbGVzLCBhcmVhcywgbG9jYXRpb25zfTtcbiAgfVxuXG4gIC8qKiBBZGRzIGEgcm91dGUsIG9wdGlvbmFsbHkgd2l0aCBhIHByZXJlcXVpc2l0ZSAoY2Fub25pY2FsKSBzb3VyY2UgdGlsZS4gKi9cbiAgYWRkUm91dGUocm91dGU6IFJvdXRlLCBzb3VyY2U/OiBUaWxlSWQpIHtcbiAgICBpZiAoc291cmNlICE9IG51bGwpIHtcbiAgICAgIC8vIEFkZCBhbiBlZGdlIGluc3RlYWQgb2YgYSByb3V0ZSwgcmVjdXJzaW5nIG9uIHRoZSBzb3VyY2Unc1xuICAgICAgLy8gcmVxdWlyZW1lbnRzLlxuICAgICAgdGhpcy5yb3V0ZUVkZ2VzLmdldChzb3VyY2UpLmFkZChyb3V0ZSk7XG4gICAgICBmb3IgKGNvbnN0IHNyY1JvdXRlIG9mIHRoaXMucm91dGVzLmdldChzb3VyY2UpKSB7XG4gICAgICAgIHRoaXMuYWRkUm91dGUobmV3IFJvdXRlKHJvdXRlLnRhcmdldCwgWy4uLnNyY1JvdXRlLCAuLi5yb3V0ZS5kZXBzXSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBUaGlzIGlzIG5vdyBhbiBcImluaXRpYWwgcm91dGVcIiB3aXRoIG5vIHByZXJlcXVpc2l0ZSBzb3VyY2UuXG4gICAgY29uc3QgcXVldWUgPSBuZXcgTGFiZWxlZFNldDxSb3V0ZT4oKTtcbiAgICBjb25zdCBzZWVuID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgY29uc3Qgc3RhcnQgPSByb3V0ZTsgLy8gVE9ETyBpbmxpbmVcbiAgICBxdWV1ZS5hZGQoc3RhcnQpO1xuICAgIGNvbnN0IGl0ZXIgPSBxdWV1ZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHt2YWx1ZSwgZG9uZX0gPSBpdGVyLm5leHQoKTtcbiAgICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgICBzZWVuLmFkZCh2YWx1ZSk7XG4gICAgICBxdWV1ZS5kZWxldGUodmFsdWUpO1xuICAgICAgY29uc3QgZm9sbG93ID0gbmV3IExhYmVsZWRTZXQ8Um91dGU+KCk7XG4gICAgICBjb25zdCB0YXJnZXQgPSB2YWx1ZS50YXJnZXQ7XG4gICAgICBjb25zdCBidWlsZGVyID0gdGhpcy5yb3V0ZXMuZ2V0KHRhcmdldCk7XG4gICAgICBpZiAoYnVpbGRlci5hZGRSb3V0ZSh2YWx1ZSkpIHtcbiAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRoaXMucm91dGVFZGdlcy5nZXQodGFyZ2V0KSkge1xuICAgICAgICAgIGZvbGxvdy5hZGQobmV3IFJvdXRlKG5leHQudGFyZ2V0LCBbLi4udmFsdWUuZGVwcywgLi4ubmV4dC5kZXBzXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5leHQgb2YgZm9sbG93KSB7XG4gICAgICAgIGlmIChzZWVuLmhhcyhuZXh0KSkgY29udGludWU7XG4gICAgICAgIHF1ZXVlLmRlbGV0ZShuZXh0KTsgLy8gcmUtYWRkIGF0IHRoZSBlbmQgb2YgdGhlIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmFkZChuZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIHVwIGB0aGlzLmV4aXRTZXRgIHRvIGluY2x1ZGUgYWxsIHRoZSBcImZyb20tdG9cIiB0aWxlIHBhaXJzXG4gICAqIG9mIGV4aXRzIHRoYXQgX2Rvbid0XyBzaGFyZSB0aGUgc2FtZSB0ZXJyYWluIEZvciBhbnkgdHdvLXdheSBleGl0XG4gICAqIHRoYXQgc2hhcmVzIHRoZSBzYW1lIHRlcnJhaW4sIGp1c3QgYWRkIGl0IGRpcmVjdGx5IHRvIHRoZVxuICAgKiB1bmlvbmZpbmQuXG4gICAqL1xuICByZWNvcmRFeGl0cygpIHtcbiAgICAvLyBBZGQgZXhpdCBUaWxlUGFpcnMgdG8gZXhpdFNldCBmcm9tIGFsbCBsb2NhdGlvbnMnIGV4aXRzLlxuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiB0aGlzLmV4aXRzKSB7XG4gICAgICB0aGlzLmV4aXRTZXQuYWRkKFxuICAgICAgICAgIFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZChmcm9tKSwgdGhpcy50aWxlcy5maW5kKHRvKSkpO1xuICAgIH1cbiAgICAvLyBMb29rIGZvciB0d28td2F5IGV4aXRzIHdpdGggdGhlIHNhbWUgdGVycmFpbjogcmVtb3ZlIHRoZW0gZnJvbVxuICAgIC8vIGV4aXRTZXQgYW5kIGFkZCB0aGVtIHRvIHRoZSB0aWxlcyB1bmlvbmZpbmQuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgICAgaWYgKHRoaXMudGVycmFpbnMuZ2V0KGZyb20pICE9PSB0aGlzLnRlcnJhaW5zLmdldCh0bykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcmV2ZXJzZSA9IFRpbGVQYWlyLm9mKHRvLCBmcm9tKTtcbiAgICAgIGlmICh0aGlzLmV4aXRTZXQuaGFzKHJldmVyc2UpKSB7XG4gICAgICAgIHRoaXMudGlsZXMudW5pb24oW2Zyb20sIHRvXSk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUoZXhpdCk7XG4gICAgICAgIHRoaXMuZXhpdFNldC5kZWxldGUocmV2ZXJzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgZGlmZmVyZW50LXRlcnJhaW4gbmVpZ2hib3JzIGluIHRoZSBzYW1lIGxvY2F0aW9uLiAgQWRkXG4gICAqIHJlcHJlc2VudGF0aXZlIGVsZW1lbnRzIHRvIGB0aGlzLm5laWdoYm9yc2Agd2l0aCBhbGwgdGhlXG4gICAqIGRpcmVjdGlvbnMgdGhhdCBpdCBuZWlnaGJvcnMgaW4uICBBbHNvIGFkZCBleGl0cyBhcyBuZWlnaGJvcnMuXG4gICAqIFRoaXMgbXVzdCBoYXBwZW4gKmFmdGVyKiB0aGUgZW50aXJlIHVuaW9uZmluZCBpcyBjb21wbGV0ZSBzb1xuICAgKiB0aGF0IHdlIGNhbiBsZXZlcmFnZSBpdC5cbiAgICovXG4gIGJ1aWxkTmVpZ2hib3JzKCkge1xuICAgIC8vIEFkamFjZW50IGRpZmZlcmVudC10ZXJyYWluIHRpbGVzLlxuICAgIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRoaXMudGVycmFpbnMpIHtcbiAgICAgIGlmICghdGVycmFpbikgY29udGludWU7XG4gICAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgICBjb25zdCB0eTEgPSB0aGlzLnRlcnJhaW5zLmdldCh5MSk7XG4gICAgICBpZiAodHkxICYmIHR5MSAhPT0gdGVycmFpbikge1xuICAgICAgICB0aGlzLmhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHRpbGUsIHkxLCBEaXIuTm9ydGgpO1xuICAgICAgfVxuICAgICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgICAgY29uc3QgdHgxID0gdGhpcy50ZXJyYWlucy5nZXQoeDEpO1xuICAgICAgaWYgKHR4MSAmJiB0eDEgIT09IHRlcnJhaW4pIHtcbiAgICAgICAgdGhpcy5oYW5kbGVBZGphY2VudE5laWdoYm9ycyh0aWxlLCB4MSwgRGlyLldlc3QpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBFeGl0cyAoanVzdCB1c2UgXCJub3J0aFwiIGZvciB0aGVzZSkuXG4gICAgZm9yIChjb25zdCBleGl0IG9mIHRoaXMuZXhpdFNldCkge1xuICAgICAgY29uc3QgW3QwLCB0MV0gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICAgIGlmICghdGhpcy50ZXJyYWlucy5oYXModDApIHx8ICF0aGlzLnRlcnJhaW5zLmhhcyh0MSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcCA9IFRpbGVQYWlyLm9mKHRoaXMudGlsZXMuZmluZCh0MCksIHRoaXMudGlsZXMuZmluZCh0MSkpO1xuICAgICAgdGhpcy5uZWlnaGJvcnMuc2V0KHAsIHRoaXMubmVpZ2hib3JzLmdldChwKSB8IDEpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZUFkamFjZW50TmVpZ2hib3JzKHQwOiBUaWxlSWQsIHQxOiBUaWxlSWQsIGRpcjogRGlyKSB7XG4gICAgLy8gTk9URTogdDAgPCB0MSBiZWNhdXNlIGRpciBpcyBhbHdheXMgV0VTVCBvciBOT1JUSC5cbiAgICBjb25zdCBjMCA9IHRoaXMudGlsZXMuZmluZCh0MCk7XG4gICAgY29uc3QgYzEgPSB0aGlzLnRpbGVzLmZpbmQodDEpO1xuICAgIGlmICghdGhpcy5zZWFtbGVzc0V4aXRzLmhhcyh0MSkpIHtcbiAgICAgIC8vIDEgLT4gMCAod2VzdC9ub3J0aCkuICBJZiAxIGlzIGFuIGV4aXQgdGhlbiB0aGlzIGRvZXNuJ3Qgd29yay5cbiAgICAgIGNvbnN0IHAxMCA9IFRpbGVQYWlyLm9mKGMxLCBjMCk7XG4gICAgICB0aGlzLm5laWdoYm9ycy5zZXQocDEwLCB0aGlzLm5laWdoYm9ycy5nZXQocDEwKSB8ICgxIDw8IGRpcikpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VhbWxlc3NFeGl0cy5oYXModDApKSB7XG4gICAgICAvLyAwIC0+IDEgKGVhc3Qvc291dGgpLiAgSWYgMCBpcyBhbiBleGl0IHRoZW4gdGhpcyBkb2Vzbid0IHdvcmsuXG4gICAgICBjb25zdCBvcHAgPSBkaXIgXiAyO1xuICAgICAgY29uc3QgcDAxID0gVGlsZVBhaXIub2YoYzAsIGMxKTtcbiAgICAgIHRoaXMubmVpZ2hib3JzLnNldChwMDEsIHRoaXMubmVpZ2hib3JzLmdldChwMDEpIHwgKDEgPDwgb3BwKSk7XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0xvY2F0aW9uVGlsZXMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgY29uc3Qgd2FsbHMgPSBuZXcgTWFwPFNjcmVlbklkLCBXYWxsVHlwZT4oKTtcbiAgICBjb25zdCBzaG9vdGluZ1N0YXR1ZXMgPSBuZXcgU2V0PFRpbGVJZD4oKTtcbiAgICBjb25zdCBpblRvd2VyID0gKGxvY2F0aW9uLmlkICYgMHhmOCkgPT09IDB4NTg7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIFdhbGxzIG5lZWQgdG8gY29tZSBmaXJzdCBzbyB3ZSBjYW4gYXZvaWQgYWRkaW5nIHNlcGFyYXRlXG4gICAgICAvLyByZXF1aXJlbWVudHMgZm9yIGV2ZXJ5IHNpbmdsZSB3YWxsIC0ganVzdCB1c2UgdGhlIHR5cGUuXG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgd2FsbHMuc2V0KFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSwgKHNwYXduLmlkICYgMykgYXMgV2FsbFR5cGUpO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5pZCA9PT0gMHgzZikgeyAvLyBzaG9vdGluZyBzdGF0dWVzXG4gICAgICAgIC8vIEFkZCBjb25zdHJhaW50IG9ubHkgYmV0d2VlbiB0aGUgc3RhdHVlczogeCBpbiBbNC4uYl0gYW5kIHkgaW5cbiAgICAgICAgLy8gW3l0LTMuLnl0KzNdLCByYXRoZXIgdGhhbiBqdXN0IGEgc2luZ2xlIGVudGlyZSByb3cuICBUaGlzIGlzIGhhcmRcbiAgICAgICAgLy8gYmVjYXVzZSB0aGUgU2NyZWVuSWQgcHV0cyB0aGUgc2NyZWVuIHkgaW4gYW4gaW5jb252ZW5pZW50IG5pYmJsZVxuICAgICAgICAvLyByZWxhdGl2ZSB0byB0aGUgdGlsZSB5LCBzbyB3ZSBuZWVkIHRvIGRvIHNvbWUgd2VpcmQgbWF0aCB0byBnZXQgdGhpc1xuICAgICAgICAvLyBjb3JyZWN0LlxuICAgICAgICBjb25zdCBjZW50ZXIgPSBUaWxlSWQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pIDw8IDggfCBzcGF3bi55dCA8PCA0KTtcbiAgICAgICAgZm9yIChsZXQgZHggPSA0OyBkeCA8PSAweGI7IGR4KyspIHtcbiAgICAgICAgICBmb3IgKGxldCBkeSA9IC0zOyBkeSA8PSAzOyBkeSsrKSB7XG4gICAgICAgICAgICBzaG9vdGluZ1N0YXR1ZXMuYWRkKFRpbGVJZC5hZGQoY2VudGVyLCBkeSwgZHgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy9jb25zdCBwYWdlID0gbG9jYXRpb24uc2NyZWVuUGFnZTtcbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5yb20udGlsZXNldHNbbG9jYXRpb24udGlsZXNldF07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSB0aGlzLnJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdO1xuXG4gICAgY29uc3QgZ2V0RWZmZWN0cyA9ICh0aWxlOiBUaWxlSWQpID0+IHtcbiAgICAgIGNvbnN0IHMgPSBsb2NhdGlvbi5zY3JlZW5zWyh0aWxlICYgMHhmMDAwKSA+Pj4gMTJdWyh0aWxlICYgMHhmMDApID4+PiA4XTtcbiAgICAgIHJldHVybiB0aWxlRWZmZWN0cy5lZmZlY3RzW3RoaXMucm9tLnNjcmVlbnNbc10udGlsZXNbdGlsZSAmIDB4ZmZdXTtcbiAgICB9O1xuXG4gICAgLy8gUmV0dXJucyB1bmRlZmluZWQgaWYgaW1wYXNzYWJsZS5cbiAgICBjb25zdCBtYWtlVGVycmFpbiA9IChlZmZlY3RzOiBudW1iZXIsIHRpbGU6IFRpbGVJZCwgYmFycmllcjogYm9vbGVhbikgPT4ge1xuICAgICAgLy8gQ2hlY2sgZm9yIGRvbHBoaW4gb3Igc3dhbXAuICBDdXJyZW50bHkgZG9uJ3Qgc3VwcG9ydCBzaHVmZmxpbmcgdGhlc2UuXG4gICAgICBlZmZlY3RzICY9IFRlcnJhaW4uQklUUztcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHgxYSkgZWZmZWN0cyB8PSBUZXJyYWluLlNXQU1QO1xuICAgICAgaWYgKGxvY2F0aW9uLmlkID09PSAweDYwIHx8IGxvY2F0aW9uLmlkID09PSAweDY4KSB7XG4gICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5ET0xQSElOO1xuICAgICAgfVxuICAgICAgLy8gTk9URTogb25seSB0aGUgdG9wIGhhbGYtc2NyZWVuIGluIHVuZGVyZ3JvdW5kIGNoYW5uZWwgaXMgZG9scGhpbmFibGVcbiAgICAgIGlmIChsb2NhdGlvbi5pZCA9PT0gMHg2NCAmJiAoKHRpbGUgJiAweGYwZjApIDwgMHgxMDMwKSkge1xuICAgICAgICBlZmZlY3RzIHw9IFRlcnJhaW4uRE9MUEhJTjtcbiAgICAgIH1cbiAgICAgIGlmIChiYXJyaWVyKSBlZmZlY3RzIHw9IFRlcnJhaW4uQkFSUklFUjtcbiAgICAgIGlmICghKGVmZmVjdHMgJiBUZXJyYWluLkRPTFBISU4pICYmIGVmZmVjdHMgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgIC8vIERldGVybWluZSBsZW5ndGggb2Ygc2xvcGU6IHNob3J0IHNsb3BlcyBhcmUgY2xpbWJhYmxlLlxuICAgICAgICAvLyA2LTggYXJlIGJvdGggZG9hYmxlIHdpdGggYm9vdHNcbiAgICAgICAgLy8gMC01IGlzIGRvYWJsZSB3aXRoIG5vIGJvb3RzXG4gICAgICAgIC8vIDkgaXMgZG9hYmxlIHdpdGggcmFiYml0IGJvb3RzIG9ubHkgKG5vdCBhd2FyZSBvZiBhbnkgb2YgdGhlc2UuLi4pXG4gICAgICAgIC8vIDEwIGlzIHJpZ2h0IG91dFxuICAgICAgICBsZXQgYm90dG9tID0gdGlsZTtcbiAgICAgICAgbGV0IGhlaWdodCA9IDA7XG4gICAgICAgIHdoaWxlIChnZXRFZmZlY3RzKGJvdHRvbSkgJiBUZXJyYWluLlNMT1BFKSB7XG4gICAgICAgICAgYm90dG9tID0gVGlsZUlkLmFkZChib3R0b20sIDEsIDApO1xuICAgICAgICAgIGhlaWdodCsrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWlnaHQgPCA2KSB7XG4gICAgICAgICAgZWZmZWN0cyAmPSB+VGVycmFpbi5TTE9QRTtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCA5KSB7XG4gICAgICAgICAgZWZmZWN0cyB8PSBUZXJyYWluLlNMT1BFODtcbiAgICAgICAgfSBlbHNlIGlmIChoZWlnaHQgPCAxMCkge1xuICAgICAgICAgIGVmZmVjdHMgfD0gVGVycmFpbi5TTE9QRTk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChlZmZlY3RzICYgVGVycmFpbi5QQUlOKSB7XG4gICAgICAgIC8vIFBhaW4gdGVycmFpbnMgYXJlIG9ubHkgaW1wYXNzaWJsZSBpZiB0aGV5J3JlIGFsbCBzdXJyb3VuZGVkXG4gICAgICAgIC8vIGJ5IG90aGVyIHBhaW4gdGVycmFpbnMuXG4gICAgICAgIHR5cGUgRGVsdGEgPSBbbnVtYmVyLCBudW1iZXJdW107XG4gICAgICAgIGZvciAoY29uc3QgZGVsdGEgb2YgW1swLCAxXSwgWzEsIDBdLCBbMCwgLTFdLCBbLTEsIDBdXSBhcyBEZWx0YSkge1xuICAgICAgICAgIGlmICghKGdldEVmZmVjdHMoVGlsZUlkLmFkZCh0aWxlLCAuLi5kZWx0YSkpICZcbiAgICAgICAgICAgICAgICAoVGVycmFpbi5QQUlOIHwgVGVycmFpbi5GTFkpKSkge1xuICAgICAgICAgICAgZWZmZWN0cyAmPSB+VGVycmFpbi5QQUlOO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKGVmZmVjdHMpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB5ID0gMCwgaGVpZ2h0ID0gbG9jYXRpb24uaGVpZ2h0OyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxvY2F0aW9uLnNjcmVlbnNbeV07XG4gICAgICBjb25zdCByb3dJZCA9IGxvY2F0aW9uLmlkIDw8IDggfCB5IDw8IDQ7XG4gICAgICBmb3IgKGxldCB4ID0gMCwgd2lkdGggPSBsb2NhdGlvbi53aWR0aDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gdGhpcy5yb20uc2NyZWVuc1tyb3dbeF1dO1xuICAgICAgICBjb25zdCBzY3JlZW5JZCA9IFNjcmVlbklkKHJvd0lkIHwgeCk7XG4gICAgICAgIGNvbnN0IGZsYWdZeCA9IHNjcmVlbklkICYgMHhmZjtcbiAgICAgICAgY29uc3Qgd2FsbCA9IHdhbGxzLmdldChzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWcgPVxuICAgICAgICAgICAgaW5Ub3dlciA/IHRoaXMucm9tLmZsYWdzLkFsd2F5c1RydWUuaWQgOlxuICAgICAgICAgICAgd2FsbCAhPSBudWxsID8gdGhpcy53YWxsQ2FwYWJpbGl0eSh3YWxsKSA6XG4gICAgICAgICAgICBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IGZsYWdZeCk/LmZsYWc7XG4gICAgICAgIGNvbnN0IHBpdCA9IGxvY2F0aW9uLnBpdHMuZmluZChwID0+IHAuZnJvbVNjcmVlbiA9PT0gc2NyZWVuSWQpO1xuICAgICAgICBpZiAocGl0KSB7XG4gICAgICAgICAgdGhpcy5leGl0cy5zZXQoVGlsZUlkKHNjcmVlbklkIDw8IDggfCAweDg4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBUaWxlSWQocGl0LnRvU2NyZWVuIDw8IDggfCAweDg4KSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbG9naWM6IExvZ2ljID0gdGhpcy5yb20uZmxhZ3NbZmxhZyFdPy5sb2dpYyA/PyB7fTtcbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWQgPSBUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IHQpO1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBpZiAobG9naWMuYXNzdW1lVHJ1ZSAmJiB0aWxlIDwgMHgyMCkge1xuICAgICAgICAgICAgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZWZmZWN0cyA9IGxvY2F0aW9uLmlzU2hvcCgpID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV07XG4gICAgICAgICAgY29uc3QgYmFycmllciA9IHNob290aW5nU3RhdHVlcy5oYXModGlkKTtcbiAgICAgICAgICBsZXQgdGVycmFpbiA9IG1ha2VUZXJyYWluKGVmZmVjdHMsIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgLy9pZiAoIXRlcnJhaW4pIHRocm93IG5ldyBFcnJvcihgYmFkIHRlcnJhaW4gZm9yIGFsdGVybmF0ZWApO1xuICAgICAgICAgIGlmICh0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT09IHRpbGUgJiZcbiAgICAgICAgICAgICAgZmxhZyAhPSBudWxsICYmICFsb2dpYy5hc3N1bWVUcnVlICYmICFsb2dpYy5hc3N1bWVGYWxzZSkge1xuICAgICAgICAgICAgLy8gTk9URTogYmFycmllcj10cnVlIGlzIHByb2JhYmx5IGFuIGVycm9yIGhlcmU/XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGUgPVxuICAgICAgICAgICAgICAgIG1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpZCwgYmFycmllcik7XG4gICAgICAgICAgICAvL2lmICghYWx0ZXJuYXRlKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCB0ZXJyYWluIGZvciBhbHRlcm5hdGVgKTtcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgLy8gTk9URTogdGhlcmUncyBhbiBvZGRpdHkgZnJvbSBob2xsb3dpbmcgb3V0IHRoZSBiYWNrcyBvZiBpcm9uXG4gICAgICAgICAgICAgIC8vIHdhbGxzIHRoYXQgb25lIGNvcm5lciBvZiBzdG9uZSB3YWxscyBhcmUgYWxzbyBob2xsb3dlZCBvdXQsXG4gICAgICAgICAgICAgIC8vIGJ1dCBvbmx5IHByZS1mbGFnLiAgSXQgZG9lc24ndCBhY3R1YWxseSBodXJ0IGFueXRoaW5nLlxuICAgICAgICAgICAgICB0ZXJyYWluID1cbiAgICAgICAgICAgICAgICAgIHRoaXMudGVycmFpbkZhY3RvcnkuZmxhZyh0ZXJyYWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2ljLnRyYWNrID8gZmxhZyA6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0ZXJyYWluKSB0aGlzLnRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGNvbnN0IHtkZXN0LCBlbnRyYW5jZX0gPSBleGl0O1xuICAgICAgY29uc3QgZnJvbSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgIC8vIFNlYW1sZXNzIGV4aXRzICgweDIwKSBpZ25vcmUgdGhlIGVudHJhbmNlIGluZGV4LCBhbmRcbiAgICAgIC8vIGluc3RlYWQgcHJlc2VydmUgdGhlIFRpbGVJZCwganVzdCBjaGFuZ2luZyB0aGUgbG9jYXRpb24uXG4gICAgICBsZXQgdG86IFRpbGVJZDtcbiAgICAgIGlmIChleGl0LmlzU2VhbWxlc3MoKSkge1xuICAgICAgICB0byA9IFRpbGVJZChmcm9tICYgMHhmZmZmIHwgKGRlc3QgPDwgMTYpKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBleGl0KTtcbiAgICAgICAgdGhpcy5zZWFtbGVzc0V4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0aGlzLnRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgICAgdGhpcy50ZXJyYWlucy5zZXQodGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS5zZWFtbGVzcyhwcmV2aW91cykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0byA9IHRoaXMuZW50cmFuY2UodGhpcy5yb20ubG9jYXRpb25zW2Rlc3RdLCBlbnRyYW5jZSAmIDB4MWYpO1xuICAgICAgfVxuICAgICAgdGhpcy5leGl0cy5zZXQoZnJvbSwgdG8pO1xuICAgICAgaWYgKGRlc3QgPT09IHRoaXMucm9tLmxvY2F0aW9ucy5MaW1lVHJlZUxha2UuaWQgJiZcbiAgICAgICAgICB0aGlzLnJvbS5sb2NhdGlvbnMuTGltZVRyZWVMYWtlLmVudHJhbmNlc1tlbnRyYW5jZV0ueSA+IDB4YTApIHtcbiAgICAgICAgLy8gTm9ydGggZXhpdCB0byBsaW1lIHRyZWUgbGFrZTogbWFyayBsb2NhdGlvbi5cbiAgICAgICAgdGhpcy5saW1lVHJlZUVudHJhbmNlTG9jYXRpb24gPSBsb2NhdGlvbi5pZDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzTG9jYXRpb25TcGF3bnMobG9jYXRpb246IExvY2F0aW9uKSB7XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIGlmIChzcGF3bi5pc1RyaWdnZXIoKSkge1xuICAgICAgICB0aGlzLnByb2Nlc3NUcmlnZ2VyKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkpIHtcbiAgICAgICAgdGhpcy5wcm9jZXNzTnBjKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0Jvc3MobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNDaGVzdCgpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc0NoZXN0KGxvY2F0aW9uLCBzcGF3bik7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIHRoaXMucHJvY2Vzc01vbnN0ZXIobG9jYXRpb24sIHNwYXduKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24udHlwZSA9PT0gMyAmJiBzcGF3bi5pZCA9PT0gMHhlMCkge1xuICAgICAgICAvLyBXaW5kbWlsbCBibGFkZXM6IHRoZSBjYXZlIGZsYWcgKDJlZSkgaXNuJ3Qgc2V0IGRpcmVjdGx5IGJ5IHVzaW5nIHRoZVxuICAgICAgICAvLyBrZXkuICBSYXRoZXIsIHRoZSB3aW5kbWlsbCBibGFkZXMgKGUwLCBhY3Rpb24gNTEgYXQgJDM2NmRiKSBjaGVjayBmb3JcbiAgICAgICAgLy8gMDBhIHRvIHNwYXduIGV4cGxvc2lvbiBhbmQgc2V0IDJlZS5cbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKFxuICAgICAgICAgICAgSGl0Ym94LnNjcmVlbihUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKSxcbiAgICAgICAgICAgIHRoaXMucm9tLmZsYWdzLlVzZWRXaW5kbWlsbEtleS5yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm9jZXNzVHJpZ2dlcihsb2NhdGlvbjogTG9jYXRpb24sIHNwYXduOiBTcGF3bikge1xuICAgIC8vIEZvciB0cmlnZ2Vycywgd2hpY2ggdGlsZXMgZG8gd2UgbWFyaz9cbiAgICAvLyBUaGUgdHJpZ2dlciBoaXRib3ggaXMgMiB0aWxlcyB3aWRlIGFuZCAxIHRpbGUgdGFsbCwgYnV0IGl0IGRvZXMgbm90XG4gICAgLy8gbGluZSB1cCBuaWNlbHkgdG8gdGhlIHRpbGUgZ3JpZC4gIEFsc28sIHRoZSBwbGF5ZXIgaGl0Ym94IGlzIG9ubHlcbiAgICAvLyAkYyB3aWRlICh0aG91Z2ggaXQncyAkMTQgdGFsbCkgc28gdGhlcmUncyBzb21lIHNsaWdodCBkaXNwYXJpdHkuXG4gICAgLy8gSXQgc2VlbXMgbGlrZSBwcm9iYWJseSBtYXJraW5nIGl0IGFzICh4LTEsIHktMSkgLi4gKHgsIHkpIG1ha2VzIHRoZVxuICAgIC8vIG1vc3Qgc2Vuc2UsIHdpdGggdGhlIGNhdmVhdCB0aGF0IHRyaWdnZXJzIHNoaWZ0ZWQgcmlnaHQgYnkgYSBoYWxmXG4gICAgLy8gdGlsZSBzaG91bGQgZ28gZnJvbSB4IC4uIHgrMSBpbnN0ZWFkLlxuXG4gICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNoZWNraW5nIHRyaWdnZXIncyBhY3Rpb246ICQxOSAtPiBwdXNoLWRvd24gbWVzc2FnZVxuXG4gICAgLy8gVE9ETyAtIHB1bGwgb3V0IHRoaXMucmVjb3JkVHJpZ2dlclRlcnJhaW4oKSBhbmQgdGhpcy5yZWNvcmRUcmlnZ2VyQ2hlY2soKVxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLnJvbS50cmlnZ2VyKHNwYXduLmlkKTtcbiAgICBpZiAoIXRyaWdnZXIpIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyB0cmlnZ2VyICR7c3Bhd24uaWQudG9TdHJpbmcoMTYpfWApO1xuXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHModHJpZ2dlci5jb25kaXRpb25zKTtcbiAgICBsZXQgYW50aVJlcXVpcmVtZW50cyA9IHRoaXMuZmlsdGVyQW50aVJlcXVpcmVtZW50cyh0cmlnZ2VyLmNvbmRpdGlvbnMpO1xuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgbGV0IGhpdGJveCA9IEhpdGJveC50cmlnZ2VyKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgdHJpZ2dlci5mbGFncykge1xuICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgIGlmIChmPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjaGVja3MucHVzaChmLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoZWNrcy5sZW5ndGgpIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXF1aXJlbWVudHMsIGNoZWNrcyk7XG5cbiAgICBzd2l0Y2ggKHRyaWdnZXIubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgxOTpcbiAgICAgICAgLy8gcHVzaC1kb3duIHRyaWdnZXJcbiAgICAgICAgaWYgKHRyaWdnZXIuaWQgPT09IDB4ODYgJiYgIXRoaXMuZmxhZ3NldC5hc3N1bWVSYWJiaXRTa2lwKCkpIHtcbiAgICAgICAgICAvLyBiaWdnZXIgaGl0Ym94IHRvIG5vdCBmaW5kIHRoZSBwYXRoIHRocm91Z2hcbiAgICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIC0xXSwgWzAsIDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICh0cmlnZ2VyLmlkID09PSAweGJhICYmXG4gICAgICAgICAgICAgICAgICAgIXRoaXMuZmxhZ3NldC5hc3N1bWVUZWxlcG9ydFNraXAoKSAmJlxuICAgICAgICAgICAgICAgICAgICF0aGlzLmZsYWdzZXQuZGlzYWJsZVRlbGVwb3J0U2tpcCgpKSB7XG4gICAgICAgICAgLy8gY29weSB0aGUgdGVsZXBvcnQgaGl0Ym94IGludG8gdGhlIG90aGVyIHNpZGUgb2YgY29yZGVsXG4gICAgICAgICAgaGl0Ym94ID0gSGl0Ym94LmF0TG9jYXRpb24oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucm9tLmxvY2F0aW9ucy5Db3JkZWxQbGFpbkVhc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20ubG9jYXRpb25zLkNvcmRlbFBsYWluV2VzdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVUcmlnZ2VyR2xpdGNoKCkpIHtcbiAgICAgICAgICAvLyBhbGwgcHVzaC1kb3duIHRyaWdnZXJzIGNhbiBiZSBza2lwcGVkIHdpdGggdHJpZ2dlciBza2lwLi4uXG4gICAgICAgICAgYW50aVJlcXVpcmVtZW50cyA9IFJlcXVpcmVtZW50Lm9yKGFudGlSZXF1aXJlbWVudHMsIHRoaXMucm9tLmZsYWdzLlRyaWdnZXJTa2lwLnIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIHRoaXMudGVycmFpbkZhY3Rvcnkuc3RhdHVlKGFudGlSZXF1aXJlbWVudHMpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxZDpcbiAgICAgICAgLy8gc3RhcnQgbWFkbyAxIGJvc3MgZmlnaHRcbiAgICAgICAgdGhpcy5hZGRCb3NzQ2hlY2soaGl0Ym94LCB0aGlzLnJvbS5ib3NzZXMuTWFkbzEsIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MDg6IGNhc2UgMHgwYjogY2FzZSAweDBjOiBjYXNlIDB4MGQ6IGNhc2UgMHgwZjpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIHRyaWdnZXIgSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxdWlyZW1lbnRzLCB0cmlnZ2VyLmlkKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxODogeyAvLyBzdG9tIGZpZ2h0XG4gICAgICAgIC8vIFNwZWNpYWwgY2FzZTogd2FycCBib290cyBnbGl0Y2ggcmVxdWlyZWQgaWYgY2hhcmdlIHNob3RzIG9ubHkuXG4gICAgICAgIGNvbnN0IHJlcSA9XG4gICAgICAgICAgdGhpcy5mbGFnc2V0LmNoYXJnZVNob3RzT25seSgpID9cbiAgICAgICAgICBSZXF1aXJlbWVudC5tZWV0KHJlcXVpcmVtZW50cywgYW5kKHRoaXMucm9tLmZsYWdzLldhcnBCb290cykpIDpcbiAgICAgICAgICByZXF1aXJlbWVudHM7XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLCB0aGlzLnJvbS5mbGFncy5TdG9tRmlnaHRSZXdhcmQuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtsb3NzeTogdHJ1ZSwgdW5pcXVlOiB0cnVlfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIDB4MWU6XG4gICAgICAgIC8vIGZvcmdlIGNyeXN0YWxpc1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcXVpcmVtZW50cywgdGhpcy5yb20uZmxhZ3MuTWVzaWFJblRvd2VyLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDFmOlxuICAgICAgICB0aGlzLmhhbmRsZUJvYXQodGlsZSwgbG9jYXRpb24sIHJlcXVpcmVtZW50cyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWI6XG4gICAgICAgIC8vIE1vdmluZyBndWFyZFxuICAgICAgICAvLyB0cmVhdCB0aGlzIGFzIGEgc3RhdHVlPyAgYnV0IHRoZSBjb25kaXRpb25zIGFyZSBub3Qgc3VwZXIgdXNlZnVsLi4uXG4gICAgICAgIC8vICAgLSBvbmx5IHRyYWNrZWQgY29uZGl0aW9ucyBtYXR0ZXI/IDllID09IHBhcmFseXNpcy4uLiBleGNlcHQgbm90LlxuICAgICAgICAvLyBwYXJhbHl6YWJsZT8gIGNoZWNrIERhdGFUYWJsZV8zNTA0NVxuICAgICAgICBpZiAobG9jYXRpb24gPT09IHRoaXMucm9tLmxvY2F0aW9ucy5Qb3J0b2FfUGFsYWNlRW50cmFuY2UpIHtcbiAgICAgICAgICAvLyBQb3J0b2EgcGFsYWNlIGZyb250IGd1YXJkIG5vcm1hbGx5IGJsb2NrcyBvbiBNZXNpYSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gQnV0IHRoZSBxdWVlbiBpcyBhY3R1YWxseSBhY2Nlc3NpYmxlIHdpdGhvdXQgc2VlaW5nIHRoZSByZWNvcmRpbmcuXG4gICAgICAgICAgLy8gSW5zdGVhZCwgYmxvY2sgYWNjZXNzIHRvIHRoZSB0aHJvbmUgcm9vbSBvbiBiZWluZyBhYmxlIHRvIHRhbGsgdG9cbiAgICAgICAgICAvLyB0aGUgZm9ydHVuZSB0ZWxsZXIsIGluIGNhc2UgdGhlIGd1YXJkIG1vdmVzIGJlZm9yZSB3ZSBjYW4gZ2V0IHRoZVxuICAgICAgICAgIC8vIGl0ZW0uICBBbHNvIG1vdmUgdGhlIGhpdGJveCB1cCBzaW5jZSB0aGUgdHdvIHNpZGUgcm9vbXMgX2FyZV8gc3RpbGxcbiAgICAgICAgICAvLyBhY2Nlc3NpYmxlLlxuICAgICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbLTIsIDBdKTtcbiAgICAgICAgICBhbnRpUmVxdWlyZW1lbnRzID0gdGhpcy5yb20uZmxhZ3MuVGFsa2VkVG9Gb3J0dW5lVGVsbGVyLnI7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm90ZTogYW50aVJlcXVpcmVtZW50cyBtdXN0IGJlIG1ldCBpbiBvcmRlciB0byBnZXQgdGhyb3VnaCwgc2luY2Ugd2VcbiAgICAgICAgLy8gbmVlZCB0aGUgZ3VhcmQgX25vdF8gdG8gbW92ZS5cbiAgICAgICAgdGhpcy5oYW5kbGVNb3ZpbmdHdWFyZChoaXRib3gsIGxvY2F0aW9uLCBhbnRpUmVxdWlyZW1lbnRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXF1aXJlbWVudC5PUEVOLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIHByb2Nlc3NOcGMobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICBjb25zdCBucGMgPSB0aGlzLnJvbS5ucGNzW3NwYXduLmlkXTtcbiAgICBpZiAoIW5wYyB8fCAhbnBjLnVzZWQpIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBucGM6ICR7aGV4KHNwYXduLmlkKX1gKTtcbiAgICBjb25zdCBzcGF3bkNvbmRpdGlvbnMgPSBucGMuc3Bhd25Db25kaXRpb25zLmdldChsb2NhdGlvbi5pZCkgfHwgW107XG4gICAgY29uc3QgcmVxID0gdGhpcy5maWx0ZXJSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTsgLy8gc2hvdWxkIGJlIHNpbmdsZVxuXG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG5cbiAgICAvLyBOT1RFOiBSYWdlIGhhcyBubyB3YWxrYWJsZSBuZWlnaGJvcnMsIGFuZCB3ZSBuZWVkIHRoZSBzYW1lIGhpdGJveFxuICAgIC8vIGZvciBib3RoIHRoZSB0ZXJyYWluIGFuZCB0aGUgY2hlY2suXG4gICAgLy9cbiAgICAvLyBOT1RFIEFMU08gLSBSYWdlIHByb2JhYmx5IHNob3dzIHVwIGFzIGEgYm9zcywgbm90IGFuIE5QQz9cbiAgICBsZXQgaGl0Ym94OiBIaXRib3ggPVxuICAgICAgICBbdGhpcy50ZXJyYWlucy5oYXModGlsZSkgPyB0aWxlIDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpID8/IHRpbGVdO1xuXG4gICAgZm9yIChjb25zdCBbaXRlbSwgdXNlXSBvZiB0aGlzLml0ZW1Vc2VzLmdldChzcGF3bi50eXBlIDw8IDggfCBzcGF3bi5pZCkpIHtcbiAgICAgIHRoaXMucHJvY2Vzc0l0ZW1Vc2UoaGl0Ym94LCByZXEsIGl0ZW0sIHVzZSk7XG4gICAgfVxuXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5TYWJlcmFEaXNndWlzZWRBc01lc2lhKSB7XG4gICAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIHRoaXMucm9tLmJvc3Nlcy5TYWJlcmExLCByZXEpO1xuICAgIH1cblxuICAgIGlmICgobnBjLmRhdGFbMl0gJiAweDA0KSAmJiAhdGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSB7XG4gICAgICBsZXQgYW50aVJlcTtcbiAgICAgIGFudGlSZXEgPSB0aGlzLmZpbHRlckFudGlSZXF1aXJlbWVudHMoc3Bhd25Db25kaXRpb25zKTtcbiAgICAgIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUmFnZSkge1xuICAgICAgICAvLyBUT0RPIC0gbW92ZSBoaXRib3ggZG93biwgY2hhbmdlIHJlcXVpcmVtZW50P1xuICAgICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzIsIC0xXSwgWzIsIDBdLCBbMiwgMV0sIFsyLCAyXSk7XG4gICAgICAgIGhpdGJveCA9IEhpdGJveC5hZGp1c3QoaGl0Ym94LCBbMCwgLTZdLCBbMCwgLTJdLCBbMCwgMl0sIFswLCA2XSk7XG4gICAgICAgIC8vIFRPRE8gLSBjaGVjayBpZiB0aGlzIHdvcmtzPyAgdGhlIH5jaGVjayBzcGF3biBjb25kaXRpb24gc2hvdWxkXG4gICAgICAgIC8vIGFsbG93IHBhc3NpbmcgaWYgZ290dGVuIHRoZSBjaGVjaywgd2hpY2ggaXMgdGhlIHNhbWUgYXMgZ290dGVuXG4gICAgICAgIC8vIHRoZSBjb3JyZWN0IHN3b3JkLlxuICAgICAgICAvLyBUT0RPIC0gaXMgdGhpcyBldmVuIHJlcXVpcmVkIG9uY2Ugd2UgaGF2ZSB0aGUgUmFnZVRlcnJhaW4/Pz9cbiAgICAgICAgLy8gaWYgKHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSBhbnRpUmVxID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIGlmIChucGMgPT09IHRoaXMucm9tLm5wY3MuUG9ydG9hVGhyb25lUm9vbUJhY2tEb29yR3VhcmQpIHtcbiAgICAgICAgLy8gUG9ydG9hIGJhY2sgZG9vciBndWFyZCBzcGF3bnMgaWYgKDEpIHRoZSBtZXNpYSByZWNvcmRpbmcgaGFzIG5vdCB5ZXRcbiAgICAgICAgLy8gYmVlbiBwbGF5ZWQsIGFuZCAoMikgdGhlIHBsYXllciBkaWRuJ3Qgc25lYWsgcGFzdCB0aGUgZWFybGllciBndWFyZC5cbiAgICAgICAgLy8gV2UgY2FuIHNpbXVsYXRlIHRoaXMgYnkgaGFyZC1jb2RpbmcgYSByZXF1aXJlbWVudCBvbiBlaXRoZXIgdG8gZ2V0XG4gICAgICAgIC8vIHBhc3QgaGltLlxuICAgICAgICBhbnRpUmVxID0gUmVxdWlyZW1lbnQub3IodGhpcy5yb20uZmxhZ3MuTWVzaWFSZWNvcmRpbmcucixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZCh0aGlzLnJvbS5mbGFncy5QYXJhbHlzaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yb20uZmxhZ3MuUXVlZW5Ob3RJblRocm9uZVJvb20pKTtcbiAgICAgIH0gZWxzZSBpZiAobnBjID09PSB0aGlzLnJvbS5ucGNzLlNvbGRpZXJHdWFyZCkge1xuICAgICAgICBhbnRpUmVxID0gdW5kZWZpbmVkOyAvLyB0aGV5J2xsIGp1c3QgYXR0YWNrIGlmIGFwcHJvYWNoZWQuXG4gICAgICB9XG4gICAgICAvLyBpZiBzcGF3biBpcyBhbHdheXMgZmFsc2UgdGhlbiByZXEgbmVlZHMgdG8gYmUgb3Blbj9cbiAgICAgIGlmIChhbnRpUmVxKSB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LCB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShhbnRpUmVxKSk7XG4gICAgfVxuXG4gICAgLy8gRm9ydHVuZSB0ZWxsZXIgY2FuIGJlIHRhbGtlZCB0byBhY3Jvc3MgdGhlIGRlc2suXG4gICAgaWYgKG5wYyA9PT0gdGhpcy5yb20ubnBjcy5Gb3J0dW5lVGVsbGVyKSB7XG4gICAgICBoaXRib3ggPSBIaXRib3guYWRqdXN0KGhpdGJveCwgWzAsIDBdLCBbMiwgMF0pO1xuICAgIH1cblxuICAgIC8vIHJlcSBpcyBub3cgbXV0YWJsZVxuICAgIGlmIChSZXF1aXJlbWVudC5pc0Nsb3NlZChyZXEpKSByZXR1cm47IC8vIG5vdGhpbmcgdG8gZG8gaWYgaXQgbmV2ZXIgc3Bhd25zLlxuICAgIGNvbnN0IFtbLi4uY29uZHNdXSA9IHJlcTtcblxuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgZ2xvYmFsIGRpYWxvZ3MgLSBkbyBub3RoaW5nIGlmIHdlIGNhbid0IHBhc3MgdGhlbS5cbiAgICBmb3IgKGNvbnN0IGQgb2YgbnBjLmdsb2JhbERpYWxvZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcofmQuY29uZGl0aW9uKTtcbiAgICAgIGNvbnN0IGZjID0gdGhpcy5mbGFnKGQuY29uZGl0aW9uKTtcbiAgICAgIGlmIChmPy5sb2dpYy5hc3N1bWVGYWxzZSB8fCBmYz8ubG9naWMuYXNzdW1lVHJ1ZSkgcmV0dXJuO1xuICAgICAgaWYgKGY/LmxvZ2ljLnRyYWNrKSBjb25kcy5wdXNoKGYuaWQgYXMgQ29uZGl0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIGFwcHJvcHJpYXRlIGxvY2FsIGRpYWxvZ3NcbiAgICBjb25zdCBsb2NhbHMgPVxuICAgICAgICBucGMubG9jYWxEaWFsb2dzLmdldChsb2NhdGlvbi5pZCkgPz8gbnBjLmxvY2FsRGlhbG9ncy5nZXQoLTEpID8/IFtdO1xuICAgIGZvciAoY29uc3QgZCBvZiBsb2NhbHMpIHtcbiAgICAgIC8vIENvbXB1dGUgdGhlIGNvbmRpdGlvbiAncicgZm9yIHRoaXMgbWVzc2FnZS5cbiAgICAgIGNvbnN0IHIgPSBbLi4uY29uZHNdO1xuICAgICAgY29uc3QgZjAgPSB0aGlzLmZsYWcoZC5jb25kaXRpb24pO1xuICAgICAgY29uc3QgZjEgPSB0aGlzLmZsYWcofmQuY29uZGl0aW9uKTtcbiAgICAgIGlmIChmMD8ubG9naWMudHJhY2spIHIucHVzaChmMC5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgaWYgKCFmMD8ubG9naWMuYXNzdW1lRmFsc2UgJiYgIWYxPy5sb2dpYy5hc3N1bWVUcnVlKSB7XG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0aGlzIGRpYWxvZyBpZiBpdCdzIHBvc3NpYmxlIHRvIHBhc3MgdGhlIGNvbmRpdGlvbi5cbiAgICAgICAgdGhpcy5wcm9jZXNzRGlhbG9nKGhpdGJveCwgbnBjLCByLCBkKTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGlmIHdlIGNhbiBuZXZlciBhY3R1YWxseSBnZXQgcGFzdCB0aGlzIGRpYWxvZy5cbiAgICAgIGlmIChmMD8ubG9naWMuYXNzdW1lVHJ1ZSB8fCBmMT8ubG9naWMuYXNzdW1lRmFsc2UpIGJyZWFrO1xuICAgICAgLy8gQWRkIGFueSBuZXcgY29uZGl0aW9ucyB0byAnY29uZHMnIHRvIGdldCBiZXlvbmQgdGhpcyBtZXNzYWdlLlxuICAgICAgaWYgKGYxPy5sb2dpYy50cmFjaykge1xuICAgICAgICBjb25kcy5wdXNoKGYxLmlkIGFzIENvbmRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvY2Vzc0RpYWxvZyhoaXRib3g6IEhpdGJveCwgbnBjOiBOcGMsXG4gICAgICAgICAgICAgICAgcmVxOiByZWFkb25seSBDb25kaXRpb25bXSwgZGlhbG9nOiBMb2NhbERpYWxvZykge1xuICAgIHRoaXMuYWRkQ2hlY2tGcm9tRmxhZ3MoaGl0Ym94LCBbcmVxXSwgZGlhbG9nLmZsYWdzKTtcblxuICAgIGNvbnN0IGluZm8gPSB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX07XG4gICAgc3dpdGNoIChkaWFsb2cubWVzc2FnZS5hY3Rpb24pIHtcbiAgICAgIGNhc2UgMHgwODogLy8gb3BlbiBzd2FuIGdhdGVcbiAgICAgICAgdGhpcy5wcm9jZXNzS2V5VXNlKGhpdGJveCwgW3JlcV0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgLy8gY2FzZSAweDBjOiAvLyBkd2FyZiBjaGlsZCBzdGFydHMgZm9sbG93aW5nXG4gICAgICAvLyAgIGJyZWFrO1xuXG4gICAgICAvLyBjYXNlIDB4MGQ6IC8vIG5wYyB3YWxrcyBhd2F5XG4gICAgICAvLyAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTQ6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIHRoaXMucm9tLmZsYWdzLlNsaW1lZEtlbnN1LmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxMDpcbiAgICAgICAgdGhpcy5hZGRJdGVtQ2hlY2soXG4gICAgICAgICAgICBoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5Bc2luYUluQmFja1Jvb20uaWQsIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDExOlxuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCAweDEwMCB8IG5wYy5kYXRhWzFdLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgwMzpcbiAgICAgIGNhc2UgMHgwYTogLy8gbm9ybWFsbHkgdGhpcyBoYXJkLWNvZGVzIGdsb3dpbmcgbGFtcCwgYnV0IHdlIGV4dGVuZGVkIGl0XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgbnBjLmRhdGFbMF0sIGluZm8pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAweDA5OlxuICAgICAgICAvLyBJZiB6ZWJ1IHN0dWRlbnQgaGFzIGFuIGl0ZW0uLi4/ICBUT0RPIC0gc3RvcmUgZmYgaWYgdW51c2VkXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBucGMuZGF0YVsxXTtcbiAgICAgICAgaWYgKGl0ZW0gIT09IDB4ZmYpIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgW3JlcV0sIDB4MTAwIHwgaXRlbSwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MTk6XG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKFxuICAgICAgICAgICAgaGl0Ym94LCBbcmVxXSwgdGhpcy5yb20uZmxhZ3MuQWthaGFuYUZsdXRlT2ZMaW1lVHJhZGVpbi5pZCwgaW5mbyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIDB4MWE6XG4gICAgICAgIC8vIFRPRE8gLSBjYW4gd2UgcmVhY2ggdGhpcyBzcG90PyAgbWF5IG5lZWQgdG8gbW92ZSBkb3duP1xuICAgICAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIFtyZXFdLCB0aGlzLnJvbS5mbGFncy5SYWdlLmlkLCBpbmZvKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgMHgxYjpcbiAgICAgICAgLy8gUmFnZSB0aHJvd2luZyBwbGF5ZXIgb3V0Li4uXG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIGFjdHVhbGx5IGFscmVhZHkgYmUgaGFuZGxlZCBieSB0aGUgc3RhdHVlIGNvZGUgYWJvdmU/XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIFRPRE8gLSBhZGQgZXh0cmEgZGlhbG9ncyBmb3IgaXRlbXVzZSB0cmFkZXMsIGV4dHJhIHRyaWdnZXJzXG4gICAgLy8gICAgICAtIGlmIGl0ZW0gdHJhZGVkIGJ1dCBubyByZXdhcmQsIHRoZW4gcmUtZ2l2ZSByZXdhcmQuLi5cbiAgfVxuXG4gIHByb2Nlc3NMb2NhdGlvbkl0ZW1Vc2VzKGxvY2F0aW9uOiBMb2NhdGlvbikge1xuICAgIGZvciAoY29uc3QgW2l0ZW0sIHVzZV0gb2YgdGhpcy5pdGVtVXNlcy5nZXQofmxvY2F0aW9uLmlkKSkge1xuICAgICAgdGhpcy5wcm9jZXNzSXRlbVVzZShbdGhpcy5lbnRyYW5jZShsb2NhdGlvbildLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXF1aXJlbWVudC5PUEVOLCBpdGVtLCB1c2UpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZU1vdmluZ0d1YXJkKGhpdGJveDogSGl0Ym94LCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcTogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBUaGlzIGlzIHRoZSAxYiB0cmlnZ2VyIGFjdGlvbiBmb2xsb3ctdXAuICBJdCBsb29rcyBmb3IgYW4gTlBDIGluIDBkIG9yIDBlXG4gICAgLy8gYW5kIG1vdmVzIHRoZW0gb3ZlciBhIHBpeGVsLiAgRm9yIHRoZSBsb2dpYywgaXQncyBhbHdheXMgaW4gYSBwb3NpdGlvblxuICAgIC8vIHdoZXJlIGp1c3QgbWFraW5nIHRoZSB0cmlnZ2VyIHNxdWFyZSBiZSBhIG5vLWV4aXQgc3F1YXJlIGlzIHN1ZmZpY2llbnQsXG4gICAgLy8gYnV0IHdlIG5lZWQgdG8gZ2V0IHRoZSBjb25kaXRpb25zIHJpZ2h0LiAgV2UgcGFzcyBpbiB0aGUgcmVxdWlyZW1lbnRzIHRvXG4gICAgLy8gTk9UIHRyaWdnZXIgdGhlIHRyaWdnZXIsIGFuZCB0aGVuIHdlIGpvaW4gaW4gcGFyYWx5c2lzIGFuZC9vciBzdGF0dWVcbiAgICAvLyBnbGl0Y2ggaWYgYXBwcm9wcmlhdGUuICBUaGVyZSBjb3VsZCB0aGVvcmV0aWNhbGx5IGJlIGNhc2VzIHdoZXJlIHRoZVxuICAgIC8vIGd1YXJkIGlzIHBhcmFseXphYmxlIGJ1dCB0aGUgZ2VvbWV0cnkgcHJldmVudHMgdGhlIHBsYXllciBmcm9tIGFjdHVhbGx5XG4gICAgLy8gaGl0dGluZyB0aGVtIGJlZm9yZSB0aGV5IG1vdmUsIGJ1dCBpdCBkb2Vzbid0IGhhcHBlbiBpbiBwcmFjdGljZS5cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVN0YXR1ZUdsaXRjaCgpKSByZXR1cm47XG4gICAgY29uc3QgZXh0cmE6IENvbmRpdGlvbltdW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducy5zbGljZSgwLCAyKSkge1xuICAgICAgaWYgKHNwYXduLmlzTnBjKCkgJiYgdGhpcy5yb20ubnBjc1tzcGF3bi5pZF0uaXNQYXJhbHl6YWJsZSgpKSB7XG4gICAgICAgIGV4dHJhLnB1c2goW3RoaXMucm9tLmZsYWdzLlBhcmFseXNpcy5jXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGhpcy5mbGFnc2V0LmFzc3VtZVRyaWdnZXJHbGl0Y2goKSkge1xuICAgICAgZXh0cmEucHVzaChbdGhpcy5yb20uZmxhZ3MuVHJpZ2dlclNraXAuY10pO1xuICAgIH1cbiAgICB0aGlzLmFkZFRlcnJhaW4oaGl0Ym94LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRlcnJhaW5GYWN0b3J5LnN0YXR1ZShbLi4ucmVxLCAuLi5leHRyYV0ubWFwKHNwcmVhZCkpKTtcblxuXG4gICAgLy8gVE9ETyAtIFBvcnRvYSBndWFyZHMgYXJlIGJyb2tlbiA6LShcbiAgICAvLyBUaGUgYmFjayBndWFyZCBuZWVkcyB0byBibG9jayBvbiB0aGUgZnJvbnQgZ3VhcmQncyBjb25kaXRpb25zLFxuICAgIC8vIHdoaWxlIHRoZSBmcm9udCBndWFyZCBzaG91bGQgYmxvY2sgb24gZm9ydHVuZSB0ZWxsZXI/XG5cbiAgfVxuXG4gIGhhbmRsZUJvYXQodGlsZTogVGlsZUlkLCBsb2NhdGlvbjogTG9jYXRpb24sIHJlcXVpcmVtZW50czogUmVxdWlyZW1lbnQpIHtcbiAgICAvLyBib2FyZCBib2F0IC0gdGhpcyBhbW91bnRzIHRvIGFkZGluZyBhIHJvdXRlIGVkZ2UgZnJvbSB0aGUgdGlsZVxuICAgIC8vIHRvIHRoZSBsZWZ0LCB0aHJvdWdoIGFuIGV4aXQsIGFuZCB0aGVuIGNvbnRpbnVpbmcgdW50aWwgZmluZGluZyBsYW5kLlxuICAgIGNvbnN0IHQwID0gdGhpcy53YWxrYWJsZU5laWdoYm9yKHRpbGUpO1xuICAgIGlmICh0MCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHdhbGthYmxlIG5laWdoYm9yLmApO1xuICAgIGNvbnN0IHl0ID0gKHRpbGUgPj4gOCkgJiAweGYwIHwgKHRpbGUgPj4gNCkgJiAweGY7XG4gICAgY29uc3QgeHQgPSAodGlsZSA+PiA0KSAmIDB4ZjAgfCB0aWxlICYgMHhmO1xuICAgIGxldCBib2F0RXhpdDtcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0Lnl0ID09PSB5dCAmJiBleGl0Lnh0IDwgeHQpIGJvYXRFeGl0ID0gZXhpdDtcbiAgICB9XG4gICAgaWYgKCFib2F0RXhpdCkgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCBib2F0IGV4aXRgKTtcbiAgICAvLyBUT0RPIC0gbG9vayB1cCB0aGUgZW50cmFuY2UuXG4gICAgY29uc3QgZGVzdCA9IHRoaXMucm9tLmxvY2F0aW9uc1tib2F0RXhpdC5kZXN0XTtcbiAgICBpZiAoIWRlc3QpIHRocm93IG5ldyBFcnJvcihgQmFkIGRlc3RpbmF0aW9uYCk7XG4gICAgY29uc3QgZW50cmFuY2UgPSBkZXN0LmVudHJhbmNlc1tib2F0RXhpdC5lbnRyYW5jZV07XG4gICAgY29uc3QgZW50cmFuY2VUaWxlID0gVGlsZUlkLmZyb20oZGVzdCwgZW50cmFuY2UpO1xuICAgIGxldCB0ID0gZW50cmFuY2VUaWxlO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB0ID0gVGlsZUlkLmFkZCh0LCAwLCAtMSk7XG4gICAgICBjb25zdCB0MSA9IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KTtcbiAgICAgIGlmICh0MSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJvYXQ6IFRlcnJhaW4gPSB7XG4gICAgICAgICAgZW50ZXI6IFJlcXVpcmVtZW50LmZyZWV6ZShyZXF1aXJlbWVudHMpLFxuICAgICAgICAgIGV4aXQ6IFtbMHhmLCBSZXF1aXJlbWVudC5PUEVOXV0sXG4gICAgICAgIH07XG4gICAgICAgIC8vIEFkZCBhIHRlcnJhaW4gYW5kIGV4aXQgcGFpciBmb3IgdGhlIGJvYXQgdHJpZ2dlci5cbiAgICAgICAgdGhpcy5hZGRUZXJyYWluKFt0MF0sIGJvYXQpO1xuICAgICAgICB0aGlzLmV4aXRzLnNldCh0MCwgdDEpO1xuICAgICAgICB0aGlzLmV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKHQwLCB0MSkpO1xuICAgICAgICAvLyBBZGQgYSB0ZXJyYWluIGFuZCBleGl0IHBhaXIgZm9yIHRoZSBlbnRyYW5jZSB3ZSBwYXNzZWRcbiAgICAgICAgLy8gKHRoaXMgaXMgcHJpbWFyaWx5IG5lY2Vzc2FyeSBmb3Igd2lsZCB3YXJwIHRvIHdvcmsgaW4gbG9naWMpLlxuICAgICAgICB0aGlzLmV4aXRzLnNldChlbnRyYW5jZVRpbGUsIHQxKTtcbiAgICAgICAgdGhpcy5leGl0U2V0LmFkZChUaWxlUGFpci5vZihlbnRyYW5jZVRpbGUsIHQxKSk7XG4gICAgICAgIHRoaXMudGVycmFpbnMuc2V0KGVudHJhbmNlVGlsZSwgdGhpcy50ZXJyYWluRmFjdG9yeS50aWxlKDApISk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhZGRJdGVtR3JhbnRDaGVja3MoaGl0Ym94OiBIaXRib3gsIHJlcTogUmVxdWlyZW1lbnQsIGdyYW50SWQ6IG51bWJlcikge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1HcmFudChncmFudElkKTtcbiAgICBjb25zdCBzbG90ID0gMHgxMDAgfCBpdGVtO1xuICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBpdGVtIGdyYW50IGZvciAke2dyYW50SWQudG9TdHJpbmcoMTYpfWApO1xuICAgIH1cbiAgICAvLyBpcyB0aGUgMTAwIGZsYWcgc3VmZmljaWVudCBoZXJlPyAgcHJvYmFibHk/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSBncmFudElkID49IDB4ODA7IC8vIGdyYW50ZWQgZnJvbSBhIHRyaWdnZXJcbiAgICB0aGlzLmFkZEl0ZW1DaGVjayhoaXRib3gsIHJlcSwgc2xvdCxcbiAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZSwgcHJldmVudExvc3N9KTtcbiAgfVxuXG4gIGFkZFRlcnJhaW4oaGl0Ym94OiBIaXRib3gsIHRlcnJhaW46IFRlcnJhaW4pIHtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy50ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICBpZiAodCA9PSBudWxsKSBjb250aW51ZTsgLy8gdW5yZWFjaGFibGUgdGlsZXMgZG9uJ3QgbmVlZCBleHRyYSByZXFzXG4gICAgICB0aGlzLnRlcnJhaW5zLnNldCh0aWxlLCB0aGlzLnRlcnJhaW5GYWN0b3J5Lm1lZXQodCwgdGVycmFpbikpO1xuICAgIH1cbiAgfVxuXG4gIGFkZENoZWNrKGhpdGJveDogSGl0Ym94LCByZXF1aXJlbWVudDogUmVxdWlyZW1lbnQsIGNoZWNrczogbnVtYmVyW10pIHtcbiAgICBpZiAoUmVxdWlyZW1lbnQuaXNDbG9zZWQocmVxdWlyZW1lbnQpKSByZXR1cm47IC8vIGRvIG5vdGhpbmcgaWYgdW5yZWFjaGFibGVcbiAgICBjb25zdCBjaGVjayA9IHtyZXF1aXJlbWVudDogUmVxdWlyZW1lbnQuZnJlZXplKHJlcXVpcmVtZW50KSwgY2hlY2tzfTtcbiAgICBmb3IgKGNvbnN0IHRpbGUgb2YgaGl0Ym94KSB7XG4gICAgICBpZiAoIXRoaXMudGVycmFpbnMuaGFzKHRpbGUpKSBjb250aW51ZTtcbiAgICAgIHRoaXMuY2hlY2tzLmdldCh0aWxlKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgfVxuXG4gIGFkZEl0ZW1DaGVjayhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LFxuICAgICAgICAgICAgICAgY2hlY2s6IG51bWJlciwgc2xvdDogU2xvdEluZm8pIHtcbiAgICB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIFtjaGVja10pO1xuICAgIHRoaXMuc2xvdHMuc2V0KGNoZWNrLCBzbG90KTtcbiAgICAvLyBhbHNvIGFkZCBjb3JyZXNwb25kaW5nIEl0ZW1JbmZvIHRvIGtlZXAgdGhlbSBpbiBwYXJpdHkuXG4gICAgY29uc3QgaXRlbWdldCA9IHRoaXMucm9tLml0ZW1HZXRzW3RoaXMucm9tLnNsb3RzW2NoZWNrICYgMHhmZl1dO1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLnJvbS5pdGVtc1tpdGVtZ2V0Lml0ZW1JZF07XG4gICAgY29uc3QgdW5pcXVlID0gaXRlbT8udW5pcXVlO1xuICAgIGNvbnN0IGxvc2FibGUgPSBpdGVtZ2V0LmlzTG9zYWJsZSgpO1xuICAgIC8vIFRPRE8gLSByZWZhY3RvciB0byBqdXN0IFwiY2FuJ3QgYmUgYm91Z2h0XCI/XG4gICAgY29uc3QgcHJldmVudExvc3MgPSB1bmlxdWUgfHwgaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuT3BlbFN0YXR1ZTtcbiAgICBsZXQgd2VpZ2h0ID0gMTtcbiAgICBpZiAoaXRlbSA9PT0gdGhpcy5yb20uaXRlbXMuU3dvcmRPZldpbmQpIHdlaWdodCA9IDU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLlN3b3JkT2ZGaXJlKSB3ZWlnaHQgPSA1O1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mV2F0ZXIpIHdlaWdodCA9IDEwO1xuICAgIGlmIChpdGVtID09PSB0aGlzLnJvbS5pdGVtcy5Td29yZE9mVGh1bmRlcikgd2VpZ2h0ID0gMTU7XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLkZsaWdodCkgd2VpZ2h0ID0gMTU7XG4gICAgdGhpcy5pdGVtcy5zZXQoMHgyMDAgfCBpdGVtZ2V0LmlkLCB7dW5pcXVlLCBsb3NhYmxlLCBwcmV2ZW50TG9zcywgd2VpZ2h0fSk7XG4gIH1cblxuICBhZGRDaGVja0Zyb21GbGFncyhoaXRib3g6IEhpdGJveCwgcmVxdWlyZW1lbnQ6IFJlcXVpcmVtZW50LCBmbGFnczogbnVtYmVyW10pIHtcbiAgICBjb25zdCBjaGVja3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmZsYWcoZmxhZyk7XG4gICAgICBpZiAoZj8ubG9naWMudHJhY2spIHtcbiAgICAgICAgY2hlY2tzLnB1c2goZi5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGVja3MubGVuZ3RoKSB0aGlzLmFkZENoZWNrKGhpdGJveCwgcmVxdWlyZW1lbnQsIGNoZWNrcyk7XG4gIH1cblxuICB3YWxrYWJsZU5laWdoYm9yKHQ6IFRpbGVJZCk6IFRpbGVJZHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodCkpIHJldHVybiB0O1xuICAgIGZvciAobGV0IGQgb2YgWy0xLCAxXSkge1xuICAgICAgY29uc3QgdDEgPSBUaWxlSWQuYWRkKHQsIGQsIDApO1xuICAgICAgY29uc3QgdDIgPSBUaWxlSWQuYWRkKHQsIDAsIGQpO1xuICAgICAgaWYgKHRoaXMuaXNXYWxrYWJsZSh0MSkpIHJldHVybiB0MTtcbiAgICAgIGlmICh0aGlzLmlzV2Fsa2FibGUodDIpKSByZXR1cm4gdDI7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpc1dhbGthYmxlKHQ6IFRpbGVJZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhKHRoaXMuZ2V0RWZmZWN0cyh0KSAmIFRlcnJhaW4uQklUUyk7XG4gIH1cblxuICBlbnN1cmVQYXNzYWJsZSh0OiBUaWxlSWQpOiBUaWxlSWQge1xuICAgIHJldHVybiB0aGlzLmlzV2Fsa2FibGUodCkgPyB0IDogdGhpcy53YWxrYWJsZU5laWdoYm9yKHQpID8/IHQ7XG4gIH1cblxuICBnZXRFZmZlY3RzKHQ6IFRpbGVJZCk6IG51bWJlciB7XG4gICAgY29uc3QgbG9jYXRpb24gPSB0aGlzLnJvbS5sb2NhdGlvbnNbdCA+Pj4gMTZdO1xuICAgIC8vY29uc3QgcGFnZSA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgZWZmZWN0cyA9IHRoaXMucm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM10uZWZmZWN0cztcbiAgICBjb25zdCBzY3IgPSBsb2NhdGlvbi5zY3JlZW5zWyh0ICYgMHhmMDAwKSA+Pj4gMTJdWyh0ICYgMHhmMDApID4+PiA4XTtcbiAgICByZXR1cm4gZWZmZWN0c1t0aGlzLnJvbS5zY3JlZW5zW3Njcl0udGlsZXNbdCAmIDB4ZmZdXTtcbiAgfVxuXG4gIHByb2Nlc3NCb3NzKGxvY2F0aW9uOiBMb2NhdGlvbiwgc3Bhd246IFNwYXduKSB7XG4gICAgLy8gQm9zc2VzIHdpbGwgY2xvYmJlciB0aGUgZW50cmFuY2UgcG9ydGlvbiBvZiBhbGwgdGlsZXMgb24gdGhlIHNjcmVlbixcbiAgICAvLyBhbmQgd2lsbCBhbHNvIGFkZCB0aGVpciBkcm9wLlxuICAgIGlmIChzcGF3bi5pZCA9PT0gMHhjOSB8fCBzcGF3bi5pZCA9PT0gMHhjYSkgcmV0dXJuOyAvLyBzdGF0dWVzXG4gICAgY29uc3QgaXNSYWdlID0gc3Bhd24uaWQgPT09IDB4YzM7XG4gICAgY29uc3QgYm9zcyA9XG4gICAgICAgIGlzUmFnZSA/IHRoaXMucm9tLmJvc3Nlcy5SYWdlIDpcbiAgICAgICAgdGhpcy5yb20uYm9zc2VzLmZyb21Mb2NhdGlvbihsb2NhdGlvbi5pZCk7XG4gICAgY29uc3QgdGlsZSA9IFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bik7XG4gICAgaWYgKCFib3NzIHx8ICFib3NzLmZsYWcpIHRocm93IG5ldyBFcnJvcihgQmFkIGJvc3MgYXQgJHtsb2NhdGlvbi5uYW1lfWApO1xuICAgIGNvbnN0IHNjcmVlbiA9IHRpbGUgJiB+MHhmZjtcbiAgICBjb25zdCBib3NzVGVycmFpbiA9IHRoaXMudGVycmFpbkZhY3RvcnkuYm9zcyhib3NzLmZsYWcuaWQsIGlzUmFnZSk7XG4gICAgY29uc3QgaGl0Ym94ID0gc2VxKDB4ZjAsICh0OiBudW1iZXIpID0+IChzY3JlZW4gfCB0KSBhcyBUaWxlSWQpO1xuICAgIHRoaXMuYWRkVGVycmFpbihoaXRib3gsIGJvc3NUZXJyYWluKTtcbiAgICB0aGlzLmFkZEJvc3NDaGVjayhoaXRib3gsIGJvc3MpO1xuICB9XG5cbiAgYWRkQm9zc0NoZWNrKGhpdGJveDogSGl0Ym94LCBib3NzOiBCb3NzLFxuICAgICAgICAgICAgICAgcmVxdWlyZW1lbnRzOiBSZXF1aXJlbWVudCA9IFJlcXVpcmVtZW50Lk9QRU4pIHtcbiAgICBpZiAoYm9zcy5mbGFnID09IG51bGwpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYSBmbGFnOiAke2Jvc3N9YCk7XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXF1aXJlbWVudHMsIHRoaXMuYm9zc1JlcXVpcmVtZW50cyhib3NzKSk7XG4gICAgaWYgKGJvc3MgPT09IHRoaXMucm9tLmJvc3Nlcy5EcmF5Z29uMikge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIHJlcSwgW2Jvc3MuZmxhZy5pZF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFkZEl0ZW1DaGVjayhcbiAgICAgICAgICBoaXRib3gsIHJlcSwgYm9zcy5mbGFnLmlkLCB7bG9zc3k6IGZhbHNlLCB1bmlxdWU6IHRydWV9KTtcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzQ2hlc3QobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcbiAgICAvLyBBZGQgYSBjaGVjayBmb3IgdGhlIDF4eCBmbGFnLiAgTWFrZSBzdXJlIGl0J3Mgbm90IGEgbWltaWMuXG4gICAgaWYgKHRoaXMucm9tLnNsb3RzW3NwYXduLmlkXSA+PSAweDcwKSByZXR1cm47XG4gICAgY29uc3Qgc2xvdCA9IDB4MTAwIHwgc3Bhd24uaWQ7XG4gICAgY29uc3QgbWFwcGVkID0gdGhpcy5yb20uc2xvdHNbc3Bhd24uaWRdO1xuICAgIGlmIChtYXBwZWQgPj0gMHg3MCkgcmV0dXJuOyAvLyBUT0RPIC0gbWltaWMlIG1heSBjYXJlXG4gICAgY29uc3QgaXRlbSA9IHRoaXMucm9tLml0ZW1zW21hcHBlZF07XG4gICAgY29uc3QgdW5pcXVlID0gdGhpcy5mbGFnc2V0LnByZXNlcnZlVW5pcXVlQ2hlY2tzKCkgPyAhIWl0ZW0/LnVuaXF1ZSA6IHRydWU7XG4gICAgdGhpcy5hZGRJdGVtQ2hlY2soW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildLCBSZXF1aXJlbWVudC5PUEVOLFxuICAgICAgICAgICAgICAgICAgICAgIHNsb3QsIHtsb3NzeTogZmFsc2UsIHVuaXF1ZX0pO1xuICB9XG5cbiAgcHJvY2Vzc01vbnN0ZXIobG9jYXRpb246IExvY2F0aW9uLCBzcGF3bjogU3Bhd24pIHtcblxuICAgIC8vIFRPRE8gLSBjdXJyZW50bHkgZG9uJ3QgaGFuZGxlIGZseWVycyB3ZWxsIC0gY291bGQgaW5zdGVhZCBhZGQgZmx5ZXJzXG4gICAgLy8gICAgICAgIHRvIGFsbCBlbnRyYW5jZXM/XG5cbiAgICAvLyBDaGVjayBtb25zdGVyJ3MgdnVsbmVyYWJpbGl0aWVzIGFuZCBhZGQgYSBjaGVjayBmb3IgTW9uZXkgZ2l2ZW4gc3dvcmRzLlxuICAgIGNvbnN0IG1vbnN0ZXIgPSB0aGlzLnJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgaWYgKCEobW9uc3RlciBpbnN0YW5jZW9mIE1vbnN0ZXIpKSByZXR1cm47XG4gICAgY29uc3Qge1xuICAgICAgTW9uZXksIFJhZ2VTa2lwLFxuICAgICAgU3dvcmQsIFN3b3JkT2ZXaW5kLCBTd29yZE9mRmlyZSwgU3dvcmRPZldhdGVyLCBTd29yZE9mVGh1bmRlcixcbiAgICB9ID0gdGhpcy5yb20uZmxhZ3M7XG4gICAgaWYgKGxvY2F0aW9uLmlkID09PSB0aGlzLmxpbWVUcmVlRW50cmFuY2VMb2NhdGlvbiAmJiBtb25zdGVyLmlzQmlyZCgpICYmXG4gICAgICAgIHRoaXMuZmxhZ3NldC5hc3N1bWVSYWdlU2tpcCgpKSB7XG4gICAgICB0aGlzLmFkZENoZWNrKFt0aGlzLmVudHJhbmNlKGxvY2F0aW9uKV0sIFJlcXVpcmVtZW50Lk9QRU4sIFtSYWdlU2tpcC5pZF0pO1xuXG4gICAgfVxuICAgIGlmICghKG1vbnN0ZXIuZ29sZERyb3ApKSByZXR1cm47XG4gICAgY29uc3QgaGl0Ym94ID0gW1RpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3bildO1xuICAgIGlmICghdGhpcy5mbGFnc2V0Lmd1YXJhbnRlZU1hdGNoaW5nU3dvcmQoKSkge1xuICAgICAgdGhpcy5hZGRDaGVjayhoaXRib3gsIFN3b3JkLnIsIFtNb25leS5pZF0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzd29yZHMgPVxuICAgICAgICBbU3dvcmRPZldpbmQsIFN3b3JkT2ZGaXJlLCBTd29yZE9mV2F0ZXIsIFN3b3JkT2ZUaHVuZGVyXVxuICAgICAgICAgICAgLmZpbHRlcigoXywgaSkgPT4gbW9uc3Rlci5lbGVtZW50cyAmICgxIDw8IGkpKTtcbiAgICAvLyBUT0RPIC0gY29uc2lkZXIgY29sbGVjdGluZyBhbGwgdGhlIGVsZW1lbnRzIGluIG9uZSBwbGFjZSBmaXJzdFxuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCBvciguLi5zd29yZHMpLCBbTW9uZXkuaWRdKTtcbiAgfVxuXG4gIHByb2Nlc3NJdGVtVXNlKGhpdGJveDogSGl0Ym94LCByZXExOiBSZXF1aXJlbWVudCwgaXRlbTogSXRlbSwgdXNlOiBJdGVtVXNlKSB7XG4gICAgLy8gdGhpcyBzaG91bGQgaGFuZGxlIG1vc3QgdHJhZGUtaW5zIGF1dG9tYXRpY2FsbHlcbiAgICBoaXRib3ggPSBuZXcgU2V0KFsuLi5oaXRib3hdLm1hcCh0ID0+IHRoaXMud2Fsa2FibGVOZWlnaGJvcih0KSA/PyB0KSk7XG4gICAgY29uc3QgcmVxMiA9IFtbKDB4MjAwIHwgaXRlbS5pZCkgYXMgQ29uZGl0aW9uXV07IC8vIHJlcXVpcmVzIHRoZSBpdGVtLlxuICAgIC8vIGNoZWNrIGZvciBBcnlsbGlzIHRyYWRlLWluLCBhZGQgY2hhbmdlIGFzIGEgcmVxdWlyZW1lbnQuXG4gICAgaWYgKGl0ZW0uaXRlbVVzZURhdGEuc29tZSh1ID0+IHUudHJhZGVOcGMoKSA9PT0gdGhpcy5yb20ubnBjcy5BcnlsbGlzLmlkKSkge1xuICAgICAgcmVxMlswXS5wdXNoKHRoaXMucm9tLmZsYWdzLkNoYW5nZS5jKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0gPT09IHRoaXMucm9tLml0ZW1zLk1lZGljYWxIZXJiKSB7IC8vIGRvbHBoaW5cbiAgICAgIHJlcTJbMF1bMF0gPSB0aGlzLnJvbS5mbGFncy5CdXlIZWFsaW5nLmM7IC8vIG5vdGU6IG5vIG90aGVyIGhlYWxpbmcgaXRlbXNcbiAgICB9XG4gICAgY29uc3QgcmVxID0gUmVxdWlyZW1lbnQubWVldChyZXExLCByZXEyKTtcbiAgICAvLyBzZXQgYW55IGZsYWdzXG4gICAgdGhpcy5hZGRDaGVja0Zyb21GbGFncyhoaXRib3gsIHJlcSwgdXNlLmZsYWdzKTtcbiAgICAvLyBoYW5kbGUgYW55IGV4dHJhIGFjdGlvbnNcbiAgICBzd2l0Y2ggKHVzZS5tZXNzYWdlLmFjdGlvbikge1xuICAgICAgY2FzZSAweDEwOlxuICAgICAgICAvLyB1c2Uga2V5XG4gICAgICAgIHRoaXMucHJvY2Vzc0tleVVzZShoaXRib3gsIHJlcSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAweDA4OiBjYXNlIDB4MGI6IGNhc2UgMHgwYzogY2FzZSAweDBkOiBjYXNlIDB4MGY6IGNhc2UgMHgxYzpcbiAgICAgICAgLy8gZmluZCBpdGVtZ3JhbnQgZm9yIGl0ZW0gSUQgPT4gYWRkIGNoZWNrXG4gICAgICAgIHRoaXMuYWRkSXRlbUdyYW50Q2hlY2tzKGhpdGJveCwgcmVxLCBpdGVtLmlkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDB4MDI6XG4gICAgICAgIC8vIGRvbHBoaW4gZGVmZXJzIHRvIGRpYWxvZyBhY3Rpb24gMTEgKGFuZCAwZCB0byBzd2ltIGF3YXkpXG4gICAgICAgIHRoaXMuYWRkSXRlbUNoZWNrKGhpdGJveCwgcmVxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAweDEwMCB8IHRoaXMucm9tLm5wY3NbdXNlLndhbnQgJiAweGZmXS5kYXRhWzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB7bG9zc3k6IHRydWUsIHVuaXF1ZTogdHJ1ZX0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcm9jZXNzS2V5VXNlKGhpdGJveDogSGl0Ym94LCByZXE6IFJlcXVpcmVtZW50KSB7XG4gICAgLy8gc2V0IHRoZSBjdXJyZW50IHNjcmVlbidzIGZsYWcgaWYgdGhlIGNvbmRpdGlvbnMgYXJlIG1ldC4uLlxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIG9ubHkgYSBzaW5nbGUgc2NyZWVuLlxuICAgIGNvbnN0IFtzY3JlZW4sIC4uLnJlc3RdID0gbmV3IFNldChbLi4uaGl0Ym94XS5tYXAodCA9PiBTY3JlZW5JZC5mcm9tKHQpKSk7XG4gICAgaWYgKHNjcmVlbiA9PSBudWxsIHx8IHJlc3QubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIG9uZSBzY3JlZW5gKTtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHRoaXMucm9tLmxvY2F0aW9uc1tzY3JlZW4gPj4+IDhdO1xuICAgIGNvbnN0IGZsYWcgPSBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi5zY3JlZW4gPT09IChzY3JlZW4gJiAweGZmKSk7XG4gICAgaWYgKGZsYWcgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBmbGFnIG9uIHNjcmVlbmApO1xuICAgIHRoaXMuYWRkQ2hlY2soaGl0Ym94LCByZXEsIFtmbGFnLmZsYWddKTtcbiAgfVxuXG4gIGJvc3NSZXF1aXJlbWVudHMoYm9zczogQm9zcyk6IFJlcXVpcmVtZW50IHtcbiAgICAvLyBUT0RPIC0gaGFuZGxlIGJvc3Mgc2h1ZmZsZSBzb21laG93P1xuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuUmFnZSkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBSYWdlLiAgRmlndXJlIG91dCB3aGF0IGhlIHdhbnRzIGZyb20gdGhlIGRpYWxvZy5cbiAgICAgIGNvbnN0IHVua25vd25Td29yZCA9IHRoaXMudHJhY2tlciAmJiB0aGlzLmZsYWdzZXQucmFuZG9taXplVHJhZGVzKCk7XG4gICAgICBpZiAodW5rbm93blN3b3JkKSByZXR1cm4gdGhpcy5yb20uZmxhZ3MuU3dvcmQucjsgLy8gYW55IHN3b3JkIG1pZ2h0IGRvLlxuICAgICAgcmV0dXJuIFtbdGhpcy5yb20ubnBjcy5SYWdlLmRpYWxvZygpWzBdLmNvbmRpdGlvbiBhcyBDb25kaXRpb25dXTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBib3NzLm9iamVjdDtcbiAgICBjb25zdCByID0gbmV3IFJlcXVpcmVtZW50LkJ1aWxkZXIoKTtcbiAgICBpZiAodGhpcy50cmFja2VyICYmIHRoaXMuZmxhZ3NldC5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgfHxcbiAgICAgICAgIXRoaXMuZmxhZ3NldC5ndWFyYW50ZWVNYXRjaGluZ1N3b3JkKCkpIHtcbiAgICAgIHIuYWRkQWxsKHRoaXMucm9tLmZsYWdzLlN3b3JkLnIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBsZXZlbCA9IHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVTd29yZE1hZ2ljKCkgPyBib3NzLnN3b3JkTGV2ZWwgOiAxO1xuICAgICAgY29uc3Qgb2JqID0gdGhpcy5yb20ub2JqZWN0c1tpZF07XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICBpZiAob2JqLmlzVnVsbmVyYWJsZShpKSkgci5hZGRBbGwodGhpcy5zd29yZFJlcXVpcmVtZW50KGksIGxldmVsKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENhbid0IGFjdHVhbGx5IGtpbGwgdGhlIGJvc3MgaWYgaXQgZG9lc24ndCBzcGF3bi5cbiAgICBjb25zdCBleHRyYTogQ29uZGl0aW9uW10gPSBbXTtcbiAgICBpZiAoYm9zcy5ucGMgIT0gbnVsbCAmJiBib3NzLmxvY2F0aW9uICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHNwYXduQ29uZGl0aW9uID0gYm9zcy5ucGMuc3Bhd25zKHRoaXMucm9tLmxvY2F0aW9uc1tib3NzLmxvY2F0aW9uXSk7XG4gICAgICBleHRyYS5wdXNoKC4uLnRoaXMuZmlsdGVyUmVxdWlyZW1lbnRzKHNwYXduQ29uZGl0aW9uKVswXSk7XG4gICAgfVxuICAgIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuSW5zZWN0KSB7XG4gICAgICBleHRyYS5wdXNoKHRoaXMucm9tLmZsYWdzLkluc2VjdEZsdXRlLmMsIHRoaXMucm9tLmZsYWdzLkdhc01hc2suYyk7XG4gICAgfSBlbHNlIGlmIChib3NzID09PSB0aGlzLnJvbS5ib3NzZXMuRHJheWdvbjIpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuQm93T2ZUcnV0aC5jKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmxhZ3NldC5ndWFyYW50ZWVSZWZyZXNoKCkpIHtcbiAgICAgIGV4dHJhLnB1c2godGhpcy5yb20uZmxhZ3MuUmVmcmVzaC5jKTtcbiAgICB9XG4gICAgci5yZXN0cmljdChbZXh0cmFdKTtcbiAgICByZXR1cm4gUmVxdWlyZW1lbnQuZnJlZXplKHIpO1xuICB9XG5cbiAgc3dvcmRSZXF1aXJlbWVudChlbGVtZW50OiBudW1iZXIsIGxldmVsOiBudW1iZXIpOiBSZXF1aXJlbWVudCB7XG4gICAgY29uc3Qgc3dvcmQgPSBbXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuU3dvcmRPZkZpcmUsXG4gICAgICB0aGlzLnJvbS5mbGFncy5Td29yZE9mV2F0ZXIsIHRoaXMucm9tLmZsYWdzLlN3b3JkT2ZUaHVuZGVyLFxuICAgIF1bZWxlbWVudF07XG4gICAgaWYgKGxldmVsID09PSAxKSByZXR1cm4gc3dvcmQucjtcbiAgICBjb25zdCBwb3dlcnMgPSBbXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mV2luZCwgdGhpcy5yb20uZmxhZ3MuVG9ybmFkb0JyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZGaXJlLCB0aGlzLnJvbS5mbGFncy5GbGFtZUJyYWNlbGV0XSxcbiAgICAgIFt0aGlzLnJvbS5mbGFncy5CYWxsT2ZXYXRlciwgdGhpcy5yb20uZmxhZ3MuQmxpenphcmRCcmFjZWxldF0sXG4gICAgICBbdGhpcy5yb20uZmxhZ3MuQmFsbE9mVGh1bmRlciwgdGhpcy5yb20uZmxhZ3MuU3Rvcm1CcmFjZWxldF0sXG4gICAgXVtlbGVtZW50XTtcbiAgICBpZiAobGV2ZWwgPT09IDMpIHJldHVybiBhbmQoc3dvcmQsIC4uLnBvd2Vycyk7XG4gICAgcmV0dXJuIHBvd2Vycy5tYXAocG93ZXIgPT4gW3N3b3JkLmMsIHBvd2VyLmNdKTtcbiAgfVxuXG4gIGl0ZW1HcmFudChpZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiB0aGlzLnJvbS5pdGVtR2V0cy5hY3Rpb25HcmFudHMpIHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgaXRlbSBncmFudCAke2lkLnRvU3RyaW5nKDE2KX1gKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3IgYWxsIG9mIHRoZSBmbGFncyBiZWluZyBtZXQuICovXG4gIGZpbHRlclJlcXVpcmVtZW50cyhmbGFnczogbnVtYmVyW10pOiBSZXF1aXJlbWVudC5Gcm96ZW4ge1xuICAgIGNvbnN0IGNvbmRzID0gW107XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoZmxhZyA8IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVUcnVlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZiA9IHRoaXMuZmxhZyhmbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZUZhbHNlKSByZXR1cm4gUmVxdWlyZW1lbnQuQ0xPU0VEO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIGNvbmRzLnB1c2goZi5pZCBhcyBDb25kaXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvbmRzXTtcbiAgfVxuXG4gIC8qKiBSZXR1cm4gYSBSZXF1aXJlbWVudCBmb3Igc29tZSBmbGFnIG5vdCBiZWluZyBtZXQuICovXG4gIGZpbHRlckFudGlSZXF1aXJlbWVudHMoZmxhZ3M6IG51bWJlcltdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgICBjb25zdCByZXEgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZsYWcgb2YgZmxhZ3MpIHtcbiAgICAgIGlmIChmbGFnID49IDApIHtcbiAgICAgICAgY29uc3QgbG9naWMgPSB0aGlzLmZsYWcofmZsYWcpPy5sb2dpYztcbiAgICAgICAgaWYgKGxvZ2ljPy5hc3N1bWVGYWxzZSkgcmV0dXJuIFJlcXVpcmVtZW50Lk9QRU47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5mbGFnKH5mbGFnKTtcbiAgICAgICAgaWYgKGY/LmxvZ2ljLmFzc3VtZVRydWUpIHJldHVybiBSZXF1aXJlbWVudC5PUEVOO1xuICAgICAgICBpZiAoZj8ubG9naWMudHJhY2spIHJlcS5wdXNoKFtmLmlkIGFzIENvbmRpdGlvbl0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVxO1xuICB9XG5cbiAgZmxhZyhmbGFnOiBudW1iZXIpOiBGbGFnfHVuZGVmaW5lZCB7XG4gICAgLy9jb25zdCB1bnNpZ25lZCA9IGZsYWcgPCAwID8gfmZsYWcgOiBmbGFnO1xuICAgIGNvbnN0IHVuc2lnbmVkID0gZmxhZzsgIC8vIFRPRE8gLSBzaG91bGQgd2UgYXV0by1pbnZlcnQ/XG4gICAgY29uc3QgZiA9IHRoaXMucm9tLmZsYWdzW3Vuc2lnbmVkXTtcbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmFsaWFzZXMuZ2V0KGYpID8/IGY7XG4gICAgcmV0dXJuIG1hcHBlZDtcbiAgfVxuXG4gIGVudHJhbmNlKGxvY2F0aW9uOiBMb2NhdGlvbnxudW1iZXIsIGluZGV4ID0gMCk6IFRpbGVJZCB7XG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiA9PT0gJ251bWJlcicpIGxvY2F0aW9uID0gdGhpcy5yb20ubG9jYXRpb25zW2xvY2F0aW9uXTtcbiAgICByZXR1cm4gdGhpcy50aWxlcy5maW5kKFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBsb2NhdGlvbi5lbnRyYW5jZXNbaW5kZXhdKSk7XG4gIH1cblxuICB3YWxsQ2FwYWJpbGl0eSh3YWxsOiBXYWxsVHlwZSk6IG51bWJlciB7XG4gICAgc3dpdGNoICh3YWxsKSB7XG4gICAgICBjYXNlIFdhbGxUeXBlLldJTkQ6IHJldHVybiB0aGlzLnJvbS5mbGFncy5CcmVha1N0b25lLmlkO1xuICAgICAgY2FzZSBXYWxsVHlwZS5GSVJFOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuQnJlYWtJY2UuaWQ7XG4gICAgICBjYXNlIFdhbGxUeXBlLldBVEVSOiByZXR1cm4gdGhpcy5yb20uZmxhZ3MuRm9ybUJyaWRnZS5pZDtcbiAgICAgIGNhc2UgV2FsbFR5cGUuVEhVTkRFUjogcmV0dXJuIHRoaXMucm9tLmZsYWdzLkJyZWFrSXJvbi5pZDtcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihgYmFkIHdhbGwgdHlwZTogJHt3YWxsfWApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhbmQoLi4uZmxhZ3M6IEZsYWdbXSk6IFJlcXVpcmVtZW50LlNpbmdsZSB7XG4gIHJldHVybiBbZmxhZ3MubWFwKChmOiBGbGFnKSA9PiBmLmlkIGFzIENvbmRpdGlvbildO1xufVxuXG5mdW5jdGlvbiBvciguLi5mbGFnczogRmxhZ1tdKTogUmVxdWlyZW1lbnQuRnJvemVuIHtcbiAgcmV0dXJuIGZsYWdzLm1hcCgoZjogRmxhZykgPT4gW2YuaWQgYXMgQ29uZGl0aW9uXSk7XG59XG5cbi8vIEFuIGludGVyZXN0aW5nIHdheSB0byB0cmFjayB0ZXJyYWluIGNvbWJpbmF0aW9ucyBpcyB3aXRoIHByaW1lcy5cbi8vIElmIHdlIGhhdmUgTiBlbGVtZW50cyB3ZSBjYW4gbGFiZWwgZWFjaCBhdG9tIHdpdGggYSBwcmltZSBhbmRcbi8vIHRoZW4gbGFiZWwgYXJiaXRyYXJ5IGNvbWJpbmF0aW9ucyB3aXRoIHRoZSBwcm9kdWN0LiAgRm9yIE49MTAwMFxuLy8gdGhlIGhpZ2hlc3QgbnVtYmVyIGlzIDgwMDAsIHNvIHRoYXQgaXQgY29udHJpYnV0ZXMgYWJvdXQgMTMgYml0c1xuLy8gdG8gdGhlIHByb2R1Y3QsIG1lYW5pbmcgd2UgY2FuIHN0b3JlIGNvbWJpbmF0aW9ucyBvZiA0IHNhZmVseVxuLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gYmlnaW50LiAgVGhpcyBpcyBpbmhlcmVudGx5IG9yZGVyLWluZGVwZW5kZW50LlxuLy8gSWYgdGhlIHJhcmVyIG9uZXMgYXJlIGhpZ2hlciwgd2UgY2FuIGZpdCBzaWduaWZpY2FudGx5IG1vcmUgdGhhbiA0LlxuXG5jb25zdCBERUJVRyA9IGZhbHNlO1xuXG4vLyBEZWJ1ZyBpbnRlcmZhY2UuXG5leHBvcnQgaW50ZXJmYWNlIEFyZWFEYXRhIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGlsZXM6IFNldDxUaWxlSWQ+O1xuICBjaGVja3M6IEFycmF5PFtGbGFnLCBSZXF1aXJlbWVudF0+O1xuICB0ZXJyYWluOiBUZXJyYWluO1xuICBsb2NhdGlvbnM6IFNldDxudW1iZXI+O1xuICByb3V0ZXM6IFJlcXVpcmVtZW50LkZyb3plbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGlsZURhdGEge1xuICBhcmVhOiBBcmVhRGF0YTtcbiAgZXhpdD86IFRpbGVJZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb25EYXRhIHtcbiAgYXJlYXM6IFNldDxBcmVhRGF0YT47XG4gIHRpbGVzOiBTZXQ8VGlsZUlkPjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV29ybGREYXRhIHtcbiAgdGlsZXM6IE1hcDxUaWxlSWQsIFRpbGVEYXRhPjtcbiAgYXJlYXM6IEFyZWFEYXRhW107XG4gIGxvY2F0aW9uczogTG9jYXRpb25EYXRhW107XG59XG4iXX0=