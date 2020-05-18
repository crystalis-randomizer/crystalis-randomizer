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
            return { ok: false, fail: `add spikes\n${a.grid.show()}` };
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
                        a.count++;
                        a.grid.set(n1, char);
                        a.grid.set(n2, char);
                        const neighborTile = this.extract(a.grid, n2 - 0x808);
                        if (tileset.getMetascreensFromTileString(neighborTile).length) {
                            return 1;
                        }
                        a.grid.set(n2, o2);
                        a.grid.set(n1, o1);
                        a.count--;
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
        let allEmpty = true;
        const meta = new Metalocation(this.params.id, this.orig.tileset, a.h, a.w);
        for (let y = 0; y < a.h; y++) {
            for (let x = 0; x < a.w; x++) {
                const scr = screens[y * a.w + x];
                meta.set(y << 4 | x, scr);
                if (!scr.isEmpty())
                    allEmpty = false;
                if (y) {
                    const above = meta.get((y - 1) << 4 | x);
                    if (this.orig.tileset.isBannedVertical(above, scr)) {
                        return { ok: false, fail: `bad vertical neighbor: ${above} ${scr}` };
                    }
                }
                if (x) {
                    const left = meta.get(y << 4 | (x - 1));
                    if (this.orig.tileset.isBannedHorizontal(left, scr)) {
                        return { ok: false, fail: `bad horizontal neighbor: ${left} ${scr}` };
                    }
                }
            }
        }
        if (allEmpty)
            return { ok: false, fail: `all screens empty` };
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
                fail: `refineMeta walls want ${walls} got ${a.walls}\n${meta.show()}` };
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
const TILEDIR = [1, 3, 7, 5];
const GRIDDIR = [-0x800, -8, 0x800, 8];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxZQUFZLEVBQU8sTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUEyQixFQUFFLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV4QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSWpCLE1BQU0sT0FBTyxrQkFBa0I7SUFXN0IsWUFBcUIsQ0FBUyxFQUFXLENBQVMsRUFDN0IsSUFBWTtRQURaLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBVyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQVE7UUFWeEIsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFHdEMsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixVQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFlBQU8sR0FBRyxDQUFDLENBQUM7UUFJVixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNGO0FBRUQsTUFBTSxP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SSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBa0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBHcmlkLCBHcmlkQ29vcmQsIEdyaWRJbmRleCwgRSwgUyB9IGZyb20gJy4vZ3JpZC5qcyc7XG5pbXBvcnQgeyBzZXEsIGhleCB9IGZyb20gJy4uL3JvbS91dGlsLmpzJztcbmltcG9ydCB7IE1ldGFzY3JlZW4gfSBmcm9tICcuLi9yb20vbWV0YXNjcmVlbi5qcyc7XG5pbXBvcnQgeyBNZXRhbG9jYXRpb24sIFBvcyB9IGZyb20gJy4uL3JvbS9tZXRhbG9jYXRpb24uanMnO1xuaW1wb3J0IHsgTWF6ZVNodWZmbGUsIEF0dGVtcHQsIFN1cnZleSwgUmVzdWx0LCBPSyB9IGZyb20gJy4uL21hemUvbWF6ZS5qcyc7XG5pbXBvcnQgeyBVbmlvbkZpbmQgfSBmcm9tICcuLi91bmlvbmZpbmQuanMnO1xuaW1wb3J0IHsgRGVmYXVsdE1hcCB9IGZyb20gJy4uL3V0aWwuanMnO1xuXG5jb25zdCBbXSA9IFtoZXhdO1xuXG50eXBlIEEgPSBDYXZlU2h1ZmZsZUF0dGVtcHQ7XG5cbmV4cG9ydCBjbGFzcyBDYXZlU2h1ZmZsZUF0dGVtcHQgaW1wbGVtZW50cyBBdHRlbXB0IHtcbiAgcmVhZG9ubHkgZ3JpZDogR3JpZDxzdHJpbmc+O1xuICByZWFkb25seSBmaXhlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuXG4gIC8vIEN1cnJlbnQgc2l6ZSBhbmQgbnVtYmVyIG9mIHdhbGxzL2JyaWRnZXMuXG4gIHJpdmVycyA9IDA7XG4gIHdpZGVzID0gMDtcbiAgY291bnQgPSAwO1xuICB3YWxscyA9IDA7XG4gIGJyaWRnZXMgPSAwO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGg6IG51bWJlciwgcmVhZG9ubHkgdzogbnVtYmVyLFxuICAgICAgICAgICAgICByZWFkb25seSBzaXplOiBudW1iZXIpIHtcbiAgICB0aGlzLmdyaWQgPSBuZXcgR3JpZChoLCB3KTtcbiAgICB0aGlzLmdyaWQuZGF0YS5maWxsKCcnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2F2ZVNodWZmbGUgZXh0ZW5kcyBNYXplU2h1ZmZsZSB7XG5cbiAgbWF4UGFydGl0aW9ucyA9IDE7XG4gIG1pblNwaWtlcyA9IDI7XG4gIG1heFNwaWtlcyA9IDU7XG4gIGxvb3NlUmVmaW5lID0gZmFsc2U7XG4gIGFkZEJsb2NrcyA9IHRydWU7XG4gIHByaXZhdGUgX3JlcXVpcmVQaXREZXN0aW5hdGlvbiA9IGZhbHNlO1xuXG4gIHJlcXVpcmVQaXREZXN0aW5hdGlvbigpOiB0aGlzIHtcbiAgICB0aGlzLl9yZXF1aXJlUGl0RGVzdGluYXRpb24gPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc2h1ZmZsZShsb2M6IExvY2F0aW9uLCByYW5kb206IFJhbmRvbSkge1xuICAvLyAgIGNvbnN0IG1ldGEgPSBsb2MubWV0YTtcbiAgLy8gICBjb25zdCBzdXJ2ZXkgPSB0aGlzLnN1cnZleShtZXRhKTtcbiAgLy8gICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IDEwMDsgYXR0ZW1wdCsrKSB7XG4gIC8vICAgICBjb25zdCB3aWR0aCA9XG4gIC8vICAgICAgICAgTWF0aC5tYXgoMSwgTWF0aC5taW4oOCwgbG9jLm1ldGEud2lkdGggK1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoKHJhbmRvbS5uZXh0SW50KDYpIC0gMSkgLyAzKSkpO1xuICAvLyAgICAgY29uc3QgaGVpZ2h0ID1cbiAgLy8gICAgICAgICBNYXRoLm1heCgxLCBNYXRoLm1pbigxNiwgbG9jLm1ldGEuaGVpZ2h0ICtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKChyYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMykpKTtcbiAgLy8gICAgIGNvbnN0IHNodWZmbGUgPSBuZXcgQ2F2ZVNodWZmbGVBdHRlbXB0KGhlaWdodCwgd2lkdGgsIHN1cnZleSwgcmFuZG9tKTtcbiAgLy8gICAgIGNvbnN0IHJlc3VsdCA9IHNodWZmbGUuYnVpbGQoKTtcbiAgLy8gICAgIGlmIChyZXN1bHQpIHtcbiAgLy8gICAgICAgaWYgKGxvYy5pZCA9PT0gMHgzMSkgY29uc29sZS5lcnJvcihgU2h1ZmZsZSBmYWlsZWQ6ICR7cmVzdWx0fWApO1xuICAvLyAgICAgfSBlbHNlIHtcbiAgLy8gICAgICAgdGhpcy5maW5pc2gobG9jLCBzaHVmZmxlLm1ldGEsIHJhbmRvbSk7XG4gIC8vICAgICAgIHJldHVybjtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKGBDb21wbGV0ZWx5IGZhaWxlZCB0byBtYXAgc2h1ZmZsZSAke2xvY31gKTtcbiAgLy8gfVxuXG4gIHN1cnZleShtZXRhOiBNZXRhbG9jYXRpb24pOiBTdXJ2ZXkge1xuICAgIC8vIHRha2UgYSBzdXJ2ZXkuXG4gICAgY29uc3Qgc3VydmV5ID0ge1xuICAgICAgbWV0YSxcbiAgICAgIGlkOiBtZXRhLmlkLFxuICAgICAgdGlsZXNldDogbWV0YS50aWxlc2V0LFxuICAgICAgc2l6ZTogMCxcbiAgICAgIGVkZ2VzOiBbMCwgMCwgMCwgMF0sXG4gICAgICBzdGFpcnM6IFswLCAwXSxcbiAgICAgIGZlYXR1cmVzOiB7XG4gICAgICAgIGFyZW5hOiAwLFxuICAgICAgICBicmlkZ2U6IDAsXG4gICAgICAgIG92ZXI6IDAsXG4gICAgICAgIHBpdDogMCxcbiAgICAgICAgcmFtcDogMCxcbiAgICAgICAgcml2ZXI6IDAsXG4gICAgICAgIHNwaWtlOiAwLFxuICAgICAgICBzdGF0dWU6IDAsXG4gICAgICAgIHVuZGVyOiAwLFxuICAgICAgICB3YWxsOiAwLFxuICAgICAgICB3aWRlOiAwLFxuICAgICAgfSxcbiAgICB9O1xuICAgIGlmIChtZXRhLmlkID49IDApIHtcbiAgICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbWV0YS5yb20ubG9jYXRpb25zW21ldGEuaWRdLnNwYXducykge1xuICAgICAgICBpZiAoc3Bhd24uaXNNb25zdGVyKCkgJiYgc3Bhd24ubW9uc3RlcklkID09PSAweDhmKSB7XG4gICAgICAgICAgc3VydmV5LmZlYXR1cmVzLnN0YXR1ZSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBpZiAoIXNjci5pc0VtcHR5KCkgfHwgc2NyLmRhdGEuZXhpdHM/Lmxlbmd0aCkgc3VydmV5LnNpemUrKztcbiAgICAgIGZvciAoY29uc3QgZXhpdCBvZiBzY3IuZGF0YS5leGl0cyA/PyBbXSkge1xuICAgICAgICBjb25zdCB7dHlwZX0gPSBleGl0O1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2VkZ2U6dG9wJykge1xuICAgICAgICAgIGlmICgocG9zID4+PiA0KSA9PT0gMCkgc3VydmV5LmVkZ2VzWzBdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6bGVmdCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyAmIDB4ZikgPT09IDApIHN1cnZleS5lZGdlc1sxXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZGdlOmJvdHRvbScpIHtcbiAgICAgICAgICBpZiAoKHBvcyA+Pj4gNCkgPT09IG1ldGEuaGVpZ2h0IC0gMSkgc3VydmV5LmVkZ2VzWzJdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6cmlnaHQnKSB7XG4gICAgICAgICAgaWYgKChwb3MgJiAweGYpID09PSBtZXRhLndpZHRoIC0gMSkgc3VydmV5LmVkZ2VzWzNdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2NyeXB0Jykge1xuICAgICAgICAgIC8vIHN0YWlyIGlzIGJ1aWx0IGludG8gYXJlbmFcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlLnN0YXJ0c1dpdGgoJ3NlYW1sZXNzJykpIHtcbiAgICAgICAgICAvLyBkbyBub3RoaW5nLi4uXG4gICAgICAgIH0gZWxzZSBpZiAoZXhpdC5kaXIgJiAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCYWQgZXhpdCBkaXJlY3Rpb246ICR7ZXhpdC5kaXJ9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3VydmV5LnN0YWlyc1tleGl0LmRpciA+Pj4gMV0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdhcmVuYScpKSBzdXJ2ZXkuZmVhdHVyZXMuYXJlbmErKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHN1cnZleS5mZWF0dXJlcy5icmlkZ2UrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnb3ZlcnBhc3MnKSkgc3VydmV5LmZlYXR1cmVzLm92ZXIrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncGl0JykpIHN1cnZleS5mZWF0dXJlcy5waXQrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncmFtcCcpKSBzdXJ2ZXkuZmVhdHVyZXMucmFtcCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkgc3VydmV5LmZlYXR1cmVzLnNwaWtlKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3VuZGVycGFzcycpKSBzdXJ2ZXkuZmVhdHVyZXMudW5kZXIrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSBzdXJ2ZXkuZmVhdHVyZXMud2FsbCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpKSBzdXJ2ZXkuZmVhdHVyZXMucml2ZXIrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2lkZScpKSBzdXJ2ZXkuZmVhdHVyZXMud2lkZSsrO1xuICAgIH1cbiAgICBpZiAoc3VydmV5LnNpemUgPCAyICYmIChtZXRhLndpZHRoID4gMSB8fCBtZXRhLmhlaWdodCA+IDEpKSBzdXJ2ZXkuc2l6ZSA9IDI7XG4gICAgcmV0dXJuIHN1cnZleTtcbiAgfVxuXG4gIGJ1aWxkKGggPSB0aGlzLnBpY2tIZWlnaHQoKSwgdyA9IHRoaXMucGlja1dpZHRoKCksXG4gICAgICAgIHNpemUgPSB0aGlzLnBpY2tTaXplKCkpOiBSZXN1bHQ8TWV0YWxvY2F0aW9uPiB7XG4gICAgdGhpcy5pbml0KCk7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIC8vY29uc3QgciA9IHRoaXMucmFuZG9tO1xuICAgIGNvbnN0IGEgPSBuZXcgQ2F2ZVNodWZmbGVBdHRlbXB0KGgsIHcsIHNpemUpO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5maWxsR3JpZChhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG5cbiAgICAvLyB0cnkgdG8gdHJhbnNsYXRlIHRvIG1ldGFzY3JlZW5zIGF0IHRoaXMgcG9pbnQuLi5cbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucHJlaW5mZXIoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLmluZmVyU2NyZWVucyhhKTtcbiAgICBpZiAoIW1ldGEub2spIHJldHVybiBtZXRhO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5yZWZpbmVNZXRhc2NyZWVucyhhLCBtZXRhLnZhbHVlKSksICFyZXN1bHQub2spIHtcbiAgICAgIC8vY29uc29sZS5lcnJvcihtZXRhLnZhbHVlLnNob3coKSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuY2hlY2tNZXRhc2NyZWVucyhhLCBtZXRhLnZhbHVlKSksICFyZXN1bHQub2spIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yZXF1aXJlUGl0RGVzdGluYXRpb24gJiZcbiAgICAgICAgIXRoaXMucmVxdWlyZUVsaWdpYmxlUGl0RGVzdGluYXRpb24obWV0YS52YWx1ZSkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgbm8gZWxpZ2libGUgcGl0IGRlc3RpbmF0aW9uYH07XG4gICAgfVxuICAgIHJldHVybiBtZXRhO1xuICB9XG5cbiAgZmlsbEdyaWQoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5pbml0aWFsRmlsbChhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9pZiAoIXRoaXMuYWRkRWFybHlGZWF0dXJlcygpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZEVkZ2VzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWFybHlGZWF0dXJlcyhhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9jb25zb2xlLmxvZyhgcmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucmVmaW5lKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2NvbnNvbGUubG9nKGBwb3N0cmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoIXRoaXMucmVmaW5lRWRnZXMoYSkpIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAncmVmaW5lRWRnZXMnfTtcbiAgICB0aGlzLnJlbW92ZVNwdXJzKGEpO1xuICAgIHRoaXMucmVtb3ZlVGlnaHRMb29wcyhhKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkTGF0ZUZlYXR1cmVzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkU3RhaXJzKGEsIC4uLih0aGlzLnBhcmFtcy5zdGFpcnMgPz8gW10pKSksXG4gICAgICAgICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLyBBdHRlbXB0IG1ldGhvZHNcblxuICBpbml0KCkge31cblxuICAvLyBJbml0aWFsIGZpbGwuXG4gIGluaXRpYWxGaWxsKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIHRoaXMuZmlsbENhdmUoYSwgJ2MnKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBmaWxsQ2F2ZShhOiBBLCBzOiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPIC0gbW92ZSB0byBNYXplU2h1ZmZsZS5maWxsP1xuICAgIGZvciAobGV0IHkgPSAwLjU7IHkgPCBhLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDAuNTsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGlmICh5ID4gMSkgYS5ncmlkLnNldDIoeSAtIDAuNSwgeCwgJ2MnKTtcbiAgICAgICAgaWYgKHggPiAxKSBhLmdyaWQuc2V0Mih5LCB4IC0gMC41LCAnYycpO1xuICAgICAgICBhLmdyaWQuc2V0Mih5LCB4LCAnYycpO1xuICAgICAgfVxuICAgIH1cbiAgICBhLmNvdW50ID0gYS5oICogYS53O1xuICB9XG5cbiAgLy8gQWRkIGVkZ2UgYW5kL29yIHN0YWlyIGV4aXRzXG4gIGFkZEVkZ2VzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vbGV0IGF0dGVtcHRzID0gMDtcbiAgICBpZiAoIXRoaXMucGFyYW1zLmVkZ2VzKSByZXR1cm4gT0s7XG4gICAgZm9yIChsZXQgZGlyID0gMDsgZGlyIDwgNDsgZGlyKyspIHtcbiAgICAgIGxldCBjb3VudCA9IHRoaXMucGFyYW1zLmVkZ2VzW2Rpcl0gfHwgMDtcbiAgICAgIGlmICghY291bnQpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAgIHNlcShkaXIgJiAxID8gYS5oIDogYS53LCBpID0+IGEuZ3JpZC5ib3JkZXIoZGlyLCBpKSk7XG4gICAgICBmb3IgKGNvbnN0IGVkZ2Ugb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoZWRnZXMpKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coYGVkZ2U6ICR7ZWRnZS50b1N0cmluZygxNil9IGNvdW50ICR7Y291bnR9IGRpciAke2Rpcn1gKTtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoZWRnZSkpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoZGlyICYgMSkge1xuICAgICAgICAgIGlmIChkaXIgPT09IDEpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZExlZnRFZGdlKGEsIGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGRSaWdodEVkZ2UoYSwgZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChkaXIgPT09IDApIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZFVwRWRnZShhLCBlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkRG93bkVkZ2UoYSwgZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghY291bnQpIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGNvdW50KSB7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgY2FuJ3QgZml0IGFsbCBlZGdlcyBzaHVmZmxpbmcgJHt0aGlzLmxvY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxcbm1pc3NpbmcgJHtjb3VudH0gJHtkaXJ9YH07XG4gICAgICAgIC8vXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRVcEVkZ2Uoe2dyaWQsIGZpeGVkfTogQSwgZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgLy8gVXAgZWRnZXMgbXVzdCBhbHdheXMgYmUgYXJlbmEgc2NyZWVucywgc28gY3V0IG9mZiBib3RoXG4gICAgLy8gdGhlIEUtVyBlZGdlcyBBTkQgdGhlIG5laWdoYm9yaW5nIHNjcmVlbnMgYXMgd2VsbCAocHJvdmlkZWRcbiAgICAvLyB0aGVyZSBpcyBub3QgYWxzbyBhbiBleGl0IG5leHQgdG8gdGhlbSwgc2luY2UgdGhhdCB3b3VsZCBiZVxuICAgIC8vIGEgcHJvYmxlbS4gIChUaGVzZSBhcmUgcHJldHR5IGxpbWl0ZWQ6IHZhbXBpcmUgMSwgcHJpc29uLFxuICAgIC8vIHN0eHkgMSwgcHlyYW1pZCAxLCBjcnlwdCAyLCBkcmF5Z29uIDIpLlxuICAgIGNvbnN0IGJlbG93ID0gZWRnZSArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYmVsb3cgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MiA9IGxlZnQgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MyA9IGxlZnQyIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBiZWxvdyArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MiA9IHJpZ2h0ICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQzID0gcmlnaHQyICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdCkpIHtcbiAgICAgIGlmIChncmlkLmdldChsZWZ0KSkgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZ3JpZC5nZXQoZWRnZSAtIDE2IGFzIEdyaWRDb29yZCkpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChncmlkLmlzQm9yZGVyKGxlZnQzKSAmJiBncmlkLmdldChsZWZ0MykpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHQpKSB7XG4gICAgICBpZiAoZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChncmlkLmdldChlZGdlICsgMTYgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHQzKSAmJiBncmlkLmdldChyaWdodDMpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZpeGVkLmFkZChlZGdlKTtcbiAgICBncmlkLnNldChlZGdlLCAnbicpO1xuICAgIGdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICBncmlkLnNldChyaWdodCwgJycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkRG93bkVkZ2Uoe2dyaWQsIGZpeGVkfTogQSwgZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgLy8gZG93biBlZGdlcyBtdXN0IGhhdmUgc3RyYWlnaHQgTi1TIHNjcmVlbnMsIHNvIGN1dCBvZmZcbiAgICAvLyB0aGUgRS1XIGVkZ2VzIG5leHQgdG8gdGhlbS5cbiAgICBjb25zdCBhYm92ZSA9IGVkZ2UgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdCA9IGFib3ZlIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBhYm92ZSArIDggYXMgR3JpZENvb3JkO1xuICAgIGlmICghZ3JpZC5nZXQoYWJvdmUpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdCkgJiYgZ3JpZC5nZXQobGVmdCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodCkgJiYgZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICduJyk7XG4gICAgZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIGdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRMZWZ0RWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBjb25zdCByaWdodCA9IGVkZ2UgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodFVwID0gcmlnaHQgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHREb3duID0gcmlnaHQgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4vL2NvbnNvbGUubG9nKGBhZGRMZWZ0ICR7aGV4KGVkZ2UpfSByaWdodCAke2hleChyaWdodCl9OiR7dGhpcy5ncmlkLmdldChyaWdodCl9IHJ1ICR7aGV4KHJpZ2h0VXApfToke3RoaXMuZ3JpZC5pc0JvcmRlcihyaWdodFVwKX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0VXApfSByZCAke2hleChyaWdodERvd24pfToke3RoaXMuZ3JpZC5pc0JvcmRlcihyaWdodERvd24pfToke3RoaXMuZ3JpZC5nZXQocmlnaHREb3duKX1gKTtcbiAgICBpZiAoIWdyaWQuZ2V0KHJpZ2h0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChncmlkLmlzQm9yZGVyKHJpZ2h0VXApICYmIGdyaWQuZ2V0KHJpZ2h0VXApKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHREb3duKSAmJiBncmlkLmdldChyaWdodERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICdjJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRSaWdodEVkZ2Uoe2dyaWQsIGZpeGVkfTogQSwgZWRnZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgbGVmdCA9IGVkZ2UgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0VXAgPSBsZWZ0IC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnREb3duID0gbGVmdCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBpZiAoIWdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdFVwKSAmJiBncmlkLmdldChsZWZ0VXApKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdERvd24pICYmIGdyaWQuZ2V0KGxlZnREb3duKSkgcmV0dXJuIGZhbHNlO1xuICAgIGZpeGVkLmFkZChlZGdlKTtcbiAgICBncmlkLnNldChlZGdlLCAnYycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gYWRkQXJlbmFzRWFybHkoKTogYm9vbGVhbiB7XG4gIC8vICAgLy8gU3BlY2lmaWNhbGx5LCBqdXN0IGFyZW5hcy4uLlxuICAvLyAgIGxldCBhcmVuYXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uWydhJ107XG4gIC8vICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAvLyAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gIC8vICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuc2NyZWVucykpIHtcbiAgLy8gICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQgPSAobWlkZGxlIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDIgPSAobGVmdCAtIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQzID0gKGxlZnQyIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDJVcCA9IChsZWZ0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MkRvd24gPSAobGVmdDIgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQgPSAobWlkZGxlICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyID0gKHJpZ2h0ICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQzID0gKHJpZ2h0MiArIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MlVwID0gKHJpZ2h0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDJEb3duID0gKHJpZ2h0MiArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBpZiAoIWcuaXNCb3JkZXIobGVmdCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDMpICYmIGcuZ2V0KGxlZnQzKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKGxlZnQyVXApICYmIGcuZ2V0KGxlZnQyVXApKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJEb3duKSAmJiBnLmdldChsZWZ0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQzKSAmJiBnLmdldChyaWdodDMpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyVXApICYmIGcuZ2V0KHJpZ2h0MlVwKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKHJpZ2h0MkRvd24pICYmIGcuZ2V0KHJpZ2h0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHRoaXMuZml4ZWQuYWRkKG1pZGRsZSk7XG4gIC8vICAgICBnLnNldChtaWRkbGUsICdhJyk7XG4gIC8vICAgICBnLnNldChsZWZ0LCAnJyk7XG4gIC8vICAgICBnLnNldChsZWZ0MiwgJycpO1xuICAvLyAgICAgZy5zZXQocmlnaHQsICcnKTtcbiAgLy8gICAgIGcuc2V0KHJpZ2h0MiwgJycpO1xuICAvLyAgICAgYXJlbmFzLS07XG4gIC8vICAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBmYWxzZTtcbiAgLy8gfVxuXG4gIGFkZEVhcmx5RmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmFkZFNwaWtlcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3Bpa2UgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYWRkIHNwaWtlc1xcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZE92ZXJwYXNzZXMoYSwgdGhpcy5wYXJhbXMuZmVhdHVyZXM/Lm92ZXIgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkIG92ZXJwYXNzZXMnfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgYWRkTGF0ZUZlYXR1cmVzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGlmICghdGhpcy5hZGRBcmVuYXMoYSwgdGhpcy5wYXJhbXMuZmVhdHVyZXM/LmFyZW5hID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZEFyZW5hcyd9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkVW5kZXJwYXNzZXMoYSwgdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnVuZGVyID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZFVuZGVycGFzc2VzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRQaXRzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5waXQgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkUGl0cyd9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkUmFtcHMoYSwgdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnJhbXAgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkUmFtcHMnfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgYWRkQXJlbmFzKGE6IEEsIGFyZW5hczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGcgPSBhLmdyaWQ7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoIXRoaXMuaXNFbGlnaWJsZUFyZW5hKGEsIG1pZGRsZSkpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgICAgY29uc3QgYXJlbmFUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyAnYScgKyB0aWxlLnN1YnN0cmluZyg1KTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKGFyZW5hVGlsZSk7XG4gICAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGEuZml4ZWQuYWRkKG1pZGRsZSk7XG4gICAgICBnLnNldChtaWRkbGUsICdhJyk7XG4gICAgICAvLyBnLnNldChsZWZ0LCAnJyk7XG4gICAgICAvLyBnLnNldChsZWZ0MiwgJycpO1xuICAgICAgLy8gZy5zZXQocmlnaHQsICcnKTtcbiAgICAgIC8vIGcuc2V0KHJpZ2h0MiwgJycpO1xuICAgICAgYXJlbmFzLS07XG4gICAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vY29uc29sZS5lcnJvcignY291bGQgbm90IGFkZCBhcmVuYScpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzRWxpZ2libGVBcmVuYShhOiBBLCBtaWRkbGU6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGcgPSBhLmdyaWQ7XG4gICAgY29uc3QgbGVmdCA9IChtaWRkbGUgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdDIgPSAobGVmdCAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQyID0gKHJpZ2h0ICsgOCkgYXMgR3JpZENvb3JkO1xuICAgIGlmIChnLmdldChtaWRkbGUpICE9PSAnYycgJiYgZy5nZXQobWlkZGxlKSAhPT0gJ3cnKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGcuZ2V0KGxlZnQpIHx8IGcuZ2V0KHJpZ2h0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghZy5pc0JvcmRlcihsZWZ0KSAmJiBnLmdldChsZWZ0MikpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWcuaXNCb3JkZXIocmlnaHQpICYmIGcuZ2V0KHJpZ2h0MikpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZFVuZGVycGFzc2VzKGE6IEEsIHVuZGVyOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAvLyBPbmx5IGFkZCBob3Jpem9udGFsICcgICB8Y2JjfCAgICcsIG5vdCAnIGMgfCBiIHwgYyAnLiAgQ291bGQgcG9zc2libHlcbiAgICAvLyB1c2UgJ2InIGFuZCAnQicgaW5zdGVhZD9cbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUoYSwgdW5kZXIsICdiJywgMHg4MDApO1xuICB9XG5cbiAgYWRkT3ZlcnBhc3NlcyhhOiBBLCBvdmVyOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChvdmVyKSB7XG4gICAgICBjb25zdCB5ID0gdGhpcy5yYW5kb20ubmV4dEludChhLmggLSAyKSArIDE7XG4gICAgICBjb25zdCB4ID0gdGhpcy5yYW5kb20ubmV4dEludChhLncgLSAyKSArIDE7XG4gICAgICBjb25zdCBjID0gKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQoYykgIT09ICdjJykge1xuICAgICAgICBpZiAoKythdHRlbXB0cyA+IDEwKSB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBhdHRlbXB0cycpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGEuZ3JpZC5zZXQoYywgJ2InKTtcbiAgICAgIGEuZml4ZWQuYWRkKGMpO1xuICAgICAgYS5ncmlkLnNldChjIC0gOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgIGEuZ3JpZC5zZXQoYyArIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICBvdmVyLS07XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkUGl0cyhhOiBBLCBwaXRzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUoYSwgcGl0cywgJ3AnKTtcbiAgfVxuXG4gIGFkZFJhbXBzKGE6IEEsIHJhbXBzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hZGRTdHJhaWdodFNjcmVlbkxhdGUoYSwgcmFtcHMsICcvJywgOCk7XG4gIH1cblxuICAvKiogQHBhcmFtIGRlbHRhIEdyaWRDb29yZCBkaWZmZXJlbmNlIGZvciBlZGdlcyB0aGF0IG5lZWQgdG8gYmUgZW1wdHkuICovXG4gIGFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhOiBBLCBjb3VudDogbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhcjogc3RyaW5nLCBkZWx0YT86IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghY291bnQpIHJldHVybiB0cnVlO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgY29uc3QgbWlkZGxlID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQobWlkZGxlKSAhPT0gJ2MnKSBjb250aW51ZTtcbiAgICAgIGlmIChkZWx0YSkge1xuICAgICAgICBjb25zdCBzaWRlMSA9IChtaWRkbGUgLSBkZWx0YSkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCBzaWRlMiA9IChtaWRkbGUgKyBkZWx0YSkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoYS5ncmlkLmdldChzaWRlMSkgfHwgYS5ncmlkLmdldChzaWRlMikpIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgICAgY29uc3QgbmV3VGlsZSA9IHRpbGUuc3Vic3RyaW5nKDAsIDQpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcobmV3VGlsZSk7XG4gICAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIC8vIFRPRE8gLSByZXR1cm4gZmFsc2UgaWYgbm90IG9uIGEgY3JpdGljYWwgcGF0aD8/P1xuICAgICAgLy8gICAgICAtIGJ1dCBQT0kgYXJlbid0IHBsYWNlZCB5ZXQuXG4gICAgICBhLmZpeGVkLmFkZChtaWRkbGUpO1xuICAgICAgYS5ncmlkLnNldChtaWRkbGUsIGNoYXIpO1xuICAgICAgY291bnQtLTtcbiAgICAgIGlmICghY291bnQpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2NvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBhZGQgcmFtcCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFkZFNwaWtlcyhhOiBBLCBzcGlrZXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghc3Bpa2VzKSByZXR1cm4gdHJ1ZTtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChzcGlrZXMgPiAwKSB7XG4gICAgICBpZiAoKythdHRlbXB0cyA+IDIwKSByZXR1cm4gZmFsc2U7XG5cbiAgICAgIC8vIFRPRE8gLSB0cnkgdG8gYmUgc21hcnRlciBhYm91dCBzcGlrZXNcbiAgICAgIC8vICAtIGlmIHRvdGFsID4gMiB0aGVuIHVzZSBtaW4odG90YWwsIGgqLjYsID8/KSBhcyBsZW5cbiAgICAgIC8vICAtIGlmIGxlbiA+IDIgYW5kIHcgPiAzLCBhdm9pZCBwdXR0aW5nIHNwaWtlcyBvbiBlZGdlP1xuICAgICAgbGV0IGxlbiA9IE1hdGgubWluKHNwaWtlcywgTWF0aC5mbG9vcihhLmggKiAwLjYpLCB0aGlzLm1heFNwaWtlcyk7XG4gICAgICB3aGlsZSAobGVuIDwgc3Bpa2VzIC0gMSAmJiBsZW4gPiB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICBpZiAodGhpcy5yYW5kb20ubmV4dCgpIDwgMC4yKSBsZW4tLTtcbiAgICAgIH1cbiAgICAgIC8vaWYgKGxlbiA9PT0gc3Bpa2VzIC0gMSkgbGVuKys7XG4gICAgICBjb25zdCB4ID1cbiAgICAgICAgICAobGVuID4gMiAmJiBhLncgPiAzKSA/IHRoaXMucmFuZG9tLm5leHRJbnQoYS53IC0gMikgKyAxIDpcbiAgICAgICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KGEudyk7XG4gICAgICAvLyBjb25zdCByID1cbiAgICAgIC8vICAgICB0aGlzLnJhbmRvbS5uZXh0SW50KE1hdGgubWluKHRoaXMuaCAtIDIsIHNwaWtlcykgLSB0aGlzLm1pblNwaWtlcyk7XG4gICAgICAvLyBsZXQgbGVuID0gdGhpcy5taW5TcGlrZXMgKyByO1xuICAgICAgaWYgKGxlbiA+IHNwaWtlcyAtIHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgIGlmIChsZW4gPj0gYS5oIC0gMikgeyAvLyAmJiBsZW4gPiB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICAgIGxlbiA9IGEuaCAtIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGVuID0gc3Bpa2VzOyAvLyA/Pz8gaXMgdGhpcyBldmVuIHZhbGlkID8/P1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCB5MCA9IHRoaXMucmFuZG9tLm5leHRJbnQoYS5oIC0gbGVuIC0gMikgKyAxO1xuICAgICAgY29uc3QgdDAgPSB5MCA8PCAxMiB8IHggPDwgNCB8IDB4ODA4O1xuICAgICAgY29uc3QgdDEgPSB0MCArICgobGVuIC0gMSkgPDwgMTIpO1xuICAgICAgZm9yIChsZXQgdCA9IHQwIC0gMHgxMDAwOyBsZW4gJiYgdCA8PSB0MSArIDB4MTAwMDsgdCArPSAweDgwMCkge1xuICAgICAgICBpZiAoYS5ncmlkLmdldCh0IGFzIEdyaWRDb29yZCkgIT09ICdjJykgbGVuID0gMDtcbiAgICAgIH1cbiAgICAgIGlmICghbGVuKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGNsZWFyZWQgPSBbdDAgLSA4LCB0MCArIDgsIHQxIC0gOCwgdDEgKyA4XSBhcyBHcmlkQ29vcmRbXTtcbiAgICAgIGNvbnN0IG9ycGhhbmVkID0gdGhpcy50cnlDbGVhcihhLCBjbGVhcmVkKTtcbiAgICAgIGlmICghb3JwaGFuZWQubGVuZ3RoKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgYyBvZiBvcnBoYW5lZCkge1xuICAgICAgICBhLmdyaWQuc2V0KGMsICcnKTtcbiAgICAgIH1cbiAgICAgIGEuZml4ZWQuYWRkKCh0MCAtIDB4ODAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgYS5maXhlZC5hZGQoKHQwIC0gMHgxMDAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgYS5maXhlZC5hZGQoKHQxICsgMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBhLmZpeGVkLmFkZCgodDEgKyAweDEwMDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBmb3IgKGxldCB0ID0gdDA7IHQgPD0gdDE7IHQgKz0gMHg4MDApIHtcbiAgICAgICAgYS5maXhlZC5hZGQodCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICBhLmdyaWQuc2V0KHQgYXMgR3JpZENvb3JkLCAncycpO1xuICAgICAgfVxuICAgICAgc3Bpa2VzIC09IGxlbjtcbiAgICAgIGF0dGVtcHRzID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHNwaWtlcyA9PT0gMDtcbiAgfVxuXG4gIGNhblJlbW92ZShjOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAvLyBOb3RhYmx5LCBleGNsdWRlIHN0YWlycywgbmFycm93IGVkZ2VzLCBhcmVuYXMsIGV0Yy5cbiAgICByZXR1cm4gYyA9PT0gJ2MnO1xuICB9XG5cbiAgLyoqXG4gICAqIERvZXMgYSB0cmF2ZXJzYWwgd2l0aCB0aGUgZ2l2ZW4gY29vcmRpbmF0ZShzKSBjbGVhcmVkLCBhbmQgcmV0dXJuc1xuICAgKiBhbiBhcnJheSBvZiBjb29yZGluYXRlcyB0aGF0IHdvdWxkIGJlIGN1dCBvZmYgKGluY2x1ZGluZyB0aGUgY2xlYXJlZFxuICAgKiBjb29yZGluYXRlcykuICBJZiBjbGVhcmluZyB3b3VsZCBjcmVhdGUgbW9yZSB0aGFuIHRoZSBhbGxvd2VkIG51bWJlclxuICAgKiBvZiBwYXJ0aXRpb25zICh1c3VhbGx5IDEpLCB0aGVuIHJldHVybnMgYW4gZW1wdHkgYXJyYXkgdG8gc2lnbmlmeVxuICAgKiB0aGF0IHRoZSBjbGVhciBpcyBub3QgYWxsb3dlZC5cbiAgICovXG4gIHRyeUNsZWFyKGE6IEEsIGNvb3JkczogR3JpZENvb3JkW10pOiBHcmlkQ29vcmRbXSB7XG4gICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBjIG9mIGNvb3Jkcykge1xuICAgICAgaWYgKGEuZml4ZWQuaGFzKGMpKSByZXR1cm4gW107XG4gICAgICByZXBsYWNlLnNldChjLCAnJyk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnRzID0gYS5ncmlkLnBhcnRpdGlvbihyZXBsYWNlKTtcbiAgICAvLyBDaGVjayBzaW1wbGUgY2FzZSBmaXJzdCAtIG9ubHkgb25lIHBhcnRpdGlvblxuICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICBpZiAoZmlyc3Quc2l6ZSA9PT0gcGFydHMuc2l6ZSkgeyAvLyBhIHNpbmdsZSBwYXJ0aXRpb25cbiAgICAgIHJldHVybiBbLi4uY29vcmRzXTtcbiAgICB9XG4gICAgLy8gTW9yZSBjb21wbGV4IGNhc2UgLSBuZWVkIHRvIHNlZSB3aGF0IHdlIGFjdHVhbGx5IGhhdmUsXG4gICAgLy8gc2VlIGlmIGFueXRoaW5nIGdvdCBjdXQgb2ZmLlxuICAgIGNvbnN0IGNvbm5lY3RlZCA9IG5ldyBTZXQ8U2V0PEdyaWRDb29yZD4+KCk7XG4gICAgY29uc3QgYWxsUGFydHMgPSBuZXcgU2V0PFNldDxHcmlkQ29vcmQ+PihwYXJ0cy52YWx1ZXMoKSk7XG4gICAgZm9yIChjb25zdCBmaXhlZCBvZiBhLmZpeGVkKSB7XG4gICAgICBjb25uZWN0ZWQuYWRkKHBhcnRzLmdldChmaXhlZCkhKTtcbiAgICB9XG4gICAgaWYgKGNvbm5lY3RlZC5zaXplID4gdGhpcy5tYXhQYXJ0aXRpb25zKSByZXR1cm4gW107IC8vIG5vIGdvb2RcbiAgICBjb25zdCBvcnBoYW5lZCA9IFsuLi5jb29yZHNdO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiBhbGxQYXJ0cykge1xuICAgICAgaWYgKGNvbm5lY3RlZC5oYXMocGFydCkpIGNvbnRpbnVlO1xuICAgICAgb3JwaGFuZWQucHVzaCguLi5wYXJ0KTtcbiAgICB9XG4gICAgcmV0dXJuIG9ycGhhbmVkO1xuICB9XG5cbiAgcmVmaW5lKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCBmaWxsZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCBhLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGEuZ3JpZC5kYXRhW2ldKSBmaWxsZWQuYWRkKGEuZ3JpZC5jb29yZChpKSk7XG4gICAgfVxuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKGEuY291bnQgPiBhLnNpemUpIHtcbiAgICAgIGlmIChhdHRlbXB0cysrID4gNTApIHRocm93IG5ldyBFcnJvcihgcmVmaW5lIGZhaWxlZDogYXR0ZW1wdHNgKTtcbiAgICAgIC8vY29uc29sZS5sb2coYG1haW46ICR7dGhpcy5jb3VudH0gPiAke2Euc2l6ZX1gKTtcbiAgICAgIGxldCByZW1vdmVkID0gMDtcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT00KXtkZWJ1Z2dlcjtbLi4udGhpcy5yYW5kb20uaXNodWZmbGUoZmlsbGVkKV07fVxuICAgICAgZm9yIChjb25zdCBjb29yZCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4uZmlsbGVkXSkpIHtcbiAgICAgICAgaWYgKGEuZ3JpZC5pc0JvcmRlcihjb29yZCkgfHxcbiAgICAgICAgICAgICF0aGlzLmNhblJlbW92ZShhLmdyaWQuZ2V0KGNvb3JkKSkgfHxcbiAgICAgICAgICAgIGEuZml4ZWQuaGFzKGNvb3JkKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkID4gMykgYnJlYWs7XG5cbiAgICAgICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKHRoaXMucmVtb3ZhbE1hcChhLCBjb29yZCkpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplICYmIHBhcnRzLnNpemUgPiAxKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgICAgIC8vIG9rIHRvIHJlbW92ZVxuICAgICAgICAgIHJlbW92ZWQrKztcbiAgICAgICAgICBmaWxsZWQuZGVsZXRlKGNvb3JkKTtcbiAgICAgICAgICBpZiAoKGNvb3JkICYgMHg4MDgpID09PSAweDgwOCkgYS5jb3VudC0tO1xuICAgICAgICAgIGEuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBmaW5kIHRoZSBiaWdnZXN0IHBhcnRpdGlvbi5cbiAgICAgICAgICBsZXQgcGFydCE6IFNldDxHcmlkQ29vcmQ+O1xuICAgICAgICAgIGZvciAoY29uc3Qgc2V0IG9mIHBhcnRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoIXBhcnQgfHwgc2V0LnNpemUgPiBwYXJ0LnNpemUpIHBhcnQgPSBzZXQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIG1ha2Ugc3VyZSBhbGwgdGhlIGZpeGVkIHNjcmVlbnMgYXJlIGluIGl0LlxuICAgICAgICAgIGlmICghWy4uLmEuZml4ZWRdLmV2ZXJ5KGMgPT4gcGFydC5oYXMoYykpKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBjaGVjayB0aGF0IGl0J3MgYmlnIGVub3VnaC5cbiAgICAgICAgICBjb25zdCBjb3VudCA9IFsuLi5wYXJ0XS5maWx0ZXIoYyA9PiAoYyAmIDB4ODA4KSA9PSAweDgwOCkubGVuZ3RoO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coYHBhcnQ6ICR7Wy4uLnBhcnRdLm1hcCh4PT54LnRvU3RyaW5nKDE2KSkuam9pbignLCcpfSBjb3VudD0ke2NvdW50fWApO1xuICAgICAgICAgIGlmIChjb3VudCA8IGEuc2l6ZSkgY29udGludWU7XG4gICAgICAgICAgLy8gb2sgdG8gcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlZCsrO1xuICAgICAgICAgIGZpbGxlZCA9IHBhcnQ7XG4gICAgICAgICAgYS5jb3VudCA9IGNvdW50O1xuICAgICAgICAgIGEuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBwYXJ0cykge1xuICAgICAgICAgICAgaWYgKHYgIT09IHBhcnQpIGEuZ3JpZC5zZXQoaywgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFyZW1vdmVkKSB7XG4gICAgICAgIGlmICh0aGlzLmxvb3NlUmVmaW5lKSByZXR1cm4gT0s7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgcmVmaW5lICR7YS5jb3VudH0gPiAke2Euc2l6ZX1gfTtcbiAgICAgICAgLy9cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHJlbW92YWxNYXAoYTogQSwgY29vcmQ6IEdyaWRDb29yZCk6IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4ge1xuICAgIHJldHVybiBuZXcgTWFwKFtbY29vcmQsICcnXV0pO1xuICB9XG5cbiAgLyoqIFJlbW92ZSBvbmx5IGVkZ2VzLiBDYWxsZWQgYWZ0ZXIgcmVmaW5lKCkuICovXG4gIHJlZmluZUVkZ2VzKGE6IEEpOiBib29sZWFuIHtcbiAgICBsZXQgZWRnZXM6IEdyaWRDb29yZFtdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDAgYXMgR3JpZEluZGV4OyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghYS5ncmlkLmRhdGFbaV0pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY29vcmQgPSBhLmdyaWQuY29vcmQoaSk7XG4gICAgICBpZiAoYS5ncmlkLmlzQm9yZGVyKGNvb3JkKSB8fCBhLmZpeGVkLmhhcyhjb29yZCkpIGNvbnRpbnVlO1xuICAgICAgLy8gT25seSBhZGQgZWRnZXMuXG4gICAgICBpZiAoKGNvb3JkIF4gKGNvb3JkID4+IDgpKSAmIDgpIGVkZ2VzLnB1c2goY29vcmQpO1xuICAgIH1cbiAgICB0aGlzLnJhbmRvbS5zaHVmZmxlKGVkZ2VzKTtcbiAgICBjb25zdCBvcmlnID0gYS5ncmlkLnBhcnRpdGlvbihuZXcgTWFwKCkpO1xuICAgIGxldCBzaXplID0gb3JpZy5zaXplO1xuICAgIGNvbnN0IHBhcnRDb3VudCA9IG5ldyBTZXQob3JpZy52YWx1ZXMoKSkuc2l6ZTtcbiAgICBmb3IgKGNvbnN0IGUgb2YgZWRnZXMpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gYS5ncmlkLnBhcnRpdGlvbihuZXcgTWFwKFtbZSwgJyddXSkpO1xuICAgICAgLy9jb25zb2xlLmxvZyhgICBjb29yZDogJHtjb29yZC50b1N0cmluZygxNil9ID0+ICR7cGFydHMuc2l6ZX1gKTtcbiAgICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICAgIGNvbnN0IG9rID0gZmlyc3Quc2l6ZSA9PT0gcGFydHMuc2l6ZSA/XG4gICAgICAgICAgLy8gYSBzaW5nbGUgcGFydGl0aW9uIC0gbWFrZSBzdXJlIHdlIGRpZG4ndCBsb3NlIGFueXRoaW5nIGVsc2UuXG4gICAgICAgICAgcGFydHMuc2l6ZSA9PT0gc2l6ZSAtIDEgOlxuICAgICAgICAgIC8vIHJlcXVpcmUgbm8gbmV3IHBhcnRpdGlvbnNcbiAgICAgICAgICBuZXcgU2V0KHBhcnRzLnZhbHVlcygpKS5zaXplID09PSBwYXJ0Q291bnQgJiYgcGFydHMuc2l6ZSA9PT0gc2l6ZSAtIDE7XG4gICAgICBpZiAob2spIHtcbiAgICAgICAgc2l6ZS0tO1xuICAgICAgICBhLmdyaWQuc2V0KGUsICcnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogV2UgY2FuJ3QgaGFuZGxlIGEgdGlsZSAnIGMgfGMgIHwgICAnIHNvIGdldCByaWQgb2Ygb25lIG9yIHRoZVxuICAgKiBvdGhlciBvZiB0aGUgZWRnZXMuICBMZWF2ZSB0aWxlcyBvZiB0aGUgZm9ybSAnIGMgfCAgIHwgYyAnIHNpbmNlXG4gICAqIHRoYXQgd29ya3MgZmluZS4gIFRPRE8gLSBob3cgdG8gcHJlc2VydmUgJyA+IHwgICB8IDwgJz9cbiAgICovXG4gIHJlbW92ZVNwdXJzKGE6IEEpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IDB4ODA4IHwgeCA8PCA0KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KGMpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdXAgPSAoYyAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IGRvd24gPSAoYyArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IGxlZnQgPSAoYyAtIDB4OCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCByaWdodCA9IChjICsgMHg4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICgoYS5ncmlkLmdldCh1cCkgfHwgYS5ncmlkLmdldChkb3duKSkgJiZcbiAgICAgICAgICAgIChhLmdyaWQuZ2V0KGxlZnQpIHx8IGEuZ3JpZC5nZXQocmlnaHQpKSkge1xuICAgICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0SW50KDIpKSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KHVwLCAnJyk7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KGRvd24sICcnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYS5ncmlkLnNldChsZWZ0LCAnJyk7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vY29uc29sZS5sb2coYHJlbW92ZSAke3l9ICR7eH06XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlVGlnaHRMb29wcyhhOiBBKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBhLmggLSAxOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHkgPDwgMTIgfCAweDgwMDtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53IC0gMTsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gKHJvdyB8ICh4IDw8IDQpIHwgOCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5pc1RpZ2h0TG9vcChhLCBjb29yZCkpIHRoaXMuYnJlYWtUaWdodExvb3AoYSwgY29vcmQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlzVGlnaHRMb29wKHtncmlkfTogQSwgY29vcmQ6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGZvciAobGV0IGR5ID0gMDsgZHkgPCAweDE4MDA7IGR5ICs9IDB4ODAwKSB7XG4gICAgICBmb3IgKGxldCBkeCA9IDA7IGR4IDwgMHgxODsgZHggKz0gOCkge1xuICAgICAgICBjb25zdCBkZWx0YSA9IGR5IHwgZHhcbiAgICAgICAgaWYgKGRlbHRhID09PSAweDgwOCkgY29udGludWU7XG4gICAgICAgIGlmIChncmlkLmdldCgoY29vcmQgKyBkZWx0YSkgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYnJlYWtUaWdodExvb3AoYTogQSwgY29vcmQ6IEdyaWRDb29yZCkge1xuICAgIC8vIFBpY2sgYSBkZWx0YSAtIGVpdGhlciA4LCAxMDA4LCA4MDAsIDgxMFxuICAgIGNvbnN0IHIgPSB0aGlzLnJhbmRvbS5uZXh0SW50KDB4MTAwMDApO1xuICAgIGNvbnN0IGRlbHRhID0gciAmIDEgPyAociAmIDB4MTAwMCkgfCA4IDogKHIgJiAweDEwKSB8IDB4ODAwO1xuICAgIGEuZ3JpZC5zZXQoKGNvb3JkICsgZGVsdGEpIGFzIEdyaWRDb29yZCwgJycpO1xuICB9XG5cbiAgYWRkU3RhaXJzKGE6IEEsIHVwID0gMCwgZG93biA9IDApOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIEZpbmQgc3BvdHMgd2hlcmUgd2UgY2FuIGFkZCBzdGFpcnNcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT01KWRlYnVnZ2VyO1xuICAgIGNvbnN0IHN0YWlycyA9IFt1cCwgZG93bl07XG4gICAgaWYgKCFzdGFpcnNbMF0gJiYgIXN0YWlyc1sxXSkgcmV0dXJuIE9LOyAvLyBubyBzdGFpcnNcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGlmICghdGhpcy50cnlBZGRTdGFpcihhLCBjLCBzdGFpcnMpKSBjb250aW51ZTtcbiAgICAgIGlmICghc3RhaXJzWzBdICYmICFzdGFpcnNbMV0pIHJldHVybiBPSzsgLy8gbm8gc3RhaXJzXG4gICAgfVxuICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgc3RhaXJzYH07IC8vXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICB9XG5cbiAgYWRkRWFybHlTdGFpcihhOiBBLCBjOiBHcmlkQ29vcmQsIHN0YWlyOiBzdHJpbmcpOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPiB7XG4gICAgY29uc3QgbW9kczogQXJyYXk8W0dyaWRDb29yZCwgc3RyaW5nXT4gPSBbXTtcbiAgICBjb25zdCBsZWZ0ID0gYyAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gYyArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHVwID0gYyAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBkb3duID0gYyArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBsZXQgbmVpZ2hib3JzID0gW2MgLSA4LCBjICsgOF0gYXMgR3JpZENvb3JkW107XG4gICAgaWYgKHN0YWlyID09PSAnPCcpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKGRvd24pO1xuICAgICAgbW9kcy5wdXNoKFt1cCwgJyddKTtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KGxlZnQpID09PSAnYycgJiYgYS5ncmlkLmdldChyaWdodCkgPT09ICdjJyAmJlxuICAgICAgICAgIHRoaXMucmFuZG9tLm5leHRJbnQoMykpIHtcbiAgICAgICAgbW9kcy5wdXNoKFtkb3duLCAnJ10sIFtjLCAnPCddKTtcbiAgICAgICAgcmV0dXJuIG1vZHM7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdGFpciA9PT0gJz4nKSB7XG4gICAgICBuZWlnaGJvcnMucHVzaCh1cCk7XG4gICAgICBtb2RzLnB1c2goW2Rvd24sICcnXSk7XG4gICAgfVxuICAgIC8vIE5PVEU6IGlmIHdlIGRlbGV0ZSB0aGVuIHdlIGZvcmdldCB0byB6ZXJvIGl0IG91dC4uLlxuICAgIC8vIEJ1dCBpdCB3b3VsZCBzdGlsbCBiZSBuaWNlIHRvIFwicG9pbnRcIiB0aGVtIGluIHRoZSBlYXN5IGRpcmVjdGlvbj9cbiAgICAvLyBpZiAodGhpcy5kZWx0YSA8IC0xNikgbmVpZ2hib3JzLnNwbGljZSgyLCAxKTtcbiAgICAvLyBpZiAoKHRoaXMuZGVsdGEgJiAweGYpIDwgOCkgbmVpZ2hib3JzLnNwbGljZSgxLCAxKTtcbiAgICBuZWlnaGJvcnMgPSBuZWlnaGJvcnMuZmlsdGVyKGMgPT4gYS5ncmlkLmdldChjKSA9PT0gJ2MnKTtcbiAgICBpZiAoIW5laWdoYm9ycy5sZW5ndGgpIHJldHVybiBbXTtcbiAgICBjb25zdCBrZWVwID0gdGhpcy5yYW5kb20ubmV4dEludChuZWlnaGJvcnMubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5laWdoYm9ycy5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGogIT09IGtlZXApIG1vZHMucHVzaChbbmVpZ2hib3JzW2pdLCAnJ10pO1xuICAgIH1cbiAgICBtb2RzLnB1c2goW2MsIHN0YWlyXSk7XG4gICAgcmV0dXJuIG1vZHM7XG4gIH1cblxuICB0cnlBZGRTdGFpcihhOiBBLCBjOiBHcmlkQ29vcmQsIHN0YWlyczogbnVtYmVyW10pOiBib29sZWFuIHtcbiAgICBpZiAoYS5maXhlZC5oYXMoKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKTtcbiAgICBjb25zdCBib3RoID0gc3RhaXJzWzBdICYmIHN0YWlyc1sxXTtcbiAgICBjb25zdCB0b3RhbCA9IHN0YWlyc1swXSArIHN0YWlyc1sxXTtcbiAgICBjb25zdCB1cCA9IHRoaXMucmFuZG9tLm5leHRJbnQodG90YWwpIDwgc3RhaXJzWzBdO1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbdXAgPyAwIDogMV07XG4gICAgaWYgKGJvdGgpIGNhbmRpZGF0ZXMucHVzaCh1cCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHN0YWlyIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgIGNvbnN0IHN0YWlyQ2hhciA9ICc8Pidbc3RhaXJdO1xuICAgICAgY29uc3Qgc3RhaXJUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyBzdGFpckNoYXIgKyB0aWxlLnN1YnN0cmluZyg1KTtcbiAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHN0YWlyVGlsZSkubGVuZ3RoKSB7XG4gICAgICAgIGEuZ3JpZC5zZXQoKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkLCBzdGFpckNoYXIpO1xuICAgICAgICBzdGFpcnNbc3RhaXJdLS07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBtYWtlIGEgcGF0aCBjb25uZWN0aW5nIHN0YXJ0IHRvIGVuZCAoYm90aCBjZW50ZXJzKS5cbiAgICogUmVxdWlyZXMgYWxsIC4uLj9cbiAgICovXG4gIHRyeUNvbm5lY3QoYTogQSwgc3RhcnQ6IEdyaWRDb29yZCwgZW5kOiBHcmlkQ29vcmQsXG4gICAgICAgICAgICAgY2hhcjogc3RyaW5nLCBhdHRlbXB0cyA9IDEpOiBib29sZWFuIHtcbiAgICB3aGlsZSAoYXR0ZW1wdHMtLSA+IDApIHtcbiAgICAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPigpO1xuICAgICAgbGV0IHBvcyA9IHN0YXJ0O1xuICAgICAgaWYgKChzdGFydCAmIGVuZCAmIDB4ODA4KSAhPT0gMHg4MDgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBiYWQgc3RhcnQgJHtoZXgoc3RhcnQpfSBvciBlbmQgJHtoZXgoZW5kKX1gKTtcbiAgICAgIH1cbiAgICAgIHJlcGxhY2Uuc2V0KHBvcywgY2hhcik7XG4gICAgICB3aGlsZSAocG9zICE9PSBlbmQpIHtcbiAgICAgICAgLy8gb24gYSBjZW50ZXIgLSBmaW5kIGVsaWdpYmxlIGRpcmVjdGlvbnNcbiAgICAgICAgY29uc3QgZGlyczogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgWzgsIC04LCAweDgwMCwgLTB4ODAwXSkge1xuICAgICAgICAgIGNvbnN0IHBvczEgPSBwb3MgKyBkaXIgYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGNvbnN0IHBvczIgPSBwb3MgKyAyICogZGlyIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBpZiAoYS5maXhlZC5oYXMocG9zMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChyZXBsYWNlLmdldChwb3MyKSA/PyBhLmdyaWQuZ2V0KHBvczIpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoYS5ncmlkLmlzQm9yZGVyKHBvczEpKSBjb250aW51ZTtcbiAgICAgICAgICBkaXJzLnB1c2goZGlyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRpcnMubGVuZ3RoKSBicmVhaztcbiAgICAgICAgY29uc3QgZHkgPSAoZW5kID4+IDEyKSAtIChwb3MgPj4gMTIpXG4gICAgICAgIGNvbnN0IGR4ID0gKGVuZCAmIDB4ZjApIC0gKHBvcyAmIDB4ZjApO1xuICAgICAgICBjb25zdCBwcmVmZXJyZWQgPSBuZXcgU2V0PG51bWJlcj4oZGlycyk7XG4gICAgICAgIGlmIChkeSA8IDApIHByZWZlcnJlZC5kZWxldGUoMHg4MDApO1xuICAgICAgICBpZiAoZHkgPiAwKSBwcmVmZXJyZWQuZGVsZXRlKC0weDgwMCk7XG4gICAgICAgIGlmIChkeCA8IDApIHByZWZlcnJlZC5kZWxldGUoOCk7XG4gICAgICAgIGlmIChkeCA+IDApIHByZWZlcnJlZC5kZWxldGUoLTgpO1xuICAgICAgICAvLyAzOjEgYmlhcyBmb3IgcHJlZmVycmVkIGRpcmVjdGlvbnMgIChUT0RPIC0gYmFja3RyYWNraW5nPylcbiAgICAgICAgZGlycy5wdXNoKC4uLnByZWZlcnJlZCwgLi4ucHJlZmVycmVkKTtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5yYW5kb20ucGljayhkaXJzKTtcbiAgICAgICAgcmVwbGFjZS5zZXQocG9zICsgZGlyIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gICAgICAgIHJlcGxhY2Uuc2V0KHBvcyA9IHBvcyArIDIgKiBkaXIgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgICAgIH1cbiAgICAgIGlmIChwb3MgIT09IGVuZCkgY29udGludWU7XG4gICAgICAvLyBJZiB3ZSBnb3QgdGhlcmUsIG1ha2UgdGhlIGNoYW5nZXMuXG4gICAgICBmb3IgKGNvbnN0IFtjLCB2XSBvZiByZXBsYWNlKSB7XG4gICAgICAgIGEuZ3JpZC5zZXQoYywgdik7XG4gICAgICAgIGlmICgoYyAmIDB4ODA4KSA9PT0gMHg4MDgpIGEuY291bnQrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0cnlBZGRMb29wKGE6IEEsIGNoYXI6IHN0cmluZywgYXR0ZW1wdHMgPSAxKTogYm9vbGVhbiB7XG4gICAgLy8gcGljayBhIHBhaXIgb2YgY29vcmRzIGZvciBzdGFydCBhbmQgZW5kXG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gYS5ncmlkLmNvb3JkKGkgYXMgR3JpZEluZGV4KTtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KGMpIHx8IGEuZ3JpZC5pc0JvcmRlcihjKSkgY29udGludWU7XG4gICAgICBpZiAoIWEuZ3JpZC5nZXQoRShjKSkpIHVmLnVuaW9uKFtjLCBFKGMpXSk7XG4gICAgICBpZiAoIWEuZ3JpZC5nZXQoUyhjKSkpIHVmLnVuaW9uKFtjLCBTKGMpXSk7XG4gICAgfVxuICAgIGNvbnN0IGVsaWdpYmxlID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8dW5rbm93biwgW0dyaWRDb29yZCwgR3JpZENvb3JkXVtdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBzIG9mIGEuZ3JpZC5zY3JlZW5zKCkpIHtcbiAgICAgIGNvbnN0IGMgPSBzICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKCFhLmdyaWQuZ2V0KGMpKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgZCBvZiBbOCwgLTgsIDB4ODAwLCAtMHg4MDBdKSB7XG4gICAgICAgIGNvbnN0IGUxID0gYyArIGQgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoYS5ncmlkLmlzQm9yZGVyKGUxKSB8fCBhLmdyaWQuZ2V0KGUxKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGUyID0gYyArIDIgKiBkIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoZTIpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXAoW1tlMSBhcyBHcmlkQ29vcmQsIGNoYXJdXSk7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBzLCB7cmVwbGFjZX0pO1xuICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKS5sZW5ndGgpIHtcbiAgICAgICAgICBlbGlnaWJsZS5nZXQodWYuZmluZChlMikpLnB1c2goW2UxLCBlMl0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHdlaWdodGVkTWFwID0gbmV3IE1hcDxHcmlkQ29vcmQsIFtHcmlkQ29vcmQsIEdyaWRDb29yZF1bXT4oKTtcbiAgICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiBlbGlnaWJsZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKHBhcnRpdGlvbi5sZW5ndGggPCAyKSBjb250aW51ZTsgLy8gVE9ETyAtIDMgb3IgND9cbiAgICAgIGZvciAoY29uc3QgW2UxXSBvZiBwYXJ0aXRpb24pIHtcbiAgICAgICAgd2VpZ2h0ZWRNYXAuc2V0KGUxLCBwYXJ0aXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB3ZWlnaHRlZCA9IFsuLi53ZWlnaHRlZE1hcC52YWx1ZXMoKV07XG4gICAgaWYgKCF3ZWlnaHRlZC5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICB3aGlsZSAoYXR0ZW1wdHMtLSA+IDApIHtcbiAgICAgIGNvbnN0IHBhcnRpdGlvbiA9IHRoaXMucmFuZG9tLnBpY2sod2VpZ2h0ZWQpO1xuICAgICAgY29uc3QgW1tlMCwgYzBdLCBbZTEsIGMxXV0gPSB0aGlzLnJhbmRvbS5pc2h1ZmZsZShwYXJ0aXRpb24pO1xuICAgICAgYS5ncmlkLnNldChlMCwgY2hhcik7XG4gICAgICBhLmdyaWQuc2V0KGUxLCBjaGFyKTtcbiAgICAgIGlmICh0aGlzLnRyeUNvbm5lY3QoYSwgYzAsIGMxLCBjaGFyLCA1KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGEuZ3JpZC5zZXQoZTAsICcnKTtcbiAgICAgIGEuZ3JpZC5zZXQoZTEsICcnKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gZXh0ZW5kIGFuIGV4aXN0aW5nIHNjcmVlbiBpbnRvIGEgZGlyZWN0aW9uIHRoYXQnc1xuICAgKiBjdXJyZW50bHkgZW1wdHkuICBMZW5ndGggaXMgcHJvYmFiaWxpc3RpYywgZWFjaCBzdWNjZXNzZnVsXG4gICAqIGF0dGVtcHQgd2lsbCBoYXZlIGEgMS9sZW5ndGggY2hhbmNlIG9mIHN0b3BwaW5nLiAgUmV0dXJucyBudW1iZXJcbiAgICogb2Ygc2NyZWVucyBhZGRlZC5cbiAgICovXG4gIHRyeUV4dHJ1ZGUoYTogQSwgY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciwgYXR0ZW1wdHMgPSAxKTogbnVtYmVyIHtcbiAgICAvLyBMb29rIGZvciBhIHBsYWNlIHRvIHN0YXJ0LlxuICAgIHdoaWxlIChhdHRlbXB0cy0tKSB7XG4gICAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgICAgY29uc3QgbWlkID0gYyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKCFhLmdyaWQuZ2V0KG1pZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gICAgICAgIGZvciAobGV0IGRpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gICAgICAgICAgY29uc3QgbjEgPSBtaWQgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGNvbnN0IG4yID0gbWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4vL2NvbnNvbGUubG9nKGBtaWQ6ICR7bWlkLnRvU3RyaW5nKDE2KX07IG4xKCR7bjEudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChuMSl9OyBuMigke24yLnRvU3RyaW5nKDE2KX0pOiAke2EuZ3JpZC5nZXQobjIpfWApO1xuICAgICAgICAgIGlmIChhLmdyaWQuZ2V0KG4xKSB8fCBhLmdyaWQuaXNCb3JkZXIobjEpIHx8IGEuZ3JpZC5nZXQobjIpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMSwgY2hhcik7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4yLCBjaGFyKTtcbiAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoYSwgY2hhciwgbGVuZ3RoLCBuMik7XG4gICAgICAgICAgICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZDtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQobjIsICcnKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQobjEsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogUmVjdXJzaXZlIGF0dGVtcHQuICovXG4gIHRyeUNvbnRpbnVlRXh0cnVkZShhOiBBLCBjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLCBjOiBHcmlkQ29vcmQpOiBudW1iZXIge1xuICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICBjb25zdCBvayA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSkubGVuZ3RoID4gMDtcbiAgICBpZiAobGVuZ3RoID09PSAxKSByZXR1cm4gb2sgPyAxIDogMDtcbiAgICAvLyBtYXliZSByZXR1cm4gZWFybHlcbiAgICBpZiAob2sgJiYgIXRoaXMucmFuZG9tLm5leHRJbnQobGVuZ3RoKSkgcmV0dXJuIDE7XG4gICAgLy8gZmluZCBhIG5ldyBkaXJlY3Rpb25cbiAgICBmb3IgKGNvbnN0IGRpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gICAgICBjb25zdCBuMSA9IGMgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgbjIgPSBjICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoYS5ncmlkLmdldChuMSkgfHwgYS5ncmlkLmlzQm9yZGVyKG4xKSB8fCBhLmdyaWQuZ2V0KG4yKSkgY29udGludWU7XG4gICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgICAgICAgYS5ncmlkLnNldChuMSwgY2hhcik7XG4gICAgICAgIGEuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGEsIGNoYXIsIGxlbmd0aCAtIDEsIG4yKTtcbiAgICAgICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQgKyAxO1xuICAgICAgICBhLmdyaWQuc2V0KG4yLCAnJyk7XG4gICAgICAgIGEuZ3JpZC5zZXQobjEsICcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChvaykgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBvayA/IDEgOiAwO1xuICB9XG5cbiAgLyoqIEF0dGVtcHQgdG8gYWRkIGEgZ3JpZCB0eXBlLiAqL1xuICB0cnlBZGQoYTogQSwgb3B0czogQWRkT3B0cyA9IHt9KTogbnVtYmVyIHtcbiAgICAvLyBPcHRpb25hbGx5IHN0YXJ0IGF0IHRoZSBnaXZlbiBzY3JlZW4gb25seS5cbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5vcmlnLnRpbGVzZXQ7XG4gICAgY29uc3Qge2F0dGVtcHRzID0gMSwgY2hhciA9ICdjJywgc3RhcnQsIGxvb3AgPSBmYWxzZX0gPSBvcHRzO1xuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgYXR0ZW1wdHM7IGF0dGVtcHQrKykge1xuICAgICAgY29uc3Qgc3RhcnRJdGVyID1cbiAgICAgICAgICBzdGFydCAhPSBudWxsID9cbiAgICAgICAgICAgICAgWyhzdGFydCAmIDB4ZjBmMCkgYXMgR3JpZENvb3JkXSA6XG4gICAgICAgICAgICAgIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpO1xuICAgICAgZm9yIChjb25zdCBjIG9mIHN0YXJ0SXRlcikge1xuICAgICAgICBjb25zdCBtaWQgPSBjICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoIWEuZ3JpZC5nZXQobWlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKTtcbiAgICAgICAgZm9yIChsZXQgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgICAgICBjb25zdCBuMSA9IG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgbjIgPSBtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBpZiAoYS5maXhlZC5oYXMobjEpIHx8IGEuZml4ZWQuaGFzKG4yKSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgbzEgPSBhLmdyaWQuZ2V0KG4xKTtcbiAgICAgICAgICBjb25zdCBvMiA9IGEuZ3JpZC5nZXQobjIpO1xuLy9jb25zb2xlLmxvZyhgbWlkKCR7bWlkLnRvU3RyaW5nKDE2KX0pOiAke2EuZ3JpZC5nZXQobWlkKX07IG4xKCR7bjEudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChuMSl9OyBuMigke24yLnRvU3RyaW5nKDE2KX0pOiAke2EuZ3JpZC5nZXQobjIpfWApO1xuICAgICAgICAgIC8vIGFsbG93IG1ha2luZyBwcm9ncmVzcyBvbiB0b3Agb2YgYW4gZWRnZS1vbmx5IGNvbm5lY3Rpb24uXG4gICAgICAgICAgaWYgKChvMSAmJiAobzIgfHwgbzEgIT09IGNoYXIpKSB8fCBhLmdyaWQuaXNCb3JkZXIobjEpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoIWxvb3ApIHtcbiAgICAgICAgICAgIGNvbnN0IG5laWdoYm9yVGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIG4yIC0gMHg4MDggYXMgR3JpZENvb3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZXBsYWNlOiBuZXcgTWFwKFtbbjEsICcnXV0pfSk7XG4gICAgICAgICAgICBpZiAoL1xcUy8udGVzdChuZWlnaGJvclRpbGUpKSBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgICAgICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICAgICAgaWYgKHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICAgICAgYS5jb3VudCsrO1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMSwgY2hhcik7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4yLCBjaGFyKTtcbiAgICAgICAgICAgIC8vIGlmIChsZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAvLyAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoYSwgY2hhciwgbGVuZ3RoLCBuMik7XG4gICAgICAgICAgICAvLyAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5laWdoYm9yVGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIG4yIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICAgICAgICAgIGlmICh0aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcobmVpZ2hib3JUaWxlKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgYS5ncmlkLnNldChuMiwgbzIpO1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMSwgbzEpO1xuICAgICAgICAgICAgYS5jb3VudC0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8vIC8qKlxuICAvLyAgKiBBdHRlbXB0IHRvIGV4dGVuZCBhbiBleGlzdGluZyBzY3JlZW4gaW50byBhIGRpcmVjdGlvbiB0aGF0J3NcbiAgLy8gICogY3VycmVudGx5IGVtcHR5LiAgTGVuZ3RoIGlzIHByb2JhYmlsaXN0aWMsIGVhY2ggc3VjY2Vzc2Z1bFxuICAvLyAgKiBhdHRlbXB0IHdpbGwgaGF2ZSBhIDEvbGVuZ3RoIGNoYW5jZSBvZiBzdG9wcGluZy4gIFJldHVybnMgbnVtYmVyXG4gIC8vICAqIG9mIHNjcmVlbnMgYWRkZWQuXG4gIC8vICAqL1xuICAvLyB0cnlFeHRydWRlKGE6IEEsIGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGF0dGVtcHRzID0gMSk6IG51bWJlciB7XG4gIC8vICAgLy8gTG9vayBmb3IgYSBwbGFjZSB0byBzdGFydC5cbiAgLy8gICB3aGlsZSAoYXR0ZW1wdHMtLSkge1xuICAvLyAgICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gIC8vICAgICAgIGNvbnN0IG1pZCA9IGMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAgIGlmICghYS5ncmlkLmdldChtaWQpKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAvLyAgICAgICBmb3IgKGxldCBkaXIgb2YgWzAsIDEsIDIsIDNdKSB7XG4gIC8vICAgICAgICAgaWYgKGEuZ3JpZC5nZXQobWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQpKSBjb250aW51ZTtcbiAgLy8gICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAvLyAgICAgICAgIGlmICh0aWxlW2ldICE9PSAnICcpIGNvbnRpbnVlO1xuICAvLyAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgLy8gICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAvLyAgICAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShhLCBjaGFyLCBsZW5ndGgsIG1pZCwgZGlyKTtcbiAgLy8gICAgICAgICAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gMDtcbiAgLy8gfVxuXG4gIC8vIHRyeUNvbnRpbnVlRXh0cnVkZShhOiBBLCBjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLFxuICAvLyAgICAgICAgICAgICAgICAgICAgbWlkOiBHcmlkQ29vcmQsIGRpcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gICBjb25zdCByZXBsYWNlID0gbmV3IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4oW10pO1xuICAvLyAgIGxldCB3b3JrczogQXJyYXk8W0dyaWRDb29yZCwgc3RyaW5nXT58dW5kZWZpbmVkO1xuICAvLyAgIGxldCB3ZWlnaHQgPSAwO1xuICAvLyAgIE9VVEVSOlxuICAvLyAgIHdoaWxlICh0cnVlKSB7XG4gIC8vICAgICByZXBsYWNlLnNldChtaWQgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgLy8gICAgIHJlcGxhY2Uuc2V0KG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgLy8gICAgIG1pZCA9IChtaWQgKyAyICogR1JJRERJUltkaXJdKSBhcyBHcmlkQ29vcmQ7XG5cbiAgLy8gICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBtaWQgLSAweDgwOCBhcyBHcmlkQ29vcmQsIHtyZXBsYWNlfSk7XG4gIC8vICAgICB3ZWlnaHQrKztcbiAgLy8gICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAvLyAgICAgICB3b3JrcyA9IFsuLi5yZXBsYWNlXTtcbiAgLy8gICAgICAgLy8gd2UgY2FuIHF1aXQgbm93IC0gc2VlIGlmIHdlIHNob3VsZC5cbiAgLy8gICAgICAgd2hpbGUgKHdlaWdodCA+IDApIHtcbiAgLy8gICAgICAgICBpZiAoIXRoaXMucmFuZG9tLm5leHRJbnQobGVuZ3RoKSkgYnJlYWsgT1VURVI7XG4gIC8vICAgICAgICAgd2VpZ2h0LS07XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cblxuICAvLyAgICAgLy8gRmluZCBhIHZpYWJsZSBuZXh0IHN0ZXAuXG4gIC8vICAgICBmb3IgKGNvbnN0IG5leHREaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAvLyAgICAgICBjb25zdCBkZWx0YSA9IEdSSURESVJbbmV4dERpcl07XG4gIC8vICAgICAgIGNvbnN0IGVkZ2UgPSBtaWQgKyBkZWx0YSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoZWRnZSkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAocmVwbGFjZS5nZXQoLi4uKSB8fCBhLmdyaWQuZ2V0KG1pZCArIDIgKiBkZWx0YSBhcyBHcmlkQ29vcmQpKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgLy8gICAgICAgaWYgKHRpbGVbaV0gIT09ICcgJykgY29udGludWU7XG4gIC8vICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgLy8gICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgLy8gICAgICAgICByZXBsYWNlLnNldChtaWQgKyBkZWx0YSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgICAgIHJlcGxhY2Uuc2V0KG1pZCArIDIgKiBkZWx0YSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgICAgIGRpciA9IG5leHREaXI7XG4gIC8vICAgICAgICAgY29udGludWUgT1VURVI7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGJyZWFrOyAvLyBuZXZlciBmb3VuZCBhIGZvbGxvdy11cCwgc28gcXVpdFxuICAvLyAgIH1cbiAgLy8gICBpZiAoIXdvcmtzKSByZXR1cm4gMDtcbiAgLy8gICBmb3IgKGNvbnN0IFtjLCB2XSBvZiB3b3Jrcykge1xuICAvLyAgICAgYS5ncmlkLnNldChjLCB2KTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHdvcmtzLmxlbmd0aCA+Pj4gMTtcbiAgLy8gfVxuXG4gIC8qKiBNYWtlIGFycmFuZ2VtZW50cyB0byBtYXhpbWl6ZSB0aGUgc3VjY2VzcyBjaGFuY2VzIG9mIGluZmVyLiAqL1xuICBwcmVpbmZlcihhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmICh0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3Bpa2UpIHtcbiAgICAgIGlmICgocmVzdWx0ID0gdGhpcy5wcmVpbmZlclNwaWtlcyhhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHByZWluZmVyU3Bpa2VzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIGEgJ2MnIGFib3ZlIGVhY2ggJ3MnXG4gICAgLy8gY2hlY2sgc2lkZXM/XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgaW5mZXJTY3JlZW5zKGE6IEEpOiBSZXN1bHQ8TWV0YWxvY2F0aW9uPiB7XG4gICAgY29uc3Qgc2NyZWVuczogTWV0YXNjcmVlbltdID0gW107XG4gICAgZm9yIChjb25zdCBzIG9mIGEuZ3JpZC5zY3JlZW5zKCkpIHtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBzKTtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPVxuICAgICAgICAgIHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSlcbiAgICAgICAgICAgICAgLmZpbHRlcihzID0+ICFzLmRhdGEubW9kKTtcbiAgICAgIGlmICghY2FuZGlkYXRlcy5sZW5ndGgpIHtcbiAgICAgICAgLy9jb25zb2xlLmVycm9yKGEuZ3JpZC5zaG93KCkpO1xuaWYgKGEuZ3JpZC5zaG93KCkubGVuZ3RoID4gMTAwMDAwKSBkZWJ1Z2dlcjtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBpbmZlciBzY3JlZW4gJHtoZXgocyl9OiBbJHt0aWxlfV1cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgICBjb25zdCBwaWNrID0gdGhpcy5yYW5kb20ucGljayhjYW5kaWRhdGVzKTtcbiAgICAgIHNjcmVlbnMucHVzaChwaWNrKTtcbiAgICAgIGlmIChwaWNrLmhhc0ZlYXR1cmUoJ3dhbGwnKSkgYS53YWxscysrO1xuICAgICAgaWYgKHBpY2suaGFzRmVhdHVyZSgnYnJpZGdlJykpIGEuYnJpZGdlcysrO1xuXG4gICAgICAvLyBUT0RPIC0gYW55IG90aGVyIGZlYXR1cmVzIHRvIHRyYWNrP1xuXG4gICAgfVxuXG4gICAgbGV0IGFsbEVtcHR5ID0gdHJ1ZTtcbiAgICBjb25zdCBtZXRhID0gbmV3IE1ldGFsb2NhdGlvbih0aGlzLnBhcmFtcy5pZCwgdGhpcy5vcmlnLnRpbGVzZXQsIGEuaCwgYS53KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIGNvbnN0IHNjciA9IHNjcmVlbnNbeSAqIGEudyArIHhdO1xuICAgICAgICBtZXRhLnNldCh5IDw8IDQgfCB4LCBzY3IpO1xuICAgICAgICBpZiAoIXNjci5pc0VtcHR5KCkpIGFsbEVtcHR5ID0gZmFsc2U7XG4gICAgICAgIGlmICh5KSB7XG4gICAgICAgICAgY29uc3QgYWJvdmUgPSBtZXRhLmdldCgoeSAtIDEpIDw8IDQgfCB4KTtcbiAgICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuaXNCYW5uZWRWZXJ0aWNhbChhYm92ZSwgc2NyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBiYWQgdmVydGljYWwgbmVpZ2hib3I6ICR7YWJvdmV9ICR7c2NyfWB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoeCkge1xuICAgICAgICAgIGNvbnN0IGxlZnQgPSBtZXRhLmdldCh5IDw8IDQgfCAoeCAtIDEpKTtcbiAgICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuaXNCYW5uZWRIb3Jpem9udGFsKGxlZnQsIHNjcikpIHtcbiAgICAgICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgYmFkIGhvcml6b250YWwgbmVpZ2hib3I6ICR7bGVmdH0gJHtzY3J9YH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChhbGxFbXB0eSkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBhbGwgc2NyZWVucyBlbXB0eWB9O1xuXG4gICAgcmV0dXJuIHtvazogdHJ1ZSwgdmFsdWU6IG1ldGF9O1xuICB9XG5cbiAgcmVmaW5lTWV0YXNjcmVlbnMoYTogQSwgbWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSB0aGUgcmlnaHQgbnVtYmVyIG9mIHdhbGxzIGFuZCBicmlkZ2VzXG4gICAgLy8gYS53YWxscyA9IGEuYnJpZGdlcyA9IDA7IC8vIFRPRE8gLSBkb24ndCBib3RoZXIgbWFraW5nIHRoZXNlIGluc3RhbmNlXG4gICAgLy8gZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgIC8vICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAvLyAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIHtjb25zb2xlLndhcm4oaGV4KHBvcykpOyBhLmJyaWRnZXMrKzt9XG4gICAgLy8gICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkgYS53YWxscysrO1xuICAgIC8vIH1cbiAgICBjb25zdCBicmlkZ2VzID0gdGhpcy5wYXJhbXMuZmVhdHVyZXM/LmJyaWRnZSB8fCAwO1xuICAgIGNvbnN0IHdhbGxzID0gdGhpcy5wYXJhbXMuZmVhdHVyZXM/LndhbGwgfHwgMDtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShtZXRhLmFsbFBvcygpKSkge1xuICAgICAgY29uc3QgYyA9ICgocG9zIDw8IDggfCBwb3MgPDwgNCkgJiAweGYwZjApIGFzIEdyaWRDb29yZDtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKVxuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGlmIChhLmJyaWRnZXMgPD0gYnJpZGdlcyAmJiBzY3IuaGFzRmVhdHVyZSgnYnJpZGdlJykpIGNvbnRpbnVlO1xuICAgICAgaWYgKHRoaXMuYWRkQmxvY2tzICYmXG4gICAgICAgICAgdGhpcy50cnlNZXRhKG1ldGEsIHBvcywgdGhpcy5vcmlnLnRpbGVzZXQud2l0aE1vZCh0aWxlLCAnYmxvY2snKSkpIHtcbiAgICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgYS5icmlkZ2VzLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge1xuICAgICAgICBpZiAodGhpcy50cnlNZXRhKG1ldGEsIHBvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICdicmlkZ2UnKSkpIHtcbiAgICAgICAgICBhLmJyaWRnZXMtLTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgLy8gfSBlbHNlIGlmIChicmlkZ2VzIDwgYS5icmlkZ2VzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge1xuICAgICAgLy8gICAvLyBjYW4ndCBhZGQgYnJpZGdlcz9cbiAgICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGEud2FsbHMgPCB3YWxscyAmJiAhc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkge1xuICAgICAgICBpZiAodGhpcy50cnlNZXRhKG1ldGEsIHBvcywgdGhpcy5vcmlnLnRpbGVzZXQud2l0aE1vZCh0aWxlLCAnd2FsbCcpKSkge1xuICAgICAgICAgIGEud2FsbHMrKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zb2xlLndhcm4oYGJyaWRnZXMgJHthLmJyaWRnZXN9ICR7YnJpZGdlc30gLyB3YWxscyAke2Eud2FsbHN9ICR7d2FsbHN9XFxuJHthLmdyaWQuc2hvdygpfVxcbiR7bWV0YS5zaG93KCl9YCk7XG4gICAgaWYgKGEuYnJpZGdlcyAhPT0gYnJpZGdlcykge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgIGZhaWw6IGByZWZpbmVNZXRhIGJyaWRnZXMgd2FudCAke2JyaWRnZXN9IGdvdCAke2EuYnJpZGdlc31cXG4ke21ldGEuc2hvdygpfWB9O1xuICAgIH1cbiAgICBpZiAoYS53YWxscyAhPT0gd2FsbHMpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLFxuICAgICAgICAgICAgICBmYWlsOiBgcmVmaW5lTWV0YSB3YWxscyB3YW50ICR7d2FsbHN9IGdvdCAke2Eud2FsbHN9XFxuJHttZXRhLnNob3coKX1gfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgdHJ5TWV0YShtZXRhOiBNZXRhbG9jYXRpb24sIHBvczogUG9zLFxuICAgICAgICAgIHNjcmVlbnM6IEl0ZXJhYmxlPE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBzIG9mIHNjcmVlbnMpIHtcbiAgICAgIGlmICghdGhpcy5jaGVja01ldGEobWV0YSwgbmV3IE1hcChbW3Bvcywgc11dKSkpIGNvbnRpbnVlO1xuICAgICAgbWV0YS5zZXQocG9zLCBzKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjaGVja01ldGEobWV0YTogTWV0YWxvY2F0aW9uLCByZXBsYWNlbWVudHM/OiBNYXA8UG9zLCBNZXRhc2NyZWVuPik6IGJvb2xlYW4ge1xuXG4gICAgLy8gVE9ETyAtIGZsaWdodD8gIG1heSBoYXZlIGEgZGlmZiAjIG9mIGZsaWdodCB2cyBub24tZmxpZ2h0IHBhcnRpdGlvbnNcbiAgICBjb25zdCBvcHRzID0gcmVwbGFjZW1lbnRzID8ge3dpdGg6IHJlcGxhY2VtZW50c30gOiB7fTtcbiAgICBjb25zdCBwYXJ0cyA9IG1ldGEudHJhdmVyc2Uob3B0cyk7XG4gICAgcmV0dXJuIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHRoaXMubWF4UGFydGl0aW9ucztcbiAgfVxuXG4gIHJlcXVpcmVFbGlnaWJsZVBpdERlc3RpbmF0aW9uKG1ldGE6IE1ldGFsb2NhdGlvbik6IGJvb2xlYW4ge1xuICAgIGxldCB2ID0gZmFsc2U7XG4gICAgbGV0IGggPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyaXZlcicpIHx8IHNjci5oYXNGZWF0dXJlKCdlbXB0eScpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGVkZ2VzID1cbiAgICAgICAgKHNjci5kYXRhLmVkZ2VzIHx8ICcnKS5zcGxpdCgnJykubWFwKHggPT4geCA9PT0gJyAnID8gJycgOiB4KTtcbiAgICAgIGlmIChlZGdlc1swXSAmJiBlZGdlc1syXSkgdiA9IHRydWU7XG4gICAgICAvLyBOT1RFOiB3ZSBjbGFtcCB0aGUgdGFyZ2V0IFggY29vcmRzIHNvIHRoYXQgc3Bpa2Ugc2NyZWVucyBhcmUgYWxsIGdvb2RcbiAgICAgIC8vIHRoaXMgcHJldmVudHMgZXJyb3JzIGZyb20gbm90IGhhdmluZyBhIHZpYWJsZSBkZXN0aW5hdGlvbiBzY3JlZW4uXG4gICAgICBpZiAoKGVkZ2VzWzFdICYmIGVkZ2VzWzNdKSB8fCBzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHtcbiAgICAgICAgaCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAodiAmJiBoKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY2hlY2tNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGlmICghdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnN0YXR1ZSkgcmV0dXJuIE9LO1xuICAgIGxldCBzdGF0dWVzID0gMDtcbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgc3RhdHVlcyArPSBzY3IuZGF0YS5zdGF0dWVzPy5sZW5ndGggfHwgMDtcbiAgICB9XG4gICAgaWYgKHN0YXR1ZXMgPCB0aGlzLnBhcmFtcy5mZWF0dXJlcy5zdGF0dWUpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgaW5zdWZmaWNpZW50IHN0YXR1ZSBzY3JlZW5zYH07XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxufVxuXG4vLyBUT0RPOlxuLy8gIC0gd2hlbiB0aGVyZSdzIGEgYnJpZGdlLCBuZXcgcnVsZSB0byByZXF1aXJlIGEgc3RhaXIgb3IgcG9pXG4vLyAgICB0byBiZSBwYXJ0aXRpb25lZCBvZmYgaWYgYnJpZGdlIHRpbGUgaXMgcmVtb3ZlZFxuLy8gIC0gcG9zc2libHkgYWxzbyAqbGluayogdG8gb3RoZXIgc2NyZWVuP1xuLy8gIC0gcGxhY2UgYnJpZGdlIGVhcmx5IG9yIGxhdGU/XG4vLyAgICAtIGlmIGVhcmx5IHRoZW4gbm8gd2F5IHRvIGVuZm9yY2UgdGhyb3VnaG5lc3MgcnVsZVxuLy8gICAgLSBpZiBsYXRlIHRoZW4gaGFyZCB0byBzeW5jIHVwIHdpdGggb3RoZXIgZmxvb3Jcbi8vIEFMU08sIHdlIGRvbid0IGhhdmUgYSByZWYgdG8gdGhlIHRpbGVzZXQgcmlnaHQgbm93LCBkb24ndCBldmVuXG4vLyBrbm93IHdoYXQgdGhlIHRpbGVzIGFyZSEgIE5lZWQgdG8gbWFwIHRoZSAzeDMgZ3JpZCBvZiAoPz8pIHRvXG4vLyBtZXRhdGlsZXMuXG4vLyAgLSBjb25zaWRlciB1cGRhdGluZyBcImVkZ2VcIiB0byBiZSB3aG9sZSA5eDk/XG4vLyAgICAgJyBjIC9jY2MvICAgJ1xuLy8gICAgIGNhdmUoJ2NjIGMnLCAnYycpXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHwgYyB8XG4vLyAgICAgICB8Y2NjfFxuLy8gICAgICAgfCAgIHxgLFxuLy9cbi8vICAgICB0aWxlYFxuLy8gICAgICAgfCAgIHxcbi8vICAgICAgIHxjdSB8XG4vLyAgICAgICB8ICAgfGAsXG4vL1xuLy8gQmFzaWMgaWRlYSB3b3VsZCBiZSB0byBzaW1wbGlmeSB0aGUgXCJmZWF0dXJlc1wiIGJpdCBxdWl0ZSBhIGJpdCxcbi8vIGFuZCBlbmNhcHN1bGF0ZSB0aGUgd2hvbGUgdGhpbmcgaW50byB0aGUgdGlsZSAtIGVkZ2VzLCBjb3JuZXJzLCBjZW50ZXIuXG4vL1xuLy8gRm9yIG92ZXJ3b3JsZCwgJ28nIG1lYW5zIG9wZW4sICdnJyBmb3IgZ3Jhc3MsIGV0Yy4uLj9cbi8vIC0gdGhlbiB0aGUgbGV0dGVycyBhcmUgYWx3YXlzIHRoZSB3YWxrYWJsZSB0aWxlcywgd2hpY2ggbWFrZXMgc2Vuc2Vcbi8vICAgc2luY2UgdGhvc2UgYXJlIHRoZSBvbmVzIHRoYXQgaGF2ZSBhbGwgdGhlIHZhcmlldHkuXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfCAgIHxgLFxuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8b28gfFxuLy8gICAgICAgfG9vb3xcbi8vICAgICAgIHxvZ298YCxcblxuLy8gZXhwb3J0IGNsYXNzIENhdmVTaHVmZmxlQXR0ZW1wdCBleHRlbmRzIE1hemVTaHVmZmxlQXR0ZW1wdCB7XG5cbi8vICAgcmVhZG9ubHkgdGlsZXNldDogTWV0YXRpbGVzZXQ7XG4vLyAgIHJlYWRvbmx5IGdyaWQ6IEdyaWQ8c3RyaW5nPjtcbi8vICAgcmVhZG9ubHkgZml4ZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbi8vICAgcmVhZG9ubHkgc2NyZWVuczogcmVhZG9ubHkgR3JpZENvb3JkW10gPSBbXTtcbi8vICAgbWV0YSE6IE1ldGFsb2NhdGlvbjtcbi8vICAgY291bnQgPSAwO1xuLy8gICB3YWxscyA9IDA7XG4vLyAgIGJyaWRnZXMgPSAwO1xuLy8gICBtYXhQYXJ0aXRpb25zID0gMTtcbi8vICAgbWluU3Bpa2VzID0gMjtcblxuLy8gICBjb25zdHJ1Y3RvcihyZWFkb25seSBoOiBudW1iZXIsIHJlYWRvbmx5IHc6IG51bWJlcixcbi8vICAgICAgICAgICAgICAgcmVhZG9ubHkgcGFyYW1zOiBTdXJ2ZXksIHJlYWRvbmx5IHJhbmRvbTogUmFuZG9tKSB7XG4vLyAgICAgc3VwZXIoKTtcbi8vICAgICB0aGlzLmdyaWQgPSBuZXcgR3JpZChoLCB3KTtcbi8vICAgICB0aGlzLmdyaWQuZGF0YS5maWxsKCcnKTtcbi8vICAgICBmb3IgKGxldCB5ID0gMC41OyB5IDwgaDsgeSsrKSB7XG4vLyAgICAgICBmb3IgKGxldCB4ID0gMC41OyB4IDwgdzsgeCsrKSB7XG4vLyAgICAgICAgIGlmICh5ID4gMSkgdGhpcy5ncmlkLnNldDIoeSAtIDAuNSwgeCwgJ2MnKTtcbi8vICAgICAgICAgaWYgKHggPiAxKSB0aGlzLmdyaWQuc2V0Mih5LCB4IC0gMC41LCAnYycpO1xuLy8gICAgICAgICB0aGlzLmdyaWQuc2V0Mih5LCB4LCAnYycpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgICB0aGlzLmNvdW50ID0gaCAqIHc7XG4vLyAgICAgY29uc3Qgc2NyZWVuczogR3JpZENvb3JkW10gPSBbXTtcbi8vICAgICBmb3IgKGxldCB5ID0gMDsgeSA8IHRoaXMuaDsgeSsrKSB7XG4vLyAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMudzsgeCsrKSB7XG4vLyAgICAgICAgIHNjcmVlbnMucHVzaCgoeSA8PCAxMiB8IHggPDwgNCkgYXMgR3JpZENvb3JkKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgICAgdGhpcy5zY3JlZW5zID0gc2NyZWVucztcbi8vICAgfVxuXG5cbiAgLy8gY2hlY2tSZWFjaGFiaWxpdHkocmVwbGFjZT86IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4pOiBib29sZWFuIHtcbiAgLy8gICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgLy8gfVxuXG5cbmV4cG9ydCBjbGFzcyBXaWRlQ2F2ZVNodWZmbGUgZXh0ZW5kcyBDYXZlU2h1ZmZsZSB7XG4gIGFkZExhdGVGZWF0dXJlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0ID0gc3VwZXIuYWRkTGF0ZUZlYXR1cmVzKGEpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGEuZ3JpZC5kYXRhID0gYS5ncmlkLmRhdGEubWFwKGMgPT4gYyA9PT0gJ2MnID8gJ3cnIDogYyk7XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDcnlwdEVudHJhbmNlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgcmVmaW5lTWV0YXNjcmVlbnMoYTogQSwgbWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBjaGFuZ2UgYXJlbmEgaW50byBjcnlwdCBhcmVuYVxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgYS5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53OyB4KyspIHtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkKSA9PT0gJ2EnKSB7XG4gICAgICAgICAgbWV0YS5zZXQoeSA8PCA0IHwgeCwgbWV0YS5yb20ubWV0YXNjcmVlbnMuY3J5cHRBcmVuYV9zdGF0dWVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucmVmaW5lTWV0YXNjcmVlbnMoYSwgbWV0YSk7XG4gIH1cblxuICBpc0VsaWdpYmxlQXJlbmEoYTogQSwgYzogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICFhLmdyaWQuZ2V0KGMgLSAweDgwMCBhcyBHcmlkQ29vcmQpICYmIHN1cGVyLmlzRWxpZ2libGVBcmVuYShhLCBjKTtcbiAgfVxufVxuXG5jb25zdCBUSUxFRElSID0gWzEsIDMsIDcsIDVdO1xuY29uc3QgR1JJRERJUiA9IFstMHg4MDAsIC04LCAweDgwMCwgOF07XG5cbi8vIFRoaXMgbWlnaHQgY292ZXIgYWxsIG9mIHRyeUV4dHJ1ZGUsIHRyeUNvbnRpbnVlRXh0cnVkZSwgdHJ5Q29ubmVjdFxuLy8gIC0gY291bGQgYWxzbyBmaW5kIGEgd2F5IHRvIGFkZCB0cnlBZGRMb29wP1xuaW50ZXJmYWNlIEFkZE9wdHMge1xuICBjaGFyPzogc3RyaW5nO1xuICAvLyBsZW5ndGg6IG51bWJlcjtcbiAgc3RhcnQ/OiBHcmlkQ29vcmQ7XG4gIC8vIGVuZDogR3JpZENvb3JkO1xuICBsb29wPzogYm9vbGVhbjsgLy8gYWxsb3cgdnMgcmVxdWlyZT9cblxuICBhdHRlbXB0cz86IG51bWJlcjtcblxuICAvLyBicmFuY2g6IGJvb2xlYW47XG4gIC8vIHJlZHVjZVBhcnRpdGlvbnM6IGJvb2xlYW47ICAtLSBvciBwcm92aWRlIGEgXCJzbWFydCBwaWNrIHN0YXJ0L2VuZFwiIHdyYXBwZXJcblxuICAvLyBUT0RPIC0gc29tZSBpZGVhIG9mIHdoZXRoZXIgdG8gcHJlZmVyIGV4dGVuZGluZyBhbiBleGlzdGluZ1xuICAvLyBkZWFkIGVuZCBvciBub3QgLSB0aGlzIHdvdWxkIHByb3ZpZGUgc29tZSBzb3J0IG9mIFwiYnJhbmNoaW5nIGZhY3RvclwiXG4gIC8vIHdoZXJlYnkgd2UgY2FuIHRpZ2h0bHkgY29udHJvbCBob3cgbWFueSBkZWFkIGVuZHMgd2UgZ2V0Li4uP1xuICAvLyBQcm92aWRlIGEgXCJmaW5kIGRlYWQgZW5kc1wiIGZ1bmN0aW9uP1xuICAvLyAgIC0gaW1hZ2luZSBhIHZlcnNpb24gb2Ygd2luZG1pbGwgY2F2ZSB3aGVyZSB3ZSB3YW5kZXIgdHdvIHNjcmVlbnMsXG4gIC8vICAgICB0aGVuIGNvbm5lY3QgdGhlIGRlYWQgZW5kcywgdGhlbiBicmFuY2ggYW5kIHdhbmRlciBhIGxpdHRsZSBtb3JlP1xufVxuXG4vLyBUT0RPIC0gcG90ZW50aWFsbHkgd2UgY291bGQgbG9vayBhdCB0aGUgd2hvbGUgcHJvYmxlbVxuLy8gYXMgbWFraW5nIGEgbGlzdCBvZiBleHRydWRlL2ZlYXR1cmUgdHlwZXM6XG4vLyAgIC0gciwgYywgYnJhbmNoLCBhcmVuYSwgYnJpZGdlLCBzdGFpciwgLi4uP1xuLy8gbnVjbGVhdGUgdy8gYW55IGVkZ2VzLCBoYXZlIGEgbGlzdCBvZiB0aGVzZSBvcGVyYXRpb25zIGFuZCB0aGVuXG4vLyB0cnkgZWFjaCBvbmUsIGlmIGl0IGRvZXNuJ3Qgd29yaywgcmVzaHVmZmxlIGl0IGxhdGVyIChmaXhlZCAjIG9mIGRyYXdzXG4vLyBiZWZvcmUgZ2l2aW5nIHVwKS5cbiJdfQ==