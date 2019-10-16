import { Neighbors, ScreenId, TileId, TilePair } from './geometry.js';
import { Boss, Check, Capability, Condition, Event, Item, Magic, MutableRequirement, Slot, Terrain, meet, memoize, memoize2 } from './condition.js';
import { Overlay } from './overlay.js';
import { Routes } from './routes.js';
import * as shuffle from './shuffle.js';
import { Bits } from '../bits.js';
import { FlagSet } from '../flagset.js';
import { hex } from '../rom/util.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap } from '../util.js';
const {} = { hex };
export class World {
    constructor(rom, tiles, graph) {
        this.rom = rom;
        this.tiles = tiles;
        this.graph = graph;
    }
    traverse(graph, fill) {
        const { spoiler } = this.rom;
        if (!spoiler)
            return;
        for (let i = -0x200; i < 0x300; i++) {
            spoiler.addCondition(i, conditionName(i, this.rom));
        }
        for (const [si, ...iis] of shuffle.traverseFill(graph, fill)) {
            const slot = graph.slots[si].condition;
            const items = iis.map(ii => graph.items[ii].condition);
            const slotItem = fill.slots[graph.slots[si].item];
            spoiler.addCheck(slot, items, slotItem);
        }
    }
    static build(rom, flags, tracker) {
        return build(rom, flags, tracker);
    }
}
function build(rom, flags = new FlagSet('@FullShuffle'), tracker = false) {
    const overlay = new Overlay(rom, flags, tracker);
    const terrains = new Map();
    const walls = new Map();
    const bosses = new Map();
    const npcs = new Map();
    const checks = new DefaultMap(() => new Set());
    const monsters = new Map();
    const allExits = new Set();
    for (const location of rom.locations) {
        if (!location.used)
            continue;
        const ext = location.extended ? 0x100 : 0;
        const tileset = rom.tilesets[(location.tileset & 0x7f) >> 2];
        const tileEffects = rom.tileEffects[location.tileEffects - 0xb3];
        for (const spawn of location.spawns) {
            if (spawn.isWall()) {
                walls.set(ScreenId.from(location, spawn), (spawn.id & 3));
            }
        }
        for (let y = 0, height = location.height; y < height; y++) {
            const row = location.screens[y];
            const rowId = location.id << 8 | y << 4;
            for (let x = 0, width = location.width; x < width; x++) {
                const screen = rom.screens[row[x] | ext];
                const screenId = ScreenId(rowId | x);
                const flagYx = screenId & 0xff;
                const wall = walls.get(screenId);
                const flag = wall != null ? overlay.wallCapability(wall) :
                    location.flags.find(f => f.yx === flagYx);
                const withFlagMemoized = memoize2((t1, t2) => {
                    if (!flag)
                        throw new Error(`flag expected`);
                    t2 = { ...t2, enter: meet(t2.enter || [[]], Condition(flag.flag)) };
                    return Terrain.join(t1, t2);
                });
                function withFlag(t1, t2) {
                    if (!flag)
                        throw new Error(`flag expected`);
                    if (!t2)
                        return t1;
                    if (!t1)
                        return Terrain.meet({ enter: Condition(flag.flag) }, t2);
                    return withFlagMemoized(t1, t2);
                }
                ;
                for (let t = 0; t < 0xf0; t++) {
                    const tid = TileId(screenId << 8 | t);
                    let tile = screen.tiles[t];
                    if (flag && flag.flag === 0x2ef && tile < 0x20)
                        tile = tileset.alternates[tile];
                    const effects = ext ? 0 : tileEffects.effects[tile] & 0x26;
                    let terrain = overlay.makeTerrain(effects, tid);
                    if (tile < 0x20 && tileset.alternates[tile] != tile && flag && flag.flag !== 0x2ef) {
                        const alternate = overlay.makeTerrain(tileEffects.effects[tileset.alternates[tile]], tid);
                        terrain = withFlag(terrain, alternate);
                    }
                    if (terrain)
                        terrains.set(tid, terrain);
                }
            }
        }
        for (const exit of location.exits) {
            if (exit.entrance & 0x20) {
                const tile = TileId.from(location, exit);
                allExits.add(tile);
                const previous = terrains.get(tile);
                if (previous)
                    terrains.set(tile, Terrain.seamless(previous));
            }
        }
        function meetTerrain(tile, terrain) {
            const previous = terrains.get(tile);
            if (!previous)
                return;
            terrains.set(tile, Terrain.meet(previous, terrain));
        }
        for (const spawn of location.spawns) {
            if (spawn.isTrigger()) {
                const trigger = overlay.trigger(spawn.id);
                if (trigger.terrain || trigger.check) {
                    let { x: x0, y: y0 } = spawn;
                    x0 += 8;
                    for (const loc of [location, ...(trigger.extraLocations || [])]) {
                        for (const dx of trigger.dx || [-16, 0]) {
                            for (const dy of [-16, 0]) {
                                const x = x0 + dx;
                                const y = y0 + dy;
                                const tile = TileId.from(loc, { x, y });
                                if (trigger.terrain)
                                    meetTerrain(tile, trigger.terrain);
                                for (const check of trigger.check || []) {
                                    checks.get(tile).add(check);
                                }
                            }
                        }
                    }
                }
            }
            else if (spawn.isNpc()) {
                npcs.set(TileId.from(location, spawn), spawn.id);
                const npc = overlay.npc(spawn.id, location);
                if (npc.terrain || npc.check) {
                    let { x: xs, y: ys } = spawn;
                    let { x0, x1, y0, y1 } = npc.hitbox || { x0: 0, y0: 0, x1: 1, y1: 1 };
                    for (let dx = x0; dx < x1; dx++) {
                        for (let dy = y0; dy < y1; dy++) {
                            const x = xs + 16 * dx;
                            const y = ys + 16 * dy;
                            const tile = TileId.from(location, { x, y });
                            if (npc.terrain)
                                meetTerrain(tile, npc.terrain);
                            for (const check of npc.check || []) {
                                checks.get(tile).add(check);
                            }
                        }
                    }
                }
            }
            else if (spawn.isBoss()) {
                bosses.set(TileId.from(location, spawn), spawn.id);
            }
            else if (spawn.isChest()) {
                checks.get(TileId.from(location, spawn)).add(Check.chest(spawn.id));
            }
            else if (spawn.isMonster()) {
                const monster = rom.objects[spawn.monsterId];
                if (monster.goldDrop)
                    monsters.set(TileId.from(location, spawn), monster.elements);
            }
        }
    }
    for (const [bossTile, bossId] of bosses) {
        const loc = bossTile >> 16;
        const rage = bossId === 0xc3;
        const boss = !rage ? rom.bosses.fromLocation(loc) : rom.bosses.rage;
        if (loc === 0xa0 || loc === 0x5f)
            continue;
        if (!boss || boss.kill == null)
            throw new Error(`bad boss at loc ${loc.toString(16)}`);
        const kill = Boss(boss.kill);
        const merge = memoize((t) => Terrain.meet(t, { exit: kill, exitSouth: kill }));
        const tileBase = bossTile & ~0xff;
        const condition = overlay.bossRequirements(boss);
        const check = { slot: Slot(kill), condition };
        for (let i = 0; i < 0xf0; i++) {
            const tile = TileId(tileBase | i);
            const t = terrains.get(tile);
            if (!t)
                continue;
            terrains.set(tile, merge(t));
            checks.get(tile).add(check);
        }
    }
    for (const check of overlay.locations() || []) {
        checks.get(check.tile).add(check);
    }
    const tiles = new UnionFind();
    for (const [tile, terrain] of terrains) {
        const x1 = TileId.add(tile, 0, 1);
        if (terrains.get(x1) === terrain)
            tiles.union([tile, x1]);
        const y1 = TileId.add(tile, 1, 0);
        if (terrains.get(y1) === terrain)
            tiles.union([tile, y1]);
    }
    const exitSet = new Set();
    for (const location of rom.locations) {
        if (!location.used)
            continue;
        for (const exit of location.exits) {
            const { dest, entrance } = exit;
            const from = TileId.from(location, exit);
            const to = entrance & 0x20 ?
                TileId(from & 0xffff | (dest << 16)) :
                TileId.from({ id: dest }, rom.locations[dest].entrances[entrance]);
            exitSet.add(TilePair.of(tiles.find(from), tiles.find(to)));
        }
    }
    for (const exit of exitSet) {
        const [from, to] = TilePair.split(exit);
        if (terrains.get(from) !== terrains.get(to))
            continue;
        const reverse = TilePair.of(to, from);
        if (exitSet.has(reverse)) {
            tiles.union([from, to]);
            exitSet.delete(exit);
            exitSet.delete(reverse);
        }
    }
    const neighbors = new Neighbors(tiles, allExits);
    for (const [tile, terrain] of terrains) {
        const x1 = TileId.add(tile, 0, 1);
        const tx1 = terrains.get(x1);
        if (tx1 && tx1 !== terrain)
            neighbors.addAdjacent(tile, x1, false);
        const y1 = TileId.add(tile, 1, 0);
        const ty1 = terrains.get(y1);
        if (ty1 && ty1 !== terrain)
            neighbors.addAdjacent(tile, y1, true);
    }
    for (const exit of exitSet) {
        const [from, to] = TilePair.split(exit);
        if (!terrains.has(from) || !terrains.has(to))
            continue;
        neighbors.addExit(from, to);
    }
    const routes = new Routes();
    for (const r of overlay.extraRoutes()) {
        for (const c of r.condition || [[]]) {
            routes.addRoute(tiles.find(r.tile), c);
        }
    }
    for (const { from, to, condition } of overlay.extraEdges()) {
        for (const deps of condition || [[]]) {
            routes.addEdge(tiles.find(to), tiles.find(from), deps);
        }
    }
    for (const { from, to, south } of neighbors) {
        const f = terrains.get(from);
        const t = terrains.get(to);
        if (!f || !t)
            throw new Error(`missing terrain ${f ? to : from}`);
        for (const exit of (south ? f.exitSouth : f.exit) || [[]]) {
            for (const entrance of t.enter || [[]]) {
                routes.addEdge(to, from, [...entrance, ...exit]);
            }
        }
    }
    const reqs = new DefaultMap(() => new MutableRequirement());
    for (const { condition = [[]], capability } of overlay.capabilities()) {
        reqs.get(Slot(capability)).addAll(condition);
    }
    for (const [tile, checkset] of checks) {
        const root = tiles.find(tile);
        if (tile === root)
            continue;
        for (const check of checkset) {
            checks.get(root).add(check);
        }
        checks.delete(tile);
    }
    for (const [tile, checkset] of checks) {
        for (const { slot, condition = [[]] } of checkset) {
            const req = reqs.get(slot);
            for (const r1 of condition) {
                for (const r2 of routes.routes.get(tile) || []) {
                    req.addList([...r1, ...r2]);
                }
            }
        }
    }
    if (DEBUG && typeof window !== 'undefined') {
        const w = window;
        console.log(w.roots = (w.tiles = tiles).roots());
        console.log([...(w.neighbors = neighbors)]);
        console.log(w.ll = routes);
        function h(x) {
            return x < 0 ? '~' + (~x).toString(16).padStart(2, '0') :
                x.toString(16).padStart(3, '0');
        }
        function dnf(x, f = h) {
            const xs = [...x];
            if (!xs.length)
                return 'no route';
            return '(' + xs.map(y => [...y].map(f).join(' & '))
                .join(') |\n     (') + ')';
        }
        w.area = (tile, f = h) => {
            const s = [...tiles.sets().filter(s => s.has(tile))[0]]
                .map(x => x.toString(16).padStart(6, '0'));
            const r = dnf(routes.routes.get(tiles.find(tile)), f);
            const edges = [];
            const t = tiles.find(tile);
            for (const out of (routes.edges.get(t) || new Map()).values()) {
                edges.push(`\nto ${out.target.toString(16)} if (${[...out.deps].map(f).join(' & ')})`);
            }
            for (const [from, rs] of routes.edges) {
                for (const to of rs.values()) {
                    if (to.target !== t)
                        continue;
                    edges.push(`\nfrom ${from.toString(16)} if (${[...to.deps].map(f).join(' & ')})`);
                }
            }
            function group(arr, count, spacer) {
                const out = [];
                for (let i = 0; i < arr.length; i += count) {
                    out.push(arr.slice(i, i + count).join(spacer));
                }
                return out;
            }
            return `${hex(t)}\n${group(s, 16, ' ').join('\n')}\ncount = ${s.length}\nroutes = ${r}${edges.join('')}`;
        };
        w.whatFlag = (f) => conditionName(f, rom);
        w.reqs = reqs;
        console.log('reqs\n' + [...reqs].sort(([a], [b]) => a - b)
            .map(([s, r]) => `${w.whatFlag(s)}: ${dnf(r, w.whatFlag)}`)
            .join('\n'));
        w.reqs.check =
            (id, f = h) => `${f(id)}: ${dnf(reqs.get(Slot(id)), f)}`;
        w.reqs.check2 = (id) => w.reqs.check(id, w.whatFlag);
    }
    let filled = isItem;
    if (tracker) {
        filled = function (c) {
            if (isItem(c))
                return true;
            if (flags.shuffleBossElements() && isBoss(c))
                return true;
            return false;
        };
    }
    return new World(rom, tiles, makeGraph(reqs, rom, filled));
}
function isBoss(c) {
    return ~c >= 0x100 && ~c < 0x110;
}
function isItem(c) {
    return c >= 0x200 && c < 0x280;
}
function makeGraph(reqs, rom, filled) {
    const allConditionsSet = new Set();
    const allSlotsSet = new Set();
    for (const [slot, req] of reqs) {
        allSlotsSet.add(slot);
        for (const cs of req) {
            for (const c of cs) {
                allConditionsSet.add(c);
            }
        }
    }
    allConditionsSet.add(Boss.DRAYGON2[0][0]);
    const allConditions = [...allConditionsSet].filter(c => !filled(c)).sort();
    const allItems = [...allConditionsSet].filter(filled).sort();
    const allSlots = [...allSlotsSet].filter(filled).sort();
    const fixed = allConditions.length;
    function makeNode(condition, index) {
        return { name: conditionName(condition, rom), condition, index };
    }
    function itemNode(condition, index) {
        return Object.assign(makeNode(condition, index + fixed), { item: (condition & 0x7f) });
    }
    const conditionNodes = allConditions.map(makeNode);
    const itemNodes = allItems.map(itemNode);
    const slotNodes = allSlots.map(itemNode);
    const items = [...conditionNodes, ...itemNodes];
    const slots = [...conditionNodes, ...slotNodes];
    const itemIndexMap = new Map(items.map((c, i) => [c.condition, i]));
    function getItemIndex(c) {
        const index = itemIndexMap.get(c);
        if (index == null) {
            throw new Error(`Missing item $${c.toString(16)}: ${conditionName(c, rom)}`);
        }
        return index;
    }
    const slotIndexMap = new Map(slots.map((c, i) => [c.condition, i]));
    const graph = [];
    const unlocksSet = [];
    for (const [slot, req] of reqs) {
        const s = slotIndexMap.get(slot);
        if (s == null) {
            if (MAYBE_MISSING_SLOTS.has(slot))
                continue;
            console.error(`Nothing depended on $${slot.toString(16)}: ${conditionName(slot, rom)}`);
            continue;
        }
        for (const cs of req) {
            const is = [...cs].map(getItemIndex);
            (graph[s] || (graph[s] = [])).push(Bits.from(is));
            for (const i of is) {
                (unlocksSet[i] || (unlocksSet[i] = new Set())).add(s);
            }
        }
    }
    for (const n of [...conditionNodes, ...slotNodes]) {
        if (!graph[n.index] || !graph[n.index].length) {
            const c = n.condition;
            console.error(`Nothing provided $${c.toString(16)}: ${conditionName(c, rom)} (index ${n.index})`);
        }
    }
    if (DEBUG)
        console.log(graph);
    const unlocks = unlocksSet.map(x => [...x]);
    return { fixed, slots, items, graph, unlocks, rom };
}
const MAYBE_MISSING_SLOTS = new Set([
    0x025,
    0x026,
    0x0a9,
    0x244,
]);
function conditionName(f, rom) {
    const enums = { Boss, Event, Capability, Item, Magic };
    for (const enumName in enums) {
        const e = enums[enumName];
        for (const elem in e) {
            if (e[elem] === f || Array.isArray(e[elem]) && e[elem][0][0] === f) {
                return elem.replace(/([A-Z])([A-Z]+)/g, (_, f, s) => f + s.toLowerCase())
                    .replace(/_/g, ' ');
            }
        }
    }
    for (const l of rom.locations) {
        if (!l.used)
            continue;
        for (const fl of l.flags) {
            if (fl.flag === f) {
                return `Location ${l.id.toString(16)} (${l.name}) Flag ${fl.ys},${fl.xs}`;
            }
        }
    }
    return f < 0 ? `~${(~f).toString(16).padStart(2, '0')}` :
        f.toString(16).padStart(2, '0');
}
const DEBUG = false;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZ3JhcGgvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUMxRSxJQUFJLEVBQUUsT0FBTyxFQUFZLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEYsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNyQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDaEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN0QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFdEMsTUFBTSxFQUFFLEdBQUcsRUFBQyxHQUFHLEVBQVEsQ0FBQztBQVF4QixNQUFNLE9BQU8sS0FBSztJQUVoQixZQUFxQixHQUFRLEVBQ1IsS0FBd0IsRUFDeEIsS0FBb0I7UUFGcEIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFVBQUssR0FBTCxLQUFLLENBQW1CO1FBQ3hCLFVBQUssR0FBTCxLQUFLLENBQWU7SUFBRyxDQUFDO0lBRzdDLFFBQVEsQ0FBQyxLQUFvQixFQUFFLElBQWtC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SSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBQyxDQUFDO1FBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxDQUFDO2dCQUFFLFNBQVM7WUFDakIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0I7S0FFRjtJQUVELEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM3QyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDbkM7SUFZRCxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsRUFBVSxDQUFDO0lBQ3RDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxRQUFRLEVBQUU7UUFDdEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxPQUFPO1lBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNs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QztBQUlELE1BQU0sS0FBSyxHQUFZLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7TmVpZ2hib3JzLCBTY3JlZW5JZCwgVGlsZUlkLCBUaWxlUGFpcn0gZnJvbSAnLi9nZW9tZXRyeS5qcyc7XG5pbXBvcnQge0Jvc3MsIENoZWNrLCBDYXBhYmlsaXR5LCBDb25kaXRpb24sIEV2ZW50LCBJdGVtLCBNYWdpYywgTXV0YWJsZVJlcXVpcmVtZW50LFxuICAgICAgICBTbG90LCBUZXJyYWluLCBXYWxsVHlwZSwgbWVldCwgbWVtb2l6ZSwgbWVtb2l6ZTJ9IGZyb20gJy4vY29uZGl0aW9uLmpzJztcbmltcG9ydCB7T3ZlcmxheX0gZnJvbSAnLi9vdmVybGF5LmpzJztcbmltcG9ydCB7Um91dGVzfSBmcm9tICcuL3JvdXRlcy5qcyc7XG5pbXBvcnQgKiBhcyBzaHVmZmxlIGZyb20gJy4vc2h1ZmZsZS5qcyc7XG5pbXBvcnQge0JpdHN9IGZyb20gJy4uL2JpdHMuanMnO1xuaW1wb3J0IHtGbGFnU2V0fSBmcm9tICcuLi9mbGFnc2V0LmpzJztcbmltcG9ydCB7aGV4fSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQge1JvbX0gZnJvbSAnLi4vcm9tLmpzJztcbmltcG9ydCB7VW5pb25GaW5kfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHtEZWZhdWx0TWFwfSBmcm9tICcuLi91dGlsLmpzJztcblxuY29uc3Qge30gPSB7aGV4fSBhcyBhbnk7IC8vIGZvciBkZWJ1Z2dpbmdcblxuLy8gQSB0aWxlIGlzIGEgMjQtYml0IG51bWJlcjpcbi8vICAgPGxvYz48eXM+PHhzPjx5dD48eHQ+XG4vLyBXZSBkbyBhIGdpYW50IGZsb29kLWZpbGwgb2YgdGhlIGVudGlyZSBnYW1lLCBzdGFydGluZyBhdCAkMDAwMDU1IG9yIHdoYXRldmVyLlxuLy8gRmlsbGluZyBpcyBhIHVuaW9uLWZpbmQsIHNvIHdlIHN0YXJ0IGJ5IGFzc2lnbmluZyBlYWNoIGVsZW1lbnQgaXRzZWxmLCBidXRcbi8vIHdoZW4gd2UgZmluZCBhIG5laWdoYm9yLCB3ZSBqb2luIHRoZW0uXG5cbmV4cG9ydCBjbGFzcyBXb3JsZCB7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgcm9tOiBSb20sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHRpbGVzOiBVbmlvbkZpbmQ8VGlsZUlkPixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgZ3JhcGg6IHNodWZmbGUuR3JhcGgpIHt9XG5cbiAgLy8gRG9lcyBhIFwiY2hlY2tcIiB0cmF2ZXJzYWwgb2YgYSBmaWxsLCBwb3B1bGF0aW5nIHRoZSBzcG9pbGVyIGxvZy5cbiAgdHJhdmVyc2UoZ3JhcGg6IHNodWZmbGUuR3JhcGgsIGZpbGw6IHNodWZmbGUuRmlsbCk6IHZvaWQge1xuICAgIGNvbnN0IHtzcG9pbGVyfSA9IHRoaXMucm9tO1xuICAgIGlmICghc3BvaWxlcikgcmV0dXJuO1xuICAgIC8vIFRPRE8gLSBpbXByb3ZlIHRoaXMhXG4gICAgZm9yIChsZXQgaSA9IC0weDIwMDsgaSA8IDB4MzAwOyBpKyspIHtcbiAgICAgIHNwb2lsZXIuYWRkQ29uZGl0aW9uKGksIGNvbmRpdGlvbk5hbWUoaSwgdGhpcy5yb20pKTtcbiAgICB9XG4gICAgLy8gRG8gdGhlIHRyYXZlcnNhbCBhbmQgYWRkIGFsbCB0aGUgcm91dGVzXG4gICAgZm9yIChjb25zdCBbc2ksIC4uLmlpc10gb2Ygc2h1ZmZsZS50cmF2ZXJzZUZpbGwoZ3JhcGgsIGZpbGwpKSB7XG4gICAgICBjb25zdCBzbG90ID0gZ3JhcGguc2xvdHNbc2ldLmNvbmRpdGlvbjtcbiAgICAgIC8vIGNvbnN0IHNsb3QgPSBjb25kaXRpb25OYW1lKGdyYXBoLnNsb3RzW3NpXS5jb25kaXRpb24sIHRoaXMucm9tKTtcbiAgICAgIGNvbnN0IGl0ZW1zID0gaWlzLm1hcChpaSA9PiBncmFwaC5pdGVtc1tpaV0uY29uZGl0aW9uKTtcbiAgICAgIC8vIGNvbnN0IGl0ZW1zID0gaWlzLm1hcChpaSA9PiBjb25kaXRpb25OYW1lKGdyYXBoLml0ZW1zW2lpXS5jb25kaXRpb24sIHRoaXMucm9tKSk7XG4gICAgICBjb25zdCBzbG90SXRlbSA9IGZpbGwuc2xvdHNbZ3JhcGguc2xvdHNbc2ldLml0ZW0hXTtcbiAgICAgIHNwb2lsZXIuYWRkQ2hlY2soc2xvdCwgaXRlbXMsIHNsb3RJdGVtKTtcbiAgICAgIC8vIGNvbnN0IGl0ZW0gPSBzbG90SXRlbSAhPSBudWxsID9cbiAgICAgIC8vICAgICBgID0+ICR7Y29uZGl0aW9uTmFtZSgweDIwMCB8IGZpbGwuc2xvdHNbc2xvdEl0ZW1dLCB0aGlzLnJvbSl9YCA6ICcnO1xuICAgICAgLy8gb3V0LnB1c2goYCR7c2xvdH0ke2l0ZW19OiBbJHtpdGVtcy5qb2luKCcsICcpfV1gKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYnVpbGQocm9tOiBSb20sIGZsYWdzPzogRmxhZ1NldCwgdHJhY2tlcj86IGJvb2xlYW4pOiBXb3JsZCB7XG4gICAgcmV0dXJuIGJ1aWxkKHJvbSwgZmxhZ3MsIHRyYWNrZXIpO1xuICB9XG59XG5cbi8vIEV4aXRzIGJldHdlZW4gZ3JvdXBzIG9mIGRpZmZlcmVudCByZWFjaGFiaWxpdHkuXG4vLyBPcHRpb25hbCB0aGlyZCBlbGVtZW50IGlzIGxpc3Qgb2YgcmVxdWlyZW1lbnRzIHRvIHVzZSB0aGUgZXhpdC5cbi8vIHByaXZhdGUgcmVhZG9ubHkgZXhpdHMgPSBuZXcgQXJyYXk8W251bWJlciwgbnVtYmVyLCBudW1iZXJbXVtdP10+KCk7XG5cbi8vIEJsb2NrcyBmb3IgYW55IGdpdmVuIHRpbGUgZ3JvdXAuXG4vLyBwcml2YXRlIHJlYWRvbmx5IGJsb2NrcyA9IG5ldyBBcnJheTxbbnVtYmVyLCBudW1iZXJbXVtdXT4oKTtcblxuZnVuY3Rpb24gYnVpbGQocm9tOiBSb20sIGZsYWdzID0gbmV3IEZsYWdTZXQoJ0BGdWxsU2h1ZmZsZScpLCB0cmFja2VyID0gZmFsc2UpOiBXb3JsZCB7ICAgIFxuICAvLyAxLiBzdGFydCB3aXRoIGVudHJhbmNlIDAgYXQgdGhlIHN0YXJ0IGxvY2F0aW9uLCBhZGQgaXQgdG8gdGhlIHRpbGVzIGFuZCBxdWV1ZS5cbiAgLy8gMi4gZm9yIHRpbGUgVCBpbiB0aGUgcXVldWVcbiAgLy8gICAgLSBmb3IgZWFjaCBwYXNzYWJsZSBuZWlnaGJvciBOIG9mIFQ6XG4gIC8vICAgICAgLSBpZiBOIGhhcyB0aGUgc2FtZSBwYXNzYWdlIGFzIFQsIHVuaW9uIHRoZW1cbiAgLy8gICAgICAtIGlmIE4gaGFzIGRpZmZlcmVudCBwYXNzYWdlLCBhZGQgYW4gZXhpdCBmcm9tIFQgdG8gTlxuICAvLyAgICAgIC0gaWYgTiBpcyBub3QgeWV0IHNlZW4sIGFkZCBpdCB0byB0aGUgcXVldWVcbiAgLy8gcGFzc2FnZSBjYW4gYmUgb25lIG9mOlxuICAvLyAgLSBvcGVuXG4gIC8vICAtIGJsb2NrZWQoaXRlbS90cmlnZ2VyIC0gYm90aCBhcmUganVzdCBudW1iZXJzLi4uKVxuICAvLyAgLSBvbmUtd2F5IFxuXG4gIC8vIFN0YXJ0IGJ5IGdldHRpbmcgYSBmdWxsIG1hcCBvZiBhbGwgdGVycmFpbnMgYW5kIGNoZWNrc1xuICBjb25zdCBvdmVybGF5ID0gbmV3IE92ZXJsYXkocm9tLCBmbGFncywgdHJhY2tlcik7XG4gIGNvbnN0IHRlcnJhaW5zID0gbmV3IE1hcDxUaWxlSWQsIFRlcnJhaW4+KCk7XG4gIGNvbnN0IHdhbGxzID0gbmV3IE1hcDxTY3JlZW5JZCwgV2FsbFR5cGU+KCk7XG4gIGNvbnN0IGJvc3NlcyA9IG5ldyBNYXA8VGlsZUlkLCBudW1iZXI+KCk7XG4gIGNvbnN0IG5wY3MgPSBuZXcgTWFwPFRpbGVJZCwgbnVtYmVyPigpO1xuICBjb25zdCBjaGVja3MgPSBuZXcgRGVmYXVsdE1hcDxUaWxlSWQsIFNldDxDaGVjaz4+KCgpID0+IG5ldyBTZXQoKSk7XG4gIGNvbnN0IG1vbnN0ZXJzID0gbmV3IE1hcDxUaWxlSWQsIG51bWJlcj4oKTsgLy8gZWxlbWVudGFsIGltbXVuaXRpZXNcbiAgY29uc3QgYWxsRXhpdHMgPSBuZXcgU2V0PFRpbGVJZD4oKTtcblxuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMgLyouc2xpY2UoMCw0KSovKSB7XG4gICAgaWYgKCFsb2NhdGlvbi51c2VkKSBjb250aW51ZTtcbiAgICBjb25zdCBleHQgPSBsb2NhdGlvbi5leHRlbmRlZCA/IDB4MTAwIDogMDtcbiAgICBjb25zdCB0aWxlc2V0ID0gcm9tLnRpbGVzZXRzWyhsb2NhdGlvbi50aWxlc2V0ICYgMHg3ZikgPj4gMl07XG4gICAgY29uc3QgdGlsZUVmZmVjdHMgPSByb20udGlsZUVmZmVjdHNbbG9jYXRpb24udGlsZUVmZmVjdHMgLSAweGIzXTtcblxuICAgIC8vIEZpbmQgYSBmZXcgc3Bhd25zIGVhcmx5XG4gICAgZm9yIChjb25zdCBzcGF3biBvZiBsb2NhdGlvbi5zcGF3bnMpIHtcbiAgICAgIC8vIFdhbGxzIG5lZWQgdG8gY29tZSBmaXJzdCBzbyB3ZSBjYW4gYXZvaWQgYWRkaW5nIHNlcGFyYXRlXG4gICAgICAvLyByZXF1aXJlbWVudHMgZm9yIGV2ZXJ5IHNpbmdsZSB3YWxsIC0ganVzdCB1c2UgdGhlIHR5cGUuXG4gICAgICBpZiAoc3Bhd24uaXNXYWxsKCkpIHtcbiAgICAgICAgd2FsbHMuc2V0KFNjcmVlbklkLmZyb20obG9jYXRpb24sIHNwYXduKSwgKHNwYXduLmlkICYgMykgYXMgV2FsbFR5cGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPIC0gY3VycmVudGx5IHRoaXMgaXMgYnJva2VuIC1cbiAgICAgIC8vICAgWy4uLmxsLnJvdXRlcy5yb3V0ZXMuZ2V0KHRpbGVzLmZpbmQoMHhhNjAwODgpKS52YWx1ZXMoKV0ubWFwKHMgPT4gWy4uLnNdLm1hcCh4ID0+IHgudG9TdHJpbmcoMTYpKS5qb2luKCcgJiAnKSlcbiAgICAgIC8vIExpc3RzIDUgdGhpbmdzOiBmbGlnaHQsIGJyZWFrIGlyb24sIG10IHNhYnJlIHByaXNvbiwgc3dhbiBnYXRlLCBjcnlwdCBlbnRyYW5jZVxuICAgICAgLy8gICAtIHNob3VsZCBhdCBsZWFzdCByZXF1aXJlIGJyZWFraW5nIHN0b25lIG9yIGljZT9cblxuICAgIH1cblxuICAgIC8vIEFkZCB0ZXJyYWluc1xuICAgIGZvciAobGV0IHkgPSAwLCBoZWlnaHQgPSBsb2NhdGlvbi5oZWlnaHQ7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0gbG9jYXRpb24uc2NyZWVuc1t5XTtcbiAgICAgIGNvbnN0IHJvd0lkID0gbG9jYXRpb24uaWQgPDwgOCB8IHkgPDwgNDtcbiAgICAgIGZvciAobGV0IHggPSAwLCB3aWR0aCA9IGxvY2F0aW9uLndpZHRoOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICBjb25zdCBzY3JlZW4gPSByb20uc2NyZWVuc1tyb3dbeF0gfCBleHRdO1xuICAgICAgICBjb25zdCBzY3JlZW5JZCA9IFNjcmVlbklkKHJvd0lkIHwgeCk7XG4gICAgICAgIGNvbnN0IGZsYWdZeCA9IHNjcmVlbklkICYgMHhmZjtcbiAgICAgICAgY29uc3Qgd2FsbCA9IHdhbGxzLmdldChzY3JlZW5JZCk7XG4gICAgICAgIGNvbnN0IGZsYWcgPSB3YWxsICE9IG51bGwgPyBvdmVybGF5LndhbGxDYXBhYmlsaXR5KHdhbGwpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnl4ID09PSBmbGFnWXgpO1xuICAgICAgICBjb25zdCB3aXRoRmxhZ01lbW9pemVkID0gbWVtb2l6ZTIoKHQxOiBUZXJyYWluLCB0MjogVGVycmFpbikgPT4ge1xuICAgICAgICAgIGlmICghZmxhZykgdGhyb3cgbmV3IEVycm9yKGBmbGFnIGV4cGVjdGVkYCk7XG4gICAgICAgICAgdDIgPSB7Li4udDIsIGVudGVyOiBtZWV0KHQyLmVudGVyIHx8IFtbXV0sIENvbmRpdGlvbihmbGFnLmZsYWcpKX07XG4gICAgICAgICAgcmV0dXJuIFRlcnJhaW4uam9pbih0MSwgdDIpO1xuICAgICAgICB9KTtcbiAgICAgICAgZnVuY3Rpb24gd2l0aEZsYWcodDE6IFRlcnJhaW4gfCB1bmRlZmluZWQsIHQyOiBUZXJyYWluIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKCFmbGFnKSB0aHJvdyBuZXcgRXJyb3IoYGZsYWcgZXhwZWN0ZWRgKTtcbiAgICAgICAgICBpZiAoIXQyKSByZXR1cm4gdDE7XG4gICAgICAgICAgaWYgKCF0MSkgcmV0dXJuIFRlcnJhaW4ubWVldCh7ZW50ZXI6IENvbmRpdGlvbihmbGFnLmZsYWcpfSwgdDIpO1xuICAgICAgICAgIHJldHVybiB3aXRoRmxhZ01lbW9pemVkKHQxLCB0Mik7XG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yIChsZXQgdCA9IDA7IHQgPCAweGYwOyB0KyspIHtcbiAgICAgICAgICBjb25zdCB0aWQgPSBUaWxlSWQoc2NyZWVuSWQgPDwgOCB8IHQpO1xuICAgICAgICAgIGxldCB0aWxlID0gc2NyZWVuLnRpbGVzW3RdO1xuICAgICAgICAgIC8vIGZsYWcgMmVmIGlzIFwiYWx3YXlzIG9uXCIsIGRvbid0IGV2ZW4gYm90aGVyIG1ha2luZyBpdCBjb25kaXRpb25hbC5cbiAgICAgICAgICBpZiAoZmxhZyAmJiBmbGFnLmZsYWcgPT09IDB4MmVmICYmIHRpbGUgPCAweDIwKSB0aWxlID0gdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdO1xuICAgICAgICAgIGNvbnN0IGVmZmVjdHMgPSBleHQgPyAwIDogdGlsZUVmZmVjdHMuZWZmZWN0c1t0aWxlXSAmIDB4MjY7XG4gICAgICAgICAgbGV0IHRlcnJhaW4gPSBvdmVybGF5Lm1ha2VUZXJyYWluKGVmZmVjdHMsIHRpZCk7XG4gICAgICAgICAgaWYgKHRpbGUgPCAweDIwICYmIHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXSAhPSB0aWxlICYmIGZsYWcgJiYgZmxhZy5mbGFnICE9PSAweDJlZikge1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRlID1cbiAgICAgICAgICAgICAgICBvdmVybGF5Lm1ha2VUZXJyYWluKHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZXNldC5hbHRlcm5hdGVzW3RpbGVdXSwgdGlkKTtcbiAgICAgICAgICAgIHRlcnJhaW4gPSB3aXRoRmxhZyh0ZXJyYWluLCBhbHRlcm5hdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGVycmFpbikgdGVycmFpbnMuc2V0KHRpZCwgdGVycmFpbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDbG9iYmVyIHRlcnJhaW4gd2l0aCBzZWFtbGVzcyBleGl0c1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgaWYgKGV4aXQuZW50cmFuY2UgJiAweDIwKSB7XG4gICAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgZXhpdCk7XG4gICAgICAgIGFsbEV4aXRzLmFkZCh0aWxlKTtcbiAgICAgICAgY29uc3QgcHJldmlvdXMgPSB0ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICAgIGlmIChwcmV2aW91cykgdGVycmFpbnMuc2V0KHRpbGUsIFRlcnJhaW4uc2VhbWxlc3MocHJldmlvdXMpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaW5kIFwidGVycmFpbiB0cmlnZ2Vyc1wiIHRoYXQgcHJldmVudCBtb3ZlbWVudCBvbmUgd2F5IG9yIGFub3RoZXJcbiAgICBmdW5jdGlvbiBtZWV0VGVycmFpbih0aWxlOiBUaWxlSWQsIHRlcnJhaW46IFRlcnJhaW4pOiB2b2lkIHtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gdGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgLy8gaWYgdGlsZSBpcyBpbXBvc3NpYmxlIHRvIHJlYWNoLCBkb24ndCBib3RoZXIuXG4gICAgICBpZiAoIXByZXZpb3VzKSByZXR1cm47XG4gICAgICB0ZXJyYWlucy5zZXQodGlsZSwgVGVycmFpbi5tZWV0KHByZXZpb3VzLCB0ZXJyYWluKSk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24uaXNUcmlnZ2VyKCkpIHtcbiAgICAgICAgLy8gRm9yIHRyaWdnZXJzLCB3aGljaCB0aWxlcyBkbyB3ZSBtYXJrP1xuICAgICAgICAvLyBUaGUgdHJpZ2dlciBoaXRib3ggaXMgMiB0aWxlcyB3aWRlIGFuZCAxIHRpbGUgdGFsbCwgYnV0IGl0IGRvZXMgbm90XG4gICAgICAgIC8vIGxpbmUgdXAgbmljZWx5IHRvIHRoZSB0aWxlIGdyaWQuICBBbHNvLCB0aGUgcGxheWVyIGhpdGJveCBpcyBvbmx5XG4gICAgICAgIC8vICRjIHdpZGUgKHRob3VnaCBpdCdzICQxNCB0YWxsKSBzbyB0aGVyZSdzIHNvbWUgc2xpZ2h0IGRpc3Bhcml0eS5cbiAgICAgICAgLy8gSXQgc2VlbXMgbGlrZSBwcm9iYWJseSBtYXJraW5nIGl0IGFzICh4LTEsIHktMSkgLi4gKHgsIHkpIG1ha2VzIHRoZVxuICAgICAgICAvLyBtb3N0IHNlbnNlLCB3aXRoIHRoZSBjYXZlYXQgdGhhdCB0cmlnZ2VycyBzaGlmdGVkIHJpZ2h0IGJ5IGEgaGFsZlxuICAgICAgICAvLyB0aWxlIHNob3VsZCBnbyBmcm9tIHggLi4geCsxIGluc3RlYWQuXG4gICAgICAgIGNvbnN0IHRyaWdnZXIgPSBvdmVybGF5LnRyaWdnZXIoc3Bhd24uaWQpO1xuICAgICAgICAvLyBUT0RPIC0gY29uc2lkZXIgY2hlY2tpbmcgdHJpZ2dlcidzIGFjdGlvbjogJDE5IC0+IHB1c2gtZG93biBtZXNzYWdlXG4gICAgICAgIGlmICh0cmlnZ2VyLnRlcnJhaW4gfHwgdHJpZ2dlci5jaGVjaykge1xuICAgICAgICAgIGxldCB7eDogeDAsIHk6IHkwfSA9IHNwYXduO1xuICAgICAgICAgIHgwICs9IDg7XG4gICAgICAgICAgZm9yIChjb25zdCBsb2Mgb2YgW2xvY2F0aW9uLCAuLi4odHJpZ2dlci5leHRyYUxvY2F0aW9ucyB8fCBbXSldKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGR4IG9mIHRyaWdnZXIuZHggfHwgWy0xNiwgMF0pIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBkeSBvZiBbLTE2LCAwXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSB4MCArIGR4O1xuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB5MCArIGR5O1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2MsIHt4LCB5fSk7XG4gICAgICAgICAgICAgICAgaWYgKHRyaWdnZXIudGVycmFpbikgbWVldFRlcnJhaW4odGlsZSwgdHJpZ2dlci50ZXJyYWluKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRyaWdnZXIuY2hlY2sgfHwgW10pIHtcbiAgICAgICAgICAgICAgICAgIGNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNOcGMoKSkge1xuICAgICAgICBucGNzLnNldChUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCBzcGF3bi5pZCk7XG4gICAgICAgIGNvbnN0IG5wYyA9IG92ZXJsYXkubnBjKHNwYXduLmlkLCBsb2NhdGlvbik7XG4gICAgICAgIGlmIChucGMudGVycmFpbiB8fCBucGMuY2hlY2spIHtcbiAgICAgICAgICBsZXQge3g6IHhzLCB5OiB5c30gPSBzcGF3bjtcbiAgICAgICAgICBsZXQge3gwLCB4MSwgeTAsIHkxfSA9IG5wYy5oaXRib3ggfHwge3gwOiAwLCB5MDogMCwgeDE6IDEsIHkxOiAxfTtcbiAgICAgICAgICBmb3IgKGxldCBkeCA9IHgwOyBkeCA8IHgxOyBkeCsrKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBkeSA9IHkwOyBkeSA8IHkxOyBkeSsrKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHggPSB4cyArIDE2ICogZHg7XG4gICAgICAgICAgICAgIGNvbnN0IHkgPSB5cyArIDE2ICogZHk7XG4gICAgICAgICAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwge3gsIHl9KTtcbiAgICAgICAgICAgICAgaWYgKG5wYy50ZXJyYWluKSBtZWV0VGVycmFpbih0aWxlLCBucGMudGVycmFpbik7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgbnBjLmNoZWNrIHx8IFtdKSB7XG4gICAgICAgICAgICAgICAgY2hlY2tzLmdldCh0aWxlKS5hZGQoY2hlY2spO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzQm9zcygpKSB7XG4gICAgICAgIC8vIEJvc3NlcyB3aWxsIGNsb2JiZXIgdGhlIGVudHJhbmNlIHBvcnRpb24gb2YgYWxsIHRpbGVzIG9uIHRoZSBzY3JlZW4sXG4gICAgICAgIC8vIGFuZCB3aWxsIGFsc28gYWRkIHRoZWlyIGRyb3AuXG4gICAgICAgIGJvc3Nlcy5zZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSwgc3Bhd24uaWQpO1xuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0NoZXN0KCkpIHtcbiAgICAgICAgY2hlY2tzLmdldChUaWxlSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pKS5hZGQoQ2hlY2suY2hlc3Qoc3Bhd24uaWQpKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNNb25zdGVyKCkpIHtcbiAgICAgICAgLy8gVE9ETyAtIGNvbXB1dGUgbW9uZXktZHJvcHBpbmcgbW9uc3RlciB2dWxuZXJhYmlsaXRpZXMgYW5kIGFkZCBhIHRyaWdnZXJcbiAgICAgICAgLy8gZm9yIHRoZSBNT05FWSBjYXBhYmlsaXR5IGRlcGVuZGVudCBvbiBhbnkgb2YgdGhlIHN3b3Jkcy5cbiAgICAgICAgY29uc3QgbW9uc3RlciA9IHJvbS5vYmplY3RzW3NwYXduLm1vbnN0ZXJJZF07XG4gICAgICAgIGlmIChtb25zdGVyLmdvbGREcm9wKSBtb25zdGVycy5zZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSwgbW9uc3Rlci5lbGVtZW50cyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBbYm9zc1RpbGUsIGJvc3NJZF0gb2YgYm9zc2VzKSB7XG4gICAgY29uc3QgbG9jID0gYm9zc1RpbGUgPj4gMTY7XG4gICAgY29uc3QgcmFnZSA9IGJvc3NJZCA9PT0gMHhjMztcbiAgICBjb25zdCBib3NzID0gIXJhZ2UgPyByb20uYm9zc2VzLmZyb21Mb2NhdGlvbihsb2MpIDogcm9tLmJvc3Nlcy5yYWdlO1xuICAgIGlmIChsb2MgPT09IDB4YTAgfHwgbG9jID09PSAweDVmKSBjb250aW51ZTsgLy8gc2tpcCBzdGF0dWVzIGFuZCBkeW5hXG4gICAgaWYgKCFib3NzIHx8IGJvc3Mua2lsbCA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoYGJhZCBib3NzIGF0IGxvYyAke2xvYy50b1N0cmluZygxNil9YCk7XG4gICAgLy8gVE9ETyAtIHNodWZmbGUgUmFnZSdzIGRlbWFuZFxuICAgIGNvbnN0IGtpbGwgPSBCb3NzKGJvc3Mua2lsbCk7XG5cbiAgICBjb25zdCBtZXJnZSA9IG1lbW9pemUoKHQ6IFRlcnJhaW4pID0+IFRlcnJhaW4ubWVldCh0LCB7ZXhpdDoga2lsbCwgZXhpdFNvdXRoOiBraWxsfSkpO1xuICAgIGNvbnN0IHRpbGVCYXNlID0gYm9zc1RpbGUgJiB+MHhmZjtcbiAgICBjb25zdCBjb25kaXRpb24gPSBvdmVybGF5LmJvc3NSZXF1aXJlbWVudHMoYm9zcyk7XG4gICAgY29uc3QgY2hlY2sgPSB7c2xvdDogU2xvdChraWxsKSwgY29uZGl0aW9ufTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDB4ZjA7IGkrKykge1xuICAgICAgY29uc3QgdGlsZSA9IFRpbGVJZCh0aWxlQmFzZSB8IGkpO1xuICAgICAgY29uc3QgdCA9IHRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgIGlmICghdCkgY29udGludWU7XG4gICAgICB0ZXJyYWlucy5zZXQodGlsZSwgbWVyZ2UodCkpO1xuICAgICAgY2hlY2tzLmdldCh0aWxlKS5hZGQoY2hlY2spO1xuICAgIH1cbiAgICAvLyBjb25zdCBjaGVja1RpbGUgPSByYWdlID8gVGlsZUlkKHRpbGVCYXNlIHwgMHg4OCkgOiBib3NzVGlsZTtcbiAgfVxuXG4gIGZvciAoY29uc3QgY2hlY2sgb2Ygb3ZlcmxheS5sb2NhdGlvbnMoKSB8fCBbXSkge1xuICAgIGNoZWNrcy5nZXQoY2hlY2sudGlsZSkuYWRkKGNoZWNrKTtcbiAgfVxuXG4gIC8vIGxldCBzID0gMTtcbiAgLy8gY29uc3Qgd2VhayA9IG5ldyBXZWFrTWFwPG9iamVjdCwgbnVtYmVyPigpO1xuICAvLyBmdW5jdGlvbiB1aWQoeDogdW5rbm93bik6IG51bWJlciB7XG4gIC8vICAgaWYgKHR5cGVvZiB4ICE9PSAnb2JqZWN0JyB8fCAheCkgcmV0dXJuIC0xO1xuICAvLyAgIGlmICghd2Vhay5oYXMoeCkpIHdlYWsuc2V0KHgsIHMrKyk7XG4gIC8vICAgcmV0dXJuIHdlYWsuZ2V0KHgpIHx8IC0xO1xuICAvLyB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB3ZSd2ZSBnb3QgYSBmdWxsIG1hcHBpbmcgb2YgYWxsIHRlcnJhaW5zIHBlciBsb2NhdGlvbi5cbiAgLy8gTm93IHdlIGRvIGEgZ2lhbnQgdW5pb25maW5kIGFuZCBlc3RhYmxpc2ggY29ubmVjdGlvbnMgYmV0d2VlbiBzYW1lIGFyZWFzLlxuICBjb25zdCB0aWxlcyA9IG5ldyBVbmlvbkZpbmQ8VGlsZUlkPigpO1xuICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0ZXJyYWlucykge1xuICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICBpZiAodGVycmFpbnMuZ2V0KHgxKSA9PT0gdGVycmFpbikgdGlsZXMudW5pb24oW3RpbGUsIHgxXSk7XG4gICAgY29uc3QgeTEgPSBUaWxlSWQuYWRkKHRpbGUsIDEsIDApO1xuICAgIGlmICh0ZXJyYWlucy5nZXQoeTEpID09PSB0ZXJyYWluKSB0aWxlcy51bmlvbihbdGlsZSwgeTFdKTtcbiAgICAvLyBjb25zb2xlLmxvZyhgJHtoZXgodGlsZSl9OiAke3VpZCh0ZXJyYWluKX1gKTtcbiAgICAvLyBjb25zb2xlLmxvZyh0ZXJyYWluKTtcbiAgICAvLyBjb25zb2xlLmxvZyhgICt4OiAke2hleCh4MSl9OiAke3VpZCh0ZXJyYWlucy5nZXQoeDEpKX1gKTtcbiAgICAvLyBjb25zb2xlLmxvZyhgICt5OiAke2hleCh5MSl9OiAke3VpZCh0ZXJyYWlucy5nZXQoeTEpKX1gKTtcbiAgfVxuXG4gIC8vIEFkZCBleGl0cyB0byBhIG1hcC4gIFdlIGRvIHRoaXMgKmFmdGVyKiB0aGUgaW5pdGlhbCB1bmlvbmZpbmQgc28gdGhhdFxuICAvLyB0d28td2F5IGV4aXRzIGNhbiBiZSB1bmlvbmVkIGVhc2lseS5cbiAgY29uc3QgZXhpdFNldCA9IG5ldyBTZXQ8VGlsZVBhaXI+KCk7XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucy8qLnNsaWNlKDAsMikqLykge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgY29udGludWU7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIGxvY2F0aW9uLmV4aXRzKSB7XG4gICAgICBjb25zdCB7ZGVzdCwgZW50cmFuY2V9ID0gZXhpdDtcbiAgICAgIGNvbnN0IGZyb20gPSBUaWxlSWQuZnJvbShsb2NhdGlvbiwgZXhpdCk7XG4gICAgICAvLyBIYW5kbGUgc2VhbWxlc3MgZXhpdHNcbiAgICAgIGNvbnN0IHRvID0gZW50cmFuY2UgJiAweDIwID9cbiAgICAgICAgICBUaWxlSWQoZnJvbSAmIDB4ZmZmZiB8IChkZXN0IDw8IDE2KSkgOlxuICAgICAgICAgIFRpbGVJZC5mcm9tKHtpZDogZGVzdH0gYXMgYW55LCByb20ubG9jYXRpb25zW2Rlc3RdLmVudHJhbmNlc1tlbnRyYW5jZV0pO1xuICAgICAgLy8gTk9URTogd2UgY291bGQgc2tpcCBhZGRpbmcgZXhpdHMgaWYgdGhlIHRpbGVzIGFyZSBub3Qga25vd25cbiAgICAgIGV4aXRTZXQuYWRkKFRpbGVQYWlyLm9mKHRpbGVzLmZpbmQoZnJvbSksIHRpbGVzLmZpbmQodG8pKSk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgZXhpdCBvZiBleGl0U2V0KSB7XG4gICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgIGlmICh0ZXJyYWlucy5nZXQoZnJvbSkgIT09IHRlcnJhaW5zLmdldCh0bykpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHJldmVyc2UgPSBUaWxlUGFpci5vZih0bywgZnJvbSk7XG4gICAgaWYgKGV4aXRTZXQuaGFzKHJldmVyc2UpKSB7XG4gICAgICB0aWxlcy51bmlvbihbZnJvbSwgdG9dKTtcbiAgICAgIGV4aXRTZXQuZGVsZXRlKGV4aXQpO1xuICAgICAgZXhpdFNldC5kZWxldGUocmV2ZXJzZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gTm93IGxvb2sgZm9yIGFsbCBkaWZmZXJlbnQtdGVycmFpbiBuZWlnaGJvcnMgYW5kIHRyYWNrIGNvbm5lY3Rpb25zLlxuICBjb25zdCBuZWlnaGJvcnMgPSBuZXcgTmVpZ2hib3JzKHRpbGVzLCBhbGxFeGl0cyk7XG4gIGZvciAoY29uc3QgW3RpbGUsIHRlcnJhaW5dIG9mIHRlcnJhaW5zKSB7XG4gICAgY29uc3QgeDEgPSBUaWxlSWQuYWRkKHRpbGUsIDAsIDEpO1xuICAgIGNvbnN0IHR4MSA9IHRlcnJhaW5zLmdldCh4MSk7XG4gICAgaWYgKHR4MSAmJiB0eDEgIT09IHRlcnJhaW4pIG5laWdoYm9ycy5hZGRBZGphY2VudCh0aWxlLCB4MSwgZmFsc2UpO1xuICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICBjb25zdCB0eTEgPSB0ZXJyYWlucy5nZXQoeTEpO1xuICAgIGlmICh0eTEgJiYgdHkxICE9PSB0ZXJyYWluKSBuZWlnaGJvcnMuYWRkQWRqYWNlbnQodGlsZSwgeTEsIHRydWUpO1xuICB9XG5cbiAgLy8gQWxzbyBhZGQgYWxsIHRoZSByZW1haW5pbmcgZXhpdHMuICBXZSBkZWNvbXBvc2UgYW5kIHJlY29tcG9zZSB0aGVtIHRvXG4gIC8vIHRha2UgYWR2YW50YWdlIG9mIGFueSBuZXcgdW5pb25zIGZyb20gdGhlIHByZXZpb3VzIGV4aXQgc3RlcC5cbiAgZm9yIChjb25zdCBleGl0IG9mIGV4aXRTZXQpIHtcbiAgICBjb25zdCBbZnJvbSwgdG9dID0gVGlsZVBhaXIuc3BsaXQoZXhpdCk7XG4gICAgaWYgKCF0ZXJyYWlucy5oYXMoZnJvbSkgfHwgIXRlcnJhaW5zLmhhcyh0bykpIGNvbnRpbnVlO1xuICAgIG5laWdoYm9ycy5hZGRFeGl0KGZyb20sIHRvKTtcbiAgfVxuXG4gIC8vIFRPRE8gLSBoYXJkY29kZSBzb21lIGV4aXRzXG4gIC8vICAtIHRoZSB0cmFuc2l0aW9uIGZyb20gJDUxIHRvICQ2MCBpcyBpbXBhc3NpYmxlIG9uIGJvdGggc2lkZXM6XG4gIC8vICAgIGFkZCBhIGNvbmRpdGlvbmFsIGV4aXQgZnJvbSB0aGUgYm9hdCB0aWxlIHRvIHRoZSBiZWFjaCAoYm90aCB3YXlzKVxuICAvLyAgLSBzb21lIHRyYW5zaXRpb25zIGluIHRoZSB0b3dlciBhcmUgb24gdG9wIG9mIGltcGFzc2libGUtbG9va2luZyB0aWxlc1xuXG4gIGNvbnN0IHJvdXRlcyA9IG5ldyBSb3V0ZXMoKTtcbiAgZm9yIChjb25zdCByIG9mIG92ZXJsYXkuZXh0cmFSb3V0ZXMoKSkge1xuICAgIGZvciAoY29uc3QgYyBvZiByLmNvbmRpdGlvbiB8fCBbW11dKSB7XG4gICAgICByb3V0ZXMuYWRkUm91dGUodGlsZXMuZmluZChyLnRpbGUpLCBjKTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCB7ZnJvbSwgdG8sIGNvbmRpdGlvbn0gb2Ygb3ZlcmxheS5leHRyYUVkZ2VzKCkpIHtcbiAgICBmb3IgKGNvbnN0IGRlcHMgb2YgY29uZGl0aW9uIHx8IFtbXV0pIHtcbiAgICAgIHJvdXRlcy5hZGRFZGdlKHRpbGVzLmZpbmQodG8pLCB0aWxlcy5maW5kKGZyb20pLCBkZXBzKTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCB7ZnJvbSwgdG8sIHNvdXRofSBvZiBuZWlnaGJvcnMpIHtcbiAgICAvLyBhbGwgdGVycmFpbnMgYWRkZWQsIHNvIGNhbiBjb25uZWN0LlxuICAgIGNvbnN0IGYgPSB0ZXJyYWlucy5nZXQoZnJvbSk7XG4gICAgY29uc3QgdCA9IHRlcnJhaW5zLmdldCh0byk7XG4gICAgaWYgKCFmIHx8ICF0KSB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgdGVycmFpbiAke2YgPyB0byA6IGZyb219YCk7XG4gICAgZm9yIChjb25zdCBleGl0IG9mIChzb3V0aCA/IGYuZXhpdFNvdXRoIDogZi5leGl0KSB8fCBbW11dKSB7XG4gICAgICBmb3IgKGNvbnN0IGVudHJhbmNlIG9mIHQuZW50ZXIgfHwgW1tdXSkge1xuICAgICAgICByb3V0ZXMuYWRkRWRnZSh0bywgZnJvbSwgWy4uLmVudHJhbmNlLCAuLi5leGl0XSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVxcyA9IG5ldyBEZWZhdWx0TWFwPFNsb3QsIE11dGFibGVSZXF1aXJlbWVudD4oKCkgPT4gbmV3IE11dGFibGVSZXF1aXJlbWVudCgpKTtcbiAgLy8gTm93IHdlIGFkZCB0aGUgc2xvdHMuXG4gIC8vIE5vdGUgdGhhdCB3ZSBuZWVkIGEgd2F5IHRvIGVuc3VyZSB0aGF0IGFsbCB0aGUgcmlnaHQgc3BvdHMgZ2V0IHVwZGF0ZWRcbiAgLy8gd2hlbiB3ZSBmaWxsIGEgc2xvdC4gIE9uZSB3YXkgaXMgdG8gb25seSB1c2UgdGhlIDJ4eCBmbGFncyBpbiB0aGUgdmFyaW91c1xuICAvLyBwbGFjZXMgZm9yIHRoaW5ncyB0aGF0IHNob3VsZCBiZSByZXBsYWNlZCB3aGVuIHRoZSBzbG90IGlzIGZpbGxlZC5cbiAgLy9cbiAgLy8gRm9yIHRoZSBhY3R1YWwgc2xvdHMsIHdlIGtlZXAgdHJhY2sgb2Ygd2hlcmUgdGhleSB3ZXJlIGZvdW5kIGluIGEgc2VwYXJhdGVcbiAgLy8gZGF0YSBzdHJ1Y3R1cmUgc28gdGhhdCB3ZSBjYW4gZmlsbCB0aGVtLlxuXG4gIC8vIEFkZCBmaXhlZCBjYXBhYmlsaXRpZXNcbiAgZm9yIChjb25zdCB7Y29uZGl0aW9uID0gW1tdXSwgY2FwYWJpbGl0eX0gb2Ygb3ZlcmxheS5jYXBhYmlsaXRpZXMoKSkge1xuICAgIHJlcXMuZ2V0KFNsb3QoY2FwYWJpbGl0eSkpLmFkZEFsbChjb25kaXRpb24pO1xuICB9XG5cbiAgLy8gQ29uc29saWRhdGUgYWxsIHRoZSBjaGVja3MgaW50byBhIHNpbmdsZSBzZXQuXG4gIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrc2V0XSBvZiBjaGVja3MpIHtcbiAgICBjb25zdCByb290ID0gdGlsZXMuZmluZCh0aWxlKTtcbiAgICBpZiAodGlsZSA9PT0gcm9vdCkgY29udGludWU7XG4gICAgZm9yIChjb25zdCBjaGVjayBvZiBjaGVja3NldCkge1xuICAgICAgY2hlY2tzLmdldChyb290KS5hZGQoY2hlY2spO1xuICAgIH1cbiAgICBjaGVja3MuZGVsZXRlKHRpbGUpO1xuICB9XG5cbiAgLy8gTm93IGFsbCBrZXlzIGFyZSB1bmlvbmZpbmQgcm9vdHMuXG4gIGZvciAoY29uc3QgW3RpbGUsIGNoZWNrc2V0XSBvZiBjaGVja3MpIHtcbiAgICBmb3IgKGNvbnN0IHtzbG90LCBjb25kaXRpb24gPSBbW11dfSBvZiBjaGVja3NldCkge1xuICAgICAgY29uc3QgcmVxID0gcmVxcy5nZXQoc2xvdCk7XG4gICAgICBmb3IgKGNvbnN0IHIxIG9mIGNvbmRpdGlvbikge1xuICAgICAgICBmb3IgKGNvbnN0IHIyIG9mIHJvdXRlcy5yb3V0ZXMuZ2V0KHRpbGUpIHx8IFtdKSB7XG4gICAgICAgICAgcmVxLmFkZExpc3QoWy4uLnIxLCAuLi5yMl0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gTm90ZTogYXQgdGhpcyBwb2ludCB3ZSd2ZSBidWlsdCB1cCB0aGUgbWFpbiBpbml0aWFsIGxvY2F0aW9uIGxpc3QuXG4gIC8vIFdlIG5lZWQgdG8gcmV0dXJuIHNvbWV0aGluZyB1c2VmdWwgb3V0IG9mIGl0LlxuICAvLyAgLSBzb21lIGludGVyZmFjZSB0aGF0IGNhbiBiZSB1c2VkIGZvciBhc3N1bWVkLWZpbGwgbG9naWMuXG4gIC8vICAtIHdhbnQgYSB1c2FibGUgdG9TdHJpbmcgZm9yIHNwb2lsZXIgbG9nLlxuICAvLyAgLSB3b3VsZCBiZSBuaWNlIHRvIGhhdmUgcGFja2VkIGJpZ2ludHMgaWYgcG9zc2libGU/XG4gIC8vIEFueSBzbG90cyB0aGF0IGFyZSBOT1QgcmVxdWlyZW1lbnRzIHNob3VsZCBiZSBmaWx0ZXJlZCBvdXRcblxuICAvLyBCdWlsZCB1cCBhIGdyYXBoPyE/XG4gIC8vIFdpbGwgbmVlZCB0byBtYXAgdG8gc21hbGxlciBudW1iZXJzP1xuICAvLyBDYW4gd2UgY29tcHJlc3MgbGF6aWx5P1xuICAvLyAgLSBldmVyeXRoaW5nIHdlIHNlZSBhcyBhIHJlcXVpcmVtZW50IGdvZXMgaW50byBvbmUgbGlzdC9tYXBcbiAgLy8gIC0gZXZlcnl0aGluZyB3ZSBzZWUgYXMgYSBcImdldFwiIGdvZXMgaW50byBhbm90aGVyXG4gIC8vICAtIGZpbGxpbmcgbWFwcyBiZXR3ZWVuIHRoZW1cbiAgLy8gc3RhcnQgYXQgZW50cmFuY2UsIGJ1aWxkIGZ1bGwgcmVxdWlyZW1lbnRzIGZvciBlYWNoIHBsYWNlXG4gIC8vIGZvbGxvdyBleGl0czpcbiAgLy8gIC0gZm9yIGVhY2ggZXhpdCwgdXBkYXRlIHJlcXVpcmVtZW50cywgcXVldWUgcmVjaGVjayBpZiBjaGFuZ2VkXG4gIC8vICAtIHdlIGNvdWxkIGRvIGEgbGVzcy10aG9yb3VnaCB2ZXJzaW9uOlxuICAvLyAgICAgLSBzdGFydCBhdCBlbnRyYW5jZSwgYWRkIChvcGVuKSByZXF1aXJlbWVudFxuICAvLyAgICAgLSBxdWV1ZSBhbGwgZXhpdHMsIGlnbm9yaW5nIGFueSBhbHJlYWR5IHNlZW5cbiAgLy8gICAgICAga2VlcCB0cmFjayBvZiB3aGljaCBsb2NhdGlvbnMgaGFkIGNoYW5nZWQgcmVxc1xuICAvLyAgICAgLSBvbmNlIHF1ZXVlIGZsdXNoZXMsIHJlcGxhY2UgcXVldWUgd2l0aCBjaGFuZ2VkXG4gIC8vICAgICAtIHJlcGVhdCB1bnRpbCBjaGFuZ2VkIGlzIGVtcHR5IGF0IGVuZCBvZiBxdWV1ZVxuXG4gIC8vIEZvciBtb25zdGVycyAtIGZpZ3VyZSBvdXQgd2hpY2ggc3dvcmRzIGxlYWQgdG8gbW9uZXlcbiAgICAgICAgLy8gaWYgKCEoZWxlbWVudHMgJiAweDEpKSBtb25leVN3b3Jkcy5hZGQoMCk7XG4gICAgICAgIC8vIGlmICghKGVsZW1lbnRzICYgMHgyKSkgbW9uZXlTd29yZHMuYWRkKDEpO1xuICAgICAgICAvLyBpZiAoIShlbGVtZW50cyAmIDB4NCkpIG1vbmV5U3dvcmRzLmFkZCgyKTtcbiAgICAgICAgLy8gaWYgKCEoZWxlbWVudHMgJiAweDgpKSBtb25leVN3b3Jkcy5hZGQoMyk7XG5cbiAgLy8gY29uc3QgZW50cmFuY2UgPSByb20ubG9jYXRpb25zW3N0YXJ0XS5lbnRyYW5jZXNbMF07XG4gIC8vIHRoaXMuYWRkRW50cmFuY2UocGFyc2VDb29yZChzdGFydCwgZW50cmFuY2UpKTtcblxuICBpZiAoREVCVUcgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zdCB3ID0gd2luZG93IGFzIGFueTtcbiAgICBjb25zb2xlLmxvZyh3LnJvb3RzID0gKHcudGlsZXMgPSB0aWxlcykucm9vdHMoKSk7XG4gICAgY29uc29sZS5sb2coWy4uLih3Lm5laWdoYm9ycyA9IG5laWdoYm9ycyldKTtcbiAgICBjb25zb2xlLmxvZyh3LmxsID0gcm91dGVzKTtcblxuICAgIGZ1bmN0aW9uIGgoeDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICAgIHJldHVybiB4IDwgMCA/ICd+JyArICh+eCkudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJykgOlxuICAgICAgICAgIHgudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDMsICcwJyk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRuZih4OiBJdGVyYWJsZTxJdGVyYWJsZTxudW1iZXI+PiwgZiA9IGgpOiBzdHJpbmcge1xuICAgICAgY29uc3QgeHMgPSBbLi4ueF07XG4gICAgICBpZiAoIXhzLmxlbmd0aCkgcmV0dXJuICdubyByb3V0ZSc7XG4gICAgICByZXR1cm4gJygnICsgeHMubWFwKHkgPT4gWy4uLnldLm1hcChmKS5qb2luKCcgJiAnKSlcbiAgICAgICAgICAuam9pbignKSB8XFxuICAgICAoJykgKyAnKSc7XG4gICAgfVxuICAgIHcuYXJlYSA9ICh0aWxlOiBUaWxlSWQsIGY6ICh4OiBudW1iZXIpID0+IHN0cmluZyA9IGgpID0+IHtcbiAgICAgIGNvbnN0IHMgPSBbLi4udGlsZXMuc2V0cygpLmZpbHRlcihzID0+IHMuaGFzKHRpbGUpKVswXV1cbiAgICAgICAgICAubWFwKHggPT4geC50b1N0cmluZygxNikucGFkU3RhcnQoNiwgJzAnKSk7XG4gICAgICAvLyBjb25zdCByID0gJygnICsgWy4uLnJvdXRlcy5yb3V0ZXMuZ2V0KHRpbGVzLmZpbmQodGlsZSkpXVxuICAgICAgLy8gICAgIC5tYXAocyA9PiBbLi4uc10ubWFwKHggPT4geCA8IDAgPyAnficgKyAofngpLnRvU3RyaW5nKDE2KSA6XG4gICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgeC50b1N0cmluZygxNikpLmpvaW4oJyAmICcpKVxuICAgICAgLy8gICAgIC5qb2luKCcpIHwgKCcpICsgJyknO1xuICAgICAgY29uc3QgciA9IGRuZihyb3V0ZXMucm91dGVzLmdldCh0aWxlcy5maW5kKHRpbGUpKSwgZik7XG4gICAgICAvLyBuZWlnaGJvcnNcbiAgICAgIGNvbnN0IGVkZ2VzID0gW107XG4gICAgICBjb25zdCB0ID0gdGlsZXMuZmluZCh0aWxlKTtcbiAgICAgIGZvciAoY29uc3Qgb3V0IG9mIChyb3V0ZXMuZWRnZXMuZ2V0KHQpIHx8IG5ldyBNYXAoKSkudmFsdWVzKCkpIHtcbiAgICAgICAgZWRnZXMucHVzaChgXFxudG8gJHtvdXQudGFyZ2V0LnRvU3RyaW5nKDE2KX0gaWYgKCR7XG4gICAgICAgICAgICAgICAgICAgIFsuLi5vdXQuZGVwc10ubWFwKGYpLmpvaW4oJyAmICcpfSlgKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgW2Zyb20sIHJzXSBvZiByb3V0ZXMuZWRnZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCB0byBvZiBycy52YWx1ZXMoKSkge1xuICAgICAgICAgIGlmICh0by50YXJnZXQgIT09IHQpIGNvbnRpbnVlO1xuICAgICAgICAgIGVkZ2VzLnB1c2goYFxcbmZyb20gJHtmcm9tLnRvU3RyaW5nKDE2KX0gaWYgKCR7XG4gICAgICAgICAgICAgICAgICAgICAgWy4uLnRvLmRlcHNdLm1hcChmKS5qb2luKCcgJiAnKX0pYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIGdyb3VwKGFycjogdW5rbm93bltdLCBjb3VudDogbnVtYmVyLCBzcGFjZXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSBjb3VudCkge1xuICAgICAgICAgIG91dC5wdXNoKGFyci5zbGljZShpLCBpICsgY291bnQpLmpvaW4oc3BhY2VyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBgJHtoZXgodCl9XFxuJHtncm91cChzLCAxNiwgJyAnKS5qb2luKCdcXG4nKX1cXG5jb3VudCA9ICR7XG4gICAgICAgICAgICAgIHMubGVuZ3RofVxcbnJvdXRlcyA9ICR7cn0ke2VkZ2VzLmpvaW4oJycpfWA7XG4gICAgfTtcblxuICAgIHcud2hhdEZsYWcgPSAoZjogbnVtYmVyKSA9PiBjb25kaXRpb25OYW1lKGYsIHJvbSk7XG5cbiAgICB3LnJlcXMgPSByZXFzO1xuICAgIGNvbnNvbGUubG9nKCdyZXFzXFxuJyArIFsuLi5yZXFzXS5zb3J0KChbYV0sIFtiXSkgPT4gYSAtIGIpXG4gICAgICAgICAgICAgICAgLm1hcCgoW3MsIHJdKSA9PiBgJHt3LndoYXRGbGFnKHMpfTogJHtkbmYocix3LndoYXRGbGFnKX1gKVxuICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSk7XG5cbiAgICB3LnJlcXMuY2hlY2sgPVxuICAgICAgICAoaWQ6IG51bWJlciwgZjogKChmbGFnOiBudW1iZXIpID0+IHN0cmluZykgPSBoKTogc3RyaW5nID0+XG4gICAgICAgICAgICBgJHtmKGlkKX06ICR7ZG5mKHJlcXMuZ2V0KFNsb3QoaWQpKSwgZil9YDtcbiAgICB3LnJlcXMuY2hlY2syID0gKGlkOiBudW1iZXIpOiBzdHJpbmcgPT4gdy5yZXFzLmNoZWNrKGlkLCB3LndoYXRGbGFnKTtcbiAgfVxuXG4gIC8vIFN1bW1hcnk6IDEwNTUgcm9vdHMsIDE3MjQgbmVpZ2hib3JzXG4gIC8vIFRoaXMgaXMgdG9vIG11Y2ggZm9yIGEgZnVsbCBncmFwaCB0cmF2ZXJzYWwsIGJ1dCBtYW55IGNhbiBiZSByZW1vdmVkPz8/XG4gIC8vICAgLT4gc3BlY2lmaWNhbGx5IHdoYXQ/XG5cbiAgLy8gQWRkIGl0ZW1nZXRzIGFuZCBucGNzIHRvIHJvb3RzXG4gIC8vICAtIE5QQyB3aWxsIG5lZWQgdG8gY29tZSBmcm9tIGEgbWV0YXN0cnVjdHVyZSBvZiBzaHVmZmxlZCBOUENzLCBtYXliZT9cbiAgLy8gIC0tLSBpZiB3ZSBtb3ZlIGFrYWhhbmEgb3V0IG9mIGJyeW5tYWVyLCBuZWVkIHRvIGtub3cgd2hpY2ggaXRlbSBpcyB3aGljaFxuXG5cbiAgLy8gQnVpbGQgdXAgc2h1ZmZsZS5HcmFwaFxuICAvLyBGaXJzdCBmaWd1cmUgb3V0IHdoaWNoIGl0ZW1zIGFuZCBldmVudHMgYXJlIGFjdHVhbGx5IG5lZWRlZC5cbiAgbGV0IGZpbGxlZCA9IGlzSXRlbTtcbiAgaWYgKHRyYWNrZXIpIHtcbiAgICAvLyBwdWxsIG91dCBvdGhlciBiaXRzIHRvIGJlIGZpbGxlZCBpbi5cbiAgICBmaWxsZWQgPSBmdW5jdGlvbihjOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgIGlmIChpc0l0ZW0oYykpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKGZsYWdzLnNodWZmbGVCb3NzRWxlbWVudHMoKSAmJiBpc0Jvc3MoYykpIHJldHVybiB0cnVlO1xuICAgICAgLy8gVE9ETyAtIHdhbGxzP1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbmV3IFdvcmxkKHJvbSwgdGlsZXMsIG1ha2VHcmFwaChyZXFzLCByb20sIGZpbGxlZCkpO1xufVxuXG5mdW5jdGlvbiBpc0Jvc3MoYzogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiB+YyA+PSAweDEwMCAmJiB+YyA8IDB4MTEwO1xufVxuZnVuY3Rpb24gaXNJdGVtKGM6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gYyA+PSAweDIwMCAmJiBjIDwgMHgyODA7XG59XG5cbi8qKiBAcGFyYW0gZmxhZ3MgT25seSBpZiB0cmFja2VyICovXG5mdW5jdGlvbiBtYWtlR3JhcGgocmVxczogTWFwPFNsb3QsIE11dGFibGVSZXF1aXJlbWVudD4sXG4gICAgICAgICAgICAgICAgICAgcm9tOiBSb20sXG4gICAgICAgICAgICAgICAgICAgZmlsbGVkOiAoYzogbnVtYmVyKSA9PiBib29sZWFuKTogc2h1ZmZsZS5HcmFwaCB7XG4gIC8vIEZpZ3VyZSBvdXQgd2hpY2ggaXRlbXMgYXJlIHVzZWQsIGJ1aWxkIHR3byBzZXRzLlxuICBjb25zdCBhbGxDb25kaXRpb25zU2V0ID0gbmV3IFNldDxDb25kaXRpb24+KCk7XG4gIGNvbnN0IGFsbFNsb3RzU2V0ID0gbmV3IFNldDxTbG90PigpO1xuICBmb3IgKGNvbnN0IFtzbG90LCByZXFdIG9mIHJlcXMpIHtcbiAgICBhbGxTbG90c1NldC5hZGQoc2xvdCk7XG4gICAgZm9yIChjb25zdCBjcyBvZiByZXEpIHtcbiAgICAgIGZvciAoY29uc3QgYyBvZiBjcykge1xuICAgICAgICBhbGxDb25kaXRpb25zU2V0LmFkZChjKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gTm90aGluZyBkZXBlbmRzIG9uIHRoaXMgYnV0IHdlIHNob3VsZCB0cmFjayBpdCBhbnl3YXkuXG4gIGFsbENvbmRpdGlvbnNTZXQuYWRkKEJvc3MuRFJBWUdPTjJbMF1bMF0pO1xuXG4gIGNvbnN0IGFsbENvbmRpdGlvbnMgPSBbLi4uYWxsQ29uZGl0aW9uc1NldF0uZmlsdGVyKGMgPT4gIWZpbGxlZChjKSkuc29ydCgpO1xuICBjb25zdCBhbGxJdGVtcyA9IFsuLi5hbGxDb25kaXRpb25zU2V0XS5maWx0ZXIoZmlsbGVkKS5zb3J0KCk7XG4gIGNvbnN0IGFsbFNsb3RzID0gWy4uLmFsbFNsb3RzU2V0XS5maWx0ZXIoZmlsbGVkKS5zb3J0KCk7XG4gIGNvbnN0IGZpeGVkID0gYWxsQ29uZGl0aW9ucy5sZW5ndGg7XG5cbiAgZnVuY3Rpb24gbWFrZU5vZGUoY29uZGl0aW9uOiBudW1iZXIsIGluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4ge25hbWU6IGNvbmRpdGlvbk5hbWUoY29uZGl0aW9uLCByb20pLCBjb25kaXRpb24sIGluZGV4fSBhc1xuICAgICAgICBzaHVmZmxlLkl0ZW1Ob2RlICYgc2h1ZmZsZS5TbG90Tm9kZTtcbiAgfVxuICBmdW5jdGlvbiBpdGVtTm9kZShjb25kaXRpb246IG51bWJlciwgaW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG1ha2VOb2RlKGNvbmRpdGlvbiwgaW5kZXggKyBmaXhlZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW06IChjb25kaXRpb24gJiAweDdmKSBhcyBhbnl9KTtcbiAgfVxuICBjb25zdCBjb25kaXRpb25Ob2RlcyA9IGFsbENvbmRpdGlvbnMubWFwKG1ha2VOb2RlKTtcbiAgY29uc3QgaXRlbU5vZGVzID0gYWxsSXRlbXMubWFwKGl0ZW1Ob2RlKTtcbiAgY29uc3Qgc2xvdE5vZGVzID0gYWxsU2xvdHMubWFwKGl0ZW1Ob2RlKTtcblxuICBjb25zdCBpdGVtczogc2h1ZmZsZS5JdGVtTm9kZVtdID0gWy4uLmNvbmRpdGlvbk5vZGVzLCAuLi5pdGVtTm9kZXNdO1xuICBjb25zdCBzbG90czogc2h1ZmZsZS5TbG90Tm9kZVtdID0gWy4uLmNvbmRpdGlvbk5vZGVzLCAuLi5zbG90Tm9kZXNdO1xuXG4gIGNvbnN0IGl0ZW1JbmRleE1hcCA9XG4gICAgICBuZXcgTWFwPENvbmRpdGlvbiwgc2h1ZmZsZS5JdGVtSW5kZXg+KFxuICAgICAgICAgIGl0ZW1zLm1hcCgoYywgaSkgPT4gW2MuY29uZGl0aW9uIGFzIENvbmRpdGlvbiwgaSBhcyBzaHVmZmxlLkl0ZW1JbmRleF0pKTtcbiAgZnVuY3Rpb24gZ2V0SXRlbUluZGV4KGM6IENvbmRpdGlvbik6IHNodWZmbGUuSXRlbUluZGV4IHtcbiAgICBjb25zdCBpbmRleCA9IGl0ZW1JbmRleE1hcC5nZXQoYyk7XG4gICAgaWYgKGluZGV4ID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBpdGVtICQke2MudG9TdHJpbmcoMTYpfTogJHtjb25kaXRpb25OYW1lKGMsIHJvbSl9YCk7XG4gICAgfVxuICAgIHJldHVybiBpbmRleDtcbiAgfVxuICBjb25zdCBzbG90SW5kZXhNYXAgPVxuICAgICAgbmV3IE1hcDxTbG90LCBzaHVmZmxlLlNsb3RJbmRleD4oXG4gICAgICAgICAgc2xvdHMubWFwKChjLCBpKSA9PiBbYy5jb25kaXRpb24gYXMgU2xvdCwgaSBhcyBzaHVmZmxlLlNsb3RJbmRleF0pKTtcblxuICBjb25zdCBncmFwaDogQml0c1tdW10gPSBbXTtcbiAgY29uc3QgdW5sb2Nrc1NldDogQXJyYXk8U2V0PHNodWZmbGUuU2xvdEluZGV4Pj4gPSBbXTtcblxuICBmb3IgKGNvbnN0IFtzbG90LCByZXFdIG9mIHJlcXMpIHtcbiAgICAvLyBOT1RFOiBuZWVkIG1hcCBmcm9tIGZ1bGwgdG8gY29tcHJlc3NlZC5cbiAgICBjb25zdCBzID0gc2xvdEluZGV4TWFwLmdldChzbG90KTtcbiAgICBpZiAocyA9PSBudWxsKSB7XG4gICAgICBpZiAoTUFZQkVfTUlTU0lOR19TTE9UUy5oYXMoc2xvdCkpIGNvbnRpbnVlO1xuICAgICAgY29uc29sZS5lcnJvcihgTm90aGluZyBkZXBlbmRlZCBvbiAkJHtzbG90LnRvU3RyaW5nKDE2KX06ICR7XG4gICAgICAgICAgICAgICAgICAgICBjb25kaXRpb25OYW1lKHNsb3QsIHJvbSl9YCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBjcyBvZiByZXEpIHtcbiAgICAgIGNvbnN0IGlzID0gWy4uLmNzXS5tYXAoZ2V0SXRlbUluZGV4KTtcbiAgICAgIChncmFwaFtzXSB8fCAoZ3JhcGhbc10gPSBbXSkpLnB1c2goQml0cy5mcm9tKGlzKSk7XG4gICAgICBmb3IgKGNvbnN0IGkgb2YgaXMpIHtcbiAgICAgICAgKHVubG9ja3NTZXRbaV0gfHwgKHVubG9ja3NTZXRbaV0gPSBuZXcgU2V0KCkpKS5hZGQocyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIHNhbml0eSBjaGVjayB0byBtYWtlIHN1cmUgYWxsIHNsb3RzIGFyZSBwcm92aWRlZFxuICBmb3IgKGNvbnN0IG4gb2YgWy4uLmNvbmRpdGlvbk5vZGVzLCAuLi5zbG90Tm9kZXNdKSB7XG4gICAgLy8gaWYgKGkuaXRlbSAhPSBudWxsKSBjb250aW51ZTtcbiAgICBpZiAoIWdyYXBoW24uaW5kZXhdIHx8ICFncmFwaFtuLmluZGV4XS5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGMgPSBuLmNvbmRpdGlvbjtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYE5vdGhpbmcgcHJvdmlkZWQgJCR7Yy50b1N0cmluZygxNil9OiAke2NvbmRpdGlvbk5hbWUoYywgcm9tKVxuICAgICAgICAgICAgICAgICAgICAgfSAoaW5kZXggJHtuLmluZGV4fSlgKTtcbiAgICB9XG4gIH1cblxuICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKGdyYXBoKTtcblxuICBjb25zdCB1bmxvY2tzID0gdW5sb2Nrc1NldC5tYXAoeCA9PiBbLi4ueF0pO1xuICByZXR1cm4ge2ZpeGVkLCBzbG90cywgaXRlbXMsIGdyYXBoLCB1bmxvY2tzLCByb219O1xufVxuXG5jb25zdCBNQVlCRV9NSVNTSU5HX1NMT1RTID0gbmV3IFNldChbXG4gIDB4MDI1LCAvLyBoZWFsZWQgZG9scGhpbiwgb25seSBtYXR0ZXJzIGlmICdSZCcgaXMgc2V0LlxuICAweDAyNiwgLy8gZW50ZXJlZCBzaHlyb24sIG9ubHkgbWF0dGVycyBpZiAnR3QnIG5vdCBzZXQuXG4gIDB4MGE5LCAvLyBsZWFmIHJhYmJpdCBub3QgcmVxdWlyZWQgaWYgJ0ZyJyBub3Qgc2V0LlxuICAweDI0NCwgLy8gdGVsZXBvcnQgbWF5IG5vdCBiZSByZXF1aXJlZCBpZiAnRnAnIG5vdCBzZXQuXG5dKTtcblxuZnVuY3Rpb24gY29uZGl0aW9uTmFtZShmOiBudW1iZXIsIHJvbTogUm9tKTogc3RyaW5nIHtcbiAgY29uc3QgZW51bXMgPSB7Qm9zcywgRXZlbnQsIENhcGFiaWxpdHksIEl0ZW0sIE1hZ2ljfTtcbiAgZm9yIChjb25zdCBlbnVtTmFtZSBpbiBlbnVtcykge1xuICAgIGNvbnN0IGUgPSBlbnVtc1tlbnVtTmFtZSBhcyBrZXlvZiB0eXBlb2YgZW51bXNdIGFzIGFueTtcbiAgICBmb3IgKGNvbnN0IGVsZW0gaW4gZSkge1xuICAgICAgaWYgKGVbZWxlbV0gPT09IGYgfHwgQXJyYXkuaXNBcnJheShlW2VsZW1dKSAmJiBlW2VsZW1dWzBdWzBdID09PSBmKSB7XG4gICAgICAgIHJldHVybiBlbGVtLnJlcGxhY2UoLyhbQS1aXSkoW0EtWl0rKS9nLCAoXywgZiwgcykgPT4gZiArIHMudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXy9nLCAnICcpO1xuICAgICAgICAvL3JldHVybiBgJHtlbnVtTmFtZX0uJHtlbGVtfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgbCBvZiByb20ubG9jYXRpb25zKSB7XG4gICAgaWYgKCFsLnVzZWQpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZmwgb2YgbC5mbGFncykge1xuICAgICAgaWYgKGZsLmZsYWcgPT09IGYpIHtcbiAgICAgICAgcmV0dXJuIGBMb2NhdGlvbiAke2wuaWQudG9TdHJpbmcoMTYpfSAoJHtsLm5hbWV9KSBGbGFnICR7ZmwueXN9LCR7ZmwueHN9YDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGYgPCAwID8gYH4keyh+ZikudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJyl9YCA6XG4gICAgICBmLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpO1xufVxuXG4vLy8vLy8vLy8vLy8vXG5cbmNvbnN0IERFQlVHOiBib29sZWFuID0gZmFsc2U7XG4iXX0=