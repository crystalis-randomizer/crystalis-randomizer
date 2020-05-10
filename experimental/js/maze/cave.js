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
        this._requirePitDestination = false;
    }
    requirePitDestination() {
        this._requirePitDestination = true;
        return this;
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
                statue: 0,
                under: 0,
                wall: 0,
                wide: 0,
            },
        };
        if (meta.id >= 0) {
            for (const spawn of meta.rom.locations[meta.id].spawns) {
                if (spawn.isMonster() && spawn.monsterId === 0x8f) {
                    survey.features.statue++;
                }
            }
        }
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
        this.init();
        let result;
        const a = new CaveShuffleAttempt(h, w, size);
        if ((result = this.fillGrid(a)), !result.ok)
            return result;
        if ((result = this.preinfer(a)), !result.ok)
            return result;
        const meta = this.inferScreens(a);
        if (!meta.ok)
            return meta;
        if ((result = this.refineMetascreens(a, meta.value)), !result.ok) {
            return result;
        }
        if ((result = this.checkMetascreens(a, meta.value)), !result.ok) {
            return result;
        }
        if (this._requirePitDestination &&
            !this.requireEligiblePitDestination(meta.value)) {
            return { ok: false, fail: `no eligible pit destination` };
        }
        return meta;
    }
    fillGrid(a) {
        var _a;
        let result;
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
        return OK;
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
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!this.addArenas(a, (_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.arena) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: 'addArenas' };
        }
        if (!this.addUnderpasses(a, (_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.under) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'addUnderpasses' };
        }
        if (!this.addPits(a, (_f = (_e = this.params.features) === null || _e === void 0 ? void 0 : _e.pit) !== null && _f !== void 0 ? _f : 0)) {
            return { ok: false, fail: 'addPits' };
        }
        if (!this.addRamps(a, (_h = (_g = this.params.features) === null || _g === void 0 ? void 0 : _g.ramp) !== null && _h !== void 0 ? _h : 0)) {
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
        return this.addStraightScreenLate(a, under, 'b', 0x800);
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
    addPits(a, pits) {
        return this.addStraightScreenLate(a, pits, 'p');
    }
    addRamps(a, ramps) {
        return this.addStraightScreenLate(a, ramps, '/', 8);
    }
    addStraightScreenLate(a, count, char, delta) {
        if (!count)
            return true;
        for (const c of this.random.ishuffle(a.grid.screens())) {
            const middle = (c | 0x808);
            if (a.grid.get(middle) !== 'c')
                continue;
            if (delta) {
                const side1 = (middle - delta);
                const side2 = (middle + delta);
                if (a.grid.get(side1) || a.grid.get(side2))
                    continue;
            }
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
    tryExtrude(a, char, length, attempts = 1) {
        while (attempts--) {
            for (const c of this.random.ishuffle(a.grid.screens())) {
                const mid = c + 0x808;
                if (!a.grid.get(mid))
                    continue;
                const tile = this.extract(a.grid, c);
                for (let dir of this.random.ishuffle([0, 1, 2, 3])) {
                    const n1 = mid + GRIDDIR[dir];
                    const n2 = mid + 2 * GRIDDIR[dir];
                    if (a.grid.get(n1) || a.grid.isBorder(n1) || a.grid.get(n2))
                        continue;
                    const i = TILEDIR[dir];
                    const rep = tile.substring(0, i) + char + tile.substring(i + 1);
                    if (this.orig.tileset.getMetascreensFromTileString(rep).length) {
                        a.grid.set(n1, char);
                        a.grid.set(n2, char);
                        const added = this.tryContinueExtrude(a, char, length, n2);
                        if (added)
                            return added;
                        a.grid.set(n2, '');
                        a.grid.set(n1, '');
                    }
                }
            }
        }
        return 0;
    }
    tryContinueExtrude(a, char, length, c) {
        const tile = this.extract(a.grid, c - 0x808);
        const ok = this.orig.tileset.getMetascreensFromTileString(tile).length > 0;
        if (length === 1)
            return ok ? 1 : 0;
        if (ok && !this.random.nextInt(length))
            return 1;
        for (const dir of this.random.ishuffle([0, 1, 2, 3])) {
            const n1 = c + GRIDDIR[dir];
            const n2 = c + 2 * GRIDDIR[dir];
            if (a.grid.get(n1) || a.grid.isBorder(n1) || a.grid.get(n2))
                continue;
            const i = TILEDIR[dir];
            const rep = tile.substring(0, i) + char + tile.substring(i + 1);
            if (this.orig.tileset.getMetascreensFromTileString(rep).length) {
                a.grid.set(n1, char);
                a.grid.set(n2, char);
                const added = this.tryContinueExtrude(a, char, length - 1, n2);
                if (added)
                    return added + 1;
                a.grid.set(n2, '');
                a.grid.set(n1, '');
            }
            if (ok)
                break;
        }
        return ok ? 1 : 0;
    }
    tryAdd(a, opts = {}) {
        const tileset = this.orig.tileset;
        const { attempts = 1, char = 'c', start, loop = false } = opts;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const startIter = start != null ?
                [(start & 0xf0f0)] :
                this.random.ishuffle(a.grid.screens());
            for (const c of startIter) {
                const mid = c + 0x808;
                if (!a.grid.get(mid))
                    continue;
                const tile = this.extract(a.grid, c);
                for (let dir of this.random.ishuffle([0, 1, 2, 3])) {
                    const n1 = mid + GRIDDIR[dir];
                    const n2 = mid + 2 * GRIDDIR[dir];
                    if (a.fixed.has(n1) || a.fixed.has(n2))
                        continue;
                    const o1 = a.grid.get(n1);
                    const o2 = a.grid.get(n2);
                    if ((o1 && (o2 || o1 !== char)) || a.grid.isBorder(n1))
                        continue;
                    if (!loop) {
                        const neighborTile = this.extract(a.grid, n2 - 0x808, { replace: new Map([[n1, '']]) });
                        if (/\S/.test(neighborTile))
                            continue;
                    }
                    const i = TILEDIR[dir];
                    const rep = tile.substring(0, i) + char + tile.substring(i + 1);
                    if (tileset.getMetascreensFromTileString(rep).length) {
                        a.grid.set(n1, char);
                        a.grid.set(n2, char);
                        const neighborTile = this.extract(a.grid, n2 - 0x808);
                        if (tileset.getMetascreensFromTileString(neighborTile).length) {
                            return 1;
                        }
                        a.grid.set(n2, o2);
                        a.grid.set(n1, o1);
                    }
                }
            }
        }
        return 0;
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
                if (a.grid.show().length > 100000)
                    debugger;
                return { ok: false, fail: `infer screen ${hex(s)}: [${tile}]\n${a.grid.show()}` };
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
            if (a.bridges <= bridges && scr.hasFeature('bridge'))
                continue;
            if (this.addBlocks &&
                this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'block'))) {
                if (scr.hasFeature('bridge'))
                    a.bridges--;
                continue;
            }
            if (scr.hasFeature('bridge')) {
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
                fail: `refineMeta bridges want ${bridges} got ${a.bridges}\n${meta.show()}` };
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
    requireEligiblePitDestination(meta) {
        let v = false;
        let h = false;
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            if (scr.hasFeature('river') || scr.hasFeature('empty'))
                continue;
            const edges = (scr.data.edges || '').split('').map(x => x === ' ' ? '' : x);
            if (edges[0] && edges[2])
                v = true;
            if ((edges[1] && edges[3]) || scr.hasFeature('spikes')) {
                h = true;
            }
            if (v && h)
                return true;
        }
        return false;
    }
    checkMetascreens(a, meta) {
        var _a, _b;
        if (!((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.statue))
            return OK;
        let statues = 0;
        for (const pos of meta.allPos()) {
            const scr = meta.get(pos);
            statues += ((_b = scr.data.statues) === null || _b === void 0 ? void 0 : _b.length) || 0;
        }
        if (statues < this.params.features.statue) {
            return { ok: false, fail: `insufficient statue screens` };
        }
        return OK;
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
        Grid.writeGrid2d(a.grid, 0, KarmineBasementShuffle.PATTERN);
        a.count = 36;
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
        const partitions = new Set(a.grid.partition().values());
        return partitions.size === 1;
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
];
const TILEDIR = [1, 3, 7, 5];
const GRIDDIR = [-0x800, -8, 0x800, 8];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxZQUFZLEVBQU8sTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUEyQixFQUFFLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV4QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSWpCLE1BQU0sT0FBTyxrQkFBa0I7SUFXN0IsWUFBcUIsQ0FBUyxFQUFXLENBQVMsRUFDN0IsSUFBWTtRQURaLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBVyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQVE7UUFWeEIsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFHdEMsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixVQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFlBQU8sR0FBRyxDQUFDLENBQUM7UUFJVixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNGO0FBRUQsTUFBTSxP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UyB9IGZyb20gJy4vZ3JpZC5qcyc7XG5pbXBvcnQgeyBzZXEsIGhleCB9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4gfSBmcm9tICcuLi9yb20vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBNZXRhbG9jYXRpb24sIFBvcyB9IGZyb20gJy4uL3JvbS9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgTWF6ZVNodWZmbGUsIEF0dGVtcHQsIFN1cnZleSwgUmVzdWx0LCBPSyB9IGZyb20gJy4uL21hemUvbWF6ZS5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgRGVmYXVsdE1hcCB9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG50eXBlIEEgPSBDYXZlU2h1ZmZsZUF0dGVtcHQ7XG5cbmV4cG9ydCBjbGFzcyBDYXZlU2h1ZmZsZUF0dGVtcHQgaW1wbGVtZW50cyBBdHRlbXB0IHtcbiAgcmVhZG9ubHkgZ3JpZDogR3JpZDxzdHJpbmc+O1xuICByZWFkb25seSBmaXhlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuXG4gIC8vIEN1cnJlbnQgc2l6ZSBhbmQgbnVtYmVyIG9mIHdhbGxzL2JyaWRnZXMuXG4gIHJpdmVycyA9IDA7XG4gIHdpZGVzID0gMDtcbiAgY291bnQgPSAwO1xuICB3YWxscyA9IDA7XG4gIGJyaWRnZXMgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGg6IG51bWJlciwgcmVhZG9ubHkgdzogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBzaXplOiBudW1iZXIpIHtcbiAgICB0aGlzLmdyaWQgPSBuZXcgR3JpZChoLCB3KTtcbiAgICB0aGlzLmdyaWQuZGF0YS5maWxsKCcnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2F2ZVNodWZmbGUgZXh0ZW5kcyBNYXplU2h1ZmZsZSB7XG5cbiAgbWF4UGFydGl0aW9ucyA9IDE7XG4gIG1pblNwaWtlcyA9IDI7XG4gIG1heFNwaWtlcyA9IDU7XG4gIGxvb3NlUmVmaW5lID0gZmFsc2U7XG4gIGFkZEJsb2NrcyA9IHRydWU7XG4gIHByaXZhdGUgX3JlcXVpcmVQaXREZXN0aW5hdGlvbiA9IGZhbHNlO1xuXG4gIHJlcXVpcmVQaXREZXN0aW5hdGlvbigpOiB0aGlzIHtcbiAgICB0aGlzLl9yZXF1aXJlUGl0RGVzdGluYXRpb24gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc2h1ZmZsZShsb2M6IExvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAvLyAgIGNvbnN0IG1ldGEgPSBsb2MubWV0YTtcbiAgLy8gICBjb25zdCBzdXJ2ZXkgPSB0aGlzLnN1cnZleShtZXRhKTtcbiAgLy8gICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IDEwMDsgYXR0ZW1wdCsrKSB7XG4gIC8vICAgICBjb25zdCB3aWR0aCA9XG4gIC8vICAgICAgICAgTWF0aC5tYXgoMSwgTWF0aC5taW4oOCwgbG9jLm1ldGEud2lkdGggK1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoKHJhbmRvbS5uZXh0SW50KDYpIC0gMSkgLyAzKSkpO1xuICAvLyAgICAgY29uc3QgaGVpZ2h0ID1cbiAgLy8gICAgICAgICBNYXRoLm1heCgxLCBNYXRoLm1pbigxNiwgbG9jLm1ldGEuaGVpZ2h0ICtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKChyYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMykpKTtcbiAgLy8gICAgIGNvbnN0IHNodWZmbGUgPSBuZXcgQ2F2ZVNodWZmbGVBdHRlbXB0KGhlaWdodCwgd2lkdGgsIHN1cnZleSwgcmFuZG9tKTtcbiAgLy8gICAgIGNvbnN0IHJlc3VsdCA9IHNodWZmbGUuYnVpbGQoKTtcbiAgLy8gICAgIGlmIChyZXN1bHQpIHtcbiAgLy8gICAgICAgaWYgKGxvYy5pZCA9PT0gMHgzMSkgY29uc29sZS5lcnJvcihgU2h1ZmZsZSBmYWlsZWQ6ICR7cmVzdWx0fWApO1xuICAvLyAgICAgfSBlbHNlIHtcbiAgLy8gICAgICAgdGhpcy5maW5pc2gobG9jLCBzaHVmZmxlLm1ldGEsIHJhbmRvbSk7XG4gIC8vICAgICAgIHJldHVybjtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKGBDb21wbGV0ZWx5IGZhaWxlZCB0byBtYXAgc2h1ZmZsZSAke2xvY31gKTtcbiAgLy8gfVxuXG4gIHN1cnZleShtZXRhOiBNZXRhbG9jYXRpb24pOiBTdXJ2ZXkge1xuICAgIC8vIHRha2UgYSBzdXJ2ZXkuXG4gICAgY29uc3Qgc3VydmV5ID0ge1xuICAgICAgbWV0YSxcbiAgICAgIGlkOiBtZXRhLmlkLFxuICAgICAgdGlsZXNldDogbWV0YS50aWxlc2V0LFxuICAgICAgc2l6ZTogMCxcbiAgICAgIGVkZ2VzOiBbMCwgMCwgMCwgMF0sXG4gICAgICBzdGFpcnM6IFswLCAwXSxcbiAgICAgIGZlYXR1cmVzOiB7XG4gICAgICAgIGFyZW5hOiAwLFxuICAgICAgICBicmlkZ2U6IDAsXG4gICAgICAgIG92ZXI6IDAsXG4gICAgICAgIHBpdDogMCxcbiAgICAgICAgcmFtcDogMCxcbiAgICAgICAgcml2ZXI6IDAsXG4gICAgICAgIHNwaWtlOiAwLFxuICAgICAgICBzdGF0dWU6IDAsXG4gICAgICAgIHVuZGVyOiAwLFxuICAgICAgICB3YWxsOiAwLFxuICAgICAgICB3aWRlOiAwLFxuICAgICAgfSxcbiAgICB9O1xuICAgIGlmIChtZXRhLmlkID49IDApIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbWV0YS5yb20ubG9jYXRpb25zW21ldGEuaWRdLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24ubW9uc3RlcklkID09PSAweDhmKSB7XG4gICAgICAgICAgc3VydmV5LmZlYXR1cmVzLnN0YXR1ZSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjci5pc0VtcHR5KCkgfHwgc2NyLmRhdGEuZXhpdHM/Lmxlbmd0aCkgc3VydmV5LnNpemUrKztcbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiBzY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICBjb25zdCB7dHlwZX0gPSBleGl0O1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJykge1xuICAgICAgICAgIGlmICgocG9zID4+PiA0KSA9PT0gMCkgc3VydmV5LmVkZ2VzWzBdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyAmIDB4ZikgPT09IDApIHN1cnZleS5lZGdlc1sxXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScpIHtcbiAgICAgICAgICBpZiAoKHBvcyA+Pj4gNCkgPT09IG1ldGEuaGVpZ2h0IC0gMSkgc3VydmV5LmVkZ2VzWzJdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6cmlnaHQnKSB7XG4gICAgICAgICAgaWYgKChwb3MgJiAweGYpID09PSBtZXRhLndpZHRoIC0gMSkgc3VydmV5LmVkZ2VzWzNdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2NyeXB0Jykge1xuICAgICAgICAgIC8vIHN0YWlyIGlzIGJ1aWx0IGludG8gYXJlbmFcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgICAvLyBkbyBub3RoaW5nLi4uXG4gICAgICAgIH0gZWxzZSBpZiAoZXhpdC5kaXIgJiAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgZXhpdCBkaXJlY3Rpb246ICR7ZXhpdC5kaXJ9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VydmV5LnN0YWlyc1tleGl0LmRpciA+Pj4gMV0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdhcmVuYScpKSBzdXJ2ZXkuZmVhdHVyZXMuYXJlbmErKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHN1cnZleS5mZWF0dXJlcy5icmlkZ2UrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnb3ZlcnBhc3MnKSkgc3VydmV5LmZlYXR1cmVzLm92ZXIrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncGl0JykpIHN1cnZleS5mZWF0dXJlcy5waXQrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncmFtcCcpKSBzdXJ2ZXkuZmVhdHVyZXMucmFtcCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkgc3VydmV5LmZlYXR1cmVzLnNwaWtlKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3VuZGVycGFzcycpKSBzdXJ2ZXkuZmVhdHVyZXMudW5kZXIrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSBzdXJ2ZXkuZmVhdHVyZXMud2FsbCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpKSBzdXJ2ZXkuZmVhdHVyZXMucml2ZXIrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2lkZScpKSBzdXJ2ZXkuZmVhdHVyZXMud2lkZSsrO1xuICAgIH1cbiAgICBpZiAoc3VydmV5LnNpemUgPCAyICYmIChtZXRhLndpZHRoID4gMSB8fCBtZXRhLmhlaWdodCA+IDEpKSBzdXJ2ZXkuc2l6ZSA9IDI7XG4gICAgcmV0dXJuIHN1cnZleTtcbiAgfVxuXG4gIGJ1aWxkKGggPSB0aGlzLnBpY2tIZWlnaHQoKSwgdyA9IHRoaXMucGlja1dpZHRoKCksXG4gICAgICAgIHNpemUgPSB0aGlzLnBpY2tTaXplKCkpOiBSZXN1bHQ8TWV0YWxvY2F0aW9uPiB7XG4gICAgdGhpcy5pbml0KCk7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIC8vY29uc3QgciA9IHRoaXMucmFuZG9tO1xuICAgIGNvbnN0IGEgPSBuZXcgQ2F2ZVNodWZmbGVBdHRlbXB0KGgsIHcsIHNpemUpO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5maWxsR3JpZChhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG5cbiAgICAvLyB0cnkgdG8gdHJhbnNsYXRlIHRvIG1ldGFzY3JlZW5zIGF0IHRoaXMgcG9pbnQuLi5cbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucHJlaW5mZXIoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLmluZmVyU2NyZWVucyhhKTtcbiAgICBpZiAoIW1ldGEub2spIHJldHVybiBtZXRhO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5yZWZpbmVNZXRhc2NyZWVucyhhLCBtZXRhLnZhbHVlKSksICFyZXN1bHQub2spIHtcbiAgICAgIC8vY29uc29sZS5lcnJvcihtZXRhLnZhbHVlLnNob3coKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuY2hlY2tNZXRhc2NyZWVucyhhLCBtZXRhLnZhbHVlKSksICFyZXN1bHQub2spIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yZXF1aXJlUGl0RGVzdGluYXRpb24gJiZcbiAgICAgICAgIXRoaXMucmVxdWlyZUVsaWdpYmxlUGl0RGVzdGluYXRpb24obWV0YS52YWx1ZSkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgbm8gZWxpZ2libGUgcGl0IGRlc3RpbmF0aW9uYH07XG4gICAgfVxuICAgIHJldHVybiBtZXRhO1xuICB9XG5cbiAgZmlsbEdyaWQoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5pbml0aWFsRmlsbChhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9pZiAoIXRoaXMuYWRkRWFybHlGZWF0dXJlcygpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZEVkZ2VzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWFybHlGZWF0dXJlcyhhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9jb25zb2xlLmxvZyhgcmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucmVmaW5lKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2NvbnNvbGUubG9nKGBwb3N0cmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoIXRoaXMucmVmaW5lRWRnZXMoYSkpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAncmVmaW5lRWRnZXMnfTtcbiAgICB0aGlzLnJlbW92ZVNwdXJzKGEpO1xuICAgIHRoaXMucmVtb3ZlVGlnaHRMb29wcyhhKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkTGF0ZUZlYXR1cmVzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkU3RhaXJzKGEsIC4uLih0aGlzLnBhcmFtcy5zdGFpcnMgPz8gW10pKSksXG4gICAgICAgICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBBdHRlbXB0IG1ldGhvZHNcblxuICBpbml0KCkge31cblxuICAvLyBJbml0aWFsIGZpbGwuXG4gIGluaXRpYWxGaWxsKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIHRoaXMuZmlsbENhdmUoYSwgJ2MnKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBmaWxsQ2F2ZShhOiBBLCBzOiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPIC0gbW92ZSB0byBNYXplU2h1ZmZsZS5maWxsP1xuICAgIGZvciAobGV0IHkgPSAwLjU7IHkgPCBhLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDAuNTsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGlmICh5ID4gMSkgYS5ncmlkLnNldDIoeSAtIDAuNSwgeCwgJ2MnKTtcbiAgICAgICAgaWYgKHggPiAxKSBhLmdyaWQuc2V0Mih5LCB4IC0gMC41LCAnYycpO1xuICAgICAgICBhLmdyaWQuc2V0Mih5LCB4LCAnYycpO1xuICAgICAgfVxuICAgIH1cbiAgICBhLmNvdW50ID0gYS5oICogYS53O1xuICB9XG5cbiAgLy8gQWRkIGVkZ2UgYW5kL29yIHN0YWlyIGV4aXRzXG4gIGFkZEVkZ2VzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vbGV0IGF0dGVtcHRzID0gMDtcbiAgICBpZiAoIXRoaXMucGFyYW1zLmVkZ2VzKSByZXR1cm4gT0s7XG4gICAgZm9yIChsZXQgZGlyID0gMDsgZGlyIDwgNDsgZGlyKyspIHtcbiAgICAgIGxldCBjb3VudCA9IHRoaXMucGFyYW1zLmVkZ2VzW2Rpcl0gfHwgMDtcbiAgICAgIGlmICghY291bnQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAgIHNlcShkaXIgJiAxID8gYS5oIDogYS53LCBpID0+IGEuZ3JpZC5ib3JkZXIoZGlyLCBpKSk7XG4gICAgICBmb3IgKGNvbnN0IGVkZ2Ugb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoZWRnZXMpKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYGVkZ2U6ICR7ZWRnZS50b1N0cmluZygxNil9IGNvdW50ICR7Y291bnR9IGRpciAke2Rpcn1gKTtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoZWRnZSkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZGlyICYgMSkge1xuICAgICAgICAgIGlmIChkaXIgPT09IDEpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZExlZnRFZGdlKGEsIGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGRSaWdodEVkZ2UoYSwgZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChkaXIgPT09IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZFVwRWRnZShhLCBlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkRG93bkVkZ2UoYSwgZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghY291bnQpIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGNvdW50KSB7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgY2FuJ3QgZml0IGFsbCBlZGdlcyBzaHVmZmxpbmcgJHt0aGlzLmxvY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxcbm1pc3NpbmcgJHtjb3VudH0gJHtkaXJ9YH07XG4gICAgICAgIC8vXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRVcEVkZ2Uoe2dyaWQsIGZpeGVkfTogQSwgZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgLy8gVXAgZWRnZXMgbXVzdCBhbHdheXMgYmUgYXJlbmEgc2NyZWVucywgc28gY3V0IG9mZiBib3RoXG4gICAgLy8gdGhlIEUtVyBlZGdlcyBBTkQgdGhlIG5laWdoYm9yaW5nIHNjcmVlbnMgYXMgd2VsbCAocHJvdmlkZWRcbiAgICAvLyB0aGVyZSBpcyBub3QgYWxzbyBhbiBleGl0IG5leHQgdG8gdGhlbSwgc2luY2UgdGhhdCB3b3VsZCBiZVxuICAgIC8vIGEgcHJvYmxlbS4gIChUaGVzZSBhcmUgcHJldHR5IGxpbWl0ZWQ6IHZhbXBpcmUgMSwgcHJpc29uLFxuICAgIC8vIHN0eHkgMSwgcHlyYW1pZCAxLCBjcnlwdCAyLCBkcmF5Z29uIDIpLlxuICAgIGNvbnN0IGJlbG93ID0gZWRnZSArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYmVsb3cgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MiA9IGxlZnQgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MyA9IGxlZnQyIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBiZWxvdyArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MiA9IHJpZ2h0ICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQzID0gcmlnaHQyICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdCkpIHtcbiAgICAgIGlmIChncmlkLmdldChsZWZ0KSkgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZ3JpZC5nZXQoZWRnZSAtIDE2IGFzIEdyaWRDb29yZCkpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChncmlkLmlzQm9yZGVyKGxlZnQzKSAmJiBncmlkLmdldChsZWZ0MykpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHQpKSB7XG4gICAgICBpZiAoZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChncmlkLmdldChlZGdlICsgMTYgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHQzKSAmJiBncmlkLmdldChyaWdodDMpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZpeGVkLmFkZChlZGdlKTtcbiAgICBncmlkLnNldChlZGdlLCAnbicpO1xuICAgIGdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICBncmlkLnNldChyaWdodCwgJycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkRG93bkVkZ2Uoe2dyaWQsIGZpeGVkfTogQSwgZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgLy8gZG93biBlZGdlcyBtdXN0IGhhdmUgc3RyYWlnaHQgTi1TIHNjcmVlbnMsIHNvIGN1dCBvZmZcbiAgICAvLyB0aGUgRS1XIGVkZ2VzIG5leHQgdG8gdGhlbS5cbiAgICBjb25zdCBhYm92ZSA9IGVkZ2UgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdCA9IGFib3ZlIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBhYm92ZSArIDggYXMgR3JpZENvb3JkO1xuICAgIGlmICghZ3JpZC5nZXQoYWJvdmUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdCkgJiYgZ3JpZC5nZXQobGVmdCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodCkgJiYgZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICduJyk7XG4gICAgZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIGdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRMZWZ0RWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBjb25zdCByaWdodCA9IGVkZ2UgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodFVwID0gcmlnaHQgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHREb3duID0gcmlnaHQgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4vL2NvbnNvbGUubG9nKGBhZGRMZWZ0ICR7aGV4KGVkZ2UpfSByaWdodCAke2hleChyaWdodCl9OiR7dGhpcy5ncmlkLmdldChyaWdodCl9IHJ1ICR7aGV4KHJpZ2h0VXApfToke3RoaXMuZ3JpZC5pc0JvcmRlcihyaWdodFVwKX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0VXApfSByZCAke2hleChyaWdodERvd24pfToke3RoaXMuZ3JpZC5pc0JvcmRlcihyaWdodERvd24pfToke3RoaXMuZ3JpZC5nZXQocmlnaHREb3duKX1gKTtcbiAgICBpZiAoIWdyaWQuZ2V0KHJpZ2h0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChncmlkLmlzQm9yZGVyKHJpZ2h0VXApICYmIGdyaWQuZ2V0KHJpZ2h0VXApKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHREb3duKSAmJiBncmlkLmdldChyaWdodERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICdjJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRSaWdodEVkZ2Uoe2dyaWQsIGZpeGVkfTogQSwgZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVmdCA9IGVkZ2UgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0VXAgPSBsZWZ0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnREb3duID0gbGVmdCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBpZiAoIWdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdFVwKSAmJiBncmlkLmdldChsZWZ0VXApKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdERvd24pICYmIGdyaWQuZ2V0KGxlZnREb3duKSkgcmV0dXJuIGZhbHNlO1xuICAgIGZpeGVkLmFkZChlZGdlKTtcbiAgICBncmlkLnNldChlZGdlLCAnYycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gYWRkQXJlbmFzRWFybHkoKTogYm9vbGVhbiB7XG4gIC8vICAgLy8gU3BlY2lmaWNhbGx5LCBqdXN0IGFyZW5hcy4uLlxuICAvLyAgIGxldCBhcmVuYXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uWydhJ107XG4gIC8vICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAvLyAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gIC8vICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuc2NyZWVucykpIHtcbiAgLy8gICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQgPSAobWlkZGxlIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDIgPSAobGVmdCAtIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQzID0gKGxlZnQyIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDJVcCA9IChsZWZ0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MkRvd24gPSAobGVmdDIgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQgPSAobWlkZGxlICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyID0gKHJpZ2h0ICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQzID0gKHJpZ2h0MiArIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MlVwID0gKHJpZ2h0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDJEb3duID0gKHJpZ2h0MiArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBpZiAoIWcuaXNCb3JkZXIobGVmdCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDMpICYmIGcuZ2V0KGxlZnQzKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKGxlZnQyVXApICYmIGcuZ2V0KGxlZnQyVXApKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJEb3duKSAmJiBnLmdldChsZWZ0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQzKSAmJiBnLmdldChyaWdodDMpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyVXApICYmIGcuZ2V0KHJpZ2h0MlVwKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKHJpZ2h0MkRvd24pICYmIGcuZ2V0KHJpZ2h0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHRoaXMuZml4ZWQuYWRkKG1pZGRsZSk7XG4gIC8vICAgICBnLnNldChtaWRkbGUsICdhJyk7XG4gIC8vICAgICBnLnNldChsZWZ0LCAnJyk7XG4gIC8vICAgICBnLnNldChsZWZ0MiwgJycpO1xuICAvLyAgICAgZy5zZXQocmlnaHQsICcnKTtcbiAgLy8gICAgIGcuc2V0KHJpZ2h0MiwgJycpO1xuICAvLyAgICAgYXJlbmFzLS07XG4gIC8vICAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBmYWxzZTtcbiAgLy8gfVxuXG4gIGFkZEVhcmx5RmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmFkZFNwaWtlcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3Bpa2UgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkIHNwaWtlcyd9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkT3ZlcnBhc3NlcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ub3ZlciA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGQgb3ZlcnBhc3Nlcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRMYXRlRmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmFkZEFyZW5hcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYXJlbmEgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkQXJlbmFzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRVbmRlcnBhc3NlcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8udW5kZXIgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkVW5kZXJwYXNzZXMnfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZFBpdHMoYSwgdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnBpdCA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRQaXRzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRSYW1wcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ucmFtcCA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRSYW1wcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRBcmVuYXMoYTogQSwgYXJlbmFzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgZyA9IGEuZ3JpZDtcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICghdGhpcy5pc0VsaWdpYmxlQXJlbmEoYSwgbWlkZGxlKSkgY29udGludWU7XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gICAgICBjb25zdCBhcmVuYVRpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArICdhJyArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcoYXJlbmFUaWxlKTtcbiAgICAgIGlmICghb3B0aW9ucy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgYS5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIGcuc2V0KG1pZGRsZSwgJ2EnKTtcbiAgICAgIC8vIGcuc2V0KGxlZnQsICcnKTtcbiAgICAgIC8vIGcuc2V0KGxlZnQyLCAnJyk7XG4gICAgICAvLyBnLnNldChyaWdodCwgJycpO1xuICAgICAgLy8gZy5zZXQocmlnaHQyLCAnJyk7XG4gICAgICBhcmVuYXMtLTtcbiAgICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmVycm9yKCdjb3VsZCBub3QgYWRkIGFyZW5hJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNFbGlnaWJsZUFyZW5hKGE6IEEsIG1pZGRsZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZyA9IGEuZ3JpZDtcbiAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MiA9IChsZWZ0IC0gOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gKG1pZGRsZSArIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKGcuZ2V0KG1pZGRsZSkgIT09ICdjJyAmJiBnLmdldChtaWRkbGUpICE9PSAndycpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZy5nZXQobGVmdCkgfHwgZy5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpICYmIGcuZ2V0KGxlZnQyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkgJiYgZy5nZXQocmlnaHQyKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkVW5kZXJwYXNzZXMoYTogQSwgdW5kZXI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIE9ubHkgYWRkIGhvcml6b250YWwgJyAgIHxjYmN8ICAgJywgbm90ICcgYyB8IGIgfCBjICcuICBDb3VsZCBwb3NzaWJseVxuICAgIC8vIHVzZSAnYicgYW5kICdCJyBpbnN0ZWFkP1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhLCB1bmRlciwgJ2InLCAweDgwMCk7XG4gIH1cblxuICBhZGRPdmVycGFzc2VzKGE6IEEsIG92ZXI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKG92ZXIpIHtcbiAgICAgIGNvbnN0IHkgPSB0aGlzLnJhbmRvbS5uZXh0SW50KGEuaCAtIDIpICsgMTtcbiAgICAgIGNvbnN0IHggPSB0aGlzLnJhbmRvbS5uZXh0SW50KGEudyAtIDIpICsgMTtcbiAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoYS5ncmlkLmdldChjKSAhPT0gJ2MnKSB7XG4gICAgICAgIGlmICgrK2F0dGVtcHRzID4gMTApIHRocm93IG5ldyBFcnJvcignQmFkIGF0dGVtcHRzJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYS5ncmlkLnNldChjLCAnYicpO1xuICAgICAgYS5maXhlZC5hZGQoYyk7XG4gICAgICBhLmdyaWQuc2V0KGMgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgYS5ncmlkLnNldChjICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgIG92ZXItLTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRQaXRzKGE6IEEsIHBpdHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhLCBwaXRzLCAncCcpO1xuICB9XG5cbiAgYWRkUmFtcHMoYTogQSwgcmFtcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhLCByYW1wcywgJy8nLCA4KTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gZGVsdGEgR3JpZENvb3JkIGRpZmZlcmVuY2UgZm9yIGVkZ2VzIHRoYXQgbmVlZCB0byBiZSBlbXB0eS4gKi9cbiAgYWRkU3RyYWlnaHRTY3JlZW5MYXRlKGE6IEEsIGNvdW50OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGRlbHRhPzogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoYS5ncmlkLmdldChtaWRkbGUpICE9PSAnYycpIGNvbnRpbnVlO1xuICAgICAgaWYgKGRlbHRhKSB7XG4gICAgICAgIGNvbnN0IHNpZGUxID0gKG1pZGRsZSAtIGRlbHRhKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IHNpZGUyID0gKG1pZGRsZSArIGRlbHRhKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KHNpZGUxKSB8fCBhLmdyaWQuZ2V0KHNpZGUyKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gICAgICBjb25zdCBuZXdUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoNSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhuZXdUaWxlKTtcbiAgICAgIGlmICghb3B0aW9ucy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgLy8gVE9ETyAtIHJldHVybiBmYWxzZSBpZiBub3Qgb24gYSBjcml0aWNhbCBwYXRoPz8/XG4gICAgICAvLyAgICAgIC0gYnV0IFBPSSBhcmVuJ3QgcGxhY2VkIHlldC5cbiAgICAgIGEuZml4ZWQuYWRkKG1pZGRsZSk7XG4gICAgICBhLmdyaWQuc2V0KG1pZGRsZSwgY2hhcik7XG4gICAgICBjb3VudC0tO1xuICAgICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vY29uc29sZS5lcnJvcignY291bGQgbm90IGFkZCByYW1wJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYWRkU3Bpa2VzKGE6IEEsIHNwaWtlczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFzcGlrZXMpIHJldHVybiB0cnVlO1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKHNwaWtlcyA+IDApIHtcbiAgICAgIGlmICgrK2F0dGVtcHRzID4gMjApIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gVE9ETyAtIHRyeSB0byBiZSBzbWFydGVyIGFib3V0IHNwaWtlc1xuICAgICAgLy8gIC0gaWYgdG90YWwgPiAyIHRoZW4gdXNlIG1pbih0b3RhbCwgaCouNiwgPz8pIGFzIGxlblxuICAgICAgLy8gIC0gaWYgbGVuID4gMiBhbmQgdyA+IDMsIGF2b2lkIHB1dHRpbmcgc3Bpa2VzIG9uIGVkZ2U/XG4gICAgICBsZXQgbGVuID0gTWF0aC5taW4oc3Bpa2VzLCBNYXRoLmZsb29yKGEuaCAqIDAuNiksIHRoaXMubWF4U3Bpa2VzKTtcbiAgICAgIHdoaWxlIChsZW4gPCBzcGlrZXMgLSAxICYmIGxlbiA+IHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0KCkgPCAwLjIpIGxlbi0tO1xuICAgICAgfVxuICAgICAgLy9pZiAobGVuID09PSBzcGlrZXMgLSAxKSBsZW4rKztcbiAgICAgIGNvbnN0IHggPVxuICAgICAgICAgIChsZW4gPiAyICYmIGEudyA+IDMpID8gdGhpcy5yYW5kb20ubmV4dEludChhLncgLSAyKSArIDEgOlxuICAgICAgICAgIHRoaXMucmFuZG9tLm5leHRJbnQoYS53KTtcbiAgICAgIC8vIGNvbnN0IHIgPVxuICAgICAgLy8gICAgIHRoaXMucmFuZG9tLm5leHRJbnQoTWF0aC5taW4odGhpcy5oIC0gMiwgc3Bpa2VzKSAtIHRoaXMubWluU3Bpa2VzKTtcbiAgICAgIC8vIGxldCBsZW4gPSB0aGlzLm1pblNwaWtlcyArIHI7XG4gICAgICBpZiAobGVuID4gc3Bpa2VzIC0gdGhpcy5taW5TcGlrZXMpIHtcbiAgICAgICAgaWYgKGxlbiA+PSBhLmggLSAyKSB7IC8vICYmIGxlbiA+IHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgICAgbGVuID0gYS5oIC0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZW4gPSBzcGlrZXM7IC8vID8/PyBpcyB0aGlzIGV2ZW4gdmFsaWQgPz8/XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHkwID0gdGhpcy5yYW5kb20ubmV4dEludChhLmggLSBsZW4gLSAyKSArIDE7XG4gICAgICBjb25zdCB0MCA9IHkwIDw8IDEyIHwgeCA8PCA0IHwgMHg4MDg7XG4gICAgICBjb25zdCB0MSA9IHQwICsgKChsZW4gLSAxKSA8PCAxMik7XG4gICAgICBmb3IgKGxldCB0ID0gdDAgLSAweDEwMDA7IGxlbiAmJiB0IDw9IHQxICsgMHgxMDAwOyB0ICs9IDB4ODAwKSB7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KHQgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSBsZW4gPSAwO1xuICAgICAgfVxuICAgICAgaWYgKCFsZW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2xlYXJlZCA9IFt0MCAtIDgsIHQwICsgOCwgdDEgLSA4LCB0MSArIDhdIGFzIEdyaWRDb29yZFtdO1xuICAgICAgY29uc3Qgb3JwaGFuZWQgPSB0aGlzLnRyeUNsZWFyKGEsIGNsZWFyZWQpO1xuICAgICAgaWYgKCFvcnBoYW5lZC5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjIG9mIG9ycGhhbmVkKSB7XG4gICAgICAgIGEuZ3JpZC5zZXQoYywgJycpO1xuICAgICAgfVxuICAgICAgYS5maXhlZC5hZGQoKHQwIC0gMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBhLmZpeGVkLmFkZCgodDAgLSAweDEwMDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBhLmZpeGVkLmFkZCgodDEgKyAweDgwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIGEuZml4ZWQuYWRkKCh0MSArIDB4MTAwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIGZvciAobGV0IHQgPSB0MDsgdCA8PSB0MTsgdCArPSAweDgwMCkge1xuICAgICAgICBhLmZpeGVkLmFkZCh0IGFzIEdyaWRDb29yZCk7XG4gICAgICAgIGEuZ3JpZC5zZXQodCBhcyBHcmlkQ29vcmQsICdzJyk7XG4gICAgICB9XG4gICAgICBzcGlrZXMgLT0gbGVuO1xuICAgICAgYXR0ZW1wdHMgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3Bpa2VzID09PSAwO1xuICB9XG5cbiAgY2FuUmVtb3ZlKGM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIE5vdGFibHksIGV4Y2x1ZGUgc3RhaXJzLCBuYXJyb3cgZWRnZXMsIGFyZW5hcywgZXRjLlxuICAgIHJldHVybiBjID09PSAnYyc7XG4gIH1cblxuICAvKipcbiAgICogRG9lcyBhIHRyYXZlcnNhbCB3aXRoIHRoZSBnaXZlbiBjb29yZGluYXRlKHMpIGNsZWFyZWQsIGFuZCByZXR1cm5zXG4gICAqIGFuIGFycmF5IG9mIGNvb3JkaW5hdGVzIHRoYXQgd291bGQgYmUgY3V0IG9mZiAoaW5jbHVkaW5nIHRoZSBjbGVhcmVkXG4gICAqIGNvb3JkaW5hdGVzKS4gIElmIGNsZWFyaW5nIHdvdWxkIGNyZWF0ZSBtb3JlIHRoYW4gdGhlIGFsbG93ZWQgbnVtYmVyXG4gICAqIG9mIHBhcnRpdGlvbnMgKHVzdWFsbHkgMSksIHRoZW4gcmV0dXJucyBhbiBlbXB0eSBhcnJheSB0byBzaWduaWZ5XG4gICAqIHRoYXQgdGhlIGNsZWFyIGlzIG5vdCBhbGxvd2VkLlxuICAgKi9cbiAgdHJ5Q2xlYXIoYTogQSwgY29vcmRzOiBHcmlkQ29vcmRbXSk6IEdyaWRDb29yZFtdIHtcbiAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgY29vcmRzKSB7XG4gICAgICBpZiAoYS5maXhlZC5oYXMoYykpIHJldHVybiBbXTtcbiAgICAgIHJlcGxhY2Uuc2V0KGMsICcnKTtcbiAgICB9XG4gICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKHJlcGxhY2UpO1xuICAgIC8vIENoZWNrIHNpbXBsZSBjYXNlIGZpcnN0IC0gb25seSBvbmUgcGFydGl0aW9uXG4gICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgcmV0dXJuIFsuLi5jb29yZHNdO1xuICAgIH1cbiAgICAvLyBNb3JlIGNvbXBsZXggY2FzZSAtIG5lZWQgdG8gc2VlIHdoYXQgd2UgYWN0dWFsbHkgaGF2ZSxcbiAgICAvLyBzZWUgaWYgYW55dGhpbmcgZ290IGN1dCBvZmYuXG4gICAgY29uc3QgY29ubmVjdGVkID0gbmV3IFNldDxTZXQ8R3JpZENvb3JkPj4oKTtcbiAgICBjb25zdCBhbGxQYXJ0cyA9IG5ldyBTZXQ8U2V0PEdyaWRDb29yZD4+KHBhcnRzLnZhbHVlcygpKTtcbiAgICBmb3IgKGNvbnN0IGZpeGVkIG9mIGEuZml4ZWQpIHtcbiAgICAgIGNvbm5lY3RlZC5hZGQocGFydHMuZ2V0KGZpeGVkKSEpO1xuICAgIH1cbiAgICBpZiAoY29ubmVjdGVkLnNpemUgPiB0aGlzLm1heFBhcnRpdGlvbnMpIHJldHVybiBbXTsgLy8gbm8gZ29vZFxuICAgIGNvbnN0IG9ycGhhbmVkID0gWy4uLmNvb3Jkc107XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIGFsbFBhcnRzKSB7XG4gICAgICBpZiAoY29ubmVjdGVkLmhhcyhwYXJ0KSkgY29udGludWU7XG4gICAgICBvcnBoYW5lZC5wdXNoKC4uLnBhcnQpO1xuICAgIH1cbiAgICByZXR1cm4gb3JwaGFuZWQ7XG4gIH1cblxuICByZWZpbmUoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IGZpbGxlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEdyaWRJbmRleDsgaSA8IGEuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYS5ncmlkLmRhdGFbaV0pIGZpbGxlZC5hZGQoYS5ncmlkLmNvb3JkKGkpKTtcbiAgICB9XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICB3aGlsZSAoYS5jb3VudCA+IGEuc2l6ZSkge1xuICAgICAgaWYgKGF0dGVtcHRzKysgPiA1MCkgdGhyb3cgbmV3IEVycm9yKGByZWZpbmUgZmFpbGVkOiBhdHRlbXB0c2ApO1xuICAgICAgLy9jb25zb2xlLmxvZyhgbWFpbjogJHt0aGlzLmNvdW50fSA+ICR7YS5zaXplfWApO1xuICAgICAgbGV0IHJlbW92ZWQgPSAwO1xuLy9pZih0aGlzLnBhcmFtcy5pZD09PTQpe2RlYnVnZ2VyO1suLi50aGlzLnJhbmRvbS5pc2h1ZmZsZShmaWxsZWQpXTt9XG4gICAgICBmb3IgKGNvbnN0IGNvb3JkIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFsuLi5maWxsZWRdKSkge1xuICAgICAgICBpZiAoYS5ncmlkLmlzQm9yZGVyKGNvb3JkKSB8fFxuICAgICAgICAgICAgIXRoaXMuY2FuUmVtb3ZlKGEuZ3JpZC5nZXQoY29vcmQpKSB8fFxuICAgICAgICAgICAgYS5maXhlZC5oYXMoY29vcmQpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZWQgPiAzKSBicmVhaztcblxuICAgICAgICBjb25zdCBwYXJ0cyA9IGEuZ3JpZC5wYXJ0aXRpb24odGhpcy5yZW1vdmFsTWFwKGEsIGNvb3JkKSk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYCAgY29vcmQ6ICR7Y29vcmQudG9TdHJpbmcoMTYpfSA9PiAke3BhcnRzLnNpemV9YCk7XG4gICAgICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICAgICAgaWYgKGZpcnN0LnNpemUgPT09IHBhcnRzLnNpemUgJiYgcGFydHMuc2l6ZSA+IDEpIHsgLy8gYSBzaW5nbGUgcGFydGl0aW9uXG4gICAgICAgICAgLy8gb2sgdG8gcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlZCsrO1xuICAgICAgICAgIGZpbGxlZC5kZWxldGUoY29vcmQpO1xuICAgICAgICAgIGlmICgoY29vcmQgJiAweDgwOCkgPT09IDB4ODA4KSBhLmNvdW50LS07XG4gICAgICAgICAgYS5ncmlkLnNldChjb29yZCwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGZpbmQgdGhlIGJpZ2dlc3QgcGFydGl0aW9uLlxuICAgICAgICAgIGxldCBwYXJ0ITogU2V0PEdyaWRDb29yZD47XG4gICAgICAgICAgZm9yIChjb25zdCBzZXQgb2YgcGFydHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmICghcGFydCB8fCBzZXQuc2l6ZSA+IHBhcnQuc2l6ZSkgcGFydCA9IHNldDtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIGFsbCB0aGUgZml4ZWQgc2NyZWVucyBhcmUgaW4gaXQuXG4gICAgICAgICAgaWYgKCFbLi4uYS5maXhlZF0uZXZlcnkoYyA9PiBwYXJ0LmhhcyhjKSkpIGNvbnRpbnVlO1xuICAgICAgICAgIC8vIGNoZWNrIHRoYXQgaXQncyBiaWcgZW5vdWdoLlxuICAgICAgICAgIGNvbnN0IGNvdW50ID0gWy4uLnBhcnRdLmZpbHRlcihjID0+IChjICYgMHg4MDgpID09IDB4ODA4KS5sZW5ndGg7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhgcGFydDogJHtbLi4ucGFydF0ubWFwKHg9PngudG9TdHJpbmcoMTYpKS5qb2luKCcsJyl9IGNvdW50PSR7Y291bnR9YCk7XG4gICAgICAgICAgaWYgKGNvdW50IDwgYS5zaXplKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBvayB0byByZW1vdmVcbiAgICAgICAgICByZW1vdmVkKys7XG4gICAgICAgICAgZmlsbGVkID0gcGFydDtcbiAgICAgICAgICBhLmNvdW50ID0gY291bnQ7XG4gICAgICAgICAgYS5ncmlkLnNldChjb29yZCwgJycpO1xuICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHBhcnRzKSB7XG4gICAgICAgICAgICBpZiAodiAhPT0gcGFydCkgYS5ncmlkLnNldChrLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXJlbW92ZWQpIHtcbiAgICAgICAgaWYgKHRoaXMubG9vc2VSZWZpbmUpIHJldHVybiBPSztcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGByZWZpbmUgJHthLmNvdW50fSA+ICR7YS5zaXplfWB9O1xuICAgICAgICAvL1xcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcmVtb3ZhbE1hcChhOiBBLCBjb29yZDogR3JpZENvb3JkKTogTWFwPEdyaWRDb29yZCwgc3RyaW5nPiB7XG4gICAgcmV0dXJuIG5ldyBNYXAoW1tjb29yZCwgJyddXSk7XG4gIH1cblxuICAvKiogUmVtb3ZlIG9ubHkgZWRnZXMuIENhbGxlZCBhZnRlciByZWZpbmUoKS4gKi9cbiAgcmVmaW5lRWRnZXMoYTogQSk6IGJvb2xlYW4ge1xuICAgIGxldCBlZGdlczogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCBhLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFhLmdyaWQuZGF0YVtpXSkgY29udGludWU7XG4gICAgICBjb25zdCBjb29yZCA9IGEuZ3JpZC5jb29yZChpKTtcbiAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoY29vcmQpIHx8IGEuZml4ZWQuaGFzKGNvb3JkKSkgY29udGludWU7XG4gICAgICAvLyBPbmx5IGFkZCBlZGdlcy5cbiAgICAgIGlmICgoY29vcmQgXiAoY29vcmQgPj4gOCkpICYgOCkgZWRnZXMucHVzaChjb29yZCk7XG4gICAgfVxuICAgIHRoaXMucmFuZG9tLnNodWZmbGUoZWRnZXMpO1xuICAgIGNvbnN0IG9yaWcgPSBhLmdyaWQucGFydGl0aW9uKG5ldyBNYXAoKSk7XG4gICAgbGV0IHNpemUgPSBvcmlnLnNpemU7XG4gICAgY29uc3QgcGFydENvdW50ID0gbmV3IFNldChvcmlnLnZhbHVlcygpKS5zaXplO1xuICAgIGZvciAoY29uc3QgZSBvZiBlZGdlcykge1xuICAgICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKG5ldyBNYXAoW1tlLCAnJ11dKSk7XG4gICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgICAgY29uc3Qgb2sgPSBmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplID9cbiAgICAgICAgICAvLyBhIHNpbmdsZSBwYXJ0aXRpb24gLSBtYWtlIHN1cmUgd2UgZGlkbid0IGxvc2UgYW55dGhpbmcgZWxzZS5cbiAgICAgICAgICBwYXJ0cy5zaXplID09PSBzaXplIC0gMSA6XG4gICAgICAgICAgLy8gcmVxdWlyZSBubyBuZXcgcGFydGl0aW9uc1xuICAgICAgICAgIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHBhcnRDb3VudCAmJiBwYXJ0cy5zaXplID09PSBzaXplIC0gMTtcbiAgICAgIGlmIChvaykge1xuICAgICAgICBzaXplLS07XG4gICAgICAgIGEuZ3JpZC5zZXQoZSwgJycpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBjYW4ndCBoYW5kbGUgYSB0aWxlICcgYyB8YyAgfCAgICcgc28gZ2V0IHJpZCBvZiBvbmUgb3IgdGhlXG4gICAqIG90aGVyIG9mIHRoZSBlZGdlcy4gIExlYXZlIHRpbGVzIG9mIHRoZSBmb3JtICcgYyB8ICAgfCBjICcgc2luY2VcbiAgICogdGhhdCB3b3JrcyBmaW5lLiAgVE9ETyAtIGhvdyB0byBwcmVzZXJ2ZSAnID4gfCAgIHwgPCAnP1xuICAgKi9cbiAgcmVtb3ZlU3B1cnMoYTogQSkge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgYS5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53OyB4KyspIHtcbiAgICAgICAgY29uc3QgYyA9ICh5IDw8IDEyIHwgMHg4MDggfCB4IDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCB1cCA9IChjIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgZG93biA9IChjICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgbGVmdCA9IChjIC0gMHg4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gKGMgKyAweDgpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKChhLmdyaWQuZ2V0KHVwKSB8fCBhLmdyaWQuZ2V0KGRvd24pKSAmJlxuICAgICAgICAgICAgKGEuZ3JpZC5nZXQobGVmdCkgfHwgYS5ncmlkLmdldChyaWdodCkpKSB7XG4gICAgICAgICAgaWYgKHRoaXMucmFuZG9tLm5leHRJbnQoMikpIHtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQodXAsICcnKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQoZG93biwgJycpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVtb3ZlICR7eX0gJHt4fTpcXG4ke3RoaXMuZ3JpZC5zaG93KCl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW1vdmVUaWdodExvb3BzKGE6IEEpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaCAtIDE7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0geSA8PCAxMiB8IDB4ODAwO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBhLncgLSAxOyB4KyspIHtcbiAgICAgICAgY29uc3QgY29vcmQgPSAocm93IHwgKHggPDwgNCkgfCA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmlzVGlnaHRMb29wKGEsIGNvb3JkKSkgdGhpcy5icmVha1RpZ2h0TG9vcChhLCBjb29yZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXNUaWdodExvb3Aoe2dyaWR9OiBBLCBjb29yZDogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgZHkgPSAwOyBkeSA8IDB4MTgwMDsgZHkgKz0gMHg4MDApIHtcbiAgICAgIGZvciAobGV0IGR4ID0gMDsgZHggPCAweDE4OyBkeCArPSA4KSB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gZHkgfCBkeFxuICAgICAgICBpZiAoZGVsdGEgPT09IDB4ODA4KSBjb250aW51ZTtcbiAgICAgICAgaWYgKGdyaWQuZ2V0KChjb29yZCArIGRlbHRhKSBhcyBHcmlkQ29vcmQpICE9PSAnYycpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBicmVha1RpZ2h0TG9vcChhOiBBLCBjb29yZDogR3JpZENvb3JkKSB7XG4gICAgLy8gUGljayBhIGRlbHRhIC0gZWl0aGVyIDgsIDEwMDgsIDgwMCwgODEwXG4gICAgY29uc3QgciA9IHRoaXMucmFuZG9tLm5leHRJbnQoMHgxMDAwMCk7XG4gICAgY29uc3QgZGVsdGEgPSByICYgMSA/IChyICYgMHgxMDAwKSB8IDggOiAociAmIDB4MTApIHwgMHg4MDA7XG4gICAgYS5ncmlkLnNldCgoY29vcmQgKyBkZWx0YSkgYXMgR3JpZENvb3JkLCAnJyk7XG4gIH1cblxuICBhZGRTdGFpcnMoYTogQSwgdXAgPSAwLCBkb3duID0gMCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gRmluZCBzcG90cyB3aGVyZSB3ZSBjYW4gYWRkIHN0YWlyc1xuLy9pZih0aGlzLnBhcmFtcy5pZD09PTUpZGVidWdnZXI7XG4gICAgY29uc3Qgc3RhaXJzID0gW3VwLCBkb3duXTtcbiAgICBpZiAoIXN0YWlyc1swXSAmJiAhc3RhaXJzWzFdKSByZXR1cm4gT0s7IC8vIG5vIHN0YWlyc1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgaWYgKCF0aGlzLnRyeUFkZFN0YWlyKGEsIGMsIHN0YWlycykpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzdGFpcnNbMF0gJiYgIXN0YWlyc1sxXSkgcmV0dXJuIE9LOyAvLyBubyBzdGFpcnNcbiAgICB9XG4gICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBzdGFpcnNgfTsgLy9cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gIH1cblxuICBhZGRFYXJseVN0YWlyKGE6IEEsIGM6IEdyaWRDb29yZCwgc3RhaXI6IHN0cmluZyk6IEFycmF5PFtHcmlkQ29vcmQsIHN0cmluZ10+IHtcbiAgICBjb25zdCBtb2RzOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPiA9IFtdO1xuICAgIGNvbnN0IGxlZnQgPSBjIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBjICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgdXAgPSBjIC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGRvd24gPSBjICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGxldCBuZWlnaGJvcnMgPSBbYyAtIDgsIGMgKyA4XSBhcyBHcmlkQ29vcmRbXTtcbiAgICBpZiAoc3RhaXIgPT09ICc8Jykge1xuICAgICAgbmVpZ2hib3JzLnB1c2goZG93bik7XG4gICAgICBtb2RzLnB1c2goW3VwLCAnJ10pO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQobGVmdCkgPT09ICdjJyAmJiBhLmdyaWQuZ2V0KHJpZ2h0KSA9PT0gJ2MnICYmXG4gICAgICAgICAgdGhpcy5yYW5kb20ubmV4dEludCgzKSkge1xuICAgICAgICBtb2RzLnB1c2goW2Rvd24sICcnXSwgW2MsICc8J10pO1xuICAgICAgICByZXR1cm4gbW9kcztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0YWlyID09PSAnPicpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKHVwKTtcbiAgICAgIG1vZHMucHVzaChbZG93biwgJyddKTtcbiAgICB9XG4gICAgLy8gTk9URTogaWYgd2UgZGVsZXRlIHRoZW4gd2UgZm9yZ2V0IHRvIHplcm8gaXQgb3V0Li4uXG4gICAgLy8gQnV0IGl0IHdvdWxkIHN0aWxsIGJlIG5pY2UgdG8gXCJwb2ludFwiIHRoZW0gaW4gdGhlIGVhc3kgZGlyZWN0aW9uP1xuICAgIC8vIGlmICh0aGlzLmRlbHRhIDwgLTE2KSBuZWlnaGJvcnMuc3BsaWNlKDIsIDEpO1xuICAgIC8vIGlmICgodGhpcy5kZWx0YSAmIDB4ZikgPCA4KSBuZWlnaGJvcnMuc3BsaWNlKDEsIDEpO1xuICAgIG5laWdoYm9ycyA9IG5laWdoYm9ycy5maWx0ZXIoYyA9PiBhLmdyaWQuZ2V0KGMpID09PSAnYycpO1xuICAgIGlmICghbmVpZ2hib3JzLmxlbmd0aCkgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGtlZXAgPSB0aGlzLnJhbmRvbS5uZXh0SW50KG5laWdoYm9ycy5sZW5ndGgpO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgbmVpZ2hib3JzLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAoaiAhPT0ga2VlcCkgbW9kcy5wdXNoKFtuZWlnaGJvcnNbal0sICcnXSk7XG4gICAgfVxuICAgIG1vZHMucHVzaChbYywgc3RhaXJdKTtcbiAgICByZXR1cm4gbW9kcztcbiAgfVxuXG4gIHRyeUFkZFN0YWlyKGE6IEEsIGM6IEdyaWRDb29yZCwgc3RhaXJzOiBudW1iZXJbXSk6IGJvb2xlYW4ge1xuICAgIGlmIChhLmZpeGVkLmhhcygoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgIGNvbnN0IGJvdGggPSBzdGFpcnNbMF0gJiYgc3RhaXJzWzFdO1xuICAgIGNvbnN0IHRvdGFsID0gc3RhaXJzWzBdICsgc3RhaXJzWzFdO1xuICAgIGNvbnN0IHVwID0gdGhpcy5yYW5kb20ubmV4dEludCh0b3RhbCkgPCBzdGFpcnNbMF07XG4gICAgY29uc3QgY2FuZGlkYXRlcyA9IFt1cCA/IDAgOiAxXTtcbiAgICBpZiAoYm90aCkgY2FuZGlkYXRlcy5wdXNoKHVwID8gMSA6IDApO1xuICAgIGZvciAoY29uc3Qgc3RhaXIgb2YgY2FuZGlkYXRlcykge1xuICAgICAgY29uc3Qgc3RhaXJDaGFyID0gJzw+J1tzdGFpcl07XG4gICAgICBjb25zdCBzdGFpclRpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArIHN0YWlyQ2hhciArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcoc3RhaXJUaWxlKS5sZW5ndGgpIHtcbiAgICAgICAgYS5ncmlkLnNldCgoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQsIHN0YWlyQ2hhcik7XG4gICAgICAgIHN0YWlyc1tzdGFpcl0tLTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIG1ha2UgYSBwYXRoIGNvbm5lY3Rpbmcgc3RhcnQgdG8gZW5kIChib3RoIGNlbnRlcnMpLlxuICAgKiBSZXF1aXJlcyBhbGwgLi4uP1xuICAgKi9cbiAgdHJ5Q29ubmVjdChhOiBBLCBzdGFydDogR3JpZENvb3JkLCBlbmQ6IEdyaWRDb29yZCxcbiAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGF0dGVtcHRzID0gMSk6IGJvb2xlYW4ge1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgICBsZXQgcG9zID0gc3RhcnQ7XG4gICAgICBpZiAoKHN0YXJ0ICYgZW5kICYgMHg4MDgpICE9PSAweDgwOCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGJhZCBzdGFydCAke2hleChzdGFydCl9IG9yIGVuZCAke2hleChlbmQpfWApO1xuICAgICAgfVxuICAgICAgcmVwbGFjZS5zZXQocG9zLCBjaGFyKTtcbiAgICAgIHdoaWxlIChwb3MgIT09IGVuZCkge1xuICAgICAgICAvLyBvbiBhIGNlbnRlciAtIGZpbmQgZWxpZ2libGUgZGlyZWN0aW9uc1xuICAgICAgICBjb25zdCBkaXJzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBbOCwgLTgsIDB4ODAwLCAtMHg4MDBdKSB7XG4gICAgICAgICAgY29uc3QgcG9zMSA9IHBvcyArIGRpciBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgcG9zMiA9IHBvcyArIDIgKiBkaXIgYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmIChhLmZpeGVkLmhhcyhwb3MyKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHJlcGxhY2UuZ2V0KHBvczIpID8/IGEuZ3JpZC5nZXQocG9zMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIocG9zMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGlycy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBjb25zdCBkeSA9IChlbmQgPj4gMTIpIC0gKHBvcyA+PiAxMilcbiAgICAgICAgY29uc3QgZHggPSAoZW5kICYgMHhmMCkgLSAocG9zICYgMHhmMCk7XG4gICAgICAgIGNvbnN0IHByZWZlcnJlZCA9IG5ldyBTZXQ8bnVtYmVyPihkaXJzKTtcbiAgICAgICAgaWYgKGR5IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSgweDgwMCk7XG4gICAgICAgIGlmIChkeSA+IDApIHByZWZlcnJlZC5kZWxldGUoLTB4ODAwKTtcbiAgICAgICAgaWYgKGR4IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSg4KTtcbiAgICAgICAgaWYgKGR4ID4gMCkgcHJlZmVycmVkLmRlbGV0ZSgtOCk7XG4gICAgICAgIC8vIDM6MSBiaWFzIGZvciBwcmVmZXJyZWQgZGlyZWN0aW9ucyAgKFRPRE8gLSBiYWNrdHJhY2tpbmc/KVxuICAgICAgICBkaXJzLnB1c2goLi4ucHJlZmVycmVkLCAuLi5wcmVmZXJyZWQpO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLnJhbmRvbS5waWNrKGRpcnMpO1xuICAgICAgICByZXBsYWNlLnNldChwb3MgKyBkaXIgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgICAgICAgcmVwbGFjZS5zZXQocG9zID0gcG9zICsgMiAqIGRpciBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAgICAgfVxuICAgICAgaWYgKHBvcyAhPT0gZW5kKSBjb250aW51ZTtcbiAgICAgIC8vIElmIHdlIGdvdCB0aGVyZSwgbWFrZSB0aGUgY2hhbmdlcy5cbiAgICAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHJlcGxhY2UpIHtcbiAgICAgICAgYS5ncmlkLnNldChjLCB2KTtcbiAgICAgICAgaWYgKChjICYgMHg4MDgpID09PSAweDgwOCkgYS5jb3VudCsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRyeUFkZExvb3AoYTogQSwgY2hhcjogc3RyaW5nLCBhdHRlbXB0cyA9IDEpOiBib29sZWFuIHtcbiAgICAvLyBwaWNrIGEgcGFpciBvZiBjb29yZHMgZm9yIHN0YXJ0IGFuZCBlbmRcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSBhLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQoYykgfHwgYS5ncmlkLmlzQm9yZGVyKGMpKSBjb250aW51ZTtcbiAgICAgIGlmICghYS5ncmlkLmdldChFKGMpKSkgdWYudW5pb24oW2MsIEUoYyldKTtcbiAgICAgIGlmICghYS5ncmlkLmdldChTKGMpKSkgdWYudW5pb24oW2MsIFMoYyldKTtcbiAgICB9XG4gICAgY29uc3QgZWxpZ2libGUgPVxuICAgICAgICBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBbR3JpZENvb3JkLCBHcmlkQ29vcmRdW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYS5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgYyA9IHMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoIWEuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBkIG9mIFs4LCAtOCwgMHg4MDAsIC0weDgwMF0pIHtcbiAgICAgICAgY29uc3QgZTEgPSBjICsgZCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoZTEpIHx8IGEuZ3JpZC5nZXQoZTEpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZTIgPSBjICsgMiAqIGQgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoYS5ncmlkLmdldChlMikpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcChbW2UxIGFzIEdyaWRDb29yZCwgY2hhcl1dKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIHMsIHtyZXBsYWNlfSk7XG4gICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgIGVsaWdpYmxlLmdldCh1Zi5maW5kKGUyKSkucHVzaChbZTEsIGUyXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgd2VpZ2h0ZWRNYXAgPSBuZXcgTWFwPEdyaWRDb29yZCwgW0dyaWRDb29yZCwgR3JpZENvb3JkXVtdPigpO1xuICAgIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIGVsaWdpYmxlLnZhbHVlcygpKSB7XG4gICAgICBpZiAocGFydGl0aW9uLmxlbmd0aCA8IDIpIGNvbnRpbnVlOyAvLyBUT0RPIC0gMyBvciA0P1xuICAgICAgZm9yIChjb25zdCBbZTFdIG9mIHBhcnRpdGlvbikge1xuICAgICAgICB3ZWlnaHRlZE1hcC5zZXQoZTEsIHBhcnRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHdlaWdodGVkID0gWy4uLndlaWdodGVkTWFwLnZhbHVlcygpXTtcbiAgICBpZiAoIXdlaWdodGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcGFydGl0aW9uID0gdGhpcy5yYW5kb20ucGljayh3ZWlnaHRlZCk7XG4gICAgICBjb25zdCBbW2UwLCBjMF0sIFtlMSwgYzFdXSA9IHRoaXMucmFuZG9tLmlzaHVmZmxlKHBhcnRpdGlvbik7XG4gICAgICBhLmdyaWQuc2V0KGUwLCBjaGFyKTtcbiAgICAgIGEuZ3JpZC5zZXQoZTEsIGNoYXIpO1xuICAgICAgaWYgKHRoaXMudHJ5Q29ubmVjdChhLCBjMCwgYzEsIGNoYXIsIDUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgYS5ncmlkLnNldChlMCwgJycpO1xuICAgICAgYS5ncmlkLnNldChlMSwgJycpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBleHRlbmQgYW4gZXhpc3Rpbmcgc2NyZWVuIGludG8gYSBkaXJlY3Rpb24gdGhhdCdzXG4gICAqIGN1cnJlbnRseSBlbXB0eS4gIExlbmd0aCBpcyBwcm9iYWJpbGlzdGljLCBlYWNoIHN1Y2Nlc3NmdWxcbiAgICogYXR0ZW1wdCB3aWxsIGhhdmUgYSAxL2xlbmd0aCBjaGFuY2Ugb2Ygc3RvcHBpbmcuICBSZXR1cm5zIG51bWJlclxuICAgKiBvZiBzY3JlZW5zIGFkZGVkLlxuICAgKi9cbiAgdHJ5RXh0cnVkZShhOiBBLCBjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLCBhdHRlbXB0cyA9IDEpOiBudW1iZXIge1xuICAgIC8vIExvb2sgZm9yIGEgcGxhY2UgdG8gc3RhcnQuXG4gICAgd2hpbGUgKGF0dGVtcHRzLS0pIHtcbiAgICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgICBjb25zdCBtaWQgPSBjICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoIWEuZ3JpZC5nZXQobWlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKTtcbiAgICAgICAgZm9yIChsZXQgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgICAgICBjb25zdCBuMSA9IG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgbjIgPSBtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYG1pZDogJHttaWQudG9TdHJpbmcoMTYpfTsgbjEoJHtuMS50b1N0cmluZygxNil9KTogJHthLmdyaWQuZ2V0KG4xKX07IG4yKCR7bjIudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChuMil9YCk7XG4gICAgICAgICAgaWYgKGEuZ3JpZC5nZXQobjEpIHx8IGEuZ3JpZC5pc0JvcmRlcihuMSkgfHwgYS5ncmlkLmdldChuMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShhLCBjaGFyLCBsZW5ndGgsIG4yKTtcbiAgICAgICAgICAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMiwgJycpO1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMSwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBSZWN1cnNpdmUgYXR0ZW1wdC4gKi9cbiAgdHJ5Q29udGludWVFeHRydWRlKGE6IEEsIGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGM6IEdyaWRDb29yZCk6IG51bWJlciB7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgIGNvbnN0IG9rID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKS5sZW5ndGggPiAwO1xuICAgIGlmIChsZW5ndGggPT09IDEpIHJldHVybiBvayA/IDEgOiAwO1xuICAgIC8vIG1heWJlIHJldHVybiBlYXJseVxuICAgIGlmIChvayAmJiAhdGhpcy5yYW5kb20ubmV4dEludChsZW5ndGgpKSByZXR1cm4gMTtcbiAgICAvLyBmaW5kIGEgbmV3IGRpcmVjdGlvblxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgIGNvbnN0IG4xID0gYyArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBuMiA9IGMgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KG4xKSB8fCBhLmdyaWQuaXNCb3JkZXIobjEpIHx8IGEuZ3JpZC5nZXQobjIpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICBhLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgYS5ncmlkLnNldChuMiwgY2hhcik7XG4gICAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoYSwgY2hhciwgbGVuZ3RoIC0gMSwgbjIpO1xuICAgICAgICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZCArIDE7XG4gICAgICAgIGEuZ3JpZC5zZXQobjIsICcnKTtcbiAgICAgICAgYS5ncmlkLnNldChuMSwgJycpO1xuICAgICAgfVxuICAgICAgaWYgKG9rKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIG9rID8gMSA6IDA7XG4gIH1cblxuICAvKiogQXR0ZW1wdCB0byBhZGQgYSBncmlkIHR5cGUuICovXG4gIHRyeUFkZChhOiBBLCBvcHRzOiBBZGRPcHRzID0ge30pOiBudW1iZXIge1xuICAgIC8vIE9wdGlvbmFsbHkgc3RhcnQgYXQgdGhlIGdpdmVuIHNjcmVlbiBvbmx5LlxuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLm9yaWcudGlsZXNldDtcbiAgICBjb25zdCB7YXR0ZW1wdHMgPSAxLCBjaGFyID0gJ2MnLCBzdGFydCwgbG9vcCA9IGZhbHNlfSA9IG9wdHM7XG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBhdHRlbXB0czsgYXR0ZW1wdCsrKSB7XG4gICAgICBjb25zdCBzdGFydEl0ZXIgPVxuICAgICAgICAgIHN0YXJ0ICE9IG51bGwgP1xuICAgICAgICAgICAgICBbKHN0YXJ0ICYgMHhmMGYwKSBhcyBHcmlkQ29vcmRdIDpcbiAgICAgICAgICAgICAgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSk7XG4gICAgICBmb3IgKGNvbnN0IGMgb2Ygc3RhcnRJdGVyKSB7XG4gICAgICAgIGNvbnN0IG1pZCA9IGMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICghYS5ncmlkLmdldChtaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgICAgICBmb3IgKGxldCBkaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAgICAgICAgIGNvbnN0IG4xID0gbWlkICsgR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBjb25zdCBuMiA9IG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmIChhLmZpeGVkLmhhcyhuMSkgfHwgYS5maXhlZC5oYXMobjIpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBvMSA9IGEuZ3JpZC5nZXQobjEpO1xuICAgICAgICAgIGNvbnN0IG8yID0gYS5ncmlkLmdldChuMik7XG4vL2NvbnNvbGUubG9nKGBtaWQoJHttaWQudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChtaWQpfTsgbjEoJHtuMS50b1N0cmluZygxNil9KTogJHthLmdyaWQuZ2V0KG4xKX07IG4yKCR7bjIudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChuMil9YCk7XG4gICAgICAgICAgLy8gYWxsb3cgbWFraW5nIHByb2dyZXNzIG9uIHRvcCBvZiBhbiBlZGdlLW9ubHkgY29ubmVjdGlvbi5cbiAgICAgICAgICBpZiAoKG8xICYmIChvMiB8fCBvMSAhPT0gY2hhcikpIHx8IGEuZ3JpZC5pc0JvcmRlcihuMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghbG9vcCkge1xuICAgICAgICAgICAgY29uc3QgbmVpZ2hib3JUaWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgbjIgLSAweDgwOCBhcyBHcmlkQ29vcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3JlcGxhY2U6IG5ldyBNYXAoW1tuMSwgJyddXSl9KTtcbiAgICAgICAgICAgIGlmICgvXFxTLy50ZXN0KG5laWdoYm9yVGlsZSkpIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgICAgICBpZiAodGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICAgICAgLy8gaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShhLCBjaGFyLCBsZW5ndGgsIG4yKTtcbiAgICAgICAgICAgIC8vICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmVpZ2hib3JUaWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgbjIgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICAgICAgaWYgKHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhuZWlnaGJvclRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4yLCBvMik7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4xLCBvMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLy8gLyoqXG4gIC8vICAqIEF0dGVtcHQgdG8gZXh0ZW5kIGFuIGV4aXN0aW5nIHNjcmVlbiBpbnRvIGEgZGlyZWN0aW9uIHRoYXQnc1xuICAvLyAgKiBjdXJyZW50bHkgZW1wdHkuICBMZW5ndGggaXMgcHJvYmFiaWxpc3RpYywgZWFjaCBzdWNjZXNzZnVsXG4gIC8vICAqIGF0dGVtcHQgd2lsbCBoYXZlIGEgMS9sZW5ndGggY2hhbmNlIG9mIHN0b3BwaW5nLiAgUmV0dXJucyBudW1iZXJcbiAgLy8gICogb2Ygc2NyZWVucyBhZGRlZC5cbiAgLy8gICovXG4gIC8vIHRyeUV4dHJ1ZGUoYTogQSwgY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciwgYXR0ZW1wdHMgPSAxKTogbnVtYmVyIHtcbiAgLy8gICAvLyBMb29rIGZvciBhIHBsYWNlIHRvIHN0YXJ0LlxuICAvLyAgIHdoaWxlIChhdHRlbXB0cy0tKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgLy8gICAgICAgY29uc3QgbWlkID0gYyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICAgICAgaWYgKCFhLmdyaWQuZ2V0KG1pZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gIC8vICAgICAgIGZvciAobGV0IGRpciBvZiBbMCwgMSwgMiwgM10pIHtcbiAgLy8gICAgICAgICBpZiAoYS5ncmlkLmdldChtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gIC8vICAgICAgICAgaWYgKHRpbGVbaV0gIT09ICcgJykgY29udGludWU7XG4gIC8vICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAvLyAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gIC8vICAgICAgICAgICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGEsIGNoYXIsIGxlbmd0aCwgbWlkLCBkaXIpO1xuICAvLyAgICAgICAgICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiAwO1xuICAvLyB9XG5cbiAgLy8gdHJ5Q29udGludWVFeHRydWRlKGE6IEEsIGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsXG4gIC8vICAgICAgICAgICAgICAgICAgICBtaWQ6IEdyaWRDb29yZCwgZGlyOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPihbXSk7XG4gIC8vICAgbGV0IHdvcmtzOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPnx1bmRlZmluZWQ7XG4gIC8vICAgbGV0IHdlaWdodCA9IDA7XG4gIC8vICAgT1VURVI6XG4gIC8vICAgd2hpbGUgKHRydWUpIHtcbiAgLy8gICAgIHJlcGxhY2Uuc2V0KG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgcmVwbGFjZS5zZXQobWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgbWlkID0gKG1pZCArIDIgKiBHUklERElSW2Rpcl0pIGFzIEdyaWRDb29yZDtcblxuICAvLyAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIG1pZCAtIDB4ODA4IGFzIEdyaWRDb29yZCwge3JlcGxhY2V9KTtcbiAgLy8gICAgIHdlaWdodCsrO1xuICAvLyAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSkubGVuZ3RoKSB7XG4gIC8vICAgICAgIHdvcmtzID0gWy4uLnJlcGxhY2VdO1xuICAvLyAgICAgICAvLyB3ZSBjYW4gcXVpdCBub3cgLSBzZWUgaWYgd2Ugc2hvdWxkLlxuICAvLyAgICAgICB3aGlsZSAod2VpZ2h0ID4gMCkge1xuICAvLyAgICAgICAgIGlmICghdGhpcy5yYW5kb20ubmV4dEludChsZW5ndGgpKSBicmVhayBPVVRFUjtcbiAgLy8gICAgICAgICB3ZWlnaHQtLTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuXG4gIC8vICAgICAvLyBGaW5kIGEgdmlhYmxlIG5leHQgc3RlcC5cbiAgLy8gICAgIGZvciAoY29uc3QgbmV4dERpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gIC8vICAgICAgIGNvbnN0IGRlbHRhID0gR1JJRERJUltuZXh0RGlyXTtcbiAgLy8gICAgICAgY29uc3QgZWRnZSA9IG1pZCArIGRlbHRhIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgICAgaWYgKGEuZ3JpZC5pc0JvcmRlcihlZGdlKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChyZXBsYWNlLmdldCguLi4pIHx8IGEuZ3JpZC5nZXQobWlkICsgMiAqIGRlbHRhIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAvLyAgICAgICBpZiAodGlsZVtpXSAhPT0gJyAnKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAvLyAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAvLyAgICAgICAgIHJlcGxhY2Uuc2V0KG1pZCArIGRlbHRhIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICAgICAgcmVwbGFjZS5zZXQobWlkICsgMiAqIGRlbHRhIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICAgICAgZGlyID0gbmV4dERpcjtcbiAgLy8gICAgICAgICBjb250aW51ZSBPVVRFUjtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgICAgYnJlYWs7IC8vIG5ldmVyIGZvdW5kIGEgZm9sbG93LXVwLCBzbyBxdWl0XG4gIC8vICAgfVxuICAvLyAgIGlmICghd29ya3MpIHJldHVybiAwO1xuICAvLyAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHdvcmtzKSB7XG4gIC8vICAgICBhLmdyaWQuc2V0KGMsIHYpO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gd29ya3MubGVuZ3RoID4+PiAxO1xuICAvLyB9XG5cbiAgLyoqIE1ha2UgYXJyYW5nZW1lbnRzIHRvIG1heGltaXplIHRoZSBzdWNjZXNzIGNoYW5jZXMgb2YgaW5mZXIuICovXG4gIHByZWluZmVyKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSkge1xuICAgICAgaWYgKChyZXN1bHQgPSB0aGlzLnByZWluZmVyU3Bpa2VzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcHJlaW5mZXJTcGlrZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSBzdXJlIHRoZXJlJ3MgYSAnYycgYWJvdmUgZWFjaCAncydcbiAgICAvLyBjaGVjayBzaWRlcz9cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBpbmZlclNjcmVlbnMoYTogQSk6IFJlc3VsdDxNZXRhbG9jYXRpb24+IHtcbiAgICBjb25zdCBzY3JlZW5zOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYS5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIHMpO1xuICAgICAgY29uc3QgY2FuZGlkYXRlcyA9XG4gICAgICAgICAgdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKVxuICAgICAgICAgICAgICAuZmlsdGVyKHMgPT4gIXMuZGF0YS5tb2QpO1xuICAgICAgaWYgKCFjYW5kaWRhdGVzLmxlbmd0aCkge1xuICAgICAgICAvL2NvbnNvbGUuZXJyb3IoYS5ncmlkLnNob3coKSk7XG5pZiAoYS5ncmlkLnNob3coKS5sZW5ndGggPiAxMDAwMDApIGRlYnVnZ2VyO1xuICAgICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluZmVyIHNjcmVlbiAke2hleChzKX06IFske3RpbGV9XVxcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpY2sgPSB0aGlzLnJhbmRvbS5waWNrKGNhbmRpZGF0ZXMpO1xuICAgICAgc2NyZWVucy5wdXNoKHBpY2spO1xuICAgICAgaWYgKHBpY2suaGFzRmVhdHVyZSgnd2FsbCcpKSBhLndhbGxzKys7XG4gICAgICBpZiAocGljay5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgYS5icmlkZ2VzKys7XG5cbiAgICAgIC8vIFRPRE8gLSBhbnkgb3RoZXIgZmVhdHVyZXMgdG8gdHJhY2s/XG5cbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gbmV3IE1ldGFsb2NhdGlvbih0aGlzLnBhcmFtcy5pZCwgdGhpcy5vcmlnLnRpbGVzZXQsIGEuaCwgYS53KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIG1ldGEuc2V0KHkgPDwgNCB8IHgsIHNjcmVlbnNbeSAqIGEudyArIHhdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge29rOiB0cnVlLCB2YWx1ZTogbWV0YX07XG4gIH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSByaWdodCBudW1iZXIgb2Ygd2FsbHMgYW5kIGJyaWRnZXNcbiAgICAvLyBhLndhbGxzID0gYS5icmlkZ2VzID0gMDsgLy8gVE9ETyAtIGRvbid0IGJvdGhlciBtYWtpbmcgdGhlc2UgaW5zdGFuY2VcbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgIC8vICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge2NvbnNvbGUud2FybihoZXgocG9zKSk7IGEuYnJpZGdlcysrO31cbiAgICAvLyAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSBhLndhbGxzKys7XG4gICAgLy8gfVxuICAgIGNvbnN0IGJyaWRnZXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYnJpZGdlIHx8IDA7XG4gICAgY29uc3Qgd2FsbHMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ud2FsbCB8fCAwO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKG1ldGEuYWxsUG9zKCkpKSB7XG4gICAgICBjb25zdCBjID0gKChwb3MgPDwgOCB8IHBvcyA8PCA0KSAmIDB4ZjBmMCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpXG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKGEuYnJpZGdlcyA8PSBicmlkZ2VzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5hZGRCbG9ja3MgJiZcbiAgICAgICAgICB0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICdibG9jaycpKSkge1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSBhLmJyaWRnZXMtLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZy50aWxlc2V0LndpdGhNb2QodGlsZSwgJ2JyaWRnZScpKSkge1xuICAgICAgICAgIGEuYnJpZGdlcy0tO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAvLyB9IGVsc2UgaWYgKGJyaWRnZXMgPCBhLmJyaWRnZXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAvLyAgIC8vIGNhbid0IGFkZCBicmlkZ2VzP1xuICAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoYS53YWxscyA8IHdhbGxzICYmICFzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICd3YWxsJykpKSB7XG4gICAgICAgICAgYS53YWxscysrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUud2FybihgYnJpZGdlcyAke2EuYnJpZGdlc30gJHticmlkZ2VzfSAvIHdhbGxzICR7YS53YWxsc30gJHt3YWxsc31cXG4ke2EuZ3JpZC5zaG93KCl9XFxuJHttZXRhLnNob3coKX1gKTtcbiAgICBpZiAoYS5icmlkZ2VzICE9PSBicmlkZ2VzKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgZmFpbDogYHJlZmluZU1ldGEgYnJpZGdlcyB3YW50ICR7YnJpZGdlc30gZ290ICR7YS5icmlkZ2VzfVxcbiR7bWV0YS5zaG93KCl9YH07XG4gICAgfVxuICAgIGlmIChhLndhbGxzICE9PSB3YWxscykge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgIGZhaWw6IGByZWZpbmVNZXRhIHdhbGxzIHdhbnQgJHt3YWxsc30gZ290ICR7YS53YWxsc31gfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgdHJ5TWV0YShtZXRhOiBNZXRhbG9jYXRpb24sIHBvczogUG9zLFxuICAgICAgICAgIHNjcmVlbnM6IEl0ZXJhYmxlPE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBzIG9mIHNjcmVlbnMpIHtcbiAgICAgIGlmICghdGhpcy5jaGVja01ldGEobWV0YSwgbmV3IE1hcChbW3Bvcywgc11dKSkpIGNvbnRpbnVlO1xuICAgICAgbWV0YS5zZXQocG9zLCBzKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjaGVja01ldGEobWV0YTogTWV0YWxvY2F0aW9uLCByZXBsYWNlbWVudHM/OiBNYXA8UG9zLCBNZXRhc2NyZWVuPik6IGJvb2xlYW4ge1xuXG4gICAgLy8gVE9ETyAtIGZsaWdodD8gIG1heSBoYXZlIGEgZGlmZiAjIG9mIGZsaWdodCB2cyBub24tZmxpZ2h0IHBhcnRpdGlvbnNcbiAgICBjb25zdCBvcHRzID0gcmVwbGFjZW1lbnRzID8ge3dpdGg6IHJlcGxhY2VtZW50c30gOiB7fTtcbiAgICBjb25zdCBwYXJ0cyA9IG1ldGEudHJhdmVyc2Uob3B0cyk7XG4gICAgcmV0dXJuIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHRoaXMubWF4UGFydGl0aW9ucztcbiAgfVxuXG4gIHJlcXVpcmVFbGlnaWJsZVBpdERlc3RpbmF0aW9uKG1ldGE6IE1ldGFsb2NhdGlvbik6IGJvb2xlYW4ge1xuICAgIGxldCB2ID0gZmFsc2U7XG4gICAgbGV0IGggPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpIHx8IHNjci5oYXNGZWF0dXJlKCdlbXB0eScpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgKHNjci5kYXRhLmVkZ2VzIHx8ICcnKS5zcGxpdCgnJykubWFwKHggPT4geCA9PT0gJyAnID8gJycgOiB4KTtcbiAgICAgIGlmIChlZGdlc1swXSAmJiBlZGdlc1syXSkgdiA9IHRydWU7XG4gICAgICAvLyBOT1RFOiB3ZSBjbGFtcCB0aGUgdGFyZ2V0IFggY29vcmRzIHNvIHRoYXQgc3Bpa2Ugc2NyZWVucyBhcmUgYWxsIGdvb2RcbiAgICAgIC8vIHRoaXMgcHJldmVudHMgZXJyb3JzIGZyb20gbm90IGhhdmluZyBhIHZpYWJsZSBkZXN0aW5hdGlvbiBzY3JlZW4uXG4gICAgICBpZiAoKGVkZ2VzWzFdICYmIGVkZ2VzWzNdKSB8fCBzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgaCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodiAmJiBoKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY2hlY2tNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGlmICghdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnN0YXR1ZSkgcmV0dXJuIE9LO1xuICAgIGxldCBzdGF0dWVzID0gMDtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgc3RhdHVlcyArPSBzY3IuZGF0YS5zdGF0dWVzPy5sZW5ndGggfHwgMDtcbiAgICB9XG4gICAgaWYgKHN0YXR1ZXMgPCB0aGlzLnBhcmFtcy5mZWF0dXJlcy5zdGF0dWUpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgaW5zdWZmaWNpZW50IHN0YXR1ZSBzY3JlZW5zYH07XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxufVxuXG4vLyBUT0RPOlxuLy8gIC0gd2hlbiB0aGVyZSdzIGEgYnJpZGdlLCBuZXcgcnVsZSB0byByZXF1aXJlIGEgc3RhaXIgb3IgcG9pXG4vLyAgICB0byBiZSBwYXJ0aXRpb25lZCBvZmYgaWYgYnJpZGdlIHRpbGUgaXMgcmVtb3ZlZFxuLy8gIC0gcG9zc2libHkgYWxzbyAqbGluayogdG8gb3RoZXIgc2NyZWVuP1xuLy8gIC0gcGxhY2UgYnJpZGdlIGVhcmx5IG9yIGxhdGU/XG4vLyAgICAtIGlmIGVhcmx5IHRoZW4gbm8gd2F5IHRvIGVuZm9yY2UgdGhyb3VnaG5lc3MgcnVsZVxuLy8gICAgLSBpZiBsYXRlIHRoZW4gaGFyZCB0byBzeW5jIHVwIHdpdGggb3RoZXIgZmxvb3Jcbi8vIEFMU08sIHdlIGRvbid0IGhhdmUgYSByZWYgdG8gdGhlIHRpbGVzZXQgcmlnaHQgbm93LCBkb24ndCBldmVuXG4vLyBrbm93IHdoYXQgdGhlIHRpbGVzIGFyZSEgIE5lZWQgdG8gbWFwIHRoZSAzeDMgZ3JpZCBvZiAoPz8pIHRvXG4vLyBtZXRhdGlsZXMuXG4vLyAgLSBjb25zaWRlciB1cGRhdGluZyBcImVkZ2VcIiB0byBiZSB3aG9sZSA5eDk/XG4vLyAgICAgJyBjIC9jY2MvICAgJ1xuLy8gICAgIGNhdmUoJ2NjIGMnLCAnYycpXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHwgYyB8XG4vLyAgICAgICB8Y2NjfFxuLy8gICAgICAgfCAgIHxgLFxuLy9cbi8vICAgICB0aWxlYFxuLy8gICAgICAgfCAgIHxcbi8vICAgICAgIHxjdSB8XG4vLyAgICAgICB8ICAgfGAsXG4vL1xuLy8gQmFzaWMgaWRlYSB3b3VsZCBiZSB0byBzaW1wbGlmeSB0aGUgXCJmZWF0dXJlc1wiIGJpdCBxdWl0ZSBhIGJpdCxcbi8vIGFuZCBlbmNhcHN1bGF0ZSB0aGUgd2hvbGUgdGhpbmcgaW50byB0aGUgdGlsZSAtIGVkZ2VzLCBjb3JuZXJzLCBjZW50ZXIuXG4vL1xuLy8gRm9yIG92ZXJ3b3JsZCwgJ28nIG1lYW5zIG9wZW4sICdnJyBmb3IgZ3Jhc3MsIGV0Yy4uLj9cbi8vIC0gdGhlbiB0aGUgbGV0dGVycyBhcmUgYWx3YXlzIHRoZSB3YWxrYWJsZSB0aWxlcywgd2hpY2ggbWFrZXMgc2Vuc2Vcbi8vICAgc2luY2UgdGhvc2UgYXJlIHRoZSBvbmVzIHRoYXQgaGF2ZSBhbGwgdGhlIHZhcmlldHkuXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfCAgIHxgLFxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfG9vb3xcbi8vICAgICAgIHxvZ298YCxcblxuLy8gZXhwb3J0IGNsYXNzIENhdmVTaHVmZmxlQXR0ZW1wdCBleHRlbmRzIE1hemVTaHVmZmxlQXR0ZW1wdCB7XG5cbi8vICAgcmVhZG9ubHkgdGlsZXNldDogTWV0YXRpbGVzZXQ7XG4vLyAgIHJlYWRvbmx5IGdyaWQ6IEdyaWQ8c3RyaW5nPjtcbi8vICAgcmVhZG9ubHkgZml4ZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbi8vICAgcmVhZG9ubHkgc2NyZWVuczogcmVhZG9ubHkgR3JpZENvb3JkW10gPSBbXTtcbi8vICAgbWV0YSE6IE1ldGFsb2NhdGlvbjtcbi8vICAgY291bnQgPSAwO1xuLy8gICB3YWxscyA9IDA7XG4vLyAgIGJyaWRnZXMgPSAwO1xuLy8gICBtYXhQYXJ0aXRpb25zID0gMTtcbi8vICAgbWluU3Bpa2VzID0gMjtcblxuLy8gICBjb25zdHJ1Y3RvcihyZWFkb25seSBoOiBudW1iZXIsIHJlYWRvbmx5IHc6IG51bWJlcixcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgcGFyYW1zOiBTdXJ2ZXksIHJlYWRvbmx5IHJhbmRvbTogUmFuZG9tKSB7XG4vLyAgICAgc3VwZXIoKTtcbi8vICAgICB0aGlzLmdyaWQgPSBuZXcgR3JpZChoLCB3KTtcbi8vICAgICB0aGlzLmdyaWQuZGF0YS5maWxsKCcnKTtcbi8vICAgICBmb3IgKGxldCB5ID0gMC41OyB5IDwgaDsgeSsrKSB7XG4vLyAgICAgICBmb3IgKGxldCB4ID0gMC41OyB4IDwgdzsgeCsrKSB7XG4vLyAgICAgICAgIGlmICh5ID4gMSkgdGhpcy5ncmlkLnNldDIoeSAtIDAuNSwgeCwgJ2MnKTtcbi8vICAgICAgICAgaWYgKHggPiAxKSB0aGlzLmdyaWQuc2V0Mih5LCB4IC0gMC41LCAnYycpO1xuLy8gICAgICAgICB0aGlzLmdyaWQuc2V0Mih5LCB4LCAnYycpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgICB0aGlzLmNvdW50ID0gaCAqIHc7XG4vLyAgICAgY29uc3Qgc2NyZWVuczogR3JpZENvb3JkW10gPSBbXTtcbi8vICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaDsgeSsrKSB7XG4vLyAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMudzsgeCsrKSB7XG4vLyAgICAgICAgIHNjcmVlbnMucHVzaCgoeSA8PCAxMiB8IHggPDwgNCkgYXMgR3JpZENvb3JkKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgdGhpcy5zY3JlZW5zID0gc2NyZWVucztcbi8vICAgfVxuXG5cbiAgLy8gY2hlY2tSZWFjaGFiaWxpdHkocmVwbGFjZT86IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgLy8gICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgLy8gfVxuXG5cbmV4cG9ydCBjbGFzcyBXaWRlQ2F2ZVNodWZmbGUgZXh0ZW5kcyBDYXZlU2h1ZmZsZSB7XG4gIGFkZExhdGVGZWF0dXJlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0ID0gc3VwZXIuYWRkTGF0ZUZlYXR1cmVzKGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGEuZ3JpZC5kYXRhID0gYS5ncmlkLmRhdGEubWFwKGMgPT4gYyA9PT0gJ2MnID8gJ3cnIDogYyk7XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDcnlwdEVudHJhbmNlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgcmVmaW5lTWV0YXNjcmVlbnMoYTogQSwgbWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBjaGFuZ2UgYXJlbmEgaW50byBjcnlwdCBhcmVuYVxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgYS5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53OyB4KyspIHtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkKSA9PT0gJ2EnKSB7XG4gICAgICAgICAgbWV0YS5zZXQoeSA8PCA0IHwgeCwgbWV0YS5yb20ubWV0YXNjcmVlbnMuY3J5cHRBcmVuYV9zdGF0dWVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucmVmaW5lTWV0YXNjcmVlbnMoYSwgbWV0YSk7XG4gIH1cblxuICBpc0VsaWdpYmxlQXJlbmEoYTogQSwgYzogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICFhLmdyaWQuZ2V0KGMgLSAweDgwMCBhcyBHcmlkQ29vcmQpICYmIHN1cGVyLmlzRWxpZ2libGVBcmVuYShhLCBjKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgS2FybWluZUJhc2VtZW50U2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgbG9vc2VSZWZpbmUgPSB0cnVlO1xuXG4gIHBpY2tXaWR0aCgpIHsgcmV0dXJuIDg7IH1cbiAgcGlja0hlaWdodCgpIHsgcmV0dXJuIDU7IH1cblxuICBpbml0aWFsRmlsbChhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBTZXQgdXAgdGhlIGJhc2ljIGZyYW1ld29yazpcbiAgICAvLyAgKiBhIHNpbmdsZSByb3cgb2YgY3Jvc3MtY3V0dGluZyBjb3JyaWRvciwgd2l0aCB0aHJlZSBvZiB0aGVcbiAgICAvLyAgICBmb3VyIGNvbHVtbnMgYXMgc3Bpa2VzLCBhbmQgZnVsbCBjb25uZWN0aW9ucyBhcm91bmQgdGhlXG4gICAgLy8gICAgZWRnZXMuXG4gICAgaWYgKGEuZ3JpZC5oZWlnaHQgIT09IDUgfHwgYS5ncmlkLndpZHRoICE9PSA4KSB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBzaXplJyk7XG4gICAgR3JpZC53cml0ZUdyaWQyZChhLmdyaWQsIDAgYXMgR3JpZENvb3JkLCBLYXJtaW5lQmFzZW1lbnRTaHVmZmxlLlBBVFRFUk4pO1xuICAgIGEuY291bnQgPSAzNjtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRTcGlrZXMoYTogQSk6IGJvb2xlYW4ge1xuICAgIC8vIENoYW5nZSBvbmUgY29sdW1uIG9mIHNwaWtlcyBpbnRvIG5vcm1hbCBjYXZlLFxuICAgIC8vIG1hcmsgdGhlIHJlc3QgYXMgZml4ZWQuXG4gICAgY29uc3QgZHJvcHBlZCA9IHRoaXMucmFuZG9tLm5leHRJbnQoNCk7XG4gICAgZm9yIChsZXQgeSA9IDE7IHkgPCAxMDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IDQ7IHgrKykge1xuICAgICAgICBjb25zdCBpID0gMiAqIHggKyA1ICsgeSAqIDE3O1xuICAgICAgICBpZiAoeCA9PT0gZHJvcHBlZCkge1xuICAgICAgICAgIGEuZ3JpZC5kYXRhW2ldID0gJ2MnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGMgPSBhLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgICAgICAgIGEuZml4ZWQuYWRkKGMpO1xuICAgICAgICAgIGlmICh5ID09PSA1KSB7XG4gICAgICAgICAgICBhLmZpeGVkLmFkZChjICsgOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICAgICAgYS5maXhlZC5hZGQoYyArIDE2IGFzIEdyaWRDb29yZCk7XG4gICAgICAgICAgICBhLmZpeGVkLmFkZChjIC0gOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICAgICAgYS5maXhlZC5hZGQoYyAtIDE2IGFzIEdyaWRDb29yZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTm93IHBpY2sgcmFuZG9tIHBsYWNlcyBmb3IgdGhlIHN0YWlycy5cbiAgICBsZXQgc3RhaXJzID0gMDtcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGlmIChzdGFpcnMgPT09IDMpIGJyZWFrO1xuICAgICAgY29uc3QgbWlkID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgdXAgPSAobWlkIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IGRvd24gPSAobWlkICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KG1pZCkgPT09ICdjJyAmJlxuICAgICAgICAgIGEuZ3JpZC5nZXQodXApICE9PSAncycgJiZcbiAgICAgICAgICBhLmdyaWQuZ2V0KGRvd24pICE9PSAncycpIHtcbiAgICAgICAgYS5ncmlkLnNldChtaWQsICc8Jyk7XG4gICAgICAgIGEuZml4ZWQuYWRkKG1pZCk7XG4gICAgICAgIGEuZ3JpZC5zZXQodXAsICcnKTtcbiAgICAgICAgYS5ncmlkLnNldChkb3duLCAnJyk7XG4gICAgICAgIHN0YWlycysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSBldmVyeXRoaW5nIGlzIHN0aWxsIGFjY2Vzc2libGUuXG4gICAgY29uc3QgcGFydGl0aW9ucyA9IG5ldyBTZXQoYS5ncmlkLnBhcnRpdGlvbigpLnZhbHVlcygpKTtcbiAgICByZXR1cm4gcGFydGl0aW9ucy5zaXplID09PSAxO1xuICB9XG5cbiAgYWRkU3RhaXJzKCkgeyByZXR1cm4gT0s7IH1cblxuICBzdGF0aWMgcmVhZG9ubHkgUEFUVEVSTiA9IFtcbiAgICAnICAgICAgICAgICAgICAgICAnLFxuICAgICcgICBjY2NjY2NjY2NjYyAgICcsXG4gICAgJyAgIGMgYyBjIGMgYyBjICAgJyxcbiAgICAnIGNjYyBzIHMgcyBzIGNjYyAnLFxuICAgICcgYyBjIHMgcyBzIHMgYyBjICcsXG4gICAgJyBjY2Njc2NzY3Njc2NjY2MgJyxcbiAgICAnIGMgYyBzIHMgcyBzIGMgYyAnLFxuICAgICcgY2NjIHMgcyBzIHMgY2NjICcsXG4gICAgJyAgIGMgYyBjIGMgYyBjICAgJyxcbiAgICAnICAgY2NjY2NjY2NjY2MgICAnLFxuICAgICcgICAgICAgICAgICAgICAgICcsXG4gIF07XG59XG5cbmNvbnN0IFRJTEVESVIgPSBbMSwgMywgNywgNV07XG5jb25zdCBHUklERElSID0gWy0weDgwMCwgLTgsIDB4ODAwLCA4XTtcblxuLy8gVGhpcyBtaWdodCBjb3ZlciBhbGwgb2YgdHJ5RXh0cnVkZSwgdHJ5Q29udGludWVFeHRydWRlLCB0cnlDb25uZWN0XG4vLyAgLSBjb3VsZCBhbHNvIGZpbmQgYSB3YXkgdG8gYWRkIHRyeUFkZExvb3A/XG5pbnRlcmZhY2UgQWRkT3B0cyB7XG4gIGNoYXI/OiBzdHJpbmc7XG4gIC8vIGxlbmd0aDogbnVtYmVyO1xuICBzdGFydD86IEdyaWRDb29yZDtcbiAgLy8gZW5kOiBHcmlkQ29vcmQ7XG4gIGxvb3A/OiBib29sZWFuOyAvLyBhbGxvdyB2cyByZXF1aXJlP1xuXG4gIGF0dGVtcHRzPzogbnVtYmVyO1xuXG4gIC8vIGJyYW5jaDogYm9vbGVhbjtcbiAgLy8gcmVkdWNlUGFydGl0aW9uczogYm9vbGVhbjsgIC0tIG9yIHByb3ZpZGUgYSBcInNtYXJ0IHBpY2sgc3RhcnQvZW5kXCIgd3JhcHBlclxuXG4gIC8vIFRPRE8gLSBzb21lIGlkZWEgb2Ygd2hldGhlciB0byBwcmVmZXIgZXh0ZW5kaW5nIGFuIGV4aXN0aW5nXG4gIC8vIGRlYWQgZW5kIG9yIG5vdCAtIHRoaXMgd291bGQgcHJvdmlkZSBzb21lIHNvcnQgb2YgXCJicmFuY2hpbmcgZmFjdG9yXCJcbiAgLy8gd2hlcmVieSB3ZSBjYW4gdGlnaHRseSBjb250cm9sIGhvdyBtYW55IGRlYWQgZW5kcyB3ZSBnZXQuLi4/XG4gIC8vIFByb3ZpZGUgYSBcImZpbmQgZGVhZCBlbmRzXCIgZnVuY3Rpb24/XG4gIC8vICAgLSBpbWFnaW5lIGEgdmVyc2lvbiBvZiB3aW5kbWlsbCBjYXZlIHdoZXJlIHdlIHdhbmRlciB0d28gc2NyZWVucyxcbiAgLy8gICAgIHRoZW4gY29ubmVjdCB0aGUgZGVhZCBlbmRzLCB0aGVuIGJyYW5jaCBhbmQgd2FuZGVyIGEgbGl0dGxlIG1vcmU/XG59XG5cbi8vIFRPRE8gLSBwb3RlbnRpYWxseSB3ZSBjb3VsZCBsb29rIGF0IHRoZSB3aG9sZSBwcm9ibGVtXG4vLyBhcyBtYWtpbmcgYSBsaXN0IG9mIGV4dHJ1ZGUvZmVhdHVyZSB0eXBlczpcbi8vICAgLSByLCBjLCBicmFuY2gsIGFyZW5hLCBicmlkZ2UsIHN0YWlyLCAuLi4/XG4vLyBudWNsZWF0ZSB3LyBhbnkgZWRnZXMsIGhhdmUgYSBsaXN0IG9mIHRoZXNlIG9wZXJhdGlvbnMgYW5kIHRoZW5cbi8vIHRyeSBlYWNoIG9uZSwgaWYgaXQgZG9lc24ndCB3b3JrLCByZXNodWZmbGUgaXQgbGF0ZXIgKGZpeGVkICMgb2YgZHJhd3Ncbi8vIGJlZm9yZSBnaXZpbmcgdXApLlxuIl19