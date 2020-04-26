import { Grid, E, S } from './grid.js';
import { seq, hex } from '../rom/util.js';
import { Metalocation } from '../rom/metalocation.js';
import { MazeShuffle, OK } from '../maze/maze.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap } from '../util.js';
const [] = [hex];
export class CaveShuffleAttempt {
    constructor(h, w, size) {
        this.h = h;
        this.w = w;
        this.size = size;
        this.fixed = new Set();
        this.rivers = 0;
        this.wides = 0;
        this.count = 0;
        this.walls = 0;
        this.bridges = 0;
        this.grid = new Grid(h, w);
        this.grid.data.fill('');
    }
}
export class CaveShuffle extends MazeShuffle {
    constructor() {
        super(...arguments);
        this.maxPartitions = 1;
        this.minSpikes = 2;
        this.maxSpikes = 5;
        this.looseRefine = false;
        this.addBlocks = true;
    }
    survey(meta) {
        var _a, _b;
        const survey = {
            meta,
            id: meta.id,
            tileset: meta.tileset,
            size: 0,
            edges: [0, 0, 0, 0],
            stairs: [0, 0],
            features: {
                arena: 0,
                bridge: 0,
                over: 0,
                pit: 0,
                ramp: 0,
                river: 0,
                spike: 0,
                under: 0,
                wall: 0,
                wide: 0,
            },
        };
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            if (!scr.isEmpty() || ((_a = scr.data.exits) === null || _a === void 0 ? void 0 : _a.length))
                survey.size++;
            for (const exit of (_b = scr.data.exits) !== null && _b !== void 0 ? _b : []) {
                const { type } = exit;
                if (type === 'edge:top') {
                    if ((pos >>> 4) === 0)
                        survey.edges[0]++;
                    continue;
                }
                else if (type === 'edge:left') {
                    if ((pos & 0xf) === 0)
                        survey.edges[1]++;
                    continue;
                }
                else if (type === 'edge:bottom') {
                    if ((pos >>> 4) === meta.height - 1)
                        survey.edges[2]++;
                    continue;
                }
                else if (type === 'edge:right') {
                    if ((pos & 0xf) === meta.width - 1)
                        survey.edges[3]++;
                    continue;
                }
                else if (type === 'crypt') {
                    continue;
                }
                else if (type.startsWith('seamless')) {
                }
                else if (exit.dir & 1) {
                    throw new Error(`Bad exit direction: ${exit.dir}`);
                }
                else {
                    survey.stairs[exit.dir >>> 1]++;
                    continue;
                }
            }
            if (scr.hasFeature('arena'))
                survey.features.arena++;
            if (scr.hasFeature('bridge'))
                survey.features.bridge++;
            if (scr.hasFeature('overpass'))
                survey.features.over++;
            if (scr.hasFeature('pit'))
                survey.features.pit++;
            if (scr.hasFeature('ramp'))
                survey.features.ramp++;
            if (scr.hasFeature('spikes'))
                survey.features.spike++;
            if (scr.hasFeature('underpass'))
                survey.features.under++;
            if (scr.hasFeature('wall'))
                survey.features.wall++;
            if (scr.hasFeature('river'))
                survey.features.river++;
            if (scr.hasFeature('wide'))
                survey.features.wide++;
        }
        if (survey.size < 2 && (meta.width > 1 || meta.height > 1))
            survey.size = 2;
        return survey;
    }
    build(h = this.pickHeight(), w = this.pickWidth(), size = this.pickSize()) {
        var _a;
        this.init();
        let result;
        const a = new CaveShuffleAttempt(h, w, size);
        if ((result = this.initialFill(a)), !result.ok)
            return result;
        if ((result = this.addEdges(a)), !result.ok)
            return result;
        if ((result = this.addEarlyFeatures(a)), !result.ok)
            return result;
        if ((result = this.refine(a)), !result.ok)
            return result;
        if (!this.refineEdges(a))
            return { ok: false, fail: 'refineEdges' };
        this.removeSpurs(a);
        this.removeTightLoops(a);
        if ((result = this.addLateFeatures(a)), !result.ok)
            return result;
        if ((result = this.addStairs(a, ...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : []))),
            !result.ok)
            return result;
        if ((result = this.preinfer(a)), !result.ok)
            return result;
        const meta = this.inferScreens(a);
        if (!meta.ok)
            return meta;
        if ((result = this.refineMetascreens(a, meta.value)), !result.ok) {
            return result;
        }
        return meta;
    }
    init() { }
    initialFill(a) {
        this.fillCave(a, 'c');
        return OK;
    }
    fillCave(a, s) {
        for (let y = 0.5; y < a.h; y++) {
            for (let x = 0.5; x < a.w; x++) {
                if (y > 1)
                    a.grid.set2(y - 0.5, x, 'c');
                if (x > 1)
                    a.grid.set2(y, x - 0.5, 'c');
                a.grid.set2(y, x, 'c');
            }
        }
        a.count = a.h * a.w;
    }
    addEdges(a) {
        if (!this.params.edges)
            return OK;
        for (let dir = 0; dir < 4; dir++) {
            let count = this.params.edges[dir] || 0;
            if (!count)
                continue;
            const edges = seq(dir & 1 ? a.h : a.w, i => a.grid.border(dir, i));
            for (const edge of this.random.ishuffle(edges)) {
                if (a.grid.get(edge))
                    continue;
                if (dir & 1) {
                    if (dir === 1) {
                        if (this.addLeftEdge(a, edge))
                            count--;
                    }
                    else {
                        if (this.addRightEdge(a, edge))
                            count--;
                    }
                }
                else {
                    if (dir === 0) {
                        if (this.addUpEdge(a, edge))
                            count--;
                    }
                    else {
                        if (this.addDownEdge(a, edge))
                            count--;
                    }
                }
                if (!count)
                    break;
            }
            if (count) {
                return { ok: false, fail: `can't fit all edges shuffling ${this.loc}\nmissing ${count} ${dir}` };
            }
        }
        return OK;
    }
    addUpEdge({ grid, fixed }, edge) {
        const below = edge + 0x800;
        const left = below - 8;
        const left2 = left - 8;
        const left3 = left2 - 8;
        const right = below + 8;
        const right2 = right + 8;
        const right3 = right2 + 8;
        if (grid.isBorder(left)) {
            if (grid.get(left))
                return false;
        }
        else {
            if (grid.get(edge - 16))
                return false;
            if (grid.isBorder(left3) && grid.get(left3))
                return false;
        }
        if (grid.isBorder(right)) {
            if (grid.get(right))
                return false;
        }
        else {
            if (grid.get(edge + 16))
                return false;
            if (grid.isBorder(right3) && grid.get(right3))
                return false;
        }
        fixed.add(edge);
        grid.set(edge, 'n');
        grid.set(left, '');
        grid.set(right, '');
        return true;
    }
    addDownEdge({ grid, fixed }, edge) {
        const above = edge - 0x800;
        const left = above - 8;
        const right = above + 8;
        if (!grid.get(above))
            return false;
        if (grid.isBorder(left) && grid.get(left))
            return false;
        if (grid.isBorder(right) && grid.get(right))
            return false;
        fixed.add(edge);
        grid.set(edge, 'n');
        grid.set(left, '');
        grid.set(right, '');
        return true;
    }
    addLeftEdge({ grid, fixed }, edge) {
        const right = edge + 8;
        const rightUp = right - 0x800;
        const rightDown = right + 0x800;
        if (!grid.get(right))
            return false;
        if (grid.isBorder(rightUp) && grid.get(rightUp))
            return false;
        if (grid.isBorder(rightDown) && grid.get(rightDown))
            return false;
        fixed.add(edge);
        grid.set(edge, 'c');
        return true;
    }
    addRightEdge({ grid, fixed }, edge) {
        const left = edge - 8;
        const leftUp = left - 0x800;
        const leftDown = left + 0x800;
        if (!grid.get(left))
            return false;
        if (grid.isBorder(leftUp) && grid.get(leftUp))
            return false;
        if (grid.isBorder(leftDown) && grid.get(leftDown))
            return false;
        fixed.add(edge);
        grid.set(edge, 'c');
        return true;
    }
    addEarlyFeatures(a) {
        var _a, _b, _c, _d;
        if (!this.addSpikes(a, (_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.spike) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: 'add spikes' };
        }
        if (!this.addOverpasses(a, (_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.over) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'add overpasses' };
        }
        return OK;
    }
    addLateFeatures(a) {
        var _a, _b, _c, _d, _e, _f;
        if (!this.addArenas(a, (_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.arena) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: 'addArenas' };
        }
        if (!this.addUnderpasses(a, (_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.under) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'addUnderpasses' };
        }
        if (!this.addRamps(a, (_f = (_e = this.params.features) === null || _e === void 0 ? void 0 : _e.ramp) !== null && _f !== void 0 ? _f : 0)) {
            return { ok: false, fail: 'addRamps' };
        }
        return OK;
    }
    addArenas(a, arenas) {
        if (!arenas)
            return true;
        const g = a.grid;
        for (const c of this.random.ishuffle(a.grid.screens())) {
            const middle = (c | 0x808);
            if (!this.isEligibleArena(a, middle))
                continue;
            const tile = this.extract(a.grid, c);
            const arenaTile = tile.substring(0, 4) + 'a' + tile.substring(5);
            const options = this.orig.tileset.getMetascreensFromTileString(arenaTile);
            if (!options.length)
                continue;
            a.fixed.add(middle);
            g.set(middle, 'a');
            arenas--;
            if (!arenas)
                return true;
        }
        return false;
    }
    isEligibleArena(a, middle) {
        const g = a.grid;
        const left = (middle - 8);
        const left2 = (left - 8);
        const right = (middle + 8);
        const right2 = (right + 8);
        if (g.get(middle) !== 'c' && g.get(middle) !== 'w')
            return false;
        if (g.get(left) || g.get(right))
            return false;
        if (!g.isBorder(left) && g.get(left2))
            return false;
        if (!g.isBorder(right) && g.get(right2))
            return false;
        return true;
    }
    addUnderpasses(a, under) {
        return this.addStraightScreenLate(a, under, 0x800, 'b');
    }
    addOverpasses(a, over) {
        let attempts = 0;
        while (over) {
            const y = this.random.nextInt(a.h - 2) + 1;
            const x = this.random.nextInt(a.w - 2) + 1;
            const c = (y << 12 | x << 4 | 0x808);
            if (a.grid.get(c) !== 'c') {
                if (++attempts > 10)
                    throw new Error('Bad attempts');
                continue;
            }
            a.grid.set(c, 'b');
            a.fixed.add(c);
            a.grid.set(c - 8, '');
            a.grid.set(c + 8, '');
            over--;
        }
        return true;
    }
    addRamps(a, ramps) {
        return this.addStraightScreenLate(a, ramps, 8, '/');
    }
    addStraightScreenLate(a, count, delta, char) {
        if (!count)
            return true;
        for (const c of this.random.ishuffle(a.grid.screens())) {
            const middle = (c | 0x808);
            const side1 = (middle - delta);
            const side2 = (middle + delta);
            if (a.grid.get(middle) !== 'c')
                continue;
            if (a.grid.get(side1) || a.grid.get(side2))
                continue;
            const tile = this.extract(a.grid, c);
            const newTile = tile.substring(0, 4) + char + tile.substring(5);
            const options = this.orig.tileset.getMetascreensFromTileString(newTile);
            if (!options.length)
                continue;
            a.fixed.add(middle);
            a.grid.set(middle, char);
            count--;
            if (!count)
                return true;
        }
        return false;
    }
    addSpikes(a, spikes) {
        if (!spikes)
            return true;
        let attempts = 0;
        while (spikes > 0) {
            if (++attempts > 20)
                return false;
            let len = Math.min(spikes, Math.floor(a.h * 0.6), this.maxSpikes);
            while (len < spikes - 1 && len > this.minSpikes) {
                if (this.random.next() < 0.2)
                    len--;
            }
            const x = (len > 2 && a.w > 3) ? this.random.nextInt(a.w - 2) + 1 :
                this.random.nextInt(a.w);
            if (len > spikes - this.minSpikes) {
                if (len >= a.h - 2) {
                    len = a.h - 2;
                }
                else {
                    len = spikes;
                }
            }
            const y0 = this.random.nextInt(a.h - len - 2) + 1;
            const t0 = y0 << 12 | x << 4 | 0x808;
            const t1 = t0 + ((len - 1) << 12);
            for (let t = t0 - 0x1000; len && t <= t1 + 0x1000; t += 0x800) {
                if (a.grid.get(t) !== 'c')
                    len = 0;
            }
            if (!len)
                continue;
            const cleared = [t0 - 8, t0 + 8, t1 - 8, t1 + 8];
            const orphaned = this.tryClear(a, cleared);
            if (!orphaned.length)
                continue;
            for (const c of orphaned) {
                a.grid.set(c, '');
            }
            a.fixed.add((t0 - 0x800));
            a.fixed.add((t0 - 0x1000));
            a.fixed.add((t1 + 0x800));
            a.fixed.add((t1 + 0x1000));
            for (let t = t0; t <= t1; t += 0x800) {
                a.fixed.add(t);
                a.grid.set(t, 's');
            }
            spikes -= len;
            attempts = 0;
        }
        return spikes === 0;
    }
    canRemove(c) {
        return c === 'c';
    }
    tryClear(a, coords) {
        const replace = new Map();
        for (const c of coords) {
            if (a.fixed.has(c))
                return [];
            replace.set(c, '');
        }
        const parts = a.grid.partition(replace);
        const [first] = parts.values();
        if (first.size === parts.size) {
            return [...coords];
        }
        const connected = new Set();
        const allParts = new Set(parts.values());
        for (const fixed of a.fixed) {
            connected.add(parts.get(fixed));
        }
        if (connected.size > this.maxPartitions)
            return [];
        const orphaned = [...coords];
        for (const part of allParts) {
            if (connected.has(part))
                continue;
            orphaned.push(...part);
        }
        return orphaned;
    }
    refine(a) {
        let filled = new Set();
        for (let i = 0; i < a.grid.data.length; i++) {
            if (a.grid.data[i])
                filled.add(a.grid.coord(i));
        }
        let attempts = 0;
        while (a.count > a.size) {
            if (attempts++ > 50)
                throw new Error(`refine failed: attempts`);
            let removed = 0;
            for (const coord of this.random.ishuffle([...filled])) {
                if (a.grid.isBorder(coord) ||
                    !this.canRemove(a.grid.get(coord)) ||
                    a.fixed.has(coord)) {
                    continue;
                }
                if (removed > 3)
                    break;
                const parts = a.grid.partition(this.removalMap(a, coord));
                const [first] = parts.values();
                if (first.size === parts.size && parts.size > 1) {
                    removed++;
                    filled.delete(coord);
                    if ((coord & 0x808) === 0x808)
                        a.count--;
                    a.grid.set(coord, '');
                }
                else {
                    let part;
                    for (const set of parts.values()) {
                        if (!part || set.size > part.size)
                            part = set;
                    }
                    if (![...a.fixed].every(c => part.has(c)))
                        continue;
                    const count = [...part].filter(c => (c & 0x808) == 0x808).length;
                    if (count < a.size)
                        continue;
                    removed++;
                    filled = part;
                    a.count = count;
                    a.grid.set(coord, '');
                    for (const [k, v] of parts) {
                        if (v !== part)
                            a.grid.set(k, '');
                    }
                }
            }
            if (!removed) {
                if (this.looseRefine)
                    return OK;
                return { ok: false, fail: `refine ${a.count} > ${a.size}` };
            }
        }
        return OK;
    }
    removalMap(a, coord) {
        return new Map([[coord, '']]);
    }
    refineEdges(a) {
        let edges = [];
        for (let i = 0; i < a.grid.data.length; i++) {
            if (!a.grid.data[i])
                continue;
            const coord = a.grid.coord(i);
            if (a.grid.isBorder(coord) || a.fixed.has(coord))
                continue;
            if ((coord ^ (coord >> 8)) & 8)
                edges.push(coord);
        }
        this.random.shuffle(edges);
        const orig = a.grid.partition(new Map());
        let size = orig.size;
        const partCount = new Set(orig.values()).size;
        for (const e of edges) {
            const parts = a.grid.partition(new Map([[e, '']]));
            const [first] = parts.values();
            const ok = first.size === parts.size ?
                parts.size === size - 1 :
                new Set(parts.values()).size === partCount && parts.size === size - 1;
            if (ok) {
                size--;
                a.grid.set(e, '');
            }
        }
        return true;
    }
    removeSpurs(a) {
        for (let y = 0; y < a.h; y++) {
            for (let x = 0; x < a.w; x++) {
                const c = (y << 12 | 0x808 | x << 4);
                if (a.grid.get(c))
                    continue;
                const up = (c - 0x800);
                const down = (c + 0x800);
                const left = (c - 0x8);
                const right = (c + 0x8);
                if ((a.grid.get(up) || a.grid.get(down)) &&
                    (a.grid.get(left) || a.grid.get(right))) {
                    if (this.random.nextInt(2)) {
                        a.grid.set(up, '');
                        a.grid.set(down, '');
                    }
                    else {
                        a.grid.set(left, '');
                        a.grid.set(right, '');
                    }
                }
            }
        }
    }
    removeTightLoops(a) {
        for (let y = 0; y < a.h - 1; y++) {
            const row = y << 12 | 0x800;
            for (let x = 0; x < a.w - 1; x++) {
                const coord = (row | (x << 4) | 8);
                if (this.isTightLoop(a, coord))
                    this.breakTightLoop(a, coord);
            }
        }
    }
    isTightLoop({ grid }, coord) {
        for (let dy = 0; dy < 0x1800; dy += 0x800) {
            for (let dx = 0; dx < 0x18; dx += 8) {
                const delta = dy | dx;
                if (delta === 0x808)
                    continue;
                if (grid.get((coord + delta)) !== 'c')
                    return false;
            }
        }
        return true;
    }
    breakTightLoop(a, coord) {
        const r = this.random.nextInt(0x10000);
        const delta = r & 1 ? (r & 0x1000) | 8 : (r & 0x10) | 0x800;
        a.grid.set((coord + delta), '');
    }
    addStairs(a, up = 0, down = 0) {
        const stairs = [up, down];
        if (!stairs[0] && !stairs[1])
            return OK;
        for (const c of this.random.ishuffle(a.grid.screens())) {
            if (!this.tryAddStair(a, c, stairs))
                continue;
            if (!stairs[0] && !stairs[1])
                return OK;
        }
        return { ok: false, fail: `stairs` };
    }
    addEarlyStair(a, c, stair) {
        const mods = [];
        const left = c - 8;
        const right = c + 8;
        const up = c - 0x800;
        const down = c + 0x800;
        let neighbors = [c - 8, c + 8];
        if (stair === '<') {
            neighbors.push(down);
            mods.push([up, '']);
            if (a.grid.get(left) === 'c' && a.grid.get(right) === 'c' &&
                this.random.nextInt(3)) {
                mods.push([down, ''], [c, '<']);
                return mods;
            }
        }
        else if (stair === '>') {
            neighbors.push(up);
            mods.push([down, '']);
        }
        neighbors = neighbors.filter(c => a.grid.get(c) === 'c');
        if (!neighbors.length)
            return [];
        const keep = this.random.nextInt(neighbors.length);
        for (let j = 0; j < neighbors.length; j++) {
            if (j !== keep)
                mods.push([neighbors[j], '']);
        }
        mods.push([c, stair]);
        return mods;
    }
    tryAddStair(a, c, stairs) {
        if (a.fixed.has((c | 0x808)))
            return false;
        const tile = this.extract(a.grid, c);
        const both = stairs[0] && stairs[1];
        const total = stairs[0] + stairs[1];
        const up = this.random.nextInt(total) < stairs[0];
        const candidates = [up ? 0 : 1];
        if (both)
            candidates.push(up ? 1 : 0);
        for (const stair of candidates) {
            const stairChar = '<>'[stair];
            const stairTile = tile.substring(0, 4) + stairChar + tile.substring(5);
            if (this.orig.tileset.getMetascreensFromTileString(stairTile).length) {
                a.grid.set((c | 0x808), stairChar);
                stairs[stair]--;
                return true;
            }
        }
        return false;
    }
    tryConnect(a, start, end, char, attempts = 1) {
        var _a;
        while (attempts-- > 0) {
            const replace = new Map();
            let pos = start;
            if ((start & end & 0x808) !== 0x808) {
                throw new Error(`bad start ${hex(start)} or end ${hex(end)}`);
            }
            replace.set(pos, char);
            while (pos !== end) {
                const dirs = [];
                for (const dir of [8, -8, 0x800, -0x800]) {
                    const pos1 = pos + dir;
                    const pos2 = pos + 2 * dir;
                    if (a.fixed.has(pos2))
                        continue;
                    if ((_a = replace.get(pos2)) !== null && _a !== void 0 ? _a : a.grid.get(pos2))
                        continue;
                    if (a.grid.isBorder(pos1))
                        continue;
                    dirs.push(dir);
                }
                if (!dirs.length)
                    break;
                const dy = (end >> 12) - (pos >> 12);
                const dx = (end & 0xf0) - (pos & 0xf0);
                const preferred = new Set(dirs);
                if (dy < 0)
                    preferred.delete(0x800);
                if (dy > 0)
                    preferred.delete(-0x800);
                if (dx < 0)
                    preferred.delete(8);
                if (dx > 0)
                    preferred.delete(-8);
                dirs.push(...preferred, ...preferred);
                const dir = this.random.pick(dirs);
                replace.set(pos + dir, char);
                replace.set(pos = pos + 2 * dir, char);
            }
            if (pos !== end)
                continue;
            for (const [c, v] of replace) {
                a.grid.set(c, v);
                if ((c & 0x808) === 0x808)
                    a.count++;
            }
            return true;
        }
        return false;
    }
    tryAddLoop(a, char, attempts = 1) {
        const uf = new UnionFind();
        for (let i = 0; i < a.grid.data.length; i++) {
            const c = a.grid.coord(i);
            if (a.grid.get(c) || a.grid.isBorder(c))
                continue;
            if (!a.grid.get(E(c)))
                uf.union([c, E(c)]);
            if (!a.grid.get(S(c)))
                uf.union([c, S(c)]);
        }
        const eligible = new DefaultMap(() => []);
        for (const s of a.grid.screens()) {
            const c = s + 0x808;
            if (!a.grid.get(c))
                continue;
            for (const d of [8, -8, 0x800, -0x800]) {
                const e1 = c + d;
                if (a.grid.isBorder(e1) || a.grid.get(e1))
                    continue;
                const e2 = c + 2 * d;
                if (a.grid.get(e2))
                    continue;
                const replace = new Map([[e1, char]]);
                const tile = this.extract(a.grid, s, { replace });
                if (this.orig.tileset.getMetascreensFromTileString(tile).length) {
                    eligible.get(uf.find(e2)).push([e1, e2]);
                }
            }
        }
        const weightedMap = new Map();
        for (const partition of eligible.values()) {
            if (partition.length < 2)
                continue;
            for (const [e1] of partition) {
                weightedMap.set(e1, partition);
            }
        }
        const weighted = [...weightedMap.values()];
        if (!weighted.length)
            return false;
        while (attempts-- > 0) {
            const partition = this.random.pick(weighted);
            const [[e0, c0], [e1, c1]] = this.random.ishuffle(partition);
            a.grid.set(e0, char);
            a.grid.set(e1, char);
            if (this.tryConnect(a, c0, c1, char, 5)) {
                return true;
            }
            a.grid.set(e0, '');
            a.grid.set(e1, '');
        }
        return false;
    }
    preinfer(a) {
        var _a;
        let result;
        if ((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.spike) {
            if ((result = this.preinferSpikes(a)), !result.ok)
                return result;
        }
        return OK;
    }
    preinferSpikes(a) {
        return OK;
    }
    inferScreens(a) {
        const screens = [];
        for (const s of a.grid.screens()) {
            const tile = this.extract(a.grid, s);
            const candidates = this.orig.tileset.getMetascreensFromTileString(tile)
                .filter(s => !s.data.mod);
            if (!candidates.length) {
                return { ok: false, fail: `infer screen ${hex(s)}: [${tile}]` };
            }
            const pick = this.random.pick(candidates);
            screens.push(pick);
            if (pick.hasFeature('wall'))
                a.walls++;
            if (pick.hasFeature('bridge'))
                a.bridges++;
        }
        const meta = new Metalocation(this.params.id, this.orig.tileset, a.h, a.w);
        for (let y = 0; y < a.h; y++) {
            for (let x = 0; x < a.w; x++) {
                meta.set(y << 4 | x, screens[y * a.w + x]);
            }
        }
        return { ok: true, value: meta };
    }
    refineMetascreens(a, meta) {
        var _a, _b;
        const bridges = ((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.bridge) || 0;
        const walls = ((_b = this.params.features) === null || _b === void 0 ? void 0 : _b.wall) || 0;
        for (const pos of this.random.ishuffle(meta.allPos())) {
            const c = ((pos << 8 | pos << 4) & 0xf0f0);
            const tile = this.extract(a.grid, c);
            const scr = meta.get(pos);
            if (this.addBlocks &&
                this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'block'))) {
                if (scr.hasFeature('bridge'))
                    a.bridges--;
                continue;
            }
            if (a.bridges > bridges && scr.hasFeature('bridge')) {
                if (this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'bridge'))) {
                    a.bridges--;
                    continue;
                }
            }
            if (a.walls < walls && !scr.hasFeature('wall')) {
                if (this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'wall'))) {
                    a.walls++;
                    continue;
                }
            }
        }
        if (a.bridges !== bridges) {
            return { ok: false,
                fail: `refineMeta bridges want ${bridges} got ${a.bridges}` };
        }
        if (a.walls !== walls) {
            return { ok: false,
                fail: `refineMeta walls want ${walls} got ${a.walls}` };
        }
        return OK;
    }
    tryMeta(meta, pos, screens) {
        for (const s of screens) {
            if (!this.checkMeta(meta, new Map([[pos, s]])))
                continue;
            meta.set(pos, s);
            return true;
        }
        return false;
    }
    checkMeta(meta, replacements) {
        const opts = replacements ? { with: replacements } : {};
        const parts = meta.traverse(opts);
        return new Set(parts.values()).size === this.maxPartitions;
    }
}
export class WideCaveShuffle extends CaveShuffle {
    addLateFeatures(a) {
        let result = super.addLateFeatures(a);
        if (!result.ok)
            return result;
        a.grid.data = a.grid.data.map(c => c === 'c' ? 'w' : c);
        return OK;
    }
}
export class CryptEntranceShuffle extends CaveShuffle {
    refineMetascreens(a, meta) {
        for (let y = 0; y < a.h; y++) {
            for (let x = 0; x < a.w; x++) {
                if (a.grid.get((y << 12 | x << 4 | 0x808)) === 'a') {
                    meta.set(y << 4 | x, meta.rom.metascreens.cryptArena_statues);
                }
            }
        }
        return super.refineMetascreens(a, meta);
    }
    isEligibleArena(a, c) {
        return !a.grid.get(c - 0x800) && super.isEligibleArena(a, c);
    }
}
export class KarmineBasementShuffle extends CaveShuffle {
    constructor() {
        super(...arguments);
        this.looseRefine = true;
    }
    pickWidth() { return 8; }
    pickHeight() { return 5; }
    initialFill(a) {
        if (a.grid.height !== 5 || a.grid.width !== 8)
            throw new Error('bad size');
        for (let i = 0; i < a.grid.data.length; i++) {
            const c = KarmineBasementShuffle.PATTERN[i];
            a.grid.data[i] = c !== ' ' ? c : '';
        }
        return OK;
    }
    addSpikes(a) {
        const dropped = this.random.nextInt(4);
        for (let y = 1; y < 10; y++) {
            for (let x = 0; x < 4; x++) {
                const i = 2 * x + 5 + y * 17;
                if (x === dropped) {
                    a.grid.data[i] = 'c';
                }
                else {
                    const c = a.grid.coord(i);
                    a.fixed.add(c);
                    if (y === 5) {
                        a.fixed.add(c + 8);
                        a.fixed.add(c + 16);
                        a.fixed.add(c - 8);
                        a.fixed.add(c - 16);
                    }
                }
            }
        }
        let stairs = 0;
        for (const c of this.random.ishuffle(a.grid.screens())) {
            if (stairs === 3)
                break;
            const mid = (c | 0x808);
            const up = (mid - 0x800);
            const down = (mid + 0x800);
            if (a.grid.get(mid) === 'c' &&
                a.grid.get(up) !== 's' &&
                a.grid.get(down) !== 's') {
                a.grid.set(mid, '<');
                a.fixed.add(mid);
                a.grid.set(up, '');
                a.grid.set(down, '');
                stairs++;
            }
        }
        return true;
    }
    addStairs() { return OK; }
}
KarmineBasementShuffle.PATTERN = [
    '                 ',
    '   ccccccccccc   ',
    '   c c c c c c   ',
    ' ccc s s s s ccc ',
    ' c c s s s s c c ',
    ' ccccscscscscccc ',
    ' c c s s s s c c ',
    ' ccc s s s s ccc ',
    '   c c c c c c   ',
    '   ccccccccccc   ',
    '                 ',
].join('');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxZQUFZLEVBQU8sTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUEyQixFQUFFLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV4QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSWpCLE1BQU0sT0FBTyxrQkFBa0I7SUFXN0IsWUFBcUIsQ0FBUyxFQUFXLENBQVMsRUFDN0IsSUFBWTtRQURaLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBVyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQVE7UUFWeEIsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFHdEMsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixVQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFlBQU8sR0FBRyxDQUFDLENBQUM7UUFJVixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNGO0FBRUQsTUFBTSxP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Q3hELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLElBQUksSUFBSTtZQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssTUFBTSxLQUFLLElBQUksVUFBVSxFQUFFO1lBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRTtnQkFDcEUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2hELE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoQixPQUFPLElBQUksQ0FBQzthQUNi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QW1CO0lBQ25CLG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsbUJBQW1CO0NBQ3BCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgR3JpZCwgR3JpZENvb3JkLCBHcmlkSW5kZXgsIEUsIFMgfSBmcm9tICcuL2dyaWQuanMnO1xuaW1wb3J0IHsgc2VxLCBoZXggfSBmcm9tICcuLi9yb20vdXRpbC5qcyc7XG5pbXBvcnQgeyBNZXRhc2NyZWVuIH0gZnJvbSAnLi4vcm9tL21ldGFzY3JlZW4uanMnO1xuaW1wb3J0IHsgTWV0YWxvY2F0aW9uLCBQb3MgfSBmcm9tICcuLi9yb20vbWV0YWxvY2F0aW9uLmpzJztcbmltcG9ydCB7IE1hemVTaHVmZmxlLCBBdHRlbXB0LCBTdXJ2ZXksIFJlc3VsdCwgT0sgfSBmcm9tICcuLi9tYXplL21hemUuanMnO1xuaW1wb3J0IHsgVW5pb25GaW5kIH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAgfSBmcm9tICcuLi91dGlsLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxudHlwZSBBID0gQ2F2ZVNodWZmbGVBdHRlbXB0O1xuXG5leHBvcnQgY2xhc3MgQ2F2ZVNodWZmbGVBdHRlbXB0IGltcGxlbWVudHMgQXR0ZW1wdCB7XG4gIHJlYWRvbmx5IGdyaWQ6IEdyaWQ8c3RyaW5nPjtcbiAgcmVhZG9ubHkgZml4ZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcblxuICAvLyBDdXJyZW50IHNpemUgYW5kIG51bWJlciBvZiB3YWxscy9icmlkZ2VzLlxuICByaXZlcnMgPSAwO1xuICB3aWRlcyA9IDA7XG4gIGNvdW50ID0gMDtcbiAgd2FsbHMgPSAwO1xuICBicmlkZ2VzID0gMDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBoOiBudW1iZXIsIHJlYWRvbmx5IHc6IG51bWJlcixcbiAgICAgICAgICAgICAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyKSB7XG4gICAgdGhpcy5ncmlkID0gbmV3IEdyaWQoaCwgdyk7XG4gICAgdGhpcy5ncmlkLmRhdGEuZmlsbCgnJyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENhdmVTaHVmZmxlIGV4dGVuZHMgTWF6ZVNodWZmbGUge1xuXG4gIG1heFBhcnRpdGlvbnMgPSAxO1xuICBtaW5TcGlrZXMgPSAyO1xuICBtYXhTcGlrZXMgPSA1O1xuICBsb29zZVJlZmluZSA9IGZhbHNlO1xuICBhZGRCbG9ja3MgPSB0cnVlO1xuXG4gIC8vIHNodWZmbGUobG9jOiBMb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgLy8gICBjb25zdCBtZXRhID0gbG9jLm1ldGE7XG4gIC8vICAgY29uc3Qgc3VydmV5ID0gdGhpcy5zdXJ2ZXkobWV0YSk7XG4gIC8vICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCAxMDA7IGF0dGVtcHQrKykge1xuICAvLyAgICAgY29uc3Qgd2lkdGggPVxuICAvLyAgICAgICAgIE1hdGgubWF4KDEsIE1hdGgubWluKDgsIGxvYy5tZXRhLndpZHRoICtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKChyYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMykpKTtcbiAgLy8gICAgIGNvbnN0IGhlaWdodCA9XG4gIC8vICAgICAgICAgTWF0aC5tYXgoMSwgTWF0aC5taW4oMTYsIGxvYy5tZXRhLmhlaWdodCArXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigocmFuZG9tLm5leHRJbnQoNikgLSAxKSAvIDMpKSk7XG4gIC8vICAgICBjb25zdCBzaHVmZmxlID0gbmV3IENhdmVTaHVmZmxlQXR0ZW1wdChoZWlnaHQsIHdpZHRoLCBzdXJ2ZXksIHJhbmRvbSk7XG4gIC8vICAgICBjb25zdCByZXN1bHQgPSBzaHVmZmxlLmJ1aWxkKCk7XG4gIC8vICAgICBpZiAocmVzdWx0KSB7XG4gIC8vICAgICAgIGlmIChsb2MuaWQgPT09IDB4MzEpIGNvbnNvbGUuZXJyb3IoYFNodWZmbGUgZmFpbGVkOiAke3Jlc3VsdH1gKTtcbiAgLy8gICAgIH0gZWxzZSB7XG4gIC8vICAgICAgIHRoaXMuZmluaXNoKGxvYywgc2h1ZmZsZS5tZXRhLCByYW5kb20pO1xuICAvLyAgICAgICByZXR1cm47XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHRocm93IG5ldyBFcnJvcihgQ29tcGxldGVseSBmYWlsZWQgdG8gbWFwIHNodWZmbGUgJHtsb2N9YCk7XG4gIC8vIH1cblxuICBzdXJ2ZXkobWV0YTogTWV0YWxvY2F0aW9uKTogU3VydmV5IHtcbiAgICAvLyB0YWtlIGEgc3VydmV5LlxuICAgIGNvbnN0IHN1cnZleSA9IHtcbiAgICAgIG1ldGEsXG4gICAgICBpZDogbWV0YS5pZCxcbiAgICAgIHRpbGVzZXQ6IG1ldGEudGlsZXNldCxcbiAgICAgIHNpemU6IDAsXG4gICAgICBlZGdlczogWzAsIDAsIDAsIDBdLFxuICAgICAgc3RhaXJzOiBbMCwgMF0sXG4gICAgICBmZWF0dXJlczoge1xuICAgICAgICBhcmVuYTogMCxcbiAgICAgICAgYnJpZGdlOiAwLFxuICAgICAgICBvdmVyOiAwLFxuICAgICAgICBwaXQ6IDAsXG4gICAgICAgIHJhbXA6IDAsXG4gICAgICAgIHJpdmVyOiAwLFxuICAgICAgICBzcGlrZTogMCxcbiAgICAgICAgdW5kZXI6IDAsXG4gICAgICAgIHdhbGw6IDAsXG4gICAgICAgIHdpZGU6IDAsXG4gICAgICB9LFxuICAgIH07XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGlmICghc2NyLmlzRW1wdHkoKSB8fCBzY3IuZGF0YS5leGl0cz8ubGVuZ3RoKSBzdXJ2ZXkuc2l6ZSsrO1xuICAgICAgZm9yIChjb25zdCBleGl0IG9mIHNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgIGNvbnN0IHt0eXBlfSA9IGV4aXQ7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnKSB7XG4gICAgICAgICAgaWYgKChwb3MgPj4+IDQpID09PSAwKSBzdXJ2ZXkuZWRnZXNbMF0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0Jykge1xuICAgICAgICAgIGlmICgocG9zICYgMHhmKSA9PT0gMCkgc3VydmV5LmVkZ2VzWzFdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJykge1xuICAgICAgICAgIGlmICgocG9zID4+PiA0KSA9PT0gbWV0YS5oZWlnaHQgLSAxKSBzdXJ2ZXkuZWRnZXNbMl0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpyaWdodCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyAmIDB4ZikgPT09IG1ldGEud2lkdGggLSAxKSBzdXJ2ZXkuZWRnZXNbM10rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnY3J5cHQnKSB7XG4gICAgICAgICAgLy8gc3RhaXIgaXMgYnVpbHQgaW50byBhcmVuYVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICAgIC8vIGRvIG5vdGhpbmcuLi5cbiAgICAgICAgfSBlbHNlIGlmIChleGl0LmRpciAmIDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBleGl0IGRpcmVjdGlvbjogJHtleGl0LmRpcn1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdXJ2ZXkuc3RhaXJzW2V4aXQuZGlyID4+PiAxXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2FyZW5hJykpIHN1cnZleS5mZWF0dXJlcy5hcmVuYSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgc3VydmV5LmZlYXR1cmVzLmJyaWRnZSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdvdmVycGFzcycpKSBzdXJ2ZXkuZmVhdHVyZXMub3ZlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdwaXQnKSkgc3VydmV5LmZlYXR1cmVzLnBpdCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyYW1wJykpIHN1cnZleS5mZWF0dXJlcy5yYW1wKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSBzdXJ2ZXkuZmVhdHVyZXMuc3Bpa2UrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgndW5kZXJwYXNzJykpIHN1cnZleS5mZWF0dXJlcy51bmRlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHN1cnZleS5mZWF0dXJlcy53YWxsKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykpIHN1cnZleS5mZWF0dXJlcy5yaXZlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3aWRlJykpIHN1cnZleS5mZWF0dXJlcy53aWRlKys7XG4gICAgfVxuICAgIGlmIChzdXJ2ZXkuc2l6ZSA8IDIgJiYgKG1ldGEud2lkdGggPiAxIHx8IG1ldGEuaGVpZ2h0ID4gMSkpIHN1cnZleS5zaXplID0gMjtcbiAgICByZXR1cm4gc3VydmV5O1xuICB9XG5cbiAgYnVpbGQoaCA9IHRoaXMucGlja0hlaWdodCgpLCB3ID0gdGhpcy5waWNrV2lkdGgoKSxcbiAgICAgICAgc2l6ZSA9IHRoaXMucGlja1NpemUoKSk6IFJlc3VsdDxNZXRhbG9jYXRpb24+IHtcbiAgICB0aGlzLmluaXQoKTtcbiAgICBsZXQgcmVzdWx0OiBSZXN1bHQ8dm9pZD47XG4gICAgLy9jb25zdCByID0gdGhpcy5yYW5kb207XG4gICAgY29uc3QgYSA9IG5ldyBDYXZlU2h1ZmZsZUF0dGVtcHQoaCwgdywgc2l6ZSk7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmluaXRpYWxGaWxsKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2lmICghdGhpcy5hZGRFYXJseUZlYXR1cmVzKCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWRnZXMoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRFYXJseUZlYXR1cmVzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2NvbnNvbGUubG9nKGByZWZpbmU6XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5yZWZpbmUoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vY29uc29sZS5sb2coYHBvc3RyZWZpbmU6XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5yZWZpbmVFZGdlcyhhKSkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdyZWZpbmVFZGdlcyd9O1xuICAgIHRoaXMucmVtb3ZlU3B1cnMoYSk7XG4gICAgdGhpcy5yZW1vdmVUaWdodExvb3BzKGEpO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRMYXRlRmVhdHVyZXMoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRTdGFpcnMoYSwgLi4uKHRoaXMucGFyYW1zLnN0YWlycyA/PyBbXSkpKSxcbiAgICAgICAgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcblxuICAgIC8vIHRyeSB0byB0cmFuc2xhdGUgdG8gbWV0YXNjcmVlbnMgYXQgdGhpcyBwb2ludC4uLlxuICAgIGlmICgocmVzdWx0ID0gdGhpcy5wcmVpbmZlcihhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuaW5mZXJTY3JlZW5zKGEpO1xuICAgIGlmICghbWV0YS5vaykgcmV0dXJuIG1ldGE7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnJlZmluZU1ldGFzY3JlZW5zKGEsIG1ldGEudmFsdWUpKSwgIXJlc3VsdC5vaykge1xuICAgICAgLy9jb25zb2xlLmVycm9yKG1ldGEudmFsdWUuc2hvdygpKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEF0dGVtcHQgbWV0aG9kc1xuXG4gIGluaXQoKSB7fVxuXG4gIC8vIEluaXRpYWwgZmlsbC5cbiAgaW5pdGlhbEZpbGwoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgdGhpcy5maWxsQ2F2ZShhLCAnYycpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxDYXZlKGE6IEEsIHM6IHN0cmluZykge1xuICAgIC8vIFRPRE8gLSBtb3ZlIHRvIE1hemVTaHVmZmxlLmZpbGw/XG4gICAgZm9yIChsZXQgeSA9IDAuNTsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMC41OyB4IDwgYS53OyB4KyspIHtcbiAgICAgICAgaWYgKHkgPiAxKSBhLmdyaWQuc2V0Mih5IC0gMC41LCB4LCAnYycpO1xuICAgICAgICBpZiAoeCA+IDEpIGEuZ3JpZC5zZXQyKHksIHggLSAwLjUsICdjJyk7XG4gICAgICAgIGEuZ3JpZC5zZXQyKHksIHgsICdjJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGEuY291bnQgPSBhLmggKiBhLnc7XG4gIH1cblxuICAvLyBBZGQgZWRnZSBhbmQvb3Igc3RhaXIgZXhpdHNcbiAgYWRkRWRnZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy9sZXQgYXR0ZW1wdHMgPSAwO1xuICAgIGlmICghdGhpcy5wYXJhbXMuZWRnZXMpIHJldHVybiBPSztcbiAgICBmb3IgKGxldCBkaXIgPSAwOyBkaXIgPCA0OyBkaXIrKykge1xuICAgICAgbGV0IGNvdW50ID0gdGhpcy5wYXJhbXMuZWRnZXNbZGlyXSB8fCAwO1xuICAgICAgaWYgKCFjb3VudCkgY29udGludWU7XG4gICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgICAgc2VxKGRpciAmIDEgPyBhLmggOiBhLncsIGkgPT4gYS5ncmlkLmJvcmRlcihkaXIsIGkpKTtcbiAgICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShlZGdlcykpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgZWRnZTogJHtlZGdlLnRvU3RyaW5nKDE2KX0gY291bnQgJHtjb3VudH0gZGlyICR7ZGlyfWApO1xuICAgICAgICBpZiAoYS5ncmlkLmdldChlZGdlKSkgY29udGludWU7XG4gICAgICAgIGlmIChkaXIgJiAxKSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkTGVmdEVkZ2UoYSwgZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZFJpZ2h0RWRnZShhLCBlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkVXBFZGdlKGEsIGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGREb3duRWRnZShhLCBlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb3VudCkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoY291bnQpIHtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBjYW4ndCBmaXQgYWxsIGVkZ2VzIHNodWZmbGluZyAke3RoaXMubG9jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XFxubWlzc2luZyAke2NvdW50fSAke2Rpcn1gfTtcbiAgICAgICAgLy9cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZFVwRWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBVcCBlZGdlcyBtdXN0IGFsd2F5cyBiZSBhcmVuYSBzY3JlZW5zLCBzbyBjdXQgb2ZmIGJvdGhcbiAgICAvLyB0aGUgRS1XIGVkZ2VzIEFORCB0aGUgbmVpZ2hib3Jpbmcgc2NyZWVucyBhcyB3ZWxsIChwcm92aWRlZFxuICAgIC8vIHRoZXJlIGlzIG5vdCBhbHNvIGFuIGV4aXQgbmV4dCB0byB0aGVtLCBzaW5jZSB0aGF0IHdvdWxkIGJlXG4gICAgLy8gYSBwcm9ibGVtLiAgKFRoZXNlIGFyZSBwcmV0dHkgbGltaXRlZDogdmFtcGlyZSAxLCBwcmlzb24sXG4gICAgLy8gc3R4eSAxLCBweXJhbWlkIDEsIGNyeXB0IDIsIGRyYXlnb24gMikuXG4gICAgY29uc3QgYmVsb3cgPSBlZGdlICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQgPSBiZWxvdyAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQyID0gbGVmdCAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQzID0gbGVmdDIgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGJlbG93ICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQyID0gcmlnaHQgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDMgPSByaWdodDIgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0KSkge1xuICAgICAgaWYgKGdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChncmlkLmdldChlZGdlIC0gMTYgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdDMpICYmIGdyaWQuZ2V0KGxlZnQzKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodCkpIHtcbiAgICAgIGlmIChncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGdyaWQuZ2V0KGVkZ2UgKyAxNiBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodDMpICYmIGdyaWQuZ2V0KHJpZ2h0MykpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICduJyk7XG4gICAgZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIGdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGREb3duRWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBkb3duIGVkZ2VzIG11c3QgaGF2ZSBzdHJhaWdodCBOLVMgc2NyZWVucywgc28gY3V0IG9mZlxuICAgIC8vIHRoZSBFLVcgZWRnZXMgbmV4dCB0byB0aGVtLlxuICAgIGNvbnN0IGFib3ZlID0gZWRnZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYWJvdmUgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGFib3ZlICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKCFncmlkLmdldChhYm92ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0KSAmJiBncmlkLmdldChsZWZ0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChncmlkLmlzQm9yZGVyKHJpZ2h0KSAmJiBncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICBmaXhlZC5hZGQoZWRnZSk7XG4gICAgZ3JpZC5zZXQoZWRnZSwgJ24nKTtcbiAgICBncmlkLnNldChsZWZ0LCAnJyk7XG4gICAgZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZExlZnRFZGdlKHtncmlkLCBmaXhlZH06IEEsIGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gZWRnZSArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0VXAgPSByaWdodCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodERvd24gPSByaWdodCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYGFkZExlZnQgJHtoZXgoZWRnZSl9IHJpZ2h0ICR7aGV4KHJpZ2h0KX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0KX0gcnUgJHtoZXgocmlnaHRVcCl9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0VXApfToke3RoaXMuZ3JpZC5nZXQocmlnaHRVcCl9IHJkICR7aGV4KHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmdldChyaWdodERvd24pfWApO1xuICAgIGlmICghZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHRVcCkgJiYgZ3JpZC5nZXQocmlnaHRVcCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodERvd24pICYmIGdyaWQuZ2V0KHJpZ2h0RG93bikpIHJldHVybiBmYWxzZTtcbiAgICBmaXhlZC5hZGQoZWRnZSk7XG4gICAgZ3JpZC5zZXQoZWRnZSwgJ2MnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZFJpZ2h0RWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBjb25zdCBsZWZ0ID0gZWRnZSAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnRVcCA9IGxlZnQgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdERvd24gPSBsZWZ0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGlmICghZ3JpZC5nZXQobGVmdCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0VXApICYmIGdyaWQuZ2V0KGxlZnRVcCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0RG93bikgJiYgZ3JpZC5nZXQobGVmdERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICdjJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBhZGRBcmVuYXNFYXJseSgpOiBib29sZWFuIHtcbiAgLy8gICAvLyBTcGVjaWZpY2FsbHksIGp1c3QgYXJlbmFzLi4uXG4gIC8vICAgbGV0IGFyZW5hcyA9IHRoaXMucGFyYW1zLmZlYXR1cmVzPy5bJ2EnXTtcbiAgLy8gICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgY29uc3QgZyA9IHRoaXMuZ3JpZDtcbiAgLy8gICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5zY3JlZW5zKSkge1xuICAvLyAgICAgY29uc3QgbWlkZGxlID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdCA9IChtaWRkbGUgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MiA9IChsZWZ0IC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDMgPSAobGVmdDIgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MlVwID0gKGxlZnQyIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQyRG93biA9IChsZWZ0MiArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDMgPSAocmlnaHQyICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyVXAgPSAocmlnaHQyIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MkRvd24gPSAocmlnaHQyICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGlmICghZy5pc0JvcmRlcihsZWZ0KSkge1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MykgJiYgZy5nZXQobGVmdDMpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJVcCkgJiYgZy5nZXQobGVmdDJVcCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MkRvd24pICYmIGcuZ2V0KGxlZnQyRG93bikpIGNvbnRpbnVlO1xuICAvLyAgICAgfVxuICAvLyAgICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDMpICYmIGcuZ2V0KHJpZ2h0MykpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDJVcCkgJiYgZy5nZXQocmlnaHQyVXApKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyRG93bikgJiYgZy5nZXQocmlnaHQyRG93bikpIGNvbnRpbnVlO1xuICAvLyAgICAgfVxuICAvLyAgICAgdGhpcy5maXhlZC5hZGQobWlkZGxlKTtcbiAgLy8gICAgIGcuc2V0KG1pZGRsZSwgJ2EnKTtcbiAgLy8gICAgIGcuc2V0KGxlZnQsICcnKTtcbiAgLy8gICAgIGcuc2V0KGxlZnQyLCAnJyk7XG4gIC8vICAgICBnLnNldChyaWdodCwgJycpO1xuICAvLyAgICAgZy5zZXQocmlnaHQyLCAnJyk7XG4gIC8vICAgICBhcmVuYXMtLTtcbiAgLy8gICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIGZhbHNlO1xuICAvLyB9XG5cbiAgYWRkRWFybHlGZWF0dXJlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkU3Bpa2VzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGQgc3Bpa2VzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRPdmVycGFzc2VzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5vdmVyID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZCBvdmVycGFzc2VzJ307XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZExhdGVGZWF0dXJlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkQXJlbmFzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5hcmVuYSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRBcmVuYXMnfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZFVuZGVycGFzc2VzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy51bmRlciA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRVbmRlcnBhc3Nlcyd9O1xuICAgIH1cbiAgICAvLyBpZiAoIXRoaXMuYWRkUGl0cyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8ucGl0ID8/IDApKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCF0aGlzLmFkZFJhbXBzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5yYW1wID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZFJhbXBzJ307XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEFyZW5hcyhhOiBBLCBhcmVuYXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCBnID0gYS5ncmlkO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgY29uc3QgbWlkZGxlID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKCF0aGlzLmlzRWxpZ2libGVBcmVuYShhLCBtaWRkbGUpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKTtcbiAgICAgIGNvbnN0IGFyZW5hVGlsZSA9IHRpbGUuc3Vic3RyaW5nKDAsIDQpICsgJ2EnICsgdGlsZS5zdWJzdHJpbmcoNSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhhcmVuYVRpbGUpO1xuICAgICAgaWYgKCFvcHRpb25zLmxlbmd0aCkgY29udGludWU7XG4gICAgICBhLmZpeGVkLmFkZChtaWRkbGUpO1xuICAgICAgZy5zZXQobWlkZGxlLCAnYScpO1xuICAgICAgLy8gZy5zZXQobGVmdCwgJycpO1xuICAgICAgLy8gZy5zZXQobGVmdDIsICcnKTtcbiAgICAgIC8vIGcuc2V0KHJpZ2h0LCAnJyk7XG4gICAgICAvLyBnLnNldChyaWdodDIsICcnKTtcbiAgICAgIGFyZW5hcy0tO1xuICAgICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2NvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBhZGQgYXJlbmEnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc0VsaWdpYmxlQXJlbmEoYTogQSwgbWlkZGxlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBjb25zdCBnID0gYS5ncmlkO1xuICAgIGNvbnN0IGxlZnQgPSAobWlkZGxlIC0gOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSAobWlkZGxlICsgOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MiA9IChyaWdodCArIDgpIGFzIEdyaWRDb29yZDtcbiAgICBpZiAoZy5nZXQobWlkZGxlKSAhPT0gJ2MnICYmIGcuZ2V0KG1pZGRsZSkgIT09ICd3JykgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChnLmdldChsZWZ0KSB8fCBnLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWcuaXNCb3JkZXIobGVmdCkgJiYgZy5nZXQobGVmdDIpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSAmJiBnLmdldChyaWdodDIpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRVbmRlcnBhc3NlcyhhOiBBLCB1bmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuYWRkU3RyYWlnaHRTY3JlZW5MYXRlKGEsIHVuZGVyLCAweDgwMCwgJ2InKTtcbiAgfVxuXG4gIGFkZE92ZXJwYXNzZXMoYTogQSwgb3ZlcjogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICB3aGlsZSAob3Zlcikge1xuICAgICAgY29uc3QgeSA9IHRoaXMucmFuZG9tLm5leHRJbnQoYS5oIC0gMikgKyAxO1xuICAgICAgY29uc3QgeCA9IHRoaXMucmFuZG9tLm5leHRJbnQoYS53IC0gMikgKyAxO1xuICAgICAgY29uc3QgYyA9ICh5IDw8IDEyIHwgeCA8PCA0IHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KGMpICE9PSAnYycpIHtcbiAgICAgICAgaWYgKCsrYXR0ZW1wdHMgPiAxMCkgdGhyb3cgbmV3IEVycm9yKCdCYWQgYXR0ZW1wdHMnKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBhLmdyaWQuc2V0KGMsICdiJyk7XG4gICAgICBhLmZpeGVkLmFkZChjKTtcbiAgICAgIGEuZ3JpZC5zZXQoYyAtIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICBhLmdyaWQuc2V0KGMgKyA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgb3Zlci0tO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZFJhbXBzKGE6IEEsIHJhbXBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUoYSwgcmFtcHMsIDgsICcvJyk7XG4gIH1cblxuICAvKiogQHBhcmFtIGRlbHRhIEdyaWRDb29yZCBkaWZmZXJlbmNlIGZvciBlZGdlcyB0aGF0IG5lZWQgdG8gYmUgZW1wdHkuICovXG4gIGFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhOiBBLCBjb3VudDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsdGE6IG51bWJlciwgY2hhcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBzaWRlMSA9IChtaWRkbGUgLSBkZWx0YSkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3Qgc2lkZTIgPSAobWlkZGxlICsgZGVsdGEpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KG1pZGRsZSkgIT09ICdjJykgY29udGludWU7XG4gICAgICBpZiAoYS5ncmlkLmdldChzaWRlMSkgfHwgYS5ncmlkLmdldChzaWRlMikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgICAgY29uc3QgbmV3VGlsZSA9IHRpbGUuc3Vic3RyaW5nKDAsIDQpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcobmV3VGlsZSk7XG4gICAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIC8vIFRPRE8gLSByZXR1cm4gZmFsc2UgaWYgbm90IG9uIGEgY3JpdGljYWwgcGF0aD8/P1xuICAgICAgLy8gICAgICAtIGJ1dCBQT0kgYXJlbid0IHBsYWNlZCB5ZXQuXG4gICAgICBhLmZpeGVkLmFkZChtaWRkbGUpO1xuICAgICAgYS5ncmlkLnNldChtaWRkbGUsIGNoYXIpO1xuICAgICAgY291bnQtLTtcbiAgICAgIGlmICghY291bnQpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2NvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBhZGQgcmFtcCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFkZFNwaWtlcyhhOiBBLCBzcGlrZXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghc3Bpa2VzKSByZXR1cm4gdHJ1ZTtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChzcGlrZXMgPiAwKSB7XG4gICAgICBpZiAoKythdHRlbXB0cyA+IDIwKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIC8vIFRPRE8gLSB0cnkgdG8gYmUgc21hcnRlciBhYm91dCBzcGlrZXNcbiAgICAgIC8vICAtIGlmIHRvdGFsID4gMiB0aGVuIHVzZSBtaW4odG90YWwsIGgqLjYsID8/KSBhcyBsZW5cbiAgICAgIC8vICAtIGlmIGxlbiA+IDIgYW5kIHcgPiAzLCBhdm9pZCBwdXR0aW5nIHNwaWtlcyBvbiBlZGdlP1xuICAgICAgbGV0IGxlbiA9IE1hdGgubWluKHNwaWtlcywgTWF0aC5mbG9vcihhLmggKiAwLjYpLCB0aGlzLm1heFNwaWtlcyk7XG4gICAgICB3aGlsZSAobGVuIDwgc3Bpa2VzIC0gMSAmJiBsZW4gPiB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICBpZiAodGhpcy5yYW5kb20ubmV4dCgpIDwgMC4yKSBsZW4tLTtcbiAgICAgIH1cbiAgICAgIC8vaWYgKGxlbiA9PT0gc3Bpa2VzIC0gMSkgbGVuKys7XG4gICAgICBjb25zdCB4ID1cbiAgICAgICAgICAobGVuID4gMiAmJiBhLncgPiAzKSA/IHRoaXMucmFuZG9tLm5leHRJbnQoYS53IC0gMikgKyAxIDpcbiAgICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KGEudyk7XG4gICAgICAvLyBjb25zdCByID1cbiAgICAgIC8vICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGgubWluKHRoaXMuaCAtIDIsIHNwaWtlcykgLSB0aGlzLm1pblNwaWtlcyk7XG4gICAgICAvLyBsZXQgbGVuID0gdGhpcy5taW5TcGlrZXMgKyByO1xuICAgICAgaWYgKGxlbiA+IHNwaWtlcyAtIHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgIGlmIChsZW4gPj0gYS5oIC0gMikgeyAvLyAmJiBsZW4gPiB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICAgIGxlbiA9IGEuaCAtIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGVuID0gc3Bpa2VzOyAvLyA/Pz8gaXMgdGhpcyBldmVuIHZhbGlkID8/P1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCB5MCA9IHRoaXMucmFuZG9tLm5leHRJbnQoYS5oIC0gbGVuIC0gMikgKyAxO1xuICAgICAgY29uc3QgdDAgPSB5MCA8PCAxMiB8IHggPDwgNCB8IDB4ODA4O1xuICAgICAgY29uc3QgdDEgPSB0MCArICgobGVuIC0gMSkgPDwgMTIpO1xuICAgICAgZm9yIChsZXQgdCA9IHQwIC0gMHgxMDAwOyBsZW4gJiYgdCA8PSB0MSArIDB4MTAwMDsgdCArPSAweDgwMCkge1xuICAgICAgICBpZiAoYS5ncmlkLmdldCh0IGFzIEdyaWRDb29yZCkgIT09ICdjJykgbGVuID0gMDtcbiAgICAgIH1cbiAgICAgIGlmICghbGVuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNsZWFyZWQgPSBbdDAgLSA4LCB0MCArIDgsIHQxIC0gOCwgdDEgKyA4XSBhcyBHcmlkQ29vcmRbXTtcbiAgICAgIGNvbnN0IG9ycGhhbmVkID0gdGhpcy50cnlDbGVhcihhLCBjbGVhcmVkKTtcbiAgICAgIGlmICghb3JwaGFuZWQubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgYyBvZiBvcnBoYW5lZCkge1xuICAgICAgICBhLmdyaWQuc2V0KGMsICcnKTtcbiAgICAgIH1cbiAgICAgIGEuZml4ZWQuYWRkKCh0MCAtIDB4ODAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgYS5maXhlZC5hZGQoKHQwIC0gMHgxMDAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgYS5maXhlZC5hZGQoKHQxICsgMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBhLmZpeGVkLmFkZCgodDEgKyAweDEwMDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBmb3IgKGxldCB0ID0gdDA7IHQgPD0gdDE7IHQgKz0gMHg4MDApIHtcbiAgICAgICAgYS5maXhlZC5hZGQodCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICBhLmdyaWQuc2V0KHQgYXMgR3JpZENvb3JkLCAncycpO1xuICAgICAgfVxuICAgICAgc3Bpa2VzIC09IGxlbjtcbiAgICAgIGF0dGVtcHRzID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHNwaWtlcyA9PT0gMDtcbiAgfVxuXG4gIGNhblJlbW92ZShjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBOb3RhYmx5LCBleGNsdWRlIHN0YWlycywgbmFycm93IGVkZ2VzLCBhcmVuYXMsIGV0Yy5cbiAgICByZXR1cm4gYyA9PT0gJ2MnO1xuICB9XG5cbiAgLyoqXG4gICAqIERvZXMgYSB0cmF2ZXJzYWwgd2l0aCB0aGUgZ2l2ZW4gY29vcmRpbmF0ZShzKSBjbGVhcmVkLCBhbmQgcmV0dXJuc1xuICAgKiBhbiBhcnJheSBvZiBjb29yZGluYXRlcyB0aGF0IHdvdWxkIGJlIGN1dCBvZmYgKGluY2x1ZGluZyB0aGUgY2xlYXJlZFxuICAgKiBjb29yZGluYXRlcykuICBJZiBjbGVhcmluZyB3b3VsZCBjcmVhdGUgbW9yZSB0aGFuIHRoZSBhbGxvd2VkIG51bWJlclxuICAgKiBvZiBwYXJ0aXRpb25zICh1c3VhbGx5IDEpLCB0aGVuIHJldHVybnMgYW4gZW1wdHkgYXJyYXkgdG8gc2lnbmlmeVxuICAgKiB0aGF0IHRoZSBjbGVhciBpcyBub3QgYWxsb3dlZC5cbiAgICovXG4gIHRyeUNsZWFyKGE6IEEsIGNvb3JkczogR3JpZENvb3JkW10pOiBHcmlkQ29vcmRbXSB7XG4gICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjIG9mIGNvb3Jkcykge1xuICAgICAgaWYgKGEuZml4ZWQuaGFzKGMpKSByZXR1cm4gW107XG4gICAgICByZXBsYWNlLnNldChjLCAnJyk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzID0gYS5ncmlkLnBhcnRpdGlvbihyZXBsYWNlKTtcbiAgICAvLyBDaGVjayBzaW1wbGUgY2FzZSBmaXJzdCAtIG9ubHkgb25lIHBhcnRpdGlvblxuICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICBpZiAoZmlyc3Quc2l6ZSA9PT0gcGFydHMuc2l6ZSkgeyAvLyBhIHNpbmdsZSBwYXJ0aXRpb25cbiAgICAgIHJldHVybiBbLi4uY29vcmRzXTtcbiAgICB9XG4gICAgLy8gTW9yZSBjb21wbGV4IGNhc2UgLSBuZWVkIHRvIHNlZSB3aGF0IHdlIGFjdHVhbGx5IGhhdmUsXG4gICAgLy8gc2VlIGlmIGFueXRoaW5nIGdvdCBjdXQgb2ZmLlxuICAgIGNvbnN0IGNvbm5lY3RlZCA9IG5ldyBTZXQ8U2V0PEdyaWRDb29yZD4+KCk7XG4gICAgY29uc3QgYWxsUGFydHMgPSBuZXcgU2V0PFNldDxHcmlkQ29vcmQ+PihwYXJ0cy52YWx1ZXMoKSk7XG4gICAgZm9yIChjb25zdCBmaXhlZCBvZiBhLmZpeGVkKSB7XG4gICAgICBjb25uZWN0ZWQuYWRkKHBhcnRzLmdldChmaXhlZCkhKTtcbiAgICB9XG4gICAgaWYgKGNvbm5lY3RlZC5zaXplID4gdGhpcy5tYXhQYXJ0aXRpb25zKSByZXR1cm4gW107IC8vIG5vIGdvb2RcbiAgICBjb25zdCBvcnBoYW5lZCA9IFsuLi5jb29yZHNdO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiBhbGxQYXJ0cykge1xuICAgICAgaWYgKGNvbm5lY3RlZC5oYXMocGFydCkpIGNvbnRpbnVlO1xuICAgICAgb3JwaGFuZWQucHVzaCguLi5wYXJ0KTtcbiAgICB9XG4gICAgcmV0dXJuIG9ycGhhbmVkO1xuICB9XG5cbiAgcmVmaW5lKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCBmaWxsZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCBhLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGEuZ3JpZC5kYXRhW2ldKSBmaWxsZWQuYWRkKGEuZ3JpZC5jb29yZChpKSk7XG4gICAgfVxuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKGEuY291bnQgPiBhLnNpemUpIHtcbiAgICAgIGlmIChhdHRlbXB0cysrID4gNTApIHRocm93IG5ldyBFcnJvcihgcmVmaW5lIGZhaWxlZDogYXR0ZW1wdHNgKTtcbiAgICAgIC8vY29uc29sZS5sb2coYG1haW46ICR7dGhpcy5jb3VudH0gPiAke2Euc2l6ZX1gKTtcbiAgICAgIGxldCByZW1vdmVkID0gMDtcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT00KXtkZWJ1Z2dlcjtbLi4udGhpcy5yYW5kb20uaXNodWZmbGUoZmlsbGVkKV07fVxuICAgICAgZm9yIChjb25zdCBjb29yZCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4uZmlsbGVkXSkpIHtcbiAgICAgICAgaWYgKGEuZ3JpZC5pc0JvcmRlcihjb29yZCkgfHxcbiAgICAgICAgICAgICF0aGlzLmNhblJlbW92ZShhLmdyaWQuZ2V0KGNvb3JkKSkgfHxcbiAgICAgICAgICAgIGEuZml4ZWQuaGFzKGNvb3JkKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkID4gMykgYnJlYWs7XG5cbiAgICAgICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKHRoaXMucmVtb3ZhbE1hcChhLCBjb29yZCkpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplICYmIHBhcnRzLnNpemUgPiAxKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgICAgIC8vIG9rIHRvIHJlbW92ZVxuICAgICAgICAgIHJlbW92ZWQrKztcbiAgICAgICAgICBmaWxsZWQuZGVsZXRlKGNvb3JkKTtcbiAgICAgICAgICBpZiAoKGNvb3JkICYgMHg4MDgpID09PSAweDgwOCkgYS5jb3VudC0tO1xuICAgICAgICAgIGEuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBmaW5kIHRoZSBiaWdnZXN0IHBhcnRpdGlvbi5cbiAgICAgICAgICBsZXQgcGFydCE6IFNldDxHcmlkQ29vcmQ+O1xuICAgICAgICAgIGZvciAoY29uc3Qgc2V0IG9mIHBhcnRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoIXBhcnQgfHwgc2V0LnNpemUgPiBwYXJ0LnNpemUpIHBhcnQgPSBzZXQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIG1ha2Ugc3VyZSBhbGwgdGhlIGZpeGVkIHNjcmVlbnMgYXJlIGluIGl0LlxuICAgICAgICAgIGlmICghWy4uLmEuZml4ZWRdLmV2ZXJ5KGMgPT4gcGFydC5oYXMoYykpKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBjaGVjayB0aGF0IGl0J3MgYmlnIGVub3VnaC5cbiAgICAgICAgICBjb25zdCBjb3VudCA9IFsuLi5wYXJ0XS5maWx0ZXIoYyA9PiAoYyAmIDB4ODA4KSA9PSAweDgwOCkubGVuZ3RoO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coYHBhcnQ6ICR7Wy4uLnBhcnRdLm1hcCh4PT54LnRvU3RyaW5nKDE2KSkuam9pbignLCcpfSBjb3VudD0ke2NvdW50fWApO1xuICAgICAgICAgIGlmIChjb3VudCA8IGEuc2l6ZSkgY29udGludWU7XG4gICAgICAgICAgLy8gb2sgdG8gcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlZCsrO1xuICAgICAgICAgIGZpbGxlZCA9IHBhcnQ7XG4gICAgICAgICAgYS5jb3VudCA9IGNvdW50O1xuICAgICAgICAgIGEuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBwYXJ0cykge1xuICAgICAgICAgICAgaWYgKHYgIT09IHBhcnQpIGEuZ3JpZC5zZXQoaywgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFyZW1vdmVkKSB7XG4gICAgICAgIGlmICh0aGlzLmxvb3NlUmVmaW5lKSByZXR1cm4gT0s7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgcmVmaW5lICR7YS5jb3VudH0gPiAke2Euc2l6ZX1gfTtcbiAgICAgICAgLy9cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHJlbW92YWxNYXAoYTogQSwgY29vcmQ6IEdyaWRDb29yZCk6IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4ge1xuICAgIHJldHVybiBuZXcgTWFwKFtbY29vcmQsICcnXV0pO1xuICB9XG5cbiAgLyoqIFJlbW92ZSBvbmx5IGVkZ2VzLiBDYWxsZWQgYWZ0ZXIgcmVmaW5lKCkuICovXG4gIHJlZmluZUVkZ2VzKGE6IEEpOiBib29sZWFuIHtcbiAgICBsZXQgZWRnZXM6IEdyaWRDb29yZFtdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYS5ncmlkLmRhdGFbaV0pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY29vcmQgPSBhLmdyaWQuY29vcmQoaSk7XG4gICAgICBpZiAoYS5ncmlkLmlzQm9yZGVyKGNvb3JkKSB8fCBhLmZpeGVkLmhhcyhjb29yZCkpIGNvbnRpbnVlO1xuICAgICAgLy8gT25seSBhZGQgZWRnZXMuXG4gICAgICBpZiAoKGNvb3JkIF4gKGNvb3JkID4+IDgpKSAmIDgpIGVkZ2VzLnB1c2goY29vcmQpO1xuICAgIH1cbiAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKGVkZ2VzKTtcbiAgICBjb25zdCBvcmlnID0gYS5ncmlkLnBhcnRpdGlvbihuZXcgTWFwKCkpO1xuICAgIGxldCBzaXplID0gb3JpZy5zaXplO1xuICAgIGNvbnN0IHBhcnRDb3VudCA9IG5ldyBTZXQob3JpZy52YWx1ZXMoKSkuc2l6ZTtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZWRnZXMpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gYS5ncmlkLnBhcnRpdGlvbihuZXcgTWFwKFtbZSwgJyddXSkpO1xuICAgICAgLy9jb25zb2xlLmxvZyhgICBjb29yZDogJHtjb29yZC50b1N0cmluZygxNil9ID0+ICR7cGFydHMuc2l6ZX1gKTtcbiAgICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICAgIGNvbnN0IG9rID0gZmlyc3Quc2l6ZSA9PT0gcGFydHMuc2l6ZSA/XG4gICAgICAgICAgLy8gYSBzaW5nbGUgcGFydGl0aW9uIC0gbWFrZSBzdXJlIHdlIGRpZG4ndCBsb3NlIGFueXRoaW5nIGVsc2UuXG4gICAgICAgICAgcGFydHMuc2l6ZSA9PT0gc2l6ZSAtIDEgOlxuICAgICAgICAgIC8vIHJlcXVpcmUgbm8gbmV3IHBhcnRpdGlvbnNcbiAgICAgICAgICBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSBwYXJ0Q291bnQgJiYgcGFydHMuc2l6ZSA9PT0gc2l6ZSAtIDE7XG4gICAgICBpZiAob2spIHtcbiAgICAgICAgc2l6ZS0tO1xuICAgICAgICBhLmdyaWQuc2V0KGUsICcnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogV2UgY2FuJ3QgaGFuZGxlIGEgdGlsZSAnIGMgfGMgIHwgICAnIHNvIGdldCByaWQgb2Ygb25lIG9yIHRoZVxuICAgKiBvdGhlciBvZiB0aGUgZWRnZXMuICBMZWF2ZSB0aWxlcyBvZiB0aGUgZm9ybSAnIGMgfCAgIHwgYyAnIHNpbmNlXG4gICAqIHRoYXQgd29ya3MgZmluZS4gIFRPRE8gLSBob3cgdG8gcHJlc2VydmUgJyA+IHwgICB8IDwgJz9cbiAgICovXG4gIHJlbW92ZVNwdXJzKGE6IEEpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IDB4ODA4IHwgeCA8PCA0KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KGMpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdXAgPSAoYyAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IGRvd24gPSAoYyArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IGxlZnQgPSAoYyAtIDB4OCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCByaWdodCA9IChjICsgMHg4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICgoYS5ncmlkLmdldCh1cCkgfHwgYS5ncmlkLmdldChkb3duKSkgJiZcbiAgICAgICAgICAgIChhLmdyaWQuZ2V0KGxlZnQpIHx8IGEuZ3JpZC5nZXQocmlnaHQpKSkge1xuICAgICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0SW50KDIpKSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KHVwLCAnJyk7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KGRvd24sICcnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYS5ncmlkLnNldChsZWZ0LCAnJyk7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vY29uc29sZS5sb2coYHJlbW92ZSAke3l9ICR7eH06XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlVGlnaHRMb29wcyhhOiBBKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBhLmggLSAxOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHkgPDwgMTIgfCAweDgwMDtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53IC0gMTsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gKHJvdyB8ICh4IDw8IDQpIHwgOCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5pc1RpZ2h0TG9vcChhLCBjb29yZCkpIHRoaXMuYnJlYWtUaWdodExvb3AoYSwgY29vcmQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlzVGlnaHRMb29wKHtncmlkfTogQSwgY29vcmQ6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGZvciAobGV0IGR5ID0gMDsgZHkgPCAweDE4MDA7IGR5ICs9IDB4ODAwKSB7XG4gICAgICBmb3IgKGxldCBkeCA9IDA7IGR4IDwgMHgxODsgZHggKz0gOCkge1xuICAgICAgICBjb25zdCBkZWx0YSA9IGR5IHwgZHhcbiAgICAgICAgaWYgKGRlbHRhID09PSAweDgwOCkgY29udGludWU7XG4gICAgICAgIGlmIChncmlkLmdldCgoY29vcmQgKyBkZWx0YSkgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYnJlYWtUaWdodExvb3AoYTogQSwgY29vcmQ6IEdyaWRDb29yZCkge1xuICAgIC8vIFBpY2sgYSBkZWx0YSAtIGVpdGhlciA4LCAxMDA4LCA4MDAsIDgxMFxuICAgIGNvbnN0IHIgPSB0aGlzLnJhbmRvbS5uZXh0SW50KDB4MTAwMDApO1xuICAgIGNvbnN0IGRlbHRhID0gciAmIDEgPyAociAmIDB4MTAwMCkgfCA4IDogKHIgJiAweDEwKSB8IDB4ODAwO1xuICAgIGEuZ3JpZC5zZXQoKGNvb3JkICsgZGVsdGEpIGFzIEdyaWRDb29yZCwgJycpO1xuICB9XG5cbiAgYWRkU3RhaXJzKGE6IEEsIHVwID0gMCwgZG93biA9IDApOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIEZpbmQgc3BvdHMgd2hlcmUgd2UgY2FuIGFkZCBzdGFpcnNcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT01KWRlYnVnZ2VyO1xuICAgIGNvbnN0IHN0YWlycyA9IFt1cCwgZG93bl07XG4gICAgaWYgKCFzdGFpcnNbMF0gJiYgIXN0YWlyc1sxXSkgcmV0dXJuIE9LOyAvLyBubyBzdGFpcnNcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGlmICghdGhpcy50cnlBZGRTdGFpcihhLCBjLCBzdGFpcnMpKSBjb250aW51ZTtcbiAgICAgIGlmICghc3RhaXJzWzBdICYmICFzdGFpcnNbMV0pIHJldHVybiBPSzsgLy8gbm8gc3RhaXJzXG4gICAgfVxuICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgc3RhaXJzYH07IC8vXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICB9XG5cbiAgYWRkRWFybHlTdGFpcihhOiBBLCBjOiBHcmlkQ29vcmQsIHN0YWlyOiBzdHJpbmcpOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPiB7XG4gICAgY29uc3QgbW9kczogQXJyYXk8W0dyaWRDb29yZCwgc3RyaW5nXT4gPSBbXTtcbiAgICBjb25zdCBsZWZ0ID0gYyAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gYyArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHVwID0gYyAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBkb3duID0gYyArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBsZXQgbmVpZ2hib3JzID0gW2MgLSA4LCBjICsgOF0gYXMgR3JpZENvb3JkW107XG4gICAgaWYgKHN0YWlyID09PSAnPCcpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKGRvd24pO1xuICAgICAgbW9kcy5wdXNoKFt1cCwgJyddKTtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KGxlZnQpID09PSAnYycgJiYgYS5ncmlkLmdldChyaWdodCkgPT09ICdjJyAmJlxuICAgICAgICAgIHRoaXMucmFuZG9tLm5leHRJbnQoMykpIHtcbiAgICAgICAgbW9kcy5wdXNoKFtkb3duLCAnJ10sIFtjLCAnPCddKTtcbiAgICAgICAgcmV0dXJuIG1vZHM7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdGFpciA9PT0gJz4nKSB7XG4gICAgICBuZWlnaGJvcnMucHVzaCh1cCk7XG4gICAgICBtb2RzLnB1c2goW2Rvd24sICcnXSk7XG4gICAgfVxuICAgIC8vIE5PVEU6IGlmIHdlIGRlbGV0ZSB0aGVuIHdlIGZvcmdldCB0byB6ZXJvIGl0IG91dC4uLlxuICAgIC8vIEJ1dCBpdCB3b3VsZCBzdGlsbCBiZSBuaWNlIHRvIFwicG9pbnRcIiB0aGVtIGluIHRoZSBlYXN5IGRpcmVjdGlvbj9cbiAgICAvLyBpZiAodGhpcy5kZWx0YSA8IC0xNikgbmVpZ2hib3JzLnNwbGljZSgyLCAxKTtcbiAgICAvLyBpZiAoKHRoaXMuZGVsdGEgJiAweGYpIDwgOCkgbmVpZ2hib3JzLnNwbGljZSgxLCAxKTtcbiAgICBuZWlnaGJvcnMgPSBuZWlnaGJvcnMuZmlsdGVyKGMgPT4gYS5ncmlkLmdldChjKSA9PT0gJ2MnKTtcbiAgICBpZiAoIW5laWdoYm9ycy5sZW5ndGgpIHJldHVybiBbXTtcbiAgICBjb25zdCBrZWVwID0gdGhpcy5yYW5kb20ubmV4dEludChuZWlnaGJvcnMubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5laWdoYm9ycy5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGogIT09IGtlZXApIG1vZHMucHVzaChbbmVpZ2hib3JzW2pdLCAnJ10pO1xuICAgIH1cbiAgICBtb2RzLnB1c2goW2MsIHN0YWlyXSk7XG4gICAgcmV0dXJuIG1vZHM7XG4gIH1cblxuICB0cnlBZGRTdGFpcihhOiBBLCBjOiBHcmlkQ29vcmQsIHN0YWlyczogbnVtYmVyW10pOiBib29sZWFuIHtcbiAgICBpZiAoYS5maXhlZC5oYXMoKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKTtcbiAgICBjb25zdCBib3RoID0gc3RhaXJzWzBdICYmIHN0YWlyc1sxXTtcbiAgICBjb25zdCB0b3RhbCA9IHN0YWlyc1swXSArIHN0YWlyc1sxXTtcbiAgICBjb25zdCB1cCA9IHRoaXMucmFuZG9tLm5leHRJbnQodG90YWwpIDwgc3RhaXJzWzBdO1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbdXAgPyAwIDogMV07XG4gICAgaWYgKGJvdGgpIGNhbmRpZGF0ZXMucHVzaCh1cCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHN0YWlyIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgIGNvbnN0IHN0YWlyQ2hhciA9ICc8Pidbc3RhaXJdO1xuICAgICAgY29uc3Qgc3RhaXJUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyBzdGFpckNoYXIgKyB0aWxlLnN1YnN0cmluZyg1KTtcbiAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHN0YWlyVGlsZSkubGVuZ3RoKSB7XG4gICAgICAgIGEuZ3JpZC5zZXQoKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkLCBzdGFpckNoYXIpO1xuICAgICAgICBzdGFpcnNbc3RhaXJdLS07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBtYWtlIGEgcGF0aCBjb25uZWN0aW5nIHN0YXJ0IHRvIGVuZCAoYm90aCBjZW50ZXJzKS5cbiAgICogUmVxdWlyZXMgYWxsIFxuICAgKi9cbiAgdHJ5Q29ubmVjdChhOiBBLCBzdGFydDogR3JpZENvb3JkLCBlbmQ6IEdyaWRDb29yZCxcbiAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGF0dGVtcHRzID0gMSk6IGJvb2xlYW4ge1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgICBsZXQgcG9zID0gc3RhcnQ7XG4gICAgICBpZiAoKHN0YXJ0ICYgZW5kICYgMHg4MDgpICE9PSAweDgwOCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGJhZCBzdGFydCAke2hleChzdGFydCl9IG9yIGVuZCAke2hleChlbmQpfWApO1xuICAgICAgfVxuICAgICAgcmVwbGFjZS5zZXQocG9zLCBjaGFyKTtcbiAgICAgIHdoaWxlIChwb3MgIT09IGVuZCkge1xuICAgICAgICAvLyBvbiBhIGNlbnRlciAtIGZpbmQgZWxpZ2libGUgZGlyZWN0aW9uc1xuICAgICAgICBjb25zdCBkaXJzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBbOCwgLTgsIDB4ODAwLCAtMHg4MDBdKSB7XG4gICAgICAgICAgY29uc3QgcG9zMSA9IHBvcyArIGRpciBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgcG9zMiA9IHBvcyArIDIgKiBkaXIgYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmIChhLmZpeGVkLmhhcyhwb3MyKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHJlcGxhY2UuZ2V0KHBvczIpID8/IGEuZ3JpZC5nZXQocG9zMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIocG9zMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGlycy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBjb25zdCBkeSA9IChlbmQgPj4gMTIpIC0gKHBvcyA+PiAxMilcbiAgICAgICAgY29uc3QgZHggPSAoZW5kICYgMHhmMCkgLSAocG9zICYgMHhmMCk7XG4gICAgICAgIGNvbnN0IHByZWZlcnJlZCA9IG5ldyBTZXQ8bnVtYmVyPihkaXJzKTtcbiAgICAgICAgaWYgKGR5IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSgweDgwMCk7XG4gICAgICAgIGlmIChkeSA+IDApIHByZWZlcnJlZC5kZWxldGUoLTB4ODAwKTtcbiAgICAgICAgaWYgKGR4IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSg4KTtcbiAgICAgICAgaWYgKGR4ID4gMCkgcHJlZmVycmVkLmRlbGV0ZSgtOCk7XG4gICAgICAgIC8vIDM6MSBiaWFzIGZvciBwcmVmZXJyZWQgZGlyZWN0aW9ucyAgKFRPRE8gLSBiYWNrdHJhY2tpbmc/KVxuICAgICAgICBkaXJzLnB1c2goLi4ucHJlZmVycmVkLCAuLi5wcmVmZXJyZWQpO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLnJhbmRvbS5waWNrKGRpcnMpO1xuICAgICAgICByZXBsYWNlLnNldChwb3MgKyBkaXIgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgICAgICAgcmVwbGFjZS5zZXQocG9zID0gcG9zICsgMiAqIGRpciBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAgICAgfVxuICAgICAgaWYgKHBvcyAhPT0gZW5kKSBjb250aW51ZTtcbiAgICAgIC8vIElmIHdlIGdvdCB0aGVyZSwgbWFrZSB0aGUgY2hhbmdlcy5cbiAgICAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHJlcGxhY2UpIHtcbiAgICAgICAgYS5ncmlkLnNldChjLCB2KTtcbiAgICAgICAgaWYgKChjICYgMHg4MDgpID09PSAweDgwOCkgYS5jb3VudCsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRyeUFkZExvb3AoYTogQSwgY2hhcjogc3RyaW5nLCBhdHRlbXB0cyA9IDEpOiBib29sZWFuIHtcbiAgICAvLyBwaWNrIGEgcGFpciBvZiBjb29yZHMgZm9yIHN0YXJ0IGFuZCBlbmRcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSBhLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQoYykgfHwgYS5ncmlkLmlzQm9yZGVyKGMpKSBjb250aW51ZTtcbiAgICAgIGlmICghYS5ncmlkLmdldChFKGMpKSkgdWYudW5pb24oW2MsIEUoYyldKTtcbiAgICAgIGlmICghYS5ncmlkLmdldChTKGMpKSkgdWYudW5pb24oW2MsIFMoYyldKTtcbiAgICB9XG4gICAgY29uc3QgZWxpZ2libGUgPVxuICAgICAgICBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBbR3JpZENvb3JkLCBHcmlkQ29vcmRdW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYS5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgYyA9IHMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoIWEuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBkIG9mIFs4LCAtOCwgMHg4MDAsIC0weDgwMF0pIHtcbiAgICAgICAgY29uc3QgZTEgPSBjICsgZCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoZTEpIHx8IGEuZ3JpZC5nZXQoZTEpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZTIgPSBjICsgMiAqIGQgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoYS5ncmlkLmdldChlMikpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcChbW2UxIGFzIEdyaWRDb29yZCwgY2hhcl1dKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIHMsIHtyZXBsYWNlfSk7XG4gICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgIGVsaWdpYmxlLmdldCh1Zi5maW5kKGUyKSkucHVzaChbZTEsIGUyXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgd2VpZ2h0ZWRNYXAgPSBuZXcgTWFwPEdyaWRDb29yZCwgW0dyaWRDb29yZCwgR3JpZENvb3JkXVtdPigpO1xuICAgIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIGVsaWdpYmxlLnZhbHVlcygpKSB7XG4gICAgICBpZiAocGFydGl0aW9uLmxlbmd0aCA8IDIpIGNvbnRpbnVlOyAvLyBUT0RPIC0gMyBvciA0P1xuICAgICAgZm9yIChjb25zdCBbZTFdIG9mIHBhcnRpdGlvbikge1xuICAgICAgICB3ZWlnaHRlZE1hcC5zZXQoZTEsIHBhcnRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHdlaWdodGVkID0gWy4uLndlaWdodGVkTWFwLnZhbHVlcygpXTtcbiAgICBpZiAoIXdlaWdodGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcGFydGl0aW9uID0gdGhpcy5yYW5kb20ucGljayh3ZWlnaHRlZCk7XG4gICAgICBjb25zdCBbW2UwLCBjMF0sIFtlMSwgYzFdXSA9IHRoaXMucmFuZG9tLmlzaHVmZmxlKHBhcnRpdGlvbik7XG4gICAgICBhLmdyaWQuc2V0KGUwLCBjaGFyKTtcbiAgICAgIGEuZ3JpZC5zZXQoZTEsIGNoYXIpO1xuICAgICAgaWYgKHRoaXMudHJ5Q29ubmVjdChhLCBjMCwgYzEsIGNoYXIsIDUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgYS5ncmlkLnNldChlMCwgJycpO1xuICAgICAgYS5ncmlkLnNldChlMSwgJycpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKiogTWFrZSBhcnJhbmdlbWVudHMgdG8gbWF4aW1pemUgdGhlIHN1Y2Nlc3MgY2hhbmNlcyBvZiBpbmZlci4gKi9cbiAgcHJlaW5mZXIoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAodGhpcy5wYXJhbXMuZmVhdHVyZXM/LnNwaWtlKSB7XG4gICAgICBpZiAoKHJlc3VsdCA9IHRoaXMucHJlaW5mZXJTcGlrZXMoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBwcmVpbmZlclNwaWtlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBtYWtlIHN1cmUgdGhlcmUncyBhICdjJyBhYm92ZSBlYWNoICdzJ1xuICAgIC8vIGNoZWNrIHNpZGVzP1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGluZmVyU2NyZWVucyhhOiBBKTogUmVzdWx0PE1ldGFsb2NhdGlvbj4ge1xuICAgIGNvbnN0IHNjcmVlbnM6IE1ldGFzY3JlZW5bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcyBvZiBhLmdyaWQuc2NyZWVucygpKSB7XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgcyk7XG4gICAgICBjb25zdCBjYW5kaWRhdGVzID1cbiAgICAgICAgICB0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpXG4gICAgICAgICAgICAgIC5maWx0ZXIocyA9PiAhcy5kYXRhLm1vZCk7XG4gICAgICBpZiAoIWNhbmRpZGF0ZXMubGVuZ3RoKSB7XG4gICAgICAgIC8vY29uc29sZS5lcnJvcihhLmdyaWQuc2hvdygpKTtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBpbmZlciBzY3JlZW4gJHtoZXgocyl9OiBbJHt0aWxlfV1gfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpY2sgPSB0aGlzLnJhbmRvbS5waWNrKGNhbmRpZGF0ZXMpO1xuICAgICAgc2NyZWVucy5wdXNoKHBpY2spO1xuICAgICAgaWYgKHBpY2suaGFzRmVhdHVyZSgnd2FsbCcpKSBhLndhbGxzKys7XG4gICAgICBpZiAocGljay5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgYS5icmlkZ2VzKys7XG5cbiAgICAgIC8vIFRPRE8gLSBhbnkgb3RoZXIgZmVhdHVyZXMgdG8gdHJhY2s/XG5cbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gbmV3IE1ldGFsb2NhdGlvbih0aGlzLnBhcmFtcy5pZCwgdGhpcy5vcmlnLnRpbGVzZXQsIGEuaCwgYS53KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIG1ldGEuc2V0KHkgPDwgNCB8IHgsIHNjcmVlbnNbeSAqIGEudyArIHhdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge29rOiB0cnVlLCB2YWx1ZTogbWV0YX07XG4gIH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSByaWdodCBudW1iZXIgb2Ygd2FsbHMgYW5kIGJyaWRnZXNcbiAgICAvLyBhLndhbGxzID0gYS5icmlkZ2VzID0gMDsgLy8gVE9ETyAtIGRvbid0IGJvdGhlciBtYWtpbmcgdGhlc2UgaW5zdGFuY2VcbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgIC8vICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge2NvbnNvbGUud2FybihoZXgocG9zKSk7IGEuYnJpZGdlcysrO31cbiAgICAvLyAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSBhLndhbGxzKys7XG4gICAgLy8gfVxuICAgIGNvbnN0IGJyaWRnZXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYnJpZGdlIHx8IDA7XG4gICAgY29uc3Qgd2FsbHMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ud2FsbCB8fCAwO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKG1ldGEuYWxsUG9zKCkpKSB7XG4gICAgICBjb25zdCBjID0gKChwb3MgPDwgOCB8IHBvcyA8PCA0KSAmIDB4ZjBmMCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpXG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKHRoaXMuYWRkQmxvY2tzICYmXG4gICAgICAgICAgdGhpcy50cnlNZXRhKG1ldGEsIHBvcywgdGhpcy5vcmlnLnRpbGVzZXQud2l0aE1vZCh0aWxlLCAnYmxvY2snKSkpIHtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgYS5icmlkZ2VzLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGEuYnJpZGdlcyA+IGJyaWRnZXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZy50aWxlc2V0LndpdGhNb2QodGlsZSwgJ2JyaWRnZScpKSkge1xuICAgICAgICAgIGEuYnJpZGdlcy0tO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAvLyB9IGVsc2UgaWYgKGJyaWRnZXMgPCBhLmJyaWRnZXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAvLyAgIC8vIGNhbid0IGFkZCBicmlkZ2VzP1xuICAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoYS53YWxscyA8IHdhbGxzICYmICFzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICd3YWxsJykpKSB7XG4gICAgICAgICAgYS53YWxscysrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUud2FybihgYnJpZGdlcyAke2EuYnJpZGdlc30gJHticmlkZ2VzfSAvIHdhbGxzICR7YS53YWxsc30gJHt3YWxsc31cXG4ke2EuZ3JpZC5zaG93KCl9XFxuJHttZXRhLnNob3coKX1gKTtcbiAgICBpZiAoYS5icmlkZ2VzICE9PSBicmlkZ2VzKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgZmFpbDogYHJlZmluZU1ldGEgYnJpZGdlcyB3YW50ICR7YnJpZGdlc30gZ290ICR7YS5icmlkZ2VzfWB9O1xuICAgIH1cbiAgICBpZiAoYS53YWxscyAhPT0gd2FsbHMpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLFxuICAgICAgICAgICAgICBmYWlsOiBgcmVmaW5lTWV0YSB3YWxscyB3YW50ICR7d2FsbHN9IGdvdCAke2Eud2FsbHN9YH07XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHRyeU1ldGEobWV0YTogTWV0YWxvY2F0aW9uLCBwb3M6IFBvcyxcbiAgICAgICAgICBzY3JlZW5zOiBJdGVyYWJsZTxNZXRhc2NyZWVuPik6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgcyBvZiBzY3JlZW5zKSB7XG4gICAgICBpZiAoIXRoaXMuY2hlY2tNZXRhKG1ldGEsIG5ldyBNYXAoW1twb3MsIHNdXSkpKSBjb250aW51ZTtcbiAgICAgIG1ldGEuc2V0KHBvcywgcyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY2hlY2tNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcmVwbGFjZW1lbnRzPzogTWFwPFBvcywgTWV0YXNjcmVlbj4pOiBib29sZWFuIHtcblxuICAgIC8vIFRPRE8gLSBmbGlnaHQ/ICBtYXkgaGF2ZSBhIGRpZmYgIyBvZiBmbGlnaHQgdnMgbm9uLWZsaWdodCBwYXJ0aXRpb25zXG4gICAgY29uc3Qgb3B0cyA9IHJlcGxhY2VtZW50cyA/IHt3aXRoOiByZXBsYWNlbWVudHN9IDoge307XG4gICAgY29uc3QgcGFydHMgPSBtZXRhLnRyYXZlcnNlKG9wdHMpO1xuICAgIHJldHVybiBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSB0aGlzLm1heFBhcnRpdGlvbnM7XG4gIH1cbn1cblxuLy8gVE9ETzpcbi8vICAtIHdoZW4gdGhlcmUncyBhIGJyaWRnZSwgbmV3IHJ1bGUgdG8gcmVxdWlyZSBhIHN0YWlyIG9yIHBvaVxuLy8gICAgdG8gYmUgcGFydGl0aW9uZWQgb2ZmIGlmIGJyaWRnZSB0aWxlIGlzIHJlbW92ZWRcbi8vICAtIHBvc3NpYmx5IGFsc28gKmxpbmsqIHRvIG90aGVyIHNjcmVlbj9cbi8vICAtIHBsYWNlIGJyaWRnZSBlYXJseSBvciBsYXRlP1xuLy8gICAgLSBpZiBlYXJseSB0aGVuIG5vIHdheSB0byBlbmZvcmNlIHRocm91Z2huZXNzIHJ1bGVcbi8vICAgIC0gaWYgbGF0ZSB0aGVuIGhhcmQgdG8gc3luYyB1cCB3aXRoIG90aGVyIGZsb29yXG4vLyBBTFNPLCB3ZSBkb24ndCBoYXZlIGEgcmVmIHRvIHRoZSB0aWxlc2V0IHJpZ2h0IG5vdywgZG9uJ3QgZXZlblxuLy8ga25vdyB3aGF0IHRoZSB0aWxlcyBhcmUhICBOZWVkIHRvIG1hcCB0aGUgM3gzIGdyaWQgb2YgKD8/KSB0b1xuLy8gbWV0YXRpbGVzLlxuLy8gIC0gY29uc2lkZXIgdXBkYXRpbmcgXCJlZGdlXCIgdG8gYmUgd2hvbGUgOXg5P1xuLy8gICAgICcgYyAvY2NjLyAgICdcbi8vICAgICBjYXZlKCdjYyBjJywgJ2MnKVxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8IGMgfFxuLy8gICAgICAgfGNjY3xcbi8vICAgICAgIHwgICB8YCxcbi8vXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHwgICB8XG4vLyAgICAgICB8Y3UgfFxuLy8gICAgICAgfCAgIHxgLFxuLy9cbi8vIEJhc2ljIGlkZWEgd291bGQgYmUgdG8gc2ltcGxpZnkgdGhlIFwiZmVhdHVyZXNcIiBiaXQgcXVpdGUgYSBiaXQsXG4vLyBhbmQgZW5jYXBzdWxhdGUgdGhlIHdob2xlIHRoaW5nIGludG8gdGhlIHRpbGUgLSBlZGdlcywgY29ybmVycywgY2VudGVyLlxuLy9cbi8vIEZvciBvdmVyd29ybGQsICdvJyBtZWFucyBvcGVuLCAnZycgZm9yIGdyYXNzLCBldGMuLi4/XG4vLyAtIHRoZW4gdGhlIGxldHRlcnMgYXJlIGFsd2F5cyB0aGUgd2Fsa2FibGUgdGlsZXMsIHdoaWNoIG1ha2VzIHNlbnNlXG4vLyAgIHNpbmNlIHRob3NlIGFyZSB0aGUgb25lcyB0aGF0IGhhdmUgYWxsIHRoZSB2YXJpZXR5LlxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfG9vIHxcbi8vICAgICAgIHwgICB8YCxcbi8vICAgICB0aWxlYFxuLy8gICAgICAgfG9vIHxcbi8vICAgICAgIHxvb298XG4vLyAgICAgICB8b2dvfGAsXG5cbi8vIGV4cG9ydCBjbGFzcyBDYXZlU2h1ZmZsZUF0dGVtcHQgZXh0ZW5kcyBNYXplU2h1ZmZsZUF0dGVtcHQge1xuXG4vLyAgIHJlYWRvbmx5IHRpbGVzZXQ6IE1ldGF0aWxlc2V0O1xuLy8gICByZWFkb25seSBncmlkOiBHcmlkPHN0cmluZz47XG4vLyAgIHJlYWRvbmx5IGZpeGVkID0gbmV3IFNldDxHcmlkQ29vcmQ+KCk7XG4vLyAgIHJlYWRvbmx5IHNjcmVlbnM6IHJlYWRvbmx5IEdyaWRDb29yZFtdID0gW107XG4vLyAgIG1ldGEhOiBNZXRhbG9jYXRpb247XG4vLyAgIGNvdW50ID0gMDtcbi8vICAgd2FsbHMgPSAwO1xuLy8gICBicmlkZ2VzID0gMDtcbi8vICAgbWF4UGFydGl0aW9ucyA9IDE7XG4vLyAgIG1pblNwaWtlcyA9IDI7XG5cbi8vICAgY29uc3RydWN0b3IocmVhZG9ubHkgaDogbnVtYmVyLCByZWFkb25seSB3OiBudW1iZXIsXG4vLyAgICAgICAgICAgICAgIHJlYWRvbmx5IHBhcmFtczogU3VydmV5LCByZWFkb25seSByYW5kb206IFJhbmRvbSkge1xuLy8gICAgIHN1cGVyKCk7XG4vLyAgICAgdGhpcy5ncmlkID0gbmV3IEdyaWQoaCwgdyk7XG4vLyAgICAgdGhpcy5ncmlkLmRhdGEuZmlsbCgnJyk7XG4vLyAgICAgZm9yIChsZXQgeSA9IDAuNTsgeSA8IGg7IHkrKykge1xuLy8gICAgICAgZm9yIChsZXQgeCA9IDAuNTsgeCA8IHc7IHgrKykge1xuLy8gICAgICAgICBpZiAoeSA+IDEpIHRoaXMuZ3JpZC5zZXQyKHkgLSAwLjUsIHgsICdjJyk7XG4vLyAgICAgICAgIGlmICh4ID4gMSkgdGhpcy5ncmlkLnNldDIoeSwgeCAtIDAuNSwgJ2MnKTtcbi8vICAgICAgICAgdGhpcy5ncmlkLnNldDIoeSwgeCwgJ2MnKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgdGhpcy5jb3VudCA9IGggKiB3O1xuLy8gICAgIGNvbnN0IHNjcmVlbnM6IEdyaWRDb29yZFtdID0gW107XG4vLyAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmg7IHkrKykge1xuLy8gICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuLy8gICAgICAgICBzY3JlZW5zLnB1c2goKHkgPDwgMTIgfCB4IDw8IDQpIGFzIEdyaWRDb29yZCk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHRoaXMuc2NyZWVucyA9IHNjcmVlbnM7XG4vLyAgIH1cblxuXG4gIC8vIGNoZWNrUmVhY2hhYmlsaXR5KHJlcGxhY2U/OiBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KTogYm9vbGVhbiB7XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gIC8vIH1cblxuXG5leHBvcnQgY2xhc3MgV2lkZUNhdmVTaHVmZmxlIGV4dGVuZHMgQ2F2ZVNodWZmbGUge1xuICBhZGRMYXRlRmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdCA9IHN1cGVyLmFkZExhdGVGZWF0dXJlcyhhKTtcbiAgICBpZiAoIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBhLmdyaWQuZGF0YSA9IGEuZ3JpZC5kYXRhLm1hcChjID0+IGMgPT09ICdjJyA/ICd3JyA6IGMpO1xuICAgIHJldHVybiBPSztcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ3J5cHRFbnRyYW5jZVNodWZmbGUgZXh0ZW5kcyBDYXZlU2h1ZmZsZSB7XG4gIHJlZmluZU1ldGFzY3JlZW5zKGE6IEEsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gY2hhbmdlIGFyZW5hIGludG8gY3J5cHQgYXJlbmFcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KCh5IDw8IDEyIHwgeCA8PCA0IHwgMHg4MDgpIGFzIEdyaWRDb29yZCkgPT09ICdhJykge1xuICAgICAgICAgIG1ldGEuc2V0KHkgPDwgNCB8IHgsIG1ldGEucm9tLm1ldGFzY3JlZW5zLmNyeXB0QXJlbmFfc3RhdHVlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLnJlZmluZU1ldGFzY3JlZW5zKGEsIG1ldGEpO1xuICB9XG5cbiAgaXNFbGlnaWJsZUFyZW5hKGE6IEEsIGM6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhYS5ncmlkLmdldChjIC0gMHg4MDAgYXMgR3JpZENvb3JkKSAmJiBzdXBlci5pc0VsaWdpYmxlQXJlbmEoYSwgYyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEthcm1pbmVCYXNlbWVudFNodWZmbGUgZXh0ZW5kcyBDYXZlU2h1ZmZsZSB7XG4gIGxvb3NlUmVmaW5lID0gdHJ1ZTtcblxuICBwaWNrV2lkdGgoKSB7IHJldHVybiA4OyB9XG4gIHBpY2tIZWlnaHQoKSB7IHJldHVybiA1OyB9XG5cbiAgaW5pdGlhbEZpbGwoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gU2V0IHVwIHRoZSBiYXNpYyBmcmFtZXdvcms6XG4gICAgLy8gICogYSBzaW5nbGUgcm93IG9mIGNyb3NzLWN1dHRpbmcgY29ycmlkb3IsIHdpdGggdGhyZWUgb2YgdGhlXG4gICAgLy8gICAgZm91ciBjb2x1bW5zIGFzIHNwaWtlcywgYW5kIGZ1bGwgY29ubmVjdGlvbnMgYXJvdW5kIHRoZVxuICAgIC8vICAgIGVkZ2VzLlxuICAgIGlmIChhLmdyaWQuaGVpZ2h0ICE9PSA1IHx8IGEuZ3JpZC53aWR0aCAhPT0gOCkgdGhyb3cgbmV3IEVycm9yKCdiYWQgc2l6ZScpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSBLYXJtaW5lQmFzZW1lbnRTaHVmZmxlLlBBVFRFUk5baV07XG4gICAgICBhLmdyaWQuZGF0YVtpXSA9IGMgIT09ICcgJyA/IGMgOiAnJztcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgYWRkU3Bpa2VzKGE6IEEpOiBib29sZWFuIHtcbiAgICBjb25zdCBkcm9wcGVkID0gdGhpcy5yYW5kb20ubmV4dEludCg0KTtcbiAgICBmb3IgKGxldCB5ID0gMTsgeSA8IDEwOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgNDsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGkgPSAyICogeCArIDUgKyB5ICogMTc7XG4gICAgICAgIGlmICh4ID09PSBkcm9wcGVkKSB7XG4gICAgICAgICAgYS5ncmlkLmRhdGFbaV0gPSAnYyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgYyA9IGEuZ3JpZC5jb29yZChpIGFzIEdyaWRJbmRleCk7XG4gICAgICAgICAgYS5maXhlZC5hZGQoYyk7XG4gICAgICAgICAgaWYgKHkgPT09IDUpIHtcbiAgICAgICAgICAgIGEuZml4ZWQuYWRkKGMgKyA4IGFzIEdyaWRDb29yZCk7XG4gICAgICAgICAgICBhLmZpeGVkLmFkZChjICsgMTYgYXMgR3JpZENvb3JkKTtcbiAgICAgICAgICAgIGEuZml4ZWQuYWRkKGMgLSA4IGFzIEdyaWRDb29yZCk7XG4gICAgICAgICAgICBhLmZpeGVkLmFkZChjIC0gMTYgYXMgR3JpZENvb3JkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOb3cgcGljayByYW5kb20gcGxhY2VzIGZvciB0aGUgc3RhaXJzLlxuICAgIGxldCBzdGFpcnMgPSAwO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgaWYgKHN0YWlycyA9PT0gMykgYnJlYWs7XG4gICAgICBjb25zdCBtaWQgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCB1cCA9IChtaWQgLSAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgZG93biA9IChtaWQgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQobWlkKSA9PT0gJ2MnICYmXG4gICAgICAgICAgYS5ncmlkLmdldCh1cCkgIT09ICdzJyAmJlxuICAgICAgICAgIGEuZ3JpZC5nZXQoZG93bikgIT09ICdzJykge1xuICAgICAgICBhLmdyaWQuc2V0KG1pZCwgJzwnKTtcbiAgICAgICAgYS5maXhlZC5hZGQobWlkKTtcbiAgICAgICAgYS5ncmlkLnNldCh1cCwgJycpO1xuICAgICAgICBhLmdyaWQuc2V0KGRvd24sICcnKTtcbiAgICAgICAgc3RhaXJzKys7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkU3RhaXJzKCkgeyByZXR1cm4gT0s7IH1cblxuICBzdGF0aWMgcmVhZG9ubHkgUEFUVEVSTiA9IFtcbiAgICAnICAgICAgICAgICAgICAgICAnLFxuICAgICcgICBjY2NjY2NjY2NjYyAgICcsXG4gICAgJyAgIGMgYyBjIGMgYyBjICAgJyxcbiAgICAnIGNjYyBzIHMgcyBzIGNjYyAnLFxuICAgICcgYyBjIHMgcyBzIHMgYyBjICcsXG4gICAgJyBjY2Njc2NzY3Njc2NjY2MgJyxcbiAgICAnIGMgYyBzIHMgcyBzIGMgYyAnLFxuICAgICcgY2NjIHMgcyBzIHMgY2NjICcsXG4gICAgJyAgIGMgYyBjIGMgYyBjICAgJyxcbiAgICAnICAgY2NjY2NjY2NjY2MgICAnLFxuICAgICcgICAgICAgICAgICAgICAgICcsXG4gIF0uam9pbignJyk7XG59XG4iXX0=