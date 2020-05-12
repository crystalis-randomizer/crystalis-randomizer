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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBd0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxZQUFZLEVBQU8sTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUEyQixFQUFFLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUV4QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBSWpCLE1BQU0sT0FBTyxrQkFBa0I7SUFXN0IsWUFBcUIsQ0FBUyxFQUFXLENBQVMsRUFDN0IsSUFBWTtRQURaLE1BQUMsR0FBRCxDQUFDLENBQVE7UUFBVyxNQUFDLEdBQUQsQ0FBQyxDQUFRO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQVE7UUFWeEIsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFHdEMsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixVQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFlBQU8sR0FBRyxDQUFDLENBQUM7UUFJVixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUIsQ0FBQztDQUNGO0FBRUQsTUFBTSxP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QUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxlQUFlLENBQUMsQ0FBSSxFQUFFLENBQVk7UUFDaEMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFrQixDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEdyaWQsIEdyaWRDb29yZCwgR3JpZEluZGV4LCBFLCBTIH0gZnJvbSAnLi9ncmlkLmpzJztcbmltcG9ydCB7IHNlcSwgaGV4IH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHsgTWV0YXNjcmVlbiB9IGZyb20gJy4uL3JvbS9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7IE1ldGFsb2NhdGlvbiwgUG9zIH0gZnJvbSAnLi4vcm9tL21ldGFsb2NhdGlvbi5qcyc7XG5pbXBvcnQgeyBNYXplU2h1ZmZsZSwgQXR0ZW1wdCwgU3VydmV5LCBSZXN1bHQsIE9LIH0gZnJvbSAnLi4vbWF6ZS9tYXplLmpzJztcbmltcG9ydCB7IFVuaW9uRmluZCB9IGZyb20gJy4uL3VuaW9uZmluZC5qcyc7XG5pbXBvcnQgeyBEZWZhdWx0TWFwIH0gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmNvbnN0IFtdID0gW2hleF07XG5cbnR5cGUgQSA9IENhdmVTaHVmZmxlQXR0ZW1wdDtcblxuZXhwb3J0IGNsYXNzIENhdmVTaHVmZmxlQXR0ZW1wdCBpbXBsZW1lbnRzIEF0dGVtcHQge1xuICByZWFkb25seSBncmlkOiBHcmlkPHN0cmluZz47XG4gIHJlYWRvbmx5IGZpeGVkID0gbmV3IFNldDxHcmlkQ29vcmQ+KCk7XG5cbiAgLy8gQ3VycmVudCBzaXplIGFuZCBudW1iZXIgb2Ygd2FsbHMvYnJpZGdlcy5cbiAgcml2ZXJzID0gMDtcbiAgd2lkZXMgPSAwO1xuICBjb3VudCA9IDA7XG4gIHdhbGxzID0gMDtcbiAgYnJpZGdlcyA9IDA7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgaDogbnVtYmVyLCByZWFkb25seSB3OiBudW1iZXIsXG4gICAgICAgICAgICAgIHJlYWRvbmx5IHNpemU6IG51bWJlcikge1xuICAgIHRoaXMuZ3JpZCA9IG5ldyBHcmlkKGgsIHcpO1xuICAgIHRoaXMuZ3JpZC5kYXRhLmZpbGwoJycpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDYXZlU2h1ZmZsZSBleHRlbmRzIE1hemVTaHVmZmxlIHtcblxuICBtYXhQYXJ0aXRpb25zID0gMTtcbiAgbWluU3Bpa2VzID0gMjtcbiAgbWF4U3Bpa2VzID0gNTtcbiAgbG9vc2VSZWZpbmUgPSBmYWxzZTtcbiAgYWRkQmxvY2tzID0gdHJ1ZTtcbiAgcHJpdmF0ZSBfcmVxdWlyZVBpdERlc3RpbmF0aW9uID0gZmFsc2U7XG5cbiAgcmVxdWlyZVBpdERlc3RpbmF0aW9uKCk6IHRoaXMge1xuICAgIHRoaXMuX3JlcXVpcmVQaXREZXN0aW5hdGlvbiA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzaHVmZmxlKGxvYzogTG9jYXRpb24sIHJhbmRvbTogUmFuZG9tKSB7XG4gIC8vICAgY29uc3QgbWV0YSA9IGxvYy5tZXRhO1xuICAvLyAgIGNvbnN0IHN1cnZleSA9IHRoaXMuc3VydmV5KG1ldGEpO1xuICAvLyAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgMTAwOyBhdHRlbXB0KyspIHtcbiAgLy8gICAgIGNvbnN0IHdpZHRoID1cbiAgLy8gICAgICAgICBNYXRoLm1heCgxLCBNYXRoLm1pbig4LCBsb2MubWV0YS53aWR0aCArXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigocmFuZG9tLm5leHRJbnQoNikgLSAxKSAvIDMpKSk7XG4gIC8vICAgICBjb25zdCBoZWlnaHQgPVxuICAvLyAgICAgICAgIE1hdGgubWF4KDEsIE1hdGgubWluKDE2LCBsb2MubWV0YS5oZWlnaHQgK1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoKHJhbmRvbS5uZXh0SW50KDYpIC0gMSkgLyAzKSkpO1xuICAvLyAgICAgY29uc3Qgc2h1ZmZsZSA9IG5ldyBDYXZlU2h1ZmZsZUF0dGVtcHQoaGVpZ2h0LCB3aWR0aCwgc3VydmV5LCByYW5kb20pO1xuICAvLyAgICAgY29uc3QgcmVzdWx0ID0gc2h1ZmZsZS5idWlsZCgpO1xuICAvLyAgICAgaWYgKHJlc3VsdCkge1xuICAvLyAgICAgICBpZiAobG9jLmlkID09PSAweDMxKSBjb25zb2xlLmVycm9yKGBTaHVmZmxlIGZhaWxlZDogJHtyZXN1bHR9YCk7XG4gIC8vICAgICB9IGVsc2Uge1xuICAvLyAgICAgICB0aGlzLmZpbmlzaChsb2MsIHNodWZmbGUubWV0YSwgcmFuZG9tKTtcbiAgLy8gICAgICAgcmV0dXJuO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICB0aHJvdyBuZXcgRXJyb3IoYENvbXBsZXRlbHkgZmFpbGVkIHRvIG1hcCBzaHVmZmxlICR7bG9jfWApO1xuICAvLyB9XG5cbiAgc3VydmV5KG1ldGE6IE1ldGFsb2NhdGlvbik6IFN1cnZleSB7XG4gICAgLy8gdGFrZSBhIHN1cnZleS5cbiAgICBjb25zdCBzdXJ2ZXkgPSB7XG4gICAgICBtZXRhLFxuICAgICAgaWQ6IG1ldGEuaWQsXG4gICAgICB0aWxlc2V0OiBtZXRhLnRpbGVzZXQsXG4gICAgICBzaXplOiAwLFxuICAgICAgZWRnZXM6IFswLCAwLCAwLCAwXSxcbiAgICAgIHN0YWlyczogWzAsIDBdLFxuICAgICAgZmVhdHVyZXM6IHtcbiAgICAgICAgYXJlbmE6IDAsXG4gICAgICAgIGJyaWRnZTogMCxcbiAgICAgICAgb3ZlcjogMCxcbiAgICAgICAgcGl0OiAwLFxuICAgICAgICByYW1wOiAwLFxuICAgICAgICByaXZlcjogMCxcbiAgICAgICAgc3Bpa2U6IDAsXG4gICAgICAgIHN0YXR1ZTogMCxcbiAgICAgICAgdW5kZXI6IDAsXG4gICAgICAgIHdhbGw6IDAsXG4gICAgICAgIHdpZGU6IDAsXG4gICAgICB9LFxuICAgIH07XG4gICAgaWYgKG1ldGEuaWQgPj0gMCkge1xuICAgICAgZm9yIChjb25zdCBzcGF3biBvZiBtZXRhLnJvbS5sb2NhdGlvbnNbbWV0YS5pZF0uc3Bhd25zKSB7XG4gICAgICAgIGlmIChzcGF3bi5pc01vbnN0ZXIoKSAmJiBzcGF3bi5tb25zdGVySWQgPT09IDB4OGYpIHtcbiAgICAgICAgICBzdXJ2ZXkuZmVhdHVyZXMuc3RhdHVlKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBwb3Mgb2YgbWV0YS5hbGxQb3MoKSkge1xuICAgICAgY29uc3Qgc2NyID0gbWV0YS5nZXQocG9zKTtcbiAgICAgIGlmICghc2NyLmlzRW1wdHkoKSB8fCBzY3IuZGF0YS5leGl0cz8ubGVuZ3RoKSBzdXJ2ZXkuc2l6ZSsrO1xuICAgICAgZm9yIChjb25zdCBleGl0IG9mIHNjci5kYXRhLmV4aXRzID8/IFtdKSB7XG4gICAgICAgIGNvbnN0IHt0eXBlfSA9IGV4aXQ7XG4gICAgICAgIGlmICh0eXBlID09PSAnZWRnZTp0b3AnKSB7XG4gICAgICAgICAgaWYgKChwb3MgPj4+IDQpID09PSAwKSBzdXJ2ZXkuZWRnZXNbMF0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpsZWZ0Jykge1xuICAgICAgICAgIGlmICgocG9zICYgMHhmKSA9PT0gMCkgc3VydmV5LmVkZ2VzWzFdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2VkZ2U6Ym90dG9tJykge1xuICAgICAgICAgIGlmICgocG9zID4+PiA0KSA9PT0gbWV0YS5oZWlnaHQgLSAxKSBzdXJ2ZXkuZWRnZXNbMl0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpyaWdodCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyAmIDB4ZikgPT09IG1ldGEud2lkdGggLSAxKSBzdXJ2ZXkuZWRnZXNbM10rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnY3J5cHQnKSB7XG4gICAgICAgICAgLy8gc3RhaXIgaXMgYnVpbHQgaW50byBhcmVuYVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUuc3RhcnRzV2l0aCgnc2VhbWxlc3MnKSkge1xuICAgICAgICAgIC8vIGRvIG5vdGhpbmcuLi5cbiAgICAgICAgfSBlbHNlIGlmIChleGl0LmRpciAmIDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBleGl0IGRpcmVjdGlvbjogJHtleGl0LmRpcn1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdXJ2ZXkuc3RhaXJzW2V4aXQuZGlyID4+PiAxXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2FyZW5hJykpIHN1cnZleS5mZWF0dXJlcy5hcmVuYSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgc3VydmV5LmZlYXR1cmVzLmJyaWRnZSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdvdmVycGFzcycpKSBzdXJ2ZXkuZmVhdHVyZXMub3ZlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdwaXQnKSkgc3VydmV5LmZlYXR1cmVzLnBpdCsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCdyYW1wJykpIHN1cnZleS5mZWF0dXJlcy5yYW1wKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3NwaWtlcycpKSBzdXJ2ZXkuZmVhdHVyZXMuc3Bpa2UrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgndW5kZXJwYXNzJykpIHN1cnZleS5mZWF0dXJlcy51bmRlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3YWxsJykpIHN1cnZleS5mZWF0dXJlcy53YWxsKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykpIHN1cnZleS5mZWF0dXJlcy5yaXZlcisrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd3aWRlJykpIHN1cnZleS5mZWF0dXJlcy53aWRlKys7XG4gICAgfVxuICAgIGlmIChzdXJ2ZXkuc2l6ZSA8IDIgJiYgKG1ldGEud2lkdGggPiAxIHx8IG1ldGEuaGVpZ2h0ID4gMSkpIHN1cnZleS5zaXplID0gMjtcbiAgICByZXR1cm4gc3VydmV5O1xuICB9XG5cbiAgYnVpbGQoaCA9IHRoaXMucGlja0hlaWdodCgpLCB3ID0gdGhpcy5waWNrV2lkdGgoKSxcbiAgICAgICAgc2l6ZSA9IHRoaXMucGlja1NpemUoKSk6IFJlc3VsdDxNZXRhbG9jYXRpb24+IHtcbiAgICB0aGlzLmluaXQoKTtcbiAgICBsZXQgcmVzdWx0OiBSZXN1bHQ8dm9pZD47XG4gICAgLy9jb25zdCByID0gdGhpcy5yYW5kb207XG4gICAgY29uc3QgYSA9IG5ldyBDYXZlU2h1ZmZsZUF0dGVtcHQoaCwgdywgc2l6ZSk7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmZpbGxHcmlkKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcblxuICAgIC8vIHRyeSB0byB0cmFuc2xhdGUgdG8gbWV0YXNjcmVlbnMgYXQgdGhpcyBwb2ludC4uLlxuICAgIGlmICgocmVzdWx0ID0gdGhpcy5wcmVpbmZlcihhKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuaW5mZXJTY3JlZW5zKGEpO1xuICAgIGlmICghbWV0YS5vaykgcmV0dXJuIG1ldGE7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLnJlZmluZU1ldGFzY3JlZW5zKGEsIG1ldGEudmFsdWUpKSwgIXJlc3VsdC5vaykge1xuICAgICAgLy9jb25zb2xlLmVycm9yKG1ldGEudmFsdWUuc2hvdygpKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGlmICgocmVzdWx0ID0gdGhpcy5jaGVja01ldGFzY3JlZW5zKGEsIG1ldGEudmFsdWUpKSwgIXJlc3VsdC5vaykge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3JlcXVpcmVQaXREZXN0aW5hdGlvbiAmJlxuICAgICAgICAhdGhpcy5yZXF1aXJlRWxpZ2libGVQaXREZXN0aW5hdGlvbihtZXRhLnZhbHVlKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBubyBlbGlnaWJsZSBwaXQgZGVzdGluYXRpb25gfTtcbiAgICB9XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBmaWxsR3JpZChhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBsZXQgcmVzdWx0OiBSZXN1bHQ8dm9pZD47XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmluaXRpYWxGaWxsKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2lmICghdGhpcy5hZGRFYXJseUZlYXR1cmVzKCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWRnZXMoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRFYXJseUZlYXR1cmVzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2NvbnNvbGUubG9nKGByZWZpbmU6XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5yZWZpbmUoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vY29uc29sZS5sb2coYHBvc3RyZWZpbmU6XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5yZWZpbmVFZGdlcyhhKSkgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdyZWZpbmVFZGdlcyd9O1xuICAgIHRoaXMucmVtb3ZlU3B1cnMoYSk7XG4gICAgdGhpcy5yZW1vdmVUaWdodExvb3BzKGEpO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRMYXRlRmVhdHVyZXMoYSkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRTdGFpcnMoYSwgLi4uKHRoaXMucGFyYW1zLnN0YWlycyA/PyBbXSkpKSxcbiAgICAgICAgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEF0dGVtcHQgbWV0aG9kc1xuXG4gIGluaXQoKSB7fVxuXG4gIC8vIEluaXRpYWwgZmlsbC5cbiAgaW5pdGlhbEZpbGwoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgdGhpcy5maWxsQ2F2ZShhLCAnYycpO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxDYXZlKGE6IEEsIHM6IHN0cmluZykge1xuICAgIC8vIFRPRE8gLSBtb3ZlIHRvIE1hemVTaHVmZmxlLmZpbGw/XG4gICAgZm9yIChsZXQgeSA9IDAuNTsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMC41OyB4IDwgYS53OyB4KyspIHtcbiAgICAgICAgaWYgKHkgPiAxKSBhLmdyaWQuc2V0Mih5IC0gMC41LCB4LCAnYycpO1xuICAgICAgICBpZiAoeCA+IDEpIGEuZ3JpZC5zZXQyKHksIHggLSAwLjUsICdjJyk7XG4gICAgICAgIGEuZ3JpZC5zZXQyKHksIHgsICdjJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGEuY291bnQgPSBhLmggKiBhLnc7XG4gIH1cblxuICAvLyBBZGQgZWRnZSBhbmQvb3Igc3RhaXIgZXhpdHNcbiAgYWRkRWRnZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy9sZXQgYXR0ZW1wdHMgPSAwO1xuICAgIGlmICghdGhpcy5wYXJhbXMuZWRnZXMpIHJldHVybiBPSztcbiAgICBmb3IgKGxldCBkaXIgPSAwOyBkaXIgPCA0OyBkaXIrKykge1xuICAgICAgbGV0IGNvdW50ID0gdGhpcy5wYXJhbXMuZWRnZXNbZGlyXSB8fCAwO1xuICAgICAgaWYgKCFjb3VudCkgY29udGludWU7XG4gICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgICAgc2VxKGRpciAmIDEgPyBhLmggOiBhLncsIGkgPT4gYS5ncmlkLmJvcmRlcihkaXIsIGkpKTtcbiAgICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShlZGdlcykpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgZWRnZTogJHtlZGdlLnRvU3RyaW5nKDE2KX0gY291bnQgJHtjb3VudH0gZGlyICR7ZGlyfWApO1xuICAgICAgICBpZiAoYS5ncmlkLmdldChlZGdlKSkgY29udGludWU7XG4gICAgICAgIGlmIChkaXIgJiAxKSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkTGVmdEVkZ2UoYSwgZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZFJpZ2h0RWRnZShhLCBlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkVXBFZGdlKGEsIGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGREb3duRWRnZShhLCBlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb3VudCkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoY291bnQpIHtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBjYW4ndCBmaXQgYWxsIGVkZ2VzIHNodWZmbGluZyAke3RoaXMubG9jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XFxubWlzc2luZyAke2NvdW50fSAke2Rpcn1gfTtcbiAgICAgICAgLy9cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZFVwRWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBVcCBlZGdlcyBtdXN0IGFsd2F5cyBiZSBhcmVuYSBzY3JlZW5zLCBzbyBjdXQgb2ZmIGJvdGhcbiAgICAvLyB0aGUgRS1XIGVkZ2VzIEFORCB0aGUgbmVpZ2hib3Jpbmcgc2NyZWVucyBhcyB3ZWxsIChwcm92aWRlZFxuICAgIC8vIHRoZXJlIGlzIG5vdCBhbHNvIGFuIGV4aXQgbmV4dCB0byB0aGVtLCBzaW5jZSB0aGF0IHdvdWxkIGJlXG4gICAgLy8gYSBwcm9ibGVtLiAgKFRoZXNlIGFyZSBwcmV0dHkgbGltaXRlZDogdmFtcGlyZSAxLCBwcmlzb24sXG4gICAgLy8gc3R4eSAxLCBweXJhbWlkIDEsIGNyeXB0IDIsIGRyYXlnb24gMikuXG4gICAgY29uc3QgYmVsb3cgPSBlZGdlICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQgPSBiZWxvdyAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQyID0gbGVmdCAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQzID0gbGVmdDIgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGJlbG93ICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQyID0gcmlnaHQgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDMgPSByaWdodDIgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0KSkge1xuICAgICAgaWYgKGdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChncmlkLmdldChlZGdlIC0gMTYgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGdyaWQuaXNCb3JkZXIobGVmdDMpICYmIGdyaWQuZ2V0KGxlZnQzKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodCkpIHtcbiAgICAgIGlmIChncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGdyaWQuZ2V0KGVkZ2UgKyAxNiBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodDMpICYmIGdyaWQuZ2V0KHJpZ2h0MykpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICduJyk7XG4gICAgZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIGdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGREb3duRWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBkb3duIGVkZ2VzIG11c3QgaGF2ZSBzdHJhaWdodCBOLVMgc2NyZWVucywgc28gY3V0IG9mZlxuICAgIC8vIHRoZSBFLVcgZWRnZXMgbmV4dCB0byB0aGVtLlxuICAgIGNvbnN0IGFib3ZlID0gZWRnZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYWJvdmUgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGFib3ZlICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKCFncmlkLmdldChhYm92ZSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0KSAmJiBncmlkLmdldChsZWZ0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChncmlkLmlzQm9yZGVyKHJpZ2h0KSAmJiBncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICBmaXhlZC5hZGQoZWRnZSk7XG4gICAgZ3JpZC5zZXQoZWRnZSwgJ24nKTtcbiAgICBncmlkLnNldChsZWZ0LCAnJyk7XG4gICAgZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZExlZnRFZGdlKHtncmlkLCBmaXhlZH06IEEsIGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gZWRnZSArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0VXAgPSByaWdodCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodERvd24gPSByaWdodCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYGFkZExlZnQgJHtoZXgoZWRnZSl9IHJpZ2h0ICR7aGV4KHJpZ2h0KX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0KX0gcnUgJHtoZXgocmlnaHRVcCl9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0VXApfToke3RoaXMuZ3JpZC5nZXQocmlnaHRVcCl9IHJkICR7aGV4KHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmdldChyaWdodERvd24pfWApO1xuICAgIGlmICghZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGdyaWQuaXNCb3JkZXIocmlnaHRVcCkgJiYgZ3JpZC5nZXQocmlnaHRVcCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihyaWdodERvd24pICYmIGdyaWQuZ2V0KHJpZ2h0RG93bikpIHJldHVybiBmYWxzZTtcbiAgICBmaXhlZC5hZGQoZWRnZSk7XG4gICAgZ3JpZC5zZXQoZWRnZSwgJ2MnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZFJpZ2h0RWRnZSh7Z3JpZCwgZml4ZWR9OiBBLCBlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBjb25zdCBsZWZ0ID0gZWRnZSAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnRVcCA9IGxlZnQgLSAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdERvd24gPSBsZWZ0ICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGlmICghZ3JpZC5nZXQobGVmdCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0VXApICYmIGdyaWQuZ2V0KGxlZnRVcCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZ3JpZC5pc0JvcmRlcihsZWZ0RG93bikgJiYgZ3JpZC5nZXQobGVmdERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgZml4ZWQuYWRkKGVkZ2UpO1xuICAgIGdyaWQuc2V0KGVkZ2UsICdjJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBhZGRBcmVuYXNFYXJseSgpOiBib29sZWFuIHtcbiAgLy8gICAvLyBTcGVjaWZpY2FsbHksIGp1c3QgYXJlbmFzLi4uXG4gIC8vICAgbGV0IGFyZW5hcyA9IHRoaXMucGFyYW1zLmZlYXR1cmVzPy5bJ2EnXTtcbiAgLy8gICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgY29uc3QgZyA9IHRoaXMuZ3JpZDtcbiAgLy8gICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5zY3JlZW5zKSkge1xuICAvLyAgICAgY29uc3QgbWlkZGxlID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdCA9IChtaWRkbGUgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MiA9IChsZWZ0IC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDMgPSAobGVmdDIgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MlVwID0gKGxlZnQyIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQyRG93biA9IChsZWZ0MiArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodCA9IChtaWRkbGUgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDMgPSAocmlnaHQyICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyVXAgPSAocmlnaHQyIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MkRvd24gPSAocmlnaHQyICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGlmICghZy5pc0JvcmRlcihsZWZ0KSkge1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MykgJiYgZy5nZXQobGVmdDMpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJVcCkgJiYgZy5nZXQobGVmdDJVcCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihsZWZ0MkRvd24pICYmIGcuZ2V0KGxlZnQyRG93bikpIGNvbnRpbnVlO1xuICAvLyAgICAgfVxuICAvLyAgICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDMpICYmIGcuZ2V0KHJpZ2h0MykpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAoZy5pc0JvcmRlcihyaWdodDJVcCkgJiYgZy5nZXQocmlnaHQyVXApKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyRG93bikgJiYgZy5nZXQocmlnaHQyRG93bikpIGNvbnRpbnVlO1xuICAvLyAgICAgfVxuICAvLyAgICAgdGhpcy5maXhlZC5hZGQobWlkZGxlKTtcbiAgLy8gICAgIGcuc2V0KG1pZGRsZSwgJ2EnKTtcbiAgLy8gICAgIGcuc2V0KGxlZnQsICcnKTtcbiAgLy8gICAgIGcuc2V0KGxlZnQyLCAnJyk7XG4gIC8vICAgICBnLnNldChyaWdodCwgJycpO1xuICAvLyAgICAgZy5zZXQocmlnaHQyLCAnJyk7XG4gIC8vICAgICBhcmVuYXMtLTtcbiAgLy8gICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIGZhbHNlO1xuICAvLyB9XG5cbiAgYWRkRWFybHlGZWF0dXJlcyhhOiBBKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkU3Bpa2VzKGEsIHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBhZGQgc3Bpa2VzXFxuJHthLmdyaWQuc2hvdygpfWB9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkT3ZlcnBhc3NlcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ub3ZlciA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGQgb3ZlcnBhc3Nlcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRMYXRlRmVhdHVyZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmFkZEFyZW5hcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYXJlbmEgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkQXJlbmFzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRVbmRlcnBhc3NlcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8udW5kZXIgPz8gMCkpIHtcbiAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiAnYWRkVW5kZXJwYXNzZXMnfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZFBpdHMoYSwgdGhpcy5wYXJhbXMuZmVhdHVyZXM/LnBpdCA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRQaXRzJ307XG4gICAgfVxuICAgIGlmICghdGhpcy5hZGRSYW1wcyhhLCB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ucmFtcCA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRSYW1wcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRBcmVuYXMoYTogQSwgYXJlbmFzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgZyA9IGEuZ3JpZDtcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICghdGhpcy5pc0VsaWdpYmxlQXJlbmEoYSwgbWlkZGxlKSkgY29udGludWU7XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gICAgICBjb25zdCBhcmVuYVRpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArICdhJyArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcoYXJlbmFUaWxlKTtcbiAgICAgIGlmICghb3B0aW9ucy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgYS5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIGcuc2V0KG1pZGRsZSwgJ2EnKTtcbiAgICAgIC8vIGcuc2V0KGxlZnQsICcnKTtcbiAgICAgIC8vIGcuc2V0KGxlZnQyLCAnJyk7XG4gICAgICAvLyBnLnNldChyaWdodCwgJycpO1xuICAgICAgLy8gZy5zZXQocmlnaHQyLCAnJyk7XG4gICAgICBhcmVuYXMtLTtcbiAgICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmVycm9yKCdjb3VsZCBub3QgYWRkIGFyZW5hJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNFbGlnaWJsZUFyZW5hKGE6IEEsIG1pZGRsZTogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZyA9IGEuZ3JpZDtcbiAgICBjb25zdCBsZWZ0ID0gKG1pZGRsZSAtIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0MiA9IChsZWZ0IC0gOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gKG1pZGRsZSArIDgpIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDIgPSAocmlnaHQgKyA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKGcuZ2V0KG1pZGRsZSkgIT09ICdjJyAmJiBnLmdldChtaWRkbGUpICE9PSAndycpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZy5nZXQobGVmdCkgfHwgZy5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFnLmlzQm9yZGVyKGxlZnQpICYmIGcuZ2V0KGxlZnQyKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkgJiYgZy5nZXQocmlnaHQyKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkVW5kZXJwYXNzZXMoYTogQSwgdW5kZXI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIC8vIE9ubHkgYWRkIGhvcml6b250YWwgJyAgIHxjYmN8ICAgJywgbm90ICcgYyB8IGIgfCBjICcuICBDb3VsZCBwb3NzaWJseVxuICAgIC8vIHVzZSAnYicgYW5kICdCJyBpbnN0ZWFkP1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhLCB1bmRlciwgJ2InLCAweDgwMCk7XG4gIH1cblxuICBhZGRPdmVycGFzc2VzKGE6IEEsIG92ZXI6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKG92ZXIpIHtcbiAgICAgIGNvbnN0IHkgPSB0aGlzLnJhbmRvbS5uZXh0SW50KGEuaCAtIDIpICsgMTtcbiAgICAgIGNvbnN0IHggPSB0aGlzLnJhbmRvbS5uZXh0SW50KGEudyAtIDIpICsgMTtcbiAgICAgIGNvbnN0IGMgPSAoeSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoYS5ncmlkLmdldChjKSAhPT0gJ2MnKSB7XG4gICAgICAgIGlmICgrK2F0dGVtcHRzID4gMTApIHRocm93IG5ldyBFcnJvcignQmFkIGF0dGVtcHRzJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYS5ncmlkLnNldChjLCAnYicpO1xuICAgICAgYS5maXhlZC5hZGQoYyk7XG4gICAgICBhLmdyaWQuc2V0KGMgLSA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgYS5ncmlkLnNldChjICsgOCBhcyBHcmlkQ29vcmQsICcnKTtcbiAgICAgIG92ZXItLTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRQaXRzKGE6IEEsIHBpdHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhLCBwaXRzLCAncCcpO1xuICB9XG5cbiAgYWRkUmFtcHMoYTogQSwgcmFtcHM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmFkZFN0cmFpZ2h0U2NyZWVuTGF0ZShhLCByYW1wcywgJy8nLCA4KTtcbiAgfVxuXG4gIC8qKiBAcGFyYW0gZGVsdGEgR3JpZENvb3JkIGRpZmZlcmVuY2UgZm9yIGVkZ2VzIHRoYXQgbmVlZCB0byBiZSBlbXB0eS4gKi9cbiAgYWRkU3RyYWlnaHRTY3JlZW5MYXRlKGE6IEEsIGNvdW50OiBudW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGRlbHRhPzogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKGEuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gICAgICBjb25zdCBtaWRkbGUgPSAoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoYS5ncmlkLmdldChtaWRkbGUpICE9PSAnYycpIGNvbnRpbnVlO1xuICAgICAgaWYgKGRlbHRhKSB7XG4gICAgICAgIGNvbnN0IHNpZGUxID0gKG1pZGRsZSAtIGRlbHRhKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IHNpZGUyID0gKG1pZGRsZSArIGRlbHRhKSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KHNpZGUxKSB8fCBhLmdyaWQuZ2V0KHNpZGUyKSkgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gICAgICBjb25zdCBuZXdUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoNSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhuZXdUaWxlKTtcbiAgICAgIGlmICghb3B0aW9ucy5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgLy8gVE9ETyAtIHJldHVybiBmYWxzZSBpZiBub3Qgb24gYSBjcml0aWNhbCBwYXRoPz8/XG4gICAgICAvLyAgICAgIC0gYnV0IFBPSSBhcmVuJ3QgcGxhY2VkIHlldC5cbiAgICAgIGEuZml4ZWQuYWRkKG1pZGRsZSk7XG4gICAgICBhLmdyaWQuc2V0KG1pZGRsZSwgY2hhcik7XG4gICAgICBjb3VudC0tO1xuICAgICAgaWYgKCFjb3VudCkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vY29uc29sZS5lcnJvcignY291bGQgbm90IGFkZCByYW1wJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYWRkU3Bpa2VzKGE6IEEsIHNwaWtlczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgaWYgKCFzcGlrZXMpIHJldHVybiB0cnVlO1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKHNwaWtlcyA+IDApIHtcbiAgICAgIGlmICgrK2F0dGVtcHRzID4gMjApIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gVE9ETyAtIHRyeSB0byBiZSBzbWFydGVyIGFib3V0IHNwaWtlc1xuICAgICAgLy8gIC0gaWYgdG90YWwgPiAyIHRoZW4gdXNlIG1pbih0b3RhbCwgaCouNiwgPz8pIGFzIGxlblxuICAgICAgLy8gIC0gaWYgbGVuID4gMiBhbmQgdyA+IDMsIGF2b2lkIHB1dHRpbmcgc3Bpa2VzIG9uIGVkZ2U/XG4gICAgICBsZXQgbGVuID0gTWF0aC5taW4oc3Bpa2VzLCBNYXRoLmZsb29yKGEuaCAqIDAuNiksIHRoaXMubWF4U3Bpa2VzKTtcbiAgICAgIHdoaWxlIChsZW4gPCBzcGlrZXMgLSAxICYmIGxlbiA+IHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgIGlmICh0aGlzLnJhbmRvbS5uZXh0KCkgPCAwLjIpIGxlbi0tO1xuICAgICAgfVxuICAgICAgLy9pZiAobGVuID09PSBzcGlrZXMgLSAxKSBsZW4rKztcbiAgICAgIGNvbnN0IHggPVxuICAgICAgICAgIChsZW4gPiAyICYmIGEudyA+IDMpID8gdGhpcy5yYW5kb20ubmV4dEludChhLncgLSAyKSArIDEgOlxuICAgICAgICAgIHRoaXMucmFuZG9tLm5leHRJbnQoYS53KTtcbiAgICAgIC8vIGNvbnN0IHIgPVxuICAgICAgLy8gICAgIHRoaXMucmFuZG9tLm5leHRJbnQoTWF0aC5taW4odGhpcy5oIC0gMiwgc3Bpa2VzKSAtIHRoaXMubWluU3Bpa2VzKTtcbiAgICAgIC8vIGxldCBsZW4gPSB0aGlzLm1pblNwaWtlcyArIHI7XG4gICAgICBpZiAobGVuID4gc3Bpa2VzIC0gdGhpcy5taW5TcGlrZXMpIHtcbiAgICAgICAgaWYgKGxlbiA+PSBhLmggLSAyKSB7IC8vICYmIGxlbiA+IHRoaXMubWluU3Bpa2VzKSB7XG4gICAgICAgICAgbGVuID0gYS5oIC0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZW4gPSBzcGlrZXM7IC8vID8/PyBpcyB0aGlzIGV2ZW4gdmFsaWQgPz8/XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHkwID0gdGhpcy5yYW5kb20ubmV4dEludChhLmggLSBsZW4gLSAyKSArIDE7XG4gICAgICBjb25zdCB0MCA9IHkwIDw8IDEyIHwgeCA8PCA0IHwgMHg4MDg7XG4gICAgICBjb25zdCB0MSA9IHQwICsgKChsZW4gLSAxKSA8PCAxMik7XG4gICAgICBmb3IgKGxldCB0ID0gdDAgLSAweDEwMDA7IGxlbiAmJiB0IDw9IHQxICsgMHgxMDAwOyB0ICs9IDB4ODAwKSB7XG4gICAgICAgIGlmIChhLmdyaWQuZ2V0KHQgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSBsZW4gPSAwO1xuICAgICAgfVxuICAgICAgaWYgKCFsZW4pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgY2xlYXJlZCA9IFt0MCAtIDgsIHQwICsgOCwgdDEgLSA4LCB0MSArIDhdIGFzIEdyaWRDb29yZFtdO1xuICAgICAgY29uc3Qgb3JwaGFuZWQgPSB0aGlzLnRyeUNsZWFyKGEsIGNsZWFyZWQpO1xuICAgICAgaWYgKCFvcnBoYW5lZC5sZW5ndGgpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBjIG9mIG9ycGhhbmVkKSB7XG4gICAgICAgIGEuZ3JpZC5zZXQoYywgJycpO1xuICAgICAgfVxuICAgICAgYS5maXhlZC5hZGQoKHQwIC0gMHg4MDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBhLmZpeGVkLmFkZCgodDAgLSAweDEwMDApIGFzIEdyaWRDb29yZCk7XG4gICAgICBhLmZpeGVkLmFkZCgodDEgKyAweDgwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIGEuZml4ZWQuYWRkKCh0MSArIDB4MTAwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIGZvciAobGV0IHQgPSB0MDsgdCA8PSB0MTsgdCArPSAweDgwMCkge1xuICAgICAgICBhLmZpeGVkLmFkZCh0IGFzIEdyaWRDb29yZCk7XG4gICAgICAgIGEuZ3JpZC5zZXQodCBhcyBHcmlkQ29vcmQsICdzJyk7XG4gICAgICB9XG4gICAgICBzcGlrZXMgLT0gbGVuO1xuICAgICAgYXR0ZW1wdHMgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3Bpa2VzID09PSAwO1xuICB9XG5cbiAgY2FuUmVtb3ZlKGM6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIC8vIE5vdGFibHksIGV4Y2x1ZGUgc3RhaXJzLCBuYXJyb3cgZWRnZXMsIGFyZW5hcywgZXRjLlxuICAgIHJldHVybiBjID09PSAnYyc7XG4gIH1cblxuICAvKipcbiAgICogRG9lcyBhIHRyYXZlcnNhbCB3aXRoIHRoZSBnaXZlbiBjb29yZGluYXRlKHMpIGNsZWFyZWQsIGFuZCByZXR1cm5zXG4gICAqIGFuIGFycmF5IG9mIGNvb3JkaW5hdGVzIHRoYXQgd291bGQgYmUgY3V0IG9mZiAoaW5jbHVkaW5nIHRoZSBjbGVhcmVkXG4gICAqIGNvb3JkaW5hdGVzKS4gIElmIGNsZWFyaW5nIHdvdWxkIGNyZWF0ZSBtb3JlIHRoYW4gdGhlIGFsbG93ZWQgbnVtYmVyXG4gICAqIG9mIHBhcnRpdGlvbnMgKHVzdWFsbHkgMSksIHRoZW4gcmV0dXJucyBhbiBlbXB0eSBhcnJheSB0byBzaWduaWZ5XG4gICAqIHRoYXQgdGhlIGNsZWFyIGlzIG5vdCBhbGxvd2VkLlxuICAgKi9cbiAgdHJ5Q2xlYXIoYTogQSwgY29vcmRzOiBHcmlkQ29vcmRbXSk6IEdyaWRDb29yZFtdIHtcbiAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgY29vcmRzKSB7XG4gICAgICBpZiAoYS5maXhlZC5oYXMoYykpIHJldHVybiBbXTtcbiAgICAgIHJlcGxhY2Uuc2V0KGMsICcnKTtcbiAgICB9XG4gICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKHJlcGxhY2UpO1xuICAgIC8vIENoZWNrIHNpbXBsZSBjYXNlIGZpcnN0IC0gb25seSBvbmUgcGFydGl0aW9uXG4gICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgcmV0dXJuIFsuLi5jb29yZHNdO1xuICAgIH1cbiAgICAvLyBNb3JlIGNvbXBsZXggY2FzZSAtIG5lZWQgdG8gc2VlIHdoYXQgd2UgYWN0dWFsbHkgaGF2ZSxcbiAgICAvLyBzZWUgaWYgYW55dGhpbmcgZ290IGN1dCBvZmYuXG4gICAgY29uc3QgY29ubmVjdGVkID0gbmV3IFNldDxTZXQ8R3JpZENvb3JkPj4oKTtcbiAgICBjb25zdCBhbGxQYXJ0cyA9IG5ldyBTZXQ8U2V0PEdyaWRDb29yZD4+KHBhcnRzLnZhbHVlcygpKTtcbiAgICBmb3IgKGNvbnN0IGZpeGVkIG9mIGEuZml4ZWQpIHtcbiAgICAgIGNvbm5lY3RlZC5hZGQocGFydHMuZ2V0KGZpeGVkKSEpO1xuICAgIH1cbiAgICBpZiAoY29ubmVjdGVkLnNpemUgPiB0aGlzLm1heFBhcnRpdGlvbnMpIHJldHVybiBbXTsgLy8gbm8gZ29vZFxuICAgIGNvbnN0IG9ycGhhbmVkID0gWy4uLmNvb3Jkc107XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIGFsbFBhcnRzKSB7XG4gICAgICBpZiAoY29ubmVjdGVkLmhhcyhwYXJ0KSkgY29udGludWU7XG4gICAgICBvcnBoYW5lZC5wdXNoKC4uLnBhcnQpO1xuICAgIH1cbiAgICByZXR1cm4gb3JwaGFuZWQ7XG4gIH1cblxuICByZWZpbmUoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IGZpbGxlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAobGV0IGkgPSAwIGFzIEdyaWRJbmRleDsgaSA8IGEuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYS5ncmlkLmRhdGFbaV0pIGZpbGxlZC5hZGQoYS5ncmlkLmNvb3JkKGkpKTtcbiAgICB9XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICB3aGlsZSAoYS5jb3VudCA+IGEuc2l6ZSkge1xuICAgICAgaWYgKGF0dGVtcHRzKysgPiA1MCkgdGhyb3cgbmV3IEVycm9yKGByZWZpbmUgZmFpbGVkOiBhdHRlbXB0c2ApO1xuICAgICAgLy9jb25zb2xlLmxvZyhgbWFpbjogJHt0aGlzLmNvdW50fSA+ICR7YS5zaXplfWApO1xuICAgICAgbGV0IHJlbW92ZWQgPSAwO1xuLy9pZih0aGlzLnBhcmFtcy5pZD09PTQpe2RlYnVnZ2VyO1suLi50aGlzLnJhbmRvbS5pc2h1ZmZsZShmaWxsZWQpXTt9XG4gICAgICBmb3IgKGNvbnN0IGNvb3JkIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFsuLi5maWxsZWRdKSkge1xuICAgICAgICBpZiAoYS5ncmlkLmlzQm9yZGVyKGNvb3JkKSB8fFxuICAgICAgICAgICAgIXRoaXMuY2FuUmVtb3ZlKGEuZ3JpZC5nZXQoY29vcmQpKSB8fFxuICAgICAgICAgICAgYS5maXhlZC5oYXMoY29vcmQpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZWQgPiAzKSBicmVhaztcblxuICAgICAgICBjb25zdCBwYXJ0cyA9IGEuZ3JpZC5wYXJ0aXRpb24odGhpcy5yZW1vdmFsTWFwKGEsIGNvb3JkKSk7XG4gICAgICAgIC8vY29uc29sZS5sb2coYCAgY29vcmQ6ICR7Y29vcmQudG9TdHJpbmcoMTYpfSA9PiAke3BhcnRzLnNpemV9YCk7XG4gICAgICAgIGNvbnN0IFtmaXJzdF0gPSBwYXJ0cy52YWx1ZXMoKTtcbiAgICAgICAgaWYgKGZpcnN0LnNpemUgPT09IHBhcnRzLnNpemUgJiYgcGFydHMuc2l6ZSA+IDEpIHsgLy8gYSBzaW5nbGUgcGFydGl0aW9uXG4gICAgICAgICAgLy8gb2sgdG8gcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlZCsrO1xuICAgICAgICAgIGZpbGxlZC5kZWxldGUoY29vcmQpO1xuICAgICAgICAgIGlmICgoY29vcmQgJiAweDgwOCkgPT09IDB4ODA4KSBhLmNvdW50LS07XG4gICAgICAgICAgYS5ncmlkLnNldChjb29yZCwgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGZpbmQgdGhlIGJpZ2dlc3QgcGFydGl0aW9uLlxuICAgICAgICAgIGxldCBwYXJ0ITogU2V0PEdyaWRDb29yZD47XG4gICAgICAgICAgZm9yIChjb25zdCBzZXQgb2YgcGFydHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmICghcGFydCB8fCBzZXQuc2l6ZSA+IHBhcnQuc2l6ZSkgcGFydCA9IHNldDtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIGFsbCB0aGUgZml4ZWQgc2NyZWVucyBhcmUgaW4gaXQuXG4gICAgICAgICAgaWYgKCFbLi4uYS5maXhlZF0uZXZlcnkoYyA9PiBwYXJ0LmhhcyhjKSkpIGNvbnRpbnVlO1xuICAgICAgICAgIC8vIGNoZWNrIHRoYXQgaXQncyBiaWcgZW5vdWdoLlxuICAgICAgICAgIGNvbnN0IGNvdW50ID0gWy4uLnBhcnRdLmZpbHRlcihjID0+IChjICYgMHg4MDgpID09IDB4ODA4KS5sZW5ndGg7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhgcGFydDogJHtbLi4ucGFydF0ubWFwKHg9PngudG9TdHJpbmcoMTYpKS5qb2luKCcsJyl9IGNvdW50PSR7Y291bnR9YCk7XG4gICAgICAgICAgaWYgKGNvdW50IDwgYS5zaXplKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBvayB0byByZW1vdmVcbiAgICAgICAgICByZW1vdmVkKys7XG4gICAgICAgICAgZmlsbGVkID0gcGFydDtcbiAgICAgICAgICBhLmNvdW50ID0gY291bnQ7XG4gICAgICAgICAgYS5ncmlkLnNldChjb29yZCwgJycpO1xuICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHBhcnRzKSB7XG4gICAgICAgICAgICBpZiAodiAhPT0gcGFydCkgYS5ncmlkLnNldChrLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXJlbW92ZWQpIHtcbiAgICAgICAgaWYgKHRoaXMubG9vc2VSZWZpbmUpIHJldHVybiBPSztcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGByZWZpbmUgJHthLmNvdW50fSA+ICR7YS5zaXplfWB9O1xuICAgICAgICAvL1xcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcmVtb3ZhbE1hcChhOiBBLCBjb29yZDogR3JpZENvb3JkKTogTWFwPEdyaWRDb29yZCwgc3RyaW5nPiB7XG4gICAgcmV0dXJuIG5ldyBNYXAoW1tjb29yZCwgJyddXSk7XG4gIH1cblxuICAvKiogUmVtb3ZlIG9ubHkgZWRnZXMuIENhbGxlZCBhZnRlciByZWZpbmUoKS4gKi9cbiAgcmVmaW5lRWRnZXMoYTogQSk6IGJvb2xlYW4ge1xuICAgIGxldCBlZGdlczogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCBhLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFhLmdyaWQuZGF0YVtpXSkgY29udGludWU7XG4gICAgICBjb25zdCBjb29yZCA9IGEuZ3JpZC5jb29yZChpKTtcbiAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoY29vcmQpIHx8IGEuZml4ZWQuaGFzKGNvb3JkKSkgY29udGludWU7XG4gICAgICAvLyBPbmx5IGFkZCBlZGdlcy5cbiAgICAgIGlmICgoY29vcmQgXiAoY29vcmQgPj4gOCkpICYgOCkgZWRnZXMucHVzaChjb29yZCk7XG4gICAgfVxuICAgIHRoaXMucmFuZG9tLnNodWZmbGUoZWRnZXMpO1xuICAgIGNvbnN0IG9yaWcgPSBhLmdyaWQucGFydGl0aW9uKG5ldyBNYXAoKSk7XG4gICAgbGV0IHNpemUgPSBvcmlnLnNpemU7XG4gICAgY29uc3QgcGFydENvdW50ID0gbmV3IFNldChvcmlnLnZhbHVlcygpKS5zaXplO1xuICAgIGZvciAoY29uc3QgZSBvZiBlZGdlcykge1xuICAgICAgY29uc3QgcGFydHMgPSBhLmdyaWQucGFydGl0aW9uKG5ldyBNYXAoW1tlLCAnJ11dKSk7XG4gICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgICAgY29uc3Qgb2sgPSBmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplID9cbiAgICAgICAgICAvLyBhIHNpbmdsZSBwYXJ0aXRpb24gLSBtYWtlIHN1cmUgd2UgZGlkbid0IGxvc2UgYW55dGhpbmcgZWxzZS5cbiAgICAgICAgICBwYXJ0cy5zaXplID09PSBzaXplIC0gMSA6XG4gICAgICAgICAgLy8gcmVxdWlyZSBubyBuZXcgcGFydGl0aW9uc1xuICAgICAgICAgIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHBhcnRDb3VudCAmJiBwYXJ0cy5zaXplID09PSBzaXplIC0gMTtcbiAgICAgIGlmIChvaykge1xuICAgICAgICBzaXplLS07XG4gICAgICAgIGEuZ3JpZC5zZXQoZSwgJycpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBjYW4ndCBoYW5kbGUgYSB0aWxlICcgYyB8YyAgfCAgICcgc28gZ2V0IHJpZCBvZiBvbmUgb3IgdGhlXG4gICAqIG90aGVyIG9mIHRoZSBlZGdlcy4gIExlYXZlIHRpbGVzIG9mIHRoZSBmb3JtICcgYyB8ICAgfCBjICcgc2luY2VcbiAgICogdGhhdCB3b3JrcyBmaW5lLiAgVE9ETyAtIGhvdyB0byBwcmVzZXJ2ZSAnID4gfCAgIHwgPCAnP1xuICAgKi9cbiAgcmVtb3ZlU3B1cnMoYTogQSkge1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgYS5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgYS53OyB4KyspIHtcbiAgICAgICAgY29uc3QgYyA9ICh5IDw8IDEyIHwgMHg4MDggfCB4IDw8IDQpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKGEuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCB1cCA9IChjIC0gMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgZG93biA9IChjICsgMHg4MDApIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgbGVmdCA9IChjIC0gMHg4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGNvbnN0IHJpZ2h0ID0gKGMgKyAweDgpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKChhLmdyaWQuZ2V0KHVwKSB8fCBhLmdyaWQuZ2V0KGRvd24pKSAmJlxuICAgICAgICAgICAgKGEuZ3JpZC5nZXQobGVmdCkgfHwgYS5ncmlkLmdldChyaWdodCkpKSB7XG4gICAgICAgICAgaWYgKHRoaXMucmFuZG9tLm5leHRJbnQoMikpIHtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQodXAsICcnKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQoZG93biwgJycpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhgcmVtb3ZlICR7eX0gJHt4fTpcXG4ke3RoaXMuZ3JpZC5zaG93KCl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW1vdmVUaWdodExvb3BzKGE6IEEpIHtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaCAtIDE7IHkrKykge1xuICAgICAgY29uc3Qgcm93ID0geSA8PCAxMiB8IDB4ODAwO1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBhLncgLSAxOyB4KyspIHtcbiAgICAgICAgY29uc3QgY29vcmQgPSAocm93IHwgKHggPDwgNCkgfCA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICh0aGlzLmlzVGlnaHRMb29wKGEsIGNvb3JkKSkgdGhpcy5icmVha1RpZ2h0TG9vcChhLCBjb29yZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaXNUaWdodExvb3Aoe2dyaWR9OiBBLCBjb29yZDogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgZHkgPSAwOyBkeSA8IDB4MTgwMDsgZHkgKz0gMHg4MDApIHtcbiAgICAgIGZvciAobGV0IGR4ID0gMDsgZHggPCAweDE4OyBkeCArPSA4KSB7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gZHkgfCBkeFxuICAgICAgICBpZiAoZGVsdGEgPT09IDB4ODA4KSBjb250aW51ZTtcbiAgICAgICAgaWYgKGdyaWQuZ2V0KChjb29yZCArIGRlbHRhKSBhcyBHcmlkQ29vcmQpICE9PSAnYycpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBicmVha1RpZ2h0TG9vcChhOiBBLCBjb29yZDogR3JpZENvb3JkKSB7XG4gICAgLy8gUGljayBhIGRlbHRhIC0gZWl0aGVyIDgsIDEwMDgsIDgwMCwgODEwXG4gICAgY29uc3QgciA9IHRoaXMucmFuZG9tLm5leHRJbnQoMHgxMDAwMCk7XG4gICAgY29uc3QgZGVsdGEgPSByICYgMSA/IChyICYgMHgxMDAwKSB8IDggOiAociAmIDB4MTApIHwgMHg4MDA7XG4gICAgYS5ncmlkLnNldCgoY29vcmQgKyBkZWx0YSkgYXMgR3JpZENvb3JkLCAnJyk7XG4gIH1cblxuICBhZGRTdGFpcnMoYTogQSwgdXAgPSAwLCBkb3duID0gMCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gRmluZCBzcG90cyB3aGVyZSB3ZSBjYW4gYWRkIHN0YWlyc1xuLy9pZih0aGlzLnBhcmFtcy5pZD09PTUpZGVidWdnZXI7XG4gICAgY29uc3Qgc3RhaXJzID0gW3VwLCBkb3duXTtcbiAgICBpZiAoIXN0YWlyc1swXSAmJiAhc3RhaXJzWzFdKSByZXR1cm4gT0s7IC8vIG5vIHN0YWlyc1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgaWYgKCF0aGlzLnRyeUFkZFN0YWlyKGEsIGMsIHN0YWlycykpIGNvbnRpbnVlO1xuICAgICAgaWYgKCFzdGFpcnNbMF0gJiYgIXN0YWlyc1sxXSkgcmV0dXJuIE9LOyAvLyBubyBzdGFpcnNcbiAgICB9XG4gICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBzdGFpcnNgfTsgLy9cXG4ke2EuZ3JpZC5zaG93KCl9YH07XG4gIH1cblxuICBhZGRFYXJseVN0YWlyKGE6IEEsIGM6IEdyaWRDb29yZCwgc3RhaXI6IHN0cmluZyk6IEFycmF5PFtHcmlkQ29vcmQsIHN0cmluZ10+IHtcbiAgICBjb25zdCBtb2RzOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPiA9IFtdO1xuICAgIGNvbnN0IGxlZnQgPSBjIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSBjICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgdXAgPSBjIC0gMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGRvd24gPSBjICsgMHg4MDAgYXMgR3JpZENvb3JkO1xuICAgIGxldCBuZWlnaGJvcnMgPSBbYyAtIDgsIGMgKyA4XSBhcyBHcmlkQ29vcmRbXTtcbiAgICBpZiAoc3RhaXIgPT09ICc8Jykge1xuICAgICAgbmVpZ2hib3JzLnB1c2goZG93bik7XG4gICAgICBtb2RzLnB1c2goW3VwLCAnJ10pO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQobGVmdCkgPT09ICdjJyAmJiBhLmdyaWQuZ2V0KHJpZ2h0KSA9PT0gJ2MnICYmXG4gICAgICAgICAgdGhpcy5yYW5kb20ubmV4dEludCgzKSkge1xuICAgICAgICBtb2RzLnB1c2goW2Rvd24sICcnXSwgW2MsICc8J10pO1xuICAgICAgICByZXR1cm4gbW9kcztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0YWlyID09PSAnPicpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKHVwKTtcbiAgICAgIG1vZHMucHVzaChbZG93biwgJyddKTtcbiAgICB9XG4gICAgLy8gTk9URTogaWYgd2UgZGVsZXRlIHRoZW4gd2UgZm9yZ2V0IHRvIHplcm8gaXQgb3V0Li4uXG4gICAgLy8gQnV0IGl0IHdvdWxkIHN0aWxsIGJlIG5pY2UgdG8gXCJwb2ludFwiIHRoZW0gaW4gdGhlIGVhc3kgZGlyZWN0aW9uP1xuICAgIC8vIGlmICh0aGlzLmRlbHRhIDwgLTE2KSBuZWlnaGJvcnMuc3BsaWNlKDIsIDEpO1xuICAgIC8vIGlmICgodGhpcy5kZWx0YSAmIDB4ZikgPCA4KSBuZWlnaGJvcnMuc3BsaWNlKDEsIDEpO1xuICAgIG5laWdoYm9ycyA9IG5laWdoYm9ycy5maWx0ZXIoYyA9PiBhLmdyaWQuZ2V0KGMpID09PSAnYycpO1xuICAgIGlmICghbmVpZ2hib3JzLmxlbmd0aCkgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGtlZXAgPSB0aGlzLnJhbmRvbS5uZXh0SW50KG5laWdoYm9ycy5sZW5ndGgpO1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgbmVpZ2hib3JzLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAoaiAhPT0ga2VlcCkgbW9kcy5wdXNoKFtuZWlnaGJvcnNbal0sICcnXSk7XG4gICAgfVxuICAgIG1vZHMucHVzaChbYywgc3RhaXJdKTtcbiAgICByZXR1cm4gbW9kcztcbiAgfVxuXG4gIHRyeUFkZFN0YWlyKGE6IEEsIGM6IEdyaWRDb29yZCwgc3RhaXJzOiBudW1iZXJbXSk6IGJvb2xlYW4ge1xuICAgIGlmIChhLmZpeGVkLmhhcygoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgIGNvbnN0IGJvdGggPSBzdGFpcnNbMF0gJiYgc3RhaXJzWzFdO1xuICAgIGNvbnN0IHRvdGFsID0gc3RhaXJzWzBdICsgc3RhaXJzWzFdO1xuICAgIGNvbnN0IHVwID0gdGhpcy5yYW5kb20ubmV4dEludCh0b3RhbCkgPCBzdGFpcnNbMF07XG4gICAgY29uc3QgY2FuZGlkYXRlcyA9IFt1cCA/IDAgOiAxXTtcbiAgICBpZiAoYm90aCkgY2FuZGlkYXRlcy5wdXNoKHVwID8gMSA6IDApO1xuICAgIGZvciAoY29uc3Qgc3RhaXIgb2YgY2FuZGlkYXRlcykge1xuICAgICAgY29uc3Qgc3RhaXJDaGFyID0gJzw+J1tzdGFpcl07XG4gICAgICBjb25zdCBzdGFpclRpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArIHN0YWlyQ2hhciArIHRpbGUuc3Vic3RyaW5nKDUpO1xuICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcoc3RhaXJUaWxlKS5sZW5ndGgpIHtcbiAgICAgICAgYS5ncmlkLnNldCgoYyB8IDB4ODA4KSBhcyBHcmlkQ29vcmQsIHN0YWlyQ2hhcik7XG4gICAgICAgIHN0YWlyc1tzdGFpcl0tLTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIG1ha2UgYSBwYXRoIGNvbm5lY3Rpbmcgc3RhcnQgdG8gZW5kIChib3RoIGNlbnRlcnMpLlxuICAgKiBSZXF1aXJlcyBhbGwgLi4uP1xuICAgKi9cbiAgdHJ5Q29ubmVjdChhOiBBLCBzdGFydDogR3JpZENvb3JkLCBlbmQ6IEdyaWRDb29yZCxcbiAgICAgICAgICAgICBjaGFyOiBzdHJpbmcsIGF0dGVtcHRzID0gMSk6IGJvb2xlYW4ge1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXA8R3JpZENvb3JkLCBzdHJpbmc+KCk7XG4gICAgICBsZXQgcG9zID0gc3RhcnQ7XG4gICAgICBpZiAoKHN0YXJ0ICYgZW5kICYgMHg4MDgpICE9PSAweDgwOCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGJhZCBzdGFydCAke2hleChzdGFydCl9IG9yIGVuZCAke2hleChlbmQpfWApO1xuICAgICAgfVxuICAgICAgcmVwbGFjZS5zZXQocG9zLCBjaGFyKTtcbiAgICAgIHdoaWxlIChwb3MgIT09IGVuZCkge1xuICAgICAgICAvLyBvbiBhIGNlbnRlciAtIGZpbmQgZWxpZ2libGUgZGlyZWN0aW9uc1xuICAgICAgICBjb25zdCBkaXJzOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBbOCwgLTgsIDB4ODAwLCAtMHg4MDBdKSB7XG4gICAgICAgICAgY29uc3QgcG9zMSA9IHBvcyArIGRpciBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgcG9zMiA9IHBvcyArIDIgKiBkaXIgYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmIChhLmZpeGVkLmhhcyhwb3MyKSkgY29udGludWU7XG4gICAgICAgICAgaWYgKHJlcGxhY2UuZ2V0KHBvczIpID8/IGEuZ3JpZC5nZXQocG9zMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIocG9zMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGlycy5sZW5ndGgpIGJyZWFrO1xuICAgICAgICBjb25zdCBkeSA9IChlbmQgPj4gMTIpIC0gKHBvcyA+PiAxMilcbiAgICAgICAgY29uc3QgZHggPSAoZW5kICYgMHhmMCkgLSAocG9zICYgMHhmMCk7XG4gICAgICAgIGNvbnN0IHByZWZlcnJlZCA9IG5ldyBTZXQ8bnVtYmVyPihkaXJzKTtcbiAgICAgICAgaWYgKGR5IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSgweDgwMCk7XG4gICAgICAgIGlmIChkeSA+IDApIHByZWZlcnJlZC5kZWxldGUoLTB4ODAwKTtcbiAgICAgICAgaWYgKGR4IDwgMCkgcHJlZmVycmVkLmRlbGV0ZSg4KTtcbiAgICAgICAgaWYgKGR4ID4gMCkgcHJlZmVycmVkLmRlbGV0ZSgtOCk7XG4gICAgICAgIC8vIDM6MSBiaWFzIGZvciBwcmVmZXJyZWQgZGlyZWN0aW9ucyAgKFRPRE8gLSBiYWNrdHJhY2tpbmc/KVxuICAgICAgICBkaXJzLnB1c2goLi4ucHJlZmVycmVkLCAuLi5wcmVmZXJyZWQpO1xuICAgICAgICBjb25zdCBkaXIgPSB0aGlzLnJhbmRvbS5waWNrKGRpcnMpO1xuICAgICAgICByZXBsYWNlLnNldChwb3MgKyBkaXIgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgICAgICAgcmVwbGFjZS5zZXQocG9zID0gcG9zICsgMiAqIGRpciBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAgICAgfVxuICAgICAgaWYgKHBvcyAhPT0gZW5kKSBjb250aW51ZTtcbiAgICAgIC8vIElmIHdlIGdvdCB0aGVyZSwgbWFrZSB0aGUgY2hhbmdlcy5cbiAgICAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHJlcGxhY2UpIHtcbiAgICAgICAgYS5ncmlkLnNldChjLCB2KTtcbiAgICAgICAgaWYgKChjICYgMHg4MDgpID09PSAweDgwOCkgYS5jb3VudCsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRyeUFkZExvb3AoYTogQSwgY2hhcjogc3RyaW5nLCBhdHRlbXB0cyA9IDEpOiBib29sZWFuIHtcbiAgICAvLyBwaWNrIGEgcGFpciBvZiBjb29yZHMgZm9yIHN0YXJ0IGFuZCBlbmRcbiAgICBjb25zdCB1ZiA9IG5ldyBVbmlvbkZpbmQ8R3JpZENvb3JkPigpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5ncmlkLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGMgPSBhLmdyaWQuY29vcmQoaSBhcyBHcmlkSW5kZXgpO1xuICAgICAgaWYgKGEuZ3JpZC5nZXQoYykgfHwgYS5ncmlkLmlzQm9yZGVyKGMpKSBjb250aW51ZTtcbiAgICAgIGlmICghYS5ncmlkLmdldChFKGMpKSkgdWYudW5pb24oW2MsIEUoYyldKTtcbiAgICAgIGlmICghYS5ncmlkLmdldChTKGMpKSkgdWYudW5pb24oW2MsIFMoYyldKTtcbiAgICB9XG4gICAgY29uc3QgZWxpZ2libGUgPVxuICAgICAgICBuZXcgRGVmYXVsdE1hcDx1bmtub3duLCBbR3JpZENvb3JkLCBHcmlkQ29vcmRdW10+KCgpID0+IFtdKTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYS5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgYyA9IHMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAoIWEuZ3JpZC5nZXQoYykpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCBkIG9mIFs4LCAtOCwgMHg4MDAsIC0weDgwMF0pIHtcbiAgICAgICAgY29uc3QgZTEgPSBjICsgZCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmIChhLmdyaWQuaXNCb3JkZXIoZTEpIHx8IGEuZ3JpZC5nZXQoZTEpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgZTIgPSBjICsgMiAqIGQgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoYS5ncmlkLmdldChlMikpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCByZXBsYWNlID0gbmV3IE1hcChbW2UxIGFzIEdyaWRDb29yZCwgY2hhcl1dKTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIHMsIHtyZXBsYWNlfSk7XG4gICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgIGVsaWdpYmxlLmdldCh1Zi5maW5kKGUyKSkucHVzaChbZTEsIGUyXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgd2VpZ2h0ZWRNYXAgPSBuZXcgTWFwPEdyaWRDb29yZCwgW0dyaWRDb29yZCwgR3JpZENvb3JkXVtdPigpO1xuICAgIGZvciAoY29uc3QgcGFydGl0aW9uIG9mIGVsaWdpYmxlLnZhbHVlcygpKSB7XG4gICAgICBpZiAocGFydGl0aW9uLmxlbmd0aCA8IDIpIGNvbnRpbnVlOyAvLyBUT0RPIC0gMyBvciA0P1xuICAgICAgZm9yIChjb25zdCBbZTFdIG9mIHBhcnRpdGlvbikge1xuICAgICAgICB3ZWlnaHRlZE1hcC5zZXQoZTEsIHBhcnRpdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHdlaWdodGVkID0gWy4uLndlaWdodGVkTWFwLnZhbHVlcygpXTtcbiAgICBpZiAoIXdlaWdodGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIHdoaWxlIChhdHRlbXB0cy0tID4gMCkge1xuICAgICAgY29uc3QgcGFydGl0aW9uID0gdGhpcy5yYW5kb20ucGljayh3ZWlnaHRlZCk7XG4gICAgICBjb25zdCBbW2UwLCBjMF0sIFtlMSwgYzFdXSA9IHRoaXMucmFuZG9tLmlzaHVmZmxlKHBhcnRpdGlvbik7XG4gICAgICBhLmdyaWQuc2V0KGUwLCBjaGFyKTtcbiAgICAgIGEuZ3JpZC5zZXQoZTEsIGNoYXIpO1xuICAgICAgaWYgKHRoaXMudHJ5Q29ubmVjdChhLCBjMCwgYzEsIGNoYXIsIDUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgYS5ncmlkLnNldChlMCwgJycpO1xuICAgICAgYS5ncmlkLnNldChlMSwgJycpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBleHRlbmQgYW4gZXhpc3Rpbmcgc2NyZWVuIGludG8gYSBkaXJlY3Rpb24gdGhhdCdzXG4gICAqIGN1cnJlbnRseSBlbXB0eS4gIExlbmd0aCBpcyBwcm9iYWJpbGlzdGljLCBlYWNoIHN1Y2Nlc3NmdWxcbiAgICogYXR0ZW1wdCB3aWxsIGhhdmUgYSAxL2xlbmd0aCBjaGFuY2Ugb2Ygc3RvcHBpbmcuICBSZXR1cm5zIG51bWJlclxuICAgKiBvZiBzY3JlZW5zIGFkZGVkLlxuICAgKi9cbiAgdHJ5RXh0cnVkZShhOiBBLCBjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLCBhdHRlbXB0cyA9IDEpOiBudW1iZXIge1xuICAgIC8vIExvb2sgZm9yIGEgcGxhY2UgdG8gc3RhcnQuXG4gICAgd2hpbGUgKGF0dGVtcHRzLS0pIHtcbiAgICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShhLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgICBjb25zdCBtaWQgPSBjICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoIWEuZ3JpZC5nZXQobWlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QoYS5ncmlkLCBjKTtcbiAgICAgICAgZm9yIChsZXQgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgICAgICBjb25zdCBuMSA9IG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgbjIgPSBtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYG1pZDogJHttaWQudG9TdHJpbmcoMTYpfTsgbjEoJHtuMS50b1N0cmluZygxNil9KTogJHthLmdyaWQuZ2V0KG4xKX07IG4yKCR7bjIudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChuMil9YCk7XG4gICAgICAgICAgaWYgKGEuZ3JpZC5nZXQobjEpIHx8IGEuZ3JpZC5pc0JvcmRlcihuMSkgfHwgYS5ncmlkLmdldChuMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShhLCBjaGFyLCBsZW5ndGgsIG4yKTtcbiAgICAgICAgICAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMiwgJycpO1xuICAgICAgICAgICAgYS5ncmlkLnNldChuMSwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8qKiBSZWN1cnNpdmUgYXR0ZW1wdC4gKi9cbiAgdHJ5Q29udGludWVFeHRydWRlKGE6IEEsIGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGM6IEdyaWRDb29yZCk6IG51bWJlciB7XG4gICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgIGNvbnN0IG9rID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKS5sZW5ndGggPiAwO1xuICAgIGlmIChsZW5ndGggPT09IDEpIHJldHVybiBvayA/IDEgOiAwO1xuICAgIC8vIG1heWJlIHJldHVybiBlYXJseVxuICAgIGlmIChvayAmJiAhdGhpcy5yYW5kb20ubmV4dEludChsZW5ndGgpKSByZXR1cm4gMTtcbiAgICAvLyBmaW5kIGEgbmV3IGRpcmVjdGlvblxuICAgIGZvciAoY29uc3QgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgIGNvbnN0IG4xID0gYyArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICBjb25zdCBuMiA9IGMgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmIChhLmdyaWQuZ2V0KG4xKSB8fCBhLmdyaWQuaXNCb3JkZXIobjEpIHx8IGEuZ3JpZC5nZXQobjIpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICBhLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgYS5ncmlkLnNldChuMiwgY2hhcik7XG4gICAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoYSwgY2hhciwgbGVuZ3RoIC0gMSwgbjIpO1xuICAgICAgICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZCArIDE7XG4gICAgICAgIGEuZ3JpZC5zZXQobjIsICcnKTtcbiAgICAgICAgYS5ncmlkLnNldChuMSwgJycpO1xuICAgICAgfVxuICAgICAgaWYgKG9rKSBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIG9rID8gMSA6IDA7XG4gIH1cblxuICAvKiogQXR0ZW1wdCB0byBhZGQgYSBncmlkIHR5cGUuICovXG4gIHRyeUFkZChhOiBBLCBvcHRzOiBBZGRPcHRzID0ge30pOiBudW1iZXIge1xuICAgIC8vIE9wdGlvbmFsbHkgc3RhcnQgYXQgdGhlIGdpdmVuIHNjcmVlbiBvbmx5LlxuICAgIGNvbnN0IHRpbGVzZXQgPSB0aGlzLm9yaWcudGlsZXNldDtcbiAgICBjb25zdCB7YXR0ZW1wdHMgPSAxLCBjaGFyID0gJ2MnLCBzdGFydCwgbG9vcCA9IGZhbHNlfSA9IG9wdHM7XG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBhdHRlbXB0czsgYXR0ZW1wdCsrKSB7XG4gICAgICBjb25zdCBzdGFydEl0ZXIgPVxuICAgICAgICAgIHN0YXJ0ICE9IG51bGwgP1xuICAgICAgICAgICAgICBbKHN0YXJ0ICYgMHhmMGYwKSBhcyBHcmlkQ29vcmRdIDpcbiAgICAgICAgICAgICAgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSk7XG4gICAgICBmb3IgKGNvbnN0IGMgb2Ygc3RhcnRJdGVyKSB7XG4gICAgICAgIGNvbnN0IG1pZCA9IGMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gICAgICAgIGlmICghYS5ncmlkLmdldChtaWQpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpO1xuICAgICAgICBmb3IgKGxldCBkaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAgICAgICAgIGNvbnN0IG4xID0gbWlkICsgR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBjb25zdCBuMiA9IG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGlmIChhLmZpeGVkLmhhcyhuMSkgfHwgYS5maXhlZC5oYXMobjIpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBvMSA9IGEuZ3JpZC5nZXQobjEpO1xuICAgICAgICAgIGNvbnN0IG8yID0gYS5ncmlkLmdldChuMik7XG4vL2NvbnNvbGUubG9nKGBtaWQoJHttaWQudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChtaWQpfTsgbjEoJHtuMS50b1N0cmluZygxNil9KTogJHthLmdyaWQuZ2V0KG4xKX07IG4yKCR7bjIudG9TdHJpbmcoMTYpfSk6ICR7YS5ncmlkLmdldChuMil9YCk7XG4gICAgICAgICAgLy8gYWxsb3cgbWFraW5nIHByb2dyZXNzIG9uIHRvcCBvZiBhbiBlZGdlLW9ubHkgY29ubmVjdGlvbi5cbiAgICAgICAgICBpZiAoKG8xICYmIChvMiB8fCBvMSAhPT0gY2hhcikpIHx8IGEuZ3JpZC5pc0JvcmRlcihuMSkpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghbG9vcCkge1xuICAgICAgICAgICAgY29uc3QgbmVpZ2hib3JUaWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgbjIgLSAweDgwOCBhcyBHcmlkQ29vcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3JlcGxhY2U6IG5ldyBNYXAoW1tuMSwgJyddXSl9KTtcbiAgICAgICAgICAgIGlmICgvXFxTLy50ZXN0KG5laWdoYm9yVGlsZSkpIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgICAgICBpZiAodGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gICAgICAgICAgICBhLmNvdW50Kys7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4xLCBjaGFyKTtcbiAgICAgICAgICAgIGEuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICAgICAgLy8gaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShhLCBjaGFyLCBsZW5ndGgsIG4yKTtcbiAgICAgICAgICAgIC8vICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbmVpZ2hib3JUaWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgbjIgLSAweDgwOCBhcyBHcmlkQ29vcmQpO1xuICAgICAgICAgICAgaWYgKHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhuZWlnaGJvclRpbGUpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4yLCBvMik7XG4gICAgICAgICAgICBhLmdyaWQuc2V0KG4xLCBvMSk7XG4gICAgICAgICAgICBhLmNvdW50LS07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLy8gLyoqXG4gIC8vICAqIEF0dGVtcHQgdG8gZXh0ZW5kIGFuIGV4aXN0aW5nIHNjcmVlbiBpbnRvIGEgZGlyZWN0aW9uIHRoYXQnc1xuICAvLyAgKiBjdXJyZW50bHkgZW1wdHkuICBMZW5ndGggaXMgcHJvYmFiaWxpc3RpYywgZWFjaCBzdWNjZXNzZnVsXG4gIC8vICAqIGF0dGVtcHQgd2lsbCBoYXZlIGEgMS9sZW5ndGggY2hhbmNlIG9mIHN0b3BwaW5nLiAgUmV0dXJucyBudW1iZXJcbiAgLy8gICogb2Ygc2NyZWVucyBhZGRlZC5cbiAgLy8gICovXG4gIC8vIHRyeUV4dHJ1ZGUoYTogQSwgY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciwgYXR0ZW1wdHMgPSAxKTogbnVtYmVyIHtcbiAgLy8gICAvLyBMb29rIGZvciBhIHBsYWNlIHRvIHN0YXJ0LlxuICAvLyAgIHdoaWxlIChhdHRlbXB0cy0tKSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoYS5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgLy8gICAgICAgY29uc3QgbWlkID0gYyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgLy8gICAgICAgaWYgKCFhLmdyaWQuZ2V0KG1pZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KGEuZ3JpZCwgYyk7XG4gIC8vICAgICAgIGZvciAobGV0IGRpciBvZiBbMCwgMSwgMiwgM10pIHtcbiAgLy8gICAgICAgICBpZiAoYS5ncmlkLmdldChtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICAgIGNvbnN0IGkgPSBUSUxFRElSW2Rpcl07XG4gIC8vICAgICAgICAgaWYgKHRpbGVbaV0gIT09ICcgJykgY29udGludWU7XG4gIC8vICAgICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAvLyAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHJlcCkubGVuZ3RoKSB7XG4gIC8vICAgICAgICAgICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGEsIGNoYXIsIGxlbmd0aCwgbWlkLCBkaXIpO1xuICAvLyAgICAgICAgICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQ7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiAwO1xuICAvLyB9XG5cbiAgLy8gdHJ5Q29udGludWVFeHRydWRlKGE6IEEsIGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsXG4gIC8vICAgICAgICAgICAgICAgICAgICBtaWQ6IEdyaWRDb29yZCwgZGlyOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPihbXSk7XG4gIC8vICAgbGV0IHdvcmtzOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPnx1bmRlZmluZWQ7XG4gIC8vICAgbGV0IHdlaWdodCA9IDA7XG4gIC8vICAgT1VURVI6XG4gIC8vICAgd2hpbGUgKHRydWUpIHtcbiAgLy8gICAgIHJlcGxhY2Uuc2V0KG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgcmVwbGFjZS5zZXQobWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgbWlkID0gKG1pZCArIDIgKiBHUklERElSW2Rpcl0pIGFzIEdyaWRDb29yZDtcblxuICAvLyAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIG1pZCAtIDB4ODA4IGFzIEdyaWRDb29yZCwge3JlcGxhY2V9KTtcbiAgLy8gICAgIHdlaWdodCsrO1xuICAvLyAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSkubGVuZ3RoKSB7XG4gIC8vICAgICAgIHdvcmtzID0gWy4uLnJlcGxhY2VdO1xuICAvLyAgICAgICAvLyB3ZSBjYW4gcXVpdCBub3cgLSBzZWUgaWYgd2Ugc2hvdWxkLlxuICAvLyAgICAgICB3aGlsZSAod2VpZ2h0ID4gMCkge1xuICAvLyAgICAgICAgIGlmICghdGhpcy5yYW5kb20ubmV4dEludChsZW5ndGgpKSBicmVhayBPVVRFUjtcbiAgLy8gICAgICAgICB3ZWlnaHQtLTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuXG4gIC8vICAgICAvLyBGaW5kIGEgdmlhYmxlIG5leHQgc3RlcC5cbiAgLy8gICAgIGZvciAoY29uc3QgbmV4dERpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gIC8vICAgICAgIGNvbnN0IGRlbHRhID0gR1JJRERJUltuZXh0RGlyXTtcbiAgLy8gICAgICAgY29uc3QgZWRnZSA9IG1pZCArIGRlbHRhIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgICAgaWYgKGEuZ3JpZC5pc0JvcmRlcihlZGdlKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChyZXBsYWNlLmdldCguLi4pIHx8IGEuZ3JpZC5nZXQobWlkICsgMiAqIGRlbHRhIGFzIEdyaWRDb29yZCkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAvLyAgICAgICBpZiAodGlsZVtpXSAhPT0gJyAnKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAvLyAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAvLyAgICAgICAgIHJlcGxhY2Uuc2V0KG1pZCArIGRlbHRhIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICAgICAgcmVwbGFjZS5zZXQobWlkICsgMiAqIGRlbHRhIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gIC8vICAgICAgICAgZGlyID0gbmV4dERpcjtcbiAgLy8gICAgICAgICBjb250aW51ZSBPVVRFUjtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgICAgYnJlYWs7IC8vIG5ldmVyIGZvdW5kIGEgZm9sbG93LXVwLCBzbyBxdWl0XG4gIC8vICAgfVxuICAvLyAgIGlmICghd29ya3MpIHJldHVybiAwO1xuICAvLyAgIGZvciAoY29uc3QgW2MsIHZdIG9mIHdvcmtzKSB7XG4gIC8vICAgICBhLmdyaWQuc2V0KGMsIHYpO1xuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gd29ya3MubGVuZ3RoID4+PiAxO1xuICAvLyB9XG5cbiAgLyoqIE1ha2UgYXJyYW5nZW1lbnRzIHRvIG1heGltaXplIHRoZSBzdWNjZXNzIGNoYW5jZXMgb2YgaW5mZXIuICovXG4gIHByZWluZmVyKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSkge1xuICAgICAgaWYgKChyZXN1bHQgPSB0aGlzLnByZWluZmVyU3Bpa2VzKGEpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgcHJlaW5mZXJTcGlrZXMoYTogQSk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy8gbWFrZSBzdXJlIHRoZXJlJ3MgYSAnYycgYWJvdmUgZWFjaCAncydcbiAgICAvLyBjaGVjayBzaWRlcz9cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBpbmZlclNjcmVlbnMoYTogQSk6IFJlc3VsdDxNZXRhbG9jYXRpb24+IHtcbiAgICBjb25zdCBzY3JlZW5zOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgYS5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIHMpO1xuICAgICAgY29uc3QgY2FuZGlkYXRlcyA9XG4gICAgICAgICAgdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKVxuICAgICAgICAgICAgICAuZmlsdGVyKHMgPT4gIXMuZGF0YS5tb2QpO1xuICAgICAgaWYgKCFjYW5kaWRhdGVzLmxlbmd0aCkge1xuICAgICAgICAvL2NvbnNvbGUuZXJyb3IoYS5ncmlkLnNob3coKSk7XG5pZiAoYS5ncmlkLnNob3coKS5sZW5ndGggPiAxMDAwMDApIGRlYnVnZ2VyO1xuICAgICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluZmVyIHNjcmVlbiAke2hleChzKX06IFske3RpbGV9XVxcbiR7YS5ncmlkLnNob3coKX1gfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpY2sgPSB0aGlzLnJhbmRvbS5waWNrKGNhbmRpZGF0ZXMpO1xuICAgICAgc2NyZWVucy5wdXNoKHBpY2spO1xuICAgICAgaWYgKHBpY2suaGFzRmVhdHVyZSgnd2FsbCcpKSBhLndhbGxzKys7XG4gICAgICBpZiAocGljay5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgYS5icmlkZ2VzKys7XG5cbiAgICAgIC8vIFRPRE8gLSBhbnkgb3RoZXIgZmVhdHVyZXMgdG8gdHJhY2s/XG5cbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gbmV3IE1ldGFsb2NhdGlvbih0aGlzLnBhcmFtcy5pZCwgdGhpcy5vcmlnLnRpbGVzZXQsIGEuaCwgYS53KTtcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGEuaDsgeSsrKSB7XG4gICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGEudzsgeCsrKSB7XG4gICAgICAgIG1ldGEuc2V0KHkgPDwgNCB8IHgsIHNjcmVlbnNbeSAqIGEudyArIHhdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge29rOiB0cnVlLCB2YWx1ZTogbWV0YX07XG4gIH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSByaWdodCBudW1iZXIgb2Ygd2FsbHMgYW5kIGJyaWRnZXNcbiAgICAvLyBhLndhbGxzID0gYS5icmlkZ2VzID0gMDsgLy8gVE9ETyAtIGRvbid0IGJvdGhlciBtYWtpbmcgdGhlc2UgaW5zdGFuY2VcbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgIC8vICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge2NvbnNvbGUud2FybihoZXgocG9zKSk7IGEuYnJpZGdlcysrO31cbiAgICAvLyAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSBhLndhbGxzKys7XG4gICAgLy8gfVxuICAgIGNvbnN0IGJyaWRnZXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYnJpZGdlIHx8IDA7XG4gICAgY29uc3Qgd2FsbHMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ud2FsbCB8fCAwO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKG1ldGEuYWxsUG9zKCkpKSB7XG4gICAgICBjb25zdCBjID0gKChwb3MgPDwgOCB8IHBvcyA8PCA0KSAmIDB4ZjBmMCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdChhLmdyaWQsIGMpXG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKGEuYnJpZGdlcyA8PSBicmlkZ2VzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5hZGRCbG9ja3MgJiZcbiAgICAgICAgICB0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICdibG9jaycpKSkge1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSBhLmJyaWRnZXMtLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZy50aWxlc2V0LndpdGhNb2QodGlsZSwgJ2JyaWRnZScpKSkge1xuICAgICAgICAgIGEuYnJpZGdlcy0tO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAvLyB9IGVsc2UgaWYgKGJyaWRnZXMgPCBhLmJyaWRnZXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAvLyAgIC8vIGNhbid0IGFkZCBicmlkZ2VzP1xuICAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoYS53YWxscyA8IHdhbGxzICYmICFzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICd3YWxsJykpKSB7XG4gICAgICAgICAgYS53YWxscysrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUud2FybihgYnJpZGdlcyAke2EuYnJpZGdlc30gJHticmlkZ2VzfSAvIHdhbGxzICR7YS53YWxsc30gJHt3YWxsc31cXG4ke2EuZ3JpZC5zaG93KCl9XFxuJHttZXRhLnNob3coKX1gKTtcbiAgICBpZiAoYS5icmlkZ2VzICE9PSBicmlkZ2VzKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgZmFpbDogYHJlZmluZU1ldGEgYnJpZGdlcyB3YW50ICR7YnJpZGdlc30gZ290ICR7YS5icmlkZ2VzfVxcbiR7bWV0YS5zaG93KCl9YH07XG4gICAgfVxuICAgIGlmIChhLndhbGxzICE9PSB3YWxscykge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgIGZhaWw6IGByZWZpbmVNZXRhIHdhbGxzIHdhbnQgJHt3YWxsc30gZ290ICR7YS53YWxsc31cXG4ke21ldGEuc2hvdygpfWB9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICB0cnlNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcG9zOiBQb3MsXG4gICAgICAgICAgc2NyZWVuczogSXRlcmFibGU8TWV0YXNjcmVlbj4pOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IHMgb2Ygc2NyZWVucykge1xuICAgICAgaWYgKCF0aGlzLmNoZWNrTWV0YShtZXRhLCBuZXcgTWFwKFtbcG9zLCBzXV0pKSkgY29udGludWU7XG4gICAgICBtZXRhLnNldChwb3MsIHMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNoZWNrTWV0YShtZXRhOiBNZXRhbG9jYXRpb24sIHJlcGxhY2VtZW50cz86IE1hcDxQb3MsIE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG5cbiAgICAvLyBUT0RPIC0gZmxpZ2h0PyAgbWF5IGhhdmUgYSBkaWZmICMgb2YgZmxpZ2h0IHZzIG5vbi1mbGlnaHQgcGFydGl0aW9uc1xuICAgIGNvbnN0IG9wdHMgPSByZXBsYWNlbWVudHMgPyB7d2l0aDogcmVwbGFjZW1lbnRzfSA6IHt9O1xuICAgIGNvbnN0IHBhcnRzID0gbWV0YS50cmF2ZXJzZShvcHRzKTtcbiAgICByZXR1cm4gbmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA9PT0gdGhpcy5tYXhQYXJ0aXRpb25zO1xuICB9XG5cbiAgcmVxdWlyZUVsaWdpYmxlUGl0RGVzdGluYXRpb24obWV0YTogTWV0YWxvY2F0aW9uKTogYm9vbGVhbiB7XG4gICAgbGV0IHYgPSBmYWxzZTtcbiAgICBsZXQgaCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykgfHwgc2NyLmhhc0ZlYXR1cmUoJ2VtcHR5JykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAoc2NyLmRhdGEuZWRnZXMgfHwgJycpLnNwbGl0KCcnKS5tYXAoeCA9PiB4ID09PSAnICcgPyAnJyA6IHgpO1xuICAgICAgaWYgKGVkZ2VzWzBdICYmIGVkZ2VzWzJdKSB2ID0gdHJ1ZTtcbiAgICAgIC8vIE5PVEU6IHdlIGNsYW1wIHRoZSB0YXJnZXQgWCBjb29yZHMgc28gdGhhdCBzcGlrZSBzY3JlZW5zIGFyZSBhbGwgZ29vZFxuICAgICAgLy8gdGhpcyBwcmV2ZW50cyBlcnJvcnMgZnJvbSBub3QgaGF2aW5nIGEgdmlhYmxlIGRlc3RpbmF0aW9uIHNjcmVlbi5cbiAgICAgIGlmICgoZWRnZXNbMV0gJiYgZWRnZXNbM10pIHx8IHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICBoID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh2ICYmIGgpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjaGVja01ldGFzY3JlZW5zKGE6IEEsIG1ldGE6IE1ldGFsb2NhdGlvbik6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3RhdHVlKSByZXR1cm4gT0s7XG4gICAgbGV0IHN0YXR1ZXMgPSAwO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBzdGF0dWVzICs9IHNjci5kYXRhLnN0YXR1ZXM/Lmxlbmd0aCB8fCAwO1xuICAgIH1cbiAgICBpZiAoc3RhdHVlcyA8IHRoaXMucGFyYW1zLmZlYXR1cmVzLnN0YXR1ZSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBpbnN1ZmZpY2llbnQgc3RhdHVlIHNjcmVlbnNgfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cbi8vIFRPRE86XG4vLyAgLSB3aGVuIHRoZXJlJ3MgYSBicmlkZ2UsIG5ldyBydWxlIHRvIHJlcXVpcmUgYSBzdGFpciBvciBwb2lcbi8vICAgIHRvIGJlIHBhcnRpdGlvbmVkIG9mZiBpZiBicmlkZ2UgdGlsZSBpcyByZW1vdmVkXG4vLyAgLSBwb3NzaWJseSBhbHNvICpsaW5rKiB0byBvdGhlciBzY3JlZW4/XG4vLyAgLSBwbGFjZSBicmlkZ2UgZWFybHkgb3IgbGF0ZT9cbi8vICAgIC0gaWYgZWFybHkgdGhlbiBubyB3YXkgdG8gZW5mb3JjZSB0aHJvdWdobmVzcyBydWxlXG4vLyAgICAtIGlmIGxhdGUgdGhlbiBoYXJkIHRvIHN5bmMgdXAgd2l0aCBvdGhlciBmbG9vclxuLy8gQUxTTywgd2UgZG9uJ3QgaGF2ZSBhIHJlZiB0byB0aGUgdGlsZXNldCByaWdodCBub3csIGRvbid0IGV2ZW5cbi8vIGtub3cgd2hhdCB0aGUgdGlsZXMgYXJlISAgTmVlZCB0byBtYXAgdGhlIDN4MyBncmlkIG9mICg/PykgdG9cbi8vIG1ldGF0aWxlcy5cbi8vICAtIGNvbnNpZGVyIHVwZGF0aW5nIFwiZWRnZVwiIHRvIGJlIHdob2xlIDl4OT9cbi8vICAgICAnIGMgL2NjYy8gICAnXG4vLyAgICAgY2F2ZSgnY2MgYycsICdjJylcbi8vICAgICB0aWxlYFxuLy8gICAgICAgfCBjIHxcbi8vICAgICAgIHxjY2N8XG4vLyAgICAgICB8ICAgfGAsXG4vL1xuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8ICAgfFxuLy8gICAgICAgfGN1IHxcbi8vICAgICAgIHwgICB8YCxcbi8vXG4vLyBCYXNpYyBpZGVhIHdvdWxkIGJlIHRvIHNpbXBsaWZ5IHRoZSBcImZlYXR1cmVzXCIgYml0IHF1aXRlIGEgYml0LFxuLy8gYW5kIGVuY2Fwc3VsYXRlIHRoZSB3aG9sZSB0aGluZyBpbnRvIHRoZSB0aWxlIC0gZWRnZXMsIGNvcm5lcnMsIGNlbnRlci5cbi8vXG4vLyBGb3Igb3ZlcndvcmxkLCAnbycgbWVhbnMgb3BlbiwgJ2cnIGZvciBncmFzcywgZXRjLi4uP1xuLy8gLSB0aGVuIHRoZSBsZXR0ZXJzIGFyZSBhbHdheXMgdGhlIHdhbGthYmxlIHRpbGVzLCB3aGljaCBtYWtlcyBzZW5zZVxuLy8gICBzaW5jZSB0aG9zZSBhcmUgdGhlIG9uZXMgdGhhdCBoYXZlIGFsbCB0aGUgdmFyaWV0eS5cbi8vICAgICB0aWxlYFxuLy8gICAgICAgfG9vIHxcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8ICAgfGAsXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8b29vfFxuLy8gICAgICAgfG9nb3xgLFxuXG4vLyBleHBvcnQgY2xhc3MgQ2F2ZVNodWZmbGVBdHRlbXB0IGV4dGVuZHMgTWF6ZVNodWZmbGVBdHRlbXB0IHtcblxuLy8gICByZWFkb25seSB0aWxlc2V0OiBNZXRhdGlsZXNldDtcbi8vICAgcmVhZG9ubHkgZ3JpZDogR3JpZDxzdHJpbmc+O1xuLy8gICByZWFkb25seSBmaXhlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuLy8gICByZWFkb25seSBzY3JlZW5zOiByZWFkb25seSBHcmlkQ29vcmRbXSA9IFtdO1xuLy8gICBtZXRhITogTWV0YWxvY2F0aW9uO1xuLy8gICBjb3VudCA9IDA7XG4vLyAgIHdhbGxzID0gMDtcbi8vICAgYnJpZGdlcyA9IDA7XG4vLyAgIG1heFBhcnRpdGlvbnMgPSAxO1xuLy8gICBtaW5TcGlrZXMgPSAyO1xuXG4vLyAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGg6IG51bWJlciwgcmVhZG9ubHkgdzogbnVtYmVyLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBwYXJhbXM6IFN1cnZleSwgcmVhZG9ubHkgcmFuZG9tOiBSYW5kb20pIHtcbi8vICAgICBzdXBlcigpO1xuLy8gICAgIHRoaXMuZ3JpZCA9IG5ldyBHcmlkKGgsIHcpO1xuLy8gICAgIHRoaXMuZ3JpZC5kYXRhLmZpbGwoJycpO1xuLy8gICAgIGZvciAobGV0IHkgPSAwLjU7IHkgPCBoOyB5KyspIHtcbi8vICAgICAgIGZvciAobGV0IHggPSAwLjU7IHggPCB3OyB4KyspIHtcbi8vICAgICAgICAgaWYgKHkgPiAxKSB0aGlzLmdyaWQuc2V0Mih5IC0gMC41LCB4LCAnYycpO1xuLy8gICAgICAgICBpZiAoeCA+IDEpIHRoaXMuZ3JpZC5zZXQyKHksIHggLSAwLjUsICdjJyk7XG4vLyAgICAgICAgIHRoaXMuZ3JpZC5zZXQyKHksIHgsICdjJyk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHRoaXMuY291bnQgPSBoICogdztcbi8vICAgICBjb25zdCBzY3JlZW5zOiBHcmlkQ29vcmRbXSA9IFtdO1xuLy8gICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbi8vICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbi8vICAgICAgICAgc2NyZWVucy5wdXNoKCh5IDw8IDEyIHwgeCA8PCA0KSBhcyBHcmlkQ29vcmQpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgICB0aGlzLnNjcmVlbnMgPSBzY3JlZW5zO1xuLy8gICB9XG5cblxuICAvLyBjaGVja1JlYWNoYWJpbGl0eShyZXBsYWNlPzogTWFwPEdyaWRDb29yZCwgc3RyaW5nPik6IGJvb2xlYW4ge1xuICAvLyAgIHRocm93IG5ldyBFcnJvcigpO1xuICAvLyB9XG5cblxuZXhwb3J0IGNsYXNzIFdpZGVDYXZlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgYWRkTGF0ZUZlYXR1cmVzKGE6IEEpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByZXN1bHQgPSBzdXBlci5hZGRMYXRlRmVhdHVyZXMoYSk7XG4gICAgaWYgKCFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgYS5ncmlkLmRhdGEgPSBhLmdyaWQuZGF0YS5tYXAoYyA9PiBjID09PSAnYycgPyAndycgOiBjKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENyeXB0RW50cmFuY2VTaHVmZmxlIGV4dGVuZHMgQ2F2ZVNodWZmbGUge1xuICByZWZpbmVNZXRhc2NyZWVucyhhOiBBLCBtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIGNoYW5nZSBhcmVuYSBpbnRvIGNyeXB0IGFyZW5hXG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBhLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBhLnc7IHgrKykge1xuICAgICAgICBpZiAoYS5ncmlkLmdldCgoeSA8PCAxMiB8IHggPDwgNCB8IDB4ODA4KSBhcyBHcmlkQ29vcmQpID09PSAnYScpIHtcbiAgICAgICAgICBtZXRhLnNldCh5IDw8IDQgfCB4LCBtZXRhLnJvbS5tZXRhc2NyZWVucy5jcnlwdEFyZW5hX3N0YXR1ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5yZWZpbmVNZXRhc2NyZWVucyhhLCBtZXRhKTtcbiAgfVxuXG4gIGlzRWxpZ2libGVBcmVuYShhOiBBLCBjOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIWEuZ3JpZC5nZXQoYyAtIDB4ODAwIGFzIEdyaWRDb29yZCkgJiYgc3VwZXIuaXNFbGlnaWJsZUFyZW5hKGEsIGMpO1xuICB9XG59XG5cbmNvbnN0IFRJTEVESVIgPSBbMSwgMywgNywgNV07XG5jb25zdCBHUklERElSID0gWy0weDgwMCwgLTgsIDB4ODAwLCA4XTtcblxuLy8gVGhpcyBtaWdodCBjb3ZlciBhbGwgb2YgdHJ5RXh0cnVkZSwgdHJ5Q29udGludWVFeHRydWRlLCB0cnlDb25uZWN0XG4vLyAgLSBjb3VsZCBhbHNvIGZpbmQgYSB3YXkgdG8gYWRkIHRyeUFkZExvb3A/XG5pbnRlcmZhY2UgQWRkT3B0cyB7XG4gIGNoYXI/OiBzdHJpbmc7XG4gIC8vIGxlbmd0aDogbnVtYmVyO1xuICBzdGFydD86IEdyaWRDb29yZDtcbiAgLy8gZW5kOiBHcmlkQ29vcmQ7XG4gIGxvb3A/OiBib29sZWFuOyAvLyBhbGxvdyB2cyByZXF1aXJlP1xuXG4gIGF0dGVtcHRzPzogbnVtYmVyO1xuXG4gIC8vIGJyYW5jaDogYm9vbGVhbjtcbiAgLy8gcmVkdWNlUGFydGl0aW9uczogYm9vbGVhbjsgIC0tIG9yIHByb3ZpZGUgYSBcInNtYXJ0IHBpY2sgc3RhcnQvZW5kXCIgd3JhcHBlclxuXG4gIC8vIFRPRE8gLSBzb21lIGlkZWEgb2Ygd2hldGhlciB0byBwcmVmZXIgZXh0ZW5kaW5nIGFuIGV4aXN0aW5nXG4gIC8vIGRlYWQgZW5kIG9yIG5vdCAtIHRoaXMgd291bGQgcHJvdmlkZSBzb21lIHNvcnQgb2YgXCJicmFuY2hpbmcgZmFjdG9yXCJcbiAgLy8gd2hlcmVieSB3ZSBjYW4gdGlnaHRseSBjb250cm9sIGhvdyBtYW55IGRlYWQgZW5kcyB3ZSBnZXQuLi4/XG4gIC8vIFByb3ZpZGUgYSBcImZpbmQgZGVhZCBlbmRzXCIgZnVuY3Rpb24/XG4gIC8vICAgLSBpbWFnaW5lIGEgdmVyc2lvbiBvZiB3aW5kbWlsbCBjYXZlIHdoZXJlIHdlIHdhbmRlciB0d28gc2NyZWVucyxcbiAgLy8gICAgIHRoZW4gY29ubmVjdCB0aGUgZGVhZCBlbmRzLCB0aGVuIGJyYW5jaCBhbmQgd2FuZGVyIGEgbGl0dGxlIG1vcmU/XG59XG5cbi8vIFRPRE8gLSBwb3RlbnRpYWxseSB3ZSBjb3VsZCBsb29rIGF0IHRoZSB3aG9sZSBwcm9ibGVtXG4vLyBhcyBtYWtpbmcgYSBsaXN0IG9mIGV4dHJ1ZGUvZmVhdHVyZSB0eXBlczpcbi8vICAgLSByLCBjLCBicmFuY2gsIGFyZW5hLCBicmlkZ2UsIHN0YWlyLCAuLi4/XG4vLyBudWNsZWF0ZSB3LyBhbnkgZWRnZXMsIGhhdmUgYSBsaXN0IG9mIHRoZXNlIG9wZXJhdGlvbnMgYW5kIHRoZW5cbi8vIHRyeSBlYWNoIG9uZSwgaWYgaXQgZG9lc24ndCB3b3JrLCByZXNodWZmbGUgaXQgbGF0ZXIgKGZpeGVkICMgb2YgZHJhd3Ncbi8vIGJlZm9yZSBnaXZpbmcgdXApLlxuIl19