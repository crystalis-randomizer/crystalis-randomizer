import { E, S } from './grid.js';
import { seq, hex } from '../rom/util.js';
import { Metalocation } from '../rom/metalocation.js';
import { AbstractMazeShuffle, OK } from '../maze/maze.js';
import { UnionFind } from '../unionfind.js';
import { DefaultMap } from '../util.js';
const [] = [hex];
export class CaveShuffle extends AbstractMazeShuffle {
    constructor() {
        super(...arguments);
        this.maxPartitions = 1;
        this.minSpikes = 2;
        this.maxSpikes = 5;
        this.looseRefine = false;
        this.addBlocks = true;
        this._requirePitDestination = false;
        this.rivers = 0;
        this.wides = 0;
        this.walls = 0;
        this.bridges = 0;
    }
    reset() {
        super.reset();
        this.rivers = 0;
        this.wides = 0;
        this.walls = 0;
        this.bridges = 0;
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
    build() {
        this.init();
        let result;
        if ((result = this.fillGrid()), !result.ok)
            return result;
        if ((result = this.preinfer()), !result.ok)
            return result;
        const meta = this.inferScreens();
        if (!meta.ok)
            return meta;
        if ((result = this.refineMetascreens(meta.value)), !result.ok) {
            return result;
        }
        if ((result = this.checkMetascreens(meta.value)), !result.ok) {
            return result;
        }
        if (this._requirePitDestination &&
            !this.requireEligiblePitDestination(meta.value)) {
            return { ok: false, fail: `no eligible pit destination` };
        }
        this.meta = meta.value;
        return OK;
    }
    fillGrid() {
        var _a;
        let result;
        if ((result = this.initialFill()), !result.ok)
            return result;
        if ((result = this.addEdges()), !result.ok)
            return result;
        if ((result = this.addEarlyFeatures()), !result.ok)
            return result;
        if ((result = this.refine()), !result.ok)
            return result;
        if (!this.refineEdges())
            return { ok: false, fail: 'refineEdges' };
        this.removeSpurs();
        this.removeTightLoops();
        if ((result = this.addLateFeatures()), !result.ok)
            return result;
        if ((result = this.addStairs(...((_a = this.params.stairs) !== null && _a !== void 0 ? _a : []))),
            !result.ok)
            return result;
        return OK;
    }
    init() { }
    initialFill() {
        this.fillCave('c');
        return OK;
    }
    fillCave(s) {
        for (let y = 0.5; y < this.h; y++) {
            for (let x = 0.5; x < this.w; x++) {
                if (y > 1)
                    this.grid.set2(y - 0.5, x, s);
                if (x > 1)
                    this.grid.set2(y, x - 0.5, s);
                this.grid.set2(y, x, s);
            }
        }
        this.count = this.h * this.w;
    }
    addEdges() {
        if (!this.params.edges)
            return OK;
        for (let dir = 0; dir < 4; dir++) {
            let count = this.params.edges[dir] || 0;
            if (!count)
                continue;
            const edges = seq(dir & 1 ? this.h : this.w, i => this.grid.border(dir, i));
            for (const edge of this.random.ishuffle(edges)) {
                if (this.grid.get(edge))
                    continue;
                if (dir & 1) {
                    if (dir === 1) {
                        if (this.addLeftEdge(edge))
                            count--;
                    }
                    else {
                        if (this.addRightEdge(edge))
                            count--;
                    }
                }
                else {
                    if (dir === 0) {
                        if (this.addUpEdge(edge))
                            count--;
                    }
                    else {
                        if (this.addDownEdge(edge))
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
    addUpEdge(edge) {
        const below = edge + 0x800;
        const left = below - 8;
        const left2 = left - 8;
        const left3 = left2 - 8;
        const right = below + 8;
        const right2 = right + 8;
        const right3 = right2 + 8;
        if (this.grid.isBorder(left)) {
            if (this.grid.get(left))
                return false;
        }
        else {
            if (this.grid.get(edge - 16))
                return false;
            if (this.grid.isBorder(left3) && this.grid.get(left3))
                return false;
        }
        if (this.grid.isBorder(right)) {
            if (this.grid.get(right))
                return false;
        }
        else {
            if (this.grid.get(edge + 16))
                return false;
            if (this.grid.isBorder(right3) && this.grid.get(right3))
                return false;
        }
        this.fixed.add(edge);
        this.grid.set(edge, 'n');
        this.grid.set(left, '');
        this.grid.set(right, '');
        return true;
    }
    addDownEdge(edge) {
        const above = edge - 0x800;
        const left = above - 8;
        const right = above + 8;
        if (!this.grid.get(above))
            return false;
        if (this.grid.isBorder(left) && this.grid.get(left))
            return false;
        if (this.grid.isBorder(right) && this.grid.get(right))
            return false;
        this.fixed.add(edge);
        this.grid.set(edge, 'n');
        this.grid.set(left, '');
        this.grid.set(right, '');
        return true;
    }
    addLeftEdge(edge) {
        const right = edge + 8;
        const rightUp = right - 0x800;
        const rightDown = right + 0x800;
        if (!this.grid.get(right))
            return false;
        if (this.grid.isBorder(rightUp) && this.grid.get(rightUp))
            return false;
        if (this.grid.isBorder(rightDown) && this.grid.get(rightDown))
            return false;
        this.fixed.add(edge);
        this.grid.set(edge, 'c');
        return true;
    }
    addRightEdge(edge) {
        const left = edge - 8;
        const leftUp = left - 0x800;
        const leftDown = left + 0x800;
        if (!this.grid.get(left))
            return false;
        if (this.grid.isBorder(leftUp) && this.grid.get(leftUp))
            return false;
        if (this.grid.isBorder(leftDown) && this.grid.get(leftDown))
            return false;
        this.fixed.add(edge);
        this.grid.set(edge, 'c');
        return true;
    }
    addEarlyFeatures() {
        var _a, _b, _c, _d;
        if (!this.addSpikes((_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.spike) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: `add spikes\n${this.grid.show()}` };
        }
        if (!this.addOverpasses((_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.over) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'add overpasses' };
        }
        return OK;
    }
    addLateFeatures() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (!this.addArenas((_b = (_a = this.params.features) === null || _a === void 0 ? void 0 : _a.arena) !== null && _b !== void 0 ? _b : 0)) {
            return { ok: false, fail: 'addArenas' };
        }
        if (!this.addUnderpasses((_d = (_c = this.params.features) === null || _c === void 0 ? void 0 : _c.under) !== null && _d !== void 0 ? _d : 0)) {
            return { ok: false, fail: 'addUnderpasses' };
        }
        if (!this.addPits((_f = (_e = this.params.features) === null || _e === void 0 ? void 0 : _e.pit) !== null && _f !== void 0 ? _f : 0)) {
            return { ok: false, fail: 'addPits' };
        }
        if (!this.addRamps((_h = (_g = this.params.features) === null || _g === void 0 ? void 0 : _g.ramp) !== null && _h !== void 0 ? _h : 0)) {
            return { ok: false, fail: 'addRamps' };
        }
        return OK;
    }
    addArenas(arenas) {
        if (!arenas)
            return true;
        const g = this.grid;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            const middle = (c | 0x808);
            if (!this.isEligibleArena(middle))
                continue;
            const tile = this.extract(this.grid, c);
            const arenaTile = tile.substring(0, 4) + 'a' + tile.substring(5);
            const options = this.orig.tileset.getMetascreensFromTileString(arenaTile);
            if (!options.length)
                continue;
            this.fixed.add(middle);
            g.set(middle, 'a');
            arenas--;
            if (!arenas)
                return true;
        }
        return false;
    }
    isEligibleArena(middle) {
        const g = this.grid;
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
    addUnderpasses(under) {
        return this.addStraightScreenLate(under, 'b', 0x800);
    }
    addOverpasses(over) {
        let attempts = 0;
        while (over) {
            const y = this.random.nextInt(this.h - 2) + 1;
            const x = this.random.nextInt(this.w - 2) + 1;
            const c = (y << 12 | x << 4 | 0x808);
            if (this.grid.get(c) !== 'c') {
                if (++attempts > 10)
                    throw new Error('Bad attempts');
                continue;
            }
            this.grid.set(c, 'b');
            this.fixed.add(c);
            this.grid.set(c - 8, '');
            this.grid.set(c + 8, '');
            over--;
        }
        return true;
    }
    addPits(pits) {
        return this.addStraightScreenLate(pits, 'p');
    }
    addRamps(ramps) {
        return this.addStraightScreenLate(ramps, '/', 8);
    }
    addStraightScreenLate(count, char, delta) {
        if (!count)
            return true;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            const middle = (c | 0x808);
            if (this.grid.get(middle) !== 'c')
                continue;
            if (delta) {
                const side1 = (middle - delta);
                const side2 = (middle + delta);
                if (this.grid.get(side1) || this.grid.get(side2))
                    continue;
            }
            const tile = this.extract(this.grid, c);
            const newTile = tile.substring(0, 4) + char + tile.substring(5);
            const options = this.orig.tileset.getMetascreensFromTileString(newTile);
            if (!options.length)
                continue;
            this.fixed.add(middle);
            this.grid.set(middle, char);
            count--;
            if (!count)
                return true;
        }
        return false;
    }
    addSpikes(spikes) {
        if (!spikes)
            return true;
        let attempts = 0;
        while (spikes > 0) {
            if (++attempts > 20)
                return false;
            let len = Math.min(spikes, Math.floor(this.h * 0.6), this.maxSpikes);
            while (len < spikes - 1 && len > this.minSpikes) {
                if (this.random.next() < 0.2)
                    len--;
            }
            const x = (len > 2 && this.w > 3) ? this.random.nextInt(this.w - 2) + 1 :
                this.random.nextInt(this.w);
            if (len > spikes - this.minSpikes) {
                if (len >= this.h - 2) {
                    len = this.h - 2;
                }
                else {
                    len = spikes;
                }
            }
            const y0 = this.random.nextInt(this.h - len - 2) + 1;
            const t0 = y0 << 12 | x << 4 | 0x808;
            const t1 = t0 + ((len - 1) << 12);
            for (let t = t0 - 0x1000; len && t <= t1 + 0x1000; t += 0x800) {
                if (this.grid.get(t) !== 'c')
                    len = 0;
            }
            if (!len)
                continue;
            const cleared = [t0 - 8, t0 + 8, t1 - 8, t1 + 8];
            const orphaned = this.tryClear(cleared);
            if (!orphaned.length)
                continue;
            for (const c of orphaned) {
                this.grid.set(c, '');
            }
            this.fixed.add((t0 - 0x800));
            this.fixed.add((t0 - 0x1000));
            this.fixed.add((t1 + 0x800));
            this.fixed.add((t1 + 0x1000));
            for (let t = t0; t <= t1; t += 0x800) {
                this.fixed.add(t);
                this.grid.set(t, 's');
            }
            spikes -= len;
            attempts = 0;
        }
        return spikes === 0;
    }
    canRemove(c) {
        return c === 'c';
    }
    tryClear(coords) {
        const replace = new Map();
        for (const c of coords) {
            if (this.fixed.has(c))
                return [];
            replace.set(c, '');
        }
        const parts = this.grid.partition(replace);
        const [first] = parts.values();
        if (first.size === parts.size) {
            return [...coords];
        }
        const connected = new Set();
        const allParts = new Set(parts.values());
        for (const fixed of this.fixed) {
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
    refine() {
        let filled = new Set();
        for (let i = 0; i < this.grid.data.length; i++) {
            if (this.grid.data[i])
                filled.add(this.grid.coord(i));
        }
        let attempts = 0;
        while (this.count > this.size) {
            if (attempts++ > 50)
                throw new Error(`refine failed: attempts`);
            let removed = 0;
            for (const coord of this.random.ishuffle([...filled])) {
                if (this.grid.isBorder(coord) ||
                    !this.canRemove(this.grid.get(coord)) ||
                    this.fixed.has(coord)) {
                    continue;
                }
                if (removed > 3)
                    break;
                const parts = this.grid.partition(this.removalMap(coord));
                const [first] = parts.values();
                if (first.size === parts.size && parts.size > 1) {
                    removed++;
                    filled.delete(coord);
                    if ((coord & 0x808) === 0x808)
                        this.count--;
                    this.grid.set(coord, '');
                }
                else {
                    let part;
                    for (const set of parts.values()) {
                        if (!part || set.size > part.size)
                            part = set;
                    }
                    if (![...this.fixed].every(c => part.has(c)))
                        continue;
                    const count = [...part].filter(c => (c & 0x808) == 0x808).length;
                    if (count < this.size)
                        continue;
                    removed++;
                    filled = part;
                    this.count = count;
                    this.grid.set(coord, '');
                    for (const [k, v] of parts) {
                        if (v !== part)
                            this.grid.set(k, '');
                    }
                }
            }
            if (!removed) {
                if (this.looseRefine)
                    return OK;
                return { ok: false, fail: `refine ${this.count} > ${this.size}` };
            }
        }
        return OK;
    }
    removalMap(coord) {
        return new Map([[coord, '']]);
    }
    refineEdges() {
        let edges = [];
        for (let i = 0; i < this.grid.data.length; i++) {
            if (!this.grid.data[i])
                continue;
            const coord = this.grid.coord(i);
            if (this.grid.isBorder(coord) || this.fixed.has(coord))
                continue;
            if ((coord ^ (coord >> 8)) & 8)
                edges.push(coord);
        }
        this.random.shuffle(edges);
        const orig = this.grid.partition(new Map());
        let size = orig.size;
        const partCount = new Set(orig.values()).size;
        for (const e of edges) {
            const parts = this.grid.partition(new Map([[e, '']]));
            const [first] = parts.values();
            const ok = first.size === parts.size ?
                parts.size === size - 1 :
                new Set(parts.values()).size === partCount && parts.size === size - 1;
            if (ok) {
                size--;
                this.grid.set(e, '');
            }
        }
        return true;
    }
    removeSpurs() {
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const c = (y << 12 | 0x808 | x << 4);
                if (this.grid.get(c))
                    continue;
                const up = (c - 0x800);
                const down = (c + 0x800);
                const left = (c - 0x8);
                const right = (c + 0x8);
                if ((this.grid.get(up) || this.grid.get(down)) &&
                    (this.grid.get(left) || this.grid.get(right))) {
                    if (this.random.nextInt(2)) {
                        this.grid.set(up, '');
                        this.grid.set(down, '');
                    }
                    else {
                        this.grid.set(left, '');
                        this.grid.set(right, '');
                    }
                }
            }
        }
    }
    removeTightLoops() {
        for (let y = 0; y < this.h - 1; y++) {
            const row = y << 12 | 0x800;
            for (let x = 0; x < this.w - 1; x++) {
                const coord = (row | (x << 4) | 8);
                if (this.isTightLoop(coord))
                    this.breakTightLoop(coord);
            }
        }
    }
    isTightLoop(coord) {
        for (let dy = 0; dy < 0x1800; dy += 0x800) {
            for (let dx = 0; dx < 0x18; dx += 8) {
                const delta = dy | dx;
                if (delta === 0x808)
                    continue;
                if (this.grid.get((coord + delta)) !== 'c')
                    return false;
            }
        }
        return true;
    }
    breakTightLoop(coord) {
        const r = this.random.nextInt(0x10000);
        const delta = r & 1 ? (r & 0x1000) | 8 : (r & 0x10) | 0x800;
        this.grid.set((coord + delta), '');
    }
    addStairs(up = 0, down = 0) {
        const stairs = [up, down];
        if (!stairs[0] && !stairs[1])
            return OK;
        for (const c of this.random.ishuffle(this.grid.screens())) {
            if (!this.tryAddStair(c, stairs))
                continue;
            if (!stairs[0] && !stairs[1])
                return OK;
        }
        return { ok: false, fail: `stairs` };
    }
    addEarlyStair(c, stair) {
        const mods = [];
        const left = c - 8;
        const right = c + 8;
        const up = c - 0x800;
        const down = c + 0x800;
        let neighbors = [c - 8, c + 8];
        if (stair === '<') {
            neighbors.push(down);
            mods.push([up, '']);
            if (this.grid.get(left) === 'c' && this.grid.get(right) === 'c' &&
                this.random.nextInt(3)) {
                mods.push([down, ''], [c, '<']);
                return mods;
            }
        }
        else if (stair === '>') {
            neighbors.push(up);
            mods.push([down, '']);
        }
        neighbors = neighbors.filter(c => this.grid.get(c) === 'c');
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
    tryAddStair(c, stairs) {
        if (this.fixed.has((c | 0x808)))
            return false;
        const tile = this.extract(this.grid, c);
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
                this.grid.set((c | 0x808), stairChar);
                stairs[stair]--;
                return true;
            }
        }
        return false;
    }
    tryConnect(start, end, char, attempts = 1) {
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
                    if (this.fixed.has(pos2))
                        continue;
                    if ((_a = replace.get(pos2)) !== null && _a !== void 0 ? _a : this.grid.get(pos2))
                        continue;
                    if (this.grid.isBorder(pos1))
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
                this.grid.set(c, v);
                if ((c & 0x808) === 0x808)
                    this.count++;
            }
            return true;
        }
        return false;
    }
    tryAddLoop(char, attempts = 1) {
        const uf = new UnionFind();
        for (let i = 0; i < this.grid.data.length; i++) {
            const c = this.grid.coord(i);
            if (this.grid.get(c) || this.grid.isBorder(c))
                continue;
            if (!this.grid.get(E(c)))
                uf.union([c, E(c)]);
            if (!this.grid.get(S(c)))
                uf.union([c, S(c)]);
        }
        const eligible = new DefaultMap(() => []);
        for (const s of this.grid.screens()) {
            const c = s + 0x808;
            if (!this.grid.get(c))
                continue;
            for (const d of [8, -8, 0x800, -0x800]) {
                const e1 = c + d;
                if (this.grid.isBorder(e1) || this.grid.get(e1))
                    continue;
                const e2 = c + 2 * d;
                if (this.grid.get(e2))
                    continue;
                const replace = new Map([[e1, char]]);
                const tile = this.extract(this.grid, s, { replace });
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
            this.grid.set(e0, char);
            this.grid.set(e1, char);
            if (this.tryConnect(c0, c1, char, 5)) {
                return true;
            }
            this.grid.set(e0, '');
            this.grid.set(e1, '');
        }
        return false;
    }
    tryExtrude(char, length, attempts = 1) {
        while (attempts--) {
            for (const c of this.random.ishuffle(this.grid.screens())) {
                const mid = c + 0x808;
                if (!this.grid.get(mid))
                    continue;
                const tile = this.extract(this.grid, c);
                for (let dir of this.random.ishuffle([0, 1, 2, 3])) {
                    const n1 = mid + GRIDDIR[dir];
                    const n2 = mid + 2 * GRIDDIR[dir];
                    if (this.grid.get(n1) || this.grid.isBorder(n1) || this.grid.get(n2))
                        continue;
                    const i = TILEDIR[dir];
                    const rep = tile.substring(0, i) + char + tile.substring(i + 1);
                    if (this.orig.tileset.getMetascreensFromTileString(rep).length) {
                        this.grid.set(n1, char);
                        this.grid.set(n2, char);
                        const added = this.tryContinueExtrude(char, length, n2);
                        if (added)
                            return added;
                        this.grid.set(n2, '');
                        this.grid.set(n1, '');
                    }
                }
            }
        }
        return 0;
    }
    tryContinueExtrude(char, length, c) {
        const tile = this.extract(this.grid, c - 0x808);
        const ok = this.orig.tileset.getMetascreensFromTileString(tile).length > 0;
        if (length === 1)
            return ok ? 1 : 0;
        if (ok && !this.random.nextInt(length))
            return 1;
        for (const dir of this.random.ishuffle([0, 1, 2, 3])) {
            const n1 = c + GRIDDIR[dir];
            const n2 = c + 2 * GRIDDIR[dir];
            if (this.grid.get(n1) || this.grid.isBorder(n1) || this.grid.get(n2))
                continue;
            const i = TILEDIR[dir];
            const rep = tile.substring(0, i) + char + tile.substring(i + 1);
            if (this.orig.tileset.getMetascreensFromTileString(rep).length) {
                this.grid.set(n1, char);
                this.grid.set(n2, char);
                const added = this.tryContinueExtrude(char, length - 1, n2);
                if (added)
                    return added + 1;
                this.grid.set(n2, '');
                this.grid.set(n1, '');
            }
            if (ok)
                break;
        }
        return ok ? 1 : 0;
    }
    tryAdd(opts = {}) {
        const tileset = this.orig.tileset;
        const { attempts = 1, char = 'c', start, loop = false } = opts;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const startIter = start != null ?
                [(start & 0xf0f0)] :
                this.random.ishuffle(this.grid.screens());
            for (const c of startIter) {
                const mid = c + 0x808;
                if (!this.grid.get(mid))
                    continue;
                const tile = this.extract(this.grid, c);
                for (let dir of this.random.ishuffle([0, 1, 2, 3])) {
                    const n1 = mid + GRIDDIR[dir];
                    const n2 = mid + 2 * GRIDDIR[dir];
                    if (this.fixed.has(n1) || this.fixed.has(n2))
                        continue;
                    const o1 = this.grid.get(n1);
                    const o2 = this.grid.get(n2);
                    if ((o1 && (o2 || o1 !== char)) || this.grid.isBorder(n1))
                        continue;
                    if (!loop) {
                        const neighborTile = this.extract(this.grid, n2 - 0x808, { replace: new Map([[n1, '']]) });
                        if (/\S/.test(neighborTile))
                            continue;
                    }
                    const i = TILEDIR[dir];
                    const rep = tile.substring(0, i) + char + tile.substring(i + 1);
                    if (tileset.getMetascreensFromTileString(rep).length) {
                        this.count++;
                        this.grid.set(n1, char);
                        this.grid.set(n2, char);
                        const neighborTile = this.extract(this.grid, n2 - 0x808);
                        if (tileset.getMetascreensFromTileString(neighborTile).length) {
                            return 1;
                        }
                        this.grid.set(n2, o2);
                        this.grid.set(n1, o1);
                        this.count--;
                    }
                }
            }
        }
        return 0;
    }
    preinfer() {
        var _a;
        let result;
        if ((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.spike) {
            if ((result = this.preinferSpikes()), !result.ok)
                return result;
        }
        return OK;
    }
    preinferSpikes() {
        return OK;
    }
    inferScreens() {
        const screens = [];
        for (const s of this.grid.screens()) {
            const tile = this.extract(this.grid, s);
            const candidates = this.orig.tileset.getMetascreensFromTileString(tile)
                .filter(s => !s.data.mod);
            if (!candidates.length) {
                if (this.grid.show().length > 100000)
                    debugger;
                return { ok: false, fail: `infer screen ${hex(s)}: [${tile}]\n${this.grid.show()}` };
            }
            const pick = this.random.pick(candidates);
            screens.push(pick);
            if (pick.hasFeature('wall'))
                this.walls++;
            if (pick.hasFeature('bridge'))
                this.bridges++;
        }
        let allEmpty = true;
        const meta = new Metalocation(this.params.id, this.orig.tileset, this.h, this.w);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const scr = screens[y * this.w + x];
                meta.set(y << 4 | x, scr);
                if (!scr.isEmpty())
                    allEmpty = false;
                if (y) {
                    const above = meta.get((y - 1) << 4 | x);
                    if (this.orig.tileset.isBannedVertical(above, scr)) {
                        return { ok: false,
                            fail: `bad vertical neighbor at ${y}${x}: ${above.name} ${scr.name}` };
                    }
                }
                if (x) {
                    const left = meta.get(y << 4 | (x - 1));
                    if (this.orig.tileset.isBannedHorizontal(left, scr)) {
                        return { ok: false,
                            fail: `bad horizontal neighbor at ${y}${x}: ${left.name} ${scr.name}` };
                    }
                }
            }
        }
        if (allEmpty)
            return { ok: false, fail: `all screens empty` };
        return { ok: true, value: meta };
    }
    refineMetascreens(meta) {
        var _a, _b;
        const bridges = ((_a = this.params.features) === null || _a === void 0 ? void 0 : _a.bridge) || 0;
        const walls = ((_b = this.params.features) === null || _b === void 0 ? void 0 : _b.wall) || 0;
        for (const pos of this.random.ishuffle(meta.allPos())) {
            const c = ((pos << 8 | pos << 4) & 0xf0f0);
            const tile = this.extract(this.grid, c);
            const scr = meta.get(pos);
            if (this.bridges <= bridges && scr.hasFeature('bridge'))
                continue;
            if (this.addBlocks &&
                this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'block'))) {
                if (scr.hasFeature('bridge'))
                    this.bridges--;
                continue;
            }
            if (scr.hasFeature('bridge')) {
                if (this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'bridge'))) {
                    this.bridges--;
                    continue;
                }
            }
            if (this.walls < walls && !scr.hasFeature('wall')) {
                if (this.tryMeta(meta, pos, this.orig.tileset.withMod(tile, 'wall'))) {
                    this.walls++;
                    continue;
                }
            }
        }
        if (this.bridges !== bridges) {
            return { ok: false,
                fail: `refineMeta bridges want ${bridges} got ${this.bridges}\n${meta.show()}` };
        }
        if (this.walls !== walls) {
            return { ok: false,
                fail: `refineMeta walls want ${walls} got ${this.walls}\n${meta.show()}` };
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
    checkMetascreens(meta) {
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
    addLateFeatures() {
        let result = super.addLateFeatures();
        if (!result.ok)
            return result;
        this.grid.data = this.grid.data.map(c => c === 'c' ? 'w' : c);
        return OK;
    }
}
export class CryptEntranceShuffle extends CaveShuffle {
    refineMetascreens(meta) {
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (this.grid.get((y << 12 | x << 4 | 0x808)) === 'a') {
                    meta.set(y << 4 | x, meta.rom.metascreens.cryptArena_statues);
                }
            }
        }
        return super.refineMetascreens(meta);
    }
    isEligibleArena(c) {
        return !this.grid.get(c - 0x800) && super.isEligibleArena(c);
    }
}
const TILEDIR = [1, 3, 7, 5];
const GRIDDIR = [-0x800, -8, 0x800, 8];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9tYXplL2NhdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFMUMsT0FBTyxFQUFFLFlBQVksRUFBTyxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxFQUFFLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFeEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUVqQixNQUFNLE9BQU8sV0FBWSxTQUFRLG1CQUFtQjtJQUFwRDs7UUFHRSxrQkFBYSxHQUFHLENBQUMsQ0FBQztRQUNsQixjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFDVCwyQkFBc0IsR0FBRyxLQUFLLENBQUM7UUFHdkMsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFVBQUssR0FBRyxDQUFDLENBQUM7UUFDVixVQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsWUFBTyxHQUFHLENBQUMsQ0FBQztJQXdyQ2QsQ0FBQztJQXRyQ0MsS0FBSztRQUNILEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7UUFD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LEdBQUcsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztpQkFDL0Q7YUFDRjtTQUNGO1FBQ0QsT0FBTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELGVBQWUsQ0FBQyxDQUFZO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBa0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3QixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEdyaWRDb29yZCwgR3JpZEluZGV4LCBFLCBTIH0gZnJvbSAnLi9ncmlkLmpzJztcbmltcG9ydCB7IHNlcSwgaGV4IH0gZnJvbSAnLi4vcm9tL3V0aWwuanMnO1xuaW1wb3J0IHsgTWV0YXNjcmVlbiB9IGZyb20gJy4uL3JvbS9tZXRhc2NyZWVuLmpzJztcbmltcG9ydCB7IE1ldGFsb2NhdGlvbiwgUG9zIH0gZnJvbSAnLi4vcm9tL21ldGFsb2NhdGlvbi5qcyc7XG5pbXBvcnQgeyBBYnN0cmFjdE1hemVTaHVmZmxlLCBPSywgUmVzdWx0LCBTdXJ2ZXkgfSBmcm9tICcuLi9tYXplL21hemUuanMnO1xuaW1wb3J0IHsgVW5pb25GaW5kIH0gZnJvbSAnLi4vdW5pb25maW5kLmpzJztcbmltcG9ydCB7IERlZmF1bHRNYXAgfSBmcm9tICcuLi91dGlsLmpzJztcblxuY29uc3QgW10gPSBbaGV4XTtcblxuZXhwb3J0IGNsYXNzIENhdmVTaHVmZmxlIGV4dGVuZHMgQWJzdHJhY3RNYXplU2h1ZmZsZSB7XG5cbiAgLy8gU2h1ZmZsZSBjb25maWd1cmF0aW9uLlxuICBtYXhQYXJ0aXRpb25zID0gMTtcbiAgbWluU3Bpa2VzID0gMjtcbiAgbWF4U3Bpa2VzID0gNTtcbiAgbG9vc2VSZWZpbmUgPSBmYWxzZTtcbiAgYWRkQmxvY2tzID0gdHJ1ZTtcbiAgcHJpdmF0ZSBfcmVxdWlyZVBpdERlc3RpbmF0aW9uID0gZmFsc2U7XG5cbiAgLy8gRXh0cmEgYXR0ZW1wdCBzdGF0ZS5cbiAgcml2ZXJzID0gMDtcbiAgd2lkZXMgPSAwO1xuICB3YWxscyA9IDA7XG4gIGJyaWRnZXMgPSAwO1xuXG4gIHJlc2V0KCkge1xuICAgIHN1cGVyLnJlc2V0KCk7XG4gICAgdGhpcy5yaXZlcnMgPSAwO1xuICAgIHRoaXMud2lkZXMgPSAwO1xuICAgIHRoaXMud2FsbHMgPSAwO1xuICAgIHRoaXMuYnJpZGdlcyA9IDA7XG4gIH1cblxuICByZXF1aXJlUGl0RGVzdGluYXRpb24oKTogdGhpcyB7XG4gICAgdGhpcy5fcmVxdWlyZVBpdERlc3RpbmF0aW9uID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNodWZmbGUobG9jOiBMb2NhdGlvbiwgcmFuZG9tOiBSYW5kb20pIHtcbiAgLy8gICBjb25zdCBtZXRhID0gbG9jLm1ldGE7XG4gIC8vICAgY29uc3Qgc3VydmV5ID0gdGhpcy5zdXJ2ZXkobWV0YSk7XG4gIC8vICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCAxMDA7IGF0dGVtcHQrKykge1xuICAvLyAgICAgY29uc3Qgd2lkdGggPVxuICAvLyAgICAgICAgIE1hdGgubWF4KDEsIE1hdGgubWluKDgsIGxvYy5tZXRhLndpZHRoICtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKChyYW5kb20ubmV4dEludCg2KSAtIDEpIC8gMykpKTtcbiAgLy8gICAgIGNvbnN0IGhlaWdodCA9XG4gIC8vICAgICAgICAgTWF0aC5tYXgoMSwgTWF0aC5taW4oMTYsIGxvYy5tZXRhLmhlaWdodCArXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcigocmFuZG9tLm5leHRJbnQoNikgLSAxKSAvIDMpKSk7XG4gIC8vICAgICBjb25zdCBzaHVmZmxlID0gbmV3IENhdmVTaHVmZmxlQXR0ZW1wdChoZWlnaHQsIHdpZHRoLCBzdXJ2ZXksIHJhbmRvbSk7XG4gIC8vICAgICBjb25zdCByZXN1bHQgPSBzaHVmZmxlLmJ1aWxkKCk7XG4gIC8vICAgICBpZiAocmVzdWx0KSB7XG4gIC8vICAgICAgIGlmIChsb2MuaWQgPT09IDB4MzEpIGNvbnNvbGUuZXJyb3IoYFNodWZmbGUgZmFpbGVkOiAke3Jlc3VsdH1gKTtcbiAgLy8gICAgIH0gZWxzZSB7XG4gIC8vICAgICAgIHRoaXMuZmluaXNoKGxvYywgc2h1ZmZsZS5tZXRhLCByYW5kb20pO1xuICAvLyAgICAgICByZXR1cm47XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIHRocm93IG5ldyBFcnJvcihgQ29tcGxldGVseSBmYWlsZWQgdG8gbWFwIHNodWZmbGUgJHtsb2N9YCk7XG4gIC8vIH1cblxuICBzdXJ2ZXkobWV0YTogTWV0YWxvY2F0aW9uKTogU3VydmV5IHtcbiAgICAvLyB0YWtlIGEgc3VydmV5LlxuICAgIGNvbnN0IHN1cnZleSA9IHtcbiAgICAgIG1ldGEsXG4gICAgICBpZDogbWV0YS5pZCxcbiAgICAgIHRpbGVzZXQ6IG1ldGEudGlsZXNldCxcbiAgICAgIHNpemU6IDAsXG4gICAgICBlZGdlczogWzAsIDAsIDAsIDBdLFxuICAgICAgc3RhaXJzOiBbMCwgMF0sXG4gICAgICBmZWF0dXJlczoge1xuICAgICAgICBhcmVuYTogMCxcbiAgICAgICAgYnJpZGdlOiAwLFxuICAgICAgICBvdmVyOiAwLFxuICAgICAgICBwaXQ6IDAsXG4gICAgICAgIHJhbXA6IDAsXG4gICAgICAgIHJpdmVyOiAwLFxuICAgICAgICBzcGlrZTogMCxcbiAgICAgICAgc3RhdHVlOiAwLFxuICAgICAgICB1bmRlcjogMCxcbiAgICAgICAgd2FsbDogMCxcbiAgICAgICAgd2lkZTogMCxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBpZiAobWV0YS5pZCA+PSAwKSB7XG4gICAgICBmb3IgKGNvbnN0IHNwYXduIG9mIG1ldGEucm9tLmxvY2F0aW9uc1ttZXRhLmlkXS5zcGF3bnMpIHtcbiAgICAgICAgaWYgKHNwYXduLmlzTW9uc3RlcigpICYmIHNwYXduLm1vbnN0ZXJJZCA9PT0gMHg4Zikge1xuICAgICAgICAgIHN1cnZleS5mZWF0dXJlcy5zdGF0dWUrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKCFzY3IuaXNFbXB0eSgpIHx8IHNjci5kYXRhLmV4aXRzPy5sZW5ndGgpIHN1cnZleS5zaXplKys7XG4gICAgICBmb3IgKGNvbnN0IGV4aXQgb2Ygc2NyLmRhdGEuZXhpdHMgPz8gW10pIHtcbiAgICAgICAgY29uc3Qge3R5cGV9ID0gZXhpdDtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdlZGdlOnRvcCcpIHtcbiAgICAgICAgICBpZiAoKHBvcyA+Pj4gNCkgPT09IDApIHN1cnZleS5lZGdlc1swXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZGdlOmxlZnQnKSB7XG4gICAgICAgICAgaWYgKChwb3MgJiAweGYpID09PSAwKSBzdXJ2ZXkuZWRnZXNbMV0rKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnZWRnZTpib3R0b20nKSB7XG4gICAgICAgICAgaWYgKChwb3MgPj4+IDQpID09PSBtZXRhLmhlaWdodCAtIDEpIHN1cnZleS5lZGdlc1syXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlZGdlOnJpZ2h0Jykge1xuICAgICAgICAgIGlmICgocG9zICYgMHhmKSA9PT0gbWV0YS53aWR0aCAtIDEpIHN1cnZleS5lZGdlc1szXSsrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdjcnlwdCcpIHtcbiAgICAgICAgICAvLyBzdGFpciBpcyBidWlsdCBpbnRvIGFyZW5hXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZS5zdGFydHNXaXRoKCdzZWFtbGVzcycpKSB7XG4gICAgICAgICAgLy8gZG8gbm90aGluZy4uLlxuICAgICAgICB9IGVsc2UgaWYgKGV4aXQuZGlyICYgMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQmFkIGV4aXQgZGlyZWN0aW9uOiAke2V4aXQuZGlyfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1cnZleS5zdGFpcnNbZXhpdC5kaXIgPj4+IDFdKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnYXJlbmEnKSkgc3VydmV5LmZlYXR1cmVzLmFyZW5hKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSBzdXJ2ZXkuZmVhdHVyZXMuYnJpZGdlKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ292ZXJwYXNzJykpIHN1cnZleS5mZWF0dXJlcy5vdmVyKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3BpdCcpKSBzdXJ2ZXkuZmVhdHVyZXMucGl0Kys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JhbXAnKSkgc3VydmV5LmZlYXR1cmVzLnJhbXArKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgnc3Bpa2VzJykpIHN1cnZleS5mZWF0dXJlcy5zcGlrZSsrO1xuICAgICAgaWYgKHNjci5oYXNGZWF0dXJlKCd1bmRlcnBhc3MnKSkgc3VydmV5LmZlYXR1cmVzLnVuZGVyKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3dhbGwnKSkgc3VydmV5LmZlYXR1cmVzLndhbGwrKztcbiAgICAgIGlmIChzY3IuaGFzRmVhdHVyZSgncml2ZXInKSkgc3VydmV5LmZlYXR1cmVzLnJpdmVyKys7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3dpZGUnKSkgc3VydmV5LmZlYXR1cmVzLndpZGUrKztcbiAgICB9XG4gICAgaWYgKHN1cnZleS5zaXplIDwgMiAmJiAobWV0YS53aWR0aCA+IDEgfHwgbWV0YS5oZWlnaHQgPiAxKSkgc3VydmV5LnNpemUgPSAyO1xuICAgIHJldHVybiBzdXJ2ZXk7XG4gIH1cblxuICBidWlsZCgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIHRoaXMuaW5pdCgpO1xuICAgIGxldCByZXN1bHQ6IFJlc3VsdDx2b2lkPjtcbiAgICAvL2NvbnN0IHIgPSB0aGlzLnJhbmRvbTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuZmlsbEdyaWQoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG5cbiAgICAvLyB0cnkgdG8gdHJhbnNsYXRlIHRvIG1ldGFzY3JlZW5zIGF0IHRoaXMgcG9pbnQuLi5cbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucHJlaW5mZXIoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuaW5mZXJTY3JlZW5zKCk7XG4gICAgaWYgKCFtZXRhLm9rKSByZXR1cm4gbWV0YTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucmVmaW5lTWV0YXNjcmVlbnMobWV0YS52YWx1ZSkpLCAhcmVzdWx0Lm9rKSB7XG4gICAgICAvL2NvbnNvbGUuZXJyb3IobWV0YS52YWx1ZS5zaG93KCkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmNoZWNrTWV0YXNjcmVlbnMobWV0YS52YWx1ZSkpLCAhcmVzdWx0Lm9rKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBpZiAodGhpcy5fcmVxdWlyZVBpdERlc3RpbmF0aW9uICYmXG4gICAgICAgICF0aGlzLnJlcXVpcmVFbGlnaWJsZVBpdERlc3RpbmF0aW9uKG1ldGEudmFsdWUpKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYG5vIGVsaWdpYmxlIHBpdCBkZXN0aW5hdGlvbmB9O1xuICAgIH1cbiAgICB0aGlzLm1ldGEgPSBtZXRhLnZhbHVlO1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGZpbGxHcmlkKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdDogUmVzdWx0PHZvaWQ+O1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5pbml0aWFsRmlsbCgpKSwgIXJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdDtcbiAgICAvL2lmICghdGhpcy5hZGRFYXJseUZlYXR1cmVzKCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMuYWRkRWRnZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZEVhcmx5RmVhdHVyZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgLy9jb25zb2xlLmxvZyhgcmVmaW5lOlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICBpZiAoKHJlc3VsdCA9IHRoaXMucmVmaW5lKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIC8vY29uc29sZS5sb2coYHBvc3RyZWZpbmU6XFxuJHt0aGlzLmdyaWQuc2hvdygpfWApO1xuICAgIGlmICghdGhpcy5yZWZpbmVFZGdlcygpKSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ3JlZmluZUVkZ2VzJ307XG4gICAgdGhpcy5yZW1vdmVTcHVycygpO1xuICAgIHRoaXMucmVtb3ZlVGlnaHRMb29wcygpO1xuICAgIGlmICgocmVzdWx0ID0gdGhpcy5hZGRMYXRlRmVhdHVyZXMoKSksICFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSB0aGlzLmFkZFN0YWlycyguLi4odGhpcy5wYXJhbXMuc3RhaXJzID8/IFtdKSkpLFxuICAgICAgICAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gQXR0ZW1wdCBtZXRob2RzXG5cbiAgaW5pdCgpIHt9XG5cbiAgLy8gSW5pdGlhbCBmaWxsLlxuICBpbml0aWFsRmlsbCgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIHRoaXMuZmlsbENhdmUoJ2MnKTtcbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBmaWxsQ2F2ZShzOiBzdHJpbmcpIHtcbiAgICAvLyBUT0RPIC0gbW92ZSB0byBNYXplU2h1ZmZsZS5maWxsP1xuICAgIGZvciAobGV0IHkgPSAwLjU7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDAuNTsgeCA8IHRoaXMudzsgeCsrKSB7XG4gICAgICAgIGlmICh5ID4gMSkgdGhpcy5ncmlkLnNldDIoeSAtIDAuNSwgeCwgcyk7XG4gICAgICAgIGlmICh4ID4gMSkgdGhpcy5ncmlkLnNldDIoeSwgeCAtIDAuNSwgcyk7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQyKHksIHgsIHMpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmNvdW50ID0gdGhpcy5oICogdGhpcy53O1xuICB9XG5cbiAgLy8gQWRkIGVkZ2UgYW5kL29yIHN0YWlyIGV4aXRzXG4gIGFkZEVkZ2VzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgLy9sZXQgYXR0ZW1wdHMgPSAwO1xuICAgIGlmICghdGhpcy5wYXJhbXMuZWRnZXMpIHJldHVybiBPSztcbiAgICBmb3IgKGxldCBkaXIgPSAwOyBkaXIgPCA0OyBkaXIrKykge1xuICAgICAgbGV0IGNvdW50ID0gdGhpcy5wYXJhbXMuZWRnZXNbZGlyXSB8fCAwO1xuICAgICAgaWYgKCFjb3VudCkgY29udGludWU7XG4gICAgICBjb25zdCBlZGdlcyA9XG4gICAgICAgICAgc2VxKGRpciAmIDEgPyB0aGlzLmggOiB0aGlzLncsIGkgPT4gdGhpcy5ncmlkLmJvcmRlcihkaXIsIGkpKTtcbiAgICAgIGZvciAoY29uc3QgZWRnZSBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShlZGdlcykpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgZWRnZTogJHtlZGdlLnRvU3RyaW5nKDE2KX0gY291bnQgJHtjb3VudH0gZGlyICR7ZGlyfWApO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldChlZGdlKSkgY29udGludWU7XG4gICAgICAgIGlmIChkaXIgJiAxKSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkTGVmdEVkZ2UoZWRnZSkpIGNvdW50LS07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFkZFJpZ2h0RWRnZShlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGRpciA9PT0gMCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWRkVXBFZGdlKGVkZ2UpKSBjb3VudC0tO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hZGREb3duRWRnZShlZGdlKSkgY291bnQtLTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb3VudCkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoY291bnQpIHtcbiAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBjYW4ndCBmaXQgYWxsIGVkZ2VzIHNodWZmbGluZyAke3RoaXMubG9jXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XFxubWlzc2luZyAke2NvdW50fSAke2Rpcn1gfTtcbiAgICAgICAgLy9cXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gYWRkVXBFZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIC8vIFVwIGVkZ2VzIG11c3QgYWx3YXlzIGJlIGFyZW5hIHNjcmVlbnMsIHNvIGN1dCBvZmYgYm90aFxuICAgIC8vIHRoZSBFLVcgZWRnZXMgQU5EIHRoZSBuZWlnaGJvcmluZyBzY3JlZW5zIGFzIHdlbGwgKHByb3ZpZGVkXG4gICAgLy8gdGhlcmUgaXMgbm90IGFsc28gYW4gZXhpdCBuZXh0IHRvIHRoZW0sIHNpbmNlIHRoYXQgd291bGQgYmVcbiAgICAvLyBhIHByb2JsZW0uICAoVGhlc2UgYXJlIHByZXR0eSBsaW1pdGVkOiB2YW1waXJlIDEsIHByaXNvbixcbiAgICAvLyBzdHh5IDEsIHB5cmFtaWQgMSwgY3J5cHQgMiwgZHJheWdvbiAyKS5cbiAgICBjb25zdCBiZWxvdyA9IGVkZ2UgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdCA9IGJlbG93IC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdDIgPSBsZWZ0IC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdDMgPSBsZWZ0MiAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gYmVsb3cgKyA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodDIgPSByaWdodCArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MyA9IHJpZ2h0MiArIDggYXMgR3JpZENvb3JkO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdCkpIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGVkZ2UgLSAxNiBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGxlZnQzKSAmJiB0aGlzLmdyaWQuZ2V0KGxlZnQzKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0KSkge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGVkZ2UgKyAxNiBhcyBHcmlkQ29vcmQpKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0MykgJiYgdGhpcy5ncmlkLmdldChyaWdodDMpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuZml4ZWQuYWRkKGVkZ2UpO1xuICAgIHRoaXMuZ3JpZC5zZXQoZWRnZSwgJ24nKTtcbiAgICB0aGlzLmdyaWQuc2V0KGxlZnQsICcnKTtcbiAgICB0aGlzLmdyaWQuc2V0KHJpZ2h0LCAnJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGREb3duRWRnZShlZGdlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICAvLyBkb3duIGVkZ2VzIG11c3QgaGF2ZSBzdHJhaWdodCBOLVMgc2NyZWVucywgc28gY3V0IG9mZlxuICAgIC8vIHRoZSBFLVcgZWRnZXMgbmV4dCB0byB0aGVtLlxuICAgIGNvbnN0IGFib3ZlID0gZWRnZSAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0ID0gYWJvdmUgLSA4IGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodCA9IGFib3ZlICsgOCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKCF0aGlzLmdyaWQuZ2V0KGFib3ZlKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdCkgJiYgdGhpcy5ncmlkLmdldChsZWZ0KSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIocmlnaHQpICYmIHRoaXMuZ3JpZC5nZXQocmlnaHQpKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCAnbicpO1xuICAgIHRoaXMuZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgIHRoaXMuZ3JpZC5zZXQocmlnaHQsICcnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZExlZnRFZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gZWRnZSArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0VXAgPSByaWdodCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCByaWdodERvd24gPSByaWdodCArIDB4ODAwIGFzIEdyaWRDb29yZDtcbi8vY29uc29sZS5sb2coYGFkZExlZnQgJHtoZXgoZWRnZSl9IHJpZ2h0ICR7aGV4KHJpZ2h0KX06JHt0aGlzLmdyaWQuZ2V0KHJpZ2h0KX0gcnUgJHtoZXgocmlnaHRVcCl9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0VXApfToke3RoaXMuZ3JpZC5nZXQocmlnaHRVcCl9IHJkICR7aGV4KHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0RG93bil9OiR7dGhpcy5ncmlkLmdldChyaWdodERvd24pfWApO1xuICAgIGlmICghdGhpcy5ncmlkLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0VXApICYmIHRoaXMuZ3JpZC5nZXQocmlnaHRVcCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHJpZ2h0RG93bikgJiYgdGhpcy5ncmlkLmdldChyaWdodERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCAnYycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYWRkUmlnaHRFZGdlKGVkZ2U6IEdyaWRDb29yZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxlZnQgPSBlZGdlIC0gOCBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgbGVmdFVwID0gbGVmdCAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBsZWZ0RG93biA9IGxlZnQgKyAweDgwMCBhcyBHcmlkQ29vcmQ7XG4gICAgaWYgKCF0aGlzLmdyaWQuZ2V0KGxlZnQpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihsZWZ0VXApICYmIHRoaXMuZ3JpZC5nZXQobGVmdFVwKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIobGVmdERvd24pICYmIHRoaXMuZ3JpZC5nZXQobGVmdERvd24pKSByZXR1cm4gZmFsc2U7XG4gICAgdGhpcy5maXhlZC5hZGQoZWRnZSk7XG4gICAgdGhpcy5ncmlkLnNldChlZGdlLCAnYycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gYWRkQXJlbmFzRWFybHkoKTogYm9vbGVhbiB7XG4gIC8vICAgLy8gU3BlY2lmaWNhbGx5LCBqdXN0IGFyZW5hcy4uLlxuICAvLyAgIGxldCBhcmVuYXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uWydhJ107XG4gIC8vICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAvLyAgIGNvbnN0IGcgPSB0aGlzLmdyaWQ7XG4gIC8vICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuc2NyZWVucykpIHtcbiAgLy8gICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQgPSAobWlkZGxlIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDIgPSAobGVmdCAtIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IGxlZnQzID0gKGxlZnQyIC0gOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgbGVmdDJVcCA9IChsZWZ0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCBsZWZ0MkRvd24gPSAobGVmdDIgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQgPSAobWlkZGxlICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQyID0gKHJpZ2h0ICsgOCkgYXMgR3JpZENvb3JkO1xuICAvLyAgICAgY29uc3QgcmlnaHQzID0gKHJpZ2h0MiArIDgpIGFzIEdyaWRDb29yZDtcbiAgLy8gICAgIGNvbnN0IHJpZ2h0MlVwID0gKHJpZ2h0MiAtIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBjb25zdCByaWdodDJEb3duID0gKHJpZ2h0MiArIDB4ODAwKSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICBpZiAoIWcuaXNCb3JkZXIobGVmdCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDMpICYmIGcuZ2V0KGxlZnQzKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKGxlZnQyVXApICYmIGcuZ2V0KGxlZnQyVXApKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIobGVmdDJEb3duKSAmJiBnLmdldChsZWZ0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGlmICghZy5pc0JvcmRlcihyaWdodCkpIHtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQzKSAmJiBnLmdldChyaWdodDMpKSBjb250aW51ZTtcbiAgLy8gICAgICAgaWYgKGcuaXNCb3JkZXIocmlnaHQyVXApICYmIGcuZ2V0KHJpZ2h0MlVwKSkgY29udGludWU7XG4gIC8vICAgICAgIGlmIChnLmlzQm9yZGVyKHJpZ2h0MkRvd24pICYmIGcuZ2V0KHJpZ2h0MkRvd24pKSBjb250aW51ZTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIHRoaXMuZml4ZWQuYWRkKG1pZGRsZSk7XG4gIC8vICAgICBnLnNldChtaWRkbGUsICdhJyk7XG4gIC8vICAgICBnLnNldChsZWZ0LCAnJyk7XG4gIC8vICAgICBnLnNldChsZWZ0MiwgJycpO1xuICAvLyAgICAgZy5zZXQocmlnaHQsICcnKTtcbiAgLy8gICAgIGcuc2V0KHJpZ2h0MiwgJycpO1xuICAvLyAgICAgYXJlbmFzLS07XG4gIC8vICAgICBpZiAoIWFyZW5hcykgcmV0dXJuIHRydWU7XG4gIC8vICAgfVxuICAvLyAgIHJldHVybiBmYWxzZTtcbiAgLy8gfVxuXG4gIGFkZEVhcmx5RmVhdHVyZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkU3Bpa2VzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBhZGQgc3Bpa2VzXFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkT3ZlcnBhc3Nlcyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8ub3ZlciA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGQgb3ZlcnBhc3Nlcyd9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBhZGRMYXRlRmVhdHVyZXMoKTogUmVzdWx0PHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuYWRkQXJlbmFzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5hcmVuYSA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRBcmVuYXMnfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZFVuZGVycGFzc2VzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy51bmRlciA/PyAwKSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6ICdhZGRVbmRlcnBhc3Nlcyd9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWRkUGl0cyh0aGlzLnBhcmFtcy5mZWF0dXJlcz8ucGl0ID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZFBpdHMnfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFkZFJhbXBzKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5yYW1wID8/IDApKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogJ2FkZFJhbXBzJ307XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIGFkZEFyZW5hcyhhcmVuYXM6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICghYXJlbmFzKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCBnID0gdGhpcy5ncmlkO1xuICAgIGZvciAoY29uc3QgYyBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZSh0aGlzLmdyaWQuc2NyZWVucygpKSkge1xuICAgICAgY29uc3QgbWlkZGxlID0gKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKCF0aGlzLmlzRWxpZ2libGVBcmVuYShtaWRkbGUpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKTtcbiAgICAgIGNvbnN0IGFyZW5hVGlsZSA9IHRpbGUuc3Vic3RyaW5nKDAsIDQpICsgJ2EnICsgdGlsZS5zdWJzdHJpbmcoNSk7XG4gICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhhcmVuYVRpbGUpO1xuICAgICAgaWYgKCFvcHRpb25zLmxlbmd0aCkgY29udGludWU7XG4gICAgICB0aGlzLmZpeGVkLmFkZChtaWRkbGUpO1xuICAgICAgZy5zZXQobWlkZGxlLCAnYScpO1xuICAgICAgLy8gZy5zZXQobGVmdCwgJycpO1xuICAgICAgLy8gZy5zZXQobGVmdDIsICcnKTtcbiAgICAgIC8vIGcuc2V0KHJpZ2h0LCAnJyk7XG4gICAgICAvLyBnLnNldChyaWdodDIsICcnKTtcbiAgICAgIGFyZW5hcy0tO1xuICAgICAgaWYgKCFhcmVuYXMpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2NvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBhZGQgYXJlbmEnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc0VsaWdpYmxlQXJlbmEobWlkZGxlOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBjb25zdCBnID0gdGhpcy5ncmlkO1xuICAgIGNvbnN0IGxlZnQgPSAobWlkZGxlIC0gOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IGxlZnQyID0gKGxlZnQgLSA4KSBhcyBHcmlkQ29vcmQ7XG4gICAgY29uc3QgcmlnaHQgPSAobWlkZGxlICsgOCkgYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0MiA9IChyaWdodCArIDgpIGFzIEdyaWRDb29yZDtcbiAgICBpZiAoZy5nZXQobWlkZGxlKSAhPT0gJ2MnICYmIGcuZ2V0KG1pZGRsZSkgIT09ICd3JykgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChnLmdldChsZWZ0KSB8fCBnLmdldChyaWdodCkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIWcuaXNCb3JkZXIobGVmdCkgJiYgZy5nZXQobGVmdDIpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKCFnLmlzQm9yZGVyKHJpZ2h0KSAmJiBnLmdldChyaWdodDIpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBhZGRVbmRlcnBhc3Nlcyh1bmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgLy8gT25seSBhZGQgaG9yaXpvbnRhbCAnICAgfGNiY3wgICAnLCBub3QgJyBjIHwgYiB8IGMgJy4gIENvdWxkIHBvc3NpYmx5XG4gICAgLy8gdXNlICdiJyBhbmQgJ0InIGluc3RlYWQ/XG4gICAgcmV0dXJuIHRoaXMuYWRkU3RyYWlnaHRTY3JlZW5MYXRlKHVuZGVyLCAnYicsIDB4ODAwKTtcbiAgfVxuXG4gIGFkZE92ZXJwYXNzZXMob3ZlcjogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICB3aGlsZSAob3Zlcikge1xuICAgICAgY29uc3QgeSA9IHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy5oIC0gMikgKyAxO1xuICAgICAgY29uc3QgeCA9IHRoaXMucmFuZG9tLm5leHRJbnQodGhpcy53IC0gMikgKyAxO1xuICAgICAgY29uc3QgYyA9ICh5IDw8IDEyIHwgeCA8PCA0IHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGMpICE9PSAnYycpIHtcbiAgICAgICAgaWYgKCsrYXR0ZW1wdHMgPiAxMCkgdGhyb3cgbmV3IEVycm9yKCdCYWQgYXR0ZW1wdHMnKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLmdyaWQuc2V0KGMsICdiJyk7XG4gICAgICB0aGlzLmZpeGVkLmFkZChjKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoYyAtIDggYXMgR3JpZENvb3JkLCAnJyk7XG4gICAgICB0aGlzLmdyaWQuc2V0KGMgKyA4IGFzIEdyaWRDb29yZCwgJycpO1xuICAgICAgb3Zlci0tO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFkZFBpdHMocGl0czogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuYWRkU3RyYWlnaHRTY3JlZW5MYXRlKHBpdHMsICdwJyk7XG4gIH1cblxuICBhZGRSYW1wcyhyYW1wczogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuYWRkU3RyYWlnaHRTY3JlZW5MYXRlKHJhbXBzLCAnLycsIDgpO1xuICB9XG5cbiAgLyoqIEBwYXJhbSBkZWx0YSBHcmlkQ29vcmQgZGlmZmVyZW5jZSBmb3IgZWRnZXMgdGhhdCBuZWVkIHRvIGJlIGVtcHR5LiAqL1xuICBhZGRTdHJhaWdodFNjcmVlbkxhdGUoY291bnQ6IG51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXI6IHN0cmluZywgZGVsdGE/OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBpZiAoIWNvdW50KSByZXR1cm4gdHJ1ZTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGNvbnN0IG1pZGRsZSA9IChjIHwgMHg4MDgpIGFzIEdyaWRDb29yZDtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KG1pZGRsZSkgIT09ICdjJykgY29udGludWU7XG4gICAgICBpZiAoZGVsdGEpIHtcbiAgICAgICAgY29uc3Qgc2lkZTEgPSAobWlkZGxlIC0gZGVsdGEpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3Qgc2lkZTIgPSAobWlkZGxlICsgZGVsdGEpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoc2lkZTEpIHx8IHRoaXMuZ3JpZC5nZXQoc2lkZTIpKSBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKTtcbiAgICAgIGNvbnN0IG5ld1RpbGUgPSB0aWxlLnN1YnN0cmluZygwLCA0KSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyg1KTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKG5ld1RpbGUpO1xuICAgICAgaWYgKCFvcHRpb25zLmxlbmd0aCkgY29udGludWU7XG4gICAgICAvLyBUT0RPIC0gcmV0dXJuIGZhbHNlIGlmIG5vdCBvbiBhIGNyaXRpY2FsIHBhdGg/Pz9cbiAgICAgIC8vICAgICAgLSBidXQgUE9JIGFyZW4ndCBwbGFjZWQgeWV0LlxuICAgICAgdGhpcy5maXhlZC5hZGQobWlkZGxlKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQobWlkZGxlLCBjaGFyKTtcbiAgICAgIGNvdW50LS07XG4gICAgICBpZiAoIWNvdW50KSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmVycm9yKCdjb3VsZCBub3QgYWRkIHJhbXAnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhZGRTcGlrZXMoc3Bpa2VzOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBpZiAoIXNwaWtlcykgcmV0dXJuIHRydWU7XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICB3aGlsZSAoc3Bpa2VzID4gMCkge1xuICAgICAgaWYgKCsrYXR0ZW1wdHMgPiAyMCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAvLyBUT0RPIC0gdHJ5IHRvIGJlIHNtYXJ0ZXIgYWJvdXQgc3Bpa2VzXG4gICAgICAvLyAgLSBpZiB0b3RhbCA+IDIgdGhlbiB1c2UgbWluKHRvdGFsLCBoKi42LCA/PykgYXMgbGVuXG4gICAgICAvLyAgLSBpZiBsZW4gPiAyIGFuZCB3ID4gMywgYXZvaWQgcHV0dGluZyBzcGlrZXMgb24gZWRnZT9cbiAgICAgIGxldCBsZW4gPSBNYXRoLm1pbihzcGlrZXMsIE1hdGguZmxvb3IodGhpcy5oICogMC42KSwgdGhpcy5tYXhTcGlrZXMpO1xuICAgICAgd2hpbGUgKGxlbiA8IHNwaWtlcyAtIDEgJiYgbGVuID4gdGhpcy5taW5TcGlrZXMpIHtcbiAgICAgICAgaWYgKHRoaXMucmFuZG9tLm5leHQoKSA8IDAuMikgbGVuLS07XG4gICAgICB9XG4gICAgICAvL2lmIChsZW4gPT09IHNwaWtlcyAtIDEpIGxlbisrO1xuICAgICAgY29uc3QgeCA9XG4gICAgICAgICAgKGxlbiA+IDIgJiYgdGhpcy53ID4gMykgPyB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMudyAtIDIpICsgMSA6XG4gICAgICAgICAgdGhpcy5yYW5kb20ubmV4dEludCh0aGlzLncpO1xuICAgICAgLy8gY29uc3QgciA9XG4gICAgICAvLyAgICAgdGhpcy5yYW5kb20ubmV4dEludChNYXRoLm1pbih0aGlzLmggLSAyLCBzcGlrZXMpIC0gdGhpcy5taW5TcGlrZXMpO1xuICAgICAgLy8gbGV0IGxlbiA9IHRoaXMubWluU3Bpa2VzICsgcjtcbiAgICAgIGlmIChsZW4gPiBzcGlrZXMgLSB0aGlzLm1pblNwaWtlcykge1xuICAgICAgICBpZiAobGVuID49IHRoaXMuaCAtIDIpIHsgLy8gJiYgbGVuID4gdGhpcy5taW5TcGlrZXMpIHtcbiAgICAgICAgICBsZW4gPSB0aGlzLmggLSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxlbiA9IHNwaWtlczsgLy8gPz8/IGlzIHRoaXMgZXZlbiB2YWxpZCA/Pz9cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgeTAgPSB0aGlzLnJhbmRvbS5uZXh0SW50KHRoaXMuaCAtIGxlbiAtIDIpICsgMTtcbiAgICAgIGNvbnN0IHQwID0geTAgPDwgMTIgfCB4IDw8IDQgfCAweDgwODtcbiAgICAgIGNvbnN0IHQxID0gdDAgKyAoKGxlbiAtIDEpIDw8IDEyKTtcbiAgICAgIGZvciAobGV0IHQgPSB0MCAtIDB4MTAwMDsgbGVuICYmIHQgPD0gdDEgKyAweDEwMDA7IHQgKz0gMHg4MDApIHtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQodCBhcyBHcmlkQ29vcmQpICE9PSAnYycpIGxlbiA9IDA7XG4gICAgICB9XG4gICAgICBpZiAoIWxlbikgY29udGludWU7XG4gICAgICBjb25zdCBjbGVhcmVkID0gW3QwIC0gOCwgdDAgKyA4LCB0MSAtIDgsIHQxICsgOF0gYXMgR3JpZENvb3JkW107XG4gICAgICBjb25zdCBvcnBoYW5lZCA9IHRoaXMudHJ5Q2xlYXIoY2xlYXJlZCk7XG4gICAgICBpZiAoIW9ycGhhbmVkLmxlbmd0aCkgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IGMgb2Ygb3JwaGFuZWQpIHtcbiAgICAgICAgdGhpcy5ncmlkLnNldChjLCAnJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmZpeGVkLmFkZCgodDAgLSAweDgwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKCh0MCAtIDB4MTAwMCkgYXMgR3JpZENvb3JkKTtcbiAgICAgIHRoaXMuZml4ZWQuYWRkKCh0MSArIDB4ODAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgdGhpcy5maXhlZC5hZGQoKHQxICsgMHgxMDAwKSBhcyBHcmlkQ29vcmQpO1xuICAgICAgZm9yIChsZXQgdCA9IHQwOyB0IDw9IHQxOyB0ICs9IDB4ODAwKSB7XG4gICAgICAgIHRoaXMuZml4ZWQuYWRkKHQgYXMgR3JpZENvb3JkKTtcbiAgICAgICAgdGhpcy5ncmlkLnNldCh0IGFzIEdyaWRDb29yZCwgJ3MnKTtcbiAgICAgIH1cbiAgICAgIHNwaWtlcyAtPSBsZW47XG4gICAgICBhdHRlbXB0cyA9IDA7XG4gICAgfVxuICAgIHJldHVybiBzcGlrZXMgPT09IDA7XG4gIH1cblxuICBjYW5SZW1vdmUoYzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgLy8gTm90YWJseSwgZXhjbHVkZSBzdGFpcnMsIG5hcnJvdyBlZGdlcywgYXJlbmFzLCBldGMuXG4gICAgcmV0dXJuIGMgPT09ICdjJztcbiAgfVxuXG4gIC8qKlxuICAgKiBEb2VzIGEgdHJhdmVyc2FsIHdpdGggdGhlIGdpdmVuIGNvb3JkaW5hdGUocykgY2xlYXJlZCwgYW5kIHJldHVybnNcbiAgICogYW4gYXJyYXkgb2YgY29vcmRpbmF0ZXMgdGhhdCB3b3VsZCBiZSBjdXQgb2ZmIChpbmNsdWRpbmcgdGhlIGNsZWFyZWRcbiAgICogY29vcmRpbmF0ZXMpLiAgSWYgY2xlYXJpbmcgd291bGQgY3JlYXRlIG1vcmUgdGhhbiB0aGUgYWxsb3dlZCBudW1iZXJcbiAgICogb2YgcGFydGl0aW9ucyAodXN1YWxseSAxKSwgdGhlbiByZXR1cm5zIGFuIGVtcHR5IGFycmF5IHRvIHNpZ25pZnlcbiAgICogdGhhdCB0aGUgY2xlYXIgaXMgbm90IGFsbG93ZWQuXG4gICAqL1xuICB0cnlDbGVhcihjb29yZHM6IEdyaWRDb29yZFtdKTogR3JpZENvb3JkW10ge1xuICAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgYyBvZiBjb29yZHMpIHtcbiAgICAgIGlmICh0aGlzLmZpeGVkLmhhcyhjKSkgcmV0dXJuIFtdO1xuICAgICAgcmVwbGFjZS5zZXQoYywgJycpO1xuICAgIH1cbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMuZ3JpZC5wYXJ0aXRpb24ocmVwbGFjZSk7XG4gICAgLy8gQ2hlY2sgc2ltcGxlIGNhc2UgZmlyc3QgLSBvbmx5IG9uZSBwYXJ0aXRpb25cbiAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgaWYgKGZpcnN0LnNpemUgPT09IHBhcnRzLnNpemUpIHsgLy8gYSBzaW5nbGUgcGFydGl0aW9uXG4gICAgICByZXR1cm4gWy4uLmNvb3Jkc107XG4gICAgfVxuICAgIC8vIE1vcmUgY29tcGxleCBjYXNlIC0gbmVlZCB0byBzZWUgd2hhdCB3ZSBhY3R1YWxseSBoYXZlLFxuICAgIC8vIHNlZSBpZiBhbnl0aGluZyBnb3QgY3V0IG9mZi5cbiAgICBjb25zdCBjb25uZWN0ZWQgPSBuZXcgU2V0PFNldDxHcmlkQ29vcmQ+PigpO1xuICAgIGNvbnN0IGFsbFBhcnRzID0gbmV3IFNldDxTZXQ8R3JpZENvb3JkPj4ocGFydHMudmFsdWVzKCkpO1xuICAgIGZvciAoY29uc3QgZml4ZWQgb2YgdGhpcy5maXhlZCkge1xuICAgICAgY29ubmVjdGVkLmFkZChwYXJ0cy5nZXQoZml4ZWQpISk7XG4gICAgfVxuICAgIGlmIChjb25uZWN0ZWQuc2l6ZSA+IHRoaXMubWF4UGFydGl0aW9ucykgcmV0dXJuIFtdOyAvLyBubyBnb29kXG4gICAgY29uc3Qgb3JwaGFuZWQgPSBbLi4uY29vcmRzXTtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgYWxsUGFydHMpIHtcbiAgICAgIGlmIChjb25uZWN0ZWQuaGFzKHBhcnQpKSBjb250aW51ZTtcbiAgICAgIG9ycGhhbmVkLnB1c2goLi4ucGFydCk7XG4gICAgfVxuICAgIHJldHVybiBvcnBoYW5lZDtcbiAgfVxuXG4gIHJlZmluZSgpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCBmaWxsZWQgPSBuZXcgU2V0PEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCB0aGlzLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMuZ3JpZC5kYXRhW2ldKSBmaWxsZWQuYWRkKHRoaXMuZ3JpZC5jb29yZChpKSk7XG4gICAgfVxuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKHRoaXMuY291bnQgPiB0aGlzLnNpemUpIHtcbiAgICAgIGlmIChhdHRlbXB0cysrID4gNTApIHRocm93IG5ldyBFcnJvcihgcmVmaW5lIGZhaWxlZDogYXR0ZW1wdHNgKTtcbiAgICAgIC8vY29uc29sZS5sb2coYG1haW46ICR7dGhpcy5jb3VudH0gPiAke3RoaXMuc2l6ZX1gKTtcbiAgICAgIGxldCByZW1vdmVkID0gMDtcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT00KXtkZWJ1Z2dlcjtbLi4udGhpcy5yYW5kb20uaXNodWZmbGUoZmlsbGVkKV07fVxuICAgICAgZm9yIChjb25zdCBjb29yZCBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbLi4uZmlsbGVkXSkpIHtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5pc0JvcmRlcihjb29yZCkgfHxcbiAgICAgICAgICAgICF0aGlzLmNhblJlbW92ZSh0aGlzLmdyaWQuZ2V0KGNvb3JkKSkgfHxcbiAgICAgICAgICAgIHRoaXMuZml4ZWQuaGFzKGNvb3JkKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZW1vdmVkID4gMykgYnJlYWs7XG5cbiAgICAgICAgY29uc3QgcGFydHMgPSB0aGlzLmdyaWQucGFydGl0aW9uKHRoaXMucmVtb3ZhbE1hcChjb29yZCkpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgICBjb25zdCBbZmlyc3RdID0gcGFydHMudmFsdWVzKCk7XG4gICAgICAgIGlmIChmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplICYmIHBhcnRzLnNpemUgPiAxKSB7IC8vIGEgc2luZ2xlIHBhcnRpdGlvblxuICAgICAgICAgIC8vIG9rIHRvIHJlbW92ZVxuICAgICAgICAgIHJlbW92ZWQrKztcbiAgICAgICAgICBmaWxsZWQuZGVsZXRlKGNvb3JkKTtcbiAgICAgICAgICBpZiAoKGNvb3JkICYgMHg4MDgpID09PSAweDgwOCkgdGhpcy5jb3VudC0tO1xuICAgICAgICAgIHRoaXMuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBmaW5kIHRoZSBiaWdnZXN0IHBhcnRpdGlvbi5cbiAgICAgICAgICBsZXQgcGFydCE6IFNldDxHcmlkQ29vcmQ+O1xuICAgICAgICAgIGZvciAoY29uc3Qgc2V0IG9mIHBhcnRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoIXBhcnQgfHwgc2V0LnNpemUgPiBwYXJ0LnNpemUpIHBhcnQgPSBzZXQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIG1ha2Ugc3VyZSBhbGwgdGhlIGZpeGVkIHNjcmVlbnMgYXJlIGluIGl0LlxuICAgICAgICAgIGlmICghWy4uLnRoaXMuZml4ZWRdLmV2ZXJ5KGMgPT4gcGFydC5oYXMoYykpKSBjb250aW51ZTtcbiAgICAgICAgICAvLyBjaGVjayB0aGF0IGl0J3MgYmlnIGVub3VnaC5cbiAgICAgICAgICBjb25zdCBjb3VudCA9IFsuLi5wYXJ0XS5maWx0ZXIoYyA9PiAoYyAmIDB4ODA4KSA9PSAweDgwOCkubGVuZ3RoO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coYHBhcnQ6ICR7Wy4uLnBhcnRdLm1hcCh4PT54LnRvU3RyaW5nKDE2KSkuam9pbignLCcpfSBjb3VudD0ke2NvdW50fWApO1xuICAgICAgICAgIGlmIChjb3VudCA8IHRoaXMuc2l6ZSkgY29udGludWU7XG4gICAgICAgICAgLy8gb2sgdG8gcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlZCsrO1xuICAgICAgICAgIGZpbGxlZCA9IHBhcnQ7XG4gICAgICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgICAgICAgIHRoaXMuZ3JpZC5zZXQoY29vcmQsICcnKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBwYXJ0cykge1xuICAgICAgICAgICAgaWYgKHYgIT09IHBhcnQpIHRoaXMuZ3JpZC5zZXQoaywgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFyZW1vdmVkKSB7XG4gICAgICAgIGlmICh0aGlzLmxvb3NlUmVmaW5lKSByZXR1cm4gT0s7XG4gICAgICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgcmVmaW5lICR7dGhpcy5jb3VudH0gPiAke3RoaXMuc2l6ZX1gfTtcbiAgICAgICAgLy9cXG4ke3RoaXMuZ3JpZC5zaG93KCl9YH07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBPSztcbiAgfVxuXG4gIHJlbW92YWxNYXAoY29vcmQ6IEdyaWRDb29yZCk6IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4ge1xuICAgIHJldHVybiBuZXcgTWFwKFtbY29vcmQsICcnXV0pO1xuICB9XG5cbiAgLyoqIFJlbW92ZSBvbmx5IGVkZ2VzLiBDYWxsZWQgYWZ0ZXIgcmVmaW5lKCkuICovXG4gIHJlZmluZUVkZ2VzKCk6IGJvb2xlYW4ge1xuICAgIGxldCBlZGdlczogR3JpZENvb3JkW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMCBhcyBHcmlkSW5kZXg7IGkgPCB0aGlzLmdyaWQuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCF0aGlzLmdyaWQuZGF0YVtpXSkgY29udGludWU7XG4gICAgICBjb25zdCBjb29yZCA9IHRoaXMuZ3JpZC5jb29yZChpKTtcbiAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIoY29vcmQpIHx8IHRoaXMuZml4ZWQuaGFzKGNvb3JkKSkgY29udGludWU7XG4gICAgICAvLyBPbmx5IGFkZCBlZGdlcy5cbiAgICAgIGlmICgoY29vcmQgXiAoY29vcmQgPj4gOCkpICYgOCkgZWRnZXMucHVzaChjb29yZCk7XG4gICAgfVxuICAgIHRoaXMucmFuZG9tLnNodWZmbGUoZWRnZXMpO1xuICAgIGNvbnN0IG9yaWcgPSB0aGlzLmdyaWQucGFydGl0aW9uKG5ldyBNYXAoKSk7XG4gICAgbGV0IHNpemUgPSBvcmlnLnNpemU7XG4gICAgY29uc3QgcGFydENvdW50ID0gbmV3IFNldChvcmlnLnZhbHVlcygpKS5zaXplO1xuICAgIGZvciAoY29uc3QgZSBvZiBlZGdlcykge1xuICAgICAgY29uc3QgcGFydHMgPSB0aGlzLmdyaWQucGFydGl0aW9uKG5ldyBNYXAoW1tlLCAnJ11dKSk7XG4gICAgICAvL2NvbnNvbGUubG9nKGAgIGNvb3JkOiAke2Nvb3JkLnRvU3RyaW5nKDE2KX0gPT4gJHtwYXJ0cy5zaXplfWApO1xuICAgICAgY29uc3QgW2ZpcnN0XSA9IHBhcnRzLnZhbHVlcygpO1xuICAgICAgY29uc3Qgb2sgPSBmaXJzdC5zaXplID09PSBwYXJ0cy5zaXplID9cbiAgICAgICAgICAvLyBhIHNpbmdsZSBwYXJ0aXRpb24gLSBtYWtlIHN1cmUgd2UgZGlkbid0IGxvc2UgYW55dGhpbmcgZWxzZS5cbiAgICAgICAgICBwYXJ0cy5zaXplID09PSBzaXplIC0gMSA6XG4gICAgICAgICAgLy8gcmVxdWlyZSBubyBuZXcgcGFydGl0aW9uc1xuICAgICAgICAgIG5ldyBTZXQocGFydHMudmFsdWVzKCkpLnNpemUgPT09IHBhcnRDb3VudCAmJiBwYXJ0cy5zaXplID09PSBzaXplIC0gMTtcbiAgICAgIGlmIChvaykge1xuICAgICAgICBzaXplLS07XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQoZSwgJycpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXZSBjYW4ndCBoYW5kbGUgYSB0aWxlICcgYyB8YyAgfCAgICcgc28gZ2V0IHJpZCBvZiBvbmUgb3IgdGhlXG4gICAqIG90aGVyIG9mIHRoZSBlZGdlcy4gIExlYXZlIHRpbGVzIG9mIHRoZSBmb3JtICcgYyB8ICAgfCBjICcgc2luY2VcbiAgICogdGhhdCB3b3JrcyBmaW5lLiAgVE9ETyAtIGhvdyB0byBwcmVzZXJ2ZSAnID4gfCAgIHwgPCAnP1xuICAgKi9cbiAgcmVtb3ZlU3B1cnMoKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCB0aGlzLnc7IHgrKykge1xuICAgICAgICBjb25zdCBjID0gKHkgPDwgMTIgfCAweDgwOCB8IHggPDwgNCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldChjKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHVwID0gKGMgLSAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCBkb3duID0gKGMgKyAweDgwMCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBjb25zdCBsZWZ0ID0gKGMgLSAweDgpIGFzIEdyaWRDb29yZDtcbiAgICAgICAgY29uc3QgcmlnaHQgPSAoYyArIDB4OCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoKHRoaXMuZ3JpZC5nZXQodXApIHx8IHRoaXMuZ3JpZC5nZXQoZG93bikpICYmXG4gICAgICAgICAgICAodGhpcy5ncmlkLmdldChsZWZ0KSB8fCB0aGlzLmdyaWQuZ2V0KHJpZ2h0KSkpIHtcbiAgICAgICAgICBpZiAodGhpcy5yYW5kb20ubmV4dEludCgyKSkge1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldCh1cCwgJycpO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChkb3duLCAnJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobGVmdCwgJycpO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChyaWdodCwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGByZW1vdmUgJHt5fSAke3h9OlxcbiR7dGhpcy5ncmlkLnNob3coKX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlbW92ZVRpZ2h0TG9vcHMoKSB7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLmggLSAxOyB5KyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IHkgPDwgMTIgfCAweDgwMDtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53IC0gMTsgeCsrKSB7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gKHJvdyB8ICh4IDw8IDQpIHwgOCkgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5pc1RpZ2h0TG9vcChjb29yZCkpIHRoaXMuYnJlYWtUaWdodExvb3AoY29vcmQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlzVGlnaHRMb29wKGNvb3JkOiBHcmlkQ29vcmQpOiBib29sZWFuIHtcbiAgICBmb3IgKGxldCBkeSA9IDA7IGR5IDwgMHgxODAwOyBkeSArPSAweDgwMCkge1xuICAgICAgZm9yIChsZXQgZHggPSAwOyBkeCA8IDB4MTg7IGR4ICs9IDgpIHtcbiAgICAgICAgY29uc3QgZGVsdGEgPSBkeSB8IGR4XG4gICAgICAgIGlmIChkZWx0YSA9PT0gMHg4MDgpIGNvbnRpbnVlO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmdldCgoY29vcmQgKyBkZWx0YSkgYXMgR3JpZENvb3JkKSAhPT0gJ2MnKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYnJlYWtUaWdodExvb3AoY29vcmQ6IEdyaWRDb29yZCkge1xuICAgIC8vIFBpY2sgYSBkZWx0YSAtIGVpdGhlciA4LCAxMDA4LCA4MDAsIDgxMFxuICAgIGNvbnN0IHIgPSB0aGlzLnJhbmRvbS5uZXh0SW50KDB4MTAwMDApO1xuICAgIGNvbnN0IGRlbHRhID0gciAmIDEgPyAociAmIDB4MTAwMCkgfCA4IDogKHIgJiAweDEwKSB8IDB4ODAwO1xuICAgIHRoaXMuZ3JpZC5zZXQoKGNvb3JkICsgZGVsdGEpIGFzIEdyaWRDb29yZCwgJycpO1xuICB9XG5cbiAgYWRkU3RhaXJzKHVwID0gMCwgZG93biA9IDApOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIEZpbmQgc3BvdHMgd2hlcmUgd2UgY2FuIGFkZCBzdGFpcnNcbi8vaWYodGhpcy5wYXJhbXMuaWQ9PT01KWRlYnVnZ2VyO1xuICAgIGNvbnN0IHN0YWlycyA9IFt1cCwgZG93bl07XG4gICAgaWYgKCFzdGFpcnNbMF0gJiYgIXN0YWlyc1sxXSkgcmV0dXJuIE9LOyAvLyBubyBzdGFpcnNcbiAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgIGlmICghdGhpcy50cnlBZGRTdGFpcihjLCBzdGFpcnMpKSBjb250aW51ZTtcbiAgICAgIGlmICghc3RhaXJzWzBdICYmICFzdGFpcnNbMV0pIHJldHVybiBPSzsgLy8gbm8gc3RhaXJzXG4gICAgfVxuICAgIHJldHVybiB7b2s6IGZhbHNlLCBmYWlsOiBgc3RhaXJzYH07IC8vXFxuJHt0aGlzLmdyaWQuc2hvdygpfWB9O1xuICB9XG5cbiAgYWRkRWFybHlTdGFpcihjOiBHcmlkQ29vcmQsIHN0YWlyOiBzdHJpbmcpOiBBcnJheTxbR3JpZENvb3JkLCBzdHJpbmddPiB7XG4gICAgY29uc3QgbW9kczogQXJyYXk8W0dyaWRDb29yZCwgc3RyaW5nXT4gPSBbXTtcbiAgICBjb25zdCBsZWZ0ID0gYyAtIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHJpZ2h0ID0gYyArIDggYXMgR3JpZENvb3JkO1xuICAgIGNvbnN0IHVwID0gYyAtIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBjb25zdCBkb3duID0gYyArIDB4ODAwIGFzIEdyaWRDb29yZDtcbiAgICBsZXQgbmVpZ2hib3JzID0gW2MgLSA4LCBjICsgOF0gYXMgR3JpZENvb3JkW107XG4gICAgaWYgKHN0YWlyID09PSAnPCcpIHtcbiAgICAgIG5laWdoYm9ycy5wdXNoKGRvd24pO1xuICAgICAgbW9kcy5wdXNoKFt1cCwgJyddKTtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGxlZnQpID09PSAnYycgJiYgdGhpcy5ncmlkLmdldChyaWdodCkgPT09ICdjJyAmJlxuICAgICAgICAgIHRoaXMucmFuZG9tLm5leHRJbnQoMykpIHtcbiAgICAgICAgbW9kcy5wdXNoKFtkb3duLCAnJ10sIFtjLCAnPCddKTtcbiAgICAgICAgcmV0dXJuIG1vZHM7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdGFpciA9PT0gJz4nKSB7XG4gICAgICBuZWlnaGJvcnMucHVzaCh1cCk7XG4gICAgICBtb2RzLnB1c2goW2Rvd24sICcnXSk7XG4gICAgfVxuICAgIC8vIE5PVEU6IGlmIHdlIGRlbGV0ZSB0aGVuIHdlIGZvcmdldCB0byB6ZXJvIGl0IG91dC4uLlxuICAgIC8vIEJ1dCBpdCB3b3VsZCBzdGlsbCBiZSBuaWNlIHRvIFwicG9pbnRcIiB0aGVtIGluIHRoZSBlYXN5IGRpcmVjdGlvbj9cbiAgICAvLyBpZiAodGhpcy5kZWx0YSA8IC0xNikgbmVpZ2hib3JzLnNwbGljZSgyLCAxKTtcbiAgICAvLyBpZiAoKHRoaXMuZGVsdGEgJiAweGYpIDwgOCkgbmVpZ2hib3JzLnNwbGljZSgxLCAxKTtcbiAgICBuZWlnaGJvcnMgPSBuZWlnaGJvcnMuZmlsdGVyKGMgPT4gdGhpcy5ncmlkLmdldChjKSA9PT0gJ2MnKTtcbiAgICBpZiAoIW5laWdoYm9ycy5sZW5ndGgpIHJldHVybiBbXTtcbiAgICBjb25zdCBrZWVwID0gdGhpcy5yYW5kb20ubmV4dEludChuZWlnaGJvcnMubGVuZ3RoKTtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5laWdoYm9ycy5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGogIT09IGtlZXApIG1vZHMucHVzaChbbmVpZ2hib3JzW2pdLCAnJ10pO1xuICAgIH1cbiAgICBtb2RzLnB1c2goW2MsIHN0YWlyXSk7XG4gICAgcmV0dXJuIG1vZHM7XG4gIH1cblxuICB0cnlBZGRTdGFpcihjOiBHcmlkQ29vcmQsIHN0YWlyczogbnVtYmVyW10pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5maXhlZC5oYXMoKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkKSkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKTtcbiAgICBjb25zdCBib3RoID0gc3RhaXJzWzBdICYmIHN0YWlyc1sxXTtcbiAgICBjb25zdCB0b3RhbCA9IHN0YWlyc1swXSArIHN0YWlyc1sxXTtcbiAgICBjb25zdCB1cCA9IHRoaXMucmFuZG9tLm5leHRJbnQodG90YWwpIDwgc3RhaXJzWzBdO1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbdXAgPyAwIDogMV07XG4gICAgaWYgKGJvdGgpIGNhbmRpZGF0ZXMucHVzaCh1cCA/IDEgOiAwKTtcbiAgICBmb3IgKGNvbnN0IHN0YWlyIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgIGNvbnN0IHN0YWlyQ2hhciA9ICc8Pidbc3RhaXJdO1xuICAgICAgY29uc3Qgc3RhaXJUaWxlID0gdGlsZS5zdWJzdHJpbmcoMCwgNCkgKyBzdGFpckNoYXIgKyB0aWxlLnN1YnN0cmluZyg1KTtcbiAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHN0YWlyVGlsZSkubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQoKGMgfCAweDgwOCkgYXMgR3JpZENvb3JkLCBzdGFpckNoYXIpO1xuICAgICAgICBzdGFpcnNbc3RhaXJdLS07XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBtYWtlIGEgcGF0aCBjb25uZWN0aW5nIHN0YXJ0IHRvIGVuZCAoYm90aCBjZW50ZXJzKS5cbiAgICogUmVxdWlyZXMgYWxsIC4uLj9cbiAgICovXG4gIHRyeUNvbm5lY3Qoc3RhcnQ6IEdyaWRDb29yZCwgZW5kOiBHcmlkQ29vcmQsXG4gICAgICAgICAgICAgY2hhcjogc3RyaW5nLCBhdHRlbXB0cyA9IDEpOiBib29sZWFuIHtcbiAgICB3aGlsZSAoYXR0ZW1wdHMtLSA+IDApIHtcbiAgICAgIGNvbnN0IHJlcGxhY2UgPSBuZXcgTWFwPEdyaWRDb29yZCwgc3RyaW5nPigpO1xuICAgICAgbGV0IHBvcyA9IHN0YXJ0O1xuICAgICAgaWYgKChzdGFydCAmIGVuZCAmIDB4ODA4KSAhPT0gMHg4MDgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBiYWQgc3RhcnQgJHtoZXgoc3RhcnQpfSBvciBlbmQgJHtoZXgoZW5kKX1gKTtcbiAgICAgIH1cbiAgICAgIHJlcGxhY2Uuc2V0KHBvcywgY2hhcik7XG4gICAgICB3aGlsZSAocG9zICE9PSBlbmQpIHtcbiAgICAgICAgLy8gb24gYSBjZW50ZXIgLSBmaW5kIGVsaWdpYmxlIGRpcmVjdGlvbnNcbiAgICAgICAgY29uc3QgZGlyczogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgWzgsIC04LCAweDgwMCwgLTB4ODAwXSkge1xuICAgICAgICAgIGNvbnN0IHBvczEgPSBwb3MgKyBkaXIgYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGNvbnN0IHBvczIgPSBwb3MgKyAyICogZGlyIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBpZiAodGhpcy5maXhlZC5oYXMocG9zMikpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChyZXBsYWNlLmdldChwb3MyKSA/PyB0aGlzLmdyaWQuZ2V0KHBvczIpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKHBvczEpKSBjb250aW51ZTtcbiAgICAgICAgICBkaXJzLnB1c2goZGlyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRpcnMubGVuZ3RoKSBicmVhaztcbiAgICAgICAgY29uc3QgZHkgPSAoZW5kID4+IDEyKSAtIChwb3MgPj4gMTIpXG4gICAgICAgIGNvbnN0IGR4ID0gKGVuZCAmIDB4ZjApIC0gKHBvcyAmIDB4ZjApO1xuICAgICAgICBjb25zdCBwcmVmZXJyZWQgPSBuZXcgU2V0PG51bWJlcj4oZGlycyk7XG4gICAgICAgIGlmIChkeSA8IDApIHByZWZlcnJlZC5kZWxldGUoMHg4MDApO1xuICAgICAgICBpZiAoZHkgPiAwKSBwcmVmZXJyZWQuZGVsZXRlKC0weDgwMCk7XG4gICAgICAgIGlmIChkeCA8IDApIHByZWZlcnJlZC5kZWxldGUoOCk7XG4gICAgICAgIGlmIChkeCA+IDApIHByZWZlcnJlZC5kZWxldGUoLTgpO1xuICAgICAgICAvLyAzOjEgYmlhcyBmb3IgcHJlZmVycmVkIGRpcmVjdGlvbnMgIChUT0RPIC0gYmFja3RyYWNraW5nPylcbiAgICAgICAgZGlycy5wdXNoKC4uLnByZWZlcnJlZCwgLi4ucHJlZmVycmVkKTtcbiAgICAgICAgY29uc3QgZGlyID0gdGhpcy5yYW5kb20ucGljayhkaXJzKTtcbiAgICAgICAgcmVwbGFjZS5zZXQocG9zICsgZGlyIGFzIEdyaWRDb29yZCwgY2hhcik7XG4gICAgICAgIHJlcGxhY2Uuc2V0KHBvcyA9IHBvcyArIDIgKiBkaXIgYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgICAgIH1cbiAgICAgIGlmIChwb3MgIT09IGVuZCkgY29udGludWU7XG4gICAgICAvLyBJZiB3ZSBnb3QgdGhlcmUsIG1ha2UgdGhlIGNoYW5nZXMuXG4gICAgICBmb3IgKGNvbnN0IFtjLCB2XSBvZiByZXBsYWNlKSB7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQoYywgdik7XG4gICAgICAgIGlmICgoYyAmIDB4ODA4KSA9PT0gMHg4MDgpIHRoaXMuY291bnQrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0cnlBZGRMb29wKGNoYXI6IHN0cmluZywgYXR0ZW1wdHMgPSAxKTogYm9vbGVhbiB7XG4gICAgLy8gcGljayBhIHBhaXIgb2YgY29vcmRzIGZvciBzdGFydCBhbmQgZW5kXG4gICAgY29uc3QgdWYgPSBuZXcgVW5pb25GaW5kPEdyaWRDb29yZD4oKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZ3JpZC5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjID0gdGhpcy5ncmlkLmNvb3JkKGkgYXMgR3JpZEluZGV4KTtcbiAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KGMpIHx8IHRoaXMuZ3JpZC5pc0JvcmRlcihjKSkgY29udGludWU7XG4gICAgICBpZiAoIXRoaXMuZ3JpZC5nZXQoRShjKSkpIHVmLnVuaW9uKFtjLCBFKGMpXSk7XG4gICAgICBpZiAoIXRoaXMuZ3JpZC5nZXQoUyhjKSkpIHVmLnVuaW9uKFtjLCBTKGMpXSk7XG4gICAgfVxuICAgIGNvbnN0IGVsaWdpYmxlID1cbiAgICAgICAgbmV3IERlZmF1bHRNYXA8dW5rbm93biwgW0dyaWRDb29yZCwgR3JpZENvb3JkXVtdPigoKSA9PiBbXSk7XG4gICAgZm9yIChjb25zdCBzIG9mIHRoaXMuZ3JpZC5zY3JlZW5zKCkpIHtcbiAgICAgIGNvbnN0IGMgPSBzICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgaWYgKCF0aGlzLmdyaWQuZ2V0KGMpKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgZCBvZiBbOCwgLTgsIDB4ODAwLCAtMHg4MDBdKSB7XG4gICAgICAgIGNvbnN0IGUxID0gYyArIGQgYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAodGhpcy5ncmlkLmlzQm9yZGVyKGUxKSB8fCB0aGlzLmdyaWQuZ2V0KGUxKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IGUyID0gYyArIDIgKiBkIGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoZTIpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3QgcmVwbGFjZSA9IG5ldyBNYXAoW1tlMSBhcyBHcmlkQ29vcmQsIGNoYXJdXSk7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBzLCB7cmVwbGFjZX0pO1xuICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKS5sZW5ndGgpIHtcbiAgICAgICAgICBlbGlnaWJsZS5nZXQodWYuZmluZChlMikpLnB1c2goW2UxLCBlMl0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHdlaWdodGVkTWFwID0gbmV3IE1hcDxHcmlkQ29vcmQsIFtHcmlkQ29vcmQsIEdyaWRDb29yZF1bXT4oKTtcbiAgICBmb3IgKGNvbnN0IHBhcnRpdGlvbiBvZiBlbGlnaWJsZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKHBhcnRpdGlvbi5sZW5ndGggPCAyKSBjb250aW51ZTsgLy8gVE9ETyAtIDMgb3IgND9cbiAgICAgIGZvciAoY29uc3QgW2UxXSBvZiBwYXJ0aXRpb24pIHtcbiAgICAgICAgd2VpZ2h0ZWRNYXAuc2V0KGUxLCBwYXJ0aXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB3ZWlnaHRlZCA9IFsuLi53ZWlnaHRlZE1hcC52YWx1ZXMoKV07XG4gICAgaWYgKCF3ZWlnaHRlZC5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICB3aGlsZSAoYXR0ZW1wdHMtLSA+IDApIHtcbiAgICAgIGNvbnN0IHBhcnRpdGlvbiA9IHRoaXMucmFuZG9tLnBpY2sod2VpZ2h0ZWQpO1xuICAgICAgY29uc3QgW1tlMCwgYzBdLCBbZTEsIGMxXV0gPSB0aGlzLnJhbmRvbS5pc2h1ZmZsZShwYXJ0aXRpb24pO1xuICAgICAgdGhpcy5ncmlkLnNldChlMCwgY2hhcik7XG4gICAgICB0aGlzLmdyaWQuc2V0KGUxLCBjaGFyKTtcbiAgICAgIGlmICh0aGlzLnRyeUNvbm5lY3QoYzAsIGMxLCBjaGFyLCA1KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZ3JpZC5zZXQoZTAsICcnKTtcbiAgICAgIHRoaXMuZ3JpZC5zZXQoZTEsICcnKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gZXh0ZW5kIGFuIGV4aXN0aW5nIHNjcmVlbiBpbnRvIGEgZGlyZWN0aW9uIHRoYXQnc1xuICAgKiBjdXJyZW50bHkgZW1wdHkuICBMZW5ndGggaXMgcHJvYmFiaWxpc3RpYywgZWFjaCBzdWNjZXNzZnVsXG4gICAqIGF0dGVtcHQgd2lsbCBoYXZlIGEgMS9sZW5ndGggY2hhbmNlIG9mIHN0b3BwaW5nLiAgUmV0dXJucyBudW1iZXJcbiAgICogb2Ygc2NyZWVucyBhZGRlZC5cbiAgICovXG4gIHRyeUV4dHJ1ZGUoY2hhcjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciwgYXR0ZW1wdHMgPSAxKTogbnVtYmVyIHtcbiAgICAvLyBMb29rIGZvciBhIHBsYWNlIHRvIHN0YXJ0LlxuICAgIHdoaWxlIChhdHRlbXB0cy0tKSB7XG4gICAgICBmb3IgKGNvbnN0IGMgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUodGhpcy5ncmlkLnNjcmVlbnMoKSkpIHtcbiAgICAgICAgY29uc3QgbWlkID0gYyArIDB4ODA4IGFzIEdyaWRDb29yZDtcbiAgICAgICAgaWYgKCF0aGlzLmdyaWQuZ2V0KG1pZCkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCB0aWxlID0gdGhpcy5leHRyYWN0KHRoaXMuZ3JpZCwgYyk7XG4gICAgICAgIGZvciAobGV0IGRpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gICAgICAgICAgY29uc3QgbjEgPSBtaWQgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgICAgIGNvbnN0IG4yID0gbWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4vL2NvbnNvbGUubG9nKGBtaWQ6ICR7bWlkLnRvU3RyaW5nKDE2KX07IG4xKCR7bjEudG9TdHJpbmcoMTYpfSk6ICR7dGhpcy5ncmlkLmdldChuMSl9OyBuMigke24yLnRvU3RyaW5nKDE2KX0pOiAke3RoaXMuZ3JpZC5nZXQobjIpfWApO1xuICAgICAgICAgIGlmICh0aGlzLmdyaWQuZ2V0KG4xKSB8fCB0aGlzLmdyaWQuaXNCb3JkZXIobjEpIHx8IHRoaXMuZ3JpZC5nZXQobjIpKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMSwgY2hhcik7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4yLCBjaGFyKTtcbiAgICAgICAgICAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoY2hhciwgbGVuZ3RoLCBuMik7XG4gICAgICAgICAgICBpZiAoYWRkZWQpIHJldHVybiBhZGRlZDtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjIsICcnKTtcbiAgICAgICAgICAgIHRoaXMuZ3JpZC5zZXQobjEsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKiogUmVjdXJzaXZlIGF0dGVtcHQuICovXG4gIHRyeUNvbnRpbnVlRXh0cnVkZShjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLCBjOiBHcmlkQ29vcmQpOiBudW1iZXIge1xuICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICBjb25zdCBvayA9IHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcodGlsZSkubGVuZ3RoID4gMDtcbiAgICBpZiAobGVuZ3RoID09PSAxKSByZXR1cm4gb2sgPyAxIDogMDtcbiAgICAvLyBtYXliZSByZXR1cm4gZWFybHlcbiAgICBpZiAob2sgJiYgIXRoaXMucmFuZG9tLm5leHRJbnQobGVuZ3RoKSkgcmV0dXJuIDE7XG4gICAgLy8gZmluZCBhIG5ldyBkaXJlY3Rpb25cbiAgICBmb3IgKGNvbnN0IGRpciBvZiB0aGlzLnJhbmRvbS5pc2h1ZmZsZShbMCwgMSwgMiwgM10pKSB7XG4gICAgICBjb25zdCBuMSA9IGMgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgbjIgPSBjICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICBpZiAodGhpcy5ncmlkLmdldChuMSkgfHwgdGhpcy5ncmlkLmlzQm9yZGVyKG4xKSB8fCB0aGlzLmdyaWQuZ2V0KG4yKSkgY29udGludWU7XG4gICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAgICAgY29uc3QgcmVwID0gdGlsZS5zdWJzdHJpbmcoMCwgaSkgKyBjaGFyICsgdGlsZS5zdWJzdHJpbmcoaSArIDEpO1xuICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5ncmlkLnNldChuMSwgY2hhcik7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQobjIsIGNoYXIpO1xuICAgICAgICBjb25zdCBhZGRlZCA9IHRoaXMudHJ5Q29udGludWVFeHRydWRlKGNoYXIsIGxlbmd0aCAtIDEsIG4yKTtcbiAgICAgICAgaWYgKGFkZGVkKSByZXR1cm4gYWRkZWQgKyAxO1xuICAgICAgICB0aGlzLmdyaWQuc2V0KG4yLCAnJyk7XG4gICAgICAgIHRoaXMuZ3JpZC5zZXQobjEsICcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChvaykgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBvayA/IDEgOiAwO1xuICB9XG5cbiAgLyoqIEF0dGVtcHQgdG8gYWRkIGEgZ3JpZCB0eXBlLiAqL1xuICB0cnlBZGQob3B0czogQWRkT3B0cyA9IHt9KTogbnVtYmVyIHtcbiAgICAvLyBPcHRpb25hbGx5IHN0YXJ0IGF0IHRoZSBnaXZlbiBzY3JlZW4gb25seS5cbiAgICBjb25zdCB0aWxlc2V0ID0gdGhpcy5vcmlnLnRpbGVzZXQ7XG4gICAgY29uc3Qge2F0dGVtcHRzID0gMSwgY2hhciA9ICdjJywgc3RhcnQsIGxvb3AgPSBmYWxzZX0gPSBvcHRzO1xuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgYXR0ZW1wdHM7IGF0dGVtcHQrKykge1xuICAgICAgY29uc3Qgc3RhcnRJdGVyID1cbiAgICAgICAgICBzdGFydCAhPSBudWxsID9cbiAgICAgICAgICAgICAgWyhzdGFydCAmIDB4ZjBmMCkgYXMgR3JpZENvb3JkXSA6XG4gICAgICAgICAgICAgIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpO1xuICAgICAgZm9yIChjb25zdCBjIG9mIHN0YXJ0SXRlcikge1xuICAgICAgICBjb25zdCBtaWQgPSBjICsgMHg4MDggYXMgR3JpZENvb3JkO1xuICAgICAgICBpZiAoIXRoaXMuZ3JpZC5nZXQobWlkKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBjKTtcbiAgICAgICAgZm9yIChsZXQgZGlyIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKFswLCAxLCAyLCAzXSkpIHtcbiAgICAgICAgICBjb25zdCBuMSA9IG1pZCArIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQ7XG4gICAgICAgICAgY29uc3QgbjIgPSBtaWQgKyAyICogR1JJRERJUltkaXJdIGFzIEdyaWRDb29yZDtcbiAgICAgICAgICBpZiAodGhpcy5maXhlZC5oYXMobjEpIHx8IHRoaXMuZml4ZWQuaGFzKG4yKSkgY29udGludWU7XG4gICAgICAgICAgY29uc3QgbzEgPSB0aGlzLmdyaWQuZ2V0KG4xKTtcbiAgICAgICAgICBjb25zdCBvMiA9IHRoaXMuZ3JpZC5nZXQobjIpO1xuLy9jb25zb2xlLmxvZyhgbWlkKCR7bWlkLnRvU3RyaW5nKDE2KX0pOiAke3RoaXMuZ3JpZC5nZXQobWlkKX07IG4xKCR7bjEudG9TdHJpbmcoMTYpfSk6ICR7dGhpcy5ncmlkLmdldChuMSl9OyBuMigke24yLnRvU3RyaW5nKDE2KX0pOiAke3RoaXMuZ3JpZC5nZXQobjIpfWApO1xuICAgICAgICAgIC8vIGFsbG93IG1ha2luZyBwcm9ncmVzcyBvbiB0b3Agb2YgYW4gZWRnZS1vbmx5IGNvbm5lY3Rpb24uXG4gICAgICAgICAgaWYgKChvMSAmJiAobzIgfHwgbzEgIT09IGNoYXIpKSB8fCB0aGlzLmdyaWQuaXNCb3JkZXIobjEpKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoIWxvb3ApIHtcbiAgICAgICAgICAgIGNvbnN0IG5laWdoYm9yVGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIG4yIC0gMHg4MDggYXMgR3JpZENvb3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZXBsYWNlOiBuZXcgTWFwKFtbbjEsICcnXV0pfSk7XG4gICAgICAgICAgICBpZiAoL1xcUy8udGVzdChuZWlnaGJvclRpbGUpKSBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgICAgICAgICBjb25zdCByZXAgPSB0aWxlLnN1YnN0cmluZygwLCBpKSArIGNoYXIgKyB0aWxlLnN1YnN0cmluZyhpICsgMSk7XG4gICAgICAgICAgaWYgKHRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jb3VudCsrO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMSwgY2hhcik7XG4gICAgICAgICAgICB0aGlzLmdyaWQuc2V0KG4yLCBjaGFyKTtcbiAgICAgICAgICAgIC8vIGlmIChsZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAvLyAgIGNvbnN0IGFkZGVkID0gdGhpcy50cnlDb250aW51ZUV4dHJ1ZGUoY2hhciwgbGVuZ3RoLCBuMik7XG4gICAgICAgICAgICAvLyAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG5laWdoYm9yVGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIG4yIC0gMHg4MDggYXMgR3JpZENvb3JkKTtcbiAgICAgICAgICAgIGlmICh0aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcobmVpZ2hib3JUaWxlKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMiwgbzIpO1xuICAgICAgICAgICAgdGhpcy5ncmlkLnNldChuMSwgbzEpO1xuICAgICAgICAgICAgdGhpcy5jb3VudC0tO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8vIC8qKlxuICAvLyAgKiBBdHRlbXB0IHRvIGV4dGVuZCBhbiBleGlzdGluZyBzY3JlZW4gaW50byBhIGRpcmVjdGlvbiB0aGF0J3NcbiAgLy8gICogY3VycmVudGx5IGVtcHR5LiAgTGVuZ3RoIGlzIHByb2JhYmlsaXN0aWMsIGVhY2ggc3VjY2Vzc2Z1bFxuICAvLyAgKiBhdHRlbXB0IHdpbGwgaGF2ZSBhIDEvbGVuZ3RoIGNoYW5jZSBvZiBzdG9wcGluZy4gIFJldHVybnMgbnVtYmVyXG4gIC8vICAqIG9mIHNjcmVlbnMgYWRkZWQuXG4gIC8vICAqL1xuICAvLyB0cnlFeHRydWRlKGNoYXI6IHN0cmluZywgbGVuZ3RoOiBudW1iZXIsIGF0dGVtcHRzID0gMSk6IG51bWJlciB7XG4gIC8vICAgLy8gTG9vayBmb3IgYSBwbGFjZSB0byBzdGFydC5cbiAgLy8gICB3aGlsZSAoYXR0ZW1wdHMtLSkge1xuICAvLyAgICAgZm9yIChjb25zdCBjIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKHRoaXMuZ3JpZC5zY3JlZW5zKCkpKSB7XG4gIC8vICAgICAgIGNvbnN0IG1pZCA9IGMgKyAweDgwOCBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAgIGlmICghdGhpcy5ncmlkLmdldChtaWQpKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpO1xuICAvLyAgICAgICBmb3IgKGxldCBkaXIgb2YgWzAsIDEsIDIsIDNdKSB7XG4gIC8vICAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQobWlkICsgMiAqIEdSSURESVJbZGlyXSBhcyBHcmlkQ29vcmQpKSBjb250aW51ZTtcbiAgLy8gICAgICAgICBjb25zdCBpID0gVElMRURJUltkaXJdO1xuICAvLyAgICAgICAgIGlmICh0aWxlW2ldICE9PSAnICcpIGNvbnRpbnVlO1xuICAvLyAgICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgLy8gICAgICAgICBpZiAodGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyhyZXApLmxlbmd0aCkge1xuICAvLyAgICAgICAgICAgY29uc3QgYWRkZWQgPSB0aGlzLnRyeUNvbnRpbnVlRXh0cnVkZShjaGFyLCBsZW5ndGgsIG1pZCwgZGlyKTtcbiAgLy8gICAgICAgICAgIGlmIChhZGRlZCkgcmV0dXJuIGFkZGVkO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICByZXR1cm4gMDtcbiAgLy8gfVxuXG4gIC8vIHRyeUNvbnRpbnVlRXh0cnVkZShjaGFyOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyLFxuICAvLyAgICAgICAgICAgICAgICAgICAgbWlkOiBHcmlkQ29vcmQsIGRpcjogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gICBjb25zdCByZXBsYWNlID0gbmV3IE1hcDxHcmlkQ29vcmQsIHN0cmluZz4oW10pO1xuICAvLyAgIGxldCB3b3JrczogQXJyYXk8W0dyaWRDb29yZCwgc3RyaW5nXT58dW5kZWZpbmVkO1xuICAvLyAgIGxldCB3ZWlnaHQgPSAwO1xuICAvLyAgIE9VVEVSOlxuICAvLyAgIHdoaWxlICh0cnVlKSB7XG4gIC8vICAgICByZXBsYWNlLnNldChtaWQgKyBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgLy8gICAgIHJlcGxhY2Uuc2V0KG1pZCArIDIgKiBHUklERElSW2Rpcl0gYXMgR3JpZENvb3JkLCBjaGFyKTtcbiAgLy8gICAgIG1pZCA9IChtaWQgKyAyICogR1JJRERJUltkaXJdKSBhcyBHcmlkQ29vcmQ7XG5cbiAgLy8gICAgIGNvbnN0IHRpbGUgPSB0aGlzLmV4dHJhY3QodGhpcy5ncmlkLCBtaWQgLSAweDgwOCBhcyBHcmlkQ29vcmQsIHtyZXBsYWNlfSk7XG4gIC8vICAgICB3ZWlnaHQrKztcbiAgLy8gICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5nZXRNZXRhc2NyZWVuc0Zyb21UaWxlU3RyaW5nKHRpbGUpLmxlbmd0aCkge1xuICAvLyAgICAgICB3b3JrcyA9IFsuLi5yZXBsYWNlXTtcbiAgLy8gICAgICAgLy8gd2UgY2FuIHF1aXQgbm93IC0gc2VlIGlmIHdlIHNob3VsZC5cbiAgLy8gICAgICAgd2hpbGUgKHdlaWdodCA+IDApIHtcbiAgLy8gICAgICAgICBpZiAoIXRoaXMucmFuZG9tLm5leHRJbnQobGVuZ3RoKSkgYnJlYWsgT1VURVI7XG4gIC8vICAgICAgICAgd2VpZ2h0LS07XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cblxuICAvLyAgICAgLy8gRmluZCBhIHZpYWJsZSBuZXh0IHN0ZXAuXG4gIC8vICAgICBmb3IgKGNvbnN0IG5leHREaXIgb2YgdGhpcy5yYW5kb20uaXNodWZmbGUoWzAsIDEsIDIsIDNdKSkge1xuICAvLyAgICAgICBjb25zdCBkZWx0YSA9IEdSSURESVJbbmV4dERpcl07XG4gIC8vICAgICAgIGNvbnN0IGVkZ2UgPSBtaWQgKyBkZWx0YSBhcyBHcmlkQ29vcmQ7XG4gIC8vICAgICAgIGlmICh0aGlzLmdyaWQuaXNCb3JkZXIoZWRnZSkpIGNvbnRpbnVlO1xuICAvLyAgICAgICBpZiAocmVwbGFjZS5nZXQoLi4uKSB8fCB0aGlzLmdyaWQuZ2V0KG1pZCArIDIgKiBkZWx0YSBhcyBHcmlkQ29vcmQpKSBjb250aW51ZTtcbiAgLy8gICAgICAgY29uc3QgaSA9IFRJTEVESVJbZGlyXTtcbiAgLy8gICAgICAgaWYgKHRpbGVbaV0gIT09ICcgJykgY29udGludWU7XG4gIC8vICAgICAgIGNvbnN0IHJlcCA9IHRpbGUuc3Vic3RyaW5nKDAsIGkpICsgY2hhciArIHRpbGUuc3Vic3RyaW5nKGkgKyAxKTtcbiAgLy8gICAgICAgaWYgKHRoaXMub3JpZy50aWxlc2V0LmdldE1ldGFzY3JlZW5zRnJvbVRpbGVTdHJpbmcocmVwKS5sZW5ndGgpIHtcbiAgLy8gICAgICAgICByZXBsYWNlLnNldChtaWQgKyBkZWx0YSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgICAgIHJlcGxhY2Uuc2V0KG1pZCArIDIgKiBkZWx0YSBhcyBHcmlkQ29vcmQsIGNoYXIpO1xuICAvLyAgICAgICAgIGRpciA9IG5leHREaXI7XG4gIC8vICAgICAgICAgY29udGludWUgT1VURVI7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGJyZWFrOyAvLyBuZXZlciBmb3VuZCBhIGZvbGxvdy11cCwgc28gcXVpdFxuICAvLyAgIH1cbiAgLy8gICBpZiAoIXdvcmtzKSByZXR1cm4gMDtcbiAgLy8gICBmb3IgKGNvbnN0IFtjLCB2XSBvZiB3b3Jrcykge1xuICAvLyAgICAgdGhpcy5ncmlkLnNldChjLCB2KTtcbiAgLy8gICB9XG4gIC8vICAgcmV0dXJuIHdvcmtzLmxlbmd0aCA+Pj4gMTtcbiAgLy8gfVxuXG4gIC8qKiBNYWtlIGFycmFuZ2VtZW50cyB0byBtYXhpbWl6ZSB0aGUgc3VjY2VzcyBjaGFuY2VzIG9mIGluZmVyLiAqL1xuICBwcmVpbmZlcigpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKHRoaXMucGFyYW1zLmZlYXR1cmVzPy5zcGlrZSkge1xuICAgICAgaWYgKChyZXN1bHQgPSB0aGlzLnByZWluZmVyU3Bpa2VzKCkpLCAhcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICBwcmVpbmZlclNwaWtlcygpOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIGEgJ2MnIGFib3ZlIGVhY2ggJ3MnXG4gICAgLy8gY2hlY2sgc2lkZXM/XG4gICAgcmV0dXJuIE9LO1xuICB9XG5cbiAgaW5mZXJTY3JlZW5zKCk6IFJlc3VsdDxNZXRhbG9jYXRpb24+IHtcbiAgICBjb25zdCBzY3JlZW5zOiBNZXRhc2NyZWVuW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHMgb2YgdGhpcy5ncmlkLnNjcmVlbnMoKSkge1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIHMpO1xuICAgICAgY29uc3QgY2FuZGlkYXRlcyA9XG4gICAgICAgICAgdGhpcy5vcmlnLnRpbGVzZXQuZ2V0TWV0YXNjcmVlbnNGcm9tVGlsZVN0cmluZyh0aWxlKVxuICAgICAgICAgICAgICAuZmlsdGVyKHMgPT4gIXMuZGF0YS5tb2QpO1xuICAgICAgaWYgKCFjYW5kaWRhdGVzLmxlbmd0aCkge1xuICAgICAgICAvL2NvbnNvbGUuZXJyb3IodGhpcy5ncmlkLnNob3coKSk7XG5pZiAodGhpcy5ncmlkLnNob3coKS5sZW5ndGggPiAxMDAwMDApIGRlYnVnZ2VyO1xuICAgICAgICByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGluZmVyIHNjcmVlbiAke2hleChzKX06IFske3RpbGV9XVxcbiR7dGhpcy5ncmlkLnNob3coKX1gfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpY2sgPSB0aGlzLnJhbmRvbS5waWNrKGNhbmRpZGF0ZXMpO1xuICAgICAgc2NyZWVucy5wdXNoKHBpY2spO1xuICAgICAgaWYgKHBpY2suaGFzRmVhdHVyZSgnd2FsbCcpKSB0aGlzLndhbGxzKys7XG4gICAgICBpZiAocGljay5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgdGhpcy5icmlkZ2VzKys7XG5cbiAgICAgIC8vIFRPRE8gLSBhbnkgb3RoZXIgZmVhdHVyZXMgdG8gdHJhY2s/XG5cbiAgICB9XG5cbiAgICBsZXQgYWxsRW1wdHkgPSB0cnVlO1xuICAgIGNvbnN0IG1ldGEgPSBuZXcgTWV0YWxvY2F0aW9uKHRoaXMucGFyYW1zLmlkLCB0aGlzLm9yaWcudGlsZXNldCwgdGhpcy5oLCB0aGlzLncpO1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgY29uc3Qgc2NyID0gc2NyZWVuc1t5ICogdGhpcy53ICsgeF07XG4gICAgICAgIG1ldGEuc2V0KHkgPDwgNCB8IHgsIHNjcik7XG4gICAgICAgIGlmICghc2NyLmlzRW1wdHkoKSkgYWxsRW1wdHkgPSBmYWxzZTtcbiAgICAgICAgaWYgKHkpIHtcbiAgICAgICAgICBjb25zdCBhYm92ZSA9IG1ldGEuZ2V0KCh5IC0gMSkgPDwgNCB8IHgpO1xuICAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5pc0Jhbm5lZFZlcnRpY2FsKGFib3ZlLCBzY3IpKSB7XG4gICAgICAgICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZmFpbDogYGJhZCB2ZXJ0aWNhbCBuZWlnaGJvciBhdCAke3l9JHt4fTogJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGFib3ZlLm5hbWV9ICR7c2NyLm5hbWV9YH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh4KSB7XG4gICAgICAgICAgY29uc3QgbGVmdCA9IG1ldGEuZ2V0KHkgPDwgNCB8ICh4IC0gMSkpO1xuICAgICAgICAgIGlmICh0aGlzLm9yaWcudGlsZXNldC5pc0Jhbm5lZEhvcml6b250YWwobGVmdCwgc2NyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGZhaWw6IGBiYWQgaG9yaXpvbnRhbCBuZWlnaGJvciBhdCAke3l9JHt4fTogJHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQubmFtZX0gJHtzY3IubmFtZX1gfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFsbEVtcHR5KSByZXR1cm4ge29rOiBmYWxzZSwgZmFpbDogYGFsbCBzY3JlZW5zIGVtcHR5YH07XG5cbiAgICByZXR1cm4ge29rOiB0cnVlLCB2YWx1ZTogbWV0YX07XG4gIH1cblxuICByZWZpbmVNZXRhc2NyZWVucyhtZXRhOiBNZXRhbG9jYXRpb24pOiBSZXN1bHQ8dm9pZD4ge1xuICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSByaWdodCBudW1iZXIgb2Ygd2FsbHMgYW5kIGJyaWRnZXNcbiAgICAvLyB0aGlzLndhbGxzID0gdGhpcy5icmlkZ2VzID0gMDsgLy8gVE9ETyAtIGRvbid0IGJvdGhlciBtYWtpbmcgdGhlc2UgaW5zdGFuY2VcbiAgICAvLyBmb3IgKGNvbnN0IHBvcyBvZiBtZXRhLmFsbFBvcygpKSB7XG4gICAgLy8gICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgIC8vICAgaWYgKHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkge2NvbnNvbGUud2FybihoZXgocG9zKSk7IHRoaXMuYnJpZGdlcysrO31cbiAgICAvLyAgIGlmIChzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB0aGlzLndhbGxzKys7XG4gICAgLy8gfVxuICAgIGNvbnN0IGJyaWRnZXMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8uYnJpZGdlIHx8IDA7XG4gICAgY29uc3Qgd2FsbHMgPSB0aGlzLnBhcmFtcy5mZWF0dXJlcz8ud2FsbCB8fCAwO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIHRoaXMucmFuZG9tLmlzaHVmZmxlKG1ldGEuYWxsUG9zKCkpKSB7XG4gICAgICBjb25zdCBjID0gKChwb3MgPDwgOCB8IHBvcyA8PCA0KSAmIDB4ZjBmMCkgYXMgR3JpZENvb3JkO1xuICAgICAgY29uc3QgdGlsZSA9IHRoaXMuZXh0cmFjdCh0aGlzLmdyaWQsIGMpXG4gICAgICBjb25zdCBzY3IgPSBtZXRhLmdldChwb3MpO1xuICAgICAgaWYgKHRoaXMuYnJpZGdlcyA8PSBicmlkZ2VzICYmIHNjci5oYXNGZWF0dXJlKCdicmlkZ2UnKSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5hZGRCbG9ja3MgJiZcbiAgICAgICAgICB0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICdibG9jaycpKSkge1xuICAgICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB0aGlzLmJyaWRnZXMtLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZy50aWxlc2V0LndpdGhNb2QodGlsZSwgJ2JyaWRnZScpKSkge1xuICAgICAgICAgIHRoaXMuYnJpZGdlcy0tO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAvLyB9IGVsc2UgaWYgKGJyaWRnZXMgPCB0aGlzLmJyaWRnZXMgJiYgc2NyLmhhc0ZlYXR1cmUoJ2JyaWRnZScpKSB7XG4gICAgICAvLyAgIC8vIGNhbid0IGFkZCBicmlkZ2VzP1xuICAgICAgLy8gICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy53YWxscyA8IHdhbGxzICYmICFzY3IuaGFzRmVhdHVyZSgnd2FsbCcpKSB7XG4gICAgICAgIGlmICh0aGlzLnRyeU1ldGEobWV0YSwgcG9zLCB0aGlzLm9yaWcudGlsZXNldC53aXRoTW9kKHRpbGUsICd3YWxsJykpKSB7XG4gICAgICAgICAgdGhpcy53YWxscysrO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUud2FybihgYnJpZGdlcyAke3RoaXMuYnJpZGdlc30gJHticmlkZ2VzfSAvIHdhbGxzICR7dGhpcy53YWxsc30gJHt3YWxsc31cXG4ke3RoaXMuZ3JpZC5zaG93KCl9XFxuJHttZXRhLnNob3coKX1gKTtcbiAgICBpZiAodGhpcy5icmlkZ2VzICE9PSBicmlkZ2VzKSB7XG4gICAgICByZXR1cm4ge29rOiBmYWxzZSxcbiAgICAgICAgICAgICAgZmFpbDogYHJlZmluZU1ldGEgYnJpZGdlcyB3YW50ICR7YnJpZGdlc30gZ290ICR7dGhpcy5icmlkZ2VzfVxcbiR7bWV0YS5zaG93KCl9YH07XG4gICAgfVxuICAgIGlmICh0aGlzLndhbGxzICE9PSB3YWxscykge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsXG4gICAgICAgICAgICAgIGZhaWw6IGByZWZpbmVNZXRhIHdhbGxzIHdhbnQgJHt3YWxsc30gZ290ICR7dGhpcy53YWxsc31cXG4ke21ldGEuc2hvdygpfWB9O1xuICAgIH1cbiAgICByZXR1cm4gT0s7XG4gIH1cblxuICB0cnlNZXRhKG1ldGE6IE1ldGFsb2NhdGlvbiwgcG9zOiBQb3MsXG4gICAgICAgICAgc2NyZWVuczogSXRlcmFibGU8TWV0YXNjcmVlbj4pOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IHMgb2Ygc2NyZWVucykge1xuICAgICAgaWYgKCF0aGlzLmNoZWNrTWV0YShtZXRhLCBuZXcgTWFwKFtbcG9zLCBzXV0pKSkgY29udGludWU7XG4gICAgICBtZXRhLnNldChwb3MsIHMpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNoZWNrTWV0YShtZXRhOiBNZXRhbG9jYXRpb24sIHJlcGxhY2VtZW50cz86IE1hcDxQb3MsIE1ldGFzY3JlZW4+KTogYm9vbGVhbiB7XG5cbiAgICAvLyBUT0RPIC0gZmxpZ2h0PyAgbWF5IGhhdmUgYSBkaWZmICMgb2YgZmxpZ2h0IHZzIG5vbi1mbGlnaHQgcGFydGl0aW9uc1xuICAgIGNvbnN0IG9wdHMgPSByZXBsYWNlbWVudHMgPyB7d2l0aDogcmVwbGFjZW1lbnRzfSA6IHt9O1xuICAgIGNvbnN0IHBhcnRzID0gbWV0YS50cmF2ZXJzZShvcHRzKTtcbiAgICByZXR1cm4gbmV3IFNldChwYXJ0cy52YWx1ZXMoKSkuc2l6ZSA9PT0gdGhpcy5tYXhQYXJ0aXRpb25zO1xuICB9XG5cbiAgcmVxdWlyZUVsaWdpYmxlUGl0RGVzdGluYXRpb24obWV0YTogTWV0YWxvY2F0aW9uKTogYm9vbGVhbiB7XG4gICAgbGV0IHYgPSBmYWxzZTtcbiAgICBsZXQgaCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBpZiAoc2NyLmhhc0ZlYXR1cmUoJ3JpdmVyJykgfHwgc2NyLmhhc0ZlYXR1cmUoJ2VtcHR5JykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZWRnZXMgPVxuICAgICAgICAoc2NyLmRhdGEuZWRnZXMgfHwgJycpLnNwbGl0KCcnKS5tYXAoeCA9PiB4ID09PSAnICcgPyAnJyA6IHgpO1xuICAgICAgaWYgKGVkZ2VzWzBdICYmIGVkZ2VzWzJdKSB2ID0gdHJ1ZTtcbiAgICAgIC8vIE5PVEU6IHdlIGNsYW1wIHRoZSB0YXJnZXQgWCBjb29yZHMgc28gdGhhdCBzcGlrZSBzY3JlZW5zIGFyZSBhbGwgZ29vZFxuICAgICAgLy8gdGhpcyBwcmV2ZW50cyBlcnJvcnMgZnJvbSBub3QgaGF2aW5nIGEgdmlhYmxlIGRlc3RpbmF0aW9uIHNjcmVlbi5cbiAgICAgIGlmICgoZWRnZXNbMV0gJiYgZWRnZXNbM10pIHx8IHNjci5oYXNGZWF0dXJlKCdzcGlrZXMnKSkge1xuICAgICAgICBoID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICh2ICYmIGgpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjaGVja01ldGFzY3JlZW5zKG1ldGE6IE1ldGFsb2NhdGlvbik6IFJlc3VsdDx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnBhcmFtcy5mZWF0dXJlcz8uc3RhdHVlKSByZXR1cm4gT0s7XG4gICAgbGV0IHN0YXR1ZXMgPSAwO1xuICAgIGZvciAoY29uc3QgcG9zIG9mIG1ldGEuYWxsUG9zKCkpIHtcbiAgICAgIGNvbnN0IHNjciA9IG1ldGEuZ2V0KHBvcyk7XG4gICAgICBzdGF0dWVzICs9IHNjci5kYXRhLnN0YXR1ZXM/Lmxlbmd0aCB8fCAwO1xuICAgIH1cbiAgICBpZiAoc3RhdHVlcyA8IHRoaXMucGFyYW1zLmZlYXR1cmVzLnN0YXR1ZSkge1xuICAgICAgcmV0dXJuIHtvazogZmFsc2UsIGZhaWw6IGBpbnN1ZmZpY2llbnQgc3RhdHVlIHNjcmVlbnNgfTtcbiAgICB9XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cbi8vIFRPRE86XG4vLyAgLSB3aGVuIHRoZXJlJ3MgYSBicmlkZ2UsIG5ldyBydWxlIHRvIHJlcXVpcmUgYSBzdGFpciBvciBwb2lcbi8vICAgIHRvIGJlIHBhcnRpdGlvbmVkIG9mZiBpZiBicmlkZ2UgdGlsZSBpcyByZW1vdmVkXG4vLyAgLSBwb3NzaWJseSBhbHNvICpsaW5rKiB0byBvdGhlciBzY3JlZW4/XG4vLyAgLSBwbGFjZSBicmlkZ2UgZWFybHkgb3IgbGF0ZT9cbi8vICAgIC0gaWYgZWFybHkgdGhlbiBubyB3YXkgdG8gZW5mb3JjZSB0aHJvdWdobmVzcyBydWxlXG4vLyAgICAtIGlmIGxhdGUgdGhlbiBoYXJkIHRvIHN5bmMgdXAgd2l0aCBvdGhlciBmbG9vclxuLy8gQUxTTywgd2UgZG9uJ3QgaGF2ZSBhIHJlZiB0byB0aGUgdGlsZXNldCByaWdodCBub3csIGRvbid0IGV2ZW5cbi8vIGtub3cgd2hhdCB0aGUgdGlsZXMgYXJlISAgTmVlZCB0byBtYXAgdGhlIDN4MyBncmlkIG9mICg/PykgdG9cbi8vIG1ldGF0aWxlcy5cbi8vICAtIGNvbnNpZGVyIHVwZGF0aW5nIFwiZWRnZVwiIHRvIGJlIHdob2xlIDl4OT9cbi8vICAgICAnIGMgL2NjYy8gICAnXG4vLyAgICAgY2F2ZSgnY2MgYycsICdjJylcbi8vICAgICB0aWxlYFxuLy8gICAgICAgfCBjIHxcbi8vICAgICAgIHxjY2N8XG4vLyAgICAgICB8ICAgfGAsXG4vL1xuLy8gICAgIHRpbGVgXG4vLyAgICAgICB8ICAgfFxuLy8gICAgICAgfGN1IHxcbi8vICAgICAgIHwgICB8YCxcbi8vXG4vLyBCYXNpYyBpZGVhIHdvdWxkIGJlIHRvIHNpbXBsaWZ5IHRoZSBcImZlYXR1cmVzXCIgYml0IHF1aXRlIGEgYml0LFxuLy8gYW5kIGVuY2Fwc3VsYXRlIHRoZSB3aG9sZSB0aGluZyBpbnRvIHRoZSB0aWxlIC0gZWRnZXMsIGNvcm5lcnMsIGNlbnRlci5cbi8vXG4vLyBGb3Igb3ZlcndvcmxkLCAnbycgbWVhbnMgb3BlbiwgJ2cnIGZvciBncmFzcywgZXRjLi4uP1xuLy8gLSB0aGVuIHRoZSBsZXR0ZXJzIGFyZSBhbHdheXMgdGhlIHdhbGthYmxlIHRpbGVzLCB3aGljaCBtYWtlcyBzZW5zZVxuLy8gICBzaW5jZSB0aG9zZSBhcmUgdGhlIG9uZXMgdGhhdCBoYXZlIGFsbCB0aGUgdmFyaWV0eS5cbi8vICAgICB0aWxlYFxuLy8gICAgICAgfG9vIHxcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8ICAgfGAsXG4vLyAgICAgdGlsZWBcbi8vICAgICAgIHxvbyB8XG4vLyAgICAgICB8b29vfFxuLy8gICAgICAgfG9nb3xgLFxuXG4vLyBleHBvcnQgY2xhc3MgQ2F2ZVNodWZmbGVBdHRlbXB0IGV4dGVuZHMgTWF6ZVNodWZmbGVBdHRlbXB0IHtcblxuLy8gICByZWFkb25seSB0aWxlc2V0OiBNZXRhdGlsZXNldDtcbi8vICAgcmVhZG9ubHkgZ3JpZDogR3JpZDxzdHJpbmc+O1xuLy8gICByZWFkb25seSBmaXhlZCA9IG5ldyBTZXQ8R3JpZENvb3JkPigpO1xuLy8gICByZWFkb25seSBzY3JlZW5zOiByZWFkb25seSBHcmlkQ29vcmRbXSA9IFtdO1xuLy8gICBtZXRhITogTWV0YWxvY2F0aW9uO1xuLy8gICBjb3VudCA9IDA7XG4vLyAgIHdhbGxzID0gMDtcbi8vICAgYnJpZGdlcyA9IDA7XG4vLyAgIG1heFBhcnRpdGlvbnMgPSAxO1xuLy8gICBtaW5TcGlrZXMgPSAyO1xuXG4vLyAgIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGg6IG51bWJlciwgcmVhZG9ubHkgdzogbnVtYmVyLFxuLy8gICAgICAgICAgICAgICByZWFkb25seSBwYXJhbXM6IFN1cnZleSwgcmVhZG9ubHkgcmFuZG9tOiBSYW5kb20pIHtcbi8vICAgICBzdXBlcigpO1xuLy8gICAgIHRoaXMuZ3JpZCA9IG5ldyBHcmlkKGgsIHcpO1xuLy8gICAgIHRoaXMuZ3JpZC5kYXRhLmZpbGwoJycpO1xuLy8gICAgIGZvciAobGV0IHkgPSAwLjU7IHkgPCBoOyB5KyspIHtcbi8vICAgICAgIGZvciAobGV0IHggPSAwLjU7IHggPCB3OyB4KyspIHtcbi8vICAgICAgICAgaWYgKHkgPiAxKSB0aGlzLmdyaWQuc2V0Mih5IC0gMC41LCB4LCAnYycpO1xuLy8gICAgICAgICBpZiAoeCA+IDEpIHRoaXMuZ3JpZC5zZXQyKHksIHggLSAwLjUsICdjJyk7XG4vLyAgICAgICAgIHRoaXMuZ3JpZC5zZXQyKHksIHgsICdjJyk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gICAgIHRoaXMuY291bnQgPSBoICogdztcbi8vICAgICBjb25zdCBzY3JlZW5zOiBHcmlkQ29vcmRbXSA9IFtdO1xuLy8gICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbi8vICAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbi8vICAgICAgICAgc2NyZWVucy5wdXNoKCh5IDw8IDEyIHwgeCA8PCA0KSBhcyBHcmlkQ29vcmQpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgICB0aGlzLnNjcmVlbnMgPSBzY3JlZW5zO1xuLy8gICB9XG5cblxuICAvLyBjaGVja1JlYWNoYWJpbGl0eShyZXBsYWNlPzogTWFwPEdyaWRDb29yZCwgc3RyaW5nPik6IGJvb2xlYW4ge1xuICAvLyAgIHRocm93IG5ldyBFcnJvcigpO1xuICAvLyB9XG5cblxuZXhwb3J0IGNsYXNzIFdpZGVDYXZlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgYWRkTGF0ZUZlYXR1cmVzKCk6IFJlc3VsdDx2b2lkPiB7XG4gICAgbGV0IHJlc3VsdCA9IHN1cGVyLmFkZExhdGVGZWF0dXJlcygpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuICAgIHRoaXMuZ3JpZC5kYXRhID0gdGhpcy5ncmlkLmRhdGEubWFwKGMgPT4gYyA9PT0gJ2MnID8gJ3cnIDogYyk7XG4gICAgcmV0dXJuIE9LO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDcnlwdEVudHJhbmNlU2h1ZmZsZSBleHRlbmRzIENhdmVTaHVmZmxlIHtcbiAgcmVmaW5lTWV0YXNjcmVlbnMobWV0YTogTWV0YWxvY2F0aW9uKTogUmVzdWx0PHZvaWQ+IHtcbiAgICAvLyBjaGFuZ2UgYXJlbmEgaW50byBjcnlwdCBhcmVuYVxuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgdGhpcy5oOyB5KyspIHtcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgdGhpcy53OyB4KyspIHtcbiAgICAgICAgaWYgKHRoaXMuZ3JpZC5nZXQoKHkgPDwgMTIgfCB4IDw8IDQgfCAweDgwOCkgYXMgR3JpZENvb3JkKSA9PT0gJ2EnKSB7XG4gICAgICAgICAgbWV0YS5zZXQoeSA8PCA0IHwgeCwgbWV0YS5yb20ubWV0YXNjcmVlbnMuY3J5cHRBcmVuYV9zdGF0dWVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VwZXIucmVmaW5lTWV0YXNjcmVlbnMobWV0YSk7XG4gIH1cblxuICBpc0VsaWdpYmxlQXJlbmEoYzogR3JpZENvb3JkKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICF0aGlzLmdyaWQuZ2V0KGMgLSAweDgwMCBhcyBHcmlkQ29vcmQpICYmIHN1cGVyLmlzRWxpZ2libGVBcmVuYShjKTtcbiAgfVxufVxuXG5jb25zdCBUSUxFRElSID0gWzEsIDMsIDcsIDVdO1xuY29uc3QgR1JJRERJUiA9IFstMHg4MDAsIC04LCAweDgwMCwgOF07XG5cbi8vIFRoaXMgbWlnaHQgY292ZXIgYWxsIG9mIHRyeUV4dHJ1ZGUsIHRyeUNvbnRpbnVlRXh0cnVkZSwgdHJ5Q29ubmVjdFxuLy8gIC0gY291bGQgYWxzbyBmaW5kIGEgd2F5IHRvIGFkZCB0cnlBZGRMb29wP1xuaW50ZXJmYWNlIEFkZE9wdHMge1xuICBjaGFyPzogc3RyaW5nO1xuICAvLyBsZW5ndGg6IG51bWJlcjtcbiAgc3RhcnQ/OiBHcmlkQ29vcmQ7XG4gIC8vIGVuZDogR3JpZENvb3JkO1xuICBsb29wPzogYm9vbGVhbjsgLy8gYWxsb3cgdnMgcmVxdWlyZT9cblxuICBhdHRlbXB0cz86IG51bWJlcjtcblxuICAvLyBicmFuY2g6IGJvb2xlYW47XG4gIC8vIHJlZHVjZVBhcnRpdGlvbnM6IGJvb2xlYW47ICAtLSBvciBwcm92aWRlIGEgXCJzbWFydCBwaWNrIHN0YXJ0L2VuZFwiIHdyYXBwZXJcblxuICAvLyBUT0RPIC0gc29tZSBpZGVhIG9mIHdoZXRoZXIgdG8gcHJlZmVyIGV4dGVuZGluZyBhbiBleGlzdGluZ1xuICAvLyBkZWFkIGVuZCBvciBub3QgLSB0aGlzIHdvdWxkIHByb3ZpZGUgc29tZSBzb3J0IG9mIFwiYnJhbmNoaW5nIGZhY3RvclwiXG4gIC8vIHdoZXJlYnkgd2UgY2FuIHRpZ2h0bHkgY29udHJvbCBob3cgbWFueSBkZWFkIGVuZHMgd2UgZ2V0Li4uP1xuICAvLyBQcm92aWRlIGEgXCJmaW5kIGRlYWQgZW5kc1wiIGZ1bmN0aW9uP1xuICAvLyAgIC0gaW1hZ2luZSBhIHZlcnNpb24gb2Ygd2luZG1pbGwgY2F2ZSB3aGVyZSB3ZSB3YW5kZXIgdHdvIHNjcmVlbnMsXG4gIC8vICAgICB0aGVuIGNvbm5lY3QgdGhlIGRlYWQgZW5kcywgdGhlbiBicmFuY2ggYW5kIHdhbmRlciBhIGxpdHRsZSBtb3JlP1xufVxuXG4vLyBUT0RPIC0gcG90ZW50aWFsbHkgd2UgY291bGQgbG9vayBhdCB0aGUgd2hvbGUgcHJvYmxlbVxuLy8gYXMgbWFraW5nIGEgbGlzdCBvZiBleHRydWRlL2ZlYXR1cmUgdHlwZXM6XG4vLyAgIC0gciwgYywgYnJhbmNoLCBhcmVuYSwgYnJpZGdlLCBzdGFpciwgLi4uP1xuLy8gbnVjbGVhdGUgdy8gYW55IGVkZ2VzLCBoYXZlIGEgbGlzdCBvZiB0aGVzZSBvcGVyYXRpb25zIGFuZCB0aGVuXG4vLyB0cnkgZWFjaCBvbmUsIGlmIGl0IGRvZXNuJ3Qgd29yaywgcmVzaHVmZmxlIGl0IGxhdGVyIChmaXhlZCAjIG9mIGRyYXdzXG4vLyBiZWZvcmUgZ2l2aW5nIHVwKS5cbiJdfQ==