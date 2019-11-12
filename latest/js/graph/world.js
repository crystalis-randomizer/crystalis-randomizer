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
        const kill = Boss(boss.flag);
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
            if (flags.shuffleBossElements() && rom.bosses.isBossFlag(c))
                return true;
            return false;
        };
    }
    return new World(rom, tiles, makeGraph(reqs, rom, filled));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZ3JhcGgvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUMxRSxJQUFJLEVBQUUsT0FBTyxFQUFZLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEYsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNyQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDaEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN0QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFdEMsTUFBTSxFQUFFLEdBQUcsRUFBQyxHQUFHLEVBQVEsQ0FBQztBQVF4QixNQUFNLE9BQU8sS0FBSztJQUVoQixZQUFxQixHQUFRLEVBQ1IsS0FBd0IsRUFDeEIsS0FBb0I7UUFGcEIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFVBQUssR0FBTCxLQUFLLENBQW1CO1FBQ3hCLFVBQUssR0FBTCxLQUFLLENBQWU7SUFBRyxDQUFDO0lBRzdDLFFBQVEsQ0FBQyxLQUFvQixFQUFFLElBQWtC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SSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBQyxDQUFDO1FBQzVDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxDQUFDO2dCQUFFLFNBQVM7WUFDakIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDN0I7S0FFRjtJQUVELEtBQUssTUFBTSxLQUFLLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM3QyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDbkM7SUFZRCxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsRUFBVSxDQUFDO0lBQ3RDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxRQUFRLEVBQUU7UUFDdEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxPQUFPO1lBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssT0FBTztZQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUszRDtJQUlELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFZLENBQUM7SUFDcEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFpQjtRQUNuRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUk7WUFBRSxTQUFTO1FBQzdCLEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtZQUNqQyxNQUFNLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQyxHQUFHLElBQUksQ0FBQztZQUM5QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV6QyxNQUFNLEVBQUUsR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLEVBQUUsRUFBRSxJQUFJLEVBQVEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRTVFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzVEO0tBQ0Y7SUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtRQUMxQixNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQUUsU0FBUztRQUN0RCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN6QjtLQUNGO0lBR0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxRQUFRLEVBQUU7UUFDdEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0IsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLE9BQU87WUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkUsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0IsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLLE9BQU87WUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDbkU7SUFJRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtRQUMxQixNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUFFLFNBQVM7UUFDdkQsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDN0I7SUFPRCxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO0lBQzVCLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFO1FBQ3JDLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ25DLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDeEM7S0FDRjtJQUNELEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFO1FBQ3hELEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDcEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDeEQ7S0FDRjtJQUNELEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFDLElBQUksU0FBUyxFQUFFO1FBRXpDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3pELEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUN0QyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDbEQ7U0FDRjtLQUNGO0lBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQTJCLEdBQUcsRUFBRSxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBVXRGLEtBQUssTUFBTSxFQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBQyxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRTtRQUNuRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUM5QztJQUdELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxNQUFNLEVBQUU7UUFDckMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFJLElBQUksS0FBSyxJQUFJO1lBQUUsU0FBUztRQUM1QixLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRTtZQUM1QixNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM3QjtRQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDckI7SUFHRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksTUFBTSxFQUFFO1FBQ3JDLEtBQUssTUFBTSxFQUFDLElBQUksRUFBRSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBQyxJQUFJLFFBQVEsRUFBRTtZQUMvQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLEtBQUssTUFBTSxFQUFFLElBQUksU0FBUyxFQUFFO2dCQUMxQixLQUFLLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDOUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDN0I7YUFDRjtTQUNGO0tBQ0Y7SUFrQ0QsSUFBSSxLQUFLLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFO1FBQzFDLE1BQU0sQ0FBQyxHQUFHLE1BQWEsQ0FBQztRQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFFM0IsU0FBUyxDQUFDLENBQUMsQ0FBUztZQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDckQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxTQUFTLEdBQUcsQ0FBQyxDQUE2QixFQUFFLENBQUMsR0FBRyxDQUFDO1lBQy9DLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNsQixJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU07Z0JBQUUsT0FBTyxVQUFVLENBQUM7WUFDbEMsT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUM5QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTJCLENBQUMsRUFBRSxFQUFFO1lBQ3RELE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNsRCxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUsvQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXRELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNqQixNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzdELEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFDOUIsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNsRDtZQUNELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUNyQyxLQUFLLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDNUIsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUM7d0JBQUUsU0FBUztvQkFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQzFCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pEO2FBQ0Y7WUFDRCxTQUFTLEtBQUssQ0FBQyxHQUFjLEVBQUUsS0FBYSxFQUFFLE1BQWM7Z0JBQzFELE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztnQkFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFO29CQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztpQkFDaEQ7Z0JBQ0QsT0FBTyxHQUFHLENBQUM7WUFDYixDQUFDO1lBQ0QsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQ3pDLENBQUMsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyRCxDQUFDLENBQUM7UUFFRixDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRWxELENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUM3QyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7YUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFekIsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQ1IsQ0FBQyxFQUFVLEVBQUUsSUFBZ0MsQ0FBQyxFQUFVLEVBQUUsQ0FDdEQsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNsRCxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQVUsRUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN0RTtJQWFELElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUNwQixJQUFJLE9BQU8sRUFBRTtRQUVYLE1BQU0sR0FBRyxVQUFTLENBQVM7WUFDekIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBQzNCLElBQUksS0FBSyxDQUFDLG1CQUFtQixFQUFFLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBRXpFLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFBO0tBQ0Y7SUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUM3RCxDQUFDO0FBS0QsU0FBUyxNQUFNLENBQUMsQ0FBUztJQUN2QixPQUFPLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUNqQyxDQUFDO0FBR0QsU0FBUyxTQUFTLENBQUMsSUFBbUMsRUFDbkMsR0FBUSxFQUNSLE1BQThCO0lBRS9DLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWEsQ0FBQztJQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBUSxDQUFDO0lBQ3BDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUU7UUFDOUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixLQUFLLE1BQU0sRUFBRSxJQUFJLEdBQUcsRUFBRTtZQUNwQixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEIsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pCO1NBQ0Y7S0FDRjtJQUVELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFMUMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMzRSxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDN0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN4RCxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO0lBRW5DLFNBQVMsUUFBUSxDQUFDLFNBQWlCLEVBQUUsS0FBYTtRQUNoRCxPQUFPLEVBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFDdEIsQ0FBQztJQUMxQyxDQUFDO0lBQ0QsU0FBUyxRQUFRLENBQUMsU0FBaUIsRUFBRSxLQUFhO1FBQ2hELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsRUFDbEMsRUFBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFRLEVBQUMsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFDRCxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV6QyxNQUFNLEtBQUssR0FBdUIsQ0FBQyxHQUFHLGNBQWMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0sS0FBSyxHQUF1QixDQUFDLEdBQUcsY0FBYyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFFcEUsTUFBTSxZQUFZLEdBQ2QsSUFBSSxHQUFHLENBQ0gsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQXNCLEVBQUUsQ0FBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRixTQUFTLFlBQVksQ0FBQyxDQUFZO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1lBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssYUFBYSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDOUU7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFDRCxNQUFNLFlBQVksR0FDZCxJQUFJLEdBQUcsQ0FDSCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBaUIsRUFBRSxDQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTVFLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztJQUMzQixNQUFNLFVBQVUsR0FBa0MsRUFBRSxDQUFDO0lBRXJELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUU7UUFFOUIsTUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUU7WUFDYixJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUztZQUM1QyxPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUN4QyxhQUFhLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxTQUFTO1NBQ1Y7UUFDRCxLQUFLLE1BQU0sRUFBRSxJQUFJLEdBQUcsRUFBRTtZQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3JDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3ZEO1NBQ0Y7S0FDRjtJQUVELEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLGNBQWMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxFQUFFO1FBRWpELElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDN0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLGFBQWEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUMzRCxXQUFXLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZDO0tBQ0Y7SUFFRCxJQUFJLEtBQUs7UUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTlCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1QyxPQUFPLEVBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUMsQ0FBQztBQUNwRCxDQUFDO0FBRUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUNsQyxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0NBQ04sQ0FBQyxDQUFDO0FBRUgsU0FBUyxhQUFhLENBQUMsQ0FBUyxFQUFFLEdBQVE7SUFDeEMsTUFBTSxLQUFLLEdBQUcsRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFDLENBQUM7SUFDckQsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLEVBQUU7UUFDNUIsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQThCLENBQVEsQ0FBQztRQUN2RCxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNwQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNsRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztxQkFDN0QsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQzthQUVoQztTQUNGO0tBQ0Y7SUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUU7UUFDN0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQUUsU0FBUztRQUN0QixLQUFLLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7WUFDeEIsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDakIsT0FBTyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7YUFDM0U7U0FDRjtLQUNGO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFJRCxNQUFNLEtBQUssR0FBWSxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge05laWdoYm9ycywgU2NyZWVuSWQsIFRpbGVJZCwgVGlsZVBhaXJ9IGZyb20gJy4vZ2VvbWV0cnkuanMnO1xuaW1wb3J0IHtCb3NzLCBDaGVjaywgQ2FwYWJpbGl0eSwgQ29uZGl0aW9uLCBFdmVudCwgSXRlbSwgTWFnaWMsIE11dGFibGVSZXF1aXJlbWVudCxcbiAgICAgICAgU2xvdCwgVGVycmFpbiwgV2FsbFR5cGUsIG1lZXQsIG1lbW9pemUsIG1lbW9pemUyfSBmcm9tICcuL2NvbmRpdGlvbi5qcyc7XG5pbXBvcnQge092ZXJsYXl9IGZyb20gJy4vb3ZlcmxheS5qcyc7XG5pbXBvcnQge1JvdXRlc30gZnJvbSAnLi9yb3V0ZXMuanMnO1xuaW1wb3J0ICogYXMgc2h1ZmZsZSBmcm9tICcuL3NodWZmbGUuanMnO1xuaW1wb3J0IHtCaXRzfSBmcm9tICcuLi9iaXRzLmpzJztcbmltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge2hleH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge1VuaW9uRmluZH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7RGVmYXVsdE1hcH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmNvbnN0IHt9ID0ge2hleH0gYXMgYW55OyAvLyBmb3IgZGVidWdnaW5nXG5cbi8vIEEgdGlsZSBpcyBhIDI0LWJpdCBudW1iZXI6XG4vLyAgIDxsb2M+PHlzPjx4cz48eXQ+PHh0PlxuLy8gV2UgZG8gYSBnaWFudCBmbG9vZC1maWxsIG9mIHRoZSBlbnRpcmUgZ2FtZSwgc3RhcnRpbmcgYXQgJDAwMDA1NSBvciB3aGF0ZXZlci5cbi8vIEZpbGxpbmcgaXMgYSB1bmlvbi1maW5kLCBzbyB3ZSBzdGFydCBieSBhc3NpZ25pbmcgZWFjaCBlbGVtZW50IGl0c2VsZiwgYnV0XG4vLyB3aGVuIHdlIGZpbmQgYSBuZWlnaGJvciwgd2Ugam9pbiB0aGVtLlxuXG5leHBvcnQgY2xhc3MgV29ybGQge1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tLFxuICAgICAgICAgICAgICByZWFkb25seSB0aWxlczogVW5pb25GaW5kPFRpbGVJZD4sXG4gICAgICAgICAgICAgIHJlYWRvbmx5IGdyYXBoOiBzaHVmZmxlLkdyYXBoKSB7fVxuXG4gIC8vIERvZXMgYSBcImNoZWNrXCIgdHJhdmVyc2FsIG9mIGEgZmlsbCwgcG9wdWxhdGluZyB0aGUgc3BvaWxlciBsb2cuXG4gIHRyYXZlcnNlKGdyYXBoOiBzaHVmZmxlLkdyYXBoLCBmaWxsOiBzaHVmZmxlLkZpbGwpOiB2b2lkIHtcbiAgICBjb25zdCB7c3BvaWxlcn0gPSB0aGlzLnJvbTtcbiAgICBpZiAoIXNwb2lsZXIpIHJldHVybjtcbiAgICAvLyBUT0RPIC0gaW1wcm92ZSB0aGlzIVxuICAgIGZvciAobGV0IGkgPSAtMHgyMDA7IGkgPCAweDMwMDsgaSsrKSB7XG4gICAgICBzcG9pbGVyLmFkZENvbmRpdGlvbihpLCBjb25kaXRpb25OYW1lKGksIHRoaXMucm9tKSk7XG4gICAgfVxuICAgIC8vIERvIHRoZSB0cmF2ZXJzYWwgYW5kIGFkZCBhbGwgdGhlIHJvdXRlc1xuICAgIGZvciAoY29uc3QgW3NpLCAuLi5paXNdIG9mIHNodWZmbGUudHJhdmVyc2VGaWxsKGdyYXBoLCBmaWxsKSkge1xuICAgICAgY29uc3Qgc2xvdCA9IGdyYXBoLnNsb3RzW3NpXS5jb25kaXRpb247XG4gICAgICAvLyBjb25zdCBzbG90ID0gY29uZGl0aW9uTmFtZShncmFwaC5zbG90c1tzaV0uY29uZGl0aW9uLCB0aGlzLnJvbSk7XG4gICAgICBjb25zdCBpdGVtcyA9IGlpcy5tYXAoaWkgPT4gZ3JhcGguaXRlbXNbaWldLmNvbmRpdGlvbik7XG4gICAgICAvLyBjb25zdCBpdGVtcyA9IGlpcy5tYXAoaWkgPT4gY29uZGl0aW9uTmFtZShncmFwaC5pdGVtc1tpaV0uY29uZGl0aW9uLCB0aGlzLnJvbSkpO1xuICAgICAgY29uc3Qgc2xvdEl0ZW0gPSBmaWxsLnNsb3RzW2dyYXBoLnNsb3RzW3NpXS5pdGVtIV07XG4gICAgICBzcG9pbGVyLmFkZENoZWNrKHNsb3QsIGl0ZW1zLCBzbG90SXRlbSk7XG4gICAgICAvLyBjb25zdCBpdGVtID0gc2xvdEl0ZW0gIT0gbnVsbCA/XG4gICAgICAvLyAgICAgYCA9PiAke2NvbmRpdGlvbk5hbWUoMHgyMDAgfCBmaWxsLnNsb3RzW3Nsb3RJdGVtXSwgdGhpcy5yb20pfWAgOiAnJztcbiAgICAgIC8vIG91dC5wdXNoKGAke3Nsb3R9JHtpdGVtfTogWyR7aXRlbXMuam9pbignLCAnKX1dYCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGJ1aWxkKHJvbTogUm9tLCBmbGFncz86IEZsYWdTZXQsIHRyYWNrZXI/OiBib29sZWFuKTogV29ybGQge1xuICAgIHJldHVybiBidWlsZChyb20sIGZsYWdzLCB0cmFja2VyKTtcbiAgfVxufVxuXG4vLyBFeGl0cyBiZXR3ZWVuIGdyb3VwcyBvZiBkaWZmZXJlbnQgcmVhY2hhYmlsaXR5LlxuLy8gT3B0aW9uYWwgdGhpcmQgZWxlbWVudCBpcyBsaXN0IG9mIHJlcXVpcmVtZW50cyB0byB1c2UgdGhlIGV4aXQuXG4vLyBwcml2YXRlIHJlYWRvbmx5IGV4aXRzID0gbmV3IEFycmF5PFtudW1iZXIsIG51bWJlciwgbnVtYmVyW11bXT9dPigpO1xuXG4vLyBCbG9ja3MgZm9yIGFueSBnaXZlbiB0aWxlIGdyb3VwLlxuLy8gcHJpdmF0ZSByZWFkb25seSBibG9ja3MgPSBuZXcgQXJyYXk8W251bWJlciwgbnVtYmVyW11bXV0+KCk7XG5cbmZ1bmN0aW9uIGJ1aWxkKHJvbTogUm9tLCBmbGFncyA9IG5ldyBGbGFnU2V0KCdARnVsbFNodWZmbGUnKSwgdHJhY2tlciA9IGZhbHNlKTogV29ybGQgeyAgICBcbiAgLy8gMS4gc3RhcnQgd2l0aCBlbnRyYW5jZSAwIGF0IHRoZSBzdGFydCBsb2NhdGlvbiwgYWRkIGl0IHRvIHRoZSB0aWxlcyBhbmQgcXVldWUuXG4gIC8vIDIuIGZvciB0aWxlIFQgaW4gdGhlIHF1ZXVlXG4gIC8vICAgIC0gZm9yIGVhY2ggcGFzc2FibGUgbmVpZ2hib3IgTiBvZiBUOlxuICAvLyAgICAgIC0gaWYgTiBoYXMgdGhlIHNhbWUgcGFzc2FnZSBhcyBULCB1bmlvbiB0aGVtXG4gIC8vICAgICAgLSBpZiBOIGhhcyBkaWZmZXJlbnQgcGFzc2FnZSwgYWRkIGFuIGV4aXQgZnJvbSBUIHRvIE5cbiAgLy8gICAgICAtIGlmIE4gaXMgbm90IHlldCBzZWVuLCBhZGQgaXQgdG8gdGhlIHF1ZXVlXG4gIC8vIHBhc3NhZ2UgY2FuIGJlIG9uZSBvZjpcbiAgLy8gIC0gb3BlblxuICAvLyAgLSBibG9ja2VkKGl0ZW0vdHJpZ2dlciAtIGJvdGggYXJlIGp1c3QgbnVtYmVycy4uLilcbiAgLy8gIC0gb25lLXdheSBcblxuICAvLyBTdGFydCBieSBnZXR0aW5nIGEgZnVsbCBtYXAgb2YgYWxsIHRlcnJhaW5zIGFuZCBjaGVja3NcbiAgY29uc3Qgb3ZlcmxheSA9IG5ldyBPdmVybGF5KHJvbSwgZmxhZ3MsIHRyYWNrZXIpO1xuICBjb25zdCB0ZXJyYWlucyA9IG5ldyBNYXA8VGlsZUlkLCBUZXJyYWluPigpO1xuICBjb25zdCB3YWxscyA9IG5ldyBNYXA8U2NyZWVuSWQsIFdhbGxUeXBlPigpO1xuICBjb25zdCBib3NzZXMgPSBuZXcgTWFwPFRpbGVJZCwgbnVtYmVyPigpO1xuICBjb25zdCBucGNzID0gbmV3IE1hcDxUaWxlSWQsIG51bWJlcj4oKTtcbiAgY29uc3QgY2hlY2tzID0gbmV3IERlZmF1bHRNYXA8VGlsZUlkLCBTZXQ8Q2hlY2s+PigoKSA9PiBuZXcgU2V0KCkpO1xuICBjb25zdCBtb25zdGVycyA9IG5ldyBNYXA8VGlsZUlkLCBudW1iZXI+KCk7IC8vIGVsZW1lbnRhbCBpbW11bml0aWVzXG4gIGNvbnN0IGFsbEV4aXRzID0gbmV3IFNldDxUaWxlSWQ+KCk7XG5cbiAgZm9yIChjb25zdCBsb2NhdGlvbiBvZiByb20ubG9jYXRpb25zIC8qLnNsaWNlKDAsNCkqLykge1xuICAgIGlmICghbG9jYXRpb24udXNlZCkgY29udGludWU7XG4gICAgY29uc3QgZXh0ID0gbG9jYXRpb24uZXh0ZW5kZWQgPyAweDEwMCA6IDA7XG4gICAgY29uc3QgdGlsZXNldCA9IHJvbS50aWxlc2V0c1sobG9jYXRpb24udGlsZXNldCAmIDB4N2YpID4+IDJdO1xuICAgIGNvbnN0IHRpbGVFZmZlY3RzID0gcm9tLnRpbGVFZmZlY3RzW2xvY2F0aW9uLnRpbGVFZmZlY3RzIC0gMHhiM107XG5cbiAgICAvLyBGaW5kIGEgZmV3IHNwYXducyBlYXJseVxuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICAvLyBXYWxscyBuZWVkIHRvIGNvbWUgZmlyc3Qgc28gd2UgY2FuIGF2b2lkIGFkZGluZyBzZXBhcmF0ZVxuICAgICAgLy8gcmVxdWlyZW1lbnRzIGZvciBldmVyeSBzaW5nbGUgd2FsbCAtIGp1c3QgdXNlIHRoZSB0eXBlLlxuICAgICAgaWYgKHNwYXduLmlzV2FsbCgpKSB7XG4gICAgICAgIHdhbGxzLnNldChTY3JlZW5JZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIChzcGF3bi5pZCAmIDMpIGFzIFdhbGxUeXBlKTtcbiAgICAgIH1cblxuICAgICAgLy8gVE9ETyAtIGN1cnJlbnRseSB0aGlzIGlzIGJyb2tlbiAtXG4gICAgICAvLyAgIFsuLi5sbC5yb3V0ZXMucm91dGVzLmdldCh0aWxlcy5maW5kKDB4YTYwMDg4KSkudmFsdWVzKCldLm1hcChzID0+IFsuLi5zXS5tYXAoeCA9PiB4LnRvU3RyaW5nKDE2KSkuam9pbignICYgJykpXG4gICAgICAvLyBMaXN0cyA1IHRoaW5nczogZmxpZ2h0LCBicmVhayBpcm9uLCBtdCBzYWJyZSBwcmlzb24sIHN3YW4gZ2F0ZSwgY3J5cHQgZW50cmFuY2VcbiAgICAgIC8vICAgLSBzaG91bGQgYXQgbGVhc3QgcmVxdWlyZSBicmVha2luZyBzdG9uZSBvciBpY2U/XG5cbiAgICB9XG5cbiAgICAvLyBBZGQgdGVycmFpbnNcbiAgICBmb3IgKGxldCB5ID0gMCwgaGVpZ2h0ID0gbG9jYXRpb24uaGVpZ2h0OyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGxvY2F0aW9uLnNjcmVlbnNbeV07XG4gICAgICBjb25zdCByb3dJZCA9IGxvY2F0aW9uLmlkIDw8IDggfCB5IDw8IDQ7XG4gICAgICBmb3IgKGxldCB4ID0gMCwgd2lkdGggPSBsb2NhdGlvbi53aWR0aDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyZWVuID0gcm9tLnNjcmVlbnNbcm93W3hdIHwgZXh0XTtcbiAgICAgICAgY29uc3Qgc2NyZWVuSWQgPSBTY3JlZW5JZChyb3dJZCB8IHgpO1xuICAgICAgICBjb25zdCBmbGFnWXggPSBzY3JlZW5JZCAmIDB4ZmY7XG4gICAgICAgIGNvbnN0IHdhbGwgPSB3YWxscy5nZXQoc2NyZWVuSWQpO1xuICAgICAgICBjb25zdCBmbGFnID0gd2FsbCAhPSBudWxsID8gb3ZlcmxheS53YWxsQ2FwYWJpbGl0eSh3YWxsKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5mbGFncy5maW5kKGYgPT4gZi55eCA9PT0gZmxhZ1l4KTtcbiAgICAgICAgY29uc3Qgd2l0aEZsYWdNZW1vaXplZCA9IG1lbW9pemUyKCh0MTogVGVycmFpbiwgdDI6IFRlcnJhaW4pID0+IHtcbiAgICAgICAgICBpZiAoIWZsYWcpIHRocm93IG5ldyBFcnJvcihgZmxhZyBleHBlY3RlZGApO1xuICAgICAgICAgIHQyID0gey4uLnQyLCBlbnRlcjogbWVldCh0Mi5lbnRlciB8fCBbW11dLCBDb25kaXRpb24oZmxhZy5mbGFnKSl9O1xuICAgICAgICAgIHJldHVybiBUZXJyYWluLmpvaW4odDEsIHQyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIHdpdGhGbGFnKHQxOiBUZXJyYWluIHwgdW5kZWZpbmVkLCB0MjogVGVycmFpbiB8IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICghZmxhZykgdGhyb3cgbmV3IEVycm9yKGBmbGFnIGV4cGVjdGVkYCk7XG4gICAgICAgICAgaWYgKCF0MikgcmV0dXJuIHQxO1xuICAgICAgICAgIGlmICghdDEpIHJldHVybiBUZXJyYWluLm1lZXQoe2VudGVyOiBDb25kaXRpb24oZmxhZy5mbGFnKX0sIHQyKTtcbiAgICAgICAgICByZXR1cm4gd2l0aEZsYWdNZW1vaXplZCh0MSwgdDIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlkID0gVGlsZUlkKHNjcmVlbklkIDw8IDggfCB0KTtcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgaWYgKGZsYWcgJiYgZmxhZy5mbGFnID09PSAweDJlZiAmJiB0aWxlIDwgMHgyMCkgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICBjb25zdCBlZmZlY3RzID0gZXh0ID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV0gJiAweDI2O1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gb3ZlcmxheS5tYWtlVGVycmFpbihlZmZlY3RzLCB0aWQpO1xuICAgICAgICAgIGlmICh0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSAmJiBmbGFnICYmIGZsYWcuZmxhZyAhPT0gMHgyZWYpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0ZSA9XG4gICAgICAgICAgICAgICAgb3ZlcmxheS5tYWtlVGVycmFpbih0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXV0sIHRpZCk7XG4gICAgICAgICAgICB0ZXJyYWluID0gd2l0aEZsYWcodGVycmFpbiwgYWx0ZXJuYXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRlcnJhaW4pIHRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LmVudHJhbmNlICYgMHgyMCkge1xuICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgICBhbGxFeGl0cy5hZGQodGlsZSk7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gdGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgICBpZiAocHJldmlvdXMpIHRlcnJhaW5zLnNldCh0aWxlLCBUZXJyYWluLnNlYW1sZXNzKHByZXZpb3VzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmluZCBcInRlcnJhaW4gdHJpZ2dlcnNcIiB0aGF0IHByZXZlbnQgbW92ZW1lbnQgb25lIHdheSBvciBhbm90aGVyXG4gICAgZnVuY3Rpb24gbWVldFRlcnJhaW4odGlsZTogVGlsZUlkLCB0ZXJyYWluOiBUZXJyYWluKTogdm9pZCB7XG4gICAgICBjb25zdCBwcmV2aW91cyA9IHRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgIC8vIGlmIHRpbGUgaXMgaW1wb3NzaWJsZSB0byByZWFjaCwgZG9uJ3QgYm90aGVyLlxuICAgICAgaWYgKCFwcmV2aW91cykgcmV0dXJuO1xuICAgICAgdGVycmFpbnMuc2V0KHRpbGUsIFRlcnJhaW4ubWVldChwcmV2aW91cywgdGVycmFpbikpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIC8vIEZvciB0cmlnZ2Vycywgd2hpY2ggdGlsZXMgZG8gd2UgbWFyaz9cbiAgICAgICAgLy8gVGhlIHRyaWdnZXIgaGl0Ym94IGlzIDIgdGlsZXMgd2lkZSBhbmQgMSB0aWxlIHRhbGwsIGJ1dCBpdCBkb2VzIG5vdFxuICAgICAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgICAgICAvLyAkYyB3aWRlICh0aG91Z2ggaXQncyAkMTQgdGFsbCkgc28gdGhlcmUncyBzb21lIHNsaWdodCBkaXNwYXJpdHkuXG4gICAgICAgIC8vIEl0IHNlZW1zIGxpa2UgcHJvYmFibHkgbWFya2luZyBpdCBhcyAoeC0xLCB5LTEpIC4uICh4LCB5KSBtYWtlcyB0aGVcbiAgICAgICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAgICAgLy8gdGlsZSBzaG91bGQgZ28gZnJvbSB4IC4uIHgrMSBpbnN0ZWFkLlxuICAgICAgICBjb25zdCB0cmlnZ2VyID0gb3ZlcmxheS50cmlnZ2VyKHNwYXduLmlkKTtcbiAgICAgICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNoZWNraW5nIHRyaWdnZXIncyBhY3Rpb246ICQxOSAtPiBwdXNoLWRvd24gbWVzc2FnZVxuICAgICAgICBpZiAodHJpZ2dlci50ZXJyYWluIHx8IHRyaWdnZXIuY2hlY2spIHtcbiAgICAgICAgICBsZXQge3g6IHgwLCB5OiB5MH0gPSBzcGF3bjtcbiAgICAgICAgICB4MCArPSA4O1xuICAgICAgICAgIGZvciAoY29uc3QgbG9jIG9mIFtsb2NhdGlvbiwgLi4uKHRyaWdnZXIuZXh0cmFMb2NhdGlvbnMgfHwgW10pXSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBkeCBvZiB0cmlnZ2VyLmR4IHx8IFstMTYsIDBdKSB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZHkgb2YgWy0xNiwgMF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB4ID0geDAgKyBkeDtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0geTAgKyBkeTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jLCB7eCwgeX0pO1xuICAgICAgICAgICAgICAgIGlmICh0cmlnZ2VyLnRlcnJhaW4pIG1lZXRUZXJyYWluKHRpbGUsIHRyaWdnZXIudGVycmFpbik7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiB0cmlnZ2VyLmNoZWNrIHx8IFtdKSB7XG4gICAgICAgICAgICAgICAgICBjaGVja3MuZ2V0KHRpbGUpLmFkZChjaGVjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkpIHtcbiAgICAgICAgbnBjcy5zZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSwgc3Bhd24uaWQpO1xuICAgICAgICBjb25zdCBucGMgPSBvdmVybGF5Lm5wYyhzcGF3bi5pZCwgbG9jYXRpb24pO1xuICAgICAgICBpZiAobnBjLnRlcnJhaW4gfHwgbnBjLmNoZWNrKSB7XG4gICAgICAgICAgbGV0IHt4OiB4cywgeTogeXN9ID0gc3Bhd247XG4gICAgICAgICAgbGV0IHt4MCwgeDEsIHkwLCB5MX0gPSBucGMuaGl0Ym94IHx8IHt4MDogMCwgeTA6IDAsIHgxOiAxLCB5MTogMX07XG4gICAgICAgICAgZm9yIChsZXQgZHggPSB4MDsgZHggPCB4MTsgZHgrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgZHkgPSB5MDsgZHkgPCB5MTsgZHkrKykge1xuICAgICAgICAgICAgICBjb25zdCB4ID0geHMgKyAxNiAqIGR4O1xuICAgICAgICAgICAgICBjb25zdCB5ID0geXMgKyAxNiAqIGR5O1xuICAgICAgICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHt4LCB5fSk7XG4gICAgICAgICAgICAgIGlmIChucGMudGVycmFpbikgbWVldFRlcnJhaW4odGlsZSwgbnBjLnRlcnJhaW4pO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIG5wYy5jaGVjayB8fCBbXSkge1xuICAgICAgICAgICAgICAgIGNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgICAgICAvLyBhbmQgd2lsbCBhbHNvIGFkZCB0aGVpciBkcm9wLlxuICAgICAgICBib3NzZXMuc2V0KFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIHNwYXduLmlkKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNDaGVzdCgpKSB7XG4gICAgICAgIGNoZWNrcy5nZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSkuYWRkKENoZWNrLmNoZXN0KHNwYXduLmlkKSk7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIC8vIFRPRE8gLSBjb21wdXRlIG1vbmV5LWRyb3BwaW5nIG1vbnN0ZXIgdnVsbmVyYWJpbGl0aWVzIGFuZCBhZGQgYSB0cmlnZ2VyXG4gICAgICAgIC8vIGZvciB0aGUgTU9ORVkgY2FwYWJpbGl0eSBkZXBlbmRlbnQgb24gYW55IG9mIHRoZSBzd29yZHMuXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSByb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgICAgICBpZiAobW9uc3Rlci5nb2xkRHJvcCkgbW9uc3RlcnMuc2V0KFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIG1vbnN0ZXIuZWxlbWVudHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgW2Jvc3NUaWxlLCBib3NzSWRdIG9mIGJvc3Nlcykge1xuICAgIGNvbnN0IGxvYyA9IGJvc3NUaWxlID4+IDE2O1xuICAgIGNvbnN0IHJhZ2UgPSBib3NzSWQgPT09IDB4YzM7XG4gICAgY29uc3QgYm9zcyA9ICFyYWdlID8gcm9tLmJvc3Nlcy5mcm9tTG9jYXRpb24obG9jKSA6IHJvbS5ib3NzZXMucmFnZTtcbiAgICBpZiAobG9jID09PSAweGEwIHx8IGxvYyA9PT0gMHg1ZikgY29udGludWU7IC8vIHNraXAgc3RhdHVlcyBhbmQgZHluYVxuICAgIGlmICghYm9zcyB8fCBib3NzLmtpbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgYm9zcyBhdCBsb2MgJHtsb2MudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vIFRPRE8gLSBzaHVmZmxlIFJhZ2UncyBkZW1hbmRcbiAgICBjb25zdCBraWxsID0gQm9zcyhib3NzLmZsYWcpO1xuXG4gICAgY29uc3QgbWVyZ2UgPSBtZW1vaXplKCh0OiBUZXJyYWluKSA9PiBUZXJyYWluLm1lZXQodCwge2V4aXQ6IGtpbGwsIGV4aXRTb3V0aDoga2lsbH0pKTtcbiAgICBjb25zdCB0aWxlQmFzZSA9IGJvc3NUaWxlICYgfjB4ZmY7XG4gICAgY29uc3QgY29uZGl0aW9uID0gb3ZlcmxheS5ib3NzUmVxdWlyZW1lbnRzKGJvc3MpO1xuICAgIGNvbnN0IGNoZWNrID0ge3Nsb3Q6IFNsb3Qoa2lsbCksIGNvbmRpdGlvbn07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweGYwOyBpKyspIHtcbiAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQodGlsZUJhc2UgfCBpKTtcbiAgICAgIGNvbnN0IHQgPSB0ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICBpZiAoIXQpIGNvbnRpbnVlO1xuICAgICAgdGVycmFpbnMuc2V0KHRpbGUsIG1lcmdlKHQpKTtcbiAgICAgIGNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICB9XG4gICAgLy8gY29uc3QgY2hlY2tUaWxlID0gcmFnZSA/IFRpbGVJZCh0aWxlQmFzZSB8IDB4ODgpIDogYm9zc1RpbGU7XG4gIH1cblxuICBmb3IgKGNvbnN0IGNoZWNrIG9mIG92ZXJsYXkubG9jYXRpb25zKCkgfHwgW10pIHtcbiAgICBjaGVja3MuZ2V0KGNoZWNrLnRpbGUpLmFkZChjaGVjayk7XG4gIH1cblxuICAvLyBsZXQgcyA9IDE7XG4gIC8vIGNvbnN0IHdlYWsgPSBuZXcgV2Vha01hcDxvYmplY3QsIG51bWJlcj4oKTtcbiAgLy8gZnVuY3Rpb24gdWlkKHg6IHVua25vd24pOiBudW1iZXIge1xuICAvLyAgIGlmICh0eXBlb2YgeCAhPT0gJ29iamVjdCcgfHwgIXgpIHJldHVybiAtMTtcbiAgLy8gICBpZiAoIXdlYWsuaGFzKHgpKSB3ZWFrLnNldCh4LCBzKyspO1xuICAvLyAgIHJldHVybiB3ZWFrLmdldCh4KSB8fCAtMTtcbiAgLy8gfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgd2UndmUgZ290IGEgZnVsbCBtYXBwaW5nIG9mIGFsbCB0ZXJyYWlucyBwZXIgbG9jYXRpb24uXG4gIC8vIE5vdyB3ZSBkbyBhIGdpYW50IHVuaW9uZmluZCBhbmQgZXN0YWJsaXNoIGNvbm5lY3Rpb25zIGJldHdlZW4gc2FtZSBhcmVhcy5cbiAgY29uc3QgdGlsZXMgPSBuZXcgVW5pb25GaW5kPFRpbGVJZD4oKTtcbiAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGVycmFpbnMpIHtcbiAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgaWYgKHRlcnJhaW5zLmdldCh4MSkgPT09IHRlcnJhaW4pIHRpbGVzLnVuaW9uKFt0aWxlLCB4MV0pO1xuICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICBpZiAodGVycmFpbnMuZ2V0KHkxKSA9PT0gdGVycmFpbikgdGlsZXMudW5pb24oW3RpbGUsIHkxXSk7XG4gICAgLy8gY29uc29sZS5sb2coYCR7aGV4KHRpbGUpfTogJHt1aWQodGVycmFpbil9YCk7XG4gICAgLy8gY29uc29sZS5sb2codGVycmFpbik7XG4gICAgLy8gY29uc29sZS5sb2coYCAreDogJHtoZXgoeDEpfTogJHt1aWQodGVycmFpbnMuZ2V0KHgxKSl9YCk7XG4gICAgLy8gY29uc29sZS5sb2coYCAreTogJHtoZXgoeTEpfTogJHt1aWQodGVycmFpbnMuZ2V0KHkxKSl9YCk7XG4gIH1cblxuICAvLyBBZGQgZXhpdHMgdG8gYSBtYXAuICBXZSBkbyB0aGlzICphZnRlciogdGhlIGluaXRpYWwgdW5pb25maW5kIHNvIHRoYXRcbiAgLy8gdHdvLXdheSBleGl0cyBjYW4gYmUgdW5pb25lZCBlYXNpbHkuXG4gIGNvbnN0IGV4aXRTZXQgPSBuZXcgU2V0PFRpbGVQYWlyPigpO1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMvKi5zbGljZSgwLDIpKi8pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgY29uc3Qge2Rlc3QsIGVudHJhbmNlfSA9IGV4aXQ7XG4gICAgICBjb25zdCBmcm9tID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgLy8gSGFuZGxlIHNlYW1sZXNzIGV4aXRzXG4gICAgICBjb25zdCB0byA9IGVudHJhbmNlICYgMHgyMCA/XG4gICAgICAgICAgVGlsZUlkKGZyb20gJiAweGZmZmYgfCAoZGVzdCA8PCAxNikpIDpcbiAgICAgICAgICBUaWxlSWQuZnJvbSh7aWQ6IGRlc3R9IGFzIGFueSwgcm9tLmxvY2F0aW9uc1tkZXN0XS5lbnRyYW5jZXNbZW50cmFuY2VdKTtcbiAgICAgIC8vIE5PVEU6IHdlIGNvdWxkIHNraXAgYWRkaW5nIGV4aXRzIGlmIHRoZSB0aWxlcyBhcmUgbm90IGtub3duXG4gICAgICBleGl0U2V0LmFkZChUaWxlUGFpci5vZih0aWxlcy5maW5kKGZyb20pLCB0aWxlcy5maW5kKHRvKSkpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGV4aXQgb2YgZXhpdFNldCkge1xuICAgIGNvbnN0IFtmcm9tLCB0b10gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICBpZiAodGVycmFpbnMuZ2V0KGZyb20pICE9PSB0ZXJyYWlucy5nZXQodG8pKSBjb250aW51ZTtcbiAgICBjb25zdCByZXZlcnNlID0gVGlsZVBhaXIub2YodG8sIGZyb20pO1xuICAgIGlmIChleGl0U2V0LmhhcyhyZXZlcnNlKSkge1xuICAgICAgdGlsZXMudW5pb24oW2Zyb20sIHRvXSk7XG4gICAgICBleGl0U2V0LmRlbGV0ZShleGl0KTtcbiAgICAgIGV4aXRTZXQuZGVsZXRlKHJldmVyc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vdyBsb29rIGZvciBhbGwgZGlmZmVyZW50LXRlcnJhaW4gbmVpZ2hib3JzIGFuZCB0cmFjayBjb25uZWN0aW9ucy5cbiAgY29uc3QgbmVpZ2hib3JzID0gbmV3IE5laWdoYm9ycyh0aWxlcywgYWxsRXhpdHMpO1xuICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0ZXJyYWlucykge1xuICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICBjb25zdCB0eDEgPSB0ZXJyYWlucy5nZXQoeDEpO1xuICAgIGlmICh0eDEgJiYgdHgxICE9PSB0ZXJyYWluKSBuZWlnaGJvcnMuYWRkQWRqYWNlbnQodGlsZSwgeDEsIGZhbHNlKTtcbiAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgY29uc3QgdHkxID0gdGVycmFpbnMuZ2V0KHkxKTtcbiAgICBpZiAodHkxICYmIHR5MSAhPT0gdGVycmFpbikgbmVpZ2hib3JzLmFkZEFkamFjZW50KHRpbGUsIHkxLCB0cnVlKTtcbiAgfVxuXG4gIC8vIEFsc28gYWRkIGFsbCB0aGUgcmVtYWluaW5nIGV4aXRzLiAgV2UgZGVjb21wb3NlIGFuZCByZWNvbXBvc2UgdGhlbSB0b1xuICAvLyB0YWtlIGFkdmFudGFnZSBvZiBhbnkgbmV3IHVuaW9ucyBmcm9tIHRoZSBwcmV2aW91cyBleGl0IHN0ZXAuXG4gIGZvciAoY29uc3QgZXhpdCBvZiBleGl0U2V0KSB7XG4gICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgIGlmICghdGVycmFpbnMuaGFzKGZyb20pIHx8ICF0ZXJyYWlucy5oYXModG8pKSBjb250aW51ZTtcbiAgICBuZWlnaGJvcnMuYWRkRXhpdChmcm9tLCB0byk7XG4gIH1cblxuICAvLyBUT0RPIC0gaGFyZGNvZGUgc29tZSBleGl0c1xuICAvLyAgLSB0aGUgdHJhbnNpdGlvbiBmcm9tICQ1MSB0byAkNjAgaXMgaW1wYXNzaWJsZSBvbiBib3RoIHNpZGVzOlxuICAvLyAgICBhZGQgYSBjb25kaXRpb25hbCBleGl0IGZyb20gdGhlIGJvYXQgdGlsZSB0byB0aGUgYmVhY2ggKGJvdGggd2F5cylcbiAgLy8gIC0gc29tZSB0cmFuc2l0aW9ucyBpbiB0aGUgdG93ZXIgYXJlIG9uIHRvcCBvZiBpbXBhc3NpYmxlLWxvb2tpbmcgdGlsZXNcblxuICBjb25zdCByb3V0ZXMgPSBuZXcgUm91dGVzKCk7XG4gIGZvciAoY29uc3QgciBvZiBvdmVybGF5LmV4dHJhUm91dGVzKCkpIHtcbiAgICBmb3IgKGNvbnN0IGMgb2Ygci5jb25kaXRpb24gfHwgW1tdXSkge1xuICAgICAgcm91dGVzLmFkZFJvdXRlKHRpbGVzLmZpbmQoci50aWxlKSwgYyk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qge2Zyb20sIHRvLCBjb25kaXRpb259IG9mIG92ZXJsYXkuZXh0cmFFZGdlcygpKSB7XG4gICAgZm9yIChjb25zdCBkZXBzIG9mIGNvbmRpdGlvbiB8fCBbW11dKSB7XG4gICAgICByb3V0ZXMuYWRkRWRnZSh0aWxlcy5maW5kKHRvKSwgdGlsZXMuZmluZChmcm9tKSwgZGVwcyk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qge2Zyb20sIHRvLCBzb3V0aH0gb2YgbmVpZ2hib3JzKSB7XG4gICAgLy8gYWxsIHRlcnJhaW5zIGFkZGVkLCBzbyBjYW4gY29ubmVjdC5cbiAgICBjb25zdCBmID0gdGVycmFpbnMuZ2V0KGZyb20pO1xuICAgIGNvbnN0IHQgPSB0ZXJyYWlucy5nZXQodG8pO1xuICAgIGlmICghZiB8fCAhdCkgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIHRlcnJhaW4gJHtmID8gdG8gOiBmcm9tfWApO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiAoc291dGggPyBmLmV4aXRTb3V0aCA6IGYuZXhpdCkgfHwgW1tdXSkge1xuICAgICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0LmVudGVyIHx8IFtbXV0pIHtcbiAgICAgICAgcm91dGVzLmFkZEVkZ2UodG8sIGZyb20sIFsuLi5lbnRyYW5jZSwgLi4uZXhpdF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHJlcXMgPSBuZXcgRGVmYXVsdE1hcDxTbG90LCBNdXRhYmxlUmVxdWlyZW1lbnQ+KCgpID0+IG5ldyBNdXRhYmxlUmVxdWlyZW1lbnQoKSk7XG4gIC8vIE5vdyB3ZSBhZGQgdGhlIHNsb3RzLlxuICAvLyBOb3RlIHRoYXQgd2UgbmVlZCBhIHdheSB0byBlbnN1cmUgdGhhdCBhbGwgdGhlIHJpZ2h0IHNwb3RzIGdldCB1cGRhdGVkXG4gIC8vIHdoZW4gd2UgZmlsbCBhIHNsb3QuICBPbmUgd2F5IGlzIHRvIG9ubHkgdXNlIHRoZSAyeHggZmxhZ3MgaW4gdGhlIHZhcmlvdXNcbiAgLy8gcGxhY2VzIGZvciB0aGluZ3MgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWQgd2hlbiB0aGUgc2xvdCBpcyBmaWxsZWQuXG4gIC8vXG4gIC8vIEZvciB0aGUgYWN0dWFsIHNsb3RzLCB3ZSBrZWVwIHRyYWNrIG9mIHdoZXJlIHRoZXkgd2VyZSBmb3VuZCBpbiBhIHNlcGFyYXRlXG4gIC8vIGRhdGEgc3RydWN0dXJlIHNvIHRoYXQgd2UgY2FuIGZpbGwgdGhlbS5cblxuICAvLyBBZGQgZml4ZWQgY2FwYWJpbGl0aWVzXG4gIGZvciAoY29uc3Qge2NvbmRpdGlvbiA9IFtbXV0sIGNhcGFiaWxpdHl9IG9mIG92ZXJsYXkuY2FwYWJpbGl0aWVzKCkpIHtcbiAgICByZXFzLmdldChTbG90KGNhcGFiaWxpdHkpKS5hZGRBbGwoY29uZGl0aW9uKTtcbiAgfVxuXG4gIC8vIENvbnNvbGlkYXRlIGFsbCB0aGUgY2hlY2tzIGludG8gYSBzaW5nbGUgc2V0LlxuICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NldF0gb2YgY2hlY2tzKSB7XG4gICAgY29uc3Qgcm9vdCA9IHRpbGVzLmZpbmQodGlsZSk7XG4gICAgaWYgKHRpbGUgPT09IHJvb3QpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzZXQpIHtcbiAgICAgIGNoZWNrcy5nZXQocm9vdCkuYWRkKGNoZWNrKTtcbiAgICB9XG4gICAgY2hlY2tzLmRlbGV0ZSh0aWxlKTtcbiAgfVxuXG4gIC8vIE5vdyBhbGwga2V5cyBhcmUgdW5pb25maW5kIHJvb3RzLlxuICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NldF0gb2YgY2hlY2tzKSB7XG4gICAgZm9yIChjb25zdCB7c2xvdCwgY29uZGl0aW9uID0gW1tdXX0gb2YgY2hlY2tzZXQpIHtcbiAgICAgIGNvbnN0IHJlcSA9IHJlcXMuZ2V0KHNsb3QpO1xuICAgICAgZm9yIChjb25zdCByMSBvZiBjb25kaXRpb24pIHtcbiAgICAgICAgZm9yIChjb25zdCByMiBvZiByb3V0ZXMucm91dGVzLmdldCh0aWxlKSB8fCBbXSkge1xuICAgICAgICAgIHJlcS5hZGRMaXN0KFsuLi5yMSwgLi4ucjJdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIE5vdGU6IGF0IHRoaXMgcG9pbnQgd2UndmUgYnVpbHQgdXAgdGhlIG1haW4gaW5pdGlhbCBsb2NhdGlvbiBsaXN0LlxuICAvLyBXZSBuZWVkIHRvIHJldHVybiBzb21ldGhpbmcgdXNlZnVsIG91dCBvZiBpdC5cbiAgLy8gIC0gc29tZSBpbnRlcmZhY2UgdGhhdCBjYW4gYmUgdXNlZCBmb3IgYXNzdW1lZC1maWxsIGxvZ2ljLlxuICAvLyAgLSB3YW50IGEgdXNhYmxlIHRvU3RyaW5nIGZvciBzcG9pbGVyIGxvZy5cbiAgLy8gIC0gd291bGQgYmUgbmljZSB0byBoYXZlIHBhY2tlZCBiaWdpbnRzIGlmIHBvc3NpYmxlP1xuICAvLyBBbnkgc2xvdHMgdGhhdCBhcmUgTk9UIHJlcXVpcmVtZW50cyBzaG91bGQgYmUgZmlsdGVyZWQgb3V0XG5cbiAgLy8gQnVpbGQgdXAgYSBncmFwaD8hP1xuICAvLyBXaWxsIG5lZWQgdG8gbWFwIHRvIHNtYWxsZXIgbnVtYmVycz9cbiAgLy8gQ2FuIHdlIGNvbXByZXNzIGxhemlseT9cbiAgLy8gIC0gZXZlcnl0aGluZyB3ZSBzZWUgYXMgYSByZXF1aXJlbWVudCBnb2VzIGludG8gb25lIGxpc3QvbWFwXG4gIC8vICAtIGV2ZXJ5dGhpbmcgd2Ugc2VlIGFzIGEgXCJnZXRcIiBnb2VzIGludG8gYW5vdGhlclxuICAvLyAgLSBmaWxsaW5nIG1hcHMgYmV0d2VlbiB0aGVtXG4gIC8vIHN0YXJ0IGF0IGVudHJhbmNlLCBidWlsZCBmdWxsIHJlcXVpcmVtZW50cyBmb3IgZWFjaCBwbGFjZVxuICAvLyBmb2xsb3cgZXhpdHM6XG4gIC8vICAtIGZvciBlYWNoIGV4aXQsIHVwZGF0ZSByZXF1aXJlbWVudHMsIHF1ZXVlIHJlY2hlY2sgaWYgY2hhbmdlZFxuICAvLyAgLSB3ZSBjb3VsZCBkbyBhIGxlc3MtdGhvcm91Z2ggdmVyc2lvbjpcbiAgLy8gICAgIC0gc3RhcnQgYXQgZW50cmFuY2UsIGFkZCAob3BlbikgcmVxdWlyZW1lbnRcbiAgLy8gICAgIC0gcXVldWUgYWxsIGV4aXRzLCBpZ25vcmluZyBhbnkgYWxyZWFkeSBzZWVuXG4gIC8vICAgICAgIGtlZXAgdHJhY2sgb2Ygd2hpY2ggbG9jYXRpb25zIGhhZCBjaGFuZ2VkIHJlcXNcbiAgLy8gICAgIC0gb25jZSBxdWV1ZSBmbHVzaGVzLCByZXBsYWNlIHF1ZXVlIHdpdGggY2hhbmdlZFxuICAvLyAgICAgLSByZXBlYXQgdW50aWwgY2hhbmdlZCBpcyBlbXB0eSBhdCBlbmQgb2YgcXVldWVcblxuICAvLyBGb3IgbW9uc3RlcnMgLSBmaWd1cmUgb3V0IHdoaWNoIHN3b3JkcyBsZWFkIHRvIG1vbmV5XG4gICAgICAgIC8vIGlmICghKGVsZW1lbnRzICYgMHgxKSkgbW9uZXlTd29yZHMuYWRkKDApO1xuICAgICAgICAvLyBpZiAoIShlbGVtZW50cyAmIDB4MikpIG1vbmV5U3dvcmRzLmFkZCgxKTtcbiAgICAgICAgLy8gaWYgKCEoZWxlbWVudHMgJiAweDQpKSBtb25leVN3b3Jkcy5hZGQoMik7XG4gICAgICAgIC8vIGlmICghKGVsZW1lbnRzICYgMHg4KSkgbW9uZXlTd29yZHMuYWRkKDMpO1xuXG4gIC8vIGNvbnN0IGVudHJhbmNlID0gcm9tLmxvY2F0aW9uc1tzdGFydF0uZW50cmFuY2VzWzBdO1xuICAvLyB0aGlzLmFkZEVudHJhbmNlKHBhcnNlQ29vcmQoc3RhcnQsIGVudHJhbmNlKSk7XG5cbiAgaWYgKERFQlVHICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc3QgdyA9IHdpbmRvdyBhcyBhbnk7XG4gICAgY29uc29sZS5sb2cody5yb290cyA9ICh3LnRpbGVzID0gdGlsZXMpLnJvb3RzKCkpO1xuICAgIGNvbnNvbGUubG9nKFsuLi4ody5uZWlnaGJvcnMgPSBuZWlnaGJvcnMpXSk7XG4gICAgY29uc29sZS5sb2cody5sbCA9IHJvdXRlcyk7XG5cbiAgICBmdW5jdGlvbiBoKHg6IG51bWJlcik6IHN0cmluZyB7XG4gICAgICByZXR1cm4geCA8IDAgPyAnficgKyAofngpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpIDpcbiAgICAgICAgICB4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgzLCAnMCcpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkbmYoeDogSXRlcmFibGU8SXRlcmFibGU8bnVtYmVyPj4sIGYgPSBoKTogc3RyaW5nIHtcbiAgICAgIGNvbnN0IHhzID0gWy4uLnhdO1xuICAgICAgaWYgKCF4cy5sZW5ndGgpIHJldHVybiAnbm8gcm91dGUnO1xuICAgICAgcmV0dXJuICcoJyArIHhzLm1hcCh5ID0+IFsuLi55XS5tYXAoZikuam9pbignICYgJykpXG4gICAgICAgICAgLmpvaW4oJykgfFxcbiAgICAgKCcpICsgJyknO1xuICAgIH1cbiAgICB3LmFyZWEgPSAodGlsZTogVGlsZUlkLCBmOiAoeDogbnVtYmVyKSA9PiBzdHJpbmcgPSBoKSA9PiB7XG4gICAgICBjb25zdCBzID0gWy4uLnRpbGVzLnNldHMoKS5maWx0ZXIocyA9PiBzLmhhcyh0aWxlKSlbMF1dXG4gICAgICAgICAgLm1hcCh4ID0+IHgudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDYsICcwJykpO1xuICAgICAgLy8gY29uc3QgciA9ICcoJyArIFsuLi5yb3V0ZXMucm91dGVzLmdldCh0aWxlcy5maW5kKHRpbGUpKV1cbiAgICAgIC8vICAgICAubWFwKHMgPT4gWy4uLnNdLm1hcCh4ID0+IHggPCAwID8gJ34nICsgKH54KS50b1N0cmluZygxNikgOlxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgIHgudG9TdHJpbmcoMTYpKS5qb2luKCcgJiAnKSlcbiAgICAgIC8vICAgICAuam9pbignKSB8ICgnKSArICcpJztcbiAgICAgIGNvbnN0IHIgPSBkbmYocm91dGVzLnJvdXRlcy5nZXQodGlsZXMuZmluZCh0aWxlKSksIGYpO1xuICAgICAgLy8gbmVpZ2hib3JzXG4gICAgICBjb25zdCBlZGdlcyA9IFtdO1xuICAgICAgY29uc3QgdCA9IHRpbGVzLmZpbmQodGlsZSk7XG4gICAgICBmb3IgKGNvbnN0IG91dCBvZiAocm91dGVzLmVkZ2VzLmdldCh0KSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpKSB7XG4gICAgICAgIGVkZ2VzLnB1c2goYFxcbnRvICR7b3V0LnRhcmdldC50b1N0cmluZygxNil9IGlmICgke1xuICAgICAgICAgICAgICAgICAgICBbLi4ub3V0LmRlcHNdLm1hcChmKS5qb2luKCcgJiAnKX0pYCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtmcm9tLCByc10gb2Ygcm91dGVzLmVkZ2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdG8gb2YgcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICBpZiAodG8udGFyZ2V0ICE9PSB0KSBjb250aW51ZTtcbiAgICAgICAgICBlZGdlcy5wdXNoKGBcXG5mcm9tICR7ZnJvbS50b1N0cmluZygxNil9IGlmICgke1xuICAgICAgICAgICAgICAgICAgICAgIFsuLi50by5kZXBzXS5tYXAoZikuam9pbignICYgJyl9KWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBncm91cChhcnI6IHVua25vd25bXSwgY291bnQ6IG51bWJlciwgc3BhY2VyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG91dCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkgKz0gY291bnQpIHtcbiAgICAgICAgICBvdXQucHVzaChhcnIuc2xpY2UoaSwgaSArIGNvdW50KS5qb2luKHNwYWNlcikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gYCR7aGV4KHQpfVxcbiR7Z3JvdXAocywgMTYsICcgJykuam9pbignXFxuJyl9XFxuY291bnQgPSAke1xuICAgICAgICAgICAgICBzLmxlbmd0aH1cXG5yb3V0ZXMgPSAke3J9JHtlZGdlcy5qb2luKCcnKX1gO1xuICAgIH07XG5cbiAgICB3LndoYXRGbGFnID0gKGY6IG51bWJlcikgPT4gY29uZGl0aW9uTmFtZShmLCByb20pO1xuXG4gICAgdy5yZXFzID0gcmVxcztcbiAgICBjb25zb2xlLmxvZygncmVxc1xcbicgKyBbLi4ucmVxc10uc29ydCgoW2FdLCBbYl0pID0+IGEgLSBiKVxuICAgICAgICAgICAgICAgIC5tYXAoKFtzLCByXSkgPT4gYCR7dy53aGF0RmxhZyhzKX06ICR7ZG5mKHIsdy53aGF0RmxhZyl9YClcbiAgICAgICAgICAgICAgICAuam9pbignXFxuJykpO1xuXG4gICAgdy5yZXFzLmNoZWNrID1cbiAgICAgICAgKGlkOiBudW1iZXIsIGY6ICgoZmxhZzogbnVtYmVyKSA9PiBzdHJpbmcpID0gaCk6IHN0cmluZyA9PlxuICAgICAgICAgICAgYCR7ZihpZCl9OiAke2RuZihyZXFzLmdldChTbG90KGlkKSksIGYpfWA7XG4gICAgdy5yZXFzLmNoZWNrMiA9IChpZDogbnVtYmVyKTogc3RyaW5nID0+IHcucmVxcy5jaGVjayhpZCwgdy53aGF0RmxhZyk7XG4gIH1cblxuICAvLyBTdW1tYXJ5OiAxMDU1IHJvb3RzLCAxNzI0IG5laWdoYm9yc1xuICAvLyBUaGlzIGlzIHRvbyBtdWNoIGZvciBhIGZ1bGwgZ3JhcGggdHJhdmVyc2FsLCBidXQgbWFueSBjYW4gYmUgcmVtb3ZlZD8/P1xuICAvLyAgIC0+IHNwZWNpZmljYWxseSB3aGF0P1xuXG4gIC8vIEFkZCBpdGVtZ2V0cyBhbmQgbnBjcyB0byByb290c1xuICAvLyAgLSBOUEMgd2lsbCBuZWVkIHRvIGNvbWUgZnJvbSBhIG1ldGFzdHJ1Y3R1cmUgb2Ygc2h1ZmZsZWQgTlBDcywgbWF5YmU/XG4gIC8vICAtLS0gaWYgd2UgbW92ZSBha2FoYW5hIG91dCBvZiBicnlubWFlciwgbmVlZCB0byBrbm93IHdoaWNoIGl0ZW0gaXMgd2hpY2hcblxuXG4gIC8vIEJ1aWxkIHVwIHNodWZmbGUuR3JhcGhcbiAgLy8gRmlyc3QgZmlndXJlIG91dCB3aGljaCBpdGVtcyBhbmQgZXZlbnRzIGFyZSBhY3R1YWxseSBuZWVkZWQuXG4gIGxldCBmaWxsZWQgPSBpc0l0ZW07XG4gIGlmICh0cmFja2VyKSB7XG4gICAgLy8gcHVsbCBvdXQgb3RoZXIgYml0cyB0byBiZSBmaWxsZWQgaW4uXG4gICAgZmlsbGVkID0gZnVuY3Rpb24oYzogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICBpZiAoaXNJdGVtKGMpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgJiYgcm9tLmJvc3Nlcy5pc0Jvc3NGbGFnKGMpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIC8vIFRPRE8gLSB3YWxscz9cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBXb3JsZChyb20sIHRpbGVzLCBtYWtlR3JhcGgocmVxcywgcm9tLCBmaWxsZWQpKTtcbn1cblxuLy8gZnVuY3Rpb24gaXNCb3NzKGM6IG51bWJlcik6IGJvb2xlYW4ge1xuLy8gICByZXR1cm4gfmMgPj0gMHgxMDAgJiYgfmMgPCAweDExMDtcbi8vIH1cbmZ1bmN0aW9uIGlzSXRlbShjOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGMgPj0gMHgyMDAgJiYgYyA8IDB4MjgwO1xufVxuXG4vKiogQHBhcmFtIGZsYWdzIE9ubHkgaWYgdHJhY2tlciAqL1xuZnVuY3Rpb24gbWFrZUdyYXBoKHJlcXM6IE1hcDxTbG90LCBNdXRhYmxlUmVxdWlyZW1lbnQ+LFxuICAgICAgICAgICAgICAgICAgIHJvbTogUm9tLFxuICAgICAgICAgICAgICAgICAgIGZpbGxlZDogKGM6IG51bWJlcikgPT4gYm9vbGVhbik6IHNodWZmbGUuR3JhcGgge1xuICAvLyBGaWd1cmUgb3V0IHdoaWNoIGl0ZW1zIGFyZSB1c2VkLCBidWlsZCB0d28gc2V0cy5cbiAgY29uc3QgYWxsQ29uZGl0aW9uc1NldCA9IG5ldyBTZXQ8Q29uZGl0aW9uPigpO1xuICBjb25zdCBhbGxTbG90c1NldCA9IG5ldyBTZXQ8U2xvdD4oKTtcbiAgZm9yIChjb25zdCBbc2xvdCwgcmVxXSBvZiByZXFzKSB7XG4gICAgYWxsU2xvdHNTZXQuYWRkKHNsb3QpO1xuICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICBmb3IgKGNvbnN0IGMgb2YgY3MpIHtcbiAgICAgICAgYWxsQ29uZGl0aW9uc1NldC5hZGQoYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIE5vdGhpbmcgZGVwZW5kcyBvbiB0aGlzIGJ1dCB3ZSBzaG91bGQgdHJhY2sgaXQgYW55d2F5LlxuICBhbGxDb25kaXRpb25zU2V0LmFkZChCb3NzLkRSQVlHT04yWzBdWzBdKTtcblxuICBjb25zdCBhbGxDb25kaXRpb25zID0gWy4uLmFsbENvbmRpdGlvbnNTZXRdLmZpbHRlcihjID0+ICFmaWxsZWQoYykpLnNvcnQoKTtcbiAgY29uc3QgYWxsSXRlbXMgPSBbLi4uYWxsQ29uZGl0aW9uc1NldF0uZmlsdGVyKGZpbGxlZCkuc29ydCgpO1xuICBjb25zdCBhbGxTbG90cyA9IFsuLi5hbGxTbG90c1NldF0uZmlsdGVyKGZpbGxlZCkuc29ydCgpO1xuICBjb25zdCBmaXhlZCA9IGFsbENvbmRpdGlvbnMubGVuZ3RoO1xuXG4gIGZ1bmN0aW9uIG1ha2VOb2RlKGNvbmRpdGlvbjogbnVtYmVyLCBpbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHtuYW1lOiBjb25kaXRpb25OYW1lKGNvbmRpdGlvbiwgcm9tKSwgY29uZGl0aW9uLCBpbmRleH0gYXNcbiAgICAgICAgc2h1ZmZsZS5JdGVtTm9kZSAmIHNodWZmbGUuU2xvdE5vZGU7XG4gIH1cbiAgZnVuY3Rpb24gaXRlbU5vZGUoY29uZGl0aW9uOiBudW1iZXIsIGluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihtYWtlTm9kZShjb25kaXRpb24sIGluZGV4ICsgZml4ZWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtOiAoY29uZGl0aW9uICYgMHg3ZikgYXMgYW55fSk7XG4gIH1cbiAgY29uc3QgY29uZGl0aW9uTm9kZXMgPSBhbGxDb25kaXRpb25zLm1hcChtYWtlTm9kZSk7XG4gIGNvbnN0IGl0ZW1Ob2RlcyA9IGFsbEl0ZW1zLm1hcChpdGVtTm9kZSk7XG4gIGNvbnN0IHNsb3ROb2RlcyA9IGFsbFNsb3RzLm1hcChpdGVtTm9kZSk7XG5cbiAgY29uc3QgaXRlbXM6IHNodWZmbGUuSXRlbU5vZGVbXSA9IFsuLi5jb25kaXRpb25Ob2RlcywgLi4uaXRlbU5vZGVzXTtcbiAgY29uc3Qgc2xvdHM6IHNodWZmbGUuU2xvdE5vZGVbXSA9IFsuLi5jb25kaXRpb25Ob2RlcywgLi4uc2xvdE5vZGVzXTtcblxuICBjb25zdCBpdGVtSW5kZXhNYXAgPVxuICAgICAgbmV3IE1hcDxDb25kaXRpb24sIHNodWZmbGUuSXRlbUluZGV4PihcbiAgICAgICAgICBpdGVtcy5tYXAoKGMsIGkpID0+IFtjLmNvbmRpdGlvbiBhcyBDb25kaXRpb24sIGkgYXMgc2h1ZmZsZS5JdGVtSW5kZXhdKSk7XG4gIGZ1bmN0aW9uIGdldEl0ZW1JbmRleChjOiBDb25kaXRpb24pOiBzaHVmZmxlLkl0ZW1JbmRleCB7XG4gICAgY29uc3QgaW5kZXggPSBpdGVtSW5kZXhNYXAuZ2V0KGMpO1xuICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaXRlbSAkJHtjLnRvU3RyaW5nKDE2KX06ICR7Y29uZGl0aW9uTmFtZShjLCByb20pfWApO1xuICAgIH1cbiAgICByZXR1cm4gaW5kZXg7XG4gIH1cbiAgY29uc3Qgc2xvdEluZGV4TWFwID1cbiAgICAgIG5ldyBNYXA8U2xvdCwgc2h1ZmZsZS5TbG90SW5kZXg+KFxuICAgICAgICAgIHNsb3RzLm1hcCgoYywgaSkgPT4gW2MuY29uZGl0aW9uIGFzIFNsb3QsIGkgYXMgc2h1ZmZsZS5TbG90SW5kZXhdKSk7XG5cbiAgY29uc3QgZ3JhcGg6IEJpdHNbXVtdID0gW107XG4gIGNvbnN0IHVubG9ja3NTZXQ6IEFycmF5PFNldDxzaHVmZmxlLlNsb3RJbmRleD4+ID0gW107XG5cbiAgZm9yIChjb25zdCBbc2xvdCwgcmVxXSBvZiByZXFzKSB7XG4gICAgLy8gTk9URTogbmVlZCBtYXAgZnJvbSBmdWxsIHRvIGNvbXByZXNzZWQuXG4gICAgY29uc3QgcyA9IHNsb3RJbmRleE1hcC5nZXQoc2xvdCk7XG4gICAgaWYgKHMgPT0gbnVsbCkge1xuICAgICAgaWYgKE1BWUJFX01JU1NJTkdfU0xPVFMuaGFzKHNsb3QpKSBjb250aW51ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYE5vdGhpbmcgZGVwZW5kZWQgb24gJCR7c2xvdC50b1N0cmluZygxNil9OiAke1xuICAgICAgICAgICAgICAgICAgICAgY29uZGl0aW9uTmFtZShzbG90LCByb20pfWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICBjb25zdCBpcyA9IFsuLi5jc10ubWFwKGdldEl0ZW1JbmRleCk7XG4gICAgICAoZ3JhcGhbc10gfHwgKGdyYXBoW3NdID0gW10pKS5wdXNoKEJpdHMuZnJvbShpcykpO1xuICAgICAgZm9yIChjb25zdCBpIG9mIGlzKSB7XG4gICAgICAgICh1bmxvY2tzU2V0W2ldIHx8ICh1bmxvY2tzU2V0W2ldID0gbmV3IFNldCgpKSkuYWRkKHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBzYW5pdHkgY2hlY2sgdG8gbWFrZSBzdXJlIGFsbCBzbG90cyBhcmUgcHJvdmlkZWRcbiAgZm9yIChjb25zdCBuIG9mIFsuLi5jb25kaXRpb25Ob2RlcywgLi4uc2xvdE5vZGVzXSkge1xuICAgIC8vIGlmIChpLml0ZW0gIT0gbnVsbCkgY29udGludWU7XG4gICAgaWYgKCFncmFwaFtuLmluZGV4XSB8fCAhZ3JhcGhbbi5pbmRleF0ubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjID0gbi5jb25kaXRpb247XG4gICAgICBjb25zb2xlLmVycm9yKGBOb3RoaW5nIHByb3ZpZGVkICQke2MudG9TdHJpbmcoMTYpfTogJHtjb25kaXRpb25OYW1lKGMsIHJvbSlcbiAgICAgICAgICAgICAgICAgICAgIH0gKGluZGV4ICR7bi5pbmRleH0pYCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhncmFwaCk7XG5cbiAgY29uc3QgdW5sb2NrcyA9IHVubG9ja3NTZXQubWFwKHggPT4gWy4uLnhdKTtcbiAgcmV0dXJuIHtmaXhlZCwgc2xvdHMsIGl0ZW1zLCBncmFwaCwgdW5sb2Nrcywgcm9tfTtcbn1cblxuY29uc3QgTUFZQkVfTUlTU0lOR19TTE9UUyA9IG5ldyBTZXQoW1xuICAweDAyNSwgLy8gaGVhbGVkIGRvbHBoaW4sIG9ubHkgbWF0dGVycyBpZiAnUmQnIGlzIHNldC5cbiAgMHgwMjYsIC8vIGVudGVyZWQgc2h5cm9uLCBvbmx5IG1hdHRlcnMgaWYgJ0d0JyBub3Qgc2V0LlxuICAweDBhOSwgLy8gbGVhZiByYWJiaXQgbm90IHJlcXVpcmVkIGlmICdGcicgbm90IHNldC5cbiAgMHgyNDQsIC8vIHRlbGVwb3J0IG1heSBub3QgYmUgcmVxdWlyZWQgaWYgJ0ZwJyBub3Qgc2V0LlxuXSk7XG5cbmZ1bmN0aW9uIGNvbmRpdGlvbk5hbWUoZjogbnVtYmVyLCByb206IFJvbSk6IHN0cmluZyB7XG4gIGNvbnN0IGVudW1zID0ge0Jvc3MsIEV2ZW50LCBDYXBhYmlsaXR5LCBJdGVtLCBNYWdpY307XG4gIGZvciAoY29uc3QgZW51bU5hbWUgaW4gZW51bXMpIHtcbiAgICBjb25zdCBlID0gZW51bXNbZW51bU5hbWUgYXMga2V5b2YgdHlwZW9mIGVudW1zXSBhcyBhbnk7XG4gICAgZm9yIChjb25zdCBlbGVtIGluIGUpIHtcbiAgICAgIGlmIChlW2VsZW1dID09PSBmIHx8IEFycmF5LmlzQXJyYXkoZVtlbGVtXSkgJiYgZVtlbGVtXVswXVswXSA9PT0gZikge1xuICAgICAgICByZXR1cm4gZWxlbS5yZXBsYWNlKC8oW0EtWl0pKFtBLVpdKykvZywgKF8sIGYsIHMpID0+IGYgKyBzLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL18vZywgJyAnKTtcbiAgICAgICAgLy9yZXR1cm4gYCR7ZW51bU5hbWV9LiR7ZWxlbX1gO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmICghbC51c2VkKSBjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IGZsIG9mIGwuZmxhZ3MpIHtcbiAgICAgIGlmIChmbC5mbGFnID09PSBmKSB7XG4gICAgICAgIHJldHVybiBgTG9jYXRpb24gJHtsLmlkLnRvU3RyaW5nKDE2KX0gKCR7bC5uYW1lfSkgRmxhZyAke2ZsLnlzfSwke2ZsLnhzfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmIDwgMCA/IGB+JHsofmYpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpfWAgOlxuICAgICAgZi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKTtcbn1cblxuLy8vLy8vLy8vLy8vL1xuXG5jb25zdCBERUJVRzogYm9vbGVhbiA9IGZhbHNlO1xuIl19