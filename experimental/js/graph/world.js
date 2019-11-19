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
        const ext = location.screenPage;
        const tileset = rom.tilesets[location.tileset];
        const tileEffects = rom.tileEffects[location.tileEffects - 0xb3];
        for (const spawn of location.spawns) {
            if (spawn.isWall()) {
                walls.set(ScreenId.from(location, spawn), (spawn.id & 3));
            }
        }
        const isShop = location.isShop();
        for (let y = 0, height = location.height; y < height; y++) {
            const row = location.screens[y];
            const rowId = location.id << 8 | y << 4;
            for (let x = 0, width = location.width; x < width; x++) {
                const screen = rom.screens[row[x] | ext];
                const screenId = ScreenId(rowId | x);
                const flagYx = screenId & 0xff;
                const wall = walls.get(screenId);
                const flag = wall != null ?
                    overlay.wallCapability(wall) :
                    location.flags.find(f => f.screen === flagYx);
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
                    const effects = isShop ? 0 : tileEffects.effects[tile] & 0x26;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ybGQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvZ3JhcGgvd29ybGQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRSxPQUFPLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUMxRSxJQUFJLEVBQUUsT0FBTyxFQUFZLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDaEYsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNyQyxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQ25DLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFDO0FBQ3hDLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDaEMsT0FBTyxFQUFDLE9BQU8sRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUN0QyxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzFDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFdEMsTUFBTSxFQUFFLEdBQUcsRUFBQyxHQUFHLEVBQVEsQ0FBQztBQVF4QixNQUFNLE9BQU8sS0FBSztJQUVoQixZQUFxQixHQUFRLEVBQ1IsS0FBd0IsRUFDeEIsS0FBb0I7UUFGcEIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFVBQUssR0FBTCxLQUFLLENBQW1CO1FBQ3hCLFVBQUssR0FBTCxLQUFLLENBQWU7SUFBRyxDQUFDO0lBRzdDLFFBQVEsQ0FBQyxLQUFvQixFQUFFLElBQWtC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cm9tICcuL2dlb21ldHJ5LmpzJztcbmltcG9ydCB7Qm9zcywgQ2hlY2ssIENhcGFiaWxpdHksIENvbmRpdGlvbiwgRXZlbnQsIEl0ZW0sIE1hZ2ljLCBNdXRhYmxlUmVxdWlyZW1lbnQsXG4gICAgICAgIFNsb3QsIFRlcnJhaW4sIFdhbGxUeXBlLCBtZWV0LCBtZW1vaXplLCBtZW1vaXplMn0gZnJvbSAnLi9jb25kaXRpb24uanMnO1xuaW1wb3J0IHtPdmVybGF5fSBmcm9tICcuL292ZXJsYXkuanMnO1xuaW1wb3J0IHtSb3V0ZXN9IGZyb20gJy4vcm91dGVzLmpzJztcbmltcG9ydCAqIGFzIHNodWZmbGUgZnJvbSAnLi9zaHVmZmxlLmpzJztcbmltcG9ydCB7Qml0c30gZnJvbSAnLi4vYml0cy5qcyc7XG5pbXBvcnQge0ZsYWdTZXR9IGZyb20gJy4uL2ZsYWdzZXQuanMnO1xuaW1wb3J0IHtoZXh9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtVbmlvbkZpbmR9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQge0RlZmF1bHRNYXB9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5jb25zdCB7fSA9IHtoZXh9IGFzIGFueTsgLy8gZm9yIGRlYnVnZ2luZ1xuXG4vLyBBIHRpbGUgaXMgYSAyNC1iaXQgbnVtYmVyOlxuLy8gICA8bG9jPjx5cz48eHM+PHl0Pjx4dD5cbi8vIFdlIGRvIGEgZ2lhbnQgZmxvb2QtZmlsbCBvZiB0aGUgZW50aXJlIGdhbWUsIHN0YXJ0aW5nIGF0ICQwMDAwNTUgb3Igd2hhdGV2ZXIuXG4vLyBGaWxsaW5nIGlzIGEgdW5pb24tZmluZCwgc28gd2Ugc3RhcnQgYnkgYXNzaWduaW5nIGVhY2ggZWxlbWVudCBpdHNlbGYsIGJ1dFxuLy8gd2hlbiB3ZSBmaW5kIGEgbmVpZ2hib3IsIHdlIGpvaW4gdGhlbS5cblxuZXhwb3J0IGNsYXNzIFdvcmxkIHtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSxcbiAgICAgICAgICAgICAgcmVhZG9ubHkgdGlsZXM6IFVuaW9uRmluZDxUaWxlSWQ+LFxuICAgICAgICAgICAgICByZWFkb25seSBncmFwaDogc2h1ZmZsZS5HcmFwaCkge31cblxuICAvLyBEb2VzIGEgXCJjaGVja1wiIHRyYXZlcnNhbCBvZiBhIGZpbGwsIHBvcHVsYXRpbmcgdGhlIHNwb2lsZXIgbG9nLlxuICB0cmF2ZXJzZShncmFwaDogc2h1ZmZsZS5HcmFwaCwgZmlsbDogc2h1ZmZsZS5GaWxsKTogdm9pZCB7XG4gICAgY29uc3Qge3Nwb2lsZXJ9ID0gdGhpcy5yb207XG4gICAgaWYgKCFzcG9pbGVyKSByZXR1cm47XG4gICAgLy8gVE9ETyAtIGltcHJvdmUgdGhpcyFcbiAgICBmb3IgKGxldCBpID0gLTB4MjAwOyBpIDwgMHgzMDA7IGkrKykge1xuICAgICAgc3BvaWxlci5hZGRDb25kaXRpb24oaSwgY29uZGl0aW9uTmFtZShpLCB0aGlzLnJvbSkpO1xuICAgIH1cbiAgICAvLyBEbyB0aGUgdHJhdmVyc2FsIGFuZCBhZGQgYWxsIHRoZSByb3V0ZXNcbiAgICBmb3IgKGNvbnN0IFtzaSwgLi4uaWlzXSBvZiBzaHVmZmxlLnRyYXZlcnNlRmlsbChncmFwaCwgZmlsbCkpIHtcbiAgICAgIGNvbnN0IHNsb3QgPSBncmFwaC5zbG90c1tzaV0uY29uZGl0aW9uO1xuICAgICAgLy8gY29uc3Qgc2xvdCA9IGNvbmRpdGlvbk5hbWUoZ3JhcGguc2xvdHNbc2ldLmNvbmRpdGlvbiwgdGhpcy5yb20pO1xuICAgICAgY29uc3QgaXRlbXMgPSBpaXMubWFwKGlpID0+IGdyYXBoLml0ZW1zW2lpXS5jb25kaXRpb24pO1xuICAgICAgLy8gY29uc3QgaXRlbXMgPSBpaXMubWFwKGlpID0+IGNvbmRpdGlvbk5hbWUoZ3JhcGguaXRlbXNbaWldLmNvbmRpdGlvbiwgdGhpcy5yb20pKTtcbiAgICAgIGNvbnN0IHNsb3RJdGVtID0gZmlsbC5zbG90c1tncmFwaC5zbG90c1tzaV0uaXRlbSFdO1xuICAgICAgc3BvaWxlci5hZGRDaGVjayhzbG90LCBpdGVtcywgc2xvdEl0ZW0pO1xuICAgICAgLy8gY29uc3QgaXRlbSA9IHNsb3RJdGVtICE9IG51bGwgP1xuICAgICAgLy8gICAgIGAgPT4gJHtjb25kaXRpb25OYW1lKDB4MjAwIHwgZmlsbC5zbG90c1tzbG90SXRlbV0sIHRoaXMucm9tKX1gIDogJyc7XG4gICAgICAvLyBvdXQucHVzaChgJHtzbG90fSR7aXRlbX06IFske2l0ZW1zLmpvaW4oJywgJyl9XWApO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBidWlsZChyb206IFJvbSwgZmxhZ3M/OiBGbGFnU2V0LCB0cmFja2VyPzogYm9vbGVhbik6IFdvcmxkIHtcbiAgICByZXR1cm4gYnVpbGQocm9tLCBmbGFncywgdHJhY2tlcik7XG4gIH1cbn1cblxuLy8gRXhpdHMgYmV0d2VlbiBncm91cHMgb2YgZGlmZmVyZW50IHJlYWNoYWJpbGl0eS5cbi8vIE9wdGlvbmFsIHRoaXJkIGVsZW1lbnQgaXMgbGlzdCBvZiByZXF1aXJlbWVudHMgdG8gdXNlIHRoZSBleGl0LlxuLy8gcHJpdmF0ZSByZWFkb25seSBleGl0cyA9IG5ldyBBcnJheTxbbnVtYmVyLCBudW1iZXIsIG51bWJlcltdW10/XT4oKTtcblxuLy8gQmxvY2tzIGZvciBhbnkgZ2l2ZW4gdGlsZSBncm91cC5cbi8vIHByaXZhdGUgcmVhZG9ubHkgYmxvY2tzID0gbmV3IEFycmF5PFtudW1iZXIsIG51bWJlcltdW11dPigpO1xuXG5mdW5jdGlvbiBidWlsZChyb206IFJvbSwgZmxhZ3MgPSBuZXcgRmxhZ1NldCgnQEZ1bGxTaHVmZmxlJyksIHRyYWNrZXIgPSBmYWxzZSk6IFdvcmxkIHsgICAgXG4gIC8vIDEuIHN0YXJ0IHdpdGggZW50cmFuY2UgMCBhdCB0aGUgc3RhcnQgbG9jYXRpb24sIGFkZCBpdCB0byB0aGUgdGlsZXMgYW5kIHF1ZXVlLlxuICAvLyAyLiBmb3IgdGlsZSBUIGluIHRoZSBxdWV1ZVxuICAvLyAgICAtIGZvciBlYWNoIHBhc3NhYmxlIG5laWdoYm9yIE4gb2YgVDpcbiAgLy8gICAgICAtIGlmIE4gaGFzIHRoZSBzYW1lIHBhc3NhZ2UgYXMgVCwgdW5pb24gdGhlbVxuICAvLyAgICAgIC0gaWYgTiBoYXMgZGlmZmVyZW50IHBhc3NhZ2UsIGFkZCBhbiBleGl0IGZyb20gVCB0byBOXG4gIC8vICAgICAgLSBpZiBOIGlzIG5vdCB5ZXQgc2VlbiwgYWRkIGl0IHRvIHRoZSBxdWV1ZVxuICAvLyBwYXNzYWdlIGNhbiBiZSBvbmUgb2Y6XG4gIC8vICAtIG9wZW5cbiAgLy8gIC0gYmxvY2tlZChpdGVtL3RyaWdnZXIgLSBib3RoIGFyZSBqdXN0IG51bWJlcnMuLi4pXG4gIC8vICAtIG9uZS13YXkgXG5cbiAgLy8gU3RhcnQgYnkgZ2V0dGluZyBhIGZ1bGwgbWFwIG9mIGFsbCB0ZXJyYWlucyBhbmQgY2hlY2tzXG4gIGNvbnN0IG92ZXJsYXkgPSBuZXcgT3ZlcmxheShyb20sIGZsYWdzLCB0cmFja2VyKTtcbiAgY29uc3QgdGVycmFpbnMgPSBuZXcgTWFwPFRpbGVJZCwgVGVycmFpbj4oKTtcbiAgY29uc3Qgd2FsbHMgPSBuZXcgTWFwPFNjcmVlbklkLCBXYWxsVHlwZT4oKTtcbiAgY29uc3QgYm9zc2VzID0gbmV3IE1hcDxUaWxlSWQsIG51bWJlcj4oKTtcbiAgY29uc3QgbnBjcyA9IG5ldyBNYXA8VGlsZUlkLCBudW1iZXI+KCk7XG4gIGNvbnN0IGNoZWNrcyA9IG5ldyBEZWZhdWx0TWFwPFRpbGVJZCwgU2V0PENoZWNrPj4oKCkgPT4gbmV3IFNldCgpKTtcbiAgY29uc3QgbW9uc3RlcnMgPSBuZXcgTWFwPFRpbGVJZCwgbnVtYmVyPigpOyAvLyBlbGVtZW50YWwgaW1tdW5pdGllc1xuICBjb25zdCBhbGxFeGl0cyA9IG5ldyBTZXQ8VGlsZUlkPigpO1xuXG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucyAvKi5zbGljZSgwLDQpKi8pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGV4dCA9IGxvY2F0aW9uLnNjcmVlblBhZ2U7XG4gICAgY29uc3QgdGlsZXNldCA9IHJvbS50aWxlc2V0c1tsb2NhdGlvbi50aWxlc2V0XTtcbiAgICBjb25zdCB0aWxlRWZmZWN0cyA9IHJvbS50aWxlRWZmZWN0c1tsb2NhdGlvbi50aWxlRWZmZWN0cyAtIDB4YjNdO1xuXG4gICAgLy8gRmluZCBhIGZldyBzcGF3bnMgZWFybHlcbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgLy8gV2FsbHMgbmVlZCB0byBjb21lIGZpcnN0IHNvIHdlIGNhbiBhdm9pZCBhZGRpbmcgc2VwYXJhdGVcbiAgICAgIC8vIHJlcXVpcmVtZW50cyBmb3IgZXZlcnkgc2luZ2xlIHdhbGwgLSBqdXN0IHVzZSB0aGUgdHlwZS5cbiAgICAgIGlmIChzcGF3bi5pc1dhbGwoKSkge1xuICAgICAgICB3YWxscy5zZXQoU2NyZWVuSWQuZnJvbShsb2NhdGlvbiwgc3Bhd24pLCAoc3Bhd24uaWQgJiAzKSBhcyBXYWxsVHlwZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRPRE8gLSBjdXJyZW50bHkgdGhpcyBpcyBicm9rZW4gLVxuICAgICAgLy8gICBbLi4ubGwucm91dGVzLnJvdXRlcy5nZXQodGlsZXMuZmluZCgweGE2MDA4OCkpLnZhbHVlcygpXS5tYXAocyA9PiBbLi4uc10ubWFwKHggPT4geC50b1N0cmluZygxNikpLmpvaW4oJyAmICcpKVxuICAgICAgLy8gTGlzdHMgNSB0aGluZ3M6IGZsaWdodCwgYnJlYWsgaXJvbiwgbXQgc2FicmUgcHJpc29uLCBzd2FuIGdhdGUsIGNyeXB0IGVudHJhbmNlXG4gICAgICAvLyAgIC0gc2hvdWxkIGF0IGxlYXN0IHJlcXVpcmUgYnJlYWtpbmcgc3RvbmUgb3IgaWNlP1xuXG4gICAgfVxuXG4gICAgLy8gQWRkIHRlcnJhaW5zXG4gICAgY29uc3QgaXNTaG9wID0gbG9jYXRpb24uaXNTaG9wKCk7XG4gICAgZm9yIChsZXQgeSA9IDAsIGhlaWdodCA9IGxvY2F0aW9uLmhlaWdodDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBsb2NhdGlvbi5zY3JlZW5zW3ldO1xuICAgICAgY29uc3Qgcm93SWQgPSBsb2NhdGlvbi5pZCA8PCA4IHwgeSA8PCA0O1xuICAgICAgZm9yIChsZXQgeCA9IDAsIHdpZHRoID0gbG9jYXRpb24ud2lkdGg7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjcmVlbiA9IHJvbS5zY3JlZW5zW3Jvd1t4XSB8IGV4dF07XG4gICAgICAgIGNvbnN0IHNjcmVlbklkID0gU2NyZWVuSWQocm93SWQgfCB4KTtcbiAgICAgICAgY29uc3QgZmxhZ1l4ID0gc2NyZWVuSWQgJiAweGZmO1xuICAgICAgICBjb25zdCB3YWxsID0gd2FsbHMuZ2V0KHNjcmVlbklkKTtcbiAgICAgICAgY29uc3QgZmxhZyA9XG4gICAgICAgICAgICB3YWxsICE9IG51bGwgP1xuICAgICAgICAgICAgICAgIG92ZXJsYXkud2FsbENhcGFiaWxpdHkod2FsbCkgOlxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLmZsYWdzLmZpbmQoZiA9PiBmLnNjcmVlbiA9PT0gZmxhZ1l4KTtcbiAgICAgICAgY29uc3Qgd2l0aEZsYWdNZW1vaXplZCA9IG1lbW9pemUyKCh0MTogVGVycmFpbiwgdDI6IFRlcnJhaW4pID0+IHtcbiAgICAgICAgICBpZiAoIWZsYWcpIHRocm93IG5ldyBFcnJvcihgZmxhZyBleHBlY3RlZGApO1xuICAgICAgICAgIHQyID0gey4uLnQyLCBlbnRlcjogbWVldCh0Mi5lbnRlciB8fCBbW11dLCBDb25kaXRpb24oZmxhZy5mbGFnKSl9O1xuICAgICAgICAgIHJldHVybiBUZXJyYWluLmpvaW4odDEsIHQyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGZ1bmN0aW9uIHdpdGhGbGFnKHQxOiBUZXJyYWluIHwgdW5kZWZpbmVkLCB0MjogVGVycmFpbiB8IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICghZmxhZykgdGhyb3cgbmV3IEVycm9yKGBmbGFnIGV4cGVjdGVkYCk7XG4gICAgICAgICAgaWYgKCF0MikgcmV0dXJuIHQxO1xuICAgICAgICAgIGlmICghdDEpIHJldHVybiBUZXJyYWluLm1lZXQoe2VudGVyOiBDb25kaXRpb24oZmxhZy5mbGFnKX0sIHQyKTtcbiAgICAgICAgICByZXR1cm4gd2l0aEZsYWdNZW1vaXplZCh0MSwgdDIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAobGV0IHQgPSAwOyB0IDwgMHhmMDsgdCsrKSB7XG4gICAgICAgICAgY29uc3QgdGlkID0gVGlsZUlkKHNjcmVlbklkIDw8IDggfCB0KTtcbiAgICAgICAgICBsZXQgdGlsZSA9IHNjcmVlbi50aWxlc1t0XTtcbiAgICAgICAgICAvLyBmbGFnIDJlZiBpcyBcImFsd2F5cyBvblwiLCBkb24ndCBldmVuIGJvdGhlciBtYWtpbmcgaXQgY29uZGl0aW9uYWwuXG4gICAgICAgICAgaWYgKGZsYWcgJiYgZmxhZy5mbGFnID09PSAweDJlZiAmJiB0aWxlIDwgMHgyMCkgdGlsZSA9IHRpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXTtcbiAgICAgICAgICBjb25zdCBlZmZlY3RzID0gaXNTaG9wID8gMCA6IHRpbGVFZmZlY3RzLmVmZmVjdHNbdGlsZV0gJiAweDI2O1xuICAgICAgICAgIGxldCB0ZXJyYWluID0gb3ZlcmxheS5tYWtlVGVycmFpbihlZmZlY3RzLCB0aWQpO1xuICAgICAgICAgIGlmICh0aWxlIDwgMHgyMCAmJiB0aWxlc2V0LmFsdGVybmF0ZXNbdGlsZV0gIT0gdGlsZSAmJiBmbGFnICYmIGZsYWcuZmxhZyAhPT0gMHgyZWYpIHtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0ZSA9XG4gICAgICAgICAgICAgICAgb3ZlcmxheS5tYWtlVGVycmFpbih0aWxlRWZmZWN0cy5lZmZlY3RzW3RpbGVzZXQuYWx0ZXJuYXRlc1t0aWxlXV0sIHRpZCk7XG4gICAgICAgICAgICB0ZXJyYWluID0gd2l0aEZsYWcodGVycmFpbiwgYWx0ZXJuYXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRlcnJhaW4pIHRlcnJhaW5zLnNldCh0aWQsIHRlcnJhaW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xvYmJlciB0ZXJyYWluIHdpdGggc2VhbWxlc3MgZXhpdHNcbiAgICBmb3IgKGNvbnN0IGV4aXQgb2YgbG9jYXRpb24uZXhpdHMpIHtcbiAgICAgIGlmIChleGl0LmVudHJhbmNlICYgMHgyMCkge1xuICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgICBhbGxFeGl0cy5hZGQodGlsZSk7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzID0gdGVycmFpbnMuZ2V0KHRpbGUpO1xuICAgICAgICBpZiAocHJldmlvdXMpIHRlcnJhaW5zLnNldCh0aWxlLCBUZXJyYWluLnNlYW1sZXNzKHByZXZpb3VzKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmluZCBcInRlcnJhaW4gdHJpZ2dlcnNcIiB0aGF0IHByZXZlbnQgbW92ZW1lbnQgb25lIHdheSBvciBhbm90aGVyXG4gICAgZnVuY3Rpb24gbWVldFRlcnJhaW4odGlsZTogVGlsZUlkLCB0ZXJyYWluOiBUZXJyYWluKTogdm9pZCB7XG4gICAgICBjb25zdCBwcmV2aW91cyA9IHRlcnJhaW5zLmdldCh0aWxlKTtcbiAgICAgIC8vIGlmIHRpbGUgaXMgaW1wb3NzaWJsZSB0byByZWFjaCwgZG9uJ3QgYm90aGVyLlxuICAgICAgaWYgKCFwcmV2aW91cykgcmV0dXJuO1xuICAgICAgdGVycmFpbnMuc2V0KHRpbGUsIFRlcnJhaW4ubWVldChwcmV2aW91cywgdGVycmFpbikpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNwYXduIG9mIGxvY2F0aW9uLnNwYXducykge1xuICAgICAgaWYgKHNwYXduLmlzVHJpZ2dlcigpKSB7XG4gICAgICAgIC8vIEZvciB0cmlnZ2Vycywgd2hpY2ggdGlsZXMgZG8gd2UgbWFyaz9cbiAgICAgICAgLy8gVGhlIHRyaWdnZXIgaGl0Ym94IGlzIDIgdGlsZXMgd2lkZSBhbmQgMSB0aWxlIHRhbGwsIGJ1dCBpdCBkb2VzIG5vdFxuICAgICAgICAvLyBsaW5lIHVwIG5pY2VseSB0byB0aGUgdGlsZSBncmlkLiAgQWxzbywgdGhlIHBsYXllciBoaXRib3ggaXMgb25seVxuICAgICAgICAvLyAkYyB3aWRlICh0aG91Z2ggaXQncyAkMTQgdGFsbCkgc28gdGhlcmUncyBzb21lIHNsaWdodCBkaXNwYXJpdHkuXG4gICAgICAgIC8vIEl0IHNlZW1zIGxpa2UgcHJvYmFibHkgbWFya2luZyBpdCBhcyAoeC0xLCB5LTEpIC4uICh4LCB5KSBtYWtlcyB0aGVcbiAgICAgICAgLy8gbW9zdCBzZW5zZSwgd2l0aCB0aGUgY2F2ZWF0IHRoYXQgdHJpZ2dlcnMgc2hpZnRlZCByaWdodCBieSBhIGhhbGZcbiAgICAgICAgLy8gdGlsZSBzaG91bGQgZ28gZnJvbSB4IC4uIHgrMSBpbnN0ZWFkLlxuICAgICAgICBjb25zdCB0cmlnZ2VyID0gb3ZlcmxheS50cmlnZ2VyKHNwYXduLmlkKTtcbiAgICAgICAgLy8gVE9ETyAtIGNvbnNpZGVyIGNoZWNraW5nIHRyaWdnZXIncyBhY3Rpb246ICQxOSAtPiBwdXNoLWRvd24gbWVzc2FnZVxuICAgICAgICBpZiAodHJpZ2dlci50ZXJyYWluIHx8IHRyaWdnZXIuY2hlY2spIHtcbiAgICAgICAgICBsZXQge3g6IHgwLCB5OiB5MH0gPSBzcGF3bjtcbiAgICAgICAgICB4MCArPSA4O1xuICAgICAgICAgIGZvciAoY29uc3QgbG9jIG9mIFtsb2NhdGlvbiwgLi4uKHRyaWdnZXIuZXh0cmFMb2NhdGlvbnMgfHwgW10pXSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBkeCBvZiB0cmlnZ2VyLmR4IHx8IFstMTYsIDBdKSB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZHkgb2YgWy0xNiwgMF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB4ID0geDAgKyBkeDtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0geTAgKyBkeTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jLCB7eCwgeX0pO1xuICAgICAgICAgICAgICAgIGlmICh0cmlnZ2VyLnRlcnJhaW4pIG1lZXRUZXJyYWluKHRpbGUsIHRyaWdnZXIudGVycmFpbik7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGVjayBvZiB0cmlnZ2VyLmNoZWNrIHx8IFtdKSB7XG4gICAgICAgICAgICAgICAgICBjaGVja3MuZ2V0KHRpbGUpLmFkZChjaGVjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTnBjKCkpIHtcbiAgICAgICAgbnBjcy5zZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSwgc3Bhd24uaWQpO1xuICAgICAgICBjb25zdCBucGMgPSBvdmVybGF5Lm5wYyhzcGF3bi5pZCwgbG9jYXRpb24pO1xuICAgICAgICBpZiAobnBjLnRlcnJhaW4gfHwgbnBjLmNoZWNrKSB7XG4gICAgICAgICAgbGV0IHt4OiB4cywgeTogeXN9ID0gc3Bhd247XG4gICAgICAgICAgbGV0IHt4MCwgeDEsIHkwLCB5MX0gPSBucGMuaGl0Ym94IHx8IHt4MDogMCwgeTA6IDAsIHgxOiAxLCB5MTogMX07XG4gICAgICAgICAgZm9yIChsZXQgZHggPSB4MDsgZHggPCB4MTsgZHgrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgZHkgPSB5MDsgZHkgPCB5MTsgZHkrKykge1xuICAgICAgICAgICAgICBjb25zdCB4ID0geHMgKyAxNiAqIGR4O1xuICAgICAgICAgICAgICBjb25zdCB5ID0geXMgKyAxNiAqIGR5O1xuICAgICAgICAgICAgICBjb25zdCB0aWxlID0gVGlsZUlkLmZyb20obG9jYXRpb24sIHt4LCB5fSk7XG4gICAgICAgICAgICAgIGlmIChucGMudGVycmFpbikgbWVldFRlcnJhaW4odGlsZSwgbnBjLnRlcnJhaW4pO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIG5wYy5jaGVjayB8fCBbXSkge1xuICAgICAgICAgICAgICAgIGNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzcGF3bi5pc0Jvc3MoKSkge1xuICAgICAgICAvLyBCb3NzZXMgd2lsbCBjbG9iYmVyIHRoZSBlbnRyYW5jZSBwb3J0aW9uIG9mIGFsbCB0aWxlcyBvbiB0aGUgc2NyZWVuLFxuICAgICAgICAvLyBhbmQgd2lsbCBhbHNvIGFkZCB0aGVpciBkcm9wLlxuICAgICAgICBib3NzZXMuc2V0KFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIHNwYXduLmlkKTtcbiAgICAgIH0gZWxzZSBpZiAoc3Bhd24uaXNDaGVzdCgpKSB7XG4gICAgICAgIGNoZWNrcy5nZXQoVGlsZUlkLmZyb20obG9jYXRpb24sIHNwYXduKSkuYWRkKENoZWNrLmNoZXN0KHNwYXduLmlkKSk7XG4gICAgICB9IGVsc2UgaWYgKHNwYXduLmlzTW9uc3RlcigpKSB7XG4gICAgICAgIC8vIFRPRE8gLSBjb21wdXRlIG1vbmV5LWRyb3BwaW5nIG1vbnN0ZXIgdnVsbmVyYWJpbGl0aWVzIGFuZCBhZGQgYSB0cmlnZ2VyXG4gICAgICAgIC8vIGZvciB0aGUgTU9ORVkgY2FwYWJpbGl0eSBkZXBlbmRlbnQgb24gYW55IG9mIHRoZSBzd29yZHMuXG4gICAgICAgIGNvbnN0IG1vbnN0ZXIgPSByb20ub2JqZWN0c1tzcGF3bi5tb25zdGVySWRdO1xuICAgICAgICBpZiAobW9uc3Rlci5nb2xkRHJvcCkgbW9uc3RlcnMuc2V0KFRpbGVJZC5mcm9tKGxvY2F0aW9uLCBzcGF3biksIG1vbnN0ZXIuZWxlbWVudHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgW2Jvc3NUaWxlLCBib3NzSWRdIG9mIGJvc3Nlcykge1xuICAgIGNvbnN0IGxvYyA9IGJvc3NUaWxlID4+IDE2O1xuICAgIGNvbnN0IHJhZ2UgPSBib3NzSWQgPT09IDB4YzM7XG4gICAgY29uc3QgYm9zcyA9ICFyYWdlID8gcm9tLmJvc3Nlcy5mcm9tTG9jYXRpb24obG9jKSA6IHJvbS5ib3NzZXMucmFnZTtcbiAgICBpZiAobG9jID09PSAweGEwIHx8IGxvYyA9PT0gMHg1ZikgY29udGludWU7IC8vIHNraXAgc3RhdHVlcyBhbmQgZHluYVxuICAgIGlmICghYm9zcyB8fCBib3NzLmtpbGwgPT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKGBiYWQgYm9zcyBhdCBsb2MgJHtsb2MudG9TdHJpbmcoMTYpfWApO1xuICAgIC8vIFRPRE8gLSBzaHVmZmxlIFJhZ2UncyBkZW1hbmRcbiAgICBjb25zdCBraWxsID0gQm9zcyhib3NzLmZsYWcpO1xuXG4gICAgY29uc3QgbWVyZ2UgPSBtZW1vaXplKCh0OiBUZXJyYWluKSA9PiBUZXJyYWluLm1lZXQodCwge2V4aXQ6IGtpbGwsIGV4aXRTb3V0aDoga2lsbH0pKTtcbiAgICBjb25zdCB0aWxlQmFzZSA9IGJvc3NUaWxlICYgfjB4ZmY7XG4gICAgY29uc3QgY29uZGl0aW9uID0gb3ZlcmxheS5ib3NzUmVxdWlyZW1lbnRzKGJvc3MpO1xuICAgIGNvbnN0IGNoZWNrID0ge3Nsb3Q6IFNsb3Qoa2lsbCksIGNvbmRpdGlvbn07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAweGYwOyBpKyspIHtcbiAgICAgIGNvbnN0IHRpbGUgPSBUaWxlSWQodGlsZUJhc2UgfCBpKTtcbiAgICAgIGNvbnN0IHQgPSB0ZXJyYWlucy5nZXQodGlsZSk7XG4gICAgICBpZiAoIXQpIGNvbnRpbnVlO1xuICAgICAgdGVycmFpbnMuc2V0KHRpbGUsIG1lcmdlKHQpKTtcbiAgICAgIGNoZWNrcy5nZXQodGlsZSkuYWRkKGNoZWNrKTtcbiAgICB9XG4gICAgLy8gY29uc3QgY2hlY2tUaWxlID0gcmFnZSA/IFRpbGVJZCh0aWxlQmFzZSB8IDB4ODgpIDogYm9zc1RpbGU7XG4gIH1cblxuICBmb3IgKGNvbnN0IGNoZWNrIG9mIG92ZXJsYXkubG9jYXRpb25zKCkgfHwgW10pIHtcbiAgICBjaGVja3MuZ2V0KGNoZWNrLnRpbGUpLmFkZChjaGVjayk7XG4gIH1cblxuICAvLyBsZXQgcyA9IDE7XG4gIC8vIGNvbnN0IHdlYWsgPSBuZXcgV2Vha01hcDxvYmplY3QsIG51bWJlcj4oKTtcbiAgLy8gZnVuY3Rpb24gdWlkKHg6IHVua25vd24pOiBudW1iZXIge1xuICAvLyAgIGlmICh0eXBlb2YgeCAhPT0gJ29iamVjdCcgfHwgIXgpIHJldHVybiAtMTtcbiAgLy8gICBpZiAoIXdlYWsuaGFzKHgpKSB3ZWFrLnNldCh4LCBzKyspO1xuICAvLyAgIHJldHVybiB3ZWFrLmdldCh4KSB8fCAtMTtcbiAgLy8gfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgd2UndmUgZ290IGEgZnVsbCBtYXBwaW5nIG9mIGFsbCB0ZXJyYWlucyBwZXIgbG9jYXRpb24uXG4gIC8vIE5vdyB3ZSBkbyBhIGdpYW50IHVuaW9uZmluZCBhbmQgZXN0YWJsaXNoIGNvbm5lY3Rpb25zIGJldHdlZW4gc2FtZSBhcmVhcy5cbiAgY29uc3QgdGlsZXMgPSBuZXcgVW5pb25GaW5kPFRpbGVJZD4oKTtcbiAgZm9yIChjb25zdCBbdGlsZSwgdGVycmFpbl0gb2YgdGVycmFpbnMpIHtcbiAgICBjb25zdCB4MSA9IFRpbGVJZC5hZGQodGlsZSwgMCwgMSk7XG4gICAgaWYgKHRlcnJhaW5zLmdldCh4MSkgPT09IHRlcnJhaW4pIHRpbGVzLnVuaW9uKFt0aWxlLCB4MV0pO1xuICAgIGNvbnN0IHkxID0gVGlsZUlkLmFkZCh0aWxlLCAxLCAwKTtcbiAgICBpZiAodGVycmFpbnMuZ2V0KHkxKSA9PT0gdGVycmFpbikgdGlsZXMudW5pb24oW3RpbGUsIHkxXSk7XG4gICAgLy8gY29uc29sZS5sb2coYCR7aGV4KHRpbGUpfTogJHt1aWQodGVycmFpbil9YCk7XG4gICAgLy8gY29uc29sZS5sb2codGVycmFpbik7XG4gICAgLy8gY29uc29sZS5sb2coYCAreDogJHtoZXgoeDEpfTogJHt1aWQodGVycmFpbnMuZ2V0KHgxKSl9YCk7XG4gICAgLy8gY29uc29sZS5sb2coYCAreTogJHtoZXgoeTEpfTogJHt1aWQodGVycmFpbnMuZ2V0KHkxKSl9YCk7XG4gIH1cblxuICAvLyBBZGQgZXhpdHMgdG8gYSBtYXAuICBXZSBkbyB0aGlzICphZnRlciogdGhlIGluaXRpYWwgdW5pb25maW5kIHNvIHRoYXRcbiAgLy8gdHdvLXdheSBleGl0cyBjYW4gYmUgdW5pb25lZCBlYXNpbHkuXG4gIGNvbnN0IGV4aXRTZXQgPSBuZXcgU2V0PFRpbGVQYWlyPigpO1xuICBmb3IgKGNvbnN0IGxvY2F0aW9uIG9mIHJvbS5sb2NhdGlvbnMvKi5zbGljZSgwLDIpKi8pIHtcbiAgICBpZiAoIWxvY2F0aW9uLnVzZWQpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiBsb2NhdGlvbi5leGl0cykge1xuICAgICAgY29uc3Qge2Rlc3QsIGVudHJhbmNlfSA9IGV4aXQ7XG4gICAgICBjb25zdCBmcm9tID0gVGlsZUlkLmZyb20obG9jYXRpb24sIGV4aXQpO1xuICAgICAgLy8gSGFuZGxlIHNlYW1sZXNzIGV4aXRzXG4gICAgICBjb25zdCB0byA9IGVudHJhbmNlICYgMHgyMCA/XG4gICAgICAgICAgVGlsZUlkKGZyb20gJiAweGZmZmYgfCAoZGVzdCA8PCAxNikpIDpcbiAgICAgICAgICBUaWxlSWQuZnJvbSh7aWQ6IGRlc3R9IGFzIGFueSwgcm9tLmxvY2F0aW9uc1tkZXN0XS5lbnRyYW5jZXNbZW50cmFuY2VdKTtcbiAgICAgIC8vIE5PVEU6IHdlIGNvdWxkIHNraXAgYWRkaW5nIGV4aXRzIGlmIHRoZSB0aWxlcyBhcmUgbm90IGtub3duXG4gICAgICBleGl0U2V0LmFkZChUaWxlUGFpci5vZih0aWxlcy5maW5kKGZyb20pLCB0aWxlcy5maW5kKHRvKSkpO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGV4aXQgb2YgZXhpdFNldCkge1xuICAgIGNvbnN0IFtmcm9tLCB0b10gPSBUaWxlUGFpci5zcGxpdChleGl0KTtcbiAgICBpZiAodGVycmFpbnMuZ2V0KGZyb20pICE9PSB0ZXJyYWlucy5nZXQodG8pKSBjb250aW51ZTtcbiAgICBjb25zdCByZXZlcnNlID0gVGlsZVBhaXIub2YodG8sIGZyb20pO1xuICAgIGlmIChleGl0U2V0LmhhcyhyZXZlcnNlKSkge1xuICAgICAgdGlsZXMudW5pb24oW2Zyb20sIHRvXSk7XG4gICAgICBleGl0U2V0LmRlbGV0ZShleGl0KTtcbiAgICAgIGV4aXRTZXQuZGVsZXRlKHJldmVyc2UpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vdyBsb29rIGZvciBhbGwgZGlmZmVyZW50LXRlcnJhaW4gbmVpZ2hib3JzIGFuZCB0cmFjayBjb25uZWN0aW9ucy5cbiAgY29uc3QgbmVpZ2hib3JzID0gbmV3IE5laWdoYm9ycyh0aWxlcywgYWxsRXhpdHMpO1xuICBmb3IgKGNvbnN0IFt0aWxlLCB0ZXJyYWluXSBvZiB0ZXJyYWlucykge1xuICAgIGNvbnN0IHgxID0gVGlsZUlkLmFkZCh0aWxlLCAwLCAxKTtcbiAgICBjb25zdCB0eDEgPSB0ZXJyYWlucy5nZXQoeDEpO1xuICAgIGlmICh0eDEgJiYgdHgxICE9PSB0ZXJyYWluKSBuZWlnaGJvcnMuYWRkQWRqYWNlbnQodGlsZSwgeDEsIGZhbHNlKTtcbiAgICBjb25zdCB5MSA9IFRpbGVJZC5hZGQodGlsZSwgMSwgMCk7XG4gICAgY29uc3QgdHkxID0gdGVycmFpbnMuZ2V0KHkxKTtcbiAgICBpZiAodHkxICYmIHR5MSAhPT0gdGVycmFpbikgbmVpZ2hib3JzLmFkZEFkamFjZW50KHRpbGUsIHkxLCB0cnVlKTtcbiAgfVxuXG4gIC8vIEFsc28gYWRkIGFsbCB0aGUgcmVtYWluaW5nIGV4aXRzLiAgV2UgZGVjb21wb3NlIGFuZCByZWNvbXBvc2UgdGhlbSB0b1xuICAvLyB0YWtlIGFkdmFudGFnZSBvZiBhbnkgbmV3IHVuaW9ucyBmcm9tIHRoZSBwcmV2aW91cyBleGl0IHN0ZXAuXG4gIGZvciAoY29uc3QgZXhpdCBvZiBleGl0U2V0KSB7XG4gICAgY29uc3QgW2Zyb20sIHRvXSA9IFRpbGVQYWlyLnNwbGl0KGV4aXQpO1xuICAgIGlmICghdGVycmFpbnMuaGFzKGZyb20pIHx8ICF0ZXJyYWlucy5oYXModG8pKSBjb250aW51ZTtcbiAgICBuZWlnaGJvcnMuYWRkRXhpdChmcm9tLCB0byk7XG4gIH1cblxuICAvLyBUT0RPIC0gaGFyZGNvZGUgc29tZSBleGl0c1xuICAvLyAgLSB0aGUgdHJhbnNpdGlvbiBmcm9tICQ1MSB0byAkNjAgaXMgaW1wYXNzaWJsZSBvbiBib3RoIHNpZGVzOlxuICAvLyAgICBhZGQgYSBjb25kaXRpb25hbCBleGl0IGZyb20gdGhlIGJvYXQgdGlsZSB0byB0aGUgYmVhY2ggKGJvdGggd2F5cylcbiAgLy8gIC0gc29tZSB0cmFuc2l0aW9ucyBpbiB0aGUgdG93ZXIgYXJlIG9uIHRvcCBvZiBpbXBhc3NpYmxlLWxvb2tpbmcgdGlsZXNcblxuICBjb25zdCByb3V0ZXMgPSBuZXcgUm91dGVzKCk7XG4gIGZvciAoY29uc3QgciBvZiBvdmVybGF5LmV4dHJhUm91dGVzKCkpIHtcbiAgICBmb3IgKGNvbnN0IGMgb2Ygci5jb25kaXRpb24gfHwgW1tdXSkge1xuICAgICAgcm91dGVzLmFkZFJvdXRlKHRpbGVzLmZpbmQoci50aWxlKSwgYyk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qge2Zyb20sIHRvLCBjb25kaXRpb259IG9mIG92ZXJsYXkuZXh0cmFFZGdlcygpKSB7XG4gICAgZm9yIChjb25zdCBkZXBzIG9mIGNvbmRpdGlvbiB8fCBbW11dKSB7XG4gICAgICByb3V0ZXMuYWRkRWRnZSh0aWxlcy5maW5kKHRvKSwgdGlsZXMuZmluZChmcm9tKSwgZGVwcyk7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3Qge2Zyb20sIHRvLCBzb3V0aH0gb2YgbmVpZ2hib3JzKSB7XG4gICAgLy8gYWxsIHRlcnJhaW5zIGFkZGVkLCBzbyBjYW4gY29ubmVjdC5cbiAgICBjb25zdCBmID0gdGVycmFpbnMuZ2V0KGZyb20pO1xuICAgIGNvbnN0IHQgPSB0ZXJyYWlucy5nZXQodG8pO1xuICAgIGlmICghZiB8fCAhdCkgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIHRlcnJhaW4gJHtmID8gdG8gOiBmcm9tfWApO1xuICAgIGZvciAoY29uc3QgZXhpdCBvZiAoc291dGggPyBmLmV4aXRTb3V0aCA6IGYuZXhpdCkgfHwgW1tdXSkge1xuICAgICAgZm9yIChjb25zdCBlbnRyYW5jZSBvZiB0LmVudGVyIHx8IFtbXV0pIHtcbiAgICAgICAgcm91dGVzLmFkZEVkZ2UodG8sIGZyb20sIFsuLi5lbnRyYW5jZSwgLi4uZXhpdF0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHJlcXMgPSBuZXcgRGVmYXVsdE1hcDxTbG90LCBNdXRhYmxlUmVxdWlyZW1lbnQ+KCgpID0+IG5ldyBNdXRhYmxlUmVxdWlyZW1lbnQoKSk7XG4gIC8vIE5vdyB3ZSBhZGQgdGhlIHNsb3RzLlxuICAvLyBOb3RlIHRoYXQgd2UgbmVlZCBhIHdheSB0byBlbnN1cmUgdGhhdCBhbGwgdGhlIHJpZ2h0IHNwb3RzIGdldCB1cGRhdGVkXG4gIC8vIHdoZW4gd2UgZmlsbCBhIHNsb3QuICBPbmUgd2F5IGlzIHRvIG9ubHkgdXNlIHRoZSAyeHggZmxhZ3MgaW4gdGhlIHZhcmlvdXNcbiAgLy8gcGxhY2VzIGZvciB0aGluZ3MgdGhhdCBzaG91bGQgYmUgcmVwbGFjZWQgd2hlbiB0aGUgc2xvdCBpcyBmaWxsZWQuXG4gIC8vXG4gIC8vIEZvciB0aGUgYWN0dWFsIHNsb3RzLCB3ZSBrZWVwIHRyYWNrIG9mIHdoZXJlIHRoZXkgd2VyZSBmb3VuZCBpbiBhIHNlcGFyYXRlXG4gIC8vIGRhdGEgc3RydWN0dXJlIHNvIHRoYXQgd2UgY2FuIGZpbGwgdGhlbS5cblxuICAvLyBBZGQgZml4ZWQgY2FwYWJpbGl0aWVzXG4gIGZvciAoY29uc3Qge2NvbmRpdGlvbiA9IFtbXV0sIGNhcGFiaWxpdHl9IG9mIG92ZXJsYXkuY2FwYWJpbGl0aWVzKCkpIHtcbiAgICByZXFzLmdldChTbG90KGNhcGFiaWxpdHkpKS5hZGRBbGwoY29uZGl0aW9uKTtcbiAgfVxuXG4gIC8vIENvbnNvbGlkYXRlIGFsbCB0aGUgY2hlY2tzIGludG8gYSBzaW5nbGUgc2V0LlxuICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NldF0gb2YgY2hlY2tzKSB7XG4gICAgY29uc3Qgcm9vdCA9IHRpbGVzLmZpbmQodGlsZSk7XG4gICAgaWYgKHRpbGUgPT09IHJvb3QpIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgY2hlY2sgb2YgY2hlY2tzZXQpIHtcbiAgICAgIGNoZWNrcy5nZXQocm9vdCkuYWRkKGNoZWNrKTtcbiAgICB9XG4gICAgY2hlY2tzLmRlbGV0ZSh0aWxlKTtcbiAgfVxuXG4gIC8vIE5vdyBhbGwga2V5cyBhcmUgdW5pb25maW5kIHJvb3RzLlxuICBmb3IgKGNvbnN0IFt0aWxlLCBjaGVja3NldF0gb2YgY2hlY2tzKSB7XG4gICAgZm9yIChjb25zdCB7c2xvdCwgY29uZGl0aW9uID0gW1tdXX0gb2YgY2hlY2tzZXQpIHtcbiAgICAgIGNvbnN0IHJlcSA9IHJlcXMuZ2V0KHNsb3QpO1xuICAgICAgZm9yIChjb25zdCByMSBvZiBjb25kaXRpb24pIHtcbiAgICAgICAgZm9yIChjb25zdCByMiBvZiByb3V0ZXMucm91dGVzLmdldCh0aWxlKSB8fCBbXSkge1xuICAgICAgICAgIHJlcS5hZGRMaXN0KFsuLi5yMSwgLi4ucjJdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIE5vdGU6IGF0IHRoaXMgcG9pbnQgd2UndmUgYnVpbHQgdXAgdGhlIG1haW4gaW5pdGlhbCBsb2NhdGlvbiBsaXN0LlxuICAvLyBXZSBuZWVkIHRvIHJldHVybiBzb21ldGhpbmcgdXNlZnVsIG91dCBvZiBpdC5cbiAgLy8gIC0gc29tZSBpbnRlcmZhY2UgdGhhdCBjYW4gYmUgdXNlZCBmb3IgYXNzdW1lZC1maWxsIGxvZ2ljLlxuICAvLyAgLSB3YW50IGEgdXNhYmxlIHRvU3RyaW5nIGZvciBzcG9pbGVyIGxvZy5cbiAgLy8gIC0gd291bGQgYmUgbmljZSB0byBoYXZlIHBhY2tlZCBiaWdpbnRzIGlmIHBvc3NpYmxlP1xuICAvLyBBbnkgc2xvdHMgdGhhdCBhcmUgTk9UIHJlcXVpcmVtZW50cyBzaG91bGQgYmUgZmlsdGVyZWQgb3V0XG5cbiAgLy8gQnVpbGQgdXAgYSBncmFwaD8hP1xuICAvLyBXaWxsIG5lZWQgdG8gbWFwIHRvIHNtYWxsZXIgbnVtYmVycz9cbiAgLy8gQ2FuIHdlIGNvbXByZXNzIGxhemlseT9cbiAgLy8gIC0gZXZlcnl0aGluZyB3ZSBzZWUgYXMgYSByZXF1aXJlbWVudCBnb2VzIGludG8gb25lIGxpc3QvbWFwXG4gIC8vICAtIGV2ZXJ5dGhpbmcgd2Ugc2VlIGFzIGEgXCJnZXRcIiBnb2VzIGludG8gYW5vdGhlclxuICAvLyAgLSBmaWxsaW5nIG1hcHMgYmV0d2VlbiB0aGVtXG4gIC8vIHN0YXJ0IGF0IGVudHJhbmNlLCBidWlsZCBmdWxsIHJlcXVpcmVtZW50cyBmb3IgZWFjaCBwbGFjZVxuICAvLyBmb2xsb3cgZXhpdHM6XG4gIC8vICAtIGZvciBlYWNoIGV4aXQsIHVwZGF0ZSByZXF1aXJlbWVudHMsIHF1ZXVlIHJlY2hlY2sgaWYgY2hhbmdlZFxuICAvLyAgLSB3ZSBjb3VsZCBkbyBhIGxlc3MtdGhvcm91Z2ggdmVyc2lvbjpcbiAgLy8gICAgIC0gc3RhcnQgYXQgZW50cmFuY2UsIGFkZCAob3BlbikgcmVxdWlyZW1lbnRcbiAgLy8gICAgIC0gcXVldWUgYWxsIGV4aXRzLCBpZ25vcmluZyBhbnkgYWxyZWFkeSBzZWVuXG4gIC8vICAgICAgIGtlZXAgdHJhY2sgb2Ygd2hpY2ggbG9jYXRpb25zIGhhZCBjaGFuZ2VkIHJlcXNcbiAgLy8gICAgIC0gb25jZSBxdWV1ZSBmbHVzaGVzLCByZXBsYWNlIHF1ZXVlIHdpdGggY2hhbmdlZFxuICAvLyAgICAgLSByZXBlYXQgdW50aWwgY2hhbmdlZCBpcyBlbXB0eSBhdCBlbmQgb2YgcXVldWVcblxuICAvLyBGb3IgbW9uc3RlcnMgLSBmaWd1cmUgb3V0IHdoaWNoIHN3b3JkcyBsZWFkIHRvIG1vbmV5XG4gICAgICAgIC8vIGlmICghKGVsZW1lbnRzICYgMHgxKSkgbW9uZXlTd29yZHMuYWRkKDApO1xuICAgICAgICAvLyBpZiAoIShlbGVtZW50cyAmIDB4MikpIG1vbmV5U3dvcmRzLmFkZCgxKTtcbiAgICAgICAgLy8gaWYgKCEoZWxlbWVudHMgJiAweDQpKSBtb25leVN3b3Jkcy5hZGQoMik7XG4gICAgICAgIC8vIGlmICghKGVsZW1lbnRzICYgMHg4KSkgbW9uZXlTd29yZHMuYWRkKDMpO1xuXG4gIC8vIGNvbnN0IGVudHJhbmNlID0gcm9tLmxvY2F0aW9uc1tzdGFydF0uZW50cmFuY2VzWzBdO1xuICAvLyB0aGlzLmFkZEVudHJhbmNlKHBhcnNlQ29vcmQoc3RhcnQsIGVudHJhbmNlKSk7XG5cbiAgaWYgKERFQlVHICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc3QgdyA9IHdpbmRvdyBhcyBhbnk7XG4gICAgY29uc29sZS5sb2cody5yb290cyA9ICh3LnRpbGVzID0gdGlsZXMpLnJvb3RzKCkpO1xuICAgIGNvbnNvbGUubG9nKFsuLi4ody5uZWlnaGJvcnMgPSBuZWlnaGJvcnMpXSk7XG4gICAgY29uc29sZS5sb2cody5sbCA9IHJvdXRlcyk7XG5cbiAgICBmdW5jdGlvbiBoKHg6IG51bWJlcik6IHN0cmluZyB7XG4gICAgICByZXR1cm4geCA8IDAgPyAnficgKyAofngpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpIDpcbiAgICAgICAgICB4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgzLCAnMCcpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBkbmYoeDogSXRlcmFibGU8SXRlcmFibGU8bnVtYmVyPj4sIGYgPSBoKTogc3RyaW5nIHtcbiAgICAgIGNvbnN0IHhzID0gWy4uLnhdO1xuICAgICAgaWYgKCF4cy5sZW5ndGgpIHJldHVybiAnbm8gcm91dGUnO1xuICAgICAgcmV0dXJuICcoJyArIHhzLm1hcCh5ID0+IFsuLi55XS5tYXAoZikuam9pbignICYgJykpXG4gICAgICAgICAgLmpvaW4oJykgfFxcbiAgICAgKCcpICsgJyknO1xuICAgIH1cbiAgICB3LmFyZWEgPSAodGlsZTogVGlsZUlkLCBmOiAoeDogbnVtYmVyKSA9PiBzdHJpbmcgPSBoKSA9PiB7XG4gICAgICBjb25zdCBzID0gWy4uLnRpbGVzLnNldHMoKS5maWx0ZXIocyA9PiBzLmhhcyh0aWxlKSlbMF1dXG4gICAgICAgICAgLm1hcCh4ID0+IHgudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDYsICcwJykpO1xuICAgICAgLy8gY29uc3QgciA9ICcoJyArIFsuLi5yb3V0ZXMucm91dGVzLmdldCh0aWxlcy5maW5kKHRpbGUpKV1cbiAgICAgIC8vICAgICAubWFwKHMgPT4gWy4uLnNdLm1hcCh4ID0+IHggPCAwID8gJ34nICsgKH54KS50b1N0cmluZygxNikgOlxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgIHgudG9TdHJpbmcoMTYpKS5qb2luKCcgJiAnKSlcbiAgICAgIC8vICAgICAuam9pbignKSB8ICgnKSArICcpJztcbiAgICAgIGNvbnN0IHIgPSBkbmYocm91dGVzLnJvdXRlcy5nZXQodGlsZXMuZmluZCh0aWxlKSksIGYpO1xuICAgICAgLy8gbmVpZ2hib3JzXG4gICAgICBjb25zdCBlZGdlcyA9IFtdO1xuICAgICAgY29uc3QgdCA9IHRpbGVzLmZpbmQodGlsZSk7XG4gICAgICBmb3IgKGNvbnN0IG91dCBvZiAocm91dGVzLmVkZ2VzLmdldCh0KSB8fCBuZXcgTWFwKCkpLnZhbHVlcygpKSB7XG4gICAgICAgIGVkZ2VzLnB1c2goYFxcbnRvICR7b3V0LnRhcmdldC50b1N0cmluZygxNil9IGlmICgke1xuICAgICAgICAgICAgICAgICAgICBbLi4ub3V0LmRlcHNdLm1hcChmKS5qb2luKCcgJiAnKX0pYCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IFtmcm9tLCByc10gb2Ygcm91dGVzLmVkZ2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdG8gb2YgcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICBpZiAodG8udGFyZ2V0ICE9PSB0KSBjb250aW51ZTtcbiAgICAgICAgICBlZGdlcy5wdXNoKGBcXG5mcm9tICR7ZnJvbS50b1N0cmluZygxNil9IGlmICgke1xuICAgICAgICAgICAgICAgICAgICAgIFsuLi50by5kZXBzXS5tYXAoZikuam9pbignICYgJyl9KWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmdW5jdGlvbiBncm91cChhcnI6IHVua25vd25bXSwgY291bnQ6IG51bWJlciwgc3BhY2VyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG91dCA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkgKz0gY291bnQpIHtcbiAgICAgICAgICBvdXQucHVzaChhcnIuc2xpY2UoaSwgaSArIGNvdW50KS5qb2luKHNwYWNlcikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gYCR7aGV4KHQpfVxcbiR7Z3JvdXAocywgMTYsICcgJykuam9pbignXFxuJyl9XFxuY291bnQgPSAke1xuICAgICAgICAgICAgICBzLmxlbmd0aH1cXG5yb3V0ZXMgPSAke3J9JHtlZGdlcy5qb2luKCcnKX1gO1xuICAgIH07XG5cbiAgICB3LndoYXRGbGFnID0gKGY6IG51bWJlcikgPT4gY29uZGl0aW9uTmFtZShmLCByb20pO1xuXG4gICAgdy5yZXFzID0gcmVxcztcbiAgICBjb25zb2xlLmxvZygncmVxc1xcbicgKyBbLi4ucmVxc10uc29ydCgoW2FdLCBbYl0pID0+IGEgLSBiKVxuICAgICAgICAgICAgICAgIC5tYXAoKFtzLCByXSkgPT4gYCR7dy53aGF0RmxhZyhzKX06ICR7ZG5mKHIsdy53aGF0RmxhZyl9YClcbiAgICAgICAgICAgICAgICAuam9pbignXFxuJykpO1xuXG4gICAgdy5yZXFzLmNoZWNrID1cbiAgICAgICAgKGlkOiBudW1iZXIsIGY6ICgoZmxhZzogbnVtYmVyKSA9PiBzdHJpbmcpID0gaCk6IHN0cmluZyA9PlxuICAgICAgICAgICAgYCR7ZihpZCl9OiAke2RuZihyZXFzLmdldChTbG90KGlkKSksIGYpfWA7XG4gICAgdy5yZXFzLmNoZWNrMiA9IChpZDogbnVtYmVyKTogc3RyaW5nID0+IHcucmVxcy5jaGVjayhpZCwgdy53aGF0RmxhZyk7XG4gIH1cblxuICAvLyBTdW1tYXJ5OiAxMDU1IHJvb3RzLCAxNzI0IG5laWdoYm9yc1xuICAvLyBUaGlzIGlzIHRvbyBtdWNoIGZvciBhIGZ1bGwgZ3JhcGggdHJhdmVyc2FsLCBidXQgbWFueSBjYW4gYmUgcmVtb3ZlZD8/P1xuICAvLyAgIC0+IHNwZWNpZmljYWxseSB3aGF0P1xuXG4gIC8vIEFkZCBpdGVtZ2V0cyBhbmQgbnBjcyB0byByb290c1xuICAvLyAgLSBOUEMgd2lsbCBuZWVkIHRvIGNvbWUgZnJvbSBhIG1ldGFzdHJ1Y3R1cmUgb2Ygc2h1ZmZsZWQgTlBDcywgbWF5YmU/XG4gIC8vICAtLS0gaWYgd2UgbW92ZSBha2FoYW5hIG91dCBvZiBicnlubWFlciwgbmVlZCB0byBrbm93IHdoaWNoIGl0ZW0gaXMgd2hpY2hcblxuXG4gIC8vIEJ1aWxkIHVwIHNodWZmbGUuR3JhcGhcbiAgLy8gRmlyc3QgZmlndXJlIG91dCB3aGljaCBpdGVtcyBhbmQgZXZlbnRzIGFyZSBhY3R1YWxseSBuZWVkZWQuXG4gIGxldCBmaWxsZWQgPSBpc0l0ZW07XG4gIGlmICh0cmFja2VyKSB7XG4gICAgLy8gcHVsbCBvdXQgb3RoZXIgYml0cyB0byBiZSBmaWxsZWQgaW4uXG4gICAgZmlsbGVkID0gZnVuY3Rpb24oYzogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICBpZiAoaXNJdGVtKGMpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChmbGFncy5zaHVmZmxlQm9zc0VsZW1lbnRzKCkgJiYgcm9tLmJvc3Nlcy5pc0Jvc3NGbGFnKGMpKSByZXR1cm4gdHJ1ZTtcbiAgICAgIC8vIFRPRE8gLSB3YWxscz9cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBXb3JsZChyb20sIHRpbGVzLCBtYWtlR3JhcGgocmVxcywgcm9tLCBmaWxsZWQpKTtcbn1cblxuLy8gZnVuY3Rpb24gaXNCb3NzKGM6IG51bWJlcik6IGJvb2xlYW4ge1xuLy8gICByZXR1cm4gfmMgPj0gMHgxMDAgJiYgfmMgPCAweDExMDtcbi8vIH1cbmZ1bmN0aW9uIGlzSXRlbShjOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGMgPj0gMHgyMDAgJiYgYyA8IDB4MjgwO1xufVxuXG4vKiogQHBhcmFtIGZsYWdzIE9ubHkgaWYgdHJhY2tlciAqL1xuZnVuY3Rpb24gbWFrZUdyYXBoKHJlcXM6IE1hcDxTbG90LCBNdXRhYmxlUmVxdWlyZW1lbnQ+LFxuICAgICAgICAgICAgICAgICAgIHJvbTogUm9tLFxuICAgICAgICAgICAgICAgICAgIGZpbGxlZDogKGM6IG51bWJlcikgPT4gYm9vbGVhbik6IHNodWZmbGUuR3JhcGgge1xuICAvLyBGaWd1cmUgb3V0IHdoaWNoIGl0ZW1zIGFyZSB1c2VkLCBidWlsZCB0d28gc2V0cy5cbiAgY29uc3QgYWxsQ29uZGl0aW9uc1NldCA9IG5ldyBTZXQ8Q29uZGl0aW9uPigpO1xuICBjb25zdCBhbGxTbG90c1NldCA9IG5ldyBTZXQ8U2xvdD4oKTtcbiAgZm9yIChjb25zdCBbc2xvdCwgcmVxXSBvZiByZXFzKSB7XG4gICAgYWxsU2xvdHNTZXQuYWRkKHNsb3QpO1xuICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICBmb3IgKGNvbnN0IGMgb2YgY3MpIHtcbiAgICAgICAgYWxsQ29uZGl0aW9uc1NldC5hZGQoYyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIE5vdGhpbmcgZGVwZW5kcyBvbiB0aGlzIGJ1dCB3ZSBzaG91bGQgdHJhY2sgaXQgYW55d2F5LlxuICBhbGxDb25kaXRpb25zU2V0LmFkZChCb3NzLkRSQVlHT04yWzBdWzBdKTtcblxuICBjb25zdCBhbGxDb25kaXRpb25zID0gWy4uLmFsbENvbmRpdGlvbnNTZXRdLmZpbHRlcihjID0+ICFmaWxsZWQoYykpLnNvcnQoKTtcbiAgY29uc3QgYWxsSXRlbXMgPSBbLi4uYWxsQ29uZGl0aW9uc1NldF0uZmlsdGVyKGZpbGxlZCkuc29ydCgpO1xuICBjb25zdCBhbGxTbG90cyA9IFsuLi5hbGxTbG90c1NldF0uZmlsdGVyKGZpbGxlZCkuc29ydCgpO1xuICBjb25zdCBmaXhlZCA9IGFsbENvbmRpdGlvbnMubGVuZ3RoO1xuXG4gIGZ1bmN0aW9uIG1ha2VOb2RlKGNvbmRpdGlvbjogbnVtYmVyLCBpbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHtuYW1lOiBjb25kaXRpb25OYW1lKGNvbmRpdGlvbiwgcm9tKSwgY29uZGl0aW9uLCBpbmRleH0gYXNcbiAgICAgICAgc2h1ZmZsZS5JdGVtTm9kZSAmIHNodWZmbGUuU2xvdE5vZGU7XG4gIH1cbiAgZnVuY3Rpb24gaXRlbU5vZGUoY29uZGl0aW9uOiBudW1iZXIsIGluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihtYWtlTm9kZShjb25kaXRpb24sIGluZGV4ICsgZml4ZWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtOiAoY29uZGl0aW9uICYgMHg3ZikgYXMgYW55fSk7XG4gIH1cbiAgY29uc3QgY29uZGl0aW9uTm9kZXMgPSBhbGxDb25kaXRpb25zLm1hcChtYWtlTm9kZSk7XG4gIGNvbnN0IGl0ZW1Ob2RlcyA9IGFsbEl0ZW1zLm1hcChpdGVtTm9kZSk7XG4gIGNvbnN0IHNsb3ROb2RlcyA9IGFsbFNsb3RzLm1hcChpdGVtTm9kZSk7XG5cbiAgY29uc3QgaXRlbXM6IHNodWZmbGUuSXRlbU5vZGVbXSA9IFsuLi5jb25kaXRpb25Ob2RlcywgLi4uaXRlbU5vZGVzXTtcbiAgY29uc3Qgc2xvdHM6IHNodWZmbGUuU2xvdE5vZGVbXSA9IFsuLi5jb25kaXRpb25Ob2RlcywgLi4uc2xvdE5vZGVzXTtcblxuICBjb25zdCBpdGVtSW5kZXhNYXAgPVxuICAgICAgbmV3IE1hcDxDb25kaXRpb24sIHNodWZmbGUuSXRlbUluZGV4PihcbiAgICAgICAgICBpdGVtcy5tYXAoKGMsIGkpID0+IFtjLmNvbmRpdGlvbiBhcyBDb25kaXRpb24sIGkgYXMgc2h1ZmZsZS5JdGVtSW5kZXhdKSk7XG4gIGZ1bmN0aW9uIGdldEl0ZW1JbmRleChjOiBDb25kaXRpb24pOiBzaHVmZmxlLkl0ZW1JbmRleCB7XG4gICAgY29uc3QgaW5kZXggPSBpdGVtSW5kZXhNYXAuZ2V0KGMpO1xuICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaXRlbSAkJHtjLnRvU3RyaW5nKDE2KX06ICR7Y29uZGl0aW9uTmFtZShjLCByb20pfWApO1xuICAgIH1cbiAgICByZXR1cm4gaW5kZXg7XG4gIH1cbiAgY29uc3Qgc2xvdEluZGV4TWFwID1cbiAgICAgIG5ldyBNYXA8U2xvdCwgc2h1ZmZsZS5TbG90SW5kZXg+KFxuICAgICAgICAgIHNsb3RzLm1hcCgoYywgaSkgPT4gW2MuY29uZGl0aW9uIGFzIFNsb3QsIGkgYXMgc2h1ZmZsZS5TbG90SW5kZXhdKSk7XG5cbiAgY29uc3QgZ3JhcGg6IEJpdHNbXVtdID0gW107XG4gIGNvbnN0IHVubG9ja3NTZXQ6IEFycmF5PFNldDxzaHVmZmxlLlNsb3RJbmRleD4+ID0gW107XG5cbiAgZm9yIChjb25zdCBbc2xvdCwgcmVxXSBvZiByZXFzKSB7XG4gICAgLy8gTk9URTogbmVlZCBtYXAgZnJvbSBmdWxsIHRvIGNvbXByZXNzZWQuXG4gICAgY29uc3QgcyA9IHNsb3RJbmRleE1hcC5nZXQoc2xvdCk7XG4gICAgaWYgKHMgPT0gbnVsbCkge1xuICAgICAgaWYgKE1BWUJFX01JU1NJTkdfU0xPVFMuaGFzKHNsb3QpKSBjb250aW51ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYE5vdGhpbmcgZGVwZW5kZWQgb24gJCR7c2xvdC50b1N0cmluZygxNil9OiAke1xuICAgICAgICAgICAgICAgICAgICAgY29uZGl0aW9uTmFtZShzbG90LCByb20pfWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGZvciAoY29uc3QgY3Mgb2YgcmVxKSB7XG4gICAgICBjb25zdCBpcyA9IFsuLi5jc10ubWFwKGdldEl0ZW1JbmRleCk7XG4gICAgICAoZ3JhcGhbc10gfHwgKGdyYXBoW3NdID0gW10pKS5wdXNoKEJpdHMuZnJvbShpcykpO1xuICAgICAgZm9yIChjb25zdCBpIG9mIGlzKSB7XG4gICAgICAgICh1bmxvY2tzU2V0W2ldIHx8ICh1bmxvY2tzU2V0W2ldID0gbmV3IFNldCgpKSkuYWRkKHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBzYW5pdHkgY2hlY2sgdG8gbWFrZSBzdXJlIGFsbCBzbG90cyBhcmUgcHJvdmlkZWRcbiAgZm9yIChjb25zdCBuIG9mIFsuLi5jb25kaXRpb25Ob2RlcywgLi4uc2xvdE5vZGVzXSkge1xuICAgIC8vIGlmIChpLml0ZW0gIT0gbnVsbCkgY29udGludWU7XG4gICAgaWYgKCFncmFwaFtuLmluZGV4XSB8fCAhZ3JhcGhbbi5pbmRleF0ubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjID0gbi5jb25kaXRpb247XG4gICAgICBjb25zb2xlLmVycm9yKGBOb3RoaW5nIHByb3ZpZGVkICQke2MudG9TdHJpbmcoMTYpfTogJHtjb25kaXRpb25OYW1lKGMsIHJvbSlcbiAgICAgICAgICAgICAgICAgICAgIH0gKGluZGV4ICR7bi5pbmRleH0pYCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhncmFwaCk7XG5cbiAgY29uc3QgdW5sb2NrcyA9IHVubG9ja3NTZXQubWFwKHggPT4gWy4uLnhdKTtcbiAgcmV0dXJuIHtmaXhlZCwgc2xvdHMsIGl0ZW1zLCBncmFwaCwgdW5sb2Nrcywgcm9tfTtcbn1cblxuY29uc3QgTUFZQkVfTUlTU0lOR19TTE9UUyA9IG5ldyBTZXQoW1xuICAweDAyNSwgLy8gaGVhbGVkIGRvbHBoaW4sIG9ubHkgbWF0dGVycyBpZiAnUmQnIGlzIHNldC5cbiAgMHgwMjYsIC8vIGVudGVyZWQgc2h5cm9uLCBvbmx5IG1hdHRlcnMgaWYgJ0d0JyBub3Qgc2V0LlxuICAweDBhOSwgLy8gbGVhZiByYWJiaXQgbm90IHJlcXVpcmVkIGlmICdGcicgbm90IHNldC5cbiAgMHgyNDQsIC8vIHRlbGVwb3J0IG1heSBub3QgYmUgcmVxdWlyZWQgaWYgJ0ZwJyBub3Qgc2V0LlxuXSk7XG5cbmZ1bmN0aW9uIGNvbmRpdGlvbk5hbWUoZjogbnVtYmVyLCByb206IFJvbSk6IHN0cmluZyB7XG4gIGNvbnN0IGVudW1zID0ge0Jvc3MsIEV2ZW50LCBDYXBhYmlsaXR5LCBJdGVtLCBNYWdpY307XG4gIGZvciAoY29uc3QgZW51bU5hbWUgaW4gZW51bXMpIHtcbiAgICBjb25zdCBlID0gZW51bXNbZW51bU5hbWUgYXMga2V5b2YgdHlwZW9mIGVudW1zXSBhcyBhbnk7XG4gICAgZm9yIChjb25zdCBlbGVtIGluIGUpIHtcbiAgICAgIGlmIChlW2VsZW1dID09PSBmIHx8IEFycmF5LmlzQXJyYXkoZVtlbGVtXSkgJiYgZVtlbGVtXVswXVswXSA9PT0gZikge1xuICAgICAgICByZXR1cm4gZWxlbS5yZXBsYWNlKC8oW0EtWl0pKFtBLVpdKykvZywgKF8sIGYsIHMpID0+IGYgKyBzLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL18vZywgJyAnKTtcbiAgICAgICAgLy9yZXR1cm4gYCR7ZW51bU5hbWV9LiR7ZWxlbX1gO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IGwgb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGlmICghbC51c2VkKSBjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IGZsIG9mIGwuZmxhZ3MpIHtcbiAgICAgIGlmIChmbC5mbGFnID09PSBmKSB7XG4gICAgICAgIHJldHVybiBgTG9jYXRpb24gJHtsLmlkLnRvU3RyaW5nKDE2KX0gKCR7bC5uYW1lfSkgRmxhZyAke2ZsLnlzfSwke2ZsLnhzfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBmIDwgMCA/IGB+JHsofmYpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpfWAgOlxuICAgICAgZi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKTtcbn1cblxuLy8vLy8vLy8vLy8vL1xuXG5jb25zdCBERUJVRzogYm9vbGVhbiA9IGZhbHNlO1xuIl19